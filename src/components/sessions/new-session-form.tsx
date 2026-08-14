"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSession } from "@/app/sessions/actions";
import { cn } from "@/lib/utils";

type Game = { id: string; name: string; builds: { id: string; version: string }[] };

export function NewSessionForm({ games, defaultGameId }: { games: Game[]; defaultGameId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [gameId, setGameId] = useState(defaultGameId);
  const [name, setName] = useState("");

  const selectedGame = useMemo(() => games.find((g) => g.id === gameId), [games, gameId]);
  const [buildId, setBuildId] = useState(selectedGame?.builds[0]?.id ?? "");

  function handleGameChange(newGameId: string) {
    setGameId(newGameId);
    const game = games.find((g) => g.id === newGameId);
    setBuildId(game?.builds[0]?.id ?? "");
  }

  const canSubmit = name.trim() && buildId;

  function handleSubmit() {
    if (!canSubmit || isPending) return;
    startTransition(async () => {
      const id = await createSession({ gameId, buildId, name });
      router.push(`/sessions/${id}`);
    });
  }

  const inputClass =
    "w-full rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-3 py-2 text-sm text-[color:var(--bf-ink-primary)] outline-none placeholder:text-[color:var(--bf-ink-muted)] focus:border-[color:var(--bf-border-strong)]";
  const labelClass = "mb-1.5 block text-[12px] font-medium text-[color:var(--bf-ink-secondary)]";

  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Session Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="e.g. Beta Test #24" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Game</label>
          <select value={gameId} onChange={(e) => handleGameChange(e.target.value)} className={inputClass}>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Build</label>
          <select value={buildId} onChange={(e) => setBuildId(e.target.value)} className={inputClass}>
            {selectedGame?.builds.map((b) => (
              <option key={b.id} value={b.id}>
                {b.version}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={() => router.back()}
          className="rounded-md border border-[color:var(--bf-border)] px-3 py-1.5 text-[12px] text-[color:var(--bf-ink-secondary)] hover:border-[color:var(--bf-border-strong)]"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit || isPending}
          className={cn(
            "rounded-md bg-[color:var(--bf-brand)] px-4 py-1.5 text-[12px] font-medium text-black hover:opacity-90",
            (!canSubmit || isPending) && "cursor-not-allowed opacity-50 hover:opacity-50"
          )}
        >
          Create Session
        </button>
      </div>
    </div>
  );
}
