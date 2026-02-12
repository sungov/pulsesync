import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useFeedbackList, useActionItems, useCreateActionItem, useUpdateActionItem, useDeleteActionItem } from "@/hooks/use-pulse-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subMonths, isAfter, parseISO } from "date-fns";
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  TrendingUp, TrendingDown, Minus, Activity, Briefcase, Smile, Scale,
  HeartHandshake, Clock, CheckCircle2, AlertTriangle, ListTodo, BarChart3,
  User, FileText, Plus, Pencil, Circle, Loader2, Ban,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip as ShadTooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Feedback } from "@shared/schema";

const MOOD_BADGE_COLORS: Record<string, string> = {
  "Great": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Good": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  "Neutral": "bg-gray-100 text-gray-800 dark:bg-gray-800/40 dark:text-gray-300",
  "Challenged": "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  "Burned Out": "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

const STATUS_CONFIG: Record<string, { icon: typeof Circle; color: string; badgeClass: string }> = {
  "Pending": { icon: Circle, color: "text-amber-500", badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  "In Progress": { icon: Loader2, color: "text-blue-500", badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  "Blocked": { icon: Ban, color: "text-red-500", badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  "Completed": { icon: CheckCircle2, color: "text-emerald-500", badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
};

function FeedbackRow({ fb }: { fb: Feedback }) {
  const [reviewStatus, setReviewStatus] = useState<"loading" | "reviewed" | "pending">("loading");

  useEffect(() => {
    fetch(`/api/reviews/${fb.id}`, { credentials: "include" })
      .then(r => {
        setReviewStatus(r.ok ? "reviewed" : "pending");
      })
      .catch(() => setReviewStatus("pending"));
  }, [fb.id]);

  const satPct = (fb.satScore / 10) * 100;
  const satColor = fb.satScore >= 7 ? "bg-emerald-500" : fb.satScore >= 4 ? "bg-orange-500" : "bg-red-500";
  const moodClass = MOOD_BADGE_COLORS[fb.moodScore] || MOOD_BADGE_COLORS["Neutral"];
  const summaryText = fb.aiSummary || "No summary available";
  const truncatedSummary = summaryText.length > 100 ? summaryText.slice(0, 100) + "..." : summaryText;

  return (
    <TableRow data-testid={`row-submission-${fb.id}`}>
      <TableCell className="font-medium whitespace-nowrap">{fb.submissionPeriod}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 rounded-full bg-muted overflow-hidden">
            <div className={`h-full rounded-full ${satColor}`} style={{ width: `${satPct}%` }} />
          </div>
          <span className="text-xs text-muted-foreground">{fb.satScore}/10</span>
        </div>
      </TableCell>
      <TableCell>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${moodClass}`}>
          {fb.moodScore}
        </span>
      </TableCell>
      <TableCell className="max-w-[200px]">
        <ShadTooltip>
          <TooltipTrigger asChild>
            <span className="text-sm text-muted-foreground cursor-default truncate block">{truncatedSummary}</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="text-sm">{summaryText}</p>
          </TooltipContent>
        </ShadTooltip>
      </TableCell>
      <TableCell>
        {reviewStatus === "loading" ? (
          <span className="text-xs text-muted-foreground">...</span>
        ) : reviewStatus === "reviewed" ? (
          <Badge variant="outline" className="border-emerald-500 text-emerald-600 dark:text-emerald-400" data-testid={`badge-review-status-${fb.id}`}>
            Reviewed
          </Badge>
        ) : (
          <Badge variant="secondary" data-testid={`badge-review-status-${fb.id}`}>
            Pending
          </Badge>
        )}
      </TableCell>
    </TableRow>
  );
}

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
  const { data: actionItemsRaw, isLoading: actionsLoading } = useActionItems(user?.email ?? undefined);
  const createActionItem = useCreateActionItem();
  const updateActionItem = useUpdateActionItem();

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [taskContent, setTaskContent] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("EMPLOYEE");
  const [editTask, setEditTask] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

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
      sentiment: f.aiSentiment ? parseFloat((f.aiSentiment * 10).toFixed(1)) : null,
    }));
  }, [filteredFeedback]);

  const latest = filteredFeedback.length > 0 ? filteredFeedback[filteredFeedback.length - 1] : null;
  const previous = filteredFeedback.length > 1 ? filteredFeedback[filteredFeedback.length - 2] : null;

  const relevantActions = useMemo(() => {
    if (!actionItemsRaw || !user?.email) return [];
    return actionItemsRaw.filter((item: any) => item.empEmail === user.email);
  }, [actionItemsRaw, user?.email]);

  const displayedActions = useMemo(() => {
    if (statusFilter === "all") return relevantActions;
    return relevantActions.filter((a: any) => a.status === statusFilter);
  }, [relevantActions, statusFilter]);

  const pendingActions = relevantActions.filter((a: any) => a.status === "Pending");
  const inProgressActions = relevantActions.filter((a: any) => a.status === "In Progress");
  const blockedActions = relevantActions.filter((a: any) => a.status === "Blocked");
  const overdueActions = relevantActions.filter((a: any) => {
    return a.status !== "Completed" && new Date(a.dueDate) < new Date();
  });

  const managerEmail = (user as any)?.managerEmail;

  const handleCreateTask = async () => {
    if (!taskContent || !dueDate || !user?.email || !managerEmail) return;
    await createActionItem.mutateAsync({
      empEmail: user.email,
      mgrEmail: managerEmail,
      task: taskContent,
      dueDate: new Date(dueDate),
      status: "Pending",
      assignedTo,
    });
    setTaskDialogOpen(false);
    setTaskContent("");
    setDueDate("");
    setAssignedTo("EMPLOYEE");
  };

  const handleMarkComplete = (item: any) => {
    updateActionItem.mutate({
      id: item.id,
      updates: { status: "Completed" },
    });
  };

  const openEditDialog = (item: any) => {
    setEditItem(item);
    setEditTask(item.task);
    setEditDueDate(format(new Date(item.dueDate), "yyyy-MM-dd"));
    setEditStatus(item.status);
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editItem || !editTask || !editDueDate) return;
    await updateActionItem.mutateAsync({
      id: editItem.id,
      updates: { task: editTask, dueDate: new Date(editDueDate), status: editStatus },
    });
    setEditDialogOpen(false);
    setEditItem(null);
  };

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
                  {previous && <TrendIndicator current={latest!.satScore} previous={previous.satScore} />}
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
                  {previous && <TrendIndicator current={MOOD_MAP[latest!.moodScore] || 3} previous={MOOD_MAP[previous.moodScore] || 3} />}
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
                  {previous && <TrendIndicator current={latest!.workloadLevel} previous={previous.workloadLevel} />}
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
                  {previous && <TrendIndicator current={latest!.workLifeBalance} previous={previous.workLifeBalance} />}
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
                  Satisfaction & Wellness Score
                </CardTitle>
                <CardDescription>Your satisfaction rating vs. AI-analyzed overall wellness</CardDescription>
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
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                        formatter={(value: number, name: string) => {
                          if (name === "Wellness Score") return [`${value}/10`, name];
                          return [`${value}/10`, name];
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Area type="monotone" dataKey="satisfaction" stroke="hsl(var(--primary))" fill="url(#satGrad)" strokeWidth={2} name="Satisfaction" dot={{ r: 3 }} />
                      <Area type="monotone" dataKey="sentiment" stroke="hsl(var(--chart-2))" fill="url(#sentGrad)" strokeWidth={2} name="Wellness Score" dot={{ r: 3 }} />
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
                    <BarChart data={chartData} barCategoryGap="20%">
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

      <Card data-testid="card-action-items">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-primary" />
              My Action Items
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              {overdueActions.length > 0 && (
                <Badge variant="destructive" data-testid="badge-overdue-count">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {overdueActions.length} overdue
                </Badge>
              )}
              <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" disabled={!managerEmail} data-testid="button-create-action-item">
                    <Plus className="w-4 h-4 mr-1" /> New Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Action Item</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Task Description</Label>
                      <Input value={taskContent} onChange={e => setTaskContent(e.target.value)} placeholder="e.g. Complete certification course" data-testid="input-task-description" />
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} data-testid="input-due-date" />
                    </div>
                    <div className="space-y-2">
                      <Label>Assign To</Label>
                      <div className="flex gap-2">
                        <Button variant={assignedTo === "EMPLOYEE" ? "default" : "outline"} onClick={() => setAssignedTo("EMPLOYEE")} data-testid="button-assign-self">
                          Myself
                        </Button>
                        <Button variant={assignedTo === "MANAGER" ? "default" : "outline"} onClick={() => setAssignedTo("MANAGER")} data-testid="button-assign-manager">
                          My Manager
                        </Button>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={handleCreateTask} disabled={createActionItem.isPending || !taskContent || !dueDate} data-testid="button-submit-action-item">
                      {createActionItem.isPending ? "Creating..." : "Create Task"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <CardDescription>Track your tasks from 1:1 discussions and self-assigned items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {["all", "Pending", "In Progress", "Blocked", "Completed"].map(s => (
              <Button key={s} variant={statusFilter === s ? "default" : "outline"} size="sm" onClick={() => setStatusFilter(s)} data-testid={`button-filter-${s.toLowerCase().replace(/\s+/g, "-")}`}>
                {s === "all" ? "All" : s}
                {s !== "all" && (
                  <span className="ml-1 text-xs">({relevantActions.filter((a: any) => a.status === s).length})</span>
                )}
              </Button>
            ))}
          </div>

          {displayedActions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">{statusFilter === "all" ? "No action items yet. Create one or they'll appear after your 1:1 meetings." : `No ${statusFilter.toLowerCase()} items.`}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedActions.map((item: any) => {
                const isOverdue = item.status !== "Completed" && new Date(item.dueDate) < new Date();
                const isForEmployee = item.assignedTo === "EMPLOYEE";
                const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG["Pending"];
                const StatusIcon = cfg.icon;
                const isEditable = item.status !== "Completed";

                return (
                  <div key={item.id} className={`flex items-start gap-4 p-4 rounded-lg border border-border ${item.status === "Completed" ? "opacity-60" : ""}`} data-testid={`card-action-item-${item.id}`}>
                    <div className={`p-2 rounded-lg bg-muted/50 mt-0.5`}>
                      <StatusIcon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="secondary" className={`no-default-hover-elevate no-default-active-elevate ${isOverdue && item.status !== "Completed" ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" : cfg.badgeClass}`}>
                          {isOverdue && item.status !== "Completed" ? "Overdue" : item.status}
                        </Badge>
                        <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                          {isForEmployee ? "For You" : "For Manager"}
                        </Badge>
                      </div>
                      <p className={`font-medium text-sm text-foreground mt-2 ${item.status === "Completed" ? "line-through" : ""}`}>{item.task}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Due {format(new Date(item.dueDate), "MMM d, yyyy")}
                        </span>
                        <span>Manager: {item.mgrEmail}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isEditable && (
                        <>
                          <ShadTooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => handleMarkComplete(item)} disabled={updateActionItem.isPending} data-testid={`button-complete-${item.id}`}>
                                <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Mark Complete</TooltipContent>
                          </ShadTooltip>
                          <ShadTooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)} data-testid={`button-edit-${item.id}`}>
                                <Pencil className="w-4 h-4 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit</TooltipContent>
                          </ShadTooltip>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Action Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Task Description</Label>
              <Input value={editTask} onChange={e => setEditTask(e.target.value)} data-testid="input-edit-task" />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={editDueDate} onChange={e => setEditDueDate(e.target.value)} data-testid="input-edit-due-date" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger data-testid="select-edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="In Progress">In Progress</SelectItem>
                  <SelectItem value="Blocked">Blocked</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleEditSave} disabled={updateActionItem.isPending || !editTask || !editDueDate} data-testid="button-save-edit">
              {updateActionItem.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card data-testid="card-submissions-history">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Past Submissions History
          </CardTitle>
          <CardDescription>All your feedback submissions and their review status</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredFeedback.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No submissions yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table data-testid="table-submissions-history">
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Satisfaction</TableHead>
                    <TableHead>Mood</TableHead>
                    <TableHead>AI Summary</TableHead>
                    <TableHead>Review Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...filteredFeedback].reverse().map((fb: Feedback) => (
                    <FeedbackRow key={fb.id} fb={fb} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
