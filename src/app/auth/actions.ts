"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = { error?: string; success?: string };

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

// Every action here guards its own createClient() call — if Supabase Auth
// isn't configured yet (see lib/auth.ts), that call throws synchronously,
// and every one of these turns it into a plain form error instead of a
// crashed page, the same graceful-degradation pattern Storage uses.
export async function signInWithPassword(_prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "") || "/";
  if (!email || !password) return { error: "Enter your email and password." };

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
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!name || !email || !password) return { error: "Fill in your name, email, and password." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

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
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter your email." };

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
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Passwords don't match." };

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
