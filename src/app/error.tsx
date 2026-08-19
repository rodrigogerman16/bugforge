"use client";

import { useEffect } from "react";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { logError, toSafeMessage } from "@/lib/utils/errors";

// Catches any error thrown while rendering a Server or Client Component
// inside the shell (layout.tsx keeps rendering — sidebar/topbar stay put,
// only the page content below is replaced by this). Doesn't try to guess
// which of the six categories item 69 names actually failed — a render-time
// error reaching here could be any of them — so it logs generically and
// shows the "unknown" fallback message, which is honest rather than
// guessing a specific cause it can't actually confirm.
export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError("unknown", error, { digest: error.digest });
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-8 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--bf-status-critical)]/10">
        <TriangleAlert size={24} className="text-[color:var(--bf-status-critical)]" />
      </div>
      <h1 className="mt-5 text-xl font-bold text-[color:var(--bf-ink-primary)]">Something went wrong</h1>
      <p className="mt-2 text-sm text-[color:var(--bf-ink-muted)]">{toSafeMessage("unknown", error)}</p>
      {error.digest && (
        <p className="mt-1 text-[11px] text-[color:var(--bf-ink-muted)]">Reference: {error.digest}</p>
      )}
      <div className="mt-6 flex gap-2">
        <button
          onClick={reset}
          className="rounded-md bg-[color:var(--bf-brand)] px-4 py-2 text-[13px] font-medium text-black hover:opacity-90"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md border border-[color:var(--bf-border)] px-4 py-2 text-[13px] text-[color:var(--bf-ink-secondary)] hover:border-[color:var(--bf-border-strong)]"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
