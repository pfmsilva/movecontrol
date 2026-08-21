"use client";

import { useState } from "react";
import QRCode from "react-qr-code";
import type { EquipmentDTO } from "@/lib/types";
import { PORT_TYPE_LABELS } from "@/lib/types";

type Mode = "ficha" | "single" | "sheet";

export default function PrintView({ equipment }: { equipment: EquipmentDTO }) {
  const [mode, setMode] = useState<Mode>("ficha");

  return (
    <div>
      <div className="no-print mb-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap rounded-lg border border-gray-300 p-1 text-sm">
          <ModeButton mode={mode} value="ficha" onClick={setMode}>
            Ficha Completa (A4)
          </ModeButton>
          <ModeButton mode={mode} value="single" onClick={setMode}>
            Etiqueta única (A4)
          </ModeButton>
          <ModeButton mode={mode} value="sheet" onClick={setMode}>
            Folha de etiquetas (×8)
          </ModeButton>
        </div>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Imprimir
        </button>
      </div>

      {mode === "ficha" && <FichaCompleta equipment={equipment} />}

      {mode === "single" && (
        <div className="flex min-h-[70vh] items-center justify-center rounded-xl border border-gray-200 bg-white p-10 shadow-sm print:min-h-screen print:border-0 print:shadow-none">
          <Label hostname={equipment.hostname} model={equipment.model} size={260} big />
        </div>
      )}

      {mode === "sheet" && (
        <div className="grid grid-cols-2 gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:grid-cols-2 print:gap-2 print:border-0 print:p-0 print:shadow-none">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 p-4 print:border-gray-400">
              <Label hostname={equipment.hostname} model={equipment.model} size={120} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ModeButton({
  mode,
  value,
  onClick,
  children,
}: {
  mode: Mode;
  value: Mode;
  onClick: (v: Mode) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={() => onClick(value)}
      className={`whitespace-nowrap rounded-md px-3 py-1.5 font-medium ${
        mode === value ? "bg-brand-600 text-white" : "text-gray-600"
      }`}
    >
      {children}
    </button>
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

// — Campo de formulário: label pequena por cima, valor (ou traço) por baixo —
function Field({ label, value, wide }: { label: string; value: string | null | undefined; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-full" : ""}>
      <p className="text-[9px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="min-h-[14px] border-b border-gray-300 pb-0.5 text-[11px] text-gray-900">{value?.trim() || " "}</p>
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-t border-b border-gray-800 bg-gray-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-gray-800 print:bg-gray-200">
      {children}
    </div>
  );
}

function FichaCompleta({ equipment: eq }: { equipment: EquipmentDTO }) {
  return (
    <div className="mx-auto max-w-[210mm] rounded-xl border border-gray-200 bg-white p-6 shadow-sm print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <div className="border border-gray-800 text-gray-900">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-4 border-b border-gray-800 p-3">
          <div>
            <p className="text-lg font-extrabold tracking-wide">FICHA DE EQUIPAMENTO</p>
            <p className="text-xs text-gray-600">Wave: {eq.wave?.trim() || "—"}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xl font-extrabold tracking-wide">{eq.hostname}</p>
              {eq.model && <p className="text-xs text-gray-500">{eq.model}</p>}
            </div>
            <div className="rounded bg-white p-1.5 ring-1 ring-gray-300">
              <QRCode value={eq.hostname} size={72} />
            </div>
          </div>
        </div>

        {/* Dados do Equipamento */}
        <SectionHeader>Dados do Equipamento</SectionHeader>
        <div className="grid grid-cols-3 gap-x-4 gap-y-2 p-3">
          <Field label="Tipo Equipamento" value={eq.equipmentType} />
          <Field label="Fabricante" value={eq.manufacturer} />
          <Field label="Modelo" value={eq.model} />
          <Field label="Etiqueta" value={eq.assetTag} />
          <Field label="Serial Number" value={eq.serialNumber} />
          <Field label="KVM" value={eq.kvm} />
          <Field label="Cabos Power" value={eq.powerCables} />
          <Field label="Cabos Especiais" value={eq.specialCables} />
          <Field label="Braços" value={eq.arms} />
          <Field label="Localização Power" value={eq.powerLocation} />
          <Field label="Ligação Cabos" value={eq.cableConnection} />
          <Field label="Calhas" value={eq.rails} />
          <Field label="Observações" value={eq.notes} wide />
        </div>

        {/* Localização de Origem */}
        <SectionHeader>Localização de Origem</SectionHeader>
        <div className="grid grid-cols-5 gap-x-4 gap-y-2 p-3">
          <Field label="Datacenter" value={eq.originDatacenter} />
          <Field label="EP" value={eq.originEp} />
          <Field label="Ilha" value={eq.originIsland} />
          <Field label="Bastidor" value={eq.originRack} />
          <Field label="Posição" value={eq.originPosition} />
        </div>

        {/* Localização de Destino */}
        <SectionHeader>Localização de Destino</SectionHeader>
        <div className="grid grid-cols-5 gap-x-4 gap-y-2 p-3">
          <Field label="Datacenter" value={eq.destinationDatacenter} />
          <Field label="IP Telecom" value={eq.destinationIpTelecom} />
          <Field label="Ilha" value={eq.destinationIsland} />
          <Field label="Bastidor" value={eq.destinationRack} />
          <Field label="Posição" value={eq.destinationPosition} />
        </div>

        {/* Portas Ativas */}
        {eq.ports.length > 0 && (
          <>
            <SectionHeader>Portas Ativas</SectionHeader>
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-gray-300 text-left text-gray-500">
                  <th className="px-2 py-1 font-semibold">#</th>
                  <th className="px-2 py-1 font-semibold">Tipo</th>
                  <th className="px-2 py-1 font-semibold">Etiqueta Origem</th>
                  <th className="px-2 py-1 font-semibold">Porta/Etiqueta Destino</th>
                  <th className="px-2 py-1 font-semibold">Patch Panel Origem</th>
                  <th className="px-2 py-1 font-semibold">Patch Panel Destino</th>
                </tr>
              </thead>
              <tbody>
                {eq.ports.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100">
                    <td className="px-2 py-1 text-gray-400">{p.order}</td>
                    <td className="px-2 py-1">{p.portType ? PORT_TYPE_LABELS[p.portType] : "—"}</td>
                    <td className="px-2 py-1">{p.etiquetaOrigem || "—"}</td>
                    <td className="px-2 py-1">{p.portaEtiquetaDestino || "—"}</td>
                    <td className="px-2 py-1">{p.patchPanelOrigem || "—"}</td>
                    <td className="px-2 py-1">{p.patchPanelDestino || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
