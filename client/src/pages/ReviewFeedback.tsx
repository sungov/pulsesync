import { useAuth } from "@/hooks/use-auth";
import { useReviewByFeedback, useUpsertReview } from "@/hooks/use-pulse-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ArrowLeft, Save, User, Briefcase, Calendar } from "lucide-react";
import type { Feedback, ManagerReview } from "@shared/schema";

const MOOD_COLORS: Record<string, string> = {
  "Great": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  "Good": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  "Neutral": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  "Challenged": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  "Burned Out": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
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
  return useQuery<Feedback>({
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

  const [comments, setComments] = useState<CommentState>(INITIAL_COMMENTS);
  const [initialized, setInitialized] = useState(false);

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

  const feedback = feedbackData as Feedback & { user?: { firstName?: string; lastName?: string; deptCode?: string } };
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

      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} disabled={upsertReview.isPending} data-testid="button-save-review-bottom">
          <Save className="w-4 h-4 mr-2" />
          {upsertReview.isPending ? "Saving..." : "Save Review"}
        </Button>
      </div>
    </div>
  );
}
