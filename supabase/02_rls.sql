-- ==============================================================================
-- SQL SQUAD - ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_question_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_scores ENABLE ROW LEVEL SECURITY;

-- Security Definer Function: Check if the calling user has the 'admin' role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- -----------------------------------------------------------------------------
-- PROFILES POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Profiles are readable by everyone"
    ON public.profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- USER ROLES POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can see their own role"
    ON public.user_roles FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Only admins can manage roles"
    ON public.user_roles FOR ALL
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- TOPICS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Topics are readable by everyone"
    ON public.topics FOR SELECT
    USING (true);

CREATE POLICY "Only admins can insert or update topics"
    ON public.topics FOR ALL
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- QUESTIONS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Published questions readable by all users"
    ON public.questions FOR SELECT
    USING (status = 'published' OR public.is_admin());

CREATE POLICY "Admins have full CRUD access to questions"
    ON public.questions FOR ALL
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- QUESTION DATASETS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Datasets readable for published questions or admins"
    ON public.question_datasets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.questions q
            WHERE q.id = question_id AND (q.status = 'published' OR public.is_admin())
        )
    );

CREATE POLICY "Admins have full access to question datasets"
    ON public.question_datasets FOR ALL
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- QUESTION TEST CASES POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Non-hidden test cases readable by authenticated users"
    ON public.question_test_cases FOR SELECT
    USING (
        (NOT is_hidden AND EXISTS (
            SELECT 1 FROM public.questions q
            WHERE q.id = question_id AND q.status = 'published'
        )) OR public.is_admin()
    );

CREATE POLICY "Admins have full access to test cases"
    ON public.question_test_cases FOR ALL
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- QUESTION SCHEDULES POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Active schedules are readable by authenticated users"
    ON public.question_schedules FOR SELECT
    USING (is_active = true OR public.is_admin());

CREATE POLICY "Admins have full access to question schedules"
    ON public.question_schedules FOR ALL
    USING (public.is_admin());

-- -----------------------------------------------------------------------------
-- SUBMISSIONS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view their own submissions or admins view all"
    ON public.submissions FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Authenticated users can insert submissions for themselves"
    ON public.submissions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- USER QUESTION PROGRESS POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can read their own question progress"
    ON public.user_question_progress FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can update or insert their own question progress"
    ON public.user_question_progress FOR ALL
    USING (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- LEADERBOARD SCORES POLICIES
-- -----------------------------------------------------------------------------
CREATE POLICY "Leaderboard scores are publicly readable"
    ON public.leaderboard_scores FOR SELECT
    USING (true);

CREATE POLICY "System/Admins can update leaderboard scores"
    ON public.leaderboard_scores FOR ALL
    USING (public.is_admin() OR auth.uid() = user_id);
