import { type User, type UpsertUser, type InsertFeedback, type Feedback, type InsertManagerReview, type ManagerReview, type InsertActionItem, type ActionItem, type UpdateActionItemRequest, type InsertKudos, type Kudos, type InsertManagerFeedback, type ManagerFeedbackEntry } from "@shared/schema";
import { db } from "./db";
import { users, feedback, managerReviews, actionItems, kudos, managerFeedback } from "@shared/schema";
import { eq, and, or, desc, sql, gte, lte } from "drizzle-orm";

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
  updateFeedback(id: number, data: Partial<InsertFeedback> & { aiSentiment?: number; aiSummary?: string; aiSuggestedActionItems?: string }): Promise<Feedback>;
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
  getDepartmentStatsForPeriods(periods: string[]): Promise<any[]>;
  getTeamFeedbackWithReview(managerEmail: string, period?: string): Promise<any[]>;
  getLeaderAccountability(): Promise<any[]>;
  getProjectAnalytics(period?: string): Promise<any[]>;
  getProjectAnalyticsForPeriods(periods: string[]): Promise<any[]>;
  getEmployeePerformanceSummary(filterField: string, filterValue: string): Promise<any[]>;
  getAllEmployeePerformanceSummary(search?: string): Promise<any[]>;

  createKudos(data: InsertKudos): Promise<Kudos>;
  getRecentKudos(limit?: number, startDate?: Date, endDate?: Date): Promise<any[]>;
  getKudosLeaderboard(startDate: Date, endDate: Date): Promise<any[]>;
  getKudosByUser(userId: string): Promise<any[]>;

  createManagerFeedback(data: InsertManagerFeedback): Promise<ManagerFeedbackEntry>;
  getManagerFeedbackBySubmitter(userId: string, period: string): Promise<ManagerFeedbackEntry | undefined>;
  getManagerFeedbackForSenior(managerEmail?: string, period?: string): Promise<any[]>;
  getManagerFeedbackSummary(): Promise<any[]>;

  getSentimentDistribution(period: string, groupBy: "dept" | "project"): Promise<any[]>;
  getTopBlockers(period: string, groupBy: "dept" | "project"): Promise<any[]>;
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

  async updateFeedback(id: number, data: Partial<InsertFeedback> & { aiSentiment?: number; aiSummary?: string; aiSuggestedActionItems?: string }): Promise<Feedback> {
    const [updated] = await db.update(feedback).set(data).where(eq(feedback.id, id)).returning();
    return updated;
  }

  async getFeedback(id: number): Promise<Feedback | undefined> {
    const [item] = await db.select().from(feedback).where(eq(feedback.id, id));
    return item;
  }

  async getFeedbackByUser(userId: string): Promise<Feedback[]> {
    return db.select().from(feedback).where(eq(feedback.userId, userId)).orderBy(desc(feedback.createdAt));
  }

  async getFeedbackByUserAndPeriod(userId: string, period: string): Promise<Feedback | undefined> {
    const [result] = await db.select().from(feedback)
      .where(and(eq(feedback.userId, userId), eq(feedback.submissionPeriod, period)));
    return result;
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
          COUNT(f.id) as total_feedback,
          COUNT(DISTINCT f.user_id) as unique_submitters
        FROM users u
        JOIN feedback f ON u.id = f.user_id
        WHERE f.submission_period = ${period} AND u.is_admin = false
        GROUP BY u.dept_code
      `);
      return result.rows;
    }
    return this.getDepartmentStats();
  }

  async getDepartmentStatsForPeriods(periods: string[]): Promise<any[]> {
    if (periods.length === 0) return [];
    const placeholders = periods.map(p => sql`${p}`);
    let inClause = placeholders[0];
    for (let i = 1; i < placeholders.length; i++) {
      inClause = sql`${inClause}, ${placeholders[i]}`;
    }
    const result = await db.execute(sql`
      SELECT 
        f.submission_period,
        u.dept_code,
        AVG(f.sat_score) as avg_sat_score,
        COUNT(f.id) as total_feedback
      FROM users u
      JOIN feedback f ON u.id = f.user_id
      WHERE f.submission_period IN (${inClause}) AND u.is_admin = false
      GROUP BY f.submission_period, u.dept_code
      ORDER BY f.submission_period
    `);
    return result.rows;
  }

  async getProjectAnalyticsForPeriods(periods: string[]): Promise<any[]> {
    if (periods.length === 0) return [];
    const placeholders = periods.map(p => sql`${p}`);
    let inClause = placeholders[0];
    for (let i = 1; i < placeholders.length; i++) {
      inClause = sql`${inClause}, ${placeholders[i]}`;
    }
    const result = await db.execute(sql`
      SELECT 
        f.submission_period,
        u.project_code,
        COUNT(DISTINCT u.id) as employee_count,
        AVG(f.sat_score) as avg_sat_score,
        COUNT(f.id) as total_feedback
      FROM users u
      JOIN feedback f ON u.id = f.user_id
      WHERE u.project_code IS NOT NULL AND u.project_code != '' AND u.is_admin = false
        AND f.submission_period IN (${inClause})
      GROUP BY f.submission_period, u.project_code
      ORDER BY f.submission_period
    `);
    return result.rows;
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

  async getAllEmployeePerformanceSummary(search?: string): Promise<any[]> {
    const searchFilter = search 
      ? sql`AND (LOWER(u.first_name) LIKE ${`%${search.toLowerCase()}%`} OR LOWER(u.last_name) LIKE ${`%${search.toLowerCase()}%`} OR LOWER(u.email) LIKE ${`%${search.toLowerCase()}%`} OR LOWER(u.dept_code) LIKE ${`%${search.toLowerCase()}%`} OR LOWER(u.project_code) LIKE ${`%${search.toLowerCase()}%`})`
      : sql``;
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
        perf.latest_sat_score,
        perf.latest_mood,
        perf.latest_period,
        COALESCE(perf.avg_workload, 0) as avg_workload,
        COALESCE(perf.avg_wlb, 0) as avg_wlb,
        COALESCE(act.pending_actions, 0) as pending_actions,
        COALESCE(act.total_actions, 0) as total_actions
      FROM users u
      LEFT JOIN LATERAL (
        SELECT 
          AVG(f.ai_sentiment) as avg_sentiment,
          AVG(f.sat_score) as avg_sat_score,
          AVG(f.workload_level) as avg_workload,
          AVG(f.work_life_balance) as avg_wlb,
          COUNT(f.id) as total_feedback,
          (SELECT f2.ai_sentiment FROM feedback f2 WHERE f2.user_id = u.id ORDER BY f2.created_at DESC LIMIT 1) as latest_sentiment,
          (SELECT f2.sat_score FROM feedback f2 WHERE f2.user_id = u.id ORDER BY f2.created_at DESC LIMIT 1) as latest_sat_score,
          (SELECT f2.mood_score FROM feedback f2 WHERE f2.user_id = u.id ORDER BY f2.created_at DESC LIMIT 1) as latest_mood,
          (SELECT f2.submission_period FROM feedback f2 WHERE f2.user_id = u.id ORDER BY f2.created_at DESC LIMIT 1) as latest_period
        FROM feedback f
        WHERE f.user_id = u.id
      ) perf ON true
      LEFT JOIN LATERAL (
        SELECT 
          COUNT(*) FILTER (WHERE a.status = 'Pending') as pending_actions,
          COUNT(*) as total_actions
        FROM action_items a
        WHERE a.emp_email = u.email
      ) act ON true
      WHERE u.is_admin = false AND u.role IN ('EMPLOYEE', 'MANAGER')
      ${searchFilter}
      ORDER BY COALESCE(perf.latest_sentiment, 0) ASC
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

  async createKudos(data: InsertKudos): Promise<Kudos> {
    const [newItem] = await db.insert(kudos).values(data).returning();
    return newItem;
  }

  async getRecentKudos(limit: number = 20, startDate?: Date, endDate?: Date): Promise<any[]> {
    const dateFilter = startDate && endDate
      ? sql`AND k.created_at >= ${startDate} AND k.created_at <= ${endDate}`
      : sql``;
    const result = await db.execute(sql`
      SELECT 
        k.id,
        k.message,
        k.value_tag as "valueTag",
        k.is_anonymous as "isAnonymous",
        k.created_at as "createdAt",
        k.giver_user_id as "giverUserId",
        k.receiver_user_id as "receiverUserId",
        CONCAT(gr.first_name, ' ', gr.last_name) as "giverName",
        CONCAT(rc.first_name, ' ', rc.last_name) as "receiverName",
        rc.dept_code as "receiverDept"
      FROM kudos k
      JOIN users gr ON k.giver_user_id = gr.id
      JOIN users rc ON k.receiver_user_id = rc.id
      WHERE 1=1 ${dateFilter}
      ORDER BY k.created_at DESC
      LIMIT ${limit}
    `);
    return result.rows;
  }

  async getKudosLeaderboard(startDate: Date, endDate: Date): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT 
        k.receiver_user_id as "userId",
        CONCAT(u.first_name, ' ', u.last_name) as "fullName",
        u.dept_code as "deptCode",
        u.role,
        COUNT(k.id) as "kudosCount"
      FROM kudos k
      JOIN users u ON k.receiver_user_id = u.id
      WHERE k.created_at >= ${startDate} AND k.created_at <= ${endDate}
      GROUP BY k.receiver_user_id, u.first_name, u.last_name, u.dept_code, u.role
      ORDER BY COUNT(k.id) DESC
    `);
    return result.rows;
  }

  async getKudosByUser(userId: string): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT 
        k.id,
        k.message,
        k.value_tag as "valueTag",
        k.is_anonymous as "isAnonymous",
        k.created_at as "createdAt",
        k.giver_user_id as "giverUserId",
        k.receiver_user_id as "receiverUserId",
        CONCAT(gr.first_name, ' ', gr.last_name) as "giverName",
        CONCAT(rc.first_name, ' ', rc.last_name) as "receiverName"
      FROM kudos k
      JOIN users gr ON k.giver_user_id = gr.id
      JOIN users rc ON k.receiver_user_id = rc.id
      WHERE k.giver_user_id = ${userId} OR k.receiver_user_id = ${userId}
      ORDER BY k.created_at DESC
    `);
    return result.rows;
  }

  async createManagerFeedback(data: InsertManagerFeedback): Promise<ManagerFeedbackEntry> {
    const [newItem] = await db.insert(managerFeedback).values(data).returning();
    return newItem;
  }

  async getManagerFeedbackBySubmitter(userId: string, period: string): Promise<ManagerFeedbackEntry | undefined> {
    const [result] = await db.select().from(managerFeedback)
      .where(and(eq(managerFeedback.submitterUserId, userId), eq(managerFeedback.submissionPeriod, period)));
    return result;
  }

  async getManagerFeedbackForSenior(mgrEmail?: string, period?: string): Promise<any[]> {
    const conditions = [];
    if (mgrEmail) conditions.push(sql`mf.manager_email = ${mgrEmail}`);
    if (period) conditions.push(sql`mf.submission_period = ${period}`);
    const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;
    const result = await db.execute(sql`
      SELECT 
        mf.id,
        mf.manager_email as "managerEmail",
        mf.feedback_text as "feedbackText",
        mf.rating,
        mf.submission_period as "submissionPeriod",
        mf.created_at as "createdAt",
        CONCAT(mgr.first_name, ' ', mgr.last_name) as "managerName"
      FROM manager_feedback mf
      LEFT JOIN users mgr ON mgr.email = mf.manager_email
      ${whereClause}
      ORDER BY mf.created_at DESC
    `);
    return result.rows;
  }

  async getManagerFeedbackSummary(): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT 
        mf.manager_email as "managerEmail",
        CONCAT(mgr.first_name, ' ', mgr.last_name) as "managerName",
        mgr.dept_code as "deptCode",
        COUNT(mf.id) as "totalFeedback",
        ROUND(AVG(mf.rating)::numeric, 1) as "avgRating"
      FROM manager_feedback mf
      LEFT JOIN users mgr ON mgr.email = mf.manager_email
      GROUP BY mf.manager_email, mgr.first_name, mgr.last_name, mgr.dept_code
      ORDER BY AVG(mf.rating) ASC
    `);
    return result.rows;
  }

  async getSentimentDistribution(period: string, groupBy: "dept" | "project"): Promise<any[]> {
    const groupCol = groupBy === "project" ? sql`u.project_code` : sql`u.dept_code`;
    const groupLabel = groupBy === "project" ? "project_code" : "dept_code";
    const projectFilter = groupBy === "project" ? sql` AND u.project_code IS NOT NULL AND u.project_code != ''` : sql``;
    const result = await db.execute(sql`
      SELECT 
        ${groupCol} as ${sql.raw(groupLabel)},
        COUNT(*) FILTER (WHERE f.ai_sentiment >= 7) as excellent,
        COUNT(*) FILTER (WHERE f.ai_sentiment >= 5 AND f.ai_sentiment < 7) as good,
        COUNT(*) FILTER (WHERE f.ai_sentiment >= 3 AND f.ai_sentiment < 5) as fair,
        COUNT(*) FILTER (WHERE f.ai_sentiment < 3 AND f.ai_sentiment > 0) as low,
        COUNT(*) FILTER (WHERE f.ai_sentiment IS NULL OR f.ai_sentiment = 0) as no_data,
        COUNT(*) as total
      FROM users u
      JOIN feedback f ON u.id = f.user_id
      WHERE f.submission_period = ${period} AND u.is_admin = false ${projectFilter}
      GROUP BY ${groupCol}
      ORDER BY ${groupCol}
    `);
    return result.rows;
  }

  async getTopBlockers(period: string, groupBy: "dept" | "project"): Promise<any[]> {
    const groupCol = groupBy === "project" ? sql`u.project_code` : sql`u.dept_code`;
    const groupLabel = groupBy === "project" ? "project_code" : "dept_code";
    const projectFilter = groupBy === "project" ? sql` AND u.project_code IS NOT NULL AND u.project_code != ''` : sql``;
    const result = await db.execute(sql`
      SELECT 
        ${groupCol} as ${sql.raw(groupLabel)},
        f.blockers,
        f.ai_sentiment,
        f.sat_score
      FROM users u
      JOIN feedback f ON u.id = f.user_id
      WHERE f.submission_period = ${period} 
        AND u.is_admin = false 
        AND f.blockers IS NOT NULL 
        AND f.blockers != ''
        AND LOWER(TRIM(f.blockers)) NOT IN ('none', 'n/a', 'na', 'no', 'nothing', '-', 'no blockers', 'no blockers this period', 'nil')
        AND LOWER(TRIM(f.blockers)) NOT LIKE '%no significant%'
        AND LOWER(TRIM(f.blockers)) NOT LIKE '%no major%'
        AND LOWER(TRIM(f.blockers)) NOT LIKE '%no blockers%'
        AND LOWER(TRIM(f.blockers)) NOT LIKE '%no issues%'
        AND LOWER(TRIM(f.blockers)) NOT LIKE '%nothing significant%'
        ${projectFilter}
      ORDER BY f.ai_sentiment ASC, f.sat_score ASC
    `);
    return result.rows;
  }
}

export const storage = new DatabaseStorage();
