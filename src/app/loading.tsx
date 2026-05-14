import { TreePalm } from "lucide-react";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="flex items-center justify-center size-14 rounded-2xl bg-primary/10">
            <TreePalm className="size-7 text-primary" />
          </div>
          <div className="absolute -inset-2 rounded-3xl border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">Leave Tracker</p>
          <p className="text-xs text-muted-foreground mt-0.5">Loading...</p>
        </div>
      </div>
    </div>
  );
}
