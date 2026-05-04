import { http, createConfig } from "wagmi";
import { supportedChains } from "./chains";

export const config = createConfig({
  ssr: true,
  chains: supportedChains,
  transports: {
    [supportedChains[0].id]: http(),
  },
});
