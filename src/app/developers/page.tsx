import type { Metadata } from "next";
import { Code2 } from "lucide-react";
import { getDeveloperWorkload } from "@/lib/db";
import { DeveloperCard } from "@/components/testers/developer-card";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Developers — BugForge" };

export default async function DevelopersPage() {
  const developers = await getDeveloperWorkload();

  return (
    <div className="mx-auto max-w-6xl px-8 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-wide text-[color:var(--bf-ink-primary)] uppercase">Developers</h1>
        <p className="mt-1 text-sm text-[color:var(--bf-ink-muted)]">
          {developers.length} developer{developers.length === 1 ? "" : "s"} · open, in-progress, and awaiting-QA bugs by owner
        </p>
      </header>

      {developers.length === 0 ? (
        <EmptyState
          icon={Code2}
          title="No developers yet"
          description="Team members show up here once they've been given the Developer role."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {developers.map((dev) => (
            <DeveloperCard key={dev.id} developer={dev} />
          ))}
        </div>
      )}
    </div>
  );
}
