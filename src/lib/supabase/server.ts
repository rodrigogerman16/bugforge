import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// A fresh Supabase client per request, backed by the Next.js cookie jar —
// for Server Components, Server Actions, and Route Handlers. Throws
// synchronously if NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
// aren't set; callers that run without checking isSupabaseAuthConfigured()
// first (i.e. real user-triggered auth actions, not the demo-mode fallback)
// should catch that and surface it as a normal form error.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component render, where cookies can't be
          // written — harmless as long as proxy.ts also refreshes the
          // session on every request.
        }
      },
    },
  });
}
