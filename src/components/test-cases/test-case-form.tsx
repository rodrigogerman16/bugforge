"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TEST_CASE_PRIORITY_META, TEST_CASE_PRIORITY_ORDER } from "@/lib/test-case";
import { PLATFORM_LABEL } from "@/lib/platform";
import { AREAS } from "@/lib/areas";
import { createTestCase, updateTestCase, type TestCaseInput } from "@/app/test-cases/actions";
import type { TestCasePriority, Platform } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const PLATFORM_ORDER: Platform[] = ["PC", "PLAYSTATION", "XBOX", "SWITCH", "MOBILE", "VR"];

const inputClass =
  "w-full rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-3 py-2 text-sm text-[color:var(--bf-ink-primary)] outline-none placeholder:text-[color:var(--bf-ink-muted)] focus:border-[color:var(--bf-border-strong)]";
const labelClass = "mb-1.5 block text-[12px] font-medium text-[color:var(--bf-ink-secondary)]";

export function TestCaseForm({
  gameId,
  games,
  testCaseId,
  initial,
}: {
  gameId: string;
  games?: { id: string; name: string }[];
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
  const [category, setCategory] = useState(initial?.category || AREAS[0]);
  const [priority, setPriority] = useState<TestCasePriority>(initial?.priority ?? "MEDIUM");
  const [platform, setPlatform] = useState<Platform>(initial?.platform ?? "PC");

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
      category,
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
          <label className={labelClass}>Game</label>
          <select value={selectedGameId} onChange={(e) => setSelectedGameId(e.target.value)} className={inputClass}>
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className={labelClass}>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} placeholder="e.g. Player can complete matchmaking" />
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} />
      </div>

      <div>
        <label className={labelClass}>Preconditions</label>
        <textarea value={preconditions} onChange={(e) => setPreconditions(e.target.value)} rows={2} className={inputClass} placeholder="What must be true before running this test" />
      </div>

      <div>
        <label className={labelClass}>Steps</label>
        <textarea value={steps} onChange={(e) => setSteps(e.target.value)} rows={4} className={inputClass} placeholder={"1. ...\n2. ...\n3. ..."} />
      </div>

      <div>
        <label className={labelClass}>Expected Result</label>
        <textarea value={expected} onChange={(e) => setExpected(e.target.value)} rows={2} className={inputClass} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as TestCasePriority)} className={inputClass}>
            {TEST_CASE_PRIORITY_ORDER.map((p) => (
              <option key={p} value={p}>
                {TEST_CASE_PRIORITY_META[p].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
            {AREAS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Platform</label>
          <select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)} className={inputClass}>
            {PLATFORM_ORDER.map((p) => (
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
