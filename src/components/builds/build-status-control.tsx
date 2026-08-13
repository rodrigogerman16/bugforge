"use client";

import { useTransition } from "react";
import { BUILD_STATUS_META, BUILD_STATUS_ORDER } from "@/lib/build-status";
import { updateBuildStatus } from "@/app/builds/actions";
import type { BuildStatus } from "@/generated/prisma/enums";

export function BuildStatusControl({ buildId, status }: { buildId: string; status: BuildStatus }) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) => startTransition(() => updateBuildStatus(buildId, e.target.value as BuildStatus))}
      style={{ color: BUILD_STATUS_META[status].color }}
      className="appearance-none rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] py-1 pr-6 pl-2.5 text-[12px] font-medium outline-none hover:border-[color:var(--bf-border-strong)] disabled:opacity-50"
    >
      {BUILD_STATUS_ORDER.map((s) => (
        <option key={s} value={s} style={{ color: "initial" }}>
          {BUILD_STATUS_META[s].label}
        </option>
      ))}
    </select>
  );
}
