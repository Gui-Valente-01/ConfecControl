type SectionCardProps = {
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
};

export function SectionCard({ eyebrow, title, children, action }: SectionCardProps) {
  return (
    <section className="rounded-lg border border-[#ded7ca] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {eyebrow ? <p className="text-sm font-medium text-[#766d5d]">{eyebrow}</p> : null}
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
