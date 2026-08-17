"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, ExternalLink, Loader2, Check } from "lucide-react";
import { SEVERITY_ORDER, SEVERITY_META } from "@/lib/severity";
import { PRIORITY_ORDER, PRIORITY_META } from "@/lib/priority";
import { PLATFORM_LABEL, PLATFORM_ORDER } from "@/lib/platform";
import { BUG_STATUS_META } from "@/lib/status-labels";
import { createBug, type CreateBugInput } from "@/app/bugs/actions";
import { searchDuplicateBugsForDraft, suggestReproStepsForDraft } from "@/app/ai/actions";
import type { DuplicateCandidate } from "@/lib/ai/heuristics";
import type { BugSeverity, BugPriority, Platform } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-3 py-2 text-sm text-[color:var(--bf-ink-primary)] outline-none placeholder:text-[color:var(--bf-ink-muted)] focus:border-[color:var(--bf-border-strong)]";
const labelClass = "mb-1.5 block text-[12px] font-medium text-[color:var(--bf-ink-secondary)]";

type GameOption = { id: string; name: string; platforms: Platform[]; builds: { id: string; version: string }[] };

export function BugCreateForm({
  gameId,
  games,
  areas,
}: {
  gameId: string;
  games: GameOption[];
  areas: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedGameId, setSelectedGameId] = useState(gameId);
  const selectedGame = games.find((g) => g.id === selectedGameId) ?? games[0];

  const [buildId, setBuildId] = useState(selectedGame?.builds[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<BugSeverity>("MEDIUM");
  const [priority, setPriority] = useState<BugPriority>("P2");
  const [areaId, setAreaId] = useState("");
  const [platform, setPlatform] = useState<Platform>(selectedGame?.platforms[0] ?? "PC");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [actualResult, setActualResult] = useState("");

  // Both the build list and the platform picker adapt to whichever game is
  // selected — never offer a build or platform that game doesn't actually have.
  useEffect(() => {
    const game = games.find((g) => g.id === selectedGameId);
    if (!game) return;
    if (!game.builds.some((b) => b.id === buildId)) setBuildId(game.builds[0]?.id ?? "");
    if (!game.platforms.includes(platform)) setPlatform(game.platforms[0] ?? "PC");
    // Only re-check when the selected game changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGameId]);

  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [searchingDuplicates, setSearchingDuplicates] = useState(false);

  const [suggestedSteps, setSuggestedSteps] = useState<string[]>([]);
  const [isSuggestingSteps, startSuggestingSteps] = useTransition();

  // On-demand, not live — the tester asks for a starting point rather than
  // having one appear mid-sentence. Nothing here invents specifics the
  // tester didn't write: it's real build data plus their own words, scaffolded
  // into steps.
  function requestReproStepsSuggestion() {
    const source = `${title} ${description}`.trim();
    if (source.length < 8 || isSuggestingSteps) return;
    startSuggestingSteps(async () => {
      const steps = await suggestReproStepsForDraft(selectedGameId, source);
      setSuggestedSteps(steps);
    });
  }

  function acceptReproStepsSuggestion() {
    setStepsToReproduce(suggestedSteps.map((s, i) => `${i + 1}. ${s}`).join("\n"));
    setSuggestedSteps([]);
  }

  // Live duplicate search: fires as the tester types the title/description,
  // debounced, scoped to the selected game. It only ever surfaces
  // candidates — nothing here blocks or auto-decides anything.
  useEffect(() => {
    if (title.trim().length < 6) {
      setDuplicates([]);
      setSearchingDuplicates(false);
      return;
    }
    setSearchingDuplicates(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      searchDuplicateBugsForDraft(selectedGameId, title, description)
        .then((results) => {
          if (!cancelled) setDuplicates(results);
        })
        .finally(() => {
          if (!cancelled) setSearchingDuplicates(false);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [title, description, selectedGameId]);

  const canSubmit = title.trim() && description.trim() && buildId;

  function handleSubmit() {
    if (!canSubmit || isPending) return;
    const input: CreateBugInput = {
      gameId: selectedGameId,
      buildId,
      title,
      description,
      severity,
      priority,
      areaId: areaId || null,
      platform,
      stepsToReproduce,
      expectedResult,
      actualResult,
    };
    startTransition(async () => {
      const newId = await createBug(input);
      router.push(`/bugs/${newId}`);
    });
  }

  if (!selectedGame) {
    return <p className="text-sm text-[color:var(--bf-ink-muted)]">No games exist yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Game</label>
          <select value={selectedGameId} onChange={(e) => setSelectedGameId(e.target.value)} className={inputClass}>
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
            {selectedGame.builds.length === 0 ? (
              <option value="">No builds yet</option>
            ) : (
              selectedGame.builds.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.version}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
          placeholder="e.g. Player falls through the warehouse floor"
        />
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={inputClass} />
      </div>

      {(searchingDuplicates || duplicates.length > 0) && (
        <div className="rounded-lg border border-[color:var(--bf-brand)]/25 bg-[color:var(--bf-surface)] p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-[color:var(--bf-ink-primary)]">
            <Sparkles size={12} className="text-[color:var(--bf-brand)]" />
            Possible duplicates
            {searchingDuplicates && <Loader2 size={11} className="animate-spin text-[color:var(--bf-ink-muted)]" />}
          </div>

          {duplicates.length === 0 ? (
            <p className="text-[12px] text-[color:var(--bf-ink-muted)]">Searching...</p>
          ) : (
            <ul className="space-y-2">
              {duplicates.map((d) => (
                <li key={d.id} className="rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-page)] p-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-[color:var(--bf-ink-primary)]">BUG-{d.number}</p>
                      <p className="truncate text-[12px] text-[color:var(--bf-ink-secondary)]">{d.title}</p>
                    </div>
                    <span className="shrink-0 rounded-full border border-[color:var(--bf-border-strong)] px-1.5 py-0.5 text-[10px] font-medium text-[color:var(--bf-ink-secondary)]">
                      Similarity: {d.similarityPercent}%
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[color:var(--bf-ink-muted)]">
                    <span style={{ color: SEVERITY_META[d.severity].color }}>{SEVERITY_META[d.severity].label}</span>
                    <span>·</span>
                    <span>{BUG_STATUS_META[d.status].label}</span>
                  </div>
                  <Link
                    href={`/bugs/${d.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex w-fit items-center gap-1.5 rounded-md border border-[color:var(--bf-border)] px-2 py-1 text-[11px] text-[color:var(--bf-ink-secondary)] hover:border-[color:var(--bf-border-strong)]"
                  >
                    Open bug
                    <ExternalLink size={10} />
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-2 text-[11px] leading-relaxed text-[color:var(--bf-ink-muted)]">
            AI-generated matches from text overlap — not confirmed duplicates. Review before deciding; creating this bug is always your call.
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Severity</label>
          <select value={severity} onChange={(e) => setSeverity(e.target.value as BugSeverity)} className={inputClass}>
            {SEVERITY_ORDER.map((s) => (
              <option key={s} value={s}>
                {SEVERITY_META[s].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as BugPriority)} className={inputClass}>
            {PRIORITY_ORDER.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_META[p].code} — {PRIORITY_META[p].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Platform</label>
          <select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)} className={inputClass}>
            {PLATFORM_ORDER.filter((p) => selectedGame.platforms.includes(p)).map((p) => (
              <option key={p} value={p}>
                {PLATFORM_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Area</label>
        <select value={areaId} onChange={(e) => setAreaId(e.target.value)} className={inputClass}>
          <option value="">No area</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className={labelClass}>Steps to Reproduce</label>
          <button
            type="button"
            onClick={requestReproStepsSuggestion}
            disabled={`${title} ${description}`.trim().length < 8 || isSuggestingSteps}
            className="flex items-center gap-1.5 text-[11px] font-medium text-[color:var(--bf-brand)] hover:underline disabled:cursor-not-allowed disabled:text-[color:var(--bf-ink-muted)] disabled:no-underline"
          >
            {isSuggestingSteps ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
            Suggest steps with BugForge AI
          </button>
        </div>

        {suggestedSteps.length > 0 && (
          <div className="mb-2 rounded-lg border border-[color:var(--bf-brand)]/25 bg-[color:var(--bf-surface)] p-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--bf-ink-primary)]">
              Suggested reproduction steps
            </p>
            <ol className="list-decimal space-y-1 pl-5 text-[12px] text-[color:var(--bf-ink-secondary)]">
              {suggestedSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
            <p className="mt-2 text-[11px] leading-relaxed text-[color:var(--bf-ink-muted)]">
              AI-generated scaffold from your description and this game&apos;s real build — not a verified repro. Accept it and edit freely, or write your own.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={acceptReproStepsSuggestion}
                className="flex items-center gap-1.5 rounded-md bg-[color:var(--bf-brand)] px-2.5 py-1.5 text-[11px] font-medium text-black hover:opacity-90"
              >
                <Check size={11} />
                Use these steps
              </button>
              <button
                type="button"
                onClick={() => setSuggestedSteps([])}
                className="rounded-md border border-[color:var(--bf-border)] px-2.5 py-1.5 text-[11px] text-[color:var(--bf-ink-secondary)] hover:border-[color:var(--bf-border-strong)]"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        <textarea
          value={stepsToReproduce}
          onChange={(e) => setStepsToReproduce(e.target.value)}
          rows={4}
          className={inputClass}
          placeholder={"1. ...\n2. ...\n3. ..."}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Expected Result</label>
          <textarea value={expectedResult} onChange={(e) => setExpectedResult(e.target.value)} rows={2} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Actual Result</label>
          <textarea value={actualResult} onChange={(e) => setActualResult(e.target.value)} rows={2} className={inputClass} />
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
          {duplicates.length > 0 ? "Create Anyway" : "Create Bug"}
        </button>
      </div>
    </div>
  );
}
