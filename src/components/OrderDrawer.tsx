import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Boxes,
  CalendarRange,
  MapPin,
  Pencil,
  Plus,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { api } from "../api";
import type { Order } from "../types";
import { formatCompact, formatDate, formatMoney, formatNumber } from "../lib/format";
import { Sheet } from "../components/Sheet";
import { Avatar } from "../components/Avatar";
import { StatusBadge } from "../components/StatusBadge";
import { useQuickTransaction } from "../components/QuickTransaction";
import { plural, t } from "../i18n";

interface OrderDrawerProps {
  orderId: number | null;
  onClose: () => void;
  onEdit: (order: Order) => void;
}

const stageSteps = [
  { key: "design", label: t("Design"), at: 1 },
  { key: "production", label: t("Production"), at: 2 },
  { key: "install", label: t("Install"), at: 3 },
  { key: "completed", label: t("Handover"), at: 4 },
];

const stageIndex: Record<string, number> = {
  new: 0,
  design: 1,
  production: 2,
  install: 3,
  completed: 4,
  cancelled: -1,
};

export function OrderDrawer({ orderId, onClose, onEdit }: OrderDrawerProps) {
  const { openTransaction } = useQuickTransaction();
  const { data, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => api.order(orderId as number),
    enabled: Boolean(orderId),
  });

  const order = data?.order;

  if (!orderId) return null;

  if (isLoading || !order) {
    return (
      <Sheet open={Boolean(orderId)} onClose={onClose} title={t("Order detail")} subtitle={t("Loading production records…")}>
        <div className="skeleton" style={{ height: 80, marginBottom: 14 }} />
        <div className="skeleton" style={{ height: 120, marginBottom: 14 }} />
        <div className="skeleton" style={{ height: 180 }} />
      </Sheet>
    );
  }

  const paidPercent = order.quote ? Math.min(100, (order.income / order.quote) * 100) : 0;
  const costPercent = order.quote ? Math.min(100, (order.expense / order.quote) * 100) : 0;
  const margin = order.income ? (order.profit / order.income) * 100 : 0;
  const stage = stageIndex[order.status] ?? 0;

  const recordPayment = () =>
    openTransaction({
      type: "income",
      category: "Order payment",
      amount: order.balance > 0 ? order.balance : undefined,
      orderId: order.id,
      clientId: order.clientId,
      description: t("Payment — {name}", { name: order.name }),
      notes: order.balance > 0 ? t("Balance due {amount}", { amount: formatMoney(order.balance) }) : t("Additional payment"),
    });

  return (
    <Sheet
      open={Boolean(orderId)}
      onClose={onClose}
      title={order.name}
      footerClassName="order-footer"
      header={
        <header className="detail-hero">
          <div className="detail-hero-actions">
            <button type="button" className="icon-btn" onClick={() => onEdit(order)} aria-label={t("Edit order")}>
              <Pencil size={14} />
            </button>
            <button type="button" className="icon-btn" onClick={onClose} aria-label={t("Close panel")}>
              <X size={15} />
            </button>
          </div>
          <div className="eyebrow">
            {order.orderNumber} <span style={{ opacity: 0.4 }}>·</span> {t(order.product)} <span style={{ opacity: 0.4 }}>·</span>{" "}
            {order.clientName}
          </div>
          <h2>{order.name}</h2>
          <p style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <MapPin size={11} /> {order.site || t("Installation site not set")}
          </p>
          <div style={{ display: "flex", gap: 6, marginTop: 13, flexWrap: "wrap" }}>
            <StatusBadge status={order.status} />
            <span className={`badge priority-${order.priority}`}>{t("{priority} priority", { priority: t(order.priority) })}</span>
            <span className="badge badge-neutral">
              <CalendarRange size={9} /> {order.deadline ? formatDate(order.deadline) : t("No deadline")}
            </span>
          </div>
        </header>
      }
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={() => onEdit(order)}>
            <Pencil size={13} /> {t("Edit order")}
          </button>
          <div className="sheet-footer-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() =>
                openTransaction({
                  type: "expense",
                  category: "Materials",
                  orderId: order.id,
                  clientId: order.clientId,
                  description: t("Order expense — {name}", { name: order.name }),
                })
              }
            >
              <Plus size={13} /> {t("Add expense")}
            </button>
            <button type="button" className="btn btn-amber" onClick={recordPayment}>
              <Banknote size={14} /> {t("Record payment")}
            </button>
          </div>
        </>
      }
    >
      <div className="detail-stats" style={{ padding: "0 0 19px", borderBottom: "1px solid var(--color-line)" }}>
        <div className="detail-stat">
          <span>{t("Quote")}</span>
          <strong>{formatCompact(order.quote)}</strong>
          <small>{formatMoney(order.quote)}</small>
        </div>
        <div className="detail-stat">
          <span>{t("Paid")}</span>
          <strong>{formatCompact(order.income)}</strong>
          <small>{t("{pct}% collected", { pct: Math.round(paidPercent) })}</small>
        </div>
        <div className="detail-stat">
          <span>{t("Balance due")}</span>
          <strong style={{ color: order.balance > 0 ? "var(--color-terracotta)" : "var(--color-positive)" }}>
            {formatCompact(order.balance)}
          </strong>
          <small>{formatMoney(order.balance)}</small>
        </div>
        <div className="detail-stat">
          <span>{t("Contribution")}</span>
          <strong style={{ color: order.profit >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}>
            {order.profit >= 0 ? "+" : "−"}
            {formatCompact(Math.abs(order.profit))}
          </strong>
          <small>{t("{pct}% margin", { pct: margin.toFixed(1) })}</small>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-head">
          <span className="detail-section-title">{t("Payment collected")}</span>
          <span className="mono" style={{ fontSize: 9, color: "var(--color-muted)" }}>
            {Math.round(paidPercent)}%
          </span>
        </div>
        <div className="progress-track" style={{ height: 7 }}>
          <div
            className={`progress-fill ${order.balance === 0 ? "" : paidPercent < 50 ? "warn" : ""}`}
            style={{ width: `${paidPercent}%` }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 8.5, color: "var(--color-muted)" }}>
          <span>{t("{amount} collected", { amount: t("UZS {amount}", { amount: formatCompact(order.income) }) })}</span>
          <span>{t("{amount} quote", { amount: t("UZS {amount}", { amount: formatCompact(order.quote) }) })}</span>
        </div>
        <div className="detail-section-head" style={{ marginTop: 17 }}>
          <span className="detail-section-title">{t("Direct costs")}</span>
          <span className="mono" style={{ fontSize: 9, color: "var(--color-muted)" }}>
            {t("{pct}% of quote", { pct: Math.round(costPercent) })}
          </span>
        </div>
        <div className="progress-track" style={{ height: 7 }}>
          <div
            className={`progress-fill ${costPercent > 85 ? "danger" : costPercent > 65 ? "warn" : ""}`}
            style={{ width: `${costPercent}%` }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 8.5, color: "var(--color-muted)" }}>
          <span>{t("{amount} spent", { amount: t("UZS {amount}", { amount: formatCompact(order.expense) }) })}</span>
          <span>{t("{pct}% contribution margin", { pct: margin.toFixed(1) })}</span>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-head">
          <span className="detail-section-title">{t("Production stage")}</span>
          <span className="mono" style={{ fontSize: 8.5, color: "var(--color-muted)" }}>
            {t(order.status)}
          </span>
        </div>
        <div className="order-stage order-stage-detail">
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
      </div>

      <div className="detail-section">
        <div className="detail-section-title" style={{ marginBottom: 10 }}>
          {t("Order details")}
        </div>
        <div className="detail-row">
          <span className="detail-row-label">
            <Boxes /> {t("Product")}
          </span>
          <span className="detail-row-value">{t(order.product)}</span>
        </div>
        <div className="detail-row">
          <span className="detail-row-label">
            <CalendarRange /> {t("Timeline")}
          </span>
          <span className="detail-row-value">
            {formatDate(order.orderDate)} → {formatDate(order.deadline)}
          </span>
        </div>
        <div className="detail-row">
          <span className="detail-row-label">
            <UserRound /> {t("Manager")}
          </span>
          <span className="detail-row-value">{order.managerName || t("Unassigned")}</span>
        </div>
        <div className="detail-row">
          <span className="detail-row-label">
            <Users /> {t("Crew")}
          </span>
          <span className="detail-row-value">{plural(order.crew.length, { en: ["{n} person assigned", "{n} people assigned"], ru: ["{n} человек назначен", "{n} человека назначено", "{n} человек назначено"], uz: "{n} kishi biriktirilgan" })}</span>
        </div>
        <div className="detail-row">
          <span className="detail-row-label">
            <Boxes /> {t("Material movements")}
          </span>
          <span className="detail-row-value">{t("{n} logged", { n: formatNumber(order.materialMovements) })}</span>
        </div>
      </div>

      {order.notes && (
        <div className="detail-section">
          <div className="detail-section-title" style={{ marginBottom: 7 }}>
            {t("Production notes")}
          </div>
          <p style={{ margin: 0, fontSize: 10, lineHeight: 1.6, color: "var(--color-muted)" }}>{order.notes}</p>
        </div>
      )}

      <div className="detail-section">
        <div className="detail-section-title" style={{ marginBottom: 11 }}>
          {t("Crew on this order")}
        </div>
        <div className="crew-detail-list">
          {order.crew.length ? (
            order.crew.map((worker) => (
              <div className="crew-detail-row" key={worker.id}>
                <Avatar name={worker.name} color={worker.avatarColor} size={29} />
                <div>
                  <div className="name">{worker.name}</div>
                  <div className="role">{t(worker.role)}</div>
                </div>
              </div>
            ))
          ) : (
            <span style={{ fontSize: 10, color: "var(--color-muted)" }}>{t("No crew assigned yet.")}</span>
          )}
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-head">
          <span className="detail-section-title">{t("Recent ledger entries")}</span>
          <span className="mono" style={{ fontSize: 8, color: "var(--color-muted)" }}>
            {t("{n} shown", { n: order.transactions.length })}
          </span>
        </div>
        {order.transactions.length ? (
          order.transactions.map((transaction) => (
            <div className="detail-row" key={transaction.id}>
              <span className="detail-row-label" style={{ minWidth: 0 }}>
                <span className={`tx-icon ${transaction.type === "income" ? "in" : "out"}`} style={{ width: 24, height: 24 }}>
                  {transaction.type === "income" ? <ArrowDownLeft /> : <ArrowUpRight />}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--color-ink-soft)" }}>
                    {transaction.description}
                  </span>
                  <span style={{ fontSize: 8, color: "var(--color-muted-light)" }}>
                    {formatDate(transaction.date)} · {t(transaction.category)}
                    {transaction.productName ? ` · ${transaction.productName}` : ""}
                  </span>
                </span>
              </span>
              <span
                className="detail-row-value mono"
                style={{ color: transaction.type === "income" ? "var(--color-positive)" : "var(--color-negative)" }}
              >
                {transaction.type === "income" ? "+" : "−"}
                {formatCompact(transaction.amount)}
              </span>
            </div>
          ))
        ) : (
          <span style={{ fontSize: 10, color: "var(--color-muted)" }}>{t("No ledger entries linked yet.")}</span>
        )}
      </div>

      <div className="detail-section">
        <div className="detail-section-head">
          <span className="detail-section-title">{t("Material usage")}</span>
          <span className="mono" style={{ fontSize: 8, color: "var(--color-muted)" }}>
            {t("{n} shown", { n: order.movements.length })}
          </span>
        </div>
        {order.movements.length ? (
          order.movements.map((movement) => (
            <div className="detail-row" key={movement.id}>
              <span className="detail-row-label" style={{ minWidth: 0 }}>
                <span className={`movement-icon ${movement.type}`} style={{ width: 24, height: 24 }}>
                  {movement.type === "in" ? <ArrowDownLeft /> : <ArrowUpRight />}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--color-ink-soft)" }}>
                    {movement.materialName}
                  </span>
                  <span style={{ fontSize: 8, color: "var(--color-muted-light)" }}>
                    {movement.workerName || t("Warehouse")} · {formatDate(movement.date)}
                  </span>
                </span>
              </span>
              <span className="detail-row-value mono">
                {movement.type === "out" ? "−" : "+"}
                {formatNumber(movement.quantity, 1)} {t(movement.materialUnit)}
              </span>
            </div>
          ))
        ) : (
          <span style={{ fontSize: 10, color: "var(--color-muted)" }}>{t("No material usage logged yet.")}</span>
        )}
      </div>
    </Sheet>
  );
}
