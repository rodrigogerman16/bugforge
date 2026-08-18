"use client";

import { useActionState } from "react";
import { signInWithPassword, type AuthFormState } from "@/app/auth/actions";
import { AuthLabel, AuthError, authInputClass } from "@/components/auth/auth-shell";

const initialState: AuthFormState = {};

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [state, formAction, isPending] = useActionState(signInWithPassword, initialState);
  const error = state.error ?? initialError;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next ?? "/"} />
      <AuthError message={error} />
      <div>
        <AuthLabel>Email</AuthLabel>
        <input name="email" type="email" required autoComplete="email" className={authInputClass} placeholder="you@bugforge.dev" />
      </div>
      <div>
        <AuthLabel>Password</AuthLabel>
        <input name="password" type="password" required autoComplete="current-password" className={authInputClass} placeholder="••••••••" />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-[color:var(--bf-brand)] px-3 py-2 text-sm font-medium text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
