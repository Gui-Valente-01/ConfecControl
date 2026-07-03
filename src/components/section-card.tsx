type SectionCardProps = {
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
};

export function SectionCard({ eyebrow, title, children, action }: SectionCardProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-[#d9e1dd] bg-white shadow-[var(--cc-shadow-soft)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf2ef] bg-[#fbfcfb] px-5 py-4">
        <div>
          {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#63736b]">{eyebrow}</p> : null}
          <h2 className="mt-0.5 text-lg font-semibold text-[#1c2420]">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
