import React, { useState, useEffect, useRef } from 'react';
import { CalculationMethod, CityData, Coordinates, LifeCategory, PlanetId } from '../types/astronomy';
import { ANGLE_DEFINITIONS, LIFE_CATEGORIES_META, PLANET_DEFINITIONS } from '../constants/celestialData';
import { WORLD_CITIES } from '../constants/worldCities';

interface LayerFilterBarProps {
  selectedPlanets: PlanetId[];
  onTogglePlanet: (planet: PlanetId) => void;
  onSelectAllPlanets: () => void;
  onClearPlanets: () => void;
  onSetPlanets: (planets: PlanetId[]) => void;
  selectedAngles: string[];
  onToggleAngle: (angle: string) => void;
  onSetAngles: (angles: string[]) => void;
  showParans: boolean;
  onToggleParans: () => void;
  showCrossings: boolean;
  onToggleCrossings: () => void;
  selectedCategory: LifeCategory | null;
  onSelectCategory: (cat: LifeCategory | null) => void;
  selectedPolarity: 'all' | 'harmonious' | 'challenging';
  onSelectPolarity: (polarity: 'all' | 'harmonious' | 'challenging') => void;
  onSelectCity: (city: CityData) => void;
  savedLocations: (CityData | Coordinates)[];
  onQuickLocate: (loc: CityData | Coordinates) => void;
  onOpenTopCities: () => void;
  calculationMethod?: CalculationMethod;
  onChangeCalculationMethod?: (method: CalculationMethod) => void;
  isRecalculating?: boolean;
  // New Aspect & Harmonics & Crossings/Parans Tools
  showConjunctions?: boolean;
  onToggleConjunctions?: () => void;
  showHarmoniousAspects?: boolean;
  onToggleHarmoniousAspects?: () => void;
  showDisharmoniousAspects?: boolean;
  onToggleDisharmoniousAspects?: () => void;
  activeHarmonics?: number[];
  onToggleHarmonic?: (harmonic: number) => void;
  onOpenCrossingsModal?: () => void;
  onOpenParansModal?: () => void;
  crossingsCount?: number;
  paransCount?: number;
  // Local Space, Star Parans, 3D Aspects, and Tutorial
  showLocalSpace?: boolean;
  onToggleLocalSpace?: () => void;
  showFixedStars?: boolean;
  onToggleFixedStars?: () => void;
  use3DAspects?: boolean;
  onToggle3DAspects?: () => void;
  onOpenTutorial?: () => void;
}

interface GeocodedResult {
  id: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
}

export const LayerFilterBar: React.FC<LayerFilterBarProps> = ({
  selectedPlanets,
  onTogglePlanet,
  onSelectAllPlanets,
  onClearPlanets,
  onSetPlanets,
  selectedAngles,
  onToggleAngle,
  onSetAngles,
  showParans,
  onToggleParans,
  showCrossings,
  onToggleCrossings,
  selectedCategory,
  onSelectCategory,
  selectedPolarity,
  onSelectPolarity,
  onSelectCity,
  savedLocations,
  onQuickLocate,
  onOpenTopCities,
  calculationMethod = 'in_mundo',
  onChangeCalculationMethod,
  isRecalculating = false,
  showConjunctions = true,
  onToggleConjunctions,
  showHarmoniousAspects = true,
  onToggleHarmoniousAspects,
  showDisharmoniousAspects = true,
  onToggleDisharmoniousAspects,
  activeHarmonics = [3, 4, 6],
  onToggleHarmonic,
  onOpenCrossingsModal,
  onOpenParansModal,
  crossingsCount = 0,
  paransCount = 0,
  showLocalSpace = false,
  onToggleLocalSpace,
  showFixedStars = false,
  onToggleFixedStars,
  use3DAspects = true,
  onToggle3DAspects,
  onOpenTutorial,
}) => {
  const [citySearch, setCitySearch] = useState('');
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [liveResults, setLiveResults] = useState<GeocodedResult[]>([]);
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);

  const allPlanetKeys = Object.keys(PLANET_DEFINITIONS) as PlanetId[];

  // Local instant matches
  const localMatches = citySearch.trim().length >= 2
    ? WORLD_CITIES.filter(
        (c) =>
          c.name.toLowerCase().includes(citySearch.toLowerCase()) ||
          c.country.toLowerCase().includes(citySearch.toLowerCase())
      ).slice(0, 5)
    : [];

  // Live OpenStreetMap Nominatim Geocoding
  useEffect(() => {
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }

    if (citySearch.trim().length < 3) {
      setLiveResults([]);
      setIsSearchingLive(false);
      return;
    }

    setIsSearchingLive(true);
    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            citySearch
          )}&limit=5&addressdetails=1`
        );
        if (res.ok) {
          const data = await res.json();
          const mapped: GeocodedResult[] = data.map((item: any, idx: number) => {
            const addr = item.address || {};
            const cityName =
              addr.city ||
              addr.town ||
              addr.village ||
              addr.municipality ||
              item.name ||
              item.display_name.split(',')[0];
            const country = addr.country || 'Global';
            const state = addr.state ? `, ${addr.state}` : '';

            return {
              id: `osm_${item.place_id || idx}`,
              name: `${cityName}${state}`,
              country,
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
              timezone: 'Local Time',
            };
          });
          setLiveResults(mapped);
        }
      } catch (err) {
        // Fallback silently to local matches
      } finally {
        setIsSearchingLive(false);
      }
    }, 450);

    return () => {
      if (searchTimeoutRef.current) window.clearTimeout(searchTimeoutRef.current);
    };
  }, [citySearch]);

  // Combine unique results
  const combinedResults: CityData[] = [
    ...localMatches,
    ...liveResults
      .filter((lr) => !localMatches.some((lm) => Math.hypot(lm.lat - lr.lat, lm.lng - lr.lng) < 0.2))
      .map((lr) => ({
        id: lr.id,
        name: lr.name,
        country: lr.country,
        lat: lr.lat,
        lng: lr.lng,
        timezone: lr.timezone,
        population: 0,
      })),
  ].slice(0, 7);

  // Quick Preset Handlers
  const handlePresetAll = () => {
    onSelectAllPlanets();
    onSetAngles(['MC', 'IC', 'ASC', 'DSC']);
  };

  const handlePresetBenefics = () => {
    onSetPlanets(['sun', 'venus', 'jupiter']);
    onSetAngles(['MC', 'ASC', 'DSC', 'IC']);
  };

  const handlePresetCareer = () => {
    onSetPlanets(['sun', 'jupiter', 'saturn', 'mars']);
    onSetAngles(['MC']);
  };

  const handlePresetLove = () => {
    onSetPlanets(['venus', 'moon', 'jupiter']);
    onSetAngles(['DSC', 'ASC']);
  };

  const handlePresetSanctuary = () => {
    onSetPlanets(['moon', 'venus', 'jupiter']);
    onSetAngles(['IC']);
  };

  return (
    <div
      id="layer-filter-bar"
      className="absolute top-4 left-4 z-30 flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] xl:max-w-[1400px] pointer-events-auto select-none"
    >
      {/* City Search Bar & Action Buttons Unified Container */}
      <div className="relative w-full">
        <div className="flex flex-wrap items-center gap-2 p-2 sm:p-2.5 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl shadow-slate-950/70 w-full">
          {/* Search Input Pill */}
          <div className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800 focus-within:border-slate-600 w-full sm:w-56 md:w-64 shrink-0 transition">
            <span className="text-slate-400 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Search town or city..."
              value={citySearch}
              onChange={(e) => setCitySearch(e.target.value)}
              className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            {isSearchingLive && (
              <span className="text-[10px] text-violet-400 animate-pulse font-mono shrink-0">Searching...</span>
            )}
            {citySearch && (
              <button
                onClick={() => setCitySearch('')}
                className="text-slate-400 hover:text-white text-xs pr-0.5 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Subtle Vertical Divider */}
          <div className="hidden sm:block h-6 w-px bg-slate-800 shrink-0" />

          {/* Action Toolbar Cluster (All completely contained within the grey container) */}
          <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
            {/* Top Cities List Trigger */}
            <button
              id="btn-open-top-cities"
              onClick={onOpenTopCities}
              className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/40 transition shrink-0 flex items-center gap-1 cursor-pointer shadow-xs"
              title="Open ranked Top Cities for your chart"
            >
              <span>✦ Top Cities</span>
            </button>

            {/* Quick Harmonious Aspects Toggle */}
            {onToggleHarmoniousAspects && (
              <button
                onClick={onToggleHarmoniousAspects}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition shrink-0 flex items-center gap-1 cursor-pointer ${
                  showHarmoniousAspects
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 border-slate-700'
                }`}
                title="Toggle Harmonious Aspect Lines (Trines 120° & Sextiles 60°)"
              >
                <span className={showHarmoniousAspects ? 'text-emerald-400 font-bold' : ''}>
                  {showHarmoniousAspects ? '✓' : '+'}
                </span>
                <span>Harmonious</span>
              </button>
            )}

            {/* Quick Disharmonious Aspects Toggle */}
            {onToggleDisharmoniousAspects && (
              <button
                onClick={onToggleDisharmoniousAspects}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition shrink-0 flex items-center gap-1 cursor-pointer ${
                  showDisharmoniousAspects
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-xs'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 border-slate-700'
                }`}
                title="Toggle Disharmonious Aspect Lines (Squares 90° & Semi-Squares 45°)"
              >
                <span className={showDisharmoniousAspects ? 'text-rose-400 font-bold' : ''}>
                  {showDisharmoniousAspects ? '✓' : '+'}
                </span>
                <span>Disharmonious</span>
              </button>
            )}

            {/* Comprehensive Crossings Tool Launcher */}
            {onOpenCrossingsModal && (
              <button
                onClick={onOpenCrossingsModal}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 transition shrink-0 flex items-center gap-1 cursor-pointer shadow-xs"
                title="Open Comprehensive Crossings & Intersection Tools"
              >
                <span>✕ Crossings</span>
                {crossingsCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 bg-purple-500/40 rounded-full font-mono">
                    {crossingsCount}
                  </span>
                )}
              </button>
            )}

            {/* Advanced Parans Tool Launcher */}
            {onOpenParansModal && (
              <button
                onClick={onOpenParansModal}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition shrink-0 flex items-center gap-1 cursor-pointer shadow-xs"
                title="Open Advanced Paran Options (Paranatellonta)"
              >
                <span>≡ Parans</span>
                {paransCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/40 rounded-full font-mono">
                    {paransCount}
                  </span>
                )}
              </button>
            )}

            {/* Local Space Lines Toggle */}
            {onToggleLocalSpace && (
              <button
                onClick={onToggleLocalSpace}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition shrink-0 flex items-center gap-1 cursor-pointer shadow-xs ${
                  showLocalSpace
                    ? 'bg-violet-500/25 text-violet-300 border-violet-500/50 shadow-xs'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 border-slate-700'
                }`}
                title="Toggle Local Space Lines (Horizon Coordinate Great Circle Bearings from Origin)"
              >
                <span>🧭 Local Space</span>
              </button>
            )}

            {/* Bernadette Brady Star Parans Toggle */}
            {onToggleFixedStars && (
              <button
                onClick={onToggleFixedStars}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition shrink-0 flex items-center gap-1 cursor-pointer shadow-xs ${
                  showFixedStars
                    ? 'bg-fuchsia-500/25 text-fuchsia-300 border-fuchsia-500/50 shadow-xs'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 border-slate-700'
                }`}
                title="Toggle Bernadette Brady Star Parans (Sirius, Regulus, Antares, Algol, etc.)"
              >
                <span>★ Star Parans</span>
              </button>
            )}

            {/* 3D Off-the-Ecliptic Aspects Toggle */}
            {onToggle3DAspects && (
              <button
                onClick={onToggle3DAspects}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition shrink-0 flex items-center gap-1 cursor-pointer shadow-xs ${
                  use3DAspects
                    ? 'bg-cyan-500/25 text-cyan-300 border-cyan-500/50 shadow-xs'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 border-slate-700'
                }`}
                title="Toggle 3D Off-the-Ecliptic Aspect correction (Spherical distance using celestial latitude)"
              >
                <span>🌐 3D Aspects</span>
              </button>
            )}

            {/* Lines Filter Drawer Toggle */}
            <button
              id="btn-toggle-filter-panel"
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-medium border transition shrink-0 cursor-pointer shadow-xs ${
                isFilterExpanded
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              Filters ({selectedPlanets.length}) {selectedPlanets.length < allPlanetKeys.length || selectedAngles.length < 4 ? '•' : ''}
            </button>

            {/* Tutorial & Beginner's Manual Button */}
            {onOpenTutorial && (
              <button
                id="btn-filter-open-tutorial"
                onClick={onOpenTutorial}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-violet-500/10 hover:bg-violet-500/25 text-violet-300 border border-violet-500/40 transition shrink-0 flex items-center gap-1 cursor-pointer shadow-xs"
                title="Open Complete Beginner's Manual and Tutorial Guide"
              >
                <span>📖 Tutorial</span>
              </button>
            )}
          </div>
        </div>

        {/* Dynamic City Search Dropdown */}
        {citySearch.trim().length >= 2 && combinedResults.length > 0 && (
          <div className="absolute top-full left-0 mt-2 w-full sm:w-80 bg-slate-950/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl z-40 overflow-hidden max-h-64 overflow-y-auto">
            {combinedResults.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onSelectCity(c);
                  setCitySearch('');
                }}
                className="w-full px-3.5 py-2 text-left text-xs hover:bg-slate-800/80 flex items-center justify-between border-b border-slate-800/80 last:border-0 text-slate-200 cursor-pointer transition"
              >
                <div>
                  <span className="font-semibold text-white block">{c.name}</span>
                  <span className="text-[10px] text-slate-400">{c.country}</span>
                </div>
                <span className="text-[10px] font-mono text-violet-400/80">
                  {c.lat.toFixed(2)}°, {c.lng.toFixed(2)}°
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Saved Locations Bar */}
      {savedLocations.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
          <span className="text-[10px] font-mono uppercase text-violet-400 shrink-0">Saved:</span>
          {savedLocations.map((loc, idx) => {
            const label = 'name' in loc ? (loc as CityData).name : `${loc.lat.toFixed(1)}°, ${loc.lng.toFixed(1)}°`;
            return (
              <button
                key={`fav_${idx}`}
                onClick={() => onQuickLocate(loc)}
                className="px-2 py-0.5 rounded-md bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 hover:text-white shrink-0 transition cursor-pointer"
              >
                ★ {label}
              </button>
            );
          })}
        </div>
      )}

      {/* Expanded Line Controls & Feature Toggles */}
      {isFilterExpanded && (
        <div className="p-4 rounded-xl bg-slate-950/95 backdrop-blur-md border border-slate-800 shadow-2xl space-y-3.5 text-xs max-h-[80vh] overflow-y-auto">
          {/* Projection Calculation Method: In Mundo vs In Zodiaco */}
          {onChangeCalculationMethod && (
            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono uppercase text-[10px] text-slate-300 font-semibold tracking-wider flex items-center gap-1.5">
                  <span className="text-violet-400">✦</span> Calculation Engine: Mundo vs Zodiaco
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {calculationMethod === 'in_zodiaco' ? 'Relocated Cusps (Zodico)' : 'Jim Lewis Sky (Mundo)'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isRecalculating}
                  onClick={() => onChangeCalculationMethod('in_mundo')}
                  className={`px-2.5 py-2 rounded-lg text-left border transition cursor-pointer ${
                    calculationMethod === 'in_mundo'
                      ? 'bg-violet-500/20 border-violet-500/50 text-violet-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  } ${isRecalculating && calculationMethod === 'in_mundo' ? 'animate-pulse' : ''}`}
                >
                  <div className="font-semibold text-xs flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {isRecalculating && calculationMethod === 'in_mundo' ? (
                        <span className="animate-spin text-violet-400 text-[10px] inline-block">◌</span>
                      ) : (
                        <span>☉</span>
                      )}
                      <span>In Mundo</span>
                    </div>
                    {calculationMethod === 'in_mundo' && !isRecalculating && <span className="text-[10px] text-violet-400">✓</span>}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                    Jim Lewis classic: 3D sky position (actual physical rising & culmination)
                  </p>
                </button>
                <button
                  type="button"
                  disabled={isRecalculating}
                  onClick={() => onChangeCalculationMethod('in_zodiaco')}
                  className={`px-2.5 py-2 rounded-lg text-left border transition cursor-pointer ${
                    calculationMethod === 'in_zodiaco'
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  } ${isRecalculating && calculationMethod === 'in_zodiaco' ? 'animate-pulse' : ''}`}
                >
                  <div className="font-semibold text-xs flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {isRecalculating && calculationMethod === 'in_zodiaco' ? (
                        <span className="animate-spin text-cyan-400 text-[10px] inline-block">◌</span>
                      ) : (
                        <span>♈</span>
                      )}
                      <span>In Zodiaco</span>
                    </div>
                    {calculationMethod === 'in_zodiaco' && !isRecalculating && <span className="text-[10px] text-cyan-400">✓</span>}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                    Ecliptic projection: matches relocated chart angles 1:1 (Astro-Seek standard)
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Quick Presets */}
          <div>
            <span className="block font-mono uppercase text-[10px] text-slate-400 tracking-wider mb-1.5">
              Quick Line Presets
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={handlePresetAll}
                className="px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
              >
                All Lines
              </button>
              <button
                onClick={handlePresetBenefics}
                className="px-2 py-1 rounded-md bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 text-violet-300 text-xs font-medium cursor-pointer"
              >
                Benefics (☉ ♀ ♃)
              </button>
              <button
                onClick={handlePresetCareer}
                className="px-2 py-1 rounded-md bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-300 text-xs font-medium cursor-pointer"
              >
                Career (MC)
              </button>
              <button
                onClick={handlePresetLove}
                className="px-2 py-1 rounded-md bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-300 text-xs font-medium cursor-pointer"
              >
                Love (DSC)
              </button>
              <button
                onClick={handlePresetSanctuary}
                className="px-2 py-1 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-medium cursor-pointer"
              >
                Sanctuary (IC)
              </button>
              <button
                onClick={onClearPlanets}
                className="px-2 py-1 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Planetary Power Lines Toggle */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono uppercase text-[10px] text-slate-400 tracking-wider">
                Planetary Bodies ({selectedPlanets.length}/{allPlanetKeys.length})
              </span>
              <div className="flex gap-2 text-[11px]">
                <button onClick={onSelectAllPlanets} className="text-violet-400 hover:underline cursor-pointer">
                  All
                </button>
                <span className="text-slate-600">|</span>
                <button onClick={onClearPlanets} className="text-slate-400 hover:underline cursor-pointer">
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {allPlanetKeys.map((pId) => {
                const pDef = PLANET_DEFINITIONS[pId];
                const isSelected = selectedPlanets.includes(pId);

                return (
                  <button
                    key={pId}
                    onClick={() => onTogglePlanet(pId)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-800 text-white border-slate-600 shadow-sm'
                        : 'bg-slate-900/60 text-slate-500 border-slate-900 hover:text-slate-300'
                    }`}
                  >
                    <span style={{ color: isSelected ? pDef.color : '#64748b' }}>{pDef.symbol}</span>
                    <span className="truncate">{pDef.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Angular Meridian & Horizon Axes (MC, IC, ASC, DSC) */}
          <div>
            <span className="block font-mono uppercase text-[10px] text-slate-400 tracking-wider mb-2">
              Angular Cardinal Axes
            </span>
            <div className="grid grid-cols-4 gap-1.5">
              {(['MC', 'IC', 'ASC', 'DSC'] as const).map((ang) => {
                const angMeta = ANGLE_DEFINITIONS[ang];
                const isSelected = selectedAngles.includes(ang);

                return (
                  <button
                    key={ang}
                    onClick={() => onToggleAngle(ang)}
                    className={`px-2 py-2 rounded-lg text-xs font-mono font-bold text-center border transition cursor-pointer ${
                      isSelected
                        ? `${angMeta.badgeColor} shadow-md`
                        : 'bg-slate-900/60 text-slate-500 border-slate-900 hover:text-slate-300'
                    }`}
                  >
                    <div>{ang}</div>
                    <div className="text-[9px] font-normal opacity-80 mt-0.5">
                      {ang === 'MC' ? 'Career' : ang === 'IC' ? 'Home' : ang === 'ASC' ? 'Self' : 'Partners'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Planetary Aspects & Custom Harmonics Section */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono uppercase text-[10px] text-slate-300 font-semibold tracking-wider flex items-center gap-1.5">
                <span className="text-cyan-400">✦</span> Planetary Aspects & Custom Harmonics
              </span>
              <span className="text-[10px] text-slate-400">Harmonics & Orbs</span>
            </div>

            {/* Conjunction, Harmonious & Disharmonious Toggles */}
            <div className="grid grid-cols-3 gap-1.5">
              {onToggleConjunctions && (
                <button
                  type="button"
                  onClick={onToggleConjunctions}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-left transition cursor-pointer ${
                    showConjunctions
                      ? 'bg-violet-500/20 border-violet-500/50 text-violet-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>Conjunctions</span>
                    <span className="text-[10px]">{showConjunctions ? 'ON' : 'OFF'}</span>
                  </div>
                  <div className="text-[9px] opacity-75 mt-0.5">0° Primary Angles</div>
                </button>
              )}

              {onToggleHarmoniousAspects && (
                <button
                  type="button"
                  onClick={onToggleHarmoniousAspects}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-left transition cursor-pointer ${
                    showHarmoniousAspects
                      ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>Harmonious</span>
                    <span className="text-[10px]">{showHarmoniousAspects ? 'ON' : 'OFF'}</span>
                  </div>
                  <div className="text-[9px] opacity-75 mt-0.5">120° Trine / 60° Sext</div>
                </button>
              )}

              {onToggleDisharmoniousAspects && (
                <button
                  type="button"
                  onClick={onToggleDisharmoniousAspects}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border text-left transition cursor-pointer ${
                    showDisharmoniousAspects
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="font-bold flex items-center justify-between">
                    <span>Disharmonious</span>
                    <span className="text-[10px]">{showDisharmoniousAspects ? 'ON' : 'OFF'}</span>
                  </div>
                  <div className="text-[9px] opacity-75 mt-0.5">90° Sq / 45° Semi-sq</div>
                </button>
              )}
            </div>

            {/* Custom Harmonics Grid */}
            {onToggleHarmonic && (
              <div>
                <span className="block font-mono text-[9px] text-slate-400 uppercase tracking-wider mb-1">
                  Active Harmonic Overtones:
                </span>
                <div className="flex flex-wrap gap-1">
                  {[
                    { h: 3, label: 'H3 (Trine 120°)', color: 'text-emerald-400' },
                    { h: 4, label: 'H4 (Square 90°)', color: 'text-rose-400' },
                    { h: 5, label: 'H5 (Quintile 72°)', color: 'text-cyan-400' },
                    { h: 6, label: 'H6 (Sextile 60°)', color: 'text-emerald-400' },
                    { h: 7, label: 'H7 (Septile 51.4°)', color: 'text-purple-400' },
                    { h: 8, label: 'H8 (Octile 45°)', color: 'text-rose-400' },
                    { h: 9, label: 'H9 (Novile 40°)', color: 'text-violet-400' },
                  ].map((harmonicItem) => {
                    const isActive = activeHarmonics.includes(harmonicItem.h);
                    return (
                      <button
                        key={harmonicItem.h}
                        type="button"
                        onClick={() => onToggleHarmonic(harmonicItem.h)}
                        className={`px-2 py-1 rounded-md text-[10px] font-mono border transition cursor-pointer ${
                          isActive
                            ? 'bg-slate-800 border-slate-600 text-white shadow-sm'
                            : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <span className={isActive ? harmonicItem.color : ''}>{harmonicItem.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Dedicated Intersection & Parans Tools */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2">
            <span className="block font-mono uppercase text-[10px] text-slate-300 font-semibold tracking-wider flex items-center gap-1.5">
              <span className="text-purple-400">✦</span> Advanced Intersection & Paran Suites
            </span>
            <div className="grid grid-cols-2 gap-2">
              {onOpenCrossingsModal ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsFilterExpanded(false);
                    onOpenCrossingsModal();
                  }}
                  className="p-2.5 rounded-lg bg-purple-950/40 hover:bg-purple-950/70 border border-purple-500/40 text-left transition cursor-pointer"
                >
                  <div className="font-semibold text-xs text-purple-300 flex items-center justify-between">
                    <span>✕ Crossings Atlas</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-purple-500/30">
                      {crossingsCount} Nodes
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                    Search and jump to global power vortexes where planetary lines intersect.
                  </p>
                </button>
              ) : null}

              {onOpenParansModal ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsFilterExpanded(false);
                    onOpenParansModal();
                  }}
                  className="p-2.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-500/40 text-left transition cursor-pointer"
                >
                  <div className="font-semibold text-xs text-emerald-300 flex items-center justify-between">
                    <span>≡ Parans Atlas</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-emerald-500/30">
                      {paransCount} Bands
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                    Explore Brady & Lewis Paranatellonta latitude resonance circles.
                  </p>
                </button>
              ) : null}
            </div>
          </div>

          {/* Specialized Lines: Parans & Crossings */}
          <div className="pt-2 border-t border-slate-800/80">
            <span className="block font-mono uppercase text-[10px] text-slate-400 tracking-wider mb-2">
              Crossings & Latitude Alignments
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onToggleParans}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center justify-between cursor-pointer ${
                  showParans
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 shadow-sm'
                    : 'bg-slate-900/60 text-slate-500 border-slate-900 hover:text-slate-300'
                }`}
              >
                <span>Paran Latitudes</span>
                <span className="font-mono text-[10px]">{showParans ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={onToggleCrossings}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition flex items-center justify-between cursor-pointer ${
                  showCrossings
                    ? 'bg-violet-950/60 text-violet-300 border-violet-500/40 shadow-sm'
                    : 'bg-slate-900/60 text-slate-500 border-slate-900 hover:text-slate-300'
                }`}
              >
                <span>Zenith Crossings</span>
                <span className="font-mono text-[10px]">{showCrossings ? 'ON' : 'OFF'}</span>
              </button>
            </div>
          </div>

          {/* Life Themes Isolation */}
          <div className="pt-2 border-t border-slate-800/80">
            <span className="block font-mono uppercase text-[10px] text-slate-400 tracking-wider mb-2">
              Filter by Life Theme
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onSelectCategory(null)}
                className={`px-2.5 py-1 rounded-md text-xs border transition cursor-pointer ${
                  selectedCategory === null
                    ? 'bg-violet-500 text-slate-950 font-bold border-violet-500'
                    : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                All Themes
              </button>
              {(Object.keys(LIFE_CATEGORIES_META) as LifeCategory[]).map((cat) => (
                <button
                  key={cat}
                  onClick={() => onSelectCategory(selectedCategory === cat ? null : cat)}
                  className={`px-2.5 py-1 rounded-md text-xs border transition cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-violet-500/20 text-violet-300 border-violet-500/40 font-semibold'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {LIFE_CATEGORIES_META[cat].label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
