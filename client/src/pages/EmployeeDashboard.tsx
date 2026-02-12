import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useFeedbackList, useCreateFeedback, useActionItems } from "@/hooks/use-pulse-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { SyncLoader } from "@/components/SyncLoader";
import {
  Trophy,
  AlertCircle,
  Clock,
  CheckCircle2,
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
} from "lucide-react";
import { motion } from "framer-motion";

const MOOD_OPTIONS = ["Great", "Good", "Neutral", "Challenged", "Burned Out"] as const;

const moodConfig: Record<string, { color: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  "Great": { color: "text-emerald-600", variant: "default" },
  "Good": { color: "text-blue-600", variant: "default" },
  "Neutral": { color: "text-muted-foreground", variant: "secondary" },
  "Challenged": { color: "text-amber-600", variant: "secondary" },
  "Burned Out": { color: "text-rose-600", variant: "destructive" },
};

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [satScore, setSatScore] = useState([7]);
  const [moodScore, setMoodScore] = useState<string>("");
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
  const { data: myActionItems } = useActionItems(user?.email ?? undefined);

  const currentPeriod = format(new Date(), "MMM-yyyy");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !moodScore) return;

    await new Promise(r => setTimeout(r, 800));

    createFeedback.mutate({
      userId: user.id,
      submissionPeriod: currentPeriod,
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
    }, {
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
        setMoodScore("");
        setWorkloadLevel([3]);
        setWorkLifeBalance([3]);
      }
    });
  };

  const workloadLabels = ["Under-utilized", "Light", "Balanced", "Heavy", "Overwhelmed"];
  const balanceLabels = ["Poor", "Fair", "Okay", "Good", "Excellent"];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {createFeedback.isPending && <SyncLoader />}

      <header>
        <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-greeting">
          Hello, {user?.firstName}
        </h1>
        <p className="text-muted-foreground mt-2">
          Here's your pulse check for <span className="font-semibold text-primary">{currentPeriod}</span>.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50 shadow-sm overflow-visible">
            <div className="h-2 bg-gradient-to-r from-primary to-indigo-400 rounded-t-md" />
            <CardHeader>
              <CardTitle>Weekly Check-in</CardTitle>
              <CardDescription>Share your wins and challenges to help us support you better.</CardDescription>
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
                          variant={satScore[0] >= 8 ? "default" : satScore[0] <= 4 ? "destructive" : "secondary"}
                          className="text-lg font-bold px-3"
                          data-testid="badge-sat-score"
                        >
                          {satScore[0]}/10
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
                        <span>Very Satisfied</span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <Smile className="w-4 h-4 text-amber-500" />
                        Overall Mood
                      </Label>
                      <Select value={moodScore} onValueChange={setMoodScore}>
                        <SelectTrigger data-testid="select-mood">
                          <SelectValue placeholder="How are you feeling?" />
                        </SelectTrigger>
                        <SelectContent>
                          {MOOD_OPTIONS.map((mood) => (
                            <SelectItem key={mood} value={mood} data-testid={`option-mood-${mood.toLowerCase().replace(/\s+/g, "-")}`}>
                              <span className={moodConfig[mood]?.color}>{mood}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {moodScore && (
                        <Badge variant={moodConfig[moodScore]?.variant || "secondary"} data-testid="badge-mood-value">
                          {moodScore}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center flex-wrap gap-1">
                        <Label className="text-base font-semibold flex items-center gap-2">
                          <Scale className="w-4 h-4 text-violet-500" />
                          Workload Level
                        </Label>
                        <Badge variant="outline" className="font-mono" data-testid="badge-workload">
                          {workloadLabels[workloadLevel[0] - 1]}
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
                        <Badge variant="outline" className="font-mono" data-testid="badge-balance">
                          {balanceLabels[workLifeBalance[0] - 1]}
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

                <div className="flex justify-end pt-4">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={!moodScore || createFeedback.isPending}
                    className="w-full md:w-auto font-semibold shadow-lg shadow-primary/25 transition-all"
                    data-testid="button-submit-feedback"
                  >
                    Submit Weekly Pulse
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Action Items
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!myActionItems?.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>All caught up!</p>
                </div>
              ) : (
                myActionItems.map((item: any) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-lg border border-border bg-card transition-colors group"
                    data-testid={`card-action-item-${item.id}`}
                  >
                    <div className="flex justify-between items-start mb-2 flex-wrap gap-1">
                      <Badge variant={item.status === "Completed" ? "outline" : "default"} className={item.status === "Completed" ? "text-green-600 border-green-200" : ""}>
                        {item.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        Due {format(new Date(item.dueDate), "MMM d")}
                      </span>
                    </div>
                    <p className="font-medium text-sm text-foreground mb-1">{item.task}</p>
                    <p className="text-xs text-muted-foreground">From: {item.mgrEmail}</p>
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
