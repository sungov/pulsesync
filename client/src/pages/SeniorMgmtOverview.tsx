import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useDepartmentAnalytics, useLeaderAccountability, useBurnoutRadar, useActionItemsForUser, useUsersList } from "@/hooks/use-pulse-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2, Users, Flame, ArrowRight, AlertTriangle,
  ClipboardCheck, ListTodo, CheckCircle2,
  Clock, TrendingDown
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

const currentPeriod = format(new Date(), "MMM-yyyy");

export default function SeniorMgmtOverview() {
  const { user } = useAuth();
  const { data: deptData, isLoading: deptLoading } = useDepartmentAnalytics();
  const { data: leaderData, isLoading: leaderLoading } = useLeaderAccountability();
  const { data: burnoutData, isLoading: burnoutLoading } = useBurnoutRadar();
  const { data: reportees, isLoading: reporteesLoading } = useUsersList(undefined, user?.email || "");
  const { data: allActionItems, isLoading: actionsLoading } = useActionItemsForUser(user?.email ?? undefined);
  const { data: allUsers, isLoading: usersLoading } = useUsersList();

  const isLoading = deptLoading || leaderLoading || burnoutLoading || reporteesLoading || actionsLoading || usersLoading;

  const totalEmployees = useMemo(() =>
    allUsers?.filter((u: any) => u.role === "EMPLOYEE").length ?? 0, [allUsers]);

  const totalManagers = useMemo(() =>
    allUsers?.filter((u: any) => u.role === "MANAGER").length ?? 0, [allUsers]);

  const totalDepts = useMemo(() => {
    if (!allUsers) return 0;
    const depts = new Set((allUsers as any[]).map((u: any) => u.deptCode).filter(Boolean));
    return depts.size;
  }, [allUsers]);

  const totalProjects = useMemo(() => {
    if (!allUsers) return 0;
    const projects = new Set((allUsers as any[]).map((u: any) => u.projectCode).filter(Boolean));
    return projects.size;
  }, [allUsers]);

  const orgAvgSat = useMemo(() => {
    if (!deptData || deptData.length === 0) return "—";
    const total = deptData.reduce((sum: number, d: any) => sum + (d.avgSatScore || 0), 0);
    return (total / deptData.length).toFixed(1);
  }, [deptData]);

  const managersAtRisk = useMemo(() => {
    if (!leaderData) return [];
    return leaderData
      .filter((l: any) => (l.overdueCount ?? 0) > 2)
      .sort((a: any, b: any) => (b.overdueCount ?? 0) - (a.overdueCount ?? 0));
  }, [leaderData]);

  const myActionStats = useMemo(() => {
    if (!allActionItems) return { pending: 0, overdue: 0, blocked: 0 };
    const myItems = allActionItems.filter((a: any) => a.mgrEmail === user?.email);
    return {
      pending: myItems.filter((a: any) => a.status === "Pending").length,
      overdue: myItems.filter((a: any) => a.status !== "Completed" && new Date(a.dueDate) < new Date()).length,
      blocked: myItems.filter((a: any) => a.status === "Blocked").length,
    };
  }, [allActionItems, user?.email]);

  const deptsNeedingHelp = useMemo(() => {
    if (!deptData) return [];
    return deptData
      .filter((d: any) => d.avgSatScore < 5)
      .sort((a: any, b: any) => (a.avgSatScore || 0) - (b.avgSatScore || 0));
  }, [deptData]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-sr-overview-title">
          Welcome back, {user?.firstName}
        </h1>
        <p className="text-muted-foreground mt-1" data-testid="text-sr-overview-subtitle">
          Organization overview for {currentPeriod}
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-sr-total-employees">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-2xl font-bold">{totalEmployees}</div>
                <p className="text-xs text-muted-foreground">{totalManagers} managers, {totalDepts} depts, {totalProjects} projects</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-sr-org-satisfaction">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Org Satisfaction</CardTitle>
            <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-2xl font-bold">{orgAvgSat}</div>
                <p className="text-xs text-muted-foreground">Avg across all departments</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-sr-burnout-alerts">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Burnout Alerts</CardTitle>
            <Flame className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className={`text-2xl font-bold ${(burnoutData?.length ?? 0) > 0 ? "text-destructive" : ""}`}>
                  {burnoutData?.length ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">Employees with sentiment drop</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-sr-my-actions">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Action Items</CardTitle>
            <ListTodo className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-2xl font-bold">{myActionStats.pending}</div>
                <div className="flex items-center gap-2 flex-wrap mt-1">
                  {myActionStats.overdue > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" /> {myActionStats.overdue} overdue
                    </Badge>
                  )}
                  {myActionStats.blocked > 0 && (
                    <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 text-xs">
                      {myActionStats.blocked} blocked
                    </Badge>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-sr-dept-health">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Department Health
              </CardTitle>
              <Link href="/executive">
                <Button variant="ghost" size="sm" data-testid="link-executive-hub">
                  Full Analytics <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : !deptData || deptData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No department data available.</p>
            ) : (
              <div className="space-y-3">
                {deptData.slice(0, 6).map((dept: any, idx: number) => (
                  <div key={dept.deptCode || idx} className="flex items-center justify-between gap-2" data-testid={`row-dept-health-${dept.deptCode}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">{dept.deptCode || "General"}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-sm font-semibold">{typeof dept.avgSatScore === "number" ? dept.avgSatScore.toFixed(1) : "—"}</span>
                      {dept.avgSatScore < 5 && (
                        <Badge variant="destructive" className="text-xs">
                          <TrendingDown className="w-3 h-3 mr-1" /> Low
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-sr-manager-watch">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Managers Needing Attention
              </CardTitle>
              <Link href="/executive">
                <Button variant="ghost" size="sm" data-testid="link-leader-audit">
                  Leader Audit <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : managersAtRisk.length === 0 ? (
              <div className="text-center py-4">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/40" />
                <p className="text-sm text-muted-foreground">All managers are on track.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {managersAtRisk.slice(0, 5).map((leader: any, idx: number) => (
                  <div key={leader.managerEmail || idx} className="flex items-center justify-between gap-2" data-testid={`row-manager-risk-${idx}`}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className="text-xs">{leader.managerEmail?.charAt(0)?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate">{leader.managerEmail?.split("@")[0]}</span>
                    </div>
                    <Badge variant="destructive" className="text-xs shrink-0">
                      {leader.overdueCount} overdue
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(reportees?.length ?? 0) > 0 && (
        <Card data-testid="card-sr-my-reportees">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                My Direct Reports ({reportees?.length ?? 0})
              </CardTitle>
              <Link href="/team-radar">
                <Button variant="ghost" size="sm" data-testid="link-team-radar-sr">
                  Team Radar <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {reportees?.slice(0, 9).map((emp: any) => (
                <Link key={emp.id} href={`/employee-progress/${emp.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-md hover-elevate cursor-pointer" data-testid={`link-reportee-${emp.id}`}>
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {(emp.firstName?.[0] || "")}{(emp.lastName?.[0] || "")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{emp.firstName} {emp.lastName}</p>
                      <p className="text-xs text-muted-foreground">{emp.deptCode || "—"}{emp.projectCode ? ` / ${emp.projectCode}` : ""}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(burnoutData?.length ?? 0) > 0 && (
        <Card data-testid="card-sr-burnout-list">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                Employees at Burnout Risk
              </CardTitle>
              <Link href="/executive">
                <Button variant="ghost" size="sm">
                  View Details <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {burnoutData?.slice(0, 6).map((risk: any) => (
                <div key={risk.userId} className="flex items-center gap-3" data-testid={`alert-sr-burnout-${risk.userId}`}>
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className="text-xs">
                      {risk.fullName?.split(" ").map((n: string) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{risk.fullName}</p>
                    <p className="text-xs text-muted-foreground">{risk.department} {risk.managerEmail ? `/ ${risk.managerEmail.split("@")[0]}` : ""}</p>
                  </div>
                  <Badge variant="destructive" className="text-xs shrink-0">
                    {risk.dropPercentage}% drop
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
