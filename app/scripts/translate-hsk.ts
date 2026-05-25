/**
 * translate-hsk.ts
 *
 * src/data/hsk-words.json 의 `meaning` 빈 항목을 Anthropic API 로 한국어 번역.
 * In-place 업데이트 — build-hsk.ts 가 만든 placeholder 항목만 채움.
 *
 *   Input/Output: app/src/data/hsk-words.json  (committed)
 *
 * 설계:
 *   - 배치 번역 (기본 25 단어/요청) — JSON in/out, ID 매칭으로 순서 안전
 *   - Resume: 기존 meaning 이 있는 항목은 skip
 *   - 매 배치 후 checkpoint save — 중간 중단되어도 진행률 보존
 *   - Concurrency 4 — Anthropic rate limit 보수적
 *   - 한국어 사전 스타일: "먹다" (동사 기본형), "집" (명사), 2-3 의미 max
 *
 * 사용:
 *   ANTHROPIC_API_KEY=sk-... npm run build:hsk:translate
 *   npm run build:hsk:translate -- --limit 50 --dry-run
 *   npm run build:hsk:translate -- --model claude-haiku-4-5 --concurrency 2
 *   npm run build:hsk:translate -- --level 1                 # HSK 1급만
 *   npm run build:hsk:translate -- --force                   # 이미 번역된 것도 재번역
 *
 * 비용 (참고, 10,969 단어 전체 기준):
 *   - Sonnet 4.5  ≈ $2-3
 *   - Haiku  4.5  ≈ $0.7-1
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import type { HskEntry } from "../src/types";

const APP_ROOT = resolve(import.meta.dirname, "..");
const DATA_PATH = join(APP_ROOT, "src", "data", "hsk-words.json");
const META_PATH = join(APP_ROOT, "src", "data", "hsk-meta.json");
const DEFAULT_MODEL = "claude-sonnet-4-5";
const API_URL = "https://api.anthropic.com/v1/messages";
const API_VERSION = "2023-06-01";

type Args = {
  model: string;
  batchSize: number;
  concurrency: number;
  limit: number | null;
  level: number | null;
  dryRun: boolean;
  force: boolean;
};

function parseArgs(): Args {
  const out: Args = {
    model: DEFAULT_MODEL,
    batchSize: 25,
    concurrency: 4,
    limit: null,
    level: null,
    dryRun: false,
    force: false,
  };
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    if (k === "--model") out.model = a[++i] ?? DEFAULT_MODEL;
    else if (k === "--batch") out.batchSize = Math.max(1, Number(a[++i]) || 25);
    else if (k === "--concurrency")
      out.concurrency = Math.max(1, Number(a[++i]) || 1);
    else if (k === "--limit") out.limit = Number(a[++i]);
    else if (k === "--level") out.level = Number(a[++i]);
    else if (k === "--dry-run") out.dryRun = true;
    else if (k === "--force") out.force = true;
  }
  return out;
}

/**
 * Anthropic Messages API 호출. JSON-only 응답을 강제하기 위해
 * system prompt 에 출력 형식을 못박고 assistant prefill 로 `[` 를 시작시킴.
 */
async function callAnthropic(
  apiKey: string,
  model: string,
  batch: HskEntry[],
): Promise<Record<string, string>> {
  // 입력: id + 한자 + 병음 + 영어 의미 + POS
  const items = batch.map((e) => ({
    id: e.id,
    word: e.word,
    pinyin: e.pinyin,
    pos: e.pos.join(",") || "n/a",
    en: e.meaningEn,
  }));

  const system = [
    "You are a Chinese→Korean lexicographer for an HSK vocabulary learning app.",
    "For each entry, write a concise Korean dictionary-style meaning suitable for a learner.",
    "",
    "Rules:",
    "- Output ONLY a JSON array. No prose, no markdown fences.",
    "- Each item: { \"id\": \"hsk_X_NNNN\", \"ko\": \"...\" }.",
    "- Korean meaning: 1-3 senses separated by '; '. Use Korean dictionary style.",
    "  - Verbs: base form (e.g., '먹다', '가다'). Not '먹는 것'.",
    "  - Nouns: bare noun (e.g., '집', '학교'). Not '집이다'.",
    "  - Adjectives: '~다' form (e.g., '좋다', '크다').",
    "  - Measure words: '~을 세는 단위' style.",
    "- Prefer Sino-Korean (한자어) where it is the natural Korean cognate (e.g., 学校→학교, 时间→시간).",
    "- Pure Korean (고유어) when more natural (e.g., 妈妈→엄마).",
    "- Beware false friends — e.g., 工夫→'시간/노력' (NOT '공부'), 颜色→'색깔' (NOT '안색'), 放假→'방학하다/휴가 가다'.",
    "- Keep terse: 2-4 words per sense usually enough. Skip etymology/usage notes.",
    "- Preserve POS distinction in English source when it changes meaning (e.g., 'open (door); open (shop)').",
  ].join("\n");

  const user = JSON.stringify(items);

  const body = {
    model,
    max_tokens: Math.max(1024, batch.length * 80),
    system,
    messages: [
      { role: "user", content: user },
      { role: "assistant", content: "[" },
    ],
  };

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": API_VERSION,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (res.status === 429 || res.status >= 500) {
        const wait = 2000 * (attempt + 1);
        await new Promise((r) => setTimeout(r, wait));
        lastErr = new Error(`HTTP ${res.status}`);
        continue;
      }
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Anthropic ${res.status}: ${text.slice(0, 500)}`);
      }
      const data = (await res.json()) as {
        content: { type: string; text: string }[];
      };
      const text = data.content
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("");
      // assistant prefill 이 "[" 였으므로 응답을 그대로 합쳐 "[...]" 로 파싱.
      const jsonText = "[" + text;
      const parsed = JSON.parse(jsonText) as { id: string; ko: string }[];
      const map: Record<string, string> = {};
      for (const item of parsed) {
        if (typeof item?.id === "string" && typeof item?.ko === "string") {
          map[item.id] = item.ko.trim();
        }
      }
      return map;
    } catch (e) {
      lastErr = e;
      // JSON parse 실패 또는 네트워크 오류 — 짧게 대기 후 재시도
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("translation failed");
}

async function main(): Promise<void> {
  const args = parseArgs();
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!args.dryRun && !apiKey) {
    throw new Error("ANTHROPIC_API_KEY env var required (or use --dry-run).");
  }
  if (!existsSync(DATA_PATH)) {
    throw new Error(
      `${DATA_PATH} 없음. 먼저 \`npm run build:hsk\` 실행 필요.`,
    );
  }

  // eslint-disable-next-line no-console
  console.log(`[translate-hsk] Reading ${DATA_PATH}`);
  const all: HskEntry[] = JSON.parse(readFileSync(DATA_PATH, "utf8"));
  // eslint-disable-next-line no-console
  console.log(`[translate-hsk] Total: ${all.length} entries`);

  // 작업 대상 선정 — level filter, force/skip-cached, limit
  let candidates = all;
  if (args.level !== null) {
    candidates = candidates.filter((e) => e.hskLevel === args.level);
    // eslint-disable-next-line no-console
    console.log(`[translate-hsk] Level filter: HSK ${args.level} → ${candidates.length} entries`);
  }
  const needsTranslation = args.force
    ? candidates
    : candidates.filter((e) => !e.meaning || e.meaning.length === 0);
  const todo = args.limit ? needsTranslation.slice(0, args.limit) : needsTranslation;
  // eslint-disable-next-line no-console
  console.log(
    `[translate-hsk] To translate: ${todo.length}` +
      (args.force ? " (--force: re-translating already-done)" : ""),
  );

  if (todo.length === 0) {
    // eslint-disable-next-line no-console
    console.log("[translate-hsk] Nothing to do. ✓");
    return;
  }

  if (args.dryRun) {
    // eslint-disable-next-line no-console
    console.log(
      `[translate-hsk] --dry-run: would call API ` +
        `${Math.ceil(todo.length / args.batchSize)} times ` +
        `(batch=${args.batchSize}, concurrency=${args.concurrency}, model=${args.model}).`,
    );
    // eslint-disable-next-line no-console
    console.log("[translate-hsk] Sample first batch input:");
    console.log(
      JSON.stringify(
        todo.slice(0, Math.min(3, args.batchSize)).map((e) => ({
          id: e.id,
          word: e.word,
          pinyin: e.pinyin,
          en: e.meaningEn,
        })),
        null,
        2,
      ),
    );
    return;
  }

  // id → index — in-place 업데이트용
  const indexById = new Map<string, number>();
  for (let i = 0; i < all.length; i++) indexById.set(all[i].id, i);

  // 배치 분할
  const batches: HskEntry[][] = [];
  for (let i = 0; i < todo.length; i += args.batchSize) {
    batches.push(todo.slice(i, i + args.batchSize));
  }
  // eslint-disable-next-line no-console
  console.log(
    `[translate-hsk] ${batches.length} batches × ~${args.batchSize} entries (${args.model}, c=${args.concurrency})`,
  );

  // Concurrency 풀
  let cursor = 0;
  let doneBatches = 0;
  let translatedCount = 0;
  let failed = 0;
  const total = batches.length;
  const t0 = Date.now();

  function saveCheckpoint(): void {
    writeFileSync(DATA_PATH, JSON.stringify(all), "utf8");
  }

  function saveMeta(): void {
    // Home 페이지 등 가벼운 import 가 사용하는 진행률 메타 동기화.
    const meta = {
      totals: {} as Record<string, number>,
      translated: {} as Record<string, number>,
      generatedAt: new Date().toISOString(),
    };
    for (const lv of [1, 2, 3, 4, 5, 6, 7] as const) {
      const bucket = all.filter((e) => e.hskLevel === lv);
      meta.totals[String(lv)] = bucket.length;
      meta.translated[String(lv)] = bucket.filter(
        (e) => e.meaning && e.meaning.length > 0,
      ).length;
    }
    writeFileSync(META_PATH, JSON.stringify(meta, null, 0), "utf8");
  }

  async function worker(): Promise<void> {
    while (true) {
      const i = cursor++;
      if (i >= total) break;
      const batch = batches[i];
      try {
        const map = await callAnthropic(apiKey!, args.model, batch);
        for (const e of batch) {
          const ko = map[e.id];
          if (ko) {
            const idx = indexById.get(e.id);
            if (idx !== undefined) {
              all[idx] = { ...all[idx], meaning: ko };
              translatedCount++;
            }
          } else {
            failed++;
          }
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(
          `\n  Batch ${i} FAILED:`,
          (e as Error).message.slice(0, 200),
        );
        failed += batch.length;
      }
      doneBatches++;
      const sec = ((Date.now() - t0) / 1000).toFixed(0);
      process.stdout.write(
        `\r  [${doneBatches}/${total}] batches · +${translatedCount} translated · ${failed} failed · ${sec}s   `,
      );
      // 매 배치 후 checkpoint
      saveCheckpoint();
    }
  }

  await Promise.all(Array.from({ length: args.concurrency }, () => worker()));

  // 최종 저장
  saveCheckpoint();
  saveMeta();
  // 최종 통계
  const totalTranslated = all.filter((e) => e.meaning && e.meaning.length > 0).length;
  // eslint-disable-next-line no-console
  console.log(
    `\n[translate-hsk] Done. +${translatedCount} this run, ${failed} failed. ` +
      `Total: ${totalTranslated}/${all.length} (${((totalTranslated / all.length) * 100).toFixed(1)}%).`,
  );
  // eslint-disable-next-line no-console
  console.log(`[translate-hsk] Output: ${DATA_PATH}`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("[translate-hsk] FAIL:", e);
  process.exit(1);
});
