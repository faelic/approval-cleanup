type Approval = {
  tokenSymbol: string;
  tokenAddress: string;
  tokenDecimals: number;
  spenderAddress: string;
  allowanceAmount: string;
  approvalAgeDays: number;
  approvalAgeLabel: string;
  riskLevel: "low" | "medium" | "high";
  riskReasons: string[];
  isUnlimited: boolean;
};

type ApprovalTableProps = {
  approvals: Approval[];
  onReview?: (approval: Approval) => void;
  onRevoke?: (approval: Approval) => void;
};

const riskStyles: Record<Approval["riskLevel"], string> = {
  low: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  high: "bg-red-500/10 text-red-700 dark:text-red-400",
};

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function ApprovalTable({
  approvals,
  onReview,
  onRevoke,
}: ApprovalTableProps) {
  if (approvals.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        No approvals to review yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border shadow-sm">
      <table className="w-full border-collapse">
        <thead className="bg-muted/50 text-left text-sm">
          <tr>
            <th className="px-4 py-3 font-medium">Token</th>
            <th className="px-4 py-3 font-medium">Spender</th>
            <th className="px-4 py-3 font-medium">Allowance</th>
            <th className="px-4 py-3 font-medium">Age</th>
            <th className="px-4 py-3 font-medium">Risk</th>
            <th className="px-4 py-3 font-medium">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y">
          {approvals.map((approval) => (
            <tr key={`${approval.tokenAddress}-${approval.spenderAddress}`} className="text-sm">
              <td className="px-4 py-3">
                <div className="font-medium">{approval.tokenSymbol}</div>
                <div className="text-xs text-muted-foreground">
                  {shortAddress(approval.tokenAddress)}
                </div>
              </td>

              <td className="px-4 py-3">
                <div>{shortAddress(approval.spenderAddress)}</div>
                {approval.isUnlimited ? (
                  <div className="text-xs text-amber-600">Unlimited approval</div>
                ) : null}
              </td>

              <td className="px-4 py-3">
                {approval.isUnlimited ? "Unlimited" : approval.allowanceAmount}
              </td>

              <td className="px-4 py-3">
                {approval.approvalAgeLabel}
              </td>

              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${riskStyles[approval.riskLevel]}`}
                >
                  {approval.riskLevel}
                </span>
                {approval.riskReasons.length > 0 ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {approval.riskReasons[0]}
                  </div>
                ) : null}
              </td>

              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onReview?.(approval)}
                    className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                  >
                    Review
                  </button>
                  <button
                    type="button"
                    onClick={() => onRevoke?.(approval)}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Manage
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
