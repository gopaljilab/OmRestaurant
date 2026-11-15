package com.omrestaurant.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

public record MenuItem(
        String slug,
        String name,
        String category,
        String station,
        BigDecimal price
) {
}
