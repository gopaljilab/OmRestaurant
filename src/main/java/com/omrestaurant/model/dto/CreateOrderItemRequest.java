package com.omrestaurant.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import java.math.BigDecimal;

public record CreateOrderItemRequest(
        @JsonProperty("dish_slug") String dishSlug,
        @JsonProperty("dish_name") String dishName,
        String category,
        String station,
        @JsonProperty("unit_price") @DecimalMin(value = "0.0", inclusive = true, message = "Unit price must be non-negative") BigDecimal unitPrice,
        @Min(value = 1, message = "Quantity must be at least 1") Integer quantity,
        @JsonProperty("spice_level") String spiceLevel,
        String notes
) {
    public String resolvedIdentifier() {
        if (dishSlug != null && !dishSlug.isBlank()) {
            return dishSlug.trim().toLowerCase();
        }
        if (dishName != null && !dishName.isBlank()) {
            return dishName.trim();
        }
        return "";
    }
}
