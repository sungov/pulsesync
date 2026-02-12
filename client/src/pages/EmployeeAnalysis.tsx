import { useState, useMemo, useEffect, useRef } from "react";
import { Link } from "wouter";
import { useAllEmployeePerformance, useUsersList } from "@/hooks/use-pulse-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Search, Eye, TrendingUp, TrendingDown, ArrowUpDown, Activity, Brain, ListTodo, Briefcase } from "lucide-react";

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

function getMoodBadgeVariant(mood: string | null): "default" | "secondary" | "destructive" | "outline" {
  if (!mood) return "outline";
  if (mood === "Great" || mood === "Good") return "default";
  if (mood === "Neutral") return "secondary";
  return "destructive";
}

function getManagerName(email: string, usersData: any[]) {
  const mgr = usersData.find((u: any) => u.email === email);
  if (mgr && mgr.firstName && mgr.lastName) return `${mgr.firstName} ${mgr.lastName}`;
  if (mgr && mgr.firstName) return mgr.firstName;
  return email?.split("@")[0] || "Unknown";
}

type SortField = "name" | "sentiment" | "satisfaction" | "feedback" | "workload" | "wlb" | "actions";
type SortDir = "asc" | "desc";
type FilterRole = "all" | "EMPLOYEE" | "MANAGER";

export default function EmployeeAnalysis() {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("sentiment");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filterDept, setFilterDept] = useState<string>("all");
  const [filterRole, setFilterRole] = useState<FilterRole>("all");

  const { data: employees, isLoading } = useAllEmployeePerformance(debouncedSearch || undefined);
  const { data: usersData } = useUsersList();
  const allUsersArr = (usersData as any[]) || [];

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchInput), 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  const departments = useMemo(() => {
    if (!employees) return [];
    const depts = new Set<string>();
    employees.forEach((e: any) => { if (e.deptCode) depts.add(e.deptCode); });
    return Array.from(depts).sort();
  }, [employees]);

  const filtered = useMemo(() => {
    if (!employees) return [];
    let list = [...employees];
    if (filterDept !== "all") list = list.filter((e: any) => e.deptCode === filterDept);
    if (filterRole !== "all") list = list.filter((e: any) => e.role === filterRole);

    list.sort((a: any, b: any) => {
      let valA: number, valB: number;
      switch (sortField) {
        case "name": return sortDir === "asc"
          ? `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
          : `${b.firstName} ${b.lastName}`.localeCompare(`${a.firstName} ${a.lastName}`);
        case "sentiment": valA = a.latestSentiment; valB = b.latestSentiment; break;
        case "satisfaction": valA = a.avgSatScore; valB = b.avgSatScore; break;
        case "feedback": valA = a.totalFeedback; valB = b.totalFeedback; break;
        case "workload": valA = a.avgWorkload; valB = b.avgWorkload; break;
        case "wlb": valA = a.avgWlb; valB = b.avgWlb; break;
        case "actions": valA = a.pendingActions; valB = b.pendingActions; break;
        default: valA = 0; valB = 0;
      }
      return sortDir === "asc" ? valA - valB : valB - valA;
    });
    return list;
  }, [employees, filterDept, filterRole, sortField, sortDir]);

  const kpis = useMemo(() => {
    if (!filtered || filtered.length === 0) return null;
    const total = filtered.length;
    const avgSent = filtered.reduce((s: number, e: any) => s + e.latestSentiment, 0) / total;
    const avgSat = filtered.reduce((s: number, e: any) => s + e.avgSatScore, 0) / total;
    const atRisk = filtered.filter((e: any) => e.latestSentiment > 0 && e.latestSentiment < 4).length;
    const noFeedback = filtered.filter((e: any) => e.totalFeedback === 0).length;
    const pendingActs = filtered.reduce((s: number, e: any) => s + e.pendingActions, 0);
    return { total, avgSent, avgSat, atRisk, noFeedback, pendingActs };
  }, [filtered]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir(field === "name" ? "asc" : "asc");
    }
  };

  const SortHeader = ({ field, label }: { field: SortField; label: string }) => (
    <TableHead
      className="cursor-pointer select-none"
      onClick={() => toggleSort(field)}
      data-testid={`th-sort-${field}`}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${sortField === field ? "text-primary" : "text-muted-foreground/50"}`} />
      </div>
    </TableHead>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header>
        <h1 className="text-3xl font-display font-bold text-foreground" data-testid="text-page-title">
          Employee Directory
        </h1>
        <p className="text-muted-foreground mt-1">Search and analyze individual employee performance across the organization</p>
      </header>

      <section className="flex items-center gap-3 flex-wrap" data-testid="section-filters">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, department, or project..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
            data-testid="input-search-employee"
          />
        </div>
        <Select value={filterDept} onValueChange={setFilterDept} data-testid="select-filter-dept">
          <SelectTrigger className="w-[160px]" data-testid="select-filter-dept-trigger">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map(d => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterRole} onValueChange={(v) => setFilterRole(v as FilterRole)} data-testid="select-filter-role">
          <SelectTrigger className="w-[140px]" data-testid="select-filter-role-trigger">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="EMPLOYEE">Employee</SelectItem>
            <SelectItem value="MANAGER">Manager</SelectItem>
          </SelectContent>
        </Select>
      </section>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-4 space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-8 w-1/2" /></CardContent></Card>
          ))}
        </div>
      ) : kpis && (
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" data-testid="section-kpi-cards">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Total Employees</p>
              </div>
              <p className="text-2xl font-bold text-foreground" data-testid="text-kpi-total">{kpis.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Brain className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Avg Wellness</p>
              </div>
              <p className={`text-2xl font-bold ${getSentimentColor(kpis.avgSent)}`} data-testid="text-kpi-wellness">{kpis.avgSent.toFixed(1)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Avg Satisfaction</p>
              </div>
              <p className={`text-2xl font-bold ${getSentimentColor(kpis.avgSat)}`} data-testid="text-kpi-satisfaction">{kpis.avgSat.toFixed(1)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-destructive" />
                <p className="text-xs text-muted-foreground">At Risk</p>
              </div>
              <p className="text-2xl font-bold text-destructive" data-testid="text-kpi-atrisk">{kpis.atRisk}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Briefcase className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">No Feedback</p>
              </div>
              <p className="text-2xl font-bold text-foreground" data-testid="text-kpi-nofeedback">{kpis.noFeedback}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <ListTodo className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Pending Actions</p>
              </div>
              <p className="text-2xl font-bold text-foreground" data-testid="text-kpi-pendingactions">{kpis.pendingActs}</p>
            </CardContent>
          </Card>
        </section>
      )}

      <section data-testid="section-employee-table">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Employee Performance Overview
            </CardTitle>
            <CardDescription>
              {filtered.length} employee{filtered.length !== 1 ? "s" : ""} found
              {debouncedSearch && ` matching "${debouncedSearch}"`}
              {filterDept !== "all" && ` in ${filterDept}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No employees found matching your criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortHeader field="name" label="Employee" />
                      <TableHead>Department</TableHead>
                      <TableHead>Project</TableHead>
                      <SortHeader field="sentiment" label="Wellness" />
                      <SortHeader field="satisfaction" label="Avg Satisfaction" />
                      <TableHead>Mood</TableHead>
                      <SortHeader field="feedback" label="Submissions" />
                      <SortHeader field="workload" label="Workload" />
                      <SortHeader field="wlb" label="WLB" />
                      <SortHeader field="actions" label="Actions" />
                      <TableHead>Manager</TableHead>
                      <TableHead className="text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((emp: any) => (
                      <TableRow key={emp.id} data-testid={`row-employee-${emp.id}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {emp.firstName?.[0]}{emp.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium text-foreground">{emp.firstName} {emp.lastName}</p>
                              <p className="text-xs text-muted-foreground">{emp.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{emp.deptCode || "N/A"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">{emp.projectCode || "N/A"}</Badge>
                        </TableCell>
                        <TableCell>
                          {emp.latestSentiment > 0 ? (
                            <div className="flex items-center gap-1.5">
                              <span className={`text-sm font-semibold ${getSentimentColor(emp.latestSentiment)}`}>
                                {emp.latestSentiment.toFixed(1)}
                              </span>
                              <span className="text-xs text-muted-foreground">/ 10</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No data</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {emp.avgSatScore > 0 ? (
                            <span className={`text-sm font-semibold ${getSentimentColor(emp.avgSatScore)}`}>
                              {emp.avgSatScore.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {emp.latestMood ? (
                            <Badge variant={getMoodBadgeVariant(emp.latestMood)} className="text-xs">
                              {emp.latestMood}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-foreground">{emp.totalFeedback}</span>
                        </TableCell>
                        <TableCell>
                          {emp.avgWorkload > 0 ? (
                            <span className={`text-sm ${emp.avgWorkload >= 4 ? "text-destructive font-medium" : "text-foreground"}`}>
                              {emp.avgWorkload.toFixed(1)}/5
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {emp.avgWlb > 0 ? (
                            <span className={`text-sm ${emp.avgWlb < 2.5 ? "text-destructive font-medium" : "text-foreground"}`}>
                              {emp.avgWlb.toFixed(1)}/5
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {emp.pendingActions > 0 ? (
                            <Badge variant="destructive" className="text-xs">{emp.pendingActions} pending</Badge>
                          ) : emp.totalActions > 0 ? (
                            <Badge variant="secondary" className="text-xs">{emp.totalActions} done</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {emp.managerEmail ? getManagerName(emp.managerEmail, allUsersArr) : "N/A"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/employee-progress/${emp.id}`}>
                            <Button variant="ghost" size="sm" data-testid={`button-view-employee-${emp.id}`}>
                              <Eye className="w-4 h-4 mr-1" /> View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
