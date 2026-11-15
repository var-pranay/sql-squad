import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import {
  Question,
  Topic,
  Submission,
  UserQuestionProgress,
  LeaderboardScore,
  UserProfile,
  SubmissionStatus,
  AppRole
} from '../models/database.types';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  private supabase = inject(SupabaseService);

  private readonly STORAGE_QUESTIONS_KEY = 'sql_squad_questions';
  private readonly STORAGE_TOPICS_KEY = 'sql_squad_topics';
  private readonly STORAGE_SUBMISSIONS_KEY = 'sql_squad_submissions';
  private readonly STORAGE_PROGRESS_KEY = 'sql_squad_progress';
  private readonly STORAGE_LEADERBOARD_KEY = 'sql_squad_leaderboard';

  constructor() {
    this.seedDemoDataIfEmpty();
  }

  async getTopics(): Promise<Topic[]> {
    if (!this.supabase.isDemoMode && this.supabase.clientInstance) {
      const { data, error } = await this.supabase.clientInstance
        .from('topics')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data || [];
    }
    return this.getLocal<Topic[]>(this.STORAGE_TOPICS_KEY, []);
  }

  async getQuestions(options?: {
    difficulty?: string;
    topicSlug?: string;
    status?: string;
    searchQuery?: string;
  }): Promise<Question[]> {
    let questions: Question[] = [];

    if (!this.supabase.isDemoMode && this.supabase.clientInstance) {
      let query = this.supabase.clientInstance
        .from('questions')
        .select(`
          *,
          topic:topics(*),
          dataset:question_datasets(*),
          test_cases:question_test_cases(*)
        `);

      if (options?.difficulty && options.difficulty !== 'all') {
        query = query.eq('difficulty', options.difficulty);
      }
      if (options?.status && options.status !== 'all') {
        query = query.eq('status', options.status);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      const remoteQuestions = (data || []).map(q => this.normalizeQuestion(q));

      // Also merge any questions created/edited locally in Question Studio
      const localQuestions = this.getLocal<Question[]>(this.STORAGE_QUESTIONS_KEY, []);
      const remoteSlugs = new Set(remoteQuestions.map(q => q.slug));
      const remoteIds = new Set(remoteQuestions.map(q => q.id));
      const customLocal = localQuestions.filter(
        lq => !remoteSlugs.has(lq.slug) && !remoteIds.has(lq.id)
      );

      questions = [...customLocal, ...remoteQuestions];
    } else {
      questions = this.getLocal<Question[]>(this.STORAGE_QUESTIONS_KEY, []);
    }

    if (options?.searchQuery) {
      const q = options.searchQuery.toLowerCase();
      questions = questions.filter(
        item =>
          item.title.toLowerCase().includes(q) ||
          item.description_markdown.toLowerCase().includes(q) ||
          item.slug.toLowerCase().includes(q)
      );
    }

    if (options?.topicSlug && options.topicSlug !== 'all') {
      questions = questions.filter(
        item => item.topic?.slug === options.topicSlug || item.topic_id === options.topicSlug
      );
    }

    if (options?.difficulty && options.difficulty !== 'all') {
      questions = questions.filter(item => item.difficulty === options.difficulty);
    }

    return questions;
  }

  async getQuestionBySlug(slug: string): Promise<Question | null> {
    if (!this.supabase.isDemoMode && this.supabase.clientInstance) {
      const { data, error } = await this.supabase.clientInstance
        .from('questions')
        .select(`
          *,
          topic:topics(*),
          dataset:question_datasets(*),
          test_cases:question_test_cases(*)
        `)
        .eq('slug', slug)
        .single();
      if (!error && data) {
        return this.normalizeQuestion(data);
      }
    }

    const all = this.getLocal<Question[]>(this.STORAGE_QUESTIONS_KEY, []);
    return all.find(q => q.slug === slug) || null;
  }

  private normalizeQuestion(q: any): Question {
    if (!q) return q;
    return {
      ...q,
      dataset: Array.isArray(q.dataset) ? q.dataset[0] : q.dataset,
      test_cases: q.test_cases || []
    };
  }

  async getQuestionById(id: string): Promise<Question | null> {
    const all = await this.getQuestions();
    return all.find(q => q.id === id) || null;
  }

  async getTodayDailyQuestion(): Promise<Question | null> {
    const questions = await this.getQuestions({ status: 'published' });
    if (questions.length === 0) return null;
    return questions[0];
  }

  async saveQuestion(questionData: Partial<Question>): Promise<Question> {
    const questions = this.getLocal<Question[]>(this.STORAGE_QUESTIONS_KEY, []);

    if (questionData.id) {
      const index = questions.findIndex(q => q.id === questionData.id);
      if (index !== -1) {
        const updated = {
          ...questions[index],
          ...questionData,
          updated_at: new Date().toISOString()
        } as Question;
        questions[index] = updated;
        this.setLocal(this.STORAGE_QUESTIONS_KEY, questions);
        return updated;
      }
    }

    const newQuestion: Question = {
      id: questionData.id || `q_${Date.now()}`,
      slug:
        questionData.slug ||
        questionData.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') ||
        `q-${Date.now()}`,
      title: questionData.title || 'Untitled Question',
      difficulty: questionData.difficulty || 'medium',
      topic_id: questionData.topic_id || null,
      topic: questionData.topic,
      description_markdown: questionData.description_markdown || '',
      hint_markdown: questionData.hint_markdown || null,
      explanation_markdown: questionData.explanation_markdown || null,
      status: questionData.status || 'published',
      author_id: questionData.author_id || null,
      points: questionData.points || 10,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      dataset: questionData.dataset || {
        id: `ds_${Date.now()}`,
        question_id: questionData.id || `q_${Date.now()}`,
        schema_ddl: '',
        seed_data_sql: '',
        dialect: 'postgresql'
      },
      test_cases: questionData.test_cases || []
    };

    questions.unshift(newQuestion);
    this.setLocal(this.STORAGE_QUESTIONS_KEY, questions);
    return newQuestion;
  }

  async deleteQuestion(id: string): Promise<void> {
    const questions = this.getLocal<Question[]>(this.STORAGE_QUESTIONS_KEY, []);
    const filtered = questions.filter(q => q.id !== id);
    this.setLocal(this.STORAGE_QUESTIONS_KEY, filtered);
  }

  async recordSubmission(
    userId: string,
    questionId: string,
    querySql: string,
    status: SubmissionStatus,
    executionTimeMs: number,
    passedTestCases: number,
    totalTestCases: number,
    errorMessage: string | null = null
  ): Promise<Submission> {
    const isCryptoUuidAvailable = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function';
    const submissionId = isCryptoUuidAvailable
      ? crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });

    const now = new Date().toISOString();

    const submission: Submission = {
      id: submissionId,
      user_id: userId,
      question_id: questionId,
      query_sql: querySql,
      status,
      execution_time_ms: executionTimeMs,
      error_message: errorMessage,
      passed_test_cases: passedTestCases,
      total_test_cases: totalTestCases,
      submitted_at: now
    };

    // 1. Update local storage with unique submission
    const submissions = this.getLocal<Submission[]>(this.STORAGE_SUBMISSIONS_KEY, []);
    submissions.unshift(submission);
    this.setLocal(this.STORAGE_SUBMISSIONS_KEY, submissions);

    if (status === 'accepted') {
      this.updateProgressAndStreak(userId, questionId, executionTimeMs);
    }

    // 2. Persist to Supabase if connected
    if (!this.supabase.isDemoMode && this.supabase.clientInstance && userId) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(questionId);

        if (isUuid) {
          // Insert submission record into Supabase with identical UUID
          const { data: inserted, error: subError } = await this.supabase.clientInstance
            .from('submissions')
            .insert({
              id: submissionId,
              user_id: userId,
              question_id: questionId,
              query_sql: querySql,
              status,
              execution_time_ms: Math.round(executionTimeMs),
              error_message: errorMessage,
              passed_test_cases: passedTestCases,
              total_test_cases: totalTestCases,
              submitted_at: now
            })
            .select()
            .single();

          if (inserted?.id) {
            submission.id = inserted.id;
          }
          if (subError) {
            console.warn('Supabase submission insert error:', subError);
          }

          // If accepted, update user_question_progress and leaderboard_scores
          if (status === 'accepted') {
            // Check if this question was ALREADY solved previously by this user!
            const { data: existingProg } = await this.supabase.clientInstance
              .from('user_question_progress')
              .select('status, attempt_count, best_execution_time_ms, first_solved_at')
              .eq('user_id', userId)
              .eq('question_id', questionId)
              .maybeSingle();

            const wasAlreadySolved = existingProg?.status === 'solved';

            // Upsert progress with correct attempt count
            await this.supabase.clientInstance
              .from('user_question_progress')
              .upsert({
                user_id: userId,
                question_id: questionId,
                status: 'solved',
                attempt_count: (existingProg?.attempt_count || 0) + 1,
                best_execution_time_ms: Math.min(
                  existingProg?.best_execution_time_ms || Infinity,
                  Math.round(executionTimeMs)
                ),
                first_solved_at: existingProg?.first_solved_at || now,
                last_attempted_at: now
              }, { onConflict: 'user_id,question_id' });

            // ONLY award points, total_solved, and difficulty breakdown if NOT already solved!
            if (!wasAlreadySolved) {
              const { data: qData } = await this.supabase.clientInstance
                .from('questions')
                .select('difficulty, points')
                .eq('id', questionId)
                .maybeSingle();

              const qDiff = qData?.difficulty || 'medium';
              const qPoints = qData?.points || 10;

              // Fetch current leaderboard score
              const { data: lbScore } = await this.supabase.clientInstance
                .from('leaderboard_scores')
                .select('*')
                .eq('user_id', userId)
                .maybeSingle();

              const isEasy = qDiff === 'easy' ? 1 : 0;
              const isMed = qDiff === 'medium' ? 1 : 0;
              const isHard = qDiff === 'hard' ? 1 : 0;

              const newTotalSolved = (lbScore?.total_solved || 0) + 1;
              const newTotalPoints = (lbScore?.total_points || 0) + qPoints;
              const newEasy = (lbScore?.easy_solved || 0) + isEasy;
              const newMed = (lbScore?.medium_solved || 0) + isMed;
              const newHard = (lbScore?.hard_solved || 0) + isHard;
              const newStreak = Math.max((lbScore?.current_streak || 0), 1);

              await this.supabase.clientInstance
                .from('leaderboard_scores')
                .upsert({
                  user_id: userId,
                  total_solved: newTotalSolved,
                  easy_solved: newEasy,
                  medium_solved: newMed,
                  hard_solved: newHard,
                  total_points: newTotalPoints,
                  current_streak: newStreak,
                  updated_at: now
                }, { onConflict: 'user_id' });
            }

            // Update streak & last_active_date in profiles
            await this.supabase.clientInstance
              .from('profiles')
              .update({
                last_active_date: now.split('T')[0],
                updated_at: now
              })
              .eq('id', userId);
          }
        }
      } catch (remoteErr) {
        console.warn('Remote sync error in recordSubmission:', remoteErr);
      }
    }

    return submission;
  }

  async getUserSubmissions(userId: string, questionId?: string): Promise<Submission[]> {
    const localAll = this.getLocal<Submission[]>(this.STORAGE_SUBMISSIONS_KEY, []);
    const localFiltered = localAll.filter(
      s => s.user_id === userId && (!questionId || s.question_id === questionId)
    );

    if (!this.supabase.isDemoMode && this.supabase.clientInstance && userId) {
      try {
        let q = this.supabase.clientInstance
          .from('submissions')
          .select('*')
          .eq('user_id', userId)
          .order('submitted_at', { ascending: false });
        if (questionId) {
          q = q.eq('question_id', questionId);
        }
        const { data, error } = await q;
        if (!error && data) {
          // Strictly deduplicate: Filter out local copies that match remote ID or identical query within 15 seconds
          const remoteIds = new Set(data.map((s: any) => s.id));
          const uniqueLocal = localFiltered.filter(ls => {
            if (remoteIds.has(ls.id)) return false;
            const duplicateInRemote = data.some((rs: any) =>
              rs.question_id === ls.question_id &&
              rs.query_sql?.trim() === ls.query_sql?.trim() &&
              Math.abs(new Date(rs.submitted_at).getTime() - new Date(ls.submitted_at).getTime()) < 15000
            );
            return !duplicateInRemote;
          });

          const merged = [...data, ...uniqueLocal];
          return merged.sort(
            (a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
          );
        }
      } catch (err) {
        console.warn('Error fetching submissions from Supabase:', err);
      }
    }
    return localFiltered;
  }

  async getAdminMetrics(): Promise<{
    totalUsers: number;
    totalQuestions: number;
    publishedQuestions: number;
    draftQuestions: number;
    totalSubmissions: number;
    passRate: string;
    recentSubmissions: Submission[];
  }> {
    let totalUsers = 1;
    const questions = await this.getQuestions();
    const publishedQuestions = questions.filter(q => q.status === 'published').length;
    const draftQuestions = questions.filter(q => q.status === 'draft').length;
    let totalSubmissions = 0;
    let passRate = '0%';
    let recentSubmissions: Submission[] = [];

    if (!this.supabase.isDemoMode && this.supabase.clientInstance) {
      try {
        const { count: userCount } = await this.supabase.clientInstance
          .from('profiles')
          .select('*', { count: 'exact', head: true });
        if (userCount !== null && userCount !== undefined && userCount > 0) {
          totalUsers = userCount;
        }

        const { data: subData, count: subCount } = await this.supabase.clientInstance
          .from('submissions')
          .select('*', { count: 'exact' })
          .order('submitted_at', { ascending: false })
          .limit(10);

        if (subCount !== null && subCount !== undefined) {
          totalSubmissions = subCount;
        } else if (subData) {
          totalSubmissions = subData.length;
        }

        if (subData && subData.length > 0) {
          recentSubmissions = subData;
          const accepted = subData.filter(s => s.status === 'accepted').length;
          passRate = `${Math.round((accepted / subData.length) * 100)}%`;
        }
      } catch (err) {
        console.warn('Supabase admin metrics error:', err);
      }
    }

    if (totalSubmissions === 0) {
      const localSubs = this.getLocal<Submission[]>(this.STORAGE_SUBMISSIONS_KEY, []);
      if (localSubs.length > 0) {
        totalSubmissions = localSubs.length;
        recentSubmissions = localSubs.slice(0, 10);
        const accepted = localSubs.filter(s => s.status === 'accepted').length;
        passRate = `${Math.round((accepted / localSubs.length) * 100)}%`;
      }
    }

    return {
      totalUsers,
      totalQuestions: questions.length,
      publishedQuestions,
      draftQuestions,
      totalSubmissions,
      passRate: totalSubmissions > 0 ? passRate : '100%',
      recentSubmissions
    };
  }

  async getAdminUsers(): Promise<any[]> {
    if (!this.supabase.isDemoMode && this.supabase.clientInstance) {
      try {
        const [profilesRes, rolesRes] = await Promise.all([
          this.supabase.clientInstance
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false }),
          this.supabase.clientInstance
            .from('user_roles')
            .select('*')
        ]);

        const roleMap = new Map<string, string>();
        if (rolesRes.data) {
          for (const r of rolesRes.data) {
            roleMap.set(r.user_id, r.role);
          }
        }

        const profiles = profilesRes.data || [];
        if (profiles.length > 0) {
          return profiles.map((u: any) => ({
            id: u.id,
            username: u.username || 'user',
            email: u.username?.includes('@') ? u.username : `${u.username}@sqlsquad.dev`,
            role: (roleMap.get(u.id) || 'user') as AppRole,
            current_streak: u.current_streak || 0,
            total_solved: 0,
            created_at: u.created_at
              ? new Date(u.created_at).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })
              : 'Recently'
          }));
        }
      } catch (err) {
        console.warn('Error fetching admin users from Supabase:', err);
      }
    }
    return [];
  }

  async updateUserRole(userId: string, role: AppRole): Promise<boolean> {
    if (!this.supabase.isDemoMode && this.supabase.clientInstance) {
      try {
        const { error } = await this.supabase.clientInstance
          .from('user_roles')
          .upsert({ user_id: userId, role }, { onConflict: 'user_id' });
        return !error;
      } catch (err) {
        console.warn('Update user role error:', err);
      }
    }
    return false;
  }

  async getUserProgress(userId: string): Promise<UserQuestionProgress[]> {
    const localProgress = this.getLocal<UserQuestionProgress[]>(this.STORAGE_PROGRESS_KEY, []).filter(
      p => p.user_id === userId
    );

    if (!this.supabase.isDemoMode && this.supabase.clientInstance && userId) {
      try {
        const { data, error } = await this.supabase.clientInstance
          .from('user_question_progress')
          .select('*')
          .eq('user_id', userId);

        if (!error && data) {
          const remoteQuestionIds = new Set(data.map((p: any) => p.question_id));
          const merged = [
            ...data,
            ...localProgress.filter(lp => !remoteQuestionIds.has(lp.question_id))
          ];
          return merged;
        }
      } catch (err) {
        console.warn('Error fetching user progress from Supabase:', err);
      }
    }

    return localProgress;
  }

  private updateProgressAndStreak(
    userId: string,
    questionId: string,
    executionTimeMs: number
  ): void {
    const progressList = this.getLocal<UserQuestionProgress[]>(this.STORAGE_PROGRESS_KEY, []);
    const existingIndex = progressList.findIndex(
      p => p.user_id === userId && p.question_id === questionId
    );

    const now = new Date().toISOString();

    if (existingIndex !== -1) {
      progressList[existingIndex].status = 'solved';
      progressList[existingIndex].attempt_count += 1;
      progressList[existingIndex].last_attempted_at = now;
      if (
        !progressList[existingIndex].best_execution_time_ms ||
        executionTimeMs < progressList[existingIndex].best_execution_time_ms!
      ) {
        progressList[existingIndex].best_execution_time_ms = executionTimeMs;
      }
    } else {
      progressList.push({
        id: `prog_${Date.now()}`,
        user_id: userId,
        question_id: questionId,
        status: 'solved',
        attempt_count: 1,
        best_execution_time_ms: executionTimeMs,
        first_solved_at: now,
        last_attempted_at: now
      });
    }

    this.setLocal(this.STORAGE_PROGRESS_KEY, progressList);
  }

  async getLeaderboard(): Promise<LeaderboardScore[]> {
    if (!this.supabase.isDemoMode && this.supabase.clientInstance) {
      try {
        const [scoresRes, profilesRes, progressRes, questionsRes] = await Promise.all([
          this.supabase.clientInstance
            .from('leaderboard_scores')
            .select('*'),
          this.supabase.clientInstance
            .from('profiles')
            .select('*'),
          this.supabase.clientInstance
            .from('user_question_progress')
            .select('*')
            .eq('status', 'solved'),
          this.supabase.clientInstance
            .from('questions')
            .select('id, difficulty, points')
        ]);

        const profileMap = new Map((profilesRes.data || []).map((p: any) => [p.id, p]));
        const questionsMap = new Map((questionsRes.data || []).map((q: any) => [q.id, q]));
        const scoresMap = new Map((scoresRes.data || []).map((s: any) => [s.user_id, s]));

        // Calculate actual solved stats per user from user_question_progress for bulletproof accuracy
        const userProgressStats = new Map<string, { total: number; easy: number; medium: number; hard: number; points: number }>();
        for (const prog of (progressRes.data || [])) {
          const stats = userProgressStats.get(prog.user_id) || { total: 0, easy: 0, medium: 0, hard: 0, points: 0 };
          stats.total += 1;
          const q = questionsMap.get(prog.question_id);
          const diff = q?.difficulty || 'medium';
          if (diff === 'easy') stats.easy += 1;
          else if (diff === 'hard') stats.hard += 1;
          else stats.medium += 1;
          stats.points += (q?.points || 10);
          userProgressStats.set(prog.user_id, stats);
        }

        const profiles = profilesRes.data || [];
        const result: LeaderboardScore[] = profiles.map((p: any) => {
          const scoreRow = scoresMap.get(p.id);
          const computedStats = userProgressStats.get(p.id) || { total: 0, easy: 0, medium: 0, hard: 0, points: 0 };

          // Use computed distinct progress stats as ground truth so repeat submissions on same question never inflate XP
          const totalSolved = computedStats.total > 0 ? computedStats.total : (scoreRow?.total_solved || 0);
          const totalPoints = computedStats.total > 0 ? computedStats.points : (scoreRow?.total_points || 0);
          const easySolved = computedStats.total > 0 ? computedStats.easy : (scoreRow?.easy_solved || 0);
          const mediumSolved = computedStats.total > 0 ? computedStats.medium : (scoreRow?.medium_solved || 0);
          const hardSolved = computedStats.total > 0 ? computedStats.hard : (scoreRow?.hard_solved || 0);
          const streak = Math.max(scoreRow?.current_streak || 0, p.current_streak || 0);

          return {
            id: scoreRow?.id || `lb_${p.id}`,
            user_id: p.id,
            total_solved: totalSolved,
            easy_solved: easySolved,
            medium_solved: mediumSolved,
            hard_solved: hardSolved,
            total_points: totalPoints,
            current_streak: streak,
            rank_position: 1,
            updated_at: scoreRow?.updated_at || p.updated_at || new Date().toISOString(),
            profile: p
          };
        });

        // Sort by total_points DESC, then total_solved DESC, then current_streak DESC
        result.sort((a, b) => {
          if (b.total_points !== a.total_points) return b.total_points - a.total_points;
          if (b.total_solved !== a.total_solved) return b.total_solved - a.total_solved;
          return (b.current_streak || 0) - (a.current_streak || 0);
        });

        // Assign ranks
        result.forEach((item, idx) => {
          item.rank_position = idx + 1;
        });

        return result;
      } catch (err) {
        console.warn('Error fetching leaderboard from Supabase:', err);
      }
    }

    return [];
  }

  private getLocal<T>(key: string, defaultValue: T): T {
    if (typeof localStorage === 'undefined') return defaultValue;
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return defaultValue;
    }
  }

  private setLocal<T>(key: string, value: T): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  }

  private seedDemoDataIfEmpty(): void {
    if (typeof localStorage === 'undefined') return;

    if (!localStorage.getItem(this.STORAGE_TOPICS_KEY)) {
      const defaultTopics: Topic[] = [
        {
          id: 'top-joins',
          slug: 'joins',
          title: 'Joins & Relations',
          description: 'INNER, LEFT, RIGHT, FULL OUTER and CROSS JOIN operations.',
          icon_name: 'git-merge',
          sort_order: 1
        },
        {
          id: 'top-aggregations',
          slug: 'aggregations',
          title: 'Aggregations & Grouping',
          description: 'COUNT, SUM, AVG, GROUP BY, and HAVING filters.',
          icon_name: 'bar-chart-2',
          sort_order: 2
        },
        {
          id: 'top-window',
          slug: 'window-functions',
          title: 'Window & Analytic Functions',
          description: 'ROW_NUMBER, RANK, DENSE_RANK, LAG, LEAD, and running totals.',
          icon_name: 'trending-up',
          sort_order: 3
        },
        {
          id: 'top-ctes',
          slug: 'subqueries-ctes',
          title: 'CTEs & Subqueries',
          description: 'Common Table Expressions and correlated subqueries.',
          icon_name: 'layers',
          sort_order: 4
        }
      ];
      this.setLocal(this.STORAGE_TOPICS_KEY, defaultTopics);
    }

    if (!localStorage.getItem(this.STORAGE_QUESTIONS_KEY)) {
      const defaultQuestions: Question[] = [
        {
          id: 'q-high-value-customers',
          slug: 'high-value-customer-orders',
          title: 'High-Value Customer Orders',
          difficulty: 'easy',
          topic_id: 'top-aggregations',
          topic: {
            id: 'top-aggregations',
            slug: 'aggregations',
            title: 'Aggregations & Grouping',
            description: '',
            icon_name: 'bar-chart-2',
            sort_order: 2
          },
          description_markdown: `### Problem Description

The Sales Director wants a summary of our top VIP customers. 

Write a SQL query to find all customers who have spent a **cumulative total of more than $500** across all their orders.

#### Output Schema:
- \`customer_name\` (VARCHAR) — Customer's full name
- \`total_spend\` (NUMERIC) — Total sum of their orders, rounded to 2 decimal places

Order your output by \`total_spend\` in **descending order**. If two customers have the same total spend, order by \`customer_name\` in **alphabetical order**.`,
          hint_markdown:
            'Use `INNER JOIN` to connect `customers` with `orders`, group by `customer_id` and `customer_name`, and filter using the `HAVING` clause.',
          explanation_markdown:
            'We join `customers` and `orders` on `customer_id`, sum `total_amount`, and filter out customers whose sum does not exceed 500 using `HAVING SUM(orders.total_amount) > 500`.',
          status: 'published',
          author_id: 'admin-1',
          points: 10,
          created_at: '2026-03-01T10:00:00Z',
          updated_at: '2026-03-01T10:00:00Z',
          dataset: {
            id: 'ds-1',
            question_id: 'q-high-value-customers',
            schema_ddl: `CREATE TABLE customers (
  customer_id INT PRIMARY KEY,
  customer_name VARCHAR(100),
  country VARCHAR(50)
);

CREATE TABLE orders (
  order_id INT PRIMARY KEY,
  customer_id INT REFERENCES customers(customer_id),
  order_date DATE,
  total_amount NUMERIC(10, 2)
);`,
            seed_data_sql: `INSERT INTO customers VALUES 
(1, 'Alice Smith', 'USA'),
(2, 'Bob Jones', 'UK'),
(3, 'Carlos Santana', 'Mexico'),
(4, 'Diana Prince', 'Canada'),
(5, 'Evan Wright', 'USA');

INSERT INTO orders VALUES
(101, 1, '2026-01-10', 350.00),
(102, 1, '2026-01-15', 220.50),
(103, 2, '2026-01-12', 150.00),
(104, 3, '2026-01-18', 720.00),
(105, 4, '2026-01-20', 490.00),
(106, 5, '2026-01-22', 610.25);`,
            dialect: 'postgresql'
          },
          test_cases: [
            {
              id: 'tc-1',
              question_id: 'q-high-value-customers',
              test_name: 'Standard Customer Spend Aggregation',
              expected_query: `SELECT c.customer_name, ROUND(SUM(o.total_amount), 2) AS total_spend
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.customer_name
HAVING SUM(o.total_amount) > 500
ORDER BY total_spend DESC, c.customer_name ASC;`,
              is_hidden: false,
              sort_order: 1
            }
          ]
        },
        {
          id: 'q-second-highest-salary',
          slug: 'second-highest-earner-department',
          title: 'Second Highest Earner per Department',
          difficulty: 'medium',
          topic_id: 'top-window',
          topic: {
            id: 'top-window',
            slug: 'window-functions',
            title: 'Window & Analytic Functions',
            description: '',
            icon_name: 'trending-up',
            sort_order: 3
          },
          description_markdown: `### Problem Description

Write a SQL query to identify the employee who earns the **second highest salary** in each department. If multiple employees in the department share the second highest salary, return all of them.

If a department has fewer than 2 distinct salary tiers, that department should not appear in the result.

#### Output Schema:
- \`department_name\` (VARCHAR)
- \`employee_name\` (VARCHAR)
- \`salary\` (NUMERIC)

Order results by \`department_name\` ascending, then \`employee_name\` ascending.`,
          hint_markdown:
            'Use `DENSE_RANK()` partitioned by `department_id` ordered by `salary DESC` inside a CTE or subquery, then filter for rank = 2.',
          explanation_markdown:
            'Using `DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC)` ensures ties receive the same rank without skipping ranks.',
          status: 'published',
          author_id: 'admin-1',
          points: 20,
          created_at: '2026-03-02T10:00:00Z',
          updated_at: '2026-03-02T10:00:00Z',
          dataset: {
            id: 'ds-2',
            question_id: 'q-second-highest-salary',
            schema_ddl: `CREATE TABLE departments (
  dept_id INT PRIMARY KEY,
  department_name VARCHAR(100)
);

CREATE TABLE employees (
  emp_id INT PRIMARY KEY,
  employee_name VARCHAR(100),
  salary NUMERIC(10, 2),
  dept_id INT REFERENCES departments(dept_id)
);`,
            seed_data_sql: `INSERT INTO departments VALUES
(1, 'Engineering'),
(2, 'Marketing'),
(3, 'Human Resources');

INSERT INTO employees VALUES
(101, 'Sarah Connor', 140000, 1),
(102, 'John Connor', 120000, 1),
(103, 'Kyle Reese', 120000, 1),
(104, 'Miles Dyson', 110000, 1),
(201, 'Peggy Olson', 95000, 2),
(202, 'Don Draper', 130000, 2),
(203, 'Pete Campbell', 85000, 2),
(301, 'Toby Flenderson', 75000, 3);`,
            dialect: 'postgresql'
          },
          test_cases: [
            {
              id: 'tc-2',
              question_id: 'q-second-highest-salary',
              test_name: 'DENSE_RANK Department Salary Tie Test',
              expected_query: `WITH RankedEmployees AS (
  SELECT 
    d.department_name,
    e.employee_name,
    e.salary,
    DENSE_RANK() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS rnk
  FROM employees e
  JOIN departments d ON e.dept_id = d.dept_id
)
SELECT department_name, employee_name, salary
FROM RankedEmployees
WHERE rnk = 2
ORDER BY department_name ASC, employee_name ASC;`,
              is_hidden: false,
              sort_order: 1
            }
          ]
        },
        {
          id: 'q-consecutive-logins',
          slug: 'consecutive-login-streaks',
          title: 'Consecutive Login Streaks',
          difficulty: 'hard',
          topic_id: 'top-ctes',
          topic: {
            id: 'top-ctes',
            slug: 'subqueries-ctes',
            title: 'CTEs & Subqueries',
            description: '',
            icon_name: 'layers',
            sort_order: 4
          },
          description_markdown: `### Problem Description

The growth team wants to identify users with strong engagement habits. 

Write a SQL query to find all users who logged in for **3 or more consecutive days** at least once.

A user may log in multiple times on the same day; consider unique calendar days only.

#### Output Schema:
- \`user_id\` (INT)
- \`streak_length\` (INT) — The length of their maximum consecutive login streak (in days)

Order results by \`streak_length\` descending, then \`user_id\` ascending.`,
          hint_markdown:
            'First, deduplicate logins per user per day using `DISTINCT`. Then use `ROW_NUMBER()` subtracted from `login_date` to group consecutive dates into islands.',
          explanation_markdown:
            'In SQL, subtracting `ROW_NUMBER() * INTERVAL \'1 day\'` from a date produces an identical grouping anchor for all consecutive days.',
          status: 'published',
          author_id: 'admin-1',
          points: 30,
          created_at: '2026-03-03T10:00:00Z',
          updated_at: '2026-03-03T10:00:00Z',
          dataset: {
            id: 'ds-3',
            question_id: 'q-consecutive-logins',
            schema_ddl: `CREATE TABLE user_logins (
  login_id INT PRIMARY KEY,
  user_id INT,
  login_date DATE
);`,
            seed_data_sql: `INSERT INTO user_logins VALUES
(1, 1, '2026-03-01'),
(2, 1, '2026-03-02'),
(3, 1, '2026-03-02'),
(4, 1, '2026-03-03'),
(5, 1, '2026-03-04'),
(6, 2, '2026-03-01'),
(7, 2, '2026-03-03'),
(8, 2, '2026-03-04'),
(9, 3, '2026-03-05'),
(10, 3, '2026-03-06'),
(11, 3, '2026-03-07');`,
            dialect: 'postgresql'
          },
          test_cases: [
            {
              id: 'tc-3',
              question_id: 'q-consecutive-logins',
              test_name: 'Gaps & Islands 3+ Days Consecutive Test',
              expected_query: `WITH UniqueLogins AS (
  SELECT DISTINCT user_id, login_date
  FROM user_logins
),
GroupedLogins AS (
  SELECT 
    user_id,
    login_date,
    login_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date)) * INTERVAL '1 day' AS grp
  FROM UniqueLogins
),
Streaks AS (
  SELECT 
    user_id,
    COUNT(*) AS streak_days
  FROM GroupedLogins
  GROUP BY user_id, grp
)
SELECT 
  user_id,
  MAX(streak_days) AS streak_length
FROM Streaks
GROUP BY user_id
HAVING MAX(streak_days) >= 3
ORDER BY streak_length DESC, user_id ASC;`,
              is_hidden: false,
              sort_order: 1
            }
          ]
        }
      ];
      this.setLocal(this.STORAGE_QUESTIONS_KEY, defaultQuestions);
    }

    if (!localStorage.getItem(this.STORAGE_LEADERBOARD_KEY)) {
      const defaultLeaderboard: LeaderboardScore[] = [
        {
          id: 'lb-1',
          user_id: 'user-sql-pro',
          total_solved: 48,
          easy_solved: 20,
          medium_solved: 20,
          hard_solved: 8,
          total_points: 840,
          current_streak: 15,
          rank_position: 1,
          updated_at: new Date().toISOString(),
          profile: {
            id: 'user-sql-pro',
            username: 'query_ninja',
            full_name: 'Devin Vance',
            avatar_url: null,
            bio: 'Data architect & query optimization enthusiast',
            current_streak: 15,
            max_streak: 28,
            last_active_date: '2026-11-14',
            created_at: '2026-01-10T00:00:00Z',
            updated_at: '2026-11-14T00:00:00Z'
          }
        },
        {
          id: 'lb-2',
          user_id: 'user-postgres-fan',
          total_solved: 39,
          easy_solved: 18,
          medium_solved: 16,
          hard_solved: 5,
          total_points: 650,
          current_streak: 9,
          rank_position: 2,
          updated_at: new Date().toISOString(),
          profile: {
            id: 'user-postgres-fan',
            username: 'sql_samurai',
            full_name: 'Elena Rostova',
            avatar_url: null,
            bio: 'PostgreSQL fanatic. CTEs are my love language.',
            current_streak: 9,
            max_streak: 19,
            last_active_date: '2026-11-14',
            created_at: '2026-02-01T00:00:00Z',
            updated_at: '2026-11-14T00:00:00Z'
          }
        },
        {
          id: 'lb-3',
          user_id: 'user-rookie',
          total_solved: 25,
          easy_solved: 15,
          medium_solved: 8,
          hard_solved: 2,
          total_points: 370,
          current_streak: 5,
          rank_position: 3,
          updated_at: new Date().toISOString(),
          profile: {
            id: 'user-rookie',
            username: 'alex_codes',
            full_name: 'Alex Rivera',
            avatar_url: null,
            bio: 'Backend developer practicing SQL daily.',
            current_streak: 5,
            max_streak: 12,
            last_active_date: '2026-11-13',
            created_at: '2026-02-15T00:00:00Z',
            updated_at: '2026-11-13T00:00:00Z'
          }
        }
      ];
      this.setLocal(this.STORAGE_LEADERBOARD_KEY, defaultLeaderboard);
    }
  }
}
