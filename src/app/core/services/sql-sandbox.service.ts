import { Injectable } from '@angular/core';
import { PGlite } from '@electric-sql/pglite';
import {
  SqlQueryResult,
  SubmissionEvaluationResult,
  TestCaseEvaluationResult,
  QuestionTestCase
} from '../models/database.types';

@Injectable({
  providedIn: 'root'
})
export class SqlSandboxService {
  private db: PGlite | null = null;
  private initPromise: Promise<void> | null = null;
  private currentSchemaDdl: string = '';
  private currentSeedSql: string = '';
  private currentDatasetKey: string = '';
  private isDirty: boolean = false;
  private readonly QUERY_TIMEOUT_MS = 3500;
  private readonly SETUP_TIMEOUT_MS = 6000;

  constructor() {}

  /**
   * Ensures the PGlite WASM engine is booted and ready for queries.
   * Caches the database instance across queries to avoid redundant WASM reloads.
   */
  async ensureDbReady(): Promise<void> {
    if (this.db && this.db.ready) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = (async () => {
      try {
        const dbInstance = new PGlite();

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  'PostgreSQL sandbox engine initialization timed out. Please check your browser or reload.'
                )
              ),
            10000
          )
        );

        await Promise.race([dbInstance.waitReady, timeoutPromise]);
        this.db = dbInstance;
      } catch (err: any) {
        this.db = null;
        this.initPromise = null;
        console.error('Failed to initialize PGlite WASM engine:', err);
        throw new Error(`SQL Engine Boot Failure: ${err.message || err}`);
      }
    })();

    return this.initPromise;
  }

  /**
   * Loads the challenge dataset into the sandbox.
   * If already loaded and pristine, skips redundant execution for instant responsiveness.
   */
  async initDataset(schemaDdl: string, seedDataSql: string): Promise<void> {
    this.currentSchemaDdl = schemaDdl || '';
    this.currentSeedSql = seedDataSql || '';
    const datasetKey = `${this.currentSchemaDdl}:::${this.currentSeedSql}`;

    await this.ensureDbReady();

    if (this.currentDatasetKey !== datasetKey || this.isDirty) {
      await this.loadSchemaAndSeed(this.currentSchemaDdl, this.currentSeedSql);
      this.currentDatasetKey = datasetKey;
      this.isDirty = false;
    }
  }

  /**
   * Resets the active public schema and seeds clean data.
   */
  async resetToBaseline(): Promise<void> {
    await this.ensureDbReady();
    await this.loadSchemaAndSeed(this.currentSchemaDdl, this.currentSeedSql);
    this.isDirty = false;
  }

  private async loadSchemaAndSeed(schemaDdl: string, seedDataSql: string): Promise<void> {
    if (!this.db) {
      throw new Error('Sandbox database is not initialized.');
    }

    const resetDdl = 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;';
    const commands: string[] = [resetDdl];

    if (schemaDdl && schemaDdl.trim().length > 0) {
      commands.push(schemaDdl.trim());
    }

    if (seedDataSql && seedDataSql.trim().length > 0) {
      commands.push(seedDataSql.trim());
    }

    const fullScript = commands.join('\n;\n');

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Sandbox dataset setup timed out after ${this.SETUP_TIMEOUT_MS}ms`)),
        this.SETUP_TIMEOUT_MS
      )
    );

    try {
      await Promise.race([this.db.exec(fullScript), timeoutPromise]);
    } catch (err: any) {
      console.error('Failed to execute schema/seed script:', err);
      throw new Error(`Dataset Initialization Error: ${err.message || err}`);
    }
  }

  /**
   * Executes an arbitrary user SQL statement with strict timeout & error handling.
   */
  async runQuery(querySql: string): Promise<SqlQueryResult> {
    try {
      await this.ensureDbReady();
    } catch (err: any) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: err.message || 'Unable to connect to SQL sandbox engine.'
      };
    }

    const trimmed = querySql.trim();
    if (!trimmed) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: 'Query is empty. Write a SQL query and click Run Query.'
      };
    }

    // Flag whether query modified table state
    const isMutating = /^\s*(insert|update|delete|drop|alter|create|truncate)\b/i.test(trimmed);
    if (isMutating) {
      this.isDirty = true;
    }

    const startTime = performance.now();

    const queryPromise = this.db!.query<Record<string, any>>(trimmed);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`Query execution timed out after ${this.QUERY_TIMEOUT_MS}ms`)),
        this.QUERY_TIMEOUT_MS
      )
    );

    try {
      const result = await Promise.race([queryPromise, timeoutPromise]);
      const duration = Math.max(1, Math.round(performance.now() - startTime));

      const columns =
        result.fields?.map(f => f.name) ||
        (result.rows && result.rows.length > 0 ? Object.keys(result.rows[0]) : []);

      return {
        columns,
        rows: result.rows || [],
        rowCount: result.rows ? result.rows.length : 0,
        executionTimeMs: duration,
        error: null
      };
    } catch (err: any) {
      const duration = Math.max(1, Math.round(performance.now() - startTime));
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: duration,
        error: this.sanitizeErrorMessage(err.message || String(err))
      };
    }
  }

  /**
   * Runs all test cases against the user's SQL query.
   */
  async evaluateSubmission(
    userSql: string,
    testCases: QuestionTestCase[],
    schemaDdl: string,
    seedDataSql: string
  ): Promise<SubmissionEvaluationResult> {
    const startTime = performance.now();
    const testCaseResults: TestCaseEvaluationResult[] = [];
    let passedCount = 0;

    for (const testCase of testCases) {
      // 1. Reset dataset to pristine baseline for user query
      await this.loadSchemaAndSeed(schemaDdl, seedDataSql);
      this.isDirty = false;

      const userRes = await this.runQuery(userSql);

      if (userRes.error) {
        const isTimeout = userRes.error.includes('timed out');
        return {
          status: isTimeout ? 'time_limit_exceeded' : 'runtime_error',
          executionTimeMs: Math.max(1, Math.round(performance.now() - startTime)),
          totalTestCases: testCases.length,
          passedTestCases: passedCount,
          testCaseResults,
          errorMessage: userRes.error
        };
      }

      // 2. Reset dataset to pristine baseline for reference test case query
      await this.loadSchemaAndSeed(schemaDdl, seedDataSql);
      this.isDirty = false;

      const expectedRes = await this.runQuery(testCase.expected_query);

      const comparison = this.compareResultSets(userRes, expectedRes);

      const testResult: TestCaseEvaluationResult = {
        testCaseId: testCase.id,
        testName: testCase.test_name,
        passed: comparison.passed,
        isHidden: testCase.is_hidden,
        expectedRowsCount: expectedRes.rowCount,
        actualRowsCount: userRes.rowCount,
        expectedSample: expectedRes.rows.slice(0, 5),
        actualSample: userRes.rows.slice(0, 5),
        diffMessage: comparison.message
      };

      testCaseResults.push(testResult);
      if (comparison.passed) {
        passedCount++;
      }
    }

    const allPassed = testCases.length > 0 && passedCount === testCases.length;
    const totalDuration = Math.max(1, Math.round(performance.now() - startTime));

    return {
      status: allPassed ? 'accepted' : 'wrong_answer',
      executionTimeMs: totalDuration,
      totalTestCases: testCases.length,
      passedTestCases: passedCount,
      testCaseResults,
      errorMessage: allPassed
        ? null
        : 'Your query output did not match the expected result for all test cases.'
    };
  }

  private compareResultSets(
    actual: SqlQueryResult,
    expected: SqlQueryResult
  ): { passed: boolean; message: string | null } {
    if (actual.error) {
      return { passed: false, message: `Runtime error: ${actual.error}` };
    }

    if (actual.columns.length !== expected.columns.length) {
      return {
        passed: false,
        message: `Column count mismatch: Expected ${expected.columns.length} columns (${expected.columns.join(
          ', '
        )}), but got ${actual.columns.length} columns (${actual.columns.join(', ')}).`
      };
    }

    if (actual.rowCount !== expected.rowCount) {
      return {
        passed: false,
        message: `Row count mismatch: Expected ${expected.rowCount} rows, but your query returned ${actual.rowCount} rows.`
      };
    }

    for (let i = 0; i < expected.rows.length; i++) {
      const expRow = expected.rows[i];
      const actRow = actual.rows[i];

      const expKeys = Object.keys(expRow);
      const actKeys = Object.keys(actRow);

      for (let j = 0; j < expKeys.length; j++) {
        const expVal = expRow[expKeys[j]];
        const actVal = actRow[actKeys[j]];

        if (!this.areValuesEqual(actVal, expVal)) {
          return {
            passed: false,
            message: `Value mismatch at row ${i + 1}, column '${actKeys[j]}': Expected '${expVal}', but received '${actVal}'.`
          };
        }
      }
    }

    return { passed: true, message: null };
  }

  private areValuesEqual(a: any, b: any): boolean {
    if (a === b) return true;
    if (a === null || b === null || a === undefined || b === undefined) {
      return a == b;
    }

    const numA = Number(a);
    const numB = Number(b);
    if (!isNaN(numA) && !isNaN(numB)) {
      return Math.abs(numA - numB) < 0.0001;
    }

    return String(a).trim() === String(b).trim();
  }

  private sanitizeErrorMessage(msg: string): string {
    return msg.replace(/^error:\s*/i, '').trim();
  }
}
