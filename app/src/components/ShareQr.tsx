import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, QrCode, X } from "lucide-react";

/** "QR 코드" 버튼 → 모달에 앱 주소 QR + 주소 복사. */
export function ShareQr() {
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

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="QR 코드"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-bg rounded-2xl max-w-sm w-full p-6 shadow-xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold text-fg">QR 코드</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="닫기"
                className="text-muted hover:text-fg p-1"
              >
                <X size={20} aria-hidden />
              </button>
            </div>
            {qr && (
              <img
                src={qr}
                alt="ChinWord 주소 QR 코드"
                className="w-52 h-52 mx-auto rounded bg-white"
              />
            )}
            <div className="text-xs text-muted mt-3 break-all">{url}</div>
            <button
              type="button"
              onClick={copy}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary text-white text-sm font-semibold px-5 py-2.5"
            >
              {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
              {copied ? "복사됨" : "주소 복사"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
