import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useDepartmentTrends, useLeaderAccountability, useBurnoutRadar, useActionItemsForUser, useUsersList } from "@/hooks/use-pulse-data";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Building2, Users, Flame, ArrowRight, AlertTriangle,
  ClipboardCheck, ListTodo, CheckCircle2,
  Clock, TrendingDown, TrendingUp, Minus,
  ShieldCheck, Star, MessageSquare
} from "lucide-react";
import { Link } from "wouter";
import { format, subMonths } from "date-fns";

const currentPeriod = format(new Date(), "MMM-yyyy");

function getManagerName(email: string, usersData: any[]) {
  const mgr = usersData.find((u: any) => u.email === email);
  if (mgr && mgr.firstName && mgr.lastName) return `${mgr.firstName} ${mgr.lastName}`;
  if (mgr && mgr.firstName) return mgr.firstName;
  return email?.split("@")[0] || "Unknown";
}

function getManagerInitials(email: string, usersData: any[]) {
  const mgr = usersData.find((u: any) => u.email === email);
  if (mgr && mgr.firstName && mgr.lastName) return `${mgr.firstName[0]}${mgr.lastName[0]}`;
  return email?.charAt(0)?.toUpperCase() || "?";
}

function getSentimentColor(score: number) {
  if (score >= 7) return "text-green-600 dark:text-green-400";
  if (score >= 5) return "text-orange-500 dark:text-orange-400";
  return "text-destructive";
}

function generatePeriodOptions(): string[] {
  const options: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    options.push(format(subMonths(now, i), "MMM-yyyy"));
  }
  return options;
}

function getRatingColor(rating: number) {
  if (rating >= 4) return "text-green-600 dark:text-green-400";
  if (rating >= 3) return "text-orange-500 dark:text-orange-400";
  return "text-destructive";
}

function getRatingBadgeVariant(rating: number): "default" | "secondary" | "destructive" {
  if (rating >= 4) return "default";
  if (rating >= 3) return "secondary";
  return "destructive";
}

export default function SeniorMgmtOverview() {
  const { user } = useAuth();
  const { data: deptData, isLoading: deptLoading } = useDepartmentTrends(currentPeriod);
  const { data: leaderData, isLoading: leaderLoading } = useLeaderAccountability();
  const { data: burnoutData, isLoading: burnoutLoading } = useBurnoutRadar();
  const { data: reportees, isLoading: reporteesLoading } = useUsersList(undefined, user?.email || "");
  const { data: allActionItems, isLoading: actionsLoading } = useActionItemsForUser(user?.email ?? undefined);
  const { data: allUsers, isLoading: usersLoading } = useUsersList();

  const [mgrFeedbackPeriod, setMgrFeedbackPeriod] = useState("all");
  const [mgrFeedbackFilter, setMgrFeedbackFilter] = useState("all");
  const periodOptions = generatePeriodOptions();

  const { data: mgrFeedbackSummary, isLoading: summaryLoading } = useQuery<any[]>({
    queryKey: ["/api/manager-feedback/summary"],
    queryFn: async () => {
      const res = await fetch("/api/manager-feedback/summary", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch manager feedback summary");
      return res.json();
    },
  });

  const mgrFeedbackQueryParams = new URLSearchParams();
  if (mgrFeedbackPeriod !== "all") mgrFeedbackQueryParams.append("period", mgrFeedbackPeriod);
  if (mgrFeedbackFilter !== "all") mgrFeedbackQueryParams.append("managerEmail", mgrFeedbackFilter);
  const mgrFeedbackQs = mgrFeedbackQueryParams.toString() ? `?${mgrFeedbackQueryParams.toString()}` : "";

  const { data: mgrFeedbackList, isLoading: feedbackListLoading } = useQuery<any[]>({
    queryKey: ["/api/manager-feedback", mgrFeedbackPeriod, mgrFeedbackFilter],
    queryFn: async () => {
      const res = await fetch(`/api/manager-feedback${mgrFeedbackQs}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch manager feedback");
      return res.json();
    },
  });

  const isLoading = deptLoading || leaderLoading || burnoutLoading || reporteesLoading || actionsLoading || usersLoading;

  const allUsersArr = (allUsers as any[]) || [];

  const totalEmployees = useMemo(() =>
    allUsersArr.filter((u: any) => u.role === "EMPLOYEE").length, [allUsersArr]);

  const totalManagers = useMemo(() =>
    allUsersArr.filter((u: any) => u.role === "MANAGER").length, [allUsersArr]);

  const totalDepts = useMemo(() => {
    const depts = new Set(allUsersArr.map((u: any) => u.deptCode).filter(Boolean));
    return depts.size;
  }, [allUsersArr]);

  const totalProjects = useMemo(() => {
    const projects = new Set(allUsersArr.map((u: any) => u.projectCode).filter(Boolean));
    return projects.size;
  }, [allUsersArr]);

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
                {deptData.slice(0, 6).map((dept: any, idx: number) => {
                  const score = typeof dept.avgSatScore === "number" ? dept.avgSatScore : 0;
                  const trend = dept.trend;
                  return (
                    <div key={dept.deptCode || idx} className="flex items-center justify-between gap-3" data-testid={`row-dept-health-${dept.deptCode}`}>
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <span className="text-sm font-medium truncate block">{dept.deptCode || "General"}</span>
                          <span className="text-xs text-muted-foreground">{dept.employeeCount ?? 0} employees</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-sm font-semibold ${getSentimentColor(score)}`}>
                          {score.toFixed(1)}
                        </span>
                        <span className="text-xs text-muted-foreground">/10</span>
                        {trend != null && trend > 0.2 && (
                          <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 text-xs">
                            <TrendingUp className="w-3 h-3 mr-0.5" /> +{trend.toFixed(1)}
                          </Badge>
                        )}
                        {trend != null && trend < -0.2 && (
                          <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-xs">
                            <TrendingDown className="w-3 h-3 mr-0.5" /> {trend.toFixed(1)}
                          </Badge>
                        )}
                        {trend != null && Math.abs(trend) <= 0.2 && (
                          <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-xs">
                            <Minus className="w-3 h-3 mr-0.5" /> Stable
                          </Badge>
                        )}
                        {trend == null && (
                          <span className="text-xs text-muted-foreground">New</span>
                        )}
                      </div>
                    </div>
                  );
                })}
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
                        <AvatarFallback className="text-xs">{getManagerInitials(leader.managerEmail, allUsersArr)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <span className="text-sm font-medium truncate block">{getManagerName(leader.managerEmail, allUsersArr)}</span>
                        <span className="text-xs text-muted-foreground truncate block">{leader.managerEmail}</span>
                      </div>
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
                    <p className="text-xs text-muted-foreground">
                      {risk.department}
                      {risk.managerEmail ? ` / ${getManagerName(risk.managerEmail, allUsersArr)}` : ""}
                    </p>
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

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-display font-bold text-foreground" data-testid="text-mgr-feedback-title">
            Anonymous Manager Feedback
          </h2>
          <Badge variant="secondary">Confidential</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Employee-submitted anonymous feedback about their managers. Submitter identities are never revealed.
        </p>

        {summaryLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>)}
          </div>
        ) : mgrFeedbackSummary && mgrFeedbackSummary.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mgrFeedbackSummary.map((mgr: any, idx: number) => (
              <Card key={mgr.managerEmail || idx} className="border-border/50 overflow-visible cursor-pointer hover-elevate" onClick={() => setMgrFeedbackFilter(mgr.managerEmail)} data-testid={`card-mgr-summary-${idx}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="text-sm">{getManagerInitials(mgr.managerEmail, allUsersArr)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{mgr.managerName || mgr.managerEmail?.split("@")[0]}</p>
                      <p className="text-xs text-muted-foreground">{mgr.deptCode || "—"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-lg font-bold ${getRatingColor(mgr.avgRating)}`}>{mgr.avgRating}</p>
                      <p className="text-xs text-muted-foreground">{mgr.totalFeedback} reviews</p>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(mgr.avgRating / 5) * 100}%` }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-border/50">
            <CardContent className="py-8 text-center">
              <ShieldCheck className="w-10 h-10 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">No anonymous manager feedback has been submitted yet.</p>
            </CardContent>
          </Card>
        )}

        <Card data-testid="card-mgr-feedback-detail">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Feedback Details
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={mgrFeedbackFilter} onValueChange={setMgrFeedbackFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-mgr-filter">
                    <SelectValue placeholder="All Managers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Managers</SelectItem>
                    {mgrFeedbackSummary?.map((mgr: any) => (
                      <SelectItem key={mgr.managerEmail} value={mgr.managerEmail}>
                        {mgr.managerName || mgr.managerEmail?.split("@")[0]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={mgrFeedbackPeriod} onValueChange={setMgrFeedbackPeriod}>
                  <SelectTrigger className="w-[140px]" data-testid="select-mgr-period">
                    <SelectValue placeholder="All Periods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Periods</SelectItem>
                    {periodOptions.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {feedbackListLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : !mgrFeedbackList || mgrFeedbackList.length === 0 ? (
              <div className="text-center py-6">
                <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No feedback entries found for the selected filters.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mgrFeedbackList.map((entry: any, idx: number) => (
                  <div key={entry.id || idx} className="border border-border rounded-md p-4 space-y-2" data-testid={`row-mgr-feedback-${idx}`}>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-7 h-7">
                          <AvatarFallback className="text-xs">{getManagerInitials(entry.managerEmail, allUsersArr)}</AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{entry.managerName || entry.managerEmail?.split("@")[0]}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={getRatingBadgeVariant(entry.rating)}>
                          <Star className="w-3 h-3 mr-1" />
                          {entry.rating}/5
                        </Badge>
                        <Badge variant="outline" className="text-xs">{entry.submissionPeriod}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-foreground/80 pl-9">{entry.feedbackText}</p>
                    <p className="text-xs text-muted-foreground pl-9 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Anonymous submission
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
