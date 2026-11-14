import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="auth-page">
      <div class="auth-card card">
        <div class="auth-header">
          <h2>Reset Password</h2>
          <p>Enter your email to receive a password recovery link.</p>
        </div>

        @if (isSent()) {
          <div class="success-alert">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <div>
              <strong>Recovery link dispatched!</strong>
              <p>Check your email inbox for instructions to reset your password.</p>
            </div>
          </div>
        } @else {
          <form [formGroup]="forgotForm" (ngSubmit)="onSubmit()" class="auth-form">
            <div class="form-group">
              <label class="form-label" for="email">Email Address</label>
              <input
                id="email"
                type="email"
                class="form-control"
                placeholder="you@domain.com"
                formControlName="email"
              />
            </div>

            <button type="submit" class="btn btn-primary submit-btn" [disabled]="forgotForm.invalid || isLoading()">
              {{ isLoading() ? 'Sending...' : 'Send Reset Link' }}
            </button>
          </form>
        }

        <div class="auth-footer">
          <a routerLink="/auth/login" class="back-link">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Back to Sign In
          </a>
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

      h2 {
        font-size: 1.4rem;
        margin-bottom: 0.35rem;
      }

      p {
        font-size: 0.85rem;
        color: var(--text-secondary);
      }
    }

    .success-alert {
      display: flex;
      gap: 0.75rem;
      padding: 1rem;
      background-color: var(--accent-success-subtle);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: var(--radius-sm);
      color: var(--accent-success);
      font-size: 0.85rem;
      margin-bottom: 1.5rem;

      strong {
        display: block;
        color: var(--text-primary);
        margin-bottom: 0.25rem;
      }

      p {
        color: var(--text-secondary);
        font-size: 0.8rem;
      }
    }

    .submit-btn {
      width: 100%;
      padding: 0.75rem;
      font-size: 0.95rem;
      margin-top: 0.5rem;
    }

    .auth-footer {
      text-align: center;
      margin-top: 1.75rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--border-subtle);

      .back-link {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.85rem;
        font-weight: 500;
        color: var(--text-secondary);

        &:hover {
          color: var(--accent-sky);
        }
      }
    }
  `]
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  isLoading = signal<boolean>(false);
  isSent = signal<boolean>(false);

  forgotForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]]
  });

  async onSubmit(): Promise<void> {
    if (this.forgotForm.invalid) return;
    this.isLoading.set(true);
    setTimeout(() => {
      this.isLoading.set(false);
      this.isSent.set(true);
    }, 700);
  }
}
