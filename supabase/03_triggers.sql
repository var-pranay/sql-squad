-- ==============================================================================
-- SQL SQUAD - DATABASE TRIGGERS & AUTOMATION
-- ==============================================================================

-- 1. AUTOMATIC PROFILE & ROLE CREATION ON USER SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_username TEXT;
    is_first_user BOOLEAN;
BEGIN
    -- Extract username from raw_user_meta_data or fallback to email prefix
    new_username := COALESCE(
        NEW.raw_user_meta_data->>'username',
        split_part(NEW.email, '@', 1) || '_' || substr(gen_random_uuid()::text, 1, 4)
    );

    -- Ensure username uniqueness
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = new_username) LOOP
        new_username := new_username || '_' || floor(random() * 1000)::text;
    END LOOP;

    -- Create user profile
    INSERT INTO public.profiles (id, username, full_name, avatar_url)
    VALUES (
        NEW.id,
        new_username,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
    );

    -- Check if this is the very first user in the system -> grant Admin role automatically
    SELECT NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO is_first_user;

    IF is_first_user THEN
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    ELSE
        INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
    END IF;

    -- Initialize leaderboard score record
    INSERT INTO public.leaderboard_scores (user_id, total_solved, easy_solved, medium_solved, hard_solved, total_points, current_streak)
    VALUES (NEW.id, 0, 0, 0, 0, 0, 0);

    RETURN NEW;
END;
$$;

-- Trigger attached to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. AUTOMATIC LEADERBOARD & PROGRESS ROLLUP ON ACCEPTED SUBMISSION
CREATE OR REPLACE FUNCTION public.handle_submission_rollup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    q_diff question_difficulty;
    q_points INT;
    was_already_solved BOOLEAN;
    user_last_active DATE;
    today_utc DATE := CURRENT_DATE;
    new_streak INT;
BEGIN
    -- Only trigger on accepted submissions
    IF NEW.status = 'accepted' THEN
        -- Get question details
        SELECT difficulty, points INTO q_diff, q_points
        FROM public.questions WHERE id = NEW.question_id;

        -- Check previous progress
        SELECT (status = 'solved') INTO was_already_solved
        FROM public.user_question_progress
        WHERE user_id = NEW.user_id AND question_id = NEW.question_id;

        -- Upsert user question progress
        INSERT INTO public.user_question_progress (
            user_id, question_id, status, attempt_count, best_execution_time_ms, first_solved_at, last_attempted_at
        )
        VALUES (
            NEW.user_id,
            NEW.question_id,
            'solved',
            1,
            NEW.execution_time_ms,
            NEW.submitted_at,
            NEW.submitted_at
        )
        ON CONFLICT (user_id, question_id) DO UPDATE SET
            status = 'solved',
            attempt_count = public.user_question_progress.attempt_count + 1,
            best_execution_time_ms = LEAST(public.user_question_progress.best_execution_time_ms, NEW.execution_time_ms),
            first_solved_at = COALESCE(public.user_question_progress.first_solved_at, NEW.submitted_at),
            last_attempted_at = NEW.submitted_at;

        -- Streak calculation
        SELECT last_active_date, current_streak INTO user_last_active, new_streak
        FROM public.profiles WHERE id = NEW.user_id;

        IF user_last_active IS NULL OR user_last_active < today_utc - INTERVAL '1 day' THEN
            -- Streak reset or first day
            new_streak := 1;
        ELSIF user_last_active = today_utc - INTERVAL '1 day' THEN
            -- Consecutive day solve
            new_streak := new_streak + 1;
        END IF;
        -- If user_last_active = today_utc, streak remains unchanged

        UPDATE public.profiles
        SET current_streak = new_streak,
            max_streak = GREATEST(max_streak, new_streak),
            last_active_date = today_utc,
            updated_at = timezone('utc'::text, now())
        WHERE id = NEW.user_id;

        -- If this is the first time solving this question, update leaderboard aggregates
        IF was_already_solved IS NOT TRUE THEN
            UPDATE public.leaderboard_scores
            SET total_solved = total_solved + 1,
                easy_solved = easy_solved + (CASE WHEN q_diff = 'easy' THEN 1 ELSE 0 END),
                medium_solved = medium_solved + (CASE WHEN q_diff = 'medium' THEN 1 ELSE 0 END),
                hard_solved = hard_solved + (CASE WHEN q_diff = 'hard' THEN 1 ELSE 0 END),
                total_points = total_points + COALESCE(q_points, 10),
                current_streak = new_streak,
                updated_at = timezone('utc'::text, now())
            WHERE user_id = NEW.user_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_submission_insert ON public.submissions;
CREATE TRIGGER on_submission_insert
    AFTER INSERT ON public.submissions
    FOR EACH ROW EXECUTE FUNCTION public.handle_submission_rollup();
