"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteTestCase } from "@/app/test-cases/actions";

export function DeleteTestCaseButton({ testCaseId }: { testCaseId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm("Delete this test case? Its run history will also be deleted.")) return;
    startTransition(async () => {
      await deleteTestCase(testCaseId);
      router.push("/test-cases");
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
