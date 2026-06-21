import type { ReactNode } from "react";

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-raised ${className}`}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  eyebrow,
  title,
  description,
  right,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
      <div>
        {eyebrow && (
          <p className="label-caps mb-1.5 text-[11px] text-accent">
            {eyebrow}
          </p>
        )}
        <h2 className="text-[15px] font-semibold text-primary">{title}</h2>
        {description && (
          <p className="mt-1 max-w-md text-sm leading-relaxed text-secondary">
            {description}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label className="label-caps text-[11px] text-dim">{label}</label>
        {hint && <span className="text-[11px] text-dim">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

export function Input(
  props: React.InputHTMLAttributes<HTMLInputElement>,
) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={`data-mono w-full rounded-lg border border-border bg-raised-2 px-3.5 py-2.5 text-sm text-primary placeholder:text-dim focus:border-accent-dim focus:outline-none focus:ring-1 focus:ring-accent-dim/40 ${className}`}
    />
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...rest
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus:outline-none focus:ring-1 focus:ring-offset-0";

  const variants: Record<string, string> = {
    primary:
      "bg-accent text-[#06201c] hover:bg-accent-dim focus:ring-accent-dim",
    secondary:
      "border border-border bg-raised-2 text-primary hover:border-dim focus:ring-dim",
    danger:
      "bg-danger text-[#2a0a10] hover:opacity-90 focus:ring-danger",
    ghost: "text-secondary hover:text-primary",
  };

  return (
    <button {...rest} className={`${base} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

export function StatusPill({
  state,
  label,
}: {
  state: "online" | "offline" | "pending";
  label: string;
}) {
  const colors: Record<string, string> = {
    online: "bg-accent",
    offline: "bg-danger",
    pending: "bg-warn",
  };
  return (
    <div className="flex items-center gap-2 rounded-full border border-border bg-raised-2 px-3 py-1.5">
      <span
        className={`h-1.5 w-1.5 rounded-full ${colors[state]} ${
          state === "online" ? "pulse-dot" : ""
        }`}
      />
      <span className="label-caps text-[11px] text-secondary">{label}</span>
    </div>
  );
}

export function Callout({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "accent" | "danger" | "warn";
  children: ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: "border-border bg-raised-2 text-secondary",
    accent: "border-accent-dim/30 bg-accent-soft text-accent",
    danger: "border-danger/30 bg-danger-soft text-danger",
    warn: "border-warn/30 bg-raised-2 text-warn",
  };
  return (
    <div
      className={`rounded-lg border px-4 py-3 text-[13px] leading-relaxed ${tones[tone]}`}
    >
      {children}
    </div>
  );
}
