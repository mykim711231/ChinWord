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
  const hit = findVocabEntry(id);
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
