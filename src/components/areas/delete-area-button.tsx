"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteArea } from "@/app/areas/actions";

export function DeleteAreaButton({ areaId, areaName }: { areaId: string; areaName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`Delete "${areaName}"? Bugs and test cases tagged with it will become uncategorized.`)) return;
    startTransition(async () => {
      await deleteArea(areaId);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="flex items-center gap-1.5 rounded-md border border-[color:var(--bf-border)] px-2.5 py-1 text-[12px] text-[color:var(--bf-ink-muted)] hover:border-[color:var(--bf-status-critical)] hover:text-[color:var(--bf-status-critical)] disabled:opacity-50"
    >
      <Trash2 size={12} />
      Delete
    </button>
  );
}
