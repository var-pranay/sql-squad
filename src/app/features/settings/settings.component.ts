import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService, AppTheme } from '../../core/services/theme.service';
import { SupabaseService } from '../../core/services/supabase.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="settings-page">
      <div class="page-header">
        <h1>Platform Settings</h1>
        <p>Manage your account profile, visual appearance, and database connection.</p>
      </div>

      <div class="settings-grid">
        <div class="card settings-card">
          <div class="card-header">
            <h3>Profile & Bio</h3>
          </div>
          <div class="card-body">
            @if (profileSaved()) {
              <div class="save-success-alert">
                Profile updated successfully.
              </div>
            }

            <form [formGroup]="profileForm" (ngSubmit)="onSaveProfile()">
              <div class="form-group">
                <label class="form-label">Full Name</label>
                <input type="text" class="form-control" formControlName="fullName" />
              </div>

              <div class="form-group">
                <label class="form-label">Bio</label>
                <textarea class="form-control" rows="3" formControlName="bio"></textarea>
              </div>

              <button type="submit" class="btn btn-primary btn-sm" [disabled]="profileForm.invalid">
                Save Changes
              </button>
            </form>
          </div>
        </div>

        <div class="card settings-card">
          <div class="card-header">
            <h3>Appearance & Themes</h3>
          </div>
          <div class="card-body">
            <p class="theme-intro">Choose your preferred workspace aesthetic. High-contrast developer themes optimized for long querying sessions.</p>

            <div class="theme-options">
              <div
                class="theme-card"
                [class.active]="themeService.currentTheme() === 'dark'"
                (click)="themeService.setTheme('dark')">
                <div class="theme-preview dark-preview">
                  <div class="preview-header"></div>
                  <div class="preview-content"></div>
                </div>
                <div class="theme-label">
                  <strong>Dark Obsidian</strong>
                  <small>Default Developer Aesthetic</small>
                </div>
              </div>

              <div
                class="theme-card"
                [class.active]="themeService.currentTheme() === 'light'"
                (click)="themeService.setTheme('light')">
                <div class="theme-preview light-preview">
                  <div class="preview-header"></div>
                  <div class="preview-content"></div>
                </div>
                <div class="theme-label">
                  <strong>Clean Slate Light</strong>
                  <small>High Contrast Crisp Mode</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="card settings-card full-width-card">
          <div class="card-header">
            <h3>Supabase Connection Status</h3>
            <span class="badge" [class.badge-easy]="!supabase.isDemoMode" [class.badge-medium]="supabase.isDemoMode">
              {{ supabase.isDemoMode ? 'Local PGlite & Demo Storage Active' : 'Connected to Live Supabase' }}
            </span>
          </div>
          <div class="card-body">
            <div class="connection-info">
              <p>
                <strong>Execution Engine:</strong> PGlite (PostgreSQL WASM in-memory sandbox) active with 3.5s timeout protection.
              </p>
              <p>
                <strong>Database Security:</strong> Row Level Security (RLS) policies configured in <code>supabase/02_rls.sql</code>. Anonymous keys are strictly restricted from direct administrative access.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .settings-page {
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
    }

    .page-header {
      h1 {
        font-size: 1.6rem;
        margin-bottom: 0.25rem;
      }
      p {
        font-size: 0.9rem;
      }
    }

    .settings-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;

      @media (max-width: 900px) {
        grid-template-columns: 1fr;
      }
    }

    .full-width-card {
      grid-column: 1 / -1;
    }

    .save-success-alert {
      padding: 0.75rem 1rem;
      background-color: var(--accent-success-subtle);
      color: var(--accent-success);
      font-size: 0.825rem;
      border-radius: var(--radius-sm);
      margin-bottom: 1rem;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .theme-intro {
      font-size: 0.85rem;
      margin-bottom: 1.25rem;
    }

    .theme-options {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .theme-card {
      padding: 0.85rem;
      background-color: var(--bg-secondary);
      border: 2px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all 150ms ease;

      &:hover {
        border-color: var(--border-medium);
      }

      &.active {
        border-color: var(--accent-sky);
        box-shadow: 0 0 10px rgba(56, 189, 248, 0.2);
      }
    }

    .theme-preview {
      height: 60px;
      border-radius: 4px;
      margin-bottom: 0.75rem;
      overflow: hidden;
      display: flex;
      flex-direction: column;

      .preview-header { height: 16px; }
      .preview-content { flex: 1; }

      &.dark-preview {
        background-color: #080c14;
        .preview-header { background-color: #0f172a; }
        .preview-content { background-color: #131c31; }
      }

      &.light-preview {
        background-color: #f8fafc;
        border: 1px solid #cbd5e1;
        .preview-header { background-color: #ffffff; }
        .preview-content { background-color: #f1f5f9; }
      }
    }

    .theme-label {
      strong {
        display: block;
        font-size: 0.85rem;
        color: var(--text-primary);
      }
      small {
        font-size: 0.725rem;
        color: var(--text-muted);
      }
    }

    .connection-info p {
      font-size: 0.85rem;
      line-height: 1.6;
      margin-bottom: 0.5rem;

      code {
        background-color: var(--bg-secondary);
        padding: 0.15rem 0.35rem;
        border-radius: 3px;
        font-family: var(--font-mono);
      }
    }
  `]
})
export class SettingsComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  themeService = inject(ThemeService);
  supabase = inject(SupabaseService);

  profileSaved = signal<boolean>(false);

  profileForm = this.fb.group({
    fullName: ['', Validators.required],
    bio: ['']
  });

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (user?.profile) {
      this.profileForm.patchValue({
        fullName: user.profile.full_name || user.username,
        bio: user.profile.bio || ''
      });
    }
  }

  onSaveProfile(): void {
    if (this.profileForm.invalid) return;

    const { fullName, bio } = this.profileForm.value;
    this.auth.updateProfile({
      full_name: fullName!,
      bio: bio || null
    });

    this.profileSaved.set(true);
    setTimeout(() => this.profileSaved.set(false), 3000);
  }
}
