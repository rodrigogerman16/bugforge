import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getTestCaseDetail, getAreas } from "@/lib/data";
import { TestCaseForm } from "@/components/test-cases/test-case-form";

export default async function EditTestCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [testCase, areas] = await Promise.all([getTestCaseDetail(id), getAreas()]);
  if (!testCase) notFound();

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
        <h1 className="text-2xl font-bold tracking-wide text-[color:var(--bf-ink-primary)] uppercase">
          Edit Test Case
        </h1>
      </header>

      <TestCaseForm
        gameId={testCase.gameId}
        areas={areas}
        testCaseId={testCase.id}
        initial={{
          title: testCase.title,
          description: testCase.description ?? "",
          preconditions: testCase.preconditions ?? "",
          steps: testCase.steps,
          expected: testCase.expected,
          categoryId: testCase.categoryId,
          priority: testCase.priority,
          platform: testCase.platform,
        }}
      />
    </div>
  );
}
