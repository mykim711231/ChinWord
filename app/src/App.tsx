import { Suspense, lazy, useEffect } from "react";
import { HashRouter, Navigate, Route, Routes, useParams, useLocation } from "react-router-dom";
import Layout from "@/components/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { InstallPrompt } from "@/components/InstallPrompt";
import { applySettingsToDom } from "@/state/settings";

const Home = lazy(() => import("@/routes/Home"));
const VocabHub = lazy(() => import("@/routes/VocabHub"));
// Toc, SituationList 삭제됨 — hsk-themes VocabHub + HskThemeList로 대체
const VocabDetail = lazy(() => import("@/routes/VocabDetail"));
const IdiomList = lazy(() => import("@/routes/IdiomList"));
const IdiomDetail = lazy(() => import("@/routes/IdiomDetail"));
const Flashcards = lazy(() => import("@/routes/Flashcards"));
const FlashcardsPlay = lazy(() => import("@/routes/FlashcardsPlay"));
const Search = lazy(() => import("@/routes/Search"));
const Settings = lazy(() => import("@/routes/Settings"));
const About = lazy(() => import("@/routes/About"));
const Learn = lazy(() => import("@/routes/Learn"));
const Strokes = lazy(() => import("@/routes/Strokes"));
const StrokesPlay = lazy(() => import("@/routes/StrokesPlay"));
const StrokeStudy = lazy(() => import("@/routes/StrokeStudy"));
const Listen = lazy(() => import("@/routes/Listen"));
const ListenPlay = lazy(() => import("@/routes/ListenPlay"));
const HskTier = lazy(() => import("@/routes/HskTier"));
const HskThemeList = lazy(() => import("@/routes/HskThemeList"));

function LoadingFallback(): JSX.Element {
  return (
    <div className="py-20 text-center text-sm text-muted" aria-live="polite">
      불러오는 중…
    </div>
  );
}

export default function App(): JSX.Element {
  useEffect(() => {
    applySettingsToDom();
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (): void => applySettingsToDom();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  return (
    <ErrorBoundary>
      <HashRouter>
        <Layout>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />

              {/* ─── 통합 단어장 ─── */}
              <Route path="/vocab" element={<VocabHub />} />
              {/* HSK tier 하위 */}
              <Route path="/vocab/basic" element={<HskTier />} />
              <Route path="/vocab/mid" element={<HskTier />} />
              <Route path="/vocab/adv" element={<HskTier />} />
              {/* 성어 허브 + 그룹 상세 */}
              <Route path="/vocab/idioms" element={<IdiomList />} />
              <Route path="/vocab/idioms/:groupId" element={<IdiomList />} />
              {/* 테마별 단어 목록 (hsk-themes 데이터 기반) */}
              <Route path="/vocab/theme/:groupId" element={<HskThemeList />} />
              {/* 단어/성어 단건 디테일 (리다이렉트) */}
              <Route path="/vocab/:id" element={<VocabDetail />} />

              {/* ─── 학습 허브 ─── */}
              <Route path="/learn" element={<Learn />} />
              {/* 필순 (stroke order marathon) */}
              <Route path="/strokes" element={<Strokes />} />
              <Route path="/strokes/play" element={<StrokesPlay />} />
              <Route path="/strokes/:id" element={<StrokeStudy />} />
              {/* 이어듣기 (marathon listen) */}
              <Route path="/listen" element={<Listen />} />
              <Route path="/listen/play" element={<ListenPlay />} />
              {/* 플래시카드 */}
              <Route path="/flashcards" element={<Flashcards />} />
              <Route path="/flashcards/:area" element={<Flashcards />} />
              <Route path="/flashcards/:area/play" element={<FlashcardsPlay />} />

              {/* ─── 레거시 리다이렉트 ─── */}
              {/* /words → /vocab */}
              <Route path="/words" element={<Navigate to="/vocab" replace />} />
              <Route path="/words/:vol" element={<Navigate to="/vocab" replace />} />
              <Route path="/toc" element={<Navigate to="/vocab" replace />} />
              <Route path="/toc/:vol" element={<Navigate to="/vocab" replace />} />
              {/* /idioms → /vocab/idioms */}
              <Route path="/idioms" element={<Navigate to="/vocab/idioms" replace />} />
              <Route path="/idioms/:vol" element={<Navigate to="/vocab/idioms" replace />} />
              {/* /idiom-group/:id → /vocab/idioms/:id */}
              <Route path="/idiom-group/:groupId" element={<LegacyIdiomGroupRedirect />} />
              {/* /situations/:id → /vocab/theme/:id */}
              <Route path="/situations/:groupId" element={<LegacySituationRedirect />} />
              {/* /hsk → /vocab */}
              <Route path="/hsk" element={<Navigate to="/vocab" replace />} />
              <Route path="/hsk/basic" element={<Navigate to="/vocab/basic" replace />} />
              <Route path="/hsk/mid" element={<Navigate to="/vocab/mid" replace />} />
              <Route path="/hsk/adv" element={<Navigate to="/vocab/adv" replace />} />
              <Route path="/hsk/:tier" element={<Navigate to="/vocab" replace />} />

              {/* ─── misc ─── */}
              <Route path="/search" element={<Search />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </Suspense>
        </Layout>
        <InstallPrompt />
      </HashRouter>
    </ErrorBoundary>
  );
}

/** 레거시 /idiom-group/:groupId → /vocab/idioms/:groupId (hash 보존) */
function LegacyIdiomGroupRedirect() {
  return <RedirectWithGroupId base="/vocab/idioms" />;
}

/** 레거시 /situations/:groupId → /vocab/theme/:groupId (hash 보존) */
function LegacySituationRedirect() {
  return <RedirectWithGroupId base="/vocab/theme" />;
}

/** 범용 param 전달 리다이렉트 — :groupId + location.hash 보존 */
function RedirectWithGroupId({ base }: { base: string }) {
  const { groupId } = useParams<{ groupId: string }>();
  const loc = useLocation();
  return <Navigate to={`${base}/${groupId ?? ""}${loc.hash}`} replace />;
}
