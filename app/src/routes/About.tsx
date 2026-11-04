import { TopBar } from "@/components/TopBar";
import { PageShell } from "@/components/PageShell";
import { ShareQr } from "@/components/ShareQr";

export default function About() {
  return (
    <PageShell>
      <TopBar title="정보" />

      <div className="card mt-2 text-center">
        <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="ChinWord" className="w-20 h-20 mx-auto" />
        <div className="font-bold text-lg mt-2">ChinWord 中国语</div>
        <div className="text-xs text-muted">
          v0.1.0 · 빌드 {new Date().toISOString().slice(0, 7)}
        </div>
      </div>

      <ShareQr />

      <section className="card mt-4">
        <h3 className="font-semibold">콘텐츠 출처 및 이용 안내</h3>
        <p className="text-sm mt-2 leading-relaxed">
          본 애플리케이션에서 제공하는 모든 중국어 단어·뜻풀이·필순 정보는
          공개 도메인 자원(강희자전, HSK 공개 어휘 목록 등)을 기반으로
          자체 편집·작성되었습니다.
        </p>
        <p className="text-sm mt-2 leading-relaxed">
          모든 한자 풀이와 콘텐츠는 직접 창작되었으며, 무단 복제 및 상업적
          이용을 금합니다.
        </p>
      </section>

      <section className="card mt-4">
        <h3 className="font-semibold">사용된 오픈소스</h3>
        <ul className="text-sm mt-2 space-y-1 list-disc list-inside">
          <li>React, Vite, TypeScript</li>
          <li>Tailwind CSS, Zustand</li>
          <li>vite-plugin-pwa (Workbox)</li>
          <li>MiniSearch, idb-keyval</li>
          <li>hanzi-writer + hanzi-writer-data</li>
        </ul>
      </section>

      <section className="card mt-4">
        <h3 className="font-semibold">개인정보 안내</h3>
        <p className="text-sm mt-2 leading-relaxed">
          본 앱은 어떠한 사용자 정보도 외부로 전송하지 않습니다. 모든
          학습 기록(즐겨찾기·플래시카드·설정)은 사용자 기기 내부의
          IndexedDB에만 저장되며, 설정 → 전체 초기화로 언제든 삭제할 수
          있습니다.
        </p>
      </section>

      <section className="card mt-4">
        <h3 className="font-semibold">라이선스</h3>
        <p className="text-sm mt-2">MIT License</p>
      </section>
    </PageShell>
  );
}
