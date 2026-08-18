"use client";

import { useActionState } from "react";
import { requestPasswordReset, type AuthFormState } from "@/app/auth/actions";
import { AuthLabel, AuthError, AuthSuccess, authInputClass } from "@/components/auth/auth-shell";

const initialState: AuthFormState = {};

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordReset, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <AuthError message={state.error} />
      <AuthSuccess message={state.success} />
      <div>
        <AuthLabel>Email</AuthLabel>
        <input name="email" type="email" required autoComplete="email" className={authInputClass} placeholder="you@bugforge.dev" />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-[color:var(--bf-brand)] px-3 py-2 text-sm font-medium text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
