import { TestBed } from '@angular/core/testing';
import { SqlSandboxService } from './sql-sandbox.service';

describe('SqlSandboxService', () => {
  let service: SqlSandboxService;

  const testDdl = `
    CREATE TABLE employees (
      id INT PRIMARY KEY,
      name VARCHAR(50),
      salary NUMERIC(10, 2)
    );
  `;

  const testSeeds = `
    INSERT INTO employees VALUES (1, 'Alice', 95000), (2, 'Bob', 82000);
  `;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SqlSandboxService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize dataset and execute valid SQL queries', async () => {
    await service.initDataset(testDdl, testSeeds);
    const result = await service.runQuery('SELECT * FROM employees ORDER BY id ASC;');

    expect(result.error).toBeNull();
    expect(result.rowCount).toBe(2);
    expect(result.columns).toEqual(['id', 'name', 'salary']);
    expect(result.rows[0]['name']).toBe('Alice');
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('should return error details on SQL syntax errors', async () => {
    await service.initDataset(testDdl, testSeeds);
    const result = await service.runQuery('SELCT * FROM invalid_table;');

    expect(result.error).toBeTruthy();
    expect(result.rowCount).toBe(0);
  });

  it('should evaluate submission against test cases correctly', async () => {
    const testCases = [
      {
        id: 'tc-1',
        question_id: 'q-1',
        test_name: 'All Employees Test',
        expected_query: 'SELECT name, salary FROM employees ORDER BY salary DESC;',
        is_hidden: false,
        sort_order: 1
      }
    ];

    const passingEvaluation = await service.evaluateSubmission(
      'SELECT name, salary FROM employees ORDER BY salary DESC;',
      testCases,
      testDdl,
      testSeeds
    );
    expect(passingEvaluation.status).toBe('accepted');
    expect(passingEvaluation.passedTestCases).toBe(1);

    const failingEvaluation = await service.evaluateSubmission(
      'SELECT name FROM employees;',
      testCases,
      testDdl,
      testSeeds
    );
    expect(failingEvaluation.status).toBe('wrong_answer');
    expect(failingEvaluation.passedTestCases).toBe(0);
  });
});
