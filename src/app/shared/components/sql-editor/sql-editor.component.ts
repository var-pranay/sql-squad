import {
  Component,
  ElementRef,
  Input,
  Output,
  EventEmitter,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorView, basicSetup } from 'codemirror';
import { sql, PostgreSQL } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorState, Compartment } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-sql-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="sql-editor-wrapper">
      <div class="editor-header">
        <div class="header-left">
          <span class="dialect-badge">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <ellipse cx="12" cy="5" rx="9" ry="3"/>
              <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
            </svg>
            PostgreSQL 16
          </span>
          <span class="shortcut-tip">Press <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to Run</span>
        </div>
        <div class="header-actions">
          <button type="button" class="btn btn-outline btn-sm" (click)="resetCode()" title="Reset query to template">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
            Reset
          </button>
          <button type="button" class="btn btn-primary btn-sm" (click)="onRun()" [disabled]="isRunning">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            {{ isRunning ? 'Running...' : 'Run Query' }}
          </button>
        </div>
      </div>
      <div #editorHost class="editor-container"></div>
    </div>
  `,
  styles: [`
    .sql-editor-wrapper {
      display: flex;
      flex-direction: column;
      height: 100%;
      background-color: var(--bg-code);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      overflow: hidden;
    }

    .editor-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.85rem;
      background-color: var(--bg-primary);
      border-bottom: 1px solid var(--border-subtle);
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .dialect-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--accent-sky);
      background-color: var(--accent-primary-subtle);
      padding: 0.2rem 0.5rem;
      border-radius: var(--radius-sm);
    }

    .shortcut-tip {
      font-size: 0.75rem;
      color: var(--text-muted);

      kbd {
        background-color: var(--bg-secondary);
        border: 1px solid var(--border-medium);
        padding: 0.1rem 0.3rem;
        border-radius: 3px;
        font-family: var(--font-mono);
      }
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .editor-container {
      flex: 1;
      height: 100%;
      min-height: 240px;
      overflow: auto;
    }
  `]
})
export class SqlEditorComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('editorHost', { static: true }) editorHost!: ElementRef<HTMLDivElement>;

  @Input() initialCode: string = '-- Write your PostgreSQL query here\n';
  @Input() isRunning: boolean = false;

  @Output() codeChange = new EventEmitter<string>();
  @Output() runRequested = new EventEmitter<string>();

  private themeService = inject(ThemeService);
  private editorView: EditorView | null = null;
  private themeCompartment = new Compartment();

  ngAfterViewInit(): void {
    this.initCodeMirror();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialCode'] && !changes['initialCode'].firstChange && this.editorView) {
      const current = this.editorView.state.doc.toString();
      if (current !== this.initialCode) {
        this.editorView.dispatch({
          changes: { from: 0, to: current.length, insert: this.initialCode }
        });
      }
    }
  }

  ngOnDestroy(): void {
    if (this.editorView) {
      this.editorView.destroy();
      this.editorView = null;
    }
  }

  private initCodeMirror(): void {
    const runKeymap = keymap.of([
      {
        key: 'Ctrl-Enter',
        mac: 'Cmd-Enter',
        run: () => {
          this.onRun();
          return true;
        }
      }
    ]);

    const isDark = this.themeService.currentTheme() === 'dark';

    const startState = EditorState.create({
      doc: this.initialCode,
      extensions: [
        basicSetup,
        sql({ dialect: PostgreSQL }),
        runKeymap,
        this.themeCompartment.of(isDark ? oneDark : []),
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            this.codeChange.emit(update.state.doc.toString());
          }
        }),
        EditorView.theme({
          '&': { height: '100%', fontSize: '14px' },
          '.cm-scroller': { overflow: 'auto', fontFamily: 'var(--font-mono)' },
          '.cm-content': { padding: '12px 0' },
          '.cm-line': { padding: '0 16px' }
        })
      ]
    });

    this.editorView = new EditorView({
      state: startState,
      parent: this.editorHost.nativeElement
    });
  }

  getCode(): string {
    return this.editorView ? this.editorView.state.doc.toString() : this.initialCode;
  }

  resetCode(): void {
    if (this.editorView) {
      this.editorView.dispatch({
        changes: { from: 0, to: this.editorView.state.doc.length, insert: this.initialCode }
      });
      this.codeChange.emit(this.initialCode);
    }
  }

  onRun(): void {
    const code = this.getCode();
    this.runRequested.emit(code);
  }
}
