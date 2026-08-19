// Shared between BugCreateForm and its field subcomponents so every section
// of the form looks consistent without each one redefining the same classes.
export const inputClass =
  "w-full rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-3 py-2 text-sm text-[color:var(--bf-ink-primary)] outline-none placeholder:text-[color:var(--bf-ink-muted)] focus:border-[color:var(--bf-border-strong)]";
export const labelClass = "mb-1.5 block text-[12px] font-medium text-[color:var(--bf-ink-secondary)]";

export const QUALITY_COLOR = (percent: number) =>
  percent >= 80
    ? "var(--bf-status-good)"
    : percent >= 50
      ? "var(--bf-status-warning)"
      : "var(--bf-status-critical)";
