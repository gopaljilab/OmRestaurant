# OM Restaurant — Kitchen Display System (KDS) Frontend

A modern, high-contrast Kitchen Operations and Display System built with **React**, **TypeScript**, **Tailwind CSS**, and **Vite**.

Designed specifically for busy restaurant kitchen displays, wall-mounted monitors, and kitchen tablets, providing real-time visibility and control over order intake, preparation stations, and menu availability.

---

## 🛠 Technology Stack

- **Framework**: React 18
- **Language**: TypeScript 5.6
- **Build Tool**: Vite 5
- **Routing**: React Router DOM 6
- **Styling**: Tailwind CSS 3 (Custom dark kitchen theme with high-contrast status colors)
- **Icons**: Lucide React
- **Backend API**: Spring Boot 4.1.1 (Java 21) REST Endpoints

---

## 📂 Project Structure

```
kds-frontend/
├── src/
│   ├── app/
│   │   ├── App.tsx                     # Main application entry point
│   │   └── router.tsx                  # React Router setup with 6 kitchen routes
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx              # Live clock, network indicator, active count
│   │   │   ├── Sidebar.tsx             # 6 primary operational routes
│   │   │   └── MainLayout.tsx          # Responsive layout container
│   │   └── ui/
│   │       ├── Badge.tsx               # Status badges (incoming, cooking, ready, etc.)
│   │       ├── Button.tsx              # Styled buttons with loading spinners
│   │       ├── Card.tsx                # High-contrast slate card containers
│   │       └── StatCard.tsx            # KPI metric cards with icons
│   ├── features/
│   │   ├── dashboard/
│   │   │   └── OverviewPage.tsx        # Live overview, 5 station loads, orders table
│   │   ├── orders/
│   │   │   └── OrdersPage.tsx          # Order management, item checkboxes, KOT viewer
│   │   ├── kitchen/
│   │   │   └── StationsPage.tsx        # Station-specific chef workstation view
│   │   ├── menu/
│   │   │   └── MenuAvailabilityPage.tsx# 86 dish management for 174 menu dishes
│   │   ├── history/
│   │   │   └── HistoryPage.tsx         # Fulfilled & cancelled order archive
│   │   └── settings/
│   │       └── SettingsPage.tsx        # Acoustic alerts, printers, sync interval
│   ├── hooks/
│   │   └── usePolling.ts               # Background data sync hook
│   ├── services/
│   │   ├── api.ts                      # Centralized typed HTTP client with error handling
│   │   ├── orders.ts                   # Orders & KOT REST API service
│   │   └── menu.ts                     # Menu & 86 availability REST API service
│   ├── types/
│   │   ├── order.ts                    # Orders, items, stations, and KOT types
│   │   ├── menu.ts                     # Menu item and stock availability types
│   │   └── index.ts                    # Re-exports
│   ├── styles/
│   │   └── globals.css                 # Tailwind directives & custom dark scrollbars
│   └── main.tsx                        # DOM bootstrap
├── index.html                          # Root HTML with kitchen viewport & Google fonts
├── package.json                        # Dependencies & scripts
├── tailwind.config.js                  # KDS custom color palette
├── tsconfig.json                       # TypeScript compiler options
└── vite.config.ts                      # Vite dev server + proxy to Spring Boot (:8080)
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18 (Tested on Node v22.x)
- OM Restaurant Spring Boot backend running on `http://localhost:8080`

### 1. Installation

```bash
cd kds-frontend
npm install
```

### 2. Development Server

Start Vite with hot-module replacement and the built-in `/api` proxy forwarding to Spring Boot:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Production Build

To compile TypeScript and produce optimized static assets:

```bash
npm run build
```

Assets will be output to `kds-frontend/dist/`.

---

## 📡 Spring Boot REST Endpoints Used

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/orders` | List orders (optional `?status=` filter) |
| `GET` | `/api/orders/{id}` | Retrieve order details and line items |
| `POST` | `/api/orders` | Create an order with line items |
| `PATCH` | `/api/orders/{id}/status` | Update order status (`preparing`, `ready`, `served`, etc.) |
| `PATCH` | `/api/orders/{id}/items/{itemId}` | Update individual item status (`pending`, `cooking`, `done`) |
| `GET` | `/api/orders/{id}/kot` | Fetch Kitchen Order Ticket and formatted thermal ticket |
| `GET` | `/api/menu/items` | Retrieve all 174 menu dishes with live availability |
| `GET` | `/api/menu/availability` | Fetch 86 dish availability overrides |
| `POST` | `/api/menu/availability` | 86 or restore dish availability |

---

## 🎨 Kitchen Design Principles

1. **High Visual Contrast**: Dark background (`#0a0e17`) paired with bright status indicators ensures readability under harsh kitchen fluorescent lights and steam.
2. **Tabular Numerals**: Monospace font (`JetBrains Mono`) for ticket numbers and elapsed timers ensures no jitter during live updates.
3. **No Fabricated Data**: The system only displays real orders and catalog data from Spring Boot. Clear, descriptive empty and loading states are rendered when no tickets are active.
4. **Touchscreen Friendly**: Generous tap targets (minimum 44px) for tablet and wall-mounted touch displays.
