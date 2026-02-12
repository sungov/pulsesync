import { useAuth } from "@/hooks/use-auth";
import { useReviewByFeedback, useUpsertReview, useActionItems, useCreateActionItem, useUpdateActionItem, useDeleteActionItem } from "@/hooks/use-pulse-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Save, User, Briefcase, Calendar, ListTodo, Plus, Pencil, Trash2, CheckCircle2, Clock, Circle, Loader2, Ban, AlertTriangle } from "lucide-react";
import { Tooltip as ShadTooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { format } from "date-fns";
import type { Feedback, ManagerReview } from "@shared/schema";

const MOOD_COLORS: Record<string, string> = {
  "Great": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "Good": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "Neutral": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  "Challenged": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "Burned Out": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const STATUS_CONFIG: Record<string, { icon: typeof Circle; color: string; badgeClass: string }> = {
  "Pending": { icon: Circle, color: "text-amber-500", badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  "In Progress": { icon: Loader2, color: "text-blue-500", badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  "Blocked": { icon: Ban, color: "text-red-500", badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  "Completed": { icon: CheckCircle2, color: "text-emerald-500", badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
};

interface FieldConfig {
  feedbackKey: keyof Feedback;
  commentKey: keyof CommentState;
  label: string;
  formatValue?: (val: unknown) => string;
  isMood?: boolean;
}

type CommentState = {
  mgrSatComment: string;
  mgrMoodComment: string;
  mgrAccComment: string;
  mgrDisComment: string;
  mgrBlockersComment: string;
  mgrSupportComment: string;
  mgrWlbComment: string;
  mgrWorkloadComment: string;
  mgrMentoringComment: string;
  mgrSuggestionsComment: string;
  mgrPtoComment: string;
  mgrGoalComment: string;
};

const INITIAL_COMMENTS: CommentState = {
  mgrSatComment: "",
  mgrMoodComment: "",
  mgrAccComment: "",
  mgrDisComment: "",
  mgrBlockersComment: "",
  mgrSupportComment: "",
  mgrWlbComment: "",
  mgrWorkloadComment: "",
  mgrMentoringComment: "",
  mgrSuggestionsComment: "",
  mgrPtoComment: "",
  mgrGoalComment: "",
};

const SECTIONS: { title: string; fields: FieldConfig[] }[] = [
  {
    title: "Execution & Impact",
    fields: [
      { feedbackKey: "satScore", commentKey: "mgrSatComment", label: "Satisfaction Score", formatValue: (v) => `${v}/10` },
      { feedbackKey: "accomplishments", commentKey: "mgrAccComment", label: "Accomplishments" },
      { feedbackKey: "disappointments", commentKey: "mgrDisComment", label: "Disappointments" },
      { feedbackKey: "goalProgress", commentKey: "mgrGoalComment", label: "Goal Progress" },
    ],
  },
  {
    title: "Well-being & Stability",
    fields: [
      { feedbackKey: "moodScore", commentKey: "mgrMoodComment", label: "Mood", isMood: true },
      { feedbackKey: "workLifeBalance", commentKey: "mgrWlbComment", label: "Work-Life Balance", formatValue: (v) => `${v}/5` },
      { feedbackKey: "workloadLevel", commentKey: "mgrWorkloadComment", label: "Workload Level", formatValue: (v) => `${v}/5` },
      { feedbackKey: "ptoCoverage", commentKey: "mgrPtoComment", label: "PTO Coverage" },
    ],
  },
  {
    title: "Support & Growth",
    fields: [
      { feedbackKey: "blockers", commentKey: "mgrBlockersComment", label: "Blockers" },
      { feedbackKey: "supportNeeds", commentKey: "mgrSupportComment", label: "Support Needs" },
      { feedbackKey: "mentoringCulture", commentKey: "mgrMentoringComment", label: "Mentoring Culture" },
      { feedbackKey: "processSuggestions", commentKey: "mgrSuggestionsComment", label: "Process Suggestions" },
    ],
  },
];

function useFeedbackById(id?: number) {
  return useQuery<Feedback & { user?: { firstName?: string; lastName?: string; deptCode?: string; email?: string } }>({
    queryKey: ["/api/feedback", id],
    queryFn: async () => {
      const res = await fetch(`/api/feedback/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch feedback");
      return res.json();
    },
    enabled: !!id,
  });
}

export default function ReviewFeedback() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/review/:feedbackId");
  const feedbackId = params?.feedbackId ? parseInt(params.feedbackId) : undefined;

  const { user } = useAuth();
  const { data: feedbackData, isLoading: feedbackLoading } = useFeedbackById(feedbackId);
  const { data: existingReview, isLoading: reviewLoading } = useReviewByFeedback(feedbackId);
  const upsertReview = useUpsertReview();

  const empEmail = feedbackData?.user?.email;
  const { data: actionItemsRaw, isLoading: actionsLoading } = useActionItems(empEmail, user?.email);
  const createActionItem = useCreateActionItem();
  const updateActionItem = useUpdateActionItem();
  const deleteActionItem = useDeleteActionItem();

  const [comments, setComments] = useState<CommentState>(INITIAL_COMMENTS);
  const [initialized, setInitialized] = useState(false);

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskContent, setTaskContent] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("EMPLOYEE");

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editTask, setEditTask] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editStatus, setEditStatus] = useState("");

  useEffect(() => {
    if (existingReview && !initialized) {
      const review = existingReview as ManagerReview;
      setComments({
        mgrSatComment: review.mgrSatComment || "",
        mgrMoodComment: review.mgrMoodComment || "",
        mgrAccComment: review.mgrAccComment || "",
        mgrDisComment: review.mgrDisComment || "",
        mgrBlockersComment: review.mgrBlockersComment || "",
        mgrSupportComment: review.mgrSupportComment || "",
        mgrWlbComment: review.mgrWlbComment || "",
        mgrWorkloadComment: review.mgrWorkloadComment || "",
        mgrMentoringComment: review.mgrMentoringComment || "",
        mgrSuggestionsComment: review.mgrSuggestionsComment || "",
        mgrPtoComment: review.mgrPtoComment || "",
        mgrGoalComment: review.mgrGoalComment || "",
      });
      setInitialized(true);
    }
  }, [existingReview, initialized]);

  const actionItems = useMemo(() => {
    if (!actionItemsRaw || !empEmail || !user?.email) return [];
    return actionItemsRaw.filter((item: any) => item.empEmail === empEmail && item.mgrEmail === user.email);
  }, [actionItemsRaw, empEmail, user?.email]);

  const updateComment = (key: keyof CommentState, value: string) => {
    setComments((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (!feedbackId || !user?.email) return;
    upsertReview.mutate({
      feedbackId,
      mgrEmail: user.email,
      ...comments,
    });
  };

  const handleCreateTask = async () => {
    if (!taskContent || !dueDate || !user?.email || !empEmail) return;
    await createActionItem.mutateAsync({
      empEmail,
      mgrEmail: user.email,
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

  const isLoading = feedbackLoading || reviewLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300" data-testid="loading-skeleton">
        <div className="flex items-center gap-4">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="h-24 w-full" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-6 w-48" />
              {Array.from({ length: 4 }).map((_, j) => (
                <Skeleton key={j} className="h-48 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!feedbackData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4" data-testid="feedback-not-found">
        <p className="text-muted-foreground text-lg">Feedback entry not found.</p>
        <Button variant="outline" onClick={() => setLocation("/team-radar")} data-testid="button-back-not-found">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Team Radar
        </Button>
      </div>
    );
  }

  const feedback = feedbackData;
  const employeeName = feedback.user
    ? `${feedback.user.firstName || ""} ${feedback.user.lastName || ""}`.trim()
    : `Employee ${feedback.userId}`;
  const department = feedback.user?.deptCode || "N/A";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/team-radar")} data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-display font-bold text-foreground" data-testid="text-page-title">
            1-on-1 Review
          </h1>
        </div>
        <Button onClick={handleSave} disabled={upsertReview.isPending} data-testid="button-save-review">
          <Save className="w-4 h-4 mr-2" />
          {upsertReview.isPending ? "Saving..." : "Save Review"}
        </Button>
      </div>

      <Card data-testid="card-employee-info">
        <CardContent className="flex flex-wrap items-center gap-6 py-4">
          <div className="flex items-center gap-2 text-sm" data-testid="text-employee-name">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{employeeName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-department">
            <Briefcase className="w-4 h-4" />
            <span>{department}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-period">
            <Calendar className="w-4 h-4" />
            <span>{feedback.submissionPeriod}</span>
          </div>
          {existingReview && (
            <Badge variant="secondary" data-testid="badge-reviewed">Previously Reviewed</Badge>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {SECTIONS.map((section) => (
          <div key={section.title} className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground" data-testid={`text-section-${section.title.toLowerCase().replace(/\s+/g, "-")}`}>
              {section.title}
            </h2>
            {section.fields.map((field) => {
              const rawValue = (feedback as any)[field.feedbackKey];
              const displayValue = field.formatValue
                ? field.formatValue(rawValue)
                : String(rawValue ?? "");

              return (
                <Card key={field.feedbackKey} data-testid={`card-field-${field.feedbackKey}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">{field.label}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="bg-muted/50 rounded-md p-3" data-testid={`text-response-${field.feedbackKey}`}>
                      {field.isMood ? (
                        <Badge className={MOOD_COLORS[rawValue] || ""}>{rawValue}</Badge>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{displayValue}</p>
                      )}
                    </div>
                    <Textarea
                      placeholder="Add your notes..."
                      value={comments[field.commentKey]}
                      onChange={(e) => updateComment(field.commentKey, e.target.value)}
                      className="text-sm min-h-[80px] resize-y"
                      data-testid={`textarea-${field.commentKey}`}
                    />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ))}
      </div>

      <Card data-testid="card-review-action-items">
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-primary" />
              Action Items with {employeeName}
            </CardTitle>
            <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-action-item">
                  <Plus className="w-4 h-4 mr-1" /> Add Action Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Action Item for {employeeName}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Task Description</Label>
                    <Input value={taskContent} onChange={e => setTaskContent(e.target.value)} placeholder="e.g. Complete compliance training" data-testid="input-task-description" />
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} data-testid="input-due-date" />
                  </div>
                  <div className="space-y-2">
                    <Label>Assign To</Label>
                    <div className="flex gap-2">
                      <Button variant={assignedTo === "EMPLOYEE" ? "default" : "outline"} onClick={() => setAssignedTo("EMPLOYEE")} data-testid="button-assign-employee">
                        {employeeName}
                      </Button>
                      <Button variant={assignedTo === "MANAGER" ? "default" : "outline"} onClick={() => setAssignedTo("MANAGER")} data-testid="button-assign-manager">
                        Manager (Me)
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
          <CardDescription>Action items between you and {employeeName}</CardDescription>
        </CardHeader>
        <CardContent>
          {actionsLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : actionItems.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No action items yet. Add one to track follow-ups.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {actionItems.map((item: any) => {
                const isOverdue = item.status !== "Completed" && new Date(item.dueDate) < new Date();
                const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG["Pending"];
                const StatusIcon = cfg.icon;

                return (
                  <div key={item.id} className={`flex items-start gap-4 p-4 rounded-lg border border-border ${item.status === "Completed" ? "opacity-60" : ""}`} data-testid={`card-action-item-${item.id}`}>
                    <div className="p-2 rounded-lg bg-muted/50 mt-0.5">
                      <StatusIcon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="secondary" className={`no-default-hover-elevate no-default-active-elevate ${isOverdue ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" : cfg.badgeClass}`}>
                          {isOverdue ? "Overdue" : item.status}
                        </Badge>
                        <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                          {item.assignedTo === "EMPLOYEE" ? "Employee" : "Manager"}
                        </Badge>
                      </div>
                      <p className={`font-medium text-sm text-foreground mt-2 ${item.status === "Completed" ? "line-through" : ""}`}>{item.task}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Due {format(new Date(item.dueDate), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Select value={item.status} onValueChange={(val) => updateActionItem.mutate({ id: item.id, updates: { status: val } })}>
                        <SelectTrigger className="w-[130px] text-xs" data-testid={`select-status-${item.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="In Progress">In Progress</SelectItem>
                          <SelectItem value="Blocked">Blocked</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <ShadTooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(item)} data-testid={`button-edit-action-${item.id}`}>
                            <Pencil className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </ShadTooltip>
                      <ShadTooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" onClick={() => deleteActionItem.mutate(item.id)} disabled={deleteActionItem.isPending} data-testid={`button-delete-action-${item.id}`}>
                            <Trash2 className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Delete</TooltipContent>
                      </ShadTooltip>
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

      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} disabled={upsertReview.isPending} data-testid="button-save-review-bottom">
          <Save className="w-4 h-4 mr-2" />
          {upsertReview.isPending ? "Saving..." : "Save Review"}
        </Button>
      </div>
    </div>
  );
}
