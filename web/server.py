"""Small static server for local Docker checks and Google Cloud Run.

Only the already-exported dashboard is served. It performs no live graph or
model calls, writes no data, and contains no payment or cloud credentials.
"""

from __future__ import annotations

import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

DIST = Path(__file__).resolve().parent / "dist"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DIST), **kwargs)

    def do_GET(self):
        if self.path.split("?", 1)[0] in {"/healthz", "/status"}:
            body = json.dumps(
                {"status": "ok", "source_mode": "offline_export"}
            ).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        super().end_headers()


def main():
    port = int(os.environ.get("PORT", "8080"))
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"GraphSentinel static server listening on port {port}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
