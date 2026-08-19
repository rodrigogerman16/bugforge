import type { EvidenceType } from "@/generated/prisma/enums";

// The four categories item 46 asks for, mapped onto the existing
// EvidenceType enum (already used by both Bug evidence and comment
// attachments): Images, Videos, Logs, and Text files (the general
// "ATTACHMENT" bucket, also used for things like device reports).
//
// This is an ALLOWLIST, not a blocklist — an extension/MIME pair that
// isn't explicitly listed here is rejected, including anything not on this
// list at all (executables, scripts, HTML, SVG — SVG can carry embedded
// script and is deliberately excluded from "Images"). This is the "do not
// allow unsafe file types without validation" requirement: nothing is
// admitted by default.
export type AttachmentKind = EvidenceType;

type KindRule = { label: string; extensions: string[]; mimeTypes: string[]; maxBytes: number };

export const ATTACHMENT_RULES: Record<AttachmentKind, KindRule> = {
  IMAGE: {
    label: "Image",
    extensions: [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    mimeTypes: ["image/png", "image/jpeg", "image/gif", "image/webp"],
    maxBytes: 10 * 1024 * 1024,
  },
  VIDEO: {
    label: "Video",
    extensions: [".mp4", ".webm", ".mov"],
    mimeTypes: ["video/mp4", "video/webm", "video/quicktime"],
    maxBytes: 200 * 1024 * 1024,
  },
  LOG: {
    label: "Log",
    extensions: [".log"],
    // Browsers/OSes very inconsistently assign a MIME type to .log files —
    // text/plain, x-log, or none at all (empty string) are all common, so
    // the extension is what actually decides the kind here.
    mimeTypes: ["text/plain", "text/x-log", "application/octet-stream", ""],
    maxBytes: 5 * 1024 * 1024,
  },
  ATTACHMENT: {
    label: "Text file",
    extensions: [".txt", ".csv", ".json", ".md"],
    mimeTypes: ["text/plain", "text/csv", "application/json", "text/markdown", "application/octet-stream", ""],
    maxBytes: 5 * 1024 * 1024,
  },
};

function extensionOf(fileName: string): string {
  const i = fileName.lastIndexOf(".");
  return i === -1 ? "" : fileName.slice(i).toLowerCase();
}

// Extension is authoritative for *which* kind a file is (browsers report
// wildly inconsistent MIME types for the same file), but the reported MIME
// type is still cross-checked against that kind's allowlist so a renamed
// file (e.g. malware.exe → malware.png) can't sneak in behind a permitted
// extension.
export function detectAttachmentKind(fileName: string): AttachmentKind | null {
  const ext = extensionOf(fileName);
  for (const kind of Object.keys(ATTACHMENT_RULES) as AttachmentKind[]) {
    if (ATTACHMENT_RULES[kind].extensions.includes(ext)) return kind;
  }
  return null;
}

export type AttachmentValidation =
  | { ok: true; kind: AttachmentKind }
  | { ok: false; error: string };

export function validateAttachmentFile(file: { name: string; size: number; type: string }): AttachmentValidation {
  const kind = detectAttachmentKind(file.name);
  if (!kind) {
    return { ok: false, error: `"${file.name}" isn't a supported file type. Allowed: images, videos, logs, and text files.` };
  }

  const rule = ATTACHMENT_RULES[kind];
  if (file.type && !rule.mimeTypes.includes(file.type)) {
    return { ok: false, error: `"${file.name}" doesn't look like a real ${rule.label.toLowerCase()} (unexpected content type).` };
  }

  if (file.size > rule.maxBytes) {
    return { ok: false, error: `"${file.name}" is too large — ${rule.label} uploads are limited to ${formatBytes(rule.maxBytes)}.` };
  }
  if (file.size === 0) {
    return { ok: false, error: `"${file.name}" is empty.` };
  }

  return { ok: true, kind };
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
