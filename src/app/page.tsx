import Link from "next/link";
import WalletConnect from "@/components/wallet-connect";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="flex flex-col items-center justify-center gap-8 max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Allowance Cleanup Dashboard
        </h1>
        <p className="text-lg text-muted-foreground">
          Secure your wallet by discovering and revoking risky ERC-20 token approvals. Start by connecting your wallet on Sepolia testnet.
        </p>
        <WalletConnect />
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Open dashboard
          </Link>
          <Link
            href="/tools/faucet"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Open faucet
          </Link>
        </div>
      </div>
    </main>
  );
}
