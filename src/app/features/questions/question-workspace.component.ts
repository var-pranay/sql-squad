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
type MobileTab = 'description' | 'editor' | 'results';
type RightPaneViewMode = 'editor' | 'output';

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
        <!-- TOPBAR -->
        <div class="workspace-topbar">
          <div class="topbar-row-primary">
            <a routerLink="/questions" class="btn btn-outline btn-sm back-btn" title="Back to Catalog">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="19" y1="12" x2="5" y2="12"/>
                <polyline points="12 19 5 12 12 5"/>
              </svg>
              <span>Catalog</span>
            </a>

            <div class="topbar-desktop-title">
              <h1 class="question-title">{{ question()!.title }}</h1>
            </div>

            <div class="badge-group">
              <app-difficulty-badge [difficulty]="question()!.difficulty"></app-difficulty-badge>
              <span class="reward-pill">+{{ question()!.points }} XP</span>
            </div>

            <div class="topbar-actions-group">
              <button
                type="button"
                class="btn btn-primary topbar-run-btn"
                (click)="runQuery(userCode)"
                [disabled]="isRunningQuery() || isEvaluating()"
                title="Execute Query (Ctrl + Enter)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                <span>{{ isRunningQuery() ? 'Running...' : 'Run Query' }}</span>
              </button>

              <button
                type="button"
                class="btn btn-success submit-btn"
                (click)="submitSolution()"
                [disabled]="isEvaluating() || isRunningQuery()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span>{{ isEvaluating() ? 'Evaluating...' : 'Submit Solution' }}</span>
              </button>
            </div>
          </div>

          <div class="topbar-mobile-title">
            <h1 class="question-title-mobile">{{ question()!.title }}</h1>
          </div>
        </div>

        <!-- EVALUATION BANNER -->
        @if (evaluationResult()) {
          <div
            class="evaluation-banner"
            [class.banner-accepted]="evaluationResult()!.status === 'accepted'"
            [class.banner-wrong]="evaluationResult()!.status === 'wrong_answer'"
            [class.banner-error]="evaluationResult()!.status === 'runtime_error' || evaluationResult()!.status === 'time_limit_exceeded'">
            <div class="banner-content">
              @if (evaluationResult()!.status === 'accepted') {
                <div class="banner-icon-circle success">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </div>
                <div class="banner-texts">
                  <h3>Accepted! All Test Cases Passed</h3>
                  <p>Runtime: {{ evaluationResult()!.executionTimeMs }} ms · Earned +{{ question()!.points }} XP · Streak Maintained!</p>
                </div>
              } @else {
                <div class="banner-icon-circle error">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
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
            <button type="button" class="btn btn-outline btn-sm dismiss-btn" (click)="dismissEvaluationBanner()">Dismiss</button>
          </div>
        }

        <!-- MOBILE SEGMENTED CONTROL TABS -->
        <div class="mobile-tab-switcher">
          <button
            type="button"
            class="mobile-tab-btn"
            [class.active]="mobileView() === 'description'"
            (click)="mobileView.set('description')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Problem
          </button>
          <button
            type="button"
            class="mobile-tab-btn"
            [class.active]="mobileView() === 'editor'"
            (click)="mobileView.set('editor')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="16 18 22 12 16 6"/>
              <polyline points="8 6 2 12 8 18"/>
            </svg>
            SQL Editor
          </button>
          <button
            type="button"
            class="mobile-tab-btn"
            [class.active]="mobileView() === 'results'"
            (click)="mobileView.set('results')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
            Output & Tests
            @if (evaluationResult()) {
              <span class="tab-indicator" [class.pass]="evaluationResult()!.status === 'accepted'" [class.fail]="evaluationResult()!.status !== 'accepted'"></span>
            }
          </button>
        </div>

        <!-- MAIN WORKSPACE SPLIT (Desktop: 2-column, Mobile: Tab-controlled) -->
        <div class="workspace-split" [class]="'mobile-active-' + mobileView()">
          <!-- LEFT PANE: Description / Schema / Hints / Submissions -->
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
                  <div class="code-box-wrapper">
                    <div class="code-box-header">
                      <span class="code-box-title">Schema DDL</span>
                      <button
                        type="button"
                        class="btn btn-outline btn-xs copy-btn"
                        (click)="copyText(question()!.dataset?.schema_ddl, 'ddl')"
                        title="Copy Schema DDL">
                        @if (copiedKey() === 'ddl') {
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          <span class="text-success">Copied!</span>
                        } @else {
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          <span>Copy DDL</span>
                        }
                      </button>
                    </div>
                    <pre class="schema-ddl-code"><code>{{ question()!.dataset?.schema_ddl }}</code></pre>
                  </div>

                  <div class="seed-preview">
                    <div class="code-box-header">
                      <span class="code-box-title">Sample Seed Data Preview</span>
                      <button
                        type="button"
                        class="btn btn-outline btn-xs copy-btn"
                        (click)="copyText(question()!.dataset?.seed_data_sql, 'seed')"
                        title="Copy Seed SQL">
                        @if (copiedKey() === 'seed') {
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                          <span class="text-success">Copied!</span>
                        } @else {
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                          <span>Copy Seed SQL</span>
                        }
                      </button>
                    </div>
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
                        <div class="sub-actions">
                          <button type="button" class="btn btn-outline btn-sm restore-btn" (click)="restoreQuery(sub.query_sql)">
                            Restore Code
                          </button>
                          <button
                            type="button"
                            class="btn btn-outline btn-sm copy-btn"
                            (click)="copyText(sub.query_sql, 'sub-' + sub.id)"
                            title="Copy Query">
                            @if (copiedKey() === 'sub-' + sub.id) {
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                              <span class="text-success">Copied!</span>
                            } @else {
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                              <span>Copy</span>
                            }
                          </button>
                        </div>
                      </div>
                    }
                  }
                </div>
              }
            </div>
          </div>

          <!-- RIGHT PANE: Code Editor OR Output / Test Cases -->
          <div class="pane right-pane card" [class]="'pane-mode-' + rightPaneMode()">
            <!-- RIGHT PANE VIEW TABS -->
            <div class="pane-tabs right-pane-tabs">
              <button
                type="button"
                class="pane-tab"
                [class.active]="rightPaneMode() === 'editor'"
                (click)="setRightPaneMode('editor')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="16 18 22 12 16 6"/>
                  <polyline points="8 6 2 12 8 18"/>
                </svg>
                <span>SQL Editor</span>
              </button>
              <button
                type="button"
                class="pane-tab"
                [class.active]="rightPaneMode() === 'output'"
                (click)="setRightPaneMode('output')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="3" y1="9" x2="21" y2="9"/>
                  <line x1="9" y1="21" x2="9" y2="9"/>
                </svg>
                <span>Output & Test Cases</span>
                @if (evaluationResult()) {
                  <span class="tab-indicator" [class.pass]="evaluationResult()!.status === 'accepted'" [class.fail]="evaluationResult()!.status !== 'accepted'"></span>
                }
              </button>
            </div>

            @if (rightPaneMode() === 'editor') {
              <div class="editor-section">
                <app-sql-editor
                  [initialCode]="userCode"
                  [starterCode]="starterTemplateCode()"
                  [isRunning]="isRunningQuery()"
                  (codeChange)="onCodeChange($event)"
                  (runRequested)="runQuery($event)"
                  (resetRequested)="onResetEditor()">
                </app-sql-editor>
              </div>
            } @else {
              <div class="console-section">
                <div class="console-sub-bar">
                  <div class="console-tabs-left">
                    <button
                      type="button"
                      class="sub-tab-btn"
                      [class.active]="activeRightTab() === 'results'"
                      (click)="activeRightTab.set('results')">
                      Query Output
                    </button>
                    <button
                      type="button"
                      class="sub-tab-btn"
                      [class.active]="activeRightTab() === 'testcases'"
                      (click)="activeRightTab.set('testcases')">
                      Test Cases ({{ question()!.test_cases?.length || 0 }})
                    </button>
                  </div>
                  <button
                    type="button"
                    class="btn btn-outline btn-xs back-to-editor-btn"
                    (click)="setRightPaneMode('editor')"
                    title="Switch back to SQL Editor">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="15 18 9 12 15 6"/>
                    </svg>
                    <span>Back to Editor</span>
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
                            <div class="tc-expected-header">
                              <span class="tc-label">Reference Query:</span>
                              <button
                                type="button"
                                class="btn btn-outline btn-xs copy-btn"
                                (click)="copyText(tc.expected_query, 'tc-' + tc.id)"
                                title="Copy Reference Query">
                                @if (copiedKey() === 'tc-' + tc.id) {
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                  <span class="text-success">Copied!</span>
                                } @else {
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                                  <span>Copy</span>
                                }
                              </button>
                            </div>
                            <pre class="tc-code"><code>{{ tc.expected_query }}</code></pre>
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
            }
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .workspace-page {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
      height: 100%;
      max-height: 100%;
      flex: 1;
      min-height: 0;
      overflow: hidden;

      @media (max-width: 900px) {
        gap: 0.35rem;
      }
    }

    .workspace-topbar {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      flex-shrink: 0;
    }

    .topbar-row-primary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      width: 100%;
    }

    .topbar-desktop-title {
      display: flex;
      align-items: center;
      flex: 1;
      min-width: 0;
      overflow: hidden;

      @media (max-width: 768px) {
        display: none;
      }
    }

    .topbar-mobile-title {
      display: none;

      @media (max-width: 768px) {
        display: block;
        width: 100%;
      }
    }

    .question-title {
      font-size: 1.15rem;
      font-weight: 700;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: -0.01em;
    }

    .question-title-mobile {
      font-size: 0.925rem;
      font-weight: 700;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: -0.01em;
      color: var(--text-primary);
    }

    .badge-group {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      flex-shrink: 0;
    }

    .reward-pill {
      font-size: 0.725rem;
      font-weight: 700;
      color: var(--accent-warning);
      background-color: var(--accent-warning-subtle);
      padding: 0.15rem 0.45rem;
      border-radius: var(--radius-sm);
    }

    .back-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.6rem;
      font-size: 0.775rem;
      flex-shrink: 0;
    }

    .topbar-actions-group {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      flex-shrink: 0;
    }

    .topbar-run-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.75rem;
      font-size: 0.8rem;
      font-weight: 700;
      flex-shrink: 0;

      @media (max-width: 480px) {
        padding: 0.3rem 0.5rem;
        font-size: 0.75rem;
      }
    }

    .submit-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.75rem;
      font-size: 0.8rem;
      font-weight: 600;
      flex-shrink: 0;

      @media (max-width: 480px) {
        padding: 0.3rem 0.55rem;
        font-size: 0.75rem;
      }
    }

    .evaluation-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.65rem 1rem;
      border-radius: var(--radius-sm);
      flex-shrink: 0;
      animation: slideDown 180ms ease;

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
        gap: 0.75rem;
      }

      .banner-icon-circle {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

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
          font-size: 0.875rem;
          margin: 0 0 0.15rem 0;
        }
        p {
          font-size: 0.775rem;
          color: var(--text-secondary);
          margin: 0;
        }
      }

      .dismiss-btn {
        padding: 0.2rem 0.5rem;
        font-size: 0.725rem;
      }
    }

    @keyframes slideDown {
      from { transform: translateY(-8px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    /* MOBILE SEGMENTED CONTROL TABS */
    .mobile-tab-switcher {
      display: none;
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      padding: 3px;
      gap: 3px;
      flex-shrink: 0;

      @media (max-width: 1024px) {
        display: flex;
      }
    }

    .mobile-tab-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-secondary);
      font-size: 0.8rem;
      font-weight: 600;
      padding: 0.45rem 0.5rem;
      min-height: 40px;
      border-radius: var(--radius-xs);
      cursor: pointer;
      transition: all 120ms ease;

      &.active {
        background-color: var(--bg-primary);
        color: var(--accent-sky);
        border-color: var(--border-medium);
        box-shadow: var(--shadow-sm);
      }
    }

    .tab-indicator {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      margin-left: 2px;

      &.pass { background-color: var(--accent-success); }
      &.fail { background-color: var(--accent-danger); }
    }

    /* WORKSPACE SPLIT (Desktop: 2 columns, Mobile: Tab views) */
    .workspace-split {
      display: grid;
      grid-template-columns: 46% 54%;
      gap: 0.75rem;
      flex: 1;
      min-height: 0;
      overflow: hidden;

      @media (max-width: 1024px) {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        height: 100%;

        &.mobile-active-description {
          .left-pane { display: flex; flex: 1; height: 100%; min-height: 0; }
          .right-pane { display: none; }
        }

        &.mobile-active-editor {
          .left-pane { display: none; }
          .right-pane {
            display: flex;
            flex: 1;
            height: 100%;
            min-height: 0;
            .editor-section { display: flex; flex: 1; height: 100%; min-height: 0; }
            .console-section { display: none; }
          }
        }

        &.mobile-active-results {
          .left-pane { display: none; }
          .right-pane {
            display: flex;
            flex: 1;
            height: 100%;
            min-height: 0;
            .editor-section { display: none; }
            .console-section { display: flex; flex: 1; height: 100%; min-height: 0; }
          }
        }
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
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      height: 100%;
      max-height: 100%;
      min-height: 0;
    }

    .pane-tabs {
      display: flex;
      border-bottom: 1px solid var(--border-subtle);
      background-color: var(--bg-secondary);
      overflow-x: auto;
      flex-shrink: 0;
    }

    .pane-tab {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background: transparent;
      border: none;
      padding: 0.55rem 0.9rem;
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
      flex: 1 1 0;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 1rem 1.25rem;
      min-height: 0;
      max-height: 100%;
    }

    .right-pane {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      height: 100%;
      max-height: 100%;
      overflow: hidden;
      background-color: var(--bg-primary);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);

      .editor-section {
        flex: 1 1 0;
        height: 100%;
        min-height: 0;
        max-height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .console-section {
        flex: 1 1 0;
        height: 100%;
        min-height: 0;
        max-height: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
    }

    .console-sub-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.4rem 0.75rem;
      background-color: var(--bg-secondary);
      border-bottom: 1px solid var(--border-subtle);
      flex-shrink: 0;
    }

    .console-tabs-left {
      display: flex;
      gap: 0.4rem;
    }

    .sub-tab-btn {
      background: transparent;
      border: 1px solid transparent;
      padding: 0.3rem 0.7rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-secondary);
      border-radius: var(--radius-xs);
      cursor: pointer;
      transition: all 120ms ease;

      &:hover {
        color: var(--text-primary);
        background-color: var(--bg-hover);
      }

      &.active {
        color: var(--accent-sky);
        background-color: var(--bg-primary);
        border-color: var(--border-medium);
      }
    }

    .back-to-editor-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.6rem;
      font-size: 0.775rem;
      font-weight: 600;
    }

    .console-body {
      flex: 1;
      min-height: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .rendered-markdown {
      font-size: 0.875rem;
      line-height: 1.6;
      color: var(--text-primary);

      h3, h4 {
        margin-top: 0.85rem;
        margin-bottom: 0.4rem;
        color: var(--text-primary);
      }

      p {
        margin-bottom: 0.75rem;
        color: var(--text-secondary);
      }

      ul, ol {
        margin-left: 1.25rem;
        margin-bottom: 0.75rem;
        color: var(--text-secondary);
      }

      li {
        margin-bottom: 0.2rem;
      }

      code {
        background-color: var(--bg-secondary);
        border: 1px solid var(--border-subtle);
        padding: 0.12rem 0.35rem;
        border-radius: var(--radius-xs);
        font-family: var(--font-mono);
        font-size: 0.8rem;
        color: var(--accent-sky);
      }
    }

    .schema-explorer {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;

      .schema-intro p {
        font-size: 0.825rem;
        color: var(--text-secondary);
        margin: 0;
      }

      .code-box-wrapper {
        display: flex;
        flex-direction: column;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);
        overflow: hidden;
      }

      .code-box-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.35rem 0.65rem;
        background-color: var(--bg-secondary);
        border-bottom: 1px solid var(--border-subtle);
      }

      .code-box-title {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--text-secondary);
      }

      .schema-ddl-code {
        background-color: var(--bg-code);
        border: none;
        border-radius: 0;
        padding: 0.85rem;
        margin: 0;
        font-family: var(--font-mono);
        font-size: 0.775rem;
        color: var(--text-primary);
        overflow-x: auto;
        white-space: pre-wrap;
      }

      .seed-preview {
        display: flex;
        flex-direction: column;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);
        overflow: hidden;
      }
    }

    .hints-tab {
      display: flex;
      flex-direction: column;
      gap: 0.85rem;

      .hint-card {
        padding: 0.85rem;
        background-color: var(--bg-secondary);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);

        h4 {
          font-size: 0.85rem;
          margin: 0 0 0.35rem 0;
        }

        p {
          font-size: 0.825rem;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0;
        }
      }
    }

    .submissions-history {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      padding-bottom: 1.5rem;
    }

    .past-submission-card {
      padding: 0.75rem;
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);

      .sub-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.4rem;
      }

      .sub-status {
        font-size: 0.725rem;
        font-weight: 700;
        color: var(--accent-danger);

        &.accepted {
          color: var(--accent-success);
        }
      }

      .sub-meta {
        font-size: 0.7rem;
        color: var(--text-muted);
      }

      .sub-code {
        background-color: var(--bg-code);
        padding: 0.5rem;
        border-radius: var(--radius-xs);
        font-family: var(--font-mono);
        font-size: 0.75rem;
        margin-bottom: 0.4rem;
        overflow-x: auto;
        white-space: pre-wrap;
        max-height: 100px;
      }

      .restore-btn {
        font-size: 0.725rem;
        padding: 0.2rem 0.5rem;
      }

      .sub-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
    }

    .btn-xs {
      padding: 0.15rem 0.45rem;
      font-size: 0.7rem;
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }

    .copy-btn {
      color: var(--text-secondary);
      cursor: pointer;
      border-radius: var(--radius-xs);
      transition: all 120ms ease;

      &:hover {
        color: var(--text-primary);
        border-color: var(--accent-sky);
      }
    }

    .text-success {
      color: var(--accent-success);
      font-weight: 600;
    }

    .testcases-view {
      padding: 0.85rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      overflow-y: auto;
      flex: 1;
      min-height: 0;
      height: 100%;
    }

    .testcase-card {
      padding: 0.75rem;
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      flex-shrink: 0;

      .tc-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.35rem;
      }

      .tc-title {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--text-primary);
      }

      .tc-status {
        font-size: 0.725rem;
        font-weight: 700;

        &.passed { color: var(--accent-success); }
        &.failed { color: var(--accent-danger); }
      }

      .tc-expected-query {
        font-size: 0.75rem;
        color: var(--text-secondary);
        display: flex;
        flex-direction: column;
        gap: 0.25rem;

        .tc-expected-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        code {
          background-color: var(--bg-code);
          padding: 0.45rem 0.65rem;
          border-radius: var(--radius-xs);
          font-family: var(--font-mono);
          color: var(--text-primary);
          white-space: pre-wrap;
          word-break: break-word;
          max-height: 130px;
          overflow-y: auto;
          display: block;
        }
      }

      .tc-diff-alert {
        margin-top: 0.4rem;
        padding: 0.45rem 0.65rem;
        background-color: var(--accent-danger-subtle);
        color: var(--accent-danger);
        font-size: 0.75rem;
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
  mobileView = signal<MobileTab>('description');
  rightPaneMode = signal<RightPaneViewMode>('editor');

  isRunningQuery = signal<boolean>(false);
  isEvaluating = signal<boolean>(false);

  starterTemplateCode = signal<string>('');
  copiedKey = signal<string | null>(null);

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
      // Warm up dataset in background
      this.sandbox.initDataset(q.dataset.schema_ddl, q.dataset.seed_data_sql).catch(err => {
        console.warn('Sandbox init warning:', err);
      });

      // Automatically determine first table name from dataset schema DDL
      const match = q.dataset.schema_ddl.match(/CREATE\s+TABLE\s+(\w+)/i);
      const firstTable = match ? match[1] : 'my_table';
      const starter = `-- SQL Squad Challenge: ${q.title}\n-- Dialect: PostgreSQL 16\n\nSELECT * FROM ${firstTable} LIMIT 10;\n`;
      this.starterTemplateCode.set(starter);

      const userId = this.auth.currentUser()?.id || 'demo-user-1';
      const subs = await this.dataService.getUserSubmissions(userId, q.id);
      this.pastSubmissions.set(subs);

      if (subs.length > 0) {
        this.userCode = subs[0].query_sql;
      } else {
        this.userCode = starter;
      }
    }
  }

  onCodeChange(newCode: string): void {
    this.userCode = newCode;
  }

  setRightPaneMode(mode: RightPaneViewMode): void {
    this.rightPaneMode.set(mode);
  }

  async runQuery(sqlQuery: string): Promise<void> {
    if (!this.question()?.dataset) return;

    this.isRunningQuery.set(true);
    this.activeRightTab.set('results');
    this.rightPaneMode.set('output');

    // On mobile devices, automatically switch to results tab so output is instantly visible
    if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
      this.mobileView.set('results');
    }

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
    this.activeRightTab.set('testcases');
    this.rightPaneMode.set('output');

    // On mobile devices, switch to results/tests tab
    if (typeof window !== 'undefined' && window.innerWidth <= 1024) {
      this.mobileView.set('results');
    }

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
      case 'time_limit_exceeded': return 'Time Limit Exceeded (3.5s)';
      default: return 'Submission Result';
    }
  }

  dismissEvaluationBanner(): void {
    this.evaluationResult.set(null);
  }

  restoreQuery(code: string): void {
    this.userCode = code;
    // On mobile, switch back to editor so user sees their restored code
    this.mobileView.set('editor');
  }

  onResetEditor(): void {
    this.userCode = this.starterTemplateCode();
  }

  copyText(text: string | undefined, key: string): void {
    if (!text) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    this.copiedKey.set(key);
    setTimeout(() => {
      if (this.copiedKey() === key) {
        this.copiedKey.set(null);
      }
    }, 1600);
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
