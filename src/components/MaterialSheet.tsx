import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Boxes, Info } from "lucide-react";
import { api } from "../api";
import type { Material } from "../types";
import { formatMoney } from "../lib/format";
import { invalidateData } from "../lib/invalidate";
import { Sheet } from "../components/Sheet";
import { useToast } from "../components/ToastProvider";
import { t } from "../i18n";

const categories = ["Vinyl", "Banner", "Ink", "Electrical", "Hardware", "Substrate", "Consumables", "Other"];
const units = ["sqm", "roll", "litre", "pcs", "set", "sheet", "m", "kg"];

interface MaterialSheetProps {
  open: boolean;
  onClose: () => void;
  material?: Material | null;
}

export function MaterialSheet({ open, onClose, material }: MaterialSheetProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({
    name: "",
    category: "Vinyl",
    unit: "sqm",
    stock: "",
    minStock: "",
    unitCost: "",
    supplier: "",
    location: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm({
      name: material?.name || "",
      category: material?.category || "Vinyl",
      unit: material?.unit || "sqm",
      stock: material ? String(material.stock) : "",
      minStock: material ? String(material.minStock) : "",
      unitCost: material ? String(material.unitCost) : "",
      supplier: material?.supplier || "",
      location: material?.location || "",
    });
  }, [open, material]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        unit: form.unit,
        stock: Number(form.stock) || 0,
        minStock: Number(form.minStock) || 0,
        unitCost: Number(form.unitCost) || 0,
        supplier: form.supplier,
        location: form.location,
      };
      if (material) return api.updateMaterial(material.id, payload);
      return api.createMaterial(payload);
    },
    onSuccess: () => {
      invalidateData(queryClient);
      toast.success(
        material ? t("Material updated") : t("Material added"),
        t("{name} is now tracked in inventory.", { name: form.name })
      );
      onClose();
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim()) return setError(t("Give the material a name."));
    if (!form.unit.trim()) return setError(t("Choose a unit of measure."));
    mutation.mutate();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={material ? t("Edit material") : t("New material")}
      subtitle={material ? t("Update the reorder level, cost or supplier.") : t("Add something the production team needs to track.")}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={mutation.isPending}>
            {t("Cancel")}
          </button>
          <div className="sheet-footer-actions">
            <button form="material-form" type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? t("Saving…") : material ? t("Save changes") : t("Add material")}
            </button>
          </div>
        </>
      }
    >
      <form id="material-form" className="form-grid" onSubmit={submit}>
        <div className="field">
          <label className="field-label" htmlFor="material-name">
            {t("Material name")}
          </label>
          <input
            id="material-name"
            className="input"
            placeholder={t("e.g. Cast vinyl — 1.27m × 50m")}
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            autoFocus
          />
        </div>

        <div className="form-grid-2">
          <div className="field">
            <label className="field-label" htmlFor="material-category">
              {t("Category")}
            </label>
            <select
              id="material-category"
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
            <label className="field-label" htmlFor="material-unit">
              {t("Unit")}
            </label>
            <select
              id="material-unit"
              className="select"
              value={form.unit}
              onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))}
            >
              {units.map((unit) => (
                <option key={unit} value={unit}>
                  {t(unit)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-grid-2">
          <div className="field">
            <label className="field-label" htmlFor="material-stock">
              {material ? t("Current stock") : t("Opening stock")}
            </label>
            <input
              id="material-stock"
              className="input"
              inputMode="decimal"
              placeholder="0"
              value={form.stock}
              onChange={(event) => setForm((current) => ({ ...current, stock: event.target.value.replace(/[^\d.]/g, "") }))}
              disabled={Boolean(material)}
            />
            {material && <span className="field-hint">{t("Adjust stock through a receive or usage movement.")}</span>}
          </div>
          <div className="field">
            <label className="field-label" htmlFor="material-min">
              {t("Reorder level")}
            </label>
            <input
              id="material-min"
              className="input"
              inputMode="decimal"
              placeholder="0"
              value={form.minStock}
              onChange={(event) => setForm((current) => ({ ...current, minStock: event.target.value.replace(/[^\d.]/g, "") }))}
            />
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="material-cost">
            {t("Unit cost")}
          </label>
          <input
            id="material-cost"
            className="input"
            inputMode="numeric"
            placeholder="0"
            value={form.unitCost}
            onChange={(event) => setForm((current) => ({ ...current, unitCost: event.target.value.replace(/[^\d]/g, "") }))}
          />
          <span className="field-hint">
            {form.unitCost
              ? t("{price} per {unit}", { price: formatMoney(Number(form.unitCost)), unit: t(form.unit) })
              : t("Used to value stock and cost usage.")}
          </span>
        </div>

        <div className="form-grid-2">
          <div className="field">
            <label className="field-label" htmlFor="material-supplier">
              {t("Supplier")}
            </label>
            <input
              id="material-supplier"
              className="input"
              placeholder={t("e.g. Uzprint Materials")}
              value={form.supplier}
              onChange={(event) => setForm((current) => ({ ...current, supplier: event.target.value }))}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="material-location">
              {t("Storage location")}
            </label>
            <input
              id="material-location"
              className="input"
              placeholder={t("e.g. Warehouse A")}
              value={form.location}
              onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
            />
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "11px 12px",
            border: "1px solid var(--color-line)",
            borderRadius: 9,
            background: "var(--color-paper-warm)",
            fontSize: 9.5,
            color: "var(--color-muted)",
          }}
        >
          <Info size={13} style={{ flexShrink: 0 }} />
          {t("Every stock movement updates this item instantly and appears in the order material log.")}
        </div>
      </form>
    </Sheet>
  );
}
