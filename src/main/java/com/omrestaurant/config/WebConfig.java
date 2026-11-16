package com.omrestaurant.config;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Global Cross-Origin Resource Sharing (CORS) Configuration.
 * Enables the Vercel-hosted KDS dashboard and customer website to securely
 * communicate with the Spring Boot REST API across origins.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${cors.allowed-origins:}")
    private String customAllowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        List<String> originPatterns = new ArrayList<>(Arrays.asList(
            "https://om-restaurant-operations-kitchen-display-system-iqqu6xgip.vercel.app",
            "https://*.vercel.app",
            "https://www.gopalportfolio.me",
            "https://gopalportfolio.me",
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:3000",
            "http://localhost:8080"
        ));

        // Append any extra origins configured via environment variable CORS_ALLOWED_ORIGINS
        if (customAllowedOrigins != null && !customAllowedOrigins.isBlank()) {
            for (String origin : customAllowedOrigins.split(",")) {
                String trimmed = origin.trim();
                if (!trimmed.isEmpty() && !originPatterns.contains(trimmed)) {
                    originPatterns.add(trimmed);
                }
            }
        }

        registry.addMapping("/**")
            .allowedOriginPatterns(originPatterns.toArray(new String[0]))
            .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
            .allowedHeaders("*")
            .exposedHeaders("Location", "Content-Disposition", "Authorization")
            .allowCredentials(true)
            .maxAge(3600);
    }
}
