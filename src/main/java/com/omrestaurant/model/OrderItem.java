package com.omrestaurant.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.time.Instant;

public record OrderItem(
        long id,
        @JsonProperty("order_id") long orderId,
        @JsonProperty("dish_slug") String dishSlug,
        @JsonProperty("dish_name") String dishName,
        String category,
        String station,
        @JsonProperty("unit_price") BigDecimal unitPrice,
        int quantity,
        @JsonProperty("spice_level") String spiceLevel,
        @JsonProperty("item_status") String itemStatus,
        String notes,
        @JsonProperty("created_at") Instant createdAt
) {
}
