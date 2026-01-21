/**
 * Mapbox Static API helper functions
 * 
 * Generates static map thumbnail URLs for job locations.
 * Uses Mapbox Static Images API: https://docs.mapbox.com/api/maps/static-images/
 */

const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

export interface MapThumbnailOptions {
  lat: number;
  lng: number;
  zoom?: number;
  width?: number;
  height?: number;
  style?: 'streets-v12' | 'outdoors-v12' | 'satellite-v9' | 'satellite-streets-v12';
  marker?: boolean;
  markerColor?: string;
  highRes?: boolean; // @2x for retina displays
}

/**
 * Generate a Mapbox Static API URL for a map thumbnail
 */
export function getMapThumbnailUrl(options: MapThumbnailOptions): string | null {
  if (!MAPBOX_ACCESS_TOKEN) {
    console.warn('NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is not set');
    return null;
  }

  const {
    lat,
    lng,
    zoom = 15,
    width = 400,
    height = 200,
    style = 'streets-v12',
    marker = true,
    markerColor = 'f97316', // Orange-500
    highRes = true,
  } = options;

  // Validate coordinates
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    console.warn('Invalid coordinates for map thumbnail');
    return null;
  }

  // Build the URL
  const baseUrl = 'https://api.mapbox.com/styles/v1/mapbox';
  const resolution = highRes ? '@2x' : '';
  
  // Marker overlay (pin at the location)
  const markerOverlay = marker 
    ? `pin-s+${markerColor}(${lng},${lat})/` 
    : '';

  const url = `${baseUrl}/${style}/static/${markerOverlay}${lng},${lat},${zoom}/${width}x${height}${resolution}?access_token=${MAPBOX_ACCESS_TOKEN}`;

  return url;
}

/**
 * Generate a Google Maps navigation URL
 */
export function getNavigationUrl(options: {
  address?: string;
  lat?: number;
  lng?: number;
}): string {
  const { address, lat, lng } = options;

  // Prefer coordinates if available for accuracy
  if (lat !== undefined && lng !== undefined) {
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  }

  // Fall back to address
  if (address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  }

  return 'https://www.google.com/maps';
}

/**
 * Generate an Apple Maps navigation URL
 */
export function getAppleMapsUrl(options: {
  address?: string;
  lat?: number;
  lng?: number;
}): string {
  const { address, lat, lng } = options;

  // Prefer coordinates if available
  if (lat !== undefined && lng !== undefined) {
    return `https://maps.apple.com/?daddr=${lat},${lng}`;
  }

  // Fall back to address
  if (address) {
    return `https://maps.apple.com/?daddr=${encodeURIComponent(address)}`;
  }

  return 'https://maps.apple.com';
}

/**
 * Detect if user is likely on iOS/macOS for Apple Maps preference
 */
export function isAppleDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod|macintosh/.test(userAgent);
}

/**
 * Get the appropriate navigation URL based on device
 */
export function getSmartNavigationUrl(options: {
  address?: string;
  lat?: number;
  lng?: number;
}): string {
  if (isAppleDevice()) {
    return getAppleMapsUrl(options);
  }
  return getNavigationUrl(options);
}
