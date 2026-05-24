import { Suspense, lazy, useEffect } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import Layout from "@/components/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { InstallPrompt } from "@/components/InstallPrompt";
import { applySettingsToDom } from "@/state/settings";

const Home = lazy(() => import("@/routes/Home"));
const SituationList = lazy(() => import("@/routes/SituationList"));
const VocabDetail = lazy(() => import("@/routes/VocabDetail"));
const IdiomList = lazy(() => import("@/routes/IdiomList"));
const IdiomDetail = lazy(() => import("@/routes/IdiomDetail"));
const Flashcards = lazy(() => import("@/routes/Flashcards"));
const Search = lazy(() => import("@/routes/Search"));
const Settings = lazy(() => import("@/routes/Settings"));
const About = lazy(() => import("@/routes/About"));

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
              <Route path="/situations" element={<SituationList />} />
              <Route path="/situations/:groupId" element={<SituationList />} />
              <Route path="/vocab/:id" element={<VocabDetail />} />
              <Route path="/idioms" element={<IdiomList />} />
              <Route path="/idioms/:groupId" element={<IdiomList />} />
              <Route path="/idiom/:id" element={<IdiomDetail />} />
              <Route path="/flashcards" element={<Flashcards />} />
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
