export type AppRole = 'admin' | 'user';
export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type QuestionStatus = 'draft' | 'published' | 'archived';
export type SubmissionStatus = 'accepted' | 'wrong_answer' | 'runtime_error' | 'time_limit_exceeded';
export type ProgressStatus = 'unattempted' | 'attempted' | 'solved';

export interface UserProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  current_streak: number;
  max_streak: number;
  last_active_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRoleRecord {
  id: string;
  user_id: string;
  role: AppRole;
  granted_at: string;
}

export interface Topic {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon_name: string;
  sort_order: number;
  created_at?: string;
  questions_count?: number;
}

export interface Question {
  id: string;
  topic_id: string | null;
  slug: string;
  title: string;
  difficulty: QuestionDifficulty;
  description_markdown: string;
  hint_markdown: string | null;
  explanation_markdown: string | null;
  status: QuestionStatus;
  author_id: string | null;
  points: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  topic?: Topic;
  dataset?: QuestionDataset;
  test_cases?: QuestionTestCase[];
  schedule?: QuestionSchedule;
  user_progress?: UserQuestionProgress;
}

export interface QuestionDataset {
  id: string;
  question_id: string;
  schema_ddl: string;
  seed_data_sql: string;
  dialect: string;
  created_at?: string;
}

export interface QuestionTestCase {
  id: string;
  question_id: string;
  test_name: string;
  expected_query: string;
  expected_output_preview?: any;
  is_hidden: boolean;
  sort_order: number;
}

export interface QuestionSchedule {
  id: string;
  question_id: string;
  scheduled_date: string; // YYYY-MM-DD
  is_active: boolean;
  question?: Question;
}

export interface Submission {
  id: string;
  user_id: string;
  question_id: string;
  query_sql: string;
  status: SubmissionStatus;
  execution_time_ms: number;
  error_message: string | null;
  passed_test_cases: number;
  total_test_cases: number;
  submitted_at: string;
  question?: Question;
}

export interface UserQuestionProgress {
  id: string;
  user_id: string;
  question_id: string;
  status: ProgressStatus;
  attempt_count: number;
  best_execution_time_ms: number | null;
  first_solved_at: string | null;
  last_attempted_at: string;
}

export interface LeaderboardScore {
  id: string;
  user_id: string;
  total_solved: number;
  easy_solved: number;
  medium_solved: number;
  hard_solved: number;
  total_points: number;
  current_streak: number;
  rank_position?: number;
  updated_at: string;
  profile?: UserProfile;
}

export interface SqlQueryResult {
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  executionTimeMs: number;
  error?: string | null;
}

export interface TestCaseEvaluationResult {
  testCaseId: string;
  testName: string;
  passed: boolean;
  isHidden: boolean;
  expectedRowsCount: number;
  actualRowsCount: number;
  expectedSample?: Record<string, any>[];
  actualSample?: Record<string, any>[];
  diffMessage?: string | null;
}

export interface SubmissionEvaluationResult {
  status: SubmissionStatus;
  executionTimeMs: number;
  totalTestCases: number;
  passedTestCases: number;
  testCaseResults: TestCaseEvaluationResult[];
  errorMessage?: string | null;
}
