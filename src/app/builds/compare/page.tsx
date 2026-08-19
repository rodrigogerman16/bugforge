import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getBuildOptions, getBuilds } from "@/lib/db";
import { BuildComparePicker } from "@/components/builds/build-compare-picker";
import { BuildComparisonTable } from "@/components/builds/build-comparison-table";

export default async function BuildComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { a, b } = await searchParams;
  const options = await getBuildOptions();

  // Options are sorted newest-first within each game, so the default pair
  // (when nothing is selected yet) reads chronologically left-to-right —
  // the older build on the left, the newer one on the right.
  const selectedAId = a && options.some((o) => o.id === a) ? a : (options[1]?.id ?? options[0]?.id ?? "");
  const selectedBId = b && options.some((o) => o.id === b) ? b : (options[0]?.id ?? "");

  const results =
    selectedAId && selectedBId ? await getBuilds({ buildIds: [selectedAId, selectedBId] }) : [];
  const buildA = results.find((r) => r.id === selectedAId);
  const buildB = results.find((r) => r.id === selectedBId);

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <Link
        href="/builds"
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-ink-primary)]"
      >
        <ArrowLeft size={13} />
        Back to builds
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-wide text-[color:var(--bf-ink-primary)] uppercase">
          Build Comparison
        </h1>
      </header>

      {options.length < 2 ? (
        <p className="text-sm text-[color:var(--bf-ink-muted)]">Not enough builds to compare yet.</p>
      ) : (
        <>
          <BuildComparePicker options={options} selectedAId={selectedAId} selectedBId={selectedBId} />

          <div className="mt-6">
            {!buildA || !buildB ? (
              <p className="text-sm text-[color:var(--bf-ink-muted)]">Select two builds to compare.</p>
            ) : buildA.id === buildB.id ? (
              <p className="text-sm text-[color:var(--bf-ink-muted)]">Pick two different builds to compare.</p>
            ) : (
              <BuildComparisonTable buildA={buildA} buildB={buildB} />
            )}
          </div>
        </>
      )}
    </div>
  );
}
