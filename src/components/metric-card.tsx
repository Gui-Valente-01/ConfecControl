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
      {/* O rótulo divide a linha com o ícone; o valor fica com a largura
          inteira do cartão. Antes ele disputava espaço com o ícone e sobravam
          115px para um "R$ 26.962,00" que precisa de 200: o break-words então
          partia o número no meio e os centavos caíam para a linha de baixo.

          whitespace-nowrap é o cinto de segurança: número quebrado não é só
          feio, é outro valor. Quem lê rápido vê "R$ 26.962" e ignora o resto. */}
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm font-medium text-muted">{label}</p>
        {Icon ? (
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
            <Icon size={20} aria-hidden="true" />
          </div>
        ) : null}
      </div>
      <p className="mt-2 whitespace-nowrap text-2xl font-semibold tracking-normal text-fg">
        {value}
      </p>
      <p className="mt-4 text-sm text-muted">{note}</p>
    </article>
  );
}
