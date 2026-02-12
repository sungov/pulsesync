import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { type InsertFeedback, type InsertManagerReview, type InsertActionItem } from "@shared/schema";
import { type User } from "@shared/models/auth";
import { useToast } from "@/hooks/use-toast";

// === FEEDBACK HOOKS ===

export function useFeedbackList(userId?: string, period?: string) {
  const queryParams = new URLSearchParams();
  if (userId) queryParams.append("userId", userId);
  if (period) queryParams.append("period", period);
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

  return useQuery({
    queryKey: [api.feedback.list.path, userId, period],
    queryFn: async () => {
      const res = await fetch(`${api.feedback.list.path}${queryString}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch feedback");
      return api.feedback.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateFeedback() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertFeedback) => {
      const res = await fetch(api.feedback.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
           // Try to parse validation error
           try {
             const error = await res.json();
             throw new Error(error.message || "Validation failed");
           } catch (e) {
             throw new Error("Failed to create feedback");
           }
        }
        throw new Error("Failed to create feedback");
      }
      return api.feedback.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.feedback.list.path] });
      toast({
        title: "Feedback Synced",
        description: "Your feedback has been successfully submitted and analyzed by AI.",
      });
    },
    onError: (error) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });
}

// === ACTION ITEMS HOOKS ===

export function useActionItems(empEmail?: string, mgrEmail?: string) {
  const queryParams = new URLSearchParams();
  if (empEmail) queryParams.append("empEmail", empEmail);
  if (mgrEmail) queryParams.append("mgrEmail", mgrEmail);
  
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

  return useQuery({
    queryKey: [api.actionItems.list.path, empEmail, mgrEmail],
    queryFn: async () => {
      const res = await fetch(`${api.actionItems.list.path}${queryString}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch action items");
      return api.actionItems.list.responses[200].parse(await res.json());
    },
  });
}

export function useActionItemsForUser(email?: string) {
  return useQuery({
    queryKey: [api.actionItems.list.path, "forUser", email],
    queryFn: async () => {
      const res = await fetch(`${api.actionItems.list.path}?forUser=${encodeURIComponent(email!)}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch action items");
      return api.actionItems.list.responses[200].parse(await res.json());
    },
    enabled: !!email,
  });
}

export function useCreateActionItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertActionItem) => {
      const res = await fetch(api.actionItems.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create action item");
      return api.actionItems.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.actionItems.list.path] });
      toast({ title: "Task Assigned", description: "Action item has been created." });
    },
  });
}

export function useUpdateActionItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<InsertActionItem> }) => {
      const url = buildUrl(api.actionItems.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update action item");
      return api.actionItems.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.actionItems.list.path] });
      toast({ title: "Task Updated", description: "Action item status changed." });
    },
  });
}

export function useDeleteActionItem() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.actionItems.delete.path, { id });
      const res = await fetch(url, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete action item");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.actionItems.list.path] });
      toast({ title: "Task Deleted", description: "Action item removed." });
    },
  });
}

// === REVIEW HOOKS ===

export function useReviewByFeedback(feedbackId?: number) {
  return useQuery({
    queryKey: ['/api/reviews', feedbackId],
    queryFn: async () => {
      const url = buildUrl(api.reviews.get.path, { feedbackId: feedbackId! });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch review");
      return res.json();
    },
    enabled: !!feedbackId,
  });
}

export function useUpsertReview() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertManagerReview) => {
      const res = await fetch(api.reviews.upsert.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to save review");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reviews'] });
      queryClient.invalidateQueries({ queryKey: [api.analytics.teamFeedback.path] });
      toast({ title: "Review Saved", description: "Manager review has been saved." });
    },
  });
}

// === ANALYTICS HOOKS ===

export function useBurnoutRadar(managerEmail?: string) {
  const queryString = managerEmail ? `?managerEmail=${encodeURIComponent(managerEmail)}` : "";
  return useQuery({
    queryKey: [api.analytics.burnout.path, managerEmail],
    queryFn: async () => {
      const res = await fetch(`${api.analytics.burnout.path}${queryString}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch burnout analytics");
      return api.analytics.burnout.responses[200].parse(await res.json());
    },
  });
}

export function useTeamFeedback(managerEmail?: string, period?: string) {
  const queryParams = new URLSearchParams();
  if (managerEmail) queryParams.append("managerEmail", managerEmail);
  if (period) queryParams.append("period", period);
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

  return useQuery({
    queryKey: [api.analytics.teamFeedback.path, managerEmail, period],
    queryFn: async () => {
      const res = await fetch(`${api.analytics.teamFeedback.path}${queryString}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch team feedback");
      return res.json();
    },
    enabled: !!managerEmail,
  });
}

export function useLeaderAccountability() {
  return useQuery({
    queryKey: [api.analytics.leaderAccountability.path],
    queryFn: async () => {
      const res = await fetch(api.analytics.leaderAccountability.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch leader accountability");
      return res.json();
    },
  });
}

export function useDepartmentAnalytics(period?: string) {
  const queryString = period ? `?period=${period}` : "";
  return useQuery({
    queryKey: [api.analytics.department.path, period],
    queryFn: async () => {
      const res = await fetch(`${api.analytics.department.path}${queryString}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch department stats");
      return api.analytics.department.responses[200].parse(await res.json());
    },
  });
}

export function useProjectAnalytics(period?: string) {
  const queryString = period ? `?period=${period}` : "";
  return useQuery({
    queryKey: [api.analytics.projectAnalytics.path, period],
    queryFn: async () => {
      const res = await fetch(`${api.analytics.projectAnalytics.path}${queryString}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch project analytics");
      return api.analytics.projectAnalytics.responses[200].parse(await res.json());
    },
  });
}

export function useDepartmentTrends(period?: string, compareWith?: string) {
  const params = new URLSearchParams();
  if (period) params.set("period", period);
  if (compareWith) params.set("compareWith", compareWith);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return useQuery({
    queryKey: ["/api/analytics/department-trends", period, compareWith],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/department-trends${qs}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch department trends");
      return res.json();
    },
    enabled: !!period,
  });
}

export function useProjectTrends(period?: string, compareWith?: string) {
  const params = new URLSearchParams();
  if (period) params.set("period", period);
  if (compareWith) params.set("compareWith", compareWith);
  const qs = params.toString() ? `?${params.toString()}` : "";
  return useQuery({
    queryKey: ["/api/analytics/project-trends", period, compareWith],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/project-trends${qs}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch project trends");
      return res.json();
    },
    enabled: !!period,
  });
}

export function useDepartmentHistory(period?: string, enabled = true) {
  const qs = period ? `?period=${period}` : "";
  return useQuery({
    queryKey: ["/api/analytics/department-history", period],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/department-history${qs}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch department history");
      return res.json();
    },
    enabled: !!period && enabled,
  });
}

export function useProjectHistory(period?: string, enabled = true) {
  const qs = period ? `?period=${period}` : "";
  return useQuery({
    queryKey: ["/api/analytics/project-history", period],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/project-history${qs}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch project history");
      return res.json();
    },
    enabled: !!period && enabled,
  });
}

export function useEmployeePerformance(dept?: string, project?: string) {
  const params = new URLSearchParams();
  if (dept) params.append("dept", dept);
  if (project) params.append("project", project);
  const queryString = params.toString() ? `?${params.toString()}` : "";
  const enabled = !!(dept || project);

  return useQuery({
    queryKey: ["/api/analytics/employee-performance", dept, project],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/employee-performance${queryString}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch employee performance");
      return res.json();
    },
    enabled,
  });
}

// === USERS HOOKS ===

export function useUsersList(role?: string, managerEmail?: string) {
  const queryParams = new URLSearchParams();
  if (role) queryParams.append("role", role);
  if (managerEmail) queryParams.append("managerEmail", managerEmail);
  const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

  return useQuery({
    queryKey: [api.users.list.path, role, managerEmail],
    queryFn: async () => {
      const res = await fetch(`${api.users.list.path}${queryString}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch users");
      return api.users.list.responses[200].parse(await res.json());
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string, updates: any }) => {
      const url = buildUrl(api.users.update.path, { id });
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update user profile");
      return api.users.update.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.users.list.path] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] }); // Refresh current user too
      toast({ title: "Profile Updated", description: "User role/details updated." });
    }
  });
}
