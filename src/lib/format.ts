import { lang, t } from "../i18n";

// Numbers: "1,234" in English, "1 234" in Uzbek/Russian.
const numberLocale = lang === "en" ? "en-US" : "ru-RU";

const MONTHS: Record<string, { long: string[]; short: string[] }> = {
  uz: {
    long: ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"],
    short: ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"],
  },
  ru: {
    long: ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"],
    short: ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
  },
};
const RU_GENITIVE = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const WEEKDAYS: Record<string, string[]> = {
  uz: ["yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba"],
  ru: ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"],
};
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Month name (0-based month). */
export function monthName(month: number, style: "long" | "short" = "long"): string {
  if (lang === "en") return new Date(2000, month, 1).toLocaleDateString("en-US", { month: style });
  return cap(MONTHS[lang][style][month]);
}

/** "Wednesday, 22 Oct" style label for today in the topbar. */
export function formatToday(date = new Date()): string {
  if (lang === "en") return date.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "short" });
  const day = cap(WEEKDAYS[lang][date.getDay()]);
  return lang === "ru"
    ? `${day}, ${date.getDate()} ${RU_GENITIVE[date.getMonth()]}`
    : `${day}, ${date.getDate()}-${MONTHS.uz.long[date.getMonth()]}`;
}

function dateParts(date: Date, style: "long" | "short" | "month"): string {
  const d = date.getDate();
  const m = date.getMonth();
  const y = date.getFullYear();
  if (lang === "en") {
    if (style === "long") return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    if (style === "month") return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  if (style === "month") return `${monthName(m)} ${y}`;
  if (lang === "ru") {
    return style === "long" ? `${d} ${RU_GENITIVE[m]} ${y}` : `${d} ${MONTHS.ru.short[m]} ${y}`;
  }
  return style === "long" ? `${d}-${MONTHS.uz.long[m]}, ${y}` : `${d}-${MONTHS.uz.short[m]}, ${y}`;
}

export function formatMoney(value: number, withCurrency = true): string {
  const formatted = new Intl.NumberFormat(numberLocale, { maximumFractionDigits: 0 }).format(Math.round(value || 0));
  if (!withCurrency) return formatted;
  if (lang === "uz") return `${formatted} so'm`;
  if (lang === "ru") return `${formatted} сум`;
  return `UZS ${formatted}`;
}

export function formatCompact(value: number, digits = 1): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    const n = value / 1_000_000_000;
    return `${n.toFixed(n >= 10 ? 1 : 2).replace(/\.0+$/, "")}${t("B")}`;
  }
  if (abs >= 1_000_000) {
    const n = value / 1_000_000;
    return `${n.toFixed(n >= 100 ? 0 : digits).replace(/\.0+$/, "")}${t("M")}`;
  }
  if (abs >= 1_000) {
    const n = value / 1_000;
    return `${n.toFixed(0)}${t("K")}`;
  }
  return new Intl.NumberFormat(numberLocale).format(Math.round(value));
}

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat(numberLocale, { maximumFractionDigits: digits }).format(value || 0);
}

export function formatDate(value: string | null | undefined, style: "long" | "short" | "month" = "short"): string {
  if (!value) return "—";
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateParts(date, style);
}

export function formatDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return t("Dates not set");
  if (!start) return t("Until {date}", { date: formatDate(end) });
  if (!end) return t("From {date}", { date: formatDate(start) });
  return `${formatDate(start)} — ${formatDate(end)}`;
}

export function monthKey(value: string): string {
  const [year, month] = value.split("-").map(Number);
  return `${monthName(month - 1)} ${year}`;
}

export function monthShort(value: string): string {
  const [year, month] = value.split("-").map(Number);
  return `${monthName(month - 1, "short")} ${year}`;
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
  if (diff <= 0) return t("Today");
  if (diff === 1) return t("Yesterday");
  if (diff < 7) return t("{n} days ago", { n: diff });
  return formatDate(value);
}

export function signedPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function statusLabel(status: string): string {
  const translated = t(status);
  if (translated !== status) return translated;
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
