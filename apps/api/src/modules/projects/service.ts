import prisma from '../../lib/prisma.js';
import { AppError } from '../../middleware/errorHandler.js';
import type { CreateProjectInput, UpdateProjectInput } from './schemas.js';

const PROJECT_SELECT = {
  id: true,
  workspaceId: true,
  name: true,
  key: true,
  description: true,
  archived: true,
  issueCount: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function createProject(workspaceId: string, input: CreateProjectInput) {
  const conflict = await prisma.project.findUnique({
    where: { workspaceId_key: { workspaceId, key: input.key } },
  });
  if (conflict) throw new AppError(409, 'KEY_TAKEN', `A project with key '${input.key}' already exists.`);

  return prisma.project.create({ data: { workspaceId, ...input }, select: PROJECT_SELECT });
}

export async function listProjects(workspaceId: string, includeArchived = false) {
  return prisma.project.findMany({
    where: { workspaceId, archived: includeArchived ? undefined : false },
    select: PROJECT_SELECT,
    orderBy: { createdAt: 'asc' },
  });
}

export async function getProject(workspaceId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, workspaceId },
    select: PROJECT_SELECT,
  });
  if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found.');
  return project;
}

export async function updateProject(workspaceId: string, projectId: string, input: UpdateProjectInput) {
  await getProject(workspaceId, projectId);
  return prisma.project.update({ where: { id: projectId }, data: input, select: PROJECT_SELECT });
}

export async function archiveProject(workspaceId: string, projectId: string) {
  await getProject(workspaceId, projectId);
  return prisma.project.update({ where: { id: projectId }, data: { archived: true }, select: PROJECT_SELECT });
}
