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
import { TreePalm } from "lucide-react";

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
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center size-12 rounded-xl bg-primary/10 mb-3">
            <TreePalm className="size-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Leave Tracker</CardTitle>
          <CardDescription>
            Sign in to manage your leave balance
          </CardDescription>
          {accessDenied && (
            <p className="text-sm text-destructive mt-2">
              Access denied. This app is restricted to authorized users only.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <LoginButtons />
        </CardContent>
      </Card>
    </div>
  );
}
