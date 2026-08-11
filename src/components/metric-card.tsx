import type { LucideIcon } from "lucide-react";

type MetricTone = "primary" | "danger" | "warning" | "info" | "neutral";

type MetricCardProps = {
  label: string;
  value: string;
  note: string;
  icon?: LucideIcon;
  tone?: MetricTone;
};

const toneClasses: Record<MetricTone, string> = {
  primary: "bg-primary text-white",
  danger: "bg-danger text-white",
  warning: "bg-warning text-white",
  info: "bg-info text-white",
  neutral: "bg-tint text-body",
};

export function MetricCard({ label, value, note, icon: Icon, tone = "primary" }: MetricCardProps) {
  return (
    <article className="rounded-lg border border-line bg-surface p-5 shadow-[var(--cc-shadow-soft)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-2 break-words text-2xl font-semibold tracking-normal text-fg sm:text-3xl">
            {value}
          </p>
        </div>
        {Icon ? (
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
            <Icon size={20} aria-hidden="true" />
          </div>
        ) : null}
      </div>
      <p className="mt-4 text-sm text-muted">{note}</p>
    </article>
  );
}
