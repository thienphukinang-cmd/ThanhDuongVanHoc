import * as THREE from 'three';
import { registerInteractiveBook } from './PortalInteraction.js';
import { loadGlbCached, sanitizeGeometryBuffers } from '../utils/modelLoaderHelper.js';
import { localRoomToWorld } from '../config/literatureRegistry.js';
import { getSynthesizedPlaqueLore } from '../config/plaqueLoreSynthesis.js';

/**
 * ============================================================================
 * CHUYỆN NGƯỜI CON GÁI NAM XƯƠNG (NGUYỄN DỮ) — CỔNG VÀNH TRĂNG KHUYẾT & CÕI MỞ HOÀNG GIANG
 * Multi-Scene Architecture (Chuẩn mực hệ sinh thái Bảo tàng Văn học 3D):
 * 1. Cổng Vành Trăng Khuyết Cổ Tích hào quang tím chàm & xanh ngọc tại Phòng 204.
 * 2. Cõi Mở Hoàng Giang (Open World Realm Scene):
 *    - Zone 1: Triền đê cỏ lau uốn lượn, Bảng Lụa Trắng phát sáng, Gian nhà tranh đơn sơ
 *    - Zone 2: Hiện trường "Chiếc Bóng Trên Vách" sống động (nguoicogainamxuong.glb 1:1,
 *              ngọn đèn dầu đung đưa theo gió, hắt bóng Vũ Nương khổng lồ lên vách nứa)
 *    - Zone 3: Bến đá Hoàng Giang, Đàn Giải Oan uy nghiêm, cờ phướn, khói hương & Chiếc Trâm Vàng lơ lửng
 *    - Zone 4: Đại cảnh kỳ ảo Sông Hoàng Giang rẽ sóng tỏa hào quang ngọc bích, hàng ngàn hạt lân tinh,
 *              hoa đăng và ảo ảnh Thủy Cung ẩn hiện (tan biến khi tiến sát mép nước < 6m)
 * 3. Tích hợp đầy đủ:
 *    - Dolly-Zoom Cutscene & HUD #namxuong-realm-hud
 *    - 4 Lore Cards chuẩn (namxuong_realm_bia_lua, namxuong_realm_den_dau,
 *      namxuong_realm_dan_giai_oan, namxuong_realm_thuy_cung) qua getSynthesizedPlaqueLore
 *    - 3 nguồn THREE.PositionalAudio (cottage_lullaby, river_waves, ritual_music)
 *    - Auto-Tour điện ảnh 4 chặng xuyên không
 *    - WebXR Teleport target context & Box3 Colliders giữ vững 60+ FPS
 *    - Tự dọn dẹp GPU sạch sẽ khi exitRealm & dispose
 * ============================================================================
 */

const REALM_ID = 'nguoi_con_gai_nam_xuong';

const PALETTE = {
  nightSkyZenith: 0x090d16,
  nightSkyHorizon: 0x161c2e,
  fogDeepNight: 0x0d1117,
  moonSilver: 0xdfe9f7,
  moonHalo: 0xa5b4fc,
  mysticIndigo: 0x4f46e5,
  mysticViolet: 0x7c3aed,
  mysticTeal: 0x00f5d4,
  jadeGlow: 0x2dd4bf,
  oilLampOrange: 0xff7b00,
  oilLampCore: 0xffeedd,
  riverDeep: 0x040810,
  riverMid: 0x0d1e38,
  reedGreen: 0x3b4a34,
  soilDyke: 0x2e2318,
  wattleBamboo: 0x82643a,
  agedWood: 0x3d2b1f,
  thatchStraw: 0x6e522b,
  goldHairpin: 0xffd166,
  silkWhite: 0xf8fafc,
  crimsonSilk: 0xb91c1c
};

function createSeededRandom(seed = 1530) {
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
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.needsUpdate = true;
  disposables.push(tex);
  return tex;
}

function buildNormalMapFromCanvas(heightCanvas, strength = 2.4, rx = 1, ry = 1, disposables = []) {
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

/** Biển chữ sơn mài Cổng Trăng Khuyết */
function createPortalSignTexture(title, subtitle, {
  bg = '#090d18',
  border = '#38bdf8',
  titleCol = '#f8fafc',
  subCol = '#38bdf8',
  w = 1024,
  h = 220
} = {}, disposables = []) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Khung viền thếp bạc đôi
  ctx.strokeStyle = border;
  ctx.lineWidth = 6;
  ctx.strokeRect(10, 10, w - 20, h - 20);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1.8;
  ctx.strokeRect(18, 18, w - 36, h - 36);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 36px "Times New Roman", "Segoe UI", serif';
  ctx.fillStyle = titleCol;
  ctx.shadowColor = 'rgba(56, 189, 248, 0.75)';
  ctx.shadowBlur = 14;
  ctx.fillText(title, w / 2, h * 0.42);

  ctx.shadowBlur = 6;
  ctx.font = 'italic 22px "Times New Roman", "Segoe UI", serif';
  ctx.fillStyle = subCol;
  ctx.fillText(subtitle, w / 2, h * 0.74);

  return makeCanvasTex(c, { rx: 1, ry: 1, srgb: true, disposables });
}

/** Bảng Lụa Trắng Khung Gỗ Cổ (namxuong_realm_bia_lua) */
function createSilkPlaqueTexture(disposables = []) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext('2d');

  // Nền lụa dệt tơ tằm cổ viền hoa văn thủy mặc
  ctx.fillStyle = '#f6f7f9';
  ctx.fillRect(0, 0, 1024, 1024);

  // Thớ sợi lụa dệt nhẹ nhàng
  ctx.fillStyle = 'rgba(215, 222, 235, 0.28)';
  for (let i = 0; i < 1024; i += 4) {
    ctx.fillRect(0, i, 1024, 1.2);
    ctx.fillRect(i, 0, 1.2, 1024);
  }

  // Khung tranh hoa văn thủy vân tím chàm
  ctx.strokeStyle = '#312e81';
  ctx.lineWidth = 16;
  ctx.strokeRect(32, 32, 960, 960);
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 4;
  ctx.strokeRect(48, 48, 928, 928);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 44px "Times New Roman", Georgia, serif';
  ctx.fillText('CHUYỆN NGƯỜI CON GÁI NAM XƯƠNG', 512, 128);

  ctx.font = 'italic 26px "Times New Roman", Georgia, serif';
  ctx.fillStyle = '#1e3a8a';
  ctx.fillText('Nguyễn Dữ • Truyền kỳ mạn lục (Thế kỷ XVI)', 512, 178);

  // Trích đoạn văn học then chốt & chú giải di sản
  const paragraphs = [
    '“Chàng đi lính, nàng ở nhà nuôi mẹ già, chăm con thơ (bé Đản).',
    'Mỗi đêm, dưới ánh đèn dầu leo lét, nàng thường chỉ bóng mình trên',
    'vách nứa mà bảo con rằng đó là cha Đản. Khi chàng Trương trở về,',
    'lời nói ngây thơ của đứa trẻ châm ngòi cơn ghen mù quáng, đẩy nàng',
    'đến bi kịch phải gieo mình xuống dòng Hoàng Giang tự vẫn.”',
    '',
    '“Dưới Thủy Cung, nàng được Linh Phi cứu sống. Nàng gửi trâm vàng',
    'nhờ Phan Lang bảo Trương Sinh lập Đàn Giải Oan bên bến sông.',
    'Trong làn sương khói mông lung, nàng hiện về trên kiệu hoa võng lọng,',
    'nghẹn ngào từ biệt rồi bóng nàng nhạt dần mà biến mất…”'
  ];

  let y = 265;
  ctx.font = '30px "Times New Roman", Georgia, serif';
  paragraphs.forEach((line) => {
    if (line === '') {
      y += 18;
      return;
    }
    ctx.fillStyle = '#1e293b';
    ctx.fillText(line, 512, y);
    y += 50;
  });

  // Hướng dẫn tương tác
  ctx.fillStyle = '#0284c7';
  ctx.font = 'bold 24px "Segoe UI", sans-serif';
  ctx.fillText('✦ Nhấp vào Bảng Lụa hoặc các Hào Quang Lore để mở Chi Tiết Tác Phẩm ✦', 512, 920);

  return makeCanvasTex(c, { rx: 1, ry: 1, srgb: true, disposables });
}

/** Sinh bộ PBR Procedural Textures tối ưu GPU (triền đê, vách nứa, mái rạ, đá bến sông, chiếu cói, hạt sáng) */
function createNamXuongProceduralTextures(disposables = []) {
  const rng = createSeededRandom(15301);
  const sz = 256;

  // 1. Đường đất bùn triền đê
  const soilC = document.createElement('canvas');
  soilC.width = sz;
  soilC.height = sz;
  const sCtx = soilC.getContext('2d');
  const soilHC = document.createElement('canvas');
  soilHC.width = sz;
  soilHC.height = sz;
  const shCtx = soilHC.getContext('2d');

  sCtx.fillStyle = '#312317';
  sCtx.fillRect(0, 0, sz, sz);
  shCtx.fillStyle = '#7a7a7a';
  shCtx.fillRect(0, 0, sz, sz);

  for (let i = 0; i < 1500; i++) {
    const x = rng() * sz;
    const y = rng() * sz;
    const r = 1 + rng() * 4;
    sCtx.fillStyle = rng() > 0.5 ? 'rgba(30, 20, 12, 0.45)' : 'rgba(74, 52, 34, 0.35)';
    sCtx.beginPath();
    sCtx.arc(x, y, r, 0, Math.PI * 2);
    sCtx.fill();
    const hVal = 90 + Math.floor(rng() * 80);
    shCtx.fillStyle = `rgb(${hVal},${hVal},${hVal})`;
    shCtx.fillRect(x, y, r, r);
  }

  // 2. Vách nứa đan nan tre (nhận bóng Vũ Nương)
  const wattleC = document.createElement('canvas');
  wattleC.width = sz;
  wattleC.height = sz;
  const wCtx = wattleC.getContext('2d');
  const wattleHC = document.createElement('canvas');
  wattleHC.width = sz;
  wattleHC.height = sz;
  const whCtx = wattleHC.getContext('2d');

  wCtx.fillStyle = '#7c5e38';
  wCtx.fillRect(0, 0, sz, sz);
  whCtx.fillStyle = '#848484';
  whCtx.fillRect(0, 0, sz, sz);

  // Nan nứa đan chéo mắt cáo & nan ngang
  const stripeH = 16;
  for (let y = 0; y < sz; y += stripeH) {
    wCtx.fillStyle = (y / stripeH) % 2 === 0 ? '#634927' : '#8d6d42';
    wCtx.fillRect(0, y, sz, stripeH - 2);
    wCtx.fillStyle = '#261b0d';
    wCtx.fillRect(0, y + stripeH - 2, sz, 2);

    whCtx.fillStyle = (y / stripeH) % 2 === 0 ? '#606060' : '#b0b0b0';
    whCtx.fillRect(0, y, sz, stripeH - 2);
  }
  for (let x = 0; x < sz; x += 32) {
    wCtx.fillStyle = 'rgba(38, 27, 13, 0.55)';
    wCtx.fillRect(x, 0, 3, sz);
  }

  // 3. Mái tranh rạ
  const thatchC = document.createElement('canvas');
  thatchC.width = sz;
  thatchC.height = sz;
  const thCtx = thatchC.getContext('2d');
  thCtx.fillStyle = '#5c4323';
  thCtx.fillRect(0, 0, sz, sz);
  for (let i = 0; i < 1800; i++) {
    const x = rng() * sz;
    const y = rng() * sz;
    const len = 8 + rng() * 18;
    thCtx.strokeStyle = rng() > 0.5 ? '#7b5a30' : '#422f18';
    thCtx.lineWidth = 1.2;
    thCtx.beginPath();
    thCtx.moveTo(x, y);
    thCtx.lineTo(x + (rng() - 0.5) * 4, y + len);
    thCtx.stroke();
  }

  // 4. Chiếu cói dệt hoa văn truyền thống
  const coiC = document.createElement('canvas');
  coiC.width = sz;
  coiC.height = sz;
  const cCtx = coiC.getContext('2d');
  cCtx.fillStyle = '#c5a059';
  cCtx.fillRect(0, 0, sz, sz);
  // Hoa văn viền đỏ chữ thọ
  cCtx.strokeStyle = '#b91c1c';
  cCtx.lineWidth = 14;
  cCtx.strokeRect(10, 10, sz - 20, sz - 20);
  for (let y = 0; y < sz; y += 8) {
    cCtx.fillStyle = (y / 8) % 2 === 0 ? 'rgba(154, 122, 64, 0.4)' : 'rgba(218, 185, 122, 0.4)';
    cCtx.fillRect(0, y, sz, 4);
  }

  // 5. Đá rêu bến sông & Đàn Giải Oan
  const stoneC = document.createElement('canvas');
  stoneC.width = sz;
  stoneC.height = sz;
  const stCtx = stoneC.getContext('2d');
  stCtx.fillStyle = '#3a4449';
  stCtx.fillRect(0, 0, sz, sz);
  for (let i = 0; i < 1200; i++) {
    const x = rng() * sz;
    const y = rng() * sz;
    stCtx.fillStyle = rng() > 0.6 ? 'rgba(46, 75, 52, 0.45)' : 'rgba(25, 30, 34, 0.38)';
    stCtx.beginPath();
    stCtx.arc(x, y, 2 + rng() * 5, 0, Math.PI * 2);
    stCtx.fill();
  }

  // 6. Hạt sáng lân tinh & radial halo
  const pC = document.createElement('canvas');
  pC.width = 64;
  pC.height = 64;
  const pCtx = pC.getContext('2d');
  const pGrad = pCtx.createRadialGradient(32, 32, 0, 32, 32, 30);
  pGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  pGrad.addColorStop(0.35, 'rgba(0, 245, 212, 0.85)');
  pGrad.addColorStop(0.7, 'rgba(99, 102, 241, 0.35)');
  pGrad.addColorStop(1, 'rgba(13, 17, 23, 0)');
  pCtx.fillStyle = pGrad;
  pCtx.fillRect(0, 0, 64, 64);

  // 7. Mặt trăng khuyết bạc
  const mC = document.createElement('canvas');
  mC.width = 256;
  mC.height = 256;
  const mCtx = mC.getContext('2d');
  mCtx.fillStyle = '#ffffff';
  mCtx.beginPath();
  mCtx.arc(128, 128, 96, 0, Math.PI * 2);
  mCtx.fill();
  mCtx.globalCompositeOperation = 'destination-out';
  mCtx.beginPath();
  mCtx.arc(162, 114, 88, 0, Math.PI * 2);
  mCtx.fill();
  mCtx.globalCompositeOperation = 'source-over';

  return {
    soilDiff: makeCanvasTex(soilC, { rx: 12, ry: 12, srgb: true, disposables }),
    soilNorm: buildNormalMapFromCanvas(soilHC, 2.2, 12, 12, disposables),
    wattleDiff: makeCanvasTex(wattleC, { rx: 3, ry: 2, srgb: true, disposables }),
    wattleNorm: buildNormalMapFromCanvas(wattleHC, 2.6, 3, 2, disposables),
    thatchDiff: makeCanvasTex(thatchC, { rx: 4, ry: 4, srgb: true, disposables }),
    coiDiff: makeCanvasTex(coiC, { rx: 1, ry: 1, srgb: true, disposables }),
    stoneDiff: makeCanvasTex(stoneC, { rx: 6, ry: 6, srgb: true, disposables }),
    particleTex: makeCanvasTex(pC, { srgb: true, disposables }),
    moonTex: makeCanvasTex(mC, { srgb: true, disposables })
  };
}

/**
 * ============================================================================
 * CAO ĐỘ ĐỊA HÌNH CÕI MỞ HOÀNG GIANG: getNamXuongTerrainHeightAt(x, z)
 * Phân vùng liên hoàn 3 tầng:
 * - Zone 1: Triền đê & Khu nhà tranh Vũ Nương (Z >= +12.0)
 * - Zone 2: Bờ dốc đê & Bến đá Hoàng Giang / Đàn Giải Oan (Z: +5.0 .. +12.0)
 * - Zone 3: Sông Hoàng Giang mênh mông (Z < +5.0, y = 0.15m)
 * ============================================================================
 */
export function getNamXuongTerrainHeightAt(x = 0, z = 0) {
  // Zone 1: Triền đê & Vườn nhà tranh Vũ Nương (Z >= 12.0)
  if (z >= 12.0) {
    // Sân và nền gian nhà tranh mở rộng phẳng tại X: 0.5 .. 9.5, Z: 24.0 .. 40.0
    if (x >= 0.5 && x <= 9.5 && z >= 24.0 && z <= 40.0) {
      return 2.2;
    }
    // Trục triền đê uốn lượn mềm (|x| <= 3.2)
    const dykeDist = Math.max(0, Math.abs(x) - 2.8);
    const dykeElevation = 2.45 + 0.12 * Math.cos(z * 0.12);
    if (dykeDist <= 0) return dykeElevation;
    // Sườn đê dốc cỏ ra hai bên
    const slope = Math.min(1.25, dykeDist * 0.19);
    return Math.max(1.15, dykeElevation - slope);
  }

  // Zone 2: Bờ dốc đê xuống mép sông & Đàn Giải Oan (Z: 5.0 .. 12.0)
  if (z >= 5.0) {
    // Mỏm đất nhô cao nơi dựng Đàn Giải Oan (X: -8.5 .. -4.5, Z: 6.5 .. 9.5)
    const dAltar = Math.hypot(x - (-6.5), z - 8.0);
    if (dAltar < 3.2) {
      return 0.95 + (1.0 - dAltar / 3.2) * 0.35;
    }
    // Dốc thoai thoải từ Y = 2.45 (Z = 12.0) xuống Y = 0.42 (Z = 5.0)
    const t = (z - 5.0) / 7.0;
    return 0.42 + t * 2.03;
  }

  // Zone 3: Sông Hoàng Giang (Z < 5.0)
  // Cầu bến gỗ nhô ra mép nước (|x| <= 2.2, Z: 3.5 .. 5.0)
  if (z >= 3.5 && Math.abs(x) <= 2.2) {
    return 0.38;
  }
  // Mặt nước phẳng
  return 0.15;
}

/** Vòng xoáy hào quang Custom Shader cổng dịch chuyển */
function createPortalSwirlMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uIndigo: { value: new THREE.Color(PALETTE.mysticIndigo) },
      uViolet: { value: new THREE.Color(PALETTE.mysticViolet) },
      uTeal: { value: new THREE.Color(PALETTE.mysticTeal) }
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uIndigo;
      uniform vec3 uViolet;
      uniform vec3 uTeal;
      varying vec2 vUv;

      void main() {
        vec2 p = vUv - vec2(0.5);
        float r = length(p);
        if (r > 0.5) discard;

        float theta = atan(p.y, p.x);
        // Vòng xoáy 3 nhánh xoay theo thời gian
        float spiral = sin(theta * 3.0 - r * 14.0 + uTime * 2.8);
        float ring = sin(r * 22.0 - uTime * 3.2) * 0.5 + 0.5;

        float core = exp(-r * 5.5);
        float rim = smoothstep(0.49, 0.36, r);

        vec3 col = mix(uIndigo, uViolet, spiral * 0.5 + 0.5);
        col = mix(col, uTeal, ring * 0.6 + core * 0.7);

        float alpha = (core * 0.85 + ring * 0.35 + spiral * 0.25) * rim;
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
      }
    `
  });
}

/** Custom GLSL Water Shader cho Sông Hoàng Giang đêm khuya */
function createHoangGiangWaterMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uDeepColor: { value: new THREE.Color(PALETTE.riverDeep) },
      uMidColor: { value: new THREE.Color(PALETTE.riverMid) },
      uMoonColor: { value: new THREE.Color(PALETTE.moonSilver) },
      uTealWispColor: { value: new THREE.Color(PALETTE.mysticTeal) },
      uFogColor: { value: new THREE.Color(PALETTE.fogDeepNight) },
      uFogDensity: { value: 0.015 }
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vNormalW;

      void main() {
        vUv = uv;
        vec3 pos = position;

        // Sóng nước lăn tăn đêm vắng
        float w1 = sin(pos.x * 0.18 + uTime * 1.3) * cos(pos.y * 0.14 + uTime * 1.1) * 0.12;
        float w2 = sin(pos.x * 0.42 - uTime * 1.8) * cos(pos.y * 0.32 + uTime * 1.4) * 0.06;
        pos.z += (w1 + w2);

        vec4 wp = modelMatrix * vec4(pos, 1.0);
        vWorldPos = wp.xyz;

        // Xấp xỉ pháp tuyến động từ sóng
        vec3 n = vec3(
          -cos(pos.x * 0.18 + uTime * 1.3) * 0.18 * 0.12,
          -cos(pos.y * 0.14 + uTime * 1.1) * 0.14 * 0.12,
          1.0
        );
        vNormalW = normalize(mat3(modelMatrix) * n);

        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uDeepColor;
      uniform vec3 uMidColor;
      uniform vec3 uMoonColor;
      uniform vec3 uTealWispColor;
      uniform vec3 uFogColor;
      uniform float uFogDensity;

      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vNormalW;

      void main() {
        vec3 N = normalize(vNormalW);
        vec3 V = normalize(cameraPosition - vWorldPos);

        // Fresnel phản chiếu góc xiên
        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.4);

        // Ánh trăng khuyết đổ bóng sáng trên mặt sông
        vec3 moonDir = normalize(vec3(-0.15, 0.92, -0.35));
        vec3 H = normalize(moonDir + V);
        float specMoon = pow(max(dot(N, H), 0.0), 72.0);

        // Hào quang xanh ngọc Thủy Cung lan tỏa giữa sông (quanh Z: -22m)
        float altarGlow = exp(-length(vWorldPos.xz - vec2(0.0, -22.0)) * 0.048);
        float pulse = 0.75 + 0.25 * sin(uTime * 1.7);

        vec3 col = mix(uDeepColor, uMidColor, clamp(fresnel * 1.1 + 0.15, 0.0, 1.0));
        col += uMoonColor * (specMoon * 0.9 + fresnel * 0.35);
        col += uTealWispColor * (altarGlow * pulse * 0.55);

        // Sương mù đêm mông lung
        float dist = length(cameraPosition - vWorldPos);
        float fogFactor = 1.0 - exp(-pow(uFogDensity * dist, 2.0));
        col = mix(col, uFogColor, clamp(fogFactor, 0.0, 0.92));

        gl_FragColor = vec4(col, 0.94);
      }
    `
  });
}

/** Shader cho hàng ngàn hạt lân tinh ngọc bích bay vút lên từ dòng sông */
function createPhosphorescentPointsMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uTeal: { value: new THREE.Color(PALETTE.mysticTeal) },
      uViolet: { value: new THREE.Color(PALETTE.mysticViolet) }
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      attribute float aPhase;
      attribute float aSpeed;
      attribute float aSize;
      varying float vProgress;

      void main() {
        float cycle = fract(aPhase + uTime * aSpeed);
        vProgress = cycle;

        vec3 pos = position;
        pos.y = 0.2 + cycle * 12.0;
        pos.x += sin(uTime * 1.1 + aPhase * 14.0) * (0.4 + cycle * 0.8);
        pos.z += cos(uTime * 0.9 + aPhase * 10.0) * (0.4 + cycle * 0.8);

        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPos;
        gl_PointSize = clamp(aSize * (260.0 / max(-mvPos.z, 1.0)) * (1.0 - cycle * 0.4), 2.0, 32.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTeal;
      uniform vec3 uViolet;
      varying float vProgress;

      void main() {
        vec2 p = gl_PointCoord - vec2(0.5);
        float d = length(p);
        if (d > 0.5) discard;

        float alpha = pow(1.0 - d * 2.0, 1.8) * sin(vProgress * 3.14159);
        vec3 col = mix(uTeal, uViolet, vProgress);
        gl_FragColor = vec4(col, alpha);
      }
    `
  });
}

/** Bầu trời 360 độ đêm chàm tĩnh mịch */
function createSkyDomeMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uZenith: { value: new THREE.Color(PALETTE.nightSkyZenith) },
      uHorizon: { value: new THREE.Color(PALETTE.nightSkyHorizon) },
      uTealMist: { value: new THREE.Color(PALETTE.mysticTeal) }
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      void main() {
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uZenith;
      uniform vec3 uHorizon;
      uniform vec3 uTealMist;
      varying vec3 vWorldPos;

      void main() {
        float h = normalize(vWorldPos).y;
        float t = clamp(h * 2.0, 0.0, 1.0);
        vec3 sky = mix(uHorizon, uZenith, t);
        // Quầng sáng huyền ảo là là chân trời phía sông
        float riverHorizon = clamp(-vWorldPos.z / 340.0, 0.0, 1.0) * smoothstep(0.0, 0.22, h) * smoothstep(0.45, 0.05, h);
        sky += uTealMist * (riverHorizon * 0.18);
        gl_FragColor = vec4(sky, 1.0);
      }
    `
  });
}

/** Dựng Cổng Vành Trăng Khuyết Cổ Tích hào quang tím chàm & xanh ngọc */
function buildCrescentMoonPortalVisual(disposables = []) {
  const group = new THREE.Group();
  group.name = 'NamXuong_CrescentMoon_PortalVisual';

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x272c38,
    roughness: 0.88,
    metalness: 0.08
  });
  const nobleWoodMat = new THREE.MeshStandardMaterial({
    color: PALETTE.agedWood,
    roughness: 0.62,
    metalness: 0.12
  });
  const moonGoldMat = new THREE.MeshStandardMaterial({
    color: PALETTE.goldHairpin,
    emissive: new THREE.Color(0xb45309),
    emissiveIntensity: 0.45,
    roughness: 0.35,
    metalness: 0.75
  });

  // Hai trụ đá rêu đỡ vòm cổng
  const plinthGeo = prepGeo(new THREE.BoxGeometry(0.82, 0.32, 0.82));
  const pillarGeo = prepGeo(new THREE.CylinderGeometry(0.24, 0.28, 3.4, 16));
  [-1.65, 1.65].forEach((px) => {
    const plinth = new THREE.Mesh(plinthGeo, stoneMat);
    plinth.position.set(px, 0.16, 0);
    group.add(plinth);

    const pillar = new THREE.Mesh(pillarGeo, nobleWoodMat);
    pillar.position.set(px, 1.86, 0);
    group.add(pillar);

    const cap = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(0.72, 0.2, 0.72)), stoneMat);
    cap.position.set(px, 3.6, 0);
    group.add(cap);
  });

  // Vòm gỗ Trăng Khuyết nghệ thuật (Crescent Moon Arch)
  const crescentShape = new THREE.Shape();
  crescentShape.absarc(0, 0, 1.72, 0, Math.PI, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0.32, 1.48, 0, Math.PI, false);
  crescentShape.holes.push(hole);

  const extrudeSettings = { depth: 0.24, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.03, bevelThickness: 0.03 };
  const crescentGeo = prepGeo(new THREE.ExtrudeGeometry(crescentShape, extrudeSettings));
  const crescentMesh = new THREE.Mesh(crescentGeo, nobleWoodMat);
  crescentMesh.position.set(0, 2.3, -0.12);
  group.add(crescentMesh);

  // Vành viền trăng khuyết dát kim nhũ vàng phát quang
  const rimTorus = new THREE.Mesh(
    prepGeo(new THREE.TorusGeometry(1.68, 0.045, 12, 32, Math.PI)),
    moonGoldMat
  );
  rimTorus.position.set(0, 2.35, 0.14);
  group.add(rimTorus);

  // Biển chữ: "CỔNG NHẬP CẢNH: CHUYỆN NGƯỜI CON GÁI NAM XƯƠNG"
  const signTex = createPortalSignTexture(
    'CỔNG NHẬP CẢNH: CHUYỆN NGƯỜI CON GÁI NAM XƯƠNG',
    'Nguyễn Dữ • Bến Hoàng Giang & Chiếc Bóng Trên Vách Nứa',
    {},
    disposables
  );
  const signMat = new THREE.MeshStandardMaterial({
    map: signTex,
    roughness: 0.45,
    metalness: 0.2
  });
  const signMesh = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(3.1, 0.65, 0.08)), signMat);
  signMesh.position.set(0, 4.05, 0.04);
  group.add(signMesh);

  // Đĩa Đèn Dầu Cổ phát quang treo giữa vòm trăng khuyết
  const lampGroup = new THREE.Group();
  lampGroup.position.set(0, 3.35, 0.15);

  const lampChain = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 6)), nobleWoodMat);
  lampChain.position.y = 0.22;
  lampGroup.add(lampChain);

  const lampSaucer = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.18, 0.12, 0.06, 16)), stoneMat);
  lampGroup.add(lampSaucer);

  const flameMesh = new THREE.Mesh(
    prepGeo(new THREE.ConeGeometry(0.05, 0.14, 8)),
    new THREE.MeshBasicMaterial({ color: PALETTE.oilLampOrange })
  );
  flameMesh.position.y = 0.09;
  lampGroup.add(flameMesh);

  const portalLampLight = new THREE.PointLight(PALETTE.oilLampOrange, 3.8, 7.5, 1.4);
  portalLampLight.position.set(0, 0.12, 0);
  portalLampLight.userData.ignoreRaycaster = true;
  lampGroup.add(portalLampLight);

  group.add(lampGroup);

  return { group, lampGroup, flameMesh, portalLampLight };
}

/** Tạo âm thanh thủ công Web Audio API không phụ thuộc file mp3 ngoài */
function createProceduralNamXuongAudio(audioCtx, kind = 'cottage') {
  if (!audioCtx) return null;
  const sampleRate = audioCtx.sampleRate || 44100;
  const duration = 6.0;
  const length = Math.floor(sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  if (kind === 'cottage') {
    // Gió đêm luồn kẽ liếp + giai điệu đàn bầu hát ru ngũ cung man mác
    let lp = 0;
    const notes = [220.0, 261.63, 293.66, 329.63, 293.66, 220.0];
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const noise = Math.random() * 2 - 1;
      lp += 0.022 * (noise - lp);
      const windEnv = 0.35 + 0.65 * Math.sin(Math.PI * ((t % 3.0) / 3.0)) ** 2;
      const wind = lp * windEnv * 0.22;

      const noteIdx = Math.floor(t) % notes.length;
      const localT = t % 1.0;
      const f = notes[noteIdx];
      const pitchBend = 1.0 - 0.025 * Math.sin(Math.PI * localT);
      const env = Math.sin(Math.PI * localT) ** 1.3 * Math.exp(-localT * 1.15);
      const danBau = Math.sin(2 * Math.PI * f * pitchBend * t) * 0.24 * env;

      data[i] = (wind + danBau) * 0.52;
    }
  } else if (kind === 'river') {
    // Sóng đêm vỗ bến sông Hoàng Giang rạt rào
    let lp = 0;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const noise = Math.random() * 2 - 1;
      lp += 0.016 * (noise - lp);
      const wave = 0.4 + 0.6 * Math.sin(Math.PI * ((t % 2.8) / 2.8)) ** 2;
      const chime = Math.sin(2 * Math.PI * 587.33 * t) * Math.exp(-((t % 2.0) / 2.0) * 4.2) * 0.032;
      data[i] = (lp * wave * 0.44 + chime) * 0.58;
    }
  } else {
    // Tiếng chuông khánh Đàn Giải Oan thanh tịnh thoát tục
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const period = t % 2.5;
      const env = Math.exp(-period * 3.2);
      const bell = (
        Math.sin(2 * Math.PI * 440.0 * t) * 0.28 +
        Math.sin(2 * Math.PI * 880.0 * t) * 0.14 +
        Math.sin(2 * Math.PI * 1320.0 * t) * 0.06
      ) * env;
      data[i] = bell * 0.48;
    }
  }
  return buffer;
}

/**
 * ============================================================================
 * FACTORY CHÍNH: createNamXuongStoryRealm(options)
 * ============================================================================
 */
export function createNamXuongStoryRealm(options = {}) {
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
    portalLocalPos = new THREE.Vector3(5.4, 0.08, 9.2),
    portalLocalRotY = -0.52
  } = options;

  let _camera = camera;
  let _renderer = renderer;
  let _cameraManager = cameraManager;
  let _hitboxManager = hitboxManager;
  let _loreGuide = loreGuide;
  let _spatialAudio = spatialAudio;
  let _portalInteraction = portalInteraction;
  let _immersionSystem = immersionSystem;

  let _mainScene = mainScene || scene || (typeof window !== 'undefined' ? window.__app?.mainScene : null);
  let _realmScene = realmScene || (typeof window !== 'undefined' ? window.__app?.namXuongScene : null);

  let _isInsideRealm = false;
  let _isTransitioning = false;
  let _reentryCooldown = 0;
  let _portalHitboxesRegistered = false;

  let _realmRoot = null;
  const _realmDisposables = [];
  const _realmCustomMaterials = [];
  let _realmDebugGroup = null;
  const _realmWalkables = [];
  let _realmState = null;

  // Auto-Tour State
  let _tourActive = false;
  let _tourPhase = 'idle';
  let _tourIdx = 0;
  let _tourPhaseStart = 0;
  const _tourFlightStartPos = new THREE.Vector3();
  const _tourFlightStartQuat = new THREE.Quaternion();
  const _tourFlightEndQuat = new THREE.Quaternion();

  const defaultPortalW = localRoomToWorld(REALM_ID, portalLocalPos.x, portalLocalPos.y + 1.8, portalLocalPos.z);
  const museumPortalTriggerWorldPos = new THREE.Vector3(defaultPortalW.x, defaultPortalW.y, defaultPortalW.z);

  // Vị trí người chơi xuất hiện trong cõi mở: Đầu triền đê hướng mắt về gian nhà và bến sông
  const realmSpawnPos = new THREE.Vector3(0, getNamXuongTerrainHeightAt(0, 46.0) + 1.75, 46.0);
  const realmSpawnLookAt = new THREE.Vector3(3.5, 2.2, 32.0);

  function getMuseumReturnPose() {
    if (interiorGroup) {
      interiorGroup.updateMatrixWorld(true);
      const frontOffset = new THREE.Vector3(0, 1.8, 3.4).applyAxisAngle(new THREE.Vector3(0, 1, 0), portalLocalRotY);
      const camLocal = portalLocalPos.clone().add(frontOffset);
      const lookLocal = portalLocalPos.clone().add(new THREE.Vector3(0, 1.9, 0));
      return {
        camPos: interiorGroup.localToWorld(camLocal),
        lookAt: interiorGroup.localToWorld(lookLocal)
      };
    }
    const fbCam = localRoomToWorld(REALM_ID, 2.8, 1.8, 11.2);
    const fbLook = localRoomToWorld(REALM_ID, portalLocalPos.x, 2.0, portalLocalPos.z);
    return {
      camPos: new THREE.Vector3(fbCam.x, fbCam.y, fbCam.z),
      lookAt: new THREE.Vector3(fbLook.x, fbLook.y, fbLook.z)
    };
  }

  // =========================================================================
  // PHẦN 1: CỔNG DỊCH CHUYỂN TẠI PHÒNG 204
  // =========================================================================
  const portalGroup = new THREE.Group();
  portalGroup.name = 'NamXuong_Portal_Station';
  portalGroup.position.copy(portalLocalPos);
  portalGroup.rotation.y = portalLocalRotY;

  const portalParent = interiorGroup || roomGroup || _mainScene;
  if (portalParent) portalParent.add(portalGroup);

  const portalSignDisposables = [];
  const portalVisual = buildCrescentMoonPortalVisual(portalSignDisposables);
  portalGroup.add(portalVisual.group);

  // Vòng xoáy portal shader DoubleSide
  const portalShaderMat = createPortalSwirlMaterial();
  const portalSwirlMesh = new THREE.Mesh(
    prepGeo(new THREE.CircleGeometry(1.42, 32)),
    portalShaderMat
  );
  portalSwirlMesh.name = 'NamXuong_Portal_SwirlMesh';
  portalSwirlMesh.position.set(0, 2.1, 0.02);
  portalGroup.add(portalSwirlMesh);

  // Ánh sáng tím chàm phát quang cổng
  const portalIndigoLight = new THREE.PointLight(PALETTE.mysticIndigo, 3.5, 8.5, 1.4);
  portalIndigoLight.position.set(0, 2.1, 0.35);
  portalIndigoLight.userData.ignoreRaycaster = true;
  portalGroup.add(portalIndigoLight);

  // Click Proxy kích hoạt enterRealm
  const portalClickProxy = new THREE.Mesh(
    prepGeo(new THREE.BoxGeometry(3.0, 4.2, 1.4)),
    new THREE.MeshBasicMaterial({
      color: PALETTE.mysticTeal,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    })
  );
  portalClickProxy.name = 'NamXuong_Portal_ClickProxy';
  portalClickProxy.position.set(0, 2.1, 0);
  portalClickProxy.userData = {
    isClickProxy: true,
    isBookPortal: true,
    isTeleportBook: true,
    targetRealm: 'NGUOI_CON_GAI_NAM_XUONG_REALM',
    realm: 'museum',
    ignoreRaycaster: false,
    portalMetadata: {
      id: REALM_ID,
      title: 'CỔNG NHẬP CẢNH: CHUYỆN NGƯỜI CON GÁI NAM XƯƠNG',
      author: 'Nguyễn Dữ (Thế kỷ XVI)',
      genre: 'Truyền kỳ mạn lục',
      description: 'Bước vào cõi mở bến Hoàng Giang, chứng kiến bi kịch chiếc bóng trên vách nứa và ảo ảnh Thủy Cung.',
      promptAction: 'Nhấp để bước vào cõi Hoàng Giang'
    },
    onActivate: () => enterRealm(REALM_ID)
  };
  portalGroup.add(portalClickProxy);

  function syncMuseumPortalHitboxes() {
    if (roomGroup) roomGroup.updateMatrixWorld(true);
    if (interiorGroup) interiorGroup.updateMatrixWorld(true);
    portalGroup.updateMatrixWorld(true);
    portalGroup.localToWorld(museumPortalTriggerWorldPos.set(0, 1.8, 0));

    if (_hitboxManager) {
      portalClickProxy.updateMatrixWorld(true);
      const portalBox = new THREE.Box3().setFromObject(portalClickProxy);
      if (!_hitboxManager.clickProxies.includes(portalClickProxy)) {
        portalClickProxy.userData.realm = 'museum';
        _hitboxManager.clickProxies.push(portalClickProxy);
        const h = new THREE.Box3Helper(portalBox, 0x38bdf8);
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
  // PHẦN 2: HUD CÕI MỞ & HIỆU ỨNG VIGNETTE / ĐỌC TRÍCH ĐOẠN (TTS)
  // =========================================================================
  function getOrCreateVignetteOverlay() {
    if (typeof document === 'undefined') return null;
    let el = document.getElementById('namxuong-dolly-vignette');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'namxuong-dolly-vignette';
    el.style.cssText = `
      position: fixed; inset: 0; pointer-events: none; z-index: 99998;
      background: radial-gradient(circle at center, rgba(13,17,23,0) 25%, rgba(9,13,22,0.92) 80%, rgba(5,8,14,1) 100%);
      opacity: 0; transition: opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    `;
    document.body.appendChild(el);
    return el;
  }

  function speakFarewellRecitation() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(
        'Thiếp vốn con kẻ khó, được nương tựa nhà giàu. Sum họp chưa thỏa tình chăn gối, chia phôi vì nạn binh đao. ' +
        'Thiếp cảm ơn đức của Linh Phi, đã thề sống chết cũng không bỏ. Đa tạ tình chàng, thiếp chẳng thể trở về nhân gian được nữa!'
      );
      utter.lang = 'vi-VN';
      utter.rate = 0.86;
      utter.pitch = 0.95;
      utter.volume = 0.88;
      window.speechSynthesis.speak(utter);
    } catch (_) {}
  }

  function stopRecitation() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
    } catch (_) {}
  }

  function getOrCreateRealmHUD() {
    if (typeof document === 'undefined') return null;
    let hud = document.getElementById('namxuong-realm-hud');
    if (hud) return hud;

    hud = document.createElement('div');
    hud.id = 'namxuong-realm-hud';
    hud.style.cssText = `
      position: fixed; top: 18px; left: 50%; transform: translateX(-50%);
      z-index: 99990; display: none; align-items: center; gap: 10px;
      padding: 10px 18px; border-radius: 999px;
      background: linear-gradient(135deg, rgba(9,13,22,0.95), rgba(30,27,75,0.92));
      border: 1.5px solid #2dd4bf; color: #f0fdfa;
      font-family: "Segoe UI", system-ui, sans-serif; font-size: 13px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.85); backdrop-filter: blur(10px);
    `;
    hud.innerHTML = `
      <span id="namxuong-hud-title" style="font-weight:700; color:#5eead4; letter-spacing:0.35px;">
        🌙 NGƯỜI CON GÁI NAM XƯƠNG • NGUYỄN DỮ (TRUYỀN KỲ MẠN LỤC)
      </span>
      <button id="namxuong-btn-recite" style="
        background: rgba(45,212,191,0.18); border:1px solid #2dd4bf; color:#ccfbf1;
        padding:6px 12px; border-radius:999px; cursor:pointer; font-weight:600; font-size:12px;
      ">🔊 Lời Từ Biệt Vũ Nương</button>
      <button id="namxuong-btn-tour" style="
        background: linear-gradient(90deg, #0d9488, #2dd4bf); border:none; color:#042f2e;
        padding:6px 14px; border-radius:999px; cursor:pointer; font-weight:700; font-size:12px;
      ">🧭 Auto-Tour Điện Ảnh</button>
      <button id="namxuong-btn-exit" style="
        background: rgba(239,68,68,0.2); border:1px solid #f87171; color:#fee2e2;
        padding:6px 12px; border-radius:999px; cursor:pointer; font-weight:600; font-size:12px;
      ">🏛️ Về Bảo Tàng</button>
    `;
    document.body.appendChild(hud);

    document.getElementById('namxuong-btn-recite')?.addEventListener('click', (e) => {
      e.stopPropagation();
      speakFarewellRecitation();
      _loreGuide?.showLoreCard?.('namxuong_realm_bia_lua');
    });
    document.getElementById('namxuong-btn-tour')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (_tourActive) stopAutoTour();
      else startRealmOnlyTour();
    });
    document.getElementById('namxuong-btn-exit')?.addEventListener('click', (e) => {
      e.stopPropagation();
      exitRealm();
    });

    return hud;
  }

  function getActiveRealmScene() {
    if (_realmScene) return _realmScene;
    if (typeof window !== 'undefined' && window.__app?.namXuongScene) {
      _realmScene = window.__app.namXuongScene;
      return _realmScene;
    }
    _realmScene = new THREE.Scene();
    _realmScene.name = 'NamXuong_Realm_Scene';
    if (typeof window !== 'undefined' && window.__app) {
      window.__app.namXuongScene = _realmScene;
    }
    return _realmScene;
  }

  // =========================================================================
  // PHẦN 3: DỰNG THẾ GIỚI MỞ HOÀNG GIANG TRONG REALMSCENE
  // =========================================================================
  function mountNamXuongRealm() {
    const targetScene = getActiveRealmScene();
    disposeNamXuongRealm();

    const rng = createSeededRandom(15302);
    const root = new THREE.Group();
    root.name = 'NamXuong_OpenWorld_Root';
    targetScene.add(root);
    _realmRoot = root;

    const tex = createNamXuongProceduralTextures(_realmDisposables);
    const trackMat = (m) => {
      _realmCustomMaterials.push(m);
      return m;
    };

    targetScene.background = new THREE.Color(PALETTE.nightSkyZenith);
    targetScene.fog = new THREE.FogExp2(PALETTE.fogDeepNight, 0.015);

    // 1. SKYDOME 360° & ÁNH TRĂNG KHUYẾT
    const skyGeo = prepGeo(new THREE.SphereGeometry(340, 48, 28));
    const skyMat = trackMat(createSkyDomeMaterial());
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    skyDome.userData.ignoreRaycaster = true;
    root.add(skyDome);

    // Vầng trăng khuyết treo cao góc Tây-Bắc
    const moonSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex.moonTex,
        color: PALETTE.moonSilver,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending
      })
    );
    moonSprite.position.set(-65, 145, -240);
    moonSprite.scale.set(42, 42, 1);
    moonSprite.userData.ignoreRaycaster = true;
    root.add(moonSprite);

    // Quầng sáng trăng
    const moonHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex.particleTex,
        color: PALETTE.moonHalo,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending
      })
    );
    moonHalo.position.copy(moonSprite.position);
    moonHalo.scale.set(110, 110, 1);
    moonHalo.userData.ignoreRaycaster = true;
    root.add(moonHalo);

    // Rặng núi xa mờ ảo chân trời
    const mountainGroup = new THREE.Group();
    mountainGroup.name = 'NamXuong_Distant_Mountains';
    const mtnMat = new THREE.MeshBasicMaterial({ color: 0x090e18, fog: true });
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2;
      const r = 260 + rng() * 30;
      const mw = 45 + rng() * 65;
      const mh = 38 + rng() * 52;
      const mtn = new THREE.Mesh(prepGeo(new THREE.ConeGeometry(mw, mh, 5)), mtnMat);
      mtn.position.set(Math.cos(angle) * r, mh * 0.42, Math.sin(angle) * r);
      mtn.scale.y = 0.85 + rng() * 0.4;
      mtn.userData.ignoreRaycaster = true;
      mountainGroup.add(mtn);
    }
    root.add(mountainGroup);

    // 2. MẶT NƯỚC SÔNG HOÀNG GIANG (CUSTOM GLSL WATER SHADER)
    const waterMat = trackMat(createHoangGiangWaterMaterial());
    const waterGeo = prepGeo(new THREE.PlaneGeometry(160, 110, 64, 48));
    const riverWater = new THREE.Mesh(waterGeo, waterMat);
    riverWater.name = 'NamXuong_HoangGiang_Water';
    riverWater.rotation.x = -Math.PI / 2;
    riverWater.position.set(0, 0.15, -45.0);
    riverWater.userData.ignoreRaycaster = true;
    root.add(riverWater);

    // Đáy sông sẫm màu
    const riverBed = new THREE.Mesh(
      prepGeo(new THREE.PlaneGeometry(160, 110)),
      new THREE.MeshBasicMaterial({ color: 0x020408 })
    );
    riverBed.rotation.x = -Math.PI / 2;
    riverBed.position.set(0, 0.02, -45.0);
    riverBed.userData.ignoreRaycaster = true;
    root.add(riverBed);

    // 3. ĐỊA HÌNH TRIỀN ĐÊ & DỐC CỎ VEN SÔNG
    const terrainGeo = prepGeo(new THREE.PlaneGeometry(88, 64, 56, 44));
    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vy = posAttr.getY(i);
      // vy tương ứng với trục Z thực tế sau khi xoay -PI/2
      const worldZ = 37.0 - (vy + 32.0);
      const h = getNamXuongTerrainHeightAt(vx, worldZ);
      posAttr.setZ(i, h);
    }
    terrainGeo.computeVertexNormals();

    const dykeMat = new THREE.MeshStandardMaterial({
      map: tex.soilDiff,
      normalMap: tex.soilNorm,
      roughness: 0.92,
      metalness: 0.04
    });
    const dykeMesh = new THREE.Mesh(terrainGeo, dykeMat);
    dykeMesh.name = 'NamXuong_Dyke_Terrain';
    dykeMesh.rotation.x = -Math.PI / 2;
    dykeMesh.position.set(0, 0, 37.0);
    dykeMesh.receiveShadow = true;
    root.add(dykeMesh);
    _realmWalkables.push(dykeMesh);

    // Bụi cỏ lau rì rào hai bên triền đê
    const reedGroup = new THREE.Group();
    reedGroup.name = 'NamXuong_Reed_Grass';
    const reedMat = new THREE.MeshStandardMaterial({
      color: PALETTE.reedGreen,
      roughness: 0.85,
      side: THREE.DoubleSide
    });
    const reedBladeGeo = prepGeo(new THREE.ConeGeometry(0.12, 1.85, 4));
    for (let i = 0; i < 90; i++) {
      const rx = (rng() - 0.5) * 44;
      const rz = 8 + rng() * 42;
      if (Math.abs(rx) < 3.2 && rz > 14) continue; // Chừa lối đi đê
      if (rx > 0 && rx < 10 && rz > 24 && rz < 40) continue; // Chừa nhà Vũ Nương
      const cluster = new THREE.Group();
      cluster.position.set(rx, getNamXuongTerrainHeightAt(rx, rz), rz);
      for (let k = 0; k < 6; k++) {
        const blade = new THREE.Mesh(reedBladeGeo, reedMat);
        blade.position.set((rng() - 0.5) * 0.45, 0.92, (rng() - 0.5) * 0.45);
        blade.rotation.x = (rng() - 0.5) * 0.35;
        blade.rotation.z = (rng() - 0.5) * 0.35;
        cluster.add(blade);
      }
      reedGroup.add(cluster);
    }
    reedGroup.traverse((c) => { c.userData.ignoreRaycaster = true; });
    root.add(reedGroup);

    // 4. GIAN NHÀ TRANH 1:1 & HIỆN TRƯỜNG "CHIẾC BÓNG TRÊN VÁCH NỨA"
    const cottageGroup = new THREE.Group();
    cottageGroup.name = 'NamXuong_Cottage_1to1';
    cottageGroup.position.set(4.5, 2.2, 32.5);
    root.add(cottageGroup);

    const woodMat = new THREE.MeshStandardMaterial({ color: PALETTE.agedWood, roughness: 0.72, metalness: 0.1 });
    const thatchMat = new THREE.MeshStandardMaterial({ map: tex.thatchDiff, roughness: 0.95, side: THREE.DoubleSide });
    const wattleMat = new THREE.MeshStandardMaterial({ map: tex.wattleDiff, normalMap: tex.wattleNorm, roughness: 0.86 });
    const coiMat = new THREE.MeshStandardMaterial({ map: tex.coiDiff, roughness: 0.78 });
    const stoneMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x272c38, roughness: 0.88 }));

    // Sàn gỗ nâng & móng đá nhà tranh
    const floorMesh = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(7.6, 0.22, 6.8)), woodMat);
    floorMesh.position.y = 0.11;
    floorMesh.receiveShadow = true;
    cottageGroup.add(floorMesh);
    _realmWalkables.push(floorMesh);

    // Cột gỗ chịu lực 4 góc và gian giữa
    const postGeo = prepGeo(new THREE.CylinderGeometry(0.12, 0.14, 3.4, 12));
    [
      [-3.5, -3.1], [3.5, -3.1],
      [-3.5, 3.1], [3.5, 3.1],
      [-3.5, 0.0], [3.5, 0.0]
    ].forEach(([cx, cz]) => {
      const p = new THREE.Mesh(postGeo, woodMat);
      p.position.set(cx, 1.7, cz);
      p.castShadow = true;
      p.receiveShadow = true;
      cottageGroup.add(p);
    });

    // Mái tranh rạ 4 dốc truyền thống
    const roofMesh = new THREE.Mesh(prepGeo(new THREE.ConeGeometry(5.8, 2.2, 4)), thatchMat);
    roofMesh.rotation.y = Math.PI / 4;
    roofMesh.position.set(0, 4.4, 0);
    roofMesh.castShadow = true;
    roofMesh.receiveShadow = true;
    cottageGroup.add(roofMesh);

    // BỨC VÁCH NỨA SAU PHẢN GỖ (Nhận bóng đổ sắc nét của Vũ Nương)
    const wattleWall = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(7.2, 3.1, 0.12)), wattleMat);
    wattleWall.name = 'NamXuong_WattleWall_ShadowReceiver';
    wattleWall.position.set(0, 1.65, 3.25);
    wattleWall.receiveShadow = true; // Bắt buộc nhận bóng rõ nét
    wattleWall.userData.preserveShadow = true;
    cottageGroup.add(wattleWall);

    // Vách nứa bên hồi (-X)
    const sideWall = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(0.12, 3.1, 6.4)), wattleMat);
    sideWall.position.set(-3.55, 1.65, 0);
    sideWall.receiveShadow = true;
    cottageGroup.add(sideWall);

    // Phản gỗ lim mộc & chiếu cói
    const woodenBed = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(2.6, 0.44, 2.0)), woodMat);
    woodenBed.position.set(0.2, 0.33, 1.8);
    woodenBed.castShadow = true;
    woodenBed.receiveShadow = true;
    cottageGroup.add(woodenBed);

    const matMesh = new THREE.Mesh(prepGeo(new THREE.PlaneGeometry(2.4, 1.85)), coiMat);
    matMesh.rotation.x = -Math.PI / 2;
    matMesh.position.set(0.2, 0.56, 1.8);
    matMesh.receiveShadow = true;
    cottageGroup.add(matMesh);

    // Đôn gỗ nhỏ đặt đĩa đèn dầu
    const standMesh = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.18, 0.22, 0.65, 12)), woodMat);
    standMesh.position.set(-1.45, 0.435, 0.35);
    standMesh.castShadow = true;
    standMesh.receiveShadow = true;
    cottageGroup.add(standMesh);

    const oilSaucer = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.14, 0.1, 0.05, 16)), stoneMat);
    oilSaucer.position.set(-1.45, 0.785, 0.35);
    cottageGroup.add(oilSaucer);

    const oilFlame = new THREE.Mesh(
      prepGeo(new THREE.ConeGeometry(0.045, 0.12, 8)),
      new THREE.MeshBasicMaterial({ color: PALETTE.oilLampOrange })
    );
    oilFlame.position.set(-1.45, 0.86, 0.35);
    cottageGroup.add(oilFlame);

    // NGỌN ĐÈN DẦU CHIAROSCURO: PointLight + SpotLight chiếu xuyên mô hình Vũ Nương hắt bóng lên vách nứa
    const lampSpotBasePos = new THREE.Vector3(-1.45, 0.88, 0.35);
    const lampSpotLight = new THREE.SpotLight(PALETTE.oilLampOrange, 34.0, 16.0, Math.PI / 3.8, 0.32, 1.15);
    lampSpotLight.name = 'NamXuong_OilLamp_ShadowSpotLight';
    lampSpotLight.position.copy(lampSpotBasePos);
    lampSpotLight.target.position.set(0.2, 1.65, 3.25); // Nhắm thẳng vào bức vách nứa
    lampSpotLight.castShadow = true;
    lampSpotLight.shadow.mapSize.set(1024, 1024);
    lampSpotLight.shadow.bias = -0.0006;
    lampSpotLight.shadow.normalBias = 0.024;
    lampSpotLight.shadow.camera.near = 0.4;
    lampSpotLight.shadow.camera.far = 16.0;
    lampSpotLight.userData = { preserveShadow: true, ignoreRaycaster: true, baseIntensity: 34.0 };
    cottageGroup.add(lampSpotLight);
    cottageGroup.add(lampSpotLight.target);

    const lampPointLight = new THREE.PointLight(PALETTE.oilLampOrange, 5.2, 9.5, 1.35);
    lampPointLight.position.copy(lampSpotBasePos);
    lampPointLight.userData.ignoreRaycaster = true;
    cottageGroup.add(lampPointLight);

    // MÔ HÌNH VŨ NƯƠNG: Nạp nguoicogainamxuong.glb (1:1 Life-Size ~2.8m - 3.2m)
    const vuNuongHolder = new THREE.Group();
    vuNuongHolder.name = 'NamXuong_VuNuong_LifeSize';
    // Đặt nàng đứng giữa ngọn đèn dầu và bức vách nứa
    vuNuongHolder.position.set(-0.25, 0.12, 1.6);
    vuNuongHolder.rotation.y = 0.28;
    cottageGroup.add(vuNuongHolder);

    // Placeholder tượng người tạm
    const placeholderGeo = prepGeo(new THREE.CylinderGeometry(0.32, 0.45, 2.35, 12));
    const placeholderMesh = new THREE.Mesh(
      placeholderGeo,
      new THREE.MeshStandardMaterial({ color: 0x4a3a2a, roughness: 0.82, transparent: true, opacity: 0.4 })
    );
    placeholderMesh.position.y = 1.175;
    placeholderMesh.castShadow = true;
    placeholderMesh.receiveShadow = true;
    vuNuongHolder.add(placeholderMesh);

    loadGlbCached(['/models/nguoicogainamxuong.glb', '/model/nguoicogainamxuong.glb'], {
      maxTextureSize: 1024,
      disableMipmaps: true
    })
      .then((rawScene) => {
        if (!rawScene || !_realmRoot) return;
        vuNuongHolder.remove(placeholderMesh);
        placeholderGeo.dispose();

        rawScene.updateMatrixWorld(true);
        const bbox = new THREE.Box3().setFromObject(rawScene);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const targetH = 2.95;
        if (size.y > 0.001) {
          const s = targetH / size.y;
          rawScene.scale.set(s, s, s);
          rawScene.position.y -= bbox.min.y * s;
        }

        rawScene.traverse((child) => {
          if (child.isMesh) {
            if (child.geometry) sanitizeGeometryBuffers(child.geometry);
            child.castShadow = true;
            child.receiveShadow = true;
            child.frustumCulled = true;
            child.userData.preserveShadow = true;
            child.userData.isSharedCachedAsset = true;
          }
        });
        vuNuongHolder.add(rawScene);
      })
      .catch((err) => {
        console.warn('[NamXuongRealm] Không thể nạp nguoicogainamxuong.glb, giữ nguyên fallback:', err?.message || err);
      });

    // 5. BẾN ĐÁ HOÀNG GIANG & ĐÀN GIẢI OAN (Z = 7.5, X = -6.5)
    const altarGroup = new THREE.Group();
    altarGroup.name = 'NamXuong_DanGiaiOan';
    altarGroup.position.set(-6.5, 0.85, 7.5);
    root.add(altarGroup);

    // Bệ thờ tam cấp bằng đá rêu
    const stoneTierMat = new THREE.MeshStandardMaterial({ map: tex.stoneDiff, roughness: 0.86 });
    [
      { w: 5.4, h: 0.32, d: 5.4, y: 0.16 },
      { w: 4.2, h: 0.32, d: 4.2, y: 0.48 },
      { w: 3.0, h: 0.36, d: 3.0, y: 0.82 }
    ].forEach((tier) => {
      const tm = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(tier.w, tier.h, tier.d)), stoneTierMat);
      tm.position.y = tier.y;
      tm.receiveShadow = true;
      tm.castShadow = true;
      altarGroup.add(tm);
    });

    // Bàn thờ phủ lụa điều
    const tableMesh = new THREE.Mesh(
      prepGeo(new THREE.BoxGeometry(1.6, 0.72, 1.0)),
      new THREE.MeshStandardMaterial({ color: PALETTE.crimsonSilk, roughness: 0.65 })
    );
    tableMesh.position.set(0, 1.36, 0);
    tableMesh.castShadow = true;
    tableMesh.receiveShadow = true;
    altarGroup.add(tableMesh);

    // Lư hương đồng cổ tỏa khói
    const censerMesh = new THREE.Mesh(
      prepGeo(new THREE.CylinderGeometry(0.24, 0.28, 0.36, 16)),
      new THREE.MeshStandardMaterial({ color: 0x926c2e, metalness: 0.8, roughness: 0.32 })
    );
    censerMesh.position.set(0, 1.88, 0);
    censerMesh.castShadow = true;
    altarGroup.add(censerMesh);

    // Khói hương trầm nghi ngút
    const incenseSmoke = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex.particleTex,
        color: 0xe2e8f0,
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending
      })
    );
    incenseSmoke.position.set(0, 2.45, 0);
    incenseSmoke.scale.set(1.4, 2.2, 1);
    incenseSmoke.userData.ignoreRaycaster = true;
    altarGroup.add(incenseSmoke);

    // 4 Cột Cờ Phướn Ngũ Sắc phấp phới ở 4 góc Đàn Giải Oan
    const bannerGroup = new THREE.Group();
    const bannerMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.6,
      side: THREE.DoubleSide
    });
    const poleGeo = prepGeo(new THREE.CylinderGeometry(0.06, 0.08, 5.6, 8));
    const flagGeo = prepGeo(new THREE.PlaneGeometry(0.65, 3.2, 2, 8));
    const bannerMeshes = [];
    [
      [-2.3, -2.3, 0.2],
      [2.3, -2.3, -0.3],
      [-2.3, 2.3, 0.4],
      [2.3, 2.3, -0.1]
    ].forEach(([bx, bz, rotY]) => {
      const pole = new THREE.Mesh(poleGeo, woodMat);
      pole.position.set(bx, 2.8, bz);
      pole.castShadow = true;
      altarGroup.add(pole);

      const flag = new THREE.Mesh(flagGeo, bannerMat);
      flag.position.set(bx + 0.32, 3.8, bz);
      flag.rotation.y = rotY;
      altarGroup.add(flag);
      bannerMeshes.push({ mesh: flag, baseRotY: rotY, phase: bx * 1.5 });
    });

    // CHIẾC TRÂM VÀNG (Hairpin) Lơ Lửng Xoay Chậm Phía Trên Đàn Giải Oan
    const hairpinHolder = new THREE.Group();
    hairpinHolder.name = 'NamXuong_GoldenHairpin_Floating';
    hairpinHolder.position.set(0, 2.75, 0);
    altarGroup.add(hairpinHolder);

    const hairpinShaft = new THREE.Mesh(
      prepGeo(new THREE.CylinderGeometry(0.018, 0.024, 0.95, 12)),
      new THREE.MeshStandardMaterial({ color: PALETTE.goldHairpin, metalness: 0.92, roughness: 0.22 })
    );
    hairpinShaft.rotation.z = Math.PI / 4.5;
    hairpinHolder.add(hairpinShaft);

    const hairpinFlower = new THREE.Mesh(
      prepGeo(new THREE.TorusGeometry(0.09, 0.025, 8, 16)),
      new THREE.MeshStandardMaterial({
        color: PALETTE.goldHairpin,
        emissive: new THREE.Color(0xf59e0b),
        emissiveIntensity: 0.65,
        metalness: 0.85,
        roughness: 0.2
      })
    );
    hairpinFlower.position.set(0.35, 0.35, 0);
    hairpinHolder.add(hairpinFlower);

    // Hào quang vàng kim phát sáng quanh trâm
    const hairpinHalo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: tex.particleTex,
        color: PALETTE.goldHairpin,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending
      })
    );
    hairpinHalo.scale.set(1.6, 1.6, 1);
    hairpinHalo.userData.ignoreRaycaster = true;
    hairpinHolder.add(hairpinHalo);

    // Bến đá cổ với bậc thang dẫn xuống mép sông (X: -2.5 .. 2.5, Z: 4.0 .. 6.5)
    const pierGroup = new THREE.Group();
    pierGroup.name = 'NamXuong_Stone_Pier';
    [
      { w: 5.2, h: 0.18, d: 1.2, z: 6.2, y: 0.42 },
      { w: 4.8, h: 0.16, d: 1.2, z: 5.2, y: 0.28 },
      { w: 4.4, h: 0.14, d: 1.4, z: 4.0, y: 0.16 }
    ].forEach((step) => {
      const sm = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(step.w, step.h, step.d)), stoneTierMat);
      sm.position.set(0, step.y, step.z);
      sm.receiveShadow = true;
      pierGroup.add(sm);
      _realmWalkables.push(sm);
    });
    root.add(pierGroup);

    // 6. ĐẠI CẢNH KỲ ẢO: "VŨ NƯƠNG TRỞ VỀ GIỮA DÒNG SÔNG" & THỦY CUNG HIỆN HÌNH
    const thuyCungGroup = new THREE.Group();
    thuyCungGroup.name = 'NamXuong_ThuyCung_Mirage';
    thuyCungGroup.position.set(0, 0.25, -22.0);
    root.add(thuyCungGroup);

    // Hàng trăm đốm hoa đăng hoa sen phát sáng dập dềnh trên sông
    const lanternGroup = new THREE.Group();
    const lanternGeo = prepGeo(new THREE.CylinderGeometry(0.18, 0.08, 0.14, 8));
    const lanternMat = new THREE.MeshStandardMaterial({
      color: PALETTE.mysticTeal,
      emissive: new THREE.Color(PALETTE.mysticTeal),
      emissiveIntensity: 0.95,
      roughness: 0.3
    });
    const floatingLanterns = [];
    for (let i = 0; i < 48; i++) {
      const lx = (rng() - 0.5) * 65;
      const lz = -8.0 - rng() * 45;
      const lt = new THREE.Mesh(lanternGeo, lanternMat);
      lt.position.set(lx, 0.18, lz);
      lt.userData.ignoreRaycaster = true;
      lanternGroup.add(lt);
      floatingLanterns.push({ mesh: lt, baseY: 0.18, phase: rng() * Math.PI * 2, speed: 1.2 + rng() * 0.8 });
    }
    root.add(lanternGroup);

    // Hàng ngàn hạt lân tinh ngọc bích bay vút lên từ dòng sông
    const particleCount = 1200;
    const pGeo = new THREE.BufferGeometry();
    const pPositions = new Float32Array(particleCount * 3);
    const pPhases = new Float32Array(particleCount);
    const pSpeeds = new Float32Array(particleCount);
    const pSizes = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      pPositions[i * 3] = (rng() - 0.5) * 85;
      pPositions[i * 3 + 1] = 0.2;
      pPositions[i * 3 + 2] = -5.0 - rng() * 55;
      pPhases[i] = rng();
      pSpeeds[i] = 0.08 + rng() * 0.15;
      pSizes[i] = 12.0 + rng() * 22.0;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    pGeo.setAttribute('aPhase', new THREE.BufferAttribute(pPhases, 1));
    pGeo.setAttribute('aSpeed', new THREE.BufferAttribute(pSpeeds, 1));
    pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSizes, 1));

    const wispMat = trackMat(createPhosphorescentPointsMaterial());
    const wispParticles = new THREE.Points(pGeo, wispMat);
    wispParticles.userData.ignoreRaycaster = true;
    root.add(wispParticles);

    // ẢO ẢNH ĐOÀN KIỆU VÕNG, CỜ QUẠT & DÁNG HÌNH VŨ NƯƠNG THỦY CUNG
    const mirageMat = new THREE.MeshStandardMaterial({
      color: 0x99f6e4,
      emissive: new THREE.Color(PALETTE.mysticTeal),
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.85,
      roughness: 0.35,
      side: THREE.DoubleSide
    });
    _realmCustomMaterials.push(mirageMat);

    // Kiệu hoa Thủy Cung chạm ngọc bích
    const palanquinMesh = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(3.6, 2.2, 2.4)), mirageMat);
    palanquinMesh.position.y = 1.6;
    thuyCungGroup.add(palanquinMesh);

    // Lọng ngọc bích tròn che trên kiệu
    const umbrellaMesh = new THREE.Mesh(prepGeo(new THREE.ConeGeometry(2.4, 0.75, 16)), mirageMat);
    umbrellaMesh.position.y = 3.25;
    thuyCungGroup.add(umbrellaMesh);

    // Dáng hình Vũ Nương lung linh trong sương Thủy Cung
    const mirageFigure = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.3, 0.42, 2.4, 12)), mirageMat);
    mirageFigure.position.set(0, 1.9, 0);
    thuyCungGroup.add(mirageFigure);

    // Cờ quạt lụa là hai bên kiệu hoa
    [-2.6, 2.6].forEach((cx) => {
      const fanPole = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.04, 0.05, 4.4, 8)), mirageMat);
      fanPole.position.set(cx, 2.2, 0);
      thuyCungGroup.add(fanPole);

      const ceremonialFan = new THREE.Mesh(prepGeo(new THREE.CircleGeometry(0.72, 16)), mirageMat);
      ceremonialFan.position.set(cx, 4.4, 0);
      thuyCungGroup.add(ceremonialFan);
    });

    thuyCungGroup.traverse((c) => { c.userData.ignoreRaycaster = true; });

    // 7. BẢNG THÔNG TIN LỤA TRẮNG KHUNG GỖ CỔ: namxuong_realm_bia_lua
    const steleGroup = new THREE.Group();
    steleGroup.name = 'NamXuong_SilkPlaque_Group';
    // Đặt ngay đầu triền đê lối dẫn vào gian nhà
    steleGroup.position.set(-1.8, 2.45, 39.5);
    steleGroup.rotation.y = 0.42;
    root.add(steleGroup);

    const plaqueFrameMesh = new THREE.Mesh(
      prepGeo(new THREE.BoxGeometry(2.4, 2.6, 0.16)),
      woodMat
    );
    plaqueFrameMesh.position.y = 1.35;
    plaqueFrameMesh.castShadow = true;
    plaqueFrameMesh.receiveShadow = true;
    steleGroup.add(plaqueFrameMesh);

    const silkTex = createSilkPlaqueTexture(_realmDisposables);
    const silkPlaqueMat = new THREE.MeshStandardMaterial({
      map: silkTex,
      roughness: 0.52,
      emissive: new THREE.Color(0xf8fafc),
      emissiveIntensity: 0.18
    });
    const silkMesh = new THREE.Mesh(prepGeo(new THREE.PlaneGeometry(2.15, 2.35)), silkPlaqueMat);
    silkMesh.position.set(0, 1.35, 0.09);
    steleGroup.add(silkMesh);

    // Click Proxy cho Bảng Lụa
    const steleProxy = new THREE.Mesh(
      prepGeo(new THREE.BoxGeometry(2.5, 2.8, 0.6)),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    steleProxy.name = 'NamXuong_SilkPlaque_Proxy';
    steleProxy.position.set(0, 1.35, 0);
    steleProxy.userData = {
      isClickProxy: true,
      loreKey: 'namxuong_realm_bia_lua',
      title: 'Bảng Lụa Nam Xương',
      ignoreRaycaster: false
    };
    steleGroup.add(steleProxy);

    // 8. CÁC LORE ORBS TƯƠNG TÁC
    function createLoreOrb(name, loreKey, pos, color = 0x2dd4bf) {
      const g = new THREE.Group();
      g.name = `NamXuong_LoreOrb_${name}`;
      g.position.copy(pos);

      const coreMesh = new THREE.Mesh(
        prepGeo(new THREE.SphereGeometry(0.24, 16, 16)),
        new THREE.MeshStandardMaterial({
          color,
          emissive: new THREE.Color(color),
          emissiveIntensity: 0.85,
          roughness: 0.2
        })
      );
      g.add(coreMesh);

      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: tex.particleTex,
          color,
          transparent: true,
          opacity: 0.65,
          blending: THREE.AdditiveBlending
        })
      );
      halo.scale.set(1.4, 1.4, 1);
      halo.userData.ignoreRaycaster = true;
      g.add(halo);

      const proxy = new THREE.Mesh(
        prepGeo(new THREE.SphereGeometry(0.85, 8, 8)),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      proxy.name = `NamXuong_Proxy_${name}`;
      proxy.userData = {
        isClickProxy: true,
        loreKey,
        ignoreRaycaster: false
      };
      g.add(proxy);

      root.add(g);
      return { group: g, core: coreMesh, halo, proxy };
    }

    const orbDenDau = createLoreOrb('DenDau', 'namxuong_realm_den_dau', new THREE.Vector3(3.05, 3.1, 32.85), PALETTE.oilLampOrange);
    const orbDanGiaiOan = createLoreOrb('DanGiaiOan', 'namxuong_realm_dan_giai_oan', new THREE.Vector3(-6.5, 3.8, 7.5), PALETTE.goldHairpin);
    const orbThuyCung = createLoreOrb('ThuyCung', 'namxuong_realm_thuy_cung', new THREE.Vector3(0, 3.2, -18.5), PALETTE.mysticTeal);

    // 9. BỆ TRĂNG KHUYẾT HỒI QUY BẢO TÀNG (Return Station)
    const returnGroup = new THREE.Group();
    returnGroup.name = 'NamXuong_Return_Station';
    returnGroup.position.set(3.8, getNamXuongTerrainHeightAt(3.8, 48.0), 48.0);
    returnGroup.rotation.y = Math.PI * 0.8;
    root.add(returnGroup);

    const returnArch = new THREE.Mesh(
      prepGeo(new THREE.TorusGeometry(1.45, 0.14, 12, 28, Math.PI)),
      stoneTierMat
    );
    returnArch.position.y = 1.45;
    returnGroup.add(returnArch);

    const returnSwirl = new THREE.Mesh(
      prepGeo(new THREE.CircleGeometry(1.35, 24)),
      portalShaderMat
    );
    returnSwirl.position.set(0, 1.45, 0.02);
    returnGroup.add(returnSwirl);

    const returnProxy = new THREE.Mesh(
      prepGeo(new THREE.BoxGeometry(2.4, 3.2, 1.2)),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    returnProxy.name = 'NamXuong_Return_Proxy';
    returnProxy.position.set(0, 1.5, 0);
    returnProxy.userData = {
      isClickProxy: true,
      isReturnPortal: true,
      title: 'Trở về Phòng Trưng Bày 204',
      ignoreRaycaster: false
    };
    returnGroup.add(returnProxy);

    // 10. HITBOX COLLIDERS BẢO VỆ & RANH GIỚI THẾ GIỚI
    const realmDebugGroup = new THREE.Group();
    realmDebugGroup.name = 'NamXuong_Realm_DebugHitboxes';
    root.add(realmDebugGroup);
    _realmDebugGroup = realmDebugGroup;

    const realmColliders = [];
    const addCollider = (center, size, name = 'Collider') => {
      const box = new THREE.Box3();
      box.setFromCenterAndSize(center, size);
      realmColliders.push(box);
      const helper = new THREE.Box3Helper(box, 0x2dd4bf);
      helper.name = `Helper_${name}`;
      realmDebugGroup.add(helper);
    };

    // Rào chắn mép nước bờ sông Hoàng Giang (Z = 4.2 .. 4.8) tránh người chơi ngã xuống sông sâu
    addCollider(new THREE.Vector3(-22.0, 1.5, 4.8), new THREE.Vector3(38.0, 3.5, 1.2), 'BoSong_Trai');
    addCollider(new THREE.Vector3(22.0, 1.5, 4.8), new THREE.Vector3(38.0, 3.5, 1.2), 'BoSong_Phai');

    // Tường nhà tranh và đồ đạc
    addCollider(new THREE.Vector3(4.5, 3.5, 35.8), new THREE.Vector3(7.6, 3.2, 0.4), 'VachNua_Sau');
    addCollider(new THREE.Vector3(0.9, 3.5, 32.5), new THREE.Vector3(0.4, 3.2, 6.8), 'VachNua_Trai');
    addCollider(new THREE.Vector3(4.7, 2.6, 34.3), new THREE.Vector3(2.8, 0.9, 2.2), 'PhanGo_Giuong');

    // Ranh giới thế giới mở
    addCollider(new THREE.Vector3(0, 3.0, 56.0), new THREE.Vector3(90.0, 6.0, 2.0), 'BienSau_Dyke');
    addCollider(new THREE.Vector3(0, 3.0, -58.0), new THREE.Vector3(90.0, 6.0, 2.0), 'BienSong_HoangGiang');
    addCollider(new THREE.Vector3(-42.0, 3.0, 0), new THREE.Vector3(2.0, 6.0, 115.0), 'BienTrai_TheGioi');
    addCollider(new THREE.Vector3(42.0, 3.0, 0), new THREE.Vector3(2.0, 6.0, 115.0), 'BienPhai_TheGioi');

    if (_hitboxManager) {
      _hitboxManager.clearRealmHitboxes?.(REALM_ID);
      _hitboxManager.registerRealmHitboxes?.(REALM_ID, realmColliders);
    }

    const interactiveProxies = [
      steleProxy,
      orbDenDau.proxy,
      orbDanGiaiOan.proxy,
      orbThuyCung.proxy,
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

    // 11. BA NGUỒN THREE.POSITIONALAUDIO CHUẨN THỦ CÔNG
    const cottageAudioAnchor = new THREE.Object3D();
    cottageAudioAnchor.position.set(4.5, 2.6, 32.5);
    cottageAudioAnchor.userData.ignoreRaycaster = true;
    root.add(cottageAudioAnchor);

    const riverAudioAnchor = new THREE.Object3D();
    riverAudioAnchor.position.set(0, 0.8, 5.0);
    riverAudioAnchor.userData.ignoreRaycaster = true;
    root.add(riverAudioAnchor);

    const ritualAudioAnchor = new THREE.Object3D();
    ritualAudioAnchor.position.set(-6.5, 2.2, 7.5);
    ritualAudioAnchor.userData.ignoreRaycaster = true;
    root.add(ritualAudioAnchor);

    const audioEntries = [];
    const spatial = _spatialAudio || (typeof window !== 'undefined' ? window.__spatialAudio : null);
    const audioListener = spatial?.listener || (typeof window !== 'undefined' ? window.__audioListener : null);

    if (audioListener) {
      const specs = [
        { anchor: cottageAudioAnchor, kind: 'cottage', refDist: 5.0, maxDist: 26.0, vol: 0.52 },
        { anchor: riverAudioAnchor, kind: 'river', refDist: 6.0, maxDist: 32.0, vol: 0.58 },
        { anchor: ritualAudioAnchor, kind: 'ritual', refDist: 4.5, maxDist: 24.0, vol: 0.46 }
      ];
      specs.forEach((spec) => {
        const pAudio = new THREE.PositionalAudio(audioListener);
        pAudio.setRefDistance(spec.refDist);
        pAudio.setMaxDistance(spec.maxDist);
        pAudio.setRolloffFactor(1.35);
        pAudio.setVolume(spec.vol);
        spec.anchor.add(pAudio);
        audioEntries.push({ pAudio, kind: spec.kind });
      });

      const activateAudio = () => {
        const ctx = audioListener.context;
        if (!ctx) return;
        audioEntries.forEach((e) => {
          const buf = createProceduralNamXuongAudio(ctx, e.kind);
          if (buf) {
            e.pAudio.setBuffer(buf);
            e.pAudio.setLoop(true);
            try { e.pAudio.play(); } catch (_) {}
          }
        });
      };
      if (audioListener.context?.state === 'running') {
        activateAudio();
      } else {
        const onFirstTouch = () => {
          audioListener.context?.resume().then(activateAudio).catch(() => {});
          window.removeEventListener('pointerdown', onFirstTouch);
          window.removeEventListener('keydown', onFirstTouch);
        };
        window.addEventListener('pointerdown', onFirstTouch, { once: true });
        window.addEventListener('keydown', onFirstTouch, { once: true });
      }
    }

    if (_spatialAudio?.attachPositionalSound) {
      _spatialAudio.attachPositionalSound('namxuong_realm_cottage_lullaby', cottageAudioAnchor, {
        refDistance: 5.0, maxDistance: 26.0, volume: 0.52
      });
      _spatialAudio.attachPositionalSound('namxuong_realm_river_waves', riverAudioAnchor, {
        refDistance: 6.0, maxDistance: 32.0, volume: 0.58
      });
      _spatialAudio.attachPositionalSound('namxuong_realm_ritual_music', ritualAudioAnchor, {
        refDistance: 4.5, maxDistance: 24.0, volume: 0.46
      });
    }

    _realmState = {
      waterMat,
      wispMat,
      mirageMat,
      lampSpotLight,
      lampPointLight,
      oilFlame,
      hairpinHolder,
      hairpinHalo,
      bannerMeshes,
      floatingLanterns,
      orbs: [orbDenDau, orbDanGiaiOan, orbThuyCung],
      interactiveProxies,
      audioEntries,
      thuyCungGroup,
      returnProxy
    };
  }

  function disposeNamXuongRealm() {
    stopRecitation();
    if (_realmState?.audioEntries) {
      _realmState.audioEntries.forEach((e) => {
        try {
          if (e.pAudio.isPlaying) e.pAudio.stop();
          e.pAudio.disconnect();
        } catch (_) {}
      });
    }

    if (_hitboxManager) {
      _hitboxManager.clearRealmHitboxes?.(REALM_ID);
    }

    if (_realmRoot) {
      const matSet = new Set();
      _realmRoot.traverse((obj) => {
        if (obj.userData?.isSharedCachedAsset) return;
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m) => matSet.add(m));
        }
      });
      matSet.forEach((m) => m.dispose());
      _realmRoot.parent?.remove(_realmRoot);
      _realmRoot = null;
    }

    _realmDisposables.forEach((t) => t?.dispose?.());
    _realmDisposables.length = 0;
    _realmCustomMaterials.length = 0;
    _realmWalkables.length = 0;
    _realmDebugGroup = null;
    _realmState = null;
  }

  // =========================================================================
  // PHẦN 4: DOLLY-ZOOM CUTSCENE & CHUYỂN CẢNH ENTER / EXIT
  // =========================================================================
  function runDollyZoomTransition({ targetPos, lookAtPos, durationMs = 1200, onSwap, onFinish }) {
    const cam = _camera || (typeof window !== 'undefined' ? window.__camera : null);
    const vignette = getOrCreateVignetteOverlay();

    if (!cam) {
      onSwap?.();
      onFinish?.();
      return;
    }

    const startPos = cam.position.clone();
    const startFov = cam.fov || 60;
    const startQuat = cam.quaternion.clone();

    const tmpCam = cam.clone();
    tmpCam.position.copy(targetPos);
    tmpCam.lookAt(lookAtPos);
    const targetQuat = tmpCam.quaternion.clone();

    const startTime = performance.now();
    let swapped = false;

    function stepDolly(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1.0, elapsed / durationMs);
      const eased = easeInOutCubic(progress);

      if (vignette) {
        if (progress < 0.5) {
          vignette.style.opacity = String(progress * 2.0);
        } else {
          vignette.style.opacity = String((1.0 - progress) * 2.0);
        }
      }

      cam.position.lerpVectors(startPos, targetPos, eased);
      cam.quaternion.slerpQuaternions(startQuat, targetQuat, eased);

      const fovWarp = Math.sin(progress * Math.PI) * 16.0;
      cam.fov = startFov - fovWarp;
      cam.updateProjectionMatrix();

      if (progress >= 0.5 && !swapped) {
        swapped = true;
        onSwap?.();
      }

      if (progress < 1.0) {
        requestAnimationFrame(stepDolly);
      } else {
        cam.fov = startFov;
        cam.updateProjectionMatrix();
        if (vignette) vignette.style.opacity = '0';
        onFinish?.();
      }
    }
    requestAnimationFrame(stepDolly);
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

    const portalFocusWorld = portalGroup.localToWorld(new THREE.Vector3(0, 2.1, 0));
    const dollyStandWorld = portalGroup.localToWorld(new THREE.Vector3(0, 1.9, 1.55));

    runDollyZoomTransition({
      targetPos: dollyStandWorld,
      lookAtPos: portalFocusWorld,
      durationMs: 1250,
      onSwap: () => {
        _isInsideRealm = true;
        if (typeof window !== 'undefined') window.__namXuongRealmActive = true;
        if (roomGroup) roomGroup.visible = false;

        mountNamXuongRealm();
        const targetRealmScene = getActiveRealmScene();

        if (typeof window !== 'undefined' && window.__app?.setActiveScene && targetRealmScene) {
          window.__app.setActiveScene(targetRealmScene);
        }

        if (camCtrl) {
          camCtrl.setFloorHeightProvider?.(getNamXuongTerrainHeightAt);
          camCtrl.floorHeightProvider = getNamXuongTerrainHeightAt;
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

        if (_immersionSystem?.xrTeleport) {
          _immersionSystem.xrTeleport.setTargetContext?.(targetRealmScene, _realmWalkables);
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
      if (typeof window !== 'undefined') window.__namXuongRealmActive = false;

      disposeNamXuongRealm();

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

      if (_immersionSystem?.xrTeleport && typeof window !== 'undefined' && window.__app?.atriumGroup) {
        _immersionSystem.xrTeleport.setTargetContext?.(
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

    if (vignette) {
      vignette.style.opacity = '1';
      setTimeout(() => {
        performExitSwap();
        setTimeout(() => {
          vignette.style.opacity = '0';
          _isTransitioning = false;
          if (ctrl) ctrl.enabled = true;
          if (camCtrl) camCtrl.isEnabled = true;
        }, 350);
      }, 500);
    } else {
      performExitSwap();
      _isTransitioning = false;
      if (ctrl) ctrl.enabled = true;
      if (camCtrl) camCtrl.isEnabled = true;
    }
  }

  // =========================================================================
  // PHẦN 5: AUTO-TOUR ĐIỆN ẢNH 4 CHẶNG
  // =========================================================================
  const ROOM_TOUR_STOPS = [
    {
      title: 'Phòng 204: Không Gian Trưng Bày Chuyện Người Con Gái Nam Xương',
      camPos: new THREE.Vector3(0, 2.0, 7.5),
      lookAt: new THREE.Vector3(0, 1.8, 0),
      dwellMs: 4500
    },
    {
      title: 'Tiến Vào Cổng Vành Trăng Khuyết Cổ Tích',
      camPos: new THREE.Vector3(portalLocalPos.x + 0.4, 1.9, portalLocalPos.z + 2.8),
      lookAt: new THREE.Vector3(portalLocalPos.x, 2.1, portalLocalPos.z),
      dwellMs: 4000
    }
  ];

  const REALM_TOUR_STOPS = [
    {
      title: 'Chặng 1/4: Triền Đê Cỏ Lau & Bảng Lụa Nam Xương',
      camPos: new THREE.Vector3(-1.2, 3.2, 43.5),
      lookAt: new THREE.Vector3(-1.8, 2.8, 39.5),
      loreKey: 'namxuong_realm_bia_lua',
      dwellMs: 6500
    },
    {
      title: 'Chặng 2/4: Gian Nhà Tranh & Chiếc Bóng Trên Vách Nứa',
      camPos: new THREE.Vector3(3.2, 2.8, 30.5),
      lookAt: new THREE.Vector3(4.5, 2.6, 33.5),
      loreKey: 'namxuong_realm_den_dau',
      dwellMs: 7500
    },
    {
      title: 'Chặng 3/4: Bến Sông Hoàng Giang & Đàn Giải Oan',
      camPos: new THREE.Vector3(-4.2, 2.2, 11.5),
      lookAt: new THREE.Vector3(-6.5, 2.4, 7.5),
      loreKey: 'namxuong_realm_dan_giai_oan',
      dwellMs: 7000
    },
    {
      title: 'Chặng 4/4: Ảo Ảnh Thủy Cung & Lời Từ Biệt Giữa Dòng Sông',
      camPos: new THREE.Vector3(0.0, 1.8, 4.2),
      lookAt: new THREE.Vector3(0.0, 1.5, -22.0),
      loreKey: 'namxuong_realm_thuy_cung',
      dwellMs: 8000
    }
  ];

  function beginRoomTourStop(idx) {
    if (!_tourActive || idx >= ROOM_TOUR_STOPS.length) {
      enterRealm(REALM_ID, { continueTourAfterEntry: true });
      return;
    }
    _tourIdx = idx;
    _tourPhase = 'room_flying';
    _tourPhaseStart = performance.now();

    const cam = _camera || (typeof window !== 'undefined' ? window.__camera : null);
    if (!cam) return;

    const stop = ROOM_TOUR_STOPS[idx];
    const targetWPos = interiorGroup ? interiorGroup.localToWorld(stop.camPos.clone()) : stop.camPos;
    const targetWLook = interiorGroup ? interiorGroup.localToWorld(stop.lookAt.clone()) : stop.lookAt;

    _tourFlightStartPos.copy(cam.position);
    _tourFlightStartQuat.copy(cam.quaternion);

    const tmp = cam.clone();
    tmp.position.copy(targetWPos);
    tmp.lookAt(targetWLook);
    _tourFlightEndQuat.copy(tmp.quaternion);
  }

  function beginRealmTourStop(idx) {
    if (!_tourActive || idx >= REALM_TOUR_STOPS.length) {
      stopAutoTour();
      return;
    }
    _tourIdx = idx;
    _tourPhase = 'realm_flying';
    _tourPhaseStart = performance.now();

    const cam = _camera || (typeof window !== 'undefined' ? window.__camera : null);
    if (!cam) return;

    const stop = REALM_TOUR_STOPS[idx];
    _tourFlightStartPos.copy(cam.position);
    _tourFlightStartQuat.copy(cam.quaternion);

    const tmp = cam.clone();
    tmp.position.copy(stop.camPos);
    tmp.lookAt(stop.lookAt);
    _tourFlightEndQuat.copy(tmp.quaternion);

    const hudTitle = typeof document !== 'undefined' ? document.getElementById('namxuong-hud-title') : null;
    if (hudTitle) hudTitle.textContent = `🧭 ${stop.title}`;
  }

  function startFullAutoTour() {
    if (_isInsideRealm) {
      startRealmOnlyTour();
      return;
    }
    _tourActive = true;
    _loreGuide?.hideLoreCard?.();
    beginRoomTourStop(0);
  }

  function startRealmOnlyTour() {
    if (!_isInsideRealm) {
      enterRealm(REALM_ID, { continueTourAfterEntry: true });
      return;
    }
    _tourActive = true;
    _loreGuide?.hideLoreCard?.();
    beginRealmTourStop(0);
  }

  function stopAutoTour() {
    _tourActive = false;
    _tourPhase = 'idle';
    _loreGuide?.hideLoreCard?.();
    const ctrl = _cameraManager?.controls || (typeof window !== 'undefined' ? window.__controls : null);
    const camCtrl = _cameraManager?.cameraController || (typeof window !== 'undefined' ? window.__cameraController : null);
    if (ctrl) ctrl.enabled = true;
    if (camCtrl) camCtrl.isEnabled = true;
  }

  function updateAutoTour(nowMs) {
    if (!_tourActive) return;
    const cam = _camera || (typeof window !== 'undefined' ? window.__camera : null);
    if (!cam) return;

    if (_tourPhase === 'room_flying') {
      const t = Math.min(1.0, (nowMs - _tourPhaseStart) / 2600);
      const e = easeInOutCubic(t);
      const stop = ROOM_TOUR_STOPS[_tourIdx];
      const targetWPos = interiorGroup ? interiorGroup.localToWorld(stop.camPos.clone()) : stop.camPos;
      cam.position.lerpVectors(_tourFlightStartPos, targetWPos, e);
      cam.quaternion.slerpQuaternions(_tourFlightStartQuat, _tourFlightEndQuat, e);
      if (t >= 1.0) {
        _tourPhase = 'room_dwelling';
        _tourPhaseStart = nowMs;
      }
    } else if (_tourPhase === 'room_dwelling') {
      const stop = ROOM_TOUR_STOPS[_tourIdx];
      if (nowMs - _tourPhaseStart >= stop.dwellMs) {
        if (_tourIdx + 1 < ROOM_TOUR_STOPS.length) {
          beginRoomTourStop(_tourIdx + 1);
        } else {
          enterRealm(REALM_ID, { continueTourAfterEntry: true });
        }
      }
    } else if (_tourPhase === 'realm_flying' && _isInsideRealm) {
      const t = Math.min(1.0, (nowMs - _tourPhaseStart) / 2800);
      const e = easeInOutCubic(t);
      const stop = REALM_TOUR_STOPS[_tourIdx];
      cam.position.lerpVectors(_tourFlightStartPos, stop.camPos, e);
      cam.quaternion.slerpQuaternions(_tourFlightStartQuat, _tourFlightEndQuat, e);
      if (t >= 1.0) {
        _tourPhase = 'realm_dwelling';
        _tourPhaseStart = nowMs;
        if (stop.loreKey && _loreGuide?.showLoreCard) {
          const synth = getSynthesizedPlaqueLore(stop.loreKey);
          _loreGuide.showLoreCard(stop.loreKey, {
            roomId: REALM_ID,
            styleTheme: synth?.styleTheme || 'lua_trang',
            customData: synth
          });
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
  // PHẦN 6: SỰ KIỆN CLICK / ESC & VÒNG LẶP UPDATE 60 FPS
  // =========================================================================
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  function onWindowPointerDown(e) {
    if (e.target.closest?.('#namxuong-realm-hud, .lore-card-container, button')) return;
    const cam = _camera || (typeof window !== 'undefined' ? window.__camera : null);
    if (!cam) return;

    const rect = _renderer?.domElement?.getBoundingClientRect();
    if (rect) {
      mouse.x = ((e.clientX - rect.left) / (rect.width || 1)) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / (rect.height || 1)) * 2 + 1;
    } else {
      mouse.x = (e.clientX / (window.innerWidth || 1)) * 2 - 1;
      mouse.y = -(e.clientY / (window.innerHeight || 1)) * 2 + 1;
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
        } else if (obj.userData?.loreKey) {
          e.stopPropagation();
          const synth = getSynthesizedPlaqueLore(obj.userData.loreKey);
          if (_loreGuide?.showLoreCard) {
            _loreGuide.showLoreCard(obj.userData.loreKey, {
              roomId: REALM_ID,
              styleTheme: synth?.styleTheme || 'lua_trang',
              customData: synth
            });
          }
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
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', onWindowPointerDown, { passive: false });
    window.addEventListener('keydown', onWindowKeyDown);
  }

  // Cập nhật Cổng trong phòng triển lãm
  function updateMuseumPortal(dt = 0.016, elapsedTime = 0, cameraRef = null) {
    if (portalSwirlMesh?.material?.uniforms?.uTime) {
      portalSwirlMesh.material.uniforms.uTime.value = elapsedTime;
    }
    if (portalVisual?.lampGroup) {
      portalVisual.lampGroup.rotation.z = Math.sin(elapsedTime * 2.2) * 0.08;
      const flicker = Math.sin(elapsedTime * 7.5) * 0.12 + Math.cos(elapsedTime * 14.0) * 0.08;
      portalVisual.flameMesh.scale.set(1.0 + flicker, 1.0 + flicker * 1.5, 1.0 + flicker);
      portalVisual.portalLampLight.intensity = 3.8 + flicker * 1.2;
    }

    // Proximity check bước vào cổng
    const cam = cameraRef || _camera || (typeof window !== 'undefined' ? window.__camera : null);
    if (!_isInsideRealm && !_isTransitioning && _reentryCooldown <= 0 && cam && roomGroup?.visible) {
      portalGroup.updateMatrixWorld(true);
      const triggerW = portalGroup.localToWorld(new THREE.Vector3(0, 1.8, 0));
      const distSq = cam.position.distanceToSquared(triggerW);
      if (distSq < 2.8 * 2.8) {
        enterRealm(REALM_ID);
      }
    }
  }

  // Cập nhật cõi mở 60 FPS
  function updateRealm(dt = 0.016, elapsedTime = 0, cameraRef = null) {
    if (_reentryCooldown > 0) {
      _reentryCooldown = Math.max(0, _reentryCooldown - dt);
    }

    updateAutoTour(performance.now());

    if (!_isInsideRealm || !_realmState) {
      updateMuseumPortal(dt, elapsedTime, cameraRef);
      return;
    }

    const cam = cameraRef || _camera || (typeof window !== 'undefined' ? window.__camera : null);

    // 1. Sóng nước Hoàng Giang & hạt lân tinh
    _realmState.waterMat.uniforms.uTime.value = elapsedTime;
    _realmState.wispMat.uniforms.uTime.value = elapsedTime;

    // 2. Hiện trường "Chiếc Bóng Trên Vách": Đèn dầu rung rinh theo gió
    const flicker = Math.sin(elapsedTime * 6.0) + Math.cos(elapsedTime * 14.0);
    _realmState.lampSpotLight.intensity = 34.0 + flicker * 7.5;
    _realmState.lampPointLight.intensity = 5.2 + flicker * 1.4;
    _realmState.oilFlame.scale.set(
      1.0 + Math.sin(elapsedTime * 16.0) * 0.08,
      1.0 + flicker * 0.45,
      1.0 + Math.cos(elapsedTime * 14.0) * 0.08
    );
    // Vị trí đèn đung đưa nhẹ như có gió lùa
    _realmState.lampSpotLight.position.x = -1.45 + Math.sin(elapsedTime * 7.0) * 0.035;
    _realmState.lampSpotLight.position.y = 0.88 + Math.cos(elapsedTime * 10.0) * 0.025;

    // 3. Chiếc Trâm Vàng bay lơ lửng & xoay chậm trên Đàn Giải Oan
    _realmState.hairpinHolder.position.y = 2.75 + Math.sin(elapsedTime * 1.7) * 0.12;
    _realmState.hairpinHolder.rotation.y += dt * 0.75;
    _realmState.hairpinHalo.material.opacity = 0.55 + Math.sin(elapsedTime * 2.5) * 0.15;

    // 4. Cờ phướn ngũ sắc phấp phới trong gió đêm
    for (let i = 0; i < _realmState.bannerMeshes.length; i++) {
      const b = _realmState.bannerMeshes[i];
      b.mesh.rotation.y = b.baseRotY + Math.sin(elapsedTime * 2.2 + b.phase) * 0.16;
    }

    // 5. Hoa đăng bồng bềnh theo sóng nước
    for (let i = 0; i < _realmState.floatingLanterns.length; i++) {
      const fl = _realmState.floatingLanterns[i];
      fl.mesh.position.y = fl.baseY + Math.sin(elapsedTime * fl.speed + fl.phase) * 0.045;
    }

    // 6. Nhịp thở hào quang Lore Orbs
    for (let i = 0; i < _realmState.orbs.length; i++) {
      const orb = _realmState.orbs[i];
      orb.group.position.y += Math.sin(elapsedTime * 1.6 + i) * 0.002;
      orb.halo.material.opacity = 0.52 + Math.sin(elapsedTime * 2.8 + i * 2.0) * 0.18;
    }

    // 7. Đại cảnh Thủy Cung: Tan biến khi người chơi tiến sát mép nước (< 6m)
    if (cam) {
      // Mép nước tại Z = 5.0m; tính khoảng cách người chơi đến mép nước
      const distToShore = Math.max(0, cam.position.z - 5.0);
      let targetOpacity = 0.85;
      if (distToShore < 6.0) {
        // Khi dist < 6m, ảo ảnh đoàn võng giá mờ dần theo văn bản: "chốc lát bóng mờ dần mà biến mất"
        targetOpacity = smoothstep(1.5, 6.0, distToShore) * 0.85;
      }
      _realmState.mirageMat.opacity += (targetOpacity - _realmState.mirageMat.opacity) * Math.min(1.0, dt * 3.5);

      // Proximity check bệ hồi quy về bảo tàng
      if (_realmState.returnProxy) {
        const returnW = _realmState.returnProxy.getWorldPosition(new THREE.Vector3());
        if (cam.position.distanceToSquared(returnW) < 2.2 * 2.2 && _reentryCooldown <= 0) {
          exitRealm();
        }
      }
    }
  }

  function setupContext(ctx = {}) {
    if (ctx.scene || ctx.mainScene) _mainScene = ctx.mainScene || ctx.scene;
    if (ctx.camera) _camera = ctx.camera;
    if (ctx.renderer) _renderer = ctx.renderer;
    if (ctx.cameraManager) _cameraManager = ctx.cameraManager;
    if (ctx.hitboxManager) _hitboxManager = ctx.hitboxManager;
    if (ctx.loreGuide) _loreGuide = ctx.loreGuide;
    if (ctx.spatialAudio) _spatialAudio = ctx.spatialAudio;
    if (ctx.portalInteraction) _portalInteraction = ctx.portalInteraction;
    if (ctx.immersionSystem) _immersionSystem = ctx.immersionSystem;

    if (_renderer?.shadowMap) {
      _renderer.shadowMap.enabled = true;
      _renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    syncMuseumPortalHitboxes();
  }

  function dispose() {
    stopAutoTour();
    exitRealm({ immediate: true, moveCameraBack: false });

    if (typeof window !== 'undefined') {
      window.removeEventListener('pointerdown', onWindowPointerDown);
      window.removeEventListener('keydown', onWindowKeyDown);
    }

    const hud = typeof document !== 'undefined' ? document.getElementById('namxuong-realm-hud') : null;
    hud?.remove();
    const vignette = typeof document !== 'undefined' ? document.getElementById('namxuong-dolly-vignette') : null;
    vignette?.remove();

    portalGroup.parent?.remove(portalGroup);
    portalClickProxy.geometry?.dispose?.();
    portalClickProxy.material?.dispose?.();
    portalSignDisposables.forEach((t) => t?.dispose?.());
  }

  // Khởi tạo hitbox cổng ngay từ đầu
  syncMuseumPortalHitboxes();

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

export default createNamXuongStoryRealm;
