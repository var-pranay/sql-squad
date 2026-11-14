import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { AuthService } from '../../core/services/auth.service';
import { SqlSandboxService } from '../../core/services/sql-sandbox.service';
import {
  Question,
  SqlQueryResult,
  SubmissionEvaluationResult,
  Submission
} from '../../core/models/database.types';
import { SqlEditorComponent } from '../../shared/components/sql-editor/sql-editor.component';
import { SqlResultsTableComponent } from '../../shared/components/sql-results-table/sql-results-table.component';
import { DifficultyBadgeComponent } from '../../shared/components/badges/difficulty-badge.component';

type LeftTab = 'description' | 'schema' | 'hints' | 'submissions';
type RightTab = 'results' | 'testcases';

@Component({
  selector: 'app-question-workspace',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    SqlEditorComponent,
    SqlResultsTableComponent,
    DifficultyBadgeComponent
  ],
  template: `
    <div class="workspace-page">
      @if (isLoadingQuestion()) {
        <div class="loading-container">
          <div class="spinner"></div>
          <span>Loading SQL Workspace...</span>
        </div>
      } @else if (!question()) {
        <div class="card error-card">
          <h2>Question Not Found</h2>
          <p>The requested challenge could not be found or has not been published yet.</p>
          <a routerLink="/questions" class="btn btn-primary">Return to Catalog</a>
        </div>
      } @else {
        <div class="workspace-topbar">
          <div class="topbar-left">
            <a routerLink="/questions" class="btn btn-outline btn-sm back-btn" title="Back to Catalog">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              Catalog
            </a>
            <h1 class="question-title">{{ question()!.title }}</h1>
            <app-difficulty-badge [difficulty]="question()!.difficulty"></app-difficulty-badge>
            <span class="reward-pill">+{{ question()!.points }} XP</span>
          </div>

          <div class="topbar-right">
            <button
              type="button"
              class="btn btn-success"
              (click)="submitSolution()"
              [disabled]="isEvaluating() || isRunningQuery()">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
              {{ isEvaluating() ? 'Evaluating...' : 'Submit Solution' }}
            </button>
          </div>
        </div>

        @if (evaluationResult()) {
          <div
            class="evaluation-banner"
            [class.banner-accepted]="evaluationResult()!.status === 'accepted'"
            [class.banner-wrong]="evaluationResult()!.status === 'wrong_answer'"
            [class.banner-error]="evaluationResult()!.status === 'runtime_error' || evaluationResult()!.status === 'time_limit_exceeded'">
            <div class="banner-content">
              @if (evaluationResult()!.status === 'accepted') {
                <div class="banner-icon-circle success">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div class="banner-texts">
                  <h3>Accepted! All Test Cases Passed</h3>
                  <p>Runtime: {{ evaluationResult()!.executionTimeMs }} ms · Earned +{{ question()!.points }} XP · Streak Maintained!</p>
                </div>
              } @else {
                <div class="banner-icon-circle error">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </div>
                <div class="banner-texts">
                  <h3>{{ getEvaluationStatusTitle(evaluationResult()!.status) }}</h3>
                  <p>{{ evaluationResult()!.errorMessage || 'Check the Test Cases tab below for output differences.' }}</p>
                </div>
              }
            </div>
            <button type="button" class="btn btn-outline btn-sm" (click)="dismissEvaluationBanner()">Dismiss</button>
          </div>
        }

        <div class="workspace-split">
          <div class="pane left-pane card">
            <div class="pane-tabs">
              <button
                type="button"
                class="pane-tab"
                [class.active]="activeLeftTab() === 'description'"
                (click)="activeLeftTab.set('description')">
                Description
              </button>
              <button
                type="button"
                class="pane-tab"
                [class.active]="activeLeftTab() === 'schema'"
                (click)="activeLeftTab.set('schema')">
                Database Schema
              </button>
              <button
                type="button"
                class="pane-tab"
                [class.active]="activeLeftTab() === 'hints'"
                (click)="activeLeftTab.set('hints')">
                Hints
              </button>
              <button
                type="button"
                class="pane-tab"
                [class.active]="activeLeftTab() === 'submissions'"
                (click)="activeLeftTab.set('submissions')">
                Submissions ({{ pastSubmissions().length }})
              </button>
            </div>

            <div class="pane-content">
              @if (activeLeftTab() === 'description') {
                <div class="markdown-body">
                  <div class="rendered-markdown" [innerHTML]="formatMarkdown(question()!.description_markdown)"></div>
                </div>
              }

              @if (activeLeftTab() === 'schema') {
                <div class="schema-explorer">
                  <div class="schema-intro">
                    <p>The following tables and columns are pre-loaded in your sandbox environment:</p>
                  </div>
                  <pre class="schema-ddl-code"><code>{{ question()!.dataset?.schema_ddl }}</code></pre>
                  
                  <div class="seed-preview">
                    <h4>Sample Seed Data Preview</h4>
                    <pre class="schema-ddl-code"><code>{{ question()!.dataset?.seed_data_sql }}</code></pre>
                  </div>
                </div>
              }

              @if (activeLeftTab() === 'hints') {
                <div class="hints-tab">
                  <div class="hint-card">
                    <h4>💡 Query Strategy</h4>
                    <p>{{ question()!.hint_markdown || 'No hints currently provided for this challenge.' }}</p>
                  </div>

                  @if (question()!.explanation_markdown) {
                    <div class="hint-card explanation">
                      <h4>📖 Detailed Explanation</h4>
                      <p>{{ question()!.explanation_markdown }}</p>
                    </div>
                  }
                </div>
              }

              @if (activeLeftTab() === 'submissions') {
                <div class="submissions-history">
                  @if (pastSubmissions().length === 0) {
                    <div class="empty-subs">
                      <p>You haven't submitted any solutions for this question yet.</p>
                    </div>
                  } @else {
                    @for (sub of pastSubmissions(); track sub.id) {
                      <div class="past-submission-card">
                        <div class="sub-header">
                          <span class="sub-status" [class.accepted]="sub.status === 'accepted'">
                            {{ sub.status === 'accepted' ? 'Accepted' : 'Failed' }}
                          </span>
                          <span class="sub-meta">{{ sub.execution_time_ms }}ms · {{ formatTime(sub.submitted_at) }}</span>
                        </div>
                        <pre class="sub-code"><code>{{ sub.query_sql }}</code></pre>
                        <button type="button" class="btn btn-outline btn-sm restore-btn" (click)="restoreQuery(sub.query_sql)">
                          Restore Code
                        </button>
                      </div>
                    }
                  }
                </div>
              }
            </div>
          </div>

          <div class="pane right-pane">
            <div class="editor-section">
              <app-sql-editor
                [initialCode]="userCode"
                [isRunning]="isRunningQuery()"
                (codeChange)="onCodeChange($event)"
                (runRequested)="runQuery($event)">
              </app-sql-editor>
            </div>

            <div class="console-section card">
              <div class="pane-tabs">
                <button
                  type="button"
                  class="pane-tab"
                  [class.active]="activeRightTab() === 'results'"
                  (click)="activeRightTab.set('results')">
                  Execution Output
                </button>
                <button
                  type="button"
                  class="pane-tab"
                  [class.active]="activeRightTab() === 'testcases'"
                  (click)="activeRightTab.set('testcases')">
                  Test Cases ({{ question()!.test_cases?.length || 0 }})
                </button>
              </div>

              <div class="console-body">
                @if (activeRightTab() === 'results') {
                  <app-sql-results-table
                    [result]="queryResult()"
                    [isLoading]="isRunningQuery()">
                  </app-sql-results-table>
                } @else if (activeRightTab() === 'testcases') {
                  <div class="testcases-view">
                    @for (tc of question()!.test_cases; track tc.id; let idx = $index) {
                      <div class="testcase-card">
                        <div class="tc-header">
                          <span class="tc-title">Test Case {{ idx + 1 }}: {{ tc.test_name }}</span>
                          @if (getTestCaseResult(tc.id); as result) {
                            <span class="tc-status" [class.passed]="result.passed" [class.failed]="!result.passed">
                              {{ result.passed ? 'Passed' : 'Failed' }}
                            </span>
                          }
                        </div>
                        <div class="tc-expected-query">
                          <span class="tc-label">Reference Query:</span>
                          <code>{{ tc.expected_query }}</code>
                        </div>
                        @if (getTestCaseResult(tc.id)?.diffMessage; as diff) {
                          <div class="tc-diff-alert">
                            {{ diff }}
                          </div>
                        }
                      </div>
                    }
                  </div>
                }
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .workspace-page {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      height: calc(100vh - 95px);
    }

    .workspace-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .topbar-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }

    .question-title {
      font-size: 1.25rem;
      font-weight: 700;
    }

    .reward-pill {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--accent-warning);
      background-color: var(--accent-warning-subtle);
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);
    }

    .evaluation-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.85rem 1.25rem;
      border-radius: var(--radius-sm);
      animation: slideDown 200ms ease;

      &.banner-accepted {
        background-color: var(--accent-success-subtle);
        border: 1px solid rgba(16, 185, 129, 0.4);
      }

      &.banner-wrong, &.banner-error {
        background-color: var(--accent-danger-subtle);
        border: 1px solid rgba(239, 68, 68, 0.4);
      }

      .banner-content {
        display: flex;
        align-items: center;
        gap: 0.85rem;
      }

      .banner-icon-circle {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;

        &.success {
          background-color: var(--accent-success);
          color: #ffffff;
        }

        &.error {
          background-color: var(--accent-danger);
          color: #ffffff;
        }
      }

      .banner-texts {
        h3 {
          font-size: 0.95rem;
          margin-bottom: 0.15rem;
        }
        p {
          font-size: 0.8rem;
          color: var(--text-secondary);
        }
      }
    }

    @keyframes slideDown {
      from { transform: translateY(-10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    .workspace-split {
      display: grid;
      grid-template-columns: 45% 55%;
      gap: 1rem;
      flex: 1;
      min-height: 0;

      @media (max-width: 1024px) {
        grid-template-columns: 1fr;
        height: auto;
      }
    }

    .pane {
      display: flex;
      flex-direction: column;
      min-height: 0;
      overflow: hidden;
    }

    .left-pane {
      background-color: var(--bg-primary);
    }

    .pane-tabs {
      display: flex;
      border-bottom: 1px solid var(--border-subtle);
      background-color: var(--bg-secondary);
      overflow-x: auto;
    }

    .pane-tab {
      background: transparent;
      border: none;
      padding: 0.65rem 1rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-secondary);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      white-space: nowrap;
      transition: all 120ms ease;

      &:hover {
        color: var(--text-primary);
      }

      &.active {
        color: var(--accent-sky);
        border-bottom-color: var(--accent-sky);
        background-color: var(--bg-primary);
      }
    }

    .pane-content {
      flex: 1;
      overflow-y: auto;
      padding: 1.25rem;
    }

    .right-pane {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .editor-section {
      flex: 1.1;
      min-height: 280px;
    }

    .console-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 220px;
      overflow: hidden;
    }

    .console-body {
      flex: 1;
      overflow: hidden;
    }

    .rendered-markdown {
      font-size: 0.9rem;
      line-height: 1.65;
      color: var(--text-primary);

      h3, h4 {
        margin-top: 1rem;
        margin-bottom: 0.5rem;
      }

      p {
        margin-bottom: 0.85rem;
        color: var(--text-secondary);
      }

      ul, ol {
        margin-left: 1.25rem;
        margin-bottom: 0.85rem;
        color: var(--text-secondary);
      }

      li {
        margin-bottom: 0.25rem;
      }

      code {
        background-color: var(--bg-secondary);
        border: 1px solid var(--border-subtle);
        padding: 0.15rem 0.4rem;
        border-radius: var(--radius-xs);
        font-family: var(--font-mono);
        font-size: 0.825rem;
      }
    }

    .schema-explorer {
      display: flex;
      flex-direction: column;
      gap: 1rem;

      .schema-intro p {
        font-size: 0.85rem;
        color: var(--text-secondary);
      }

      .schema-ddl-code {
        background-color: var(--bg-code);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);
        padding: 1rem;
        font-family: var(--font-mono);
        font-size: 0.8rem;
        color: var(--text-primary);
        overflow-x: auto;
        white-space: pre-wrap;
      }

      .seed-preview h4 {
        font-size: 0.85rem;
        margin-bottom: 0.5rem;
      }
    }

    .hints-tab {
      display: flex;
      flex-direction: column;
      gap: 1rem;

      .hint-card {
        padding: 1rem;
        background-color: var(--bg-secondary);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);

        h4 {
          font-size: 0.9rem;
          margin-bottom: 0.4rem;
        }

        p {
          font-size: 0.85rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }
      }
    }

    .submissions-history {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .past-submission-card {
      padding: 0.85rem;
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);

      .sub-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
      }

      .sub-status {
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--accent-danger);

        &.accepted {
          color: var(--accent-success);
        }
      }

      .sub-meta {
        font-size: 0.725rem;
        color: var(--text-muted);
      }

      .sub-code {
        background-color: var(--bg-code);
        padding: 0.65rem;
        border-radius: var(--radius-xs);
        font-family: var(--font-mono);
        font-size: 0.775rem;
        margin-bottom: 0.5rem;
        overflow-x: auto;
      }

      .restore-btn {
        font-size: 0.75rem;
        padding: 0.25rem 0.5rem;
      }
    }

    .testcases-view {
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      overflow-y: auto;
      height: 100%;
    }

    .testcase-card {
      padding: 0.85rem;
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);

      .tc-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 0.4rem;
      }

      .tc-title {
        font-size: 0.825rem;
        font-weight: 600;
      }

      .tc-status {
        font-size: 0.75rem;
        font-weight: 700;

        &.passed { color: var(--accent-success); }
        &.failed { color: var(--accent-danger); }
      }

      .tc-expected-query {
        font-size: 0.775rem;
        color: var(--text-secondary);
        display: flex;
        flex-direction: column;
        gap: 0.2rem;

        code {
          background-color: var(--bg-code);
          padding: 0.4rem 0.6rem;
          border-radius: var(--radius-xs);
          font-family: var(--font-mono);
          color: var(--text-primary);
        }
      }

      .tc-diff-alert {
        margin-top: 0.5rem;
        padding: 0.5rem 0.75rem;
        background-color: var(--accent-danger-subtle);
        color: var(--accent-danger);
        font-size: 0.775rem;
        border-radius: var(--radius-xs);
      }
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 50vh;
      gap: 1rem;
      color: var(--text-secondary);
    }
  `]
})
export class QuestionWorkspaceComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private dataService = inject(DataService);
  private auth = inject(AuthService);
  private sandbox = inject(SqlSandboxService);

  question = signal<Question | null>(null);
  isLoadingQuestion = signal<boolean>(true);

  activeLeftTab = signal<LeftTab>('description');
  activeRightTab = signal<RightTab>('results');

  isRunningQuery = signal<boolean>(false);
  isEvaluating = signal<boolean>(false);

  userCode: string = '-- Write your SQL query here\n';
  queryResult = signal<SqlQueryResult | null>(null);
  evaluationResult = signal<SubmissionEvaluationResult | null>(null);
  pastSubmissions = signal<Submission[]>([]);

  async ngOnInit(): Promise<void> {
    const slug = this.route.snapshot.paramMap.get('slug');
    if (!slug) {
      this.isLoadingQuestion.set(false);
      return;
    }

    const q = await this.dataService.getQuestionBySlug(slug);
    this.question.set(q);
    this.isLoadingQuestion.set(false);

    if (q && q.dataset) {
      await this.sandbox.initDataset(q.dataset.schema_ddl, q.dataset.seed_data_sql);

      const userId = this.auth.currentUser()?.id || 'demo-user-1';
      const subs = await this.dataService.getUserSubmissions(userId, q.id);
      this.pastSubmissions.set(subs);

      if (subs.length > 0) {
        this.userCode = subs[0].query_sql;
      } else {
        this.userCode = `-- SQL Squad Challenge: ${q.title}\n-- Dialect: PostgreSQL 16\n\nSELECT * FROM customers LIMIT 5;\n`;
      }
    }
  }

  onCodeChange(newCode: string): void {
    this.userCode = newCode;
  }

  async runQuery(sqlQuery: string): Promise<void> {
    if (!this.question()?.dataset) return;

    this.isRunningQuery.set(true);
    this.activeRightTab.set('results');

    try {
      await this.sandbox.initDataset(
        this.question()!.dataset!.schema_ddl,
        this.question()!.dataset!.seed_data_sql
      );

      const result = await this.sandbox.runQuery(sqlQuery);
      this.queryResult.set(result);
    } catch (err: any) {
      this.queryResult.set({
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: err.message || String(err)
      });
    } finally {
      this.isRunningQuery.set(false);
    }
  }

  async submitSolution(): Promise<void> {
    const q = this.question();
    if (!q || !q.dataset) return;

    this.isEvaluating.set(true);

    try {
      const evaluation = await this.sandbox.evaluateSubmission(
        this.userCode,
        q.test_cases || [],
        q.dataset.schema_ddl,
        q.dataset.seed_data_sql
      );

      this.evaluationResult.set(evaluation);
      this.activeRightTab.set('testcases');

      const userId = this.auth.currentUser()?.id || 'demo-user-1';
      await this.dataService.recordSubmission(
        userId,
        q.id,
        this.userCode,
        evaluation.status,
        evaluation.executionTimeMs,
        evaluation.passedTestCases,
        evaluation.totalTestCases,
        evaluation.errorMessage
      );

      const subs = await this.dataService.getUserSubmissions(userId, q.id);
      this.pastSubmissions.set(subs);
    } catch (err: any) {
      console.error('Submission evaluation failed:', err);
    } finally {
      this.isEvaluating.set(false);
    }
  }

  getTestCaseResult(testCaseId: string) {
    return this.evaluationResult()?.testCaseResults?.find(t => t.testCaseId === testCaseId);
  }

  getEvaluationStatusTitle(status: string): string {
    switch (status) {
      case 'wrong_answer': return 'Wrong Answer';
      case 'runtime_error': return 'Runtime Error';
      case 'time_limit_exceeded': return 'Time Limit Exceeded (3.0s)';
      default: return 'Submission Result';
    }
  }

  dismissEvaluationBanner(): void {
    this.evaluationResult.set(null);
  }

  restoreQuery(code: string): void {
    this.userCode = code;
  }

  formatMarkdown(markdown: string): string {
    if (!markdown) return '';
    return markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/`([^`]+)`/gim, '<code>$1</code>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/\n\n/gim, '<p></p>')
      .replace(/\n/gim, '<br/>');
  }

  formatTime(isoStr: string): string {
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Recent';
    }
  }
}
