import { Loader2 } from "lucide-react";

// Shown while a Server Component page is fetching data, in place of the
// page content only — layout.tsx keeps rendering, so the sidebar/topbar
// never flash or disappear during navigation.
export default function Loading() {
  return (
    <div className="flex items-center justify-center gap-2 px-8 py-24 text-sm text-[color:var(--bf-ink-muted)]">
      <Loader2 size={16} className="animate-spin" />
      Loading...
    </div>
  );
}
