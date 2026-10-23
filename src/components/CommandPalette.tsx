import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  Boxes,
  Building2,
  CornerDownLeft,
  FolderKanban,
  LayoutDashboard,
  Package,
  Printer,
  Search,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { api } from "../api";
import type { SearchResult } from "../types";
import { formatCompact, formatNumber } from "../lib/format";
import { t } from "../i18n";

const navItems = [
  { title: t("Overview"), subtitle: t("Production and finance dashboard"), path: "/", icon: LayoutDashboard },
  { title: t("Money"), subtitle: t("Income and expense ledger"), path: "/money", icon: Wallet },
  { title: t("Orders"), subtitle: t("Signage production board"), path: "/orders", icon: FolderKanban },
  { title: t("Products"), subtitle: t("Product and equipment catalog"), path: "/products", icon: Package },
  { title: t("Materials"), subtitle: t("Stock, usage and replenishment"), path: "/materials", icon: Boxes },
  { title: t("Team"), subtitle: t("Worker profiles and payroll"), path: "/team", icon: Users },
  { title: t("Clients"), subtitle: t("Brand accounts and contacts"), path: "/clients", icon: Building2 },
  { title: t("AI agent"), subtitle: t("Live business assistant"), path: "/agent", icon: Sparkles },
];

const resultIcons: Record<SearchResult["type"], typeof Wallet> = {
  transaction: ArrowLeftRight,
  order: FolderKanban,
  material: Boxes,
  worker: Users,
  client: Building2,
  product: Package,
  tool: Printer,
};

const resultLabels: Record<SearchResult["type"], string> = {
  order: t("Orders"),
  client: t("Clients"),
  worker: t("Team"),
  material: t("Materials"),
  transaction: t("Ledger entries"),
  product: t("Products"),
  tool: t("Tools & equipment"),
};

// Build the result subtitle from structured fields so it follows the chosen language.
function subtitleFor(result: SearchResult): string {
  switch (result.type) {
    case "transaction":
      if (!result.txType) break;
      return [result.txType === "income" ? t("Money in") : t("Money out"), result.category && t(result.category)]
        .filter(Boolean)
        .join(" · ");
    case "order":
      if (!result.orderNumber) break;
      return [result.orderNumber, result.clientName ?? t("Internal"), result.status && t(result.status)]
        .filter(Boolean)
        .join(" · ");
    case "material":
      if (result.stock === undefined) break;
      return [
        t("{qty} {unit} in stock", { qty: formatNumber(result.stock, 1), unit: t(result.unit || "") }),
        result.low ? t("low stock") : "",
      ]
        .filter(Boolean)
        .join(" · ");
    case "worker":
      if (!result.role) break;
      return [t(result.role), result.department && t(result.department)].filter(Boolean).join(" · ");
    case "client":
      if (!result.industry) break;
      return [t(result.industry), result.contactName].filter(Boolean).join(" · ");
    case "product":
      if (!result.category) break;
      return [t(result.category), result.unit ? t(result.unit) : "", result.archived ? t("archived") : ""]
        .filter(Boolean)
        .join(" · ");
    case "tool":
      if (!result.kind) break;
      return [t(result.kind), result.archived ? t("archived") : ""].filter(Boolean).join(" · ");
  }
  return result.subtitle;
}

function targetFor(result: SearchResult) {
  if (result.type === "order") return `/orders?open=${result.id}`;
  if (result.type === "worker") return `/team?open=${result.id}`;
  if (result.type === "client") return `/clients?open=${result.id}`;
  if (result.type === "material") return `/materials?search=${encodeURIComponent(result.title)}`;
  if (result.type === "product") return `/products?tab=products&search=${encodeURIComponent(result.title)}`;
  if (result.type === "tool") return `/products?tab=tools&search=${encodeURIComponent(result.title)}`;
  return `/money?search=${encodeURIComponent(result.title)}`;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const deferredQuery = useMemo(() => query.trim(), [query]);
  const { data, isFetching } = useQuery({
    queryKey: ["search", deferredQuery],
    queryFn: () => api.search(deferredQuery),
    enabled: open && deferredQuery.length >= 2,
    staleTime: 20_000,
  });

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", handleKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const results = data?.results || [];
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, result) => {
    acc[result.type] = [...(acc[result.type] || []), result];
    return acc;
  }, {});

  const go = (path: string) => {
    navigate(path);
    onClose();
  };

  return createPortal(
    <div
      className="overlay command-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="command-box" role="dialog" aria-modal="true" aria-label={t("Search ZD REKLAMA")}>
        <div className="command-input-wrap">
          <Search size={17} />
          <input
            className="command-input"
            autoFocus
            placeholder={t("Search products, tools, orders, clients…")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <span className="kbd">{t("ESC")}</span>
        </div>
        <div className="command-results">
          {deferredQuery.length < 2 ? (
            <>
              <div className="command-group-label">{t("Go to")}</div>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button className="command-item" key={item.path} onClick={() => go(item.path)}>
                    <span className="command-icon">
                      <Icon />
                    </span>
                    <span className="command-main">
                      <span className="command-title">{item.title}</span>
                      <span className="command-subtitle">{item.subtitle}</span>
                    </span>
                    <CornerDownLeft size={13} color="var(--color-muted-light)" />
                  </button>
                );
              })}
            </>
          ) : isFetching && !results.length ? (
            <div className="command-empty">{t("Searching the whole operation…")}</div>
          ) : !results.length ? (
            <div className="command-empty">
              {t("No matches for “{query}”. Try a client, order or material.", { query: deferredQuery })}
            </div>
          ) : (
            Object.entries(grouped).map(([type, items]) => {
              const Icon = resultIcons[type as SearchResult["type"]];
              return (
                <div key={type}>
                  <div className="command-group-label">{resultLabels[type as SearchResult["type"]]}</div>
                  {items.map((result) => (
                    <button className="command-item" key={`${result.type}-${result.id}`} onClick={() => go(targetFor(result))}>
                      <span className="command-icon">
                        <Icon />
                      </span>
                      <span className="command-main">
                        <span className="command-title">{result.title}</span>
                        <span className="command-subtitle">{subtitleFor(result)}</span>
                      </span>
                      {result.meta !== undefined && (
                        <span className="command-meta">{t("UZS {amount}", { amount: formatCompact(result.meta, 1) })}</span>
                      )}
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>
        <div className="command-footer">
          <span>{t("Search across the full platform")}</span>
          <span className="mono">⌘ K</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
