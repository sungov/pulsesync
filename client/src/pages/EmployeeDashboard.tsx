import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useFeedbackList, useActionItems } from "@/hooks/use-pulse-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subMonths, isAfter, parseISO } from "date-fns";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Briefcase,
  Smile,
  Scale,
  HeartHandshake,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ListTodo,
  BarChart3,
  User,
} from "lucide-react";
import type { Feedback } from "@shared/schema";

const MOOD_MAP: Record<string, number> = {
  "Burned Out": 1,
  "Challenged": 2,
  "Neutral": 3,
  "Good": 4,
  "Great": 5,
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
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="w-3 h-3" /> Stable
      </span>
    );
  }

  if (diff > 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-600">
        <TrendingUp className="w-3 h-3" /> +{pct}%
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-xs text-rose-600">
      <TrendingDown className="w-3 h-3" /> {pct}%
    </span>
  );
}

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [periodMonths, setPeriodMonths] = useState("6");

  const { data: allFeedback, isLoading: feedbackLoading } = useFeedbackList(user?.id);
  const { data: actionItems, isLoading: actionsLoading } = useActionItems(user?.email ?? undefined);

  const filteredFeedback = useMemo(() => {
    if (!allFeedback) return [];
    if (periodMonths === "all") return [...allFeedback].reverse();

    const cutoff = subMonths(new Date(), parseInt(periodMonths));
    return [...allFeedback]
      .filter((f: Feedback) => f.createdAt && isAfter(new Date(f.createdAt), cutoff))
      .reverse();
  }, [allFeedback, periodMonths]);

  const chartData = useMemo(() => {
    return filteredFeedback.map((f: Feedback) => ({
      period: f.submissionPeriod,
      date: f.createdAt ? format(new Date(f.createdAt), "MMM d") : f.submissionPeriod,
      satisfaction: f.satScore,
      mood: MOOD_MAP[f.moodScore] || 3,
      moodLabel: f.moodScore,
      workload: f.workloadLevel,
      balance: f.workLifeBalance,
      sentiment: f.aiSentiment ? Math.round(f.aiSentiment * 100) : null,
    }));
  }, [filteredFeedback]);

  const latest = filteredFeedback.length > 0 ? filteredFeedback[filteredFeedback.length - 1] : null;
  const previous = filteredFeedback.length > 1 ? filteredFeedback[filteredFeedback.length - 2] : null;

  const relevantActions = useMemo(() => {
    if (!actionItems || !user?.email) return [];
    return actionItems.filter((item: any) => item.empEmail === user.email);
  }, [actionItems, user?.email]);

  const pendingActions = relevantActions.filter((a: any) => a.status === "Pending");
  const overdueActions = relevantActions.filter((a: any) => {
    return a.status === "Pending" && new Date(a.dueDate) < new Date();
  });

  const isLoading = feedbackLoading || actionsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-muted rounded-lg" />)}
        </div>
        <div className="h-64 bg-muted rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <header>
          <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-dashboard-greeting">
            Hello, {user?.firstName}
          </h1>
          <p className="text-muted-foreground mt-1">Your performance overview at a glance.</p>
        </header>

        <Select value={periodMonths} onValueChange={setPeriodMonths}>
          <SelectTrigger className="w-[180px]" data-testid="select-period">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredFeedback.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-lg font-medium text-foreground mb-1">No feedback yet</p>
            <p className="text-sm text-muted-foreground">Submit your first pulse check to see your performance dashboard.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card data-testid="card-stat-satisfaction">
              <CardContent className="pt-6 pb-4 px-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Briefcase className="w-4 h-4 text-primary" />
                  </div>
                  {previous && (
                    <TrendIndicator current={latest!.satScore} previous={previous.satScore} />
                  )}
                </div>
                <p className="text-2xl font-bold text-foreground">{latest?.satScore}/10</p>
                <p className="text-xs text-muted-foreground mt-1">Work Satisfaction</p>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-mood">
              <CardContent className="pt-6 pb-4 px-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <Smile className="w-4 h-4 text-amber-500" />
                  </div>
                  {previous && (
                    <TrendIndicator
                      current={MOOD_MAP[latest!.moodScore] || 3}
                      previous={MOOD_MAP[previous.moodScore] || 3}
                    />
                  )}
                </div>
                <p className="text-2xl font-bold text-foreground">{latest?.moodScore}</p>
                <p className="text-xs text-muted-foreground mt-1">Overall Mood</p>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-workload">
              <CardContent className="pt-6 pb-4 px-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-violet-500/10">
                    <Scale className="w-4 h-4 text-violet-500" />
                  </div>
                  {previous && (
                    <TrendIndicator current={latest!.workloadLevel} previous={previous.workloadLevel} />
                  )}
                </div>
                <p className="text-2xl font-bold text-foreground">{latest?.workloadLevel}/5</p>
                <p className="text-xs text-muted-foreground mt-1">Workload Level</p>
              </CardContent>
            </Card>

            <Card data-testid="card-stat-balance">
              <CardContent className="pt-6 pb-4 px-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-rose-500/10">
                    <HeartHandshake className="w-4 h-4 text-rose-500" />
                  </div>
                  {previous && (
                    <TrendIndicator current={latest!.workLifeBalance} previous={previous.workLifeBalance} />
                  )}
                </div>
                <p className="text-2xl font-bold text-foreground">{latest?.workLifeBalance}/5</p>
                <p className="text-xs text-muted-foreground mt-1">Work-Life Balance</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="chart-satisfaction-trend">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Satisfaction & AI Sentiment
                </CardTitle>
                <CardDescription>Your satisfaction score and AI-analyzed sentiment over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="satGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Area
                        type="monotone"
                        dataKey="satisfaction"
                        stroke="hsl(var(--primary))"
                        fill="url(#satGrad)"
                        strokeWidth={2}
                        name="Satisfaction"
                        dot={{ r: 3 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="sentiment"
                        stroke="hsl(var(--chart-2))"
                        fill="url(#sentGrad)"
                        strokeWidth={2}
                        name="AI Sentiment %"
                        dot={{ r: 3 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="chart-mood-balance">
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
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <YAxis domain={[1, 5]} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number, name: string) => {
                          if (name === "Mood") {
                            const labels = ["", "Burned Out", "Challenged", "Neutral", "Good", "Great"];
                            return [labels[value] || value, name];
                          }
                          return [value, name];
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Line
                        type="monotone"
                        dataKey="mood"
                        stroke="hsl(var(--chart-4))"
                        strokeWidth={2}
                        name="Mood"
                        dot={{ r: 4, fill: "hsl(var(--chart-4))" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="balance"
                        stroke="hsl(var(--chart-5))"
                        strokeWidth={2}
                        name="Balance"
                        dot={{ r: 4, fill: "hsl(var(--chart-5))" }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2" data-testid="chart-workload">
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
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                        formatter={(value: number) => {
                          const labels = ["", "Under-utilized", "Light", "Balanced", "Heavy", "Overwhelmed"];
                          return [`${labels[value]} (${value}/5)`, "Workload"];
                        }}
                      />
                      <Bar
                        dataKey="workload"
                        fill="hsl(var(--chart-3))"
                        radius={[4, 4, 0, 0]}
                        name="Workload"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card data-testid="card-action-items">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-primary" />
              Action Items from 1:1 Discussions
            </CardTitle>
            <div className="flex items-center gap-2">
              {overdueActions.length > 0 && (
                <Badge variant="destructive" data-testid="badge-overdue-count">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {overdueActions.length} overdue
                </Badge>
              )}
              {pendingActions.length > 0 && (
                <Badge variant="secondary" data-testid="badge-pending-count">
                  {pendingActions.length} pending
                </Badge>
              )}
            </div>
          </div>
          <CardDescription>Tasks from your manager discussions, for both you and your manager</CardDescription>
        </CardHeader>
        <CardContent>
          {relevantActions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No action items yet. They'll appear here after your 1:1 meetings.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {relevantActions.map((item: any) => {
                const isOverdue = item.status === "Pending" && new Date(item.dueDate) < new Date();
                const isForEmployee = item.assignedTo === "EMPLOYEE";
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card"
                    data-testid={`card-action-item-${item.id}`}
                  >
                    <div className="p-2 rounded-lg bg-muted/50 mt-0.5">
                      {isForEmployee ? (
                        <User className="w-4 h-4 text-primary" />
                      ) : (
                        <User className="w-4 h-4 text-violet-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge
                          variant={item.status === "Completed" ? "outline" : isOverdue ? "destructive" : "default"}
                        >
                          {isOverdue ? "Overdue" : item.status}
                        </Badge>
                        <Badge variant="secondary">
                          {isForEmployee ? "For You" : "For Manager"}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm text-foreground mt-2">{item.task}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Due {format(new Date(item.dueDate), "MMM d, yyyy")}
                        </span>
                        <span>Manager: {item.mgrEmail}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
