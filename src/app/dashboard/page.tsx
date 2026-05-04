import Link from "next/link";
import AppShell from "@/components/app-shell";
import DashboardClient from "@/components/dashboard-client";

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="flex flex-col gap-8">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">Approval Dashboard</h2>
          <p className="text-muted-foreground">
            Review risky ERC-20 approvals and clean them up from one place.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/tools/faucet"
              className="inline-flex rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              Open faucet
            </Link>
            <Link
              href="/tools/approve"
              className="inline-flex rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              Open manual approve tool
            </Link>
          </div>
        </div>
        <DashboardClient />
      </div>
    </AppShell>
  );
}
