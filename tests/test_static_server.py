import json
from http.client import HTTPConnection
from http.server import ThreadingHTTPServer
from threading import Thread

from web.server import Handler


def test_health_and_static_assets():
    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        connection = HTTPConnection("127.0.0.1", server.server_port, timeout=2)
        connection.request("GET", "/status")
        response = connection.getresponse()
        assert response.status == 200
        assert json.loads(response.read())["source_mode"] == "offline_export"
        assert response.getheader("X-Content-Type-Options") == "nosniff"
        connection.request("GET", "/healthz")
        response = connection.getresponse()
        assert response.status == 200
        response.read()
        connection.request("GET", "/")
        response = connection.getresponse()
        assert response.status == 200
        assert b"GraphSentinel" in response.read()
        connection.request("GET", "/cases.json")
        response = connection.getresponse()
        assert response.status == 200
        assert len(json.loads(response.read())) == 20
        connection.close()
    finally:
        server.shutdown()
        server.server_close()
        thread.join(timeout=2)
