import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-metric-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="card metric-card" [class.highlight]="highlight">
      <div class="metric-top">
        <span class="metric-label">{{ title }}</span>
        @if (icon) {
          <div class="metric-icon" [ngClass]="iconColor">
            <ng-content select="[icon]"></ng-content>
          </div>
        }
      </div>
      <div class="metric-value-row">
        <span class="metric-value">{{ value }}</span>
        @if (subtext) {
          <span class="metric-subtext">{{ subtext }}</span>
        }
      </div>
      @if (progress !== undefined) {
        <div class="progress-bar-track">
          <div class="progress-bar-fill" [style.width.%]="progress"></div>
        </div>
      }
    </div>
  `,
  styles: [`
    .metric-card {
      padding: 1.25rem;
      position: relative;
      background: var(--bg-primary);
      border: 1px solid var(--border-subtle);
      transition: transform 150ms ease, box-shadow 150ms ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
      }

      &.highlight {
        border-color: rgba(56, 189, 248, 0.4);
        background: linear-gradient(180deg, var(--bg-primary), rgba(56, 189, 248, 0.05));
      }
    }

    .metric-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .metric-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .metric-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      background-color: var(--bg-tertiary);
      color: var(--accent-sky);

      &.emerald {
        color: var(--accent-success);
        background-color: var(--accent-success-subtle);
      }

      &.amber {
        color: var(--accent-warning);
        background-color: var(--accent-warning-subtle);
      }

      &.orange {
        color: var(--accent-streak);
        background-color: var(--accent-streak-subtle);
      }
    }

    .metric-value-row {
      display: flex;
      align-items: baseline;
      gap: 0.5rem;
    }

    .metric-value {
      font-size: 1.75rem;
      font-weight: 800;
      color: var(--text-primary);
      font-family: var(--font-sans);
    }

    .metric-subtext {
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .progress-bar-track {
      width: 100%;
      height: 4px;
      background-color: var(--bg-tertiary);
      border-radius: 2px;
      margin-top: 0.75rem;
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--accent-primary), var(--accent-sky));
      border-radius: 2px;
      transition: width 300ms ease;
    }
  `]
})
export class MetricCardComponent {
  @Input() title: string = '';
  @Input() value: string | number = '';
  @Input() subtext?: string;
  @Input() icon?: boolean = true;
  @Input() iconColor?: string = '';
  @Input() highlight?: boolean = false;
  @Input() progress?: number;
}
