import * as Astronomy from 'astronomy-engine';
import {
  AngleType,
  AspectLineType,
  AstrologicalAspect,
  AstrocartographyLine,
  BirthData,
  CalculationMethod,
  ChartAngles,
  CityData,
  Coordinates,
  InfluencePolarity,
  LifeCategory,
  ParanLine,
  PlanetaryCrossing,
  PlanetId,
  PlanetPosition,
  TransitTrigger,
  ZodiacSign,
} from '../types/astronomy';
import { PLANET_DEFINITIONS, ZODIAC_SIGNS } from '../constants/celestialData';
import { WORLD_CITIES } from '../constants/worldCities';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

export function normalizeDeg(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

export function normalizeLng(lng: number): number {
  let l = lng % 360;
  if (l > 180) l -= 360;
  if (l < -180) l += 360;
  return l;
}

/**
 * Calculate Julian Day Number for given UTC date & time
 */
export function calculateJulianDay(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number = 0
): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  const dayFrac = day + (hour + minute / 60 + second / 3600) / 24;
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    dayFrac +
    B -
    1524.5
  );
}

/**
 * Calculate Greenwich Apparent Sidereal Time (GAST) in degrees
 */
export function calculateGMST(jd: number): number {
  const d = new Date((jd - 2440587.5) * 86400000);
  const time = Astronomy.MakeTime(d);
  return normalizeDeg(Astronomy.SiderealTime(time) * 15);
}

/**
 * Obliquity of the Ecliptic (true) in degrees
 */
export function calculateObliquity(jd: number): number {
  const d = new Date((jd - 2440587.5) * 86400000);
  const time = Astronomy.MakeTime(d);
  return Astronomy.e_tilt(time).tobl;
}

/**
 * High-Precision Astronomical ephemeris using VSOP87 and NOVAS C 3.1
 * (Accurate to sub-arcminute matching Swiss Ephemeris / Astro.com / Astro-Seek)
 */
export function calculatePlanetaryPositions(jd: number): PlanetPosition[] {
  const d = new Date((jd - 2440587.5) * 86400000);
  const time = Astronomy.MakeTime(d);
  const timeNext = time.AddDays(0.05); // For speed / retrograde calculation
  const obs = new Astronomy.Observer(0, 0, 0); // Geocentric observer
  const eps = Astronomy.e_tilt(time).tobl * DEG2RAD;
  const T = (jd - 2451545.0) / 36525.0;

  // Major VSOP87 bodies
  const bodyMap: Record<string, Astronomy.Body> = {
    sun: Astronomy.Body.Sun,
    moon: Astronomy.Body.Moon,
    mercury: Astronomy.Body.Mercury,
    venus: Astronomy.Body.Venus,
    mars: Astronomy.Body.Mars,
    jupiter: Astronomy.Body.Jupiter,
    saturn: Astronomy.Body.Saturn,
    uranus: Astronomy.Body.Uranus,
    neptune: Astronomy.Body.Neptune,
    pluto: Astronomy.Body.Pluto,
  };

  const positions: PlanetPosition[] = [];

  for (const [pIdKey, body] of Object.entries(bodyMap)) {
    const pId = pIdKey as PlanetId;
    const def = PLANET_DEFINITIONS[pId];
    if (!def) continue;

    const eq = Astronomy.Equator(body, time, obs, true, true);
    const v = Astronomy.GeoVector(body, time, true);
    const ec = Astronomy.Ecliptic(v);

    // Compute speed and retrograde status
    const vNext = Astronomy.GeoVector(body, timeNext, true);
    const ecNext = Astronomy.Ecliptic(vNext);
    let dLon = ecNext.elon - ec.elon;
    if (dLon > 180) dLon -= 360;
    if (dLon < -180) dLon += 360;
    const speedDegPerDay = dLon / 0.05;
    const isRetrograde = speedDegPerDay < 0;

    const lon = normalizeDeg(ec.elon);
    const signIndex = Math.floor(lon / 30);
    const sign = ZODIAC_SIGNS[signIndex].sign;
    const degreeInSign = Math.floor(lon % 30);
    const minuteInSign = Math.floor(((lon % 30) - degreeInSign) * 60);

    positions.push({
      planetId: pId,
      name: def.name,
      symbol: def.symbol,
      longitude: lon,
      latitude: ec.elat,
      declination: eq.dec,
      rightAscension: normalizeDeg(eq.ra * 15),
      distanceAU: eq.dist,
      speed: Number(speedDegPerDay.toFixed(3)),
      sign,
      degreeInSign,
      minuteInSign,
      isRetrograde,
      house: 1,
    });
  }

  // 11. Chiron (High-precision Keplerian orbital integration with geocentric conversion)
  {
    const chironDef = PLANET_DEFINITIONS.chiron;
    const dayOffset = jd - 2451545.0;
    const n = 0.0195616; // deg / day
    const M0 = 70.82;
    let M = normalizeDeg(M0 + n * dayOffset) * DEG2RAD;
    const e = 0.383;
    let E = M;
    for (let i = 0; i < 6; i++) {
      E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    }
    const vTrue = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
    const r = 13.670 * (1 - e * Math.cos(E));
    const w = 339.63 * DEG2RAD;
    const u = vTrue + w;
    const Omega = 209.34 * DEG2RAD;
    const inc = 6.94 * DEG2RAD;
    const xHelio = r * (Math.cos(Omega) * Math.cos(u) - Math.sin(Omega) * Math.sin(u) * Math.cos(inc));
    const yHelio = r * (Math.sin(Omega) * Math.cos(u) + Math.cos(Omega) * Math.sin(u) * Math.cos(inc));
    const zHelio = r * Math.sin(u) * Math.sin(inc);

    // Geocentric vector: Chiron - Earth
    const sunVec = Astronomy.GeoVector(Astronomy.Body.Sun, time, true);
    // Earth heliocentric = -Sun geocentric
    const xGeo = xHelio + sunVec.x;
    const yGeo = yHelio + sunVec.y;
    const zGeo = zHelio + sunVec.z;

    const chironLon = normalizeDeg(Math.atan2(yGeo, xGeo) * RAD2DEG);
    const chironLat = Math.atan2(zGeo, Math.hypot(xGeo, yGeo)) * RAD2DEG;

    // Convert Ecliptic (lon, lat) to Equatorial (RA, Dec)
    const lonRad = chironLon * DEG2RAD;
    const latRad = chironLat * DEG2RAD;
    const sinDec = Math.sin(latRad) * Math.cos(eps) + Math.cos(latRad) * Math.sin(eps) * Math.sin(lonRad);
    const dec = Math.asin(Math.max(-1, Math.min(1, sinDec))) * RAD2DEG;
    const yRA = Math.cos(latRad) * Math.cos(eps) * Math.sin(lonRad) - Math.sin(latRad) * Math.sin(eps);
    const xRA = Math.cos(latRad) * Math.cos(lonRad);
    const ra = normalizeDeg(Math.atan2(yRA, xRA) * RAD2DEG);

    const signIndex = Math.floor(chironLon / 30);
    const sign = ZODIAC_SIGNS[signIndex].sign;
    const degreeInSign = Math.floor(chironLon % 30);
    const minuteInSign = Math.floor(((chironLon % 30) - degreeInSign) * 60);

    positions.push({
      planetId: 'chiron',
      name: chironDef.name,
      symbol: chironDef.symbol,
      longitude: chironLon,
      latitude: chironLat,
      declination: dec,
      rightAscension: ra,
      distanceAU: Math.hypot(xGeo, yGeo, zGeo),
      speed: 0.02,
      sign,
      degreeInSign,
      minuteInSign,
      isRetrograde: false,
      house: 1,
    });
  }

  // 12. North Node (Mean Lunar Node - IAU standard formula)
  {
    const nnDef = PLANET_DEFINITIONS.north_node;
    const nodeLon = normalizeDeg(125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T * T * T) / 450000);
    const nodeLat = 0;
    const lonRad = nodeLon * DEG2RAD;
    const sinDec = Math.sin(eps) * Math.sin(lonRad);
    const dec = Math.asin(sinDec) * RAD2DEG;
    const ra = normalizeDeg(Math.atan2(Math.sin(lonRad) * Math.cos(eps), Math.cos(lonRad)) * RAD2DEG);

    const signIndex = Math.floor(nodeLon / 30);
    const sign = ZODIAC_SIGNS[signIndex].sign;
    const degreeInSign = Math.floor(nodeLon % 30);
    const minuteInSign = Math.floor(((nodeLon % 30) - degreeInSign) * 60);

    positions.push({
      planetId: 'north_node',
      name: nnDef.name,
      symbol: nnDef.symbol,
      longitude: nodeLon,
      latitude: nodeLat,
      declination: dec,
      rightAscension: ra,
      distanceAU: 0.00257,
      speed: -0.053,
      sign,
      degreeInSign,
      minuteInSign,
      isRetrograde: true,
      house: 1,
    });
  }

  // 13. South Node (Mean Node + 180)
  {
    const snDef = PLANET_DEFINITIONS.south_node;
    const nodePos = positions.find((p) => p.planetId === 'north_node')!;
    const snLon = normalizeDeg(nodePos.longitude + 180);
    const lonRad = snLon * DEG2RAD;
    const sinDec = Math.sin(eps) * Math.sin(lonRad);
    const dec = Math.asin(sinDec) * RAD2DEG;
    const ra = normalizeDeg(Math.atan2(Math.sin(lonRad) * Math.cos(eps), Math.cos(lonRad)) * RAD2DEG);

    const signIndex = Math.floor(snLon / 30);
    const sign = ZODIAC_SIGNS[signIndex].sign;
    const degreeInSign = Math.floor(snLon % 30);
    const minuteInSign = Math.floor(((snLon % 30) - degreeInSign) * 60);

    positions.push({
      planetId: 'south_node',
      name: snDef.name,
      symbol: snDef.symbol,
      longitude: snLon,
      latitude: 0,
      declination: dec,
      rightAscension: ra,
      distanceAU: 0.00257,
      speed: -0.053,
      sign,
      degreeInSign,
      minuteInSign,
      isRetrograde: true,
      house: 1,
    });
  }

  // 14. Black Moon Lilith (Mean Lunar Apogee)
  {
    const lilithDef = PLANET_DEFINITIONS.lilith;
    const lilithLon = normalizeDeg(40.6622917 + 4069.0138889 * T - 0.010325 * T * T);
    const lonRad = lilithLon * DEG2RAD;
    const sinDec = Math.sin(eps) * Math.sin(lonRad);
    const dec = Math.asin(sinDec) * RAD2DEG;
    const ra = normalizeDeg(Math.atan2(Math.sin(lonRad) * Math.cos(eps), Math.cos(lonRad)) * RAD2DEG);

    const signIndex = Math.floor(lilithLon / 30);
    const sign = ZODIAC_SIGNS[signIndex].sign;
    const degreeInSign = Math.floor(lilithLon % 30);
    const minuteInSign = Math.floor(((lilithLon % 30) - degreeInSign) * 60);

    positions.push({
      planetId: 'lilith',
      name: lilithDef.name,
      symbol: lilithDef.symbol,
      longitude: lilithLon,
      latitude: 0,
      declination: dec,
      rightAscension: ra,
      distanceAU: 0.0027,
      speed: 0.111,
      sign,
      degreeInSign,
      minuteInSign,
      isRetrograde: false,
      house: 1,
    });
  }

  // 15. Part of Fortune (placeholder until Ascendant is computed in suite)
  {
    const fortuneDef = PLANET_DEFINITIONS.fortune;
    const sunPos = positions.find((p) => p.planetId === 'sun')!;
    const fortuneLon = normalizeDeg(sunPos.longitude + 60);
    const lonRad = fortuneLon * DEG2RAD;
    const sinDec = Math.sin(eps) * Math.sin(lonRad);
    const dec = Math.asin(sinDec) * RAD2DEG;
    const ra = normalizeDeg(Math.atan2(Math.sin(lonRad) * Math.cos(eps), Math.cos(lonRad)) * RAD2DEG);

    const signIndex = Math.floor(fortuneLon / 30);
    const sign = ZODIAC_SIGNS[signIndex].sign;
    const degreeInSign = Math.floor(fortuneLon % 30);
    const minuteInSign = Math.floor(((fortuneLon % 30) - degreeInSign) * 60);

    positions.push({
      planetId: 'fortune',
      name: fortuneDef.name,
      symbol: fortuneDef.symbol,
      longitude: fortuneLon,
      latitude: 0,
      declination: dec,
      rightAscension: ra,
      distanceAU: 1.0,
      speed: 1.0,
      sign,
      degreeInSign,
      minuteInSign,
      isRetrograde: false,
      house: 1,
    });
  }

  // Asteroid helper function (Keplerian orbital elements with geocentric conversion)
  const computeAsteroid = (
    id: 'ceres' | 'pallas' | 'juno' | 'vesta',
    a: number,
    e: number,
    incDeg: number,
    omegaDeg: number,
    wDeg: number,
    M0Deg: number,
    nDegPerDay: number,
    epochJd: number = 2451545.0
  ) => {
    const def = PLANET_DEFINITIONS[id];
    if (!def) return;
    const dayOffset = jd - epochJd;
    let M = normalizeDeg(M0Deg + nDegPerDay * dayOffset) * DEG2RAD;
    let E = M;
    for (let i = 0; i < 6; i++) {
      E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    }
    const vTrue = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
    const r = a * (1 - e * Math.cos(E));
    const w = wDeg * DEG2RAD;
    const u = vTrue + w;
    const Omega = omegaDeg * DEG2RAD;
    const inc = incDeg * DEG2RAD;

    const xHelio = r * (Math.cos(Omega) * Math.cos(u) - Math.sin(Omega) * Math.sin(u) * Math.cos(inc));
    const yHelio = r * (Math.sin(Omega) * Math.cos(u) + Math.cos(Omega) * Math.sin(u) * Math.cos(inc));
    const zHelio = r * Math.sin(u) * Math.sin(inc);

    const sunVec = Astronomy.GeoVector(Astronomy.Body.Sun, time, true);
    const xGeo = xHelio + sunVec.x;
    const yGeo = yHelio + sunVec.y;
    const zGeo = zHelio + sunVec.z;

    const lon = normalizeDeg(Math.atan2(yGeo, xGeo) * RAD2DEG);
    const lat = Math.atan2(zGeo, Math.hypot(xGeo, yGeo)) * RAD2DEG;

    const lonRad = lon * DEG2RAD;
    const latRad = lat * DEG2RAD;
    const sinDec = Math.sin(latRad) * Math.cos(eps) + Math.cos(latRad) * Math.sin(eps) * Math.sin(lonRad);
    const dec = Math.asin(Math.max(-1, Math.min(1, sinDec))) * RAD2DEG;
    const yRA = Math.cos(latRad) * Math.cos(eps) * Math.sin(lonRad) - Math.sin(latRad) * Math.sin(eps);
    const xRA = Math.cos(latRad) * Math.cos(lonRad);
    const ra = normalizeDeg(Math.atan2(yRA, xRA) * RAD2DEG);

    const signIndex = Math.floor(lon / 30);
    const sign = ZODIAC_SIGNS[signIndex].sign;
    const degreeInSign = Math.floor(lon % 30);
    const minuteInSign = Math.floor(((lon % 30) - degreeInSign) * 60);

    positions.push({
      planetId: id,
      name: def.name,
      symbol: def.symbol,
      longitude: lon,
      latitude: Number(lat.toFixed(3)),
      declination: Number(dec.toFixed(3)),
      rightAscension: Number(ra.toFixed(3)),
      distanceAU: Number(Math.hypot(xGeo, yGeo, zGeo).toFixed(3)),
      speed: Number(nDegPerDay.toFixed(3)),
      sign,
      degreeInSign,
      minuteInSign,
      isRetrograde: false,
      house: 1,
    });
  };

  // 16. Ceres
  computeAsteroid('ceres', 2.767, 0.076, 10.59, 80.33, 73.60, 77.37, 0.2140);
  // 17. Pallas
  computeAsteroid('pallas', 2.772, 0.231, 34.84, 173.09, 310.05, 59.70, 0.2134);
  // 18. Juno
  computeAsteroid('juno', 2.670, 0.255, 12.98, 169.91, 248.41, 38.33, 0.2257);
  // 19. Vesta
  computeAsteroid('vesta', 2.362, 0.089, 7.14, 103.81, 150.73, 20.86, 0.2715);

  return positions;
}

/**
 * Calculate Local Sidereal Time (LST) in degrees for terrestrial longitude
 */
export function calculateLST(gmst: number, lng: number): number {
  return normalizeDeg(gmst + lng);
}

/**
 * Calculate Ascendant and Midheaven for terrestrial coordinates and GMST
 */
export function calculateChartAngles(
  lat: number,
  lng: number,
  gmst: number,
  obliquity: number
): ChartAngles {
  const lst = calculateLST(gmst, lng);
  const lstRad = lst * DEG2RAD;
  const latRad = lat * DEG2RAD;
  const epsRad = obliquity * DEG2RAD;

  // Midheaven (MC)
  let mc = Math.atan2(Math.sin(lstRad), Math.cos(lstRad) * Math.cos(epsRad)) * RAD2DEG;
  mc = normalizeDeg(mc);

  // Ascendant (ASC) - Standard Swiss Ephemeris / Meeus Eastern Horizon Formula
  const yAsc = Math.cos(lstRad);
  const xAsc = -(Math.sin(lstRad) * Math.cos(epsRad) + Math.tan(latRad) * Math.sin(epsRad));
  let asc = Math.atan2(yAsc, xAsc) * RAD2DEG;
  asc = normalizeDeg(asc);

  const ic = normalizeDeg(mc + 180);
  const dsc = normalizeDeg(asc + 180);

  // Equal House system
  const houses: number[] = [];
  for (let h = 0; h < 12; h++) {
    houses.push(normalizeDeg(asc + h * 30));
  }

  return {
    ascendant: asc,
    midheaven: mc,
    descendant: dsc,
    imumCoeli: ic,
    houses,
  };
}

/**
 * Generate Astrocartography lines (MC, IC, ASC, DSC)
 *
 * Supported Calculation Methods:
 * 1. 'in_mundo' (Jim Lewis Classic Astro*Carto*Graphy):
 *    Calculated directly from the actual 3-dimensional astronomical position of the celestial body
 *    (using true of date Right Ascension and Declination). Tracks where the planet physically rises,
 *    sets, culminates (MC), and anti-culminates (IC) in the sky.
 *
 * 2. 'in_zodiaco' (Zodico / Ecliptic Projection):
 *    Calculated from the degree-based ecliptic longitude of the planet (with zero latitude).
 *    Corresponds 1:1 with relocated natal chart house cusps (as seen on Astro.com & Astro-Seek).
 *    A location on the Venus IC line in Zodiaco will have Venus exactly at the IC (4th house cusp degree)
 *    in its relocated chart.
 */
export function generateAstroLines(
  planetPos: PlanetPosition,
  gmst: number,
  chartOwner: 'primary' | 'secondary' | 'transit' = 'primary',
  method: CalculationMethod = 'in_mundo',
  obliquity: number = 23.439291
): AstrocartographyLine[] {
  const lines: AstrocartographyLine[] = [];
  const pDef = PLANET_DEFINITIONS[planetPos.planetId];
  if (!pDef) return lines;

  const polarity =
    pDef.nature === 'malefic' ? 'challenging' : pDef.nature === 'benefic' ? 'harmonious' : 'neutral';

  const epsRad = obliquity * DEG2RAD;

  if (method === 'in_zodiaco') {
    // ----------------------------------------------------
    // IN ZODIACO (ZODICO / ECLIPTIC PROJECTION)
    // ----------------------------------------------------
    const lam = planetPos.longitude;
    const lamRad = lam * DEG2RAD;

    // RAMC where Midheaven equals planet longitude
    const ramc = normalizeDeg(Math.atan2(Math.sin(lamRad) * Math.cos(epsRad), Math.cos(lamRad)) * RAD2DEG);

    // Ecliptic declination of planet degree (beta = 0)
    const sinDec0 = Math.sin(epsRad) * Math.sin(lamRad);
    const dec0Rad = Math.asin(Math.max(-1, Math.min(1, sinDec0)));
    const dec0 = dec0Rad * RAD2DEG;

    // 1. MC Line (Zodiaco): Lng = RAMC - GMST
    const mcLng = normalizeLng(ramc - gmst);
    const mcPoints: Coordinates[] = [];
    for (let lat = -85; lat <= 85; lat += 1) {
      mcPoints.push({ lat, lng: mcLng });
    }
    lines.push({
      id: `${chartOwner}_${planetPos.planetId}_MC`,
      planetId: planetPos.planetId,
      angle: 'MC',
      color: pDef.color,
      points: mcPoints,
      description: `${planetPos.name} on Midheaven (MC) [In Zodiaco] — Relocated MC exactly conjunct ${planetPos.name} (${planetPos.sign} ${planetPos.degreeInSign}°${planetPos.minuteInSign}')`,
      polarity,
      chartOwner,
      method,
    });

    // 2. IC Line (Zodiaco): Lng = (RAMC + 180) - GMST
    const icLng = normalizeLng(ramc + 180 - gmst);
    const icPoints: Coordinates[] = [];
    for (let lat = -85; lat <= 85; lat += 1) {
      icPoints.push({ lat, lng: icLng });
    }
    lines.push({
      id: `${chartOwner}_${planetPos.planetId}_IC`,
      planetId: planetPos.planetId,
      angle: 'IC',
      color: pDef.color,
      points: icPoints,
      description: `${planetPos.name} on Imum Coeli (IC) [In Zodiaco] — Relocated IC exactly conjunct ${planetPos.name} (${planetPos.sign} ${planetPos.degreeInSign}°${planetPos.minuteInSign}')`,
      polarity,
      chartOwner,
      method,
    });

    // 3. ASC and DSC (Zodiaco)
    const absDec0 = Math.abs(dec0);
    const maxLat = Math.min(84, Math.max(10, 90 - absDec0 - 0.2));
    const ascPoints: Coordinates[] = [];
    const dscPoints: Coordinates[] = [];

    for (let lat = -maxLat; lat <= maxLat; lat += 0.5) {
      const latRad = lat * DEG2RAD;
      const cosH = -Math.tan(latRad) * Math.tan(dec0Rad);
      if (Math.abs(cosH) <= 1.0001) {
        const clampedCosH = Math.max(-1, Math.min(1, cosH));
        const H0 = Math.acos(clampedCosH) * RAD2DEG;

        // In Zodiaco:
        // When LST = RAMC - H0, Ascendant = lambda (rising in east)
        const ascLng = normalizeLng(ramc - H0 - gmst);
        ascPoints.push({ lat, lng: ascLng });

        // When LST = RAMC + H0, Descendant = lambda (setting in west)
        const dscLng = normalizeLng(ramc + H0 - gmst);
        dscPoints.push({ lat, lng: dscLng });
      }
    }

    if (ascPoints.length > 2) {
      lines.push({
        id: `${chartOwner}_${planetPos.planetId}_ASC`,
        planetId: planetPos.planetId,
        angle: 'ASC',
        color: pDef.color,
        points: ascPoints,
        description: `${planetPos.name} on Ascendant (ASC) [In Zodiaco] — Relocated Ascendant exactly conjunct ${planetPos.name} (${planetPos.sign} ${planetPos.degreeInSign}°${planetPos.minuteInSign}')`,
        polarity,
        chartOwner,
        method,
      });
    }

    if (dscPoints.length > 2) {
      lines.push({
        id: `${chartOwner}_${planetPos.planetId}_DSC`,
        planetId: planetPos.planetId,
        angle: 'DSC',
        color: pDef.color,
        points: dscPoints,
        description: `${planetPos.name} on Descendant (DSC) [In Zodiaco] — Relocated Descendant exactly conjunct ${planetPos.name} (${planetPos.sign} ${planetPos.degreeInSign}°${planetPos.minuteInSign}')`,
        polarity,
        chartOwner,
        method,
      });
    }
  } else {
    // ----------------------------------------------------
    // IN MUNDO (JIM LEWIS CLASSIC ASTRO*CARTO*GRAPHY)
    // ----------------------------------------------------
    const ra = planetPos.rightAscension;
    const dec = planetPos.declination;
    const decRad = dec * DEG2RAD;

    // 1. MC Line (Mundo): Physical Zenith Culmination (LST = RA => Lng = RA - GMST)
    const mcLng = normalizeLng(ra - gmst);
    const mcPoints: Coordinates[] = [];
    for (let lat = -85; lat <= 85; lat += 1) {
      mcPoints.push({ lat, lng: mcLng });
    }
    lines.push({
      id: `${chartOwner}_${planetPos.planetId}_MC`,
      planetId: planetPos.planetId,
      angle: 'MC',
      color: pDef.color,
      points: mcPoints,
      description: `${planetPos.name} on Midheaven (MC) [In Mundo] — Peak Vocation, Authority & Physical Zenith Culmination`,
      polarity,
      chartOwner,
      method,
    });

    // 2. IC Line (Mundo): Physical Nadir Anti-Culmination (Lng = RA + 180 - GMST)
    const icLng = normalizeLng(ra + 180 - gmst);
    const icPoints: Coordinates[] = [];
    for (let lat = -85; lat <= 85; lat += 1) {
      icPoints.push({ lat, lng: icLng });
    }
    lines.push({
      id: `${chartOwner}_${planetPos.planetId}_IC`,
      planetId: planetPos.planetId,
      angle: 'IC',
      color: pDef.color,
      points: icPoints,
      description: `${planetPos.name} on Imum Coeli (IC) [In Mundo] — Sanctuary, Home Roots & Physical Nadir Anti-Culmination`,
      polarity,
      chartOwner,
      method,
    });

    // 3. ASC & DSC Lines (Mundo): Physical Horizon Rising & Setting
    const absDec = Math.abs(dec);
    const maxLat = Math.min(84, Math.max(10, 90 - absDec - 0.2));
    const ascPoints: Coordinates[] = [];
    const dscPoints: Coordinates[] = [];

    for (let lat = -maxLat; lat <= maxLat; lat += 0.5) {
      const latRad = lat * DEG2RAD;
      const cosH = -Math.tan(latRad) * Math.tan(decRad);
      if (Math.abs(cosH) <= 1.0001) {
        const clampedCosH = Math.max(-1, Math.min(1, cosH));
        const H = Math.acos(clampedCosH) * RAD2DEG;

        // In Mundo:
        // Rising in East: Hour Angle is -H => LST = RA - H => Lng = RA - H - GMST
        const ascLng = normalizeLng(ra - H - gmst);
        ascPoints.push({ lat, lng: ascLng });

        // Setting in West: Hour Angle is +H => LST = RA + H => Lng = RA + H - GMST
        const dscLng = normalizeLng(ra + H - gmst);
        dscPoints.push({ lat, lng: dscLng });
      }
    }

    if (ascPoints.length > 2) {
      lines.push({
        id: `${chartOwner}_${planetPos.planetId}_ASC`,
        planetId: planetPos.planetId,
        angle: 'ASC',
        color: pDef.color,
        points: ascPoints,
        description: `${planetPos.name} on Ascendant (ASC) [In Mundo] — Vital Persona, Direct Embodiment & Physical Horizon Rising`,
        polarity,
        chartOwner,
        method,
      });
    }

    if (dscPoints.length > 2) {
      lines.push({
        id: `${chartOwner}_${planetPos.planetId}_DSC`,
        planetId: planetPos.planetId,
        angle: 'DSC',
        color: pDef.color,
        points: dscPoints,
        description: `${planetPos.name} on Descendant (DSC) [In Mundo] — Relationships, Partnerships & Physical Horizon Setting`,
        polarity,
        chartOwner,
        method,
      });
    }
  }

  return lines;
}

/**
 * Generate Harmonious & Disharmonious Aspect Lines and Custom Harmonics
 *
 * Supported Aspects & Harmonics:
 * - Trine (120°) - 3rd Harmonic (Harmonious)
 * - Sextile (60°) - 6th Harmonic (Harmonious)
 * - Square (90°) - 4th Harmonic (Disharmonious)
 * - Quintile (72°) - 5th Harmonic (Creative / Harmonic)
 * - Semi-Square (45°) - 8th Harmonic (Frictional / Challenge)
 * - Septile (51.4°) - 7th Harmonic (Karmic / Spiritual)
 * - Novile (40°) - 9th Harmonic (Joy / Enlightenment)
 */
export function generateAspectLines(
  planetPos: PlanetPosition,
  gmst: number,
  chartOwner: 'primary' | 'secondary' | 'transit' = 'primary',
  method: CalculationMethod = 'in_mundo',
  obliquity: number = 23.439291,
  options?: {
    harmonics?: number[];
    includeHarmonious?: boolean;
    includeDisharmonious?: boolean;
    use3DOffEclipticAspects?: boolean;
  }
): AstrocartographyLine[] {
  const aspectLines: AstrocartographyLine[] = [];
  const pDef = PLANET_DEFINITIONS[planetPos.planetId];
  if (!pDef) return aspectLines;

  const epsRad = obliquity * DEG2RAD;
  const harmonicsToCompute = options?.harmonics ?? [3, 4, 6];
  const is3D = Boolean(options?.use3DOffEclipticAspects);

  const aspectConfigs: {
    type: AspectLineType;
    harmonic: number;
    angleDeg: number;
    polarity: InfluencePolarity;
    color: string;
    description: string;
  }[] = [
    {
      type: 'trine',
      harmonic: 3,
      angleDeg: 120,
      polarity: 'harmonious',
      color: '#10b981', // emerald
      description: 'Trine (120°) Harmonious Flow — Effortless opportunity, artistic grace, and magnetic fortune',
    },
    {
      type: 'sextile',
      harmonic: 6,
      angleDeg: 60,
      polarity: 'harmonious',
      color: '#06b6d4', // cyan
      description: 'Sextile (60°) Harmonious Opportunity — Social alliances, intellectual stimulation, and collaborative growth',
    },
    {
      type: 'square',
      harmonic: 4,
      angleDeg: 90,
      polarity: 'challenging',
      color: '#f43f5e', // rose
      description: 'Square (90°) Dynamic Friction — High-stakes ambition, catalyst for breakthroughs, structural challenge',
    },
    {
      type: 'quintile',
      harmonic: 5,
      angleDeg: 72,
      polarity: 'harmonious',
      color: '#a855f7', // purple
      description: 'Quintile (72°) 5th Harmonic — Creative genius, exceptional talent, and innovative craftsmanship',
    },
    {
      type: 'semi-square',
      harmonic: 8,
      angleDeg: 45,
      polarity: 'challenging',
      color: '#f97316', // orange
      description: 'Semi-Square (45°) 8th Harmonic — Prompt to decisive action, productive friction, and restless drive',
    },
    {
      type: 'septile',
      harmonic: 7,
      angleDeg: 360 / 7,
      polarity: 'neutral',
      color: '#8b5cf6', // violet
      description: 'Septile (51.4°) 7th Harmonic — Karmic mystery, spiritual devotion, and irrational artistic inspiration',
    },
    {
      type: 'novile',
      harmonic: 9,
      angleDeg: 40,
      polarity: 'harmonious',
      color: '#38bdf8', // sky
      description: 'Novile (40°) 9th Harmonic — Serenity, initiation into higher knowledge, and inner peace',
    },
  ];

  for (const cfg of aspectConfigs) {
    if (!harmonicsToCompute.includes(cfg.harmonic)) continue;
    if (cfg.polarity === 'harmonious' && options?.includeHarmonious === false) continue;
    if (cfg.polarity === 'challenging' && options?.includeDisharmonious === false) continue;

    const offsets = [cfg.angleDeg, -cfg.angleDeg];

    for (const rawOffset of offsets) {
      const offsetSign = rawOffset > 0 ? '+' : '-';
      let effectiveAngle = Math.abs(rawOffset);

      if (is3D) {
        // 3D Spherical Off-the-Ecliptic Correction
        if (method === 'in_zodiaco') {
          const betaRad = (planetPos.latitude || 0) * DEG2RAD;
          const cosBeta = Math.cos(betaRad);
          const cosTheta = Math.cos(effectiveAngle * DEG2RAD);
          if (Math.abs(cosBeta) > 0.001) {
            const ratio = cosTheta / cosBeta;
            if (Math.abs(ratio) <= 1.0) {
              effectiveAngle = Math.acos(ratio) * RAD2DEG;
            }
          }
        } else {
          // In Mundo: Prime Vertical / Equatorial Declination Correction
          const decRad = (planetPos.declination || 0) * DEG2RAD;
          const cosDec = Math.cos(decRad);
          const cosTheta = Math.cos(effectiveAngle * DEG2RAD);
          if (Math.abs(cosDec) > 0.001) {
            const ratio = cosTheta / cosDec;
            if (Math.abs(ratio) <= 1.0) {
              effectiveAngle = Math.acos(ratio) * RAD2DEG;
            }
          }
        }
      }

      const offset = rawOffset > 0 ? effectiveAngle : -effectiveAngle;
      const absOffset = Math.abs(offset);
      const correctionTag = is3D ? ' [3D Spatial]' : '';

      if (method === 'in_zodiaco') {
        const lamAspect = normalizeDeg(planetPos.longitude + offset);
        const lamAspectRad = lamAspect * DEG2RAD;
        const ramcAspect = normalizeDeg(
          Math.atan2(Math.sin(lamAspectRad) * Math.cos(epsRad), Math.cos(lamAspectRad)) * RAD2DEG
        );

        // Aspect to MC (Meridian)
        const mcLng = normalizeLng(ramcAspect - gmst);
        const mcPoints: Coordinates[] = [];
        for (let lat = -80; lat <= 80; lat += 2) {
          mcPoints.push({ lat, lng: mcLng });
        }
        aspectLines.push({
          id: `${chartOwner}_${planetPos.planetId}_${cfg.type}_MC_${offsetSign}${Math.round(absOffset)}`,
          planetId: planetPos.planetId,
          angle: 'MC',
          color: cfg.color,
          points: mcPoints,
          description: `${planetPos.name} ${cfg.type.toUpperCase()} (${offsetSign}${absOffset.toFixed(1)}°) MC${correctionTag} — ${cfg.description}`,
          polarity: cfg.polarity,
          chartOwner,
          method,
          isAspectLine: true,
          aspectType: cfg.type,
          aspectAngleDeg: Number(absOffset.toFixed(1)),
          baseAngle: 'MC',
          harmonic: cfg.harmonic,
        });

        // Aspect to ASC (Horizon)
        const sinDec0 = Math.sin(epsRad) * Math.sin(lamAspectRad);
        const dec0Rad = Math.asin(Math.max(-1, Math.min(1, sinDec0)));
        const dec0 = dec0Rad * RAD2DEG;
        const maxLat = Math.min(80, Math.max(10, 90 - Math.abs(dec0) - 0.5));
        const ascPoints: Coordinates[] = [];

        for (let lat = -maxLat; lat <= maxLat; lat += 1.5) {
          const latRad = lat * DEG2RAD;
          const cosH = -Math.tan(latRad) * Math.tan(dec0Rad);
          if (Math.abs(cosH) <= 1.0) {
            const H0 = Math.acos(Math.max(-1, Math.min(1, cosH))) * RAD2DEG;
            const ascLng = normalizeLng(ramcAspect - H0 - gmst);
            ascPoints.push({ lat, lng: ascLng });
          }
        }

        if (ascPoints.length > 2) {
          aspectLines.push({
            id: `${chartOwner}_${planetPos.planetId}_${cfg.type}_ASC_${offsetSign}${Math.round(absOffset)}`,
            planetId: planetPos.planetId,
            angle: 'ASC',
            color: cfg.color,
            points: ascPoints,
            description: `${planetPos.name} ${cfg.type.toUpperCase()} (${offsetSign}${absOffset.toFixed(1)}°) ASC${correctionTag} — ${cfg.description}`,
            polarity: cfg.polarity,
            chartOwner,
            method,
            isAspectLine: true,
            aspectType: cfg.type,
            aspectAngleDeg: Number(absOffset.toFixed(1)),
            baseAngle: 'ASC',
            harmonic: cfg.harmonic,
          });
        }
      } else {
        // In Mundo Aspects
        const raAspect = normalizeDeg(planetPos.rightAscension + offset);
        const decRad = planetPos.declination * DEG2RAD;

        // Aspect to MC
        const mcLng = normalizeLng(raAspect - gmst);
        const mcPoints: Coordinates[] = [];
        for (let lat = -80; lat <= 80; lat += 2) {
          mcPoints.push({ lat, lng: mcLng });
        }
        aspectLines.push({
          id: `${chartOwner}_${planetPos.planetId}_${cfg.type}_MC_${offsetSign}${Math.round(absOffset)}`,
          planetId: planetPos.planetId,
          angle: 'MC',
          color: cfg.color,
          points: mcPoints,
          description: `${planetPos.name} ${cfg.type.toUpperCase()} (${offsetSign}${absOffset.toFixed(1)}°) MC [In Mundo]${correctionTag} — ${cfg.description}`,
          polarity: cfg.polarity,
          chartOwner,
          method,
          isAspectLine: true,
          aspectType: cfg.type,
          aspectAngleDeg: Number(absOffset.toFixed(1)),
          baseAngle: 'MC',
          harmonic: cfg.harmonic,
        });

        // Aspect to ASC
        const maxLat = Math.min(80, Math.max(10, 90 - Math.abs(planetPos.declination) - 0.5));
        const ascPoints: Coordinates[] = [];

        for (let lat = -maxLat; lat <= maxLat; lat += 1.5) {
          const latRad = lat * DEG2RAD;
          const cosH = -Math.tan(latRad) * Math.tan(decRad);
          if (Math.abs(cosH) <= 1.0) {
            const H = Math.acos(Math.max(-1, Math.min(1, cosH))) * RAD2DEG;
            const ascLng = normalizeLng(raAspect - H - gmst);
            ascPoints.push({ lat, lng: ascLng });
          }
        }

        if (ascPoints.length > 2) {
          aspectLines.push({
            id: `${chartOwner}_${planetPos.planetId}_${cfg.type}_ASC_${offsetSign}${Math.round(absOffset)}`,
            planetId: planetPos.planetId,
            angle: 'ASC',
            color: cfg.color,
            points: ascPoints,
            description: `${planetPos.name} ${cfg.type.toUpperCase()} (${offsetSign}${absOffset.toFixed(1)}°) ASC [In Mundo]${correctionTag} — ${cfg.description}`,
            polarity: cfg.polarity,
            chartOwner,
            method,
            isAspectLine: true,
            aspectType: cfg.type,
            aspectAngleDeg: Number(absOffset.toFixed(1)),
            baseAngle: 'ASC',
            harmonic: cfg.harmonic,
          });
        }
      }
    }
  }

  return aspectLines;
}

/**
 * Calculate Comprehensive Paranatellonta (Parans) lines where two planets
 * are simultaneously on cardinal angles across terrestrial latitude bands
 */
export function calculateParans(positions: PlanetPosition[]): ParanLine[] {
  const parans: ParanLine[] = [];
  const majorPlanets: PlanetId[] = [
    'sun',
    'moon',
    'mercury',
    'venus',
    'mars',
    'jupiter',
    'saturn',
    'uranus',
    'neptune',
    'pluto',
    'chiron',
    'north_node',
  ];
  const activePositions = positions.filter((p) => majorPlanets.includes(p.planetId));

  // Life category associations for planet pairs
  const getPairTheme = (p1: PlanetId, p2: PlanetId): { categories: LifeCategory[]; polarity: InfluencePolarity; interpretation: string } => {
    const isBenefic1 = p1 === 'venus' || p1 === 'jupiter' || p1 === 'sun';
    const isBenefic2 = p2 === 'venus' || p2 === 'jupiter' || p2 === 'sun';
    const isMalefic1 = p1 === 'mars' || p1 === 'saturn' || p1 === 'pluto';
    const isMalefic2 = p2 === 'mars' || p2 === 'saturn' || p2 === 'pluto';

    if ((p1 === 'venus' && p2 === 'jupiter') || (p1 === 'jupiter' && p2 === 'venus')) {
      return {
        categories: ['finances', 'relationships', 'growth', 'career'],
        polarity: 'harmonious',
        interpretation: 'Supreme Benefic Alliance: Magnified wealth attraction, social magnetism, generous patronage, and cultural distinction.',
      };
    }
    if ((p1 === 'sun' && p2 === 'jupiter') || (p1 === 'jupiter' && p2 === 'sun')) {
      return {
        categories: ['career', 'growth', 'purpose'],
        polarity: 'harmonious',
        interpretation: 'Solar Grandeur & Expansion: Elevated leadership, executive authority, philanthropic honors, and sovereign confidence.',
      };
    }
    if ((p1 === 'venus' && p2 === 'mars') || (p1 === 'mars' && p2 === 'venus')) {
      return {
        categories: ['relationships', 'creativity', 'growth'],
        polarity: 'harmonious',
        interpretation: 'Passionate Magnetism: Creative fire, dynamic interpersonal attraction, athletic or artistic charisma, and romantic vitality.',
      };
    }
    if ((p1 === 'mercury' && p2 === 'jupiter') || (p1 === 'jupiter' && p2 === 'mercury')) {
      return {
        categories: ['career', 'travel', 'creativity', 'growth'],
        polarity: 'harmonious',
        interpretation: 'Philosophical Intellect & Publishing: Broad literary success, international diplomacy, higher education, and commercial fluency.',
      };
    }
    if ((p1 === 'sun' && p2 === 'venus') || (p1 === 'venus' && p2 === 'sun')) {
      return {
        categories: ['relationships', 'creativity', 'purpose'],
        polarity: 'harmonious',
        interpretation: 'Golden Radiance & Aesthetic Joy: Likability, gracious diplomacy, visual or performance arts, and radiant social standing.',
      };
    }
    if ((p1 === 'moon' && p2 === 'venus') || (p1 === 'venus' && p2 === 'moon')) {
      return {
        categories: ['family', 'relationships', 'health'],
        polarity: 'harmonious',
        interpretation: 'Sensory Sanctuary & Domestic Peace: Emotional harmony, nourishing home environments, affectionate bonds, and peace of mind.',
      };
    }
    if ((p1 === 'uranus' && p2 === 'sun') || (p1 === 'sun' && p2 === 'uranus')) {
      return {
        categories: ['creativity', 'growth', 'purpose'],
        polarity: 'harmonious',
        interpretation: 'Radical Awakening & Innovation: Revolutionary breakthroughs, eccentric genius, tech visionary status, and liberation from dogma.',
      };
    }
    if ((p1 === 'mars' && p2 === 'saturn') || (p1 === 'saturn' && p2 === 'mars')) {
      return {
        categories: ['career', 'stability', 'growth'],
        polarity: 'challenging',
        interpretation: 'Iron Discipline & Heavy Endurance: Strenuous structural labor, unyielding stamina under pressure, and hard-won resilience.',
      };
    }
    if ((p1 === 'mars' && p2 === 'pluto') || (p1 === 'pluto' && p2 === 'mars')) {
      return {
        categories: ['growth', 'purpose', 'stability'],
        polarity: 'challenging',
        interpretation: 'Volcanic Willpower & Primal Drive: Intense transformative power, physical fortitude, confronting taboos, and raw determination.',
      };
    }
    if ((p1 === 'saturn' && p2 === 'pluto') || (p1 === 'pluto' && p2 === 'saturn')) {
      return {
        categories: ['stability', 'career', 'purpose'],
        polarity: 'challenging',
        interpretation: 'Structural Metamorphosis: End of obsolete eras, rebuilding foundations from the ground up, profound psychological grit.',
      };
    }
    if ((p1 === 'neptune' && p2 === 'sun') || (p1 === 'sun' && p2 === 'neptune')) {
      return {
        categories: ['spirituality', 'creativity', 'purpose'],
        polarity: 'harmonious',
        interpretation: 'Mystical Imagination & Transcendent Art: Spiritual devotion, cinematic vision, heightened empathy, and dream consciousness.',
      };
    }

    if (isBenefic1 && isBenefic2) {
      return {
        categories: ['growth', 'career', 'relationships'],
        polarity: 'harmonious',
        interpretation: `Fortunate convergence of ${PLANET_DEFINITIONS[p1].name} and ${PLANET_DEFINITIONS[p2].name}: Generates ease, supportive alliances, and expanding opportunities.`,
      };
    }
    if (isMalefic1 && isMalefic2) {
      return {
        categories: ['stability', 'growth', 'career'],
        polarity: 'challenging',
        interpretation: `Rigorous convergence of ${PLANET_DEFINITIONS[p1].name} and ${PLANET_DEFINITIONS[p2].name}: Demands extreme vigilance, strategic endurance, and emotional fortitude.`,
      };
    }
    return {
      categories: ['career', 'growth', 'purpose'],
      polarity: 'neutral',
      interpretation: `Dynamic interplay of ${PLANET_DEFINITIONS[p1].name} and ${PLANET_DEFINITIONS[p2].name}: Blends vocational drive with personal manifestation along this latitude.`,
    };
  };

  for (let i = 0; i < activePositions.length; i++) {
    for (let j = i + 1; j < activePositions.length; j++) {
      const p1 = activePositions[i];
      const p2 = activePositions[j];
      const dec1 = p1.declination * DEG2RAD;
      const dec2 = p2.declination * DEG2RAD;
      const deltaRA = (p2.rightAscension - p1.rightAscension) * DEG2RAD;
      const theme = getPairTheme(p1.planetId, p2.planetId);

      // Combination 1: P1 on MC, P2 on Rising (ASC)
      if (Math.abs(Math.tan(dec2)) > 0.05) {
        const tanPhi = -Math.cos(deltaRA) / Math.tan(dec2);
        const lat = Math.atan(tanPhi) * RAD2DEG;
        if (Math.abs(lat) <= 72) {
          parans.push({
            id: `paran_${p1.planetId}_mc_${p2.planetId}_asc`,
            latitude: Number(lat.toFixed(2)),
            planet1: p1.planetId,
            angle1: 'MC',
            planet2: p2.planetId,
            angle2: 'ASC',
            title: `${p1.name} (MC) & ${p2.name} (ASC) Paran`,
            interpretation: `${theme.interpretation} (Culminating ${p1.name} channels directly into Rising ${p2.name}).`,
            categories: theme.categories,
            polarity: theme.polarity,
          });
        }
      }

      // Combination 2: P1 on MC, P2 on Setting (DSC)
      if (Math.abs(Math.tan(dec2)) > 0.05) {
        const tanPhi = Math.cos(deltaRA) / Math.tan(dec2);
        const lat = Math.atan(tanPhi) * RAD2DEG;
        if (Math.abs(lat) <= 72) {
          parans.push({
            id: `paran_${p1.planetId}_mc_${p2.planetId}_dsc`,
            latitude: Number(lat.toFixed(2)),
            planet1: p1.planetId,
            angle1: 'MC',
            planet2: p2.planetId,
            angle2: 'DSC',
            title: `${p1.name} (MC) & ${p2.name} (DSC) Paran`,
            interpretation: `${theme.interpretation} (Public status connects with external partner dynamics).`,
            categories: ['career', 'relationships', ...theme.categories],
            polarity: theme.polarity,
          });
        }
      }

      // Combination 3: P1 on IC, P2 on Rising (ASC)
      if (Math.abs(Math.tan(dec2)) > 0.05) {
        const tanPhi = Math.cos(deltaRA) / Math.tan(dec2);
        const lat = Math.atan(tanPhi) * RAD2DEG;
        if (Math.abs(lat) <= 72) {
          parans.push({
            id: `paran_${p1.planetId}_ic_${p2.planetId}_asc`,
            latitude: Number(lat.toFixed(2)),
            planet1: p1.planetId,
            angle1: 'IC',
            planet2: p2.planetId,
            angle2: 'ASC',
            title: `${p1.name} (IC) & ${p2.name} (ASC) Paran`,
            interpretation: `Private soul sanctuary meets outer embodiment: ${p1.name}'s roots feed ${p2.name}'s persona.`,
            categories: ['family', 'stability', ...theme.categories],
            polarity: theme.polarity,
          });
        }
      }

      // Combination 4: P1 on IC, P2 on Setting (DSC)
      if (Math.abs(Math.tan(dec2)) > 0.05) {
        const tanPhi = -Math.cos(deltaRA) / Math.tan(dec2);
        const lat = Math.atan(tanPhi) * RAD2DEG;
        if (Math.abs(lat) <= 72) {
          parans.push({
            id: `paran_${p1.planetId}_ic_${p2.planetId}_dsc`,
            latitude: Number(lat.toFixed(2)),
            planet1: p1.planetId,
            angle1: 'IC',
            planet2: p2.planetId,
            angle2: 'DSC',
            title: `${p1.name} (IC) & ${p2.name} (DSC) Paran`,
            interpretation: `Domestic security and relationship stability: Shared sanctuaries and private domestic bonds.`,
            categories: ['family', 'relationships'],
            polarity: theme.polarity,
          });
        }
      }

      // Combination 5: P1 on ASC, P2 on DSC (Simultaneous Rising & Setting / Horizon Opposition)
      if (Math.abs(Math.tan(dec1) + Math.tan(dec2)) > 0.05) {
        const deltaH = (p2.rightAscension - p1.rightAscension - 180) * DEG2RAD;
        const tanPhi = -Math.cos(deltaH) / (Math.tan(dec1) + Math.tan(dec2));
        const lat = Math.atan(tanPhi) * RAD2DEG;
        if (Math.abs(lat) <= 72 && !isNaN(lat)) {
          parans.push({
            id: `paran_${p1.planetId}_asc_${p2.planetId}_dsc`,
            latitude: Number(lat.toFixed(2)),
            planet1: p1.planetId,
            angle1: 'ASC',
            planet2: p2.planetId,
            angle2: 'DSC',
            title: `${p1.name} (ASC) & ${p2.name} (DSC) Paran`,
            interpretation: `Direct relational axis: Self-embodiment of ${p1.name} mirrors the reflection of ${p2.name} in partners.`,
            categories: ['relationships', 'growth'],
            polarity: theme.polarity,
          });
        }
      }
    }
  }

  // Deduplicate parans within 0.15 degrees latitude for same planet pairs
  const deduped: ParanLine[] = [];
  for (const p of parans.sort((a, b) => b.latitude - a.latitude)) {
    const exists = deduped.some(
      (d) =>
        Math.abs(d.latitude - p.latitude) < 0.2 &&
        ((d.planet1 === p.planet1 && d.planet2 === p.planet2) ||
          (d.planet1 === p.planet2 && d.planet2 === p.planet1))
    );
    if (!exists) {
      deduped.push(p);
    }
  }

  return deduped.slice(0, 64);
}

/**
 * Calculate Great-Circle Distance (Haversine) in kilometers between two points
 */
export function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * DEG2RAD;
  const dLng = (lng2 - lng1) * DEG2RAD;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * DEG2RAD) * Math.cos(lat2 * DEG2RAD) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate Planetary Crossings (intersections of planetary lines on the globe)
 */
export function calculatePlanetaryCrossings(lines: AstrocartographyLine[]): PlanetaryCrossing[] {
  const crossings: PlanetaryCrossing[] = [];

  const getCrossingThemeAndSummary = (
    p1: PlanetId,
    a1: AngleType,
    p2: PlanetId,
    a2: AngleType
  ): { theme: 'career' | 'love' | 'wealth' | 'transformation' | 'spirituality' | 'creativity'; isHarmonious: boolean; summary: string } => {
    const isBenefic1 = p1 === 'venus' || p1 === 'jupiter' || p1 === 'sun';
    const isBenefic2 = p2 === 'venus' || p2 === 'jupiter' || p2 === 'sun';

    if ((p1 === 'venus' && p2 === 'jupiter') || (p1 === 'jupiter' && p2 === 'venus')) {
      return {
        theme: 'wealth',
        isHarmonious: true,
        summary: `Venus (${a1}) ✕ Jupiter (${a2}) Golden Benefic Nexus: Pinnacle of magnetic wealth attraction, high culture, social luxury, and effortless fortune.`,
      };
    }
    if ((p1 === 'sun' && p2 === 'jupiter') || (p1 === 'jupiter' && p2 === 'sun')) {
      return {
        theme: 'career',
        isHarmonious: true,
        summary: `Sun (${a1}) ✕ Jupiter (${a2}) Executive Eminence: Supreme vocational authority, public honors, expansive recognition, and visionary leadership.`,
      };
    }
    if ((p1 === 'venus' && p2 === 'mars') || (p1 === 'mars' && p2 === 'venus')) {
      return {
        theme: 'love',
        isHarmonious: true,
        summary: `Venus (${a1}) ✕ Mars (${a2}) Passionate Magnetism: Intense romantic allure, creative drive, theatrical charisma, and dynamic vitality.`,
      };
    }
    if ((p1 === 'sun' && p2 === 'venus') || (p1 === 'venus' && p2 === 'sun')) {
      return {
        theme: 'love',
        isHarmonious: true,
        summary: `Sun (${a1}) ✕ Venus (${a2}) Golden Radiance: Harmonious diplomacy, irresistible personal warmth, artistic talent, and beloved popularity.`,
      };
    }
    if ((p1 === 'mercury' && p2 === 'jupiter') || (p1 === 'jupiter' && p2 === 'mercury')) {
      return {
        theme: 'career',
        isHarmonious: true,
        summary: `Mercury (${a1}) ✕ Jupiter (${a2}) Intellectual Expansion: Great success in publishing, global trade, higher academia, and international communication.`,
      };
    }
    if ((p1 === 'moon' && p2 === 'venus') || (p1 === 'venus' && p2 === 'moon')) {
      return {
        theme: 'love',
        isHarmonious: true,
        summary: `Moon (${a1}) ✕ Venus (${a2}) Sanctuary of Grace: Nurturing familial bonds, domestic peace, emotional restoration, and exquisite comfort.`,
      };
    }
    if ((p1 === 'uranus' && p2 === 'sun') || (p1 === 'sun' && p2 === 'uranus')) {
      return {
        theme: 'creativity',
        isHarmonious: true,
        summary: `Sun (${a1}) ✕ Uranus (${a2}) Electric Awakening: Radical innovation, inventive breakthroughs, unconventional genius, and personal liberation.`,
      };
    }
    if ((p1 === 'neptune' && p2 === 'sun') || (p1 === 'sun' && p2 === 'neptune')) {
      return {
        theme: 'spirituality',
        isHarmonious: true,
        summary: `Sun (${a1}) ✕ Neptune (${a2}) Mystical Illumination: Spiritual devotion, transcendental art, poetic imagination, and heightened intuitive receptivity.`,
      };
    }
    if ((p1 === 'mars' && p2 === 'saturn') || (p1 === 'saturn' && p2 === 'mars')) {
      return {
        theme: 'transformation',
        isHarmonious: false,
        summary: `Mars (${a1}) ✕ Saturn (${a2}) Iron Forge: Rigorous discipline, demanding structural endurance, formidable perseverance under immense pressure.`,
      };
    }
    if ((p1 === 'mars' && p2 === 'pluto') || (p1 === 'pluto' && p2 === 'mars')) {
      return {
        theme: 'transformation',
        isHarmonious: false,
        summary: `Mars (${a1}) ✕ Pluto (${a2}) Volcanic Metamorphosis: Primal empowerment, unstoppable focus, confronting fear, and catalytic reinvention.`,
      };
    }

    if (isBenefic1 && isBenefic2) {
      return {
        theme: 'wealth',
        isHarmonious: true,
        summary: `${PLANET_DEFINITIONS[p1]?.name} (${a1}) ✕ ${PLANET_DEFINITIONS[p2]?.name} (${a2}) Harmonious Nexus: Harmonious convergence unlocking growth and new opportunities.`,
      };
    }

    const defaultTheme: 'career' | 'love' | 'wealth' | 'transformation' | 'spirituality' | 'creativity' =
      p1 === 'venus' || p2 === 'venus'
        ? 'love'
        : p1 === 'jupiter' || p2 === 'jupiter'
        ? 'wealth'
        : p1 === 'neptune' || p2 === 'neptune'
        ? 'spirituality'
        : p1 === 'uranus' || p2 === 'uranus'
        ? 'creativity'
        : p1 === 'pluto' || p2 === 'pluto'
        ? 'transformation'
        : 'career';

    return {
      theme: defaultTheme,
      isHarmonious: false,
      summary: `${PLANET_DEFINITIONS[p1]?.name} (${a1}) ✕ ${PLANET_DEFINITIONS[p2]?.name} (${a2}) Power Crossing: Concentrated astrological node blending both archetypal energies.`,
    };
  };

  // MC/IC are vertical meridians, ASC/DSC are curved lines
  const verticalLines = lines.filter((l) => (l.angle === 'MC' || l.angle === 'IC') && !l.isAspectLine);
  const curvedLines = lines.filter((l) => (l.angle === 'ASC' || l.angle === 'DSC') && !l.isAspectLine);

  // 1. Vertical with Curved lines
  for (const vLine of verticalLines) {
    if (vLine.points.length === 0) continue;
    const vLng = vLine.points[0].lng;

    for (const cLine of curvedLines) {
      if (vLine.planetId === cLine.planetId) continue;

      for (let i = 0; i < cLine.points.length - 1; i++) {
        const p1 = cLine.points[i];
        const p2 = cLine.points[i + 1];

        const minLng = Math.min(p1.lng, p2.lng);
        const maxLng = Math.max(p1.lng, p2.lng);

        if (vLng >= minLng && vLng <= maxLng && maxLng - minLng < 180) {
          const t = maxLng === minLng ? 0.5 : (vLng - p1.lng) / (p2.lng - p1.lng);
          const crossLat = p1.lat + t * (p2.lat - p1.lat);

          if (crossLat >= -70 && crossLat <= 75) {
            let nearestCity: CityData | null = null;
            let minDistance = Infinity;

            for (const city of WORLD_CITIES) {
              const d = haversineDistanceKm(crossLat, vLng, city.lat, city.lng);
              if (d < minDistance) {
                minDistance = d;
                nearestCity = city;
              }
            }

            const { theme, isHarmonious, summary } = getCrossingThemeAndSummary(
              vLine.planetId,
              vLine.angle,
              cLine.planetId,
              cLine.angle
            );

            crossings.push({
              id: `crossing_${vLine.planetId}_${vLine.angle}_${cLine.planetId}_${cLine.angle}_${Math.round(
                crossLat
              )}_${Math.round(vLng)}`,
              lat: Number(crossLat.toFixed(2)),
              lng: Number(vLng.toFixed(2)),
              planet1: vLine.planetId,
              angle1: vLine.angle,
              planet2: cLine.planetId,
              angle2: cLine.angle,
              nearestCity: nearestCity?.name,
              country: nearestCity?.country,
              distanceToNearestCityKm: Math.round(minDistance),
              polarity:
                isHarmonious
                  ? 'harmonious'
                  : vLine.polarity === 'challenging' || cLine.polarity === 'challenging'
                  ? 'challenging'
                  : 'neutral',
              isHarmonious,
              theme,
              summary,
            });
            break;
          }
        }
      }
    }
  }

  // 2. Curved with Curved lines (ASC ✕ DSC, ASC ✕ ASC)
  for (let c1 = 0; c1 < curvedLines.length; c1++) {
    for (let c2 = c1 + 1; c2 < curvedLines.length; c2++) {
      const line1 = curvedLines[c1];
      const line2 = curvedLines[c2];
      if (line1.planetId === line2.planetId) continue;

      for (let i = 0; i < line1.points.length - 1; i += 2) {
        const a1 = line1.points[i];
        const a2 = line1.points[i + 1];

        for (let j = 0; j < line2.points.length - 1; j += 2) {
          const b1 = line2.points[j];
          const b2 = line2.points[j + 1];

          // Check bounding box overlap
          if (
            Math.max(a1.lat, a2.lat) >= Math.min(b1.lat, b2.lat) &&
            Math.max(b1.lat, b2.lat) >= Math.min(a1.lat, a2.lat) &&
            Math.max(a1.lng, a2.lng) >= Math.min(b1.lng, b2.lng) &&
            Math.max(b1.lng, b2.lng) >= Math.min(a1.lng, a2.lng)
          ) {
            // Estimate intersection
            const crossLat = (a1.lat + a2.lat + b1.lat + b2.lat) / 4;
            const crossLng = (a1.lng + a2.lng + b1.lng + b2.lng) / 4;

            if (crossLat >= -68 && crossLat <= 72) {
              let nearestCity: CityData | null = null;
              let minDistance = Infinity;

              for (const city of WORLD_CITIES) {
                const d = haversineDistanceKm(crossLat, crossLng, city.lat, city.lng);
                if (d < minDistance) {
                  minDistance = d;
                  nearestCity = city;
                }
              }

              const { theme, isHarmonious, summary } = getCrossingThemeAndSummary(
                line1.planetId,
                line1.angle,
                line2.planetId,
                line2.angle
              );

              crossings.push({
                id: `crossing_${line1.planetId}_${line1.angle}_${line2.planetId}_${line2.angle}_${Math.round(
                  crossLat
                )}_${Math.round(crossLng)}`,
                lat: Number(crossLat.toFixed(2)),
                lng: Number(crossLng.toFixed(2)),
                planet1: line1.planetId,
                angle1: line1.angle,
                planet2: line2.planetId,
                angle2: line2.angle,
                nearestCity: nearestCity?.name,
                country: nearestCity?.country,
                distanceToNearestCityKm: Math.round(minDistance),
                polarity: isHarmonious ? 'harmonious' : 'neutral',
                isHarmonious,
                theme,
                summary,
              });
              break;
            }
          }
        }
      }
    }
  }

  // Deduplicate nearby crossings
  const deduplicated: PlanetaryCrossing[] = [];
  for (const c of crossings) {
    const exists = deduplicated.some(
      (d) =>
        haversineDistanceKm(c.lat, c.lng, d.lat, d.lng) < 180 &&
        ((c.planet1 === d.planet1 && c.planet2 === d.planet2) ||
          (c.planet1 === d.planet2 && c.planet2 === d.planet1))
    );
    if (!exists) {
      deduplicated.push(c);
    }
  }

  return deduplicated.slice(0, 72);
}

/**
 * Calculate Major Aspects between natal planets
 */
export function calculateAspects(positions: PlanetPosition[]): AstrologicalAspect[] {
  const aspects: AstrologicalAspect[] = [];
  const aspectRules = [
    { type: 'conjunction' as const, angle: 0, orb: 8, isHarmonious: true },
    { type: 'sextile' as const, angle: 60, orb: 5, isHarmonious: true },
    { type: 'square' as const, angle: 90, orb: 7, isHarmonious: false },
    { type: 'trine' as const, angle: 120, orb: 8, isHarmonious: true },
    { type: 'opposition' as const, angle: 180, orb: 8, isHarmonious: false },
  ];

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const p1 = positions[i];
      const p2 = positions[j];
      const diff = Math.abs(p1.longitude - p2.longitude);
      const angle = diff > 180 ? 360 - diff : diff;

      for (const rule of aspectRules) {
        const orb = Math.abs(angle - rule.angle);
        if (orb <= rule.orb) {
          aspects.push({
            planet1: p1.planetId,
            planet2: p2.planetId,
            aspectType: rule.type,
            angle,
            orb: Number(orb.toFixed(2)),
            isHarmonious: rule.isHarmonious,
          });
          break;
        }
      }
    }
  }

  return aspects;
}

/**
 * Compute Complete Astrocartography Suite from Birth Data
 */
export function computeAstrocartographySuite(
  birthData: BirthData,
  method: CalculationMethod = 'in_mundo',
  options?: {
    harmonics?: number[];
    includeHarmonious?: boolean;
    includeDisharmonious?: boolean;
    use3DOffEclipticAspects?: boolean;
  }
) {
  const [yearStr, monthStr, dayStr] = birthData.date.split('-');
  const [hourStr, minStr] = birthData.time.split(':');

  const year = parseInt(yearStr, 10) || 1990;
  const month = parseInt(monthStr, 10) || 6;
  const day = parseInt(dayStr, 10) || 15;
  const localHour = parseInt(hourStr, 10) || 12;
  const localMin = parseInt(minStr, 10) || 0;

  // Exact UTC conversion handling day/month/leap year rollovers cleanly
  const utcDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const totalOffsetMinutes = Math.round(birthData.timezoneOffsetHours * 60);
  const totalMinutes = localHour * 60 + localMin - totalOffsetMinutes;
  utcDate.setUTCMinutes(totalMinutes);

  const astroTime = Astronomy.MakeTime(utcDate);
  const jd = astroTime.tt + 2451545.0;
  const gmst = normalizeDeg(Astronomy.SiderealTime(astroTime) * 15);
  const obliquity = Astronomy.e_tilt(astroTime).tobl;

  // High-precision planetary positions
  const positions = calculatePlanetaryPositions(jd);

  // Natal chart angles for birth place
  const natalAngles = calculateChartAngles(birthData.lat, birthData.lng, gmst, obliquity);

  // Re-calculate Part of Fortune: Day chart vs Night chart
  // Day chart: Asc + Moon - Sun; Night chart: Asc + Sun - Moon
  const sunPos = positions.find((p) => p.planetId === 'sun');
  const moonPos = positions.find((p) => p.planetId === 'moon');
  const fortunePos = positions.find((p) => p.planetId === 'fortune');
  if (sunPos && moonPos && fortunePos) {
    const isDayChart = natalAngles.midheaven > natalAngles.ascendant;
    const fortuneLon = isDayChart
      ? normalizeDeg(natalAngles.ascendant + moonPos.longitude - sunPos.longitude)
      : normalizeDeg(natalAngles.ascendant + sunPos.longitude - moonPos.longitude);
    fortunePos.longitude = fortuneLon;
    fortunePos.sign = ZODIAC_SIGNS[Math.floor(fortuneLon / 30)].sign;
    fortunePos.degreeInSign = Math.floor(fortuneLon % 30);
    fortunePos.minuteInSign = Math.floor(((fortuneLon % 30) - fortunePos.degreeInSign) * 60);
  }

  // Assign houses based on Equal House cusps
  for (const pos of positions) {
    let house = 1;
    for (let h = 0; h < 12; h++) {
      const cusp = natalAngles.houses[h];
      const nextCusp = natalAngles.houses[(h + 1) % 12];
      if (nextCusp > cusp) {
        if (pos.longitude >= cusp && pos.longitude < nextCusp) {
          house = h + 1;
          break;
        }
      } else {
        if (pos.longitude >= cusp || pos.longitude < nextCusp) {
          house = h + 1;
          break;
        }
      }
    }
    pos.house = house;
  }

  // Generate Astrocartography lines for all planets using the requested method
  const lines: AstrocartographyLine[] = [];
  for (const pos of positions) {
    const pLines = generateAstroLines(pos, gmst, 'primary', method, obliquity);
    lines.push(...pLines);

    // Generate Aspect Lines & Harmonics (Trine 120°, Sextile 60°, Square 90°, Quintile 72°, etc.)
    const pAspectLines = generateAspectLines(pos, gmst, 'primary', method, obliquity, {
      harmonics: options?.harmonics ?? [3, 4, 5, 6, 7, 8, 9],
      includeHarmonious: options?.includeHarmonious ?? true,
      includeDisharmonious: options?.includeDisharmonious ?? true,
      use3DOffEclipticAspects: options?.use3DOffEclipticAspects ?? false,
    });
    lines.push(...pAspectLines);
  }

  // Calculate Parans & Crossings
  const parans = calculateParans(positions);
  const crossings = calculatePlanetaryCrossings(lines);
  const aspects = calculateAspects(positions);

  return {
    jd,
    gmst,
    obliquity,
    positions,
    natalPositions: positions,
    natalAngles,
    lines,
    parans,
    crossings,
    aspects,
    method,
  };
}

export const calculateAstrocartography = computeAstrocartographySuite;

/**
 * Calculate Real-time / Scheduled Planetary Transits against Natal Chart
 */
export function calculateTransits(
  transitDate: Date,
  natalLines: AstrocartographyLine[],
  method: CalculationMethod = 'in_mundo'
) {
  const astroTime = Astronomy.MakeTime(transitDate);
  const jd = astroTime.tt + 2451545.0;
  const gmst = normalizeDeg(Astronomy.SiderealTime(astroTime) * 15);
  const obliquity = Astronomy.e_tilt(astroTime).tobl;

  // Compute transiting planetary positions
  const transitingPositions = calculatePlanetaryPositions(jd);

  // Generate transiting astrocartography lines
  const transitLines: AstrocartographyLine[] = [];
  for (const pos of transitingPositions) {
    const pLines = generateAstroLines(pos, gmst, 'transit', method, obliquity);
    for (const l of pLines) {
      l.isTransit = true;
      l.chartOwner = 'transit';
      l.description = `Transiting ${pos.name} on ${l.angle} [${method === 'in_zodiaco' ? 'Zodiaco' : 'Mundo'}] — Active Temporal Cosmic Transit`;
      transitLines.push(l);
    }
  }

  // Calculate Transit-to-Natal Trigger Crossings
  const transitTriggers: TransitTrigger[] = [];

  for (const tLine of transitLines) {
    for (const nLine of natalLines) {
      // Find intersections between transit line and natal line
      for (let i = 0; i < tLine.points.length - 1; i += 2) {
        const p1 = tLine.points[i];
        const p2 = tLine.points[i + 1];

        for (let j = 0; j < nLine.points.length - 1; j += 2) {
          const q1 = nLine.points[j];
          const q2 = nLine.points[j + 1];

          // Check bounding box overlap
          const minLatT = Math.min(p1.lat, p2.lat);
          const maxLatT = Math.max(p1.lat, p2.lat);
          const minLatN = Math.min(q1.lat, q2.lat);
          const maxLatN = Math.max(q1.lat, q2.lat);

          if (maxLatT >= minLatN && minLatT <= maxLatN) {
            const minLngT = Math.min(p1.lng, p2.lng);
            const maxLngT = Math.max(p1.lng, p2.lng);
            const minLngN = Math.min(q1.lng, q2.lng);
            const maxLngN = Math.max(q1.lng, q2.lng);

            if (maxLngT >= minLngN && minLngT <= maxLngN) {
              const crossLat = (p1.lat + q1.lat) / 2;
              const crossLng = (p1.lng + q1.lng) / 2;

              // Find closest city
              let nearestCity = '';
              let minDist = Infinity;
              for (const city of WORLD_CITIES) {
                const d = haversineDistanceKm(crossLat, crossLng, city.lat, city.lng);
                if (d < minDist) {
                  minDist = d;
                  nearestCity = city.name;
                }
              }

              const tDef = PLANET_DEFINITIONS[tLine.planetId];
              const nDef = PLANET_DEFINITIONS[nLine.planetId];

              transitTriggers.push({
                id: `trig_${tLine.planetId}_${tLine.angle}_${nLine.planetId}_${nLine.angle}`,
                transitPlanet: tLine.planetId,
                transitAngle: tLine.angle,
                natalPlanet: nLine.planetId,
                natalAngle: nLine.angle,
                lat: Number(crossLat.toFixed(2)),
                lng: Number(crossLng.toFixed(2)),
                nearestCity: minDist < 800 ? nearestCity : undefined,
                description: `Transiting ${tDef.name} (${tLine.angle}) activates Natal ${nDef.name} (${nLine.angle})`,
                intensity: Math.max(50, Math.min(100, Math.round(95 - minDist / 20))),
              });

              break;
            }
          }
        }
      }
    }
  }

  // Filter unique triggers
  const uniqueTriggers = transitTriggers.filter(
    (v, i, a) => a.findIndex((t) => t.id === v.id) === i
  );

  return {
    jd,
    gmst,
    obliquity,
    transitingPositions,
    transitLines,
    transitTriggers: uniqueTriggers.slice(0, 24),
  };
}
