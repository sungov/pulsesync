import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useDepartmentAnalytics, useLeaderAccountability, useUsersList, useProjectAnalytics, useBurnoutRadar } from "@/hooks/use-pulse-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subMonths } from "date-fns";
import { Send, Users, Building2, ArrowLeft, AlertTriangle, CheckCircle2, Eye, FolderKanban, UserCheck, Flame } from "lucide-react";
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

const CHART_COLORS = ["#4f46e5", "#818cf8", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

type ViewTab = "departments" | "projects" | "managers";

export default function ExecutiveDashboard() {
  const { toast } = useToast();
  const periodOptions = useMemo(() => generatePeriodOptions(), []);
  const [period, setPeriod] = useState(periodOptions[0]);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>("departments");

  const { data: deptData, isLoading: deptLoading } = useDepartmentAnalytics(period);
  const { data: leaderData, isLoading: leaderLoading } = useLeaderAccountability();
  const { data: usersData, isLoading: usersLoading } = useUsersList();
  const { data: projectData, isLoading: projectLoading } = useProjectAnalytics(period);
  const { data: burnoutData, isLoading: burnoutLoading } = useBurnoutRadar();

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
      const reportees = (usersData as any[]).filter((u: any) => u.managerEmail === leader.managerEmail);
      return {
        ...leader,
        reporteeCount: reportees.length,
        completionRate: leader.totalTasks > 0 
          ? Math.round(((leader.totalTasks - leader.pendingCount) / leader.totalTasks) * 100)
          : 0,
      };
    });
  }, [sortedLeaderData, usersData]);

  const deptEmployees = useMemo(() => {
    if (!selectedDept || !usersData) return [];
    return (usersData as any[]).filter((u: any) => u.deptCode === selectedDept);
  }, [selectedDept, usersData]);

  const orgSummary = useMemo(() => {
    const allUsersArr = (usersData as any[]) || [];
    const employees = allUsersArr.filter((u: any) => u.role === "EMPLOYEE").length;
    const managers = allUsersArr.filter((u: any) => u.role === "MANAGER").length;
    const depts = new Set(allUsersArr.map((u: any) => u.deptCode).filter(Boolean)).size;
    const projects = new Set(allUsersArr.map((u: any) => u.projectCode).filter(Boolean)).size;
    const burnoutCount = burnoutData?.length ?? 0;
    return { employees, managers, depts, projects, burnoutCount };
  }, [usersData, burnoutData]);

  if (selectedDept) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500" data-testid="dept-drilldown-view">
        <div className="flex flex-row items-center gap-4 flex-wrap">
          <Button variant="outline" onClick={() => setSelectedDept(null)} data-testid="button-back-overview">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Overview
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-dept-name">{selectedDept} Department</h1>
            <p className="text-muted-foreground text-sm">Employee breakdown</p>
          </div>
        </div>

        {usersLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i}><CardContent className="p-4 space-y-3"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-1/3" /></CardContent></Card>
            ))}
          </div>
        ) : deptEmployees.length === 0 ? (
          <Card><CardContent className="p-8 text-center"><Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" /><p className="text-muted-foreground">No employees found in this department.</p></CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deptEmployees.map((emp: any, idx: number) => (
              <Card key={emp.id || idx} data-testid={`card-employee-${emp.id || idx}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground" data-testid={`text-employee-name-${emp.id || idx}`}>
                      {emp.firstName && emp.lastName ? `${emp.firstName} ${emp.lastName}` : emp.email || "Unknown"}
                    </h3>
                    <Badge variant="secondary" className="text-xs">{emp.role || "Employee"}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{emp.email}</p>
                  {emp.projectCode && <p className="text-xs text-muted-foreground">Project: {emp.projectCode}</p>}
                  <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                    <span className="text-xs text-muted-foreground">{emp.managerEmail ? `Mgr: ${emp.managerEmail.split("@")[0]}` : "No manager"}</span>
                    <Link href={`/employee-progress/${emp.id}`}>
                      <Button variant="ghost" size="sm" data-testid={`link-view-progress-${emp.id || idx}`}>
                        <Eye className="w-3 h-3 mr-1" /> View
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
                  <Card key={proj.projectCode || idx} data-testid={`card-project-${proj.projectCode || idx}`}>
                    <CardContent className="p-5">
                      <p className="text-sm font-medium text-muted-foreground mb-2">{proj.projectCode}</p>
                      <p className={`text-3xl font-bold ${proj.avgSatScore < 5 ? "text-destructive" : "text-foreground"}`}>
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
                                <AvatarFallback className="text-xs">{leader.managerEmail?.charAt(0)?.toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium truncate max-w-[200px]" data-testid={`text-mgr-email-${idx}`}>
                                {leader.managerEmail}
                              </span>
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
                      <p className="text-xs text-muted-foreground">{risk.department || "—"} {risk.managerEmail ? `/ ${risk.managerEmail.split("@")[0]}` : ""}</p>
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
