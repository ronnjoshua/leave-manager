import { auth, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LeaveDashboard } from "@/components/leave-dashboard";
import { UserMenu } from "@/components/user-menu";
import { TreePalm } from "lucide-react";

export default async function Home() {
  const session = await auth();
  if (!session) redirect("/login");

  const admin = session.user?.email
    ? await isAdmin(session.user.email)
    : false;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="flex items-center justify-center size-9 sm:size-10 rounded-xl bg-primary/10">
                <TreePalm className="size-4 sm:size-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-semibold tracking-tight">
                  Leave Tracker
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  Manage your balance, accruals, and time off
                </p>
              </div>
            </div>
            <UserMenu user={session.user} isAdmin={admin} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <LeaveDashboard />
      </main>
      <footer className="border-t mt-12">
        <div className="mx-auto max-w-5xl px-6 py-4">
          <p className="text-xs text-muted-foreground text-center">
            Your data is stored securely and accessible from any device.
          </p>
        </div>
      </footer>
    </div>
  );
}
