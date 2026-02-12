import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTeamFeedback, useBurnoutRadar, useActionItemsForUser, useUsersList, useFeedbackList } from "@/hooks/use-pulse-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Star, AlertTriangle, ClipboardCheck, Users, Flame, ArrowRight,
  ListTodo, Circle, Loader2, Ban, CheckCircle2, Clock,
  TrendingUp, TrendingDown, Minus, Activity, Briefcase, Smile, Scale,
  HeartHandshake, User,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { Link } from "wouter";
import { format, subMonths, isAfter } from "date-fns";
import type { Feedback } from "@shared/schema";

const currentPeriod = format(new Date(), "MMM-yyyy");

const MOOD_MAP: Record<string, number> = {
  "Burned Out": 1, "Challenged": 2, "Neutral": 3, "Good": 4, "Great": 5,
};

const PERIOD_OPTIONS = [
  { value: "3", label: "Last 3 months" },
  { value: "6", label: "Last 6 months" },
  { value: "12", label: "Last 12 months" },
  { value: "all", label: "All time" },
];

function TrendIndicator({ current, previous }: { current: number; previous: number | null }) {
  if (previous === null) return null;
  const diff = current - previous;
  const pct = previous !== 0 ? Math.round((diff / previous) * 100) : 0;
  if (Math.abs(pct) < 3) {
    return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Minus className="w-3 h-3" /> Stable</span>;
  }
  if (diff > 0) {
    return <span className="flex items-center gap-1 text-xs text-emerald-600"><TrendingUp className="w-3 h-3" /> +{pct}%</span>;
  }
  return <span className="flex items-center gap-1 text-xs text-rose-600"><TrendingDown className="w-3 h-3" /> {pct}%</span>;
}

export default function ManagerOverview() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("team");
  const [periodMonths, setPeriodMonths] = useState("6");

  const { data: teamMembers, isLoading: membersLoading } = useUsersList("EMPLOYEE", user?.email || "");
  const { data: teamFeedback, isLoading: feedbackLoading } = useTeamFeedback(user?.email || "", currentPeriod);
  const { data: burnoutData, isLoading: burnoutLoading } = useBurnoutRadar(user?.email || undefined);
  const { data: allActionItems, isLoading: actionsLoading } = useActionItemsForUser(user?.email ?? undefined);
  const { data: myFeedback, isLoading: myFeedbackLoading } = useFeedbackList(user?.id);

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

  const filteredMyFeedback = useMemo(() => {
    if (!myFeedback) return [];
    if (periodMonths === "all") return [...myFeedback].reverse();
    const cutoff = subMonths(new Date(), parseInt(periodMonths));
    return [...myFeedback]
      .filter((f: Feedback) => f.createdAt && isAfter(new Date(f.createdAt), cutoff))
      .reverse();
  }, [myFeedback, periodMonths]);

  const myChartData = useMemo(() => {
    return filteredMyFeedback.map((f: Feedback) => ({
      period: f.submissionPeriod,
      date: f.createdAt ? format(new Date(f.createdAt), "MMM d") : f.submissionPeriod,
      satisfaction: f.satScore,
      mood: MOOD_MAP[f.moodScore] || 3,
      moodLabel: f.moodScore,
      workload: f.workloadLevel,
      balance: f.workLifeBalance,
      sentiment: f.aiSentiment ? parseFloat((f.aiSentiment * 10).toFixed(1)) : null,
    }));
  }, [filteredMyFeedback]);

  const myLatest = filteredMyFeedback.length > 0 ? filteredMyFeedback[filteredMyFeedback.length - 1] : null;
  const myPeriodStart = filteredMyFeedback.length > 1 ? filteredMyFeedback[0] : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-manager-overview-title">
          Welcome back, {user?.firstName}
        </h1>
        <p className="text-muted-foreground mt-1" data-testid="text-overview-subtitle">
          Here's your overview for {currentPeriod}
        </p>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList data-testid="tabs-manager-view">
          <TabsTrigger value="team" data-testid="tab-team-overview">
            <Users className="w-4 h-4 mr-1.5" /> Team Overview
          </TabsTrigger>
          <TabsTrigger value="personal" data-testid="tab-my-performance">
            <User className="w-4 h-4 mr-1.5" /> My Performance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="team" className="space-y-6 mt-6">
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
        </TabsContent>

        <TabsContent value="personal" className="space-y-6 mt-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-muted-foreground text-sm">Your personal performance trends as an employee.</p>
            <Select value={periodMonths} onValueChange={setPeriodMonths}>
              <SelectTrigger className="w-[180px]" data-testid="select-my-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {myFeedbackLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-muted rounded-lg" />)}
              </div>
              <div className="h-64 bg-muted rounded-lg" />
            </div>
          ) : filteredMyFeedback.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-lg font-medium text-foreground mb-1">No feedback submitted yet</p>
                <p className="text-sm text-muted-foreground mb-4">Submit your own pulse check to see your personal performance dashboard.</p>
                <Link href="/submit-feedback">
                  <Button data-testid="button-submit-first-feedback">Submit Feedback</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card data-testid="card-my-satisfaction">
                  <CardContent className="pt-6 pb-4 px-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Briefcase className="w-4 h-4 text-primary" />
                      </div>
                      {myPeriodStart && <TrendIndicator current={myLatest!.satScore} previous={myPeriodStart.satScore} />}
                    </div>
                    <p className="text-2xl font-bold text-foreground">{myLatest?.satScore}/10</p>
                    <p className="text-xs text-muted-foreground mt-1">Work Satisfaction</p>
                  </CardContent>
                </Card>

                <Card data-testid="card-my-mood">
                  <CardContent className="pt-6 pb-4 px-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg bg-amber-500/10">
                        <Smile className="w-4 h-4 text-amber-500" />
                      </div>
                      {myPeriodStart && <TrendIndicator current={MOOD_MAP[myLatest!.moodScore] || 3} previous={MOOD_MAP[myPeriodStart.moodScore] || 3} />}
                    </div>
                    <p className="text-2xl font-bold text-foreground">{myLatest?.moodScore}</p>
                    <p className="text-xs text-muted-foreground mt-1">Overall Mood</p>
                  </CardContent>
                </Card>

                <Card data-testid="card-my-workload">
                  <CardContent className="pt-6 pb-4 px-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg bg-violet-500/10">
                        <Scale className="w-4 h-4 text-violet-500" />
                      </div>
                      {myPeriodStart && <TrendIndicator current={myLatest!.workloadLevel} previous={myPeriodStart.workloadLevel} />}
                    </div>
                    <p className="text-2xl font-bold text-foreground">{myLatest?.workloadLevel}/5</p>
                    <p className="text-xs text-muted-foreground mt-1">Workload Level</p>
                  </CardContent>
                </Card>

                <Card data-testid="card-my-balance">
                  <CardContent className="pt-6 pb-4 px-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg bg-rose-500/10">
                        <HeartHandshake className="w-4 h-4 text-rose-500" />
                      </div>
                      {myPeriodStart && <TrendIndicator current={myLatest!.workLifeBalance} previous={myPeriodStart.workLifeBalance} />}
                    </div>
                    <p className="text-2xl font-bold text-foreground">{myLatest?.workLifeBalance}/5</p>
                    <p className="text-xs text-muted-foreground mt-1">Work-Life Balance</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card data-testid="chart-my-satisfaction-trend">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary" />
                      Satisfaction & Wellness Score
                    </CardTitle>
                    <CardDescription>Your satisfaction rating vs. AI-analyzed overall wellness</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={myChartData}>
                          <defs>
                            <linearGradient id="mgrSatGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="mgrSentGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                          <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                            formatter={(value: number, name: string) => [`${value}/10`, name]}
                          />
                          <Legend wrapperStyle={{ fontSize: "12px" }} />
                          <Area type="monotone" dataKey="satisfaction" stroke="hsl(var(--primary))" fill="url(#mgrSatGrad)" strokeWidth={2} name="Satisfaction" dot={{ r: 3 }} />
                          <Area type="monotone" dataKey="sentiment" stroke="hsl(var(--chart-2))" fill="url(#mgrSentGrad)" strokeWidth={2} name="Wellness Score" dot={{ r: 3 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card data-testid="chart-my-mood-balance">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Smile className="w-4 h-4 text-amber-500" />
                      Mood & Work-Life Balance
                    </CardTitle>
                    <CardDescription>Tracking your mood and balance trends</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={myChartData} barCategoryGap="20%">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                          <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} className="text-muted-foreground"
                            tickFormatter={(value: number) => {
                              const labels = ["", "1", "2", "3", "4", "5"];
                              return labels[value] || String(value);
                            }}
                          />
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                            formatter={(value: number, name: string) => {
                              if (name === "Mood") {
                                const labels = ["", "Burned Out", "Challenged", "Neutral", "Good", "Great"];
                                return [`${labels[value] || value} (${value}/5)`, name];
                              }
                              const balLabels = ["", "Poor", "Fair", "Okay", "Good", "Excellent"];
                              return [`${balLabels[value] || value} (${value}/5)`, name];
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: "12px" }} />
                          <Bar dataKey="mood" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} name="Mood" />
                          <Bar dataKey="balance" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} name="Balance" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2" data-testid="chart-my-workload">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Scale className="w-4 h-4 text-violet-500" />
                      Workload Over Time
                    </CardTitle>
                    <CardDescription>1 = Under-utilized, 3 = Balanced, 5 = Overwhelmed</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={myChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                          <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                            formatter={(value: number) => {
                              const labels = ["", "Under-utilized", "Light", "Balanced", "Heavy", "Overwhelmed"];
                              return [`${labels[value]} (${value}/5)`, "Workload"];
                            }}
                          />
                          <Bar dataKey="workload" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} name="Workload" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
