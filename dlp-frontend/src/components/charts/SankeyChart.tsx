import React, { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, sankeyCenter } from 'd3-sankey';
import { useDlpStore } from '../../store/useDlpStore';

export default function SankeyChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const flows = useDlpStore(state => state.flows);

  // Group flows to create nodes and links
  const { nodes, links } = useMemo(() => {
    if (flows.length === 0) return { nodes: [], links: [] };

    const srcNodes = new Set<string>();
    const dstNodes = new Set<string>();
    const linkMap = new Map<string, { source: string, target: string, value: number, risk: string }>();

    flows.forEach(flow => {
      // Group sources to avoid raw IP spam (unless we want to see specific infected hosts, but for overview we group)
      const src = "Local Network"; 
      
      // Group destinations by Service -> Domain -> Org -> IP
      let dst = flow.service_label;
      if (!dst || dst === "Unknown") dst = flow.domain;
      if (!dst || dst === "Unknown") dst = flow.organization;
      if (!dst || dst === "Unknown") dst = flow.dst_ip;
      
      srcNodes.add(src);
      dstNodes.add(dst);
      
      const linkId = `${src}-${dst}`;
      if (!linkMap.has(linkId)) {
        linkMap.set(linkId, { source: src, target: dst, value: 0, risk: flow.risk_level });
      }
      const existing = linkMap.get(linkId)!;
      existing.value += flow.bytes_out + flow.bytes_in;
      // elevate risk if one is higher
      if (flow.risk_level === 'critical' || (existing.risk !== 'critical' && flow.risk_level === 'high')) {
        existing.risk = flow.risk_level;
      }
    });

    const nodeList = [...Array.from(srcNodes), ...Array.from(dstNodes)].map(name => ({ name }));
    const nodeIndexMap = new Map(nodeList.map((n, i) => [n.name, i]));

    const linkList = Array.from(linkMap.values()).map(l => ({
      source: nodeIndexMap.get(l.source)!,
      target: nodeIndexMap.get(l.target)!,
      value: Math.max(l.value, 1000), // ensure it's visible
      risk: l.risk
    }));

    return { nodes: nodeList, links: linkList };
  }, [flows]);

  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const sankeyGenerator = sankey<any, any>()
      .nodeWidth(15)
      .nodePadding(20)
      .extent([[10, 10], [width - 10, height - 10]])
      .nodeAlign(sankeyCenter);

    const { nodes: sankeyNodes, links: sankeyLinks } = sankeyGenerator({
      nodes: nodes.map(d => Object.assign({}, d)),
      links: links.map(d => Object.assign({}, d))
    });

    const getRiskColor = (level: string) => {
      switch (level) {
        case 'critical': return 'rgba(239, 68, 68, 0.7)'; // red-500
        case 'high': return 'rgba(249, 115, 22, 0.7)'; // orange-500
        case 'medium': return 'rgba(234, 179, 8, 0.7)'; // yellow-500
        case 'low': return 'rgba(59, 130, 246, 0.7)'; // blue-500
        default: return 'rgba(107, 114, 128, 0.7)'; // gray-500
      }
    };

    // Add gradients for links
    const defs = svg.append("defs");
    sankeyLinks.forEach((link, i) => {
      const gradient = defs.append("linearGradient")
        .attr("id", `gradient-${i}`)
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", link.source.x1)
        .attr("x2", link.target.x0);

      gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "rgba(59, 130, 246, 0.5)"); // source blueish

      gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", getRiskColor(link.risk)); 
    });

    svg.append("g")
      .selectAll("rect")
      .data(sankeyNodes)
      .join("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("height", d => Math.max(d.y1 - d.y0, 2))
      .attr("width", d => d.x1 - d.x0)
      .attr("fill", "#3b82f6") // tailwind blue-500
      .attr("opacity", 0.8)
      .append("title")
      .text(d => `${d.name}\n${Math.round(d.value)} bytes`);

    svg.append("g")
      .selectAll("path")
      .data(sankeyLinks)
      .join("path")
      .attr("d", sankeyLinkHorizontal())
      .attr("fill", "none")
      .attr("stroke", (d, i) => `url(#gradient-${i})`)
      .attr("stroke-width", d => Math.max(1, d.width))
      .attr("stroke-opacity", 0.7)
      .style("mix-blend-mode", "screen");

    svg.append("g")
      .style("font", "10px sans-serif")
      .style("fill", "#e5e7eb")
      .selectAll("text")
      .data(sankeyNodes)
      .join("text")
      .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
      .attr("y", d => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
      .text(d => d.name)
      .style("font-family", "monospace")
      .style("font-size", "11px");

  }, [nodes, links]);

  if (flows.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center text-gray-500 text-sm font-mono border border-dashed border-gray-800 rounded">
        Awaiting flow data for Sankey visualization...
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  );
}
