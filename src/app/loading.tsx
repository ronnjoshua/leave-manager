import { AppIcon } from "@/components/app-icon";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <AppIcon size={56} />
          <div className="absolute -inset-2 rounded-2xl border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium">Leave Tracker</p>
          <p className="text-xs text-muted-foreground mt-0.5">Loading...</p>
        </div>
      </div>
    </div>
  );
}
