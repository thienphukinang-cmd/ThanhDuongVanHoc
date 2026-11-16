import * as THREE from 'three';
import { getRoomWorldPose, localRoomToWorld } from '../config/literatureRegistry.js';
import { loadGlbCached, normalizeModelToHeight, sanitizeGeometryBuffers } from '../utils/modelLoaderHelper.js';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger.js';
import { createLyCloudAndWaveRelief3D } from './museumReliefSculptor.js';
import { createNamXuongStoryRealm } from './namXuongStoryRealm.js';
import {
  createRoomInfoPlaque,
  registerPlaqueWithSystems,
  syncPlaqueWorldMetadata
} from './roomInfoPlaque.js';

/**
 * ============================================================================
 * PHÒNG TRƯNG BÀY "CHUYỆN NGƯỜI CON GÁI NAM XƯƠNG" – NGUYỄN DỮ
 * Tầng 2 • Cánh Đông-Bắc • Phòng 204 (28m x 26m, rotY từ getRoomWorldPose)
 *
 * Quy hoạch Không gian Kép (Dual-Zone Chiaroscuro & Moonlit Riverbank):
 * - Lối vào (+Z): Cổng Gỗ Hình Vành Trăng Khuyết (Moon Gate) trên bệ đá rêu + đèn lồng treo
 * - Zone 1 (+Z): Tổ Ấm Trống Vắng & Bi Kịch Chiếc Bóng
 *   + Sàn gỗ mộc cổ (walkable / WebXR teleport), chái nhà tranh tre nứa góc phải
 *   + Phản gỗ mộc, chiếu cói, bàn thấp & Đĩa Đèn Dầu Cổ (ánh cam #ff7b00 lập lòe)
 *   + Bức vách lửng đan bằng mây tre nứa (receiveShadow = true) hứng trọn bóng khổng lồ
 *     của Vũ Nương (nguoicogainamxuong.glb, castShadow = true) từ ngọn đèn dầu
 * - Zone 2 (-Z): Bến Hoàng Giang & Đàn Giải Oan (KHÔNG CÓ SÀN GỖ dưới lòng sông)
 *   + Bờ đá rêu & cầu gỗ chuyển tiếp xuống mặt nước sông Hoàng Giang (Custom GLSL Shader)
 *   + Bóng mờ Thủy Cung dưới làn nước (võng giá, cờ quạt lụa là ẩn hiện)
 *   + Đàn Giải Oan chạm nổi sóng thủy ba & vân mây ở giữa sông
 *   + Chiếc Trâm Vàng phát quang xoay chậm trên không + hàng trăm hạt lân tinh #00ffcc
 *     & bụi vàng bay lên từ mặt nước và mờ dần theo chiều cao
 * - Bảng Thông Tin Di Sản Lụa Trắng / Giấy Dó + Camera Focus + Auto-Tour + PositionalAudio
 * ============================================================================
 */

const ROOM_W = 25.6;
const ROOM_D = 27.6;
const ROOM_H = 8.4;
const ARCH_H = 4.6;
const DOOR_W = 6.2;

const PALETTE = {
  midnightBg: 0x1a1a24,
  oilLampOrange: 0xff7b00,
  moonlightBlue: 0x88aaff,
  wispTeal: 0x00ffcc,
  goldHairpin: 0xffd35c,
  agedWood: 0x3b2618,
  darkWood: 0x22160f,
  mossStone: 0x3a433b,
  bambooTan: 0xb9945a,
  thatchStraw: 0x5c4a2e
};

export const NAM_XUONG_TOUR_BEATS = [
  {
    id: 'namxuong_moon_gate',
    title: 'Chặng 1/3: Cổng Trăng Khuyết & Tổ Ấm Nam Xương',
    narration: 'Bước qua Cổng Gỗ Hình Vành Trăng Khuyết vào không gian tổ ấm trống vắng của Vũ Nương.',
    localCam: [0.0, 1.9, 13.2],
    localLook: [0.0, 1.5, 2.8],
    dwellTimeMs: 7000,
    loreKey: 'plaque_nguoi_con_gai_nam_xuong'
  },
  {
    id: 'namxuong_bamboo_shadow',
    title: 'Chặng 2/3: Đĩa Đèn Dầu & Bi Kịch Chiếc Bóng Vách Nứa',
    narration: 'Ngọn đèn dầu hắt bóng Vũ Nương lên vách nứa — nút thắt oan nghiệt từ lời ngây thơ của bé Đản.',
    localCam: [2.8, 1.85, 6.2],
    localLook: [-1.2, 1.55, 1.9],
    dwellTimeMs: 7500,
    loreKey: 'nam_xuong_vu_nuong'
  },
  {
    id: 'namxuong_hoang_giang',
    title: 'Chặng 3/3: Bến Hoàng Giang, Đàn Giải Oan & Chiếc Trâm Vàng',
    narration: 'Sông Hoàng Giang đêm trăng bạc, lân tinh #00ffcc bừng sáng quanh Đàn Giải Oan và Chiếc Trâm Vàng.',
    localCam: [2.4, 2.25, -1.3],
    localLook: [0.0, 1.3, -6.8],
    dwellTimeMs: 8000,
    loreKey: 'nam_xuong_tram_vang'
  }
];

export function getNamXuongTourWaypoints(roomPose = null) {
  const pose = roomPose || getRoomWorldPose('nguoi_con_gai_nam_xuong');
  return NAM_XUONG_TOUR_BEATS.map((beat) => {
    const camW = localRoomToWorld(pose, beat.localCam[0], beat.localCam[1], beat.localCam[2]);
    const lookW = localRoomToWorld(pose, beat.localLook[0], beat.localLook[1], beat.localLook[2]);
    return {
      id: beat.id,
      title: beat.title,
      narration: beat.narration,
      cameraPos: new THREE.Vector3(camW.x, camW.y, camW.z),
      lookAtPos: new THREE.Vector3(lookW.x, lookW.y, lookW.z),
      dwellTimeMs: beat.dwellTimeMs,
      loreKey: beat.loreKey
    };
  });
}

export const NAM_XUONG_TOUR_WAYPOINTS = getNamXuongTourWaypoints();

function createSeededRandom(seed = 1520) {
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

function makeCanvasTexture(canvas, {
  repeatX = 1,
  repeatY = 1,
  srgb = true,
  disposables = []
} = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  disposables.push(tex);
  return tex;
}

function heightCanvasToNormalTexture(heightCanvas, strength = 2.4, repeatX = 1, repeatY = 1, disposables = []) {
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

function createNamXuongTextures(disposables) {
  const rng = createSeededRandom(1520);
  const sz = 256;

  // 1. Sàn gỗ mộc cũ (aged plank floor)
  const plankC = document.createElement('canvas');
  plankC.width = sz;
  plankC.height = sz;
  const pCtx = plankC.getContext('2d');
  const plankHC = document.createElement('canvas');
  plankHC.width = sz;
  plankHC.height = sz;
  const phCtx = plankHC.getContext('2d');

  pCtx.fillStyle = '#332116';
  pCtx.fillRect(0, 0, sz, sz);
  phCtx.fillStyle = '#888888';
  phCtx.fillRect(0, 0, sz, sz);

  const plankCount = 6;
  const pw = sz / plankCount;
  for (let i = 0; i < plankCount; i++) {
    const x = i * pw;
    const shade = 38 + Math.floor(rng() * 20);
    pCtx.fillStyle = `rgb(${shade + 18}, ${shade + 2}, ${shade - 10})`;
    pCtx.fillRect(x + 2, 0, pw - 4, sz);
    pCtx.fillStyle = '#140c08';
    pCtx.fillRect(x, 0, 3, sz);
    phCtx.fillStyle = '#262626';
    phCtx.fillRect(x, 0, 3, sz);

    // Thớ gỗ
    for (let g = 0; g < 18; g++) {
      const gx = x + 4 + rng() * (pw - 8);
      pCtx.fillStyle = rng() > 0.5 ? 'rgba(84, 55, 34, 0.35)' : 'rgba(22, 13, 8, 0.38)';
      pCtx.fillRect(gx, 0, 1.5, sz);
    }
    // Mối nối ngang ngẫu nhiên
    const seamY = ((i * 83 + 40) % sz);
    pCtx.fillStyle = '#130b07';
    pCtx.fillRect(x, seamY, pw, 3);
    phCtx.fillStyle = '#202020';
    phCtx.fillRect(x, seamY, pw, 3);
  }

  // 2. Bức vách lửng đan mây tre nứa (warm golden-tan woven wattle so dark shadow stands out crisply!)
  const wattleC = document.createElement('canvas');
  wattleC.width = sz;
  wattleC.height = sz;
  const wCtx = wattleC.getContext('2d');
  const wattleHC = document.createElement('canvas');
  wattleHC.width = sz;
  wattleHC.height = sz;
  const whCtx = wattleHC.getContext('2d');

  wCtx.fillStyle = '#5c4627';
  wCtx.fillRect(0, 0, sz, sz);
  whCtx.fillStyle = '#383838';
  whCtx.fillRect(0, 0, sz, sz);

  const cell = 32;
  for (let row = 0; row < sz / cell; row++) {
    for (let col = 0; col < sz / cell; col++) {
      const x = col * cell;
      const y = row * cell;
      const overH = (row + col) % 2 === 0;
      const toneShift = Math.floor((rng() - 0.5) * 18);
      const hCol = `rgb(${182 + toneShift}, ${146 + toneShift}, ${92 + Math.floor(toneShift * 0.6)})`;
      const vCol = `rgb(${164 + toneShift}, ${130 + toneShift}, ${80 + Math.floor(toneShift * 0.6)})`;

      if (overH) {
        wCtx.fillStyle = vCol;
        wCtx.fillRect(x + 6, y, cell - 12, cell);
        whCtx.fillStyle = '#888888';
        whCtx.fillRect(x + 6, y, cell - 12, cell);

        wCtx.fillStyle = hCol;
        wCtx.fillRect(x, y + 5, cell, cell - 10);
        whCtx.fillStyle = '#dadada';
        whCtx.fillRect(x, y + 5, cell, cell - 10);
      } else {
        wCtx.fillStyle = hCol;
        wCtx.fillRect(x, y + 5, cell, cell - 10);
        whCtx.fillStyle = '#888888';
        whCtx.fillRect(x, y + 5, cell, cell - 10);

        wCtx.fillStyle = vCol;
        wCtx.fillRect(x + 6, y, cell - 12, cell);
        whCtx.fillStyle = '#dadada';
        whCtx.fillRect(x + 6, y, cell - 12, cell);
      }
      wCtx.strokeStyle = 'rgba(42, 27, 13, 0.42)';
      wCtx.lineWidth = 1.5;
      wCtx.strokeRect(x + 1, y + 1, cell - 2, cell - 2);
    }
  }

  // 3. Đá rêu phong chạm khắc sóng & vân mây cổ cho Bến Hoàng Giang & Đàn Giải Oan
  const stoneC = document.createElement('canvas');
  stoneC.width = sz;
  stoneC.height = sz;
  const sCtx = stoneC.getContext('2d');
  const stoneHC = document.createElement('canvas');
  stoneHC.width = sz;
  stoneHC.height = sz;
  const shCtx = stoneHC.getContext('2d');

  sCtx.fillStyle = '#2d3336';
  sCtx.fillRect(0, 0, sz, sz);
  shCtx.fillStyle = '#7c7c7c';
  shCtx.fillRect(0, 0, sz, sz);

  for (let i = 0; i < 650; i++) {
    const x = rng() * sz;
    const y = rng() * sz;
    const r = 1.5 + rng() * 5.5;
    sCtx.fillStyle = rng() > 0.48 ? 'rgba(62, 74, 65, 0.35)' : 'rgba(22, 26, 30, 0.40)';
    sCtx.beginPath();
    sCtx.arc(x, y, r, 0, Math.PI * 2);
    sCtx.fill();

    const hv = rng() > 0.5 ? 160 : 60;
    shCtx.fillStyle = `rgba(${hv}, ${hv}, ${hv}, 0.4)`;
    shCtx.beginPath();
    shCtx.arc(x, y, r, 0, Math.PI * 2);
    shCtx.fill();
  }
  // Họa tiết sóng nước & vân mây chìm trên mặt đá Đàn Giải Oan
  sCtx.strokeStyle = 'rgba(130, 152, 165, 0.25)';
  sCtx.lineWidth = 2.4;
  shCtx.strokeStyle = '#d4d4d4';
  shCtx.lineWidth = 3.0;
  for (let y = 32; y < sz; y += 64) {
    sCtx.beginPath();
    shCtx.beginPath();
    for (let x = 0; x <= sz; x += 32) {
      const cy = y + Math.sin((x / sz) * Math.PI * 4) * 10;
      if (x === 0) {
        sCtx.moveTo(x, cy);
        shCtx.moveTo(x, cy);
      } else {
        sCtx.lineTo(x, cy);
        shCtx.lineTo(x, cy);
      }
    }
    sCtx.stroke();
    shCtx.stroke();
  }

  // 4. Mái tranh rơm rạ chái nhà
  const thatchC = document.createElement('canvas');
  thatchC.width = sz;
  thatchC.height = sz;
  const tCtx = thatchC.getContext('2d');
  tCtx.fillStyle = '#3a2d1b';
  tCtx.fillRect(0, 0, sz, sz);
  for (let i = 0; i < 600; i++) {
    const x = rng() * sz;
    const y = rng() * sz;
    const dy = 12 + rng() * 26;
    const dx = (rng() - 0.5) * 6;
    tCtx.strokeStyle = rng() > 0.42 ? '#6b5332' : '#241b0f';
    tCtx.lineWidth = 1.4;
    tCtx.beginPath();
    tCtx.moveTo(x, y);
    tCtx.lineTo(x + dx, y + dy);
    tCtx.stroke();
  }

  // 5. Tranh chân trời sông Hoàng Giang đêm trăng sương khói cho vách hậu (-Z)
  const backdropC = document.createElement('canvas');
  backdropC.width = 512;
  backdropC.height = 256;
  const bCtx = backdropC.getContext('2d');
  const bgGrad = bCtx.createLinearGradient(0, 0, 0, 256);
  bgGrad.addColorStop(0.0, '#090b14');
  bgGrad.addColorStop(0.55, '#131826');
  bgGrad.addColorStop(0.85, '#192638');
  bgGrad.addColorStop(1.0, '#070b12');
  bCtx.fillStyle = bgGrad;
  bCtx.fillRect(0, 0, 512, 256);

  // Vầng trăng bạc mờ sau làn mây đêm
  const moonGlow = bCtx.createRadialGradient(256, 78, 8, 256, 78, 88);
  moonGlow.addColorStop(0.0, 'rgba(205, 224, 255, 0.85)');
  moonGlow.addColorStop(0.22, 'rgba(136, 170, 255, 0.35)');
  moonGlow.addColorStop(1.0, 'rgba(26, 26, 36, 0.0)');
  bCtx.fillStyle = moonGlow;
  bCtx.fillRect(140, 0, 232, 180);

  // Dải núi xa & lau sậy bên bờ sông
  bCtx.fillStyle = '#0c101b';
  bCtx.beginPath();
  bCtx.moveTo(0, 195);
  bCtx.quadraticCurveTo(95, 142, 185, 182);
  bCtx.quadraticCurveTo(285, 152, 385, 176);
  bCtx.quadraticCurveTo(455, 148, 512, 188);
  bCtx.lineTo(512, 256);
  bCtx.lineTo(0, 256);
  bCtx.closePath();
  bCtx.fill();

  // 6. Chiếu cói trên phản gỗ
  const matC = document.createElement('canvas');
  matC.width = 128;
  matC.height = 128;
  const mCtx = matC.getContext('2d');
  mCtx.fillStyle = '#9c8b5e';
  mCtx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 4) {
    mCtx.fillStyle = y % 8 === 0 ? 'rgba(65, 52, 28, 0.28)' : 'rgba(220, 205, 160, 0.2)';
    mCtx.fillRect(0, y, 128, 2);
  }
  mCtx.fillStyle = '#6e231c';
  mCtx.fillRect(0, 0, 128, 10);
  mCtx.fillRect(0, 118, 128, 10);

  // 7. Radial glow sprite cho ngọn lửa đèn dầu & hào quang Trâm Vàng
  const glowC = document.createElement('canvas');
  glowC.width = 64;
  glowC.height = 64;
  const gCtx = glowC.getContext('2d');
  const gGrad = gCtx.createRadialGradient(32, 32, 0, 32, 32, 31);
  gGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  gGrad.addColorStop(0.32, 'rgba(255, 220, 140, 0.68)');
  gGrad.addColorStop(1.0, 'rgba(255, 160, 40, 0.0)');
  gCtx.fillStyle = gGrad;
  gCtx.fillRect(0, 0, 64, 64);

  return {
    plankDiffuse: makeCanvasTexture(plankC, { repeatX: 5, repeatY: 3, srgb: true, disposables }),
    plankBump: makeCanvasTexture(plankHC, { repeatX: 5, repeatY: 3, srgb: false, disposables }),
    wattleDiffuse: makeCanvasTexture(wattleC, { repeatX: 3.5, repeatY: 2.2, srgb: true, disposables }),
    wattleNormal: heightCanvasToNormalTexture(wattleHC, 2.4, 3.5, 2.2, disposables),
    stoneDiffuse: makeCanvasTexture(stoneC, { repeatX: 3, repeatY: 3, srgb: true, disposables }),
    stoneBump: makeCanvasTexture(stoneHC, { repeatX: 3, repeatY: 3, srgb: false, disposables }),
    stoneNormal: heightCanvasToNormalTexture(stoneHC, 2.2, 3, 3, disposables),
    thatchDiffuse: makeCanvasTexture(thatchC, { repeatX: 4, repeatY: 2, srgb: true, disposables }),
    backdropTex: makeCanvasTexture(backdropC, { repeatX: 1, repeatY: 1, srgb: true, disposables }),
    matDiffuse: makeCanvasTexture(matC, { repeatX: 2, repeatY: 2, srgb: true, disposables }),
    glowSpriteTex: makeCanvasTexture(glowC, { repeatX: 1, repeatY: 1, srgb: true, disposables })
  };
}

function createGateHeaderTexture(title, subtitle, disposables) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 220;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#15100c';
  ctx.fillRect(0, 0, 1024, 220);

  ctx.strokeStyle = '#9a7440';
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, 1000, 196);
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, 976, 172);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f3d8a0';
  ctx.font = 'bold 42px "Times New Roman", "Segoe UI", serif';
  ctx.fillText(title, 512, 86, 940);

  ctx.fillStyle = '#b9a68a';
  ctx.font = 'italic 24px "Times New Roman", "Segoe UI", serif';
  ctx.fillText(subtitle, 512, 152, 940);

  return makeCanvasTexture(canvas, { repeatX: 1, repeatY: 1, srgb: true, disposables });
}

/**
 * Tạo Hoàng Giang Water ShaderMaterial (sóng đêm lăn tăn, phản chiếu ánh trăng #88aaff & đèn dầu #ff7b00)
 */
function createHoangGiangWaterMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    uniforms: {
      uTime: { value: 0 },
      uDeepColor: { value: new THREE.Color(0x050b14) },
      uMidColor: { value: new THREE.Color(0x0b1d2e) },
      uMoonColor: { value: new THREE.Color(PALETTE.moonlightBlue) },
      uLampColor: { value: new THREE.Color(PALETTE.oilLampOrange) },
      uWispColor: { value: new THREE.Color(PALETTE.wispTeal) },
      uLampLocalPos: { value: new THREE.Vector3(2.8, 0.9, 5.8) },
      uFogColor: { value: new THREE.Color(PALETTE.midnightBg) },
      uFogDensity: { value: 0.032 }
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vLocalPos;
      varying vec3 vWorldPos;
      varying vec3 vNormalW;

      void main() {
        vUv = uv;
        vec3 pos = position;

        float w1 = sin(pos.x * 1.45 + uTime * 1.35) * cos(pos.y * 1.15 - uTime * 0.95) * 0.022;
        float w2 = sin((pos.x + pos.y) * 2.6 - uTime * 1.85) * 0.011;
        float w3 = cos(pos.x * 4.2 - pos.y * 3.1 + uTime * 2.4) * 0.005;
        pos.z += w1 + w2 + w3;

        float dx = 1.45 * cos(pos.x * 1.45 + uTime * 1.35) * cos(pos.y * 1.15 - uTime * 0.95) * 0.022
                 + 2.6 * cos((pos.x + pos.y) * 2.6 - uTime * 1.85) * 0.011;
        float dy = -1.15 * sin(pos.x * 1.45 + uTime * 1.35) * sin(pos.y * 1.15 - uTime * 0.95) * 0.022
                 + 2.6 * cos((pos.x + pos.y) * 2.6 - uTime * 1.85) * 0.011;

        vec3 localNorm = normalize(vec3(-dx, -dy, 1.0));
        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vLocalPos = worldPos.xyz;
        vWorldPos = worldPos.xyz;
        vNormalW = normalize(mat3(modelMatrix) * localNorm);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uDeepColor;
      uniform vec3 uMidColor;
      uniform vec3 uMoonColor;
      uniform vec3 uLampColor;
      uniform vec3 uWispColor;
      uniform vec3 uFogColor;
      uniform float uFogDensity;

      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vNormalW;

      void main() {
        vec3 N = normalize(vNormalW);
        vec3 V = normalize(cameraPosition - vWorldPos);

        // Fresnel ánh trăng lạnh
        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.2);

        // Phản chiếu ánh trăng bạc #88aaff từ trên cao
        vec3 moonDir = normalize(vec3(0.12, 0.88, -0.46));
        vec3 H = normalize(moonDir + V);
        float specMoon = pow(max(dot(N, H), 0.0), 68.0);
        float rippleShimmer = smoothstep(0.45, 0.95, sin(vUv.x * 36.0 + uTime * 1.6) * sin(vUv.y * 28.0 - uTime * 1.2) * 0.5 + 0.5);

        // Phản chiếu ấm từ đĩa đèn dầu phía bờ (+Z -> vUv.y gần 0.0)
        float shoreGlow = smoothstep(0.55, 1.0, 1.0 - vUv.y) * exp(-pow((vUv.x - 0.56) * 3.4, 2.0));
        float lampWave = 0.65 + 0.35 * sin((1.0 - vUv.y) * 42.0 - uTime * 3.2);

        // Hào quang lân tinh Thủy Cung dịu nhẹ vùng trung tâm sông
        float altarCenter = exp(-length(vUv - vec2(0.5, 0.48)) * 5.2);
        float pulse = 0.72 + 0.28 * sin(uTime * 1.5);

        vec3 col = mix(uDeepColor, uMidColor, clamp(fresnel * 1.15 + 0.12, 0.0, 1.0));
        col += uMoonColor * (specMoon * 0.95 + fresnel * 0.26 + rippleShimmer * 0.055);
        col += uLampColor * (shoreGlow * lampWave * 0.24);
        col += uWispColor * (altarCenter * pulse * 0.14);

        // Sương mù Exponential Squared khớp cảnh đêm
        float dist = length(cameraPosition - vWorldPos);
        float fogFactor = 1.0 - exp(-pow(uFogDensity * dist, 2.0));
        col = mix(col, uFogColor, clamp(fogFactor, 0.0, 0.88));

        float alpha = mix(0.84, 0.96, clamp(fresnel + specMoon * 0.5, 0.0, 1.0));
        gl_FragColor = vec4(col, alpha);
      }
    `
  });
}

/**
 * Custom ShaderMaterial cho hàng trăm hạt lân tinh #00ffcc & bụi vàng bay lên từ mặt nước và mờ dần theo chiều cao
 */
function createPhosphorescentPointsMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2) },
      uTealColor: { value: new THREE.Color(PALETTE.wispTeal) },
      uGoldColor: { value: new THREE.Color(0xffd470) }
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPixelRatio;
      attribute float aPhase;
      attribute float aSpeed;
      attribute float aSize;
      attribute float aMix;
      varying float vHeightNorm;
      varying float vMix;
      varying float vTwinkle;

      void main() {
        vMix = aMix;
        float cycle = fract(aPhase + uTime * aSpeed);
        vHeightNorm = cycle;

        vec3 pos = position;
        pos.y = 0.04 + cycle * 4.4;
        pos.x += sin(uTime * 0.85 + aPhase * 12.56) * (0.18 + cycle * 0.35);
        pos.z += cos(uTime * 0.72 + aPhase * 9.42) * (0.18 + cycle * 0.35);

        vTwinkle = 0.65 + 0.35 * sin(uTime * 3.4 + aPhase * 25.0);

        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float distScale = 140.0 / max(-mvPosition.z, 1.5);
        gl_PointSize = clamp(aSize * uPixelRatio * distScale * (1.0 - cycle * 0.35), 2.0, 28.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uTealColor;
      uniform vec3 uGoldColor;
      varying float vHeightNorm;
      varying float vMix;
      varying float vTwinkle;

      void main() {
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = length(c);
        if (d > 0.5) discard;

        float radial = pow(1.0 - d * 2.0, 2.0);
        float fadeIn = smoothstep(0.0, 0.12, vHeightNorm);
        float fadeOut = 1.0 - smoothstep(0.30, 1.0, vHeightNorm);
        float alpha = radial * fadeIn * fadeOut * vTwinkle * 0.88;

        vec3 col = mix(uTealColor, uGoldColor, vMix);
        gl_FragColor = vec4(col, alpha);
      }
    `
  });
}

/**
 * Tạo Chiếc Trâm Vàng (Golden Hairpin) chi tiết 3D phát quang
 */
function buildGoldenHairpinMesh(glowTex) {
  const group = new THREE.Group();
  group.name = 'NamXuong_Golden_Hairpin';

  const goldMat = new THREE.MeshStandardMaterial({
    color: PALETTE.goldHairpin,
    metalness: 0.92,
    roughness: 0.16,
    emissive: new THREE.Color(0xc98200),
    emissiveIntensity: 0.85
  });

  const pearlMat = new THREE.MeshStandardMaterial({
    color: 0xe6fff9,
    metalness: 0.15,
    roughness: 0.18,
    emissive: new THREE.Color(0x00cca3),
    emissiveIntensity: 0.45
  });

  // Thân trâm thuôn nhọn
  const shaft = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.026, 0.007, 1.05, 14)), goldMat);
  shaft.position.y = -0.10;
  group.add(shaft);

  // Cổ trâm chạm khắc hai vòng hoa sen
  const collarA = new THREE.Mesh(prepGeo(new THREE.TorusGeometry(0.044, 0.011, 8, 18)), goldMat);
  collarA.rotation.x = Math.PI / 2;
  collarA.position.y = 0.40;
  group.add(collarA);

  const collarB = new THREE.Mesh(prepGeo(new THREE.TorusGeometry(0.064, 0.012, 8, 20)), goldMat);
  collarB.rotation.x = Math.PI / 2;
  collarB.position.y = 0.47;
  group.add(collarB);

  // Đầu trâm hoa sen & vân mây cuốn
  const lotusBud = new THREE.Mesh(prepGeo(new THREE.SphereGeometry(0.078, 16, 12)), goldMat);
  lotusBud.scale.set(1.0, 1.35, 1.0);
  lotusBud.position.y = 0.56;
  group.add(lotusBud);

  // Cánh trâm hai bên uốn cong
  [-1, 1].forEach((side) => {
    const scroll = new THREE.Mesh(prepGeo(new THREE.TorusGeometry(0.095, 0.013, 8, 18, Math.PI * 1.2)), goldMat);
    scroll.position.set(side * 0.11, 0.52, 0);
    scroll.rotation.z = side > 0 ? -0.45 : Math.PI + 0.45;
    group.add(scroll);

    // Dải tua hạt ngọc rủ xuống
    const drop = new THREE.Mesh(prepGeo(new THREE.SphereGeometry(0.024, 10, 8)), pearlMat);
    drop.position.set(side * 0.17, 0.37, 0);
    group.add(drop);
  });

  // Nghiêng nhẹ đầy nghệ thuật như đang lơ lửng trên mặt nước
  group.rotation.z = 0.28;
  group.rotation.x = 0.12;

  // Hào quang phát sáng nhẹ bao quanh Trâm Vàng (không nhận raycast)
  const haloMat = new THREE.SpriteMaterial({
    map: glowTex,
    color: 0xffe488,
    transparent: true,
    opacity: 0.52,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const halo = new THREE.Sprite(haloMat);
  halo.scale.set(1.35, 1.35, 1.0);
  halo.position.set(0, 0.35, 0);
  halo.userData.ignoreRaycaster = true;
  group.add(halo);

  return { group, halo, goldMat, pearlMat };
}

/**
 * Tạo bóng dáng mờ Thủy Cung dưới làn nước (võng giá, cờ quạt lụa là ẩn hiện)
 */
function buildSubmergedThuyCungSilhouettes() {
  const group = new THREE.Group();
  group.name = 'NamXuong_Submerged_ThuyCung';

  const ghostMat = new THREE.MeshBasicMaterial({
    color: 0x168d80,
    transparent: true,
    opacity: 0.22,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const bannerMat = new THREE.MeshBasicMaterial({
    color: 0x24b8a8,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  // Võng giá / Kiệu rước chìm dưới lòng sông Hoàng Giang
  const palanquinPositions = [
    [-5.4, -7.2, 0.28],
    [5.8, -8.4, -0.34]
  ];
  const palanquinCanopyGeo = prepGeo(new THREE.ConeGeometry(1.05, 0.42, 4));
  const palanquinPoleGeo = prepGeo(new THREE.CylinderGeometry(0.03, 0.03, 3.6, 6));
  const palanquinBodyGeo = prepGeo(new THREE.BoxGeometry(1.35, 0.14, 0.95));

  palanquinPositions.forEach(([px, pz, ry]) => {
    const pal = new THREE.Group();
    pal.position.set(px, 0.025, pz);
    pal.rotation.y = ry;

    const canopy = new THREE.Mesh(palanquinCanopyGeo, ghostMat);
    canopy.rotation.y = Math.PI / 4;
    canopy.scale.set(1.0, 0.4, 0.8);
    canopy.position.y = 0.02;
    pal.add(canopy);

    const body = new THREE.Mesh(palanquinBodyGeo, ghostMat);
    body.position.y = 0.01;
    pal.add(body);

    [-0.48, 0.48].forEach((oz) => {
      const pole = new THREE.Mesh(palanquinPoleGeo, ghostMat);
      pole.rotation.z = Math.PI / 2;
      pole.position.set(0, 0.012, oz);
      pal.add(pole);
    });
    group.add(pal);
  });

  // Cờ quạt lụa là rủ bóng dưới đáy sông
  const banners = [];
  const bannerGeo = prepGeo(new THREE.PlaneGeometry(0.85, 2.8, 1, 8));
  bannerGeo.rotateX(-Math.PI / 2);

  const bannerCoords = [
    [-7.8, -5.2, 0.22],
    [-3.6, -10.5, -0.18],
    [3.8, -10.2, 0.15],
    [8.2, -5.6, -0.25]
  ];
  bannerCoords.forEach(([bx, bz, ry], idx) => {
    const bMesh = new THREE.Mesh(bannerGeo, bannerMat);
    bMesh.position.set(bx, 0.028 + idx * 0.002, bz);
    bMesh.rotation.y = ry;
    group.add(bMesh);
    banners.push({ mesh: bMesh, baseRotY: ry, phase: idx * 1.4 });
  });

  group.traverse((c) => {
    c.userData.ignoreRaycaster = true;
    c.castShadow = false;
    c.receiveShadow = false;
  });

  return { group, banners, ghostMat, bannerMat };
}

/**
 * Tạo Âm thanh Không gian (Procedural Web Audio Buffer — 0 missing mp3s)
 */
function createNamXuongAudioBuffer(audioCtx, kind = 'cottage') {
  if (!audioCtx) return null;
  const sampleRate = audioCtx.sampleRate || 44100;
  const duration = 6.0;
  const length = Math.floor(sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  if (kind === 'cottage') {
    // Gió đêm lùa qua vách nứa + giai điệu đàn bầu/hát ru ngũ cung buồn man mác
    let lp = 0;
    const notes = [220.0, 261.63, 293.66, 329.63, 293.66, 220.0];
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const noise = Math.random() * 2 - 1;
      lp += 0.022 * (noise - lp);
      const windEnv = 0.35 + 0.65 * Math.sin(Math.PI * ((t % 3.0) / 3.0)) ** 2;
      const wind = lp * windEnv * 0.24;

      const noteIdx = Math.floor(t) % notes.length;
      const localT = t % 1.0;
      const f = notes[noteIdx];
      // Nhấn nhá luyến láy nhẹ kiểu đàn bầu
      const pitchBend = 1.0 - 0.03 * Math.sin(Math.PI * localT) + 0.004 * Math.sin(2 * Math.PI * 5.2 * t);
      const env = Math.sin(Math.PI * localT) ** 1.2 * Math.exp(-localT * 1.1);
      const danBau = (
        Math.sin(2 * Math.PI * f * pitchBend * t) * 0.22 +
        Math.sin(2 * Math.PI * f * 2.0 * pitchBend * t) * 0.06
      ) * env;

      data[i] = (wind + danBau) * 0.55;
    }
  } else {
    // Tiếng sóng vỗ nhẹ bến sông Hoàng Giang + âm vang chuông thủy cung rất khẽ
    let lp = 0;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const noise = Math.random() * 2 - 1;
      lp += 0.018 * (noise - lp);
      const wave1 = 0.35 + 0.65 * Math.sin(Math.PI * ((t % 3.0) / 3.0)) ** 2;
      const wave2 = 0.4 + 0.6 * Math.sin(Math.PI * (((t + 1.5) % 3.0) / 3.0)) ** 2;
      const lapping = lp * (wave1 * 0.6 + wave2 * 0.4) * 0.42;

      const chimePhase = (t % 3.0) / 3.0;
      const chimeEnv = Math.exp(-chimePhase * 3.8);
      const chime = Math.sin(2 * Math.PI * 523.25 * t) * chimeEnv * 0.035;

      data[i] = (lapping + chime) * 0.58;
    }
  }

  return buffer;
}

/**
 * Xây dựng trọn vẹn Phòng trưng bày "Chuyện Người Con Gái Nam Xương" (Nguyễn Dữ)
 * Tầng 2 • Cánh Đông-Bắc • Phòng 204
 */
export function buildNamXuongExhibition({
  roomCenter = null,
  mainScene = null,
  realmScene = null,
  renderer = null,
  cameraManager = null
} = {}) {
  const pose = getRoomWorldPose('nguoi_con_gai_nam_xuong');
  const resolvedCenter = roomCenter
    ? roomCenter.clone()
    : new THREE.Vector3(pose.x, pose.y, pose.z);

  const disposables = [];
  const textures = createNamXuongTextures(disposables);

  const roomGroup = new THREE.Group();
  roomGroup.name = 'NamXuong_Room_Root';
  roomGroup.position.copy(resolvedCenter);

  const interiorGroup = new THREE.Group();
  interiorGroup.name = 'NamXuong_Interior_Group';
  interiorGroup.rotation.y = pose.rotY ?? -Math.PI * 0.5;
  roomGroup.add(interiorGroup);

  const solidObstacleObjects = [];
  const walkableFloors = [];

  // Shared materials (60+ FPS)
  const agedWoodMat = new THREE.MeshStandardMaterial({
    color: PALETTE.agedWood,
    roughness: 0.82,
    metalness: 0.04,
    emissive: new THREE.Color(0x0c0704),
    emissiveIntensity: 0.25
  });
  const darkWoodMat = new THREE.MeshStandardMaterial({
    color: PALETTE.darkWood,
    roughness: 0.78,
    metalness: 0.05
  });
  const plankFloorMat = new THREE.MeshStandardMaterial({
    color: 0x6b4c34,
    map: textures.plankDiffuse,
    bumpMap: textures.plankBump,
    bumpScale: 0.015,
    roughness: 0.84,
    metalness: 0.03
  });
  const wattleShadowWallMat = new THREE.MeshStandardMaterial({
    color: 0xd9be8a,
    map: textures.wattleDiffuse,
    normalMap: textures.wattleNormal,
    roughness: 0.90,
    metalness: 0.02
  });
  const mossStoneMat = new THREE.MeshStandardMaterial({
    color: 0x5c665f,
    map: textures.stoneDiffuse,
    normalMap: textures.stoneNormal,
    bumpMap: textures.stoneBump,
    bumpScale: 0.022,
    roughness: 0.88,
    metalness: 0.04
  });
  const thatchMat = new THREE.MeshLambertMaterial({
    map: textures.thatchDiffuse,
    color: 0x8b734e
  });
  const darkWallMat = new THREE.MeshStandardMaterial({
    color: 0x161722,
    roughness: 0.92,
    metalness: 0.02
  });
  const bambooMat = new THREE.MeshStandardMaterial({
    color: 0x745c34,
    roughness: 0.76,
    metalness: 0.02
  });
  const antiqueBronzeMat = new THREE.MeshStandardMaterial({
    color: 0x634b2a,
    roughness: 0.42,
    metalness: 0.74
  });

  // =========================================================================
  // 1. VỎ KIẾN TRÚC PHÒNG (25.6m x 27.6m x 8.4m, VÒM CỬA +Z RỘNG 6.2m)
  // =========================================================================
  const halfW = ROOM_W * 0.5;
  const halfD = ROOM_D * 0.5;
  const halfDoorW = DOOR_W * 0.5;

  // Tường mặt tiền (+Z = +13.62) chừa ô cửa 6.2m (X in [-3.1, +3.1], cao 4.6m)
  const pierW = halfW - halfDoorW;
  const pierX = halfDoorW + pierW * 0.5;
  const frontPierGeo = prepGeo(new THREE.BoxGeometry(pierW, ROOM_H + 1.2, 0.34));
  [-1, 1].forEach((s) => {
    const pier = new THREE.Mesh(frontPierGeo, darkWallMat);
    pier.position.set(s * pierX, (ROOM_H + 1.2) * 0.5, halfD - 0.16);
    pier.userData.ignoreRaycaster = true;
    interiorGroup.add(pier);
  });
  const lintelH = ROOM_H + 1.2 - ARCH_H;
  const frontLintel = new THREE.Mesh(
    prepGeo(new THREE.BoxGeometry(DOOR_W + 0.2, lintelH, 0.34)),
    darkWallMat
  );
  frontLintel.position.set(0, ARCH_H + lintelH * 0.5, halfD - 0.16);
  frontLintel.userData.ignoreRaycaster = true;
  interiorGroup.add(frontLintel);

  // Tường trái (-X) & phải (+X)
  const sideWallGeo = prepGeo(new THREE.BoxGeometry(0.36, ROOM_H + 1.2, ROOM_D));
  [-1, 1].forEach((s) => {
    const wall = new THREE.Mesh(sideWallGeo, darkWallMat);
    wall.position.set(s * (halfW - 0.16), (ROOM_H + 1.2) * 0.5, 0);
    wall.userData.ignoreRaycaster = true;
    interiorGroup.add(wall);
  });

  // Vách hậu (-Z = -13.62): cảnh đêm Hoàng Giang mịt mù ánh trăng
  const backWall = new THREE.Mesh(
    prepGeo(new THREE.BoxGeometry(ROOM_W, ROOM_H + 1.2, 0.36)),
    darkWallMat
  );
  backWall.position.set(0, (ROOM_H + 1.2) * 0.5, -halfD + 0.16);
  backWall.userData.ignoreRaycaster = true;
  interiorGroup.add(backWall);

  const riverBackdrop = new THREE.Mesh(
    prepGeo(new THREE.PlaneGeometry(ROOM_W - 0.8, ROOM_H - 0.2)),
    new THREE.MeshBasicMaterial({ map: textures.backdropTex, side: THREE.FrontSide })
  );
  riverBackdrop.position.set(0, (ROOM_H - 0.2) * 0.5, -halfD + 0.36);
  riverBackdrop.userData.ignoreRaycaster = true;
  interiorGroup.add(riverBackdrop);

  // Trần phòng (có ô giếng trời đêm trăng phía trên sông Hoàng Giang tại Z = -6.8)
  const ceilingGroup = new THREE.Group();
  const frontCeil = new THREE.Mesh(prepGeo(new THREE.PlaneGeometry(ROOM_W, 17.6)), darkWallMat);
  frontCeil.rotation.x = Math.PI / 2;
  frontCeil.position.set(0, ROOM_H, 5.0);
  ceilingGroup.add(frontCeil);

  const backCeil = new THREE.Mesh(prepGeo(new THREE.PlaneGeometry(ROOM_W, 4.0)), darkWallMat);
  backCeil.rotation.x = Math.PI / 2;
  backCeil.position.set(0, ROOM_H, -11.8);
  ceilingGroup.add(backCeil);

  const sideCeilW = halfW - 3.0;
  [-1, 1].forEach((s) => {
    const sc = new THREE.Mesh(prepGeo(new THREE.PlaneGeometry(sideCeilW, 6.0)), darkWallMat);
    sc.rotation.x = Math.PI / 2;
    sc.position.set(s * (3.0 + sideCeilW * 0.5), ROOM_H, -6.8);
    ceilingGroup.add(sc);
  });
  mergeGroupMeshesByMaterial(ceilingGroup);
  ceilingGroup.traverse((c) => { c.userData.ignoreRaycaster = true; });
  interiorGroup.add(ceilingGroup);

  // Ô trời đêm & luồng ánh trăng bạc #88aaff rọi xuống Đàn Giải Oan
  const nightSkyVoid = new THREE.Mesh(
    prepGeo(new THREE.CircleGeometry(3.2, 24)),
    new THREE.MeshBasicMaterial({ color: 0x0b1020, side: THREE.FrontSide })
  );
  nightSkyVoid.rotation.x = Math.PI / 2;
  nightSkyVoid.position.set(0, ROOM_H + 0.25, -6.8);
  nightSkyVoid.userData.ignoreRaycaster = true;
  interiorGroup.add(nightSkyVoid);

  const moonBeamMat = new THREE.MeshBasicMaterial({
    color: PALETTE.moonlightBlue,
    transparent: true,
    opacity: 0.085,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const moonBeamMesh = new THREE.Mesh(
    prepGeo(new THREE.CylinderGeometry(1.9, 3.8, ROOM_H - 0.5, 20, 1, true)),
    moonBeamMat
  );
  moonBeamMesh.position.set(0, (ROOM_H - 0.5) * 0.5 + 0.4, -6.8);
  moonBeamMesh.userData.ignoreRaycaster = true;
  interiorGroup.add(moonBeamMesh);

  // =========================================================================
  // 2. CỔNG GỖ HÌNH VÀNH TRĂNG KHUYẾT (MOON GATE ENTRANCE TẠI +Z)
  // =========================================================================
  const moonGateGroup = new THREE.Group();
  moonGateGroup.name = 'NamXuong_MoonGate_Entrance';
  moonGateGroup.position.set(0, 0, halfD - 0.72);
  interiorGroup.add(moonGateGroup);

  const plinthGeo = prepGeo(new THREE.BoxGeometry(0.95, 0.48, 0.95));
  const postGeo = prepGeo(new THREE.CylinderGeometry(0.22, 0.26, 4.4, 14));
  [-3.25, 3.25].forEach((gx) => {
    const plinth = new THREE.Mesh(plinthGeo, mossStoneMat);
    plinth.position.set(gx, 0.24, 0);
    moonGateGroup.add(plinth);
    solidObstacleObjects.push(plinth);

    const post = new THREE.Mesh(postGeo, agedWoodMat);
    post.position.set(gx, 2.68, 0);
    moonGateGroup.add(post);
  });

  // Vành trăng khuyết gỗ cổ ôm vòm cửa 6.2m (không chắn lối đi)
  const crescentOuter = new THREE.Mesh(
    prepGeo(new THREE.TorusGeometry(3.25, 0.20, 10, 32, Math.PI)),
    agedWoodMat
  );
  crescentOuter.position.set(0, 2.25, 0);
  moonGateGroup.add(crescentOuter);

  const crescentInner = new THREE.Mesh(
    prepGeo(new THREE.TorusGeometry(2.92, 0.09, 8, 28, Math.PI * 0.88)),
    antiqueBronzeMat
  );
  crescentInner.position.set(0, 2.25, 0);
  crescentInner.rotation.z = Math.PI * 0.06;
  moonGateGroup.add(crescentInner);

  // Xà ngang & mái gỗ nhẹ trên cổng trăng khuyết
  const gateLint = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(7.6, 0.34, 0.56)), darkWoodMat);
  gateLint.position.set(0, 5.15, 0);
  moonGateGroup.add(gateLint);

  const gateEave = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(8.2, 0.16, 1.15)), thatchMat);
  gateEave.position.set(0, 5.44, 0);
  moonGateGroup.add(gateEave);

  const gateSignTex = createGateHeaderTexture(
    'CHUYỆN NGƯỜI CON GÁI NAM XƯƠNG',
    'Nguyễn Dữ (Thế kỷ XVI) • Truyền Kỳ Mạn Lục',
    disposables
  );
  const gateSignMesh = new THREE.Mesh(
    prepGeo(new THREE.PlaneGeometry(4.2, 0.88)),
    new THREE.MeshBasicMaterial({ map: gateSignTex, side: THREE.DoubleSide })
  );
  gateSignMesh.position.set(0, 4.78, -0.32);
  gateSignMesh.rotation.y = Math.PI;
  moonGateGroup.add(gateSignMesh);

  // Hai đèn lồng gỗ/giấy dầu treo ở cổng trăng khuyết (lắc lư nhẹ)
  const hangingLanterns = [];
  const lanternBodyMat = new THREE.MeshStandardMaterial({
    color: 0xffc77a,
    emissive: new THREE.Color(PALETTE.oilLampOrange),
    emissiveIntensity: 0.95,
    roughness: 0.5
  });
  [-2.82, 2.82].forEach((lx, idx) => {
    const pivot = new THREE.Group();
    pivot.position.set(lx, 4.18, -0.22);

    const cord = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 6)), darkWoodMat);
    cord.position.y = -0.225;
    pivot.add(cord);

    const cap = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.16, 0.22, 0.08, 8)), darkWoodMat);
    cap.position.y = -0.46;
    pivot.add(cap);

    const body = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.17, 0.15, 0.34, 10)), lanternBodyMat);
    body.position.y = -0.66;
    pivot.add(body);

    const base = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.14, 0.10, 0.06, 8)), darkWoodMat);
    base.position.y = -0.85;
    pivot.add(base);

    pivot.traverse((c) => { c.userData.ignoreRaycaster = true; });
    moonGateGroup.add(pivot);
    hangingLanterns.push({ pivot, phase: idx * 1.9 });
  });

  moonGateGroup.traverse((c) => { c.userData.ignoreRaycaster = true; });

  // =========================================================================
  // 3. ZONE 1 (+Z): TỔ ẤM TRỐNG VẮNG & BI KỊCH CHIẾC BÓNG
  // =========================================================================
  // Sàn gỗ mộc cổ (CHỈ phủ nửa +Z từ Z = +0.6 tới +13.7; KHÔNG CÓ SÀN GỖ dưới sông -Z!)
  const cottageFloorDepth = 13.1;
  const cottageFloor = new THREE.Mesh(
    prepGeo(new THREE.BoxGeometry(ROOM_W - 0.6, 0.08, cottageFloorDepth)),
    plankFloorMat
  );
  cottageFloor.position.set(0, 0.04, 0.6 + cottageFloorDepth * 0.5);
  cottageFloor.receiveShadow = true;
  cottageFloor.castShadow = false;
  cottageFloor.userData.preserveShadow = true;
  cottageFloor.userData.isTeleportFloor = true;
  cottageFloor.userData.isNamXuongWalkable = true;
  cottageFloor.userData.isWalkableFloor = true;
  interiorGroup.add(cottageFloor);
  walkableFloors.push(cottageFloor);

  // Bậc dốc chuyển tiếp êm tại ngưỡng cửa Z = +13.7
  const entrySill = new THREE.Mesh(
    prepGeo(new THREE.BoxGeometry(DOOR_W, 0.05, 0.9)),
    mossStoneMat
  );
  entrySill.position.set(0, 0.025, halfD - 0.25);
  entrySill.userData.isTeleportFloor = true;
  entrySill.userData.isNamXuongWalkable = true;
  entrySill.userData.isWalkableFloor = true;
  interiorGroup.add(entrySill);
  walkableFloors.push(entrySill);

  // Chái nhà tranh mộc mạc góc phải (+X: 3.4..11.6, +Z: 2.0..10.6)
  const cottageCorner = new THREE.Group();
  cottageCorner.name = 'NamXuong_Thatched_Cottage_Corner';
  const cottagePillarGeo = prepGeo(new THREE.CylinderGeometry(0.11, 0.13, 3.8, 10));
  [
    [3.8, 2.4], [11.2, 2.4],
    [3.8, 10.2], [11.2, 10.2]
  ].forEach(([cx, cz]) => {
    const col = new THREE.Mesh(cottagePillarGeo, bambooMat);
    col.position.set(cx, 1.98, cz);
    cottageCorner.add(col);
  });

  // Vì kèo & mái tranh dốc nghiêng che góc tổ ấm
  const roofSlope = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(8.6, 0.18, 9.2)), thatchMat);
  roofSlope.position.set(7.6, 4.15, 6.3);
  roofSlope.rotation.z = -0.22;
  cottageCorner.add(roofSlope);

  const roofBeam = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(0.18, 0.22, 8.6)), agedWoodMat);
  roofBeam.position.set(3.8, 3.72, 6.3);
  cottageCorner.add(roofBeam);

  cottageCorner.traverse((c) => { c.userData.ignoreRaycaster = true; });
  interiorGroup.add(cottageCorner);

  // Phản gỗ mộc (Wooden Plank Bed) đặt tại (X = +6.6, Z = +7.0)
  const plankBed = new THREE.Group();
  plankBed.name = 'NamXuong_Wooden_Plank_Bed';
  plankBed.position.set(6.6, 0.08, 7.0);

  const bedSurface = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(2.5, 0.10, 1.65)), plankFloorMat);
  bedSurface.position.y = 0.44;
  bedSurface.receiveShadow = true;
  bedSurface.userData.preserveShadow = true;
  plankBed.add(bedSurface);

  const bedFrame = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(2.56, 0.14, 1.72)), darkWoodMat);
  bedFrame.position.y = 0.34;
  plankBed.add(bedFrame);

  const legGeo = prepGeo(new THREE.BoxGeometry(0.14, 0.34, 0.14));
  [
    [-1.12, -0.72], [1.12, -0.72],
    [-1.12, 0.72], [1.12, 0.72]
  ].forEach(([lx, lz]) => {
    const leg = new THREE.Mesh(legGeo, darkWoodMat);
    leg.position.set(lx, 0.17, lz);
    plankBed.add(leg);
  });

  // Chiếu cói & gối gỗ mộc trên phản
  const sedgeMatMesh = new THREE.Mesh(
    prepGeo(new THREE.BoxGeometry(2.24, 0.025, 1.42)),
    new THREE.MeshStandardMaterial({ map: textures.matDiffuse, roughness: 0.9 })
  );
  sedgeMatMesh.position.y = 0.50;
  plankBed.add(sedgeMatMesh);

  const woodPillow = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(0.24, 0.11, 0.46)), agedWoodMat);
  woodPillow.position.set(0.84, 0.56, 0);
  plankBed.add(woodPillow);

  plankBed.traverse((c) => { c.userData.ignoreRaycaster = true; });
  interiorGroup.add(plankBed);
  solidObstacleObjects.push(plankBed);

  // Bàn gỗ thấp & Đĩa Đèn Dầu Cổ (Antique Oil Lamp on Dish) tại (X = +2.8, Z = +5.8)
  const oilLampPos = new THREE.Vector3(2.8, 0.08, 5.8);
  const lampStandGroup = new THREE.Group();
  lampStandGroup.name = 'NamXuong_OilLamp_Table';
  lampStandGroup.position.copy(oilLampPos);

  const tableTop = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(0.95, 0.08, 0.85)), agedWoodMat);
  tableTop.position.y = 0.68;
  lampStandGroup.add(tableTop);

  const tableLegGeo = prepGeo(new THREE.BoxGeometry(0.09, 0.66, 0.09));
  [[-0.36, -0.32], [0.36, -0.32], [-0.36, 0.32], [0.36, 0.32]].forEach(([tx, tz]) => {
    const leg = new THREE.Mesh(tableLegGeo, darkWoodMat);
    leg.position.set(tx, 0.33, tz);
    lampStandGroup.add(leg);
  });

  // Đĩa đèn gốm/đồng cổ + bầu dầu + bấc + ngọn lửa hoạt ảnh
  const dishBase = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.19, 0.12, 0.045, 18)), antiqueBronzeMat);
  dishBase.position.y = 0.745;
  lampStandGroup.add(dishBase);

  const oilBowl = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.085, 0.055, 0.095, 16)), antiqueBronzeMat);
  oilBowl.position.y = 0.80;
  lampStandGroup.add(oilBowl);

  const wickMesh = new THREE.Mesh(
    prepGeo(new THREE.CylinderGeometry(0.008, 0.01, 0.05, 8)),
    new THREE.MeshBasicMaterial({ color: 0x22160f })
  );
  wickMesh.position.y = 0.86;
  lampStandGroup.add(wickMesh);

  const flameOuterMat = new THREE.MeshBasicMaterial({
    color: PALETTE.oilLampOrange,
    transparent: true,
    opacity: 0.88
  });
  const flameOuter = new THREE.Mesh(prepGeo(new THREE.ConeGeometry(0.042, 0.14, 10)), flameOuterMat);
  flameOuter.position.y = 0.94;
  lampStandGroup.add(flameOuter);

  const flameCore = new THREE.Mesh(
    prepGeo(new THREE.ConeGeometry(0.022, 0.085, 8)),
    new THREE.MeshBasicMaterial({ color: 0xfff3c4 })
  );
  flameCore.position.y = 0.92;
  lampStandGroup.add(flameCore);

  const flameGlowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: textures.glowSpriteTex,
    color: PALETTE.oilLampOrange,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }));
  flameGlowSprite.scale.set(0.75, 0.75, 1.0);
  flameGlowSprite.position.y = 0.95;
  lampStandGroup.add(flameGlowSprite);

  lampStandGroup.traverse((c) => { c.userData.ignoreRaycaster = true; });
  interiorGroup.add(lampStandGroup);
  solidObstacleObjects.push(lampStandGroup);

  // Bức vách lửng đan bằng mây tre nứa (Woven Bamboo/Wattle Half-Partition Wall)
  // Đặt ngay phía sau Vũ Nương theo trục đèn dầu (2.8, 5.8) -> Vũ Nương (0.15, 3.35) -> Vách (-2.2, 1.2)
  const wattleWallGroup = new THREE.Group();
  wattleWallGroup.name = 'NamXuong_Woven_Bamboo_Shadow_Wall';
  wattleWallGroup.position.set(-2.2, 0.08, 1.2);
  // Xoay pháp tuyến hướng thẳng về phía Đèn Dầu (+2.8, +5.8)
  const wattleRotY = Math.atan2(2.8 - (-2.2), 5.8 - 1.2);
  wattleWallGroup.rotation.y = wattleRotY;
  interiorGroup.add(wattleWallGroup);

  const wallW = 6.2;
  const wallH = 3.9;
  const wattlePanel = new THREE.Mesh(
    prepGeo(new THREE.BoxGeometry(wallW, wallH, 0.09)),
    wattleShadowWallMat
  );
  wattlePanel.position.y = wallH * 0.5;
  wattlePanel.receiveShadow = true;
  wattlePanel.castShadow = false;
  wattlePanel.userData.preserveShadow = true;
  wattlePanel.userData.ignoreRaycaster = true;
  wattleWallGroup.add(wattlePanel);

  // Khung tre & nẹp gỗ giữ bức vách lửng
  const framePostGeo = prepGeo(new THREE.CylinderGeometry(0.085, 0.095, wallH + 0.35, 10));
  [-wallW * 0.5, 0, wallW * 0.5].forEach((fx) => {
    const fPost = new THREE.Mesh(framePostGeo, bambooMat);
    fPost.position.set(fx, (wallH + 0.35) * 0.5, 0);
    fPost.userData.ignoreRaycaster = true;
    wattleWallGroup.add(fPost);
  });
  const topRail = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(wallW + 0.25, 0.14, 0.16)), agedWoodMat);
  topRail.position.y = wallH + 0.06;
  topRail.userData.ignoreRaycaster = true;
  wattleWallGroup.add(topRail);

  const bottomSill = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(wallW + 0.25, 0.18, 0.22)), darkWoodMat);
  bottomSill.position.y = 0.09;
  bottomSill.userData.ignoreRaycaster = true;
  wattleWallGroup.add(bottomSill);

  // 3 collider con dọc theo bức vách xoay góc (tránh AABB chéo quá phồng)
  [-2.0, 0, 2.0].forEach((offsetX, idx) => {
    const subCol = new THREE.Mesh(
      prepGeo(new THREE.BoxGeometry(1.9, 3.2, 0.28)),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    subCol.name = `NamXuong_WattleWall_Collider_${idx}`;
    subCol.position.set(offsetX, 1.6, 0);
    subCol.userData.ignoreRaycaster = true;
    wattleWallGroup.add(subCol);
    solidObstacleObjects.push(subCol);
  });

  // =========================================================================
  // 4. VŨ NƯƠNG (nguoicogainamxuong.glb) & ÁNH SÁNG CHIAROSCURO ĐỔ BÓNG
  // =========================================================================
  const vuNuongHolder = new THREE.Group();
  vuNuongHolder.name = 'NamXuong_VuNuong_Model';
  vuNuongHolder.position.set(0.15, 0.08, 3.35);
  vuNuongHolder.rotation.y = 0.42;
  interiorGroup.add(vuNuongHolder);

  // Bệ đá mỏng đánh dấu vị trí đứng của Vũ Nương trên sàn gỗ
  const vuNuongPad = new THREE.Mesh(
    prepGeo(new THREE.CylinderGeometry(0.68, 0.74, 0.04, 24)),
    darkWoodMat
  );
  vuNuongPad.position.y = 0.02;
  vuNuongPad.receiveShadow = true;
  vuNuongPad.userData.preserveShadow = true;
  vuNuongPad.userData.ignoreRaycaster = true;
  vuNuongHolder.add(vuNuongPad);

  // Placeholder dáng người ẩn/tạm khi GLB đang tải
  const vuNuongPlaceholder = new THREE.Mesh(
    prepGeo(new THREE.CylinderGeometry(0.32, 0.42, 2.35, 12)),
    new THREE.MeshStandardMaterial({ color: 0x3b2d26, roughness: 0.85, transparent: true, opacity: 0.35 })
  );
  vuNuongPlaceholder.position.y = 1.175;
  vuNuongPlaceholder.castShadow = true;
  vuNuongPlaceholder.userData.preserveShadow = true;
  vuNuongHolder.add(vuNuongPlaceholder);

  // Collider rắn quanh Vũ Nương
  const vuNuongCollider = new THREE.Mesh(
    prepGeo(new THREE.BoxGeometry(1.15, 2.4, 1.15)),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  vuNuongCollider.position.set(0.15, 1.28, 3.35);
  vuNuongCollider.userData.ignoreRaycaster = true;
  interiorGroup.add(vuNuongCollider);
  solidObstacleObjects.push(vuNuongCollider);

  // Đèn SpotLight Đĩa Đèn Dầu (#ff7b00) đổ bóng khổng lồ lên vách nứa (1024x1024)
  const shadowSpotBasePos = new THREE.Vector3(2.8, 1.06, 5.8);
  const shadowSpotLight = new THREE.SpotLight(PALETTE.oilLampOrange, 32.0, 16.0, Math.PI / 4.2, 0.36, 1.2);
  shadowSpotLight.name = 'NamXuong_OilLamp_ShadowSpotLight';
  shadowSpotLight.position.copy(shadowSpotBasePos);
  shadowSpotLight.target.position.set(-1.85, 1.52, 1.55);
  shadowSpotLight.castShadow = true;
  shadowSpotLight.shadow.mapSize.set(1024, 1024);
  shadowSpotLight.shadow.bias = -0.0005;
  shadowSpotLight.shadow.normalBias = 0.024;
  shadowSpotLight.shadow.camera.near = 0.8;
  shadowSpotLight.shadow.camera.far = 16.0;
  shadowSpotLight.userData = {
    isNamXuongShadowLight: true,
    preserveShadow: true,
    baseIntensity: 32.0,
    ignoreRaycaster: true
  };
  shadowSpotLight.target.userData = {
    isNamXuongShadowLight: true,
    isLightTarget: true,
    ignoreRaycaster: true
  };
  interiorGroup.add(shadowSpotLight);
  interiorGroup.add(shadowSpotLight.target);

  // Đèn PointLight ấm phụ trợ quanh đĩa đèn dầu (không castShadow)
  const oilLampWarmPoint = new THREE.PointLight(PALETTE.oilLampOrange, 5.2, 10.5, 1.35);
  oilLampWarmPoint.name = 'NamXuong_OilLamp_PointLight';
  oilLampWarmPoint.position.set(2.8, 1.18, 5.8);
  oilLampWarmPoint.castShadow = false;
  oilLampWarmPoint.userData = { ignoreRaycaster: true };
  interiorGroup.add(oilLampWarmPoint);

  // =========================================================================
  // 5. ZONE 2 (-Z): BẾN HOÀNG GIANG, SÔNG NƯỚC GLSL, ĐÀN GIẢI OAN & TRÂM VÀNG
  // =========================================================================
  // Đáy sông đêm thẫm (phủ trực tiếp sàn bê tông bảo tàng, KHÔNG có sàn gỗ)
  const riverBedDepth = 14.3;
  const riverBed = new THREE.Mesh(
    prepGeo(new THREE.PlaneGeometry(ROOM_W - 0.5, riverBedDepth)),
    new THREE.MeshBasicMaterial({ color: 0x03060c })
  );
  riverBed.rotation.x = -Math.PI / 2;
  riverBed.position.set(0, 0.015, -halfD + riverBedDepth * 0.5 + 0.1);
  riverBed.userData.ignoreRaycaster = true;
  interiorGroup.add(riverBed);

  // Bờ đá & cầu gỗ chuyển tiếp êm từ chái nhà (+Z = +0.6) xuống mặt nước (-Z = -0.8)
  const bankGroup = new THREE.Group();
  bankGroup.name = 'NamXuong_River_Bank_Transition';
  const step1 = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(ROOM_W - 0.6, 0.075, 0.72)), mossStoneMat);
  step1.position.set(0, 0.038, 0.30);
  bankGroup.add(step1);

  const step2 = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(ROOM_W - 0.6, 0.055, 0.65)), mossStoneMat);
  step2.position.set(0, 0.028, -0.35);
  bankGroup.add(step2);

  // Bến thuyền gỗ nhỏ bên tả ngạn (-X) nhô ra mép sông
  const woodenPier = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(3.2, 0.10, 2.2)), agedWoodMat);
  woodenPier.position.set(-5.2, 0.11, -0.45);
  bankGroup.add(woodenPier);
  [-6.6, -3.8].forEach((px) => {
    const pierPost = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.10, 0.11, 0.85, 8)), darkWoodMat);
    pierPost.position.set(px, 0.42, -1.42);
    bankGroup.add(pierPost);
  });
  bankGroup.traverse((c) => { c.userData.ignoreRaycaster = true; });
  interiorGroup.add(bankGroup);

  // Mặt sông Hoàng Giang (Custom GLSL ShaderMaterial) tại Y = 0.068m
  const waterMat = createHoangGiangWaterMaterial();
  const waterGeo = prepGeo(new THREE.PlaneGeometry(ROOM_W - 0.5, riverBedDepth, 48, 32));
  const riverWaterMesh = new THREE.Mesh(waterGeo, waterMat);
  riverWaterMesh.name = 'NamXuong_HoangGiang_Water';
  riverWaterMesh.rotation.x = -Math.PI / 2;
  riverWaterMesh.position.set(0, 0.068, -halfD + riverBedDepth * 0.5 + 0.1);
  riverWaterMesh.userData.ignoreRaycaster = true;
  riverWaterMesh.castShadow = false;
  riverWaterMesh.receiveShadow = false;
  interiorGroup.add(riverWaterMesh);

  // Bóng dáng Thủy Cung dưới làn nước (võng giá, cờ quạt lụa là ẩn hiện)
  const thuyCung = buildSubmergedThuyCungSilhouettes();
  interiorGroup.add(thuyCung.group);

  // Cầu đá dẫn ra Đàn Giải Oan (walkable + WebXR Teleport)
  const causewayFloor = new THREE.Mesh(
    prepGeo(new THREE.BoxGeometry(2.1, 0.20, 5.2)),
    mossStoneMat
  );
  causewayFloor.position.set(0, 0.11, -1.9);
  causewayFloor.userData.isTeleportFloor = true;
  causewayFloor.userData.isNamXuongWalkable = true;
  causewayFloor.userData.isWalkableFloor = true;
  interiorGroup.add(causewayFloor);
  walkableFloors.push(causewayFloor);

  // Đàn Giải Oan giữa sông Hoàng Giang (X = 0, Z = -6.8)
  const altarGroup = new THREE.Group();
  altarGroup.name = 'NamXuong_DanGiaiOan_Altar';
  altarGroup.position.set(0, 0.02, -6.8);
  interiorGroup.add(altarGroup);

  const altarBaseTier = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(4.8, 0.24, 4.8)), mossStoneMat);
  altarBaseTier.position.y = 0.12;
  altarBaseTier.userData.isTeleportFloor = true;
  altarBaseTier.userData.isNamXuongWalkable = true;
  altarBaseTier.userData.isWalkableFloor = true;
  altarGroup.add(altarBaseTier);
  walkableFloors.push(altarBaseTier);

  const altarDeck = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(4.1, 0.18, 4.1)), mossStoneMat);
  altarDeck.position.y = 0.33;
  altarDeck.userData.isTeleportFloor = true;
  altarDeck.userData.isNamXuongWalkable = true;
  altarDeck.userData.isWalkableFloor = true;
  altarGroup.add(altarDeck);
  walkableFloors.push(altarDeck);

  // Bệ trung tâm Đàn Giải Oan khắc phù điêu sóng nước & vân mây 3D
  const centerAltarCore = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.72, 0.88, 0.72, 8)), mossStoneMat);
  centerAltarCore.position.y = 0.78;
  centerAltarCore.userData.ignoreRaycaster = true;
  altarGroup.add(centerAltarCore);

  const stoneReliefMat = new THREE.MeshStandardMaterial({
    color: 0x74857c,
    roughness: 0.78,
    metalness: 0.12,
    emissive: new THREE.Color(0x0b1f1c),
    emissiveIntensity: 0.22
  });
  [0, Math.PI * 0.5, Math.PI, -Math.PI * 0.5].forEach((rot) => {
    const frieze = createLyCloudAndWaveRelief3D({
      width: 3.4,
      color: 0x7d8f85,
      material: stoneReliefMat
    });
    frieze.position.set(Math.sin(rot) * 2.06, 0.32, Math.cos(rot) * 2.06);
    frieze.rotation.y = rot;
    frieze.scale.setScalar(0.92);
    frieze.traverse((c) => { c.userData.ignoreRaycaster = true; });
    altarGroup.add(frieze);
  });

  // Lư hương đá & 4 trụ đèn đá góc Đàn Giải Oan
  const censer = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.24, 0.18, 0.22, 12)), antiqueBronzeMat);
  censer.position.y = 1.24;
  censer.userData.ignoreRaycaster = true;
  altarGroup.add(censer);

  const altarCornerGeo = prepGeo(new THREE.BoxGeometry(0.26, 0.85, 0.26));
  const lanternDotMat = new THREE.MeshBasicMaterial({ color: PALETTE.wispTeal });
  [
    [-1.85, -1.85], [1.85, -1.85],
    [-1.85, 1.85], [1.85, 1.85]
  ].forEach(([ax, az]) => {
    const bollard = new THREE.Mesh(altarCornerGeo, mossStoneMat);
    bollard.position.set(ax, 0.84, az);
    bollard.userData.ignoreRaycaster = true;
    altarGroup.add(bollard);

    const orb = new THREE.Mesh(prepGeo(new THREE.SphereGeometry(0.065, 10, 8)), lanternDotMat);
    orb.position.set(ax, 1.32, az);
    orb.userData.ignoreRaycaster = true;
    altarGroup.add(orb);
  });

  // Collider lõi Đàn Giải Oan (bảo vệ lư hương & trâm vàng) + lan can mép nước sâu
  const altarCoreCollider = new THREE.Mesh(
    prepGeo(new THREE.BoxGeometry(1.55, 2.2, 1.55)),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  altarCoreCollider.position.set(0, 1.1, -6.8);
  altarCoreCollider.userData.ignoreRaycaster = true;
  interiorGroup.add(altarCoreCollider);
  solidObstacleObjects.push(altarCoreCollider);

  // Hàng rào collider ngăn người chơi bước lọt xuống vùng nước sâu hai bên bờ và cầu đá
  const addBoundaryCollider = (name, x, y, z, w, h, d) => {
    const col = new THREE.Mesh(
      prepGeo(new THREE.BoxGeometry(w, h, d)),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    col.name = name;
    col.position.set(x, y, z);
    col.userData.ignoreRaycaster = true;
    interiorGroup.add(col);
    solidObstacleObjects.push(col);
  };
  // Rào mép bờ sông trái & phải (chừa lối cầu đá X in [-1.05, +1.05])
  addBoundaryCollider('NamXuong_BankRail_Left', -6.8, 1.0, 0.35, 11.4, 2.0, 0.45);
  addBoundaryCollider('NamXuong_BankRail_Right', 6.8, 1.0, 0.35, 11.4, 2.0, 0.45);
  // Rào hai bên cầu đá
  addBoundaryCollider('NamXuong_CausewayRail_Left', -1.25, 1.0, -2.1, 0.3, 2.0, 4.9);
  addBoundaryCollider('NamXuong_CausewayRail_Right', 1.25, 1.0, -2.1, 0.3, 2.0, 4.9);
  // Rào viền 3 cạnh ngoài Đàn Giải Oan
  addBoundaryCollider('NamXuong_AltarRail_Left', -2.4, 1.0, -6.8, 0.3, 2.0, 4.8);
  addBoundaryCollider('NamXuong_AltarRail_Right', 2.4, 1.0, -6.8, 0.3, 2.0, 4.8);
  addBoundaryCollider('NamXuong_AltarRail_Back', 0, 1.0, -9.2, 4.8, 2.0, 0.3);

  // Chiếc Trâm Vàng (Golden Hairpin) bay lơ lửng & xoay chậm trên Đàn Giải Oan
  const hairpinHolder = new THREE.Group();
  hairpinHolder.name = 'NamXuong_TramVang_Holder';
  hairpinHolder.position.set(0, 1.95, -6.8);
  interiorGroup.add(hairpinHolder);

  const hairpinRig = buildGoldenHairpinMesh(textures.glowSpriteTex);
  hairpinHolder.add(hairpinRig.group);

  // Ánh trăng bạc #88aaff DirectionalLight rọi từ trên cao xuống Hoàng Giang
  const moonDirLight = new THREE.DirectionalLight(PALETTE.moonlightBlue, 1.35);
  moonDirLight.name = 'NamXuong_Moonlight_DirectionalLight';
  moonDirLight.position.set(2.0, 14.0, -8.5);
  moonDirLight.target.position.set(0, 0, -6.8);
  moonDirLight.castShadow = false;
  moonDirLight.userData = {
    isNamXuongMoonLight: true,
    baseIntensity: 1.35,
    ignoreRaycaster: true
  };
  moonDirLight.target.userData = {
    isNamXuongMoonLight: true,
    isLightTarget: true,
    ignoreRaycaster: true
  };
  interiorGroup.add(moonDirLight);
  interiorGroup.add(moonDirLight.target);

  // =========================================================================
  // 6. HIỆU ỨNG HẠT LÂN TINH #00ffcc & BỤI VÀNG (THREE.Points CUSTOM SHADER)
  // =========================================================================
  const wispCount = 380;
  const rngWisp = createSeededRandom(2040);
  const wispPositions = new Float32Array(wispCount * 3);
  const wispPhases = new Float32Array(wispCount);
  const wispSpeeds = new Float32Array(wispCount);
  const wispSizes = new Float32Array(wispCount);
  const wispMix = new Float32Array(wispCount);

  for (let i = 0; i < wispCount; i++) {
    const i3 = i * 3;
    const isNearAltar = i < 130;
    const wx = isNearAltar
      ? (rngWisp() - 0.5) * 6.5
      : (rngWisp() - 0.5) * (ROOM_W - 2.4);
    const wz = isNearAltar
      ? -6.8 + (rngWisp() - 0.5) * 6.2
      : -0.4 - rngWisp() * 12.6;

    wispPositions[i3] = wx;
    wispPositions[i3 + 1] = 0.05;
    wispPositions[i3 + 2] = wz;

    wispPhases[i] = rngWisp();
    wispSpeeds[i] = 0.08 + rngWisp() * 0.11;
    wispSizes[i] = isNearAltar ? (0.45 + rngWisp() * 0.45) : (0.30 + rngWisp() * 0.40);
    wispMix[i] = (i % 5 === 0) ? 0.85 : rngWisp() * 0.25; // Đa số #00ffcc, điểm xuyết bụi vàng
  }

  const wispGeo = new THREE.BufferGeometry();
  wispGeo.setAttribute('position', new THREE.BufferAttribute(wispPositions, 3));
  wispGeo.setAttribute('aPhase', new THREE.BufferAttribute(wispPhases, 1));
  wispGeo.setAttribute('aSpeed', new THREE.BufferAttribute(wispSpeeds, 1));
  wispGeo.setAttribute('aSize', new THREE.BufferAttribute(wispSizes, 1));
  wispGeo.setAttribute('aMix', new THREE.BufferAttribute(wispMix, 1));
  wispGeo.computeBoundingSphere();

  const wispMat = createPhosphorescentPointsMaterial();
  const wispPoints = new THREE.Points(wispGeo, wispMat);
  wispPoints.name = 'NamXuong_Phosphorescent_Wisps';
  wispPoints.frustumCulled = true;
  wispPoints.userData.ignoreRaycaster = true;
  wispPoints.raycast = () => {};
  interiorGroup.add(wispPoints);

  // =========================================================================
  // 7. BẢNG THÔNG TIN DI SẢN LỤA TRẮNG / GIẤY DÓ (KHÔNG CHẮN LUỒNG BÓNG ĐÈN)
  // =========================================================================
  const plaquePos = new THREE.Vector3(-3.9, 0.08, 4.9);
  const plaqueRotY = 0.44;
  const namXuongPlaque = createRoomInfoPlaque({
    roomId: 'nguoi_con_gai_nam_xuong',
    plaqueId: 'plaque_nguoi_con_gai_nam_xuong',
    loreKey: 'plaque_nguoi_con_gai_nam_xuong',
    styleTheme: 'giay_do',
    badgeLabel: 'LỤA TRẮNG • GIẤY DÓ',
    sectorCode: 'PHÒNG 204 • VĂN HỌC TRUNG ĐẠI',
    title: 'CHUYỆN NGƯỜI CON GÁI NAM XƯƠNG',
    author: 'Nguyễn Dữ (Thế kỷ XVI)',
    years: 'Thế kỷ XVI',
    historicalPeriod: 'Văn học Trung đại Việt Nam',
    subtitle: 'Nguyễn Dữ (Thế kỷ XVI) – Trích kiệt tác "Truyền Kỳ Mạn Lục"',
    summary:
      'Tác phẩm khắc họa vẻ đẹp thủy chung, đức hạnh của nàng Vũ Nương và bi kịch oan khuất từ "chiếc bóng" trên vách nứa. Qua chi tiết kỳ ảo chốn thủy cung và Đàn Giải Oan trên bến Hoàng Giang, Nguyễn Dữ cất lên tiếng nói nhân đạo sâu sắc thương cảm số phận người phụ nữ trong xã hội phong kiến.',
    mountMode: 'pedestal',
    includeSpotLight: true,
    position: plaquePos,
    rotationY: plaqueRotY,
    parent: interiorGroup
  });
  if (namXuongPlaque) {
    namXuongPlaque.name = 'NamXuong_InfoPlaque_3D';
    namXuongPlaque.userData.roomId = 'nguoi_con_gai_nam_xuong';
    if (namXuongPlaque.userData?.plaqueProxy) {
      namXuongPlaque.userData.plaqueProxy.userData.plaqueKey = 'plaque_nguoi_con_gai_nam_xuong';
    }
    syncPlaqueWorldMetadata(namXuongPlaque);

    const plaqueCollider = new THREE.Mesh(
      prepGeo(new THREE.BoxGeometry(1.48, 2.0, 0.70)),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    plaqueCollider.name = 'NamXuong_InfoPlaque_Collider';
    plaqueCollider.position.set(plaquePos.x, plaquePos.y + 1.0, plaquePos.z);
    plaqueCollider.rotation.y = plaqueRotY;
    plaqueCollider.userData.ignoreRaycaster = true;
    interiorGroup.add(plaqueCollider);
    solidObstacleObjects.push(plaqueCollider);
  }

  // =========================================================================
  // CỔNG DỊCH CHUYỂN CÕI THẾ GIỚI MỞ "CHUYỆN NGƯỜI CON GÁI NAM XƯƠNG" (STORY REALM)
  // Vị trí góc phải lối vào (5.4, 0.08, 9.2), rotY = -0.52 (không che bảng hay bến sông)
  // =========================================================================
  const portalLocalPos = new THREE.Vector3(5.4, 0.08, 9.2);
  const portalLocalRotY = -0.52;
  const storyRealm = createNamXuongStoryRealm({
    scene: mainScene,
    mainScene,
    realmScene,
    interiorGroup,
    roomGroup,
    cameraManager,
    renderer,
    portalLocalPos,
    portalLocalRotY
  });
  if (storyRealm?.portalGroup && storyRealm.portalGroup.parent !== interiorGroup) {
    interiorGroup.add(storyRealm.portalGroup);
  }

  const portalColliders = [];
  if (storyRealm?.portalGroup) {
    [-1.68, 1.68].forEach((px, idx) => {
      const pierCol = new THREE.Mesh(
        prepGeo(new THREE.BoxGeometry(0.95, 3.6, 0.95)),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      pierCol.name = `NamXuong_StoryPortal_PierCollider_${idx}`;
      pierCol.position.set(px, 1.8, 0);
      pierCol.userData.ignoreRaycaster = true;
      storyRealm.portalGroup.add(pierCol);
      portalColliders.push(pierCol);
      solidObstacleObjects.push(pierCol);
    });
  }

  // =========================================================================
  // 8. NẠP MÔ HÌNH VŨ NƯƠNG (.GLB) & ĐĂNG KÝ HITBOX + LORE + AUDIO + AUTO-TOUR
  // =========================================================================
  const wiredManagers = {
    scene: mainScene,
    realmScene,
    camera: null,
    renderer: renderer || null,
    hitboxManager: null,
    loreGuide: null,
    spatialAudio: null,
    audioManager: null,
    cameraManager: cameraManager || null,
    xrTeleport: null,
    autoTour: null
  };

  function localToWorldVec(lx, ly, lz) {
    interiorGroup.updateMatrixWorld(true);
    return interiorGroup.localToWorld(new THREE.Vector3(lx, ly, lz));
  }

  function bindExhibitProxy(targetObj, { loreKey, localFocusCam, localFocusLook, padding = 0.24, minSize = 0.85 }) {
    const hbm = wiredManagers.hitboxManager || (typeof window !== 'undefined' ? window.__museumHitboxManager : null);
    const loreTarget = wiredManagers.loreGuide || (typeof window !== 'undefined' ? window.__loreGuide : null);

    const onFocusCamera = () => {
      const camMgr = wiredManagers.cameraManager || (typeof window !== 'undefined' ? window.__museumCameraManager : null);
      const posW = localToWorldVec(...localFocusCam);
      const tgtW = localToWorldVec(...localFocusLook);
      if (typeof camMgr?.smoothZoomToFocus === 'function') {
        camMgr.smoothZoomToFocus(posW, tgtW, { duration: 0.72 });
      } else if (typeof camMgr?.setView === 'function') {
        camMgr.setView({ position: posW, target: tgtW }, true);
      }
    };

    targetObj.userData.onFocusCamera = onFocusCamera;

    if (loreTarget?.registerArtifact) {
      loreTarget.registerArtifact(targetObj, loreKey);
    }

    if (hbm?.createTightClickHitbox) {
      const prevProxy = targetObj.userData?.clickProxyHitbox;
      if (prevProxy && loreTarget?.interactiveArtifacts) {
        const prevIdx = loreTarget.interactiveArtifacts.indexOf(prevProxy);
        if (prevIdx !== -1) loreTarget.interactiveArtifacts.splice(prevIdx, 1);
      }
      const proxy = hbm.createTightClickHitbox(targetObj, {
        loreKey,
        roomId: 'nguoi_con_gai_nam_xuong',
        styleTheme: 'giay_do',
        padding,
        minSize,
        onFocusCamera,
        realm: 'museum'
      });
      if (proxy) {
        proxy.userData.onFocusCamera = onFocusCamera;
      }
    }
  }

  function bindInteractiveExhibits() {
    roomGroup.updateMatrixWorld(true);
    bindExhibitProxy(vuNuongHolder, {
      loreKey: 'nam_xuong_vu_nuong',
      localFocusCam: [2.6, 1.85, 5.9],
      localFocusLook: [-0.8, 1.45, 2.2],
      padding: 0.28,
      minSize: 1.05
    });
    bindExhibitProxy(hairpinHolder, {
      loreKey: 'nam_xuong_tram_vang',
      localFocusCam: [1.65, 2.1, -4.1],
      localFocusLook: [0.0, 1.85, -6.8],
      padding: 0.34,
      minSize: 0.95
    });
  }

  let vuNuongGlbLoaded = false;
  let disposed = false;

  loadGlbCached(['/models/nguoicogainamxuong.glb', '/model/nguoicogainamxuong.glb'], {
    maxTextureSize: 1024,
    disableMipmaps: true
  })
    .then((rawScene) => {
      if (!rawScene || disposed) return;
      vuNuongGlbLoaded = true;
      vuNuongHolder.remove(vuNuongPlaceholder);
      vuNuongPlaceholder.geometry.dispose();
      vuNuongPlaceholder.material.dispose();

      normalizeModelToHeight(rawScene, 2.38);
      rawScene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          child.frustumCulled = true;
          child.userData.preserveShadow = true;
          child.userData.isSharedCachedAsset = true;
        }
      });
      vuNuongHolder.add(rawScene);

      if (wiredManagers.hitboxManager || wiredManagers.loreGuide) {
        bindExhibitProxy(vuNuongHolder, {
          loreKey: 'nam_xuong_vu_nuong',
          localFocusCam: [2.6, 1.85, 5.9],
          localFocusLook: [-0.8, 1.45, 2.2],
          padding: 0.28,
          minSize: 1.05
        });
      }
    })
    .catch((err) => {
      console.warn('[NamXuongRoom] Không thể tải nguoicogainamxuong.glb:', err?.message || err);
    });

  // =========================================================================
  // 9. HAI NGUỒN THREE.POSITIONALAUDIO (PROCEDURAL WEB AUDIO BUFFER)
  // =========================================================================
  const cottageAudioAnchor = new THREE.Object3D();
  cottageAudioAnchor.name = 'NamXuong_Audio_Cottage';
  cottageAudioAnchor.position.set(4.2, 1.6, 5.6);
  cottageAudioAnchor.userData.ignoreRaycaster = true;
  interiorGroup.add(cottageAudioAnchor);

  const riverAudioAnchor = new THREE.Object3D();
  riverAudioAnchor.name = 'NamXuong_Audio_River';
  riverAudioAnchor.position.set(0.0, 0.55, -5.0);
  riverAudioAnchor.userData.ignoreRaycaster = true;
  interiorGroup.add(riverAudioAnchor);

  const positionalAudioNodes = [];
  let audioUnlockBound = false;

  function setupProceduralPositionalAudio() {
    const spatial = wiredManagers.spatialAudio || (typeof window !== 'undefined' ? window.__spatialAudio : null);
    const listener = spatial?.listener;
    if (!listener || positionalAudioNodes.length > 0) return;

    const specs = [
      { anchor: cottageAudioAnchor, kind: 'cottage', refDist: 4.5, maxDist: 22.0, vol: 0.42 },
      { anchor: riverAudioAnchor, kind: 'river', refDist: 5.0, maxDist: 24.0, vol: 0.48 }
    ];

    specs.forEach((spec) => {
      const posAudio = new THREE.PositionalAudio(listener);
      posAudio.setRefDistance(spec.refDist);
      posAudio.setMaxDistance(spec.maxDist);
      posAudio.setRolloffFactor(1.45);
      posAudio.setVolume(spec.vol);
      spec.anchor.add(posAudio);
      positionalAudioNodes.push({ posAudio, kind: spec.kind, ready: false });
    });

    const startAudioIfUnlocked = () => {
      const ctx = listener.context;
      if (!ctx) return;
      const activate = () => {
        if (disposed) return;
        positionalAudioNodes.forEach((entry) => {
          if (!entry.ready) {
            const buf = createNamXuongAudioBuffer(ctx, entry.kind);
            if (buf) {
              entry.posAudio.setBuffer(buf);
              entry.posAudio.setLoop(true);
              entry.ready = true;
            }
          }
          if (entry.ready && !entry.posAudio.isPlaying) {
            try {
              entry.posAudio.play();
            } catch (_) {}
          }
        });
      };
      if (ctx.state === 'suspended') {
        ctx.resume().then(activate).catch(() => {});
      } else {
        activate();
      }
    };

    if (listener.context?.state === 'running' || spatial?.isUnlocked) {
      startAudioIfUnlocked();
    } else if (typeof window !== 'undefined' && !audioUnlockBound) {
      audioUnlockBound = true;
      const onInteract = () => {
        startAudioIfUnlocked();
        window.removeEventListener('pointerdown', onInteract);
        window.removeEventListener('keydown', onInteract);
        window.removeEventListener('click', onInteract);
      };
      window.addEventListener('pointerdown', onInteract, { once: true, passive: true });
      window.addEventListener('keydown', onInteract, { once: true, passive: true });
      window.addEventListener('click', onInteract, { once: true, passive: true });
    }
  }

  // =========================================================================
  // 10. ĐĂNG KÝ HITBOX, LORE, WEBXR WALKABLE FLOORS & AUTO-TOUR PHÒNG 204
  // =========================================================================
  function registerHitboxes(hitboxManager) {
    const hbm = hitboxManager || (typeof window !== 'undefined' ? window.__museumHitboxManager : null);
    if (!hbm) return;
    wiredManagers.hitboxManager = hbm;

    roomGroup.updateMatrixWorld(true);

    solidObstacleObjects.forEach((obj, idx) => {
      hbm.registerSolidObjectCollider(obj, {
        shrinkFactor: 0.96,
        tag: `NamXuong_Solid_${idx}`,
        helperColor: 0x38bdf8,
        realm: 'museum'
      });
    });

    bindInteractiveExhibits();

    if (namXuongPlaque) {
      registerPlaqueWithSystems(namXuongPlaque, {
        hitboxManager: hbm,
        loreGuide: wiredManagers.loreGuide || (typeof window !== 'undefined' ? window.__loreGuide : null),
        realm: 'museum',
        onFocusCamera: () => {
          const camMgr = wiredManagers.cameraManager || (typeof window !== 'undefined' ? window.__museumCameraManager : null);
          if (!camMgr) return;
          if (typeof camMgr.smoothZoomToFocus === 'function') {
            camMgr.smoothZoomToFocus(namXuongPlaque, { distance: 2.25 });
          } else if (typeof camMgr.setView === 'function') {
            const meta = syncPlaqueWorldMetadata(namXuongPlaque);
            if (!meta) return;
            const target = meta.focusPoint.clone();
            const position = target.clone().addScaledVector(meta.focusNormal, 2.25);
            position.y = Math.max(target.y - 0.04, position.y);
            camMgr.setView({ position, target }, true);
          }
        }
      });
    }

    storyRealm?.setupContext?.({ hitboxManager: hbm });
    storyRealm?.syncMuseumPortalHitboxes?.();
  }

  // Room-specific 3-beat Auto-Tour controller
  const roomTourState = {
    active: false,
    beatIndex: 0,
    phase: 'idle',
    phaseStartMs: 0,
    flightMs: 3600,
    startPos: new THREE.Vector3(),
    startQuat: new THREE.Quaternion(),
    targetPos: new THREE.Vector3(),
    targetQuat: new THREE.Quaternion(),
    waypoints: []
  };

  function beginRoomTourBeat(idx) {
    if (!roomTourState.waypoints.length) {
      roomTourState.waypoints = getNamXuongTourWaypoints(pose);
    }
    const cam = wiredManagers.camera || wiredManagers.cameraManager?.camera;
    if (!cam) return;
    roomTourState.beatIndex = idx % roomTourState.waypoints.length;
    const wp = roomTourState.waypoints[roomTourState.beatIndex];
    roomTourState.phase = 'flying';
    roomTourState.phaseStartMs = performance.now();
    roomTourState.startPos.copy(cam.position);
    roomTourState.startQuat.copy(cam.quaternion);
    roomTourState.targetPos.copy(wp.cameraPos);

    const tmp = cam.clone();
    tmp.position.copy(wp.cameraPos);
    tmp.lookAt(wp.lookAtPos);
    roomTourState.targetQuat.copy(tmp.quaternion);
  }

  function startRoomAutoTour() {
    if (wiredManagers.autoTour?.startRoomTour) {
      const handled = wiredManagers.autoTour.startRoomTour('nguoi_con_gai_nam_xuong');
      if (handled) return true;
    }
    roomTourState.waypoints = getNamXuongTourWaypoints(pose);
    roomTourState.active = true;
    beginRoomTourBeat(0);
    return true;
  }

  function stopRoomAutoTour() {
    roomTourState.active = false;
    roomTourState.phase = 'idle';
    const loreTarget = wiredManagers.loreGuide || (typeof window !== 'undefined' ? window.__loreGuide : null);
    loreTarget?.hideLoreCard?.();
    if (wiredManagers.autoTour?.stopTour && wiredManagers.autoTour.isActive) {
      wiredManagers.autoTour.stopTour();
    }
  }

  function updateRoomAutoTour() {
    if (!roomTourState.active || roomTourState.phase === 'idle') return;
    const cam = wiredManagers.camera || wiredManagers.cameraManager?.camera;
    if (!cam) return;
    const wp = roomTourState.waypoints[roomTourState.beatIndex];
    const now = performance.now();

    if (roomTourState.phase === 'flying') {
      const rawT = Math.min((now - roomTourState.phaseStartMs) / roomTourState.flightMs, 1.0);
      const easeT = rawT < 0.5
        ? 4 * rawT * rawT * rawT
        : 1 - Math.pow(-2 * rawT + 2, 3) / 2;

      cam.position.lerpVectors(roomTourState.startPos, roomTourState.targetPos, easeT);
      cam.quaternion.slerpQuaternions(roomTourState.startQuat, roomTourState.targetQuat, easeT);

      if (rawT >= 1.0) {
        roomTourState.phase = 'dwelling';
        roomTourState.phaseStartMs = now;
        const loreTarget = wiredManagers.loreGuide || (typeof window !== 'undefined' ? window.__loreGuide : null);
        if (wp.loreKey && loreTarget?.showLoreCard) {
          loreTarget.showLoreCard(wp.loreKey);
        }
      }
    } else if (roomTourState.phase === 'dwelling') {
      if (now - roomTourState.phaseStartMs >= (wp.dwellTimeMs || 7000)) {
        const loreTarget = wiredManagers.loreGuide || (typeof window !== 'undefined' ? window.__loreGuide : null);
        loreTarget?.hideLoreCard?.();
        if (roomTourState.beatIndex + 1 >= roomTourState.waypoints.length) {
          stopRoomAutoTour();
        } else {
          beginRoomTourBeat(roomTourState.beatIndex + 1);
        }
      }
    }
  }

  // =========================================================================
  // 11. CẬP NHẬT ATMOSPHERE CHIAROSCURO (#1a1a24, FogExp2 0.045) & ANIMATION 60+ FPS
  // =========================================================================
  let atmBlend = 0;
  let capturedOriginals = false;
  const savedBgColor = new THREE.Color(0xdca878);
  const savedFogColor = new THREE.Color(0xdca878);
  let savedFogDensity = 0.00075;
  const savedAtriumLights = [];
  const midnightColor = new THREE.Color(PALETTE.midnightBg);

  function captureAtriumState() {
    if (capturedOriginals || !mainScene) return;
    capturedOriginals = true;

    if (mainScene.background && mainScene.background.isColor) {
      savedBgColor.copy(mainScene.background);
    }
    if (mainScene.fog && mainScene.fog.isFogExp2) {
      savedFogColor.copy(mainScene.fog.color);
      savedFogDensity = mainScene.fog.density;
    }

    mainScene.traverse((obj) => {
      if (!obj.isLight) return;
      if (
        obj.userData?.isNamXuongShadowLight ||
        obj.userData?.isNamXuongMoonLight ||
        obj.userData?.isPlaqueSpotLight ||
        obj.userData?.isPooledLight ||
        obj.name?.startsWith('Pooled_')
      ) {
        return;
      }
      let cur = obj;
      while (cur) {
        if (cur === roomGroup) return;
        cur = cur.parent;
      }
      savedAtriumLights.push({ light: obj, baseIntensity: obj.intensity });
    });
  }

  function isInsideNamXuongRoom(camPos) {
    if (!camPos) return false;
    const dx = camPos.x - resolvedCenter.x;
    const dz = camPos.z - resolvedCenter.z;
    const cosY = Math.cos(interiorGroup.rotation.y);
    const sinY = Math.sin(interiorGroup.rotation.y);
    const lx = dx * cosY - dz * sinY;
    const lz = dx * sinY + dz * cosY;
    return (
      Math.abs(lx) <= ROOM_W * 0.5 + 0.9 &&
      Math.abs(lz) <= ROOM_D * 0.5 + 0.8 &&
      camPos.y >= resolvedCenter.y - 0.8 &&
      camPos.y <= resolvedCenter.y + ROOM_H + 1.4
    );
  }

  function updateAtmosphere(delta = 0.016, camera = null) {
    const sceneRef = wiredManagers.scene || mainScene;
    if (!sceneRef || !camera?.position) return;

    const inside = isInsideNamXuongRoom(camera.position);
    if (inside && !capturedOriginals) {
      captureAtriumState();
    }

    const target = inside ? 1 : 0;
    const step = Math.min(1, Math.max(0.04, delta * 3.5));
    const prevBlend = atmBlend;
    atmBlend += (target - atmBlend) * step;

    if (Math.abs(atmBlend - prevBlend) > 0.0005 || inside) {
      if (!sceneRef.background || !sceneRef.background.isColor) {
        sceneRef.background = savedBgColor.clone();
      }
      sceneRef.background.copy(savedBgColor).lerp(midnightColor, atmBlend);

      if (!sceneRef.fog || !sceneRef.fog.isFogExp2) {
        sceneRef.fog = new THREE.FogExp2(savedFogColor.getHex(), savedFogDensity);
      }
      sceneRef.fog.color.copy(savedFogColor).lerp(midnightColor, atmBlend);
      sceneRef.fog.density = savedFogDensity + (0.045 - savedFogDensity) * atmBlend;

      // Giảm tối đa đèn đại sảnh & ambient để tạo tương phản Chiaroscuro sắc nét
      const lightScale = 1.0 - atmBlend * 0.88;
      for (let i = 0; i < savedAtriumLights.length; i++) {
        const entry = savedAtriumLights[i];
        entry.light.intensity = entry.baseIntensity * lightScale;
      }

      // Đồng bộ uniform sương mù cho shader mặt sông Hoàng Giang
      waterMat.uniforms.uFogColor.value.copy(sceneRef.fog.color);
      waterMat.uniforms.uFogDensity.value = sceneRef.fog.density;
    } else if (!inside && prevBlend > 0 && atmBlend <= 0.001) {
      atmBlend = 0;
      if (sceneRef.background?.isColor) {
        sceneRef.background.copy(savedBgColor);
      }
      if (sceneRef.fog?.isFogExp2) {
        sceneRef.fog.color.copy(savedFogColor);
        sceneRef.fog.density = savedFogDensity;
      }
      for (let i = 0; i < savedAtriumLights.length; i++) {
        const entry = savedAtriumLights[i];
        entry.light.intensity = entry.baseIntensity;
      }
    }
  }

  const ROOM_PROXIMITY_SQ = 40 * 40;

  function update(delta = 0.016, elapsedTime = 0, camera = null) {
    if (!roomGroup.visible || disposed) return;
    const dt = Math.min(delta, 0.05);

    if (storyRealm?.isInsideRealm?.()) {
      return;
    }

    storyRealm?.updateMuseumPortal?.(dt, elapsedTime, camera);
    updateRoomAutoTour();

    let nearOrInside = true;
    let distSq = 0;
    if (camera?.position) {
      const inside = isInsideNamXuongRoom(camera.position);
      distSq = camera.position.distanceToSquared(roomGroup.position);
      nearOrInside = inside || (Math.abs(camera.position.y - resolvedCenter.y) <= 6.5 && distSq <= 28 * 28);
      if (!inside && distSq > ROOM_PROXIMITY_SQ) {
        if (atmBlend > 0) {
          updateAtmosphere(dt, camera);
        }
        shadowSpotLight.intensity = 0;
        moonDirLight.intensity = 0;
        return;
      }
    }

    // 1. Ngọn lửa đèn dầu & ánh sáng Chiaroscuro rung động theo gió đêm
    if (nearOrInside) {
      if (!wattlePanel.receiveShadow) wattlePanel.receiveShadow = true;
      if (!cottageFloor.receiveShadow) cottageFloor.receiveShadow = true;
      if (!shadowSpotLight.castShadow) shadowSpotLight.castShadow = true;
      if (vuNuongGlbLoaded) {
        vuNuongHolder.traverse((c) => {
          if (c.isMesh && !c.userData?.ignoreRaycaster && (!c.castShadow || !c.receiveShadow)) {
            c.castShadow = true;
            c.receiveShadow = true;
          }
        });
      }
    }

    const windPrimary = Math.sin(elapsedTime * 6.8) * 0.14;
    const windHarmonic = Math.sin(elapsedTime * 15.3 + 0.9) * 0.09 + Math.cos(elapsedTime * 23.7) * 0.05;
    const flicker = 1.0 + windPrimary + windHarmonic;

    const spotGate = nearOrInside ? 1.0 : Math.max(0, 1.0 - (Math.sqrt(distSq) - 24) / 8);
    shadowSpotLight.intensity = shadowSpotLight.userData.baseIntensity * flicker * spotGate;
    shadowSpotLight.position.set(
      shadowSpotBasePos.x + Math.sin(elapsedTime * 8.5) * 0.028 + Math.cos(elapsedTime * 19.0) * 0.012,
      shadowSpotBasePos.y + Math.sin(elapsedTime * 13.0) * 0.018,
      shadowSpotBasePos.z + Math.cos(elapsedTime * 7.8) * 0.028
    );

    oilLampWarmPoint.intensity = 5.2 * flicker * spotGate;
    moonDirLight.intensity = moonDirLight.userData.baseIntensity * (0.25 + 0.75 * Math.max(atmBlend, spotGate));

    flameOuter.scale.set(
      1.0 + Math.sin(elapsedTime * 18.0) * 0.08,
      Math.max(0.68, 1.0 + windPrimary * 1.4 + windHarmonic * 1.2),
      1.0 + Math.cos(elapsedTime * 16.0) * 0.08
    );
    flameOuter.rotation.z = Math.sin(elapsedTime * 9.5) * 0.12;
    flameCore.scale.copy(flameOuter.scale);
    flameGlowSprite.material.opacity = 0.62 + flicker * 0.14;

    // 2. Đèn lồng Cổng Trăng Khuyết đung đưa nhẹ
    for (let i = 0; i < hangingLanterns.length; i++) {
      const lan = hangingLanterns[i];
      lan.pivot.rotation.z = Math.sin(elapsedTime * 1.45 + lan.phase) * 0.055;
      lan.pivot.rotation.x = Math.cos(elapsedTime * 1.15 + lan.phase) * 0.035;
    }

    // 3. Shader Sông Hoàng Giang, Thủy Cung ẩn hiện & hạt lân tinh #00ffcc (GPU animated)
    waterMat.uniforms.uTime.value = elapsedTime;
    wispMat.uniforms.uTime.value = elapsedTime;

    for (let i = 0; i < thuyCung.banners.length; i++) {
      const b = thuyCung.banners[i];
      b.mesh.rotation.y = b.baseRotY + Math.sin(elapsedTime * 0.9 + b.phase) * 0.07;
    }

    // 4. Chiếc Trâm Vàng bay lơ lửng & xoay chậm trên Đàn Giải Oan
    hairpinHolder.position.y = 1.95 + Math.sin(elapsedTime * 1.65) * 0.095;
    hairpinHolder.rotation.y += dt * 0.62;
    hairpinRig.halo.material.opacity = 0.44 + Math.sin(elapsedTime * 2.3) * 0.10;

    // 5. Cập nhật hiệu ứng sương mù & bầu trời đêm #1a1a24
    updateAtmosphere(dt, camera);
  }

  function setupContext(ctx = {}) {
    if (ctx.scene || ctx.mainScene) wiredManagers.scene = ctx.mainScene || ctx.scene;
    if (ctx.realmScene) wiredManagers.realmScene = ctx.realmScene;
    if (ctx.camera) wiredManagers.camera = ctx.camera;
    if (ctx.renderer) wiredManagers.renderer = ctx.renderer;
    if (ctx.cameraManager) wiredManagers.cameraManager = ctx.cameraManager;
    if (ctx.hitboxManager) wiredManagers.hitboxManager = ctx.hitboxManager;
    if (ctx.loreGuide) wiredManagers.loreGuide = ctx.loreGuide;
    if (ctx.spatialAudio) wiredManagers.spatialAudio = ctx.spatialAudio;
    if (ctx.audioManager) wiredManagers.audioManager = ctx.audioManager;
    if (ctx.xrTeleport) wiredManagers.xrTeleport = ctx.xrTeleport;
    if (ctx.autoTour) wiredManagers.autoTour = ctx.autoTour;

    // Bảo toàn bóng đổ cho Vũ Nương & vách nứa nếu renderer bật shadowMap
    if (wiredManagers.renderer?.shadowMap) {
      wiredManagers.renderer.shadowMap.enabled = true;
    }
    wattlePanel.receiveShadow = true;
    if (vuNuongGlbLoaded) {
      vuNuongHolder.traverse((c) => {
        if (c.isMesh && !c.userData?.ignoreRaycaster) {
          c.castShadow = true;
          c.receiveShadow = true;
        }
      });
    }

    storyRealm?.setupContext?.(ctx);
    registerHitboxes(wiredManagers.hitboxManager);
    storyRealm?.syncMuseumPortalHitboxes?.();
    setupProceduralPositionalAudio();
  }

  function dispose() {
    disposed = true;
    stopRoomAutoTour();
    storyRealm?.dispose?.();

    const sceneRef = wiredManagers.scene || mainScene;
    if (capturedOriginals && sceneRef) {
      if (sceneRef.background?.isColor) sceneRef.background.copy(savedBgColor);
      if (sceneRef.fog?.isFogExp2) {
        sceneRef.fog.color.copy(savedFogColor);
        sceneRef.fog.density = savedFogDensity;
      }
      savedAtriumLights.forEach((e) => {
        e.light.intensity = e.baseIntensity;
      });
    }

    positionalAudioNodes.forEach((entry) => {
      try {
        if (entry.posAudio.isPlaying) entry.posAudio.stop();
        entry.posAudio.disconnect();
      } catch (_) {}
    });
    positionalAudioNodes.length = 0;

    const matSet = new Set();
    roomGroup.traverse((obj) => {
      if (obj.userData?.isSharedCachedAsset || obj.userData?.isPlaqueProxy) return;
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => matSet.add(m));
      }
    });
    matSet.forEach((m) => m.dispose());
    disposables.forEach((tex) => tex.dispose?.());
  }

  // Expose standard API on both roomGroup and roomGroup.userData
  roomGroup.setupContext = setupContext;
  roomGroup.registerHitboxes = registerHitboxes;
  roomGroup.wireInteractiveSystems = setupContext;
  roomGroup.update = update;
  roomGroup.updateAtmosphere = updateAtmosphere;
  roomGroup.startRoomAutoTour = startRoomAutoTour;
  roomGroup.stopRoomAutoTour = stopRoomAutoTour;
  roomGroup.enterRealm = storyRealm.enterRealm;
  roomGroup.exitRealm = storyRealm.exitRealm;
  roomGroup.isInsideRealm = storyRealm.isInsideRealm;
  roomGroup.updateRealm = storyRealm.updateRealm;
  roomGroup.startFullAutoTour = storyRealm.startFullAutoTour;
  roomGroup.startRealmOnlyTour = storyRealm.startRealmOnlyTour;
  roomGroup.stopAutoTour = storyRealm.stopAutoTour;
  roomGroup.teleportBook = storyRealm.portalClickProxy;
  roomGroup.realmPortalGroup = storyRealm.portalGroup;
  roomGroup.storyRealm = storyRealm;
  roomGroup.dispose = dispose;

  roomGroup.userData = {
    roomId: 'nguoi_con_gai_nam_xuong',
    interiorGroup,
    walkableFloors,
    plaque: namXuongPlaque,
    shadowLight: shadowSpotLight,
    moonLight: moonDirLight,
    loreKeys: ['plaque_nguoi_con_gai_nam_xuong', 'nam_xuong_vu_nuong', 'nam_xuong_tram_vang'],
    portalColliders,
    storyRealm,
    update,
    updateAtmosphere,
    registerHitboxes,
    wireInteractiveSystems: setupContext,
    setupContext,
    startRoomAutoTour,
    stopRoomAutoTour,
    enterRealm: storyRealm.enterRealm,
    exitRealm: storyRealm.exitRealm,
    isInsideRealm: storyRealm.isInsideRealm,
    updateRealm: storyRealm.updateRealm,
    startFullAutoTour: storyRealm.startFullAutoTour,
    startRealmOnlyTour: storyRealm.startRealmOnlyTour,
    stopAutoTour: storyRealm.stopAutoTour,
    teleportBook: storyRealm.portalClickProxy,
    realmPortalGroup: storyRealm.portalGroup,
    dispose
  };

  return roomGroup;
}

export default buildNamXuongExhibition;
