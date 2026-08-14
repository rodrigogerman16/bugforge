"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteSession } from "@/app/sessions/actions";

export function DeleteSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm("Delete this session? Its test runs will also be deleted, and its bugs will be unlinked from it.")) return;
    startTransition(async () => {
      await deleteSession(sessionId);
      router.push("/sessions");
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="flex items-center gap-1.5 rounded-md border border-[color:var(--bf-border)] px-3 py-1.5 text-[12px] text-[color:var(--bf-ink-muted)] hover:border-[color:var(--bf-status-critical)] hover:text-[color:var(--bf-status-critical)] disabled:opacity-50"
    >
      <Trash2 size={12} />
      Delete
    </button>
  );
}
