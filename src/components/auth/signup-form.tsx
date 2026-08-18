"use client";

import { useActionState } from "react";
import { signUpWithPassword, type AuthFormState } from "@/app/auth/actions";
import { AuthLabel, AuthError, AuthSuccess, authInputClass } from "@/components/auth/auth-shell";

const initialState: AuthFormState = {};

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signUpWithPassword, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <AuthError message={state.error} />
      <AuthSuccess message={state.success} />
      <div>
        <AuthLabel>Name</AuthLabel>
        <input name="name" type="text" required autoComplete="name" className={authInputClass} placeholder="Jamie Rivera" />
      </div>
      <div>
        <AuthLabel>Email</AuthLabel>
        <input name="email" type="email" required autoComplete="email" className={authInputClass} placeholder="you@bugforge.dev" />
      </div>
      <div>
        <AuthLabel>Password</AuthLabel>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={authInputClass}
          placeholder="At least 8 characters"
        />
      </div>
      <p className="text-[11px] text-[color:var(--bf-ink-muted)]">
        New accounts start as Viewer (read-only) — an Admin can promote your role from the Testers page.
      </p>
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-[color:var(--bf-brand)] px-3 py-2 text-sm font-medium text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
