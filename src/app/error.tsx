"use client";

import { Button } from "@/components/ui/button";
import { TreePalm, RefreshCw } from "lucide-react";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-6 text-center max-w-sm">
        <div className="flex items-center justify-center size-16 rounded-2xl bg-destructive/10">
          <TreePalm className="size-8 text-destructive" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Something went wrong
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            An unexpected error occurred. Please try again.
          </p>
        </div>
        <Button onClick={reset} className="gap-2">
          <RefreshCw className="size-4" />
          Try again
        </Button>
      </div>
    </div>
  );
}
