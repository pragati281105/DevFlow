import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1).max(80),
  key: z
    .string()
    .min(2)
    .max(8)
    .regex(/^[A-Z][A-Z0-9]*$/, 'Key must be uppercase letters/digits, e.g. DEV'),
  description: z.string().max(500).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional(),
  archived: z.boolean().optional(),
});

export const projectParamsSchema = z.object({
  workspaceId: z.string().min(1),
  projectId: z.string().min(1),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
