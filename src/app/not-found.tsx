import Link from "next/link";
import { SearchX } from "lucide-react";

export const metadata = {
  title: "Page not found — BugForge",
};

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-8 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--bf-surface)]">
        <SearchX size={24} className="text-[color:var(--bf-ink-muted)]" />
      </div>
      <h1 className="mt-5 text-xl font-bold text-[color:var(--bf-ink-primary)]">Page not found</h1>
      <p className="mt-2 text-sm text-[color:var(--bf-ink-muted)]">
        The page you&apos;re looking for doesn&apos;t exist, or the link may be out of date — a bug, build, or test
        case that used to be here may have been removed.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-md bg-[color:var(--bf-brand)] px-4 py-2 text-[13px] font-medium text-black hover:opacity-90"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
