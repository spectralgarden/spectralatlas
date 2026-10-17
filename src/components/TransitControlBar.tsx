import React, { useMemo, useState } from 'react';
import { AstrocartographyLine, Coordinates, TransitTrigger } from '../types/astronomy';
import { ANGLE_DEFINITIONS, PLANET_DEFINITIONS } from '../constants/celestialData';

interface TransitControlBarProps {
  transitDate: Date;
  onChangeTransitDate: (date: Date) => void;
  transitLines?: AstrocartographyLine[];
  transitTriggers: TransitTrigger[];
  birthplace?: { name: string; coordinates: Coordinates } | null;
  relocationTarget?: { name: string; coordinates: Coordinates } | null;
  onSelectTransitTrigger: (trigger: TransitTrigger) => void;
  onFocusCoordinates?: (coords: Coordinates) => void;
  onClose: () => void;
}

function calculateSphericalDistance(c1: Coordinates, c2: Coordinates): number {
  const R = 6371; // Earth radius in km
  const dLat = ((c2.lat - c1.lat) * Math.PI) / 180;
  const dLng = ((c2.lng - c1.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((c1.lat * Math.PI) / 180) *
      Math.cos((c2.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export const TransitControlBar: React.FC<TransitControlBarProps> = ({
  transitDate,
  onChangeTransitDate,
  transitLines = [],
  transitTriggers,
  birthplace,
  relocationTarget,
  onSelectTransitTrigger,
  onFocusCoordinates,
  onClose,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const shiftDays = (days: number) => {
    const next = new Date(transitDate);
    next.setDate(next.getDate() + days);
    onChangeTransitDate(next);
  };

  const shiftMonths = (months: number) => {
    const next = new Date(transitDate);
    next.setMonth(next.getMonth() + months);
    onChangeTransitDate(next);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) return;
    const [y, m, d] = val.split('-').map(Number);
    const next = new Date(transitDate);
    next.setFullYear(y, m - 1, d);
    onChangeTransitDate(next);
  };

  const dateString = transitDate.toISOString().split('T')[0];
  const timeString = transitDate.toTimeString().split(' ')[0].substring(0, 5);

  // Compute nearest transit line to Birthplace
  const birthplaceTransit = useMemo(() => {
    if (!birthplace || transitLines.length === 0) return null;
    let closestLine: AstrocartographyLine | null = null;
    let minDistance = Infinity;

    for (const tLine of transitLines) {
      for (const pt of tLine.points) {
        const d = calculateSphericalDistance(birthplace.coordinates, pt);
        if (d < minDistance) {
          minDistance = d;
          closestLine = tLine;
        }
      }
    }

    if (!closestLine) return null;
    return {
      line: closestLine,
      distanceKm: Math.round(minDistance),
      isNear: minDistance <= 450,
    };
  }, [birthplace, transitLines]);

  // Compute nearest transit line to Relocation Target
  const relocationTransit = useMemo(() => {
    if (!relocationTarget || transitLines.length === 0) return null;
    let closestLine: AstrocartographyLine | null = null;
    let minDistance = Infinity;

    for (const tLine of transitLines) {
      for (const pt of tLine.points) {
        const d = calculateSphericalDistance(relocationTarget.coordinates, pt);
        if (d < minDistance) {
          minDistance = d;
          closestLine = tLine;
        }
      }
    }

    if (!closestLine) return null;
    return {
      line: closestLine,
      distanceKm: Math.round(minDistance),
      isNear: minDistance <= 450,
    };
  }, [relocationTarget, transitLines]);

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 w-[95%] max-w-4xl bg-slate-950/95 backdrop-blur-md border border-cyan-500/30 shadow-2xl rounded-2xl p-3 animate-fadeIn">
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Title & Live Status */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 text-sm">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-xs text-cyan-200 tracking-wide uppercase">
                Planetary Transits Astrocartography
              </h3>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                Live Dynamic Ephemeris
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Temporal sky transit lines overlaid against your natal chart lines
            </div>
          </div>
        </div>

        {/* Date Time Controls */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 px-2 py-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => shiftMonths(-1)}
            className="px-2 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-mono text-[11px] cursor-pointer"
            title="Backward 1 Month"
          >
            -1M
          </button>
          <button
            onClick={() => shiftDays(-1)}
            className="px-2 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-mono text-[11px] cursor-pointer"
            title="Backward 1 Day"
          >
            -1D
          </button>

          <input
            type="date"
            value={dateString}
            onChange={handleDateChange}
            className="bg-slate-950 border border-slate-700 px-2 py-1 rounded text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-400"
          />

          <span className="text-slate-500 font-mono text-[11px] hidden sm:inline">{timeString} UTC</span>

          <button
            onClick={() => shiftDays(1)}
            className="px-2 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-mono text-[11px] cursor-pointer"
            title="Forward 1 Day"
          >
            +1D
          </button>
          <button
            onClick={() => shiftMonths(1)}
            className="px-2 py-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-mono text-[11px] cursor-pointer"
            title="Forward 1 Month"
          >
            +1M
          </button>

          <button
            onClick={() => onChangeTransitDate(new Date())}
            className="ml-1 px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 font-semibold border border-cyan-500/40 text-[11px] transition cursor-pointer"
          >
            Now
          </button>
        </div>

        {/* Action / Close */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-[11px] font-mono transition cursor-pointer"
          >
            {isExpanded ? 'Hide Details ▲' : 'Transit Details ▼'}
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition text-sm cursor-pointer"
            title="Close Transits Overlay"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Proximity Strip: Transits relative to Birthplace & Relocation Target */}
      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Birthplace transit status */}
          {birthplace && (
            <div
              onClick={() => onFocusCoordinates && onFocusCoordinates(birthplace.coordinates)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                birthplaceTransit?.isNear
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400'
              }`}
            >
              <span className="font-mono text-[10px] uppercase text-slate-500">Birthplace ({birthplace.name}):</span>
              {birthplaceTransit?.isNear ? (
                <span className="font-semibold text-amber-300 flex items-center gap-1">
                  ⚡ Transiting {birthplaceTransit.line.planetId.toUpperCase()} {birthplaceTransit.line.angle} ({birthplaceTransit.distanceKm} km)
                </span>
              ) : (
                <span className="text-slate-400">
                  ○ Quiescent (Nearest line {birthplaceTransit?.distanceKm || '—'} km away)
                </span>
              )}
            </div>
          )}

          {/* Relocation Target transit status */}
          {relocationTarget ? (
            <div
              onClick={() => onFocusCoordinates && onFocusCoordinates(relocationTarget.coordinates)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                relocationTransit?.isNear
                  ? 'bg-purple-500/20 border-purple-500/40 text-purple-200'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400'
              }`}
            >
              <span className="font-mono text-[10px] uppercase text-purple-400">Relocation ({relocationTarget.name}):</span>
              {relocationTransit?.isNear ? (
                <span className="font-semibold text-purple-300 flex items-center gap-1">
                  ✦ Transiting {relocationTransit.line.planetId.toUpperCase()} {relocationTransit.line.angle} ({relocationTransit.distanceKm} km)
                </span>
              ) : (
                <span className="text-slate-400">
                  ○ Quiescent (Nearest line {relocationTransit?.distanceKm || '—'} km away)
                </span>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-slate-500 font-mono hidden md:inline">
              Set a Relocation Target to monitor transit impacts on your destination
            </span>
          )}
        </div>

        {transitTriggers.length > 0 && (
          <div className="text-[11px] font-mono text-cyan-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            {transitTriggers.length} Active Crossings Worldwide
          </div>
        )}
      </div>

      {/* Expandable Triggers Bar */}
      {isExpanded && transitTriggers.length > 0 && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-800/80 space-y-2">
          <div className="text-slate-400 text-[11px] font-mono flex items-center justify-between">
            <span>Global Transit × Natal Line Intersections (Click to focus):</span>
            <span className="text-[10px] text-slate-500">Orbs calculated for {dateString}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
            {transitTriggers.map((trig) => {
              const tDef = PLANET_DEFINITIONS[trig.transitPlanet];
              const nDef = PLANET_DEFINITIONS[trig.natalPlanet];
              return (
                <button
                  key={trig.id}
                  onClick={() => onSelectTransitTrigger(trig)}
                  className="p-2 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/40 text-left transition text-xs space-y-1 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white flex items-center gap-1">
                      <span style={{ color: tDef?.color || '#38bdf8' }}>{tDef?.symbol} {trig.transitAngle}</span>
                      <span className="text-slate-500">×</span>
                      <span style={{ color: nDef?.color || '#f59e0b' }}>{nDef?.symbol} {trig.natalAngle}</span>
                    </span>
                    {trig.nearestCity && (
                      <span className="text-slate-400 text-[10px] font-mono truncate max-w-[100px]">
                        {trig.nearestCity}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{trig.description}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
