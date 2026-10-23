import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Check, Users } from "lucide-react";
import { api } from "../api";
import type { Order } from "../types";
import { formatMoney, todayIso } from "../lib/format";
import { invalidateData } from "../lib/invalidate";
import { Sheet } from "../components/Sheet";
import { Avatar } from "../components/Avatar";
import { useToast } from "../components/ToastProvider";
import { t } from "../i18n";

interface OrderSheetProps {
  open: boolean;
  onClose: () => void;
  order?: Order | null;
}

const products = [
  "Volumetric letters",
  "Facade sign",
  "Stela / pylon",
  "Lightbox",
  "LED display",
  "Car branding",
  "Banner / print",
  "Interior signage",
  "Other",
];

const statuses = [
  { value: "new", label: t("New request") },
  { value: "design", label: t("In design") },
  { value: "production", label: t("In production") },
  { value: "install", label: t("Ready to install") },
  { value: "completed", label: t("Completed") },
  { value: "cancelled", label: t("Cancelled") },
];

const priorities = [
  { value: "low", label: t("low") },
  { value: "normal", label: t("normal") },
  { value: "high", label: t("high") },
];

function emptyForm() {
  return {
    name: "",
    clientId: "",
    status: "new",
    product: "Volumetric letters",
    quote: "",
    site: "",
    orderDate: todayIso(),
    deadline: "",
    priority: "normal",
    managerId: "",
    notes: "",
  };
}

export function OrderSheet({ open, onClose, order }: OrderSheetProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: bootstrap } = useQuery({ queryKey: ["bootstrap"], queryFn: api.bootstrap, staleTime: 60_000 });
  const [form, setForm] = useState(emptyForm);
  const [workerIds, setWorkerIds] = useState<number[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (order) {
      setForm({
        name: order.name,
        clientId: order.clientId ? String(order.clientId) : "",
        status: order.status,
        product: order.product,
        quote: String(order.quote),
        site: order.site || "",
        orderDate: order.orderDate || "",
        deadline: order.deadline || "",
        priority: order.priority,
        managerId: order.managerId ? String(order.managerId) : "",
        notes: order.notes || "",
      });
      setWorkerIds(order.crew.map((worker) => worker.id));
    } else {
      setForm(emptyForm());
      setWorkerIds([]);
    }
  }, [open, order]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        clientId: Number(form.clientId),
        quote: Number(form.quote) || 0,
        managerId: form.managerId ? Number(form.managerId) : null,
        workerIds,
      };
      if (order) return api.updateOrder(order.id, payload);
      return api.createOrder(payload);
    },
    onSuccess: () => {
      invalidateData(queryClient);
      toast.success(order ? t("Order updated") : t("Order created"), t("{name} is now on the production board.", { name: form.name }));
      onClose();
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim()) return setError(t("Give the order a name."));
    if (!form.clientId) return setError(t("Choose the client account."));
    if (form.orderDate && form.deadline && form.deadline < form.orderDate) {
      return setError(t("The deadline cannot be before the order date."));
    }
    mutation.mutate();
  };

  const toggleWorker = (id: number) => {
    setWorkerIds((current) => (current.includes(id) ? current.filter((workerId) => workerId !== id) : [...current, id]));
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={order ? t("Edit order") : t("New order")}
      subtitle={order ? order.clientName : t("Set up the client, product, quote and crew for a new production order.")}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={mutation.isPending}>
            {t("Cancel")}
          </button>
          <div className="sheet-footer-actions">
            <button form="order-form" type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? t("Saving…") : order ? t("Save changes") : t("Create order")}
            </button>
          </div>
        </>
      }
    >
      <form id="order-form" className="form-grid" onSubmit={submit}>
        <div className="field">
          <label className="field-label" htmlFor="order-name">
            {t("Order name")}
          </label>
          <input
            id="order-name"
            className="input"
            placeholder={t("e.g. Yuksak Travel — illuminated letters")}
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            autoFocus
          />
        </div>

        <div className="form-grid-2">
          <div className="field">
            <label className="field-label" htmlFor="order-client">
              {t("Client")}
            </label>
            <select
              id="order-client"
              className="select"
              value={form.clientId}
              onChange={(event) => setForm((current) => ({ ...current, clientId: event.target.value }))}
            >
              <option value="">{t("Choose client")}</option>
              {(bootstrap?.clients || []).map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="order-product">
              {t("Product")}
            </label>
            <select
              id="order-product"
              className="select"
              value={form.product}
              onChange={(event) => setForm((current) => ({ ...current, product: event.target.value }))}
            >
              {products.map((product) => (
                <option key={product} value={product}>
                  {t(product)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-grid-2">
          <div className="field">
            <label className="field-label" htmlFor="order-quote">
              {t("Quote")}
            </label>
            <input
              id="order-quote"
              className="input"
              inputMode="numeric"
              placeholder="0"
              value={form.quote}
              onChange={(event) => setForm((current) => ({ ...current, quote: event.target.value.replace(/[^\d]/g, "") }))}
            />
            <span className="field-hint">{form.quote ? formatMoney(Number(form.quote)) : t("Agreed contract value in UZS.")}</span>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="order-status">
              {t("Production stage")}
            </label>
            <select
              id="order-status"
              className="select"
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            >
              {statuses.map((status) => (
                <option value={status.value} key={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="order-site">
            {t("Installation site")}
          </label>
          <input
            id="order-site"
            className="input"
            placeholder={t("e.g. Kokand, Temur Malik St. 14")}
            value={form.site}
            onChange={(event) => setForm((current) => ({ ...current, site: event.target.value }))}
          />
          <span className="field-hint">{t("Where the finished sign or branding will be installed.")}</span>
        </div>

        <div className="form-grid-2">
          <div className="field">
            <label className="field-label" htmlFor="order-date">
              {t("Order date")}
            </label>
            <input
              id="order-date"
              type="date"
              className="input"
              value={form.orderDate}
              onChange={(event) => setForm((current) => ({ ...current, orderDate: event.target.value }))}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="order-deadline">
              {t("Deadline")}
            </label>
            <input
              id="order-deadline"
              type="date"
              className="input"
              value={form.deadline}
              onChange={(event) => setForm((current) => ({ ...current, deadline: event.target.value }))}
            />
          </div>
        </div>

        <div className="form-grid-2">
          <div className="field">
            <label className="field-label" htmlFor="order-priority">
              {t("Priority")}
            </label>
            <select
              id="order-priority"
              className="select"
              value={form.priority}
              onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))}
            >
              {priorities.map((priority) => (
                <option value={priority.value} key={priority.value}>
                  {priority.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="order-manager">
              {t("Account manager")}
            </label>
            <select
              id="order-manager"
              className="select"
              value={form.managerId}
              onChange={(event) => setForm((current) => ({ ...current, managerId: event.target.value }))}
            >
              <option value="">{t("Unassigned")}</option>
              {(bootstrap?.workers || []).map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name} — {t(worker.role)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <span className="field-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Users size={12} /> {t("Production crew")}
          </span>
          <div className="chip-select">
            {(bootstrap?.workers || []).map((worker) => {
              const selected = workerIds.includes(worker.id);
              return (
                <button
                  type="button"
                  key={worker.id}
                  className={`chip-option ${selected ? "selected" : ""}`}
                  onClick={() => toggleWorker(worker.id)}
                >
                  {selected ? <Check size={10} /> : <Avatar name={worker.name} color={worker.avatarColor} size={15} />}
                  {worker.name}
                </button>
              );
            })}
          </div>
          <span className="field-hint">{t("Crew members appear on the order and team profiles.")}</span>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="order-notes">
            {t("Notes")}
          </label>
          <textarea
            id="order-notes"
            className="textarea"
            placeholder={t("Materials, lighting, site access, client sign-off…")}
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          />
        </div>

        {error && <div className="form-error">{error}</div>}

        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            padding: "11px 12px",
            border: "1px solid var(--color-line)",
            borderRadius: 9,
            background: "var(--color-paper-warm)",
            fontSize: 9.5,
            color: "var(--color-muted)",
          }}
        >
          <CalendarDays size={13} />
          {t("The order will appear on the production board, in the ledger and on team assignments.")}
        </div>
      </form>
    </Sheet>
  );
}
