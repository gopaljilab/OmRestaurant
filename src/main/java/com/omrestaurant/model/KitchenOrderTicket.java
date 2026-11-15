package com.omrestaurant.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.List;

public record KitchenOrderTicket(
        @JsonProperty("order_id") long orderId,
        @JsonProperty("order_number") String orderNumber,
        @JsonProperty("order_type") String orderType,
        @JsonProperty("table_id") Long tableId,
        @JsonProperty("table_number") String tableNumber,
        String zone,
        @JsonProperty("customer_name") String customerName,
        @JsonProperty("customer_phone") String customerPhone,
        @JsonProperty("guest_count") int guestCount,
        @JsonProperty("server_name") String serverName,
        Instant timestamp,
        @JsonProperty("special_notes") String specialNotes,
        @JsonProperty("total_items") int totalItems,
        List<StationKOT> stations,
        @JsonProperty("formatted_ticket") String formattedTicket
) {
    public record StationKOT(
            String station,
            @JsonProperty("station_name") String stationName,
            List<OrderItem> items
    ) {}
}
