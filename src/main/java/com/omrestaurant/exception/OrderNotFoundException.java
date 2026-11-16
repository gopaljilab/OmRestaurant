package com.omrestaurant.exception;

public class OrderNotFoundException extends RuntimeException {
    public OrderNotFoundException(long orderId) {
        super("Order #" + orderId + " was not found");
    }

    public OrderNotFoundException(String message) {
        super(message);
    }
}
