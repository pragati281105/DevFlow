import { z } from 'zod';

const slugRe = /^[a-z0-9-]+$/;

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(80),
  slug: z
    .string()
    .min(2)
    .max(40)
    .regex(slugRe, 'Slug may only contain lowercase letters, numbers, and hyphens'),
  description: z.string().max(300).optional(),
});

export const updateWorkspaceSchema = createWorkspaceSchema.partial();

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).default('MEMBER'),
});

export const updateMemberSchema = z.object({
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']),
});

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
