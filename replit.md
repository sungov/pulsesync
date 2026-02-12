# Pulse-Sync AI

## Overview

Pulse-Sync AI is a full-stack Performance Intelligence platform that helps organizations monitor employee satisfaction, detect burnout risks, and facilitate manager-employee accountability. The platform uses AI-powered sentiment analysis on employee feedback, provides role-based dashboards (Employee, Manager, Senior Management, Admin), and includes features like a Burnout Radar, action item tracking, and executive analytics.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend

- **Framework**: React 18 with TypeScript, bundled via Vite
- **Routing**: Wouter (lightweight client-side router)
- **State Management**: TanStack React Query for server state; no separate client state library
- **UI Components**: Shadcn/ui (new-york style) built on Radix UI primitives with Tailwind CSS
- **Styling**: Tailwind CSS with CSS variables for theming (Slate/Indigo professional palette), custom fonts (Inter, Outfit, JetBrains Mono)
- **Animations**: Framer Motion for page transitions and micro-interactions
- **Charts**: Recharts for data visualization (sentiment trends, department analytics)
- **Icons**: Lucide React
- **Source location**: `client/src/` with path alias `@/` mapping to `client/src/`

### Role-Based Access Control

The app has four user roles: EMPLOYEE, MANAGER, SENIOR_MGMT, plus an `isAdmin` flag. The frontend controls navigation visibility based on role (Sidebar component filters nav items). The backend enforces access with `isAuthenticated` and `isAdmin` middleware.

- **Employees** see their feedback submission form and action items
- **Managers** see their team's burnout radar, can create action items and conduct reviews
- **Senior Management** sees department-wide analytics, manager audit tables, and a "Nudge" feature
- **Admins** can manage users (create, approve, delete, assign roles)

### Backend

- **Runtime**: Node.js with Express
- **Language**: TypeScript, executed via `tsx` in development
- **Build**: Custom build script using esbuild (server) + Vite (client), outputs to `dist/`
- **API Pattern**: RESTful JSON API under `/api/` prefix, with shared route contracts defined in `shared/routes.ts` using Zod schemas
- **AI Integration**: OpenAI API (via Replit AI Integrations proxy) for sentiment analysis of employee feedback text. The API key and base URL come from `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL` environment variables.
- **Server entry point**: `server/index.ts` creates an HTTP server, registers routes, and in development uses Vite middleware for HMR; in production serves static files from `dist/public/`

### Authentication

- **Method**: Email/password authentication with bcryptjs for password hashing
- **Sessions**: Express sessions stored in PostgreSQL via `connect-pg-simple`. The sessions table must exist in the database.
- **Session secret**: Read from `SESSION_SECRET` environment variable
- **Legacy Replit Auth**: There are remnants of Replit OpenID Connect auth in `server/replit_integrations/auth/` but the active auth system is the custom email/password flow in `server/auth.ts`

### Database

- **Database**: PostgreSQL (required, connection via `DATABASE_URL` environment variable)
- **ORM**: Drizzle ORM with `drizzle-orm/node-postgres` driver
- **Schema location**: `shared/schema.ts` (main) and `shared/models/` (auth, chat models)
- **Migrations**: Drizzle Kit with `drizzle-kit push` command (schema push, not migration files)
- **Connection**: pg Pool in `server/db.ts`

#### Key Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts with role, department, manager email, approval status, admin flag |
| `sessions` | Express session storage (PostgreSQL) |
| `feedback` | Employee periodic feedback with satisfaction scores, mood, accomplishments, blockers, and AI-generated sentiment/summary |
| `manager_reviews` | Manager notes attached to specific feedback entries |
| `action_items` | Tasks assigned by managers to employees with due dates and status tracking |
| `conversations` | Chat conversation metadata (for AI chat feature) |
| `messages` | Individual chat messages within conversations |

### Data Flow

1. Employee submits feedback → backend sends text to OpenAI for sentiment analysis → stores feedback with AI sentiment score and summary
2. Manager views team dashboard → sees burnout radar (compares current vs previous sentiment scores, flags >30% drops)
3. Senior management views executive hub → department-wide aggregated stats, manager audit data
4. Action items track accountability with overdue highlighting (red badge for past-due pending items)

### Shared Code

The `shared/` directory contains code used by both frontend and backend:
- `shared/schema.ts` - Drizzle table definitions and Zod insert schemas
- `shared/models/auth.ts` - User and session table definitions
- `shared/models/chat.ts` - Conversation and message table definitions  
- `shared/routes.ts` - API contract definitions with Zod validation schemas

Path alias `@shared/` maps to `shared/` in both TypeScript and Vite configs.

### Replit Integrations

The `server/replit_integrations/` and `client/replit_integrations/` directories contain pre-built integration modules:
- **Audio**: Voice recording, playback, and streaming (client hooks + server routes)
- **Auth**: Replit OpenID Connect auth (legacy, not actively used)
- **Chat**: Conversation CRUD with OpenAI streaming
- **Image**: Image generation via OpenAI
- **Batch**: Batch processing utilities with rate limiting and retries

These are available but not all actively wired into the main application routes.

## External Dependencies

### Required Services

| Service | Environment Variable | Purpose |
|---------|---------------------|---------|
| PostgreSQL | `DATABASE_URL` | Primary database for all data storage |
| OpenAI API (via Replit) | `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL` | Sentiment analysis, AI summaries, chat completions |
| Session Secret | `SESSION_SECRET` | Express session encryption key |

### Key NPM Packages

- **Server**: express, drizzle-orm, pg, openai, bcryptjs, express-session, connect-pg-simple, zod
- **Client**: react, wouter, @tanstack/react-query, framer-motion, recharts, shadcn/ui (radix primitives), tailwindcss, date-fns, lucide-react
- **Shared**: drizzle-zod, zod

### Development Tools

- `tsx` for running TypeScript directly in development
- `vite` for frontend dev server with HMR
- `drizzle-kit` for database schema management
- `esbuild` for production server bundling