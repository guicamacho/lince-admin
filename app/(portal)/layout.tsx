import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { TopBar } from "@/components/top-bar";
import { SessionTimeout } from "@/components/session-timeout";
import { Sidebar } from "@/components/sidebar";
import { PendingBanner } from "@/components/pending-banner";
import { listOrgs, listApprovals, listCases } from "@/lib/admin-api";
import { orgStatus } from "@/lib/org-status";
import { MAKER_CHECKER_ENABLED } from "@/lib/flags";

// Staff auth gate. Network isolation (Cloudflare Access / Fly private networking)
// sits in front of this in deployment — PRD-04 §0.
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Persistent pending-approvals banner: companies awaiting Avenia's verdict.
  // Open maker-checker requests drive the "Aprovações" sidebar badge.
  const [orgs, approvals, cases] = await Promise.all([
    listOrgs(),
    MAKER_CHECKER_ENABLED ? listApprovals() : Promise.resolve([]),
    listCases(),
  ]);
  const awaiting = orgs.filter((o) => orgStatus(o).awaitingDecision);
  const openCasesCount = cases.filter((c) => c.status !== "closed").length;

  return (
    <div className="flex min-h-screen flex-col">
      <SessionTimeout />
      <TopBar />
      <div className="flex flex-1">
        <Sidebar approvalsCount={approvals.length} openCasesCount={openCasesCount} />
        <div className="flex flex-1 flex-col">
          <PendingBanner orgs={awaiting} />
          <main className="flex-1 p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
