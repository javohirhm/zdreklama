import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BriefcaseBusiness, CalendarDays, Mail, Phone } from "lucide-react";
import { api } from "../api";
import type { Worker } from "../types";
import { formatMoney } from "../lib/format";
import { t } from "../i18n";
import { invalidateData } from "../lib/invalidate";
import { Sheet } from "../components/Sheet";
import { useToast } from "../components/ToastProvider";

const departments = ["Operations", "Finance", "Production", "Sales", "Creative"];
const avatarColors = ["#2f6b4f", "#b16a3e", "#496d9c", "#8f5883", "#a07d2f", "#4d7868", "#aa5b4e", "#61718a", "#798c3f"];
const statuses = [
  { value: "active", label: t("Active") },
  { value: "on_leave", label: t("On leave") },
  { value: "inactive", label: t("Inactive") },
];

interface WorkerSheetProps {
  open: boolean;
  onClose: () => void;
  worker?: Worker | null;
}

export function WorkerSheet({ open, onClose, worker }: WorkerSheetProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({
    name: "",
    role: "",
    department: "Operations",
    phone: "",
    email: "",
    salary: "",
    status: "active",
    hireDate: "",
    avatarColor: "#2f6b4f",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm({
      name: worker?.name || "",
      role: worker?.role || "",
      department: worker?.department || "Operations",
      phone: worker?.phone || "",
      email: worker?.email || "",
      salary: worker ? String(worker.salary) : "",
      status: worker?.status || "active",
      hireDate: worker?.hireDate || "",
      avatarColor: worker?.avatarColor || "#2f6b4f",
    });
  }, [open, worker]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        salary: Number(form.salary) || 0,
      };
      if (worker) return api.updateWorker(worker.id, payload);
      return api.createWorker(payload);
    },
    onSuccess: () => {
      invalidateData(queryClient);
      toast.success(
        worker ? t("Profile updated") : t("Teammate added"),
        t("{name} is now part of the crew.", { name: form.name }),
      );
      onClose();
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim()) return setError(t("Enter the teammate's full name."));
    if (!form.role.trim()) return setError(t("Add their role or job title."));
    mutation.mutate();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={worker ? t("Edit team profile") : t("Add teammate")}
      subtitle={worker ? t("Keep contact details, role and salary current.") : t("Create a profile for a new member of the crew.")}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={mutation.isPending}>
            {t("Cancel")}
          </button>
          <div className="sheet-footer-actions">
            <button form="worker-form" type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? t("Saving…") : worker ? t("Save changes") : t("Add teammate")}
            </button>
          </div>
        </>
      }
    >
      <form id="worker-form" className="form-grid" onSubmit={submit}>
        <div className="field">
          <label className="field-label" htmlFor="worker-name">
            {t("Full name")}
          </label>
          <input
            id="worker-name"
            className="input"
            placeholder={t("e.g. Rustam Karimov")}
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            autoFocus
          />
        </div>

        <div className="form-grid-2">
          <div className="field">
            <label className="field-label" htmlFor="worker-role">
              {t("Role")}
            </label>
            <div style={{ position: "relative" }}>
              <BriefcaseBusiness
                size={13}
                style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }}
              />
              <input
                id="worker-role"
                className="input"
                style={{ paddingLeft: 31 }}
                placeholder={t("e.g. Installation Lead")}
                value={form.role}
                onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
              />
            </div>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="worker-department">
              {t("Department")}
            </label>
            <select
              id="worker-department"
              className="select"
              value={form.department}
              onChange={(event) => setForm((current) => ({ ...current, department: event.target.value }))}
            >
              {departments.map((department) => (
                <option key={department} value={department}>
                  {t(department)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-grid-2">
          <div className="field">
            <label className="field-label" htmlFor="worker-phone">
              {t("Phone")}
            </label>
            <div style={{ position: "relative" }}>
              <Phone
                size={13}
                style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }}
              />
              <input
                id="worker-phone"
                className="input"
                style={{ paddingLeft: 31 }}
                placeholder="+998 90 000 00 00"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </div>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="worker-email">
              {t("Email")}
            </label>
            <div style={{ position: "relative" }}>
              <Mail
                size={13}
                style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }}
              />
              <input
                id="worker-email"
                type="email"
                className="input"
                style={{ paddingLeft: 31 }}
                placeholder="name@zdreklama.uz"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
            </div>
          </div>
        </div>

        <div className="form-grid-2">
          <div className="field">
            <label className="field-label" htmlFor="worker-salary">
              {t("Monthly salary")}
            </label>
            <input
              id="worker-salary"
              className="input"
              inputMode="numeric"
              placeholder="0"
              value={form.salary}
              onChange={(event) => setForm((current) => ({ ...current, salary: event.target.value.replace(/[^\d]/g, "") }))}
            />
            <span className="field-hint">{form.salary ? formatMoney(Number(form.salary)) : t("Used for payroll entries.")}</span>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="worker-status">
              {t("Status")}
            </label>
            <select
              id="worker-status"
              className="select"
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
            >
              {statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-grid-2">
          <div className="field">
            <label className="field-label" htmlFor="worker-hire">
              {t("Hire date")}
            </label>
            <div style={{ position: "relative" }}>
              <CalendarDays
                size={13}
                style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)", pointerEvents: "none" }}
              />
              <input
                id="worker-hire"
                type="date"
                className="input"
                style={{ paddingLeft: 31 }}
                value={form.hireDate}
                onChange={(event) => setForm((current) => ({ ...current, hireDate: event.target.value }))}
              />
            </div>
          </div>
          <div className="field">
            <span className="field-label">{t("Profile colour")}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 7, height: 42, flexWrap: "wrap" }}>
              {avatarColors.map((color) => (
                <button
                  type="button"
                  key={color}
                  aria-label={t("Use profile colour {color}", { color })}
                  onClick={() => setForm((current) => ({ ...current, avatarColor: color }))}
                  style={{
                    width: 22,
                    height: 22,
                    border: form.avatarColor === color ? "2px solid var(--color-ink)" : "2px solid transparent",
                    outline: "1px solid rgba(0,0,0,.08)",
                    borderRadius: "50%",
                    background: color,
                    padding: 0,
                  }}
                />
              ))}
            </div>
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
          {t("Profiles connect order assignments, payroll history and material usage in one place.")}
        </div>
      </form>
    </Sheet>
  );
}
