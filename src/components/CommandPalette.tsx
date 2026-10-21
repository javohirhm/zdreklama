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
  Search,
  Users,
  Wallet,
} from "lucide-react";
import { api } from "../api";
import type { SearchResult } from "../types";
import { formatCompact } from "../lib/format";

const navItems = [
  { title: "Overview", subtitle: "Production and finance dashboard", path: "/", icon: LayoutDashboard },
  { title: "Money", subtitle: "Income and expense ledger", path: "/money", icon: Wallet },
  { title: "Orders", subtitle: "Signage production board", path: "/orders", icon: FolderKanban },
  { title: "Materials", subtitle: "Stock, usage and replenishment", path: "/materials", icon: Boxes },
  { title: "Team", subtitle: "Worker profiles and payroll", path: "/team", icon: Users },
  { title: "Clients", subtitle: "Brand accounts and contacts", path: "/clients", icon: Building2 },
];

const resultIcons: Record<SearchResult["type"], typeof Wallet> = {
  transaction: ArrowLeftRight,
  order: FolderKanban,
  material: Boxes,
  worker: Users,
  client: Building2,
};

const resultLabels: Record<SearchResult["type"], string> = {
  order: "Orders",
  client: "Clients",
  worker: "Team",
  material: "Materials",
  transaction: "Ledger entries",
};

function targetFor(result: SearchResult) {
  if (result.type === "order") return `/orders?open=${result.id}`;
  if (result.type === "worker") return `/team?open=${result.id}`;
  if (result.type === "client") return `/clients?open=${result.id}`;
  if (result.type === "material") return `/materials?search=${encodeURIComponent(result.title)}`;
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
      <div className="command-box" role="dialog" aria-modal="true" aria-label="Search ZD REKLAMA">
        <div className="command-input-wrap">
          <Search size={17} />
          <input
            className="command-input"
            autoFocus
            placeholder="Search orders, clients, materials, people…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <span className="kbd">ESC</span>
        </div>
        <div className="command-results">
          {deferredQuery.length < 2 ? (
            <>
              <div className="command-group-label">Go to</div>
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
            <div className="command-empty">Searching the whole operation…</div>
          ) : !results.length ? (
            <div className="command-empty">No matches for “{deferredQuery}”. Try a client, order or material.</div>
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
                        <span className="command-subtitle">{result.subtitle}</span>
                      </span>
                      {result.meta !== undefined && (
                        <span className="command-meta">UZS {formatCompact(result.meta, 1)}</span>
                      )}
                    </button>
                  ))}
                </div>
              );
            })
          )}
        </div>
        <div className="command-footer">
          <span>Search across the full platform</span>
          <span className="mono">⌘ K</span>
        </div>
      </div>
    </div>,
    document.body
  );
}
