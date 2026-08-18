"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.1 8 3l5.7-5.7C34.5 6 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.1 8 3l5.7-5.7C34.5 6 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.4 0 10.3-2.1 14-5.5l-6.5-5.4C29.4 34.7 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.3 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4 5.6l6.5 5.4C41.8 35.9 44 30.3 44 24c0-1.3-.1-2.7-.4-3.5z"
      />
    </svg>
  );
}

// OAuth is the one auth step that has to run client-side: signInWithOAuth
// hands back a provider URL and this browser has to navigate there itself.
// Everything else in this feature (email/password sign-in, sign-up,
// sign-out, password reset) is a Server Action instead.
export function GoogleSignInButton() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in isn't configured.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-page)] px-3 py-2 text-sm font-medium text-[color:var(--bf-ink-primary)] hover:border-[color:var(--bf-border-strong)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <GoogleMark />
        {loading ? "Redirecting…" : "Continue with Google"}
      </button>
      {error && <p className="mt-2 text-[12px] text-[color:var(--bf-status-critical)]">{error}</p>}
    </div>
  );
}
