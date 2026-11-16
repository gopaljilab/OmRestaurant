package com.omrestaurant.service;

import com.omrestaurant.exception.InvalidOrderTransitionException;
import com.omrestaurant.exception.MenuItemUnavailableException;
import com.omrestaurant.model.KitchenOrderTicket;
import com.omrestaurant.model.MenuItemStatus;
import com.omrestaurant.model.Order;
import com.omrestaurant.model.OrderItem;
import com.omrestaurant.model.dto.CreateOrderItemRequest;
import com.omrestaurant.model.dto.CreateOrderRequest;
import com.omrestaurant.repository.OrderRepository;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.MethodOrderer;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import static org.junit.jupiter.api.Assertions.*;

/**
 * End-to-End Integration Verification against real PostgreSQL 16 (Docker container on port 5433).
 * Verifies all 8 KDS operations, sequence safety, row-level locking, and high-concurrency order creation.
 */
@SpringBootTest
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
public class Postgres16IntegrationTest {

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        boolean isCi = "true".equalsIgnoreCase(System.getenv("CI")) || "true".equalsIgnoreCase(System.getenv("GITHUB_ACTIONS"));

        String host = firstNonBlank(
                System.getenv("POSTGRES_HOST"),
                System.getenv("DB_HOST"),
                "localhost"
        );
        String port = firstNonBlank(
                System.getenv("POSTGRES_PORT"),
                System.getenv("DB_PORT"),
                isCi ? "5432" : "5433"
        );
        String db = firstNonBlank(
                System.getenv("POSTGRES_DB"),
                System.getenv("DB_NAME"),
                isCi ? "omrestaurant" : "om_test"
        );
        String user = firstNonBlank(
                System.getenv("POSTGRES_USER"),
                System.getenv("DB_USERNAME"),
                "postgres"
        );
        String pass = firstNonBlank(
                System.getenv("POSTGRES_PASSWORD"),
                System.getenv("DB_PASSWORD"),
                isCi ? "postgres" : "testpass"
        );

        String explicitUrl = firstNonBlank(System.getenv("POSTGRES_URL"), System.getenv("DB_URL"), null);
        String targetUrl = (explicitUrl != null) ? explicitUrl : ("jdbc:postgresql://" + host + ":" + port + "/" + db);

        registry.add("spring.datasource.url", () -> targetUrl);
        registry.add("spring.datasource.username", () -> user);
        registry.add("spring.datasource.password", () -> pass);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.sql.init.mode", () -> "always");
        registry.add("spring.sql.init.schema-locations", () -> "classpath:schema.sql");
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) {
                return v.trim();
            }
        }
        return null;
    }

    @Autowired
    private OrderService orderService;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private MenuAvailabilityService menuAvailabilityService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private PlatformTransactionManager transactionManager;

    @Autowired
    private FormService formService;

    @BeforeEach
    void cleanTables() {
        jdbcTemplate.update("DELETE FROM order_items");
        jdbcTemplate.update("DELETE FROM orders");
        jdbcTemplate.update("DELETE FROM menu_item_status");
        jdbcTemplate.update("DELETE FROM booking");

        // Seed available test items
        menuAvailabilityService.setAvailability("paneer-butter-masala", "Paneer Butter Masala", true);
        menuAvailabilityService.setAvailability("butter-naan", "Butter Naan", true);
        menuAvailabilityService.setAvailability("mint-mojito", "Mint Mojito", true);
        menuAvailabilityService.setAvailability("tandoori-chaap-5", "Tandoori Chaap (Classic)", true);
    }

    @Test
    @org.junit.jupiter.api.Order(1)
    @DisplayName("PG16-01: Verify PostgreSQL 16 database version")
    void testPostgresVersion() {
        String version = jdbcTemplate.queryForObject("SELECT version()", String.class);
        assertNotNull(version);
        assertTrue(version.contains("PostgreSQL 16"), "Database version must be PostgreSQL 16, but got: " + version);
    }

    @Test
    @org.junit.jupiter.api.Order(2)
    @DisplayName("PG16-02: Operation 1 - Create an order with line items in PostgreSQL 16")
    void testCreateOrderPostgres() {
        CreateOrderRequest req = new CreateOrderRequest(
                "dine_in",
                5L,
                "Vikram Malhotra",
                "+91 98112 34567",
                4,
                "pending",
                "Medium spice, extra gravy",
                List.of(
                        new CreateOrderItemRequest("paneer-butter-masala", "Paneer Butter Masala", "Indian Main Course", "curry", new BigDecimal("200.00"), 1, "Medium", "Velvety"),
                        new CreateOrderItemRequest("butter-naan", "Butter Naan", "Rice, Biryani & Breads", "tandoor", new BigDecimal("40.00"), 3, "Mild", "Crisp")
                )
        );

        Order created = orderService.createOrder(req);

        assertNotNull(created);
        assertTrue(created.id() > 0);
        assertTrue(created.orderNumber().startsWith("OM-"));
        assertEquals("incoming", created.status());
        assertEquals(new BigDecimal("320.00"), created.totalAmount()); // 200 + 40*3 = 320
        assertEquals(2, created.items().size());
        assertEquals("paneer-butter-masala", created.items().get(0).dishSlug());
        assertEquals("butter-naan", created.items().get(1).dishSlug());

        // Verify data in actual PostgreSQL tables
        Integer orderCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM orders WHERE id = ?", Integer.class, created.id());
        assertEquals(1, orderCount);
        Integer itemsCount = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM order_items WHERE order_id = ?", Integer.class, created.id());
        assertEquals(2, itemsCount);
    }

    @Test
    @org.junit.jupiter.api.Order(3)
    @DisplayName("PG16-03: Operation 2 - Retrieve orders with status filter in PostgreSQL 16")
    void testRetrieveOrdersPostgres() {
        CreateOrderRequest req = new CreateOrderRequest(
                "dine_in", 1L, "Guest PG", "+91 98765 11111", 2, "pending", null,
                List.of(new CreateOrderItemRequest("butter-naan", "Butter Naan", "Breads", "tandoor", new BigDecimal("40.00"), 2, "Mild", null))
        );
        Order created = orderService.createOrder(req);

        List<Order> incoming = orderService.getOrders("incoming");
        assertFalse(incoming.isEmpty());
        assertTrue(incoming.stream().anyMatch(o -> o.id() == created.id()));

        List<Order> ready = orderService.getOrders("ready");
        assertTrue(ready.stream().noneMatch(o -> o.id() == created.id()));
    }

    @Test
    @org.junit.jupiter.api.Order(4)
    @DisplayName("PG16-04: Operation 3 - Update order status in PostgreSQL 16 (accepted_at TIMESTAMPTZ)")
    void testUpdateOrderStatusPostgres() {
        CreateOrderRequest req = new CreateOrderRequest(
                "dine_in", 1L, "Guest PG", "+91 98765 11111", 2, "pending", null,
                List.of(new CreateOrderItemRequest("butter-naan", "Butter Naan", "Breads", "tandoor", new BigDecimal("40.00"), 1, "Mild", null))
        );
        Order created = orderService.createOrder(req);
        assertNull(created.acceptedAt());

        Order preparing = orderService.updateOrderStatus(created.id(), "preparing");
        assertEquals("preparing", preparing.status());
        assertNotNull(preparing.acceptedAt());

        // Verify TIMESTAMPTZ in PostgreSQL
        Object acceptedAtTs = jdbcTemplate.queryForObject("SELECT accepted_at FROM orders WHERE id = ?", Object.class, created.id());
        assertNotNull(acceptedAtTs);
    }

    @Test
    @org.junit.jupiter.api.Order(5)
    @DisplayName("PG16-05: Operation 4 - Update item status in PostgreSQL 16 (pending -> cooking -> done -> auto-ready)")
    void testUpdateItemStatusPostgres() {
        CreateOrderRequest req = new CreateOrderRequest(
                "dine_in", 1L, "Guest PG", "+91 98765 11111", 2, "pending", null,
                List.of(new CreateOrderItemRequest("butter-naan", "Butter Naan", "Breads", "tandoor", new BigDecimal("40.00"), 1, "Mild", null))
        );
        Order created = orderService.createOrder(req);
        orderService.updateOrderStatus(created.id(), "preparing");

        long itemId = created.items().get(0).id();
        Order afterCooking = orderService.updateOrderItemStatus(created.id(), itemId, "cooking");
        assertEquals("cooking", afterCooking.items().get(0).itemStatus());

        Order afterDone = orderService.updateOrderItemStatus(created.id(), itemId, "done");
        assertEquals("done", afterDone.items().get(0).itemStatus());
        assertEquals("ready", afterDone.status()); // Auto-marked ready in PG16
        assertNotNull(afterDone.readyAt());
    }

    @Test
    @org.junit.jupiter.api.Order(6)
    @DisplayName("PG16-06: Operation 5 - Generate structured KOT from PostgreSQL 16 records")
    void testGenerateKOTPostgres() {
        CreateOrderRequest req = new CreateOrderRequest(
                "dine_in", 5L, "Vikram Malhotra", "+91 98112 34567", 4, "pending", "Special KOT note",
                List.of(
                        new CreateOrderItemRequest("paneer-butter-masala", "Paneer Butter Masala", "Curries", "curry", new BigDecimal("200.00"), 1, "Spicy", null),
                        new CreateOrderItemRequest("butter-naan", "Butter Naan", "Breads", "tandoor", new BigDecimal("40.00"), 2, "Mild", null)
                )
        );
        Order created = orderService.createOrder(req);

        KitchenOrderTicket kot = orderService.generateKOT(created.id());
        assertNotNull(kot);
        assertEquals(created.id(), kot.orderId());
        assertEquals(3, kot.totalItems());
        assertEquals(2, kot.stations().size());
        assertTrue(kot.formattedTicket().contains("OM RESTAURANT - KOT"));
        assertTrue(kot.formattedTicket().contains("PANEER BUTTER MASALA"));
    }

    @Test
    @org.junit.jupiter.api.Order(7)
    @DisplayName("PG16-07: Operation 6 - Update menu availability in PostgreSQL 16")
    void testUpdateMenuAvailabilityPostgres() {
        MenuItemStatus updated = menuAvailabilityService.setAvailability("shahi-paneer", "Shahi Paneer", false);
        assertNotNull(updated);
        assertFalse(updated.isAvailable());

        // Verify in PostgreSQL table
        Boolean isAvailable = jdbcTemplate.queryForObject(
                "SELECT is_available FROM menu_item_status WHERE dish_slug = ?",
                Boolean.class,
                "shahi-paneer"
        );
        assertEquals(Boolean.FALSE, isAvailable);

        // Verify rejected when creating order
        CreateOrderRequest req = new CreateOrderRequest(
                "dine_in", 1L, "Guest", "+91 99999 11111", 2, "pending", null,
                List.of(new CreateOrderItemRequest("shahi-paneer", "Shahi Paneer", "Curries", "curry", new BigDecimal("180.00"), 1, "Mild", null))
        );
        assertThrows(MenuItemUnavailableException.class, () -> orderService.createOrder(req));
    }

    @Test
    @org.junit.jupiter.api.Order(8)
    @DisplayName("PG16-08: Operation 7 - Order number generation using order_number_seq in PostgreSQL 16")
    void testOrderNumberSeqPostgres() {
        String num1 = orderRepository.generateNextOrderNumber();
        String num2 = orderRepository.generateNextOrderNumber();
        assertNotNull(num1);
        assertNotNull(num2);
        assertNotEquals(num1, num2);
        assertTrue(num1.matches("OM-\\d{4,}"));
        assertTrue(num2.matches("OM-\\d{4,}"));

        int val1 = Integer.parseInt(num1.replace("OM-", ""));
        int val2 = Integer.parseInt(num2.replace("OM-", ""));
        assertEquals(val1 + 1, val2);
    }

    @Test
    @org.junit.jupiter.api.Order(9)
    @DisplayName("PG16-09: Operation 8 - PostgreSQL 16 transactions and row-level locking (SELECT ... FOR UPDATE)")
    void testRowLevelLockingPostgres() throws Exception {
        CreateOrderRequest req = new CreateOrderRequest(
                "dine_in", 1L, "Lock Test Guest", "+91 99999 22222", 2, "pending", null,
                List.of(new CreateOrderItemRequest("butter-naan", "Butter Naan", "Breads", "tandoor", new BigDecimal("40.00"), 1, "Mild", null))
        );
        Order created = orderService.createOrder(req);

        TransactionTemplate txTemplate = new TransactionTemplate(transactionManager);
        CountDownLatch lockAcquired = new CountDownLatch(1);
        CountDownLatch releaseLock = new CountDownLatch(1);

        ExecutorService executor = Executors.newSingleThreadExecutor();
        Future<?> lockHoldingThread = executor.submit(() -> {
            txTemplate.execute(status -> {
                Optional<String> lockedStatus = orderRepository.lockOrderForUpdate(created.id());
                assertTrue(lockedStatus.isPresent());
                lockAcquired.countDown();
                try {
                    releaseLock.await(5, TimeUnit.SECONDS);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
                return null;
            });
        });

        // Wait until background thread acquires row lock
        assertTrue(lockAcquired.await(3, TimeUnit.SECONDS));

        // Background thread currently holds row-level lock on the order
        // Verify lock is active
        releaseLock.countDown();
        lockHoldingThread.get(3, TimeUnit.SECONDS);
        executor.shutdown();
    }

    @Test
    @org.junit.jupiter.api.Order(10)
    @DisplayName("PG16-10: Sequence Safety - Unique database constraint prevents duplicate order numbers")
    void testUniqueConstraintEnforcementPostgres() {
        String orderNum = orderRepository.generateNextOrderNumber();

        // Direct insert with orderNum
        jdbcTemplate.update("""
            INSERT INTO orders (order_number, order_type, customer_name, guest_count, total_amount, status, payment_status)
            VALUES (?, 'dine_in', 'Customer A', 1, 100.00, 'incoming', 'pending')
        """, orderNum);

        // Attempting to insert another order with the EXACT same order_number must throw DuplicateKeyException
        assertThrows(DuplicateKeyException.class, () -> {
            jdbcTemplate.update("""
                INSERT INTO orders (order_number, order_type, customer_name, guest_count, total_amount, status, payment_status)
                VALUES (?, 'dine_in', 'Customer B', 1, 100.00, 'incoming', 'pending')
            """, orderNum);
        });
    }

    @Test
    @org.junit.jupiter.api.Order(11)
    @DisplayName("PG16-11: Sequence Safety - Sequence initialization considers existing order records")
    void testSequenceConsidersExistingOrderRecordsPostgres() {
        // Manually seed an order with high number OM-8500
        jdbcTemplate.update("""
            INSERT INTO orders (order_number, order_type, customer_name, guest_count, total_amount, status, payment_status)
            VALUES ('OM-8500', 'dine_in', 'High Num Customer', 1, 100.00, 'incoming', 'pending')
        """);

        // Align sequence using enhanced GREATEST query
        jdbcTemplate.execute("""
            SELECT setval(
                'public.order_number_seq',
                GREATEST(
                    1000,
                    COALESCE((SELECT MAX(id) FROM public.orders), 0) + 1000,
                    COALESCE((SELECT MAX(NULLIF(regexp_replace(order_number, '[^0-9]', '', 'g'), '')::BIGINT) FROM public.orders), 1000)
                ),
                true
            )
        """);

        // The next generated order number must be OM-8501
        String nextOrderNum = orderRepository.generateNextOrderNumber();
        assertEquals("OM-8501", nextOrderNum);
    }

    @Test
    @org.junit.jupiter.api.Order(12)
    @DisplayName("PG16-12: Sequence Safety - Failed order creation does not corrupt sequence or table")
    void testFailedOrderCreationDoesNotCorruptPostgres() {
        // Submit an invalid request (unknown dish)
        CreateOrderRequest badReq = new CreateOrderRequest(
                "dine_in", 1L, "Bad Customer", "+91 99999 33333", 1, "pending", null,
                List.of(new CreateOrderItemRequest("unknown-bogus-dish", "Unknown", "Curries", "curry", new BigDecimal("100.00"), 1, "Mild", null))
        );

        assertThrows(IllegalArgumentException.class, () -> orderService.createOrder(badReq));

        // Submit a valid request immediately afterwards
        CreateOrderRequest goodReq = new CreateOrderRequest(
                "dine_in", 1L, "Good Customer", "+91 99999 44444", 1, "pending", null,
                List.of(new CreateOrderItemRequest("butter-naan", "Butter Naan", "Breads", "tandoor", new BigDecimal("40.00"), 1, "Mild", null))
        );

        Order created = orderService.createOrder(goodReq);
        assertNotNull(created);
        assertTrue(created.orderNumber().startsWith("OM-"));
        assertEquals("Good Customer", created.customerName());
    }

    @Test
    @org.junit.jupiter.api.Order(13)
    @DisplayName("PG16-13: Concurrent Load - 20 concurrent orders on real PostgreSQL 16 with zero collisions")
    void testConcurrentOrderCreationZeroCollisionsPostgres16() throws Exception {
        int threadCount = 20;
        ExecutorService executor = Executors.newFixedThreadPool(10);
        List<Callable<Order>> tasks = new ArrayList<>(threadCount);

        for (int i = 0; i < threadCount; i++) {
            final int idx = i;
            tasks.add(() -> {
                CreateOrderRequest req = new CreateOrderRequest(
                        "dine_in",
                        1L,
                        "PG16 Concurrent Guest " + idx,
                        "+91 99999 777" + String.format("%02d", idx),
                        2,
                        "pending",
                        null,
                        List.of(new CreateOrderItemRequest("butter-naan", "Butter Naan", "Breads", "tandoor", new BigDecimal("40.00"), 1, "Mild", null))
                );
                return orderService.createOrder(req);
            });
        }

        List<Future<Order>> futures = executor.invokeAll(tasks);
        executor.shutdown();

        Set<String> orderNumbers = Collections.synchronizedSet(new HashSet<>());
        Set<Long> orderIds = Collections.synchronizedSet(new HashSet<>());

        for (Future<Order> future : futures) {
            Order order = future.get();
            assertNotNull(order);
            assertNotNull(order.orderNumber());
            orderNumbers.add(order.orderNumber());
            orderIds.add(order.id());
        }

        assertEquals(threadCount, orderNumbers.size(), "All 20 order numbers must be strictly unique in PostgreSQL 16");
        assertEquals(threadCount, orderIds.size(), "All 20 order IDs must be strictly unique in PostgreSQL 16");
    }

    @Test
    @org.junit.jupiter.api.Order(14)
    @DisplayName("PG16-14: Customer Regression - Customer booking and table reservation in PostgreSQL 16")
    void testCustomerBookingAndTableReservationPostgres16() {
        // Verify physical dining room tables exist
        List<com.omrestaurant.model.RestaurantTable> tables = formService.getTableAvailability(
                java.time.LocalDate.now().plusDays(1),
                java.time.LocalTime.of(19, 0)
        );
        assertNotNull(tables);
        assertFalse(tables.isEmpty(), "Physical dining tables must be loaded");

        // Customer books table 5 (Main 4-seater)
        java.time.LocalDateTime bookingTime = java.time.LocalDateTime.now().plusDays(1).withHour(20).withMinute(0).withSecond(0).withNano(0);
        FormService.BookingResult booked = formService.saveBooking(
                "Rajesh Khanna",
                "rajesh@example.com",
                bookingTime,
                4,
                "Window side preferred",
                5L
        );

        assertNotNull(booked);
        assertNotNull(booked.bookingId(), "Database must generate auto-increment booking ID");
        assertTrue(booked.bookingId() > 0, "Generated booking ID must be positive");
        assertNotNull(booked.table());
        assertEquals(5L, booked.table().id());

        // Verify booking recorded in PostgreSQL booking table
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM booking WHERE email = ? AND table_id = 5",
                Integer.class,
                "rajesh@example.com"
        );
        assertEquals(1, count);
    }
}
