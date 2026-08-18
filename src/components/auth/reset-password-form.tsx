"use client";

import { useActionState } from "react";
import { updatePassword, type AuthFormState } from "@/app/auth/actions";
import { AuthLabel, AuthError, authInputClass } from "@/components/auth/auth-shell";

const initialState: AuthFormState = {};

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(updatePassword, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <AuthError message={state.error} />
      <div>
        <AuthLabel>New password</AuthLabel>
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
      <div>
        <AuthLabel>Confirm new password</AuthLabel>
        <input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={authInputClass} />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-[color:var(--bf-brand)] px-3 py-2 text-sm font-medium text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}
