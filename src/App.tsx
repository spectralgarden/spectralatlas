import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import { applyGeodeticProjection, calculateAstrocartography, calculateTransits } from './engine/astronomyEngine';
import { calculateLocationScore, generateRelocationComparison } from './engine/locationScoring';
import { WORLD_CITIES } from './constants/worldCities';
import { PLANET_DEFINITIONS } from './constants/celestialData';

import { HeaderNav } from './components/HeaderNav';
import { RealLeafletMapView } from './components/RealLeafletMapView';
import { TopCitiesDrawer } from './components/TopCitiesDrawer';
import { FavoritesDrawer } from './components/FavoritesDrawer';
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

const FLAME_FINDER_API = 'https://flamefinder.spectralgarden.net';
const ATLAS_ACCESS_TOKEN_KEY = 'spectral_atlas_access_token';
const ATLAS_SSO_PENDING_KEY = 'spectral_atlas_sso_pending';
const ATLAS_PRIVACY_ACK_KEY = 'spectral_atlas_cookie_notice_v2_acknowledged';

interface NetworkMember {
  id: string;
  username: string;
}

interface NetworkBirthData {
  date: string;
  time: string;
  cityName: string;
  country: string;
  lat: number;
  lng: number;
  timezone: string;
  timezoneOffsetHours: number;
}

function encodeBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

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

  // Let the map and welcome prompt show before requesting birth information.
  const [isBirthModalOpen, setIsBirthModalOpen] = useState(false);
  const [isBirthDataLoading, setIsBirthDataLoading] = useState(false);
  const [isRelocationModalOpen, setIsRelocationModalOpen] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [returnToTopCities, setReturnToTopCities] = useState(false);
  const [isChartWheelOpen, setIsChartWheelOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isTopCitiesOpen, setIsTopCitiesOpen] = useState(false);
  const [isFavoritesOpen, setIsFavoritesOpen] = useState(false);
  const [networkMember, setNetworkMember] = useState<NetworkMember | null>(null);
  const [isCheckingNetworkSession, setIsCheckingNetworkSession] = useState(true);
  const [networkAuthError, setNetworkAuthError] = useState<string | null>(null);
  const hasProcessedSsoCallback = useRef(false);
  const [showPrivacyNotice, setShowPrivacyNotice] = useState(() => {
    try {
      return localStorage.getItem(ATLAS_PRIVACY_ACK_KEY) !== 'true';
    } catch {
      return true;
    }
  });
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false);

  const dismissPrivacyNotice = () => {
    try {
      localStorage.setItem(ATLAS_PRIVACY_ACK_KEY, 'true');
    } catch (error) {
      setNetworkAuthError(error instanceof Error ? error.message : 'Could not save this privacy preference.');
    }
    setShowPrivacyNotice(false);
  };

  const startNetworkSignIn = async (mode: 'login' | 'register' = 'login') => {
    try {
      setNetworkAuthError(null);
      const verifier = encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)));
      const state = encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)));
      const challengeBytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
      const codeChallenge = encodeBase64Url(new Uint8Array(challengeBytes));
      const redirectUri = `${window.location.origin}${window.location.pathname}`;
      sessionStorage.setItem(ATLAS_SSO_PENDING_KEY, JSON.stringify({ verifier, state }));

      const authorizationUrl = new URL(`${FLAME_FINDER_API}/api/auth/sso/authorize`);
      authorizationUrl.searchParams.set('redirect_uri', redirectUri);
      authorizationUrl.searchParams.set('state', state);
      authorizationUrl.searchParams.set('code_challenge', codeChallenge);
      authorizationUrl.searchParams.set('auth_mode', mode);
      window.location.assign(authorizationUrl.toString());
    } catch (error) {
      setNetworkAuthError(error instanceof Error ? error.message : 'Could not start member sign-in.');
    }
  };

  const signOutNetworkMember = async () => {
    const token = sessionStorage.getItem(ATLAS_ACCESS_TOKEN_KEY);
    try {
      if (token) {
        const response = await fetch(`${FLAME_FINDER_API}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'omit',
        });
        if (!response.ok) {
          setNetworkAuthError('Could not revoke the member session on the server.');
        }
      }
    } catch {
      setNetworkAuthError('Could not reach Flame Finder to revoke the member session.');
    } finally {
      sessionStorage.removeItem(ATLAS_ACCESS_TOKEN_KEY);
      setNetworkMember(null);
    }
  };

  const activateImportedBirthData = (birthData: NetworkBirthData, member: NetworkMember) => {
    const profile: BirthData = {
      id: `profile_${member.id}`,
      name: `${member.username}'s Natal Chart`,
      ...birthData,
    };
    setSavedProfiles((previous) => [profile, ...previous.filter((saved) => saved.id !== profile.id)]);
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
  };

  useEffect(() => {
    if (hasProcessedSsoCallback.current) return;
    hasProcessedSsoCallback.current = true;
    let isActive = true;

    const restoreNetworkSession = async () => {
      const params = new URLSearchParams(window.location.search);
      const authorizationCode = params.get('code');
      const returnedState = params.get('state');
      const savedToken = sessionStorage.getItem(ATLAS_ACCESS_TOKEN_KEY);

      if (!authorizationCode && !savedToken) {
        if (isActive) setIsCheckingNetworkSession(false);
        return;
      }

      try {
        let token = savedToken;
        if (authorizationCode) {
          const pending = sessionStorage.getItem(ATLAS_SSO_PENDING_KEY);
          if (!pending) throw new Error('This sign-in link has expired. Please sign in again.');
          const { verifier, state } = JSON.parse(pending) as { verifier: string; state: string };
          if (!returnedState || returnedState !== state) {
            throw new Error('Sign-in verification failed. Please try again.');
          }
          const tokenResponse = await fetch(`${FLAME_FINDER_API}/api/auth/sso/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'omit',
            signal: AbortSignal.timeout(90_000),
            body: JSON.stringify({ code: authorizationCode, codeVerifier: verifier }),
          });
          const tokenData = await tokenResponse.json() as {
            accessToken?: string;
            user?: NetworkMember;
            birthData?: NetworkBirthData | null;
            error?: string;
          };
          if (!tokenResponse.ok || !tokenData.accessToken || !tokenData.user) {
            throw new Error(tokenData.error || 'Could not complete member sign-in.');
          }
          token = tokenData.accessToken;
          sessionStorage.setItem(ATLAS_ACCESS_TOKEN_KEY, token);
          sessionStorage.removeItem(ATLAS_SSO_PENDING_KEY);
          window.history.replaceState({}, '', `${window.location.pathname}${window.location.hash}`);
          if (isActive) {
            setNetworkMember(tokenData.user);
            setNetworkAuthError(null);
            if (!activeProfile && tokenData.birthData) {
              activateImportedBirthData(tokenData.birthData, tokenData.user);
            } else if (!activeProfile) {
              setIsBirthModalOpen(true);
            }
          }
        }

        if (!token || authorizationCode) return;
        const memberResponse = await fetch(`${FLAME_FINDER_API}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'omit',
          signal: AbortSignal.timeout(90_000),
        });
        if (!memberResponse.ok) {
          sessionStorage.removeItem(ATLAS_ACCESS_TOKEN_KEY);
          throw new Error('Your member session expired. Sign in again to reconnect.');
        }
        const memberData = await memberResponse.json() as {
          user: NetworkMember;
          birthData?: NetworkBirthData | null;
        };
        if (isActive) {
          setNetworkMember(memberData.user);
          if (!activeProfile && memberData.birthData) {
            activateImportedBirthData(memberData.birthData, memberData.user);
          } else if (!activeProfile) {
            setIsBirthModalOpen(true);
          }
        }
      } catch (error) {
        if (isActive) {
          setNetworkAuthError(
            error instanceof DOMException && error.name === 'TimeoutError'
              ? 'Flame Finder is taking too long to respond. Please try member sign-in again.'
              : error instanceof Error ? error.message : 'Could not restore member sign-in.',
          );
        }
      } finally {
        if (isActive) setIsCheckingNetworkSession(false);
      }
    };

    void restoreNetworkSession();
    return () => {
      isActive = false;
    };
  }, []);

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
  const [isGeodeticEnabled, setIsGeodeticEnabled] = useState(false);

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

  const isAnyWindowOpen = [
    isBirthModalOpen,
    isRelocationModalOpen,
    isInspectorOpen,
    isChartWheelOpen,
    isReportModalOpen,
    isTopCitiesOpen,
    isFavoritesOpen,
    isTutorialOpen,
    isCrossingsModalOpen,
    isParansModalOpen,
    isSwitchingMethod,
    isBirthDataLoading,
  ].some(Boolean);

  useEffect(() => {
    if (!isAnyWindowOpen) return;

    const root = document.documentElement;
    const previousRootOverflow = root.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;
    root.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';

    return () => {
      root.style.overflow = previousRootOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [isAnyWindowOpen]);

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

  const displayedPrimaryLines = useMemo(
    () =>
      isGeodeticEnabled
        ? applyGeodeticProjection(
            primaryAtlas.lines,
            primaryAtlas.natalPositions,
            calculationMethod,
            primaryAtlas.obliquity
          )
        : primaryAtlas.lines,
    [isGeodeticEnabled, primaryAtlas, calculationMethod]
  );

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
        obliquity: primaryAtlas.obliquity,
        transitingPositions: [],
        transitLines: [],
        transitTriggers: [] as TransitTrigger[],
      };
    }
    return calculateTransits(transitDate, primaryAtlas.lines, calculationMethod);
  }, [showTransits, transitDate, primaryAtlas.lines, primaryAtlas.obliquity, calculationMethod]);

  const displayedTransitLines = useMemo(
    () =>
      isGeodeticEnabled
        ? applyGeodeticProjection(
            transitData.transitLines,
            transitData.transitingPositions,
            calculationMethod,
            transitData.obliquity
          )
        : transitData.transitLines,
    [isGeodeticEnabled, transitData, calculationMethod]
  );

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

  const handleSelectLine = (line: AstrocartographyLine, clickedLocation?: Coordinates) => {
    setSelectedLine(line);
    setSelectedCrossing(null);

    const location = clickedLocation || line.points[Math.floor(line.points.length / 2)];
    if (location) {
      setActiveLocation(location);
      if (clickedLocation) {
        setSelectedCity(null);
      } else {
        // Keep the legacy fallback for line selections that do not provide a click location.
        let closestCity: CityData | null = null;
        let minD = Infinity;
        for (const c of WORLD_CITIES) {
          const d = Math.hypot(c.lat - location.lat, c.lng - location.lng);
          if (d < minD) {
            minD = d;
            closestCity = c;
          }
        }
        setSelectedCity(closestCity);
      }
    }
    setIsInspectorOpen(true);
  };

  const handleSelectCrossing = (cross: PlanetaryCrossing) => {
    setSelectedCrossing(cross);
    setSelectedLine(null);
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
        onOpenFavorites={() => setIsFavoritesOpen(true)}
        favoritesCount={savedLocations.length}
        activeLocationName={selectedCity ? `${selectedCity.name}, ${selectedCity.country}` : activeLocation ? `${activeLocation.lat.toFixed(1)}°, ${activeLocation.lng.toFixed(1)}°` : undefined}
        calculationMethod={calculationMethod}
        onChangeCalculationMethod={handleToggleCalculationMethod}
        isRecalculating={isSwitchingMethod}
        onOpenTutorial={() => setIsTutorialOpen(true)}
      />

      <div className="z-20 flex min-h-8 items-center justify-between gap-2 border-b border-violet-400/20 bg-slate-950/95 px-3 py-1.5 text-[10px] sm:px-5 sm:text-[11px]">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 font-mono text-violet-300">
            <span className="sm:hidden">MEMBERS</span>
            <span className="hidden sm:inline">SPECTRAL GARDEN MEMBER NETWORK</span>
          </span>
          <span className="hidden text-slate-600 sm:inline">|</span>
          <span className="hidden text-slate-400 sm:inline">Astrology tools are available without signing in.</span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!showPrivacyNotice && (
            <button
              type="button"
              onClick={() => setShowPrivacyNotice(true)}
              className="text-slate-300 underline decoration-slate-600 underline-offset-2 hover:text-white"
              aria-label="Open cookies and privacy notice"
            >
              <span className="sm:hidden">Privacy</span>
              <span className="hidden sm:inline">Cookies &amp; privacy</span>
            </button>
          )}
          {networkAuthError && (
            <span role="status" className="hidden max-w-64 truncate text-rose-300 md:inline" title={networkAuthError}>
              {networkAuthError}
            </span>
          )}
          {networkMember ? (
            <>
              <span className="max-w-32 truncate rounded border border-emerald-800 bg-emerald-950/60 px-2 py-0.5 text-emerald-300 sm:max-w-none">
                Signed in: {networkMember.username}
              </span>
              <button type="button" onClick={() => void signOutNetworkMember()} className="text-slate-300 underline decoration-slate-600 underline-offset-2 hover:text-white">
                Sign out of Atlas
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => void startNetworkSignIn()}
              disabled={isCheckingNetworkSession}
              className="rounded border border-violet-500/50 bg-violet-500/10 px-2 py-0.5 font-semibold text-violet-200 transition hover:bg-violet-500/20 disabled:opacity-60"
            >
              {isCheckingNetworkSession ? 'Checking account…' : 'Member sign in'}
            </button>
          )}
        </div>
      </div>

      {/* Main Interactive Stage Area */}
      <main className="relative flex-1 w-full h-full overflow-hidden">
        {/* Welcome Prompt If No Profile Is Entered Yet */}
        {!activeProfile && !isBirthModalOpen && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="welcome-title"
              className="atlas-welcome-card max-w-md w-full rounded-2xl p-6 text-center space-y-4 animate-scaleUp"
            >
              <div className="w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-300/60 shadow-[0_0_18px_rgba(167,139,250,0.25)] mx-auto flex items-center justify-center">
                <img
                  src={`${import.meta.env.BASE_URL}sglogo.png`}
                  alt=""
                  className="h-9 w-9 rounded-xl object-contain"
                />
              </div>
              <div>
                <h2 id="welcome-title" className="text-lg font-serif font-bold text-white tracking-wide">
                  Welcome to Spectral Atlas
                </h2>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  {networkMember
                    ? 'Your account is connected. Enter your birth information to calculate your planetary lines.'
                    : 'Explore planetary maps as a guest, or connect your member account across Spectral Garden.'}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  id="btn-welcome-enter-birth"
                  onClick={() => setIsBirthModalOpen(true)}
                  className="w-full rounded-lg border border-cyan-300/50 bg-slate-950/65 px-4 py-2 text-xs font-semibold text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-500/15 cursor-pointer"
                >
                  {networkMember ? 'Enter Birth Info' : 'Guest'}
                </button>
                {!networkMember && (
                  <>
                    <button
                      id="btn-welcome-create-account"
                      type="button"
                      onClick={() => void startNetworkSignIn('register')}
                      className="w-full rounded-lg border border-fuchsia-300/50 bg-slate-950/65 px-4 py-2 text-xs font-semibold text-fuchsia-100 transition hover:border-fuchsia-200 hover:bg-fuchsia-500/15 cursor-pointer"
                    >
                      Create an account
                    </button>
                    <button
                      id="btn-welcome-member-login"
                      type="button"
                      onClick={() => void startNetworkSignIn('login')}
                      className="w-full rounded-lg border border-violet-300/50 bg-slate-950/65 px-4 py-2 text-xs font-semibold text-violet-100 transition hover:border-violet-200 hover:bg-violet-500/15 cursor-pointer"
                    >
                      Log in
                    </button>
                  </>
                )}
              </div>
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
          // Local Space, Star Parans & 3D Aspects
          showLocalSpace={showLocalSpace}
          onToggleLocalSpace={() => setShowLocalSpace(!showLocalSpace)}
          showFixedStars={showFixedStars}
          onToggleFixedStars={() => setShowFixedStars(!showFixedStars)}
          use3DAspects={use3DOffEclipticAspects}
          onToggle3DAspects={() => setUse3DOffEclipticAspects(!use3DOffEclipticAspects)}
          isGeodeticEnabled={isGeodeticEnabled}
          onToggleGeodetic={() => setIsGeodeticEnabled((enabled) => !enabled)}
          // Crossings & Parans Launchers
          onOpenCrossingsModal={() => setIsCrossingsModalOpen(true)}
          onOpenParansModal={() => setIsParansModalOpen(true)}
          crossingsCount={primaryAtlas.crossings.length}
          paransCount={primaryAtlas.parans.length}
        />

        {/* High-Resolution Real OpenStreetMap / Carto Leaflet Map */}
        <RealLeafletMapView
          lines={displayedPrimaryLines}
          transitLines={displayedTransitLines}
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
            <div className="w-2.5 h-2.5 rounded-full bg-violet-400 group-hover:scale-125 transition-transform" />
            <div className="text-left">
              <div className="text-xs font-bold text-white">
                {selectedCity ? `${selectedCity.name}, ${selectedCity.country}` : `Coordinates (${activeLocation.lat.toFixed(1)}°, ${activeLocation.lng.toFixed(1)}°)`}
              </div>
              <div className="text-[11px] font-mono text-slate-400">
                Score: <strong className="text-violet-300">{locationScore.overallScore}/100</strong> • {locationScore.topInfluences.length} active power lines
              </div>
            </div>
            <span className="text-xs text-violet-400 ml-2 font-mono">Inspect ➔</span>
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
                <span className="text-violet-400 text-sm">✦</span>
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
          onClose={() => {
            setIsInspectorOpen(false);
            setReturnToTopCities(false);
          }}
          onBackToTopCities={returnToTopCities ? () => {
            setIsInspectorOpen(false);
            setReturnToTopCities(false);
            setIsTopCitiesOpen(true);
          } : undefined}
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
        onLoadingChange={setIsBirthDataLoading}
        onSubmit={async (newProfile) => {
          await new Promise<void>((resolve) => window.setTimeout(resolve, 50));
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
          await new Promise<void>((resolve) => window.setTimeout(resolve, 550));
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
          setReturnToTopCities(true);
          handleSelectLocation({ lat: city.lat, lng: city.lng }, city);
          setIsInspectorOpen(true);
        }}
        activeCityId={selectedCity?.id}
      />

      <FavoritesDrawer
        isOpen={isFavoritesOpen}
        onClose={() => setIsFavoritesOpen(false)}
        favorites={savedLocations}
        activeLocation={activeLocation}
        onSelectLocation={(location) => handleSelectLocation(location, 'id' in location ? location : undefined)}
        onRemoveFavorite={handleToggleFavorite}
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
        isOpen={isSwitchingMethod || isBirthDataLoading}
        targetMethod={targetMethod || calculationMethod}
        isBirthDataLoading={isBirthDataLoading}
      />

      {/* Complete Beginner's Manual & Astrological Guide */}
      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
      />

      {showPrivacyNotice && (
        <aside className="fixed inset-x-0 bottom-0 z-[70] border-t border-violet-300/30 bg-slate-950/90 px-4 py-3 text-xs text-slate-200 shadow-[0_-8px_32px_rgba(2,3,12,0.55)] backdrop-blur-md sm:px-6">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-4xl leading-relaxed">
              <strong className="text-violet-200">Cookies &amp; privacy:</strong> Continue as a guest or sign in to your Spectral Garden member account. Atlas saves chart profiles in this browser and can import birth details already saved in your Flame Finder account after sign-in. Spectral Garden does not sell personal data. AdSense is not currently active.
            </p>
            <div className="flex shrink-0 items-center gap-4">
              <button
                type="button"
                onClick={() => setShowPrivacyDetails((open) => !open)}
                className="font-semibold text-violet-200 underline underline-offset-2 hover:text-white"
                aria-expanded={showPrivacyDetails}
              >
                {showPrivacyDetails ? 'Hide details' : 'Cookie & ad details'}
              </button>
              <button
                type="button"
                onClick={dismissPrivacyNotice}
                className="rounded-md border border-violet-300/40 bg-violet-500/15 px-3 py-1.5 font-semibold text-white hover:bg-violet-500/30"
              >
                Close notice
              </button>
            </div>
          </div>
          {showPrivacyDetails && (
            <div className="mx-auto mt-3 max-w-7xl border-t border-slate-700/80 pt-3 leading-relaxed text-slate-300">
              <strong className="text-white">Atlas storage and use:</strong> Birth-chart profiles (including birth date, time, and place), favorites, relocation targets, and settings are saved in this browser's local storage; Atlas does not upload its local profiles to your member account. If you sign in, Atlas can retrieve the birth date, time, and place already saved in your Flame Finder account to calculate your planetary lines. Any imported chart is saved only in this browser. Local browser storage is not encrypted by Atlas, so anyone with access to your browser profile or device may be able to view it; clearing this site's browser storage removes it. Atlas connects to Flame Finder, Spectral Garden's member service hosted on Cloudflare, for account authentication and chart import. Atlas temporarily keeps a limited access token in this tab's session storage (up to one hour) and sends your member ID, username, and requested birth details to Flame Finder. Account information is used to provide member services, not sold or shared for third-party marketing. The service processes account data under the Flame Finder privacy notice. The notice preference is also stored in this browser. Map providers receive map requests, including your IP address and the map area requested. When you use city search or address lookup, OpenStreetMap's Nominatim service receives the search query and your network request information. These providers process requests under their own privacy terms.
              <br /><br />
              <strong className="text-white">Cookies:</strong> Atlas does not currently use its own advertising cookies or analytics trackers. Browser storage described above is still used for app functionality and may be treated as similar technology under some laws. Third-party map and geocoding services may use their own technologies.
              <br /><br />
              <strong className="text-white">Google AdSense notice (planned):</strong> AdSense ads are not currently displayed by Atlas. When ads are enabled, third-party vendors, including Google, use cookies to serve ads based on a user's prior visits to this website or other websites. Google's use of advertising cookies enables it and its partners to serve ads to users based on their visit to this site and/or other sites on the Internet. Google and its advertising partners may process device, browser, network, and ad-interaction information for ad delivery, personalization, frequency capping, fraud prevention, and measurement. Users may opt out of personalized advertising by visiting{' '}
              <a href="https://adssettings.google.com/" target="_blank" rel="noreferrer" className="text-violet-200 underline underline-offset-2 hover:text-white">Google Ads Settings</a>.{' '}
              See{' '}
              <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noreferrer" className="text-violet-200 underline underline-offset-2 hover:text-white">how Google uses information from sites or apps that use its services</a>. Ad technology partners may also process data under their own privacy notices. Before ads are enabled, Spectral Garden must configure applicable Google settings and consent choices; where required by Google, this includes using a Google-certified consent-management platform. This notice is not itself an advertising-consent choice.
              <br /><br />
              <strong className="text-white">Flame Finder:</strong> If you choose to sign in or use its community features, Flame Finder separately processes account and service data as described in its privacy and cookie notice.{' '}
              <a
                href="https://flamefinder.spectralgarden.net/"
                target="_blank"
                rel="noreferrer"
                className="text-violet-200 underline underline-offset-2 hover:text-white"
              >
                Flame Finder privacy &amp; cookie notice
              </a>
              .
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
