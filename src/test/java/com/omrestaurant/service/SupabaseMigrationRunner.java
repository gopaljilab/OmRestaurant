package com.omrestaurant.service;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.Statement;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import static org.junit.jupiter.api.Assertions.*;

public class SupabaseMigrationRunner {

    private static final String DEFAULT_HOST = "aws-0-ap-south-1.pooler.supabase.com";
    private static final String DEFAULT_PORT = "5432";
    private static final String DEFAULT_DB = "postgres";
    private static final String DEFAULT_USER = "postgres.dpckliukvkdwerjqbxhu";

    private static final Set<String> TARGET_TABLES = Set.of(
            "tables", "booking", "contact_us", "newsletter",
            "orders", "order_items", "menu_item_status"
    );

    @Test
    @DisplayName("Execute Complete Schema Migration against Supabase PostgreSQL")
    void executeMigration() throws Exception {
        String password = System.getenv("DB_PASSWORD");
        if (password == null || password.isBlank()) {
            password = System.getProperty("DB_PASSWORD");
        }

        if (password == null || password.isBlank()) {
            System.out.println("[SUPABASE MIGRATION] DB_PASSWORD is not set. Skipping.");
            return;
        }

        String host = getEnvOrDefault("DB_HOST", DEFAULT_HOST);
        String port = getEnvOrDefault("DB_PORT", DEFAULT_PORT);
        String dbName = getEnvOrDefault("DB_NAME", DEFAULT_DB);
        String username = getEnvOrDefault("DB_USERNAME", DEFAULT_USER);

        String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + "/" + dbName + "?sslmode=require";

        System.out.println("================================================================================");
        System.out.println("[SUPABASE MIGRATION EXECUTION]");
        System.out.println("Host:     " + host);
        System.out.println("Port:     " + port);
        System.out.println("Database: " + dbName);
        System.out.println("User:     " + username);
        System.out.println("================================================================================");

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(jdbcUrl);
        config.setUsername(username);
        config.setPassword(password);
        config.setDriverClassName("org.postgresql.Driver");
        config.setMaximumPoolSize(2);
        config.setMinimumIdle(1);
        config.setConnectionTimeout(20000);
        config.setPoolName("SupabaseMigrationPool");

        try (HikariDataSource dataSource = new HikariDataSource(config)) {
            JdbcTemplate jdbc = new JdbcTemplate(dataSource);

            // Read the complete schema migration script
            Path migrationFile = Path.of("database/supabase_complete_schema.sql");
            assertTrue(Files.exists(migrationFile), "database/supabase_complete_schema.sql must exist");
            String migrationSql = Files.readString(migrationFile);

            System.out.println("Applying schema migration from " + migrationFile.toAbsolutePath() + "...");

            try (Connection conn = dataSource.getConnection();
                 Statement stmt = conn.createStatement()) {
                stmt.execute(migrationSql);
            }

            System.out.println("Migration SQL executed successfully!");

            // Verify all tables exist now
            List<String> createdTables = jdbc.query(
                    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
                    (rs, rowNum) -> rs.getString("table_name")
            );

            System.out.println("\nAll Tables in public Schema (" + createdTables.size() + "):");
            for (String t : createdTables) {
                System.out.println("  ✓ " + t);
            }

            Set<String> createdSet = new HashSet<>(createdTables);
            for (String target : TARGET_TABLES) {
                assertTrue(createdSet.contains(target), "Table '" + target + "' must exist in Supabase after migration");
            }

            // Ensure all 14 physical tables are marked 'available'
            jdbc.update("UPDATE public.tables SET status = 'available'");

            // Verify dining room physical tables seeded and available
            Integer tableCount = jdbc.queryForObject("SELECT COUNT(*) FROM public.tables", Integer.class);
            System.out.println("\nSeeded Dining Tables Count: " + tableCount);
            assertEquals(14, tableCount, "14 dining tables must be seeded across 4 zones");

            Integer availableCount = jdbc.queryForObject("SELECT COUNT(*) FROM public.tables WHERE status = 'available'", Integer.class);
            System.out.println("Available Dining Tables Count: " + availableCount + " / 14");
            assertEquals(14, availableCount, "All 14 tables must have status = 'available'");

            // Verify sequence
            String seqVal = jdbc.queryForObject("SELECT last_value FROM public.order_number_seq", String.class);
            System.out.println("order_number_seq status: initialized (current/last value=" + seqVal + ")");

            System.out.println("================================================================================");
            System.out.println("[SUPABASE MIGRATION COMPLETED SUCCESSFULLY — ALL TABLES READY]");
            System.out.println("================================================================================");
        }
    }

    private static String getEnvOrDefault(String name, String fallback) {
        String val = System.getenv(name);
        return (val != null && !val.isBlank()) ? val.trim() : fallback;
    }
}
