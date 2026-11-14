# SQL Squad — Supabase Database Setup Guide

This folder contains the complete, production-ready PostgreSQL database migrations and seeds for **SQL Squad**.

## Applying Migrations to Supabase

1. Open your [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to the **SQL Editor** tab.
3. Execute the SQL scripts in numerical sequence:

### Script Execution Order

1. **`01_schema.sql`**:
   - Creates UUID and pgcrypto extensions.
   - Defines ENUM types (`app_role`, `question_difficulty`, `question_status`, `submission_status`, `progress_status`).
   - Creates all 10 core tables with primary keys, foreign keys, and unique constraints.
   - Creates performance indexes.

2. **`02_rls.sql`**:
   - Enables Row Level Security (RLS) on all tables.
   - Defines the `is_admin()` security definer function.
   - Configures granular SELECT, INSERT, UPDATE, and DELETE policies for public profiles, user submissions, personal progress, and admin capabilities.

3. **`03_triggers.sql`**:
   - Attaches `handle_new_user()` trigger to `auth.users` to automatically create user profiles, award the first user the 'admin' role, and initialize leaderboard score entries.
   - Attaches `handle_submission_rollup()` trigger to `public.submissions` to automatically update user streak, calculate streak increments based on UTC dates, and roll up solved questions and points into the leaderboard.

4. **`04_seed.sql`**:
   - Seeds initial core topics (`joins`, `aggregations`, `window-functions`, `subqueries-ctes`).
   - Seeds real-world questions with full problem descriptions, schemas, datasets, hints, explanations, and test cases:
     - Easy: *High-Value Customer Orders*
     - Medium: *Second Highest Earner per Department*
     - Hard: *Consecutive Login Streaks (Gaps and Islands)*
   - Schedules daily questions starting from today.

---

## Environment Variables Configuration

Copy your Supabase project credentials into `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  supabase: {
    url: 'https://YOUR_PROJECT_REF.supabase.co',
    anonKey: 'YOUR_ANON_PUBLIC_KEY' // NEVER use service_role key here
  }
};
```
