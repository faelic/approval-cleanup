"use client";

import { useEffect, useMemo, useState } from "react";
import { formatUnits, parseUnits, type Address } from "viem";
import { useAccount, useChainId, usePublicClient, useWalletClient } from "wagmi";
import ApprovalSummary from "@/components/approval-summary";
import ApprovalTable from "@/components/approval-table";
import ApprovalReviewModal from "@/components/approval-review-modal";
import RevokeModal, { type ApprovalAction } from "@/components/revoke-modal";
import TxStatus from "@/components/tx-status";
import { supportedChains } from "@/lib/chains";
import { readAllowance, revokeAllowance, setAllowance } from "@/lib/revoke";
import { getFriendlyTransactionErrorMessage } from "@/lib/transaction-errors";

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

type ApprovalsResponse = {
  success: boolean;
  count: number;
  approvals: Approval[];
  scanWindow: {
    fromBlock: number;
    toBlock: number;
    lookbackBlocks: number;
    isRecentOnly: boolean;
  };
  error?: string;
};


type TxStatusState = "idle" | "pending" | "success" | "error";
const MAX_UINT256 = (BigInt(1) << BigInt(256)) - BigInt(1);

function formatTokenAmount(amount: bigint, decimals: number) {
  if (amount === MAX_UINT256) return "Unlimited";

  const formatted = formatUnits(amount, decimals);
  const [whole, fraction] = formatted.split(".");

  if (!fraction) return whole;

  const trimmedFraction = fraction.slice(0, 6).replace(/0+$/, "");
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole;
}

export default function DashboardClient() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [showUnlimitedOnly, setShowUnlimitedOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"risk" | "age" | "token">("risk");

  const [scanWindow, setScanWindow] = useState<ApprovalsResponse["scanWindow"] | null>(null);



  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [reviewApproval, setReviewApproval] = useState<Approval | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [liveAllowanceLabel, setLiveAllowanceLabel] = useState<string | null>(null);
  const [liveAllowanceLoading, setLiveAllowanceLoading] = useState(false);
  const [liveAllowanceError, setLiveAllowanceError] = useState<string | null>(null);

  const [txStatus, setTxStatus] = useState<TxStatusState>("idle");
  const [txHash, setTxHash] = useState<string | undefined>();
  const [txError, setTxError] = useState<string | undefined>();

  const chainIsSupported = supportedChains.some((chain) => chain.id === chainId);
  const visibleApprovals = useMemo(
    () => (isConnected && chainIsSupported ? approvals : []),
    [approvals, chainIsSupported, isConnected]
  );
  const visibleScanWindow = useMemo(
    () => (isConnected && chainIsSupported ? scanWindow : null),
    [chainIsSupported, isConnected, scanWindow]
  );

  useEffect(() => {
    if (!isConnected || !address || !chainIsSupported) {
      return;
    }


    const controller = new AbortController();

    async function loadApprovals() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/approvals?address=${address}&chainId=${chainId}`,
          { signal: controller.signal }
        );

        const data = (await response.json()) as ApprovalsResponse;

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to load approvals");
        }

        setApprovals(data.approvals);
        setScanWindow(data.scanWindow);

      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    loadApprovals();

    return () => controller.abort();
  }, [address, chainId, chainIsSupported, isConnected, txStatus]);

  const summary = useMemo(() => {
    const total = visibleApprovals.length;
    const risky = visibleApprovals.filter((approval) => approval.riskLevel !== "low").length;
    const unlimited = visibleApprovals.filter((approval) => approval.isUnlimited).length;
    const stale = visibleApprovals.filter((approval) => approval.approvalAgeDays > 90).length;

    return { total, risky, unlimited, stale };
  }, [visibleApprovals]);

  const displayApprovals = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = visibleApprovals.filter((approval) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        approval.tokenSymbol.toLowerCase().includes(normalizedSearch) ||
        approval.tokenAddress.toLowerCase().includes(normalizedSearch) ||
        approval.spenderAddress.toLowerCase().includes(normalizedSearch);

      const matchesRisk =
        riskFilter === "all" || approval.riskLevel === riskFilter;

      const matchesUnlimited =
        !showUnlimitedOnly || approval.isUnlimited;

      return matchesSearch && matchesRisk && matchesUnlimited;
    });

    const riskPriority: Record<Approval["riskLevel"], number> = {
      high: 0,
      medium: 1,
      low: 2,
    };

    return [...filtered].sort((a, b) => {
      if (sortBy === "risk") {
        const riskDiff = riskPriority[a.riskLevel] - riskPriority[b.riskLevel];
        if (riskDiff !== 0) return riskDiff;
        return b.approvalAgeDays - a.approvalAgeDays;
      }

      if (sortBy === "age") {
        return b.approvalAgeDays - a.approvalAgeDays;
      }

      return a.tokenSymbol.localeCompare(b.tokenSymbol);
    });
  }, [visibleApprovals, searchTerm, riskFilter, showUnlimitedOnly, sortBy]);


  function handleRevoke(approval: Approval) {
    setLiveAllowanceLabel(null);
    setLiveAllowanceError(null);
    setLiveAllowanceLoading(false);
    setSelectedApproval(approval);
    setRevokeOpen(true);
  }

  function handleReview(approval: Approval) {
    setReviewApproval(approval);
    setReviewOpen(true);
  }

  function handleRevokeOpenChange(open: boolean) {
    setRevokeOpen(open);

    if (!open) {
      setSelectedApproval(null);
      setLiveAllowanceLabel(null);
      setLiveAllowanceError(null);
      setLiveAllowanceLoading(false);
    }
  }

  function handleReviewOpenChange(open: boolean) {
    setReviewOpen(open);

    if (!open) {
      setReviewApproval(null);
    }
  }

  useEffect(() => {
    if (!revokeOpen || !selectedApproval || !address || !publicClient) return;
    const client = publicClient;
    const ownerAddress = address as Address;

    let active = true;

    async function loadLiveAllowance() {
      try {
        setLiveAllowanceLoading(true);
        setLiveAllowanceError(null);

        const allowance = await readAllowance({
          publicClient: client,
          tokenAddress: selectedApproval.tokenAddress as Address,
          ownerAddress,
          spenderAddress: selectedApproval.spenderAddress as Address,
        });

        if (!active) return;
        setLiveAllowanceLabel(formatTokenAmount(allowance, selectedApproval.tokenDecimals));
      } catch (err) {
        if (!active) return;
        setLiveAllowanceLabel(null);
        setLiveAllowanceError(
          err instanceof Error ? err.message : "Failed to load current allowance"
        );
      } finally {
        if (active) {
          setLiveAllowanceLoading(false);
        }
      }
    }

    loadLiveAllowance();

    return () => {
      active = false;
    };
  }, [address, publicClient, revokeOpen, selectedApproval]);

  async function handleConfirmRevoke(approval: Approval, action: ApprovalAction) {
    try {
      if (!walletClient || !publicClient) {
        throw new Error("Wallet is not ready. Reconnect and try again.");
      }

      setTxStatus("pending");
      setTxError(undefined);
      setTxHash(undefined);

      if (action.type === "revoke") {
        const hash = await revokeAllowance({
          walletClient,
          tokenAddress: approval.tokenAddress as Address,
          spenderAddress: approval.spenderAddress as Address,
        });

        setTxHash(hash);
        await publicClient.waitForTransactionReceipt({ hash });
      } else {
        const amount = parseUnits(action.amount, approval.tokenDecimals);

        const resetHash = await revokeAllowance({
          walletClient,
          tokenAddress: approval.tokenAddress as Address,
          spenderAddress: approval.spenderAddress as Address,
        });

        setTxHash(resetHash);
        await publicClient.waitForTransactionReceipt({ hash: resetHash });

        const setHash = await setAllowance({
          walletClient,
          tokenAddress: approval.tokenAddress as Address,
          spenderAddress: approval.spenderAddress as Address,
          amount,
        });

        setTxHash(setHash);
        await publicClient.waitForTransactionReceipt({ hash: setHash });
      }

      setTxStatus("success");
      setRevokeOpen(false);
      setSelectedApproval(null);
    } catch (err) {
      setTxError(getFriendlyTransactionErrorMessage(err, "Transaction failed"));
      setTxStatus("error");
    }
  }

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        Connect your wallet to scan approvals.
      </div>
    );
  }

  if (!chainIsSupported) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        Switch to a supported chain to scan approvals.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ApprovalSummary
        total={summary.total}
        risky={summary.risky}
        unlimited={summary.unlimited}
        stale={summary.stale}
      />

      <TxStatus status={txStatus} txHash={txHash} errorMessage={txError} />

      <div className="rounded-xl border p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold">Approval scan</h3>
            <p className="text-sm text-muted-foreground">
                {loading
                    ? "Scanning recent approvals..."
                    : visibleScanWindow?.isRecentOnly
                    ? `Showing a recent free-tier scan from the last ${visibleScanWindow.lookbackBlocks.toLocaleString()} blocks.`
                    : "Showing approvals for your connected wallet."}
            </p>

          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Rescan
          </button>
        </div>
        
        {!loading && !error && visibleScanWindow?.isRecentOnly ? (
            <div className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-700">
                Showing recent token approvals only. Your older approvals may not appear yet.
            </div>
        ) : null}


        {error ? (
          <p className="mt-6 rounded-md border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600">
            {error}
          </p>
        ) : null}

        {!loading && !error ? (
          <div className="mt-6 flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search token, token address, or spender"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Risk</label>
              <select
                value={riskFilter}
                onChange={(event) =>
                  setRiskFilter(event.target.value as "all" | "high" | "medium" | "low")
                }
                className="rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="all">All risks</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Sort</label>
              <select
                value={sortBy}
                onChange={(event) =>
                  setSortBy(event.target.value as "risk" | "age" | "token")
                }
                className="rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="risk">Highest risk</option>
                <option value="age">Oldest first</option>
                <option value="token">Token A-Z</option>
              </select>
            </div>

            <div>
              <span className="mb-2 block text-sm font-medium">Allowance</span>
              <label className="flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={showUnlimitedOnly}
                  onChange={(event) => setShowUnlimitedOnly(event.target.checked)}
                />
                Unlimited only
              </label>
            </div>
          </div>
        ) : null}

        {!loading && !error ? (
            <p className="mt-4 text-sm text-muted-foreground">
                Showing {displayApprovals.length} of {visibleApprovals.length} approvals
            </p>
        ) : null}


        {!loading && !error ? (
          <div className="mt-6">
            {displayApprovals.length === 0 && visibleApprovals.length > 0 ? (
              <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
                No approvals match your current filters.
              </div>
            ) : (
              <ApprovalTable
                approvals={displayApprovals}
                onReview={handleReview}
                onRevoke={handleRevoke}
              />
            )}
          </div>
        ) : null}

    </div>

      <ApprovalReviewModal
        approval={reviewApproval}
        open={reviewOpen}
        onOpenChange={handleReviewOpenChange}
      />

      <RevokeModal
        approval={selectedApproval}
        open={revokeOpen}
        currentAllowanceLabel={liveAllowanceLabel || undefined}
        currentAllowanceLoading={liveAllowanceLoading}
        currentAllowanceError={liveAllowanceError}
        onOpenChange={handleRevokeOpenChange}
        onConfirm={handleConfirmRevoke}
      />
    </div>
  );
}
