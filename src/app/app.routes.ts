import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './core/guards/auth.guard';
import { AppLayoutComponent } from './shared/components/layout/app-layout.component';

export const routes: Routes = [
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register.component').then(m => m.RegisterComponent)
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/forgot-password/forgot-password.component').then(
            m => m.ForgotPasswordComponent
          )
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./features/auth/reset-password/reset-password.component').then(
            m => m.ResetPasswordComponent
          )
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full'
      }
    ]
  },

  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/user-dashboard.component').then(
            m => m.UserDashboardComponent
          )
      },
      {
        path: 'questions',
        loadComponent: () =>
          import('./features/questions/questions-list.component').then(
            m => m.QuestionsListComponent
          )
      },
      {
        path: 'questions/:slug',
        loadComponent: () =>
          import('./features/questions/question-workspace.component').then(
            m => m.QuestionWorkspaceComponent
          )
      },
      {
        path: 'leaderboard',
        loadComponent: () =>
          import('./features/leaderboard/leaderboard.component').then(
            m => m.LeaderboardComponent
          )
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/user-profile.component').then(
            m => m.UserProfileComponent
          )
      },
      {
        path: 'profile/:username',
        loadComponent: () =>
          import('./features/profile/user-profile.component').then(
            m => m.UserProfileComponent
          )
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then(
            m => m.SettingsComponent
          )
      },

      {
        path: 'admin',
        canActivate: [adminGuard],
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/admin/admin-dashboard.component').then(
                m => m.AdminDashboardComponent
              )
          },
          {
            path: 'questions',
            loadComponent: () =>
              import('./features/admin/admin-questions.component').then(
                m => m.AdminQuestionsComponent
              )
          },
          {
            path: 'questions/new',
            loadComponent: () =>
              import('./features/admin/question-editor.component').then(
                m => m.QuestionEditorComponent
              )
          },
          {
            path: 'questions/:id/edit',
            loadComponent: () =>
              import('./features/admin/question-editor.component').then(
                m => m.QuestionEditorComponent
              )
          },
          {
            path: 'users',
            loadComponent: () =>
              import('./features/admin/admin-users.component').then(
                m => m.AdminUsersComponent
              )
          }
        ]
      }
    ]
  },

  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
