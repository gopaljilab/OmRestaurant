package com.omrestaurant.web;

import com.omrestaurant.service.FormService;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tables")
public class TableController {
    private final FormService forms;

    public TableController(FormService forms) {
        this.forms = forms;
    }

    @GetMapping("/availability")
    public ResponseEntity<?> availability(
            @RequestParam(name = "date", required = false) String date,
            @RequestParam(name = "time", required = false) String time) {
        try {
            LocalDate parsedDate = (date != null && !date.isBlank()) ? LocalDate.parse(date.trim()) : null;
            LocalTime parsedTime = (time != null && !time.isBlank()) ? LocalTime.parse(time.trim()) : null;
            return ResponseEntity.ok(forms.getTableAvailability(parsedDate, parsedTime));
        } catch (DateTimeParseException ex) {
            return ResponseEntity.badRequest().body(
                    Map.of("error", "Invalid date or time format. Expected date=YYYY-MM-DD and time=HH:MM")
            );
        }
    }
}
