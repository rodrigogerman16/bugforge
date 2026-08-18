"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { EvidenceType } from "@/generated/prisma/enums";

// The file itself is already in Supabase Storage by the time this runs (see
// /api/attachments/upload) — this just persists the small JSON result of
// that upload as a real Evidence row. Keeping the upload in a Route Handler
// and this action to metadata-only means the file's bytes never have to
// pass through a Server Action, which caps request bodies at 1MB by default.
export async function addEvidence({
  bugId,
  type,
  url,
  fileName,
  fileSizeBytes,
  content,
}: {
  bugId: string;
  type: EvidenceType;
  url: string;
  fileName: string;
  fileSizeBytes: number;
  content: string | null;
}) {
  await prisma.evidence.create({
    data: { bugId, type, url, fileName, fileSizeBytes, content },
  });
  revalidatePath(`/bugs/${bugId}`);
}
