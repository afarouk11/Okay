'use client';

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

type OrbState = 'LISTENING' | 'THINKING' | 'CHATTING';

interface MathsJarvisOrbProps {
  state: OrbState;
  analyserNode?: AnalyserNode | null;
}

const PARTICLE_COUNT = 1200;
const ORB_RADIUS = 1.2;

const vertexShader = `
  uniform float uTime;
  uniform int uState;
  attribute float aScale;
  varying float vScale;
  void main() {
    vScale = aScale;
    vec3 pos = position;
    float pulse = 1.0;
    if (uState == 0) {
      pulse = 1.0 + 0.08 * sin(uTime * 1.2 + position.x * 2.0);
    } else if (uState == 1) {
      float angle = 0.25 * sin(uTime * 3.0 + position.y * 6.0);
      float c = cos(angle);
      float s = sin(angle);
      float nx = c * pos.x - s * pos.z;
      float nz = s * pos.x + c * pos.z;
      pos.x = nx;
      pos.z = nz;
      pulse = 1.0 + 0.18 * sin(uTime * 2.5 + position.y * 3.0);
    } else {
      pulse = aScale;
    }
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos * pulse, 1.0);
    gl_PointSize = 2.5 + 2.5 * vScale;
  }
`;

const fragmentShader = `
  varying float vScale;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float alpha = smoothstep(0.5, 0.2, d) * vScale;
    gl_FragColor = vec4(0.1, 0.85, 1.0, alpha * 0.85);
  }
`;

function OrbParticles({ state, analyserNode }: MathsJarvisOrbProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const uTime = useRef(0);
  const stateIndex = state === 'LISTENING' ? 0 : state === 'THINKING' ? 1 : 2;

  const { positions, scales } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const sc = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / PARTICLE_COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
      pos[3 * i]     = ORB_RADIUS * Math.cos(theta) * Math.sin(phi);
      pos[3 * i + 1] = ORB_RADIUS * Math.sin(theta) * Math.sin(phi);
      pos[3 * i + 2] = ORB_RADIUS * Math.cos(phi);
      sc[i] = 0.7 + 0.6 * Math.random();
    }
    return { positions: pos, scales: sc };
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    return geo;
  }, [positions, scales]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uState: { value: 0 },
  }), []);

  useFrame((_, delta) => {
    uTime.current += delta;
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = uTime.current;
      materialRef.current.uniforms.uState.value = stateIndex;
    }
    if (state === 'CHATTING' && analyserNode && pointsRef.current) {
      const data = new Uint8Array(analyserNode.frequencyBinCount);
      analyserNode.getByteFrequencyData(data);
      const sc = new Float32Array(PARTICLE_COUNT);
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        sc[i] = 0.7 + 1.2 * (data[i % data.length] / 255);
      }
      pointsRef.current.geometry.setAttribute('aScale', new THREE.BufferAttribute(sc, 1));
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        transparent
      />
    </points>
  );
}

export default function MathsJarvisOrb({ state, analyserNode }: MathsJarvisOrbProps) {
  const [webglReady, setWebglReady] = useState(false);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (gl) setWebglReady(true);
    } catch {
      // WebGL not available — OrbErrorBoundary will show CSS fallback
    }
  }, []);

  if (!webglReady) return null;

  return (
    <Canvas
      camera={{ position: [0, 0, 4.5], fov: 38 }}
      style={{ height: 320, background: 'transparent' }}
      gl={{ antialias: false, alpha: true, powerPreference: 'low-power', failIfMajorPerformanceCaveat: false }}
    >
      <ambientLight intensity={0.7} />
      <OrbParticles state={state} analyserNode={analyserNode} />
    </Canvas>
  );
}
