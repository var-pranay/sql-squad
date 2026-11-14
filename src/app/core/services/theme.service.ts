import { Injectable, signal, effect } from '@angular/core';

export type AppTheme = 'dark' | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'sql_squad_theme';
  
  readonly currentTheme = signal<AppTheme>('dark');

  constructor() {
    this.initTheme();
    
    effect(() => {
      const theme = this.currentTheme();
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(this.THEME_KEY, theme);
      }
    });
  }

  private initTheme(): void {
    if (typeof window === 'undefined') return;

    const saved = localStorage.getItem(this.THEME_KEY) as AppTheme | null;
    if (saved === 'dark' || saved === 'light') {
      this.currentTheme.set(saved);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.currentTheme.set(prefersDark ? 'dark' : 'light');
    }
  }

  toggleTheme(): void {
    this.currentTheme.update(current => (current === 'dark' ? 'light' : 'dark'));
  }

  setTheme(theme: AppTheme): void {
    this.currentTheme.set(theme);
  }
}
