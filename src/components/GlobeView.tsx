import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
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

interface GlobeViewProps {
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

// Convert geographic lat, lng to 3D Cartesian on sphere of radius R
function latLngToVector3(lat: number, lng: number, radius: number = 1.0): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

// Convert 3D Cartesian on sphere back to lat, lng
function vector3ToLatLng(vec: THREE.Vector3): Coordinates {
  const norm = vec.clone().normalize();
  const lat = 90 - Math.acos(Math.max(-1, Math.min(1, norm.y))) * (180 / Math.PI);
  let lng = Math.atan2(norm.z, -norm.x) * (180 / Math.PI) - 180;
  if (lng < -180) lng += 360;
  if (lng > 180) lng -= 360;
  return { lat, lng };
}

export const GlobeView: React.FC<GlobeViewProps> = ({
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
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const globeGroupRef = useRef<THREE.Group | null>(null);
  const linesGroupRef = useRef<THREE.Group | null>(null);
  const transitLinesGroupRef = useRef<THREE.Group | null>(null);
  const markersGroupRef = useRef<THREE.Group | null>(null);
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null);
  const earthMeshRef = useRef<THREE.Mesh | null>(null);

  const pointerDownRef = useRef({ x: 0, y: 0, time: 0 });
  const [hoveredInfo, setHoveredInfo] = useState<string | null>(null);

  // Initialize Three.js Scene with OrbitControls
  useEffect(() => {
    if (!mountRef.current) return;
    const width = mountRef.current.clientWidth || 800;
    const height = mountRef.current.clientHeight || 600;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0.6, 2.7);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);

    // OrbitControls for smooth, natural dragging, inertia, and zooming
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.rotateSpeed = 0.65;
    controls.zoomSpeed = 0.8;
    controls.panSpeed = 0.6;
    controls.minDistance = 1.35;
    controls.maxDistance = 5.5;
    controlsRef.current = controls;

    // Main Rotating Globe Group
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);
    globeGroupRef.current = globeGroup;

    // Subgroups
    const linesGroup = new THREE.Group();
    const transitLinesGroup = new THREE.Group();
    const markersGroup = new THREE.Group();
    globeGroup.add(linesGroup);
    globeGroup.add(transitLinesGroup);
    globeGroup.add(markersGroup);
    linesGroupRef.current = linesGroup;
    transitLinesGroupRef.current = transitLinesGroup;
    markersGroupRef.current = markersGroup;

    // Deep Cosmic Starfield Background
    const starGeo = new THREE.BufferGeometry();
    const starCount = 2200;
    const starCoords = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 28 + Math.random() * 25;
      starCoords[i] = r * Math.sin(phi) * Math.cos(theta);
      starCoords[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      starCoords[i + 2] = r * Math.cos(phi);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starCoords, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xf8fafc,
      size: 0.16,
      transparent: true,
      opacity: 0.85,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // Texture Loader for Authentic NASA / High-Res Earth Imagery
    const textureLoader = new THREE.TextureLoader();
    const blueMarbleMap = textureLoader.load(`${import.meta.env.BASE_URL}textures/earth-blue-marble.jpg`);
    const darkMap = textureLoader.load(`${import.meta.env.BASE_URL}textures/earth-dark.jpg`);
    const topoMap = textureLoader.load(`${import.meta.env.BASE_URL}textures/earth-topology.png`);
    const cloudsMap = textureLoader.load(`${import.meta.env.BASE_URL}textures/earth-clouds.png`);

    // Earth Sphere Geometry
    const earthGeometry = new THREE.SphereGeometry(1.0, 72, 72);
    const initialMap = viewMode === 'terrain' || viewMode === 'light' ? blueMarbleMap : darkMap;
    const earthMaterial = new THREE.MeshStandardMaterial({
      map: initialMap,
      bumpMap: topoMap,
      bumpScale: 0.04,
      roughness: 0.75,
      metalness: 0.12,
    });
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    globeGroup.add(earthMesh);
    earthMeshRef.current = earthMesh;

    // Realistic Atmospheric Clouds Sphere
    const cloudsGeo = new THREE.SphereGeometry(1.008, 64, 64);
    const cloudsMat = new THREE.MeshStandardMaterial({
      map: cloudsMap,
      transparent: true,
      opacity: 0.35,
      blending: THREE.NormalBlending,
    });
    const cloudsMesh = new THREE.Mesh(cloudsGeo, cloudsMat);
    globeGroup.add(cloudsMesh);
    cloudsMeshRef.current = cloudsMesh;

    // Atmospheric Horizon Halo Glow (Fresnel Shader)
    const haloGeo = new THREE.SphereGeometry(1.028, 64, 64);
    const haloMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.4);
          gl_FragColor = vec4(0.24, 0.65, 1.0, 1.0) * intensity * 0.95;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    globeGroup.add(haloMesh);

    // 3D Coordinate Graticule Rings (Equator, Tropics, Prime Meridian)
    const equatorPts: THREE.Vector3[] = [];
    const tropicNPts: THREE.Vector3[] = [];
    const tropicSPts: THREE.Vector3[] = [];
    for (let lng = -180; lng <= 180; lng += 2) {
      equatorPts.push(latLngToVector3(0, lng, 1.002));
      tropicNPts.push(latLngToVector3(23.44, lng, 1.002));
      tropicSPts.push(latLngToVector3(-23.44, lng, 1.002));
    }
    const equatorLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(equatorPts),
      new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.35 })
    );
    const tropicNLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(tropicNPts),
      new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.2 })
    );
    const tropicSLine = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(tropicSPts),
      new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.2 })
    );
    globeGroup.add(equatorLine);
    globeGroup.add(tropicNLine);
    globeGroup.add(tropicSLine);

    // Lighting (Warm Sun + Cool Rim)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffaed, 2.0);
    sunLight.position.set(6, 4, 6);
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.7);
    rimLight.position.set(-6, -3, -6);
    scene.add(rimLight);

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Smooth camera dampening
      controls.update();

      // Gentle cloud rotation relative to earth
      if (cloudsMeshRef.current) {
        cloudsMeshRef.current.rotation.y += 0.0002;
      }

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update Earth Material on ViewMode Change
  useEffect(() => {
    if (!earthMeshRef.current) return;
    const textureLoader = new THREE.TextureLoader();
    const isDay = viewMode === 'terrain' || viewMode === 'light';
    const texPath = `${import.meta.env.BASE_URL}textures/${isDay ? 'earth-blue-marble.jpg' : 'earth-dark.jpg'}`;
    textureLoader.load(texPath, (tex) => {
      if (earthMeshRef.current) {
        (earthMeshRef.current.material as THREE.MeshStandardMaterial).map = tex;
        (earthMeshRef.current.material as THREE.MeshStandardMaterial).needsUpdate = true;
      }
    });
  }, [viewMode]);

  // Smooth camera fly-to when selecting a city or location
  useEffect(() => {
    if (!controlsRef.current || !cameraRef.current) return;
    const targetCoord = selectedCity ? { lat: selectedCity.lat, lng: selectedCity.lng } : activeLocation;
    if (targetCoord) {
      const targetPos = latLngToVector3(targetCoord.lat, targetCoord.lng, 2.2);
      // Smoothly look towards point
      const cam = cameraRef.current;
      cam.position.lerp(targetPos, 0.45);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [selectedCity, activeLocation]);

  // Re-render Astrocartography Lines, Transits, Crossings & Markers
  useEffect(() => {
    if (!linesGroupRef.current || !transitLinesGroupRef.current || !markersGroupRef.current) return;

    // Clear old geometry
    while (linesGroupRef.current.children.length > 0) {
      linesGroupRef.current.remove(linesGroupRef.current.children[0]);
    }
    while (transitLinesGroupRef.current.children.length > 0) {
      transitLinesGroupRef.current.remove(transitLinesGroupRef.current.children[0]);
    }
    while (markersGroupRef.current.children.length > 0) {
      markersGroupRef.current.remove(markersGroupRef.current.children[0]);
    }

    const sphereRadius = 1.006;

    // Render Primary Natal Chart Lines
    for (const line of lines) {
      if (filteredPlanets.length > 0 && !filteredPlanets.includes(line.planetId)) continue;
      if (filteredAngles.length > 0 && !filteredAngles.includes(line.angle)) continue;

      const pts: THREE.Vector3[] = [];
      for (const pt of line.points) {
        pts.push(latLngToVector3(pt.lat, pt.lng, sphereRadius));
      }

      if (pts.length < 2) continue;

      const geometry = new THREE.BufferGeometry().setFromPoints(pts);
      const colorVal = new THREE.Color(line.color).getHex();

      const material = new THREE.LineBasicMaterial({
        color: colorVal,
        linewidth: 2,
        transparent: true,
        opacity: 0.88,
      });

      const lineMesh = new THREE.Line(geometry, material);
      lineMesh.userData = { type: 'line', data: line };
      linesGroupRef.current.add(lineMesh);
    }

    // Render Transiting Astrocartography Lines (Glowing / Dashed)
    if (showTransits && transitLines.length > 0) {
      for (const tLine of transitLines) {
        if (filteredPlanets.length > 0 && !filteredPlanets.includes(tLine.planetId)) continue;
        if (filteredAngles.length > 0 && !filteredAngles.includes(tLine.angle)) continue;

        const pts: THREE.Vector3[] = [];
        for (const pt of tLine.points) {
          pts.push(latLngToVector3(pt.lat, pt.lng, sphereRadius + 0.003));
        }

        if (pts.length < 2) continue;

        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineDashedMaterial({
          color: 0x38bdf8,
          dashSize: 0.035,
          gapSize: 0.02,
          linewidth: 2,
          transparent: true,
          opacity: 0.9,
        });

        const lineObj = new THREE.Line(geo, mat);
        lineObj.computeLineDistances();
        lineObj.userData = { type: 'transitLine', data: tLine };
        transitLinesGroupRef.current.add(lineObj);
      }
    }

    // Render Transit Trigger Intersection Beacons
    if (showTransits && transitTriggers.length > 0) {
      for (const trig of transitTriggers) {
        const pos = latLngToVector3(trig.lat, trig.lng, sphereRadius + 0.008);
        const beaconGeo = new THREE.RingGeometry(0.015, 0.028, 16);
        const beaconMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.95,
        });
        const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
        beaconMesh.position.copy(pos);
        beaconMesh.lookAt(new THREE.Vector3(0, 0, 0));
        beaconMesh.userData = { type: 'transitTrigger', data: trig };
        markersGroupRef.current.add(beaconMesh);
      }
    }

    // Render Horizontal Parans
    for (const paran of parans) {
      const pts: THREE.Vector3[] = [];
      for (let lng = -180; lng <= 180; lng += 3) {
        pts.push(latLngToVector3(paran.latitude, lng, sphereRadius + 0.001));
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineDashedMaterial({
        color: paran.polarity === 'harmonious' ? 0x10b981 : 0x64748b,
        dashSize: 0.04,
        gapSize: 0.03,
        linewidth: 1,
        transparent: true,
        opacity: 0.6,
      });
      const lineObj = new THREE.Line(geo, mat);
      lineObj.computeLineDistances();
      lineObj.userData = { type: 'paran', data: paran };
      linesGroupRef.current.add(lineObj);
    }

    // Render Natal Crossings (Zenith & Horizon Intersections)
    for (const cross of crossings) {
      const pos = latLngToVector3(cross.lat, cross.lng, sphereRadius + 0.005);
      const markerGeo = new THREE.RingGeometry(0.012, 0.022, 16);
      const markerMat = new THREE.MeshBasicMaterial({
        color: cross.polarity === 'harmonious' ? 0xf59e0b : cross.polarity === 'challenging' ? 0xef4444 : 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      });
      const ringMesh = new THREE.Mesh(markerGeo, markerMat);
      ringMesh.position.copy(pos);
      ringMesh.lookAt(new THREE.Vector3(0, 0, 0));
      ringMesh.userData = { type: 'crossing', data: cross };
      markersGroupRef.current.add(ringMesh);
    }

    // Render World Cities Markers
    for (const city of WORLD_CITIES) {
      const pos = latLngToVector3(city.lat, city.lng, sphereRadius + 0.004);
      const dotGeo = new THREE.SphereGeometry(0.007, 10, 10);
      const isSelected = selectedCity?.id === city.id;
      const dotMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0xf59e0b : 0xe2e8f0,
        transparent: true,
        opacity: isSelected ? 1.0 : 0.65,
      });
      const dotMesh = new THREE.Mesh(dotGeo, dotMat);
      dotMesh.position.copy(pos);
      dotMesh.userData = { type: 'city', data: city };
      markersGroupRef.current.add(dotMesh);

      if (isSelected) {
        // Selection Pulsing Halo Ring
        const ringGeo = new THREE.RingGeometry(0.024, 0.035, 24);
        const ringMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, side: THREE.DoubleSide, transparent: true, opacity: 0.9 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(pos);
        ring.lookAt(new THREE.Vector3(0, 0, 0));
        markersGroupRef.current.add(ring);
      }
    }
  }, [lines, transitLines, transitTriggers, parans, crossings, viewMode, selectedCity, filteredPlanets, filteredAngles, showTransits]);

  // Pointer Down: Record start position for drag vs click detection
  const handlePointerDown = (e: React.PointerEvent) => {
    pointerDownRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };
  };

  // Pointer Up: Calculate delta distance. If movement > 6px, IT WAS A DRAG — DO NOT OPEN WINDOW!
  const handlePointerUp = (e: React.PointerEvent) => {
    const deltaX = e.clientX - pointerDownRef.current.x;
    const deltaY = e.clientY - pointerDownRef.current.y;
    const dist = Math.hypot(deltaX, deltaY);
    const timeDiff = Date.now() - pointerDownRef.current.time;

    // Strict click threshold: less than 6px movement and under 400ms duration
    if (dist < 6 && timeDiff < 400) {
      handleRaycast(e.clientX, e.clientY, true);
    }
  };

  // Hover Raycasting for instant status feedback
  const handlePointerMove = (e: React.PointerEvent) => {
    handleRaycast(e.clientX, e.clientY, false);
  };

  const handleRaycast = (clientX: number, clientY: number, isClick: boolean) => {
    if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;
    const rect = mountRef.current.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, cameraRef.current);

    // 1. Check City and Crossing Markers first
    if (markersGroupRef.current) {
      const markerHits = raycaster.intersectObjects(markersGroupRef.current.children, true);
      if (markerHits.length > 0) {
        const obj = markerHits[0].object;
        if (obj.userData?.type === 'city') {
          const city: CityData = obj.userData.data;
          setHoveredInfo(`📍 ${city.name}, ${city.country}`);
          if (isClick) onSelectLocation({ lat: city.lat, lng: city.lng }, city);
          return;
        } else if (obj.userData?.type === 'crossing') {
          const cross: PlanetaryCrossing = obj.userData.data;
          setHoveredInfo(`⚡ Crossing: ${cross.summary}`);
          if (isClick) onSelectCrossing(cross);
          return;
        } else if (obj.userData?.type === 'transitTrigger') {
          const trig: TransitTrigger = obj.userData.data;
          setHoveredInfo(`✨ Transit Activation: ${trig.description}`);
          if (isClick && onSelectTransitTrigger) onSelectTransitTrigger(trig);
          return;
        }
      }
    }

    // 2. Check Lines
    if (linesGroupRef.current) {
      raycaster.params.Line = { threshold: 0.045 };
      const lineHits = raycaster.intersectObjects(linesGroupRef.current.children, true);
      if (lineHits.length > 0) {
        const obj = lineHits[0].object;
        if (obj.userData?.type === 'line') {
          const line: AstrocartographyLine = obj.userData.data;
          const pDef = PLANET_DEFINITIONS[line.planetId];
          setHoveredInfo(`✦ ${pDef.name} on ${line.angle} Line`);
          if (isClick) onSelectLine(line);
          return;
        } else if (obj.userData?.type === 'paran') {
          const paran: ParanLine = obj.userData.data;
          setHoveredInfo(`═ Paran: ${paran.title} (Lat ${paran.latitude}°)`);
          return;
        }
      }
    }

    // 3. Check Transit Lines
    if (transitLinesGroupRef.current) {
      raycaster.params.Line = { threshold: 0.045 };
      const tHits = raycaster.intersectObjects(transitLinesGroupRef.current.children, true);
      if (tHits.length > 0) {
        const obj = tHits[0].object;
        if (obj.userData?.type === 'transitLine') {
          const tLine: AstrocartographyLine = obj.userData.data;
          const pDef = PLANET_DEFINITIONS[tLine.planetId];
          setHoveredInfo(`⚡ Transiting ${pDef.name} on ${tLine.angle}`);
          if (isClick) onSelectLine(tLine);
          return;
        }
      }
    }

    // 4. Check Earth surface click
    if (earthMeshRef.current) {
      const earthHits = raycaster.intersectObject(earthMeshRef.current);
      if (earthHits.length > 0) {
        const localPoint = earthHits[0].point.clone();
        if (globeGroupRef.current) {
          globeGroupRef.current.worldToLocal(localPoint);
        }
        const coords = vector3ToLatLng(localPoint);
        setHoveredInfo(`🌐 Coordinates: ${coords.lat.toFixed(1)}°, ${coords.lng.toFixed(1)}°`);
        if (isClick) {
          onSelectLocation(coords);
        }
        return;
      }
    }

    setHoveredInfo(null);
  };

  return (
    <div
      ref={mountRef}
      id="globe-container"
      className="relative w-full h-full cursor-grab active:cursor-grabbing overflow-hidden bg-slate-950 select-none touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Dynamic Hover Tooltip */}
      {hoveredInfo && (
        <div className="absolute top-4 left-4 z-20 pointer-events-none px-3.5 py-1.5 rounded-lg bg-slate-900/90 backdrop-blur-md border border-slate-700/60 shadow-xl text-xs font-mono text-cyan-300 flex items-center gap-2 animate-fadeIn">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          {hoveredInfo}
        </div>
      )}

      {/* OrbitControls Floating HUD Navigation */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1.5 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-1.5 shadow-2xl">
        <button
          id="btn-zoom-in"
          title="Zoom In"
          onClick={(e) => {
            e.stopPropagation();
            if (controlsRef.current && cameraRef.current) {
              cameraRef.current.position.multiplyScalar(0.85);
              controlsRef.current.update();
            }
          }}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition font-mono text-lg"
        >
          +
        </button>
        <button
          id="btn-zoom-out"
          title="Zoom Out"
          onClick={(e) => {
            e.stopPropagation();
            if (controlsRef.current && cameraRef.current) {
              cameraRef.current.position.multiplyScalar(1.15);
              controlsRef.current.update();
            }
          }}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition font-mono text-lg"
        >
          −
        </button>
        <button
          id="btn-reset-view"
          title="Reset View"
          onClick={(e) => {
            e.stopPropagation();
            if (controlsRef.current && cameraRef.current) {
              controlsRef.current.reset();
              cameraRef.current.position.set(0, 0.6, 2.7);
              controlsRef.current.update();
            }
          }}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition text-xs font-mono"
        >
          ⟲
        </button>
      </div>
    </div>
  );
};
