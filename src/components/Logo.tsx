import type { ReactNode } from "react";

export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="7" y="12" width="34" height="24" rx="2.5" stroke="currentColor" strokeWidth="2.2" />
      <path d="M14 7.5v4.5M34 7.5v4.5M18 41l6-6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M14 20h20M14 26h12" stroke="#e8a326" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header animate-up">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="header-actions">{actions}</div>}
    </header>
  );
}
