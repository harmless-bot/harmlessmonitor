# Harmless Exfiltration Monitor

**Created by Divyanshu Rai (BE CSE CYBERSEC)**

Harmless Exfiltration Monitor is a multi-component Data Loss Prevention (DLP) and network monitoring solution designed to detect, track, and visualize potentially sensitive data flows in real-time.

## Features

- **Live Network Sniffing**: Uses `scapy` to capture packets directly off your network interface.
- **Deep Packet Inspection (DLP)**: Real-time regex payload scanning to detect unencrypted Social Security Numbers, Credit Cards, and API Keys leaking over the network.
- **GeoIP Enrichment**: Automatically resolves IP addresses to physical locations and ASN names using the `ip-api.com` service.
- **AI Analyst**: Built-in incident response AI powered by local `Ollama` (llama3.1) to analyze malicious network flows and recommend actions instantly.
- **Real-Time Dashboard**: A modern React frontend featuring D3.js Sankey diagrams, a global threat map, and a live WebSocket feed of network activity.

## Tools & Technologies Used

- **Frontend**: React, TypeScript, Vite, TailwindCSS, Zustand, D3.js
- **Backend**: Python, FastAPI, Scapy, Uvicorn, SQLite
- **AI/Machine Learning**: Ollama (llama3.1)
- **External Services**: ip-api.com (GeoIP resolution)

## Prerequisites

- **Node.js** (v18+) for the frontend.
- **Python** (3.9+) for the backend.
- **Ollama** installed locally (with `llama3.1` model pulled) for the AI Analyst feature.

## Setup and Running

### 1. Backend (`dlp-backend`)
Note: Packet capturing with `scapy` requires elevated privileges (sudo).

```bash
cd dlp-backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start the server (runs on port 8000)
sudo ./venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### 2. Frontend (`dlp-frontend`)
```bash
cd dlp-frontend
npm install

# Start the development server (runs on port 5173)
npm run dev
```

### 3. AI Analyst (Ollama)
Ensure your local Ollama server is running in the background:
```bash
ollama serve
```

## License

MIT
