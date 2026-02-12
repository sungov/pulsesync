import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTeamFeedback, useBurnoutRadar, useActionItemsForUser, useUsersList } from "@/hooks/use-pulse-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star, AlertTriangle, ClipboardCheck, Users, Flame, ArrowRight,
  ListTodo, Circle, Loader2, Ban, CheckCircle2, Clock
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

const currentPeriod = format(new Date(), "MMM-yyyy");

export default function ManagerOverview() {
  const { user } = useAuth();
  const { data: teamMembers, isLoading: membersLoading } = useUsersList("EMPLOYEE", user?.email || "");
  const { data: teamFeedback, isLoading: feedbackLoading } = useTeamFeedback(user?.email || "", currentPeriod);
  const { data: burnoutData, isLoading: burnoutLoading } = useBurnoutRadar(user?.email || undefined);
  const { data: allActionItems, isLoading: actionsLoading } = useActionItemsForUser(user?.email ?? undefined);

  const isLoading = membersLoading || feedbackLoading || burnoutLoading || actionsLoading;

  const avgSatScore = teamFeedback?.length
    ? (teamFeedback.reduce((sum: number, f: any) => sum + (f.satScore || 0), 0) / teamFeedback.length).toFixed(1)
    : "—";

  const totalFeedback = teamFeedback?.length ?? 0;
  const reviewedCount = teamFeedback?.filter((f: any) => f.reviewed).length ?? 0;
  const pendingReviews = teamFeedback?.filter((f: any) => !f.reviewed) ?? [];

  const burnoutRisks = useMemo(() =>
    burnoutData?.filter((r: any) => r.dropPercentage > 30) ?? [], [burnoutData]);

  const actionStats = useMemo(() => {
    if (!allActionItems) return { overdue: 0, blocked: 0, pending: 0, inProgress: 0, completed: 0, total: 0, urgentItems: [] as any[] };
    const myItems = allActionItems.filter((a: any) => a.mgrEmail === user?.email);
    const overdue = myItems.filter((a: any) => a.status !== "Completed" && new Date(a.dueDate) < new Date());
    const blocked = myItems.filter((a: any) => a.status === "Blocked");
    return {
      overdue: overdue.length,
      blocked: blocked.length,
      pending: myItems.filter((a: any) => a.status === "Pending").length,
      inProgress: myItems.filter((a: any) => a.status === "In Progress").length,
      completed: myItems.filter((a: any) => a.status === "Completed").length,
      total: myItems.length,
      urgentItems: [...overdue, ...blocked].slice(0, 5),
    };
  }, [allActionItems, user?.email]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-manager-overview-title">
          Welcome back, {user?.firstName}
        </h1>
        <p className="text-muted-foreground mt-1" data-testid="text-overview-subtitle">
          Here's your team snapshot for {currentPeriod}
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-overview-team-size">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Team Size</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-2xl font-bold">{teamMembers?.length ?? 0}</div>
                <p className="text-xs text-muted-foreground">Direct reports</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-overview-satisfaction">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Satisfaction</CardTitle>
            <Star className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-2xl font-bold">{avgSatScore}</div>
                <p className="text-xs text-muted-foreground">Out of 10 this period</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-overview-reviews">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reviews Done</CardTitle>
            <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-2xl font-bold">{reviewedCount} / {totalFeedback}</div>
                <p className="text-xs text-muted-foreground">Feedback reviewed this period</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-overview-burnout">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Burnout Alerts</CardTitle>
            <Flame className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className={`text-2xl font-bold ${burnoutRisks.length > 0 ? "text-destructive" : ""}`}>
                  {burnoutRisks.length}
                </div>
                <p className="text-xs text-muted-foreground">Employees with &gt;30% drop</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-overview-action-summary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-primary" />
                Action Items
              </CardTitle>
              <Link href="/team-radar">
                <Button variant="ghost" size="sm" data-testid="link-view-all-actions">
                  View All <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-6 w-full" />)}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <Circle className="w-3 h-3 text-amber-500" />
                    <span className="text-sm text-muted-foreground">Pending</span>
                    <span className="text-sm font-semibold ml-auto">{actionStats.pending}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3 h-3 text-blue-500" />
                    <span className="text-sm text-muted-foreground">In Progress</span>
                    <span className="text-sm font-semibold ml-auto">{actionStats.inProgress}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Ban className="w-3 h-3 text-red-500" />
                    <span className="text-sm text-muted-foreground">Blocked</span>
                    <span className="text-sm font-semibold ml-auto">{actionStats.blocked}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    <span className="text-sm text-muted-foreground">Completed</span>
                    <span className="text-sm font-semibold ml-auto">{actionStats.completed}</span>
                  </div>
                </div>

                {(actionStats.overdue > 0 || actionStats.blocked > 0) && (
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {actionStats.overdue > 0 && (
                        <Badge variant="destructive" data-testid="badge-overview-overdue">
                          <AlertTriangle className="w-3 h-3 mr-1" /> {actionStats.overdue} overdue
                        </Badge>
                      )}
                      {actionStats.blocked > 0 && (
                        <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" data-testid="badge-overview-blocked">
                          {actionStats.blocked} blocked
                        </Badge>
                      )}
                    </div>
                    {actionStats.urgentItems.map((item: any) => {
                      const isOverdue = item.status !== "Completed" && new Date(item.dueDate) < new Date();
                      return (
                        <div key={item.id} className="flex items-center gap-2 text-sm" data-testid={`text-urgent-action-${item.id}`}>
                          {isOverdue ? (
                            <Clock className="w-3 h-3 text-destructive shrink-0" />
                          ) : (
                            <Ban className="w-3 h-3 text-red-500 shrink-0" />
                          )}
                          <span className="truncate flex-1">{item.task}</span>
                          <span className="text-xs text-muted-foreground shrink-0">{item.empEmail?.split("@")[0]}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {actionStats.total === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">No action items yet.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-overview-pending-reviews">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-primary" />
                Pending Reviews
              </CardTitle>
              <Link href="/team-radar">
                <Button variant="ghost" size="sm" data-testid="link-view-team-radar">
                  Team Radar <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : pendingReviews.length === 0 ? (
              <div className="text-center py-6" data-testid="text-no-pending-reviews">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500/40" />
                <p className="text-sm text-muted-foreground">All caught up! No pending reviews.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingReviews.slice(0, 5).map((fb: any) => {
                  const initials = fb.fullName?.split(" ").map((n: string) => n[0]).join("") || "?";
                  return (
                    <Link key={fb.id} href={`/review/${fb.id}`}>
                      <div className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer" data-testid={`link-pending-review-${fb.id}`}>
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{fb.fullName}</p>
                          <p className="text-xs text-muted-foreground">{fb.submissionPeriod}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </div>
                    </Link>
                  );
                })}
                {pendingReviews.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    +{pendingReviews.length - 5} more pending
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {burnoutRisks.length > 0 && (
        <Card data-testid="card-overview-burnout-alerts">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-base flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                Burnout Risk Alerts
              </CardTitle>
              <Link href="/team-radar">
                <Button variant="ghost" size="sm" data-testid="link-view-burnout-radar">
                  Full Radar <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {burnoutRisks.slice(0, 4).map((risk: any) => (
                <div key={risk.userId} className="flex items-center gap-3" data-testid={`alert-burnout-${risk.userId}`}>
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs">
                      {risk.fullName?.split(" ").map((n: string) => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{risk.fullName}</p>
                    <p className="text-xs text-muted-foreground">{risk.department}</p>
                  </div>
                  <Badge variant="destructive" data-testid={`badge-burnout-drop-${risk.userId}`}>
                    {risk.dropPercentage}% drop
                  </Badge>
                  <Link href={`/employee-progress/${risk.userId}`}>
                    <Button variant="ghost" size="icon" data-testid={`button-view-risk-${risk.userId}`}>
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
