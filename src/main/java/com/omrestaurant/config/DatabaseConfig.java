package com.omrestaurant.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.jdbc.autoconfigure.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.zaxxer.hikari.HikariDataSource;

/**
 * Normalizes cloud provider database URLs (Render, Railway, Fly.io, Supabase).
 * The PostgreSQL JDBC driver requires 'jdbc:postgresql://host:port/database?user=...&password=...'
 * and will crash with UnknownHostException if credentials remain in 'user:password@host' authority format.
 */
@Configuration
public class DatabaseConfig {

    private record ParsedDbInfo(String jdbcUrl, String username, String password) {}

    private static ParsedDbInfo parseAndNormalize(String rawUrl) {
        if (rawUrl == null || rawUrl.isBlank()) {
            return new ParsedDbInfo(rawUrl, null, null);
        }

        String trimmed = rawUrl.trim();
        // Replace template placeholders if user literally pasted [YOUR-PASSWORD]
        if (trimmed.contains("[YOUR-PASSWORD]")) {
            trimmed = trimmed.replace("[YOUR-PASSWORD]", "pedkUc-fawpuh-noxji6");
        } else if (trimmed.contains("YOUR-PASSWORD")) {
            trimmed = trimmed.replace("YOUR-PASSWORD", "pedkUc-fawpuh-noxji6");
        }

        String uriString = trimmed;
        if (uriString.startsWith("jdbc:")) {
            uriString = uriString.substring("jdbc:".length());
        }

        if (uriString.startsWith("postgres://") || uriString.startsWith("postgresql://")) {
            try {
                if (uriString.startsWith("postgres://")) {
                    uriString = "postgresql://" + uriString.substring("postgres://".length());
                }
                URI uri = new URI(uriString);
                String user = null;
                String pass = null;

                String userInfo = uri.getUserInfo();
                if (userInfo != null && !userInfo.isBlank()) {
                    int colon = userInfo.indexOf(':');
                    if (colon >= 0) {
                        user = URLDecoder.decode(userInfo.substring(0, colon), StandardCharsets.UTF_8);
                        pass = URLDecoder.decode(userInfo.substring(colon + 1), StandardCharsets.UTF_8);
                    } else {
                        user = URLDecoder.decode(userInfo, StandardCharsets.UTF_8);
                    }
                }

                String host = uri.getHost();
                if (host == null || host.isBlank()) {
                    host = "aws-0-ap-south-1.pooler.supabase.com";
                }
                int port = uri.getPort() > 0 ? uri.getPort() : 5432;
                String path = uri.getPath();
                if (path == null || path.isBlank() || path.equals("/")) {
                    path = "/postgres";
                }
                String query = uri.getQuery();

                StringBuilder jdbcUrl = new StringBuilder("jdbc:postgresql://")
                        .append(host)
                        .append(":")
                        .append(port)
                        .append(path);

                StringBuilder qb = new StringBuilder();
                if (query != null && !query.isBlank()) {
                    qb.append(query);
                }
                if (host.contains("supabase.com") && !qb.toString().contains("sslmode=")) {
                    if (qb.length() > 0) qb.append("&");
                    qb.append("sslmode=require");
                }
                if (user != null && !qb.toString().contains("user=")) {
                    if (qb.length() > 0) qb.append("&");
                    qb.append("user=").append(user);
                }
                if (pass != null && !qb.toString().contains("password=")) {
                    if (qb.length() > 0) qb.append("&");
                    qb.append("password=").append(pass);
                }

                if (qb.length() > 0) {
                    jdbcUrl.append("?").append(qb);
                }

                return new ParsedDbInfo(jdbcUrl.toString(), user, pass);
            } catch (Exception e) {
                // Fall back to clean prefixing
            }
        }

        String finalUrl = trimmed.startsWith("jdbc:") ? trimmed : "jdbc:postgresql://" + trimmed;
        return new ParsedDbInfo(finalUrl, null, null);
    }

    @Bean
    public static BeanPostProcessor dataSourcePropertiesPostProcessor() {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException {
                if (bean instanceof DataSourceProperties dsp) {
                    ParsedDbInfo info = parseAndNormalize(dsp.getUrl());
                    dsp.setUrl(info.jdbcUrl());
                    if (info.username() != null && (dsp.getUsername() == null || dsp.getUsername().isBlank())) {
                        dsp.setUsername(info.username());
                    }
                    if (info.password() != null && (dsp.getPassword() == null || dsp.getPassword().isBlank())) {
                        dsp.setPassword(info.password());
                    }
                } else if (bean instanceof HikariDataSource hds) {
                    ParsedDbInfo info = parseAndNormalize(hds.getJdbcUrl());
                    hds.setJdbcUrl(info.jdbcUrl());
                    if (info.username() != null && (hds.getUsername() == null || hds.getUsername().isBlank())) {
                        hds.setUsername(info.username());
                    }
                    if (info.password() != null && (hds.getPassword() == null || hds.getPassword().isBlank())) {
                        hds.setPassword(info.password());
                    }
                }
                return bean;
            }
        };
    }
}
