import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuestionDifficulty } from '../../../core/models/database.types';

@Component({
  selector: 'app-difficulty-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="badge" [ngClass]="'badge-' + (difficulty || 'medium')">
      {{ difficulty || 'medium' }}
    </span>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
  `]
})
export class DifficultyBadgeComponent {
  @Input() difficulty: QuestionDifficulty | string = 'medium';
}
