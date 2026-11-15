package com.omrestaurant.exception;

public class OrderItemNotFoundException extends RuntimeException {
    public OrderItemNotFoundException(long orderId, long itemId) {
        super("Order item #" + itemId + " was not found on order #" + orderId);
    }
}
