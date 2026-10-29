#!/usr/bin/env python3
import http.server
import socketserver
import urllib.parse
import sqlite3
import subprocess
import os
import re

PORT = 8000
DB_FILE = "omrestaurant.sqlite3"
EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

SUPABASE_HOST = "aws-0-eu-west-1.pooler.supabase.com"
SUPABASE_PORT = "5432"
SUPABASE_USER = "postgres.ujiftprtpulyhudloyvp"
SUPABASE_PASSWORD = os.environ.get("DB_PASSWORD", "wajdu4-gadsaj-qofWep")
SUPABASE_DB = "postgres"

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
            "-c", query
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
        conn.execute("""
            CREATE TABLE IF NOT EXISTS booking (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                booking_at TEXT NOT NULL,
                people INTEGER NOT NULL,
                request TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS contact_us (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                subject TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS newsletter (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
    conn.close()

def escape_sql(val):
    if val is None:
        return "NULL"
    return "'" + str(val).replace("'", "''") + "'"

class DevServerHandler(http.server.SimpleHTTPRequestHandler):
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
                # Save to Supabase
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
            try:
                people = int(people_str)
            except ValueError:
                people = 1

            if name and EMAIL_REGEX.match(email) and 1 <= people <= 100:
                cursor.execute(
                    "INSERT INTO booking (name, email, booking_at, people, request) VALUES (?, ?, ?, ?, ?)",
                    (name, email, date, people, request_text),
                )
                conn.commit()
                # Save to Supabase
                db_date = date if date else "NOW()"
                date_val = escape_sql(db_date) if date else "NOW()"
                save_to_supabase(
                    f"INSERT INTO booking (name, email, booking_at, people, request) VALUES "
                    f"({escape_sql(name)}, {escape_sql(email)}, {date_val}, {people}, {escape_sql(request_text)});"
                )
                status = "booking-success"
            else:
                status = "invalid"
            target = f"/booking.html?status={status}"

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
                # Save to Supabase
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
        print(f"OmRestaurant dev server running at http://localhost:{PORT}/ (Supabase connected)")
        httpd.serve_forever()

if __name__ == "__main__":
    run()
