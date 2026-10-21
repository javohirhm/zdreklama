import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Building2, Plus, Search } from "lucide-react";
import { api } from "../api";
import type { Client } from "../types";
import { PageHeader } from "../components/Logo";
import { ClientSheet } from "../components/ClientSheet";
import { ClientDrawer } from "../components/ClientDrawer";
import { EmptyState } from "../components/EmptyState";
import { formatCompact, formatDate, initials } from "../lib/format";

export function ClientsPage() {
  const [params, setParams] = useSearchParams();
  const detailId = Number(params.get("open")) || null;
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ["clients"], queryFn: api.clients });
  const { data: orderData } = useQuery({ queryKey: ["orders"], queryFn: api.orders });
  const clients = data?.clients || [];
  const orders = orderData?.orders || [];

  const industries = useMemo(() => [...new Set(clients.map((client) => client.industry).filter(Boolean))].sort(), [clients]);

  const stats = useMemo(() => {
    const active = clients.filter((client) => client.activeOrders > 0).length;
    const revenue = clients.reduce((sum, client) => sum + client.revenue, 0);
    return { active, revenue, average: clients.length ? revenue / clients.length : 0 };
  }, [clients]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return clients.filter((client) => {
      const matchesIndustry = industry === "all" || client.industry === industry;
      const matchesSearch =
        !query ||
        client.name.toLowerCase().includes(query) ||
        client.industry.toLowerCase().includes(query) ||
        (client.contactName || "").toLowerCase().includes(query) ||
        (client.email || "").toLowerCase().includes(query);
      return matchesIndustry && matchesSearch;
    });
  }, [clients, industry, search]);

  const openClient = (id: number) => {
    const next = new URLSearchParams(params);
    next.set("open", String(id));
    setParams(next);
  };

  const closeClient = () => {
    const next = new URLSearchParams(params);
    next.delete("open");
    setParams(next, { replace: true });
  };

  const openEdit = (client: Client) => {
    closeClient();
    setEditing(client);
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
            Commercial <span style={{ color: "var(--color-line-strong)" }}>/</span> Clients
          </>
        }
        title={
          <>
            The brands <em>we build for.</em>
          </>
        }
        subtitle="A single account view for every brand we produce for — contacts, order history, billed revenue and the crew behind the relationship."
        actions={
          <button type="button" className="btn btn-amber" onClick={createNew}>
            <Plus size={15} /> Add client
          </button>
        }
      />

      <section className="summary-strip animate-up" style={{ animationDelay: "50ms" }}>
        <div className="summary-block">
          <span className="micro-label">Client portfolio</span>
          <strong>
            {clients.length} <span>BRANDS</span>
          </strong>
          <div className="summary-note">{industries.length} industries represented</div>
        </div>
        <div className="summary-block">
          <span className="micro-label">Active accounts</span>
          <strong>
            {stats.active} <span>LIVE</span>
          </strong>
          <div className="summary-note">Brands with live production orders</div>
        </div>
        <div className="summary-block">
          <span className="micro-label">Lifetime billed</span>
          <strong>
            {formatCompact(stats.revenue)} <span>UZS</span>
          </strong>
          <div className="summary-note">All client income recorded</div>
        </div>
        <div className="summary-block">
          <span className="micro-label">Average account</span>
          <strong>
            {formatCompact(stats.average)} <span>UZS</span>
          </strong>
          <div className="summary-note">Revenue per client</div>
        </div>
      </section>

      <div className="page-toolbar animate-up" style={{ animationDelay: "80ms" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <Search
            size={14}
            style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }}
          />
          <input
            className="input"
            style={{ height: 38, paddingLeft: 33, fontSize: 11 }}
            placeholder="Search brand, industry or contact…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search clients"
          />
        </div>
        <select className="select" style={{ width: "auto", height: 38, fontSize: 10.5 }} value={industry} onChange={(event) => setIndustry(event.target.value)}>
          <option value="all">All industries</option>
          {industries.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <span className="mono" style={{ fontSize: 8.5, color: "var(--color-muted)", marginLeft: "auto" }}>
          {filtered.length} clients
        </span>
      </div>

      {isLoading ? (
        <div className="client-grid">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => (
            <div className="card" key={item} style={{ height: 240, padding: 18 }}>
              <div className="skeleton" style={{ width: 43, height: 43, borderRadius: 12 }} />
              <div className="skeleton" style={{ width: "65%", height: 15, marginTop: 16 }} />
              <div className="skeleton" style={{ width: "40%", height: 9, marginTop: 8 }} />
              <div className="skeleton" style={{ height: 50, marginTop: 24 }} />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Building2 size={21} />}
            title="No clients in this view"
            description="Clear the filters or add a new brand to the portfolio."
            action={
              <button type="button" className="btn btn-primary" onClick={createNew}>
                <Plus size={14} /> Add client
              </button>
            }
          />
        </div>
      ) : (
        <div className="client-grid animate-up" style={{ animationDelay: "110ms" }}>
          {filtered.map((client) => {
            const clientOrders = orders.filter((order) => order.clientId === client.id);
            const active = clientOrders.filter((order) =>
              ["new", "design", "production", "install"].includes(order.status)
            );
            return (
              <article
                className="client-card"
                key={client.id}
                role="button"
                tabIndex={0}
                onClick={() => openClient(client.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") openClient(client.id);
                }}
              >
                <div className="client-card-head">
                  <span className="client-monogram">{initials(client.name)}</span>
                  <span className={`badge ${client.activeOrders ? "badge-active" : "badge-neutral"}`}>
                    <span className="status-dot" />
                    {client.activeOrders ? `${client.activeOrders} active` : "Inactive"}
                  </span>
                </div>

                <h3 className="client-name">{client.name}</h3>
                <div className="client-industry">{client.industry || "Industry not set"}</div>

                <div className="client-contact">
                  <strong>{client.contactName || "No main contact"}</strong>
                  {client.email || client.phone || "No contact details"}
                </div>

                <div className="client-finance">
                  <div>
                    <span>Billed</span>
                    <strong>{formatCompact(client.revenue)}</strong>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <span>Orders</span>
                    <strong>{client.orderCount}</strong>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span>Last payment</span>
                    <strong>{formatDate(client.lastPayment, "short").replace(", 2026", "")}</strong>
                  </div>
                </div>

                {active.length > 0 && (
                  <div className="client-orders">
                    {active.slice(0, 2).map((order) => (
                      <span className="client-order-pill" key={order.id}>
                        {order.name}
                      </span>
                    ))}
                    {active.length > 2 && <span className="client-order-pill">+{active.length - 2}</span>}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <ClientDrawer clientId={detailId} onClose={closeClient} onEdit={openEdit} />
      <ClientSheet
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        client={editing}
      />
    </div>
  );
}
