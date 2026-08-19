"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  signInSchema,
  signUpSchema,
  requestPasswordResetSchema,
  updatePasswordSchema,
} from "@/lib/validation";

export type AuthFormState = { error?: string; success?: string };

// Every credential-handling action here validates the raw FormData with
// Zod before it ever reaches Supabase — this is the actual runtime
// boundary (a Server Action is a POST endpoint reachable by anyone, not
// just this app's own form), and the first Zod issue becomes the same
// plain-text form error a manual check would have produced.
function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Invalid input.";
}

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

// Every action here guards its own createClient() call — if Supabase Auth
// isn't configured yet (see lib/auth.ts), that call throws synchronously,
// and every one of these turns it into a plain form error instead of a
// crashed page, the same graceful-degradation pattern Storage uses.
export async function signInWithPassword(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    next: String(formData.get("next") ?? "") || undefined,
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { email, password, next = "/" } = parsed.data;

  let supabase;
  try {
    supabase = await createClient();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Auth isn't configured." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  redirect(next);
}

export async function signUpWithPassword(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { name, email, password } = parsed.data;

  let supabase;
  try {
    supabase = await createClient();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Auth isn't configured." };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });
  if (error) return { error: error.message };

  // If the project has "Confirm email" turned off, signUp already returns
  // an active session — otherwise there's nothing to sign into until they
  // click the confirmation link.
  if (data.session) redirect("/");
  return { success: "Account created — check your email to confirm it before signing in." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = requestPasswordResetSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { email } = parsed.data;

  let supabase;
  try {
    supabase = await createClient();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Auth isn't configured." };
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
  });
  // Deliberately the same message whether or not the email exists, so this
  // can't be used to enumerate registered accounts.
  if (error) return { error: error.message };
  return { success: "If that email has an account, a reset link is on its way." };
}

export async function updatePassword(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = updatePasswordSchema.safeParse({
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { password } = parsed.data;

  let supabase;
  try {
    supabase = await createClient();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Auth isn't configured." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };

  redirect("/");
}
