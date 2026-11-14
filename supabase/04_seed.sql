-- ==============================================================================
-- SQL SQUAD - SEED DATA (TOPICS, SAMPLE QUESTIONS, SCHEMAS & TEST CASES)
-- ==============================================================================

-- 1. SEED TOPICS
INSERT INTO public.topics (id, slug, title, description, icon_name, sort_order)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'joins', 'Joins & Relational Algebra', 'Master INNER, LEFT, RIGHT, FULL OUTER and CROSS JOIN operations across multiple tables.', 'git-merge', 1),
    ('22222222-2222-2222-2222-222222222222', 'aggregations', 'Aggregations & Grouping', 'Aggregate functions, GROUP BY, HAVING, and multi-dimensional rollups.', 'bar-chart-2', 2),
    ('33333333-3333-3333-3333-333333333333', 'window-functions', 'Window & Analytic Functions', 'ROW_NUMBER, RANK, DENSE_RANK, NTILE, LAG, LEAD, and running totals.', 'trending-up', 3),
    ('44444444-4444-4444-4444-444444444444', 'subqueries-ctes', 'CTEs & Subqueries', 'Common Table Expressions (WITH clause), recursive queries, and correlated subqueries.', 'layers', 4)
ON CONFLICT (slug) DO NOTHING;

-- 2. QUESTION 1 (Easy): High-Value Customer Orders
INSERT INTO public.questions (
    id, topic_id, slug, title, difficulty, description_markdown, hint_markdown, explanation_markdown, status, points
) VALUES (
    'a1111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    'high-value-customer-orders',
    'High-Value Customer Orders',
    'easy',
    '### Problem Description

The Sales Director wants a summary of our top VIP customers. 

Write a SQL query to find all customers who have spent a **cumulative total of more than $500** across all their orders.

#### Output Schema:
- `customer_name` (VARCHAR) — Customer''s full name
- `total_spend` (NUMERIC) — Total sum of their orders, rounded to 2 decimal places

Order your output by `total_spend` in **descending order**. If two customers have the same total spend, order by `customer_name` in **alphabetical order**.',
    'Use `INNER JOIN` to connect `customers` with `orders`, group by `customer_id` and `customer_name`, and filter using the `HAVING` clause.',
    'We join `customers` and `orders` on `customer_id`, sum `total_amount`, and filter out customers whose sum does not exceed 500 using `HAVING SUM(orders.total_amount) > 500`.',
    'published',
    10
) ON CONFLICT (slug) DO NOTHING;

-- Dataset for Question 1
INSERT INTO public.question_datasets (question_id, schema_ddl, seed_data_sql)
VALUES (
    'a1111111-1111-1111-1111-111111111111',
    'CREATE TABLE customers (
    customer_id INT PRIMARY KEY,
    customer_name VARCHAR(100),
    country VARCHAR(50)
);

CREATE TABLE orders (
    order_id INT PRIMARY KEY,
    customer_id INT REFERENCES customers(customer_id),
    order_date DATE,
    total_amount NUMERIC(10, 2)
);',
    'INSERT INTO customers VALUES 
(1, ''Alice Smith'', ''USA''),
(2, ''Bob Jones'', ''UK''),
(3, ''Carlos Santana'', ''Mexico''),
(4, ''Diana Prince'', ''Canada''),
(5, ''Evan Wright'', ''USA'');

INSERT INTO orders VALUES
(101, 1, ''2026-01-10'', 350.00),
(102, 1, ''2026-01-15'', 220.50),
(103, 2, ''2026-01-12'', 150.00),
(104, 3, ''2026-01-18'', 720.00),
(105, 4, ''2026-01-20'', 490.00),
(106, 5, ''2026-01-22'', 610.25);'
) ON CONFLICT (question_id) DO NOTHING;

-- Test Case for Question 1
INSERT INTO public.question_test_cases (question_id, test_name, expected_query, is_hidden, sort_order)
VALUES (
    'a1111111-1111-1111-1111-111111111111',
    'Standard Dataset Verification',
    'SELECT c.customer_name, ROUND(SUM(o.total_amount), 2) AS total_spend
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
GROUP BY c.customer_id, c.customer_name
HAVING SUM(o.total_amount) > 500
ORDER BY total_spend DESC, c.customer_name ASC;',
    false,
    1
);

-- 3. QUESTION 2 (Medium): Second Highest Earner per Department
INSERT INTO public.questions (
    id, topic_id, slug, title, difficulty, description_markdown, hint_markdown, explanation_markdown, status, points
) VALUES (
    'b2222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    'second-highest-earner-department',
    'Second Highest Earner per Department',
    'medium',
    '### Problem Description

Write a SQL query to identify the employee who earns the **second highest salary** in each department. If multiple employees in the department share the second highest salary, return all of them.

If a department has fewer than 2 distinct salary tiers, that department should not appear in the result.

#### Output Schema:
- `department_name` (VARCHAR)
- `employee_name` (VARCHAR)
- `salary` (NUMERIC)

Order results by `department_name` ascending, then `employee_name` ascending.',
    'Use `DENSE_RANK()` partitioned by `department_id` ordered by `salary DESC` inside a CTE or subquery, then filter for rank = 2.',
    'Using `DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC)` ensures ties receive the same rank without skipping ranks.',
    'published',
    20
) ON CONFLICT (slug) DO NOTHING;

-- Dataset for Question 2
INSERT INTO public.question_datasets (question_id, schema_ddl, seed_data_sql)
VALUES (
    'b2222222-2222-2222-2222-222222222222',
    'CREATE TABLE departments (
    dept_id INT PRIMARY KEY,
    department_name VARCHAR(100)
);

CREATE TABLE employees (
    emp_id INT PRIMARY KEY,
    employee_name VARCHAR(100),
    salary NUMERIC(10, 2),
    dept_id INT REFERENCES departments(dept_id)
);',
    'INSERT INTO departments VALUES
(1, ''Engineering''),
(2, ''Marketing''),
(3, ''Human Resources'');

INSERT INTO employees VALUES
(101, ''Sarah Connor'', 140000, 1),
(102, ''John Connor'', 120000, 1),
(103, ''Kyle Reese'', 120000, 1),
(104, ''Miles Dyson'', 110000, 1),
(201, ''Peggy Olson'', 95000, 2),
(202, ''Don Draper'', 130000, 2),
(203, ''Pete Campbell'', 85000, 2),
(301, ''Toby Flenderson'', 75000, 3);'
) ON CONFLICT (question_id) DO NOTHING;

-- Test Case for Question 2
INSERT INTO public.question_test_cases (question_id, test_name, expected_query, is_hidden, sort_order)
VALUES (
    'b2222222-2222-2222-2222-222222222222',
    'Second Salary Tier with Ties Check',
    'WITH RankedEmployees AS (
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
ORDER BY department_name ASC, employee_name ASC;',
    false,
    1
);

-- 4. QUESTION 3 (Hard): Consecutive Login Streaks (Gaps and Islands)
INSERT INTO public.questions (
    id, topic_id, slug, title, difficulty, description_markdown, hint_markdown, explanation_markdown, status, points
) VALUES (
    'c3333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    'consecutive-login-streaks',
    'Consecutive Login Streaks',
    'hard',
    '### Problem Description

The growth team wants to identify users with strong engagement habits. 

Write a SQL query to find all users who logged in for **3 or more consecutive days** at least once.

A user may log in multiple times on the same day; consider unique calendar days only.

#### Output Schema:
- `user_id` (INT)
- `streak_length` (INT) — The length of their maximum consecutive login streak (in days)

Order results by `streak_length` descending, then `user_id` ascending.',
    'First, deduplicate logins per user per day using `DISTINCT`. Then use `ROW_NUMBER()` subtracted from `login_date` to group consecutive dates into islands.',
    'In SQL, `date - ROW_NUMBER() OVER (...) * INTERVAL ''1 day''` produces a constant anchor date for consecutive days. Grouping by user and this anchor gives each island streak length.',
    'published',
    30
) ON CONFLICT (slug) DO NOTHING;

-- Dataset for Question 3
INSERT INTO public.question_datasets (question_id, schema_ddl, seed_data_sql)
VALUES (
    'c3333333-3333-3333-3333-333333333333',
    'CREATE TABLE user_logins (
    login_id INT PRIMARY KEY,
    user_id INT,
    login_date DATE
);',
    'INSERT INTO user_logins VALUES
(1, 1, ''2026-03-01''),
(2, 1, ''2026-03-02''),
(3, 1, ''2026-03-02''), -- Duplicate login on same day
(4, 1, ''2026-03-03''),
(5, 1, ''2026-03-04''), -- 4-day streak for user 1
(6, 2, ''2026-03-01''),
(7, 2, ''2026-03-03''),
(8, 2, ''2026-03-04''), -- only 2 consecutive days for user 2
(9, 3, ''2026-03-05''),
(10, 3, ''2026-03-06''),
(11, 3, ''2026-03-07''); -- 3-day streak for user 3'
) ON CONFLICT (question_id) DO NOTHING;

-- Test Case for Question 3
INSERT INTO public.question_test_cases (question_id, test_name, expected_query, is_hidden, sort_order)
VALUES (
    'c3333333-3333-3333-3333-333333333333',
    'Consecutive 3+ Days Gaps and Islands Test',
    'WITH UniqueLogins AS (
    SELECT DISTINCT user_id, login_date
    FROM user_logins
),
GroupedLogins AS (
    SELECT 
        user_id,
        login_date,
        login_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date)) * INTERVAL ''1 day'' AS grp
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
ORDER BY streak_length DESC, user_id ASC;',
    false,
    1
);

-- 5. SCHEDULE TODAY''S DAILY QUESTION
INSERT INTO public.question_schedules (question_id, scheduled_date, is_active)
VALUES 
    ('a1111111-1111-1111-1111-111111111111', CURRENT_DATE, true),
    ('b2222222-2222-2222-2222-222222222222', CURRENT_DATE + INTERVAL '1 day', true),
    ('c3333333-3333-3333-3333-333333333333', CURRENT_DATE + INTERVAL '2 days', true)
ON CONFLICT (scheduled_date) DO UPDATE SET question_id = EXCLUDED.question_id;
