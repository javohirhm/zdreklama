import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, CircleDollarSign, Info } from "lucide-react";
import { api } from "../api";
import type { Material } from "../types";
import { formatMoney, formatNumber, todayIso } from "../lib/format";
import { invalidateData } from "../lib/invalidate";
import { Sheet } from "../components/Sheet";
import { useToast } from "../components/ToastProvider";
import { t } from "../i18n";

interface MovementSheetProps {
  open: boolean;
  onClose: () => void;
  material?: Material | null;
  mode: "in" | "out";
}

export function MovementSheet({ open, onClose, material, mode }: MovementSheetProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { data: materialsData } = useQuery({ queryKey: ["materials"], queryFn: api.materials, staleTime: 20_000 });
  const { data: bootstrap } = useQuery({ queryKey: ["bootstrap"], queryFn: api.bootstrap, staleTime: 60_000 });
  const materials = materialsData?.materials || [];

  const [form, setForm] = useState({
    type: mode,
    materialId: material ? String(material.id) : "",
    quantity: "",
    date: todayIso(),
    orderId: "",
    workerId: "",
    note: "",
    unitCost: material ? String(material.unitCost) : "",
    recordExpense: true,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm({
      type: mode,
      materialId: material ? String(material.id) : "",
      quantity: "",
      date: todayIso(),
      orderId: "",
      workerId: "",
      note: "",
      unitCost: material ? String(material.unitCost) : "",
      recordExpense: true,
    });
  }, [open, material, mode]);

  const selectedMaterial = materials.find((item) => String(item.id) === form.materialId) || material;
  const quantity = Number(form.quantity) || 0;
  const stockAfter = selectedMaterial
    ? form.type === "in"
      ? selectedMaterial.stock + quantity
      : selectedMaterial.stock - quantity
    : 0;
  const estimatedValue = quantity * (Number(form.unitCost) || selectedMaterial?.unitCost || 0);
  const willRecordExpense = form.type === "in" && form.recordExpense && estimatedValue > 0;

  const handleMaterialChange = (id: string) => {
    const next = materials.find((item) => String(item.id) === id);
    setForm((current) => ({
      ...current,
      materialId: id,
      unitCost: next ? String(next.unitCost) : current.unitCost,
    }));
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedMaterial) throw new Error(t("Choose a material first."));
      return api.createMovement(selectedMaterial.id, {
        type: form.type,
        quantity,
        date: form.date,
        orderId: form.orderId ? Number(form.orderId) : null,
        workerId: form.workerId ? Number(form.workerId) : null,
        note: form.note,
        unitCost: Number(form.unitCost) || selectedMaterial.unitCost,
        recordExpense: willRecordExpense,
        expenseAmount: estimatedValue,
        method: "Bank transfer",
      });
    },
    onSuccess: (result) => {
      invalidateData(queryClient);
      toast.success(
        form.type === "in" ? t("Stock received") : t("Material usage logged"),
        result.transaction
          ? t("{qty} {unit} added · {amount} recorded as an expense.", {
              qty: formatNumber(quantity, 1),
              unit: t(selectedMaterial?.unit || ""),
              amount: formatMoney(result.transaction.amount),
            })
          : t("{qty} {unit} of {name}.", {
              qty: formatNumber(quantity, 1),
              unit: t(selectedMaterial?.unit || ""),
              name: selectedMaterial?.name || "",
            })
      );
      onClose();
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!selectedMaterial) return setError(t("Choose a material."));
    if (!quantity || quantity <= 0) return setError(t("Quantity must be greater than zero."));
    if (form.type === "out" && quantity > selectedMaterial.stock) {
      return setError(
        t("Only {qty} {unit} in stock.", { qty: formatNumber(selectedMaterial.stock, 1), unit: t(selectedMaterial.unit) })
      );
    }
    mutation.mutate();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={form.type === "in" ? t("Receive stock") : t("Log material usage")}
      subtitle={form.type === "in" ? t("Bring new material into the workshop store.") : t("Assign material to an order and crew member.")}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={mutation.isPending}>
            {t("Cancel")}
          </button>
          <div className="sheet-footer-actions">
            <button form="movement-form" type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? t("Saving…") : form.type === "in" ? t("Receive stock") : t("Log usage")}
            </button>
          </div>
        </>
      }
    >
      <form id="movement-form" className="form-grid" onSubmit={submit}>
        <div className="type-toggle">
          <button
            type="button"
            className={`type-option ${form.type === "in" ? "active-in" : ""}`}
            onClick={() => setForm((current) => ({ ...current, type: "in" }))}
          >
            <span className="type-icon">
              <ArrowDownLeft size={15} />
            </span>
            <span>
              <strong>{t("Receive stock")}</strong>
              <span>{t("Add to inventory")}</span>
            </span>
          </button>
          <button
            type="button"
            className={`type-option ${form.type === "out" ? "active-out" : ""}`}
            onClick={() => setForm((current) => ({ ...current, type: "out" }))}
          >
            <span className="type-icon">
              <ArrowUpRight size={15} />
            </span>
            <span>
              <strong>{t("Use material")}</strong>
              <span>{t("Deduct from stock")}</span>
            </span>
          </button>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="movement-material">
            {t("Material")}
          </label>
          <select
            id="movement-material"
            className="select"
            value={form.materialId}
            onChange={(event) => handleMaterialChange(event.target.value)}
          >
            <option value="">{t("Choose material")}</option>
            {materials.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} — {t("{qty} {unit} available", { qty: formatNumber(item.stock, 1), unit: t(item.unit) })}
              </option>
            ))}
          </select>
        </div>

        {selectedMaterial && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 1,
              overflow: "hidden",
              border: "1px solid var(--color-line)",
              borderRadius: 10,
              background: "var(--color-line)",
            }}
          >
            <div style={{ background: "var(--color-paper-warm)", padding: "10px 12px" }}>
              <div className="micro-label">{t("In stock")}</div>
              <strong className="mono" style={{ fontSize: 12, fontWeight: 500 }}>
                {formatNumber(selectedMaterial.stock, 1)} {t(selectedMaterial.unit)}
              </strong>
            </div>
            <div style={{ background: "var(--color-paper-warm)", padding: "10px 12px" }}>
              <div className="micro-label">{t("Reorder at")}</div>
              <strong className="mono" style={{ fontSize: 12, fontWeight: 500 }}>
                {formatNumber(selectedMaterial.minStock, 1)} {t(selectedMaterial.unit)}
              </strong>
            </div>
            <div style={{ background: "var(--color-paper-warm)", padding: "10px 12px" }}>
              <div className="micro-label">{t("Unit cost")}</div>
              <strong className="mono" style={{ fontSize: 12, fontWeight: 500 }}>
                {formatMoney(selectedMaterial.unitCost, false)}
              </strong>
            </div>
          </div>
        )}

        <div className="form-grid-2">
          <div className="field">
            <label className="field-label" htmlFor="movement-quantity">
              {t("Quantity")}
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="movement-quantity"
                className="input"
                inputMode="decimal"
                placeholder="0"
                value={form.quantity}
                onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value.replace(/[^\d.]/g, "") }))}
                autoFocus
              />
              <span
                style={{
                  position: "absolute",
                  right: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: "var(--color-muted)",
                }}
              >
                {selectedMaterial?.unit ? t(selectedMaterial.unit) : t("unit")}
              </span>
            </div>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="movement-date">
              {t("Date")}
            </label>
            <input
              id="movement-date"
              type="date"
              className="input"
              value={form.date}
              onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
            />
          </div>
        </div>

        {selectedMaterial && quantity > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              padding: "10px 12px",
              border: "1px solid var(--color-line)",
              borderRadius: 9,
              background: form.type === "out" && stockAfter < 0 ? "var(--color-negative-soft)" : "var(--color-sage-light)",
            }}
          >
            <span style={{ fontSize: 9.5, color: "var(--color-muted)" }}>
              {t("Stock after this movement")}
            </span>
            <strong className="mono" style={{ fontSize: 11, fontWeight: 500, color: stockAfter < 0 ? "var(--color-negative)" : "var(--color-forest)" }}>
              {formatNumber(Math.max(0, stockAfter), 1)} {t(selectedMaterial.unit)}
            </strong>
          </div>
        )}

        <div className="form-grid-2">
          <div className="field">
            <label className="field-label" htmlFor="movement-order">
              {t("Order")} <span style={{ color: "var(--color-muted-light)", fontWeight: 500 }}>· {t("optional")}</span>
            </label>
            <select
              id="movement-order"
              className="select"
              value={form.orderId}
              onChange={(event) => setForm((current) => ({ ...current, orderId: event.target.value }))}
            >
              <option value="">{t("No order")}</option>
              {(bootstrap?.orders || []).map((order) => (
                <option key={order.id} value={order.id}>
                  {order.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="movement-worker">
              {t("Used by")} <span style={{ color: "var(--color-muted-light)", fontWeight: 500 }}>· {t("optional")}</span>
            </label>
            <select
              id="movement-worker"
              className="select"
              value={form.workerId}
              onChange={(event) => setForm((current) => ({ ...current, workerId: event.target.value }))}
            >
              <option value="">{t("Warehouse team")}</option>
              {(bootstrap?.workers || []).map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {form.type === "in" && (
          <>
            <div className="field">
              <label className="field-label" htmlFor="movement-cost">
                {t("Unit cost")}
              </label>
              <input
                id="movement-cost"
                className="input"
                inputMode="numeric"
                value={form.unitCost}
                onChange={(event) => setForm((current) => ({ ...current, unitCost: event.target.value.replace(/[^\d]/g, "") }))}
              />
              <span className="field-hint">{t("Updates the material's cost basis for stock valuation.")}</span>
            </div>
            <div className="checkbox-row">
              <input
                id="movement-expense"
                type="checkbox"
                checked={form.recordExpense}
                onChange={(event) => setForm((current) => ({ ...current, recordExpense: event.target.checked }))}
              />
              <div>
                <label htmlFor="movement-expense">{t("Record this purchase as a money-out entry")}</label>
                <p>
                  {estimatedValue > 0
                    ? t("A Materials expense of {amount} will be added to the ledger.", { amount: formatMoney(estimatedValue) })
                    : t("No expense is recorded while the unit cost is zero.")}
                </p>
              </div>
              <CircleDollarSign size={15} style={{ marginLeft: "auto", color: "var(--color-muted)", flexShrink: 0 }} />
            </div>
          </>
        )}

        <div className="field">
          <label className="field-label" htmlFor="movement-note">
            {t("Note")}
          </label>
          <input
            id="movement-note"
            className="input"
            placeholder={form.type === "in" ? t("e.g. Monthly ink replenishment") : t("e.g. Acrylic faces for Yuksak letters")}
            value={form.note}
            onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
          />
        </div>

        {error && <div className="form-error">{error}</div>}

        <div
          style={{
            display: "flex",
            gap: 7,
            alignItems: "center",
            padding: "10px 12px",
            border: "1px dashed var(--color-line-strong)",
            borderRadius: 9,
            fontSize: 9,
            color: "var(--color-muted)",
          }}
        >
          <Info size={12} />
          {t("Stock updates immediately; linked orders and team profiles will show this movement.")}
        </div>
      </form>
    </Sheet>
  );
}
