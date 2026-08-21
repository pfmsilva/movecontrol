import { STATUS_COLORS, STATUS_LABELS, type EquipmentStatus } from "@/lib/types";
import { cx } from "@/lib/utils";

export default function StatusBadge({ status }: { status: EquipmentStatus }) {
  return (
    <span
      className={cx(
        "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        STATUS_COLORS[status]
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
