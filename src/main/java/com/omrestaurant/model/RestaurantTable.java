package com.omrestaurant.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public record RestaurantTable(
        long id,
        @JsonProperty("table_number") String tableNumber,
        int capacity,
        String zone,
        String status,
        boolean available
) {
}
