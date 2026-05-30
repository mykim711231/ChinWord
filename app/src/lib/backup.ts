/**
 * 학습 기록 백업/복원.
 *
 * ChinWord 의 모든 사용자 상태(설정·즐겨찾기·플래시카드/SRS·이어듣기)는
 * zustand persist 가 idb-keyval 기본 store 에 "chinword/*" 키로 저장한다.
 * 이 키들을 JSON 파일로 내보내고, 새 기기·재설치 후 복원한다.
 *
 * 참고: 필순 데이터(ChinWord-StrokeData DB)는 CDN 재다운로드로 복구되는
 * 캐시이지 사용자 데이터가 아니므로 백업 대상에서 제외한다.
 */
import { get as idbGet, set as idbSet, keys as idbKeys } from "idb-keyval";

const KEY_PREFIX = "chinword/";

export type ChinWordBackup = {
  app: "chinword";
  version: 1;
  exportedAt: string;
  data: Record<string, unknown>;
};

/** "chinword/*" 키 전부를 JSON 백업 객체로 추출. */
export async function exportBackup(): Promise<ChinWordBackup> {
  const allKeys = (await idbKeys()).map(String);
  const ourKeys = allKeys.filter((k) => k.startsWith(KEY_PREFIX));
  const entries = await Promise.all(
    ourKeys.map(async (k) => [k, await idbGet(k)] as const),
  );
  return {
    app: "chinword",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: Object.fromEntries(entries),
  };
}

/**
 * 백업 객체를 IndexedDB 로 복원. 기존 키는 덮어쓰며, 백업에 없는 키는 보존.
 * 복원 후 호출자는 페이지를 새로고침해 스토어를 다시 하이드레이트해야 한다.
 * @returns 복원한 항목 수
 */
export async function importBackup(backup: ChinWordBackup): Promise<number> {
  if (
    !backup ||
    backup.app !== "chinword" ||
    typeof backup.data !== "object" ||
    backup.data === null
  ) {
    throw new Error("ChinWord 백업 파일이 아닙니다.");
  }
  const entries = Object.entries(backup.data);
  await Promise.all(entries.map(([k, v]) => idbSet(k, v)));
  return entries.length;
}
