"use client";

import { useState } from "react";

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

export type ApprovalAction =
  | { type: "revoke" }
  | { type: "set"; amount: string };

type RevokeModalProps = {
  approval: Approval | null;
  open: boolean;
  currentAllowanceLabel?: string;
  currentAllowanceLoading?: boolean;
  currentAllowanceError?: string | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (approval: Approval, action: ApprovalAction) => Promise<void> | void;
};

export default function RevokeModal({
  approval,
  open,
  currentAllowanceLabel,
  currentAllowanceLoading = false,
  currentAllowanceError,
  onOpenChange,
  onConfirm,
}: RevokeModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<ApprovalAction["type"]>("revoke");
  const [customAmount, setCustomAmount] = useState("");

  if (!open || !approval) return null;
  const selectedApproval = approval;
  const customAmountTrimmed = customAmount.trim();
  const customAmountInvalid =
    mode === "set" &&
    (!customAmountTrimmed || !/^\d*\.?\d+$/.test(customAmountTrimmed));

  async function handleConfirm() {
    if (customAmountInvalid) return;

    try {
      setSubmitting(true);
      await onConfirm(
        selectedApproval,
        mode === "revoke"
          ? { type: "revoke" }
          : { type: "set", amount: customAmountTrimmed }
      );
      setCustomAmount("");
      setMode("revoke");
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-lg">
        <h3 className="text-lg font-semibold">Manage approval</h3>

        <div className="mt-4 space-y-3 text-sm">
          <p>
            <span className="font-medium">Token:</span> {approval.tokenSymbol}
          </p>
          <p>
            <span className="font-medium">Spender:</span> {approval.spenderAddress}
          </p>
          <p>
            <span className="font-medium">Detected approval:</span>{" "}
            {approval.isUnlimited ? "Unlimited" : approval.allowanceAmount}
          </p>
          <p>
            <span className="font-medium">Current allowance:</span>{" "}
            {currentAllowanceLoading
              ? "Checking..."
              : currentAllowanceError
                ? "Unavailable"
                : currentAllowanceLabel || "Unknown"}
          </p>
          <p>
            <span className="font-medium">Age:</span> {approval.approvalAgeLabel}
          </p>
        </div>

        {currentAllowanceError ? (
          <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600">
            Could not verify the current live allowance. You can still continue, but the detected
            approval may be stale.
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
            <input
              type="radio"
              name="approval-action"
              value="revoke"
              checked={mode === "revoke"}
              onChange={() => setMode("revoke")}
              disabled={submitting}
              className="mt-0.5"
            />
            <div>
              <div className="font-medium">Revoke approval</div>
              <p className="text-muted-foreground">
                Set this spender&apos;s allowance to zero.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 rounded-md border p-3 text-sm">
            <input
              type="radio"
              name="approval-action"
              value="set"
              checked={mode === "set"}
              onChange={() => setMode("set")}
              disabled={submitting}
              className="mt-0.5"
            />
            <div className="w-full">
              <div className="font-medium">Set custom approval</div>
              <p className="text-muted-foreground">
                Reset to zero first, then set a new amount you choose.
              </p>
              {mode === "set" ? (
                <div className="mt-3 space-y-2">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={customAmount}
                    onChange={(event) => setCustomAmount(event.target.value)}
                    placeholder={`Amount in ${approval.tokenSymbol}`}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    disabled={submitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Uses {approval.tokenDecimals} token decimals and may require two wallet
                    confirmations.
                  </p>
                  {customAmountInvalid ? (
                    <p className="text-xs text-red-600">
                      Enter a valid token amount, for example 1 or 0.5
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </label>
        </div>

        <div className="mt-5 rounded-md border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-700">
          {mode === "revoke"
            ? "This will create a wallet transaction to revoke the approval."
            : "This will reset the approval to zero and then set a new allowance."}
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setCustomAmount("");
              setMode("revoke");
              onOpenChange(false);
            }}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            disabled={submitting || customAmountInvalid || currentAllowanceLoading}
          >
            {submitting ? "Submitting..." : mode === "revoke" ? "Confirm revoke" : "Set approval"}
          </button>
        </div>
      </div>
    </div>
  );
}
