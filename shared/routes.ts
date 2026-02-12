import { z } from 'zod';
import { 
  insertFeedbackSchema, 
  insertManagerReviewSchema, 
  insertActionItemSchema,
  feedback,
  managerReviews,
  actionItems,
  users
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  feedback: {
    create: {
      method: 'POST' as const,
      path: '/api/feedback' as const,
      input: insertFeedbackSchema,
      responses: {
        201: z.custom<typeof feedback.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/feedback' as const,
      input: z.object({
        userId: z.string().optional(),
        period: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof feedback.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/feedback/:id' as const,
      responses: {
        200: z.custom<typeof feedback.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  reviews: {
    create: {
      method: 'POST' as const,
      path: '/api/reviews' as const,
      input: insertManagerReviewSchema,
      responses: {
        201: z.custom<typeof managerReviews.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/reviews/:feedbackId' as const,
      responses: {
        200: z.custom<typeof managerReviews.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    upsert: {
      method: 'POST' as const,
      path: '/api/reviews' as const,
      input: insertManagerReviewSchema,
      responses: {
        200: z.custom<typeof managerReviews.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
  actionItems: {
    create: {
      method: 'POST' as const,
      path: '/api/action-items' as const,
      input: insertActionItemSchema,
      responses: {
        201: z.custom<typeof actionItems.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    list: {
      method: 'GET' as const,
      path: '/api/action-items' as const,
      input: z.object({
        empEmail: z.string().optional(),
        mgrEmail: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof actionItems.$inferSelect>()),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/action-items/:id' as const,
      input: insertActionItemSchema.partial(),
      responses: {
        200: z.custom<typeof actionItems.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/action-items/:id' as const,
      responses: {
        200: z.object({ message: z.string() }),
        404: errorSchemas.notFound,
      },
    },
  },
  users: {
    list: {
      method: 'GET' as const,
      path: '/api/users' as const,
      input: z.object({
        role: z.string().optional(),
        managerEmail: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/users/:id' as const,
      input: z.object({
        role: z.enum(["EMPLOYEE", "MANAGER", "SENIOR_MGMT"]).optional(),
        deptCode: z.string().optional(),
        managerEmail: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
      }
    }
  },
  analytics: {
    burnout: {
      method: 'GET' as const,
      path: '/api/analytics/burnout' as const,
      responses: {
        200: z.array(z.object({
          userId: z.string(),
          fullName: z.string(),
          currentSentiment: z.number().nullable(),
          previousSentiment: z.number().nullable(),
          dropPercentage: z.number(),
          riskLevel: z.enum(["Low", "Medium", "High"]),
        })),
      },
    },
    department: {
      method: 'GET' as const,
      path: '/api/analytics/department' as const,
      responses: {
        200: z.array(z.object({
          deptCode: z.string(),
          avgSatScore: z.number(),
          avgMoodScore: z.number(),
          totalFeedback: z.number(),
        })),
      },
    },
    teamFeedback: {
      method: 'GET' as const,
      path: '/api/analytics/team-feedback' as const,
      input: z.object({
        managerEmail: z.string(),
        period: z.string().optional(),
      }),
      responses: {
        200: z.array(z.object({
          id: z.number(),
          userId: z.string(),
          fullName: z.string(),
          deptCode: z.string().nullable(),
          submissionPeriod: z.string(),
          satScore: z.number(),
          moodScore: z.string(),
          aiSentiment: z.number().nullable(),
          reviewed: z.boolean(),
          createdAt: z.string().nullable(),
        })),
      },
    },
    leaderAccountability: {
      method: 'GET' as const,
      path: '/api/analytics/leader-accountability' as const,
      responses: {
        200: z.array(z.object({
          managerEmail: z.string(),
          totalTasks: z.number(),
          pendingCount: z.number(),
          overdueCount: z.number(),
        })),
      },
    },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
