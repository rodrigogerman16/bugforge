import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import { ShellMobileNav } from "@/components/shell-mobile-nav";
import { ShellUIProvider } from "@/components/shell-ui-provider";
import { TopBar } from "@/components/topbar";
import { CommandPalette } from "@/components/command-palette";
import { getShellGames, getCurrentUser } from "@/lib/data";
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
  const [games, user] = await Promise.all([getShellGames(), getCurrentUser()]);

  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ShellUIProvider>
          <div className="flex h-dvh flex-col">
            <TopBar user={user} />
            <div className="flex min-h-0 flex-1">
              <Sidebar games={games} />
              <ShellMobileNav games={games} />
              <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
            </div>
          </div>
          <CommandPalette games={games} />
        </ShellUIProvider>
      </body>
    </html>
  );
}
