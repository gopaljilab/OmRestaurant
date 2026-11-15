package com.omrestaurant.service;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.sql.Connection;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.DefaultTransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import static org.junit.jupiter.api.Assertions.*;

public class SupabaseConnectivityTest {

    private static final String DEFAULT_HOST = "aws-0-ap-south-1.pooler.supabase.com";
    private static final String DEFAULT_PORT = "5432";
    private static final String DEFAULT_DB = "postgres";
    private static final String DEFAULT_USER = "postgres.dpckliukvkdwerjqbxhu";

    private static final Set<String> TARGET_TABLES = Set.of(
            "tables", "booking", "contact_us", "newsletter",
            "orders", "order_items", "menu_item_status"
    );

    @Test
    @DisplayName("Verify Supabase Connectivity and Inspect Live Hosted Schema")
    void verifySupabaseConnectivityAndSchema() {
        String password = System.getenv("DB_PASSWORD");
        if (password == null || password.isBlank()) {
            password = System.getProperty("DB_PASSWORD");
        }

        if (password == null || password.isBlank()) {
            System.out.println("================================================================================");
            System.out.println("[SUPABASE VERIFICATION] DB_PASSWORD is not set in environment or system property.");
            System.out.println("Skipping Supabase live connectivity test.");
            System.out.println("To execute this verification against Supabase:");
            System.out.println("  export DB_PASSWORD=\"your_supabase_password\"");
            System.out.println("  ./mvnw test -Dtest=SupabaseConnectivityTest");
            System.out.println("================================================================================");
            return;
        }

        String host = getEnvOrDefault("DB_HOST", DEFAULT_HOST);
        String port = getEnvOrDefault("DB_PORT", DEFAULT_PORT);
        String dbName = getEnvOrDefault("DB_NAME", DEFAULT_DB);
        String username = getEnvOrDefault("DB_USERNAME", DEFAULT_USER);

        String jdbcUrl = "jdbc:postgresql://" + host + ":" + port + "/" + dbName + "?sslmode=require";

        System.out.println("================================================================================");
        System.out.println("[SUPABASE CONNECTIVITY VERIFICATION]");
        System.out.println("Host:     " + host);
        System.out.println("Port:     " + port);
        System.out.println("Database: " + dbName);
        System.out.println("User:     " + username);
        System.out.println("SSL Mode: require");
        System.out.println("================================================================================");

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(jdbcUrl);
        config.setUsername(username);
        config.setPassword(password);
        config.setDriverClassName("org.postgresql.Driver");
        config.setMaximumPoolSize(3);
        config.setMinimumIdle(1);
        config.setConnectionTimeout(15000);
        config.setIdleTimeout(300000);
        config.setMaxLifetime(900000);
        config.setKeepaliveTime(60000);
        config.setPoolName("SupabaseVerificationPool");

        try (HikariDataSource dataSource = new HikariDataSource(config)) {
            JdbcTemplate jdbc = new JdbcTemplate(dataSource);

            // Phase 3.1: Read-only query
            Map<String, Object> meta = jdbc.queryForMap("SELECT current_database() as db, current_user as usr, version() as ver");
            assertNotNull(meta.get("db"), "current_database() must not be null");
            assertNotNull(meta.get("usr"), "current_user must not be null");

            System.out.println("\n--- [PHASE 3: CONNECTIVITY SUCCESS] ---");
            System.out.println("Connected to Database: " + meta.get("db"));
            System.out.println("Connected as User:     " + meta.get("usr"));
            System.out.println("PostgreSQL Version:    " + meta.get("ver"));

            // Phase 3.2: Transaction and pooling verification
            DataSourceTransactionManager txManager = new DataSourceTransactionManager(dataSource);
            TransactionTemplate txTemplate = new TransactionTemplate(txManager);
            txTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRED);

            boolean txVerified = Boolean.TRUE.equals(txTemplate.execute(status -> {
                Integer result = jdbc.queryForObject("SELECT 1", Integer.class);
                status.setRollbackOnly(); // Ensure no modifications are committed
                return result != null && result == 1;
            }));
            assertTrue(txVerified, "Spring TransactionManager must successfully execute and rollback cleanly");
            System.out.println("Transaction Manager & Pooling: VERIFIED (clean rollback test passed)");

            // Phase 4: Schema Inspection
            System.out.println("\n--- [PHASE 4: SCHEMA INSPECTION] ---");

            List<String> existingTables = jdbc.query(
                    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
                    (rs, rowNum) -> rs.getString("table_name")
            );

            System.out.println("All Tables Found in public Schema (" + existingTables.size() + "):");
            for (String tbl : existingTables) {
                System.out.println("  - " + tbl);
            }

            System.out.println("\nChecking 7 Target Tables:");
            Set<String> existingSet = new HashSet<>(existingTables);
            for (String target : TARGET_TABLES) {
                boolean exists = existingSet.contains(target);
                System.out.println("  [" + (exists ? "FOUND" : "MISSING") + "] " + target);
            }

            // Inspect columns for existing target tables
            for (String target : TARGET_TABLES) {
                if (existingSet.contains(target)) {
                    inspectTableDetails(jdbc, target);
                }
            }

            // Inspect sequences
            List<String> sequences = jdbc.query(
                    "SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public'",
                    (rs, rowNum) -> rs.getString("sequence_name")
            );
            System.out.println("\nSequences in public schema (" + sequences.size() + "):");
            for (String seq : sequences) {
                System.out.println("  - " + seq);
            }

            System.out.println("================================================================================");
            System.out.println("[SUPABASE VERIFICATION COMPLETED SUCCESSFULLY]");
            System.out.println("================================================================================");
        }
    }

    private void inspectTableDetails(JdbcTemplate jdbc, String tableName) {
        System.out.println("\n  Details for table: " + tableName);

        // Columns
        List<Map<String, Object>> columns = jdbc.queryForList(
                "SELECT column_name, data_type, is_nullable, column_default " +
                "FROM information_schema.columns " +
                "WHERE table_schema = 'public' AND table_name = ? ORDER BY ordinal_position",
                tableName
        );
        for (Map<String, Object> col : columns) {
            System.out.println("    col: " + col.get("column_name") + " (" + col.get("data_type") +
                    ", nullable=" + col.get("is_nullable") + ", default=" + col.get("column_default") + ")");
        }

        // Constraints
        List<Map<String, Object>> constraints = jdbc.queryForList(
                "SELECT tc.constraint_name, tc.constraint_type " +
                "FROM information_schema.table_constraints tc " +
                "WHERE tc.table_schema = 'public' AND tc.table_name = ? " +
                "ORDER BY tc.constraint_name",
                tableName
        );
        for (Map<String, Object> c : constraints) {
            System.out.println("    constraint: " + c.get("constraint_name") + " [" + c.get("constraint_type") + "]");
        }

        // Indexes
        List<Map<String, Object>> indexes = jdbc.queryForList(
                "SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = 'public' AND tablename = ?",
                tableName
        );
        for (Map<String, Object> idx : indexes) {
            System.out.println("    index: " + idx.get("indexname") + " -> " + idx.get("indexdef"));
        }
    }

    private static String getEnvOrDefault(String name, String fallback) {
        String val = System.getenv(name);
        return (val != null && !val.isBlank()) ? val.trim() : fallback;
    }
}
