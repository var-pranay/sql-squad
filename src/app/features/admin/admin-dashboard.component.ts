import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { Question, Submission } from '../../core/models/database.types';
import { MetricCardComponent } from '../../shared/components/cards/metric-card.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, MetricCardComponent],
  template: `
    <div class="admin-dashboard-page">
      <div class="page-header">
        <div>
          <h1>Administrator Hub</h1>
          <p>Monitor platform engagement, curate SQL challenges, and manage user progression.</p>
        </div>
        <div class="header-actions">
          <a routerLink="/admin/questions/new" class="btn btn-primary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Create Question
          </a>
        </div>
      </div>

      <div class="metrics-grid">
        <app-metric-card
          title="Total Registered Users"
          [value]="metrics().totalUsers"
          subtext="Active practitioners in Supabase"
          iconColor="emerald">
          <svg icon width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
        </app-metric-card>

        <app-metric-card
          title="Total Questions"
          [value]="metrics().totalQuestions"
          [subtext]="metrics().publishedQuestions + ' Published, ' + metrics().draftQuestions + ' Drafts'"
          iconColor="sky">
          <svg icon width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </app-metric-card>

        <app-metric-card
          title="Total Submissions"
          [value]="metrics().totalSubmissions"
          subtext="Processed in sandbox"
          iconColor="amber">
          <svg icon width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
        </app-metric-card>

        <app-metric-card
          title="Pass Rate"
          [value]="metrics().passRate"
          subtext="Accepted solutions"
          iconColor="orange">
          <svg icon width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 14 14"/>
          </svg>
        </app-metric-card>
      </div>

      <div class="content-split">
        <div class="card">
          <div class="card-header">
            <h3>Recent Questions</h3>
            <a routerLink="/admin/questions" class="btn btn-outline btn-sm">Manage All</a>
          </div>
          <div class="card-body question-list">
            @for (q of questions().slice(0, 5); track q.id) {
              <div class="q-item">
                <div class="q-info">
                  <span class="q-title">{{ q.title }}</span>
                  <span class="q-sub">{{ q.difficulty }} · {{ q.points }} XP · {{ q.status }}</span>
                </div>
                <div class="q-actions">
                  <a [routerLink]="['/admin/questions', q.id, 'edit']" class="btn btn-outline btn-sm">Edit</a>
                </div>
              </div>
            }
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <h3>Platform Activity Stream</h3>
            <span class="badge">Live</span>
          </div>
          <div class="card-body stream-list">
            @if (metrics().recentSubmissions.length === 0) {
              <div class="stream-empty">
                <p>No query executions recorded yet. Solve questions in catalog to see live activity!</p>
              </div>
            } @else {
              @for (sub of metrics().recentSubmissions.slice(0, 6); track sub.id) {
                <div class="stream-row">
                  <div class="stream-indicator" [class.success]="sub.status === 'accepted'" [class.fail]="sub.status !== 'accepted'"></div>
                  <div class="stream-content">
                    <span class="stream-title">{{ sub.status === 'accepted' ? 'Accepted Submission' : 'Failed Submission' }}</span>
                    <span class="stream-meta">{{ sub.execution_time_ms }} ms · {{ formatTime(sub.submitted_at) }}</span>
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
    .admin-dashboard-page {
      display: flex;
      flex-direction: column;
      gap: 1.75rem;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;

      h1 {
        font-size: 1.6rem;
        margin-bottom: 0.25rem;
      }
      p {
        font-size: 0.9rem;
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

    .question-list, .stream-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .q-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem;
      background-color: var(--bg-secondary);
      border-radius: var(--radius-sm);
    }

    .q-info {
      display: flex;
      flex-direction: column;
    }

    .q-title {
      font-weight: 600;
      font-size: 0.85rem;
      color: var(--text-primary);
    }

    .q-sub {
      font-size: 0.75rem;
      color: var(--text-muted);
      text-transform: capitalize;
    }

    .stream-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--border-subtle);

      &:last-child {
        border-bottom: none;
      }
    }

    .stream-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;

      &.success { background-color: var(--accent-success); }
      &.fail { background-color: var(--accent-danger); }
    }

    .stream-content {
      display: flex;
      flex-direction: column;
    }

    .stream-title {
      font-size: 0.825rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .stream-meta {
      font-size: 0.725rem;
      color: var(--text-muted);
    }

    .stream-empty {
      text-align: center;
      padding: 1.5rem;
      color: var(--text-muted);
      font-size: 0.85rem;
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  private dataService = inject(DataService);

  questions = signal<Question[]>([]);
  metrics = signal<{
    totalUsers: number;
    totalQuestions: number;
    publishedQuestions: number;
    draftQuestions: number;
    totalSubmissions: number;
    passRate: string;
    recentSubmissions: Submission[];
  }>({
    totalUsers: 1,
    totalQuestions: 0,
    publishedQuestions: 0,
    draftQuestions: 0,
    totalSubmissions: 0,
    passRate: '0%',
    recentSubmissions: []
  });

  publishedCount = computed(() => this.questions().filter(q => q.status === 'published').length);
  draftCount = computed(() => this.questions().filter(q => q.status === 'draft').length);

  async ngOnInit(): Promise<void> {
    const [qList, m] = await Promise.all([
      this.dataService.getQuestions(),
      this.dataService.getAdminMetrics()
    ]);
    this.questions.set(qList);
    this.metrics.set(m);
  }

  formatTime(isoStr: string): string {
    try {
      return new Date(isoStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Just now';
    }
  }
}
