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
      { title: "UI", href: "/docs/ui" },
    ],
  },
  {
    title: "Reference",
    items: [
      { title: "How Paprika Fits", href: "/docs/how-paprika-fits" },
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
      {docsNav.map((section) => (
        <div key={section.title} className="mb-8">
          <p className="text-xs uppercase tracking-widest text-muted-foreground/70 font-medium mb-3">
            {section.title}
          </p>
          <ul className="space-y-1">
            {section.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "block px-3 py-2 text-sm rounded-md transition-all duration-200",
                    isActive(item.href)
                      ? "bg-accent/20 text-accent border-l-2 border-accent pl-[10px]"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50 border-l-2 border-transparent"
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
