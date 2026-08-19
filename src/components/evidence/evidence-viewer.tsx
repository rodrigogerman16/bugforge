"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Download,
  Image as ImageIcon,
  Video as VideoIcon,
  Terminal,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatBytes } from "@/lib/attachments";

export type EvidenceType = "IMAGE" | "VIDEO" | "LOG" | "ATTACHMENT";

export type EvidenceItem = {
  id: string;
  type: EvidenceType;
  url: string;
  content: string | null;
  fileName: string | null;
  fileSizeBytes: number | null;
  caption: string | null;
};

export const TYPE_META: Record<EvidenceType, { label: string; icon: typeof ImageIcon }> = {
  IMAGE: { label: "Screenshot", icon: ImageIcon },
  VIDEO: { label: "Video", icon: VideoIcon },
  LOG: { label: "Log", icon: Terminal },
  ATTACHMENT: { label: "Attachment", icon: FileText },
};

function downloadText(content: string, fileName: string) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

const iconButtonClass =
  "flex h-8 w-8 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent";

export function EvidenceViewer({
  items,
  initialIndex,
  onClose,
}: {
  items: EvidenceItem[];
  initialIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const item = items[index];
  const meta = TYPE_META[item.type];
  const Icon = meta.icon;

  useEffect(() => {
    setZoom(1);
  }, [index]);

  // Explicitly kick off loading the new source — some environments don't
  // reliably auto-load a <video> when its src is set via a JSX attribute on
  // mount, leaving it stuck with no data until .load() is called directly.
  useEffect(() => {
    if (item.type === "VIDEO") videoRef.current?.load();
  }, [item]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      else if (e.key === "ArrowRight") setIndex((i) => Math.min(items.length - 1, i + 1));
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [items.length, onClose]);

  // Swipe navigation for touch devices — the only way to move between
  // evidence on mobile, since there's no hover to reveal the chevrons'
  // affordance and reaching across a phone screen to tap them is awkward.
  // Disabled while zoomed into an image so a horizontal pan to inspect
  // detail doesn't get mistaken for "next item."
  function onTouchStart(e: React.TouchEvent) {
    if (items.length < 2) return;
    touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || zoom > 1) return;
    const dx = e.changedTouches[0].clientX - start.x;
    const dy = e.changedTouches[0].clientY - start.y;
    // Require a real, deliberate horizontal swipe — not a tap, and not a
    // vertical scroll/drag that happens to have some horizontal drift.
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx > 0) setIndex((i) => Math.max(0, i - 1));
    else setIndex((i) => Math.min(items.length - 1, i + 1));
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current?.requestFullscreen();
  }

  return (
    <div ref={containerRef} className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 text-sm text-white">
          <Icon size={14} className="shrink-0" />
          <span className="truncate font-medium">{item.caption ?? meta.label}</span>
          {item.fileName && <span className="shrink-0 text-white/50">{item.fileName}</span>}
          {item.fileSizeBytes != null && (
            <span className="shrink-0 text-white/40">{formatBytes(item.fileSizeBytes)}</span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {item.type === "IMAGE" && (
            <>
              <button
                onClick={() => setZoom((z) => Math.max(1, z - 0.5))}
                disabled={zoom <= 1}
                className={iconButtonClass}
                aria-label="Zoom out"
              >
                <ZoomOut size={16} />
              </button>
              <span className="w-11 text-center text-[12px] text-white/70">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(3, z + 0.5))}
                disabled={zoom >= 3}
                className={iconButtonClass}
                aria-label="Zoom in"
              >
                <ZoomIn size={16} />
              </button>
            </>
          )}
          <button onClick={toggleFullscreen} className={iconButtonClass} aria-label="Fullscreen">
            <Maximize size={16} />
          </button>
          {item.type === "IMAGE" && (
            <a href={item.url} download={item.fileName ?? "screenshot.svg"} className={iconButtonClass} aria-label="Download">
              <Download size={16} />
            </a>
          )}
          {item.type === "VIDEO" && (
            <a href={item.url} download target="_blank" rel="noreferrer" className={iconButtonClass} aria-label="Download">
              <Download size={16} />
            </a>
          )}
          {(item.type === "LOG" || item.type === "ATTACHMENT") && (
            <button
              onClick={() => item.content && downloadText(item.content, item.fileName ?? "evidence.txt")}
              className={iconButtonClass}
              aria-label="Download"
            >
              <Download size={16} />
            </button>
          )}
          <button onClick={onClose} className={iconButtonClass} aria-label="Close">
            <X size={18} />
          </button>
        </div>
      </div>

      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden px-6 pb-4 sm:px-16"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {items.length > 1 && (
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className={cn(iconButtonClass, "absolute left-2 z-10 h-11 w-11 bg-black/30 sm:left-4")}
            aria-label="Previous"
          >
            <ChevronLeft size={22} />
          </button>
        )}

        {item.type === "IMAGE" && (
          <div className="max-h-full max-w-full overflow-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.url}
              alt={item.caption ?? ""}
              style={{ transform: `scale(${zoom})` }}
              className="max-h-[72vh] max-w-full origin-center object-contain transition-transform duration-150"
            />
          </div>
        )}
        {item.type === "VIDEO" && (
          <video
            ref={videoRef}
            key={item.id}
            controls
            autoPlay
            className="max-h-[72vh] max-w-full rounded-lg"
            src={item.url}
          />
        )}
        {(item.type === "LOG" || item.type === "ATTACHMENT") && (
          <pre className="max-h-[72vh] w-full max-w-2xl overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-black/40 p-4 text-left font-mono text-[12px] leading-relaxed text-white/80">
            {item.content}
          </pre>
        )}

        {items.length > 1 && (
          <button
            onClick={() => setIndex((i) => Math.min(items.length - 1, i + 1))}
            disabled={index === items.length - 1}
            className={cn(iconButtonClass, "absolute right-2 z-10 h-11 w-11 bg-black/30 sm:right-4")}
            aria-label="Next"
          >
            <ChevronRight size={22} />
          </button>
        )}
      </div>

      {items.length > 1 && (
        <div className="pb-4 text-center text-[12px] text-white/50">
          {index + 1} / {items.length}
        </div>
      )}
    </div>
  );
}
