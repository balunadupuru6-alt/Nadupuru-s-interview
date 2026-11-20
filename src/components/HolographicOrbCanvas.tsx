import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { OrbState } from '../types/interview';

interface HolographicOrbCanvasProps {
  orbState: OrbState;
  showFloatingObjects?: boolean;
  className?: string;
  compact?: boolean;
}

const _targetCoreColor = new THREE.Color();
const _targetRimColor = new THREE.Color();
const _currentCoreColor = new THREE.Color(0x6b0f24);
const _currentRimColor = new THREE.Color(0xf43f5e);

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createParticleTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(253, 164, 175, 0.85)');
    grad.addColorStop(0.7, 'rgba(159, 18, 57, 0.28)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createCodeBracketArtifact(accentMat: THREE.Material, frameMat: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-0.42, -0.32);
  shape.lineTo(0.42, -0.32);
  shape.lineTo(0.42, 0.32);
  shape.lineTo(-0.42, 0.32);
  shape.closePath();

  const plateGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.05,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.02,
    bevelThickness: 0.02,
  });
  plateGeo.center();
  const plate = new THREE.Mesh(plateGeo, frameMat);
  group.add(plate);

  // Code lines on front face
  const barWidths = [0.52, 0.36, 0.44];
  barWidths.forEach((w, idx) => {
    const barGeo = new THREE.BoxGeometry(w, 0.055, 0.03);
    const bar = new THREE.Mesh(barGeo, accentMat);
    bar.position.set(-0.26 + w / 2, 0.12 - idx * 0.12, 0.048);
    group.add(bar);
  });

  // Top beacon node
  const nodeGeo = new THREE.OctahedronGeometry(0.06, 0);
  const node = new THREE.Mesh(nodeGeo, accentMat);
  node.position.set(0.32, 0.24, 0.05);
  group.add(node);

  return group;
}

function createSignalNodeArtifact(accentMat: THREE.Material, frameMat: THREE.Material): THREE.Group {
  const group = new THREE.Group();

  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), accentMat);
  group.add(core);

  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.02, 12, 36), frameMat);
  ring1.rotation.x = Math.PI * 0.35;
  group.add(ring1);

  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.015, 12, 36), accentMat);
  ring2.rotation.y = Math.PI * 0.4;
  group.add(ring2);

  return group;
}

function createMetricsPrismArtifact(accentMat: THREE.Material, frameMat: THREE.Material): THREE.Group {
  const group = new THREE.Group();

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.05, 6), frameMat);
  base.position.y = -0.22;
  group.add(base);

  const heights = [0.22, 0.38, 0.3];
  heights.forEach((h, i) => {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.1, h, 0.1), accentMat);
    col.position.set((i - 1) * 0.16, -0.2 + h / 2, 0);
    group.add(col);
  });

  const cap = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.014, 10, 32), accentMat);
  cap.rotation.x = Math.PI / 2;
  cap.position.y = 0.26;
  group.add(cap);

  return group;
}

export function HolographicOrbCanvas({
  orbState,
  showFloatingObjects = false,
  className = '',
  compact = false,
}: HolographicOrbCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const orbStateRef = useRef<OrbState>(orbState);
  const pointerRef = useRef({ x: 0, y: 0 });
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    orbStateRef.current = orbState;
  }, [orbState]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    const width = container.clientWidth > 0 ? container.clientWidth : 280;
    const height = container.clientHeight > 0 ? container.clientHeight : 220;

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglFailed(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const scene = new THREE.Scene();

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(
      0,
      0.1,
      showFloatingObjects ? 6.35 : compact ? 5.95 : 5.6,
    );

    // 3-point studio lighting (White key, burgundy rim, deep charcoal fill)
    const hemiLight = new THREE.HemisphereLight(0xfef2f2, 0x16090d, 0.95);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.85);
    keyLight.position.set(4, 5, 5);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xbe123c, 3.0, 16);
    rimLight.position.set(-4, -2, -3);
    scene.add(rimLight);

    const orbGroup = new THREE.Group();
    scene.add(orbGroup);

    // 1. Inner Holographic Plasma Core (Custom GLSL ShaderMaterial)
    const coreGeo = new THREE.IcosahedronGeometry(1.02, 5);
    const coreShaderMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPulseSpeed: { value: 1.4 },
        uPulseAmp: { value: 0.05 },
        uCoreColor: { value: new THREE.Color(0x6b0f24) },
        uRimColor: { value: new THREE.Color(0xf43f5e) },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uPulseSpeed;
        uniform float uPulseAmp;
        varying vec3 vNormal;
        varying vec3 vViewPos;
        varying float vDisp;

        void main() {
          float wave = sin(position.x * 3.8 + uTime * uPulseSpeed)
                     * cos(position.y * 3.8 - uTime * (uPulseSpeed * 0.85))
                     * sin(position.z * 3.8 + uTime * 0.9);
          vDisp = wave;
          vec3 displaced = position + normal * (wave * uPulseAmp);
          vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vViewPos = -mvPosition.xyz;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uCoreColor;
        uniform vec3 uRimColor;
        uniform float uTime;
        varying vec3 vNormal;
        varying vec3 vViewPos;
        varying float vDisp;

        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(vViewPos);
          float fresnel = pow(1.0 - max(0.0, dot(viewDir, normal)), 2.4);
          float scan = 0.5 + 0.5 * sin(vViewPos.y * 14.0 - uTime * 2.5);
          vec3 color = mix(uCoreColor * 0.55, uRimColor, clamp(fresnel * 1.15 + vDisp * 1.4, 0.0, 1.0));
          color += uRimColor * scan * 0.14;
          float alpha = clamp(0.68 + fresnel * 0.32, 0.0, 1.0);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreShaderMat);
    orbGroup.add(coreMesh);

    // 2. Outer Geodesic Holographic Lattice
    const latticeGeo = new THREE.IcosahedronGeometry(1.24, 1);
    const latticeMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.28,
    });
    const latticeMesh = new THREE.Mesh(latticeGeo, latticeMat);
    orbGroup.add(latticeMesh);

    // 3. Glowing Energy Rings with Metallic Orbital Nodes
    const ringMatCyan = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xbe123c,
      emissiveIntensity: 0.95,
      roughness: 0.18,
      metalness: 0.85,
    });
    const ringMatBlue = new THREE.MeshStandardMaterial({
      color: 0x9f1239,
      emissive: 0x800020,
      emissiveIntensity: 1.25,
      roughness: 0.22,
      metalness: 0.88,
    });
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfda4af,
      emissiveIntensity: 0.85,
      roughness: 0.12,
      metalness: 0.95,
    });

    const ringGroup1 = new THREE.Group();
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(1.56, 0.022, 16, 80), ringMatCyan);
    ringGroup1.add(ring1);
    for (let i = 0; i < 3; i++) {
      const ang = (i * Math.PI * 2) / 3;
      const node = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 12), collarMat);
      node.position.set(Math.cos(ang) * 1.56, Math.sin(ang) * 1.56, 0);
      ringGroup1.add(node);
    }
    ringGroup1.rotation.set(Math.PI * 0.34, Math.PI * 0.12, 0);
    orbGroup.add(ringGroup1);

    const ringGroup2 = new THREE.Group();
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.78, 0.018, 16, 84), ringMatBlue);
    ringGroup2.add(ring2);
    for (let i = 0; i < 2; i++) {
      const ang = i * Math.PI;
      const node = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), collarMat);
      node.position.set(Math.cos(ang) * 1.78, Math.sin(ang) * 1.78, 0);
      ringGroup2.add(node);
    }
    ringGroup2.rotation.set(-Math.PI * 0.28, Math.PI * 0.42, 0);
    orbGroup.add(ringGroup2);

    const ringGroup3 = new THREE.Group();
    const ring3 = new THREE.Mesh(new THREE.TorusGeometry(1.98, 0.012, 12, 90), ringMatCyan);
    ringGroup3.add(ring3);
    ringGroup3.rotation.set(Math.PI * 0.48, -Math.PI * 0.18, 0);
    orbGroup.add(ringGroup3);

    // 4. Floating Particle Field Surrounding Orb
    const particleCount = 160;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const baseRadii = new Float32Array(particleCount);
    const baseAngles = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const radius = 1.65 + Math.random() * 1.95;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      baseRadii[i] = radius;
      baseAngles[i] = theta;
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.72;
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const whiteMix = Math.random();
      colors[i * 3] = 0.72 + whiteMix * 0.28;
      colors[i * 3 + 1] = whiteMix > 0.45 ? 0.75 + whiteMix * 0.25 : 0.18 + whiteMix * 0.25;
      colors[i * 3 + 2] = whiteMix > 0.45 ? 0.78 + whiteMix * 0.22 : 0.28 + whiteMix * 0.25;
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleTexture = createParticleTexture();
    const particleMat = new THREE.PointsMaterial({
      size: 0.11,
      map: particleTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 5. Optional Floating Interview-Related 3D Artifacts (Landing Page)
    const floatingGroup = new THREE.Group();
    const artifactFrameMat = new THREE.MeshStandardMaterial({
      color: 0x160c11,
      roughness: 0.32,
      metalness: 0.85,
    });
    const artifactAccentMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0x9f1239,
      emissiveIntensity: 0.95,
      roughness: 0.18,
      metalness: 0.55,
    });

    const artifactEntries: Array<{ mesh: THREE.Group; basePos: [number, number, number]; phase: number }> = [];
    if (showFloatingObjects) {
      const codeArtifact = createCodeBracketArtifact(artifactAccentMat, artifactFrameMat);
      codeArtifact.position.set(-1.82, 1.38, -0.45);
      codeArtifact.scale.setScalar(0.74);
      floatingGroup.add(codeArtifact);
      artifactEntries.push({ mesh: codeArtifact, basePos: [-1.82, 1.38, -0.45], phase: 0 });

      const signalArtifact = createSignalNodeArtifact(artifactAccentMat, artifactFrameMat);
      signalArtifact.position.set(1.9, 1.25, -0.55);
      signalArtifact.scale.setScalar(0.78);
      floatingGroup.add(signalArtifact);
      artifactEntries.push({ mesh: signalArtifact, basePos: [1.9, 1.25, -0.55], phase: 2.1 });

      const metricsArtifact = createMetricsPrismArtifact(artifactAccentMat, artifactFrameMat);
      metricsArtifact.position.set(1.75, -1.25, -0.35);
      metricsArtifact.scale.setScalar(0.76);
      floatingGroup.add(metricsArtifact);
      artifactEntries.push({ mesh: metricsArtifact, basePos: [1.75, -1.25, -0.35], phase: 4.2 });

      scene.add(floatingGroup);
    }

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointerRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerRef.current.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth > 0 ? container.clientWidth : 280;
      const h = container.clientHeight > 0 ? container.clientHeight : 220;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    let speedMult = 1.0;
    let targetScale = 1.0;
    let pulseSpeed = 1.4;
    let pulseAmp = 0.05;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const state = orbStateRef.current;

      // Map OrbState -> visual parameters
      let desiredSpeed = 1.0;
      let desiredScale = 1.0;
      let desiredPulseSpeed = 1.4;
      let desiredPulseAmp = 0.045;

      if (state === 'generating') {
        desiredSpeed = 3.2;
        desiredScale = 1.08;
        desiredPulseSpeed = 3.8;
        desiredPulseAmp = 0.095;
        _targetCoreColor.setHex(0x881337);
        _targetRimColor.setHex(0xfda4af);
      } else if (state === 'listening') {
        desiredSpeed = 1.35;
        desiredScale = 1.02 + Math.sin(elapsed * 3.0) * 0.025;
        desiredPulseSpeed = 2.0;
        desiredPulseAmp = 0.06;
        _targetCoreColor.setHex(0x5b0b1d);
        _targetRimColor.setHex(0xffffff);
      } else if (state === 'evaluating') {
        desiredSpeed = 4.1;
        desiredScale = 1.12;
        desiredPulseSpeed = 4.6;
        desiredPulseAmp = 0.11;
        _targetCoreColor.setHex(0xbe123c);
        _targetRimColor.setHex(0xfff1f2);
      } else if (state === 'feedback') {
        desiredSpeed = 1.5;
        desiredScale = 1.04;
        desiredPulseSpeed = 1.8;
        desiredPulseAmp = 0.055;
        _targetCoreColor.setHex(0x800020);
        _targetRimColor.setHex(0xffffff);
      } else {
        _targetCoreColor.setHex(0x6b0f24);
        _targetRimColor.setHex(0xf43f5e);
      }

      speedMult = THREE.MathUtils.damp(speedMult, desiredSpeed, 4.5, delta);
      targetScale = THREE.MathUtils.damp(targetScale, desiredScale, 5.0, delta);
      pulseSpeed = THREE.MathUtils.damp(pulseSpeed, desiredPulseSpeed, 4.0, delta);
      pulseAmp = THREE.MathUtils.damp(pulseAmp, desiredPulseAmp, 4.0, delta);

      const colorAlpha = 1 - Math.exp(-4.5 * delta);
      _currentCoreColor.lerp(_targetCoreColor, colorAlpha);
      _currentRimColor.lerp(_targetRimColor, colorAlpha);

      coreShaderMat.uniforms.uTime.value = elapsed;
      coreShaderMat.uniforms.uPulseSpeed.value = pulseSpeed;
      coreShaderMat.uniforms.uPulseAmp.value = pulseAmp;
      coreShaderMat.uniforms.uCoreColor.value.copy(_currentCoreColor);
      coreShaderMat.uniforms.uRimColor.value.copy(_currentRimColor);

      latticeMat.color.copy(_currentRimColor);
      ringMatCyan.emissive.copy(_currentRimColor);

      orbGroup.scale.setScalar(targetScale);
      orbGroup.rotation.y += delta * 0.25 * speedMult;
      orbGroup.rotation.x = THREE.MathUtils.damp(
        orbGroup.rotation.x,
        pointerRef.current.y * 0.16,
        3.5,
        delta,
      );
      orbGroup.rotation.z = THREE.MathUtils.damp(
        orbGroup.rotation.z,
        -pointerRef.current.x * 0.12,
        3.5,
        delta,
      );

      latticeMesh.rotation.y -= delta * 0.35 * speedMult;
      latticeMesh.rotation.x += delta * 0.18 * speedMult;

      ringGroup1.rotation.z += delta * 0.55 * speedMult;
      ringGroup1.rotation.y += delta * 0.22 * speedMult;

      ringGroup2.rotation.z -= delta * 0.45 * speedMult;
      ringGroup2.rotation.x += delta * 0.24 * speedMult;

      ringGroup3.rotation.y += delta * 0.32 * speedMult;

      particles.rotation.y += delta * 0.12 * speedMult;
      particles.rotation.x = Math.sin(elapsed * 0.3) * 0.08;

      for (const entry of artifactEntries) {
        entry.mesh.position.y =
          entry.basePos[1] + Math.sin(elapsed * 1.1 + entry.phase) * 0.16;
        entry.mesh.rotation.y += delta * 0.45;
        entry.mesh.rotation.x = Math.sin(elapsed * 0.7 + entry.phase) * 0.14;
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('pointermove', handlePointerMove);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);

      coreGeo.dispose();
      coreShaderMat.dispose();
      latticeGeo.dispose();
      latticeMat.dispose();
      ringMatCyan.dispose();
      ringMatBlue.dispose();
      collarMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      particleTexture.dispose();
      artifactFrameMat.dispose();
      artifactAccentMat.dispose();

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
        }
      });

      renderer.dispose();
    };
  }, [compact, showFloatingObjects]);

  if (webglFailed) {
    return (
      <div
        data-testid="holographic-orb-canvas"
        data-orb-state={orbState}
        className={`relative flex items-center justify-center ${className}`}
      >
        <div className="relative h-56 w-56 rounded-full bg-gradient-to-br from-[#800020]/50 via-[#9f1239]/35 to-black border border-white/40 shadow-[0_0_60px_rgba(159,18,57,0.45)] flex items-center justify-center">
          <div className="h-36 w-36 rounded-full border border-rose-300/45 bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="holographic-orb-canvas"
      data-orb-state={orbState}
      aria-label={`3D AI Interviewer Orb in ${orbState} state`}
      className={`relative w-full h-full ${compact ? 'min-h-0' : 'min-h-[260px]'} select-none ${className}`}
    />
  );
}
