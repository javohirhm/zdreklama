import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Mail, MapPin, Phone } from "lucide-react";
import { api } from "../api";
import type { Client } from "../types";
import { invalidateData } from "../lib/invalidate";
import { Sheet } from "../components/Sheet";
import { useToast } from "../components/ToastProvider";
import { t } from "../i18n";

interface ClientSheetProps {
  open: boolean;
  onClose: () => void;
  client?: Client | null;
}

export function ClientSheet({ open, onClose, client }: ClientSheetProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({
    name: "",
    industry: "",
    contactName: "",
    phone: "",
    email: "",
    address: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm({
      name: client?.name || "",
      industry: client?.industry || "",
      contactName: client?.contactName || "",
      phone: client?.phone || "",
      email: client?.email || "",
      address: client?.address || "",
    });
  }, [open, client]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (client) return api.updateClient(client.id, form);
      return api.createClient(form);
    },
    onSuccess: () => {
      invalidateData(queryClient);
      toast.success(
        client ? t("Client updated") : t("Client added"),
        t("{name} is now in the client portfolio.", { name: form.name })
      );
      onClose();
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim()) return setError(t("Enter the client or brand name."));
    mutation.mutate();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={client ? t("Edit client account") : t("New client account")}
      subtitle={client ? t("Keep the brand and contact details up to date.") : t("Set up the brand before attaching orders.")}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={mutation.isPending}>
            {t("Cancel")}
          </button>
          <div className="sheet-footer-actions">
            <button form="client-form" type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? t("Saving…") : client ? t("Save changes") : t("Add client")}
            </button>
          </div>
        </>
      }
    >
      <form id="client-form" className="form-grid" onSubmit={submit}>
        <div className="field">
          <label className="field-label" htmlFor="client-name">
            {t("Client / brand name")}
          </label>
          <div style={{ position: "relative" }}>
            <Building2
              size={13}
              style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }}
            />
            <input
              id="client-name"
              className="input"
              style={{ paddingLeft: 31 }}
              placeholder={t("e.g. Uzum Market")}
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              autoFocus
            />
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="client-industry">
            {t("Industry")}
          </label>
          <input
            id="client-industry"
            className="input"
            placeholder={t("e.g. E-commerce, Banking, FMCG")}
            value={form.industry}
            onChange={(event) => setForm((current) => ({ ...current, industry: event.target.value }))}
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="client-contact">
            {t("Main contact")}
          </label>
          <input
            id="client-contact"
            className="input"
            placeholder={t("e.g. Shahzod Ismoilov")}
            value={form.contactName}
            onChange={(event) => setForm((current) => ({ ...current, contactName: event.target.value }))}
          />
        </div>

        <div className="form-grid-2">
          <div className="field">
            <label className="field-label" htmlFor="client-phone">
              {t("Phone")}
            </label>
            <div style={{ position: "relative" }}>
              <Phone
                size={13}
                style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }}
              />
              <input
                id="client-phone"
                className="input"
                style={{ paddingLeft: 31 }}
                placeholder="+998 90 000 00 00"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </div>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="client-email">
              {t("Email")}
            </label>
            <div style={{ position: "relative" }}>
              <Mail
                size={13}
                style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }}
              />
              <input
                id="client-email"
                type="email"
                className="input"
                style={{ paddingLeft: 31 }}
                placeholder="marketing@brand.uz"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="client-address">
            {t("Address")}
          </label>
          <div style={{ position: "relative" }}>
            <MapPin
              size={13}
              style={{ position: "absolute", left: 11, top: "13px", color: "var(--color-muted)" }}
            />
            <input
              id="client-address"
              className="input"
              style={{ paddingLeft: 31 }}
              placeholder={t("Kokand, district")}
              value={form.address}
              onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
            />
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div
          style={{
            padding: "11px 12px",
            border: "1px solid var(--color-line)",
            borderRadius: 9,
            background: "var(--color-paper-warm)",
            fontSize: 9.5,
            color: "var(--color-muted)",
          }}
        >
          {t("The client account connects order revenue, invoices and the team working on the brand.")}
        </div>
      </form>
    </Sheet>
  );
}
