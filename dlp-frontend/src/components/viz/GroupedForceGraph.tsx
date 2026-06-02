import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { useDlpStore } from '../../store/useDlpStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { resolveOrg } from '../../utils/ipOrg';

interface Node {
  id: string;
  type: 'local' | 'cloud' | 'threat';
  bandwidth: number;
  protocols: Set<string>;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface Link {
  source: string | Node;
  target: string | Node;
  bandwidth: number;
  sensitive: boolean;
}

export default function GroupedForceGraph() {
  const stats = useDlpStore(state => state.stats);
  const alerts = useDlpStore(state => state.alerts);
  const maxFlows = useSettingsStore(state => state.maxFlows);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const threatIps = useMemo(() => {
    const ips = new Set<string>();
    alerts.forEach(a => {
      ips.add(a.src_ip);
      ips.add(a.dst_ip);
    });
    return ips;
  }, [alerts]);

  useEffect(() => {
    if (!stats || !svgRef.current || !containerRef.current) return;
    
    const topFlows = [...stats.flows]
      .sort((a, b) => b.bandwidth_bps - a.bandwidth_bps)
      .slice(0, maxFlows);

    if (topFlows.length === 0) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height);
    
    svg.selectAll("*").remove();

    // Define Grid Background
    const defs = svg.append("defs");
    
    const pattern = defs.append("pattern")
      .attr("id", "grid")
      .attr("width", 40)
      .attr("height", 40)
      .attr("patternUnits", "userSpaceOnUse");
      
    pattern.append("rect")
      .attr("width", 40)
      .attr("height", 40)
      .attr("fill", "none");
      
    pattern.append("circle")
      .attr("cx", 20)
      .attr("cy", 20)
      .attr("r", 1)
      .attr("fill", "rgba(255,255,255,0.05)");

    svg.append("rect")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("fill", "url(#grid)");

    // Define glowing filters
    const createGlow = (id: string, color: string) => {
      const filter = defs.append("filter").attr("id", id).attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
      filter.append("feGaussianBlur").attr("stdDeviation", "8").attr("result", "coloredBlur");
      const feMerge = filter.append("feMerge");
      feMerge.append("feMergeNode").attr("in", "coloredBlur");
      feMerge.append("feMergeNode").attr("in", "SourceGraphic");
    };
    
    createGlow("glow-threat", "#ff5252");
    createGlow("glow-local", "#4f98a3");
    createGlow("glow-cloud", "#3b82f6");

    const nodeMap = new Map<string, Node>();
    const links: Link[] = [];

    const getOrAddNode = (ip: string, bw: number, protocol: string) => {
      if (!nodeMap.has(ip)) {
        let type: 'local' | 'cloud' | 'threat' = 'cloud';
        if (threatIps.has(ip)) type = 'threat';
        else if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.16.')) type = 'local';

        nodeMap.set(ip, { id: ip, type, bandwidth: bw, protocols: new Set([protocol]) });
      } else {
        const n = nodeMap.get(ip)!;
        n.bandwidth += bw;
        n.protocols.add(protocol);
        if (threatIps.has(ip)) n.type = 'threat';
      }
      return nodeMap.get(ip)!;
    };

    topFlows.forEach(f => {
      const proto = f.dst.includes('443') ? 'HTTPS' : 'HTTP';
      getOrAddNode(f.src, f.bandwidth_bps, proto);
      getOrAddNode(f.dst, f.bandwidth_bps, proto);
      links.push({ source: f.src, target: f.dst, bandwidth: f.bandwidth_bps, sensitive: f.sensitive_count > 0 });
    });

    const nodes = Array.from(nodeMap.values());

    const colorScale = (type: string) => {
      if (type === 'threat') return '#ff5252';
      if (type === 'local') return '#4f98a3';
      return '#3b82f6';
    };

    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoom);

    const simulation = d3.forceSimulation<Node>(nodes)
      .force("link", d3.forceLink<Node, Link>(links).id(d => d.id).distance(180))
      .force("charge", d3.forceManyBody().strength(-800))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius(d => Math.log((d as Node).bandwidth + 1) * 3 + 40));

    // Links as curved paths
    const linkGroup = g.append("g").attr("class", "links");
    
    // Gradient definitions for links
    links.forEach((l, i) => {
      const grad = defs.append("linearGradient")
        .attr("id", `link-grad-${i}`)
        .attr("gradientUnits", "userSpaceOnUse");
      grad.append("stop").attr("offset", "0%").attr("stop-color", l.sensitive ? "#ff5252" : "#4f98a3").attr("stop-opacity", 0.1);
      grad.append("stop").attr("offset", "100%").attr("stop-color", l.sensitive ? "#ff5252" : "#3b82f6").attr("stop-opacity", 0.8);
    });

    const link = linkGroup.selectAll("path")
      .data(links)
      .join("path")
      .attr("fill", "none")
      .attr("stroke", (d, i) => `url(#link-grad-${i})`)
      .attr("stroke-opacity", 0.7)
      .attr("stroke-width", d => Math.min(8, Math.max(1, Math.log(d.bandwidth + 1) * 1.5)));

    // Animated particles along links
    const particles = linkGroup.selectAll("circle.particle")
      .data(links)
      .join("circle")
      .attr("class", "particle")
      .attr("r", 2)
      .attr("fill", "#fff")
      .attr("filter", "url(#glow-cloud)");

    // Nodes
    const nodeGroup = g.append("g").attr("class", "nodes");
    const node = nodeGroup.selectAll("g")
      .data(nodes)
      .join("g")
      .call(drag(simulation) as any);

    // Node outer translucent halo
    node.append("circle")
      .attr("r", d => Math.max(15, Math.log(d.bandwidth + 1) * 3))
      .attr("fill", d => colorScale(d.type))
      .attr("opacity", 0.15)
      .attr("stroke", d => colorScale(d.type))
      .attr("stroke-width", 1)
      .attr("filter", d => `url(#glow-${d.type})`);

    // Node inner solid core
    node.append("circle")
      .attr("r", d => Math.max(5, Math.log(d.bandwidth + 1) * 1.5))
      .attr("fill", d => colorScale(d.type))
      .attr("filter", d => `url(#glow-${d.type})`);

    // Labels with backgrounds
    const labels = node.append("g").attr("transform", d => `translate(0, ${Math.max(20, Math.log(d.bandwidth + 1) * 3 + 10)})`);
    
    labels.append("rect")
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("fill", "rgba(10,11,13,0.8)")
      .attr("stroke", "rgba(255,255,255,0.1)")
      .attr("stroke-width", 1);

    const text = labels.append("text")
      .text(d => d.type === 'local' ? 'CORE ROUTER' : resolveOrg(d.id))
      .attr("font-size", "9px")
      .attr("font-family", "var(--font-mono)")
      .attr("fill", "var(--color-text-primary)")
      .attr("text-anchor", "middle")
      .attr("dy", "10px")
      .style("pointer-events", "none");

    const textBbox: DOMRect[] = [];
    text.each(function() { textBbox.push(this.getBBox()); });
    
    labels.selectAll("rect")
      .data(textBbox)
      .attr("x", d => d.x - 6)
      .attr("y", d => d.y - 4)
      .attr("width", d => d.width + 12)
      .attr("height", d => d.height + 8);

    labels.append("text")
      .text(d => d.id)
      .attr("font-size", "7px")
      .attr("font-family", "var(--font-mono)")
      .attr("fill", d => colorScale(d.type))
      .attr("text-anchor", "middle")
      .attr("dy", "22px");

    // Interactive tooltip overlay
    node.append("title")
      .text(d => `IP: ${d.id}\nOrg: ${resolveOrg(d.id)}\nTotal BW: ${d.bandwidth.toLocaleString()} bps\nProtocols: ${Array.from(d.protocols).join(', ')}`);

    simulation.on("tick", () => {
      // Curved paths
      link.attr("d", (d: any) => {
        const dx = d.target.x - d.source.x;
        const dy = d.target.y - d.source.y;
        const dr = Math.sqrt(dx * dx + dy * dy) * 1.5; // Curve factor
        return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
      });

      // Update gradient coordinates
      links.forEach((l: any, i) => {
        defs.select(`#link-grad-${i}`)
          .attr("x1", l.source.x).attr("y1", l.source.y)
          .attr("x2", l.target.x).attr("y2", l.target.y);
      });

      // Animate particles along the curve
      particles
        .attr("cx", (d: any) => {
          const t = (Date.now() % 2000) / 2000; // 2 sec loop
          // Very simple linear interpolation for particle pos (real curve mapping is complex, this is close enough visually)
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
          // To trace arc properly, we just use a trick or simply interpolate line
          // For true path tracing in D3, we can use SVG `getPointAtLength` but it's expensive in a tick.
          // Let's fallback to bezier interpolation
          const cx = (d.source.x + d.target.x)/2 - dy * 0.2;
          return (1-t)*(1-t)*d.source.x + 2*(1-t)*t*cx + t*t*d.target.x;
        })
        .attr("cy", (d: any) => {
          const t = (Date.now() % 2000) / 2000;
          const dx = d.target.x - d.source.x;
          const cx = (d.source.y + d.target.y)/2 + dx * 0.2;
          return (1-t)*(1-t)*d.source.y + 2*(1-t)*t*cx + t*t*d.target.y;
        });

      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // Particle animation loop
    const t = d3.timer(() => {
      simulation.tick(); // Force refresh to update particle positions
    });

    return () => {
      simulation.stop();
      t.stop();
    };
  }, [stats, threatIps, maxFlows]);

  const drag = (simulation: d3.Simulation<Node, undefined>) => {
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x; d.fy = d.y;
    }
    function dragged(event: any, d: any) {
      d.fx = event.x; d.fy = event.y;
    }
    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null; d.fy = null;
    }
    return d3.drag<SVGGElement, Node>()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  };

  return (
    <div className="flex-1 w-full h-full relative" ref={containerRef}>
      <svg ref={svgRef} className="absolute inset-0 cursor-crosshair" />
      <div className="absolute top-4 left-4 flex flex-col gap-3 glass-card p-4 pointer-events-none">
        <h3 className="text-xs font-bold tracking-widest text-gray-400 mb-1">NETWORK TOPOLOGY</h3>
        <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)] shadow-[0_0_8px_var(--color-primary)]"></div> <span className="text-xs font-mono">Secure Core Router</span></div>
        <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-[var(--color-blue)] shadow-[0_0_8px_var(--color-blue)]"></div> <span className="text-xs font-mono">External Cloud Node</span></div>
        <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-[var(--color-error)] shadow-[0_0_8px_var(--color-error)]"></div> <span className="text-xs font-mono">Active Threat Vector</span></div>
      </div>
    </div>
  );
}
