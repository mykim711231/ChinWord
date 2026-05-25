/**
 * TTS 자산 빌더 — Microsoft Edge Read-Aloud (Neural) 백엔드.
 *
 * 입력:
 *   - src/data/vocab-groups.json, idiom-groups.json (build-content.ts가 생성)
 *
 * 출력:
 *   - public/tts/<sha1-12>.mp3   (실제 음성 파일)
 *   - src/data/zh-tts-manifest.json  (원문 zh → 파일명 매핑)
 *
 * 백엔드: msedge-tts
 *   - Edge의 Read-Aloud Neural TTS (Azure Speech와 동일 모델 계열)를 무료·무인증 호출
 *   - 빌드타임 1회 합성 후 mp3 정적 파일로 배포 → 런타임 외부 의존 0
 *   - 음성 예: zh-CN-XiaoxiaoNeural (여), zh-CN-YunxiNeural (남),
 *     zh-CN-XiaoyiNeural (여, 어린이), zh-CN-YunjianNeural (남, 스포츠 캐스터)
 *
 * Idempotent: 이미 합성된 파일이 있으면 skip.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 라이선스 주의 (License Notice — Reviewed 2026-05)
 *
 * msedge-tts는 Microsoft Edge "Read Aloud"의 비공개 WebSocket 엔드포인트
 * (speech.platform.bing.com)를 호출하는 비공식 라이브러리입니다.
 *
 *   - Microsoft Azure Cognitive Services 약관은 "Edge Read Aloud용으로 노출된
 *     음성을 별도 앱·서비스에 재배포(redistribute)하는 행위"를 명시적으로 허용하지
 *     않습니다.
 *   - 본 프로젝트는 개인 학습용·비영리 PWA로 약 1,300여 mp3를 합성·번들하므로
 *     실무적 위험은 낮으나, 상업 배포·재배포 시 다음 대안으로 전환해야 합니다.
 *
 * 대안 (우선순위 순):
 *   1. Piper TTS (MIT) — 로컬 합성, zh_CN-huayan-medium 등 OSS
 *   2. Azure Speech Service F0 (무료 티어, 월 500K 자) — 공식 라이선스 + Xiaoxiao 동일
 *   3. Google Cloud TTS / Amazon Polly — 신경망 보통화 음성
 *
 * 마이그레이션 시 변경 지점:
 *   - synthesizeOne(): TTS 클라이언트 교체 (인터페이스 동일 유지)
 *   - DEFAULT_VOICE: 새 백엔드 음성명
 *   - 일관성 위해 전 mp3 재생성 권장
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 사용 예:
 *   npm run build:tts                              # 기본 (Xiaoxiao)
 *   npm run build:tts -- --voice zh-CN-YunxiNeural # 남성 음성
 *   npm run build:tts -- --limit 20 --dry-run      # 미리보기
 *   npm run build:tts -- --concurrency 6           # 합성 가속
 */
import {
  writeFileSync,
  mkdirSync,
  existsSync,
  readdirSync,
  readFileSync,
  createWriteStream,
} from "node:fs";
import { join } from "node:path";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import {
  OUT_DIR,
  MANIFEST_PATH,
  collectAllTtsTexts,
  hashName,
} from "./tts-texts";

const DEFAULT_VOICE = "zh-CN-XiaoxiaoNeural";

type Args = {
  voice: string;
  limit: number | null;
  dryRun: boolean;
  concurrency: number;
};

function parseArgs(): Args {
  const out: Args = {
    voice: DEFAULT_VOICE,
    limit: null,
    dryRun: false,
    concurrency: 4,
  };
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    if (k === "--voice") out.voice = a[++i] ?? DEFAULT_VOICE;
    else if (k === "--limit") out.limit = Number(a[++i]);
    else if (k === "--dry-run") out.dryRun = true;
    else if (k === "--concurrency")
      out.concurrency = Math.max(1, Number(a[++i]) || 1);
  }
  return out;
}

/**
 * 단일 텍스트를 합성하여 path 에 mp3로 저장.
 * msedge-tts API: toStream() → { audioStream(Readable) }. Readable 을 file 로 pipe.
 */
function synthesizeOne(
  tts: MsEdgeTTS,
  text: string,
  path: string,
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const out = createWriteStream(path);
    const { audioStream } = tts.toStream(text);
    audioStream.on("error", reject);
    out.on("error", reject);
    out.on("finish", () => resolve());
    audioStream.pipe(out);
  });
}

/**
 * 동시성 풀: items 를 concurrency 개씩 병렬 합성.
 * 각 워커는 자체 MsEdgeTTS 인스턴스(WebSocket)를 가져 직렬 처리.
 */
async function synthesizeAll(
  todo: { text: string; path: string; file: string }[],
  voice: string,
  concurrency: number,
  manifest: Record<string, string>,
  onProgress: (done: number, total: number) => void,
): Promise<void> {
  let cursor = 0;
  let done = 0;
  const total = todo.length;

  async function worker(): Promise<void> {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    while (true) {
      const i = cursor++;
      if (i >= total) break;
      const it = todo[i];
      try {
        await synthesizeOne(tts, it.text, it.path);
        manifest[it.text] = it.file;
        done++;
        onProgress(done, total);
        // 매 20개마다 중간 저장 — 중단되어도 진행률 보존
        if (done % 20 === 0) {
          writeFileSync(
            MANIFEST_PATH,
            JSON.stringify(manifest, Object.keys(manifest).sort(), 2),
          );
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error(`\n  FAIL [${it.text}]:`, (e as Error).message);
      }
    }
    try {
      tts.close();
    } catch {
      /* ignore */
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
}

async function main(): Promise<void> {
  const args = parseArgs();
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });

  // eslint-disable-next-line no-console
  console.log(`Voice: ${args.voice}`);
  const all = collectAllTtsTexts();
  const texts = Array.from(all);
  const targets = args.limit ? texts.slice(0, args.limit) : texts;
  // eslint-disable-next-line no-console
  console.log(
    `Unique zh texts: ${texts.length}${
      args.limit ? ` (limited to ${targets.length})` : ""
    }`,
  );

  let manifest: Record<string, string> = {};
  if (existsSync(MANIFEST_PATH)) {
    try {
      manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as Record<
        string,
        string
      >;
    } catch {
      manifest = {};
    }
  }

  const todo: { text: string; path: string; file: string }[] = [];
  const existingFiles = new Set(
    existsSync(OUT_DIR) ? readdirSync(OUT_DIR) : [],
  );
  for (const t of targets) {
    const file = hashName(t);
    const full = join(OUT_DIR, file);
    if (manifest[t] === file && existingFiles.has(file)) continue;
    todo.push({ text: t, path: full, file });
  }
  // eslint-disable-next-line no-console
  console.log(
    `To synthesize: ${todo.length} (skipped ${targets.length - todo.length} cached)`,
  );
  if (args.dryRun) {
    // eslint-disable-next-line no-console
    console.log("--dry-run: no synthesis performed.");
    return;
  }
  if (todo.length === 0) {
    writeFileSync(
      MANIFEST_PATH,
      JSON.stringify(manifest, Object.keys(manifest).sort(), 2),
    );
    return;
  }

  const t0 = Date.now();
  await synthesizeAll(
    todo,
    args.voice,
    args.concurrency,
    manifest,
    (doneN, totalN) => {
      if (doneN % 5 === 0 || doneN === totalN) {
        const sec = ((Date.now() - t0) / 1000).toFixed(1);
        process.stdout.write(`\r  [${doneN}/${totalN}] ${sec}s   `);
      }
    },
  );
  // 최종 저장
  writeFileSync(
    MANIFEST_PATH,
    JSON.stringify(manifest, Object.keys(manifest).sort(), 2),
  );
  // eslint-disable-next-line no-console
  console.log(`\nDone. manifest has ${Object.keys(manifest).length} entries.`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
