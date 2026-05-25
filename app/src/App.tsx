import { Suspense, lazy, useEffect } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { InstallPrompt } from "@/components/InstallPrompt";
import { applySettingsToDom } from "@/state/settings";

const Home = lazy(() => import("@/routes/Home"));
const Toc = lazy(() => import("@/routes/Toc"));
const SituationList = lazy(() => import("@/routes/SituationList"));
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
              {/* legacy: defaults to combined view */}
              <Route path="/toc" element={<Toc />} />
              <Route path="/toc/:vol" element={<Toc />} />
              {/* 단어 (vocab) */}
              <Route path="/words" element={<Toc />} />
              <Route path="/words/:vol" element={<Toc />} />
              <Route path="/situations" element={<SituationList />} />
              <Route path="/situations/:groupId" element={<SituationList />} />
              <Route path="/vocab/:id" element={<VocabDetail />} />
              {/* 성어 (idiom) */}
              <Route path="/idioms" element={<Toc />} />
              <Route path="/idioms/:vol" element={<Toc />} />
              <Route path="/idiom-group/:groupId" element={<IdiomList />} />
              <Route path="/idiom/:id" element={<IdiomDetail />} />
              {/* 학습 허브 */}
              <Route path="/learn" element={<Learn />} />
              {/* 필순 (stroke order marathon) */}
              <Route path="/strokes" element={<Strokes />} />
              <Route path="/strokes/play" element={<StrokesPlay />} />
              <Route path="/strokes/:id" element={<StrokeStudy />} />
              {/* 이어듣기 (marathon listen) */}
              <Route path="/listen" element={<Listen />} />
              <Route path="/listen/play" element={<ListenPlay />} />
              {/* misc */}
              <Route path="/flashcards" element={<Flashcards />} />
              <Route path="/flashcards/:area" element={<Flashcards />} />
              <Route path="/flashcards/:area/play" element={<FlashcardsPlay />} />
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
