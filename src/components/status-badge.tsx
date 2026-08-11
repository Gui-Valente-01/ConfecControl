type StatusBadgeProps = {
  children: React.ReactNode;
  tone?: "good" | "warn" | "neutral" | "dark";
};

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  const tones = {
    good: "border-primary/30 bg-primary-soft text-primary-dark",
    warn: "border-danger-line bg-danger-soft text-danger-dark",
    neutral: "border-line bg-tint text-body",
    dark: "border-ink bg-ink text-white",
  };

  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold leading-none ${tones[tone]}`}>
      {children}
    </span>
  );
}
