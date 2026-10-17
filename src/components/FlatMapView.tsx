import React, { useRef, useState } from 'react';
import {
  AstrocartographyLine,
  CityData,
  Coordinates,
  GlobeViewMode,
  ParanLine,
  PlanetaryCrossing,
  PlanetId,
  TransitTrigger,
} from '../types/astronomy';
import { PLANET_DEFINITIONS } from '../constants/celestialData';
import { WORLD_CITIES } from '../constants/worldCities';

interface FlatMapViewProps {
  lines: AstrocartographyLine[];
  transitLines?: AstrocartographyLine[];
  transitTriggers?: TransitTrigger[];
  parans: ParanLine[];
  crossings: PlanetaryCrossing[];
  viewMode: GlobeViewMode;
  selectedCity?: CityData | null;
  activeLocation?: Coordinates | null;
  filteredPlanets: PlanetId[];
  filteredAngles: string[];
  showTransits?: boolean;
  onSelectLocation: (coord: Coordinates, city?: CityData) => void;
  onSelectLine: (line: AstrocartographyLine) => void;
  onSelectCrossing: (crossing: PlanetaryCrossing) => void;
  onSelectTransitTrigger?: (trigger: TransitTrigger) => void;
}

export const FlatMapView: React.FC<FlatMapViewProps> = ({
  lines,
  transitLines = [],
  transitTriggers = [],
  parans,
  crossings,
  viewMode,
  selectedCity,
  activeLocation,
  filteredPlanets,
  filteredAngles,
  showTransits = false,
  onSelectLocation,
  onSelectLine,
  onSelectCrossing,
  onSelectTransitTrigger,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const pointerDownRef = useRef({ x: 0, y: 0, time: 0 });
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);

  const mapWidth = 2048;
  const mapHeight = 1024;

  const toX = (lng: number) => ((lng + 180) / 360) * mapWidth;
  const toY = (lat: number) => ((90 - lat) / 180) * mapHeight;
  const toLatLng = (x: number, y: number): Coordinates => ({
    lat: 90 - (y / mapHeight) * 180,
    lng: (x / mapWidth) * 360 - 180,
  });

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    pointerDownRef.current = { x: e.clientX, y: e.clientY, time: Date.now() };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    setIsDragging(false);
    const dist = Math.hypot(e.clientX - pointerDownRef.current.x, e.clientY - pointerDownRef.current.y);
    const timeDiff = Date.now() - pointerDownRef.current.time;

    // Strict click threshold: movement < 6px and under 350ms duration
    if (dist < 6 && timeDiff < 350) {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = (e.clientX - rect.left - pan.x) / zoom;
      const clickY = (e.clientY - rect.top - pan.y) / zoom;
      const coords = toLatLng(clickX, clickY);

      if (coords.lat >= -85 && coords.lat <= 85 && coords.lng >= -180 && coords.lng <= 180) {
        onSelectLocation(coords);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoom((prev) => Math.max(0.75, Math.min(5.0, prev * zoomFactor)));
  };

  const isDayMode = viewMode === 'terrain' || viewMode === 'light';
  const mapTextureSrc = `${import.meta.env.BASE_URL}textures/${isDayMode ? 'earth-blue-marble.jpg' : 'earth-dark.jpg'}`;

  return (
    <div
      ref={containerRef}
      id="flat-map-container"
      className="relative w-full h-full bg-slate-950 overflow-hidden cursor-grab active:cursor-grabbing select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Hover Info Tooltip */}
      {hoveredLabel && (
        <div className="absolute top-4 left-4 z-20 pointer-events-none px-3.5 py-1.5 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700/60 shadow-xl text-xs font-mono text-cyan-300 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          {hoveredLabel}
        </div>
      )}

      {/* Navigation Controls */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-1.5 shadow-2xl">
        <button
          id="btn-flat-zoom-in"
          title="Zoom In"
          onClick={(e) => {
            e.stopPropagation();
            setZoom((z) => Math.min(5.0, z * 1.25));
          }}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition font-mono text-lg"
        >
          +
        </button>
        <button
          id="btn-flat-zoom-out"
          title="Zoom Out"
          onClick={(e) => {
            e.stopPropagation();
            setZoom((z) => Math.max(0.75, z * 0.8));
          }}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition font-mono text-lg"
        >
          −
        </button>
        <button
          id="btn-flat-reset"
          title="Reset Map View"
          onClick={(e) => {
            e.stopPropagation();
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition text-xs font-mono"
        >
          ⟲
        </button>
      </div>

      <svg
        width={mapWidth}
        height={mapHeight}
        className="transition-transform duration-75 origin-top-left"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        }}
      >
        {/* Authentic High-Res NASA Earth Equirectangular Satellite Image */}
        <image
          href={mapTextureSrc}
          width={mapWidth}
          height={mapHeight}
          preserveAspectRatio="none"
          opacity={isDayMode ? 0.95 : 0.85}
        />

        {/* Graticule Coordinates Grid */}
        <g stroke="rgba(56,189,248,0.18)" strokeWidth="1">
          {/* Equator */}
          <line x1={0} y1={mapHeight / 2} x2={mapWidth} y2={mapHeight / 2} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.4" />
          {/* Tropics */}
          <line x1={0} y1={toY(23.44)} x2={mapWidth} y2={toY(23.44)} strokeDasharray="3 4" opacity="0.3" />
          <line x1={0} y1={toY(-23.44)} x2={mapWidth} y2={toY(-23.44)} strokeDasharray="3 4" opacity="0.3" />
          {/* Greenwich Prime Meridian */}
          <line x1={mapWidth / 2} y1={0} x2={mapWidth / 2} y2={mapHeight} stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.4" />
          {/* Meridians every 30 deg */}
          {Array.from({ length: 13 }).map((_, i) => (
            <line key={`meridian_${i}`} x1={(i * mapWidth) / 12} y1={0} x2={(i * mapWidth) / 12} y2={mapHeight} opacity="0.15" />
          ))}
        </g>

        {/* Horizontal Parans */}
        <g id="parans-layer">
          {parans.map((paran) => {
            const y = toY(paran.latitude);
            return (
              <line
                key={paran.id}
                x1={0}
                y1={y}
                x2={mapWidth}
                y2={y}
                stroke={paran.polarity === 'harmonious' ? '#10b981' : '#64748b'}
                strokeWidth="1.5"
                strokeDasharray="4 6"
                opacity="0.6"
                className="hover:stroke-amber-400 hover:opacity-100 transition cursor-pointer"
                onMouseEnter={() => setHoveredLabel(`Paran: ${paran.title} (Lat ${paran.latitude.toFixed(1)}°)`)}
                onMouseLeave={() => setHoveredLabel(null)}
              />
            );
          })}
        </g>

        {/* Primary Natal Astrocartography Lines */}
        <g id="natal-lines-layer">
          {lines.map((line) => {
            if (filteredPlanets.length > 0 && !filteredPlanets.includes(line.planetId)) return null;
            if (filteredAngles.length > 0 && !filteredAngles.includes(line.angle)) return null;

            let pathD = '';
            let isFirst = true;

            for (let i = 0; i < line.points.length; i++) {
              const pt = line.points[i];
              const x = toX(pt.lng);
              const y = toY(pt.lat);

              if (i > 0) {
                const prevX = toX(line.points[i - 1].lng);
                if (Math.abs(x - prevX) > mapWidth * 0.65) {
                  isFirst = true;
                }
              }

              if (isFirst) {
                pathD += `M ${x.toFixed(1)} ${y.toFixed(1)} `;
                isFirst = false;
              } else {
                pathD += `L ${x.toFixed(1)} ${y.toFixed(1)} `;
              }
            }

            return (
              <path
                key={line.id}
                d={pathD}
                fill="none"
                stroke={line.color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.88"
                className="hover:opacity-100 hover:stroke-amber-300 transition-all cursor-pointer"
                onMouseEnter={() => {
                  const pDef = PLANET_DEFINITIONS[line.planetId];
                  setHoveredLabel(`✦ ${pDef?.name || line.planetId} on ${line.angle} Line`);
                }}
                onMouseLeave={() => setHoveredLabel(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectLine(line);
                }}
              />
            );
          })}
        </g>

        {/* Transiting Astrocartography Lines */}
        {showTransits && (
          <g id="transits-lines-layer">
            {transitLines.map((tLine) => {
              if (filteredPlanets.length > 0 && !filteredPlanets.includes(tLine.planetId)) return null;
              if (filteredAngles.length > 0 && !filteredAngles.includes(tLine.angle)) return null;

              let pathD = '';
              let isFirst = true;

              for (let i = 0; i < tLine.points.length; i++) {
                const pt = tLine.points[i];
                const x = toX(pt.lng);
                const y = toY(pt.lat);

                if (i > 0) {
                  const prevX = toX(tLine.points[i - 1].lng);
                  if (Math.abs(x - prevX) > mapWidth * 0.65) {
                    isFirst = true;
                  }
                }

                if (isFirst) {
                  pathD += `M ${x.toFixed(1)} ${y.toFixed(1)} `;
                  isFirst = false;
                } else {
                  pathD += `L ${x.toFixed(1)} ${y.toFixed(1)} `;
                }
              }

              return (
                <path
                  key={tLine.id}
                  d={pathD}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.2"
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                  opacity="0.9"
                  className="hover:opacity-100 hover:stroke-cyan-200 transition-all cursor-pointer"
                  onMouseEnter={() => {
                    const pDef = PLANET_DEFINITIONS[tLine.planetId];
                    setHoveredLabel(`⚡ Transiting ${pDef?.name || tLine.planetId} on ${tLine.angle}`);
                  }}
                  onMouseLeave={() => setHoveredLabel(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectLine(tLine);
                  }}
                />
              );
            })}
          </g>
        )}

        {/* Transit Trigger Crossings */}
        {showTransits && (
          <g id="transit-triggers-layer">
            {transitTriggers.map((trig) => {
              const cx = toX(trig.lng);
              const cy = toY(trig.lat);
              return (
                <g
                  key={trig.id}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredLabel(`✨ Transit Activation: ${trig.description}`)}
                  onMouseLeave={() => setHoveredLabel(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectTransitTrigger) onSelectTransitTrigger(trig);
                  }}
                >
                  <circle cx={cx} cy={cy} r="7" fill="none" stroke="#38bdf8" strokeWidth="2" opacity="0.9" />
                  <circle cx={cx} cy={cy} r="2.5" fill="#38bdf8" />
                </g>
              );
            })}
          </g>
        )}

        {/* Natal Crossings */}
        <g id="crossings-layer">
          {crossings.map((cross) => {
            const cx = toX(cross.lng);
            const cy = toY(cross.lat);
            const col = cross.polarity === 'harmonious' ? '#f59e0b' : cross.polarity === 'challenging' ? '#ef4444' : '#38bdf8';
            return (
              <circle
                key={cross.id}
                cx={cx}
                cy={cy}
                r="4.5"
                fill="none"
                stroke={col}
                strokeWidth="1.8"
                className="hover:r-6 transition-all cursor-pointer"
                onMouseEnter={() => setHoveredLabel(`⚡ Crossing: ${cross.summary}`)}
                onMouseLeave={() => setHoveredLabel(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectCrossing(cross);
                }}
              />
            );
          })}
        </g>

        {/* World Cities */}
        <g id="cities-layer">
          {WORLD_CITIES.map((city) => {
            const cx = toX(city.lng);
            const cy = toY(city.lat);
            const isSelected = selectedCity?.id === city.id;

            return (
              <g
                key={city.id}
                className="cursor-pointer group"
                onMouseEnter={() => setHoveredLabel(`📍 ${city.name}, ${city.country}`)}
                onMouseLeave={() => setHoveredLabel(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectLocation({ lat: city.lat, lng: city.lng }, city);
                }}
              >
                {isSelected && (
                  <circle cx={cx} cy={cy} r="9" fill="none" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" className="animate-spin" />
                )}
                <circle cx={cx} cy={cy} r={isSelected ? '4.5' : '2.8'} fill={isSelected ? '#f59e0b' : '#f8fafc'} opacity={isSelected ? 1 : 0.75} />
                <text
                  x={cx + 6}
                  y={cy + 3}
                  fill={isSelected ? '#f59e0b' : '#cbd5e1'}
                  fontSize={isSelected ? '12' : '10'}
                  fontWeight={isSelected ? '600' : '400'}
                  className="pointer-events-none drop-shadow"
                >
                  {city.name}
                </text>
              </g>
            );
          })}
        </g>

        {/* Active Coordinate Pin */}
        {activeLocation && !selectedCity && (
          <g>
            <circle cx={toX(activeLocation.lng)} cy={toY(activeLocation.lat)} r="6" fill="#f59e0b" opacity="0.9" />
            <circle cx={toX(activeLocation.lng)} cy={toY(activeLocation.lat)} r="12" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" />
          </g>
        )}
      </svg>
    </div>
  );
};
