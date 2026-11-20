import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { AppView } from '../types/interview';

interface Background3DCanvasProps {
  currentView: AppView;
}

interface ShardData {
  baseX: number;
  baseY: number;
  baseZ: number;
  radiusX: number;
  radiusY: number;
  speed: number;
  phase: number;
  rotSpeedX: number;
  rotSpeedY: number;
  scale: number;
}

const _dummy = new THREE.Object3D();
const _tempColor = new THREE.Color();

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

function createGlowParticleTexture(): THREE.CanvasTexture {
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
    grad.addColorStop(0.28, 'rgba(253, 164, 175, 0.8)');
    grad.addColorStop(0.65, 'rgba(159, 18, 57, 0.25)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function Background3DCanvas({ currentView }: Background3DCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<AppView>(currentView);
  const pointerRef = useRef({ x: 0, y: 0 });
  const scrollRef = useRef(0);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    viewRef.current = currentView;
  }, [currentView]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: false,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    const width = Math.max(window.innerWidth, 320);
    const height = Math.max(window.innerHeight, 320);

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2),
    );
    renderer.setSize(width, height);
    renderer.setClearColor(0x070608, 1);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setWebglFailed(true);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070608);
    scene.fog = new THREE.FogExp2(0x070608, 0.036);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04,
    ).texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 120);
    camera.position.set(0, 1.8, 11.5);
    camera.lookAt(0, -0.4, -18);

    // 3-Point Studio Lighting: White key, Rose/Obsidian hemisphere, Burgundy rim
    const hemiLight = new THREE.HemisphereLight(0xfef2f2, 0x16090d, 0.85);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(8, 12, 10);
    scene.add(keyLight);

    const burgundyRim = new THREE.PointLight(0xbe123c, 4.5, 45);
    burgundyRim.position.set(-10, 3, -12);
    scene.add(burgundyRim);

    const crimsonAccent = new THREE.PointLight(0x9f1239, 3.8, 40);
    crimsonAccent.position.set(11, -1, -16);
    scene.add(crimsonAccent);

    // 1. Animated 3D Undulating Perspective Terrain Grid (Floor)
    const floorGeo = new THREE.PlaneGeometry(78, 78, 46, 46);
    floorGeo.rotateX(-Math.PI / 2);

    const waveGridMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uDeepColor: { value: new THREE.Color(0x6b0f24) },
        uMidColor: { value: new THREE.Color(0xbe123c) },
        uHighlightColor: { value: new THREE.Color(0xffffff) },
      },
      vertexShader: `
        uniform float uTime;
        uniform vec2 uPointer;
        varying vec2 vUv;
        varying float vWave;
        varying float vDepth;

        void main() {
          vUv = uv;
          vec3 pos = position;

          float w1 = sin(pos.x * 0.22 + uTime * 0.85) * cos(pos.z * 0.22 - uTime * 0.65);
          float w2 = sin((pos.x + pos.z) * 0.14 - uTime * 0.5) * 0.7;
          float rippleDist = length(pos.xz - vec2(uPointer.x * 12.0, uPointer.y * 8.0 - 8.0));
          float pointerWave = sin(rippleDist * 0.45 - uTime * 2.2) * exp(-rippleDist * 0.06) * 0.85;

          float height = (w1 * 1.15 + w2 * 0.75) + pointerWave;
          pos.y += height;

          vWave = clamp((height + 1.8) / 3.6, 0.0, 1.0);
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          vDepth = -mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uDeepColor;
        uniform vec3 uMidColor;
        uniform vec3 uHighlightColor;
        varying vec2 vUv;
        varying float vWave;
        varying float vDepth;

        void main() {
          vec2 gridCoord = vUv * 36.0;
          vec2 cell = abs(fract(gridCoord - 0.5) - 0.5);
          float lineDist = min(cell.x, cell.y);
          float lineMask = 1.0 - smoothstep(0.015, 0.055, lineDist);

          // Subtle diagonal lattice pulse
          float diag = abs(fract((gridCoord.x + gridCoord.y) * 0.5 - 0.5) - 0.5);
          float diagMask = (1.0 - smoothstep(0.008, 0.03, diag)) * 0.22;

          vec3 gridColor = mix(uDeepColor, uMidColor, smoothstep(0.25, 0.72, vWave));
          gridColor = mix(gridColor, uHighlightColor, smoothstep(0.76, 1.0, vWave) * 0.75);

          float radialFade = 1.0 - smoothstep(0.28, 0.5, length(vUv - 0.5));
          float depthFade = 1.0 - smoothstep(14.0, 56.0, vDepth);
          float alpha = (lineMask * 0.65 + diagMask) * radialFade * depthFade;

          if (alpha < 0.01) discard;
          gl_FragColor = vec4(gridColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
    });

    const floorMesh = new THREE.Mesh(floorGeo, waveGridMat);
    floorMesh.position.set(0, -4.4, -18);
    scene.add(floorMesh);

    // 2. Overhead Architectural 3D Vault Grid (Ceiling)
    const ceilingGeo = new THREE.PlaneGeometry(74, 74, 24, 24);
    ceilingGeo.rotateX(Math.PI / 2);
    const ceilingMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x9f1239) },
        uWhite: { value: new THREE.Color(0xffffff) },
      },
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying float vDepth;
        varying float vCrest;
        void main() {
          vUv = uv;
          vec3 pos = position;
          float arch = sin(pos.x * 0.14 + uTime * 0.4) * cos(pos.z * 0.14 + uTime * 0.35) * 1.1;
          pos.y += arch;
          vCrest = clamp((arch + 1.1) / 2.2, 0.0, 1.0);
          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          vDepth = -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uWhite;
        varying vec2 vUv;
        varying float vDepth;
        varying float vCrest;
        void main() {
          vec2 cell = abs(fract(vUv * 24.0 - 0.5) - 0.5);
          float lineMask = 1.0 - smoothstep(0.012, 0.045, min(cell.x, cell.y));
          float radialFade = 1.0 - smoothstep(0.22, 0.5, length(vUv - 0.5));
          float depthFade = 1.0 - smoothstep(12.0, 52.0, vDepth);
          vec3 col = mix(uColor, uWhite, vCrest * 0.35);
          float alpha = lineMask * 0.28 * radialFade * depthFade;
          if (alpha < 0.01) discard;
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
    });
    const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceilingMesh.position.set(0, 11.2, -22);
    scene.add(ceilingMesh);

    // 3. Giant Background 3D Gyroscopic Rings & Orbital Nodes
    const ringsGroup = new THREE.Group();
    ringsGroup.position.set(0, 0.8, -17);
    scene.add(ringsGroup);

    const ringBurgundyMat = new THREE.MeshStandardMaterial({
      color: 0x9f1239,
      emissive: 0x6b0f24,
      emissiveIntensity: 0.9,
      roughness: 0.25,
      metalness: 0.85,
      transparent: true,
      opacity: 0.55,
    });
    const ringWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfda4af,
      emissiveIntensity: 0.45,
      roughness: 0.18,
      metalness: 0.9,
      transparent: true,
      opacity: 0.4,
    });

    const outerRing = new THREE.Mesh(
      new THREE.TorusGeometry(11.5, 0.045, 12, 96),
      ringBurgundyMat,
    );
    outerRing.rotation.set(Math.PI * 0.32, Math.PI * 0.15, 0);
    ringsGroup.add(outerRing);

    const midRing = new THREE.Mesh(
      new THREE.TorusGeometry(9.2, 0.032, 12, 88),
      ringWhiteMat,
    );
    midRing.rotation.set(-Math.PI * 0.26, Math.PI * 0.36, 0);
    ringsGroup.add(midRing);

    const innerRing = new THREE.Mesh(
      new THREE.TorusGeometry(7.1, 0.038, 12, 80),
      ringBurgundyMat,
    );
    innerRing.rotation.set(Math.PI * 0.44, -Math.PI * 0.22, 0);
    ringsGroup.add(innerRing);

    // 4. Instanced 3D Floating Geometric Shards (Black/Burgundy/White)
    const shardCount = 38;
    const shardGeo = new THREE.OctahedronGeometry(0.42, 0);
    const shardMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.22,
      metalness: 0.82,
    });
    const shardsMesh = new THREE.InstancedMesh(shardGeo, shardMat, shardCount);
    shardsMesh.frustumCulled = false;

    const shardData: ShardData[] = [];
    const paletteHex = [0x6b0f24, 0x9f1239, 0xbe123c, 0xffffff, 0xfda4af];

    for (let i = 0; i < shardCount; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const baseX = side * (3.5 + Math.random() * 14);
      const baseY = -2.5 + Math.random() * 9.5;
      const baseZ = -6 - Math.random() * 22;

      shardData.push({
        baseX,
        baseY,
        baseZ,
        radiusX: 0.4 + Math.random() * 0.9,
        radiusY: 0.35 + Math.random() * 0.85,
        speed: 0.25 + Math.random() * 0.45,
        phase: Math.random() * Math.PI * 2,
        rotSpeedX: (Math.random() - 0.5) * 0.65,
        rotSpeedY: (Math.random() - 0.5) * 0.75,
        scale: 0.45 + Math.random() * 0.9,
      });

      _dummy.position.set(baseX, baseY, baseZ);
      _dummy.scale.setScalar(shardData[i].scale);
      _dummy.updateMatrix();
      shardsMesh.setMatrixAt(i, _dummy.matrix);

      _tempColor.setHex(paletteHex[i % paletteHex.length]);
      shardsMesh.setColorAt(i, _tempColor);
    }
    shardsMesh.instanceMatrix.needsUpdate = true;
    if (shardsMesh.instanceColor) shardsMesh.instanceColor.needsUpdate = true;
    shardsMesh.computeBoundingSphere();
    scene.add(shardsMesh);

    // 5. Volumetric 3D Starlight / Ember Particle Field
    const particleCount = 210;
    const pPositions = new Float32Array(particleCount * 3);
    const pColors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      pPositions[i * 3] = (Math.random() - 0.5) * 38;
      pPositions[i * 3 + 1] = (Math.random() - 0.5) * 20 + 1;
      pPositions[i * 3 + 2] = -2 - Math.random() * 34;

      const isWhite = Math.random() > 0.55;
      if (isWhite) {
        pColors[i * 3] = 1;
        pColors[i * 3 + 1] = 0.95;
        pColors[i * 3 + 2] = 0.96;
      } else {
        pColors[i * 3] = 0.85;
        pColors[i * 3 + 1] = 0.14;
        pColors[i * 3 + 2] = 0.34;
      }
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(pPositions, 3),
    );
    particleGeo.setAttribute('color', new THREE.BufferAttribute(pColors, 3));

    const particleTex = createGlowParticleTexture();
    const particleMat = new THREE.PointsMaterial({
      size: 0.24,
      map: particleTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const particleField = new THREE.Points(particleGeo, particleMat);
    scene.add(particleField);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const handlePointerMove = (e: PointerEvent) => {
      pointerRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointerRef.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };

    const handleScroll = () => {
      const maxScroll = Math.max(
        document.documentElement.scrollHeight - window.innerHeight,
        1,
      );
      scrollRef.current = Math.min(1, Math.max(0, window.scrollY / maxScroll));
    };

    const handleResize = () => {
      const w = Math.max(window.innerWidth, 320);
      const h = Math.max(window.innerHeight, 320);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (prefersReducedMotion) {
        renderer.render(scene, camera);
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    const startTime = lastTime;

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
        const status = sync
          ? gl.getSyncParameter(sync, gl.SYNC_STATUS)
          : gl.SIGNALED;
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    let smoothScroll = 0;
    let smoothViewTilt = 0;

    function tick() {
      if (disposed) return;

      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;
      const elapsed = (now - startTime) / 1000;

      // Update shaders
      waveGridMat.uniforms.uTime.value = elapsed;
      waveGridMat.uniforms.uPointer.value.x = THREE.MathUtils.damp(
        waveGridMat.uniforms.uPointer.value.x,
        pointerRef.current.x,
        3.5,
        delta,
      );
      waveGridMat.uniforms.uPointer.value.y = THREE.MathUtils.damp(
        waveGridMat.uniforms.uPointer.value.y,
        pointerRef.current.y,
        3.5,
        delta,
      );
      ceilingMat.uniforms.uTime.value = elapsed;

      // View-aware subtle 3D scene tilt & scroll parallax
      const targetTilt =
        viewRef.current === 'session'
          ? 0.22
          : viewRef.current === 'report'
            ? -0.22
            : viewRef.current === 'dashboard'
              ? 0.12
              : 0;
      smoothViewTilt = THREE.MathUtils.damp(smoothViewTilt, targetTilt, 2.2, delta);
      smoothScroll = THREE.MathUtils.damp(
        smoothScroll,
        scrollRef.current,
        3.0,
        delta,
      );

      camera.position.x = THREE.MathUtils.damp(
        camera.position.x,
        pointerRef.current.x * 1.15,
        2.5,
        delta,
      );
      camera.position.y = THREE.MathUtils.damp(
        camera.position.y,
        1.8 + pointerRef.current.y * 0.55 - smoothScroll * 1.4,
        2.5,
        delta,
      );
      camera.position.z = THREE.MathUtils.damp(
        camera.position.z,
        11.5 - smoothScroll * 2.2,
        2.5,
        delta,
      );
      camera.lookAt(smoothViewTilt * 2.2, -0.4 - smoothScroll * 0.8, -18);

      // Animate gyroscopic background rings
      outerRing.rotation.z += delta * 0.08;
      outerRing.rotation.y += delta * 0.04;
      midRing.rotation.z -= delta * 0.11;
      midRing.rotation.x += delta * 0.05;
      innerRing.rotation.y -= delta * 0.14;
      ringsGroup.rotation.z = smoothViewTilt * 0.45;

      // Animate instanced geometric shards
      for (let i = 0; i < shardCount; i++) {
        const s = shardData[i];
        const t = elapsed * s.speed + s.phase;
        _dummy.position.set(
          s.baseX + Math.cos(t) * s.radiusX,
          s.baseY + Math.sin(t * 1.2) * s.radiusY,
          s.baseZ + Math.sin(t * 0.7) * 0.8,
        );
        _dummy.rotation.set(
          elapsed * s.rotSpeedX + s.phase,
          elapsed * s.rotSpeedY + s.phase,
          0,
        );
        _dummy.scale.setScalar(s.scale);
        _dummy.updateMatrix();
        shardsMesh.setMatrixAt(i, _dummy.matrix);
      }
      shardsMesh.instanceMatrix.needsUpdate = true;

      // Animate depth particle field
      particleField.rotation.y = elapsed * 0.025 + pointerRef.current.x * 0.06;
      particleField.position.y = Math.sin(elapsed * 0.3) * 0.35;

      renderer.render(scene, camera);

      if (prefersReducedMotion) {
        return;
      }

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
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener(
        'webglcontextlost',
        handleContextLost,
      );

      floorGeo.dispose();
      waveGridMat.dispose();
      ceilingGeo.dispose();
      ceilingMat.dispose();
      ringBurgundyMat.dispose();
      ringWhiteMat.dispose();
      shardGeo.dispose();
      shardMat.dispose();
      shardsMesh.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      particleTex.dispose();

      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
        }
      });

      renderer.dispose();
    };
  }, []);

  if (webglFailed) {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[#070608]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 50% 0%, rgba(128, 0, 32, 0.28), transparent 60%)',
        }}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      data-testid="background-3d-canvas"
      data-bg-view={currentView}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    />
  );
}
