import * as THREE from 'three';
import { getRoomWorldPose, localRoomToWorld } from '../config/literatureRegistry.js';
import { loadGlbCached, sanitizeGeometryBuffers } from '../utils/modelLoaderHelper.js';
import { createLyCloudAndWaveRelief3D } from './museumReliefSculptor.js';
import { createDayThonViDaStoryRealm } from './dayThonViDaStoryRealm.js';
import {
  createRoomInfoPlaque,
  registerPlaqueWithSystems,
  syncPlaqueWorldMetadata
} from './roomInfoPlaque.js';

/**
 * ============================================================================
 * PHÒNG TRƯNG BÀY "ĐÂY THÔN VĨ DẠ" – HÀN MẶC TỬ (PHÒNG 302 • TẦNG 3 TÂY-BẮC)
 * Kích thước: 25.6m x 27.6m x 10.0m • Pose: getRoomWorldPose('day_thon_vi_da')
 *
 * Quy hoạch 3 Khổ Thơ — Chuyển Tiếp Không Gian Kép (Ban Mai Vĩ Dạ -> Sông Trăng -> Sương Khói):
 * - Cổng Vòm Khóm Trúc Xứ Huế (+Z): Trụ gạch rêu cổ + vòm tre xanh + tán lá trúc rủ nhẹ
 *   ("Lá trúc che ngang mặt chữ điền"), mở thông lối vào 6.2m.
 * - Zone 1 (+Z): Vườn Vĩ Dạ Ban Mai & Nắng Hàng Cau
 *   + Lối lát gạch Bát Tràng cổ & thảm cỏ xanh mướt (walkable / WebXR teleport)
 *   + InstancedMesh Hàng Cau cao vút & Khóm Trúc xanh rì rào trong gió sớm
 *   + DirectionalLight nắng mai #ffe89e (castShadow 1024x1024, isViDaMorningLight & isViDaShadowLight)
 *     + Volumetric God Rays xiên chéo + vệt nắng loang động trên nền vườn
 *   + Trung tâm giao thoa: mô hình caithonvida.glb chuẩn hóa theo Box3, tinh chỉnh PBR ngọc bích
 *     ("Vườn ai mướt quá xanh như ngọc")
 * - Zone 2 (Center): Bến Sông Trăng & Hoa Bắp Lay
 *   + Bờ đá rêu, bến gỗ & cầu gỗ bắc qua sông trăng (walkable + hàng rào an toàn)
 *   + Sông Trăng (Sông Hương) Custom GLSL Water Shader gợn sóng êm đềm ("Dòng nước buồn thiu")
 *     cùng dải phản chiếu ánh trăng vàng/bạc ("Thuyền ai đậu bến sông trăng đó")
 *   + Chiếc Thuyền Nan Cổ neo đậu chở đầy hạt bụi trăng vàng lấp lánh
 *   + InstancedMesh Hoa Bắp / Lau Sậy ven bờ đung đưa theo Math.sin(uTime) trong Vertex Shader
 * - Zone 3 (-Z): Cõi Mộng Sương Khói & Ảo Ảnh Áo Trắng
 *   + Chuyển sắc bầu trời đêm #0f172a + ánh trăng #fef08a & #bae6fd (isViDaMoonLight)
 *   + Vầng Trăng Khổng Lồ phát sáng + quầng hào quang trên nền trời hậu cảnh
 *   + Sương mù FogExp2 + hạt sương trôi (THREE.Points) & màn sương billboard đa lớp
 *   + Bóng Hình Thiếu Nữ Áo Dài Trắng với Custom Fresnel & Distance-Fade Shader:
 *     sáng trắng tinh khôi từ xa, khi camera tiến vào < 4.0m thì mờ dần về 0 đồng thời
 *     tan ra thành hàng trăm hạt bụi sáng trắng bay lên ("Áo em trắng quá nhìn không ra")
 * - Bảng Thông Tin Ngọc Bích – Trúc – Gỗ Mun + 2 nguồn THREE.PositionalAudio + Auto-Tour 4 chặng
 * ============================================================================
 */

const ROOM_W = 25.6;
const ROOM_D = 27.6;
const ROOM_H = 10.0;
const ARCH_H = 5.1;
const DOOR_W = 6.2;

const PALETTE = {
  morningSky: 0xbfe0d4,
  morningFog: 0xcbe5d3,
  morningSun: 0xffe89e,
  twilightNight: 0x0f172a,
  moonGold: 0xfef08a,
  moonSilverBlue: 0xbae6fd,
  jadeEmerald: 0x10b981,
  jadeDeep: 0x065f46,
  bambooGreen: 0x3b7a44,
  bambooCulm: 0x5c8d4a,
  terracotta: 0x9c4d36,
  mossBrick: 0x714738,
  ebonyWood: 0x1e1512,
  agedTimber: 0x4b3324,
  ivorySpot: 0xfff6e0
};

export const DAY_THON_VI_DA_TOUR_BEATS = [
  {
    id: 'vida_bamboo_gate',
    title: 'Chặng 1/4: Cổng Vòm Khóm Trúc & Bảng Ngọc Vĩ Dạ',
    narration: 'Bước qua cổng gạch rêu phong dưới tán lá trúc che ngang mặt chữ điền để về thăm thôn Vĩ ban mai.',
    localCam: [0.0, 1.9, 13.0],
    localLook: [-0.8, 1.55, 6.2],
    dwellTimeMs: 7000,
    loreKey: 'plaque_day_thon_vi_da'
  },
  {
    id: 'vida_sunlit_garden',
    title: 'Chặng 2/4: Nắng Hàng Cau & Vườn Vĩ Dạ Xanh Như Ngọc',
    narration: 'Nắng sớm xuyên qua hàng cau cao vút, phủ ánh ngọc bích mướt xanh lên khu vườn thôn Vĩ.',
    localCam: [3.2, 2.0, 7.6],
    localLook: [0.0, 1.55, 3.9],
    dwellTimeMs: 7500,
    loreKey: 'vida_vuon_vi_da'
  },
  {
    id: 'vida_moon_river_boat',
    title: 'Chặng 3/4: Bến Sông Trăng, Hoa Bắp Lay & Thuyền Chở Trăng',
    narration: 'Gió thổi nhẹ qua khóm hoa bắp ven bờ sông Hương, nơi chiếc thuyền nan cổ chở đầy bụi trăng vàng.',
    localCam: [2.2, 2.15, 0.4],
    localLook: [-2.0, 1.05, -2.9],
    dwellTimeMs: 8000,
    loreKey: 'vida_thuyen_trang'
  },
  {
    id: 'vida_mist_ao_dai',
    title: 'Chặng 4/4: Cõi Mộng Sương Khói & Bóng Áo Trắng Hư Ảo',
    narration: 'Dưới vầng trăng khổng lồ giữa đêm sương #0f172a, bóng dáng áo dài trắng tan vào sương khói hư vô.',
    localCam: [0.4, 1.85, -7.2],
    localLook: [0.0, 1.65, -11.2],
    dwellTimeMs: 8500,
    loreKey: 'plaque_day_thon_vi_da'
  }
];

export function getDayThonViDaTourWaypoints(roomPose = null) {
  const pose = roomPose || getRoomWorldPose('day_thon_vi_da');
  return DAY_THON_VI_DA_TOUR_BEATS.map((beat) => {
    const camW = localRoomToWorld(pose, beat.localCam[0], beat.localCam[1], beat.localCam[2]);
    const lookW = localRoomToWorld(pose, beat.localLook[0], beat.localLook[1], beat.localLook[2]);
    return {
      id: beat.id,
      roomId: 'day_thon_vi_da',
      title: beat.title,
      narration: beat.narration,
      cameraPos: new THREE.Vector3(camW.x, camW.y, camW.z),
      lookAtPos: new THREE.Vector3(lookW.x, lookW.y, lookW.z),
      dwellTimeMs: beat.dwellTimeMs,
      loreKey: beat.loreKey
    };
  });
}

export const DAY_THON_VI_DA_TOUR_WAYPOINTS = getDayThonViDaTourWaypoints();

function createSeededRandom(seed = 1938) {
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

function heightCanvasToNormalTexture(heightCanvas, strength = 2.2, repeatX = 1, repeatY = 1, disposables = []) {
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

function createViDaTextures(disposables) {
  const rng = createSeededRandom(1938);
  const sz = 256;

  // 1. Gạch Bát Tràng cổ xen rêu xanh (Terracotta tile garden path)
  const tileC = document.createElement('canvas');
  tileC.width = sz;
  tileC.height = sz;
  const tCtx = tileC.getContext('2d');
  const tileHC = document.createElement('canvas');
  tileHC.width = sz;
  tileHC.height = sz;
  const thCtx = tileHC.getContext('2d');

  tCtx.fillStyle = '#5f3b2c';
  tCtx.fillRect(0, 0, sz, sz);
  thCtx.fillStyle = '#363636';
  thCtx.fillRect(0, 0, sz, sz);

  const grid = 4;
  const cell = sz / grid;
  for (let r = 0; r < grid; r++) {
    for (let c = 0; c < grid; c++) {
      const x = c * cell;
      const y = r * cell;
      const tone = Math.floor((rng() - 0.5) * 22);
      tCtx.fillStyle = `rgb(${164 + tone}, ${86 + Math.floor(tone * 0.6)}, ${61 + Math.floor(tone * 0.4)})`;
      tCtx.fillRect(x + 3, y + 3, cell - 6, cell - 6);

      thCtx.fillStyle = `rgb(${195 + tone}, ${195 + tone}, ${195 + tone})`;
      thCtx.fillRect(x + 3, y + 3, cell - 6, cell - 6);

      // Rêu xanh mịn dọc mạch gạch
      if (rng() > 0.35) {
        tCtx.fillStyle = 'rgba(54, 102, 58, 0.42)';
        tCtx.fillRect(x, y, cell, 3);
        tCtx.fillRect(x, y, 3, cell);
      }
      // Sắc gốm Bát Tràng hơi loang ấm
      for (let d = 0; d < 14; d++) {
        tCtx.fillStyle = rng() > 0.5 ? 'rgba(205, 130, 92, 0.14)' : 'rgba(92, 42, 28, 0.16)';
        tCtx.beginPath();
        tCtx.arc(x + 6 + rng() * (cell - 12), y + 6 + rng() * (cell - 12), 2 + rng() * 5, 0, Math.PI * 2);
        tCtx.fill();
      }
    }
  }

  // 2. Thảm cỏ vườn Vĩ Dạ mướt xanh như ngọc
  const grassC = document.createElement('canvas');
  grassC.width = sz;
  grassC.height = sz;
  const gCtx = grassC.getContext('2d');
  gCtx.fillStyle = '#255c37';
  gCtx.fillRect(0, 0, sz, sz);
  for (let i = 0; i < 1600; i++) {
    const gx = rng() * sz;
    const gy = rng() * sz;
    const bladeH = 4 + rng() * 8;
    const shade = Math.floor(rng() * 35);
    gCtx.strokeStyle = `rgb(${32 + shade}, ${112 + shade}, ${54 + Math.floor(shade * 0.7)})`;
    gCtx.lineWidth = 1.4;
    gCtx.beginPath();
    gCtx.moveTo(gx, gy);
    gCtx.lineTo(gx + (rng() - 0.5) * 4, gy - bladeH);
    gCtx.stroke();
  }

  // 3. Gạch rêu cổ cổng Huế (Mossy antique brick pillars)
  const brickC = document.createElement('canvas');
  brickC.width = sz;
  brickC.height = sz;
  const bCtx = brickC.getContext('2d');
  const brickHC = document.createElement('canvas');
  brickHC.width = sz;
  brickHC.height = sz;
  const bhCtx = brickHC.getContext('2d');

  bCtx.fillStyle = '#4a3d35';
  bCtx.fillRect(0, 0, sz, sz);
  bhCtx.fillStyle = '#3c3c3c';
  bhCtx.fillRect(0, 0, sz, sz);

  const bRows = 8;
  const bh = sz / bRows;
  const bw = sz / 4;
  for (let r = 0; r < bRows; r++) {
    const offset = (r % 2) * (bw * 0.5);
    for (let c = -1; c <= 4; c++) {
      const bx = c * bw + offset;
      const by = r * bh;
      const v = Math.floor((rng() - 0.5) * 28);
      bCtx.fillStyle = `rgb(${128 + v}, ${76 + Math.floor(v * 0.6)}, ${58 + Math.floor(v * 0.5)})`;
      bCtx.fillRect(bx + 2, by + 2, bw - 4, bh - 4);
      bhCtx.fillStyle = `rgb(${180 + v}, ${180 + v}, ${180 + v})`;
      bhCtx.fillRect(bx + 2, by + 2, bw - 4, bh - 4);
      if (rng() > 0.52) {
        bCtx.fillStyle = 'rgba(56, 98, 55, 0.45)';
        bCtx.beginPath();
        bCtx.arc(bx + rng() * bw, by + rng() * bh, 5 + rng() * 8, 0, Math.PI * 2);
        bCtx.fill();
      }
    }
  }

  // 4. Đá phiến rêu bờ sông & lối sương mù Zone 3
  const stoneC = document.createElement('canvas');
  stoneC.width = sz;
  stoneC.height = sz;
  const sCtx = stoneC.getContext('2d');
  sCtx.fillStyle = '#252e38';
  sCtx.fillRect(0, 0, sz, sz);
  for (let i = 0; i < 650; i++) {
    const sx = rng() * sz;
    const sy = rng() * sz;
    sCtx.fillStyle = rng() > 0.5 ? 'rgba(66, 86, 78, 0.35)' : 'rgba(20, 26, 36, 0.42)';
    sCtx.beginPath();
    sCtx.arc(sx, sy, 2 + rng() * 6, 0, Math.PI * 2);
    sCtx.fill();
  }

  // 5. Hậu cảnh chuyển tiếp Ban Mai -> Sông Hương Đêm Trăng (#0f172a)
  const sideBackdropC = document.createElement('canvas');
  sideBackdropC.width = 512;
  sideBackdropC.height = 256;
  const sbCtx = sideBackdropC.getContext('2d');
  const sideGrad = sbCtx.createLinearGradient(0, 0, 512, 0);
  sideGrad.addColorStop(0.0, '#10212b');
  sideGrad.addColorStop(0.42, '#1e3c42');
  sideGrad.addColorStop(0.76, '#7cb297');
  sideGrad.addColorStop(1.0, '#d8ebcd');
  sbCtx.fillStyle = sideGrad;
  sbCtx.fillRect(0, 0, 512, 256);
  // Lớp núi Ngự Bình & bóng cây mờ xa
  sbCtx.fillStyle = 'rgba(15, 28, 38, 0.45)';
  sbCtx.beginPath();
  sbCtx.moveTo(0, 256);
  sbCtx.lineTo(0, 172);
  sbCtx.quadraticCurveTo(110, 118, 230, 165);
  sbCtx.quadraticCurveTo(360, 130, 512, 180);
  sbCtx.lineTo(512, 256);
  sbCtx.closePath();
  sbCtx.fill();

  const rearBackdropC = document.createElement('canvas');
  rearBackdropC.width = 512;
  rearBackdropC.height = 256;
  const rbCtx = rearBackdropC.getContext('2d');
  const rearGrad = rbCtx.createLinearGradient(0, 0, 0, 256);
  rearGrad.addColorStop(0.0, '#090e1c');
  rearGrad.addColorStop(0.55, '#0f172a');
  rearGrad.addColorStop(1.0, '#17253d');
  rbCtx.fillStyle = rearGrad;
  rbCtx.fillRect(0, 0, 512, 256);
  // Sao đêm rất dịu ở tầng trời hậu cảnh
  for (let s = 0; s < 110; s++) {
    const sx = rng() * 512;
    const sy = rng() * 145;
    const alpha = 0.25 + rng() * 0.65;
    rbCtx.fillStyle = `rgba(226, 240, 255, ${alpha.toFixed(2)})`;
    rbCtx.fillRect(sx, sy, 1.5, 1.5);
  }
  rbCtx.fillStyle = '#0b1222';
  rbCtx.beginPath();
  rbCtx.moveTo(0, 256);
  rbCtx.lineTo(0, 185);
  rbCtx.quadraticCurveTo(140, 148, 256, 178);
  rbCtx.quadraticCurveTo(385, 142, 512, 182);
  rbCtx.lineTo(512, 256);
  rbCtx.closePath();
  rbCtx.fill();

  // 6. Texture Mặt Trăng khổng lồ
  const moonC = document.createElement('canvas');
  moonC.width = 256;
  moonC.height = 256;
  const mCtx = moonC.getContext('2d');
  const mGrad = mCtx.createRadialGradient(120, 118, 12, 128, 128, 128);
  mGrad.addColorStop(0.0, '#fffef2');
  mGrad.addColorStop(0.65, '#fef08a');
  mGrad.addColorStop(1.0, '#dbeafe');
  mCtx.fillStyle = mGrad;
  mCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 40; i++) {
    const cx = 32 + rng() * 192;
    const cy = 32 + rng() * 192;
    const cr = 5 + rng() * 20;
    mCtx.fillStyle = 'rgba(180, 170, 130, 0.14)';
    mCtx.beginPath();
    mCtx.arc(cx, cy, cr, 0, Math.PI * 2);
    mCtx.fill();
  }

  // 7. Texture ánh sáng tròn mềm cho Halo & Sương mù billboard
  const glowC = document.createElement('canvas');
  glowC.width = 128;
  glowC.height = 128;
  const glCtx = glowC.getContext('2d');
  const glGrad = glCtx.createRadialGradient(64, 64, 2, 64, 64, 64);
  glGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  glGrad.addColorStop(0.32, 'rgba(254, 246, 195, 0.55)');
  glGrad.addColorStop(0.7, 'rgba(186, 230, 253, 0.16)');
  glGrad.addColorStop(1.0, 'rgba(15, 23, 42, 0.0)');
  glCtx.fillStyle = glGrad;
  glCtx.fillRect(0, 0, 128, 128);

  const mistC = document.createElement('canvas');
  mistC.width = 256;
  mistC.height = 128;
  const msCtx = mistC.getContext('2d');
  const msGrad = msCtx.createRadialGradient(128, 64, 8, 128, 64, 122);
  msGrad.addColorStop(0.0, 'rgba(226, 240, 252, 0.48)');
  msGrad.addColorStop(0.55, 'rgba(186, 214, 238, 0.20)');
  msGrad.addColorStop(1.0, 'rgba(15, 23, 42, 0.0)');
  msCtx.fillStyle = msGrad;
  msCtx.fillRect(0, 0, 256, 128);

  return {
    tileDiffuse: makeCanvasTexture(tileC, { repeatX: 3.5, repeatY: 5.0, srgb: true, disposables }),
    tileNormal: heightCanvasToNormalTexture(tileHC, 2.0, 3.5, 5.0, disposables),
    grassDiffuse: makeCanvasTexture(grassC, { repeatX: 6, repeatY: 6, srgb: true, disposables }),
    brickDiffuse: makeCanvasTexture(brickC, { repeatX: 2, repeatY: 4, srgb: true, disposables }),
    brickNormal: heightCanvasToNormalTexture(brickHC, 2.2, 2, 4, disposables),
    stoneDiffuse: makeCanvasTexture(stoneC, { repeatX: 4, repeatY: 3, srgb: true, disposables }),
    sideBackdropTex: makeCanvasTexture(sideBackdropC, { repeatX: 1, repeatY: 1, srgb: true, disposables }),
    rearBackdropTex: makeCanvasTexture(rearBackdropC, { repeatX: 1, repeatY: 1, srgb: true, disposables }),
    moonTex: makeCanvasTexture(moonC, { repeatX: 1, repeatY: 1, srgb: true, disposables }),
    glowTex: makeCanvasTexture(glowC, { repeatX: 1, repeatY: 1, srgb: true, disposables }),
    mistTex: makeCanvasTexture(mistC, { repeatX: 1, repeatY: 1, srgb: true, disposables })
  };
}

function createGateHeaderTexture(title, subtitle, disposables) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 220;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, 1024, 0);
  bg.addColorStop(0, '#13261d');
  bg.addColorStop(0.5, '#1d3b2d');
  bg.addColorStop(1, '#13261d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 1024, 220);

  ctx.strokeStyle = '#6ee7b7';
  ctx.lineWidth = 6;
  ctx.strokeRect(12, 12, 1000, 196);
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, 976, 172);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fef3c7';
  ctx.font = 'bold 46px "Times New Roman", Georgia, serif';
  ctx.fillText(title, 512, 86, 940);

  ctx.fillStyle = '#a7f3d0';
  ctx.font = 'italic 25px "Times New Roman", Georgia, serif';
  ctx.fillText(subtitle, 512, 152, 940);

  return makeCanvasTexture(canvas, { repeatX: 1, repeatY: 1, srgb: true, disposables });
}

function createDockPoetryTexture(disposables) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, 768);
  grad.addColorStop(0, '#f5f2e6');
  grad.addColorStop(1, '#e6ece4');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 768);

  ctx.strokeStyle = '#0f766e';
  ctx.lineWidth = 10;
  ctx.strokeRect(24, 24, 976, 720);
  ctx.strokeStyle = '#065f46';
  ctx.lineWidth = 2;
  ctx.strokeRect(38, 38, 948, 692);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#064e3b';
  ctx.font = 'bold 34px "Times New Roman", Georgia, serif';
  ctx.fillText('ĐÂY THÔN VĨ DẠ — HÀN MẶC TỬ (1938)', 512, 92);

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

  ctx.font = 'italic 26px "Times New Roman", Georgia, serif';
  let y = 165;
  stanzas.forEach((stanza, sIdx) => {
    ctx.fillStyle = sIdx === 0 ? '#14532d' : (sIdx === 1 ? '#1e3a5f' : '#312e81');
    stanza.forEach((line) => {
      ctx.fillText(line, 512, y);
      y += 38;
    });
    y += 28;
  });

  return makeCanvasTexture(canvas, { repeatX: 1, repeatY: 1, srgb: true, disposables });
}

/**
 * Custom GLSL Water Shader cho Sông Trăng (Perfume River)
 * - Gợn sóng êm ("Dòng nước buồn thiu")
 * - Dải phản chiếu trăng vàng/bạc trực tiếp hướng về Vầng Trăng hậu cảnh
 */
function createSongTrangWaterMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.FrontSide,
    uniforms: {
      uTime: { value: 0 },
      uDeepColor: { value: new THREE.Color(0x061523) },
      uMidColor: { value: new THREE.Color(0x0f2d3e) },
      uMoonGold: { value: new THREE.Color(PALETTE.moonGold) },
      uMoonBlue: { value: new THREE.Color(PALETTE.moonSilverBlue) },
      uMorningWarm: { value: new THREE.Color(0x9ee3be) },
      uFogColor: { value: new THREE.Color(PALETTE.twilightNight) },
      uFogDensity: { value: 0.025 }
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vNormalW;

      void main() {
        vUv = uv;
        vec3 pos = position;

        float w1 = sin(pos.x * 1.15 + uTime * 0.95) * cos(pos.y * 0.95 - uTime * 0.72) * 0.018;
        float w2 = sin((pos.x * 2.1 - pos.y * 1.7) + uTime * 1.35) * 0.009;
        float w3 = cos(pos.x * 3.8 + pos.y * 2.6 - uTime * 1.8) * 0.004;
        pos.z += w1 + w2 + w3;

        float dx = 1.15 * cos(pos.x * 1.15 + uTime * 0.95) * cos(pos.y * 0.95 - uTime * 0.72) * 0.018
                 + 2.1 * cos((pos.x * 2.1 - pos.y * 1.7) + uTime * 1.35) * 0.009;
        float dy = -0.95 * sin(pos.x * 1.15 + uTime * 0.95) * sin(pos.y * 0.95 - uTime * 0.72) * 0.018
                 - 1.7 * cos((pos.x * 2.1 - pos.y * 1.7) + uTime * 1.35) * 0.009;

        vec3 localNorm = normalize(vec3(-dx, -dy, 1.0));
        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPos.xyz;
        vNormalW = normalize(mat3(modelMatrix) * localNorm);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uDeepColor;
      uniform vec3 uMidColor;
      uniform vec3 uMoonGold;
      uniform vec3 uMoonBlue;
      uniform vec3 uMorningWarm;
      uniform vec3 uFogColor;
      uniform float uFogDensity;

      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vNormalW;

      void main() {
        vec3 N = normalize(vNormalW);
        vec3 V = normalize(cameraPosition - vWorldPos);

        float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0);

        // Hướng ánh trăng từ phía -Z trên cao
        vec3 moonDir = normalize(vec3(0.05, 0.58, -0.81));
        vec3 H = normalize(moonDir + V);
        float specMoon = pow(max(dot(N, H), 0.0), 54.0);

        // Dải lụa ánh trăng vàng/bạc vắt ngang mặt Sông Trăng (vUv.x ~ 0.5)
        float ribbonNoise = sin(vUv.y * 42.0 - uTime * 1.9) * 0.032 + cos(vUv.y * 19.0 + uTime * 1.1) * 0.018;
        float centerDist = abs((vUv.x - 0.5) + ribbonNoise + N.x * 0.08);
        float moonRibbon = exp(-pow(centerDist * 8.5, 2.0));
        float shimmer = 0.65 + 0.35 * sin(vUv.y * 58.0 - uTime * 2.6 + vUv.x * 16.0);

        // Chuyển sắc nhẹ phía bờ Vườn Vĩ Dạ (+Z -> vUv.y gần 0.0)
        float gardenShore = smoothstep(0.45, 0.0, vUv.y) * 0.24;

        vec3 col = mix(uDeepColor, uMidColor, clamp(fresnel * 1.1 + 0.16, 0.0, 1.0));
        col += uMorningWarm * gardenShore;
        col += mix(uMoonBlue, uMoonGold, 0.58) * (moonRibbon * shimmer * 0.58 + specMoon * 0.85);
        col += uMoonBlue * (fresnel * 0.24);

        float dist = length(cameraPosition - vWorldPos);
        float fogFactor = 1.0 - exp(-pow(uFogDensity * dist, 2.0));
        col = mix(col, uFogColor, clamp(fogFactor, 0.0, 0.85));

        float alpha = mix(0.84, 0.96, clamp(fresnel + moonRibbon * 0.4, 0.0, 1.0));
        gl_FragColor = vec4(col, alpha);
      }
    `
  });
}

/**
 * Custom Shader cho Volumetric God Rays (#ffe89e) mềm mại xuyên qua tán cau
 */
function createGodRayMaterial(opacity = 0.16) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(PALETTE.morningSun) },
      uOpacity: { value: opacity }
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vNormalV;
      varying vec3 vViewPos;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewPos = -mvPos.xyz;
        vNormalV = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uOpacity;
      varying vec2 vUv;
      varying vec3 vNormalV;
      varying vec3 vViewPos;

      void main() {
        vec3 N = normalize(vNormalV);
        vec3 V = normalize(vViewPos);
        float edgeFade = pow(abs(dot(N, V)), 1.6);
        float vertFade = smoothstep(0.0, 0.25, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
        float shimmer = 0.82 + 0.18 * sin(uTime * 0.9 + vUv.x * 12.56);
        float alpha = edgeFade * vertFade * shimmer * uOpacity;
        gl_FragColor = vec4(uColor, alpha);
      }
    `
  });
}

/**
 * Custom Shader cho vệt nắng loang động trên nền vườn Vĩ Dạ (dappled sunspots)
 */
function createDappledSunspotMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
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
      uniform vec3 uColor;
      varying vec2 vUv;

      void main() {
        vec2 p = vUv * 8.5;
        float s1 = sin(p.x * 1.4 + uTime * 0.65) * cos(p.y * 1.7 - uTime * 0.45);
        float s2 = sin((p.x + p.y) * 2.3 - uTime * 0.85) * cos((p.x - p.y) * 1.9 + uTime * 0.55);
        float spot = smoothstep(0.28, 0.86, (s1 * 0.5 + s2 * 0.5) * 0.5 + 0.5);

        // Mờ dần ra rìa vùng chiếu nắng
        vec2 c = vUv - vec2(0.5);
        float mask = 1.0 - smoothstep(0.22, 0.5, length(c));
        gl_FragColor = vec4(uColor, spot * mask * 0.24);
      }
    `
  });
}

/**
 * Custom Fresnel & Distance-Fade Shader cho Bóng Hình Thiếu Nữ Áo Dài Trắng
 * - Sáng trắng thuần khiết từ xa
 * - Tiến gần < 4.0m mượt mà mờ dần về opacity = 0 ("Áo em trắng quá nhìn không ra")
 */
function createAoDaiApparitionMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uFadeStart: { value: 4.0 },
      uFadeEnd: { value: 1.25 },
      uProximityAlpha: { value: 1.0 },
      uCoreColor: { value: new THREE.Color(0xffffff) },
      uRimColor: { value: new THREE.Color(0xdbeafe) }
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying float vHeight;

      void main() {
        vHeight = position.y;
        vec3 pos = position;
        // Tà áo dài lay nhẹ trong gió sương
        float flutter = smoothstep(0.2, 1.3, 1.4 - clamp(position.y, 0.0, 1.4));
        pos.x += sin(uTime * 1.6 + position.y * 3.0) * 0.022 * flutter;
        pos.z += cos(uTime * 1.3 + position.x * 4.0) * 0.025 * flutter;

        vec4 worldPos = modelMatrix * vec4(pos, 1.0);
        vWorldPos = worldPos.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uFadeStart;
      uniform float uFadeEnd;
      uniform float uProximityAlpha;
      uniform vec3 uCoreColor;
      uniform vec3 uRimColor;

      varying vec3 vWorldPos;
      varying vec3 vWorldNormal;
      varying float vHeight;

      void main() {
        vec3 N = normalize(vWorldNormal);
        vec3 V = normalize(cameraPosition - vWorldPos);
        float fresnel = pow(1.0 - abs(dot(N, V)), 1.9);

        float dist = length(cameraPosition - vWorldPos);
        float gpuDistFade = smoothstep(uFadeEnd, uFadeStart, dist);
        float pulse = 0.88 + 0.12 * sin(uTime * 1.8 + vHeight * 2.5);

        vec3 col = mix(uCoreColor, uRimColor, fresnel * 0.45);
        col *= (1.15 + fresnel * 0.55);

        float baseAlpha = (0.58 + fresnel * 0.42) * pulse;
        float finalAlpha = clamp(baseAlpha * gpuDistFade * uProximityAlpha, 0.0, 0.96);
        if (finalAlpha < 0.004) discard;

        gl_FragColor = vec4(col, finalAlpha);
      }
    `
  });
}

/**
 * Custom Shader hạt bụi sáng trắng bay lên từ Bóng Áo Dài Trắng & hạt bụi trăng trên Thuyền Nan
 */
function createLuminousDustMaterial({ colorA = 0xffffff, colorB = 0xbae6fd, maxHeight = 3.2 } = {}) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2) },
      uColorA: { value: new THREE.Color(colorA) },
      uColorB: { value: new THREE.Color(colorB) },
      uMaxHeight: { value: maxHeight },
      uBurstIntensity: { value: 0.55 }
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPixelRatio;
      uniform float uMaxHeight;
      uniform float uBurstIntensity;
      attribute float aPhase;
      attribute float aSpeed;
      attribute float aSize;
      varying float vLife;
      varying float vTwinkle;

      void main() {
        float life = fract(aPhase + uTime * aSpeed);
        vLife = life;
        vec3 pos = position;
        pos.y += life * uMaxHeight;
        pos.x += sin(uTime * 1.1 + aPhase * 12.56) * (0.12 + life * 0.42);
        pos.z += cos(uTime * 0.9 + aPhase * 9.42) * (0.12 + life * 0.42);

        vTwinkle = 0.6 + 0.4 * sin(uTime * 3.8 + aPhase * 24.0);
        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPos;
        float scale = 125.0 / max(-mvPos.z, 1.5);
        gl_PointSize = clamp(aSize * uPixelRatio * scale * (0.8 + uBurstIntensity * 0.65), 2.0, 26.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform float uBurstIntensity;
      varying float vLife;
      varying float vTwinkle;

      void main() {
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = length(c);
        if (d > 0.5) discard;
        float radial = pow(1.0 - d * 2.0, 2.0);
        float fade = smoothstep(0.0, 0.14, vLife) * (1.0 - smoothstep(0.38, 1.0, vLife));
        vec3 col = mix(uColorA, uColorB, vLife);
        float alpha = radial * fade * vTwinkle * uBurstIntensity;
        gl_FragColor = vec4(col, clamp(alpha, 0.0, 1.0));
      }
    `
  });
}

/**
 * Custom Shader hạt sương trôi lãng đãng Zone 2 & Zone 3
 */
function createMistPointsMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uPixelRatio: { value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2) },
      uMistColor: { value: new THREE.Color(0xcbd5e1) }
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uPixelRatio;
      attribute float aPhase;
      attribute float aSize;
      varying float vAlpha;

      void main() {
        vec3 pos = position;
        pos.x += sin(uTime * 0.28 + aPhase * 6.28) * 1.4;
        pos.y += cos(uTime * 0.35 + aPhase * 9.42) * 0.25;
        pos.z += sin(uTime * 0.22 + aPhase * 12.56) * 0.85;

        vAlpha = 0.22 + 0.18 * sin(uTime * 0.7 + aPhase * 14.0);
        vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
        gl_Position = projectionMatrix * mvPos;
        float scale = 190.0 / max(-mvPos.z, 2.0);
        gl_PointSize = clamp(aSize * uPixelRatio * scale, 6.0, 64.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uMistColor;
      varying float vAlpha;

      void main() {
        vec2 c = gl_PointCoord - vec2(0.5);
        float d = length(c);
        if (d > 0.5) discard;
        float soft = pow(1.0 - d * 2.0, 2.4);
        gl_FragColor = vec4(uMistColor, soft * vAlpha);
      }
    `
  });
}

/**
 * Tạo hình khối Thiếu Nữ Áo Dài Trắng thanh thoát (sculpted graceful silhouette)
 */
function buildAoDaiFigureMesh(aoDaiMat) {
  const group = new THREE.Group();
  group.name = 'ViDa_AoDai_Sculpt';

  // Tà áo dài xòe mềm phía dưới
  const skirtGeo = prepGeo(new THREE.CylinderGeometry(0.16, 0.44, 0.98, 22, 8, true));
  const skirt = new THREE.Mesh(skirtGeo, aoDaiMat);
  skirt.position.y = 0.50;
  group.add(skirt);

  // Thân áo dài ôm eo
  const bodiceGeo = prepGeo(new THREE.CylinderGeometry(0.14, 0.17, 0.52, 18, 4));
  const bodice = new THREE.Mesh(bodiceGeo, aoDaiMat);
  bodice.position.y = 1.18;
  group.add(bodice);

  // Vai & tay áo buông mềm
  [-1, 1].forEach((side) => {
    const sleeve = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.055, 0.08, 0.56, 10)), aoDaiMat);
    sleeve.position.set(side * 0.20, 1.12, 0.02);
    sleeve.rotation.z = side * 0.18;
    group.add(sleeve);
  });

  // Cổ cao & đầu nghiêng nhẹ mơ màng
  const head = new THREE.Mesh(prepGeo(new THREE.SphereGeometry(0.115, 16, 14)), aoDaiMat);
  head.position.set(0, 1.58, 0.01);
  group.add(head);

  // Suối tóc dài & nón lá bài thơ nhẹ phía sau
  const hair = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.10, 0.16, 0.58, 12, 1, true)), aoDaiMat);
  hair.position.set(0, 1.32, -0.07);
  hair.rotation.x = 0.12;
  group.add(hair);

  const nonLa = new THREE.Mesh(prepGeo(new THREE.ConeGeometry(0.28, 0.16, 20, 1, true)), aoDaiMat);
  nonLa.position.set(0, 1.69, -0.02);
  nonLa.rotation.x = -0.14;
  group.add(nonLa);

  group.traverse((c) => {
    c.userData.ignoreRaycaster = true;
    c.castShadow = false;
    c.receiveShadow = false;
  });
  return group;
}

/**
 * Tạo Chiếc Thuyền Nan Cổ chi tiết (bộ khung tre nứa, mui thuyền, mái chèo, đèn đồng)
 */
function buildMoonBoatMesh(textures) {
  const group = new THREE.Group();
  group.name = 'ViDa_ThuyenNan_Model';

  const hullWoodMat = new THREE.MeshStandardMaterial({
    color: 0x3b2416,
    roughness: 0.84,
    metalness: 0.05
  });
  const bambooMat = new THREE.MeshStandardMaterial({
    color: 0x8a6d3b,
    roughness: 0.78,
    metalness: 0.04
  });
  const canopyMat = new THREE.MeshStandardMaterial({
    color: 0x6b5333,
    roughness: 0.9,
    side: THREE.DoubleSide
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xc89d4c,
    roughness: 0.34,
    metalness: 0.78
  });

  // Thân thuyền nan uốn cong hai đầu mũi nhọn (Lathe/Extrude hoặc ghép vỏ cong mượt)
  const hullSegs = 12;
  for (let i = 0; i < hullSegs; i++) {
    const t = i / (hullSegs - 1) - 0.5; // -0.5..+0.5
    const z = t * 3.8;
    const widthFactor = Math.max(0.18, Math.cos(t * Math.PI * 0.92));
    const liftY = Math.pow(Math.abs(t) * 2.0, 2.2) * 0.24;

    const rib = new THREE.Mesh(
      prepGeo(new THREE.BoxGeometry(1.12 * widthFactor, 0.26, 0.36)),
      hullWoodMat
    );
    rib.position.set(0, 0.14 + liftY, z);
    group.add(rib);
  }

  // Hai mạn thuyền uốn tre bo viền
  [-1, 1].forEach((side) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.42, -1.95),
      new THREE.Vector3(side * 0.48, 0.31, -0.95),
      new THREE.Vector3(side * 0.58, 0.27, 0),
      new THREE.Vector3(side * 0.48, 0.31, 0.95),
      new THREE.Vector3(0, 0.42, 1.95)
    ]);
    const gunwale = new THREE.Mesh(
      prepGeo(new THREE.TubeGeometry(curve, 20, 0.045, 7, false)),
      bambooMat
    );
    group.add(gunwale);
  });

  // Mui thuyền nan uốn vòm nửa trụ đan tre
  const muiGeo = prepGeo(new THREE.CylinderGeometry(0.56, 0.56, 1.35, 16, 1, true, 0, Math.PI));
  muiGeo.rotateZ(Math.PI / 2);
  muiGeo.rotateY(Math.PI / 2);
  const muiMesh = new THREE.Mesh(muiGeo, canopyMat);
  muiMesh.position.set(0, 0.36, -0.25);
  group.add(muiMesh);

  // Nẹp tre gia cố mui thuyền
  [-0.85, -0.25, 0.35].forEach((mz) => {
    const hoop = new THREE.Mesh(
      prepGeo(new THREE.TorusGeometry(0.57, 0.025, 6, 16, Math.PI)),
      bambooMat
    );
    hoop.position.set(0, 0.36, mz);
    group.add(hoop);
  });

  // Đôi mái chèo gỗ gác ngang mạn thuyền
  const oar = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.022, 0.025, 2.5, 8)), bambooMat);
  oar.rotation.z = Math.PI / 2;
  oar.rotation.y = 0.26;
  oar.position.set(0.28, 0.34, 0.72);
  group.add(oar);

  const oarBlade = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(0.18, 0.025, 0.65)), hullWoodMat);
  oarBlade.rotation.y = -1.3;
  oarBlade.position.set(1.22, 0.31, 0.98);
  group.add(oarBlade);

  // Đèn mũi thuyền nhỏ phát sáng vàng trăng ấm
  const lanternPole = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.02, 0.025, 0.62, 8)), bambooMat);
  lanternPole.position.set(0, 0.68, 1.62);
  group.add(lanternPole);

  const lanternLamp = new THREE.Mesh(
    prepGeo(new THREE.CylinderGeometry(0.09, 0.075, 0.18, 10)),
    new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: new THREE.Color(0xfef08a),
      emissiveIntensity: 1.25,
      roughness: 0.3
    })
  );
  lanternLamp.position.set(0, 0.88, 1.56);
  group.add(lanternLamp);

  const lanternCap = new THREE.Mesh(prepGeo(new THREE.ConeGeometry(0.12, 0.07, 8)), brassMat);
  lanternCap.position.set(0, 1.0, 1.56);
  group.add(lanternCap);

  const bowGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: textures.glowTex,
    color: PALETTE.moonGold,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }));
  bowGlow.scale.set(0.85, 0.85, 1);
  bowGlow.position.set(0, 0.88, 1.56);
  group.add(bowGlow);

  return group;
}

/**
 * Trang trí khung Ngọc Bích – Trúc Xanh – Gỗ Mun & phù điêu sóng nước Huế cho Bảng Thông Tin
 */
function embellishJadeBambooPlaque(plaqueRoot) {
  if (!plaqueRoot) return;

  const jadeMat = new THREE.MeshPhysicalMaterial({
    color: PALETTE.jadeEmerald,
    roughness: 0.18,
    metalness: 0.06,
    clearcoat: 0.72,
    clearcoatRoughness: 0.16,
    emissive: new THREE.Color(0x053a2a),
    emissiveIntensity: 0.24
  });
  const ebonyMat = new THREE.MeshStandardMaterial({
    color: PALETTE.ebonyWood,
    roughness: 0.42,
    metalness: 0.12
  });
  const bambooMat = new THREE.MeshStandardMaterial({
    color: PALETTE.bambooCulm,
    roughness: 0.56,
    metalness: 0.04
  });

  const decoGroup = new THREE.Group();
  decoGroup.name = 'ViDa_Plaque_JadeBamboo_Trim';
  decoGroup.position.set(0, 1.32, 0.02);
  decoGroup.rotation.x = -0.15;

  // Hai thân trúc uốn cong ôm hai bên khung bảng
  [-0.86, 0.86].forEach((sideX) => {
    const culm = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.036, 0.042, 1.34, 10)), bambooMat);
    culm.position.set(sideX, 0.0, 0.01);
    decoGroup.add(culm);

    // Đốt trúc & chồi lá trúc ngọc bích
    [-0.42, 0.0, 0.42].forEach((ny) => {
      const nodeRing = new THREE.Mesh(prepGeo(new THREE.TorusGeometry(0.043, 0.01, 6, 12)), ebonyMat);
      nodeRing.rotation.x = Math.PI / 2;
      nodeRing.position.set(sideX, ny, 0.01);
      decoGroup.add(nodeRing);
    });

    const leafA = new THREE.Mesh(prepGeo(new THREE.ConeGeometry(0.042, 0.24, 5)), jadeMat);
    leafA.scale.set(0.35, 1.0, 1.0);
    leafA.position.set(sideX + (sideX > 0 ? 0.08 : -0.08), 0.52, 0.03);
    leafA.rotation.z = sideX > 0 ? -0.65 : 0.65;
    decoGroup.add(leafA);
  });

  // Thanh gỗ mun viền trên dưới & 4 viên ngọc bích góc khung
  [-0.63, 0.63].forEach((by) => {
    const ebonyBar = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(1.76, 0.06, 0.11)), ebonyMat);
    ebonyBar.position.set(0, by, 0.015);
    decoGroup.add(ebonyBar);
  });

  [
    [-0.78, 0.58], [0.78, 0.58],
    [-0.78, -0.58], [0.78, -0.58]
  ].forEach(([jx, jy]) => {
    const jadeGem = new THREE.Mesh(prepGeo(new THREE.OctahedronGeometry(0.045, 1)), jadeMat);
    jadeGem.scale.set(1.0, 1.0, 0.5);
    jadeGem.position.set(jx, jy, 0.068);
    decoGroup.add(jadeGem);
  });

  // Mão ngọc bích & phù điêu sóng nước xứ Huế ở đỉnh & chân đế
  const crestJade = new THREE.Mesh(prepGeo(new THREE.TorusGeometry(0.11, 0.022, 8, 24)), jadeMat);
  crestJade.position.set(0, 0.75, 0.035);
  decoGroup.add(crestJade);

  const waveRelief = createLyCloudAndWaveRelief3D({
    width: 1.15,
    color: 0x10b981,
    material: jadeMat
  });
  waveRelief.position.set(0, -1.04, 0.26);
  waveRelief.scale.set(0.76, 0.76, 0.76);
  decoGroup.add(waveRelief);

  decoGroup.traverse((c) => {
    c.userData.ignoreRaycaster = true;
    c.castShadow = false;
    c.receiveShadow = false;
  });

  plaqueRoot.add(decoGroup);
}

/**
 * Tạo 2 nguồn âm thanh không gian procedural cho Phòng 302 (không cần mp3 ngoài)
 */
function createViDaAudioBuffer(audioCtx, kind = 'garden') {
  if (!audioCtx) return null;
  const sampleRate = audioCtx.sampleRate || 44100;
  const duration = 6.0;
  const length = Math.floor(sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  if (kind === 'garden') {
    // Gió xào xạc qua khóm trúc + tiếng chim hót ban mai vườn Vĩ Dạ
    let lp = 0;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const noise = Math.random() * 2 - 1;
      lp += 0.035 * (noise - lp);
      const breezeEnv = 0.4 + 0.6 * Math.sin(Math.PI * ((t % 3.0) / 3.0)) ** 2;
      const bambooRustle = lp * breezeEnv * 0.26;

      // Tiếng chim hót lảnh lót ngắn chu kỳ 2.0s
      const birdCycle = t % 2.0;
      let chirp = 0;
      if (birdCycle < 0.28) {
        const u = birdCycle / 0.28;
        const freq = 2150 + 620 * Math.sin(Math.PI * u);
        chirp = Math.sin(2 * Math.PI * freq * t) * Math.sin(Math.PI * u) ** 2 * 0.085;
      } else if (birdCycle > 0.42 && birdCycle < 0.64) {
        const u = (birdCycle - 0.42) / 0.22;
        const freq = 2480 + 420 * Math.cos(Math.PI * u);
        chirp = Math.sin(2 * Math.PI * freq * t) * Math.sin(Math.PI * u) ** 2 * 0.065;
      }
      data[i] = (bambooRustle + chirp) * 0.55;
    }
  } else {
    // Sóng nước Sông Hương vỗ mạn thuyền nan + âm điệu đàn tranh / sáo trúc Huế ngũ cung
    let lp = 0;
    const notes = [293.66, 329.63, 392.0, 440.0, 523.25, 440.0];
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const noise = Math.random() * 2 - 1;
      lp += 0.018 * (noise - lp);
      const waveA = 0.35 + 0.65 * Math.sin(Math.PI * ((t % 3.0) / 3.0)) ** 2;
      const waveB = 0.35 + 0.65 * Math.sin(Math.PI * (((t + 1.5) % 3.0) / 3.0)) ** 2;
      const lapping = lp * (waveA * 0.6 + waveB * 0.4) * 0.34;

      const noteIdx = Math.floor(t) % notes.length;
      const localT = t % 1.0;
      const f = notes[noteIdx];
      const zitherEnv = Math.sin(Math.PI * Math.min(localT * 4.0, 1.0)) * Math.exp(-localT * 2.2);
      const zither = (
        Math.sin(2 * Math.PI * f * t) * 0.16 +
        Math.sin(2 * Math.PI * f * 2.0 * t) * 0.04
      ) * zitherEnv;

      data[i] = (lapping + zither) * 0.56;
    }
  }

  return buffer;
}

/**
 * Xây dựng trọn vẹn Phòng trưng bày "Đây Thôn Vĩ Dạ" – Hàn Mặc Tử
 * Tầng 3 • Cánh Tây-Bắc • Phòng 302
 */
export function buildDayThonViDaExhibition({
  roomCenter = null,
  mainScene = null,
  realmScene = null,
  renderer = null,
  cameraManager = null
} = {}) {
  const pose = getRoomWorldPose('day_thon_vi_da');
  const resolvedCenter = roomCenter
    ? roomCenter.clone()
    : new THREE.Vector3(pose.x, pose.y, pose.z);

  const disposables = [];
  const textures = createViDaTextures(disposables);

  const roomGroup = new THREE.Group();
  roomGroup.name = 'DayThonViDa_Room_Root';
  roomGroup.position.copy(resolvedCenter);

  const interiorGroup = new THREE.Group();
  interiorGroup.name = 'DayThonViDa_Interior_Group';
  interiorGroup.rotation.y = pose.rotY ?? Math.PI * 0.5;
  roomGroup.add(interiorGroup);

  const solidObstacleObjects = [];
  const walkableFloors = [];

  // Shared PBR Materials
  const mossBrickMat = new THREE.MeshStandardMaterial({
    color: 0xb07c67,
    map: textures.brickDiffuse,
    normalMap: textures.brickNormal,
    roughness: 0.88,
    metalness: 0.04
  });
  const terracottaTileMat = new THREE.MeshStandardMaterial({
    color: 0xc2775d,
    map: textures.tileDiffuse,
    normalMap: textures.tileNormal,
    roughness: 0.78,
    metalness: 0.05
  });
  const grassMat = new THREE.MeshStandardMaterial({
    color: 0x3b8c52,
    map: textures.grassDiffuse,
    roughness: 0.86,
    metalness: 0.02
  });
  const bambooCulmMat = new THREE.MeshStandardMaterial({
    color: PALETTE.bambooCulm,
    roughness: 0.54,
    metalness: 0.04
  });
  const bambooLeafMat = new THREE.MeshPhysicalMaterial({
    color: 0x2e8544,
    roughness: 0.52,
    metalness: 0.02,
    sheen: 0.45,
    sheenColor: new THREE.Color(0x86efac),
    sheenRoughness: 0.5,
    side: THREE.DoubleSide
  });
  const palmTrunkMat = new THREE.MeshStandardMaterial({
    color: 0x7b7a5a,
    roughness: 0.85,
    metalness: 0.02
  });
  const palmFrondMat = new THREE.MeshPhysicalMaterial({
    color: 0x237a3b,
    roughness: 0.48,
    metalness: 0.03,
    sheen: 0.55,
    sheenColor: new THREE.Color(0xa7f3d0),
    sheenRoughness: 0.42,
    side: THREE.DoubleSide
  });
  const darkStoneMat = new THREE.MeshStandardMaterial({
    color: 0x4b5563,
    map: textures.stoneDiffuse,
    roughness: 0.86,
    metalness: 0.05
  });
  const timberMat = new THREE.MeshStandardMaterial({
    color: PALETTE.agedTimber,
    roughness: 0.82,
    metalness: 0.04
  });
  const wallShellMat = new THREE.MeshStandardMaterial({
    color: 0x16242c,
    roughness: 0.92,
    metalness: 0.02
  });

  // =========================================================================
  // 1. VỎ KIẾN TRÚC PHÒNG (25.6m x 27.6m x 10.0m, CỬA VÀO 6.2m TẠI +Z)
  // =========================================================================
  const halfW = ROOM_W * 0.5;
  const halfD = ROOM_D * 0.5;
  const halfDoorW = DOOR_W * 0.5;

  const pierW = halfW - halfDoorW;
  const pierX = halfDoorW + pierW * 0.5;
  const frontPierGeo = prepGeo(new THREE.BoxGeometry(pierW, ROOM_H, 0.34));
  [-1, 1].forEach((s, idx) => {
    const pier = new THREE.Mesh(frontPierGeo, wallShellMat);
    pier.name = `ViDa_FrontWall_Pier_${idx}`;
    pier.position.set(s * pierX, ROOM_H * 0.5, halfD - 0.16);
    pier.userData.ignoreRaycaster = true;
    interiorGroup.add(pier);
  });

  const lintelH = ROOM_H - ARCH_H;
  const frontLintel = new THREE.Mesh(
    prepGeo(new THREE.BoxGeometry(DOOR_W + 0.2, lintelH, 0.34)),
    wallShellMat
  );
  frontLintel.name = 'ViDa_FrontWall_Lintel';
  frontLintel.position.set(0, ARCH_H + lintelH * 0.5, halfD - 0.16);
  frontLintel.userData.ignoreRaycaster = true;
  interiorGroup.add(frontLintel);

  const sideWallGeo = prepGeo(new THREE.BoxGeometry(0.36, ROOM_H, ROOM_D));
  [-1, 1].forEach((s, idx) => {
    const wall = new THREE.Mesh(sideWallGeo, wallShellMat);
    wall.name = `ViDa_SideWall_${idx === 0 ? 'Left' : 'Right'}`;
    wall.position.set(s * (halfW - 0.16), ROOM_H * 0.5, 0);
    wall.userData.ignoreRaycaster = true;
    interiorGroup.add(wall);

    // Tranh tường chuyển tiếp từ vườn ban mai -> sông đêm Huế
    const mural = new THREE.Mesh(
      prepGeo(new THREE.PlaneGeometry(ROOM_D - 0.8, ROOM_H - 0.4)),
      new THREE.MeshBasicMaterial({ map: textures.sideBackdropTex, side: THREE.FrontSide })
    );
    mural.name = `ViDa_BackdropMural_${idx}`;
    mural.position.set(s * (halfW - 0.36), (ROOM_H - 0.2) * 0.5, 0);
    mural.rotation.y = s < 0 ? Math.PI * 0.5 : -Math.PI * 0.5;
    if (s > 0) {
      // Đảo UV ngang cho tường phải để chiều Ban Mai (+Z) khớp nhau đối xứng
      mural.scale.x = -1;
      mural.material.side = THREE.DoubleSide;
    }
    mural.userData.ignoreRaycaster = true;
    interiorGroup.add(mural);
  });

  const backWall = new THREE.Mesh(
    prepGeo(new THREE.BoxGeometry(ROOM_W, ROOM_H, 0.36)),
    wallShellMat
  );
  backWall.name = 'ViDa_BackWall_Enclosure';
  backWall.position.set(0, ROOM_H * 0.5, -halfD + 0.16);
  backWall.userData.ignoreRaycaster = true;
  interiorGroup.add(backWall);

  const rearSkyBackdrop = new THREE.Mesh(
    prepGeo(new THREE.PlaneGeometry(ROOM_W - 0.8, ROOM_H - 0.2)),
    new THREE.MeshBasicMaterial({ map: textures.rearBackdropTex, side: THREE.FrontSide })
  );
  rearSkyBackdrop.name = 'ViDa_Backdrop_NightSky';
  rearSkyBackdrop.position.set(0, (ROOM_H - 0.2) * 0.5, -halfD + 0.36);
  rearSkyBackdrop.userData.ignoreRaycaster = true;
  interiorGroup.add(rearSkyBackdrop);

  // Trần hai sắc thái: +Z Ban Mai tươi sáng, -Z Bầu Trời Đêm #0f172a
  const morningCeiling = new THREE.Mesh(
    prepGeo(new THREE.PlaneGeometry(ROOM_W, 13.8)),
    new THREE.MeshBasicMaterial({ color: 0x9ecbb8, side: THREE.FrontSide })
  );
  morningCeiling.name = 'ViDa_Ceiling_MorningSky';
  morningCeiling.rotation.x = Math.PI * 0.5;
  morningCeiling.position.set(0, ROOM_H - 0.05, 6.9);
  morningCeiling.userData.ignoreRaycaster = true;
  interiorGroup.add(morningCeiling);

  const nightCeiling = new THREE.Mesh(
    prepGeo(new THREE.PlaneGeometry(ROOM_W, 13.8)),
    new THREE.MeshBasicMaterial({ color: PALETTE.twilightNight, side: THREE.FrontSide })
  );
  nightCeiling.name = 'ViDa_Ceiling_NightSky';
  nightCeiling.rotation.x = Math.PI * 0.5;
  nightCeiling.position.set(0, ROOM_H - 0.05, -6.9);
  nightCeiling.userData.ignoreRaycaster = true;
  interiorGroup.add(nightCeiling);

  // =========================================================================
  // 2. CỔNG VÒM KHÓM TRÚC XỨ HUẾ (+Z ENTRANCE, LỐI VÀO RỘNG RÃI 6.2m)
  // =========================================================================
  const gateGroup = new THREE.Group();
  gateGroup.name = 'ViDa_Gate_BambooArchway';
  gateGroup.position.set(0, 0, halfD - 0.65);
  interiorGroup.add(gateGroup);

  const brickPierGeo = prepGeo(new THREE.BoxGeometry(0.76, 4.4, 0.86));
  const pierCapGeo = prepGeo(new THREE.BoxGeometry(0.94, 0.24, 1.04));
  [-3.48, 3.48].forEach((gx, idx) => {
    const brickPier = new THREE.Mesh(brickPierGeo, mossBrickMat);
    brickPier.name = `ViDa_Gate_Pier_${idx}`;
    brickPier.position.set(gx, 2.2, 0);
    gateGroup.add(brickPier);
    solidObstacleObjects.push(brickPier);

    const cap = new THREE.Mesh(pierCapGeo, mossBrickMat);
    cap.position.set(gx, 4.5, 0);
    gateGroup.add(cap);
  });

  // Vòm trúc xanh uốn cong qua khẩu độ 6.2m
  [-0.14, 0.14].forEach((rz) => {
    const archCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3.42, 3.9, rz),
      new THREE.Vector3(-2.1, 5.25, rz),
      new THREE.Vector3(0, 5.65, rz),
      new THREE.Vector3(2.1, 5.25, rz),
      new THREE.Vector3(3.42, 3.9, rz)
    ]);
    const bambooArch = new THREE.Mesh(
      prepGeo(new THREE.TubeGeometry(archCurve, 28, 0.095, 8, false)),
      bambooCulmMat
    );
    bambooArch.name = 'ViDa_Gate_ArchTube';
    gateGroup.add(bambooArch);
  });

  // Bảng hiệu cổng Huế: ĐÂY THÔN VĨ DẠ
  const gateSignTex = createGateHeaderTexture(
    'ĐÂY THÔN VĨ DẠ',
    'Hàn Mặc Tử (1912–1940) • Lắng đọng sắc nắng & sương khói xứ Huế',
    disposables
  );
  const gateSign = new THREE.Mesh(
    prepGeo(new THREE.PlaneGeometry(4.4, 0.88)),
    new THREE.MeshBasicMaterial({ map: gateSignTex, side: THREE.DoubleSide })
  );
  gateSign.name = 'ViDa_Gate_HeaderSign';
  gateSign.position.set(0, 4.88, -0.22);
  gateSign.rotation.y = Math.PI;
  gateGroup.add(gateSign);

  // Tán lá trúc buông rủ che nhẹ mép trên cổng ("Lá trúc che ngang mặt chữ điền")
  const gateLeafGeo = prepGeo(new THREE.ConeGeometry(0.08, 0.42, 4));
  const rngGate = createSeededRandom(3021);
  const gateLeaves = new THREE.InstancedMesh(gateLeafGeo, bambooLeafMat, 84);
  gateLeaves.name = 'ViDa_Gate_BambooLeaves';
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 84; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const lx = side * (1.2 + rngGate() * 2.15);
    const ly = 4.2 + rngGate() * 0.95;
    const lz = -0.35 + rngGate() * 0.7;
    dummy.position.set(lx, ly, lz);
    dummy.rotation.set(0.75 + rngGate() * 0.6, rngGate() * Math.PI * 2, side * (0.4 + rngGate() * 0.5));
    dummy.scale.set(0.38, 0.9 + rngGate() * 0.5, 1.0);
    dummy.updateMatrix();
    gateLeaves.setMatrixAt(i, dummy.matrix);
  }
  gateLeaves.instanceMatrix.needsUpdate = true;
  gateGroup.add(gateLeaves);

  gateGroup.traverse((c) => {
    c.userData.ignoreRaycaster = true;
  });

  // =========================================================================
  // 3. ZONE 1 (+Z: +2.0..+13.8): VƯỜN VĨ DẠ BAN MAI & NẮNG HÀNG CAU
  // =========================================================================
  // Thềm cỏ xanh mướt Zone 1
  const gardenLawn = new THREE.Mesh(
    prepGeo(new THREE.BoxGeometry(ROOM_W - 0.5, 0.06, 12.2)),
    grassMat
  );
  gardenLawn.name = 'ViDa_Floor_GardenLawn';
  gardenLawn.position.set(0, 0.03, 7.6);
  gardenLawn.receiveShadow = true;
  gardenLawn.userData.preserveShadow = true;
  gardenLawn.userData.isTeleportFloor = true;
  gardenLawn.userData.isViDaWalkable = true;
  gardenLawn.userData.isWalkableFloor = true;
  interiorGroup.add(gardenLawn);
  walkableFloors.push(gardenLawn);

  // Đường gạch Bát Tràng cổ từ cổng dẫn vào sân trung tâm caithonvida.glb & ra bến sông
  const terracottaPath = new THREE.Mesh(
    prepGeo(new THREE.BoxGeometry(5.6, 0.08, 12.1)),
    terracottaTileMat
  );
  terracottaPath.name = 'ViDa_Floor_TerracottaPath';
  terracottaPath.position.set(0, 0.04, 7.65);
  terracottaPath.receiveShadow = true;
  terracottaPath.userData.preserveShadow = true;
  terracottaPath.userData.isTeleportFloor = true;
  terracottaPath.userData.isViDaWalkable = true;
  terracottaPath.userData.isWalkableFloor = true;
  interiorGroup.add(terracottaPath);
  walkableFloors.push(terracottaPath);

  const centralCourtyard = new THREE.Mesh(
    prepGeo(new THREE.CylinderGeometry(4.4, 4.6, 0.09, 28)),
    terracottaTileMat
  );
  centralCourtyard.name = 'ViDa_Floor_CentralCourtyard';
  centralCourtyard.position.set(0, 0.045, 4.2);
  centralCourtyard.receiveShadow = true;
  centralCourtyard.userData.preserveShadow = true;
  centralCourtyard.userData.isTeleportFloor = true;
  centralCourtyard.userData.isViDaWalkable = true;
  centralCourtyard.userData.isWalkableFloor = true;
  interiorGroup.add(centralCourtyard);
  walkableFloors.push(centralCourtyard);

  // Vệt nắng loang động (animated dappled sunspots) trên mặt đường & cỏ
  const dappledMat = createDappledSunspotMaterial();
  const dappledFloorOverlay = new THREE.Mesh(
    prepGeo(new THREE.PlaneGeometry(17.5, 11.2)),
    dappledMat
  );
  dappledFloorOverlay.name = 'ViDa_Dappled_Sunspots';
  dappledFloorOverlay.rotation.x = -Math.PI * 0.5;
  dappledFloorOverlay.position.set(0, 0.092, 7.5);
  dappledFloorOverlay.userData.ignoreRaycaster = true;
  dappledFloorOverlay.userData.isDynamic = true;
  interiorGroup.add(dappledFloorOverlay);

  // Hàng Cau cao vút (InstancedMesh: thân cau đốt vòng + tàu lá cau cong)
  const rngGarden = createSeededRandom(3022);
  const palmPositions = [
    [-5.6, 11.2], [-6.4, 8.6], [-5.8, 5.8], [-8.6, 10.2], [-9.4, 6.8], [-10.2, 3.6],
    [8.4, 11.6], [9.4, 8.2], [5.8, 5.8], [8.6, 10.2], [9.4, 6.8], [10.2, 3.6]
  ];
  const palmTrunkGeo = prepGeo(new THREE.CylinderGeometry(0.11, 0.18, 6.6, 9));
  const palmCrownGeo = prepGeo(new THREE.CylinderGeometry(0.125, 0.115, 0.9, 8));
  const palmFrondGeo = prepGeo(new THREE.ConeGeometry(0.42, 2.35, 5));
  palmFrondGeo.translate(0, 1.15, 0);

  const palmTrunks = new THREE.InstancedMesh(palmTrunkGeo, palmTrunkMat, palmPositions.length);
  const palmCrowns = new THREE.InstancedMesh(palmCrownGeo, bambooCulmMat, palmPositions.length);
  const frondsPerPalm = 8;
  const palmFronds = new THREE.InstancedMesh(palmFrondGeo, palmFrondMat, palmPositions.length * frondsPerPalm);

  palmTrunks.name = 'ViDa_Instanced_ArecaTrunks';
  palmCrowns.name = 'ViDa_Instanced_ArecaCrowns';
  palmFronds.name = 'ViDa_Instanced_ArecaFronds';

  [palmTrunks, palmCrowns, palmFronds].forEach((im) => {
    im.castShadow = true;
    im.receiveShadow = true;
    im.userData.preserveShadow = true;
    im.userData.ignoreRaycaster = true;
  });

  let frondIdx = 0;
  palmPositions.forEach(([px, pz], idx) => {
    const hScale = 0.88 + rngGarden() * 0.28;
    const tiltX = (rngGarden() - 0.5) * 0.06;
    const tiltZ = (rngGarden() - 0.5) * 0.06;
    const topY = 6.6 * hScale;

    dummy.position.set(px, topY * 0.5, pz);
    dummy.rotation.set(tiltX, rngGarden() * Math.PI, tiltZ);
    dummy.scale.set(1, hScale, 1);
    dummy.updateMatrix();
    palmTrunks.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(px + tiltZ * 2.2, topY + 0.35, pz - tiltX * 2.2);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    palmCrowns.setMatrixAt(idx, dummy.matrix);

    for (let f = 0; f < frondsPerPalm; f++) {
      const ang = (f / frondsPerPalm) * Math.PI * 2 + rngGarden() * 0.35;
      dummy.position.set(px + tiltZ * 2.2, topY + 0.65, pz - tiltX * 2.2);
      dummy.rotation.set(1.18 + (f % 2) * 0.26, ang, 0);
      dummy.scale.set(0.32, 0.92 + rngGarden() * 0.25, 0.95);
      dummy.updateMatrix();
      palmFronds.setMatrixAt(frondIdx++, dummy.matrix);
    }
  });
  palmTrunks.instanceMatrix.needsUpdate = true;
  palmCrowns.instanceMatrix.needsUpdate = true;
  palmFronds.instanceMatrix.needsUpdate = true;
  interiorGroup.add(palmTrunks, palmCrowns, palmFronds);

  // Khóm Trúc Xanh (InstancedMesh thân trúc & tán lá trúc dọc hai bên vườn)
  const bambooClusterCenters = [
    [-4.8, 12.2], [-7.4, 11.6], [-10.8, 9.4], [-10.9, 5.2], [-7.2, 3.2],
    [5.4, 12.6], [9.8, 11.6], [10.8, 9.4], [10.9, 5.2], [7.2, 3.2]
  ];
  const stalksPerClump = 7;
  const leavesPerStalk = 5;
  const totalStalks = bambooClusterCenters.length * stalksPerClump;
  const bambooStalkGeo = prepGeo(new THREE.CylinderGeometry(0.036, 0.052, 4.6, 7));
  const bambooLeafGeo = prepGeo(new THREE.ConeGeometry(0.11, 0.62, 4));
  bambooLeafGeo.translate(0, 0.3, 0);

  const bambooStalks = new THREE.InstancedMesh(bambooStalkGeo, bambooCulmMat, totalStalks);
  const bambooLeaves = new THREE.InstancedMesh(bambooLeafGeo, bambooLeafMat, totalStalks * leavesPerStalk);
  bambooStalks.name = 'ViDa_Instanced_BambooStalks';
  bambooLeaves.name = 'ViDa_Instanced_BambooLeaves';
  [bambooStalks, bambooLeaves].forEach((im) => {
    im.castShadow = true;
    im.receiveShadow = true;
    im.userData.preserveShadow = true;
    im.userData.ignoreRaycaster = true;
  });

  let stalkIdx = 0;
  let bLeafIdx = 0;
  bambooClusterCenters.forEach(([cx, cz]) => {
    for (let s = 0; s < stalksPerClump; s++) {
      const ox = cx + (rngGarden() - 0.5) * 1.1;
      const oz = cz + (rngGarden() - 0.5) * 1.1;
      const sh = 0.72 + rngGarden() * 0.45;
      const leanX = (rngGarden() - 0.5) * 0.14;
      const leanZ = (rngGarden() - 0.5) * 0.14;

      dummy.position.set(ox, 2.3 * sh, oz);
      dummy.rotation.set(leanX, rngGarden() * Math.PI, leanZ);
      dummy.scale.set(1, sh, 1);
      dummy.updateMatrix();
      bambooStalks.setMatrixAt(stalkIdx++, dummy.matrix);

      for (let l = 0; l < leavesPerStalk; l++) {
        const ly = (2.3 + rngGarden() * 2.1) * sh;
        dummy.position.set(ox + leanZ * ly, ly, oz - leanX * ly);
        dummy.rotation.set(0.8 + rngGarden() * 0.7, rngGarden() * Math.PI * 2, 0.3);
        dummy.scale.set(0.45, 0.8 + rngGarden() * 0.4, 1.0);
        dummy.updateMatrix();
        bambooLeaves.setMatrixAt(bLeafIdx++, dummy.matrix);
      }
    }
  });
  bambooStalks.instanceMatrix.needsUpdate = true;
  bambooLeaves.instanceMatrix.needsUpdate = true;
  interiorGroup.add(bambooStalks, bambooLeaves);

  // Nắng Ban Mai DirectionalLight (#ffe89e, castShadow: true, 1024x1024)
  const morningDirLight = new THREE.DirectionalLight(PALETTE.morningSun, 2.4);
  morningDirLight.name = 'ViDa_Morning_DirectionalLight';
  morningDirLight.position.set(6.8, 9.2, 10.6);
  morningDirLight.target.position.set(0, 0.4, 4.2);
  morningDirLight.castShadow = true;
  morningDirLight.shadow.mapSize.set(1024, 1024);
  morningDirLight.shadow.bias = -0.0005;
  morningDirLight.shadow.normalBias = 0.02;
  morningDirLight.shadow.camera.near = 1.0;
  morningDirLight.shadow.camera.far = 26.0;
  morningDirLight.shadow.camera.left = -12.5;
  morningDirLight.shadow.camera.right = 12.5;
  morningDirLight.shadow.camera.top = 12.5;
  morningDirLight.shadow.camera.bottom = -12.5;
  morningDirLight.userData = {
    isViDaMorningLight: true,
    isViDaShadowLight: true,
    preserveShadow: true,
    baseIntensity: 2.4,
    ignoreRaycaster: true
  };
  morningDirLight.target.userData = {
    isViDaMorningLight: true,
    isViDaShadowLight: true,
    isLightTarget: true,
    ignoreRaycaster: true
  };
  interiorGroup.add(morningDirLight);
  interiorGroup.add(morningDirLight.target);

  // Luồng nắng Volumetric God Rays xiên chéo (#ffe89e)
  const godRayMat = createGodRayMaterial(0.15);
  const godRayGroup = new THREE.Group();
  godRayGroup.name = 'ViDa_Morning_GodRays';
  [
    { x: -3.2, z: 8.6, rTop: 0.45, rBot: 2.1, h: 9.2 },
    { x: 0.2, z: 4.5, rTop: 0.65, rBot: 2.6, h: 9.4 },
    { x: 3.4, z: 7.4, rTop: 0.50, rBot: 2.2, h: 9.0 },
    { x: -2.0, z: 5.5, rTop: 0.40, rBot: 1.85, h: 8.8 }
  ].forEach((spec, idx) => {
    const ray = new THREE.Mesh(
      prepGeo(new THREE.CylinderGeometry(spec.rTop, spec.rBot, spec.h, 16, 1, true)),
      godRayMat
    );
    ray.name = `ViDa_GodRay_${idx}`;
    ray.position.set(spec.x, spec.h * 0.5 + 0.1, spec.z);
    ray.rotation.z = 0.28;
    ray.rotation.x = -0.24;
    ray.userData.ignoreRaycaster = true;
    godRayGroup.add(ray);
  });
  interiorGroup.add(godRayGroup);

  // =========================================================================
  // 4. TRUNG TÂM GIAO THOA: MÔ HÌNH caithonvida.glb & TINH CHỈNH PBR NGỌC BÍCH
  // =========================================================================
  const viDaGardenHolder = new THREE.Group();
  viDaGardenHolder.name = 'ViDa_CaiThonViDa_Model';
  viDaGardenHolder.position.set(0, 0.09, 4.1);
  interiorGroup.add(viDaGardenHolder);

  const gardenDais = new THREE.Mesh(
    prepGeo(new THREE.CylinderGeometry(1.85, 2.02, 0.08, 28)),
    mossBrickMat
  );
  gardenDais.position.y = 0.04;
  gardenDais.receiveShadow = true;
  gardenDais.userData.preserveShadow = true;
  gardenDais.userData.ignoreRaycaster = true;
  viDaGardenHolder.add(gardenDais);

  const gardenPlaceholder = new THREE.Mesh(
    prepGeo(new THREE.CylinderGeometry(0.6, 0.85, 2.4, 12)),
    new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.7, transparent: true, opacity: 0.35 })
  );
  gardenPlaceholder.position.y = 1.25;
  gardenPlaceholder.castShadow = true;
  gardenPlaceholder.userData.preserveShadow = true;
  viDaGardenHolder.add(gardenPlaceholder);

  const gardenCollider = new THREE.Mesh(
    prepGeo(new THREE.BoxGeometry(2.8, 2.8, 2.8)),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  gardenCollider.name = 'ViDa_CaiThonViDa_Collider';
  gardenCollider.position.set(0, 1.4, 4.1);
  gardenCollider.userData.ignoreRaycaster = true;
  interiorGroup.add(gardenCollider);
  solidObstacleObjects.push(gardenCollider);

  // =========================================================================
  // 5. ZONE 2 (CENTER): BẾN SÔNG TRĂNG, HOA BẮP LAY & CHIẾC THUYỀN NAN CỔ
  // =========================================================================
  // Đáy sông sâu
  const riverBedDepth = 8.8;
  const riverCenterZ = -2.7;
  const riverBed = new THREE.Mesh(
    prepGeo(new THREE.PlaneGeometry(ROOM_W - 0.5, riverBedDepth)),
    new THREE.MeshBasicMaterial({ color: 0x040b16 })
  );
  riverBed.name = 'ViDa_River_Bed';
  riverBed.rotation.x = -Math.PI * 0.5;
  riverBed.position.set(0, 0.015, riverCenterZ);
  riverBed.userData.ignoreRaycaster = true;
  riverBed.userData.isTeleportBlocked = true;
  interiorGroup.add(riverBed);

  // Bờ chuyển tiếp đá rêu & bến thuyền gỗ
  const bankSteps = new THREE.Group();
  bankSteps.name = 'ViDa_River_Bank';
  const southEmbankment = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(ROOM_W - 0.5, 0.08, 0.95)), darkStoneMat);
  southEmbankment.position.set(0, 0.04, 1.55);
  bankSteps.add(southEmbankment);

  const northEmbankment = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(ROOM_W - 0.5, 0.08, 0.95)), darkStoneMat);
  northEmbankment.position.set(0, 0.04, -6.95);
  bankSteps.add(northEmbankment);

  // Bến đò gỗ bên trái trung tâm (-1.1, +0.45) cho du khách ngắm Thuyền Nan & Sông Trăng
  const woodenDock = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(3.6, 0.14, 2.2)), timberMat);
  woodenDock.name = 'ViDa_Floor_RiverDock';
  woodenDock.position.set(-1.0, 0.09, 0.65);
  woodenDock.receiveShadow = true;
  woodenDock.userData.preserveShadow = true;
  woodenDock.userData.isTeleportFloor = true;
  woodenDock.userData.isViDaWalkable = true;
  woodenDock.userData.isWalkableFloor = true;
  interiorGroup.add(woodenDock);
  walkableFloors.push(woodenDock);

  [-2.6, 0.6].forEach((px) => {
    const pile = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.11, 0.12, 0.9, 8)), timberMat);
    pile.position.set(px, 0.45, -0.35);
    bankSteps.add(pile);
  });
  bankSteps.traverse((c) => { c.userData.ignoreRaycaster = true; });
  interiorGroup.add(bankSteps);

  // Cầu gỗ bắc qua Sông Trăng tại X = +4.2 (nối mượt Zone 1 -> Zone 3)
  const bridgeFloor = new THREE.Mesh(
    prepGeo(new THREE.BoxGeometry(2.2, 0.14, 9.2)),
    timberMat
  );
  bridgeFloor.name = 'ViDa_Floor_MoonBridge';
  bridgeFloor.position.set(4.2, 0.14, -2.7);
  bridgeFloor.receiveShadow = true;
  bridgeFloor.userData.preserveShadow = true;
  bridgeFloor.userData.isTeleportFloor = true;
  bridgeFloor.userData.isViDaWalkable = true;
  bridgeFloor.userData.isWalkableFloor = true;
  interiorGroup.add(bridgeFloor);
  walkableFloors.push(bridgeFloor);

  // Tay vịn tre thấp hai bên cầu gỗ
  [3.15, 5.25].forEach((rx) => {
    const rail = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.04, 0.04, 9.0, 8)), bambooCulmMat);
    rail.rotation.x = Math.PI * 0.5;
    rail.position.set(rx, 0.88, -2.7);
    rail.userData.ignoreRaycaster = true;
    interiorGroup.add(rail);
    for (let pz = -6.8; pz <= 1.4; pz += 2.05) {
      const post = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.05, 0.06, 0.88, 8)), timberMat);
      post.position.set(rx, 0.44, pz);
      post.userData.ignoreRaycaster = true;
      interiorGroup.add(post);
    }
  });

  // Mặt nước Sông Trăng (Custom GLSL ShaderMaterial)
  const waterMat = createSongTrangWaterMaterial();
  const riverWaterMesh = new THREE.Mesh(
    prepGeo(new THREE.PlaneGeometry(ROOM_W - 0.5, riverBedDepth, 48, 28)),
    waterMat
  );
  riverWaterMesh.name = 'ViDa_SongTrang_Water';
  riverWaterMesh.rotation.x = -Math.PI * 0.5;
  riverWaterMesh.position.set(0, 0.068, riverCenterZ);
  riverWaterMesh.userData.ignoreRaycaster = true;
  riverWaterMesh.userData.isWater = true;
  riverWaterMesh.userData.isTeleportBlocked = true;
  interiorGroup.add(riverWaterMesh);

  // Chiếc Thuyền Nan Cổ neo đậu giữa Sông Trăng
  const moonBoatHolder = new THREE.Group();
  moonBoatHolder.name = 'ViDa_ThuyenTrang_Holder';
  moonBoatHolder.position.set(-2.15, 0.075, -2.75);
  moonBoatHolder.rotation.y = 0.46;
  interiorGroup.add(moonBoatHolder);

  const boatMesh = buildMoonBoatMesh(textures);
  boatMesh.traverse((c) => { c.userData.ignoreRaycaster = true; });
  moonBoatHolder.add(boatMesh);

  // Hạt bụi trăng vàng lấp lánh bên trong & bay lên từ lòng Thuyền Nan
  const boatDustCount = 96;
  const rngBoat = createSeededRandom(3023);
  const boatDustPos = new Float32Array(boatDustCount * 3);
  const boatDustPhase = new Float32Array(boatDustCount);
  const boatDustSpeed = new Float32Array(boatDustCount);
  const boatDustSize = new Float32Array(boatDustCount);
  for (let i = 0; i < boatDustCount; i++) {
    boatDustPos[i * 3] = (rngBoat() - 0.5) * 0.9;
    boatDustPos[i * 3 + 1] = 0.24 + rngBoat() * 0.25;
    boatDustPos[i * 3 + 2] = (rngBoat() - 0.5) * 2.8;
    boatDustPhase[i] = rngBoat();
    boatDustSpeed[i] = 0.14 + rngBoat() * 0.16;
    boatDustSize[i] = 0.45 + rngBoat() * 0.45;
  }
  const boatDustGeo = new THREE.BufferGeometry();
  boatDustGeo.setAttribute('position', new THREE.BufferAttribute(boatDustPos, 3));
  boatDustGeo.setAttribute('aPhase', new THREE.BufferAttribute(boatDustPhase, 1));
  boatDustGeo.setAttribute('aSpeed', new THREE.BufferAttribute(boatDustSpeed, 1));
  boatDustGeo.setAttribute('aSize', new THREE.BufferAttribute(boatDustSize, 1));
  const boatDustMat = createLuminousDustMaterial({ colorA: PALETTE.moonGold, colorB: 0xffffff, maxHeight: 1.9 });
  boatDustMat.uniforms.uBurstIntensity.value = 0.85;
  const boatDustPoints = new THREE.Points(boatDustGeo, boatDustMat);
  boatDustPoints.name = 'ViDa_Boat_MoonDust';
  boatDustPoints.userData.ignoreRaycaster = true;
  boatDustPoints.userData.isParticle = true;
  moonBoatHolder.add(boatDustPoints);

  // InstancedMesh Hoa Bắp / Lau Sậy ven bờ đung đưa theo Math.sin(uTime) trong Custom Vertex Shader
  const reedTimeUniform = { value: 0 };
  const reedMat = new THREE.MeshStandardMaterial({
    color: 0x6ea66e,
    roughness: 0.78,
    metalness: 0.02,
    side: THREE.DoubleSide
  });
  reedMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = reedTimeUniform;
    shader.vertexShader = `uniform float uTime;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       float reedH = clamp((position.y + 0.05) * 0.75, 0.0, 1.4);
       float instSeed = instanceMatrix[3][0] * 0.75 + instanceMatrix[3][2] * 0.55;
       float sway = sin(uTime * 1.85 + instSeed) * 0.16 + sin(uTime * 3.1 + instSeed * 1.4) * 0.04;
       transformed.x += sway * reedH * reedH;
       transformed.z += cos(uTime * 1.45 + instSeed) * 0.07 * reedH * reedH;`
    );
  };
  reedMat.customProgramCacheKey = () => 'vida_corn_reed_sway_v1';

  const plumeMat = new THREE.MeshStandardMaterial({
    color: 0xf4e3b8,
    emissive: new THREE.Color(0x3a321d),
    emissiveIntensity: 0.25,
    roughness: 0.85
  });
  plumeMat.onBeforeCompile = reedMat.onBeforeCompile;
  plumeMat.customProgramCacheKey = () => 'vida_corn_plume_sway_v1';

  const reedCoords = [];
  const rngReed = createSeededRandom(3024);
  for (let i = 0; i < 160; i++) {
    const isSouthBank = i < 80;
    let rx = (rngReed() - 0.5) * 23.0;
    // Tránh chắn lối đi bến gỗ (-2.8..+0.8) và cầu gỗ (+3.1..+5.3)
    if (rx > -3.0 && rx < 1.1 && isSouthBank) rx -= 3.2;
    if (rx > 2.9 && rx < 5.5) rx += 3.0;
    const rz = isSouthBank ? (1.45 + rngReed() * 0.85) : (-6.85 - rngReed() * 0.85);
    reedCoords.push([rx, rz]);
  }
  const reedStalkGeo = prepGeo(new THREE.CylinderGeometry(0.012, 0.025, 1.35, 5));
  reedStalkGeo.translate(0, 0.675, 0);
  const reedPlumeGeo = prepGeo(new THREE.ConeGeometry(0.055, 0.34, 6));
  reedPlumeGeo.translate(0, 1.44, 0);

  const reedStalks = new THREE.InstancedMesh(reedStalkGeo, reedMat, reedCoords.length);
  const reedPlumes = new THREE.InstancedMesh(reedPlumeGeo, plumeMat, reedCoords.length);
  reedStalks.name = 'ViDa_Instanced_CornReedStalks';
  reedPlumes.name = 'ViDa_Instanced_CornReedPlumes';
  [reedStalks, reedPlumes].forEach((im) => {
    im.userData.ignoreRaycaster = true;
    im.castShadow = false;
    im.receiveShadow = false;
  });

  reedCoords.forEach(([rx, rz], idx) => {
    dummy.position.set(rx, 0.04, rz);
    dummy.rotation.set((rngReed() - 0.5) * 0.12, rngReed() * Math.PI * 2, (rngReed() - 0.5) * 0.12);
    const sc = 0.78 + rngReed() * 0.52;
    dummy.scale.set(1, sc, 1);
    dummy.updateMatrix();
    reedStalks.setMatrixAt(idx, dummy.matrix);
    reedPlumes.setMatrixAt(idx, dummy.matrix);
  });
  reedStalks.instanceMatrix.needsUpdate = true;
  reedPlumes.instanceMatrix.needsUpdate = true;
  interiorGroup.add(reedStalks, reedPlumes);

  // Rào chắn collider vô hình bảo vệ du khách không bước lọt xuống lòng sông sâu
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
  // Bờ Nam (+Z = +1.7): chừa lối cầu gỗ X in [3.1, 5.3] và bến đò X in [-2.8, +0.8]
  addBoundaryCollider('ViDa_BankRail_SouthLeft', -7.8, 1.0, 1.55, 9.8, 2.0, 0.4);
  addBoundaryCollider('ViDa_BankRail_SouthMid', 1.95, 1.0, 1.55, 2.2, 2.0, 0.4);
  addBoundaryCollider('ViDa_BankRail_SouthRight', 8.95, 1.0, 1.55, 7.2, 2.0, 0.4);
  // Quây 3 mặt bến đò gỗ
  addBoundaryCollider('ViDa_DockRail_Front', -1.0, 1.0, -0.5, 3.7, 2.0, 0.3);
  addBoundaryCollider('ViDa_DockRail_Left', -2.85, 1.0, 0.55, 0.3, 2.0, 2.2);
  addBoundaryCollider('ViDa_DockRail_Right', 0.85, 1.0, 0.55, 0.3, 2.0, 2.2);
  // Lan can cầu gỗ
  addBoundaryCollider('ViDa_BridgeRail_Left', 3.05, 1.0, -2.7, 0.25, 2.0, 9.2);
  addBoundaryCollider('ViDa_BridgeRail_Right', 5.35, 1.0, -2.7, 0.25, 2.0, 9.2);
  // Bờ Bắc (-Z = -7.0): chừa lối cầu gỗ X in [3.1, 5.3]
  addBoundaryCollider('ViDa_BankRail_NorthLeft', -4.7, 1.0, -7.0, 15.6, 2.0, 0.4);
  addBoundaryCollider('ViDa_BankRail_NorthRight', 8.95, 1.0, -7.0, 7.2, 2.0, 0.4);

  // =========================================================================
  // 6. ZONE 3 (-Z: -7.0..-13.8): CÕI MỘNG SƯƠNG KHÓI & ẢO ẢNH ÁO TRẮNG
  // =========================================================================
  const mistGround = new THREE.Mesh(
    prepGeo(new THREE.BoxGeometry(ROOM_W - 0.5, 0.08, 6.9)),
    darkStoneMat
  );
  mistGround.name = 'ViDa_Floor_MistTerrace';
  mistGround.position.set(0, 0.04, -10.35);
  mistGround.userData.isTeleportFloor = true;
  mistGround.userData.isViDaWalkable = true;
  mistGround.userData.isWalkableFloor = true;
  interiorGroup.add(mistGround);
  walkableFloors.push(mistGround);

  // Vầng Trăng Khổng Lồ rạng sáng vùng trời hậu cảnh (-Z)
  const giantMoonGroup = new THREE.Group();
  giantMoonGroup.name = 'ViDa_Giant_Moon';
  giantMoonGroup.position.set(0, 6.25, -12.85);
  interiorGroup.add(giantMoonGroup);

  const moonSphere = new THREE.Mesh(
    prepGeo(new THREE.SphereGeometry(2.05, 28, 24)),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: textures.moonTex,
      emissive: new THREE.Color(PALETTE.moonGold),
      emissiveMap: textures.moonTex,
      emissiveIntensity: 1.55,
      roughness: 0.65
    })
  );
  giantMoonGroup.add(moonSphere);

  const moonHaloInner = new THREE.Sprite(new THREE.SpriteMaterial({
    map: textures.glowTex,
    color: PALETTE.moonGold,
    transparent: true,
    opacity: 0.62,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }));
  moonHaloInner.scale.set(7.8, 7.8, 1);
  giantMoonGroup.add(moonHaloInner);

  const moonHaloOuter = new THREE.Sprite(new THREE.SpriteMaterial({
    map: textures.glowTex,
    color: PALETTE.moonSilverBlue,
    transparent: true,
    opacity: 0.36,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  }));
  moonHaloOuter.scale.set(12.2, 12.2, 1);
  giantMoonGroup.add(moonHaloOuter);
  giantMoonGroup.traverse((c) => { c.userData.ignoreRaycaster = true; });

  // Ánh trăng #bae6fd & #fef08a (isViDaMoonLight = true)
  const moonDirLight = new THREE.DirectionalLight(PALETTE.moonSilverBlue, 1.45);
  moonDirLight.name = 'ViDa_Moonlight_DirectionalLight';
  moonDirLight.position.set(0.0, 8.2, -12.0);
  moonDirLight.target.position.set(0, 0.2, -3.5);
  moonDirLight.castShadow = false;
  moonDirLight.userData = {
    isViDaMoonLight: true,
    baseIntensity: 1.45,
    ignoreRaycaster: true
  };
  moonDirLight.target.userData = {
    isViDaMoonLight: true,
    isLightTarget: true,
    ignoreRaycaster: true
  };
  interiorGroup.add(moonDirLight);
  interiorGroup.add(moonDirLight.target);

  const moonGoldPoint = new THREE.PointLight(PALETTE.moonGold, 4.2, 16.0, 1.4);
  moonGoldPoint.name = 'ViDa_MoonGold_PointLight';
  moonGoldPoint.position.set(0, 4.2, -9.8);
  moonGoldPoint.castShadow = false;
  moonGoldPoint.userData = {
    isViDaMoonLight: true,
    baseIntensity: 4.2,
    ignoreRaycaster: true
  };
  interiorGroup.add(moonGoldPoint);

  // Sương mù trôi 3D (THREE.Points) + Màn sương billboard đa lớp
  const mistCount = 260;
  const rngMist = createSeededRandom(3025);
  const mistPos = new Float32Array(mistCount * 3);
  const mistPhase = new Float32Array(mistCount);
  const mistSize = new Float32Array(mistCount);
  for (let i = 0; i < mistCount; i++) {
    mistPos[i * 3] = (rngMist() - 0.5) * 23.0;
    mistPos[i * 3 + 1] = 0.25 + rngMist() * 2.8;
    mistPos[i * 3 + 2] = -13.2 + rngMist() * 12.2;
    mistPhase[i] = rngMist();
    mistSize[i] = 1.6 + rngMist() * 2.6;
  }
  const mistGeo = new THREE.BufferGeometry();
  mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
  mistGeo.setAttribute('aPhase', new THREE.BufferAttribute(mistPhase, 1));
  mistGeo.setAttribute('aSize', new THREE.BufferAttribute(mistSize, 1));
  const mistPointsMat = createMistPointsMaterial();
  const mistPoints = new THREE.Points(mistGeo, mistPointsMat);
  mistPoints.name = 'ViDa_Mist_Points';
  mistPoints.userData.ignoreRaycaster = true;
  mistPoints.userData.isParticle = true;
  interiorGroup.add(mistPoints);

  const mistBillboards = [];
  const mistPlaneGeo = prepGeo(new THREE.PlaneGeometry(5.6, 2.2));
  for (let i = 0; i < 10; i++) {
    const mMat = new THREE.MeshBasicMaterial({
      map: textures.mistTex,
      transparent: true,
      opacity: 0.28 + rngMist() * 0.14,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const mPlane = new THREE.Mesh(mistPlaneGeo, mMat);
    mPlane.name = `ViDa_Mist_Billboard_${i}`;
    const bx = (rngMist() - 0.5) * 16.0;
    const by = 0.75 + rngMist() * 1.1;
    const bz = -12.6 + rngMist() * 9.5;
    mPlane.position.set(bx, by, bz);
    mPlane.userData.ignoreRaycaster = true;
    mPlane.userData.isDynamic = true;
    interiorGroup.add(mPlane);
    mistBillboards.push({ mesh: mPlane, baseX: bx, phase: rngMist() * Math.PI * 2 });
  }

  // Bóng Hình Thiếu Nữ Áo Dài Trắng (Custom Fresnel & Distance-Fade Shader < 4.0m)
  const aoDaiGroup = new THREE.Group();
  aoDaiGroup.name = 'ViDa_AoDai_Apparition';
  aoDaiGroup.position.set(0, 0.08, -11.0);
  interiorGroup.add(aoDaiGroup);

  const aoDaiMat = createAoDaiApparitionMaterial();
  const aoDaiFigure = buildAoDaiFigureMesh(aoDaiMat);
  aoDaiGroup.add(aoDaiFigure);

  // Hạt bụi sáng trắng bay lên khi camera lại gần (< 4.0m) làm bóng dáng tan vào sương khói
  const whiteDustCount = 180;
  const rngDust = createSeededRandom(3026);
  const wdPos = new Float32Array(whiteDustCount * 3);
  const wdPhase = new Float32Array(whiteDustCount);
  const wdSpeed = new Float32Array(whiteDustCount);
  const wdSize = new Float32Array(whiteDustCount);
  for (let i = 0; i < whiteDustCount; i++) {
    wdPos[i * 3] = (rngDust() - 0.5) * 0.9;
    wdPos[i * 3 + 1] = rngDust() * 1.45;
    wdPos[i * 3 + 2] = (rngDust() - 0.5) * 0.9;
    wdPhase[i] = rngDust();
    wdSpeed[i] = 0.14 + rngDust() * 0.22;
    wdSize[i] = 0.35 + rngDust() * 0.55;
  }
  const whiteDustGeo = new THREE.BufferGeometry();
  whiteDustGeo.setAttribute('position', new THREE.BufferAttribute(wdPos, 3));
  whiteDustGeo.setAttribute('aPhase', new THREE.BufferAttribute(wdPhase, 1));
  whiteDustGeo.setAttribute('aSpeed', new THREE.BufferAttribute(wdSpeed, 1));
  whiteDustGeo.setAttribute('aSize', new THREE.BufferAttribute(wdSize, 1));
  const whiteDustMat = createLuminousDustMaterial({ colorA: 0xffffff, colorB: 0xe0f2fe, maxHeight: 2.8 });
  const whiteDustPoints = new THREE.Points(whiteDustGeo, whiteDustMat);
  whiteDustPoints.name = 'ViDa_AoDai_WhiteDust';
  whiteDustPoints.userData.ignoreRaycaster = true;
  whiteDustPoints.userData.isParticle = true;
  aoDaiGroup.add(whiteDustPoints);

  // =========================================================================
  // 7. BẢNG THÔNG TIN NGỌC BÍCH – TRÚC – GỖ MUN (CỬA VƯỜN & BẾN SÔNG TRĂNG)
  // =========================================================================
  const plaquePos = new THREE.Vector3(-3.35, 0.08, 9.6);
  const plaqueRotY = 0.52;
  const viDaPlaque = createRoomInfoPlaque({
    roomId: 'day_thon_vi_da',
    plaqueId: 'plaque_day_thon_vi_da',
    loreKey: 'plaque_day_thon_vi_da',
    styleTheme: 'ngoc_vi_da',
    badgeLabel: 'GIẤY DÓ ÁNH NGỌC • LỤA TRẮNG HUẾ',
    sectorCode: 'PHÒNG 302 • THƠ MỚI (1932–1945)',
    title: 'ĐÂY THÔN VĨ DẠ',
    author: 'Hàn Mặc Tử (1912–1940)',
    years: '1938',
    historicalPeriod: 'Phong trào Thơ Mới Việt Nam',
    subtitle: 'Hàn Mặc Tử (1912–1940) – Rút từ tập "Thơ Điên" (Đau Thương)',
    summary:
      'Khởi nguồn từ tấm bưu ảnh xứ Huế và lời thăm hỏi của Hoàng Thị Kim Cúc năm 1938, bài thơ mở ra khu vườn Vĩ Dạ ban mai mướt xanh như ngọc dưới nắng hàng cau, rồi trôi vào bến sông trăng huyền ảo và tan trong sương khói hư vô, khắc họa tình yêu đời tha thiết đến đau đớn của Hàn Mặc Tử.',
    mountMode: 'pedestal',
    includeSpotLight: false,
    position: plaquePos,
    rotationY: plaqueRotY,
    parent: interiorGroup
  });
  if (viDaPlaque) {
    viDaPlaque.name = 'ViDa_InfoPlaque_3D';
    viDaPlaque.userData.roomId = 'day_thon_vi_da';
    embellishJadeBambooPlaque(viDaPlaque);

    // Đèn SpotLight trắng ngà ấm (#fff6e0) chuyên biệt rọi bảng (tích hợp pool main.js)
    const plaqueSpot = new THREE.SpotLight(PALETTE.ivorySpot, 3.4, 5.8, Math.PI / 4, 0.65, 1.5);
    plaqueSpot.name = 'ViDa_Plaque_SpotLight';
    plaqueSpot.castShadow = false;
    plaqueSpot.position.set(0, 2.52, 1.28);
    plaqueSpot.target.position.set(0, 1.32, 0.04);
    plaqueSpot.userData.ignoreRaycaster = true;
    plaqueSpot.userData.isPlaqueSpotLight = true;
    plaqueSpot.target.userData.ignoreRaycaster = true;
    plaqueSpot.target.userData.isPlaqueSpotLight = true;
    viDaPlaque.add(plaqueSpot);
    viDaPlaque.add(plaqueSpot.target);
    viDaPlaque.userData.spotLight = plaqueSpot;

    if (viDaPlaque.userData?.plaqueProxy) {
      viDaPlaque.userData.plaqueProxy.userData.plaqueKey = 'plaque_day_thon_vi_da';
    }
    syncPlaqueWorldMetadata(viDaPlaque);

    const plaqueCollider = new THREE.Mesh(
      prepGeo(new THREE.BoxGeometry(1.58, 2.1, 0.72)),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    plaqueCollider.name = 'ViDa_InfoPlaque_Collider';
    plaqueCollider.position.set(plaquePos.x, plaquePos.y + 1.05, plaquePos.z);
    plaqueCollider.rotation.y = plaqueRotY;
    plaqueCollider.userData.ignoreRaycaster = true;
    interiorGroup.add(plaqueCollider);
    solidObstacleObjects.push(plaqueCollider);
  }

  // Bia thơ 3 khổ tại bến Sông Trăng (trang trí bổ trợ, không tạo trùng proxy)
  const dockSteleGroup = new THREE.Group();
  dockSteleGroup.name = 'ViDa_Dock_PoemStele';
  dockSteleGroup.position.set(-3.35, 0.08, 2.35);
  dockSteleGroup.rotation.y = 0.34;
  interiorGroup.add(dockSteleGroup);

  const steleStand = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(1.36, 0.9, 0.42)), new THREE.MeshStandardMaterial({ color: PALETTE.ebonyWood, roughness: 0.5 }));
  steleStand.position.y = 0.45;
  dockSteleGroup.add(steleStand);

  const steleBoard = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(1.38, 1.02, 0.07)), bambooCulmMat);
  steleBoard.position.y = 1.40;
  steleBoard.rotation.x = -0.14;
  dockSteleGroup.add(steleBoard);

  const dockPoemTex = createDockPoetryTexture(disposables);
  const steleFace = new THREE.Mesh(
    prepGeo(new THREE.PlaneGeometry(1.24, 0.90)),
    new THREE.MeshStandardMaterial({
      map: dockPoemTex,
      roughness: 0.65,
      emissive: new THREE.Color(0xf8fafc),
      emissiveMap: dockPoemTex,
      emissiveIntensity: 0.24
    })
  );
  steleFace.position.set(0, 1.40, 0.04);
  steleFace.rotation.x = -0.14;
  dockSteleGroup.add(steleFace);
  dockSteleGroup.traverse((c) => { c.userData.ignoreRaycaster = true; });
  solidObstacleObjects.push(dockSteleGroup);

  // =========================================================================
  // 8. NẠP caithonvida.glb, TUNING PBR & ĐĂNG KÝ HITBOX / LORE / AUDIO / TOUR
  // =========================================================================
  const wiredManagers = {
    scene: mainScene,
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

  function bindExhibitProxy(targetObj, { loreKey, localFocusCam, localFocusLook, padding = 0.28, minSize = 1.0 }) {
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
        roomId: 'day_thon_vi_da',
        styleTheme: 'ngoc_vi_da',
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
    bindExhibitProxy(viDaGardenHolder, {
      loreKey: 'vida_vuon_vi_da',
      localFocusCam: [2.8, 1.95, 7.2],
      localFocusLook: [0.0, 1.5, 4.1],
      padding: 0.30,
      minSize: 1.2
    });
    bindExhibitProxy(moonBoatHolder, {
      loreKey: 'vida_thuyen_trang',
      localFocusCam: [1.4, 2.05, 0.25],
      localFocusLook: [-2.1, 0.85, -2.75],
      padding: 0.32,
      minSize: 1.15
    });
  }

  let caithonGlbLoaded = false;
  let disposed = false;

  function tuneViDaFoliagePBR(modelRoot) {
    modelRoot.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = true;
      child.receiveShadow = true;
      child.frustumCulled = true;
      child.userData.preserveShadow = true;
      child.userData.isSharedCachedAsset = true;

      const origMats = Array.isArray(child.material) ? child.material : [child.material];
      const tunedMats = origMats.map((m) => {
        if (!m) return m;
        const c = m.color ? m.color.clone() : new THREE.Color(0x2f855a);
        const isGreenish = c.g >= c.r * 0.95 && c.g >= c.b * 0.95;
        return new THREE.MeshPhysicalMaterial({
          map: m.map || null,
          normalMap: m.normalMap || null,
          roughnessMap: m.roughnessMap || null,
          color: isGreenish ? c.lerp(new THREE.Color(0x2fb86f), 0.22) : c,
          roughness: typeof m.roughness === 'number' ? Math.min(0.68, Math.max(0.32, m.roughness)) : 0.48,
          metalness: typeof m.metalness === 'number' ? Math.min(0.18, m.metalness) : 0.04,
          sheen: isGreenish ? 0.58 : 0.22,
          sheenColor: new THREE.Color(isGreenish ? 0x6ee7b7 : 0xffe89e),
          sheenRoughness: 0.42,
          clearcoat: isGreenish ? 0.20 : 0.08,
          clearcoatRoughness: 0.34,
          emissive: new THREE.Color(isGreenish ? 0x063f24 : 0x0c0b08),
          emissiveIntensity: isGreenish ? 0.14 : 0.04,
          alphaTest: m.alphaTest || 0,
          transparent: Boolean(m.transparent),
          opacity: m.opacity ?? 1.0,
          side: m.transparent ? THREE.DoubleSide : THREE.FrontSide
        });
      });
      child.material = Array.isArray(child.material) ? tunedMats : tunedMats[0];
    });
  }

  loadGlbCached(['/models/caithonvida.glb', '/model/caithonvida.glb'], {
    maxTextureSize: 1024,
    disableMipmaps: true
  })
    .then((rawScene) => {
      if (!rawScene || disposed) return;
      caithonGlbLoaded = true;
      viDaGardenHolder.remove(gardenPlaceholder);
      gardenPlaceholder.geometry.dispose();
      gardenPlaceholder.material.dispose();

      // Chuẩn hóa bằng Box3 cân đối tại sân trung tâm vườn Vĩ Dạ
      const rawBox = new THREE.Box3().setFromObject(rawScene);
      const rawSize = new THREE.Vector3();
      rawBox.getSize(rawSize);
      const maxHoriz = Math.max(rawSize.x, rawSize.z, 0.001);
      const targetScale = Math.min(3.35 / Math.max(rawSize.y, 0.001), 4.0 / maxHoriz);
      rawScene.scale.multiplyScalar(targetScale);
      rawScene.updateMatrixWorld(true);

      const scaledBox = new THREE.Box3().setFromObject(rawScene);
      const scaledCenter = new THREE.Vector3();
      scaledBox.getCenter(scaledCenter);
      rawScene.position.set(-scaledCenter.x, -scaledBox.min.y + 0.08, -scaledCenter.z);

      tuneViDaFoliagePBR(rawScene);
      viDaGardenHolder.add(rawScene);

      if (wiredManagers.hitboxManager || wiredManagers.loreGuide) {
        bindExhibitProxy(viDaGardenHolder, {
          loreKey: 'vida_vuon_vi_da',
          localFocusCam: [2.8, 1.95, 7.2],
          localFocusLook: [0.0, 1.5, 4.1],
          padding: 0.30,
          minSize: 1.2
        });
      }
    })
    .catch((err) => {
      console.warn('[DayThonViDaRoom] Không thể tải caithonvida.glb:', err?.message || err);
    });

  // =========================================================================
  // 9. HAI NGUỒN THREE.POSITIONALAUDIO (VƯỜN BAN MAI & BẾN SÔNG TRĂNG HUẾ)
  // =========================================================================
  const gardenAudioAnchor = new THREE.Object3D();
  gardenAudioAnchor.name = 'ViDa_Audio_Garden';
  gardenAudioAnchor.position.set(0.0, 1.8, 6.2);
  gardenAudioAnchor.userData.ignoreRaycaster = true;
  interiorGroup.add(gardenAudioAnchor);

  const riverAudioAnchor = new THREE.Object3D();
  riverAudioAnchor.name = 'ViDa_Audio_River';
  riverAudioAnchor.position.set(-1.5, 1.2, -5.2);
  riverAudioAnchor.userData.ignoreRaycaster = true;
  interiorGroup.add(riverAudioAnchor);

  const positionalAudioNodes = [];
  let audioUnlockBound = false;

  function setupProceduralPositionalAudio() {
    const spatial = wiredManagers.spatialAudio || (typeof window !== 'undefined' ? window.__spatialAudio : null);
    const listener = spatial?.listener;
    if (!listener || positionalAudioNodes.length > 0) return;

    const specs = [
      { anchor: gardenAudioAnchor, kind: 'garden', refDist: 4.5, maxDist: 20.0, vol: 0.42 },
      { anchor: riverAudioAnchor, kind: 'river', refDist: 5.0, maxDist: 22.0, vol: 0.46 }
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
            const buf = createViDaAudioBuffer(ctx, entry.kind);
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
  // 9B. CỔNG DỊCH CHUYỂN & CÕI THẾ GIỚI MỞ "ĐÂY THÔN VĨ DẠ"
  // Đặt tại vùng sân phải Zone 1 (5.6, 0.08, 8.8), rotY = -0.58 hướng về lối vào
  // =========================================================================
  const portalLocalPos = new THREE.Vector3(5.6, 0.08, 8.8);
  const portalLocalRotY = -0.58;
  const storyRealm = createDayThonViDaStoryRealm({
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

  // Collider trụ cổng vòm trúc xanh (bảo vệ qua rebuildAllMuseumHitboxes)
  const portalColliders = [];
  if (storyRealm?.portalGroup) {
    [-1.68, 1.68].forEach((px, idx) => {
      const pierCol = new THREE.Mesh(
        prepGeo(new THREE.BoxGeometry(0.95, 3.6, 0.95)),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      pierCol.name = `ViDa_StoryPortal_PierCollider_${idx}`;
      pierCol.position.set(px, 1.8, 0);
      pierCol.userData.ignoreRaycaster = true;
      storyRealm.portalGroup.add(pierCol);
      portalColliders.push(pierCol);
      solidObstacleObjects.push(pierCol);
    });
  }

  // =========================================================================
  // 10. ĐĂNG KÝ HITBOXES, LORE, WEBXR TELEPORT & 4-BEAT AUTO-TOUR PHÒNG 302
  // =========================================================================
  function registerHitboxes(hitboxManager) {
    const hbm = hitboxManager || (typeof window !== 'undefined' ? window.__museumHitboxManager : null);
    if (!hbm) return;
    wiredManagers.hitboxManager = hbm;

    roomGroup.updateMatrixWorld(true);

    solidObstacleObjects.forEach((obj, idx) => {
      hbm.registerSolidObjectCollider(obj, {
        shrinkFactor: 0.96,
        tag: `DayThonViDa_Solid_${idx}`,
        helperColor: 0x34d399,
        realm: 'museum'
      });
    });

    bindInteractiveExhibits();

    if (viDaPlaque) {
      registerPlaqueWithSystems(viDaPlaque, {
        hitboxManager: hbm,
        loreGuide: wiredManagers.loreGuide || (typeof window !== 'undefined' ? window.__loreGuide : null),
        realm: 'museum',
        onFocusCamera: () => {
          const camMgr = wiredManagers.cameraManager || (typeof window !== 'undefined' ? window.__museumCameraManager : null);
          if (!camMgr) return;
          if (typeof camMgr.smoothZoomToFocus === 'function') {
            camMgr.smoothZoomToFocus(viDaPlaque, { distance: 2.25 });
          } else if (typeof camMgr.setView === 'function') {
            const meta = syncPlaqueWorldMetadata(viDaPlaque);
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
      roomTourState.waypoints = getDayThonViDaTourWaypoints(pose);
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
      const handled = wiredManagers.autoTour.startRoomTour('day_thon_vi_da');
      if (handled) return true;
    }
    roomTourState.waypoints = getDayThonViDaTourWaypoints(pose);
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
  // 11. CẬP NHẬT ATMOSPHERE KÉP (BAN MAI VĨ DẠ <-> ĐÊM SƯƠNG KHÓI #0f172a)
  // =========================================================================
  let atmBlend = 0;
  let zoneProgress = 0;
  let capturedOriginals = false;
  const savedBgColor = new THREE.Color(0xdca878);
  const savedFogColor = new THREE.Color(0xdca878);
  let savedFogDensity = 0.00075;
  const savedAtriumLights = [];

  const morningSkyCol = new THREE.Color(PALETTE.morningSky);
  const morningFogCol = new THREE.Color(PALETTE.morningFog);
  const nightColor = new THREE.Color(PALETTE.twilightNight);
  const targetRoomBg = new THREE.Color();
  const targetRoomFog = new THREE.Color();
  const aoDaiWorldPos = new THREE.Vector3();

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
        obj.userData?.isViDaMorningLight ||
        obj.userData?.isViDaMoonLight ||
        obj.userData?.isViDaShadowLight ||
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

  function getRoomLocalCoords(camPos) {
    const dx = camPos.x - resolvedCenter.x;
    const dz = camPos.z - resolvedCenter.z;
    const cosY = Math.cos(interiorGroup.rotation.y);
    const sinY = Math.sin(interiorGroup.rotation.y);
    return {
      lx: dx * cosY - dz * sinY,
      lz: dx * sinY + dz * cosY
    };
  }

  function isInsideViDaRoom(camPos) {
    if (!camPos) return false;
    const { lx, lz } = getRoomLocalCoords(camPos);
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

    const inside = isInsideViDaRoom(camera.position);
    if (inside && !capturedOriginals) {
      captureAtriumState();
    }

    const target = inside ? 1 : 0;
    const step = Math.min(1, Math.max(0.04, delta * 3.2));
    const prevBlend = atmBlend;
    atmBlend += (target - atmBlend) * step;

    if (inside) {
      const { lz } = getRoomLocalCoords(camera.position);
      // Zone 1 (+Z > +3.5): ban mai; Zone 2/3 (+3.5 -> -6.5): chuyển êm sang #0f172a sương khói
      const rawZ = Math.min(1, Math.max(0, (3.8 - lz) / 9.8));
      zoneProgress += (rawZ - zoneProgress) * Math.min(1, Math.max(0.05, delta * 3.0));
    }

    if (Math.abs(atmBlend - prevBlend) > 0.0005 || inside) {
      targetRoomBg.copy(morningSkyCol).lerp(nightColor, zoneProgress);
      targetRoomFog.copy(morningFogCol).lerp(nightColor, zoneProgress);
      const targetDensity = 0.014 + zoneProgress * 0.028;

      if (!sceneRef.background || !sceneRef.background.isColor) {
        sceneRef.background = savedBgColor.clone();
      }
      sceneRef.background.copy(savedBgColor).lerp(targetRoomBg, atmBlend);

      if (!sceneRef.fog || !sceneRef.fog.isFogExp2) {
        sceneRef.fog = new THREE.FogExp2(savedFogColor.getHex(), savedFogDensity);
      }
      sceneRef.fog.color.copy(savedFogColor).lerp(targetRoomFog, atmBlend);
      sceneRef.fog.density = savedFogDensity + (targetDensity - savedFogDensity) * atmBlend;

      const lightScale = 1.0 - atmBlend * (0.35 + 0.52 * zoneProgress);
      for (let i = 0; i < savedAtriumLights.length; i++) {
        const entry = savedAtriumLights[i];
        entry.light.intensity = entry.baseIntensity * lightScale;
      }

      waterMat.uniforms.uFogColor.value.copy(sceneRef.fog.color);
      waterMat.uniforms.uFogDensity.value = sceneRef.fog.density;
    } else if (!inside && prevBlend > 0 && atmBlend <= 0.001) {
      atmBlend = 0;
      zoneProgress = 0;
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
      const inside = isInsideViDaRoom(camera.position);
      distSq = camera.position.distanceToSquared(roomGroup.position);
      nearOrInside = inside || (Math.abs(camera.position.y - resolvedCenter.y) <= 6.5 && distSq <= 28 * 28);
      if (!inside && distSq > ROOM_PROXIMITY_SQ) {
        if (atmBlend > 0) {
          updateAtmosphere(dt, camera);
        }
        morningDirLight.intensity = 0;
        moonDirLight.intensity = 0;
        moonGoldPoint.intensity = 0;
        return;
      }
    }

    // 1. Bảo toàn shadow cho nắng ban mai & caithonvida.glb khi ở trong/gần phòng
    if (nearOrInside) {
      if (!morningDirLight.castShadow) morningDirLight.castShadow = true;
      if (!terracottaPath.receiveShadow) terracottaPath.receiveShadow = true;
      if (!gardenLawn.receiveShadow) gardenLawn.receiveShadow = true;
      if (caithonGlbLoaded) {
        viDaGardenHolder.traverse((c) => {
          if (c.isMesh && !c.userData?.ignoreRaycaster && (!c.castShadow || !c.receiveShadow)) {
            c.castShadow = true;
            c.receiveShadow = true;
          }
        });
      }
    }

    const lightGate = nearOrInside ? 1.0 : Math.max(0, 1.0 - (Math.sqrt(distSq) - 24) / 8);
    morningDirLight.intensity = morningDirLight.userData.baseIntensity * lightGate * (1.0 - zoneProgress * 0.25);
    moonDirLight.intensity = moonDirLight.userData.baseIntensity * (0.35 + 0.65 * Math.max(atmBlend, lightGate));
    moonGoldPoint.intensity = moonGoldPoint.userData.baseIntensity * (0.4 + 0.6 * Math.max(atmBlend, lightGate));

    // 2. Shader Sông Trăng, God Rays, Nắng Loang, Hoa Bắp lay & Thuyền Nan bồng bềnh
    waterMat.uniforms.uTime.value = elapsedTime;
    godRayMat.uniforms.uTime.value = elapsedTime;
    dappledMat.uniforms.uTime.value = elapsedTime;
    reedTimeUniform.value = elapsedTime;
    boatDustMat.uniforms.uTime.value = elapsedTime;
    mistPointsMat.uniforms.uTime.value = elapsedTime;
    aoDaiMat.uniforms.uTime.value = elapsedTime;
    whiteDustMat.uniforms.uTime.value = elapsedTime;

    moonBoatHolder.position.y = 0.075 + Math.sin(elapsedTime * 1.15) * 0.025;
    moonBoatHolder.rotation.z = Math.sin(elapsedTime * 0.92) * 0.025;
    moonBoatHolder.rotation.x = Math.cos(elapsedTime * 0.78) * 0.015;

    // 3. Màn sương billboard trôi nhẹ & luôn quay về camera
    for (let i = 0; i < mistBillboards.length; i++) {
      const mb = mistBillboards[i];
      mb.mesh.position.x = mb.baseX + Math.sin(elapsedTime * 0.24 + mb.phase) * 1.65;
      if (camera?.position) {
        mb.mesh.lookAt(camera.position.x, mb.mesh.getWorldPosition(aoDaiWorldPos).y, camera.position.z);
      }
    }

    // 4. Bóng Hình Thiếu Nữ Áo Dài Trắng mờ dần khi camera < 4.0m & nhả hạt bụi sáng trắng
    let proximityBurst = 0.45;
    if (camera?.position) {
      aoDaiGroup.getWorldPosition(aoDaiWorldPos);
      aoDaiWorldPos.y += 0.9;
      const distToAoDai = camera.position.distanceTo(aoDaiWorldPos);
      const tFade = Math.min(1, Math.max(0, (distToAoDai - 1.25) / (4.0 - 1.25)));
      const smoothFade = tFade * tFade * (3.0 - 2.0 * tFade);
      aoDaiMat.uniforms.uProximityAlpha.value = smoothFade;
      proximityBurst = 0.42 + (1.0 - smoothFade) * 0.95;
    }
    whiteDustMat.uniforms.uBurstIntensity.value = proximityBurst;

    // 5. Cập nhật không gian Ban Mai <-> #0f172a
    updateAtmosphere(dt, camera);
  }

  function setupContext(ctx = {}) {
    if (ctx.scene || ctx.mainScene) wiredManagers.scene = ctx.mainScene || ctx.scene;
    if (ctx.camera) wiredManagers.camera = ctx.camera;
    if (ctx.renderer) wiredManagers.renderer = ctx.renderer;
    if (ctx.cameraManager) wiredManagers.cameraManager = ctx.cameraManager;
    if (ctx.hitboxManager) wiredManagers.hitboxManager = ctx.hitboxManager;
    if (ctx.loreGuide) wiredManagers.loreGuide = ctx.loreGuide;
    if (ctx.spatialAudio) wiredManagers.spatialAudio = ctx.spatialAudio;
    if (ctx.audioManager) wiredManagers.audioManager = ctx.audioManager;
    if (ctx.xrTeleport) wiredManagers.xrTeleport = ctx.xrTeleport;
    if (ctx.autoTour) wiredManagers.autoTour = ctx.autoTour;

    if (wiredManagers.renderer?.shadowMap) {
      wiredManagers.renderer.shadowMap.enabled = true;
    }
    terracottaPath.receiveShadow = true;
    gardenLawn.receiveShadow = true;
    if (caithonGlbLoaded) {
      tuneViDaFoliagePBR(viDaGardenHolder);
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
    roomId: 'day_thon_vi_da',
    isDayThonViDaRoom: true,
    interiorGroup,
    walkableFloors,
    plaque: viDaPlaque,
    morningLight: morningDirLight,
    shadowLight: morningDirLight,
    moonLight: moonDirLight,
    loreKeys: ['plaque_day_thon_vi_da', 'vida_vuon_vi_da', 'vida_thuyen_trang'],
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

export default buildDayThonViDaExhibition;
