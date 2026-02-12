import { useMemo } from "react";
import { Link } from "wouter";
import { useBurnoutRadar, useUsersList } from "@/hooks/use-pulse-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Flame, Eye, Users, AlertTriangle } from "lucide-react";

function getManagerName(email: string, usersData: any[]) {
  const mgr = usersData.find((u: any) => u.email === email);
  if (mgr && mgr.firstName && mgr.lastName) return `${mgr.firstName} ${mgr.lastName}`;
  if (mgr && mgr.firstName) return mgr.firstName;
  return email?.split("@")[0] || "Unknown";
}

export default function BurnoutAlerts() {
  const { data: burnoutData, isLoading: burnoutLoading } = useBurnoutRadar();
  const { data: usersData, isLoading: usersLoading } = useUsersList();

  const allUsersArr = (usersData as any[]) || [];
  const isLoading = burnoutLoading || usersLoading;

  const burnoutCount = burnoutData?.length ?? 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500" data-testid="burnout-alerts-page">
      <header>
        <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">Burnout Alerts</h1>
        <p className="text-muted-foreground mt-1">Employees with significant wellness score drops</p>
      </header>

      <Card data-testid="card-burnout-summary">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-md ${burnoutCount > 0 ? "bg-destructive/10" : "bg-muted"}`}>
              <Flame className={`w-6 h-6 ${burnoutCount > 0 ? "text-destructive" : "text-muted-foreground"}`} />
            </div>
            <div>
              {isLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <>
                  <p className={`text-3xl font-bold ${burnoutCount > 0 ? "text-destructive" : ""}`} data-testid="text-burnout-count">
                    {burnoutCount}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {burnoutCount === 1 ? "Employee at risk" : "Employees at risk"} of burnout
                  </p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            At-Risk Employees
          </CardTitle>
          <CardDescription>Employees with significant sentiment score drops requiring attention</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : burnoutCount === 0 ? (
            <div className="text-center py-8">
              <Users className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No employees are currently flagged for burnout risk.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {burnoutData?.map((risk: any) => (
                <div key={risk.userId} className="flex items-center gap-3 p-2 rounded-md" data-testid={`alert-burnout-${risk.userId}`}>
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs">
                      {risk.fullName?.split(" ").map((n: string) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{risk.fullName}</p>
                    <p className="text-xs text-muted-foreground">
                      {risk.department || "\u2014"}
                      {risk.managerEmail ? ` / ${getManagerName(risk.managerEmail, allUsersArr)}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={risk.riskLevel === "High" ? "destructive" : "secondary"} className="text-xs">
                      {risk.riskLevel}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{risk.dropPercentage}% drop</span>
                    <Link href={`/employee-progress/${risk.userId}`}>
                      <Button variant="ghost" size="icon" data-testid={`link-burnout-progress-${risk.userId}`}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}