import Link from "next/link";
import { Plus } from "lucide-react";
import { getSessions } from "@/lib/data";
import { SessionCard } from "@/components/sessions/session-card";

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const { game: gameSlug } = await searchParams;
  const sessions = await getSessions(gameSlug);

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-wide text-[color:var(--bf-ink-primary)] uppercase">
            Test Sessions
          </h1>
          <p className="mt-1 text-sm text-[color:var(--bf-ink-muted)]">
            {sessions.length} session{sessions.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href={`/sessions/new${gameSlug ? `?game=${gameSlug}` : ""}`}
          className="flex shrink-0 items-center gap-1.5 rounded-md bg-[color:var(--bf-brand)] px-3 py-1.5 text-[12px] font-medium text-black hover:opacity-90"
        >
          <Plus size={13} />
          New Session
        </Link>
      </header>

      {sessions.length === 0 ? (
        <p className="text-sm text-[color:var(--bf-ink-muted)]">No test sessions found.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <SessionCard key={session.id} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}
