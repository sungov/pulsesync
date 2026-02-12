import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCreateFeedback } from "@/hooks/use-pulse-data";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { format, subMonths } from "date-fns";
import { SyncLoader } from "@/components/SyncLoader";
import { useToast } from "@/hooks/use-toast";
import {
  Trophy,
  AlertCircle,
  ThumbsDown,
  Users,
  HeartHandshake,
  Target,
  Lightbulb,
  CalendarDays,
  Activity,
  Briefcase,
  Scale,
  Smile,
  CheckCircle2,
  Lock,
  Pencil,
  ChevronDown,
} from "lucide-react";

function generatePeriodOptions(): string[] {
  const options: string[] = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    options.push(format(subMonths(now, i), "MMM-yyyy"));
  }
  return options;
}

const MOOD_LABELS = ["Burned Out", "Challenged", "Neutral", "Good", "Great"] as const;
const SAT_LABELS = ["Very Dissatisfied", "Dissatisfied", "Somewhat Dissatisfied", "Slightly Dissatisfied", "Mixed", "Slightly Satisfied", "Somewhat Satisfied", "Satisfied", "Very Satisfied", "Thriving"] as const;
const WORKLOAD_LABELS = ["Under-utilized", "Light", "Balanced", "Heavy", "Overwhelmed"] as const;
const BALANCE_LABELS = ["Poor", "Fair", "Okay", "Good", "Excellent"] as const;

type BadgeVariant = "default" | "secondary" | "destructive" | "outline";

function getScaleVariant(value: number, max: number): BadgeVariant {
  const ratio = value / max;
  if (ratio <= 0.3) return "destructive";
  if (ratio <= 0.6) return "secondary";
  return "default";
}

function getInverseScaleVariant(value: number, max: number): BadgeVariant {
  const ratio = value / max;
  if (ratio <= 0.4) return "default";
  if (ratio <= 0.7) return "secondary";
  return "destructive";
}

export default function EmployeeFeedback() {
  const { user } = useAuth();
  const [satScore, setSatScore] = useState([7]);
  const [moodIndex, setMoodIndex] = useState([3]);
  const [workloadLevel, setWorkloadLevel] = useState([3]);
  const [workLifeBalance, setWorkLifeBalance] = useState([3]);
  const [accomplishments, setAccomplishments] = useState("");
  const [disappointments, setDisappointments] = useState("");
  const [blockers, setBlockers] = useState("");
  const [mentoringCulture, setMentoringCulture] = useState("");
  const [supportNeeds, setSupportNeeds] = useState("");
  const [goalProgress, setGoalProgress] = useState("");
  const [processSuggestions, setProcessSuggestions] = useState("");
  const [ptoCoverage, setPtoCoverage] = useState("");

  const createFeedback = useCreateFeedback();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editingFeedbackId, setEditingFeedbackId] = useState<number | null>(null);

  const periodOptions = generatePeriodOptions();
  const [selectedPeriod, setSelectedPeriod] = useState(periodOptions[0]);

  const { data: periodCheck, isLoading: periodCheckLoading } = useQuery<{ exists: boolean; feedbackId: number | null; reviewed: boolean }>({
    queryKey: ["/api/feedback/check-period", selectedPeriod],
    queryFn: async () => {
      const res = await fetch(`/api/feedback/check-period?period=${selectedPeriod}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to check period");
      return res.json();
    },
    enabled: !!user?.id,
  });

  const alreadySubmitted = periodCheck?.exists ?? false;
  const isReviewed = periodCheck?.reviewed ?? false;

  const { data: existingFeedback } = useQuery<any>({
    queryKey: ["/api/feedback", periodCheck?.feedbackId],
    queryFn: async () => {
      const res = await fetch(`/api/feedback?userId=${user?.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch feedback");
      const all = await res.json();
      return all.find((f: any) => f.id === periodCheck?.feedbackId);
    },
    enabled: !!periodCheck?.feedbackId && isEditing,
  });

  useEffect(() => {
    if (existingFeedback && isEditing) {
      setSatScore([existingFeedback.satScore]);
      const moodIdx = MOOD_LABELS.indexOf(existingFeedback.moodScore as any);
      setMoodIndex([moodIdx >= 0 ? moodIdx + 1 : 3]);
      setWorkloadLevel([existingFeedback.workloadLevel]);
      setWorkLifeBalance([existingFeedback.workLifeBalance]);
      setAccomplishments(existingFeedback.accomplishments || "");
      setDisappointments(existingFeedback.disappointments || "");
      setBlockers(existingFeedback.blockers || "");
      setMentoringCulture(existingFeedback.mentoringCulture || "");
      setSupportNeeds(existingFeedback.supportNeeds || "");
      setGoalProgress(existingFeedback.goalProgress || "");
      setProcessSuggestions(existingFeedback.processSuggestions || "");
      setPtoCoverage(existingFeedback.ptoCoverage || "");
      setEditingFeedbackId(existingFeedback.id);
    }
  }, [existingFeedback, isEditing]);

  const updateFeedback = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", `/api/feedback/${editingFeedbackId}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Feedback Updated", description: "Your responses have been saved successfully." });
      setIsEditing(false);
      setEditingFeedbackId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/feedback/check-period"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
    },
    onError: (err: any) => {
      toast({ title: "Update Failed", description: err.message || "Could not update feedback.", variant: "destructive" });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const moodScore = MOOD_LABELS[moodIndex[0] - 1];

    const payload = {
      userId: user.id,
      submissionPeriod: selectedPeriod,
      satScore: satScore[0],
      moodScore,
      workloadLevel: workloadLevel[0],
      workLifeBalance: workLifeBalance[0],
      accomplishments,
      disappointments,
      blockers,
      mentoringCulture,
      supportNeeds,
      goalProgress,
      processSuggestions,
      ptoCoverage,
    };

    if (isEditing && editingFeedbackId) {
      updateFeedback.mutate(payload);
      return;
    }

    await new Promise(r => setTimeout(r, 800));

    createFeedback.mutate(payload, {
      onSuccess: () => {
        setAccomplishments("");
        setDisappointments("");
        setBlockers("");
        setMentoringCulture("");
        setSupportNeeds("");
        setGoalProgress("");
        setProcessSuggestions("");
        setPtoCoverage("");
        setSatScore([7]);
        setMoodIndex([3]);
        setWorkloadLevel([3]);
        setWorkLifeBalance([3]);
        queryClient.invalidateQueries({ queryKey: ["/api/feedback/check-period"] });
        queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
      }
    });
  };


  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {createFeedback.isPending && <SyncLoader />}

      <header className="space-y-3">
        <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-greeting">
          Hello, {user?.firstName}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-muted-foreground">Pulse check for</p>
          <div className="relative inline-block">
            <select
              value={selectedPeriod}
              onChange={(e) => {
                setSelectedPeriod(e.target.value);
                setIsEditing(false);
                setEditingFeedbackId(null);
              }}
              className="appearance-none bg-card border border-border rounded-md pl-3 pr-8 py-1.5 text-sm font-semibold text-primary cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30"
              data-testid="select-period"
            >
              {periodOptions.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
          {selectedPeriod !== periodOptions[0] && (
            <Badge variant="secondary">Backdated</Badge>
          )}
        </div>
      </header>

      {periodCheckLoading ? (
        <Card className="border-border/50 shadow-sm overflow-visible">
          <div className="h-2 bg-gradient-to-r from-primary to-indigo-400 rounded-t-md" />
          <CardContent className="py-16 text-center">
            <SyncLoader />
          </CardContent>
        </Card>
      ) : alreadySubmitted && !isEditing ? (
        <Card className="border-border/50 shadow-sm overflow-visible" data-testid="card-already-submitted">
          <div className={`h-2 rounded-t-md ${isReviewed ? "bg-gradient-to-r from-emerald-500 to-emerald-400" : "bg-gradient-to-r from-primary to-indigo-400"}`} />
          <CardContent className="py-16 text-center space-y-4">
            {isReviewed ? (
              <>
                <Lock className="w-12 h-12 mx-auto text-emerald-500/40" />
                <p className="text-lg font-medium text-foreground">Feedback Reviewed & Locked</p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Your feedback for <span className="font-semibold text-primary">{selectedPeriod}</span> has been reviewed by your manager and is now locked. You can view it in your dashboard.
                </p>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-12 h-12 mx-auto text-primary/40" />
                <p className="text-lg font-medium text-foreground">Already Submitted</p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  You've already submitted your monthly pulse for <span className="font-semibold text-primary">{selectedPeriod}</span>. Since your manager hasn't reviewed it yet, you can still edit your responses.
                </p>
                <Button
                  variant="outline"
                  className="mt-2"
                  data-testid="button-edit-feedback"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Responses
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
      <div className="space-y-6">
          <Card className="border-border/50 shadow-sm overflow-visible">
            <div className="h-2 bg-gradient-to-r from-primary to-indigo-400 rounded-t-md" />
            <CardHeader>
              <CardTitle>{isEditing ? "Edit Your Responses" : "Monthly Check-in"}</CardTitle>
              <CardDescription>
                {isEditing
                  ? "Update your responses below. Your wellness score will be recalculated."
                  : "Share your wins and challenges to help us support you better."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-10">
                <section className="space-y-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    How are you feeling?
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-muted/30 rounded-lg border border-border/50">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center flex-wrap gap-1">
                        <Label className="text-base font-semibold flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-primary" />
                          Work Satisfaction
                        </Label>
                        <Badge
                          variant={getScaleVariant(satScore[0], 10)}
                          data-testid="badge-sat-score"
                        >
                          {SAT_LABELS[satScore[0] - 1]}
                        </Badge>
                      </div>
                      <Slider
                        value={satScore}
                        onValueChange={setSatScore}
                        min={1}
                        max={10}
                        step={1}
                        className="py-2"
                        data-testid="slider-sat-score"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Very Dissatisfied</span>
                        <span>Thriving</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center flex-wrap gap-1">
                        <Label className="text-base font-semibold flex items-center gap-2">
                          <Smile className="w-4 h-4 text-amber-500" />
                          Overall Mood
                        </Label>
                        <Badge
                          variant={getScaleVariant(moodIndex[0], 5)}
                          data-testid="badge-mood-value"
                        >
                          {MOOD_LABELS[moodIndex[0] - 1]}
                        </Badge>
                      </div>
                      <Slider
                        value={moodIndex}
                        onValueChange={setMoodIndex}
                        min={1}
                        max={5}
                        step={1}
                        className="py-2"
                        data-testid="slider-mood"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Burned Out</span>
                        <span>Great</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center flex-wrap gap-1">
                        <Label className="text-base font-semibold flex items-center gap-2">
                          <Scale className="w-4 h-4 text-violet-500" />
                          Workload Level
                        </Label>
                        <Badge
                          variant={getInverseScaleVariant(workloadLevel[0], 5)}
                          data-testid="badge-workload"
                        >
                          {WORKLOAD_LABELS[workloadLevel[0] - 1]}
                        </Badge>
                      </div>
                      <Slider
                        value={workloadLevel}
                        onValueChange={setWorkloadLevel}
                        min={1}
                        max={5}
                        step={1}
                        className="py-2"
                        data-testid="slider-workload"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Under-utilized</span>
                        <span>Overwhelmed</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center flex-wrap gap-1">
                        <Label className="text-base font-semibold flex items-center gap-2">
                          <HeartHandshake className="w-4 h-4 text-rose-500" />
                          Work-Life Balance
                        </Label>
                        <Badge
                          variant={getScaleVariant(workLifeBalance[0], 5)}
                          data-testid="badge-balance"
                        >
                          {BALANCE_LABELS[workLifeBalance[0] - 1]}
                        </Badge>
                      </div>
                      <Slider
                        value={workLifeBalance}
                        onValueChange={setWorkLifeBalance}
                        min={1}
                        max={5}
                        step={1}
                        className="py-2"
                        data-testid="slider-balance"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Poor</span>
                        <span>Excellent</span>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Trophy className="w-4 h-4" />
                    Performance Narrative
                  </h3>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="accomplishments" className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        Key Accomplishments
                      </Label>
                      <p className="text-xs text-muted-foreground">What did you achieve? This builds the narrative for your manager's review.</p>
                      <Textarea
                        id="accomplishments"
                        placeholder="e.g. I completed the migration of the XYZ database 2 days ahead of schedule."
                        className="min-h-[100px] resize-none focus-visible:ring-primary"
                        value={accomplishments}
                        onChange={(e) => setAccomplishments(e.target.value)}
                        required
                        data-testid="textarea-accomplishments"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="disappointments" className="flex items-center gap-2">
                        <ThumbsDown className="w-4 h-4 text-slate-500" />
                        Top Disappointments
                      </Label>
                      <p className="text-xs text-muted-foreground">Identifies hidden friction points your manager should know about.</p>
                      <Textarea
                        id="disappointments"
                        placeholder="e.g. I felt the communication during the last sprint was unclear."
                        className="min-h-[100px] resize-none focus-visible:ring-primary"
                        value={disappointments}
                        onChange={(e) => setDisappointments(e.target.value)}
                        required
                        data-testid="textarea-disappointments"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="blockers" className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                        Blockers & Risks
                      </Label>
                      <p className="text-xs text-muted-foreground">Critical blockers can automatically suggest a Manager Action Item.</p>
                      <Textarea
                        id="blockers"
                        placeholder="e.g. Waiting on IT for server access; it's delaying the launch."
                        className="min-h-[100px] resize-none focus-visible:ring-primary"
                        value={blockers}
                        onChange={(e) => setBlockers(e.target.value)}
                        required
                        data-testid="textarea-blockers"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mentoringCulture" className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-teal-500" />
                        Mentoring & Culture
                      </Label>
                      <p className="text-xs text-muted-foreground">Measures organizational citizenship beyond just tasks.</p>
                      <Textarea
                        id="mentoringCulture"
                        placeholder="e.g. I helped the new intern get up to speed with our Python stack."
                        className="min-h-[100px] resize-none focus-visible:ring-primary"
                        value={mentoringCulture}
                        onChange={(e) => setMentoringCulture(e.target.value)}
                        required
                        data-testid="textarea-mentoring"
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-6">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    Growth & Planning
                  </h3>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="supportNeeds" className="flex items-center gap-2">
                        <HeartHandshake className="w-4 h-4 text-blue-500" />
                        Support Needs
                      </Label>
                      <p className="text-xs text-muted-foreground">Direct requests for resources, training, or help.</p>
                      <Textarea
                        id="supportNeeds"
                        placeholder="e.g. I need a training budget for the Advanced Snowflake course."
                        className="min-h-[100px] resize-none focus-visible:ring-primary"
                        value={supportNeeds}
                        onChange={(e) => setSupportNeeds(e.target.value)}
                        required
                        data-testid="textarea-support"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="goalProgress" className="flex items-center gap-2">
                        <Target className="w-4 h-4 text-emerald-500" />
                        Goal Progress
                      </Label>
                      <p className="text-xs text-muted-foreground">Keeps performance tracking continuous rather than annual.</p>
                      <Textarea
                        id="goalProgress"
                        placeholder="e.g. 70% complete on the Q1 automation goal."
                        className="min-h-[100px] resize-none focus-visible:ring-primary"
                        value={goalProgress}
                        onChange={(e) => setGoalProgress(e.target.value)}
                        required
                        data-testid="textarea-goals"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="processSuggestions" className="flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-amber-500" />
                        Process Suggestions
                      </Label>
                      <p className="text-xs text-muted-foreground">Empowers you to improve how the company works.</p>
                      <Textarea
                        id="processSuggestions"
                        placeholder="e.g. We should move our stand-ups to 10 AM to accommodate the team."
                        className="min-h-[100px] resize-none focus-visible:ring-primary"
                        value={processSuggestions}
                        onChange={(e) => setProcessSuggestions(e.target.value)}
                        required
                        data-testid="textarea-suggestions"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ptoCoverage" className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-indigo-500" />
                        PTO & Coverage
                      </Label>
                      <p className="text-xs text-muted-foreground">Essential for team planning and workload management.</p>
                      <Textarea
                        id="ptoCoverage"
                        placeholder="e.g. Planning to take 3 days off in late March."
                        className="min-h-[100px] resize-none focus-visible:ring-primary"
                        value={ptoCoverage}
                        onChange={(e) => setPtoCoverage(e.target.value)}
                        required
                        data-testid="textarea-pto"
                      />
                    </div>
                  </div>
                </section>

                <div className="flex justify-end gap-3 pt-4">
                  {isEditing && (
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => setIsEditing(false)}
                      data-testid="button-cancel-edit"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    type="submit"
                    size="lg"
                    disabled={createFeedback.isPending || updateFeedback.isPending}
                    className="w-full md:w-auto font-semibold shadow-lg shadow-primary/25 transition-all"
                    data-testid="button-submit-feedback"
                  >
                    {(createFeedback.isPending || updateFeedback.isPending) ? "Saving..." : isEditing ? "Update Responses" : "Submit Monthly Pulse"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
      </div>
      )}
    </div>
  );
}
