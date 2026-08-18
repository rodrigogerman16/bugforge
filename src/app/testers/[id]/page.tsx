import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTesterProfileDetail, getCurrentUser } from "@/lib/data";
import { TESTER_ROLE_META, initials } from "@/lib/tester";
import { canManageRoles } from "@/lib/permissions";
import { TesterActivityFeed } from "@/components/testers/tester-activity-feed";
import { RoleSelect } from "@/components/testers/role-select";

function StatTile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium tracking-wide text-[color:var(--bf-ink-muted)] uppercase">{label}</dt>
      <dd className="mt-1 text-lg font-bold" style={{ color: color ?? "var(--bf-ink-primary)" }}>
        {value}
      </dd>
    </div>
  );
}

export default async function TesterProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [tester, currentUser] = await Promise.all([getTesterProfileDetail(id), getCurrentUser()]);
  if (!tester) notFound();

  const roleMeta = TESTER_ROLE_META[tester.role];
  const canEditRole = canManageRoles(currentUser.role);

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <Link
        href="/testers"
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-ink-primary)]"
      >
        <ArrowLeft size={13} />
        Back to testers
      </Link>

      <header className="mb-6 flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[color:var(--bf-brand-soft)] text-lg font-semibold text-[color:var(--bf-brand)]">
          {initials(tester.name)}
        </span>
        <div>
          <h1 className="text-2xl font-bold text-[color:var(--bf-ink-primary)]">{tester.name}</h1>
          {canEditRole ? (
            <div className="mt-1">
              <RoleSelect testerId={tester.id} role={tester.role} />
            </div>
          ) : (
            <p className="text-[13px] font-medium" style={{ color: roleMeta.color }}>
              {roleMeta.label}
            </p>
          )}
        </div>
      </header>

      <dl className="mb-6 grid grid-cols-2 gap-4 rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-4 sm:grid-cols-3">
        <StatTile label="Bugs Reported" value={String(tester.bugsReported)} />
        <StatTile label="Bugs Confirmed" value={String(tester.bugsConfirmed)} color="var(--bf-status-good)" />
        <StatTile label="Bugs Rejected" value={String(tester.bugsRejected)} />
        <StatTile label="Test Cases Executed" value={String(tester.testCasesExecuted)} />
        <StatTile
          label="Reproduction Quality"
          value={tester.reproductionQuality !== null ? `${tester.reproductionQuality}%` : "No data"}
        />
      </dl>
      <p className="mb-6 text-[12px] text-[color:var(--bf-ink-muted)]">
        Reproduction quality reflects how many of this tester&apos;s own reported bugs were confirmed rather than
        rejected — a view into report quality over time, not a comparison against other testers.
      </p>

      <section>
        <h2 className="mb-3 text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">Activity</h2>
        <TesterActivityFeed groups={tester.activityByDay} />
      </section>
    </div>
  );
}
