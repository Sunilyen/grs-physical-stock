# RLS Counter Isolation — Execution & Verification Guide

## Prerequisites

1. Supabase project with `auth.users` table
2. Service role key for admin operations
3. SQL Editor access or Supabase CLI

---

## Step 1: Apply the Migration

### Option A: Supabase SQL Editor
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `006_rls_counter_isolation.sql`
3. Click **Run**

### Option B: Supabase CLI
```bash
supabase db reset
supabase migration up
```

---

## Step 2: Create Test Users

```sql
-- Create test Counter Crew user
INSERT INTO auth.users (id, email, raw_app_meta_data)
VALUES (
    'test-crew-01',
    'crew01@grs.com',
    '{"role": "counter_crew"}'::jsonb
);

INSERT INTO public.user_profiles (user_id, role, assigned_counter_id, full_name)
VALUES ('test-crew-01', 'counter_crew', 'cnt-01', 'Test Crew User');

-- Create test Operations Manager user
INSERT INTO auth.users (id, email, raw_app_meta_data)
VALUES (
    'test-manager-01',
    'manager@grs.com',
    '{"role": "operations_manager"}'::jsonb
);

INSERT INTO public.user_profiles (user_id, role, assigned_counter_id, full_name)
VALUES ('test-manager-01', 'operations_manager', NULL, 'Test Manager');
```

---

## Step 3: Run Verification Tests

1. Open Supabase SQL Editor
2. Copy contents of `006_verify_rls.sql`
3. Click **Run**
4. Verify all expected results match

---

## Step 4: Frontend Verification

1. Sign in as Counter Crew user → Navbar shows only `/counter/cnt-01`
2. Sign in as Operations Manager → Navbar shows `/manager/dashboard`
3. Verify crew user cannot access other counters via URL manipulation
4. Verify manager can view all 23 counters in dashboard

---

## Expected Test Results

| Test | Expected Result |
|------|----------------|
| Crew reads counters | Only `cnt-01` visible |
| Crew reads `cnt-02` | 0 rows returned |
| Crew updates submitted session | 0 rows affected |
| Crew inserts submitted session | Policy violation error |
| Manager reads counters | All 23 rows returned |
| Manager reads sessions | All rows returned |
| `is_manager()` for crew | `false` |
| `is_manager()` for manager | `true` |
| `get_user_counter_id()` for crew | `cnt-01` |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `function is_manager() does not exist` | Re-run migration 006 |
| `permission denied for table user_profiles` | Run as service role |
| Tests return unexpected rows | Verify `request.jwt.claims` is set correctly |
| RLS not enforcing | Check `relrowsecurity` flag: `SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'counters';` |
