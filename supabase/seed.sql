-- ============================================================================
-- Javoodle · seed.sql — ICSE Class 10 Computer Applications (Java) syllabus
-- Run AFTER 0001_init.sql. Idempotent via ON CONFLICT.
-- Verify chapter lists against the current CISSE syllabus + prescribed text.
-- ============================================================================

insert into public.topics (name, phase, order_index, description) values
  -- Month 1 — Fundamentals
  ('Introduction to Computing & Java',        1, 1,  'History, uses of computers, Java overview'),
  ('Variables & Data Types',                  1, 2,  'Primitive types, literals, declaration, input/output'),
  ('Operators',                               1, 3,  'Arithmetic, relational, logical, assignment, increment/decrement'),
  ('Conditional Statements',                  1, 4,  'if-else, nested if, switch'),
  ('Loops',                                   1, 5,  'for, while, do-while, nested loops'),
  ('Classes & Objects',                       1, 6,  'Class definition, objects, instance variables, methods'),
  ('Methods',                                 1, 7,  'Method declaration, parameters, return types, calling'),
  -- Month 2 — Intermediate
  ('Constructors',                            2, 1,  'Default & parameterized constructors, this keyword'),
  ('Method & Constructor Overloading',        2, 2,  'Compile-time polymorphism'),
  ('Library Classes',                         2, 3,  'Math, StringBuilder, wrapper classes, Scanner'),
  ('Strings',                                 2, 4,  'String class methods, immutability, comparison'),
  ('Arrays',                                  2, 5,  'One & two dimensional arrays, traversal'),
  ('Searching & Sorting',                     2, 6,  'Linear/binary search, bubble & selection sort'),
  ('Intermediate Programming Problems',       2, 7,  'Board-style program design'),
  -- Month 3 — Revision & exams
  ('Full Syllabus Revision',                  3, 1,  'Mixed concept drills'),
  ('Previous Year Questions',                 3, 2,  'PYQ practice by topic'),
  ('Timed Practice & Mock Exams',             3, 3,  'Exam simulation & weak-area work')
on conflict (parent_id, name) do nothing;
