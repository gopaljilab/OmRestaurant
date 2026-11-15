package com.omrestaurant.model.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record UpdateItemStatusRequest(
        String status,
        @JsonProperty("item_status") String itemStatus
) {
    public String resolvedStatus() {
        if (status != null && !status.isBlank()) {
            return status.trim().toLowerCase();
        }
        if (itemStatus != null && !itemStatus.isBlank()) {
            return itemStatus.trim().toLowerCase();
        }
        return "";
    }
}
