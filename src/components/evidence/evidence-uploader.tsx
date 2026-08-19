"use client";

import { useRef, useState } from "react";
import { Paperclip, Loader2, AlertCircle } from "lucide-react";
import { validateAttachmentFile, ATTACHMENT_RULES } from "@/lib/attachments";
import { uploadAttachment } from "@/lib/upload-attachment";
import { addEvidence } from "@/app/bugs/[id]/evidence-actions";
import { useShellUI } from "@/components/shell-ui-provider";

export function EvidenceUploader({ bugId }: { bugId: string }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { pushToast } = useShellUI();

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const validation = validateAttachmentFile(file);
    if (!validation.ok) {
      setError(validation.error);
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const uploaded = await uploadAttachment(file, "evidence");
      await addEvidence({
        bugId,
        type: uploaded.kind,
        url: uploaded.url,
        fileName: uploaded.fileName,
        fileSizeBytes: uploaded.fileSizeBytes,
        content: uploaded.content,
      });
      pushToast("Evidence uploaded.", "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      setError(message);
      pushToast(message, "error");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        title={`Upload evidence (${Object.values(ATTACHMENT_RULES).map((r) => r.label.toLowerCase()).join(", ")})`}
        className="flex items-center gap-1.5 rounded-md border border-[color:var(--bf-border)] px-2.5 py-1 text-[12px] text-[color:var(--bf-ink-secondary)] hover:border-[color:var(--bf-border-strong)] hover:text-[color:var(--bf-ink-primary)] disabled:opacity-50"
      >
        {uploading ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}
        {uploading ? "Uploading…" : "Add Evidence"}
      </button>
      <input ref={fileInputRef} type="file" className="hidden" onChange={handleFile} />
      {error && (
        <span className="flex items-center gap-1 text-[11px] text-[color:var(--bf-status-critical)]">
          <AlertCircle size={11} />
          {error}
        </span>
      )}
    </div>
  );
}
