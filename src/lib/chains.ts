import { sepolia } from "wagmi/chains";

// Central list of all chains the app supports (Sepolia only for MVP)
export const supportedChains = [sepolia] as const;

// Type for valid chain IDs, derived automatically from supportedChains
export type SupportedChainId = (typeof supportedChains)[number]["id"];

// Helper to get chain metadata by chain ID
export const getChainById = (chainId: number) => {
  return supportedChains.find((chain) => chain.id === chainId);
};