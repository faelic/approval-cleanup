import { formatUnits, type Address } from "viem";

export const FAUCET_ADDRESS =
  "0xd2719323fe38153B2219366AF243552e983ccD49" as Address;

export const faucetAbi = [
  {
    type: "function",
    name: "getSupportedTokens",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "tokenConfigs",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [
      { name: "supported", type: "bool" },
      { name: "enabled", type: "bool" },
      { name: "claimAmount", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "canClaim",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "token", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [{ name: "token", type: "address" }],
    outputs: [],
  },
] as const;

export const erc20MetadataAbi = [
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
] as const;

export type FaucetTokenConfig = readonly [boolean, boolean, bigint];

export type FaucetTokenView = {
  address: Address;
  symbol: string;
  decimals: number;
  claimAmount: bigint;
  claimAmountLabel: string;
  enabled: boolean;
  supported: boolean;
};

export function formatClaimAmount(amount: bigint, decimals: number) {
  const formatted = formatUnits(amount, decimals);
  const [whole, fraction] = formatted.split(".");

  if (!fraction) return whole;

  const trimmedFraction = fraction.slice(0, 6).replace(/0+$/, "");
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole;
}
