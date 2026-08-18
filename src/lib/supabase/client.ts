"use client";

import { createBrowserClient } from "@supabase/ssr";

// Only used for the one thing that must run in the browser: kicking off an
// OAuth redirect (supabase.auth.signInWithOAuth). Email/password sign-in,
// sign-up, sign-out, and password reset all go through Server Actions in
// app/auth/actions.ts instead, so the session cookie is set directly on the
// server response rather than needing a client/server round trip to sync.
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
