package com.omrestaurant.web;

import com.omrestaurant.model.KitchenOrderTicket;
import com.omrestaurant.model.Order;
import com.omrestaurant.model.dto.CreateOrderRequest;
import com.omrestaurant.model.dto.UpdateItemStatusRequest;
import com.omrestaurant.model.dto.UpdateOrderStatusRequest;
import com.omrestaurant.service.OrderService;
import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders")
public class OrderController {
    private final OrderService orderService;

    public OrderController(OrderService orderService) {
        this.orderService = orderService;
    }

    @GetMapping
    public ResponseEntity<List<Order>> getOrders(
            @RequestParam(name = "status", required = false) String status) {
        return ResponseEntity.ok(orderService.getOrders(status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Order> getOrderById(@PathVariable("id") long id) {
        return ResponseEntity.ok(orderService.getOrderById(id));
    }

    @PostMapping
    public ResponseEntity<Order> createOrder(@Valid @RequestBody CreateOrderRequest req) {
        Order created = orderService.createOrder(req);
        return ResponseEntity.created(URI.create("/api/orders/" + created.id())).body(created);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Order> updateOrderStatus(
            @PathVariable("id") long id,
            @Valid @RequestBody UpdateOrderStatusRequest req) {
        Order updated = orderService.updateOrderStatus(id, req.status());
        return ResponseEntity.ok(updated);
    }

    @PatchMapping("/{id}/items/{itemId}")
    public ResponseEntity<Order> updateItemStatus(
            @PathVariable("id") long id,
            @PathVariable("itemId") long itemId,
            @RequestBody UpdateItemStatusRequest req) {
        String resolvedStatus = req.resolvedStatus();
        Order updated = orderService.updateOrderItemStatus(id, itemId, resolvedStatus);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/{id}/kot")
    public ResponseEntity<KitchenOrderTicket> getKOT(@PathVariable("id") long id) {
        KitchenOrderTicket kot = orderService.generateKOT(id);
        return ResponseEntity.ok(kot);
    }
}
