// components/GlobeVisual.tsx
"use client";

import { useEffect, useRef } from "react";
import type {
  Mesh,
  MeshBasicMaterial,
  QuadraticBezierCurve3,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
  WebGLRenderer,
} from "three";

type NetworkNode = {
  sprite: Sprite;
  glowSprite: Sprite;
  ringSprite: Sprite;
  baseScale: number;
  ringBaseScale: number;
  ringPhase: number;
  pos: Vector3;
  lat: number;
  lon: number;
};

type ArcData = {
  curve: QuadraticBezierCurve3;
  pulse: Mesh<SphereGeometry, MeshBasicMaterial>;
  t: number;
  speed: number;
};

/**
 * NETRA network globe — ported from the standalone Three.js build into a
 * container-scoped React component. It sizes itself to its parent (not the
 * window), cleans up its renderer/listeners on unmount, and exposes no DOM
 * text of its own — all copy/HUD chrome stays in page.tsx.
 *
 * v3: black + red "cyber intelligence" theme. Dense procedural node mesh,
 * land + ocean particle coverage, glowing additive-blended arcs, a static
 * neural-mesh point cloud for texture, pulsing radar rings + glow halos on
 * hub nodes, and a soft pulsing atmosphere. All heavy geometry is built
 * once on mount (BufferGeometry, shared/cloned materials) — nothing is
 * allocated per frame.
 */
export default function GlobeVisual() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let renderer: WebGLRenderer;
    let raf = 0;
    let ro: ResizeObserver | null = null;
    let cleanupDrag: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      const THREE = await import("three");
      if (cancelled || !mountRef.current) return;
      const container = mountRef.current;

      const W = () => container.clientWidth || 1;
      const H = () => container.clientHeight || 1;

      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x05070a, 0.0011);

      const camera = new THREE.PerspectiveCamera(45, W() / H(), 0.1, 5000);
      camera.position.set(0, 30, 640);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(W(), H());
      renderer.setClearColor(0x000000, 0);
      container.appendChild(renderer.domElement);

      const globeGroup = new THREE.Group();
      scene.add(globeGroup);

      const R = 200;

      function latLonToVec3(lat: number, lon: number, radius: number) {
        const phi = ((90 - lat) * Math.PI) / 180;
        const theta = ((lon + 180) * Math.PI) / 180;
        const x = -radius * Math.sin(phi) * Math.cos(theta);
        const z = radius * Math.sin(phi) * Math.sin(theta);
        const y = radius * Math.cos(phi);
        return new THREE.Vector3(x, y, z);
      }

      // ---------- starfield ----------
      (function stars() {
        const cnt = 1600;
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(cnt * 3);
        for (let i = 0; i < cnt; i++) {
          const r = 1400 + Math.random() * 1200;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
          pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
          pos[i * 3 + 2] = r * Math.cos(phi);
        }
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({
          color: 0x9a8f8f,
          size: 1.4,
          transparent: true,
          opacity: 0.5,
        });
        scene.add(new THREE.Points(geo, mat));
      })();

      // ---------- base sphere ----------
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(R * 0.995, 64, 64),
        new THREE.MeshBasicMaterial({ color: 0x0a0305 })
      );
      globeGroup.add(core);

      const wire = new THREE.Mesh(
        new THREE.SphereGeometry(R * 1.001, 36, 24),
        new THREE.MeshBasicMaterial({ color: 0x5c1a24, wireframe: true, transparent: true, opacity: 0.16 })
      );
      globeGroup.add(wire);

      // ---------- atmosphere (soft pulsing red halo) ----------
      const atmoMat = new THREE.ShaderMaterial({
        transparent: true,
        side: THREE.BackSide,
        uniforms: {
          glowColor: { value: new THREE.Color(0xff2b3d) },
          uTime: { value: 0 },
        },
        vertexShader: `
          varying vec3 vNormal;
          void main(){
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          uniform vec3 glowColor;
          uniform float uTime;
          void main(){
            float pulse = 0.85 + 0.15 * sin(uTime * 1.4);
            float intensity = pow(0.55 - dot(vNormal, vec3(0,0,1)), 3.0);
            gl_FragColor = vec4(glowColor, clamp(intensity,0.0,1.0) * 0.42 * pulse);
          }
        `,
      });
      const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.03, 48, 48), atmoMat);
      globeGroup.add(atmo);

      // ---------- rough land mask ----------
      const landRows = [
        "000000000000000000000000000000000000",
        "000000011100000000000000000011100000",
        "000000111110000000011111111111100000",
        "000001111111000001111111111111110000",
        "000011111111000011111111111111111000",
        "000011111111100011111111111111111000",
        "000001111111110001111111111111111100",
        "000000011111110001111111111111111000",
        "000000001111000001111111111111100000",
        "000000000111000001111111111111000000",
        "000000000111000001111111100000000000",
        "000000000111100000111111000011100000",
        "000000000011100000011111000011100000",
        "000000000001100000000000000000000000",
        "000000000000000000000000000000000000",
        "000000000000000000000000000000000000",
        "000000000000000000000000000000000000",
        "000000000000000000000000000000000000",
      ];

      function isLand(lat: number, lon: number) {
        const rowIdx = Math.min(17, Math.floor((85 - lat) / 10));
        let colIdx = Math.floor((lon + 180) / 10);
        colIdx = ((colIdx % 36) + 36) % 36;
        const row = landRows[rowIdx];
        if (!row) return false;
        return row[colIdx] === "1";
      }

      const sunDir = new THREE.Vector3(1, 0.15, 0.6).normalize();

      // ---------- land particles (dense, red glow, scan-lit) ----------
      const landPositions: number[] = [];
      const landColors: number[] = [];

      for (let lat = -85; lat <= 85; lat += 1.4) {
        for (let lon = -180; lon <= 179; lon += 1.4) {
          const jitterLat = lat + (Math.random() - 0.5) * 1.4;
          const jitterLon = lon + (Math.random() - 0.5) * 1.4;
          if (!isLand(jitterLat, jitterLon)) continue;
          if (Math.random() < 0.12) continue; // sparse skip only — keeps land looking illuminated

          const p = latLonToVec3(jitterLat, jitterLon, R + 0.6);
          landPositions.push(p.x, p.y, p.z);

          const n = p.clone().normalize();
          const light = THREE.MathUtils.clamp(n.dot(sunDir) * 0.5 + 0.5, 0, 1);
          const c = new THREE.Color();
          // red-family glow throughout; brighter near the scan-lit hemisphere
          c.setRGB(0.55 + light * 0.45, 0.08 + light * 0.22, 0.1 + light * 0.16);
          landColors.push(c.r, c.g, c.b);
        }
      }

      const landGeo = new THREE.BufferGeometry();
      landGeo.setAttribute("position", new THREE.Float32BufferAttribute(landPositions, 3));
      landGeo.setAttribute("color", new THREE.Float32BufferAttribute(landColors, 3));
      const landMat = new THREE.PointsMaterial({
        size: 2.0,
        vertexColors: true,
        transparent: true,
        opacity: 0.92,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      globeGroup.add(new THREE.Points(landGeo, landMat));

      // ---------- ocean particles (faint, prevents empty regions) ----------
      const oceanPositions: number[] = [];
      const oceanColors: number[] = [];

      for (let lat = -85; lat <= 85; lat += 2.4) {
        for (let lon = -180; lon <= 179; lon += 2.4) {
          const jitterLat = lat + (Math.random() - 0.5) * 2.4;
          const jitterLon = lon + (Math.random() - 0.5) * 2.4;
          if (isLand(jitterLat, jitterLon)) continue;
          if (Math.random() > 0.2) continue; // ~15-25% ocean coverage

          const p = latLonToVec3(jitterLat, jitterLon, R + 0.4);
          oceanPositions.push(p.x, p.y, p.z);

          const n = p.clone().normalize();
          const light = THREE.MathUtils.clamp(n.dot(sunDir) * 0.5 + 0.5, 0, 1);
          const c = new THREE.Color();
          c.setRGB(0.28 + light * 0.18, 0.03 + light * 0.05, 0.05 + light * 0.06);
          oceanColors.push(c.r, c.g, c.b);
        }
      }

      const oceanGeo = new THREE.BufferGeometry();
      oceanGeo.setAttribute("position", new THREE.Float32BufferAttribute(oceanPositions, 3));
      oceanGeo.setAttribute("color", new THREE.Float32BufferAttribute(oceanColors, 3));
      const oceanMat = new THREE.PointsMaterial({
        size: 1.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      globeGroup.add(new THREE.Points(oceanGeo, oceanMat));

      // ---------- static neural-mesh point cloud (thousands of short local links) ----------
      // Fibonacci sphere sampling for even coverage, connected to nearest few
      // neighbors, baked into ONE LineSegments geometry (single draw call,
      // built once — never touched again in the animation loop).
      (function buildNeuralMesh() {
        const meshCount = 420;
        const meshPts: Vector3[] = [];
        const golden = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < meshCount; i++) {
          const y = 1 - (i / (meshCount - 1)) * 2;
          const radiusAtY = Math.sqrt(1 - y * y);
          const theta = golden * i;
          const x = Math.cos(theta) * radiusAtY;
          const z = Math.sin(theta) * radiusAtY;
          meshPts.push(new THREE.Vector3(x, y, z).multiplyScalar(R + 1.2));
        }

        const segPositions: number[] = [];
        const maxDist = 55; // angular-ish cutoff in world units at this radius
        const kNearest = 3;

        for (let i = 0; i < meshPts.length; i++) {
          const dists: { j: number; d: number }[] = [];
          for (let j = 0; j < meshPts.length; j++) {
            if (i === j) continue;
            const d = meshPts[i].distanceTo(meshPts[j]);
            if (d < maxDist) dists.push({ j, d });
          }
          dists.sort((a, b) => a.d - b.d);
          const picks = dists.slice(0, kNearest);
          picks.forEach(({ j }) => {
            // avoid duplicating the reverse edge
            if (j > i) {
              segPositions.push(
                meshPts[i].x, meshPts[i].y, meshPts[i].z,
                meshPts[j].x, meshPts[j].y, meshPts[j].z
              );
            }
          });
        }

        const segGeo = new THREE.BufferGeometry();
        segGeo.setAttribute("position", new THREE.Float32BufferAttribute(segPositions, 3));
        const segMat = new THREE.LineBasicMaterial({
          color: 0xff2b3d,
          transparent: true,
          opacity: 0.1,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        globeGroup.add(new THREE.LineSegments(segGeo, segMat));

        // faint mesh vertices themselves, as tiny glowing dots
        const dotPositions: number[] = [];
        meshPts.forEach((p) => dotPositions.push(p.x, p.y, p.z));
        const dotGeo = new THREE.BufferGeometry();
        dotGeo.setAttribute("position", new THREE.Float32BufferAttribute(dotPositions, 3));
        const dotMat = new THREE.PointsMaterial({
          color: 0xff6b75,
          size: 1.6,
          transparent: true,
          opacity: 0.5,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        globeGroup.add(new THREE.Points(dotGeo, dotMat));
      })();

      // ---------- shared textures (built once, reused across nodes) ----------
      function makeGlowTexture() {
        const size = 128;
        const c = document.createElement("canvas");
        c.width = c.height = size;
        const ctx = c.getContext("2d")!;
        const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        grad.addColorStop(0, "rgba(255,80,90,0.9)");
        grad.addColorStop(0.4, "rgba(255,43,61,0.35)");
        grad.addColorStop(1, "rgba(255,43,61,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        const tex = new THREE.CanvasTexture(c);
        tex.needsUpdate = true;
        return tex;
      }

      function makeRingTexture() {
        const size = 128;
        const c = document.createElement("canvas");
        c.width = c.height = size;
        const ctx = c.getContext("2d")!;
        const cx = size / 2;
        const cy = size / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.42, 0, Math.PI * 2);
        ctx.lineWidth = size * 0.045;
        const grad = ctx.createRadialGradient(cx, cy, size * 0.3, cx, cy, size * 0.48);
        grad.addColorStop(0, "rgba(255,60,70,0)");
        grad.addColorStop(0.85, "rgba(255,60,70,0.9)");
        grad.addColorStop(1, "rgba(255,60,70,0)");
        ctx.strokeStyle = grad;
        ctx.stroke();
        const tex = new THREE.CanvasTexture(c);
        tex.needsUpdate = true;
        return tex;
      }

      const glowTex = makeGlowTexture();
      const ringTex = makeRingTexture();

      // ---------- operative avatar texture generator ----------
      // Generated icon avatars only — no real photos, no identifiable people.
      function makeAvatarTexture(seed: number, primary: boolean) {
        const size = 128;
        const c = document.createElement("canvas");
        c.width = c.height = size;
        const ctx = c.getContext("2d")!;
        const cx = size / 2;
        const cy = size / 2;

        const hue = (355 + ((seed * 7) % 20) - 10 + 360) % 360; // stays in the red band
        const bg1 = `hsl(${hue}, 55%, 18%)`;
        const bg2 = `hsl(${hue}, 60%, 7%)`;

        const glow = ctx.createRadialGradient(cx, cy, size * 0.28, cx, cy, size * 0.5);
        glow.addColorStop(0, primary ? "rgba(255,43,61,0.55)" : "rgba(255,120,120,0.28)");
        glow.addColorStop(1, "rgba(255,43,61,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, size, size);

        const r = size * 0.34;
        const bgGrad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
        bgGrad.addColorStop(0, bg1);
        bgGrad.addColorStop(1, bg2);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = bgGrad;
        ctx.fill();

        // silhouette (head + shoulders), clipped to the disc
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.fillStyle = "rgba(220,225,232,0.55)";
        ctx.beginPath();
        ctx.arc(cx, cy - r * 0.18, r * 0.34, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx, cy + r * 0.62, r * 0.62, r * 0.5, 0, Math.PI, 0);
        ctx.fill();
        ctx.restore();

        // ring border
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.lineWidth = primary ? 5 : 3;
        ctx.strokeStyle = primary ? "#ff2b3d" : "rgba(255,60,70,0.85)";
        ctx.stroke();

        // status dot
        const dotR = r * 0.18;
        const dx = cx + r * 0.74;
        const dy = cy + r * 0.74;
        ctx.beginPath();
        ctx.arc(dx, dy, dotR + 2, 0, Math.PI * 2);
        ctx.fillStyle = "#05070a";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(dx, dy, dotR, 0, Math.PI * 2);
        ctx.fillStyle = primary ? "#ff2b3d" : "#ff6a76";
        ctx.fill();

        const tex = new THREE.CanvasTexture(c);
        tex.needsUpdate = true;
        return tex;
      }

      // ---------- network nodes (operatives) ----------
      const PRIMARY = { name: "PRIMARY", lat: 51, lon: 10 };
      const NODES = [
        { name: "NEW YORK", lat: 40.7, lon: -74.0 },
        { name: "SAO PAULO", lat: -23.5, lon: -46.6 },
        { name: "LAGOS", lat: 6.5, lon: 3.4 },
        { name: "MOSCOW", lat: 55.7, lon: 37.6 },
        { name: "DUBAI", lat: 25.2, lon: 55.3 },
        { name: "MUMBAI", lat: 19.1, lon: 72.8 },
        { name: "BEIJING", lat: 39.9, lon: 116.4 },
        { name: "TOKYO", lat: 35.7, lon: 139.8 },
        { name: "SYDNEY", lat: -33.8, lon: 151.2 },
        { name: "LONDON", lat: 51.5, lon: -0.1 },
        { name: "CAIRO", lat: 30.0, lon: 31.2 },
        { name: "MEXICO CITY", lat: 19.4, lon: -99.1 },
        { name: "JOHANNESBURG", lat: -26.2, lon: 28.0 },
        { name: "ISTANBUL", lat: 41.0, lon: 28.9 },
        { name: "SEOUL", lat: 37.6, lon: 127.0 },
        { name: "BANGKOK", lat: 13.8, lon: 100.5 },
        { name: "TORONTO", lat: 43.7, lon: -79.4 },
        { name: "BERLIN", lat: 52.5, lon: 13.4 },
      ];

      function addAvatarNode(
        lat: number,
        lon: number,
        seed: number,
        primary: boolean
      ): NetworkNode {
        const pos = latLonToVec3(lat, lon, R + 3);

        // soft glow halo (behind avatar)
        const glowMat = new THREE.SpriteMaterial({
          map: glowTex,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: primary ? 0.9 : 0.55,
        });
        const glowSprite = new THREE.Sprite(glowMat);
        const glowScale = primary ? 70 : 46;
        glowSprite.scale.set(glowScale, glowScale, 1);
        glowSprite.position.copy(pos);
        globeGroup.add(glowSprite);

        // pulsing radar ring
        const ringMat = new THREE.SpriteMaterial({
          map: ringTex,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          opacity: 0,
        });
        const ringSprite = new THREE.Sprite(ringMat);
        ringSprite.position.copy(pos);
        globeGroup.add(ringSprite);

        // avatar
        const tex = makeAvatarTexture(seed, primary);
        const mat = new THREE.SpriteMaterial({
          map: tex,
          transparent: true,
          depthWrite: false,
        });
        const sprite = new THREE.Sprite(mat);
        const s = primary ? 34 : 20;
        sprite.scale.set(s, s, 1);
        sprite.position.copy(pos);
        globeGroup.add(sprite);

        const anchor = new THREE.Mesh(
          new THREE.SphereGeometry(1, 6, 6),
          new THREE.MeshBasicMaterial({ color: primary ? 0xff2b3d : 0xff6a76 })
        );
        anchor.position.copy(latLonToVec3(lat, lon, R + 0.5));
        globeGroup.add(anchor);

        return {
          sprite,
          glowSprite,
          ringSprite,
          baseScale: s,
          ringBaseScale: primary ? 40 : 26,
          ringPhase: Math.random() * Math.PI * 2,
          pos: latLonToVec3(lat, lon, R),
          lat,
          lon,
        };
      }

      const primaryNode = addAvatarNode(PRIMARY.lat, PRIMARY.lon, 0, true);
      const otherNodes = NODES.map((n, i) => addAvatarNode(n.lat, n.lon, i + 1, false));

      // ---------- connection mesh ----------
      // Hub links (primary -> everyone) plus a dense nearest-neighbor mesh
      // between every other node (each connects to 3-6 nearby nodes), so the
      // globe reads as one interconnected network rather than a single star.
      function makeArcCurve(a: Vector3, b: Vector3) {
        const dist = a.distanceTo(b);
        const mid = a.clone().add(b).multiplyScalar(0.5);
        const height = R + dist * 0.32;
        mid.setLength(height);
        return new THREE.QuadraticBezierCurve3(a, mid, b);
      }

      type Edge = { from: number; to: number };
      const edges: Edge[] = [];

      otherNodes.forEach((_, i) => edges.push({ from: -1, to: i }));

      const meshPairKeys = new Set<string>();
      const meshPairs: [number, number][] = [];

      otherNodes.forEach((node, i) => {
        const dists = otherNodes
          .map((other, j) => ({ j, d: node.pos.distanceTo(other.pos) }))
          .filter((e) => e.j !== i)
          .sort((a, b) => a.d - b.d);

        const degree = 3 + Math.floor(Math.random() * 4); // 3-6 connections
        dists.slice(0, degree).forEach(({ j }) => {
          const key = i < j ? `${i}-${j}` : `${j}-${i}`;
          if (!meshPairKeys.has(key)) {
            meshPairKeys.add(key);
            meshPairs.push([i, j]);
          }
        });
      });

      meshPairs.forEach(([a, b]) => edges.push({ from: a, to: b }));

      const arcData: ArcData[] = [];

      function nodePos(idx: number) {
        return idx === -1 ? primaryNode.pos : otherNodes[idx].pos;
      }

      edges.forEach((e) => {
        const a = nodePos(e.from);
        const b = nodePos(e.to);
        const curve = makeArcCurve(a, b);
        const pts = curve.getPoints(64);

        const geo = new THREE.BufferGeometry().setFromPoints(pts);
        const isHub = e.from === -1;
        const mat = new THREE.LineBasicMaterial({
          color: isHub ? 0xff2b3d : 0xff8a90,
          transparent: true,
          opacity: isHub ? 0.3 : 0.15,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const line = new THREE.Line(geo, mat);
        globeGroup.add(line);

        const pulseGeo = new THREE.SphereGeometry(isHub ? 1.6 : 1.1, 8, 8);
        const pulseMat = new THREE.MeshBasicMaterial({
          color: isHub ? 0xffb3ba : 0xffd6d9,
          transparent: true,
          opacity: 0.95,
        });
        const pulse = new THREE.Mesh(pulseGeo, pulseMat);
        globeGroup.add(pulse);

        arcData.push({
          curve,
          pulse,
          t: Math.random(),
          speed: (isHub ? 0.15 : 0.22) + Math.random() * 0.18,
        });
      });

      scene.add(new THREE.AmbientLight(0x331015, 1.0));

      // ---------- interaction: drag to rotate ----------
      let isDragging = false;
      let lastX = 0,
        lastY = 0;
      let rotVelX = 0,
        rotVelY = 0.0016;
      let userInteracted = false;

      const onDown = (e: PointerEvent) => {
        isDragging = true;
        userInteracted = true;
        lastX = e.clientX;
        lastY = e.clientY;
      };
      const onUp = () => (isDragging = false);
      const onMove = (e: PointerEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        rotVelY = dx * 0.0026;
        rotVelX = dy * 0.0026;
      };

      renderer.domElement.addEventListener("pointerdown", onDown);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointermove", onMove);
      cleanupDrag = () => {
        renderer.domElement.removeEventListener("pointerdown", onDown);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointermove", onMove);
      };

      // ---------- resize (container-scoped, not window) ----------
      ro = new ResizeObserver(() => {
        camera.aspect = W() / H();
        camera.updateProjectionMatrix();
        renderer.setSize(W(), H());
      });
      ro.observe(container);

      // ---------- animate ----------
      const allHubNodes = [primaryNode, ...otherNodes];
      const clock = new THREE.Clock();
      function animate() {
        raf = requestAnimationFrame(animate);
        const dt = Math.min(clock.getDelta(), 0.05);
        const t = clock.elapsedTime;

        atmoMat.uniforms.uTime.value = t;

        if (!isDragging) {
          globeGroup.rotation.y += userInteracted ? rotVelY * 0.05 : 0.045 * dt;
          globeGroup.rotation.x += rotVelX * 0.02;
          rotVelY *= 0.94;
          rotVelX *= 0.9;
        } else {
          globeGroup.rotation.y += rotVelY;
          globeGroup.rotation.x += rotVelX;
        }
        globeGroup.rotation.x = THREE.MathUtils.clamp(globeGroup.rotation.x, -0.9, 0.9);

        // breathing avatars + glow + radar rings
        allHubNodes.forEach((n, i) => {
          const breathe = 1 + Math.sin(t * 2.2 + i * 1.3) * 0.14;
          n.sprite.scale.set(n.baseScale * breathe, n.baseScale * breathe, 1);

          const glowPulse = 1 + Math.sin(t * 1.6 + i * 0.7) * 0.1;
          n.glowSprite.scale.set(
            n.glowSprite.scale.x === 0 ? 1 : n.glowSprite.scale.x, // no-op guard, keeps shape stable
            n.glowSprite.scale.y === 0 ? 1 : n.glowSprite.scale.y,
            1
          );
          const baseGlow = n === primaryNode ? 70 : 46;
          n.glowSprite.scale.set(baseGlow * glowPulse, baseGlow * glowPulse, 1);

          // radar ring: expands outward and fades, looping per-node phase
          const cycle = 2.6;
          const local = ((t + n.ringPhase) % cycle) / cycle; // 0..1
          const ringScale = n.ringBaseScale * (0.6 + local * 2.2);
          n.ringSprite.scale.set(ringScale, ringScale, 1);
          (n.ringSprite.material as SpriteMaterial).opacity =
            (1 - local) * (n === primaryNode ? 0.85 : 0.5);
        });

        arcData.forEach((a) => {
          a.t += dt * a.speed;
          if (a.t > 1) a.t = 0;
          const p = a.curve.getPoint(a.t);
          a.pulse.position.copy(p);
          const fade = Math.sin(a.t * Math.PI);
          a.pulse.material.opacity = 0.25 + fade * 0.75;
        });

        renderer.render(scene, camera);
      }
      animate();
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      cleanupDrag?.();
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
      }
    };
  }, []);

  return <div ref={mountRef} className="h-full w-full" />;
}
