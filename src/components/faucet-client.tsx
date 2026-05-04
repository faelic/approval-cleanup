"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { type Address } from "viem";
import { useAccount, useChainId, usePublicClient, useWalletClient } from "wagmi";
import { supportedChains } from "@/lib/chains";
import {
  erc20MetadataAbi,
  FAUCET_ADDRESS,
  faucetAbi,
  formatClaimAmount,
  type FaucetTokenConfig,
  type FaucetTokenView,
} from "@/lib/faucet";
import { getFriendlyTransactionErrorMessage } from "@/lib/transaction-errors";

type TxState = "idle" | "pending" | "success" | "error";
type ClaimStatus = "checking" | "available" | "unavailable";

export default function FaucetClient() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [tokens, setTokens] = useState<FaucetTokenView[]>([]);
  const [claimableByToken, setClaimableByToken] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txState, setTxState] = useState<TxState>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [activeToken, setActiveToken] = useState<string | null>(null);

  const chainIsSupported = supportedChains.some((chain) => chain.id === chainId);
  const visibleTokens = tokens.filter((token) => token.enabled);

  useEffect(() => {
    if (!publicClient || !chainIsSupported) return;
    const client = publicClient;

    let active = true;

    async function loadTokens() {
      try {
        setLoading(true);
        setError(null);

        const supportedTokenAddresses = await client.readContract({
          address: FAUCET_ADDRESS,
          abi: faucetAbi,
          functionName: "getSupportedTokens",
        });

        const tokenViews = await Promise.all(
          supportedTokenAddresses.map(async (tokenAddress) => {
            const [config, symbol, decimals] = await Promise.all([
              client.readContract({
                address: FAUCET_ADDRESS,
                abi: faucetAbi,
                functionName: "tokenConfigs",
                args: [tokenAddress],
              }) as Promise<FaucetTokenConfig>,
              client.readContract({
                address: FAUCET_ADDRESS,
                abi: erc20MetadataAbi,
                functionName: "symbol",
                address: tokenAddress,
              }),
              client.readContract({
                abi: erc20MetadataAbi,
                functionName: "decimals",
                address: tokenAddress,
              }),
            ]);

            const [supported, enabled, claimAmount] = config;

            return {
              address: tokenAddress,
              symbol,
              decimals: Number(decimals),
              claimAmount,
              claimAmountLabel: formatClaimAmount(claimAmount, Number(decimals)),
              enabled,
              supported,
            } satisfies FaucetTokenView;
          })
        );

        if (!active) return;
        setTokens(tokenViews);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load faucet tokens");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadTokens();

    return () => {
      active = false;
    };
  }, [publicClient, chainIsSupported]);

  useEffect(() => {
    if (!publicClient || !address || !chainIsSupported || tokens.length === 0) return;
    const client = publicClient;
    const userAddress = address as Address;

    let active = true;

    async function loadClaimability() {
      try {
        const entries = await Promise.all(
          tokens.map(async (token) => {
            const canClaim = await client.readContract({
              address: FAUCET_ADDRESS,
              abi: faucetAbi,
              functionName: "canClaim",
              args: [userAddress, token.address],
            });

            return [token.address.toLowerCase(), canClaim] as const;
          })
        );

        if (!active) return;
        setClaimableByToken(Object.fromEntries(entries));
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Failed to load claim status");
      }
    }

    loadClaimability();

    return () => {
      active = false;
    };
  }, [address, chainIsSupported, publicClient, tokens, txHash]);

  async function handleClaim(token: FaucetTokenView) {
    if (!walletClient || !publicClient) {
      setTxError("Wallet is not ready. Reconnect and try again.");
      setTxState("error");
      return;
    }
    const client = publicClient;

    try {
      setActiveToken(token.address);
      setTxState("pending");
      setTxHash(null);
      setTxError(null);

      const hash = await walletClient.writeContract({
        account: walletClient.account!,
        address: FAUCET_ADDRESS,
        abi: faucetAbi,
        functionName: "claim",
        args: [token.address],
        chain: walletClient.chain,
      });

      await client.waitForTransactionReceipt({ hash });

      setClaimableByToken((current) => ({
        ...current,
        [token.address.toLowerCase()]: false,
      }));
      setTxHash(hash);
      setTxState("success");
    } catch (err) {
      setTxError(getFriendlyTransactionErrorMessage(err, "Failed to claim faucet token"));
      setTxState("error");
    } finally {
      setActiveToken(null);
    }
  }

  if (!isConnected) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        Connect your wallet to claim faucet tokens.
      </div>
    );
  }

  if (!chainIsSupported) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
        Switch to Sepolia to use the faucet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-700">
        Claim each faucet token once, then head to the manual approve tool or dashboard right
        away.
      </div>

      <div className="rounded-xl border p-6 shadow-sm">
        <h3 className="text-lg font-semibold">Faucet tokens</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          These claims come from your Sepolia faucet contract and are limited to one claim per
          wallet per token.
        </p>

        {error ? (
          <div className="mt-4 rounded-md border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            Loading faucet tokens...
          </div>
        ) : null}

        {!loading ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {visibleTokens.map((token) => {
              const claimable = claimableByToken[token.address.toLowerCase()];
              const claimStatus: ClaimStatus =
                claimable === undefined
                  ? "checking"
                  : claimable
                    ? "available"
                    : "unavailable";

              return (
                <div key={token.address} className="rounded-xl border p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-base font-semibold">{token.symbol}</h4>
                      <p className="mt-1 text-xs text-muted-foreground">{token.address}</p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        token.enabled
                          ? "bg-emerald-500/10 text-emerald-700"
                          : "bg-red-500/10 text-red-700"
                      }`}
                    >
                      {token.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm">
                    <p>
                      <span className="font-medium">Claim amount:</span> {token.claimAmountLabel}{" "}
                      {token.symbol}
                    </p>
                    <p>
                      <span className="font-medium">Claim status:</span>{" "}
                      {claimStatus === "checking"
                        ? "Checking..."
                        : claimStatus === "available"
                          ? "Available"
                          : "Unavailable for this wallet right now"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleClaim(token)}
                    disabled={claimStatus !== "available" || txState === "pending"}
                    className="mt-5 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {txState === "pending" && activeToken === token.address
                      ? "Submitting..."
                      : `Claim ${token.symbol}`}
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}

        {!loading && visibleTokens.length === 0 ? (
          <div className="mt-6 rounded-md border border-dashed p-6 text-sm text-muted-foreground">
            There are no active faucet tokens available right now.
          </div>
        ) : null}
      </div>

      {txState === "success" && txHash ? (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-700">
          Faucet claim submitted successfully.
          <div className="mt-1 text-muted-foreground">Hash: {txHash}</div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/tools/approve"
              className="rounded-md border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Go to manual approve
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
            >
              Open dashboard
            </Link>
          </div>
        </div>
      ) : null}

      {txState === "error" && txError ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-600">
          {txError}
        </div>
      ) : null}
    </div>
  );
}
