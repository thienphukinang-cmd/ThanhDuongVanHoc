import * as THREE from 'three';
import { loadGlbCached, normalizeModelToHeight, sanitizeGeometryBuffers } from '../utils/modelLoaderHelper.js';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger.js';
import {
  createLyDynastyDragonRelief3D,
  createLyCloudAndWaveRelief3D,
  createLyLotusWaveNormalMaterial
} from './museumReliefSculptor.js';

/**
 * ============================================================================
 * NAM QUỐC SƠN HÀ — CỔNG DỊCH CHUYỂN & CÕI NGOẠI CẢNH ĐÊM SÔNG NHƯ NGUYỆT
 * Phối hợp kỹ năng:
 * - blender-3d-asset-pipeline & threejs-auto-integrator (portal_nhu_nguyet.glb + fallback)
 * - camera-director (Cutscene Dolly-Zoom xuyên cổng)
 * - water-mountain-vfx-sculptor (Mặt sông 64x64 sin/cos, phản chiếu lửa thuyền, bọt sóng InstancedMesh, núi xa)
 * - cultural-heritage-modeler & ornamental-relief-sculptor (Đền Trương Hống - Trương Hát, rồng thời Lý, thủy ba)
 * - mesh-detailing-specialist (InstancedMesh giáo, cờ chữ Lý, đuốc lửa, cọc gỗ phòng tuyến; Points tàn lửa & sương mù)
 * - audio-soundscape-director & interactive-lore-guide (PositionalAudio ngâm thơ / trống trận / sóng sông + Chiếu lụa cổ)
 * - hitbox-collision-architect, web-xr-teleport-controller & fps-optimizer (Box3, Proxy, H/F2 Debug, VR, dispose)
 * ============================================================================
 */

const PALETTE = {
  gold: 0xd4af37,
  crimson: 0x8b1e1e,
  midnight: 0x0b1528,
  deepNight: 0x060d1c,
  torchFlame: 0xff8c2b
};

function createSeededRandom(seed = 1077) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function prepGeo(geo) {
  if (!geo) return geo;
  sanitizeGeometryBuffers(geo);
  return geo;
}

/** Tạo Normal Map chuẩn tuyến tính THREE.LinearSRGBColorSpace từ height canvas */
function buildLinearNormalTexture(heightCanvas, strength = 2.6, repeatX = 1, repeatY = 1, disposables = []) {
  const w = heightCanvas.width;
  const h = heightCanvas.height;
  const src = heightCanvas.getContext('2d').getImageData(0, 0, w, h).data;
  const nCanvas = document.createElement('canvas');
  nCanvas.width = w;
  nCanvas.height = h;
  const nCtx = nCanvas.getContext('2d');
  const dstImg = nCtx.createImageData(w, h);
  const dst = dstImg.data;

  const sample = (x, y) => {
    const wx = ((x % w) + w) % w;
    const wy = ((y % h) + h) % h;
    return src[(wy * w + wx) * 4] / 255;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let dx = (sample(x - 1, y) - sample(x + 1, y)) * strength;
      let dy = (sample(x, y - 1) - sample(x, y + 1)) * strength;
      let dz = 1.0;
      const len = Math.hypot(dx, dy, dz);
      dx /= len;
      dy /= len;
      dz /= len;
      const idx = (y * w + x) * 4;
      dst[idx] = Math.round((dx * 0.5 + 0.5) * 255);
      dst[idx + 1] = Math.round((dy * 0.5 + 0.5) * 255);
      dst[idx + 2] = Math.round((dz * 0.5 + 0.5) * 255);
      dst[idx + 3] = 255;
    }
  }
  nCtx.putImageData(dstImg, 0, 0);

  const tex = new THREE.CanvasTexture(nCanvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.LinearSRGBColorSpace;
  tex.needsUpdate = true;
  disposables.push(tex);
  return tex;
}

function makeCanvasTex(canvas, { rx = 1, ry = 1, srgb = true, disposables = [] } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rx, ry);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
  tex.needsUpdate = true;
  disposables.push(tex);
  return tex;
}

/** Tạo cờ đại chữ "Lý" (李) nền đỏ son viền vàng kim (SRGBColorSpace) */
export function createLyBannerTexture(disposables = []) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#9e1c1c');
  g.addColorStop(0.5, '#7c1414');
  g.addColorStop(1, '#580c0c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 512);

  // Viền vàng răng cưa hoàng gia
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 14;
  ctx.strokeRect(10, 10, 236, 492);
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, 208, 464);

  // Vòng tròn vàng trung tâm & đại tự chữ "Lý" (李)
  ctx.fillStyle = 'rgba(212, 175, 55, 0.16)';
  ctx.beginPath();
  ctx.arc(128, 220, 82, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 5;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 126px "SimSun", "KaiTi", "Times New Roman", serif';
  ctx.shadowColor = 'rgba(0,0,0,0.75)';
  ctx.shadowBlur = 10;
  ctx.fillStyle = '#fde68a';
  ctx.fillText('李', 128, 222);

  ctx.shadowBlur = 0;
  ctx.font = 'bold 26px "Times New Roman", serif';
  ctx.fillStyle = '#f6d365';
  ctx.fillText('ĐẠI VIỆT', 128, 372);
  ctx.font = 'italic 20px "Times New Roman", serif';
  ctx.fillText('NHƯ NGUYỆT', 128, 410);

  return makeCanvasTex(c, { srgb: true, disposables });
}

function createSignPlaqueTex(title, subtitle, {
  bg = '#0b1528',
  border = '#d4af37',
  titleCol = '#fde68a',
  subCol = '#cbd5e1',
  w = 960,
  h = 200
} = {}, disposables = []) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = border;
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.strokeStyle = '#8b1e1e';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, w - 40, h - 40);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = titleCol;
  ctx.font = 'bold 42px Georgia, "Times New Roman", serif';
  ctx.fillText(title, w / 2, subtitle ? h * 0.38 : h * 0.5);

  if (subtitle) {
    ctx.fillStyle = subCol;
    ctx.font = 'italic 24px Georgia, "Times New Roman", serif';
    ctx.fillText(subtitle, w / 2, h * 0.72);
  }
  return makeCanvasTex(c, { srgb: true, disposables });
}

function createRealmTextures(disposables) {
  const rng = createSeededRandom(1077);
  const sz = 256;

  // 1. Đất bờ sông Như Nguyệt + heightmap -> NormalMap LinearSRGBColorSpace
  const bankC = document.createElement('canvas');
  bankC.width = sz;
  bankC.height = sz;
  const bCtx = bankC.getContext('2d');
  const bankHC = document.createElement('canvas');
  bankHC.width = sz;
  bankHC.height = sz;
  const bhCtx = bankHC.getContext('2d');

  bCtx.fillStyle = '#18212b';
  bCtx.fillRect(0, 0, sz, sz);
  bhCtx.fillStyle = '#808080';
  bhCtx.fillRect(0, 0, sz, sz);

  for (let i = 0; i < 1200; i++) {
    const x = rng() * sz;
    const y = rng() * sz;
    const r = 1.5 + rng() * 5.5;
    bCtx.fillStyle = rng() > 0.45 ? 'rgba(34, 46, 36, 0.34)' : 'rgba(14, 18, 26, 0.42)';
    bCtx.beginPath();
    bCtx.arc(x, y, r, 0, Math.PI * 2);
    bCtx.fill();

    const hv = 85 + Math.floor(rng() * 85);
    bhCtx.fillStyle = `rgb(${hv},${hv},${hv})`;
    bhCtx.fillRect(x, y, r, r);
  }

  // 2. Soft particle radial glow
  const ptC = document.createElement('canvas');
  ptC.width = 64;
  ptC.height = 64;
  const pCtx = ptC.getContext('2d');
  const grad = pCtx.createRadialGradient(32, 32, 0, 32, 32, 30);
  grad.addColorStop(0.0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,224,145,0.65)');
  grad.addColorStop(1.0, 'rgba(255,150,50,0)');
  pCtx.fillStyle = grad;
  pCtx.fillRect(0, 0, 64, 64);

  // 3. Soft river mist texture
  const mistC = document.createElement('canvas');
  mistC.width = 64;
  mistC.height = 64;
  const mCtx = mistC.getContext('2d');
  const mGrad = mCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
  mGrad.addColorStop(0.0, 'rgba(190,220,255,0.62)');
  mGrad.addColorStop(0.55, 'rgba(130,175,235,0.25)');
  mGrad.addColorStop(1.0, 'rgba(20,40,80,0)');
  mCtx.fillStyle = mGrad;
  mCtx.fillRect(0, 0, 64, 64);

  return {
    bankDiff: makeCanvasTex(bankC, { rx: 10, ry: 8, srgb: true, disposables }),
    bankNorm: buildLinearNormalTexture(bankHC, 2.5, 10, 8, disposables),
    particleTex: makeCanvasTex(ptC, { srgb: true, disposables }),
    mistTex: makeCanvasTex(mistC, { srgb: true, disposables }),
    lyBannerTex: createLyBannerTexture(disposables)
  };
}

/** Procedural Fallback cho cổng portal_nhu_nguyet.glb */
function buildProceduralPortalFallback() {
  const g = new THREE.Group();
  g.name = 'Portal_Nhu_Nguyet_Fallback';
  const crimsonMat = new THREE.MeshStandardMaterial({ color: PALETTE.crimson, roughness: 0.35, metalness: 0.15 });
  const goldMat = new THREE.MeshStandardMaterial({ color: PALETTE.gold, roughness: 0.24, metalness: 0.85 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x1b283b, roughness: 0.78 });

  [-1.9, 1.9].forEach((x) => {
    const base = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(1.1, 0.4, 1.2)), stoneMat);
    base.position.set(x, 0.2, 0);
    g.add(base);
    const col = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.22, 0.24, 3.6, 12)), crimsonMat);
    col.position.set(x, 2.0, 0);
    g.add(col);
  });
  const beam = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(5.2, 0.4, 0.9)), crimsonMat);
  beam.position.set(0, 3.9, 0);
  g.add(beam);
  const roof = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(6.0, 0.3, 1.6)), goldMat);
  roof.position.set(0, 4.35, 0);
  g.add(roof);
  return g;
}

/** Đóng gói 1 chiến thuyền Đại Việt thời Lý trên sông Như Nguyệt */
function buildDaiVietWarBoat(woodMat, goldMat, crimsonMat, bannerMat, flameMat) {
  const boat = new THREE.Group();
  boat.name = 'DaiViet_WarBoat';

  // Thân thuyền thuôn nhọn
  const hull = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(2.2, 0.85, 7.6)), woodMat);
  hull.position.y = 0.25;
  boat.add(hull);

  const prow = new THREE.Mesh(prepGeo(new THREE.ConeGeometry(1.1, 2.2, 4)), woodMat);
  prow.rotation.x = -Math.PI / 2;
  prow.rotation.z = Math.PI / 4;
  prow.position.set(0, 0.38, -4.7);
  boat.add(prow);

  // Đầu rồng vàng mũi thuyền
  const dragonHead = new THREE.Mesh(prepGeo(new THREE.ConeGeometry(0.32, 0.95, 8)), goldMat);
  dragonHead.rotation.x = -Math.PI * 0.32;
  dragonHead.position.set(0, 1.05, -5.35);
  boat.add(dragonHead);

  // Mạn thuyền & chòi lái
  const cabin = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(1.65, 1.15, 2.1)), crimsonMat);
  cabin.position.set(0, 1.15, 1.85);
  boat.add(cabin);

  const cabinRoof = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(2.15, 0.22, 2.6)), goldMat);
  cabinRoof.position.set(0, 1.82, 1.85);
  boat.add(cabinRoof);

  // Cột buồm & cánh buồm chữ "Lý"
  const mast = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.08, 0.11, 6.2, 8)), woodMat);
  mast.position.set(0, 3.2, -0.4);
  boat.add(mast);

  const sailGeo = prepGeo(new THREE.PlaneGeometry(3.2, 3.8, 6, 4));
  const posAttr = sailGeo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const sx = posAttr.getX(i);
    const sy = posAttr.getY(i);
    const belly = Math.cos((sx / 1.6) * Math.PI * 0.5) * Math.cos((sy / 1.9) * Math.PI * 0.5) * 0.45;
    posAttr.setZ(i, -belly);
  }
  sailGeo.computeVertexNormals();
  const sail = new THREE.Mesh(sailGeo, bannerMat);
  sail.position.set(0, 3.7, -0.58);
  boat.add(sail);

  // Lò đuốc chiến trên mũi thuyền (hắt sáng xuống sóng nước)
  const brazier = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.24, 0.14, 0.35, 10)), goldMat);
  brazier.position.set(0, 0.95, -4.3);
  boat.add(brazier);

  const flame = new THREE.Mesh(prepGeo(new THREE.ConeGeometry(0.22, 0.55, 8)), flameMat);
  flame.position.set(0, 1.32, -4.3);
  flame.userData.preventMerge = true;
  boat.add(flame);

  mergeGroupMeshesByMaterial(boat);
  return { boat, flame };
}

/**
 * Xây dựng Cổng Dịch Chuyển tại Phòng 202 và Cõi Ngoại Cảnh Đêm Sông Như Nguyệt
 */
export function createNamQuocSonHaStoryRealm({
  roomGroup,
  interiorGroup,
  mainScene = null,
  realmScene = null,
  cameraManager = null
} = {}) {
  const portalPositionLocal = new THREE.Vector3(0, 0, -10.15);

  let _camera = null;
  let _renderer = null;
  let _cameraManager = cameraManager || null;
  let _hitboxManager = null;
  let _loreGuide = null;
  let _spatialAudio = null;
  let _portalInteraction = null;
  let _immersionSystem = null;

  let _isInsideRealm = false;
  let _isTransitioning = false;
  let _reentryCooldown = 0;

  let _realmRoot = null;
  let _realmDisposables = [];
  let _realmDebugGroup = null;
  let _realmWalkables = [];
  let _realmState = null;

  // Auto-Tour state (hỗ trợ cả trong phòng và bay xuyên cổng ra sông Như Nguyệt)
  let _tourActive = false;
  let _tourPhase = 'idle'; // 'room_flying' | 'room_dwelling' | 'portal_crossing' | 'realm_flying' | 'realm_dwelling'
  let _tourIdx = 0;
  let _tourPhaseStart = 0;
  let _tourFlightStartPos = new THREE.Vector3();
  let _tourFlightStartQuat = new THREE.Quaternion();
  let _tourFlightEndQuat = new THREE.Quaternion();

  const museumPortalTriggerWorldPos = new THREE.Vector3(-58.15, 11.8, -19.0);
  const realmSpawnPos = new THREE.Vector3(0, 2.9, 25.5);
  const realmSpawnLookAt = new THREE.Vector3(-4.0, 2.2, -12.0);

  function getMuseumReturnPose() {
    if (interiorGroup) {
      interiorGroup.updateMatrixWorld(true);
      return {
        camPos: interiorGroup.localToWorld(new THREE.Vector3(0, 1.8, 7.6)),
        lookAt: interiorGroup.localToWorld(new THREE.Vector3(0, 2.2, -4.5))
      };
    }
    return {
      camPos: new THREE.Vector3(-40.4, 11.8, -19.0),
      lookAt: new THREE.Vector3(-52.5, 12.2, -19.0)
    };
  }

  /** Độ cao mặt đất bờ Nam sông Như Nguyệt cho CameraController & VR */
  function getRiverbankFloorHeightAt(x = 0, z = 0) {
    // Đồi đền Trương Hống - Trương Hát phía Tây-Nam
    const dxTemple = x - (-13.5);
    const dzTemple = z - 15.0;
    const distTemple = Math.hypot(dxTemple, dzTemple);
    if (distTemple < 10.5) {
      const hill = Math.max(0, 1.0 - distTemple / 10.5);
      return 1.05 + hill * 0.55;
    }
    // Bờ dốc từ đường đất (Z >= 12) xuống mép sông (Z = 6)
    if (z <= 12.0) {
      const t = Math.max(0, Math.min(1, (z - 5.0) / 7.0));
      return 0.25 + t * 0.85;
    }
    return 1.1;
  }

  // =========================================================================
  // PHẦN 1: CỔNG DỊCH CHUYỂN TẠI CUỐI PHÒNG 202 (portal_nhu_nguyet.glb)
  // =========================================================================
  const portalGroup = new THREE.Group();
  portalGroup.name = 'NamQuocSonHa_Portal_Station';
  portalGroup.position.copy(portalPositionLocal);
  interiorGroup.add(portalGroup);

  const portalModelHolder = new THREE.Group();
  portalModelHolder.name = 'NamQuocSonHa_Portal_ModelHolder';
  portalGroup.add(portalModelHolder);

  const fallbackPortal = buildProceduralPortalFallback();
  portalModelHolder.add(fallbackPortal);

  loadGlbCached(['/models/namquocsonha/portal_nhu_nguyet.glb'], {
    targetHeight: 4.95,
    maxTextureSize: 1024,
    disableMipmaps: true
  })
    .then((raw) => {
      if (!raw) throw new Error('Empty portal GLB');
      portalModelHolder.remove(fallbackPortal);
      fallbackPortal.traverse((o) => {
        o.geometry?.dispose?.();
        o.material?.dispose?.();
      });
      raw.traverse((c) => {
        if (c.isMesh) {
          c.castShadow = false;
          c.receiveShadow = false;
          c.frustumCulled = true;
          c.userData.isSharedCachedAsset = true;
        }
      });
      portalModelHolder.add(raw);
      syncMuseumPortalHitboxes();
    })
    .catch(() => {
      syncMuseumPortalHitboxes();
    });

  // Phù điêu Rồng thời Lý & Sóng Thủy Ba trên mặt tiền cổng dịch chuyển
  const portalReliefGoldMat = new THREE.MeshStandardMaterial({
    color: PALETTE.gold,
    metalness: 0.86,
    roughness: 0.24,
    emissive: 0x452b05,
    emissiveIntensity: 0.25
  });
  const portalWaveFrieze = createLyCloudAndWaveRelief3D({
    width: 3.3,
    color: PALETTE.gold,
    crimsonAccent: PALETTE.crimson,
    material: portalReliefGoldMat
  });
  portalWaveFrieze.position.set(0, 3.65, 0.56);
  portalGroup.add(portalWaveFrieze);

  // Shader xoáy ánh trăng & kim quang Thiên Thư giữa cổng đền
  const portalShaderMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uGold: { value: new THREE.Color(0xd4af37) },
      uNight: { value: new THREE.Color(0x1f6feb) }
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uGold;
      uniform vec3 uNight;
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - vec2(0.5, 0.48)) * vec2(1.0, 1.3);
        float d = length(p);
        float ang = atan(p.y, p.x);
        float swirl = sin(d * 16.0 - uTime * 3.2 + ang * 3.0) * 0.5 + 0.5;
        float ripple = sin(vUv.y * 22.0 - uTime * 2.4) * 0.5 + 0.5;
        float mask = smoothstep(0.62, 0.10, d);
        vec3 col = mix(uNight, uGold, swirl * 0.65 + ripple * 0.25);
        float alpha = clamp((exp(-d * 3.2) * 0.72 + swirl * 0.35) * mask, 0.0, 0.90);
        gl_FragColor = vec4(col, alpha);
      }
    `
  });
  const portalPlane = new THREE.Mesh(prepGeo(new THREE.PlaneGeometry(2.55, 3.4)), portalShaderMat);
  portalPlane.position.set(0, 1.95, 0.02);
  portalPlane.userData.ignoreRaycaster = true;
  portalGroup.add(portalPlane);

  const portalPointLight = new THREE.PointLight(0xd4af37, 3.4, 11.0, 1.6);
  portalPointLight.position.set(0, 3.2, 0.65);
  portalGroup.add(portalPointLight);

  const portalSignDisposables = [];
  const portalSignTex = createSignPlaqueTex(
    'CỔNG DỊCH CHUYỂN • ĐỀN TRƯƠNG HỐNG – TRƯƠNG HÁT',
    'Tiến lại gần (< 2.5m) hoặc Click để ra Chiến Tuyến Sông Như Nguyệt (1077)',
    { bg: '#0b1528', border: '#d4af37', titleCol: '#fde68a', subCol: '#93c5fd', w: 1024, h: 175 },
    portalSignDisposables
  );
  const portalSign = new THREE.Mesh(
    prepGeo(new THREE.PlaneGeometry(3.8, 0.66)),
    new THREE.MeshBasicMaterial({ map: portalSignTex, transparent: true })
  );
  portalSign.position.set(0, 5.45, 0.42);
  portalSign.userData.ignoreRaycaster = true;
  portalGroup.add(portalSign);

  // Invisible Raycast Proxy (visible=true, opacity=0, isBookPortal: true)
  const portalClickProxy = new THREE.Mesh(
    prepGeo(new THREE.BoxGeometry(3.3, 4.4, 1.5)),
    new THREE.MeshBasicMaterial({
      color: 0xd4af37,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    })
  );
  portalClickProxy.name = 'NamQuocSonHa_Portal_ClickProxy';
  portalClickProxy.position.set(0, 2.2, 0);
  portalClickProxy.userData = {
    isClickProxy: true,
    isBookPortal: true,
    isTeleportBook: true,
    targetRealm: 'NAM_QUOC_SON_HA_REALM',
    ignoreRaycaster: false,
    linkedVisualObject: portalGroup,
    portalMetadata: {
      id: 'nam_quoc_son_ha',
      title: 'CÕI NGOẠI CẢNH • CHIẾN TUYẾN SÔNG NHƯ NGUYỆT',
      author: 'Thái úy Lý Thường Kiệt (1019 – 1105)',
      genre: 'Thơ ca Trung đại • Bản Tuyên Ngôn Độc Lập Đầu Tiên (1077)',
      quote: '“Nam quốc sơn hà Nam đế cư, tiệt nhiên định phận tại thiên thư...”',
      themeColor: 0xd4af37,
      targetRealm: 'NAM_QUOC_SON_HA_REALM',
      portalReady: true,
      onActivate: () => enterRealm('namquocsonha')
    },
    onActivate: () => enterRealm('namquocsonha')
  };
  portalGroup.add(portalClickProxy);

  function syncMuseumPortalHitboxes() {
    if (!roomGroup) return;
    roomGroup.updateMatrixWorld(true);
    interiorGroup.updateMatrixWorld(true);
    museumPortalTriggerWorldPos.copy(
      interiorGroup.localToWorld(new THREE.Vector3(0, 1.8, portalPositionLocal.z))
    );

    if (_hitboxManager) {
      const leftPierPos = interiorGroup.localToWorld(new THREE.Vector3(-2.05, 1.9, portalPositionLocal.z));
      const rightPierPos = interiorGroup.localToWorld(new THREE.Vector3(2.05, 1.9, portalPositionLocal.z));
      _hitboxManager.registerSolidObjectCollider(null, {
        customBox: new THREE.Box3().setFromCenterAndSize(leftPierPos, new THREE.Vector3(1.15, 3.8, 1.45)),
        tag: 'NQSH_PortalPierLeft',
        helperColor: 0x06b6d4,
        realm: 'museum'
      });
      _hitboxManager.registerSolidObjectCollider(null, {
        customBox: new THREE.Box3().setFromCenterAndSize(rightPierPos, new THREE.Vector3(1.15, 3.8, 1.45)),
        tag: 'NQSH_PortalPierRight',
        helperColor: 0x06b6d4,
        realm: 'museum'
      });

      // Đồng bộ Proxy Click Hitbox cho Cổng Dịch Chuyển
      portalClickProxy.updateMatrixWorld(true);
      const portalBox = new THREE.Box3().setFromObject(portalClickProxy);
      if (!_hitboxManager.clickProxies.includes(portalClickProxy)) {
        portalClickProxy.userData.realm = 'museum';
        _hitboxManager.clickProxies.push(portalClickProxy);
        const h = new THREE.Box3Helper(portalBox, 0xfde047);
        h.name = `Helper_${portalClickProxy.name}`;
        _hitboxManager.debugHelpers.add(h);
      }
    }
  }

  // =========================================================================
  // PHẦN 2: OVERLAY & HUD NGOẠI CẢNH SÔNG NHƯ NGUYỆT
  // =========================================================================
  function getOrCreateVignetteOverlay() {
    if (typeof document === 'undefined') return null;
    let el = document.getElementById('nqsh-dolly-vignette');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'nqsh-dolly-vignette';
    el.style.cssText = `
      position: fixed; inset: 0; pointer-events: none; z-index: 999990;
      opacity: 0; transition: opacity 0.2s ease;
      background: radial-gradient(circle, rgba(212,175,55,0.22) 0%, rgba(11,21,40,0.92) 55%, #030712 100%);
    `;
    document.body.appendChild(el);
    return el;
  }

  function speakPoemRecitation() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(
        'Nam quốc sơn hà Nam đế cư. Tiệt nhiên định phận tại thiên thư. Như hà nghịch lỗ lai xâm phạm. Nhữ đẳng hành khan thủ bại hư.'
      );
      utter.lang = 'vi-VN';
      utter.rate = 0.82;
      utter.pitch = 0.86;
      utter.volume = 0.85;
      window.speechSynthesis.speak(utter);
    } catch (_) {}
  }

  function stopPoemRecitation() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
    } catch (_) {}
  }

  function getOrCreateRealmHUD() {
    if (typeof document === 'undefined') return null;
    let hud = document.getElementById('nqsh-realm-top-hud');
    if (hud) return hud;

    hud = document.createElement('div');
    hud.id = 'nqsh-realm-top-hud';
    hud.style.cssText = `
      position: fixed; top: 18px; left: 50%; transform: translateX(-50%);
      z-index: 99990; display: none; align-items: center; gap: 10px;
      padding: 10px 18px; border-radius: 999px;
      background: linear-gradient(135deg, rgba(11,21,40,0.94), rgba(62,14,14,0.90));
      border: 1.5px solid #d4af37; color: #fef3c7;
      font-family: "Segoe UI", system-ui, sans-serif; font-size: 13px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.75); backdrop-filter: blur(8px);
    `;
    hud.innerHTML = `
      <span id="nqsh-hud-title" style="font-weight:700; color:#fde68a; letter-spacing:0.4px;">
        ⚔️ CHIẾN TUYẾN SÔNG NHƯ NGUYỆT • ĐÊM KHÁNG TỐNG (1077)
      </span>
      <button id="nqsh-btn-recite" style="
        background: rgba(212,175,55,0.18); border:1px solid #d4af37; color:#fde68a;
        padding:6px 12px; border-radius:999px; cursor:pointer; font-weight:600; font-size:12px;
      ">🔊 Ngâm Thơ Thần</button>
      <button id="nqsh-btn-tour" style="
        background: linear-gradient(90deg, #b88918, #d4af37); border:none; color:#0b1528;
        padding:6px 14px; border-radius:999px; cursor:pointer; font-weight:700; font-size:12px;
      ">🧭 Auto-Tour Sông Như Nguyệt</button>
      <button id="nqsh-btn-exit" style="
        background: rgba(139,30,30,0.75); border:1px solid #f87171; color:#fee2e2;
        padding:6px 14px; border-radius:999px; cursor:pointer; font-weight:700; font-size:12px;
      ">⬅ Về Phòng Trưng Bày [ESC]</button>
    `;
    document.body.appendChild(hud);

    document.getElementById('nqsh-btn-recite')?.addEventListener('click', (e) => {
      e.stopPropagation();
      speakPoemRecitation();
      _loreGuide?.showLoreCard?.('nqsh_denTruongHong');
    });
    document.getElementById('nqsh-btn-tour')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (_tourActive) stopAutoTour();
      else startRealmOnlyTour();
    });
    document.getElementById('nqsh-btn-exit')?.addEventListener('click', (e) => {
      e.stopPropagation();
      exitRealm();
    });

    return hud;
  }

  // =========================================================================
  // PHẦN 3: DỰNG ĐẠI CẢNH ĐÊM SÔNG NHƯ NGUYỆT TRONG REALMSCENE
  // =========================================================================
  function mountNhuNguyetRealm() {
    if (!realmScene) return;
    disposeNhuNguyetRealm();

    const rng = createSeededRandom(1077);
    const root = new THREE.Group();
    root.name = 'NamQuocSonHa_NhuNguyet_Universe_Root';
    realmScene.add(root);
    _realmRoot = root;

    const tex = createRealmTextures(_realmDisposables);

    // 1. Vòm trời đêm trăng huyền bí (#0b1528) & trăng rằm soi sông
    const skyGeo = prepGeo(new THREE.SphereGeometry(220, 40, 24));
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying vec3 vDir;
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        void main() {
          float h = clamp(vDir.y, 0.0, 1.0);
          vec3 zenith = vec3(0.025, 0.045, 0.095);
          vec3 horizon = vec3(0.055, 0.10, 0.185);
          vec3 sky = mix(horizon, zenith, pow(h, 0.55));

          // Ánh trăng rằm phía Bắc sông Như Nguyệt
          vec3 moonDir = normalize(vec3(0.12, 0.34, -0.93));
          float moonDot = max(0.0, dot(vDir, moonDir));
          float moonDisc = smoothstep(0.9965, 0.9985, moonDot);
          float moonHalo = pow(moonDot, 14.0) * 0.38 + pow(moonDot, 4.0) * 0.10;
          sky += vec3(0.75, 0.85, 1.0) * moonHalo + vec3(1.0, 0.97, 0.86) * moonDisc * 1.4;

          // Ánh lửa chiến trận mờ ảo nơi chân trời Bắc
          float battleHaze = exp(-abs(vDir.y - 0.03) * 16.0) * smoothstep(0.3, -0.8, vDir.z) * 0.18;
          sky += vec3(0.78, 0.32, 0.12) * battleHaze;

          // Tinh tú lấp lánh
          vec2 grid = floor(vDir.xz / max(0.22, vDir.y + 0.35) * 95.0);
          float star = step(0.994, hash(grid)) * smoothstep(0.14, 0.55, h);
          float twinkle = 0.65 + 0.35 * sin(uTime * 2.5 + hash(grid) * 20.0);
          sky += vec3(0.85, 0.90, 1.0) * star * twinkle * 0.65;

          gl_FragColor = vec4(sky, 1.0);
        }
      `
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    skyDome.userData.ignoreRaycaster = true;
    root.add(skyDome);

    // 2. Hệ thống ánh sáng đêm trăng + lửa trại + đền thần vàng kim (0 shadows)
    const hemi = new THREE.HemisphereLight(0x4b6a9b, 0x1c140e, 0.92);
    root.add(hemi);

    const moonLight = new THREE.DirectionalLight(0xa6c8ff, 1.05);
    moonLight.position.set(16, 48, -68);
    moonLight.castShadow = false;
    root.add(moonLight);

    const campFill = new THREE.DirectionalLight(0xffb454, 0.48);
    campFill.position.set(-24, 18, 28);
    campFill.castShadow = false;
    root.add(campFill);

    // 3. Vật liệu dùng chung (fps-optimizer)
    const bankMat = new THREE.MeshStandardMaterial({
      map: tex.bankDiff,
      normalMap: tex.bankNorm,
      roughness: 0.92,
      metalness: 0.04
    });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x1c2838, roughness: 0.78, metalness: 0.12 });
    const crimsonMat = new THREE.MeshStandardMaterial({ color: PALETTE.crimson, roughness: 0.32, metalness: 0.18 });
    const goldMat = new THREE.MeshStandardMaterial({
      color: PALETTE.gold,
      roughness: 0.24,
      metalness: 0.86,
      emissive: 0x452b05,
      emissiveIntensity: 0.32
    });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x2e1c11, roughness: 0.82 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.25, metalness: 0.90 });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffa03b });
    const bannerMat = new THREE.MeshStandardMaterial({
      map: tex.lyBannerTex,
      roughness: 0.55,
      side: THREE.DoubleSide
    });
    const carvedTempleMat = createLyLotusWaveNormalMaterial('crimsonGold', 3, 2);

    // 4. BỜ NAM SÔNG NHƯ NGUYỆT (Walkable Ground + Pier + Temple Hill)
    const bankGeo = prepGeo(new THREE.PlaneGeometry(110, 42, 44, 24));
    bankGeo.rotateX(-Math.PI / 2);
    const bPos = bankGeo.attributes.position;
    for (let i = 0; i < bPos.count; i++) {
      const vx = bPos.getX(i);
      const vz = bPos.getZ(i) + 25.0; // Z in [4, 46]
      bPos.setZ(i, vz);
      bPos.setY(i, getRiverbankFloorHeightAt(vx, vz));
    }
    bankGeo.computeVertexNormals();
    bankGeo.computeBoundingBox();
    bankGeo.computeBoundingSphere();
    const southBankMesh = new THREE.Mesh(bankGeo, bankMat);
    southBankMesh.name = 'NhuNguyet_SouthBank_Walkable';
    southBankMesh.userData.isWalkableFloor = true;
    root.add(southBankMesh);
    _realmWalkables.push(southBankMesh);

    // Bến đá & lối đi dẫn ra mép sông
    const pierMesh = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(6.8, 0.42, 18.5)), stoneMat);
    pierMesh.position.set(0, 0.82, 15.2);
    pierMesh.userData.isWalkableFloor = true;
    root.add(pierMesh);
    _realmWalkables.push(pierMesh);

    // 5. MẶT SÔNG NHƯ NGUYỆT (GPU Shader Wave Displacement, 0 CPU vertex loops)
    const riverW = 190;
    const riverD = 96;
    const riverGeo = prepGeo(new THREE.PlaneGeometry(riverW, riverD, 48, 48));
    riverGeo.rotateX(-Math.PI / 2);

    const boatFireUniforms = [
      new THREE.Vector3(-16.0, 1.3, -15.0),
      new THREE.Vector3(-5.5, 1.3, -10.5),
      new THREE.Vector3(4.5, 1.3, -13.0),
      new THREE.Vector3(15.0, 1.3, -9.5),
      new THREE.Vector3(24.0, 1.3, -17.5)
    ];

    const riverMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDeepColor: { value: new THREE.Color(0x061020) },
        uWaveColor: { value: new THREE.Color(0x10294a) },
        uMoonColor: { value: new THREE.Color(0xa9cbff) },
        uFireColor: { value: new THREE.Color(0xff7b24) },
        uBoatFires: { value: boatFireUniforms }
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        varying vec3 vWorldPos;
        varying vec3 vNorm;
        void main() {
          vec3 pos = position;
          float bx = pos.x;
          float bz = pos.z;
          pos.y += sin(bx * 0.22 + uTime * 2.1) * cos(bz * 0.19 + uTime * 1.6) * 0.13
                 + sin(bx * 0.45 - uTime * 2.8 + bz * 0.3) * 0.05;
          vec4 wp = modelMatrix * vec4(pos, 1.0);
          vWorldPos = wp.xyz;
          float dwdx = 0.13 * 0.22 * cos(bx * 0.22 + uTime * 2.1) * cos(bz * 0.19 + uTime * 1.6)
                     + 0.05 * 0.45 * cos(bx * 0.45 - uTime * 2.8 + bz * 0.3);
          float dwdz = -0.13 * 0.19 * sin(bx * 0.22 + uTime * 2.1) * sin(bz * 0.19 + uTime * 1.6)
                     + 0.05 * 0.30 * cos(bx * 0.45 - uTime * 2.8 + bz * 0.3);
          vNorm = normalize(vec3(-dwdx, 1.0, -dwdz));
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uDeepColor;
        uniform vec3 uWaveColor;
        uniform vec3 uMoonColor;
        uniform vec3 uFireColor;
        uniform vec3 uBoatFires[5];
        varying vec3 vWorldPos;
        varying vec3 vNorm;

        void main() {
          vec3 V = normalize(cameraPosition - vWorldPos);
          // Vi sóng bổ sung mượt mà lên normal
          float r1 = sin(vWorldPos.x * 1.4 + uTime * 2.4) * cos(vWorldPos.z * 1.1 - uTime * 1.9);
          float r2 = cos(vWorldPos.x * 2.2 - uTime * 3.1 + vWorldPos.z * 1.8);
          vec3 N = normalize(vNorm + vec3(r1 * 0.14, 0.0, r2 * 0.14));

          float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
          vec3 col = mix(uDeepColor, uWaveColor, fresnel * 0.72 + (vWorldPos.y + 0.15) * 1.2);

          // Phản chiếu ánh trăng rằm trên dòng sông
          vec3 moonDir = normalize(vec3(0.12, 0.34, -0.93));
          vec3 Hmoon = normalize(moonDir + V);
          float moonSpec = pow(max(dot(N, Hmoon), 0.0), 42.0) * 1.05;
          col += uMoonColor * moonSpec;

          // Phản chiếu ánh lửa từ 5 chiến thuyền Đại Việt & đền thần
          for (int i = 0; i < 5; i++) {
            vec3 Lvec = uBoatFires[i] - vWorldPos;
            float dist = length(Lvec);
            vec3 L = Lvec / max(dist, 0.001);
            vec3 H = normalize(L + V);
            float atten = exp(-dist * 0.085);
            float shimmer = pow(max(dot(N, H), 0.0), 18.0) * 1.8 + atten * 0.42;
            float flicker = 0.85 + 0.15 * sin(uTime * 8.0 + float(i) * 1.9);
            col += uFireColor * shimmer * atten * flicker;
          }

          // Sương đêm nhẹ ở chân trời xa
          float fogFactor = smoothstep(32.0, 95.0, length(cameraPosition.xz - vWorldPos.xz));
          col = mix(col, vec3(0.043, 0.082, 0.157), fogFactor * 0.78);

          gl_FragColor = vec4(col, 1.0);
        }
      `
    });

    const riverMesh = new THREE.Mesh(riverGeo, riverMat);
    riverMesh.name = 'NhuNguyet_River_Water_64x64';
    riverMesh.position.set(0, 0.0, -34.0);
    riverMesh.userData.ignoreRaycaster = true;
    root.add(riverMesh);

    // Neo nguồn âm thanh tiếng sóng vỗ sông Như Nguyệt
    const riverAudioAnchor = new THREE.Object3D();
    riverAudioAnchor.position.set(0, 0.8, -6.0);
    root.add(riverAudioAnchor);

    // 6. DÃY NÚI TRẦM MẶC PHÍA XA BỜ BẮC SÔNG NHƯ NGUYỆT
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x0e1a2e,
      roughness: 0.94,
      metalness: 0.02
    });
    const mountainSpecs = [
      [-65, -72, 24, 34], [-42, -66, 20, 29], [-18, -74, 28, 40], [8, -68, 22, 32],
      [34, -76, 30, 42], [58, -69, 24, 35], [-82, -62, 18, 26], [80, -64, 20, 28]
    ];
    const mountainsGroup = new THREE.Group();
    mountainsGroup.name = 'NhuNguyet_Distant_Mountains';
    mountainSpecs.forEach(([mx, mz, mr, mh]) => {
      const mGeo = prepGeo(new THREE.ConeGeometry(mr, mh, 7));
      const m = new THREE.Mesh(mGeo, mountainMat);
      m.position.set(mx, mh * 0.42 - 1.5, mz);
      m.rotation.y = rng() * Math.PI;
      m.userData.ignoreRaycaster = true;
      mountainsGroup.add(m);
    });
    mergeGroupMeshesByMaterial(mountainsGroup);
    root.add(mountainsGroup);

    // 7. ĐỀN THỜ HAI VỊ THẦN TRƯƠNG HỐNG – TRƯƠNG HÁT PHÁT SÁNG (Bên bờ sông X = -13.5, Z = 15.0)
    const templeGroup = new THREE.Group();
    templeGroup.name = 'Den_Truong_Hong_Truong_Hat';
    templeGroup.position.set(-13.5, 1.48, 15.0);
    templeGroup.rotation.y = 0.48; // Hướng mặt về bến sông & đường trung tâm
    root.add(templeGroup);

    // Bệ tam cấp đá xanh
    const tStep1 = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(8.6, 0.36, 7.2)), stoneMat);
    tStep1.position.y = 0.18;
    templeGroup.add(tStep1);
    const tStep2 = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(7.6, 0.34, 6.2)), stoneMat);
    tStep2.position.y = 0.52;
    templeGroup.add(tStep2);

    // Vách hậu & hai vách bên đền chạm phù điêu
    const tBackWall = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(6.8, 3.6, 0.35)), carvedTempleMat);
    tBackWall.position.set(0, 2.48, -2.5);
    templeGroup.add(tBackWall);

    // 6 cột gỗ sơn son thếp vàng mặt tiền & hiên đền
    const colGeo = prepGeo(new THREE.CylinderGeometry(0.20, 0.23, 3.6, 12));
    [[-3.1, 2.2], [-1.35, 2.2], [1.35, 2.2], [3.1, 2.2], [-3.1, -2.1], [3.1, -2.1]].forEach(([cx, cz]) => {
      const col = new THREE.Mesh(colGeo, crimsonMat);
      col.position.set(cx, 2.48, cz);
      templeGroup.add(col);
      const collar = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.24, 0.24, 0.18, 12)), goldMat);
      collar.position.set(cx, 3.9, cz);
      templeGroup.add(collar);
    });

    // Mái đao cong 2 tầng thời Lý phát sáng viền vàng
    const roofTileMat = new THREE.MeshStandardMaterial({ color: 0x3b1212, roughness: 0.45, metalness: 0.2 });
    const tRoof1 = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(8.8, 0.28, 6.4)), roofTileMat);
    tRoof1.position.set(0, 4.45, 0);
    templeGroup.add(tRoof1);
    const tRoof2 = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(6.2, 0.28, 4.2)), roofTileMat);
    tRoof2.position.set(0, 5.25, -0.2);
    templeGroup.add(tRoof2);
    [-4.3, 4.3].forEach((hx) => {
      [-2.8, 2.8].forEach((hz) => {
        const horn = new THREE.Mesh(prepGeo(new THREE.ConeGeometry(0.24, 1.05, 6)), goldMat);
        horn.position.set(hx, 4.72, hz);
        horn.rotation.z = hx < 0 ? 0.65 : -0.65;
        templeGroup.add(horn);
      });
    });

    // Phù điêu Rồng thời Lý & Sóng Thủy Ba trên xà ngang đền thần
    const templeDragon = createLyDynastyDragonRelief3D({ scale: 0.85, color: PALETTE.gold, material: goldMat });
    templeDragon.position.set(0, 4.08, 2.45);
    templeGroup.add(templeDragon);

    // Gian thờ phát sáng bên trong đền (Bài vị Nhị vị Tôn Thần Trương Hống - Trương Hát)
    const shrineTabletTex = createSignPlaqueTex(
      'ĐỀN THỜ TRƯƠNG HỐNG – TRƯƠNG HÁT',
      '“Nam quốc sơn hà Nam đế cư • Tiệt nhiên định phận tại thiên thư”',
      { bg: '#260808', border: '#d4af37', titleCol: '#fde68a', subCol: '#fef08a', w: 920, h: 240 },
      _realmDisposables
    );
    const shrineTablet = new THREE.Mesh(
      prepGeo(new THREE.PlaneGeometry(3.8, 1.05)),
      new THREE.MeshBasicMaterial({ map: shrineTabletTex })
    );
    shrineTablet.position.set(0, 2.75, -2.22);
    shrineTablet.userData.preventMerge = true;
    templeGroup.add(shrineTablet);

    // Lư hương & nhị vị thánh tượng phát sáng vàng kim
    const altar = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(2.8, 1.0, 1.1)), crimsonMat);
    altar.position.set(0, 1.18, -1.5);
    templeGroup.add(altar);
    const censer = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.24, 0.16, 0.45, 12)), goldMat);
    censer.position.set(0, 1.90, -1.25);
    templeGroup.add(censer);

    const templeLight = new THREE.PointLight(0xf6c453, 18.0, 28.0, 1.35);
    templeLight.position.set(0, 3.2, 0.8);
    templeGroup.add(templeLight);

    // Invisible Click Proxy cho Đền Trương Hống - Trương Hát (mở thẻ Chiếu lụa cổ)
    const templeProxy = new THREE.Mesh(
      prepGeo(new THREE.BoxGeometry(8.2, 5.2, 6.8)),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false })
    );
    templeProxy.name = 'NQSH_Realm_TempleProxy';
    templeProxy.position.set(0, 2.8, 0.2);
    templeProxy.userData = {
      isClickProxy: true,
      ignoreRaycaster: false,
      preventMerge: true,
      loreKey: 'nqsh_denTruongHong',
      realm: 'nam_quoc_son_ha'
    };
    templeGroup.add(templeProxy);
    mergeGroupMeshesByMaterial(templeGroup);

    // 8. ĐOÀN 5 CHIẾN THUYỀN ĐẠI VIỆT TRÊN MẶT SÔNG NHƯ NGUYỆT
    const warBoats = [];
    const fleetPositions = [
      [-16.0, -15.0, 0.18],
      [-5.5, -10.5, -0.10],
      [4.5, -13.0, 0.08],
      [15.0, -9.5, -0.15],
      [24.0, -17.5, 0.22]
    ];
    fleetPositions.forEach(([bx, bz, rotY], idx) => {
      const { boat, flame } = buildDaiVietWarBoat(woodMat, goldMat, crimsonMat, bannerMat, flameMat);
      boat.position.set(bx, 0.08, bz);
      boat.rotation.y = rotY;
      root.add(boat);
      warBoats.push({ boat, flame, phase: idx * 1.4, baseY: 0.08 });
    });

    const boatLight = new THREE.PointLight(0xff8c2b, 16.0, 32.0, 1.35);
    boatLight.position.set(4.5, 2.8, -11.5);
    root.add(boatLight);

    // Click Proxy bao cụm chiến thuyền trung tâm
    const fleetProxy = new THREE.Mesh(
      prepGeo(new THREE.BoxGeometry(10.0, 5.5, 9.5)),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false })
    );
    fleetProxy.name = 'NQSH_Realm_FleetProxy';
    fleetProxy.position.set(4.5, 2.6, -12.8);
    fleetProxy.userData = {
      isClickProxy: true,
      ignoreRaycaster: false,
      loreKey: 'nqsh_chienThuyen',
      realm: 'nam_quoc_son_ha'
    };
    root.add(fleetProxy);

    // 9. INSTANCEDMESH: CỌC GỖ PHÒNG TUYẾN, BỌT SÓNG, NGỌN GIÁO, CỜ ĐẠI CHỮ "LÝ", ĐUỐC LỬA
    const dummy = new THREE.Object3D();

    // 9.1 Cọc gỗ phòng tuyến sông Như Nguyệt (64 cọc cắm dọc mép sông)
    const stakeGeo = prepGeo(new THREE.CylinderGeometry(0.08, 0.14, 2.8, 7));
    const stakeCount = 64;
    const instStakes = new THREE.InstancedMesh(stakeGeo, woodMat, stakeCount);
    instStakes.userData.ignoreRaycaster = true;
    for (let i = 0; i < stakeCount; i++) {
      const row = i % 2;
      const sx = -29.0 + Math.floor(i / 2) * 1.88 + row * 0.9;
      const sz = 2.6 + row * 2.1 + (rng() - 0.5) * 0.6;
      dummy.position.set(sx, 0.72, sz);
      dummy.rotation.set(-0.48 + (rng() - 0.5) * 0.1, rng() * Math.PI, (rng() - 0.5) * 0.12);
      dummy.scale.set(1, 0.85 + rng() * 0.35, 1);
      dummy.updateMatrix();
      instStakes.setMatrixAt(i, dummy.matrix);
    }
    instStakes.instanceMatrix.needsUpdate = true;
    root.add(instStakes);

    // 9.2 Bọt sóng InstancedMesh quanh chân cọc gỗ & mũi chiến thuyền
    const foamGeo = prepGeo(new THREE.RingGeometry(0.32, 0.72, 12));
    foamGeo.rotateX(-Math.PI / 2);
    const foamMat = new THREE.MeshBasicMaterial({
      color: 0xcbe7ff,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const foamPositions = [];
    for (let i = 0; i < 36; i++) {
      foamPositions.push({
        x: -27.0 + i * 1.55,
        z: 1.8 + (i % 3) * 1.1,
        baseScale: 0.65 + (i % 4) * 0.22,
        phase: i * 0.7
      });
    }
    fleetPositions.forEach(([bx, bz], idx) => {
      foamPositions.push({ x: bx, z: bz - 3.6, baseScale: 1.85, phase: idx * 1.2 });
      foamPositions.push({ x: bx, z: bz + 3.2, baseScale: 1.45, phase: idx * 1.2 + 1.5 });
    });
    const instFoam = new THREE.InstancedMesh(foamGeo, foamMat, foamPositions.length);
    instFoam.userData.ignoreRaycaster = true;
    foamPositions.forEach((fp, i) => {
      dummy.position.set(fp.x, 0.14, fp.z);
      dummy.rotation.set(0, fp.phase, 0);
      dummy.scale.setScalar(fp.baseScale);
      dummy.updateMatrix();
      instFoam.setMatrixAt(i, dummy.matrix);
    });
    instFoam.instanceMatrix.needsUpdate = true;
    root.add(instFoam);

    // 9.3 Hàng rào phòng tuyến + Ngọn giáo (InstancedMesh)
    const palisadeGeo = prepGeo(new THREE.BoxGeometry(2.6, 1.35, 0.24));
    const palisadeCount = 16;
    const instPalisade = new THREE.InstancedMesh(palisadeGeo, woodMat, palisadeCount);
    instPalisade.userData.ignoreRaycaster = true;
    let pIdx = 0;
    for (let i = 0; i < palisadeCount; i++) {
      const px = i < 8 ? -24.0 + i * 2.5 : 5.5 + (i - 8) * 2.5;
      dummy.position.set(px, 0.95, 8.6);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      instPalisade.setMatrixAt(pIdx++, dummy.matrix);
    }
    instPalisade.instanceMatrix.needsUpdate = true;
    root.add(instPalisade);

    // Ngọn giáo dựng dọc phòng tuyến (32 cây giáo cán gỗ mũi thép)
    const spearCount = 32;
    const spearShaftGeo = prepGeo(new THREE.CylinderGeometry(0.032, 0.038, 3.1, 6));
    const spearTipGeo = prepGeo(new THREE.ConeGeometry(0.075, 0.42, 6));
    const instSpearShafts = new THREE.InstancedMesh(spearShaftGeo, woodMat, spearCount);
    const instSpearTips = new THREE.InstancedMesh(spearTipGeo, steelMat, spearCount);
    instSpearShafts.userData.ignoreRaycaster = true;
    instSpearTips.userData.ignoreRaycaster = true;

    for (let i = 0; i < spearCount; i++) {
      const sideX = i < 16 ? -23.0 + i * 1.15 : 5.8 + (i - 16) * 1.15;
      const sz = 9.2 + (i % 2) * 0.4;
      dummy.position.set(sideX, 2.1, sz);
      dummy.rotation.set(-0.18, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      instSpearShafts.setMatrixAt(i, dummy.matrix);

      dummy.position.set(sideX, 3.68, sz - 0.28);
      dummy.updateMatrix();
      instSpearTips.setMatrixAt(i, dummy.matrix);
    }
    instSpearShafts.instanceMatrix.needsUpdate = true;
    instSpearTips.instanceMatrix.needsUpdate = true;
    root.add(instSpearShafts, instSpearTips);

    // 9.4 Cờ đại chữ "Lý" (InstancedMesh) & Đuốc lửa dọc bến bờ (InstancedMesh)
    const flagSpecs = [
      [-21.0, 10.5], [-10.0, 10.2], [4.5, 10.2], [13.5, 10.5], [22.0, 10.8],
      [-7.0, 21.0], [10.0, 21.0]
    ];
    const poleGeo = prepGeo(new THREE.CylinderGeometry(0.06, 0.08, 6.0, 8));
    const flagPlaneGeo = prepGeo(new THREE.PlaneGeometry(1.7, 3.2, 6, 1));
    const instPoles = new THREE.InstancedMesh(poleGeo, goldMat, flagSpecs.length);
    const instFlags = new THREE.InstancedMesh(flagPlaneGeo, bannerMat, flagSpecs.length);
    instPoles.userData.ignoreRaycaster = true;
    instFlags.userData.ignoreRaycaster = true;

    flagSpecs.forEach(([fx, fz], idx) => {
      const fy = getRiverbankFloorHeightAt(fx, fz);
      dummy.position.set(fx, fy + 3.0, fz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      instPoles.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(fx + 0.88, fy + 4.2, fz);
      dummy.rotation.set(0, 0.15, 0);
      dummy.updateMatrix();
      instFlags.setMatrixAt(idx, dummy.matrix);
    });
    instPoles.instanceMatrix.needsUpdate = true;
    instFlags.instanceMatrix.needsUpdate = true;
    root.add(instPoles, instFlags);

    // Đuốc lửa dọc phòng tuyến & bến sông (12 cây đuốc)
    const torchCoords = [
      [-18.0, 10.5], [-8.0, 10.5], [-3.8, 12.0], [3.8, 12.0], [9.5, 10.5], [19.0, 10.5],
      [-3.8, 18.0], [3.8, 18.0], [-9.2, 16.5], [-17.5, 16.5], [3.5, 22.8], [8.2, 22.8]
    ];
    const torchPoleGeo = prepGeo(new THREE.CylinderGeometry(0.055, 0.08, 2.35, 7));
    const torchFlameGeo = prepGeo(new THREE.ConeGeometry(0.22, 0.52, 7));
    const instTorches = new THREE.InstancedMesh(torchPoleGeo, woodMat, torchCoords.length);
    const instTorchFlames = new THREE.InstancedMesh(torchFlameGeo, flameMat, torchCoords.length);
    instTorches.userData.ignoreRaycaster = true;
    instTorchFlames.userData.ignoreRaycaster = true;

    torchCoords.forEach(([tx, tz], i) => {
      const ty = getRiverbankFloorHeightAt(tx, tz);
      dummy.position.set(tx, ty + 1.15, tz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      instTorches.setMatrixAt(i, dummy.matrix);

      dummy.position.set(tx, ty + 2.45, tz);
      dummy.updateMatrix();
      instTorchFlames.setMatrixAt(i, dummy.matrix);
    });
    instTorches.instanceMatrix.needsUpdate = true;
    instTorchFlames.instanceMatrix.needsUpdate = true;
    root.add(instTorches, instTorchFlames);

    const pierTorchLight = new THREE.PointLight(0xff8c2b, 14.0, 26.0, 1.4);
    pierTorchLight.position.set(0, 3.8, 13.5);
    root.add(pierTorchLight);

    // 10. BỆ TRỐNG TRẬN PHÁT SÁNG Ở ĐẦU BẾN LÀM CỔNG EXITREALM (X = 5.8, Z = 22.8)
    const drumExitStation = new THREE.Group();
    drumExitStation.name = 'Be_Trong_Tran_Exit';
    drumExitStation.position.set(5.8, getRiverbankFloorHeightAt(5.8, 22.8), 22.8);
    root.add(drumExitStation);

    // Bệ đá chạm hoa sen 2 tầng
    const drumBase1 = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(1.55, 1.75, 0.36, 8)), stoneMat);
    drumBase1.position.y = 0.18;
    drumExitStation.add(drumBase1);
    const drumBase2 = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(1.15, 1.32, 0.55, 8)), crimsonMat);
    drumBase2.position.y = 0.62;
    drumExitStation.add(drumBase2);

    // Vành 12 cánh sen vàng ôm quanh bệ trống (InstancedMesh)
    const lotusPetalGeo = prepGeo(new THREE.ConeGeometry(0.22, 0.42, 5));
    lotusPetalGeo.scale(1.0, 1.0, 0.35);
    const drumPetals = new THREE.InstancedMesh(lotusPetalGeo, goldMat, 12);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * 1.15, 0.85, Math.sin(a) * 1.15);
      dummy.rotation.set(0, -a + Math.PI / 2, -0.45);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      drumPetals.setMatrixAt(i, dummy.matrix);
    }
    drumPetals.instanceMatrix.needsUpdate = true;
    drumExitStation.add(drumPetals);

    // Chiếc Trống Trận Triều Lý phát sáng trên bệ
    const drumBody = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.62, 0.54, 0.82, 18)), crimsonMat);
    drumBody.position.y = 1.48;
    drumExitStation.add(drumBody);
    const drumHeadMat = new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      emissive: 0xd4af37,
      emissiveIntensity: 0.75,
      roughness: 0.35,
      metalness: 0.5
    });
    const drumHead = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.64, 0.64, 0.06, 18)), drumHeadMat);
    drumHead.position.y = 1.90;
    drumExitStation.add(drumHead);

    const exitAuraRing = new THREE.Mesh(
      prepGeo(new THREE.RingGeometry(1.75, 2.05, 32).rotateX(-Math.PI / 2)),
      new THREE.MeshBasicMaterial({
        color: 0xd4af37,
        transparent: true,
        opacity: 0.72,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    exitAuraRing.position.y = 0.04;
    exitAuraRing.userData.ignoreRaycaster = true;
    drumExitStation.add(exitAuraRing);

    const drumExitLight = new THREE.PointLight(0xd4af37, 12.0, 16.0, 1.4);
    drumExitLight.position.set(0, 2.7, 0);
    drumExitStation.add(drumExitLight);

    const exitBannerTex = createSignPlaqueTex(
      'TRỐNG TRẬN HỒI QUY',
      'Click vào Bệ Trống Trận hoặc nhấn [ESC] để về Bảo Tàng',
      { bg: '#1e0b0b', border: '#d4af37', titleCol: '#fde68a', subCol: '#fef08a', w: 720, h: 165 },
      _realmDisposables
    );
    const exitBanner = new THREE.Mesh(
      prepGeo(new THREE.PlaneGeometry(2.6, 0.62)),
      new THREE.MeshBasicMaterial({ map: exitBannerTex, transparent: true, side: THREE.DoubleSide })
    );
    exitBanner.position.set(0, 2.95, 0);
    exitBanner.userData.ignoreRaycaster = true;
    drumExitStation.add(exitBanner);

    const drumExitProxy = new THREE.Mesh(
      prepGeo(new THREE.BoxGeometry(2.6, 2.6, 2.6)),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false })
    );
    drumExitProxy.name = 'NQSH_Realm_ExitDrumProxy';
    drumExitProxy.position.set(0, 1.35, 0);
    drumExitProxy.userData = {
      isClickProxy: true,
      isReturnPortal: true,
      ignoreRaycaster: false,
      realm: 'nam_quoc_son_ha'
    };
    drumExitStation.add(drumExitProxy);

    // 11. HIỆU ỨNG HẠT THREE.POINTS: TÀN LỬA CHIẾN TRẬN BAY LÊN & SƯƠNG MÙ LÀ LÀ TRÊN SÔNG
    const emberCount = 180;
    const emberPos = new Float32Array(emberCount * 3);
    const emberPhases = new Float32Array(emberCount);
    for (let i = 0; i < emberCount; i++) {
      emberPos[i * 3] = (rng() - 0.5) * 44.0;
      emberPos[i * 3 + 1] = 0.6 + rng() * 8.5;
      emberPos[i * 3 + 2] = -22.0 + rng() * 44.0;
      emberPhases[i] = rng() * Math.PI * 2;
    }
    const emberGeo = prepGeo(new THREE.BufferGeometry());
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
    const emberMat = new THREE.PointsMaterial({
      color: 0xff8a2b,
      size: 0.22,
      map: tex.particleTex,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const emberPoints = new THREE.Points(emberGeo, emberMat);
    emberPoints.userData.ignoreRaycaster = true;
    root.add(emberPoints);

    const mistCount = 160;
    const mistPos = new Float32Array(mistCount * 3);
    const mistPhases = new Float32Array(mistCount);
    for (let i = 0; i < mistCount; i++) {
      mistPos[i * 3] = (rng() - 0.5) * 84.0;
      mistPos[i * 3 + 1] = 0.35 + rng() * 1.45;
      mistPos[i * 3 + 2] = -36.0 + rng() * 42.0;
      mistPhases[i] = rng() * Math.PI * 2;
    }
    const mistGeo = prepGeo(new THREE.BufferGeometry());
    mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
    const mistMat = new THREE.PointsMaterial({
      color: 0xbdd8ff,
      size: 3.4,
      map: tex.mistTex,
      transparent: true,
      opacity: 0.24,
      depthWrite: false
    });
    const mistPoints = new THREE.Points(mistGeo, mistMat);
    mistPoints.userData.ignoreRaycaster = true;
    root.add(mistPoints);

    // 12. ĐĂNG KÝ HITBOX, COLLIDERS, LORE & POSITIONAL AUDIO TRONG CÕI SÔNG NHƯ NGUYỆT
    root.updateMatrixWorld(true);

    const realmDebugGroup = new THREE.Group();
    realmDebugGroup.name = 'NamQuocSonHa_Realm_DebugHitboxes';
    realmDebugGroup.visible = Boolean(_hitboxManager?.debugHelpers?.visible);
    root.add(realmDebugGroup);
    _realmDebugGroup = realmDebugGroup;

    const interactiveProxies = [templeProxy, fleetProxy, drumExitProxy];
    const realmColliders = [];
    const addCollider = (center, size, name, color = 0x22c55e) => {
      const box = new THREE.Box3().setFromCenterAndSize(center, size);
      realmColliders.push({ box, name });
      realmDebugGroup.add(new THREE.Box3Helper(box, color));
    };

    // Chắn không cho đi xuống lòng sông sâu, bao quanh đền và bệ trống trận
    addCollider(new THREE.Vector3(-13.5, 3.2, 15.0), new THREE.Vector3(8.2, 4.8, 6.8), 'DenTruongHong', 0x22c55e);
    addCollider(new THREE.Vector3(5.8, 2.2, 22.8), new THREE.Vector3(2.8, 2.6, 2.8), 'BeTrongTranExit', 0x22c55e);
    addCollider(new THREE.Vector3(0, 2.0, 5.2), new THREE.Vector3(96.0, 4.0, 2.0), 'BienBoSong', 0x38bdf8);
    addCollider(new THREE.Vector3(0, 2.0, 38.0), new THREE.Vector3(96.0, 4.0, 2.0), 'BienSauLung', 0x38bdf8);
    addCollider(new THREE.Vector3(-34.0, 2.0, 22.0), new THREE.Vector3(2.0, 4.0, 36.0), 'BienTrai', 0x38bdf8);
    addCollider(new THREE.Vector3(34.0, 2.0, 22.0), new THREE.Vector3(2.0, 4.0, 36.0), 'BienPhai', 0x38bdf8);

    if (_hitboxManager) {
      _hitboxManager.clearRealmHitboxes?.('nam_quoc_son_ha');
      _hitboxManager.registerRealmHitboxes('nam_quoc_son_ha', realmColliders);
    }

    interactiveProxies.forEach((px) => {
      px.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(px);
      realmDebugGroup.add(new THREE.Box3Helper(b, px.userData.isReturnPortal ? 0x38bdf8 : 0xfde047));
      if (px.userData.loreKey && _loreGuide?.registerArtifact) {
        _loreGuide.registerArtifact(px, px.userData.loreKey);
      }
    });

    // Âm thanh không gian 3D (THREE.PositionalAudio)
    if (_spatialAudio?.attachPositionalSound) {
      _spatialAudio.attachPositionalSound('nqsh_temple_poem', templeGroup, {
        fallbackTheme: 'nqsh_temple_poem',
        refDistance: 9,
        maxDistance: 46,
        volume: 0.56
      });
      _spatialAudio.attachPositionalSound('nqsh_war_drum', drumExitStation, {
        fallbackTheme: 'nqsh_war_drum',
        refDistance: 7,
        maxDistance: 38,
        volume: 0.45
      });
      _spatialAudio.attachPositionalSound('nqsh_river_waves', riverAudioAnchor, {
        fallbackTheme: 'nqsh_river_waves',
        refDistance: 10,
        maxDistance: 55,
        volume: 0.42
      });
    }

    // Đồng bộ WebXR Teleport xuống bờ sông Như Nguyệt
    _immersionSystem?.xrTeleport?.setTargetContext?.(realmScene, _realmWalkables);

    _realmState = {
      skyMat,
      riverGeo,
      riverMat,
      warBoats,
      instFoam,
      foamPositions,
      instFlags,
      flagSpecs,
      instTorchFlames,
      torchCoords,
      templeLight,
      boatLight,
      pierTorchLight,
      drumExitLight,
      exitBanner,
      exitAuraRing,
      emberGeo,
      emberPhases,
      mistGeo,
      mistPhases,
      interactiveProxies
    };
  }

  function disposeNhuNguyetRealm() {
    stopPoemRecitation();
    _spatialAudio?.stopAllSounds?.();
    if (_spatialAudio?.detachPositionalSound) {
      _spatialAudio.detachPositionalSound('nqsh_temple_poem');
      _spatialAudio.detachPositionalSound('nqsh_war_drum');
      _spatialAudio.detachPositionalSound('nqsh_river_waves');
    }

    if (_realmState?.interactiveProxies && _loreGuide?.interactiveArtifacts) {
      _realmState.interactiveProxies.forEach((px) => {
        const idx = _loreGuide.interactiveArtifacts.indexOf(px);
        if (idx !== -1) _loreGuide.interactiveArtifacts.splice(idx, 1);
      });
    }

    if (_hitboxManager?.clearRealmHitboxes) {
      _hitboxManager.clearRealmHitboxes('nam_quoc_son_ha');
    }

    if (_realmRoot) {
      const matSet = new Set();
      _realmRoot.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const ms = Array.isArray(obj.material) ? obj.material : [obj.material];
          ms.forEach((m) => matSet.add(m));
        }
      });
      matSet.forEach((m) => m.dispose());
      _realmRoot.parent?.remove(_realmRoot);
      _realmRoot = null;
    }

    _realmDisposables.forEach((t) => t?.dispose?.());
    _realmDisposables = [];
    _realmWalkables = [];
    _realmDebugGroup = null;
    _realmState = null;
  }

  // =========================================================================
  // PHẦN 4: CAMERA-DIRECTOR DOLLY-ZOOM CUTSCENE VÀO/RA CÕI SÔNG NHƯ NGUYỆT
  // =========================================================================
  function runDollyZoomTransition({ targetPos, lookAtPos, durationMs = 1150, onSwap, onFinish }) {
    const cam = _camera || (typeof window !== 'undefined' ? window.__camera : null);
    const vignette = getOrCreateVignetteOverlay();
    if (!cam) {
      onSwap?.();
      onFinish?.();
      return;
    }

    const startPos = cam.position.clone();
    const startQuat = cam.quaternion.clone();
    const baseFov = cam.fov || 65;

    const tmp = cam.clone();
    tmp.position.copy(targetPos);
    tmp.lookAt(lookAtPos);
    const endQuat = tmp.quaternion.clone();

    const startTime = performance.now();
    let swapped = false;

    const step = (now) => {
      const raw = Math.min(1, (now - startTime) / durationMs);
      const e = easeInOutCubic(raw);

      if (!swapped) {
        const p = Math.min(1, e / 0.55);
        cam.position.lerpVectors(startPos, targetPos, easeInOutCubic(p));
        cam.quaternion.slerpQuaternions(startQuat, endQuat, easeInOutCubic(p));
        cam.fov = baseFov - Math.sin(p * Math.PI * 0.5) * 18.0;
        cam.updateProjectionMatrix();
        if (vignette) vignette.style.opacity = String(Math.min(1, p * 1.15));

        if (raw >= 0.55) {
          swapped = true;
          onSwap?.();
        }
      } else {
        const p = Math.min(1, (raw - 0.55) / 0.45);
        cam.fov = (baseFov + 12.0) - easeInOutCubic(p) * 12.0;
        cam.updateProjectionMatrix();
        if (vignette) vignette.style.opacity = String(Math.max(0, 1 - p * 1.15));
      }

      if (raw < 1) {
        requestAnimationFrame(step);
      } else {
        cam.fov = baseFov;
        cam.updateProjectionMatrix();
        if (vignette) vignette.style.opacity = '0';
        onFinish?.();
      }
    };

    requestAnimationFrame(step);
  }

  function enterRealm(realmName = 'namquocsonha', { continueTourAfterEntry = false } = {}) {
    if (typeof realmName === 'object' && realmName !== null) {
      continueTourAfterEntry = Boolean(realmName.continueTourAfterEntry);
      realmName = realmName.realm || 'namquocsonha';
    }
    if (_isInsideRealm || _isTransitioning) return;
    _isTransitioning = true;
    _loreGuide?.hideLoreCard?.();

    const cam = _camera || window.__camera;
    const ctrl = _cameraManager?.controls || window.__controls;
    const camCtrl = _cameraManager?.cameraController || window.__cameraController;

    if (document.exitPointerLock) {
      try { document.exitPointerLock(); } catch (_) {}
    }
    if (ctrl) ctrl.enabled = false;
    if (camCtrl) camCtrl.isEnabled = false;

    roomGroup?.updateMatrixWorld?.(true);
    interiorGroup?.updateMatrixWorld?.(true);
    const portalFocusWorld = interiorGroup.localToWorld(new THREE.Vector3(0, 2.2, portalPositionLocal.z));
    const dollyStandWorld = interiorGroup.localToWorld(new THREE.Vector3(0, 2.0, portalPositionLocal.z + 1.65));

    runDollyZoomTransition({
      targetPos: dollyStandWorld,
      lookAtPos: portalFocusWorld,
      durationMs: 1150,
      onSwap: () => {
        _isInsideRealm = true;
        if (typeof window !== 'undefined') window.__nqshRealmActive = true;
        if (roomGroup) roomGroup.visible = false;

        mountNhuNguyetRealm();

        if (typeof window !== 'undefined' && window.__app?.setActiveScene && realmScene) {
          window.__app.setActiveScene(realmScene);
        }

        if (camCtrl) {
          camCtrl.setFloorHeightProvider?.(getRiverbankFloorHeightAt);
          camCtrl.floorHeightProvider = getRiverbankFloorHeightAt;
          camCtrl.velocity?.set?.(0, 0, 0);
        }
        if (cam) {
          cam.position.copy(realmSpawnPos);
          cam.lookAt(realmSpawnLookAt);
        }
        if (ctrl) {
          ctrl.target.copy(realmSpawnLookAt);
          ctrl.update();
        }
        const hud = getOrCreateRealmHUD();
        if (hud) hud.style.display = 'flex';
        speakPoemRecitation();
      },
      onFinish: () => {
        _isTransitioning = false;
        if (!continueTourAfterEntry) {
          if (ctrl) ctrl.enabled = true;
          if (camCtrl) camCtrl.isEnabled = true;
        } else {
          beginRealmTourStop(0);
        }
      }
    });
  }

  function exitRealm({ immediate = false, moveCameraBack = true } = {}) {
    if (!_isInsideRealm || _isTransitioning) return;
    _isTransitioning = true;
    stopAutoTour();
    _loreGuide?.hideLoreCard?.();

    const cam = _camera || window.__camera;
    const ctrl = _cameraManager?.controls || window.__controls;
    const camCtrl = _cameraManager?.cameraController || window.__cameraController;
    const vignette = getOrCreateVignetteOverlay();

    if (document.exitPointerLock) {
      try { document.exitPointerLock(); } catch (_) {}
    }

    const hud = getOrCreateRealmHUD();
    if (hud) hud.style.display = 'none';

    const performExitSwap = () => {
      _isInsideRealm = false;
      _reentryCooldown = 4.0;
      if (typeof window !== 'undefined') window.__nqshRealmActive = false;

      disposeNhuNguyetRealm();

      if (typeof window !== 'undefined' && window.__app?.setActiveScene && window.__app.mainScene) {
        window.__app.setActiveScene(window.__app.mainScene);
      }
      if (roomGroup) {
        roomGroup.visible = true;
        roomGroup.updateMatrixWorld(true);
      }

      if (camCtrl) {
        camCtrl.setFloorHeightProvider?.(null);
        camCtrl.floorHeightProvider = null;
        camCtrl.velocity?.set?.(0, 0, 0);
      }

      if (window.__app?.atriumGroup) {
        _immersionSystem?.xrTeleport?.setTargetContext?.(mainScene, [window.__app.atriumGroup, roomGroup].filter(Boolean));
      }

      if (moveCameraBack) {
        const retPose = getMuseumReturnPose();
        if (cam) {
          cam.position.copy(retPose.camPos);
          cam.lookAt(retPose.lookAt);
        }
        if (ctrl) {
          ctrl.target.copy(retPose.lookAt);
          ctrl.update();
        }
      }
    };

    if (immediate) {
      performExitSwap();
      if (vignette) vignette.style.opacity = '0';
      _isTransitioning = false;
      if (ctrl) ctrl.enabled = true;
      if (camCtrl) camCtrl.isEnabled = true;
      return;
    }

    if (ctrl) ctrl.enabled = false;
    if (camCtrl) camCtrl.isEnabled = false;

    const startTime = performance.now();
    let swapped = false;

    const step = (now) => {
      const raw = Math.min(1, (now - startTime) / 850);
      if (!swapped) {
        if (vignette) vignette.style.opacity = String(Math.min(1, raw * 2.1));
        if (raw >= 0.48) {
          swapped = true;
          performExitSwap();
        }
      } else {
        const p = (raw - 0.48) / 0.52;
        if (vignette) vignette.style.opacity = String(Math.max(0, 1 - p));
      }

      if (raw < 1) {
        requestAnimationFrame(step);
      } else {
        if (vignette) vignette.style.opacity = '0';
        _isTransitioning = false;
        if (ctrl) ctrl.enabled = true;
        if (camCtrl) camCtrl.isEnabled = true;
      }
    };
    requestAnimationFrame(step);
  }

  // =========================================================================
  // PHẦN 5: EDUCATIONAL AUTO-TOUR (4 ĐIỂM TRONG PHÒNG -> XUYÊN CỔNG -> SÔNG NHƯ NGUYỆT)
  // =========================================================================
  const ROOM_TOUR_STOPS = [
    {
      title: 'Điểm 1/4 (Phòng): Tượng Thái Úy Lý Thường Kiệt trên Bệ Hoa Sen',
      localPos: [0.0, 2.6, 5.2],
      localLook: [0.0, 2.7, -1.2],
      loreKey: 'nqsh_lyThuongKiet',
      dwellMs: 6500
    },
    {
      title: 'Điểm 2/4 (Cánh Trái): Chiếu Thư “Nam Quốc Sơn Hà” trên Giá Rồng',
      localPos: [-2.2, 2.4, 4.6],
      localLook: [-6.2, 1.5, 1.2],
      loreKey: 'nqsh_chieuThu',
      dwellMs: 7000
    },
    {
      title: 'Điểm 3/4 (Cánh Phải): Sa Bàn Phòng Tuyến & Binh Khí Nhà Lý',
      localPos: [2.0, 2.5, 4.4],
      localLook: [6.2, 1.4, 0.8],
      loreKey: 'nqsh_saBan',
      dwellMs: 7000
    },
    {
      title: 'Điểm 4/4 (Cuối Phòng): Cổng Dịch Chuyển Đền Trương Hống – Trương Hát',
      localPos: [0.0, 2.4, -5.6],
      localLook: [0.0, 2.4, -10.15],
      loreKey: null,
      dwellMs: 6000
    }
  ];

  const REALM_TOUR_STOPS = [
    {
      title: 'Sông Như Nguyệt 1/3: Đền Thờ Trương Hống – Trương Hát Phát Sáng',
      camPos: new THREE.Vector3(-4.2, 3.2, 21.8),
      lookAt: new THREE.Vector3(-13.5, 3.2, 15.0),
      loreKey: 'nqsh_denTruongHong',
      dwellMs: 7500
    },
    {
      title: 'Sông Như Nguyệt 2/3: Phòng Tuyến Cọc Gỗ & Đoàn Chiến Thuyền Đại Việt',
      camPos: new THREE.Vector3(0.0, 4.2, 12.2),
      lookAt: new THREE.Vector3(3.5, 1.5, -13.0),
      loreKey: 'nqsh_chienThuyen',
      dwellMs: 7500
    },
    {
      title: 'Sông Như Nguyệt 3/3: Bệ Trống Trận Hào Khí & Toàn Cảnh Đêm Trăng',
      camPos: new THREE.Vector3(0.5, 3.3, 27.5),
      lookAt: new THREE.Vector3(5.8, 2.0, 22.8),
      loreKey: 'nqsh_vuKhi',
      dwellMs: 6500
    }
  ];

  function lockPlayerControls(locked) {
    const ctrl = _cameraManager?.controls || window.__controls;
    const camCtrl = _cameraManager?.cameraController || window.__cameraController;
    if (ctrl) ctrl.enabled = !locked;
    if (camCtrl) camCtrl.isEnabled = !locked;
  }

  function updateRoomTourBanner(text) {
    let el = document.getElementById('nqsh-room-tour-banner');
    if (!text) {
      if (el) el.style.display = 'none';
      return;
    }
    if (!el && typeof document !== 'undefined') {
      el = document.createElement('div');
      el.id = 'nqsh-room-tour-banner';
      el.style.cssText = `
        position: fixed; top: 18px; left: 50%; transform: translateX(-50%);
        z-index: 99985; padding: 9px 20px; border-radius: 999px;
        background: linear-gradient(135deg, rgba(11,21,40,0.94), rgba(139,30,30,0.88));
        border: 1.5px solid #d4af37; color: #fde68a;
        font-family: "Segoe UI", sans-serif; font-size: 13px; font-weight: 700;
        box-shadow: 0 8px 26px rgba(0,0,0,0.7); display: flex; align-items: center; gap: 12px;
      `;
      document.body.appendChild(el);
    }
    if (el) {
      el.style.display = 'flex';
      el.innerHTML = `<span>🧭 ${text}</span><button id="nqsh-room-tour-stop" style="background:#d4af37;color:#0b1528;border:none;border-radius:999px;padding:4px 12px;font-weight:700;cursor:pointer;">Dừng [ESC]</button>`;
      document.getElementById('nqsh-room-tour-stop')?.addEventListener('click', (e) => {
        e.stopPropagation();
        stopAutoTour();
      });
    }
  }

  function beginRoomTourStop(idx) {
    const cam = _camera || window.__camera;
    if (!cam || !interiorGroup) return;
    _tourIdx = idx;
    const stop = ROOM_TOUR_STOPS[idx];
    _tourPhase = 'room_flying';
    _tourPhaseStart = performance.now();

    interiorGroup.updateMatrixWorld(true);
    const targetPos = interiorGroup.localToWorld(new THREE.Vector3(...stop.localPos));
    const lookWorld = interiorGroup.localToWorld(new THREE.Vector3(...stop.localLook));
    stop._worldPos = targetPos;
    stop._worldLook = lookWorld;

    _tourFlightStartPos.copy(cam.position);
    _tourFlightStartQuat.copy(cam.quaternion);

    const tmp = cam.clone();
    tmp.position.copy(targetPos);
    tmp.lookAt(lookWorld);
    _tourFlightEndQuat.copy(tmp.quaternion);

    updateRoomTourBanner(stop.title);
  }

  function beginRealmTourStop(idx) {
    const cam = _camera || window.__camera;
    if (!cam) return;
    _tourIdx = idx;
    const stop = REALM_TOUR_STOPS[idx];
    _tourPhase = 'realm_flying';
    _tourPhaseStart = performance.now();

    _tourFlightStartPos.copy(cam.position);
    _tourFlightStartQuat.copy(cam.quaternion);

    const tmp = cam.clone();
    tmp.position.copy(stop.camPos);
    tmp.lookAt(stop.lookAt);
    _tourFlightEndQuat.copy(tmp.quaternion);

    const hudTitle = document.getElementById('nqsh-hud-title');
    if (hudTitle) hudTitle.textContent = `🧭 ${stop.title}`;
  }

  function startFullAutoTour() {
    if (_isInsideRealm) {
      startRealmOnlyTour();
      return;
    }
    _tourActive = true;
    lockPlayerControls(true);
    _loreGuide?.hideLoreCard?.();
    beginRoomTourStop(0);
  }

  function startRealmOnlyTour() {
    if (!_isInsideRealm) {
      enterRealm('namquocsonha', { continueTourAfterEntry: true });
      _tourActive = true;
      return;
    }
    _tourActive = true;
    lockPlayerControls(true);
    const btn = document.getElementById('nqsh-btn-tour');
    if (btn) btn.textContent = '⏹ Dừng Auto-Tour';
    _loreGuide?.hideLoreCard?.();
    beginRealmTourStop(0);
  }

  function stopAutoTour() {
    if (!_tourActive) return;
    _tourActive = false;
    _tourPhase = 'idle';
    lockPlayerControls(false);
    updateRoomTourBanner(null);
    const btn = document.getElementById('nqsh-btn-tour');
    if (btn) btn.textContent = '🧭 Auto-Tour Sông Như Nguyệt';
    const hudTitle = document.getElementById('nqsh-hud-title');
    if (hudTitle) hudTitle.textContent = '⚔️ CHIẾN TUYẾN SÔNG NHƯ NGUYỆT • ĐÊM KHÁNG TỐNG (1077)';
  }

  function updateAutoTour(nowMs) {
    if (!_tourActive) return;
    const cam = _camera || window.__camera;
    if (!cam) return;

    if (_tourPhase === 'room_flying') {
      const stop = ROOM_TOUR_STOPS[_tourIdx];
      const t = Math.min(1, (nowMs - _tourPhaseStart) / 2400);
      const e = easeInOutCubic(t);
      cam.position.lerpVectors(_tourFlightStartPos, stop._worldPos, e);
      cam.quaternion.slerpQuaternions(_tourFlightStartQuat, _tourFlightEndQuat, e);

      if (t >= 1) {
        _tourPhase = 'room_dwelling';
        _tourPhaseStart = nowMs;
        if (stop.loreKey && _loreGuide?.showLoreCard) {
          _loreGuide.showLoreCard(stop.loreKey);
        }
      }
    } else if (_tourPhase === 'room_dwelling') {
      const stop = ROOM_TOUR_STOPS[_tourIdx];
      if (nowMs - _tourPhaseStart >= stop.dwellMs) {
        _loreGuide?.hideLoreCard?.();
        if (_tourIdx + 1 < ROOM_TOUR_STOPS.length) {
          beginRoomTourStop(_tourIdx + 1);
        } else {
          // Bay xuyên qua Cổng Dịch Chuyển ra sông Như Nguyệt
          _tourPhase = 'portal_crossing';
          updateRoomTourBanner(null);
          enterRealm('namquocsonha', { continueTourAfterEntry: true });
        }
      }
    } else if (_tourPhase === 'realm_flying' && _isInsideRealm) {
      const stop = REALM_TOUR_STOPS[_tourIdx];
      const t = Math.min(1, (nowMs - _tourPhaseStart) / 2600);
      const e = easeInOutCubic(t);
      cam.position.lerpVectors(_tourFlightStartPos, stop.camPos, e);
      cam.quaternion.slerpQuaternions(_tourFlightStartQuat, _tourFlightEndQuat, e);

      if (t >= 1) {
        _tourPhase = 'realm_dwelling';
        _tourPhaseStart = nowMs;
        if (stop.loreKey && _loreGuide?.showLoreCard) {
          _loreGuide.showLoreCard(stop.loreKey);
        }
      }
    } else if (_tourPhase === 'realm_dwelling' && _isInsideRealm) {
      const stop = REALM_TOUR_STOPS[_tourIdx];
      if (nowMs - _tourPhaseStart >= stop.dwellMs) {
        _loreGuide?.hideLoreCard?.();
        if (_tourIdx + 1 < REALM_TOUR_STOPS.length) {
          beginRealmTourStop(_tourIdx + 1);
        } else {
          stopAutoTour();
        }
      }
    }
  }

  // =========================================================================
  // PHẦN 6: SỰ KIỆN CLICK / ESC & VÒNG LẶP CẬP NHẬT REALM 60 FPS
  // =========================================================================
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const PORTAL_RAYCAST_MAX_SQ = 42 * 42;

  function onWindowPointerDown(e) {
    if (_isTransitioning || _loreGuide?.isOpen) return;
    if (
      e.target.closest('#nqsh-realm-top-hud') ||
      e.target.closest('#nqsh-room-tour-banner') ||
      e.target.closest('#director-hud') ||
      e.target.closest('#museum-lore-overlay')
    ) {
      return;
    }

    const cam = _camera || window.__camera;
    if (!cam) return;

    const activeScene = typeof window !== 'undefined' ? window.__app?.activeScene : null;
    if (_isInsideRealm) {
      if (realmScene && activeScene && activeScene !== realmScene) return;
      if (!_realmState?.interactiveProxies) return;
    } else {
      if (!roomGroup?.visible) return;
      if (mainScene && activeScene && activeScene !== mainScene) return;
      if (cam.position.distanceToSquared(roomGroup.position) > PORTAL_RAYCAST_MAX_SQ) return;
    }

    const canvas = document.querySelector('canvas');
    const rect = canvas
      ? canvas.getBoundingClientRect()
      : { left: 0, top: 0, width: window.innerWidth || 1, height: window.innerHeight || 1 };

    if (document.pointerLockElement) {
      mouse.set(0, 0);
    } else {
      mouse.x = ((e.clientX - rect.left) / (rect.width || 1)) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / (rect.height || 1)) * 2 + 1;
    }
    raycaster.setFromCamera(mouse, cam);
    raycaster.far = 42;

    if (_isInsideRealm && _realmState?.interactiveProxies) {
      const hits = raycaster.intersectObjects(_realmState.interactiveProxies, false);
      if (hits.length > 0) {
        const obj = hits[0].object;
        if (obj.userData?.isReturnPortal) {
          e.stopPropagation();
          exitRealm();
        } else if (obj.userData?.loreKey && _loreGuide?.showLoreCard) {
          e.stopPropagation();
          _loreGuide.showLoreCard(obj.userData.loreKey);
        }
      }
      return;
    }

    if (roomGroup?.visible) {
      portalClickProxy.updateMatrixWorld(true);
      const hits = raycaster.intersectObject(portalClickProxy, false);
      if (hits.length > 0 && hits[0].distance <= 24) {
        e.stopPropagation();
        enterRealm('namquocsonha');
      }
    }
  }

  function onWindowKeyDown(e) {
    if (_tourActive && e.key === 'Escape') {
      stopAutoTour();
      return;
    }
    if (_tourActive && ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      stopAutoTour();
    }
    if (!_isInsideRealm) return;
    if (e.key === 'Escape') {
      if (_loreGuide?.isOpen) {
        _loreGuide.hideLoreCard();
        return;
      }
      exitRealm();
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', onWindowPointerDown, true);
    window.addEventListener('keydown', onWindowKeyDown);
  }

  function updateMuseumPortal(delta = 0.016, elapsedTime = 0, camera = null) {
    if (camera) _camera = camera;
    if (_reentryCooldown > 0) {
      _reentryCooldown = Math.max(0, _reentryCooldown - delta);
    }
    if (!roomGroup?.visible) return;

    if (!_tourActive && camera?.position && camera.position.distanceToSquared(roomGroup.position) > PORTAL_RAYCAST_MAX_SQ) {
      return;
    }

    portalShaderMat.uniforms.uTime.value = elapsedTime;
    portalPointLight.intensity = 3.2 + Math.sin(elapsedTime * 3.0) * 0.65;

    // Proximity trigger (< 2.5m) khi không đang chạy Auto-Tour
    if (!_isInsideRealm && !_isTransitioning && !_tourActive && _reentryCooldown <= 0 && camera && roomGroup?.visible) {
      const dist = camera.position.distanceTo(museumPortalTriggerWorldPos);
      if (dist < 2.5) {
        enterRealm('namquocsonha');
      }
    }

    if (_tourActive && (_tourPhase === 'room_flying' || _tourPhase === 'room_dwelling')) {
      updateAutoTour(performance.now());
    }
  }

  const _animDummy = new THREE.Object3D();

  function updateRealm(delta = 0.016, elapsedTime = 0, camera = null) {
    if (camera) _camera = camera;
    if (!_isInsideRealm || !_realmState) return;
    const dt = Math.min(delta, 0.05);

    _realmState.skyMat.uniforms.uTime.value = elapsedTime;
    _realmState.riverMat.uniforms.uTime.value = elapsedTime;

    // Đồng bộ Debug Hitbox (Phím H / F2)
    if (_realmDebugGroup && _hitboxManager?.debugHelpers) {
      _realmDebugGroup.visible = _hitboxManager.debugHelpers.visible;
    }

    // 1. Mặt sông Như Nguyệt: sóng vertex chuyển sang GPU ShaderMaterial (uTime)

    // 2. Chiến thuyền dập dềnh theo sóng
    _realmState.warBoats.forEach((wb) => {
      wb.boat.position.y = wb.baseY + Math.sin(elapsedTime * 1.8 + wb.phase) * 0.12;
      wb.boat.rotation.z = Math.sin(elapsedTime * 1.4 + wb.phase) * 0.035;
      wb.boat.rotation.x = Math.cos(elapsedTime * 1.2 + wb.phase) * 0.02;
      wb.flame.scale.set(
        1.0 + Math.sin(elapsedTime * 12 + wb.phase) * 0.12,
        1.0 + Math.cos(elapsedTime * 16 + wb.phase) * 0.22,
        1.0
      );
    });

    // 3. Bọt sóng InstancedMesh dập dềnh & co giãn
    _realmState.foamPositions.forEach((fp, idx) => {
      const pulse = fp.baseScale * (0.85 + Math.sin(elapsedTime * 2.4 + fp.phase) * 0.22);
      _animDummy.position.set(fp.x, 0.14 + Math.sin(elapsedTime * 2.1 + fp.phase) * 0.05, fp.z);
      _animDummy.rotation.set(0, fp.phase + elapsedTime * 0.3, 0);
      _animDummy.scale.setScalar(pulse);
      _animDummy.updateMatrix();
      _realmState.instFoam.setMatrixAt(idx, _animDummy.matrix);
    });
    _realmState.instFoam.instanceMatrix.needsUpdate = true;

    // 4. Cờ đại chữ "Lý" phấp phới & đuốc lửa lập lòe
    _realmState.flagSpecs.forEach(([fx, fz], idx) => {
      const fy = getRiverbankFloorHeightAt(fx, fz);
      const flutter = Math.sin(elapsedTime * 3.1 + idx * 1.1) * 0.18;
      _animDummy.position.set(fx + Math.cos(flutter) * 0.88, fy + 4.2, fz - Math.sin(flutter) * 0.88);
      _animDummy.rotation.set(0, flutter, 0);
      _animDummy.scale.set(1, 1, 1);
      _animDummy.updateMatrix();
      _realmState.instFlags.setMatrixAt(idx, _animDummy.matrix);
    });
    _realmState.instFlags.instanceMatrix.needsUpdate = true;

    _realmState.torchCoords.forEach(([tx, tz], i) => {
      const ty = getRiverbankFloorHeightAt(tx, tz);
      const f = 0.85 + Math.sin(elapsedTime * 13.0 + i * 1.7) * 0.22;
      _animDummy.position.set(tx, ty + 2.45, tz);
      _animDummy.rotation.set(0, elapsedTime * 2.0, 0);
      _animDummy.scale.set(0.95 + (f - 1) * 0.3, f, 0.95 + (f - 1) * 0.3);
      _animDummy.updateMatrix();
      _realmState.instTorchFlames.setMatrixAt(i, _animDummy.matrix);
    });
    _realmState.instTorchFlames.instanceMatrix.needsUpdate = true;

    _realmState.templeLight.intensity = 17.5 + Math.sin(elapsedTime * 4.5) * 1.8;
    _realmState.boatLight.intensity = 15.5 + Math.cos(elapsedTime * 7.5) * 2.4;
    _realmState.pierTorchLight.intensity = 13.5 + Math.sin(elapsedTime * 9.5) * 2.0;
    _realmState.drumExitLight.intensity = 11.5 + Math.sin(elapsedTime * 3.8) * 1.6;
    _realmState.exitBanner.position.y = 2.95 + Math.sin(elapsedTime * 2.2) * 0.06;
    _realmState.exitAuraRing.rotation.z = elapsedTime * 0.5;

    // 5. Hạt tàn lửa chiến trận bay lên & sương mù là là trên mặt sông
    const eArr = _realmState.emberGeo.attributes.position.array;
    const ePh = _realmState.emberPhases;
    for (let i = 0; i < ePh.length; i++) {
      const i3 = i * 3;
      eArr[i3] += Math.sin(elapsedTime * 1.6 + ePh[i]) * dt * 0.7;
      eArr[i3 + 1] += dt * 1.65;
      if (eArr[i3 + 1] > 10.0) eArr[i3 + 1] = 0.6;
    }
    _realmState.emberGeo.attributes.position.needsUpdate = true;

    const mArr = _realmState.mistGeo.attributes.position.array;
    const mPh = _realmState.mistPhases;
    for (let i = 0; i < mPh.length; i++) {
      const i3 = i * 3;
      mArr[i3] += dt * 0.75;
      mArr[i3 + 1] = 0.55 + Math.sin(elapsedTime * 0.8 + mPh[i]) * 0.25;
      if (mArr[i3] > 42.0) mArr[i3] = -42.0;
    }
    _realmState.mistGeo.attributes.position.needsUpdate = true;

    if (_tourActive && (_tourPhase === 'realm_flying' || _tourPhase === 'realm_dwelling')) {
      updateAutoTour(performance.now());
    }
  }

  function setupContext({
    camera = null,
    renderer = null,
    cameraManager: camMgr = null,
    hitboxManager = null,
    loreGuide = null,
    spatialAudio = null,
    portalInteraction = null,
    immersionSystem = null
  } = {}) {
    if (camera) _camera = camera;
    if (renderer) _renderer = renderer;
    if (camMgr) _cameraManager = camMgr;
    if (hitboxManager) _hitboxManager = hitboxManager;
    if (loreGuide) _loreGuide = loreGuide;
    if (spatialAudio) _spatialAudio = spatialAudio;
    if (portalInteraction) _portalInteraction = portalInteraction;
    if (immersionSystem) _immersionSystem = immersionSystem;
    syncMuseumPortalHitboxes();
  }

  function dispose() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointerdown', onWindowPointerDown, true);
      window.removeEventListener('keydown', onWindowKeyDown);
    }
    stopAutoTour();
    disposeNhuNguyetRealm();
    portalShaderMat.dispose();
    portalSignDisposables.forEach((t) => t?.dispose?.());
  }

  return {
    portalGroup,
    portalClickProxy,
    enterRealm,
    exitRealm,
    startFullAutoTour,
    startRealmOnlyTour,
    stopAutoTour,
    isInsideRealm: () => _isInsideRealm,
    updateMuseumPortal,
    updateRealm,
    setupContext,
    syncMuseumPortalHitboxes,
    dispose
  };
}
