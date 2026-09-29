-- =====================================================
-- 006: RLS Counter Isolation & Role-Based Access Control
-- GRS Concessions — 23 Counters
-- =====================================================

-- =====================================================
-- 1. USER PROFILES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('counter_crew', 'operations_manager')),
    assigned_counter_id TEXT,
    full_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_counter_id ON public.user_profiles(assigned_counter_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 2. SECURITY DEFINER HELPER FUNCTIONS
-- =====================================================

-- Check if current user is an Operations Manager
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_id = auth.uid()
          AND role = 'operations_manager'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get the assigned counter ID for the current user
CREATE OR REPLACE FUNCTION public.get_user_counter_id()
RETURNS TEXT AS $$
DECLARE
    v_counter_id TEXT;
BEGIN
    SELECT assigned_counter_id INTO v_counter_id
    FROM public.user_profiles
    WHERE user_id = auth.uid();

    RETURN v_counter_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- 3. ENABLE RLS ON ALL TABLES
-- =====================================================

ALTER TABLE public.counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.counter_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_count_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.physical_stock_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. COUNTERS TABLE POLICIES
-- =====================================================

-- Counter Crew: SELECT only their assigned counter
CREATE POLICY "counters_select_own"
    ON public.counters FOR SELECT
    TO authenticated
    USING (
        public.is_manager()
        OR id = public.get_user_counter_id()
    );

-- Only managers can INSERT
CREATE POLICY "counters_insert_manager"
    ON public.counters FOR INSERT
    TO authenticated
    WITH CHECK (public.is_manager());

-- Only managers can UPDATE
CREATE POLICY "counters_update_manager"
    ON public.counters FOR UPDATE
    TO authenticated
    USING (public.is_manager())
    WITH CHECK (public.is_manager());

-- Only managers can DELETE
CREATE POLICY "counters_delete_manager"
    ON public.counters FOR DELETE
    TO authenticated
    USING (public.is_manager());

-- =====================================================
-- 5. COUNTER_ITEMS TABLE POLICIES
-- =====================================================

-- Counter Crew: SELECT only items mapped to their assigned counter
CREATE POLICY "counter_items_select_own"
    ON public.counter_items FOR SELECT
    TO authenticated
    USING (
        public.is_manager()
        OR counter_id = public.get_user_counter_id()
    );

-- Only managers can INSERT
CREATE POLICY "counter_items_insert_manager"
    ON public.counter_items FOR INSERT
    TO authenticated
    WITH CHECK (public.is_manager());

-- Only managers can UPDATE
CREATE POLICY "counter_items_update_manager"
    ON public.counter_items FOR UPDATE
    TO authenticated
    USING (public.is_manager())
    WITH CHECK (public.is_manager());

-- Only managers can DELETE
CREATE POLICY "counter_items_delete_manager"
    ON public.counter_items FOR DELETE
    TO authenticated
    USING (public.is_manager());

-- =====================================================
-- 6. STOCK_COUNT_SESSIONS TABLE POLICIES
-- =====================================================

-- Counter Crew: SELECT sessions for their assigned counter
CREATE POLICY "sessions_select_own"
    ON public.stock_count_sessions FOR SELECT
    TO authenticated
    USING (
        public.is_manager()
        OR counter_id = public.get_user_counter_id()
    );

-- Counter Crew: INSERT sessions for their assigned counter (draft only)
CREATE POLICY "sessions_insert_own_draft"
    ON public.stock_count_sessions FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_manager()
        OR (
            counter_id = public.get_user_counter_id()
            AND status = 'draft'
        )
    );

-- Counter Crew: UPDATE sessions for their assigned counter (draft only)
CREATE POLICY "sessions_update_own_draft"
    ON public.stock_count_sessions FOR UPDATE
    TO authenticated
    USING (
        public.is_manager()
        OR (
            counter_id = public.get_user_counter_id()
            AND status = 'draft'
        )
    )
    WITH CHECK (
        public.is_manager()
        OR (
            counter_id = public.get_user_counter_id()
            AND status = 'draft'
        )
    );

-- Counter Crew: DELETE sessions for their assigned counter (draft only)
CREATE POLICY "sessions_delete_own_draft"
    ON public.stock_count_sessions FOR DELETE
    TO authenticated
    USING (
        public.is_manager()
        OR (
            counter_id = public.get_user_counter_id()
            AND status = 'draft'
        )
    );

-- =====================================================
-- 7. PHYSICAL_STOCK_COUNTS TABLE POLICIES
-- =====================================================

-- Counter Crew: SELECT counts for sessions belonging to their assigned counter
CREATE POLICY "counts_select_own_draft"
    ON public.physical_stock_counts FOR SELECT
    TO authenticated
    USING (
        public.is_manager()
        OR EXISTS (
            SELECT 1 FROM public.stock_count_sessions s
            WHERE s.id = physical_stock_counts.session_id
              AND s.counter_id = public.get_user_counter_id()
              AND s.status = 'draft'
        )
    );

-- Counter Crew: INSERT counts for sessions belonging to their assigned counter (draft only)
CREATE POLICY "counts_insert_own_draft"
    ON public.physical_stock_counts FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_manager()
        OR EXISTS (
            SELECT 1 FROM public.stock_count_sessions s
            WHERE s.id = physical_stock_counts.session_id
              AND s.counter_id = public.get_user_counter_id()
              AND s.status = 'draft'
        )
    );

-- Counter Crew: UPDATE counts for sessions belonging to their assigned counter (draft only)
CREATE POLICY "counts_update_own_draft"
    ON public.physical_stock_counts FOR UPDATE
    TO authenticated
    USING (
        public.is_manager()
        OR EXISTS (
            SELECT 1 FROM public.stock_count_sessions s
            WHERE s.id = physical_stock_counts.session_id
              AND s.counter_id = public.get_user_counter_id()
              AND s.status = 'draft'
        )
    )
    WITH CHECK (
        public.is_manager()
        OR EXISTS (
            SELECT 1 FROM public.stock_count_sessions s
            WHERE s.id = physical_stock_counts.session_id
              AND s.counter_id = public.get_user_counter_id()
              AND s.status = 'draft'
        )
    );

-- Counter Crew: DELETE counts for sessions belonging to their assigned counter (draft only)
CREATE POLICY "counts_delete_own_draft"
    ON public.physical_stock_counts FOR DELETE
    TO authenticated
    USING (
        public.is_manager()
        OR EXISTS (
            SELECT 1 FROM public.stock_count_sessions s
            WHERE s.id = physical_stock_counts.session_id
              AND s.counter_id = public.get_user_counter_id()
              AND s.status = 'draft'
        )
    );

-- =====================================================
-- 8. USER_PROFILES TABLE POLICIES
-- =====================================================

-- Users can view their own profile
CREATE POLICY "user_profiles_select_own"
    ON public.user_profiles FOR SELECT
    TO authenticated
    USING (
        public.is_manager()
        OR user_id = auth.uid()
    );

-- Only managers can INSERT profiles
CREATE POLICY "user_profiles_insert_manager"
    ON public.user_profiles FOR INSERT
    TO authenticated
    WITH CHECK (public.is_manager());

-- Only managers can UPDATE profiles
CREATE POLICY "user_profiles_update_manager"
    ON public.user_profiles FOR UPDATE
    TO authenticated
    USING (public.is_manager())
    WITH CHECK (public.is_manager());

-- Only managers can DELETE profiles
CREATE POLICY "user_profiles_delete_manager"
    ON public.user_profiles FOR DELETE
    TO authenticated
    USING (public.is_manager());
