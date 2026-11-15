import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="auth-page">
      <div class="auth-card card">
        <div class="auth-header">
          <div class="brand-badge">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <ellipse cx="12" cy="5" rx="9" ry="3"/>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
            </svg>
          </div>
          <h2>Welcome back to SQL Squad</h2>
          <p>Sharpen your query skills with daily curated challenges.</p>
        </div>

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

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="auth-form">
          <div class="form-group">
            <label class="form-label" for="identifier">Email or Username</label>
            <input
              id="identifier"
              type="text"
              class="form-control"
              placeholder="name@example.com or username"
              formControlName="identifier"
              autocomplete="username"
            />
            @if (loginForm.get('identifier')?.touched && loginForm.get('identifier')?.invalid) {
              <span class="form-error">Please enter your email or username.</span>
            }
          </div>

          <div class="form-group">
            <div class="label-row">
              <label class="form-label" for="password">Password</label>
              <a routerLink="/auth/forgot-password" class="forgot-link">Forgot password?</a>
            </div>
            <input
              id="password"
              type="password"
              class="form-control"
              placeholder="••••••••"
              formControlName="password"
            />
            @if (loginForm.get('password')?.touched && loginForm.get('password')?.invalid) {
              <span class="form-error">Password is required.</span>
            }
          </div>

          <button type="submit" class="btn btn-primary submit-btn" [disabled]="loginForm.invalid || isLoading()">
            {{ isLoading() ? 'Signing In...' : 'Sign In' }}
          </button>
        </form>

        <div class="auth-footer">
          <span>Don't have an account?</span>
          <a routerLink="/auth/register" class="register-link">Create Account</a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      background-color: var(--bg-app);
    }

    .auth-card {
      width: 100%;
      max-width: 440px;
      padding: 2.25rem;
      border: 1px solid var(--border-subtle);
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
        color: #ffffff;
        border-radius: var(--radius-md);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(2, 132, 199, 0.3);
      }

      h2 {
        font-size: 1.4rem;
        margin-bottom: 0.35rem;
      }

      p {
        font-size: 0.85rem;
        color: var(--text-secondary);
      }
    }

    .auth-error-alert {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background-color: var(--accent-danger-subtle);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: var(--radius-sm);
      color: var(--accent-danger);
      font-size: 0.825rem;
      margin-bottom: 1.25rem;
    }

    .label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .forgot-link {
      font-size: 0.75rem;
      color: var(--accent-sky);
    }

    .submit-btn {
      width: 100%;
      padding: 0.75rem;
      font-size: 0.95rem;
      margin-top: 1rem;
    }

    .auth-footer {
      text-align: center;
      margin-top: 1.75rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--border-subtle);
      font-size: 0.85rem;
      color: var(--text-secondary);

      .register-link {
        font-weight: 600;
        margin-left: 0.35rem;
      }
    }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  loginForm = this.fb.group({
    identifier: ['', [Validators.required]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { identifier, password } = this.loginForm.value;
    const res = await this.auth.login(identifier!.trim(), password!);

    this.isLoading.set(false);
    if (res.success) {
      if (this.auth.isAdmin()) {
        this.router.navigate(['/admin']);
      } else {
        this.router.navigate(['/dashboard']);
      }
    } else {
      this.errorMessage.set(res.error || 'Invalid credentials.');
    }
  }
}
