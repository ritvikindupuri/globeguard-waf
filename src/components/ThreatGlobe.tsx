import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ThreatPoint {
  lat: number;
  lng: number;
  intensity: number;
  type: 'critical' | 'high' | 'medium' | 'low';
  label?: string;
}

const THREAT_COLORS = {
  critical: new THREE.Color(0xff3333),
  high: new THREE.Color(0xff8833),
  medium: new THREE.Color(0xffaa33),
  low: new THREE.Color(0x00ddff),
};

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// Mapbox-style globe with light ocean and colored continents
function EarthGlobe() {
  const meshRef = useRef<THREE.Mesh>(null);

  const earthTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Light ocean — Mapbox style soft blue
    ctx.fillStyle = '#b8d4e3';
    ctx.fillRect(0, 0, 2048, 1024);

    // Draw continent with fill + subtle border
    const drawContinent = (points: [number, number][], fill: string, border: string) => {
      ctx.beginPath();
      points.forEach(([x, y], i) => {
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = border;
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    const land = '#e8dcc8';
    const border = '#c4b89c';

    // North America
    drawContinent([
      [180, 150], [220, 120], [300, 110], [370, 130], [400, 170],
      [390, 210], [380, 260], [360, 300], [340, 340], [300, 370],
      [260, 380], [220, 360], [190, 320], [170, 270], [165, 220],
      [170, 180]
    ], land, border);

    // Central America
    drawContinent([
      [300, 370], [320, 360], [340, 380], [350, 400], [340, 420],
      [320, 430], [300, 420], [290, 400]
    ], land, border);

    // South America
    drawContinent([
      [340, 430], [380, 410], [420, 430], [440, 480], [450, 540],
      [440, 600], [420, 660], [390, 710], [350, 720], [320, 690],
      [310, 630], [300, 560], [310, 500], [320, 450]
    ], land, border);

    // Europe
    drawContinent([
      [960, 150], [990, 130], [1040, 125], [1080, 140], [1100, 170],
      [1090, 210], [1070, 240], [1040, 260], [1010, 270], [980, 260],
      [960, 240], [950, 200], [950, 170]
    ], land, border);

    // UK/Ireland
    drawContinent([
      [930, 160], [950, 150], [955, 180], [945, 200], [930, 195], [925, 175]
    ], land, border);

    // Africa
    drawContinent([
      [970, 310], [1010, 290], [1060, 280], [1110, 300], [1140, 340],
      [1150, 400], [1150, 470], [1140, 540], [1110, 600], [1070, 650],
      [1030, 660], [1000, 640], [980, 580], [960, 500], [955, 420],
      [960, 360]
    ], land, border);

    // Middle East
    drawContinent([
      [1110, 260], [1160, 250], [1200, 270], [1210, 310], [1190, 340],
      [1150, 340], [1120, 310], [1110, 280]
    ], land, border);

    // Asia (large)
    drawContinent([
      [1100, 130], [1160, 110], [1250, 95], [1350, 90], [1440, 100],
      [1510, 130], [1560, 170], [1580, 220], [1560, 270], [1520, 310],
      [1470, 340], [1410, 360], [1350, 350], [1280, 330], [1220, 300],
      [1170, 260], [1130, 210], [1100, 170]
    ], land, border);

    // India
    drawContinent([
      [1280, 340], [1320, 330], [1350, 360], [1340, 420], [1310, 460],
      [1280, 440], [1270, 390], [1270, 360]
    ], land, border);

    // Southeast Asia
    drawContinent([
      [1420, 360], [1460, 350], [1480, 380], [1470, 420], [1440, 440],
      [1410, 420], [1400, 390]
    ], land, border);

    // Japan
    drawContinent([
      [1560, 200], [1575, 190], [1580, 220], [1570, 250], [1555, 240], [1550, 215]
    ], land, border);

    // Australia
    drawContinent([
      [1480, 530], [1540, 500], [1610, 510], [1660, 540], [1670, 600],
      [1640, 650], [1580, 670], [1520, 650], [1480, 610], [1470, 570]
    ], land, border);

    // New Zealand
    drawContinent([
      [1700, 640], [1715, 630], [1720, 660], [1710, 690], [1695, 680]
    ], land, border);

    // Greenland
    drawContinent([
      [380, 60], [420, 45], [460, 50], [480, 75], [470, 100],
      [440, 110], [400, 105], [380, 85]
    ], land, border);

    // Antarctica hint
    ctx.fillStyle = '#f0ebe3';
    ctx.fillRect(0, 940, 2048, 84);

    // Subtle lat/lng grid
    ctx.strokeStyle = 'rgba(150,170,190,0.15)';
    ctx.lineWidth = 0.5;
    for (let lat = 0; lat < 1024; lat += 1024 / 12) {
      ctx.beginPath();
      ctx.moveTo(0, lat);
      ctx.lineTo(2048, lat);
      ctx.stroke();
    }
    for (let lng = 0; lng < 2048; lng += 2048 / 24) {
      ctx.beginPath();
      ctx.moveTo(lng, 0);
      ctx.lineTo(lng, 1024);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }, []);

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.05;
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial
          map={earthTexture}
          roughness={0.6}
          metalness={0.05}
        />
      </mesh>
      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[2.08, 64, 64]} />
        <meshBasicMaterial
          color="#a0d8ef"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

function ThreatMarkers({ threats }: { threats: ThreatPoint[] }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.05;
  });

  return (
    <group ref={ref}>
      {threats.map((threat, i) => {
        const pos = latLngToVector3(threat.lat, threat.lng, 2.05);
        const color = THREAT_COLORS[threat.type];
        return (
          <group key={i} position={pos}>
            <mesh>
              <sphereGeometry args={[0.03 + threat.intensity * 0.02, 8, 8]} />
              <meshBasicMaterial color={color} />
            </mesh>
            <mesh>
              <sphereGeometry args={[0.06 + threat.intensity * 0.04, 8, 8]} />
              <meshBasicMaterial color={color} transparent opacity={0.25} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function ConnectionArcs({ threats }: { threats: ThreatPoint[] }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.05;
  });

  const arcs = useMemo(() => {
    const target = latLngToVector3(39, -77, 2.05);
    return threats.slice(0, 15).map((t) => {
      const start = latLngToVector3(t.lat, t.lng, 2.05);
      const mid = new THREE.Vector3()
        .addVectors(start, target)
        .multiplyScalar(0.5)
        .normalize()
        .multiplyScalar(2.8);
      const curve = new THREE.QuadraticBezierCurve3(start, mid, target);
      return { curve, color: THREAT_COLORS[t.type], points: curve.getPoints(30) };
    });
  }, [threats]);

  return (
    <group ref={ref}>
      {arcs.map((arc, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={arc.points.length}
              array={new Float32Array(arc.points.flatMap(p => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={arc.color} transparent opacity={0.5} />
        </line>
      ))}
    </group>
  );
}

export default function ThreatGlobe({ className }: { className?: string }) {
  const { user } = useAuth();
  const [threats, setThreats] = useState<ThreatPoint[]>([]);

  useEffect(() => {
    if (!user) return;
    loadThreats();
  }, [user]);

  const loadThreats = async () => {
    const { data } = await supabase
      .from('threat_logs')
      .select('source_lat, source_lng, severity, source_country')
      .not('source_lat', 'is', null)
      .not('source_lng', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (data && data.length > 0) {
      setThreats(data.map(t => ({
        lat: t.source_lat!,
        lng: t.source_lng!,
        intensity: t.severity === 'critical' ? 0.9 : t.severity === 'high' ? 0.7 : t.severity === 'medium' ? 0.5 : 0.3,
        type: t.severity as ThreatPoint['type'],
        label: t.source_country || undefined,
      })));
    }
  };

  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 5.5], fov: 45 }} style={{ background: 'linear-gradient(180deg, #e8f4f8 0%, #f0f7fa 50%, #f8fbfc 100%)' }}>
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 3, 5]} intensity={1.0} />
        <directionalLight position={[-3, -1, -3]} intensity={0.3} />
        <pointLight position={[0, 5, 0]} intensity={0.4} color="#ffffff" />
        <EarthGlobe />
        <ThreatMarkers threats={threats} />
        <ConnectionArcs threats={threats} />
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={3.5}
          maxDistance={8}
          autoRotate={false}
        />
      </Canvas>
      {threats.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-xs font-mono text-muted-foreground bg-background/80 px-3 py-1 rounded">
            No threats logged yet — add a protected site to generate data
          </p>
        </div>
      )}
    </div>
  );
}
