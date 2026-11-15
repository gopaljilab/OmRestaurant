package com.omrestaurant.model.dto;

import jakarta.validation.constraints.NotBlank;

public record UpdateOrderStatusRequest(
        @NotBlank(message = "Order status is required") String status
) {
}
