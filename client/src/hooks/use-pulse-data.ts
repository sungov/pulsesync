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

// === ANALYTICS HOOKS ===

export function useBurnoutRadar() {
  return useQuery({
    queryKey: [api.analytics.burnout.path],
    queryFn: async () => {
      const res = await fetch(api.analytics.burnout.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch burnout analytics");
      return api.analytics.burnout.responses[200].parse(await res.json());
    },
  });
}

export function useDepartmentAnalytics() {
  return useQuery({
    queryKey: [api.analytics.department.path],
    queryFn: async () => {
      const res = await fetch(api.analytics.department.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch department stats");
      return api.analytics.department.responses[200].parse(await res.json());
    },
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
