import { Navigate, useParams } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { PageShell } from "@/components/PageShell";
import { findVocabEntry } from "@/lib/content";

/**
 * Legacy single-entry detail route. The new flow shows the entire lesson on
 * one scrollable page; we redirect to that group page with the entry id as
 * the URL hash so the page can scroll-into-view the targeted card.
 */
export default function VocabDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const hit = findVocabEntry(id);
  if (!hit) {
    return (
      <PageShell>
        <TopBar title="단어를 찾을 수 없음" back />
        <p className="text-muted mt-8 text-center">단어 ID: {id}</p>
      </PageShell>
    );
  }
  return (
    <Navigate
      to={`/situations/${hit.group.id}#${encodeURIComponent(hit.entry.id)}`}
      replace
    />
  );
}
