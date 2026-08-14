"use client";

import { useRouter, useSearchParams } from "next/navigation";

type BuildOption = { id: string; version: string; releasedAt: Date; game: { name: string; slug: string } };

function groupByGame(options: BuildOption[]): Map<string, BuildOption[]> {
  const groups = new Map<string, BuildOption[]>();
  for (const option of options) {
    const list = groups.get(option.game.name) ?? [];
    list.push(option);
    groups.set(option.game.name, list);
  }
  return groups;
}

export function BuildComparePicker({
  options,
  selectedAId,
  selectedBId,
}: {
  options: BuildOption[];
  selectedAId: string;
  selectedBId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const grouped = groupByGame(options);

  function updateParam(key: "a" | "b", value: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set(key, value);
    router.push(`/builds/compare?${next.toString()}`);
  }

  function renderSelect(side: "a" | "b", selectedId: string) {
    return (
      <select
        value={selectedId}
        onChange={(e) => updateParam(side, e.target.value)}
        className="w-full rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-3 py-2 text-sm font-medium text-[color:var(--bf-ink-primary)] outline-none hover:border-[color:var(--bf-border-strong)]"
      >
        {[...grouped.entries()].map(([gameName, builds]) => (
          <optgroup key={gameName} label={gameName}>
            {builds.map((b) => (
              <option key={b.id} value={b.id}>
                {b.version}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {renderSelect("a", selectedAId)}
      {renderSelect("b", selectedBId)}
    </div>
  );
}
