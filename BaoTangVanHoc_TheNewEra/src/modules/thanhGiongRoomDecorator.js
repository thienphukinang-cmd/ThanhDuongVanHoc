import * as THREE from 'three';
import { loadGlbCached, sanitizeGeometryBuffers } from '../utils/modelLoaderHelper.js';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger.js';
import { createThanhGiongStoryRealm } from './thanhGiongStoryRealm.js';

/**
 * ============================================================================
 * PHÒNG TRƯNG BÀY PHÙ ĐỔNG THIÊN VƯƠNG – THÁNH GIÓNG (TẦNG 1 • PHÒNG 101)
 * Phong cách Văn Lang – Âu Lạc & Đông Sơn (Hùng Vương Bronze Age)
 * Chuẩn kích thước bảo tàng: 25.6m x 27.6m x 8.4m, Vòm cửa 4.6m
 * ============================================================================
 */

const ROOM_W = 25.6;
const ROOM_D = 27.6;
const ROOM_H = 8.4;
const ARCH_H = 4.6;

const PALETTE = {
  obsidianSlate: 0x161c22,
  darkBasalt: 0x101418,
  bronzePatina: 0x5c4b2c,
  agedBronze: 0xc59b27,
  royalCrimson: 0x7c1914,
  emberOrange: 0xff4500,
  godRayAmber: 0xf7b955,
  ivoryBamboo: 0xe6b800,
  bambooLeaf: 0x729622,
  forgedIron: 0x3a404a
};

function createSeededRandom(seed = 1010) {
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

function makeCanvasTex(canvas, { repeatX = 1, repeatY = 1, srgb = true, disposables = [] } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : (THREE.LinearSRGBColorSpace || THREE.NoColorSpace);
  tex.needsUpdate = true;
  disposables.push(tex);
  return tex;
}

/** Chuyển Heightmap Canvas sang Tangent-Space Normal Map chuẩn LinearSRGBColorSpace */
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

  for (let y = 0; y < h; y++) {
    const yUp = ((y - 1 + h) % h) * w;
    const yDown = ((y + 1) % h) * w;
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const xL = (x - 1 + w) % w;
      const xR = (x + 1) % w;
      let dx = ((src[(row + xL) * 4] - src[(row + xR) * 4]) / 255) * strength;
      let dy = ((src[(yUp + x) * 4] - src[(yDown + x) * 4]) / 255) * strength;
      let dz = 1.0;
      const invLen = 1.0 / Math.hypot(dx, dy, dz);
      dx *= invLen;
      dy *= invLen;
      dz *= invLen;
      const idx = (row + x) * 4;
      dst[idx] = Math.round((dx * 0.5 + 0.5) * 255);
      dst[idx + 1] = Math.round((dy * 0.5 + 0.5) * 255);
      dst[idx + 2] = Math.round((dz * 0.5 + 0.5) * 255);
      dst[idx + 3] = 255;
    }
  }
  nCtx.putImageData(dstImg, 0, 0);
  return makeCanvasTex(nCanvas, { repeatX, repeatY, srgb: false, disposables });
}

/** Tạo bộ Texture sàn, tường Mặt Trống Đồng Ngọc Lũ, tia sáng & hạt dùng chung */
function createDongSonTextures(disposables) {
  const rng = createSeededRandom(1202);

  // 1. Sàn đá đen huyền vũ có mạch đồng (#c59b27)
  const fSize = 256;
  const floorC = document.createElement('canvas');
  floorC.width = floorC.height = fSize;
  const fCtx = floorC.getContext('2d');
  const floorHC = document.createElement('canvas');
  floorHC.width = floorHC.height = fSize;
  const fhCtx = floorHC.getContext('2d');

  fCtx.fillStyle = '#12161b';
  fCtx.fillRect(0, 0, fSize, fSize);
  fhCtx.fillStyle = '#707070';
  fhCtx.fillRect(0, 0, fSize, fSize);

  const cell = fSize / 2;
  for (let gx = 0; gx < 2; gx++) {
    for (let gy = 0; gy < 2; gy++) {
      const bx = gx * cell;
      const by = gy * cell;
      const v = 22 + Math.floor(rng() * 10);
      fCtx.fillStyle = `rgb(${v}, ${v + 4}, ${v + 8})`;
      fCtx.fillRect(bx + 3, by + 3, cell - 6, cell - 6);
      fCtx.strokeStyle = 'rgba(197, 155, 39, 0.28)';
      fCtx.lineWidth = 2;
      fCtx.strokeRect(bx + 6, by + 6, cell - 12, cell - 12);

      fhCtx.fillStyle = '#9c9c9c';
      fhCtx.fillRect(bx + 3, by + 3, cell - 6, cell - 6);
      fhCtx.strokeStyle = '#323232';
      fhCtx.lineWidth = 4;
      fhCtx.strokeRect(bx + 2, by + 2, cell - 4, cell - 4);
    }
  }

  // 2. Tường phù điêu Đông Sơn (Mặt Trống Đồng Ngọc Lũ, vòng tròn tiếp tuyến & mây lửa)
  const wSize = 512;
  const wallC = document.createElement('canvas');
  wallC.width = wallC.height = wSize;
  const wCtx = wallC.getContext('2d');
  const wallHC = document.createElement('canvas');
  wallHC.width = wallHC.height = wSize;
  const whCtx = wallHC.getContext('2d');

  wCtx.fillStyle = '#171d23';
  wCtx.fillRect(0, 0, wSize, wSize);
  whCtx.fillStyle = '#606060';
  whCtx.fillRect(0, 0, wSize, wSize);

  const cx = wSize * 0.5;
  const cy = wSize * 0.5;
  wCtx.strokeStyle = 'rgba(197, 155, 39, 0.24)';
  whCtx.strokeStyle = '#d8d8d8';
  [54, 108, 162, 212].forEach((r, idx) => {
    wCtx.lineWidth = idx === 3 ? 6 : 3;
    wCtx.beginPath();
    wCtx.arc(cx, cy, r, 0, Math.PI * 2);
    wCtx.stroke();

    whCtx.lineWidth = idx === 3 ? 8 : 4;
    whCtx.beginPath();
    whCtx.arc(cx, cy, r, 0, Math.PI * 2);
    whCtx.stroke();
  });

  // Ngôi sao 12 cánh Ngọc Lũ ở tâm ô phù điêu
  wCtx.fillStyle = 'rgba(197, 155, 39, 0.18)';
  whCtx.fillStyle = '#e5e5e5';
  const rays = 12;
  wCtx.beginPath();
  whCtx.beginPath();
  for (let i = 0; i < rays * 2; i++) {
    const rad = i % 2 === 0 ? 50 : 20;
    const a = (i / (rays * 2)) * Math.PI * 2;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    if (i === 0) {
      wCtx.moveTo(px, py);
      whCtx.moveTo(px, py);
    } else {
      wCtx.lineTo(px, py);
      whCtx.lineTo(px, py);
    }
  }
  wCtx.closePath();
  wCtx.fill();
  wCtx.stroke();
  whCtx.closePath();
  whCtx.fill();

  // Viền hồi văn chữ S / răng cưa
  wCtx.strokeStyle = 'rgba(197, 155, 39, 0.22)';
  whCtx.strokeStyle = '#bcbcbc';
  wCtx.lineWidth = 3;
  whCtx.lineWidth = 4;
  for (let x = 16; x < wSize; x += 32) {
    wCtx.strokeRect(x, 14, 20, 20);
    whCtx.strokeRect(x, 14, 20, 20);
    wCtx.strokeRect(x, wSize - 34, 20, 20);
    whCtx.strokeRect(x, wSize - 34, 20, 20);
  }

  // 3. God Ray vertical gradient
  const rayC = document.createElement('canvas');
  rayC.width = 64;
  rayC.height = 128;
  const rCtx = rayC.getContext('2d');
  const rGrad = rCtx.createLinearGradient(0, 0, 0, 128);
  rGrad.addColorStop(0.0, 'rgba(255, 224, 140, 0.0)');
  rGrad.addColorStop(0.18, 'rgba(255, 204, 102, 0.58)');
  rGrad.addColorStop(0.72, 'rgba(255, 118, 36, 0.22)');
  rGrad.addColorStop(1.0, 'rgba(255, 69, 0, 0.0)');
  rCtx.fillStyle = rGrad;
  rCtx.fillRect(0, 0, 64, 128);

  // 4. Soft ember/dust sprite
  const ptC = document.createElement('canvas');
  ptC.width = 64;
  ptC.height = 64;
  const pCtx = ptC.getContext('2d');
  const pGrad = pCtx.createRadialGradient(32, 32, 0, 32, 32, 30);
  pGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  pGrad.addColorStop(0.35, 'rgba(255, 168, 76, 0.72)');
  pGrad.addColorStop(1.0, 'rgba(255, 69, 0, 0.0)');
  pCtx.fillStyle = pGrad;
  pCtx.fillRect(0, 0, 64, 64);

  return {
    floorDiffuse: makeCanvasTex(floorC, { repeatX: 6, repeatY: 6, srgb: true, disposables }),
    floorNormal: heightCanvasToLinearNormalMap(floorHC, 2.4, 6, 6, disposables),
    wallDiffuse: makeCanvasTex(wallC, { repeatX: 4, repeatY: 2, srgb: true, disposables }),
    wallNormal: heightCanvasToLinearNormalMap(wallHC, 2.8, 4, 2, disposables),
    godRayTex: makeCanvasTex(rayC, { srgb: true, disposables }),
    particleTex: makeCanvasTex(ptC, { srgb: true, disposables })
  };
}

/** Tạo biển đồng khắc chữ Quốc ngữ cổ truyền */
function createBronzePlaqueTexture(title, subtitle, bodyLines = [], { width = 512, height = 160 } = {}, disposables = []) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, width, height);
  g.addColorStop(0, '#1f1810');
  g.addColorStop(0.5, '#3b2c16');
  g.addColorStop(1, '#18130d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#c59b27';
  ctx.lineWidth = 4;
  ctx.strokeRect(8, 8, width - 16, height - 16);
  ctx.strokeStyle = 'rgba(255, 224, 130, 0.45)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(14, 14, width - 28, height - 28);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fde68a';
  ctx.font = `bold ${bodyLines.length > 0 ? 22 : 24}px "Times New Roman", serif`;
  ctx.fillText(title, width * 0.5, bodyLines.length > 0 ? 44 : height * 0.44);

  if (subtitle) {
    ctx.fillStyle = '#f5d08a';
    ctx.font = `italic ${bodyLines.length > 0 ? 15 : 16}px Georgia, serif`;
    ctx.fillText(subtitle, width * 0.5, bodyLines.length > 0 ? 72 : height * 0.72);
  }

  if (bodyLines.length > 0) {
    ctx.fillStyle = '#fef3c7';
    ctx.font = '15px Georgia, serif';
    const startY = 108;
    const step = Math.min(28, (height - 122) / Math.max(1, bodyLines.length));
    bodyLines.forEach((line, idx) => {
      ctx.fillText(line, width * 0.5, startY + idx * step);
    });
  }

  return makeCanvasTex(c, { srgb: true, disposables });
}

// =============================================================================
// PHÙ ĐIÊU ĐÔNG SƠN 3D (EXTRUDEGEOMETRY): MẶT TRỐNG NGỌC LŨ, CHIM LẠC, MÂY LỬA
// =============================================================================
function createNgocLuStarMedallion3D(bronzeMat, darkBronzeMat, scale = 1.0) {
  const g = new THREE.Group();
  const starShape = new THREE.Shape();
  const rays = 12;
  for (let i = 0; i < rays * 2; i++) {
    const r = i % 2 === 0 ? 0.82 : 0.34;
    const a = (i / (rays * 2)) * Math.PI * 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) starShape.moveTo(x, y);
    else starShape.lineTo(x, y);
  }
  starShape.closePath();

  const starGeo = prepGeo(new THREE.ExtrudeGeometry(starShape, {
    steps: 1,
    depth: 0.06,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.014,
    bevelSegments: 1,
    curveSegments: 4
  }));
  const starMesh = new THREE.Mesh(starGeo, bronzeMat);
  starMesh.userData.ignoreRaycaster = true;
  g.add(starMesh);

  [0.95, 1.25].forEach((radius, idx) => {
    const ring = new THREE.Mesh(
      prepGeo(new THREE.TorusGeometry(radius, idx === 0 ? 0.045 : 0.06, 6, 18)),
      idx === 0 ? darkBronzeMat : bronzeMat
    );
    ring.position.z = 0.03;
    ring.userData.ignoreRaycaster = true;
    g.add(ring);
  });

  g.scale.setScalar(scale);
  return g;
}

function createLacBirdRelief3D(bronzeMat, { scale = 1.0, flipX = false } = {}) {
  const shape = new THREE.Shape();
  // Thân chim Lạc mỏ dài, mào vút cong & cánh sải rộng theo chiều ngược kim đồng hồ
  shape.moveTo(-0.55, 0.02);
  shape.lineTo(-0.12, 0.10);
  shape.bezierCurveTo(0.02, 0.28, 0.22, 0.34, 0.38, 0.18);
  shape.lineTo(0.68, 0.24);
  shape.lineTo(0.32, 0.08);
  shape.bezierCurveTo(0.18, -0.05, 0.02, -0.18, -0.22, -0.08);
  shape.lineTo(-0.58, -0.18);
  shape.lineTo(-0.40, -0.02);
  shape.closePath();

  const geo = prepGeo(new THREE.ExtrudeGeometry(shape, {
    steps: 1,
    depth: 0.045,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.01,
    bevelSegments: 1,
    curveSegments: 5
  }));
  const mesh = new THREE.Mesh(geo, bronzeMat);
  mesh.scale.set(flipX ? -scale : scale, scale, scale);
  mesh.userData.ignoreRaycaster = true;
  return mesh;
}

function createDongSonFireCloudRelief3D(bronzeMat, crimsonMat, width = 3.2) {
  const g = new THREE.Group();
  const unitW = 0.8;
  const count = Math.max(2, Math.round(width / unitW));

  const scrollShape = new THREE.Shape();
  scrollShape.moveTo(-0.38, -0.08);
  scrollShape.bezierCurveTo(-0.24, 0.22, -0.06, 0.22, 0.02, 0.04);
  scrollShape.bezierCurveTo(0.12, 0.26, 0.28, 0.26, 0.38, -0.02);
  scrollShape.lineTo(0.38, -0.12);
  scrollShape.closePath();

  const scrollGeo = prepGeo(new THREE.ExtrudeGeometry(scrollShape, {
    steps: 1,
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.01,
    bevelSegments: 1,
    curveSegments: 4
  }));

  const startX = -((count - 1) * unitW) * 0.5;
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(scrollGeo, bronzeMat);
    m.position.set(startX + i * unitW, 0, 0);
    m.userData.ignoreRaycaster = true;
    g.add(m);
  }
  const bar = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(count * unitW + 0.14, 0.07, 0.07)), crimsonMat);
  bar.position.set(0, -0.12, 0);
  bar.userData.ignoreRaycaster = true;
  g.add(bar);
  return g;
}

// =============================================================================
// FALLBACK PROCEDURAL MESHES CHO 3 HIỆN VẬT GLB
// =============================================================================
function buildVillageRelicsFallback(basaltMat, bronzeMat, bambooMat) {
  const g = new THREE.Group();
  // Tảng đá cổ in dấu chân khổng lồ
  const rock = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(1.15, 0.24, 0.88)), basaltMat);
  rock.position.set(-0.25, 0.12, 0);
  g.add(rock);

  const footprint = new THREE.Mesh(
    prepGeo(new THREE.CylinderGeometry(0.18, 0.14, 0.05, 10).scale(0.85, 1, 1.8)),
    bronzeMat
  );
  footprint.position.set(-0.25, 0.23, 0);
  g.add(footprint);

  // Nia tre & 7 nong cơm 3 nong cà
  const nia = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.42, 0.34, 0.08, 12)), bambooMat);
  nia.position.set(0.38, 0.06, 0.06);
  g.add(nia);

  const riceMat = new THREE.MeshStandardMaterial({ color: 0xf5f0dc, roughness: 0.72, side: THREE.FrontSide });
  const eggMat = new THREE.MeshStandardMaterial({ color: 0x7c1914, roughness: 0.45, side: THREE.FrontSide });
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const rx = 0.38 + (i === 0 ? 0 : Math.cos(a) * 0.20);
    const rz = 0.06 + (i === 0 ? 0 : Math.sin(a) * 0.20);
    const bowl = new THREE.Mesh(prepGeo(new THREE.SphereGeometry(0.08, 8, 6)), riceMat);
    bowl.scale.set(1, 0.65, 1);
    bowl.position.set(rx, 0.13, rz);
    g.add(bowl);
  }
  for (let j = 0; j < 3; j++) {
    const ca = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.065, 0.045, 0.055, 8)), eggMat);
    ca.position.set(0.24 + j * 0.14, 0.13, -0.24);
    g.add(ca);
  }
  return g;
}

function buildForgeRelicsFallback(ironMat, bronzeMat, emberMat) {
  const g = new THREE.Group();
  const anvil = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(0.85, 0.34, 0.48)), ironMat);
  anvil.position.set(0, 0.17, 0);
  g.add(anvil);

  const coals = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.34, 0.38, 0.10, 10)), emberMat);
  coals.position.set(-0.42, 0.05, 0.18);
  g.add(coals);

  // Loa đồng sứ giả
  const horn = new THREE.Mesh(prepGeo(new THREE.ConeGeometry(0.14, 0.54, 10)), bronzeMat);
  horn.rotation.z = Math.PI * 0.42;
  horn.position.set(-0.18, 0.42, -0.05);
  g.add(horn);

  // Roi sắt & giáp sắt nung đỏ
  const rod = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.032, 0.042, 0.92, 8)), ironMat);
  rod.rotation.z = Math.PI * 0.46;
  rod.position.set(0.12, 0.39, 0.12);
  g.add(rod);

  const chestPlate = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(0.34, 0.42, 0.20)), emberMat);
  chestPlate.position.set(0.22, 0.52, -0.08);
  g.add(chestPlate);
  return g;
}

function buildGiongHeroFallback(ironMat, bronzeMat, bambooMat, targetHeight = 3.85) {
  const g = new THREE.Group();
  const horseBody = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(0.85, 0.85, 2.0)), ironMat);
  horseBody.position.set(0, 1.35, 0);
  horseBody.rotation.x = -0.35;
  g.add(horseBody);

  const horseNeck = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.22, 0.36, 0.95, 8)), ironMat);
  horseNeck.position.set(0, 1.98, 0.85);
  horseNeck.rotation.x = 0.42;
  g.add(horseNeck);

  [[-0.32, 0.72, -0.75], [0.32, 0.72, -0.75]].forEach(([lx, ly, lz]) => {
    const leg = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.09, 0.07, 1.35, 8)), ironMat);
    leg.position.set(lx, ly, lz);
    g.add(leg);
  });
  [[-0.32, 1.25, 0.72], [0.32, 1.25, 0.72]].forEach(([lx, ly, lz]) => {
    const leg = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.09, 0.07, 0.95, 8)), ironMat);
    leg.position.set(lx, ly, lz);
    leg.rotation.x = -0.65;
    g.add(leg);
  });

  const torso = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.28, 0.34, 0.98, 8)), bronzeMat);
  torso.position.set(0, 2.25, 0.05);
  g.add(torso);

  const head = new THREE.Mesh(prepGeo(new THREE.SphereGeometry(0.20, 8, 6)), bronzeMat);
  head.position.set(0, 2.86, 0.12);
  g.add(head);

  const bambooWeapon = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.05, 0.07, 2.5, 6)), bambooMat);
  bambooWeapon.position.set(0.45, 2.65, 0.35);
  bambooWeapon.rotation.z = -0.25;
  bambooWeapon.rotation.x = 0.25;
  g.add(bambooWeapon);

  const scale = targetHeight / 3.9;
  g.scale.setScalar(scale);
  return g;
}

/** Tạo bục trưng bày chuẩn bảo tàng kèm biển tên đồng cổ */
function buildCuratedPedestal({
  width,
  depth,
  height,
  basaltMat,
  bronzeMat,
  crimsonMat,
  title,
  subtitle,
  disposables
}) {
  const ped = new THREE.Group();
  ped.userData.ignoreRaycaster = true;

  const plinth = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(width + 0.24, 0.16, depth + 0.24)), basaltMat);
  plinth.position.y = 0.08;
  ped.add(plinth);

  const shaftH = Math.max(0.3, height - 0.28);
  const shaft = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(width, shaftH, depth)), crimsonMat);
  shaft.position.y = 0.16 + shaftH * 0.5;
  ped.add(shaft);

  const cap = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(width + 0.18, 0.12, depth + 0.18)), bronzeMat);
  cap.position.y = 0.16 + shaftH + 0.06;
  ped.add(cap);

  mergeGroupMeshesByMaterial(ped, {
    disposeSources: true,
    castShadow: false,
    receiveShadow: false
  });

  if (title) {
    const tex = createBronzePlaqueTexture(title, subtitle, [], { width: 512, height: 128 }, disposables);
    const plaque = new THREE.Mesh(
      prepGeo(new THREE.PlaneGeometry(Math.min(width * 0.88, 1.45), 0.34)),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.40, metalness: 0.35, side: THREE.FrontSide })
    );
    plaque.position.set(0, 0.16 + shaftH * 0.62, depth * 0.5 + 0.015);
    plaque.castShadow = false;
    plaque.receiveShadow = false;
    ped.add(plaque);
  }
  return ped;
}

function localToWorldVec(interiorGroup, lx, ly, lz) {
  interiorGroup.updateMatrixWorld(true);
  return interiorGroup.localToWorld(new THREE.Vector3(lx, ly, lz));
}

// =============================================================================
// HÀM XÂY DỰNG TOÀN DIỆN PHÒNG 101: THÁNH GIÓNG – PHÙ ĐỔNG THIÊN VƯƠNG
// =============================================================================
export function buildThanhGiongExhibition({
  roomCenter = new THREE.Vector3(-48.0, 0.0, 19.0),
  mainScene = null,
  realmScene = null,
  cameraManager = null
} = {}) {
  const disposables = [];
  const textures = createDongSonTextures(disposables);

  const roomGroup = new THREE.Group();
  roomGroup.name = 'ThanhGiong_DongSon_Exhibition_Room101';
  roomGroup.position.copy(roomCenter);

  const interiorGroup = new THREE.Group();
  interiorGroup.name = 'ThanhGiong_Interior_Group';
  // Cánh Tây (+X hướng ra đại sảnh): xoay +PI/2 để local +Z hướng ra cửa vòm X = -34.0
  interiorGroup.rotation.y = roomCenter.x < 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
  roomGroup.add(interiorGroup);

  // Vật liệu PBR Đông Sơn chuẩn hóa (FrontSide, không ShadowMap nặng)
  const floorMat = new THREE.MeshStandardMaterial({
    map: textures.floorDiffuse,
    normalMap: textures.floorNormal,
    roughness: 0.72,
    metalness: 0.22,
    side: THREE.FrontSide
  });
  const wallReliefMat = new THREE.MeshStandardMaterial({
    map: textures.wallDiffuse,
    normalMap: textures.wallNormal,
    normalScale: new THREE.Vector2(1.4, 1.4),
    roughness: 0.58,
    metalness: 0.35,
    side: THREE.FrontSide
  });
  const basaltMat = new THREE.MeshStandardMaterial({
    color: PALETTE.obsidianSlate,
    roughness: 0.78,
    metalness: 0.14,
    side: THREE.FrontSide
  });
  const patinaMat = new THREE.MeshStandardMaterial({
    color: PALETTE.bronzePatina,
    roughness: 0.44,
    metalness: 0.62,
    side: THREE.FrontSide
  });
  const bronzeMat = new THREE.MeshStandardMaterial({
    color: PALETTE.agedBronze,
    roughness: 0.26,
    metalness: 0.86,
    emissive: 0x3b2605,
    emissiveIntensity: 0.24,
    side: THREE.FrontSide
  });
  const crimsonMat = new THREE.MeshStandardMaterial({
    color: PALETTE.royalCrimson,
    roughness: 0.36,
    metalness: 0.22,
    side: THREE.FrontSide
  });
  const ironMat = new THREE.MeshStandardMaterial({
    color: PALETTE.forgedIron,
    roughness: 0.34,
    metalness: 0.85,
    side: THREE.FrontSide
  });
  const bambooMat = new THREE.MeshStandardMaterial({
    color: PALETTE.ivoryBamboo,
    roughness: 0.42,
    metalness: 0.22,
    side: THREE.FrontSide
  });
  const leafMat = new THREE.MeshStandardMaterial({
    color: PALETTE.bambooLeaf,
    roughness: 0.58,
    metalness: 0.08,
    side: THREE.FrontSide
  });
  const forgeCoalMat = new THREE.MeshStandardMaterial({
    color: 0x2b0a05,
    emissive: PALETTE.emberOrange,
    emissiveIntensity: 1.35,
    roughness: 0.65,
    side: THREE.FrontSide
  });
  const hoofEmberMat = new THREE.MeshStandardMaterial({
    color: 0x3a0c04,
    emissive: PALETTE.emberOrange,
    emissiveIntensity: 1.5,
    roughness: 0.55,
    side: THREE.FrontSide
  });

  const solidObstacleObjects = [];

  // =========================================================================
  // 1. KIẾN TRÚC PHÒNG VĂN LANG – ĐÔNG SƠN (TÊN VỎ KHỚP CULLING CHÍNH CỦA MAIN.JS)
  // =========================================================================
  const floor = new THREE.Mesh(prepGeo(new THREE.PlaneGeometry(ROOM_W, ROOM_D)), floorMat);
  floor.name = 'ThanhGiong_SlateStone_Floor';
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0.025;
  floor.castShadow = false;
  floor.receiveShadow = false;
  floor.userData.isWalkableFloor = true;
  interiorGroup.add(floor);

  const walkway = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(4.4, 0.032, 24.4)), basaltMat);
  walkway.name = 'ThanhGiong_Walkway_Floor';
  walkway.position.set(0, 0.032, 1.5);
  walkway.userData.isWalkableFloor = true;
  interiorGroup.add(walkway);

  const walkwayTrim = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(4.74, 0.02, 24.4)), bronzeMat);
  walkwayTrim.name = 'ThanhGiong_Walkway_Trim';
  walkwayTrim.position.set(0, 0.024, 1.5);
  walkwayTrim.userData.ignoreRaycaster = true;
  interiorGroup.add(walkwayTrim);

  // Trần giếng trời (bát giác tại Z = -1.2 phía trên tượng Phù Đổng)
  const ceilingGroup = new THREE.Group();
  ceilingGroup.name = 'ThanhGiong_Vaulted_Ceiling';
  ceilingGroup.userData.ignoreRaycaster = true;

  const frontCeil = new THREE.Mesh(prepGeo(new THREE.PlaneGeometry(ROOM_W, 11.4)), basaltMat);
  frontCeil.name = 'ThanhGiong_Ceiling_Front';
  frontCeil.rotation.x = Math.PI / 2;
  frontCeil.position.set(0, ROOM_H, 8.1);
  ceilingGroup.add(frontCeil);

  const rearCeil = new THREE.Mesh(prepGeo(new THREE.PlaneGeometry(ROOM_W, 9.8)), basaltMat);
  rearCeil.name = 'ThanhGiong_Ceiling_Rear';
  rearCeil.rotation.x = Math.PI / 2;
  rearCeil.position.set(0, ROOM_H, -8.9);
  ceilingGroup.add(rearCeil);

  const leftCeil = new THREE.Mesh(prepGeo(new THREE.PlaneGeometry(9.6, 6.4)), basaltMat);
  leftCeil.name = 'ThanhGiong_Ceiling_Left';
  leftCeil.rotation.x = Math.PI / 2;
  leftCeil.position.set(-8.0, ROOM_H, -0.8);
  ceilingGroup.add(leftCeil);

  const rightCeil = new THREE.Mesh(prepGeo(new THREE.PlaneGeometry(9.6, 6.4)), basaltMat);
  rightCeil.name = 'ThanhGiong_Ceiling_Right';
  rightCeil.rotation.x = Math.PI / 2;
  rightCeil.position.set(8.0, ROOM_H, -0.8);
  ceilingGroup.add(rightCeil);

  const oculusRim = new THREE.Mesh(prepGeo(new THREE.TorusGeometry(2.45, 0.16, 6, 8)), bronzeMat);
  oculusRim.name = 'ThanhGiong_Ceiling_OculusRim';
  oculusRim.rotation.x = Math.PI / 2;
  oculusRim.position.set(0, ROOM_H - 0.06, -1.2);
  ceilingGroup.add(oculusRim);
  interiorGroup.add(ceilingGroup);

  // Hệ vì kèo mái cong hình mũi thuyền & họa tiết đuôi công (gộp mesh theo vật liệu)
  const raftersGroup = new THREE.Group();
  raftersGroup.name = 'ThanhGiong_BoatProw_Rafters';
  raftersGroup.userData.ignoreRaycaster = true;

  const prowShape = new THREE.Shape();
  prowShape.moveTo(-11.8, 0.35);
  prowShape.quadraticCurveTo(-8.2, -0.15, 0, -0.18);
  prowShape.quadraticCurveTo(8.2, -0.15, 11.8, 0.35);
  prowShape.lineTo(11.4, 0.62);
  prowShape.quadraticCurveTo(7.8, 0.12, 0, 0.10);
  prowShape.quadraticCurveTo(-7.8, 0.12, -11.4, 0.62);
  prowShape.closePath();

  const prowBeamGeo = prepGeo(new THREE.ExtrudeGeometry(prowShape, {
    steps: 1,
    depth: 0.28,
    bevelEnabled: false,
    curveSegments: 8
  }));
  const peacockGeo = prepGeo(new THREE.OctahedronGeometry(0.18, 0).scale(0.65, 1.4, 0.32));

  [-9.2, -4.6, 4.6, 9.2].forEach((rz) => {
    const beam = new THREE.Mesh(prowBeamGeo, patinaMat);
    beam.position.set(0, ROOM_H - 0.72, rz - 0.14);
    raftersGroup.add(beam);

    [-9.6, -5.2, 5.2, 9.6].forEach((px) => {
      const feather = new THREE.Mesh(peacockGeo, bronzeMat);
      feather.position.set(px, ROOM_H - 0.88, rz);
      raftersGroup.add(feather);
    });
  });

  raftersGroup.updateMatrixWorld(true);
  mergeGroupMeshesByMaterial(raftersGroup, {
    disposeSources: true,
    castShadow: false,
    receiveShadow: false
  });
  interiorGroup.add(raftersGroup);

  // Tường bao kiến trúc chính (giữ tên Wall/Pier/Lintel để main.js không cull lớp vỏ ngoài)
  const leftWall = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(0.5, ROOM_H + 1.4, 26.8)), wallReliefMat);
  leftWall.name = 'ThanhGiong_Wall_Left';
  leftWall.position.set(-12.1, (ROOM_H + 1.4) * 0.5, 0.5);
  interiorGroup.add(leftWall);

  const rightWall = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(0.5, ROOM_H + 1.4, 26.8)), wallReliefMat);
  rightWall.name = 'ThanhGiong_Wall_Right';
  rightWall.position.set(12.1, (ROOM_H + 1.4) * 0.5, 0.5);
  interiorGroup.add(rightWall);

  const backWall = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(25.4, ROOM_H + 1.6, 0.6)), wallReliefMat);
  backWall.name = 'ThanhGiong_Wall_Back';
  backWall.position.set(0, (ROOM_H + 1.6) * 0.5, -12.45);
  interiorGroup.add(backWall);

  const frontPierL = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(9.6, ROOM_H + 1.4, 0.36)), wallReliefMat);
  frontPierL.name = 'ThanhGiong_FrontPier_Left';
  frontPierL.position.set(-8.0, (ROOM_H + 1.4) * 0.5, ROOM_D * 0.5 - 0.15);
  interiorGroup.add(frontPierL);

  const frontPierR = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(9.6, ROOM_H + 1.4, 0.36)), wallReliefMat);
  frontPierR.name = 'ThanhGiong_FrontPier_Right';
  frontPierR.position.set(8.0, (ROOM_H + 1.4) * 0.5, ROOM_D * 0.5 - 0.15);
  interiorGroup.add(frontPierR);

  const frontLintel = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(6.4, ROOM_H + 1.4 - ARCH_H, 0.36)), patinaMat);
  frontLintel.name = 'ThanhGiong_FrontLintel';
  frontLintel.position.set(0, ARCH_H + (ROOM_H + 1.4 - ARCH_H) * 0.5, ROOM_D * 0.5 - 0.15);
  interiorGroup.add(frontLintel);

  // Phù điêu Mặt Trống Đồng Ngọc Lũ, Chim Lạc & Mây Lửa gắn tường (tên WallRelief -> tự cull khi xa)
  const wallReliefsGroup = new THREE.Group();
  wallReliefsGroup.name = 'ThanhGiong_WallReliefs_Group';
  wallReliefsGroup.userData.ignoreRaycaster = true;

  const backMedallion = createNgocLuStarMedallion3D(bronzeMat, patinaMat, 1.45);
  backMedallion.position.set(0, 6.2, -12.05);
  wallReliefsGroup.add(backMedallion);

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const lac = createLacBirdRelief3D(bronzeMat, { scale: 0.72 });
    lac.position.set(Math.cos(a) * 2.25, 6.2 + Math.sin(a) * 2.25, -12.0);
    lac.rotation.z = a + Math.PI * 0.5;
    wallReliefsGroup.add(lac);
  }

  [-11.75, 11.75].forEach((wx) => {
    const trim = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(0.16, 0.22, 26.0)), bronzeMat);
    trim.position.set(wx, ROOM_H - 0.24, 0.5);
    wallReliefsGroup.add(trim);

    const cloudFrieze = createDongSonFireCloudRelief3D(bronzeMat, crimsonMat, 8.8);
    cloudFrieze.position.set(wx, 6.85, 0.5);
    cloudFrieze.rotation.y = wx < 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
    wallReliefsGroup.add(cloudFrieze);
  });

  wallReliefsGroup.updateMatrixWorld(true);
  mergeGroupMeshesByMaterial(wallReliefsGroup, {
    disposeSources: true,
    castShadow: false,
    receiveShadow: false
  });
  interiorGroup.add(wallReliefsGroup);

  // Cổng vào Văn Lang mái cong mũi thuyền cao 4.6m (Z = +13.25)
  const entranceGate = new THREE.Group();
  entranceGate.name = 'ThanhGiong_EntranceArchway_4m6';
  entranceGate.position.set(0, 0, ROOM_D * 0.5 - 0.55);

  [-3.25, 3.25].forEach((gx) => {
    const plinth = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.42, 0.50, 0.32, 8)), basaltMat);
    plinth.position.set(gx, 0.16, 0);
    entranceGate.add(plinth);

    const post = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.28, 0.32, ARCH_H + 0.15, 12)), patinaMat);
    post.position.set(gx, (ARCH_H + 0.15) * 0.5 + 0.18, 0);
    entranceGate.add(post);

    const collar = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.35, 0.35, 0.20, 12)), bronzeMat);
    collar.position.set(gx, ARCH_H - 0.1, 0);
    entranceGate.add(collar);
    solidObstacleObjects.push(post);
  });

  const gateBeam = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(7.6, 0.45, 0.65)), patinaMat);
  gateBeam.position.set(0, ARCH_H + 0.25, 0);
  entranceGate.add(gateBeam);

  const gateEave = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(8.4, 0.18, 1.45)), basaltMat);
  gateEave.position.set(0, ARCH_H + 0.62, 0);
  entranceGate.add(gateEave);

  [-4.2, 4.2].forEach((hx) => {
    const horn = new THREE.Mesh(prepGeo(new THREE.ConeGeometry(0.24, 1.1, 6)), bronzeMat);
    horn.position.set(hx, ARCH_H + 0.92, 0);
    horn.rotation.z = hx < 0 ? 0.72 : -0.72;
    entranceGate.add(horn);
  });

  const gateSignTex = createBronzePlaqueTexture(
    'PHÙ ĐỔNG THIÊN VƯƠNG • THÁNH GIÓNG',
    'Anh Hùng Dựng Nước Văn Lang & Khí Phách Đánh Tan Giặc Ân',
    [],
    { width: 512, height: 128 },
    disposables
  );
  const gateSignMat = new THREE.MeshStandardMaterial({ map: gateSignTex, roughness: 0.38, metalness: 0.35, side: THREE.FrontSide });
  const gateSignGeo = prepGeo(new THREE.PlaneGeometry(4.8, 0.88));
  const gateSign = new THREE.Mesh(gateSignGeo, gateSignMat);
  gateSign.position.set(0, ARCH_H + 0.28, -0.36);
  gateSign.rotation.y = Math.PI;
  entranceGate.add(gateSign);

  const gateSignOuter = new THREE.Mesh(gateSignGeo, gateSignMat);
  gateSignOuter.position.set(0, ARCH_H + 0.28, 0.36);
  entranceGate.add(gateSignOuter);

  const gateLacL = createLacBirdRelief3D(bronzeMat, { scale: 0.65 });
  gateLacL.position.set(-2.9, ARCH_H + 0.85, -0.34);
  gateLacL.rotation.y = Math.PI;
  entranceGate.add(gateLacL);

  const gateLacR = createLacBirdRelief3D(bronzeMat, { scale: 0.65, flipX: true });
  gateLacR.position.set(2.9, ARCH_H + 0.85, -0.34);
  gateLacR.rotation.y = Math.PI;
  entranceGate.add(gateLacR);

  interiorGroup.add(entranceGate);

  // Hàng cột đồng cổ Bronze Patina (InstancedMesh)
  const pillarCoords = [
    [-9.8, 9.6], [-9.8, 3.6], [-9.8, -2.4], [-9.8, -8.4],
    [9.8, 9.6], [9.8, 3.6], [9.8, -2.4], [9.8, -8.4]
  ];
  const instCols = new THREE.InstancedMesh(prepGeo(new THREE.CylinderGeometry(0.25, 0.29, ROOM_H - 0.35, 10)), patinaMat, pillarCoords.length);
  const instColBases = new THREE.InstancedMesh(prepGeo(new THREE.CylinderGeometry(0.42, 0.48, 0.32, 8)), basaltMat, pillarCoords.length);
  const instColRings = new THREE.InstancedMesh(prepGeo(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 10)), bronzeMat, pillarCoords.length * 2);
  instCols.name = 'ThanhGiong_Colonnade_Shafts';
  instColBases.name = 'ThanhGiong_Colonnade_Bases';
  instColRings.name = 'ThanhGiong_Colonnade_Rings';
  [instCols, instColBases, instColRings].forEach((m) => {
    m.castShadow = false;
    m.receiveShadow = false;
    m.frustumCulled = true;
    m.userData.ignoreRaycaster = true;
  });

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

    const colProxy = new THREE.Mesh(
      prepGeo(new THREE.BoxGeometry(0.82, 4.0, 0.82)),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    colProxy.name = `ThanhGiong_PillarProxy_${idx}`;
    colProxy.position.set(px, 2.0, pz);
    interiorGroup.add(colProxy);
    solidObstacleObjects.push(colProxy);
  });
  instCols.instanceMatrix.needsUpdate = true;
  instColBases.instanceMatrix.needsUpdate = true;
  instColRings.instanceMatrix.needsUpdate = true;
  interiorGroup.add(instCols, instColBases, instColRings);

  // =========================================================================
  // 2. PHÂN KHU 1: LÀNG GIÓNG & THUỞ ẤU THƠ (X = -6.8, Z = +4.2)
  // =========================================================================
  const villageStation = new THREE.Group();
  villageStation.name = 'Station_ThanhGiong_Village';
  villageStation.position.set(-6.8, 0, 4.2);
  villageStation.rotation.y = 0.38;
  interiorGroup.add(villageStation);

  const villagePed = buildCuratedPedestal({
    width: 2.25,
    depth: 1.55,
    height: 0.92,
    basaltMat,
    bronzeMat,
    crimsonMat,
    title: 'LÀNG GIÓNG • THUỞ ẤU THƠ',
    subtitle: 'Dấu Chân Khổng Lồ, Nia Tre & Bảy Nong Cơm',
    disposables
  });
  villageStation.add(villagePed);
  solidObstacleObjects.push(villagePed);

  const villagePanelTex = createBronzePlaqueTexture(
    'TRUYỀN THUYẾT LÀNG PHÙ ĐỔNG',
    'Bà mẹ ra đồng ướm dấu chân khổng lồ rồi thụ thai sinh ra Gióng',
    [
      'Lên ba tuổi vẫn chưa biết nói cười, đặt đâu nằm đấy,',
      'nhưng khi nghe tiếng loa sứ giả tìm người tài đánh giặc,',
      'cậu bé bỗng cất tiếng nói đầu tiên đòi ra trận cứu nước.',
      'Cả làng góp gạo thổi bảy nong cơm, ba nong cà nuôi Gióng lớn nhanh như thổi.'
    ],
    { width: 512, height: 256 },
    disposables
  );
  const villageWallPanel = new THREE.Mesh(
    prepGeo(new THREE.PlaneGeometry(5.6, 2.8)),
    new THREE.MeshStandardMaterial({ map: villagePanelTex, roughness: 0.44, metalness: 0.25, side: THREE.FrontSide })
  );
  villageWallPanel.name = 'ThanhGiong_WallPanel_Village';
  villageWallPanel.position.set(-11.75, 4.1, 4.2);
  villageWallPanel.rotation.y = Math.PI * 0.5;
  interiorGroup.add(villageWallPanel);

  // =========================================================================
  // 3. PHÂN KHU 2: LỜI SỨ GIẢ & SỨC MẠNH THỨC TỈNH (X = +6.8, Z = +4.2)
  // =========================================================================
  const forgeStation = new THREE.Group();
  forgeStation.name = 'Station_ThanhGiong_Forge';
  forgeStation.position.set(6.8, 0, 4.2);
  forgeStation.rotation.y = -0.38;
  interiorGroup.add(forgeStation);

  const forgePed = buildCuratedPedestal({
    width: 2.35,
    depth: 1.40,
    height: 0.94,
    basaltMat,
    bronzeMat,
    crimsonMat,
    title: 'LỜI SỨ GIẢ & LÒ RÈN VŨ KHÍ',
    subtitle: 'Loa Đồng, Roi Sắt, Giáp Sắt & Ngựa Sắt',
    disposables
  });
  forgeStation.add(forgePed);
  solidObstacleObjects.push(forgePed);

  // Lò than hồng cháy rực dưới bệ rèn vũ khí
  const forgeCoalRim = new THREE.Mesh(
    prepGeo(new THREE.TorusGeometry(0.56, 0.07, 6, 14)),
    forgeCoalMat
  );
  forgeCoalRim.rotation.x = Math.PI / 2;
  forgeCoalRim.position.set(0, 0.96, 0);
  forgeCoalRim.userData.ignoreRaycaster = true;
  forgeStation.add(forgeCoalRim);

  const forgePanelTex = createBronzePlaqueTexture(
    'LỜI SỨ GIẢ & SỨC MẠNH THỨC TỈNH',
    'Khí phách tuổi lên ba vươn vai thành tráng sĩ oai hùng',
    [
      '“Ông về tâu với vua sắm cho ta một con ngựa sắt,',
      'một cái roi sắt và một tấm áo giáp sắt,',
      'ta sẽ phá tan lũ giặc này!”',
      'Lò rèn rực lửa suốt ngày đêm đúc giáp sắt & chiến mã cứu nước.'
    ],
    { width: 512, height: 256 },
    disposables
  );
  const forgeWallPanel = new THREE.Mesh(
    prepGeo(new THREE.PlaneGeometry(5.6, 2.8)),
    new THREE.MeshStandardMaterial({ map: forgePanelTex, roughness: 0.44, metalness: 0.25, side: THREE.FrontSide })
  );
  forgeWallPanel.name = 'ThanhGiong_WallPanel_Forge';
  forgeWallPanel.position.set(11.75, 4.1, 4.2);
  forgeWallPanel.rotation.y = -Math.PI * 0.5;
  interiorGroup.add(forgeWallPanel);

  // =========================================================================
  // 4. PHÂN KHU 3: TƯỢNG ĐÀI PHÙ ĐỔNG THIÊN VƯƠNG (X = 0, Z = -1.2)
  // =========================================================================
  const statueStation = new THREE.Group();
  statueStation.name = 'Station_ThanhGiong_Center';
  statueStation.position.set(0, 0, -1.2);
  interiorGroup.add(statueStation);

  // Bệ đá Trống Đồng Đông Sơn 3 tầng uy nghiêm (mở rộng để nâng đỡ chiến mã khổng lồ)
  const plinthGroup = new THREE.Group();
  plinthGroup.name = 'ThanhGiong_DongSon_StatueBase';
  const tier1 = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(3.15, 3.40, 0.45, 8)), basaltMat);
  tier1.position.y = 0.225;
  plinthGroup.add(tier1);

  const tier2 = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(2.75, 3.00, 0.55, 8)), patinaMat);
  tier2.position.y = 0.725;
  plinthGroup.add(tier2);

  const tier3 = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(2.45, 2.65, 0.45, 8)), bronzeMat);
  tier3.position.y = 1.225;
  plinthGroup.add(tier3);

  mergeGroupMeshesByMaterial(plinthGroup, {
    disposeSources: true,
    castShadow: false,
    receiveShadow: false
  });
  statueStation.add(plinthGroup);

  // Vòng hào quang phát sáng quanh chân bệ tượng
  const baseHaloGeo = prepGeo(new THREE.RingGeometry(2.45, 2.95, 32)).rotateX(-Math.PI / 2);
  const baseHaloMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const baseHaloMesh = new THREE.Mesh(baseHaloGeo, baseHaloMat);
  baseHaloMesh.position.y = 1.46;
  baseHaloMesh.userData.ignoreRaycaster = true;
  statueStation.add(baseHaloMesh);
  disposables.push(baseHaloGeo, baseHaloMat);

  // Phù điêu Mặt Trống Đồng Ngọc Lũ & Chim Lạc chạy quanh bệ tượng
  const centerReliefGroup = new THREE.Group();
  centerReliefGroup.name = 'ThanhGiong_StatueReliefs_Merged';
  centerReliefGroup.userData.ignoreRaycaster = true;

  const frontMedallion = createNgocLuStarMedallion3D(bronzeMat, patinaMat, 0.56);
  frontMedallion.position.set(0, 0.74, 3.02);
  centerReliefGroup.add(frontMedallion);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const lac = createLacBirdRelief3D(bronzeMat, { scale: 0.48 });
    lac.position.set(Math.sin(a) * 2.56, 1.26, Math.cos(a) * 2.56);
    lac.rotation.y = a;
    centerReliefGroup.add(lac);
  }
  const frontCloud = createDongSonFireCloudRelief3D(bronzeMat, crimsonMat, 2.4);
  frontCloud.position.set(0, 0.24, 3.35);
  frontCloud.scale.setScalar(0.88);
  centerReliefGroup.add(frontCloud);

  centerReliefGroup.updateMatrixWorld(true);
  mergeGroupMeshesByMaterial(centerReliefGroup, {
    disposeSources: true,
    castShadow: false,
    receiveShadow: false
  });
  statueStation.add(centerReliefGroup);

  // Dấu chân vó ngựa sắt cháy rực lửa xung quanh đỉnh bệ
  const hoofEmbers = new THREE.InstancedMesh(
    prepGeo(new THREE.CylinderGeometry(0.24, 0.28, 0.05, 8)),
    hoofEmberMat,
    4
  );
  hoofEmbers.name = 'ThanhGiong_HoofEmberPrints';
  hoofEmbers.userData.ignoreRaycaster = true;
  [[-0.85, 1.45], [0.85, 1.45], [-0.85, -1.45], [0.85, -1.45]].forEach(([hx, hz], idx) => {
    dummy.position.set(hx, 1.46, hz);
    dummy.rotation.set(0, idx * 0.4, 0);
    dummy.scale.set(1.2, 1.0, 1.45);
    dummy.updateMatrix();
    hoofEmbers.setMatrixAt(idx, dummy.matrix);
  });
  hoofEmbers.instanceMatrix.needsUpdate = true;
  statueStation.add(hoofEmbers);

  const statuePlaqueTex = createBronzePlaqueTexture(
    'PHÙ ĐỔNG THIÊN VƯƠNG • THÁNH GIÓNG',
    'Nhổ Bụi Tre Đằng Ngà Quất Tan Giặc Ân • Cưỡi Ngựa Sắt Bay Về Trời',
    [],
    { width: 512, height: 128 },
    disposables
  );
  const statuePlaque = new THREE.Mesh(
    prepGeo(new THREE.PlaneGeometry(2.6, 0.56)),
    new THREE.MeshStandardMaterial({ map: statuePlaqueTex, roughness: 0.38, metalness: 0.35, side: THREE.FrontSide })
  );
  statuePlaque.position.set(0, 0.45, 3.32);
  statuePlaque.rotation.x = -0.25;
  statueStation.add(statuePlaque);

  const statueColliderProxy = new THREE.Mesh(
    prepGeo(new THREE.BoxGeometry(6.6, 6.8, 6.6)),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  statueColliderProxy.position.y = 3.2;
  statueStation.add(statueColliderProxy);
  solidObstacleObjects.push(statueColliderProxy);

  // =========================================================================
  // 5. RỪNG TRE ĐẰNG NGÀ DÁT VÀNG (THREE.INSTANCEDMESH) & HỆ HẠT THREE.POINTS
  // =========================================================================
  const bambooSpots = [];
  const bambooRng = createSeededRandom(3050);
  for (let i = 0; i < 18; i++) {
    const side = i < 9 ? -1 : 1;
    const idx = i % 9;
    const bx = side * (9.2 + (idx % 2) * 1.4 + (bambooRng() - 0.5) * 0.4);
    const bz = -9.4 + idx * 2.25;
    // Tránh đè vào trạm Phân khu 1/2 (z ~ 4.2)
    if (Math.abs(bz - 4.2) < 1.3 && Math.abs(bx) < 9.8) continue;
    bambooSpots.push({
      x: bx,
      z: bz,
      h: 4.8 + bambooRng() * 2.2,
      lean: (bambooRng() - 0.5) * 0.08
    });
  }

  const instStalks = new THREE.InstancedMesh(prepGeo(new THREE.CylinderGeometry(0.055, 0.075, 1.0, 6)), bambooMat, bambooSpots.length);
  const instNodes = new THREE.InstancedMesh(prepGeo(new THREE.CylinderGeometry(0.088, 0.088, 0.045, 6)), bronzeMat, bambooSpots.length * 3);
  const instLeaves = new THREE.InstancedMesh(prepGeo(new THREE.DodecahedronGeometry(0.45, 0)), leafMat, bambooSpots.length);
  instStalks.name = 'ThanhGiong_GoldenBamboo_Stalks';
  instNodes.name = 'ThanhGiong_GoldenBamboo_Nodes';
  instLeaves.name = 'ThanhGiong_GoldenBamboo_Leaves';
  [instStalks, instNodes, instLeaves].forEach((m) => {
    m.castShadow = false;
    m.receiveShadow = false;
    m.frustumCulled = true;
    m.userData.ignoreRaycaster = true;
  });

  bambooSpots.forEach((b, i) => {
    dummy.position.set(b.x, b.h * 0.5, b.z);
    dummy.rotation.set(b.lean, i * 0.7, b.lean * 0.5);
    dummy.scale.set(1, b.h, 1);
    dummy.updateMatrix();
    instStalks.setMatrixAt(i, dummy.matrix);

    for (let n = 0; n < 3; n++) {
      dummy.position.set(b.x, b.h * (0.25 + n * 0.25), b.z);
      dummy.rotation.set(b.lean, 0, b.lean * 0.5);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      instNodes.setMatrixAt(i * 3 + n, dummy.matrix);
    }

    dummy.position.set(b.x, b.h + 0.15, b.z);
    dummy.rotation.set(0, i * 1.1, 0);
    dummy.scale.set(1.2, 0.85, 1.2);
    dummy.updateMatrix();
    instLeaves.setMatrixAt(i, dummy.matrix);
  });
  instStalks.instanceMatrix.needsUpdate = true;
  instNodes.instanceMatrix.needsUpdate = true;
  instLeaves.instanceMatrix.needsUpdate = true;
  interiorGroup.add(instStalks, instNodes, instLeaves);

  // =========================================================================
  // 6. ÁNH SÁNG TÔN VINH TƯỢNG ĐÀI THÁNH GIÓNG + VOLUMETRIC GOD RAYS & HẠT
  // =========================================================================
  const heroSpot = new THREE.SpotLight(0xffdf7a, 9.5, 22.0, Math.PI / 3.4, 0.45, 1.1);
  heroSpot.position.set(0, 8.2, -0.6);
  heroSpot.target.position.set(0, 3.2, -1.2);
  heroSpot.castShadow = false;
  interiorGroup.add(heroSpot, heroSpot.target);

  const heroFrontLight = new THREE.PointLight(0xffbe58, 5.5, 14.0, 1.25);
  heroFrontLight.position.set(0, 4.2, 2.8);
  heroFrontLight.castShadow = false;
  interiorGroup.add(heroFrontLight);

  const heroUnderGlow = new THREE.PointLight(0xff7711, 4.2, 9.0, 1.35);
  heroUnderGlow.position.set(0, 1.9, -1.2);
  heroUnderGlow.castShadow = false;
  interiorGroup.add(heroUnderGlow);

  const forgeLight = new THREE.PointLight(0xff5a1f, 4.6, 12.0, 1.5);
  forgeLight.position.set(6.8, 3.0, 4.2);
  forgeLight.castShadow = false;
  interiorGroup.add(forgeLight);

  const rimBackLight = new THREE.PointLight(0xff6b2b, 4.5, 16.0, 1.4);
  rimBackLight.position.set(0, 4.8, -6.2);
  rimBackLight.castShadow = false;
  interiorGroup.add(rimBackLight);

  const godRayMat = new THREE.MeshBasicMaterial({
    color: PALETTE.godRayAmber,
    map: textures.godRayTex,
    transparent: true,
    opacity: 0.45,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const godRayStatue = new THREE.Mesh(
    prepGeo(new THREE.CylinderGeometry(1.45, 3.85, 7.8, 18, 1, true)),
    godRayMat
  );
  godRayStatue.name = 'ThanhGiong_GodRay_Main';
  godRayStatue.position.set(0, 4.6, -1.2);
  godRayStatue.userData.ignoreRaycaster = true;
  interiorGroup.add(godRayStatue);

  // 1) Hạt tàn lửa đỏ cam (#ff4500) bốc lên quanh tượng & lò rèn (1 Draw Call)
  const ptRng = createSeededRandom(4040);
  const emberCount = 140;
  const emberPos = new Float32Array(emberCount * 3);
  const emberPhases = new Float32Array(emberCount);
  for (let i = 0; i < emberCount; i++) {
    const isForge = i < 40;
    emberPos[i * 3] = isForge ? 6.8 + (ptRng() - 0.5) * 2.4 : (ptRng() - 0.5) * 16.0;
    emberPos[i * 3 + 1] = 0.6 + ptRng() * 6.8;
    emberPos[i * 3 + 2] = isForge ? 4.2 + (ptRng() - 0.5) * 2.4 : (ptRng() - 0.5) * 18.0;
    emberPhases[i] = ptRng() * Math.PI * 2;
  }
  const emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPos, 3));
  emberGeo.computeBoundingBox();
  emberGeo.computeBoundingSphere();

  const emberMat = new THREE.PointsMaterial({
    color: PALETTE.emberOrange,
    size: 0.16,
    map: textures.particleTex,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const emberPoints = new THREE.Points(emberGeo, emberMat);
  emberPoints.name = 'ThanhGiong_EmberPoints';
  emberPoints.frustumCulled = true;
  emberPoints.userData.ignoreRaycaster = true;
  interiorGroup.add(emberPoints);

  // 2) Hạt bụi vàng lơ lửng trong Volumetric God Ray (1 Draw Call)
  const dustCount = 110;
  const dustPos = new Float32Array(dustCount * 3);
  const dustPhases = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    const r = ptRng() * 2.55;
    const a = ptRng() * Math.PI * 2;
    dustPos[i * 3] = Math.cos(a) * r;
    dustPos[i * 3 + 1] = 1.2 + ptRng() * 6.8;
    dustPos[i * 3 + 2] = -1.2 + Math.sin(a) * r;
    dustPhases[i] = ptRng() * Math.PI * 2;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  dustGeo.computeBoundingBox();
  dustGeo.computeBoundingSphere();

  const dustMat = new THREE.PointsMaterial({
    color: 0xffe49e,
    size: 0.10,
    map: textures.particleTex,
    transparent: true,
    opacity: 0.68,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const dustPoints = new THREE.Points(dustGeo, dustMat);
  dustPoints.name = 'ThanhGiong_DustPoints';
  dustPoints.frustumCulled = true;
  dustPoints.userData.ignoreRaycaster = true;
  interiorGroup.add(dustPoints);

  // =========================================================================
  // 7. NẠP & CHUẨN HÓA MÔ HÌNH GLB (THANHGIONG.GLB & 2 HIỆN VẬT BLENDER)
  // =========================================================================
  const exhibitConfigs = [
    {
      key: 'thanhgiong_statue',
      urls: ['/models/thanhgiong.glb', '/model/thanhgiong.glb', '/models/thanh_giong.glb', '/model/thanh_giong.glb'],
      parentStation: statueStation,
      mountY: 1.45,
      targetHeight: 4.85,
      maxTextureSize: 1024,
      rotY: 0.0,
      fallbackFn: () => buildGiongHeroFallback(ironMat, bronzeMat, bambooMat, 4.85),
      focusLocalPos: [0.0, 3.2, 5.6],
      focusLocalTarget: [0.0, 3.6, -1.2],
      soundTheme: 'thanhgiong_hero',
      soundOptions: { refDistance: 7.5, maxDistance: 26, volume: 0.48 },
      hitboxPadding: 0.32
    },
    {
      key: 'thanhgiong_village',
      urls: ['/models/thanhgiong/dau_chan_va_nia_tre.glb'],
      parentStation: villageStation,
      mountY: 0.92,
      targetHeight: 0.31,
      maxTextureSize: 512,
      rotY: 0.0,
      fallbackFn: () => buildVillageRelicsFallback(basaltMat, bronzeMat, bambooMat),
      focusLocalPos: [-3.4, 2.25, 7.6],
      focusLocalTarget: [-6.8, 1.25, 4.2],
      soundTheme: 'thanhgiong_village',
      soundOptions: { refDistance: 4.8, maxDistance: 16, volume: 0.42 },
      hitboxPadding: 0.22
    },
    {
      key: 'thanhgiong_forge',
      urls: ['/models/thanhgiong/vu_khi_sat_va_loa_su_gia.glb'],
      parentStation: forgeStation,
      mountY: 0.94,
      targetHeight: 1.04,
      maxTextureSize: 512,
      rotY: 0.0,
      fallbackFn: () => buildForgeRelicsFallback(ironMat, bronzeMat, forgeCoalMat),
      focusLocalPos: [3.4, 2.25, 7.6],
      focusLocalTarget: [6.8, 1.4, 4.2],
      soundTheme: 'thanhgiong_forge',
      soundOptions: { refDistance: 4.8, maxDistance: 16, volume: 0.44 },
      hitboxPadding: 0.22
    }
  ];

  const loadedArtifacts = new Map();
  const registeredProxies = new Set();
  const registeredSolidTags = new Set();
  let isDisposed = false;
  const wiredManagers = {
    hitboxManager: null,
    loreGuide: null,
    spatialAudio: null,
    cameraManager: cameraManager || null
  };

  function bindExhibitInteractions(cfg, modelGroup) {
    if (isDisposed) return;
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
      if (prevProxy) {
        registeredProxies.delete(prevProxy);
        if (loreTarget?.interactiveArtifacts) {
          const prevIdx = loreTarget.interactiveArtifacts.indexOf(prevProxy);
          if (prevIdx !== -1) loreTarget.interactiveArtifacts.splice(prevIdx, 1);
        }
      }
      const proxy = hitboxManager.createTightClickHitbox(modelGroup, {
        loreKey: cfg.key,
        padding: Math.max(cfg.hitboxPadding || 0.22, 0.22),
        minSize: 0.95
      });
      if (proxy) {
        proxy.userData.onFocusCamera = focusCallback;
        registeredProxies.add(proxy);
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
    holder.name = `ThanhGiong_Artifact_${cfg.key}`;
    holder.position.y = cfg.mountY;
    holder.rotation.y = cfg.rotY;
    cfg.parentStation.add(holder);

    const fallbackMesh = cfg.fallbackFn();
    holder.add(fallbackMesh);
    loadedArtifacts.set(cfg.key, holder);

    loadGlbCached(cfg.urls, {
      targetHeight: cfg.targetHeight,
      maxTextureSize: cfg.maxTextureSize,
      disableMipmaps: true
    })
      .then((rawScene) => {
        if (isDisposed) return;
        if (!rawScene) throw new Error('Empty GLB scene');
        holder.remove(fallbackMesh);
        fallbackMesh.traverse((o) => {
          o.geometry?.dispose?.();
          if (o.material) {
            const ms = Array.isArray(o.material) ? o.material : [o.material];
            ms.forEach((m) => m?.dispose?.());
          }
        });
        rawScene.traverse((c) => {
          if (!c.isMesh) return;
          c.castShadow = false;
          c.receiveShadow = false;
          c.frustumCulled = true;
          c.userData.isSharedCachedAsset = true;
          const mats = Array.isArray(c.material) ? c.material : [c.material];
          mats.forEach((m) => {
            if (!m) return;
            if (!m.transparent && !m.alphaTest) {
              m.side = THREE.FrontSide;
            }
            if (m.map && THREE.SRGBColorSpace && m.map.colorSpace !== THREE.SRGBColorSpace) {
              m.map.colorSpace = THREE.SRGBColorSpace;
              m.map.needsUpdate = true;
            }
            const linearTarget = THREE.LinearSRGBColorSpace || THREE.NoColorSpace;
            [m.normalMap, m.roughnessMap, m.metalnessMap].forEach((lm) => {
              if (lm && lm.colorSpace !== linearTarget) {
                lm.colorSpace = linearTarget;
                lm.needsUpdate = true;
              }
            });

            // Tôn vinh bề mặt kim loại và chi tiết giáp sắt của tượng Thánh Gióng trung tâm
            if (cfg.key === 'thanhgiong_statue' && m.isMeshStandardMaterial) {
              m.roughness = Math.min(m.roughness ?? 0.5, 0.38);
              m.metalness = Math.max(m.metalness ?? 0.5, 0.72);
              if (!m.emissive || m.emissive.getHex() === 0) {
                m.emissive = new THREE.Color(0x3d1c06);
                m.emissiveIntensity = 0.42;
              }
            }
          });
        });
        holder.add(rawScene);
        loadedArtifacts.set(cfg.key, holder);

        if (wiredManagers.hitboxManager || wiredManagers.loreGuide || wiredManagers.spatialAudio) {
          bindExhibitInteractions(cfg, holder);
        }
      })
      .catch(() => {
        if (isDisposed) return;
        if (wiredManagers.hitboxManager || wiredManagers.loreGuide || wiredManagers.spatialAudio) {
          bindExhibitInteractions(cfg, holder);
        }
      });
  });

  // =========================================================================
  // 8. ĐĂNG KÝ HITBOX, LORE GUIDE, AUDIO & CẬP NHẬT 60+ FPS
  // =========================================================================
  function registerHitboxes(hitboxManager) {
    if (isDisposed) return;
    const hbm = hitboxManager || (typeof window !== 'undefined' ? window.__museumHitboxManager : null);
    if (!hbm) return;
    wiredManagers.hitboxManager = hbm;

    roomGroup.updateMatrixWorld(true);
    solidObstacleObjects.forEach((obj, idx) => {
      const tag = `ThanhGiong_Solid_${idx}`;
      registeredSolidTags.add(tag);
      hbm.registerSolidObjectCollider(obj, {
        shrinkFactor: 0.95,
        tag,
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

  const ROOM_PROXIMITY_SQ = 42 * 42;
  const isInsideThanhGiongRoom = (pos) => {
    if (!pos) return false;
    return (
      pos.x >= -62.5 &&
      pos.x <= -34.0 &&
      pos.y >= -0.5 &&
      pos.y <= 9.2 &&
      pos.z >= 5.2 &&
      pos.z <= 32.8
    );
  };

  function update(delta = 0.016, elapsedTime = 0, camera = null) {
    if (!roomGroup.visible) return;
    const dt = Math.min(delta, 0.05);

    if (camera?.position) {
      if (!isInsideThanhGiongRoom(camera.position) && camera.position.distanceToSquared(roomGroup.position) > ROOM_PROXIMITY_SQ) {
        return;
      }
    }

    // 1. Nhịp thở Volumetric God Ray & Lửa lò rèn / Vó ngựa sắt
    godRayMat.opacity = 0.32 + Math.sin(elapsedTime * 1.45) * 0.05;
    forgeCoalMat.emissiveIntensity = 1.15 + Math.sin(elapsedTime * 3.8) * 0.32;
    hoofEmberMat.emissiveIntensity = 1.25 + Math.cos(elapsedTime * 2.9) * 0.30;

    // 2. Tàn lửa đỏ cam bay lên quanh tượng & lò rèn
    const eAttr = emberGeo.attributes.position;
    const eArr = eAttr.array;
    for (let i = 0; i < emberCount; i++) {
      const i3 = i * 3;
      const ph = emberPhases[i];
      eArr[i3] += Math.sin(elapsedTime * 0.9 + ph) * 0.004;
      eArr[i3 + 1] += dt * 0.78;
      if (eArr[i3 + 1] > 7.8) {
        eArr[i3 + 1] = 0.55;
      }
    }
    eAttr.needsUpdate = true;

    // 3. Bụi vàng lơ lửng trong God Ray
    const dAttr = dustGeo.attributes.position;
    const dArr = dAttr.array;
    for (let i = 0; i < dustCount; i++) {
      const i3 = i * 3;
      const ph = dustPhases[i];
      dArr[i3] += Math.sin(elapsedTime * 0.55 + ph) * 0.0025;
      dArr[i3 + 1] -= dt * 0.14;
      dArr[i3 + 2] += Math.cos(elapsedTime * 0.5 + ph) * 0.0025;
      if (dArr[i3 + 1] < 1.1) {
        dArr[i3 + 1] = 7.9;
      }
    }
    dAttr.needsUpdate = true;
  }

  // =========================================================================
  // 9. KẾT NỐI CỔNG DỊCH CHUYỂN & CÕI SÓC SƠN (THANHGIONGSTORYREALM)
  // =========================================================================
  const tourStopsInRoom = [
    {
      key: 'thanhgiong_village',
      camLocalPos: [-3.4, 2.25, 7.6],
      lookLocalTarget: [-6.8, 1.35, 4.2],
      dwellMs: 3600,
      label: 'Làng Gióng: Dấu chân khổng lồ & 7 nong cơm 3 nong cà'
    },
    {
      key: 'thanhgiong_forge',
      camLocalPos: [3.4, 2.25, 7.6],
      lookLocalTarget: [6.8, 1.4, 4.2],
      dwellMs: 3600,
      label: 'Lời Sứ Giả & Lò rèn ngựa sắt, roi sắt, áo giáp sắt'
    },
    {
      key: 'thanhgiong_statue',
      camLocalPos: [0.0, 2.8, 4.4],
      lookLocalTarget: [0.0, 3.1, -1.2],
      orbitCenterLocal: [0.0, 3.0, -1.2],
      orbitRadius: 5.2,
      orbitHeight: 2.8,
      dwellMs: 6500,
      orbit: true,
      label: 'Tượng đài Phù Đổng Thiên Vương cưỡi ngựa sắt vút trời'
    }
  ];

  const realmController = createThanhGiongStoryRealm({
    roomGroup,
    interiorGroup,
    mainScene,
    realmScene,
    cameraManager,
    portalPositionLocal: new THREE.Vector3(0, 0, -10.5),
    roomCenter,
    tourStopsInRoom
  });

  function dispose() {
    isDisposed = true;
    realmController.dispose?.();
    const audioTarget = wiredManagers.spatialAudio || (typeof window !== 'undefined' ? window.__spatialAudio : null);
    if (audioTarget?.detachPositionalSound) {
      exhibitConfigs.forEach((cfg) => {
        if (cfg.soundTheme) audioTarget.detachPositionalSound(`room_${cfg.key}`);
      });
    }

    const loreTarget = wiredManagers.loreGuide || (typeof window !== 'undefined' ? window.__loreGuide : null);
    const hbm = wiredManagers.hitboxManager || (typeof window !== 'undefined' ? window.__museumHitboxManager : null);
    if (hbm) {
      registeredProxies.forEach((proxy) => {
        const idx = hbm.clickProxies?.indexOf(proxy) ?? -1;
        if (idx !== -1) hbm.clickProxies.splice(idx, 1);
        hbm._removeDebugHelper?.(`Helper_${proxy.name}`);
        if (loreTarget?.interactiveArtifacts) {
          const li = loreTarget.interactiveArtifacts.indexOf(proxy);
          if (li !== -1) loreTarget.interactiveArtifacts.splice(li, 1);
        }
        proxy.geometry?.dispose?.();
        proxy.material?.dispose?.();
        proxy.parent?.remove(proxy);
      });
      registeredProxies.clear();

      if (Array.isArray(hbm.solidBoxes)) {
        for (let i = hbm.solidBoxes.length - 1; i >= 0; i--) {
          const entry = hbm.solidBoxes[i];
          if (registeredSolidTags.has(entry.tag)) {
            hbm._unindexSolidEntry?.(entry);
            hbm._removeDebugHelper?.(`SolidHelper_${entry.tag}`);
            hbm.solidBoxes.splice(i, 1);
          }
        }
      }
      registeredSolidTags.clear();
    }

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
    realmController.updateMuseumPortal?.(delta, elapsedTime, camera);
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
    realmController.setupContext?.(ctx);
    wireInteractiveSystems({
      hitboxManager: ctx.hitboxManager || wiredManagers.hitboxManager,
      loreGuide: ctx.loreGuide || wiredManagers.loreGuide,
      spatialAudio: ctx.spatialAudio || wiredManagers.spatialAudio,
      cameraManager: ctx.cameraManager || wiredManagers.cameraManager
    });
  };

  roomGroup.userData = {
    roomId: 'thanh_giong',
    interiorGroup,
    floor,
    walkableFloors: [floor, walkway],
    realmController,
    update: updateRoomAndPortal,
    registerHitboxes: (hbm) => {
      registerHitboxes(hbm);
      realmController.syncMuseumPortalHitboxes?.();
    },
    wireInteractiveSystems: (ctx) => {
      wireInteractiveSystems(ctx);
      realmController.setupContext?.(ctx);
    },
    dispose
  };

  return roomGroup;
}
