# Database Optimization
Audit of hot queries: dashboard (4 parallel), growth (9 parallel), missions (now 2 parallel), projects (1), learn/practice/exams similar Promise.all patterns. All select only needed columns; xp_events/practice_history/exam_attempts have student_id indexes (0001). N+1: none found in student paths. Admin student directory loads full roster — flagged as scaling risk, NOT changed (needs admin creds to measure; pagination change risks breaking admin UI without evidence).
No migrations added. RLS untouched.
