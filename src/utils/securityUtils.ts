/**
 * Anti-Cheat and Security Utility Functions
 */

/**
 * Normalizes a Gmail address to detect dot tricks and plus addressing.
 * - Converts to lowercase.
 * - If it's a Gmail address: removes all dots and ignores everything after '+' before the @ domain.
 */
export function normalizeEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.endsWith('@gmail.com')) {
    return trimmed;
  }

  const [username, domain] = trimmed.split('@');
  
  // Resolve plus addressing (e.g. john+test -> john)
  const baseUsername = username.split('+')[0];
  
  // Resolve dot tricks (e.g. j.o.h.n -> john)
  const dotlessUsername = baseUsername.replace(/\./g, '');
  
  return `${dotlessUsername}@${domain}`;
}

/**
 * Generates a stable device fingerprint hash based on browser variables.
 */
export function generateDeviceFingerprint(): string {
  try {
    const screenRes = `${window.screen.width}x${window.screen.height}`;
    const userAgent = navigator.userAgent || 'unknown-browser';
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const language = navigator.language || 'en-US';
    
    // Derived stable values
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const devicePixelRatio = window.devicePixelRatio || 1;
    
    // Concatenate details
    const rawString = `${screenRes}|${userAgent}|${timezone}|${language}|${hardwareConcurrency}|${devicePixelRatio}`;
    
    // Simple fast DJB2 hash generator formatted as HEX string
    let hash = 5381;
    for (let i = 0; i < rawString.length; i++) {
      hash = (hash * 33) ^ rawString.charCodeAt(i);
    }
    
    return 'FP' + Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  } catch {
    return 'FP_FINGERPRINT_STABLE_DEFAULT';
  }
}

/**
 * Generates a mock IP address.
 */
export function generateRandomIP(): string {
  const uarray = new Uint8Array(4);
  crypto.getRandomValues(uarray);
  const octet1 = (uarray[0] % 223) + 1; // Class A, B, C
  const octet2 = uarray[1];
  const octet3 = uarray[2];
  const octet4 = (uarray[3] % 254) + 1;
  return `${octet1}.${octet2}.${octet3}.${octet4}`;
}

/**
 * Fast string hashing to simulate screenshot image hashing.
 */
export function generateImageHash(imageData: string): string {
  if (!imageData) return '';
  let hash = 0;
  for (let i = 0; i < imageData.length; i++) {
    const chr = imageData.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return 'IMG' + Math.abs(hash).toString(36).toUpperCase().padStart(8, '0');
}

/**
 * Calculate geographic distance between countries to simulate travel speed.
 * A lookup dictionary for countries.
 */
export const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'USA': { lat: 37.0902, lng: -95.7129 },
  'Canada': { lat: 56.1304, lng: -106.3468 },
  'UK': { lat: 55.3781, lng: -3.4360 },
  'Germany': { lat: 51.1657, lng: 10.4515 },
  'France': { lat: 46.2276, lng: 2.2137 },
  'India': { lat: 20.5937, lng: 78.9629 },
  'Australia': { lat: -25.2744, lng: 133.7751 },
  'Singapore': { lat: 1.3521, lng: 103.8198 },
  'Brazil': { lat: -14.2350, lng: -51.9253 },
  'Nigeria': { lat: 9.0820, lng: 8.6753 },
  'South Africa': { lat: -30.5595, lng: 22.9375 },
  'Unknown': { lat: 0, lng: 0 }
};

export function getEstimatedLocationByIP(ip: string): { country: string; countryCode: string } {
  // Return deterministic country from IP
  const firstOctet = parseInt(ip.split('.')[0]) || 0;
  if (firstOctet < 50) return { country: 'USA', countryCode: 'US' };
  if (firstOctet < 100) return { country: 'UK', countryCode: 'GB' };
  if (firstOctet < 150) return { country: 'India', countryCode: 'IN' };
  if (firstOctet < 200) return { country: 'Germany', countryCode: 'DE' };
  return { country: 'Singapore', countryCode: 'SG' };
}

/**
 * Returns distance in kilometers between two points
 */
export function getDistanceBetweenCoords(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}
