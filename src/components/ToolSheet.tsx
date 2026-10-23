import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { api } from "../api";
import type { CatalogTool } from "../types";
import { invalidateData } from "../lib/invalidate";
import { Sheet } from "../components/Sheet";
import { useToast } from "../components/ToastProvider";

interface ToolSheetProps {
  open: boolean;
  onClose: () => void;
  tool?: CatalogTool | null;
  kinds: string[];
}

export function ToolSheet({ open, onClose, tool, kinds }: ToolSheetProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [form, setForm] = useState({
    name: "",
    kind: "",
    notes: "",
    active: true,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    setForm({
      name: tool?.name || "",
      kind: tool?.kind || "",
      notes: tool?.notes || "",
      active: tool?.active ?? true,
    });
  }, [open, tool]);

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name.trim(),
        kind: form.kind.trim(),
        notes: form.notes.trim(),
        active: form.active,
      };
      if (tool) return api.updateTool(tool.id, payload);
      return api.createTool(payload);
    },
    onSuccess: (result) => {
      invalidateData(queryClient);
      const saved = "tool" in result ? result.tool : null;
      toast.success(
        tool ? "Tool updated" : "Tool added",
        `${saved?.name || form.name} is ready to tag on ledger entries.`
      );
      onClose();
    },
    onError: (mutationError: Error) => setError(mutationError.message),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Give the tool a name.");
    if (!form.kind.trim()) return setError("Add an equipment type, such as printer, plotter or CNC.");
    mutation.mutate();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={tool ? "Edit tool" : "New tool"}
      subtitle={
        tool
          ? "Update how this equipment appears on money entries."
          : "Add printers, plotters, routers, lifts or any other equipment."
      }
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </button>
          <div className="sheet-footer-actions">
            <button form="tool-form" type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving…" : tool ? "Save changes" : "Add tool"}
            </button>
          </div>
        </>
      }
    >
      <form id="tool-form" className="form-grid" onSubmit={submit}>
        <div className="field">
          <label className="field-label" htmlFor="tool-name">
            Tool / machine name
          </label>
          <input
            id="tool-name"
            className="input"
            placeholder="e.g. Large-format banner printer"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            autoFocus
          />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="tool-kind">
            Equipment type
          </label>
          <input
            id="tool-kind"
            className="input"
            list="tool-kind-options"
            placeholder="e.g. Printer"
            value={form.kind}
            onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value }))}
          />
          <datalist id="tool-kind-options">
            {kinds.map((kind) => (
              <option key={kind} value={kind} />
            ))}
          </datalist>
          <span className="field-hint">The category shown next to the tool on ledger entries.</span>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="tool-notes">
            Notes <span style={{ color: "var(--color-muted-light)", fontWeight: 500 }}>· optional</span>
          </label>
          <textarea
            id="tool-notes"
            className="textarea"
            placeholder="Width, capability, location or maintenance note."
            value={form.notes}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          />
        </div>

        <div className="checkbox-row">
          <input
            id="tool-active"
            type="checkbox"
            checked={form.active}
            onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
          />
          <label htmlFor="tool-active">
            Available for new ledger entries
            <p>Archived equipment stays attached to old entries but disappears from new entry pickers.</p>
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
          <Printer size={13} style={{ flexShrink: 0 }} />
          Every tool you add becomes available in the money entry form and the ledger.
        </div>
      </form>
    </Sheet>
  );
}
