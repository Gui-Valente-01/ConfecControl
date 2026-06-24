type StatusBadgeProps = {
  children: React.ReactNode;
  tone?: "good" | "warn" | "neutral" | "dark";
};

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  const tones = {
    good: "bg-[#eef7f6] text-[#0f696b]",
    warn: "bg-[#fdecef] text-[#b23647]",
    neutral: "bg-[#f0e7d8] text-[#6f675b]",
    dark: "bg-[#1d1b16] text-white",
  };

  return <span className={`rounded-md px-2 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
