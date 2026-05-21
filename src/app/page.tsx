import { auth, isAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LeaveDashboard } from "@/components/leave-dashboard";
import { UserMenu } from "@/components/user-menu";
import { AppIcon } from "@/components/app-icon";

export default async function Home() {
  const session = await auth();
  if (!session) redirect("/login");

  const admin = session.user?.email
    ? await isAdmin(session.user.email)
    : false;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex h-14 sm:h-16 items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <AppIcon size={32} />
              <div>
                <h1 className="text-base sm:text-lg font-semibold tracking-tight leading-none">
                  Leave Tracker
                </h1>
                <p className="text-[11px] sm:text-xs text-muted-foreground hidden sm:block mt-0.5">
                  Manage your balance, accruals, and time off
                </p>
              </div>
            </div>
            <UserMenu user={session.user} isAdmin={admin} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 sm:px-6 py-6 sm:py-8">
        <LeaveDashboard userName={session.user?.name ?? undefined} />
      </main>
      <footer className="border-t border-border/40 mt-16">
        <div className="mx-auto max-w-5xl px-6 py-5">
          <p className="text-[11px] text-muted-foreground/70 text-center">
            Your data is stored securely and accessible from any device.
          </p>
        </div>
      </footer>
    </div>
  );
}
