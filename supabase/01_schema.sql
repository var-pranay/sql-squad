-- ==============================================================================
-- SQL SQUAD - DATABASE SCHEMA DEFINITION
-- PostgreSQL / Supabase
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. CUSTOM TYPES & ENUMS
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE app_role AS ENUM ('admin', 'user');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_difficulty') THEN
        CREATE TYPE question_difficulty AS ENUM ('easy', 'medium', 'hard');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'question_status') THEN
        CREATE TYPE question_status AS ENUM ('draft', 'published', 'archived');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'submission_status') THEN
        CREATE TYPE submission_status AS ENUM ('accepted', 'wrong_answer', 'runtime_error', 'time_limit_exceeded');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'progress_status') THEN
        CREATE TYPE progress_status AS ENUM ('unattempted', 'attempted', 'solved');
    END IF;
END $$;

-- 3. USER PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100),
    avatar_url TEXT,
    bio VARCHAR(255),
    current_streak INT NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
    max_streak INT NOT NULL DEFAULT 0 CHECK (max_streak >= 0),
    last_active_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. USER ROLES
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'user',
    granted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_roles_user_role UNIQUE (user_id, role)
);

-- 5. TOPICS (E.g., Aggregations, Joins, Window Functions, CTEs)
CREATE TABLE IF NOT EXISTS public.topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(60) UNIQUE NOT NULL,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    icon_name VARCHAR(50) DEFAULT 'database',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. QUESTIONS
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic_id UUID REFERENCES public.topics(id) ON DELETE SET NULL,
    slug VARCHAR(120) UNIQUE NOT NULL,
    title VARCHAR(150) NOT NULL,
    difficulty question_difficulty NOT NULL DEFAULT 'medium',
    description_markdown TEXT NOT NULL,
    hint_markdown TEXT,
    explanation_markdown TEXT,
    status question_status NOT NULL DEFAULT 'draft',
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    points INT NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. QUESTION DATASETS (Schema DDL and Seed Data for sandbox execution)
CREATE TABLE IF NOT EXISTS public.question_datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    schema_ddl TEXT NOT NULL,
    seed_data_sql TEXT NOT NULL,
    dialect VARCHAR(30) NOT NULL DEFAULT 'postgresql',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_question_datasets_question UNIQUE (question_id)
);

-- 8. QUESTION TEST CASES
CREATE TABLE IF NOT EXISTS public.question_test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    test_name VARCHAR(100) NOT NULL,
    expected_query TEXT NOT NULL,
    expected_output_preview JSONB,
    is_hidden BOOLEAN NOT NULL DEFAULT false,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. QUESTION SCHEDULES (Daily challenge assignment)
CREATE TABLE IF NOT EXISTS public.question_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    scheduled_date DATE UNIQUE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. SUBMISSIONS (Immutable history of student attempts)
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    query_sql TEXT NOT NULL,
    status submission_status NOT NULL,
    execution_time_ms INT NOT NULL DEFAULT 0,
    error_message TEXT,
    passed_test_cases INT NOT NULL DEFAULT 0,
    total_test_cases INT NOT NULL DEFAULT 0,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. USER QUESTION PROGRESS (Rollup of solve state per question)
CREATE TABLE IF NOT EXISTS public.user_question_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    status progress_status NOT NULL DEFAULT 'unattempted',
    attempt_count INT NOT NULL DEFAULT 0,
    best_execution_time_ms INT,
    first_solved_at TIMESTAMPTZ,
    last_attempted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_question_progress UNIQUE (user_id, question_id)
);

-- 12. LEADERBOARD SCORES (Materialized rollup for fast ranking)
CREATE TABLE IF NOT EXISTS public.leaderboard_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_solved INT NOT NULL DEFAULT 0,
    easy_solved INT NOT NULL DEFAULT 0,
    medium_solved INT NOT NULL DEFAULT 0,
    hard_solved INT NOT NULL DEFAULT 0,
    total_points INT NOT NULL DEFAULT 0,
    current_streak INT NOT NULL DEFAULT 0,
    rank_position INT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 13. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_questions_status_difficulty ON public.questions(status, difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_topic_id ON public.questions(topic_id);
CREATE INDEX IF NOT EXISTS idx_question_schedules_active_date ON public.question_schedules(scheduled_date) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_submissions_user_question_time ON public.submissions(user_id, question_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_question_progress_user ON public.user_question_progress(user_id, status);
CREATE INDEX IF NOT EXISTS idx_leaderboard_ranking ON public.leaderboard_scores(total_points DESC, total_solved DESC, current_streak DESC);
