package com.omrestaurant.repository;

import com.omrestaurant.model.Order;
import com.omrestaurant.model.OrderItem;
import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.Statement;
import java.sql.Timestamp;
import java.sql.Types;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class OrderRepository {
    private final JdbcTemplate jdbc;

    public OrderRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @PostConstruct
    public void init() {
        try {
            jdbc.execute("CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1001");
        } catch (Exception ignored) {
            // Sequence creation may be ignored if already managed by migration
        }
    }

    private final RowMapper<Order> orderRowMapper = (rs, rowNum) -> {
        Timestamp createdTs = rs.getTimestamp("created_at");
        Timestamp acceptedTs = rs.getTimestamp("accepted_at");
        Timestamp readyTs = rs.getTimestamp("ready_at");
        Timestamp completedTs = rs.getTimestamp("completed_at");

        Long tableId = rs.getObject("table_id") != null ? rs.getLong("table_id") : null;

        return new Order(
                rs.getLong("id"),
                rs.getString("order_number"),
                rs.getString("order_type"),
                tableId,
                rs.getString("table_number"),
                rs.getString("zone"),
                rs.getString("customer_name"),
                rs.getString("customer_phone"),
                rs.getInt("guest_count"),
                rs.getBigDecimal("total_amount"),
                rs.getString("status"),
                rs.getString("payment_status"),
                rs.getString("special_notes"),
                createdTs != null ? createdTs.toInstant() : null,
                acceptedTs != null ? acceptedTs.toInstant() : null,
                readyTs != null ? readyTs.toInstant() : null,
                completedTs != null ? completedTs.toInstant() : null,
                Collections.emptyList()
        );
    };

    private final RowMapper<OrderItem> itemRowMapper = (rs, rowNum) -> {
        Timestamp createdTs = rs.getTimestamp("created_at");
        String dishSlug = null;
        try {
            dishSlug = rs.getString("dish_slug");
        } catch (Exception ignored) {}

        return new OrderItem(
                rs.getLong("id"),
                rs.getLong("order_id"),
                dishSlug,
                rs.getString("dish_name"),
                rs.getString("category"),
                rs.getString("station"),
                rs.getBigDecimal("unit_price"),
                rs.getInt("quantity"),
                rs.getString("spice_level"),
                rs.getString("item_status"),
                rs.getString("notes"),
                createdTs != null ? createdTs.toInstant() : null
        );
    };

    public List<Order> findAll(String status) {
        StringBuilder sql = new StringBuilder("""
                SELECT o.id, o.order_number, o.order_type, o.table_id, t.table_number, t.zone,
                       o.customer_name, o.customer_phone, o.guest_count, o.total_amount,
                       o.status, o.payment_status, o.special_notes, o.created_at,
                       o.accepted_at, o.ready_at, o.completed_at
                FROM orders o
                LEFT JOIN tables t ON t.id = o.table_id
                """);

        List<Object> params = new ArrayList<>();
        if (status != null && !status.isBlank()) {
            sql.append(" WHERE LOWER(o.status) = ? ");
            params.add(status.trim().toLowerCase());
        }
        sql.append(" ORDER BY o.id DESC");

        List<Order> orders = jdbc.query(sql.toString(), orderRowMapper, params.toArray());
        List<Order> fullOrders = new ArrayList<>(orders.size());
        for (Order o : orders) {
            List<OrderItem> items = findItemsByOrderId(o.id());
            fullOrders.add(o.withItems(items));
        }
        return fullOrders;
    }

    public Optional<Order> findById(long id) {
        String sql = """
                SELECT o.id, o.order_number, o.order_type, o.table_id, t.table_number, t.zone,
                       o.customer_name, o.customer_phone, o.guest_count, o.total_amount,
                       o.status, o.payment_status, o.special_notes, o.created_at,
                       o.accepted_at, o.ready_at, o.completed_at
                FROM orders o
                LEFT JOIN tables t ON t.id = o.table_id
                WHERE o.id = ?
                """;
        try {
            Order order = jdbc.queryForObject(sql, orderRowMapper, id);
            if (order != null) {
                List<OrderItem> items = findItemsByOrderId(order.id());
                return Optional.of(order.withItems(items));
            }
            return Optional.empty();
        } catch (EmptyResultDataAccessException ex) {
            return Optional.empty();
        }
    }

    public Optional<Order> findByOrderNumber(String orderNumber) {
        if (orderNumber == null || orderNumber.isBlank()) {
            return Optional.empty();
        }
        String clean = orderNumber.trim();
        String stripped = clean.startsWith("#") ? clean.substring(1).trim() : clean;
        String withOm = stripped.toUpperCase().startsWith("OM-") ? stripped : "OM-" + stripped;
        String withOmHash = "#" + (withOm.startsWith("#") ? withOm.substring(1) : withOm);

        String sql = """
                SELECT o.id, o.order_number, o.order_type, o.table_id, t.table_number, t.zone,
                       o.customer_name, o.customer_phone, o.guest_count, o.total_amount,
                       o.status, o.payment_status, o.special_notes, o.created_at,
                       o.accepted_at, o.ready_at, o.completed_at
                FROM orders o
                LEFT JOIN tables t ON t.id = o.table_id
                WHERE UPPER(o.order_number) = UPPER(?)
                   OR UPPER(o.order_number) = UPPER(?)
                   OR UPPER(o.order_number) = UPPER(?)
                   OR UPPER(o.order_number) = UPPER(?)
                ORDER BY o.id DESC
                LIMIT 1
                """;
        try {
            Order order = jdbc.queryForObject(sql, orderRowMapper, clean, stripped, withOm, withOmHash);
            if (order != null) {
                List<OrderItem> items = findItemsByOrderId(order.id());
                return Optional.of(order.withItems(items));
            }
            return Optional.empty();
        } catch (EmptyResultDataAccessException ex) {
            return Optional.empty();
        }
    }

    public List<Order> findByPhoneOrOrderNumber(String query) {
        if (query == null || query.isBlank()) {
            return Collections.emptyList();
        }
        String clean = query.trim();
        String stripped = clean.startsWith("#") ? clean.substring(1).trim() : clean;
        String withOm = stripped.toUpperCase().startsWith("OM-") ? stripped : "OM-" + stripped;
        String phoneDigits = clean.replaceAll("[^0-9]", "");
        String phonePattern = phoneDigits.length() >= 4 ? "%" + phoneDigits + "%" : "%__NO_MATCH__%";

        String sql = """
                SELECT o.id, o.order_number, o.order_type, o.table_id, t.table_number, t.zone,
                       o.customer_name, o.customer_phone, o.guest_count, o.total_amount,
                       o.status, o.payment_status, o.special_notes, o.created_at,
                       o.accepted_at, o.ready_at, o.completed_at
                FROM orders o
                LEFT JOIN tables t ON t.id = o.table_id
                WHERE UPPER(o.order_number) = UPPER(?)
                   OR UPPER(o.order_number) = UPPER(?)
                   OR UPPER(o.order_number) = UPPER(?)
                   OR (REPLACE(REPLACE(REPLACE(REPLACE(o.customer_phone, ' ', ''), '-', ''), '+', ''), '(', '') LIKE ?)
                ORDER BY o.id DESC
                LIMIT 5
                """;
        List<Order> orders = jdbc.query(sql, orderRowMapper, clean, stripped, withOm, phonePattern);
        List<Order> fullOrders = new ArrayList<>();
        for (Order o : orders) {
            fullOrders.add(o.withItems(findItemsByOrderId(o.id())));
        }
        return fullOrders;
    }

    public Optional<String> lockOrderForUpdate(long orderId) {
        try {
            return Optional.ofNullable(jdbc.queryForObject(
                    "SELECT status FROM orders WHERE id = ? FOR UPDATE",
                    String.class,
                    orderId
            ));
        } catch (EmptyResultDataAccessException ex) {
            return Optional.empty();
        }
    }

    public List<OrderItem> findItemsByOrderId(long orderId) {
        String sql = """
                SELECT id, order_id, dish_slug, dish_name, category, station, unit_price, quantity,
                       spice_level, item_status, notes, created_at
                FROM order_items
                WHERE order_id = ?
                ORDER BY id ASC
                """;
        return jdbc.query(sql, itemRowMapper, orderId);
    }

    public Optional<OrderItem> findItemById(long itemId) {
        String sql = """
                SELECT id, order_id, dish_slug, dish_name, category, station, unit_price, quantity,
                       spice_level, item_status, notes, created_at
                FROM order_items
                WHERE id = ?
                """;
        try {
            return Optional.ofNullable(jdbc.queryForObject(sql, itemRowMapper, itemId));
        } catch (EmptyResultDataAccessException ex) {
            return Optional.empty();
        }
    }

    public String generateNextOrderNumber() {
        try {
            Long nextVal = jdbc.queryForObject("SELECT nextval('order_number_seq')", Long.class);
            if (nextVal != null) {
                return String.format("OM-%04d", nextVal);
            }
        } catch (Exception ex) {
            // Fallback for environments where sequence is not supported
        }
        Long maxId = jdbc.queryForObject("SELECT COALESCE(MAX(id), 0) FROM orders", Long.class);
        return String.format("OM-%04d", (maxId != null ? maxId : 0L) + 1001);
    }

    public long insertOrder(String orderNumber, String orderType, Long tableId,
                            String customerName, String customerPhone, int guestCount,
                            BigDecimal totalAmount, String status, String paymentStatus,
                            String specialNotes, Instant createdAt) {
        String sql = """
                INSERT INTO orders (
                    order_number, order_type, table_id, customer_name, customer_phone,
                    guest_count, total_amount, status, payment_status, special_notes, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, new String[] { "id" });
            ps.setString(1, orderNumber);
            ps.setString(2, orderType);
            if (tableId != null) {
                ps.setLong(3, tableId);
            } else {
                ps.setNull(3, Types.BIGINT);
            }
            ps.setString(4, customerName);
            ps.setString(5, customerPhone);
            ps.setInt(6, guestCount);
            ps.setBigDecimal(7, totalAmount);
            ps.setString(8, status);
            ps.setString(9, paymentStatus);
            ps.setString(10, specialNotes);
            ps.setTimestamp(11, Timestamp.from(createdAt));
            return ps;
        }, keyHolder);

        if (keyHolder.getKeys() != null) {
            for (var entry : keyHolder.getKeys().entrySet()) {
                if ("id".equalsIgnoreCase(entry.getKey()) && entry.getValue() instanceof Number num) {
                    return num.longValue();
                }
            }
        }
        try {
            Number singleKey = keyHolder.getKey();
            if (singleKey != null) {
                return singleKey.longValue();
            }
        } catch (Exception ignored) {}

        Long generatedId = jdbc.queryForObject("SELECT id FROM orders WHERE order_number = ?", Long.class, orderNumber);
        return generatedId != null ? generatedId : 0L;
    }

    public long insertOrderItem(long orderId, String dishSlug, String dishName, String category,
                                String station, BigDecimal unitPrice, int quantity,
                                String spiceLevel, String itemStatus, String notes,
                                Instant createdAt) {
        String sql = """
                INSERT INTO order_items (
                    order_id, dish_slug, dish_name, category, station, unit_price, quantity,
                    spice_level, item_status, notes, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """;

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbc.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, new String[] { "id" });
            ps.setLong(1, orderId);
            ps.setString(2, dishSlug);
            ps.setString(3, dishName);
            ps.setString(4, category);
            ps.setString(5, station);
            ps.setBigDecimal(6, unitPrice);
            ps.setInt(7, quantity);
            ps.setString(8, spiceLevel);
            ps.setString(9, itemStatus);
            ps.setString(10, notes);
            ps.setTimestamp(11, Timestamp.from(createdAt));
            return ps;
        }, keyHolder);

        if (keyHolder.getKeys() != null) {
            for (var entry : keyHolder.getKeys().entrySet()) {
                if ("id".equalsIgnoreCase(entry.getKey()) && entry.getValue() instanceof Number num) {
                    return num.longValue();
                }
            }
        }
        try {
            Number singleKey = keyHolder.getKey();
            if (singleKey != null) {
                return singleKey.longValue();
            }
        } catch (Exception ignored) {}

        return 0L;
    }

    public void updateOrderStatus(long orderId, String newStatus, Instant acceptedAt,
                                  Instant readyAt, Instant completedAt) {
        StringBuilder sql = new StringBuilder("UPDATE orders SET status = ?");
        List<Object> params = new ArrayList<>();
        params.add(newStatus);

        if (acceptedAt != null) {
            sql.append(", accepted_at = ?");
            params.add(Timestamp.from(acceptedAt));
        }
        if (readyAt != null) {
            sql.append(", ready_at = ?");
            params.add(Timestamp.from(readyAt));
        }
        if (completedAt != null) {
            sql.append(", completed_at = ?");
            params.add(Timestamp.from(completedAt));
        }

        sql.append(" WHERE id = ?");
        params.add(orderId);

        jdbc.update(sql.toString(), params.toArray());
    }

    public void updateItemStatus(long itemId, String newStatus) {
        String sql = "UPDATE order_items SET item_status = ? WHERE id = ?";
        jdbc.update(sql, newStatus, itemId);
    }

    public boolean areAllItemsDone(long orderId) {
        Integer pendingCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM order_items WHERE order_id = ? AND item_status != 'done'",
                Integer.class,
                orderId
        );
        Integer totalCount = jdbc.queryForObject(
                "SELECT COUNT(*) FROM order_items WHERE order_id = ?",
                Integer.class,
                orderId
        );
        return totalCount != null && totalCount > 0 && pendingCount != null && pendingCount == 0;
    }

    public long getMaxOrderId() {
        Long maxId = jdbc.queryForObject("SELECT COALESCE(MAX(id), 0) FROM orders", Long.class);
        return maxId != null ? maxId : 0L;
    }
}
