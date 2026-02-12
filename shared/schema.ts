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
  mgrSatComment: text("mgr_sat_comment"),
  mgrMoodComment: text("mgr_mood_comment"),
  mgrAccComment: text("mgr_acc_comment"),
  mgrDisComment: text("mgr_dis_comment"),
  mgrBlockersComment: text("mgr_blockers_comment"),
  mgrSupportComment: text("mgr_support_comment"),
  mgrWlbComment: text("mgr_wlb_comment"),
  mgrWorkloadComment: text("mgr_workload_comment"),
  mgrMentoringComment: text("mgr_mentoring_comment"),
  mgrSuggestionsComment: text("mgr_suggestions_comment"),
  mgrPtoComment: text("mgr_pto_comment"),
  mgrGoalComment: text("mgr_goal_comment"),
  lastEdited: timestamp("last_edited").defaultNow(),
});

export const actionItems = pgTable("action_items", {
  id: serial("id").primaryKey(),
  empEmail: text("emp_email").notNull(),
  mgrEmail: text("mgr_email").notNull(),
  assignedTo: text("assigned_to").default("EMPLOYEE").notNull(),
  task: text("task").notNull(),
  dueDate: timestamp("due_date").notNull(),
  status: text("status").default("Pending").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const kudos = pgTable("kudos", {
  id: serial("id").primaryKey(),
  giverUserId: text("giver_user_id").notNull().references(() => users.id),
  receiverUserId: text("receiver_user_id").notNull().references(() => users.id),
  message: text("message").notNull(),
  valueTag: text("value_tag").notNull(),
  isAnonymous: boolean("is_anonymous").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const managerFeedback = pgTable("manager_feedback", {
  id: serial("id").primaryKey(),
  submitterUserId: text("submitter_user_id").notNull().references(() => users.id),
  managerEmail: text("manager_email").notNull(),
  feedbackText: text("feedback_text").notNull(),
  rating: integer("rating").notNull(),
  submissionPeriod: text("submission_period").notNull(),
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
  kudosGiven: many(kudos, { relationName: "kudosGiver" }),
  kudosReceived: many(kudos, { relationName: "kudosReceiver" }),
}));

export const kudosRelations = relations(kudos, ({ one }) => ({
  giver: one(users, {
    fields: [kudos.giverUserId],
    references: [users.id],
    relationName: "kudosGiver",
  }),
  receiver: one(users, {
    fields: [kudos.receiverUserId],
    references: [users.id],
    relationName: "kudosReceiver",
  }),
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

export const insertKudosSchema = createInsertSchema(kudos).omit({
  id: true,
  createdAt: true,
});

export const insertManagerFeedbackSchema = createInsertSchema(managerFeedback).omit({
  id: true,
  createdAt: true,
});

// === EXPLICIT API TYPES ===
export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;

export type ManagerReview = typeof managerReviews.$inferSelect;
export type InsertManagerReview = z.infer<typeof insertManagerReviewSchema>;

export type ActionItem = typeof actionItems.$inferSelect;
export type InsertActionItem = z.infer<typeof insertActionItemSchema>;
export type UpdateActionItemRequest = Partial<InsertActionItem>;

export type Kudos = typeof kudos.$inferSelect;
export type InsertKudos = z.infer<typeof insertKudosSchema>;

export type ManagerFeedbackEntry = typeof managerFeedback.$inferSelect;
export type InsertManagerFeedback = z.infer<typeof insertManagerFeedbackSchema>;
