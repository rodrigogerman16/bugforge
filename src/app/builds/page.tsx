import Link from "next/link";
import { GitCompare } from "lucide-react";
import { getBuilds } from "@/lib/data";
import { BuildCard } from "@/components/builds/build-card";

export default async function BuildsPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const { game: gameSlug } = await searchParams;
  const builds = await getBuilds({ gameSlug });

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-wide text-[color:var(--bf-ink-primary)] uppercase">Builds</h1>
          <p className="mt-1 text-sm text-[color:var(--bf-ink-muted)]">
            {builds.length} build{builds.length === 1 ? "" : "s"} tracked
          </p>
        </div>
        <Link
          href="/builds/compare"
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-3 py-1.5 text-[12px] font-medium text-[color:var(--bf-ink-secondary)] hover:border-[color:var(--bf-border-strong)] hover:text-[color:var(--bf-ink-primary)]"
        >
          <GitCompare size={13} />
          Compare Builds
        </Link>
      </header>

      {builds.length === 0 ? (
        <p className="text-sm text-[color:var(--bf-ink-muted)]">No builds found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {builds.map((build) => (
            <BuildCard key={build.id} build={build} />
          ))}
        </div>
      )}
    </div>
  );
}
