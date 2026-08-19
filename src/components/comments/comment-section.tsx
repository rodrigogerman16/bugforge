"use client";

import { CommentComposer } from "@/components/comments/comment-composer";
import { CommentItem } from "@/components/comments/comment-item";
import { countComments } from "@/components/comments/comment-utils";
import { createComment, type CommentAttachmentInput } from "@/app/bugs/[id]/comment-actions";
import type { CommentNode } from "@/lib/data";

type Tester = { id: string; name: string; role: string };

export function CommentSection({
  bugId,
  comments,
  testers,
  currentUserId,
  canComment,
}: {
  bugId: string;
  comments: CommentNode[];
  testers: Tester[];
  currentUserId: string;
  canComment: boolean;
}) {
  const total = countComments(comments);

  async function handleCreate(data: { body: string; mentionIds: string[]; attachments: CommentAttachmentInput[] }) {
    await createComment({ bugId, ...data });
  }

  return (
    <div>
      <h2 className="mb-3 text-[13px] font-semibold text-[color:var(--bf-ink-primary)]">
        Comments{total > 0 && <span className="text-[color:var(--bf-ink-muted)]"> ({total})</span>}
      </h2>

      {canComment && (
        <CommentComposer testers={testers} placeholder="Write a comment..." submitLabel="Comment" onSubmit={handleCreate} />
      )}

      {comments.length === 0 ? (
        <p className="mt-4 text-sm text-[color:var(--bf-ink-muted)]">No comments yet.</p>
      ) : (
        <div>
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              bugId={bugId}
              currentUserId={currentUserId}
              testers={testers}
              canComment={canComment}
            />
          ))}
        </div>
      )}
    </div>
  );
}
