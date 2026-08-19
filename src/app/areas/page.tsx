import { getAreas, getAreaUsageCounts, getCurrentUser } from "@/lib/data";
import { QA_DISCIPLINE_META } from "@/lib/coverage";
import { AreaForm } from "@/components/areas/area-form";
import { DeleteAreaButton } from "@/components/areas/delete-area-button";
import { hasCapability } from "@/lib/permissions";

export default async function AreasPage() {
  const [areas, usage, currentUser] = await Promise.all([getAreas(), getAreaUsageCounts(), getCurrentUser()]);
  const canManageAreas = hasCapability(currentUser.role, "MANAGE_AREAS");

  return (
    <div className="mx-auto max-w-3xl px-8 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-wide text-[color:var(--bf-ink-primary)] uppercase">
          Game Areas
        </h1>
        <p className="mt-1 text-sm text-[color:var(--bf-ink-muted)]">
          The taxonomy bugs and test cases are categorized by. {areas.length} area{areas.length === 1 ? "" : "s"}.
        </p>
      </header>

      {canManageAreas && (
        <div className="mb-6 rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-4">
          <AreaForm />
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-[color:var(--bf-border)]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] text-left text-[12px] text-[color:var(--bf-ink-muted)]">
              <th className="px-4 py-2.5 font-medium">Name</th>
              <th className="px-4 py-2.5 font-medium">Discipline</th>
              <th className="px-4 py-2.5 font-medium">Bugs</th>
              <th className="px-4 py-2.5 font-medium">Test Cases</th>
              <th className="px-4 py-2.5 font-medium" />
            </tr>
          </thead>
          <tbody>
            {areas.map((area) => {
              const counts = usage.get(area.id) ?? { bugs: 0, testCases: 0 };
              return (
                <tr key={area.id} className="border-b border-[color:var(--bf-border)] last:border-b-0 hover:bg-[color:var(--bf-surface)]">
                  <td className="px-4 py-3 font-medium text-[color:var(--bf-ink-primary)]">{area.name}</td>
                  <td className="px-4 py-3 text-[color:var(--bf-ink-secondary)]">
                    {area.discipline ? QA_DISCIPLINE_META[area.discipline].label : "—"}
                  </td>
                  <td className="px-4 py-3 text-[color:var(--bf-ink-secondary)]">{counts.bugs}</td>
                  <td className="px-4 py-3 text-[color:var(--bf-ink-secondary)]">{counts.testCases}</td>
                  <td className="px-4 py-3 text-right">
                    {canManageAreas && <DeleteAreaButton areaId={area.id} areaName={area.name} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
