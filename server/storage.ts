import { type User, type UpsertUser, type InsertFeedback, type Feedback, type InsertManagerReview, type ManagerReview, type InsertActionItem, type ActionItem, type UpdateActionItemRequest } from "@shared/schema";
import { db } from "./db";
import { users, feedback, managerReviews, actionItems } from "@shared/schema";
import { eq, and, or, desc, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(data: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  getUsersByRole(role: string): Promise<User[]>;
  getUsersByManager(managerEmail: string): Promise<User[]>;
  getUsersByRoleAndManager(role: string, managerEmail: string): Promise<User[]>;
  getAllUsers(): Promise<User[]>;

  createFeedback(feedback: InsertFeedback & { aiSentiment?: number; aiSummary?: string; aiSuggestedActionItems?: string }): Promise<Feedback>;
  getFeedback(id: number): Promise<Feedback | undefined>;
  getFeedbackByUser(userId: string): Promise<Feedback[]>;
  getAllFeedback(): Promise<Feedback[]>;

  createManagerReview(review: InsertManagerReview): Promise<ManagerReview>;
  getReviewsByFeedbackId(feedbackId: number): Promise<ManagerReview[]>;
  getReviewByFeedbackId(feedbackId: number): Promise<ManagerReview | undefined>;
  upsertManagerReview(review: InsertManagerReview): Promise<ManagerReview>;

  createActionItem(item: InsertActionItem): Promise<ActionItem>;
  getActionItems(empEmail?: string, mgrEmail?: string): Promise<ActionItem[]>;
  getActionItemsForUser(email: string): Promise<ActionItem[]>;
  updateActionItem(id: number, updates: UpdateActionItemRequest): Promise<ActionItem>;
  deleteActionItem(id: number): Promise<void>;
  
  getDepartmentStats(): Promise<any[]>;
  getDepartmentStatsWithPeriod(period?: string): Promise<any[]>;
  getTeamFeedbackWithReview(managerEmail: string, period?: string): Promise<any[]>;
  getLeaderAccountability(): Promise<any[]>;
  getProjectAnalytics(period?: string): Promise<any[]>;
  getEmployeePerformanceSummary(filterField: string, filterValue: string): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(data: UpsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(data).returning();
    return newUser;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return updated;
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.getUser(id);
    if (!user) return;

    const userFeedback = await db.select({ id: feedback.id }).from(feedback).where(eq(feedback.userId, id));
    for (const fb of userFeedback) {
      await db.delete(managerReviews).where(eq(managerReviews.feedbackId, fb.id));
    }
    await db.delete(feedback).where(eq(feedback.userId, id));

    if (user.email) {
      await db.delete(managerReviews).where(eq(managerReviews.mgrEmail, user.email));
      await db.delete(actionItems).where(
        or(eq(actionItems.empEmail, user.email), eq(actionItems.mgrEmail, user.email))
      );
    }

    await db.delete(users).where(eq(users.id, id));
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role));
  }
  
  async getUsersByManager(managerEmail: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.managerEmail, managerEmail));
  }

  async getUsersByRoleAndManager(role: string, managerEmail: string): Promise<User[]> {
    return db.select().from(users).where(and(eq(users.role, role), eq(users.managerEmail, managerEmail)));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async createFeedback(insertFeedback: any): Promise<Feedback> {
    const [newItem] = await db.insert(feedback).values(insertFeedback).returning();
    return newItem;
  }

  async getFeedback(id: number): Promise<Feedback | undefined> {
    const [item] = await db.select().from(feedback).where(eq(feedback.id, id));
    return item;
  }

  async getFeedbackByUser(userId: string): Promise<Feedback[]> {
    return db.select().from(feedback).where(eq(feedback.userId, userId)).orderBy(desc(feedback.createdAt));
  }

  async getAllFeedback(): Promise<Feedback[]> {
    return db.select().from(feedback).orderBy(desc(feedback.createdAt));
  }

  async createManagerReview(review: InsertManagerReview): Promise<ManagerReview> {
    const [newItem] = await db.insert(managerReviews).values(review).returning();
    return newItem;
  }

  async getReviewsByFeedbackId(feedbackId: number): Promise<ManagerReview[]> {
    return db.select().from(managerReviews).where(eq(managerReviews.feedbackId, feedbackId));
  }

  async getReviewByFeedbackId(feedbackId: number): Promise<ManagerReview | undefined> {
    const [review] = await db.select().from(managerReviews).where(eq(managerReviews.feedbackId, feedbackId));
    return review;
  }

  async upsertManagerReview(review: InsertManagerReview): Promise<ManagerReview> {
    const existing = await this.getReviewByFeedbackId(review.feedbackId);
    if (existing) {
      const [updated] = await db.update(managerReviews)
        .set({ ...review, lastEdited: new Date() })
        .where(eq(managerReviews.id, existing.id))
        .returning();
      return updated;
    }
    const [newItem] = await db.insert(managerReviews).values(review).returning();
    return newItem;
  }

  async createActionItem(item: InsertActionItem): Promise<ActionItem> {
    const [newItem] = await db.insert(actionItems).values(item).returning();
    return newItem;
  }

  async getActionItems(empEmail?: string, mgrEmail?: string): Promise<ActionItem[]> {
    let query = db.select().from(actionItems);
    const conditions = [];
    if (empEmail) conditions.push(eq(actionItems.empEmail, empEmail));
    if (mgrEmail) conditions.push(eq(actionItems.mgrEmail, mgrEmail));
    
    if (conditions.length > 0) {
      // @ts-ignore
      query = query.where(and(...conditions));
    }
    return query.orderBy(desc(actionItems.dueDate));
  }

  async getActionItemsForUser(email: string): Promise<ActionItem[]> {
    return db.select().from(actionItems)
      .where(sql`${actionItems.empEmail} = ${email} OR ${actionItems.mgrEmail} = ${email}`)
      .orderBy(desc(actionItems.dueDate));
  }

  async updateActionItem(id: number, updates: UpdateActionItemRequest): Promise<ActionItem> {
    const [updated] = await db.update(actionItems).set(updates).where(eq(actionItems.id, id)).returning();
    return updated;
  }

  async deleteActionItem(id: number): Promise<void> {
    await db.delete(actionItems).where(eq(actionItems.id, id));
  }

  async getDepartmentStats(): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT 
        u.dept_code,
        AVG(f.sat_score) as avg_sat_score,
        COUNT(f.id) as total_feedback
      FROM users u
      JOIN feedback f ON u.id = f.user_id
      WHERE u.is_admin = false
      GROUP BY u.dept_code
    `);
    return result.rows;
  }

  async getDepartmentStatsWithPeriod(period?: string): Promise<any[]> {
    if (period) {
      const result = await db.execute(sql`
        SELECT 
          u.dept_code,
          AVG(f.sat_score) as avg_sat_score,
          COUNT(f.id) as total_feedback
        FROM users u
        JOIN feedback f ON u.id = f.user_id
        WHERE f.submission_period = ${period} AND u.is_admin = false
        GROUP BY u.dept_code
      `);
      return result.rows;
    }
    return this.getDepartmentStats();
  }

  async getTeamFeedbackWithReview(managerEmail: string, period?: string): Promise<any[]> {
    let periodClause = sql``;
    if (period) {
      periodClause = sql` AND f.submission_period = ${period}`;
    }
    const result = await db.execute(sql`
      SELECT 
        f.id,
        f.user_id as "userId",
        CONCAT(u.first_name, ' ', u.last_name) as "fullName",
        u.dept_code as "deptCode",
        f.submission_period as "submissionPeriod",
        f.sat_score as "satScore",
        f.mood_score as "moodScore",
        f.ai_sentiment as "aiSentiment",
        f.created_at as "createdAt",
        CASE WHEN mr.id IS NOT NULL THEN true ELSE false END as "reviewed"
      FROM users u
      JOIN feedback f ON u.id = f.user_id
      LEFT JOIN manager_reviews mr ON f.id = mr.feedback_id
      WHERE u.manager_email = ${managerEmail}
      ${periodClause}
      ORDER BY f.created_at DESC
    `);
    return result.rows;
  }

  async getLeaderAccountability(): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT 
        mgr_email as "managerEmail",
        COUNT(*) as "totalTasks",
        COUNT(*) FILTER (WHERE status = 'Pending') as "pendingCount",
        COUNT(*) FILTER (WHERE status = 'Pending' AND due_date < NOW()) as "overdueCount"
      FROM action_items
      GROUP BY mgr_email
    `);
    return result.rows;
  }
  async getProjectAnalytics(period?: string): Promise<any[]> {
    const periodClause = period ? sql` AND f.submission_period = ${period}` : sql``;
    const result = await db.execute(sql`
      SELECT 
        u.project_code,
        COUNT(DISTINCT u.id) as employee_count,
        AVG(f.sat_score) as avg_sat_score,
        COUNT(f.id) as total_feedback
      FROM users u
      JOIN feedback f ON u.id = f.user_id
      WHERE u.project_code IS NOT NULL AND u.project_code != '' AND u.is_admin = false
      ${periodClause}
      GROUP BY u.project_code
      ORDER BY avg_sat_score ASC
    `);
    return result.rows;
  }

  async getEmployeePerformanceSummary(filterField: string, filterValue: string): Promise<any[]> {
    const fieldColumn = filterField === "project_code" ? sql`u.project_code` : sql`u.dept_code`;
    const result = await db.execute(sql`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.role,
        u.dept_code,
        u.project_code,
        u.manager_email,
        COALESCE(perf.avg_sentiment, 0) as avg_sentiment,
        COALESCE(perf.latest_sentiment, 0) as latest_sentiment,
        COALESCE(perf.total_feedback, 0) as total_feedback,
        COALESCE(perf.avg_sat_score, 0) as avg_sat_score,
        perf.latest_sat_score
      FROM users u
      LEFT JOIN LATERAL (
        SELECT 
          AVG(f.ai_sentiment) as avg_sentiment,
          AVG(f.sat_score) as avg_sat_score,
          COUNT(f.id) as total_feedback,
          (SELECT f2.ai_sentiment FROM feedback f2 WHERE f2.user_id = u.id ORDER BY f2.created_at DESC LIMIT 1) as latest_sentiment,
          (SELECT f2.sat_score FROM feedback f2 WHERE f2.user_id = u.id ORDER BY f2.created_at DESC LIMIT 1) as latest_sat_score
        FROM feedback f
        WHERE f.user_id = u.id
      ) perf ON true
      WHERE ${fieldColumn} = ${filterValue} AND u.is_admin = false AND u.role = 'EMPLOYEE'
      ORDER BY COALESCE(perf.latest_sentiment, 0) DESC
    `);
    return result.rows;
  }
}

export const storage = new DatabaseStorage();
