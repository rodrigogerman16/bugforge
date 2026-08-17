import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getGamesForBugCreation, getAreas } from "@/lib/data";
import { BugCreateForm } from "@/components/bugs/bug-create-form";

export default async function NewBugPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const { game: gameSlug } = await searchParams;
  const [games, areas] = await Promise.all([getGamesForBugCreation(), getAreas()]);
  const defaultGame = games.find((g) => g.slug === gameSlug) ?? games[0];

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <Link
        href="/bugs"
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-ink-primary)]"
      >
        <ArrowLeft size={13} />
        Back to bugs
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-wide text-[color:var(--bf-ink-primary)] uppercase">
          Report a Bug
        </h1>
        <p className="mt-1 text-[12px] text-[color:var(--bf-ink-muted)]">
          BugForge AI checks for possible duplicates as you type — it&apos;s a suggestion, not a block.
        </p>
      </header>

      {!defaultGame ? (
        <p className="text-sm text-[color:var(--bf-ink-muted)]">No games exist yet.</p>
      ) : (
        <BugCreateForm gameId={defaultGame.id} games={games} areas={areas} />
      )}
    </div>
  );
}
