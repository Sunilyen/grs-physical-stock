-- =====================================================
-- 006: RLS Verification & Test Script
-- Run this in Supabase SQL Editor after applying 006_rls_counter_isolation.sql
-- =====================================================

-- =====================================================
-- TEST 1: Counter Crew assigned to cnt-01 CANNOT read cnt-02
-- =====================================================

-- Simulate Counter Crew user for cnt-01
SET LOCAL "request.jwt.claims" = '{"sub": "test-crew-01"}';

-- Insert test user profile (run as service role first, then reset)
-- This should return ONLY cnt-01, NOT cnt-02
SELECT id, counter_name FROM public.counters;
-- Expected: Only cnt-01 row visible

-- Verify cnt-02 is NOT accessible
SELECT COUNT(*) AS cnt_02_visible FROM public.counters WHERE id = 'cnt-02';
-- Expected: 0

RESET "request.jwt.claims";

-- =====================================================
-- TEST 2: Counter Crew CANNOT modify submitted sessions
-- =====================================================

SET LOCAL "request.jwt.claims" = '{"sub": "test-crew-01"}';

-- Attempt to UPDATE a submitted session (should affect 0 rows)
UPDATE public.stock_count_sessions
SET status = 'draft'
WHERE counter_id = 'cnt-01' AND status = 'submitted';
-- Expected: 0 rows updated (policy blocks this)

-- Attempt to INSERT a submitted session (should fail)
INSERT INTO public.stock_count_sessions (business_date, counter_id, status)
VALUES (CURRENT_DATE, 'cnt-01', 'submitted');
-- Expected: Policy violation error

-- Attempt to DELETE a submitted session (should affect 0 rows)
DELETE FROM public.stock_count_sessions
WHERE counter_id = 'cnt-01' AND status = 'submitted';
-- Expected: 0 rows deleted

RESET "request.jwt.claims";

-- =====================================================
-- TEST 3: Operations Manager CAN view all 23 counters
-- =====================================================

SET LOCAL "request.jwt.claims" = '{"sub": "test-manager-01"}';

-- Should return all 23 counters
SELECT COUNT(*) AS total_counters FROM public.counters;
-- Expected: 23

-- Should be able to view all sessions
SELECT COUNT(*) AS total_sessions FROM public.stock_count_sessions;
-- Expected: All sessions visible

-- Should be able to view all physical_stock_counts
SELECT COUNT(*) AS total_counts FROM public.physical_stock_counts;
-- Expected: All counts visible

RESET "request.jwt.claims";

-- =====================================================
-- TEST 4: Counter Crew CAN modify draft sessions for their counter
-- =====================================================

SET LOCAL "request.jwt.claims" = '{"sub": "test-crew-01"}';

-- Should be able to INSERT a draft session for cnt-01
INSERT INTO public.stock_count_sessions (business_date, counter_id, status)
VALUES (CURRENT_DATE, 'cnt-01', 'draft')
ON CONFLICT (business_date, counter_id) DO NOTHING;
-- Expected: Success

-- Should be able to UPDATE draft session for cnt-01
UPDATE public.stock_count_sessions
SET status = 'draft'
WHERE counter_id = 'cnt-01' AND status = 'draft';
-- Expected: Success

-- Should NOT be able to INSERT session for cnt-02
INSERT INTO public.stock_count_sessions (business_date, counter_id, status)
VALUES (CURRENT_DATE, 'cnt-02', 'draft');
-- Expected: Policy violation error

RESET "request.jwt.claims";

-- =====================================================
-- TEST 5: Verify helper functions work correctly
-- =====================================================

-- Test is_manager() for crew user
SET LOCAL "request.jwt.claims" = '{"sub": "test-crew-01"}';
SELECT public.is_manager() AS is_manager_result;
-- Expected: false
RESET "request.jwt.claims";

-- Test is_manager() for manager user
SET LOCAL "request.jwt.claims" = '{"sub": "test-manager-01"}';
SELECT public.is_manager() AS is_manager_result;
-- Expected: true
RESET "request.jwt.claims";

-- Test get_user_counter_id() for crew user
SET LOCAL "request.jwt.claims" = '{"sub": "test-crew-01"}';
SELECT public.get_user_counter_id() AS assigned_counter;
-- Expected: cnt-01
RESET "request.jwt.claims";

-- =====================================================
-- CLEANUP: Remove test data (run as service role)
-- =====================================================

-- DELETE FROM public.stock_count_sessions WHERE counter_id IN ('cnt-01', 'cnt-02');
-- DELETE FROM public.user_profiles WHERE user_id IN ('test-crew-01', 'test-manager-01');
