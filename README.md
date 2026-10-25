# DevFlow

A full-stack issue tracking and project management platform for engineering teams, inspired by Jira and Linear. Built from scratch with TypeScript, React, Express, PostgreSQL, and Prisma.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=nodedotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?logo=prisma&logoColor=white)
![Tests](https://img.shields.io/badge/tests-26%20passing-brightgreen)

## Features

- **Authentication**: register, login, and logout with secure HttpOnly cookie sessions and bcrypt password hashing
- **Workspaces**: multi-tenant isolation; users can own or join multiple workspaces
- **Role-based access control**: `OWNER > ADMIN > MEMBER > VIEWER`, enforced on every API route
- **Projects**: each project has a unique key (e.g. `BACK`) within its workspace
- **Issues**: auto-keyed (`BACK-1`, `BACK-2`, ...), filterable by status and priority, paginated
- **Two issue views**: list table and Kanban board
- **Issue detail**: inline title editing, status and priority dropdowns, due date, and comments
- **Comments**: per-issue threads with author attribution and timestamps
- **Activity events**: database-level audit log for status changes and comments
- **Security**: IDOR prevention (cross-workspace access blocked), rate limiting, Helmet headers, CORS

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, TypeScript, Express, Prisma ORM |
| Database | PostgreSQL |
| Frontend | React 18, TypeScript, Vite, Vanilla CSS |
| Auth | HttpOnly cookie sessions, bcrypt |
| Testing | Vitest, Supertest |

## Project Structure

```
DevFlow/
├── apps/
│   ├── api/                  # Express API (port 3001)
│   │   ├── prisma/           # Schema, migrations, seed
│   │   └── src/
│   │       ├── modules/      # auth, workspaces, projects, issues, comments
│   │       └── middleware/   # session, requireAuth, requireMember, validate
│   └── web/                  # React SPA (port 5173)
│       └── src/
│           ├── features/     # auth, workspaces, issues
│           ├── lib/          # api client, auth context
│           └── router.tsx
└── package.json              # npm workspaces root
```

## Getting Started

### Prerequisites

- Node.js 18 or later
- PostgreSQL running locally
- npm

### 1. Clone and install

```bash
git clone https://github.com/pragati281105/DevFlow.git
cd DevFlow
npm install
```

### 2. Configure environment variables

Create `apps/api/.env` with your own values:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/devflow"
SESSION_SECRET="replace-with-a-long-random-string"
PORT=3001
```

### 3. Set up the database

```bash
cd apps/api
npx prisma migrate dev
npx prisma db seed
cd ../..
```

### 4. Run the app

In two terminals:

```bash
# Terminal 1: API on http://localhost:3001
npm run dev --workspace=apps/api

# Terminal 2: Web on http://localhost:5173
npm run dev --workspace=apps/web
```

Open http://localhost:5173 and sign in with the demo account:

```
Email:    alice@devflow.dev
Password: Password123!
```

> This is seed data for local development only.

## Running Tests

```bash
npm test --workspace=apps/api
```

The suite contains 26 integration tests (Vitest + Supertest), including tests that verify cross-workspace access is blocked with `403` responses.

## Security Notes

- Session tokens are random and opaque, and stored hashed in the database
- Cookies are `HttpOnly` and `SameSite`
- Every workspace-scoped route verifies membership and role before touching data
- Rate limiting and Helmet security headers are enabled

## Roadmap (Milestone 2)

- [ ] CSRF token enforcement
- [ ] Labels UI
- [ ] Sprint board
- [ ] Drag-and-drop Kanban
- [ ] Activity feed

## Author

**Pragati**: [GitHub](https://github.com/pragati281105)
