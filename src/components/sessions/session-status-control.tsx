"use client";

import { useTransition } from "react";
import { Play, Square } from "lucide-react";
import { startSession, endSession } from "@/app/sessions/actions";
import type { SessionStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

export function SessionStatusControl({ sessionId, status }: { sessionId: string; status: SessionStatus }) {
  const [isPending, startTransition] = useTransition();

  if (status === "COMPLETED") return null;

  const buttonClass =
    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium text-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";

  if (status === "PLANNED") {
    return (
      <button
        onClick={() => startTransition(() => startSession(sessionId))}
        disabled={isPending}
        className={cn(buttonClass, "bg-[color:var(--bf-status-good)]")}
      >
        <Play size={12} />
        Start Session
      </button>
    );
  }

  return (
    <button
      onClick={() => startTransition(() => endSession(sessionId))}
      disabled={isPending}
      className={cn(buttonClass, "bg-[color:var(--bf-status-critical)]")}
    >
      <Square size={12} />
      End Session
    </button>
  );
}
