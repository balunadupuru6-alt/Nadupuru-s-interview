import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface ChartPillarItem {
  label: string;
  sublabel: string;
  value: number; // 0 to 10
  colorHex: string;
}

interface PerformanceChart3DProps {
  items: ChartPillarItem[];
  className?: string;
}

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

export function PerformanceChart3D({ items, className = '' }: PerformanceChart3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemsRef = useRef(items);
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || items.length === 0) return;

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

    const width = container.clientWidth > 0 ? container.clientWidth : 320;
    const height = container.clientHeight > 0 ? container.clientHeight : 250;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 50);
    camera.position.set(0, 3.3, 6.8);
    camera.lookAt(0, 1.0, 0);

    const hemi = new THREE.HemisphereLight(0xfef2f2, 0x16090d, 0.95);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 1.85);
    key.position.set(4, 7, 5);
    scene.add(key);

    // Coordinate base deck
    const deckGeo = new THREE.BoxGeometry(items.length * 1.25 + 0.8, 0.08, 2.2);
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0x0c090b,
      roughness: 0.4,
      metalness: 0.75,
    });
    const deck = new THREE.Mesh(deckGeo, deckMat);
    deck.position.set(0, -0.04, 0);
    scene.add(deck);

    const grid = new THREE.GridHelper(items.length * 1.25 + 0.6, 10, 0x9f1239, 0x272024);
    grid.position.y = 0.01;
    scene.add(grid);

    const pillars: Array<{
      group: THREE.Group;
      bar: THREE.Mesh;
      cap: THREE.Mesh;
      targetH: number;
      currentH: number;
      idx: number;
    }> = [];

    const interactables: THREE.Object3D[] = [];
    const spacing = 1.2;
    const startX = -((items.length - 1) * spacing) / 2;

    items.forEach((item, idx) => {
      const pGroup = new THREE.Group();
      const x = startX + idx * spacing;
      pGroup.position.set(x, 0, 0);

      const targetH = Math.max(0.25, (item.value / 10) * 2.4);
      const color = new THREE.Color(item.colorHex);

      const barMat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.35,
        roughness: 0.25,
        metalness: 0.7,
      });

      const barGeo = new THREE.BoxGeometry(0.62, 1, 0.62);
      const bar = new THREE.Mesh(barGeo, barMat);
      bar.userData = { index: idx };
      pGroup.add(bar);
      interactables.push(bar);

      const capGeo = new THREE.BoxGeometry(0.68, 0.07, 0.68);
      const capMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: color,
        emissiveIntensity: 0.75,
        roughness: 0.15,
        metalness: 0.9,
      });
      const cap = new THREE.Mesh(capGeo, capMat);
      pGroup.add(cap);

      scene.add(pGroup);
      pillars.push({
        group: pGroup,
        bar,
        cap,
        targetH,
        currentH: 0.15,
        idx,
      });
    });

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(interactables, false);
      if (hits.length > 0) {
        const hitIdx = hits[0].object.userData.index;
        if (typeof hitIdx === 'number') {
          setSelectedIdx(hitIdx);
        }
      }
    };
    renderer.domElement.addEventListener('click', handleClick);

    const handleResize = () => {
      const w = container.clientWidth > 0 ? container.clientWidth : 300;
      const h = container.clientHeight > 0 ? container.clientHeight : 240;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      requestRender();
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;
    let renderBusy = false;
    let renderDirty = false;

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

    function requestRender() {
      if (disposed) return;
      if (renderBusy) {
        renderDirty = true;
        return;
      }
      renderBusy = true;
      frameId = requestAnimationFrame(() => {
        if (disposed) return;
        renderDirty = false;
        const dt = Math.min(clock.getDelta(), 0.1);
        let needsAnother = false;

        for (const p of pillars) {
          const next = THREE.MathUtils.damp(p.currentH, p.targetH, 6.5, dt);
          if (Math.abs(next - p.targetH) > 0.005) needsAnother = true;
          p.currentH = next;
          p.bar.scale.y = p.currentH;
          p.bar.position.y = p.currentH / 2 + 0.02;
          p.cap.position.y = p.currentH + 0.055;
        }

        renderer.render(scene, camera);

        const done = () => {
          renderBusy = false;
          if (needsAnother || renderDirty) {
            requestRender();
          }
        };

        if (isSoftwareGl) afterDraw(done);
        else done();
      });
    }

    requestRender();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      renderer.domElement.removeEventListener('click', handleClick);
      resizeObserver.disconnect();
      deckGeo.dispose();
      deckMat.dispose();
      grid.dispose();
      pillars.forEach((p) => {
        p.bar.geometry.dispose();
        (p.bar.material as THREE.Material).dispose();
        p.cap.geometry.dispose();
        (p.cap.material as THREE.Material).dispose();
      });
      renderer.dispose();
    };
  }, [items]);

  const activeItem = items[selectedIdx] ?? items[0];

  if (webglFailed) {
    return (
      <div className={`space-y-3 ${className}`}>
        {items.map((item) => (
          <div key={item.label} className="space-y-1">
            <div className="flex justify-between text-xs text-neutral-300">
              <span>{item.label}</span>
              <span className="font-mono tabular-nums">{item.value}/10</span>
            </div>
            <div className="h-2.5 rounded-full bg-neutral-900 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#9f1239]"
                style={{ width: `${(item.value / 10) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <div
        ref={containerRef}
        data-testid="performance-chart-3d"
        className="w-full h-[250px] cursor-pointer"
      />
      <div className="mt-2 grid grid-cols-5 gap-2">
        {items.map((item, idx) => (
          <button
            key={item.label}
            type="button"
            onClick={() => setSelectedIdx(idx)}
            className={`px-2 py-2 rounded-lg text-center transition-colors border ${
              idx === selectedIdx
                ? 'border-[#be123c] bg-[#881337]/30 text-white'
                : 'border-white/10 bg-black/50 text-neutral-400 hover:text-white'
            }`}
          >
            <div className="text-xs font-medium truncate">{item.label}</div>
            <div className="text-sm font-mono font-semibold tabular-nums text-white mt-0.5">
              {item.value.toFixed(1)}
            </div>
          </button>
        ))}
      </div>
      {activeItem && (
        <div className="mt-2 flex items-center justify-between text-xs text-neutral-400 px-1">
          <span>{activeItem.sublabel}</span>
          <span className="font-mono tabular-nums text-rose-300">
            {activeItem.value.toFixed(1)} / 10.0
          </span>
        </div>
      )}
    </div>
  );
}
