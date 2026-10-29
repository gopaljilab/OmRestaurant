package com.omrestaurant.service;

import java.time.LocalDateTime;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class FormService {
    private final JdbcTemplate jdbc;

    public FormService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void saveBooking(String name, String email, LocalDateTime date, int people, String request) {
        jdbc.update("INSERT INTO booking (name, email, booking_at, people, request) VALUES (?, ?, ?, ?, ?)",
                name, email, date, people, request);
    }

    public void saveContact(String name, String email, String subject, String message) {
        jdbc.update("INSERT INTO contact_us (name, email, subject, message) VALUES (?, ?, ?, ?)",
                name, email, subject, message);
    }

    public void subscribe(String email) {
        jdbc.update("INSERT INTO newsletter (email) VALUES (?)", email);
    }
}
