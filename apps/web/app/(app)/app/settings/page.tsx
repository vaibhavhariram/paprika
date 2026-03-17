"use client";

import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "@/components/theme-provider";
import { Sun, Moon, ExternalLink } from "lucide-react";

export default function SettingsPage() {
  const { user, isLoading, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg">Settings</h1>
        <Skeleton className="h-32 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-lg">Settings</h1>

      {/* Account */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h2 className="text-sm font-medium">Account</h2>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Email</span>
            <span>{user?.email ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Sign-in method</span>
            <span>{user?.app_metadata?.provider ?? "email"}</span>
          </div>
        </div>
        <Separator />
        <Button variant="outline" size="sm" onClick={signOut}>
          Sign out
        </Button>
      </div>

      {/* Appearance */}
      <div className="rounded-lg border bg-card p-4 space-y-4">
        <h2 className="text-sm font-medium">Appearance</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Theme</span>
          <Button variant="outline" size="sm" onClick={toggleTheme}>
            {theme === "dark" ? (
              <>
                <Moon className="mr-2 h-3.5 w-3.5" /> Dark
              </>
            ) : (
              <>
                <Sun className="mr-2 h-3.5 w-3.5" /> Light
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Resources */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h2 className="text-sm font-medium">Resources</h2>
        <div className="space-y-2 text-sm">
          <a
            href="/docs"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            Documentation
            <ExternalLink className="h-3 w-3" />
          </a>
          <a
            href="https://cal.com/vaibhavhariram/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            Book a demo
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
