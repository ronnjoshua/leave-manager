import { auth, isAdmin, isSuperAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminTabs } from "@/components/admin-tabs";
import { AppIcon } from "@/components/app-icon";
import Link from "next/link";

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!session.user?.email || !(await isAdmin(session.user.email))) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AppIcon size={36} />
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  Administration
                </h1>
                <p className="text-sm text-muted-foreground">
                  Manage team leave, departments, and access
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <AppIcon size={20} />
              Back to dashboard
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <AdminTabs isSuperAdmin={isSuperAdmin(session.user.email)} />
      </main>
    </div>
  );
}
