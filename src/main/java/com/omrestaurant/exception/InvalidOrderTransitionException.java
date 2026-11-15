package com.omrestaurant.exception;

public class InvalidOrderTransitionException extends RuntimeException {
    public InvalidOrderTransitionException(String currentStatus, String targetStatus) {
        super("Invalid order status transition from '" + currentStatus + "' to '" + targetStatus + "'");
    }

    public InvalidOrderTransitionException(String message) {
        super(message);
    }
}
