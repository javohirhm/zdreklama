import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Boxes,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  TrendingDown,
  X,
} from "lucide-react";
import { api } from "../api";
import type { Material } from "../types";
import { PageHeader } from "../components/Logo";
import { MaterialSheet } from "../components/MaterialSheet";
import { MovementSheet } from "../components/MovementSheet";
import { EmptyState } from "../components/EmptyState";
import {
  formatCompact,
  formatDate,
  formatMoney,
  formatNumber,
  pluralize,
  relativeDate,
} from "../lib/format";

export function MaterialsPage() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState("all");
  const [lowOnly, setLowOnly] = useState(false);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [movement, setMovement] = useState<{ material: Material | null; mode: "in" | "out" } | null>(null);

  useEffect(() => {
    const nextSearch = searchParams.get("search") || "";
    if (nextSearch) setSearch(nextSearch);
  }, [searchParams]);

  const { data, isLoading } = useQuery({ queryKey: ["materials"], queryFn: api.materials });
  const materials = data?.materials || [];
  const movements = data?.movements || [];
  const summary = data?.summary;

  const categories = useMemo(() => [...new Set(materials.map((material) => material.category))].sort(), [materials]);
  const lowItems = materials.filter((material) => material.lowStock);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return materials.filter((material) => {
      const matchesCategory = category === "all" || material.category === category;
      const matchesLow = !lowOnly || material.lowStock;
      const matchesSearch =
        !query ||
        material.name.toLowerCase().includes(query) ||
        material.category.toLowerCase().includes(query) ||
        (material.supplier || "").toLowerCase().includes(query) ||
        (material.location || "").toLowerCase().includes(query);
      return matchesCategory && matchesLow && matchesSearch;
    });
  }, [materials, category, lowOnly, search]);

  const openNew = () => {
    setEditing(null);
    setMaterialOpen(true);
  };

  const openEdit = (material: Material) => {
    setEditing(material);
    setMaterialOpen(true);
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("all");
    setLowOnly(false);
  };

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            Production <span style={{ color: "var(--color-line-strong)" }}>/</span> Inventory
          </>
        }
        title={
          <>
            The <em>supply room.</em>
          </>
        }
        subtitle="Vinyl, ink, LEDs, acrylic and hardware — know what is in stock, what the crew used, and when to reorder before an order slows down."
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={() => setMovement({ material: null, mode: "in" })}>
              <PackagePlus size={14} /> Receive stock
            </button>
            <button type="button" className="btn btn-amber" onClick={openNew}>
              <Plus size={15} /> New material
            </button>
          </>
        }
      />

      <section className="summary-strip animate-up" style={{ animationDelay: "50ms" }}>
        <div className="summary-block">
          <span className="micro-label">Stock value</span>
          <strong>
            {formatCompact(summary?.totalValue || 0)} <span>UZS</span>
          </strong>
          <div className="summary-note">{summary?.itemCount || 0} tracked materials</div>
        </div>
        <div className="summary-block">
          <span className="micro-label">Low stock</span>
          <strong style={{ color: summary?.lowCount ? "var(--color-negative)" : "var(--color-positive)" }}>
            {summary?.lowCount || 0} <span>ITEMS</span>
          </strong>
          <div className="summary-note">At or below reorder level</div>
        </div>
        <div className="summary-block">
          <span className="micro-label">Used this month</span>
          <strong>
            {formatCompact(summary?.consumedThisMonth || 0)} <span>UZS</span>
          </strong>
          <div className="summary-note">{summary?.usageCount || 0} usage movements</div>
        </div>
        <div className="summary-block">
          <span className="micro-label">Received this month</span>
          <strong>
            {formatCompact(summary?.receivedThisMonth || 0)} <span>UZS</span>
          </strong>
          <div className="summary-note">{summary?.receivedCount || 0} stock deliveries</div>
        </div>
      </section>

      {lowItems.length > 0 && (
        <div className="material-alert animate-up" style={{ animationDelay: "70ms" }}>
          <div className="material-alert-icon">
            <AlertTriangle size={15} />
          </div>
          <div style={{ flex: 1 }}>
            <strong>{pluralize(lowItems.length, "material")} below reorder level</strong>
            <p>
              {lowItems.slice(0, 3).map((material) => material.name).join(" · ")}
              {lowItems.length > 3 ? ` · +${lowItems.length - 3} more` : ""}
            </p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setLowOnly(true);
              setCategory("all");
              setSearch("");
            }}
          >
            Show low stock
          </button>
        </div>
      )}

      <section className="card animate-up" style={{ animationDelay: "90ms" }}>
        <div className="toolbar">
          <div className="search-box">
            <Search />
            <input
              className="input"
              placeholder="Search material, supplier or store location…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search materials"
            />
          </div>
          <select className="select" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">
            <option value="all">All categories</option>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <button
            type="button"
            className={`chip-option ${lowOnly ? "selected" : ""}`}
            style={{ height: 34, padding: "0 11px" }}
            onClick={() => setLowOnly((current) => !current)}
          >
            <TrendingDown size={12} /> Low stock only
          </button>
          {(search || category !== "all" || lowOnly) && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
              <X size={13} /> Clear
            </button>
          )}
        </div>

        {isLoading ? (
          <div style={{ padding: 20 }}>
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div className="skeleton" key={item} style={{ height: 44, marginBottom: 8 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Boxes size={20} />}
            title="No materials in this view"
            description="Try clearing the filters, or add a new material to start tracking stock."
            action={
              <button type="button" className="btn btn-primary" onClick={openNew}>
                <Plus size={14} /> New material
              </button>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Material</th>
                  <th>Category</th>
                  <th>Stock level</th>
                  <th>Unit cost</th>
                  <th>Value</th>
                  <th>Last movement</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((material) => {
                  const ratio = material.minStock ? Math.min(100, (material.stock / (material.minStock * 2)) * 100) : 100;
                  const barClass = material.stock < material.minStock * 0.5 ? "danger" : material.lowStock ? "warn" : "";
                  return (
                    <tr key={material.id} className={material.lowStock ? "material-low-row" : ""}>
                      <td>
                        <div className="material-name-cell">
                          <span className="material-glyph">
                            <Boxes />
                          </span>
                          <div>
                            <div className="cell-main">{material.name}</div>
                            <div className="cell-sub">
                              {material.supplier || "No supplier"} · {material.location || "No location"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-neutral">{material.category}</span>
                      </td>
                      <td>
                        <div className="stock-cell">
                          <div className="stock-cell-head">
                            <strong>
                              {formatNumber(material.stock, 1)} {material.unit}
                            </strong>
                            <span>min {formatNumber(material.minStock, 1)}</span>
                          </div>
                          <div className="progress-track">
                            <div className={`progress-fill ${barClass}`} style={{ width: `${ratio}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="mono" style={{ fontSize: 9.5, color: "var(--color-muted)" }}>
                        {formatMoney(material.unitCost, false)}
                      </td>
                      <td className="mono" style={{ fontSize: 9.5 }}>
                        {formatCompact(material.value)}
                      </td>
                      <td>
                        <div className="cell-main" style={{ fontWeight: 600 }}>
                          {relativeDate(material.lastMovement)}
                        </div>
                        <div className="cell-sub">{material.movementCount} movements</div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setMovement({ material, mode: "out" })}
                          >
                            <ArrowUpRight size={12} /> Use
                          </button>
                          <button
                            type="button"
                            className="mini-icon-btn"
                            onClick={() => setMovement({ material, mode: "in" })}
                            aria-label={`Receive ${material.name}`}
                            title="Receive stock"
                          >
                            <ArrowDownLeft size={14} />
                          </button>
                          <button
                            type="button"
                            className="mini-icon-btn"
                            onClick={() => openEdit(material)}
                            aria-label={`Edit ${material.name}`}
                            title="Edit material"
                          >
                            <Pencil size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card animate-up" style={{ animationDelay: "120ms", marginTop: 13 }}>
        <div className="card-header">
          <div>
            <h2 className="card-title">Movement log</h2>
            <div className="card-subtitle">Every material in and out of the warehouse</div>
          </div>
          <span className="mono" style={{ fontSize: 8, color: "var(--color-muted)" }}>
            Latest {Math.min(24, movements.length)}
          </span>
        </div>
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Movement</th>
                <th>Material</th>
                <th>Quantity</th>
                <th>Order</th>
                <th>Handled by</th>
                <th>Date</th>
                <th style={{ textAlign: "right" }}>Value</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className={`movement-icon ${item.type}`}>
                        {item.type === "in" ? <ArrowDownLeft /> : <ArrowUpRight />}
                      </span>
                      <span className={`badge ${item.type === "in" ? "badge-income" : "badge-expense"}`}>
                        {item.type === "in" ? "Received" : "Used"}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="cell-main">{item.materialName}</div>
                    <div className="cell-sub">{item.note || "No note"}</div>
                  </td>
                  <td className="mono" style={{ fontSize: 9.5 }}>
                    {item.type === "out" ? "−" : "+"}
                    {formatNumber(item.quantity, 1)} {item.materialUnit}
                  </td>
                  <td style={{ fontSize: 9.5, color: "var(--color-muted)" }}>{item.orderName || "—"}</td>
                  <td style={{ fontSize: 9.5, color: "var(--color-muted)" }}>{item.workerName || "Warehouse"}</td>
                  <td className="mono" style={{ fontSize: 8.5, color: "var(--color-muted)" }}>
                    {formatDate(item.date)}
                  </td>
                  <td className="mono" style={{ fontSize: 9.5, textAlign: "right" }}>
                    {formatCompact(item.quantity * item.unitCost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <MaterialSheet
        open={materialOpen}
        onClose={() => {
          setMaterialOpen(false);
          setEditing(null);
        }}
        material={editing}
      />
      <MovementSheet
        open={Boolean(movement)}
        onClose={() => setMovement(null)}
        material={movement?.material || null}
        mode={movement?.mode || "in"}
      />
    </div>
  );
}
