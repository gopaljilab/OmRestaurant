-- =============================================================================
-- OmRestaurant — Supabase PostgreSQL Kitchen Operations & KDS Migration
-- Creates: orders, order_items, menu_item_status
-- Preserves: tables, booking, contact_us, newsletter (100% additive migration)
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Orders Table: Master Order Tracking
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

-- Sequence for concurrent, collision-free human-readable order numbers (e.g. OM-1001)
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1001;

-- -----------------------------------------------------------------------------
-- 2. Order Items Table: Line Items with Station Routing
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
-- 3. Menu Item Status Table: Live Kitchen 86'ing / Stock Toggle
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.menu_item_status (
    dish_slug VARCHAR(128) PRIMARY KEY,
    dish_name VARCHAR(255) NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 4. High-Performance Indexes for Operations Queries
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_status 
    ON public.orders (status);

CREATE INDEX IF NOT EXISTS idx_orders_created_at 
    ON public.orders (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_table_id 
    ON public.orders (table_id);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
    ON public.order_items (order_id);

CREATE INDEX IF NOT EXISTS idx_order_items_station_status 
    ON public.order_items (station, item_status);

CREATE INDEX IF NOT EXISTS idx_menu_item_status_available 
    ON public.menu_item_status (is_available);

-- -----------------------------------------------------------------------------
-- 5. Seed Mock Active Orders for Immediate KDS Verification
-- -----------------------------------------------------------------------------
-- Order #OM-1001: Table 5 (Main 4-seater) - In Kitchen / Preparing
INSERT INTO public.orders (id, order_number, order_type, table_id, customer_name, customer_phone, guest_count, total_amount, status, payment_status, special_notes, created_at, accepted_at)
VALUES (
    1,
    '#OM-1001',
    'dine_in',
    5,
    'Vikram Malhotra',
    '+91 98112 34567',
    4,
    555.00,
    'preparing',
    'pending',
    'Medium spice, prepare naans crisp',
    CURRENT_TIMESTAMP - INTERVAL '14 minutes',
    CURRENT_TIMESTAMP - INTERVAL '12 minutes'
) ON CONFLICT (order_number) DO NOTHING;

-- Order #OM-1002: Table 8 (Main 6-seater) - Incoming / New
INSERT INTO public.orders (id, order_number, order_type, table_id, customer_name, customer_phone, guest_count, total_amount, status, payment_status, special_notes, created_at)
VALUES (
    2,
    '#OM-1002',
    'dine_in',
    8,
    'Priya Sharma',
    '+91 99234 56789',
    5,
    830.00,
    'incoming',
    'pending',
    'Urgent table order, birthday celebration',
    CURRENT_TIMESTAMP - INTERVAL '3 minutes'
) ON CONFLICT (order_number) DO NOTHING;

-- Order #OM-1003: Table 1 (Window 2-seater) - Ready for Pickup / Runner Dispatch
INSERT INTO public.orders (id, order_number, order_type, table_id, customer_name, customer_phone, guest_count, total_amount, status, payment_status, special_notes, created_at, accepted_at, ready_at)
VALUES (
    3,
    '#OM-1003',
    'dine_in',
    1,
    'Ananya Verma',
    '+91 97123 45678',
    2,
    600.00,
    'ready',
    'paid_upi',
    'Extra sambhar and coconut chutney requested',
    CURRENT_TIMESTAMP - INTERVAL '22 minutes',
    CURRENT_TIMESTAMP - INTERVAL '20 minutes',
    CURRENT_TIMESTAMP - INTERVAL '2 minutes'
) ON CONFLICT (order_number) DO NOTHING;

-- Order #OM-1004: Takeaway Counter - Preparing
INSERT INTO public.orders (id, order_number, order_type, table_id, customer_name, customer_phone, guest_count, total_amount, status, payment_status, special_notes, created_at, accepted_at)
VALUES (
    4,
    '#OM-1004',
    'takeaway',
    NULL,
    'Rahul Gupta',
    '+91 98987 65432',
    2,
    490.00,
    'preparing',
    'paid_cash',
    'Pack gravy containers securely',
    CURRENT_TIMESTAMP - INTERVAL '9 minutes',
    CURRENT_TIMESTAMP - INTERVAL '7 minutes'
) ON CONFLICT (order_number) DO NOTHING;

-- Order #OM-1005: Table 13 (VIP Booth) - Served / Active Dining
INSERT INTO public.orders (id, order_number, order_type, table_id, customer_name, customer_phone, guest_count, total_amount, status, payment_status, special_notes, created_at, accepted_at, ready_at)
VALUES (
    5,
    '#OM-1005',
    'dine_in',
    13,
    'Deepak Singhal',
    '+91 94120 12345',
    6,
    1520.00,
    'served',
    'pending',
    'VIP guests, serve starters promptly',
    CURRENT_TIMESTAMP - INTERVAL '40 minutes',
    CURRENT_TIMESTAMP - INTERVAL '37 minutes',
    CURRENT_TIMESTAMP - INTERVAL '18 minutes'
) ON CONFLICT (order_number) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 6. Seed Items for Mock Orders
-- -----------------------------------------------------------------------------
-- Items for Order 1 (#OM-1001)
INSERT INTO public.order_items (id, order_id, dish_slug, dish_name, category, station, unit_price, quantity, spice_level, item_status, notes) VALUES
    (1, 1, 'paneer-butter-masala', 'Paneer Butter Masala', 'Indian Main Course', 'curry', 200.00, 1, 'Medium', 'cooking', 'Velvety gravy'),
    (2, 1, 'butter-naan', 'Butter Naan', 'Rice, Biryani & Breads', 'tandoor', 40.00, 3, 'Mild', 'cooking', 'Well-done crisp'),
    (3, 1, 'mint-mojito', 'Mint Mojito', 'Beverages & Shakes', 'beverage', 100.00, 2, 'Mild', 'done', 'Chilled')
ON CONFLICT (id) DO NOTHING;

-- Items for Order 2 (#OM-1002)
INSERT INTO public.order_items (id, order_id, dish_slug, dish_name, category, station, unit_price, quantity, spice_level, item_status, notes) VALUES
    (4, 2, 'tandoori-chaap', 'Adraki Chaap Tandoori', 'Chaap Specials', 'tandoor', 150.00, 2, 'Spicy', 'pending', 'Sizzling hot with mint chutney'),
    (5, 2, 'dal-makhani', 'Dal Makhani', 'Veggies & Dal Items', 'curry', 160.00, 1, 'Medium', 'pending', 'Slow-cooked desi ghee'),
    (6, 2, 'jeera-rice', 'Jeera Rice', 'Rice, Biryani & Breads', 'curry', 90.00, 1, 'Mild', 'pending', 'Basmati rice')
ON CONFLICT (id) DO NOTHING;

-- Items for Order 3 (#OM-1003)
INSERT INTO public.order_items (id, order_id, dish_slug, dish_name, category, station, unit_price, quantity, spice_level, item_status, notes) VALUES
    (7, 3, 'paneer-dosa', 'Paneer Dosa', 'South Indian Delights', 'south_indian', 130.00, 2, 'Medium', 'done', 'Crispy golden roasted'),
    (8, 3, 'cold-coffee', 'Cold Coffee', 'Beverages & Shakes', 'beverage', 100.00, 2, 'Mild', 'done', 'With chocolate drizzle')
ON CONFLICT (id) DO NOTHING;

-- Items for Order 4 (#OM-1004)
INSERT INTO public.order_items (id, order_id, dish_slug, dish_name, category, station, unit_price, quantity, spice_level, item_status, notes) VALUES
    (9, 4, 'veg-manchurian', 'Veg Manchurian Gravy', 'Chinese, Rice & Noodles', 'chinese', 130.00, 1, 'Spicy', 'cooking', 'Thick garlic gravy'),
    (10, 4, 'chilli-garlic-fried-rice', 'Chilli Garlic Fried Rice', 'Chinese, Rice & Noodles', 'chinese', 120.00, 1, 'Spicy', 'cooking', 'Extra spring onions'),
    (11, 4, 'spring-rolls', 'Spring Rolls', 'Chinese, Rice & Noodles', 'chinese', 100.00, 1, 'Mild', 'done', 'Packed separate sauce')
ON CONFLICT (id) DO NOTHING;

-- Items for Order 5 (#OM-1005)
INSERT INTO public.order_items (id, order_id, dish_slug, dish_name, category, station, unit_price, quantity, spice_level, item_status, notes) VALUES
    (12, 5, 'shahi-paneer', 'Shahi Paneer', 'Indian Main Course', 'curry', 180.00, 4, 'Medium', 'done', 'Velvety royal gravy'),
    (13, 5, 'masala-shikanji', 'Masala Shikanji', 'Beverages & Shakes', 'beverage', 30.00, 4, 'Medium', 'done', 'With fresh mint & rock salt')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 7. Seed Initial Menu Stock Status for Verification
-- -----------------------------------------------------------------------------
INSERT INTO public.menu_item_status (dish_slug, dish_name, is_available) VALUES
    ('paneer-butter-masala', 'Paneer Butter Masala', TRUE),
    ('shahi-paneer', 'Shahi Paneer', TRUE),
    ('dal-makhani', 'Dal Makhani', TRUE),
    ('tandoori-chaap', 'Adraki Chaap Tandoori', TRUE),
    ('malai-chaap-tandoori', 'Malai Chaap Tandoori', TRUE),
    ('paneer-dosa', 'Paneer Dosa', TRUE),
    ('masala-dosa', 'Masala Dosa', TRUE),
    ('veg-manchurian', 'Veg Manchurian Gravy', TRUE),
    ('hakka-noodles', 'Hakka Noodles', TRUE),
    ('mint-mojito', 'Mint Mojito', TRUE),
    ('falhar-combo', 'Falhar Special Combo', FALSE) -- Seeded out of stock for immediate 86 test
ON CONFLICT (dish_slug) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 8. Align BIGSERIAL Sequences with Seeded Max IDs & Existing Orders
-- -----------------------------------------------------------------------------
SELECT setval(
    pg_get_serial_sequence('public.orders', 'id'),
    COALESCE((SELECT MAX(id) FROM public.orders), 1),
    true
);

SELECT setval(
    pg_get_serial_sequence('public.order_items', 'id'),
    COALESCE((SELECT MAX(id) FROM public.order_items), 1),
    true
);

SELECT setval(
    'public.order_number_seq',
    GREATEST(
        1000,
        COALESCE((SELECT MAX(id) FROM public.orders), 0) + 1000,
        COALESCE((SELECT MAX(NULLIF(regexp_replace(order_number, '[^0-9]', '', 'g'), '')::BIGINT) FROM public.orders), 1000)
    ),
    true
);

COMMIT;
