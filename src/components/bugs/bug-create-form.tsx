"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Sparkles, ExternalLink, Loader2, Check, Paperclip, X, TriangleAlert } from "lucide-react";
import { SEVERITY_ORDER, SEVERITY_META } from "@/lib/severity";
import { PRIORITY_ORDER, PRIORITY_META } from "@/lib/priority";
import { PLATFORM_LABEL, PLATFORM_ORDER } from "@/lib/platform";
import { BUG_STATUS_META } from "@/lib/status-labels";
import { validateAttachmentFile, formatBytes, ATTACHMENT_RULES } from "@/lib/attachments";
import { uploadAttachment } from "@/lib/upload-attachment";
import { createBug, type CreateBugInput, type CreateBugEvidenceInput } from "@/app/bugs/actions";
import { searchDuplicateBugsForDraft, analyzeBugDraft, getBugDraftQuality } from "@/app/ai/actions";
import type { DuplicateCandidate } from "@/lib/ai/duplicate-detection";
import type { BugDraftQuality } from "@/lib/ai/bug-analysis";
import type { GameCreateOption, AreaSummary, TagSummary } from "@/lib/data";
import type { BugSeverity, BugPriority, Platform } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-3 py-2 text-sm text-[color:var(--bf-ink-primary)] outline-none placeholder:text-[color:var(--bf-ink-muted)] focus:border-[color:var(--bf-border-strong)]";
const labelClass = "mb-1.5 block text-[12px] font-medium text-[color:var(--bf-ink-secondary)]";

const QUALITY_COLOR = (percent: number) =>
  percent >= 80
    ? "var(--bf-status-good)"
    : percent >= 50
      ? "var(--bf-status-warning)"
      : "var(--bf-status-critical)";

export function BugCreateForm({
  gameId,
  games,
  areas,
  tags,
  onCancel,
  onCreated,
}: {
  gameId: string;
  games: GameCreateOption[];
  areas: AreaSummary[];
  tags: TagSummary[];
  onCancel: () => void;
  onCreated: (bugId: string) => void;
}) {
  const [isPending, startTransition] = useTransition();

  const [selectedGameId, setSelectedGameId] = useState(gameId);
  const selectedGame = games.find((g) => g.id === selectedGameId) ?? games[0];

  const [buildId, setBuildId] = useState(selectedGame?.builds[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<BugSeverity>("MEDIUM");
  const [priority, setPriority] = useState<BugPriority>("P2");
  const [severityTouched, setSeverityTouched] = useState(false);
  const [priorityTouched, setPriorityTouched] = useState(false);
  const [areaId, setAreaId] = useState("");
  const [platform, setPlatform] = useState<Platform>(selectedGame?.platforms[0] ?? "PC");
  const [stepsToReproduce, setStepsToReproduce] = useState("");
  const [expectedResult, setExpectedResult] = useState("");
  const [actualResult, setActualResult] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

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

  // "Analyze with AI" — fills in whatever's still blank (steps, actual
  // result, area) and, if the tester hasn't touched severity/priority away
  // from their defaults yet, applies those suggestions too. Never overwrites
  // anything the tester already wrote.
  const [isAnalyzing, startAnalyzing] = useTransition();
  const [aiFillSummary, setAiFillSummary] = useState<string[] | null>(null);

  function runAnalyzeWithAi() {
    const source = `${title} ${description}`.trim();
    if (source.length < 8 || isAnalyzing || !selectedGame) return;
    startAnalyzing(async () => {
      const result = await analyzeBugDraft({
        gameId: selectedGameId,
        areaId: areaId || null,
        areaName: areas.find((a) => a.id === areaId)?.name ?? null,
        tags: selectedTagIds.map((id) => tags.find((t) => t.id === id)?.name).filter((n): n is string => Boolean(n)),
        buildStatus: selectedGame.builds.find((b) => b.id === buildId)?.status ?? "INTERNAL",
        title,
        description,
        severity,
        stepsToReproduce,
        actualResult,
      });

      const filled: string[] = [];
      if (result.stepsToReproduce.length > 0 && !stepsToReproduce.trim()) {
        setStepsToReproduce(result.stepsToReproduce.map((s, i) => `${i + 1}. ${s}`).join("\n"));
        filled.push("Steps to reproduce");
      }
      if (result.actualResult && !actualResult.trim()) {
        setActualResult(result.actualResult);
        filled.push("Actual result");
      }
      if (result.area && !areaId) {
        setAreaId(result.area.id);
        filled.push(`Area — ${result.area.name}`);
      }
      if (!severityTouched && result.severity.changed) {
        setSeverity(result.severity.suggested);
        filled.push(`Severity — ${SEVERITY_META[result.severity.suggested].label}`);
      }
      if (!priorityTouched && result.priority.changed) {
        setPriority(result.priority.suggested);
        filled.push(`Priority — ${PRIORITY_META[result.priority.suggested].code}`);
      }

      setAiFillSummary(
        filled.length > 0 ? filled : ["Nothing left it could safely fill in — this draft already has what BugForge AI can add."]
      );
    });
  }

  // Attachments — uploaded immediately (so a slow/failed upload surfaces
  // right away, not at submit time) but only persisted as real Evidence
  // rows once the bug itself is created.
  const [attachments, setAttachments] = useState<CreateBugEvidenceInput[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const validation = validateAttachmentFile(file);
    if (!validation.ok) {
      setUploadError(validation.error);
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const uploaded = await uploadAttachment(file, "evidence");
      setAttachments((prev) => [
        ...prev,
        {
          type: uploaded.kind,
          url: uploaded.url,
          fileName: uploaded.fileName,
          fileSizeBytes: uploaded.fileSizeBytes,
          content: uploaded.content,
        },
      ]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  // Bug quality checklist — recomputed shortly after the tester stops
  // typing in any of the fields it scores, so it always reflects the
  // current draft without hammering the server on every keystroke.
  const [quality, setQuality] = useState<BugDraftQuality | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      getBugDraftQuality({ title, description, stepsToReproduce, expectedResult, actualResult, hasBuild: Boolean(buildId) }).then(
        setQuality
      );
    }, 400);
    return () => clearTimeout(timer);
  }, [title, description, stepsToReproduce, expectedResult, actualResult, buildId]);

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
      tagIds: selectedTagIds,
      evidence: attachments,
    };
    startTransition(async () => {
      const newId = await createBug(input);
      onCreated(newId);
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

      <div>
        <button
          type="button"
          onClick={runAnalyzeWithAi}
          disabled={`${title} ${description}`.trim().length < 8 || isAnalyzing}
          className="flex items-center gap-1.5 rounded-md border border-[color:var(--bf-brand)]/30 px-3 py-1.5 text-[12px] font-medium text-[color:var(--bf-brand)] hover:bg-[color:var(--bf-brand-soft)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isAnalyzing ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          Analyze with AI
        </button>

        {aiFillSummary && (
          <div className="mt-2 rounded-lg border border-[color:var(--bf-brand)]/25 bg-[color:var(--bf-surface)] p-3">
            <p className="mb-1 text-[12px] font-semibold text-[color:var(--bf-ink-primary)]">BugForge AI filled in:</p>
            <ul className="list-disc space-y-0.5 pl-4 text-[12px] text-[color:var(--bf-ink-secondary)]">
              {aiFillSummary.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] leading-relaxed text-[color:var(--bf-ink-muted)]">
              Computed from your title, description, and this game&apos;s real data — review and edit anything before
              submitting. Expected Result isn&apos;t auto-filled; only you know what should happen instead.
            </p>
          </div>
        )}
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
          <select
            value={severity}
            onChange={(e) => {
              setSeverity(e.target.value as BugSeverity);
              setSeverityTouched(true);
            }}
            className={inputClass}
          >
            {SEVERITY_ORDER.map((s) => (
              <option key={s} value={s}>
                {SEVERITY_META[s].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Priority</label>
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value as BugPriority);
              setPriorityTouched(true);
            }}
            className={inputClass}
          >
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
        <label className={labelClass}>Tags</label>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => {
            const active = selectedTagIds.includes(t.id);
            return (
              <button
                type="button"
                key={t.id}
                onClick={() =>
                  setSelectedTagIds((prev) => (active ? prev.filter((id) => id !== t.id) : [...prev, t.id]))
                }
                className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium"
                style={
                  active
                    ? { backgroundColor: `${t.color}26`, color: t.color, borderColor: `${t.color}66` }
                    : { borderColor: "var(--bf-border)", color: "var(--bf-ink-secondary)" }
                }
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                {t.name}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className={labelClass}>Steps to Reproduce</label>
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

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className={labelClass}>Attachments</label>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title={`Add an attachment (${Object.values(ATTACHMENT_RULES).map((r) => r.label.toLowerCase()).join(", ")})`}
            className="flex items-center gap-1.5 rounded-md border border-[color:var(--bf-border)] px-2.5 py-1 text-[11px] text-[color:var(--bf-ink-secondary)] hover:border-[color:var(--bf-border-strong)] disabled:opacity-50"
          >
            {uploading ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}
            {uploading ? "Uploading…" : "Add Attachment"}
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFile} />
        </div>
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((a, i) => (
              <span
                key={i}
                className="flex items-center gap-1.5 rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-2 py-1 text-[12px] text-[color:var(--bf-ink-secondary)]"
              >
                <Paperclip size={11} />
                {a.fileName}
                <span className="text-[color:var(--bf-ink-muted)]">
                  · {a.type} · {formatBytes(a.fileSizeBytes)}
                </span>
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label="Remove attachment"
                  className="text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-ink-primary)]"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
        )}
        {uploadError && (
          <p className="mt-1.5 text-[11px] text-[color:var(--bf-status-critical)]">{uploadError}</p>
        )}
      </div>

      {quality && (
        <div className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-[color:var(--bf-ink-primary)]">Bug quality</span>
            <span className="text-sm font-bold" style={{ color: QUALITY_COLOR(quality.percent) }}>
              {quality.percent}%
            </span>
          </div>
          <ul className="space-y-1">
            {quality.checks.map((c) => (
              <li
                key={c.key}
                className={cn(
                  "flex items-center gap-1.5 text-[12px]",
                  c.met ? "text-[color:var(--bf-ink-secondary)]" : "text-[color:var(--bf-status-warning)]"
                )}
              >
                {c.met ? (
                  <Check size={12} className="shrink-0 text-[color:var(--bf-status-good)]" />
                ) : (
                  <TriangleAlert size={12} className="shrink-0" />
                )}
                {c.met ? c.label : `Missing ${c.label.toLowerCase()}`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onCancel}
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
