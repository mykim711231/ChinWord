import { Navigate, useParams } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { PageShell } from "@/components/PageShell";
import { findVocabEntry } from "@/lib/content";

/**
 * Single-entry detail route — redirects to the theme group page
 * with the entry id as hash so the page scrolls to the card.
 */
export default function VocabDetail() {
  const { id = "" } = useParams<{ id: string }>();
  // 구버전 검색 인덱스(ht_ 접두) 캐시 호환 — 직접 조회 실패 시 접두 제거 후 재시도.
  const hit = findVocabEntry(id) ?? (id.startsWith("ht_") ? findVocabEntry(id.slice(3)) : undefined);
  if (!hit) {
    return (
      <PageShell>
        <TopBar title="단어를 찾을 수 없음" />
        <p className="text-muted mt-8 text-center">단어 ID: {id}</p>
      </PageShell>
    );
  }
  return (
    <Navigate
      to={`/vocab/theme/${hit.group.id}#${encodeURIComponent(hit.entry.id)}`}
      replace
    />
  );
}
