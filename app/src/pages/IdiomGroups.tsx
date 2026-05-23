import { Link } from "react-router-dom";
import { getIdiomGroups } from "@/data/lookup";
import type { IdiomGroup } from "@/types";

export function IdiomGroups() {
  const groups = getIdiomGroups();

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
          고사성어
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          {groups.length}개 그룹
        </p>
      </header>

      <div className="space-y-2">
        {groups.map((group: IdiomGroup) => (
          <Link
            key={group.id}
            to={`/idioms/${group.id}`}
            className="block rounded-xl p-4 no-underline"
            style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-divider)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold" style={{ color: "var(--color-text)" }}>
                  {group.title}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {group.entries.length}개 성어
                </p>
                <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>›</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
