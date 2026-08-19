import Link from "next/link";

export function Brand() {
  return (
    <Link href="/" className="flex shrink-0 items-center gap-2">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[color:var(--bf-brand)] text-sm font-bold text-black">
        B
      </div>
      <div className="hidden sm:block">
        <p className="text-sm font-semibold leading-none text-[color:var(--bf-ink-primary)]">
          BugForge
        </p>
        <p className="mt-1 text-[11px] leading-none text-[color:var(--bf-ink-muted)]">
          QA Intelligence
        </p>
      </div>
    </Link>
  );
}
