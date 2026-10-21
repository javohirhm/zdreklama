import { initials } from "../lib/format";

export function Avatar({
  name,
  color = "#2f6b4f",
  size = 36,
  className = "",
}: {
  name: string;
  color?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`avatar ${className}`}
      style={{
        width: size,
        height: size,
        minWidth: size,
        background: color,
        fontSize: Math.max(7, size * 0.29),
      }}
      aria-hidden="true"
      title={name}
    >
      {initials(name)}
    </span>
  );
}
