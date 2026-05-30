import { Link } from "react-router-dom";
import { Headphones, PenLine, Layers, ChevronRight } from "lucide-react";
import { TopBar } from "@/components/TopBar";
import { PageShell } from "@/components/PageShell";

export default function Learn(): JSX.Element {
  return (
    <PageShell>
      <TopBar title="학습" />

      <p className="text-xs text-muted mt-1 mb-3 px-1">
        영역·범위·표시를 정한 뒤 마라톤 모드로 학습합니다.
      </p>

      <Link
        to="/listen"
        className="card flex items-center justify-between hover:shadow-lg transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-primary-soft inline-flex items-center justify-center">
            <Headphones size={22} aria-hidden className="text-primary" />
          </div>
          <div className="text-left">
            <div className="font-semibold">이어듣기</div>
            <div className="text-xs text-muted mt-0.5">
              카드를 순서대로 들려줍니다 · 카드 간격 + 반복
            </div>
          </div>
        </div>
        <ChevronRight size={20} aria-hidden className="text-muted" />
      </Link>

      <Link
        to="/strokes"
        className="card mt-3 flex items-center justify-between hover:shadow-lg transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-primary-soft inline-flex items-center justify-center">
            <PenLine size={22} aria-hidden className="text-primary" />
          </div>
          <div className="text-left">
            <div className="font-semibold">필순</div>
            <div className="text-xs text-muted mt-0.5">
              한 글자를 N회 그린 뒤 다음 카드로 진행
            </div>
          </div>
        </div>
        <ChevronRight size={20} aria-hidden className="text-muted" />
      </Link>

      {/* 단일 플래시카드 진입점 — 기본 단어, 설정 화면에서 단어/성어 전환 가능. */}
      <Link
        to="/flashcards"
        className="card mt-3 flex items-center justify-between hover:shadow-lg transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-primary-soft inline-flex items-center justify-center">
            <Layers size={22} aria-hidden className="text-primary" />
          </div>
          <div className="text-left">
            <div className="font-semibold">플래시카드</div>
            <div className="text-xs text-muted mt-0.5">
              단어·성어를 카드로 복습 · 권/과 단위 선택
            </div>
          </div>
        </div>
        <ChevronRight size={20} aria-hidden className="text-muted" />
      </Link>
    </PageShell>
  );
}
