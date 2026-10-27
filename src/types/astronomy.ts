export type PlanetId =
  | 'sun'
  | 'moon'
  | 'mercury'
  | 'venus'
  | 'mars'
  | 'jupiter'
  | 'saturn'
  | 'uranus'
  | 'neptune'
  | 'pluto'
  | 'chiron'
  | 'north_node'
  | 'south_node'
  | 'lilith'
  | 'fortune'
  | 'ceres'
  | 'pallas'
  | 'juno'
  | 'vesta';

export type AngleType = 'MC' | 'IC' | 'ASC' | 'DSC';

export type CalculationMethod = 'in_mundo' | 'in_zodiaco';

export type ZodiacSign =
  | 'Aries'
  | 'Taurus'
  | 'Gemini'
  | 'Cancer'
  | 'Leo'
  | 'Virgo'
  | 'Libra'
  | 'Scorpio'
  | 'Sagittarius'
  | 'Capricorn'
  | 'Aquarius'
  | 'Pisces';

export type LifeCategory =
  | 'career'
  | 'relationships'
  | 'creativity'
  | 'spirituality'
  | 'growth'
  | 'stability'
  | 'finances'
  | 'family'
  | 'travel'
  | 'community'
  | 'health'
  | 'purpose';

export type InfluencePolarity = 'harmonious' | 'neutral' | 'challenging' | 'intense';

export interface PlanetDefinition {
  id: PlanetId;
  name: string;
  symbol: string;
  color: string;
  secondaryColor: string;
  nature: 'benefic' | 'malefic' | 'neutral' | 'luminary' | 'transpersonal' | 'point';
  archetype: string;
  keywords: string[];
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface CityData {
  id: string;
  name: string;
  country: string;
  adminCode?: string;
  lat: number;
  lng: number;
  timezone: string;
  population?: number;
}

export interface BirthData {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  cityName: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string; // e.g. "UTC-5", "Europe/London", "America/New_York"
  timezoneOffsetHours: number; // UTC offset in hours
}

export interface PlanetPosition {
  planetId: PlanetId;
  name: string;
  symbol: string;
  longitude: number; // 0 to 360 ecliptic longitude
  latitude: number; // celestial latitude
  declination: number; // celestial declination
  rightAscension: number; // RA in degrees
  distanceAU: number;
  speed: number;
  sign: ZodiacSign;
  degreeInSign: number;
  minuteInSign: number;
  isRetrograde: boolean;
  house: number; // 1 to 12
}

export interface ChartAngles {
  ascendant: number;
  midheaven: number;
  descendant: number;
  imumCoeli: number;
  houses: number[]; // 12 house cusp longitudes (1-indexed)
}

export interface AstrologicalAspect {
  planet1: PlanetId;
  planet2: PlanetId;
  aspectType: 'conjunction' | 'sextile' | 'square' | 'trine' | 'opposition';
  orb: number;
  angle: number;
  isHarmonious: boolean;
}

export interface AstrocartographyLinePoint {
  lat: number;
  lng: number;
}

export type AspectLineType =
  | 'conjunction'
  | 'trine'
  | 'sextile'
  | 'square'
  | 'opposition'
  | 'quintile'
  | 'semi-square'
  | 'sesquiquadrate'
  | 'septile'
  | 'novile';

export interface AstrocartographyLine {
  id: string;
  planetId: PlanetId;
  angle: AngleType;
  color: string;
  points: AstrocartographyLinePoint[];
  description: string;
  polarity: InfluencePolarity;
  chartOwner?: 'primary' | 'secondary' | 'transit';
  isTransit?: boolean;
  method?: CalculationMethod;
  // Aspect Lines & Harmonics
  isAspectLine?: boolean;
  aspectType?: AspectLineType;
  aspectAngleDeg?: number; // e.g. 60, 90, 120, 72, 45, etc.
  baseAngle?: AngleType;   // e.g. 'MC' or 'ASC'
  harmonic?: number;       // e.g. 1, 2, 3, 4, 5, 6, 7, 8, 9
}

export interface TransitTrigger {
  id: string;
  transitPlanet: PlanetId;
  transitAngle: AngleType;
  natalPlanet: PlanetId;
  natalAngle: AngleType;
  lat: number;
  lng: number;
  nearestCity?: string;
  description: string;
  intensity: number;
}

export interface ParanLine {
  id: string;
  latitude: number; // Terrestrial latitude
  planet1: PlanetId;
  angle1: AngleType;
  planet2: PlanetId;
  angle2: AngleType;
  title: string;
  interpretation: string;
  categories: LifeCategory[];
  polarity: InfluencePolarity;
}

export interface PlanetaryCrossing {
  id: string;
  lat: number;
  lng: number;
  planet1: PlanetId;
  angle1: AngleType;
  aspectType1?: AspectLineType;
  planet2: PlanetId;
  angle2: AngleType;
  aspectType2?: AspectLineType;
  nearestCity?: string;
  distanceToNearestCityKm?: number;
  country?: string;
  polarity: InfluencePolarity;
  summary: string;
  distanceToLine1Km?: number;
  distanceToLine2Km?: number;
  isHarmonious?: boolean;
  theme?: 'career' | 'love' | 'wealth' | 'transformation' | 'spirituality' | 'creativity';
}

export interface LocationScore {
  overallScore: number; // 0 to 100
  categories: Record<LifeCategory, number>; // 0 to 100
  topInfluences: {
    planetId: PlanetId;
    angle: AngleType;
    distanceKm: number;
    intensity: number; // 0 to 100
    polarity: InfluencePolarity;
    summary: string;
    isAspectLine?: boolean;
    aspectType?: AspectLineType;
    harmonic?: number;
  }[];
  activeParans: ParanLine[];
  nearbyCrossings: PlanetaryCrossing[];
}

export interface RelocationComparison {
  targetCity: CityData;
  natalAngles: ChartAngles;
  relocatedAngles: ChartAngles;
  natalPositions: PlanetPosition[];
  relocatedPositions: PlanetPosition[];
  significantShifts: {
    planetId: PlanetId;
    natalHouse: number;
    relocatedHouse: number;
    angularProximityDeg?: number;
    angularType?: AngleType;
    interpretation: string;
  }[];
  verdict?: RelocationVerdict;
}

export type RelocationVerdictGrade = 'A+' | 'A' | 'B' | 'C' | 'D';
export type RelocationVerdictStatus =
  | 'exceptional'
  | 'favorable'
  | 'balanced'
  | 'mixed'
  | 'challenging';

export interface RelocationVerdict {
  grade: RelocationVerdictGrade;
  status: RelocationVerdictStatus;
  badgeLabel: string;
  score: number; // 0 to 100
  pros: string[];
  cons: string[];
  summary: string;
  keyBenefics: string[];
  keyMalefics: string[];
}

export interface FixedStar {
  id: string;
  name: string;
  traditionalName: string;
  constellation: string;
  spectralType: string;
  magnitude: number;
  rightAscensionDeg: number;
  declinationDeg: number;
  eclipticLongitudeDeg: number;
  eclipticLatitudeDeg: number;
  nature: string;
  keywords: string[];
  mythology: string;
  bradyTheme: string;
  heliacalMeaning: string;
}

export interface StarParanLine {
  id: string;
  starId: string;
  starName: string;
  starConstellation: string;
  latitude: number;
  planetId: PlanetId;
  planetAngle: AngleType;
  starAngle: AngleType;
  title: string;
  interpretation: string;
  bradyCategory: 'youth' | 'prime' | 'culmination' | 'underworld' | 'general';
  polarity: InfluencePolarity;
  magnitude: number;
}

export interface LocalSpaceLine {
  id: string;
  planetId: PlanetId;
  planetName: string;
  symbol: string;
  color: string;
  azimuthDeg: number; // 0° = North, 90° = East, 180° = South, 270° = West
  compassHeading: string;
  altitudeDeg: number;
  originCoordinates: Coordinates;
  originCityName?: string;
  points: AstrocartographyLinePoint[];
  description: string;
}

export type GlobeViewMode =
  | 'astronomy'
  | 'dark'
  | 'light'
  | 'terrain'
  | 'flat_map'
  | 'lines_only'
  | 'crossings_focus'
  | 'heatmap'
  | 'combined';

export type ProjectionMode = '3d_globe' | '2d_flat';
