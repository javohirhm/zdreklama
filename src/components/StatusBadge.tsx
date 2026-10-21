import { statusLabel } from "../lib/format";

export function StatusBadge({
  status,
  className = "",
}: {
  status: string;
  className?: string;
}) {
  return (
    <span className={`badge badge-${status} ${className}`}>
      <span className="status-dot" />
      {statusLabel(status)}
    </span>
  );
}
