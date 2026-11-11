import * as THREE from 'three';
import { loadGlbCached, normalizeModelToHeight as sharedNormalizeModelToHeight } from '../utils/modelLoaderHelper.js';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger.js';
import { createTatDenStoryRealm } from './tatDenStoryRealm.js';

const ROOM_W = 25.6;
const ROOM_D = 27.6;
const ROOM_H = 8.4;

const PALETTE = {
  darkMud: 0x2a1e17,
  ashGrey: 0x1c1c21,
  pitchBlack: 0x050508,
  oilFlame: 0xff9436,
  limWood: 0x1e140e,
  bronzePatina: 0x5c4627,
  mossyGreen: 0x1f2b1a,
  dryThatch: 0x4b3c26,
  godRayWarm: 0xffbe73
};

/**
 * Chuẩn hóa kích thước mô hình 3D theo chiều cao mục tiêu (mặc định 2.8m - 3.2m),
 * căn giữa trục X/Z, đặt đáy khớp sàn (Y = 0), và bảo toàn không gian màu sRGB.
 */
export function normalizeModelToHeight(model, targetHeight = 3.0) {
  if (!model) return null;

  const transmittedMeshes = new Set();
  model.traverse((child) => {
    if (!child.isMesh) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    if (mats.some((mat) => mat?.isMeshPhysicalMaterial && (mat.transmission ?? 0) > 0)) {
      transmittedMeshes.add(child);
    }
  });

  const result = sharedNormalizeModelToHeight(model, targetHeight, {
    maxTextureSize: 1024,
    disableMipmaps: true
  });

  // Giữ độ ấm sáng cho bầu kính đèn dầu sau khi thay KHR_materials_transmission bằng kính nhẹ
  transmittedMeshes.forEach((child) => {
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((mat) => {
      if (mat?.isMeshStandardMaterial && mat.transparent && mat.emissive && mat.emissive.getHex() === 0) {
        mat.emissive.setHex(0x4a2508);
        mat.emissiveIntensity = 0.35;
      }
    });
  });

  return result;
}

/** Deterministic PRNG for repeatable textures, cracks, bamboo groves, and particles */
function createSeededRandom(seed = 1939) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Chuyển canvas bản đồ độ cao (grayscale heightmap) thành procedural Normal Map PBR.
 */
function heightCanvasToNormalTexture(heightCanvas, strength = 2.6, repeatX = 1, repeatY = 1, disposables = []) {
  const w = heightCanvas.width;
  const h = heightCanvas.height;
  const hCtx = heightCanvas.getContext('2d');
  const src = hCtx.getImageData(0, 0, w, h).data;

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
      const hL = sample(x - 1, y);
      const hR = sample(x + 1, y);
      const hU = sample(x, y - 1);
      const hD = sample(x, y + 1);
      let dx = (hL - hR) * strength;
      let dy = (hU - hD) * strength;
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

function makeCanvasTexture(canvas, { repeatX = 1, repeatY = 1, srgb = true, disposables = [] } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  disposables.push(tex);
  return tex;
}

/**
 * Sinh bộ PBR Procedural Textures cho vách đất nứt pha rơm, gỗ mục, đá rêu phong, mái tranh, god rays & hạt bụi.
 */
function createProceduralTextures(disposables) {
  const rng = createSeededRandom(1939);
  const size = 256;

  // 1. Vách đất pha rơm nứt nẻ (#2a1e17) + heightmap
  const mudCanvas = document.createElement('canvas');
  mudCanvas.width = size;
  mudCanvas.height = size;
  const mudCtx = mudCanvas.getContext('2d');
  const mudHCanvas = document.createElement('canvas');
  mudHCanvas.width = size;
  mudHCanvas.height = size;
  const mudHCtx = mudHCanvas.getContext('2d');

  mudCtx.fillStyle = '#2a1e17';
  mudCtx.fillRect(0, 0, size, size);
  mudHCtx.fillStyle = '#909090';
  mudHCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 1600; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const r = 1 + rng() * 5;
    const shade = rng() > 0.5 ? 'rgba(54, 38, 28, 0.28)' : 'rgba(20, 14, 10, 0.32)';
    mudCtx.fillStyle = shade;
    mudCtx.beginPath();
    mudCtx.arc(x, y, r, 0, Math.PI * 2);
    mudCtx.fill();

    const hVal = Math.floor(110 + (rng() - 0.5) * 60);
    mudHCtx.fillStyle = `rgb(${hVal},${hVal},${hVal})`;
    mudHCtx.fillRect(x, y, r, r);
  }
  // Rơm khô lẫn trong đất
  for (let i = 0; i < 240; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const len = 6 + rng() * 14;
    const ang = rng() * Math.PI * 2;
    mudCtx.strokeStyle = rng() > 0.4 ? 'rgba(105, 84, 52, 0.52)' : 'rgba(72, 56, 36, 0.48)';
    mudCtx.lineWidth = 1.1;
    mudCtx.beginPath();
    mudCtx.moveTo(x, y);
    mudCtx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    mudCtx.stroke();

    mudHCtx.strokeStyle = '#c8c8c8';
    mudHCtx.lineWidth = 1.2;
    mudHCtx.beginPath();
    mudHCtx.moveTo(x, y);
    mudHCtx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    mudHCtx.stroke();
  }
  // Đường nứt khô cằn
  for (let c = 0; c < 18; c++) {
    let cx = rng() * size;
    let cy = rng() * size;
    let angle = rng() * Math.PI * 2;
    for (let s = 0; s < 8; s++) {
      const nx = cx + Math.cos(angle) * (8 + rng() * 14);
      const ny = cy + Math.sin(angle) * (8 + rng() * 14);
      mudCtx.strokeStyle = 'rgba(10, 7, 5, 0.78)';
      mudCtx.lineWidth = 1.3;
      mudCtx.beginPath();
      mudCtx.moveTo(cx, cy);
      mudCtx.lineTo(nx, ny);
      mudCtx.stroke();

      mudHCtx.strokeStyle = '#141414';
      mudHCtx.lineWidth = 1.8;
      mudHCtx.beginPath();
      mudHCtx.moveTo(cx, cy);
      mudHCtx.lineTo(nx, ny);
      mudHCtx.stroke();

      cx = nx;
      cy = ny;
      angle += (rng() - 0.5) * 1.1;
    }
  }

  // 2. Đá rêu phong (#1c1c21 + rêu sẫm)
  const stoneCanvas = document.createElement('canvas');
  stoneCanvas.width = size;
  stoneCanvas.height = size;
  const sCtx = stoneCanvas.getContext('2d');
  const stoneHCanvas = document.createElement('canvas');
  stoneHCanvas.width = size;
  stoneHCanvas.height = size;
  const sHCtx = stoneHCanvas.getContext('2d');

  sCtx.fillStyle = '#1c1c21';
  sCtx.fillRect(0, 0, size, size);
  sHCtx.fillStyle = '#888888';
  sHCtx.fillRect(0, 0, size, size);

  const rows = 6;
  const cols = 4;
  const cellH = size / rows;
  const cellW = size / cols;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (cellW * 0.5);
    for (let col = -1; col <= cols; col++) {
      const bx = col * cellW + offset;
      const by = r * cellH;
      const tone = 24 + Math.floor(rng() * 14);
      sCtx.fillStyle = `rgb(${tone}, ${tone + 1}, ${tone + 5})`;
      sCtx.fillRect(bx + 2, by + 2, cellW - 4, cellH - 4);
      const hv = 115 + Math.floor(rng() * 65);
      sHCtx.fillStyle = `rgb(${hv},${hv},${hv})`;
      sHCtx.fillRect(bx + 2, by + 2, cellW - 4, cellH - 4);
    }
  }
  for (let m = 0; m < 160; m++) {
    const mx = rng() * size;
    const my = rng() * size;
    const mr = 3 + rng() * 10;
    sCtx.fillStyle = rng() > 0.35 ? 'rgba(26, 38, 22, 0.36)' : 'rgba(10, 10, 14, 0.45)';
    sCtx.beginPath();
    sCtx.arc(mx, my, mr, 0, Math.PI * 2);
    sCtx.fill();
  }

  // 3. Gỗ lim tối màu / gỗ mục
  const woodCanvas = document.createElement('canvas');
  woodCanvas.width = size;
  woodCanvas.height = size;
  const wCtx = woodCanvas.getContext('2d');
  const woodHCanvas = document.createElement('canvas');
  woodHCanvas.width = size;
  woodHCanvas.height = size;
  const wHCtx = woodHCanvas.getContext('2d');

  wCtx.fillStyle = '#1d130d';
  wCtx.fillRect(0, 0, size, size);
  wHCtx.fillStyle = '#808080';
  wHCtx.fillRect(0, 0, size, size);

  for (let i = 0; i < 190; i++) {
    const x = rng() * size;
    const width = 1 + rng() * 2.5;
    wCtx.fillStyle = rng() > 0.5 ? 'rgba(42, 27, 17, 0.55)' : 'rgba(11, 7, 5, 0.6)';
    wCtx.fillRect(x, 0, width, size);
    const hv = rng() > 0.5 ? 160 : 50;
    wHCtx.fillStyle = `rgb(${hv},${hv},${hv})`;
    wHCtx.fillRect(x, 0, width, size);
  }

  // 4. Mái tranh xơ xác
  const thatchCanvas = document.createElement('canvas');
  thatchCanvas.width = size;
  thatchCanvas.height = size;
  const tCtx = thatchCanvas.getContext('2d');
  tCtx.fillStyle = '#2e2418';
  tCtx.fillRect(0, 0, size, size);
  for (let i = 0; i < 520; i++) {
    const x = rng() * size;
    const y = rng() * size;
    const dy = 14 + rng() * 26;
    const dx = (rng() - 0.5) * 5;
    tCtx.strokeStyle = rng() > 0.45 ? '#59472c' : '#1b150e';
    tCtx.lineWidth = 1.4;
    tCtx.beginPath();
    tCtx.moveTo(x, y);
    tCtx.lineTo(x + dx, y + dy);
    tCtx.stroke();
  }

  // 5. God Ray vertical-fade alpha gradient
  const rayCanvas = document.createElement('canvas');
  rayCanvas.width = 128;
  rayCanvas.height = 256;
  const rCtx = rayCanvas.getContext('2d');
  const rayGrad = rCtx.createLinearGradient(0, 0, 0, 256);
  rayGrad.addColorStop(0.0, 'rgba(255, 212, 145, 0.0)');
  rayGrad.addColorStop(0.14, 'rgba(255, 204, 130, 0.58)');
  rayGrad.addColorStop(0.62, 'rgba(255, 168, 86, 0.24)');
  rayGrad.addColorStop(0.92, 'rgba(255, 148, 54, 0.06)');
  rayGrad.addColorStop(1.0, 'rgba(255, 148, 54, 0.0)');
  rCtx.fillStyle = rayGrad;
  rCtx.fillRect(0, 0, 128, 256);

  // Subtle vertical streak beams inside God Ray
  for (let s = 0; s < 14; s++) {
    const sx = (s / 14) * 128;
    const sw = 4 + rng() * 8;
    const sg = rCtx.createLinearGradient(0, 0, 0, 256);
    sg.addColorStop(0, 'rgba(255,235,190,0)');
    sg.addColorStop(0.25, 'rgba(255,235,190,0.16)');
    sg.addColorStop(1, 'rgba(255,200,120,0)');
    rCtx.fillStyle = sg;
    rCtx.fillRect(sx, 0, sw, 256);
  }

  // 6. Particle radial glow sprite
  const ptCanvas = document.createElement('canvas');
  ptCanvas.width = 64;
  ptCanvas.height = 64;
  const pCtx = ptCanvas.getContext('2d');
  const pGrad = pCtx.createRadialGradient(32, 32, 0, 32, 32, 30);
  pGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  pGrad.addColorStop(0.35, 'rgba(255, 232, 185, 0.65)');
  pGrad.addColorStop(1, 'rgba(255, 180, 90, 0)');
  pCtx.fillStyle = pGrad;
  pCtx.fillRect(0, 0, 64, 64);

  return {
    mudDiffuse: makeCanvasTexture(mudCanvas, { repeatX: 5, repeatY: 2.5, srgb: true, disposables }),
    mudNormal: heightCanvasToNormalTexture(mudHCanvas, 2.8, 5, 2.5, disposables),
    mudBump: makeCanvasTexture(mudHCanvas, { repeatX: 5, repeatY: 2.5, srgb: false, disposables }),
    stoneDiffuse: makeCanvasTexture(stoneCanvas, { repeatX: 6, repeatY: 6, srgb: true, disposables }),
    stoneNormal: heightCanvasToNormalTexture(stoneHCanvas, 2.2, 6, 6, disposables),
    woodDiffuse: makeCanvasTexture(woodCanvas, { repeatX: 2, repeatY: 3, srgb: true, disposables }),
    woodBump: makeCanvasTexture(woodHCanvas, { repeatX: 2, repeatY: 3, srgb: false, disposables }),
    thatchDiffuse: makeCanvasTexture(thatchCanvas, { repeatX: 4, repeatY: 2, srgb: true, disposables }),
    godRayTex: makeCanvasTexture(rayCanvas, { repeatX: 1, repeatY: 1, srgb: true, disposables }),
    particleTex: makeCanvasTexture(ptCanvas, { repeatX: 1, repeatY: 1, srgb: true, disposables })
  };
}

/** Tạo bảng chữ/bảng trích đoạn phong cách bảng gỗ cổ hoặc giấy dó khắc mực */
function createCalligraphySignTexture(title, subtitle, options = {}, disposables = []) {
  const {
    width = 1024,
    height = 256,
    bg = '#0b0908',
    border = '#6e4e2a',
    titleColor = '#e6c589',
    subColor = '#9b8667'
  } = options;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = border;
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, width - 24, height - 24);
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, width - 48, height - 48);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = titleColor;
  ctx.font = 'bold 42px Georgia, "Times New Roman", serif';
  ctx.fillText(title, width / 2, subtitle ? height * 0.42 : height * 0.5);

  if (subtitle) {
    ctx.fillStyle = subColor;
    ctx.font = 'italic 26px Georgia, "Times New Roman", serif';
    ctx.fillText(subtitle, width / 2, height * 0.72);
  }

  return makeCanvasTexture(canvas, { repeatX: 1, repeatY: 1, srgb: true, disposables });
}

/**
 * Điêu khắc phù điêu Hổ Phù (Tiger Mask) nhiều lớp 3D cho cổng đình và bia đá.
 */
function buildTigerMaskRelief(scale, bronzeMat, darkWoodMat) {
  const group = new THREE.Group();
  group.name = 'Sculpted_HoPhu_Relief';

  // Đế đĩa tròn chạm chìm
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.5, 0.08, 24), darkWoodMat);
  disc.rotation.x = Math.PI / 2;
  group.add(disc);

  // Vòng chạm vân nổi ngoài
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.04, 10, 28), bronzeMat);
  rim.position.z = 0.04;
  group.add(rim);

  // Trán & Vương miện chữ Vương / chữ Thọ
  const forehead = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.12), bronzeMat);
  forehead.position.set(0, 0.18, 0.07);
  group.add(forehead);

  // Chân mày xếch oai vệ (hai cánh đối xứng)
  [-1, 1].forEach((side) => {
    const brow = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.032, 8, 14, Math.PI * 0.75), bronzeMat);
    brow.position.set(side * 0.16, 0.11, 0.1);
    brow.rotation.z = side * -0.45;
    group.add(brow);

    // Mắt hổ nổi
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), bronzeMat);
    eye.scale.set(1.25, 0.78, 0.75);
    eye.position.set(side * 0.15, 0.04, 0.11);
    group.add(eye);

    // Râu hổ cuộn xoắn
    const whisker = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.024, 8, 16, Math.PI * 1.1), bronzeMat);
    whisker.position.set(side * 0.25, -0.14, 0.08);
    whisker.rotation.z = side > 0 ? -0.4 : 2.5;
    group.add(whisker);

    // Nanh nhọn
    const fang = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.1, 8), bronzeMat);
    fang.rotation.x = Math.PI;
    fang.position.set(side * 0.09, -0.2, 0.11);
    group.add(fang);
  });

  // Sống mũi & mũi sư tử/hổ
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.13), bronzeMat);
  nose.position.set(0, -0.04, 0.12);
  group.add(nose);

  // Khuyên ngậm đồng
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.022, 8, 20), bronzeMat);
  ring.position.set(0, -0.26, 0.11);
  group.add(ring);

  mergeGroupMeshesByMaterial(group);
  group.scale.setScalar(scale);
  return group;
}

/**
 * Điêu khắc dải phù điêu Vân Mây S-curve chạy dọc xà ngang cổng đình.
 */
function buildCloudScrollFrieze(totalWidth, bronzeMat) {
  const group = new THREE.Group();
  const count = Math.max(4, Math.floor(totalWidth / 0.85));
  const step = totalWidth / count;

  for (let i = 0; i < count; i++) {
    const x = -totalWidth / 2 + step * (i + 0.5);
    const spiralA = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.028, 8, 16, Math.PI * 1.25), bronzeMat);
    spiralA.position.set(x - 0.1, 0.03, 0.02);
    spiralA.rotation.z = 0.4;
    group.add(spiralA);

    const spiralB = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.024, 8, 16, Math.PI * 1.25), bronzeMat);
    spiralB.position.set(x + 0.12, -0.04, 0.02);
    spiralB.rotation.z = Math.PI + 0.3;
    group.add(spiralB);
  }
  mergeGroupMeshesByMaterial(group);
  return group;
}

/** Tạo bệ trưng bày tiêu chuẩn kèm viền cổ điển & biển đồng nhỏ */
function buildCuratedPedestal({ width, depth, height, topRimMat, bodyMat, trimMat, title, subtitle, disposables }) {
  const ped = new THREE.Group();

  const plinthH = 0.16;
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(width + 0.22, plinthH, depth + 0.22), trimMat);
  plinth.position.y = plinthH / 2;
  ped.add(plinth);

  const shaftH = Math.max(0.25, height - plinthH - 0.12);
  const shaft = new THREE.Mesh(new THREE.BoxGeometry(width, shaftH, depth), bodyMat);
  shaft.position.y = plinthH + shaftH / 2;
  ped.add(shaft);

  const cap = new THREE.Mesh(new THREE.BoxGeometry(width + 0.16, 0.12, depth + 0.16), topRimMat);
  cap.position.y = plinthH + shaftH + 0.06;
  ped.add(cap);

  if (title) {
    const plaqueTex = createCalligraphySignTexture(
      title,
      subtitle || '',
      { width: 512, height: 128, bg: '#15100c', border: '#876335', titleColor: '#e8c88c', subColor: '#ab926d' },
      disposables
    );
    const plaqueMat = new THREE.MeshLambertMaterial({
      map: plaqueTex
    });
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(width * 0.86, 1.15), 0.28), plaqueMat);
    plaque.position.set(0, plinthH + shaftH * 0.62, depth / 2 + 0.012);
    ped.add(plaque);
  }

  mergeGroupMeshesByMaterial(ped);
  return ped;
}

/** Helper chuyển tọa độ cục bộ trong interiorGroup sang tọa độ thế giới hiện tại */
function localToWorldVec(interiorGroup, lx, ly, lz) {
  interiorGroup.updateMatrixWorld(true);
  return interiorGroup.localToWorld(new THREE.Vector3(lx, ly, lz));
}

/**
 * Xây dựng trọn vẹn Phòng trưng bày Tắt Đèn (Ngô Tất Tố) - Tầng 3 Cánh Tây-Bắc (Phòng 302).
 */
export function buildTatDenExhibition({
  roomCenter = new THREE.Vector3(-48.0, 20.0, -19.0),
  mainScene = null,
  realmScene = null,
  cameraManager = null
} = {}) {
  const disposables = [];
  const textures = createProceduralTextures(disposables);

  const roomGroup = new THREE.Group();
  roomGroup.name = 'TatDen_Room_Root';
  roomGroup.position.copy(roomCenter);

  const interiorGroup = new THREE.Group();
  interiorGroup.name = 'TatDen_Interior_Group';
  // Đồng bộ quy ước xoay của bảo tàng: cánh Tây (+X hướng về sảnh) dùng +PI/2 để local +Z hướng ra cửa vòm sảnh
  interiorGroup.rotation.y = roomCenter.x < 0 ? Math.PI / 2 : -Math.PI / 2;
  roomGroup.add(interiorGroup);

  // Vật liệu chia sẻ: giữ PBR cho kiến trúc chủ đạo, chuyển vật liệu phụ/xa sang MeshLambertMaterial nhẹ
  const mudWallMat = new THREE.MeshStandardMaterial({
    map: textures.mudDiffuse,
    normalMap: textures.mudNormal,
    roughness: 0.94,
    metalness: 0.02
  });
  const limWoodMat = new THREE.MeshStandardMaterial({
    color: PALETTE.limWood,
    map: textures.woodDiffuse,
    roughness: 0.76,
    metalness: 0.06
  });
  const mossyStoneMat = new THREE.MeshStandardMaterial({
    map: textures.stoneDiffuse,
    normalMap: textures.stoneNormal,
    roughness: 0.88,
    metalness: 0.05
  });
  const thatchMat = new THREE.MeshLambertMaterial({
    map: textures.thatchDiffuse,
    side: THREE.FrontSide
  });
  const darkPlasterMat = new THREE.MeshLambertMaterial({
    color: PALETTE.pitchBlack
  });
  const agedBronzeMat = new THREE.MeshStandardMaterial({
    color: PALETTE.bronzePatina,
    roughness: 0.44,
    metalness: 0.72
  });
  const bambooMat = new THREE.MeshLambertMaterial({
    color: 0x161b12
  });
  const bambooLeafMat = new THREE.MeshLambertMaterial({
    color: 0x0d140c,
    side: THREE.FrontSide
  });

  // =========================================================================
  // 1. VỎ KIẾN TRÚC PHÒNG (TRẦN 8.4M, SÀN ĐÁ RÊU, VÁCH ĐẤT & VÙNG ĐÊM ĐEN)
  // =========================================================================
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), mossyStoneMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.026;
  floor.userData.isWalkableFloor = true;
  interiorGroup.add(floor);

  // Lối đi đá tối dẫn từ cổng vòm thẳng tới tượng đài và Cổng Dịch Chuyển
  const walkwayMat = new THREE.MeshLambertMaterial({
    color: PALETTE.ashGrey,
    map: textures.stoneDiffuse
  });
  const walkway = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.032, 23.8), walkwayMat);
  walkway.position.set(0, 0.034, 1.9);
  walkway.userData.isWalkableFloor = true;
  interiorGroup.add(walkway);

  // Trần phòng cao chuẩn 8.4m với ô giếng trời tối (oculus) phía trên tượng đài tại Z = -3.2
  const ceilingGroup = new THREE.Group();
  const frontCeil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, 14.2), darkPlasterMat);
  frontCeil.rotation.x = Math.PI / 2;
  frontCeil.position.set(0, ROOM_H, 6.7);
  ceilingGroup.add(frontCeil);

  const rearCeil = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, 7.8), darkPlasterMat);
  rearCeil.rotation.x = Math.PI / 2;
  rearCeil.position.set(0, ROOM_H, -9.9);
  ceilingGroup.add(rearCeil);

  const leftCeil = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 5.6), darkPlasterMat);
  leftCeil.rotation.x = Math.PI / 2;
  leftCeil.position.set(-8.0, ROOM_H, -3.2);
  ceilingGroup.add(leftCeil);

  const rightCeil = new THREE.Mesh(new THREE.PlaneGeometry(9.6, 5.6), darkPlasterMat);
  rightCeil.rotation.x = Math.PI / 2;
  rightCeil.position.set(8.0, ROOM_H, -3.2);
  ceilingGroup.add(rightCeil);

  // Khung giếng trời bát giác trên đỉnh tượng trung tâm
  const oculusRim = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.18, 10, 8), limWoodMat);
  oculusRim.rotation.x = Math.PI / 2;
  oculusRim.position.set(0, ROOM_H - 0.05, -3.2);
  ceilingGroup.add(oculusRim);

  const oculusVoid = new THREE.Mesh(
    new THREE.CircleGeometry(2.1, 16),
    new THREE.MeshBasicMaterial({ color: 0x050508, side: THREE.FrontSide })
  );
  oculusVoid.rotation.x = Math.PI / 2;
  oculusVoid.position.set(0, ROOM_H + 0.35, -3.2);
  ceilingGroup.add(oculusVoid);
  mergeGroupMeshesByMaterial(ceilingGroup);
  interiorGroup.add(ceilingGroup);

  // Tường trái: Vách đất pha rơm nứt nẻ, bịt kín mép trong 24.0m x 25.0m che toàn bộ cột/cửa sổ ngoài
  const southWallMud = new THREE.Mesh(new THREE.BoxGeometry(0.5, ROOM_H + 1.4, 26.6), mudWallMat);
  southWallMud.position.set(-12.1, (ROOM_H + 1.4) / 2, 0.6);
  interiorGroup.add(southWallMud);

  // Tường phải: Gỗ lim đình làng uy nghiêm che kín mép trong bên phải
  const northWallUpper = new THREE.Mesh(new THREE.BoxGeometry(0.5, ROOM_H + 1.4, 26.6), limWoodMat);
  northWallUpper.position.set(12.1, (ROOM_H + 1.4) / 2, 0.6);
  interiorGroup.add(northWallUpper);

  // Vách hậu phía Tây: Khoảng đêm đen đặc ("Trời tối như mực và như cái tiền đồ của chị"), đặt tại Z = -12.45m để che 100% khung cửa & cột sáng ngoài hành lang
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(25.4, ROOM_H + 1.6, 0.65), darkPlasterMat);
  backWall.position.set(0, (ROOM_H + 1.6) / 2, -12.45);
  interiorGroup.add(backWall);

  // Tường mặt tiền giáp sảnh Tầng 3: chừa đúng cửa vòm 6.2m x 4.6m và bịt kín dải trên tới trần 9.8m
  const frontPierLeft = new THREE.Mesh(new THREE.BoxGeometry(9.6, ROOM_H + 1.4, 0.35), mudWallMat);
  frontPierLeft.position.set(-8.0, (ROOM_H + 1.4) / 2, ROOM_D / 2 - 0.15);
  interiorGroup.add(frontPierLeft);

  const frontPierRight = new THREE.Mesh(new THREE.BoxGeometry(9.6, ROOM_H + 1.4, 0.35), limWoodMat);
  frontPierRight.position.set(8.0, (ROOM_H + 1.4) / 2, ROOM_D / 2 - 0.15);
  interiorGroup.add(frontPierRight);

  const frontLintelFascia = new THREE.Mesh(new THREE.BoxGeometry(6.4, ROOM_H + 1.4 - 4.6, 0.35), limWoodMat);
  frontLintelFascia.position.set(0, 4.6 + (ROOM_H + 1.4 - 4.6) / 2, ROOM_D / 2 - 0.15);
  interiorGroup.add(frontLintelFascia);

  // =========================================================================
  // 2. KHU VỰC 1 — ĐÌNH LÀNG ĐÔNG XÁ & ÁCH SƯU THUẾ (LỐI VÀO)
  // =========================================================================
  const solidObstacleObjects = [];

  // Cổng đình uy nghiêm ôm sát cửa vào (Z = +13.1), khoảng mở 6.4m x 4.55m không cản lối đi
  const gateGroup = new THREE.Group();
  gateGroup.position.set(0, 0, ROOM_D / 2 - 0.65);

  const gatePostGeo = new THREE.CylinderGeometry(0.28, 0.32, 4.85, 16);
  const gateBaseGeo = new THREE.CylinderGeometry(0.42, 0.48, 0.24, 16);
  [-3.35, 3.35].forEach((gx) => {
    const plinth = new THREE.Mesh(gateBaseGeo, mossyStoneMat);
    plinth.position.set(gx, 0.12, 0);
    gateGroup.add(plinth);
    const post = new THREE.Mesh(gatePostGeo, limWoodMat);
    post.position.set(gx, 2.55, 0);
    gateGroup.add(post);
    solidObstacleObjects.push(post);
  });

  const gateBeam = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.55, 0.6), limWoodMat);
  gateBeam.position.set(0, 4.95, 0);
  gateGroup.add(gateBeam);

  // Mái cổng đình vươn cong hai tầng nhẹ phía trên
  const gateRoof = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.16, 1.45), mossyStoneMat);
  gateRoof.position.set(0, 5.36, 0);
  gateGroup.add(gateRoof);

  // Phù điêu Vân Mây & Hổ Phù hai mặt cổng đình
  const gateFriezeFront = buildCloudScrollFrieze(5.8, agedBronzeMat);
  gateFriezeFront.position.set(0, 4.95, -0.32);
  gateFriezeFront.rotation.y = Math.PI;
  gateGroup.add(gateFriezeFront);

  const gateTigerIn = buildTigerMaskRelief(0.88, agedBronzeMat, limWoodMat);
  gateTigerIn.position.set(0, 5.25, -0.35);
  gateTigerIn.rotation.y = Math.PI;
  gateGroup.add(gateTigerIn);

  const gateSignTex = createCalligraphySignTexture(
    'ĐÌNH LÀNG ĐÔNG XÁ — VỤ SƯU THUẾ',
    'Ký ức nông thôn Bắc Bộ qua trang viết Ngô Tất Tố (Tắt Đèn, 1939)',
    { width: 1024, height: 220, bg: '#130d09', border: '#7b592d', titleColor: '#eed094', subColor: '#b59a72' },
    disposables
  );
  const gateSign = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, 0.92),
    new THREE.MeshLambertMaterial({ map: gateSignTex })
  );
  gateSign.position.set(0, 6.08, -0.18);
  gateSign.rotation.y = Math.PI;
  gateGroup.add(gateSign);
  interiorGroup.add(gateGroup);

  // Hàng cột gỗ lim đình làng (InstancedMesh tối ưu FPS) dọc hai cánh
  const pillarPositions = [
    [9.8, 10.6], [9.8, 5.6], [9.8, 0.4], [9.8, -5.0],
    [-9.8, 10.6], [-9.8, 5.6], [-9.8, 0.4], [-9.8, -5.0]
  ];
  const colShaftGeo = new THREE.CylinderGeometry(0.24, 0.28, ROOM_H - 0.35, 14);
  const colBaseGeo = new THREE.CylinderGeometry(0.38, 0.44, 0.28, 14);
  const instancedPillars = new THREE.InstancedMesh(colShaftGeo, limWoodMat, pillarPositions.length);
  const instancedColBases = new THREE.InstancedMesh(colBaseGeo, mossyStoneMat, pillarPositions.length);
  const dummy = new THREE.Object3D();

  pillarPositions.forEach(([px, pz], idx) => {
    dummy.position.set(px, (ROOM_H - 0.35) / 2 + 0.24, pz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    instancedPillars.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(px, 0.14, pz);
    dummy.updateMatrix();
    instancedColBases.setMatrixAt(idx, dummy.matrix);
  });
  instancedPillars.instanceMatrix.needsUpdate = true;
  instancedColBases.instanceMatrix.needsUpdate = true;
  interiorGroup.add(instancedPillars);
  interiorGroup.add(instancedColBases);

  // Proxy va chạm tĩnh cho các cột gỗ đình (khối nhẹ dùng Box3)
  pillarPositions.forEach(([px, pz], idx) => {
    const colProxy = new THREE.Object3D();
    colProxy.name = `TatDen_Col_${idx}`;
    colProxy.position.set(px, 1.5, pz);
    // Mesh ẩn cực nhẹ để registerSolidObjectCollider tính Box3 chính xác
    const proxyBox = new THREE.Mesh(
      new THREE.BoxGeometry(0.76, 4.0, 0.76),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    colProxy.add(proxyBox);
    interiorGroup.add(colProxy);
    solidObstacleObjects.push(colProxy);
  });

  // Đòn xà ngang nối các cột đình cánh phải (cường hào)
  const rightBeam = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.42, 22.0), limWoodMat);
  rightBeam.position.set(9.8, 5.4, 2.2);
  interiorGroup.add(rightBeam);

  // Biển đối lập giai cấp trên dải đình (Khu 1)
  const taxDecreeTex = createCalligraphySignTexture(
    'SỔ ĐINH — SƯU THUẾ',
    '"Mùa thu sưu, tiếng trống thúc giục rền vang khắp đình Đông Xá..."',
    { width: 768, height: 220, bg: '#18100b', border: '#8b6331', titleColor: '#e5ba78', subColor: '#bba17b' },
    disposables
  );
  const taxBanner = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 0.9),
    new THREE.MeshLambertMaterial({ map: taxDecreeTex })
  );
  taxBanner.position.set(11.75, 3.6, 7.2);
  taxBanner.rotation.y = -Math.PI / 2;
  interiorGroup.add(taxBanner);

  // Bệ trưng bày 1: Hiện vật Sưu Thuế (tax_artifacts.glb) tại (4.5, 0, +7.2)
  const taxStation = new THREE.Group();
  taxStation.name = 'Station_TaxArtifacts';
  taxStation.position.set(4.5, 0, 7.2);
  const taxPed = buildCuratedPedestal({
    width: 1.55,
    depth: 1.45,
    height: 1.1,
    topRimMat: agedBronzeMat,
    bodyMat: limWoodMat,
    trimMat: mossyStoneMat,
    title: 'HIỆN VẬT I: TRÁP SƯU & MÕ ĐÌNH',
    subtitle: 'Ách sưu thuế nặng nề thời Pháp thuộc',
    disposables
  });
  taxStation.add(taxPed);
  interiorGroup.add(taxStation);
  solidObstacleObjects.push(taxPed);

  // =========================================================================
  // 3. KHU VỰC 2 — MÁI TRANH NGHÈO & LŨY TRE LÀNG (CÁNH TRÁI/GIỮA)
  // =========================================================================
  // Mái tranh xơ xác nghiêng từ vách đất cánh trái xuống che góc bếp nghèo Chị Dậu
  const thatchShelter = new THREE.Group();
  thatchShelter.position.set(-10.1, 0, 2.8);

  const thatchRoofPanel = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.22, 11.4), thatchMat);
  thatchRoofPanel.position.set(0.2, 4.35, 0);
  thatchRoofPanel.rotation.z = -0.32;
  thatchShelter.add(thatchRoofPanel);

  // Diềm tranh xơ rủ lởm chởm tạo cảm giác tiêu điều
  const fringeGeo = new THREE.BoxGeometry(0.45, 0.08, 0.72);
  for (let f = 0; f < 14; f++) {
    const fringe = new THREE.Mesh(fringeGeo, thatchMat);
    fringe.position.set(2.8 + (f % 2) * 0.14, 3.45 - (f % 3) * 0.05, -5.1 + f * 0.78);
    fringe.rotation.z = -0.48 - (f % 3) * 0.08;
    thatchShelter.add(fringe);
  }

  // Kèo tre chống mái
  const rafterGeo = new THREE.CylinderGeometry(0.06, 0.075, 5.8, 8);
  for (let r = 0; r < 5; r++) {
    const rafter = new THREE.Mesh(rafterGeo, bambooMat);
    rafter.position.set(0.15, 4.2, -4.6 + r * 2.3);
    rafter.rotation.z = Math.PI / 2 - 0.32;
    thatchShelter.add(rafter);
  }
  mergeGroupMeshesByMaterial(thatchShelter);
  interiorGroup.add(thatchShelter);

  // Lũy tre làng trong bóng tối dùng InstancedMesh (đốt tre, thân tre, tán lá)
  const bambooRng = createSeededRandom(741);
  const culmTransforms = [];
  const nodeTransforms = [];
  const leafTransforms = [];

  const bambooClusters = [
    { cx: -10.5, cz: -6.2, count: 22, rx: 1.2, rz: 4.0 },
    { cx: -9.8, cz: -10.6, count: 18, rx: 1.5, rz: 1.3 },
    { cx: 10.5, cz: -7.5, count: 20, rx: 1.2, rz: 3.6 },
    { cx: 9.8, cz: -10.6, count: 16, rx: 1.5, rz: 1.3 }
  ];

  bambooClusters.forEach((cl) => {
    for (let i = 0; i < cl.count; i++) {
      const bx = cl.cx + (bambooRng() - 0.5) * 2 * cl.rx;
      const bz = cl.cz + (bambooRng() - 0.5) * 2 * cl.rz;
      const h = 4.6 + bambooRng() * 3.1;
      const tiltX = (bambooRng() - 0.5) * 0.18;
      const tiltZ = (bambooRng() - 0.5) * 0.18;
      const radius = 0.055 + bambooRng() * 0.04;

      culmTransforms.push({ x: bx, y: h / 2, z: bz, h, tiltX, tiltZ, radius });

      const segments = 4;
      for (let s = 1; s <= segments; s++) {
        const ny = (h / (segments + 0.6)) * s;
        nodeTransforms.push({
          x: bx + Math.sin(tiltZ) * ny * -0.5,
          y: ny,
          z: bz + Math.sin(tiltX) * ny * 0.5,
          radius: radius * 1.24,
          tiltX,
          tiltZ
        });
      }

      for (let l = 0; l < 2; l++) {
        const ly = h * (0.65 + l * 0.25);
        leafTransforms.push({
          x: bx + (bambooRng() - 0.5) * 0.65,
          y: ly,
          z: bz + (bambooRng() - 0.5) * 0.65,
          ry: bambooRng() * Math.PI * 2,
          rz: 0.35 + bambooRng() * 0.45,
          scale: 0.6 + bambooRng() * 0.55
        });
      }
    }
  });

  const culmGeo = new THREE.CylinderGeometry(0.055, 0.075, 1.0, 7);
  const instCulms = new THREE.InstancedMesh(culmGeo, bambooMat, culmTransforms.length);
  culmTransforms.forEach((c, i) => {
    dummy.position.set(c.x, c.y, c.z);
    dummy.rotation.set(c.tiltX, 0, c.tiltZ);
    dummy.scale.set(c.radius / 0.065, c.h, c.radius / 0.065);
    dummy.updateMatrix();
    instCulms.setMatrixAt(i, dummy.matrix);
  });
  instCulms.instanceMatrix.needsUpdate = true;
  interiorGroup.add(instCulms);

  const nodeGeo = new THREE.TorusGeometry(0.07, 0.018, 6, 10);
  const instNodes = new THREE.InstancedMesh(nodeGeo, bambooMat, nodeTransforms.length);
  nodeTransforms.forEach((n, i) => {
    dummy.position.set(n.x, n.y, n.z);
    dummy.rotation.set(Math.PI / 2 + n.tiltX, 0, n.tiltZ);
    dummy.scale.set(n.radius / 0.07, n.radius / 0.07, 1);
    dummy.updateMatrix();
    instNodes.setMatrixAt(i, dummy.matrix);
  });
  instNodes.instanceMatrix.needsUpdate = true;
  interiorGroup.add(instNodes);

  const leafGeo = new THREE.ConeGeometry(0.28, 0.85, 5);
  const instLeaves = new THREE.InstancedMesh(leafGeo, bambooLeafMat, leafTransforms.length);
  leafTransforms.forEach((lf, i) => {
    dummy.position.set(lf.x, lf.y, lf.z);
    dummy.rotation.set(0.25, lf.ry, lf.rz);
    dummy.scale.setScalar(lf.scale);
    dummy.updateMatrix();
    instLeaves.setMatrixAt(i, dummy.matrix);
  });
  instLeaves.instanceMatrix.needsUpdate = true;
  interiorGroup.add(instLeaves);

  // Station 2A: Mâm cháo cám & nia rách (peasant_hearth.glb) tại (-4.8, 0, +2.6)
  const hearthStation = new THREE.Group();
  hearthStation.name = 'Station_PeasantHearth';
  hearthStation.position.set(-4.8, 0, 2.6);
  const hearthPed = buildCuratedPedestal({
    width: 1.55,
    depth: 1.4,
    height: 0.9,
    topRimMat: limWoodMat,
    bodyMat: mudWallMat,
    trimMat: mossyStoneMat,
    title: 'HIỆN VẬT II: NIA RÁCH & CHÁO CÁM',
    subtitle: 'Cảnh bần hàn bán con, bán chó nhà Chị Dậu',
    disposables
  });
  hearthStation.add(hearthPed);
  interiorGroup.add(hearthStation);
  solidObstacleObjects.push(hearthPed);

  // Station 2B: Ngọn đèn dầu (oil_lamp.glb) tại (+4.6, 0, +0.6)
  const lampStation = new THREE.Group();
  lampStation.name = 'Station_OilLamp';
  lampStation.position.set(4.6, 0, 0.6);
  const lampPed = buildCuratedPedestal({
    width: 1.25,
    depth: 1.25,
    height: 1.06,
    topRimMat: agedBronzeMat,
    bodyMat: limWoodMat,
    trimMat: mossyStoneMat,
    title: 'HIỆN VẬT III: ĐÈN DẦU TẮT LỬA',
    subtitle: 'Ánh lửa le lói giữa màn đêm bạo tàn',
    disposables
  });
  lampStation.add(lampPed);
  interiorGroup.add(lampStation);
  solidObstacleObjects.push(lampPed);

  // =========================================================================
  // 4. KHU VỰC 3 — TƯỢNG ĐÀI TRUNG TÂM & BỐI CẢNH ĐÊM TỐI
  // =========================================================================
  const monumentStation = new THREE.Group();
  monumentStation.name = 'Station_CenterMonument';
  monumentStation.position.set(0, 0, -3.2);

  const daisTier1 = new THREE.Mesh(new THREE.CylinderGeometry(2.55, 2.75, 0.44, 32), mossyStoneMat);
  daisTier1.position.y = 0.22;
  monumentStation.add(daisTier1);

  const daisTier2 = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 2.02, 0.81, 32), mossyStoneMat);
  daisTier2.position.y = 0.44 + 0.405;
  monumentStation.add(daisTier2);

  const daisTrimRing = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.065, 10, 36), agedBronzeMat);
  daisTrimRing.rotation.x = Math.PI / 2;
  daisTrimRing.position.y = 1.25;
  monumentStation.add(daisTrimRing);

  // Biển đồng dưới chân bục đá trung tâm
  const mainPlaqueTex = createCalligraphySignTexture(
    'TẮT ĐÈN — NGÔ TẤT TỐ',
    '"Chị vùng chạy ra ngoài giữa lúc trời tối như mực..."',
    { width: 900, height: 220, bg: '#0c0a0a', border: '#8e6b38', titleColor: '#f1d399', subColor: '#c3ad89' },
    disposables
  );
  const mainPlaque = new THREE.Mesh(
    new THREE.PlaneGeometry(2.05, 0.52),
    new THREE.MeshLambertMaterial({ map: mainPlaqueTex })
  );
  mainPlaque.position.set(0, 0.84, 1.98);
  monumentStation.add(mainPlaque);

  // Proxy va chạm tĩnh hình hộp khớp bục đá & tượng trung tâm ngay lập tức
  const daisColliderProxy = new THREE.Mesh(
    new THREE.BoxGeometry(4.8, 4.4, 4.8),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  daisColliderProxy.position.y = 2.2;
  monumentStation.add(daisColliderProxy);
  interiorGroup.add(monumentStation);
  solidObstacleObjects.push(daisColliderProxy);

  // Khung phù điêu & Hắc ám hậu cảnh ("Trời tối như mực và như cái tiền đồ của chị")
  const backdropGroup = new THREE.Group();
  backdropGroup.position.set(0, 0, -11.95);

  const voidArchFrameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.85, 6.9, 0.7), mossyStoneMat);
  voidArchFrameLeft.position.set(-4.8, 3.45, 0);
  backdropGroup.add(voidArchFrameLeft);
  const voidArchFrameRight = new THREE.Mesh(new THREE.BoxGeometry(0.85, 6.9, 0.7), mossyStoneMat);
  voidArchFrameRight.position.set(4.8, 3.45, 0);
  backdropGroup.add(voidArchFrameRight);
  const voidArchBeam = new THREE.Mesh(new THREE.BoxGeometry(10.6, 0.8, 0.8), limWoodMat);
  voidArchBeam.position.set(0, 6.95, 0);
  backdropGroup.add(voidArchBeam);

  // Phù điêu Vân Mây & Hổ Phù u uất trên bia đêm tối
  const backReliefFrieze = buildCloudScrollFrieze(8.4, agedBronzeMat);
  backReliefFrieze.position.set(0, 6.95, 0.42);
  backdropGroup.add(backReliefFrieze);

  const backTiger = buildTigerMaskRelief(0.95, agedBronzeMat, limWoodMat);
  backTiger.position.set(0, 7.0, 0.48);
  backdropGroup.add(backTiger);

  // Tấm bia trích dẫn câu văn bất hủ đặt trang trọng phía trên Cổng Dịch Chuyển
  const quoteTex = createCalligraphySignTexture(
    '“TRỜI TỐI NHƯ MỰC VÀ NHƯ CÁI TIỀN ĐỒ CỦA CHỊ”',
    'Ngô Tất Tố — Tắt Đèn (1939)',
    { width: 1280, height: 240, bg: '#050508', border: '#543f26', titleColor: '#d7b57c', subColor: '#8d7b60' },
    disposables
  );
  const quotePanel = new THREE.Mesh(
    new THREE.PlaneGeometry(7.2, 1.35),
    new THREE.MeshLambertMaterial({
      map: quoteTex,
      emissive: new THREE.Color(0x28190a),
      emissiveMap: quoteTex,
      emissiveIntensity: 0.65
    })
  );
  quotePanel.position.set(0, 5.75, 0.08);
  backdropGroup.add(quotePanel);
  mergeGroupMeshesByMaterial(backdropGroup);
  interiorGroup.add(backdropGroup);

  // =========================================================================
  // 5. ÁNH SÁNG CHIAROSCURO, ĐÈN DẦU LẬP LÒE & VOLUMETRIC GOD RAYS
  // =========================================================================
  // Ánh sáng môi trường rất thấp tạo tương phản sáng-tối đậm nét nhưng vẫn đọc rõ chi tiết kiến trúc
  const roomAmbient = new THREE.AmbientLight(0x2a2625, 0.38);
  interiorGroup.add(roomAmbient);

  // Ánh đèn trần soi thẳng vào tượng đài trung tâm (tắt shadow để giữ 60 FPS)
  const centerSpot = new THREE.SpotLight(0xffdcb0, 6.4, 18.0, Math.PI / 4.2, 0.62, 1.3);
  centerSpot.position.set(0, 8.2, -2.8);
  centerSpot.target.position.set(0, 1.8, -3.2);
  centerSpot.castShadow = false;
  interiorGroup.add(centerSpot);
  interiorGroup.add(centerSpot.target);

  // Ánh sáng hắt lạnh sau lưng tượng để tách bóng tối khỏi nền đen #050508
  const centerRimLight = new THREE.PointLight(0x637696, 2.2, 13.0, 1.5);
  centerRimLight.position.set(0, 3.6, -6.2);
  interiorGroup.add(centerRimLight);

  // Ánh sáng lướt lên bia trích dẫn & phù điêu hậu cảnh
  const backdropGrazingLight = new THREE.PointLight(0xd4944e, 2.6, 12.0, 1.55);
  backdropGrazingLight.position.set(0, 5.2, -9.6);
  interiorGroup.add(backdropGrazingLight);

  // Đèn hắt dịu tại Cổng Đình Làng Đông Xá (soi biển hiệu & phù điêu Hổ phù / Vân mây)
  const gateLanternLight = new THREE.PointLight(0xe59d52, 2.8, 11.5, 1.6);
  gateLanternLight.position.set(0, 5.1, 10.6);
  interiorGroup.add(gateLanternLight);

  // Đèn dầu lập lòe (#ff9436) phía trên bệ oil_lamp.glb
  const oilLampLight = new THREE.PointLight(PALETTE.oilFlame, 3.8, 14.0, 1.65);
  oilLampLight.position.set(4.6, 1.72, 0.6);
  interiorGroup.add(oilLampLight);

  const flameMesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.045, 0.14, 8),
    new THREE.MeshBasicMaterial({ color: 0xffb35c, transparent: true, opacity: 0.92 })
  );
  flameMesh.position.set(4.6, 1.48, 0.6);
  interiorGroup.add(flameMesh);

  // Ánh sáng ấm mờ cho khu vực tráp sưu thuế (Khu 1) & mái bếp (Khu 2)
  const taxLanternLight = new THREE.PointLight(0xe59d4c, 3.6, 12.0, 1.55);
  taxLanternLight.position.set(4.5, 3.0, 7.2);
  interiorGroup.add(taxLanternLight);

  const hearthGlowLight = new THREE.PointLight(0xd96b2c, 3.2, 11.5, 1.6);
  hearthGlowLight.position.set(-4.8, 2.55, 2.6);
  interiorGroup.add(hearthGlowLight);

  // Volumetric God Rays từ trần giếng trời xuống thẳng tượng tatden.glb
  const godRayMatInner = new THREE.MeshBasicMaterial({
    color: PALETTE.godRayWarm,
    map: textures.godRayTex,
    transparent: true,
    opacity: 0.34,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const godRayInner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.88, 2.45, 7.6, 28, 1, true),
    godRayMatInner
  );
  godRayInner.position.set(0, 4.55, -3.2);
  godRayInner.userData.ignoreRaycaster = true;
  interiorGroup.add(godRayInner);

  const godRayMatOuter = new THREE.MeshBasicMaterial({
    color: 0xd9873b,
    map: textures.godRayTex,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const godRayOuter = new THREE.Mesh(
    new THREE.CylinderGeometry(1.32, 3.3, 7.6, 24, 1, true),
    godRayMatOuter
  );
  godRayOuter.position.set(0, 4.55, -3.2);
  godRayOuter.userData.ignoreRaycaster = true;
  interiorGroup.add(godRayOuter);

  // =========================================================================
  // 6. HỆ THỐNG HẠT MÔI TRƯỜNG (BỤI TRONG GOD RAYS & ĐOM ĐÓM / TÀN LỬA)
  // =========================================================================
  const ptRng = createSeededRandom(2026);
  const dustCount = 240;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustPhases = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    const r = ptRng() * 2.55;
    const ang = ptRng() * Math.PI * 2;
    dustPositions[i * 3] = Math.cos(ang) * r;
    dustPositions[i * 3 + 1] = 1.2 + ptRng() * 6.9;
    dustPositions[i * 3 + 2] = -3.2 + Math.sin(ang) * r;
    dustPhases[i] = ptRng() * Math.PI * 2;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dustMat = new THREE.PointsMaterial({
    color: 0xe3c391,
    size: 0.085,
    map: textures.particleTex,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  dustPoints.userData.ignoreRaycaster = true;
  interiorGroup.add(dustPoints);

  // Hạt đom đóm / tàn lửa quanh lũy tre làng và đèn dầu
  const fireflyCount = 130;
  const ffPositions = new Float32Array(fireflyCount * 3);
  const ffBase = new Float32Array(fireflyCount * 3);
  const ffPhases = new Float32Array(fireflyCount);
  for (let i = 0; i < fireflyCount; i++) {
    const leftSide = i < 65;
    const bx = (leftSide ? -10.2 : 9.8) + (ptRng() - 0.5) * 4.0;
    const by = 0.7 + ptRng() * 4.4;
    const bz = -3.0 - ptRng() * 9.5;
    ffPositions[i * 3] = bx;
    ffPositions[i * 3 + 1] = by;
    ffPositions[i * 3 + 2] = bz;
    ffBase[i * 3] = bx;
    ffBase[i * 3 + 1] = by;
    ffBase[i * 3 + 2] = bz;
    ffPhases[i] = ptRng() * Math.PI * 2;
  }
  const ffGeo = new THREE.BufferGeometry();
  ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPositions, 3));
  const ffMat = new THREE.PointsMaterial({
    color: 0xffa64d,
    size: 0.13,
    map: textures.particleTex,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const fireflyPoints = new THREE.Points(ffGeo, ffMat);
  fireflyPoints.userData.ignoreRaycaster = true;
  interiorGroup.add(fireflyPoints);

  // =========================================================================
  // 7. TẢI VÀ CHUẨN HÓA MÔ HÌNH GLB (TATDEN.GLB & 3 HIỆN VẬT BLENDER)
  // =========================================================================

  // Định nghĩa 4 điểm nhấn tương tác (kèm góc nhìn camera smooth transition)
  const exhibitConfigs = [
    {
      key: 'tatDen_centerStatue',
      urls: ['/models/tatden.glb', '/model/tatden.glb'],
      parentStation: monumentStation,
      mountY: 1.25,
      targetHeight: 3.0,
      rotY: 0,
      focusLocalPos: [0.0, 2.95, 2.8],
      focusLocalTarget: [0.0, 2.55, -3.2],
      soundTheme: 'tatden_monument',
      soundOptions: { refDistance: 5.5, maxDistance: 18, volume: 0.42 },
      hitboxPadding: 0.14
    },
    {
      key: 'tatDen_taxArtifacts',
      urls: ['/models/tatden/tax_artifacts.glb'],
      parentStation: taxStation,
      mountY: 1.1,
      targetHeight: 0.78,
      rotY: -0.35,
      focusLocalPos: [1.55, 2.15, 8.95],
      focusLocalTarget: [4.5, 1.38, 7.2],
      soundTheme: 'tatden_tax',
      soundOptions: { refDistance: 4.5, maxDistance: 15, volume: 0.45 },
      hitboxPadding: 0.16
    },
    {
      key: 'tatDen_peasantHearth',
      urls: ['/models/tatden/peasant_hearth.glb'],
      parentStation: hearthStation,
      mountY: 0.9,
      targetHeight: 0.85,
      rotY: 0.45,
      focusLocalPos: [-1.85, 2.1, 4.35],
      focusLocalTarget: [-4.8, 1.22, 2.6],
      soundTheme: 'tatden_wind',
      soundOptions: { refDistance: 4.8, maxDistance: 16, volume: 0.42 },
      hitboxPadding: 0.16
    },
    {
      key: 'tatDen_oilLamp',
      urls: ['/models/tatden/oil_lamp.glb'],
      parentStation: lampStation,
      mountY: 1.06,
      targetHeight: 0.82,
      rotY: -0.25,
      focusLocalPos: [1.85, 2.18, 2.15],
      focusLocalTarget: [4.6, 1.44, 0.6],
      soundTheme: null,
      hitboxPadding: 0.18
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
        padding: Math.max(cfg.hitboxPadding || 0.16, 0.24),
        minSize: 0.85
      });
      if (proxy) {
        proxy.userData.onFocusCamera = focusCallback;
      }
    }
    modelGroup.userData.onFocusCamera = focusCallback;

    const audioTarget = spatialAudio || (typeof window !== 'undefined' ? window.__spatialAudio : null);
    if (audioTarget?.attachPositionalSound && cfg.soundTheme) {
      audioTarget.attachPositionalSound(cfg.key, modelGroup, {
        fallbackTheme: cfg.soundTheme,
        ...(cfg.soundOptions || {})
      });
    }
  }

  exhibitConfigs.forEach((cfg) => {
    const holder = new THREE.Group();
    holder.name = `TatDen_Artifact_${cfg.key}`;
    holder.position.y = cfg.mountY;
    holder.rotation.y = cfg.rotY;
    cfg.parentStation.add(holder);

    // Gắn sẵn một mesh ẩn đại diện trong khi đợi GLB tải để bảo đảm Raycast không trượt
    const placeholderMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, cfg.targetHeight, 0.95),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    placeholderMesh.position.y = cfg.targetHeight / 2;
    holder.add(placeholderMesh);

    loadGlbCached(cfg.urls, {
      maxTextureSize: 1024,
      disableMipmaps: true
    })
      .then((rawScene) => {
        if (!rawScene) return;
        holder.remove(placeholderMesh);
        placeholderMesh.geometry.dispose();
        placeholderMesh.material.dispose();

        normalizeModelToHeight(rawScene, cfg.targetHeight);
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
      .catch((err) => {
        console.warn(`[TatDenRoom] Không thể tải ${cfg.urls.join(', ')}:`, err?.message || err);
      });
  });

  // =========================================================================
  // 8. ĐĂNG KÝ HITBOX VẬT LÝ, HỆ THỐNG LORE, AUDIO & SƯƠNG MÙ CỤC BỘ
  // =========================================================================
  function registerHitboxes(hitboxManager) {
    const hbm = hitboxManager || window.__museumHitboxManager;
    if (!hbm) return;
    wiredManagers.hitboxManager = hbm;

    roomGroup.updateMatrixWorld(true);
    solidObstacleObjects.forEach((obj, idx) => {
      hbm.registerSolidObjectCollider(obj, {
        shrinkFactor: 0.96,
        tag: `TatDen_Solid_${idx}`,
        helperColor: 0xf97316,
        realm: 'museum'
      });
    });

    // Tường vây an toàn phía trong mép tường để bảo đảm không chạm lọt mép lũy tre / vách hậu
    exhibitConfigs.forEach((cfg) => {
      const holder = loadedArtifacts.get(cfg.key) || cfg.parentStation.getObjectByName(`TatDen_Artifact_${cfg.key}`);
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

  // Bộ điều khiển sương mù tối cục bộ (THREE.FogExp2) chỉ áp dụng khi camera ở bên trong Phòng Tắt Đèn
  let fogBlend = 0;
  let capturedOriginals = false;
  let savedFogColor = new THREE.Color(0xdca878);
  let savedFogDensity = 0.00075;
  const savedAtriumLights = [];
  const darkFogColor = new THREE.Color(PALETTE.pitchBlack);

  function captureAtriumState() {
    if (capturedOriginals || !mainScene) return;
    capturedOriginals = true;
    if (mainScene.fog && mainScene.fog.isFogExp2) {
      savedFogColor.copy(mainScene.fog.color);
      savedFogDensity = mainScene.fog.density;
    }
    mainScene.traverse((obj) => {
      if (!obj.isLight) return;
      // Chỉ lấy các nguồn sáng bên ngoài phòng Tắt Đèn
      let cur = obj;
      while (cur) {
        if (cur === roomGroup) return;
        cur = cur.parent;
      }
      savedAtriumLights.push({ light: obj, baseIntensity: obj.intensity });
    });
  }

  function isInsideTatDenRoom(camPos) {
    if (!camPos) return false;
    return (
      camPos.x >= -62.5 &&
      camPos.x <= -34.15 &&
      camPos.y >= 19.2 &&
      camPos.y <= 31.2 &&
      camPos.z >= -32.4 &&
      camPos.z <= -5.6
    );
  }

  function updateAtmosphere(delta, camera) {
    if (!mainScene || !camera) return;
    const inside = isInsideTatDenRoom(camera.position);
    if (inside && !capturedOriginals) {
      captureAtriumState();
    }
    const target = inside ? 1 : 0;
    const step = Math.min(1, Math.max(0.05, delta * 3.8));
    const prevBlend = fogBlend;
    fogBlend += (target - fogBlend) * step;

    if (Math.abs(fogBlend - prevBlend) > 0.0005 || inside) {
      if (!mainScene.fog || !mainScene.fog.isFogExp2) {
        mainScene.fog = new THREE.FogExp2(savedFogColor.getHex(), savedFogDensity);
      }
      mainScene.fog.color.copy(savedFogColor).lerp(darkFogColor, fogBlend);
      mainScene.fog.density = savedFogDensity + (0.0175 - savedFogDensity) * fogBlend;

      const lightScale = 1 - fogBlend * 0.84;
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

  const ROOM_PROXIMITY_SQ = 42 * 42;

  function update(delta = 0.016, elapsedTime = 0, camera = null) {
    if (!roomGroup.visible) return;
    const dt = Math.min(delta, 0.05);

    if (camera?.position) {
      const inside = isInsideTatDenRoom(camera.position);
      if (!inside && camera.position.distanceToSquared(roomGroup.position) > ROOM_PROXIMITY_SQ) {
        if (fogBlend > 0) {
          updateAtmosphere(dt, camera);
        }
        return;
      }
    }

    // 1. Dao động ngọn đèn dầu sắp tắt trước gió bằng Math.sin(time)
    const flicker =
      Math.sin(elapsedTime * 7.4) * 0.55 +
      Math.sin(elapsedTime * 16.9) * 0.32 +
      Math.sin(elapsedTime * 3.1) * 0.22;
    oilLampLight.intensity = 3.25 + flicker;
    flameMesh.scale.set(
      1.0 + Math.sin(elapsedTime * 19.0) * 0.08,
      1.0 + flicker * 0.16,
      1.0 + Math.cos(elapsedTime * 15.0) * 0.08
    );

    // 2. Nhịp thở nhẹ của God Rays trên tượng trung tâm
    godRayMatInner.opacity = 0.31 + Math.sin(elapsedTime * 1.4) * 0.04;
    godRayMatOuter.opacity = 0.15 + Math.cos(elapsedTime * 1.1) * 0.025;

    // 3. Chuyển động bụi lơ lửng trong luồng sáng God Rays
    const dAttr = dustGeo.attributes.position;
    const dArr = dAttr.array;
    for (let i = 0; i < dustCount; i++) {
      const i3 = i * 3;
      const ph = dustPhases[i];
      dArr[i3] += Math.sin(elapsedTime * 0.55 + ph) * 0.0028;
      dArr[i3 + 1] -= dt * 0.14;
      dArr[i3 + 2] += Math.cos(elapsedTime * 0.48 + ph) * 0.0028;
      if (dArr[i3 + 1] < 1.15) {
        dArr[i3 + 1] = 8.05;
      }
    }
    dAttr.needsUpdate = true;

    // 4. Đom đóm & tàn lửa lập lòe trong bóng tối lũy tre
    const fAttr = ffGeo.attributes.position;
    const fArr = fAttr.array;
    for (let i = 0; i < fireflyCount; i++) {
      const i3 = i * 3;
      const ph = ffPhases[i];
      fArr[i3] = ffBase[i3] + Math.sin(elapsedTime * 0.9 + ph) * 0.45;
      fArr[i3 + 1] = ffBase[i3 + 1] + Math.sin(elapsedTime * 1.3 + ph * 1.7) * 0.32;
      fArr[i3 + 2] = ffBase[i3 + 2] + Math.cos(elapsedTime * 0.8 + ph * 1.3) * 0.45;
    }
    fAttr.needsUpdate = true;
    ffMat.opacity = 0.55 + (Math.sin(elapsedTime * 3.8) * 0.5 + 0.5) * 0.4;

    // 5. Đồng bộ hiệu ứng sương mù u tối khi vào phòng
    updateAtmosphere(dt, camera);
  }

  // =========================================================================
  // 9. TÍCH HỢP CỔNG DỊCH CHUYỂN & THẾ GIỚI TRONG TRUYỆN LÀNG ĐÔNG XÁ
  // =========================================================================
  const realmController = createTatDenStoryRealm({
    roomGroup,
    interiorGroup,
    mainScene,
    realmScene,
    normalizeModelToHeight
  });

  /** Dọn dẹp toàn bộ Geometry, Material và CanvasTexture để tránh rò rỉ VRAM */
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
      if (obj.userData?.isSharedCachedAsset) return;
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
  roomGroup.startRealmTour = realmController.startRealmTour;
  roomGroup.stopRealmTour = realmController.stopRealmTour;
  roomGroup.isInsideRealm = realmController.isInsideRealm;
  roomGroup.teleportBook = realmController.portalClickProxy;
  roomGroup.update = updateRoomAndPortal;
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
    roomId: 'tat_den',
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
