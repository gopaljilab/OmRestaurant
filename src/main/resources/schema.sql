CREATE TABLE IF NOT EXISTS tables (
    id BIGSERIAL PRIMARY KEY,
    table_number VARCHAR(32) NOT NULL UNIQUE,
    capacity INTEGER NOT NULL CHECK (capacity > 0),
    zone VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'available'
);

CREATE TABLE IF NOT EXISTS booking (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    booking_at TIMESTAMP NOT NULL,
    people SMALLINT NOT NULL,
    request TEXT NOT NULL,
    table_id BIGINT REFERENCES tables(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE booking
    ADD COLUMN IF NOT EXISTS table_id BIGINT REFERENCES tables(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_booking_table_time
    ON booking (table_id, booking_at);

CREATE TABLE IF NOT EXISTS contact_us (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS newsletter (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed physical dining room tables idempotently across all 4 zones
INSERT INTO tables (id, table_number, capacity, zone, status) VALUES
    (1, '1', 2, 'Window', 'available'),
    (2, '2', 2, 'Window', 'available'),
    (3, '3', 2, 'Window', 'available'),
    (4, '4', 2, 'Window', 'available'),
    (5, '5', 4, 'Main', 'available'),
    (6, '6', 4, 'Main', 'available'),
    (7, '7', 4, 'Main', 'available'),
    (8, '8', 6, 'Main', 'available'),
    (9, '9', 6, 'Main', 'available'),
    (10, '10', 2, 'Patio', 'available'),
    (11, '11', 4, 'Patio', 'available'),
    (12, '12', 4, 'Patio', 'available'),
    (13, '13', 6, 'Booth', 'available'),
    (14, '14', 8, 'Booth', 'available')
ON CONFLICT (table_number) DO NOTHING;

SELECT setval(pg_get_serial_sequence('tables', 'id'), COALESCE((SELECT MAX(id) FROM tables), 1), true);

-- Kitchen Operations & KDS Tables
CREATE TABLE IF NOT EXISTS orders (
    id BIGSERIAL PRIMARY KEY,
    order_number VARCHAR(32) NOT NULL UNIQUE,
    order_type VARCHAR(32) NOT NULL DEFAULT 'dine_in' CHECK (order_type IN ('dine_in', 'takeaway', 'pre_order')),
    table_id BIGINT REFERENCES tables(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(32),
    guest_count INTEGER NOT NULL DEFAULT 1 CHECK (guest_count > 0),
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    status VARCHAR(32) NOT NULL DEFAULT 'incoming' CHECK (status IN ('incoming', 'preparing', 'ready', 'served', 'completed', 'cancelled')),
    payment_status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid_cash', 'paid_upi', 'paid_card')),
    special_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP WITH TIME ZONE,
    ready_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1001;

CREATE TABLE IF NOT EXISTS order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    dish_slug VARCHAR(128),
    dish_name VARCHAR(255) NOT NULL,
    category VARCHAR(128) NOT NULL,
    station VARCHAR(64) NOT NULL CHECK (station IN ('tandoor', 'curry', 'south_indian', 'chinese', 'beverage')),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    spice_level VARCHAR(32) NOT NULL DEFAULT 'medium',
    item_status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (item_status IN ('pending', 'cooking', 'done')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS menu_item_status (
    dish_slug VARCHAR(128) PRIMARY KEY,
    dish_name VARCHAR(255) NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_table_id ON orders (table_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_dish_slug ON order_items (dish_slug);
CREATE INDEX IF NOT EXISTS idx_order_items_station_status ON order_items (station, item_status);
CREATE INDEX IF NOT EXISTS idx_menu_item_status_available ON menu_item_status (is_available);

