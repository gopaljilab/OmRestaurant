package com.omrestaurant.web;

import com.omrestaurant.model.MenuItemStatus;
import com.omrestaurant.model.dto.MenuCatalogItemResponse;
import com.omrestaurant.model.dto.UpdateMenuAvailabilityRequest;
import com.omrestaurant.service.MenuAvailabilityService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/menu")
public class MenuAvailabilityController {
    private final MenuAvailabilityService menuAvailabilityService;

    public MenuAvailabilityController(MenuAvailabilityService menuAvailabilityService) {
        this.menuAvailabilityService = menuAvailabilityService;
    }

    @GetMapping("/items")
    public ResponseEntity<List<MenuCatalogItemResponse>> getCatalogItems() {
        return ResponseEntity.ok(menuAvailabilityService.getAllCatalogItems());
    }

    @GetMapping({"", "/availability"})
    public ResponseEntity<List<MenuItemStatus>> getAvailability(
            @RequestParam(name = "unavailable_only", required = false, defaultValue = "false") boolean unavailableOnly) {
        return ResponseEntity.ok(menuAvailabilityService.getAvailability(unavailableOnly));
    }

    @PostMapping({"", "/availability"})
    public ResponseEntity<MenuItemStatus> updateAvailability(
            @Valid @RequestBody UpdateMenuAvailabilityRequest req) {
        MenuItemStatus updated = menuAvailabilityService.setAvailability(
                req.dishSlug(),
                req.dishName(),
                Boolean.TRUE.equals(req.isAvailable())
        );
        return ResponseEntity.ok(updated);
    }
}
