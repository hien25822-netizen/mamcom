#!/usr/bin/env python3
"""Mâm Cơm — lightweight server.

Serves index.html (same directory) and a small JSON API backed by SQLite.
Stdlib only (http.server + sqlite3), so `python3 server.py` runs anywhere.

Endpoints:
  GET  /            -> index.html
  GET  /api/state   -> {"meals": int, "comments": [{id, rating, text, ts}, ...]}
  POST /api/meals   -> body {"add": int}  -> {"meals": new_total}
  POST /api/comment -> body {"rating": int, "text": str} -> {"comments": [...] }
"""
import json
import os
import sqlite3
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(HERE, "mamcom.db")
PORT = int(os.environ.get("MAMCOM_PORT", "8000"))

LOCK = threading.Lock()
START_MEALS = 23  # first-ever count of family meals Mâm Cơm has prepared


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


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
            " ts INTEGER)"
        )
        # Seed the meal counter only once, so it starts at 23 (or higher).
        row = c.execute("SELECT value FROM state WHERE key='meals'").fetchone()
        if row is None:
            c.execute("INSERT INTO state(key, value) VALUES('meals', ?)", (str(START_MEALS),))


def get_meals(conn):
    row = conn.execute("SELECT value FROM state WHERE key='meals'").fetchone()
    return int(row[0]) if row else START_MEALS


def add_meals(conn, n):
    current = get_meals(conn) + max(0, int(n))
    conn.execute(
        "INSERT INTO state(key, value) VALUES('meals', ?)"
        " ON CONFLICT(key) DO UPDATE SET value=excluded.value",
        (str(current),),
    )
    conn.commit()
    return current


def list_comments(conn):
    rows = conn.execute(
        "SELECT id, rating, text, ts FROM comments ORDER BY ts DESC, id DESC"
    ).fetchall()
    return [{"id": r[0], "rating": r[1], "text": r[2], "ts": r[3]} for r in rows]


def delete_comment(conn, cid):
    cur = conn.execute("DELETE FROM comments WHERE id = ?", (cid,))
    conn.commit()
    deleted = cur.rowcount > 0
    return deleted, list_comments(conn)


class Handler(BaseHTTPRequestHandler):
    server_version = "MamcomServer/1.0"

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _json(self, code, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self._cors()
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):  # keep stdout quiet
        pass

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path == "/api/state":
            with LOCK, get_db() as c:
                self._json(
                    200,
                    {"meals": get_meals(c), "comments": list_comments(c)},
                )
            return
        # Default to the single-file app.
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
                total = add_meals(c, data.get("add", 0))
            self._json(200, {"meals": total})
            return
        if path == "/api/comment":
            rating = int(data.get("rating", 0))
            text = (data.get("text") or "").strip()
            if not 1 <= rating <= 5:
                rating = 0
            if not text:
                self._json(400, {"error": "empty comment"})
                return
            with LOCK, get_db() as c:
                cur = c.execute(
                    "INSERT INTO comments(rating, text, ts) VALUES(?, ?, ?)",
                    (rating, text[:500], int(time.time())),
                )
                c.commit()
                new_id = cur.lastrowid
                comments = list_comments(c)
            self._json(200, {"id": new_id, "comments": comments})
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
            with LOCK, get_db() as c:
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
