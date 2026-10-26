import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AstrocartographyLine,
  CityData,
  Coordinates,
  LocalSpaceLine,
  ParanLine,
  PlanetaryCrossing,
  PlanetId,
  StarParanLine,
  TransitTrigger,
} from '../types/astronomy';
import { ANGLE_DEFINITIONS, PLANET_DEFINITIONS } from '../constants/celestialData';

export type MapTileStyle = 'streets' | 'osm' | 'satellite' | 'dark';

interface RealLeafletMapViewProps {
  lines: AstrocartographyLine[];
  transitLines?: AstrocartographyLine[];
  transitTriggers?: TransitTrigger[];
  parans: ParanLine[];
  crossings: PlanetaryCrossing[];
  selectedCity?: CityData | null;
  activeLocation?: Coordinates | null;
  birthplaceLocation?: Coordinates | null;
  relocationLocation?: (Coordinates & { name?: string; country?: string }) | null;
  filteredPlanets: PlanetId[];
  filteredAngles: string[];
  showParans?: boolean;
  showCrossings?: boolean;
  showTransits?: boolean;
  // Local Space & Star Parans
  localSpaceLines?: LocalSpaceLine[];
  showLocalSpace?: boolean;
  starParans?: StarParanLine[];
  showFixedStars?: boolean;
  // Aspect lines & Harmonics
  showConjunctions?: boolean;
  showHarmoniousAspects?: boolean;
  showDisharmoniousAspects?: boolean;
  activeHarmonics?: number[];
  activeCrossing?: PlanetaryCrossing | null;
  activeParan?: ParanLine | null;
  onSelectLocation: (coord: Coordinates, city?: CityData) => void;
  onSelectLine?: (line: AstrocartographyLine, clickedLocation?: Coordinates) => void;
  onSelectCrossing?: (crossing: PlanetaryCrossing) => void;
  onSelectTransitTrigger?: (trigger: TransitTrigger) => void;
  onSelectParan?: (paran: ParanLine) => void;
  onMapReady: () => void;
  tileStyle: MapTileStyle;
  onChangeTileStyle: (style: MapTileStyle) => void;
}

interface TileDefinition {
  name: string;
  url: string;
  attribution: string;
  maxZoom: number;
  overlayUrls?: string[];
}

function normalizeMapCoordinates(coordinates: Coordinates): Coordinates {
  let lng = coordinates.lng % 360;
  if (lng > 180) lng -= 360;
  if (lng < -180) lng += 360;

  return {
    lat: Math.max(-85, Math.min(85, coordinates.lat)),
    lng,
  };
}

function clusterParansForDisplay(parans: ParanLine[], map: L.Map): ParanLine[][] {
  const sortedParans = parans
    .map((paran) => ({
      paran,
      screenY: map.latLngToContainerPoint([paran.latitude, 0]).y,
    }))
    .sort((a, b) => a.screenY - b.screenY);
  const clusters: ParanLine[][] = [];
  let clusterStartY: number | null = null;

  for (const { paran, screenY } of sortedParans) {
    if (clusterStartY === null || screenY - clusterStartY > 12) {
      clusters.push([paran]);
      clusterStartY = screenY;
    } else {
      clusters[clusters.length - 1].push(paran);
    }
  }

  return clusters;
}

const TILE_PROVIDERS: Record<MapTileStyle, TileDefinition> = {
  streets: {
    name: 'Detailed Streets',
    // 100% Free, NO API Key, NO watermark, crisp vector-grade street rendering
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri, HERE, Garmin, USGS, OpenStreetMap contributors',
    maxZoom: 19,
  },
  osm: {
    name: 'OpenStreetMap',
    // 100% Free, NO API Key, NO watermark, classic open-source mapping
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  satellite: {
    name: 'Hybrid Satellite',
    // High-res satellite imagery PLUS reference borders, cities, and road overlays
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    overlayUrls: [
      'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}',
    ],
    attribution: '&copy; Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
  dark: {
    name: 'Cosmic Dark',
    // 100% Free Esri Dark Canvas with place labels and borders, NO watermark, NO API Key
    url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    overlayUrls: [
      'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    ],
    attribution: '&copy; Esri, HERE, DeLorme, MapmyIndia',
    maxZoom: 18,
  },
};

export const RealLeafletMapView: React.FC<RealLeafletMapViewProps> = ({
  lines,
  transitLines = [],
  transitTriggers = [],
  parans,
  crossings,
  selectedCity,
  activeLocation,
  birthplaceLocation,
  relocationLocation,
  filteredPlanets,
  filteredAngles,
  showParans = true,
  showCrossings = true,
  showTransits = false,
  localSpaceLines = [],
  showLocalSpace = false,
  starParans = [],
  showFixedStars = false,
  showConjunctions = true,
  showHarmoniousAspects = true,
  showDisharmoniousAspects = true,
  activeHarmonics = [3, 4, 6],
  activeCrossing = null,
  activeParan = null,
  onSelectLocation,
  onSelectLine,
  onSelectCrossing,
  onSelectTransitTrigger,
  onSelectParan,
  onMapReady,
  tileStyle,
  onChangeTileStyle,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const overlayTileLayersRef = useRef<L.TileLayer[]>([]);
  const linesLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const orbLayerGroupRef = useRef<L.LayerGroup | null>(null);
  const markerLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [mapZoom, setMapZoom] = useState(3);
  const [hoveredInfo, setHoveredInfo] = useState<{
    title: string;
    orb?: string;
    subtitle?: string;
    color: string;
  } | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [25, 10],
      zoom: 3,
      minZoom: 2,
      maxZoom: 19,
      zoomControl: false,
      worldCopyJump: true,
    });
    const updateZoom = () => setMapZoom(map.getZoom());
    map.on('zoomend', updateZoom);
    updateZoom();

    // Add Base Tile Layer
    const provider = TILE_PROVIDERS[tileStyle];
    const baseLayer = L.tileLayer(provider.url, {
      attribution: provider.attribution,
      maxZoom: provider.maxZoom,
      subdomains: ['a', 'b', 'c'],
    });
    baseLayer.once('load', onMapReady);
    baseLayer.addTo(map);
    baseTileLayerRef.current = baseLayer;

    // Create Layer Groups in correct rendering order
    orbLayerGroupRef.current = L.layerGroup().addTo(map);
    linesLayerGroupRef.current = L.layerGroup().addTo(map);
    markerLayerGroupRef.current = L.layerGroup().addTo(map);

    // Zoom Controls at Bottom Right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    mapInstanceRef.current = map;

    // Handle Map Click for Location Selection
    map.on('click', (e: L.LeafletMouseEvent) => {
      onSelectLocation(normalizeMapCoordinates(e.latlng));
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Style & Overlays
  useEffect(() => {
    if (!mapInstanceRef.current || !baseTileLayerRef.current) return;
    const map = mapInstanceRef.current;
    const provider = TILE_PROVIDERS[tileStyle];

    // Update base layer
    baseTileLayerRef.current.setUrl(provider.url);
    baseTileLayerRef.current.options.maxZoom = provider.maxZoom;

    // Remove existing overlay layers
    overlayTileLayersRef.current.forEach((layer) => {
      map.removeLayer(layer);
    });
    overlayTileLayersRef.current = [];

    // Add new overlay layers (e.g. for Hybrid Satellite with borders and city labels)
    if (provider.overlayUrls) {
      provider.overlayUrls.forEach((overlayUrl) => {
        const overlayLayer = L.tileLayer(overlayUrl, {
          maxZoom: provider.maxZoom,
          opacity: 0.95,
        }).addTo(map);
        overlayTileLayersRef.current.push(overlayLayer);
      });
    }
  }, [tileStyle]);

  // Split polyline across antimeridian with boundary interpolation to prevent wrap glitches & gaps
  const splitAcrossDateLine = (points: Coordinates[]): Coordinates[][] => {
    if (points.length === 0) return [];
    const segments: Coordinates[][] = [];
    let currentSegment: Coordinates[] = [points[0]];

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];

      // Jump over date line if longitude difference is greater than 180 degrees
      if (Math.abs(curr.lng - prev.lng) > 180) {
        if (prev.lng > 0 && curr.lng < 0) {
          // Cross eastward across 180
          const dLng = (curr.lng + 360) - prev.lng;
          const frac = (180 - prev.lng) / dLng;
          const boundaryLat = prev.lat + frac * (curr.lat - prev.lat);
          currentSegment.push({ lat: boundaryLat, lng: 179.999 });
          segments.push(currentSegment);
          currentSegment = [{ lat: boundaryLat, lng: -179.999 }, curr];
        } else if (prev.lng < 0 && curr.lng > 0) {
          // Cross westward across -180
          const dLng = (prev.lng + 360) - curr.lng;
          const frac = (prev.lng - (-180)) / dLng;
          const boundaryLat = prev.lat + frac * (curr.lat - prev.lat);
          currentSegment.push({ lat: boundaryLat, lng: -179.999 });
          segments.push(currentSegment);
          currentSegment = [{ lat: boundaryLat, lng: 179.999 }, curr];
        } else {
          segments.push(currentSegment);
          currentSegment = [curr];
        }
      } else {
        currentSegment.push(curr);
      }
    }

    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }
    return segments;
  };

  // Redraw Astrocartography Lines, Orbs, and Overlays
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !linesLayerGroupRef.current || !orbLayerGroupRef.current) return;

    const group = linesLayerGroupRef.current;
    const orbGroup = orbLayerGroupRef.current;
    group.clearLayers();
    orbGroup.clearLayers();

    // 1. Draw Natal Planetary Lines & Aspects
    lines.forEach((line) => {
      if (!filteredPlanets.includes(line.planetId)) return;
      if (!filteredAngles.includes(line.angle)) return;

      // Filter by aspect line settings
      if (line.isAspectLine) {
        if (line.polarity === 'harmonious' && !showHarmoniousAspects) return;
        if (line.polarity === 'challenging' && !showDisharmoniousAspects) return;
        if (line.harmonic && !activeHarmonics.includes(line.harmonic)) return;
      } else {
        if (!showConjunctions) return;
      }

      const pDef = PLANET_DEFINITIONS[line.planetId];
      const angDef = ANGLE_DEFINITIONS[line.angle];
      const segments = splitAcrossDateLine(line.points);
      const isMC_IC = line.angle === 'MC' || line.angle === 'IC';

      const isHarmonious = line.polarity === 'harmonious';
      const isChallenging = line.polarity === 'challenging';
      const lineColor = line.isAspectLine
        ? isHarmonious
          ? '#10b981'
          : isChallenging
          ? '#f43f5e'
          : '#a855f7'
        : line.color;

      const lineDashArray = line.isAspectLine
        ? line.aspectType === 'trine'
          ? '8, 6'
          : line.aspectType === 'sextile'
          ? '4, 4'
          : line.aspectType === 'square'
          ? '3, 4'
          : '2, 5'
        : line.angle === 'IC'
        ? '7, 6'
        : line.angle === 'DSC'
        ? '4, 4'
        : undefined;

      const lineWeight = line.isAspectLine ? 2.0 : isMC_IC ? 2.8 : 2.4;

      segments.forEach((seg) => {
        if (seg.length < 2) return;

        const latLngs = seg.map((pt) => [pt.lat, pt.lng] as [number, number]);

        // Semi-transparent Orb of Influence Glow Polyline (drawn underneath)
        const orbPoly = L.polyline(latLngs, {
          color: lineColor,
          weight: line.isAspectLine ? 24 : 42,
          opacity: 0,
          lineCap: 'round',
          lineJoin: 'round',
          interactive: false,
        }).addTo(orbGroup);

        // Core Astrocartography Power Line (vibrant and distinct)
        const poly = L.polyline(latLngs, {
          color: lineColor,
          weight: lineWeight,
          opacity: line.isAspectLine ? 0.85 : 0.95,
          dashArray: lineDashArray,
          smoothFactor: 1,
          interactive: false,
        }).addTo(group);

        // Ultra-Sensitive Invisible Hit-Area Polyline (24px wide hit zone)
        // Ensures hovering effortlessly catches the line without pixel-perfect aiming
        const hitPoly = L.polyline(latLngs, {
          weight: 24,
          opacity: 0,
          interactive: true,
        }).addTo(group);

        // Hover & Click Interactions with Orb of Influence illumination
        hitPoly.on('mouseover', () => {
          poly.setStyle({ weight: lineWeight + 2.5, opacity: 1 });
          orbPoly.setStyle({ opacity: 0.28 });

          setHoveredInfo({
            title: line.isAspectLine
              ? `${pDef?.symbol || ''} ${pDef?.name || line.planetId.toUpperCase()} ${line.aspectType?.toUpperCase()} ${line.angle}`
              : `${pDef?.symbol || ''} ${pDef?.name || line.planetId.toUpperCase()} on ${line.angle} (${angDef?.name || ''})`,
            orb: line.isAspectLine
              ? `✦ Harmonic Aspect (${line.harmonic}H, ~2° orb)`
              : '✦ ~350 km celestial corridor',
            subtitle: line.description,
            color: lineColor,
          });
        });

        hitPoly.on('mouseout', () => {
          poly.setStyle({ weight: lineWeight, opacity: line.isAspectLine ? 0.85 : 0.95 });
          orbPoly.setStyle({ opacity: 0 });
          setHoveredInfo(null);
        });

        hitPoly.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          if (onSelectLine) onSelectLine(line, normalizeMapCoordinates(e.latlng));
        });
      });
    });

    // 2. Draw Transiting Planetary Lines (if enabled)
    if (showTransits && transitLines.length > 0) {
      transitLines.forEach((tLine) => {
        if (!filteredPlanets.includes(tLine.planetId)) return;
        if (!filteredAngles.includes(tLine.angle)) return;

        const pDef = PLANET_DEFINITIONS[tLine.planetId];
        const angDef = ANGLE_DEFINITIONS[tLine.angle];
        const segments = splitAcrossDateLine(tLine.points);

        segments.forEach((seg) => {
          if (seg.length < 2) return;
          const latLngs = seg.map((pt) => [pt.lat, pt.lng] as [number, number]);

          const poly = L.polyline(latLngs, {
            color: '#38bdf8',
            weight: 2.2,
            opacity: 0.88,
            dashArray: '3, 6',
            interactive: false,
          }).addTo(group);

          // Wide hit area for transits
          const hitPoly = L.polyline(latLngs, {
            weight: 24,
            opacity: 0,
            interactive: true,
          }).addTo(group);

          hitPoly.on('mouseover', () => {
            poly.setStyle({ weight: 4, opacity: 1 });
            setHoveredInfo({
              title: `⚡ Active Sky Transit: ${pDef?.name || tLine.planetId.toUpperCase()} on ${tLine.angle} (${angDef?.name || ''})`,
              orb: '✦ Dynamic Temporal Transit Line',
              subtitle: tLine.description,
              color: '#38bdf8',
            });
          });

          hitPoly.on('mouseout', () => {
            poly.setStyle({ weight: 2.2, opacity: 0.88 });
            setHoveredInfo(null);
          });

          hitPoly.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            if (onSelectLine) onSelectLine(tLine, normalizeMapCoordinates(e.latlng));
          });
        });
      });
    }

    // 3. Draw Parans (Horizontal Latitude Crossings)
    if (showParans && parans.length > 0) {
      clusterParansForDisplay(parans, map).forEach((cluster) => {
        const paran = cluster[0];
        const latitude = cluster.reduce((sum, item) => sum + item.latitude, 0) / cluster.length;
        const isActive = cluster.some((item) => activeParan?.id === item.id);
        const isSinglePolarity = cluster.every((item) => item.polarity === paran.polarity);
        const color = isActive
          ? '#a78bfa'
          : isSinglePolarity && paran.polarity === 'harmonious'
            ? '#10b981'
            : '#64748b';
        const clusterDescription = cluster.length === 1
          ? paran.title
          : `${cluster.length} nearby paran lines:\n${cluster.slice(0, 3).map((item) => item.title).join('\n')}${
              cluster.length > 3 ? `\n+ ${cluster.length - 3} more; open Paran Explorer to inspect all.` : ''
            }`;
        const poly = L.polyline(
          [
            [latitude, -180],
            [latitude, 180],
          ],
          {
            color,
            weight: isActive ? 4 : 1.4,
            opacity: isActive ? 1 : 0.6,
            dashArray: isActive ? undefined : '4, 8',
            interactive: false,
          }
        ).addTo(group);

        const hitPoly = L.polyline(
          [
            [latitude, -180],
            [latitude, 180],
          ],
          {
            weight: 18,
            opacity: 0,
            interactive: true,
          }
        ).addTo(group);

        hitPoly.on('mouseover', () => {
          poly.setStyle({ weight: 3.5, opacity: 1 });
          setHoveredInfo({
            title: cluster.length === 1 ? `Paran: ${paran.title}` : `${cluster.length} nearby paran lines`,
            orb: `Latitude ${latitude.toFixed(1)}°${cluster.length > 1 ? ` • ${cluster.length} lines grouped` : ''}`,
            subtitle: cluster.length === 1 ? paran.interpretation : clusterDescription,
            color,
          });
        });

        hitPoly.on('mouseout', () => {
          poly.setStyle({ weight: isActive ? 4 : 1.4, opacity: isActive ? 1 : 0.6, color });
          setHoveredInfo(null);
        });

        hitPoly.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          if (onSelectParan) onSelectParan(paran);
        });
      });
    }

    // 4. Draw Planetary Zenith Crossings
    if (showCrossings && crossings.length > 0) {
      crossings.slice(0, 72).forEach((crossing) => {
        const isHarmonious = crossing.polarity === 'harmonious';
        const isActive = activeCrossing?.id === crossing.id;

        const marker = L.circleMarker([crossing.lat, crossing.lng], {
          radius: isActive ? 9 : 5,
          color: isActive ? '#d946ef' : isHarmonious ? '#a78bfa' : '#38bdf8',
          fillColor: isActive ? '#f43f5e' : isHarmonious ? '#a78bfa' : '#0284c7',
          fillOpacity: isActive ? 1 : 0.85,
          weight: isActive ? 3 : 2,
        });

        marker.on('mouseover', () => {
          marker.setRadius(isActive ? 11 : 7.5);
          setHoveredInfo({
            title: `Crossing: ${crossing.planet1.toUpperCase()} × ${crossing.planet2.toUpperCase()}`,
            orb: `Zenith Intersection Point`,
            subtitle: crossing.summary,
            color: '#a78bfa',
          });
        });

        marker.on('mouseout', () => {
          marker.setRadius(isActive ? 9 : 5);
          setHoveredInfo(null);
        });

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          if (onSelectCrossing) onSelectCrossing(crossing);
        });

        marker.addTo(group);
      });
    }

    // 5. Draw Local Space Horizon Vector Great Circles (Compass Heading Lines)
    if (showLocalSpace && localSpaceLines.length > 0) {
      localSpaceLines.forEach((ls) => {
        if (!filteredPlanets.includes(ls.planetId)) return;

        const segments = splitAcrossDateLine(ls.points);
        segments.forEach((seg) => {
          if (seg.length < 2) return;
          const latLngs = seg.map((pt) => [pt.lat, pt.lng] as [number, number]);

          const poly = L.polyline(latLngs, {
            color: ls.color || '#a78bfa',
            weight: 2.2,
            opacity: 0.9,
            dashArray: '8, 5',
            interactive: false,
          }).addTo(group);

          const hitPoly = L.polyline(latLngs, {
            weight: 20,
            opacity: 0,
            interactive: true,
          }).addTo(group);

          hitPoly.on('mouseover', () => {
            poly.setStyle({ weight: 4.5, opacity: 1 });
            setHoveredInfo({
              title: `🧭 ${ls.planetName} Local Space Vector (${ls.compassHeading})`,
              orb: `Azimuth: ${ls.azimuthDeg}° • Altitude: ${ls.altitudeDeg}°`,
              subtitle: `Compass vector originating from ${ls.originCityName}. Living or traveling along this heading activates ${ls.planetName}.`,
              color: ls.color || '#a78bfa',
            });
          });

          hitPoly.on('mouseout', () => {
            poly.setStyle({ weight: 2.2, opacity: 0.9 });
            setHoveredInfo(null);
          });
        });
      });
    }

    // 6. Draw Bernadette Brady Star Parans (Prominent Fixed Star Latitudinal Alignments)
    if (showFixedStars && starParans.length > 0) {
      starParans.forEach((sp) => {
        if (!filteredPlanets.includes(sp.planetId)) return;

        const poly = L.polyline(
          [
            [sp.latitude, -180],
            [sp.latitude, 180],
          ],
          {
            color: '#c084fc',
            weight: 1.8,
            opacity: 0.85,
            dashArray: '5, 4',
            interactive: false,
          }
        ).addTo(group);

        const hitPoly = L.polyline(
          [
            [sp.latitude, -180],
            [sp.latitude, 180],
          ],
          {
            weight: 18,
            opacity: 0,
            interactive: true,
          }
        ).addTo(group);

        hitPoly.on('mouseover', () => {
          poly.setStyle({ weight: 3.5, opacity: 1, color: '#e879f9' });
          const pName = PLANET_DEFINITIONS[sp.planetId]?.name || sp.planetId.toUpperCase();
          setHoveredInfo({
            title: `★ ${sp.starName} Brady Star Paran (${pName} on ${sp.planetAngle})`,
            orb: `Latitude: ${Math.abs(sp.latitude).toFixed(2)}°${sp.latitude >= 0 ? 'N' : 'S'} • ${sp.starConstellation}`,
            subtitle: sp.interpretation,
            color: '#c084fc',
          });
        });

        hitPoly.on('mouseout', () => {
          poly.setStyle({ weight: 1.8, opacity: 0.85, color: '#c084fc' });
          setHoveredInfo(null);
        });
      });
    }
  }, [
    lines,
    transitLines,
    parans,
    crossings,
    localSpaceLines,
    showLocalSpace,
    starParans,
    showFixedStars,
    filteredPlanets,
    filteredAngles,
    showParans,
    showCrossings,
    showTransits,
    showConjunctions,
    showHarmoniousAspects,
    showDisharmoniousAspects,
    activeHarmonics,
    activeCrossing,
    activeParan,
    mapZoom,
  ]);

  // Fly to active crossing when selected
  useEffect(() => {
    if (!mapInstanceRef.current || !activeCrossing) return;
    mapInstanceRef.current.flyTo([activeCrossing.lat, activeCrossing.lng], 6, {
      duration: 1.2,
    });
  }, [activeCrossing]);

  // Fly to active paran when selected
  useEffect(() => {
    if (!mapInstanceRef.current || !activeParan) return;
    const currentCenter = mapInstanceRef.current.getCenter();
    mapInstanceRef.current.flyTo([activeParan.latitude, currentCenter.lng], 5, {
      duration: 1.2,
    });
  }, [activeParan]);

  useEffect(() => {
    if (!mapInstanceRef.current || !birthplaceLocation) return;
    const coordinates = normalizeMapCoordinates(birthplaceLocation);
    mapInstanceRef.current.flyTo([coordinates.lat, coordinates.lng], 6, {
      duration: 1.2,
    });
  }, [birthplaceLocation?.lat, birthplaceLocation?.lng]);

  // Update Active Selected Location & Relocation Markers
  useEffect(() => {
    if (!mapInstanceRef.current || !markerLayerGroupRef.current) return;
    const markerGroup = markerLayerGroupRef.current;
    markerGroup.clearLayers();

    // 1. Birthplace / Relocation Flight Arc
    if (birthplaceLocation && relocationLocation) {
      const arcLatLngs: [number, number][] = [
        [birthplaceLocation.lat, birthplaceLocation.lng],
        [relocationLocation.lat, relocationLocation.lng],
      ];
      L.polyline(arcLatLngs, {
        color: '#c084fc',
        weight: 2,
        opacity: 0.7,
        dashArray: '6, 6',
      }).addTo(markerGroup);
    }

    // 2. Relocation Target Marker (Purple/Violet Beacon)
    if (relocationLocation) {
      const relocIconHtml = `
        <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
          <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(168, 85, 247, 0.3); border: 2px solid rgba(168, 85, 247, 0.9); animation: ping 2.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background: rgba(147, 51, 234, 0.5); border: 1.5px solid #d8b4fe;"></div>
          <div style="position: absolute; width: 10px; height: 10px; border-radius: 50%; background: #a855f7; border: 2px solid #ffffff; box-shadow: 0 0 12px #a855f7;"></div>
        </div>
      `;
      const relocIcon = L.divIcon({
        html: relocIconHtml,
        className: 'astro-reloc-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
      });
      L.marker([relocationLocation.lat, relocationLocation.lng], { icon: relocIcon })
        .bindPopup(`
          <div style="padding: 4px; font-size: 12px; color: #f8fafc;">
            <strong style="color: #c084fc;">✦ Relocation Target</strong>
            <div style="color: #cbd5e1; margin-top: 2px;">${relocationLocation.name || 'Custom Location'}</div>
          </div>
        `)
        .addTo(markerGroup);
    }

    // 3. Active Inspected Location Marker (Luminous Pulsing Golden Target Beacon)
    if (activeLocation) {
      const iconHtml = `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
          <div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background: radial-gradient(circle, rgba(139, 92, 246, 0.45) 0%, rgba(139, 92, 246, 0) 70%); border: 2px solid rgba(139, 92, 246, 0.9); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 26px; height: 26px; border-radius: 50%; border: 1.5px dashed #a78bfa; opacity: 0.85;"></div>
          <div style="position: absolute; width: 12px; height: 12px; border-radius: 50%; background: #a78bfa; border: 2.5px solid #ffffff; box-shadow: 0 0 16px #a78bfa;"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'astro-focal-marker',
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const marker = L.marker([activeLocation.lat, activeLocation.lng], { icon: customIcon });
      const cityName = selectedCity ? selectedCity.name : `Location (${activeLocation.lat.toFixed(1)}°, ${activeLocation.lng.toFixed(1)}°)`;
      marker.bindPopup(`
        <div style="padding: 4px; font-size: 12px; color: #f8fafc;">
          <strong style="color: #a78bfa;">${cityName}</strong>
          <div style="color: #94a3b8; font-family: monospace; font-size: 11px;">
            ${activeLocation.lat.toFixed(2)}°, ${activeLocation.lng.toFixed(2)}°
          </div>
        </div>
      `);
      marker.addTo(markerGroup);
    }
  }, [activeLocation, selectedCity, relocationLocation, birthplaceLocation]);

  return (
    <div className="relative w-full h-full overflow-hidden select-none">
      {/* Real Leaflet Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0 bg-slate-950" />

      {/* Real-Time Hover Information Overlay Banner (Positioned cleanly below top search bar) */}
      {hoveredInfo && (
        <div className="absolute top-[134px] sm:top-[98px] left-1/2 -translate-x-1/2 z-25 max-w-xs w-[90%] sm:w-auto bg-slate-950/95 backdrop-blur-md border border-slate-700/80 rounded-xl px-3 py-1.5 shadow-2xl animate-fadeIn pointer-events-none text-center">
          <div className="flex items-center justify-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full shadow-sm shrink-0"
              style={{ backgroundColor: hoveredInfo.color }}
            />
            <span className="text-xs font-bold text-white tracking-wide truncate max-w-[240px] sm:max-w-[280px]">
              {hoveredInfo.title}
            </span>
          </div>
          {hoveredInfo.orb && (
            <div className="text-[10px] font-mono text-violet-300 mt-0.5">{hoveredInfo.orb}</div>
          )}
          {hoveredInfo.subtitle && (
            <div className="text-[11px] text-slate-300 mt-0.5 leading-tight line-clamp-1 max-w-[280px] mx-auto">
              {hoveredInfo.subtitle}
            </div>
          )}
        </div>
      )}

      {/* Floating Map Style Selector: Placed at bottom-center so it NEVER overlaps bottom-left coordinates pill or right-side panels */}
      <div className="absolute bottom-6 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/90 p-1 shadow-2xl backdrop-blur-md sm:flex">
        <span className="text-[10px] font-mono text-slate-400 uppercase px-1.5 hidden sm:inline">Map:</span>
        {(Object.keys(TILE_PROVIDERS) as MapTileStyle[]).map((style) => (
          <button
            key={style}
            onClick={() => onChangeTileStyle(style)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
              tileStyle === style
                ? 'bg-violet-500 text-slate-950 font-bold shadow-md shadow-violet-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            {TILE_PROVIDERS[style].name}
          </button>
        ))}
      </div>

      {/* Quick Reset Center View Button */}
      <button
        onClick={() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([25, 10], 3);
          }
        }}
        className="absolute bottom-20 right-[10px] z-20 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-slate-900/90 text-xs text-slate-300 shadow-xl transition hover:bg-slate-800 hover:text-white"
        title="Reset Map View"
      >
        ⟲
      </button>
    </div>
  );
};
