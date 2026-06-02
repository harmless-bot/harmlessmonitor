import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useDlpStore } from '../../store/useDlpStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { resolveGeo } from '../../utils/geoResolve';
import type { GeoLocation } from '../../utils/geoResolve';
import L from 'leaflet';

// Fix leaflet icon
delete (L.Icon.Default.prototype as any)._getIconUrl;

const createRadarIcon = (type: 'threat' | 'local' | 'cloud', size: number) => {
  const color = type === 'threat' ? '#ff5252' : type === 'local' ? '#4f98a3' : '#3b82f6';
  const radius = Math.min(24, Math.max(8, size));
  
  const html = `
    <div class="radar-container" style="width: ${radius*2}px; height: ${radius*2}px;">
      <div class="radar-core" style="background: ${color}; box-shadow: 0 0 ${radius}px ${color};"></div>
      <div class="radar-ring" style="border-color: ${color}; animation-duration: ${type==='threat'?'1.5s':'3s'}"></div>
    </div>
  `;
  return L.divIcon({
    html,
    className: 'custom-radar-icon',
    iconSize: [radius*2, radius*2],
    iconAnchor: [radius, radius],
    popupAnchor: [0, -radius]
  });
};

function getBezierLatLng(start: GeoLocation, end: GeoLocation, numPoints = 50) {
  const points: [number, number][] = [];
  let dx = end.lng - start.lng;
  // Handle wrapping around the globe
  if (dx > 180) dx -= 360;
  if (dx < -180) dx += 360;
  
  const midLat = (start.lat + end.lat) / 2;
  const midLng = start.lng + dx / 2;
  
  const dist = Math.sqrt(dx * dx + (end.lat - start.lat) * (end.lat - start.lat));
  const offset = dist * 0.25; 
  
  // Bulge upwards (Northern hemisphere bias)
  const cLat = midLat + offset;
  const cLng = midLng;
  
  for(let t = 0; t <= 1; t += 1/numPoints) {
     const lat = (1-t)*(1-t)*start.lat + 2*(1-t)*t*cLat + t*t*end.lat;
     let lng = (1-t)*(1-t)*start.lng + 2*(1-t)*t*cLng + t*t*(start.lng + dx);
     
     // Normalize longitude
     if (lng > 180) lng -= 360;
     if (lng < -180) lng += 360;
     
     points.push([lat, lng]);
  }
  return points;
}

interface MappedNode {
  ip: string;
  loc: GeoLocation;
  type: 'local' | 'cloud' | 'threat';
  bandwidth: number;
}

export default function GeoMap() {
  const stats = useDlpStore(state => state.stats);
  const alerts = useDlpStore(state => state.alerts);
  const maxFlows = useSettingsStore(state => state.maxFlows);

  const threatIps = useMemo(() => {
    const ips = new Set<string>();
    alerts.forEach(a => {
      ips.add(a.src_ip);
      ips.add(a.dst_ip);
    });
    return ips;
  }, [alerts]);

  const { nodes, links } = useMemo(() => {
    if (!stats) return { nodes: [], links: [] };

    const topFlows = [...stats.flows]
      .sort((a, b) => b.bandwidth_bps - a.bandwidth_bps)
      .slice(0, maxFlows);

    const nodeMap = new Map<string, MappedNode>();
    const activeLinks: { path: [number, number][]; isThreat: boolean; weight: number }[] = [];

    const getOrAddNode = (ip: string, bw: number, flowLat?: number, flowLon?: number) => {
      if (!nodeMap.has(ip)) {
        let type: 'local' | 'cloud' | 'threat' = 'cloud';
        if (threatIps.has(ip)) type = 'threat';
        else if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) type = 'local';
        
        let loc = resolveGeo(ip);
        if (flowLat && flowLon) loc = { lat: flowLat, lng: flowLon, city: 'Unknown', country: 'Unknown' };
        
        nodeMap.set(ip, { ip, loc, type, bandwidth: bw });
      } else {
        const n = nodeMap.get(ip)!;
        n.bandwidth += bw;
        if (threatIps.has(ip)) n.type = 'threat';
        if (flowLat && flowLon) {
          n.loc.lat = flowLat;
          n.loc.lng = flowLon;
        }
      }
      return nodeMap.get(ip)!;
    };

    // The local machine's base coordinate (from where all data originates or goes)
    // using San Francisco as a generic default for "Home Base"
    const localBaseNode: MappedNode = {
      ip: 'Local Network',
      loc: { lat: 37.7749, lng: -122.4194, city: 'San Francisco', country: 'US' },
      type: 'local',
      bandwidth: 0
    };
    nodeMap.set(localBaseNode.ip, localBaseNode);

    topFlows.forEach((f: any) => {
      // Create external node using real lat/lon
      const extIp = f.dst.startsWith('192.168') || f.dst.startsWith('10.') ? f.src : f.dst;
      const extNode = getOrAddNode(extIp, f.bandwidth_bps, f.lat, f.lon);
      
      const isThreat = f.sensitive_count > 0 || extNode.type === 'threat';
      localBaseNode.bandwidth += f.bandwidth_bps;
      
      activeLinks.push({
        path: getBezierLatLng(localBaseNode.loc, extNode.loc),
        isThreat,
        weight: Math.max(1, Math.log(f.bandwidth_bps + 1))
      });
    });

    return { nodes: Array.from(nodeMap.values()), links: activeLinks };
  }, [stats, threatIps, maxFlows]);

  const tileUrl = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
  return (
    <div className="flex-1 w-full h-full relative z-0 bg-[#050505]">
      <MapContainer 
        center={[30, 0]} 
        zoom={2} 
        style={{ height: '100%', width: '100%', background: '#050505' }}
        zoomControl={false}
        worldCopyJump={true}
      >
        <TileLayer
          url={tileUrl}
        />
        
        {links.map((link, i) => (
          <Polyline 
            key={`link-${i}`}
            positions={link.path}
            color={link.isThreat ? '#ff5252' : '#4f98a3'}
            weight={link.isThreat ? 2 : 1}
            opacity={link.isThreat ? 0.8 : 0.2}
            className={link.isThreat ? 'animated-arc-threat' : 'animated-arc'}
          />
        ))}

        {nodes.map(node => (
          <Marker
            key={node.ip}
            position={[node.loc.lat, node.loc.lng]}
            icon={createRadarIcon(node.type, Math.log(node.bandwidth + 1) * 1.5)}
          >
            <Popup className="custom-popup glass-card">
              <div className="font-mono text-xs">
                <div className="font-bold border-b border-gray-600 pb-1 mb-2 text-gray-200">{node.ip}</div>
                <div className="text-gray-400">Loc: <span className="text-white">{node.loc.city}, {node.loc.country}</span></div>
                <div className="text-gray-400">BW: <span className="text-[var(--color-primary)]">{node.bandwidth.toLocaleString()} bps</span></div>
                {node.type === 'threat' && <div className="text-red-500 font-bold mt-2 animate-pulse">! ACTIVE THREAT !</div>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-3 glass-card p-4 pointer-events-none">
        <h3 className="text-xs font-bold tracking-widest text-gray-400 mb-1">GLOBAL SENSORS</h3>
        <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)] shadow-[0_0_8px_var(--color-primary)]"></div> <span className="text-xs font-mono">Local Node</span></div>
        <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-[var(--color-blue)] shadow-[0_0_8px_var(--color-blue)]"></div> <span className="text-xs font-mono">External Node</span></div>
        <div className="flex items-center gap-3"><div className="w-2.5 h-2.5 rounded-full bg-[var(--color-error)] shadow-[0_0_8px_var(--color-error)] animate-pulse"></div> <span className="text-xs font-mono">Active Threat</span></div>
      </div>

      <style>{`
        .leaflet-container { font-family: var(--font-sans); }
        .radar-container {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .radar-core {
          width: 25%;
          height: 25%;
          border-radius: 50%;
          z-index: 2;
        }
        .radar-ring {
          position: absolute;
          inset: 0;
          border: 1px solid;
          border-radius: 50%;
          animation: radar-ping linear infinite;
          z-index: 1;
        }
        @keyframes radar-ping {
          0% { transform: scale(0.2); opacity: 1; border-width: 2px; }
          100% { transform: scale(1.5); opacity: 0; border-width: 0px; }
        }

        .animated-arc {
          stroke-dasharray: 4, 12;
          animation: dash-flow 2s linear infinite;
        }
        .animated-arc-threat {
          stroke-dasharray: 8, 8;
          animation: dash-flow 1s linear infinite;
          filter: drop-shadow(0 0 4px #ff5252);
        }
        @keyframes dash-flow {
          0% { stroke-dashoffset: 24; }
          100% { stroke-dashoffset: 0; }
        }

        .custom-popup .leaflet-popup-content-wrapper {
          background: rgba(10, 10, 10, 0.85);
          backdrop-filter: blur(8px);
          color: #e5e7eb;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
        }
        .custom-popup .leaflet-popup-tip {
          background: rgba(10, 10, 10, 0.85);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .leaflet-control-attribution { display: none; }
      `}</style>
    </div>
  );
}
