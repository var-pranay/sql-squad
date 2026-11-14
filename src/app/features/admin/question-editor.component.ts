import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { SqlSandboxService } from '../../core/services/sql-sandbox.service';
import { Topic, QuestionDifficulty, QuestionStatus, Question } from '../../core/models/database.types';

@Component({
  selector: 'app-question-editor',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="question-editor-page">
      <div class="page-header">
        <div class="header-left">
          <a routerLink="/admin/questions" class="btn btn-outline btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="19" y1="12" x2="5" y2="12"/>
              <polyline points="12 19 5 12 12 5"/>
            </svg>
            Back
          </a>
          <div>
            <h1>{{ isEditMode() ? 'Edit Question' : 'Create SQL Question' }}</h1>
            <p>Define the challenge description, sandbox database schema, seed data, and test cases.</p>
          </div>
        </div>

        <div class="header-actions">
          <button type="button" class="btn btn-outline" (click)="testDataset()" [disabled]="isTestingSandbox()">
            {{ isTestingSandbox() ? 'Verifying...' : '⚡ Test Dataset in PGlite' }}
          </button>
          <button type="button" class="btn btn-primary" (click)="onSave()" [disabled]="questionForm.invalid || isSaving()">
            {{ isSaving() ? 'Saving...' : 'Save Question' }}
          </button>
        </div>
      </div>

      @if (sandboxValidationMsg()) {
        <div class="validation-banner" [class.success]="sandboxValid()" [class.error]="!sandboxValid()">
          <strong>{{ sandboxValid() ? 'Sandbox Verified' : 'Validation Error' }}:</strong>
          {{ sandboxValidationMsg() }}
        </div>
      }

      <form [formGroup]="questionForm" class="editor-grid">
        <div class="editor-col">
          <div class="card form-card">
            <div class="card-header">
              <h3>Problem Details</h3>
            </div>
            <div class="card-body">
              <div class="form-group">
                <label class="form-label">Question Title</label>
                <input type="text" class="form-control" formControlName="title" placeholder="e.g. Monthly Active User Retention" />
              </div>

              <div class="form-row-3">
                <div class="form-group">
                  <label class="form-label">Topic</label>
                  <select class="form-select" formControlName="topicId">
                    @for (topic of topics(); track topic.id) {
                      <option [value]="topic.id">{{ topic.title }}</option>
                    }
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Difficulty</label>
                  <select class="form-select" formControlName="difficulty">
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Points (XP)</label>
                  <input type="number" class="form-control" formControlName="points" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Problem Description (Markdown)</label>
                <textarea class="form-control form-textarea" rows="8" formControlName="descriptionMarkdown"></textarea>
              </div>

              <div class="form-group">
                <label class="form-label">Query Strategy Hint</label>
                <textarea class="form-control form-textarea" rows="3" formControlName="hintMarkdown"></textarea>
              </div>

              <div class="form-group">
                <label class="form-label">Detailed Solution Explanation</label>
                <textarea class="form-control form-textarea" rows="3" formControlName="explanationMarkdown"></textarea>
              </div>
            </div>
          </div>
        </div>

        <div class="editor-col">
          <div class="card form-card">
            <div class="card-header">
              <h3>Database Sandbox Schema & Seeds</h3>
            </div>
            <div class="card-body">
              <div class="form-group">
                <label class="form-label">Schema DDL (CREATE TABLE statements)</label>
                <textarea class="form-control form-textarea code-font" rows="8" formControlName="schemaDdl"></textarea>
              </div>

              <div class="form-group">
                <label class="form-label">Seed Data (INSERT statements)</label>
                <textarea class="form-control form-textarea code-font" rows="8" formControlName="seedDataSql"></textarea>
              </div>
            </div>
          </div>

          <div class="card form-card">
            <div class="card-header">
              <h3>Reference Solution & Test Case</h3>
            </div>
            <div class="card-body">
              <div class="form-group">
                <label class="form-label">Reference Solution Query</label>
                <textarea class="form-control form-textarea code-font" rows="5" formControlName="referenceQuery"></textarea>
              </div>

              <div class="form-group">
                <label class="form-label">Publication Status</label>
                <select class="form-select" formControlName="status">
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .question-editor-page {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 1rem;
      flex-wrap: wrap;

      .header-left {
        display: flex;
        align-items: center;
        gap: 1rem;

        h1 {
          font-size: 1.5rem;
          margin-bottom: 0.15rem;
        }
        p {
          font-size: 0.85rem;
        }
      }

      .header-actions {
        display: flex;
        gap: 0.75rem;
      }
    }

    .validation-banner {
      padding: 0.75rem 1.25rem;
      border-radius: var(--radius-sm);
      font-size: 0.85rem;

      &.success {
        background-color: var(--accent-success-subtle);
        color: var(--accent-success);
        border: 1px solid rgba(16, 185, 129, 0.4);
      }

      &.error {
        background-color: var(--accent-danger-subtle);
        color: var(--accent-danger);
        border: 1px solid rgba(239, 68, 68, 0.4);
      }
    }

    .editor-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;

      @media (max-width: 1024px) {
        grid-template-columns: 1fr;
      }
    }

    .editor-col {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .form-row-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 0.75rem;

      @media (max-width: 600px) {
        grid-template-columns: 1fr;
      }
    }

    .code-font {
      font-family: var(--font-mono) !important;
      font-size: 0.825rem !important;
    }
  `]
})
export class QuestionEditorComponent implements OnInit {
  private fb = inject(FormBuilder);
  private dataService = inject(DataService);
  private sandbox = inject(SqlSandboxService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isEditMode = signal<boolean>(false);
  questionId = signal<string | null>(null);
  topics = signal<Topic[]>([]);

  isSaving = signal<boolean>(false);
  isTestingSandbox = signal<boolean>(false);
  sandboxValid = signal<boolean>(false);
  sandboxValidationMsg = signal<string | null>(null);

  questionForm = this.fb.group({
    title: ['', Validators.required],
    topicId: ['', Validators.required],
    difficulty: ['medium' as QuestionDifficulty, Validators.required],
    points: [20, [Validators.required, Validators.min(1)]],
    descriptionMarkdown: ['', Validators.required],
    hintMarkdown: [''],
    explanationMarkdown: [''],
    schemaDdl: ['', Validators.required],
    seedDataSql: ['', Validators.required],
    referenceQuery: ['', Validators.required],
    status: ['published' as QuestionStatus, Validators.required]
  });

  async ngOnInit(): Promise<void> {
    const tList = await this.dataService.getTopics();
    this.topics.set(tList);

    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEditMode.set(true);
      this.questionId.set(id);

      const q = await this.dataService.getQuestionById(id);
      if (q) {
        this.questionForm.patchValue({
          title: q.title,
          topicId: q.topic_id || (tList.length > 0 ? tList[0].id : ''),
          difficulty: q.difficulty,
          points: q.points,
          descriptionMarkdown: q.description_markdown,
          hintMarkdown: q.hint_markdown || '',
          explanationMarkdown: q.explanation_markdown || '',
          schemaDdl: q.dataset?.schema_ddl || '',
          seedDataSql: q.dataset?.seed_data_sql || '',
          referenceQuery: q.test_cases && q.test_cases.length > 0 ? q.test_cases[0].expected_query : '',
          status: q.status
        });
      }
    } else {
      this.questionForm.patchValue({
        topicId: tList.length > 0 ? tList[0].id : '',
        schemaDdl: `CREATE TABLE users (\n  user_id INT PRIMARY KEY,\n  username VARCHAR(50),\n  signup_date DATE\n);`,
        seedDataSql: `INSERT INTO users VALUES\n(1, 'alice', '2026-01-01'),\n(2, 'bob', '2026-01-05');`,
        referenceQuery: `SELECT user_id, username FROM users ORDER BY user_id ASC;`
      });
    }
  }

  async testDataset(): Promise<void> {
    this.isTestingSandbox.set(true);
    this.sandboxValidationMsg.set(null);

    const { schemaDdl, seedDataSql, referenceQuery } = this.questionForm.value;

    try {
      await this.sandbox.initDataset(schemaDdl || '', seedDataSql || '');
      const res = await this.sandbox.runQuery(referenceQuery || 'SELECT 1;');
      if (res.error) {
        this.sandboxValid.set(false);
        this.sandboxValidationMsg.set(`Reference query error: ${res.error}`);
      } else {
        this.sandboxValid.set(true);
        this.sandboxValidationMsg.set(
          `Success! Schema mounted and reference query returned ${res.rowCount} row(s) in ${res.executionTimeMs}ms.`
        );
      }
    } catch (err: any) {
      this.sandboxValid.set(false);
      this.sandboxValidationMsg.set(err.message || String(err));
    } finally {
      this.isTestingSandbox.set(false);
    }
  }

  async onSave(): Promise<void> {
    if (this.questionForm.invalid) return;

    this.isSaving.set(true);
    const formVal = this.questionForm.value;

    const selectedTopic = this.topics().find(t => t.id === formVal.topicId);

    const qPayload: Partial<Question> = {
      id: this.questionId() || undefined,
      title: formVal.title!,
      topic_id: formVal.topicId!,
      topic: selectedTopic,
      difficulty: formVal.difficulty!,
      points: formVal.points!,
      description_markdown: formVal.descriptionMarkdown!,
      hint_markdown: formVal.hintMarkdown || null,
      explanation_markdown: formVal.explanationMarkdown || null,
      status: formVal.status!,
      dataset: {
        id: `ds_${Date.now()}`,
        question_id: this.questionId() || `q_${Date.now()}`,
        schema_ddl: formVal.schemaDdl!,
        seed_data_sql: formVal.seedDataSql!,
        dialect: 'postgresql'
      },
      test_cases: [
        {
          id: `tc_${Date.now()}`,
          question_id: this.questionId() || `q_${Date.now()}`,
          test_name: 'Evaluation Test Case',
          expected_query: formVal.referenceQuery!,
          is_hidden: false,
          sort_order: 1
        }
      ]
    };

    await this.dataService.saveQuestion(qPayload);
    this.isSaving.set(false);
    this.router.navigate(['/admin/questions']);
  }
}
