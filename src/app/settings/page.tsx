import { getQualityGates, getCurrentUser } from "@/lib/data";
import { canManageSettings } from "@/lib/permissions";
import { QualityGatesForm } from "@/components/settings/quality-gates-form";

export default async function SettingsPage() {
  const [gates, user] = await Promise.all([getQualityGates(), getCurrentUser()]);
  const readOnly = !canManageSettings(user.role);

  return (
    <div className="mx-auto max-w-2xl px-8 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-wide text-[color:var(--bf-ink-primary)] uppercase">Settings</h1>
        <p className="mt-1 text-sm text-[color:var(--bf-ink-muted)]">
          Configure the release requirements every build is measured against.
        </p>
      </header>

      <section>
        <h2 className="mb-1 text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">Release Requirements</h2>
        <p className="mb-3 text-[12px] text-[color:var(--bf-ink-muted)]">
          {readOnly
            ? "Only Admins and QA Leads can change these — you have read-only access."
            : "Changes apply immediately to every build's Release Readiness page. Uncheck a requirement to stop enforcing it without losing its configured threshold."}
        </p>
        <QualityGatesForm gates={gates} readOnly={readOnly} />
      </section>
    </div>
  );
}
