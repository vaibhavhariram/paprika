"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Loader2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SubmitState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

function isValidEmail(email: string): boolean {
  const e = email.trim();
  if (e.length < 3 || e.length > 320) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export function WaitlistForm({
  source,
  compact,
}: {
  source?: string;
  compact?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SubmitState>({ kind: "idle" });

  const canSubmit = useMemo(() => {
    if (state.kind === "loading") return false;
    return isValidEmail(email);
  }, [email, state.kind]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setState({ kind: "error", message: "Enter a valid email address." });
      return;
    }

    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        message?: string;
      };
      if (!res.ok || !data.ok) {
        setState({
          kind: "error",
          message: data.message || "Something went wrong. Try again soon.",
        });
        return;
      }
      setState({ kind: "success", message: data.message || "You’re in. We’ll keep you posted." });
    } catch {
      setState({ kind: "error", message: "Network error. Try again soon." });
    }
  }

  if (state.kind === "success") {
    return (
      <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-md bg-success/15 text-success">
            <Mail className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium">You’re on the list.</p>
            <p className="mt-1 text-sm text-muted-foreground">{state.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-border bg-card p-4 sm:p-5"
    >
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Mail className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (state.kind === "error") setState({ kind: "idle" });
            }}
            className={`pl-9 ${compact ? "h-9" : "h-10"}`}
            aria-label="Email"
          />
        </div>
        <Button type="submit" disabled={!canSubmit} className={compact ? "h-9" : "h-10"}>
          {state.kind === "loading" ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Joining…
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              Join the waitlist
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-4">
        <p className="text-xs text-muted-foreground">
          No spam. Product updates and pilot access only.
        </p>
        {state.kind === "error" && (
          <p className="text-xs text-error">{state.message}</p>
        )}
      </div>
    </form>
  );
}

