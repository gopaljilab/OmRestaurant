package com.omrestaurant.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record CreateOrderRequest(
        @JsonProperty("order_type") String orderType,
        @JsonProperty("table_id") Long tableId,
        @JsonProperty("customer_name") @NotBlank(message = "Customer name is required") String customerName,
        @JsonProperty("customer_phone") String customerPhone,
        @JsonProperty("guest_count") Integer guestCount,
        @JsonProperty("payment_status") String paymentStatus,
        @JsonProperty("special_notes") String specialNotes,
        @NotEmpty(message = "Order must contain at least one item") List<@Valid CreateOrderItemRequest> items
) {
}
