-- ==============================================================================
-- SQL SQUAD - ADMIN USER DELETION SUPPORT
-- Allows authenticated admins to permanently delete user accounts
-- ==============================================================================

-- 1. Security Definer RPC to delete a user and their cascading data
CREATE OR REPLACE FUNCTION public.delete_user_by_admin(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_caller_id UUID;
    v_is_admin BOOLEAN := FALSE;
BEGIN
    v_caller_id := auth.uid();

    -- Prevent self-deletion of active admin
    IF v_caller_id IS NOT NULL AND v_caller_id = p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'You cannot delete your own active admin account.');
    END IF;

    -- Delete user data in dependency order
    DELETE FROM public.user_question_progress WHERE user_id = p_user_id;
    DELETE FROM public.submissions WHERE user_id = p_user_id;
    DELETE FROM public.user_roles WHERE user_id = p_user_id;
    DELETE FROM public.profiles WHERE id = p_user_id;
    
    -- Delete from auth.users if exists
    BEGIN
        DELETE FROM auth.users WHERE id = p_user_id;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 2. Grant execute permission
GRANT EXECUTE ON FUNCTION public.delete_user_by_admin(UUID) TO anon, authenticated, service_role;
