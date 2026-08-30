"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Command,
  Search,
  Users,
  ClipboardCheck,
  Layers,
  Mail,
  BarChart3,
  ShieldOff,
  Settings,
  LogOut,
} from "lucide-react";
import { Wordmark } from "@/components/brand/wordmark";
import { cn } from "@/lib/utils";
import { logout } from "@/app/login/actions";

const NAV_ITEMS = [
  { href: "/", label: "Command Center", icon: Command },
  { href: "/discover", label: "Discover", icon: Search },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/review", label: "Review", icon: ClipboardCheck },
  { href: "/campaigns", label: "Campaigns", icon: Layers },
  { href: "/mailboxes", label: "Mailboxes", icon: Mail },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/suppression", label: "Suppression", icon: ShieldOff },
] as const;

function navItemClasses(active: boolean) {
  return cn(
    "flex items-center gap-3 border-l-2 px-4 py-2.5 text-sm font-medium transition-colors",
    active
      ? "border-gold bg-white/[0.06] text-white"
      : "border-transparent text-cream/55 hover:border-white/20 hover:bg-white/[0.04] hover:text-cream"
  );
}

export function SidebarNav({ onNavigate, logoSrc }: { onNavigate?: () => void; logoSrc?: string | null }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-purple-deep">
      <div className="px-6 py-8">
        <Wordmark tone="cream" logoSrc={logoSrc} />
      </div>
      <nav className="flex-1 space-y-0.5" aria-label="Primary">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={navItemClasses(active)}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 py-2">
        <Link
          href="/settings"
          onClick={onNavigate}
          aria-current={pathname === "/settings" ? "page" : undefined}
          className={navItemClasses(pathname === "/settings")}
        >
          <Settings className="h-4 w-4 shrink-0" aria-hidden />
          Settings
        </Link>
        <form action={logout}>
          <button type="submit" className={cn(navItemClasses(false), "w-full text-left")}>
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
