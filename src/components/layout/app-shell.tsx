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
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { canAccessRoute, roleLabels } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    id: "overview",
    label: "Überblick",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/planung", label: "Planung", icon: GanttChart },
      { href: "/berichte", label: "Berichte", icon: BarChart3 },
    ],
  },
  {
    id: "rental-demo",
    label: "Miete & Demo",
    items: [
      { href: "/produkte", label: "Produkte", icon: Package },
      { href: "/buchungen", label: "Buchungen", icon: BookOpen },
      { href: "/kunden", label: "Kunden", icon: Users },
      { href: "/ausgaben-rueckgaben", label: "Ausgaben & Rückgaben", icon: ArrowLeftRight },
    ],
  },
  {
    id: "fair",
    label: "Messe",
    items: [
      { href: "/messen-demos", label: "Messen", icon: Presentation },
    ],
  },
  {
    id: "service",
    label: "Service",
    items: [
      { href: "/schaeden", label: "Schäden", icon: AlertTriangle },
      { href: "/wartungen", label: "Wartungen", icon: Wrench },
      { href: "/standorte", label: "Standorte", icon: MapPin },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { href: "/benutzer", label: "Benutzer", icon: UserCog },
      { href: "/einstellungen", label: "Einstellungen", icon: Settings },
    ],
  },
];

const allNavItems = navGroups.flatMap((group) => group.items);

function resolveActiveHref(pathname: string) {
  return allNavItems
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const activeHref = resolveActiveHref(pathname);
  const pageTitle =
    allNavItems.find((item) => item.href === activeHref)?.label ?? "FLX Software";

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col bg-flx-navy text-white transition-all duration-300 print:hidden",
          collapsed ? "w-[72px]" : "w-64"
        )}
      >
        <div
          className={cn(
            "flex h-16 items-center border-b border-white/10",
            collapsed ? "justify-center px-2" : "gap-3 px-4"
          )}
        >
          <Link
            href="/dashboard"
            className={cn(
              "flex shrink-0 items-center rounded-md bg-white px-2 py-1.5",
              collapsed && "justify-center"
            )}
            title="Darda GmbH"
          >
            <Image
              src="/darda-logo.png"
              alt="Darda – Demolition Technology"
              width={collapsed ? 72 : 112}
              height={28}
              className={cn("w-auto object-contain", collapsed ? "h-5" : "h-6")}
              priority
            />
          </Link>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-bold tracking-wide">FLX Software</div>
              <div className="truncate text-[10px] text-white/55">Miet- und Demopark</div>
            </div>
          )}
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 scrollbar-thin">
          {navGroups.map((group) => {
            const visibleItems = group.items.filter((item) =>
              session?.user?.role ? canAccessRoute(session.user.role, item.href) : true
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.id}>
                {collapsed ? (
                  <div className="mx-auto mb-2 h-px w-6 bg-white/10" aria-hidden />
                ) : (
                  <p className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
                    {group.label}
                  </p>
                )}

                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const active = item.href === activeHref;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={item.label}
                        className={cn(
                          "group flex items-center rounded-lg text-sm transition-colors",
                          collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-2.5 py-2",
                          active
                            ? "bg-flx-blue text-white shadow-sm shadow-black/20"
                            : "text-white/65 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-[18px] w-[18px] shrink-0",
                            active ? "text-white" : "text-white/55 group-hover:text-white/90"
                          )}
                        />
                        {!collapsed && <span className="truncate font-medium">{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "flex w-full items-center rounded-lg p-2 text-white/55 transition-colors hover:bg-white/10 hover:text-white",
              collapsed ? "justify-center" : "justify-between px-2.5"
            )}
            aria-label={collapsed ? "Leiste ausklappen" : "Leiste einklappen"}
          >
            {!collapsed && <span className="text-xs font-medium">Leiste einklappen</span>}
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-300 print:ml-0",
          collapsed ? "ml-[72px]" : "ml-64"
        )}
      >
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 print:hidden">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-semibold text-flx-navy">{pageTitle}</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/benachrichtigungen"
              className="relative rounded-md p-2 text-gray-500 hover:bg-gray-100"
            >
              <Bell className="h-5 w-5" />
            </Link>
            {session?.user && (
              <div className="flex items-center gap-3">
                <div className="hidden text-right sm:block">
                  <div className="text-sm font-medium text-flx-navy">{session.user.name}</div>
                  <div className="text-xs text-gray-500">{roleLabels[session.user.role]}</div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-6 print:p-0">{children}</main>
      </div>
    </div>
  );
}
