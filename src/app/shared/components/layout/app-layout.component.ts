import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { StreakBadgeComponent } from '../badges/streak-badge.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, StreakBadgeComponent],
  template: `
    <div class="app-layout">
      <header class="app-navbar">
        <div class="navbar-left">
          <button
            type="button"
            class="sidebar-toggle-btn"
            (click)="toggleSidebar()"
            [attr.aria-label]="isSidebarCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
            [title]="isSidebarCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          
          <a routerLink="/dashboard" class="brand-link">
            <div class="brand-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <ellipse cx="12" cy="5" rx="9" ry="3"/>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
              </svg>
            </div>
            <div class="brand-text">
              <span class="brand-title">SQL SQUAD</span>
              <span class="brand-tag">Daily Practice</span>
            </div>
          </a>
        </div>

        <div class="navbar-right">
          @if (auth.isAdmin()) {
            <span class="admin-indicator-pill">Admin</span>
          }

          @if (auth.currentUser()?.profile?.current_streak; as streak) {
            <app-streak-badge [streak]="streak"></app-streak-badge>
          }

          <button
            type="button"
            class="btn btn-icon btn-outline"
            (click)="theme.toggleTheme()"
            [title]="theme.currentTheme() === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'">
            @if (theme.currentTheme() === 'dark') {
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            } @else {
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            }
          </button>

          <div class="user-profile-badge" (click)="toggleUserMenu()">
            <div class="avatar-circle">
              {{ getUserInitials() }}
            </div>
            <span class="user-display-name">{{ auth.currentUser()?.username || 'Solver' }}</span>
          </div>

          @if (showUserMenu()) {
            <div class="user-dropdown-menu">
              <div class="dropdown-header">
                <strong>{{ auth.currentUser()?.profile?.full_name || auth.currentUser()?.username }}</strong>
                <small>{{ auth.currentUser()?.email }}</small>
              </div>
              <div class="dropdown-divider"></div>
              <a routerLink="/profile" (click)="showUserMenu.set(false)" class="dropdown-item">My Profile</a>
              <a routerLink="/settings" (click)="showUserMenu.set(false)" class="dropdown-item">Settings</a>
              @if (auth.isAdmin()) {
                <a routerLink="/admin" (click)="showUserMenu.set(false)" class="dropdown-item admin-link">Admin Dashboard</a>
              }
              <div class="dropdown-divider"></div>
              <button type="button" (click)="logout()" class="dropdown-item logout-item">Sign Out</button>
            </div>
          }
        </div>
      </header>

      <div class="app-body">
        @if (sidebarOpen()) {
          <div class="sidebar-backdrop" (click)="closeMobileSidebar()"></div>
        }
        <aside
          class="app-sidebar"
          [class.mobile-open]="sidebarOpen()"
          [class.desktop-collapsed]="isSidebarCollapsed()">
          <div class="sidebar-section">
            <span class="sidebar-heading">Practice</span>
            <nav class="sidebar-nav">
              <a routerLink="/dashboard" routerLinkActive="active" class="nav-link" (click)="closeMobileSidebar()">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                </svg>
                <span>Dashboard</span>
              </a>

              <a routerLink="/questions" routerLinkActive="active" class="nav-link" (click)="closeMobileSidebar()">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                </svg>
                <span>Questions Catalog</span>
              </a>

              <a routerLink="/leaderboard" routerLinkActive="active" class="nav-link" (click)="closeMobileSidebar()">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
                  <path d="M4 22h16"/>
                  <path d="M10 14.66V17c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-2.34"/>
                  <path d="M18 14.66V17c0 .55-.45 1-1 1h-2c-.55 0-1-.45-1-1v-2.34"/>
                  <path d="M14 9V4h-4v5"/>
                </svg>
                <span>Leaderboard</span>
              </a>

              <a routerLink="/profile" routerLinkActive="active" class="nav-link" (click)="closeMobileSidebar()">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span>My Profile</span>
              </a>
            </nav>
          </div>

          @if (auth.isAdmin()) {
            <div class="sidebar-section admin-section">
              <span class="sidebar-heading admin-tag">Admin Studio</span>
              <nav class="sidebar-nav">
                <a routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-link" (click)="closeMobileSidebar()">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                  </svg>
                  <span>Admin Hub</span>
                </a>

                <a routerLink="/admin/questions" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-link" (click)="closeMobileSidebar()">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                  <span>Question Hub</span>
                </a>

                <a routerLink="/admin/questions/new" routerLinkActive="active" class="nav-link" (click)="closeMobileSidebar()">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  <span>Create Question</span>
                </a>

                <a routerLink="/admin/users" routerLinkActive="active" class="nav-link" (click)="closeMobileSidebar()">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  <span>User Manager</span>
                </a>
              </nav>
            </div>
          }

          <div class="sidebar-footer">
            <a routerLink="/settings" class="nav-link" (click)="closeMobileSidebar()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
              <span>Settings</span>
            </a>
          </div>
        </aside>

        <main class="app-content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [`
    .app-layout {
      display: flex;
      flex-direction: column;
      height: 100vh;
      height: 100dvh;
      overflow: hidden;
      background-color: var(--bg-app);
    }

    .app-navbar {
      height: 60px;
      background-color: var(--bg-primary);
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      position: sticky;
      top: 0;
      z-index: 40;

      @media (max-width: 900px) {
        height: 52px;
        padding: 0 0.75rem;
      }
    }

    .navbar-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .sidebar-toggle-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      color: var(--text-primary);
      cursor: pointer;
      padding: 0.35rem 0.45rem;
      transition: background-color 150ms ease, border-color 150ms ease;

      &:hover {
        background-color: var(--bg-hover);
        border-color: var(--border-medium);
      }
    }

    .brand-link {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      text-decoration: none;
    }

    .brand-icon {
      width: 34px;
      height: 34px;
      border-radius: var(--radius-sm);
      background: linear-gradient(135deg, var(--accent-primary), var(--accent-sky));
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 6px rgba(2, 132, 199, 0.35);
    }

    .brand-text {
      display: flex;
      flex-direction: column;
    }

    .brand-title {
      font-size: 1.05rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--text-primary);
      line-height: 1.1;
    }

    .brand-tag {
      font-size: 0.65rem;
      font-weight: 600;
      color: var(--accent-sky);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .navbar-right {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      position: relative;
    }

    .admin-indicator-pill {
      font-size: 0.7rem;
      font-weight: 700;
      color: #ffffff;
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-full);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .user-profile-badge {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm);
      transition: background-color 150ms ease;

      &:hover {
        background-color: var(--bg-hover);
      }
    }

    .avatar-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent-sky), var(--accent-primary));
      color: #ffffff;
      font-weight: 700;
      font-size: 0.8rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .user-display-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary);

      @media (max-width: 600px) {
        display: none;
      }
    }

    .user-dropdown-menu {
      position: absolute;
      top: 100%;
      right: 0;
      margin-top: 0.5rem;
      width: 220px;
      background-color: var(--bg-primary);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      padding: 0.5rem;
      z-index: 50;

      .dropdown-header {
        padding: 0.5rem 0.75rem;
        display: flex;
        flex-direction: column;

        strong {
          color: var(--text-primary);
          font-size: 0.875rem;
        }

        small {
          color: var(--text-muted);
          font-size: 0.75rem;
        }
      }

      .dropdown-divider {
        height: 1px;
        background-color: var(--border-subtle);
        margin: 0.35rem 0;
      }

      .dropdown-item {
        display: block;
        width: 100%;
        text-align: left;
        background: transparent;
        border: none;
        padding: 0.5rem 0.75rem;
        font-size: 0.825rem;
        color: var(--text-primary);
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: background-color 120ms ease;

        &:hover {
          background-color: var(--bg-hover);
        }

        &.admin-link {
          color: #a78bfa;
          font-weight: 600;
        }

        &.logout-item {
          color: var(--accent-danger);
        }
      }
    }

    .sidebar-backdrop {
      display: none;
      @media (max-width: 900px) {
        display: block;
        position: fixed;
        inset: 0;
        top: 52px;
        background-color: rgba(0, 0, 0, 0.65);
        backdrop-filter: blur(2px);
        z-index: 25;
      }
    }

    .app-body {
      display: flex;
      flex: 1;
      height: calc(100vh - 60px);
      max-height: calc(100vh - 60px);
      overflow: hidden;

      @media (max-width: 900px) {
        height: calc(100dvh - 52px);
        max-height: calc(100dvh - 52px);
      }
    }

    .app-sidebar {
      width: 240px;
      background-color: var(--bg-primary);
      border-right: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 1.25rem 0.75rem;
      transition: width 200ms cubic-bezier(0.4, 0, 0.2, 1), padding 200ms ease, opacity 150ms ease;
      overflow-x: hidden;
      white-space: nowrap;

      &.desktop-collapsed {
        width: 0;
        padding: 0;
        border-right: none;
        opacity: 0;
        pointer-events: none;
      }

      @media (max-width: 900px) {
        position: fixed;
        top: 52px;
        bottom: 0;
        left: 0;
        z-index: 30;
        width: 250px;
        opacity: 1;
        pointer-events: auto;
        transform: translateX(-100%);
        transition: transform 250ms ease;

        &.desktop-collapsed {
          width: 250px;
          padding: 1.25rem 0.75rem;
          opacity: 1;
          pointer-events: auto;
        }

        &.mobile-open {
          transform: translateX(0);
          box-shadow: var(--shadow-lg);
        }
      }
    }

    .sidebar-section {
      margin-bottom: 1.5rem;

      &.admin-section {
        padding-top: 1rem;
        border-top: 1px solid var(--border-subtle);
      }
    }

    .sidebar-heading {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      padding: 0 0.75rem;
      margin-bottom: 0.5rem;
      display: block;

      &.admin-tag {
        color: #a78bfa;
      }
    }

    .sidebar-nav {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 0.75rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-secondary);
      border-radius: var(--radius-sm);
      text-decoration: none;
      transition: all 150ms ease;

      &:hover {
        color: var(--text-primary);
        background-color: var(--bg-hover);
      }

      &.active {
        color: #ffffff;
        background: linear-gradient(90deg, var(--accent-primary), var(--accent-sky));
        font-weight: 600;
      }
    }

    .sidebar-footer {
      border-top: 1px solid var(--border-subtle);
      padding-top: 0.75rem;
    }

    .app-content {
      flex: 1 1 0%;
      padding: 0.75rem 1rem;
      max-width: 1600px;
      width: 100%;
      margin: 0 auto;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;

      > * {
        flex: 1 1 0%;
        height: 100%;
        min-height: 0;
        width: 100%;
        display: flex;
        flex-direction: column;
      }

      @media (max-width: 900px) {
        padding: 0.35rem 0.5rem;
      }

      @media (max-width: 600px) {
        padding: 0.25rem 0.35rem;
      }
    }
  `]
})
export class AppLayoutComponent {
  auth = inject(AuthService);
  theme = inject(ThemeService);
  router = inject(Router);

  sidebarOpen = signal<boolean>(false);
  isSidebarCollapsed = signal<boolean>(
    typeof localStorage !== 'undefined' && localStorage.getItem('sql_squad_sidebar_collapsed') === 'true'
  );
  showUserMenu = signal<boolean>(false);

  toggleSidebar(): void {
    if (typeof window !== 'undefined' && window.innerWidth <= 900) {
      this.sidebarOpen.update(v => !v);
    } else {
      this.isSidebarCollapsed.update(v => {
        const next = !v;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('sql_squad_sidebar_collapsed', String(next));
        }
        return next;
      });
    }
  }

  closeMobileSidebar(): void {
    this.sidebarOpen.set(false);
  }

  toggleUserMenu(): void {
    this.showUserMenu.update(v => !v);
  }

  switchRole(role: 'admin' | 'user'): void {
    this.auth.switchRole(role);
    if (role === 'admin') {
      this.router.navigate(['/admin']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  logout(): void {
    this.showUserMenu.set(false);
    this.auth.logout();
  }

  getUserInitials(): string {
    const user = this.auth.currentUser();
    if (!user) return 'SQ';
    const name = user.profile?.full_name || user.username;
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }
}
