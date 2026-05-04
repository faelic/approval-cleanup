import { NextRequest, NextResponse } from "next/server";
import { decodeAbiParameters } from "viem";
import { alchemyRpc } from "@/lib/alchemy";
import { normalizeApproval, NormalizedApproval } from "@/lib/normalize-approvals";
import { applyRiskRules, sortByRisk } from "@/lib/risk-rules";
import { supportedChains } from "@/lib/chains";

// ERC-20 Approval event signature: Approval(address,address,uint256)
const APPROVAL_EVENT_SIG = "0x8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925";
const APPROVAL_LOOKBACK_BLOCKS = 100;
const LOG_CHUNK_SIZE = 10;

type RpcLog = {
  address: string;
  topics: string[];
  data: `0x${string}`;
  blockNumber: string;
  transactionHash: string;
};

type RpcBlock = {
  timestamp: string;
};

function keepLatestApprovalPerSpender(approvals: NormalizedApproval[]) {
  const latestByPair = new Map<string, NormalizedApproval>();

  for (const approval of approvals) {
    const key = `${approval.tokenAddress}-${approval.spenderAddress}`;
    const existing = latestByPair.get(key);

    if (!existing) {
      latestByPair.set(key, approval);
      continue;
    }

    const shouldReplace =
      approval.approvalBlockNumber > existing.approvalBlockNumber ||
      (approval.approvalBlockNumber === existing.approvalBlockNumber &&
        approval.approvalTimestamp > existing.approvalTimestamp);

    if (shouldReplace) {
      latestByPair.set(key, approval);
    }
  }

  return [...latestByPair.values()];
}

async function getApprovalLogs(ownerTopic: string, fromBlock: number, toBlock: number) {
  const allLogs: RpcLog[] = [];

  for (let start = fromBlock; start <= toBlock; start += LOG_CHUNK_SIZE) {
    const end = Math.min(start + LOG_CHUNK_SIZE - 1, toBlock);
    const chunkLogs = await alchemyRpc<RpcLog[]>("eth_getLogs", [
      {
        topics: [APPROVAL_EVENT_SIG, ownerTopic],
        fromBlock: `0x${start.toString(16)}`,
        toBlock: `0x${end.toString(16)}`,
      },
    ]);

    allLogs.push(...chunkLogs);
  }

  return allLogs;
}

export async function GET(request: NextRequest) {
  try {
    if (!process.env.ALCHEMY_API_KEY) {
      return NextResponse.json(
        { error: "Missing server configuration: ALCHEMY_API_KEY" },
        { status: 500 }
      );
    }

    // 1. Parse query parameters
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const chainId = searchParams.get("chainId");

    // 2. Validate required params
    if (!address || !chainId) {
      return NextResponse.json(
        { error: "Missing required params: address and chainId" },
        { status: 400 }
      );
    }

    // 3. Validate chain is supported (only Sepolia for MVP)
    const chainIdNum = Number(chainId);
    const chain = supportedChains.find((c) => c.id === chainIdNum);
    if (!chain) {
      return NextResponse.json(
        { error: `Unsupported chain ID: ${chainId}` },
        { status: 400 }
      );
    }

    // 4. Fetch ERC-20 Approval events for the user's address
    // Pad owner address to 32 bytes for indexed topic (ERC-20 standard)
    const paddedOwner = `0x${"0".repeat(24)}${address.slice(2).toLowerCase()}`;
    const latestBlockHex = await alchemyRpc<string>("eth_blockNumber", []);
    const latestBlock = Number.parseInt(latestBlockHex, 16);
    const fromBlock = Math.max(latestBlock - APPROVAL_LOOKBACK_BLOCKS, 0);
    const logs = await getApprovalLogs(paddedOwner, fromBlock, latestBlock);

    // 5. Fetch block timestamps for each log (for approval age calculation)
    const blockTimestamps = await Promise.all(
      logs.map(async (log) => {
        const block = await alchemyRpc<RpcBlock>("eth_getBlockByNumber", [
          log.blockNumber,
          false,
        ]);

        return {
          blockNumber: Number.parseInt(log.blockNumber, 16),
          timestamp: Number.parseInt(block.timestamp, 16),
        };
      })
    );
    const timestampMap = new Map(blockTimestamps.map((b) => [b.blockNumber, b.timestamp]));

    // 6. Fetch token metadata for each unique token contract
    const tokenAddresses = [...new Set(logs.map((log) => log.address))];
    const tokenMetadata = await Promise.all(
      tokenAddresses.map(async (tokenAddr) => {
        try {
          const [symbol, decimals] = await Promise.all([
            alchemyRpc<`0x${string}`>("eth_call", [
              {
                to: tokenAddr,
                data: "0x95d89b41", // symbol() function selector
              },
              "latest",
            ]).then((res) => {
              try {
                return decodeAbiParameters([{ type: "string" }], res)[0] || "UNKNOWN";
              } catch {
                return "UNKNOWN";
              }
            }),
            alchemyRpc<`0x${string}`>("eth_call", [
              {
                to: tokenAddr,
                data: "0x313ce567", // decimals() function selector
              },
              "latest",
            ]).then((res) => {
              try {
                return Number(decodeAbiParameters([{ type: "uint8" }], res)[0]) || 18;
              } catch {
                return 18;
              }
            }),
          ]);
          return { address: tokenAddr.toLowerCase(), symbol, decimals };
        } catch {
          return { address: tokenAddr.toLowerCase(), symbol: "UNKNOWN", decimals: 18 };
        }
      })
    );
    const tokenMetaMap = new Map(tokenMetadata.map((t) => [t.address, t]));

    // 7. Normalize each log into structured approval data
    const normalizedApprovals: NormalizedApproval[] = await Promise.all(
      logs.map(async (log) => {
        const tokenMeta = tokenMetaMap.get(log.address.toLowerCase()) || null;
        const blockTimestamp = timestampMap.get(Number.parseInt(log.blockNumber, 16)) || 0;
        return normalizeApproval(log, tokenMeta, address, chainIdNum, blockTimestamp);
      })
    );

    // 8. Keep only the latest approval per token/spender pair, then score risk
    const latestApprovals = keepLatestApprovalPerSpender(normalizedApprovals);
    const riskScored = latestApprovals.map(applyRiskRules);
    const sorted = sortByRisk(riskScored);

    // 9. Return results
    return NextResponse.json({
      success: true,
      count: sorted.length,
      approvals: sorted,
      scanWindow: {
        fromBlock,
        toBlock: latestBlock,
        lookbackBlocks: APPROVAL_LOOKBACK_BLOCKS,
        isRecentOnly: true,
      },
    });
  } catch (error) {
    console.error("Approvals API error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to fetch approvals. Please try again.";

    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "development"
            ? message
            : "Failed to fetch approvals. Please try again.",
      },
      { status: 500 }
    );
  }
}
