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
