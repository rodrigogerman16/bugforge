import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { getBugDetail } from "@/lib/data";
import { SEVERITY_META } from "@/lib/severity";
import { PLATFORM_LABEL } from "@/lib/platform";
import { PriorityBadge } from "@/components/priority-badge";
import { StatusBadge } from "@/components/status-badge";
import { formatRelativeTime } from "@/lib/relative-time";

function parseSteps(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
}

function EnvRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-[color:var(--bf-ink-muted)]">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-[color:var(--bf-ink-primary)]">{value}</dd>
    </div>
  );
}

const updatedFormatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export default async function BugDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bug = await getBugDetail(id);
  if (!bug) notFound();

  const severityMeta = SEVERITY_META[bug.severity];

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <Link
        href={`/bugs?game=${bug.game.slug}`}
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-ink-primary)]"
      >
        <ArrowLeft size={13} />
        Back to bugs
      </Link>

      <header className="mb-6">
        <p className="font-mono text-[12px] text-[color:var(--bf-ink-muted)]">BUG-{bug.number}</p>
        <h1 className="mt-1 text-2xl font-bold text-[color:var(--bf-ink-primary)]">{bug.title}</h1>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm font-medium" style={{ color: severityMeta.color }}>
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: severityMeta.color }} />
            {severityMeta.label}
          </span>
          <span className="text-[color:var(--bf-ink-muted)]">·</span>
          <PriorityBadge priority={bug.priority} />
          <span className="text-[color:var(--bf-ink-muted)]">·</span>
          <StatusBadge status={bug.status} />
          {bug.isRegression && (
            <span
              title="Previously fixed, reopened after regressing"
              className="flex items-center gap-1 text-[11px] text-[color:var(--bf-status-warning)]"
            >
              <RotateCcw size={11} />
              Regressed
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-y border-[color:var(--bf-border)] py-3 text-[13px] text-[color:var(--bf-ink-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded" style={{ backgroundColor: bug.game.coverColor }} />
            {bug.game.name}
          </span>
          <span>Reported by {bug.reportedBy?.name ?? "Unknown"}</span>
          <span>Assigned to {bug.assignedTo?.name ?? "Unassigned"}</span>
          {bug.session && <span>{bug.session.name}</span>}
          <span>Updated {formatRelativeTime(bug.updatedAt)} · {updatedFormatter.format(bug.createdAt)} reported</span>
        </div>
      </header>

      <section className="mb-6">
        <h2 className="mb-2 text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">Description</h2>
        <p className="text-sm leading-relaxed text-[color:var(--bf-ink-secondary)]">{bug.description}</p>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">Environment</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-4 sm:grid-cols-3">
          <EnvRow label="Build" value={bug.build.version} />
          <EnvRow label="Platform" value={PLATFORM_LABEL[bug.game.platform]} />
          {bug.environmentOS && <EnvRow label="OS" value={bug.environmentOS} />}
          {bug.environmentGpu && <EnvRow label="GPU" value={bug.environmentGpu} />}
          {bug.map && <EnvRow label="Map" value={bug.map} />}
          {bug.gameMode && <EnvRow label="Game Mode" value={bug.gameMode} />}
        </dl>
      </section>

      {bug.stepsToReproduce && (
        <section className="mb-6">
          <h2 className="mb-2 text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">
            Reproduction Steps
          </h2>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-[color:var(--bf-ink-secondary)]">
            {parseSteps(bug.stepsToReproduce).map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </section>
      )}

      {bug.expectedResult && (
        <section className="mb-6">
          <h2 className="mb-2 text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">Expected Result</h2>
          <p
            className="rounded-lg border p-3 text-sm text-[color:var(--bf-ink-secondary)]"
            style={{
              borderColor: "color-mix(in srgb, var(--bf-status-good) 30%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--bf-status-good) 6%, transparent)",
            }}
          >
            {bug.expectedResult}
          </p>
        </section>
      )}

      {bug.actualResult && (
        <section className="mb-6">
          <h2 className="mb-2 text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">Actual Result</h2>
          <p
            className="rounded-lg border p-3 text-sm text-[color:var(--bf-ink-secondary)]"
            style={{
              borderColor: "color-mix(in srgb, var(--bf-status-critical) 30%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--bf-status-critical) 6%, transparent)",
            }}
          >
            {bug.actualResult}
          </p>
        </section>
      )}

      {bug.tags.length > 0 && (
        <section>
          <h2 className="mb-2 text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">Tags</h2>
          <div className="flex flex-wrap gap-1.5">
            {bug.tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full border px-2 py-0.5 text-[11px] font-medium"
                style={{
                  borderColor: `color-mix(in srgb, ${tag.color} 40%, transparent)`,
                  color: tag.color,
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
