"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { X, Loader2 } from "lucide-react";
import { useShellUI } from "@/components/shell-ui-provider";
import { getBugCreateOptions } from "@/app/bugs/actions";
import type { GameCreateOption, AreaSummary, TagSummary } from "@/lib/data";
import { BugCreateForm } from "@/components/bugs/bug-create-form";
import { fadeIn, fadeScaleIn, fastTransition } from "@/lib/motion";

type Options = { games: GameCreateOption[]; areas: AreaSummary[]; tags: TagSummary[] };

// Mounted once, globally, in the root layout — the same "always mounted,
// renders nothing until opened" pattern as the AI assistant panel and
// command palette. Its own game/area/tag options are fetched lazily on
// first open rather than on every page load, since most page loads never
// touch bug creation at all.
export function BugCreateModal() {
  const { bugCreateModalOpen, bugCreateModalGameSlug, closeBugCreateModal, pushToast } = useShellUI();
  const router = useRouter();

  const [options, setOptions] = useState<Options | null>(null);
  const [isLoadingOptions, startLoadingOptions] = useTransition();

  useEffect(() => {
    if (bugCreateModalOpen && !options) {
      startLoadingOptions(async () => {
        setOptions(await getBugCreateOptions());
      });
    }
    // Options are fetched once and cached for the rest of the session —
    // only re-check when the modal actually opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bugCreateModalOpen]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && bugCreateModalOpen) closeBugCreateModal();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [bugCreateModalOpen, closeBugCreateModal]);

  const defaultGame = bugCreateModalGameSlug
    ? options?.games.find((g) => g.slug === bugCreateModalGameSlug)
    : undefined;

  return (
    <AnimatePresence>
      {bugCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center sm:items-center sm:p-4">
          <motion.div
            variants={fadeIn}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={fastTransition}
            onClick={closeBugCreateModal}
            className="absolute inset-0 bg-black/60 backdrop-blur-[1px] sm:block"
          />

          {/* Full-screen sheet on mobile — bug creation is a top mobile
              priority, and a centered dialog squeezed onto a small screen
              wastes most of the viewport on backdrop. From sm: up it's the
              regular centered dialog. */}
          <motion.div
            variants={fadeScaleIn}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={fastTransition}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bug-create-modal-title"
            className="relative flex h-full w-full flex-col overflow-hidden bg-[color:var(--bf-page)] shadow-2xl shadow-black/50 sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-2xl sm:rounded-xl sm:border sm:border-[color:var(--bf-border-strong)]"
          >
        <div className="flex shrink-0 items-center justify-between border-b border-[color:var(--bf-border)] px-5 py-4">
          <div>
            <h2 id="bug-create-modal-title" className="text-lg font-bold tracking-wide text-[color:var(--bf-ink-primary)] uppercase">
              Report a Bug
            </h2>
            <p className="mt-0.5 text-[12px] text-[color:var(--bf-ink-muted)]">
              BugForge AI checks for possible duplicates as you type and can help fill in the rest — it&apos;s a suggestion, not a block.
            </p>
          </div>
          <button
            onClick={closeBugCreateModal}
            aria-label="Close"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-[color:var(--bf-ink-muted)] hover:bg-[color:var(--bf-surface)] hover:text-[color:var(--bf-ink-primary)] sm:h-8 sm:w-8"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {!options || isLoadingOptions ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-[color:var(--bf-ink-muted)]">
              <Loader2 size={14} className="animate-spin" />
              Loading...
            </div>
          ) : options.games.length === 0 ? (
            <p className="py-16 text-center text-sm text-[color:var(--bf-ink-muted)]">No games exist yet.</p>
          ) : (
            <BugCreateForm
              gameId={(defaultGame ?? options.games[0]).id}
              games={options.games}
              areas={options.areas}
              tags={options.tags}
              onCancel={closeBugCreateModal}
              onCreated={(bugId) => {
                closeBugCreateModal();
                pushToast("Bug reported successfully.", "success");
                router.push(`/bugs/${bugId}`);
              }}
            />
          )}
        </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
