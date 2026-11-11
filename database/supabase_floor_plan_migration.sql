-- =============================================================================
-- OmRestaurant — Supabase PostgreSQL Floor-Plan Table Picker Migration
-- Run this script once in the Supabase SQL Editor (or via psql) on existing DBs
-- =============================================================================

BEGIN;

-- 1. Create physical dining room tables registry
CREATE TABLE IF NOT EXISTS public.tables (
    id BIGSERIAL PRIMARY KEY,
    table_number VARCHAR(32) NOT NULL UNIQUE,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    zone VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'available'
);

-- 2. Add table_id foreign key reference to existing booking table
ALTER TABLE public.booking
    ADD COLUMN IF NOT EXISTS table_id BIGINT REFERENCES public.tables(id) ON DELETE SET NULL;

-- 3. Add composite index for fast time-window availability queries
CREATE INDEX IF NOT EXISTS idx_booking_table_time
    ON public.booking (table_id, booking_at);

-- 4. Seed the 14 floor-plan tables across Window, Main, Patio, and Booth zones
INSERT INTO public.tables (id, table_number, capacity, zone, status) VALUES
    (1,  '1',  2, 'Window', 'available'),
    (2,  '2',  2, 'Window', 'reserved'),
    (3,  '3',  2, 'Window', 'available'),
    (4,  '4',  2, 'Window', 'available'),
    (5,  '5',  4, 'Main',   'available'),
    (6,  '6',  4, 'Main',   'available'),
    (7,  '7',  4, 'Main',   'reserved'),
    (8,  '8',  6, 'Main',   'available'),
    (9,  '9',  6, 'Main',   'available'),
    (10, '10', 2, 'Patio',  'available'),
    (11, '11', 4, 'Patio',  'available'),
    (12, '12', 4, 'Patio',  'available'),
    (13, '13', 6, 'Booth',  'available'),
    (14, '14', 8, 'Booth',  'available')
ON CONFLICT (table_number) DO NOTHING;

-- 5. Keep BIGSERIAL sequence aligned with seeded max(id)
SELECT setval(
    pg_get_serial_sequence('public.tables', 'id'),
    COALESCE((SELECT MAX(id) FROM public.tables), 1),
    true
);

COMMIT;
