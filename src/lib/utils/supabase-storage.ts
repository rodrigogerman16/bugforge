import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only: this holds the service-role key, which bypasses Storage RLS
// and must never reach the client bundle — every upload goes through the
// /api/attachments/upload route, never a client-side Supabase call.
//
// Requires three env vars (see .env): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// and SUPABASE_STORAGE_BUCKET (a bucket you've created in that project,
// public so getPublicUrl works). Until those are set, uploads fail with a
// clear error instead of the app crashing at build/boot time.
let client: SupabaseClient | null = null;

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super("Supabase Storage isn't configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.");
    this.name = "SupabaseNotConfiguredError";
  }
}

export function getSupabaseAdmin(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new SupabaseNotConfiguredError();

  client = createClient(url, key, { auth: { persistSession: false } });
  return client;
}

export function getAttachmentsBucket(): string {
  return process.env.SUPABASE_STORAGE_BUCKET || "bugforge-attachments";
}
