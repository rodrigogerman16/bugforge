import { cn } from "@/lib/utils";

export function BugCreateFormActions({
  onCancel,
  onSubmit,
  canSubmit,
  isPending,
  hasDuplicates,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  canSubmit: boolean | string;
  isPending: boolean;
  hasDuplicates: boolean;
}) {
  return (
    <div className="flex justify-end gap-2 pt-2">
      <button
        onClick={onCancel}
        className="rounded-md border border-[color:var(--bf-border)] px-3 py-1.5 text-[12px] text-[color:var(--bf-ink-secondary)] hover:border-[color:var(--bf-border-strong)]"
      >
        Cancel
      </button>
      <button
        onClick={onSubmit}
        disabled={!canSubmit || isPending}
        className={cn(
          "rounded-md bg-[color:var(--bf-brand)] px-4 py-1.5 text-[12px] font-medium text-black hover:opacity-90",
          (!canSubmit || isPending) && "cursor-not-allowed opacity-50 hover:opacity-50"
        )}
      >
        {hasDuplicates ? "Create Anyway" : "Create Bug"}
      </button>
    </div>
  );
}
