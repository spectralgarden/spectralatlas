import React, { useState, useMemo, useEffect } from 'react';
import {
  AstrologicalAspect,
  AstrocartographyLine,
  BirthData,
  CalculationMethod,
  ChartAngles,
  CityData,
  Coordinates,
  GlobeViewMode,
  LifeCategory,
  LocationScore,
  ParanLine,
  PlanetaryCrossing,
  PlanetId,
  PlanetPosition,
  RelocationComparison,
  TransitTrigger,
} from './types/astronomy';
import { calculateAstrocartography, calculateTransits } from './engine/astronomyEngine';
import { calculateLocationScore, generateRelocationComparison } from './engine/locationScoring';
import { WORLD_CITIES } from './constants/worldCities';
import { PLANET_DEFINITIONS } from './constants/celestialData';

import { HeaderNav } from './components/HeaderNav';
import { RealLeafletMapView } from './components/RealLeafletMapView';
import { TopCitiesDrawer } from './components/TopCitiesDrawer';
import { LayerFilterBar } from './components/LayerFilterBar';
import { ChartWheel } from './components/ChartWheel';
import { LocationInspectorModal } from './components/LocationInspectorModal';
import { BirthInputModal } from './components/BirthInputModal';
import { ExportReportModal } from './components/ExportReportModal';
import { TransitControlBar } from './components/TransitControlBar';
import { RelocationModal } from './components/RelocationModal';
import { CrossingsExplorerModal } from './components/CrossingsExplorerModal';
import { ParansExplorerModal } from './components/ParansExplorerModal';
import { CalculationLoadingDialog } from './components/CalculationLoadingDialog';
import { TutorialModal } from './components/TutorialModal';
import { calculateLocalSpaceLines } from './engine/localSpaceEngine';
import { calculateStarParans } from './engine/fixedStarsEngine';

// Helper to retrieve saved profiles without legacy dummy profiles
function getInitialProfiles(): BirthData[] {
  try {
    const saved = localStorage.getItem('spectral_atlas_profiles');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const filtered = parsed.filter(
          (p) =>
            p &&
            typeof p === 'object' &&
            p.id !== 'profile_helena_primary' &&
            p.id !== 'profile_julian_secondary' &&
            p.name !== 'Helena Vance' &&
            p.name !== 'Julian Drake' &&
            p.name !== 'Astral Chart (Sample)'
        );
        return filtered;
      }
    }
  } catch (e) {
    // fallback
  }
  return [];
}

export default function App() {
  // Profiles State & Persistence
  const [savedProfiles, setSavedProfiles] = useState<BirthData[]>(getInitialProfiles);

  const [activeProfile, setActiveProfile] = useState<BirthData | null>(() => {
    const initial = getInitialProfiles();
    return initial[0] || null;
  });

  const [secondaryProfile, setSecondaryProfile] = useState<BirthData | null>(() => {
    const initial = getInitialProfiles();
    return initial[1] || null;
  });

  const [isDualChartActive, setIsDualChartActive] = useState(false);

  // View Mode
  const [viewMode, setViewMode] = useState<GlobeViewMode>('dark');

  // Selected Location / Destination
  const [selectedCity, setSelectedCity] = useState<CityData | null>(() => {
    const initial = getInitialProfiles();
    if (initial[0]) {
      return {
        id: `birth_${initial[0].id}`,
        name: initial[0].cityName,
        country: initial[0].country,
        lat: initial[0].lat,
        lng: initial[0].lng,
        timezone: initial[0].timezone,
        population: 0,
      };
    }
    return null;
  });

  const [activeLocation, setActiveLocation] = useState<Coordinates | null>(() => {
    const initial = getInitialProfiles();
    if (initial[0]) {
      return { lat: initial[0].lat, lng: initial[0].lng };
    }
    return null;
  });

  const [radiusKm, setRadiusKm] = useState<number>(350);

  // Selected Specific Line or Crossing (clicked on globe)
  const [selectedLine, setSelectedLine] = useState<AstrocartographyLine | null>(null);
  const [selectedCrossing, setSelectedCrossing] = useState<PlanetaryCrossing | null>(null);

  // Favorite / Starred Locations
  const [savedLocations, setSavedLocations] = useState<(CityData | Coordinates)[]>(() => {
    try {
      const saved = localStorage.getItem('spectral_atlas_favorites');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // fallback
    }
    return [];
  });

  // Relocation Destination Target
  const [relocationTarget, setRelocationTarget] = useState<(CityData | (Coordinates & { name?: string; country?: string })) | null>(() => {
    try {
      const saved = localStorage.getItem('spectral_atlas_relocation');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  // Modals & Panels - Starts open if user does not have a saved profile yet
  const [isBirthModalOpen, setIsBirthModalOpen] = useState(() => {
    return getInitialProfiles().length === 0;
  });
  const [isRelocationModalOpen, setIsRelocationModalOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isChartWheelOpen, setIsChartWheelOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isTopCitiesOpen, setIsTopCitiesOpen] = useState(false);

  // Filter States & Specialized Lines
  const allPlanetKeys = Object.keys(PLANET_DEFINITIONS) as PlanetId[];
  const [filteredPlanets, setFilteredPlanets] = useState<PlanetId[]>(allPlanetKeys);
  const [filteredAngles, setFilteredAngles] = useState<string[]>(['MC', 'IC', 'ASC', 'DSC']);
  const [showParans, setShowParans] = useState(true);
  const [showCrossings, setShowCrossings] = useState(true);
  const [filteredCategory, setFilteredCategory] = useState<LifeCategory | null>(null);
  const [filteredPolarity, setFilteredPolarity] = useState<'all' | 'harmonious' | 'challenging'>('all');

  // Aspect Lines & Custom Harmonics State
  const [showConjunctions, setShowConjunctions] = useState(true);
  const [showHarmoniousAspects, setShowHarmoniousAspects] = useState(true);
  const [showDisharmoniousAspects, setShowDisharmoniousAspects] = useState(true);
  const [activeHarmonics, setActiveHarmonics] = useState<number[]>([3, 4, 6]);
  const [use3DOffEclipticAspects, setUse3DOffEclipticAspects] = useState(false);

  // Local Space Lines & Bernadette Brady Star Parans
  const [showLocalSpace, setShowLocalSpace] = useState(false);
  const [showFixedStars, setShowFixedStars] = useState(false);

  // Beginner's Tutorial / User Manual Modal
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  // Comprehensive Crossings & Parans Modals & Active Highlights
  const [isCrossingsModalOpen, setIsCrossingsModalOpen] = useState(false);
  const [isParansModalOpen, setIsParansModalOpen] = useState(false);
  const [activeCrossing, setActiveCrossing] = useState<PlanetaryCrossing | null>(null);
  const [activeParan, setActiveParan] = useState<ParanLine | null>(null);

  const handleToggleHarmonic = (harmonic: number) => {
    setActiveHarmonics((prev) =>
      prev.includes(harmonic) ? prev.filter((h) => h !== harmonic) : [...prev, harmonic]
    );
  };

  // Calculation Method State: 'in_mundo' (Jim Lewis 3D Sky) vs 'in_zodiaco' (Zodico Relocated Cusps)
  const [calculationMethod, setCalculationMethod] = useState<CalculationMethod>(() => {
    try {
      const saved = localStorage.getItem('spectral_atlas_calc_method');
      if (saved === 'in_zodiaco' || saved === 'in_mundo') return saved;
    } catch (e) {}
    return 'in_mundo';
  });

  const [isSwitchingMethod, setIsSwitchingMethod] = useState(false);
  const [targetMethod, setTargetMethod] = useState<CalculationMethod | null>(null);

  const handleToggleCalculationMethod = (method: CalculationMethod) => {
    if (method === calculationMethod && !isSwitchingMethod) return;
    setIsSwitchingMethod(true);
    setTargetMethod(method);

    // Yield to let browser paint the animated loading dialog & spinners
    window.setTimeout(() => {
      setCalculationMethod(method);
      try {
        localStorage.setItem('spectral_atlas_calc_method', method);
      } catch (e) {}

      // Keep dialog visible smoothly while recalculating completes
      window.setTimeout(() => {
        setIsSwitchingMethod(false);
        setTargetMethod(null);
      }, 550);
    }, 50);
  };

  // Compute Primary Astrocartography Atlas
  const primaryAtlas = useMemo(() => {
    if (!activeProfile) {
      return {
        lines: [] as AstrocartographyLine[],
        parans: [] as ParanLine[],
        crossings: [] as PlanetaryCrossing[],
        natalPositions: [] as PlanetPosition[],
        natalAngles: {
          ascendant: 90,
          midheaven: 0,
          descendant: 270,
          imumCoeli: 180,
          houses: [90, 120, 150, 180, 210, 240, 270, 300, 330, 0, 30, 60],
        } as ChartAngles,
        aspects: [] as AstrologicalAspect[],
        gmst: 0,
        obliquity: 23.44,
        method: calculationMethod,
      };
    }
    return calculateAstrocartography(activeProfile, calculationMethod, {
      use3DOffEclipticAspects,
    });
  }, [activeProfile, calculationMethod, use3DOffEclipticAspects]);

  // Compute Local Space Lines (Horizon Coordinate Great Circle Bearings)
  const localSpaceLines = useMemo(() => {
    if (!activeProfile || !primaryAtlas || primaryAtlas.natalPositions.length === 0) return [];
    return calculateLocalSpaceLines(
      primaryAtlas.natalPositions,
      { lat: activeProfile.lat, lng: activeProfile.lng },
      primaryAtlas.gmst,
      activeProfile.cityName
    );
  }, [activeProfile, primaryAtlas]);

  // Compute Bernadette Brady Star Parans (Prominent Fixed Star Latitudes)
  const starParans = useMemo(() => {
    if (!primaryAtlas || primaryAtlas.natalPositions.length === 0) return [];
    return calculateStarParans(primaryAtlas.natalPositions);
  }, [primaryAtlas]);

  // Real-time Planetary Transits State
  const [showTransits, setShowTransits] = useState(false);
  const [transitDate, setTransitDate] = useState<Date>(() => new Date());

  // Compute Transiting Astrocartography
  const transitData = useMemo(() => {
    if (!showTransits || primaryAtlas.lines.length === 0) {
      return {
        transitingPositions: [],
        transitLines: [],
        transitTriggers: [] as TransitTrigger[],
      };
    }
    return calculateTransits(transitDate, primaryAtlas.lines, calculationMethod);
  }, [showTransits, transitDate, primaryAtlas.lines, calculationMethod]);

  // Compute Secondary Astrocartography Atlas (if dual chart mode is enabled)
  const secondaryAtlas = useMemo(() => {
    if (!isDualChartActive || !secondaryProfile) return null;
    return calculateAstrocartography(secondaryProfile, calculationMethod);
  }, [isDualChartActive, secondaryProfile, calculationMethod]);

  // Compute Location Scoring at active target location
  const locationScore: LocationScore | null = useMemo(() => {
    if (!activeLocation || primaryAtlas.lines.length === 0) return null;
    return calculateLocationScore(
      activeLocation,
      primaryAtlas.lines,
      primaryAtlas.parans,
      primaryAtlas.crossings,
      radiusKm
    );
  }, [activeLocation, primaryAtlas, radiusKm]);

  // Compute Relocation Comparison at active target location
  const relocationComparison: RelocationComparison | null = useMemo(() => {
    if (!activeLocation || !activeProfile || primaryAtlas.lines.length === 0) return null;
    const targetCityData: CityData = selectedCity || {
      id: 'custom_target',
      name: `Point (${activeLocation.lat.toFixed(1)}°, ${activeLocation.lng.toFixed(1)}°)`,
      country: 'Global',
      lat: activeLocation.lat,
      lng: activeLocation.lng,
      timezone: 'Local',
      population: 0,
    };

    return generateRelocationComparison(
      targetCityData,
      primaryAtlas.natalAngles,
      primaryAtlas.natalPositions,
      primaryAtlas.gmst,
      primaryAtlas.obliquity
    );
  }, [activeLocation, activeProfile, selectedCity, primaryAtlas]);

  // Persist profiles
  useEffect(() => {
    try {
      localStorage.setItem('spectral_atlas_profiles', JSON.stringify(savedProfiles));
    } catch (e) {}
  }, [savedProfiles]);

  // Persist favorites
  useEffect(() => {
    try {
      localStorage.setItem('spectral_atlas_favorites', JSON.stringify(savedLocations));
    } catch (e) {}
  }, [savedLocations]);

  // Persist relocation target
  useEffect(() => {
    try {
      if (relocationTarget) {
        localStorage.setItem('spectral_atlas_relocation', JSON.stringify(relocationTarget));
      } else {
        localStorage.removeItem('spectral_atlas_relocation');
      }
    } catch (e) {}
  }, [relocationTarget]);

  // Handlers for Location Selection
  const handleSelectLocation = (coord: Coordinates, city?: CityData) => {
    setActiveLocation(coord);
    setSelectedCity(city || null);
    setSelectedLine(null);
    setSelectedCrossing(null);
    setIsInspectorOpen(true);
  };

  const handleSelectLine = (line: AstrocartographyLine) => {
    setSelectedLine(line);
    // Focus midpoint of line
    const midPt = line.points[Math.floor(line.points.length / 2)];
    if (midPt) {
      setActiveLocation(midPt);
      // Find closest city
      let closestCity: CityData | null = null;
      let minD = Infinity;
      for (const c of WORLD_CITIES) {
        const d = Math.hypot(c.lat - midPt.lat, c.lng - midPt.lng);
        if (d < minD) {
          minD = d;
          closestCity = c;
        }
      }
      setSelectedCity(closestCity);
    }
    setIsInspectorOpen(true);
  };

  const handleSelectCrossing = (cross: PlanetaryCrossing) => {
    setSelectedCrossing(cross);
    setActiveLocation({ lat: cross.lat, lng: cross.lng });
    const city = WORLD_CITIES.find((c) => c.name === cross.nearestCity) || null;
    setSelectedCity(city);
    setIsInspectorOpen(true);
  };

  const handleSelectTransitTrigger = (trig: TransitTrigger) => {
    setActiveLocation({ lat: trig.lat, lng: trig.lng });
    if (trig.nearestCity) {
      const city = WORLD_CITIES.find((c) => c.name === trig.nearestCity);
      if (city) setSelectedCity(city);
    }
    setIsInspectorOpen(true);
  };

  const handleToggleFavorite = (loc: CityData | Coordinates) => {
    setSavedLocations((prev) => {
      const isAlready = prev.some((p) => {
        if ('id' in p && 'id' in loc) return p.id === loc.id;
        return Math.abs(p.lat - loc.lat) < 0.1 && Math.abs(p.lng - loc.lng) < 0.1;
      });
      if (isAlready) {
        return prev.filter((p) => {
          if ('id' in p && 'id' in loc) return p.id !== loc.id;
          return !(Math.abs(p.lat - loc.lat) < 0.1 && Math.abs(p.lng - loc.lng) < 0.1);
        });
      } else {
        return [...prev, loc];
      }
    });
  };

  const isCurrentSaved = useMemo(() => {
    if (!activeLocation) return false;
    return savedLocations.some((p) => {
      if (selectedCity && 'id' in p) return p.id === selectedCity.id;
      return Math.abs(p.lat - activeLocation.lat) < 0.1 && Math.abs(p.lng - activeLocation.lng) < 0.1;
    });
  }, [activeLocation, selectedCity, savedLocations]);

  // Filter Handlers
  const handleTogglePlanet = (p: PlanetId) => {
    setFilteredPlanets((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleToggleAngle = (ang: string) => {
    setFilteredAngles((prev) =>
      prev.includes(ang) ? prev.filter((x) => x !== ang) : [...prev, ang]
    );
  };

  return (
    <div className="flex flex-col w-screen h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans antialiased">
      {/* Top Header Navigation */}
      <HeaderNav
        currentProfile={activeProfile}
        onOpenBirthModal={() => setIsBirthModalOpen(true)}
        relocationTarget={relocationTarget}
        onOpenRelocationPicker={() => setIsRelocationModalOpen(true)}
        onClearRelocation={() => setRelocationTarget(null)}
        isDualChartActive={isDualChartActive}
        onToggleDualChart={() => {
          if (!activeProfile) {
            setIsBirthModalOpen(true);
          } else {
            setIsDualChartActive(!isDualChartActive);
          }
        }}
        showTransits={showTransits}
        onToggleTransits={() => {
          if (!activeProfile) {
            setIsBirthModalOpen(true);
          } else {
            setShowTransits(!showTransits);
          }
        }}
        onOpenReportModal={() => {
          if (!activeProfile) {
            setIsBirthModalOpen(true);
          } else {
            setIsReportModalOpen(true);
          }
        }}
        onToggleChartWheel={() => {
          if (!activeProfile) {
            setIsBirthModalOpen(true);
          } else {
            setIsChartWheelOpen(!isChartWheelOpen);
          }
        }}
        isChartWheelOpen={isChartWheelOpen}
        onOpenTopCities={() => setIsTopCitiesOpen(true)}
        activeLocationName={selectedCity ? `${selectedCity.name}, ${selectedCity.country}` : activeLocation ? `${activeLocation.lat.toFixed(1)}°, ${activeLocation.lng.toFixed(1)}°` : undefined}
        calculationMethod={calculationMethod}
        onChangeCalculationMethod={handleToggleCalculationMethod}
        isRecalculating={isSwitchingMethod}
        onOpenTutorial={() => setIsTutorialOpen(true)}
      />

      {/* Main Interactive Stage Area */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        {/* Welcome Prompt If No Profile Is Entered Yet */}
        {!activeProfile && !isBirthModalOpen && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4 pointer-events-none">
            <div className="pointer-events-auto max-w-md w-full bg-slate-950/90 backdrop-blur-md border border-amber-500/40 rounded-2xl p-6 shadow-2xl text-center space-y-4 animate-scaleUp">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 mx-auto flex items-center justify-center text-amber-300 text-xl font-serif">
                ✦
              </div>
              <div>
                <h2 className="text-lg font-serif font-bold text-white tracking-wide">
                  Welcome to Spectral Atlas
                </h2>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  Enter your birth date, time, and birth city to map your personalized planetary astrocartography lines, zenith crossings, and power zones.
                </p>
              </div>
              <button
                id="btn-welcome-enter-birth"
                onClick={() => setIsBirthModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-semibold text-xs transition shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                ✦ Enter Your Birth Information
              </button>
            </div>
          </div>
        )}

        {/* Real-time Planetary Transits Floating Control Bar */}
        {showTransits && (
          <TransitControlBar
            transitDate={transitDate}
            onChangeTransitDate={setTransitDate}
            transitLines={transitData.transitLines}
            transitTriggers={transitData.transitTriggers}
            birthplace={activeProfile ? { name: activeProfile.cityName, coordinates: { lat: activeProfile.lat, lng: activeProfile.lng } } : null}
            relocationTarget={relocationTarget ? { name: ('name' in relocationTarget && relocationTarget.name) ? relocationTarget.name : 'Target', coordinates: { lat: relocationTarget.lat, lng: relocationTarget.lng } } : null}
            onSelectTransitTrigger={handleSelectTransitTrigger}
            onFocusCoordinates={(coords) => {
              setActiveLocation(coords);
              setIsInspectorOpen(true);
            }}
            onClose={() => setShowTransits(false)}
          />
        )}

        {/* Floating Layer Filters & City Search */}
        <LayerFilterBar
          selectedPlanets={filteredPlanets}
          onTogglePlanet={handleTogglePlanet}
          onSelectAllPlanets={() => setFilteredPlanets(allPlanetKeys)}
          onClearPlanets={() => setFilteredPlanets([])}
          onSetPlanets={setFilteredPlanets}
          selectedAngles={filteredAngles}
          onToggleAngle={handleToggleAngle}
          onSetAngles={setFilteredAngles}
          showParans={showParans}
          onToggleParans={() => setShowParans(!showParans)}
          showCrossings={showCrossings}
          onToggleCrossings={() => setShowCrossings(!showCrossings)}
          selectedCategory={filteredCategory}
          onSelectCategory={setFilteredCategory}
          selectedPolarity={filteredPolarity}
          onSelectPolarity={setFilteredPolarity}
          onSelectCity={(c) => handleSelectLocation({ lat: c.lat, lng: c.lng }, c)}
          savedLocations={savedLocations}
          onQuickLocate={(loc) => {
            if ('name' in loc) {
              handleSelectLocation({ lat: loc.lat, lng: loc.lng }, loc);
            } else {
              handleSelectLocation(loc);
            }
          }}
          onOpenTopCities={() => setIsTopCitiesOpen(true)}
          calculationMethod={calculationMethod}
          onChangeCalculationMethod={handleToggleCalculationMethod}
          isRecalculating={isSwitchingMethod}
          // Aspect lines & Harmonics
          showConjunctions={showConjunctions}
          onToggleConjunctions={() => setShowConjunctions(!showConjunctions)}
          showHarmoniousAspects={showHarmoniousAspects}
          onToggleHarmoniousAspects={() => setShowHarmoniousAspects(!showHarmoniousAspects)}
          showDisharmoniousAspects={showDisharmoniousAspects}
          onToggleDisharmoniousAspects={() => setShowDisharmoniousAspects(!showDisharmoniousAspects)}
          activeHarmonics={activeHarmonics}
          onToggleHarmonic={handleToggleHarmonic}
          // Local Space, Star Parans, 3D Aspects & Tutorial
          showLocalSpace={showLocalSpace}
          onToggleLocalSpace={() => setShowLocalSpace(!showLocalSpace)}
          showFixedStars={showFixedStars}
          onToggleFixedStars={() => setShowFixedStars(!showFixedStars)}
          use3DAspects={use3DOffEclipticAspects}
          onToggle3DAspects={() => setUse3DOffEclipticAspects(!use3DOffEclipticAspects)}
          onOpenTutorial={() => setIsTutorialOpen(true)}
          // Crossings & Parans Launchers
          onOpenCrossingsModal={() => setIsCrossingsModalOpen(true)}
          onOpenParansModal={() => setIsParansModalOpen(true)}
          crossingsCount={primaryAtlas.crossings.length}
          paransCount={primaryAtlas.parans.length}
        />

        {/* High-Resolution Real OpenStreetMap / Carto Leaflet Map */}
        <RealLeafletMapView
          lines={primaryAtlas.lines}
          transitLines={transitData.transitLines}
          transitTriggers={transitData.transitTriggers}
          parans={primaryAtlas.parans}
          crossings={primaryAtlas.crossings}
          selectedCity={selectedCity}
          activeLocation={activeLocation}
          birthplaceLocation={activeProfile ? { lat: activeProfile.lat, lng: activeProfile.lng } : null}
          relocationLocation={relocationTarget}
          filteredPlanets={filteredPlanets}
          filteredAngles={filteredAngles}
          showParans={showParans}
          showCrossings={showCrossings}
          showTransits={showTransits}
          localSpaceLines={localSpaceLines}
          showLocalSpace={showLocalSpace}
          starParans={starParans}
          showFixedStars={showFixedStars}
          showConjunctions={showConjunctions}
          showHarmoniousAspects={showHarmoniousAspects}
          showDisharmoniousAspects={showDisharmoniousAspects}
          activeHarmonics={activeHarmonics}
          activeCrossing={activeCrossing}
          activeParan={activeParan}
          onSelectLocation={handleSelectLocation}
          onSelectLine={handleSelectLine}
          onSelectCrossing={(cross) => {
            setActiveCrossing(cross);
            handleSelectCrossing(cross);
          }}
          onSelectParan={(paran) => {
            setActiveParan(paran);
            const currentCenterLng = activeLocation ? activeLocation.lng : 0;
            handleSelectLocation({ lat: paran.latitude, lng: currentCenterLng });
          }}
          onSelectTransitTrigger={handleSelectTransitTrigger}
        />

        {/* Floating Quick Summary Pill (When Location is active but drawer closed) */}
        {activeLocation && !isInspectorOpen && locationScore && (
          <button
            id="btn-open-inspector-pill"
            onClick={() => setIsInspectorOpen(true)}
            className="absolute bottom-6 left-6 z-20 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700/80 shadow-2xl transition group cursor-pointer"
          >
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 group-hover:scale-125 transition-transform" />
            <div className="text-left">
              <div className="text-xs font-bold text-white">
                {selectedCity ? `${selectedCity.name}, ${selectedCity.country}` : `Coordinates (${activeLocation.lat.toFixed(1)}°, ${activeLocation.lng.toFixed(1)}°)`}
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Score: <strong className="text-amber-300">{locationScore.overallScore}/100</strong> • {locationScore.topInfluences.length} active power lines
              </div>
            </div>
            <span className="text-xs text-amber-400 ml-2 font-mono">Inspect ➔</span>
          </button>
        )}

        {/* Chart Wheel Drawer / Overlay Panel */}
        {isChartWheelOpen && (
          <div
            id="chart-wheel-panel"
            className="absolute top-4 right-4 z-30 w-full max-w-md bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-2xl max-h-[92vh] overflow-y-auto animate-scaleUp"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-sm">✦</span>
                <h3 className="text-sm font-serif font-bold text-white">
                  Interactive Astrological Chart Wheel
                </h3>
              </div>
              <button
                onClick={() => setIsChartWheelOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs transition"
              >
                ✕
              </button>
            </div>

            <ChartWheel
              natalPositions={primaryAtlas.natalPositions}
              natalAngles={primaryAtlas.natalAngles}
              relocatedPositions={relocationComparison?.relocatedPositions}
              relocatedAngles={relocationComparison?.relocatedAngles}
              selectedCity={selectedCity}
              aspects={primaryAtlas.aspects}
              birthCityName={activeProfile ? activeProfile.cityName : ''}
            />
          </div>
        )}
      </main>

      {/* Location Inspector & Deep Interpretations Drawer */}
      {activeLocation && locationScore && (
        <LocationInspectorModal
          isOpen={isInspectorOpen}
          onClose={() => setIsInspectorOpen(false)}
          coordinates={activeLocation}
          city={selectedCity}
          score={locationScore}
          relocation={relocationComparison}
          selectedLine={selectedLine}
          selectedCrossing={selectedCrossing}
          radiusKm={radiusKm}
          onRadiusChange={setRadiusKm}
          onSaveLocation={handleToggleFavorite}
          isSaved={isCurrentSaved}
          onSetRelocationTarget={(loc) => {
            setRelocationTarget(loc);
          }}
          isRelocationTarget={Boolean(
            relocationTarget &&
            Math.abs(relocationTarget.lat - activeLocation.lat) < 0.05 &&
            Math.abs(relocationTarget.lng - activeLocation.lng) < 0.05
          )}
          transitLines={transitData.transitLines}
          showTransits={showTransits}
        />
      )}

      {/* Relocation Destination Modal */}
      <RelocationModal
        isOpen={isRelocationModalOpen}
        onClose={() => setIsRelocationModalOpen(false)}
        currentTarget={relocationTarget}
        onSetRelocationTarget={(loc) => {
          setRelocationTarget(loc);
          setActiveLocation({ lat: loc.lat, lng: loc.lng });
          if ('name' in loc && loc.name) {
            setSelectedCity(loc as CityData);
          }
          setIsInspectorOpen(true);
        }}
        onClearRelocationTarget={() => setRelocationTarget(null)}
      />

      {/* Birth Input & Profiles Modal */}
      <BirthInputModal
        isOpen={isBirthModalOpen}
        onClose={() => setIsBirthModalOpen(false)}
        onSubmit={(newProfile) => {
          setSavedProfiles((prev) => [newProfile, ...prev.filter((p) => p.id !== newProfile.id)]);
          setActiveProfile(newProfile);
          setActiveLocation({ lat: newProfile.lat, lng: newProfile.lng });
          setSelectedCity({
            id: `birth_${newProfile.id}`,
            name: newProfile.cityName,
            country: newProfile.country,
            lat: newProfile.lat,
            lng: newProfile.lng,
            timezone: newProfile.timezone,
            population: 0,
          });
          setIsBirthModalOpen(false);
        }}
        savedProfiles={savedProfiles}
        onSelectProfile={(profile) => {
          setActiveProfile(profile);
          setActiveLocation({ lat: profile.lat, lng: profile.lng });
          setSelectedCity({
            id: `birth_${profile.id}`,
            name: profile.cityName,
            country: profile.country,
            lat: profile.lat,
            lng: profile.lng,
            timezone: profile.timezone,
            population: 0,
          });
          setIsBirthModalOpen(false);
        }}
        onDeleteProfile={(id) => {
          setSavedProfiles((prev) => prev.filter((p) => p.id !== id));
          if (activeProfile && activeProfile.id === id) {
            const remaining = savedProfiles.filter((p) => p.id !== id);
            setActiveProfile(remaining.length > 0 ? remaining[0] : null);
          }
        }}
        activeProfileId={activeProfile ? activeProfile.id : undefined}
      />

      {/* Comprehensive Report & Export Modal */}
      {isReportModalOpen && activeProfile && (
        <ExportReportModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          profile={activeProfile}
          activeLocation={activeLocation}
          activeCity={selectedCity}
          score={locationScore}
          relocation={relocationComparison}
          lines={primaryAtlas.lines}
        />
      )}

      {/* Top Cities Power Spots Ranking Drawer */}
      <TopCitiesDrawer
        isOpen={isTopCitiesOpen}
        onClose={() => setIsTopCitiesOpen(false)}
        lines={primaryAtlas.lines}
        parans={primaryAtlas.parans}
        crossings={primaryAtlas.crossings}
        radiusKm={radiusKm}
        onSelectCity={(city) => {
          handleSelectLocation({ lat: city.lat, lng: city.lng }, city);
          setIsInspectorOpen(true);
        }}
        activeCityId={selectedCity?.id}
      />

      {/* Comprehensive Crossings & Intersection Suite */}
      <CrossingsExplorerModal
        isOpen={isCrossingsModalOpen}
        onClose={() => setIsCrossingsModalOpen(false)}
        crossings={primaryAtlas.crossings}
        onSelectCrossing={(cross) => {
          setActiveCrossing(cross);
          handleSelectCrossing(cross);
          // Auto close modal so map is immediately visible
          setIsCrossingsModalOpen(false);
        }}
        activeCrossing={activeCrossing}
      />

      {/* Advanced Paran Options (Paranatellonta) Suite */}
      <ParansExplorerModal
        isOpen={isParansModalOpen}
        onClose={() => setIsParansModalOpen(false)}
        parans={primaryAtlas.parans}
        onSelectParan={(paran) => {
          setActiveParan(paran);
          const currentLng = activeLocation ? activeLocation.lng : 0;
          handleSelectLocation({ lat: paran.latitude, lng: currentLng });
          // Auto close modal so map is immediately visible
          setIsParansModalOpen(false);
        }}
        activeParan={activeParan}
        userLocation={activeLocation}
      />

      {/* Animated Calculation Transition Loading Dialog */}
      <CalculationLoadingDialog
        isOpen={isSwitchingMethod}
        targetMethod={targetMethod || calculationMethod}
      />

      {/* Complete Beginner's Manual & Astrological Guide */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />
    </div>
  );
}
