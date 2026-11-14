import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { AuthService } from '../../core/services/auth.service';
import { LeaderboardScore } from '../../core/models/database.types';
import { StreakBadgeComponent } from '../../shared/components/badges/streak-badge.component';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, RouterModule, StreakBadgeComponent],
  template: `
    <div class="leaderboard-page">
      <div class="page-header">
        <div>
          <h1>Global Leaderboard</h1>
          <p>Compete with SQL practitioners worldwide. Rankings update with every accepted solution.</p>
        </div>
      </div>

      @if (topThree().length >= 3) {
        <div class="podium-grid">
          <div class="podium-card rank-2 card">
            <div class="podium-badge silver">2</div>
            <div class="avatar-circle silver">{{ getInitials(topThree()[1].profile?.full_name || topThree()[1].profile?.username) }}</div>
            <h3 class="solver-name">{{ topThree()[1].profile?.full_name || topThree()[1].profile?.username }}</h3>
            <span class="solver-handle">&#64;{{ topThree()[1].profile?.username }}</span>
            <div class="podium-stats">
              <span class="points-val">{{ topThree()[1].total_points }} XP</span>
              <app-streak-badge [streak]="topThree()[1].current_streak"></app-streak-badge>
            </div>
            <div class="solve-summary">{{ topThree()[1].total_solved }} challenges solved</div>
          </div>

          <div class="podium-card rank-1 card">
            <div class="podium-crown">👑</div>
            <div class="podium-badge gold">1</div>
            <div class="avatar-circle gold">{{ getInitials(topThree()[0].profile?.full_name || topThree()[0].profile?.username) }}</div>
            <h3 class="solver-name">{{ topThree()[0].profile?.full_name || topThree()[0].profile?.username }}</h3>
            <span class="solver-handle">&#64;{{ topThree()[0].profile?.username }}</span>
            <div class="podium-stats">
              <span class="points-val gold-text">{{ topThree()[0].total_points }} XP</span>
              <app-streak-badge [streak]="topThree()[0].current_streak"></app-streak-badge>
            </div>
            <div class="solve-summary">{{ topThree()[0].total_solved }} challenges solved</div>
          </div>

          <div class="podium-card rank-3 card">
            <div class="podium-badge bronze">3</div>
            <div class="avatar-circle bronze">{{ getInitials(topThree()[2].profile?.full_name || topThree()[2].profile?.username) }}</div>
            <h3 class="solver-name">{{ topThree()[2].profile?.full_name || topThree()[2].profile?.username }}</h3>
            <span class="solver-handle">&#64;{{ topThree()[2].profile?.username }}</span>
            <div class="podium-stats">
              <span class="points-val">{{ topThree()[2].total_points }} XP</span>
              <app-streak-badge [streak]="topThree()[2].current_streak"></app-streak-badge>
            </div>
            <div class="solve-summary">{{ topThree()[2].total_solved }} challenges solved</div>
          </div>
        </div>
      }

      <div class="card table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 70px; text-align: center;">Rank</th>
                <th>Solver</th>
                <th>Daily Streak</th>
                <th>Solved Breakdown</th>
                <th style="text-align: right;">Total XP</th>
              </tr>
            </thead>
            <tbody>
              @for (entry of leaderboard(); track entry.id; let idx = $index) {
                <tr [class.highlight-me]="entry.user_id === auth.currentUser()?.id">
                  <td style="text-align: center; font-weight: 700;">
                    <span class="rank-number" [class.top-rank]="idx < 3">#{{ idx + 1 }}</span>
                  </td>
                  <td>
                    <div class="solver-col">
                      <div class="avatar-mini">{{ getInitials(entry.profile?.full_name || entry.profile?.username) }}</div>
                      <div class="solver-info">
                        <span class="user-name">{{ entry.profile?.full_name || entry.profile?.username }}</span>
                        <span class="user-bio">{{ entry.profile?.bio || 'SQL enthusiast' }}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <app-streak-badge [streak]="entry.current_streak"></app-streak-badge>
                  </td>
                  <td>
                    <div class="solved-pills">
                      <span class="pill-easy" title="Easy Solved">{{ entry.easy_solved }}E</span>
                      <span class="pill-medium" title="Medium Solved">{{ entry.medium_solved }}M</span>
                      <span class="pill-hard" title="Hard Solved">{{ entry.hard_solved }}H</span>
                    </div>
                  </td>
                  <td style="text-align: right; font-weight: 800; font-family: var(--font-sans); color: var(--accent-sky);">
                    {{ entry.total_points }} XP
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
    .leaderboard-page {
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

    .podium-grid {
      display: grid;
      grid-template-columns: 1fr 1.15fr 1fr;
      align-items: flex-end;
      gap: 1.25rem;
      max-width: 900px;
      margin: 0 auto;
      width: 100%;

      @media (max-width: 768px) {
        grid-template-columns: 1fr;
      }
    }

    .podium-card {
      position: relative;
      padding: 1.75rem 1.25rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      transition: transform 150ms ease;

      &:hover {
        transform: translateY(-4px);
      }

      &.rank-1 {
        padding-top: 2.25rem;
        border-color: rgba(245, 158, 11, 0.4);
        background: linear-gradient(180deg, rgba(245, 158, 11, 0.08), var(--bg-primary));
        box-shadow: 0 0 25px rgba(245, 158, 11, 0.15);
      }

      &.rank-2 {
        border-color: rgba(148, 163, 184, 0.4);
      }

      &.rank-3 {
        border-color: rgba(217, 119, 6, 0.3);
      }
    }

    .podium-crown {
      position: absolute;
      top: -16px;
      font-size: 1.6rem;
    }

    .podium-badge {
      position: absolute;
      top: 10px;
      right: 12px;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.75rem;

      &.gold { background-color: #f59e0b; color: #000; }
      &.silver { background-color: #94a3b8; color: #000; }
      &.bronze { background-color: #d97706; color: #fff; }
    }

    .avatar-circle {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      font-weight: 700;
      margin-bottom: 0.75rem;

      &.gold { background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; }
      &.silver { background: linear-gradient(135deg, #cbd5e1, #64748b); color: #fff; }
      &.bronze { background: linear-gradient(135deg, #b45309, #78350f); color: #fff; }
    }

    .solver-name {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 0.15rem;
    }

    .solver-handle {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-bottom: 0.75rem;
    }

    .podium-stats {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    }

    .points-val {
      font-weight: 800;
      font-size: 1rem;
      color: var(--text-primary);

      &.gold-text {
        color: #f59e0b;
      }
    }

    .solve-summary {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .solver-col {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .avatar-mini {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--bg-tertiary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--accent-sky);
    }

    .solver-info {
      display: flex;
      flex-direction: column;
    }

    .user-name {
      font-weight: 600;
      color: var(--text-primary);
    }

    .user-bio {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .solved-pills {
      display: flex;
      gap: 0.4rem;

      span {
        font-size: 0.7rem;
        font-weight: 700;
        padding: 0.15rem 0.4rem;
        border-radius: 4px;
      }

      .pill-easy { background-color: var(--accent-success-subtle); color: var(--accent-success); }
      .pill-medium { background-color: var(--accent-warning-subtle); color: var(--accent-warning); }
      .pill-hard { background-color: var(--accent-danger-subtle); color: var(--accent-danger); }
    }

    .rank-number.top-rank {
      color: var(--accent-warning);
    }

    tr.highlight-me {
      background-color: var(--accent-primary-subtle);
    }
  `]
})
export class LeaderboardComponent implements OnInit {
  auth = inject(AuthService);
  private dataService = inject(DataService);

  leaderboard = signal<LeaderboardScore[]>([]);
  topThree = signal<LeaderboardScore[]>([]);

  async ngOnInit(): Promise<void> {
    const list = await this.dataService.getLeaderboard();
    this.leaderboard.set(list);
    this.topThree.set(list.slice(0, 3));
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
}
