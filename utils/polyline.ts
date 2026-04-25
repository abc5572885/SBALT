/**
 * Google polyline encoding (used by Mapbox Static Images API path overlay).
 * Reference: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */

interface LatLng {
  latitude: number;
  longitude: number;
}

function encodeNumber(num: number): string {
  let n = num < 0 ? ~(num << 1) : num << 1;
  let result = '';
  while (n >= 0x20) {
    result += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
    n >>= 5;
  }
  result += String.fromCharCode(n + 63);
  return result;
}

export function encodePolyline(points: LatLng[]): string {
  let lastLat = 0;
  let lastLng = 0;
  let result = '';
  for (const p of points) {
    const lat = Math.round(p.latitude * 1e5);
    const lng = Math.round(p.longitude * 1e5);
    const dLat = lat - lastLat;
    const dLng = lng - lastLng;
    result += encodeNumber(dLat);
    result += encodeNumber(dLng);
    lastLat = lat;
    lastLng = lng;
  }
  return result;
}

/**
 * Douglas-Peucker simplification — reduce point count while preserving shape.
 * Mapbox Static Images URL has length limits (~8KB), so simplify long routes.
 */
export function simplifyRoute(points: LatLng[], tolerance = 0.00005): LatLng[] {
  if (points.length <= 2) return points;

  function perpendicularDistance(p: LatLng, a: LatLng, b: LatLng): number {
    const dx = b.longitude - a.longitude;
    const dy = b.latitude - a.latitude;
    if (dx === 0 && dy === 0) {
      return Math.hypot(p.longitude - a.longitude, p.latitude - a.latitude);
    }
    const t = ((p.longitude - a.longitude) * dx + (p.latitude - a.latitude) * dy) / (dx * dx + dy * dy);
    const tt = Math.max(0, Math.min(1, t));
    const px = a.longitude + tt * dx;
    const py = a.latitude + tt * dy;
    return Math.hypot(p.longitude - px, p.latitude - py);
  }

  function rdp(start: number, end: number, keep: boolean[]) {
    if (end - start < 2) return;
    let maxDist = 0;
    let index = start;
    for (let i = start + 1; i < end; i++) {
      const d = perpendicularDistance(points[i], points[start], points[end]);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }
    if (maxDist > tolerance) {
      keep[index] = true;
      rdp(start, index, keep);
      rdp(index, end, keep);
    }
  }

  const keep = new Array(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  rdp(0, points.length - 1, keep);
  return points.filter((_, i) => keep[i]);
}
