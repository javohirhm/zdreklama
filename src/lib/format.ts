export function formatMoney(value: number, withCurrency = true): string {
  const formatted = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(value || 0));
  return withCurrency ? `UZS ${formatted}` : formatted;
}

export function formatCompact(value: number, digits = 1): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    const n = value / 1_000_000_000;
    return `${n.toFixed(n >= 10 ? 1 : 2).replace(/\.0+$/, "")}B`;
  }
  if (abs >= 1_000_000) {
    const n = value / 1_000_000;
    return `${n.toFixed(n >= 100 ? 0 : digits).replace(/\.0+$/, "")}M`;
  }
  if (abs >= 1_000) {
    const n = value / 1_000;
    return `${n.toFixed(0)}K`;
  }
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(value || 0);
}

export function formatDate(value: string | null | undefined, style: "long" | "short" | "month" = "short"): string {
  if (!value) return "—";
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return "—";
  if (style === "long") {
    return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }
  if (style === "month") {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "Dates not set";
  if (!start) return `Until ${formatDate(end)}`;
  if (!end) return `From ${formatDate(start)}`;
  return `${formatDate(start)} — ${formatDate(end)}`;
}

export function monthKey(value: string): string {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function monthShort(value: string): string {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function todayIso(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function relativeDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 86_400_000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return `${diff} days ago`;
  return formatDate(value);
}

export function signedPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function statusLabel(status: string): string {
  return status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function downloadCsv(filename: string, rows: Array<Record<string, string | number | null>>) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number | null) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
