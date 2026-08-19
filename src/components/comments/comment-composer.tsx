"use client";

import { useRef, useState, useTransition } from "react";
import { Paperclip, Send, X, Loader2, AlertCircle } from "lucide-react";
import { initials } from "@/components/comments/comment-utils";
import { validateAttachmentFile, formatBytes, ATTACHMENT_RULES } from "@/lib/validation/attachments";
import { uploadAttachment } from "@/lib/utils/upload-attachment";
import { cn } from "@/lib/utils";
import type { CommentAttachmentInput } from "@/app/bugs/[id]/comment-actions";

type Tester = { id: string; name: string; role: string };

export function CommentComposer({
  placeholder = "Write a comment...",
  testers,
  initialBody = "",
  submitLabel,
  onSubmit,
  onCancel,
  autoFocus,
}: {
  placeholder?: string;
  testers: Tester[];
  initialBody?: string;
  submitLabel: string;
  onSubmit: (data: { body: string; mentionIds: string[]; attachments: CommentAttachmentInput[] }) => Promise<void>;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const [body, setBody] = useState(initialBody);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionedIds, setMentionedIds] = useState<Set<string>>(new Set());
  const [attachments, setAttachments] = useState<CommentAttachmentInput[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setBody(value);
    const cursor = e.target.selectionStart;
    const match = value.slice(0, cursor).match(/(?:^|\s)@(\w*)$/);
    setMentionQuery(match ? match[1] : null);
  }

  function insertMention(tester: Tester) {
    const cursor = textareaRef.current?.selectionStart ?? body.length;
    const before = body.slice(0, cursor).replace(/@(\w*)$/, `@${tester.name} `);
    const newBody = before + body.slice(cursor);
    setBody(newBody);
    setMentionedIds((prev) => new Set(prev).add(tester.id));
    setMentionQuery(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

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
      const uploaded = await uploadAttachment(file, "comment");
      setAttachments((prev) => [
        ...prev,
        { type: uploaded.kind, url: uploaded.url, fileName: uploaded.fileName, fileSizeBytes: uploaded.fileSizeBytes },
      ]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit() {
    if (!body.trim() || isPending) return;
    startTransition(async () => {
      await onSubmit({ body, mentionIds: [...mentionedIds], attachments });
      setBody("");
      setMentionedIds(new Set());
      setAttachments([]);
    });
  }

  const filteredTesters =
    mentionQuery !== null
      ? testers.filter((t) => t.name.toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5)
      : [];

  return (
    <div>
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={handleChange}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          rows={3}
          className="w-full resize-none rounded-lg border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] p-3 text-sm text-[color:var(--bf-ink-primary)] outline-none placeholder:text-[color:var(--bf-ink-muted)] focus:border-[color:var(--bf-border-strong)]"
        />

        {mentionQuery !== null && filteredTesters.length > 0 && (
          <div className="absolute left-0 top-full z-10 mt-1 w-56 overflow-hidden rounded-lg border border-[color:var(--bf-border-strong)] bg-[color:var(--bf-surface-raised)] shadow-lg shadow-black/30">
            {filteredTesters.map((t) => (
              <button
                key={t.id}
                onClick={() => insertMention(t)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[color:var(--bf-ink-primary)] hover:bg-[color:var(--bf-surface)]"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--bf-brand-soft)] text-[10px] font-semibold text-[color:var(--bf-brand)]">
                  {initials(t.name)}
                </span>
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {attachments.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
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
                onClick={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
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
        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[color:var(--bf-status-critical)]">
          <AlertCircle size={12} />
          {uploadError}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title={`Attach a file (${Object.values(ATTACHMENT_RULES).map((r) => r.label.toLowerCase()).join(", ")})`}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[color:var(--bf-ink-muted)] hover:bg-[color:var(--bf-surface)] hover:text-[color:var(--bf-ink-primary)] disabled:opacity-50"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
          </button>
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFile} />
          <span className="hidden text-[11px] text-[color:var(--bf-ink-muted)] sm:inline">
            {uploading ? "Uploading…" : "Type @ to mention someone"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-[12px] text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-ink-primary)]"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={isPending || uploading || !body.trim()}
            className={cn(
              "flex items-center gap-1.5 rounded-md bg-[color:var(--bf-brand)] px-3 py-1.5 text-[12px] font-medium text-black hover:opacity-90",
              (isPending || uploading || !body.trim()) && "cursor-not-allowed opacity-50 hover:opacity-50"
            )}
          >
            <Send size={12} />
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
