import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, CalendarDays, CircleDollarSign } from "lucide-react";
import { api } from "../api";
import type { Transaction, TransactionType } from "../types";
import { formatMoney, todayIso } from "../lib/format";
import { invalidateData } from "../lib/invalidate";
import { Sheet } from "../components/Sheet";
import { useToast } from "../components/ToastProvider";

export interface TransactionDefaults {
  type?: TransactionType;
  amount?: number;
  category?: string;
  description?: string;
  clientId?: number | null;
  orderId?: number | null;
  workerId?: number | null;
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
  method: string;
  reference: string;
  notes: string;
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
  const defaultsKey = JSON.stringify(defaults ?? {});

  useEffect(() => {
    if (!open) return;
    setError("");
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
        transaction ? "Entry updated" : form.type === "income" ? "Money in recorded" : "Money out recorded",
        transaction ? "The ledger has been refreshed." : `${formatMoney(Number(form.amount))} · ${form.category}`
      );
      onClose();
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  const categories = bootstrap?.categories?.[form.type] || fallbackCategories[form.type];
  const orders = bootstrap?.orders || [];
  const clients = bootstrap?.clients || [];
  const workers = bootstrap?.workers || [];
  const filteredOrders = form.clientId
    ? orders.filter((order) => String(order.clientId) === form.clientId)
    : orders;

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.amount || Number(form.amount) <= 0) return setError("Enter an amount greater than zero.");
    if (!form.description.trim()) return setError("Add a short description for this entry.");
    if (!form.category) return setError("Choose a category.");
    if (!form.date) return setError("Choose a date.");
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
      title={transaction ? "Edit ledger entry" : "Record money movement"}
      subtitle={transaction ? `Reference ${transaction.reference || `#${transaction.id}`}` : "Every sum in and out, in one clean ledger."}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </button>
          <div className="sheet-footer-actions">
            <button type="submit" form="transaction-form" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : transaction ? "Save changes" : "Record entry"}
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
              <strong>Money in</strong>
              <span>Client payment</span>
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
              <strong>Money out</strong>
              <span>Cost or payout</span>
            </span>
          </button>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="tx-amount">
            Amount
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
              UZS
            </span>
          </div>
          <span className="field-hint">
            {form.amount ? formatMoney(Number(form.amount)) : "Enter the full amount in Uzbek sum."}
          </span>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="tx-description">
            Description
          </label>
          <input
            id="tx-description"
            className="input"
            placeholder={form.type === "income" ? "e.g. Deposit — Yuksak Travel" : "e.g. Acrylic, LED modules and print"}
            value={form.description}
            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
          />
        </div>

        <div className="form-grid-2">
          <div className="field">
            <label className="field-label" htmlFor="tx-category">
              Category
            </label>
            <select
              id="tx-category"
              className="select"
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            >
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="tx-date">
              Date
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
            <label className="field-label" htmlFor="tx-order">
              Order <span style={{ color: "var(--color-muted-light)", fontWeight: 500 }}>· optional</span>
            </label>
            <select
              id="tx-order"
              className="select"
              value={form.orderId}
              onChange={(event) => handleOrderChange(event.target.value)}
            >
              <option value="">No order</option>
              {filteredOrders.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="tx-client">
              Client <span style={{ color: "var(--color-muted-light)", fontWeight: 500 }}>· optional</span>
            </label>
            <select
              id="tx-client"
              className="select"
              value={form.clientId}
              onChange={(event) => setForm((current) => ({ ...current, clientId: event.target.value, orderId: "" }))}
            >
              <option value="">No client</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-grid-2">
          <div className="field">
            <label className="field-label" htmlFor="tx-method">
              Payment method
            </label>
            <select
              id="tx-method"
              className="select"
              value={form.method}
              onChange={(event) => setForm((current) => ({ ...current, method: event.target.value }))}
            >
              {(bootstrap?.methods || ["Bank transfer", "Cash", "Card", "Cheque", "Other"]).map((method) => (
                <option key={method}>{method}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="tx-worker">
              Team member <span style={{ color: "var(--color-muted-light)", fontWeight: 500 }}>· optional</span>
            </label>
            <select
              id="tx-worker"
              className="select"
              value={form.workerId}
              onChange={(event) => setForm((current) => ({ ...current, workerId: event.target.value }))}
            >
              <option value="">No team member</option>
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
              Reference
            </label>
            <input
              id="tx-reference"
              className="input"
              placeholder="Invoice / receipt no."
              value={form.reference}
              onChange={(event) => setForm((current) => ({ ...current, reference: event.target.value }))}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="tx-notes">
              Note
            </label>
            <input
              id="tx-notes"
              className="input"
              placeholder="Optional context"
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
            ? "This will add to the money-in ledger and any linked order."
            : "This will count against operating expenses and any linked order."}
          <CircleDollarSign size={14} style={{ marginLeft: "auto" }} />
        </div>
      </form>
    </Sheet>
  );
}
