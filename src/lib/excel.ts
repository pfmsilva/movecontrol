import ExcelJS from "exceljs";
import type { EquipmentDTO } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export interface ImportRow {
  rowNumber: number;
  hostname: string;
  model: string | null;
  serialNumber: string | null;
  notes: string | null;
}

export interface ImportRowError {
  rowNumber: number;
  message: string;
}

/** Cabeçalhos usados tanto no template como na exportação — fonte única de verdade. */
const IMPORT_HEADERS = {
  hostname: "Hostname (ID Único)",
  model: "Modelo",
  serialNumber: "Número de Série",
  notes: "Notas",
} as const;

/** Normaliza texto para comparar cabeçalhos sem depender de acentos/maiúsculas/espaços. */
function normalize(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

const HEADER_ALIASES: Record<string, keyof typeof IMPORT_HEADERS> = {
  [normalize(IMPORT_HEADERS.hostname)]: "hostname",
  hostname: "hostname",
  nomehostname: "hostname",
  [normalize(IMPORT_HEADERS.model)]: "model",
  [normalize(IMPORT_HEADERS.serialNumber)]: "serialNumber",
  nserie: "serialNumber",
  serialnumber: "serialNumber",
  numerodeserie: "serialNumber",
  [normalize(IMPORT_HEADERS.notes)]: "notes",
};

function baseColumns() {
  return [
    { header: IMPORT_HEADERS.hostname, key: "hostname", width: 28 },
    { header: IMPORT_HEADERS.model, key: "model", width: 26 },
    { header: IMPORT_HEADERS.serialNumber, key: "serialNumber", width: 20 },
    { header: IMPORT_HEADERS.notes, key: "notes", width: 36 },
  ];
}

/** Gera o template de importação (.xlsx): cabeçalho + 1 linha de exemplo pré-preenchida. */
export async function buildImportTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Equipamentos");
  sheet.columns = baseColumns();
  sheet.getRow(1).font = { bold: true };

  sheet.addRow({
    hostname: "SRV-EXEMPLO-001",
    model: "Dell PowerEdge R740",
    serialNumber: "SN-000000",
    notes: "Linha de exemplo — substitui pelos teus dados ou apaga esta linha antes de importar.",
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/** Gera a exportação (.xlsx) com todos os campos de cada equipamento. */
export async function buildEquipmentExport(equipment: EquipmentDTO[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Equipamentos");
  sheet.columns = [
    ...baseColumns(),
    { header: "Estado", key: "status", width: 16 },
    { header: "Checkpoint Atual", key: "checkpoint", width: 28 },
    { header: "Responsável (Último Scan)", key: "user", width: 22 },
    { header: "Última Atualização", key: "lastScan", width: 20 },
    { header: "Criado em", key: "createdAt", width: 20 },
    { header: "Atualizado em", key: "updatedAt", width: 20 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const eq of equipment) {
    sheet.addRow({
      hostname: eq.hostname,
      model: eq.model ?? "",
      serialNumber: eq.serialNumber ?? "",
      notes: eq.notes ?? "",
      status: STATUS_LABELS[eq.status],
      checkpoint: eq.currentCheckpoint?.name ?? "",
      user: eq.lastScan?.user.name ?? "",
      lastScan: eq.lastScan ? formatDateTime(eq.lastScan.timestamp) : "",
      createdAt: formatDateTime(eq.createdAt),
      updatedAt: formatDateTime(eq.updatedAt),
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

function cellText(row: ExcelJS.Row, col: number | undefined): string {
  if (!col) return "";
  const v = row.getCell(col).value;
  if (v == null) return "";
  if (typeof v === "object" && "text" in (v as unknown as Record<string, unknown>)) {
    return String((v as unknown as { text: unknown }).text ?? "").trim();
  }
  if (typeof v === "object" && "richText" in (v as unknown as Record<string, unknown>)) {
    const parts = (v as unknown as { richText: { text: string }[] }).richText;
    return parts.map((p) => p.text).join("").trim();
  }
  return String(v).trim();
}

/** Lê um ficheiro .xlsx de importação e devolve as linhas válidas + erros encontrados. */
export async function parseEquipmentImport(
  fileBuffer: ArrayBuffer | Buffer
): Promise<{ rows: ImportRow[]; errors: ImportRowError[] }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer as ArrayBuffer);
  const sheet = workbook.worksheets[0];

  const rows: ImportRow[] = [];
  const errors: ImportRowError[] = [];

  if (!sheet) {
    errors.push({ rowNumber: 0, message: "O ficheiro não tem nenhuma folha de cálculo." });
    return { rows, errors };
  }

  const colIndexByField = new Map<string, number>();
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const field = HEADER_ALIASES[normalize(cell.value)];
    if (field) colIndexByField.set(field, colNumber);
  });

  if (!colIndexByField.has("hostname")) {
    errors.push({
      rowNumber: 1,
      message: `Não encontrei a coluna "${IMPORT_HEADERS.hostname}" no cabeçalho. Usa o template de importação sem alterar os nomes das colunas.`,
    });
    return { rows, errors };
  }

  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return; // cabeçalho
    const hostname = cellText(row, colIndexByField.get("hostname"));
    if (!hostname) return; // linha em branco, ignora silenciosamente

    rows.push({
      rowNumber,
      hostname,
      model: cellText(row, colIndexByField.get("model")) || null,
      serialNumber: cellText(row, colIndexByField.get("serialNumber")) || null,
      notes: cellText(row, colIndexByField.get("notes")) || null,
    });
  });

  return { rows, errors };
}
