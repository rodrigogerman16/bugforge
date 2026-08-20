"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Link2, Search, X } from "lucide-react";
import { BUG_STATUS_META } from "@/lib/status-labels";
import { RELATIONSHIP_PICKER_OPTIONS } from "@/lib/relationships";
import { createRelationship, deleteRelationship } from "@/app/bugs/[id]/relationship-actions";
import type { BugStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

type RelationshipItem = {
  id: string;
  label: string;
  bug: { id: string; title: string; status: string; number: number };
};

type SearchBug = { id: string; number: number; title: string; status: BugStatus; game: { name: string } };

function StatusDot({ status }: { status: string }) {
  const meta = BUG_STATUS_META[status as BugStatus];
  if (!meta) return null;
  return <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />;
}

export function BugRelationships({
  bugId,
  relationships,
  canEdit,
}: {
  bugId: string;
  relationships: RelationshipItem[];
  canEdit: boolean;
}) {
  const [pickerLabel, setPickerLabel] = useState(RELATIONSHIP_PICKER_OPTIONS[3].label);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchBug[]>([]);
  const [selected, setSelected] = useState<SearchBug | null>(null);
  const [isPending, startTransition] = useTransition();
  const requestId = useRef(0);

  useEffect(() => {
    if (selected || query.trim().length < 1) return;
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      fetch(`/api/bugs/search?q=${encodeURIComponent(query)}&excludeId=${bugId}`)
        .then((res) => res.json())
        .then((data) => {
          if (id === requestId.current) setResults(data.bugs ?? []);
        })
        .catch(() => {});
    }, 200);
    return () => clearTimeout(timer);
  }, [query, selected, bugId]);

  function handleLink() {
    if (!selected || isPending) return;
    const targetBugId = selected.id;
    startTransition(async () => {
      await createRelationship({ currentBugId: bugId, targetBugId, pickerLabel });
      setSelected(null);
      setQuery("");
    });
  }

  function handleDelete(id: string) {
    startTransition(() => deleteRelationship({ id, currentBugId: bugId }));
  }

  return (
    <div>
      {relationships.length === 0 ? (
        <p className="text-sm text-[color:var(--bf-ink-muted)]">No linked bugs yet.</p>
      ) : (
        <ul className="space-y-2">
          {relationships.map((rel) => (
            <li
              key={rel.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-3 py-2"
            >
              <div className="flex min-w-0 items-center gap-2 text-sm">
                <span className="shrink-0 font-medium text-[color:var(--bf-ink-muted)]">{rel.label}</span>
                <Link
                  href={`/bugs/${rel.bug.id}`}
                  className="flex min-w-0 items-center gap-1.5 truncate text-[color:var(--bf-ink-primary)] hover:text-[color:var(--bf-brand)]"
                >
                  <StatusDot status={rel.bug.status} />
                  <span className="shrink-0 font-mono text-[12px] text-[color:var(--bf-ink-muted)]">
                    BUG-{rel.bug.number}
                  </span>
                  <span className="truncate">{rel.bug.title}</span>
                </Link>
              </div>
              {canEdit && (
                <button
                  onClick={() => handleDelete(rel.id)}
                  disabled={isPending}
                  aria-label="Remove relationship"
                  className="shrink-0 text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-status-critical)] disabled:opacity-50"
                >
                  <X size={14} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canEdit && (
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={pickerLabel}
          onChange={(e) => setPickerLabel(e.target.value)}
          className="rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-2 py-1.5 text-[13px] text-[color:var(--bf-ink-secondary)] outline-none"
        >
          {RELATIONSHIP_PICKER_OPTIONS.map((o) => (
            <option key={o.label} value={o.label}>
              {o.label}
            </option>
          ))}
        </select>

        <div className="relative min-w-[220px] flex-1">
          {selected ? (
            <span className="flex items-center justify-between gap-2 rounded-md border border-[color:var(--bf-border-strong)] bg-[color:var(--bf-surface)] px-2 py-1.5 text-[13px] text-[color:var(--bf-ink-primary)]">
              <span className="truncate">
                BUG-{selected.number} — {selected.title}
              </span>
              <button
                onClick={() => setSelected(null)}
                aria-label="Clear selected bug"
                className="shrink-0 text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-ink-primary)]"
              >
                <X size={12} />
              </button>
            </span>
          ) : (
            <>
              <div className="relative">
                <Search size={13} className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2 text-[color:var(--bf-ink-muted)]" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search bugs by title…"
                  className="w-full rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] py-1.5 pr-2 pl-7 text-[13px] text-[color:var(--bf-ink-primary)] outline-none placeholder:text-[color:var(--bf-ink-muted)] focus:border-[color:var(--bf-border-strong)]"
                />
              </div>
              {query.trim().length >= 1 && results.length > 0 && (
                <div className="absolute top-full left-0 z-10 mt-1 w-full overflow-hidden rounded-lg border border-[color:var(--bf-border-strong)] bg-[color:var(--bf-surface-raised)] shadow-lg shadow-black/30">
                  {results.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setSelected(b);
                        setResults([]);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-[color:var(--bf-ink-primary)] hover:bg-[color:var(--bf-surface)]"
                    >
                      <StatusDot status={b.status} />
                      <span className="shrink-0 font-mono text-[11px] text-[color:var(--bf-ink-muted)]">
                        BUG-{b.number}
                      </span>
                      <span className="truncate">{b.title}</span>
                      <span className="ml-auto shrink-0 text-[11px] text-[color:var(--bf-ink-muted)]">{b.game.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <button
          onClick={handleLink}
          disabled={!selected || isPending}
          className={cn(
            "flex shrink-0 items-center gap-1.5 rounded-md bg-[color:var(--bf-brand)] px-3 py-1.5 text-[12px] font-medium text-black hover:opacity-90",
            (!selected || isPending) && "cursor-not-allowed opacity-50 hover:opacity-50"
          )}
        >
          <Link2 size={12} />
          Link
        </button>
      </div>
      )}
    </div>
  );
}
