import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AppRole } from '../../core/models/database.types';

interface ManagedUser {
  id: string;
  username: string;
  email: string;
  role: AppRole;
  current_streak: number;
  total_solved: number;
  created_at: string;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="admin-users-page">
      <div class="page-header">
        <div>
          <h1>User Management</h1>
          <p>Inspect registered practitioners, monitor streak consistency, and manage administrative privileges.</p>
        </div>
      </div>

      <div class="card table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Streak</th>
                <th>Solved</th>
                <th>Joined</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              @for (user of users(); track user.id) {
                <tr>
                  <td>
                    <div class="user-cell">
                      <div class="avatar-sm">{{ getInitials(user.username) }}</div>
                      <strong>{{ user.username }}</strong>
                    </div>
                  </td>
                  <td class="email-text">{{ user.email }}</td>
                  <td>
                    <span class="role-badge" [class.admin-role]="user.role === 'admin'">
                      {{ user.role }}
                    </span>
                  </td>
                  <td>{{ user.current_streak }} days</td>
                  <td>{{ user.total_solved }}</td>
                  <td class="date-text">{{ user.created_at }}</td>
                  <td style="text-align: right;">
                    <button
                      type="button"
                      class="btn btn-outline btn-sm"
                      (click)="toggleRole(user)">
                      {{ user.role === 'admin' ? 'Demote to User' : 'Promote to Admin' }}
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-users-page {
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

    .table-card {
      overflow: hidden;
    }

    .user-cell {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .avatar-sm {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--bg-tertiary);
      color: var(--accent-sky);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .email-text, .date-text {
      color: var(--text-muted);
      font-size: 0.825rem;
    }

    .role-badge {
      display: inline-block;
      font-size: 0.725rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-xs);
      background-color: var(--bg-tertiary);
      color: var(--text-secondary);

      &.admin-role {
        background-color: rgba(139, 92, 246, 0.15);
        color: #a78bfa;
        border: 1px solid rgba(139, 92, 246, 0.3);
      }
    }
  `]
})
export class AdminUsersComponent implements OnInit {
  private auth = inject(AuthService);

  users = signal<ManagedUser[]>([
    {
      id: 'demo-admin-1',
      username: 'admin_boss',
      email: 'admin@sqlsquad.dev',
      role: 'admin',
      current_streak: 12,
      total_solved: 54,
      created_at: 'Jan 2026'
    },
    {
      id: 'demo-user-1',
      username: 'alex_codes',
      email: 'alex@sqlsquad.dev',
      role: 'user',
      current_streak: 4,
      total_solved: 25,
      created_at: 'Feb 2026'
    },
    {
      id: 'user-2',
      username: 'query_ninja',
      email: 'ninja@sqlsquad.dev',
      role: 'user',
      current_streak: 15,
      total_solved: 48,
      created_at: 'Feb 2026'
    },
    {
      id: 'user-3',
      username: 'sql_samurai',
      email: 'samurai@sqlsquad.dev',
      role: 'user',
      current_streak: 9,
      total_solved: 39,
      created_at: 'Mar 2026'
    }
  ]);

  ngOnInit(): void {}

  toggleRole(user: ManagedUser): void {
    const nextRole: AppRole = user.role === 'admin' ? 'user' : 'admin';
    user.role = nextRole;
  }

  getInitials(name: string): string {
    return name.substring(0, 2).toUpperCase();
  }
}
