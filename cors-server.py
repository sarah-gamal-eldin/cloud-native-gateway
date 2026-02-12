#!/usr/bin/env python3
"""
CORS-enabled HTTP server for macOS - FIXED VERSION
Works on Python 3.7, 3.8, 3.9, 3.10, 3.11, 3.12
"""

import http.server
import socketserver
import os
import sys

class CORSHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # CRITICAL: Required headers for SharedArrayBuffer and GDAL
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Cross-Origin-Resource-Policy', 'cross-origin')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()
    
    # Override log_message to suppress noisy output
    def log_message(self, format, *args):
        if args[0].startswith('"GET /lib/'):
            return  # Suppress library requests
        sys.stderr.write("%s - - [%s] %s\n" %
                         (self.address_string(),
                          self.log_date_time_string(),
                          format % args))

def get_directory():
    """Get the current working directory"""
    return os.path.dirname(os.path.abspath(__file__)) or '.'

# Configuration
PORT = 8000
Handler = CORSHTTPRequestHandler

# Allow address reuse
socketserver.TCPServer.allow_reuse_address = True

try:
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"\n🚀 Cloud Native Gateway Server - FIXED VERSION")
        print(f"==========================================")
        print(f"📍 URL: http://localhost:{PORT}")
        print(f"📁 Serving directory: {get_directory()}")
        print(f"🐍 Python version: {sys.version.split()[0]}")
        print(f"✅ COOP/COEP headers: ENABLED")
        print(f"✅ CORS headers: ENABLED")
        print(f"==========================================")
        print(f"📊 Press Ctrl+C to stop the server")
        print(f"")
        
        httpd.serve_forever()
        
except KeyboardInterrupt:
    print(f"\n🛑 Server stopped")
    sys.exit(0)
except OSError as e:
    if e.errno == 48:  # Address already in use
        print(f"\n❌ Port {PORT} is already in use.")
        print(f"💡 Try: sudo lsof -i :{PORT} | grep LISTEN")
        print(f"💡 Then: kill -9 [PID]")
    else:
        print(f"\n❌ Error: {e}")
    sys.exit(1)
