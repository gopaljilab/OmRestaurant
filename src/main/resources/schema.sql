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
    (2, '2', 2, 'Window', 'reserved'),
    (3, '3', 2, 'Window', 'available'),
    (4, '4', 2, 'Window', 'available'),
    (5, '5', 4, 'Main', 'available'),
    (6, '6', 4, 'Main', 'available'),
    (7, '7', 4, 'Main', 'reserved'),
    (8, '8', 6, 'Main', 'available'),
    (9, '9', 6, 'Main', 'available'),
    (10, '10', 2, 'Patio', 'available'),
    (11, '11', 4, 'Patio', 'available'),
    (12, '12', 4, 'Patio', 'available'),
    (13, '13', 6, 'Booth', 'available'),
    (14, '14', 8, 'Booth', 'available')
ON CONFLICT (table_number) DO NOTHING;

SELECT setval(pg_get_serial_sequence('tables', 'id'), COALESCE((SELECT MAX(id) FROM tables), 1), true);
