import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Camera, Check, Copy, QrCode, X } from "lucide-react";

/** "QR 코드" 버튼 → 모달에 앱 주소 QR + 주소 복사. */
export function ShareQr({ variant = "default" }: { variant?: "default" | "hero" }) {
  const url = `${window.location.origin}${import.meta.env.BASE_URL}`;
  const [open, setOpen] = useState(false);
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(url, { width: 480, margin: 1 })
      .then(setQr)
      .catch(() => setQr(""));
  }, [open, url]);

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {variant === "hero" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white/20 text-white px-4 py-2 text-sm font-medium active:bg-white/30 transition"
        >
          <QrCode size={16} aria-hidden />
          QR 코드
        </button>
      ) : (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary text-white text-sm font-semibold px-5 py-2.5 shadow"
          >
            <QrCode size={18} aria-hidden />
            QR 코드
          </button>
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-qr-title"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-bg rounded-2xl max-w-md w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3
                id="share-qr-title"
                className="text-lg font-bold text-fg inline-flex items-center gap-2"
              >
                <Camera size={20} aria-hidden />
                QR 코드로 초청하기
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="text-muted hover:text-fg p-1"
              >
                <X size={22} aria-hidden />
              </button>
            </div>
            <p className="text-sm font-bold text-fg">
              휴대폰 카메라로 아래 그림을 비추면 설치 화면이 열려요.
            </p>
            <div className="mt-4 mx-auto w-fit rounded-xl border border-divider bg-white p-4">
              {qr ? (
                <img
                  src={qr}
                  alt="ChinWord 주소 QR 코드"
                  className="w-52 h-52"
                />
              ) : (
                <div className="w-52 h-52" />
              )}
            </div>
            <ol className="mt-5 space-y-3 text-sm text-fg">
              <QStep n={1}>
                상대방 휴대폰의 <b>카메라 앱</b>을 켭니다.
              </QStep>
              <QStep n={2}>
                카메라로 위의 <b>QR 그림</b>을 비춥니다.
              </QStep>
              <QStep n={3}>
                화면에 뜨는 <b>주소(링크)</b>를 누르면 설치 화면이 열립니다.
              </QStep>
            </ol>
            <div className="mt-5 pt-4 border-t border-divider">
              <p className="text-xs text-muted">
                QR이 잘 안 되면 이 주소를 직접 알려 주세요
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="flex-1 min-w-0 text-xs font-bold text-fg break-all">
                  {url}
                </span>
                <button
                  type="button"
                  onClick={copy}
                  className="flex-none inline-flex items-center gap-1 rounded-full border border-divider text-xs font-semibold px-3 py-1.5"
                >
                  {copied ? (
                    <Check size={14} aria-hidden />
                  ) : (
                    <Copy size={14} aria-hidden />
                  )}
                  {copied ? "복사됨" : "주소 복사"}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full mt-4 rounded-full bg-primary text-white text-sm font-semibold py-3"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function QStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex-none w-7 h-7 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
        {n}
      </span>
      <span className="pt-1">{children}</span>
    </li>
  );
}
