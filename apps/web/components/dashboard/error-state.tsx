"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = "Failed to load data", onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-error/10 p-3">
        <AlertCircle className="h-6 w-6 text-error" />
      </div>
      <h3 className="mt-4 text-sm font-medium">{message}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Make sure the Paprika backend is running.
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
