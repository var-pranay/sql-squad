-- ==============================================================================
-- SQL SQUAD - USERNAME LOGIN SUPPORT
-- Allows logging in with either Email OR Username
-- ==============================================================================

-- 1. Ensure public.profiles table has an email column (optional convenience)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Populate email in public.profiles for existing users from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- 3. Security Definer RPC to resolve username to email securely for login
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    found_email TEXT;
BEGIN
    SELECT u.email INTO found_email
    FROM auth.users u
    JOIN public.profiles p ON p.id = u.id
    WHERE lower(p.username) = lower(trim(p_username))
    LIMIT 1;

    RETURN found_email;
END;
$$;

-- 4. Grant execute permission so login page can resolve username
GRANT EXECUTE ON FUNCTION public.get_email_by_username(TEXT) TO anon, authenticated, service_role;
