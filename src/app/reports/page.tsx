import { FileText } from "lucide-react";
import { getGamesForReports } from "@/lib/db";

const selectClass =
  "rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-page)] px-2.5 py-1.5 text-[12px] text-[color:var(--bf-ink-primary)] outline-none focus:border-[color:var(--bf-border-strong)]";

function ReportCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action: string;
  children: React.ReactNode;
}) {
  return (
    <form action={action} method="get" className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-5">
      <p className="text-sm font-semibold text-[color:var(--bf-ink-primary)]">{title}</p>
      <p className="mt-1 text-[12px] text-[color:var(--bf-ink-muted)]">{description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {children}
        <button
          type="submit"
          className="ml-auto flex shrink-0 items-center gap-1.5 rounded-md bg-[color:var(--bf-brand)] px-3 py-1.5 text-[12px] font-medium text-black hover:opacity-90"
        >
          <FileText size={13} />
          Generate Report
        </button>
      </div>
    </form>
  );
}

function BuildSelect({ builds }: { builds: { id: string; label: string }[] }) {
  return (
    <select name="build" className={selectClass} defaultValue={builds[0]?.id}>
      {builds.length === 0 ? (
        <option value="">No builds yet</option>
      ) : (
        builds.map((b) => (
          <option key={b.id} value={b.id}>
            {b.label}
          </option>
        ))
      )}
    </select>
  );
}

function GameSelect({ games }: { games: { id: string; name: string; slug: string }[] }) {
  return (
    <select name="game" className={selectClass} defaultValue="all">
      <option value="all">All Games</option>
      {games.map((g) => (
        <option key={g.id} value={g.slug}>
          {g.name}
        </option>
      ))}
    </select>
  );
}

function RangeSelect() {
  return (
    <select name="range" className={selectClass} defaultValue="30">
      <option value="7">Last 7 days</option>
      <option value="30">Last 30 days</option>
      <option value="90">Last 90 days</option>
    </select>
  );
}

export default async function ReportsPage() {
  const games = await getGamesForReports();
  const allBuilds = games.flatMap((g) => g.builds.map((b) => ({ id: b.id, label: `${g.name} — ${b.version}` })));

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-wide text-[color:var(--bf-ink-primary)] uppercase">Reports</h1>
        <p className="mt-1 text-sm text-[color:var(--bf-ink-muted)]">
          Generate a report from real, current application data — nothing here is simulated.
        </p>
      </header>

      <div className="space-y-4">
        <ReportCard
          title="Build QA Report"
          description="Bug breakdown by severity, test pass rate, and the top open issues for one build."
          action="/reports/build-qa"
        >
          <BuildSelect builds={allBuilds} />
        </ReportCard>

        <ReportCard
          title="Release Readiness Report"
          description="Readiness score, every configured quality gate's pass/fail, and blocking issues for one build."
          action="/reports/release-readiness"
        >
          <BuildSelect builds={allBuilds} />
        </ReportCard>

        <ReportCard
          title="Weekly QA Report"
          description="The last 7 days of bug discovery, fixes, lifecycle metrics, and tester activity."
          action="/reports/weekly-qa"
        >
          <GameSelect games={games} />
        </ReportCard>

        <ReportCard
          title="Regression Report"
          description="Every confirmed regression in the selected window, with the original bug it reproduces."
          action="/reports/regression"
        >
          <GameSelect games={games} />
          <RangeSelect />
        </ReportCard>

        <ReportCard
          title="Test Coverage Report"
          description="Test execution coverage by QA discipline, and which disciplines need attention."
          action="/reports/test-coverage"
        >
          <GameSelect games={games} />
        </ReportCard>
      </div>
    </div>
  );
}
