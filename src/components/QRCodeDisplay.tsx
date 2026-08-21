"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { toDataURL } from "qrcode";

interface Props {
  value: string;
  size?: number;
  showDownload?: boolean;
}

export default function QRCodeDisplay({ value, size = 180, showDownload = false }: Props) {
  const [pngUrl, setPngUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (showDownload) {
      toDataURL(value, { width: 1024, margin: 1 }).then((url) => {
        if (!cancelled) setPngUrl(url);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [value, showDownload]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-lg bg-white p-3 ring-1 ring-gray-200">
        <QRCode value={value} size={size} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
      </div>
      {showDownload && (
        <a
          href={pngUrl ?? undefined}
          download={`${value}-qrcode.png`}
          className={`rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 ${
            pngUrl ? "" : "pointer-events-none opacity-50"
          }`}
        >
          Descarregar PNG
        </a>
      )}
    </div>
  );
}
