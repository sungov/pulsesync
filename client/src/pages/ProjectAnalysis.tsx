import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useProjectTrends, useUsersList, useEmployeePerformance, useProjectHistory } from "@/hooks/use-pulse-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ScatterChart, Scatter, ZAxis, Legend, LineChart, Line } from "recharts";
import { format, subMonths } from "date-fns";
import { Users, FolderKanban, ArrowLeft, AlertTriangle, Eye, TrendingUp, TrendingDown, Award, ArrowUpDown } from "lucide-react";

function scaleSentiment(raw: number): number {
  return raw;
}

function generatePeriodOptions() {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(now, i);
    return format(d, "MMM-yyyy");
  });
}

function getOffsetPeriodClient(period: string, offset: number): string {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const [monthStr, yearStr] = period.split("-");
  let monthIdx = months.indexOf(monthStr);
  let year = parseInt(yearStr);
  monthIdx -= offset;
  while (monthIdx < 0) { monthIdx += 12; year--; }
  while (monthIdx > 11) { monthIdx -= 12; year++; }
  return `${months[monthIdx]}-${year}`;
}

function getLast12PeriodsClient(period: string): string[] {
  const result: string[] = [];
  for (let i = 11; i >= 0; i--) {
    result.push(getOffsetPeriodClient(period, i));
  }
  return result;
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

type CompareMode = "current" | "month" | "quarter" | "year";
type DrilldownType = "dept" | "project";

const COMPARE_LABELS: Record<CompareMode, string> = {
  current: "Current Period",
  month: "vs Last Month",
  quarter: "vs Last Quarter",
  year: "12 Month Trend",
};

const LINE_COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--primary))",
  "hsl(var(--destructive))", "hsl(var(--muted-foreground))"
];

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
      fill: e.sentimentScaled >= 7 ? "hsl(var(--chart-2))" : e.sentimentScaled >= 5 ? "hsl(var(--chart-5))" : "hsl(var(--destructive))",
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
              {avgSentiment > 0 ? avgSentiment.toFixed(1) : "\u2014"}
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
            <CardDescription>Each dot is an employee in {drilldownLabel} -- hover for details. Ideal position is top-right.</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" dataKey="sentiment" name="Sentiment" domain={[0, 10]} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} label={{ value: "Sentiment (0-10)", position: "bottom", offset: 0, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis type="number" dataKey="satisfaction" name="Satisfaction" domain={[0, 10]} stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} label={{ value: "Satisfaction (0-10)", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
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
                    {drilldownType === "dept" ? (emp.projectCode || "\u2014") : (emp.deptCode || "\u2014")}
                  </TableCell>
                  <TableCell className="text-center text-sm text-muted-foreground">
                    {emp.managerEmail ? getManagerName(emp.managerEmail, usersData) : "\u2014"}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-semibold ${getSentimentColor(emp.sentimentScaled)}`}>
                      {emp.sentimentScaled > 0 ? emp.sentimentScaled.toFixed(1) : "\u2014"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-medium ${getSentimentColor(emp.avgSatScore)}`}>
                      {emp.avgSatScore > 0 ? emp.avgSatScore.toFixed(1) : "\u2014"}
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

export default function ProjectAnalysis() {
  const periodOptions = useMemo(() => generatePeriodOptions(), []);
  const [period, setPeriod] = useState(periodOptions[0]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState<CompareMode>("month");

  const compareParam = compareMode === "current" || compareMode === "year" ? undefined : compareMode;
  const { data: projectData, isLoading: projectLoading } = useProjectTrends(period, compareParam);
  const { data: usersData } = useUsersList();
  const { data: projEmployees, isLoading: projEmpLoading } = useEmployeePerformance(undefined, selectedProject || undefined);
  const { data: projHistoryRaw, isLoading: projHistLoading } = useProjectHistory(period, compareMode === "year");

  const allUsersArr = (usersData as any[]) || [];
  const showTrends = compareMode === "month" || compareMode === "quarter";

  const projectChartData = useMemo(() =>
    projectData?.map((p: any) => ({
      name: p.projectCode || "N/A",
      satisfaction: p.avgSatScore,
      employees: p.employeeCount,
      feedback: p.totalFeedback,
    })) || [],
    [projectData]
  );

  const projHistoryLines = useMemo(() => {
    if (!projHistoryRaw || !Array.isArray(projHistoryRaw)) return { chartData: [], projects: [] };
    const projects = Array.from(new Set(projHistoryRaw.map((r: any) => r.projectCode))) as string[];
    const periodMap = new Map<string, Record<string, number>>();
    for (const r of projHistoryRaw) {
      if (!periodMap.has(r.period)) periodMap.set(r.period, {});
      periodMap.get(r.period)![r.projectCode] = r.avgSatScore;
    }
    const periods = getLast12PeriodsClient(period);
    const lineChartData = periods.map(p => {
      const row: any = { period: p };
      for (const proj of projects) {
        row[proj] = periodMap.get(p)?.[proj] ?? null;
      }
      return row;
    });
    return { chartData: lineChartData, projects };
  }, [projHistoryRaw, period]);

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
    <div className="space-y-8 animate-in fade-in duration-500" data-testid="project-analysis-page">
      <header className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-page-title">Project Analysis</h1>
          <p className="text-muted-foreground mt-1">Project-level performance and satisfaction metrics</p>
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
          <Select value={compareMode} onValueChange={(v) => setCompareMode(v as CompareMode)} data-testid="select-compare-mode">
            <SelectTrigger className="w-[180px]" data-testid="select-compare-trigger">
              <SelectValue placeholder="Compare..." />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(COMPARE_LABELS) as CompareMode[]).map(mode => (
                <SelectItem key={mode} value={mode} data-testid={`select-compare-${mode}`}>{COMPARE_LABELS[mode]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

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
              {projectData.map((proj: any, idx: number) => {
                const trend = proj.trend;
                return (
                  <Card
                    key={proj.projectCode || idx}
                    className="cursor-pointer hover-elevate transition-colors"
                    onClick={() => setSelectedProject(proj.projectCode)}
                    data-testid={`card-project-${proj.projectCode || idx}`}
                  >
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="text-sm font-medium text-muted-foreground">{proj.projectCode}</p>
                        {showTrends && trend != null && trend > 0.2 && (
                          <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 text-xs">
                            <TrendingUp className="w-3 h-3 mr-0.5" /> +{trend.toFixed(1)}
                          </Badge>
                        )}
                        {showTrends && trend != null && trend < -0.2 && (
                          <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 text-xs">
                            <TrendingDown className="w-3 h-3 mr-0.5" /> {trend.toFixed(1)}
                          </Badge>
                        )}
                        {showTrends && trend != null && Math.abs(trend) <= 0.2 && (
                          <span className="text-xs text-muted-foreground">Stable</span>
                        )}
                      </div>
                      <p className={`text-3xl font-bold ${getSentimentColor(proj.avgSatScore)}`}>
                        {typeof proj.avgSatScore === "number" ? proj.avgSatScore.toFixed(1) : "\u2014"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Avg. Satisfaction</p>
                      <div className="flex items-center gap-1 mt-3">
                        <Users className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">{proj.employeeCount ?? 0} members</span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {compareMode === "year" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Project Satisfaction Trend</CardTitle>
                  <CardDescription>12-month satisfaction scores by project (ending {period})</CardDescription>
                </CardHeader>
                <CardContent className="h-[400px]">
                  {projHistLoading ? (
                    <div className="flex items-center justify-center h-full"><Skeleton className="h-full w-full" /></div>
                  ) : projHistoryLines.chartData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">No historical data available</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={projHistoryLines.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} angle={-30} textAnchor="end" height={60} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} domain={[0, 10]} />
                        <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px", color: "hsl(var(--card-foreground))" }} />
                        <Legend />
                        {projHistoryLines.projects.map((proj, i) => (
                          <Line
                            key={proj}
                            type="monotone"
                            dataKey={proj}
                            stroke={LINE_COLORS[i % LINE_COLORS.length]}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            connectNulls
                            name={proj}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Project Satisfaction Comparison</CardTitle>
                  <CardDescription>Average satisfaction scores across projects ({period})</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px", color: "hsl(var(--card-foreground))" }} />
                      <Bar dataKey="satisfaction" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} name="Satisfaction" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </section>
    </div>
  );
}