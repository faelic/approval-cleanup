"use client";

import Link from "next/link";
import WalletConnect from "@/components/wallet-connect";
import ChainSwitcher from "@/components/chain-switcher";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link href="/" className="text-xl font-bold tracking-tight hover:text-foreground/80">
            Allowance Cleanup
          </Link>
          <div className="flex items-center gap-4">
            <ChainSwitcher />
            <WalletConnect />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t py-4">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          Sepolia Testnet Only • Allowance Cleanup Dashboard
        </div>
      </footer>
    </div>
  );
}
