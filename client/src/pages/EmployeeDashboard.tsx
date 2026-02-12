import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useFeedbackList, useCreateFeedback, useActionItems } from "@/hooks/use-pulse-data";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { SyncLoader } from "@/components/SyncLoader";
import { Smile, Frown, Trophy, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [satScore, setSatScore] = useState([7]);
  const [moodScore, setMoodScore] = useState([7]);
  const [accomplishments, setAccomplishments] = useState("");
  const [blockers, setBlockers] = useState("");
  
  const createFeedback = useCreateFeedback();
  const { data: myActionItems } = useActionItems(user?.email);

  // Derive submission period (e.g., Feb-2026)
  const currentPeriod = format(new Date(), "MMM-yyyy");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    // Simulate slight delay for "Syncing" effect if backend is too fast
    await new Promise(r => setTimeout(r, 800));

    createFeedback.mutate({
      userId: user.id,
      submissionPeriod: currentPeriod,
      satScore: satScore[0],
      moodScore: moodScore[0],
      accomplishments,
      blockers,
    }, {
      onSuccess: () => {
        setAccomplishments("");
        setBlockers("");
        setSatScore([7]);
        setMoodScore([7]);
      }
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {createFeedback.isPending && <SyncLoader />}

      <header>
        <h1 className="text-3xl font-display font-bold text-foreground">Hello, {user?.firstName}</h1>
        <p className="text-muted-foreground mt-2">Here's your pulse check for <span className="font-semibold text-primary">{currentPeriod}</span>.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Feedback Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-primary to-indigo-400" />
            <CardHeader>
              <CardTitle>Weekly Check-in</CardTitle>
              <CardDescription>Share your wins and challenges to help us support you better.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Sliders Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-muted/30 rounded-xl border border-border/50">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-base font-semibold">Satisfaction Score</Label>
                      <Badge variant={satScore[0] >= 8 ? "default" : satScore[0] <= 4 ? "destructive" : "secondary"} className="text-lg font-bold px-3">
                        {satScore[0]}/10
                      </Badge>
                    </div>
                    <Slider 
                      value={satScore} 
                      onValueChange={setSatScore} 
                      max={10} 
                      step={1} 
                      className="py-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Struggling</span>
                      <span>Thriving</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label className="text-base font-semibold">Mood Score</Label>
                      <Badge variant={moodScore[0] >= 8 ? "default" : moodScore[0] <= 4 ? "destructive" : "secondary"} className="text-lg font-bold px-3">
                        {moodScore[0]}/10
                      </Badge>
                    </div>
                    <Slider 
                      value={moodScore} 
                      onValueChange={setMoodScore} 
                      max={10} 
                      step={1} 
                      className="py-2"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Stressed</span>
                      <span>Energized</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="accomplishments" className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-500" />
                      Key Accomplishments
                    </Label>
                    <Textarea 
                      id="accomplishments" 
                      placeholder="What did you achieve this week?" 
                      className="min-h-[100px] resize-none focus-visible:ring-primary"
                      value={accomplishments}
                      onChange={(e) => setAccomplishments(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="blockers" className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                      Blockers & Challenges
                    </Label>
                    <Textarea 
                      id="blockers" 
                      placeholder="Any hurdles blocking your progress?" 
                      className="min-h-[100px] resize-none focus-visible:ring-primary"
                      value={blockers}
                      onChange={(e) => setBlockers(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" size="lg" className="w-full md:w-auto font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
                    Submit Weekly Pulse
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Action Items */}
        <div className="space-y-6">
          <Card className="h-full border-border/50 shadow-sm">
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
                    className="p-4 rounded-lg border border-border bg-card hover:border-primary/50 transition-colors group"
                  >
                    <div className="flex justify-between items-start mb-2">
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
