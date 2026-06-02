// Naive geographic resolution for demonstration purposes.
// In a real application, this would call a backend service or use a GeoIP database.

export interface GeoLocation {
  lat: number;
  lng: number;
  city: string;
  country: string;
}

const geoCache = new Map<string, GeoLocation>();

export function resolveGeo(ip: string): GeoLocation {
  if (geoCache.has(ip)) {
    return geoCache.get(ip)!;
  }

  // Local networks (San Francisco - generic US location)
  if (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    const loc = { lat: 37.7749, lng: -122.4194, city: 'Local Network', country: 'Internal' };
    geoCache.set(ip, loc);
    return loc;
  }

  // Generate deterministic coordinates based on IP address
  const parts = ip.split('.').map(Number);
  if (parts.length === 4) {
    // Map IP ranges roughly to global coordinates
    // First octet controls longitude (-180 to 180)
    const lng = ((parts[0] / 255) * 360) - 180;
    
    // Second octet controls latitude, but bias towards Northern Hemisphere
    // (-60 to 70 to avoid poles)
    const lat = ((parts[1] / 255) * 130) - 60;
    
    const loc = { 
      lat, 
      lng, 
      city: `Node ${parts[2]}`, 
      country: `Region ${parts[0]}` 
    };
    geoCache.set(ip, loc);
    return loc;
  }

  // Default fallback (London)
  return { lat: 51.5074, lng: -0.1278, city: 'Unknown', country: 'Unknown' };
}
