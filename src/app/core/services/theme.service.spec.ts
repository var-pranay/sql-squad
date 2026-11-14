import { TestBed } from '@angular/core';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  it('should be created and default to dark theme', () => {
    expect(service).toBeTruthy();
    expect(service.currentTheme()).toBe('dark');
  });

  it('should toggle theme from dark to light and back', () => {
    service.toggleTheme();
    expect(service.currentTheme()).toBe('light');

    service.toggleTheme();
    expect(service.currentTheme()).toBe('dark');
  });

  it('should explicitly set theme', () => {
    service.setTheme('light');
    expect(service.currentTheme()).toBe('light');
  });
});
