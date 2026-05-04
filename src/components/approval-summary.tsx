type ApprovalSummaryProps = {
  total: number;
  risky: number;
  unlimited: number;
  stale: number;
};

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "warning" | "danger" | "info";
}) {
  const toneClasses = {
    default: "border-border bg-background",
    warning: "border-amber-500/30 bg-amber-500/5",
    danger: "border-red-500/30 bg-red-500/5",
    info: "border-sky-500/30 bg-sky-500/5",
  };

  return (
    <div className={`rounded-xl border p-5 shadow-sm ${toneClasses[tone]}`}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export default function ApprovalSummary({
  total,
  risky,
  unlimited,
  stale,
}: ApprovalSummaryProps) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <SummaryCard label="Total approvals" value={total} tone="default" />
      <SummaryCard label="Risky approvals" value={risky} tone="danger" />
      <SummaryCard label="Unlimited approvals" value={unlimited} tone="warning" />
      <SummaryCard label="Stale approvals" value={stale} tone="info" />
    </section>
  );
}
