import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy } from "lucide-react";

/** 앱 주소 QR 코드 + 주소 복사 버튼. */
export function ShareQr() {
  const url = `${window.location.origin}${import.meta.env.BASE_URL}`;
  const [qr, setQr] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(url, { width: 480, margin: 1 })
      .then(setQr)
      .catch(() => setQr(""));
  }, [url]);

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
    <section className="card mt-4 text-center">
      <h3 className="font-semibold">앱 공유</h3>
      {qr && (
        <img
          src={qr}
          alt="ChinWord 주소 QR 코드"
          className="w-44 h-44 mx-auto mt-3 rounded bg-white"
        />
      )}
      <div className="text-xs text-muted mt-2 break-all">{url}</div>
      <button
        type="button"
        onClick={copy}
        className="btn-primary text-sm mt-3 inline-flex items-center gap-1.5"
      >
        {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
        {copied ? "복사됨" : "주소 복사"}
      </button>
    </section>
  );
}
