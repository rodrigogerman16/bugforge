"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useShellUI } from "@/components/shell-ui-provider";

// Bug reporting now happens in a modal (see BugCreateModal), not a full
// page — this route only exists so old links/bookmarks to /bugs/new still
// work: it opens the modal with the same game context the query string
// carried, then lands on /bugs behind it.
function NewBugRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { openBugCreateModal } = useShellUI();
  const gameSlug = searchParams.get("game") ?? undefined;

  useEffect(() => {
    openBugCreateModal(gameSlug);
    router.replace(gameSlug ? `/bugs?game=${gameSlug}` : "/bugs");
    // Only run once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export default function NewBugRedirectPage() {
  return (
    <Suspense fallback={null}>
      <NewBugRedirect />
    </Suspense>
  );
}
