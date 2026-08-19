import { getTesterProfiles } from "@/lib/db";
import { TesterCard } from "@/components/testers/tester-card";
import { ExportLinks } from "@/components/ui/export-links";

export default async function TestersPage() {
  const testers = await getTesterProfiles();

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-wide text-[color:var(--bf-ink-primary)] uppercase">Testers</h1>
          <p className="mt-1 text-sm text-[color:var(--bf-ink-muted)]">
            {testers.length} team member{testers.length === 1 ? "" : "s"} · QA visibility, not a leaderboard
          </p>
        </div>
        <ExportLinks base="/api/export/testers" />
      </header>

      {testers.length === 0 ? (
        <p className="text-sm text-[color:var(--bf-ink-muted)]">No testers found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {testers.map((tester) => (
            <TesterCard key={tester.id} tester={tester} />
          ))}
        </div>
      )}
    </div>
  );
}
