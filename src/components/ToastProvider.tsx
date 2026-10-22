import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
import { t } from "../i18n";

type ToastKind = "success" | "error";
type ToastItem = { id: number; kind: ToastKind; title: string; message?: string };

type ToastApi = {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback(
    (kind: ToastKind, title: string, message?: string) => {
      counter.current += 1;
      const id = counter.current;
      setToasts((current) => [...current.slice(-3), { id, kind, title, message }]);
      window.setTimeout(() => remove(id), 4200);
    },
    [remove]
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, message) => push("success", title, message),
      error: (title, message) => push("error", title, message),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="toast-stack" aria-live="polite">
          {toasts.map((toast) => (
            <div className={`toast ${toast.kind}`} key={toast.id}>
              <div className="toast-icon">
                {toast.kind === "success" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
              </div>
              <div style={{ flex: 1 }}>
                <div className="toast-title">{toast.title}</div>
                {toast.message && <div className="toast-message">{toast.message}</div>}
              </div>
              <button
                type="button"
                aria-label={t("Dismiss notification")}
                onClick={() => remove(toast.id)}
                style={{ border: 0, background: "transparent", color: "rgba(255,255,255,.35)", padding: 2 }}
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
