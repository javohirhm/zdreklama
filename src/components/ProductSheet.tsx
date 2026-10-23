import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { api } from "../api";
import type { CatalogProduct } from "../types";
import { invalidateData } from "../lib/invalidate";
import { Sheet } from "../components/Sheet";
import { useToast } from "../components/ToastProvider";
import { t } from "../i18n";

interface ProductSheetProps {
  open: boolean;
  onClose: () => void;
  product?: CatalogProduct | null;
  categories: string[];
  units: string[];
}

export function ProductSheet({ open, onClose, product, categories, units }: ProductSheetProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({
    name: "",
    category: "",
    unit: "sqm",
    notes: "",
    active: true,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm({
      name: product?.name || "",
      category: product?.category || "",
      unit: product?.unit || "sqm",
      notes: product?.notes || "",
      active: product?.active ?? true,
    });
  }, [open, product]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        category: form.category.trim(),
        unit: form.unit.trim(),
        notes: form.notes.trim(),
        active: form.active,
      };
      if (product) return api.updateProduct(product.id, payload);
      return api.createProduct(payload);
    },
    onSuccess: (result) => {
      invalidateData(queryClient);
      const saved = "product" in result ? result.product : null;
      toast.success(
        product ? t("Product updated") : t("Product added"),
        t("{name} is ready to tag on ledger entries.", { name: saved?.name || form.name })
      );
      onClose();
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim()) return setError(t("Give the product a name."));
    if (!form.category.trim()) return setError(t("Add a product type, such as banner, lightbox or print."));
    if (!form.unit.trim()) return setError(t("Add a unit, such as sqm, set or pcs."));
    mutation.mutate();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={product ? t("Edit product") : t("New product")}
      subtitle={
        product
          ? t("Update how this product appears when recording money.")
          : t("Add anything the workshop sells or produces. You choose the type.")
      }
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={mutation.isPending}>
            {t("Cancel")}
          </button>
          <div className="sheet-footer-actions">
            <button form="product-form" type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? t("Saving…") : product ? t("Save changes") : t("Add product")}
            </button>
          </div>
        </>
      }
    >
      <form id="product-form" className="form-grid" onSubmit={submit}>
        <div className="field">
          <label className="field-label" htmlFor="product-name">
            {t("Product name")}
          </label>
          <input
            id="product-name"
            className="input"
            placeholder={t("e.g. Outdoor banner — flex 440g")}
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            autoFocus
          />
        </div>

        <div className="form-grid-2">
          <div className="field">
            <label className="field-label" htmlFor="product-category">
              {t("Product type")}
            </label>
            <input
              id="product-category"
              className="input"
              list="product-category-options"
              placeholder={t("e.g. Banner / print")}
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
            />
            <datalist id="product-category-options">
              {categories.map((category) => (
                <option key={category} value={category} />
              ))}
            </datalist>
            <span className="field-hint">{t("Type anything your team uses.")}</span>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="product-unit">
              {t("Unit")}
            </label>
            <input
              id="product-unit"
              className="input"
              list="product-unit-options"
              placeholder={t("e.g. sqm")}
              value={form.unit}
              onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))}
            />
            <datalist id="product-unit-options">
              {units.map((unit) => (
                <option key={unit} value={unit} />
              ))}
            </datalist>
            <span className="field-hint">{t("How you normally count it.")}</span>
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="product-notes">
            {t("Notes")} <span style={{ color: "var(--color-muted-light)", fontWeight: 500 }}>· {t("optional")}</span>
          </label>
          <textarea
            id="product-notes"
            className="textarea"
            placeholder={t("Material, finish or anything the team should know.")}
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          />
        </div>

        <div className="checkbox-row">
          <input
            id="product-active"
            type="checkbox"
            checked={form.active}
            onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
          />
          <label htmlFor="product-active">
            {t("Available for new ledger entries")}
            <p>{t("Archived products stay attached to old entries but disappear from new entry pickers.")}</p>
          </label>
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
          <Package size={13} style={{ flexShrink: 0 }} />
          {t("Products are yours to define. The list appears in every money-in and money-out entry.")}
        </div>
      </form>
    </Sheet>
  );
}
