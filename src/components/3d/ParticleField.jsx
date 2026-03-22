import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

function StarField({ count = 3000 }) {
  const ref = useRef();
  
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3]     = (Math.random() - 0.5) * 80;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 80;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    return arr;
  }, [count]);

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.x -= delta * 0.03;
      ref.current.rotation.y -= delta * 0.02;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#00d4ff"
        size={0.08}
        sizeAttenuation
        depthWrite={false}
        opacity={0.6}
      />
    </Points>
  );
}

function NebulaField({ count = 800 }) {
  const ref = useRef();
  
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 15 + Math.random() * 25;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      arr[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.4;
      arr[i * 3 + 2] = r * Math.cos(phi);
    }
    return arr;
  }, [count]);

  useFrame((state, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.015;
    }
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#bf00ff"
        size={0.15}
        sizeAttenuation
        depthWrite={false}
        opacity={0.35}
      />
    </Points>
  );
}

export default function ParticleField() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 15], fov: 60 }}
        style={{ background: 'transparent' }}
        gl={{ antialias: false, alpha: true }}
        dpr={[0.5, 1]}
      >
        <ambientLight intensity={0.5} />
        <StarField count={2500} />
        <NebulaField count={600} />
      </Canvas>
    </div>
  );
}
