"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { UserDTO, CheckpointDTO, Role } from "@/lib/types";
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/permissions";

const EMPTY_FORM = { name: "", email: "", password: "", role: "VALIDATOR" as Role, validatorCheckpointIds: [] as string[] };

export default function UsersPage() {
  const { data: session } = useSession();
  const [users, setUsers] = useState<UserDTO[]>([]);
  const [checkpoints, setCheckpoints] = useState<CheckpointDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [usersRes, cpRes] = await Promise.all([
      fetch("/api/users", { cache: "no-store" }),
      fetch("/api/checkpoints", { cache: "no-store" }),
    ]);
    if (usersRes.ok) setUsers(await usersRes.json());
    if (cpRes.ok) setCheckpoints(await cpRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormOpen(true);
    setError(null);
  }

  function startEdit(u: UserDTO) {
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role,
      validatorCheckpointIds: u.validatorCheckpoints.map((c) => c.id),
    });
    setEditingId(u.id);
    setFormOpen(true);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = {
      name: form.name,
      email: form.email,
      role: form.role,
      validatorCheckpointIds: form.role === "VALIDATOR" ? form.validatorCheckpointIds : [],
    };
    if (form.password) payload.password = form.password;

    const res = await fetch(editingId ? `/api/users/${editingId}` : "/api/users", {
      method: editingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Erro ao guardar utilizador.");
      return;
    }
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormOpen(false);
    load();
  }

  async function handleDelete(u: UserDTO) {
    if (!confirm(`Eliminar o utilizador "${u.name}"?`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error ?? "Não foi possível eliminar.");
      return;
    }
    load();
  }

  function toggleCheckpoint(id: string) {
    setForm((f) => ({
      ...f,
      validatorCheckpointIds: f.validatorCheckpointIds.includes(id)
        ? f.validatorCheckpointIds.filter((c) => c !== id)
        : [...f.validatorCheckpointIds, id],
    }));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Utilizadores</h1>
          <p className="text-sm text-gray-500">
            Gestão de contas, roles e checkpoints associados a Validadores.
          </p>
        </div>
        <button
          onClick={() => (formOpen ? setFormOpen(false) : startCreate())}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          {formOpen ? "Cancelar" : "+ Novo Utilizador"}
        </button>
      </div>

      {formOpen && (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Nome *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Email *</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Password {editingId ? "(deixar em branco para manter)" : "*"}
              </label>
              <input
                required={!editingId}
                type="password"
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="mín. 8 caracteres"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Role *</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-400">{ROLE_DESCRIPTIONS[form.role]}</p>
            </div>
          </div>

          {form.role === "VALIDATOR" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">
                Checkpoints que pode assumir *
              </label>
              <div className="flex flex-wrap gap-2">
                {checkpoints.map((cp) => {
                  const checked = form.validatorCheckpointIds.includes(cp.id);
                  return (
                    <button
                      type="button"
                      key={cp.id}
                      onClick={() => toggleCheckpoint(cp.id)}
                      className={`rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition-colors ${
                        checked
                          ? "bg-brand-600 text-white ring-brand-600"
                          : "bg-white text-gray-600 ring-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {cp.order}. {cp.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? "A guardar…" : editingId ? "Guardar Alterações" : "Criar Utilizador"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">A carregar…</div>
      ) : (
        <ul className="space-y-2">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{u.name}</p>
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                    {ROLE_LABELS[u.role]}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{u.email}</p>
                {u.role === "VALIDATOR" && (
                  <p className="mt-1 text-xs text-gray-400">
                    Checkpoints:{" "}
                    {u.validatorCheckpoints.length > 0
                      ? u.validatorCheckpoints.map((c) => c.name).join(", ")
                      : "nenhum associado"}
                  </p>
                )}
              </div>
              <div className="flex gap-3 text-xs font-medium">
                <button onClick={() => startEdit(u)} className="text-brand-600 hover:underline">
                  Editar
                </button>
                {session?.user.id !== u.id && (
                  <button onClick={() => handleDelete(u)} className="text-red-600 hover:underline">
                    Eliminar
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
