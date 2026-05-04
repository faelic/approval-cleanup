import AppShell from "@/components/app-shell";
import FaucetClient from "@/components/faucet-client";

export default function FaucetPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Faucet</h2>
          <p className="text-muted-foreground">
            Claim Sepolia test tokens from your faucet contract, then approve and review them in
            the dashboard.
          </p>
        </div>

        <FaucetClient />
      </div>
    </AppShell>
  );
}
