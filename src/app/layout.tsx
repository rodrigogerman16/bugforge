import { Suspense } from "react";
import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/layout/sidebar";
import { ShellMobileNav } from "@/components/layout/shell-mobile-nav";
import { ShellUIProvider } from "@/components/layout/shell-ui-provider";
import { TopBar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { AiAssistantPanel } from "@/components/ai/ai-assistant-panel";
import { BugCreateModal } from "@/components/bugs/bug-create-modal";
import { GlobalKeyboardShortcuts } from "@/components/layout/global-keyboard-shortcuts";
import { KeyboardShortcutsModal } from "@/components/layout/keyboard-shortcuts-modal";
import { ToastStack } from "@/components/layout/toast-stack";
import { PageTransition } from "@/components/layout/page-transition";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { MobileNotificationsSheet } from "@/components/notifications/mobile-notifications-sheet";
import { getShellGames, getCurrentUser, getNotifications } from "@/lib/db";
import { isSupabaseAuthConfigured } from "@/lib/auth";
import { createClient as createSupabaseServerClient } from "@/lib/auth/supabase/server";
import { getAiProviderName, AI_PROVIDER_META } from "@/lib/ai/provider";
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
          <a
            href="#main-content"
            className="fixed left-2 top-2 z-[100] -translate-y-16 rounded-md bg-[color:var(--bf-brand)] px-3 py-2 text-[13px] font-medium text-black transition-transform focus:translate-y-0"
          >
            Skip to main content
          </a>
          <div className="flex h-dvh flex-col">
            <TopBar user={user} notifications={notifications} authConfigured={authConfigured} />
            <div className="flex min-h-0 flex-1">
              <Suspense fallback={null}>
                <Sidebar games={games} />
              </Suspense>
              <Suspense fallback={null}>
                <ShellMobileNav games={games} />
              </Suspense>
              <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto pb-16 md:pb-0">
                <PageTransition>{children}</PageTransition>
              </main>
            </div>
          </div>
          <Suspense fallback={null}>
            <CommandPalette games={games} />
          </Suspense>
          <AiAssistantPanel aiProviderTagline={AI_PROVIDER_META[getAiProviderName()].tagline} />
          <BugCreateModal />
          <Suspense fallback={null}>
            <GlobalKeyboardShortcuts />
          </Suspense>
          <KeyboardShortcutsModal />
          <ToastStack />
          <MobileBottomNav unreadCount={notifications.filter((n) => !n.read).length} />
          <MobileNotificationsSheet notifications={notifications} userId={user.id} />
        </ShellUIProvider>
      </body>
    </html>
  );
}
