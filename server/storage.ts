import { type User, type UpsertUser, type InsertFeedback, type Feedback, type InsertManagerReview, type ManagerReview, type InsertActionItem, type ActionItem, type UpdateActionItemRequest } from "@shared/schema";
import { db } from "./db";
import { users, feedback, managerReviews, actionItems } from "@shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(data: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  deleteUser(id: string): Promise<void>;
  getUsersByRole(role: string): Promise<User[]>;
  getUsersByManager(managerEmail: string): Promise<User[]>;
  getAllUsers(): Promise<User[]>;

  createFeedback(feedback: InsertFeedback & { aiSentiment?: number; aiSummary?: string; aiSuggestedActionItems?: string }): Promise<Feedback>;
  getFeedback(id: number): Promise<Feedback | undefined>;
  getFeedbackByUser(userId: string): Promise<Feedback[]>;
  getAllFeedback(): Promise<Feedback[]>;

  createManagerReview(review: InsertManagerReview): Promise<ManagerReview>;
  getReviewsByFeedbackId(feedbackId: number): Promise<ManagerReview[]>;

  createActionItem(item: InsertActionItem): Promise<ActionItem>;
  getActionItems(empEmail?: string, mgrEmail?: string): Promise<ActionItem[]>;
  updateActionItem(id: number, updates: UpdateActionItemRequest): Promise<ActionItem>;
  
  getDepartmentStats(): Promise<any[]>;
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
    await db.delete(users).where(eq(users.id, id));
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

  async updateActionItem(id: number, updates: UpdateActionItemRequest): Promise<ActionItem> {
    const [updated] = await db.update(actionItems).set(updates).where(eq(actionItems.id, id)).returning();
    return updated;
  }

  async getDepartmentStats(): Promise<any[]> {
    const result = await db.execute(sql`
      SELECT 
        u.dept_code,
        AVG(f.sat_score) as avg_sat_score,
        COUNT(f.id) as total_feedback
      FROM users u
      JOIN feedback f ON u.id = f.user_id
      GROUP BY u.dept_code
    `);
    return result.rows;
  }
}

export const storage = new DatabaseStorage();
