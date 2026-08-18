import { Download } from "lucide-react";

// Plain download links (no client JS needed) — the browser follows the
// Content-Disposition: attachment header from the /api/export/* route and
// saves the file directly. `params` should mirror whatever filters are
// currently applied on the page, so the export matches what's on screen.
export function ExportLinks({ base, params }: { base: string; params?: Record<string, string | undefined> }) {
  function href(format: "csv" | "json") {
    const p = new URLSearchParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value) p.set(key, value);
      }
    }
    p.set("format", format);
    return `${base}?${p.toString()}`;
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <a
        href={href("csv")}
        className="flex items-center gap-1.5 rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-2.5 py-1.5 text-[12px] font-medium text-[color:var(--bf-ink-secondary)] hover:border-[color:var(--bf-border-strong)] hover:text-[color:var(--bf-ink-primary)]"
      >
        <Download size={13} />
        CSV
      </a>
      <a
        href={href("json")}
        className="flex items-center gap-1.5 rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-2.5 py-1.5 text-[12px] font-medium text-[color:var(--bf-ink-secondary)] hover:border-[color:var(--bf-border-strong)] hover:text-[color:var(--bf-ink-primary)]"
      >
        <Download size={13} />
        JSON
      </a>
    </div>
  );
}
