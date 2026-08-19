import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTestCaseDetail, getGameSessions } from "@/lib/db";
import { ExecuteTestCaseForm } from "@/components/test-cases/execute-test-case-form";

function parseSteps(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
}

export default async function ExecuteTestCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const testCase = await getTestCaseDetail(id);
  if (!testCase) notFound();

  const sessions = await getGameSessions(testCase.gameId);
  const stepTexts = parseSteps(testCase.steps);

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <Link
        href={`/test-cases/${id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-ink-primary)]"
      >
        <ArrowLeft size={13} />
        Back to test case
      </Link>

      <header className="mb-6">
        <p className="font-mono text-[12px] text-[color:var(--bf-ink-muted)]">TC-{String(testCase.number).padStart(5, "0")}</p>
        <h1 className="mt-1 text-2xl font-bold text-[color:var(--bf-ink-primary)]">{testCase.title}</h1>
      </header>

      {testCase.preconditions && (
        <div className="mb-6 rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-4">
          <p className="text-[11px] font-semibold tracking-wide text-[color:var(--bf-ink-muted)] uppercase">Preconditions</p>
          <p className="mt-1 text-sm text-[color:var(--bf-ink-secondary)]">{testCase.preconditions}</p>
        </div>
      )}

      {stepTexts.length === 0 || sessions.length === 0 ? (
        <p className="text-sm text-[color:var(--bf-ink-muted)]">
          {sessions.length === 0 ? "No QA sessions exist for this game yet." : "This test case has no steps."}
        </p>
      ) : (
        <ExecuteTestCaseForm
          testCaseId={testCase.id}
          stepTexts={stepTexts}
          sessions={sessions.map((s) => ({ id: s.id, name: s.name, build: s.build }))}
          testCaseHref={`/test-cases/${id}`}
        />
      )}
    </div>
  );
}
