"use client";

import { useSwitchChain, useChainId } from "wagmi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supportedChains } from "@/lib/chains";

export default function ChainSwitcher() {
  const currentChainId = useChainId();
  const { switchChain } = useSwitchChain();

  return (
    <Select
      value={currentChainId.toString()}
      onValueChange={(chainId) => switchChain({ chainId: Number(chainId) })}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select chain" />
      </SelectTrigger>
      <SelectContent>
        {supportedChains.map((chain) => (
          <SelectItem key={chain.id} value={chain.id.toString()}>
            {chain.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
