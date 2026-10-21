import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  BriefcaseBusiness,
  CalendarDays,
  Mail,
  Pencil,
  Phone,
  Plus,
  X,
} from "lucide-react";
import { api } from "../api";
import type { Worker } from "../types";
import { formatCompact, formatDate, formatMoney, formatNumber } from "../lib/format";
import { Sheet } from "../components/Sheet";
import { Avatar } from "../components/Avatar";
import { StatusBadge } from "../components/StatusBadge";
import { useQuickTransaction } from "../components/QuickTransaction";

interface WorkerDrawerProps {
  workerId: number | null;
  onClose: () => void;
  onEdit: (worker: Worker) => void;
}

export function WorkerDrawer({ workerId, onClose, onEdit }: WorkerDrawerProps) {
  const { openTransaction } = useQuickTransaction();
  const { data, isLoading } = useQuery({
    queryKey: ["worker", workerId],
    queryFn: () => api.worker(workerId as number),
    enabled: Boolean(workerId),
  });
  const worker = data?.worker;

  if (!workerId) return null;

  if (isLoading || !worker) {
    return (
      <Sheet open={Boolean(workerId)} onClose={onClose} title="Team profile" subtitle="Loading worker records…">
        <div className="skeleton" style={{ height: 120, marginBottom: 14 }} />
        <div className="skeleton" style={{ height: 160 }} />
      </Sheet>
    );
  }

  const monthLabel = new Date().toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <Sheet
      open={Boolean(workerId)}
      onClose={onClose}
      title={worker.name}
      header={
        <header className="detail-hero">
          <div className="detail-hero-actions">
            <button type="button" className="icon-btn" onClick={() => onEdit(worker)} aria-label="Edit profile">
              <Pencil size={14} />
            </button>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close panel">
              <X size={15} />
            </button>
          </div>
          <div className="worker-profile-head">
            <Avatar name={worker.name} color={worker.avatarColor} size={66} />
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                {worker.department}
              </div>
              <h2>{worker.name}</h2>
              <p style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <BriefcaseBusiness size={11} /> {worker.role}
              </p>
              <div className="worker-profile-contact">
                {worker.phone && (
                  <span className="contact-chip">
                    <Phone /> {worker.phone}
                  </span>
                )}
                {worker.email && (
                  <span className="contact-chip">
                    <Mail /> {worker.email}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 15 }}>
            <StatusBadge status={worker.status} />
            {worker.hireDate && (
              <span className="badge badge-neutral">
                <CalendarDays size={9} /> Since {formatDate(worker.hireDate)}
              </span>
            )}
          </div>
        </header>
      }
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={() => onEdit(worker)}>
            <Pencil size={13} /> Edit profile
          </button>
          <div className="sheet-footer-actions">
            <button
              type="button"
              className="btn btn-amber"
              onClick={() =>
                openTransaction({
                  type: "expense",
                  category: "Payroll",
                  amount: worker.salary,
                  workerId: worker.id,
                  description: `${monthLabel} salary — ${worker.name}`,
                  notes: "Payroll recorded from team profile.",
                })
              }
            >
              <Banknote size={14} /> Pay salary
            </button>
          </div>
        </>
      }
    >
      <div className="detail-stats" style={{ padding: "0 0 19px", borderBottom: "1px solid var(--color-line)" }}>
        <div className="detail-stat">
          <span>Monthly salary</span>
          <strong>{formatCompact(worker.salary)}</strong>
          <small>UZS {formatMoney(worker.salary, false)}</small>
        </div>
        <div className="detail-stat">
          <span>Active orders</span>
          <strong>{worker.activeOrders}</strong>
          <small>{worker.orderCount} all-time assignments</small>
        </div>
        <div className="detail-stat">
          <span>Paid to date</span>
          <strong>{formatCompact(worker.paidTotal)}</strong>
          <small>{worker.lastPaid ? `Last paid ${formatDate(worker.lastPaid)}` : "No payroll yet"}</small>
        </div>
        <div className="detail-stat">
          <span>Material used</span>
          <strong>{formatCompact(worker.usageValue)}</strong>
          <small>{formatNumber(worker.usageCount)} usage movements</small>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-head">
          <span className="detail-section-title">Order assignments</span>
          <span className="mono" style={{ fontSize: 8, color: "var(--color-muted)" }}>
            {worker.orders.length} total
          </span>
        </div>
        {worker.orders.length ? (
          worker.orders.map((order) => (
            <div className="detail-row" key={order.id}>
              <span className="detail-row-label" style={{ minWidth: 0 }}>
                <span className="client-mark" style={{ width: 27, height: 27, borderRadius: 7, fontSize: 8 }}>
                  {order.name.slice(0, 2).toUpperCase()}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--color-ink-soft)" }}>
                    {order.name}
                  </span>
                  <span style={{ fontSize: 8, color: "var(--color-muted-light)" }}>
                    {order.clientName || "Internal"} · {formatDate(order.orderDate)} → {formatDate(order.deadline)}
                  </span>
                </span>
              </span>
              <StatusBadge status={order.status} />
            </div>
          ))
        ) : (
          <span style={{ fontSize: 10, color: "var(--color-muted)" }}>No order assignments yet.</span>
        )}
      </div>

      <div className="detail-section">
        <div className="detail-section-head">
          <span className="detail-section-title">Recent payroll</span>
          <span className="mono" style={{ fontSize: 8, color: "var(--color-muted)" }}>
            {worker.payments.length} entries
          </span>
        </div>
        {worker.payments.length ? (
          worker.payments.map((payment) => (
            <div className="detail-row" key={payment.id}>
              <span className="detail-row-label">
                <span className="movement-icon out" style={{ width: 24, height: 24 }}>
                  <ArrowUpRight />
                </span>
                <span>
                  <span style={{ display: "block", color: "var(--color-ink-soft)" }}>{payment.description}</span>
                  <span style={{ fontSize: 8, color: "var(--color-muted-light)" }}>
                    {formatDate(payment.date)} · {payment.method}
                  </span>
                </span>
              </span>
              <span className="detail-row-value mono" style={{ color: "var(--color-negative)" }}>
                −{formatCompact(payment.amount)}
              </span>
            </div>
          ))
        ) : (
          <span style={{ fontSize: 10, color: "var(--color-muted)" }}>No payroll entries yet.</span>
        )}
      </div>

      <div className="detail-section">
        <div className="detail-section-head">
          <span className="detail-section-title">Recent material usage</span>
          <span className="mono" style={{ fontSize: 8, color: "var(--color-muted)" }}>
            {worker.usageCount} all time
          </span>
        </div>
        {worker.materialUsage.length ? (
          worker.materialUsage.map((movement) => (
            <div className="detail-row" key={movement.id}>
              <span className="detail-row-label" style={{ minWidth: 0 }}>
                <span className={`movement-icon ${movement.type}`} style={{ width: 24, height: 24 }}>
                  {movement.type === "out" ? <ArrowUpRight /> : <ArrowDownLeft />}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--color-ink-soft)" }}>
                    {movement.materialName}
                  </span>
                  <span style={{ fontSize: 8, color: "var(--color-muted-light)" }}>
                    {movement.orderName || "No order"} · {formatDate(movement.date)}
                  </span>
                </span>
              </span>
              <span className="detail-row-value mono">
                {formatNumber(movement.quantity, 1)} {movement.materialUnit}
              </span>
            </div>
          ))
        ) : (
          <span style={{ fontSize: 10, color: "var(--color-muted)" }}>No material usage recorded yet.</span>
        )}
      </div>

      <div className="detail-section">
        <div className="detail-section-title" style={{ marginBottom: 8 }}>
          Quick action
        </div>
        <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() =>
              openTransaction({
                type: "expense",
                category: "Payroll",
                amount: worker.salary,
                workerId: worker.id,
                description: `${monthLabel} salary — ${worker.name}`,
              })
            }
          >
            <Plus size={12} /> Record payroll
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() =>
              openTransaction({
                type: "expense",
                category: "Installation",
                workerId: worker.id,
                description: `Reimbursement — ${worker.name}`,
              })
            }
          >
            <Banknote size={12} /> Reimburse expense
          </button>
        </div>
      </div>
    </Sheet>
  );
}
