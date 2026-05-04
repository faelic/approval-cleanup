"use client";

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

type ApprovalReviewModalProps = {
  approval: Approval | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const riskStyles: Record<Approval["riskLevel"], string> = {
  low: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  high: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export default function ApprovalReviewModal({
  approval,
  open,
  onOpenChange,
}: ApprovalReviewModalProps) {
  if (!open || !approval) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Approval details</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Review the token, spender, and risk details before making changes.
            </p>
          </div>
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${riskStyles[approval.riskLevel]}`}
          >
            {approval.riskLevel}
          </span>
        </div>

        <div className="mt-6 space-y-4 text-sm">
          <div className="rounded-lg border p-4">
            <p className="font-medium">Token</p>
            <p className="mt-1">{approval.tokenSymbol}</p>
            <p className="text-xs text-muted-foreground">{approval.tokenAddress}</p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="font-medium">Spender</p>
            <p className="mt-1">{shortAddress(approval.spenderAddress)}</p>
            <p className="text-xs text-muted-foreground">{approval.spenderAddress}</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <p className="font-medium">Allowance</p>
              <p className="mt-1">
                {approval.isUnlimited ? "Unlimited" : approval.allowanceAmount}
              </p>
            </div>

            <div className="rounded-lg border p-4">
              <p className="font-medium">Approval age</p>
              <p className="mt-1">{approval.approvalAgeLabel}</p>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <p className="font-medium">Risk notes</p>
            {approval.riskReasons.length > 0 ? (
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                {approval.riskReasons.map((reason) => (
                  <li key={reason}>• {reason}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                No additional risk flags were triggered by the current rules.
              </p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
