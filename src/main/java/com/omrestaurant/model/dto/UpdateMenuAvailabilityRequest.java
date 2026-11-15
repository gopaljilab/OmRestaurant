package com.omrestaurant.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UpdateMenuAvailabilityRequest(
        @JsonProperty("dish_slug") @NotBlank(message = "Dish slug is required") String dishSlug,
        @JsonProperty("dish_name") String dishName,
        @JsonProperty("is_available") @NotNull(message = "is_available boolean is required") Boolean isAvailable
) {
}
