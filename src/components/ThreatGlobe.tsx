import { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
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

// Real earth globe with texture
function EarthGlobe() {
  const meshRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  // Use a procedural earth-like globe with realistic coloring
  const earthTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Dark ocean background
    ctx.fillStyle = '#0a1628';
    ctx.fillRect(0, 0, 2048, 1024);

    // Draw simplified continent shapes with glow effect
    const drawContinent = (points: [number, number][], color: string) => {
      ctx.beginPath();
      points.forEach(([x, y], i) => {
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#1a4a6a';
      ctx.lineWidth = 1;
      ctx.stroke();
    };

    const landColor = '#0d2847';
    const borderColor = '#1a5a8a';

    // North America
    drawContinent([
      [200, 180], [280, 150], [350, 160], [380, 200], [360, 280],
      [340, 320], [300, 360], [260, 380], [220, 360], [180, 300],
      [170, 250], [180, 200]
    ], landColor);

    // South America
    drawContinent([
      [340, 420], [380, 400], [420, 440], [430, 520], [420, 600],
      [380, 680], [340, 700], [310, 660], [300, 580], [310, 500],
      [320, 440]
    ], landColor);

    // Europe
    drawContinent([
      [980, 180], [1020, 160], [1080, 170], [1100, 200], [1080, 240],
      [1040, 260], [1000, 280], [960, 260], [950, 220]
    ], landColor);

    // Africa
    drawContinent([
      [980, 340], [1040, 300], [1100, 320], [1140, 380], [1140, 480],
      [1100, 580], [1060, 640], [1020, 640], [980, 580], [960, 480],
      [960, 400]
    ], landColor);

    // Asia
    drawContinent([
      [1100, 140], [1200, 120], [1400, 140], [1500, 180], [1560, 240],
      [1540, 300], [1480, 340], [1400, 360], [1300, 340], [1200, 300],
      [1140, 260], [1100, 200]
    ], landColor);

    // Australia
    drawContinent([
      [1500, 520], [1580, 500], [1640, 520], [1660, 580], [1620, 640],
      [1560, 660], [1500, 620], [1480, 560]
    ], landColor);

    // Add grid lines for lat/lng
    ctx.strokeStyle = '#0f2a4a';
    ctx.lineWidth = 0.5;
    for (let lat = 0; lat < 1024; lat += 1024 / 18) {
      ctx.beginPath();
      ctx.moveTo(0, lat);
      ctx.lineTo(2048, lat);
      ctx.stroke();
    }
    for (let lng = 0; lng < 2048; lng += 2048 / 36) {
      ctx.beginPath();
      ctx.moveTo(lng, 0);
      ctx.lineTo(lng, 1024);
      ctx.stroke();
    }

    // Add coastal glow
    ctx.shadowColor = borderColor;
    ctx.shadowBlur = 8;

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }, []);

  useFrame((_, delta) => {
    if (meshRef.current) meshRef.current.rotation.y += delta * 0.03;
    if (cloudsRef.current) cloudsRef.current.rotation.y += delta * 0.04;
  });

  return (
    <group>
      {/* Earth sphere */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial
          map={earthTexture}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Atmosphere glow */}
      <mesh ref={cloudsRef}>
        <sphereGeometry args={[2.03, 64, 64]} />
        <meshBasicMaterial
          color="#0088cc"
          transparent
          opacity={0.06}
          side={THREE.FrontSide}
        />
      </mesh>

      {/* Outer atmosphere ring */}
      <mesh>
        <sphereGeometry args={[2.15, 64, 64]} />
        <meshBasicMaterial
          color="#00aaff"
          transparent
          opacity={0.02}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

function ThreatMarkers({ threats }: { threats: ThreatPoint[] }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.03;
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
              <meshBasicMaterial color={color} transparent opacity={0.2} />
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
    if (ref.current) ref.current.rotation.y += delta * 0.03;
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
          <lineBasicMaterial color={arc.color} transparent opacity={0.4} />
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
      <Canvas camera={{ position: [0, 0, 5.5], fov: 45 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 3, 5]} intensity={0.8} />
        <pointLight position={[-5, -3, -5]} intensity={0.3} color="#0088ff" />
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
            No threats logged yet — analyze a request to see data
          </p>
        </div>
      )}
    </div>
  );
}
