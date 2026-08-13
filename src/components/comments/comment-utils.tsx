import type { ReactNode } from "react";

export const REACTION_EMOJIS = ["👍", "❤️", "😄", "🎉", "👀", "🚀"];

export const ROLE_LABEL: Record<string, string> = {
  QA_LEAD: "QA Lead",
  QA_ENGINEER: "QA Engineer",
  DEVELOPER: "Developer",
  PRODUCER: "Producer",
};

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Highlights "@Name" for every tester actually recorded as mentioned on this
// comment — never matches an arbitrary "@word" that isn't a real mention.
export function renderBodyWithMentions(body: string, mentions: { name: string }[]): ReactNode {
  if (mentions.length === 0) return body;

  const names = [...new Set(mentions.map((m) => m.name))].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`@(${names.map(escapeRegExp).join("|")})\\b`, "g");

  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(body))) {
    if (match.index > lastIndex) parts.push(body.slice(lastIndex, match.index));
    parts.push(
      <span
        key={key++}
        className="rounded bg-[color:var(--bf-brand-soft)] px-1 font-medium text-[color:var(--bf-brand)]"
      >
        @{match[1]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < body.length) parts.push(body.slice(lastIndex));
  return parts;
}

export function countComments(nodes: { replies: unknown[] }[]): number {
  let total = 0;
  for (const node of nodes) {
    total += 1;
    total += countComments(node.replies as { replies: unknown[] }[]);
  }
  return total;
}
