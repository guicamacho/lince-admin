import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { TopBar } from "@/components/top-bar";
import { Sidebar } from "@/components/sidebar";
import { PendingBanner } from "@/components/pending-banner";
import { listOrgs } from "@/lib/admin-api";
import { orgStatus } from "@/lib/org-status";

// Staff auth gate. Network isolation (Cloudflare Access / Fly private networking)
// sits in front of this in deployment — PRD-04 §0.
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  // Persistent pending-approvals banner: companies awaiting Avenia's verdict.
  const orgs = await listOrgs();
  const awaiting = orgs.filter((o) => orgStatus(o).awaitingDecision);

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <div className="flex flex-1">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <PendingBanner orgs={awaiting} />
          <main className="flex-1 p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
