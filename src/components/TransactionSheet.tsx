import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, CalendarDays, CircleDollarSign, UserPlus } from "lucide-react";
import { api } from "../api";
import type { Bootstrap, Transaction, TransactionType } from "../types";
import { formatMoney, todayIso } from "../lib/format";
import { invalidateData } from "../lib/invalidate";
import { Sheet } from "../components/Sheet";
import { useToast } from "../components/ToastProvider";
import { t } from "../i18n";

export interface TransactionDefaults {
  type?: TransactionType;
  amount?: number;
  category?: string;
  description?: string;
  clientId?: number | null;
  orderId?: number | null;
  workerId?: number | null;
  productId?: number | null;
  toolId?: number | null;
  date?: string;
  method?: string;
  notes?: string;
}

interface TransactionSheetProps {
  open: boolean;
  onClose: () => void;
  transaction?: Transaction | null;
  defaults?: TransactionDefaults;
}

interface FormState {
  type: TransactionType;
  amount: string;
  date: string;
  category: string;
  description: string;
  clientId: string;
  orderId: string;
  workerId: string;
  productId: string;
  toolId: string;
  method: string;
  reference: string;
  notes: string;
}

interface QuickClientForm {
  name: string;
  phone: string;
  contactName: string;
  industry: string;
}

function emptyQuickClient(): QuickClientForm {
  return { name: "", phone: "", contactName: "", industry: "" };
}

const fallbackCategories = {
  income: ["Order payment", "Deposit", "Design fee", "Installation fee", "Consulting", "Other"],
  expense: [
    "Materials",
    "Payroll",
    "Workshop rent",
    "Printing",
    "Fabrication",
    "Installation",
    "Transport",
    "Equipment",
    "Utilities",
    "Software",
    "Marketing",
    "Taxes",
    "Other",
  ],
};

function emptyForm(defaults?: TransactionDefaults): FormState {
  const type = defaults?.type || "income";
  return {
    type,
    amount: defaults?.amount ? String(defaults.amount) : "",
    date: defaults?.date || todayIso(),
    category: defaults?.category || (type === "income" ? "Order payment" : "Materials"),
    description: defaults?.description || "",
    clientId: defaults?.clientId ? String(defaults.clientId) : "",
    orderId: defaults?.orderId ? String(defaults.orderId) : "",
    workerId: defaults?.workerId ? String(defaults.workerId) : "",
    productId: defaults?.productId ? String(defaults.productId) : "",
    toolId: defaults?.toolId ? String(defaults.toolId) : "",
    method: defaults?.method || "Bank transfer",
    reference: "",
    notes: defaults?.notes || "",
  };
}

export function TransactionSheet({ open, onClose, transaction, defaults }: TransactionSheetProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: bootstrap } = useQuery({ queryKey: ["bootstrap"], queryFn: api.bootstrap, staleTime: 60_000 });
  const [form, setForm] = useState<FormState>(() => emptyForm(defaults));
  const [error, setError] = useState("");
  const [quickClientOpen, setQuickClientOpen] = useState(false);
  const [quickClient, setQuickClient] = useState<QuickClientForm>(emptyQuickClient);
  const [quickClientError, setQuickClientError] = useState("");
  const defaultsKey = JSON.stringify(defaults ?? {});

  useEffect(() => {
    if (!open) return;
    setError("");
    setQuickClientOpen(false);
    setQuickClient(emptyQuickClient());
    setQuickClientError("");
    if (transaction) {
      setForm({
        type: transaction.type,
        amount: String(transaction.amount),
        date: transaction.date,
        category: transaction.category,
        description: transaction.description,
        clientId: transaction.clientId ? String(transaction.clientId) : "",
        orderId: transaction.orderId ? String(transaction.orderId) : "",
        workerId: transaction.workerId ? String(transaction.workerId) : "",
        productId: transaction.productId ? String(transaction.productId) : "",
        toolId: transaction.toolId ? String(transaction.toolId) : "",
        method: transaction.method,
        reference: transaction.reference || "",
        notes: transaction.notes || "",
      });
    } else {
      setForm(emptyForm(defaults));
    }
    // defaultsKey keeps the form stable when callers pass a fresh defaults object.
  }, [open, transaction, defaultsKey]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        type: form.type,
        amount: Number(form.amount),
        date: form.date,
        category: form.category,
        description: form.description.trim(),
        clientId: form.clientId ? Number(form.clientId) : null,
        orderId: form.orderId ? Number(form.orderId) : null,
        workerId: form.workerId ? Number(form.workerId) : null,
        productId: form.productId ? Number(form.productId) : null,
        toolId: form.toolId ? Number(form.toolId) : null,
        method: form.method,
        reference: form.reference.trim(),
        notes: form.notes.trim(),
      };
      if (transaction) return api.updateTransaction(transaction.id, payload);
      return api.createTransaction(payload);
    },
    onSuccess: () => {
      invalidateData(queryClient);
      toast.success(
        transaction ? t("Entry updated") : form.type === "income" ? t("Money in recorded") : t("Money out recorded"),
        transaction ? t("The ledger has been refreshed.") : `${formatMoney(Number(form.amount))} · ${t(form.category)}`
      );
      onClose();
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  const quickClientMutation = useMutation({
    mutationFn: async () => {
      const name = quickClient.name.trim();
      if (!name) throw new Error(t("Enter the client or brand name."));
      const { client } = await api.createClient({
        name,
        phone: quickClient.phone.trim(),
        contactName: quickClient.contactName.trim(),
        industry: quickClient.industry.trim(),
      });
      return client;
    },
    onSuccess: (client) => {
      queryClient.setQueryData<Bootstrap>(["bootstrap"], (current) => {
        if (!current) return current;
        const clients = current.clients
          .filter((item) => item.id !== client.id)
          .concat({ id: client.id, name: client.name, industry: client.industry })
          .sort((a, b) => a.name.localeCompare(b.name));
        return { ...current, clients };
      });
      setForm((current) => ({ ...current, clientId: String(client.id), orderId: "" }));
      setQuickClient(emptyQuickClient());
      setQuickClientOpen(false);
      setQuickClientError("");
      invalidateData(queryClient);
      toast.success(t("Client added"), t("The client is selected for this entry."));
    },
    onError: (mutationError: Error) => setQuickClientError(mutationError.message),
  });

  const categories = bootstrap?.categories?.[form.type] || fallbackCategories[form.type];
  const orders = bootstrap?.orders || [];
  const clients = bootstrap?.clients || [];
  const workers = bootstrap?.workers || [];
  const products = (bootstrap?.products || []).filter(
    (product) => product.active || String(product.id) === form.productId
  );
  const tools = (bootstrap?.tools || []).filter((tool) => tool.active || String(tool.id) === form.toolId);
  const filteredOrders = form.clientId
    ? orders.filter((order) => String(order.clientId) === form.clientId)
    : orders;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.amount || Number(form.amount) <= 0) return setError(t("Enter an amount greater than zero."));
    if (!form.description.trim()) return setError(t("Add a short description for this entry."));
    if (!form.category) return setError(t("Choose a category."));
    if (!form.date) return setError(t("Choose a date."));
    mutation.mutate();
  };

  const setType = (type: TransactionType) => {
    const nextCategories = bootstrap?.categories?.[type] || fallbackCategories[type];
    setForm((current) => ({
      ...current,
      type,
      category: nextCategories.includes(current.category)
        ? current.category
        : type === "income"
          ? "Order payment"
          : "Materials",
    }));
  };

  const handleOrderChange = (value: string) => {
    const order = orders.find((item) => String(item.id) === value);
    setForm((current) => ({
      ...current,
      orderId: value,
      clientId: order?.clientId ? String(order.clientId) : current.clientId,
    }));
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={transaction ? t("Edit ledger entry") : t("Record money movement")}
      subtitle={
        transaction
          ? t("Reference {ref}", { ref: transaction.reference || `#${transaction.id}` })
          : t("Every sum in and out, in one clean ledger.")
      }
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={mutation.isPending}>
            {t("Cancel")}
          </button>
          <div className="sheet-footer-actions">
            <button type="submit" form="transaction-form" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? t("Saving…") : transaction ? t("Save changes") : t("Record entry")}
            </button>
          </div>
        </>
      }
    >
      <form id="transaction-form" className="form-grid" onSubmit={handleSubmit}>
        <div className="type-toggle">
          <button
            type="button"
            className={`type-option ${form.type === "income" ? "active-in" : ""}`}
            onClick={() => setType("income")}
          >
            <span className="type-icon">
              <ArrowDownLeft size={15} />
            </span>
            <span>
              <strong>{t("Money in")}</strong>
              <span>{t("Client payment")}</span>
            </span>
          </button>
          <button
            type="button"
            className={`type-option ${form.type === "expense" ? "active-out" : ""}`}
            onClick={() => setType("expense")}
          >
            <span className="type-icon">
              <ArrowUpRight size={15} />
            </span>
            <span>
              <strong>{t("Money out")}</strong>
              <span>{t("Cost or payout")}</span>
            </span>
          </button>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="tx-amount">
            {t("Amount")}
          </label>
          <div style={{ position: "relative" }}>
            <input
              id="tx-amount"
              className="input money"
              style={{ paddingRight: 58 }}
              inputMode="numeric"
              placeholder="0"
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value.replace(/[^\d]/g, "") }))}
              autoFocus
            />
            <span
              style={{
                position: "absolute",
                right: 13,
                top: "50%",
                transform: "translateY(-50%)",
                fontFamily: "var(--font-mono)",
                fontSize: 9,
                color: "var(--color-muted)",
                letterSpacing: ".06em",
              }}
            >
              {t("UZS")}
            </span>
          </div>
          <span className="field-hint">
            {form.amount ? formatMoney(Number(form.amount)) : t("Enter the full amount in Uzbek sum.")}
          </span>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="tx-description">
            {t("Description")}
          </label>
          <input
            id="tx-description"
            className="input"
            placeholder={form.type === "income" ? t("e.g. Deposit — Yuksak Travel") : t("e.g. Acrylic, LED modules and print")}
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
        </div>

        <div className="form-grid-2">
          <div className="field">
            <label className="field-label" htmlFor="tx-category">
              {t("Category")}
            </label>
            <select
              id="tx-category"
              className="select"
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {t(category)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="tx-date">
              {t("Date")}
            </label>
            <input
              id="tx-date"
              type="date"
              className="input"
              value={form.date}
              onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
            />
          </div>
        </div>

        <div className="form-grid-2">
          <div className="field">
            <label className="field-label" htmlFor="tx-product">
              {t("Product / service")}{" "}
              <span style={{ color: "var(--color-muted-light)", fontWeight: 500 }}>· {t("what was made")}</span>
            </label>
            <select
              id="tx-product"
              className="select"
              value={form.productId}
              onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))}
            >
              <option value="">{t("No product tagged")}</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} — {product.category}
                  {product.active ? "" : ` ${t("(archived)")}`}
                </option>
              ))}
            </select>
            <span className="field-hint">
              {products.length
                ? t("Pick from the Products catalog.")
                : t("Add your products in the Products section.")}
            </span>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="tx-tool">
              {t("Tool / machine")}{" "}
              <span style={{ color: "var(--color-muted-light)", fontWeight: 500 }}>· {t("optional")}</span>
            </label>
            <select
              id="tx-tool"
              className="select"
              value={form.toolId}
              onChange={(event) => setForm((current) => ({ ...current, toolId: event.target.value }))}
            >
              <option value="">{t("No tool tagged")}</option>
              {tools.map((tool) => (
                <option key={tool.id} value={tool.id}>
                  {tool.name} — {tool.kind}
                  {tool.active ? "" : ` ${t("(archived)")}`}
                </option>
              ))}
            </select>
            <span className="field-hint">
              {tools.length
                ? t("Plotter, printer, router or other equipment.")
                : t("Add your equipment in the Products section.")}
            </span>
          </div>
        </div>

        <div className="form-grid-2">
          <div className="field">
            <label className="field-label" htmlFor="tx-order">
              {t("Order")} <span style={{ color: "var(--color-muted-light)", fontWeight: 500 }}>· {t("optional")}</span>
            </label>
            <select
              id="tx-order"
              className="select"
              value={form.orderId}
              onChange={(event) => handleOrderChange(event.target.value)}
            >
              <option value="">{t("No order")}</option>
              {filteredOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <div className="field-label-row">
              <label className="field-label" htmlFor="tx-client">
                {t("Client")} <span style={{ color: "var(--color-muted-light)", fontWeight: 500 }}>· {t("optional")}</span>
              </label>
              {!quickClientOpen && (
                <button
                  type="button"
                  className="field-label-action"
                  onClick={() => {
                    setQuickClientOpen(true);
                    setQuickClientError("");
                  }}
                >
                  <UserPlus size={11} />
                  {t("Add client")}
                </button>
              )}
            </div>
            <select
              id="tx-client"
              className="select"
              value={form.clientId}
              onChange={(event) => {
                setForm((current) => ({ ...current, clientId: event.target.value, orderId: "" }));
                setQuickClientOpen(false);
                setQuickClientError("");
              }}
            >
              <option value="">{t("No client")}</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
            <span className="field-hint">{t("Pick an existing client or add a new one.")}</span>
          </div>
        </div>

        {quickClientOpen && (
          <div
            className="quick-client"
            id="quick-client-fields"
            role="group"
            aria-labelledby="quick-client-title"
            onKeyDown={(event) => {
              if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
              if ((event.target as HTMLElement).tagName !== "INPUT") return;
              event.preventDefault();
              if (!quickClientMutation.isPending) quickClientMutation.mutate();
            }}
          >
            <div className="quick-client-head">
              <div className="quick-client-title" id="quick-client-title">
                {t("New client account")}
              </div>
              <div className="quick-client-subtitle">
                {t("Add the client here, then finish this money entry.")}
              </div>
            </div>

            <div className="form-grid-2">
              <div className="field">
                <label className="field-label" htmlFor="tx-new-client-name">
                  {t("Client / brand name")}
                </label>
                <input
                  id="tx-new-client-name"
                  className="input"
                  placeholder={t("e.g. Uzum Market")}
                  value={quickClient.name}
                  onChange={(event) =>
                    setQuickClient((current) => ({ ...current, name: event.target.value }))
                  }
                  autoFocus
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="tx-new-client-phone">
                  {t("Phone")}{" "}
                  <span style={{ color: "var(--color-muted-light)", fontWeight: 500 }}>· {t("optional")}</span>
                </label>
                <input
                  id="tx-new-client-phone"
                  className="input"
                  placeholder="+998 90 000 00 00"
                  value={quickClient.phone}
                  onChange={(event) =>
                    setQuickClient((current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="form-grid-2">
              <div className="field">
                <label className="field-label" htmlFor="tx-new-client-contact">
                  {t("Main contact")}{" "}
                  <span style={{ color: "var(--color-muted-light)", fontWeight: 500 }}>· {t("optional")}</span>
                </label>
                <input
                  id="tx-new-client-contact"
                  className="input"
                  placeholder={t("e.g. Shahzod Ismoilov")}
                  value={quickClient.contactName}
                  onChange={(event) =>
                    setQuickClient((current) => ({ ...current, contactName: event.target.value }))
                  }
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="tx-new-client-industry">
                  {t("Industry")}{" "}
                  <span style={{ color: "var(--color-muted-light)", fontWeight: 500 }}>· {t("optional")}</span>
                </label>
                <input
                  id="tx-new-client-industry"
                  className="input"
                  placeholder={t("e.g. E-commerce, Banking, FMCG")}
                  value={quickClient.industry}
                  onChange={(event) =>
                    setQuickClient((current) => ({ ...current, industry: event.target.value }))
                  }
                />
              </div>
            </div>

            {quickClientError && <div className="form-error">{quickClientError}</div>}

            <div className="quick-client-actions">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setQuickClientOpen(false);
                  setQuickClient(emptyQuickClient());
                  setQuickClientError("");
                }}
                disabled={quickClientMutation.isPending}
              >
                {t("Cancel")}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => quickClientMutation.mutate()}
                disabled={quickClientMutation.isPending}
              >
                <UserPlus size={12} />
                {quickClientMutation.isPending ? t("Saving…") : t("Create and select")}
              </button>
            </div>
          </div>
        )}

        <div className="form-grid-2">
          <div className="field">
            <label className="field-label" htmlFor="tx-method">
              {t("Payment method")}
            </label>
            <select
              id="tx-method"
              className="select"
              value={form.method}
              onChange={(event) => setForm((current) => ({ ...current, method: event.target.value }))}
            >
              {(bootstrap?.methods || ["Bank transfer", "Cash", "Card", "Cheque", "Other"]).map((method) => (
                <option key={method} value={method}>
                  {t(method)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="tx-worker">
              {t("Team member")} <span style={{ color: "var(--color-muted-light)", fontWeight: 500 }}>· {t("optional")}</span>
            </label>
            <select
              id="tx-worker"
              className="select"
              value={form.workerId}
              onChange={(event) => setForm((current) => ({ ...current, workerId: event.target.value }))}
            >
              <option value="">{t("No team member")}</option>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-grid-2">
          <div className="field">
            <label className="field-label" htmlFor="tx-reference">
              {t("Reference")}
            </label>
            <input
              id="tx-reference"
              className="input"
              placeholder={t("Invoice / receipt no.")}
              value={form.reference}
              onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="tx-notes">
              {t("Note")}
            </label>
            <input
              id="tx-notes"
              className="input"
              placeholder={t("Optional context")}
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 13px",
            border: "1px solid var(--color-line)",
            borderRadius: 10,
            background: "var(--color-paper-warm)",
            color: "var(--color-muted)",
            fontSize: 9.5,
          }}
        >
          <CalendarDays size={14} />
          {form.type === "income"
            ? t("This will add to the money-in ledger and any linked order.")
            : t("This will count against operating expenses and any linked order.")}
          <CircleDollarSign size={14} style={{ marginLeft: "auto" }} />
        </div>
      </form>
    </Sheet>
  );
}
