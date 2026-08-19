"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { drawerTransition, fadeSlideUp, baseTransition } from "@/lib/motion";
import {
  X,
  Sparkles,
  Search,
  Loader2,
  ArrowLeft,
  Stethoscope,
  Gauge,
  Flag,
  Copy,
  ListChecks,
  FileText,
  Radar,
  FlaskConical,
  ShieldAlert,
} from "lucide-react";
import { useShellUI } from "@/components/shell-ui-provider";
import { SEVERITY_META } from "@/lib/severity";
import { BUG_STATUS_META } from "@/lib/status-labels";
import { AI_ACTIONS, type AiActionKey, type AiResult } from "@/lib/ai/chat";
import { runAiAction, getAiBugHeader, type AiBugHeader } from "@/app/ai/actions";
import { AiResultView } from "@/components/ai/ai-action-results";
import { cn } from "@/lib/utils";
import type { BugSeverity, BugStatus } from "@/generated/prisma/enums";

const ACTION_ICON: Record<AiActionKey, React.ElementType> = {
  ANALYZE: Stethoscope,
  SEVERITY: Gauge,
  PRIORITY: Flag,
  DUPLICATES: Copy,
  REPRO_STEPS: ListChecks,
  SUMMARY: FileText,
  AFFECTED_SYSTEMS: Radar,
  TEST_CASE: FlaskConical,
  REGRESSION_RISK: ShieldAlert,
};

type BugSearchResult = { id: string; number: number; title: string; severity: BugSeverity; status: BugStatus };

// Mounted once, globally, in the root layout — this is what makes BugForge
// AI "available globally" rather than scoped to a single page. It reads the
// bug id straight out of the URL when you're already on a bug's page; off a
// bug page it falls back to a small search box instead of doing nothing.
export function AiAssistantPanel({ aiProviderTagline }: { aiProviderTagline: string }) {
  const { aiPanelOpen, setAiPanelOpen } = useShellUI();
  const pathname = usePathname();

  const pathBugId = useMemo(() => pathname.match(/^\/bugs\/([^/?]+)/)?.[1] ?? null, [pathname]);
  const [pickedBugId, setPickedBugId] = useState<string | null>(null);
  const effectiveBugId = pathBugId ?? pickedBugId;

  const [header, setHeader] = useState<AiBugHeader | null>(null);
  const [headerLoading, setHeaderLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BugSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [result, setResult] = useState<AiResult | null>(null);
  const [runningKey, setRunningKey] = useState<AiActionKey | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (pathBugId) setPickedBugId(null);
  }, [pathBugId]);

  useEffect(() => {
    setResult(null);
    setRunningKey(null);
  }, [effectiveBugId]);

  useEffect(() => {
    if (!effectiveBugId) {
      setHeader(null);
      return;
    }
    let cancelled = false;
    setHeaderLoading(true);
    getAiBugHeader(effectiveBugId).then((h) => {
      if (!cancelled) {
        setHeader(h);
        setHeaderLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [effectiveBugId]);

  useEffect(() => {
    if (!aiPanelOpen || effectiveBugId) return;
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/bugs/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data: { bugs: BugSearchResult[] }) => setSearchResults(data.bugs))
        .catch((err: Error) => {
          if (err.name !== "AbortError") setSearchResults([]);
        })
        .finally(() => setSearching(false));
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, aiPanelOpen, effectiveBugId]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && aiPanelOpen) setAiPanelOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [aiPanelOpen, setAiPanelOpen]);

  function runAction(key: AiActionKey) {
    if (!effectiveBugId || isPending) return;
    setRunningKey(key);
    startTransition(async () => {
      const res = await runAiAction(effectiveBugId, key);
      setResult(res);
      setRunningKey(null);
    });
  }

  function close() {
    setAiPanelOpen(false);
  }

  return (
    <div className={cn("fixed inset-0 z-40", aiPanelOpen ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!aiPanelOpen}>
      <motion.div
        onClick={close}
        animate={{ opacity: aiPanelOpen ? 1 : 0 }}
        transition={drawerTransition}
        className="absolute inset-0 bg-black/40 md:bg-transparent"
      />
      <motion.aside
        animate={{ x: aiPanelOpen ? "0%" : "100%" }}
        transition={drawerTransition}
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-[color:var(--bf-border)] bg-[color:var(--bf-page)] shadow-2xl shadow-black/50"
      >
        <div className="flex shrink-0 items-center gap-2.5 border-b border-[color:var(--bf-border)] px-4 py-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[color:var(--bf-brand-soft)] text-[color:var(--bf-brand)]">
            <Sparkles size={14} />
          </span>
          <div className="flex-1">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-[color:var(--bf-ink-primary)]">BugForge AI</p>
            <p className="text-[11px] text-[color:var(--bf-ink-muted)]">Internal QA assistant · {aiProviderTagline}</p>
          </div>
          <button
            onClick={close}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[color:var(--bf-ink-muted)] hover:bg-[color:var(--bf-surface)]"
            aria-label="Close BugForge AI"
          >
            <X size={15} />
          </button>
        </div>

        <div className="shrink-0 border-b border-[color:var(--bf-border)] px-4 py-3">
          {effectiveBugId ? (
            headerLoading || !header ? (
              <div className="flex items-center gap-2 text-[12px] text-[color:var(--bf-ink-muted)]">
                <Loader2 size={12} className="animate-spin" /> Loading bug...
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] text-[color:var(--bf-ink-muted)]">
                    BUG-{header.number} · {header.gameName}
                  </p>
                  <p className="truncate text-[13px] font-medium text-[color:var(--bf-ink-primary)]">{header.title}</p>
                  <div className="mt-1 flex items-center gap-2 text-[11px]">
                    <span style={{ color: SEVERITY_META[header.severity].color }}>{SEVERITY_META[header.severity].label}</span>
                    <span className="text-[color:var(--bf-ink-muted)]">·</span>
                    <span className="text-[color:var(--bf-ink-muted)]">{BUG_STATUS_META[header.status].label}</span>
                  </div>
                </div>
                {!pathBugId && (
                  <button
                    onClick={() => setPickedBugId(null)}
                    className="shrink-0 text-[11px] text-[color:var(--bf-ink-muted)] underline decoration-dotted underline-offset-2 hover:text-[color:var(--bf-ink-primary)]"
                  >
                    Change
                  </button>
                )}
              </div>
            )
          ) : (
            <div>
              <p className="mb-2 text-[12px] text-[color:var(--bf-ink-muted)]">Pick a bug to analyze.</p>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[color:var(--bf-ink-muted)]" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search bugs by title..."
                  className="w-full rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] py-1.5 pl-7 pr-2 text-[12px] text-[color:var(--bf-ink-primary)] outline-none placeholder:text-[color:var(--bf-ink-muted)] focus:border-[color:var(--bf-border-strong)]"
                />
                {searching && (
                  <Loader2 size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-[color:var(--bf-ink-muted)]" />
                )}
              </div>
              {searchResults.length > 0 && (
                <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                  {searchResults.map((b) => (
                    <li key={b.id}>
                      <button
                        onClick={() => {
                          setPickedBugId(b.id);
                          setSearchQuery("");
                          setSearchResults([]);
                        }}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] hover:bg-[color:var(--bf-surface)]"
                      >
                        <span
                          style={{ backgroundColor: SEVERITY_META[b.severity].color }}
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                        />
                        <span className="min-w-0 flex-1 truncate text-[color:var(--bf-ink-primary)]">
                          BUG-{b.number} — {b.title}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {result ? (
            <motion.div
              key={result.key}
              variants={fadeSlideUp}
              initial="initial"
              animate="animate"
              transition={baseTransition}
            >
              <button
                onClick={() => setResult(null)}
                className="mb-3 flex items-center gap-1 text-[11px] text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-ink-primary)]"
              >
                <ArrowLeft size={12} /> Back to actions
              </button>
              {effectiveBugId && <AiResultView bugId={effectiveBugId} gameId={header?.gameId ?? null} result={result} />}
            </motion.div>
          ) : (
            <div className="space-y-1.5">
              {AI_ACTIONS.map((action) => {
                const Icon = ACTION_ICON[action.key];
                const running = runningKey === action.key;
                return (
                  <button
                    key={action.key}
                    disabled={!effectiveBugId || isPending}
                    onClick={() => runAction(action.key)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border border-[color:var(--bf-border)] px-3 py-2.5 text-left hover:border-[color:var(--bf-border-strong)] hover:bg-[color:var(--bf-surface)]",
                      (!effectiveBugId || isPending) && "cursor-not-allowed opacity-40"
                    )}
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[color:var(--bf-surface)] text-[color:var(--bf-ink-secondary)]">
                      {running ? <Loader2 size={13} className="animate-spin" /> : <Icon size={13} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12px] font-medium text-[color:var(--bf-ink-primary)]">{action.label}</span>
                      <span className="block text-[11px] text-[color:var(--bf-ink-muted)]">{action.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </motion.aside>
    </div>
  );
}
