from http.server import HTTPServer,BaseHTTPRequestHandler
from pathlib import Path
root=Path(__file__).resolve().parents[2]/'docs/guardian/videos'
root.mkdir(parents=True,exist_ok=True)
class Handler(BaseHTTPRequestHandler):
 def do_OPTIONS(self):
  self.send_response(204);self.send_header('Access-Control-Allow-Origin','http://127.0.0.1:5194');self.send_header('Access-Control-Allow-Methods','POST, OPTIONS');self.send_header('Access-Control-Allow-Headers','Content-Type');self.end_headers()
 def do_POST(self):
  if self.path not in ['/es.webm','/en.webm']: self.send_error(404);return
  data=self.rfile.read(int(self.headers['Content-Length']));(root/self.path[1:]).write_bytes(data)
  self.send_response(200);self.send_header('Access-Control-Allow-Origin','http://127.0.0.1:5194');self.end_headers();self.wfile.write(b'ok')
HTTPServer(('127.0.0.1',5197),Handler).serve_forever()
