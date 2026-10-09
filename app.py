
from http.server import BaseHTTPRequestHandler, HTTPServer
import os
import json

VERSION = os.environ.get("APP_VERSION", "1.0")

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            body = b"OK"
            self.send_response(200)
            self.end_headers()
            self.wfile.write(body)
            return

        if self.path == "/":
            body = json.dumps({
                "application": "Jenkins CI/CD Demo",
                "version": VERSION,
                "status": "Running"
            }).encode()

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        self.send_response(404)
        self.end_headers()

HTTPServer(("0.0.0.0", 8000), Handler).serve_forever()
