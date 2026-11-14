import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { Question } from '../../core/models/database.types';
import { DifficultyBadgeComponent } from '../../shared/components/badges/difficulty-badge.component';

@Component({
  selector: 'app-admin-questions',
  standalone: true,
  imports: [CommonModule, RouterModule, DifficultyBadgeComponent],
  template: `
    <div class="admin-questions-page">
      <div class="page-header">
        <div>
          <h1>Question Studio & Management</h1>
          <p>Author, schedule, and publish SQL problems with verified schemas and test cases.</p>
        </div>
        <div class="header-actions">
          <a routerLink="/admin/questions/new" class="btn btn-primary">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Question
          </a>
        </div>
      </div>

      <div class="card table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Difficulty</th>
                <th>Topic</th>
                <th>Points</th>
                <th>Status</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (q of questions(); track q.id) {
                <tr>
                  <td>
                    <div class="q-title-col">
                      <strong class="title-text">{{ q.title }}</strong>
                      <small class="slug-text">/{{ q.slug }}</small>
                    </div>
                  </td>
                  <td>
                    <app-difficulty-badge [difficulty]="q.difficulty"></app-difficulty-badge>
                  </td>
                  <td>
                    <span class="topic-tag">{{ q.topic?.title || 'Relational SQL' }}</span>
                  </td>
                  <td>
                    <span class="points-pill">{{ q.points }} XP</span>
                  </td>
                  <td>
                    <span class="status-badge" [ngClass]="'status-' + q.status">
                      {{ q.status }}
                    </span>
                  </td>
                  <td style="text-align: right;">
                    <div class="action-buttons">
                      <a [routerLink]="['/admin/questions', q.id, 'edit']" class="btn btn-outline btn-sm">
                        Edit
                      </a>
                      <button
                        type="button"
                        class="btn btn-outline btn-sm"
                        (click)="togglePublish(q)">
                        {{ q.status === 'published' ? 'Unpublish' : 'Publish' }}
                      </button>
                      <button
                        type="button"
                        class="btn btn-danger btn-sm"
                        (click)="deleteQuestion(q.id)">
                        Delete
                      </button>
                    </div>
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
    .admin-questions-page {
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

    .table-card {
      overflow: hidden;
    }

    .q-title-col {
      display: flex;
      flex-direction: column;

      .title-text {
        font-size: 0.9rem;
        color: var(--text-primary);
      }

      .slug-text {
        font-family: var(--font-mono);
        font-size: 0.725rem;
        color: var(--text-muted);
      }
    }

    .topic-tag {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .points-pill {
      font-weight: 700;
      font-size: 0.8rem;
      color: var(--accent-warning);
    }

    .status-badge {
      display: inline-block;
      font-size: 0.725rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-xs);

      &.status-published {
        background-color: var(--accent-success-subtle);
        color: var(--accent-success);
      }

      &.status-draft {
        background-color: var(--bg-tertiary);
        color: var(--text-muted);
      }

      &.status-archived {
        background-color: var(--accent-danger-subtle);
        color: var(--accent-danger);
      }
    }

    .action-buttons {
      display: inline-flex;
      gap: 0.4rem;
    }
  `]
})
export class AdminQuestionsComponent implements OnInit {
  private dataService = inject(DataService);

  questions = signal<Question[]>([]);

  async ngOnInit(): Promise<void> {
    await this.loadQuestions();
  }

  async loadQuestions(): Promise<void> {
    const list = await this.dataService.getQuestions();
    this.questions.set(list);
  }

  async togglePublish(q: Question): Promise<void> {
    const nextStatus = q.status === 'published' ? 'draft' : 'published';
    await this.dataService.saveQuestion({
      ...q,
      status: nextStatus
    });
    await this.loadQuestions();
  }

  async deleteQuestion(id: string): Promise<void> {
    if (confirm('Are you sure you want to delete this question?')) {
      await this.dataService.deleteQuestion(id);
      await this.loadQuestions();
    }
  }
}
