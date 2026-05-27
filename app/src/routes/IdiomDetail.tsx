import { Navigate, useParams } from "react-router-dom";
import { TopBar } from "@/components/TopBar";
import { PageShell } from "@/components/PageShell";
import { findIdiomEntry } from "@/lib/content";

/**
 * Single-entry detail route — redirects to the idiom group page
 * with the entry id as hash so the page scrolls to the card.
 */
export default function IdiomDetail() {
  const { id = "" } = useParams<{ id: string }>();
  const hit = findIdiomEntry(id);
  if (!hit) {
    return (
      <PageShell>
        <TopBar title="성어를 찾을 수 없음" back />
        <p className="text-muted mt-8 text-center">성어 ID: {id}</p>
      </PageShell>
    );
  }
  return (
    <Navigate
      to={`/vocab/idioms/${hit.group.id}#${encodeURIComponent(hit.entry.id)}`}
      replace
    />
  );
}
