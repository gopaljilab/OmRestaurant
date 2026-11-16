package com.omrestaurant.config;

import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.jdbc.autoconfigure.DataSourceProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.zaxxer.hikari.HikariDataSource;

/**
 * Normalizes cloud provider database URLs (Render, Railway, Fly.io, Supabase)
 * by ensuring standard postgresql:// and postgres:// connection strings are
 * formatted with the jdbc: prefix required by the PostgreSQL JDBC driver.
 */
@Configuration
public class DatabaseConfig {

    private static String normalizeUrl(String url) {
        if (url == null || url.isBlank()) {
            return url;
        }
        String trimmed = url.trim();
        if (trimmed.startsWith("postgres://")) {
            return "jdbc:postgresql://" + trimmed.substring("postgres://".length());
        } else if (trimmed.startsWith("postgresql://") && !trimmed.startsWith("jdbc:postgresql://")) {
            return "jdbc:postgresql://" + trimmed.substring("postgresql://".length());
        }
        return trimmed;
    }

    @Bean
    public static BeanPostProcessor dataSourcePropertiesPostProcessor() {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessBeforeInitialization(Object bean, String beanName) throws BeansException {
                if (bean instanceof DataSourceProperties dsp) {
                    dsp.setUrl(normalizeUrl(dsp.getUrl()));
                } else if (bean instanceof HikariDataSource hds) {
                    hds.setJdbcUrl(normalizeUrl(hds.getJdbcUrl()));
                }
                return bean;
            }
        };
    }
}
