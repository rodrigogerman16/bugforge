import type { BugSeverity, BugStatus } from "@/generated/prisma/enums";
import type { DuplicateCandidateBug } from "@/lib/data";

// Token-overlap (Jaccard) similarity over title + description, restricted to
// the same game. No ML, no embeddings — just a real, explainable text-
// overlap score.

export type DuplicateCandidate = {
  id: string;
  number: number;
  title: string;
  status: BugStatus;
  severity: BugSeverity;
  similarityPercent: number;
};

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "of", "for", "with", "is", "are", "was",
  "were", "be", "been", "this", "that", "it", "its", "after", "when", "while", "during", "from", "into",
  "not", "no", "does", "doesnt", "cant", "cannot", "into", "than", "then", "if", "as", "by",
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const w of a) if (b.has(w)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const DUPLICATE_SIMILARITY_THRESHOLD = 0.12;
const DUPLICATE_RESULT_LIMIT = 5;

export function findDuplicateCandidates(
  target: { title: string; description: string },
  candidates: DuplicateCandidateBug[]
): DuplicateCandidate[] {
  // The title is repeated so it counts roughly twice as heavily as the
  // description in the overlap score — two bugs with the same title but
  // unrelated descriptions should still surface as likely duplicates.
  const targetTokens = tokenize(`${target.title} ${target.title} ${target.description}`);

  return candidates
    .map((c) => ({
      id: c.id,
      number: c.number,
      title: c.title,
      status: c.status,
      severity: c.severity,
      similarityPercent: Math.round(jaccardSimilarity(targetTokens, tokenize(`${c.title} ${c.title} ${c.description}`)) * 100),
    }))
    .filter((c) => c.similarityPercent >= DUPLICATE_SIMILARITY_THRESHOLD * 100)
    .sort((a, b) => b.similarityPercent - a.similarityPercent)
    .slice(0, DUPLICATE_RESULT_LIMIT);
}
