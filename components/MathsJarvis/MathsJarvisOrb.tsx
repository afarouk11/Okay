import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Orb states
type OrbState = 'LISTENING' | 'THINKING' | 'CHATTING';

interface MathsJarvisOrbProps {
  state: OrbState;
  analyserNode?: AnalyserNode | null;
}

const PARTICLE_COUNT = 1200;
const ORB_RADIUS = 1.2;

// Custom shader for neon blue glow
const vertexShader = `
  uniform float uTime;
  attribute float aScale;
  varying float vScale;
  void main() {
    vScale = aScale;
    vec3 transformed = position;
    float pulse = 1.0;
    #ifdef LISTENING
      pulse = 1.0 + 0.08 * sin(uTime * 1.2 + position.x * 2.0);
    #endif
    #ifdef THINKING
      float swirl = 0.25 * sin(uTime * 3.0 + position.y * 6.0);
      transformed.xz = mat2(cos(swirl), -sin(swirl), sin(swirl), cos(swirl)) * transformed.xz;
      pulse = 1.0 + 0.18 * sin(uTime * 2.5 + position.y * 3.0);
    #endif
    #ifdef CHATTING
      pulse = aScale;
    #endif
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed * pulse, 1.0);
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

function useParticleData() {
  return useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const scales = new Float32Array(PARTICLE_COUNT);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const phi = Math.acos(1 - 2 * (i + 0.5) / PARTICLE_COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
      const r = ORB_RADIUS;
      positions[3 * i] = r * Math.cos(theta) * Math.sin(phi);
      positions[3 * i + 1] = r * Math.sin(theta) * Math.sin(phi);
      positions[3 * i + 2] = r * Math.cos(phi);
      scales[i] = 0.7 + 0.6 * Math.random();
    }
    return { positions, scales };
  }, []);
}

const MathsJarvisOrb: React.FC<MathsJarvisOrbProps> = ({ state, analyserNode }) => {
  const meshRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { positions, scales } = useParticleData();
  const uTime = useRef(0);
  const chattingScales = useRef<Float32Array>(scales.slice());

  useFrame((_, delta) => {
    uTime.current += delta;
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = uTime.current;
    }
    // CHATTING: Animate scale with audio
    if (state === 'CHATTING' && analyserNode && meshRef.current) {
      const data = new Uint8Array(analyserNode.frequencyBinCount);
      analyserNode.getByteFrequencyData(data);
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        chattingScales.current[i] = 0.7 + 1.2 * (data[i % data.length] / 255);
      }
      meshRef.current.geometry.setAttribute('aScale', new THREE.BufferAttribute(chattingScales.current, 1));
    }
  });

  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      meshRef.current.geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    }
  }, [positions, scales]);

  // Shader defines for state
  const defines = useMemo(() => {
    return {
      LISTENING: state === 'LISTENING',
      THINKING: state === 'THINKING',
      CHATTING: state === 'CHATTING',
    };
  }, [state]);

  return (
    <Canvas camera={{ position: [0, 0, 4.5], fov: 38 }} style={{ height: 320, background: 'transparent' }}>
      <ambientLight intensity={0.7} />
      <Points ref={meshRef} frustumCulled={false}>
        <shaderMaterial
          ref={materialRef}
          attach="material"
          args={[{
            uniforms: { uTime: { value: 0 } },
            vertexShader,
            fragmentShader,
            defines,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
          }]}
        />
      </Points>
      <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} />
    </Canvas>
  );
};

export default MathsJarvisOrb;
