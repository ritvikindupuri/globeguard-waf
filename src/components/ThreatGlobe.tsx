import { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';

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

function GlobeWireframe() {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.05;
  });

  const gridLines = useMemo(() => {
    const lines: THREE.Vector3[][] = [];
    // Latitude lines
    for (let lat = -60; lat <= 60; lat += 30) {
      const points: THREE.Vector3[] = [];
      for (let lng = 0; lng <= 360; lng += 5) {
        points.push(latLngToVector3(lat, lng, 2.01));
      }
      lines.push(points);
    }
    // Longitude lines
    for (let lng = 0; lng < 360; lng += 30) {
      const points: THREE.Vector3[] = [];
      for (let lat = -90; lat <= 90; lat += 5) {
        points.push(latLngToVector3(lat, lng, 2.01));
      }
      lines.push(points);
    }
    return lines;
  }, []);

  return (
    <group ref={ref}>
      <Sphere args={[2, 48, 48]}>
        <meshBasicMaterial color="#0a1628" transparent opacity={0.85} />
      </Sphere>
      {gridLines.map((points, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={points.length}
              array={new Float32Array(points.flatMap(p => [p.x, p.y, p.z]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#1a3a5c" transparent opacity={0.4} />
        </line>
      ))}
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
    if (ref.current) ref.current.rotation.y += delta * 0.05;
  });

  const arcs = useMemo(() => {
    // Draw arcs from threat to a central "server" location (e.g., US East)
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

const SAMPLE_THREATS: ThreatPoint[] = [
  { lat: 55.75, lng: 37.61, intensity: 0.9, type: 'critical', label: 'Moscow' },
  { lat: 39.9, lng: 116.4, intensity: 0.8, type: 'high', label: 'Beijing' },
  { lat: 35.68, lng: 139.69, intensity: 0.3, type: 'low', label: 'Tokyo' },
  { lat: -23.55, lng: -46.63, intensity: 0.6, type: 'medium', label: 'São Paulo' },
  { lat: 51.5, lng: -0.12, intensity: 0.4, type: 'low', label: 'London' },
  { lat: 28.61, lng: 77.2, intensity: 0.7, type: 'high', label: 'New Delhi' },
  { lat: 1.35, lng: 103.82, intensity: 0.5, type: 'medium', label: 'Singapore' },
  { lat: 30.04, lng: 31.24, intensity: 0.6, type: 'high', label: 'Cairo' },
  { lat: -33.87, lng: 151.21, intensity: 0.2, type: 'low', label: 'Sydney' },
  { lat: 52.52, lng: 13.4, intensity: 0.5, type: 'medium', label: 'Berlin' },
  { lat: 37.57, lng: 126.98, intensity: 0.7, type: 'high', label: 'Seoul' },
  { lat: 19.43, lng: -99.13, intensity: 0.4, type: 'medium', label: 'Mexico City' },
  { lat: -6.2, lng: 106.85, intensity: 0.8, type: 'critical', label: 'Jakarta' },
  { lat: 41.01, lng: 28.98, intensity: 0.5, type: 'medium', label: 'Istanbul' },
  { lat: 48.86, lng: 2.35, intensity: 0.3, type: 'low', label: 'Paris' },
  { lat: 35.69, lng: 51.39, intensity: 0.9, type: 'critical', label: 'Tehran' },
  { lat: 14.6, lng: 120.98, intensity: 0.6, type: 'high', label: 'Manila' },
  { lat: 6.52, lng: 3.38, intensity: 0.7, type: 'high', label: 'Lagos' },
];

export default function ThreatGlobe({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Canvas camera={{ position: [0, 0, 5.5], fov: 45 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />
        <GlobeWireframe />
        <ThreatMarkers threats={SAMPLE_THREATS} />
        <ConnectionArcs threats={SAMPLE_THREATS} />
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={3.5}
          maxDistance={8}
          autoRotate={false}
        />
      </Canvas>
    </div>
  );
}
