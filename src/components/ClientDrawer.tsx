import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight, Building2, Mail, MapPin, Pencil, Phone, X } from "lucide-react";
import { api } from "../api";
import type { Client } from "../types";
import { formatCompact, formatDate, formatMoney, initials } from "../lib/format";
import { Sheet } from "../components/Sheet";
import { StatusBadge } from "../components/StatusBadge";

interface ClientDrawerProps {
  clientId: number | null;
  onClose: () => void;
  onEdit: (client: Client) => void;
}

export function ClientDrawer({ clientId, onClose, onEdit }: ClientDrawerProps) {
  const { data: clientData, isLoading } = useQuery({ queryKey: ["clients"], queryFn: api.clients });
  const { data: orderData } = useQuery({ queryKey: ["orders"], queryFn: api.orders });
  const client = clientData?.clients.find((item) => item.id === clientId);
  const orders = (orderData?.orders || []).filter((order) => order.clientId === clientId);

  if (!clientId) return null;

  if (isLoading || !client) {
    return (
      <Sheet open={Boolean(clientId)} onClose={onClose} title="Client account" subtitle="Loading client records…">
        <div className="skeleton" style={{ height: 120, marginBottom: 14 }} />
        <div className="skeleton" style={{ height: 160 }} />
      </Sheet>
    );
  }

  return (
    <Sheet
      open={Boolean(clientId)}
      onClose={onClose}
      title={client.name}
      header={
        <header className="detail-hero">
          <div className="detail-hero-actions">
            <button type="button" className="icon-btn" onClick={() => onEdit(client)} aria-label="Edit client">
              <Pencil size={14} />
            </button>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Close panel">
              <X size={15} />
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              className="client-monogram"
              style={{ width: 58, height: 58, borderRadius: 15, background: "rgba(255,255,255,.09)", color: "#f4f2e9", fontSize: 17 }}
            >
              {initials(client.name)}
            </span>
            <div>
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                {client.industry || "Client account"}
              </div>
              <h2>{client.name}</h2>
              <p style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Building2 size={11} /> {client.orderCount} orders · {client.activeOrders} active
              </p>
            </div>
          </div>
          <div className="worker-profile-contact" style={{ marginTop: 16 }}>
            {client.phone && (
              <span className="contact-chip">
                <Phone /> {client.phone}
              </span>
            )}
            {client.email && (
              <span className="contact-chip">
                <Mail /> {client.email}
              </span>
            )}
          </div>
        </header>
      }
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={() => onEdit(client)}>
            <Pencil size={13} /> Edit account
          </button>
          <div className="sheet-footer-actions">
            {orders[0] && (
              <Link className="btn btn-amber" to={`/orders?open=${orders[0].id}`} onClick={onClose}>
                <ArrowUpRight size={14} /> Open order
              </Link>
            )}
          </div>
        </>
      }
    >
      <div className="detail-stats" style={{ padding: "0 0 19px", borderBottom: "1px solid var(--color-line)" }}>
        <div className="detail-stat">
          <span>Lifetime billed</span>
          <strong>{formatCompact(client.revenue)}</strong>
          <small>UZS {formatMoney(client.revenue, false)}</small>
        </div>
        <div className="detail-stat">
          <span>Active orders</span>
          <strong>{client.activeOrders}</strong>
          <small>{client.orderCount} all time</small>
        </div>
        <div className="detail-stat">
          <span>Last payment</span>
          <strong style={{ fontSize: 13 }}>{formatDate(client.lastPayment)}</strong>
          <small>Most recent money in</small>
        </div>
        <div className="detail-stat">
          <span>Relationship</span>
          <strong style={{ fontSize: 13 }}>{client.contactName || "No contact"}</strong>
          <small>Main contact</small>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-head">
          <span className="detail-section-title">Orders</span>
          <span className="mono" style={{ fontSize: 8, color: "var(--color-muted)" }}>
            {orders.length} total
          </span>
        </div>
        {orders.length ? (
          orders.map((order) => (
            <Link className="detail-row" key={order.id} to={`/orders?open=${order.id}`} onClick={onClose}>
              <span className="detail-row-label" style={{ minWidth: 0 }}>
                <span className="client-mark" style={{ width: 26, height: 26, borderRadius: 7, fontSize: 7 }}>
                  {order.product.slice(0, 2).toUpperCase()}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--color-ink-soft)" }}>
                    {order.name}
                  </span>
                  <span style={{ fontSize: 8, color: "var(--color-muted-light)" }}>
                    {order.orderNumber} · {order.product} · due {formatDate(order.deadline)}
                  </span>
                </span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="mono" style={{ fontSize: 8.5, color: "var(--color-muted)" }}>
                  {formatCompact(order.income)}
                </span>
                <StatusBadge status={order.status} />
              </span>
            </Link>
          ))
        ) : (
          <span style={{ fontSize: 10, color: "var(--color-muted)" }}>No orders created for this client yet.</span>
        )}
      </div>

      <div className="detail-section">
        <div className="detail-section-title" style={{ marginBottom: 8 }}>
          Account details
        </div>
        <div className="detail-row">
          <span className="detail-row-label">
            <Building2 /> Contact
          </span>
          <span className="detail-row-value">{client.contactName || "—"}</span>
        </div>
        <div className="detail-row">
          <span className="detail-row-label">
            <Phone /> Phone
          </span>
          <span className="detail-row-value">{client.phone || "—"}</span>
        </div>
        <div className="detail-row">
          <span className="detail-row-label">
            <Mail /> Email
          </span>
          <span className="detail-row-value">{client.email || "—"}</span>
        </div>
        <div className="detail-row">
          <span className="detail-row-label">
            <MapPin /> Address
          </span>
          <span className="detail-row-value">{client.address || "—"}</span>
        </div>
      </div>
    </Sheet>
  );
}
