import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DataService } from '../../core/services/data.service';
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

      @if (actionMessage()) {
        <div class="status-banner" [class.success]="actionMessage()!.type === 'success'" [class.error]="actionMessage()!.type === 'error'">
          <span>{{ actionMessage()!.text }}</span>
        </div>
      }

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
                <th style="text-align: right;">Actions</th>
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
                    <div class="actions-group">
                      <button
                        type="button"
                        class="btn btn-outline btn-sm"
                        (click)="toggleRole(user)"
                        [title]="user.role === 'admin' ? 'Demote to regular user' : 'Promote to admin'">
                        {{ user.role === 'admin' ? 'Demote' : 'Promote' }}
                      </button>
                      <button
                        type="button"
                        class="btn btn-outline btn-sm delete-btn"
                        (click)="deleteUser(user)"
                        [disabled]="isDeleting() === user.id"
                        title="Delete user and all their records">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                        <span>{{ isDeleting() === user.id ? 'Deleting...' : 'Delete' }}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
                    No registered practitioners found yet.
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
    .actions-group {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      justify-content: flex-end;
    }

    .delete-btn {
      color: var(--accent-danger);
      border-color: rgba(239, 68, 68, 0.3);

      &:hover:not(:disabled) {
        background-color: var(--accent-danger);
        color: #ffffff;
        border-color: var(--accent-danger);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .status-banner {
      padding: 0.75rem 1rem;
      border-radius: var(--radius-sm);
      font-size: 0.85rem;
      font-weight: 500;

      &.success {
        background-color: var(--accent-success-subtle);
        border: 1px solid rgba(16, 185, 129, 0.3);
        color: var(--accent-success);
      }

      &.error {
        background-color: var(--accent-danger-subtle);
        border: 1px solid rgba(239, 68, 68, 0.3);
        color: #fca5a5;
      }
    }
  `]
})
export class AdminUsersComponent implements OnInit {
  private auth = inject(AuthService);
  private dataService = inject(DataService);

  users = signal<ManagedUser[]>([]);
  isDeleting = signal<string | null>(null);
  actionMessage = signal<{ type: 'success' | 'error'; text: string } | null>(null);

  async ngOnInit(): Promise<void> {
    const list = await this.dataService.getAdminUsers();
    if (list.length > 0) {
      this.users.set(list);
    } else {
      // Fallback to active logged in admin
      const current = this.auth.currentUser();
      if (current) {
        this.users.set([
          {
            id: current.id,
            username: current.username,
            email: current.email,
            role: current.role,
            current_streak: current.profile?.current_streak || 0,
            total_solved: 0,
            created_at: 'Active Now'
          }
        ]);
      }
    }
  }

  async toggleRole(user: ManagedUser): Promise<void> {
    const nextRole: AppRole = user.role === 'admin' ? 'user' : 'admin';
    await this.dataService.updateUserRole(user.id, nextRole);
    user.role = nextRole;
  }

  async deleteUser(user: ManagedUser): Promise<void> {
    const current = this.auth.currentUser();
    if (current && (current.id === user.id || current.username === user.username)) {
      alert('You cannot delete your own active admin account.');
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to permanently delete user "${user.username}" (${user.email})?\n\nThis will remove their profile, streak, progress, and all submissions.`
    );
    if (!confirmed) return;

    this.isDeleting.set(user.id);
    const res = await this.dataService.deleteUser(user.id);
    this.isDeleting.set(null);

    if (res.success) {
      this.users.update(list => list.filter(u => u.id !== user.id));
      this.actionMessage.set({ type: 'success', text: `User "${user.username}" was permanently deleted.` });
      setTimeout(() => this.actionMessage.set(null), 4000);
    } else {
      this.actionMessage.set({ type: 'error', text: res.error || 'Failed to delete user.' });
      setTimeout(() => this.actionMessage.set(null), 5000);
    }
  }

  getInitials(name: string): string {
    return name.substring(0, 2).toUpperCase();
  }
}
