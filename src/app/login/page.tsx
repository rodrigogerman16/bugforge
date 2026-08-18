import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { GoogleSignInButton } from "@/components/auth/oauth-buttons";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  return (
    <AuthShell
      title="Sign in"
      subtitle="Welcome back to BugForge."
      footer={
        <>
          <p>
            No account?{" "}
            <Link href="/signup" className="text-[color:var(--bf-brand)] hover:underline">
              Create one
            </Link>
          </p>
          <p className="mt-1">
            <Link href="/forgot-password" className="text-[color:var(--bf-ink-muted)] hover:underline">
              Forgot your password?
            </Link>
          </p>
        </>
      }
    >
      <LoginForm next={next} initialError={error} />
      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-[color:var(--bf-border)]" />
        <span className="text-[11px] text-[color:var(--bf-ink-muted)]">or</span>
        <div className="h-px flex-1 bg-[color:var(--bf-border)]" />
      </div>
      <GoogleSignInButton />
    </AuthShell>
  );
}
