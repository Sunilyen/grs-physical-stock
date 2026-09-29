-- =====================================================
-- 002: Row Level Security (RLS) Policies
-- End-of-Day Physical Stock Counting Module
-- =====================================================

-- =====================================================
-- 1. ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE counter_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_count_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_stock_counts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. HELPER FUNCTION: Get user role from JWT claims
-- =====================================================

CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (raw_app_meta_data ->> 'role')::TEXT,
    'shop_keeper'
  )
  FROM auth.users
  WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =====================================================
-- 3. ITEMS TABLE POLICIES
-- =====================================================

CREATE POLICY "items_select_authenticated"
  ON items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "items_insert_manager"
  ON items FOR INSERT
  TO authenticated
  WITH CHECK (auth.user_role() IN ('manager', 'admin'));

CREATE POLICY "items_update_manager"
  ON items FOR UPDATE
  TO authenticated
  USING (auth.user_role() IN ('manager', 'admin'))
  WITH CHECK (auth.user_role() IN ('manager', 'admin'));

CREATE POLICY "items_delete_manager"
  ON items FOR DELETE
  TO authenticated
  USING (auth.user_role() IN ('manager', 'admin'));

-- =====================================================
-- 4. COUNTERS TABLE POLICIES
-- =====================================================

CREATE POLICY "counters_select_authenticated"
  ON counters FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "counters_insert_manager"
  ON counters FOR INSERT
  TO authenticated
  WITH CHECK (auth.user_role() IN ('manager', 'admin'));

CREATE POLICY "counters_update_manager"
  ON counters FOR UPDATE
  TO authenticated
  USING (auth.user_role() IN ('manager', 'admin'))
  WITH CHECK (auth.user_role() IN ('manager', 'admin'));

CREATE POLICY "counters_delete_manager"
  ON counters FOR DELETE
  TO authenticated
  USING (auth.user_role() IN ('manager', 'admin'));

-- =====================================================
-- 5. COUNTER_ITEMS TABLE POLICIES
-- =====================================================

CREATE POLICY "counter_items_select_authenticated"
  ON counter_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "counter_items_insert_manager"
  ON counter_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.user_role() IN ('manager', 'admin'));

CREATE POLICY "counter_items_update_manager"
  ON counter_items FOR UPDATE
  TO authenticated
  USING (auth.user_role() IN ('manager', 'admin'))
  WITH CHECK (auth.user_role() IN ('manager', 'admin'));

CREATE POLICY "counter_items_delete_manager"
  ON counter_items FOR DELETE
  TO authenticated
  USING (auth.user_role() IN ('manager', 'admin'));

-- =====================================================
-- 6. STOCK_COUNT_SESSIONS TABLE POLICIES
-- =====================================================

-- Authenticated users can SELECT draft sessions
CREATE POLICY "sessions_select_draft"
  ON stock_count_sessions FOR SELECT
  TO authenticated
  USING (status = 'draft');

-- Managers can SELECT all sessions
CREATE POLICY "sessions_select_manager"
  ON stock_count_sessions FOR SELECT
  TO authenticated
  USING (auth.user_role() IN ('manager', 'admin'));

-- Authenticated users can INSERT draft sessions
CREATE POLICY "sessions_insert_draft"
  ON stock_count_sessions FOR INSERT
  TO authenticated
  WITH CHECK (status = 'draft');

-- Authenticated users can UPDATE draft sessions only
CREATE POLICY "sessions_update_draft"
  ON stock_count_sessions FOR UPDATE
  TO authenticated
  USING (status = 'draft')
  WITH CHECK (status = 'draft');

-- Managers can UPDATE any session
CREATE POLICY "sessions_update_manager"
  ON stock_count_sessions FOR UPDATE
  TO authenticated
  USING (auth.user_role() IN ('manager', 'admin'))
  WITH CHECK (auth.user_role() IN ('manager', 'admin'));

-- Authenticated users can DELETE draft sessions only
CREATE POLICY "sessions_delete_draft"
  ON stock_count_sessions FOR DELETE
  TO authenticated
  USING (status = 'draft');

-- Managers can DELETE any session
CREATE POLICY "sessions_delete_manager"
  ON stock_count_sessions FOR DELETE
  TO authenticated
  USING (auth.user_role() IN ('manager', 'admin'));

-- =====================================================
-- 7. PHYSICAL_STOCK_COUNTS TABLE POLICIES
-- =====================================================

-- Authenticated users can SELECT counts for draft sessions
CREATE POLICY "counts_select_draft"
  ON physical_stock_counts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stock_count_sessions s
      WHERE s.id = physical_stock_counts.session_id
        AND s.status = 'draft'
    )
  );

-- Managers can SELECT all counts
CREATE POLICY "counts_select_manager"
  ON physical_stock_counts FOR SELECT
  TO authenticated
  USING (auth.user_role() IN ('manager', 'admin'));

-- Authenticated users can INSERT counts for draft sessions
CREATE POLICY "counts_insert_draft"
  ON physical_stock_counts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stock_count_sessions s
      WHERE s.id = physical_stock_counts.session_id
        AND s.status = 'draft'
    )
  );

-- Authenticated users can UPDATE counts for draft sessions
CREATE POLICY "counts_update_draft"
  ON physical_stock_counts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stock_count_sessions s
      WHERE s.id = physical_stock_counts.session_id
        AND s.status = 'draft'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stock_count_sessions s
      WHERE s.id = physical_stock_counts.session_id
        AND s.status = 'draft'
    )
  );

-- Authenticated users can DELETE counts for draft sessions
CREATE POLICY "counts_delete_draft"
  ON physical_stock_counts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stock_count_sessions s
      WHERE s.id = physical_stock_counts.session_id
        AND s.status = 'draft'
    )
  );

-- Managers can INSERT any count
CREATE POLICY "counts_insert_manager"
  ON physical_stock_counts FOR INSERT
  TO authenticated
  WITH CHECK (auth.user_role() IN ('manager', 'admin'));

-- Managers can UPDATE any count
CREATE POLICY "counts_update_manager"
  ON physical_stock_counts FOR UPDATE
  TO authenticated
  USING (auth.user_role() IN ('manager', 'admin'))
  WITH CHECK (auth.user_role() IN ('manager', 'admin'));

-- Managers can DELETE any count
CREATE POLICY "counts_delete_manager"
  ON physical_stock_counts FOR DELETE
  TO authenticated
  USING (auth.user_role() IN ('manager', 'admin'));
