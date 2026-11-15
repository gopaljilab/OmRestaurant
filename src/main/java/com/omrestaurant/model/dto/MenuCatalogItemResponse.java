package com.omrestaurant.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

public record MenuCatalogItemResponse(
        @JsonProperty("dish_slug") String dishSlug,
        @JsonProperty("dish_name") String dishName,
        String category,
        String station,
        @JsonProperty("unit_price") BigDecimal unitPrice,
        @JsonProperty("is_available") boolean isAvailable
) {
}
