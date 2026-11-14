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
  private currentSchemaDdl: string = '';
  private currentSeedSql: string = '';
  private readonly QUERY_TIMEOUT_MS = 3500;

  constructor() {}

  async initDataset(schemaDdl: string, seedDataSql: string): Promise<void> {
    this.currentSchemaDdl = schemaDdl;
    this.currentSeedSql = seedDataSql;
    await this.resetToBaseline();
  }

  async resetToBaseline(): Promise<void> {
    try {
      if (this.db) {
        try {
          await this.db.close();
        } catch {
          // ignore close error
        }
        this.db = null;
      }

      this.db = new PGlite();

      if (this.currentSchemaDdl && this.currentSchemaDdl.trim().length > 0) {
        await this.db.exec(this.currentSchemaDdl);
      }

      if (this.currentSeedSql && this.currentSeedSql.trim().length > 0) {
        await this.db.exec(this.currentSeedSql);
      }
    } catch (err: any) {
      console.error('Failed to initialize SQL sandbox dataset:', err);
      throw new Error(`Sandbox Initialization Error: ${err.message || err}`);
    }
  }

  async runQuery(querySql: string): Promise<SqlQueryResult> {
    if (!this.db) {
      await this.resetToBaseline();
    }

    const trimmed = querySql.trim();
    if (!trimmed) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: 0,
        error: 'Query is empty. Write a SQL statement and run again.'
      };
    }

    const startTime = performance.now();

    const queryPromise = this.db!.query<Record<string, any>>(trimmed);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Query execution timed out after ${this.QUERY_TIMEOUT_MS}ms`)), this.QUERY_TIMEOUT_MS)
    );

    try {
      const result = await Promise.race([queryPromise, timeoutPromise]);
      const duration = Math.round(performance.now() - startTime);

      const columns = result.fields?.map(f => f.name) || (result.rows && result.rows.length > 0 ? Object.keys(result.rows[0]) : []);

      return {
        columns,
        rows: result.rows || [],
        rowCount: result.rows ? result.rows.length : 0,
        executionTimeMs: duration,
        error: null
      };
    } catch (err: any) {
      const duration = Math.round(performance.now() - startTime);
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTimeMs: duration,
        error: this.sanitizeErrorMessage(err.message || String(err))
      };
    }
  }

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
      await this.initDataset(schemaDdl, seedDataSql);

      const userRes = await this.runQuery(userSql);

      if (userRes.error) {
        const isTimeout = userRes.error.includes('timed out');
        return {
          status: isTimeout ? 'time_limit_exceeded' : 'runtime_error',
          executionTimeMs: Math.round(performance.now() - startTime),
          totalTestCases: testCases.length,
          passedTestCases: passedCount,
          testCaseResults,
          errorMessage: userRes.error
        };
      }

      await this.initDataset(schemaDdl, seedDataSql);
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
    const totalDuration = Math.round(performance.now() - startTime);

    return {
      status: allPassed ? 'accepted' : 'wrong_answer',
      executionTimeMs: totalDuration,
      totalTestCases: testCases.length,
      passedTestCases: passedCount,
      testCaseResults,
      errorMessage: allPassed ? null : 'Your query output did not match the expected result for all test cases.'
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
        message: `Column count mismatch: Expected ${expected.columns.length} columns (${expected.columns.join(', ')}), but got ${actual.columns.length} columns (${actual.columns.join(', ')}).`
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
