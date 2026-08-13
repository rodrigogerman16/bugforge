"use client";

import { User, Settings, LogOut } from "lucide-react";
import { Dropdown } from "@/components/dropdown";

const ROLE_LABEL: Record<string, string> = {
  QA_LEAD: "QA Lead",
  QA_ENGINEER: "QA Engineer",
  DEVELOPER: "Developer",
  PRODUCER: "Producer",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserMenu({
  user,
}: {
  user: { name: string; email: string; role: string };
}) {
  return (
    <Dropdown
      align="right"
      trigger={({ toggle }) => (
        <button
          onClick={toggle}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[color:var(--bf-brand)] text-[11px] font-semibold text-black"
          aria-label="User menu"
        >
          {initials(user.name)}
        </button>
      )}
    >
      {() => (
        <div className="w-64">
          <div className="border-b border-[color:var(--bf-border)] px-3.5 py-3">
            <p className="text-sm font-semibold text-[color:var(--bf-ink-primary)]">
              {user.name}
            </p>
            <p className="mt-0.5 truncate text-[12px] text-[color:var(--bf-ink-muted)]">
              {user.email}
            </p>
            <span className="mt-2 inline-block rounded-full border border-[color:var(--bf-border)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--bf-ink-secondary)]">
              {ROLE_LABEL[user.role] ?? user.role}
            </span>
          </div>
          <div className="py-1">
            <button
              disabled
              title="Coming soon"
              className="flex w-full cursor-not-allowed items-center gap-2.5 px-3.5 py-2 text-left text-sm text-[color:var(--bf-ink-muted)]"
            >
              <User size={14} />
              Profile
            </button>
            <button
              disabled
              title="Coming soon"
              className="flex w-full cursor-not-allowed items-center gap-2.5 px-3.5 py-2 text-left text-sm text-[color:var(--bf-ink-muted)]"
            >
              <Settings size={14} />
              Settings
            </button>
          </div>
          <div className="border-t border-[color:var(--bf-border)] py-1">
            <button
              disabled
              title="Coming soon"
              className="flex w-full cursor-not-allowed items-center gap-2.5 px-3.5 py-2 text-left text-sm text-[color:var(--bf-ink-muted)]"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </Dropdown>
  );
}
