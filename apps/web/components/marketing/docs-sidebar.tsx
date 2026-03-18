"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const docsNav = [
  {
    title: "Getting Started",
    items: [
      { title: "Overview", href: "/docs" },
      { title: "Quickstart", href: "/docs/quickstart" },
    ],
  },
  {
    title: "Core Concepts",
    items: [
      { title: "Runtime", href: "/docs/core-concepts/runtime" },
      { title: "Execution Records", href: "/docs/core-concepts/execution-records" },
      { title: "Policies", href: "/docs/core-concepts/policies" },
      { title: "Replay", href: "/docs/core-concepts/replay" },
    ],
  },
  {
    title: "Integration",
    items: [
      { title: "Integrations", href: "/docs/integrations" },
      { title: "CLI", href: "/docs/cli" },
      { title: "Configuration", href: "/docs/configuration" },
    ],
  },
];

export function DocsSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/docs") {
      return pathname === "/docs";
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="w-full">
      {docsNav.map((section, sectionIndex) => (
        <div
          key={section.title}
          className={cn("mb-6", sectionIndex < docsNav.length - 1 && "pb-6 border-b border-border/30")}
        >
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground/50 font-semibold mb-2 px-3">
            {section.title}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-1.5 text-sm rounded-md transition-all duration-150 border-l-2",
                    isActive(item.href)
                      ? "border-accent bg-accent/10 text-foreground font-medium"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30"
                  )}
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}
