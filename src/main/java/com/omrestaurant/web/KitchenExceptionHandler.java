package com.omrestaurant.web;

import com.omrestaurant.exception.InvalidOrderTransitionException;
import com.omrestaurant.exception.MenuItemUnavailableException;
import com.omrestaurant.exception.OrderItemNotFoundException;
import com.omrestaurant.exception.OrderNotFoundException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class KitchenExceptionHandler {

    @ExceptionHandler(OrderNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleOrderNotFound(OrderNotFoundException ex) {
        return buildErrorResponse(HttpStatus.NOT_FOUND, "order-not-found", ex.getMessage());
    }

    @ExceptionHandler(OrderItemNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleOrderItemNotFound(OrderItemNotFoundException ex) {
        return buildErrorResponse(HttpStatus.NOT_FOUND, "order-item-not-found", ex.getMessage());
    }

    @ExceptionHandler(InvalidOrderTransitionException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidTransition(InvalidOrderTransitionException ex) {
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "invalid-transition", ex.getMessage());
    }

    @ExceptionHandler(MenuItemUnavailableException.class)
    public ResponseEntity<Map<String, Object>> handleMenuItemUnavailable(MenuItemUnavailableException ex) {
        return buildErrorResponse(HttpStatus.CONFLICT, "item-unavailable", ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "invalid-argument", ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidationErrors(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .reduce((a, b) -> a + "; " + b)
                .orElse("Validation failed");
        return buildErrorResponse(HttpStatus.BAD_REQUEST, "validation-error", message);
    }

    private ResponseEntity<Map<String, Object>> buildErrorResponse(HttpStatus status, String code, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("ok", false);
        body.put("status", code);
        body.put("error", message);
        return ResponseEntity.status(status).body(body);
    }
}
