"use client";

import Link from "next/link";
import { User, Settings, LogOut } from "lucide-react";
import { Dropdown } from "@/components/dropdown";
import { TESTER_ROLE_META } from "@/lib/tester";
import { signOut } from "@/app/auth/actions";
import type { TesterRole } from "@/generated/prisma/enums";

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
  authConfigured,
}: {
  user: { name: string; email: string; role: string };
  authConfigured: boolean;
}) {
  const roleMeta = TESTER_ROLE_META[user.role as TesterRole];

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
            <span
              className="mt-2 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium"
              style={{ borderColor: `${roleMeta?.color ?? "var(--bf-border)"}66`, color: roleMeta?.color }}
            >
              {roleMeta?.label ?? user.role}
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
            <Link
              href="/settings"
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-[color:var(--bf-ink-secondary)] hover:bg-[color:var(--bf-surface)] hover:text-[color:var(--bf-ink-primary)]"
            >
              <Settings size={14} />
              Settings
            </Link>
          </div>
          <div className="border-t border-[color:var(--bf-border)] py-1">
            {authConfigured ? (
              <form action={signOut}>
                <button
                  type="submit"
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-[color:var(--bf-ink-secondary)] hover:bg-[color:var(--bf-surface)] hover:text-[color:var(--bf-status-critical)]"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </form>
            ) : (
              <button
                disabled
                title="Auth isn't configured yet — see .env"
                className="flex w-full cursor-not-allowed items-center gap-2.5 px-3.5 py-2 text-left text-sm text-[color:var(--bf-ink-muted)]"
              >
                <LogOut size={14} />
                Sign out
              </button>
            )}
          </div>
        </div>
      )}
    </Dropdown>
  );
}
