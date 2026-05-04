import { formatUnits } from "viem";

type ApprovalLog = {
  address: string;
  topics: string[];
  data: `0x${string}`;
  blockNumber: string;
  transactionHash: string;
};

// Shape of a single normalized approval record
export interface NormalizedApproval {
  walletAddress: string;
  chainId: number;
  tokenAddress: string;
  tokenSymbol: string;
  tokenDecimals: number;
  spenderAddress: string;
  allowanceAmount: string;
  isUnlimited: boolean;
  approvalTxHash: string;
  approvalBlockNumber: number;
  approvalTimestamp: number;
  approvalAgeDays: number;
  approvalAgeLabel: string;
  riskLevel: "low" | "medium" | "high";
  riskReasons: string[];
}

const MAX_UINT256 = (BigInt(1) << BigInt(256)) - BigInt(1);

function formatAllowanceAmount(amount: bigint, decimals: number) {
  if (amount === MAX_UINT256) return "Unlimited";

  const formatted = formatUnits(amount, decimals);
  const [whole, fraction] = formatted.split(".");

  if (!fraction) return whole;

  const trimmedFraction = fraction.slice(0, 6).replace(/0+$/, "");
  return trimmedFraction ? `${whole}.${trimmedFraction}` : whole;
}

function formatApprovalAgeLabel(ageInSeconds: number) {
  if (ageInSeconds < 60) {
    return `${ageInSeconds} second${ageInSeconds === 1 ? "" : "s"} ago`;
  }

  if (ageInSeconds < 60 * 60) {
    const minutes = Math.floor(ageInSeconds / 60);
    const seconds = ageInSeconds % 60;

    if (seconds === 0) {
      return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    }

    return `${minutes} minute${minutes === 1 ? "" : "s"} ${seconds} second${seconds === 1 ? "" : "s"} ago`;
  }

  if (ageInSeconds < 60 * 60 * 24) {
    const hours = Math.floor(ageInSeconds / (60 * 60));
    const minutes = Math.floor((ageInSeconds % (60 * 60)) / 60);
    const seconds = ageInSeconds % 60;

    let label = `${hours} hour${hours === 1 ? "" : "s"}`;

    if (minutes > 0) {
      label += ` ${minutes} minute${minutes === 1 ? "" : "s"}`;
    }

    if (seconds > 0) {
      label += ` ${seconds} second${seconds === 1 ? "" : "s"}`;
    }

    return `${label} ago`;
  }

  const days = Math.floor(ageInSeconds / (60 * 60 * 24));
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// Normalizes a single raw Alchemy approval log into our structured format
export async function normalizeApproval(
  log: ApprovalLog,
  tokenMetadata: { symbol: string; decimals: number } | null,
  userAddress: string,
  chainId: number,
  blockTimestamp: number
): Promise<NormalizedApproval> {
  // ERC-20 Approval event: topics[0] = event signature, topics[1] = owner (padded), topics[2] = spender (padded)
  // Extract spender address by removing the 0x prefix and taking the last 40 characters (20 bytes)
  const spenderAddress = `0x${log.topics[2]?.slice(26).toLowerCase()}`;
  
  // Allowance amount is stored in log.data as a 32-byte uint256
  const rawAllowanceAmount = BigInt(log.data);
  
  // Check if allowance is unlimited (max uint256 value)
  const isUnlimited = rawAllowanceAmount === MAX_UINT256;
  const allowanceAmount = formatAllowanceAmount(
    rawAllowanceAmount,
    tokenMetadata?.decimals || 18
  );

  // Calculate how many days ago the approval was granted
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const approvalAgeSeconds = Math.max(currentTimestamp - blockTimestamp, 0);
  const approvalAgeDays = Math.floor(approvalAgeSeconds / (60 * 60 * 24));
  const approvalAgeLabel = formatApprovalAgeLabel(approvalAgeSeconds);

  return {
    walletAddress: userAddress.toLowerCase(),
    chainId,
    tokenAddress: log.address.toLowerCase(), // Token contract address is the log's address
    tokenSymbol: tokenMetadata?.symbol || "UNKNOWN",
    tokenDecimals: tokenMetadata?.decimals || 18,
    spenderAddress,
    allowanceAmount,
    isUnlimited,
    approvalTxHash: log.transactionHash,
    approvalBlockNumber: Number.parseInt(log.blockNumber, 16),
    approvalTimestamp: blockTimestamp,
    approvalAgeDays,
    approvalAgeLabel,
    riskLevel: "low", // Default, will be updated by risk rules later
    riskReasons: [], // Default, will be updated by risk rules later
  };
}
