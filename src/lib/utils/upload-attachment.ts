"use client";

import type { AttachmentKind } from "@/lib/validation/attachments";

export type UploadedAttachment = {
  url: string;
  fileName: string;
  fileSizeBytes: number;
  kind: AttachmentKind;
  content: string | null;
};

export type AttachmentContext = "comment" | "evidence";

// Shared by the comment composer and the bug-evidence uploader — both send
// the raw file to /api/attachments/upload (never straight to Supabase from
// the client) and get back the real Storage URL plus metadata to persist.
// `context` tells the route which capability to check — commenting and
// uploading evidence are separately-grantable permissions (see
// lib/permissions.ts), even though most roles that have one have both.
export async function uploadAttachment(file: File, context: AttachmentContext): Promise<UploadedAttachment> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("context", context);
  const res = await fetch("/api/attachments/upload", { method: "POST", body: formData });
  if (!res.ok) {
    throw new Error((await res.text()) || "Upload failed.");
  }
  return res.json();
}
