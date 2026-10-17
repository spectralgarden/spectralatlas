import React, { useState, useEffect, useRef } from 'react';
import { CityData, Coordinates } from '../types/astronomy';
import { WORLD_CITIES } from '../constants/worldCities';

interface RelocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTarget: (CityData | (Coordinates & { name?: string; country?: string })) | null;
  onSetRelocationTarget: (location: CityData | Coordinates) => void;
  onClearRelocationTarget: () => void;
}

const QUICK_RELOCATION_CITIES: CityData[] = [
  { id: 'city_la', name: 'Los Angeles', country: 'United States', adminCode: 'CA', lat: 34.0522, lng: -118.2437, timezone: 'America/Los_Angeles', population: 3898747 },
  { id: 'city_lon', name: 'London', country: 'United Kingdom', lat: 51.5074, lng: -0.1278, timezone: 'Europe/London', population: 8982000 },
  { id: 'city_par', name: 'Paris', country: 'France', lat: 48.8566, lng: 2.3522, timezone: 'Europe/Paris', population: 2161000 },
  { id: 'city_tok', name: 'Tokyo', country: 'Japan', lat: 35.6762, lng: 139.6503, timezone: 'Asia/Tokyo', population: 13960000 },
  { id: 'city_syd', name: 'Sydney', country: 'Australia', lat: -33.8688, lng: 151.2093, timezone: 'Australia/Sydney', population: 5312000 },
  { id: 'city_hon', name: 'Honolulu', country: 'United States', adminCode: 'HI', lat: 21.3069, lng: -157.8583, timezone: 'Pacific/Honolulu', population: 345064 },
  { id: 'city_mia', name: 'Miami', country: 'United States', adminCode: 'FL', lat: 25.7617, lng: -80.1918, timezone: 'America/New_York', population: 442241 },
  { id: 'city_ber', name: 'Berlin', country: 'Germany', lat: 52.52, lng: 13.405, timezone: 'Europe/Berlin', population: 3645000 },
];

export const RelocationModal: React.FC<RelocationModalProps> = ({
  isOpen,
  onClose,
  currentTarget,
  onSetRelocationTarget,
  onClearRelocationTarget,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState<CityData | null>(null);
  const [customLat, setCustomLat] = useState('');
  const [customLng, setCustomLng] = useState('');
  const [geoResults, setGeoResults] = useState<CityData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (currentTarget && 'name' in currentTarget && currentTarget.name) {
      setSearchQuery(currentTarget.name);
      setCustomLat(currentTarget.lat.toFixed(4));
      setCustomLng(currentTarget.lng.toFixed(4));
    }
  }, [isOpen, currentTarget]);

  // Live OSM Nominatim Search
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    const q = searchQuery.trim();

    if (q.length < 2) {
      setGeoResults([]);
      setIsSearching(false);
      return;
    }

    // Local match first
    const qLower = q.toLowerCase();
    const localMatches = WORLD_CITIES.filter(
      (c) =>
        c.name.toLowerCase().includes(qLower) ||
        c.country.toLowerCase().includes(qLower) ||
        (c.adminCode && c.adminCode.toLowerCase() === qLower)
    ).slice(0, 5);
    setGeoResults(localMatches);

    // Debounced remote geocoding
    setIsSearching(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          q
        )}&format=json&addressdetails=1&limit=8`;
        const res = await fetch(url, { headers: { Accept: 'application/json' } });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const formatted: CityData[] = data.map((item: any) => {
              const name = item.address?.city || item.address?.town || item.address?.village || item.name || q;
              const country = item.address?.country || '';
              const state = item.address?.state || item.address?.region || '';
              return {
                id: `osm_${item.osm_id || Math.random()}`,
                name: state ? `${name}, ${state}` : name,
                country: country,
                adminCode: state,
                lat: parseFloat(item.lat),
                lng: parseFloat(item.lon),
                timezone: 'UTC',
                population: 0,
              };
            });
            // Merge with local matches avoiding duplicate coordinates
            setGeoResults((prev) => {
              const combined = [...prev];
              formatted.forEach((f) => {
                if (!combined.some((c) => Math.abs(c.lat - f.lat) < 0.05 && Math.abs(c.lng - f.lng) < 0.05)) {
                  combined.push(f);
                }
              });
              return combined.slice(0, 10);
            });
          }
        }
      } catch (err) {
        // Fallback to local
      } finally {
        setIsSearching(false);
      }
    }, 380);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleSelectCity = (c: CityData) => {
    setSelectedCity(c);
    setSearchQuery(`${c.name}, ${c.country}`);
    setCustomLat(c.lat.toFixed(4));
    setCustomLng(c.lng.toFixed(4));
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCity) {
      onSetRelocationTarget(selectedCity);
      onClose();
      return;
    }

    const lat = parseFloat(customLat);
    const lng = parseFloat(customLng);
    if (!isNaN(lat) && !isNaN(lng)) {
      onSetRelocationTarget({
        name: searchQuery || 'Custom Target',
        country: 'Global',
        lat,
        lng,
      });
      onClose();
      return;
    }

    // If typed query and first result exists
    if (geoResults.length > 0) {
      onSetRelocationTarget(geoResults[0]);
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm cursor-pointer"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 animate-scaleUp cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 font-bold text-base">
              ✦
            </div>
            <div>
              <h2 className="text-base font-serif font-bold text-white tracking-wide">
                Set Relocation Destination
              </h2>
              <p className="text-xs text-slate-400">
                Compare your natal birth chart against any relocated geographic locale
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Current Active Target Indicator */}
        {currentTarget && (
          <div className="p-3 mb-4 rounded-xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
              <div>
                <span className="text-[10px] font-mono uppercase text-purple-300 block">Current Relocation Target:</span>
                <span className="text-xs font-bold text-white">
                  {'name' in currentTarget && currentTarget.name ? currentTarget.name : `${currentTarget.lat.toFixed(2)}°, ${currentTarget.lng.toFixed(2)}°`}
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                onClearRelocationTarget();
                setSearchQuery('');
                setCustomLat('');
                setCustomLng('');
              }}
              className="text-xs px-2.5 py-1 rounded bg-purple-900/60 hover:bg-rose-900/60 text-purple-200 hover:text-rose-200 transition cursor-pointer border border-purple-500/30 hover:border-rose-500/40"
            >
              Clear Target
            </button>
          </div>
        )}

        <form onSubmit={handleApply} className="space-y-4">
          {/* City / Town Search Input */}
          <div className="relative">
            <label className="block text-xs font-mono text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Search Any City, Town, or Village Worldwide:</span>
              {isSearching && <span className="text-purple-400 text-[10px] lowercase font-sans">searching...</span>}
            </label>
            <input
              type="text"
              placeholder="e.g. Los Angeles, CA or Sedona, AZ or London..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 focus:border-purple-400 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-400/40 transition"
              autoFocus
            />

            {/* Autocomplete Dropdown */}
            {geoResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-30 mt-1.5 max-h-48 overflow-y-auto bg-slate-950/95 border border-slate-700 rounded-xl shadow-2xl divide-y divide-slate-800">
                {geoResults.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectCity(c)}
                    className="w-full text-left px-3.5 py-2 text-xs hover:bg-purple-950/40 text-slate-300 hover:text-white flex items-center justify-between transition cursor-pointer"
                  >
                    <div>
                      <span className="font-semibold text-white">{c.name}</span>
                      <span className="text-slate-400 ml-1.5 font-sans">{c.country}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      {c.lat.toFixed(1)}°, {c.lng.toFixed(1)}°
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Coordinates Inputs */}
          <div className="grid grid-cols-2 gap-3 text-xs font-mono">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Target Latitude (°)</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 34.05"
                value={customLat}
                onChange={(e) => setCustomLat(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-lg text-slate-200 focus:outline-none focus:border-purple-400"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Target Longitude (°)</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. -118.24"
                value={customLng}
                onChange={(e) => setCustomLng(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 px-3 py-2 rounded-lg text-slate-200 focus:outline-none focus:border-purple-400"
              />
            </div>
          </div>

          {/* Quick Pick Popular Cities */}
          <div>
            <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider mb-2">
              Popular Relocation Hubs:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_RELOCATION_CITIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => handleSelectCity(c)}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 hover:bg-purple-950/50 border border-slate-800 hover:border-purple-500/40 text-slate-300 hover:text-white text-[11px] transition cursor-pointer"
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/25 transition cursor-pointer"
            >
              Apply Relocation Target
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
