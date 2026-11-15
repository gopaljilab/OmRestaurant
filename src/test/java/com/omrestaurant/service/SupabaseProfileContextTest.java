package com.omrestaurant.service;

import com.omrestaurant.OmRestaurantApplication;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(classes = OmRestaurantApplication.class)
@ActiveProfiles("supabase")
public class SupabaseProfileContextTest {

    @Autowired
    private ApplicationContext applicationContext;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("Verify Spring Boot Context Loads Successfully With Supabase Profile")
    void verifySupabaseContextLoads() {
        String password = System.getenv("DB_PASSWORD");
        if (password == null || password.isBlank()) {
            password = System.getProperty("DB_PASSWORD");
        }

        if (password == null || password.isBlank()) {
            System.out.println("[SUPABASE CONTEXT TEST] Skipped - DB_PASSWORD not set.");
            return;
        }

        assertNotNull(applicationContext, "ApplicationContext must not be null");
        assertNotNull(jdbcTemplate, "JdbcTemplate must not be null");

        // Verify that read-only query succeeds through Spring Boot's injected JdbcTemplate
        Integer one = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        assertEquals(1, one, "SELECT 1 must succeed over Supabase Hikari pool");

        System.out.println("[SUPABASE CONTEXT TEST] Succeeded - Spring Boot initialized cleanly with Supabase profile.");
    }
}
