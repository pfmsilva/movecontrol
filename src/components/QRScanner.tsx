"use client";

import { useEffect, useRef, useState } from "react";

const READER_ID = "qr-reader-region";

interface Props {
  active: boolean;
  onScan: (decodedText: string) => void;
  cooldownMs?: number;
}

export default function QRScanner({ active, onScan, cooldownMs = 2500 }: Props) {
  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ text: string; at: number } | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      setCameraError(null);
      setStarting(true);
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelled) return;

        const instance = new Html5Qrcode(READER_ID, { verbose: false });
        scannerRef.current = instance;

        await instance.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            const now = Date.now();
            const last = lastScanRef.current;
            if (last && last.text === decodedText && now - last.at < cooldownMs) {
              return; // evita registos duplicados do mesmo código em sequência
            }
            lastScanRef.current = { text: decodedText, at: now };
            onScan(decodedText);
          },
          () => {
            // erro de leitura por frame (código fora de foco, etc.) — ignorar
          }
        );
      } catch (err) {
        if (!cancelled) {
          setCameraError(
            err instanceof Error
              ? `Não foi possível aceder à câmara: ${err.message}`
              : "Não foi possível aceder à câmara."
          );
        }
      } finally {
        if (!cancelled) setStarting(false);
      }
    }

    async function stop() {
      const instance = scannerRef.current;
      scannerRef.current = null;
      if (instance) {
        try {
          await instance.stop();
          instance.clear();
        } catch {
          // já parado, ignorar
        }
      }
    }

    if (active) {
      start();
    } else {
      stop();
    }

    return () => {
      cancelled = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return (
    <div>
      <div id={READER_ID} className="mx-auto overflow-hidden rounded-xl bg-black" />
      {starting && <p className="mt-2 text-center text-xs text-gray-400">A iniciar câmara…</p>}
      {cameraError && <p className="mt-2 text-center text-xs text-red-600">{cameraError}</p>}
    </div>
  );
}
