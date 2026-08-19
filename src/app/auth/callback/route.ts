import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/auth/supabase/server";

// Every Supabase redirect lands here: an OAuth provider callback, or a
// password-recovery email link — both hand back a `code` that's exchanged
// for a real session, then the browser is sent on to `next` (defaults to
// "/", but the password-reset email sets it to "/reset-password").
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") || "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, request.url));
  }

  return NextResponse.redirect(new URL("/login?error=Missing%20auth%20code.", request.url));
}
