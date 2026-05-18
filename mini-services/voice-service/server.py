#!/usr/bin/env python3
"""
AIOS Voice Service — edge-tts bridge
High-quality TTS using Microsoft Edge neural voices.
Best Jarvis voice: en-GB-RyanNeural (British gentleman)

Endpoints:
  POST /api/tts   → { "text", "voice", "rate", "pitch" } → audio/mp3
  GET  /api/voices → list available voices
  GET  /health     → { "status": "ok" }
"""

import json
import os
import tempfile
import asyncio
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse

PORT = 3031

# Available voices with descriptions
VOICES = {
    "ryan":       { "name": "Ryan (Jarvis)",      "description": "British Gent — Jarvis style", "edge_voice": "en-GB-RyanNeural",    "gender": "Male",   "emoji": "🎩" },
    "thomas":     { "name": "Thomas",             "description": "British Male — Deep",         "edge_voice": "en-GB-ThomasNeural",  "gender": "Male",   "emoji": "🔊" },
    "brian":      { "name": "Brian",              "description": "US Male — Warm & Deep",       "edge_voice": "en-US-BrianNeural",   "gender": "Male",   "emoji": "🎙️" },
    "guy":        { "name": "Guy",                "description": "US Male — Authoritative",     "edge_voice": "en-US-GuyNeural",     "gender": "Male",   "emoji": "💼" },
    "roger":      { "name": "Roger",              "description": "US Male — Mature",            "edge_voice": "en-US-RogerNeural",   "gender": "Male",   "emoji": "🎵" },
    "sonia":      { "name": "Sonia",              "description": "British Female — Elegant",    "edge_voice": "en-GB-SoniaNeural",   "gender": "Female", "emoji": "👩" },
    "andrew":     { "name": "Andrew",             "description": "US Male — Clear",             "edge_voice": "en-US-AndrewNeural",  "gender": "Male",   "emoji": "📡" },
    "christopher": { "name": "Christopher",       "description": "US Male — Friendly",          "edge_voice": "en-US-ChristopherNeural", "gender": "Male", "emoji": "🤝" },
    "eric":       { "name": "Eric",               "description": "US Male — Calm",              "edge_voice": "en-US-EricNeural",    "gender": "Male",   "emoji": "🌊" },
    "steffan":    { "name": "Steffan",            "description": "US Male — Warm",              "edge_voice": "en-US-SteffanNeural", "gender": "Male",   "emoji": "🔥" },
    "libby":      { "name": "Libby",              "description": "British Female — Young",      "edge_voice": "en-GB-LibbyNeural",   "gender": "Female", "emoji": "✨" },
    "maisie":     { "name": "Maisie",             "description": "British Female — Youthful",   "edge_voice": "en-GB-MaisieNeural",  "gender": "Female", "emoji": "🌟" },
}


def generate_tts_sync(text: str, voice_id: str = "ryan", rate: str = "+0%", pitch: str = "-2Hz") -> bytes:
    """Generate TTS audio using edge-tts in a new event loop."""
    import edge_tts
    
    voice_info = VOICES.get(voice_id, VOICES["ryan"])
    edge_voice = voice_info["edge_voice"]
    
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp_path = tmp.name
    
    try:
        # Each call gets its own event loop to avoid conflicts
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            communicate = edge_tts.Communicate(text, edge_voice, rate=rate, pitch=pitch)
            loop.run_until_complete(communicate.save(tmp_path))
        finally:
            loop.close()
        
        with open(tmp_path, "rb") as f:
            audio_data = f.read()
        
        return audio_data
    finally:
        try:
            os.unlink(tmp_path)
        except:
            pass


class VoiceHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        print(f"[Voice] {args[0]}", flush=True)
    
    def send_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
    
    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors()
        self.end_headers()
    
    def do_GET(self):
        path = urlparse(self.path).path
        
        if path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_cors()
            self.end_headers()
            self.wfile.write(json.dumps({
                "status": "ok",
                "service": "voice",
                "port": PORT,
                "engine": "edge-tts",
                "default_voice": "ryan (en-GB-RyanNeural)"
            }).encode())
            return
        
        if path == "/api/voices":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_cors()
            self.end_headers()
            self.wfile.write(json.dumps({
                "voices": VOICES,
                "default": "ryan"
            }).encode())
            return
        
        self.send_response(404)
        self.send_header("Content-Type", "application/json")
        self.send_cors()
        self.end_headers()
        self.wfile.write(json.dumps({"error": "Not found"}).encode())
    
    def do_POST(self):
        path = urlparse(self.path).path
        
        if path == "/api/tts":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            
            try:
                data = json.loads(body)
            except json.JSONDecodeError:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.send_cors()
                self.end_headers()
                self.wfile.write(json.dumps({"error": "Invalid JSON"}).encode())
                return
            
            text = data.get("text", "")
            voice = data.get("voice", "ryan")
            rate = data.get("rate", "+0%")
            pitch = data.get("pitch", "-2Hz")
            
            if not text:
                self.send_response(400)
                self.send_header("Content-Type", "application/json")
                self.send_cors()
                self.end_headers()
                self.wfile.write(json.dumps({"error": "text is required"}).encode())
                return
            
            try:
                voice_info = VOICES.get(voice, VOICES["ryan"])
                edge_voice = voice_info["edge_voice"]
                print(f"[TTS] voice={edge_voice} rate={rate} pitch={pitch} text=\"{text[:60]}...\"", flush=True)
                
                audio_data = generate_tts_sync(text, voice, rate, pitch)
                
                self.send_response(200)
                self.send_header("Content-Type", "audio/mp3")
                self.send_header("Content-Length", str(len(audio_data)))
                self.send_header("X-Voice", edge_voice)
                self.send_header("X-Format", "mp3")
                self.send_cors()
                self.end_headers()
                self.wfile.write(audio_data)
                
                print(f"[TTS] OK {len(audio_data)} bytes", flush=True)
                
            except Exception as e:
                print(f"[TTS] Error: {e}", flush=True)
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.send_cors()
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
            return
        
        self.send_response(404)
        self.send_header("Content-Type", "application/json")
        self.send_cors()
        self.end_headers()
        self.wfile.write(json.dumps({"error": "Not found"}).encode())


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", PORT), VoiceHandler)
    print(f"🎤 AIOS Voice Service running on port {PORT}", flush=True)
    print(f"   Engine: edge-tts (Microsoft Neural Voices)", flush=True)
    print(f"   Default voice: en-GB-RyanNeural (Jarvis)", flush=True)
    print(f"   Endpoints: /health, /api/voices, /api/tts", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Voice service stopped", flush=True)
        server.server_close()
