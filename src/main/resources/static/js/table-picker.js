(function () {
    "use strict";

    var SVG_NS = "http://www.w3.org/2000/svg";

    /**
     * Architectural JSON layout configuration for OmRestaurant's 2D Floor Plan.
     * Supports Window-Side, Main Dining Room, Outdoor Patio, and Private Booths.
     */
    var DEFAULT_LAYOUT = {
        viewBox: { width: 920, height: 560 },
        zones: [
            {
                id: "Window",
                label: "Window-Side Seating",
                shortLabel: "Window",
                subtitle: "Romantic 2-Seaters",
                x: 24,
                y: 26,
                w: 188,
                h: 508
            },
            {
                id: "Main",
                label: "Main Dining Room",
                shortLabel: "Main Dining",
                subtitle: "4 & 6 Seaters",
                x: 232,
                y: 62,
                w: 430,
                h: 298
            },
            {
                id: "Booth",
                label: "Private Booths",
                shortLabel: "Private Booths",
                subtitle: "Large VIP Groups",
                x: 232,
                y: 382,
                w: 430,
                h: 152
            },
            {
                id: "Patio",
                label: "Outdoor Patio / Terrace",
                shortLabel: "Patio",
                subtitle: "Open-Air Dining",
                x: 682,
                y: 26,
                w: 214,
                h: 508
            }
        ],
        tables: [
            // Window-Side Seating (2-seaters)
            { id: 1, table_number: "1", capacity: 2, zone: "Window", shape: "rect", cx: 118, cy: 112, w: 50, h: 38, status: "available" },
            { id: 2, table_number: "2", capacity: 2, zone: "Window", shape: "rect", cx: 118, cy: 222, w: 50, h: 38, status: "reserved" },
            { id: 3, table_number: "3", capacity: 2, zone: "Window", shape: "rect", cx: 118, cy: 332, w: 50, h: 38, status: "available" },
            { id: 4, table_number: "4", capacity: 2, zone: "Window", shape: "rect", cx: 118, cy: 442, w: 50, h: 38, status: "available" },

            // Main Dining Room (4-seaters & 6-seaters)
            { id: 5, table_number: "5", capacity: 4, zone: "Main", shape: "rect", cx: 312, cy: 146, w: 58, h: 52, status: "available" },
            { id: 6, table_number: "6", capacity: 4, zone: "Main", shape: "rect", cx: 447, cy: 146, w: 58, h: 52, status: "available" },
            { id: 7, table_number: "7", capacity: 4, zone: "Main", shape: "rect", cx: 582, cy: 146, w: 58, h: 52, status: "reserved" },
            { id: 8, table_number: "8", capacity: 6, zone: "Main", shape: "rect", cx: 356, cy: 282, w: 106, h: 50, status: "available" },
            { id: 9, table_number: "9", capacity: 6, zone: "Main", shape: "rect", cx: 540, cy: 282, w: 106, h: 50, status: "available" },

            // Outdoor Patio / Terrace (2 & 4-seaters)
            { id: 10, table_number: "10", capacity: 2, zone: "Patio", shape: "round", cx: 789, cy: 128, r: 24, status: "available" },
            { id: 11, table_number: "11", capacity: 4, zone: "Patio", shape: "round", cx: 789, cy: 280, r: 30, status: "available" },
            { id: 12, table_number: "12", capacity: 4, zone: "Patio", shape: "round", cx: 789, cy: 432, r: 30, status: "available" },

            // Private Booths (6 & 8-seaters)
            { id: 13, table_number: "13", capacity: 6, zone: "Booth", shape: "booth", cx: 342, cy: 466, w: 104, h: 46, status: "available" },
            { id: 14, table_number: "14", capacity: 8, zone: "Booth", shape: "booth", cx: 544, cy: 466, w: 128, h: 48, status: "available" }
        ]
    };

    var ZONE_TITLES = {
        Window: "Window-Side Seating",
        Main: "Main Dining Room",
        Patio: "Outdoor Patio / Terrace",
        Booth: "Private Booth"
    };

    function createSvgEl(tag, attrs) {
        var el = document.createElementNS(SVG_NS, tag);
        if (attrs) {
            Object.keys(attrs).forEach(function (key) {
                if (attrs[key] !== null && attrs[key] !== undefined) {
                    el.setAttribute(key, String(attrs[key]));
                }
            });
        }
        return el;
    }

    function notifyUser(message, type) {
        if (typeof window.showOmToast === "function") {
            window.showOmToast(message, type || "info");
        }
    }

    function cloneDefaultTables() {
        return DEFAULT_LAYOUT.tables.map(function (t) {
            return Object.assign({}, t);
        });
    }

    function splitDateTimeValue(rawValue) {
        if (!rawValue || typeof rawValue !== "string") {
            return { date: "", time: "" };
        }
        var trimmed = rawValue.trim();
        var parts = trimmed.split("T");
        if (parts.length !== 2) {
            return { date: "", time: "" };
        }
        return {
            date: parts[0],
            time: parts[1].slice(0, 5)
        };
    }

    function buildDefaultDateTimeLocal() {
        var d = new Date();
        if (d.getHours() >= 21) {
            d.setDate(d.getDate() + 1);
        }
        var yyyy = d.getFullYear();
        var mm = String(d.getMonth() + 1).padStart(2, "0");
        var dd = String(d.getDate()).padStart(2, "0");
        return yyyy + "-" + mm + "-" + dd + "T19:00";
    }

    function getChairOffsets(table) {
        var chairs = [];
        var cw = 18;
        var ch = 8;

        if (table.shape === "round") {
            var r = table.r || 26;
            var dist = r + 9;
            var count = table.capacity || 2;
            for (var i = 0; i < count; i += 1) {
                var angle = (Math.PI * 2 * i) / count + (count === 2 ? 0 : Math.PI / 4);
                chairs.push({
                    x: table.cx + Math.cos(angle) * dist,
                    y: table.cy + Math.sin(angle) * dist,
                    deg: (angle * 180) / Math.PI + 90,
                    w: cw,
                    h: ch
                });
            }
            return chairs;
        }

        if (table.shape === "booth") {
            // Left and right ends plus outer cushioned banquette rendered separately
            return chairs;
        }

        var w = table.w;
        var h = table.h;
        var cap = table.capacity || 4;

        if (cap === 2) {
            chairs.push({ x: table.cx - w / 2 - 9, y: table.cy, deg: 90, w: cw, h: ch });
            chairs.push({ x: table.cx + w / 2 + 9, y: table.cy, deg: 90, w: cw, h: ch });
        } else if (cap === 4) {
            chairs.push({ x: table.cx, y: table.cy - h / 2 - 9, deg: 0, w: cw, h: ch });
            chairs.push({ x: table.cx, y: table.cy + h / 2 + 9, deg: 0, w: cw, h: ch });
            chairs.push({ x: table.cx - w / 2 - 9, y: table.cy, deg: 90, w: cw, h: ch });
            chairs.push({ x: table.cx + w / 2 + 9, y: table.cy, deg: 90, w: cw, h: ch });
        } else {
            // 6-seater rectangle: 2 top, 2 bottom, 1 left, 1 right
            chairs.push({ x: table.cx - w * 0.24, y: table.cy - h / 2 - 9, deg: 0, w: cw, h: ch });
            chairs.push({ x: table.cx + w * 0.24, y: table.cy - h / 2 - 9, deg: 0, w: cw, h: ch });
            chairs.push({ x: table.cx - w * 0.24, y: table.cy + h / 2 + 9, deg: 0, w: cw, h: ch });
            chairs.push({ x: table.cx + w * 0.24, y: table.cy + h / 2 + 9, deg: 0, w: cw, h: ch });
            chairs.push({ x: table.cx - w / 2 - 9, y: table.cy, deg: 90, w: cw, h: ch });
            chairs.push({ x: table.cx + w / 2 + 9, y: table.cy, deg: 90, w: cw, h: ch });
        }
        return chairs;
    }

    function createFloorPlanController(options) {
        var opts = options || {};
        var form = document.querySelector(opts.formSelector || "form[action*='bookings'], form[action*='booking']");
        var mountRoots = Array.prototype.slice.call(
            document.querySelectorAll(opts.containerSelector || "[data-om-table-picker]")
        );

        if (!mountRoots.length) {
            return null;
        }

        var state = {
            tables: cloneDefaultTables(),
            selectedTableId: null,
            activeZone: "ALL",
            partySize: 2,
            slotDate: "",
            slotTime: "",
            liveConnected: false,
            loading: false,
            abortController: null
        };

        var dateInput = form ? form.querySelector("input[name='date']") : null;
        var peopleInput = form ? (form.querySelector("input[name='people']") || form.querySelector("select[name='people']")) : null;
        var hiddenTableInput = ensureHiddenTableInput(form);
        var formSummaryEl = document.getElementById("om-selected-table-pill");

        if (dateInput) {
            if (!dateInput.value) {
                dateInput.value = buildDefaultDateTimeLocal();
            }
            var initialDt = splitDateTimeValue(dateInput.value);
            state.slotDate = initialDt.date;
            state.slotTime = initialDt.time;
        } else {
            var fallbackDt = splitDateTimeValue(buildDefaultDateTimeLocal());
            state.slotDate = fallbackDt.date;
            state.slotTime = fallbackDt.time;
        }

        if (peopleInput && peopleInput.value) {
            var parsedInitPeople = parseInt(peopleInput.value, 10);
            if (!isNaN(parsedInitPeople) && parsedInitPeople >= 1) {
                state.partySize = parsedInitPeople;
            }
        }

        function ensureHiddenTableInput(targetForm) {
            if (!targetForm) return null;
            var existing = targetForm.querySelector("input[name='table_id']");
            if (existing) return existing;

            var hidden = document.createElement("input");
            hidden.type = "hidden";
            hidden.name = "table_id";
            hidden.id = "selectedTableId";
            hidden.value = "";
            targetForm.appendChild(hidden);
            return hidden;
        }

        function getTableById(tableId) {
            if (tableId == null) return null;
            for (var i = 0; i < state.tables.length; i += 1) {
                if (Number(state.tables[i].id) === Number(tableId)) {
                    return state.tables[i];
                }
            }
            return null;
        }

        function getEffectiveTableState(table) {
            var isReserved = String(table.status).toLowerCase() !== "available" || table.available === false;
            if (isReserved) {
                return "reserved";
            }
            if (Number(table.capacity) < Number(state.partySize)) {
                return "too-small";
            }
            if (state.selectedTableId !== null && Number(state.selectedTableId) === Number(table.id)) {
                return "selected";
            }
            return "available";
        }

        function updateFormSync() {
            var selected = getTableById(state.selectedTableId);
            if (hiddenTableInput) {
                hiddenTableInput.value = selected ? String(selected.id) : "";
                hiddenTableInput.dataset.tableNumber = selected ? String(selected.table_number) : "";
                hiddenTableInput.dataset.tableZone = selected ? String(selected.zone) : "";
                hiddenTableInput.dataset.tableCapacity = selected ? String(selected.capacity) : "";
            }

            if (formSummaryEl) {
                var textEl = formSummaryEl.querySelector("[data-om-table-summary-text]");
                var clearBtn = formSummaryEl.querySelector("[data-om-clear-table]");
                if (selected) {
                    formSummaryEl.classList.add("has-selection");
                    if (textEl) {
                        textEl.textContent = "Table " + selected.table_number + " — " + (ZONE_TITLES[selected.zone] || selected.zone) + " (" + selected.capacity + " Seats)";
                    }
                    if (clearBtn) clearBtn.hidden = false;
                } else {
                    formSummaryEl.classList.remove("has-selection");
                    if (textEl) {
                        textEl.textContent = "Auto-assign best table, or click a table on the 2D Floor Plan";
                    }
                    if (clearBtn) clearBtn.hidden = true;
                }
            }
        }

        function setSelectedTable(tableId) {
            state.selectedTableId = tableId !== null ? Number(tableId) : null;
            updateFormSync();
            renderAll();
        }

        function validateSelectedAgainstPartySize() {
            if (state.selectedTableId === null) return;
            var current = getTableById(state.selectedTableId);
            if (!current) {
                setSelectedTable(null);
                return;
            }
            var eff = getEffectiveTableState(current);
            if (eff === "reserved") {
                setSelectedTable(null);
                notifyUser(
                    "Table " + current.table_number + " is reserved for the selected time slot. Please choose an available table.",
                    "error"
                );
            } else if (eff === "too-small") {
                setSelectedTable(null);
                notifyUser(
                    "Table " + current.table_number + " seats up to " + current.capacity + " guests and was deselected for your party of " + state.partySize + ".",
                    "info"
                );
            }
        }

        function setPartySize(nextSize, syncFormField) {
            var val = parseInt(nextSize, 10);
            if (isNaN(val) || val < 1) val = 1;
            if (val > 100) val = 100;
            state.partySize = val;

            if (syncFormField && peopleInput && String(peopleInput.value) !== String(val)) {
                peopleInput.value = String(val);
            }

            validateSelectedAgainstPartySize();
            renderAll();
        }

        function handleTableActivation(table) {
            var eff = getEffectiveTableState(table);
            if (eff === "reserved") {
                notifyUser(
                    "Table " + table.table_number + " (" + (ZONE_TITLES[table.zone] || table.zone) + ") is already reserved for this time slot.",
                    "error"
                );
                return;
            }
            if (eff === "too-small") {
                notifyUser(
                    "Table " + table.table_number + " seats up to " + table.capacity + " guests. Please choose a highlighted table with " + state.partySize + "+ seats.",
                    "error"
                );
                return;
            }

            if (state.selectedTableId !== null && Number(state.selectedTableId) === Number(table.id)) {
                setSelectedTable(null);
                notifyUser("Table " + table.table_number + " deselected.", "info");
                return;
            }

            setSelectedTable(table.id);
            notifyUser(
                "Selected Table " + table.table_number + " (" + (ZONE_TITLES[table.zone] || table.zone) + ", " + table.capacity + " seats).",
                "success"
            );
        }

        function renderFloorSvg(svg, tooltipEl, wrapEl, mountIdx) {
            var idPrefix = "omFp" + (mountIdx || 0) + "-";
            var glowId = idPrefix + "SelectedGlow";
            var hatchId = idPrefix + "ReservedHatch";
            var gridId = idPrefix + "FloorGrid";

            while (svg.firstChild) {
                svg.removeChild(svg.firstChild);
            }

            svg.setAttribute("viewBox", "0 0 " + DEFAULT_LAYOUT.viewBox.width + " " + DEFAULT_LAYOUT.viewBox.height);
            svg.setAttribute("role", "img");
            svg.setAttribute("aria-label", "Interactive OmRestaurant dining room 2D floor plan");

            var defs = createSvgEl("defs");

            // Warm subtle glow filter for selected table
            var glowFilter = createSvgEl("filter", { id: glowId, x: "-30%", y: "-30%", width: "160%", height: "160%" });
            glowFilter.appendChild(createSvgEl("feDropShadow", { dx: "0", dy: "0", stdDeviation: "5", "flood-color": "#FD6B10", "flood-opacity": "0.65" }));
            defs.appendChild(glowFilter);

            // Subtle diagonal hatching pattern for reserved tables
            var hatch = createSvgEl("pattern", { id: hatchId, width: "8", height: "8", patternTransform: "rotate(45 0 0)", patternUnits: "userSpaceOnUse" });
            hatch.appendChild(createSvgEl("rect", { width: "8", height: "8", fill: "#283244" }));
            hatch.appendChild(createSvgEl("line", { x1: "0", y1: "0", x2: "0", y2: "8", stroke: "rgba(255,255,255,0.12)", "stroke-width": "2" }));
            defs.appendChild(hatch);

            // Ambient blueprint dot grid
            var gridPattern = createSvgEl("pattern", { id: gridId, width: "24", height: "24", patternUnits: "userSpaceOnUse" });
            gridPattern.appendChild(createSvgEl("circle", { cx: "2", cy: "2", r: "1", fill: "rgba(241, 248, 255, 0.06)" }));
            defs.appendChild(gridPattern);

            svg.appendChild(defs);

            // Outer Architectural Floor Shell
            svg.appendChild(createSvgEl("rect", {
                x: "8", y: "8", width: "904", height: "544", rx: "18",
                fill: "#0B1324", stroke: "rgba(254, 161, 22, 0.25)", "stroke-width": "2"
            }));
            svg.appendChild(createSvgEl("rect", {
                x: "8", y: "8", width: "904", height: "544", rx: "18",
                fill: "url(#" + gridId + ")"
            }));

            // Architectural fixtures: Panoramic glass windows on left edge
            svg.appendChild(createSvgEl("rect", {
                x: "14", y: "48", width: "6", height: "464", rx: "3",
                fill: "rgba(56, 189, 248, 0.55)"
            }));

            // Open Kitchen & Chef's Pass bar at top of Main Dining
            svg.appendChild(createSvgEl("rect", {
                x: "312", y: "18", width: "270", height: "30", rx: "8",
                fill: "#18233B", stroke: "rgba(254, 161, 22, 0.35)", "stroke-width": "1.2"
            }));
            var kitchenText = createSvgEl("text", {
                x: "447", y: "37", "text-anchor": "middle",
                fill: "#FEA116", "font-size": "11", "font-weight": "700", "letter-spacing": "1.5"
            });
            kitchenText.textContent = "OPEN KITCHEN & CHEF'S PASS";
            svg.appendChild(kitchenText);

            // Patio sliding glass divider & lush corner plants
            svg.appendChild(createSvgEl("line", {
                x1: "672", y1: "40", x2: "672", y2: "520",
                stroke: "rgba(56, 189, 248, 0.35)", "stroke-width": "2", "stroke-dasharray": "8 6"
            }));
            [
                { cx: 702, cy: 48 },
                { cx: 876, cy: 48 },
                { cx: 702, cy: 514 },
                { cx: 876, cy: 514 }
            ].forEach(function (plant) {
                svg.appendChild(createSvgEl("circle", {
                    cx: plant.cx, cy: plant.cy, r: "10",
                    fill: "rgba(34, 197, 94, 0.2)", stroke: "rgba(34, 197, 94, 0.55)", "stroke-width": "1.5"
                }));
                svg.appendChild(createSvgEl("circle", {
                    cx: plant.cx, cy: plant.cy, r: "4",
                    fill: "rgba(74, 222, 128, 0.65)"
                }));
            });

            // Host Desk & Entrance marker at bottom left
            svg.appendChild(createSvgEl("rect", {
                x: "76", y: "538", width: "86", height: "16", rx: "6",
                fill: "#FEA116"
            }));
            var entryLabel = createSvgEl("text", {
                x: "119", y: "549", "text-anchor": "middle",
                fill: "#0F172B", "font-size": "9.5", "font-weight": "800", "letter-spacing": "1"
            });
            entryLabel.textContent = "ENTRANCE";
            svg.appendChild(entryLabel);

            // Render Zone Containers & Headers
            DEFAULT_LAYOUT.zones.forEach(function (zone) {
                var isDimmedZone = state.activeZone !== "ALL" && state.activeZone !== zone.id;
                var zoneGroup = createSvgEl("g", {
                    class: "om-fp-zone" + (isDimmedZone ? " is-dimmed" : ""),
                    "data-zone": zone.id
                });

                var zoneFill = zone.id === "Patio" ? "rgba(22, 101, 52, 0.08)" : "rgba(255, 255, 255, 0.025)";
                var zoneStroke = state.activeZone === zone.id ? "rgba(254, 161, 22, 0.55)" : "rgba(255, 255, 255, 0.1)";

                zoneGroup.appendChild(createSvgEl("rect", {
                    x: zone.x, y: zone.y, width: zone.w, height: zone.h, rx: "14",
                    fill: zoneFill, stroke: zoneStroke, "stroke-width": "1.2"
                }));

                var title = createSvgEl("text", {
                    x: zone.x + 14, y: zone.y + 22,
                    fill: "#FEA116", "font-size": "11.5", "font-weight": "700", "letter-spacing": "0.6"
                });
                title.textContent = zone.label.toUpperCase();
                zoneGroup.appendChild(title);

                var sub = createSvgEl("text", {
                    x: zone.x + 14, y: zone.y + 37,
                    fill: "rgba(241, 248, 255, 0.52)", "font-size": "10", "font-weight": "500"
                });
                sub.textContent = zone.subtitle;
                zoneGroup.appendChild(sub);

                svg.appendChild(zoneGroup);
            });

            // Render Each Dining Table
            state.tables.forEach(function (table) {
                var eff = getEffectiveTableState(table);
                var zoneDimmed = state.activeZone !== "ALL" && state.activeZone !== table.zone;

                var g = createSvgEl("g", {
                    class: [
                        "om-fp-table",
                        "is-" + eff,
                        zoneDimmed ? "is-zone-dimmed" : ""
                    ].filter(Boolean).join(" "),
                    tabindex: "0",
                    role: "button",
                    "data-table-id": table.id,
                    "aria-disabled": eff === "reserved" || eff === "too-small" ? "true" : "false",
                    "aria-pressed": eff === "selected" ? "true" : "false",
                    "aria-label": [
                        "Table " + table.table_number,
                        ZONE_TITLES[table.zone] || table.zone,
                        "Seats " + table.capacity,
                        eff === "selected" ? "Selected" : (eff === "reserved" ? "Reserved" : (eff === "too-small" ? "Too small for party size" : "Available"))
                    ].join(", ")
                });

                if (eff === "selected") {
                    g.setAttribute("filter", "url(#" + glowId + ")");
                }

                // Cushioned Booth Banquette Shell for Booth tables
                if (table.shape === "booth") {
                    var bw = table.w + 34;
                    var bh = table.h + 30;
                    g.appendChild(createSvgEl("rect", {
                        class: "om-fp-booth-sofa",
                        x: table.cx - bw / 2,
                        y: table.cy - bh / 2,
                        width: bw,
                        height: bh,
                        rx: "16"
                    }));
                }

                // Chairs
                getChairOffsets(table).forEach(function (chair) {
                    g.appendChild(createSvgEl("rect", {
                        class: "om-fp-chair",
                        x: chair.x - chair.w / 2,
                        y: chair.y - chair.h / 2,
                        width: chair.w,
                        height: chair.h,
                        rx: "3.5",
                        transform: "rotate(" + chair.deg + " " + chair.x + " " + chair.y + ")"
                    }));
                });

                // Main Table Surface
                if (table.shape === "round") {
                    g.appendChild(createSvgEl("circle", {
                        class: "om-fp-surface",
                        cx: table.cx,
                        cy: table.cy,
                        r: table.r,
                        fill: eff === "reserved" ? "url(#" + hatchId + ")" : null
                    }));
                } else {
                    g.appendChild(createSvgEl("rect", {
                        class: "om-fp-surface",
                        x: table.cx - table.w / 2,
                        y: table.cy - table.h / 2,
                        width: table.w,
                        height: table.h,
                        rx: "10",
                        fill: eff === "reserved" ? "url(#" + hatchId + ")" : null
                    }));
                }

                // Table Label ("T5" or "Table 5" compact -> "T5")
                var numText = createSvgEl("text", {
                    class: "om-fp-label",
                    x: table.cx,
                    y: table.cy - 2,
                    "text-anchor": "middle"
                });
                numText.textContent = "T" + table.table_number;
                g.appendChild(numText);

                // Capacity sub-label ("4 Seats")
                var capText = createSvgEl("text", {
                    class: "om-fp-cap",
                    x: table.cx,
                    y: table.cy + 13,
                    "text-anchor": "middle"
                });
                capText.textContent = eff === "reserved" ? "Booked" : table.capacity + " Seats";
                g.appendChild(capText);

                // Selected Checkmark Badge
                if (eff === "selected") {
                    var badgeX = table.shape === "round" ? table.cx + table.r - 4 : table.cx + table.w / 2 - 2;
                    var badgeY = table.shape === "round" ? table.cy - table.r + 4 : table.cy - table.h / 2 + 2;
                    var badge = createSvgEl("g", { class: "om-fp-check-badge" });
                    badge.appendChild(createSvgEl("circle", {
                        cx: badgeX, cy: badgeY, r: "9.5",
                        fill: "#FFFFFF", stroke: "#FD6B10", "stroke-width": "2"
                    }));
                    badge.appendChild(createSvgEl("path", {
                        d: "M" + (badgeX - 4) + " " + badgeY + " L" + (badgeX - 1) + " " + (badgeY + 3.5) + " L" + (badgeX + 4.5) + " " + (badgeY - 3),
                        fill: "none", stroke: "#FD6B10", "stroke-width": "2.2", "stroke-linecap": "round", "stroke-linejoin": "round"
                    }));
                    g.appendChild(badge);
                }

                // Pointer + Keyboard Tooltip & Selection Interactions
                function positionTooltip(clientX, clientY) {
                    if (!tooltipEl || !wrapEl) return;
                    var effNow = getEffectiveTableState(table);
                    var statusText = effNow === "selected"
                        ? "Selected"
                        : (effNow === "reserved"
                            ? "Reserved for this slot"
                            : (effNow === "too-small" ? "Needs " + state.partySize + "+ seats" : "Available — Click to select"));

                    tooltipEl.innerHTML = "";
                    var heading = document.createElement("div");
                    heading.className = "om-fp-tooltip__title";
                    heading.textContent = "Table " + table.table_number + " — Seats " + table.capacity;

                    var meta = document.createElement("div");
                    meta.className = "om-fp-tooltip__meta";
                    meta.textContent = (ZONE_TITLES[table.zone] || table.zone) + " • " + statusText;

                    tooltipEl.appendChild(heading);
                    tooltipEl.appendChild(meta);
                    tooltipEl.hidden = false;

                    var wrapRect = wrapEl.getBoundingClientRect();
                    var tipRect = tooltipEl.getBoundingClientRect();
                    var left = clientX - wrapRect.left + wrapEl.scrollLeft + 14;
                    var top = clientY - wrapRect.top - tipRect.height - 12;

                    var maxLeft = wrapEl.scrollLeft + wrapEl.clientWidth - tipRect.width - 10;
                    if (left > maxLeft) left = Math.max(wrapEl.scrollLeft + 8, left - tipRect.width - 26);
                    if (left < wrapEl.scrollLeft + 8) left = wrapEl.scrollLeft + 8;
                    if (top < 8) top = clientY - wrapRect.top + 18;

                    tooltipEl.style.left = left + "px";
                    tooltipEl.style.top = top + "px";
                }

                g.addEventListener("mousemove", function (event) {
                    positionTooltip(event.clientX, event.clientY);
                });

                g.addEventListener("mouseenter", function (event) {
                    positionTooltip(event.clientX, event.clientY);
                });

                g.addEventListener("mouseleave", function () {
                    if (tooltipEl) tooltipEl.hidden = true;
                });

                g.addEventListener("focus", function () {
                    var rect = g.getBoundingClientRect();
                    positionTooltip(rect.left + rect.width / 2, rect.top);
                });

                g.addEventListener("blur", function () {
                    if (tooltipEl) tooltipEl.hidden = true;
                });

                g.addEventListener("click", function () {
                    handleTableActivation(table);
                });

                g.addEventListener("keydown", function (event) {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleTableActivation(table);
                    }
                });

                svg.appendChild(g);
            });
        }

        function renderMountRoot(root, mountIdx) {
            var svg = root.querySelector(".om-fp-svg");
            var tooltip = root.querySelector(".om-fp-tooltip");
            var wrap = root.querySelector(".om-fp-canvas-wrap");
            var liveBadge = root.querySelector("[data-om-fp-live-badge]");
            var countBadge = root.querySelector("[data-om-fp-count]");
            var selectedBadge = root.querySelector("[data-om-fp-selected-badge]");
            var syncDate = root.querySelector("[data-om-fp-date]");
            var syncParty = root.querySelector("[data-om-fp-party]");
            var zoneButtons = Array.prototype.slice.call(root.querySelectorAll("[data-om-zone-btn]"));

            if (svg) {
                renderFloorSvg(svg, tooltip, wrap, mountIdx);
            }

            if (liveBadge) {
                liveBadge.textContent = state.loading
                    ? "Checking availability..."
                    : (state.liveConnected ? "Live Supabase Sync" : "Interactive Layout");
                liveBadge.classList.toggle("is-live", state.liveConnected && !state.loading);
            }

            if (selectedBadge) {
                var activeTable = getTableById(state.selectedTableId);
                if (activeTable) {
                    selectedBadge.hidden = false;
                    selectedBadge.textContent = "Selected: T" + activeTable.table_number + " (" + activeTable.capacity + " Seats)";
                } else {
                    selectedBadge.hidden = true;
                    selectedBadge.textContent = "";
                }
            }

            if (countBadge) {
                var matchingCount = state.tables.filter(function (t) {
                    var eff = getEffectiveTableState(t);
                    var zoneMatch = state.activeZone === "ALL" || t.zone === state.activeZone;
                    return zoneMatch && (eff === "available" || eff === "selected");
                }).length;
                countBadge.textContent = matchingCount + " suitable " + (matchingCount === 1 ? "table" : "tables") + " free";
            }

            if (syncDate && state.slotDate && state.slotTime) {
                var combined = state.slotDate + "T" + state.slotTime;
                if (syncDate.value !== combined) {
                    syncDate.value = combined;
                }
            }

            if (syncParty && String(syncParty.value) !== String(state.partySize)) {
                var sizeStr = String(state.partySize);
                if (!syncParty.querySelector('option[value="' + sizeStr + '"]')) {
                    var extraOpt = document.createElement("option");
                    extraOpt.value = sizeStr;
                    extraOpt.textContent = sizeStr + " Guests";
                    syncParty.appendChild(extraOpt);
                }
                syncParty.value = sizeStr;
            }

            zoneButtons.forEach(function (btn) {
                var z = btn.getAttribute("data-om-zone-btn");
                btn.classList.toggle("is-active", z === state.activeZone);
                btn.setAttribute("aria-pressed", z === state.activeZone ? "true" : "false");
            });
        }

        function renderAll() {
            mountRoots.forEach(function (root, idx) {
                renderMountRoot(root, idx);
            });
            updateFormSync();
        }

        function scrollCanvasToZone(root, zoneId) {
            var wrap = root.querySelector(".om-fp-canvas-wrap");
            var svg = root.querySelector(".om-fp-svg");
            if (!wrap || !svg || wrap.scrollWidth <= wrap.clientWidth + 4) return;

            var targetLeft = 0;
            if (zoneId && zoneId !== "ALL") {
                var matchedZone = DEFAULT_LAYOUT.zones.filter(function (z) {
                    return z.id === zoneId;
                })[0];
                if (matchedZone) {
                    var ratioCenter = (matchedZone.x + matchedZone.w / 2) / DEFAULT_LAYOUT.viewBox.width;
                    targetLeft = Math.max(0, Math.round(wrap.scrollWidth * ratioCenter - wrap.clientWidth / 2));
                }
            }
            var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            if (typeof wrap.scrollTo === "function") {
                wrap.scrollTo({ left: targetLeft, behavior: reduced ? "auto" : "smooth" });
            } else {
                wrap.scrollLeft = targetLeft;
            }
        }

        function buildMountMarkup(root) {
            if (root.dataset.omBuilt === "true") return;
            root.dataset.omBuilt = "true";

            root.innerHTML = [
                '<div class="om-fp-shell">',
                '  <div class="om-fp-toolbar">',
                '    <div class="om-fp-toolbar__group">',
                '      <label class="om-fp-toolbar__label">Date &amp; Time</label>',
                '      <input type="datetime-local" class="form-control form-control-sm om-fp-control" data-om-fp-date>',
                '    </div>',
                '    <div class="om-fp-toolbar__group">',
                '      <label class="om-fp-toolbar__label">Party Size</label>',
                '      <select class="form-select form-select-sm om-fp-control" data-om-fp-party>',
                '        <option value="1">1 Guest</option>',
                '        <option value="2" selected>2 Guests</option>',
                '        <option value="3">3 Guests</option>',
                '        <option value="4">4 Guests</option>',
                '        <option value="5">5 Guests</option>',
                '        <option value="6">6 Guests</option>',
                '        <option value="7">7 Guests</option>',
                '        <option value="8">8 Guests</option>',
                '      </select>',
                '    </div>',
                '    <div class="om-fp-status-cluster">',
                '      <span class="om-fp-selected-badge" data-om-fp-selected-badge hidden></span>',
                '      <span class="om-fp-pill" data-om-fp-count>12 suitable tables free</span>',
                '      <span class="om-fp-live-pill" data-om-fp-live-badge>Checking availability...</span>',
                '    </div>',
                '  </div>',
                '  <div class="om-fp-zones" role="group" aria-label="Filter dining zones">',
                '    <button type="button" class="om-fp-zone-btn is-active" data-om-zone-btn="ALL" aria-pressed="true">All Zones</button>',
                '    <button type="button" class="om-fp-zone-btn" data-om-zone-btn="Window" aria-pressed="false">Window (2)</button>',
                '    <button type="button" class="om-fp-zone-btn" data-om-zone-btn="Main" aria-pressed="false">Main Room (4-6)</button>',
                '    <button type="button" class="om-fp-zone-btn" data-om-zone-btn="Patio" aria-pressed="false">Patio (2-4)</button>',
                '    <button type="button" class="om-fp-zone-btn" data-om-zone-btn="Booth" aria-pressed="false">VIP Booths (6-8)</button>',
                '  </div>',
                '  <div class="om-fp-mobile-hint"><i class="fa fa-arrows-alt-h text-primary" aria-hidden="true"></i><span>Swipe map sideways to explore Patio &amp; VIP Booths, or tap a zone pill above.</span></div>',
                '  <div class="om-fp-canvas-wrap">',
                '    <svg class="om-fp-svg" preserveAspectRatio="xMidYMid meet"></svg>',
                '    <div class="om-fp-tooltip" hidden></div>',
                '  </div>',
                '  <div class="om-fp-legend">',
                '    <span class="om-fp-legend__item"><i class="om-fp-swatch om-fp-swatch--available"></i> Available</span>',
                '    <span class="om-fp-legend__item"><i class="om-fp-swatch om-fp-swatch--selected"></i> Selected</span>',
                '    <span class="om-fp-legend__item"><i class="om-fp-swatch om-fp-swatch--reserved"></i> Reserved</span>',
                '    <span class="om-fp-legend__item"><i class="om-fp-swatch om-fp-swatch--small"></i> Too Small for Party</span>',
                '  </div>',
                '</div>'
            ].join("\n");

            var syncDate = root.querySelector("[data-om-fp-date]");
            var syncParty = root.querySelector("[data-om-fp-party]");

            if (syncDate) {
                syncDate.addEventListener("change", function () {
                    var dt = splitDateTimeValue(syncDate.value);
                    if (dateInput && dateInput.value !== syncDate.value) {
                        dateInput.value = syncDate.value;
                    }
                    state.slotDate = dt.date;
                    state.slotTime = dt.time;
                    refreshAvailability();
                });
            }

            if (syncParty) {
                syncParty.addEventListener("change", function () {
                    setPartySize(syncParty.value, true);
                });
            }

            root.querySelectorAll("[data-om-zone-btn]").forEach(function (btn) {
                btn.addEventListener("click", function () {
                    state.activeZone = btn.getAttribute("data-om-zone-btn") || "ALL";
                    renderAll();
                    mountRoots.forEach(function (mountEl) {
                        scrollCanvasToZone(mountEl, state.activeZone);
                    });
                });
            });
        }

        function mergeAvailabilityRows(apiTables) {
            if (!Array.isArray(apiTables) || !apiTables.length) return;
            var byId = new Map();
            var byNumber = new Map();
            apiTables.forEach(function (row) {
                if (row && row.id != null) byId.set(Number(row.id), row);
                if (row && row.table_number != null) byNumber.set(String(row.table_number), row);
            });

            state.tables = DEFAULT_LAYOUT.tables.map(function (layoutTable) {
                var matched = byId.get(Number(layoutTable.id)) || byNumber.get(String(layoutTable.table_number));
                if (!matched) return Object.assign({}, layoutTable);
                return Object.assign({}, layoutTable, {
                    capacity: matched.capacity != null ? Number(matched.capacity) : layoutTable.capacity,
                    zone: matched.zone || layoutTable.zone,
                    status: matched.status || (matched.available === false ? "reserved" : "available"),
                    available: matched.available !== undefined ? Boolean(matched.available) : String(matched.status).toLowerCase() === "available"
                });
            });
        }

        function refreshAvailability() {
            if (state.abortController && typeof state.abortController.abort === "function") {
                state.abortController.abort();
            }
            var controller = typeof AbortController !== "undefined" ? new AbortController() : null;
            state.abortController = controller;
            state.loading = true;
            renderAll();

            var params = new URLSearchParams();
            if (state.slotDate) params.set("date", state.slotDate);
            if (state.slotTime) params.set("time", state.slotTime);

            var endpoint = "/api/tables/availability" + (params.toString() ? "?" + params.toString() : "");
            return fetch(endpoint, {
                method: "GET",
                headers: { Accept: "application/json" },
                signal: controller ? controller.signal : undefined
            })
                .then(function (res) {
                    if (!res.ok) throw new Error("HTTP " + res.status);
                    return res.json();
                })
                .then(function (data) {
                    var rows = Array.isArray(data) ? data : (data && data.tables ? data.tables : []);
                    mergeAvailabilityRows(rows);
                    state.liveConnected = true;
                    state.loading = false;
                    validateSelectedAgainstPartySize();
                    renderAll();
                })
                .catch(function (err) {
                    if (err && err.name === "AbortError") return;
                    state.liveConnected = false;
                    state.loading = false;
                    renderAll();
                });
        }

        // Initialize DOM markup in all mounts (inline + modal)
        mountRoots.forEach(buildMountMarkup);

        // Bind existing booking form inputs -> sync Floor Plan immediately
        if (dateInput) {
            dateInput.addEventListener("change", function () {
                var dt = splitDateTimeValue(dateInput.value);
                state.slotDate = dt.date;
                state.slotTime = dt.time;
                refreshAvailability();
            });
        }

        if (peopleInput) {
            var syncPeopleFromForm = function () {
                if (!peopleInput.value) return;
                setPartySize(peopleInput.value, false);
            };
            peopleInput.addEventListener("input", syncPeopleFromForm);
            peopleInput.addEventListener("change", syncPeopleFromForm);
        }

        if (formSummaryEl) {
            var clearBtn = formSummaryEl.querySelector("[data-om-clear-table]");
            if (clearBtn) {
                clearBtn.addEventListener("click", function () {
                    setSelectedTable(null);
                });
            }
        }

        if (form) {
            form.addEventListener("reset", function () {
                window.setTimeout(function () {
                    setSelectedTable(null);
                    if (dateInput && !dateInput.value) {
                        dateInput.value = buildDefaultDateTimeLocal();
                        var dt = splitDateTimeValue(dateInput.value);
                        state.slotDate = dt.date;
                        state.slotTime = dt.time;
                    }
                    refreshAvailability();
                }, 0);
            });
        }

        document.addEventListener("om:booking-complete", function () {
            setSelectedTable(null);
            refreshAvailability();
        });

        document.addEventListener("om:table-conflict", function () {
            setSelectedTable(null);
            refreshAvailability();
        });

        renderAll();
        refreshAvailability();

        return {
            refreshAvailability: refreshAvailability,
            setPartySize: setPartySize,
            selectTable: setSelectedTable,
            getSelectedTable: function () {
                return getTableById(state.selectedTableId);
            },
            openModal: function () {
                var modalEl = document.getElementById("floorPlanModal");
                if (modalEl && window.bootstrap && window.bootstrap.Modal) {
                    window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
                }
            }
        };
    }

    window.OmTablePicker = {
        LAYOUT: DEFAULT_LAYOUT,
        mount: createFloorPlanController,
        openModal: function () {
            if (window.OmTablePicker._instance) {
                window.OmTablePicker._instance.openModal();
            }
        },
        refreshAvailability: function () {
            if (window.OmTablePicker._instance) {
                return window.OmTablePicker._instance.refreshAvailability();
            }
            return Promise.resolve();
        }
    };

    function boot() {
        var instance = createFloorPlanController();
        if (instance) {
            window.OmTablePicker._instance = instance;
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot, { once: true });
    } else {
        boot();
    }
})();
