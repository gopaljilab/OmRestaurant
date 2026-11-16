#!/usr/bin/env python3
from datetime import datetime, timedelta
import http.server
import json
import os
import re
import socketserver
import sqlite3
import subprocess
import urllib.parse

def load_dotenv():
    env_file = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_file):
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip("'\"")
                    if k not in os.environ:
                        os.environ[k] = v

load_dotenv()

PORT = 8000
DB_FILE = "omrestaurant.sqlite3"
EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
SLOT_HALF_WINDOW = timedelta(minutes=90)

SUPABASE_HOST = os.environ.get("DB_HOST", "aws-0-ap-south-1.pooler.supabase.com")
SUPABASE_PORT = os.environ.get("DB_PORT", "5432")
SUPABASE_USER = os.environ.get("DB_USERNAME", "postgres.dpckliukvkdwerjqbxhu")
SUPABASE_PASSWORD = os.environ.get("DB_PASSWORD", "pedkUc-fawpuh-noxji6")
SUPABASE_DB = os.environ.get("DB_NAME", "postgres")

SEED_TABLES = [
    (1, "1", 2, "Window", "available"),
    (2, "2", 2, "Window", "available"),
    (3, "3", 2, "Window", "available"),
    (4, "4", 2, "Window", "available"),
    (5, "5", 4, "Main", "available"),
    (6, "6", 4, "Main", "available"),
    (7, "7", 4, "Main", "available"),
    (8, "8", 6, "Main", "available"),
    (9, "9", 6, "Main", "available"),
    (10, "10", 2, "Patio", "available"),
    (11, "11", 4, "Patio", "available"),
    (12, "12", 4, "Patio", "available"),
    (13, "13", 6, "Booth", "available"),
    (14, "14", 8, "Booth", "available"),
]


def save_to_supabase(query):
    try:
        psql_path = "/opt/homebrew/opt/libpq/bin/psql"
        if not os.path.exists(psql_path):
            psql_path = "psql"
        env = os.environ.copy()
        env["PGPASSWORD"] = SUPABASE_PASSWORD
        cmd = [
            psql_path,
            "-h", SUPABASE_HOST,
            "-p", SUPABASE_PORT,
            "-U", SUPABASE_USER,
            "-d", SUPABASE_DB,
            "-c", query,
        ]
        res = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=8)
        if res.returncode != 0:
            print("Supabase query error:", res.stderr.strip())
        return res.returncode == 0
    except Exception as err:
        print("Supabase connection warning:", err)
        return False


def init_db():
    conn = sqlite3.connect(DB_FILE)
    with conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS tables (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                table_number TEXT NOT NULL UNIQUE,
                capacity INTEGER NOT NULL,
                zone TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'available'
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS booking (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                booking_at TEXT NOT NULL,
                people INTEGER NOT NULL,
                request TEXT NOT NULL,
                table_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        cols = {row[1] for row in conn.execute("PRAGMA table_info(booking)").fetchall()}
        if "table_id" not in cols:
            conn.execute("ALTER TABLE booking ADD COLUMN table_id INTEGER")

        conn.executemany(
            """
            INSERT OR IGNORE INTO tables (id, table_number, capacity, zone, status)
            VALUES (?, ?, ?, ?, ?)
            """,
            SEED_TABLES,
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS contact_us (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                subject TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS newsletter (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
    conn.close()


def escape_sql(val):
    if val is None:
        return "NULL"
    return "'" + str(val).replace("'", "''") + "'"


def parse_booking_dt(raw):
    if not raw:
        return None
    text = raw.strip().replace(" ", "T")
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def compute_reserved_table_ids(cursor, target_slot):
    reserved_ids = set()
    rows = cursor.execute(
        "SELECT table_id, booking_at FROM booking WHERE table_id IS NOT NULL"
    ).fetchall()
    for tid, booking_at in rows:
        dt = parse_booking_dt(booking_at)
        if dt is not None and abs(dt - target_slot) < SLOT_HALF_WINDOW:
            reserved_ids.add(tid)
    return reserved_ids


class DevServerHandler(http.server.SimpleHTTPRequestHandler):
    def send_json(self, status_code, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def wants_json(self):
        accept = self.headers.get("Accept", "")
        return "application/json" in accept

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path.rstrip("/") == "/api/tables/availability":
            qs = urllib.parse.parse_qs(parsed.query)
            date_str = qs.get("date", [""])[0].strip()
            time_str = qs.get("time", [""])[0].strip()

            try:
                resolved_date = (
                    datetime.strptime(date_str, "%Y-%m-%d").date()
                    if date_str
                    else datetime.now().date()
                )
                if time_str:
                    fmt = "%H:%M:%S" if len(time_str) == 8 else "%H:%M"
                    resolved_time = datetime.strptime(time_str, fmt).time()
                else:
                    resolved_time = datetime.strptime("19:00", "%H:%M").time()
            except ValueError:
                self.send_json(
                    400,
                    {"error": "Invalid date or time format. Expected date=YYYY-MM-DD and time=HH:MM"},
                )
                return

            target_slot = datetime.combine(resolved_date, resolved_time)
            conn = sqlite3.connect(DB_FILE)
            cursor = conn.cursor()
            booked_ids = compute_reserved_table_ids(cursor, target_slot)
            rows = cursor.execute(
                "SELECT id, table_number, capacity, zone, status FROM tables ORDER BY id"
            ).fetchall()
            conn.close()

            tables_payload = []
            for tid, num, cap, zone, base_status in rows:
                is_reserved = (base_status or "").lower() != "available" or tid in booked_ids
                tables_payload.append(
                    {
                        "id": tid,
                        "table_number": num,
                        "capacity": cap,
                        "zone": zone,
                        "status": "reserved" if is_reserved else "available",
                        "available": not is_reserved,
                    }
                )
            self.send_json(200, tables_payload)
            return

        super().do_GET()

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        raw_body = self.rfile.read(content_length).decode("utf-8", errors="replace")
        params = urllib.parse.parse_qs(raw_body)

        path = self.path.split("?")[0].rstrip("/")
        referer = self.headers.get("Referer", "/index.html")
        ref_path = urllib.parse.urlparse(referer).path or "/index.html"
        if ref_path == "/":
            ref_path = "/index.html"

        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()

        if path in ["/php/newsletter.php", "/newsletter"]:
            email = params.get("email", [""])[0].strip()
            if email and EMAIL_REGEX.match(email):
                cursor.execute("INSERT INTO newsletter (email) VALUES (?)", (email,))
                conn.commit()
                save_to_supabase(f"INSERT INTO newsletter (email) VALUES ({escape_sql(email)});")
                status = "newsletter-success"
            else:
                status = "invalid"
            target = f"{ref_path}?status={status}"

        elif path in ["/php/booking.php", "/bookings"]:
            name = params.get("name", [""])[0].strip()
            email = params.get("email", [""])[0].strip()
            date = params.get("date", [""])[0].strip()
            people_str = params.get("people", [""])[0].strip()
            request_text = params.get("request", [""])[0].strip()
            table_id_raw = params.get("table_id", [""])[0].strip()
            wants_json = self.wants_json()

            try:
                people = int(people_str)
            except ValueError:
                people = 0

            table_id = None
            table_id_valid = True
            if table_id_raw:
                try:
                    table_id = int(table_id_raw)
                    if table_id <= 0:
                        table_id_valid = False
                except ValueError:
                    table_id_valid = False

            booking_dt = parse_booking_dt(date) if date else datetime.now()
            if not (name and EMAIL_REGEX.match(email) and 1 <= people <= 100 and table_id_valid and booking_dt):
                conn.close()
                if wants_json:
                    self.send_json(400, {"ok": False, "status": "invalid", "error": "Please provide valid booking details."})
                else:
                    self.send_response(303)
                    self.send_header("Location", "/booking.html?status=invalid")
                    self.end_headers()
                return

            selected_row = None
            if table_id is not None:
                cursor.execute("BEGIN IMMEDIATE")
                selected_row = cursor.execute(
                    "SELECT id, table_number, capacity, zone, status FROM tables WHERE id = ?",
                    (table_id,),
                ).fetchone()
                if not selected_row:
                    conn.rollback()
                    conn.close()
                    if wants_json:
                        self.send_json(400, {"ok": False, "status": "invalid", "error": "Selected table was not found."})
                    else:
                        self.send_response(303)
                        self.send_header("Location", "/booking.html?status=invalid")
                        self.end_headers()
                    return

                _, t_num, t_cap, t_zone, t_status = selected_row
                if t_cap < people:
                    conn.rollback()
                    conn.close()
                    msg = f"Table {t_num} seats up to {t_cap} guests."
                    if wants_json:
                        self.send_json(400, {"ok": False, "status": "invalid", "error": msg})
                    else:
                        self.send_response(303)
                        self.send_header("Location", "/booking.html?status=invalid")
                        self.end_headers()
                    return

                booked_ids = compute_reserved_table_ids(cursor, booking_dt)
                if (t_status or "").lower() != "available" or table_id in booked_ids:
                    conn.rollback()
                    conn.close()
                    msg = f"Table {t_num} is already reserved around this time slot."
                    if wants_json:
                        self.send_json(409, {"ok": False, "status": "table-unavailable", "error": msg})
                    else:
                        self.send_response(303)
                        self.send_header("Location", "/booking.html?status=table-unavailable")
                        self.end_headers()
                    return

            cursor.execute(
                "INSERT INTO booking (name, email, booking_at, people, request, table_id) VALUES (?, ?, ?, ?, ?, ?)",
                (name, email, date, people, request_text, table_id),
            )
            booking_id = cursor.lastrowid
            conn.commit()

            db_date = date if date else "NOW()"
            date_val = escape_sql(db_date) if date else "NOW()"
            tid_sql = str(table_id) if table_id is not None else "NULL"
            save_to_supabase(
                f"INSERT INTO booking (name, email, booking_at, people, request, table_id) VALUES "
                f"({escape_sql(name)}, {escape_sql(email)}, {date_val}, {people}, {escape_sql(request_text)}, {tid_sql});"
            )

            conn.close()
            reservation_id = f"OM-B{booking_id}" if booking_id else f"OM-B{int(datetime.now().timestamp())}"
            if wants_json:
                payload = {
                    "ok": True,
                    "status": "booking-success",
                    "booking_id": booking_id,
                    "reservation_id": reservation_id,
                    "id": booking_id,
                }
                if selected_row:
                    payload["table_id"] = selected_row[0]
                    payload["table_number"] = selected_row[1]
                    payload["zone"] = selected_row[3]
                self.send_json(200, payload)
            else:
                self.send_response(303)
                self.send_header("Location", "/booking.html?status=booking-success")
                self.end_headers()
            return

        elif path in ["/php/contact_us.php", "/php/contact.php", "/contact"]:
            name = params.get("name", [""])[0].strip()
            email = params.get("email", [""])[0].strip()
            subject = params.get("subject", [""])[0].strip()
            message = params.get("message", [""])[0].strip()

            if name and subject and message and EMAIL_REGEX.match(email):
                cursor.execute(
                    "INSERT INTO contact_us (name, email, subject, message) VALUES (?, ?, ?, ?)",
                    (name, email, subject, message),
                )
                conn.commit()
                save_to_supabase(
                    f"INSERT INTO contact_us (name, email, subject, message) VALUES "
                    f"({escape_sql(name)}, {escape_sql(email)}, {escape_sql(subject)}, {escape_sql(message)});"
                )
                status = "contact-success"
            else:
                status = "invalid"
            target = f"/contact.html?status={status}"
        else:
            conn.close()
            self.send_error(404, "Endpoint not found")
            return

        conn.close()
        self.send_response(303)
        self.send_header("Location", target)
        self.end_headers()


def run():
    init_db()
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), DevServerHandler) as httpd:
        print(f"OmRestaurant dev server running at http://localhost:{PORT}/")
        httpd.serve_forever()


if __name__ == "__main__":
    run()
