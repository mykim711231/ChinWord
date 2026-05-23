import { HashRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/ThemeProvider";
import { FontScaleProvider } from "@/components/FontScaleProvider";
import { Layout } from "@/components/Layout";
import { Home } from "@/pages/Home";
import { SituationList } from "@/pages/SituationList";
import { VocabGroupDetail } from "@/pages/VocabGroupDetail";
import { VocabDetail } from "@/pages/VocabDetail";
import { IdiomGroups } from "@/pages/IdiomGroups";
import { IdiomGroupDetail } from "@/pages/IdiomGroupDetail";
import { IdiomDetail } from "@/pages/IdiomDetail";
import { Flashcards } from "@/pages/Flashcards";
import { Search } from "@/pages/Search";
import { Settings } from "@/pages/Settings";
import { About } from "@/pages/About";

export function App() {
  return (
    <ThemeProvider>
      <FontScaleProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/situations" element={<SituationList />} />
              <Route path="/situations/:groupId" element={<VocabGroupDetail />} />
              <Route path="/vocab/:entryId" element={<VocabDetail />} />
              <Route path="/idioms" element={<IdiomGroups />} />
              <Route path="/idioms/:groupId" element={<IdiomGroupDetail />} />
              <Route path="/idiom/:entryId" element={<IdiomDetail />} />
              <Route path="/flashcards" element={<Flashcards />} />
              <Route path="/search" element={<Search />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/about" element={<About />} />
            </Route>
          </Routes>
        </HashRouter>
      </FontScaleProvider>
    </ThemeProvider>
  );
}
