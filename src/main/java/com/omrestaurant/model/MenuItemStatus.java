package com.omrestaurant.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;

public record MenuItemStatus(
        @JsonProperty("dish_slug") String dishSlug,
        @JsonProperty("dish_name") String dishName,
        @JsonProperty("is_available") boolean isAvailable,
        @JsonProperty("updated_at") Instant updatedAt
) {
}
