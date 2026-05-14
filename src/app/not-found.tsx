import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TreePalm, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-6 text-center max-w-sm">
        <div className="flex items-center justify-center size-16 rounded-2xl bg-primary/10">
          <TreePalm className="size-8 text-primary" />
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight">404</h1>
          <p className="text-lg text-muted-foreground mt-2">Page not found</p>
          <p className="text-sm text-muted-foreground mt-1">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        <Link href="/">
          <Button className="gap-2">
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
