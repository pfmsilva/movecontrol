"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import type { EquipmentDTO, PortType } from "@/lib/types";
import { PORT_TYPE_LABELS } from "@/lib/types";
import { canManageEquipment } from "@/lib/permissions";
import { cx } from "@/lib/utils";

interface PortDraft {
  portType: PortType | "";
  etiquetaOrigem: string;
  portaEtiquetaDestino: string;
  patchPanelOrigem: string;
  patchPanelDestino: string;
}

const EMPTY_PORT: PortDraft = {
  portType: "",
  etiquetaOrigem: "",
  portaEtiquetaDestino: "",
  patchPanelOrigem: "",
  patchPanelDestino: "",
};

function toDraftPorts(equipment: EquipmentDTO): PortDraft[] {
  return equipment.ports.map((p) => ({
    portType: p.portType ?? "",
    etiquetaOrigem: p.etiquetaOrigem ?? "",
    portaEtiquetaDestino: p.portaEtiquetaDestino ?? "",
    patchPanelOrigem: p.patchPanelOrigem ?? "",
    patchPanelDestino: p.patchPanelDestino ?? "",
  }));
}

function toDraftFields(equipment: EquipmentDTO) {
  return {
    model: equipment.model ?? "",
    serialNumber: equipment.serialNumber ?? "",
    notes: equipment.notes ?? "",
    wave: equipment.wave ?? "",
    equipmentType: equipment.equipmentType ?? "",
    manufacturer: equipment.manufacturer ?? "",
    assetTag: equipment.assetTag ?? "",
    kvm: equipment.kvm ?? "",
    powerCables: equipment.powerCables ?? "",
    specialCables: equipment.specialCables ?? "",
    arms: equipment.arms ?? "",
    powerLocation: equipment.powerLocation ?? "",
    cableConnection: equipment.cableConnection ?? "",
    rails: equipment.rails ?? "",
    originDatacenter: equipment.originDatacenter ?? "",
    originEp: equipment.originEp ?? "",
    originIsland: equipment.originIsland ?? "",
    originRack: equipment.originRack ?? "",
    originPosition: equipment.originPosition ?? "",
    destinationDatacenter: equipment.destinationDatacenter ?? "",
    destinationIpTelecom: equipment.destinationIpTelecom ?? "",
    destinationIsland: equipment.destinationIsland ?? "",
    destinationRack: equipment.destinationRack ?? "",
    destinationPosition: equipment.destinationPosition ?? "",
  };
}

type FormFields = ReturnType<typeof toDraftFields>;

const FIELD_SECTIONS: { title: string; fields: { key: keyof FormFields; label: string }[] }[] = [
  {
    title: "Dados do Equipamento",
    fields: [
      { key: "equipmentType", label: "Tipo Equipamento" },
      { key: "manufacturer", label: "Fabricante" },
      { key: "model", label: "Modelo" },
      { key: "assetTag", label: "Etiqueta" },
      { key: "serialNumber", label: "Serial Number" },
      { key: "kvm", label: "KVM" },
      { key: "powerCables", label: "Cabos Power" },
      { key: "specialCables", label: "Cabos Especiais" },
      { key: "arms", label: "Braços" },
      { key: "powerLocation", label: "Localização Power" },
      { key: "cableConnection", label: "Ligação Cabos" },
      { key: "rails", label: "Calhas" },
    ],
  },
  {
    title: "Localização de Origem",
    fields: [
      { key: "originDatacenter", label: "Datacenter" },
      { key: "originEp", label: "EP" },
      { key: "originIsland", label: "Ilha" },
      { key: "originRack", label: "Bastidor" },
      { key: "originPosition", label: "Posição" },
    ],
  },
  {
    title: "Localização de Destino",
    fields: [
      { key: "destinationDatacenter", label: "Datacenter" },
      { key: "destinationIpTelecom", label: "IP Telecom" },
      { key: "destinationIsland", label: "Ilha" },
      { key: "destinationRack", label: "Bastidor" },
      { key: "destinationPosition", label: "Posição" },
    ],
  },
];

export default function EquipmentFichaCard({ equipment }: { equipment: EquipmentDTO }) {
  const { data: session } = useSession();
  const canManage = canManageEquipment(session?.user.role);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormFields>(() => toDraftFields(equipment));
  const [ports, setPorts] = useState<PortDraft[]>(() => toDraftPorts(equipment));

  function startEdit() {
    setForm(toDraftFields(equipment));
    setPorts(toDraftPorts(equipment));
    setError(null);
    setEditing(true);
  }

  function updateField(key: keyof FormFields, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updatePort(index: number, patch: Partial<PortDraft>) {
    setPorts((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function addPort() {
    setPorts((prev) => [...prev, { ...EMPTY_PORT }]);
  }

  function removePort(index: number) {
    setPorts((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const payload = {
      ...form,
      wave: form.wave,
      ports: ports
        .filter((p) => Object.values(p).some((v) => v.trim() !== ""))
        .map((p) => ({ ...p, portType: p.portType || null })),
    };
    const res = await fetch(`/api/equipment/${encodeURIComponent(equipment.hostname)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Não foi possível guardar a ficha.");
      return;
    }
    // Navegação completa (não router.refresh()) de propósito: o mesmo problema
    // de cache do App Router que afetava a Navbar pós-login também acontece
    // aqui — sem isto, a vista de leitura ficava com os dados antigos até um
    // reload manual, mesmo com a gravação já confirmada no servidor.
    window.location.reload();
  }

  const filledSections = FIELD_SECTIONS.map((section) => ({
    ...section,
    fields: section.fields.filter(({ key }) => (equipment[key] as string | null) ?? "").length,
  }));
  const hasAnyFichaData = filledSections.some((s) => s.fields > 0) || equipment.ports.length > 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900">Ficha de Equipamento</h2>
        {canManage && !editing && (
          <button onClick={startEdit} className="text-xs font-medium text-brand-600 hover:underline">
            {hasAnyFichaData ? "Editar Ficha" : "+ Preencher Ficha"}
          </button>
        )}
      </div>

      {!editing ? (
        <ReadOnlyFicha equipment={equipment} hasAnyFichaData={hasAnyFichaData} />
      ) : (
        <div className="mt-4 space-y-6">
          {FIELD_SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{section.title}</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                {section.fields.map(({ key, label }) => (
                  <div key={key}>
                    <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
                    <input
                      value={form[key]}
                      onChange={(e) => updateField(key, e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">Portas Ativas</h3>
              <button
                type="button"
                onClick={addPort}
                className="text-xs font-medium text-brand-600 hover:underline"
              >
                + Adicionar Porta
              </button>
            </div>
            {ports.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhuma porta adicionada.</p>
            ) : (
              <div className="scroll-thin space-y-2 overflow-x-auto">
                {ports.map((port, i) => (
                  <div key={i} className="grid min-w-[720px] grid-cols-12 items-center gap-2 rounded-lg border border-gray-200 p-2">
                    <span className="col-span-1 text-center text-xs text-gray-400">{i + 1}</span>
                    <select
                      value={port.portType}
                      onChange={(e) => updatePort(i, { portType: e.target.value as PortType | "" })}
                      className="col-span-2 rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                    >
                      <option value="">Tipo</option>
                      {(Object.keys(PORT_TYPE_LABELS) as PortType[]).map((t) => (
                        <option key={t} value={t}>
                          {PORT_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                    <input
                      value={port.etiquetaOrigem}
                      onChange={(e) => updatePort(i, { etiquetaOrigem: e.target.value })}
                      placeholder="Etiqueta Origem"
                      className="col-span-2 rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                    />
                    <input
                      value={port.portaEtiquetaDestino}
                      onChange={(e) => updatePort(i, { portaEtiquetaDestino: e.target.value })}
                      placeholder="Porta/Etiqueta Destino"
                      className="col-span-3 rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                    />
                    <input
                      value={port.patchPanelOrigem}
                      onChange={(e) => updatePort(i, { patchPanelOrigem: e.target.value })}
                      placeholder="Patch Panel Origem"
                      className="col-span-2 rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                    />
                    <input
                      value={port.patchPanelDestino}
                      onChange={(e) => updatePort(i, { patchPanelDestino: e.target.value })}
                      placeholder="Patch Panel Destino"
                      className="col-span-1 rounded-lg border border-gray-300 px-2 py-1.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => removePort(i)}
                      className="col-span-1 text-xs font-medium text-red-600 hover:underline"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? "A guardar…" : "Guardar Ficha"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReadOnlyFicha({ equipment, hasAnyFichaData }: { equipment: EquipmentDTO; hasAnyFichaData: boolean }) {
  if (!hasAnyFichaData) {
    return (
      <p className="mt-3 text-sm text-gray-400">
        Ainda não foi preenchida nenhuma informação da ficha para este equipamento.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-5">
      {FIELD_SECTIONS.map((section) => {
        const filled = section.fields.filter(({ key }) => (equipment[key] as string | null)?.trim());
        if (filled.length === 0) return null;
        return (
          <div key={section.title}>
            <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">{section.title}</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
              {filled.map(({ key, label }) => (
                <div key={key}>
                  <dt className="text-xs text-gray-400">{label}</dt>
                  <dd className="text-gray-700">{equipment[key] as string}</dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}

      {equipment.ports.length > 0 && (
        <div>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">Portas Ativas</h3>
          <div className="scroll-thin overflow-x-auto rounded-lg border border-gray-100">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50 text-left text-gray-500">
                <tr>
                  <th className="px-2 py-1.5">#</th>
                  <th className="px-2 py-1.5">Tipo</th>
                  <th className="px-2 py-1.5">Etiqueta Origem</th>
                  <th className="px-2 py-1.5">Porta/Etiqueta Destino</th>
                  <th className="px-2 py-1.5">Patch Panel Origem</th>
                  <th className="px-2 py-1.5">Patch Panel Destino</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {equipment.ports.map((p, i) => (
                  <tr key={p.id} className={cx(i % 2 === 1 && "bg-gray-50/50")}>
                    <td className="px-2 py-1.5 text-gray-400">{p.order}</td>
                    <td className="px-2 py-1.5">{p.portType ? PORT_TYPE_LABELS[p.portType] : "—"}</td>
                    <td className="px-2 py-1.5">{p.etiquetaOrigem ?? "—"}</td>
                    <td className="px-2 py-1.5">{p.portaEtiquetaDestino ?? "—"}</td>
                    <td className="px-2 py-1.5">{p.patchPanelOrigem ?? "—"}</td>
                    <td className="px-2 py-1.5">{p.patchPanelDestino ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
