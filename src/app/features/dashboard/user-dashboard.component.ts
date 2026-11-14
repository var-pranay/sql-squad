import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { DataService } from '../../core/services/data.service';
import { Question, Submission, UserQuestionProgress } from '../../core/models/database.types';
import { MetricCardComponent } from '../../shared/components/cards/metric-card.component';
import { DifficultyBadgeComponent } from '../../shared/components/badges/difficulty-badge.component';
import { StreakBadgeComponent } from '../../shared/components/badges/streak-badge.component';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MetricCardComponent,
    DifficultyBadgeComponent,
    StreakBadgeComponent
  ],
  template: `
    <div class="dashboard-page">
      @if (dailyQuestion()) {
        <div class="daily-hero-card card">
          <div class="hero-left">
            <div class="hero-tag-row">
              <span class="daily-pill">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                Today's Daily Challenge
              </span>
              <app-difficulty-badge [difficulty]="dailyQuestion()!.difficulty"></app-difficulty-badge>
              <span class="topic-pill">{{ dailyQuestion()!.topic?.title || 'Relational SQL' }}</span>
              <span class="points-pill">+{{ dailyQuestion()!.points }} XP</span>
            </div>
            <h1 class="hero-title">{{ dailyQuestion()!.title }}</h1>
            <p class="hero-desc">
              Maintain your daily streak! Solve today's query challenge to earn points and rise on the global leaderboard.
            </p>
          </div>
          <div class="hero-right">
            <a [routerLink]="['/questions', dailyQuestion()!.slug]" class="btn btn-primary btn-hero">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              Solve Today's SQL
            </a>
          </div>
        </div>
      }

      <div class="metrics-grid">
        <app-metric-card
          title="Current Streak"
          [value]="(auth.currentUser()?.profile?.current_streak || 0) + ' Days'"
          subtext="Consecutive Daily Solves"
          iconColor="orange"
          [highlight]="true">
          <svg icon width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2c-.67 0-1.31.28-1.77.78L4.2 9.47a9 9 0 0 0 12.72 12.72 9 9 0 0 0 .76-13.43l-3.9-6a2.32 2.32 0 0 0-1.78-.76zm0 4.15l2.76 4.25a6 6 0 0 1-.5 7.6 6 6 0 0 1-8.48-8.48l6.22-3.37z"/>
          </svg>
        </app-metric-card>

        <app-metric-card
          title="Solved Questions"
          [value]="solvedCount() + ' / ' + totalCount()"
          [subtext]="completionPercentage() + '% Total Completion'"
          iconColor="emerald"
          [progress]="completionPercentage()">
          <svg icon width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
            <polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </app-metric-card>

        <app-metric-card
          title="Attempted"
          [value]="attemptedCount()"
          subtext="In Progress"
          iconColor="amber">
          <svg icon width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </app-metric-card>

        <app-metric-card
          title="Global Ranking"
          [value]="'#3'"
          subtext="Top 5% Globally">
          <svg icon width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="8" r="7"/>
            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/>
          </svg>
        </app-metric-card>
      </div>

      <div class="content-split">
        <div class="card progress-card">
          <div class="card-header">
            <h3>Difficulty Breakdown</h3>
            <span class="badge">{{ totalCount() }} Questions in Catalog</span>
          </div>
          <div class="card-body">
            <div class="difficulty-tier">
              <div class="tier-info">
                <span class="tier-name easy">Easy</span>
                <span class="tier-stats">{{ easySolved() }} / {{ easyTotal() }} solved</span>
              </div>
              <div class="tier-track">
                <div class="tier-fill easy" [style.width.%]="getPercent(easySolved(), easyTotal())"></div>
              </div>
            </div>

            <div class="difficulty-tier">
              <div class="tier-info">
                <span class="tier-name medium">Medium</span>
                <span class="tier-stats">{{ mediumSolved() }} / {{ mediumTotal() }} solved</span>
              </div>
              <div class="tier-track">
                <div class="tier-fill medium" [style.width.%]="getPercent(mediumSolved(), mediumTotal())"></div>
              </div>
            </div>

            <div class="difficulty-tier">
              <div class="tier-info">
                <span class="tier-name hard">Hard</span>
                <span class="tier-stats">{{ hardSolved() }} / {{ hardTotal() }} solved</span>
              </div>
              <div class="tier-track">
                <div class="tier-fill hard" [style.width.%]="getPercent(hardSolved(), hardTotal())"></div>
              </div>
            </div>
          </div>
          <div class="card-footer">
            <a routerLink="/questions" class="btn btn-outline btn-sm full-width">Explore All Questions</a>
          </div>
        </div>

        <div class="card activity-card">
          <div class="card-header">
            <h3>Recent Activity</h3>
            <a routerLink="/questions" class="link-sm">View Catalog</a>
          </div>
          <div class="card-body recent-list">
            @if (recentSubmissions().length === 0) {
              <div class="empty-recent">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 14 14"/>
                </svg>
                <p>No recent submissions yet. Jump into today's challenge to make your mark!</p>
              </div>
            } @else {
              @for (sub of recentSubmissions(); track sub.id) {
                <div class="activity-item">
                  <div class="activity-status" [class.success]="sub.status === 'accepted'" [class.failed]="sub.status !== 'accepted'">
                    @if (sub.status === 'accepted') {
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    } @else {
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    }
                  </div>
                  <div class="activity-details">
                    <span class="activity-title">{{ getQuestionTitle(sub.question_id) }}</span>
                    <span class="activity-meta">
                      {{ sub.status === 'accepted' ? 'Accepted' : 'Failed' }} · {{ sub.execution_time_ms }}ms · {{ formatTime(sub.submitted_at) }}
                    </span>
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
    .dashboard-page {
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
    }

    .daily-hero-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.75rem 2rem;
      background: linear-gradient(135deg, var(--bg-primary), rgba(2, 132, 199, 0.08));
      border: 1px solid rgba(56, 189, 248, 0.3);
      box-shadow: var(--shadow-glow);
      gap: 1.5rem;
      flex-wrap: wrap;

      .hero-left {
        max-width: 720px;
      }

      .hero-tag-row {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        margin-bottom: 0.75rem;
        flex-wrap: wrap;
      }

      .daily-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        background: linear-gradient(135deg, rgba(2, 132, 199, 0.2), rgba(56, 189, 248, 0.2));
        color: var(--accent-sky);
        font-size: 0.75rem;
        font-weight: 700;
        padding: 0.25rem 0.65rem;
        border-radius: var(--radius-full);
        border: 1px solid rgba(56, 189, 248, 0.4);
      }

      .topic-pill {
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--text-secondary);
        background-color: var(--bg-tertiary);
        padding: 0.25rem 0.55rem;
        border-radius: var(--radius-sm);
      }

      .points-pill {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--accent-warning);
        background-color: var(--accent-warning-subtle);
        padding: 0.25rem 0.55rem;
        border-radius: var(--radius-sm);
      }

      .hero-title {
        font-size: 1.5rem;
        font-weight: 800;
        margin-bottom: 0.5rem;
      }

      .hero-desc {
        font-size: 0.9rem;
        color: var(--text-secondary);
        line-height: 1.5;
      }

      .btn-hero {
        padding: 0.85rem 1.6rem;
        font-size: 1rem;
      }
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
    }

    .content-split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;

      @media (max-width: 900px) {
        grid-template-columns: 1fr;
      }
    }

    .difficulty-tier {
      margin-bottom: 1.25rem;

      &:last-child {
        margin-bottom: 0;
      }

      .tier-info {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.4rem;
        font-size: 0.85rem;
      }

      .tier-name {
        font-weight: 700;

        &.easy { color: var(--accent-success); }
        &.medium { color: var(--accent-warning); }
        &.hard { color: var(--accent-danger); }
      }

      .tier-stats {
        color: var(--text-muted);
        font-size: 0.8rem;
      }

      .tier-track {
        height: 8px;
        background-color: var(--bg-tertiary);
        border-radius: 4px;
        overflow: hidden;
      }

      .tier-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 300ms ease;

        &.easy { background-color: var(--accent-success); }
        &.medium { background-color: var(--accent-warning); }
        &.hard { background-color: var(--accent-danger); }
      }
    }

    .full-width {
      width: 100%;
      text-align: center;
    }

    .link-sm {
      font-size: 0.8rem;
      color: var(--accent-sky);
    }

    .recent-list {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .empty-recent {
      text-align: center;
      padding: 2rem 1rem;
      color: var(--text-muted);

      svg {
        margin-bottom: 0.5rem;
      }

      p {
        font-size: 0.85rem;
      }
    }

    .activity-item {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 0.65rem 0.85rem;
      background-color: var(--bg-secondary);
      border-radius: var(--radius-sm);
      border: 1px solid var(--border-subtle);

      .activity-status {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        &.success {
          background-color: var(--accent-success-subtle);
          color: var(--accent-success);
        }

        &.failed {
          background-color: var(--accent-danger-subtle);
          color: var(--accent-danger);
        }
      }

      .activity-details {
        display: flex;
        flex-direction: column;
      }

      .activity-title {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-primary);
      }

      .activity-meta {
        font-size: 0.75rem;
        color: var(--text-muted);
      }
    }
  `]
})
export class UserDashboardComponent implements OnInit {
  auth = inject(AuthService);
  private dataService = inject(DataService);

  questions = signal<Question[]>([]);
  dailyQuestion = signal<Question | null>(null);
  userProgress = signal<UserQuestionProgress[]>([]);
  recentSubmissions = signal<Submission[]>([]);

  totalCount = computed(() => this.questions().length);
  solvedCount = computed(() => this.userProgress().filter(p => p.status === 'solved').length);
  attemptedCount = computed(() => this.userProgress().filter(p => p.status === 'attempted').length);
  remainingCount = computed(() => this.totalCount() - this.solvedCount());

  completionPercentage = computed(() => {
    if (this.totalCount() === 0) return 0;
    return Math.round((this.solvedCount() / this.totalCount()) * 100);
  });

  easyTotal = computed(() => this.questions().filter(q => q.difficulty === 'easy').length);
  easySolved = computed(() => {
    const solvedIds = new Set(this.userProgress().filter(p => p.status === 'solved').map(p => p.question_id));
    return this.questions().filter(q => q.difficulty === 'easy' && solvedIds.has(q.id)).length;
  });

  mediumTotal = computed(() => this.questions().filter(q => q.difficulty === 'medium').length);
  mediumSolved = computed(() => {
    const solvedIds = new Set(this.userProgress().filter(p => p.status === 'solved').map(p => p.question_id));
    return this.questions().filter(q => q.difficulty === 'medium' && solvedIds.has(q.id)).length;
  });

  hardTotal = computed(() => this.questions().filter(q => q.difficulty === 'hard').length);
  hardSolved = computed(() => {
    const solvedIds = new Set(this.userProgress().filter(p => p.status === 'solved').map(p => p.question_id));
    return this.questions().filter(q => q.difficulty === 'hard' && solvedIds.has(q.id)).length;
  });

  async ngOnInit(): Promise<void> {
    const qList = await this.dataService.getQuestions();
    this.questions.set(qList);

    const daily = await this.dataService.getTodayDailyQuestion();
    this.dailyQuestion.set(daily);

    const userId = this.auth.currentUser()?.id || 'demo-user-1';
    const progress = await this.dataService.getUserProgress(userId);
    this.userProgress.set(progress);

    const subs = await this.dataService.getUserSubmissions(userId);
    this.recentSubmissions.set(subs.slice(0, 5));
  }

  getPercent(solved: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((solved / total) * 100);
  }

  getQuestionTitle(questionId: string): string {
    const q = this.questions().find(item => item.id === questionId);
    return q ? q.title : 'SQL Challenge';
  }

  formatTime(isoStr: string): string {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Just now';
    }
  }
}
