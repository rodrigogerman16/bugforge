"use client";

import { useState } from "react";
import { SmilePlus, Paperclip } from "lucide-react";
import { CommentComposer } from "@/components/comments/comment-composer";
import { REACTION_EMOJIS, ROLE_LABEL, initials, renderBodyWithMentions } from "@/components/comments/comment-utils";
import { ATTACHMENT_RULES, formatBytes } from "@/lib/validation/attachments";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import {
  createComment,
  updateComment,
  deleteComment,
  toggleReaction,
  type CommentAttachmentInput,
} from "@/app/bugs/[id]/comment-actions";
import { cn } from "@/lib/utils";
import type { CommentNode } from "@/lib/db";

type Tester = { id: string; name: string; role: string };

export function CommentItem({
  comment,
  bugId,
  currentUserId,
  testers,
  canComment,
  depth = 0,
}: {
  comment: CommentNode;
  bugId: string;
  currentUserId: string;
  testers: Tester[];
  canComment: boolean;
  depth?: number;
}) {
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const isMine = comment.author.id === currentUserId;

  async function handleReply(data: { body: string; mentionIds: string[]; attachments: CommentAttachmentInput[] }) {
    await createComment({ bugId, parentId: comment.id, ...data });
    setReplying(false);
  }

  async function handleEdit(data: { body: string }) {
    await updateComment({ id: comment.id, bugId, body: data.body });
    setEditing(false);
  }

  async function handleDelete() {
    const warning = comment.replies.length > 0 ? "Delete this comment and all its replies?" : "Delete this comment?";
    if (!window.confirm(warning)) return;
    await deleteComment({ id: comment.id, bugId });
  }

  async function handleReact(emoji: string) {
    setPickerOpen(false);
    await toggleReaction({ commentId: comment.id, bugId, emoji });
  }

  const grouped = new Map<string, typeof comment.reactions>();
  for (const r of comment.reactions) {
    grouped.set(r.emoji, [...(grouped.get(r.emoji) ?? []), r]);
  }

  return (
    <div
      id={`comment-${comment.id}`}
      className={cn(
        "scroll-mt-20",
        depth > 0
          ? "mt-4 border-l border-[color:var(--bf-border)] pl-4 sm:pl-5"
          : "mt-6 border-t border-[color:var(--bf-border)] pt-6 first:mt-0 first:border-t-0 first:pt-0"
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--bf-brand-soft)] text-[11px] font-semibold text-[color:var(--bf-brand)]">
          {initials(comment.author.name)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span className="text-[13px] font-semibold uppercase tracking-wide text-[color:var(--bf-ink-primary)]">
              {comment.author.name}
            </span>
            <span className="text-[11px] text-[color:var(--bf-ink-muted)]">— {ROLE_LABEL[comment.author.role] ?? comment.author.role}</span>
            <span className="text-[11px] text-[color:var(--bf-ink-muted)]">· {formatRelativeTime(comment.createdAt)}</span>
            {comment.editedAt && <span className="text-[11px] text-[color:var(--bf-ink-muted)]">(edited)</span>}
          </div>

          {editing ? (
            <div className="mt-2">
              <CommentComposer
                testers={testers}
                initialBody={comment.body}
                submitLabel="Save"
                onSubmit={handleEdit}
                onCancel={() => setEditing(false)}
                autoFocus
              />
            </div>
          ) : (
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--bf-ink-secondary)]">
              {renderBodyWithMentions(comment.body, comment.mentions)}
            </p>
          )}

          {comment.attachments.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {comment.attachments.map((a) =>
                a.type === "IMAGE" ? (
                  <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={a.url}
                      alt={a.fileName ?? "Attachment"}
                      className="h-24 w-24 rounded-lg border border-[color:var(--bf-border)] object-cover"
                    />
                    <span className="mt-0.5 block text-[10px] text-[color:var(--bf-ink-muted)]">
                      {ATTACHMENT_RULES.IMAGE.label} · {formatBytes(a.fileSizeBytes)}
                    </span>
                  </a>
                ) : (
                  <a
                    key={a.id}
                    href={a.url}
                    download={a.fileName ?? undefined}
                    className="flex items-center gap-1.5 rounded-md border border-[color:var(--bf-border)] bg-[color:var(--bf-surface)] px-2 py-1 text-[12px] text-[color:var(--bf-ink-secondary)] hover:border-[color:var(--bf-border-strong)]"
                  >
                    <Paperclip size={11} />
                    {a.fileName}
                    <span className="text-[color:var(--bf-ink-muted)]">
                      · {ATTACHMENT_RULES[a.type].label} · {formatBytes(a.fileSizeBytes)}
                    </span>
                  </a>
                )
              )}
            </div>
          )}

          {!editing && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {[...grouped.entries()].map(([emoji, reactions]) => {
                const mine = reactions.some((r) => r.testerId === currentUserId);
                return (
                  <button
                    key={emoji}
                    onClick={() => canComment && handleReact(emoji)}
                    disabled={!canComment}
                    title={reactions.map((r) => r.tester.name).join(", ")}
                    className={cn(
                      "flex items-center gap-1 rounded-full border px-2 py-0.5 text-[12px]",
                      mine
                        ? "border-[color:var(--bf-brand)] bg-[color:var(--bf-brand-soft)]"
                        : "border-[color:var(--bf-border)] text-[color:var(--bf-ink-secondary)] hover:border-[color:var(--bf-border-strong)]",
                      !canComment && "cursor-default opacity-70"
                    )}
                  >
                    <span>{emoji}</span>
                    <span>{reactions.length}</span>
                  </button>
                );
              })}

              {canComment && (
                <div className="relative">
                  <button
                    onClick={() => setPickerOpen((v) => !v)}
                    aria-label="Add reaction"
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[color:var(--bf-ink-muted)] hover:bg-[color:var(--bf-surface)] hover:text-[color:var(--bf-ink-primary)]"
                  >
                    <SmilePlus size={13} />
                  </button>
                  {pickerOpen && (
                    <div className="absolute left-0 top-full z-10 mt-1 flex gap-0.5 rounded-lg border border-[color:var(--bf-border-strong)] bg-[color:var(--bf-surface-raised)] p-1.5 shadow-lg shadow-black/30">
                      {REACTION_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReact(emoji)}
                          className="rounded p-1 text-base hover:bg-[color:var(--bf-surface)]"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {canComment && (
                <button
                  onClick={() => setReplying((v) => !v)}
                  className="text-[12px] text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-ink-primary)]"
                >
                  Reply
                </button>
              )}
              {isMine && (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="text-[12px] text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-ink-primary)]"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    className="text-[12px] text-[color:var(--bf-ink-muted)] hover:text-[color:var(--bf-status-critical)]"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          )}

          {replying && (
            <div className="mt-3">
              <CommentComposer
                testers={testers}
                placeholder={`Reply to ${comment.author.name}...`}
                submitLabel="Reply"
                onSubmit={handleReply}
                onCancel={() => setReplying(false)}
                autoFocus
              />
            </div>
          )}

          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              bugId={bugId}
              currentUserId={currentUserId}
              testers={testers}
              canComment={canComment}
              depth={depth + 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
