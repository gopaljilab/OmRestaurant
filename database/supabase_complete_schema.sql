-- =============================================================================
-- OM RESTAURANT & KDS — COMPLETE SUPABASE POSTGRESQL SCHEMA MIGRATION
-- Pure Vegetarian Heritage Restaurant Established 1942
-- Idempotent script safe to run multiple times (uses IF NOT EXISTS / ON CONFLICT)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Dining Room Physical Tables (Floor-Plan Table Picker)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tables (
    id BIGSERIAL PRIMARY KEY,
    table_number VARCHAR(32) NOT NULL UNIQUE,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    zone VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'available'
);

-- Seed physical dining room tables across Window, Main, Patio, Booth zones
INSERT INTO public.tables (id, table_number, capacity, zone, status) VALUES
    (1,  '1',  2, 'Window', 'available'),
    (2,  '2',  2, 'Window', 'available'),
    (3,  '3',  2, 'Window', 'available'),
    (4,  '4',  2, 'Window', 'available'),
    (5,  '5',  4, 'Main',   'available'),
    (6,  '6',  4, 'Main',   'available'),
    (7,  '7',  4, 'Main',   'available'),
    (8,  '8',  6, 'Main',   'available'),
    (9,  '9',  6, 'Main',   'available'),
    (10, '10', 2, 'Patio',  'available'),
    (11, '11', 4, 'Patio',  'available'),
    (12, '12', 4, 'Patio',  'available'),
    (13, '13', 6, 'Booth',  'available'),
    (14, '14', 8, 'Booth',  'available')
ON CONFLICT (table_number) DO NOTHING;

-- Align tables BIGSERIAL sequence
SELECT setval(
    pg_get_serial_sequence('public.tables', 'id'),
    COALESCE((SELECT MAX(id) FROM public.tables), 1),
    true
);

-- -----------------------------------------------------------------------------
-- 2. Customer Reservations (Booking)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    booking_at TIMESTAMP NOT NULL,
    people SMALLINT NOT NULL,
    request TEXT NOT NULL,
    table_id BIGINT REFERENCES public.tables(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.booking
    ADD COLUMN IF NOT EXISTS table_id BIGINT REFERENCES public.tables(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_booking_table_time
    ON public.booking (table_id, booking_at);

-- -----------------------------------------------------------------------------
-- 3. Customer Contact & Newsletter
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_us (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.newsletter (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 4. Kitchen Operations & KDS: Orders Master Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id BIGSERIAL PRIMARY KEY,
    order_number VARCHAR(32) NOT NULL UNIQUE,
    order_type VARCHAR(32) NOT NULL DEFAULT 'dine_in' 
        CHECK (order_type IN ('dine_in', 'takeaway', 'pre_order')),
    table_id BIGINT REFERENCES public.tables(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(32),
    guest_count INTEGER NOT NULL DEFAULT 1 CHECK (guest_count > 0),
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    status VARCHAR(32) NOT NULL DEFAULT 'incoming' 
        CHECK (status IN ('incoming', 'preparing', 'ready', 'served', 'completed', 'cancelled')),
    payment_status VARCHAR(32) NOT NULL DEFAULT 'pending' 
        CHECK (payment_status IN ('pending', 'paid_cash', 'paid_upi', 'paid_card')),
    special_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Human-readable order numbers (OM-1001, OM-1002, ...)
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1001;

-- -----------------------------------------------------------------------------
-- 5. Kitchen Operations & KDS: Order Line Items with Station Routing
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    dish_slug VARCHAR(128),
    dish_name VARCHAR(255) NOT NULL,
    category VARCHAR(128) NOT NULL,
    station VARCHAR(64) NOT NULL 
        CHECK (station IN ('tandoor', 'curry', 'south_indian', 'chinese', 'beverage')),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    spice_level VARCHAR(32) NOT NULL DEFAULT 'medium',
    item_status VARCHAR(32) NOT NULL DEFAULT 'pending' 
        CHECK (item_status IN ('pending', 'cooking', 'done')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 6. Menu Availability Status (Live 86 / Out of Stock Toggle)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menu_item_status (
    dish_slug VARCHAR(128) PRIMARY KEY,
    dish_name VARCHAR(255) NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 7. High-Performance Indexes
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON public.orders (table_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_dish_slug ON public.order_items (dish_slug);
CREATE INDEX IF NOT EXISTS idx_order_items_station_status ON public.order_items (station, item_status);
CREATE INDEX IF NOT EXISTS idx_menu_item_status_available ON public.menu_item_status (is_available);

COMMIT;
