import React, { useState, useMemo } from 'react';
import { AngleType, PlanetaryCrossing, PlanetId } from '../types/astronomy';
import { ANGLE_DEFINITIONS, PLANET_DEFINITIONS } from '../constants/celestialData';

interface CrossingsExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  crossings: PlanetaryCrossing[];
  onSelectCrossing: (crossing: PlanetaryCrossing) => void;
  activeCrossing?: PlanetaryCrossing | null;
  showCrossings: boolean;
  onToggleCrossings: () => void;
}

export const CrossingsExplorerModal: React.FC<CrossingsExplorerModalProps> = ({
  isOpen,
  onClose,
  crossings,
  onSelectCrossing,
  activeCrossing,
  showCrossings,
  onToggleCrossings,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<string>('all');
  const [selectedPlanet, setSelectedPlanet] = useState<string>('all');
  const [selectedPolarity, setSelectedPolarity] = useState<'all' | 'harmonious' | 'challenging'>('all');

  const themes = [
    { id: 'all', label: 'All Crossings' },
    { id: 'wealth', label: '💎 Wealth & Expansion', color: 'text-violet-400' },
    { id: 'career', label: '👑 Career & Leadership', color: 'text-purple-400' },
    { id: 'love', label: '💖 Love & Magnetic Ties', color: 'text-pink-400' },
    { id: 'creativity', label: '⚡ Creative Awakening', color: 'text-cyan-400' },
    { id: 'spirituality', label: '✨ Mystical Devotion', color: 'text-indigo-400' },
    { id: 'transformation', label: '🔥 Deep Crucible', color: 'text-rose-400' },
  ];

  const uniquePlanets = useMemo(() => {
    const set = new Set<PlanetId>();
    crossings.forEach((c) => {
      set.add(c.planet1);
      set.add(c.planet2);
    });
    return Array.from(set).sort();
  }, [crossings]);

  const filteredCrossings = useMemo(() => {
    return crossings.filter((c) => {
      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesCity = c.nearestCity?.toLowerCase().includes(query) ?? false;
        const matchesCountry = c.country?.toLowerCase().includes(query) ?? false;
        const matchesSummary = c.summary.toLowerCase().includes(query);
        const matchesP1 = PLANET_DEFINITIONS[c.planet1]?.name.toLowerCase().includes(query) ?? false;
        const matchesP2 = PLANET_DEFINITIONS[c.planet2]?.name.toLowerCase().includes(query) ?? false;
        if (!matchesCity && !matchesCountry && !matchesSummary && !matchesP1 && !matchesP2) {
          return false;
        }
      }

      // Theme filter
      if (selectedTheme !== 'all' && c.theme !== selectedTheme) {
        return false;
      }

      // Planet filter
      if (selectedPlanet !== 'all' && c.planet1 !== selectedPlanet && c.planet2 !== selectedPlanet) {
        return false;
      }

      // Polarity filter
      if (selectedPolarity === 'harmonious' && !c.isHarmonious) return false;
      if (selectedPolarity === 'challenging' && c.isHarmonious) return false;

      return true;
    });
  }, [crossings, searchTerm, selectedTheme, selectedPlanet, selectedPolarity]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-bold text-lg shadow-inner">
              ✕
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Planetary Crossings & Intersection Tools
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 font-medium">
                  {crossings.length} Nodes Worldwide
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Exact geographic intersection points where two planetary lines cross, synthesizing potent energetic vortexes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/50 px-4 py-3 sm:px-6">
          <span className="text-xs font-medium text-slate-300">Show crossings on map</span>
          <button
            type="button"
            role="switch"
            aria-checked={showCrossings}
            onClick={onToggleCrossings}
            className={`flex min-w-20 items-center justify-between gap-3 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              showCrossings
                ? 'border-violet-500/40 bg-violet-950/60 text-violet-300'
                : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{showCrossings ? 'ON' : 'OFF'}</span>
            <span className={`h-2 w-2 rounded-full ${showCrossings ? 'bg-violet-400' : 'bg-slate-600'}`} />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 sm:px-6 bg-slate-950/50 border-b border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <svg
                className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search crossing by city, country, or planet (e.g. Michigan, Paris, Jupiter)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-purple-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Planet Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs text-slate-400 font-medium">Planet:</label>
              <select
                value={selectedPlanet}
                onChange={(e) => setSelectedPlanet(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Planets</option>
                {uniquePlanets.map((p) => (
                  <option key={p} value={p}>
                    {PLANET_DEFINITIONS[p]?.symbol} {PLANET_DEFINITIONS[p]?.name}
                  </option>
                ))}
              </select>

              {/* Polarity Selector */}
              <div className="flex rounded-xl bg-slate-900 p-0.5 border border-slate-700">
                <button
                  onClick={() => setSelectedPolarity('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    selectedPolarity === 'all'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setSelectedPolarity('harmonious')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    selectedPolarity === 'harmonious'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-emerald-400'
                  }`}
                >
                  Harmonious
                </button>
                <button
                  onClick={() => setSelectedPolarity('challenging')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    selectedPolarity === 'challenging'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-rose-400'
                  }`}
                >
                  Challenging
                </button>
              </div>
            </div>
          </div>

          {/* Theme Badges */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {themes.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTheme(t.id)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${
                  selectedTheme === t.id
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Crossings List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filteredCrossings.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-500">
                ✕
              </div>
              <p className="text-slate-300 font-medium text-sm">No planetary crossings match your filters.</p>
              <p className="text-xs text-slate-500 mt-1">Try clearing your search query or selecting "All Crossings".</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredCrossings.map((c) => {
                const p1Def = PLANET_DEFINITIONS[c.planet1];
                const p2Def = PLANET_DEFINITIONS[c.planet2];
                const ang1Def = ANGLE_DEFINITIONS[c.angle1];
                const ang2Def = ANGLE_DEFINITIONS[c.angle2];
                const isSelected = activeCrossing?.id === c.id;

                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      onSelectCrossing(c);
                      onClose();
                    }}
                    className={`group relative p-4 rounded-xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500/80 shadow-lg shadow-purple-500/10'
                        : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-700/60 hover:border-slate-600'
                    }`}
                  >
                    {/* Top Row: Planet & Angle Badges */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {/* Planet 1 */}
                        <div
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                          style={{
                            backgroundColor: `${p1Def?.color || '#9333ea'}22`,
                            color: p1Def?.color || '#a855f7',
                            border: `1px solid ${p1Def?.color || '#9333ea'}55`,
                          }}
                        >
                          <span>{p1Def?.symbol}</span>
                          <span>{p1Def?.name}</span>
                          <span className="text-[10px] opacity-75">{c.angle1}</span>
                        </div>

                        <span className="text-xs font-bold text-slate-500">✕</span>

                        {/* Planet 2 */}
                        <div
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                          style={{
                            backgroundColor: `${p2Def?.color || '#9333ea'}22`,
                            color: p2Def?.color || '#a855f7',
                            border: `1px solid ${p2Def?.color || '#9333ea'}55`,
                          }}
                        >
                          <span>{p2Def?.symbol}</span>
                          <span>{p2Def?.name}</span>
                          <span className="text-[10px] opacity-75">{c.angle2}</span>
                        </div>
                      </div>

                      {/* Polarity Tag */}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          c.isHarmonious
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                        }`}
                      >
                        {c.isHarmonious ? 'Harmonious' : 'Intense'}
                      </span>
                    </div>

                    {/* Nearest City & Geographic Coordinates */}
                    <div className="flex items-center justify-between text-xs text-slate-300 font-medium mb-1.5">
                      <span className="flex items-center gap-1">
                        <svg className="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                        </svg>
                        {c.nearestCity ? `${c.nearestCity}, ${c.country || ''}` : 'Oceanic Convergence'}
                        {c.distanceToNearestCityKm !== undefined && (
                          <span className="text-[11px] text-slate-400">({c.distanceToNearestCityKm} km)</span>
                        )}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {c.lat > 0 ? `${c.lat}°N` : `${Math.abs(c.lat)}°S`},{' '}
                        {c.lng > 0 ? `${c.lng}°E` : `${Math.abs(c.lng)}°W`}
                      </span>
                    </div>

                    {/* Astrological Synthesis Description */}
                    <p className="text-xs text-slate-300 leading-relaxed">{c.summary}</p>

                    {/* Action Link */}
                    <div className="mt-3 pt-2.5 border-t border-slate-700/40 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        {ang1Def?.name} ✕ {ang2Def?.name}
                      </span>
                      <span className="text-xs text-purple-400 font-semibold group-hover:text-purple-300 flex items-center gap-1">
                        Fly to Node on Map
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing <strong className="text-slate-200">{filteredCrossings.length}</strong> of{' '}
            <strong className="text-slate-200">{crossings.length}</strong> planetary crossings
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
          >
            Close Explorer
          </button>
        </div>
      </div>
    </div>
  );
};
