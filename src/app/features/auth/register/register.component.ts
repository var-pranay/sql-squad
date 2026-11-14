import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
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
          <h2>Join SQL Squad</h2>
          <p>Create your account and build an unbroken daily SQL streak.</p>
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

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="auth-form">
          <div class="form-group">
            <label class="form-label" for="username">Username</label>
            <input
              id="username"
              type="text"
              class="form-control"
              placeholder="e.g. query_ninja"
              formControlName="username"
            />
            @if (registerForm.get('username')?.touched && registerForm.get('username')?.invalid) {
              <span class="form-error">Username must be at least 3 alphanumeric characters.</span>
            }
          </div>

          <div class="form-group">
            <label class="form-label" for="fullName">Full Name</label>
            <input
              id="fullName"
              type="text"
              class="form-control"
              placeholder="e.g. Sarah Connor"
              formControlName="fullName"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="email">Email Address</label>
            <input
              id="email"
              type="email"
              class="form-control"
              placeholder="you@domain.com"
              formControlName="email"
            />
            @if (registerForm.get('email')?.touched && registerForm.get('email')?.invalid) {
              <span class="form-error">Valid email is required.</span>
            }
          </div>

          <div class="form-group">
            <label class="form-label" for="password">Password</label>
            <input
              id="password"
              type="password"
              class="form-control"
              placeholder="Minimum 8 characters"
              formControlName="password"
            />
            @if (registerForm.get('password')?.touched && registerForm.get('password')?.invalid) {
              <span class="form-error">Password must be at least 8 characters.</span>
            }
          </div>

          <button type="submit" class="btn btn-primary submit-btn" [disabled]="registerForm.invalid || isLoading()">
            {{ isLoading() ? 'Creating Account...' : 'Get Started' }}
          </button>
        </form>

        <div class="auth-footer">
          <span>Already have an account?</span>
          <a routerLink="/auth/login" class="login-link">Sign In</a>
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
      max-width: 460px;
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
      font-size: 0.85rem;
      color: var(--text-secondary);

      .login-link {
        font-weight: 600;
        margin-left: 0.35rem;
      }
    }
  `]
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  registerForm = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    fullName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  async onSubmit(): Promise<void> {
    if (this.registerForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { email, password, username, fullName } = this.registerForm.value;
    const res = await this.auth.register(email!, password!, username!, fullName!);

    this.isLoading.set(false);
    if (res.success) {
      this.router.navigate(['/dashboard']);
    } else {
      this.errorMessage.set(res.error || 'Failed to create account.');
    }
  }
}
