"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Sun, Moon, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/auth/user-menu";
import { useTheme } from "@/components/theme-provider";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  List,
  RotateCcw,
  Shield,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/app", label: "Overview", icon: LayoutDashboard },
  { href: "/app/runs", label: "Runs", icon: List },
  { href: "/app/replay", label: "Replay", icon: RotateCcw },
  { href: "/app/policies", label: "Policies", icon: Shield },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

const breadcrumbLabels: Record<string, string> = {
  "/app": "Overview",
  "/app/runs": "Runs",
  "/app/replay": "Replay",
  "/app/policies": "Policies",
  "/app/settings": "Settings",
};

export function AppTopbar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  // Determine breadcrumb
  const matchedPath = Object.keys(breadcrumbLabels)
    .sort((a, b) => b.length - a.length)
    .find((p) => pathname.startsWith(p));
  const breadcrumb = matchedPath ? breadcrumbLabels[matchedPath] : "Dashboard";

  // Run detail breadcrumb
  const isRunDetail = pathname.match(/^\/app\/runs\/(.+)$/);

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-lg lg:px-6">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-56 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <div className="flex h-14 items-center border-b border-border px-4">
            <Link href="/" className="flex items-center gap-2 tracking-tight">
              <Image src="/logo.svg" alt="" width={24} height={10} className="h-4 w-auto" />
              Paprika
            </Link>
          </div>
          <ScrollArea className="flex-1 py-2">
            <nav className="space-y-0.5 px-2">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/app"
                    ? pathname === "/app"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-muted-foreground">{breadcrumb}</span>
        {isRunDetail && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="font-mono text-xs">
              {isRunDetail[1].slice(0, 12)}...
            </span>
          </>
        )}
      </div>

      {/* Right side */}
      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
        <UserMenu />
      </div>
    </header>
  );
}
