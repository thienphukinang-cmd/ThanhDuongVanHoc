import * as THREE from 'three';
import { loadGlbCached, normalizeModelToHeight, sanitizeGeometryBuffers } from '../utils/modelLoaderHelper.js';
import {
  createLyDynastyDragonRelief3D,
  createLyCloudAndWaveRelief3D,
  createLyLotusWaveNormalMaterial
} from './museumReliefSculptor.js';
import {
  createNamQuocSonHaStoryRealm,
  createLyBannerTexture
} from './namQuocSonHaStoryRealm.js';

/**
 * ============================================================================
 * PHÒNG TRƯNG BÀY NAM QUỐC SƠN HÀ – LÝ THƯỜNG KIỆT (TẦNG 2 • PHÒNG 202)
 * Quy hoạch không gian chuẩn bảo tàng (Rộng 25.6m x Sâu 27.6m x Cao 8.4m, Vòm cửa 4.6m)
 *
 * Bố cục 4 khu vực:
 * 1. Trung tâm: Bệ đá hoa sen đặt tượng danh tướng `lythuongkiet.glb` (3.0m) + God Ray
 * 2. Cánh trái: "Bản Tuyên Ngôn Độc Lập Đầu Tiên" - `chieu_thu_nam_quoc.glb` + God Ray
 * 3. Cánh phải: "Chiến Tuyến Như Nguyệt" - `sa_ban_nhu_nguyet.glb` & `vu_khi_nha_ly.glb`
 * 4. Cuối phòng: Cổng dịch chuyển `portal_nhu_nguyet.glb` -> enterRealm('namquocsonha')
 * ============================================================================
 */

const ROOM_W = 25.6;
const ROOM_D = 27.6;
const ROOM_H = 8.4;
const ARCH_H = 4.6;

const PALETTE = {
  gold: 0xd4af37,
  crimson: 0x8b1e1e,
  midnightBlue: 0x0b1528,
  stoneSlate: 0x1a273b,
  limWood: 0x26150e,
  godRayGold: 0xf7d26a
};

function createSeededRandom(seed = 1077) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function prepGeo(geo) {
  if (!geo) return geo;
  sanitizeGeometryBuffers(geo);
  return geo;
}

function makeCanvasTexture(canvas, { repeatX = 1, repeatY = 1, srgb = true, disposables = [] } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
  tex.needsUpdate = true;
  disposables.push(tex);
  return tex;
}

/** Chuyển Heightmap Canvas sang Tangent-Space Normal Map (THREE.LinearSRGBColorSpace) */
function heightCanvasToLinearNormalMap(heightCanvas, strength = 2.6, repeatX = 1, repeatY = 1, disposables = []) {
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

  return makeCanvasTexture(nCanvas, { repeatX, repeatY, srgb: false, disposables });
}

function createRoomTextures(disposables) {
  const rng = createSeededRandom(1077);
  const sz = 256;

  // 1. Sàn đá xanh thời Lý chạm khắc hoa văn sóng & viền đồng
  const floorC = document.createElement('canvas');
  floorC.width = sz;
  floorC.height = sz;
  const fCtx = floorC.getContext('2d');
  const floorHC = document.createElement('canvas');
  floorHC.width = sz;
  floorHC.height = sz;
  const fhCtx = floorHC.getContext('2d');

  fCtx.fillStyle = '#0e1a2e';
  fCtx.fillRect(0, 0, sz, sz);
  fhCtx.fillStyle = '#808080';
  fhCtx.fillRect(0, 0, sz, sz);

  const cell = sz / 2;
  for (let gx = 0; gx < 2; gx++) {
    for (let gy = 0; gy < 2; gy++) {
      const bx = gx * cell;
      const by = gy * cell;
      const tone = 16 + Math.floor(rng() * 8);
      fCtx.fillStyle = `rgb(${tone}, ${tone + 11}, ${tone + 28})`;
      fCtx.fillRect(bx + 3, by + 3, cell - 6, cell - 6);
      fCtx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
      fCtx.lineWidth = 2;
      fCtx.strokeRect(bx + 6, by + 6, cell - 12, cell - 12);

      fhCtx.fillStyle = '#9a9a9a';
      fhCtx.fillRect(bx + 3, by + 3, cell - 6, cell - 6);
      fhCtx.strokeStyle = '#383838';
      fhCtx.lineWidth = 4;
      fhCtx.strokeRect(bx + 2, by + 2, cell - 4, cell - 4);
    }
  }

  // 2. God Ray vertical gradient
  const rayC = document.createElement('canvas');
  rayC.width = 128;
  rayC.height = 256;
  const rCtx = rayC.getContext('2d');
  const rGrad = rCtx.createLinearGradient(0, 0, 0, 256);
  rGrad.addColorStop(0.0, 'rgba(255, 226, 130, 0.0)');
  rGrad.addColorStop(0.16, 'rgba(255, 224, 120, 0.56)');
  rGrad.addColorStop(0.68, 'rgba(212, 175, 55, 0.22)');
  rGrad.addColorStop(1.0, 'rgba(212, 175, 55, 0.0)');
  rCtx.fillStyle = rGrad;
  rCtx.fillRect(0, 0, 128, 256);

  // 3. Soft radial glow particle sprite
  const ptC = document.createElement('canvas');
  ptC.width = 64;
  ptC.height = 64;
  const pCtx = ptC.getContext('2d');
  const pGrad = pCtx.createRadialGradient(32, 32, 0, 32, 32, 30);
  pGrad.addColorStop(0.0, 'rgba(255,255,255,1)');
  pGrad.addColorStop(0.35, 'rgba(255,220,120,0.68)');
  pGrad.addColorStop(1.0, 'rgba(212,175,55,0)');
  pCtx.fillStyle = pGrad;
  pCtx.fillRect(0, 0, 64, 64);

  // 4. Mandala hoa sen & ấn triện Thiên Thư dưới sàn trung tâm
  const mandalaC = document.createElement('canvas');
  mandalaC.width = 512;
  mandalaC.height = 512;
  const mCtx = mandalaC.getContext('2d');
  const cx = 256;
  const cy = 256;
  const mGrad = mCtx.createRadialGradient(cx, cy, 20, cx, cy, 240);
  mGrad.addColorStop(0.0, 'rgba(212, 175, 55, 0.45)');
  mGrad.addColorStop(0.55, 'rgba(139, 30, 30, 0.25)');
  mGrad.addColorStop(1.0, 'rgba(11, 21, 40, 0.0)');
  mCtx.fillStyle = mGrad;
  mCtx.fillRect(0, 0, 512, 512);
  mCtx.strokeStyle = 'rgba(253, 224, 71, 0.72)';
  mCtx.lineWidth = 5;
  mCtx.beginPath();
  mCtx.arc(cx, cy, 185, 0, Math.PI * 2);
  mCtx.stroke();
  mCtx.beginPath();
  mCtx.arc(cx, cy, 138, 0, Math.PI * 2);
  mCtx.stroke();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    mCtx.beginPath();
    mCtx.moveTo(cx + Math.cos(a) * 140, cy + Math.sin(a) * 140);
    mCtx.lineTo(cx + Math.cos(a) * 182, cy + Math.sin(a) * 182);
    mCtx.stroke();
  }

  return {
    floorDiffuse: makeCanvasTexture(floorC, { repeatX: 7, repeatY: 7, srgb: true, disposables }),
    floorNormal: heightCanvasToLinearNormalMap(floorHC, 2.4, 7, 7, disposables),
    godRayTex: makeCanvasTexture(rayC, { srgb: true, disposables }),
    particleTex: makeCanvasTexture(ptC, { srgb: true, disposables }),
    mandalaTex: makeCanvasTexture(mandalaC, { srgb: true, disposables }),
    lyBannerTex: createLyBannerTexture(disposables)
  };
}

function createPlaqueTexture(title, subtitle = '', {
  width = 800,
  height = 200,
  bg = '#0b1528',
  border = '#d4af37',
  titleColor = '#fde68a',
  subColor = '#e2e8f0'
} = {}, disposables = []) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = border;
  ctx.lineWidth = 8;
  ctx.strokeRect(10, 10, width - 20, height - 20);
  ctx.strokeStyle = '#8b1e1e';
  ctx.lineWidth = 3;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = titleColor;
  ctx.font = 'bold 40px Georgia, "Times New Roman", serif';
  ctx.fillText(title, width / 2, subtitle ? height * 0.40 : height * 0.50);

  if (subtitle) {
    ctx.fillStyle = subColor;
    ctx.font = 'italic 23px Georgia, "Times New Roman", serif';
    ctx.fillText(subtitle, width / 2, height * 0.72);
  }
  return makeCanvasTexture(c, { srgb: true, disposables });
}

function createPoetryMuralTexture(disposables = []) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 640;
  const ctx = c.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, 1024, 640);
  g.addColorStop(0.0, '#1e0b0b');
  g.addColorStop(0.25, '#8b1e1e');
  g.addColorStop(0.5, '#d4af37');
  g.addColorStop(0.75, '#8b1e1e');
  g.addColorStop(1.0, '#0b1528');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 640);

  ctx.fillStyle = '#f5e2a8';
  ctx.fillRect(28, 28, 968, 584);
  ctx.strokeStyle = '#8b1e1e';
  ctx.lineWidth = 8;
  ctx.strokeRect(40, 40, 944, 560);

  // Ấn đỏ Thiên Thư
  ctx.fillStyle = 'rgba(139, 30, 30, 0.9)';
  ctx.fillRect(72, 72, 104, 104);
  ctx.fillStyle = '#fef3c7';
  ctx.font = 'bold 26px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText('THIÊN', 124, 114);
  ctx.fillText('THƯ', 124, 150);

  ctx.fillStyle = '#5c0c0c';
  ctx.font = 'bold 34px "Times New Roman", serif';
  ctx.fillText('BẢN TUYÊN NGÔN ĐỘC LẬP ĐẦU TIÊN (1077)', 540, 108);

  const lines = [
    ['南國山河南帝居', 'Nam quốc sơn hà Nam đế cư'],
    ['截然定分在天書', 'Tiệt nhiên định phận tại thiên thư'],
    ['如何逆虜來侵犯', 'Như hà nghịch lỗ lai xâm phạm'],
    ['汝等行看取敗虛', 'Nhữ đẳng hành khan thủ bại hư']
  ];

  lines.forEach(([hanzi, phienAm], idx) => {
    const y = 215 + idx * 92;
    ctx.fillStyle = '#4a0b0b';
    ctx.font = 'bold 40px "SimSun", "KaiTi", serif';
    ctx.fillText(hanzi, 340, y);

    ctx.fillStyle = '#2b1a0c';
    ctx.font = 'italic bold 28px Georgia, serif';
    ctx.fillText(phienAm, 700, y);
  });

  return makeCanvasTexture(c, { srgb: true, disposables });
}

/** Fallback Procedural Meshes cho 3 hiện vật Blender + Tượng Lý Thường Kiệt */
function buildStatueFallback(goldMat, crimsonMat) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.42, 0.56, 1.85, 12)), crimsonMat);
  body.position.y = 0.925;
  g.add(body);
  const armor = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(0.95, 0.72, 0.58)), goldMat);
  armor.position.y = 1.65;
  g.add(armor);
  const head = new THREE.Mesh(prepGeo(new THREE.SphereGeometry(0.24, 12, 10)), goldMat);
  head.position.y = 2.45;
  g.add(head);
  const helmet = new THREE.Mesh(prepGeo(new THREE.ConeGeometry(0.28, 0.45, 8)), goldMat);
  helmet.position.y = 2.75;
  g.add(helmet);
  return g;
}

function buildChieuThuFallback(goldMat, crimsonMat) {
  const g = new THREE.Group();
  const stand = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(1.5, 0.2, 0.7)), crimsonMat);
  stand.position.y = 0.1;
  g.add(stand);
  const silk = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(1.25, 0.65, 0.06)), goldMat);
  silk.position.set(0, 0.52, 0);
  silk.rotation.x = -0.52;
  g.add(silk);
  return g;
}

function buildSaBanFallback(crimsonMat, goldMat, midnightMat) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(2.2, 0.18, 1.5)), crimsonMat);
  frame.position.y = 0.09;
  g.add(frame);
  const river = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(2.0, 0.06, 1.3)), midnightMat);
  river.position.y = 0.19;
  g.add(river);
  const hill = new THREE.Mesh(prepGeo(new THREE.ConeGeometry(0.32, 0.36, 6)), goldMat);
  hill.position.set(0.4, 0.35, -0.3);
  g.add(hill);
  return g;
}

function buildVuKhiFallback(crimsonMat, goldMat) {
  const g = new THREE.Group();
  [-0.7, 0.7].forEach((x) => {
    const post = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(0.12, 1.8, 0.14)), crimsonMat);
    post.position.set(x, 0.9, 0);
    g.add(post);
  });
  const bar = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(1.7, 0.12, 0.12)), goldMat);
  bar.position.y = 1.75;
  g.add(bar);
  const shield = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.38, 0.38, 0.08, 16).rotateX(Math.PI / 2)), goldMat);
  shield.position.set(0, 0.95, 0.15);
  g.add(shield);
  return g;
}

/** Tạo bục trưng bày chuẩn bảo tàng kèm biển tên đồng cổ */
function buildCuratedPedestal({
  width,
  depth,
  height,
  crimsonMat,
  goldMat,
  stoneMat,
  title,
  subtitle,
  disposables
}) {
  const ped = new THREE.Group();

  const plinth = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(width + 0.24, 0.16, depth + 0.24)), stoneMat);
  plinth.position.y = 0.08;
  ped.add(plinth);

  const shaftH = Math.max(0.3, height - 0.28);
  const shaft = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(width, shaftH, depth)), crimsonMat);
  shaft.position.y = 0.16 + shaftH * 0.5;
  ped.add(shaft);

  const cap = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(width + 0.18, 0.12, depth + 0.18)), goldMat);
  cap.position.y = 0.16 + shaftH + 0.06;
  ped.add(cap);

  if (title) {
    const tex = createPlaqueTexture(title, subtitle, { width: 640, height: 150 }, disposables);
    const plaque = new THREE.Mesh(
      prepGeo(new THREE.PlaneGeometry(Math.min(width * 0.88, 1.35), 0.32)),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.42, metalness: 0.28 })
    );
    plaque.position.set(0, 0.16 + shaftH * 0.60, depth * 0.5 + 0.015);
    ped.add(plaque);
  }

  return ped;
}

function localToWorldVec(interiorGroup, lx, ly, lz) {
  interiorGroup.updateMatrixWorld(true);
  return interiorGroup.localToWorld(new THREE.Vector3(lx, ly, lz));
}

/**
 * Xây dựng toàn diện Phòng Trưng Bày Nam Quốc Sơn Hà – Lý Thường Kiệt (Tầng 2 Cánh Tây-Bắc)
 */
export function buildNamQuocSonHaExhibition({
  roomCenter = new THREE.Vector3(-48.0, 10.0, -19.0),
  mainScene = null,
  realmScene = null,
  cameraManager = null
} = {}) {
  const disposables = [];
  const textures = createRoomTextures(disposables);

  const roomGroup = new THREE.Group();
  roomGroup.name = 'NamQuocSonHa_Sovereignty_Exhibition';
  roomGroup.position.copy(roomCenter);

  const interiorGroup = new THREE.Group();
  interiorGroup.name = 'NamQuocSonHa_Interior_Group';
  // Cánh Tây (+X hướng về sảnh) dùng +PI/2 để local +Z hướng ra cửa vòm sảnh
  interiorGroup.rotation.y = roomCenter.x < 0 ? Math.PI / 2 : -Math.PI / 2;
  roomGroup.add(interiorGroup);

  // Vật liệu chủ đạo: Vàng hoàng kim (#d4af37), Đỏ son (#8b1e1e), Xanh đêm huyền bí (#0b1528)
  const floorMat = new THREE.MeshStandardMaterial({
    map: textures.floorDiffuse,
    normalMap: textures.floorNormal,
    roughness: 0.72,
    metalness: 0.18
  });
  const wallReliefMat = createLyLotusWaveNormalMaterial('midnightGold', 4, 2);
  const crimsonMat = new THREE.MeshStandardMaterial({
    color: PALETTE.crimson,
    roughness: 0.32,
    metalness: 0.20
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: PALETTE.gold,
    roughness: 0.22,
    metalness: 0.86,
    emissive: 0x3b2704,
    emissiveIntensity: 0.28
  });
  const stoneMat = new THREE.MeshStandardMaterial({
    color: PALETTE.stoneSlate,
    roughness: 0.78,
    metalness: 0.12
  });
  const limWoodMat = new THREE.MeshStandardMaterial({
    color: PALETTE.limWood,
    roughness: 0.65,
    metalness: 0.08
  });
  const midnightMat = new THREE.MeshStandardMaterial({
    color: PALETTE.midnightBlue,
    roughness: 0.86,
    metalness: 0.08
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0xd1d5db,
    roughness: 0.22,
    metalness: 0.90
  });
  const bannerMat = new THREE.MeshStandardMaterial({
    map: textures.lyBannerTex,
    roughness: 0.52,
    side: THREE.DoubleSide
  });

  const solidObstacleObjects = [];

  // =========================================================================
  // 1. KIẾN TRÚC PHÒNG (CAO 8.4M, VÒM CỬA 4.6M, SÀN ĐÁ THỜI LÝ & TRẦN GIẾNG TRỜI)
  // =========================================================================
  const floor = new THREE.Mesh(prepGeo(new THREE.PlaneGeometry(ROOM_W, ROOM_D)), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.025;
  floor.userData.isWalkableFloor = true;
  interiorGroup.add(floor);

  // Thảm đá/đồng trục chính dẫn từ vòm cửa tới tượng Lý Thường Kiệt & cổng dịch chuyển
  const walkway = new THREE.Mesh(
    prepGeo(new THREE.BoxGeometry(4.4, 0.032, 24.4)),
    crimsonMat
  );
  walkway.position.set(0, 0.032, 1.5);
  walkway.userData.isWalkableFloor = true;
  interiorGroup.add(walkway);

  const walkwayTrim = new THREE.Mesh(
    prepGeo(new THREE.BoxGeometry(4.72, 0.02, 24.4)),
    goldMat
  );
  walkwayTrim.position.set(0, 0.026, 1.5);
  walkwayTrim.userData.ignoreRaycaster = true;
  interiorGroup.add(walkwayTrim);

  // Trần phòng cao chuẩn 8.4m với ô giếng trời rọi Volumetric God Rays xuống Tượng & Chiếu Thư
  const ceilingGroup = new THREE.Group();
  const frontCeil = new THREE.Mesh(prepGeo(new THREE.PlaneGeometry(ROOM_W, 11.4)), midnightMat);
  frontCeil.rotation.x = Math.PI / 2;
  frontCeil.position.set(0, ROOM_H, 8.1);
  ceilingGroup.add(frontCeil);

  const rearCeil = new THREE.Mesh(prepGeo(new THREE.PlaneGeometry(ROOM_W, 9.8)), midnightMat);
  rearCeil.rotation.x = Math.PI / 2;
  rearCeil.position.set(0, ROOM_H, -8.9);
  ceilingGroup.add(rearCeil);

  const leftCeil = new THREE.Mesh(prepGeo(new THREE.PlaneGeometry(9.6, 6.4)), midnightMat);
  leftCeil.rotation.x = Math.PI / 2;
  leftCeil.position.set(-8.0, ROOM_H, -0.8);
  ceilingGroup.add(leftCeil);

  const rightCeil = new THREE.Mesh(prepGeo(new THREE.PlaneGeometry(9.6, 6.4)), midnightMat);
  rightCeil.rotation.x = Math.PI / 2;
  rightCeil.position.set(8.0, ROOM_H, -0.8);
  ceilingGroup.add(rightCeil);

  // Khung giếng trời bát giác trung tâm trên tượng Lý Thường Kiệt (Z = -1.2)
  const oculusRim = new THREE.Mesh(prepGeo(new THREE.TorusGeometry(2.35, 0.16, 10, 8)), goldMat);
  oculusRim.rotation.x = Math.PI / 2;
  oculusRim.position.set(0, ROOM_H - 0.06, -1.2);
  ceilingGroup.add(oculusRim);
  interiorGroup.add(ceilingGroup);

  // Tường 2 bên & Tường hậu chạm phù điêu Normal Map (LinearSRGBColorSpace)
  const leftWall = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(0.5, ROOM_H + 1.4, 26.8)), wallReliefMat);
  leftWall.position.set(-12.1, (ROOM_H + 1.4) * 0.5, 0.5);
  interiorGroup.add(leftWall);

  const rightWall = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(0.5, ROOM_H + 1.4, 26.8)), wallReliefMat);
  rightWall.position.set(12.1, (ROOM_H + 1.4) * 0.5, 0.5);
  interiorGroup.add(rightWall);

  const backWall = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(25.4, ROOM_H + 1.6, 0.6)), wallReliefMat);
  backWall.position.set(0, (ROOM_H + 1.6) * 0.5, -12.45);
  interiorGroup.add(backWall);

  // Phào chỉ vàng & Sóng Thủy Ba chạy dọc 2 bên tường
  [-11.8, 11.8].forEach((wx) => {
    const trim = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(0.18, 0.24, 26.2)), goldMat);
    trim.position.set(wx, ROOM_H - 0.25, 0.5);
    interiorGroup.add(trim);
  });

  // Mặt tiền cửa vòm cao chuẩn 4.6m, rộng 6.2m khớp khe thông thủy hành lang Tầng 2
  const frontPierL = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(9.6, ROOM_H + 1.4, 0.36)), wallReliefMat);
  frontPierL.position.set(-8.0, (ROOM_H + 1.4) * 0.5, ROOM_D * 0.5 - 0.15);
  interiorGroup.add(frontPierL);

  const frontPierR = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(9.6, ROOM_H + 1.4, 0.36)), wallReliefMat);
  frontPierR.position.set(8.0, (ROOM_H + 1.4) * 0.5, ROOM_D * 0.5 - 0.15);
  interiorGroup.add(frontPierR);

  const frontLintel = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(6.4, ROOM_H + 1.4 - ARCH_H, 0.36)), crimsonMat);
  frontLintel.position.set(0, ARCH_H + (ROOM_H + 1.4 - ARCH_H) * 0.5, ROOM_D * 0.5 - 0.15);
  interiorGroup.add(frontLintel);

  // Cổng Vòm Mái Đao Cong Thời Lý ngay cửa vào (Z = +13.1, cao 4.6m)
  const entranceGate = new THREE.Group();
  entranceGate.name = 'NamQuocSonHa_Ly_Archway_4m6';
  entranceGate.position.set(0, 0, ROOM_D * 0.5 - 0.55);

  [-3.25, 3.25].forEach((gx) => {
    const plinth = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.42, 0.50, 0.32, 8)), stoneMat);
    plinth.position.set(gx, 0.16, 0);
    entranceGate.add(plinth);
    const post = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.28, 0.32, ARCH_H + 0.15, 14)), crimsonMat);
    post.position.set(gx, (ARCH_H + 0.15) * 0.5 + 0.18, 0);
    entranceGate.add(post);
    const collar = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.35, 0.35, 0.20, 14)), goldMat);
    collar.position.set(gx, ARCH_H - 0.1, 0);
    entranceGate.add(collar);
    solidObstacleObjects.push(post);
  });

  const gateBeam = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(7.6, 0.45, 0.65)), crimsonMat);
  gateBeam.position.set(0, ARCH_H + 0.25, 0);
  entranceGate.add(gateBeam);

  // Mái đao cong thời Lý vút lên hai bên cửa vòm
  const gateEave = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(8.4, 0.18, 1.45)), limWoodMat);
  gateEave.position.set(0, ARCH_H + 0.62, 0);
  entranceGate.add(gateEave);
  [-4.2, 4.2].forEach((hx) => {
    const horn = new THREE.Mesh(prepGeo(new THREE.ConeGeometry(0.24, 1.1, 8)), goldMat);
    horn.position.set(hx, ARCH_H + 0.92, 0);
    horn.rotation.z = hx < 0 ? 0.72 : -0.72;
    entranceGate.add(horn);
  });

  // Hoành phi & Phù điêu Rồng Thời Lý + Sóng Thủy Ba (ExtrudeGeometry) trên cửa vòm
  const gateDragon = createLyDynastyDragonRelief3D({ scale: 0.9, color: PALETTE.gold, material: goldMat });
  gateDragon.position.set(0, ARCH_H + 0.95, -0.35);
  gateDragon.rotation.y = Math.PI;
  entranceGate.add(gateDragon);

  const gateSignTex = createPlaqueTexture(
    'NAM QUỐC SƠN HÀ • LÝ THƯỜNG KIỆT',
    'Bản Tuyên Ngôn Độc Lập Đầu Tiên & Chiến Tuyến Sông Như Nguyệt (1077)',
    { width: 1024, height: 190 },
    disposables
  );
  const gateSign = new THREE.Mesh(
    prepGeo(new THREE.PlaneGeometry(4.8, 0.88)),
    new THREE.MeshStandardMaterial({ map: gateSignTex, roughness: 0.4, metalness: 0.25 })
  );
  gateSign.position.set(0, ARCH_H + 0.28, -0.36);
  gateSign.rotation.y = Math.PI;
  entranceGate.add(gateSign);
  interiorGroup.add(entranceGate);

  // Hàng cột gỗ sơn son thếp vàng (InstancedMesh) dọc hai bên phòng
  const pillarCoords = [
    [-9.8, 9.6], [-9.8, 3.6], [-9.8, -2.4], [-9.8, -8.4],
    [9.8, 9.6], [9.8, 3.6], [9.8, -2.4], [9.8, -8.4]
  ];
  const colGeo = prepGeo(new THREE.CylinderGeometry(0.25, 0.29, ROOM_H - 0.35, 14));
  const colBaseGeo = prepGeo(new THREE.CylinderGeometry(0.42, 0.48, 0.32, 8));
  const colRingGeo = prepGeo(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 14));

  const instCols = new THREE.InstancedMesh(colGeo, crimsonMat, pillarCoords.length);
  const instColBases = new THREE.InstancedMesh(colBaseGeo, stoneMat, pillarCoords.length);
  const instColRings = new THREE.InstancedMesh(colRingGeo, goldMat, pillarCoords.length * 2);
  const dummy = new THREE.Object3D();

  pillarCoords.forEach(([px, pz], idx) => {
    dummy.position.set(px, (ROOM_H - 0.35) * 0.5 + 0.25, pz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    instCols.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(px, 0.16, pz);
    dummy.updateMatrix();
    instColBases.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(px, 1.4, pz);
    dummy.updateMatrix();
    instColRings.setMatrixAt(idx * 2, dummy.matrix);

    dummy.position.set(px, ROOM_H - 0.9, pz);
    dummy.updateMatrix();
    instColRings.setMatrixAt(idx * 2 + 1, dummy.matrix);

    // Collider proxy cho cột
    const colProxy = new THREE.Mesh(
      prepGeo(new THREE.BoxGeometry(0.8, 4.0, 0.8)),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    colProxy.position.set(px, 2.0, pz);
    interiorGroup.add(colProxy);
    solidObstacleObjects.push(colProxy);
  });
  instCols.instanceMatrix.needsUpdate = true;
  instColBases.instanceMatrix.needsUpdate = true;
  instColRings.instanceMatrix.needsUpdate = true;
  interiorGroup.add(instCols, instColBases, instColRings);

  // =========================================================================
  // 2. PHÂN KHU TRUNG TÂM: BỆ ĐÁ HOA SEN & TƯỢNG LYTHUONGKIET.GLB (3.0M)
  // =========================================================================
  const statueStation = new THREE.Group();
  statueStation.name = 'Station_LyThuongKiet_Center';
  statueStation.position.set(0, 0, -1.2);
  interiorGroup.add(statueStation);

  // Vòng Mandala hoa sen dưới nền
  const mandalaFloor = new THREE.Mesh(
    prepGeo(new THREE.PlaneGeometry(7.2, 7.2)),
    new THREE.MeshBasicMaterial({
      map: textures.mandalaTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  mandalaFloor.rotation.x = -Math.PI / 2;
  mandalaFloor.position.y = 0.055;
  mandalaFloor.userData.ignoreRaycaster = true;
  statueStation.add(mandalaFloor);

  // Bệ đá hoa sen 3 tầng bát giác
  const tier1 = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(2.35, 2.58, 0.42, 8)), stoneMat);
  tier1.position.y = 0.21;
  statueStation.add(tier1);
  const tier2 = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(1.75, 1.95, 0.52, 8)), crimsonMat);
  tier2.position.y = 0.68;
  statueStation.add(tier2);
  const tier3 = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(1.42, 1.56, 0.42, 8)), stoneMat);
  tier3.position.y = 1.15;
  statueStation.add(tier3);

  // 16 Cánh sen vàng thời Lý ôm quanh đài tượng (InstancedMesh)
  const petalGeo = prepGeo(new THREE.ConeGeometry(0.26, 0.52, 5));
  petalGeo.scale(1.0, 1.0, 0.34);
  const lotusPetals = new THREE.InstancedMesh(petalGeo, goldMat, 16);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    dummy.position.set(Math.cos(a) * 1.50, 1.16, Math.sin(a) * 1.50);
    dummy.rotation.set(0, -a + Math.PI / 2, -0.42);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    lotusPetals.setMatrixAt(i, dummy.matrix);
  }
  lotusPetals.instanceMatrix.needsUpdate = true;
  statueStation.add(lotusPetals);

  // Phù điêu Rồng thời Lý & Sóng Thủy Ba (ExtrudeGeometry) trên mặt trước bệ tượng
  const plinthWaveFrieze = createLyCloudAndWaveRelief3D({ width: 1.9, color: PALETTE.gold, crimsonAccent: PALETTE.crimson, material: goldMat });
  plinthWaveFrieze.position.set(0, 0.72, 1.72);
  plinthWaveFrieze.scale.setScalar(0.65);
  statueStation.add(plinthWaveFrieze);

  const statuePlaqueTex = createPlaqueTexture(
    'THÁI ÚY LÝ THƯỜNG KIỆT (1019 – 1105)',
    'Tổng Chỉ Huy Phòng Tuyến Sông Như Nguyệt • Khẳng Định Chủ Quyền Đại Việt',
    { width: 840, height: 180 },
    disposables
  );
  const statuePlaque = new THREE.Mesh(
    prepGeo(new THREE.PlaneGeometry(2.1, 0.46)),
    new THREE.MeshStandardMaterial({ map: statuePlaqueTex, roughness: 0.38, metalness: 0.25 })
  );
  statuePlaque.position.set(0, 0.48, 2.02);
  statuePlaque.rotation.x = -0.22;
  statueStation.add(statuePlaque);

  const statueColliderProxy = new THREE.Mesh(
    prepGeo(new THREE.BoxGeometry(4.4, 4.5, 4.4)),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  statueColliderProxy.position.y = 2.25;
  statueStation.add(statueColliderProxy);
  solidObstacleObjects.push(statueColliderProxy);

  // =========================================================================
  // 3. CÁNH TRÁI (X = -6.2, Z = +1.2): "BẢN TUYÊN NGÔN ĐỘC LẬP ĐẦU TIÊN"
  // =========================================================================
  const scrollStation = new THREE.Group();
  scrollStation.name = 'Station_ChieuThu_LeftWing';
  scrollStation.position.set(-6.2, 0, 1.2);
  scrollStation.rotation.y = 0.35; // Hướng nhẹ về trung tâm sảnh phòng
  interiorGroup.add(scrollStation);

  const scrollPed = buildCuratedPedestal({
    width: 1.95,
    depth: 1.25,
    height: 1.02,
    crimsonMat,
    goldMat,
    stoneMat,
    title: 'BẢN TUYÊN NGÔN ĐỘC LẬP ĐẦU TIÊN',
    subtitle: 'Chiếu Thư “Nam Quốc Sơn Hà” (1077)',
    disposables
  });
  scrollStation.add(scrollPed);
  solidObstacleObjects.push(scrollPed);

  // Tranh tường Chiếu Lụa + Phù điêu Rồng Thời Lý ở cánh trái (X = -11.75)
  const muralTex = createPoetryMuralTexture(disposables);
  const leftMural = new THREE.Mesh(
    prepGeo(new THREE.PlaneGeometry(6.8, 4.2)),
    new THREE.MeshStandardMaterial({ map: muralTex, roughness: 0.42, emissive: 0x261504, emissiveIntensity: 0.25 })
  );
  leftMural.position.set(-11.75, 4.1, 1.2);
  leftMural.rotation.y = Math.PI / 2;
  interiorGroup.add(leftMural);

  const leftDragonRelief = createLyDynastyDragonRelief3D({ scale: 1.15, color: PALETTE.gold, material: goldMat });
  leftDragonRelief.position.set(-11.7, 6.8, 1.2);
  leftDragonRelief.rotation.y = Math.PI / 2;
  interiorGroup.add(leftDragonRelief);

  // =========================================================================
  // 4. CÁNH PHẢI (X = +6.2): "CHIẾN TUYẾN NHƯ NGUYỆT" (SA BÀN & BINH KHÍ)
  // =========================================================================
  const rightHeaderTex = createPlaqueTexture(
    'CHIẾN TUYẾN SÔNG NHƯ NGUYỆT (1077)',
    'Phòng Tuyến Cọc Gỗ, Chiến Thuyền Đại Việt & Binh Khí Triều Lý',
    { width: 920, height: 185 },
    disposables
  );
  const rightHeader = new THREE.Mesh(
    prepGeo(new THREE.PlaneGeometry(6.4, 1.28)),
    new THREE.MeshStandardMaterial({ map: rightHeaderTex, roughness: 0.42 })
  );
  rightHeader.position.set(11.75, 5.2, 0.4);
  rightHeader.rotation.y = -Math.PI / 2;
  interiorGroup.add(rightHeader);

  const rightDragonRelief = createLyDynastyDragonRelief3D({ scale: 1.15, color: PALETTE.gold, material: goldMat, mirrorX: true });
  rightDragonRelief.position.set(11.7, 6.75, 0.4);
  rightDragonRelief.rotation.y = -Math.PI / 2;
  interiorGroup.add(rightDragonRelief);

  // 4A. Sa bàn chiến thuật sông Như Nguyệt (sa_ban_nhu_nguyet.glb)
  const saBanStation = new THREE.Group();
  saBanStation.name = 'Station_SaBan_NhuNguyet';
  saBanStation.position.set(6.2, 0, 2.8);
  saBanStation.rotation.y = -0.38;
  interiorGroup.add(saBanStation);

  const saBanPed = buildCuratedPedestal({
    width: 2.35,
    depth: 1.65,
    height: 0.96,
    crimsonMat,
    goldMat,
    stoneMat,
    title: 'SA BÀN CHIẾN TUYẾN NHƯ NGUYỆT',
    subtitle: 'Bố trận Cọc Gỗ, Chiến Thuyền & Lũy Đất Bờ Nam',
    disposables
  });
  saBanStation.add(saBanPed);
  solidObstacleObjects.push(saBanPed);

  // 4B. Giá vũ khí nhà Lý & Trống trận (vu_khi_nha_ly.glb)
  const weaponStation = new THREE.Group();
  weaponStation.name = 'Station_VuKhi_NhaLy';
  weaponStation.position.set(6.2, 0, -2.4);
  weaponStation.rotation.y = -0.45;
  interiorGroup.add(weaponStation);

  const weaponPed = buildCuratedPedestal({
    width: 2.2,
    depth: 1.25,
    height: 0.92,
    crimsonMat,
    goldMat,
    stoneMat,
    title: 'BINH KHÍ TRIỀU LÝ & TRỐNG TRẬN',
    subtitle: 'Trường Đao, Giáo Mác, Khiên Mây Hổ Phù',
    disposables
  });
  weaponStation.add(weaponPed);
  solidObstacleObjects.push(weaponPed);

  // =========================================================================
  // 5. CHI TIẾT MÔI TRƯỜNG BẰNG INSTANCEDMESH (GIÁO, CỜ CHỮ "LÝ", ĐUỐC, CỌC)
  // =========================================================================
  // 5.1 Cờ đại chữ "Lý" dọc 2 hàng cột (6 lá cờ)
  const flagLocations = [
    [-8.9, 6.6, 0.25], [-8.9, -0.4, 0.25], [-8.9, -6.4, 0.25],
    [8.9, 6.6, Math.PI - 0.25], [8.9, -0.4, Math.PI - 0.25], [8.9, -6.4, Math.PI - 0.25]
  ];
  const instRoomPoles = new THREE.InstancedMesh(prepGeo(new THREE.CylinderGeometry(0.05, 0.065, 5.2, 8)), goldMat, flagLocations.length);
  const instRoomFlags = new THREE.InstancedMesh(prepGeo(new THREE.PlaneGeometry(1.45, 2.75, 4, 1)), bannerMat, flagLocations.length);
  instRoomPoles.userData.ignoreRaycaster = true;
  instRoomFlags.userData.ignoreRaycaster = true;

  flagLocations.forEach(([fx, fz, ry], i) => {
    dummy.position.set(fx, 2.6, fz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    instRoomPoles.setMatrixAt(i, dummy.matrix);

    const sideSign = fx < 0 ? 1 : -1;
    dummy.position.set(fx + sideSign * 0.78, 3.65, fz);
    dummy.rotation.set(0, ry, 0);
    dummy.updateMatrix();
    instRoomFlags.setMatrixAt(i, dummy.matrix);
  });
  instRoomPoles.instanceMatrix.needsUpdate = true;
  instRoomFlags.instanceMatrix.needsUpdate = true;
  interiorGroup.add(instRoomPoles, instRoomFlags);

  // 5.2 Ngọn giáo dựng dọc 2 hành lang trong phòng (16 cây giáo bằng InstancedMesh)
  const roomSpearsCount = 16;
  const instRoomSpearShafts = new THREE.InstancedMesh(prepGeo(new THREE.CylinderGeometry(0.03, 0.036, 3.0, 6)), limWoodMat, roomSpearsCount);
  const instRoomSpearTips = new THREE.InstancedMesh(prepGeo(new THREE.ConeGeometry(0.07, 0.38, 6)), steelMat, roomSpearsCount);
  instRoomSpearShafts.userData.ignoreRaycaster = true;
  instRoomSpearTips.userData.ignoreRaycaster = true;

  for (let i = 0; i < roomSpearsCount; i++) {
    const isLeft = i < 8;
    const x = isLeft ? -10.8 : 10.8;
    const z = -6.8 + (i % 8) * 2.1;
    dummy.position.set(x, 1.5, z);
    dummy.rotation.set(0, 0, isLeft ? -0.06 : 0.06);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    instRoomSpearShafts.setMatrixAt(i, dummy.matrix);

    dummy.position.set(x + (isLeft ? 0.09 : -0.09), 3.15, z);
    dummy.updateMatrix();
    instRoomSpearTips.setMatrixAt(i, dummy.matrix);
  }
  instRoomSpearShafts.instanceMatrix.needsUpdate = true;
  instRoomSpearTips.instanceMatrix.needsUpdate = true;
  interiorGroup.add(instRoomSpearShafts, instRoomSpearTips);

  // 5.3 Đuốc lửa treo cột & Giá đuốc dọc lối đi tới Cổng Dịch Chuyển (8 đuốc InstancedMesh)
  const torchPositions = [
    [-3.6, 8.8], [3.6, 8.8], [-3.6, 3.0], [3.6, 3.0],
    [-3.6, -4.8], [3.6, -4.8], [-3.6, -9.2], [3.6, -9.2]
  ];
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffa63d });
  const instTorches = new THREE.InstancedMesh(prepGeo(new THREE.CylinderGeometry(0.06, 0.10, 1.85, 8)), limWoodMat, torchPositions.length);
  const instTorchBowls = new THREE.InstancedMesh(prepGeo(new THREE.CylinderGeometry(0.18, 0.10, 0.24, 10)), goldMat, torchPositions.length);
  const instTorchFlames = new THREE.InstancedMesh(prepGeo(new THREE.ConeGeometry(0.16, 0.42, 8)), flameMat, torchPositions.length);
  instTorches.userData.ignoreRaycaster = true;
  instTorchBowls.userData.ignoreRaycaster = true;
  instTorchFlames.userData.ignoreRaycaster = true;

  torchPositions.forEach(([tx, tz], i) => {
    dummy.position.set(tx, 0.92, tz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    instTorches.setMatrixAt(i, dummy.matrix);

    dummy.position.set(tx, 1.92, tz);
    dummy.updateMatrix();
    instTorchBowls.setMatrixAt(i, dummy.matrix);

    dummy.position.set(tx, 2.22, tz);
    dummy.updateMatrix();
    instTorchFlames.setMatrixAt(i, dummy.matrix);
  });
  instTorches.instanceMatrix.needsUpdate = true;
  instTorchBowls.instanceMatrix.needsUpdate = true;
  instTorchFlames.instanceMatrix.needsUpdate = true;
  interiorGroup.add(instTorches, instTorchBowls, instTorchFlames);

  // 5.4 Hàng rào cọc gỗ phòng tuyến hai bên lối vào Cổng Dịch Chuyển (16 cọc InstancedMesh)
  const stakeCount = 16;
  const instStakes = new THREE.InstancedMesh(prepGeo(new THREE.ConeGeometry(0.12, 1.75, 6)), limWoodMat, stakeCount);
  instStakes.userData.ignoreRaycaster = true;
  for (let i = 0; i < stakeCount; i++) {
    const isLeft = i < 8;
    const idx = i % 8;
    const sx = (isLeft ? -4.8 : 4.8) + (isLeft ? -idx * 0.45 : idx * 0.45);
    const sz = -7.8 - (idx % 2) * 1.1;
    dummy.position.set(sx, 0.72, sz);
    dummy.rotation.set(-0.35, 0, isLeft ? -0.18 : 0.18);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    instStakes.setMatrixAt(i, dummy.matrix);
  }
  instStakes.instanceMatrix.needsUpdate = true;
  interiorGroup.add(instStakes);

  // =========================================================================
  // 6. ÁNH SÁNG HÀO KHÍ & VOLUMETRIC GOD RAYS (ADDITIVEBLENDING)
  // =========================================================================
  const roomAmbient = new THREE.AmbientLight(0x283554, 0.55);
  interiorGroup.add(roomAmbient);

  // Spotlight chiếu tượng Lý Thường Kiệt (tắt shadow)
  const heroSpot = new THREE.SpotLight(0xffe19c, 7.2, 18.0, Math.PI / 4.2, 0.55, 1.2);
  heroSpot.position.set(0, 8.2, -0.8);
  heroSpot.target.position.set(0, 2.2, -1.2);
  heroSpot.castShadow = false;
  interiorGroup.add(heroSpot, heroSpot.target);

  // PointLights cho Cánh Trái (Chiếu Thư), Cánh Phải (Sa Bàn & Vũ Khí), Cổng Vào
  const scrollLight = new THREE.PointLight(0xf6c95e, 5.2, 13.0, 1.45);
  scrollLight.position.set(-6.2, 4.8, 1.2);
  interiorGroup.add(scrollLight);

  const tacticalLight = new THREE.PointLight(0xf59e0b, 5.2, 15.0, 1.45);
  tacticalLight.position.set(6.2, 4.6, 0.4);
  interiorGroup.add(tacticalLight);

  const rimBackLight = new THREE.PointLight(0x38bdf8, 3.2, 16.0, 1.5);
  rimBackLight.position.set(0, 4.2, -6.2);
  interiorGroup.add(rimBackLight);

  // Volumetric God Ray #1: Xuống thẳng tượng lythuongkiet.glb (0, -1.2)
  const godRayMatMain = new THREE.MeshBasicMaterial({
    color: PALETTE.godRayGold,
    map: textures.godRayTex,
    transparent: true,
    opacity: 0.36,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const godRayStatue = new THREE.Mesh(
    prepGeo(new THREE.CylinderGeometry(0.95, 2.55, 7.6, 24, 1, true)),
    godRayMatMain
  );
  godRayStatue.position.set(0, 4.6, -1.2);
  godRayStatue.userData.ignoreRaycaster = true;
  interiorGroup.add(godRayStatue);

  // Volumetric God Ray #2: Xuống thẳng cuộn chiếu thư chieu_thu_nam_quoc.glb (-6.2, +1.2)
  const godRayMatScroll = new THREE.MeshBasicMaterial({
    color: 0xffd666,
    map: textures.godRayTex,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const godRayScroll = new THREE.Mesh(
    prepGeo(new THREE.CylinderGeometry(0.65, 1.85, 7.2, 20, 1, true)),
    godRayMatScroll
  );
  godRayScroll.position.set(-6.2, 4.5, 1.2);
  godRayScroll.userData.ignoreRaycaster = true;
  interiorGroup.add(godRayScroll);

  // =========================================================================
  // 7. HIỆU ỨNG HẠT THREE.POINTS (TÀN LỬA CHIẾN TRẬN & BỤI VÀNG THIÊN THƯ)
  // =========================================================================
  const ptRng = createSeededRandom(2026);
  const emberCount = 190;
  const emberPos = new Float32Array(emberCount * 3);
  const emberPhases = new Float32Array(emberCount);
  for (let i = 0; i < emberCount; i++) {
    emberPos[i * 3] = (ptRng() - 0.5) * 20.0;
    emberPos[i * 3 + 1] = 0.6 + ptRng() * 7.2;
    emberPos[i * 3 + 2] = (ptRng() - 0.5) * 21.0;
    emberPhases[i] = ptRng() * Math.PI * 2;
  }
  const emberGeo = prepGeo(new THREE.BufferGeometry());
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  const emberMat = new THREE.PointsMaterial({
    color: 0xffb347,
    size: 0.16,
    map: textures.particleTex,
    transparent: true,
    opacity: 0.82,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const emberPoints = new THREE.Points(emberGeo, emberMat);
  emberPoints.name = 'NamQuocSonHa_BattleEmbers';
  emberPoints.userData.ignoreRaycaster = true;
  interiorGroup.add(emberPoints);

  // =========================================================================
  // 8. NẠP & CHUẨN HÓA MÔ HÌNH GLB (LYTHUONGKIET.GLB & 3 HIỆN VẬT BLENDER)
  // =========================================================================
  const exhibitConfigs = [
    {
      key: 'nqsh_lyThuongKiet',
      urls: ['/models/lythuongkiet.glb', '/model/lythuongkiet.glb'],
      parentStation: statueStation,
      mountY: 1.36,
      targetHeight: 3.0, // Chuẩn hóa chính xác 3.0m, tâm đáy Y = 0
      rotY: 0.0,
      fallbackFn: () => buildStatueFallback(goldMat, crimsonMat),
      focusLocalPos: [0.0, 2.7, 4.6],
      focusLocalTarget: [0.0, 2.6, -1.2],
      soundTheme: 'nqsh_temple_poem',
      soundOptions: { refDistance: 6.5, maxDistance: 22, volume: 0.42 },
      hitboxPadding: 0.22
    },
    {
      key: 'nqsh_chieuThu',
      urls: ['/models/namquocsonha/chieu_thu_nam_quoc.glb'],
      parentStation: scrollStation,
      mountY: 1.02,
      targetHeight: 0.98,
      rotY: 0.0,
      fallbackFn: () => buildChieuThuFallback(goldMat, crimsonMat),
      focusLocalPos: [-2.8, 2.2, 4.2],
      focusLocalTarget: [-6.2, 1.45, 1.2],
      soundTheme: null,
      hitboxPadding: 0.22
    },
    {
      key: 'nqsh_saBan',
      urls: ['/models/namquocsonha/sa_ban_nhu_nguyet.glb'],
      parentStation: saBanStation,
      mountY: 0.96,
      targetHeight: 0.62,
      rotY: 0.0,
      fallbackFn: () => buildSaBanFallback(crimsonMat, goldMat, midnightMat),
      focusLocalPos: [2.6, 2.35, 5.4],
      focusLocalTarget: [6.2, 1.3, 2.8],
      soundTheme: null,
      hitboxPadding: 0.24
    },
    {
      key: 'nqsh_vuKhi',
      urls: ['/models/namquocsonha/vu_khi_nha_ly.glb'],
      parentStation: weaponStation,
      mountY: 0.92,
      targetHeight: 1.85,
      rotY: 0.0,
      fallbackFn: () => buildVuKhiFallback(crimsonMat, goldMat),
      focusLocalPos: [2.6, 2.3, 0.2],
      focusLocalTarget: [6.2, 1.75, -2.4],
      soundTheme: 'nqsh_war_drum',
      soundOptions: { refDistance: 5.5, maxDistance: 18, volume: 0.36 },
      hitboxPadding: 0.22
    }
  ];

  const loadedArtifacts = new Map();
  let wiredManagers = {
    hitboxManager: null,
    loreGuide: null,
    spatialAudio: null,
    cameraManager: cameraManager || null
  };

  function bindExhibitInteractions(cfg, modelGroup) {
    const { hitboxManager, loreGuide, spatialAudio } = wiredManagers;
    roomGroup.updateMatrixWorld(true);

    const focusCallback = () => {
      const camMgr = wiredManagers.cameraManager || window.__museumCameraManager;
      if (!camMgr?.setView) return;
      const worldPos = localToWorldVec(interiorGroup, ...cfg.focusLocalPos);
      const worldTgt = localToWorldVec(interiorGroup, ...cfg.focusLocalTarget);
      camMgr.setView({ position: worldPos, target: worldTgt }, true);
    };

    const loreTarget = loreGuide || (typeof window !== 'undefined' ? window.__loreGuide : null);
    if (loreTarget?.registerArtifact) {
      loreTarget.registerArtifact(modelGroup, cfg.key);
    }

    if (hitboxManager?.createTightClickHitbox) {
      const prevProxy = modelGroup.userData?.clickProxyHitbox;
      if (prevProxy && loreTarget?.interactiveArtifacts) {
        const prevIdx = loreTarget.interactiveArtifacts.indexOf(prevProxy);
        if (prevIdx !== -1) loreTarget.interactiveArtifacts.splice(prevIdx, 1);
      }
      const proxy = hitboxManager.createTightClickHitbox(modelGroup, {
        loreKey: cfg.key,
        padding: Math.max(cfg.hitboxPadding || 0.20, 0.24),
        minSize: 0.95
      });
      if (proxy) {
        proxy.userData.onFocusCamera = focusCallback;
      }
    }
    modelGroup.userData.onFocusCamera = focusCallback;

    const audioTarget = spatialAudio || (typeof window !== 'undefined' ? window.__spatialAudio : null);
    if (audioTarget?.attachPositionalSound && cfg.soundTheme) {
      audioTarget.detachPositionalSound?.(`room_${cfg.key}`);
      audioTarget.attachPositionalSound(`room_${cfg.key}`, modelGroup, {
        fallbackTheme: cfg.soundTheme,
        ...(cfg.soundOptions || {})
      });
    }
  }

  exhibitConfigs.forEach((cfg) => {
    const holder = new THREE.Group();
    holder.name = `NQSH_Artifact_${cfg.key}`;
    holder.position.y = cfg.mountY;
    holder.rotation.y = cfg.rotY;
    cfg.parentStation.add(holder);

    // Gắn Procedural Fallback Mesh trước để không bao giờ trống cảnh khi đang tải
    const fallbackMesh = cfg.fallbackFn();
    holder.add(fallbackMesh);
    loadedArtifacts.set(cfg.key, holder);

    loadGlbCached(cfg.urls, {
      targetHeight: cfg.targetHeight,
      maxTextureSize: 1024,
      disableMipmaps: true
    })
      .then((rawScene) => {
        if (!rawScene) throw new Error('Empty GLB scene');
        holder.remove(fallbackMesh);
        fallbackMesh.traverse((o) => {
          o.geometry?.dispose?.();
          o.material?.dispose?.();
        });
        rawScene.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = false;
            c.receiveShadow = false;
            c.frustumCulled = true;
            c.userData.isSharedCachedAsset = true;
          }
        });
        holder.add(rawScene);
        loadedArtifacts.set(cfg.key, holder);

        if (wiredManagers.hitboxManager || wiredManagers.loreGuide || wiredManagers.spatialAudio) {
          bindExhibitInteractions(cfg, holder);
        }
      })
      .catch(() => {
        if (wiredManagers.hitboxManager || wiredManagers.loreGuide || wiredManagers.spatialAudio) {
          bindExhibitInteractions(cfg, holder);
        }
      });
  });

  // =========================================================================
  // 9. ĐĂNG KÝ HITBOX, LORE, AUDIO & SƯƠNG MÙ CỤC BỘ XANH ĐÊM HUYỀN BÍ
  // =========================================================================
  function registerHitboxes(hitboxManager) {
    const hbm = hitboxManager || window.__museumHitboxManager;
    if (!hbm) return;
    wiredManagers.hitboxManager = hbm;

    roomGroup.updateMatrixWorld(true);
    solidObstacleObjects.forEach((obj, idx) => {
      hbm.registerSolidObjectCollider(obj, {
        shrinkFactor: 0.96,
        tag: `NQSH_Solid_${idx}`,
        helperColor: 0x22c55e,
        realm: 'museum'
      });
    });

    exhibitConfigs.forEach((cfg) => {
      const holder = loadedArtifacts.get(cfg.key);
      if (holder) bindExhibitInteractions(cfg, holder);
    });
  }

  function wireInteractiveSystems({ hitboxManager, loreGuide, spatialAudio, cameraManager: camMgr } = {}) {
    if (hitboxManager) wiredManagers.hitboxManager = hitboxManager;
    if (loreGuide) wiredManagers.loreGuide = loreGuide;
    if (spatialAudio) wiredManagers.spatialAudio = spatialAudio;
    if (camMgr) wiredManagers.cameraManager = camMgr;
    registerHitboxes(wiredManagers.hitboxManager);
  }

  let fogBlend = 0;
  let capturedOriginals = false;
  let savedFogColor = new THREE.Color(0xdca878);
  let savedFogDensity = 0.00075;
  const savedAtriumLights = [];
  const midnightFogColor = new THREE.Color(PALETTE.midnightBlue);

  function captureAtriumState() {
    if (capturedOriginals || !mainScene) return;
    capturedOriginals = true;
    if (mainScene.fog && mainScene.fog.isFogExp2) {
      savedFogColor.copy(mainScene.fog.color);
      savedFogDensity = mainScene.fog.density;
    }
    mainScene.traverse((obj) => {
      if (!obj.isLight) return;
      let cur = obj;
      while (cur) {
        if (cur === roomGroup) return;
        cur = cur.parent;
      }
      savedAtriumLights.push({ light: obj, baseIntensity: obj.intensity });
    });
  }

  function isInsideNqshRoom(camPos) {
    if (!camPos) return false;
    return (
      camPos.x >= -62.5 &&
      camPos.x <= -34.15 &&
      camPos.y >= 9.2 &&
      camPos.y <= 19.2 &&
      camPos.z >= -32.4 &&
      camPos.z <= -5.6
    );
  }

  function updateAtmosphere(delta, camera) {
    if (!mainScene || !camera) return;
    const inside = isInsideNqshRoom(camera.position);
    if (inside && !capturedOriginals) captureAtriumState();

    const target = inside ? 1 : 0;
    const step = Math.min(1, Math.max(0.05, delta * 3.8));
    const prevBlend = fogBlend;
    fogBlend += (target - fogBlend) * step;

    if (Math.abs(fogBlend - prevBlend) > 0.0005 || inside) {
      if (!mainScene.fog || !mainScene.fog.isFogExp2) {
        mainScene.fog = new THREE.FogExp2(savedFogColor.getHex(), savedFogDensity);
      }
      mainScene.fog.color.copy(savedFogColor).lerp(midnightFogColor, fogBlend);
      mainScene.fog.density = savedFogDensity + (0.0115 - savedFogDensity) * fogBlend;

      const lightScale = 1 - fogBlend * 0.65;
      for (let i = 0; i < savedAtriumLights.length; i++) {
        const entry = savedAtriumLights[i];
        entry.light.intensity = entry.baseIntensity * lightScale;
      }
    } else if (!inside && prevBlend > 0 && fogBlend <= 0.001) {
      fogBlend = 0;
      if (mainScene.fog && mainScene.fog.isFogExp2) {
        mainScene.fog.color.copy(savedFogColor);
        mainScene.fog.density = savedFogDensity;
      }
      for (let i = 0; i < savedAtriumLights.length; i++) {
        const entry = savedAtriumLights[i];
        entry.light.intensity = entry.baseIntensity;
      }
    }
  }

  const _animDummy = new THREE.Object3D();
  const ROOM_PROXIMITY_SQ = 42 * 42;

  function update(delta = 0.016, elapsedTime = 0, camera = null) {
    if (!roomGroup.visible) return;
    const dt = Math.min(delta, 0.05);

    if (camera?.position) {
      const inside = isInsideNqshRoom(camera.position);
      if (!inside && camera.position.distanceToSquared(roomGroup.position) > ROOM_PROXIMITY_SQ) {
        if (fogBlend > 0) {
          updateAtmosphere(dt, camera);
        }
        return;
      }
    }

    // 1. Nhịp thở Volumetric God Rays
    godRayMatMain.opacity = 0.33 + Math.sin(elapsedTime * 1.5) * 0.05;
    godRayMatScroll.opacity = 0.25 + Math.cos(elapsedTime * 1.3) * 0.04;

    // 2. Cờ đại chữ "Lý" rung nhẹ & Ngọn đuốc lập lòe
    flagLocations.forEach(([fx, fz, ry], i) => {
      const sideSign = fx < 0 ? 1 : -1;
      const sway = Math.sin(elapsedTime * 2.4 + i * 1.3) * 0.08;
      _animDummy.position.set(fx + sideSign * 0.78, 3.65, fz);
      _animDummy.rotation.set(0, ry + sway, 0);
      _animDummy.scale.set(1, 1, 1);
      _animDummy.updateMatrix();
      instRoomFlags.setMatrixAt(i, _animDummy.matrix);
    });
    instRoomFlags.instanceMatrix.needsUpdate = true;

    torchPositions.forEach(([tx, tz], i) => {
      const f = 0.88 + Math.sin(elapsedTime * 12.0 + i * 1.9) * 0.18;
      _animDummy.position.set(tx, 2.22, tz);
      _animDummy.rotation.set(0, elapsedTime * 1.8, 0);
      _animDummy.scale.set(1.0, f, 1.0);
      _animDummy.updateMatrix();
      instTorchFlames.setMatrixAt(i, _animDummy.matrix);
    });
    instTorchFlames.instanceMatrix.needsUpdate = true;

    // 3. Tàn lửa chiến trận bay lên trong phòng
    const eAttr = emberGeo.attributes.position;
    const eArr = eAttr.array;
    for (let i = 0; i < emberCount; i++) {
      const i3 = i * 3;
      const ph = emberPhases[i];
      eArr[i3] += Math.sin(elapsedTime * 0.8 + ph) * 0.004;
      eArr[i3 + 1] += dt * 0.72;
      if (eArr[i3 + 1] > 8.1) {
        eArr[i3 + 1] = 0.55;
      }
    }
    eAttr.needsUpdate = true;

    // 4. Điều tiết ánh sáng & sương mù xanh đêm cục bộ
    updateAtmosphere(dt, camera);
  }

  // =========================================================================
  // 10. KẾT NỐI CỔNG DỊCH CHUYỂN & CÕI NGOẠI CẢNH SÔNG NHƯ NGUYỆT
  // =========================================================================
  const realmController = createNamQuocSonHaStoryRealm({
    roomGroup,
    interiorGroup,
    mainScene,
    realmScene,
    cameraManager
  });

  function dispose() {
    if (capturedOriginals && mainScene?.fog?.isFogExp2) {
      mainScene.fog.color.copy(savedFogColor);
      mainScene.fog.density = savedFogDensity;
      savedAtriumLights.forEach((e) => {
        e.light.intensity = e.baseIntensity;
      });
    }
    realmController.dispose?.();
    const matSet = new Set();
    roomGroup.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => matSet.add(m));
      }
    });
    matSet.forEach((m) => m.dispose());
    disposables.forEach((tex) => tex.dispose?.());
  }

  const updateRoomAndPortal = (delta = 0.016, elapsedTime = 0, camera = null) => {
    update(delta, elapsedTime, camera);
    realmController.updateMuseumPortal(delta, elapsedTime, camera);
  };

  roomGroup.enterRealm = realmController.enterRealm;
  roomGroup.exitRealm = realmController.exitRealm;
  roomGroup.updateRealm = realmController.updateRealm;
  roomGroup.startFullAutoTour = realmController.startFullAutoTour;
  roomGroup.startRealmTour = realmController.startRealmOnlyTour;
  roomGroup.stopAutoTour = realmController.stopAutoTour;
  roomGroup.isInsideRealm = realmController.isInsideRealm;
  roomGroup.teleportBook = realmController.portalClickProxy;
  roomGroup.update = updateRoomAndPortal;
  roomGroup.getGroup = () => roomGroup;
  roomGroup.setupContext = (ctx = {}) => {
    realmController.setupContext(ctx);
    wireInteractiveSystems({
      hitboxManager: ctx.hitboxManager || wiredManagers.hitboxManager,
      loreGuide: ctx.loreGuide || wiredManagers.loreGuide,
      spatialAudio: ctx.spatialAudio || wiredManagers.spatialAudio,
      cameraManager: ctx.cameraManager || wiredManagers.cameraManager
    });
  };

  roomGroup.userData = {
    roomId: 'nam_quoc_son_ha',
    interiorGroup,
    floor,
    realmController,
    update: updateRoomAndPortal,
    registerHitboxes: (hbm) => {
      registerHitboxes(hbm);
      realmController.syncMuseumPortalHitboxes();
    },
    wireInteractiveSystems: (ctx) => {
      wireInteractiveSystems(ctx);
      realmController.setupContext(ctx);
    },
    dispose
  };

  return roomGroup;
}
