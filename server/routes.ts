import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Setup Auth (Must be before other routes)
  await setupAuth(app);
  registerAuthRoutes(app);

  // === FEEDBACK ROUTES ===
  app.post(api.feedback.create.path, async (req, res) => {
    try {
      const input = api.feedback.create.input.parse(req.body);
      
      // --- AI SENTIMENT ANALYSIS ---
      // We analyze the text fields: accomplishments + blockers
      const textToAnalyze = `Accomplishments: ${input.accomplishments}\nBlockers: ${input.blockers}`;
      
      let aiSentiment = 0.5; // Default neutral
      let aiSummary = "Analysis pending...";

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-5.1", // or gpt-4o
          messages: [
            { role: "system", content: "You are an HR analytics AI. Analyze the employee feedback. Return a JSON object with 'sentiment' (float 0.0 to 1.0, where 0 is negative, 1 is positive) and 'summary' (brief 1-sentence summary)." },
            { role: "user", content: textToAnalyze }
          ],
          response_format: { type: "json_object" }
        });

        const result = JSON.parse(response.choices[0].message.content || "{}");
        aiSentiment = result.sentiment || 0.5;
        aiSummary = result.summary || "No summary available.";
      } catch (aiError) {
        console.error("AI Analysis failed:", aiError);
        // Fallback to basic sentiment if AI fails
      }

      const feedback = await storage.createFeedback({
        ...input,
        aiSentiment,
        aiSummary
      });

      res.status(201).json(feedback);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal Server Error" });
      }
    }
  });

  app.get(api.feedback.list.path, async (req, res) => {
    const userId = req.query.userId as string;
    // const period = req.query.period as string; // Optional filtering

    if (userId) {
      const feedbacks = await storage.getFeedbackByUser(userId);
      return res.json(feedbacks);
    }
    
    // If no userId provided, maybe return all (for admin/manager)?
    // For now, let's return empty or all.
    const all = await storage.getAllFeedback();
    res.json(all);
  });

  app.get(api.feedback.get.path, async (req, res) => {
    const id = parseInt(req.params.id);
    const feedback = await storage.getFeedback(id);
    if (!feedback) return res.status(404).json({ message: "Not found" });
    res.json(feedback);
  });

  // === REVIEWS ROUTES ===
  app.post(api.reviews.create.path, async (req, res) => {
    try {
      const input = api.reviews.create.input.parse(req.body);
      const review = await storage.createManagerReview(input);
      res.status(201).json(review);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // === ACTION ITEMS ROUTES ===
  app.post(api.actionItems.create.path, async (req, res) => {
    try {
      const input = api.actionItems.create.input.parse(req.body);
      const item = await storage.createActionItem(input);
      res.status(201).json(item);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  app.get(api.actionItems.list.path, async (req, res) => {
    const empEmail = req.query.empEmail as string;
    const mgrEmail = req.query.mgrEmail as string;
    const items = await storage.getActionItems(empEmail, mgrEmail);
    res.json(items);
  });

  app.patch(api.actionItems.update.path, async (req, res) => {
    const id = parseInt(req.params.id);
    const updates = req.body;
    try {
      const updated = await storage.updateActionItem(id, updates);
      res.json(updated);
    } catch (err) {
      res.status(404).json({ message: "Not found" });
    }
  });

  // === USERS ROUTES ===
  app.get(api.users.list.path, async (req, res) => {
    const role = req.query.role as string;
    const managerEmail = req.query.managerEmail as string;
    
    let users = [];
    if (role) {
      users = await storage.getUsersByRole(role);
    } else if (managerEmail) {
      users = await storage.getUsersByManager(managerEmail);
    } else {
      users = await storage.getAllUsers();
    }
    res.json(users);
  });

  app.patch(api.users.update.path, async (req, res) => {
    const id = req.params.id;
    try {
      const updated = await storage.updateUser(id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(404).json({ message: "User not found" });
    }
  });

  // === ANALYTICS ROUTES ===
  app.get(api.analytics.burnout.path, async (req, res) => {
    // Logic: Compare current month sentiment vs previous month
    // 1. Get all users
    // 2. For each user, get latest 2 feedback entries
    // 3. Compare aiSentiment
    // 4. If drop > 30% (0.3), flag high risk.
    
    const users = await storage.getAllUsers();
    const results = [];

    for (const user of users) {
      const feedbacks = await storage.getFeedbackByUser(user.id);
      if (feedbacks.length >= 2) {
        const current = feedbacks[0];
        const previous = feedbacks[1];
        
        const currentScore = current.aiSentiment || 0;
        const prevScore = previous.aiSentiment || 0;
        
        // Calculate drop
        // If prev is 0.8 and current is 0.4 -> drop is 0.4 (50%) -> High Risk
        // Drop % = (Prev - Current) / Prev
        
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

  app.get(api.analytics.department.path, async (req, res) => {
    const stats = await storage.getDepartmentStats();
    // Convert BigInts or other SQL types to standard JSON types if needed
    const safeStats = stats.map(s => ({
      deptCode: s.dept_code,
      avgSatScore: Number(s.avg_sat_score),
      avgMoodScore: Number(s.avg_mood_score),
      totalFeedback: Number(s.total_feedback)
    }));
    res.json(safeStats);
  });

  // Seed Data function (Optional but good for demo)
  // Call it if DB is empty
  const users = await storage.getAllUsers();
  if (users.length === 0) {
     // Wait, we can't seed users easily because Auth handles IDs.
     // But we can seed feedback if users exist.
  }

  return httpServer;
}
