import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useDepartmentAnalytics, useLeaderAccountability, useUsersList, useProjectAnalytics, useBurnoutRadar, useEmployeePerformance } from "@/hooks/use-pulse-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis, Legend } from "recharts";
import { format, subMonths } from "date-fns";
import { Send, Users, Building2, ArrowLeft, AlertTriangle, CheckCircle2, Eye, FolderKanban, UserCheck, Flame, TrendingUp, TrendingDown, Award, ArrowUpDown } from "lucide-react";

function scaleSentiment(raw: number): number {
  return raw * 10;
}
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

function getSentimentColor(score: number) {
  if (score >= 7) return "text-green-600 dark:text-green-400";
  if (score >= 5) return "text-orange-500 dark:text-orange-400";
  return "text-destructive";
}

function getSentimentLabel(score: number) {
  if (score >= 8) return "Excellent";
  if (score >= 6) return "Good";
  if (score >= 4) return "Fair";
  if (score > 0) return "Low";
  return "No Data";
}

function getManagerName(email: string, usersData: any[]) {
  const mgr = usersData.find((u: any) => u.email === email);
  if (mgr && mgr.firstName && mgr.lastName) return `${mgr.firstName} ${mgr.lastName}`;
  if (mgr && mgr.firstName) return mgr.firstName;
  return email?.split("@")[0] || "Unknown";
}

function getManagerInitials(email: string, usersData: any[]) {
  const mgr = usersData.find((u: any) => u.email === email);
  if (mgr && mgr.firstName && mgr.lastName) return `${mgr.firstName[0]}${mgr.lastName[0]}`;
  return email?.charAt(0)?.toUpperCase() || "?";
}

type ViewTab = "departments" | "projects" | "managers";
type DrilldownType = "dept" | "project";

function ScatterTooltipContent({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-popover border border-border rounded-md shadow-lg p-3 text-sm">
      <p className="font-semibold mb-1">{d.name}</p>
      <p className="text-muted-foreground">Sentiment: <span className="font-medium text-foreground">{d.sentiment.toFixed(1)}</span> / 10</p>
      <p className="text-muted-foreground">Satisfaction: <span className="font-medium text-foreground">{d.satisfaction.toFixed(1)}</span> / 10</p>
    </div>
  );
}

function EmployeePerformanceTable({ data, usersData, drilldownLabel, drilldownType }: { data: any[]; usersData: any[]; drilldownLabel: string; drilldownType: DrilldownType }) {
  const [sortBy, setSortBy] = useState<"sentiment" | "satisfaction" | "name">("sentiment");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const scaled = useMemo(() =>
    data.map(e => ({
      ...e,
      sentimentScaled: scaleSentiment(e.latestSentiment || 0),
      avgSentimentScaled: scaleSentiment(e.avgSentiment || 0),
    })),
    [data]
  );

  const sorted = useMemo(() => {
    const arr = [...scaled];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortBy === "sentiment") cmp = (a.sentimentScaled || 0) - (b.sentimentScaled || 0);
      else if (sortBy === "satisfaction") cmp = (a.avgSatScore || 0) - (b.avgSatScore || 0);
      else cmp = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      return sortDir === "desc" ? -cmp : cmp;
    });
    return arr;
  }, [scaled, sortBy, sortDir]);

  const toggleSort = (field: "sentiment" | "satisfaction" | "name") => {
    if (sortBy === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(field); setSortDir("desc"); }
  };

  const topPerformer = sorted.length > 0 && sorted[0].sentimentScaled > 0 ? sorted[0] : null;
  const bottomPerformer = sorted.length > 1 ? sorted[sorted.length - 1] : null;
  const withSentiment = scaled.filter(e => e.sentimentScaled > 0);
  const avgSentiment = withSentiment.length > 0
    ? withSentiment.reduce((s, e) => s + e.sentimentScaled, 0) / withSentiment.length
    : 0;

  const scatterData = useMemo(() =>
    withSentiment.map(e => ({
      name: `${e.firstName} ${e.lastName}`,
      sentiment: e.sentimentScaled,
      satisfaction: e.avgSatScore || 0,
      fill: e.sentimentScaled >= 7 ? "#10b981" : e.sentimentScaled >= 5 ? "#f59e0b" : "#ef4444",
    })),
    [withSentiment]
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card data-testid="card-drill-avg-sentiment">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Avg Sentiment</p>
            <p className={`text-2xl font-bold ${getSentimentColor(avgSentiment)}`}>
              {avgSentiment > 0 ? avgSentiment.toFixed(1) : "—"}
            </p>
            <p className="text-xs text-muted-foreground">{getSentimentLabel(avgSentiment)} (out of 10)</p>
          </CardContent>
        </Card>
        {topPerformer && (
          <Card data-testid="card-drill-top-performer">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-4 h-4 text-green-500" />
                <p className="text-xs text-muted-foreground">Top Performer</p>
              </div>
              <p className="font-semibold text-sm truncate">{topPerformer.firstName} {topPerformer.lastName}</p>
              <p className={`text-lg font-bold ${getSentimentColor(topPerformer.sentimentScaled)}`}>{topPerformer.sentimentScaled.toFixed(1)}<span className="text-xs font-normal text-muted-foreground"> / 10</span></p>
            </CardContent>
          </Card>
        )}
        {bottomPerformer && bottomPerformer.sentimentScaled > 0 && (
          <Card data-testid="card-drill-needs-attention">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <p className="text-xs text-muted-foreground">Needs Attention</p>
              </div>
              <p className="font-semibold text-sm truncate">{bottomPerformer.firstName} {bottomPerformer.lastName}</p>
              <p className={`text-lg font-bold ${getSentimentColor(bottomPerformer.sentimentScaled)}`}>{bottomPerformer.sentimentScaled.toFixed(1)}<span className="text-xs font-normal text-muted-foreground"> / 10</span></p>
            </CardContent>
          </Card>
        )}
      </div>

      {scatterData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sentiment vs Satisfaction</CardTitle>
            <CardDescription>Each dot is an employee in {drilldownLabel} — hover for details. Ideal position is top-right.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" dataKey="sentiment" name="Sentiment" domain={[0, 10]} stroke="#6b7280" fontSize={12} tickLine={false} label={{ value: "Sentiment (0-10)", position: "bottom", offset: 0, fontSize: 11, fill: "#9ca3af" }} />
                <YAxis type="number" dataKey="satisfaction" name="Satisfaction" domain={[0, 10]} stroke="#6b7280" fontSize={12} tickLine={false} label={{ value: "Satisfaction (0-10)", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "#9ca3af" }} />
                <ZAxis range={[80, 120]} />
                <Tooltip content={<ScatterTooltipContent />} />
                <Scatter data={scatterData} isAnimationActive={false}>
                  {scatterData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <Table data-testid="table-employee-performance">
            <TableHeader>
              <TableRow>
                <TableHead>
                  <button onClick={() => toggleSort("name")} className="flex items-center gap-1 text-left cursor-pointer" data-testid="sort-name">
                    Employee <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                  </button>
                </TableHead>
                <TableHead className="text-center">{drilldownType === "dept" ? "Project" : "Department"}</TableHead>
                <TableHead className="text-center">Manager</TableHead>
                <TableHead className="text-center">
                  <button onClick={() => toggleSort("sentiment")} className="flex items-center gap-1 mx-auto cursor-pointer" data-testid="sort-sentiment">
                    Sentiment <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                  </button>
                </TableHead>
                <TableHead className="text-center">
                  <button onClick={() => toggleSort("satisfaction")} className="flex items-center gap-1 mx-auto cursor-pointer" data-testid="sort-satisfaction">
                    Satisfaction <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                  </button>
                </TableHead>
                <TableHead className="text-center">Feedbacks</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((emp: any, idx: number) => (
                <TableRow key={emp.id || idx} data-testid={`row-emp-perf-${emp.id || idx}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-7 h-7">
                        <AvatarFallback className="text-xs">
                          {(emp.firstName?.[0] || "")}{(emp.lastName?.[0] || "")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{emp.firstName} {emp.lastName}</p>
                        <p className="text-xs text-muted-foreground truncate">{emp.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {drilldownType === "dept" ? (emp.projectCode || "—") : (emp.deptCode || "—")}
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {emp.managerEmail ? getManagerName(emp.managerEmail, usersData) : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-semibold ${getSentimentColor(emp.sentimentScaled)}`}>
                      {emp.sentimentScaled > 0 ? emp.sentimentScaled.toFixed(1) : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-medium ${getSentimentColor(emp.avgSatScore)}`}>
                      {emp.avgSatScore > 0 ? emp.avgSatScore.toFixed(1) : "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">{emp.totalFeedback}</TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={emp.sentimentScaled >= 7 ? "default" : emp.sentimentScaled >= 5 ? "secondary" : emp.sentimentScaled > 0 ? "destructive" : "outline"}
                      className={`text-xs ${emp.sentimentScaled >= 7 ? "bg-green-600 text-white no-default-hover-elevate no-default-active-elevate" : ""}`}
                    >
                      {getSentimentLabel(emp.sentimentScaled)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/employee-progress/${emp.id}`}>
                      <Button variant="ghost" size="icon" data-testid={`link-emp-progress-${emp.id}`}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ExecutiveDashboard() {
  const { toast } = useToast();
  const periodOptions = useMemo(() => generatePeriodOptions(), []);
  const [period, setPeriod] = useState(periodOptions[0]);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>("departments");

  const { data: deptData, isLoading: deptLoading } = useDepartmentAnalytics(period);
  const { data: leaderData, isLoading: leaderLoading } = useLeaderAccountability();
  const { data: usersData, isLoading: usersLoading } = useUsersList();
  const { data: projectData, isLoading: projectLoading } = useProjectAnalytics(period);
  const { data: burnoutData, isLoading: burnoutLoading } = useBurnoutRadar();
  const { data: deptEmployees, isLoading: deptEmpLoading } = useEmployeePerformance(selectedDept || undefined);
  const { data: projEmployees, isLoading: projEmpLoading } = useEmployeePerformance(undefined, selectedProject || undefined);

  const allUsersArr = (usersData as any[]) || [];

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
      feedback: d.totalFeedback,
    })) || [],
    [deptData]
  );

  const projectChartData = useMemo(() =>
    projectData?.map((p: any) => ({
      name: p.projectCode || "N/A",
      satisfaction: p.avgSatScore,
      employees: p.employeeCount,
      feedback: p.totalFeedback,
    })) || [],
    [projectData]
  );

  const sortedLeaderData = useMemo(() =>
    leaderData
      ? [...leaderData].sort((a: any, b: any) => (b.overdueCount ?? 0) - (a.overdueCount ?? 0))
      : [],
    [leaderData]
  );

  const managerPerformance = useMemo(() => {
    if (!leaderData || !usersData) return [];
    return sortedLeaderData.map((leader: any) => {
      const reportees = allUsersArr.filter((u: any) => u.managerEmail === leader.managerEmail);
      return {
        ...leader,
        managerName: getManagerName(leader.managerEmail, allUsersArr),
        managerInitials: getManagerInitials(leader.managerEmail, allUsersArr),
        reporteeCount: reportees.length,
        completionRate: leader.totalTasks > 0
          ? Math.round(((leader.totalTasks - leader.pendingCount) / leader.totalTasks) * 100)
          : 0,
      };
    });
  }, [sortedLeaderData, usersData, allUsersArr]);

  const orgSummary = useMemo(() => {
    const employees = allUsersArr.filter((u: any) => u.role === "EMPLOYEE").length;
    const managers = allUsersArr.filter((u: any) => u.role === "MANAGER").length;
    const depts = new Set(allUsersArr.map((u: any) => u.deptCode).filter(Boolean)).size;
    const projects = new Set(allUsersArr.map((u: any) => u.projectCode).filter(Boolean)).size;
    const burnoutCount = burnoutData?.length ?? 0;
    return { employees, managers, depts, projects, burnoutCount };
  }, [usersData, burnoutData, allUsersArr]);

  if (selectedDept) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500" data-testid="dept-drilldown-view">
        <div className="flex flex-row items-center gap-4 flex-wrap">
          <Button variant="outline" onClick={() => setSelectedDept(null)} data-testid="button-back-overview">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Overview
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-dept-name">
              <Building2 className="w-5 h-5 inline mr-2 text-primary" />
              {selectedDept} Department
            </h1>
            <p className="text-muted-foreground text-sm">Employee performance comparison</p>
          </div>
        </div>

        {deptEmpLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : !deptEmployees || deptEmployees.length === 0 ? (
          <Card><CardContent className="p-8 text-center"><Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">No employees found in this department.</p></CardContent></Card>
        ) : (
          <EmployeePerformanceTable data={deptEmployees} usersData={allUsersArr} drilldownLabel={selectedDept} drilldownType="dept" />
        )}
      </div>
    );
  }

  if (selectedProject) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500" data-testid="project-drilldown-view">
        <div className="flex flex-row items-center gap-4 flex-wrap">
          <Button variant="outline" onClick={() => setSelectedProject(null)} data-testid="button-back-overview-project">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Overview
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-project-name">
              <FolderKanban className="w-5 h-5 inline mr-2 text-primary" />
              {selectedProject} Project
            </h1>
            <p className="text-muted-foreground text-sm">Employee performance comparison</p>
          </div>
        </div>

        {projEmpLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : !projEmployees || projEmployees.length === 0 ? (
          <Card><CardContent className="p-8 text-center"><Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">No employees found in this project.</p></CardContent></Card>
        ) : (
          <EmployeePerformanceTable data={projEmployees} usersData={allUsersArr} drilldownLabel={selectedProject} drilldownType="project" />
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
                <SelectItem key={p} value={p} data-testid={`select-period-${p}`}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleNudge} data-testid="button-nudge-managers">
            <Send className="w-4 h-4 mr-2" /> Nudge Managers
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card data-testid="card-org-employees">
          <CardContent className="p-4 text-center">
            <Users className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
            <div className="text-2xl font-bold">{orgSummary.employees}</div>
            <p className="text-xs text-muted-foreground">Employees</p>
          </CardContent>
        </Card>
        <Card data-testid="card-org-managers">
          <CardContent className="p-4 text-center">
            <UserCheck className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
            <div className="text-2xl font-bold">{orgSummary.managers}</div>
            <p className="text-xs text-muted-foreground">Managers</p>
          </CardContent>
        </Card>
        <Card data-testid="card-org-depts">
          <CardContent className="p-4 text-center">
            <Building2 className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
            <div className="text-2xl font-bold">{orgSummary.depts}</div>
            <p className="text-xs text-muted-foreground">Departments</p>
          </CardContent>
        </Card>
        <Card data-testid="card-org-projects">
          <CardContent className="p-4 text-center">
            <FolderKanban className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
            <div className="text-2xl font-bold">{orgSummary.projects}</div>
            <p className="text-xs text-muted-foreground">Projects</p>
          </CardContent>
        </Card>
        <Card data-testid="card-org-burnout">
          <CardContent className="p-4 text-center">
            <Flame className={`w-5 h-5 mx-auto mb-1 ${orgSummary.burnoutCount > 0 ? "text-destructive" : "text-muted-foreground"}`} />
            <div className={`text-2xl font-bold ${orgSummary.burnoutCount > 0 ? "text-destructive" : ""}`}>{orgSummary.burnoutCount}</div>
            <p className="text-xs text-muted-foreground">Burnout Risks</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-2 flex-wrap" data-testid="tab-switcher">
        {(["departments", "projects", "managers"] as ViewTab[]).map(tab => (
          <Button
            key={tab}
            variant={activeTab === tab ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab)}
            data-testid={`tab-${tab}`}
            className="toggle-elevate"
          >
            {tab === "departments" && <Building2 className="w-4 h-4 mr-1" />}
            {tab === "projects" && <FolderKanban className="w-4 h-4 mr-1" />}
            {tab === "managers" && <UserCheck className="w-4 h-4 mr-1" />}
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Button>
        ))}
      </div>

      {activeTab === "departments" && (
        <>
          <section data-testid="section-department-cards">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" /> Department Overview
              <span className="text-sm font-normal text-muted-foreground ml-2">Click a department to drill down</span>
            </h2>
            {deptLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}><CardContent className="p-5 space-y-3"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-10 w-1/2" /><Skeleton className="h-4 w-1/3" /></CardContent></Card>
                ))}
              </div>
            ) : !deptData || deptData.length === 0 ? (
              <Card><CardContent className="p-8 text-center"><Building2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">No department data available for this period.</p></CardContent></Card>
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
                      <p className="text-sm font-medium text-muted-foreground mb-2">{dept.deptCode || "General"}</p>
                      <p className={`text-3xl font-bold ${getSentimentColor(dept.avgSatScore)}`} data-testid={`text-dept-score-${dept.deptCode || idx}`}>
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
                <CardDescription>Average Satisfaction Scores by Department ({period})</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                {deptLoading ? (
                  <div className="flex items-center justify-center h-full"><Skeleton className="h-full w-full" /></div>
                ) : chartData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">No chart data available</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="satisfaction" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Satisfaction" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </section>
        </>
      )}

      {activeTab === "projects" && (
        <section data-testid="section-project-analytics">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <FolderKanban className="w-5 h-5" /> Project Analytics
            <span className="text-sm font-normal text-muted-foreground ml-2">Click a project to drill down</span>
          </h2>
          {projectLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}><CardContent className="p-5 space-y-3"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-10 w-1/2" /><Skeleton className="h-4 w-1/3" /></CardContent></Card>
              ))}
            </div>
          ) : !projectData || projectData.length === 0 ? (
            <Card><CardContent className="p-8 text-center"><FolderKanban className="w-10 h-10 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">No project data available. Assign project codes to employees in the admin panel.</p></CardContent></Card>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {projectData.map((proj: any, idx: number) => (
                  <Card
                    key={proj.projectCode || idx}
                    className="cursor-pointer hover-elevate transition-colors"
                    onClick={() => setSelectedProject(proj.projectCode)}
                    data-testid={`card-project-${proj.projectCode || idx}`}
                  >
                    <CardContent className="p-5">
                      <p className="text-sm font-medium text-muted-foreground mb-2">{proj.projectCode}</p>
                      <p className={`text-3xl font-bold ${getSentimentColor(proj.avgSatScore)}`}>
                        {typeof proj.avgSatScore === "number" ? proj.avgSatScore.toFixed(1) : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Avg. Satisfaction</p>
                      <div className="flex items-center gap-3 mt-3 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{proj.employeeCount} members</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{proj.totalFeedback} feedbacks</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Project Satisfaction Comparison</CardTitle>
                  <CardDescription>Average satisfaction scores across projects ({period})</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="satisfaction" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Satisfaction" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </section>
      )}

      {activeTab === "managers" && (
        <section data-testid="section-manager-performance">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <UserCheck className="w-5 h-5" /> Manager Performance
          </h2>
          {leaderLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : managerPerformance.length === 0 ? (
            <Card><CardContent className="py-6 text-center text-muted-foreground"><CheckCircle2 className="w-10 h-10 mx-auto mb-3" /><p>No manager accountability data available.</p></CardContent></Card>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <Table data-testid="table-manager-performance">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Manager</TableHead>
                      <TableHead className="text-center">Reportees</TableHead>
                      <TableHead className="text-center">Total Tasks</TableHead>
                      <TableHead className="text-center">Completion</TableHead>
                      <TableHead className="text-center">Overdue</TableHead>
                      <TableHead className="text-center">Health</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {managerPerformance.map((leader: any, idx: number) => {
                      const health = getHealthStatus(leader.overdueCount ?? 0);
                      return (
                        <TableRow key={leader.managerEmail || idx} data-testid={`row-mgr-perf-${idx}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="w-7 h-7">
                                <AvatarFallback className="text-xs">{leader.managerInitials}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <span className="font-medium truncate block" data-testid={`text-mgr-name-${idx}`}>
                                  {leader.managerName}
                                </span>
                                <span className="text-xs text-muted-foreground truncate block">{leader.managerEmail}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{leader.reporteeCount}</TableCell>
                          <TableCell className="text-center">{leader.totalTasks ?? 0}</TableCell>
                          <TableCell className="text-center">
                            <span className={leader.completionRate < 50 ? "text-destructive font-semibold" : ""}>
                              {leader.completionRate}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center">{leader.overdueCount ?? 0}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant={health.variant} className={health.className} data-testid={`badge-mgr-health-${idx}`}>
                              {health.label}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {(burnoutData?.length ?? 0) > 0 && (
        <section data-testid="section-burnout-risks">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-destructive" />
                Organization Burnout Risks
              </CardTitle>
              <CardDescription>Employees with significant sentiment drops</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {burnoutData?.map((risk: any) => (
                  <div key={risk.userId} className="flex items-center gap-3 p-2 rounded-md" data-testid={`alert-burnout-${risk.userId}`}>
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-xs">
                        {risk.fullName?.split(" ").map((n: string) => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{risk.fullName}</p>
                      <p className="text-xs text-muted-foreground">
                        {risk.department || "—"}
                        {risk.managerEmail ? ` / ${getManagerName(risk.managerEmail, allUsersArr)}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={risk.riskLevel === "High" ? "destructive" : "secondary"} className="text-xs">
                        {risk.riskLevel}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{risk.dropPercentage}% drop</span>
                      <Link href={`/employee-progress/${risk.userId}`}>
                        <Button variant="ghost" size="icon" data-testid={`link-burnout-progress-${risk.userId}`}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
