from fastapi import FastAPI, WebSocket, BackgroundTasks, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import httpx
from typing import Optional, List, Dict, Any
import asyncio
from datetime import datetime
import threading
import sqlite3
import json

from capture_service import start_capture_thread, get_all_flows
from enrichment_service import EnrichmentService
from risk_engine import RiskEngine

app = FastAPI(title="Harmless Exfiltration Monitor API")

# Initialize DB
conn = sqlite3.connect("flows.db", check_same_thread=False)
cursor = conn.cursor()
cursor.execute('''
    CREATE TABLE IF NOT EXISTS flows (
        flow_id TEXT PRIMARY KEY,
        data TEXT
    )
''')
conn.commit()

class Flow(BaseModel):
    flow_id: str
    timestamp_start: str
    timestamp_end: Optional[str] = None
    src_ip: str
    dst_ip: str
    dst_port: int
    protocol: str
    resolved_site: Optional[str] = None
    service_label: Optional[str] = None
    organization: Optional[str] = None
    country: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    confidence_score: int = 0
    resolution_source: Optional[str] = None
    bytes_out: int = 0
    bytes_in: int = 0
    packet_count: int = 0
    risk_score: int = 0
    risk_level: str = "low"
    flags: List[str] = []
    why_flagged: List[str] = []
    strongest_indicators: List[str] = []
    recommended_steps: Optional[str] = None

event_queue = None
connected_websockets: List[WebSocket] = []

enrichment_service = EnrichmentService()
risk_engine = RiskEngine()

def get_db_flows():
    cursor.execute('SELECT data FROM flows')
    return [json.loads(row[0]) for row in cursor.fetchall()]

def save_flow(flow_dict: Dict[str, Any]):
    cursor.execute(
        'INSERT OR REPLACE INTO flows (flow_id, data) VALUES (?, ?)',
        (flow_dict["flow_id"], json.dumps(flow_dict))
    )
    conn.commit()

@app.on_event("startup")
async def startup_event():
    global event_queue
    event_queue = asyncio.Queue()
    loop = asyncio.get_running_loop()
    
    print("Starting real packet capture...")
    # Start the scapy capture thread (requires sudo for real traffic)
    thread = threading.Thread(target=start_capture_thread, args=(event_queue, loop), daemon=True)
    thread.start()
    
    # Start the event dispatcher
    asyncio.create_task(dispatch_events())

async def dispatch_events():
    global event_queue
    while True:
        event = await event_queue.get()
        flow = event["flow"]
        
        # Ensure flow is enriched and evaluated if it came from scapy
        if event["type"] in ["new_flow", "update_flow"]:
            enriched = enrichment_service.enrich_ip(flow["dst_ip"])
            flow.update(enriched)
            risk_data = risk_engine.evaluate(flow)
            flow.update(risk_data)
            event["flow"] = flow
            
        save_flow(flow)
            
        # Broadcast to all connected clients
        dead_sockets = []
        for ws in connected_websockets:
            try:
                if event["type"] in ["new_flow", "update_flow"]:
                    await ws.send_json({"type": "flow_update", "flow": event["flow"]})
            except Exception:
                dead_sockets.append(ws)
        
        for ws in dead_sockets:
            connected_websockets.remove(ws)

@app.get("/api/health")
def health():
    return {"status": "ok", "time": datetime.utcnow().isoformat()}

@app.get("/api/flows")
def get_flows():
    return get_db_flows()

@app.get("/api/stats")
def get_stats():
    flows = get_db_flows()
    return {
        "packets_total": sum(f.get("packet_count", 0) for f in flows),
        "sensitive_total": sum(1 for f in flows if f.get("is_sensitive", False)),
        "flows": flows[:500]
    }

@app.post("/api/ai/analyze")
async def ai_analyze(request: Request):
    body = await request.json()
    model = body.get("model", "llama3.1")
    prompt = body.get("prompt", "")
    
    async def ollama_stream():
        async with httpx.AsyncClient() as client:
            try:
                async with client.stream("POST", "http://127.0.0.1:11434/api/generate", json={
                    "model": model,
                    "prompt": prompt,
                    "stream": True
                }, timeout=30.0) as response:
                    async for chunk in response.aiter_bytes():
                        yield chunk
            except Exception as e:
                yield json.dumps({"error": str(e), "done": True}).encode()
                
    return StreamingResponse(ollama_stream(), media_type="application/x-ndjson")

@app.websocket("/ws/live")
async def websocket_live(ws: WebSocket):
    await ws.accept()
    connected_websockets.append(ws)
    
    # Send existing flows on connect
    for f in get_db_flows():
        await ws.send_json({"type": "flow_update", "flow": f})
        
    try:
        while True:
            await asyncio.sleep(5)
            await ws.send_json({"type": "heartbeat", "timestamp": datetime.utcnow().isoformat()})
    except Exception:
        if ws in connected_websockets:
            connected_websockets.remove(ws)
