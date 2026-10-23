import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Package, Pencil, Plus, Printer, Search, X } from "lucide-react";
import { api } from "../api";
import type { CatalogProduct, CatalogTool } from "../types";
import { PageHeader } from "../components/Logo";
import { ProductSheet } from "../components/ProductSheet";
import { ToolSheet } from "../components/ToolSheet";
import { EmptyState } from "../components/EmptyState";
import {
  formatCompact,
  formatDate,
  formatNumber,
  pluralize,
  relativeDate,
} from "../lib/format";

type CatalogTab = "products" | "tools";
type StatusFilter = "all" | "active" | "archived";

const defaultProductTypes = [
  "Banner / print",
  "Volumetric letters",
  "Lightbox",
  "Facade",
  "Stela / pylon",
  "LED display",
  "Car branding",
  "Interior",
  "Print",
  "Custom",
];

const defaultUnits = ["sqm", "pcs", "set", "m", "job", "vehicle", "sheet"];

const defaultToolKinds = [
  "Printer",
  "Plotter",
  "CNC",
  "Laser",
  "Finishing",
  "Fabrication",
  "Assembly",
  "Installation",
  "Transport",
];

export function ProductsPage() {
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<CatalogTab>(searchParams.get("tab") === "tools" ? "tools" : "products");
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [productOpen, setProductOpen] = useState(false);
  const [toolOpen, setToolOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<CatalogProduct | null>(null);
  const [editingTool, setEditingTool] = useState<CatalogTool | null>(null);

  useEffect(() => {
    const nextTab = searchParams.get("tab");
    if (nextTab === "tools" || nextTab === "products") setTab(nextTab);
    const nextSearch = searchParams.get("search");
    if (nextSearch !== null) setSearch(nextSearch);
  }, [searchParams]);

  const { data, isLoading, isError } = useQuery({ queryKey: ["catalog"], queryFn: api.catalog });
  const products = data?.products || [];
  const tools = data?.tools || [];
  const summary = data?.summary;

  const productTypes = useMemo(
    () => [...new Set([...defaultProductTypes, ...products.map((product) => product.category)])],
    [products]
  );
  const units = useMemo(
    () => [...new Set([...defaultUnits, ...products.map((product) => product.unit)])],
    [products]
  );
  const toolKinds = useMemo(
    () => [...new Set([...defaultToolKinds, ...tools.map((tool) => tool.kind)])],
    [tools]
  );

  const query = search.trim().toLowerCase();

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesSearch =
          !query ||
          product.name.toLowerCase().includes(query) ||
          product.category.toLowerCase().includes(query) ||
          product.unit.toLowerCase().includes(query) ||
          (product.notes || "").toLowerCase().includes(query);
        const matchesStatus =
          status === "all" || (status === "active" ? product.active : !product.active);
        return matchesSearch && matchesStatus;
      }),
    [products, query, status]
  );

  const filteredTools = useMemo(
    () =>
      tools.filter((tool) => {
        const matchesSearch =
          !query ||
          tool.name.toLowerCase().includes(query) ||
          tool.kind.toLowerCase().includes(query) ||
          (tool.notes || "").toLowerCase().includes(query);
        const matchesStatus = status === "all" || (status === "active" ? tool.active : !tool.active);
        return matchesSearch && matchesStatus;
      }),
    [tools, query, status]
  );

  const hasFilters = Boolean(search.trim()) || status !== "all";
  const equipmentUses = tools.reduce((sum, tool) => sum + tool.useCount, 0);

  const openNewProduct = () => {
    setEditingProduct(null);
    setProductOpen(true);
  };

  const openEditProduct = (product: CatalogProduct) => {
    setEditingProduct(product);
    setProductOpen(true);
  };

  const openNewTool = () => {
    setEditingTool(null);
    setToolOpen(true);
  };

  const openEditTool = (tool: CatalogTool) => {
    setEditingTool(tool);
    setToolOpen(true);
  };

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
  };

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            Catalog <span style={{ color: "var(--color-line-strong)" }}>/</span> Tovarlar
          </>
        }
        title={
          <>
            What we make, <em>and what makes it.</em>
          </>
        }
        subtitle="Your own product and equipment catalog. Add what the workshop sells, then tag every money entry with the product made and the printer, plotter or tool used."
        actions={
          <>
            <button type="button" className="btn btn-secondary" onClick={openNewTool}>
              <Printer size={14} /> Add tool
            </button>
            <button type="button" className="btn btn-amber" onClick={openNewProduct}>
              <Plus size={15} /> Add product
            </button>
          </>
        }
      />

      <section className="summary-strip animate-up" style={{ animationDelay: "50ms" }}>
        <div className="summary-block">
          <span className="micro-label">Products</span>
          <strong>
            {formatNumber(summary?.activeProducts || 0)} <span>/ {formatNumber(summary?.productCount || 0)} ACTIVE</span>
          </strong>
          <div className="summary-note">Your sellable product catalog</div>
        </div>
        <div className="summary-block">
          <span className="micro-label">Tagged revenue</span>
          <strong>
            {formatCompact(summary?.taggedRevenue || 0)} <span>UZS</span>
          </strong>
          <div className="summary-note">
            All-time · {formatNumber(summary?.taggedEntries || 0)} entries tagged
          </div>
        </div>
        <div className="summary-block">
          <span className="micro-label">Top product</span>
          <strong className="summary-name">{summary?.topProduct?.name || "No sales tagged yet"}</strong>
          <div className="summary-note">
            {summary?.topProduct
              ? `${formatCompact(summary.topProduct.revenue)} UZS · ${summary.topProduct.saleCount} payments`
              : "Tag a product on a money-in entry"}
          </div>
        </div>
        <div className="summary-block">
          <span className="micro-label">Equipment</span>
          <strong>
            {formatNumber(summary?.activeTools || 0)} <span>/ {formatNumber(summary?.toolCount || 0)} ACTIVE</span>
          </strong>
          <div className="summary-note">{pluralize(equipmentUses, "ledger use")}</div>
        </div>
      </section>

      <div className="page-toolbar animate-up" style={{ animationDelay: "70ms" }}>
        <div className="tabs" role="tablist" aria-label="Catalog sections">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "products"}
            className={`tab ${tab === "products" ? "active" : ""}`}
            onClick={() => setTab("products")}
          >
            <Package size={13} /> Products <span className="tab-count">{products.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "tools"}
            className={`tab ${tab === "tools" ? "active" : ""}`}
            onClick={() => setTab("tools")}
          >
            <Printer size={13} /> Tools & equipment <span className="tab-count">{tools.length}</span>
          </button>
        </div>
      </div>

      <section className="card animate-up" style={{ animationDelay: "90ms" }}>
        <div className="toolbar">
          <div className="search-box">
            <Search />
            <input
              className="input"
              placeholder={tab === "products" ? "Search product, type or unit…" : "Search tool, type or note…"}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search catalog"
            />
          </div>
          <div className="segmented" role="group" aria-label="Filter by status">
            {(
              [
                { value: "all", label: "All" },
                { value: "active", label: "Active" },
                { value: "archived", label: "Archived" },
              ] as Array<{ value: StatusFilter; label: string }>
            ).map((option) => (
              <button
                type="button"
                key={option.value}
                className={status === option.value ? "active" : ""}
                onClick={() => setStatus(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
          {hasFilters && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={clearFilters}>
              <X size={13} /> Clear
            </button>
          )}
        </div>

        <div className="toolbar-summary">
          {tab === "products" ? (
            <>
              Showing <strong>{formatNumber(filteredProducts.length)}</strong> of{" "}
              {pluralize(products.length, "product")}
              {search.trim() && <> matching “{search.trim()}”</>}
              {" · "}
              <span className="catalog-tagged">{formatCompact(summary?.taggedRevenue || 0)} UZS tagged</span>
            </>
          ) : (
            <>
              Showing <strong>{formatNumber(filteredTools.length)}</strong> of{" "}
              {pluralize(tools.length, "tool")}
              {search.trim() && <> matching “{search.trim()}”</>}
              {" · "}
              <span className="catalog-tagged">{formatNumber(equipmentUses)} ledger uses</span>
            </>
          )}
        </div>

        {isLoading ? (
          <div style={{ padding: 20 }}>
            {[0, 1, 2, 3, 4].map((item) => (
              <div key={item} className="skeleton" style={{ height: 46, marginBottom: 8 }} />
            ))}
          </div>
        ) : isError ? (
          <EmptyState
            icon={tab === "products" ? <Package size={20} /> : <Printer size={20} />}
            title="The catalog could not be loaded"
            description="Check your connection and try refreshing the page."
          />
        ) : tab === "products" ? (
          filteredProducts.length === 0 ? (
            <EmptyState
              icon={<Package size={20} />}
              title={products.length ? "No products match this view" : "Add your first product"}
              description={
                products.length
                  ? "Try clearing the filters, or add another product type."
                  : "Start with what you sell most — banners, volumetric letters, lightboxes or print."
              }
              action={
                <button type="button" className="btn btn-primary" onClick={openNewProduct}>
                  <Plus size={14} /> Add product
                </button>
              }
            />
          ) : (
            <div className="table-wrap">
              <table className="data-table catalog-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Type</th>
                    <th>Used</th>
                    <th>Revenue</th>
                    <th>Last used</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <div className="catalog-name-cell">
                          <span className="catalog-glyph">
                            <Package />
                          </span>
                          <div>
                            <div className="cell-main">{product.name}</div>
                            <div className="cell-sub">{product.notes || "No notes"}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge badge-neutral">{product.category}</span>
                        <div className="cell-sub" style={{ marginTop: 4 }}>
                          per {product.unit}
                        </div>
                      </td>
                      <td>
                        <div className="cell-main">{formatNumber(product.useCount)} entries</div>
                        <div className="cell-sub">
                          {product.saleCount
                            ? `${pluralize(product.saleCount, "payment")} received`
                            : "No payments tagged"}
                        </div>
                      </td>
                      <td className="mono" style={{ fontSize: 9.5 }}>
                        {product.revenue > 0 ? formatCompact(product.revenue) : "—"}
                      </td>
                      <td>
                        <div className="cell-main" style={{ fontWeight: 600 }}>
                          {product.lastUsed ? relativeDate(product.lastUsed) : "Not used yet"}
                        </div>
                        <div className="cell-sub">
                          {product.lastUsed ? formatDate(product.lastUsed) : "Appears after the first tag"}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${product.active ? "badge-active" : "badge-inactive"}`}>
                          {product.active ? "Active" : "Archived"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            className="mini-icon-btn"
                            onClick={() => openEditProduct(product)}
                            aria-label={`Edit ${product.name}`}
                          >
                            <Pencil size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : filteredTools.length === 0 ? (
          <EmptyState
            icon={<Printer size={20} />}
            title={tools.length ? "No tools match this view" : "Add your first tool"}
            description={
              tools.length
                ? "Try clearing the filters, or add another printer or machine."
                : "Add the printers, plotter, CNC router or lift the production team actually uses."
            }
            action={
              <button type="button" className="btn btn-primary" onClick={openNewTool}>
                <Plus size={14} /> Add tool
              </button>
            }
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table catalog-table">
              <thead>
                <tr>
                  <th>Tool / equipment</th>
                  <th>Type</th>
                  <th>Used</th>
                  <th>Last used</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTools.map((tool) => (
                  <tr key={tool.id}>
                    <td>
                      <div className="catalog-name-cell">
                        <span className="catalog-glyph equipment">
                          <Printer />
                        </span>
                        <div>
                          <div className="cell-main">{tool.name}</div>
                          <div className="cell-sub">{tool.notes || "No notes"}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-neutral">{tool.kind}</span>
                    </td>
                    <td>
                      <div className="cell-main">{formatNumber(tool.useCount)} entries</div>
                      <div className="cell-sub">
                        {tool.orderCount ? `${pluralize(tool.orderCount, "order")} linked` : "No orders linked"}
                      </div>
                    </td>
                    <td>
                      <div className="cell-main" style={{ fontWeight: 600 }}>
                        {tool.lastUsed ? relativeDate(tool.lastUsed) : "Not used yet"}
                      </div>
                      <div className="cell-sub">
                        {tool.lastUsed ? formatDate(tool.lastUsed) : "Appears after the first tag"}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${tool.active ? "badge-active" : "badge-inactive"}`}>
                        {tool.active ? "Active" : "Archived"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          type="button"
                          className="mini-icon-btn"
                          onClick={() => openEditTool(tool)}
                          aria-label={`Edit ${tool.name}`}
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ProductSheet
        open={productOpen}
        onClose={() => setProductOpen(false)}
        product={editingProduct}
        categories={productTypes}
        units={units}
      />
      <ToolSheet open={toolOpen} onClose={() => setToolOpen(false)} tool={editingTool} kinds={toolKinds} />
    </div>
  );
}
