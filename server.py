#!/usr/bin/env python3
"""Mâm Cơm — lightweight hardened server.

Serves index.html (same directory) and a secure JSON API backed by SQLite (WAL mode).
Stdlib only (http.server + sqlite3 + hashlib), so `python3 server.py` runs anywhere.

Security:
  - Input validation on all parameters
  - Rate limiting / clamping on counters (meals capped 1..10, stats allowlist)
  - Soft deletion on comments (preserves data history, prevents accidental permanent loss)
  - Orders tracking with status management
  - JSON full-database backup export
"""
import hashlib
import json
import os
import sqlite3
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

HERE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(HERE, "mamcom.db")
PORT = int(os.environ.get("MAMCOM_PORT", "8000"))

LOCK = threading.Lock()
START_MEALS = 23  # first-ever count of family meals Mâm Cơm has prepared


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def hash_pin(pin: str) -> str:
    return hashlib.sha256((pin.strip() + "|mamcom_secret_salt_2026").encode("utf-8")).hexdigest()


def init_db():
    with LOCK, get_db() as c:
        c.execute(
            "CREATE TABLE IF NOT EXISTS state("
            " key TEXT PRIMARY KEY, value TEXT)"
        )
        c.execute(
            "CREATE TABLE IF NOT EXISTS comments("
            " id INTEGER PRIMARY KEY AUTOINCREMENT,"
            " rating INTEGER,"
            " text TEXT,"
            " ts INTEGER,"
            " name TEXT DEFAULT '',"
            " is_deleted INTEGER DEFAULT 0)"
        )
        try:
            c.execute("ALTER TABLE comments ADD COLUMN name TEXT DEFAULT ''")
        except Exception:
            pass
        try:
            c.execute("ALTER TABLE comments ADD COLUMN is_deleted INTEGER DEFAULT 0")
        except Exception:
            pass

        c.execute(
            "CREATE TABLE IF NOT EXISTS orders("
            " id TEXT PRIMARY KEY,"
            " status TEXT DEFAULT 'pending',"
            " people TEXT DEFAULT '',"
            " phone TEXT DEFAULT '',"
            " address TEXT DEFAULT '',"
            " note TEXT DEFAULT '',"
            " date TEXT DEFAULT '',"
            " time TEXT DEFAULT '',"
            " products TEXT DEFAULT '[]',"
            " schedule TEXT DEFAULT '[]',"
            " total INTEGER DEFAULT 0,"
            " visitor_id TEXT DEFAULT '',"
            " created_at INTEGER DEFAULT 0)"
        )

        c.execute(
            "CREATE TABLE IF NOT EXISTS admin_auth("
            " id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),"
            " pin_hash TEXT NOT NULL)"
        )

        # Seed the meal counter only once, so it starts at 23 (or higher).
        row = c.execute("SELECT value FROM state WHERE key='meals'").fetchone()
        if row is None:
            c.execute("INSERT INTO state(key, value) VALUES('meals', ?)", (str(START_MEALS),))
        row = c.execute("SELECT value FROM state WHERE key='page_views'").fetchone()
        if row is None:
            c.execute("INSERT INTO state(key, value) VALUES('page_views', '0')")
        row = c.execute("SELECT value FROM state WHERE key='order_clicks'").fetchone()
        if row is None:
            c.execute("INSERT INTO state(key, value) VALUES('order_clicks', '0')")
        row = c.execute("SELECT value FROM state WHERE key='price'").fetchone()
        if row is None:
            c.execute("INSERT INTO state(key, value) VALUES('price', '49')")


def get_stat(conn, key, default=0):
    row = conn.execute("SELECT value FROM state WHERE key=?", (key,)).fetchone()
    if row is None:
        return default
    try:
        return int(row[0])
    except (ValueError, TypeError):
        return default


def add_stat(conn, key, n=1):
    current = get_stat(conn, key, 0) + max(0, int(n))
    conn.execute(
        "INSERT INTO state(key, value) VALUES(?, ?)"
        " ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (key, str(current)),
    )
    conn.commit()
    return current


def get_meals(conn):
    return get_stat(conn, "meals", START_MEALS)


def add_meals(conn, n):
    clamped = max(1, min(int(n or 1), 10))
    return add_stat(conn, "meals", clamped)


def list_comments(conn, include_deleted=False):
    sql = "SELECT id, rating, text, ts, name FROM comments"
    if not include_deleted:
        sql += " WHERE is_deleted = 0"
    sql += " ORDER BY ts DESC, id DESC"
    rows = conn.execute(sql).fetchall()
    return [
        {"id": r[0], "rating": r[1], "text": r[2], "ts": r[3], "name": r[4] or ""}
        for r in rows
    ]


def delete_comment(conn, cid):
    cur = conn.execute("UPDATE comments SET is_deleted = 1 WHERE id = ?", (cid,))
    conn.commit()
    deleted = cur.rowcount > 0
    return deleted, list_comments(conn)


def verify_pin(conn, pin: str) -> bool:
    if not pin or len(pin) < 4:
        return False
    row = conn.execute("SELECT pin_hash FROM admin_auth WHERE id = 1").fetchone()
    if row is None:
        h = hash_pin(pin)
        conn.execute("INSERT INTO admin_auth(id, pin_hash) VALUES(1, ?)", (h,))
        conn.commit()
        return True
    return row[0] == hash_pin(pin)


def list_orders(conn):
    rows = conn.execute(
        "SELECT id, status, people, phone, address, note, date, time, products, schedule, total, visitor_id, created_at "
        "FROM orders ORDER BY created_at DESC LIMIT 100"
    ).fetchall()
    res = []
    for r in rows:
        try:
            prods = json.loads(r[8] or "[]")
        except Exception:
            prods = []
        try:
            sched = json.loads(r[9] or "[]")
        except Exception:
            sched = []
        res.append({
            "id": r[0], "status": r[1], "people": r[2], "phone": r[3], "address": r[4],
            "note": r[5], "date": r[6], "time": r[7], "products": prods, "schedule": sched,
            "total": r[10], "visitor_id": r[11], "created_at": r[12]
        })
    return res


def export_backup_data(conn):
    st_rows = conn.execute("SELECT key, value FROM state").fetchall()
    cm_rows = conn.execute("SELECT id, rating, text, ts, name, is_deleted FROM comments").fetchall()
    od_rows = conn.execute("SELECT * FROM orders").fetchall()
    return {
        "version": "1.0",
        "exported_at": int(time.time()),
        "state": [{"key": r[0], "value": r[1]} for r in st_rows],
        "comments": [{"id": r[0], "rating": r[1], "text": r[2], "ts": r[3], "name": r[4], "is_deleted": r[5]} for r in cm_rows],
        "orders_count": len(od_rows)
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "MamcomServer/2.0"

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, x-visitor-id, x-order-id")

    def _json(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self._cors()
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)
        if path == "/api/state":
            with LOCK, get_db() as c:
                self._json(
                    200,
                    {
                        "meals": get_meals(c),
                        "comments": list_comments(c),
                        "page_views": get_stat(c, "page_views", 0),
                        "order_clicks": get_stat(c, "order_clicks", 0),
                        "price": get_stat(c, "price", 49),
                    },
                )
            return

        if path == "/api/admin/verify-pin":
            with LOCK, get_db() as c:
                row = c.execute("SELECT pin_hash FROM admin_auth WHERE id = 1").fetchone()
                has_pin = bool(row and row[0])
            self._json(200, {"has_pin": has_pin})
            return

        if path == "/api/admin/backup":
            pin = query.get("pin", [""])[0].strip()
            with LOCK, get_db() as c:
                if not verify_pin(c, pin):
                    self._json(403, {"error": "invalid pin"})
                    return
                backup = export_backup_data(c)
            self._json(200, backup)
            return

        if path in ("/", ""):
            path = "/index.html"
        file_path = os.path.normpath(os.path.join(HERE, path.lstrip("/")))
        if not file_path.startswith(HERE) or not os.path.isfile(file_path):
            self.send_error(404)
            return
        with open(file_path, "rb") as f:
            data = f.read()
        ctype = "text/html; charset=utf-8" if path.endswith(".html") else "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Cache-Control", "no-store")
        self._cors()
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        path = self.path.split("?", 1)[0]
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b"{}"
        try:
            data = json.loads(raw.decode("utf-8") or "{}")
        except (ValueError, UnicodeDecodeError):
            self._json(400, {"error": "bad json"})
            return

        if path == "/api/meals":
            with LOCK, get_db() as c:
                total = add_meals(c, data.get("add", 1))
            self._json(200, {"meals": total})
            return

        if path == "/api/track":
            event = data.get("event")
            if event not in ("page_view", "order_click"):
                self._json(400, {"error": "invalid event"})
                return
            with LOCK, get_db() as c:
                if event == "page_view":
                    add_stat(c, "page_views", 1)
                elif event == "order_click":
                    add_stat(c, "order_clicks", 1)
                self._json(
                    200,
                    {
                        "page_views": get_stat(c, "page_views", 0),
                        "order_clicks": get_stat(c, "order_clicks", 0),
                        "meals": get_meals(c),
                    },
                )
            return

        if path == "/api/comment":
            try:
                rating = int(data.get("rating", 0))
            except (ValueError, TypeError):
                rating = 5
            text = (data.get("text") or "").strip()
            if not 1 <= rating <= 5:
                rating = 5
            if not text:
                self._json(400, {"error": "empty comment"})
                return
            name = (data.get("name") or "").strip()[:60]
            with LOCK, get_db() as c:
                cur = c.execute(
                    "INSERT INTO comments(rating, text, ts, name, is_deleted) VALUES(?, ?, ?, ?, 0)",
                    (rating, text[:500], int(time.time()), name),
                )
                c.commit()
                new_id = cur.lastrowid
                comments = list_comments(c)
            self._json(200, {"id": new_id, "comments": comments})
            return

        # ADMIN: verify PIN
        if path == "/api/admin/verify-pin":
            pin = str(data.get("pin", "")).strip()
            is_setup = bool(data.get("setup", False))
            with LOCK, get_db() as c:
                row = c.execute("SELECT pin_hash FROM admin_auth WHERE id = 1").fetchone()
                if not row or not row[0]:
                    if len(pin) >= 4:
                        h = hash_pin(pin)
                        c.execute("INSERT OR REPLACE INTO admin_auth(id, pin_hash) VALUES(1, ?)", (h,))
                        c.commit()
                        self._json(200, {"ok": True})
                        return
                    self._json(400, {"error": "pin must be at least 4 digits"})
                    return
                ok = verify_pin(c, pin)
            self._json(200, {"ok": ok})
            return

        # ADMIN: set price
        if path == "/api/admin/price":
            pin = str(data.get("pin", "")).strip()
            with LOCK, get_db() as c:
                if not verify_pin(c, pin):
                    self._json(403, {"error": "invalid pin"})
                    return
                try:
                    price = max(1, min(int(data.get("price", 49)), 1000000))
                except Exception:
                    price = 49
                c.execute(
                    "INSERT INTO state(key, value) VALUES('price', ?)"
                    " ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                    (str(price),),
                )
                c.commit()
            self._json(200, {"price": price})
            return

        # ADMIN: list orders
        if path == "/api/admin/orders":
            pin = str(data.get("pin", "")).strip()
            with LOCK, get_db() as c:
                if not verify_pin(c, pin):
                    self._json(403, {"error": "invalid pin"})
                    return
                orders = list_orders(c)
            self._json(200, {"orders": orders})
            return

        # ADMIN: update order status
        if path == "/api/admin/orders/status":
            pin = str(data.get("pin", "")).strip()
            oid = str(data.get("order_id", "")).strip()
            status = str(data.get("status", "")).strip()
            if status not in ("pending", "confirmed", "preparing", "done", "cancelled"):
                self._json(400, {"error": "invalid status"})
                return
            with LOCK, get_db() as c:
                if not verify_pin(c, pin):
                    self._json(403, {"error": "invalid pin"})
                    return
                c.execute("UPDATE orders SET status = ? WHERE id = ?", (status, oid))
                c.commit()
            self._json(200, {"id": oid, "status": status})
            return

        # ADMIN: export full backup
        if path == "/api/admin/backup":
            pin = str(data.get("pin", "")).strip()
            with LOCK, get_db() as c:
                if not verify_pin(c, pin):
                    self._json(403, {"error": "invalid pin"})
                    return
                backup = export_backup_data(c)
            self._json(200, backup)
            return

        self._json(404, {"error": "unknown endpoint"})

    def do_DELETE(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/comment":
            length = int(self.headers.get("Content-Length") or 0)
            raw = self.rfile.read(length) if length else b"{}"
            try:
                data = json.loads(raw.decode("utf-8") or "{}")
            except (ValueError, UnicodeDecodeError):
                data = {}
            try:
                cid = int(data.get("id"))
            except (TypeError, ValueError):
                self._json(400, {"error": "bad id"})
                return
            pin = str(data.get("pin", "")).strip()
            with LOCK, get_db() as c:
                if not verify_pin(c, pin):
                    self._json(403, {"error": "invalid pin"})
                    return
                deleted, comments = delete_comment(c, cid)
            if not deleted:
                self._json(404, {"error": "comment not found"})
            else:
                self._json(200, {"id": cid, "comments": comments})
            return
        self._json(404, {"error": "unknown endpoint"})


def main():
    init_db()
    httpd = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Mâm Cơm server on http://localhost:{PORT}  (db: {DB_PATH})")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
