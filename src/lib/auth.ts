// Whether real Supabase Auth is wired up. Until NEXT_PUBLIC_SUPABASE_URL and
// NEXT_PUBLIC_SUPABASE_ANON_KEY are set (see .env), the app runs in the demo
// mode it always has — proxy.ts lets every request through and
// getCurrentUser() falls back to the seeded QA Lead — rather than locking
// the app behind a login screen with no real project to authenticate
// against.
export function isSupabaseAuthConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
