"use client";

import type { AttachmentKind } from "@/lib/attachments";

export type UploadedAttachment = {
  url: string;
  fileName: string;
  fileSizeBytes: number;
  kind: AttachmentKind;
  content: string | null;
};

// Shared by the comment composer and the bug-evidence uploader — both send
// the raw file to /api/attachments/upload (never straight to Supabase from
// the client) and get back the real Storage URL plus metadata to persist.
export async function uploadAttachment(file: File): Promise<UploadedAttachment> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/attachments/upload", { method: "POST", body: formData });
  if (!res.ok) {
    throw new Error((await res.text()) || "Upload failed.");
  }
  return res.json();
}
