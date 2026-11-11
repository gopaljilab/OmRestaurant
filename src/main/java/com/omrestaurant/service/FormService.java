package com.omrestaurant.service;

import com.omrestaurant.model.RestaurantTable;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FormService {
    private static final long SLOT_HALF_WINDOW_MINUTES = 90L;
    private final JdbcTemplate jdbc;

    public FormService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
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

    public void saveBooking(String name, String email, LocalDateTime date, int people, String request) {
        saveBooking(name, email, date, people, request, null);
    }

    @Transactional
    public RestaurantTable saveBooking(String name, String email, LocalDateTime date, int people, String request, Long tableId) {
        RestaurantTable lockedTable = null;
        if (tableId != null) {
            lockedTable = lockAndValidateTable(tableId, date, people);
        }

        jdbc.update(
                "INSERT INTO booking (name, email, booking_at, people, request, table_id) VALUES (?, ?, ?, ?, ?, ?)",
                name, email, Timestamp.valueOf(date), people, request, tableId
        );
        return lockedTable;
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
