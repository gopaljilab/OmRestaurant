package com.omrestaurant.service;

import com.omrestaurant.model.RestaurantTable;
import java.sql.PreparedStatement;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FormService {
    private static final long SLOT_HALF_WINDOW_MINUTES = 90L;
    private final JdbcTemplate jdbc;
    private final MenuCatalog menuCatalog;

    public FormService(JdbcTemplate jdbc, MenuCatalog menuCatalog) {
        this.jdbc = jdbc;
        this.menuCatalog = menuCatalog;
    }

    public List<RestaurantTable> getTableAvailability(LocalDate date, LocalTime time) {
        LocalDate resolvedDate = date != null ? date : LocalDate.now();
        LocalTime resolvedTime = time != null ? time : LocalTime.of(19, 0);
        LocalDateTime targetSlot = LocalDateTime.of(resolvedDate, resolvedTime);

        Timestamp windowStart = Timestamp.valueOf(targetSlot.minusMinutes(SLOT_HALF_WINDOW_MINUTES));
        Timestamp windowEnd = Timestamp.valueOf(targetSlot.plusMinutes(SLOT_HALF_WINDOW_MINUTES));

        String sql = """
                SELECT t.id,
                       t.table_number,
                       t.capacity,
                       t.zone,
                       t.status,
                       EXISTS (
                           SELECT 1
                           FROM booking b
                           WHERE b.table_id = t.id
                             AND b.booking_at > ?
                             AND b.booking_at < ?
                       ) AS booked_in_slot
                FROM tables t
                ORDER BY t.id
                """;

        return jdbc.query(sql, (rs, rowNum) -> {
            String baseStatus = rs.getString("status");
            boolean bookedInSlot = rs.getBoolean("booked_in_slot");
            boolean reserved = !"available".equalsIgnoreCase(baseStatus) || bookedInSlot;
            String effectiveStatus = reserved ? "reserved" : "available";

            return new RestaurantTable(
                    rs.getLong("id"),
                    rs.getString("table_number"),
                    rs.getInt("capacity"),
                    rs.getString("zone"),
                    effectiveStatus,
                    !reserved
            );
        }, windowStart, windowEnd);
    }

    public record BookingResult(Long bookingId, RestaurantTable table) {
        public Long tableId() {
            return table != null ? table.id() : null;
        }

        public String reservationId() {
            return bookingId != null ? "OM-B" + bookingId : null;
        }
    }

    public void saveBooking(String name, String email, LocalDateTime date, int people, String request) {
        saveBooking(name, email, date, people, request, null);
    }

    @Transactional
    public BookingResult saveBooking(String name, String email, LocalDateTime date, int people, String request, Long tableId) {
        RestaurantTable lockedTable = null;
        if (tableId != null) {
            lockedTable = lockAndValidateTable(tableId, date, people);
        }

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(
                    "INSERT INTO booking (name, email, booking_at, people, request, table_id) VALUES (?, ?, ?, ?, ?, ?)",
                    new String[]{"id"}
            );
            ps.setString(1, name);
            ps.setString(2, email);
            ps.setTimestamp(3, Timestamp.valueOf(date));
            ps.setInt(4, people);
            ps.setString(5, request);
            if (tableId != null) {
                ps.setLong(6, tableId);
            } else {
                ps.setNull(6, Types.BIGINT);
            }
            return ps;
        }, keyHolder);

        Long bookingId = null;
        try {
            Number n = keyHolder.getKey();
            if (n != null) {
                bookingId = n.longValue();
            }
        } catch (Exception ignored) {
        }

        if (bookingId == null) {
            try {
                if (keyHolder.getKeys() != null) {
                    for (Object val : keyHolder.getKeys().values()) {
                        if (val instanceof Number n) {
                            bookingId = n.longValue();
                            break;
                        }
                    }
                }
            } catch (Exception ignored) {
            }
        }

        if (bookingId == null) {
            try {
                bookingId = jdbc.queryForObject(
                        "SELECT id FROM booking WHERE email = ? ORDER BY id DESC LIMIT 1",
                        Long.class, email
                );
            } catch (Exception ignored) {
            }
        }

        return new BookingResult(bookingId, lockedTable);
    }

    private RestaurantTable lockAndValidateTable(Long tableId, LocalDateTime bookingTime, int partySize) {
        RestaurantTable table;
        try {
            table = jdbc.queryForObject(
                    "SELECT id, table_number, capacity, zone, status FROM tables WHERE id = ? FOR UPDATE",
                    (rs, rowNum) -> new RestaurantTable(
                            rs.getLong("id"),
                            rs.getString("table_number"),
                            rs.getInt("capacity"),
                            rs.getString("zone"),
                            rs.getString("status"),
                            "available".equalsIgnoreCase(rs.getString("status"))
                    ),
                    tableId
            );
        } catch (EmptyResultDataAccessException ex) {
            throw new IllegalArgumentException("Selected table was not found.");
        }

        if (table == null) {
            throw new IllegalArgumentException("Selected table was not found.");
        }
        if (table.capacity() < partySize) {
            throw new TableCapacityException(
                    "Table " + table.tableNumber() + " seats up to " + table.capacity() + " guests."
            );
        }
        if (!"available".equalsIgnoreCase(table.status())) {
            throw new TableUnavailableException(
                    "Table " + table.tableNumber() + " is currently unavailable for reservations."
            );
        }

        Timestamp windowStart = Timestamp.valueOf(bookingTime.minusMinutes(SLOT_HALF_WINDOW_MINUTES));
        Timestamp windowEnd = Timestamp.valueOf(bookingTime.plusMinutes(SLOT_HALF_WINDOW_MINUTES));
        Integer overlaps = jdbc.queryForObject(
                "SELECT COUNT(*) FROM booking WHERE table_id = ? AND booking_at > ? AND booking_at < ?",
                Integer.class,
                tableId,
                windowStart,
                windowEnd
        );
        if (overlaps != null && overlaps > 0) {
            throw new TableUnavailableException(
                    "Table " + table.tableNumber() + " is already reserved around this time slot."
            );
        }

        return table;
    }

    @Transactional
    public void createPreOrderIfPresent(Long tableId, String customerName, String customerPhone, int people, LocalDateTime bookingTime, String preorderText) {
        if (preorderText == null || preorderText.isBlank()) {
            return;
        }

        java.util.List<com.omrestaurant.model.MenuItem> items = new java.util.ArrayList<>();
        for (String part : preorderText.split(",")) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                menuCatalog.findBySlugOrName(trimmed).ifPresent(items::add);
            }
        }

        if (items.isEmpty()) {
            return;
        }

        java.math.BigDecimal total = items.stream()
                .map(com.omrestaurant.model.MenuItem::price)
                .reduce(java.math.BigDecimal.ZERO, java.math.BigDecimal::add);

        String tableNumber = null;
        if (tableId != null) {
            try {
                tableNumber = jdbc.queryForObject("SELECT table_number FROM tables WHERE id = ?", String.class, tableId);
            } catch (Exception ignored) {}
        }

        String notes = "Pre-order for Table " + (tableNumber != null ? tableNumber : (tableId != null ? tableId : "TBD")) + " Reservation (" + bookingTime + ")";

        Long orderId = jdbc.queryForObject(
                "INSERT INTO orders (order_number, order_type, table_id, customer_name, customer_phone, guest_count, total_amount, status, payment_status, special_notes, created_at) " +
                "VALUES ('OM-' || nextval('order_number_seq'), 'pre_order', ?, ?, ?, ?, ?, 'incoming', 'pending', ?, CURRENT_TIMESTAMP) RETURNING id",
                Long.class,
                tableId, customerName, customerPhone, people, total, notes
        );

        if (orderId != null) {
            for (com.omrestaurant.model.MenuItem item : items) {
                jdbc.update(
                        "INSERT INTO order_items (order_id, dish_slug, dish_name, category, station, unit_price, quantity, spice_level, item_status, notes, created_at) " +
                        "VALUES (?, ?, ?, ?, ?, ?, 1, 'medium', 'pending', '', CURRENT_TIMESTAMP)",
                        orderId, item.slug(), item.name(), item.category(), item.station(), item.price()
                );
            }
        }
    }

    public void saveContact(String name, String email, String subject, String message) {
        jdbc.update("INSERT INTO contact_us (name, email, subject, message) VALUES (?, ?, ?, ?)",
                name, email, subject, message);
    }

    public void subscribe(String email) {
        jdbc.update("INSERT INTO newsletter (email) VALUES (?)", email);
    }

    public static class TableUnavailableException extends RuntimeException {
        public TableUnavailableException(String message) {
            super(message);
        }
    }

    public static class TableCapacityException extends RuntimeException {
        public TableCapacityException(String message) {
            super(message);
        }
    }
}
