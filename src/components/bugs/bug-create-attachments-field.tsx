import { useRef, useState } from "react";
import { Loader2, Paperclip, X } from "lucide-react";
import { labelClass } from "@/components/bugs/bug-create-form-shared";
import { validateAttachmentFile, formatBytes, ATTACHMENT_RULES } from "@/lib/validation/attachments";
import { uploadAttachment } from "@/lib/utils/upload-attachment";
import type { CreateBugEvidenceInput } from "@/app/bugs/actions";

// Owns its own upload-in-progress state (uploading/error) since that's
// purely transient UI feedback — but the attachment list itself is
// controlled by the parent, since it's needed at submit time alongside
// every other field.
export function BugCreateAttachmentsField({
  attachments,
  onAdd,
  onRemove,
}: {
  attachments: CreateBugEvidenceInput[];
  onAdd: (evidence: CreateBugEvidenceInput) => void;
  onRemove: (index: number) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const validation = validateAttachmentFile(file);
    if (!validation.ok) {
      setUploadError(validation.error);
      return;
    }
    setUploadError(null);
    setUploading(true);
    try {
      const uploaded = await uploadAttachment(file, "evidence");
      onAdd({
        type: uploaded.kind,
        url: uploaded.url,
        fileName: uploaded.fileName,
        fileSizeBytes: uploaded.fileSizeBytes,
        content: uploaded.content,
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className={labelClass} htmlFor="bug-attachments-input">Attachments</label>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title={`Add an attachment (${Object.values(ATTACHMENT_RULES).map((r) => r.label.toLowerCase()).join(", ")})`}
          className="flex items-center gap-1.5 rounded-md border border-[color:var(--bf-border)] px-2.5 py-1 text-[11px] text-[color:var(--bf-ink-secondary)] hover:border-[color:var(--bf-border-strong)] disabled:opacity-50"
        >
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}
          {uploading ? "Uploading…" : "Add Attachment"}
        </button>
        <input id="bug-attachments-input" ref={fileInputRef} type="file" className="hidden" onChange={handleFile} />
      </div>
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((a, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-2 py-1 text-[12px] text-[color:var(--bf-ink-secondary)]"
            >
              <Paperclip size={11} />
              {a.fileName}
              <span className="text-[color:var(--bf-ink-muted)]">
                · {a.type} · {formatBytes(a.fileSizeBytes)}
              </span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label="Remove attachment"
                className="text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-ink-primary)]"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      {uploadError && (
        <p className="mt-1.5 text-[11px] text-[color:var(--bf-status-critical)]">{uploadError}</p>
      )}
    </div>
  );
}
