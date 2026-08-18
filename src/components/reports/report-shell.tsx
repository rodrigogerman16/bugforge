import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrintButton } from "@/components/reports/print-button";

const generatedFormatter = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

// The shared document frame every report page renders inside — a title,
// a "generated at" timestamp (real, computed at request time, not a
// static label), and a print affordance that hides itself and the nav
// chrome on the printed/PDF output via Tailwind's print: variant.
export function ReportShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link
          href="/reports"
          className="inline-flex items-center gap-1.5 text-[12px] text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-ink-primary)]"
        >
          <ArrowLeft size={13} />
          Back to reports
        </Link>
        <PrintButton />
      </div>

      <header className="mb-6 border-b border-[color:var(--bf-border)] pb-4">
        <h1 className="text-2xl font-bold tracking-wide text-[color:var(--bf-ink-primary)] uppercase">{title}</h1>
        <p className="mt-1 text-sm text-[color:var(--bf-ink-muted)]">{subtitle}</p>
        <p className="mt-2 text-[11px] text-[color:var(--bf-ink-muted)]">Generated {generatedFormatter.format(new Date())}</p>
      </header>

      <div className="space-y-6">{children}</div>
    </div>
  );
}

export function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">{title}</h2>
      {children}
    </section>
  );
}

export function ReportStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-[color:var(--bf-ink-muted)]">{label}</p>
      <p className="mt-1 text-lg font-semibold" style={{ color: color ?? "var(--bf-ink-primary)" }}>
        {value}
      </p>
    </div>
  );
}
