import React, { useState } from 'react';
import { AstrologicalAspect, ChartAngles, CityData, PlanetPosition, ZodiacSign } from '../types/astronomy';
import { PLANET_DEFINITIONS, ZODIAC_SIGNS } from '../constants/celestialData';

interface ChartWheelProps {
  natalPositions: PlanetPosition[];
  natalAngles: ChartAngles;
  relocatedPositions?: PlanetPosition[];
  relocatedAngles?: ChartAngles;
  selectedCity?: CityData | null;
  aspects: AstrologicalAspect[];
  birthCityName: string;
}

export const ChartWheel: React.FC<ChartWheelProps> = ({
  natalPositions,
  natalAngles,
  relocatedPositions,
  relocatedAngles,
  selectedCity,
  aspects,
  birthCityName,
}) => {
  const [activeTab, setActiveTab] = useState<'natal' | 'relocated' | 'comparison'>('natal');
  const [selectedPlanet, setSelectedPlanet] = useState<PlanetPosition | null>(null);

  const displayPositions = activeTab === 'relocated' && relocatedPositions ? relocatedPositions : natalPositions;
  const displayAngles = activeTab === 'relocated' && relocatedAngles ? relocatedAngles : natalAngles;

  // Chart Dimensions
  const size = 420;
  const center = size / 2;
  const radius = size * 0.44;
  const zodiacOuterR = radius;
  const zodiacInnerR = radius * 0.82;
  const housesInnerR = radius * 0.64;
  const centerR = radius * 0.48;

  // Orient wheel so Ascendant is always at 9 o'clock (180 degrees in standard SVG or 0 in astrological orientation)
  const ascOffset = displayAngles.ascendant;

  // Convert zodiac longitude (0 to 360) to SVG angle (degrees)
  const lonToSvgAngle = (lon: number) => {
    // In standard astrology chart wheel, 180° is West (Ascendant is left, at 180° math or 9 o'clock)
    // Degrees increase counter-clockwise
    const relDeg = (lon - ascOffset + 360) % 360;
    const svgAngle = 180 - relDeg; // 0 is 3 o'clock (Descendant), 180 is 9 o'clock (Ascendant)
    return (svgAngle * Math.PI) / 180;
  };

  // Calculate Element & Modality Balances
  const elementCounts = { Fire: 0, Earth: 0, Air: 0, Water: 0 };
  const modalityCounts = { Cardinal: 0, Fixed: 0, Mutable: 0 };

  for (const p of displayPositions) {
    const signMeta = ZODIAC_SIGNS.find((z) => z.sign === p.sign);
    if (signMeta) {
      elementCounts[signMeta.element]++;
      modalityCounts[signMeta.modality]++;
    }
  }

  return (
    <div className="flex flex-col gap-4 text-slate-200">
      {/* Chart View Mode Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('natal')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition ${
              activeTab === 'natal'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Natal ({birthCityName})
          </button>
          {relocatedPositions && selectedCity && (
            <button
              onClick={() => setActiveTab('relocated')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                activeTab === 'relocated'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Relocated ({selectedCity.name})
            </button>
          )}
          {relocatedPositions && selectedCity && (
            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition ${
                activeTab === 'comparison'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Dual Overlay
            </button>
          )}
        </div>

        <div className="text-xs font-mono text-slate-400">
          ASC: {displayAngles.ascendant.toFixed(1)}° | MC: {displayAngles.midheaven.toFixed(1)}°
        </div>
      </div>

      {/* SVG Chart Wheel */}
      <div className="relative flex justify-center items-center py-2">
        <svg width={size} height={size} className="overflow-visible select-none">
          {/* Background circle */}
          <circle cx={center} cy={center} r={zodiacOuterR} fill="#020617" stroke="#334155" strokeWidth="1.5" />

          {/* 12 Zodiac Segments Ring */}
          {ZODIAC_SIGNS.map((z, idx) => {
            const startAngle = lonToSvgAngle(idx * 30);
            const endAngle = lonToSvgAngle((idx + 1) * 30);
            const midAngle = lonToSvgAngle(idx * 30 + 15);

            const x1Out = center + zodiacOuterR * Math.cos(startAngle);
            const y1Out = center + zodiacOuterR * Math.sin(startAngle);
            const x2Out = center + zodiacOuterR * Math.cos(endAngle);
            const y2Out = center + zodiacOuterR * Math.sin(endAngle);

            const x1In = center + zodiacInnerR * Math.cos(startAngle);
            const y1In = center + zodiacInnerR * Math.sin(startAngle);
            const x2In = center + zodiacInnerR * Math.cos(endAngle);
            const y2In = center + zodiacInnerR * Math.sin(endAngle);

            const labelX = center + ((zodiacOuterR + zodiacInnerR) / 2) * Math.cos(midAngle);
            const labelY = center + ((zodiacOuterR + zodiacInnerR) / 2) * Math.sin(midAngle) + 4;

            const pathD = `M ${x1Out} ${y1Out} A ${zodiacOuterR} ${zodiacOuterR} 0 0 0 ${x2Out} ${y2Out} L ${x2In} ${y2In} A ${zodiacInnerR} ${zodiacInnerR} 0 0 1 ${x1In} ${y1In} Z`;

            return (
              <g key={z.sign}>
                <path
                  d={pathD}
                  fill={idx % 2 === 0 ? 'rgba(30, 41, 59, 0.6)' : 'rgba(15, 23, 42, 0.7)'}
                  stroke="#334155"
                  strokeWidth="0.8"
                />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  fill={z.color}
                  fontSize="12"
                  fontWeight="600"
                  fontFamily="system-ui"
                >
                  {z.symbol}
                </text>
              </g>
            );
          })}

          {/* 12 Houses Ring */}
          {displayAngles.houses.map((cuspLon, hIdx) => {
            const houseAngle = lonToSvgAngle(cuspLon);
            const nextAngle = lonToSvgAngle(displayAngles.houses[(hIdx + 1) % 12]);
            const midAngle = (houseAngle + nextAngle) / 2;

            const xOuter = center + zodiacInnerR * Math.cos(houseAngle);
            const yOuter = center + zodiacInnerR * Math.sin(houseAngle);
            const xInner = center + centerR * Math.cos(houseAngle);
            const yInner = center + centerR * Math.sin(houseAngle);

            const numX = center + ((housesInnerR + centerR) / 2) * Math.cos(midAngle);
            const numY = center + ((housesInnerR + centerR) / 2) * Math.sin(midAngle) + 4;

            return (
              <g key={`house_${hIdx}`}>
                {/* House cusp divider */}
                <line
                  x1={xOuter}
                  y1={yOuter}
                  x2={xInner}
                  y2={yInner}
                  stroke={hIdx % 3 === 0 ? '#f59e0b' : '#475569'}
                  strokeWidth={hIdx % 3 === 0 ? 1.8 : 0.8}
                  strokeDasharray={hIdx % 3 === 0 ? undefined : '2 2'}
                />
                {/* House Number */}
                <text
                  x={numX}
                  y={numY}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="9"
                  fontFamily="monospace"
                  opacity={0.8}
                >
                  {hIdx + 1}
                </text>
              </g>
            );
          })}

          {/* Inner Aspect Lines */}
          <circle cx={center} cy={center} r={centerR} fill="#030712" stroke="#1e293b" strokeWidth="1" />
          {aspects.slice(0, 16).map((asp, idx) => {
            const p1 = displayPositions.find((p) => p.planetId === asp.planet1);
            const p2 = displayPositions.find((p) => p.planetId === asp.planet2);
            if (!p1 || !p2) return null;

            const ang1 = lonToSvgAngle(p1.longitude);
            const ang2 = lonToSvgAngle(p2.longitude);
            const x1 = center + centerR * 0.96 * Math.cos(ang1);
            const y1 = center + centerR * 0.96 * Math.sin(ang1);
            const x2 = center + centerR * 0.96 * Math.cos(ang2);
            const y2 = center + centerR * 0.96 * Math.sin(ang2);

            let strokeColor = '#3b82f6'; // Trine/Sextile harmonious
            if (asp.aspectType === 'square' || asp.aspectType === 'opposition') {
              strokeColor = '#ef4444'; // Dynamic tension
            } else if (asp.aspectType === 'conjunction') {
              strokeColor = '#f59e0b';
            }

            return (
              <line
                key={`aspect_${idx}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={strokeColor}
                strokeWidth={asp.orb < 2 ? 1.5 : 0.8}
                opacity={Math.max(0.2, 1 - asp.orb / 8)}
              />
            );
          })}

          {/* Major Axis Lines: ASC - DSC and MC - IC */}
          <line
            x1={center - radius * 0.98}
            y1={center}
            x2={center + radius * 0.98}
            y2={center}
            stroke="#10b981"
            strokeWidth="2"
            opacity={0.8}
          />
          <line
            x1={center}
            y1={center - radius * 0.98}
            x2={center}
            y2={center + radius * 0.98}
            stroke="#f59e0b"
            strokeWidth="2"
            opacity={0.8}
          />

          {/* ASC & MC Labels */}
          <text x={center - radius * 1.05} y={center + 4} textAnchor="end" fill="#10b981" fontSize="10" fontWeight="bold" fontFamily="monospace">
            ASC
          </text>
          <text x={center + radius * 1.05} y={center + 4} textAnchor="start" fill="#10b981" fontSize="10" fontWeight="bold" fontFamily="monospace">
            DSC
          </text>
          <text x={center} y={center - radius * 1.03} textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="bold" fontFamily="monospace">
            MC
          </text>
          <text x={center} y={center + radius * 1.08} textAnchor="middle" fill="#f59e0b" fontSize="10" fontWeight="bold" fontFamily="monospace">
            IC
          </text>

          {/* Planetary Glyphs */}
          {displayPositions.map((pos) => {
            const planetAngle = lonToSvgAngle(pos.longitude);
            const pDef = PLANET_DEFINITIONS[pos.planetId];
            const pR = (zodiacInnerR + housesInnerR) / 2;
            const px = center + pR * Math.cos(planetAngle);
            const py = center + pR * Math.sin(planetAngle) + 4;
            const isSelected = selectedPlanet?.planetId === pos.planetId;

            return (
              <g
                key={pos.planetId}
                className="cursor-pointer transition-transform"
                onClick={() => setSelectedPlanet(pos)}
              >
                {isSelected && (
                  <circle cx={px} cy={py - 4} r={12} fill="none" stroke="#f59e0b" strokeWidth={1.5} />
                )}
                <text
                  x={px}
                  y={py}
                  textAnchor="middle"
                  fill={pDef.color}
                  fontSize="13"
                  fontWeight="bold"
                  className="hover:scale-125 transition-transform"
                >
                  {pos.symbol}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Planet or Quick Planetary List */}
      {selectedPlanet ? (
        <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className="w-7 h-7 flex items-center justify-center rounded-full text-base font-bold"
              style={{ backgroundColor: `${PLANET_DEFINITIONS[selectedPlanet.planetId].color}20`, color: PLANET_DEFINITIONS[selectedPlanet.planetId].color }}
            >
              {selectedPlanet.symbol}
            </span>
            <div>
              <div className="text-xs font-semibold text-white">
                {selectedPlanet.name} in {selectedPlanet.sign} {selectedPlanet.degreeInSign}°{selectedPlanet.minuteInSign}'
              </div>
              <div className="text-[11px] text-slate-400">
                House {selectedPlanet.house} • {PLANET_DEFINITIONS[selectedPlanet.planetId].archetype}
              </div>
            </div>
          </div>
          <button
            onClick={() => setSelectedPlanet(null)}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-slate-800 rounded"
          >
            Clear
          </button>
        </div>
      ) : (
        /* Element & Modality Balance Summary */
        <div className="grid grid-cols-2 gap-3 text-xs bg-slate-900/70 p-3 rounded-lg border border-slate-800/80">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
              Elemental Balance
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-red-400">Fire (Aries/Leo/Sag)</span>
                <span className="font-mono">{elementCounts.Fire}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-emerald-400">Earth (Tau/Vir/Cap)</span>
                <span className="font-mono">{elementCounts.Earth}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-cyan-400">Air (Gem/Lib/Aqu)</span>
                <span className="font-mono">{elementCounts.Air}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-blue-400">Water (Can/Sco/Pis)</span>
                <span className="font-mono">{elementCounts.Water}</span>
              </div>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">
              Modality Balance
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-amber-300">Cardinal (Initiative)</span>
                <span className="font-mono">{modalityCounts.Cardinal}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-purple-300">Fixed (Sustaining)</span>
                <span className="font-mono">{modalityCounts.Fixed}</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-teal-300">Mutable (Adaptive)</span>
                <span className="font-mono">{modalityCounts.Mutable}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
