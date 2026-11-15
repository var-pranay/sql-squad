import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="auth-page">
      <div class="auth-card card">
        <div class="auth-header">
          <div class="brand-badge">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h2>Create New Password</h2>
          <p>Please enter and confirm your new secure password.</p>
        </div>

        @if (isSuccess()) {
          <div class="success-alert">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <div>
              <strong>Password Updated Successfully!</strong>
              <p>Your password has been changed. You can now log in with your new credentials.</p>
            </div>
          </div>
          <div style="margin-top: 1.5rem;">
            <a routerLink="/auth/login" class="btn btn-primary submit-btn" style="text-align: center; display: block; text-decoration: none;">
              Sign In to Your Account
            </a>
          </div>
        } @else {
          @if (errorMessage()) {
            <div class="auth-error-alert">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{{ errorMessage() }}</span>
            </div>
          }

          <form [formGroup]="resetForm" (ngSubmit)="onSubmit()" class="auth-form">
            <div class="form-group">
              <label class="form-label" for="newPassword">New Password</label>
              <input
                id="newPassword"
                type="password"
                class="form-control"
                placeholder="At least 6 characters"
                formControlName="password"
              />
              @if (resetForm.get('password')?.touched && resetForm.get('password')?.invalid) {
                <span class="form-error">Password must be at least 6 characters long.</span>
              }
            </div>

            <div class="form-group">
              <label class="form-label" for="confirmPassword">Confirm New Password</label>
              <input
                id="confirmPassword"
                type="password"
                class="form-control"
                placeholder="Re-enter your new password"
                formControlName="confirmPassword"
              />
              @if (resetForm.errors?.['mismatch'] && resetForm.get('confirmPassword')?.touched) {
                <span class="form-error">Passwords do not match.</span>
              }
            </div>

            <button
              type="submit"
              class="btn btn-primary submit-btn"
              [disabled]="resetForm.invalid || isLoading()">
              {{ isLoading() ? 'Updating Password...' : 'Update Password' }}
            </button>
          </form>

          <div class="auth-footer">
            <p>
              Remember your password?
              <a routerLink="/auth/login">Back to Sign In</a>
            </p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      background: radial-gradient(circle at 50% 0%, rgba(2, 132, 199, 0.12) 0%, transparent 75%);
    }

    .auth-card {
      width: 100%;
      max-width: 440px;
      padding: 2.25rem 2rem;
      border-radius: var(--radius-lg);
      background-color: var(--bg-primary);
      border: 1px solid var(--border-medium);
      box-shadow: var(--shadow-lg);
    }

    .auth-header {
      text-align: center;
      margin-bottom: 1.75rem;

      .brand-badge {
        width: 48px;
        height: 48px;
        margin: 0 auto 1rem;
        background: linear-gradient(135deg, var(--accent-primary), var(--accent-sky));
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
      }

      h2 {
        font-size: 1.45rem;
        font-weight: 700;
        margin-bottom: 0.35rem;
        color: var(--text-primary);
      }

      p {
        font-size: 0.875rem;
        color: var(--text-secondary);
        margin: 0;
      }
    }

    .auth-error-alert {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      padding: 0.75rem 1rem;
      background-color: var(--accent-danger-subtle);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: var(--radius-sm);
      color: #fca5a5;
      font-size: 0.85rem;
      margin-bottom: 1.25rem;
    }

    .success-alert {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      background-color: var(--accent-success-subtle);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: var(--radius-md);
      color: var(--accent-success);
      margin-bottom: 1rem;

      strong {
        display: block;
        font-size: 0.95rem;
        margin-bottom: 0.25rem;
      }

      p {
        font-size: 0.825rem;
        color: var(--text-secondary);
        margin: 0;
      }
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .form-label {
      font-size: 0.825rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .form-control {
      width: 100%;
      padding: 0.65rem 0.85rem;
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      font-size: 0.9rem;
      outline: none;
      transition: all 150ms ease;

      &:focus {
        border-color: var(--accent-sky);
        box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
      }
    }

    .form-error {
      color: var(--accent-danger);
      font-size: 0.75rem;
      font-weight: 500;
    }

    .submit-btn {
      width: 100%;
      padding: 0.75rem;
      font-size: 0.95rem;
      font-weight: 600;
      margin-top: 0.5rem;
    }

    .auth-footer {
      margin-top: 1.5rem;
      text-align: center;
      padding-top: 1.25rem;
      border-top: 1px solid var(--border-subtle);

      p {
        font-size: 0.85rem;
        color: var(--text-secondary);
        margin: 0;
      }

      a {
        color: var(--accent-sky);
        font-weight: 600;
        text-decoration: none;
        margin-left: 0.25rem;

        &:hover {
          text-decoration: underline;
        }
      }
    }
  `]
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  isLoading = signal<boolean>(false);
  isSuccess = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  resetForm = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, {
    validators: (group) => {
      const p = group.get('password')?.value;
      const c = group.get('confirmPassword')?.value;
      return p === c ? null : { mismatch: true };
    }
  });

  async ngOnInit(): Promise<void> {
    if (typeof window !== 'undefined' && window.location.hash) {
      const hashStr = window.location.hash.startsWith('#')
        ? window.location.hash.substring(1)
        : window.location.hash;
      const params = new URLSearchParams(hashStr);
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (accessToken && refreshToken && this.supabase.clientInstance) {
        try {
          const { error } = await this.supabase.clientInstance.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          if (error) {
            this.errorMessage.set('Recovery session expired or invalid. Please request a new reset link.');
          }
        } catch (e: any) {
          console.warn('Error setting recovery session:', e);
        }
      }
    }
  }

  async onSubmit(): Promise<void> {
    if (this.resetForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const newPassword = this.resetForm.value.password!;
    const res = await this.auth.updatePassword(newPassword);

    this.isLoading.set(false);
    if (res.success) {
      this.isSuccess.set(true);
    } else {
      this.errorMessage.set(res.error || 'Failed to update password. Your reset link may have expired.');
    }
  }
}
