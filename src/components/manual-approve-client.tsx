"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { decodeAbiParameters, parseUnits, type Address } from "viem";
import { useAccount, useChainId, usePublicClient, useWalletClient } from "wagmi";
import { supportedChains } from "@/lib/chains";
import { setAllowance } from "@/lib/revoke";
import { getFriendlyTransactionErrorMessage } from "@/lib/transaction-errors";

type TxState = "idle" | "pending" | "success" | "error";
const tokenMetadataAbi = [
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

function isAddress(value: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export default function ManualApproveClient() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [tokenAddress, setTokenAddress] = useState("");
  const [spenderAddress, setSpenderAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [decimals, setDecimals] = useState("18");
  const [tokenSymbol, setTokenSymbol] = useState<string | null>(null);
  const [tokenMetadataLoading, setTokenMetadataLoading] = useState(false);
  const [tokenMetadataError, setTokenMetadataError] = useState<string | null>(null);
  const [allowManualDecimals, setAllowManualDecimals] = useState(false);
  const [txState, setTxState] = useState<TxState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const chainIsSupported = supportedChains.some((chain) => chain.id === chainId);
  const formValid =
    isAddress(tokenAddress) &&
    isAddress(spenderAddress) &&
    amount.trim().length > 0 &&
    /^\d+$/.test(decimals);

  useEffect(() => {
    if (!publicClient || !isAddress(tokenAddress)) return;
    const client = publicClient;
    const token = tokenAddress as Address;

    let active = true;

    async function loadTokenMetadata() {
      try {
        setTokenMetadataLoading(true);
        setTokenMetadataError(null);

        const [detectedDecimals, detectedSymbol] = await Promise.all([
          client.readContract({
            address: token,
            abi: tokenMetadataAbi,
            functionName: "decimals",
          }),
          client.readContract({
            address: token,
            abi: tokenMetadataAbi,
            functionName: "symbol",
          }).catch(async () => {
            const raw = await client.readContract({
              address: token,
              abi: [
                {
                  type: "function",
                  name: "symbol",
                  stateMutability: "view",
                  inputs: [],
                  outputs: [{ name: "", type: "bytes32" }],
                },
              ] as const,
              functionName: "symbol",
            });

            try {
              return decodeAbiParameters([{ type: "string" }], raw as `0x${string}`)[0];
            } catch {
              return String(raw).replace(/\0/g, "").trim();
            }
          }),
        ]);

        if (!active) return;
        setDecimals(String(detectedDecimals));
        setTokenSymbol(String(detectedSymbol));
        setAllowManualDecimals(false);
      } catch (err) {
        if (!active) return;
        setTokenSymbol(null);
        setAllowManualDecimals(true);
        setTokenMetadataError(
          err instanceof Error ? err.message : "Failed to read token metadata"
        );
      } finally {
        if (active) {
          setTokenMetadataLoading(false);
        }
      }
    }

    loadTokenMetadata();

    return () => {
      active = false;
    };
  }, [publicClient, tokenAddress]);

  function handleTokenAddressChange(value: string) {
    const nextValue = value.trim();
    setTokenAddress(nextValue);
    setTokenSymbol(null);
    setTokenMetadataError(null);
    setTokenMetadataLoading(false);
    setAllowManualDecimals(false);
    setDecimals("18");
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!walletClient || !address) {
      setError("Connect your wallet first.");
      setTxState("error");
      return;
    }

    try {
      setTxState("pending");
      setTxHash(null);
      setError(null);

      const hash = await setAllowance({
        walletClient,
        tokenAddress: tokenAddress as Address,
        spenderAddress: spenderAddress as Address,
        amount: parseUnits(amount.trim(), Number(decimals)),
      });

      setTxHash(hash);
      setTxState("success");
    } catch (err) {
      setError(getFriendlyTransactionErrorMessage(err, "Failed to submit approval"));
      setTxState("error");
    }
  }

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        Connect your wallet to create a manual test approval.
      </div>
    );
  }

  if (!chainIsSupported) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        Switch to Sepolia to create a manual test approval.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-700">
        This will send a test transaction on Sepolia to grant permission for a dApp to use your
        tokens.
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border p-6 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="tokenAddress" className="text-sm font-medium">
              Token address
            </label>
            <input
              id="tokenAddress"
              type="text"
              value={tokenAddress}
              onChange={(event) => handleTokenAddressChange(event.target.value)}
              placeholder="0x..."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
            {tokenMetadataLoading ? (
              <p className="text-xs text-muted-foreground">Reading token metadata...</p>
            ) : null}
            {tokenSymbol ? (
              <p className="text-xs text-muted-foreground">
                Detected token: {tokenSymbol} ({decimals} decimals)
              </p>
            ) : null}
            {tokenMetadataError ? (
              <p className="text-xs text-amber-700">
                Could not auto-detect token decimals. Double-check this field manually.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label htmlFor="spenderAddress" className="text-sm font-medium">
              Spender address
            </label>
            <input
              id="spenderAddress"
              type="text"
              value={spenderAddress}
              onChange={(event) => setSpenderAddress(event.target.value.trim())}
              placeholder="0x..."
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="amount" className="text-sm font-medium">
              Allowance amount
            </label>
            <input
              id="amount"
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="1.5"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="decimals" className="text-sm font-medium">
              Token decimals
            </label>
            <input
              id="decimals"
              type="text"
              inputMode="numeric"
              value={decimals}
              onChange={(event) => setDecimals(event.target.value)}
              placeholder={allowManualDecimals ? "Enter token decimals" : "Auto-detected"}
              disabled={!allowManualDecimals}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            />
            {!allowManualDecimals ? (
              <p className="text-xs text-muted-foreground">
                Filled automatically from the token contract.
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
          Wallet: {address}
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            After confirming this transaction, rescan the dashboard quickly because the current
            scanner only checks a very recent block window.
          </p>
          <button
            type="submit"
            disabled={!formValid || txState === "pending"}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {txState === "pending" ? "Submitting..." : "Create approval"}
          </button>
        </div>
      </form>

      {txState === "success" && txHash ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-700">
          Approval transaction submitted successfully.
          <div className="mt-1 text-muted-foreground">Hash: {txHash}</div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-md border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Open dashboard
            </Link>
            <Link
              href="/tools/faucet"
              className="rounded-md border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Open faucet
            </Link>
          </div>
        </div>
      ) : null}

      {txState === "error" && error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600">
          {error}
        </div>
      ) : null}
    </div>
  );
}
