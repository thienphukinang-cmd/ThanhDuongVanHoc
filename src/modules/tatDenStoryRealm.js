import * as THREE from 'three';
import { registerInteractiveBook } from './PortalInteraction.js';
import { loadGlbCached, normalizeModelToHeight as sharedNormalizeModelToHeight, sanitizeGeometryBuffers } from '../utils/modelLoaderHelper.js';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger.js';

/**
 * ============================================================================
 * TẮT ĐÈN (NGÔ TẤT TỐ) — CỔNG DỊCH CHUYỂN & NGOẠI CẢNH LÀNG ĐÔNG XÁ ĐÊM SƯU THUẾ
 * - Phân khu 1: Con đường làng Đông Xá lầy lội, lũy tre xơ xác & Bệ đèn dầu hồi quy
 * - Phân khu 2: Mái tranh nghèo Chị Dậu (nha_chi_dau.glb), chõng tre, nồi cháo cám, đèn dầu chập chờn
 * - Phân khu 3: Sân đình Đông Xá & Dinh cơ Nghị Quế (dinh_dong_xa_nghi_que.glb), phù điêu ExtrudeGeometry, lửa đuốc rực đỏ
 * - Phân khu 4: Cánh đồng đêm "Tối như mực", Chị Dậu quật cường & Volumetric God Rays
 * - Hỗ trợ: Dolly-Zoom Cutscene, Educational Auto-Tour, Hitbox Debug [H/F2], Spatial Audio, WebXR Teleport & Dispose
 * ============================================================================
 */

function createSeededRandom(seed = 1939) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Tạo Normal Map chuẩn tuyến tính từ grayscale height canvas (THREE.NoColorSpace) */
function buildNormalMapFromCanvas(heightCanvas, strength = 2.6, repeatX = 1, repeatY = 1, disposables = []) {
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
  tex.colorSpace = THREE.NoColorSpace;
  disposables.push(tex);
  return tex;
}

function makeTex(canvas, { rx = 1, ry = 1, srgb = true, disposables = [] } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rx, ry);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  disposables.push(tex);
  return tex;
}

/** Tạo bộ PBR Textures cho đường đất bùn, vách đất lộ cốt tre, gỗ lim bóng & biển chữ Hán */
function createRealmTextures(disposables) {
  const rng = createSeededRandom(3901);
  const sz = 256;

  // 1. Đường đất bùn lầy tối màu
  const mudC = document.createElement('canvas');
  mudC.width = sz;
  mudC.height = sz;
  const mCtx = mudC.getContext('2d');
  const mudHC = document.createElement('canvas');
  mudHC.width = sz;
  mudHC.height = sz;
  const mhCtx = mudHC.getContext('2d');

  mCtx.fillStyle = '#2c2018';
  mCtx.fillRect(0, 0, sz, sz);
  mhCtx.fillStyle = '#848484';
  mhCtx.fillRect(0, 0, sz, sz);

  for (let i = 0; i < 1400; i++) {
    const x = rng() * sz;
    const y = rng() * sz;
    const r = 1 + rng() * 5;
    mCtx.fillStyle = rng() > 0.5 ? 'rgba(62,45,32,0.36)' : 'rgba(20,14,10,0.4)';
    mCtx.beginPath();
    mCtx.arc(x, y, r, 0, Math.PI * 2);
    mCtx.fill();
    const hv = 95 + Math.floor(rng() * 75);
    mhCtx.fillStyle = `rgb(${hv},${hv},${hv})`;
    mhCtx.fillRect(x, y, r, r);
  }
  // Vết bánh xe trâu cày lầy lội dọc đường
  for (let w = 0; w < 6; w++) {
    const wx = 32 + w * 40 + (rng() - 0.5) * 10;
    mCtx.fillStyle = 'rgba(12,9,7,0.48)';
    mCtx.fillRect(wx, 0, 8, sz);
    mhCtx.fillStyle = '#282828';
    mhCtx.fillRect(wx, 0, 8, sz);
  }

  // 2. Vách đất nứt nẻ lộ cốt tre đan (nhà Chị Dậu)
  const wattleC = document.createElement('canvas');
  wattleC.width = sz;
  wattleC.height = sz;
  const wCtx = wattleC.getContext('2d');
  const wattleHC = document.createElement('canvas');
  wattleHC.width = sz;
  wattleHC.height = sz;
  const whCtx = wattleHC.getContext('2d');

  wCtx.fillStyle = '#423022';
  wCtx.fillRect(0, 0, sz, sz);
  whCtx.fillStyle = '#909090';
  whCtx.fillRect(0, 0, sz, sz);

  // Cốt nan tre ngang dọc ẩn hiện trong mảng vữa bong tróc
  for (let k = 0; k < 5; k++) {
    const px = 20 + rng() * 180;
    const py = 20 + rng() * 180;
    const pw = 36 + rng() * 50;
    const ph = 32 + rng() * 48;
    wCtx.fillStyle = '#221810';
    wCtx.fillRect(px, py, pw, ph);
    for (let g = 0; g < pw; g += 8) {
      wCtx.fillStyle = '#685231';
      wCtx.fillRect(px + g, py, 3, ph);
      whCtx.fillStyle = '#d4d4d4';
      whCtx.fillRect(px + g, py, 3, ph);
    }
    for (let g = 0; g < ph; g += 10) {
      wCtx.fillStyle = '#544023';
      wCtx.fillRect(px, py + g, pw, 2.5);
    }
  }

  // 3. Gỗ lim đen bóng khu vực cường hào
  const limC = document.createElement('canvas');
  limC.width = sz;
  limC.height = sz;
  const lCtx = limC.getContext('2d');
  const limHC = document.createElement('canvas');
  limHC.width = sz;
  limHC.height = sz;
  const lhCtx = limHC.getContext('2d');

  lCtx.fillStyle = '#24130b';
  lCtx.fillRect(0, 0, sz, sz);
  lhCtx.fillStyle = '#808080';
  lhCtx.fillRect(0, 0, sz, sz);
  for (let i = 0; i < 160; i++) {
    const x = rng() * sz;
    lCtx.fillStyle = rng() > 0.5 ? 'rgba(34,20,12,0.45)' : 'rgba(6,3,2,0.5)';
    lCtx.fillRect(x, 0, 2, sz);
    lhCtx.fillStyle = rng() > 0.5 ? '#969696' : '#6b6b6b';
    lhCtx.fillRect(x, 0, 2, sz);
  }

  // 4. Hạt mưa phùn / tàn lửa mềm
  const ptC = document.createElement('canvas');
  ptC.width = 64;
  ptC.height = 64;
  const pCtx = ptC.getContext('2d');
  const grad = pCtx.createRadialGradient(32, 32, 0, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,220,175,0.6)');
  grad.addColorStop(1, 'rgba(255,160,80,0)');
  pCtx.fillStyle = grad;
  pCtx.fillRect(0, 0, 64, 64);

  // 5. God Ray linear vertical fade
  const grC = document.createElement('canvas');
  grC.width = 128;
  grC.height = 256;
  const grCtx = grC.getContext('2d');
  const grGrad = grCtx.createLinearGradient(0, 0, 0, 256);
  grGrad.addColorStop(0.0, 'rgba(255,214,155,0)');
  grGrad.addColorStop(0.18, 'rgba(255,205,135,0.5)');
  grGrad.addColorStop(0.75, 'rgba(255,170,95,0.16)');
  grGrad.addColorStop(1.0, 'rgba(255,150,70,0)');
  grCtx.fillStyle = grGrad;
  grCtx.fillRect(0, 0, 128, 256);

  return {
    mudDiff: makeTex(mudC, { rx: 14, ry: 18, srgb: true, disposables }),
    mudNorm: buildNormalMapFromCanvas(mudHC, 2.2, 14, 18, disposables),
    wattleDiff: makeTex(wattleC, { rx: 2, ry: 1.5, srgb: true, disposables }),
    wattleNorm: buildNormalMapFromCanvas(wattleHC, 2.8, 2, 1.5, disposables),
    limDiff: makeTex(limC, { rx: 2, ry: 3, srgb: true, disposables }),
    limNorm: buildNormalMapFromCanvas(limHC, 1.8, 2, 3, disposables),
    particleTex: makeTex(ptC, { srgb: true, disposables }),
    godRayTex: makeTex(grC, { srgb: true, disposables })
  };
}

/** Tạo biển chữ Hán / Quốc ngữ sơn son thếp vàng lạnh lẽo hoặc bảng gỗ mộc */
function createPlaqueTex(mainText, subText, { bg = '#120705', border = '#c4962c', mainColor = '#f4cb69', subColor = '#d4b375', w = 768, h = 220 } = {}, disposables = []) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = border;
  ctx.lineWidth = 7;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = mainColor;
  ctx.font = 'bold 44px Georgia, "Times New Roman", serif';
  ctx.fillText(mainText, w / 2, subText ? h * 0.42 : h * 0.5);
  if (subText) {
    ctx.fillStyle = subColor;
    ctx.font = 'italic 24px Georgia, "Times New Roman", serif';
    ctx.fillText(subText, w / 2, h * 0.74);
  }
  return makeTex(c, { srgb: true, disposables });
}

/**
 * Phù điêu 3D chạm nổi thực thụ bằng THREE.ExtrudeGeometry (họa tiết Vân Mây & Khung Hổ Phù)
 */
function buildExtrudedCloudAndShieldRelief(goldMat, blackLacquerMat) {
  const group = new THREE.Group();

  // Hình lá chắn bát giác trung tâm tạo bằng Shape + ExtrudeGeometry
  const shieldShape = new THREE.Shape();
  shieldShape.moveTo(-0.55, 0.35);
  shieldShape.lineTo(0.0, 0.52);
  shieldShape.lineTo(0.55, 0.35);
  shieldShape.lineTo(0.45, -0.32);
  shieldShape.lineTo(0.0, -0.52);
  shieldShape.lineTo(-0.45, -0.32);
  shieldShape.closePath();

  const shieldGeo = new THREE.ExtrudeGeometry(shieldShape, {
    depth: 0.09,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.03,
    bevelThickness: 0.03
  });
  const shieldMesh = new THREE.Mesh(shieldGeo, blackLacquerMat);
  group.add(shieldMesh);

  // Họa tiết Vân Mây xoắn chữ S nổi bằng ExtrudeGeometry hai bên cánh
  const cloudShape = new THREE.Shape();
  cloudShape.moveTo(0, 0);
  cloudShape.bezierCurveTo(0.28, 0.24, 0.65, 0.16, 0.62, -0.05);
  cloudShape.bezierCurveTo(0.60, -0.22, 0.35, -0.22, 0.32, -0.08);
  cloudShape.bezierCurveTo(0.30, 0.02, 0.44, 0.05, 0.48, -0.02);
  cloudShape.bezierCurveTo(0.36, -0.08, 0.18, 0.06, 0.0, 0.0);

  const cloudGeo = new THREE.ExtrudeGeometry(cloudShape, {
    depth: 0.07,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.02,
    bevelThickness: 0.02
  });

  [-1, 1].forEach((side) => {
    const cloud = new THREE.Mesh(cloudGeo, goldMat);
    cloud.position.set(side * 0.48, 0.02, 0.05);
    cloud.scale.x = side;
    group.add(cloud);
  });

  // Đỉnh Hổ phù tròn chạm vàng chính giữa
  const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.12, 16), goldMat);
  boss.rotation.x = Math.PI / 2;
  boss.position.set(0, 0.0, 0.09);
  group.add(boss);

  return group;
}

/** Fallback Procedural Meshes đảm bảo không bao giờ trống cảnh nếu Blender GLB lỗi */
function buildProceduralPortalFallback() {
  const g = new THREE.Group();
  const brickMat = new THREE.MeshStandardMaterial({ color: 0x2a1f1c, roughness: 0.9 });
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0x3b2f1c, roughness: 0.85 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xb87e2c, roughness: 0.4, metalness: 0.7 });
  [-1.8, 1.8].forEach((x) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.6, 0.8), brickMat);
    p.position.set(x, 1.8, 0);
    g.add(p);
  });
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.36, 10, 24, Math.PI), brickMat);
  arch.position.set(0, 3.3, 0);
  g.add(arch);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 4.4, 8), bambooMat);
  pole.rotation.z = Math.PI / 2;
  pole.position.set(0, 4.0, 0.35);
  g.add(pole);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.38, 12), goldMat);
  lamp.position.set(0, 3.85, 0);
  g.add(lamp);
  return g;
}

function buildProceduralShackFallback(wattleMat) {
  const g = new THREE.Group();
  const thatch = new THREE.MeshStandardMaterial({ color: 0x3a2e1d, roughness: 0.96, side: THREE.DoubleSide });
  const wood = new THREE.MeshStandardMaterial({ color: 0x2d2214, roughness: 0.88 });
  const walls = new THREE.Mesh(new THREE.BoxGeometry(6.4, 2.2, 4.4), wattleMat);
  walls.position.y = 1.1;
  g.add(walls);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.8, 2.0, 4), thatch);
  roof.rotation.y = Math.PI / 4;
  roof.position.y = 3.1;
  g.add(roof);
  const bed = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.45, 0.95), wood);
  bed.position.set(-1.4, 0.25, 2.6);
  g.add(bed);
  return g;
}

function buildProceduralDinhFallback(limMat) {
  const g = new THREE.Group();
  const tile = new THREE.MeshStandardMaterial({ color: 0x1e1616, roughness: 0.65 });
  const stone = new THREE.MeshStandardMaterial({ color: 0x29292f, roughness: 0.82 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.45, 7.2), stone);
  base.position.y = 0.22;
  g.add(base);
  [-3.4, -1.1, 1.1, 3.4].forEach((x) => {
    [-1.8, 1.8].forEach((z) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 3.8, 12), limMat);
      col.position.set(x, 2.1, z);
      g.add(col);
    });
  });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.6, 6.2), tile);
  roof.position.y = 4.3;
  g.add(roof);
  return g;
}

function buildProceduralChiDauFallback() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.65, 14), new THREE.MeshStandardMaterial({ color: 0x261a14, roughness: 0.85 }));
  body.position.y = 0.82;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), new THREE.MeshStandardMaterial({ color: 0x5c4232, roughness: 0.75 }));
  head.position.set(0, 1.78, 0.14);
  g.add(head);
  return g;
}

/**
 * Xây dựng trọn vẹn hệ thống Cổng Dịch Chuyển (tại Phòng 302) và Thế Giới Ngoại Cảnh Làng Đông Xá
 */
export function createTatDenStoryRealm({
  roomGroup,
  interiorGroup,
  mainScene = null,
  realmScene = null,
  normalizeModelToHeight = null
} = {}) {
  const resolveNormalize = typeof normalizeModelToHeight === 'function' ? normalizeModelToHeight : sharedNormalizeModelToHeight;
  const portalPositionLocal = new THREE.Vector3(0, 0, -10.15);

  let _camera = null;
  let _renderer = null;
  let _cameraManager = null;
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

  // Auto-Tour trong Làng Đông Xá (Educational Tour Guide Director)
  let _tourActive = false;
  let _tourIdx = 0;
  let _tourPhase = 'idle'; // 'flying' | 'dwelling'
  let _tourPhaseStart = 0;
  let _tourFlightStartPos = new THREE.Vector3();
  let _tourFlightStartQuat = new THREE.Quaternion();
  let _tourFlightEndQuat = new THREE.Quaternion();

  const museumPortalWorldPos = new THREE.Vector3(-58.15, 21.8, -19.0);
  const museumReturnCamPos = new THREE.Vector3(-39.5, 21.8, -19.0);
  const museumReturnLookAt = new THREE.Vector3(-52.8, 22.0, -19.0);

  const realmSpawnPos = new THREE.Vector3(0, 2.1, 20.5);
  const realmSpawnLookAt = new THREE.Vector3(0, 2.0, -8.0);

  // =========================================================================
  // PHẦN 1: CỔNG DỊCH CHUYỂN TẠI PHÒNG TẮT ĐÈN (TẦNG 3)
  // =========================================================================
  const portalGroup = new THREE.Group();
  portalGroup.name = 'TatDen_Portal_Station';
  portalGroup.position.copy(portalPositionLocal);
  interiorGroup.add(portalGroup);

  const portalModelHolder = new THREE.Group();
  portalModelHolder.name = 'TatDen_Portal_ModelHolder';
  portalGroup.add(portalModelHolder);

  // Tải portal_tatden.glb với normalizeModelToHeight + Fallback Procedural Mesh
  const fallbackPortal = buildProceduralPortalFallback();
  portalModelHolder.add(fallbackPortal);

  loadGlbCached(['/models/tatden/portal_tatden.glb'], {
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
      resolveNormalize(raw, 4.75);
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
      // Giữ nguyên Procedural Fallback Mesh nếu lỗi mạng
      syncMuseumPortalHitboxes();
    });

  // Shader mặt phẳng Portal sóng sánh ánh lửa đèn dầu mờ ảo trong đêm đen
  const portalShaderMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uTint: { value: new THREE.Color(0xff9436) }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uTint;
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - vec2(0.5, 0.5)) * vec2(1.0, 1.25);
        float d = length(p);
        float angle = atan(p.y, p.x);
        float wave = sin(d * 18.0 - uTime * 3.4 + sin(angle * 4.0 + uTime * 1.5)) * 0.5 + 0.5;
        float core = exp(-d * 3.8);
        float mask = smoothstep(0.62, 0.14, d);
        float lampFocus = exp(-length(vUv - vec2(0.5, 0.72)) * 4.5);
        vec3 col = mix(vec3(0.05, 0.03, 0.04), uTint, wave * 0.65 + lampFocus * 0.85);
        float alpha = clamp((core * 0.65 + wave * 0.35 + lampFocus * 0.55) * mask, 0.0, 0.88);
        gl_FragColor = vec4(col, alpha);
      }
    `
  });
  const portalPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.65, 3.6), portalShaderMat);
  portalPlane.position.set(0, 2.05, 0.04);
  portalPlane.userData.ignoreRaycaster = true;
  portalGroup.add(portalPlane);

  const portalLampLight = new THREE.PointLight(0xff9436, 3.2, 9.5, 1.7);
  portalLampLight.position.set(0, 3.55, 0.45);
  portalGroup.add(portalLampLight);

  // Bảng dẫn hướng Cổng Dịch Chuyển
  const portalSignDisposables = [];
  const portalSignTex = createPlaqueTex(
    'CỔNG DỊCH CHUYỂN • LÀNG ĐÔNG XÁ',
    'Tiến lại gần hoặc Click qua ánh đèn dầu để bước vào truyện Tắt Đèn',
    { bg: '#0c0806', border: '#c4832c', mainColor: '#fde68a', subColor: '#e2b675', w: 960, h: 170 },
    portalSignDisposables
  );
  const portalSign = new THREE.Mesh(
    new THREE.PlaneGeometry(3.4, 0.62),
    new THREE.MeshBasicMaterial({ map: portalSignTex, transparent: true })
  );
  portalSign.position.set(0, 4.95, 0.42);
  portalSign.userData.ignoreRaycaster = true;
  portalGroup.add(portalSign);

  // Invisible Raycast Proxy Mesh gắn chặt Cổng (opacity: 0, visible: true, depthWrite: false)
  const portalClickProxy = new THREE.Mesh(
    new THREE.BoxGeometry(3.1, 4.2, 1.3),
    new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    })
  );
  portalClickProxy.name = 'TatDen_Portal_ClickProxy';
  portalClickProxy.position.set(0, 2.1, 0);
  portalClickProxy.userData = {
    isClickProxy: true,
    isBookPortal: true,
    isTeleportBook: true,
    targetRealm: 'TAT_DEN_REALM',
    ignoreRaycaster: false,
    portalMetadata: {
      id: 'tat_den_realm',
      title: 'CÕI NGOẠI CẢNH TẮT ĐÈN • LÀNG ĐÔNG XÁ',
      author: 'Ngô Tất Tố (1893 – 1954)',
      genre: 'Tiểu thuyết Hiện thực Phê phán (1939)',
      quote: '“Chị vùng chạy ra ngoài giữa lúc trời tối như mực và như cái tiền đồ của chị vậy!”',
      themeColor: 0xff9436,
      targetRealm: 'TAT_DEN_REALM',
      portalReady: true,
      onActivate: () => enterRealm()
    },
    onActivate: () => enterRealm()
  };
  portalGroup.add(portalClickProxy);

  function syncMuseumPortalHitboxes() {
    if (!roomGroup) return;
    roomGroup.updateMatrixWorld(true);
    portalGroup.getWorldPosition(museumPortalWorldPos);

    if (_hitboxManager) {
      // Hai trụ gạch cổng chặn va chạm, chừa khe giữa thông thoáng để bước xuyên cổng
      const leftPierPos = interiorGroup.localToWorld(new THREE.Vector3(-1.85, 1.8, -10.15));
      const rightPierPos = interiorGroup.localToWorld(new THREE.Vector3(1.85, 1.8, -10.15));
      _hitboxManager.registerSolidObjectCollider(null, {
        customBox: new THREE.Box3().setFromCenterAndSize(leftPierPos, new THREE.Vector3(0.95, 3.6, 0.95)),
        tag: 'TatDen_PortalPierLeft',
        helperColor: 0x38bdf8,
        realm: 'museum'
      });
      _hitboxManager.registerSolidObjectCollider(null, {
        customBox: new THREE.Box3().setFromCenterAndSize(rightPierPos, new THREE.Vector3(0.95, 3.6, 0.95)),
        tag: 'TatDen_PortalPierRight',
        helperColor: 0x38bdf8,
        realm: 'museum'
      });

      const proxy = _hitboxManager.createTightClickHitbox(portalClickProxy, {
        isBookPortal: true,
        portalTargetRealm: 'TAT_DEN_REALM',
        portalMetadata: portalClickProxy.userData.portalMetadata,
        onActivate: () => enterRealm(),
        padding: 0.15,
        minSize: 1.5,
        realm: 'museum'
      });
      if (proxy) {
        proxy.userData.isBookPortal = true;
        proxy.userData.isTeleportBook = true;
      }
    }

    if (_portalInteraction?.registerInteractiveBook) {
      _portalInteraction.registerInteractiveBook(portalClickProxy, realmSpawnPos, portalClickProxy.userData.portalMetadata);
    } else {
      registerInteractiveBook(portalClickProxy, realmSpawnPos, portalClickProxy.userData.portalMetadata);
    }
  }

  // =========================================================================
  // PHẦN 2: OVERLAY & TOP HUD TRONG CÕI TẮT ĐÈN
  // =========================================================================
  function getOrCreateVignetteOverlay() {
    let el = document.getElementById('td-cutscene-vignette');
    if (!el && typeof document !== 'undefined') {
      el = document.createElement('div');
      el.id = 'td-cutscene-vignette';
      el.style.cssText = `
        position: fixed; inset: 0; pointer-events: none; z-index: 9998;
        opacity: 0;
        background: radial-gradient(circle at center, rgba(255, 148, 54, 0.38) 0%, rgba(12, 8, 6, 0.96) 58%, #040407 100%);
      `;
      document.body.appendChild(el);
    }
    return el;
  }

  function getOrCreateRealmHUD() {
    let hud = document.getElementById('td-realm-top-hud');
    if (!hud && typeof document !== 'undefined') {
      hud = document.createElement('div');
      hud.id = 'td-realm-top-hud';
      hud.style.cssText = `
        position: fixed; top: 64px; right: 20px; left: auto;
        z-index: 9995; display: none; align-items: center; gap: 10px;
        white-space: nowrap;
        background: linear-gradient(135deg, rgba(16, 11, 8, 0.94), rgba(5, 5, 8, 0.96));
        border: 1.5px solid #d97706; border-radius: 999px;
        padding: 7px 14px; color: #fde68a; font-family: Georgia, serif;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.78);
      `;
      hud.innerHTML = `
        <span id="td-hud-title" style="font-weight: 700; font-size: 13px; letter-spacing: 0.4px;">
          🏮 CÕI TẮT ĐÈN • LÀNG ĐÔNG XÁ ĐÊM SƯU THUẾ
        </span>
        <button id="td-btn-tour" style="
          background: linear-gradient(90deg, #92400e, #b45309); color: #fef3c7;
          border: 1px solid #f59e0b; border-radius: 999px; padding: 5px 12px;
          font-size: 12px; font-weight: 700; cursor: pointer;">
          🧭 Tour Làng Đông Xá
        </button>
        <button id="td-btn-exit-realm" style="
          background: linear-gradient(90deg, #3b1c0e, #572711); color: #fed7aa;
          border: 1px solid #ea580c; border-radius: 999px; padding: 5px 12px;
          font-size: 12px; font-weight: 700; cursor: pointer;">
          🚪 Về Phòng 302 [ESC]
        </button>
      `;
      document.body.appendChild(hud);

      document.getElementById('td-btn-tour')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (_tourActive) stopRealmTour();
        else startRealmTour();
      });
      document.getElementById('td-btn-exit-realm')?.addEventListener('click', (e) => {
        e.stopPropagation();
        exitRealm();
      });
    }
    return hud;
  }

  // =========================================================================
  // PHẦN 3: HÀM TẠO & DỌN DẸP CÕI NGOẠI CẢNH LÀNG ĐÔNG XÁ (60+ FPS)
  // =========================================================================
  function getVillageFloorHeightAt(x, z) {
    // Sân đình cao tam cấp bên phải (x in [7.0, 19.5], z in [-10.0, 2.0])
    if (x >= 7.0 && x <= 19.5 && z >= -10.5 && z <= 2.5) {
      return 0.34;
    }
    // Bờ ruộng cánh đồng chiêm trũng phía cuối đường (z < -17.0)
    if (z < -17.0) {
      return Math.abs(x) <= 2.6 ? 0.04 : -0.18;
    }
    // Hai rìa lũy tre hơi gồ nhẹ, đường làng phẳng giữa
    return Math.abs(x) > 6.2 ? 0.14 : 0.0;
  }

  function mountTatDenRealm() {
    if (!realmScene) return;
    disposeTatDenRealm();

    const disposables = [];
    const root = new THREE.Group();
    root.name = 'TatDen_DongXa_Universe_Root';
    realmScene.add(root);
    _realmRoot = root;
    _realmDisposables = disposables;

    const tex = createRealmTextures(disposables);

    // 1. Sky Dome Đêm Tối Như Mực (#040407) hoàn toàn không sao, mây đen vần vũ + FogExp2
    realmScene.background = new THREE.Color(0x040407);
    realmScene.fog = new THREE.FogExp2(0x040407, 0.0135);

    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec3 vWorld;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorld = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec3 vWorld;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
        float noise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                     mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
        }
        void main() {
          vec3 dir = normalize(vWorld);
          vec2 uv = dir.xz / max(0.18, abs(dir.y) + 0.18);
          float c1 = noise(uv * 1.4 + vec2(uTime * 0.025, -uTime * 0.015));
          float c2 = noise(uv * 3.1 - vec2(uTime * 0.04, uTime * 0.02));
          float cloud = smoothstep(0.32, 0.85, c1 * 0.6 + c2 * 0.4);
          vec3 inkBlack = vec3(0.015, 0.015, 0.028);
          vec3 stormGrey = vec3(0.075, 0.082, 0.125);
          gl_FragColor = vec4(mix(inkBlack, stormGrey, cloud * max(0.0, dir.y)), 1.0);
        }
      `
    });
    const skyDome = new THREE.Mesh(new THREE.SphereGeometry(185, 28, 18), skyMat);
    skyDome.userData.ignoreRaycaster = true;
    root.add(skyDome);

    // Ánh sáng đêm u uất nhưng đủ hắt khối rõ rệt (Three.js r186 PBR physical lights)
    const realmAmbient = new THREE.AmbientLight(0x283044, 0.72);
    const nightHemi = new THREE.HemisphereLight(0x3a4663, 0x1c140e, 0.95);
    const moonlessRim = new THREE.DirectionalLight(0x52668f, 1.05);
    moonlessRim.position.set(-18, 28, -22);
    moonlessRim.castShadow = false;
    root.add(realmAmbient, nightHemi, moonlessRim);

    // 2. Lớp bóng núi và lũy tre xa mờ bao quanh làng Đông Xá (Layered Silhouettes - Merged 1 Draw Call)
    const silMat = new THREE.MeshBasicMaterial({ color: 0x06060b, fog: true });
    const silGroup = new THREE.Group();
    const rng = createSeededRandom(992);
    for (let i = 0; i < 26; i++) {
      const ang = (i / 26) * Math.PI * 2;
      const dist = 74 + rng() * 34;
      const h = 10 + rng() * 16;
      const r = 12 + rng() * 14;
      const hill = new THREE.Mesh(new THREE.ConeGeometry(r, h, 7), silMat);
      hill.position.set(Math.cos(ang) * dist, h * 0.35 - 1.0, Math.sin(ang) * dist);
      hill.userData.ignoreRaycaster = true;
      silGroup.add(hill);
    }
    mergeGroupMeshesByMaterial(silGroup);
    root.add(silGroup);

    // 3. Địa hình đường làng bùn lầy & cánh đồng chiêm trũng ngập bùn
    const roadMat = new THREE.MeshStandardMaterial({
      map: tex.mudDiff,
      normalMap: tex.mudNorm,
      roughness: 0.72,
      metalness: 0.08
    });
    const groundPlane = new THREE.Mesh(new THREE.PlaneGeometry(150, 150, 1, 1), roadMat);
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.set(0, 0, -6);
    groundPlane.userData.isWalkableFloor = true;
    groundPlane.userData.ignoreRaycaster = true;
    root.add(groundPlane);

    // Vũng nước mưa bùn lầy trên đường làng & cánh đồng chiêm trũng ngập bùn (GPU Shader Wave, 0 CPU Loop)
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x1a1410,
      roughness: 0.15,
      metalness: 0.42
    });
    const waterTimeUniform = { value: 0 };
    const paddyWaterMat = waterMat.clone();
    paddyWaterMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = waterTimeUniform;
      shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        transformed.y += sin(transformed.x * 0.35 + uTime * 2.4) * cos(transformed.z * 0.3 + uTime * 1.8) * 0.032;`
      );
    };
    paddyWaterMat.customProgramCacheKey = () => 'td_paddy_water_wave_v1';

    const paddyWaterGeo = new THREE.PlaneGeometry(88, 46, 20, 12);
    paddyWaterGeo.rotateX(-Math.PI / 2);
    paddyWaterGeo.computeBoundingBox();
    paddyWaterGeo.computeBoundingSphere();
    const paddyWater = new THREE.Mesh(paddyWaterGeo, paddyWaterMat);
    paddyWater.position.set(0, -0.04, -40);
    paddyWater.userData.ignoreRaycaster = true;
    root.add(paddyWater);

    // Các vũng nước nhỏ dọc đường đất làng (Phân khu 1 -> 3 - Merged 1 Draw Call)
    const puddlesGroup = new THREE.Group();
    [[-1.1, 18.5, 3.8, 2.2], [1.4, 9.2, 3.2, 1.9], [-0.6, -2.5, 4.1, 2.4], [0.8, -11.5, 3.6, 2.1]].forEach(([px, pz, pw, pd]) => {
      const pg = new THREE.CircleGeometry(pw * 0.5, 18);
      pg.rotateX(-Math.PI / 2);
      pg.scale(1, 1, pd / pw);
      const puddle = new THREE.Mesh(pg, waterMat);
      puddle.position.set(px, 0.024, pz);
      puddle.userData.ignoreRaycaster = true;
      puddlesGroup.add(puddle);
    });
    mergeGroupMeshesByMaterial(puddlesGroup);
    root.add(puddlesGroup);

    // Bờ ruộng đất nổi dẫn ra giữa Cánh đồng đêm (Phân khu 4)
    const dikeWalk = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.14, 24), roadMat);
    dikeWalk.position.set(0, 0.02, -26);
    dikeWalk.userData.isWalkableFloor = true;
    dikeWalk.userData.ignoreRaycaster = true;
    root.add(dikeWalk);

    _realmWalkables = [groundPlane, dikeWalk];

    // 4. Lũy tre cằn cỗi xơ xác đung đưa hai bên đường làng (THREE.InstancedMesh)
    const bambooMat = new THREE.MeshStandardMaterial({ color: 0x1a1e13, roughness: 0.86 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x10160d, roughness: 0.92, side: THREE.DoubleSide });
    const bambooGroup = new THREE.Group();
    const culmData = [];
    const nodeData = [];
    const leafData = [];
    const bRng = createSeededRandom(4409);

    for (let z = 30; z >= -16; z -= 1.15) {
      [-1, 1].forEach((side) => {
        // Chừa khoảng sân mở trước Nhà Chị Dậu (trái z in [-1, 12]) và Sân Đình (phải z in [-12, 4])
        if (side === -1 && z > -1 && z < 11.5) return;
        if (side === 1 && z > -11.5 && z < 3.5) return;

        for (let k = 0; k < 3; k++) {
          const bx = side * (5.6 + bRng() * 5.2);
          const bz = z + (bRng() - 0.5) * 1.2;
          const h = 4.2 + bRng() * 3.8;
          const tiltX = (bRng() - 0.5) * 0.22;
          const tiltZ = side * -0.12 + (bRng() - 0.5) * 0.2;
          culmData.push({ bx, bz, h, tiltX, tiltZ, rad: 0.055 + bRng() * 0.035 });
          for (let s = 1; s <= 3; s++) {
            const ny = (h / 3.8) * s;
            nodeData.push({ bx, ny, bz, tiltX, tiltZ, s: 1.0 + bRng() * 0.35 });
          }
          leafData.push({ bx, y: h * 0.8, bz, ry: bRng() * Math.PI * 2, s: 0.75 + bRng() * 0.65 });
        }
      });
    }

    const instCulmGeo = new THREE.CylinderGeometry(0.055, 0.075, 1.0, 6);
    const instNodeGeo = new THREE.TorusGeometry(0.07, 0.016, 5, 8);
    const instLeafGeo = new THREE.ConeGeometry(0.35, 0.95, 5);
    const instCulms = new THREE.InstancedMesh(instCulmGeo, bambooMat, culmData.length);
    const instNodes = new THREE.InstancedMesh(instNodeGeo, bambooMat, nodeData.length);
    const instLeaves = new THREE.InstancedMesh(instLeafGeo, leafMat, leafData.length);
    instCulms.userData.ignoreRaycaster = true;
    instNodes.userData.ignoreRaycaster = true;
    instLeaves.userData.ignoreRaycaster = true;

    const dummy = new THREE.Object3D();
    culmData.forEach((c, i) => {
      dummy.position.set(c.bx, c.h * 0.5, c.bz);
      dummy.rotation.set(c.tiltX, 0, c.tiltZ);
      dummy.scale.set(c.rad / 0.06, c.h, c.rad / 0.06);
      dummy.updateMatrix();
      instCulms.setMatrixAt(i, dummy.matrix);
    });
    nodeData.forEach((n, i) => {
      dummy.position.set(n.bx, n.ny, n.bz);
      dummy.rotation.set(Math.PI / 2 + n.tiltX, 0, n.tiltZ);
      dummy.scale.setScalar(n.s);
      dummy.updateMatrix();
      instNodes.setMatrixAt(i, dummy.matrix);
    });
    leafData.forEach((l, i) => {
      dummy.position.set(l.bx, l.y, l.bz);
      dummy.rotation.set(0.3, l.ry, 0.45);
      dummy.scale.setScalar(l.s);
      dummy.updateMatrix();
      instLeaves.setMatrixAt(i, dummy.matrix);
    });
    instCulms.instanceMatrix.needsUpdate = true;
    instNodes.instanceMatrix.needsUpdate = true;
    instLeaves.instanceMatrix.needsUpdate = true;
    bambooGroup.add(instCulms, instNodes, instLeaves);
    root.add(bambooGroup);

    // Hàng rào cọc tre xiêu vẹo dọc 2 mép đường làng (shared Geometry/Material InstancedMesh)
    const fencePostCoords = [];
    for (let fz = 26; fz >= -14; fz -= 2.4) {
      if (!(fz > -1 && fz < 11)) fencePostCoords.push([-4.9, fz]);
      if (!(fz > -11 && fz < 3.5)) fencePostCoords.push([4.9, fz]);
    }
    const instFencePosts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.06, 1.15, 6), bambooMat, fencePostCoords.length);
    fencePostCoords.forEach(([fx, fz], i) => {
      dummy.position.set(fx, 0.55, fz);
      dummy.rotation.set((bRng() - 0.5) * 0.15, 0, (bRng() - 0.5) * 0.18);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      instFencePosts.setMatrixAt(i, dummy.matrix);
    });
    instFencePosts.instanceMatrix.needsUpdate = true;
    instFencePosts.userData.ignoreRaycaster = true;
    root.add(instFencePosts);

    // =========================================================================
    // PHÂN KHU 1B: BỆ ĐÈN DẦU CỔ QUAY VỀ BẢO TÀNG (ĐẦU ĐƯỜNG LÀNG)
    // =========================================================================
    const returnStation = new THREE.Group();
    returnStation.name = 'TatDen_Return_OilLamp_Station';
    returnStation.position.set(-3.4, 0, 23.0);
    root.add(returnStation);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x26262c, roughness: 0.85 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0x8d6326, roughness: 0.4, metalness: 0.8 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd9a73e, roughness: 0.32, metalness: 0.88 });
    const limMat = new THREE.MeshStandardMaterial({
      color: 0x160c07,
      map: tex.limDiff,
      normalMap: tex.limNorm,
      roughness: 0.34,
      metalness: 0.12
    });
    const wattleMat = new THREE.MeshStandardMaterial({
      map: tex.wattleDiff,
      normalMap: tex.wattleNorm,
      roughness: 0.94
    });

    const retPlinth = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.68, 1.05, 16), stoneMat);
    retPlinth.position.y = 0.525;
    returnStation.add(retPlinth);

    const returnLampHolder = new THREE.Group();
    returnLampHolder.position.y = 1.05;
    returnStation.add(returnLampHolder);
    const fbRetLamp = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.65, 12), brassMat);
    fbRetLamp.position.y = 0.325;
    returnLampHolder.add(fbRetLamp);

    loadGlbCached(['/models/tatden/oil_lamp.glb'], {
      maxTextureSize: 1024,
      disableMipmaps: true
    })
      .then((m) => {
        if (!_realmRoot || !m) return;
        returnLampHolder.remove(fbRetLamp);
        fbRetLamp.geometry.dispose();
        resolveNormalize(m, 0.85);
        m.traverse((c) => {
          c.userData.isSharedCachedAsset = true;
          if (c.isMesh) {
            c.castShadow = false;
            c.receiveShadow = false;
            c.frustumCulled = true;
          }
        });
        returnLampHolder.add(m);
      })
      .catch(() => {});

    const returnLight = new THREE.PointLight(0xffa640, 11.5, 18.0, 1.25);
    returnLight.position.set(0, 1.9, 0);
    returnStation.add(returnLight);

    const retBannerTex = createPlaqueTex(
      'BỆ ĐÈN DẦU HỒI QUY',
      'Click ngọn đèn hoặc bấm [ESC] quay về Phòng Tắt Đèn (Tầng 3)',
      { bg: '#110a05', border: '#ea580c', mainColor: '#fed7aa', subColor: '#fdba74', w: 680, h: 160 },
      disposables
    );
    const retBanner = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 0.52),
      new THREE.MeshBasicMaterial({ map: retBannerTex, transparent: true })
    );
    retBanner.position.set(0, 2.55, 0);
    retBanner.userData.ignoreRaycaster = true;
    returnStation.add(retBanner);

    const returnProxy = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 2.3, 1.5),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.0, depthWrite: false })
    );
    returnProxy.position.y = 1.25;
    returnProxy.userData = {
      isClickProxy: true,
      isReturnPortal: true,
      realm: 'tat_den',
      onActivate: () => exitRealm()
    };
    returnStation.add(returnProxy);

    // =========================================================================
    // PHÂN KHU 2: MÁI TRANH NGHÈO GIA ĐÌNH CHỊ DẬU (BÊN TRÁI)
    // =========================================================================
    const shackGroup = new THREE.Group();
    shackGroup.name = 'Realm_Zone2_NhaChiDau';
    shackGroup.position.set(-11.2, 0, 5.2);
    shackGroup.rotation.y = Math.PI * 0.42;
    root.add(shackGroup);

    const fbShack = buildProceduralShackFallback(wattleMat);
    shackGroup.add(fbShack);

    loadGlbCached(['/models/tatden/nha_chi_dau.glb'], {
      maxTextureSize: 1024,
      disableMipmaps: true
    })
      .then((m) => {
        if (!_realmRoot || !m) return;
        shackGroup.remove(fbShack);
        fbShack.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
        resolveNormalize(m, 4.2);
        m.traverse((c) => {
          c.userData.isSharedCachedAsset = true;
          if (c.isMesh) {
            c.castShadow = false;
            c.receiveShadow = false;
            c.frustumCulled = true;
          }
        });
        shackGroup.add(m);
      })
      .catch(() => {});

    // Vách đất nứt nẻ lộ cốt tre bổ sung + đạo cụ nhỏ (rá, nón mê rách)
    const wattlePatch = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.75, 0.18), wattleMat);
    wattlePatch.position.set(3.45, 0.9, 0.2);
    wattlePatch.rotation.y = 0.25;
    shackGroup.add(wattlePatch);

    const basketMat = new THREE.MeshStandardMaterial({ color: 0x5c4727, roughness: 0.94, side: THREE.DoubleSide });
    // Cái rá múc cháo cám & nón mê rách bên hiên
    const raBasket = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.14, 0.11, 14, 1, true), basketMat);
    raBasket.position.set(0.25, 0.56, 2.35);
    shackGroup.add(raBasket);
    const tornHat = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.16, 12, 1, true), basketMat);
    tornHat.position.set(-0.95, 0.58, 2.45);
    tornHat.rotation.z = 0.18;
    shackGroup.add(tornHat);

    // Đèn dầu leo lắt sắp tắt trước gió lùa (#ff8c24, dùng sin(time*8)*cos(time*3))
    const shackOilLight = new THREE.PointLight(0xff8c24, 15.0, 24.0, 1.2);
    shackOilLight.position.set(-0.4, 1.85, 2.9);
    shackGroup.add(shackOilLight);

    const shackFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.055, 0.16, 8),
      new THREE.MeshBasicMaterial({ color: 0xffa840 })
    );
    shackFlame.position.set(-0.6, 1.15, 2.65);
    shackGroup.add(shackFlame);

    const shackSignTex = createPlaqueTex(
      'NHÀ CHỊ DẬU • CHÁO CÁM & ĐÀN CHÓ',
      'Click để đọc nguyên tác Ngô Tất Tố',
      { bg: '#1a120c', border: '#b45309', mainColor: '#fed7aa', subColor: '#d6a473', w: 680, h: 155 },
      disposables
    );
    const shackSign = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.64), new THREE.MeshBasicMaterial({ map: shackSignTex }));
    shackSign.position.set(0, 4.75, 2.2);
    shackSign.userData.ignoreRaycaster = true;
    shackGroup.add(shackSign);

    const shackLoreProxy = new THREE.Mesh(
      new THREE.BoxGeometry(7.2, 4.2, 5.2),
      new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.0, depthWrite: false })
    );
    shackLoreProxy.position.set(0, 2.1, 0.4);
    shackLoreProxy.userData = { isClickProxy: true, loreKey: 'tatDenRealm_nhaChiDau', realm: 'tat_den' };
    shackGroup.add(shackLoreProxy);

    // =========================================================================
    // PHÂN KHU 3: SÂN ĐÌNH ĐÔNG XÁ & DINH CƠ NGHỊ QUẾ (BÊN PHẢI / PHÍA TRƯỚC)
    // =========================================================================
    const dinhGroup = new THREE.Group();
    dinhGroup.name = 'Realm_Zone3_DinhDongXa_NghiQue';
    dinhGroup.position.set(12.8, 0.34, -3.8);
    dinhGroup.rotation.y = -Math.PI * 0.44;
    root.add(dinhGroup);

    const fbDinh = buildProceduralDinhFallback(limMat);
    dinhGroup.add(fbDinh);

    loadGlbCached(['/models/tatden/dinh_dong_xa_nghi_que.glb'], {
      maxTextureSize: 1024,
      disableMipmaps: true
    })
      .then((m) => {
        if (!_realmRoot || !m) return;
        dinhGroup.remove(fbDinh);
        fbDinh.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
        resolveNormalize(m, 6.2);
        m.traverse((c) => {
          c.userData.isSharedCachedAsset = true;
          if (c.isMesh) {
            c.castShadow = false;
            c.receiveShadow = false;
            c.frustumCulled = true;
          }
        });
        dinhGroup.add(m);
      })
      .catch(() => {});

    // Phù điêu 3D ExtrudeGeometry Vân mây / Hổ phù + chữ Hán sơn son thếp vàng gắn tại mặt tiền Đình
    const blackLacquerMat = new THREE.MeshStandardMaterial({ color: 0x090404, roughness: 0.25, metalness: 0.15 });
    const reliefTop = buildExtrudedCloudAndShieldRelief(goldMat, blackLacquerMat);
    reliefTop.scale.setScalar(1.35);
    reliefTop.position.set(0, 4.1, 2.35);
    dinhGroup.add(reliefTop);

    const hanPlaqueTex = createPlaqueTex(
      '東舍亭 • ĐÌNH LÀNG ĐÔNG XÁ',
      'Thượng đẳng thần từ • Nơi hào lý thúc sưu đêm thâu',
      { bg: '#210707', border: '#e5b842', mainColor: '#fcd34d', subColor: '#e6b86a', w: 800, h: 190 },
      disposables
    );
    const hanPlaque = new THREE.Mesh(
      new THREE.PlaneGeometry(3.4, 0.8),
      new THREE.MeshStandardMaterial({ map: hanPlaqueTex, roughness: 0.38, metalness: 0.3 })
    );
    hanPlaque.position.set(0, 3.25, 2.45);
    dinhGroup.add(hanPlaque);

    // Đạo cụ sân đình bổ sung: chiếc mõ tre, tờ trát đòi sưu & đài lửa đuốc đỏ rực (#ff3b14)
    const moTre = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 0.65, 12), basketMat);
    moTre.rotation.z = Math.PI / 2;
    moTre.position.set(-1.35, 1.08, 1.45);
    dinhGroup.add(moTre);

    const tratTex = createPlaqueTex('TRÁT ĐÒI SƯU', 'Nộp đủ 2 đồng 7 hào lập tức!', { bg: '#d9c49e', border: '#5e2c14', mainColor: '#361909', subColor: '#692a14', w: 320, h: 120 }, disposables);
    const tratPaper = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.32), new THREE.MeshStandardMaterial({ map: tratTex, roughness: 0.85 }));
    tratPaper.rotation.x = -Math.PI / 2;
    tratPaper.position.set(0.35, 1.03, 1.15);
    dinhGroup.add(tratPaper);

    // Hai đài đuốc rực lửa đỏ (#ff3b14) hai bên bậc thềm sân đình
    const torchPositions = [new THREE.Vector3(-4.1, 0, 3.3), new THREE.Vector3(4.1, 0, 3.3)];
    const torchLights = [];
    const torchFlames = [];
    torchPositions.forEach((tp) => {
      const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.18, 1.15, 10), stoneMat);
      brazier.position.set(tp.x, 0.58, tp.z);
      dinhGroup.add(brazier);
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.24, 0.65, 10),
        new THREE.MeshBasicMaterial({ color: 0xff4518 })
      );
      flame.position.set(tp.x, 1.4, tp.z);
      dinhGroup.add(flame);
      torchFlames.push(flame);

      const tLight = new THREE.PointLight(0xff3b14, 24.0, 32.0, 1.15);
      tLight.position.set(tp.x, 2.2, tp.z);
      dinhGroup.add(tLight);
      torchLights.push(tLight);
    });

    // Cổng gạch Nghị Quế chếch phía trước sân đình để phân tách 2 thẻ Lore rõ ràng
    const nghiQueGate = new THREE.Group();
    nghiQueGate.name = 'Realm_Zone3B_NghiQueGate';
    nghiQueGate.position.set(9.2, 0, 5.8);
    nghiQueGate.rotation.y = -Math.PI * 0.42;
    root.add(nghiQueGate);

    const nqBrickMat = new THREE.MeshStandardMaterial({ color: 0x261210, roughness: 0.84 });
    [-1.4, 1.4].forEach((gx) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.65, 3.4, 0.65), nqBrickMat);
      col.position.set(gx, 1.7, 0);
      nghiQueGate.add(col);
    });
    const nqHeader = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.55, 0.8), limMat);
    nqHeader.position.set(0, 3.45, 0);
    nghiQueGate.add(nqHeader);
    const nqSignTex = createPlaqueTex(
      'NGHỊ QUẾ PHỦ',
      'Cổng gạch địa chủ — Cảnh bán con, bán chó',
      { bg: '#160706', border: '#c4962c', mainColor: '#fde047', subColor: '#e2b675', w: 620, h: 155 },
      disposables
    );
    const nqSign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.62), new THREE.MeshBasicMaterial({ map: nqSignTex }));
    nqSign.position.set(0, 4.15, 0.15);
    nqSign.userData.ignoreRaycaster = true;
    nghiQueGate.add(nqSign);

    const nghiQueLoreProxy = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 3.8, 1.6),
      new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.0, depthWrite: false })
    );
    nghiQueLoreProxy.position.set(0, 1.9, 0);
    nghiQueLoreProxy.userData = { isClickProxy: true, loreKey: 'tatDenRealm_nhaNghiQue', realm: 'tat_den' };
    nghiQueGate.add(nghiQueLoreProxy);

    const sanDinhLoreProxy = new THREE.Mesh(
      new THREE.BoxGeometry(9.6, 5.4, 6.2),
      new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.0, depthWrite: false })
    );
    sanDinhLoreProxy.position.set(0, 2.7, 0.5);
    sanDinhLoreProxy.userData = { isClickProxy: true, loreKey: 'tatDenRealm_sanDinh', realm: 'tat_den' };
    dinhGroup.add(sanDinhLoreProxy);

    // =========================================================================
    // PHÂN KHU 4: CÁNH ĐỒNG ĐÊM "TỐI NHƯ MỰC" & TƯỢNG CHỊ DẬU QUẬT CƯỜNG
    // =========================================================================
    const fieldStation = new THREE.Group();
    fieldStation.name = 'Realm_Zone4_CanhDongDem';
    fieldStation.position.set(0, 0, -25.5);
    root.add(fieldStation);

    const mound = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 2.25, 0.42, 20), roadMat);
    mound.position.y = 0.21;
    fieldStation.add(mound);

    const heroHolder = new THREE.Group();
    heroHolder.position.y = 0.42;
    heroHolder.rotation.y = Math.PI; // Quay vào màn đêm -Z hoặc hơi chếch để nhìn rõ dáng đứng
    fieldStation.add(heroHolder);

    const fbChiDau = buildProceduralChiDauFallback();
    heroHolder.add(fbChiDau);

    loadGlbCached(['/models/tatden/chi_dau_phankhang.glb'], {
      maxTextureSize: 1024,
      disableMipmaps: true
    })
      .then((m) => {
        if (!_realmRoot || !m) return;
        heroHolder.remove(fbChiDau);
        fbChiDau.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
        resolveNormalize(m, 2.25);
        m.traverse((c) => {
          c.userData.isSharedCachedAsset = true;
          if (c.isMesh) {
            c.castShadow = false;
            c.receiveShadow = false;
            c.frustumCulled = true;
          }
        });
        heroHolder.add(m);
      })
      .catch(() => {});

    // Luồng Volumetric God Rays mờ ảo chiếu từ trên cao xuống tôn vinh Chị Dậu giữa đêm đen
    const godRayMat = new THREE.MeshBasicMaterial({
      color: 0xffd291,
      map: tex.godRayTex,
      transparent: true,
      opacity: 0.36,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const fieldGodRay = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 3.1, 13.0, 24, 1, true), godRayMat);
    fieldGodRay.position.set(0, 6.6, 0);
    fieldGodRay.userData.ignoreRaycaster = true;
    fieldStation.add(fieldGodRay);

    const fieldHeroSpot = new THREE.SpotLight(0xffe1b0, 18.0, 28.0, Math.PI / 4.0, 0.65, 1.15);
    fieldHeroSpot.position.set(0, 11.5, 1.5);
    fieldHeroSpot.target.position.set(0, 1.2, 0);
    fieldHeroSpot.castShadow = false;
    fieldStation.add(fieldHeroSpot, fieldHeroSpot.target);

    const fieldSignTex = createPlaqueTex(
      '“TRỜI TỐI NHƯ MỰC VÀ NHƯ CÁI TIỀN ĐỒ CỦA CHỊ”',
      'Click vào tượng Chị Dậu để đọc chương kết Tắt Đèn',
      { bg: '#050508', border: '#876335', mainColor: '#fde68a', subColor: '#bba17b', w: 920, h: 175 },
      disposables
    );
    const fieldSign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.64), new THREE.MeshBasicMaterial({ map: fieldSignTex, transparent: true }));
    fieldSign.position.set(0, 3.65, 0);
    fieldSign.userData.ignoreRaycaster = true;
    fieldStation.add(fieldSign);

    const fieldLoreProxy = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 3.4, 2.6),
      new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.0, depthWrite: false })
    );
    fieldLoreProxy.position.y = 1.7;
    fieldLoreProxy.userData = { isClickProxy: true, loreKey: 'tatDenRealm_canhDongDem', realm: 'tat_den' };
    fieldStation.add(fieldLoreProxy);

    // =========================================================================
    // HẠT MƯA PHÙN GIÓ BẤC BAY XIÊN & TÀN LỬA ĐUỐC SÂN ĐÌNH (ignoreRaycaster = true)
    // =========================================================================
    const pRng = createSeededRandom(5511);
    const rainCount = 420;
    const rainPos = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPos[i * 3] = (pRng() - 0.5) * 48;
      rainPos[i * 3 + 1] = pRng() * 14;
      rainPos[i * 3 + 2] = (pRng() - 0.5) * 68;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x8ea4bd,
      size: 0.11,
      map: tex.particleTex,
      transparent: true,
      opacity: 0.42,
      depthWrite: false
    });
    const rainPoints = new THREE.Points(rainGeo, rainMat);
    rainPoints.userData.ignoreRaycaster = true;
    root.add(rainPoints);

    const emberCount = 150;
    const emberPos = new Float32Array(emberCount * 3);
    const emberPhases = new Float32Array(emberCount);
    for (let i = 0; i < emberCount; i++) {
      emberPos[i * 3] = 9.0 + (pRng() - 0.5) * 6.5;
      emberPos[i * 3 + 1] = 1.2 + pRng() * 7.5;
      emberPos[i * 3 + 2] = -3.8 + (pRng() - 0.5) * 6.5;
      emberPhases[i] = pRng() * Math.PI * 2;
    }
    const emberGeo = new THREE.BufferGeometry();
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
    const emberMat = new THREE.PointsMaterial({
      color: 0xff5e1a,
      size: 0.16,
      map: tex.particleTex,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const emberPoints = new THREE.Points(emberGeo, emberMat);
    emberPoints.userData.ignoreRaycaster = true;
    root.add(emberPoints);

    // =========================================================================
    // ĐĂNG KÝ HITBOX, COLLIDERS, LORE & POSITIONAL AUDIO TRONG LÀNG ĐÔNG XÁ
    // =========================================================================
    root.updateMatrixWorld(true);

    const realmDebugGroup = new THREE.Group();
    realmDebugGroup.name = 'TatDen_Realm_DebugHitboxes';
    realmDebugGroup.visible = Boolean(_hitboxManager?.debugHelpers?.visible);
    root.add(realmDebugGroup);
    _realmDebugGroup = realmDebugGroup;

    const interactiveProxies = [returnProxy, shackLoreProxy, nghiQueLoreProxy, sanDinhLoreProxy, fieldLoreProxy];
    const realmColliders = [];

    const addCollider = (centerVec, sizeVec, name, color = 0x22c55e) => {
      const box = new THREE.Box3().setFromCenterAndSize(centerVec, sizeVec);
      realmColliders.push({ box, name });
      realmDebugGroup.add(new THREE.Box3Helper(box, color));
    };

    // Nhà Chị Dậu, Sân Đình & Nghị Quế, Bệ Đèn Dầu, Bờ rào lũy tre (Khung Xanh)
    addCollider(new THREE.Vector3(-11.2, 2.0, 5.2), new THREE.Vector3(5.4, 4.0, 7.0), 'NhaChiDau', 0x22c55e);
    addCollider(new THREE.Vector3(12.8, 3.0, -3.8), new THREE.Vector3(7.4, 6.0, 10.0), 'DinhDongXa', 0x22c55e);
    addCollider(new THREE.Vector3(9.2, 1.8, 5.8), new THREE.Vector3(1.8, 3.6, 3.8), 'CongNghiQue', 0x22c55e);
    addCollider(new THREE.Vector3(-3.4, 1.0, 23.0), new THREE.Vector3(1.3, 2.0, 1.3), 'BeDenHoiQuy', 0x22c55e);
    addCollider(new THREE.Vector3(0.0, 1.4, -25.5), new THREE.Vector3(3.4, 2.8, 3.4), 'TuongChiDau', 0x22c55e);
    // Rào lũy tre hai bên đường & ranh giới ngoại vi (Khung Lam)
    addCollider(new THREE.Vector3(-7.6, 2.5, 19.0), new THREE.Vector3(3.5, 5.0, 18.0), 'LuyTreTrai_1', 0x38bdf8);
    addCollider(new THREE.Vector3(7.6, 2.5, 19.0), new THREE.Vector3(3.5, 5.0, 18.0), 'LuyTrePhai_1', 0x38bdf8);
    addCollider(new THREE.Vector3(0, 2.5, 33.5), new THREE.Vector3(38.0, 5.0, 2.0), 'BienDuongSau', 0x38bdf8);
    addCollider(new THREE.Vector3(0, 2.5, -35.0), new THREE.Vector3(44.0, 5.0, 2.0), 'BienCanhDong', 0x38bdf8);

    if (_hitboxManager) {
      _hitboxManager.clearRealmHitboxes?.('tat_den');
      _hitboxManager.registerRealmHitboxes('tat_den', realmColliders);
    }

    // Gắn debug Khung Vàng cho các proxy click tương tác + đăng ký LoreGuide
    interactiveProxies.forEach((px) => {
      px.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(px);
      realmDebugGroup.add(new THREE.Box3Helper(b, px.userData.isReturnPortal ? 0x38bdf8 : 0xfde047));
      if (px.userData.loreKey && _loreGuide?.registerArtifact) {
        _loreGuide.registerArtifact(px, px.userData.loreKey);
      }
    });

    // Âm thanh không gian 3D (THREE.PositionalAudio) tại 3 vị trí đặc trưng
    if (_spatialAudio?.attachPositionalSound) {
      _spatialAudio.attachPositionalSound('tatden_realm_drum', dinhGroup, {
        fallbackTheme: 'tatden_realm_drum',
        refDistance: 8,
        maxDistance: 36,
        volume: 0.48
      });
      _spatialAudio.attachPositionalSound('tatden_realm_shack', shackGroup, {
        fallbackTheme: 'tatden_realm_shack',
        refDistance: 6,
        maxDistance: 28,
        volume: 0.46
      });
      _spatialAudio.attachPositionalSound('tatden_realm_field', fieldStation, {
        fallbackTheme: 'tatden_realm_field',
        refDistance: 7,
        maxDistance: 32,
        volume: 0.45
      });
    }

    // Đồng bộ WebXR Teleportation xuống mặt đường làng Đông Xá
    _immersionSystem?.xrTeleport?.setTargetContext?.(realmScene, _realmWalkables);

    _realmState = {
      skyMat,
      bambooGroup,
      paddyWaterGeo,
      waterTimeUniform,
      shackOilLight,
      shackFlame,
      torchLights,
      torchFlames,
      godRayMat,
      rainGeo,
      emberGeo,
      emberPhases,
      returnLight,
      retBanner,
      interactiveProxies
    };
  }

  function disposeTatDenRealm() {
    if (_spatialAudio?.detachPositionalSound) {
      _spatialAudio.detachPositionalSound('tatden_realm_drum');
      _spatialAudio.detachPositionalSound('tatden_realm_shack');
      _spatialAudio.detachPositionalSound('tatden_realm_field');
    }

    if (_realmState?.interactiveProxies && _loreGuide?.interactiveArtifacts) {
      _realmState.interactiveProxies.forEach((px) => {
        const idx = _loreGuide.interactiveArtifacts.indexOf(px);
        if (idx !== -1) _loreGuide.interactiveArtifacts.splice(idx, 1);
      });
    }

    if (_hitboxManager?.clearRealmHitboxes) {
      _hitboxManager.clearRealmHitboxes('tat_den');
    }

    if (_realmRoot) {
      const matSet = new Set();
      _realmRoot.traverse((obj) => {
        if (obj.userData?.isSharedCachedAsset) return;
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

    _realmDisposables.forEach((tex) => tex?.dispose?.());
    _realmDisposables = [];
    _realmWalkables = [];
    _realmDebugGroup = null;
    _realmState = null;
  }

  // =========================================================================
  // PHẦN 4: DOLLY-ZOOM CUTSCENE XUYÊN QUA ĐÈN DẦU & VÀO/RA CÕI TRUYỆN
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
        // Nửa đầu (0 -> 0.55): Dolly thẳng về phía ngọn đèn dầu cổng vòm + co FOV (Vertigo Dolly-Zoom)
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
        // Nửa sau (0.55 -> 1.0): Xé màn sương bước ra cảnh mới, FOV trở về chuẩn 65°
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

  function enterRealm({ autoStartTour = false } = {}) {
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
    const portalLampWorld = interiorGroup.localToWorld(new THREE.Vector3(0, 3.4, -10.15));
    const dollyFocusPos = interiorGroup.localToWorld(new THREE.Vector3(0, 3.15, -8.85));

    runDollyZoomTransition({
      targetPos: dollyFocusPos,
      lookAtPos: portalLampWorld,
      durationMs: 1150,
      onSwap: () => {
        _isInsideRealm = true;
        if (typeof window !== 'undefined') window.__tatDenRealmActive = true;
        if (roomGroup) roomGroup.visible = false;

        mountTatDenRealm();

        if (typeof window !== 'undefined' && window.__app?.setActiveScene && realmScene) {
          window.__app.setActiveScene(realmScene);
        }

        if (camCtrl) {
          camCtrl.setFloorHeightProvider?.(getVillageFloorHeightAt);
          camCtrl.floorHeightProvider = getVillageFloorHeightAt;
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
      },
      onFinish: () => {
        _isTransitioning = false;
        if (ctrl) ctrl.enabled = true;
        if (camCtrl) camCtrl.isEnabled = true;
        if (autoStartTour) startRealmTour();
      }
    });
  }

  function exitRealm({ immediate = false, moveCameraBack = true } = {}) {
    if (!_isInsideRealm || _isTransitioning) return;
    _isTransitioning = true;
    stopRealmTour();
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
      if (typeof window !== 'undefined') window.__tatDenRealmActive = false;

      disposeTatDenRealm();

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
        _immersionSystem?.xrTeleport?.setTargetContext?.(mainScene, [window.__app.atriumGroup]);
      }

      if (moveCameraBack) {
        if (cam) {
          cam.position.copy(museumReturnCamPos);
          cam.lookAt(museumReturnLookAt);
        }
        if (ctrl) {
          ctrl.target.copy(museumReturnLookAt);
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
  // PHẦN 5: EDUCATIONAL AUTO-TOUR QUA 4 PHÂN KHU TRONG CÕI TẮT ĐÈN
  // =========================================================================
  const REALM_TOUR_STOPS = [
    {
      title: 'Phân khu 1 • Đường Làng Đông Xá & Lũy Tre Xơ Xác',
      camPos: new THREE.Vector3(0, 2.4, 24.0),
      lookAt: new THREE.Vector3(0, 2.0, 2.0),
      loreKey: null,
      dwellMs: 4500
    },
    {
      title: 'Phân khu 2 • Túp Lều Tranh & Nồi Cháo Cám Nhà Chị Dậu',
      camPos: new THREE.Vector3(-4.2, 2.35, 9.2),
      lookAt: new THREE.Vector3(-11.2, 1.5, 5.2),
      loreKey: 'tatDenRealm_nhaChiDau',
      dwellMs: 7000
    },
    {
      title: 'Phân khu 3A • Cổng Gạch Dinh Cơ Nghị Quế',
      camPos: new THREE.Vector3(3.2, 2.45, 7.6),
      lookAt: new THREE.Vector3(9.2, 2.1, 5.8),
      loreKey: 'tatDenRealm_nhaNghiQue',
      dwellMs: 6500
    },
    {
      title: 'Phân khu 3B • Sân Đình Đông Xá Đêm Thúc Sưu',
      camPos: new THREE.Vector3(3.6, 2.75, -1.2),
      lookAt: new THREE.Vector3(12.8, 2.4, -3.8),
      loreKey: 'tatDenRealm_sanDinh',
      dwellMs: 7500
    },
    {
      title: 'Phân khu 4 • Cánh Đồng Đêm “Tối Như Mực”',
      camPos: new THREE.Vector3(0.0, 2.4, -17.5),
      lookAt: new THREE.Vector3(0.0, 2.1, -26.5),
      loreKey: 'tatDenRealm_canhDongDem',
      dwellMs: 7500
    }
  ];

  function beginTourStop(idx) {
    const cam = _camera || window.__camera;
    if (!cam) return;
    _tourIdx = idx;
    const stop = REALM_TOUR_STOPS[idx];
    _tourPhase = 'flying';
    _tourPhaseStart = performance.now();
    _tourFlightStartPos.copy(cam.position);
    _tourFlightStartQuat.copy(cam.quaternion);

    const tmp = cam.clone();
    tmp.position.copy(stop.camPos);
    tmp.lookAt(stop.lookAt);
    _tourFlightEndQuat.copy(tmp.quaternion);

    const hudTitle = document.getElementById('td-hud-title');
    if (hudTitle) hudTitle.textContent = `🧭 Đang dẫn tour: ${stop.title}`;
  }

  function startRealmTour() {
    if (!_isInsideRealm) {
      enterRealm({ autoStartTour: true });
      return;
    }
    _tourActive = true;
    const btn = document.getElementById('td-btn-tour');
    if (btn) btn.textContent = '⏹ Dừng Tour';
    _loreGuide?.hideLoreCard?.();
    beginTourStop(0);
  }

  function stopRealmTour() {
    if (!_tourActive) return;
    _tourActive = false;
    _tourPhase = 'idle';
    const btn = document.getElementById('td-btn-tour');
    if (btn) btn.textContent = '🧭 Tour Làng Đông Xá';
    const hudTitle = document.getElementById('td-hud-title');
    if (hudTitle) hudTitle.textContent = '🏮 CÕI TẮT ĐÈN • LÀNG ĐÔNG XÁ ĐÊM SƯU THUẾ';
  }

  function updateRealmTour(nowMs) {
    if (!_tourActive || !_isInsideRealm) return;
    const cam = _camera || window.__camera;
    if (!cam) return;
    const stop = REALM_TOUR_STOPS[_tourIdx];

    if (_tourPhase === 'flying') {
      const t = Math.min(1, (nowMs - _tourPhaseStart) / 2400);
      const e = easeInOutCubic(t);
      cam.position.lerpVectors(_tourFlightStartPos, stop.camPos, e);
      cam.quaternion.slerpQuaternions(_tourFlightStartQuat, _tourFlightEndQuat, e);

      if (t >= 1) {
        _tourPhase = 'dwelling';
        _tourPhaseStart = nowMs;
        if (stop.loreKey && _loreGuide?.showLoreCard) {
          _loreGuide.showLoreCard(stop.loreKey);
        }
      }
    } else if (_tourPhase === 'dwelling') {
      if (nowMs - _tourPhaseStart >= stop.dwellMs) {
        _loreGuide?.hideLoreCard?.();
        if (_tourIdx + 1 < REALM_TOUR_STOPS.length) {
          beginTourStop(_tourIdx + 1);
        } else {
          stopRealmTour();
        }
      }
    }
  }

  // =========================================================================
  // PHẦN 6: XỬ LÝ SỰ KIỆN CLICK & PHÍM ESC / CẬP NHẬT MỖI KHUNG HÌNH
  // =========================================================================
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const PORTAL_RAYCAST_MAX_SQ = 42 * 42;

  function onWindowPointerDown(e) {
    if (_isTransitioning || _loreGuide?.isOpen) return;
    if (e.target.closest('#td-realm-top-hud') || e.target.closest('#director-hud') || e.target.closest('#museum-lore-overlay')) {
      return;
    }

    // Nếu người dùng tự click lúc đang chạy Tour trong cõi thì hủy Tour nếu click vào HUD; click vào hiện vật trong cõi vẫn ưu tiên mở Lore
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
    const rect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth || 1, height: window.innerHeight || 1 };
    if (document.pointerLockElement) {
      mouse.set(0, 0);
    } else {
      mouse.x = ((e.clientX - rect.left) / (rect.width || 1)) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / (rect.height || 1)) * 2 + 1;
    }
    raycaster.setFromCamera(mouse, cam);
    raycaster.far = 36;

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

    // Khi đang ở Phòng 302 Bảo tàng: cho phép click trực tiếp lên portalClickProxy
    if (roomGroup?.visible) {
      portalClickProxy.updateMatrixWorld(true);
      const hits = raycaster.intersectObject(portalClickProxy, false);
      if (hits.length > 0 && hits[0].distance <= 24) {
        e.stopPropagation();
        enterRealm();
      }
    }
  }

  function onWindowKeyDown(e) {
    if (!_isInsideRealm) return;
    if (e.key === 'Escape') {
      if (_loreGuide?.isOpen) {
        _loreGuide.hideLoreCard();
        return;
      }
      if (_tourActive) {
        stopRealmTour();
        return;
      }
      exitRealm();
    } else if (_tourActive && ['w', 'a', 's', 'd', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      // Cho phép người dùng hủy Auto-Tour bất cứ lúc nào khi bấm phím di chuyển
      stopRealmTour();
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
    if (camera?.position && camera.position.distanceToSquared(roomGroup.position) > PORTAL_RAYCAST_MAX_SQ) {
      return;
    }

    portalShaderMat.uniforms.uTime.value = elapsedTime;
    portalLampLight.intensity = 2.8 + Math.sin(elapsedTime * 8.0) * Math.cos(elapsedTime * 3.0) * 0.95;

    // Kiểm tra người chơi bước lại gần cổng (< 2.5m) trong Phòng 302 để tự động kích hoạt enterRealm
    if (!_isInsideRealm && !_isTransitioning && _reentryCooldown <= 0 && camera && roomGroup?.visible) {
      const dist = camera.position.distanceTo(museumPortalWorldPos);
      if (dist < 2.5) {
        enterRealm();
      }
    }
  }

  function updateRealm(delta = 0.016, elapsedTime = 0, camera = null) {
    if (camera) _camera = camera;
    if (!_isInsideRealm || !_realmState) return;
    const dt = Math.min(delta, 0.05);

    _realmState.skyMat.uniforms.uTime.value = elapsedTime;

    // Đồng bộ bật/tắt khung dây Debug Hitbox (Phím H / F2) trong Làng Đông Xá
    if (_realmDebugGroup && _hitboxManager?.debugHelpers) {
      _realmDebugGroup.visible = _hitboxManager.debugHelpers.visible;
    }

    // 1. Đèn dầu nhà Chị Dậu chập chờn sắp tắt trước gió lùa: Math.sin(time * 8) * Math.cos(time * 3)
    const wave = Math.sin(elapsedTime * 8.0) * Math.cos(elapsedTime * 3.0);
    _realmState.shackOilLight.intensity = 13.5 + wave * 5.0;
    _realmState.shackFlame.scale.set(1 + wave * 0.12, Math.max(0.45, 1 + wave * 0.35), 1 - wave * 0.12);

    // 2. Đuốc sân đình đỏ rực gay gắt (#ff3b14)
    _realmState.torchLights.forEach((tl, idx) => {
      const f = Math.sin(elapsedTime * 11.5 + idx * 2.1) * 3.2 + Math.cos(elapsedTime * 19.0) * 1.8;
      tl.intensity = 22.0 + f;
      _realmState.torchFlames[idx].scale.y = 1.0 + f * 0.05;
    });

    // 3. Đèn hồi quy & biển chỉ dẫn ở đầu làng
    _realmState.returnLight.intensity = 10.5 + Math.sin(elapsedTime * 6.0) * 2.0;
    _realmState.retBanner.position.y = 2.55 + Math.sin(elapsedTime * 2.4) * 0.05;

    // 4. Lũy tre đung đưa nhẹ trong gió đêm
    _realmState.bambooGroup.rotation.z = Math.sin(elapsedTime * 1.15) * 0.012;

    // 5. Gợn sóng mặt nước đồng chiêm trũng & bùn lầy (GPU vertex shader)
    if (_realmState.waterTimeUniform) {
      _realmState.waterTimeUniform.value = elapsedTime;
    }

    // 6. God Rays trên cánh đồng đêm
    _realmState.godRayMat.opacity = 0.33 + Math.sin(elapsedTime * 1.6) * 0.04;

    // 7. Mưa phùn gió bấc bay xiên & tàn lửa sân đình bay lên
    const rArr = _realmState.rainGeo.attributes.position.array;
    for (let i = 0; i < rArr.length; i += 3) {
      rArr[i] += dt * 3.4;     // bay xiên theo chiều gió
      rArr[i + 1] -= dt * 11.5;
      rArr[i + 2] += dt * 1.8;
      if (rArr[i + 1] < 0) rArr[i + 1] = 14.0;
      if (rArr[i] > 24) rArr[i] = -24;
      if (rArr[i + 2] > 34) rArr[i + 2] = -34;
    }
    _realmState.rainGeo.attributes.position.needsUpdate = true;

    const eArr = _realmState.emberGeo.attributes.position.array;
    const ePh = _realmState.emberPhases;
    for (let i = 0; i < ePh.length; i++) {
      const i3 = i * 3;
      eArr[i3] += Math.sin(elapsedTime * 1.8 + ePh[i]) * dt * 0.6;
      eArr[i3 + 1] += dt * 1.9;
      if (eArr[i3 + 1] > 9.5) eArr[i3 + 1] = 1.2;
    }
    _realmState.emberGeo.attributes.position.needsUpdate = true;

    // 8. Auto-Tour
    updateRealmTour(performance.now());
  }

  function setupContext({
    camera = null,
    renderer = null,
    cameraManager = null,
    hitboxManager = null,
    loreGuide = null,
    spatialAudio = null,
    portalInteraction = null,
    immersionSystem = null
  } = {}) {
    if (camera) _camera = camera;
    if (renderer) _renderer = renderer;
    if (cameraManager) _cameraManager = cameraManager;
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
    disposeTatDenRealm();
    portalShaderMat.dispose();
    portalSignDisposables.forEach((t) => t?.dispose?.());
  }

  return {
    portalGroup,
    portalClickProxy,
    enterRealm,
    exitRealm,
    startRealmTour,
    stopRealmTour,
    isInsideRealm: () => _isInsideRealm,
    updateMuseumPortal,
    updateRealm,
    setupContext,
    syncMuseumPortalHitboxes,
    dispose
  };
}
