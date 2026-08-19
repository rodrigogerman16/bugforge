"use client";

import { useEffect } from "react";
import { logError } from "@/lib/utils/errors";

// The last-resort boundary: only fires when the root layout itself throws
// (error.tsx can't catch that, since it renders inside the layout it's
// meant to protect). Has to render its own <html>/<body> — the layout that
// would normally provide them is exactly what failed — so this stays
// deliberately minimal rather than trying to recreate the full shell.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError("unknown", error, { digest: error.digest, boundary: "root-layout" });
  }, [error]);

  return (
    <html lang="en">
      <body style={{ background: "#0d0d0d", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: 420, margin: "0 auto", padding: "96px 32px", textAlign: "center" }}>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>BugForge failed to load</h1>
          <p style={{ marginTop: 8, fontSize: 14, color: "#898781" }}>
            Something went wrong before the app could render. Reloading usually fixes it.
          </p>
          {error.digest && (
            <p style={{ marginTop: 4, fontSize: 11, color: "#898781" }}>Reference: {error.digest}</p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              borderRadius: 6,
              background: "#f2762e",
              color: "#000",
              fontWeight: 500,
              fontSize: 13,
              padding: "8px 16px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
