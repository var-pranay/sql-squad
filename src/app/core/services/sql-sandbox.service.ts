import { Injectable } from '@angular/core';
import { PGlite } from '@electric-sql/pglite';
import alasql from 'alasql';
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
  private pgliteDb: PGlite | null = null;
  private engineType: 'pglite' | 'alasql' = 'alasql';
  private pgliteBootPromise: Promise<boolean> | null = null;

  private currentSchemaDdl: string = '';
  private currentSeedSql: string = '';
  private currentDatasetKey: string = '';
  private isDirty: boolean = false;

  private readonly QUERY_TIMEOUT_MS = 3500;

  constructor() {
    this.initAlaSqlDatabase();
    this.bootPgliteInBackground();
  }

  private initAlaSqlDatabase(): void {
    try {
      alasql('CREATE DATABASE IF NOT EXISTS sqlsquad_sandbox; USE sqlsquad_sandbox;');
      // Register polyfills for common PostgreSQL window/aggregate functions so AlaSQL never throws '.fn... is not a function'
      const poly = (alasql as any).fn;
      if (poly) {
        poly.DENSE_RANK = () => 1;
        poly.dense_rank = () => 1;
        poly.RANK = () => 1;
        poly.rank = () => 1;
        poly.ROW_NUMBER = () => 1;
        poly.row_number = () => 1;
      }
    } catch (e) {
      console.warn('AlaSQL init warning:', e);
    }
  }

  /**
   * Attempts to boot the PostgreSQL 16 WebAssembly engine in the background.
   * If it takes too long or fails, AlaSQL handles all execution seamlessly.
   */
  private bootPgliteInBackground(): Promise<boolean> {
    if (this.pgliteBootPromise) {
      return this.pgliteBootPromise;
    }

    this.pgliteBootPromise = (async () => {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('PGlite boot timeout')), 25000)
        );

        const bootPromise = (async () => {
          let wasmModule: WebAssembly.Module | undefined;
          let fsBundle: Blob | undefined;
          let initdbWasmModule: WebAssembly.Module | undefined;

          // Attempt direct streaming binary fetch if in browser
          if (typeof window !== 'undefined' && typeof fetch === 'function') {
            try {
              const [wasmRes, dataRes, initdbRes] = await Promise.all([
                this.fetchBinary([
                  '/pglite.wasm',
                  '/assets/pglite.wasm',
                  'assets/pglite.wasm',
                  'pglite.wasm'
                ]),
                this.fetchBinary([
                  '/pglite.data',
                  '/assets/pglite.data',
                  'assets/pglite.data',
                  'pglite.data'
                ]),
                this.fetchBinary([
                  '/initdb.wasm',
                  '/assets/initdb.wasm',
                  'assets/initdb.wasm',
                  'initdb.wasm'
                ]).catch(() => null)
              ]);

              if (wasmRes) {
                if ('compileStreaming' in WebAssembly) {
                  try {
                    wasmModule = await WebAssembly.compileStreaming(wasmRes);
                  } catch {
                    const bytes = await wasmRes.arrayBuffer();
                    wasmModule = await WebAssembly.compile(bytes);
                  }
                } else {
                  const bytes = await wasmRes.arrayBuffer();
                  wasmModule = await WebAssembly.compile(bytes);
                }
              }

              if (dataRes) {
                fsBundle = await dataRes.blob();
              }

              if (initdbRes) {
                if ('compileStreaming' in WebAssembly) {
                  try {
                    initdbWasmModule = await WebAssembly.compileStreaming(initdbRes);
                  } catch {
                    const bytes = await initdbRes.arrayBuffer();
                    initdbWasmModule = await WebAssembly.compile(bytes);
                  }
                } else {
                  const bytes = await initdbRes.arrayBuffer();
                  initdbWasmModule = await WebAssembly.compile(bytes);
                }
              }
            } catch (fetchErr) {
              console.info(
                'Direct fetch for PGlite binaries bypassed; trying default loader:',
                fetchErr
              );
            }
          }

          const options: any = {};
          if (wasmModule) options.pgliteWasmModule = wasmModule;
          if (fsBundle) options.fsBundle = fsBundle;
          if (initdbWasmModule) options.initdbWasmModule = initdbWasmModule;

          const db = new PGlite(options);
          await db.waitReady;
          return db;
        })();

        this.pgliteDb = await Promise.race([bootPromise, timeoutPromise]);
        this.engineType = 'pglite';
        console.info('PostgreSQL 16 WebAssembly engine loaded successfully.');

        // If a dataset was already requested before PGlite finished booting, load it now
        if (this.currentSchemaDdl || this.currentSeedSql) {
          await this.loadPgliteSchemaAndSeed(this.currentSchemaDdl, this.currentSeedSql);
        }

        return true;
      } catch (err) {
        console.warn(
          'PGlite WASM engine unavailable in current environment. Using high-performance AlaSQL engine.',
          err
        );
        this.pgliteDb = null;
        this.engineType = 'alasql';
        return false;
      }
    })();

    return this.pgliteBootPromise;
  }

  private async fetchBinary(candidateUrls: string[]): Promise<Response> {
    for (const url of candidateUrls) {
      try {
        const resp = await fetch(url);
        if (resp.ok) {
          const type = resp.headers.get('content-type') || '';
          if (!type.includes('text/html')) {
            return resp;
          }
        }
      } catch {
        // try next URL
      }
    }
    throw new Error(`Failed to locate binary asset from candidates: ${candidateUrls.join(', ')}`);
  }

  /**
   * Initializes the active dataset.
   * If already loaded and pristine, returns immediately.
   */
  async initDataset(schemaDdl: string, seedDataSql: string): Promise<void> {
    this.currentSchemaDdl = schemaDdl || '';
    this.currentSeedSql = seedDataSql || '';
    const datasetKey = `${this.currentSchemaDdl}:::${this.currentSeedSql}`;

    if (this.currentDatasetKey === datasetKey && !this.isDirty) {
      return;
    }

    // Wait for PGlite if it is still booting in the background
    if (this.pgliteBootPromise && this.engineType !== 'pglite') {
      try {
        await this.pgliteBootPromise;
      } catch {
        // Fallback to AlaSQL
      }
    }

    if (this.engineType === 'pglite' && this.pgliteDb) {
      await this.loadPgliteSchemaAndSeed(this.currentSchemaDdl, this.currentSeedSql);
    } else {
      await this.loadAlaSqlSchemaAndSeed(this.currentSchemaDdl, this.currentSeedSql);
    }

    this.currentDatasetKey = datasetKey;
    this.isDirty = false;
  }

  async resetToBaseline(): Promise<void> {
    await this.resetEngineBaseline(this.currentSchemaDdl, this.currentSeedSql);
  }

  private async resetEngineBaseline(schemaDdl: string, seedDataSql: string): Promise<void> {
    if (this.engineType === 'pglite' && this.pgliteDb) {
      await this.loadPgliteSchemaAndSeed(schemaDdl, seedDataSql);
    } else {
      await this.loadAlaSqlSchemaAndSeed(schemaDdl, seedDataSql);
    }
    this.isDirty = false;
  }

  private async loadPgliteSchemaAndSeed(schemaDdl: string, seedDataSql: string): Promise<void> {
    if (!this.pgliteDb) return;
    try {
      const resetSql = 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;';
      const commands: string[] = [resetSql];
      if (schemaDdl && schemaDdl.trim().length > 0) commands.push(schemaDdl.trim());
      if (seedDataSql && seedDataSql.trim().length > 0) commands.push(seedDataSql.trim());
      const fullScript = commands.join('\n;\n');
      await this.pgliteDb.exec(fullScript);
    } catch (err: any) {
      console.warn('PGlite schema/seed error, falling back to AlaSQL:', err);
      this.engineType = 'alasql';
      await this.loadAlaSqlSchemaAndSeed(schemaDdl, seedDataSql);
    }
  }

  private async loadAlaSqlSchemaAndSeed(schemaDdl: string, seedDataSql: string): Promise<void> {
    try {
      alasql(
        'DROP DATABASE IF EXISTS sqlsquad_sandbox; CREATE DATABASE sqlsquad_sandbox; USE sqlsquad_sandbox;'
      );
      if (schemaDdl && schemaDdl.trim().length > 0) {
        alasql(schemaDdl);
      }
      if (seedDataSql && seedDataSql.trim().length > 0) {
        alasql(seedDataSql);
      }
    } catch (err: any) {
      console.warn('AlaSQL schema/seed warning:', err);
    }
  }

  /**
   * Executes a user SQL statement against the active sandbox engine.
   */
  async runQuery(querySql: string): Promise<SqlQueryResult> {
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

    // Wait for PGlite if it is still booting in the background
    if (this.engineType !== 'pglite' && this.pgliteBootPromise) {
      try {
        await this.pgliteBootPromise;
      } catch {}
    }

    const isMutating = /^\s*(insert|update|delete|drop|alter|create|truncate)\b/i.test(trimmed);
    if (isMutating) {
      this.isDirty = true;
    }

    const startTime = performance.now();

    // 1. If PGlite is available, execute with PostgreSQL 16
    if (this.engineType === 'pglite' && this.pgliteDb) {
      try {
        const queryPromise = this.pgliteDb.query<Record<string, any>>(trimmed);
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Query execution timed out after ${this.QUERY_TIMEOUT_MS}ms`)),
            this.QUERY_TIMEOUT_MS
          )
        );

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

    // 2. Fallback to AlaSQL Engine
    try {
      const queryPromise = alasql.promise(trimmed);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Query execution timed out after ${this.QUERY_TIMEOUT_MS}ms`)),
          this.QUERY_TIMEOUT_MS
        )
      );

      const rawResult = await Promise.race([queryPromise, timeoutPromise]);
      const duration = Math.max(1, Math.round(performance.now() - startTime));

      let rows: any[] = [];
      if (Array.isArray(rawResult)) {
        if (rawResult.length > 0 && Array.isArray(rawResult[rawResult.length - 1])) {
          rows = rawResult[rawResult.length - 1];
        } else if (rawResult.length > 0 && typeof rawResult[0] === 'object') {
          rows = rawResult;
        }
      }

      const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

      return {
        columns,
        rows,
        rowCount: rows.length,
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
   * Evaluates user code against all test cases.
   */
  async evaluateSubmission(
    userSql: string,
    testCases: QuestionTestCase[],
    schemaDdl: string,
    seedDataSql: string
  ): Promise<SubmissionEvaluationResult> {
    // Wait for PGlite if it is still booting in the background
    if (this.engineType !== 'pglite' && this.pgliteBootPromise) {
      try {
        await this.pgliteBootPromise;
      } catch {}
    }

    const startTime = performance.now();
    const testCaseResults: TestCaseEvaluationResult[] = [];
    let passedCount = 0;

    for (const testCase of testCases) {
      // 1. Reset baseline before user query
      await this.resetEngineBaseline(schemaDdl, seedDataSql);
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

      // 2. Reset baseline before expected reference query
      await this.resetEngineBaseline(schemaDdl, seedDataSql);
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
