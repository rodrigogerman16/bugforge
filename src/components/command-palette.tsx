"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { fadeIn, fadeScaleIn, fastTransition } from "@/lib/motion";
import {
  Search,
  CornerDownLeft,
  Gamepad2,
  Bug,
  ListChecks,
  Package,
  ClipboardList,
  Users,
  Plus,
  PlayCircle,
  FilePlus2,
  Rocket,
  Sparkles,
  X,
  Loader2,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { useShellUI } from "@/components/shell-ui-provider";
import { NAV_ITEMS, NAV_FOOTER_ITEMS } from "@/lib/nav-items";
import { formatPlatformList } from "@/lib/platform";
import { SEVERITY_META } from "@/lib/severity";
import { BUG_STATUS_META, SESSION_STATUS_LABEL } from "@/lib/status-labels";
import { cn } from "@/lib/utils";
import type { GameOption } from "@/components/game-switcher";
import type { BugSeverity, BugStatus, SessionStatus } from "@/generated/prisma/enums";

type PaletteGroup =
  | "Navigate"
  | "Quick Actions"
  | "Games"
  | "Bugs"
  | "Test Cases"
  | "Builds"
  | "Test Sessions"
  | "Testers";

type PaletteItem = {
  key: string;
  group: PaletteGroup;
  label: string;
  sublabel?: string;
  enabled: boolean;
  icon: React.ElementType;
  iconColor?: string;
  run: () => void;
};

type GameRef = { name: string; slug: string; coverColor: string };

type SearchResults = {
  bugs: Array<{ id: string; title: string; severity: BugSeverity; status: BugStatus; game: GameRef }>;
  testCases: Array<{ id: string; title: string; category: { name: string } | null; game: GameRef }>;
  builds: Array<{ id: string; version: string; branch: string; game: GameRef }>;
  sessions: Array<{ id: string; name: string; status: SessionStatus; game: GameRef }>;
  testers: Array<{ id: string; name: string; email: string; role: string }>;
};

const EMPTY_RESULTS: SearchResults = { bugs: [], testCases: [], builds: [], sessions: [], testers: [] };

export function CommandPalette({ games }: { games: GameOption[] }) {
  const { commandPaletteOpen, setCommandPaletteOpen, setAiPanelOpen, openBugCreateModal } = useShellUI();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [scope, setScope] = useState<"all" | "bugs">("all");
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (commandPaletteOpen) {
      setQuery("");
      setScope("all");
      setResults(EMPTY_RESULTS);
      setActiveIndex(0);
    }
  }, [commandPaletteOpen]);

  useEffect(() => {
    if (!commandPaletteOpen) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults(EMPTY_RESULTS);
      setSearching(false);
      return;
    }
    setSearching(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data: SearchResults) => setResults(data))
        .catch((err: Error) => {
          if (err.name !== "AbortError") setResults(EMPTY_RESULTS);
        })
        .finally(() => setSearching(false));
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, commandPaletteOpen]);

  const contextGame = useMemo(() => {
    const slug = searchParams.get("game");
    if (slug && slug !== "all") return games.find((g) => g.slug === slug) ?? games[0] ?? null;
    return games[0] ?? null;
  }, [games, searchParams]);

  useEffect(() => {
    if (commandPaletteOpen) requestAnimationFrame(() => inputRef.current?.focus());
  }, [scope, commandPaletteOpen]);

  function enterBugScope() {
    setScope("bugs");
    setQuery("");
    setResults(EMPTY_RESULTS);
    setActiveIndex(0);
  }

  function exitBugScope() {
    setScope("all");
    setQuery("");
    setResults(EMPTY_RESULTS);
    setActiveIndex(0);
  }

  const quickActions = useMemo<PaletteItem[]>(
    () => [
      {
        key: "action-create-bug",
        group: "Quick Actions",
        label: "Create bug",
        sublabel: contextGame ? `Report a bug in ${contextGame.name}` : "Report a new bug",
        enabled: true,
        icon: Plus,
        run: () => openBugCreateModal(contextGame?.slug),
      },
      {
        key: "action-start-session",
        group: "Quick Actions",
        label: "Start test session",
        sublabel: contextGame ? `New session in ${contextGame.name}` : "Start a new QA session",
        enabled: Boolean(contextGame),
        icon: PlayCircle,
        run: () => contextGame && router.push(`/sessions/new?game=${contextGame.slug}`),
      },
      {
        key: "action-create-test-case",
        group: "Quick Actions",
        label: "Create test case",
        sublabel: contextGame ? `Add a test case to ${contextGame.name}` : "Add a new test case",
        enabled: Boolean(contextGame),
        icon: FilePlus2,
        run: () => contextGame && router.push(`/test-cases/new?game=${contextGame.slug}`),
      },
      {
        key: "action-search-bugs",
        group: "Quick Actions",
        label: "Search bugs",
        sublabel: "Scope search to bugs only",
        enabled: true,
        icon: Search,
        run: enterBugScope,
      },
      {
        key: "action-open-latest-build",
        group: "Quick Actions",
        label: "Open latest build",
        sublabel: contextGame?.latestBuildVersion
          ? `${contextGame.name} · v${contextGame.latestBuildVersion}`
          : "No builds tracked yet",
        enabled: Boolean(contextGame?.latestBuildVersion),
        icon: Rocket,
        run: () => contextGame && router.push(`/?game=${contextGame.slug}`),
      },
      {
        key: "action-ask-ai",
        group: "Quick Actions",
        label: "Ask BugForge AI",
        sublabel: "Open the internal QA assistant",
        enabled: true,
        icon: Sparkles,
        run: () => setAiPanelOpen(true),
      },
      {
        key: "action-generate-report",
        group: "Quick Actions",
        label: "Generate QA report",
        sublabel: "Build QA, release readiness, weekly, regression, or coverage",
        enabled: true,
        icon: FileText,
        run: () => router.push("/reports"),
      },
      {
        key: "action-open-release-readiness",
        group: "Quick Actions",
        label: "Open release readiness",
        sublabel: contextGame?.latestBuildVersion
          ? `${contextGame.name} · v${contextGame.latestBuildVersion}`
          : "No builds tracked yet",
        enabled: Boolean(contextGame?.latestBuildId),
        icon: ShieldCheck,
        run: () => contextGame?.latestBuildId && router.push(`/builds/${contextGame.latestBuildId}/readiness`),
      },
    ],
    [contextGame, router, setAiPanelOpen, openBugCreateModal]
  );

  const staticItems = useMemo<PaletteItem[]>(() => {
    const gameParam = searchParams.get("game");
    const navItems: PaletteItem[] = [...NAV_ITEMS, ...NAV_FOOTER_ITEMS].map((nav) => ({
      key: `nav-${nav.href}`,
      group: "Navigate",
      label: nav.label,
      sublabel: nav.enabled ? undefined : "Coming soon",
      enabled: nav.enabled,
      icon: nav.icon,
      run: () => router.push(gameParam ? `${nav.href}?game=${gameParam}` : nav.href),
    }));

    const gameItems: PaletteItem[] = games.map((game) => ({
      key: `game-${game.id}`,
      group: "Games",
      label: game.name,
      sublabel: formatPlatformList(game.platforms),
      enabled: true,
      icon: Gamepad2,
      iconColor: game.coverColor,
      run: () => router.push(`/?game=${game.slug}`),
    }));

    return [...navItems, ...quickActions, ...gameItems];
  }, [games, quickActions, router, searchParams]);

  const entityItems = useMemo<PaletteItem[]>(() => {
    const bugItems: PaletteItem[] = results.bugs.map((bug) => ({
      key: `bug-${bug.id}`,
      group: "Bugs",
      label: bug.title,
      sublabel: `${bug.game.name} · ${SEVERITY_META[bug.severity].label} · ${BUG_STATUS_META[bug.status].label}`,
      enabled: true,
      icon: Bug,
      iconColor: SEVERITY_META[bug.severity].color,
      run: () => router.push(`/bugs/${bug.id}`),
    }));

    const testCaseItems: PaletteItem[] = results.testCases.map((tc) => ({
      key: `testcase-${tc.id}`,
      group: "Test Cases",
      label: tc.title,
      sublabel: tc.category ? `${tc.game.name} · ${tc.category.name}` : tc.game.name,
      enabled: true,
      icon: ListChecks,
      iconColor: tc.game.coverColor,
      run: () => router.push(`/test-cases/${tc.id}`),
    }));

    const buildItems: PaletteItem[] = results.builds.map((build) => ({
      key: `build-${build.id}`,
      group: "Builds",
      label: build.version,
      sublabel: `${build.game.name} · ${build.branch}`,
      enabled: true,
      icon: Package,
      iconColor: build.game.coverColor,
      run: () => router.push(`/?game=${build.game.slug}`),
    }));

    const sessionItems: PaletteItem[] = results.sessions.map((session) => ({
      key: `session-${session.id}`,
      group: "Test Sessions",
      label: session.name,
      sublabel: `${session.game.name} · ${SESSION_STATUS_LABEL[session.status]}`,
      enabled: true,
      icon: ClipboardList,
      iconColor: session.game.coverColor,
      run: () => router.push(`/?game=${session.game.slug}`),
    }));

    const testerItems: PaletteItem[] = results.testers.map((tester) => ({
      key: `tester-${tester.id}`,
      group: "Testers",
      label: tester.name,
      sublabel: `${tester.email} · Coming soon`,
      enabled: false,
      icon: Users,
      run: () => {},
    }));

    return [...bugItems, ...testCaseItems, ...buildItems, ...sessionItems, ...testerItems];
  }, [results, router]);

  const filtered = useMemo(() => {
    if (scope === "bugs") {
      return entityItems.filter((item) => item.group === "Bugs");
    }
    const q = query.trim().toLowerCase();
    const filteredStatic = q
      ? staticItems.filter((item) => item.label.toLowerCase().includes(q))
      : staticItems;
    return [...filteredStatic, ...entityItems];
  }, [scope, staticItems, entityItems, query]);

  const selectableIndexes = filtered
    .map((item, i) => (item.enabled ? i : -1))
    .filter((i) => i !== -1);

  function close() {
    setCommandPaletteOpen(false);
  }

  function activate(item: PaletteItem) {
    if (!item.enabled) return;
    item.run();
    if (item.key !== "action-search-bugs") close();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      if (scope === "bugs") exitBugScope();
      else close();
      return;
    }
    if (e.key === "Backspace" && query === "" && scope === "bugs") {
      exitBugScope();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const pos = selectableIndexes.indexOf(activeIndex);
      const next = selectableIndexes[Math.min(pos + 1, selectableIndexes.length - 1)];
      if (next !== undefined) setActiveIndex(next);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const pos = selectableIndexes.indexOf(activeIndex);
      const prev = selectableIndexes[Math.max(pos - 1, 0)];
      if (prev !== undefined) setActiveIndex(prev);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = filtered[activeIndex];
      if (item) activate(item);
    }
  }

  const searchTooShort = query.trim().length > 0 && query.trim().length < 2;
  let lastGroup = "";

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <div className="fixed inset-0 z-50 flex justify-center pt-[12vh]">
          <motion.div
            variants={fadeIn}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={fastTransition}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={close}
            aria-hidden
          />
          <motion.div
            variants={fadeScaleIn}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={fastTransition}
            className="relative z-10 h-fit w-full max-w-lg overflow-hidden rounded-lg border border-[color:var(--bf-border-strong)] bg-[color:var(--bf-surface-raised)] shadow-lg shadow-black/40"
          >
        <div className="flex items-center gap-2.5 border-b border-[color:var(--bf-border)] px-4 py-3">
          <Search size={16} className="text-[color:var(--bf-ink-muted)]" />
          {scope === "bugs" && (
            <span className="flex shrink-0 items-center gap-1 rounded-md bg-[color:var(--bf-brand-soft)] py-1 pl-2 pr-1 text-[11px] font-medium text-[color:var(--bf-brand)]">
              Bugs
              <button
                onClick={exitBugScope}
                className="rounded p-0.5 hover:bg-black/20"
                aria-label="Clear bug search scope"
              >
                <X size={11} />
              </button>
            </span>
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onKeyDown}
            placeholder={scope === "bugs" ? "Search bugs..." : "Type a command or search..."}
            className="flex-1 bg-transparent text-sm text-[color:var(--bf-ink-primary)] outline-none placeholder:text-[color:var(--bf-ink-muted)]"
          />
          {searching && <Loader2 size={14} className="animate-spin text-[color:var(--bf-ink-muted)]" />}
          <kbd className="rounded border border-[color:var(--bf-border)] px-1.5 py-0.5 font-mono text-[10px] text-[color:var(--bf-ink-muted)]">
            Esc
          </kbd>
        </div>

        <div className="max-h-96 overflow-y-auto p-1.5">
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-[color:var(--bf-ink-muted)]">
              {searchTooShort
                ? "Keep typing to search bugs, test cases, builds, sessions and testers..."
                : query
                  ? `No results for “${query}”`
                  : scope === "bugs"
                    ? "Type to search bugs by title, description or area"
                    : "No bugs found"}
            </p>
          )}
          {filtered.map((item, i) => {
            const showGroupHeader = item.group !== lastGroup;
            lastGroup = item.group;
            const Icon = item.icon;
            const active = i === activeIndex;
            return (
              <div key={item.key}>
                {showGroupHeader && (
                  <p className="px-2.5 pb-1 pt-2.5 text-[11px] font-medium uppercase tracking-wide text-[color:var(--bf-ink-muted)] first:pt-1">
                    {item.group}
                  </p>
                )}
                <button
                  disabled={!item.enabled}
                  onMouseEnter={() => item.enabled && setActiveIndex(i)}
                  onClick={() => activate(item)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm",
                    !item.enabled && "cursor-not-allowed opacity-40",
                    item.enabled && active && "bg-[color:var(--bf-brand-soft)]",
                    item.enabled && !active && "hover:bg-[color:var(--bf-surface)]"
                  )}
                >
                  <Icon
                    size={15}
                    style={item.iconColor ? { color: item.iconColor } : undefined}
                    className={item.iconColor ? "" : "text-[color:var(--bf-ink-muted)]"}
                  />
                  <span className="flex-1 truncate text-[color:var(--bf-ink-primary)]">
                    {item.label}
                  </span>
                  {item.sublabel && (
                    <span className="shrink-0 truncate text-[11px] text-[color:var(--bf-ink-muted)]">
                      {item.sublabel}
                    </span>
                  )}
                  {item.enabled && active && (
                    <CornerDownLeft size={12} className="shrink-0 text-[color:var(--bf-ink-muted)]" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
