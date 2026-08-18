import Link from "next/link";
import { Plus } from "lucide-react";
import { getTestCases } from "@/lib/data";
import { TEST_CASE_PRIORITY_META, TEST_CASE_STATUS_META } from "@/lib/test-case";
import { PLATFORM_LABEL } from "@/lib/platform";
import { formatRelativeTime } from "@/lib/relative-time";
import { ExportLinks } from "@/components/export-links";

export default async function TestCasesPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const { game: gameSlug } = await searchParams;
  const testCases = await getTestCases(gameSlug);

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-wide text-[color:var(--bf-ink-primary)] uppercase">
            Test Cases
          </h1>
          <p className="mt-1 text-sm text-[color:var(--bf-ink-muted)]">
            {testCases.length} test case{testCases.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ExportLinks base="/api/export/test-cases" params={{ game: gameSlug }} />
          <Link
            href={`/test-cases/new${gameSlug ? `?game=${gameSlug}` : ""}`}
            className="flex shrink-0 items-center gap-1.5 rounded-md bg-[color:var(--bf-brand)] px-3 py-1.5 text-[12px] font-medium text-black hover:opacity-90"
          >
            <Plus size={13} />
            New Test Case
          </Link>
        </div>
      </header>

      {testCases.length === 0 ? (
        <p className="text-sm text-[color:var(--bf-ink-muted)]">No test cases found.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-[color:var(--bf-border)]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] text-left text-[12px] text-[color:var(--bf-ink-muted)]">
                <th className="px-4 py-2.5 font-medium">ID</th>
                <th className="px-4 py-2.5 font-medium">Title</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium">Priority</th>
                <th className="px-4 py-2.5 font-medium">Platform</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Last Run</th>
              </tr>
            </thead>
            <tbody>
              {testCases.map((tc) => {
                const priorityMeta = TEST_CASE_PRIORITY_META[tc.priority];
                const statusMeta = TEST_CASE_STATUS_META[tc.status];
                return (
                  <tr key={tc.id} className="border-b border-[color:var(--bf-border)] last:border-b-0 hover:bg-[color:var(--bf-surface)]">
                    <td className="px-4 py-3">
                      <Link href={`/test-cases/${tc.id}`} className="font-mono text-[12px] text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-brand)]">
                        TC-{String(tc.number).padStart(5, "0")}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/test-cases/${tc.id}`} className="font-medium text-[color:var(--bf-ink-primary)] hover:text-[color:var(--bf-brand)]">
                        {tc.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-[color:var(--bf-ink-secondary)]">{tc.category?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium" style={{ color: priorityMeta.color }}>
                        {priorityMeta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[color:var(--bf-ink-secondary)]">{PLATFORM_LABEL[tc.platform]}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5 font-medium" style={{ color: statusMeta.color }}>
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: statusMeta.color }} />
                        {statusMeta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[color:var(--bf-ink-muted)]">
                      {tc.latestRunAt ? formatRelativeTime(tc.latestRunAt) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
