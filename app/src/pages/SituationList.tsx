import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getVocabGroups, getPhases } from "@/data/lookup";
import type { VocabGroup } from "@/types";

export function SituationList() {
  const [searchParams] = useSearchParams();
  const phaseFilter = searchParams.get("phase");

  const phases = getPhases();

  const groups = useMemo(() => {
    if (phaseFilter) {
      const phase = phases.find((p) => p.id === phaseFilter);
      return phase ? phase.vocabGroups : getVocabGroups();
    }
    return getVocabGroups();
  }, [phaseFilter]);

  const activePhaseLabel = phaseFilter
    ? phases.find((p) => p.id === phaseFilter)?.label
    : null;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
          {activePhaseLabel ?? "상황별 단어"}
        </h1>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          {groups.length}개 그룹
        </p>
      </header>

      {!phaseFilter && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {phases.map((phase) => (
            <Link
              key={phase.id}
              to={`?phase=${phase.id}`}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium no-underline"
              style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-divider)", color: "var(--color-text)" }}
            >
              {phase.label}
            </Link>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {groups.map((group: VocabGroup) => (
          <Link
            key={group.id}
            to={`/situations/${group.id}`}
            className="block rounded-xl p-4 no-underline"
            style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-divider)" }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold" style={{ color: "var(--color-text)" }}>
                  {group.title}
                </p>
                <p className="text-sm" style={{ color: "var(--color-pinyin)" }}>
                  {group.titlePinyin}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {group.entries.length}개 단어
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
