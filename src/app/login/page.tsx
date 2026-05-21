import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginButtons } from "@/components/login-buttons";
import { AppIcon } from "@/components/app-icon";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/");

  const { error } = await searchParams;
  const accessDenied = error === "AccessDenied";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -right-1/4 size-[600px] rounded-full bg-primary/[0.03] blur-3xl" />
        <div className="absolute -bottom-1/2 -left-1/4 size-[600px] rounded-full bg-primary/[0.05] blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm animate-scale-in">
        <Card className="border-border/50 shadow-xl shadow-primary/5">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4">
              <AppIcon size={64} />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">
              Leave Tracker
            </CardTitle>
            <CardDescription className="mt-1">
              Sign in to manage your leave balance
            </CardDescription>
            {accessDenied && (
              <div className="mt-3 rounded-lg bg-destructive/10 px-3 py-2">
                <p className="text-sm text-destructive font-medium">
                  Access denied. This app is restricted to authorized users only.
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent className="pt-2">
            <LoginButtons />
            <p className="text-[10px] text-muted-foreground/60 text-center mt-4">
              Your data is stored securely and never shared.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
