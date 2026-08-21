"use client";

import { useState } from "react";
import QRCode from "react-qr-code";

interface Props {
  hostname: string;
  model: string | null;
}

export default function PrintView({ hostname, model }: Props) {
  const [mode, setMode] = useState<"single" | "sheet">("single");

  return (
    <div>
      <div className="no-print mb-6 flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-gray-300 p-1 text-sm">
          <button
            onClick={() => setMode("single")}
            className={`rounded-md px-3 py-1.5 font-medium ${mode === "single" ? "bg-brand-600 text-white" : "text-gray-600"}`}
          >
            Etiqueta única (A4)
          </button>
          <button
            onClick={() => setMode("sheet")}
            className={`rounded-md px-3 py-1.5 font-medium ${mode === "sheet" ? "bg-brand-600 text-white" : "text-gray-600"}`}
          >
            Folha de etiquetas (×8)
          </button>
        </div>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Imprimir
        </button>
      </div>

      {mode === "single" ? (
        <div className="flex min-h-[70vh] items-center justify-center rounded-xl border border-gray-200 bg-white p-10 shadow-sm print:min-h-screen print:border-0 print:shadow-none">
          <Label hostname={hostname} model={model} size={260} big />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:grid-cols-2 print:gap-2 print:border-0 print:p-0 print:shadow-none">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 p-4 print:border-gray-400">
              <Label hostname={hostname} model={model} size={120} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Label({ hostname, model, size, big }: { hostname: string; model: string | null; size: number; big?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="rounded-lg bg-white p-3 ring-1 ring-gray-200">
        <QRCode value={hostname} size={size} style={{ height: "auto", maxWidth: "100%", width: "100%" }} />
      </div>
      <p className={`font-extrabold tracking-wide text-gray-900 ${big ? "text-3xl" : "text-base"}`}>{hostname}</p>
      {model && <p className={`text-gray-500 ${big ? "text-sm" : "text-xs"}`}>{model}</p>}
    </div>
  );
}
