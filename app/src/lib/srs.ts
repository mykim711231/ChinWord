/** Leitner 5-box SRS scheduling. */

export const BOX_INTERVAL_DAYS: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 1, 2: 3, 3: 7, 4: 14, 5: 30,
};

export type Difficulty = "hard" | "ok" | "easy";

export type SrsCard = {
  id: string;           // entry id
  kind: "vocab" | "idiom";
  box: 1 | 2 | 3 | 4 | 5;
  dueAt: number;        // epoch ms
  addedAt: number;
  masteredAt?: number;
};

export function newCard(id: string, kind: "vocab" | "idiom", now = Date.now()): SrsCard {
  return { id, kind, box: 1, dueAt: now, addedAt: now };
}

export function isDue(card: SrsCard, now = Date.now()): boolean {
  return !card.masteredAt && card.dueAt <= now;
}

export function review(card: SrsCard, diff: Difficulty, now = Date.now()): SrsCard {
  if (card.masteredAt) return card;
  let box = card.box;
  if (diff === "hard") box = 1;
  else if (diff === "ok") box = Math.min(5, box + (box < 5 ? 1 : 0)) as SrsCard["box"];
  else if (diff === "easy") {
    if (box === 5) return { ...card, masteredAt: now };
    box = Math.min(5, box + 1) as SrsCard["box"];
  }
  const next = now + BOX_INTERVAL_DAYS[box] * 24 * 60 * 60 * 1000;
  return { ...card, box, dueAt: next };
}

/**
 * Predict next interval (in days) for a grade button preview without mutating
 * any card. Returns `"mastered"` when grading `easy` at box 5 would master
 * the card. Used by Flashcards grade buttons to show "(N일 뒤)" — Anki-style.
 *
 * 새 카드(SRS 미등록)는 box=1 로 간주 (addCard 가 그렇게 만든다).
 */
export function nextIntervalDays(
  card: SrsCard | undefined,
  diff: Difficulty,
): number | "mastered" {
  const currentBox = (card?.box ?? 1) as SrsCard["box"];
  if (card?.masteredAt) return "mastered";
  if (diff === "hard") return BOX_INTERVAL_DAYS[1];
  if (diff === "easy" && currentBox === 5) return "mastered";
  const nextBox = Math.min(5, currentBox + 1) as SrsCard["box"];
  // ok 는 box<5 에서만 승격; box=5 면 box 유지 → BOX_INTERVAL_DAYS[5] = 30
  const okBox =
    diff === "ok"
      ? (Math.min(5, currentBox + (currentBox < 5 ? 1 : 0)) as SrsCard["box"])
      : nextBox;
  return BOX_INTERVAL_DAYS[diff === "ok" ? okBox : nextBox];
}
