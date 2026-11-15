import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SupabaseService } from './core/services/supabase.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'sql-squad';
  private router = inject(Router);
  private supabase = inject(SupabaseService);

  ngOnInit(): void {
    // 1. Check if URL hash contains recovery token
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash;
      if (hash.includes('type=recovery') || hash.includes('access_token')) {
        if (!window.location.pathname.includes('/auth/reset-password')) {
          this.router.navigateByUrl(`/auth/reset-password${hash}`);
        }
      }
    }

    // 2. Listen for Supabase password recovery auth event
    if (!this.supabase.isDemoMode && this.supabase.clientInstance) {
      this.supabase.clientInstance.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          this.router.navigate(['/auth/reset-password']);
        }
      });
    }
  }
}
