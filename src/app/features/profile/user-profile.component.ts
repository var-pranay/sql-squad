import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DataService } from '../../core/services/data.service';
import { UserProfile, Submission, Question } from '../../core/models/database.types';
import { StreakBadgeComponent } from '../../shared/components/badges/streak-badge.component';
import { DifficultyBadgeComponent } from '../../shared/components/badges/difficulty-badge.component';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, StreakBadgeComponent, DifficultyBadgeComponent],
  template: `
    <div class="profile-page">
      <div class="card profile-hero">
        <div class="profile-hero-left">
          <div class="large-avatar">
            {{ getInitials(profile()?.full_name || profile()?.username) }}
          </div>
          <div class="profile-meta">
            <h1>{{ profile()?.full_name || profile()?.username }}</h1>
            <span class="user-handle">&#64;{{ profile()?.username }}</span>
            <p class="user-bio">{{ profile()?.bio || 'SQL learner and query craftsman.' }}</p>
            <div class="meta-tags">
              <span class="meta-tag">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Member since {{ formatMemberDate(profile()?.created_at) }}
              </span>
              <span class="meta-tag">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
                Verified Solver
              </span>
            </div>
          </div>
        </div>

        <div class="profile-hero-right">
          <div class="streak-box">
            <span class="streak-box-label">Current Streak</span>
            <span class="streak-box-num">{{ profile()?.current_streak || 0 }} Days</span>
            <span class="streak-box-sub">Max: {{ profile()?.max_streak || 0 }} Days</span>
          </div>
          <a routerLink="/settings" class="btn btn-outline btn-sm">Edit Profile</a>
        </div>
      </div>

      <div class="profile-split">
        <div class="card">
          <div class="card-header">
            <h3>Solved Challenges</h3>
            <span class="badge">{{ solvedQuestions().length }} Solved</span>
          </div>
          <div class="card-body solved-list">
            @if (solvedQuestions().length === 0) {
              <div class="empty-state">
                <p>No challenges solved yet. Dive into today's daily question!</p>
                <a routerLink="/questions" class="btn btn-primary btn-sm">Browse Catalog</a>
              </div>
            } @else {
              @for (q of solvedQuestions(); track q.id) {
                <div class="solved-item">
                  <div class="solved-item-left">
                    <span class="check-icon">✓</span>
                    <a [routerLink]="['/questions', q.slug]" class="solved-title">{{ q.title }}</a>
                  </div>
                  <div class="solved-item-right">
                    <app-difficulty-badge [difficulty]="q.difficulty"></app-difficulty-badge>
                    <span class="solved-xp">+{{ q.points }} XP</span>
                  </div>
                </div>
              }
            }
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>Submission Timeline</h3>
            <span class="badge">{{ submissions().length }} Attempts</span>
          </div>
          <div class="card-body submission-list">
            @if (submissions().length === 0) {
              <div class="empty-state">
                <p>No queries logged yet.</p>
              </div>
            } @else {
              @for (sub of submissions(); track sub.id) {
                <div class="timeline-row">
                  <div class="timeline-dot" [class.success]="sub.status === 'accepted'" [class.error]="sub.status !== 'accepted'"></div>
                  <div class="timeline-details">
                    <span class="timeline-status">{{ sub.status === 'accepted' ? 'Accepted' : 'Failed' }}</span>
                    <span class="timeline-meta">{{ sub.execution_time_ms }}ms · {{ formatTime(sub.submitted_at) }}</span>
                  </div>
                </div>
              }
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-page {
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
    }

    .profile-hero {
      padding: 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .profile-hero-left {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      flex-wrap: wrap;
    }

    .large-avatar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent-primary), var(--accent-sky));
      color: #ffffff;
      font-size: 1.75rem;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.35);
    }

    .profile-meta {
      h1 {
        font-size: 1.5rem;
        margin-bottom: 0.15rem;
      }

      .user-handle {
        font-size: 0.85rem;
        color: var(--text-muted);
        display: block;
        margin-bottom: 0.4rem;
      }

      .user-bio {
        font-size: 0.9rem;
        color: var(--text-secondary);
        margin-bottom: 0.6rem;
      }
    }

    .meta-tags {
      display: flex;
      gap: 0.85rem;
      flex-wrap: wrap;
    }

    .meta-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.775rem;
      color: var(--text-muted);
    }

    .profile-hero-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.85rem;
    }

    .streak-box {
      background-color: var(--bg-secondary);
      border: 1px solid rgba(249, 115, 22, 0.3);
      padding: 0.75rem 1.25rem;
      border-radius: var(--radius-sm);
      text-align: right;
    }

    .streak-box-label {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--accent-streak);
      display: block;
    }

    .streak-box-num {
      font-size: 1.4rem;
      font-weight: 800;
      color: var(--text-primary);
      display: block;
    }

    .streak-box-sub {
      font-size: 0.725rem;
      color: var(--text-muted);
    }

    .profile-split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;

      @media (max-width: 900px) {
        grid-template-columns: 1fr;
      }
    }

    .solved-list, .submission-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-height: 400px;
      overflow-y: auto;
    }

    .solved-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.65rem 0.85rem;
      background-color: var(--bg-secondary);
      border-radius: var(--radius-sm);
    }

    .solved-item-left {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .check-icon {
      color: var(--accent-success);
      font-weight: 800;
    }

    .solved-title {
      font-weight: 600;
      color: var(--text-primary);
      font-size: 0.85rem;

      &:hover {
        color: var(--accent-sky);
      }
    }

    .solved-item-right {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .solved-xp {
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--accent-warning);
    }

    .timeline-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--border-subtle);

      &:last-child {
        border-bottom: none;
      }
    }

    .timeline-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;

      &.success { background-color: var(--accent-success); }
      &.error { background-color: var(--accent-danger); }
    }

    .timeline-details {
      display: flex;
      flex-direction: column;
    }

    .timeline-status {
      font-size: 0.825rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .timeline-meta {
      font-size: 0.725rem;
      color: var(--text-muted);
    }

    .empty-state {
      text-align: center;
      padding: 2rem;
      color: var(--text-muted);

      p {
        margin-bottom: 0.75rem;
      }
    }
  `]
})
export class UserProfileComponent implements OnInit {
  auth = inject(AuthService);
  private dataService = inject(DataService);

  profile = signal<UserProfile | null>(null);
  solvedQuestions = signal<Question[]>([]);
  submissions = signal<Submission[]>([]);

  async ngOnInit(): Promise<void> {
    const user = this.auth.currentUser();
    if (user?.profile) {
      this.profile.set(user.profile);
    }

    const userId = user?.id || 'demo-user-1';
    const [progressList, allQuestions, subs] = await Promise.all([
      this.dataService.getUserProgress(userId),
      this.dataService.getQuestions(),
      this.dataService.getUserSubmissions(userId)
    ]);

    const solvedIds = new Set(progressList.filter(p => p.status === 'solved').map(p => p.question_id));
    this.solvedQuestions.set(allQuestions.filter(q => solvedIds.has(q.id)));
    this.submissions.set(subs);
  }

  getInitials(name?: string): string {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(p => p[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  formatMemberDate(isoStr?: string): string {
    if (!isoStr) return '2026';
    try {
      return new Date(isoStr).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    } catch {
      return '2026';
    }
  }

  formatTime(isoStr: string): string {
    try {
      return new Date(isoStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Just now';
    }
  }
}
