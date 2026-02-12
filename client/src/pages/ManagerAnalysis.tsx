import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLeaderAccountability, useUsersList } from "@/hooks/use-pulse-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { format, subMonths } from "date-fns";
import { UserCheck, CheckCircle2, ShieldCheck, Star, MessageSquare } from "lucide-react";

function generatePeriodOptions(): string[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(now, i);
    return format(d, "MMM-yyyy");
  });
}

function getHealthStatus(overdueCount: number) {
  if (overdueCount === 0) return { label: "Healthy", variant: "default" as const, className: "bg-green-600 text-white no-default-hover-elevate no-default-active-elevate" };
  if (overdueCount <= 2) return { label: "At Risk", variant: "default" as const, className: "bg-orange-500 text-white no-default-hover-elevate no-default-active-elevate" };
  return { label: "Critical", variant: "destructive" as const, className: "" };
}

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

export default function ManagerAnalysis() {
  const { data: leaderData, isLoading: leaderLoading } = useLeaderAccountability();
  const { data: usersData, isLoading: usersLoading } = useUsersList();

  const [mgrFeedbackPeriod, setMgrFeedbackPeriod] = useState("all");
  const [mgrFeedbackFilter, setMgrFeedbackFilter] = useState("all");
  const periodOptions = useMemo(() => generatePeriodOptions(), []);

  const allUsersArr = (usersData as any[]) || [];

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

  const sortedLeaderData = useMemo(() =>
    leaderData
      ? [...leaderData].sort((a: any, b: any) => (b.overdueCount ?? 0) - (a.overdueCount ?? 0))
      : [],
    [leaderData]
  );

  const managerPerformance = useMemo(() => {
    if (!leaderData || !usersData) return [];
    return sortedLeaderData.map((leader: any) => {
      const reportees = allUsersArr.filter((u: any) => u.managerEmail === leader.managerEmail);
      return {
        ...leader,
        managerName: getManagerName(leader.managerEmail, allUsersArr),
        managerInitials: getManagerInitials(leader.managerEmail, allUsersArr),
        reporteeCount: reportees.length,
        completionRate: leader.totalTasks > 0
          ? Math.round(((leader.totalTasks - leader.pendingCount) / leader.totalTasks) * 100)
          : 0,
      };
    });
  }, [sortedLeaderData, usersData, allUsersArr]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500" data-testid="manager-analysis-page">
      <header>
        <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">Manager Insights</h1>
        <p className="text-muted-foreground mt-1">Manager performance metrics and anonymous employee feedback</p>
      </header>

      <section data-testid="section-manager-performance">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <UserCheck className="w-5 h-5" /> Manager Performance
        </h2>
        {leaderLoading || usersLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : managerPerformance.length === 0 ? (
          <Card><CardContent className="py-6 text-center text-muted-foreground"><CheckCircle2 className="w-10 h-10 mx-auto mb-3" /><p>No manager accountability data available.</p></CardContent></Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <Table data-testid="table-manager-performance">
                <TableHeader>
                  <TableRow>
                    <TableHead>Manager</TableHead>
                    <TableHead className="text-center">Reportees</TableHead>
                    <TableHead className="text-center">Total Tasks</TableHead>
                    <TableHead className="text-center">Completion</TableHead>
                    <TableHead className="text-center">Overdue</TableHead>
                    <TableHead className="text-center">Health</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managerPerformance.map((leader: any, idx: number) => {
                    const health = getHealthStatus(leader.overdueCount ?? 0);
                    return (
                      <TableRow key={leader.managerEmail || idx} data-testid={`row-mgr-perf-${idx}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-7 h-7">
                              <AvatarFallback className="text-xs">{leader.managerInitials}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <span className="font-medium truncate block" data-testid={`text-mgr-name-${idx}`}>
                                {leader.managerName}
                              </span>
                              <span className="text-xs text-muted-foreground truncate block">{leader.managerEmail}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{leader.reporteeCount}</TableCell>
                        <TableCell className="text-center">{leader.totalTasks ?? 0}</TableCell>
                        <TableCell className="text-center">
                          <span className={leader.completionRate < 50 ? "text-destructive font-semibold" : ""}>
                            {leader.completionRate}%
                          </span>
                        </TableCell>
                        <TableCell className="text-center">{leader.overdueCount ?? 0}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={health.variant} className={health.className} data-testid={`badge-mgr-health-${idx}`}>
                            {health.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </section>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground" data-testid="text-mgr-feedback-title">
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
                      <p className="text-xs text-muted-foreground">{mgr.deptCode || "\u2014"}</p>
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