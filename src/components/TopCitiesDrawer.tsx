import React, { useState, useMemo } from 'react';
import {
  AstrocartographyLine,
  CityData,
  LifeCategory,
  ParanLine,
  PlanetaryCrossing,
} from '../types/astronomy';
import { calculateLocationScore } from '../engine/locationScoring';
import { PLANET_DEFINITIONS } from '../constants/celestialData';
import { WORLD_CITIES } from '../constants/worldCities';

interface TopCitiesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  lines: AstrocartographyLine[];
  parans?: ParanLine[];
  crossings?: PlanetaryCrossing[];
  radiusKm?: number;
  onSelectCity: (city: CityData) => void;
  activeCityId?: string;
}

export type CityDomainFilter = 'all' | 'career' | 'love' | 'sanctuary' | 'creativity' | 'growth' | 'adventure';

interface ScoredCity {
  city: CityData;
  score: number;
  overallScore: number;
  categoryScores: Record<LifeCategory, number>;
  dominantTheme: string;
  nearestLines: {
    line: AstrocartographyLine;
    distanceKm: number;
    description: string;
  }[];
  activeParansCount: number;
  nearbyCrossingsCount: number;
  tags: string[];
}

export const TopCitiesDrawer: React.FC<TopCitiesDrawerProps> = ({
  isOpen,
  onClose,
  lines,
  parans = [],
  crossings = [],
  radiusKm = 350,
  onSelectCity,
  activeCityId,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<CityDomainFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate authentic planetary rankings for all world cities using calculateLocationScore
  const scoredCities: ScoredCity[] = useMemo(() => {
    if (!lines || lines.length === 0) return [];

    return WORLD_CITIES.map((city) => {
      // Calculate real location score with the exact engine used by the Location Inspector
      const locScore = calculateLocationScore(
        { lat: city.lat, lng: city.lng },
        lines,
        parans,
        crossings,
        radiusKm
      );

      // Extract close lines from topInfluences
      const closeLines: { line: AstrocartographyLine; distanceKm: number; description: string }[] = [];
      const tags: string[] = [];

      locScore.topInfluences.forEach((inf) => {
        const foundLine = lines.find(
          (l) => l.planetId === inf.planetId && l.angle === inf.angle
        );
        const pDef = PLANET_DEFINITIONS[inf.planetId];

        closeLines.push({
          line: foundLine || {
            id: `${inf.planetId}_${inf.angle}`,
            planetId: inf.planetId,
            angle: inf.angle,
            polarity: inf.polarity,
            points: [],
            color: pDef?.color || '#a78bfa',
            description: inf.summary,
            chartOwner: 'primary',
            method: 'in_mundo',
          },
          distanceKm: inf.distanceKm,
          description: inf.summary,
        });

        // Add domain tags based on active planetary angles
        if ((inf.planetId === 'sun' || inf.planetId === 'jupiter') && (inf.angle === 'MC' || inf.angle === 'ASC')) {
          tags.push('Career & Prominence');
        }
        if (inf.planetId === 'venus' && (inf.angle === 'DSC' || inf.angle === 'ASC')) {
          tags.push('Love & Magnetism');
        }
        if (inf.planetId === 'moon' && inf.angle === 'IC') {
          tags.push('Sanctuary & Belonging');
        }
        if (inf.planetId === 'mercury' || inf.planetId === 'uranus') {
          tags.push('Intellect & Innovation');
        }
        if (inf.planetId === 'mars' || inf.planetId === 'pluto') {
          tags.push('Deep Metamorphosis');
        }
      });

      // Formulate authoritative dominant astrological headline
      let dominantTheme = 'Harmonic Sanctuary — Minimal Angular Stress';
      if (locScore.topInfluences.length > 0) {
        const top = locScore.topInfluences[0];
        const pDef = PLANET_DEFINITIONS[top.planetId];
        dominantTheme = `${pDef?.name || top.planetId.toUpperCase()} ${top.angle} (${top.distanceKm} km away) — ${top.summary}`;
      } else if (locScore.activeParans.length > 0) {
        const p = locScore.activeParans[0];
        dominantTheme = `Active Paran Latitude: ${PLANET_DEFINITIONS[p.planet1]?.name || p.planet1} & ${PLANET_DEFINITIONS[p.planet2]?.name || p.planet2}`;
      }

      if (locScore.activeParans.length > 0) {
        tags.push(`${locScore.activeParans.length} Parans`);
      }
      if (locScore.nearbyCrossings.length > 0) {
        tags.push(`${locScore.nearbyCrossings.length} Crossings`);
      }

      return {
        city,
        score: locScore.overallScore,
        overallScore: locScore.overallScore,
        categoryScores: locScore.categories,
        dominantTheme,
        nearestLines: closeLines.slice(0, 4),
        activeParansCount: locScore.activeParans.length,
        nearbyCrossingsCount: locScore.nearbyCrossings.length,
        tags: Array.from(new Set(tags)),
      };
    });
  }, [lines, parans, crossings, radiusKm]);

  // Filtered and ranked cities
  const filteredCities = useMemo(() => {
    let list = scoredCities.map((sc) => {
      let filterScore = sc.overallScore;
      if (selectedFilter === 'career') {
        filterScore = sc.categoryScores.career;
      } else if (selectedFilter === 'love') {
        filterScore = sc.categoryScores.relationships;
      } else if (selectedFilter === 'sanctuary') {
        filterScore = Math.max(sc.categoryScores.stability, sc.categoryScores.family);
      } else if (selectedFilter === 'creativity') {
        filterScore = sc.categoryScores.creativity;
      } else if (selectedFilter === 'adventure') {
        filterScore = Math.max(sc.categoryScores.travel, sc.categoryScores.growth);
      }
      return {
        ...sc,
        score: filterScore,
      };
    });

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((sc) => {
        const matchesName = sc.city.name.toLowerCase().includes(q);
        const matchesCountry = sc.city.country.toLowerCase().includes(q);
        const matchesLine = sc.nearestLines.some(
          (l) => l.line.planetId.toLowerCase().includes(q) || l.description.toLowerCase().includes(q)
        );
        return matchesName || matchesCountry || matchesLine;
      });
    }

    // Rank in descending order by the real calculated score (and secondary by overallScore)
    list.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.overallScore - a.overallScore;
    });

    return list;
  }, [scoredCities, selectedFilter, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-slate-950/60 backdrop-blur-sm cursor-pointer"
      onClick={onClose}
    >
      <div
        className="top-cities-nebula-panel w-full max-w-lg h-full bg-slate-900 shadow-2xl flex flex-col animate-slideInRight cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-violet-400 font-serif text-lg">✦</span>
              <h2 className="text-base font-serif font-bold text-white tracking-wide">
                Top Cities & Power Spots
              </h2>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Personalized astrocartography ranking calculated for your exact chart
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        {/* Domain Filter Pills */}
        <div className="px-4 py-2.5 bg-slate-950/40 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
          {[
            { id: 'all', label: '🌟 Top Overall' },
            { id: 'career', label: '💼 Career & Success' },
            { id: 'love', label: '💖 Love & Marriage' },
            { id: 'sanctuary', label: '🏡 Home & Peace' },
            { id: 'creativity', label: '🎨 Art & Expression' },
            { id: 'adventure', label: '⚡ Transformation' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedFilter(item.id as CityDomainFilter)}
              className={`px-3 py-1 rounded-lg shrink-0 transition font-medium text-xs ${
                selectedFilter === item.id
                  ? 'bg-violet-500 text-slate-950 font-bold shadow-md shadow-violet-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="p-3 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-500 text-xs">🔍</span>
            <input
              type="text"
              placeholder="Search city, country, or planet line (e.g. Venus, Paris, Tokyo)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 text-xs">
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Cities List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredCities.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No matching power spots found for this filter.
            </div>
          ) : (
            filteredCities.map((item, index) => {
              const isSelected = activeCityId === item.city.id;

              return (
                <div
                  key={item.city.id}
                  className={`p-3.5 rounded-xl border transition group hover:border-violet-500/60 cursor-pointer ${
                    isSelected
                      ? 'top-city-selected bg-violet-500/10 border-violet-500 shadow-lg shadow-violet-500/10'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/40'
                  }`}
                  onClick={() => {
                    onSelectCity(item.city);
                    onClose();
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-mono text-violet-400 flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-white group-hover:text-violet-300 transition">
                          {item.city.name}
                          <span className="text-xs font-normal text-slate-400 ml-1.5">
                            {item.city.country}
                          </span>
                        </h3>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {item.city.timezone}
                        </p>
                      </div>
                    </div>

                    {/* Power Score Badge */}
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold font-mono text-violet-400">
                        {item.score} / 100
                      </div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-medium">
                        {selectedFilter === 'all'
                          ? 'Potency'
                          : selectedFilter === 'career'
                          ? 'Career'
                          : selectedFilter === 'love'
                          ? 'Love'
                          : selectedFilter === 'sanctuary'
                          ? 'Sanctuary'
                          : selectedFilter === 'creativity'
                          ? 'Creativity'
                          : 'Adventure'}
                      </span>
                      {selectedFilter !== 'all' && (
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Overall: {item.overallScore}/100
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dominant Astrological Theme */}
                  <div className="mt-2.5 text-xs text-slate-300 bg-slate-900/80 rounded-lg p-2 border border-slate-800/60">
                    <span className="text-violet-400 mr-1">✦</span>
                    {item.dominantTheme}
                  </div>

                  {/* Nearest Passing Lines */}
                  {item.nearestLines.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {item.nearestLines.map((nl) => {
                        const pDef = PLANET_DEFINITIONS[nl.line.planetId];
                        return (
                          <span
                            key={nl.line.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-900 border border-slate-800 text-[10px] font-mono"
                            style={{ color: nl.line.color }}
                          >
                            <span>{pDef?.symbol}</span>
                            <span className="font-semibold">{nl.line.angle}</span>
                            <span className="text-slate-400">({nl.distanceKm} km)</span>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Fly to City Button */}
                  <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      Coordinates: {item.city.lat.toFixed(2)}°, {item.city.lng.toFixed(2)}°
                    </span>
                    <button
                      className="px-2.5 py-1 rounded-lg bg-violet-500/20 hover:bg-violet-500 text-violet-300 hover:text-slate-950 text-xs font-semibold transition"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCity(item.city);
                        onClose();
                      }}
                    >
                      Fly to City ➔
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
