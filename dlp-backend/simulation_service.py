import asyncio
import uuid
import random
from datetime import datetime
from typing import Dict, Any, List

class SimulationService:
    def __init__(self, event_queue: asyncio.Queue, enrichment_service, risk_engine, loop: asyncio.AbstractEventLoop):
        self.event_queue = event_queue
        self.enrichment_service = enrichment_service
        self.risk_engine = risk_engine
        self.loop = loop
        self.active_flows = {}

    def generate_seed_flows(self) -> List[Dict[str, Any]]:
        seeds = []
        # Create some realistic benign traffic across different global regions
        regions = [
            "142.250.", # Google
            "104.18.",  # Cloudflare
            "185.199.", # GitHub
            "20.184.",  # Azure
            "149.154.", # Telegram (Europe)
            "34.202.",  # AWS US East
            "52.19.",   # AWS EU West
            "35.243.",  # GCP Asia
            "163.171."  # Fastly
        ]
        for _ in range(25):
            flow = self._generate_random_flow(benign=True)
            flow["dst_ip"] = f"{random.choice(regions)}{random.randint(1,255)}.{random.randint(1,255)}"
            seeds.append(flow)
        
        # Create a critical alert scenario (large upload to RU)
        critical = self._generate_random_flow()
        critical["dst_ip"] = "5.255.12.34" # Yandex / RU
        critical["bytes_out"] = 52_400_000 # 52MB
        critical["bytes_in"] = 12_000
        critical["packet_count"] = 35000
        seeds.append(critical)
        
        # Create a high risk alert (Upload to unknown cloud)
        high = self._generate_random_flow()
        high["dst_ip"] = "99.123.45.67" # Triggers generic cloud
        high["bytes_out"] = 1_500_000
        seeds.append(high)

        # Create another medium risk alert
        med = self._generate_random_flow()
        med["dst_ip"] = "177.10.15.22" # South America
        med["bytes_out"] = 800_000
        seeds.append(med)
        
        for flow in seeds:
            self._enrich_and_evaluate(flow)
            self.active_flows[flow["flow_id"]] = flow
            
        return list(self.active_flows.values())

    def _generate_random_flow(self, benign=False) -> Dict[str, Any]:
        flow_id = str(uuid.uuid4())
        
        if benign:
            # Pick a known good prefix
            prefix = random.choice(["142.250.", "104.18.", "185.199.", "20.184."])
            dst_ip = f"{prefix}{random.randint(1,255)}.{random.randint(1,255)}"
            bytes_out = random.randint(1000, 50000)
        else:
            dst_ip = f"{random.randint(1,223)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}"
            bytes_out = random.randint(1000, 5_000_000)
            
        return {
            "flow_id": flow_id,
            "timestamp_start": datetime.utcnow().isoformat(),
            "src_ip": f"192.168.1.{random.randint(5, 50)}",
            "dst_ip": dst_ip,
            "dst_port": 443,
            "protocol": "TCP",
            "bytes_out": bytes_out,
            "bytes_in": random.randint(1000, 5_000_000),
            "packet_count": random.randint(10, 5000),
        }

    def _enrich_and_evaluate(self, flow: Dict[str, Any]):
        enriched = self.enrichment_service.enrich_ip(flow["dst_ip"])
        flow.update(enriched)
        
        risk_data = self.risk_engine.evaluate(flow)
        flow.update(risk_data)

    async def run_simulation_loop(self):
        while True:
            await asyncio.sleep(random.uniform(1.0, 3.0))
            
            # Decide to update existing or create new
            if self.active_flows and random.random() > 0.3:
                # Update existing
                flow_id = random.choice(list(self.active_flows.keys()))
                flow = self.active_flows[flow_id]
                flow["bytes_out"] += random.randint(1000, 100000)
                flow["bytes_in"] += random.randint(1000, 50000)
                flow["packet_count"] += random.randint(1, 100)
                
                self._enrich_and_evaluate(flow)
                await self.event_queue.put({"type": "update_flow", "flow": flow})
            else:
                # Create new
                flow = self._generate_random_flow(benign=random.random() > 0.1)
                self._enrich_and_evaluate(flow)
                self.active_flows[flow["flow_id"]] = flow
                await self.event_queue.put({"type": "new_flow", "flow": flow})
