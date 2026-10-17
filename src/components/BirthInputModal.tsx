import React, { useState, useEffect, useRef } from 'react';
import { BirthData, CityData } from '../types/astronomy';
import { WORLD_CITIES } from '../constants/worldCities';

interface BirthInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (birthData: BirthData) => void;
  savedProfiles: BirthData[];
  onSelectProfile: (profile: BirthData) => void;
  onDeleteProfile: (id: string) => void;
  activeProfileId?: string;
}

const POPULAR_QUICK_CITIES: CityData[] = [
  { id: 'city_nyc', name: 'New York City', country: 'United States', adminCode: 'NY', lat: 40.7128, lng: -74.006, timezone: 'America/New_York', population: 8336817 },
  { id: 'city_pit', name: 'Pittsburgh', country: 'United States', adminCode: 'PA', lat: 40.4406, lng: -79.9959, timezone: 'America/New_York', population: 300431 },
  { id: 'city_la', name: 'Los Angeles', country: 'United States', adminCode: 'CA', lat: 34.0522, lng: -118.2437, timezone: 'America/Los_Angeles', population: 3898747 },
  { id: 'city_chicago', name: 'Chicago', country: 'United States', adminCode: 'IL', lat: 41.8781, lng: -87.6298, timezone: 'America/Chicago', population: 2746388 },
  { id: 'city_lon', name: 'London', country: 'United Kingdom', lat: 51.5074, lng: -0.1278, timezone: 'Europe/London', population: 8982000 },
  { id: 'city_par', name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, timezone: 'Europe/Paris', population: 2161000 },
  { id: 'city_tok', name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, timezone: 'Asia/Tokyo', population: 13960000 },
  { id: 'city_syd', name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093, timezone: 'Australia/Sydney', population: 5312000 },
];

function getTimezoneOffsetFromLocation(lat: number, lng: number): number {
  return Math.round(lng / 15);
}

export const BirthInputModal: React.FC<BirthInputModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  savedProfiles,
  onSelectProfile,
  onDeleteProfile,
  activeProfileId,
}) => {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('12:00');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
  const [customLat, setCustomLat] = useState<string>('');
  const [customLng, setCustomLng] = useState<string>('');
  const [customTzOffset, setCustomTzOffset] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Live Geocoding State
  const [liveResults, setLiveResults] = useState<CityData[]>([]);
  const [isSearchingGeocode, setIsSearchingGeocode] = useState(false);
  const searchTimeoutRef = useRef<number | null>(null);

  const isInitialSetup = savedProfiles.length === 0;

  // Sync form with currently active profile when opened
  useEffect(() => {
    const active = savedProfiles.find((p) => p.id === activeProfileId);
    if (active && isOpen) {
      setName(active.name);
      setDate(active.date);
      setTime(active.time);
      setSearchQuery(`${active.cityName}, ${active.country}`);
      setCustomLat(active.lat.toFixed(4));
      setCustomLng(active.lng.toFixed(4));
      setCustomTzOffset(active.timezoneOffsetHours);
      setSelectedCity({
        id: `saved_${active.id}`,
        name: active.cityName,
        country: active.country,
        lat: active.lat,
        lng: active.lng,
        timezone: active.timezone,
        population: 0,
      });
    } else if (!active && isOpen) {
      if (!name) setName('My Natal Chart');
      if (!time) setTime('12:00');
    }
  }, [isOpen, activeProfileId, savedProfiles]);

  // Live Geocoding lookup on search query changes
  useEffect(() => {
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
    }

    const q = searchQuery.trim();
    if (q.length < 2) {
      setLiveResults([]);
      setIsSearchingGeocode(false);
      return;
    }

    setIsSearchingGeocode(true);
    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            q
          )}&limit=6&addressdetails=1`
        );
        if (res.ok) {
          const data = await res.json();
          const mapped: CityData[] = data.map((item: any, idx: number) => {
            const addr = item.address || {};
            const cityName =
              addr.city ||
              addr.town ||
              addr.village ||
              addr.municipality ||
              addr.county ||
              item.name ||
              item.display_name.split(',')[0];
            const state = addr.state ? `, ${addr.state}` : '';
            const country = addr.country || 'Global';
            const lat = parseFloat(item.lat);
            const lng = parseFloat(item.lon);

            return {
              id: `live_${item.place_id || idx}`,
              name: `${cityName}${state}`,
              country,
              lat,
              lng,
              timezone: `UTC${Math.round(lng / 15) >= 0 ? '+' : ''}${Math.round(lng / 15)}`,
              population: 0,
            };
          });
          setLiveResults(mapped);
        }
      } catch (err) {
        // Fall back to local matches
      } finally {
        setIsSearchingGeocode(false);
      }
    }, 380);

    return () => {
      if (searchTimeoutRef.current) window.clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  // Local static matches
  const localMatches = searchQuery.trim().length >= 2
    ? WORLD_CITIES.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.adminCode && c.adminCode.toLowerCase() === searchQuery.trim().toLowerCase())
      ).slice(0, 5)
    : [];

  // Combined autocomplete results
  const combinedCityResults = [
    ...localMatches,
    ...liveResults.filter(
      (lr) => !localMatches.some((lm) => Math.hypot(lm.lat - lr.lat, lm.lng - lr.lng) < 0.25)
    ),
  ].slice(0, 7);

  const handleSelectCity = (c: CityData) => {
    setSelectedCity(c);
    setSearchQuery(`${c.name}, ${c.country}`);
    setCustomLat(c.lat.toFixed(4));
    setCustomLng(c.lng.toFixed(4));
    const offset = getTimezoneOffsetFromLocation(c.lat, c.lng);
    setCustomTzOffset(offset);
    setLiveResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide a name or chart title.');
      return;
    }
    if (!date) {
      setError('Please enter your birth date.');
      return;
    }
    if (!time) {
      setError('Please enter your birth time (use 12:00 if unknown).');
      return;
    }

    let latVal = parseFloat(customLat);
    let lngVal = parseFloat(customLng);
    let finalCityName = selectedCity ? selectedCity.name : searchQuery.split(',')[0].trim();
    let finalCountry = selectedCity ? selectedCity.country : (searchQuery.includes(',') ? searchQuery.split(',')[1].trim() : 'Global');
    let finalTzOffset = customTzOffset;

    // If coordinates are missing or unselected, auto-geocode query string right now
    if ((isNaN(latVal) || isNaN(lngVal) || (latVal === 0 && lngVal === 0)) && searchQuery.trim()) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            searchQuery.trim()
          )}&limit=1&addressdetails=1`
        );
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            latVal = parseFloat(data[0].lat);
            lngVal = parseFloat(data[0].lon);
            finalTzOffset = getTimezoneOffsetFromLocation(latVal, lngVal);
            finalCityName = data[0].display_name.split(',')[0];
            finalCountry = data[0].address?.country || 'Global';
          }
        }
      } catch (err) {
        // Continue validation
      }
    }

    if (isNaN(latVal) || latVal < -90 || latVal > 90) {
      setError('Please select a birth city from search results or enter a valid latitude (-90 to 90).');
      return;
    }
    if (isNaN(lngVal) || lngVal < -180 || lngVal > 180) {
      setError('Please select a birth city from search results or enter a valid longitude (-180 to 180).');
      return;
    }

    const birthData: BirthData = {
      id: activeProfileId || `profile_${Date.now()}`,
      name: name.trim(),
      date,
      time,
      cityName: finalCityName || 'Birth Location',
      country: finalCountry || 'Global',
      lat: latVal,
      lng: lngVal,
      timezone: selectedCity ? selectedCity.timezone : `UTC${finalTzOffset >= 0 ? '+' : ''}${finalTzOffset}`,
      timezoneOffsetHours: finalTzOffset,
    };

    onSubmit(birthData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isInitialSetup) {
          onClose();
        }
      }}
    >
      <div
        id="birth-input-modal"
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100 animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center text-violet-300 font-serif text-base shrink-0">
              ✦
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-bold text-white tracking-wide">
                {isInitialSetup ? 'Enter Your Birth Information' : 'Natal Chart & Birth Data Configuration'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isInitialSetup
                  ? 'Enter your birth date, time, and birth location to calculate your personalized planetary lines.'
                  : 'Update exact birth coordinates and time for high-precision astrocartography calculations.'}
              </p>
            </div>
          </div>
          {!isInitialSetup && (
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition shrink-0 cursor-pointer"
              title="Close"
            >
              ✕
            </button>
          )}
        </div>

        {/* Saved Profiles Switcher */}
        {savedProfiles.length > 0 && (
          <div className="px-5 py-3 bg-slate-950/40 border-b border-slate-800/80">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Your Saved Natal Profiles</span>
              <span className="text-[10px] text-slate-500">
                {savedProfiles.length} profile{savedProfiles.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {savedProfiles.map((prof) => (
                <div
                  key={prof.id}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                    activeProfileId === prof.id
                      ? 'bg-violet-500/20 text-violet-300 border-violet-500/40 shadow-sm shadow-violet-500/10'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                  }`}
                  onClick={() => {
                    onSelectProfile(prof);
                    onClose();
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>
                    {prof.name} ({prof.cityName})
                  </span>
                  {savedProfiles.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProfile(prof.id);
                      }}
                      className="text-slate-500 hover:text-rose-400 ml-1 text-xs"
                      title="Delete profile"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[72vh]">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300 flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Profile Name */}
          <div>
            <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1.5">
              Subject Name / Chart Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. My Chart, Solar Return, John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-violet-400 transition"
            />
          </div>

          {/* Birth Date & Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1.5">
                Birth Date *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-violet-400 transition font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1.5">
                Birth Time (Local) *
              </label>
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-violet-400 transition font-mono"
              />
              <span className="block text-[10px] text-slate-500 mt-1">
                If exact minute is unknown, 12:00 PM (Noon) is standard.
              </span>
            </div>
          </div>

          {/* Birth Location Lookup with Live OSM Geocoder */}
          <div className="relative">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider">
                Birth City / Town / Location *
              </label>
              {isSearchingGeocode && (
                <span className="text-[10px] font-mono text-violet-400 animate-pulse">
                  Searching global atlas...
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                required
                placeholder="Type any city or town (e.g. Pittsburgh PA, Sedona, Austin, Kyoto)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-violet-400 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setLiveResults([]);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Suggestions Chips */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-mono text-slate-500 mr-1">Quick pick:</span>
              {POPULAR_QUICK_CITIES.map((qc) => (
                <button
                  key={qc.id}
                  type="button"
                  onClick={() => handleSelectCity(qc)}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition cursor-pointer"
                >
                  {qc.name}
                </button>
              ))}
            </div>

            {/* Autocomplete Dropdown (Combined Local & Global Live Geocoder) */}
            {combinedCityResults.length > 0 && searchQuery.trim().length >= 2 && (
              <div className="absolute top-[82px] left-0 right-0 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-30 overflow-hidden max-h-56 overflow-y-auto">
                {combinedCityResults.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectCity(c)}
                    className="w-full px-4 py-2.5 text-left text-xs hover:bg-slate-800 flex items-center justify-between border-b border-slate-800/60 last:border-0 text-slate-200 cursor-pointer transition"
                  >
                    <div>
                      <span className="font-medium text-white block">{c.name}</span>
                      <span className="text-[10px] text-slate-400">{c.country}</span>
                    </div>
                    <span className="font-mono text-violet-400/80 text-[11px]">
                      {c.lat.toFixed(2)}°, {c.lng.toFixed(2)}°
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Coordinates and UTC Offset Inputs */}
          <div className="grid grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                Latitude (°)
              </label>
              <input
                type="number"
                step="0.0001"
                placeholder="e.g. 40.4406"
                value={customLat}
                onChange={(e) => setCustomLat(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                Longitude (°)
              </label>
              <input
                type="number"
                step="0.0001"
                placeholder="e.g. -79.9959"
                value={customLng}
                onChange={(e) => setCustomLng(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono text-slate-400 uppercase tracking-wider mb-1">
                UTC Offset (hrs)
              </label>
              <input
                type="number"
                step="0.5"
                placeholder="e.g. -5 or +1"
                value={customTzOffset}
                onChange={(e) => setCustomTzOffset(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white font-mono"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex items-center justify-between gap-3 border-t border-slate-800">
            {!isInitialSetup && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>
            )}
            <button
              id="btn-calculate-chart"
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500 text-slate-950 shadow-lg shadow-violet-500/20 transition cursor-pointer flex items-center gap-1.5"
            >
              <span>✦</span>
              <span>{isInitialSetup ? 'Calculate & Generate My Map' : 'Update & View Map'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
