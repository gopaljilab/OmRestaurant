package com.omrestaurant.service;

import com.omrestaurant.exception.InvalidOrderTransitionException;
import com.omrestaurant.exception.MenuItemUnavailableException;
import com.omrestaurant.exception.OrderItemNotFoundException;
import com.omrestaurant.exception.OrderNotFoundException;
import com.omrestaurant.model.KitchenOrderTicket;
import com.omrestaurant.model.MenuItemStatus;
import com.omrestaurant.model.Order;
import com.omrestaurant.model.OrderItem;
import com.omrestaurant.model.dto.CreateOrderItemRequest;
import com.omrestaurant.model.dto.CreateOrderRequest;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
public class OrderServiceTest {

    @Autowired
    private OrderService orderService;

    @Autowired
    private MenuAvailabilityService menuAvailabilityService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        jdbcTemplate.update("DELETE FROM order_items");
        jdbcTemplate.update("DELETE FROM orders");
        jdbcTemplate.update("DELETE FROM menu_item_status");

        // Seed available items
        menuAvailabilityService.setAvailability("paneer-butter-masala", "Paneer Butter Masala", true);
        menuAvailabilityService.setAvailability("butter-naan", "Butter Naan", true);
        menuAvailabilityService.setAvailability("mint-mojito", "Mint Mojito", true);
        menuAvailabilityService.setAvailability("paneer-toofani", "Paneer Toofani", true);
        menuAvailabilityService.setAvailability("shahi-paneer", "Shahi Paneer", true);
    }

    @Test
    @DisplayName("1. Create an order with multiple items and calculate total correctly on server")
    void testCreateOrderWithMultipleItems() {
        CreateOrderRequest req = new CreateOrderRequest(
                "dine_in",
                5L,
                "Vikram Malhotra",
                "+91 98112 34567",
                4,
                "pending",
                "Medium spice",
                List.of(
                        new CreateOrderItemRequest("paneer-butter-masala", "Paneer Butter Masala", "Indian Main Course", "curry", new BigDecimal("200.00"), 1, "Medium", "Velvety gravy"),
                        new CreateOrderItemRequest("butter-naan", "Butter Naan", "Rice, Biryani & Breads", "tandoor", new BigDecimal("40.00"), 3, "Mild", "Crisp"),
                        new CreateOrderItemRequest("mint-mojito", "Mint Mojito", "Beverages & Shakes", "beverage", new BigDecimal("100.00"), 2, "Mild", "Chilled")
                )
        );

        Order order = orderService.createOrder(req);

        assertNotNull(order);
        assertTrue(order.id() > 0);
        assertTrue(order.orderNumber().startsWith("OM-"));
        assertEquals("dine_in", order.orderType());
        assertEquals(5L, order.tableId());
        assertEquals("5", order.tableNumber());
        assertEquals("Main", order.zone());
        assertEquals("Vikram Malhotra", order.customerName());
        assertEquals("incoming", order.status());

        // Total: 200*1 + 40*3 (120) + 100*2 (200) = 520.00
        assertEquals(new BigDecimal("520.00"), order.totalAmount());
        assertNotNull(order.items());
        assertEquals(3, order.items().size());
        assertEquals("pending", order.items().get(0).itemStatus());
        assertEquals("paneer-butter-masala", order.items().get(0).dishSlug());
    }

    @Test
    @DisplayName("2. Generate unique sequential order numbers")
    void testUniqueOrderNumbers() {
        CreateOrderRequest req1 = new CreateOrderRequest(
                "dine_in", 1L, "Guest 1", "123", 2, "pending", null,
                List.of(new CreateOrderItemRequest("butter-naan", "Butter Naan", "Breads", "tandoor", new BigDecimal("40.00"), 1, "Mild", null))
        );
        CreateOrderRequest req2 = new CreateOrderRequest(
                "dine_in", 2L, "Guest 2", "456", 2, "pending", null,
                List.of(new CreateOrderItemRequest("mint-mojito", "Mint Mojito", "Beverages & Shakes", "beverage", new BigDecimal("100.00"), 1, "Mild", null))
        );

        Order o1 = orderService.createOrder(req1);
        Order o2 = orderService.createOrder(req2);

        assertNotEquals(o1.orderNumber(), o2.orderNumber());
        assertTrue(o1.orderNumber().startsWith("OM-"));
        assertTrue(o2.orderNumber().startsWith("OM-"));
    }

    @Test
    @DisplayName("3. Retrieve orders and filter by status")
    void testRetrieveOrdersWithFilter() {
        CreateOrderRequest req = new CreateOrderRequest(
                "dine_in", 1L, "Guest 1", "123", 2, "pending", null,
                List.of(new CreateOrderItemRequest("butter-naan", "Butter Naan", "Breads", "tandoor", new BigDecimal("40.00"), 1, "Mild", null))
        );
        Order created = orderService.createOrder(req);

        List<Order> incoming = orderService.getOrders("incoming");
        assertFalse(incoming.isEmpty());
        assertTrue(incoming.stream().anyMatch(o -> o.id() == created.id()));

        List<Order> ready = orderService.getOrders("ready");
        assertTrue(ready.stream().noneMatch(o -> o.id() == created.id()));
    }

    @Test
    @DisplayName("4. Accept incoming order moves it to preparing and records accepted_at")
    void testAcceptIncomingOrder() {
        CreateOrderRequest req = new CreateOrderRequest(
                "dine_in", 1L, "Guest", "123", 2, "pending", null,
                List.of(new CreateOrderItemRequest("butter-naan", "Butter Naan", "Breads", "tandoor", new BigDecimal("40.00"), 1, "Mild", null))
        );
        Order created = orderService.createOrder(req);
        assertNull(created.acceptedAt());

        Order preparing = orderService.updateOrderStatus(created.id(), "preparing");
        assertEquals("preparing", preparing.status());
        assertNotNull(preparing.acceptedAt());
    }

    @Test
    @DisplayName("5. Update item through pending -> cooking -> done")
    void testUpdateItemStatusCycle() {
        CreateOrderRequest req = new CreateOrderRequest(
                "dine_in", 1L, "Guest", "123", 2, "pending", null,
                List.of(new CreateOrderItemRequest("butter-naan", "Butter Naan", "Breads", "tandoor", new BigDecimal("40.00"), 1, "Mild", null))
        );
        Order created = orderService.createOrder(req);
        OrderItem item = created.items().get(0);
        assertEquals("pending", item.itemStatus());

        Order afterCooking = orderService.updateOrderItemStatus(created.id(), item.id(), "cooking");
        assertEquals("cooking", afterCooking.items().get(0).itemStatus());

        Order afterDone = orderService.updateOrderItemStatus(created.id(), item.id(), "done");
        assertEquals("done", afterDone.items().get(0).itemStatus());
    }

    @Test
    @DisplayName("6. Automatically mark order ready when every item is done and record ready_at")
    void testAutoMarkOrderReadyWhenAllItemsDone() {
        CreateOrderRequest req = new CreateOrderRequest(
                "dine_in", 1L, "Guest", "123", 2, "pending", null,
                List.of(
                        new CreateOrderItemRequest("butter-naan", "Butter Naan", "Breads", "tandoor", new BigDecimal("40.00"), 1, "Mild", null),
                        new CreateOrderItemRequest("mint-mojito", "Mint Mojito", "Beverages & Shakes", "beverage", new BigDecimal("100.00"), 1, "Mild", null)
                )
        );
        Order created = orderService.createOrder(req);
        orderService.updateOrderStatus(created.id(), "preparing");

        long item1Id = created.items().get(0).id();
        long item2Id = created.items().get(1).id();

        // Mark item 1 done
        Order intermediate = orderService.updateOrderItemStatus(created.id(), item1Id, "done");
        assertEquals("preparing", intermediate.status()); // Still preparing because item 2 is pending
        assertNull(intermediate.readyAt());

        // Mark item 2 done
        Order finalOrder = orderService.updateOrderItemStatus(created.id(), item2Id, "done");
        assertEquals("ready", finalOrder.status());
        assertNotNull(finalOrder.readyAt());
    }

    @Test
    @DisplayName("7. Reject invalid status transitions")
    void testRejectInvalidStatusTransitions() {
        CreateOrderRequest req = new CreateOrderRequest(
                "dine_in", 1L, "Guest", "123", 2, "pending", null,
                List.of(new CreateOrderItemRequest("butter-naan", "Butter Naan", "Breads", "tandoor", new BigDecimal("40.00"), 1, "Mild", null))
        );
        Order created = orderService.createOrder(req);

        // incoming cannot jump directly to completed
        assertThrows(InvalidOrderTransitionException.class, () ->
                orderService.updateOrderStatus(created.id(), "completed")
        );

        // Cancel order, then attempt to transition it
        orderService.updateOrderStatus(created.id(), "cancelled");
        assertThrows(InvalidOrderTransitionException.class, () ->
                orderService.updateOrderStatus(created.id(), "preparing")
        );
    }

    @Test
    @DisplayName("8. Reject item update for wrong order")
    void testRejectItemUpdateForWrongOrder() {
        CreateOrderRequest req1 = new CreateOrderRequest(
                "dine_in", 1L, "Guest 1", "123", 2, "pending", null,
                List.of(new CreateOrderItemRequest("butter-naan", "Butter Naan", "Breads", "tandoor", new BigDecimal("40.00"), 1, "Mild", null))
        );
        CreateOrderRequest req2 = new CreateOrderRequest(
                "dine_in", 2L, "Guest 2", "456", 2, "pending", null,
                List.of(new CreateOrderItemRequest("mint-mojito", "Mint Mojito", "Beverages & Shakes", "beverage", new BigDecimal("100.00"), 1, "Mild", null))
        );

        Order o1 = orderService.createOrder(req1);
        Order o2 = orderService.createOrder(req2);

        long item1Id = o1.items().get(0).id();

        // Attempt to update item1 using order2's ID
        assertThrows(OrderItemNotFoundException.class, () ->
                orderService.updateOrderItemStatus(o2.id(), item1Id, "cooking")
        );
    }

    @Test
    @DisplayName("9. Prevent unavailable menu items from being added to orders")
    void testRejectUnavailableMenuItem() {
        // Mark item 86'd
        menuAvailabilityService.setAvailability("paneer-toofani", "Paneer Toofani", false);

        CreateOrderRequest req = new CreateOrderRequest(
                "dine_in", 1L, "Guest", "123", 2, "pending", null,
                List.of(new CreateOrderItemRequest("paneer-toofani", "Paneer Toofani", "Curries", "curry", new BigDecimal("240.00"), 1, "Mild", null))
        );

        assertThrows(MenuItemUnavailableException.class, () ->
                orderService.createOrder(req)
        );
    }

    @Test
    @DisplayName("10. Reject unknown station values or unknown menu dishes")
    void testRejectInvalidStationOrUnknownDish() {
        CreateOrderRequest req = new CreateOrderRequest(
                "dine_in", 1L, "Guest", "123", 2, "pending", null,
                List.of(new CreateOrderItemRequest("unknown-dish-xyz", "Unknown Dish", "Custom", "bakery", new BigDecimal("100.00"), 1, "Mild", null))
        );

        assertThrows(IllegalArgumentException.class, () ->
                orderService.createOrder(req)
        );
    }

    @Test
    @DisplayName("11. Generate structured KOT with station grouping and thermal text")
    void testGenerateKOT() {
        CreateOrderRequest req = new CreateOrderRequest(
                "dine_in", 5L, "Vikram Malhotra", "+91 98112 34567", 4, "pending", "Extra hot gravy",
                List.of(
                        new CreateOrderItemRequest("paneer-butter-masala", "Paneer Butter Masala", "Curries", "curry", new BigDecimal("200.00"), 1, "Spicy", "Hot"),
                        new CreateOrderItemRequest("butter-naan", "Butter Naan", "Breads", "tandoor", new BigDecimal("40.00"), 2, "Mild", "Crisp")
                )
        );
        Order created = orderService.createOrder(req);

        KitchenOrderTicket kot = orderService.generateKOT(created.id());
        assertNotNull(kot);
        assertEquals(created.id(), kot.orderId());
        assertEquals("5", kot.tableNumber());
        assertEquals("Main", kot.zone());
        assertEquals(3, kot.totalItems());
        assertEquals(2, kot.stations().size()); // curry and tandoor
        assertNotNull(kot.formattedTicket());
        assertTrue(kot.formattedTicket().contains("OM RESTAURANT - KOT"));
        assertTrue(kot.formattedTicket().contains("TABLE : 5"));
        assertTrue(kot.formattedTicket().contains("PANEER BUTTER MASALA"));
    }

    @Test
    @DisplayName("12. Update menu availability")
    void testUpdateMenuAvailability() {
        MenuItemStatus updated = menuAvailabilityService.setAvailability("shahi-paneer", "Shahi Paneer", false);
        assertNotNull(updated);
        assertFalse(updated.isAvailable());

        List<MenuItemStatus> unavailable = menuAvailabilityService.getAvailability(true);
        assertTrue(unavailable.stream().anyMatch(m -> "shahi-paneer".equals(m.dishSlug())));
    }

    @Test
    @DisplayName("13. Handle missing order with OrderNotFoundException")
    void testMissingOrder() {
        assertThrows(OrderNotFoundException.class, () ->
                orderService.getOrderById(999999L)
        );
    }

    @Test
    @DisplayName("14. Reject price tampering on client order request")
    void testRejectPriceTampering() {
        // Paneer Butter Masala official catalog price is 200.00
        // Client attempts to pass 1.00
        CreateOrderRequest tamperedReq = new CreateOrderRequest(
                "dine_in", 1L, "Price Hacker", "123", 1, "pending", null,
                List.of(new CreateOrderItemRequest("paneer-butter-masala", "Paneer Butter Masala", "Curry", "curry", new BigDecimal("1.00"), 1, "Mild", null))
        );

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class, () ->
                orderService.createOrder(tamperedReq)
        );
        assertTrue(ex.getMessage().contains("Invalid price"));

        // Omission of unit_price should automatically use authoritative 200.00
        CreateOrderRequest validReq = new CreateOrderRequest(
                "dine_in", 1L, "Honest Customer", "123", 1, "pending", null,
                List.of(new CreateOrderItemRequest("paneer-butter-masala", "Paneer Butter Masala", "Curry", "curry", null, 1, "Mild", null))
        );
        Order created = orderService.createOrder(validReq);
        assertEquals(new BigDecimal("200.00"), created.totalAmount());
    }

    @Test
    @DisplayName("15. Order cannot transition to ready while items are not done")
    void testOrderCannotBeReadyWhileItemsPending() {
        CreateOrderRequest req = new CreateOrderRequest(
                "dine_in", 1L, "Guest", "123", 2, "pending", null,
                List.of(new CreateOrderItemRequest("butter-naan", "Butter Naan", "Breads", "tandoor", new BigDecimal("40.00"), 2, "Mild", null))
        );
        Order created = orderService.createOrder(req);
        orderService.updateOrderStatus(created.id(), "preparing");

        // Attempting to transition order to ready while items are pending must fail
        assertThrows(InvalidOrderTransitionException.class, () ->
                orderService.updateOrderStatus(created.id(), "ready")
        );

        // Update item to cooking, transition still fails
        orderService.updateOrderItemStatus(created.id(), created.items().get(0).id(), "cooking");
        assertThrows(InvalidOrderTransitionException.class, () ->
                orderService.updateOrderStatus(created.id(), "ready")
        );
    }

    @Test
    @DisplayName("16. Prevent item modification on terminal orders (completed/cancelled)")
    void testPreventItemModificationOnTerminalOrders() {
        CreateOrderRequest req = new CreateOrderRequest(
                "dine_in", 1L, "Guest", "123", 2, "pending", null,
                List.of(new CreateOrderItemRequest("butter-naan", "Butter Naan", "Breads", "tandoor", new BigDecimal("40.00"), 1, "Mild", null))
        );
        Order created = orderService.createOrder(req);
        long itemId = created.items().get(0).id();

        // Cancel order
        orderService.updateOrderStatus(created.id(), "cancelled");

        // Attempting to modify item on cancelled order must fail
        assertThrows(InvalidOrderTransitionException.class, () ->
                orderService.updateOrderItemStatus(created.id(), itemId, "cooking")
        );
    }

    @Test
    @DisplayName("17. Concurrency-safe order creation with zero collisions across 20 threads")
    void testConcurrentOrderCreationZeroCollisions() throws Exception {
        int threadCount = 20;
        ExecutorService executor = Executors.newFixedThreadPool(10);
        List<Callable<Order>> tasks = new ArrayList<>(threadCount);

        for (int i = 0; i < threadCount; i++) {
            final int idx = i;
            tasks.add(() -> {
                CreateOrderRequest req = new CreateOrderRequest(
                        "dine_in",
                        1L,
                        "Concurrent Guest " + idx,
                        "+91 99999 000" + String.format("%02d", idx),
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

        // All 20 order numbers and order IDs must be strictly unique
        assertEquals(threadCount, orderNumbers.size(), "Duplicate order number detected in concurrent load test!");
        assertEquals(threadCount, orderIds.size(), "Duplicate order ID detected in concurrent load test!");
    }
}
