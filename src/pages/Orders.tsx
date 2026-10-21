import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ArrowUpRight, CalendarDays, FolderKanban, MapPin, Plus, Search } from "lucide-react";
import { api } from "../api";
import type { Order, OrderStatus } from "../types";
import { PageHeader } from "../components/Logo";
import { OrderSheet } from "../components/OrderSheet";
import { OrderDrawer } from "../components/OrderDrawer";
import { StatusBadge } from "../components/StatusBadge";
import { Avatar } from "../components/Avatar";
import { EmptyState } from "../components/EmptyState";
import { formatCompact, formatDate, initials, pluralize } from "../lib/format";

type StatusFilter = "all" | OrderStatus;

const openStatuses: OrderStatus[] = ["new", "design", "production", "install"];

const statusTabs: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "design", label: "Design" },
  { value: "production", label: "Production" },
  { value: "install", label: "Install" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const stageSteps = [
  { key: "design", label: "Design", at: 1 },
  { key: "production", label: "Production", at: 2 },
  { key: "install", label: "Install", at: 3 },
  { key: "completed", label: "Handover", at: 4 },
];

const statusIndex: Record<OrderStatus, number> = {
  new: 0,
  design: 1,
  production: 2,
  install: 3,
  completed: 4,
  cancelled: -1,
};

function productAccent(product: string) {
  const value = product.toLowerCase();
  if (value.includes("letter")) return "letters";
  if (value.includes("facade")) return "facade";
  if (value.includes("stela") || value.includes("pylon")) return "stela";
  if (value.includes("lightbox")) return "lightbox";
  if (value.includes("led")) return "led";
  if (value.includes("car")) return "car";
  if (value.includes("banner") || value.includes("print")) return "print";
  if (value.includes("interior")) return "interior";
  return "other";
}

function deadlineChip(order: Order) {
  if (order.status === "completed") {
    return { label: `Closed ${formatDate(order.deadline, "short")}`, tone: "done" };
  }
  if (order.status === "cancelled") return { label: "Cancelled", tone: "muted" };
  if (!order.deadline) return { label: "No deadline", tone: "muted" };

  const deadline = new Date(`${order.deadline}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((deadline.getTime() - today.getTime()) / 86_400_000);

  if (days < 0) return { label: `${Math.abs(days)}d overdue`, tone: "overdue" };
  if (days === 0) return { label: "Due today", tone: "today" };
  if (days <= 7) return { label: `Due in ${days}d`, tone: "soon" };
  return { label: `Due ${formatDate(order.deadline, "short")}`, tone: "normal" };
}

export function OrdersPage() {
  const [params, setParams] = useSearchParams();
  const detailId = Number(params.get("open")) || null;
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["orders"], queryFn: api.orders });
  const orders = data?.orders || [];

  const stats = useMemo(() => {
    const open = orders.filter((order) => openStatuses.includes(order.status));
    const openValue = open.reduce((sum, order) => sum + order.quote, 0);
    const inProduction = open.filter((order) => order.status === "production").length;
    const outstanding = orders.reduce((sum, order) => sum + order.balance, 0);
    return { openCount: open.length, openValue, inProduction, outstanding };
  }, [orders]);

  const counts = useMemo(() => {
    const base: Record<StatusFilter, number> = {
      all: orders.length,
      new: 0,
      design: 0,
      production: 0,
      install: 0,
      completed: 0,
      cancelled: 0,
    };
    orders.forEach((order) => {
      base[order.status] += 1;
    });
    return base;
  }, [orders]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesStatus = status === "all" || order.status === status;
      const matchesSearch =
        !query ||
        order.orderNumber.toLowerCase().includes(query) ||
        order.name.toLowerCase().includes(query) ||
        order.clientName.toLowerCase().includes(query) ||
        (order.site || "").toLowerCase().includes(query) ||
        order.product.toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [orders, status, search]);

  const openDetail = (id: number) => {
    const next = new URLSearchParams(params);
    next.set("open", String(id));
    setParams(next);
  };

  const closeDetail = () => {
    const next = new URLSearchParams(params);
    next.delete("open");
    setParams(next, { replace: true });
  };

  const openEdit = (order: Order) => {
    closeDetail();
    setEditing(order);
    setFormOpen(true);
  };

  const createNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div>
      <PageHeader
        eyebrow={
          <>
            Production <span style={{ color: "var(--color-line-strong)" }}>/</span> Orders
          </>
        }
        title={
          <>
            From concept, <em>to install.</em>
          </>
        }
        subtitle="Every sign, lightbox, pylon and wrap — tracked from measurement and design through fabrication, print and the final site install."
        actions={
          <button type="button" className="btn btn-amber" onClick={createNew}>
            <Plus size={15} /> New order
          </button>
        }
      />

      <section className="summary-strip animate-up" style={{ animationDelay: "50ms" }}>
        <div className="summary-block">
          <span className="micro-label">Open orders</span>
          <strong>
            {stats.openCount} <span>JOBS</span>
          </strong>
          <div className="summary-note">In design, production or install</div>
        </div>
        <div className="summary-block">
          <span className="micro-label">Quoted value</span>
          <strong>
            {formatCompact(stats.openValue)} <span>UZS</span>
          </strong>
          <div className="summary-note">Value of open work</div>
        </div>
        <div className="summary-block">
          <span className="micro-label">On the floor</span>
          <strong>
            {stats.inProduction} <span>IN PRODUCTION</span>
          </strong>
          <div className="summary-note">Currently being fabricated</div>
        </div>
        <div className="summary-block">
          <span className="micro-label">Balance due</span>
          <strong style={{ color: stats.outstanding > 0 ? "var(--color-terracotta)" : "var(--color-positive)" }}>
            {formatCompact(stats.outstanding)} <span>UZS</span>
          </strong>
          <div className="summary-note">Still to collect from clients</div>
        </div>
      </section>

      <div className="page-toolbar animate-up" style={{ animationDelay: "80ms" }}>
        <div className="tabs" role="tablist" aria-label="Filter orders by stage">
          {statusTabs.map((tab) => (
            <button
              type="button"
              role="tab"
              aria-selected={status === tab.value}
              className={`tab ${status === tab.value ? "active" : ""}`}
              key={tab.value}
              onClick={() => setStatus(tab.value)}
            >
              {tab.label}
              <span className="tab-count">{counts[tab.value]}</span>
            </button>
          ))}
        </div>
        <div className="search-box" style={{ position: "relative", flex: 1, minWidth: 200 }}>
          <Search
            size={14}
            style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }}
          />
          <input
            className="input"
            style={{ height: 38, paddingLeft: 33, fontSize: 11 }}
            placeholder="Search order no., client, site or product…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <span className="mono" style={{ fontSize: 8.5, color: "var(--color-muted)", marginLeft: "auto" }}>
          {pluralize(filtered.length, "order")}
        </span>
      </div>

      {isLoading ? (
        <div className="order-grid">
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div className="card" key={item} style={{ height: 330, padding: 18 }}>
              <div className="skeleton" style={{ width: 45, height: 45 }} />
              <div className="skeleton" style={{ width: "65%", height: 16, marginTop: 18 }} />
              <div className="skeleton" style={{ width: "85%", height: 10, marginTop: 9 }} />
              <div className="skeleton" style={{ height: 70, marginTop: 26 }} />
              <div className="skeleton" style={{ height: 6, marginTop: 20 }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<FolderKanban size={21} />}
            title="No orders in this view"
            description="Try a different production stage or search term, or start a new signage order."
            action={
              <button type="button" className="btn btn-primary" onClick={createNew}>
                <Plus size={14} /> New order
              </button>
            }
          />
        </div>
      ) : (
        <div className="order-grid animate-up" style={{ animationDelay: "110ms" }}>
          {filtered.map((order) => {
            const stage = statusIndex[order.status];
            const deadline = deadlineChip(order);
            return (
              <article
                className="order-card"
                key={order.id}
                onClick={() => openDetail(order.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") openDetail(order.id);
                }}
              >
                <div className={`order-accent ${productAccent(order.product)}`} />
                <div className="order-card-body">
                  <div className="order-card-head">
                    <span className="client-mark">{initials(order.clientName)}</span>
                    <div className="order-card-title-wrap">
                      <div className="order-client">
                        {order.clientName} <span style={{ opacity: 0.45 }}>·</span> {order.orderNumber}
                      </div>
                      <h3 className="order-title">{order.name}</h3>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>

                  <div className="order-product-line">
                    <span className="order-product">{order.product}</span>
                    <span className={`deadline-chip ${deadline.tone}`}>
                      <CalendarDays size={10} /> {deadline.label}
                    </span>
                  </div>

                  <div className="order-location">
                    <MapPin /> {order.site || "Installation site not set"}
                  </div>

                  <div className="order-finance">
                    <div>
                      <span>Quote</span>
                      <strong>UZS {formatCompact(order.quote)}</strong>
                    </div>
                    <div>
                      <span>Paid</span>
                      <strong>UZS {formatCompact(order.income)}</strong>
                    </div>
                    <div>
                      <span>Balance</span>
                      <strong className={order.balance > 0 ? "due" : "profit"}>
                        UZS {formatCompact(order.balance)}
                      </strong>
                    </div>
                  </div>

                  <div className="order-stage" aria-label={`Production stage: ${order.status}`}>
                    {stageSteps.map((step) => {
                      const state = stage > step.at ? "done" : stage === step.at || (stage === 0 && step.at === 1) ? "current" : "";
                      return (
                        <span className={`stage-step ${state}`} key={step.key}>
                          <i />
                          <em>{step.label}</em>
                        </span>
                      );
                    })}
                  </div>

                  <div className="order-card-foot">
                    <div className="order-crew">
                      <div className="avatar-stack">
                        {order.crew.slice(0, 4).map((worker) => (
                          <Avatar key={worker.id} name={worker.name} color={worker.avatarColor} size={23} />
                        ))}
                      </div>
                      <span>{order.crew.length ? pluralize(order.crew.length, "person", "people") : "No crew"}</span>
                    </div>
                    <span className="order-format">
                      {order.priority === "high" ? "High priority" : "View order"} <ArrowUpRight size={10} style={{ display: "inline", verticalAlign: "-1px" }} />
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <OrderDrawer orderId={detailId} onClose={closeDetail} onEdit={openEdit} />
      <OrderSheet
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        order={editing}
      />
    </div>
  );
}
