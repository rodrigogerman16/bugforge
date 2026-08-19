import type { NextRequest } from "next/server";
import { validateAttachmentFile } from "@/lib/validation/attachments";
import { getSupabaseAdmin, getAttachmentsBucket, SupabaseNotConfiguredError } from "@/lib/utils/supabase-storage";
import { assertCanComment, assertCanUploadEvidence, PermissionError } from "@/lib/auth/permissions";
import { uploadContextSchema } from "@/lib/validation";
import { logError } from "@/lib/utils/errors";

// The one real upload path in the app — the comment composer and the
// bug-evidence uploader both post here, never straight to Supabase from the
// client. That keeps the service-role key server-only and gives every
// upload the same server-side validation regardless of what the client
// already checked (a client-side check is a UX nicety, not a trust
// boundary — this route re-validates from scratch), including which
// capability applies: attaching a file to a comment only requires COMMENT,
// separately from the UPLOAD_EVIDENCE capability bug evidence needs.
export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  const contextResult = uploadContextSchema.safeParse(formData?.get("context"));
  if (!contextResult.success) {
    return new Response('Invalid or missing "context" — expected "comment" or "evidence".', { status: 400 });
  }
  const context = contextResult.data;

  try {
    if (context === "comment") await assertCanComment();
    else await assertCanUploadEvidence();
  } catch (err) {
    if (err instanceof PermissionError) return new Response(err.message, { status: 403 });
    throw err;
  }

  const file = formData?.get("file");
  if (!file || typeof file === "string") {
    return new Response("No file provided.", { status: 400 });
  }

  const validation = validateAttachmentFile({ name: file.name, size: file.size, type: file.type });
  if (!validation.ok) {
    return new Response(validation.error, { status: 400 });
  }
  const { kind } = validation;

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${kind.toLowerCase()}/${crypto.randomUUID()}-${safeName}`;

  let publicUrl: string;
  try {
    const supabase = getSupabaseAdmin();
    const bucket = getAttachmentsBucket();
    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, { contentType: file.type || "application/octet-stream", upsert: false });
    if (error) throw error;
    publicUrl = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  } catch (err) {
    if (err instanceof SupabaseNotConfiguredError) {
      logError("upload", err, { context, fileName: file.name });
      return new Response(err.message, { status: 503 });
    }
    logError("upload", err, { context, fileName: file.name, fileSizeBytes: file.size });
    return new Response("Upload failed. Please try again.", { status: 502 });
  }

  // Logs and text files also get their decoded text returned inline, so
  // callers that preview file content (bug evidence) don't need a second
  // round trip to fetch it back from Storage.
  const content = kind === "LOG" || kind === "ATTACHMENT" ? buffer.toString("utf-8") : null;

  return Response.json({
    url: publicUrl,
    fileName: file.name,
    fileSizeBytes: file.size,
    kind,
    content,
  });
}
