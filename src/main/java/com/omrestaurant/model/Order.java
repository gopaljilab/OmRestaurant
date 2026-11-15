package com.omrestaurant.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record Order(
        long id,
        @JsonProperty("order_number") String orderNumber,
        @JsonProperty("order_type") String orderType,
        @JsonProperty("table_id") Long tableId,
        @JsonProperty("table_number") String tableNumber,
        @JsonProperty("zone") String zone,
        @JsonProperty("customer_name") String customerName,
        @JsonProperty("customer_phone") String customerPhone,
        @JsonProperty("guest_count") int guestCount,
        @JsonProperty("total_amount") BigDecimal totalAmount,
        String status,
        @JsonProperty("payment_status") String paymentStatus,
        @JsonProperty("special_notes") String specialNotes,
        @JsonProperty("created_at") Instant createdAt,
        @JsonProperty("accepted_at") Instant acceptedAt,
        @JsonProperty("ready_at") Instant readyAt,
        @JsonProperty("completed_at") Instant completedAt,
        List<OrderItem> items
) {
    public Order withItems(List<OrderItem> items) {
        return new Order(
                id, orderNumber, orderType, tableId, tableNumber, zone,
                customerName, customerPhone, guestCount, totalAmount,
                status, paymentStatus, specialNotes, createdAt,
                acceptedAt, readyAt, completedAt, items
        );
    }
}
