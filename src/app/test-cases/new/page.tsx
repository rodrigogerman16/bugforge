import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getShellGames, getAreas, getBugForAi } from "@/lib/data";
import { draftTestCaseFromBug } from "@/lib/ai/test-generation";
import { TestCaseForm } from "@/components/test-cases/test-case-form";

export default async function NewTestCasePage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string; fromBug?: string }>;
}) {
  const { game: gameSlug, fromBug } = await searchParams;
  const [games, areas, sourceBug] = await Promise.all([
    getShellGames(),
    getAreas(),
    fromBug ? getBugForAi(fromBug) : Promise.resolve(null),
  ]);
  const defaultGame = (sourceBug ? games.find((g) => g.id === sourceBug.gameId) : undefined) ?? games.find((g) => g.slug === gameSlug) ?? games[0];
  const draft = sourceBug ? draftTestCaseFromBug(sourceBug) : null;

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <Link
        href="/test-cases"
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-ink-primary)]"
      >
        <ArrowLeft size={13} />
        Back to test cases
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-wide text-[color:var(--bf-ink-primary)] uppercase">
          New Test Case
        </h1>
        {sourceBug && (
          <p className="mt-1 text-[12px] text-[color:var(--bf-ink-muted)]">
            Drafted by BugForge AI from BUG-{sourceBug.number} ({sourceBug.title}).
          </p>
        )}
      </header>

      {!defaultGame ? (
        <p className="text-sm text-[color:var(--bf-ink-muted)]">No games exist yet.</p>
      ) : (
        <TestCaseForm
          gameId={defaultGame.id}
          games={games.map((g) => ({ id: g.id, name: g.name }))}
          gamePlatformsById={Object.fromEntries(games.map((g) => [g.id, g.platforms]))}
          areas={areas}
          initial={
            draft && sourceBug
              ? {
                  title: draft.title,
                  description: draft.description,
                  preconditions: draft.preconditions,
                  steps: draft.steps,
                  expected: draft.expected,
                  categoryId: draft.categoryId,
                  priority: draft.priority,
                  platform: draft.platform,
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
