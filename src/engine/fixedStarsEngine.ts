import { AngleType, InfluencePolarity, PlanetId, PlanetPosition, StarParanLine } from '../types/astronomy';
import { FIXED_STARS_CATALOG } from '../constants/fixedStars';
import { PLANET_DEFINITIONS } from '../constants/celestialData';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

function normalizeDeg(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

/**
 * Calculate Bernadette Brady Star Parans
 * Computes exact terrestrial latitudes where prominent fixed stars and natal planets
 * cross the four cardinal angles (Rising, Culminating, Setting, Nadir) simultaneously.
 */
export function calculateStarParans(
  planetPositions: PlanetPosition[]
): StarParanLine[] {
  const parans: StarParanLine[] = [];
  const processedKeys = new Set<string>();

  for (const star of FIXED_STARS_CATALOG) {
    const starRA = star.rightAscensionDeg;
    const starDec = star.declinationDeg;
    const starDecRad = starDec * DEG2RAD;
    const tanStarDec = Math.tan(starDecRad);

    for (const planet of planetPositions) {
      // Prioritize luminaries, inner planets, Jupiter, Saturn, Chiron
      const pDef = PLANET_DEFINITIONS[planet.planetId];
      if (!pDef) continue;

      const planetRA = planet.rightAscension;
      const planetDec = planet.declination;
      const planetDecRad = planetDec * DEG2RAD;
      const tanPlanetDec = Math.tan(planetDecRad);

      // Case A: Star on Horizon (Rising/Setting), Planet on Meridian (MC/IC)
      if (Math.abs(tanStarDec) > 0.001) {
        // 1. Star Rising/Setting with Planet Culminating (MC)
        const dAlphaMC = normalizeDeg(starRA - planetRA);
        const cosH_MC = Math.cos(dAlphaMC * DEG2RAD);
        if (Math.abs(cosH_MC) <= 1.0) {
          const tanPhi = -cosH_MC / tanStarDec;
          const lat = Math.atan(tanPhi) * RAD2DEG;
          if (Math.abs(lat) <= 75) {
            addParan(
              star.id,
              star.name,
              star.constellation,
              star.magnitude,
              lat,
              planet.planetId,
              'MC',
              'ASC',
              `${star.name} Rising with ${planet.name} Culminating`,
              `Brady Star Paran at ${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}: ${star.name} rises on the eastern horizon as natal ${planet.name} reaches the zenith (MC). ${star.bradyTheme}`,
              'prime',
              pDef.nature === 'benefic' || star.nature.includes('Jupiter') || star.nature.includes('Venus') ? 'harmonious' : 'neutral'
            );
          }
        }

        // 2. Star Rising/Setting with Planet Anti-Culminating (IC)
        const dAlphaIC = normalizeDeg(starRA - (planetRA + 180));
        const cosH_IC = Math.cos(dAlphaIC * DEG2RAD);
        if (Math.abs(cosH_IC) <= 1.0) {
          const tanPhi = -cosH_IC / tanStarDec;
          const lat = Math.atan(tanPhi) * RAD2DEG;
          if (Math.abs(lat) <= 75) {
            addParan(
              star.id,
              star.name,
              star.constellation,
              star.magnitude,
              lat,
              planet.planetId,
              'IC',
              'ASC',
              `${star.name} Rising with ${planet.name} at Nadir`,
              `Brady Star Paran at ${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}: ${star.name} rises as natal ${planet.name} anti-culminates (IC). Anchors ancient stellar power into the private roots: ${star.heliacalMeaning}`,
              'underworld',
              'neutral'
            );
          }
        }
      }

      // Case B: Planet on Horizon (Rising/Setting), Star on Meridian (MC/IC)
      if (Math.abs(tanPlanetDec) > 0.001) {
        // 3. Planet Rising/Setting with Star Culminating (MC)
        const dAlphaStarMC = normalizeDeg(planetRA - starRA);
        const cosH_StarMC = Math.cos(dAlphaStarMC * DEG2RAD);
        if (Math.abs(cosH_StarMC) <= 1.0) {
          const tanPhi = -cosH_StarMC / tanPlanetDec;
          const lat = Math.atan(tanPhi) * RAD2DEG;
          if (Math.abs(lat) <= 75) {
            addParan(
              star.id,
              star.name,
              star.constellation,
              star.magnitude,
              lat,
              planet.planetId,
              'ASC',
              'MC',
              `${planet.name} Rising with ${star.name} Culminating`,
              `Brady Star Paran at ${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}: Natal ${planet.name} rises into physical embodiment as ${star.name} blazes at high noon (MC). Brings worldly leadership: ${star.bradyTheme}`,
              'culmination',
              'harmonious'
            );
          }
        }

        // 4. Planet Rising/Setting with Star Anti-Culminating (IC)
        const dAlphaStarIC = normalizeDeg(planetRA - (starRA + 180));
        const cosH_StarIC = Math.cos(dAlphaStarIC * DEG2RAD);
        if (Math.abs(cosH_StarIC) <= 1.0) {
          const tanPhi = -cosH_StarIC / tanPlanetDec;
          const lat = Math.atan(tanPhi) * RAD2DEG;
          if (Math.abs(lat) <= 75) {
            addParan(
              star.id,
              star.name,
              star.constellation,
              star.magnitude,
              lat,
              planet.planetId,
              'ASC',
              'IC',
              `${planet.name} Rising with ${star.name} at Nadir`,
              `Brady Star Paran at ${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}: ${planet.name} emerges while ${star.name} rests at the nadir foundation. Inner soul wisdom: ${star.heliacalMeaning}`,
              'underworld',
              'neutral'
            );
          }
        }
      }
    }
  }

  function addParan(
    starId: string,
    starName: string,
    starConstellation: string,
    magnitude: number,
    latitude: number,
    planetId: PlanetId,
    planetAngle: AngleType,
    starAngle: AngleType,
    title: string,
    interpretation: string,
    bradyCategory: 'youth' | 'prime' | 'culmination' | 'underworld' | 'general',
    polarity: InfluencePolarity
  ) {
    const roundedLat = Math.round(latitude * 10) / 10;
    const key = `${starId}_${planetId}_${planetAngle}_${starAngle}_${roundedLat}`;
    if (processedKeys.has(key)) return;
    processedKeys.add(key);

    parans.push({
      id: `star_paran_${key}`,
      starId,
      starName,
      starConstellation,
      latitude: roundedLat,
      planetId,
      planetAngle,
      starAngle,
      title,
      interpretation,
      bradyCategory,
      polarity,
      magnitude,
    });
  }

  // Sort parans north to south
  return parans.sort((a, b) => b.latitude - a.latitude);
}
