export type InAppKind = "kakao" | "naver" | "facebook" | "instagram";

export type InAppInfo =
  | { kind: InAppKind; label: string }
  | { kind: null; label: null };

/**
 * 인앱 브라우저(카카오톡·네이버·페이스북·인스타그램 등) 감지.
 * 인앱 WebView 는 Service Worker / PWA 설치가 정상 동작하지 않으므로
 * 업데이트 토스트·설치 안내를 숨기는 데 사용한다.
 */
export function isInAppBrowser(): InAppInfo {
  if (typeof navigator === "undefined") return { kind: null, label: null };
  const ua = navigator.userAgent;
  if (/KAKAOTALK|KAKAO/i.test(ua)) return { kind: "kakao", label: "카카오톡" };
  if (/NAVER\(inapp/i.test(ua)) return { kind: "naver", label: "네이버 앱" };
  if (/FBAN|FBAV/i.test(ua)) return { kind: "facebook", label: "Facebook" };
  if (/Instagram/i.test(ua)) return { kind: "instagram", label: "Instagram" };
  return { kind: null, label: null };
}
