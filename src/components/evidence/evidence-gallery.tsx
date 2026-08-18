"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { EvidenceViewer, type EvidenceItem, TYPE_META } from "@/components/evidence/evidence-viewer";
import { formatBytes } from "@/lib/attachments";

export type { EvidenceItem } from "@/components/evidence/evidence-viewer";

export function EvidenceGallery({ items }: { items: EvidenceItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {items.map((item, i) => {
          const meta = TYPE_META[item.type];
          const Icon = meta.icon;
          return (
            <button
              key={item.id}
              onClick={() => setOpenIndex(i)}
              className="group relative flex aspect-video flex-col overflow-hidden rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] text-left hover:border-[color:var(--bf-border-strong)]"
            >
              {item.type === "IMAGE" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.url}
                  alt={item.caption ?? "Screenshot"}
                  className="h-full w-full object-cover"
                />
              ) : item.type === "VIDEO" ? (
                <div className="flex h-full w-full items-center justify-center bg-[color:var(--bf-page)]">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--bf-brand-soft)] text-[color:var(--bf-brand)] transition-transform group-hover:scale-105">
                    <Play size={16} fill="currentColor" />
                  </span>
                </div>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-[color:var(--bf-page)] px-2 text-center">
                  <Icon size={20} className="text-[color:var(--bf-ink-muted)]" />
                  <span className="max-w-full truncate text-[11px] text-[color:var(--bf-ink-muted)]">
                    {item.fileName}
                  </span>
                </div>
              )}
              <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                <Icon size={10} />
                {meta.label}
                {item.fileSizeBytes != null && <span className="text-white/60">· {formatBytes(item.fileSizeBytes)}</span>}
              </span>
            </button>
          );
        })}
      </div>

      {openIndex !== null && (
        <EvidenceViewer items={items} initialIndex={openIndex} onClose={() => setOpenIndex(null)} />
      )}
    </>
  );
}
