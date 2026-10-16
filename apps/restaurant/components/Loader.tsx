import type { ReactNode } from "react";

export function Loader({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  return <span className={`olive-loader olive-loader-${size}`} aria-hidden="true"><i /><i /><i /></span>;
}

export function LoadingState({ label, className = "", children }: { label: string; className?: string; children?: ReactNode }) {
  return <section className={`loading-state ${className}`.trim()} role="status" aria-live="polite" aria-busy="true" aria-label={label}>
    {children ?? <><Loader size="md" /><span>{label}</span></>}
    {children && <span className="sr-only">{label}</span>}
  </section>;
}
