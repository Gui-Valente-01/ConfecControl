type SectionCardProps = {
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
};

export function SectionCard({ eyebrow, title, children, action }: SectionCardProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-line bg-surface shadow-[var(--cc-shadow-soft)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider bg-canvas px-5 py-4">
        <div>
          {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{eyebrow}</p> : null}
          <h2 className="mt-0.5 text-lg font-semibold text-fg">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
