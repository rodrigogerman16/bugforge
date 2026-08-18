"use client";

import { useTransition } from "react";
import { updateTesterRole } from "@/app/testers/actions";
import { TESTER_ROLE_META } from "@/lib/tester";
import type { TesterRole } from "@/generated/prisma/enums";

const ROLE_OPTIONS: TesterRole[] = ["ADMIN", "QA_LEAD", "QA_TESTER", "DEVELOPER", "PRODUCER", "VIEWER"];

export function RoleSelect({ testerId, role }: { testerId: string; role: TesterRole }) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={role}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value as TesterRole;
        startTransition(() => {
          updateTesterRole(testerId, next);
        });
      }}
      className="rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-2 py-1 text-[13px] font-medium outline-none disabled:opacity-50"
      style={{ color: TESTER_ROLE_META[role].color }}
    >
      {ROLE_OPTIONS.map((r) => (
        <option key={r} value={r}>
          {TESTER_ROLE_META[r].label}
        </option>
      ))}
    </select>
  );
}
