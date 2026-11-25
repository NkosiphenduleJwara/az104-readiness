#!/usr/bin/env python3
"""Serve the quiz locally and save progress to SQLite.

    python3 scripts/serve.py            # then open http://127.0.0.1:8104/quiz/
    python3 scripts/serve.py --port 9000 --open

Progress lives in data/quiz.db (SQLite, not committed). After every save the
whole state is also written to data/quiz-results.json, a flat file you can
commit so the readiness tracker can read your quiz history.
Standard library only.
"""
import argparse
import json
import pathlib
import sqlite3
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote, urlparse

ROOT = pathlib.Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "quiz.db"
JSON_PATH = ROOT / "data" / "quiz-results.json"
LOCK = threading.Lock()
MAX_BODY = 256 * 1024


def connect():
    con = sqlite3.connect(DB_PATH)
    con.execute("""CREATE TABLE IF NOT EXISTS attempts (
        id TEXT PRIMARY KEY, ts TEXT NOT NULL, pct INTEGER, body TEXT NOT NULL)""")
    con.execute("""CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY, last_seen TEXT, body TEXT NOT NULL)""")
    return con


def state(con):
    attempts = [json.loads(b) for (b,) in con.execute("SELECT body FROM attempts ORDER BY ts")]
    cards = {i: json.loads(b) for i, b in con.execute("SELECT id, body FROM cards ORDER BY id")}
    return {"attempts": attempts, "cards": cards}


def export_json(con):
    s = state(con)
    s = {"app": "az104-quiz", "version": 1, **s}
    tmp = JSON_PATH.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(s, indent=2, ensure_ascii=False), encoding="utf-8")
    tmp.replace(JSON_PATH)


def import_flat_file_if_empty(con):
    """First run on a new computer: seed the database from the committed JSON."""
    if con.execute("SELECT COUNT(*) FROM attempts").fetchone()[0] or not JSON_PATH.exists():
        return
    try:
        s = json.loads(JSON_PATH.read_text(encoding="utf-8"))
    except ValueError:
        return
    for a in s.get("attempts", []):
        if isinstance(a, dict) and a.get("id"):
            con.execute("INSERT OR IGNORE INTO attempts VALUES (?,?,?,?)",
                        (a["id"], str(a.get("ts", "")), a.get("pct"), json.dumps(a)))
    for cid, c in (s.get("cards") or {}).items():
        if isinstance(c, dict):
            con.execute("INSERT OR IGNORE INTO cards VALUES (?,?,?)", (cid, c.get("lastSeen"), json.dumps(c)))
    con.commit()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def log_message(self, fmt, *args):  # quieter console
        if args and "/api/" in str(args[0]):
            super().log_message(fmt, *args)

    def send_json(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def read_body(self):
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0 or n > MAX_BODY:
            raise ValueError("bad body size")
        data = json.loads(self.rfile.read(n))
        if not isinstance(data, dict):
            raise ValueError("body must be an object")
        return data

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/health":
            return self.send_json(200, {"ok": True, "backend": "sqlite"})
        if path == "/api/state":
            with LOCK, connect() as con:
                return self.send_json(200, state(con))
        if path == "/":
            self.send_response(302)
            self.send_header("Location", "/quiz/")
            self.end_headers()
            return
        return super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path != "/api/attempts":
            return self.send_json(404, {"error": "not found"})
        try:
            a = self.read_body()
            if not a.get("id"):
                raise ValueError("id required")
        except ValueError as e:
            return self.send_json(400, {"error": str(e)})
        with LOCK, connect() as con:
            con.execute("INSERT OR REPLACE INTO attempts VALUES (?,?,?,?)",
                        (str(a["id"]), str(a.get("ts", "")), a.get("pct"), json.dumps(a)))
            con.commit()
            export_json(con)
        return self.send_json(200, {"ok": True})

    def do_PUT(self):
        path = urlparse(self.path).path
        if not path.startswith("/api/cards/"):
            return self.send_json(404, {"error": "not found"})
        cid = unquote(path[len("/api/cards/"):])
        if not cid or len(cid) > 100:
            return self.send_json(400, {"error": "bad card id"})
        try:
            c = self.read_body()
        except ValueError as e:
            return self.send_json(400, {"error": str(e)})
        with LOCK, connect() as con:
            con.execute("INSERT OR REPLACE INTO cards VALUES (?,?,?)", (cid, c.get("lastSeen"), json.dumps(c)))
            con.commit()
            export_json(con)
        return self.send_json(200, {"ok": True})


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8104)
    ap.add_argument("--open", action="store_true", help="open the quiz in your browser")
    args = ap.parse_args()
    DB_PATH.parent.mkdir(exist_ok=True)
    with connect() as con:
        import_flat_file_if_empty(con)
    url = f"http://127.0.0.1:{args.port}/quiz/"
    srv = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"AZ-104 quiz on {url}  (progress: {DB_PATH.relative_to(ROOT)}, {JSON_PATH.relative_to(ROOT)})")
    if args.open:
        webbrowser.open(url)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
