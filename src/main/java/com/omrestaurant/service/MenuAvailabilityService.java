package com.omrestaurant.service;

import com.omrestaurant.model.MenuItem;
import com.omrestaurant.model.MenuItemStatus;
import com.omrestaurant.model.dto.MenuCatalogItemResponse;
import com.omrestaurant.repository.MenuAvailabilityRepository;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MenuAvailabilityService {
    private final MenuAvailabilityRepository repository;
    private final MenuCatalog menuCatalog;

    public MenuAvailabilityService(MenuAvailabilityRepository repository, MenuCatalog menuCatalog) {
        this.repository = repository;
        this.menuCatalog = menuCatalog;
    }

    public List<MenuItemStatus> getAvailability(Boolean onlyUnavailable) {
        return repository.findAll(onlyUnavailable);
    }

    public List<MenuCatalogItemResponse> getAllCatalogItems() {
        List<MenuItem> dishes = menuCatalog.getAllDishes();
        Map<String, Boolean> availabilityMap = repository.findAll(null).stream()
                .collect(Collectors.toMap(
                        m -> m.dishSlug().toLowerCase(),
                        MenuItemStatus::isAvailable,
                        (existing, replacement) -> replacement
                ));

        return dishes.stream().map(d -> {
            boolean available = availabilityMap.getOrDefault(d.slug().toLowerCase(), true);
            return new MenuCatalogItemResponse(
                    d.slug(),
                    d.name(),
                    d.category(),
                    d.station(),
                    d.price(),
                    available
            );
        }).toList();
    }

    public Optional<MenuItemStatus> getBySlug(String slug) {
        if (slug == null || slug.isBlank()) {
            return Optional.empty();
        }
        return repository.findBySlug(slug);
    }

    @Transactional
    public MenuItemStatus setAvailability(String dishSlug, String dishName, boolean isAvailable) {
        if (dishSlug == null || dishSlug.isBlank()) {
            throw new IllegalArgumentException("dish_slug is required");
        }
        return repository.upsert(dishSlug, dishName, isAvailable);
    }
}
