import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SqlQueryResult } from '../../../core/models/database.types';

@Component({
  selector: 'app-sql-results-table',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="results-wrapper">
      <div class="results-toolbar">
        <div class="toolbar-left">
          <span class="status-indicator" [class.success]="result && !result.error" [class.error]="result?.error"></span>
          <span class="status-title">{{ getStatusTitle() }}</span>
          @if (result && !result.error && result.rowCount !== undefined) {
            <span class="stat-pill">{{ result.rowCount }} {{ result.rowCount === 1 ? 'row' : 'rows' }}</span>
            <span class="stat-pill execution-time">{{ result.executionTimeMs }} ms</span>
          }
        </div>
        <div class="toolbar-right">
          @if (result && !result.error && result.rows.length > 0) {
            <button type="button" class="btn btn-outline btn-sm copy-btn" (click)="copyJson()" title="Copy results as JSON">
              @if (copiedJson()) {
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span class="text-success">Copied!</span>
              } @else {
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
                <span>Copy JSON</span>
              }
            </button>
            <button type="button" class="btn btn-outline btn-sm" (click)="exportCsv()" title="Download CSV">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>Export CSV</span>
            </button>
          }
        </div>
      </div>

      <div class="results-body">
        @if (isLoading) {
          <div class="loading-state">
            <div class="spinner"></div>
            <span>Executing SQL query in sandbox...</span>
          </div>
        } @else if (result?.error) {
          <div class="error-state">
            <div class="error-header">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>PostgreSQL Syntax / Runtime Error</span>
            </div>
            <pre class="error-message">{{ result?.error }}</pre>
          </div>
        } @else if (!result) {
          <div class="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            <p>Click <strong>Run Query</strong> or press <kbd>Ctrl+Enter</kbd> to execute your query against the sandbox.</p>
          </div>
        } @else if (result.rows.length === 0) {
          <div class="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
            </svg>
            <p>Query executed successfully, but returned <strong>0 rows</strong>.</p>
          </div>
        } @else {
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th class="row-num-col">#</th>
                  @for (col of result.columns; track col) {
                    <th>{{ col }}</th>
                  }
                </tr>
              </thead>
              <tbody>
                @for (row of result.rows; track idx; let idx = $index) {
                  <tr>
                    <td class="row-num-col">{{ idx + 1 }}</td>
                    @for (col of result.columns; track col) {
                      <td>{{ formatValue(row[col]) }}</td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1 1 0%;
      height: 100%;
      min-height: 0;
      width: 100%;
      overflow: hidden;
    }

    .results-wrapper {
      display: flex;
      flex-direction: column;
      height: 100%;
      flex: 1 1 0%;
      min-height: 0;
      background-color: var(--bg-primary);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .results-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.85rem;
      background-color: var(--bg-secondary);
      border-bottom: 1px solid var(--border-subtle);
    }

    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--text-muted);

      &.success {
        background-color: var(--accent-success);
        box-shadow: 0 0 8px var(--accent-success);
      }

      &.error {
        background-color: var(--accent-danger);
        box-shadow: 0 0 8px var(--accent-danger);
      }
    }

    .status-title {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .stat-pill {
      font-size: 0.725rem;
      font-weight: 500;
      color: var(--text-secondary);
      background-color: var(--bg-tertiary);
      padding: 0.15rem 0.45rem;
      border-radius: var(--radius-xs);

      &.execution-time {
        color: var(--accent-sky);
        font-family: var(--font-mono);
      }
    }

    .results-body {
      flex: 1;
      overflow: auto;
      min-height: 0;
      position: relative;
    }

    .table-container {
      width: 100%;
      height: 100%;
      overflow: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.825rem;

      thead th {
        position: sticky;
        top: 0;
        background-color: var(--bg-secondary);
        z-index: 2;
        padding: 0.55rem 0.75rem;
        text-align: left;
        font-weight: 600;
        color: var(--text-secondary);
        border-bottom: 1px solid var(--border-medium);
        white-space: nowrap;
      }

      tbody td {
        padding: 0.45rem 0.75rem;
        border-bottom: 1px solid var(--border-subtle);
        color: var(--text-primary);
        font-family: var(--font-mono);
        white-space: nowrap;
      }

      tbody tr:hover {
        background-color: var(--bg-hover);
      }
    }

    .row-num-col {
      width: 40px;
      color: var(--text-muted);
      font-size: 0.75rem;
      text-align: center !important;
      user-select: none;
    }

    .loading-state, .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 1.5rem 1rem;
      color: var(--text-secondary);
      text-align: center;
      gap: 0.6rem;
      height: 100%;

      svg {
        color: var(--text-muted);
      }

      kbd {
        background-color: var(--bg-secondary);
        border: 1px solid var(--border-medium);
        padding: 0.1rem 0.35rem;
        border-radius: 4px;
        font-family: var(--font-mono);
        color: var(--text-primary);
      }
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid var(--border-medium);
      border-top-color: var(--accent-sky);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-state {
      margin: 1rem;
      padding: 1rem;
      background-color: var(--accent-danger-subtle);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: var(--radius-sm);

      .error-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: var(--accent-danger);
        font-weight: 600;
        font-size: 0.85rem;
        margin-bottom: 0.5rem;
      }

      .error-message {
        font-family: var(--font-mono);
        font-size: 0.825rem;
        color: var(--text-primary);
        white-space: pre-wrap;
        word-break: break-all;
      }
    }
  `]
})
export class SqlResultsTableComponent {
  @Input() result: SqlQueryResult | null = null;
  @Input() isLoading: boolean = false;

  copiedJson = signal<boolean>(false);

  getStatusTitle(): string {
    if (this.isLoading) return 'Executing...';
    if (!this.result) return 'Console Ready';
    if (this.result.error) return 'Execution Error';
    return 'Query Succeeded';
  }

  formatValue(val: any): string {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'object') return JSON.stringify(val);
    return String(val);
  }

  copyJson(): void {
    if (!this.result || this.result.rows.length === 0) return;
    const jsonStr = JSON.stringify(this.result.rows, null, 2);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(jsonStr);
    } else {
      const el = document.createElement('textarea');
      el.value = jsonStr;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    this.copiedJson.set(true);
    setTimeout(() => this.copiedJson.set(false), 1600);
  }

  exportCsv(): void {
    if (!this.result || this.result.rows.length === 0) return;

    const headers = this.result.columns.join(',');
    const rows = this.result.rows.map(row =>
      this.result!.columns
        .map(col => {
          const val = row[col];
          if (val === null || val === undefined) return '';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',')
    );

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_result_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
