import { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useDlpStore } from '../../store/useDlpStore';
import { Map } from 'lucide-react';
import { getConfidenceLabel, getDestinationIdentity } from '../../utils/flowAnalysis';

export default function WorldMap() {
  const flows = useDlpStore(state => state.flows);

  const { markers, totalValid } = useMemo(() => {
    // Only map flows that have a real lat/lon and a reasonable confidence score
    const validFlows = flows.filter(f => 
      f.lat != null && 
      f.lon != null && 
      f.lat !== 0 && 
      f.lon !== 0 && 
      (f.confidence_score ?? 0) >= 60 &&
      f.geo_confidence !== 'cdn_anycast' &&
      f.geo_confidence !== 'private_local'
    );

    const mapMarkers = validFlows.map(f => ({
      id: f.flow_id,
      lat: f.lat!,
      lng: f.lon!,
      name: getDestinationIdentity(f),
      risk: f.risk_level,
      bytes: f.bytes_out,
      country: f.country,
      source: f.resolution_source
    }));
    
    return { markers: mapMarkers, totalValid: mapMarkers.length };
  }, [flows]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return '#ef4444'; 
      case 'high': return '#f97316'; 
      case 'medium': return '#eab308'; 
      case 'low': return '#3b82f6'; 
      default: return '#6b7280'; 
    }
  };

  // PDF Rule: Hide the map entirely when fewer than a useful threshold of geolocated destinations
  if (totalValid < 2) {
    return (
      <div className="w-full h-full bg-[#111] rounded flex flex-col p-4 border border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-4">
          <Map size={16} /> Destination Intelligence (Map Hidden)
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Insufficient high-confidence geo-coordinates to render global map. Showing Top Destinations fallback instead.
        </p>
        <div className="flex-1 overflow-y-auto space-y-2">
          {flows.slice(0, 8).map(f => (
            <div key={f.flow_id} className="text-xs p-2 bg-black/40 border border-gray-800 rounded flex justify-between items-center">
              <div>
                <div className="text-gray-300">{getDestinationIdentity(f)}</div>
                <div className="text-gray-600">{f.organization || f.unresolved_reason || 'Provider context pending'} • {getConfidenceLabel(f)}</div>
              </div>
              <div className="text-right">
                <div style={{color: getRiskColor(f.risk_level)}} className="font-medium uppercase">{f.risk_level}</div>
                <div className="text-gray-500">{(f.bytes_out / 1024).toFixed(1)} KB</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative rounded overflow-hidden">
      <MapContainer 
        center={[20, 0]} 
        zoom={2} 
        style={{ height: '100%', width: '100%', background: '#0a0a0a' }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        {markers.map((marker) => (
          <CircleMarker
            key={marker.id}
            center={[marker.lat, marker.lng]}
            radius={marker.risk === 'critical' ? 8 : marker.risk === 'high' ? 6 : 4}
            pathOptions={{ 
              color: getRiskColor(marker.risk), 
              fillColor: getRiskColor(marker.risk),
              fillOpacity: 0.7,
              weight: 1
            }}
          >
            <Popup className="custom-popup">
              <div className="text-xs bg-black text-gray-200 border border-gray-800 p-2 rounded w-48">
                <strong className="block mb-1">{marker.name}</strong>
                <div className="grid grid-cols-2 gap-1 text-[10px]">
                  <span className="text-gray-500">Risk:</span>
                  <span style={{color: getRiskColor(marker.risk)}} className="font-bold uppercase">{marker.risk}</span>
                  <span className="text-gray-500">Location:</span>
                  <span>{marker.country}</span>
                  <span className="text-gray-500">Source:</span>
                  <span className="truncate" title={marker.source}>{marker.source}</span>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      
      {/* Pulse effect overlay for high risk */}
      {markers.some(m => m.risk === 'critical' || m.risk === 'high') && (
        <div className="absolute top-4 right-4 z-[400] flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-full backdrop-blur-md">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
          </span>
          <span className="text-xs font-mono text-red-500">THREAT DETECTED</span>
        </div>
      )}
    </div>
  );
}
