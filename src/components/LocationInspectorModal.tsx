import React, { useState, useEffect, useMemo } from 'react';
import {
  AstrocartographyLine,
  CityData,
  Coordinates,
  LifeCategory,
  LocationScore,
  ParanLine,
  PlanetaryCrossing,
  PlanetId,
  RelocationComparison,
  RelocationVerdict,
} from '../types/astronomy';
import { ANGLE_DEFINITIONS, LIFE_CATEGORIES_META, PLANET_DEFINITIONS } from '../constants/celestialData';
import { PLANET_ANGLE_INTERPRETATIONS } from '../engine/interpretations';
import { evaluateRelocationVerdict } from '../engine/locationScoring';

interface LocationInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  coordinates: Coordinates;
  city?: CityData | null;
  score: LocationScore;
  relocation?: RelocationComparison | null;
  selectedLine?: AstrocartographyLine | null;
  selectedCrossing?: PlanetaryCrossing | null;
  radiusKm: number;
  onRadiusChange: (km: number) => void;
  onSaveLocation: (city: CityData | Coordinates) => void;
  isSaved?: boolean;
  onSetRelocationTarget?: (city: CityData | Coordinates) => void;
  isRelocationTarget?: boolean;
  transitLines?: AstrocartographyLine[];
  showTransits?: boolean;
}

// Spherical distance between two coordinates in km
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

export const LocationInspectorModal: React.FC<LocationInspectorModalProps> = ({
  isOpen,
  onClose,
  coordinates,
  city,
  score,
  relocation,
  selectedLine,
  selectedCrossing,
  radiusKm,
  onRadiusChange,
  onSaveLocation,
  isSaved = false,
  onSetRelocationTarget,
  isRelocationTarget = false,
  transitLines = [],
  showTransits = false,
}) => {
  const [activeTab, setActiveTab] = useState<'synthesis' | 'interpretations' | 'relocation' | 'parans' | 'transits'>('synthesis');
  const [selectedCategory, setSelectedCategory] = useState<LifeCategory>('career');
  const [copiedReport, setCopiedReport] = useState(false);

  // Close with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const locationTitle = city ? `${city.name}, ${city.country}` : `Location (${coordinates.lat.toFixed(2)}°, ${coordinates.lng.toFixed(2)}°)`;

  // Compute effective verdict
  const verdict: RelocationVerdict = useMemo(() => {
    if (relocation?.verdict) return relocation.verdict;
    if (relocation) return evaluateRelocationVerdict(relocation, score);
    return evaluateRelocationVerdict(
      {
        targetCity: city || { id: 'custom_loc', name: 'Location', country: '', lat: coordinates.lat, lng: coordinates.lng, timezone: '', population: 0 },
        natalAngles: { ascendant: 0, midheaven: 0, descendant: 0, imumCoeli: 0, houses: [] },
        relocatedAngles: { ascendant: 0, midheaven: 0, descendant: 0, imumCoeli: 0, houses: [] },
        natalPositions: [],
        relocatedPositions: [],
        significantShifts: [],
      },
      score
    );
  }, [relocation, score, city, coordinates]);

  const handleExportReport = () => {
    let report = `=======================================================\n`;
    report += `ASTROCARTOGRAPHY RELOCATION REPORT: ${locationTitle.toUpperCase()}\n`;
    report += `Coordinates: Lat ${coordinates.lat.toFixed(2)}°, Lng ${coordinates.lng.toFixed(2)}°\n`;
    report += `=======================================================\n\n`;
    report += `RELOCATION VERDICT: ${verdict.badgeLabel.toUpperCase()} (Grade: ${verdict.grade})\n`;
    report += `Power Quotient Score: ${verdict.score}/100\n`;
    report += `Status: ${verdict.status.toUpperCase()}\n\n`;
    report += `EXECUTIVE SUMMARY:\n${verdict.summary}\n\n`;
    report += `-------------------------------------------------------\n`;
    report += `AUSPICIOUS FACTORS & ADVANTAGES (PROS):\n`;
    verdict.pros.forEach((p) => {
      report += `  ${p}\n`;
    });
    report += `\nCAUTION & FRICTION FACTORS (CONS):\n`;
    verdict.cons.forEach((c) => {
      report += `  ${c}\n`;
    });
    if (relocation && relocation.significantShifts.length > 0) {
      report += `\n-------------------------------------------------------\n`;
      report += `PLANETARY HOUSE & ANGLE SHIFTS (NATAL vs RELOCATED):\n`;
      relocation.significantShifts.forEach((s) => {
        report += `  - ${PLANET_DEFINITIONS[s.planetId]?.name}: Natal House ${s.natalHouse} -> Relocated House ${s.relocatedHouse}${
          s.angularType ? ` (Conjunction to ${s.angularType} at ${s.angularProximityDeg}°)` : ''
        }\n`;
        report += `    ${s.interpretation}\n`;
      });
    }
    report += `\n-------------------------------------------------------\n`;
    report += `ACTIVE PLANETARY POWER LINES (Within ${radiusKm} km):\n`;
    score.topInfluences.forEach((inf) => {
      report += `  - ${PLANET_DEFINITIONS[inf.planetId]?.name} on ${inf.angle} (${inf.distanceKm} km away, ${inf.polarity.toUpperCase()}): ${inf.summary}\n`;
    });
    report += `\nGenerated by Astrocartography High-Precision Studio\n`;

    navigator.clipboard.writeText(report);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 3000);
  };

  if (!isOpen) return null;

  // Compute nearby active transit lines
  const nearbyTransits = transitLines
    .map((tLine) => {
      let minDistance = Infinity;
      for (const pt of tLine.points) {
        const d = calculateSphericalDistance(coordinates, pt);
        if (d < minDistance) minDistance = d;
      }
      return { line: tLine, distanceKm: Math.round(minDistance) };
    })
    .filter((item) => item.distanceKm <= 750)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const activeTransitImpacts = nearbyTransits.filter((item) => item.distanceKm <= 450);

  return (
    <div className="fixed top-16 bottom-3 right-3 z-40 w-full max-w-xl md:max-w-2xl flex flex-col pointer-events-none animate-slideInRight">
      <div
        id="location-inspector-drawer"
        className="w-full h-full bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl pointer-events-auto flex flex-col text-slate-100 overflow-hidden"
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-serif font-bold text-white tracking-wide">{locationTitle}</h2>
              {city && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {city.timezone}
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 mt-0.5 font-mono flex items-center gap-2">
              <span>Lat: {coordinates.lat.toFixed(2)}° • Lng: {coordinates.lng.toFixed(2)}°</span>
              {isRelocationTarget && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  Active Relocation Target
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Set as Relocation Target Button */}
            {onSetRelocationTarget && (
              <button
                id="btn-set-relocation-target"
                onClick={() => onSetRelocationTarget(city || coordinates)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition border cursor-pointer ${
                  isRelocationTarget
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-sm shadow-purple-500/20'
                    : 'bg-slate-800 hover:bg-purple-950/60 text-slate-200 hover:text-purple-300 border-slate-700 hover:border-purple-500/40'
                }`}
                title={isRelocationTarget ? 'Currently set as your relocation target' : 'Set this city as your relocation destination to compare chart houses'}
              >
                <span>✦</span>
                <span>{isRelocationTarget ? 'Target Relocation' : 'Set as Relocation'}</span>
              </button>
            )}

            {/* Save Location Button */}
            <button
              id="btn-save-favorite"
              onClick={() => onSaveLocation(city || coordinates)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition border cursor-pointer ${
                isSaved
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
              title={isSaved ? 'Remove from saved spots' : 'Save this location'}
            >
              <span>{isSaved ? '★' : '☆'}</span>
            </button>

            {/* Close Button */}
            <button
              id="btn-close-inspector"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              title="Close inspector"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-3 sm:px-5 gap-2 sm:gap-4 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('synthesis')}
            className={`py-2.5 text-[11px] sm:text-xs font-semibold tracking-wider uppercase border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'synthesis'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Locational Score
          </button>
          <button
            onClick={() => setActiveTab('interpretations')}
            className={`py-2.5 text-[11px] sm:text-xs font-semibold tracking-wider uppercase border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'interpretations'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Line Meanings ({score.topInfluences.length})
          </button>
          <button
            onClick={() => setActiveTab('relocation')}
            className={`py-2.5 text-[11px] sm:text-xs font-semibold tracking-wider uppercase border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'relocation'
                ? 'border-purple-400 text-purple-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Relocation Shift
          </button>
          <button
            onClick={() => setActiveTab('transits')}
            className={`py-2.5 text-[11px] sm:text-xs font-semibold tracking-wider uppercase border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'transits'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Live Transits {activeTransitImpacts.length > 0 && `(${activeTransitImpacts.length})`}
          </button>
          <button
            onClick={() => setActiveTab('parans')}
            className={`py-2.5 text-[11px] sm:text-xs font-semibold tracking-wider uppercase border-b-2 whitespace-nowrap transition cursor-pointer ${
              activeTab === 'parans'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Parans & Crossings ({score.activeParans.length + score.nearbyCrossings.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
          {/* TAB 1: SYNTHESIS & SCORING */}
          {activeTab === 'synthesis' && (
            <div className="space-y-6">
              {/* Overall Locational Power Card */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800/80 border border-slate-700/80 flex items-center justify-between shadow-lg">
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-400 font-mono">
                    Locational Power Quotient
                  </div>
                  <div className="text-2xl font-serif font-bold text-amber-300 mt-1">
                    {score.overallScore} / 100
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {score.topInfluences.length} active planetary power line(s) within {radiusKm} km
                  </div>
                </div>

                {/* Adjustable Orb Radius Slider */}
                <div className="flex flex-col items-end gap-1.5">
                  <div className="text-xs text-slate-300 font-mono">
                    Influence Radius: <span className="text-amber-300 font-bold">{radiusKm} km</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="1200"
                    step="50"
                    value={radiusKm}
                    onChange={(e) => onRadiusChange(Number(e.target.value))}
                    className="w-32 sm:w-36 accent-amber-400 cursor-pointer"
                  />
                  <div className="flex justify-between w-32 sm:w-36 text-[10px] text-slate-500 font-mono">
                    <span>50 km</span>
                    <span>1200 km</span>
                  </div>
                </div>
              </div>

              {/* High-Visibility Relocation Verdict Card (Good vs Bad Assessment) */}
              <div
                className={`p-4 rounded-xl border transition-all ${
                  verdict.grade === 'A+' || verdict.grade === 'A'
                    ? 'bg-emerald-950/30 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                    : verdict.grade === 'B'
                    ? 'bg-sky-950/30 border-sky-500/50 shadow-lg shadow-sky-500/10'
                    : verdict.grade === 'C'
                    ? 'bg-amber-950/30 border-amber-500/50 shadow-lg shadow-amber-500/10'
                    : 'bg-rose-950/30 border-rose-500/50 shadow-lg shadow-rose-500/10'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`text-xl font-bold font-mono px-3 py-1 rounded-lg border shadow-sm ${
                        verdict.grade === 'A+' || verdict.grade === 'A'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400'
                          : verdict.grade === 'B'
                          ? 'bg-sky-500/20 text-sky-300 border-sky-400'
                          : verdict.grade === 'C'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-400'
                          : 'bg-rose-500/20 text-rose-300 border-rose-400'
                      }`}
                    >
                      {verdict.grade}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-sm">{verdict.badgeLabel}</span>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                            verdict.grade === 'A+' || verdict.grade === 'A'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : verdict.grade === 'B'
                              ? 'bg-sky-500/20 text-sky-300'
                              : verdict.grade === 'C'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {verdict.status === 'exceptional' || verdict.status === 'favorable'
                            ? '✓ Highly Recommended'
                            : verdict.status === 'balanced'
                            ? '• Balanced Harmony'
                            : verdict.status === 'mixed'
                            ? '⚠️ Mixed Dynamics'
                            : '⚠️ High Friction'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{verdict.summary}</p>
                    </div>
                  </div>

                  {/* Export Relocation Report Button */}
                  <button
                    onClick={handleExportReport}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0"
                    title="Export clean side-by-side relocation report to clipboard"
                  >
                    <span>📄</span>
                    <span>{copiedReport ? '✓ Report Copied!' : 'Export Relocation Report'}</span>
                  </button>
                </div>

                {/* Specific Pros and Cons Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-900/80 border border-emerald-500/20 space-y-1.5">
                    <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                      <span>✓</span>
                      <span>Auspicious Aspects (Why It's Good)</span>
                    </div>
                    <ul className="space-y-1 text-slate-300">
                      {verdict.pros.map((pro, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-emerald-400 shrink-0">•</span>
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-900/80 border border-rose-500/20 space-y-1.5">
                    <div className="font-semibold text-rose-300 flex items-center gap-1.5">
                      <span>⚠️</span>
                      <span>Friction & Caution Points (Why It's Challenging)</span>
                    </div>
                    <ul className="space-y-1 text-slate-300">
                      {verdict.cons.map((con, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-rose-400 shrink-0">•</span>
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Life Domain Breakdown */}
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 mb-3">
                  Life Domain Potencies
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(Object.keys(score.categories) as LifeCategory[]).map((catKey) => {
                    const catMeta = LIFE_CATEGORIES_META[catKey];
                    const catScore = score.categories[catKey];
                    return (
                      <div
                        key={catKey}
                        onClick={() => setSelectedCategory(catKey)}
                        className={`p-3 rounded-xl border transition cursor-pointer ${
                          selectedCategory === catKey
                            ? 'bg-slate-800 border-amber-500/50 shadow-md shadow-amber-500/10'
                            : 'bg-slate-950/60 border-slate-800 hover:bg-slate-850 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm">{catMeta.icon}</span>
                            <span className="text-xs font-semibold text-white">{catMeta.label}</span>
                          </div>
                          <span className="font-mono text-xs font-bold text-amber-300">{catScore}%</span>
                        </div>
                        <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${catScore}%`, backgroundColor: catMeta.color }}
                          />
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1.5 line-clamp-1">{catMeta.description}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DEEP LINE INTERPRETATIONS */}
          {activeTab === 'interpretations' && (
            <div className="space-y-4">
              {score.topInfluences.length === 0 ? (
                <div className="text-center py-10 text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800 p-6">
                  <div className="text-2xl mb-2">🪐</div>
                  <div className="text-sm font-medium text-slate-300">No Major Planetary Lines in Immediate Vicinity</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Try expanding the influence radius slider above to include wider planetary orbs.
                  </div>
                </div>
              ) : (
                score.topInfluences.map((inf, idx) => {
                  const pDef = PLANET_DEFINITIONS[inf.planetId];
                  const angDef = ANGLE_DEFINITIONS[inf.angle];
                  const deepInterp = PLANET_ANGLE_INTERPRETATIONS[inf.planetId]?.[inf.angle];

                  return (
                    <div
                      key={`inf_${idx}`}
                      className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold shadow-sm"
                            style={{ backgroundColor: `${pDef.color}25`, color: pDef.color }}
                          >
                            {pDef.symbol}
                          </span>
                          <div>
                            <div className="text-xs font-bold text-white tracking-wide">
                              {pDef.name} on {inf.angle} ({angDef.name})
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              Distance: {inf.distanceKm} km from line • Orb: ~{(inf.distanceKm / 111).toFixed(1)}°
                            </div>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                            inf.polarity === 'harmonious'
                              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              : inf.polarity === 'challenging'
                              ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                              : 'bg-slate-500/10 text-slate-300 border-slate-500/30'
                          }`}
                        >
                          {inf.polarity}
                        </span>
                      </div>

                      <p className="text-xs text-slate-200 leading-relaxed font-sans">{inf.summary}</p>

                      {deepInterp && (
                        <div className="pt-2 border-t border-slate-800/60 text-xs text-slate-300 space-y-2">
                          <div>
                            <strong className="text-amber-300 text-[11px] font-mono uppercase tracking-wider block mb-0.5">
                              Vibrational Atmosphere & Psychological Shift:
                            </strong>
                            <p className="text-[11px] text-slate-400 leading-relaxed">{deepInterp.generalSynthesis}</p>
                          </div>
                          <div>
                            <strong className="text-cyan-300 text-[11px] font-mono uppercase tracking-wider block mb-0.5">
                              Career, Wealth & Real-World Opportunities:
                            </strong>
                            <p className="text-[11px] text-slate-400 leading-relaxed">{deepInterp.categoryBreakdown?.career || deepInterp.harmoniousManifestation}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: RELOCATION SHIFT */}
          {activeTab === 'relocation' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-white text-sm">✦ Relocation Chart Shift Analysis</span>
                  {onSetRelocationTarget && (
                    <button
                      onClick={() => onSetRelocationTarget(city || coordinates)}
                      className={`px-2.5 py-1 rounded text-[11px] font-semibold transition cursor-pointer border ${
                        isRelocationTarget
                          ? 'bg-purple-500/30 text-purple-200 border-purple-400'
                          : 'bg-purple-600 hover:bg-purple-500 text-white border-transparent shadow'
                      }`}
                    >
                      {isRelocationTarget ? '✓ Active Relocation Target' : 'Set as Relocation Target'}
                    </button>
                  )}
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  When you physically relocate, your birth time remains unchanged, but the local horizon rotates. This shifts which zodiac signs occupy your 4 cardinal angles and moves your natal planets into different astrological houses of life.
                </p>
              </div>

              {relocation ? (
                <>
                  {/* Relocated Cardinal Angles */}
                  <div>
                    <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 mb-2.5">
                      Relocated Cardinal Angles (Local Horizon)
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">ASCENDANT (1st)</span>
                        <span className="text-emerald-300 font-bold">{relocation.relocatedAngles.ascendant.toFixed(1)}°</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">MIDHEAVEN (10th)</span>
                        <span className="text-amber-300 font-bold">{relocation.relocatedAngles.midheaven.toFixed(1)}°</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">DESCENDANT (7th)</span>
                        <span className="text-sky-300 font-bold">{relocation.relocatedAngles.descendant.toFixed(1)}°</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">IMUM COELI (4th)</span>
                        <span className="text-purple-300 font-bold">{relocation.relocatedAngles.imumCoeli.toFixed(1)}°</span>
                      </div>
                    </div>
                  </div>

                  {/* Significant House & Angle Shifts */}
                  <div>
                    <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 mb-2.5">
                      Planetary House Placements & Angular Changes Here
                    </h3>

                    <div className="space-y-3">
                      {relocation.significantShifts.map((shift, idx) => {
                        const pDef = PLANET_DEFINITIONS[shift.planetId];
                        return (
                          <div
                            key={`shift_${idx}`}
                            className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-start gap-3.5"
                          >
                            <span
                              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0"
                              style={{ backgroundColor: `${pDef.color}20`, color: pDef.color }}
                            >
                              {pDef.symbol}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-white">{pDef.name}</span>
                                <span className="text-xs font-mono text-slate-400">
                                  House {shift.natalHouse} → <strong className="text-amber-300">House {shift.relocatedHouse}</strong>
                                </span>
                                {shift.angularType && (
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                    Conjunction to {shift.angularType} (Orb {shift.angularProximityDeg}°)
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{shift.interpretation}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Clean Side-by-Side Natal vs Relocated Comparison Table */}
                  {relocation.natalPositions && relocation.relocatedPositions && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300">
                          Side-by-Side Natal vs Relocated Placements
                        </h3>
                        <button
                          onClick={handleExportReport}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-mono flex items-center gap-1 transition cursor-pointer border border-slate-700"
                        >
                          <span>📄</span>
                          <span>{copiedReport ? '✓ Copied' : 'Export Side-by-Side'}</span>
                        </button>
                      </div>

                      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60">
                        <table className="w-full text-left text-xs font-mono">
                          <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                            <tr>
                              <th className="p-2.5">Body</th>
                              <th className="p-2.5">Zodiac</th>
                              <th className="p-2.5 text-center">Natal House</th>
                              <th className="p-2.5 text-center text-amber-300">Relocated House</th>
                              <th className="p-2.5">Shift Impact</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 text-slate-300">
                            {relocation.natalPositions.map((natPos, i) => {
                              const relPos = relocation.relocatedPositions[i];
                              const pDef = PLANET_DEFINITIONS[natPos.planetId];
                              const isShifted = natPos.house !== relPos?.house;
                              const shift = relocation.significantShifts.find((s) => s.planetId === natPos.planetId);

                              return (
                                <tr key={natPos.planetId} className={`hover:bg-slate-850/50 ${isShifted ? 'bg-amber-950/10' : ''}`}>
                                  <td className="p-2.5 flex items-center gap-2">
                                    <span style={{ color: pDef.color }}>{pDef.symbol}</span>
                                    <span className="text-white font-sans font-medium">{pDef.name}</span>
                                  </td>
                                  <td className="p-2.5 text-slate-400">
                                    {natPos.degreeInSign}° {natPos.sign}
                                  </td>
                                  <td className="p-2.5 text-center text-slate-400">
                                    House {natPos.house}
                                  </td>
                                  <td className="p-2.5 text-center font-bold text-amber-300">
                                    House {relPos?.house}
                                  </td>
                                  <td className="p-2.5 text-[11px] font-sans">
                                    {shift?.angularType ? (
                                      <span className="text-amber-300 font-semibold">
                                        Conjunct {shift.angularType} ({shift.angularProximityDeg}°)
                                      </span>
                                    ) : isShifted ? (
                                      <span className="text-slate-300">
                                        House {natPos.house} → {relPos?.house}
                                      </span>
                                    ) : (
                                      <span className="text-slate-500">Unchanged</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-slate-400 bg-slate-950/40 rounded-xl border border-slate-800 p-6">
                  Set this location as your Relocation Target to calculate complete relocated astrological houses.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: LIVE TRANSITS */}
          {activeTab === 'transits' && (
            <div className="space-y-4">
              {activeTransitImpacts.length > 0 ? (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 flex items-center gap-3">
                    <span className="text-lg">⚡</span>
                    <div>
                      <div className="text-xs font-bold text-cyan-200 uppercase tracking-wide">
                        Active Dynamic Transit Corridor ({activeTransitImpacts.length} Active Triggers)
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        Current planetary transit lines in the sky are actively crossing within orb (~450 km) of this location.
                      </div>
                    </div>
                  </div>

                  {activeTransitImpacts.map((tItem, idx) => {
                    const pDef = PLANET_DEFINITIONS[tItem.line.planetId];
                    const angDef = ANGLE_DEFINITIONS[tItem.line.angle];

                    return (
                      <div
                        key={`transit_${idx}`}
                        className="p-4 rounded-xl bg-slate-950/70 border border-cyan-500/30 space-y-2"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-cyan-400 font-bold text-sm">⚡</span>
                            <span className="font-semibold text-xs text-white">
                              Transiting {pDef?.name || tItem.line.planetId.toUpperCase()} on {tItem.line.angle} ({angDef?.name || ''})
                            </span>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                            Within {tItem.distanceKm} km (Orb ~{(tItem.distanceKm / 111).toFixed(1)}°)
                          </span>
                        </div>

                        <p className="text-xs text-slate-200 leading-relaxed">
                          {tItem.line.description}
                        </p>

                        <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-800/60 font-sans">
                          <strong className="text-cyan-300 font-mono uppercase text-[10px] block mb-0.5">
                            Practical Manifestation:
                          </strong>
                          Dynamic window for breakthrough activity, geographic visits, relocation decisions, or conscious initiation matching this planet's archetype.
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-950/50 border border-slate-800 text-center space-y-3">
                  <div className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-slate-400 text-lg">
                    ○
                  </div>
                  <div>
                    <h4 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
                      Quiescent Transit Zone (No Active Triggers)
                    </h4>
                    <p className="text-xs text-slate-400 mt-1.5 max-w-md mx-auto leading-relaxed">
                      Currently, no dynamic planetary transit lines in the sky pass within active orb (~450 km) of this location. The astrological field here is peaceful and completely grounded in your permanent natal planetary lines without sudden disruptive transit triggers.
                    </p>
                  </div>
                  {nearbyTransits.length > 0 && (
                    <div className="text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800/80">
                      Nearest transit: {nearbyTransits[0].line.planetId.toUpperCase()} on {nearbyTransits[0].line.angle} ({nearbyTransits[0].distanceKm} km away).
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: PARANS & CROSSINGS */}
          {activeTab === 'parans' && (
            <div className="space-y-6">
              {/* Active Parans */}
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 mb-2">
                  Active Horizontal Parans (Simultaneous Angular Transits)
                </h3>
                {score.activeParans.length === 0 ? (
                  <div className="text-xs text-slate-400 p-3 bg-slate-950/50 rounded border border-slate-800">
                    No major parans directly intercept this latitude.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {score.activeParans.map((p) => (
                      <div key={p.id} className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-bold text-white">{p.title}</div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            Lat: {p.latitude}°
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">{p.interpretation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Nearby Crossings */}
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 mb-2">
                  Nearby Planetary Line Crossings (Intersections)
                </h3>
                {score.nearbyCrossings.length === 0 ? (
                  <div className="text-xs text-slate-400 p-3 bg-slate-950/50 rounded border border-slate-800">
                    No major planetary line intersections within {radiusKm} km.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {score.nearbyCrossings.map((c) => (
                      <div key={c.id} className="p-3 rounded-lg bg-slate-950/70 border border-slate-800 flex justify-between items-center">
                        <div>
                          <div className="text-xs font-bold text-white">{c.summary}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Coordinates: {c.lat}°, {c.lng}° {c.nearestCity ? `• Near ${c.nearestCity}` : ''}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                            c.polarity === 'harmonious'
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                              : 'bg-red-500/10 text-red-300 border border-red-500/30'
                          }`}
                        >
                          {c.polarity}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
