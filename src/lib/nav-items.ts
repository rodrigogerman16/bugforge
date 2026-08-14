import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Bug,
  ListChecks,
  Package,
  ClipboardList,
  TrendingUp,
  FileText,
  Users,
  Code2,
  Settings,
} from "lucide-react";

export type NavItem = {
  label: string;
  icon: LucideIcon;
  href: string;
  enabled: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", icon: LayoutDashboard, href: "/", enabled: true }],
  },
  {
    label: "Quality",
    items: [
      { label: "Bugs", icon: Bug, href: "/bugs", enabled: true },
      { label: "Test Cases", icon: ListChecks, href: "/test-cases", enabled: true },
      { label: "Builds", icon: Package, href: "/builds", enabled: true },
      { label: "Test Sessions", icon: ClipboardList, href: "/sessions", enabled: true },
    ],
  },
  {
    label: "Analytics",
    items: [
      { label: "Quality Metrics", icon: TrendingUp, href: "/metrics", enabled: false },
      { label: "Reports", icon: FileText, href: "/reports", enabled: false },
    ],
  },
  {
    label: "Team",
    items: [
      { label: "Testers", icon: Users, href: "/testers", enabled: true },
      { label: "Developers", icon: Code2, href: "/developers", enabled: false },
    ],
  },
];

export const NAV_FOOTER_ITEMS: NavItem[] = [
  { label: "Settings", icon: Settings, href: "/settings", enabled: false },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);
