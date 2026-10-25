import { z } from 'zod';

export const createIssueSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().max(10000).optional(),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']).optional(),
  priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NO_PRIORITY']).optional(),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  labelIds: z.array(z.string()).optional(),
});

export const updateIssueSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(10000).optional().nullable(),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']).optional(),
  priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NO_PRIORITY']).optional(),
  assigneeId: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
  archived: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export const issueQuerySchema = z.object({
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']).optional(),
  priority: z.enum(['URGENT', 'HIGH', 'MEDIUM', 'LOW', 'NO_PRIORITY']).optional(),
  assigneeId: z.string().optional(),
  archived: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1)),
  pageSize: z
    .string()
    .optional()
    .transform((v) => Math.min(v ? parseInt(v, 10) : 25, 100)),
  search: z.string().optional(),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>;
export type IssueQuery = z.infer<typeof issueQuerySchema>;
