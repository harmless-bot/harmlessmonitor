# Harmless Exfiltration Monitor

Anti-Gravity Exfiltration Monitor is a multi-component Data Loss Prevention (DLP) and network monitoring solution designed to detect, track, and visualize potentially sensitive data flows in real-time.

## Architecture

The project consists of three main components:

1. **`dlp-sensor` (Rust)**
   - High-performance network packet sniffer and pattern classification engine built with Rust and `pcap`.
   - Inspects TCP/UDP payloads for sensitive patterns (e.g., emails, sensitive keywords).
   - Broadcasts packet metrics via WebSockets (`ws://0.0.0.0:9001`).

2. **`dlp-backend` (Python / FastAPI)**
   - API and WebSocket server built with FastAPI.
   - Handles data enrichment (e.g., GeoIP), risk evaluation, and stores flow history in a SQLite database (`flows.db`).
   - Includes a fallback Scapy-based sniffer and simulation engine for demo purposes.
   - Provides live updates to the frontend via `ws://localhost:8000/ws/live`.

3. **`dlp-frontend` (React / TypeScript / Vite)**
   - Modern, dynamic React frontend built with Vite.
   - Features rich visualizations including a D3.js Sankey diagram for data flow tracking, geographical maps, and an AI Analyst interface.
   - Real-time packet alerts and continuous dashboard updates.

## Prerequisites

- **Node.js** (v18+) for the frontend.
- **Python** (3.9+) for the backend.
- **Rust/Cargo** for the network sensor.
- **libpcap** for network packet capture.

## Setup and Running

### 1. Backend (`dlp-backend`)
```bash
cd dlp-backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start the server (runs on port 8000)
uvicorn main:app --host 0.0.0.0 --port 8000
```

### 2. Frontend (`dlp-frontend`)
```bash
cd dlp-frontend
npm install

# Start the development server (runs on port 5173)
npm run dev
```

### 3. Sensor (`dlp-sensor`)
Note: Packet capturing requires elevated privileges.
```bash
cd dlp-sensor
cargo build
sudo ./target/debug/dlp-sensor --interface en0
```

## Environment Variables

Copy the example environment file in the backend to start configuring external integrations:
```bash
cp dlp-backend/.env.example dlp-backend/.env
```

## License

MIT
