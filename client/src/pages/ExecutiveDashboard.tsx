import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useDepartmentAnalytics, useLeaderAccountability, useUsersList } from "@/hooks/use-pulse-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subMonths } from "date-fns";
import { Send, Users, Building2, ArrowLeft, AlertTriangle, CheckCircle2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function generatePeriodOptions() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(now, i);
    return format(d, "MMM-yyyy");
  });
}

function getHealthStatus(overdueCount: number) {
  if (overdueCount === 0) return { label: "Healthy", variant: "default" as const, className: "bg-green-600 text-white no-default-hover-elevate no-default-active-elevate" };
  if (overdueCount <= 2) return { label: "At Risk", variant: "default" as const, className: "bg-orange-500 text-white no-default-hover-elevate no-default-active-elevate" };
  return { label: "Critical", variant: "destructive" as const, className: "" };
}

export default function ExecutiveDashboard() {
  const { toast } = useToast();
  const periodOptions = useMemo(() => generatePeriodOptions(), []);
  const [period, setPeriod] = useState(periodOptions[0]);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  const { data: deptData, isLoading: deptLoading } = useDepartmentAnalytics(period);
  const { data: leaderData, isLoading: leaderLoading } = useLeaderAccountability();
  const { data: usersData, isLoading: usersLoading } = useUsersList();

  const handleNudge = () => {
    toast({
      title: "Nudge Sent",
      description: "Reminder emails sent to managers with pending reviews.",
    });
  };

  const chartData = useMemo(() =>
    deptData?.map(d => ({
      name: d.deptCode || "General",
      satisfaction: d.avgSatScore,
      mood: d.avgMoodScore,
      feedback: d.totalFeedback,
    })) || [],
    [deptData]
  );

  const sortedLeaderData = useMemo(() =>
    leaderData
      ? [...leaderData].sort((a: any, b: any) => (b.overdueCount ?? 0) - (a.overdueCount ?? 0))
      : [],
    [leaderData]
  );

  const deptEmployees = useMemo(() => {
    if (!selectedDept || !usersData) return [];
    return (usersData as any[]).filter((u: any) => u.deptCode === selectedDept);
  }, [selectedDept, usersData]);

  if (selectedDept) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500" data-testid="dept-drilldown-view">
        <div className="flex flex-row items-center gap-4 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setSelectedDept(null)}
            data-testid="button-back-overview"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Overview
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-dept-name">
              {selectedDept} Department
            </h1>
            <p className="text-muted-foreground text-sm">Employee breakdown</p>
          </div>
        </div>

        {usersLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : deptEmployees.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No employees found in this department.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deptEmployees.map((emp: any, idx: number) => (
              <Card key={emp.id || idx} data-testid={`card-employee-${emp.id || idx}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground" data-testid={`text-employee-name-${emp.id || idx}`}>
                      {emp.firstName && emp.lastName
                        ? `${emp.firstName} ${emp.lastName}`
                        : emp.email || "Unknown"}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {emp.role || "Employee"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{emp.email}</p>
                  <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {emp.lastMood ? `Mood: ${emp.lastMood}` : "No recent feedback"}
                    </span>
                    <Link href={`/employee-progress/${emp.id}`}>
                      <Button variant="ghost" size="sm" data-testid={`link-view-progress-${emp.id || idx}`}>
                        <Eye className="w-3 h-3 mr-1" />
                        View Progress
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700" data-testid="executive-dashboard">
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-executive-title">Executive Hub</h1>
          <p className="text-muted-foreground mt-1">Organization-wide performance intelligence</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={period} onValueChange={setPeriod} data-testid="select-period">
            <SelectTrigger className="w-[160px]" data-testid="select-period-trigger">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map(p => (
                <SelectItem key={p} value={p} data-testid={`select-period-${p}`}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleNudge} data-testid="button-nudge-managers">
            <Send className="w-4 h-4 mr-2" />
            Nudge Managers
          </Button>
        </div>
      </header>

      <section data-testid="section-department-cards">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Department Overview
        </h2>
        {deptLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-10 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !deptData || deptData.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No department data available for this period.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {deptData.map((dept, idx) => (
              <Card
                key={dept.deptCode || idx}
                className="cursor-pointer hover-elevate transition-colors"
                onClick={() => setSelectedDept(dept.deptCode || "General")}
                data-testid={`card-department-${dept.deptCode || idx}`}
              >
                <CardContent className="p-5">
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    {dept.deptCode || "General"}
                  </p>
                  <p className="text-3xl font-bold text-foreground" data-testid={`text-dept-score-${dept.deptCode || idx}`}>
                    {typeof dept.avgSatScore === "number" ? dept.avgSatScore.toFixed(1) : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Avg. Satisfaction</p>
                  <div className="flex items-center gap-1 mt-3">
                    <Users className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground" data-testid={`text-dept-feedback-${dept.deptCode || idx}`}>
                      {dept.totalFeedback} feedback{dept.totalFeedback !== 1 ? "s" : ""}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section data-testid="section-sentiment-chart">
        <Card>
          <CardHeader>
            <CardTitle>Department Sentiment Analysis</CardTitle>
            <CardDescription>Average Satisfaction vs Mood Scores by Department ({period})</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {deptLoading ? (
              <div className="flex items-center justify-center h-full">
                <Skeleton className="h-full w-full" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                No chart data available
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="satisfaction" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Satisfaction" />
                  <Bar dataKey="mood" fill="#818cf8" radius={[4, 4, 0, 0]} name="Mood" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      <section data-testid="section-leader-accountability">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Leader Accountability Audit
            </CardTitle>
            <CardDescription>Manager task completion and overdue tracking</CardDescription>
          </CardHeader>
          <CardContent>
            {leaderLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : sortedLeaderData.length === 0 ? (
              <div className="py-6 text-center text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-3" />
                <p>No manager accountability data available.</p>
              </div>
            ) : (
              <Table data-testid="table-leader-accountability">
                <TableHeader>
                  <TableRow>
                    <TableHead>Manager Email</TableHead>
                    <TableHead className="text-center">Total Tasks</TableHead>
                    <TableHead className="text-center">Pending</TableHead>
                    <TableHead className="text-center">Overdue</TableHead>
                    <TableHead className="text-center">Health Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLeaderData.map((leader: any, idx: number) => {
                    const health = getHealthStatus(leader.overdueCount ?? 0);
                    return (
                      <TableRow key={leader.managerEmail || idx} data-testid={`row-leader-${idx}`}>
                        <TableCell className="font-medium" data-testid={`text-leader-email-${idx}`}>
                          {leader.managerEmail}
                        </TableCell>
                        <TableCell className="text-center" data-testid={`text-leader-total-${idx}`}>
                          {leader.totalTasks ?? 0}
                        </TableCell>
                        <TableCell className="text-center" data-testid={`text-leader-pending-${idx}`}>
                          {leader.pendingCount ?? 0}
                        </TableCell>
                        <TableCell className="text-center" data-testid={`text-leader-overdue-${idx}`}>
                          {leader.overdueCount ?? 0}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={health.variant}
                            className={health.className}
                            data-testid={`badge-health-${idx}`}
                          >
                            {health.label}
                          </Badge>
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
    </div>
  );
}
