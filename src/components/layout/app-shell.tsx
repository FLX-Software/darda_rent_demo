"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  GanttChart,
  Package,
  BookOpen,
  Users,
  Presentation,
  ArrowLeftRight,
  AlertTriangle,
  MapPin,
  BarChart3,
  UserCog,
  Settings,
  Wrench,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canAccessRoute, roleLabels } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/planung", label: "Planung", icon: GanttChart },
  { href: "/produkte", label: "Produkte", icon: Package },
  { href: "/buchungen", label: "Buchungen", icon: BookOpen },
  { href: "/kunden", label: "Kunden", icon: Users },
  { href: "/messen-demos", label: "Messen & Demos", icon: Presentation },
  { href: "/ausgaben-rueckgaben", label: "Ausgaben & Rückgaben", icon: ArrowLeftRight },
  { href: "/schaeden", label: "Schäden", icon: AlertTriangle },
  { href: "/wartungen", label: "Wartungen", icon: Wrench },
  { href: "/standorte", label: "Standorte", icon: MapPin },
  { href: "/berichte", label: "Berichte", icon: BarChart3 },
  { href: "/benutzer", label: "Benutzer", icon: UserCog },
  { href: "/einstellungen", label: "Einstellungen", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col bg-flx-navy text-white transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex h-16 items-center gap-3 border-b border-white/10 px-4">
          <Link
            href="/dashboard"
            className={cn(
              "flex shrink-0 items-center rounded-md bg-white px-2 py-1.5",
              collapsed ? "justify-center" : ""
            )}
            title="Darda GmbH"
          >
            <Image
              src="/darda-logo.png"
              alt="Darda – Demolition Technology"
              width={collapsed ? 80 : 120}
              height={32}
              className={cn("w-auto object-contain", collapsed ? "h-5" : "h-7")}
              priority
            />
          </Link>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-bold tracking-wide">FLX Software</div>
              <div className="text-[10px] text-white/60">Miet- und Demopark</div>
            </div>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
          {navItems
            .filter((item) =>
              session?.user?.role ? canAccessRoute(session.user.role, item.href) : true
            )
            .map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-flx-blue text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex w-full items-center justify-center rounded-md p-2 text-white/60 hover:bg-white/10 hover:text-white"
          >
            {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>
        </div>
      </aside>

      <div className={cn("flex flex-1 flex-col transition-all duration-300", collapsed ? "ml-16" : "ml-64")}>
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-flx-navy">
              {navItems.find((i) => pathname.startsWith(i.href))?.label ?? "FLX Software"}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/benachrichtigungen" className="relative rounded-md p-2 text-gray-500 hover:bg-gray-100">
              <Bell className="h-5 w-5" />
            </Link>
            {session?.user && (
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-medium text-flx-navy">{session.user.name}</div>
                  <div className="text-xs text-gray-500">{roleLabels[session.user.role]}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: "/login" })}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
