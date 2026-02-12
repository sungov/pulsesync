import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTeamFeedback, useBurnoutRadar, useCreateActionItem, useUpdateActionItem, useDeleteActionItem, useActionItemsForUser, useUsersList } from "@/hooks/use-pulse-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip as ShadTooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Flame, Plus, AlertTriangle, Star, ClipboardCheck, Eye, Pencil, ListTodo, Clock, CheckCircle2, Circle, Loader2, Ban, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { format, subMonths } from "date-fns";

const STATUS_CONFIG: Record<string, { icon: typeof Circle; color: string; badgeClass: string }> = {
  "Pending": { icon: Circle, color: "text-amber-500", badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" },
  "In Progress": { icon: Loader2, color: "text-blue-500", badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" },
  "Blocked": { icon: Ban, color: "text-red-500", badgeClass: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
  "Completed": { icon: CheckCircle2, color: "text-emerald-500", badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" },
};

const periodOptions = Array.from({ length: 12 }, (_, i) => {
  const d = subMonths(new Date(), i);
  return format(d, "MMM-yyyy");
});

const moodColorMap: Record<string, string> = {
  "Great": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "Good": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "Neutral": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  "Challenged": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "Burned Out": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function ManagerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPeriod, setSelectedPeriod] = useState(periodOptions[0]);

  const { data: teamMembers } = useUsersList("EMPLOYEE", user?.email || "");
  const { data: teamFeedback, isLoading: isFeedbackLoading } = useTeamFeedback(user?.email || "", selectedPeriod);
  const { data: burnoutData } = useBurnoutRadar();
  const { data: allActionItems, isLoading: actionsLoading } = useActionItemsForUser(user?.email);
  const createActionItem = useCreateActionItem();
  const updateActionItem = useUpdateActionItem();
  const deleteActionItem = useDeleteActionItem();

  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [taskContent, setTaskContent] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const filteredActionItems = useMemo(() => {
    if (!allActionItems) return [];
    const items = allActionItems.filter((a: any) => a.mgrEmail === user?.email);
    if (actionFilter === "all") return items;
    return items.filter((a: any) => a.status === actionFilter);
  }, [allActionItems, user?.email, actionFilter]);

  const actionCounts = useMemo(() => {
    if (!allActionItems) return { pending: 0, inProgress: 0, blocked: 0, completed: 0, overdue: 0 };
    const items = allActionItems.filter((a: any) => a.mgrEmail === user?.email);
    return {
      pending: items.filter((a: any) => a.status === "Pending").length,
      inProgress: items.filter((a: any) => a.status === "In Progress").length,
      blocked: items.filter((a: any) => a.status === "Blocked").length,
      completed: items.filter((a: any) => a.status === "Completed").length,
      overdue: items.filter((a: any) => a.status !== "Completed" && new Date(a.dueDate) < new Date()).length,
    };
  }, [allActionItems, user?.email]);

  const handleCreateTask = async () => {
    if (!selectedEmployee || !taskContent || !dueDate || !user?.email) return;

    await createActionItem.mutateAsync({
      empEmail: selectedEmployee,
      mgrEmail: user.email,
      task: taskContent,
      dueDate: new Date(dueDate),
      status: "Pending"
    });
    setTaskDialogOpen(false);
    setTaskContent("");
    setDueDate("");
  };

  const avgSatScore = teamFeedback?.length
    ? (teamFeedback.reduce((sum: number, f: any) => sum + (f.satScore || 0), 0) / teamFeedback.length).toFixed(1)
    : "—";

  const burnoutRiskCount = burnoutData?.filter((r: any) => r.dropPercentage > 30).length ?? 0;

  const totalFeedback = teamFeedback?.length ?? 0;
  const reviewedCount = teamFeedback?.filter((f: any) => f.reviewed).length ?? 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-team-pulse-title">Team Pulse</h1>
          <p className="text-muted-foreground mt-1" data-testid="text-team-member-count">
            Monitoring {teamMembers?.length || 0} team members
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[160px]" data-testid="select-period">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((p) => (
                <SelectItem key={p} value={p} data-testid={`select-period-option-${p}`}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-assign-action-item">
                <Plus className="w-4 h-4 mr-2" /> Assign Action Item
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Action Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Assign To</Label>
                  <Select onValueChange={setSelectedEmployee}>
                    <SelectTrigger data-testid="select-assign-employee">
                      <SelectValue placeholder="Select team member" />
                    </SelectTrigger>
                    <SelectContent>
                      {teamMembers?.map(member => (
                        <SelectItem key={member.id} value={member.email || ""} data-testid={`select-employee-option-${member.id}`}>
                          {member.firstName} {member.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
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
              </div>
              <DialogFooter>
                <Button onClick={handleCreateTask} disabled={createActionItem.isPending} data-testid="button-submit-action-item">
                  {createActionItem.isPending ? "Assigning..." : "Assign Task"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card data-testid="card-avg-satisfaction">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Satisfaction</CardTitle>
            <Star className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-satisfaction-value">{avgSatScore}</div>
            <p className="text-xs text-muted-foreground">Out of 10 from team feedback</p>
          </CardContent>
        </Card>

        <Card data-testid="card-burnout-risk">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Burnout Risk</CardTitle>
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-burnout-risk-count">{burnoutRiskCount}</div>
            <p className="text-xs text-muted-foreground">Employees with &gt;30% sentiment drop</p>
          </CardContent>
        </Card>

        <Card data-testid="card-reviews-completed">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reviews Completed</CardTitle>
            <ClipboardCheck className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-reviews-completed-value">
              {reviewedCount} / {totalFeedback}
            </div>
            <p className="text-xs text-muted-foreground">Feedback entries reviewed</p>
          </CardContent>
        </Card>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4">Team Feedback</h2>
        <Card>
          <CardContent className="p-0">
            {isFeedbackLoading ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : teamFeedback && teamFeedback.length > 0 ? (
              <Table data-testid="table-team-feedback">
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Mood</TableHead>
                    <TableHead>AI Sentiment</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Review Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamFeedback.map((fb: any) => {
                    const initials = fb.fullName
                      ?.split(" ")
                      .map((n: string) => n[0])
                      .join("") || "?";
                    const sentimentPct = fb.aiSentiment != null ? Math.round(fb.aiSentiment * 100) : null;
                    const moodClasses = moodColorMap[fb.moodScore] || moodColorMap["Neutral"];

                    return (
                      <TableRow key={fb.id} data-testid={`row-feedback-${fb.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium" data-testid={`text-employee-name-${fb.id}`}>{fb.fullName}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`no-default-hover-elevate no-default-active-elevate ${moodClasses}`} data-testid={`badge-mood-${fb.id}`}>
                            {fb.moodScore}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {sentimentPct != null ? (
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${sentimentPct}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground" data-testid={`text-sentiment-${fb.id}`}>{sentimentPct}%</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground" data-testid={`text-period-${fb.id}`}>{fb.submissionPeriod}</span>
                        </TableCell>
                        <TableCell>
                          {fb.reviewed ? (
                            <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" data-testid={`badge-review-status-${fb.id}`}>
                              Reviewed
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" data-testid={`badge-review-status-${fb.id}`}>
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 flex-wrap">
                            {fb.reviewed ? (
                              <Link href={`/review/${fb.id}`}>
                                <Button variant="outline" size="sm" data-testid={`button-edit-review-${fb.id}`}>
                                  <Pencil className="w-3 h-3 mr-1" /> Edit Review
                                </Button>
                              </Link>
                            ) : (
                              <Link href={`/review/${fb.id}`}>
                                <Button variant="default" size="sm" data-testid={`button-start-review-${fb.id}`}>
                                  Start 1-on-1
                                </Button>
                              </Link>
                            )}
                            <Link href={`/employee-progress/${fb.userId}`}>
                              <Button variant="ghost" size="sm" data-testid={`button-view-progress-${fb.id}`}>
                                <Eye className="w-3 h-3 mr-1" /> View Progress
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="py-12 text-center" data-testid="text-no-feedback">
                <p className="text-muted-foreground">No team feedback found for {selectedPeriod}.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <div className="flex items-center justify-between gap-2 flex-wrap mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-primary" />
            All Action Items
          </h2>
          <div className="flex items-center gap-2 flex-wrap">
            {actionCounts.overdue > 0 && (
              <Badge variant="destructive" data-testid="badge-action-overdue-count">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {actionCounts.overdue} overdue
              </Badge>
            )}
            {actionCounts.blocked > 0 && (
              <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" data-testid="badge-action-blocked-count">
                {actionCounts.blocked} blocked
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {["all", "Pending", "In Progress", "Blocked", "Completed"].map(s => (
            <Button key={s} variant={actionFilter === s ? "default" : "outline"} size="sm" onClick={() => setActionFilter(s)} data-testid={`button-action-filter-${s.toLowerCase().replace(/\s+/g, "-")}`}>
              {s === "all" ? "All" : s}
            </Button>
          ))}
        </div>
        <Card>
          <CardContent className="p-0">
            {actionsLoading ? (
              <div className="space-y-3 p-6">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : filteredActionItems.length === 0 ? (
              <div className="py-12 text-center" data-testid="text-no-action-items">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/20" />
                <p className="text-muted-foreground">No action items match this filter.</p>
              </div>
            ) : (
              <Table data-testid="table-action-items">
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Task</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActionItems.map((item: any) => {
                    const isOverdue = item.status !== "Completed" && new Date(item.dueDate) < new Date();
                    const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG["Pending"];
                    const StatusIcon = cfg.icon;

                    return (
                      <TableRow key={item.id} data-testid={`row-action-item-${item.id}`} className={item.status === "Completed" ? "opacity-60" : ""}>
                        <TableCell>
                          <Badge variant="secondary" className={`no-default-hover-elevate no-default-active-elevate ${isOverdue ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" : cfg.badgeClass}`}>
                            <StatusIcon className={`w-3 h-3 mr-1 ${cfg.color}`} />
                            {isOverdue ? "Overdue" : item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <p className={`text-sm ${item.status === "Completed" ? "line-through" : ""}`}>{item.task}</p>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{item.empEmail}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                            {item.assignedTo === "EMPLOYEE" ? "Employee" : "Manager"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`text-sm ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                            {format(new Date(item.dueDate), "MMM d, yyyy")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 flex-wrap">
                            <Select value={item.status} onValueChange={(val) => updateActionItem.mutate({ id: item.id, updates: { status: val } })}>
                              <SelectTrigger className="w-[120px] text-xs" data-testid={`select-action-status-${item.id}`}>
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
                                <Button variant="ghost" size="icon" onClick={() => deleteActionItem.mutate(item.id)} disabled={deleteActionItem.isPending} data-testid={`button-delete-action-${item.id}`}>
                                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </ShadTooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          Burnout Radar
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {burnoutData?.map((risk: any) => (
            <Card key={risk.userId} data-testid={`card-burnout-${risk.userId}`}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{risk.fullName.split(' ').map((n: any) => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{risk.fullName}</CardTitle>
                      <CardDescription>Risk Level: <span className={risk.riskLevel === 'High' ? 'text-destructive font-bold' : ''}>{risk.riskLevel}</span></CardDescription>
                    </div>
                  </div>
                  {risk.dropPercentage > 10 && (
                    <Badge variant="destructive" className="animate-pulse" data-testid={`badge-drop-${risk.userId}`}>
                      -{risk.dropPercentage}% Drop
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="bg-muted/50 p-3 rounded-md text-center">
                    <p className="text-xs text-muted-foreground mb-1">Current Mood</p>
                    <p className="text-2xl font-bold">{risk.currentSentiment ?? '—'}</p>
                  </div>
                  <div className="bg-muted/50 p-3 rounded-md text-center">
                    <p className="text-xs text-muted-foreground mb-1">Previous</p>
                    <p className="text-2xl font-bold text-muted-foreground">{risk.previousSentiment ?? '—'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {(!burnoutData || burnoutData.length === 0) && (
            <div className="col-span-full py-12 text-center bg-muted/20 rounded-md border border-dashed border-border" data-testid="text-no-burnout-risks">
              <p className="text-muted-foreground">No significant burnout risks detected this period.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
