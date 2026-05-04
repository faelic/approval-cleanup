import AppShell from "@/components/app-shell";
import ManualApproveClient from "@/components/manual-approve-client";

export default function ManualApprovePage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Manual Test Approval</h2>
          <p className="text-muted-foreground">
            Create a Sepolia ERC-20 approval directly from your connected wallet for dashboard
            testing.
          </p>
        </div>

        <ManualApproveClient />
      </div>
    </AppShell>
  );
}
