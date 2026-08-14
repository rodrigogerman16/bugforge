import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getBugDetail, getBugComments, getTesters, getCurrentUser, getBugActivity, getBugRelationships, getRegressionInfo } from "@/lib/data";
import { PLATFORM_LABEL } from "@/lib/platform";
import { formatRelativeTime } from "@/lib/relative-time";
import { EvidenceGallery } from "@/components/evidence/evidence-gallery";
import { CommentSection } from "@/components/comments/comment-section";
import { BugFieldControls, BugAssigneeControl } from "@/components/bugs/bug-field-controls";
import { ActivityTimeline } from "@/components/activity/activity-timeline";
import { BugRelationships } from "@/components/bugs/bug-relationships";
import { RegressionBanner } from "@/components/bugs/regression-banner";

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

  const [comments, testers, currentUser, activity, relationships, regressionInfo] = await Promise.all([
    getBugComments(id),
    getTesters(),
    getCurrentUser(),
    getBugActivity(id),
    getBugRelationships(id),
    bug.isRegression ? getRegressionInfo(id) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-8 py-8">
      <Link
        href={`/bugs?game=${bug.game.slug}`}
        className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-ink-primary)]"
      >
        <ArrowLeft size={13} />
        Back to bugs
      </Link>

      {regressionInfo && (
        <RegressionBanner
          originalBugId={regressionInfo.originalBugId}
          originalBugNumber={regressionInfo.originalBugNumber}
          previouslyFixedBuild={regressionInfo.previouslyFixedBuild}
          reproducedBuild={regressionInfo.reproducedBuild}
        />
      )}

      {bug.originatingTestCase && (
        <div className="mb-6 rounded-lg border border-[color:var(--bf-border-strong)] bg-[color:var(--bf-surface)] px-4 py-3 text-[13px] text-[color:var(--bf-ink-secondary)]">
          Created automatically from a failed{" "}
          <Link
            href={`/test-cases/${bug.originatingTestCase.id}/runs/${bug.originatingTestCase.runId}`}
            className="font-medium text-[color:var(--bf-brand)] hover:underline"
          >
            execution of TC-{String(bug.originatingTestCase.number).padStart(5, "0")}
          </Link>{" "}
          ({bug.originatingTestCase.title})
        </div>
      )}

      <header className="mb-6">
        <p className="font-mono text-[12px] text-[color:var(--bf-ink-muted)]">BUG-{bug.number}</p>
        <h1 className="mt-1 text-2xl font-bold text-[color:var(--bf-ink-primary)]">{bug.title}</h1>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <BugFieldControls bugId={bug.id} status={bug.status} priority={bug.priority} severity={bug.severity} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-y border-[color:var(--bf-border)] py-3 text-[13px] text-[color:var(--bf-ink-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded" style={{ backgroundColor: bug.game.coverColor }} />
            {bug.game.name}
          </span>
          <span>Reported by {bug.reportedBy?.name ?? "Unknown"}</span>
          <span className="flex items-center gap-1">
            Assigned to <BugAssigneeControl bugId={bug.id} assignedToId={bug.assignedToId} testers={testers} />
          </span>
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

      {bug.evidence.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">Evidence</h2>
          <EvidenceGallery items={bug.evidence} />
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

      <section className="mt-8 border-t border-[color:var(--bf-border)] pt-6">
        <h2 className="mb-3 text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">Relationships</h2>
        <BugRelationships bugId={bug.id} relationships={relationships} />
      </section>

      <section className="mt-8 border-t border-[color:var(--bf-border)] pt-6">
        <CommentSection bugId={bug.id} comments={comments} testers={testers} currentUserId={currentUser.id} />
      </section>

      <section className="mt-8 border-t border-[color:var(--bf-border)] pt-6">
        <h2 className="mb-4 text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">Activity</h2>
        <ActivityTimeline events={activity} />
      </section>
    </div>
  );
}
