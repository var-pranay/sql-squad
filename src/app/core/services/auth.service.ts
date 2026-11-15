import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from './supabase.service';
import { UserProfile, AppRole } from '../models/database.types';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  role: AppRole;
  profile?: UserProfile;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  private readonly AUTH_STORAGE_KEY = 'sql_squad_session_v3';
  private readonly KNOWN_USERS_KEY = 'sql_squad_known_users_v1';

  readonly currentUser = signal<AuthUser | null>(null);
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');
  readonly currentRole = computed<AppRole>(() => this.currentUser()?.role || 'user');

  constructor() {
    this.restoreSession();
  }

  private getKnownUsers(): Record<string, string> {
    if (typeof localStorage === 'undefined') return {};
    try {
      const raw = localStorage.getItem(this.KNOWN_USERS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  rememberUserIdentifier(username: string, email: string): void {
    if (!username || !email || typeof localStorage === 'undefined') return;
    try {
      const map = this.getKnownUsers();
      map[username.toLowerCase().trim()] = email.toLowerCase().trim();
      localStorage.setItem(this.KNOWN_USERS_KEY, JSON.stringify(map));
    } catch (e) {
      console.warn('Failed to cache user identifier:', e);
    }
  }

  private restoreSession(): void {
    if (typeof localStorage === 'undefined') return;

    // Purge legacy auto-login sessions so all users must explicitly sign in
    localStorage.removeItem('sql_squad_auth_session');

    const stored = localStorage.getItem(this.AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const user = JSON.parse(stored) as AuthUser;
        this.currentUser.set(user);
        return;
      } catch {
        localStorage.removeItem(this.AUTH_STORAGE_KEY);
      }
    }

    // Require explicit login: default to unauthenticated
    this.currentUser.set(null);
  }

  async loginAsDemo(role: 'user' | 'admin'): Promise<void> {
    const user: AuthUser = {
      id: role === 'admin' ? 'demo-admin-1' : 'demo-user-1',
      email: role === 'admin' ? 'admin@sqlsquad.dev' : 'alex@sqlsquad.dev',
      username: role === 'admin' ? 'admin_boss' : 'alex_codes',
      role,
      profile: {
        id: role === 'admin' ? 'demo-admin-1' : 'demo-user-1',
        username: role === 'admin' ? 'admin_boss' : 'alex_codes',
        full_name: role === 'admin' ? 'Platform Administrator' : 'Alex Rivera',
        avatar_url: null,
        bio: role === 'admin' ? 'Managing SQL challenges' : 'Software Engineer',
        current_streak: role === 'admin' ? 12 : 4,
        max_streak: role === 'admin' ? 25 : 11,
        last_active_date: '2026-11-14',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-11-14T00:00:00Z'
      }
    };
    this.saveSession(user);
    if (role === 'admin') {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  async login(identifier: string, pass: string): Promise<{ success: boolean; error?: string }> {
    const rawIdentifier = identifier.trim();
    let emailToUse = rawIdentifier;

    if (!this.supabase.isDemoMode && this.supabase.clientInstance) {
      // If identifier doesn't have '@', user entered a username
      if (!rawIdentifier.includes('@')) {
        let resolvedEmail: string | null = null;

        // 1. Try Supabase RPC 'get_email_by_username'
        try {
          const { data: rpcEmail, error: rpcError } = await this.supabase.clientInstance
            .rpc('get_email_by_username', { p_username: rawIdentifier });
          if (!rpcError && rpcEmail) {
            resolvedEmail = rpcEmail;
          }
        } catch {
          // RPC might not be created yet
        }

        // 2. Try selecting 'email' column from public.profiles
        if (!resolvedEmail) {
          try {
            const { data: prof, error: profError } = await this.supabase.clientInstance
              .from('profiles')
              .select('email, id')
              .ilike('username', rawIdentifier)
              .maybeSingle();

            if (!profError && prof && (prof as any).email) {
              resolvedEmail = (prof as any).email;
            }
          } catch {
            // column might not exist yet
          }
        }

        // 3. Fallback: check locally remembered username -> email mappings
        if (!resolvedEmail) {
          const knownUsers = this.getKnownUsers();
          const cached = knownUsers[rawIdentifier.toLowerCase()];
          if (cached) {
            resolvedEmail = cached;
          }
        }

        if (resolvedEmail) {
          emailToUse = resolvedEmail;
        } else {
          return {
            success: false,
            error: `Could not find an account for username "${rawIdentifier}". Please check the username or sign in using your registered email address.`
          };
        }
      }

      const { data, error } = await this.supabase.clientInstance.auth.signInWithPassword({
        email: emailToUse,
        password: pass
      });
      if (error) return { success: false, error: error.message };

      const userMetaUsername = data.user.user_metadata?.['username'] || emailToUse.split('@')[0];
      this.rememberUserIdentifier(userMetaUsername, emailToUse);

      const { data: roleData } = await this.supabase.clientInstance
        .from('user_roles')
        .select('role')
        .eq('user_id', data.user.id)
        .maybeSingle();

      // Ensure profile exists in public.profiles table
      let profileUsername = userMetaUsername;
      try {
        const { data: prof } = await this.supabase.clientInstance
          .from('profiles')
          .select('id, username')
          .eq('id', data.user.id)
          .maybeSingle();

        if (prof?.username) {
          profileUsername = prof.username;
          this.rememberUserIdentifier(profileUsername, emailToUse);
        } else {
          await this.supabase.clientInstance.from('profiles').upsert({
            id: data.user.id,
            username: profileUsername,
            full_name: data.user.user_metadata?.['full_name'] || profileUsername,
            current_streak: 0,
            max_streak: 0
          });
        }
      } catch (e) {
        console.info('Profile ensure check:', e);
      }

      const authUser: AuthUser = {
        id: data.user.id,
        email: data.user.email || emailToUse,
        username: profileUsername,
        role: roleData?.role || 'user'
      };

      this.saveSession(authUser);
      return { success: true };
    }

    const isAdminAccount = rawIdentifier.toLowerCase().includes('admin');
    const user: AuthUser = {
      id: isAdminAccount ? 'demo-admin-1' : 'demo-user-1',
      email: rawIdentifier.includes('@') ? rawIdentifier : `${rawIdentifier}@sqlsquad.dev`,
      username: rawIdentifier.includes('@') ? rawIdentifier.split('@')[0] : rawIdentifier,
      role: isAdminAccount ? 'admin' : 'user',
      profile: {
        id: isAdminAccount ? 'demo-admin-1' : 'demo-user-1',
        username: rawIdentifier.includes('@') ? rawIdentifier.split('@')[0] : rawIdentifier,
        full_name: isAdminAccount ? 'Platform Administrator' : 'Alex Rivera',
        avatar_url: null,
        bio: isAdminAccount ? 'Managing SQL challenges' : 'Software Engineer',
        current_streak: 4,
        max_streak: 11,
        last_active_date: '2026-11-14',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-11-14T00:00:00Z'
      }
    };

    this.saveSession(user);
    return { success: true };
  }

  async register(
    email: string,
    pass: string,
    username: string,
    fullName: string
  ): Promise<{ success: boolean; error?: string }> {
    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = username.trim();

    if (!this.supabase.isDemoMode && this.supabase.clientInstance) {
      // 1. Check if username is already taken
      try {
        const { data: existingUser } = await this.supabase.clientInstance
          .from('profiles')
          .select('id, username')
          .ilike('username', cleanUsername)
          .maybeSingle();

        if (existingUser) {
          return {
            success: false,
            error: `Username "${cleanUsername}" is already taken. Please choose another username.`
          };
        }
      } catch (e) {
        console.warn('Username availability check error:', e);
      }

      // 2. Check if email already registered via RPC if available
      try {
        const { data: emailExists } = await this.supabase.clientInstance
          .rpc('check_email_exists', { p_email: cleanEmail });
        if (emailExists === true) {
          return {
            success: false,
            error: 'An account with this email address already exists. Please sign in instead.'
          };
        }
      } catch (e) {
        // RPC might not exist yet
      }

      // 3. Attempt SignUp with Supabase
      const { data, error } = await this.supabase.clientInstance.auth.signUp({
        email: cleanEmail,
        password: pass,
        options: {
          data: {
            username: cleanUsername,
            full_name: fullName.trim()
          }
        }
      });
      if (error) return { success: false, error: error.message };

      // Supabase returns an empty identities array if user with this email already exists
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        return {
          success: false,
          error: 'An account with this email address already exists. Please sign in instead.'
        };
      }

      this.rememberUserIdentifier(cleanUsername, cleanEmail);

      if (data.user) {
        try {
          await this.supabase.clientInstance.from('profiles').upsert({
            id: data.user.id,
            username: cleanUsername || cleanEmail.split('@')[0],
            full_name: fullName.trim() || cleanUsername,
            current_streak: 0,
            max_streak: 0
          });
          await this.supabase.clientInstance.from('user_roles').upsert({
            user_id: data.user.id,
            role: 'user'
          }, { onConflict: 'user_id,role' });
        } catch (pErr) {
          console.info('Client-side profile sync info:', pErr);
        }
      }

      const user: AuthUser = {
        id: data.user?.id || `user_${Date.now()}`,
        email: cleanEmail,
        username: cleanUsername,
        role: 'user'
      };
      this.saveSession(user);
      return { success: true };
    }

    // Demo Mode: Check local users to prevent duplicates
    const known = this.getKnownUsers();
    if (known[cleanUsername.toLowerCase()]) {
      return {
        success: false,
        error: `Username "${cleanUsername}" is already taken. Please choose another username.`
      };
    }
    const duplicateEmail = Object.entries(known).find(([, e]) => e.toLowerCase() === cleanEmail);
    if (duplicateEmail) {
      return {
        success: false,
        error: 'An account with this email address already exists. Please sign in instead.'
      };
    }

    this.rememberUserIdentifier(cleanUsername, cleanEmail);

    const user: AuthUser = {
      id: `user_${Date.now()}`,
      email: cleanEmail,
      username: cleanUsername,
      role: 'user',
      profile: {
        id: `user_${Date.now()}`,
        username: cleanUsername,
        full_name: fullName.trim(),
        avatar_url: null,
        bio: 'New SQL solver',
        current_streak: 1,
        max_streak: 1,
        last_active_date: new Date().toISOString().split('T')[0],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    };

    this.saveSession(user);
    return { success: true };
  }

  async sendPasswordReset(identifier: string): Promise<{ success: boolean; error?: string }> {
    const raw = identifier.trim();
    let emailToUse = raw.toLowerCase();

    if (!this.supabase.isDemoMode && this.supabase.clientInstance) {
      // If a username was entered instead of email, resolve it
      if (!raw.includes('@')) {
        let resolved: string | null = null;
        try {
          const { data: rpcEmail } = await this.supabase.clientInstance
            .rpc('get_email_by_username', { p_username: raw });
          if (rpcEmail) resolved = rpcEmail;
        } catch {}

        if (!resolved) {
          const known = this.getKnownUsers();
          resolved = known[raw.toLowerCase()] || null;
        }

        if (resolved) {
          emailToUse = resolved.toLowerCase();
        } else {
          return {
            success: false,
            error: `No registered account found with username "${raw}". Please enter your registered email address.`
          };
        }
      }

      // Check if this email exists in system before sending
      try {
        const { data: exists } = await this.supabase.clientInstance
          .rpc('check_email_exists', { p_email: emailToUse });
        if (exists === false) {
          return {
            success: false,
            error: `The email address "${emailToUse}" is not registered. Please check the spelling or create an account.`
          };
        }
      } catch (err) {
        // Fallback: check profiles table
        try {
          const { data: prof } = await this.supabase.clientInstance
            .from('profiles')
            .select('email')
            .eq('email', emailToUse)
            .maybeSingle();

          const known = this.getKnownUsers();
          const isKnownLocally = Object.values(known).some(e => e.toLowerCase() === emailToUse);

          if (!prof && !isKnownLocally) {
            console.info('Email presence check check completed.');
          }
        } catch {}
      }

      const baseUrl = typeof window !== 'undefined' && window.location.origin.includes('localhost')
        ? window.location.origin
        : 'https://sql-squad.vercel.app';
      const redirectTo = `${baseUrl}/auth/reset-password`;

      const { error } = await this.supabase.clientInstance.auth.resetPasswordForEmail(emailToUse, {
        redirectTo
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    }

    // Demo Mode
    return { success: true };
  }

  async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (!this.supabase.isDemoMode && this.supabase.clientInstance) {
      const { error } = await this.supabase.clientInstance.auth.updateUser({
        password: newPassword
      });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    }
    return { success: true };
  }

  logout(): void {
    if (!this.supabase.isDemoMode && this.supabase.clientInstance) {
      this.supabase.clientInstance.auth.signOut();
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.AUTH_STORAGE_KEY);
      localStorage.removeItem('sql_squad_auth_session');
    }
    this.currentUser.set(null);
    this.router.navigate(['/auth/login']);
  }

  switchRole(targetRole: AppRole): void {
    const current = this.currentUser();
    if (!current) return;

    const updated: AuthUser = {
      ...current,
      role: targetRole,
      username: targetRole === 'admin' ? 'admin_boss' : 'alex_codes'
    };
    this.saveSession(updated);
  }

  updateProfile(profile: Partial<UserProfile>): void {
    const current = this.currentUser();
    if (!current) return;

    const updated: AuthUser = {
      ...current,
      profile: {
        ...(current.profile as UserProfile),
        ...profile
      }
    };
    this.saveSession(updated);
  }

  private saveSession(user: AuthUser): void {
    this.currentUser.set(user);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.AUTH_STORAGE_KEY, JSON.stringify(user));
    }
  }
}
