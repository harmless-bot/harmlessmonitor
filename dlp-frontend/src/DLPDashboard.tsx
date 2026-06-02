import React, { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { ShieldAlert } from 'lucide-react';
import gsap from 'gsap';

interface PatternMatch {
  pattern_name: string;
  severity: number;
  category: string;
  snippet: string;
}

interface PacketClassification {
  src_ip: string;
  dst_ip: string;
  src_port: number;
  dst_port: number;
  protocol: string;
  payload_size: number;
  matches: PatternMatch[];
  is_sensitive: boolean;
  timestamp_ms: number;
  flow_id: string;
}

interface FlowStat {
  flow_id: string;
  src: string;
  dst: string;
  bandwidth_bps: number;
  sensitive_count: number;
}

const WS_URL = 'ws://localhost:9001';

export default function DLPDashboard() {
  const [stats, setStats] = useState<{ packets_total: number; sensitive_total: number; flows: FlowStat[] } | null>(null);
  const [alerts, setAlerts] = useState<PacketClassification[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    const connect = () => {
      ws = new WebSocket(WS_URL);
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'stats') {
          setStats({
            packets_total: data.packets_total,
            sensitive_total: data.sensitive_total,
            flows: data.flows
          });
        } else if (data.type === 'packet') {
          handleSensitivePacket(data.data);
        }
      };

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, []);

  const handleSensitivePacket = (packet: PacketClassification) => {
    setAlerts(prev => {
      const newAlerts = [packet, ...prev].slice(0, 10);
      return newAlerts;
    });

    if (containerRef.current) {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = '50%';
      particle.style.top = '70%';
      containerRef.current.appendChild(particle);

      gsap.to(particle, {
        y: -window.innerHeight * 0.6,
        x: (Math.random() - 0.5) * 400,
        scale: 2,
        opacity: 0,
        duration: 1.5,
        ease: "power2.out",
        onComplete: () => {
          particle.remove();
        }
      });
    }
  };

  useEffect(() => {
    if (!stats || !svgRef.current || stats.flows.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const rect = svgRef.current.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || 600;

    if (width === 0 || height === 0) return;

    const nodes: any[] = [];
    const linkMap = new Map<string, any>();
    const nodeMap = new Map<string, number>();

    const addNode = (id: string, name: string, type: string) => {
      if (!nodeMap.has(id)) {
        nodeMap.set(id, nodes.length);
        nodes.push({ name, type });
      }
      return nodeMap.get(id)!;
    };

    const addLink = (source: number, target: number, value: number, sensitive: boolean) => {
      const key = `${source}-${target}`;
      if (linkMap.has(key)) {
        const link = linkMap.get(key);
        link.value += value;
        link.sensitive = link.sensitive || sensitive;
      } else {
        linkMap.set(key, { source, target, value, sensitive });
      }
    };

    const sortedFlows = [...stats.flows].sort((a, b) => b.bandwidth_bps - a.bandwidth_bps).slice(0, 50);

    sortedFlows.forEach(flow => {
      // Differentiate src and dst node IDs to prevent Sankey circular dependencies
      const srcIdx = addNode(`src_${flow.src}`, flow.src, 'source');
      const proto = flow.dst.includes('443') ? 'HTTPS' : 'HTTP';
      const protoIdx = addNode(`proto_${proto}`, proto, 'protocol');
      const dstIdx = addNode(`dst_${flow.dst}`, flow.dst, 'destination');

      const value = Math.max(0.1, flow.bandwidth_bps / 1024);
      addLink(srcIdx, protoIdx, value, flow.sensitive_count > 0);
      addLink(protoIdx, dstIdx, value, flow.sensitive_count > 0);
    });

    const links = Array.from(linkMap.values());

    if (nodes.length === 0 || links.length === 0) return;

    const sankeyGen = sankey()
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[10, 10], [width - 10, height - 10]]);

    try {
      const { nodes: sNodes, links: sLinks } = sankeyGen({
        nodes: nodes.map(d => Object.assign({}, d)),
        links: links.map(d => Object.assign({}, d))
      } as any);

      svg.append("g")
        .selectAll("rect")
        .data(sNodes)
        .join("rect")
        .attr("x", (d: any) => d.x0)
        .attr("y", (d: any) => d.y0)
        .attr("height", (d: any) => Math.max(1, d.y1 - d.y0))
        .attr("width", (d: any) => d.x1 - d.x0)
        .attr("fill", (d: any) => d.name.includes('HTTP') ? '#666' : '#888')
        .append("title")
        .text((d: any) => d.name);

      svg.append("g")
        .selectAll("text")
        .data(sNodes)
        .join("text")
        .attr("x", (d: any) => (d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6))
        .attr("y", (d: any) => (d.y1 + d.y0) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", (d: any) => (d.x0 < width / 2 ? "start" : "end"))
        .text((d: any) => d.name)
        .attr("fill", "#ccc")
        .attr("font-size", "10px");

      const linkGroup = svg.append("g")
        .attr("fill", "none")
        .attr("stroke-opacity", 0.5);

      linkGroup.selectAll("path")
        .data(sLinks)
        .join("path")
        .attr("d", sankeyLinkHorizontal() as any)
        .attr("stroke", (d: any) => d.sensitive ? "#ff5252" : "#555")
        .attr("stroke-width", (d: any) => Math.max(1, d.width || 1))
        .style("mix-blend-mode", "screen");

    } catch (e) {
      console.error("D3 Sankey Error:", e);
    }
  }, [stats]);

  return (
    <div className="dashboard-container">
      <div className="header">
        <ShieldAlert className="title-icon" color="#ff5252" style={{ marginRight: '10px' }} />
        <div className="title">ANTI-GRAVITY EXFILTRATION MONITOR</div>
      </div>
      
      <div className="content" ref={containerRef}>
        <div className="sankey-container">
          <svg ref={svgRef} style={{ width: '100%', height: '100%', minHeight: '500px' }}></svg>
        </div>

        <div className="alert-panel">
          {alerts.map((alert, i) => (
            <div key={`${alert.flow_id}-${i}`} className="alert-card">
              <div className="alert-header">
                <span>{alert.matches[0]?.pattern_name || 'UNKNOWN SENSITIVE'}</span>
                <span>SEV: {alert.matches[0]?.severity || 10}/10</span>
              </div>
              <div className="alert-body">
                <div>SRC: {alert.src_ip}:{alert.src_port}</div>
                <div>DST: {alert.dst_ip}:{alert.dst_port}</div>
                <div style={{ marginTop: '5px', color: '#ffaaaa' }}>
                  "{alert.matches[0]?.snippet}"
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="sidebar">
          <div className="stat-box">
            <div className="stat-label">STATUS</div>
            <div className="stat-value" style={{ color: alerts.length > 0 ? '#ff5252' : '#69f0ae' }}>
              {alerts.length > 0 ? 'CRITICAL ALERT' : 'MONITORING'}
            </div>
          </div>
          
          <div className="stat-box">
            <div className="stat-label">TOTAL PACKETS</div>
            <div className="stat-value">{stats?.packets_total || 0}</div>
          </div>
          
          <div className="stat-box">
            <div className="stat-label">SENSITIVE PACKETS</div>
            <div className="stat-value" style={{ color: '#ff5252' }}>{stats?.sensitive_total || 0}</div>
          </div>

          <div className="stat-box">
            <div className="stat-label">ACTIVE FLOWS</div>
            <div className="stat-value">{stats?.flows.length || 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
