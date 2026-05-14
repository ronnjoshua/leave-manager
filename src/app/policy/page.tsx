import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AppIcon } from "@/components/app-icon";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function PolicyPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AppIcon size={36} />
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  Leave Policy
                </h1>
                <p className="text-sm text-muted-foreground">
                  Company leave rules and guidelines
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-4" />
              Dashboard
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Leave Accrual</CardTitle>
            <CardDescription>How leave days are earned</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Monthly accrual rate</span>
              <span className="font-medium">2.5 days/month</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Annual total</span>
              <span className="font-medium">30 days/year</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Accrual timing</span>
              <span className="font-medium">End of each month</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Half-day support</span>
              <span className="font-medium">Yes (0.5 day increments, AM/PM)</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Probationary Employees</CardTitle>
            <CardDescription>Rules for new hires</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Probation period</span>
              <span className="font-medium">6 months</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Started on or before 15th</span>
              <span className="font-medium">2.5 days for that month</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Started after 15th</span>
              <span className="font-medium">1.25 days for that month</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Auto-regularization</span>
              <span className="font-medium">After 6 months from start date</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Carry-over</CardTitle>
            <CardDescription>Unused leave from previous year</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Maximum carry-over</span>
              <span className="font-medium">5 days</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Expiry deadline</span>
              <span className="font-semibold text-destructive">March 31</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">After expiry</span>
              <span className="font-medium">Unused carry-over is forfeited</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Leave Types</CardTitle>
            <CardDescription>Available leave categories</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              { type: "Vacation", desc: "Personal time off, holidays, trips" },
              { type: "Sick", desc: "Illness, medical appointments" },
              { type: "Emergency", desc: "Urgent personal matters" },
              { type: "Personal", desc: "Personal errands, appointments" },
              { type: "Maternity/Paternity", desc: "Childcare leave" },
              { type: "Bereavement", desc: "Loss of a family member" },
            ].map((item, i, arr) => (
              <div key={item.type} className={`flex justify-between py-2 ${i < arr.length - 1 ? "border-b" : ""}`}>
                <span className="font-medium">{item.type}</span>
                <span className="text-muted-foreground">{item.desc}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Days</CardTitle>
            <CardDescription>How working days are counted</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Weekends</span>
              <span className="font-medium">Excluded (Saturday & Sunday)</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Philippine holidays</span>
              <span className="font-medium">Excluded automatically</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Holiday data source</span>
              <span className="font-medium">Nager.Date API (updated yearly)</span>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
