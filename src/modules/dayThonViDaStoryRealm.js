import * as THREE from 'three';
import { registerInteractiveBook } from './PortalInteraction.js';
import { loadGlbCached, sanitizeGeometryBuffers } from '../utils/modelLoaderHelper.js';
import { localRoomToWorld } from '../config/literatureRegistry.js';

/**
 * ============================================================================
 * ĐÂY THÔN VĨ DẠ (HÀN MẶC TỬ) — CỔNG VÒM TRÚC NGỌC BÍCH & CÕI THẾ GIỚI MỞ
 * Multi-Scene Architecture:
 * - Cổng Vòm Trúc Xanh Hào Quang Ngọc Bích trong Phòng 302 (Bản sao song hành PortalInteraction)
 * - Zone 1 (Z: +54..+6): Làng Vĩ Dạ Ban Mai, Hàng Cau, Trúc Xanh, Bia Đá Ngọc Bích & caithonvida.glb (1:1 Life-Size)
 * - Zone 2 (Z: +6..-14): Cầu Tre bắc qua Sông Hương / Sông Trăng Custom GLSL, Thuyền Chở Trăng, Hoa Bắp Lay
 * - Zone 3 (Z: -14..-58): Con Đường Sương Khói, Dynamic Day/Night Lerp, Trăng Khổng Lồ, Bóng Áo Dài Trắng (< 4m tan thành ngàn hạt sương)
 * - Hỗ trợ: Dolly-Zoom Ngọc Bích, 4 Lore Cards, 3 PositionalAudio, Auto-Tour Điện Ảnh, WebXR Teleport, Hitbox [H/F2], Dispose sạch GPU
 * ============================================================================
 */

const REALM_ID = 'day_thon_vi_da';

const PALETTE = {
  morningSky: 0xbfe4d2,
  morningFog: 0xcbe6d8,
  morningSun: 0xffe89e,
  nightSky: 0x0b132b,
  nightHorizon: 0x162447,
  moonGold: 0xfef08a,
  moonSilver: 0xbae6fd,
  jadeGlow: 0x34d399,
  jadeCore: 0x10b981,
  jadeDeep: 0x064e3b,
  bambooCulm: 0x5c8d4a,
  bambooLeaf: 0x2e8544,
  mossBrick: 0x6f4b3c,
  terracotta: 0x9c4d36,
  warmLantern: 0xffb86c
};

function createSeededRandom(seed = 1938) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function prepGeo(geo) {
  if (!geo) return geo;
  sanitizeGeometryBuffers(geo);
  return geo;
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

let _vidaSoftParticleTex = null;
function getViDaSoftParticleTexture(disposables = []) {
  if (_vidaSoftParticleTex) return _vidaSoftParticleTex;
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  grad.addColorStop(0.35, 'rgba(167, 243, 208, 0.85)');
  grad.addColorStop(0.7, 'rgba(167, 243, 208, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  _vidaSoftParticleTex = makeCanvasTex(canvas, { srgb: true, disposables });
  return _vidaSoftParticleTex;
}

function buildNormalFromHeightCanvas(heightCanvas, strength = 2.1, rx = 1, ry = 1, disposables = []) {
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
  return makeCanvasTex(nCanvas, { rx, ry, srgb: false, disposables });
}

function createSignTexture(title, subtitle, {
  bg = '#0c241d',
  border = '#34d399',
  titleCol = '#fef3c7',
  subCol = '#a7f3d0',
  w = 1024,
  h = 190
} = {}, disposables = []) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, bg);
  grad.addColorStop(0.5, '#13382c');
  grad.addColorStop(1, bg);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = border;
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 2;
  ctx.strokeRect(20, 20, w - 40, h - 40);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = titleCol;
  ctx.font = 'bold 42px "Times New Roman", Georgia, serif';
  ctx.fillText(title, w * 0.5, h * 0.37, w - 72);

  ctx.fillStyle = subCol;
  ctx.font = 'italic 23px "Times New Roman", Georgia, serif';
  ctx.fillText(subtitle, w * 0.5, h * 0.71, w - 72);

  return makeCanvasTex(c, { rx: 1, ry: 1, srgb: true, disposables });
}

function createStelePoemTexture(disposables = []) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, 0, 1024);
  g.addColorStop(0, '#0f392e');
  g.addColorStop(0.5, '#092b22');
  g.addColorStop(1, '#061f18');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 1024);

  ctx.strokeStyle = '#6ee7b7';
  ctx.lineWidth = 10;
  ctx.strokeRect(24, 24, 976, 976);
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 3;
  ctx.strokeRect(42, 42, 940, 940);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#fef3c7';
  ctx.font = 'bold 46px "Times New Roman", Georgia, serif';
  ctx.fillText('ĐÂY THÔN VĨ DẠ – HÀN MẶC TỬ', 512, 112, 900);

  ctx.fillStyle = '#6ee7b7';
  ctx.font = 'italic 27px "Times New Roman", Georgia, serif';
  ctx.fillText('Thơ Điên (1938) • Tặng Hoàng Thị Kim Cúc xứ Huế', 512, 166, 900);

  ctx.strokeStyle = 'rgba(253, 230, 138, 0.55)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(180, 206);
  ctx.lineTo(844, 206);
  ctx.stroke();

  const stanzas = [
    [
      'Sao anh không về chơi thôn Vĩ?',
      'Nhìn nắng hàng cau nắng mới lên.',
      'Vườn ai mướt quá xanh như ngọc,',
      'Lá trúc che ngang mặt chữ điền.'
    ],
    [
      'Gió theo lối gió, mây đường mây,',
      'Dòng nước buồn thiu, hoa bắp lay.',
      'Thuyền ai đậu bến sông trăng đó,',
      'Có chở trăng về kịp tối nay?'
    ],
    [
      'Mơ khách đường xa, khách đường xa,',
      'Áo em trắng quá nhìn không ra.',
      'Ở đây sương khói mờ nhân ảnh,',
      'Ai biết tình ai có đậm đà?'
    ]
  ];

  let y = 276;
  ctx.font = 'italic 31px "Times New Roman", Georgia, serif';
  stanzas.forEach((stanza, idx) => {
    ctx.fillStyle = idx === 0 ? '#d1fae5' : (idx === 1 ? '#fef9c3' : '#e0f2fe');
    stanza.forEach((line) => {
      ctx.fillText(line, 512, y, 880);
      y += 48;
    });
    y += 38;
  });

  ctx.fillStyle = '#a7f3d0';
  ctx.font = '600 22px "Segoe UI", sans-serif';
  ctx.fillText('Click vào Bia Đá Ngọc Bích để đọc tư liệu tác phẩm', 512, 938, 860);

  return makeCanvasTex(c, { rx: 1, ry: 1, srgb: true, disposables });
}

function createRealmProceduralTextures(disposables = []) {
  const rng = createSeededRandom(193801);
  const sz = 256;

  // 1. Gạch Bát Tràng & lối đất cổ thôn Vĩ
  const tileC = document.createElement('canvas');
  tileC.width = sz;
  tileC.height = sz;
  const tCtx = tileC.getContext('2d');
  const tileHC = document.createElement('canvas');
  tileHC.width = sz;
  tileHC.height = sz;
  const thCtx = tileHC.getContext('2d');

  tCtx.fillStyle = '#8b4d37';
  tCtx.fillRect(0, 0, sz, sz);
  thCtx.fillStyle = '#888888';
  thCtx.fillRect(0, 0, sz, sz);

  const step = 64;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const shade = Math.floor((rng() - 0.5) * 18);
      tCtx.fillStyle = `rgb(${156 + shade},${82 + Math.floor(shade * 0.6)},${58 + Math.floor(shade * 0.4)})`;
      tCtx.fillRect(col * step + 3, row * step + 3, step - 6, step - 6);
      thCtx.fillStyle = `rgb(${164 + shade},${164 + shade},${164 + shade})`;
      thCtx.fillRect(col * step + 3, row * step + 3, step - 6, step - 6);
    }
  }
  for (let i = 0; i < 420; i++) {
    const mx = rng() * sz;
    const my = rng() * sz;
    tCtx.fillStyle = rng() > 0.45 ? 'rgba(54, 128, 76, 0.25)' : 'rgba(55, 32, 22, 0.22)';
    tCtx.fillRect(mx, my, 3 + rng() * 6, 3 + rng() * 6);
  }

  // 2. Thảm cỏ xanh ngọc Vĩ Dạ
  const grassC = document.createElement('canvas');
  grassC.width = sz;
  grassC.height = sz;
  const gCtx = grassC.getContext('2d');
  const grassHC = document.createElement('canvas');
  grassHC.width = sz;
  grassHC.height = sz;
  const ghCtx = grassHC.getContext('2d');

  gCtx.fillStyle = '#2d7a47';
  gCtx.fillRect(0, 0, sz, sz);
  ghCtx.fillStyle = '#787878';
  ghCtx.fillRect(0, 0, sz, sz);

  for (let i = 0; i < 1800; i++) {
    const gx = rng() * sz;
    const gy = rng() * sz;
    gCtx.fillStyle = rng() > 0.5 ? 'rgba(72, 187, 120, 0.34)' : 'rgba(20, 83, 45, 0.35)';
    gCtx.fillRect(gx, gy, 2 + rng() * 3, 2 + rng() * 5);
    const hv = 100 + Math.floor(rng() * 80);
    ghCtx.fillStyle = `rgb(${hv},${hv},${hv})`;
    ghCtx.fillRect(gx, gy, 2, 3);
  }

  // 3. Đất sương khói & đá rêu bờ Bắc
  const mistGroundC = document.createElement('canvas');
  mistGroundC.width = sz;
  mistGroundC.height = sz;
  const mgCtx = mistGroundC.getContext('2d');
  mgCtx.fillStyle = '#243540';
  mgCtx.fillRect(0, 0, sz, sz);
  for (let i = 0; i < 1200; i++) {
    const x = rng() * sz;
    const y = rng() * sz;
    mgCtx.fillStyle = rng() > 0.5 ? 'rgba(100, 145, 165, 0.22)' : 'rgba(15, 25, 42, 0.32)';
    mgCtx.fillRect(x, y, 3 + rng() * 7, 3 + rng() * 7);
  }

  // 4. Radial soft particle & glow textures
  const particleC = document.createElement('canvas');
  particleC.width = 64;
  particleC.height = 64;
  const pCtx = particleC.getContext('2d');
  const pGrad = pCtx.createRadialGradient(32, 32, 0, 32, 32, 30);
  pGrad.addColorStop(0, 'rgba(255,255,255,1)');
  pGrad.addColorStop(0.4, 'rgba(215,255,235,0.65)');
  pGrad.addColorStop(1, 'rgba(16,185,129,0)');
  pCtx.fillStyle = pGrad;
  pCtx.fillRect(0, 0, 64, 64);

  const mistC = document.createElement('canvas');
  mistC.width = 256;
  mistC.height = 128;
  const msCtx = mistC.getContext('2d');
  const msGrad = msCtx.createRadialGradient(128, 64, 10, 128, 64, 120);
  msGrad.addColorStop(0, 'rgba(235, 246, 255, 0.54)');
  msGrad.addColorStop(0.55, 'rgba(195, 222, 245, 0.22)');
  msGrad.addColorStop(1, 'rgba(11, 19, 43, 0.0)');
  msCtx.fillStyle = msGrad;
  msCtx.fillRect(0, 0, 256, 128);

  const moonC = document.createElement('canvas');
  moonC.width = 256;
  moonC.height = 256;
  const mCtx = moonC.getContext('2d');
  const mGrad = mCtx.createRadialGradient(118, 114, 10, 128, 128, 128);
  mGrad.addColorStop(0, '#fffef4');
  mGrad.addColorStop(0.68, '#fef08a');
  mGrad.addColorStop(1, '#bae6fd');
  mCtx.fillStyle = mGrad;
  mCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 36; i++) {
    mCtx.fillStyle = 'rgba(175, 165, 120, 0.14)';
    mCtx.beginPath();
    mCtx.arc(28 + rng() * 200, 28 + rng() * 200, 6 + rng() * 20, 0, Math.PI * 2);
    mCtx.fill();
  }

  return {
    tileDiff: makeCanvasTex(tileC, { rx: 4, ry: 22, srgb: true, disposables }),
    tileNorm: buildNormalFromHeightCanvas(tileHC, 2.0, 4, 22, disposables),
    grassDiff: makeCanvasTex(grassC, { rx: 22, ry: 18, srgb: true, disposables }),
    grassNorm: buildNormalFromHeightCanvas(grassHC, 1.8, 22, 18, disposables),
    mistGroundDiff: makeCanvasTex(mistGroundC, { rx: 16, ry: 16, srgb: true, disposables }),
    particleTex: makeCanvasTex(particleC, { rx: 1, ry: 1, srgb: true, disposables }),
    mistTex: makeCanvasTex(mistC, { rx: 1, ry: 1, srgb: true, disposables }),
    moonTex: makeCanvasTex(moonC, { rx: 1, ry: 1, srgb: true, disposables })
  };
}

/**
 * ============================================================================
 * HÀM CAO ĐỘ ĐỊA HÌNH LIÊN HOÀN 3 VÙNG CỦA CÕI ĐÂY THÔN VĨ DẠ
 * - Vùng 1 (Z: +54..+6): Đường làng phẳng y = 0.0, đồi vườn êm hai bên
 * - Vùng 2 (|x| <= 2.4, Z: +6..-14): Cầu Tre parabol êm lên đỉnh 1.85m rồi hạ xuống y = 0.25
 * - Vùng 3 (Z: -14..-58): Con đường sương khói & bãi lau ven sông (y = 0.25 + gò cỏ nhẹ)
 * ============================================================================
 */
export function getViDaTerrainHeightAt(x = 0, z = 0) {
  // Vùng 1: Lối mòn & Làng Vĩ Dạ (Z >= +6)
  if (z >= 6.0) {
    const sideDist = Math.max(0, Math.abs(x) - 3.8);
    if (sideDist <= 0) return 0.0;
    const bankBlend = smoothstep(6.0, 11.5, z);
    // Giữ mặt bằng sân quanh caithonvida.glb (Z: 13..31, |x| <= 12.5) gần phẳng
    const courtyardFactor =
      z > 12.0 && z < 32.0 ? smoothstep(10.0, 18.0, Math.abs(x)) : 1.0;
    const hill =
      Math.min(1.85, sideDist * 0.085) *
      (0.68 + 0.32 * Math.sin(x * 0.13) * Math.cos(z * 0.11));
    return hill * bankBlend * (0.25 + 0.75 * courtyardFactor);
  }

  // Vùng 2: Cầu Tre bắc qua Sông Hương (|x| <= 2.4, Z: +6..-14)
  if (z > -14.0) {
    if (Math.abs(x) <= 2.4) {
      const t = (6.0 - z) / 20.0; // 0 tại Z=+6 -> 1 tại Z=-14
      const slope = t * 0.25;
      const arch = 4.0 * t * (1.0 - t) * (1.85 - 0.125);
      return slope + arch;
    }
    // Ngoài phạm vi cầu tre là lòng sông (có collider lan can & bờ sông bảo vệ)
    return -0.35;
  }

  // Vùng 3: Bãi lau & Con Đường Sương Khói (Z <= -14)
  const mistSide = Math.max(0, Math.abs(x) - 4.0);
  if (mistSide <= 0) return 0.25;
  const shoreBlend = smoothstep(-14.0, -19.0, z);
  const mound =
    Math.min(1.4, mistSide * 0.065) *
    (0.6 + 0.4 * Math.cos(x * 0.12 + z * 0.1));
  return 0.25 + mound * shoreBlend;
}

/** Tạo Cổng Vòm Trúc Xanh phát sáng hào quang ngọc bích đặt trong Phòng 302 */
function buildJadeBambooPortalVisual(disposables) {
  const group = new THREE.Group();
  group.name = 'DayThonViDa_JadeBamboo_PortalVisual';

  const mossBrickMat = new THREE.MeshStandardMaterial({
    color: PALETTE.mossBrick,
    roughness: 0.88,
    metalness: 0.05
  });
  const stonePlinthMat = new THREE.MeshStandardMaterial({
    color: 0x3b4a44,
    roughness: 0.84,
    metalness: 0.06
  });
  const bambooCulmMat = new THREE.MeshStandardMaterial({
    color: PALETTE.bambooCulm,
    roughness: 0.5,
    metalness: 0.06
  });
  const bambooLeafMat = new THREE.MeshPhysicalMaterial({
    color: PALETTE.bambooLeaf,
    roughness: 0.48,
    sheen: 0.55,
    sheenColor: new THREE.Color(0x86efac),
    side: THREE.DoubleSide
  });
  const jadeRingMat = new THREE.MeshStandardMaterial({
    color: PALETTE.jadeGlow,
    emissive: new THREE.Color(PALETTE.jadeCore),
    emissiveIntensity: 0.85,
    roughness: 0.25,
    metalness: 0.35
  });

  // Hai trụ đá rêu cổ & thân trúc song hành hai bên cổng
  const pierGeo = prepGeo(new THREE.BoxGeometry(0.68, 3.05, 0.72));
  const plinthGeo = prepGeo(new THREE.BoxGeometry(0.86, 0.28, 0.90));
  const capGeo = prepGeo(new THREE.BoxGeometry(0.84, 0.22, 0.88));
  const stalkGeo = prepGeo(new THREE.CylinderGeometry(0.052, 0.064, 3.85, 9));
  const nodeGeo = prepGeo(new THREE.TorusGeometry(0.064, 0.012, 6, 12));

  [-1.65, 1.65].forEach((px, sideIdx) => {
    const plinth = new THREE.Mesh(plinthGeo, stonePlinthMat);
    plinth.position.set(px, 0.14, 0);
    group.add(plinth);

    const pier = new THREE.Mesh(pierGeo, mossBrickMat);
    pier.position.set(px, 1.66, 0);
    group.add(pier);

    const cap = new THREE.Mesh(capGeo, stonePlinthMat);
    cap.position.set(px, 3.28, 0);
    group.add(cap);

    // 3 thân trúc ôm quanh mỗi trụ cổng
    [-0.22, 0.0, 0.22].forEach((oz, sIdx) => {
      const stalk = new THREE.Mesh(stalkGeo, bambooCulmMat);
      stalk.position.set(px + (sideIdx === 0 ? -0.34 : 0.34), 1.92, oz);
      stalk.rotation.z = (sideIdx === 0 ? -1 : 1) * (0.04 + sIdx * 0.02);
      group.add(stalk);

      for (let ny = 0.7; ny <= 3.3; ny += 0.65) {
        const ring = new THREE.Mesh(nodeGeo, bambooCulmMat);
        ring.rotation.x = Math.PI * 0.5;
        ring.position.set(px + (sideIdx === 0 ? -0.34 : 0.34), ny, oz);
        group.add(ring);
      }
    });
  });

  // Vòm trúc xanh uốn cong nhiều tầng
  [-0.14, 0.0, 0.14].forEach((rz, idx) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.68, 3.2, rz),
      new THREE.Vector3(-1.12, 4.12 + idx * 0.05, rz),
      new THREE.Vector3(0.0, 4.46 + idx * 0.06, rz),
      new THREE.Vector3(1.12, 4.12 + idx * 0.05, rz),
      new THREE.Vector3(1.68, 3.2, rz)
    ]);
    const archTube = new THREE.Mesh(
      prepGeo(new THREE.TubeGeometry(curve, 26, 0.065, 8, false)),
      bambooCulmMat
    );
    group.add(archTube);
  });

  // Vòng hào quang ngọc bích bao quanh tâm vòm cổng
  const jadeArchRing = new THREE.Mesh(
    prepGeo(new THREE.TorusGeometry(1.42, 0.04, 10, 40, Math.PI * 1.18)),
    jadeRingMat
  );
  jadeArchRing.position.set(0, 2.25, 0);
  jadeArchRing.rotation.z = -Math.PI * 0.09;
  group.add(jadeArchRing);

  // Tán lá trúc rủ mềm ("Lá trúc che ngang mặt chữ điền")
  const rng = createSeededRandom(3029);
  const leafCount = 72;
  const leafGeo = prepGeo(new THREE.ConeGeometry(0.065, 0.38, 4));
  const instLeaves = new THREE.InstancedMesh(leafGeo, bambooLeafMat, leafCount);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < leafCount; i++) {
    const t = (i / (leafCount - 1)) * Math.PI;
    const lx = -Math.cos(t) * (1.35 + rng() * 0.45);
    const ly = 3.15 + Math.sin(t) * 1.25 - rng() * 0.42;
    const lz = (rng() - 0.5) * 0.55;
    dummy.position.set(lx, ly, lz);
    dummy.rotation.set(Math.PI * 0.65 + rng() * 0.4, rng() * Math.PI * 2, (rng() - 0.5) * 0.6);
    dummy.scale.set(0.42, 0.8 + rng() * 0.45, 1.0);
    dummy.updateMatrix();
    instLeaves.setMatrixAt(i, dummy.matrix);
  }
  instLeaves.instanceMatrix.needsUpdate = true;
  group.add(instLeaves);

  // Bụi ngọc bích lơ lửng quanh cổng
  const moteCount = 64;
  const motePos = new Float32Array(moteCount * 3);
  for (let i = 0; i < moteCount; i++) {
    motePos[i * 3] = (rng() - 0.5) * 2.8;
    motePos[i * 3 + 1] = 0.4 + rng() * 3.6;
    motePos[i * 3 + 2] = (rng() - 0.5) * 0.9;
  }
  const moteGeo = prepGeo(new THREE.BufferGeometry());
  moteGeo.setAttribute('position', new THREE.BufferAttribute(motePos, 3));
  const moteTex = getViDaSoftParticleTexture(disposables);
  const moteMat = new THREE.PointsMaterial({
    map: moteTex,
    color: 0xa7f3d0,
    size: 0.14,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const motes = new THREE.Points(moteGeo, moteMat);
  motes.userData.ignoreRaycaster = true;
  motes.raycast = () => {};
  group.add(motes);

  // Biển chữ "CỔNG NHẬP CẢNH: ĐÂY THÔN VĨ DẠ"
  const signTex = createSignTexture(
    'CỔNG NHẬP CẢNH: ĐÂY THÔN VĨ DẠ',
    'Tiến lại gần hoặc Click qua hào quang ngọc bích để bước vào cõi thơ Hàn Mặc Tử',
    {},
    disposables
  );
  const signMesh = new THREE.Mesh(
    prepGeo(new THREE.PlaneGeometry(3.45, 0.64)),
    new THREE.MeshBasicMaterial({ map: signTex, transparent: true, side: THREE.DoubleSide })
  );
  signMesh.position.set(0, 4.92, 0.14);
  group.add(signMesh);

  group.traverse((c) => {
    c.userData.ignoreRaycaster = true;
  });

  return { group, motes, jadeArchRing };
}

/** Tạo Bia Đá Ngọc Bích & Khung Trúc Cổ kèm 2 đèn lồng Huế ấm áp */
function buildJadeSteleMonument(disposables) {
  const group = new THREE.Group();
  group.name = 'ViDa_JadeStele_Monument';

  const jadeStoneMat = new THREE.MeshPhysicalMaterial({
    color: 0x0f4c3a,
    roughness: 0.28,
    metalness: 0.12,
    clearcoat: 0.55,
    clearcoatRoughness: 0.22
  });
  const bambooMat = new THREE.MeshStandardMaterial({
    color: PALETTE.bambooCulm,
    roughness: 0.55
  });
  const roofMat = new THREE.MeshStandardMaterial({
    color: 0x2a1a12,
    roughness: 0.72
  });
  const lanternSilkMat = new THREE.MeshStandardMaterial({
    color: 0xffedd5,
    emissive: new THREE.Color(PALETTE.warmLantern),
    emissiveIntensity: 1.35,
    roughness: 0.45
  });

  const base = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(3.5, 0.42, 1.3)), jadeStoneMat);
  base.position.y = 0.21;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const steleBody = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(2.55, 2.75, 0.28)), jadeStoneMat);
  steleBody.position.y = 1.78;
  steleBody.castShadow = true;
  steleBody.receiveShadow = true;
  group.add(steleBody);

  const poemTex = createStelePoemTexture(disposables);
  const poemFaceMat = new THREE.MeshStandardMaterial({
    map: poemTex,
    roughness: 0.45,
    emissive: new THREE.Color(0x10b981),
    emissiveMap: poemTex,
    emissiveIntensity: 0.35
  });
  const faceFront = new THREE.Mesh(prepGeo(new THREE.PlaneGeometry(2.38, 2.48)), poemFaceMat);
  faceFront.position.set(0, 1.80, 0.15);
  group.add(faceFront);
  const faceBack = new THREE.Mesh(prepGeo(new THREE.PlaneGeometry(2.38, 2.48)), poemFaceMat);
  faceBack.position.set(0, 1.80, -0.15);
  faceBack.rotation.y = Math.PI;
  group.add(faceBack);

  // Khung trúc cổ & mái che hai tầng
  [-1.5, 1.5].forEach((px) => {
    const post = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.08, 0.095, 3.6, 10)), bambooMat);
    post.position.set(px, 1.82, 0);
    post.castShadow = true;
    group.add(post);

    // Đèn lồng Huế ấm áp treo hai bên bia
    const arm = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 6)), bambooMat);
    arm.rotation.z = Math.PI * 0.5;
    arm.position.set(px + (px < 0 ? -0.22 : 0.22), 2.75, 0.12);
    group.add(arm);

    const lantern = new THREE.Mesh(prepGeo(new THREE.SphereGeometry(0.19, 14, 12)), lanternSilkMat);
    lantern.scale.set(0.85, 1.15, 0.85);
    lantern.position.set(px + (px < 0 ? -0.45 : 0.45), 2.45, 0.12);
    group.add(lantern);

    const lCap = new THREE.Mesh(prepGeo(new THREE.ConeGeometry(0.18, 0.1, 10)), roofMat);
    lCap.position.set(px + (px < 0 ? -0.45 : 0.45), 2.66, 0.12);
    group.add(lCap);
  });

  const roofBeam = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(3.8, 0.18, 1.15)), roofMat);
  roofBeam.position.set(0, 3.68, 0);
  roofBeam.castShadow = true;
  group.add(roofBeam);

  const roofSlope = new THREE.Mesh(prepGeo(new THREE.ConeGeometry(2.45, 0.82, 4)), roofMat);
  roofSlope.rotation.y = Math.PI * 0.25;
  roofSlope.scale.set(1.25, 1.0, 0.58);
  roofSlope.position.set(0, 4.12, 0);
  roofSlope.castShadow = true;
  group.add(roofSlope);

  const lanternLight = new THREE.PointLight(PALETTE.warmLantern, 5.2, 14.0, 1.4);
  lanternLight.position.set(0, 2.6, 1.1);
  lanternLight.userData.ignoreRaycaster = true;
  group.add(lanternLight);

  group.traverse((c) => {
    if (!c.isLight) c.userData.ignoreRaycaster = true;
  });

  return { group, lanternLight };
}

/** Tạo Thuyền Chở Trăng (thuyền nan cổ + đèn đồng + hạt tinh tú) */
function buildMoonBoatGroup() {
  const group = new THREE.Group();
  group.name = 'ViDa_Realm_MoonBoat';

  const woodMat = new THREE.MeshStandardMaterial({ color: 0x3b2416, roughness: 0.82 });
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0x8a6d3b, roughness: 0.76 });
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x6b5333, roughness: 0.88, side: THREE.DoubleSide });
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: new THREE.Color(0xfef08a),
    emissiveIntensity: 1.45,
    roughness: 0.3
  });

  const segs = 14;
  for (let i = 0; i < segs; i++) {
    const t = i / (segs - 1) - 0.5;
    const z = t * 5.2;
    const widthFactor = Math.max(0.16, Math.cos(t * Math.PI * 0.92));
    const liftY = Math.pow(Math.abs(t) * 2.0, 2.2) * 0.34;
    const rib = new THREE.Mesh(
      prepGeo(new THREE.BoxGeometry(1.52 * widthFactor, 0.32, 0.46)),
      woodMat
    );
    rib.position.set(0, 0.16 + liftY, z);
    group.add(rib);
  }

  [-1, 1].forEach((side) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.56, -2.65),
      new THREE.Vector3(side * 0.62, 0.38, -1.25),
      new THREE.Vector3(side * 0.78, 0.34, 0),
      new THREE.Vector3(side * 0.62, 0.38, 1.25),
      new THREE.Vector3(0, 0.56, 2.65)
    ]);
    group.add(new THREE.Mesh(prepGeo(new THREE.TubeGeometry(curve, 22, 0.055, 7, false)), bambooMat));
  });

  const muiGeo = prepGeo(new THREE.CylinderGeometry(0.75, 0.75, 1.85, 16, 1, true, 0, Math.PI));
  muiGeo.rotateZ(Math.PI * 0.5);
  muiGeo.rotateY(Math.PI * 0.5);
  const mui = new THREE.Mesh(muiGeo, canopyMat);
  mui.position.set(0, 0.48, -0.35);
  group.add(mui);

  const lanternPole = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.025, 0.03, 0.85, 7)), bambooMat);
  lanternPole.position.set(0, 0.88, 2.25);
  group.add(lanternPole);

  const lanternLamp = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.12, 0.1, 0.24, 10)), lampMat);
  lanternLamp.position.set(0, 1.15, 2.18);
  group.add(lanternLamp);

  const boatLight = new THREE.PointLight(0xfef08a, 4.8, 16.0, 1.4);
  boatLight.position.set(0, 1.35, 2.1);
  group.add(boatLight);

  group.traverse((c) => {
    if (!c.isLight) c.userData.ignoreRaycaster = true;
  });

  return { group, boatLight };
}

/** Tạo Bóng Hình Thiếu Nữ Áo Dài Trắng với Custom Distance-Fade Shader (< 4m tan biến) */
function createWhiteAoDaiApparition() {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uProximityAlpha: { value: 1.0 },
      uFadeStart: { value: 4.0 },
      uFadeEnd: { value: 1.15 },
      uCoreColor: { value: new THREE.Color(0xffffff) },
      uRimColor: { value: new THREE.Color(0xbae6fd) }
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vWorldPos;
      varying vec3 vWorldNorm;
      varying float vHeight;
      void main() {
        vHeight = position.y;
        vec3 pos = position;
        float sway = smoothstep(0.15, 1.4, 1.5 - clamp(position.y, 0.0, 1.5));
        pos.x += sin(uTime * 1.55 + position.y * 2.8) * 0.028 * sway;
        pos.z += cos(uTime * 1.25 + position.x * 3.8) * 0.032 * sway;
        vec4 wp = modelMatrix * vec4(pos, 1.0);
        vWorldPos = wp.xyz;
        vWorldNorm = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uProximityAlpha;
      uniform float uFadeStart;
      uniform float uFadeEnd;
      uniform vec3 uCoreColor;
      uniform vec3 uRimColor;
      varying vec3 vWorldPos;
      varying vec3 vWorldNorm;
      varying float vHeight;
      void main() {
        vec3 N = normalize(vWorldNorm);
        vec3 V = normalize(cameraPosition - vWorldPos);
        float fresnel = pow(1.0 - abs(dot(N, V)), 1.75);
        float dist = length(cameraPosition - vWorldPos);
        float gpuDistFade = smoothstep(uFadeEnd, uFadeStart, dist);
        float pulse = 0.88 + 0.12 * sin(uTime * 1.9 + vHeight * 2.4);
        vec3 col = mix(uCoreColor, uRimColor, fresnel * 0.42) * (1.2 + fresnel * 0.6);
        float alpha = clamp((0.64 + fresnel * 0.36) * pulse * gpuDistFade * uProximityAlpha, 0.0, 0.96);
        if (alpha < 0.005) discard;
        gl_FragColor = vec4(col, alpha);
      }
    `
  });

  const group = new THREE.Group();
  group.name = 'ViDa_Realm_WhiteAoDai';

  // Tà áo dài xòe mềm phía dưới
  const skirt = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.17, 0.48, 1.08, 24, 8, true)), mat);
  skirt.position.y = 0.54;
  group.add(skirt);

  // Thân áo dài ôm dáng
  const bodice = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.15, 0.18, 0.56, 18, 4)), mat);
  bodice.position.y = 1.28;
  group.add(bodice);

  [-1, 1].forEach((side) => {
    const sleeve = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.055, 0.085, 0.62, 10)), mat);
    sleeve.position.set(side * 0.22, 1.22, 0.02);
    sleeve.rotation.z = side * 0.18;
    group.add(sleeve);
  });

  const head = new THREE.Mesh(prepGeo(new THREE.SphereGeometry(0.12, 16, 14)), mat);
  head.position.set(0, 1.70, 0.01);
  group.add(head);

  const hair = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.105, 0.17, 0.66, 12, 1, true)), mat);
  hair.position.set(0, 1.42, -0.08);
  hair.rotation.x = 0.14;
  group.add(hair);

  const nonLa = new THREE.Mesh(prepGeo(new THREE.ConeGeometry(0.30, 0.17, 22, 1, true)), mat);
  nonLa.position.set(0, 1.82, -0.02);
  nonLa.rotation.x = -0.14;
  group.add(nonLa);

  group.traverse((c) => {
    c.userData.ignoreRaycaster = true;
    c.castShadow = false;
    c.receiveShadow = false;
  });

  return { group, mat };
}

/** Tạo Lore Orb phát sáng ngọc bích/trăng kèm vòng quay năng lượng & click proxy */
function createLoreOrbStation({
  name,
  position,
  loreKey,
  colorHex = 0x34d399,
  labelTitle = 'Điểm Thơ Vĩ Dạ'
}) {
  const holder = new THREE.Group();
  holder.name = name;
  holder.position.copy(position);

  const orbMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: new THREE.Color(colorHex),
    emissiveIntensity: 1.55,
    roughness: 0.15,
    metalness: 0.2,
    transparent: true,
    opacity: 0.92
  });
  const orb = new THREE.Mesh(prepGeo(new THREE.OctahedronGeometry(0.32, 2)), orbMat);
  orb.userData.ignoreRaycaster = true;
  holder.add(orb);

  const ringMat = new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const ring = new THREE.Mesh(prepGeo(new THREE.TorusGeometry(0.55, 0.025, 8, 32)), ringMat);
  ring.rotation.x = Math.PI * 0.35;
  ring.userData.ignoreRaycaster = true;
  holder.add(ring);

  const light = new THREE.PointLight(colorHex, 3.8, 12.0, 1.5);
  light.userData.ignoreRaycaster = true;
  holder.add(light);

  const proxy = new THREE.Mesh(
    prepGeo(new THREE.BoxGeometry(1.75, 1.95, 1.75)),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false })
  );
  proxy.name = `${name}_ClickProxy`;
  proxy.userData = {
    isClickProxy: true,
    isArtifact3D: true,
    ignoreRaycaster: false,
    loreKey,
    roomId: REALM_ID,
    styleTheme: 'ngoc_vi_da',
    title: labelTitle
  };
  holder.add(proxy);

  return { holder, orb, ring, light, proxy };
}

/**
 * ============================================================================
 * FACTORY CHÍNH: createDayThonViDaStoryRealm(options)
 * ============================================================================
 */
export function createDayThonViDaStoryRealm(options = {}) {
  const {
    scene = null,
    mainScene = null,
    realmScene = null,
    interiorGroup = null,
    roomGroup = null,
    camera = null,
    renderer = null,
    cameraManager = null,
    hitboxManager = null,
    loreGuide = null,
    spatialAudio = null,
    portalInteraction = null,
    immersionSystem = null,
    portalLocalPos = new THREE.Vector3(5.6, 0.08, 8.8),
    portalLocalRotY = -0.58
  } = options;

  let _camera = camera;
  let _renderer = renderer;
  let _cameraManager = cameraManager;
  let _hitboxManager = hitboxManager;
  let _loreGuide = loreGuide;
  let _spatialAudio = spatialAudio;
  let _portalInteraction = portalInteraction;
  let _immersionSystem = immersionSystem;

  const _mainScene = mainScene || scene || (typeof window !== 'undefined' ? window.__app?.mainScene : null);
  let _realmScene = realmScene || (typeof window !== 'undefined' ? window.__app?.dayThonViDaScene : null);

  let _isInsideRealm = false;
  let _isTransitioning = false;
  let _reentryCooldown = 0;
  let _portalHitboxesRegistered = false;
  let _prevCamDistToPortal = Infinity;
  let _portalProximityArmed = false;

  let _realmRoot = null;
  let _realmDisposables = [];
  let _realmCustomMaterials = [];
  let _realmDebugGroup = null;
  let _realmWalkables = [];
  let _realmState = null;

  // Auto-Tour state
  let _tourActive = false;
  let _tourPhase = 'idle'; // 'room_flying' | 'room_dwelling' | 'portal_crossing' | 'realm_flying' | 'realm_dwelling'
  let _tourIdx = 0;
  let _tourPhaseStart = 0;
  const _tourFlightStartPos = new THREE.Vector3();
  const _tourFlightStartQuat = new THREE.Quaternion();
  const _tourFlightEndQuat = new THREE.Quaternion();

  const defaultPortalW = localRoomToWorld(REALM_ID, portalLocalPos.x, portalLocalPos.y + 1.8, portalLocalPos.z);
  const museumPortalTriggerWorldPos = new THREE.Vector3(defaultPortalW.x, defaultPortalW.y, defaultPortalW.z);

  const realmSpawnPos = new THREE.Vector3(0, getViDaTerrainHeightAt(0, 49.5) + 1.8, 49.5);
  const realmSpawnLookAt = new THREE.Vector3(0, 2.6, 20.0);

  function getMuseumReturnPose() {
    if (interiorGroup) {
      interiorGroup.updateMatrixWorld(true);
      // Đặt camera đứng trước cổng vòm trúc xanh trong Phòng 302 (hướng vào cổng)
      const frontOffset = new THREE.Vector3(0, 1.8, 3.6).applyAxisAngle(new THREE.Vector3(0, 1, 0), portalLocalRotY);
      const camLocal = portalLocalPos.clone().add(frontOffset);
      const lookLocal = portalLocalPos.clone().add(new THREE.Vector3(0, 2.0, 0));
      return {
        camPos: interiorGroup.localToWorld(camLocal),
        lookAt: interiorGroup.localToWorld(lookLocal)
      };
    }
    const fbCam = localRoomToWorld(REALM_ID, 2.6, 1.8, 11.4);
    const fbLook = localRoomToWorld(REALM_ID, portalLocalPos.x, 2.0, portalLocalPos.z);
    return {
      camPos: new THREE.Vector3(fbCam.x, fbCam.y, fbCam.z),
      lookAt: new THREE.Vector3(fbLook.x, fbLook.y, fbLook.z)
    };
  }

  // =========================================================================
  // PHẦN 1: CỔNG VÒM TRÚC XANH HÀO QUANG NGỌC BÍCH TẠI PHÒNG 302
  // =========================================================================
  const portalGroup = new THREE.Group();
  portalGroup.name = 'DayThonViDa_Portal_Station';
  portalGroup.position.copy(portalLocalPos);
  portalGroup.rotation.y = portalLocalRotY;

  const portalParent = interiorGroup || roomGroup || _mainScene;
  if (portalParent) portalParent.add(portalGroup);

  const portalSignDisposables = [];
  const portalVisual = buildJadeBambooPortalVisual(portalSignDisposables);
  portalGroup.add(portalVisual.group);

  // Vòng xoáy Custom Shader THREE.DoubleSide ngọc bích giữa cổng vòm trúc
  const portalShaderMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uJadeDeep: { value: new THREE.Color(PALETTE.jadeDeep) },
      uJadeBright: { value: new THREE.Color(PALETTE.jadeGlow) },
      uGoldRim: { value: new THREE.Color(PALETTE.moonGold) }
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
      uniform vec3 uJadeDeep;
      uniform vec3 uJadeBright;
      uniform vec3 uGoldRim;
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - vec2(0.5, 0.46)) * vec2(1.0, 1.32);
        float d = length(p);
        float ang = atan(p.y, p.x);
        float swirl = sin(d * 18.0 - uTime * 3.1 + ang * 3.0) * 0.5 + 0.5;
        float ripple = cos(d * 26.0 - uTime * 4.2 - ang * 2.0) * 0.5 + 0.5;
        float core = exp(-d * 3.4);
        float mask = smoothstep(0.62, 0.12, d);
        vec3 col = mix(uJadeDeep, uJadeBright, swirl * 0.7 + core * 0.4);
        col = mix(col, uGoldRim, ripple * 0.22 * smoothstep(0.18, 0.52, d));
        float alpha = clamp((core * 0.68 + swirl * 0.34) * mask, 0.0, 0.90);
        gl_FragColor = vec4(col, alpha);
      }
    `
  });
  const portalVortexPlane = new THREE.Mesh(prepGeo(new THREE.PlaneGeometry(2.5, 3.35)), portalShaderMat);
  portalVortexPlane.position.set(0, 1.88, 0.0);
  portalVortexPlane.userData.ignoreRaycaster = true;
  portalGroup.add(portalVortexPlane);

  const portalPointLight = new THREE.PointLight(PALETTE.jadeGlow, 3.0, 9.5, 1.6);
  portalPointLight.position.set(0, 2.6, 0.55);
  portalPointLight.userData.ignoreRaycaster = true;
  portalGroup.add(portalPointLight);

  const portalClickProxy = new THREE.Mesh(
    prepGeo(new THREE.BoxGeometry(3.0, 4.1, 1.3)),
    new THREE.MeshBasicMaterial({
      color: PALETTE.jadeGlow,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    })
  );
  portalClickProxy.name = 'DayThonViDa_Portal_ClickProxy';
  portalClickProxy.position.set(0, 2.05, 0);
  portalClickProxy.userData = {
    isClickProxy: true,
    isBookPortal: true,
    isTeleportBook: true,
    targetRealm: 'DAY_THON_VI_DA_REALM',
    ignoreRaycaster: false,
    portalMetadata: {
      id: REALM_ID,
      title: 'CÕI THẾ GIỚI MỞ • ĐÂY THÔN VĨ DẠ',
      author: 'Hàn Mặc Tử (1912 – 1940)',
      genre: 'Thơ Mới (1938) • Tập Thơ Điên',
      quote: '“Sao anh không về chơi thôn Vĩ? / Nhìn nắng hàng cau nắng mới lên...”',
      themeColor: PALETTE.jadeCore,
      floor: 3,
      roomIndex: 1,
      targetRealm: 'DAY_THON_VI_DA_REALM',
      portalReady: true,
      onActivate: () => enterRealm(REALM_ID)
    },
    onActivate: () => enterRealm(REALM_ID)
  };
  portalGroup.add(portalClickProxy);

  function syncMuseumPortalHitboxes() {
    if (roomGroup) roomGroup.updateMatrixWorld(true);
    if (interiorGroup) interiorGroup.updateMatrixWorld(true);
    portalGroup.updateMatrixWorld(true);

    portalGroup.localToWorld(museumPortalTriggerWorldPos.set(0, 1.75, 0));

    if (_hitboxManager) {
      if (!_portalHitboxesRegistered) {
        _portalHitboxesRegistered = true;
        const leftPierW = portalGroup.localToWorld(new THREE.Vector3(-1.68, 1.8, 0));
        const rightPierW = portalGroup.localToWorld(new THREE.Vector3(1.68, 1.8, 0));
        _hitboxManager.registerSolidObjectCollider(null, {
          customBox: new THREE.Box3().setFromCenterAndSize(leftPierW, new THREE.Vector3(0.95, 3.6, 0.95)),
          tag: 'ViDa_PortalPierLeft',
          helperColor: 0x34d399,
          realm: 'museum'
        });
        _hitboxManager.registerSolidObjectCollider(null, {
          customBox: new THREE.Box3().setFromCenterAndSize(rightPierW, new THREE.Vector3(0.95, 3.6, 0.95)),
          tag: 'ViDa_PortalPierRight',
          helperColor: 0x34d399,
          realm: 'museum'
        });
      }

      portalClickProxy.updateMatrixWorld(true);
      const portalBox = new THREE.Box3().setFromObject(portalClickProxy);
      if (!_hitboxManager.clickProxies.includes(portalClickProxy)) {
        portalClickProxy.userData.realm = 'museum';
        _hitboxManager.clickProxies.push(portalClickProxy);
        const h = new THREE.Box3Helper(portalBox, 0x6ee7b7);
        h.name = `Helper_${portalClickProxy.name}`;
        _hitboxManager.debugHelpers?.add?.(h);
      }
    }

    if (_portalInteraction?.registerInteractiveBook) {
      _portalInteraction.registerInteractiveBook(
        portalClickProxy,
        realmSpawnPos,
        portalClickProxy.userData.portalMetadata
      );
    } else {
      registerInteractiveBook(
        portalClickProxy,
        realmSpawnPos,
        portalClickProxy.userData.portalMetadata
      );
    }
  }

  // =========================================================================
  // PHẦN 2: VIGNETTE NGỌC BÍCH, HUD CÕI THÔN VĨ & NGÂM THƠ (TTS)
  // =========================================================================
  function getOrCreateVignetteOverlay() {
    if (typeof document === 'undefined') return null;
    let el = document.getElementById('vida-dolly-vignette');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'vida-dolly-vignette';
    el.style.cssText = `
      position: fixed; inset: 0; pointer-events: none; z-index: 999990;
      opacity: 0; transition: opacity 0.18s ease;
      background: radial-gradient(circle, rgba(52,211,153,0.28) 0%, rgba(6,78,59,0.92) 56%, #050c14 100%);
    `;
    document.body.appendChild(el);
    return el;
  }

  function speakPoemRecitation() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(
        'Sao anh không về chơi thôn Vĩ? Nhìn nắng hàng cau nắng mới lên. Vườn ai mướt quá xanh như ngọc, lá trúc che ngang mặt chữ điền. Gió theo lối gió, mây đường mây, dòng nước buồn thiu, hoa bắp lay. Thuyền ai đậu bến sông trăng đó, có chở trăng về kịp tối nay? Mơ khách đường xa, khách đường xa, áo em trắng quá nhìn không ra. Ở đây sương khói mờ nhân ảnh, ai biết tình ai có đậm đà?'
      );
      utter.lang = 'vi-VN';
      utter.rate = 0.84;
      utter.pitch = 0.94;
      utter.volume = 0.82;
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
    let hud = document.getElementById('vida-realm-hud');
    if (hud) return hud;

    hud = document.createElement('div');
    hud.id = 'vida-realm-hud';
    hud.style.cssText = `
      position: fixed; top: 18px; left: 50%; transform: translateX(-50%);
      z-index: 99990; display: none; align-items: center; gap: 10px;
      padding: 10px 18px; border-radius: 999px;
      background: linear-gradient(135deg, rgba(6,44,35,0.94), rgba(11,19,43,0.92));
      border: 1.5px solid #34d399; color: #ecfdf5;
      font-family: "Segoe UI", system-ui, sans-serif; font-size: 13px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.72); backdrop-filter: blur(8px);
    `;
    hud.innerHTML = `
      <span id="vida-hud-title" style="font-weight:700; color:#a7f3d0; letter-spacing:0.35px;">
        🌿 ĐÂY THÔN VĨ DẠ • HÀN MẶC TỬ (1938)
      </span>
      <button id="vida-btn-recite" style="
        background: rgba(52,211,153,0.18); border:1px solid #34d399; color:#d1fae5;
        padding:6px 12px; border-radius:999px; cursor:pointer; font-weight:600; font-size:12px;
      ">🔊 Ngâm Thơ Vĩ Dạ</button>
      <button id="vida-btn-tour" style="
        background: linear-gradient(90deg, #10b981, #34d399); border:none; color:#052e23;
        padding:6px 14px; border-radius:999px; cursor:pointer; font-weight:700; font-size:12px;
      ">🧭 Auto-Tour Thôn Vĩ</button>
      <button id="vida-btn-exit" style="
        background: rgba(180,83,9,0.75); border:1px solid #fde68a; color:#fef3c7;
        padding:6px 14px; border-radius:999px; cursor:pointer; font-weight:700; font-size:12px;
      ">⬅ Về Phòng 302 [ESC]</button>
    `;
    document.body.appendChild(hud);

    document.getElementById('vida-btn-recite')?.addEventListener('click', (e) => {
      e.stopPropagation();
      speakPoemRecitation();
      _loreGuide?.showLoreCard?.('vida_realm_bia_ngo');
    });
    document.getElementById('vida-btn-tour')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (_tourActive) stopAutoTour();
      else startRealmOnlyTour();
    });
    document.getElementById('vida-btn-exit')?.addEventListener('click', (e) => {
      e.stopPropagation();
      exitRealm();
    });

    return hud;
  }

  // =========================================================================
  // PHẦN 3: DỰNG THẾ GIỚI MỞ ĐÂY THÔN VĨ DẠ TRONG REALMSCENE
  // =========================================================================
  function getActiveRealmScene() {
    if (_realmScene) return _realmScene;
    if (typeof window !== 'undefined' && window.__app?.dayThonViDaScene) {
      _realmScene = window.__app.dayThonViDaScene;
      return _realmScene;
    }
    _realmScene = new THREE.Scene();
    _realmScene.name = 'DayThonViDa_OpenWorld_Scene';
    return _realmScene;
  }

  function mountViDaRealm() {
    const targetScene = getActiveRealmScene();
    disposeViDaRealm();

    const rng = createSeededRandom(1938);
    const root = new THREE.Group();
    root.name = 'DayThonViDa_OpenWorld_Root';
    targetScene.add(root);
    _realmRoot = root;

    const tex = createRealmProceduralTextures(_realmDisposables);
    const trackMat = (m) => {
      _realmCustomMaterials.push(m);
      return m;
    };

    const morningBg = new THREE.Color(PALETTE.morningSky);
    const nightBg = new THREE.Color(PALETTE.nightSky);
    const morningFogCol = new THREE.Color(PALETTE.morningFog);
    const nightFogCol = new THREE.Color(PALETTE.nightSky);
    targetScene.background = morningBg.clone();
    targetScene.fog = new THREE.FogExp2(PALETTE.morningFog, 0.0055);

    // 1. SKYDOME 360° (r = 340m, Custom GLSL Day/Night Lerp + Sao + Quầng Sáng)
    const skyGeo = prepGeo(new THREE.SphereGeometry(340, 48, 28));
    const skyMat = trackMat(new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTime: { value: 0 },
        uNightMix: { value: 0 }
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uNightMix;
        varying vec3 vDir;
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        void main() {
          float h = clamp(vDir.y, 0.0, 1.0);
          // Ban mai Vĩ Dạ ấm áp xanh ngọc -> vàng nắng
          vec3 mHorizon = vec3(0.84, 0.94, 0.87);
          vec3 mZenith = vec3(0.46, 0.76, 0.86);
          vec3 morningCol = mix(mHorizon, mZenith, pow(h, 0.55));
          vec3 sunDir = normalize(vec3(0.45, 0.36, 0.82));
          float sunDot = max(0.0, dot(vDir, sunDir));
          morningCol += vec3(1.0, 0.91, 0.62) * (pow(sunDot, 12.0) * 0.42 + pow(sunDot, 180.0) * 0.95);

          // Đêm huyền mặc xứ Huế (#0b132b)
          vec3 nHorizon = vec3(0.09, 0.14, 0.28);
          vec3 nZenith = vec3(0.03, 0.05, 0.12);
          vec3 nightCol = mix(nHorizon, nZenith, pow(h, 0.6));
          vec3 moonDir = normalize(vec3(0.04, 0.31, -0.95));
          float moonDot = max(0.0, dot(vDir, moonDir));
          nightCol += vec3(0.73, 0.90, 0.99) * pow(moonDot, 10.0) * 0.28;

          vec3 sky = mix(morningCol, nightCol, uNightMix);

          // Tinh tú lấp lánh trên SkyDome về đêm
          vec2 grid = floor(vDir.xz / max(0.22, vDir.y + 0.35) * 105.0);
          float star = step(0.993, hash(grid)) * smoothstep(0.12, 0.55, h);
          float twinkle = 0.6 + 0.4 * sin(uTime * 2.4 + hash(grid) * 24.0);
          sky += vec3(0.88, 0.95, 1.0) * star * twinkle * uNightMix * 0.72;

          gl_FragColor = vec4(sky, 1.0);
        }
      `
    }));
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    skyDome.name = 'ViDa_Realm_SkyDome360';
    skyDome.userData.ignoreRaycaster = true;
    root.add(skyDome);

    // Trường sao lấp lánh 3D (Points) & Vầng Trăng Khổng Lồ
    const starCount = 720;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = rng() * Math.PI * 2;
      const phi = 0.12 + rng() * (Math.PI * 0.44);
      const r = 270 + rng() * 35;
      starPos[i * 3] = Math.cos(theta) * Math.cos(phi) * r;
      starPos[i * 3 + 1] = Math.sin(phi) * r;
      starPos[i * 3 + 2] = Math.sin(theta) * Math.cos(phi) * r;
    }
    const starGeo = prepGeo(new THREE.BufferGeometry());
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = trackMat(new THREE.PointsMaterial({
      color: 0xe0f2fe,
      size: 1.45,
      map: tex.particleTex,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    }));
    const starField = new THREE.Points(starGeo, starMat);
    starField.name = 'ViDa_Realm_StarField';
    starField.userData.ignoreRaycaster = true;
    root.add(starField);

    const giantMoonGroup = new THREE.Group();
    giantMoonGroup.name = 'ViDa_Realm_GiantMoon';
    giantMoonGroup.position.set(6.0, 58.0, -210.0);
    root.add(giantMoonGroup);

    const moonSphereMat = trackMat(new THREE.MeshBasicMaterial({
      color: 0xfef9c3,
      map: tex.moonTex,
      transparent: true,
      opacity: 0.25,
      fog: false
    }));
    const moonSphere = new THREE.Mesh(prepGeo(new THREE.SphereGeometry(16.5, 28, 22)), moonSphereMat);
    giantMoonGroup.add(moonSphere);

    const moonHaloInnerMat = trackMat(new THREE.SpriteMaterial({
      map: tex.particleTex,
      color: PALETTE.moonGold,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    }));
    const moonHaloInner = new THREE.Sprite(moonHaloInnerMat);
    moonHaloInner.scale.set(62, 62, 1);
    giantMoonGroup.add(moonHaloInner);

    const moonHaloOuterMat = trackMat(new THREE.SpriteMaterial({
      map: tex.particleTex,
      color: PALETTE.moonSilver,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    }));
    const moonHaloOuter = new THREE.Sprite(moonHaloOuterMat);
    moonHaloOuter.scale.set(105, 105, 1);
    giantMoonGroup.add(moonHaloOuter);
    giantMoonGroup.traverse((c) => { c.userData.ignoreRaycaster = true; });

    // Vành đai núi Ngự Bình / đồi Vọng Cảnh 360° đến tận chân trời
    const mountainMat = trackMat(new THREE.MeshStandardMaterial({
      color: 0x1e3a3a,
      roughness: 0.94,
      metalness: 0.02
    }));
    const ridgeCount = 44;
    const ridgeGeo = prepGeo(new THREE.ConeGeometry(28, 34, 7));
    const instMountains = new THREE.InstancedMesh(ridgeGeo, mountainMat, ridgeCount);
    instMountains.name = 'ViDa_Realm_NguBinhMountains360';
    instMountains.userData.ignoreRaycaster = true;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < ridgeCount; i++) {
      const ang = (i / ridgeCount) * Math.PI * 2 + (rng() - 0.5) * 0.08;
      const dist = 152 + rng() * 58;
      const hScale = 0.72 + rng() * 0.95;
      const wScale = 0.85 + rng() * 0.75;
      dummy.position.set(Math.cos(ang) * dist, hScale * 12.0 - 4.0, Math.sin(ang) * dist);
      dummy.rotation.set(0, rng() * Math.PI, 0);
      dummy.scale.set(wScale, hScale, wScale);
      dummy.updateMatrix();
      instMountains.setMatrixAt(i, dummy.matrix);
    }
    instMountains.instanceMatrix.needsUpdate = true;
    root.add(instMountains);

    // 2. HỆ THỐNG ÁNH SÁNG ĐỘNG (BAN MAI #ffe89e SHADOW 1024x1024 <-> ÁNH TRĂNG #bae6fd)
    const hemiLight = new THREE.HemisphereLight(0xcbf3e0, 0x2f4b38, 0.85);
    hemiLight.userData.ignoreRaycaster = true;
    root.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(PALETTE.morningSun, 2.5);
    sunLight.name = 'ViDa_Realm_SunLight';
    sunLight.position.set(24, 34, 36);
    sunLight.target.position.set(0, 0, 22);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    sunLight.shadow.camera.near = 2.0;
    sunLight.shadow.camera.far = 96.0;
    sunLight.shadow.camera.left = -28;
    sunLight.shadow.camera.right = 28;
    sunLight.shadow.camera.top = 28;
    sunLight.shadow.camera.bottom = -28;
    sunLight.userData = {
      isViDaMorningLight: true,
      isViDaShadowLight: true,
      preserveShadow: true,
      ignoreRaycaster: true
    };
    sunLight.target.userData = { isLightTarget: true, ignoreRaycaster: true };
    root.add(sunLight);
    root.add(sunLight.target);

    const moonLight = new THREE.DirectionalLight(PALETTE.moonSilver, 0.25);
    moonLight.name = 'ViDa_Realm_MoonLight';
    moonLight.position.set(6, 36, -64);
    moonLight.castShadow = false;
    moonLight.userData.ignoreRaycaster = true;
    root.add(moonLight);

    if (_renderer?.shadowMap) {
      _renderer.shadowMap.enabled = true;
      _renderer.shadowMap.autoUpdate = true;
    }

    // 3. ĐỊA HÌNH LIÊN HOÀN 3 VÙNG & CẦU TRE QUA SÔNG HƯƠNG
    const grassMat = trackMat(new THREE.MeshStandardMaterial({
      color: 0x3b8c52,
      map: tex.grassDiff,
      normalMap: tex.grassNorm,
      roughness: 0.86,
      metalness: 0.02
    }));
    const tilePathMat = trackMat(new THREE.MeshStandardMaterial({
      color: 0xc2775d,
      map: tex.tileDiff,
      normalMap: tex.tileNorm,
      roughness: 0.78,
      metalness: 0.04
    }));
    const mistGroundMat = trackMat(new THREE.MeshStandardMaterial({
      color: 0x3a4e5c,
      map: tex.mistGroundDiff,
      roughness: 0.9,
      metalness: 0.04
    }));

    // Vùng 1: Đất làng Vĩ Dạ (X: -88..+88, Z: +6..+60)
    const southGeo = prepGeo(new THREE.PlaneGeometry(176, 54, 72, 36));
    southGeo.rotateX(-Math.PI * 0.5);
    const sPos = southGeo.attributes.position;
    for (let i = 0; i < sPos.count; i++) {
      const vx = sPos.getX(i);
      const vz = sPos.getZ(i) + 33.0; // Z in [6, 60]
      sPos.setZ(i, vz);
      sPos.setY(i, getViDaTerrainHeightAt(vx, vz));
    }
    southGeo.computeVertexNormals();
    southGeo.computeBoundingBox();
    southGeo.computeBoundingSphere();
    const southTerrain = new THREE.Mesh(southGeo, grassMat);
    southTerrain.name = 'ViDa_Realm_SouthVillageGround';
    southTerrain.receiveShadow = true;
    southTerrain.userData = {
      preserveShadow: true,
      isTeleportFloor: true,
      isViDaWalkable: true,
      isWalkableFloor: true
    };
    root.add(southTerrain);
    _realmWalkables.push(southTerrain);

    // Đường gạch Bát Tràng cổ dọc trục đường làng (Z: +6..+54)
    const villageRoad = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(6.8, 0.06, 48.0)), tilePathMat);
    villageRoad.name = 'ViDa_Realm_VillageRoad';
    villageRoad.position.set(0, 0.015, 30.0);
    villageRoad.receiveShadow = true;
    villageRoad.userData = {
      preserveShadow: true,
      isTeleportFloor: true,
      isViDaWalkable: true,
      isWalkableFloor: true
    };
    root.add(villageRoad);
    _realmWalkables.push(villageRoad);

    // Vệt nắng loang động trên đường làng Vĩ Dạ (Dappled Sunspots)
    const dappledMat = trackMat(new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uOpacityScale: { value: 1.0 },
        uColor: { value: new THREE.Color(0xfff1b0) }
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
        uniform float uOpacityScale;
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          vec2 p = vUv * vec2(6.0, 22.0);
          float s1 = sin(p.x * 1.5 + uTime * 0.6) * cos(p.y * 1.6 - uTime * 0.4);
          float s2 = sin((p.x + p.y) * 2.2 - uTime * 0.8) * cos((p.x - p.y) * 1.7 + uTime * 0.5);
          float spot = smoothstep(0.28, 0.85, (s1 + s2) * 0.25 + 0.5);
          float edge = 1.0 - smoothstep(0.32, 0.5, abs(vUv.x - 0.5));
          gl_FragColor = vec4(uColor, spot * edge * 0.24 * uOpacityScale);
        }
      `
    }));
    const dappledPlane = new THREE.Mesh(prepGeo(new THREE.PlaneGeometry(10.5, 42.0)), dappledMat);
    dappledPlane.rotation.x = -Math.PI * 0.5;
    dappledPlane.position.set(0, 0.065, 29.0);
    dappledPlane.userData.ignoreRaycaster = true;
    root.add(dappledPlane);

    // Vùng 3: Bờ Sương Khói phía Bắc (X: -48..+48, Z: -14..-68)
    const northGeo = prepGeo(new THREE.PlaneGeometry(96, 54, 48, 36));
    northGeo.rotateX(-Math.PI * 0.5);
    const nPos = northGeo.attributes.position;
    for (let i = 0; i < nPos.count; i++) {
      const vx = nPos.getX(i);
      const vz = nPos.getZ(i) - 41.0; // Z in [-68, -14]
      nPos.setZ(i, vz);
      nPos.setY(i, getViDaTerrainHeightAt(vx, vz));
    }
    northGeo.computeVertexNormals();
    northGeo.computeBoundingBox();
    northGeo.computeBoundingSphere();
    const northTerrain = new THREE.Mesh(northGeo, mistGroundMat);
    northTerrain.name = 'ViDa_Realm_NorthMistGround';
    northTerrain.userData = {
      isTeleportFloor: true,
      isViDaWalkable: true,
      isWalkableFloor: true
    };
    root.add(northTerrain);
    _realmWalkables.push(northTerrain);

    // Cầu Tre uốn cong qua Sông Hương (|x| <= 2.4, Z: +6..-14)
    const bridgeGroup = new THREE.Group();
    bridgeGroup.name = 'ViDa_Realm_BambooBridge';
    root.add(bridgeGroup);

    const bambooBridgeMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x8a6d3b, roughness: 0.78 }));
    const bambooRailMat = trackMat(new THREE.MeshStandardMaterial({ color: PALETTE.bambooCulm, roughness: 0.62 }));

    const bridgeWalkGeo = prepGeo(new THREE.PlaneGeometry(4.6, 20.0, 6, 40));
    bridgeWalkGeo.rotateX(-Math.PI * 0.5);
    const bwPos = bridgeWalkGeo.attributes.position;
    for (let i = 0; i < bwPos.count; i++) {
      const vx = bwPos.getX(i);
      const vz = bwPos.getZ(i) - 4.0; // Z in [-14, +6]
      bwPos.setZ(i, vz);
      bwPos.setY(i, getViDaTerrainHeightAt(vx, vz));
    }
    bridgeWalkGeo.computeVertexNormals();
    bridgeWalkGeo.computeBoundingBox();
    bridgeWalkGeo.computeBoundingSphere();
    const bridgeWalkDeck = new THREE.Mesh(bridgeWalkGeo, bambooBridgeMat);
    bridgeWalkDeck.name = 'ViDa_Realm_BambooBridgeWalkable';
    bridgeWalkDeck.receiveShadow = true;
    bridgeWalkDeck.userData = {
      preserveShadow: true,
      isTeleportFloor: true,
      isViDaWalkable: true,
      isWalkableFloor: true
    };
    bridgeGroup.add(bridgeWalkDeck);
    _realmWalkables.push(bridgeWalkDeck);

    // Các thanh nan tre ngang & lan can hai bên cầu
    const plankGeo = prepGeo(new THREE.CylinderGeometry(0.06, 0.06, 4.6, 6));
    plankGeo.rotateZ(Math.PI * 0.5);
    const plankCount = 52;
    const instPlanks = new THREE.InstancedMesh(plankGeo, bambooBridgeMat, plankCount);
    instPlanks.userData.ignoreRaycaster = true;
    for (let i = 0; i < plankCount; i++) {
      const pz = 5.8 - (i / (plankCount - 1)) * 19.6;
      const py = getViDaTerrainHeightAt(0, pz) + 0.03;
      dummy.position.set(0, py, pz);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      instPlanks.setMatrixAt(i, dummy.matrix);
    }
    instPlanks.instanceMatrix.needsUpdate = true;
    bridgeGroup.add(instPlanks);

    [-2.28, 2.28].forEach((rx) => {
      const railPts = [];
      for (let s = 0; s <= 20; s++) {
        const pz = 6.0 - s;
        railPts.push(new THREE.Vector3(rx, getViDaTerrainHeightAt(0, pz) + 0.96, pz));
      }
      const railCurve = new THREE.CatmullRomCurve3(railPts);
      const railMesh = new THREE.Mesh(prepGeo(new THREE.TubeGeometry(railCurve, 32, 0.045, 7, false)), bambooRailMat);
      railMesh.userData.ignoreRaycaster = true;
      bridgeGroup.add(railMesh);

      const midRailPts = railPts.map((p) => new THREE.Vector3(p.x, p.y - 0.45, p.z));
      const midRailMesh = new THREE.Mesh(
        prepGeo(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(midRailPts), 32, 0.032, 6, false)),
        bambooRailMat
      );
      midRailMesh.userData.ignoreRaycaster = true;
      bridgeGroup.add(midRailMesh);

      for (let pz = -14; pz <= 6; pz += 2.5) {
        const py = getViDaTerrainHeightAt(0, pz);
        const post = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.055, 0.065, py + 1.9, 7)), bambooBridgeMat);
        post.position.set(rx, (py + 1.05) * 0.5 - 0.45, pz);
        post.userData.ignoreRaycaster = true;
        bridgeGroup.add(post);
      }
    });

    // 4. MẶT SÔNG HƯƠNG / SÔNG TRĂNG MÊNH MÔNG (~260m x 140m, Custom GLSL Shader)
    const waterGeo = prepGeo(new THREE.PlaneGeometry(260, 140, 72, 40));
    waterGeo.rotateX(-Math.PI * 0.5);
    const waterMat = trackMat(new THREE.ShaderMaterial({
      transparent: false,
      uniforms: {
        uTime: { value: 0 },
        uNightMix: { value: 0 },
        uMorningDeep: { value: new THREE.Color(0x0f4c5c) },
        uMorningShallow: { value: new THREE.Color(0x2e8b7a) },
        uNightDeep: { value: new THREE.Color(0x051022) },
        uNightWave: { value: new THREE.Color(0x102a49) },
        uMoonGold: { value: new THREE.Color(PALETTE.moonGold) },
        uMoonBlue: { value: new THREE.Color(PALETTE.moonSilver) },
        uFogColor: { value: new THREE.Color(PALETTE.morningFog) }
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        varying vec3 vWorldPos;
        varying vec3 vNorm;
        void main() {
          vec3 pos = position;
          float bx = pos.x;
          float bz = pos.z;
          pos.y += sin(bx * 0.24 + uTime * 1.4) * cos(bz * 0.22 + uTime * 1.1) * 0.055
                 + sin(bx * 0.55 - uTime * 1.9 + bz * 0.35) * 0.025;
          vec4 wp = modelMatrix * vec4(pos, 1.0);
          vWorldPos = wp.xyz;
          float dx = 0.055 * 0.24 * cos(bx * 0.24 + uTime * 1.4) * cos(bz * 0.22 + uTime * 1.1);
          float dz = -0.055 * 0.22 * sin(bx * 0.24 + uTime * 1.4) * sin(bz * 0.22 + uTime * 1.1);
          vNorm = normalize(vec3(-dx, 1.0, -dz));
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uNightMix;
        uniform vec3 uMorningDeep;
        uniform vec3 uMorningShallow;
        uniform vec3 uNightDeep;
        uniform vec3 uNightWave;
        uniform vec3 uMoonGold;
        uniform vec3 uMoonBlue;
        uniform vec3 uFogColor;
        varying vec3 vWorldPos;
        varying vec3 vNorm;
        void main() {
          vec3 V = normalize(cameraPosition - vWorldPos);
          float r1 = sin(vWorldPos.x * 1.3 + uTime * 1.6) * cos(vWorldPos.z * 1.1 - uTime * 1.3);
          float r2 = cos(vWorldPos.x * 2.4 - uTime * 2.2 + vWorldPos.z * 1.7);
          vec3 N = normalize(vNorm + vec3(r1 * 0.12, 0.0, r2 * 0.12));

          float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);
          vec3 baseDay = mix(uMorningDeep, uMorningShallow, fresnel * 0.72 + 0.15);
          vec3 baseNight = mix(uNightDeep, uNightWave, fresnel * 0.75 + 0.1);
          vec3 col = mix(baseDay, baseNight, uNightMix);

          // Dải ánh trăng vàng bạc phản chiếu lấp lánh trên sông Hương
          vec3 moonDir = normalize(vec3(0.03, 0.34, -0.94));
          vec3 H = normalize(moonDir + V);
          float moonSpec = pow(max(dot(N, H), 0.0), 44.0) * (0.35 + uNightMix * 1.15);
          float ribbon = exp(-pow((vWorldPos.x - 1.5 + sin(vWorldPos.z * 0.35 - uTime * 1.2) * 2.6 + N.x * 3.0) * 0.085, 2.0));
          float shimmer = 0.65 + 0.35 * sin(vWorldPos.z * 1.8 - uTime * 2.5 + vWorldPos.x * 0.6);
          col += mix(uMoonBlue, uMoonGold, 0.55) * (moonSpec + ribbon * shimmer * (0.14 + uNightMix * 0.42));

          float dist = length(cameraPosition.xz - vWorldPos.xz);
          float fogFactor = smoothstep(32.0, 128.0, dist);
          col = mix(col, uFogColor, fogFactor * 0.85);
          gl_FragColor = vec4(col, 1.0);
        }
      `
    }));
    const riverMesh = new THREE.Mesh(waterGeo, waterMat);
    riverMesh.name = 'ViDa_Realm_SongHuong_Water';
    riverMesh.position.set(0, -0.14, -42.0);
    riverMesh.userData.ignoreRaycaster = true;
    riverMesh.userData.isWater = true;
    riverMesh.userData.isTeleportBlocked = true;
    root.add(riverMesh);

    // 5. THUYỀN CHỞ TRĂNG & HẠT TINH TÚ TRÊN SÔNG
    const boatResult = buildMoonBoatGroup();
    const moonBoat = boatResult.group;
    moonBoat.position.set(-7.5, -0.06, -4.5);
    moonBoat.rotation.y = 0.42;
    root.add(moonBoat);

    const boatStarCount = 120;
    const boatStarPos = new Float32Array(boatStarCount * 3);
    const boatStarPhase = new Float32Array(boatStarCount);
    for (let i = 0; i < boatStarCount; i++) {
      boatStarPos[i * 3] = (rng() - 0.5) * 1.1;
      boatStarPos[i * 3 + 1] = 0.25 + rng() * 1.55;
      boatStarPos[i * 3 + 2] = (rng() - 0.5) * 3.8;
      boatStarPhase[i] = rng() * Math.PI * 2;
    }
    const boatStarGeo = prepGeo(new THREE.BufferGeometry());
    boatStarGeo.setAttribute('position', new THREE.BufferAttribute(boatStarPos, 3));
    const boatStarMat = trackMat(new THREE.PointsMaterial({
      color: PALETTE.moonGold,
      size: 0.24,
      map: tex.particleTex,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    const boatStars = new THREE.Points(boatStarGeo, boatStarMat);
    boatStars.userData.ignoreRaycaster = true;
    moonBoat.add(boatStars);

    // 6. TÍCH HỢP caithonvida.glb TỶ LỆ 1:1 LIFE-SIZE TẠI (0, 0, 22)
    const viDaGardenHolder = new THREE.Group();
    viDaGardenHolder.name = 'ViDa_Realm_CaiThonViDa_1to1';
    viDaGardenHolder.position.set(0, 0, 22.0);
    root.add(viDaGardenHolder);

    // Placeholder nhẹ trong lúc tải GLB
    const glbPlaceholder = new THREE.Mesh(
      prepGeo(new THREE.CylinderGeometry(1.2, 1.5, 4.0, 12)),
      trackMat(new THREE.MeshStandardMaterial({ color: PALETTE.jadeCore, transparent: true, opacity: 0.28 }))
    );
    glbPlaceholder.position.set(0, 2.0, 0);
    glbPlaceholder.userData.ignoreRaycaster = true;
    viDaGardenHolder.add(glbPlaceholder);

    const tuneViDaPhysicalPBR = (modelRoot) => {
      modelRoot.traverse((child) => {
        if (!child.isMesh) return;
        child.castShadow = true;
        child.receiveShadow = true;
        child.frustumCulled = true;
        child.userData.preserveShadow = true;
        child.userData.isSharedCachedAsset = true;
        child.userData.ignoreRaycaster = true;

        const origMats = Array.isArray(child.material) ? child.material : [child.material];
        const tuned = origMats.map((m) => {
          if (!m) return m;
          const c = m.color ? m.color.clone() : new THREE.Color(0x2f855a);
          const isGreen = c.g >= c.r * 0.92 && c.g >= c.b * 0.92;
          return trackMat(new THREE.MeshPhysicalMaterial({
            map: m.map || null,
            normalMap: m.normalMap || null,
            roughnessMap: m.roughnessMap || null,
            color: isGreen ? c.lerp(new THREE.Color(0x2fb86f), 0.2) : c,
            roughness: typeof m.roughness === 'number' ? Math.min(0.68, Math.max(0.32, m.roughness)) : 0.48,
            metalness: typeof m.metalness === 'number' ? Math.min(0.16, m.metalness) : 0.04,
            sheen: isGreen ? 0.62 : 0.24,
            sheenColor: new THREE.Color(isGreen ? 0x6ee7b7 : 0xffe89e),
            sheenRoughness: 0.4,
            clearcoat: isGreen ? 0.22 : 0.08,
            clearcoatRoughness: 0.34,
            emissive: new THREE.Color(isGreen ? 0x063f24 : 0x0b0b08),
            emissiveIntensity: isGreen ? 0.14 : 0.04,
            alphaTest: m.alphaTest || 0,
            transparent: Boolean(m.transparent),
            opacity: m.opacity ?? 1.0,
            side: m.transparent ? THREE.DoubleSide : THREE.FrontSide
          }));
        });
        child.material = Array.isArray(child.material) ? tuned : tuned[0];
      });
    };

    loadGlbCached(['/models/caithonvida.glb', '/model/caithonvida.glb'], {
      maxTextureSize: 1024,
      disableMipmaps: true
    })
      .then((rawScene) => {
        if (!rawScene || _realmRoot !== root) return;
        viDaGardenHolder.remove(glbPlaceholder);
        glbPlaceholder.geometry?.dispose?.();
        glbPlaceholder.material?.dispose?.();

        const rawBox = new THREE.Box3().setFromObject(rawScene);
        const rawSize = new THREE.Vector3();
        rawBox.getSize(rawSize);
        // Chuẩn hóa Life-Size (~25.2m bề ngang, ~15.8m chiều cao)
        const scaleByW = 25.2 / Math.max(rawSize.x, 0.001);
        const scaleByH = 15.8 / Math.max(rawSize.y, 0.001);
        const finalScale = Math.min(scaleByW, scaleByH * 1.05);
        rawScene.scale.multiplyScalar(finalScale);
        rawScene.updateMatrixWorld(true);

        const scaledBox = new THREE.Box3().setFromObject(rawScene);
        const scaledCenter = new THREE.Vector3();
        scaledBox.getCenter(scaledCenter);
        rawScene.position.set(-scaledCenter.x, -scaledBox.min.y, -scaledCenter.z);

        tuneViDaPhysicalPBR(rawScene);
        viDaGardenHolder.add(rawScene);
      })
      .catch((err) => {
        console.warn('[DayThonViDaStoryRealm] Không thể tải caithonvida.glb:', err?.message || err);
      });

    // 7. INSTANCEDMESH THỰC VẬT: HÀNG CAU, KHÓM TRÚC, HOA BẮP & BÔNG LAU LAY THEO GIÓ, BỤI CỎ
    const palmTrunkMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x7b7a5a, roughness: 0.85 }));
    const palmFrondMat = trackMat(new THREE.MeshPhysicalMaterial({
      color: 0x257d3e,
      roughness: 0.48,
      sheen: 0.55,
      sheenColor: new THREE.Color(0xa7f3d0),
      side: THREE.DoubleSide
    }));
    const bambooCulmMat = trackMat(new THREE.MeshStandardMaterial({ color: PALETTE.bambooCulm, roughness: 0.55 }));
    const bambooLeafMat = trackMat(new THREE.MeshPhysicalMaterial({
      color: PALETTE.bambooLeaf,
      roughness: 0.5,
      sheen: 0.45,
      sheenColor: new THREE.Color(0x86efac),
      side: THREE.DoubleSide
    }));

    // Hàng Cau dọc đường làng Vĩ Dạ (32 cây cau cao 9–12m đón nắng mới)
    const palmCoords = [];
    for (let pz = 8.5; pz <= 48.5; pz += 5.0) {
      palmCoords.push([-5.8 - rng() * 1.4, pz]);
      palmCoords.push([5.8 + rng() * 1.4, pz]);
    }
    for (let i = 0; i < 14; i++) {
      const px = (i % 2 === 0 ? -1 : 1) * (12.5 + rng() * 14.0);
      const pz = 10.0 + rng() * 38.0;
      palmCoords.push([px, pz]);
    }
    const palmTrunkGeo = prepGeo(new THREE.CylinderGeometry(0.13, 0.22, 9.6, 8));
    const palmCrownGeo = prepGeo(new THREE.CylinderGeometry(0.15, 0.13, 1.1, 8));
    const palmFrondGeo = prepGeo(new THREE.ConeGeometry(0.48, 2.8, 5));
    palmFrondGeo.translate(0, 1.35, 0);
    const frondsPerPalm = 8;

    const instPalmTrunks = new THREE.InstancedMesh(palmTrunkGeo, palmTrunkMat, palmCoords.length);
    const instPalmCrowns = new THREE.InstancedMesh(palmCrownGeo, bambooCulmMat, palmCoords.length);
    const instPalmFronds = new THREE.InstancedMesh(palmFrondGeo, palmFrondMat, palmCoords.length * frondsPerPalm);
    [instPalmTrunks, instPalmCrowns, instPalmFronds].forEach((im) => {
      im.castShadow = true;
      im.receiveShadow = true;
      im.userData.preserveShadow = true;
      im.userData.ignoreRaycaster = true;
    });

    let fIdx = 0;
    palmCoords.forEach(([px, pz], idx) => {
      const py = getViDaTerrainHeightAt(px, pz);
      const hScale = 0.85 + rng() * 0.35;
      const topY = py + 9.6 * hScale;
      dummy.position.set(px, py + 4.8 * hScale, pz);
      dummy.rotation.set((rng() - 0.5) * 0.06, rng() * Math.PI, (rng() - 0.5) * 0.06);
      dummy.scale.set(1, hScale, 1);
      dummy.updateMatrix();
      instPalmTrunks.setMatrixAt(idx, dummy.matrix);

      dummy.position.set(px, topY + 0.4, pz);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      instPalmCrowns.setMatrixAt(idx, dummy.matrix);

      for (let f = 0; f < frondsPerPalm; f++) {
        const ang = (f / frondsPerPalm) * Math.PI * 2 + rng() * 0.3;
        dummy.position.set(px, topY + 0.72, pz);
        dummy.rotation.set(1.16 + (f % 2) * 0.25, ang, 0);
        dummy.scale.set(0.34, 0.95 + rng() * 0.25, 1.0);
        dummy.updateMatrix();
        instPalmFronds.setMatrixAt(fIdx++, dummy.matrix);
      }
    });
    instPalmTrunks.instanceMatrix.needsUpdate = true;
    instPalmCrowns.instanceMatrix.needsUpdate = true;
    instPalmFronds.instanceMatrix.needsUpdate = true;
    root.add(instPalmTrunks, instPalmCrowns, instPalmFronds);

    // Khóm Trúc Xanh & Bụi Cỏ Vườn Vĩ Dạ (InstancedMesh)
    const bambooCenters = [];
    for (let bz = 10; bz <= 48; bz += 6.2) {
      bambooCenters.push([-9.5 - rng() * 6, bz], [9.5 + rng() * 6, bz]);
    }
    const stalksPerClump = 7;
    const leavesPerStalk = 5;
    const totalBamboo = bambooCenters.length * stalksPerClump;
    const bStalkGeo = prepGeo(new THREE.CylinderGeometry(0.045, 0.068, 5.4, 7));
    const bLeafGeo = prepGeo(new THREE.ConeGeometry(0.12, 0.65, 4));
    bLeafGeo.translate(0, 0.32, 0);
    const instBambooStalks = new THREE.InstancedMesh(bStalkGeo, bambooCulmMat, totalBamboo);
    const instBambooLeaves = new THREE.InstancedMesh(bLeafGeo, bambooLeafMat, totalBamboo * leavesPerStalk);
    [instBambooStalks, instBambooLeaves].forEach((im) => {
      im.castShadow = true;
      im.receiveShadow = true;
      im.userData.preserveShadow = true;
      im.userData.ignoreRaycaster = true;
    });

    let bsIdx = 0;
    let blIdx = 0;
    bambooCenters.forEach(([cx, cz]) => {
      const cy = getViDaTerrainHeightAt(cx, cz);
      for (let s = 0; s < stalksPerClump; s++) {
        const ox = cx + (rng() - 0.5) * 1.4;
        const oz = cz + (rng() - 0.5) * 1.4;
        const sh = 0.72 + rng() * 0.45;
        dummy.position.set(ox, cy + 2.7 * sh, oz);
        dummy.rotation.set((rng() - 0.5) * 0.14, rng() * Math.PI, (rng() - 0.5) * 0.14);
        dummy.scale.set(1, sh, 1);
        dummy.updateMatrix();
        instBambooStalks.setMatrixAt(bsIdx++, dummy.matrix);

        for (let l = 0; l < leavesPerStalk; l++) {
          const ly = cy + (2.8 + rng() * 2.4) * sh;
          dummy.position.set(ox, ly, oz);
          dummy.rotation.set(0.85 + rng() * 0.65, rng() * Math.PI * 2, 0.3);
          dummy.scale.set(0.45, 0.85 + rng() * 0.4, 1.0);
          dummy.updateMatrix();
          instBambooLeaves.setMatrixAt(blIdx++, dummy.matrix);
        }
      }
    });
    instBambooStalks.instanceMatrix.needsUpdate = true;
    instBambooLeaves.instanceMatrix.needsUpdate = true;
    root.add(instBambooStalks, instBambooLeaves);

    // Bông Lau & Hoa Bắp ven hai bờ Sông Trăng (InstancedMesh + Custom Vertex Shader Math.sin(uTime))
    const reedTimeUniform = { value: 0 };
    const applyWindShader = (mat, key) => {
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = reedTimeUniform;
        shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`;
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
           float hFactor = clamp(position.y * 0.85, 0.0, 1.5);
           float seed = instanceMatrix[3][0] * 0.65 + instanceMatrix[3][2] * 0.48;
           float gust = sin(uTime * 1.85 + seed) * 0.20 + sin(uTime * 3.1 + seed * 1.5) * 0.05;
           transformed.x += gust * hFactor * hFactor;
           transformed.z += cos(uTime * 1.45 + seed) * 0.09 * hFactor * hFactor;`
        );
      };
      mat.customProgramCacheKey = () => key;
      return mat;
    };

    const reedStalkMat = applyWindShader(
      trackMat(new THREE.MeshStandardMaterial({ color: 0x6ea66e, roughness: 0.78, side: THREE.DoubleSide })),
      'vida_world_reed_stalk_v1'
    );
    const reedPlumeMat = applyWindShader(
      trackMat(new THREE.MeshStandardMaterial({
        color: 0xf4e3b8,
        emissive: new THREE.Color(0x3a321d),
        emissiveIntensity: 0.25,
        roughness: 0.85
      })),
      'vida_world_reed_plume_v1'
    );

    const reedPositions = [];
    for (let i = 0; i < 360; i++) {
      const southSide = i < 160;
      let rx = (rng() - 0.5) * 82.0;
      if (Math.abs(rx) < 3.4) rx += rx < 0 ? -3.8 : 3.8;
      const rz = southSide ? (6.4 + rng() * 3.8) : (-14.3 - rng() * 22.0);
      reedPositions.push([rx, rz]);
    }
    const reedStalkGeo = prepGeo(new THREE.CylinderGeometry(0.015, 0.028, 1.65, 5));
    reedStalkGeo.translate(0, 0.825, 0);
    const reedPlumeGeo = prepGeo(new THREE.ConeGeometry(0.068, 0.42, 6));
    reedPlumeGeo.translate(0, 1.78, 0);

    const instReedStalks = new THREE.InstancedMesh(reedStalkGeo, reedStalkMat, reedPositions.length);
    const instReedPlumes = new THREE.InstancedMesh(reedPlumeGeo, reedPlumeMat, reedPositions.length);
    [instReedStalks, instReedPlumes].forEach((im) => {
      im.userData.ignoreRaycaster = true;
    });

    reedPositions.forEach(([rx, rz], idx) => {
      const ry = getViDaTerrainHeightAt(rx, rz);
      const sc = 0.78 + rng() * 0.58;
      dummy.position.set(rx, ry, rz);
      dummy.rotation.set((rng() - 0.5) * 0.14, rng() * Math.PI * 2, (rng() - 0.5) * 0.14);
      dummy.scale.set(1, sc, 1);
      dummy.updateMatrix();
      instReedStalks.setMatrixAt(idx, dummy.matrix);
      instReedPlumes.setMatrixAt(idx, dummy.matrix);
    });
    instReedStalks.instanceMatrix.needsUpdate = true;
    instReedPlumes.instanceMatrix.needsUpdate = true;
    root.add(instReedStalks, instReedPlumes);

    // Bụi cỏ xanh rải rác dọc bờ vườn & lối mòn (InstancedMesh)
    const grassTuftCount = 240;
    const grassTuftGeo = prepGeo(new THREE.ConeGeometry(0.18, 0.55, 5));
    grassTuftGeo.translate(0, 0.275, 0);
    const instGrassTufts = new THREE.InstancedMesh(grassTuftGeo, bambooLeafMat, grassTuftCount);
    instGrassTufts.userData.ignoreRaycaster = true;
    for (let i = 0; i < grassTuftCount; i++) {
      let gx = (rng() - 0.5) * 64.0;
      if (Math.abs(gx) < 3.6) gx += gx < 0 ? -4.0 : 4.0;
      const gz = 8.0 + rng() * 44.0;
      const gy = getViDaTerrainHeightAt(gx, gz);
      dummy.position.set(gx, gy, gz);
      dummy.rotation.set((rng() - 0.5) * 0.2, rng() * Math.PI * 2, (rng() - 0.5) * 0.2);
      dummy.scale.set(0.8 + rng() * 0.8, 0.7 + rng() * 0.7, 0.8 + rng() * 0.8);
      dummy.updateMatrix();
      instGrassTufts.setMatrixAt(i, dummy.matrix);
    }
    instGrassTufts.instanceMatrix.needsUpdate = true;
    root.add(instGrassTufts);

    // 8. VOLUMETRIC GOD RAYS BAN MAI & ĐÀN CHIM BAY LƯỢN (InstancedMesh Birds)
    const godRayMat = trackMat(new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uOpacityScale: { value: 1.0 },
        uColor: { value: new THREE.Color(PALETTE.morningSun) }
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vNormalV;
        varying vec3 vViewPos;
        void main() {
          vUv = uv;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vViewPos = -mv.xyz;
          vNormalV = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uOpacityScale;
        uniform vec3 uColor;
        varying vec2 vUv;
        varying vec3 vNormalV;
        varying vec3 vViewPos;
        void main() {
          float edgeFade = pow(abs(dot(normalize(vNormalV), normalize(vViewPos))), 1.55);
          float vertFade = smoothstep(0.0, 0.22, vUv.y) * smoothstep(1.0, 0.52, vUv.y);
          float shimmer = 0.82 + 0.18 * sin(uTime * 0.9 + vUv.x * 12.56);
          gl_FragColor = vec4(uColor, edgeFade * vertFade * shimmer * 0.15 * uOpacityScale);
        }
      `
    }));
    const godRaySpecs = [
      { x: -5.2, z: 34.0, rTop: 0.9, rBot: 4.4, h: 20.0 },
      { x: 4.8, z: 28.0, rTop: 1.0, rBot: 4.8, h: 21.0 },
      { x: -3.5, z: 18.0, rTop: 0.85, rBot: 4.0, h: 19.0 },
      { x: 5.5, z: 15.0, rTop: 0.9, rBot: 4.2, h: 19.5 }
    ];
    godRaySpecs.forEach((s) => {
      const ray = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(s.rTop, s.rBot, s.h, 16, 1, true)), godRayMat);
      ray.position.set(s.x, s.h * 0.5, s.z);
      ray.rotation.z = 0.26;
      ray.rotation.x = -0.22;
      ray.userData.ignoreRaycaster = true;
      root.add(ray);
    });

    // Đàn chim (Birds InstancedMesh) bay lượn trên bầu trời Vườn Vĩ Dạ
    const birdCount = 22;
    const birdGeo = prepGeo(new THREE.ConeGeometry(0.18, 0.82, 4));
    birdGeo.rotateZ(Math.PI * 0.5);
    birdGeo.scale(1.8, 0.22, 0.8);
    const birdMat = trackMat(new THREE.MeshBasicMaterial({
      color: 0xfef9c3,
      transparent: true,
      opacity: 0.9
    }));
    const instBirds = new THREE.InstancedMesh(birdGeo, birdMat, birdCount);
    instBirds.name = 'ViDa_Realm_Birds';
    instBirds.userData.ignoreRaycaster = true;
    const birdSpecs = [];
    for (let i = 0; i < birdCount; i++) {
      birdSpecs.push({
        cx: (rng() - 0.5) * 18.0,
        cz: 22.0 + (rng() - 0.5) * 16.0,
        radius: 10.0 + rng() * 14.0,
        height: 15.0 + rng() * 9.0,
        speed: 0.25 + rng() * 0.18,
        phase: rng() * Math.PI * 2,
        scale: 0.8 + rng() * 0.55
      });
    }
    root.add(instBirds);

    // 9. SƯƠNG KHÓI BỜ BẮC & THIẾU NỮ ÁO DÀI TRẮNG (< 4m tan thành ngàn hạt sương)
    const mistCount = 260;
    const mistPos = new Float32Array(mistCount * 3);
    const mistPhases = new Float32Array(mistCount);
    for (let i = 0; i < mistCount; i++) {
      mistPos[i * 3] = (rng() - 0.5) * 56.0;
      mistPos[i * 3 + 1] = 0.45 + rng() * 2.8;
      mistPos[i * 3 + 2] = -52.0 + rng() * 39.0;
      mistPhases[i] = rng() * Math.PI * 2;
    }
    const mistGeo = prepGeo(new THREE.BufferGeometry());
    mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
    const mistPointsMat = trackMat(new THREE.PointsMaterial({
      color: 0xcbd5e1,
      size: 4.8,
      map: tex.mistTex,
      transparent: true,
      opacity: 0.28,
      depthWrite: false
    }));
    const mistPoints = new THREE.Points(mistGeo, mistPointsMat);
    mistPoints.name = 'ViDa_Realm_MistParticleClouds';
    mistPoints.userData.ignoreRaycaster = true;
    root.add(mistPoints);

    // Thiếu Nữ Áo Dài Trắng đứng quay lưng ở Con Đường Sương Khói (Z = -36)
    const aoDaiResult = createWhiteAoDaiApparition();
    const aoDaiGroup = aoDaiResult.group;
    aoDaiGroup.position.set(0, getViDaTerrainHeightAt(0, -36), -36.0);
    aoDaiGroup.rotation.y = Math.PI; // Quay lưng nhìn về màn sương (-Z)
    root.add(aoDaiGroup);

    // Ngàn hạt sương trắng bùng phát khi camera bước lại gần < 4.0m
    const aoDaiParticleCount = 1200;
    const adOrigin = new Float32Array(aoDaiParticleCount * 3);
    const adDir = new Float32Array(aoDaiParticleCount * 3);
    const adPhase = new Float32Array(aoDaiParticleCount);
    for (let i = 0; i < aoDaiParticleCount; i++) {
      const ang = rng() * Math.PI * 2;
      const rad = 0.08 + rng() * 0.42;
      const h = rng() * 1.85;
      adOrigin[i * 3] = Math.cos(ang) * rad;
      adOrigin[i * 3 + 1] = h;
      adOrigin[i * 3 + 2] = Math.sin(ang) * rad;

      adDir[i * 3] = Math.cos(ang) * (0.6 + rng() * 1.4);
      adDir[i * 3 + 1] = 0.4 + rng() * 1.8;
      adDir[i * 3 + 2] = Math.sin(ang) * (0.6 + rng() * 1.4);
      adPhase[i] = rng();
    }
    const aoDaiBurstGeo = prepGeo(new THREE.BufferGeometry());
    aoDaiBurstGeo.setAttribute('position', new THREE.BufferAttribute(adOrigin, 3));
    aoDaiBurstGeo.setAttribute('aDir', new THREE.BufferAttribute(adDir, 3));
    aoDaiBurstGeo.setAttribute('aPhase', new THREE.BufferAttribute(adPhase, 1));

    const aoDaiBurstMat = trackMat(new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uDissolve: { value: 0.0 },
        uPixelRatio: { value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2) },
        uColorA: { value: new THREE.Color(0xffffff) },
        uColorB: { value: new THREE.Color(0xbae6fd) }
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uDissolve;
        uniform float uPixelRatio;
        attribute vec3 aDir;
        attribute float aPhase;
        varying float vLife;
        void main() {
          float speed = 0.25 + uDissolve * 0.55;
          float life = fract(aPhase + uTime * speed);
          vLife = life;
          float burst = 0.25 + uDissolve * 2.45;
          vec3 pos = position + aDir * (life * burst);
          pos.x += sin(uTime * 1.4 + aPhase * 12.56) * (0.12 + uDissolve * 0.35);
          vec4 mv = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mv;
          float baseSize = 14.0 + uDissolve * 18.0;
          gl_PointSize = clamp(baseSize * uPixelRatio / max(-mv.z, 1.2), 1.5, 22.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uDissolve;
        uniform vec3 uColorA;
        uniform vec3 uColorB;
        varying float vLife;
        void main() {
          vec2 c = gl_PointCoord - vec2(0.5);
          float d = length(c);
          if (d > 0.5) discard;
          float radial = pow(1.0 - d * 2.0, 2.0);
          float fade = smoothstep(0.0, 0.12, vLife) * (1.0 - smoothstep(0.42, 1.0, vLife));
          float vis = 0.30 + uDissolve * 0.85;
          vec3 col = mix(uColorA, uColorB, vLife);
          gl_FragColor = vec4(col, clamp(radial * fade * vis, 0.0, 0.95));
        }
      `
    }));
    const aoDaiBurstPoints = new THREE.Points(aoDaiBurstGeo, aoDaiBurstMat);
    aoDaiBurstPoints.name = 'ViDa_Realm_AoDai_MistBurst';
    aoDaiBurstPoints.userData.ignoreRaycaster = true;
    aoDaiGroup.add(aoDaiBurstPoints);

    // 10. BIA ĐÁ NGỌC BÍCH + 3 LORE ORBS + CỔNG HỒI QUY VỀ BẢO TÀNG
    const steleResult = buildJadeSteleMonument(_realmDisposables);
    const steleGroup = steleResult.group;
    steleGroup.position.set(-4.1, getViDaTerrainHeightAt(-4.1, 41.0), 41.0);
    steleGroup.rotation.y = 0.42;
    root.add(steleGroup);

    const steleProxy = new THREE.Mesh(
      prepGeo(new THREE.BoxGeometry(3.6, 4.2, 1.8)),
      trackMat(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false }))
    );
    steleProxy.name = 'ViDa_Realm_BiaNgo_Proxy';
    steleProxy.position.set(0, 2.1, 0);
    steleProxy.userData = {
      isClickProxy: true,
      isArtifact3D: true,
      ignoreRaycaster: false,
      loreKey: 'vida_realm_bia_ngo',
      roomId: REALM_ID,
      styleTheme: 'ngoc_vi_da'
    };
    steleGroup.add(steleProxy);

    // 3 Lore Orbs tại Vườn Cau, Bến Sông Trăng, Rừng Sương Khói
    const orbVuonCau = createLoreOrbStation({
      name: 'ViDa_Realm_LoreOrb_VuonCau',
      position: new THREE.Vector3(4.3, getViDaTerrainHeightAt(4.3, 26.0) + 1.65, 26.0),
      loreKey: 'vida_realm_vuon_cau',
      colorHex: PALETTE.jadeGlow,
      labelTitle: 'Vườn Cau Ban Mai'
    });
    const orbBenSong = createLoreOrbStation({
      name: 'ViDa_Realm_LoreOrb_BenSong',
      position: new THREE.Vector3(-3.3, getViDaTerrainHeightAt(-3.3, 5.2) + 1.65, 5.2),
      loreKey: 'vida_realm_ben_song_trang',
      colorHex: PALETTE.moonGold,
      labelTitle: 'Bến Sông Trăng & Thuyền Nan'
    });
    const orbSuongKhoi = createLoreOrbStation({
      name: 'ViDa_Realm_LoreOrb_SuongKhoi',
      position: new THREE.Vector3(3.3, getViDaTerrainHeightAt(3.3, -31.5) + 1.65, -31.5),
      loreKey: 'vida_realm_rung_suong_khoi',
      colorHex: PALETTE.moonSilver,
      labelTitle: 'Rừng Sương Khói & Áo Dài Trắng'
    });
    root.add(orbVuonCau.holder, orbBenSong.holder, orbSuongKhoi.holder);

    // Cổng Hồi Quy về Phòng 302 (đặt bên phải sau lưng điểm xuất phát)
    const returnShrine = new THREE.Group();
    returnShrine.name = 'ViDa_Realm_ReturnPortal';
    returnShrine.position.set(4.5, getViDaTerrainHeightAt(4.5, 48.5), 48.5);
    returnShrine.rotation.y = -0.5;
    root.add(returnShrine);

    const retBase = new THREE.Mesh(
      prepGeo(new THREE.CylinderGeometry(1.15, 1.32, 0.32, 8)),
      trackMat(new THREE.MeshStandardMaterial({ color: PALETTE.jadeDeep, roughness: 0.45 }))
    );
    retBase.position.y = 0.16;
    retBase.userData.ignoreRaycaster = true;
    returnShrine.add(retBase);

    const retRing = new THREE.Mesh(
      prepGeo(new THREE.TorusGeometry(0.95, 0.055, 8, 28)),
      trackMat(new THREE.MeshBasicMaterial({ color: PALETTE.jadeGlow }))
    );
    retRing.position.y = 1.45;
    retRing.userData.ignoreRaycaster = true;
    returnShrine.add(retRing);

    const retSignTex = createSignTexture(
      'CỔNG HỒI QUY BẢO TÀNG',
      'Click hoặc nhấn [ESC] để trở về Phòng 302',
      { w: 760, h: 165 },
      _realmDisposables
    );
    const retBanner = new THREE.Mesh(
      prepGeo(new THREE.PlaneGeometry(2.5, 0.56)),
      trackMat(new THREE.MeshBasicMaterial({ map: retSignTex, transparent: true, side: THREE.DoubleSide }))
    );
    retBanner.position.set(0, 2.85, 0);
    retBanner.userData.ignoreRaycaster = true;
    returnShrine.add(retBanner);

    const returnProxy = new THREE.Mesh(
      prepGeo(new THREE.BoxGeometry(2.4, 3.0, 1.8)),
      trackMat(new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false }))
    );
    returnProxy.name = 'ViDa_Realm_ReturnProxy';
    returnProxy.position.set(0, 1.5, 0);
    returnProxy.userData = {
      isClickProxy: true,
      isReturnPortal: true,
      ignoreRaycaster: false,
      realm: REALM_ID
    };
    returnShrine.add(returnProxy);

    // 11. HITBOX COLLIDERS, LORE GUIDE & 3 NGUỒN POSITIONAL AUDIO
    root.updateMatrixWorld(true);

    const realmDebugGroup = new THREE.Group();
    realmDebugGroup.name = 'ViDa_Realm_DebugHitboxes';
    realmDebugGroup.visible = Boolean(_hitboxManager?.debugHelpers?.visible);
    root.add(realmDebugGroup);
    _realmDebugGroup = realmDebugGroup;

    const realmColliders = [];
    const addCollider = (center, size, name, color = 0x22c55e) => {
      const box = new THREE.Box3().setFromCenterAndSize(center, size);
      realmColliders.push({ box, name });
      realmDebugGroup.add(new THREE.Box3Helper(box, color));
    };

    // Lõi/chân công trình caithonvida.glb hai bên trục đường làng (chừa đường đi ở giữa |x| < 4.5 và đi vòng ngoài |x| > 9.5)
    addCollider(new THREE.Vector3(-7.0, 2.0, 22.0), new THREE.Vector3(4.6, 4.0, 9.6), 'CaiThonViDa_CoreLeft', 0x22c55e);
    addCollider(new THREE.Vector3(7.0, 2.0, 22.0), new THREE.Vector3(4.6, 4.0, 9.6), 'CaiThonViDa_CoreRight', 0x22c55e);

    // Bia Đá Ngọc Bích & Cổng Hồi Quy
    addCollider(new THREE.Vector3(-4.1, 2.0, 41.0), new THREE.Vector3(3.4, 4.0, 1.5), 'BiaDaNgocBich', 0x22c55e);
    addCollider(new THREE.Vector3(4.5, 1.6, 48.5), new THREE.Vector3(2.3, 3.2, 2.0), 'CongHoiQuy', 0x22c55e);

    // Lan can cầu tre (Z: +6..-14) để không rơi xuống Sông Hương
    addCollider(new THREE.Vector3(-2.45, 2.2, -4.0), new THREE.Vector3(0.45, 4.4, 20.4), 'CauTre_LanCanTrai', 0x38bdf8);
    addCollider(new THREE.Vector3(2.45, 2.2, -4.0), new THREE.Vector3(0.45, 4.4, 20.4), 'CauTre_LanCanPhai', 0x38bdf8);

    // Rào chắn dọc bờ sông Nam (Z = 5.6) & Bắc (Z = -13.6), chừa khe cầu tre |x| < 2.25
    addCollider(new THREE.Vector3(-23.25, 2.0, 5.6), new THREE.Vector3(42.0, 4.0, 1.2), 'BoSongNam_Trai', 0x38bdf8);
    addCollider(new THREE.Vector3(23.25, 2.0, 5.6), new THREE.Vector3(42.0, 4.0, 1.2), 'BoSongNam_Phai', 0x38bdf8);
    addCollider(new THREE.Vector3(-23.25, 2.0, -13.6), new THREE.Vector3(42.0, 4.0, 1.2), 'BoSongBac_Trai', 0x38bdf8);
    addCollider(new THREE.Vector3(23.25, 2.0, -13.6), new THREE.Vector3(42.0, 4.0, 1.2), 'BoSongBac_Phai', 0x38bdf8);

    // Ranh giới thế giới mở
    addCollider(new THREE.Vector3(0, 2.5, 54.0), new THREE.Vector3(88.0, 5.0, 2.0), 'BienSauLangViDa', 0x38bdf8);
    addCollider(new THREE.Vector3(0, 2.5, -56.0), new THREE.Vector3(88.0, 5.0, 2.0), 'BienRungSuongKhoi', 0x38bdf8);
    addCollider(new THREE.Vector3(-42.0, 2.5, 0.0), new THREE.Vector3(2.0, 5.0, 114.0), 'BienTraiTheGioi', 0x38bdf8);
    addCollider(new THREE.Vector3(42.0, 2.5, 0.0), new THREE.Vector3(2.0, 5.0, 114.0), 'BienPhaiTheGioi', 0x38bdf8);

    if (_hitboxManager) {
      _hitboxManager.clearRealmHitboxes?.(REALM_ID);
      _hitboxManager.registerRealmHitboxes?.(REALM_ID, realmColliders);
    }

    const interactiveProxies = [
      steleProxy,
      orbVuonCau.proxy,
      orbBenSong.proxy,
      orbSuongKhoi.proxy,
      returnProxy
    ];
    interactiveProxies.forEach((px) => {
      px.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(px);
      realmDebugGroup.add(new THREE.Box3Helper(b, px.userData.isReturnPortal ? 0x38bdf8 : 0xfde047));
      if (px.userData.loreKey && _loreGuide?.registerArtifact) {
        _loreGuide.registerArtifact(px, px.userData.loreKey);
      }
    });

    // 3 nguồn PositionalAudio
    const gardenAudioAnchor = new THREE.Object3D();
    gardenAudioAnchor.position.set(0, 2.5, 24.0);
    gardenAudioAnchor.userData.ignoreRaycaster = true;
    root.add(gardenAudioAnchor);

    const riverAudioAnchor = new THREE.Object3D();
    riverAudioAnchor.position.set(-4.0, 1.4, -4.0);
    riverAudioAnchor.userData.ignoreRaycaster = true;
    root.add(riverAudioAnchor);

    const mistAudioAnchor = new THREE.Object3D();
    mistAudioAnchor.position.set(0, 1.8, -35.0);
    mistAudioAnchor.userData.ignoreRaycaster = true;
    root.add(mistAudioAnchor);

    if (_spatialAudio?.attachPositionalSound) {
      _spatialAudio.attachPositionalSound('vida_realm_garden_wind', gardenAudioAnchor, {
        fallbackTheme: 'vida_realm_garden_wind',
        refDistance: 9,
        maxDistance: 46,
        volume: 0.48
      });
      _spatialAudio.attachPositionalSound('vida_realm_river_zither', riverAudioAnchor, {
        fallbackTheme: 'vida_realm_river_zither',
        refDistance: 9,
        maxDistance: 46,
        volume: 0.50
      });
      _spatialAudio.attachPositionalSound('vida_realm_mist_recital', mistAudioAnchor, {
        fallbackTheme: 'vida_realm_mist_recital',
        refDistance: 8,
        maxDistance: 42,
        volume: 0.46
      });
    }

    _immersionSystem?.xrTeleport?.setTargetContext?.(targetScene, _realmWalkables);

    _realmState = {
      targetScene,
      morningBg,
      nightBg,
      morningFogCol,
      nightFogCol,
      skyMat,
      starMat,
      moonSphereMat,
      moonHaloInnerMat,
      moonHaloOuterMat,
      hemiLight,
      sunLight,
      moonLight,
      dappledMat,
      godRayMat,
      waterMat,
      reedTimeUniform,
      instBirds,
      birdMat,
      birdSpecs,
      moonBoat,
      boatResult,
      mistGeo,
      mistPhases,
      mistPointsMat,
      aoDaiGroup,
      aoDaiMat: aoDaiResult.mat,
      aoDaiBurstMat,
      steleLanternLight: steleResult.lanternLight,
      loreOrbs: [orbVuonCau, orbBenSong, orbSuongKhoi],
      retRing,
      retBanner,
      nightMix: 0,
      interactiveProxies
    };
  }

  function disposeViDaRealm() {
    stopPoemRecitation();
    _spatialAudio?.stopAllSounds?.();
    if (_spatialAudio?.detachPositionalSound) {
      _spatialAudio.detachPositionalSound('vida_realm_garden_wind');
      _spatialAudio.detachPositionalSound('vida_realm_river_zither');
      _spatialAudio.detachPositionalSound('vida_realm_mist_recital');
    }

    if (_realmState?.interactiveProxies && _loreGuide?.interactiveArtifacts) {
      _realmState.interactiveProxies.forEach((px) => {
        const idx = _loreGuide.interactiveArtifacts.indexOf(px);
        if (idx !== -1) _loreGuide.interactiveArtifacts.splice(idx, 1);
      });
    }

    if (_hitboxManager?.clearRealmHitboxes) {
      _hitboxManager.clearRealmHitboxes(REALM_ID);
    }

    if (_realmRoot) {
      const matSet = new Set();
      _realmRoot.traverse((obj) => {
        if (!obj.userData?.isSharedCachedAsset && obj.geometry) {
          obj.geometry.dispose();
        }
        if (!obj.userData?.isSharedCachedAsset && obj.material) {
          const ms = Array.isArray(obj.material) ? obj.material : [obj.material];
          ms.forEach((m) => matSet.add(m));
        }
      });
      matSet.forEach((m) => m.dispose());
      _realmRoot.parent?.remove(_realmRoot);
      _realmRoot = null;
    }

    _realmCustomMaterials.forEach((m) => m?.dispose?.());
    _realmCustomMaterials = [];
    _realmDisposables.forEach((t) => t?.dispose?.());
    _realmDisposables = [];
    _realmWalkables = [];
    _realmDebugGroup = null;
    _realmState = null;
  }

  // =========================================================================
  // PHẦN 4: DOLLY-ZOOM NGỌC BÍCH (enterRealm / exitRealm)
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

  function enterRealm(realmName = REALM_ID, opts = {}) {
    let continueTourAfterEntry = Boolean(opts?.continueTourAfterEntry);
    if (typeof realmName === 'object' && realmName !== null) {
      continueTourAfterEntry = Boolean(realmName.continueTourAfterEntry || realmName.autoStartTour);
    }
    if (_isInsideRealm || _isTransitioning) return;
    _isTransitioning = true;
    _loreGuide?.hideLoreCard?.();

    const cam = _camera || (typeof window !== 'undefined' ? window.__camera : null);
    const ctrl = _cameraManager?.controls || (typeof window !== 'undefined' ? window.__controls : null);
    const camCtrl = _cameraManager?.cameraController || (typeof window !== 'undefined' ? window.__cameraController : null);

    if (typeof document !== 'undefined' && document.exitPointerLock) {
      try { document.exitPointerLock(); } catch (_) {}
    }
    if (ctrl) ctrl.enabled = false;
    if (camCtrl) camCtrl.isEnabled = false;

    roomGroup?.updateMatrixWorld?.(true);
    interiorGroup?.updateMatrixWorld?.(true);
    portalGroup.updateMatrixWorld(true);

    const portalFocusWorld = portalGroup.localToWorld(new THREE.Vector3(0, 2.0, 0));
    const dollyStandWorld = portalGroup.localToWorld(new THREE.Vector3(0, 1.9, 1.55));

    runDollyZoomTransition({
      targetPos: dollyStandWorld,
      lookAtPos: portalFocusWorld,
      durationMs: 1150,
      onSwap: () => {
        _isInsideRealm = true;
        if (typeof window !== 'undefined') window.__viDaRealmActive = true;
        if (roomGroup) roomGroup.visible = false;

        mountViDaRealm();
        const targetRealmScene = getActiveRealmScene();

        if (typeof window !== 'undefined' && window.__app?.setActiveScene && targetRealmScene) {
          window.__app.setActiveScene(targetRealmScene);
        }

        if (camCtrl) {
          camCtrl.setFloorHeightProvider?.(getViDaTerrainHeightAt);
          camCtrl.floorHeightProvider = getViDaTerrainHeightAt;
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

    const cam = _camera || (typeof window !== 'undefined' ? window.__camera : null);
    const ctrl = _cameraManager?.controls || (typeof window !== 'undefined' ? window.__controls : null);
    const camCtrl = _cameraManager?.cameraController || (typeof window !== 'undefined' ? window.__cameraController : null);
    const vignette = getOrCreateVignetteOverlay();

    if (typeof document !== 'undefined' && document.exitPointerLock) {
      try { document.exitPointerLock(); } catch (_) {}
    }

    const hud = getOrCreateRealmHUD();
    if (hud) hud.style.display = 'none';

    const performExitSwap = () => {
      _isInsideRealm = false;
      _reentryCooldown = 4.0;
      _portalProximityArmed = false;
      if (typeof window !== 'undefined') window.__viDaRealmActive = false;

      disposeViDaRealm();

      const restoreMain = _mainScene || (typeof window !== 'undefined' ? window.__app?.mainScene : null);
      if (typeof window !== 'undefined' && window.__app?.setActiveScene && restoreMain) {
        window.__app.setActiveScene(restoreMain);
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

      if (typeof window !== 'undefined' && window.__app?.atriumGroup) {
        _immersionSystem?.xrTeleport?.setTargetContext?.(
          restoreMain,
          [window.__app.atriumGroup, roomGroup].filter(Boolean)
        );
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
  // PHẦN 5: AUTO-TOUR ĐIỆN ẢNH (PHÒNG 302 ➔ CỔNG TRÚC ➔ THẾ GIỚI MỞ VĨ DẠ)
  // =========================================================================
  const ROOM_TOUR_STOPS = [
    {
      title: 'Phòng 302 (1/2): Vườn Vĩ Dạ Nắng Mai & Bến Sông Trăng',
      localPos: [0.0, 2.1, 10.6],
      localLook: [0.0, 1.5, 4.1],
      loreKey: 'vida_vuon_vi_da',
      dwellMs: 5500
    },
    {
      title: 'Phòng 302 (2/2): Cổng Vòm Trúc Xanh Hào Quang Ngọc Bích',
      localPos: [
        portalLocalPos.x - Math.sin(portalLocalRotY) * 3.8,
        2.1,
        portalLocalPos.z + Math.cos(portalLocalRotY) * 3.8
      ],
      localLook: [portalLocalPos.x, 2.0, portalLocalPos.z],
      loreKey: null,
      dwellMs: 4200
    }
  ];

  const REALM_TOUR_STOPS = [
    {
      title: 'Chặng 1/4: Cổng Làng & Bia Đá Ngọc Bích Đây Thôn Vĩ Dạ',
      camPos: new THREE.Vector3(-0.6, 2.5, 46.5),
      lookAt: new THREE.Vector3(-4.1, 2.1, 41.0),
      loreKey: 'vida_realm_bia_ngo',
      dwellMs: 6500
    },
    {
      title: 'Chặng 2/4: Lướt Qua Ngọn Cau Đón Nắng Mai Quanh Vườn Vĩ Dạ',
      camPos: new THREE.Vector3(10.5, 11.8, 34.5),
      lookAt: new THREE.Vector3(0.0, 5.2, 21.5),
      loreKey: 'vida_realm_vuon_cau',
      dwellMs: 7000
    },
    {
      title: 'Chặng 3/4: Hạ Thấp Mặt Sông Trăng & Thuyền Chở Tinh Tú',
      camPos: new THREE.Vector3(1.8, 2.8, 5.8),
      lookAt: new THREE.Vector3(-6.8, 0.7, -4.5),
      loreKey: 'vida_realm_ben_song_trang',
      dwellMs: 7200
    },
    {
      title: 'Chặng 4/4: Xuyên Cầu Tre Vào Màn Sương Khói & Ảo Ảnh Áo Trắng',
      camPos: new THREE.Vector3(0.0, 2.2, -29.8),
      lookAt: new THREE.Vector3(0.0, 1.4, -36.2),
      loreKey: 'vida_realm_rung_suong_khoi',
      dwellMs: 7500
    }
  ];

  function lockPlayerControls(locked) {
    const ctrl = _cameraManager?.controls || (typeof window !== 'undefined' ? window.__controls : null);
    const camCtrl = _cameraManager?.cameraController || (typeof window !== 'undefined' ? window.__cameraController : null);
    if (ctrl) ctrl.enabled = !locked;
    if (camCtrl) camCtrl.isEnabled = !locked;
  }

  function updateRoomTourBanner(text) {
    if (typeof document === 'undefined') return;
    let el = document.getElementById('vida-room-tour-banner');
    if (!text) {
      if (el) el.style.display = 'none';
      return;
    }
    if (!el) {
      el = document.createElement('div');
      el.id = 'vida-room-tour-banner';
      el.style.cssText = `
        position: fixed; top: 18px; left: 50%; transform: translateX(-50%);
        z-index: 99985; padding: 9px 20px; border-radius: 999px;
        background: linear-gradient(135deg, rgba(6,44,35,0.94), rgba(11,19,43,0.90));
        border: 1.5px solid #34d399; color: #d1fae5;
        font-family: "Segoe UI", sans-serif; font-size: 13px; font-weight: 700;
        box-shadow: 0 8px 26px rgba(0,0,0,0.7); display: flex; align-items: center; gap: 12px;
      `;
      document.body.appendChild(el);
    }
    el.style.display = 'flex';
    el.innerHTML = `<span>🌿 ${text}</span><button id="vida-room-tour-stop" style="background:#34d399;color:#052e23;border:none;border-radius:999px;padding:4px 12px;font-weight:700;cursor:pointer;">Dừng [ESC]</button>`;
    document.getElementById('vida-room-tour-stop')?.addEventListener('click', (e) => {
      e.stopPropagation();
      stopAutoTour();
    });
  }

  function beginRoomTourStop(idx) {
    const cam = _camera || (typeof window !== 'undefined' ? window.__camera : null);
    const refGroup = interiorGroup || roomGroup;
    if (!cam || !refGroup) return;
    _tourIdx = idx;
    const stop = ROOM_TOUR_STOPS[idx];
    _tourPhase = 'room_flying';
    _tourPhaseStart = performance.now();

    refGroup.updateMatrixWorld(true);
    const targetPos = refGroup.localToWorld(new THREE.Vector3(...stop.localPos));
    const lookWorld = refGroup.localToWorld(new THREE.Vector3(...stop.localLook));
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
    const cam = _camera || (typeof window !== 'undefined' ? window.__camera : null);
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

    const hudTitle = typeof document !== 'undefined' ? document.getElementById('vida-hud-title') : null;
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
      _tourActive = true;
      enterRealm(REALM_ID, { continueTourAfterEntry: true });
      return;
    }
    _tourActive = true;
    lockPlayerControls(true);
    const btn = typeof document !== 'undefined' ? document.getElementById('vida-btn-tour') : null;
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
    if (typeof document !== 'undefined') {
      const btn = document.getElementById('vida-btn-tour');
      if (btn) btn.textContent = '🧭 Auto-Tour Thôn Vĩ';
      const hudTitle = document.getElementById('vida-hud-title');
      if (hudTitle) hudTitle.textContent = '🌿 ĐÂY THÔN VĨ DẠ • HÀN MẶC TỬ (1938)';
    }
  }

  function updateAutoTour(nowMs) {
    if (!_tourActive) return;
    const cam = _camera || (typeof window !== 'undefined' ? window.__camera : null);
    if (!cam) return;

    if (_tourPhase === 'room_flying') {
      const stop = ROOM_TOUR_STOPS[_tourIdx];
      const t = Math.min(1, (nowMs - _tourPhaseStart) / 2300);
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
          _tourPhase = 'portal_crossing';
          updateRoomTourBanner(null);
          enterRealm(REALM_ID, { continueTourAfterEntry: true });
        }
      }
    } else if (_tourPhase === 'realm_flying' && _isInsideRealm) {
      const stop = REALM_TOUR_STOPS[_tourIdx];
      const t = Math.min(1, (nowMs - _tourPhaseStart) / 2800);
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
  // PHẦN 6: SỰ KIỆN CLICK / ESC & VÒNG LẶP CẬP NHẬT 60 FPS
  // =========================================================================
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const PORTAL_RAYCAST_MAX_SQ = 42 * 42;
  const _tmpVec = new THREE.Vector3();

  function focusCameraOnObject(obj) {
    if (!obj) return;
    const camMgr = _cameraManager || (typeof window !== 'undefined' ? window.__museumCameraManager : null);
    if (typeof camMgr?.smoothZoomToFocus === 'function') {
      camMgr.smoothZoomToFocus(obj, { duration: 0.72 });
    }
  }

  function onWindowPointerDown(e) {
    if (_isTransitioning || _loreGuide?.isOpen) return;
    if (
      e.target?.closest?.('#vida-realm-hud') ||
      e.target?.closest?.('#vida-room-tour-banner') ||
      e.target?.closest?.('#director-hud') ||
      e.target?.closest?.('#museum-lore-overlay')
    ) {
      return;
    }

    const cam = _camera || (typeof window !== 'undefined' ? window.__camera : null);
    if (!cam) return;

    const activeScene = typeof window !== 'undefined' ? window.__app?.activeScene : null;
    if (_isInsideRealm) {
      if (_realmScene && activeScene && activeScene !== _realmScene) return;
      if (!_realmState?.interactiveProxies) return;
    } else {
      if (roomGroup && !roomGroup.visible) return;
      if (_mainScene && activeScene && activeScene !== _mainScene) return;
      if (roomGroup && cam.position.distanceToSquared(roomGroup.position) > PORTAL_RAYCAST_MAX_SQ) return;
    }

    const canvas = typeof document !== 'undefined' ? document.querySelector('canvas') : null;
    const rect = canvas
      ? canvas.getBoundingClientRect()
      : { left: 0, top: 0, width: window.innerWidth || 1, height: window.innerHeight || 1 };

    if (typeof document !== 'undefined' && document.pointerLockElement) {
      mouse.set(0, 0);
    } else {
      mouse.x = ((e.clientX - rect.left) / (rect.width || 1)) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / (rect.height || 1)) * 2 + 1;
    }

    raycaster.setFromCamera(mouse, cam);
    raycaster.far = 45;

    if (_isInsideRealm && _realmState?.interactiveProxies) {
      const hits = raycaster.intersectObjects(_realmState.interactiveProxies, false);
      if (hits.length > 0) {
        const obj = hits[0].object;
        if (obj.userData?.isReturnPortal) {
          e.stopPropagation();
          exitRealm();
        } else if (obj.userData?.loreKey && _loreGuide?.showLoreCard) {
          e.stopPropagation();
          focusCameraOnObject(obj);
          _loreGuide.showLoreCard(obj.userData.loreKey, {
            roomId: REALM_ID,
            styleTheme: 'ngoc_vi_da'
          });
        }
      }
      return;
    }

    if (!roomGroup || roomGroup.visible) {
      portalClickProxy.updateMatrixWorld(true);
      const hits = raycaster.intersectObject(portalClickProxy, false);
      if (hits.length > 0 && hits[0].distance <= 24) {
        e.stopPropagation();
        enterRealm(REALM_ID);
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

  function updateMuseumPortal(delta = 0.016, elapsedTime = 0, camArg = null) {
    if (camArg) _camera = camArg;
    if (_reentryCooldown > 0) {
      _reentryCooldown = Math.max(0, _reentryCooldown - delta);
    }
    if (roomGroup && !roomGroup.visible) return;

    const cam = camArg || _camera;
    if (!_tourActive && roomGroup && cam?.position && cam.position.distanceToSquared(roomGroup.position) > PORTAL_RAYCAST_MAX_SQ) {
      _portalProximityArmed = false;
      _prevCamDistToPortal = Infinity;
      return;
    }

    portalShaderMat.uniforms.uTime.value = elapsedTime;
    portalPointLight.intensity = 2.8 + Math.sin(elapsedTime * 3.1) * 0.55;
    portalVisual.motes.rotation.y = elapsedTime * 0.35;
    portalVisual.jadeArchRing.rotation.z = -Math.PI * 0.09 + Math.sin(elapsedTime * 1.4) * 0.03;

    // Proximity trigger (< 2.2m) chỉ kích hoạt khi đã đứng ở vùng ngoài (>= 2.4m) bước tới gần để tránh lỗi lúc spawn/fast-travel
    if (!_isInsideRealm && !_isTransitioning && !_tourActive && _reentryCooldown <= 0 && cam?.position) {
      portalGroup.updateMatrixWorld(true);
      portalGroup.localToWorld(museumPortalTriggerWorldPos.set(0, 1.75, 0));
      const dy = Math.abs(cam.position.y - museumPortalTriggerWorldPos.y);
      const dist = cam.position.distanceTo(museumPortalTriggerWorldPos);
      if (dy < 3.0 && dist >= 2.4 && dist < 24.0) {
        _portalProximityArmed = true;
      }
      if (_portalProximityArmed && dy < 2.6 && dist < 2.2 && _prevCamDistToPortal >= 2.2) {
        _portalProximityArmed = false;
        enterRealm(REALM_ID);
      }
      _prevCamDistToPortal = dist;
    }

    if (_tourActive && (_tourPhase === 'room_flying' || _tourPhase === 'room_dwelling')) {
      updateAutoTour(performance.now());
    }
  }

  const _animDummy = new THREE.Object3D();

  function updateRealm(delta = 0.016, elapsedTime = 0, camArg = null) {
    if (camArg) _camera = camArg;
    if (!_isInsideRealm || !_realmState) return;
    const dt = Math.min(delta, 0.05);
    const cam = camArg || _camera;
    const st = _realmState;

    // Đồng bộ Debug Hitbox (H / F2)
    if (_realmDebugGroup && _hitboxManager?.debugHelpers) {
      _realmDebugGroup.visible = _hitboxManager.debugHelpers.visible;
    }

    // 1. Dynamic Spatial-Time Day/Night Lerp theo camera.position.z
    const camZ = cam?.position ? cam.position.z : 49.5;
    const targetNight = smoothstep(16.0, -12.0, camZ);
    st.nightMix += (targetNight - st.nightMix) * Math.min(1, dt * 3.2);
    const nm = st.nightMix;
    const mistDepth = smoothstep(-14.0, -40.0, camZ);

    st.skyMat.uniforms.uTime.value = elapsedTime;
    st.skyMat.uniforms.uNightMix.value = nm;
    st.waterMat.uniforms.uTime.value = elapsedTime;
    st.waterMat.uniforms.uNightMix.value = nm;
    st.dappledMat.uniforms.uTime.value = elapsedTime;
    st.dappledMat.uniforms.uOpacityScale.value = Math.max(0.0, 1.0 - nm * 1.15);
    st.godRayMat.uniforms.uTime.value = elapsedTime;
    st.godRayMat.uniforms.uOpacityScale.value = Math.max(0.0, 1.0 - nm * 1.15);
    st.reedTimeUniform.value = elapsedTime;

    if (st.targetScene.background?.isColor) {
      st.targetScene.background.copy(st.morningBg).lerp(st.nightBg, nm);
    }
    if (st.targetScene.fog?.isFogExp2) {
      st.targetScene.fog.color.copy(st.morningFogCol).lerp(st.nightFogCol, nm);
      st.targetScene.fog.density = 0.0055 + nm * 0.0085 + mistDepth * 0.013;
      st.waterMat.uniforms.uFogColor.value.copy(st.targetScene.fog.color);
    }

    // Ánh sáng ban mai tắt dịu dần, ánh trăng & sao & Vầng Trăng Khổng Lồ rực sáng
    st.sunLight.intensity = 2.5 * (1.0 - nm * 0.9);
    st.moonLight.intensity = 0.2 + nm * 1.55;
    st.hemiLight.intensity = 0.88 - nm * 0.34;
    st.starMat.opacity = nm * (0.78 + 0.18 * Math.sin(elapsedTime * 1.5));
    st.moonSphereMat.opacity = 0.22 + nm * 0.78;
    st.moonHaloInnerMat.opacity = 0.12 + nm * 0.56;
    st.moonHaloOuterMat.opacity = 0.08 + nm * 0.34;

    // 2. Đàn chim bay lượn trên bầu trời ban mai Vĩ Dạ
    st.birdMat.opacity = Math.max(0.08, 0.92 * (1.0 - nm * 0.88));
    for (let i = 0; i < st.birdSpecs.length; i++) {
      const b = st.birdSpecs[i];
      const ang = elapsedTime * b.speed + b.phase;
      const bx = b.cx + Math.cos(ang) * b.radius;
      const bz = b.cz + Math.sin(ang) * b.radius;
      const by = b.height + Math.sin(elapsedTime * 2.2 + b.phase) * 0.85;
      _animDummy.position.set(bx, by, bz);
      _animDummy.rotation.set(0, -ang + Math.PI * 0.5, Math.sin(elapsedTime * 8.0 + b.phase) * 0.28);
      _animDummy.scale.setScalar(b.scale);
      _animDummy.updateMatrix();
      st.instBirds.setMatrixAt(i, _animDummy.matrix);
    }
    st.instBirds.instanceMatrix.needsUpdate = true;

    // 3. Thuyền Chở Trăng dập dềnh & Lore Orbs xoay nhẹ
    st.moonBoat.position.y = -0.06 + Math.sin(elapsedTime * 1.25) * 0.045;
    st.moonBoat.rotation.z = Math.sin(elapsedTime * 0.95) * 0.025;
    st.moonBoat.rotation.x = Math.cos(elapsedTime * 0.8) * 0.015;
    st.boatResult.boatLight.intensity = 4.2 + nm * 2.4 + Math.sin(elapsedTime * 3.5) * 0.4;
    st.steleLanternLight.intensity = 4.8 + Math.sin(elapsedTime * 4.2) * 0.6;

    st.loreOrbs.forEach((o, i) => {
      o.orb.rotation.y = elapsedTime * 1.1 + i;
      o.ring.rotation.z = elapsedTime * 1.6 - i;
      o.orb.position.y = Math.sin(elapsedTime * 2.0 + i * 1.7) * 0.12;
      o.ring.position.y = o.orb.position.y;
    });
    st.retRing.rotation.y = elapsedTime * 0.85;
    st.retBanner.position.y = 2.85 + Math.sin(elapsedTime * 2.1) * 0.05;

    // 4. Hạt sương khói trôi lững lờ
    const mArr = st.mistGeo.attributes.position.array;
    const mPh = st.mistPhases;
    for (let i = 0; i < mPh.length; i++) {
      const i3 = i * 3;
      mArr[i3] += dt * 0.48;
      mArr[i3 + 1] = 0.55 + Math.sin(elapsedTime * 0.7 + mPh[i]) * 0.3;
      if (mArr[i3] > 28.0) mArr[i3] = -28.0;
    }
    st.mistGeo.attributes.position.needsUpdate = true;

    // 5. Thiếu Nữ Áo Dài Trắng: trong bán kính < 4.0m nhòa dần & tan thành ngàn hạt sương sáng
    st.aoDaiMat.uniforms.uTime.value = elapsedTime;
    st.aoDaiBurstMat.uniforms.uTime.value = elapsedTime;
    if (cam?.position) {
      st.aoDaiGroup.getWorldPosition(_tmpVec);
      _tmpVec.y += 1.0;
      const distToAoDai = cam.position.distanceTo(_tmpVec);
      const tFade = smoothstep(1.15, 4.0, distToAoDai);
      st.aoDaiMat.uniforms.uProximityAlpha.value = tFade;
      st.aoDaiBurstMat.uniforms.uDissolve.value = 1.0 - tFade;
    }

    if (_tourActive && (_tourPhase === 'realm_flying' || _tourPhase === 'realm_dwelling')) {
      updateAutoTour(performance.now());
    }
  }

  function setupContext({
    scene: nextScene = null,
    mainScene: nextMain = null,
    realmScene: nextRealmScene = null,
    camera: nextCam = null,
    renderer: nextRenderer = null,
    cameraManager: nextCamMgr = null,
    hitboxManager: nextHbm = null,
    loreGuide: nextLore = null,
    spatialAudio: nextAudio = null,
    portalInteraction: nextPortal = null,
    immersionSystem: nextImmersion = null
  } = {}) {
    if (nextCam) _camera = nextCam;
    if (nextRenderer) _renderer = nextRenderer;
    if (nextCamMgr) _cameraManager = nextCamMgr;
    if (nextHbm) _hitboxManager = nextHbm;
    if (nextLore) _loreGuide = nextLore;
    if (nextAudio) _spatialAudio = nextAudio;
    if (nextPortal) _portalInteraction = nextPortal;
    if (nextImmersion) _immersionSystem = nextImmersion;
    if (nextRealmScene) _realmScene = nextRealmScene;
    void nextScene;
    void nextMain;
    syncMuseumPortalHitboxes();
  }

  function dispose() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('pointerdown', onWindowPointerDown, true);
      window.removeEventListener('keydown', onWindowKeyDown);
    }
    stopAutoTour();
    disposeViDaRealm();
    portalShaderMat.dispose();
    portalVisual.group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const ms = Array.isArray(obj.material) ? obj.material : [obj.material];
        ms.forEach((m) => m.dispose());
      }
    });
    portalClickProxy.geometry?.dispose?.();
    portalClickProxy.material?.dispose?.();
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

export default createDayThonViDaStoryRealm;
