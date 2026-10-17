import { Coordinates, LocalSpaceLine, PlanetPosition } from '../types/astronomy';
import { PLANET_DEFINITIONS } from '../constants/celestialData';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function normalizeDeg(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

function normalizeLng(lng: number): number {
  let l = lng % 360;
  if (l > 180) l -= 360;
  if (l < -180) l += 360;
  return l;
}

const COMPASS_SECTORS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

export function getCompassHeading(azimuthDeg: number): string {
  const norm = normalizeDeg(azimuthDeg);
  const idx = Math.round(norm / 22.5) % 16;
  return `${COMPASS_SECTORS[idx]} (${Math.round(norm)}°)`;
}

/**
 * Calculate Local Space Lines (Horizon Coordinate Azimuth Great Circles)
 * Michael Erlewine methodology: From the native's terrestrial center,
 * each planet's physical horizon bearing projects as a continuous great circle
 * across the globe, directing energy along specific compass trajectories.
 */
export function calculateLocalSpaceLines(
  positions: PlanetPosition[],
  origin: Coordinates,
  gmst: number,
  originCityName: string = 'Origin'
): LocalSpaceLine[] {
  const lines: LocalSpaceLine[] = [];
  const phi = origin.lat * DEG2RAD;
  const lst = normalizeDeg(gmst + origin.lng);

  for (const pos of positions) {
    const def = PLANET_DEFINITIONS[pos.planetId];
    if (!def) continue;

    // Hour angle H = LST - RA
    const H = normalizeDeg(lst - pos.rightAscension);
    const hRad = H * DEG2RAD;
    const decRad = pos.declination * DEG2RAD;

    // Altitude
    const sinAlt = Math.sin(phi) * Math.sin(decRad) + Math.cos(phi) * Math.cos(decRad) * Math.cos(hRad);
    const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt))) * RAD2DEG;

    // Azimuth (from True North clockwise: 0=N, 90=E, 180=S, 270=W)
    const y = -Math.cos(decRad) * Math.sin(hRad);
    const x = Math.sin(decRad) * Math.cos(phi) - Math.cos(decRad) * Math.sin(phi) * Math.cos(hRad);
    const azimuth = normalizeDeg(Math.atan2(y, x) * RAD2DEG);

    const azRad = azimuth * DEG2RAD;
    const points: { lat: number; lng: number }[] = [];

    // Generate great-circle geodesic trajectory around the sphere
    for (let s = 0; s <= 360; s += 2) {
      const sigma = s * DEG2RAD;
      const sinLat = Math.sin(phi) * Math.cos(sigma) + Math.cos(phi) * Math.sin(sigma) * Math.cos(azRad);
      const lat = Math.asin(Math.max(-1, Math.min(1, sinLat))) * RAD2DEG;

      const yLng = Math.sin(sigma) * Math.sin(azRad);
      const xLng = Math.cos(phi) * Math.cos(sigma) - Math.sin(phi) * Math.sin(sigma) * Math.cos(azRad);
      const dLng = Math.atan2(yLng, xLng) * RAD2DEG;
      const lng = normalizeLng(origin.lng + dLng);

      points.push({ lat, lng });
    }

    const heading = getCompassHeading(azimuth);
    const altDesc = altitude >= 0 ? `${altitude.toFixed(1)}° above horizon` : `${Math.abs(altitude).toFixed(1)}° below horizon`;

    lines.push({
      id: `local_space_${pos.planetId}`,
      planetId: pos.planetId,
      planetName: pos.name,
      symbol: pos.symbol,
      color: def.color,
      azimuthDeg: Number(azimuth.toFixed(2)),
      altitudeDeg: Number(altitude.toFixed(2)),
      compassHeading: heading,
      originCoordinates: origin,
      originCityName,
      points,
      description: `${pos.name} Local Space Horizon Vector heading ${heading} (${altDesc}) from ${originCityName}. Walking or relocating along this bearing anchors ${pos.name} archetype.`,
    });
  }

  return lines;
}
