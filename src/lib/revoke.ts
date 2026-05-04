import type { Address, WalletClient } from "viem";

const erc20Abi = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

type RevokeAllowanceParams = {
  walletClient: WalletClient;
  tokenAddress: Address;
  spenderAddress: Address;
};

type SetAllowanceParams = RevokeAllowanceParams & {
  amount: bigint;
};

type AllowanceReader = {
  readContract(args: {
    address: Address;
    abi: typeof erc20Abi;
    functionName: "allowance";
    args: readonly [Address, Address];
  }): Promise<bigint>;
};

type ReadAllowanceParams = {
  publicClient: AllowanceReader;
  tokenAddress: Address;
  ownerAddress: Address;
  spenderAddress: Address;
};

export async function setAllowance({
  walletClient,
  tokenAddress,
  spenderAddress,
  amount,
}: SetAllowanceParams) {
  if (!walletClient.account) {
    throw new Error("No wallet account available");
  }

  return walletClient.writeContract({
    account: walletClient.account,
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "approve",
    args: [spenderAddress, amount],
    chain: walletClient.chain,
  });
}

export async function revokeAllowance(params: RevokeAllowanceParams) {
  return setAllowance({
    ...params,
    amount: BigInt(0),
  });
}

export async function readAllowance({
  publicClient,
  tokenAddress,
  ownerAddress,
  spenderAddress,
}: ReadAllowanceParams) {
  return publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: [ownerAddress, spenderAddress],
  });
}
