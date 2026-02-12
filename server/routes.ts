import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import { setupAuth, isAuthenticated, isAdmin } from "./auth";
import bcrypt from "bcryptjs";

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

  app.post(api.feedback.create.path, isAuthenticated, async (req, res) => {
    try {
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
    const safe = usersList.map(u => {
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

  return httpServer;
}
