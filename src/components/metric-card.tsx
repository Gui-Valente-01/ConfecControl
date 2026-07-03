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
  primary: "bg-[#087f7d] text-white",
  danger: "bg-[#c43f54] text-white",
  warning: "bg-[#c88a2b] text-white",
  info: "bg-[#5b68d8] text-white",
  neutral: "bg-[#eef4f1] text-[#405047]",
};

export function MetricCard({ label, value, note, icon: Icon, tone = "primary" }: MetricCardProps) {
  return (
    <article className="rounded-lg border border-[#d9e1dd] bg-white p-5 shadow-[var(--cc-shadow-soft)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#63736b]">{label}</p>
          <p className="mt-2 break-words text-2xl font-semibold tracking-normal text-[#1c2420] sm:text-3xl">
            {value}
          </p>
        </div>
        {Icon ? (
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
            <Icon size={20} aria-hidden="true" />
          </div>
        ) : null}
      </div>
      <p className="mt-4 text-sm text-[#66756d]">{note}</p>
    </article>
  );
}
