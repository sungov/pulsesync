import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import { setupAuth, isAuthenticated, isAdmin } from "./auth";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { passwordResetTokens } from "@shared/schema";
import { eq, and, gt } from "drizzle-orm";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  await setupAuth(app);

  app.get("/api/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    const allUsers = await storage.getAllUsers();
    const safe = allUsers.map(u => {
      const { password, ...rest } = u;
      return rest;
    });
    res.json(safe);
  });

  const adminCreateUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    role: z.enum(["EMPLOYEE", "MANAGER", "SENIOR_MGMT"]).default("EMPLOYEE"),
    deptCode: z.string().optional(),
    projectCode: z.string().optional(),
    managerEmail: z.string().email().optional(),
  });

  app.post("/api/admin/users", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const parsed = adminCreateUserSchema.parse(req.body);
      const existing = await storage.getUserByEmail(parsed.email);
      if (existing) {
        return res.status(409).json({ message: "User with this email already exists" });
      }
      const hashed = await bcrypt.hash(parsed.password, 10);
      const newUser = await storage.createUser({
        email: parsed.email,
        password: hashed,
        firstName: parsed.firstName || null,
        lastName: parsed.lastName || null,
        role: parsed.role,
        deptCode: parsed.deptCode || null,
        projectCode: parsed.projectCode || null,
        managerEmail: parsed.managerEmail || null,
        isApproved: true,
        isAdmin: false,
      });
      const { password: _, ...safe } = newUser;
      res.status(201).json(safe);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Admin create user error:", err);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/admin/users/:id/approve", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const updated = await storage.updateUser(req.params.id as string, { isApproved: true });
      const { password, ...safe } = updated;
      res.json(safe);
    } catch (err) {
      res.status(404).json({ message: "User not found" });
    }
  });

  app.patch("/api/admin/users/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { firstName, lastName, email, deptCode, projectCode, managerEmail, role, password } = req.body;
      const updates: any = {};
      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (email !== undefined) {
        if (typeof email !== "string" || !email.includes("@")) {
          return res.status(400).json({ message: "Invalid email format" });
        }
        const existing = await storage.getUserByEmail(email);
        if (existing && existing.id !== req.params.id) {
          return res.status(409).json({ message: "Another user with this email already exists" });
        }
        updates.email = email;
      }
      if (deptCode !== undefined) updates.deptCode = deptCode || null;
      if (projectCode !== undefined) updates.projectCode = projectCode || null;
      if (managerEmail !== undefined) updates.managerEmail = managerEmail || null;
      if (role) {
        if (!["EMPLOYEE", "MANAGER", "SENIOR_MGMT"].includes(role)) {
          return res.status(400).json({ message: "Invalid role" });
        }
        updates.role = role;
      }
      if (password) {
        if (password.length < 6) {
          return res.status(400).json({ message: "Password must be at least 6 characters" });
        }
        updates.password = await bcrypt.hash(password, 10);
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }
      const updated = await storage.updateUser(req.params.id as string, updates);
      const { password: _, ...safe } = updated;
      res.json(safe);
    } catch (err) {
      console.error("Admin update user error:", err);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.patch("/api/admin/users/:id/role", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { role } = req.body;
      if (!["EMPLOYEE", "MANAGER", "SENIOR_MGMT"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      const updated = await storage.updateUser(req.params.id as string, { role });
      const { password, ...safe } = updated;
      res.json(safe);
    } catch (err) {
      res.status(404).json({ message: "User not found" });
    }
  });

  app.patch("/api/admin/users/:id/admin", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { isAdmin: makeAdmin } = req.body;
      const updated = await storage.updateUser(req.params.id as string, { isAdmin: !!makeAdmin });
      const { password, ...safe } = updated;
      res.json(safe);
    } catch (err) {
      res.status(404).json({ message: "User not found" });
    }
  });

  app.delete("/api/admin/users/:id", isAuthenticated, isAdmin, async (req, res) => {
    try {
      await storage.deleteUser(req.params.id as string);
      res.json({ message: "User deleted" });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  app.get("/api/admin/password-resets", isAuthenticated, isAdmin, async (req, res) => {
    try {
      const pending = await db.select().from(passwordResetTokens).where(
        and(
          eq(passwordResetTokens.used, false),
          gt(passwordResetTokens.expiresAt, new Date())
        )
      );
      res.json(pending);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch reset requests" });
    }
  });

  app.get("/api/feedback/check-period", isAuthenticated, async (req, res) => {
    const userId = (req.session as any)?.userId;
    const period = req.query.period as string;
    if (!userId || !period) {
      return res.status(400).json({ message: "period is required" });
    }
    const existing = await storage.getFeedbackByUserAndPeriod(userId, period);
    if (existing) {
      const review = await storage.getReviewByFeedbackId(existing.id);
      return res.json({ exists: true, feedbackId: existing.id, reviewed: !!review });
    }
    res.json({ exists: false, feedbackId: null, reviewed: false });
  });

  app.put("/api/feedback/:id", isAuthenticated, async (req, res) => {
    try {
      const feedbackId = parseInt(req.params.id);
      const userId = (req.session as any)?.userId;
      const existing = await storage.getFeedback(feedbackId);
      if (!existing) {
        return res.status(404).json({ message: "Feedback not found" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ message: "You can only edit your own feedback." });
      }
      const review = await storage.getReviewByFeedbackId(feedbackId);
      if (review) {
        return res.status(403).json({ message: "This feedback has been reviewed and can no longer be modified." });
      }

      const input = api.feedback.create.input.parse(req.body);

      const textToAnalyze = `
        Accomplishments: ${input.accomplishments}
        Disappointments: ${input.disappointments}
        Blockers: ${input.blockers}
        Mentoring: ${input.mentoringCulture}
        Support: ${input.supportNeeds}
        Goals: ${input.goalProgress}
        Suggestions: ${input.processSuggestions}
      `;

      let aiSentiment = existing.aiSentiment ?? 0.5;
      let aiSummary = existing.aiSummary ?? "Analysis pending...";
      let aiSuggestedActionItems = existing.aiSuggestedActionItems ?? "";

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are an HR analytics AI. Analyze the employee feedback. Return a JSON object with 'sentiment' (float 0.0 to 1.0), 'summary' (brief 1-sentence summary), and 'suggestedActionItems' (bullet points if blockers or risks are identified)." },
            { role: "user", content: textToAnalyze }
          ],
          response_format: { type: "json_object" }
        });

        const result = JSON.parse(response.choices[0].message.content || "{}");
        aiSentiment = result.sentiment || 0.5;
        aiSummary = result.summary || "No summary available.";
        aiSuggestedActionItems = result.suggestedActionItems || "";
      } catch (aiError) {
        console.error("AI Analysis failed:", aiError);
      }

      const updated = await storage.updateFeedback(feedbackId, {
        satScore: input.satScore,
        moodScore: input.moodScore,
        workloadLevel: input.workloadLevel,
        workLifeBalance: input.workLifeBalance,
        accomplishments: input.accomplishments,
        disappointments: input.disappointments,
        blockers: input.blockers,
        mentoringCulture: input.mentoringCulture,
        supportNeeds: input.supportNeeds,
        goalProgress: input.goalProgress,
        processSuggestions: input.processSuggestions,
        ptoCoverage: input.ptoCoverage,
        aiSentiment,
        aiSummary,
        aiSuggestedActionItems,
      });

      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        console.error("Feedback update error:", err);
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  app.post(api.feedback.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.feedback.create.input.parse(req.body);

      const existingFeedback = await storage.getFeedbackByUserAndPeriod(input.userId, input.submissionPeriod);
      if (existingFeedback) {
        const review = await storage.getReviewByFeedbackId(existingFeedback.id);
        if (review) {
          return res.status(403).json({ message: "This feedback has been reviewed by your manager and can no longer be modified." });
        }
        return res.status(409).json({ message: "You have already submitted feedback for this period." });
      }
      
      const textToAnalyze = `
        Accomplishments: ${input.accomplishments}
        Disappointments: ${input.disappointments}
        Blockers: ${input.blockers}
        Mentoring: ${input.mentoringCulture}
        Support: ${input.supportNeeds}
        Goals: ${input.goalProgress}
        Suggestions: ${input.processSuggestions}
      `;
      
      let aiSentiment = 0.5;
      let aiSummary = "Analysis pending...";
      let aiSuggestedActionItems = "";

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are an HR analytics AI. Analyze the employee feedback. Return a JSON object with 'sentiment' (float 0.0 to 1.0), 'summary' (brief 1-sentence summary), and 'suggestedActionItems' (bullet points if blockers or risks are identified)." },
            { role: "user", content: textToAnalyze }
          ],
          response_format: { type: "json_object" }
        });

        const result = JSON.parse(response.choices[0].message.content || "{}");
        aiSentiment = result.sentiment || 0.5;
        aiSummary = result.summary || "No summary available.";
        aiSuggestedActionItems = result.suggestedActionItems || "";
      } catch (aiError) {
        console.error("AI Analysis failed:", aiError);
      }

      const feedbackData = await storage.createFeedback({
        ...input,
        aiSentiment,
        aiSummary,
        aiSuggestedActionItems
      });

      res.status(201).json(feedbackData);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        console.error("Feedback creation error:", err);
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  app.get(api.feedback.list.path, isAuthenticated, async (req, res) => {
    const userId = req.query.userId as string;
    if (userId) {
      const feedbacks = await storage.getFeedbackByUser(userId);
      return res.json(feedbacks);
    }
    const all = await storage.getAllFeedback();
    res.json(all);
  });

  app.get(api.feedback.get.path, isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const fb = await storage.getFeedback(id);
    if (!fb) return res.status(404).json({ message: "Not found" });
    const fbUser = await storage.getUser(fb.userId);
    const result = {
      ...fb,
      user: fbUser ? { firstName: fbUser.firstName, lastName: fbUser.lastName, deptCode: (fbUser as any).deptCode, email: fbUser.email } : undefined,
    };
    res.json(result);
  });

  app.post(api.reviews.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.reviews.upsert.input.parse(req.body);
      const review = await storage.upsertManagerReview(input);
      res.status(201).json(review);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.reviews.get.path, isAuthenticated, async (req, res) => {
    const feedbackId = parseInt(req.params.feedbackId as string);
    if (isNaN(feedbackId)) {
      return res.status(400).json({ message: "Invalid feedback ID" });
    }
    const review = await storage.getReviewByFeedbackId(feedbackId);
    if (!review) return res.status(404).json({ message: "Not found" });
    res.json(review);
  });

  app.post(api.actionItems.create.path, isAuthenticated, async (req, res) => {
    try {
      const body = { ...req.body };
      if (typeof body.dueDate === "string") body.dueDate = new Date(body.dueDate);
      const input = api.actionItems.create.input.parse(body);
      const item = await storage.createActionItem(input);
      res.status(201).json(item);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.actionItems.list.path, isAuthenticated, async (req, res) => {
    const empEmail = req.query.empEmail as string;
    const mgrEmail = req.query.mgrEmail as string;
    const forUser = req.query.forUser as string;
    if (forUser) {
      const items = await storage.getActionItemsForUser(forUser);
      return res.json(items);
    }
    const items = await storage.getActionItems(empEmail, mgrEmail);
    res.json(items);
  });

  app.patch(api.actionItems.update.path, isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    const updates = { ...req.body };
    if (typeof updates.dueDate === "string") updates.dueDate = new Date(updates.dueDate);
    try {
      const updated = await storage.updateActionItem(id, updates);
      res.json(updated);
    } catch (err) {
      res.status(404).json({ message: "Not found" });
    }
  });

  app.delete(api.actionItems.delete.path, isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }
    try {
      await storage.deleteActionItem(id);
      res.json({ message: "Deleted" });
    } catch (err) {
      res.status(404).json({ message: "Not found" });
    }
  });

  app.get(api.users.list.path, isAuthenticated, async (req, res) => {
    const role = req.query.role as string;
    const managerEmail = req.query.managerEmail as string;
    let usersList = [];
    if (role && managerEmail) {
      usersList = await storage.getUsersByRoleAndManager(role, managerEmail);
    } else if (role) {
      usersList = await storage.getUsersByRole(role);
    } else if (managerEmail) {
      usersList = await storage.getUsersByManager(managerEmail);
    } else {
      usersList = await storage.getAllUsers();
    }
    const filtered = usersList.filter(u => !u.isAdmin);
    const safe = filtered.map(u => {
      const { password, ...rest } = u;
      return rest;
    });
    res.json(safe);
  });

  app.patch(api.users.update.path, isAuthenticated, async (req, res) => {
    const id = req.params.id as string;
    try {
      const updated = await storage.updateUser(id, req.body);
      const { password, ...safe } = updated;
      res.json(safe);
    } catch (err) {
      res.status(404).json({ message: "User not found" });
    }
  });

  app.get(api.analytics.burnout.path, isAuthenticated, async (req, res) => {
    const managerEmail = req.query.managerEmail as string | undefined;
    let targetUsers;
    if (managerEmail) {
      targetUsers = await storage.getUsersByManager(managerEmail);
    } else {
      targetUsers = await storage.getAllUsers();
    }
    targetUsers = targetUsers.filter(u => !u.isAdmin);
    const results = [];
    for (const user of targetUsers) {
      const feedbacks = await storage.getFeedbackByUser(user.id);
      if (feedbacks.length >= 2) {
        const current = feedbacks[0];
        const previous = feedbacks[1];
        const currentScore = current.aiSentiment || 0;
        const prevScore = previous.aiSentiment || 0;
        let dropPercentage = 0;
        if (prevScore > 0) {
          dropPercentage = (prevScore - currentScore) / prevScore;
        }
        let riskLevel = "Low";
        if (dropPercentage > 0.3) riskLevel = "High";
        else if (dropPercentage > 0.15) riskLevel = "Medium";
        if (riskLevel !== "Low") {
          results.push({
            userId: user.id,
            fullName: `${user.firstName} ${user.lastName}`,
            department: user.deptCode || "N/A",
            managerEmail: user.managerEmail || "N/A",
            currentSentiment: currentScore,
            previousSentiment: prevScore,
            dropPercentage: Math.round(dropPercentage * 100),
            riskLevel
          });
        }
      }
    }
    res.json(results);
  });

  app.get(api.analytics.department.path, isAuthenticated, async (req, res) => {
    const period = req.query.period as string | undefined;
    const stats = await storage.getDepartmentStatsWithPeriod(period);
    const safeStats = stats.map(s => ({
      deptCode: s.dept_code || "General",
      avgSatScore: Number(s.avg_sat_score),
      totalFeedback: Number(s.total_feedback)
    }));
    res.json(safeStats);
  });

  app.get(api.analytics.teamFeedback.path, isAuthenticated, async (req, res) => {
    const managerEmail = req.query.managerEmail as string;
    const period = req.query.period as string | undefined;
    if (!managerEmail) {
      return res.status(400).json({ message: "managerEmail is required" });
    }
    const data = await storage.getTeamFeedbackWithReview(managerEmail, period);
    res.json(data);
  });

  app.get(api.analytics.leaderAccountability.path, isAuthenticated, async (req, res) => {
    const data = await storage.getLeaderAccountability();
    const safeData = data.map(d => ({
      managerEmail: d.managerEmail,
      totalTasks: Number(d.totalTasks),
      pendingCount: Number(d.pendingCount),
      overdueCount: Number(d.overdueCount),
    }));
    res.json(safeData);
  });

  app.get(api.analytics.projectAnalytics.path, isAuthenticated, async (req, res) => {
    const period = req.query.period as string | undefined;
    const data = await storage.getProjectAnalytics(period);
    const safeData = data.map((d: any) => ({
      projectCode: d.project_code,
      employeeCount: Number(d.employee_count),
      avgSatScore: Number(d.avg_sat_score),
      totalFeedback: Number(d.total_feedback),
    }));
    res.json(safeData);
  });

  function getOffsetPeriod(period: string, offsetMonths: number): string {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const [monthStr, yearStr] = period.split("-");
    let monthIdx = months.indexOf(monthStr);
    let year = parseInt(yearStr);
    monthIdx -= offsetMonths;
    while (monthIdx < 0) { monthIdx += 12; year--; }
    while (monthIdx > 11) { monthIdx -= 12; year++; }
    return `${months[monthIdx]}-${year}`;
  }

  function getLast12Periods(period: string): string[] {
    const result: string[] = [];
    for (let i = 11; i >= 0; i--) {
      result.push(getOffsetPeriod(period, i));
    }
    return result;
  }

  app.get("/api/analytics/department-trends", isAuthenticated, async (req, res) => {
    const period = req.query.period as string | undefined;
    const compareWith = (req.query.compareWith as string) || "month";
    if (!period) {
      return res.status(400).json({ message: "period is required (e.g., Feb-2026)" });
    }

    const offsetMonths = compareWith === "quarter" ? 3 : 1;
    const prevPeriod = getOffsetPeriod(period, offsetMonths);

    const [currentStats, prevStats] = await Promise.all([
      storage.getDepartmentStatsWithPeriod(period),
      storage.getDepartmentStatsWithPeriod(prevPeriod),
    ]);

    const prevMap = new Map<string, number>();
    for (const s of prevStats) {
      prevMap.set(s.dept_code || "General", Number(s.avg_sat_score));
    }

    const allUsers = await storage.getAllUsers();
    const nonAdminUsers = allUsers.filter(u => !u.isAdmin);

    const result = currentStats.map(s => {
      const deptCode = s.dept_code || "General";
      const currentScore = Number(s.avg_sat_score);
      const prevScore = prevMap.get(deptCode);
      const employeeCount = nonAdminUsers.filter(u => u.deptCode === deptCode).length;
      return {
        deptCode,
        avgSatScore: currentScore,
        totalFeedback: Number(s.total_feedback),
        employeeCount,
        prevAvgSatScore: prevScore ?? null,
        trend: prevScore != null ? parseFloat((currentScore - prevScore).toFixed(2)) : null,
      };
    });
    res.json(result);
  });

  app.get("/api/analytics/department-history", isAuthenticated, async (req, res) => {
    const period = req.query.period as string | undefined;
    if (!period) {
      return res.status(400).json({ message: "period is required" });
    }
    const periods = getLast12Periods(period);
    const rows = await storage.getDepartmentStatsForPeriods(periods);
    const result = rows.map((r: any) => ({
      period: r.submission_period,
      deptCode: r.dept_code || "General",
      avgSatScore: Number(r.avg_sat_score),
      totalFeedback: Number(r.total_feedback),
    }));
    res.json(result);
  });

  app.get("/api/analytics/project-trends", isAuthenticated, async (req, res) => {
    const period = req.query.period as string | undefined;
    const compareWith = (req.query.compareWith as string) || "month";
    if (!period) {
      return res.status(400).json({ message: "period is required (e.g., Feb-2026)" });
    }

    const offsetMonths = compareWith === "quarter" ? 3 : 1;
    const prevPeriod = getOffsetPeriod(period, offsetMonths);

    const [currentStats, prevStats] = await Promise.all([
      storage.getProjectAnalytics(period),
      storage.getProjectAnalytics(prevPeriod),
    ]);

    const prevMap = new Map<string, number>();
    for (const s of prevStats) {
      prevMap.set(s.project_code, Number(s.avg_sat_score));
    }

    const result = currentStats.map((s: any) => {
      const projectCode = s.project_code;
      const currentScore = Number(s.avg_sat_score);
      const prevScore = prevMap.get(projectCode);
      return {
        projectCode,
        employeeCount: Number(s.employee_count),
        avgSatScore: currentScore,
        totalFeedback: Number(s.total_feedback),
        prevAvgSatScore: prevScore ?? null,
        trend: prevScore != null ? parseFloat((currentScore - prevScore).toFixed(2)) : null,
      };
    });
    res.json(result);
  });

  app.get("/api/analytics/project-history", isAuthenticated, async (req, res) => {
    const period = req.query.period as string | undefined;
    if (!period) {
      return res.status(400).json({ message: "period is required" });
    }
    const periods = getLast12Periods(period);
    const rows = await storage.getProjectAnalyticsForPeriods(periods);
    const result = rows.map((r: any) => ({
      period: r.submission_period,
      projectCode: r.project_code,
      avgSatScore: Number(r.avg_sat_score),
      employeeCount: Number(r.employee_count),
      totalFeedback: Number(r.total_feedback),
    }));
    res.json(result);
  });

  app.get("/api/analytics/employee-performance", isAuthenticated, async (req, res) => {
    const dept = req.query.dept as string | undefined;
    const project = req.query.project as string | undefined;
    if (!dept && !project) {
      return res.status(400).json({ message: "dept or project query parameter required" });
    }
    const filterField = project ? "project_code" : "dept_code";
    const filterValue = (project || dept) as string;
    const data = await storage.getEmployeePerformanceSummary(filterField, filterValue);
    const safeData = data.map((d: any) => ({
      id: d.id,
      firstName: d.first_name,
      lastName: d.last_name,
      email: d.email,
      role: d.role,
      deptCode: d.dept_code,
      projectCode: d.project_code,
      managerEmail: d.manager_email,
      avgSentiment: Number(d.avg_sentiment) || 0,
      latestSentiment: Number(d.latest_sentiment) || 0,
      totalFeedback: Number(d.total_feedback) || 0,
      avgSatScore: Number(d.avg_sat_score) || 0,
      latestSatScore: d.latest_sat_score != null ? Number(d.latest_sat_score) : null,
    }));
    res.json(safeData);
  });

  // === KUDOS ROUTES ===

  const createKudosSchema = z.object({
    receiverUserId: z.string(),
    message: z.string().min(1).max(500),
    valueTag: z.string().min(1),
    isAnonymous: z.boolean().default(false),
  });

  app.post("/api/kudos", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      const parsed = createKudosSchema.parse(req.body);
      if (parsed.receiverUserId === user.id) {
        return res.status(400).json({ message: "You cannot give kudos to yourself" });
      }
      const receiver = await storage.getUser(parsed.receiverUserId);
      if (!receiver) {
        return res.status(404).json({ message: "Receiver not found" });
      }
      const newKudos = await storage.createKudos({
        giverUserId: user.id,
        receiverUserId: parsed.receiverUserId,
        message: parsed.message,
        valueTag: parsed.valueTag,
        isAnonymous: parsed.isAnonymous,
      });
      res.status(201).json(newKudos);
    } catch (err: any) {
      if (err.name === "ZodError") {
        return res.status(400).json({ message: "Validation failed", errors: err.errors });
      }
      res.status(500).json({ message: err.message || "Failed to create kudos" });
    }
  });

  app.get("/api/kudos/recent", isAuthenticated, async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 20;
    const range = req.query.range as string | undefined;
    let startDate: Date | undefined;
    let endDate: Date | undefined;
    if (range) {
      const now = new Date();
      endDate = now;
      if (range === "quarter") {
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      } else if (range === "year") {
        startDate = new Date(now.getFullYear(), 0, 1);
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
    }
    const data = await storage.getRecentKudos(limit, startDate, endDate);
    res.json(data);
  });

  app.get("/api/kudos/leaderboard", isAuthenticated, async (req, res) => {
    const range = (req.query.range as string) || "month";
    const now = new Date();
    let startDate: Date;

    if (range === "quarter") {
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      startDate = quarterStart;
    } else if (range === "year") {
      startDate = new Date(now.getFullYear(), 0, 1);
    } else {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const data = await storage.getKudosLeaderboard(startDate, now);
    const result = data.map((d: any) => ({
      userId: d.userId,
      fullName: d.fullName,
      deptCode: d.deptCode,
      role: d.role,
      kudosCount: Number(d.kudosCount),
    }));
    res.json(result);
  });

  app.get("/api/kudos/user/:userId", isAuthenticated, async (req, res) => {
    const data = await storage.getKudosByUser(req.params.userId);
    res.json(data);
  });

  // === MANAGER FEEDBACK (Anonymous) ROUTES ===

  const createManagerFeedbackSchema = z.object({
    managerEmail: z.string().email(),
    feedbackText: z.string().min(1).max(2000),
    rating: z.number().int().min(1).max(5),
    submissionPeriod: z.string(),
  });

  app.post("/api/manager-feedback", isAuthenticated, async (req, res) => {
    try {
      const user = req.user as any;
      if (user.role !== "EMPLOYEE" && user.role !== "MANAGER") {
        return res.status(403).json({ message: "Only employees and managers can submit manager feedback" });
      }
      const parsed = createManagerFeedbackSchema.parse(req.body);
      const existing = await storage.getManagerFeedbackBySubmitter(user.id, parsed.submissionPeriod);
      if (existing) {
        return res.status(409).json({ message: "You have already submitted manager feedback for this period" });
      }
      const entry = await storage.createManagerFeedback({
        submitterUserId: user.id,
        managerEmail: parsed.managerEmail,
        feedbackText: parsed.feedbackText,
        rating: parsed.rating,
        submissionPeriod: parsed.submissionPeriod,
      });
      res.status(201).json({ message: "Manager feedback submitted anonymously" });
    } catch (err: any) {
      if (err.name === "ZodError") {
        return res.status(400).json({ message: "Validation failed", errors: err.errors });
      }
      res.status(500).json({ message: err.message || "Failed to submit manager feedback" });
    }
  });

  app.get("/api/manager-feedback", isAuthenticated, async (req, res) => {
    const user = req.user as any;
    if (user.role !== "SENIOR_MGMT" && !user.isAdmin) {
      return res.status(403).json({ message: "Only senior management can view manager feedback" });
    }
    const managerEmail = req.query.managerEmail as string | undefined;
    const period = req.query.period as string | undefined;
    const data = await storage.getManagerFeedbackForSenior(managerEmail, period);
    res.json(data);
  });

  app.get("/api/manager-feedback/summary", isAuthenticated, async (req, res) => {
    const user = req.user as any;
    if (user.role !== "SENIOR_MGMT" && !user.isAdmin) {
      return res.status(403).json({ message: "Only senior management can view manager feedback summary" });
    }
    const data = await storage.getManagerFeedbackSummary();
    const result = data.map((d: any) => ({
      managerEmail: d.managerEmail,
      managerName: d.managerName,
      deptCode: d.deptCode,
      totalFeedback: Number(d.totalFeedback),
      avgRating: Number(d.avgRating),
    }));
    res.json(result);
  });

  app.get("/api/manager-feedback/check", isAuthenticated, async (req, res) => {
    const user = req.user as any;
    const period = req.query.period as string;
    if (!period) return res.status(400).json({ message: "period is required" });
    const existing = await storage.getManagerFeedbackBySubmitter(user.id, period);
    res.json({ submitted: !!existing });
  });

  return httpServer;
}
