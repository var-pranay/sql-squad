import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-streak-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="badge badge-streak" [title]="streak + ' day consecutive solving streak'">
      <svg class="flame-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2c-.67 0-1.31.28-1.77.78L4.2 9.47a9 9 0 0 0 12.72 12.72 9 9 0 0 0 .76-13.43l-3.9-6a2.32 2.32 0 0 0-1.78-.76zm0 4.15l2.76 4.25a6 6 0 0 1-.5 7.6 6 6 0 0 1-8.48-8.48l6.22-3.37z"/>
      </svg>
      {{ streak }} {{ streak === 1 ? 'day' : 'days' }}
    </span>
  `,
  styles: [`
    .flame-icon {
      animation: flicker 1.8s ease-in-out infinite alternate;
    }

    @keyframes flicker {
      0% { transform: scale(1) rotate(-2deg); opacity: 0.9; }
      100% { transform: scale(1.15) rotate(2deg); opacity: 1; }
    }
  `]
})
export class StreakBadgeComponent {
  @Input() streak: number = 0;
}
