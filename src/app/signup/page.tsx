import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { GoogleSignInButton } from "@/components/auth/oauth-buttons";

export default function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Join your team's BugForge workspace."
      footer={
        <p>
          Already have an account?{" "}
          <Link href="/login" className="text-[color:var(--bf-brand)] hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <SignupForm />
      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-[color:var(--bf-border)]" />
        <span className="text-[11px] text-[color:var(--bf-ink-muted)]">or</span>
        <div className="h-px flex-1 bg-[color:var(--bf-border)]" />
      </div>
      <GoogleSignInButton />
    </AuthShell>
  );
}
