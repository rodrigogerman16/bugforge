import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getShellGames } from "@/lib/data";
import { TestCaseForm } from "@/components/test-cases/test-case-form";

export default async function NewTestCasePage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const { game: gameSlug } = await searchParams;
  const games = await getShellGames();
  const defaultGame = games.find((g) => g.slug === gameSlug) ?? games[0];

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
      </header>

      {!defaultGame ? (
        <p className="text-sm text-[color:var(--bf-ink-muted)]">No games exist yet.</p>
      ) : (
        <TestCaseForm gameId={defaultGame.id} games={games.map((g) => ({ id: g.id, name: g.name }))} />
      )}
    </div>
  );
}
