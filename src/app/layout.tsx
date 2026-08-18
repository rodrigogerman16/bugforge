import { Suspense } from "react";
import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import { ShellMobileNav } from "@/components/shell-mobile-nav";
import { ShellUIProvider } from "@/components/shell-ui-provider";
import { TopBar } from "@/components/topbar";
import { CommandPalette } from "@/components/command-palette";
import { AiAssistantPanel } from "@/components/ai/ai-assistant-panel";
import { getShellGames, getCurrentUser, getNotifications } from "@/lib/data";
import { isSupabaseAuthConfigured } from "@/lib/auth";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BugForge — Game QA Intelligence Platform",
  description: "Find bugs. Understand them. Ship better games.",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Auth pages (login/signup/forgot-password/reset-password) render without
  // the dashboard shell — proxy.ts already redirects anyone without a
  // session away from every other route, so reaching here unauthenticated
  // means we're on one of those pages. In demo mode (Supabase Auth not
  // configured yet), the shell always renders, same as before this feature
  // existed.
  const authConfigured = isSupabaseAuthConfigured();
  const hasSession = authConfigured
    ? Boolean((await (await createSupabaseServerClient()).auth.getUser()).data.user)
    : true;

  if (authConfigured && !hasSession) {
    return (
      <html lang="en" className={`${inter.variable} ${geistMono.variable} h-full antialiased`}>
        <body className="min-h-full">{children}</body>
      </html>
    );
  }

  const user = await getCurrentUser();
  const [games, notifications] = await Promise.all([getShellGames(), getNotifications(user.id)]);

  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ShellUIProvider>
          <div className="flex h-dvh flex-col">
            <TopBar user={user} notifications={notifications} authConfigured={authConfigured} />
            <div className="flex min-h-0 flex-1">
              <Suspense fallback={null}>
                <Sidebar games={games} />
              </Suspense>
              <Suspense fallback={null}>
                <ShellMobileNav games={games} />
              </Suspense>
              <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
            </div>
          </div>
          <Suspense fallback={null}>
            <CommandPalette games={games} />
          </Suspense>
          <AiAssistantPanel />
        </ShellUIProvider>
      </body>
    </html>
  );
}
