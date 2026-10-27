import {
  AstrocartographyLine,
  ChartAngles,
  CityData,
  Coordinates,
  LifeCategory,
  LocationScore,
  ParanLine,
  PlanetaryCrossing,
  PlanetId,
  PlanetPosition,
  RelocationComparison,
} from '../types/astronomy';
import { calculateChartAngles, calculateLST, haversineDistanceKm } from './astronomyEngine';
import { PLANET_DEFINITIONS } from '../constants/celestialData';
import { PLANET_ANGLE_INTERPRETATIONS } from './interpretations';

/**
 * Find the minimum distance from coordinates (lat, lng) to an astrocartography line
 */
export function getDistanceToLineKm(coord: Coordinates, line: AstrocartographyLine): number {
  if (!line.points || line.points.length === 0) return Infinity;

  // Exact fast calculation for vertical meridian lines (MC and IC)
  if (line.angle === 'MC' || line.angle === 'IC') {
    const lineLng = line.points[0].lng;
    let dLng = Math.abs(coord.lng - lineLng);
    if (dLng > 180) dLng = 360 - dLng;
    const dist = dLng * (Math.PI / 180) * 6371 * Math.cos((coord.lat * Math.PI) / 180);
    return Math.round(dist);
  }

  let minDistance = Infinity;
  for (let i = 0; i < line.points.length; i++) {
    const pt = line.points[i];
    // Fast latitude filter: 1 deg latitude ≈ 111 km
    const latDiffKm = Math.abs(coord.lat - pt.lat) * 111;
    if (latDiffKm > minDistance) continue;

    const dist = haversineDistanceKm(coord.lat, coord.lng, pt.lat, pt.lng);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }
  return Math.round(minDistance);
}

/**
 * Score a specific location based on active lines, parans, and crossings within radiusKm
 */
export function calculateLocationScore(
  coord: Coordinates,
  lines: AstrocartographyLine[],
  parans: ParanLine[],
  crossings: PlanetaryCrossing[],
  maxRadiusKm: number = 700
): LocationScore {
  const categoryScores: Record<LifeCategory, number> = {
    career: 50,
    relationships: 50,
    creativity: 50,
    spirituality: 50,
    growth: 50,
    stability: 50,
    finances: 50,
    family: 50,
    travel: 50,
    community: 50,
    health: 50,
    purpose: 50,
  };

  const topInfluences: LocationScore['topInfluences'] = [];

  // Check each planetary line
  for (const line of lines) {
    const dist = getDistanceToLineKm(coord, line);
    if (dist <= maxRadiusKm) {
      // Gaussian / inverse distance power curve
      const factor = Math.max(0, 1 - dist / maxRadiusKm);
      const intensity = Math.round(factor * 100);

      const pDef = PLANET_DEFINITIONS[line.planetId];
      const interpretation = PLANET_ANGLE_INTERPRETATIONS[line.planetId]?.[line.angle];

      topInfluences.push({
        planetId: line.planetId,
        angle: line.angle,
        distanceKm: dist,
        intensity,
        polarity: line.polarity,
        summary: line.isAspectLine
          ? line.description
          : interpretation?.headline || `${pDef.name} on ${line.angle} line (${dist} km away)`,
        isAspectLine: line.isAspectLine,
        aspectType: line.aspectType,
        harmonic: line.harmonic,
      });

      // Distribute points to categories based on nature
      const weight = factor * 35;
      if (line.planetId === 'sun') {
        categoryScores.career += weight * 0.9;
        categoryScores.purpose += weight * 1.0;
        categoryScores.growth += weight * 0.8;
        categoryScores.health += weight * 0.7;
      } else if (line.planetId === 'moon') {
        categoryScores.family += weight * 1.0;
        categoryScores.spirituality += weight * 0.8;
        categoryScores.stability += weight * 0.7;
        categoryScores.relationships += weight * 0.6;
      } else if (line.planetId === 'venus') {
        categoryScores.relationships += weight * 1.0;
        categoryScores.creativity += weight * 0.9;
        categoryScores.finances += weight * 0.8;
        categoryScores.community += weight * 0.7;
      } else if (line.planetId === 'jupiter') {
        categoryScores.finances += weight * 1.0;
        categoryScores.growth += weight * 1.0;
        categoryScores.career += weight * 0.9;
        categoryScores.travel += weight * 0.9;
      } else if (line.planetId === 'mercury') {
        categoryScores.community += weight * 0.9;
        categoryScores.career += weight * 0.8;
        categoryScores.travel += weight * 0.8;
        categoryScores.creativity += weight * 0.7;
      } else if (line.planetId === 'mars') {
        categoryScores.career += weight * 0.8;
        categoryScores.growth += weight * 0.8;
        if (line.polarity === 'challenging') categoryScores.stability -= weight * 0.3;
      } else if (line.planetId === 'saturn') {
        categoryScores.stability += weight * 0.9;
        categoryScores.career += weight * 0.7;
        if (line.polarity === 'challenging') categoryScores.relationships -= weight * 0.2;
      } else if (line.planetId === 'uranus') {
        categoryScores.creativity += weight * 0.9;
        categoryScores.growth += weight * 0.9;
        categoryScores.purpose += weight * 0.7;
      } else if (line.planetId === 'neptune') {
        categoryScores.spirituality += weight * 1.0;
        categoryScores.creativity += weight * 0.9;
      } else if (line.planetId === 'pluto') {
        categoryScores.growth += weight * 1.0;
        categoryScores.purpose += weight * 0.8;
      } else if (line.planetId === 'chiron') {
        categoryScores.health += weight * 0.9;
        categoryScores.spirituality += weight * 0.8;
      } else if (line.planetId === 'north_node' || line.planetId === 'fortune') {
        categoryScores.purpose += weight * 1.0;
        categoryScores.finances += weight * 0.8;
      }
    }
  }

  // Active Parans (horizontal latitude bands within 2.5 degrees of latitude)
  const activeParans = parans.filter((p) => Math.abs(p.latitude - coord.lat) <= 2.5);
  for (const paran of activeParans) {
    const latDiff = Math.abs(paran.latitude - coord.lat);
    const paranWeight = Math.max(0, 1 - latDiff / 2.5) * 25;
    for (const cat of paran.categories) {
      if (categoryScores[cat] !== undefined) {
        categoryScores[cat] += paranWeight;
      }
    }
  }

  // Nearby Crossings within radius
  const nearbyCrossings = crossings.filter(
    (c) => haversineDistanceKm(coord.lat, coord.lng, c.lat, c.lng) <= maxRadiusKm
  );

  // Clamp category scores between 10 and 99
  let totalScore = 0;
  const categoriesList = Object.keys(categoryScores) as LifeCategory[];
  for (const cat of categoriesList) {
    categoryScores[cat] = Math.min(99, Math.max(12, Math.round(categoryScores[cat])));
    totalScore += categoryScores[cat];
  }

  const overallScore = Math.round(totalScore / categoriesList.length);

  // Sort top influences by intensity
  topInfluences.sort((a, b) => b.intensity - a.intensity);

  return {
    overallScore,
    categories: categoryScores,
    topInfluences: topInfluences.slice(0, 8),
    activeParans: activeParans.slice(0, 5),
    nearbyCrossings: nearbyCrossings.slice(0, 5),
  };
}

/**
 * Generate complete Relocation Chart & Comparison against Natal Chart
 */
export function generateRelocationComparison(
  targetCity: CityData,
  natalAngles: ChartAngles,
  natalPositions: PlanetPosition[],
  gmst: number,
  obliquity: number
): RelocationComparison {
  const relocatedAngles = calculateChartAngles(targetCity.lat, targetCity.lng, gmst, obliquity);

  // Compute relocated positions and house cusps
  const relocatedPositions = natalPositions.map((pos) => {
    let relocatedHouse = 1;
    for (let h = 0; h < 12; h++) {
      const cusp = relocatedAngles.houses[h];
      const nextCusp = relocatedAngles.houses[(h + 1) % 12];
      if (nextCusp > cusp) {
        if (pos.longitude >= cusp && pos.longitude < nextCusp) {
          relocatedHouse = h + 1;
          break;
        }
      } else {
        if (pos.longitude >= cusp || pos.longitude < nextCusp) {
          relocatedHouse = h + 1;
          break;
        }
      }
    }

    return {
      ...pos,
      house: relocatedHouse,
    };
  });

  // Calculate significant shifts (e.g., house change or angular proximity)
  const significantShifts: RelocationComparison['significantShifts'] = [];

  for (let i = 0; i < natalPositions.length; i++) {
    const nat = natalPositions[i];
    const rel = relocatedPositions[i];

    // Check proximity to relocated angles
    const anglesToCheck: { type: 'MC' | 'IC' | 'ASC' | 'DSC'; deg: number }[] = [
      { type: 'MC', deg: relocatedAngles.midheaven },
      { type: 'IC', deg: relocatedAngles.imumCoeli },
      { type: 'ASC', deg: relocatedAngles.ascendant },
      { type: 'DSC', deg: relocatedAngles.descendant },
    ];

    let closestAngle: { type: 'MC' | 'IC' | 'ASC' | 'DSC'; orb: number } | null = null;
    for (const ang of anglesToCheck) {
      const diff = Math.abs(rel.longitude - ang.deg);
      const orb = diff > 180 ? 360 - diff : diff;
      if (orb <= 8.5) {
        if (!closestAngle || orb < closestAngle.orb) {
          closestAngle = { type: ang.type, orb: Number(orb.toFixed(1)) };
        }
      }
    }

    if (nat.house !== rel.house || closestAngle) {
      let interpretation = '';
      if (closestAngle) {
        interpretation = `Crucial Angular Conjunction: ${rel.name} is within ${closestAngle.orb}° of the relocated ${closestAngle.type}! This brings immense focus and power to ${rel.name}'s themes in ${targetCity.name}.`;
      } else {
        interpretation = `${rel.name} moves from House ${nat.house} to House ${rel.house}. Shifts psychological focus toward ${getHouseTheme(
          rel.house
        )}.`;
      }

      significantShifts.push({
        planetId: rel.planetId,
        natalHouse: nat.house,
        relocatedHouse: rel.house,
        angularProximityDeg: closestAngle?.orb,
        angularType: closestAngle?.type,
        interpretation,
      });
    }
  }

  const comparison: RelocationComparison = {
    targetCity,
    natalAngles,
    relocatedAngles,
    natalPositions,
    relocatedPositions,
    significantShifts,
  };

  return comparison;
}

/**
 * Evaluate Relocation Health & Grade (Unambiguous Good vs Bad Assessment)
 */
export function evaluateRelocationVerdict(
  relocation: RelocationComparison,
  locationScore?: LocationScore
): import('../types/astronomy').RelocationVerdict {
  const pros: string[] = [];
  const cons: string[] = [];
  const keyBenefics: string[] = [];
  const keyMalefics: string[] = [];

  let goodnessBalance = 0; // positive = benefic, negative = challenging

  // Angular ecliptic proximity is not the same as geographic distance to an astrocartography line.
  if (!locationScore) {
    for (const shift of relocation.significantShifts) {
      if (shift.angularType && shift.angularProximityDeg !== undefined && shift.angularProximityDeg <= 6.0) {
        const pId = shift.planetId;
        const ang = shift.angularType;
        const orbStr = `${shift.angularProximityDeg.toFixed(1)}° orb`;

        if (pId === 'venus') {
          goodnessBalance += 30;
          keyBenefics.push(`Venus on ${ang}`);
          pros.push(`✦ Venus on ${ang} (${orbStr}): Supreme magnetism, social grace, romantic ease, and effortless aesthetic/financial harmony.`);
        } else if (pId === 'jupiter') {
          goodnessBalance += 35;
          keyBenefics.push(`Jupiter on ${ang}`);
          pros.push(`✦ Jupiter on ${ang} (${orbStr}): Expansive luck, exceptional benevolence, educational opportunities, and rapid worldly advancement.`);
        } else if (pId === 'sun') {
          goodnessBalance += 25;
          keyBenefics.push(`Sun on ${ang}`);
          pros.push(`✦ Sun on ${ang} (${orbStr}): High visibility, radiant health, natural executive leadership, and deep sense of core purpose.`);
        } else if (pId === 'ceres') {
          goodnessBalance += 18;
          keyBenefics.push(`Ceres on ${ang}`);
          pros.push(`✦ Ceres on ${ang} (${orbStr}): Profound nurturance, physical restoration, abundant nutrition, and feelings of maternal safety.`);
        } else if (pId === 'juno') {
          goodnessBalance += 18;
          keyBenefics.push(`Juno on ${ang}`);
          pros.push(`✦ Juno on ${ang} (${orbStr}): Auspicious soulmate encounters, reciprocal commitment, and marital equality.`);
        } else if (pId === 'fortune') {
          goodnessBalance += 20;
          keyBenefics.push(`Part of Fortune on ${ang}`);
          pros.push(`✦ Part of Fortune on ${ang} (${orbStr}): Serendipitous opportunities, material prosperity, and innate flow.`);
        } else if (pId === 'saturn') {
          goodnessBalance -= 28;
          keyMalefics.push(`Saturn on ${ang}`);
          cons.push(`⚠️ Saturn on ${ang} (${orbStr}): Heavy burdens of duty, potential loneliness, administrative delays, and austere pressure.`);
        } else if (pId === 'mars') {
          goodnessBalance -= 22;
          keyMalefics.push(`Mars on ${ang}`);
          cons.push(`⚠️ Mars on ${ang} (${orbStr}): High interpersonal friction, burnout risks, impulsiveness, and acute competition.`);
        } else if (pId === 'pluto') {
          goodnessBalance -= 20;
          keyMalefics.push(`Pluto on ${ang}`);
          cons.push(`⚠️ Pluto on ${ang} (${orbStr}): Intense psychological catharsis, power dynamics, and disruptive crisis/rebirth cycles.`);
        } else if (pId === 'lilith') {
          goodnessBalance -= 12;
          keyMalefics.push(`Lilith on ${ang}`);
          cons.push(`⚠️ Lilith on ${ang} (${orbStr}): Uncompromising raw rebellion, ostracization risks, and taboo friction.`);
        } else if (pId === 'uranus') {
          goodnessBalance += 5;
          pros.push(`✦ Uranus on ${ang} (${orbStr}): Brilliant breakthroughs, radical personal liberation, and sudden innovative leaps.`);
          cons.push(`⚠️ Uranus on ${ang} (${orbStr}): High unpredictability, restless nervous energy, and unstable living arrangements.`);
        } else if (pId === 'neptune') {
          goodnessBalance += 5;
          pros.push(`✦ Neptune on ${ang} (${orbStr}): Mystical creative inspiration, spiritual bliss, and artistic sensitivity.`);
          cons.push(`⚠️ Neptune on ${ang} (${orbStr}): Danger of illusions, fuzzy boundaries, lack of motivation, and deception.`);
        } else if (pId === 'mercury') {
          goodnessBalance += 15;
          pros.push(`✦ Mercury on ${ang} (${orbStr}): Rapid intellectual networking, prolific commerce, and mental dexterity.`);
        } else if (pId === 'moon') {
          goodnessBalance += 15;
          pros.push(`✦ Moon on ${ang} (${orbStr}): Deep emotional belonging, intuitive flow, and nourishing sanctuary.`);
        }
      }
    }
  }

  // Evaluate only actual line distances when a map location score is available.
  if (locationScore) {
    for (const inf of locationScore.topInfluences) {
      const pDef = PLANET_DEFINITIONS[inf.planetId];
      if (inf.distanceKm <= 350) {
        if (inf.polarity === 'harmonious') {
          goodnessBalance += 12;
          if (!pros.some((p) => p.includes(pDef.name))) {
            pros.push(`✦ ${pDef.name} ${inf.angle} Corridor (${inf.distanceKm} km): ${inf.summary}`);
          }
        } else if (inf.polarity === 'challenging') {
          goodnessBalance -= 12;
          if (!cons.some((c) => c.includes(pDef.name))) {
            cons.push(`⚠️ ${pDef.name} ${inf.angle} Corridor (${inf.distanceKm} km): ${inf.summary}`);
          }
        }
      }
    }
  }

  // Fallbacks if list is empty
  if (pros.length === 0) {
    pros.push('✦ Balanced Neutral Sanctuary: Free from dominating angular planetary stressors; offers a stable blank slate.');
  }
  if (cons.length === 0) {
    cons.push('✦ Minimal Astrological Obstacles: No severe malefic angular afflictions or acute friction corridors detected.');
  }

  // Final Grade and Status determination
  let grade: import('../types/astronomy').RelocationVerdictGrade = 'B';
  let status: import('../types/astronomy').RelocationVerdictStatus = 'balanced';
  let badgeLabel = 'Balanced & Productive Haven';
  let score = Math.max(15, Math.min(98, 50 + goodnessBalance));

  if (goodnessBalance >= 35) {
    grade = 'A+';
    status = 'exceptional';
    badgeLabel = 'Exceptional Benefic Haven';
  } else if (goodnessBalance >= 15) {
    grade = 'A';
    status = 'favorable';
    badgeLabel = 'Highly Favorable & Auspicious';
  } else if (goodnessBalance >= -10) {
    grade = 'B';
    status = 'balanced';
    badgeLabel = 'Balanced & Steady Relocation';
  } else if (goodnessBalance >= -28) {
    grade = 'C';
    status = 'mixed';
    badgeLabel = 'Mixed Influences / Caution Advised';
  } else {
    grade = 'D';
    status = 'challenging';
    badgeLabel = 'High Friction / Demanding Trials';
  }

  const summary =
    status === 'exceptional'
      ? `${relocation.targetCity.name} is a premier astrological power center! Benefic angular activations bestow exceptional fortune, personal ease, and recognition.`
      : status === 'favorable'
      ? `${relocation.targetCity.name} offers highly supportive, harmonious energies. Ideal for long-term residency, career progression, and peaceful living.`
      : status === 'balanced'
      ? `${relocation.targetCity.name} presents an adaptable, stable balance. Personal outcomes will be driven primarily by conscious intent rather than extreme cosmic pressure.`
      : status === 'mixed'
      ? `${relocation.targetCity.name} carries both dynamic rewards and notable frictions. Requires deliberate patience and stress management.`
      : `${relocation.targetCity.name} is a high-intensity astrological crucible with active malefic angular corridors. Demands strict boundary management and self-care.`;

  return {
    grade,
    status,
    badgeLabel,
    score,
    pros,
    cons,
    summary,
    keyBenefics,
    keyMalefics,
  };
}

function getHouseTheme(house: number): string {
  const themes = [
    'personal identity, bodily vitality, and self-assertion (1st House)',
    'income, financial self-worth, and material resources (2nd House)',
    'intellectual exchange, local community, and writing (3rd House)',
    'home sanctuary, emotional roots, and family security (4th House)',
    'creative self-expression, joy, and romantic passion (5th House)',
    'daily wellness, craft mastery, and professional service (6th House)',
    'one-on-one partnerships, marriage, and public diplomacy (7th House)',
    'shared financial wealth, intimacy, and psychological alchemy (8th House)',
    'higher wisdom, international horizons, and philosophy (9th House)',
    'career culmination, public reputation, and worldly authority (10th House)',
    'collective alliances, visionary hopes, and wide networks (11th House)',
    'spiritual retreat, dream sanctuary, and karmic renewal (12th House)',
  ];
  return themes[house - 1] || 'life evolution';
}
