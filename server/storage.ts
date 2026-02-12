import { db } from "./db";
import { 
  users, feedback, managerReviews, actionItems,
  type User, type InsertFeedback, type Feedback, 
  type InsertManagerReview, type ManagerReview,
  type InsertActionItem, type ActionItem,
  type UpdateActionItemRequest
} from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  getUsersByRole(role: string): Promise<User[]>;
  getUsersByManager(managerEmail: string): Promise<User[]>;
  getAllUsers(): Promise<User[]>;

  // Feedback
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  getFeedback(id: number): Promise<Feedback | undefined>;
  getFeedbackByUser(userId: string): Promise<Feedback[]>;
  getAllFeedback(): Promise<Feedback[]>; // For Senior Mgmt

  // Reviews
  createManagerReview(review: InsertManagerReview): Promise<ManagerReview>;
  getReviewsByFeedbackId(feedbackId: number): Promise<ManagerReview[]>;

  // Action Items
  createActionItem(item: InsertActionItem): Promise<ActionItem>;
  getActionItems(empEmail?: string, mgrEmail?: string): Promise<ActionItem[]>;
  updateActionItem(id: number, updates: UpdateActionItemRequest): Promise<ActionItem>;
  
  // Analytics
  getDepartmentStats(): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return updated;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role));
  }
  
  async getUsersByManager(managerEmail: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.managerEmail, managerEmail));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  // Feedback
  async createFeedback(insertFeedback: InsertFeedback): Promise<Feedback> {
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

  // Reviews
  async createManagerReview(review: InsertManagerReview): Promise<ManagerReview> {
    const [newItem] = await db.insert(managerReviews).values(review).returning();
    return newItem;
  }

  async getReviewsByFeedbackId(feedbackId: number): Promise<ManagerReview[]> {
    return db.select().from(managerReviews).where(eq(managerReviews.feedbackId, feedbackId));
  }

  // Action Items
  async createActionItem(item: InsertActionItem): Promise<ActionItem> {
    const [newItem] = await db.insert(actionItems).values(item).returning();
    return newItem;
  }

  async getActionItems(empEmail?: string, mgrEmail?: string): Promise<ActionItem[]> {
    let query = db.select().from(actionItems);
    
    if (empEmail && mgrEmail) {
      // @ts-ignore
      query = query.where(and(eq(actionItems.empEmail, empEmail), eq(actionItems.mgrEmail, mgrEmail)));
    } else if (empEmail) {
      // @ts-ignore
      query = query.where(eq(actionItems.empEmail, empEmail));
    } else if (mgrEmail) {
      // @ts-ignore
      query = query.where(eq(actionItems.mgrEmail, mgrEmail));
    }
    
    // @ts-ignore
    return query.orderBy(desc(actionItems.dueDate));
  }

  async updateActionItem(id: number, updates: UpdateActionItemRequest): Promise<ActionItem> {
    const [updated] = await db.update(actionItems).set(updates).where(eq(actionItems.id, id)).returning();
    return updated;
  }

  // Analytics
  async getDepartmentStats(): Promise<any[]> {
    // This is a complex aggregation, simulating it via simple query + JS processing or raw SQL if needed.
    // For now, let's fetch users + feedback and aggregate in memory or use raw SQL.
    // Raw SQL for aggregation:
    const result = await db.execute(sql`
      SELECT 
        u.dept_code,
        AVG(f.sat_score) as avg_sat_score,
        AVG(f.mood_score) as avg_mood_score,
        COUNT(f.id) as total_feedback
      FROM users u
      JOIN feedback f ON u.id = f.user_id
      GROUP BY u.dept_code
    `);
    return result.rows;
  }
}

export const storage = new DatabaseStorage();
