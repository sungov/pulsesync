import { useState, useMemo, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useFeedbackList, useActionItems, useCreateActionItem, useUpdateActionItem, useDeleteActionItem, useUsersList } from "@/hooks/use-pulse-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";
import { ArrowLeft, Plus, Trash2, CheckCircle2, Clock, AlertTriangle, ChevronDown, ChevronRight, Target, Brain, BarChart3, ListTodo } from "lucide-react";
import type { Feedback } from "@shared/schema";

const MOOD_MAP: Record<string, number> = {
  "Burned Out": 1,
  "Challenged": 2,
  "Neutral": 3,
  "Good": 4,
  "Great": 5,
};

function FeedbackHistoryItem({ fb }: { fb: Feedback }) {
  const [review, setReview] = useState<any>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch(`/api/reviews/${fb.id}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(setReview)
      .catch(() => {});
  }, [fb.id]);

  const sections = [
    {
      title: "Execution & Impact",
      fields: [
        { label: "Satisfaction Score", value: `${fb.satScore}/10`, comment: review?.mgrSatComment },
        { label: "Accomplishments", value: fb.accomplishments, comment: review?.mgrAccComment },
        { label: "Disappointments", value: fb.disappointments, comment: review?.mgrDisComment },
        { label: "Goal Progress", value: fb.goalProgress, comment: review?.mgrGoalComment },
      ],
    },
    {
      title: "Well-being & Stability",
      fields: [
        { label: "Mood", value: fb.moodScore, comment: review?.mgrMoodComment },
        { label: "Workload Level", value: `${fb.workloadLevel}/5`, comment: review?.mgrWorkloadComment },
        { label: "Work-Life Balance", value: `${fb.workLifeBalance}/5`, comment: review?.mgrWlbComment },
        { label: "PTO Coverage", value: fb.ptoCoverage, comment: review?.mgrPtoComment },
      ],
    },
    {
      title: "Support & Growth",
      fields: [
        { label: "Blockers", value: fb.blockers, comment: review?.mgrBlockersComment },
        { label: "Mentoring Culture", value: fb.mentoringCulture, comment: review?.mgrMentoringComment },
        { label: "Support Needs", value: fb.supportNeeds, comment: review?.mgrSupportComment },
        { label: "Process Suggestions", value: fb.processSuggestions, comment: review?.mgrSuggestionsComment },
      ],
    },
  ];

  return (
    <Card data-testid={`card-feedback-history-${fb.id}`}>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        data-testid={`button-toggle-feedback-${fb.id}`}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            <div>
              <CardTitle className="text-base">{fb.submissionPeriod}</CardTitle>
              <CardDescription>
                {fb.createdAt ? format(new Date(fb.createdAt), "MMM d, yyyy") : ""}
                {fb.aiSentiment !== null && fb.aiSentiment !== undefined && (
                  <span className="ml-3">AI Sentiment: {Math.round(fb.aiSentiment * 100)}%</span>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{fb.moodScore}</Badge>
            <Badge variant="secondary">Sat: {fb.satScore}/10</Badge>
            {review && <Badge variant="default">Reviewed</Badge>}
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-6" data-testid={`content-feedback-${fb.id}`}>
          {fb.aiSummary && (
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-xs font-medium text-muted-foreground mb-1">AI Summary</p>
              <p className="text-sm text-foreground">{fb.aiSummary}</p>
            </div>
          )}
          {sections.map((section) => (
            <div key={section.title}>
              <h4 className="text-sm font-semibold text-foreground mb-3">{section.title}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.fields.map((field) => (
                  <div key={field.label} className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
                    <p className="text-sm text-foreground">{field.value || "N/A"}</p>
                    {field.comment && (
                      <div className="mt-1 pl-3 border-l-2 border-primary/30">
                        <p className="text-xs text-muted-foreground">Manager Comment:</p>
                        <p className="text-sm text-foreground/80">{field.comment}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

export default function EmployeeProgress() {
  const [match, params] = useRoute("/employee-progress/:userId");
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const userId = params?.userId;

  const { data: allUsers, isLoading: usersLoading } = useUsersList();
  const { data: allFeedback, isLoading: feedbackLoading } = useFeedbackList(userId);

  const employee = useMemo(() => {
    if (!allUsers || !userId) return null;
    return allUsers.find((u: any) => u.id === userId) || null;
  }, [allUsers, userId]);

  const empEmail = employee?.email || undefined;

  const { data: actionItemsData, isLoading: actionsLoading } = useActionItems(empEmail);
  const createActionItem = useCreateActionItem();
  const updateActionItem = useUpdateActionItem();
  const deleteActionItem = useDeleteActionItem();

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskContent, setTaskContent] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("EMPLOYEE");

  const sortedFeedback = useMemo(() => {
    if (!allFeedback) return [];
    return [...allFeedback].sort((a: Feedback, b: Feedback) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateA - dateB;
    });
  }, [allFeedback]);

  const reverseFeedback = useMemo(() => [...sortedFeedback].reverse(), [sortedFeedback]);

  const chartData = useMemo(() => {
    return sortedFeedback.map((f: Feedback) => ({
      period: f.submissionPeriod,
      satisfaction: f.satScore,
      mood: MOOD_MAP[f.moodScore] || 3,
    }));
  }, [sortedFeedback]);

  const latest = sortedFeedback.length > 0 ? sortedFeedback[sortedFeedback.length - 1] : null;

  const goalEntries = useMemo(() => {
    return reverseFeedback.filter((f: Feedback) => f.goalProgress).slice(0, 4);
  }, [reverseFeedback]);

  const actionItems = useMemo(() => {
    if (!actionItemsData || !empEmail) return [];
    return actionItemsData.filter((item: any) => item.empEmail === empEmail);
  }, [actionItemsData, empEmail]);

  const handleCreateTask = async () => {
    if (!taskContent || !dueDate || !currentUser?.email || !empEmail) return;
    await createActionItem.mutateAsync({
      empEmail,
      mgrEmail: currentUser.email,
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

  const handleToggleStatus = (item: any) => {
    updateActionItem.mutate({
      id: item.id,
      updates: { status: item.status === "Pending" ? "Completed" : "Pending" },
    });
  };

  const handleDelete = (id: number) => {
    deleteActionItem.mutate(id);
  };

  const isLoading = usersLoading || feedbackLoading || actionsLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse" data-testid="loading-skeleton">
        <div className="h-8 bg-muted rounded w-1/3" />
        <div className="h-6 bg-muted rounded w-1/4" />
        <div className="h-64 bg-muted rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-muted rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-20" data-testid="text-employee-not-found">
        <p className="text-lg font-medium text-foreground mb-2">Employee not found</p>
        <p className="text-muted-foreground mb-4">The requested employee could not be located.</p>
        <Button variant="outline" onClick={() => setLocation("/team-radar")} data-testid="button-back-team">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Team
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => window.history.back()} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-employee-name">
            {employee.firstName} {employee.lastName}
          </h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant="outline" data-testid="badge-department">{(employee as any).deptCode || "N/A"}</Badge>
            <Badge variant="secondary" data-testid="badge-role">{(employee as any).role}</Badge>
          </div>
        </div>
      </div>

      {sortedFeedback.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-lg font-medium text-foreground mb-1" data-testid="text-no-feedback">No feedback data</p>
            <p className="text-sm text-muted-foreground">This employee has not submitted any feedback yet.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card data-testid="chart-engagement-trajectory">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                Engagement Trajectory
              </CardTitle>
              <CardDescription>Satisfaction and mood scores over submission periods</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="satGradProg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="moodGradProg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === "Mood (1-5)") {
                          const labels = ["", "Burned Out", "Challenged", "Neutral", "Good", "Great"];
                          return [`${labels[value] || value} (${value})`, name];
                        }
                        return [value, name];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "12px" }} />
                    <Area
                      type="monotone"
                      dataKey="satisfaction"
                      stroke="hsl(var(--primary))"
                      fill="url(#satGradProg)"
                      strokeWidth={2}
                      name="Satisfaction (0-10)"
                      dot={{ r: 3 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="mood"
                      stroke="hsl(var(--chart-4))"
                      fill="url(#moodGradProg)"
                      strokeWidth={2}
                      name="Mood (1-5)"
                      dot={{ r: 3 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card data-testid="card-ai-pulse">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  AI Performance Pulse
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="text-center">
                    <p className="text-3xl font-bold text-foreground" data-testid="text-ai-sentiment">
                      {latest?.aiSentiment !== null && latest?.aiSentiment !== undefined
                        ? `${Math.round(latest.aiSentiment * 100)}%`
                        : "N/A"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">AI Sentiment</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-bold text-foreground" data-testid="text-submission-count">
                      {sortedFeedback.length}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Total Submissions</p>
                  </div>
                </div>
                {latest?.aiSummary && (
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Latest AI Summary</p>
                    <p className="text-sm text-foreground" data-testid="text-ai-summary">{latest.aiSummary}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card data-testid="card-goal-momentum">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" />
                  Quarterly Goal Momentum
                </CardTitle>
                <CardDescription>Recent goal progress entries</CardDescription>
              </CardHeader>
              <CardContent>
                {goalEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No goal progress entries yet.</p>
                ) : (
                  <div className="space-y-3">
                    {goalEntries.map((fb: Feedback) => (
                      <div key={fb.id} className="p-3 rounded-lg border border-border" data-testid={`card-goal-${fb.id}`}>
                        <p className="text-xs font-medium text-muted-foreground mb-1">{fb.submissionPeriod}</p>
                        <p className="text-sm text-foreground">{fb.goalProgress}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card data-testid="card-action-items-section">
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-primary" />
              Action Items
            </CardTitle>
            <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-action-item">
                  <Plus className="w-4 h-4 mr-2" /> Add Action Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Action Item</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Task Description</Label>
                    <Input
                      value={taskContent}
                      onChange={e => setTaskContent(e.target.value)}
                      placeholder="e.g. Complete compliance training"
                      data-testid="input-task-description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      data-testid="input-due-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Assigned To</Label>
                    <div className="flex gap-2">
                      <Button
                        variant={assignedTo === "EMPLOYEE" ? "default" : "outline"}
                        onClick={() => setAssignedTo("EMPLOYEE")}
                        data-testid="button-assign-employee"
                      >
                        Employee
                      </Button>
                      <Button
                        variant={assignedTo === "MANAGER" ? "default" : "outline"}
                        onClick={() => setAssignedTo("MANAGER")}
                        data-testid="button-assign-manager"
                      >
                        Manager
                      </Button>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleCreateTask}
                    disabled={createActionItem.isPending || !taskContent || !dueDate}
                    data-testid="button-submit-action-item"
                  >
                    {createActionItem.isPending ? "Creating..." : "Create Task"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <CardDescription>Tasks assigned during 1:1 discussions</CardDescription>
        </CardHeader>
        <CardContent>
          {actionItems.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No action items assigned to this employee.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {actionItems.map((item: any) => {
                const isOverdue = item.status === "Pending" && new Date(item.dueDate) < new Date();
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 p-4 rounded-lg border border-border"
                    data-testid={`card-action-item-${item.id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {isOverdue ? (
                          <Badge variant="destructive" data-testid={`badge-overdue-${item.id}`}>
                            <AlertTriangle className="w-3 h-3 mr-1" /> Overdue
                          </Badge>
                        ) : (
                          <Badge variant={item.status === "Completed" ? "outline" : "default"}>
                            {item.status}
                          </Badge>
                        )}
                        <Badge variant="secondary">
                          {item.assignedTo === "EMPLOYEE" ? "Employee" : "Manager"}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm text-foreground mt-2">{item.task}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Due {format(new Date(item.dueDate), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleStatus(item)}
                        disabled={updateActionItem.isPending}
                        data-testid={`button-toggle-status-${item.id}`}
                      >
                        <CheckCircle2 className={`w-4 h-4 ${item.status === "Completed" ? "text-emerald-500" : "text-muted-foreground"}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                        disabled={deleteActionItem.isPending}
                        data-testid={`button-delete-action-${item.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {sortedFeedback.length > 0 && (
        <section data-testid="section-performance-audit">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Holistic Performance Audit
          </h2>
          <div className="space-y-4">
            {reverseFeedback.map((fb: Feedback) => (
              <FeedbackHistoryItem key={fb.id} fb={fb} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
