-- =====================================================
-- End-of-Day Physical Stock Counting Module
-- Initial Schema Migration
-- =====================================================

-- 1. Items Master
CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_code VARCHAR(50) UNIQUE NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    mou VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'F&B', 'Retail', 'Merchandise'
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Counters Master
CREATE TABLE IF NOT EXISTS counters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    counter_code VARCHAR(50) UNIQUE NOT NULL,
    counter_name VARCHAR(255) NOT NULL,
    counter_type VARCHAR(50) NOT NULL, -- 'F&B', 'Retail', 'Merchandise', 'Mixed'
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Counter-SKU Mapping
CREATE TABLE IF NOT EXISTS counter_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    counter_id UUID REFERENCES counters(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(counter_id, item_id)
);

-- 4. Stock Count Sessions (Parent Submission Record)
CREATE TABLE IF NOT EXISTS stock_count_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_date DATE NOT NULL,
    counter_id UUID REFERENCES counters(id),
    submitted_by UUID REFERENCES auth.users(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'submitted'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(business_date, counter_id)
);

-- 5. Physical Stock Counts (Child Item Details)
CREATE TABLE IF NOT EXISTS physical_stock_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES stock_count_sessions(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id),
    counted_qty NUMERIC(10, 2) NOT NULL CHECK (counted_qty >= 0),
    entered_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, item_id)
);

-- Indexes for Fast Querying
CREATE INDEX IF NOT EXISTS idx_stock_sessions_date_counter ON stock_count_sessions(business_date, counter_id);
CREATE INDEX IF NOT EXISTS idx_physical_counts_session ON physical_stock_counts(session_id);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_items_updated_at
    BEFORE UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_counters_updated_at
    BEFORE UPDATE ON counters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE counter_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_count_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE physical_stock_counts ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Items
CREATE POLICY "Items are viewable by authenticated users" ON items
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Items can be inserted by authenticated users" ON items
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Items can be updated by authenticated users" ON items
    FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Items can be deleted by authenticated users" ON items
    FOR DELETE TO authenticated USING (true);

-- RLS Policies: Counters
CREATE POLICY "Counters are viewable by authenticated users" ON counters
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Counters can be inserted by authenticated users" ON counters
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Counters can be updated by authenticated users" ON counters
    FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Counters can be deleted by authenticated users" ON counters
    FOR DELETE TO authenticated USING (true);

-- RLS Policies: Counter Items
CREATE POLICY "Counter items are viewable by authenticated users" ON counter_items
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Counter items can be inserted by authenticated users" ON counter_items
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Counter items can be updated by authenticated users" ON counter_items
    FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Counter items can be deleted by authenticated users" ON counter_items
    FOR DELETE TO authenticated USING (true);

-- RLS Policies: Stock Count Sessions
CREATE POLICY "Sessions are viewable by authenticated users" ON stock_count_sessions
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sessions can be inserted by authenticated users" ON stock_count_sessions
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Sessions can be updated by authenticated users" ON stock_count_sessions
    FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Sessions can be deleted by authenticated users" ON stock_count_sessions
    FOR DELETE TO authenticated USING (true);

-- RLS Policies: Physical Stock Counts
CREATE POLICY "Counts are viewable by authenticated users" ON physical_stock_counts
    FOR SELECT TO authenticated USING (true);
CREATE POLICY "Counts can be inserted by authenticated users" ON physical_stock_counts
    FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Counts can be updated by authenticated users" ON physical_stock_counts
    FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Counts can be deleted by authenticated users" ON physical_stock_counts
    FOR DELETE TO authenticated USING (true);
