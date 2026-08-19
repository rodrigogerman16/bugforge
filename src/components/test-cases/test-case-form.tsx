"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TEST_CASE_PRIORITY_META, TEST_CASE_PRIORITY_ORDER } from "@/lib/test-case";
import { PLATFORM_LABEL, PLATFORM_ORDER } from "@/lib/platform";
import { createTestCase, updateTestCase, type TestCaseInput } from "@/app/test-cases/actions";
import type { TestCasePriority, Platform } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-3 py-2 text-sm text-[color:var(--bf-ink-primary)] outline-none placeholder:text-[color:var(--bf-ink-muted)] focus:border-[color:var(--bf-border-strong)]";
const labelClass = "mb-1.5 block text-[12px] font-medium text-[color:var(--bf-ink-secondary)]";

export function TestCaseForm({
  gameId,
  games,
  gamePlatformsById,
  areas,
  testCaseId,
  initial,
}: {
  gameId: string;
  games?: { id: string; name: string }[];
  gamePlatformsById: Record<string, Platform[]>;
  areas: { id: string; name: string }[];
  testCaseId?: string;
  initial?: Partial<TestCaseInput>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedGameId, setSelectedGameId] = useState(gameId);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [preconditions, setPreconditions] = useState(initial?.preconditions ?? "");
  const [steps, setSteps] = useState(initial?.steps ?? "");
  const [expected, setExpected] = useState(initial?.expected ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? areas[0]?.id ?? "");
  const [priority, setPriority] = useState<TestCasePriority>(initial?.priority ?? "MEDIUM");
  const [platform, setPlatform] = useState<Platform>(initial?.platform ?? "PC");

  // The platform picker adapts to whichever game is selected — never offer a
  // platform the current game doesn't actually support.
  const availablePlatforms = PLATFORM_ORDER.filter((p) =>
    (gamePlatformsById[selectedGameId] ?? PLATFORM_ORDER).includes(p)
  );

  useEffect(() => {
    if (availablePlatforms.length > 0 && !availablePlatforms.includes(platform)) {
      setPlatform(availablePlatforms[0]);
    }
    // Only re-check when the selected game (and thus its supported platforms) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGameId]);

  const canSubmit = title.trim() && steps.trim() && expected.trim();

  function handleSubmit() {
    if (!canSubmit || isPending) return;
    const input: TestCaseInput = {
      gameId: selectedGameId,
      title,
      description,
      preconditions,
      steps,
      expected,
      categoryId: categoryId || null,
      priority,
      platform,
    };
    startTransition(async () => {
      if (testCaseId) {
        await updateTestCase(testCaseId, input);
        router.push(`/test-cases/${testCaseId}`);
      } else {
        const newId = await createTestCase(input);
        router.push(`/test-cases/${newId}`);
      }
    });
  }

  return (
    <div className="space-y-4">
      {games && (
        <div>
          <label className={labelClass} htmlFor="tc-game">Game</label>
          <select id="tc-game" value={selectedGameId} onChange={(e) => setSelectedGameId(e.target.value)} className={inputClass}>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className={labelClass} htmlFor="tc-title">Title</label>
        <input id="tc-title" value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Player can complete matchmaking" />
      </div>

      <div>
        <label className={labelClass} htmlFor="tc-description">Description</label>
        <textarea id="tc-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} />
      </div>

      <div>
        <label className={labelClass} htmlFor="tc-preconditions">Preconditions</label>
        <textarea id="tc-preconditions" value={preconditions} onChange={(e) => setPreconditions(e.target.value)} rows={2} className={inputClass} placeholder="What must be true before running this test" />
      </div>

      <div>
        <label className={labelClass} htmlFor="tc-steps">Steps</label>
        <textarea id="tc-steps" value={steps} onChange={(e) => setSteps(e.target.value)} rows={4} className={inputClass} placeholder={"1. ...\n2. ...\n3. ..."} />
      </div>

      <div>
        <label className={labelClass} htmlFor="tc-expected">Expected Result</label>
        <textarea id="tc-expected" value={expected} onChange={(e) => setExpected(e.target.value)} rows={2} className={inputClass} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass} htmlFor="tc-priority">Priority</label>
          <select id="tc-priority" value={priority} onChange={(e) => setPriority(e.target.value as TestCasePriority)} className={inputClass}>
            {TEST_CASE_PRIORITY_ORDER.map((p) => (
              <option key={p} value={p}>
                {TEST_CASE_PRIORITY_META[p].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="tc-category">Category</label>
          <select id="tc-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={inputClass}>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="tc-platform">Platform</label>
          <select id="tc-platform" value={platform} onChange={(e) => setPlatform(e.target.value as Platform)} className={inputClass}>
            {availablePlatforms.map((p) => (
              <option key={p} value={p}>
                {PLATFORM_LABEL[p]}
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
          {testCaseId ? "Save Changes" : "Create Test Case"}
        </button>
      </div>
    </div>
  );
}
