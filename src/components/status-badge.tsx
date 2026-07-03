type StatusBadgeProps = {
  children: React.ReactNode;
  tone?: "good" | "warn" | "neutral" | "dark";
};

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  const tones = {
    good: "border-[#bfe4dc] bg-[#e8f6f3] text-[#05605e]",
    warn: "border-[#f1c0c9] bg-[#fff0f2] text-[#9f2f42]",
    neutral: "border-[#d9e1dd] bg-[#eef4f1] text-[#405047]",
    dark: "border-[#111a16] bg-[#111a16] text-white",
  };

  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-semibold leading-none ${tones[tone]}`}>
      {children}
    </span>
  );
}
