package com.omrestaurant.web;

import com.omrestaurant.model.dto.CreateOrderItemRequest;
import com.omrestaurant.model.dto.CreateOrderRequest;
import com.omrestaurant.service.MenuAvailabilityService;
import com.omrestaurant.service.OrderService;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@Transactional
public class OrderControllerTest {

    private MockMvc mockMvc;

    @Autowired
    private OrderController orderController;

    @Autowired
    private TrackOrderAliasController trackOrderAliasController;

    @Autowired
    private MenuAvailabilityController menuAvailabilityController;

    @Autowired
    private KitchenExceptionHandler exceptionHandler;

    @Autowired
    private OrderService orderService;

    @Autowired
    private MenuAvailabilityService menuAvailabilityService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(orderController, menuAvailabilityController, trackOrderAliasController)
                .setControllerAdvice(exceptionHandler)
                .build();

        jdbcTemplate.update("DELETE FROM order_items");
        jdbcTemplate.update("DELETE FROM orders");
        jdbcTemplate.update("DELETE FROM menu_item_status");

        menuAvailabilityService.setAvailability("paneer-butter-masala", "Paneer Butter Masala", true);
        menuAvailabilityService.setAvailability("butter-naan", "Butter Naan", true);
        menuAvailabilityService.setAvailability("mint-mojito", "Mint Mojito", true);
    }

    @Test
    @DisplayName("POST /api/orders creates order with 201 Created and server-calculated total")
    void testCreateOrderEndpoint() throws Exception {
        String json = """
                {
                    "order_type": "dine_in",
                    "table_id": 5,
                    "customer_name": "Aarav Sharma",
                    "customer_phone": "+91 98765 43210",
                    "guest_count": 2,
                    "payment_status": "pending",
                    "special_notes": "Spicy",
                    "items": [
                        {
                            "dish_name": "Paneer Butter Masala",
                            "category": "Curry",
                            "station": "curry",
                            "unit_price": 200.00,
                            "quantity": 1,
                            "spice_level": "Spicy"
                        },
                        {
                            "dish_name": "Butter Naan",
                            "category": "Breads",
                            "station": "tandoor",
                            "unit_price": 40.00,
                            "quantity": 2,
                            "spice_level": "Mild"
                        }
                    ]
                }
                """;

        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", containsString("/api/orders/")))
                .andExpect(jsonPath("$.order_number", startsWith("OM-")))
                .andExpect(jsonPath("$.customer_name", is("Aarav Sharma")))
                .andExpect(jsonPath("$.status", is("incoming")))
                .andExpect(jsonPath("$.total_amount", is(280.00)))
                .andExpect(jsonPath("$.items", hasSize(2)));
    }

    @Test
    @DisplayName("POST /api/orders rejects price tampering with 400 Bad Request")
    void testPriceTamperingRejected() throws Exception {
        String json = """
                {
                    "order_type": "dine_in",
                    "table_id": 5,
                    "customer_name": "Price Hacker",
                    "items": [
                        {
                            "dish_slug": "paneer-butter-masala",
                            "dish_name": "Paneer Butter Masala",
                            "unit_price": 1.00,
                            "quantity": 1
                        }
                    ]
                }
                """;

        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.ok", is(false)))
                .andExpect(jsonPath("$.status", is("invalid-argument")))
                .andExpect(jsonPath("$.error", containsString("Invalid price")));
    }

    @Test
    @DisplayName("GET /api/orders returns list of active orders")
    void testGetOrdersEndpoint() throws Exception {
        CreateOrderRequest req = new CreateOrderRequest(
                "dine_in", 1L, "Guest", "123", 2, "pending", null,
                List.of(new CreateOrderItemRequest("butter-naan", "Butter Naan", "Breads", "tandoor", new BigDecimal("40.00"), 1, "Mild", null))
        );
        orderService.createOrder(req);

        mockMvc.perform(get("/api/orders"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", not(empty())))
                .andExpect(jsonPath("$[0].customer_name", is("Guest")));
    }

    @Test
    @DisplayName("GET /api/orders/{id} returns 404 for missing order")
    void testGetOrderNotFound() throws Exception {
        mockMvc.perform(get("/api/orders/999999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.ok", is(false)))
                .andExpect(jsonPath("$.status", is("order-not-found")));
    }

    @Test
    @DisplayName("PATCH /api/orders/{id}/status transitions order to preparing")
    void testPatchOrderStatus() throws Exception {
        CreateOrderRequest req = new CreateOrderRequest(
                "dine_in", 1L, "Guest", "123", 2, "pending", null,
                List.of(new CreateOrderItemRequest("butter-naan", "Butter Naan", "Breads", "tandoor", new BigDecimal("40.00"), 1, "Mild", null))
        );
        var created = orderService.createOrder(req);

        String json = """
                {
                    "status": "preparing"
                }
                """;

        mockMvc.perform(patch("/api/orders/" + created.id() + "/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status", is("preparing")))
                .andExpect(jsonPath("$.accepted_at", notNullValue()));
    }

    @Test
    @DisplayName("PATCH /api/orders/{id}/status to ready rejected if items are pending")
    void testPatchOrderStatusToReadyFailsWhenItemsPending() throws Exception {
        CreateOrderRequest req = new CreateOrderRequest(
                "dine_in", 1L, "Guest", "123", 2, "pending", null,
                List.of(new CreateOrderItemRequest("butter-naan", "Butter Naan", "Breads", "tandoor", new BigDecimal("40.00"), 1, "Mild", null))
        );
        var created = orderService.createOrder(req);
        orderService.updateOrderStatus(created.id(), "preparing");

        String json = """
                {
                    "status": "ready"
                }
                """;

        mockMvc.perform(patch("/api/orders/" + created.id() + "/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.ok", is(false)))
                .andExpect(jsonPath("$.status", is("invalid-transition")));
    }

    @Test
    @DisplayName("PATCH /api/orders/{id}/items/{itemId} updates item cooking state")
    void testPatchItemStatus() throws Exception {
        CreateOrderRequest req = new CreateOrderRequest(
                "dine_in", 1L, "Guest", "123", 2, "pending", null,
                List.of(new CreateOrderItemRequest("butter-naan", "Butter Naan", "Breads", "tandoor", new BigDecimal("40.00"), 1, "Mild", null))
        );
        var created = orderService.createOrder(req);
        long itemId = created.items().get(0).id();

        String json = """
                {
                    "status": "cooking"
                }
                """;

        mockMvc.perform(patch("/api/orders/" + created.id() + "/items/" + itemId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].item_status", is("cooking")));
    }

    @Test
    @DisplayName("GET /api/orders/{id}/kot returns thermal formatted ticket payload")
    void testGetKOTEndpoint() throws Exception {
        CreateOrderRequest req = new CreateOrderRequest(
                "dine_in", 5L, "KOT Guest", "123", 2, "pending", "No onions",
                List.of(new CreateOrderItemRequest("butter-naan", "Butter Naan", "Breads", "tandoor", new BigDecimal("40.00"), 2, "Mild", null))
        );
        var created = orderService.createOrder(req);

        mockMvc.perform(get("/api/orders/" + created.id() + "/kot"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.order_id", is((int) created.id())))
                .andExpect(jsonPath("$.table_number", is("5")))
                .andExpect(jsonPath("$.total_items", is(2)))
                .andExpect(jsonPath("$.stations", hasSize(1)))
                .andExpect(jsonPath("$.formatted_ticket", containsString("OM RESTAURANT - KOT")));
    }

    @Test
    @DisplayName("GET & POST /api/menu/availability toggles dish stock status")
    void testMenuAvailabilityEndpoints() throws Exception {
        String json = """
                {
                    "dish_slug": "paneer-butter-masala",
                    "dish_name": "Paneer Butter Masala",
                    "is_available": false
                }
                """;

        mockMvc.perform(post("/api/menu/availability")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dish_slug", is("paneer-butter-masala")))
                .andExpect(jsonPath("$.is_available", is(false)));

        mockMvc.perform(get("/api/menu/availability?unavailable_only=true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].dish_slug", is("paneer-butter-masala")));
    }

    @Test
    @DisplayName("GET /api/menu/items returns all 174 authoritative catalog items with availability")
    void testGetAllCatalogItems() throws Exception {
        mockMvc.perform(get("/api/menu/items"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(174)))
                .andExpect(jsonPath("$[0].dish_slug", notNullValue()))
                .andExpect(jsonPath("$[0].dish_name", notNullValue()))
                .andExpect(jsonPath("$[0].unit_price", notNullValue()))
                .andExpect(jsonPath("$[0].is_available", is(true)));
    }

    @Test
    @DisplayName("POST /api/orders rejects invalid station or negative price with 400 Bad Request")
    void testValidationFailure() throws Exception {
        String badJson = """
                {
                    "order_type": "dine_in",
                    "customer_name": "",
                    "items": [
                        {
                            "dish_name": "Bad Item",
                            "category": "Cat",
                            "station": "invalid_station",
                            "unit_price": -10.00,
                            "quantity": 1
                        }
                    ]
                }
                """;

        mockMvc.perform(post("/api/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(badJson))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.ok", is(false)));
    }

    @Test
    @DisplayName("GET /api/orders/track and /api/track-order finds order by order_number (case-insensitive) and phone")
    void testTrackOrder() throws Exception {
        CreateOrderRequest req = new CreateOrderRequest(
                "dine_in",
                1L,
                "Track Customer",
                "+91 98888 12345",
                2,
                "pending",
                "Table near window",
                List.of(new CreateOrderItemRequest("paneer-butter-masala", "Paneer Butter Masala", "Curries", "curry", new BigDecimal("200.00"), 1, "Medium", null))
        );
        com.omrestaurant.model.Order created = orderService.createOrder(req);

        // 1. Track by exact order_number via /api/orders/track
        mockMvc.perform(get("/api/orders/track").param("query", created.orderNumber()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.order_number", is(created.orderNumber())))
                .andExpect(jsonPath("$.customer_name", is("Track Customer")))
                .andExpect(jsonPath("$.items", hasSize(1)));

        // 2. Track via /api/track-order alias with 'search' parameter (case-insensitive lowercase)
        mockMvc.perform(get("/api/track-order").param("search", created.orderNumber().toLowerCase()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.order_number", is(created.orderNumber())))
                .andExpect(jsonPath("$.customer_name", is("Track Customer")));

        // 3. Track with leading '#' prefix
        mockMvc.perform(get("/api/track-order").param("search", "#" + created.orderNumber()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.order_number", is(created.orderNumber())));

        // 4. Track by phone (digits only)
        mockMvc.perform(get("/api/track-order").param("search", "9888812345"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.order_number", is(created.orderNumber())));

        // 5. Track unknown order returns 404
        mockMvc.perform(get("/api/track-order").param("search", "OM-NONEXISTENT"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error", containsString("No order found")));
    }
}
