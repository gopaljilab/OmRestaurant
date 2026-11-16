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
import com.omrestaurant.repository.MenuAvailabilityRepository;
import com.omrestaurant.repository.OrderRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {
    public static final Set<String> ALLOWED_STATIONS = Set.of(
            "tandoor", "curry", "south_indian", "chinese", "beverage"
    );

    public static final Set<String> ALLOWED_ORDER_TYPES = Set.of(
            "dine_in", "takeaway", "pre_order"
    );

    public static final Set<String> ALLOWED_ORDER_STATUSES = Set.of(
            "incoming", "preparing", "ready", "served", "completed", "cancelled"
    );

    public static final Set<String> ALLOWED_ITEM_STATUSES = Set.of(
            "pending", "cooking", "done"
    );

    private static final Map<String, String> STATION_NAMES = Map.of(
            "tandoor", "Tandoor & Chaap",
            "curry", "Mughlai Curries",
            "south_indian", "South Indian / Dosas",
            "chinese", "Indo-Chinese",
            "beverage", "Beverages & Shakes"
    );

    private static final DateTimeFormatter KOT_TIME_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss").withZone(ZoneId.of("Asia/Kolkata"));

    private final OrderRepository orderRepository;
    private final MenuAvailabilityRepository menuAvailabilityRepository;
    private final MenuCatalog menuCatalog;

    public OrderService(OrderRepository orderRepository,
                        MenuAvailabilityRepository menuAvailabilityRepository,
                        MenuCatalog menuCatalog) {
        this.orderRepository = orderRepository;
        this.menuAvailabilityRepository = menuAvailabilityRepository;
        this.menuCatalog = menuCatalog;
    }

    public List<Order> getOrders(String status) {
        String normalizedStatus = (status != null && !status.isBlank()) ? status.trim().toLowerCase() : null;
        if (normalizedStatus != null && !ALLOWED_ORDER_STATUSES.contains(normalizedStatus)) {
            throw new IllegalArgumentException("Unknown order status filter: " + status);
        }
        return orderRepository.findAll(normalizedStatus);
    }

    public Order getOrderById(long id) {
        return orderRepository.findById(id)
                .orElseThrow(() -> new OrderNotFoundException(id));
    }

    public Order getOrderByNumberOrId(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            throw new OrderNotFoundException("Order reference is required");
        }
        String clean = identifier.trim();
        Optional<Order> orderOpt = orderRepository.findByOrderNumber(clean);
        if (orderOpt.isEmpty()) {
            try {
                long id = Long.parseLong(clean.replace("#", "").trim());
                orderOpt = orderRepository.findById(id);
            } catch (NumberFormatException ignored) {}
        }
        return orderOpt.orElseThrow(() -> new OrderNotFoundException("Order not found for identifier: " + identifier));
    }

    public List<Order> trackOrders(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        return orderRepository.findByPhoneOrOrderNumber(query);
    }

    private record ValidatedItem(
            com.omrestaurant.model.MenuItem dish,
            int quantity,
            String spiceLevel,
            String notes
    ) {}

    @Transactional
    public Order createOrder(CreateOrderRequest req) {
        if (req == null) {
            throw new IllegalArgumentException("CreateOrderRequest cannot be null");
        }

        String customerName = req.customerName() != null ? req.customerName().trim() : "";
        if (customerName.isBlank()) {
            throw new IllegalArgumentException("Customer name cannot be blank");
        }

        String orderType = req.orderType() != null && !req.orderType().isBlank()
                ? req.orderType().trim().toLowerCase()
                : "dine_in";
        if (!ALLOWED_ORDER_TYPES.contains(orderType)) {
            throw new IllegalArgumentException("Invalid order type: " + req.orderType() + ". Allowed: " + ALLOWED_ORDER_TYPES);
        }

        int guestCount = req.guestCount() != null && req.guestCount() > 0 ? req.guestCount() : 1;
        String paymentStatus = req.paymentStatus() != null && !req.paymentStatus().isBlank()
                ? req.paymentStatus().trim().toLowerCase()
                : "pending";

        if (req.items() == null || req.items().isEmpty()) {
            throw new IllegalArgumentException("Order must have at least one line item");
        }

        // Validate items and calculate server-side total from authoritative catalog
        BigDecimal calculatedTotal = BigDecimal.ZERO;
        List<ValidatedItem> validatedItems = new ArrayList<>(req.items().size());

        for (CreateOrderItemRequest item : req.items()) {
            // Check client station if supplied
            if (item.station() != null && !item.station().isBlank()) {
                String st = item.station().trim().toLowerCase();
                if (!ALLOWED_STATIONS.contains(st)) {
                    throw new IllegalArgumentException("Invalid station '" + item.station() + "'. Allowed stations: " + ALLOWED_STATIONS);
                }
            }

            String identifier = item.resolvedIdentifier();
            if (identifier.isBlank()) {
                throw new IllegalArgumentException("Menu item identifier (dish_slug or dish_name) is required");
            }

            com.omrestaurant.model.MenuItem catalogDish = menuCatalog.findBySlugOrName(identifier)
                    .orElseThrow(() -> new IllegalArgumentException("Unknown menu item: '" + identifier + "'. Only authorized items from the restaurant menu catalog may be ordered."));

            // Server-side price verification: client cannot tamper with price
            if (item.unitPrice() != null && item.unitPrice().compareTo(catalogDish.price()) != 0) {
                throw new IllegalArgumentException("Invalid price for dish '" + catalogDish.name() + "'. Server authoritative price is " + catalogDish.price() + ", but client sent " + item.unitPrice());
            }

            int qty = item.quantity() != null ? item.quantity() : 1;
            if (qty < 1 || qty > 100) {
                throw new IllegalArgumentException("Quantity for '" + catalogDish.name() + "' must be between 1 and 100 (received: " + qty + ")");
            }

            // Check availability (Rule 12: reject 86'd items)
            validateItemAvailability(catalogDish.slug(), catalogDish.name());

            BigDecimal lineTotal = catalogDish.price().multiply(BigDecimal.valueOf(qty));
            calculatedTotal = calculatedTotal.add(lineTotal);

            String spice = (item.spiceLevel() != null && !item.spiceLevel().isBlank())
                    ? item.spiceLevel().trim()
                    : "Medium";

            validatedItems.add(new ValidatedItem(catalogDish, qty, spice, item.notes()));
        }

        // Generate concurrency-safe sequential order number from sequence
        String orderNumber = orderRepository.generateNextOrderNumber();

        Instant now = Instant.now();
        long orderId = orderRepository.insertOrder(
                orderNumber,
                orderType,
                req.tableId(),
                customerName,
                req.customerPhone(),
                guestCount,
                calculatedTotal,
                "incoming",
                paymentStatus,
                req.specialNotes(),
                now
        );

        for (ValidatedItem vi : validatedItems) {
            orderRepository.insertOrderItem(
                    orderId,
                    vi.dish().slug(),
                    vi.dish().name(),
                    vi.dish().category(),
                    vi.dish().station(),
                    vi.dish().price(),
                    vi.quantity(),
                    vi.spiceLevel(),
                    "pending",
                    vi.notes(),
                    now
            );
        }

        return getOrderById(orderId);
    }

    @Transactional
    public Order updateOrderStatus(long orderId, String targetStatus) {
        if (targetStatus == null || targetStatus.isBlank()) {
            throw new IllegalArgumentException("Target status cannot be blank");
        }
        String normalizedTarget = targetStatus.trim().toLowerCase();
        if (!ALLOWED_ORDER_STATUSES.contains(normalizedTarget)) {
            throw new IllegalArgumentException("Unknown order status: " + targetStatus + ". Allowed: " + ALLOWED_ORDER_STATUSES);
        }

        // Concurrency: pessimistic row lock on order
        orderRepository.lockOrderForUpdate(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        Order order = getOrderById(orderId);
        String currentStatus = order.status().toLowerCase();

        if (currentStatus.equals(normalizedTarget)) {
            return order; // Idempotent
        }

        validateOrderTransition(currentStatus, normalizedTarget);

        // Cannot move to ready if not all items are done
        if ("ready".equals(normalizedTarget)) {
            if (!orderRepository.areAllItemsDone(orderId)) {
                throw new InvalidOrderTransitionException("Cannot mark order as 'ready' because not all items are done cooking");
            }
        }

        Instant now = Instant.now();
        Instant acceptedAt = null;
        Instant readyAt = null;
        Instant completedAt = null;

        if ("preparing".equals(normalizedTarget) && "incoming".equals(currentStatus)) {
            acceptedAt = now;
        } else if ("ready".equals(normalizedTarget)) {
            readyAt = now;
        } else if ("completed".equals(normalizedTarget)) {
            completedAt = now;
        }

        orderRepository.updateOrderStatus(orderId, normalizedTarget, acceptedAt, readyAt, completedAt);
        return getOrderById(orderId);
    }

    @Transactional
    public Order updateOrderItemStatus(long orderId, long itemId, String targetStatus) {
        if (targetStatus == null || targetStatus.isBlank()) {
            throw new IllegalArgumentException("Item status cannot be blank");
        }
        String normalizedStatus = targetStatus.trim().toLowerCase();
        if (!ALLOWED_ITEM_STATUSES.contains(normalizedStatus)) {
            throw new IllegalArgumentException("Unknown item status: " + targetStatus + ". Allowed: " + ALLOWED_ITEM_STATUSES);
        }

        // Concurrency: pessimistic row lock on order
        orderRepository.lockOrderForUpdate(orderId)
                .orElseThrow(() -> new OrderNotFoundException(orderId));

        Order order = getOrderById(orderId);
        String orderStatus = order.status().toLowerCase();
        if ("completed".equals(orderStatus) || "cancelled".equals(orderStatus)) {
            throw new InvalidOrderTransitionException("Cannot update items of an order that is already " + orderStatus);
        }

        // Rule 11: Reject if item does not belong to specified order
        OrderItem item = orderRepository.findItemById(itemId)
                .orElseThrow(() -> new OrderItemNotFoundException(orderId, itemId));

        if (item.orderId() != orderId) {
            throw new OrderItemNotFoundException(orderId, itemId);
        }

        String currentStatus = item.itemStatus().toLowerCase();
        validateItemTransition(currentStatus, normalizedStatus);

        orderRepository.updateItemStatus(itemId, normalizedStatus);

        // Rule 8 & 9: Automatically mark order ready when every item is done
        if ("done".equals(normalizedStatus)) {
            boolean allDone = orderRepository.areAllItemsDone(orderId);
            if (allDone) {
                if ("preparing".equals(orderStatus) || "incoming".equals(orderStatus)) {
                    Instant now = Instant.now();
                    orderRepository.updateOrderStatus(orderId, "ready", null, now, null);
                }
            }
        }

        return getOrderById(orderId);
    }

    public KitchenOrderTicket generateKOT(long orderId) {
        Order order = getOrderById(orderId);

        Map<String, List<OrderItem>> grouped = new LinkedHashMap<>();
        for (String stationKey : ALLOWED_STATIONS) {
            grouped.put(stationKey, new ArrayList<>());
        }

        int totalItems = 0;
        for (OrderItem item : order.items()) {
            totalItems += item.quantity();
            String st = item.station().toLowerCase();
            grouped.computeIfAbsent(st, k -> new ArrayList<>()).add(item);
        }

        List<KitchenOrderTicket.StationKOT> stationKots = new ArrayList<>();
        for (Map.Entry<String, List<OrderItem>> entry : grouped.entrySet()) {
            if (!entry.getValue().isEmpty()) {
                String stKey = entry.getKey();
                String stName = STATION_NAMES.getOrDefault(stKey, stKey.toUpperCase());
                stationKots.add(new KitchenOrderTicket.StationKOT(stKey, stName, entry.getValue()));
            }
        }

        String formattedTicket = buildThermalFormattedTicket(order, totalItems, stationKots);

        return new KitchenOrderTicket(
                order.id(),
                order.orderNumber(),
                order.orderType(),
                order.tableId(),
                order.tableNumber() != null ? order.tableNumber() : "N/A",
                order.zone() != null ? order.zone() : "Counter",
                order.customerName(),
                order.customerPhone(),
                order.guestCount(),
                "Captain / KDS",
                order.createdAt() != null ? order.createdAt() : Instant.now(),
                order.specialNotes(),
                totalItems,
                stationKots,
                formattedTicket
        );
    }

    private void validateItemAvailability(String slug, String dishName) {
        if (slug != null && !slug.isBlank() && !menuAvailabilityRepository.isAvailable(slug)) {
            throw new MenuItemUnavailableException(dishName != null ? dishName : slug);
        }
        if (dishName != null && !dishName.isBlank()) {
            Optional<MenuItemStatus> byName = menuAvailabilityRepository.findByName(dishName);
            if (byName.isPresent() && !byName.get().isAvailable()) {
                throw new MenuItemUnavailableException(dishName);
            }
            String derivedSlug = toSlug(dishName);
            if (!derivedSlug.isBlank() && !menuAvailabilityRepository.isAvailable(derivedSlug)) {
                throw new MenuItemUnavailableException(dishName);
            }
        }
    }

    private void validateItemAvailability(String dishName) {
        validateItemAvailability(toSlug(dishName), dishName);
    }

    private void validateOrderTransition(String from, String to) {
        // Terminal states
        if ("completed".equals(from)) {
            throw new InvalidOrderTransitionException("Order is already completed and cannot be transitioned to " + to);
        }
        if ("cancelled".equals(from)) {
            throw new InvalidOrderTransitionException("Order is cancelled and cannot be transitioned to " + to);
        }

        // Cancellation is always allowed from non-terminal states
        if ("cancelled".equals(to)) {
            return;
        }

        boolean valid = switch (from) {
            case "incoming" -> "preparing".equals(to);
            case "preparing" -> "ready".equals(to);
            case "ready" -> "served".equals(to);
            case "served" -> "completed".equals(to);
            default -> false;
        };

        if (!valid) {
            throw new InvalidOrderTransitionException(from, to);
        }
    }

    private void validateItemTransition(String from, String to) {
        if (from.equals(to)) {
            return;
        }
        boolean valid = switch (from) {
            case "pending" -> "cooking".equals(to) || "done".equals(to);
            case "cooking" -> "done".equals(to);
            case "done" -> false; // Done is terminal for item cooking cycle
            default -> false;
        };
        if (!valid) {
            throw new InvalidOrderTransitionException("Cannot move item from '" + from + "' to '" + to + "'");
        }
    }

    private String toSlug(String text) {
        if (text == null) return "";
        return text.trim().toLowerCase().replaceAll("[^a-z0-9]+", "-").replaceAll("^-+|-+$", "");
    }

    private String buildThermalFormattedTicket(Order order, int totalItems, List<KitchenOrderTicket.StationKOT> stationKots) {
        StringBuilder sb = new StringBuilder();
        String timeStr = KOT_TIME_FORMAT.format(order.createdAt() != null ? order.createdAt() : Instant.now());

        sb.append("========================================\n");
        sb.append("         OM RESTAURANT - KOT           \n");
        sb.append("          Estd. 1942, Khurja            \n");
        sb.append("========================================\n");
        sb.append(String.format("TICKET: %-16s TYPE: %s\n", order.orderNumber(), order.orderType().toUpperCase()));
        if (order.tableNumber() != null && !order.tableNumber().isBlank()) {
            sb.append(String.format("TABLE : %-16s ZONE: %s\n", order.tableNumber(), order.zone() != null ? order.zone() : "Main"));
        } else {
            sb.append("TABLE : [TAKEAWAY / COUNTER]\n");
        }
        sb.append(String.format("GUEST : %-16s PAX : %d\n", order.customerName(), order.guestCount()));
        sb.append(String.format("TIME  : %s\n", timeStr));
        sb.append("----------------------------------------\n");

        for (KitchenOrderTicket.StationKOT st : stationKots) {
            sb.append(String.format(">> STATION: %s\n", st.stationName().toUpperCase()));
            for (OrderItem item : st.items()) {
                sb.append(String.format("  [%dx] %-26s\n", item.quantity(), item.dishName().toUpperCase()));
                if (item.spiceLevel() != null && !item.spiceLevel().isBlank() && !"Medium".equalsIgnoreCase(item.spiceLevel())) {
                    sb.append(String.format("       * Spice: %s\n", item.spiceLevel()));
                }
                if (item.notes() != null && !item.notes().isBlank()) {
                    sb.append(String.format("       * Note: %s\n", item.notes()));
                }
            }
            sb.append("----------------------------------------\n");
        }

        if (order.specialNotes() != null && !order.specialNotes().isBlank()) {
            sb.append(String.format("SPECIAL INSTRUCTIONS:\n%s\n", order.specialNotes()));
            sb.append("----------------------------------------\n");
        }

        sb.append(String.format("TOTAL ITEMS: %-10d STATUS: %s\n", totalItems, order.status().toUpperCase()));
        sb.append("========================================\n");
        sb.append("         KITCHEN DISPLAY COPY           \n");
        sb.append("========================================\n");

        return sb.toString();
    }
}
