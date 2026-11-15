package com.omrestaurant.exception;

public class MenuItemUnavailableException extends RuntimeException {
    public MenuItemUnavailableException(String dishName) {
        super("Dish '" + dishName + "' is currently marked unavailable (86'd) and cannot be ordered.");
    }
}
