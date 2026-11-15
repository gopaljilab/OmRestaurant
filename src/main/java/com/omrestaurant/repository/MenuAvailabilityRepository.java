package com.omrestaurant.repository;

import com.omrestaurant.model.MenuItemStatus;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

@Repository
public class MenuAvailabilityRepository {
    private final JdbcTemplate jdbc;

    public MenuAvailabilityRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    private final RowMapper<MenuItemStatus> rowMapper = (rs, rowNum) -> {
        Timestamp updatedTs = rs.getTimestamp("updated_at");
        return new MenuItemStatus(
                rs.getString("dish_slug"),
                rs.getString("dish_name"),
                rs.getBoolean("is_available"),
                updatedTs != null ? updatedTs.toInstant() : null
        );
    };

    public List<MenuItemStatus> findAll(Boolean onlyUnavailable) {
        StringBuilder sql = new StringBuilder("SELECT dish_slug, dish_name, is_available, updated_at FROM menu_item_status");
        List<Object> params = new ArrayList<>();
        if (Boolean.TRUE.equals(onlyUnavailable)) {
            sql.append(" WHERE is_available = ?");
            params.add(false);
        }
        sql.append(" ORDER BY dish_name ASC");
        return jdbc.query(sql.toString(), rowMapper, params.toArray());
    }

    public Optional<MenuItemStatus> findBySlug(String slug) {
        String sql = "SELECT dish_slug, dish_name, is_available, updated_at FROM menu_item_status WHERE LOWER(dish_slug) = LOWER(?)";
        try {
            return Optional.ofNullable(jdbc.queryForObject(sql, rowMapper, slug.trim()));
        } catch (EmptyResultDataAccessException ex) {
            return Optional.empty();
        }
    }

    public Optional<MenuItemStatus> findByName(String dishName) {
        String sql = "SELECT dish_slug, dish_name, is_available, updated_at FROM menu_item_status WHERE LOWER(dish_name) = LOWER(?)";
        try {
            return Optional.ofNullable(jdbc.queryForObject(sql, rowMapper, dishName.trim()));
        } catch (EmptyResultDataAccessException ex) {
            return Optional.empty();
        }
    }

    public boolean isAvailable(String slug) {
        if (slug == null || slug.isBlank()) {
            return true;
        }
        return findBySlug(slug).map(MenuItemStatus::isAvailable).orElse(true);
    }

    public MenuItemStatus upsert(String slug, String name, boolean isAvailable) {
        String normalizedSlug = slug.trim().toLowerCase();
        Instant now = Instant.now();
        Timestamp nowTs = Timestamp.from(now);

        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM menu_item_status WHERE LOWER(dish_slug) = ?",
                Integer.class,
                normalizedSlug
        );

        if (count != null && count > 0) {
            if (name != null && !name.isBlank()) {
                jdbc.update(
                        "UPDATE menu_item_status SET dish_name = ?, is_available = ?, updated_at = ? WHERE LOWER(dish_slug) = ?",
                        name.trim(), isAvailable, nowTs, normalizedSlug
                );
            } else {
                jdbc.update(
                        "UPDATE menu_item_status SET is_available = ?, updated_at = ? WHERE LOWER(dish_slug) = ?",
                        isAvailable, nowTs, normalizedSlug
                );
            }
        } else {
            String finalName = (name != null && !name.isBlank()) ? name.trim() : normalizedSlug;
            jdbc.update(
                    "INSERT INTO menu_item_status (dish_slug, dish_name, is_available, updated_at) VALUES (?, ?, ?, ?)",
                    normalizedSlug, finalName, isAvailable, nowTs
            );
        }

        return findBySlug(normalizedSlug).orElse(new MenuItemStatus(normalizedSlug, name, isAvailable, now));
    }
}
