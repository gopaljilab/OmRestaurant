package com.omrestaurant.web;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Controller alias handling direct /api/track-order lookups.
 */
@RestController
public class TrackOrderAliasController {

    private final OrderController orderController;

    public TrackOrderAliasController(OrderController orderController) {
        this.orderController = orderController;
    }

    @GetMapping("/api/track-order")
    public ResponseEntity<?> trackOrder(
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "query", required = false) String query,
            @RequestParam(name = "orderNumber", required = false) String orderNumber,
            @RequestParam(name = "phone", required = false) String phone) {
        return orderController.trackOrder(search, query, orderNumber, phone);
    }
}
