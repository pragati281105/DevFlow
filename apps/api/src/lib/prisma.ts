import { PrismaClient } from '@prisma/client';

// Singleton so that a single connection pool is used for the whole process.
// In tests, each test file can call `prisma.$disconnect()` in afterAll.
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export default prisma;
