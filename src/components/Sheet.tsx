import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  footerClassName?: string;
  header?: ReactNode;
  width?: number;
}

export function Sheet({ open, onClose, title, subtitle, children, footer, footerClassName, header, width = 535 }: SheetProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    const timer = window.setTimeout(() => {
      panelRef.current?.focus();
    }, 20);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", handleKey);
      window.clearTimeout(timer);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="sheet"
        style={{ width: `min(${width}px, 100vw)` }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={panelRef}
      >
        {header ?? (
          <header className="sheet-header">
            <div>
              <h2 className="sheet-title" id={titleId}>
                {title}
              </h2>
              {subtitle && <div className="sheet-subtitle">{subtitle}</div>}
            </div>
            <button type="button" className="sheet-close" onClick={onClose} aria-label="Close panel">
              <X size={16} />
            </button>
          </header>
        )}
        <div className="sheet-body">{children}</div>
        {footer && <footer className={`sheet-footer ${footerClassName ?? ""}`.trim()}>{footer}</footer>}
      </section>
    </div>,
    document.body
  );
}
