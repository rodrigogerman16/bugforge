"use client";

import { useEffect, useState, useTransition } from "react";
import { PLATFORM_ORDER } from "@/lib/platform";
import { useShellUI } from "@/components/layout/shell-ui-provider";
import { toSafeMessage } from "@/lib/utils/errors";
import { BugCreateBasicsFields } from "@/components/bugs/bug-create-basics-fields";
import { BugCreateAiAnalyze } from "@/components/bugs/bug-create-ai-analyze";
import { BugCreateDuplicatesPanel } from "@/components/bugs/bug-create-duplicates-panel";
import { BugCreateClassificationFields } from "@/components/bugs/bug-create-classification-fields";
import { BugCreateAreaTagsFields } from "@/components/bugs/bug-create-area-tags-fields";
import { BugCreateReproFields } from "@/components/bugs/bug-create-repro-fields";
import { BugCreateAttachmentsField } from "@/components/bugs/bug-create-attachments-field";
import { BugCreateQualityPanel } from "@/components/bugs/bug-create-quality-panel";
import { BugCreateFormActions } from "@/components/bugs/bug-create-form-actions";
import { SEVERITY_META } from "@/lib/severity";
import { PRIORITY_META } from "@/lib/priority";
import { createBug, type CreateBugInput, type CreateBugEvidenceInput } from "@/app/bugs/actions";
import { searchDuplicateBugsForDraft, analyzeBugDraft, getBugDraftQuality } from "@/app/ai/actions";
import type { DuplicateCandidate } from "@/lib/ai/duplicate-detection";
import type { BugReportQuality } from "@/lib/ai/bug-analysis";
import type { GameCreateOption, AreaSummary, TagSummary } from "@/lib/db";
import type { BugSeverity, BugPriority, Platform } from "@/generated/prisma/enums";

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
  const { pushToast } = useShellUI();

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
        // Best-effort background enrichment — a failure here shouldn't
        // block or interrupt writing the report, just silently leave the
        // duplicates panel empty for this draft.
        .catch(() => {})
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
      try {
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
      } catch (err) {
        pushToast(toSafeMessage("ai", err), "error");
      }
    });
  }

  // Attachments — uploaded immediately (so a slow/failed upload surfaces
  // right away, not at submit time) but only persisted as real Evidence
  // rows once the bug itself is created.
  const [attachments, setAttachments] = useState<CreateBugEvidenceInput[]>([]);

  // Report Quality checklist — recomputed shortly after the tester stops
  // typing in any of the fields it scores, so it always reflects the
  // current draft without hammering the server on every keystroke.
  const [quality, setQuality] = useState<BugReportQuality | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      getBugDraftQuality({
        title,
        description,
        stepsToReproduce,
        expectedResult,
        actualResult,
        hasEnvironment: Boolean(buildId),
        hasEvidence: attachments.length > 0,
      })
        .then(setQuality)
        // Best-effort background scoring — same as the duplicate search
        // above, a failure just leaves the checklist showing its last
        // good result instead of interrupting the draft.
        .catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, [title, description, stepsToReproduce, expectedResult, actualResult, buildId, attachments]);

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
      try {
        const newId = await createBug(input);
        onCreated(newId);
      } catch (err) {
        pushToast(toSafeMessage("database", err), "error");
      }
    });
  }

  if (!selectedGame) {
    return <p className="text-sm text-[color:var(--bf-ink-muted)]">No games exist yet.</p>;
  }

  return (
    <div className="space-y-4">
      <BugCreateBasicsFields
        games={games}
        selectedGameId={selectedGameId}
        onGameChange={setSelectedGameId}
        selectedGame={selectedGame}
        buildId={buildId}
        onBuildChange={setBuildId}
        title={title}
        onTitleChange={setTitle}
        description={description}
        onDescriptionChange={setDescription}
      />

      <BugCreateAiAnalyze
        onAnalyze={runAnalyzeWithAi}
        isAnalyzing={isAnalyzing}
        disabled={`${title} ${description}`.trim().length < 8}
        aiFillSummary={aiFillSummary}
      />

      <BugCreateDuplicatesPanel searchingDuplicates={searchingDuplicates} duplicates={duplicates} />

      <BugCreateClassificationFields
        severity={severity}
        onSeverityChange={(s) => {
          setSeverity(s);
          setSeverityTouched(true);
        }}
        priority={priority}
        onPriorityChange={(p) => {
          setPriority(p);
          setPriorityTouched(true);
        }}
        platform={platform}
        onPlatformChange={setPlatform}
        availablePlatforms={PLATFORM_ORDER.filter((p) => selectedGame.platforms.includes(p))}
      />

      <BugCreateAreaTagsFields
        areaId={areaId}
        onAreaChange={setAreaId}
        areas={areas}
        tags={tags}
        selectedTagIds={selectedTagIds}
        onToggleTag={(tagId) =>
          setSelectedTagIds((prev) => (prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]))
        }
      />

      <BugCreateReproFields
        stepsToReproduce={stepsToReproduce}
        onStepsChange={setStepsToReproduce}
        expectedResult={expectedResult}
        onExpectedChange={setExpectedResult}
        actualResult={actualResult}
        onActualChange={setActualResult}
      />

      <BugCreateAttachmentsField
        attachments={attachments}
        onAdd={(evidence) => setAttachments((prev) => [...prev, evidence])}
        onRemove={(index) => setAttachments((prev) => prev.filter((_, idx) => idx !== index))}
      />

      <BugCreateQualityPanel quality={quality} />

      <BugCreateFormActions
        onCancel={onCancel}
        onSubmit={handleSubmit}
        canSubmit={canSubmit}
        isPending={isPending}
        hasDuplicates={duplicates.length > 0}
      />
    </div>
  );
}
