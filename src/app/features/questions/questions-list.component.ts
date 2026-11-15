import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../core/services/data.service';
import { AuthService } from '../../core/services/auth.service';
import { Question, Topic, UserQuestionProgress } from '../../core/models/database.types';
import { DifficultyBadgeComponent } from '../../shared/components/badges/difficulty-badge.component';

@Component({
  selector: 'app-questions-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DifficultyBadgeComponent],
  template: `
    <div class="catalog-page">
      <div class="catalog-header">
        <div>
          <h1>SQL Practice Catalog</h1>
          <p>Solve daily curated queries or browse previous challenges by topic and difficulty.</p>
        </div>
      </div>

      <div class="filters-card card">
        <div class="search-row">
          <div class="search-input-wrapper">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              class="form-control search-input"
              placeholder="Search SQL questions by title, keywords or schema..."
              [ngModel]="searchQuery()"
              (ngModelChange)="searchQuery.set($event)"
            />
          </div>

          <div class="select-filters">
            <select
              class="form-select select-pill"
              [ngModel]="selectedDifficulty()"
              (ngModelChange)="selectedDifficulty.set($event)">
              <option value="all">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>

            <select
              class="form-select select-pill"
              [ngModel]="selectedStatus()"
              (ngModelChange)="selectedStatus.set($event)">
              <option value="all">All Statuses</option>
              <option value="solved">Solved</option>
              <option value="attempted">Attempted</option>
              <option value="unattempted">Unattempted</option>
            </select>
          </div>
        </div>

        <div class="topics-row">
          <button
            type="button"
            class="topic-chip"
            [class.active]="selectedTopic() === 'all'"
            (click)="selectedTopic.set('all')">
            All Topics
          </button>
          @for (topic of topics(); track topic.id) {
            <button
              type="button"
              class="topic-chip"
              [class.active]="selectedTopic() === topic.slug"
              (click)="selectedTopic.set(topic.slug)">
              {{ topic.title }}
            </button>
          }
        </div>
      </div>

      <div class="card table-card">
        <div class="table-responsive">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width: 50px; text-align: center;">Status</th>
                <th>Question Title</th>
                <th>Topic</th>
                <th>Difficulty</th>
                <th>Reward</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              @if (filteredQuestions().length === 0) {
                <tr>
                  <td colspan="6" class="empty-table-cell">
                    <p>No questions matched your filter criteria.</p>
                  </td>
                </tr>
              } @else {
                @for (q of filteredQuestions(); track q.id) {
                  <tr>
                    <td style="text-align: center;">
                      @if (getQuestionStatus(q.id) === 'solved') {
                        <span class="status-icon solved" title="Solved">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </span>
                      } @else if (getQuestionStatus(q.id) === 'attempted') {
                        <span class="status-icon attempted" title="Attempted">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <circle cx="12" cy="12" r="6"/>
                          </svg>
                        </span>
                      } @else {
                        <span class="status-icon unattempted" title="Unattempted">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="8"/>
                          </svg>
                        </span>
                      }
                    </td>
                    <td>
                      <a [routerLink]="['/questions', q.slug]" class="question-link">
                        {{ q.title }}
                      </a>
                    </td>
                    <td>
                      <span class="topic-tag">{{ q.topic?.title || 'Relational SQL' }}</span>
                    </td>
                    <td>
                      <app-difficulty-badge [difficulty]="q.difficulty"></app-difficulty-badge>
                    </td>
                    <td>
                      <span class="points-tag">+{{ q.points }} XP</span>
                    </td>
                    <td style="text-align: right;">
                      <a [routerLink]="['/questions', q.slug]" class="btn btn-primary btn-sm">
                        {{ getQuestionStatus(q.id) === 'solved' ? 'Review' : 'Solve' }}
                      </a>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .catalog-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .catalog-header {
      h1 {
        font-size: 1.6rem;
        margin-bottom: 0.25rem;
      }
      p {
        font-size: 0.9rem;
      }
    }

    .filters-card {
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .search-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;

      @media (max-width: 600px) {
        gap: 0.65rem;
      }
    }

    .search-input-wrapper {
      flex: 1;
      min-width: 280px;
      position: relative;
      display: flex;
      align-items: center;

      @media (max-width: 600px) {
        min-width: 100%;
      }

      svg {
        position: absolute;
        left: 0.85rem;
        color: var(--text-muted);
      }

      .search-input {
        padding-left: 2.5rem;
      }
    }

    .select-filters {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;

      @media (max-width: 600px) {
        width: 100%;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
      }
    }

    .select-pill {
      width: auto;
      min-width: 150px;

      @media (max-width: 600px) {
        min-width: 0;
        width: 100%;
        font-size: 0.825rem;
        padding: 0.5rem 0.65rem;
      }
    }

    .topics-row {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .topic-chip {
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-full);
      cursor: pointer;
      transition: all 120ms ease;

      &:hover {
        background-color: var(--bg-tertiary);
        color: var(--text-primary);
      }

      &.active {
        background-color: var(--accent-primary-subtle);
        border-color: var(--accent-sky);
        color: var(--accent-sky);
      }
    }

    .table-card {
      overflow: hidden;
    }

    .question-link {
      font-weight: 600;
      color: var(--text-primary);
      font-size: 0.925rem;

      &:hover {
        color: var(--accent-sky);
      }
    }

    .topic-tag {
      font-size: 0.8rem;
      color: var(--text-secondary);
    }

    .points-tag {
      font-weight: 700;
      font-size: 0.8rem;
      color: var(--accent-warning);
    }

    .status-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;

      &.solved {
        color: var(--accent-success);
      }

      &.attempted {
        color: var(--accent-warning);
      }

      &.unattempted {
        color: var(--text-muted);
        opacity: 0.5;
      }
    }

    .empty-table-cell {
      text-align: center;
      padding: 3rem 1.5rem !important;
      color: var(--text-muted);
    }
  `]
})
export class QuestionsListComponent implements OnInit {
  private dataService = inject(DataService);
  private auth = inject(AuthService);

  questions = signal<Question[]>([]);
  topics = signal<Topic[]>([]);
  userProgress = signal<UserQuestionProgress[]>([]);

  searchQuery = signal<string>('');
  selectedDifficulty = signal<string>('all');
  selectedStatus = signal<string>('all');
  selectedTopic = signal<string>('all');

  filteredQuestions = computed(() => {
    let list = this.questions();

    const topic = this.selectedTopic();
    if (topic !== 'all') {
      list = list.filter(q => q.topic?.slug === topic || q.topic_id === topic);
    }

    const diff = this.selectedDifficulty();
    if (diff !== 'all') {
      list = list.filter(q => q.difficulty === diff);
    }

    const stat = this.selectedStatus();
    if (stat !== 'all') {
      const progressMap = new Map(this.userProgress().map(p => [p.question_id, p.status]));
      list = list.filter(q => {
        const status = progressMap.get(q.id) || 'unattempted';
        return status === stat;
      });
    }

    const q = this.searchQuery().trim().toLowerCase();
    if (q.length > 0) {
      list = list.filter(item =>
        item.title.toLowerCase().includes(q) ||
        item.slug.toLowerCase().includes(q) ||
        (item.description_markdown && item.description_markdown.toLowerCase().includes(q))
      );
    }

    return list;
  });

  async ngOnInit(): Promise<void> {
    const [qList, tList] = await Promise.all([
      this.dataService.getQuestions(),
      this.dataService.getTopics()
    ]);

    this.questions.set(qList);
    this.topics.set(tList);

    const userId = this.auth.currentUser()?.id || 'demo-user-1';
    const progress = await this.dataService.getUserProgress(userId);
    this.userProgress.set(progress);
  }

  getQuestionStatus(questionId: string): string {
    const prog = this.userProgress().find(p => p.question_id === questionId);
    return prog ? prog.status : 'unattempted';
  }
}
