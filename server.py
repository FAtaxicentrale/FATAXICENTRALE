import http.server
import socketserver
import os
import mimetypes

# Voeg de juiste MIME types toe
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('application/json', '.json')

PORT = 3000  # Gebruik poort 3000 om consistent te zijn met de bestaande server

class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Stel CORS headers in
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type')
        self.send_header('Cross-Origin-Embedder-Policy', 'require-corp')
        self.send_header('Cross-Origin-Opener-Policy', 'same-origin')
        super().end_headers()
    
    def do_OPTIONS(self):
        # Verwerk OPTIONS-verzoeken voor CORS preflight
        self.send_response(204)
        self.end_headers()
    
    def guess_type(self, path):
        # Zorg ervoor dat bestanden met het juiste MIME-type worden geserveerd
        if path.endswith('.js'):
            return 'application/javascript'
        elif path.endswith('.mjs'):
            return 'application/javascript'
        elif path.endswith('.css'):
            return 'text/css'
        elif path.endswith('.json'):
            return 'application/json'
        return super().guess_type(path)
    
    def log_message(self, format, *args):
        # Verminder de hoeveelheid logging in de console
        pass

if __name__ == '__main__':
    web_dir = os.path.join(os.path.dirname(__file__), '.')
    os.chdir(web_dir)
    
    # Controleer of de poort beschikbaar is
    try:
        with socketserver.TCPServer(("", PORT), CORSRequestHandler) as httpd:
            print(f"\n{'='*50}")
            print(f"  Server gestart op poort {PORT}")
            print(f"  Open http://localhost:{PORT}/test-modules.html in je browser")
            print(f"  Druk op Ctrl+C om de server te stoppen")
            print(f"{'='*50}\n")
            httpd.serve_forever()
    except OSError as e:
        if e.errno == 48:  # Adres is al in gebruik
            print(f"\nFout: Poort {PORT} is al in gebruik.")
            print("Sluit andere servers of kies een andere poort.\n")
        else:
            raise
