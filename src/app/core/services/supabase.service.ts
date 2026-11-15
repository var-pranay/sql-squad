import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private client: SupabaseClient | null = null;
  public isDemoMode: boolean = false;

  constructor() {
    this.isDemoMode =
      environment.enableLocalDemoMode &&
      (environment.supabase.url.includes('demo-sqlsquad') || !environment.supabase.url);

    if (!this.isDemoMode) {
      try {
        this.client = createClient(environment.supabase.url, environment.supabase.anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true
          }
        });
      } catch (err) {
        console.warn('Failed to initialize live Supabase client. Defaulting to local demo provider.', err);
        this.isDemoMode = true;
      }
    }
  }

  get clientInstance(): SupabaseClient | null {
    return this.client;
  }
}
