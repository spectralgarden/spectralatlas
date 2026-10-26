import React, { useState, useMemo } from 'react';
import { Coordinates, LifeCategory, ParanLine, PlanetId } from '../types/astronomy';
import { ANGLE_DEFINITIONS, LIFE_CATEGORIES_META, PLANET_DEFINITIONS } from '../constants/celestialData';

interface ParansExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  parans: ParanLine[];
  onSelectParan: (paran: ParanLine) => void;
  activeParan?: ParanLine | null;
  userLocation?: Coordinates | null;
  showParans: boolean;
  onToggleParans: () => void;
}

export const ParansExplorerModal: React.FC<ParansExplorerModalProps> = ({
  isOpen,
  onClose,
  parans,
  onSelectParan,
  activeParan,
  userLocation,
  showParans,
  onToggleParans,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<LifeCategory | 'all'>('all');
  const [selectedPlanet, setSelectedPlanet] = useState<string>('all');
  const [sortByProximity, setSortByProximity] = useState(false);

  const categories: { id: LifeCategory | 'all'; label: string; icon: string }[] = [
    { id: 'all', label: 'All Domains', icon: '🌐' },
    { id: 'career', label: 'Career & Authority', icon: '👑' },
    { id: 'relationships', label: 'Love & Partnerships', icon: '💖' },
    { id: 'finances', label: 'Wealth & Prosperity', icon: '💎' },
    { id: 'creativity', label: 'Creative Genius', icon: '🎨' },
    { id: 'spirituality', label: 'Spiritual Awakening', icon: '✨' },
    { id: 'family', label: 'Family & Roots', icon: '🏡' },
    { id: 'health', label: 'Vitality & Health', icon: '🌿' },
    { id: 'growth', label: 'Expansion & Luck', icon: '🚀' },
  ];

  const uniquePlanets = useMemo(() => {
    const set = new Set<PlanetId>();
    parans.forEach((p) => {
      set.add(p.planet1);
      set.add(p.planet2);
    });
    return Array.from(set).sort();
  }, [parans]);

  const filteredAndSortedParans = useMemo(() => {
    let list = parans.filter((p) => {
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesTitle = p.title.toLowerCase().includes(query);
        const matchesInterp = p.interpretation.toLowerCase().includes(query);
        const matchesP1 = PLANET_DEFINITIONS[p.planet1]?.name.toLowerCase().includes(query) ?? false;
        const matchesP2 = PLANET_DEFINITIONS[p.planet2]?.name.toLowerCase().includes(query) ?? false;
        if (!matchesTitle && !matchesInterp && !matchesP1 && !matchesP2) return false;
      }

      // Category filter
      if (selectedCategory !== 'all' && !p.categories.includes(selectedCategory)) {
        return false;
      }

      // Planet filter
      if (selectedPlanet !== 'all' && p.planet1 !== selectedPlanet && p.planet2 !== selectedPlanet) {
        return false;
      }

      return true;
    });

    if (sortByProximity && userLocation) {
      list = [...list].sort(
        (a, b) => Math.abs(a.latitude - userLocation.lat) - Math.abs(b.latitude - userLocation.lat)
      );
    } else {
      list = [...list].sort((a, b) => b.latitude - a.latitude);
    }

    return list;
  }, [parans, searchTerm, selectedCategory, selectedPlanet, sortByProximity, userLocation]);

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
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-lg shadow-inner">
              ≡
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Advanced Parans (Paranatellonta) Explorer
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-medium">
                  {parans.length} Latitude Bands
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Planetary pairs simultaneously touching cardinal angles, projecting horizontal resonance circles encircling the globe.
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
          <span className="text-xs font-medium text-slate-300">Show paran lines on map</span>
          <button
            type="button"
            role="switch"
            aria-checked={showParans}
            onClick={onToggleParans}
            className={`flex min-w-20 items-center justify-between gap-3 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              showParans
                ? 'border-emerald-500/40 bg-emerald-950/60 text-emerald-300'
                : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{showParans ? 'ON' : 'OFF'}</span>
            <span className={`h-2 w-2 rounded-full ${showParans ? 'bg-emerald-400' : 'bg-slate-600'}`} />
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
                placeholder="Search paran by planet, domain, or keyword (e.g. Venus, Wealth, Nadir)..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
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

            {/* Planet Filter & Proximity Sort */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <label className="text-xs text-slate-400 font-medium">Planet:</label>
              <select
                value={selectedPlanet}
                onChange={(e) => setSelectedPlanet(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="all">All Celestial Bodies</option>
                {uniquePlanets.map((p) => (
                  <option key={p} value={p}>
                    {PLANET_DEFINITIONS[p]?.symbol} {PLANET_DEFINITIONS[p]?.name}
                  </option>
                ))}
              </select>

              {userLocation && (
                <button
                  onClick={() => setSortByProximity(!sortByProximity)}
                  className={`px-3 py-2 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 whitespace-nowrap ${
                    sortByProximity
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                  title="Sort parans by proximity to current active location"
                >
                  <span>📍</span>
                  Near My Location
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all flex items-center gap-1.5 ${
                  selectedCategory === c.id
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <span>{c.icon}</span>
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Parans Cards List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filteredAndSortedParans.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-500">
                ≡
              </div>
              <p className="text-slate-300 font-medium text-sm">No Paranatellonta lines match your filters.</p>
              <p className="text-xs text-slate-500 mt-1">Try resetting the planet filter or domain search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredAndSortedParans.map((p) => {
                const p1Def = PLANET_DEFINITIONS[p.planet1];
                const p2Def = PLANET_DEFINITIONS[p.planet2];
                const ang1Def = ANGLE_DEFINITIONS[p.angle1];
                const ang2Def = ANGLE_DEFINITIONS[p.angle2];
                const isSelected = activeParan?.id === p.id;
                const distanceDeg = userLocation ? Math.abs(p.latitude - userLocation.lat) : null;

                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      onSelectParan(p);
                      onClose();
                    }}
                    className={`group relative p-4 rounded-xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-emerald-950/40 border-emerald-500/80 shadow-lg shadow-emerald-500/10'
                        : 'bg-slate-800/40 hover:bg-slate-800/80 border-slate-700/60 hover:border-slate-600'
                    }`}
                  >
                    {/* Top Row: Latitude Badge & Polarity */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {/* Latitude badge */}
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1">
                          <span>🌐</span>
                          {p.latitude > 0 ? `${p.latitude}° N` : `${Math.abs(p.latitude)}° S`}
                        </span>

                        {distanceDeg !== null && (
                          <span className="text-[11px] text-slate-400">
                            {distanceDeg < 1
                              ? '✦ Direct Hit (<1°)'
                              : `${(distanceDeg * 111).toFixed(0)} km from you`}
                          </span>
                        )}
                      </div>

                      {/* Polarity Tag */}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          p.polarity === 'harmonious'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                        }`}
                      >
                        {p.polarity === 'harmonious' ? 'Harmonious Flow' : 'Dynamic Crucible'}
                      </span>
                    </div>

                    {/* Planet & Angle Combination */}
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                        style={{
                          backgroundColor: `${p1Def?.color || '#10b981'}22`,
                          color: p1Def?.color || '#34d399',
                          border: `1px solid ${p1Def?.color || '#10b981'}55`,
                        }}
                      >
                        <span>{p1Def?.symbol}</span>
                        <span>{p1Def?.name}</span>
                        <span className="text-[10px] opacity-75">{p.angle1}</span>
                      </div>

                      <span className="text-xs font-bold text-slate-500">+</span>

                      <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                        style={{
                          backgroundColor: `${p2Def?.color || '#10b981'}22`,
                          color: p2Def?.color || '#34d399',
                          border: `1px solid ${p2Def?.color || '#10b981'}55`,
                        }}
                      >
                        <span>{p2Def?.symbol}</span>
                        <span>{p2Def?.name}</span>
                        <span className="text-[10px] opacity-75">{p.angle2}</span>
                      </div>
                    </div>

                    {/* Synthesis Interpretation */}
                    <p className="text-xs text-slate-300 leading-relaxed mb-3">{p.interpretation}</p>

                    {/* Life Category Chips */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {p.categories.map((cat) => {
                        const meta = LIFE_CATEGORIES_META[cat];
                        return (
                          <span
                            key={cat}
                            className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700/60 text-[10px] text-slate-300"
                          >
                            {meta?.icon || '✦'} {meta?.label || cat}
                          </span>
                        );
                      })}
                    </div>

                    {/* Action Footer */}
                    <div className="pt-2 border-t border-slate-700/40 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">
                        {ang1Def?.name} & {ang2Def?.name}
                      </span>
                      <span className="text-emerald-400 font-semibold group-hover:text-emerald-300 flex items-center gap-1">
                        Inspect Latitude Band on Map
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
            Showing <strong className="text-slate-200">{filteredAndSortedParans.length}</strong> of{' '}
            <strong className="text-slate-200">{parans.length}</strong> active latitude bands
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
