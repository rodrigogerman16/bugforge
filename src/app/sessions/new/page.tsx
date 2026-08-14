import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getGamesWithBuilds } from "@/lib/data";
import { NewSessionForm } from "@/components/sessions/new-session-form";

export default async function NewSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const { game: gameSlug } = await searchParams;
  const games = await getGamesWithBuilds();
  const defaultGame = games.find((g) => g.slug === gameSlug) ?? games[0];

  return (
    <div className="mx-auto max-w-lg px-8 py-8">
      <Link
        href="/sessions"
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-ink-primary)]"
      >
        <ArrowLeft size={13} />
        Back to sessions
      </Link>

      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-wide text-[color:var(--bf-ink-primary)] uppercase">New Session</h1>
      </header>

      {!defaultGame ? (
        <p className="text-sm text-[color:var(--bf-ink-muted)]">No games exist yet.</p>
      ) : defaultGame.builds.length === 0 ? (
        <p className="text-sm text-[color:var(--bf-ink-muted)]">This game has no builds yet.</p>
      ) : (
        <NewSessionForm games={games.filter((g) => g.builds.length > 0)} defaultGameId={defaultGame.id} />
      )}
    </div>
  );
}
