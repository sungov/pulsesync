import { pgTable, text, serial, integer, boolean, timestamp, date, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";
import { relations } from "drizzle-orm";

// Export everything from integrations
export * from "./models/auth";
export * from "./models/chat";

// === TABLE DEFINITIONS ===

export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  submissionPeriod: text("submission_period").notNull(),
  
  // Numerical/Scale metrics
  satScore: integer("sat_score").notNull(), // 1-10
  moodScore: text("mood_score").notNull(), // Great, Good, Neutral, Challenged, Burned Out
  workloadLevel: integer("workload_level").notNull(), // 1-5
  workLifeBalance: integer("work_life_balance").notNull(), // 1-5
  
  // Qualitative inputs
  accomplishments: text("accomplishments").notNull(),
  disappointments: text("disappointments").notNull(),
  blockers: text("blockers").notNull(),
  mentoringCulture: text("mentoring_culture").notNull(),
  supportNeeds: text("support_needs").notNull(),
  goalProgress: text("goal_progress").notNull(),
  processSuggestions: text("process_suggestions").notNull(),
  ptoCoverage: text("pto_coverage").notNull(),
  
  // AI generated fields
  aiSentiment: real("ai_sentiment"),
  aiSummary: text("ai_summary"),
  aiSuggestedActionItems: text("ai_suggested_action_items"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

export const managerReviews = pgTable("manager_reviews", {
  id: serial("id").primaryKey(),
  feedbackId: integer("feedback_id").notNull().references(() => feedback.id),
  mgrEmail: text("mgr_email").notNull(),
  mgrNotes: text("mgr_notes").notNull(),
  lastEdited: timestamp("last_edited").defaultNow(),
});

export const actionItems = pgTable("action_items", {
  id: serial("id").primaryKey(),
  empEmail: text("emp_email").notNull(),
  mgrEmail: text("mgr_email").notNull(),
  task: text("task").notNull(),
  dueDate: timestamp("due_date").notNull(),
  status: text("status").default("Pending").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// === RELATIONS ===
export const feedbackRelations = relations(feedback, ({ one, many }) => ({
  user: one(users, {
    fields: [feedback.userId],
    references: [users.id],
  }),
  reviews: many(managerReviews),
}));

export const managerReviewsRelations = relations(managerReviews, ({ one }) => ({
  feedback: one(feedback, {
    fields: [managerReviews.feedbackId],
    references: [feedback.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  feedback: many(feedback),
}));


// === ZOD SCHEMAS ===
export const insertFeedbackSchema = createInsertSchema(feedback).omit({ 
  id: true, 
  createdAt: true, 
  aiSentiment: true, 
  aiSummary: true,
  aiSuggestedActionItems: true
});

export const insertManagerReviewSchema = createInsertSchema(managerReviews).omit({ 
  id: true, 
  lastEdited: true 
});

export const insertActionItemSchema = createInsertSchema(actionItems).omit({ 
  id: true, 
  createdAt: true 
});

// === EXPLICIT API TYPES ===
export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

export type ManagerReview = typeof managerReviews.$inferSelect;
export type InsertManagerReview = z.infer<typeof insertManagerReviewSchema>;

export type ActionItem = typeof actionItems.$inferSelect;
export type InsertActionItem = z.infer<typeof insertActionItemSchema>;
