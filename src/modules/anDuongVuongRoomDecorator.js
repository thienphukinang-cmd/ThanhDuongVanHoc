// anDuongVuongRoomDecorator.js — ĐIỆN THỜ SỬ THI ÂU LẠC (100% CLEAN SLATE REDESIGN)
// Master Heritage Architecture & Exhibition System (60+ FPS, Zero-Domino, Real Chiaroscuro Lighting)
import * as THREE from 'three';
import { getSpatialRegistry } from './spatialRegistry.js';
import { loadGlbCached, getSharedGltfLoader } from '../utils/modelLoaderHelper.js';
import { AnDuongVuongWorld } from '../worlds/anDuongVuongWorld.js';
import { AnDuongVuongLoreOverlay } from './anDuongVuongLoreOverlay.js';
import { playBookVortexCutscene } from './bookVortexCutscene.js';
import { registerInteractiveBook } from './PortalInteraction.js';
import { AN_DUONG_VUONG_TOUR_WAYPOINTS } from './museumCuratorAndTourSystem.js';

// ─── Constants & Architecture Offsets ─────────────────────────────────────────
export const ADV_REALM_ORIGIN = new THREE.Vector3(260, 420, -450);
export const ADV_OBS_PLATFORM_OFFSET = new THREE.Vector3(0, 18.0, 42.0);
export const ADV_OBS_LOOK_TARGET_OFFSET = new THREE.Vector3(0, 4.0, 0);

// Color Palette
const PALETTE = {
  jadeDeep: '#00382b',
  jadeCore: '#008f75',
  jadeGlow: '#00f5d4',
  goldRim: '#ffd700',
  goldKham: '#d4af37',
  goldAmber: '#ffaa00',
  chiaroscuroBeam: '#ffbe55',
  terracotta: '#8e371d',
  terracottaDark: '#4e1a0b',
  stoneThanhHoa: '#262930',
  limWood: '#24140e',
  limWoodHighlight: '#3b1e14',
  nightSky: '#12161f',
  nightSkyDeep: '#04070e'
};

// ─── Module-level state ───────────────────────────────────────────────────────
let _roomGroup = null;
let _disposables = [];
let _lights = [];
let _sounds = [];
let _audioCtx = null;
let _audioSources = [];
let _vortexUniforms = null;
let _pearlMesh = null;
let _clawTriggerMesh = null;
let _clawLight = null;
let _wellLight = null;
let _backdropSeaMesh = null;
let _featherPoints = null;
let _waterCausticMesh = null;
let _portalStation = null;
let _portalLight = null;
let _portalSignMesh = null;
let _portalClickProxy = null;
let _proximityArmed = true;
const _portalWorldPos = new THREE.Vector3();
const _cameraWorldPos = new THREE.Vector3();
export let teleportBook = null;
let _activeExhibition = null;

// ─── Self-Healing Geometry Sanitizer ─────────────────────────────────────────
function prepGeo(g) {
  if (!g) return g;
  try {
    const sanitizeAttr = (attr) => {
      if (!attr || !attr.array) return;
      const arr = attr.array;
      const len = arr.length;
      for (let i = 0; i < len; i++) {
        if (!Number.isFinite(arr[i])) {
          arr[i] = 0;
        }
      }
      attr.needsUpdate = true;
    };

    sanitizeAttr(g.attributes?.position);
    sanitizeAttr(g.attributes?.normal);
    sanitizeAttr(g.attributes?.uv);

    g.computeVertexNormals();
    g.computeBoundingBox();
    g.computeBoundingSphere();
  } catch (err) {
    console.warn('[prepGeo] geometry repair warning:', err?.message);
  }
  return g;
}

// ─── 1. Soft Hand-painted White Goose Feather Texture (128x128 Canvas) ────────
function createFeatherTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, 128, 128);

  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 58);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.35, 'rgba(240, 248, 255, 0.7)');
  grad.addColorStop(0.7, 'rgba(220, 235, 250, 0.25)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');

  ctx.save();
  ctx.translate(64, 64);
  ctx.rotate(Math.PI / 4);

  // Vane body (hình chiếc lông ngỗng mềm thuôn dài)
  ctx.beginPath();
  ctx.moveTo(0, -48);
  ctx.bezierCurveTo(14, -28, 16, 20, 0, 48);
  ctx.bezierCurveTo(-16, 20, -14, -28, 0, -48);
  ctx.fillStyle = grad;
  ctx.fill();

  // Central quill shaft (sống lông ngỗng)
  ctx.beginPath();
  ctx.moveTo(0, -48);
  ctx.lineTo(0, 52);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Soft lateral barbs (sợi tơ lông mềm)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 0.8;
  for (let y = -36; y <= 36; y += 6) {
    const len = 12 * (1 - Math.abs(y) / 45);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(len, y + 4);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(-len, y + 4);
    ctx.stroke();
  }

  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

// ─── 2. Thanh Hóa Mossy Stone Floor with 8m Dong Son Inlay (2048x2048) ────────
function createDongSonFloorTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Dark Thanh Hóa stone tile background (#262930)
  ctx.fillStyle = '#262930';
  ctx.fillRect(0, 0, 2048, 2048);

  // Tile grid lines (60x60cm stone pavers)
  ctx.strokeStyle = '#1b1d22';
  ctx.lineWidth = 2.5;
  const tileSize = 80;
  for (let x = 0; x < 2048; x += tileSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 2048);
    ctx.stroke();
  }
  for (let y = 0; y < 2048; y += tileSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(2048, y);
    ctx.stroke();
  }

  // Moss and stone texture stippling
  for (let i = 0; i < 4000; i++) {
    const rx = Math.random() * 2048;
    const ry = Math.random() * 2048;
    const v = Math.random() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${v}, ${v}, ${v}, 0.035)`;
    ctx.fillRect(rx, ry, 3, 3);
  }

  // 2. Terracotta Central Pathway leading from South Entrance to the Dais
  // X: from 1024 - 180 to 1024 + 180 (approx 3.6m wide pathway), Y from center to South border
  const pathLeft = 1024 - 180;
  const pathWidth = 360;
  const terraPathGrad = ctx.createLinearGradient(pathLeft, 0, pathLeft + pathWidth, 0);
  terraPathGrad.addColorStop(0, '#5a2012');
  terraPathGrad.addColorStop(0.2, '#7c3218');
  terraPathGrad.addColorStop(0.5, '#8e371d');
  terraPathGrad.addColorStop(0.8, '#7c3218');
  terraPathGrad.addColorStop(1, '#5a2012');

  ctx.fillStyle = terraPathGrad;
  ctx.fillRect(pathLeft, 1024, pathWidth, 1024);

  // Terracotta path brick joints
  ctx.strokeStyle = '#321005';
  ctx.lineWidth = 2.0;
  for (let py = 1024; py < 2048; py += 45) {
    ctx.beginPath();
    ctx.moveTo(pathLeft, py);
    ctx.lineTo(pathLeft + pathWidth, py);
    ctx.stroke();
    // Staggered vertical joints
    const offset = (py / 45) % 2 === 0 ? 0 : 30;
    for (let px = pathLeft + offset; px < pathLeft + pathWidth; px += 60) {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, py + 45);
      ctx.stroke();
    }
  }

  // 3. Central 8.0m Dong Son Bronze Drum Medallion (Center 1024, 1024)
  const cx = 1024;
  const cy = 1024;
  const maxR = 455; // 4.0m radius (diameter 8.0m relative to room bounds)

  // Terracotta Brick Border Ring
  const terraR = 535;
  const terraGrad = ctx.createRadialGradient(cx, cy, maxR, cx, cy, terraR);
  terraGrad.addColorStop(0, '#7c3218');
  terraGrad.addColorStop(0.5, '#682512');
  terraGrad.addColorStop(1, '#4e1a0b');
  ctx.beginPath();
  ctx.arc(cx, cy, terraR, 0, Math.PI * 2);
  ctx.fillStyle = terraGrad;
  ctx.fill();

  // Radial joints on terracotta apron
  ctx.strokeStyle = '#321005';
  ctx.lineWidth = 2.0;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 32) {
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * maxR, cy + Math.sin(a) * maxR);
    ctx.lineTo(cx + Math.cos(a) * terraR, cy + Math.sin(a) * terraR);
    ctx.stroke();
  }
  ctx.strokeStyle = '#8e371d';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(cx, cy, terraR, 0, Math.PI * 2);
  ctx.stroke();

  // Bronze Drum Base Background
  const baseGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, maxR);
  baseGrad.addColorStop(0, '#5a4018');
  baseGrad.addColorStop(0.6, '#382810');
  baseGrad.addColorStop(1, '#20180a');
  ctx.beginPath();
  ctx.arc(cx, cy, maxR, 0, Math.PI * 2);
  ctx.fillStyle = baseGrad;
  ctx.fill();

  // Outer gold rim
  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(cx, cy, maxR - 4, 0, Math.PI * 2);
  ctx.stroke();

  // Sawtooth geometric ring (r ~ 425px)
  ctx.strokeStyle = '#c59b27';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(cx, cy, 425, 0, Math.PI * 2);
  ctx.stroke();

  // Flying Lac Birds Ring (16 birds, r ~ 360px)
  const numBirds = 16;
  ctx.fillStyle = '#ffd700';
  for (let i = 0; i < numBirds; i++) {
    const angle = (i / numBirds) * Math.PI * 2;
    const bx = cx + Math.cos(angle) * 360;
    const by = cy + Math.sin(angle) * 360;

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(angle + Math.PI / 2);

    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.bezierCurveTo(8, -6, 22, -10, 26, 2);
    ctx.bezierCurveTo(16, 2, 6, 4, 0, 16);
    ctx.bezierCurveTo(-6, 4, -16, 2, -26, 2);
    ctx.bezierCurveTo(-22, -10, -8, -6, 0, -18);
    ctx.fill();

    ctx.restore();
  }

  // Intermediate concentric geometric rings
  ctx.strokeStyle = '#a38025';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 300, 0, Math.PI * 2);
  ctx.stroke();

  // Bead dots ring (48 beads, r ~ 275px)
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * 275, cy + Math.sin(a) * 275, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#f59e0b';
    ctx.fill();
  }

  // Central 14-Pointed Solar Star (r ~ 240px)
  ctx.beginPath();
  const points = 14;
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? 240 : 80;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  const starGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 240);
  starGrad.addColorStop(0, '#ffe082');
  starGrad.addColorStop(0.5, '#d4af37');
  starGrad.addColorStop(1, '#8a6b32');
  ctx.fillStyle = starGrad;
  ctx.fill();
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Center hub
  ctx.beginPath();
  ctx.arc(cx, cy, 25, 0, Math.PI * 2);
  ctx.fillStyle = '#ffecb3';
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ─── 3. Information Plaque Texture (1024x768) ─────────────────────────────────
function createPlaqueTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Patina bronze textured background
  ctx.fillStyle = '#1c2826';
  ctx.fillRect(0, 0, 1024, 768);

  // Antique patina bronze mottling & oxidation
  for (let i = 0; i < 600; i++) {
    const px = Math.random() * 1024;
    const py = Math.random() * 768;
    const pr = 6 + Math.random() * 28;
    const patinaGrad = ctx.createRadialGradient(px, py, 1, px, py, pr);
    patinaGrad.addColorStop(0, 'rgba(38, 77, 68, 0.28)');
    patinaGrad.addColorStop(0.6, 'rgba(26, 52, 46, 0.14)');
    patinaGrad.addColorStop(1, 'rgba(28, 40, 38, 0)');
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fillStyle = patinaGrad;
    ctx.fill();
  }

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 14;
  ctx.strokeRect(16, 16, 992, 736);

  ctx.strokeStyle = '#a38025';
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 36, 952, 696);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
  ctx.fillText('TRUYỀN THUYẾT AN DƯƠNG VƯƠNG VÀ MỊ CHÂU – TRỌNG THỦY', 512, 115);

  ctx.fillStyle = '#00f5d4';
  ctx.font = 'italic 21px "Segoe UI", Arial, sans-serif';
  ctx.fillText('Nguồn gốc: Văn học Dân gian Việt Nam – Cụm truyền thuyết thời đại Âu Lạc (Thế kỷ III TCN)', 512, 175);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '20px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'left';
  const lines = [
    '• XÂY THÀNH CỔ LOA: Thần Kim Quy giúp Vua xây 9 vòng xoắn ốc kiên cố, ban vuốt làm lẫy nỏ thần.',
    '• NỎ THẦN LIÊN CHÂU: Linh Quang Kim Quy Thần Cơ \'bách phát bách trúng\', đánh tan trăm vạn quân Triệu Đà.',
    '• BI KỊCH LÒNG TIN: Trọng Thủy cầu hôn Mị Châu, lén đánh tráo lẫy nỏ mang về phương Bắc dấy binh.',
    '• KẾT CỤC DẠ SƠN: Mị Châu rải áo lông ngỗng chỉ đường; Vua chém Mị Châu rồi theo Rùa Vàng xuống biển.',
    '• GIẾNG NGỌC MINH CHÂU: Máu Mị Châu hóa ngọc trai biển Đông; rửa nước giếng Cổ Loa ngọc sáng ngời.',
    '• BÀI HỌC LỊCH SỬ: Lời răn muôn đời về tinh thần cảnh giác, giữ vững chủ quyền độc lập dân tộc.'
  ];
  lines.forEach((line, idx) => {
    ctx.fillText(line, 55, 245 + idx * 56);
  });

  ctx.fillStyle = '#f59e0b';
  ctx.font = 'italic bold 21px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('▶ Nhấp chuột để mở Thuyết minh Di sản & 4 Hồi Sử thi chi tiết (ESC để quay lại)', 512, 695);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ─── 4. Portal Lacquer Sign Texture ───────────────────────────────────────────
function createPortalSignTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#081412';
  ctx.fillRect(0, 0, 1024, 320);

  ctx.strokeStyle = '#d4af37';
  ctx.lineWidth = 8;
  ctx.strokeRect(8, 8, 1008, 304);

  ctx.strokeStyle = '#00f5d4';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(20, 20, 984, 280);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
  ctx.fillText('BƯỚC VÀO HUYỀN SỬ CỔ LOA – DẠ SƠN', 512, 95);

  ctx.fillStyle = '#00f5d4';
  ctx.font = 'italic 24px "Segoe UI", Arial, sans-serif';
  ctx.fillText('Cõi Mở Dạ Sơn & Thần Kim Quy • Sử Thi Âu Lạc', 512, 160);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '20px "Segoe UI", Arial, sans-serif';
  ctx.fillText('Tiến lại gần (< 2.2m) hoặc Nhấp chuột để Dịch Chuyển Thời Không (240m x 240m)', 512, 230);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ─── Tangent-Space Linear Normal Map Generator (LinearSRGBColorSpace) ────────
export function heightCanvasToLinearNormalMap(heightCanvas, strength = 2.6, repeatX = 1, repeatY = 1, disposables = _disposables) {
  if (typeof document === 'undefined' || !heightCanvas) return null;
  const w = heightCanvas.width;
  const h = heightCanvas.height;
  const srcCtx = heightCanvas.getContext?.('2d');
  if (!srcCtx) return null;
  const src = srcCtx.getImageData(0, 0, w, h).data;
  const nCanvas = document.createElement('canvas');
  nCanvas.width = w;
  nCanvas.height = h;
  const nCtx = nCanvas.getContext('2d');
  if (!nCtx) return null;
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

  const tex = new THREE.CanvasTexture(nCanvas);
  tex.colorSpace = THREE.LinearSRGBColorSpace || THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.needsUpdate = true;
  if (Array.isArray(disposables)) {
    disposables.push(tex);
  }
  return tex;
}

// ─── Floor & Lim Wood Height Canvas Generators ──────────────────────────────
export function createFloorHeightCanvas() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Base neutral height (128)
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 512, 512);

  // Stone tiles grid grooves (darker = recessed joints)
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 4;
  const tileSize = 64;
  for (let x = 0; x <= 512; x += tileSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  for (let y = 0; y <= 512; y += tileSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  // Terracotta central pathway raised slightly
  const pLeft = 512 / 2 - 45;
  const pWidth = 90;
  ctx.fillStyle = '#9c9c9c';
  ctx.fillRect(pLeft, 256, pWidth, 256);

  // Concentric rings for Dong Son bronze medallion center
  const cx = 256;
  const cy = 256;
  for (let r = 24; r < 210; r += 26) {
    ctx.strokeStyle = r % 52 === 0 ? '#d5d5d5' : '#4d4d4d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  return canvas;
}

export function createLimWoodHeightCanvas() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  // Vertical wood grain striations
  for (let x = 0; x < 256; x += 4) {
    const shade = 100 + ((x * 17) % 55);
    ctx.strokeStyle = `rgb(${shade}, ${shade}, ${shade})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + ((x % 8) - 4), 256);
    ctx.stroke();
  }

  return canvas;
}

// ─── Individual Pedestal Antique Bronze Name Plaques ────────────────────────
export function createMiniBronzePlaque(title, subtitle, { width = 1.25, height = 0.34, fontScale = 1.0 } = {}, disposables = _disposables) {
  const plaqueGroup = new THREE.Group();
  plaqueGroup.name = `ADV_Mini_Plaque_${title.replace(/[^a-zA-Z0-9]/g, '_')}`;

  let tex = null;
  if (typeof document !== 'undefined') {
    const canvasW = 512;
    const canvasH = 160;
    const canvas = document.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      // Dark antique bronze gradient
      const g = ctx.createLinearGradient(0, 0, canvasW, canvasH);
      g.addColorStop(0, '#1f1810');
      g.addColorStop(0.5, '#3b2c16');
      g.addColorStop(1, '#18130d');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvasW, canvasH);

      // Gold antique double border
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 4;
      ctx.strokeRect(8, 8, canvasW - 16, canvasH - 16);
      ctx.strokeStyle = 'rgba(255, 224, 130, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(14, 14, canvasW - 28, canvasH - 28);

      const fontStack = '"Times New Roman", "Segoe UI", Arial, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Title in gold
      ctx.fillStyle = '#fde68a';
      ctx.font = `bold ${Math.round(22 * fontScale)}px ${fontStack}`;
      ctx.fillText(title, canvasW * 0.5, canvasH * 0.38, canvasW - 36);

      // Subtitle in jade/emerald
      if (subtitle) {
        ctx.fillStyle = '#00f5d4';
        ctx.font = `italic ${Math.round(15 * fontScale)}px ${fontStack}`;
        ctx.fillText(subtitle, canvasW * 0.5, canvasH * 0.70, canvasW - 36);
      }

      tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      if (Array.isArray(disposables)) disposables.push(tex);
    }
  }

  // Face plate
  const plateGeo = prepGeo(new THREE.PlaneGeometry(width, height));
  const plateMat = new THREE.MeshStandardMaterial({
    map: tex,
    color: tex ? 0xffffff : 0x8a6b32,
    roughness: 0.38,
    metalness: 0.45,
    side: THREE.FrontSide
  });
  if (Array.isArray(disposables)) disposables.push(plateMat);
  const plateMesh = new THREE.Mesh(plateGeo, plateMat);
  plateMesh.name = `${plaqueGroup.name}_Face`;
  plateMesh.userData.ignoreRaycaster = true;
  plaqueGroup.add(plateMesh);

  // Backing mount box
  const backGeo = prepGeo(new THREE.BoxGeometry(width + 0.04, height + 0.04, 0.02));
  const backMat = new THREE.MeshStandardMaterial({
    color: 0x1a140d,
    roughness: 0.70,
    metalness: 0.65
  });
  if (Array.isArray(disposables)) disposables.push(backMat);
  const backMesh = new THREE.Mesh(backGeo, backMat);
  backMesh.name = `${plaqueGroup.name}_Backing`;
  backMesh.position.z = -0.011;
  backMesh.userData.ignoreRaycaster = true;
  plaqueGroup.add(backMesh);

  plaqueGroup.userData.ignoreRaycaster = true;
  plaqueGroup.userData.isMiniPlaque = true;
  plaqueGroup.userData.title = title;
  plaqueGroup.userData.subtitle = subtitle;
  if (Array.isArray(disposables)) disposables.push(plaqueGroup);
  return plaqueGroup;
}

// ─── Immediate Click Sound Feedback (Web Audio API Synthesizer) ─────────────
export function playImmediateClickSound(kind = 'drum') {
  const validKinds = ['drum', 'crossbow', 'water', 'chime', 'portal'];
  if (!validKinds.includes(kind)) kind = 'drum';
  if (typeof window === 'undefined') {
    return kind;
  }
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return kind;
    if (!_audioCtx || _audioCtx.state === 'closed') {
      _audioCtx = new AudioContextClass();
    }
    if (_audioCtx.state === 'suspended') {
      _audioCtx.resume().catch(() => {});
    }

    const t = _audioCtx.currentTime;

    if (kind === 'drum') {
      // Deep bronze drum boom: sine frequency drop 120Hz -> 42Hz
      const osc = _audioCtx.createOscillator();
      const gain = _audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, t);
      osc.frequency.exponentialRampToValueAtTime(42, t + 0.45);
      gain.gain.setValueAtTime(0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);
      osc.connect(gain);
      gain.connect(_audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.8);
    } else if (kind === 'crossbow') {
      // Magic crossbow twang: sawtooth twang 580Hz -> 140Hz
      const osc = _audioCtx.createOscillator();
      const gain = _audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(580, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.22);
      gain.gain.setValueAtTime(0.55, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      gain.connect(_audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.38);
    } else if (kind === 'water') {
      // Jade Well drop / ripple: sine droplet 880Hz -> 1480Hz -> 520Hz
      const osc = _audioCtx.createOscillator();
      const gain = _audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(1480, t + 0.08);
      osc.frequency.exponentialRampToValueAtTime(520, t + 0.35);
      gain.gain.setValueAtTime(0.5, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(gain);
      gain.connect(_audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.48);
    } else if (kind === 'chime') {
      // Antique bronze plaque chime: dual harmonic chime (C6 & G6)
      [1046.5, 1567.98].forEach((freq, idx) => {
        const osc = _audioCtx.createOscillator();
        const gain = _audioCtx.createGain();
        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
        osc.connect(gain);
        gain.connect(_audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.7);
      });
    } else if (kind === 'portal') {
      // Swirling vortex whoosh: sweep 180Hz -> 480Hz -> 120Hz
      const osc = _audioCtx.createOscillator();
      const gain = _audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, t);
      osc.frequency.exponentialRampToValueAtTime(480, t + 0.25);
      osc.frequency.exponentialRampToValueAtTime(120, t + 0.65);
      gain.gain.setValueAtTime(0.45, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);
      osc.connect(gain);
      gain.connect(_audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.8);
    }
  } catch (err) {
    console.warn('[playImmediateClickSound] synthesis error:', err?.message);
  }
  return kind;
}

// ─── Setup & Standardize An Duong Vuong GLB Model ────────────────────────────
export function setupAnDuongVuongGlb(model, pedestalTopY = 1.35) {
  if (!model) return null;

  try {
    let node0 = model.getObjectByName('node_0');
    if (!node0) {
      node0 = new THREE.Object3D();
      node0.name = 'node_0';
      while (model.children.length > 0) {
        node0.add(model.children[0]);
      }
      model.add(node0);
    }
    node0.quaternion.set(0.7071068, 0, 0, 0.7071068);

    model.updateMatrixWorld(true);
    const bbox0 = new THREE.Box3().setFromObject(model);
    const size0 = new THREE.Vector3();
    bbox0.getSize(size0);

    const currentHeight = size0.y;
    if (currentHeight > 0.001) {
      const scaleFactor = 3.4 / currentHeight; // Chuẩn 3.4m chiều cao theo yêu cầu
      model.scale.multiplyScalar(scaleFactor);
    }
    model.updateMatrixWorld(true);

    // Auto-grounding to pedestalTopY
    const bbox1 = new THREE.Box3().setFromObject(model);
    if (Number.isFinite(bbox1.min.y)) {
      model.position.y += pedestalTopY - bbox1.min.y;
    }
    model.updateMatrixWorld(true);

    // Materials PBR calibration & Shadows for Chiaroscuro
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.geometry) {
          prepGeo(child.geometry);
        }
        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((mat) => {
            if (mat) {
              mat.metalness = 0.75;
              mat.roughness = 0.40;
              mat.envMapIntensity = 1.4;
            }
          });
        }
      }
    });
  } catch (err) {
    console.warn('[setupAnDuongVuongGlb] warning:', err?.message);
  }

  return model;
}

// ─── Continuous Curved Wall Arc (ExtrudeGeometry, ZERO Domino) ────────────────
function createContinuousWallArc(innerR, outerR, height, startAngle, endAngle, mat) {
  const shape = new THREE.Shape();
  const segments = 36;
  const da = (endAngle - startAngle) / segments;

  // Outer arc
  for (let i = 0; i <= segments; i++) {
    const a = startAngle + i * da;
    const x = Math.cos(a) * outerR;
    const y = Math.sin(a) * outerR;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  // Inner arc
  for (let i = segments; i >= 0; i--) {
    const a = startAngle + i * da;
    const x = Math.cos(a) * innerR;
    const y = Math.sin(a) * innerR;
    shape.lineTo(x, y);
  }
  shape.closePath();

  const geo = prepGeo(new THREE.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.02,
    bevelThickness: 0.02
  }));

  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

// ─── Dynamic Adaptive Room Bounds Algorithm ──────────────────────────────────
export function calculateAdaptiveRoomBounds(clusters = [], options = {}) {
  const minCorridor = options.minCorridor ?? 2.3;
  const minWidth = options.minWidth ?? 22.0;
  const minLength = options.minLength ?? 26.0;
  const minHeight = options.minHeight ?? 8.5;

  const totalBox = new THREE.Box3();
  clusters.forEach((c) => {
    if (c.box) totalBox.union(c.box);
    else if (c.position && c.size) {
      const min = new THREE.Vector3().subVectors(c.position, c.size.clone().multiplyScalar(0.5));
      const max = new THREE.Vector3().addVectors(c.position, c.size.clone().multiplyScalar(0.5));
      totalBox.union(new THREE.Box3(min, max));
    }
  });

  const spanX = Math.max(Math.abs(totalBox.min.x), Math.abs(totalBox.max.x)) * 2;
  const spanZ = Math.max(Math.abs(totalBox.min.z), Math.abs(totalBox.max.z)) * 2;
  const spanY = totalBox.max.y;

  const width = Math.max(minWidth, Math.ceil(spanX + minCorridor * 2));
  const length = Math.max(minLength, Math.ceil(spanZ + minCorridor * 2));
  const height = Math.max(minHeight, Math.ceil(spanY + 0.5));

  return { width, length, height, totalBox };
}

// ─── Foreground: Framing Bamboo Clusters ─────────────────────────────────────
function createForegroundBambooCluster(count = 7, clusterRadius = 0.6) {
  const group = new THREE.Group();
  group.name = 'ADV_Foreground_Bamboo_Cluster';
  group.userData.ignoreRaycaster = true;

  const culmMat = new THREE.MeshStandardMaterial({
    color: 0x2e5c26,
    roughness: 0.55,
    metalness: 0.15
  });
  const nodeMat = new THREE.MeshStandardMaterial({
    color: 0x477a38,
    roughness: 0.45,
    metalness: 0.20
  });
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x3d7e2e,
    roughness: 0.65,
    metalness: 0.05,
    side: THREE.DoubleSide
  });

  const culmGeo = prepGeo(new THREE.CylinderGeometry(0.035, 0.045, 6.2, 10));
  const nodeRingGeo = prepGeo(new THREE.CylinderGeometry(0.052, 0.052, 0.06, 10));
  const leafGeo = prepGeo(new THREE.ConeGeometry(0.08, 0.55, 4));

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const dist = (0.2 + Math.random() * 0.8) * clusterRadius;
    const bx = Math.cos(angle) * dist;
    const bz = Math.sin(angle) * dist;
    const culmHeight = 5.6 + Math.random() * 1.2;
    const leanX = (Math.random() - 0.5) * 0.08;
    const leanZ = (Math.random() - 0.5) * 0.08;

    const culmMesh = new THREE.Mesh(culmGeo, culmMat);
    culmMesh.position.set(bx, culmHeight / 2, bz);
    culmMesh.rotation.set(leanX, Math.random() * Math.PI, leanZ);
    culmMesh.scale.set(1, culmHeight / 6.2, 1);
    culmMesh.userData.ignoreRaycaster = true;
    group.add(culmMesh);

    // Segment nodes
    const nodeCount = 8;
    for (let n = 1; n < nodeCount; n++) {
      const ny = (n / nodeCount) * culmHeight;
      const nodeMesh = new THREE.Mesh(nodeRingGeo, nodeMat);
      nodeMesh.position.set(bx + leanX * ny, ny, bz + leanZ * ny);
      nodeMesh.userData.ignoreRaycaster = true;
      group.add(nodeMesh);

      // Drooping leaves near the top half
      if (n >= 4) {
        for (let l = 0; l < 3; l++) {
          const lAngle = (l / 3) * Math.PI * 2 + n;
          const leafMesh = new THREE.Mesh(leafGeo, leafMat);
          leafMesh.position.set(
            bx + leanX * ny + Math.cos(lAngle) * 0.12,
            ny + 0.1,
            bz + leanZ * ny + Math.sin(lAngle) * 0.12
          );
          leafMesh.rotation.set(0.6 + Math.random() * 0.3, lAngle, 0.4);
          leafMesh.userData.ignoreRaycaster = true;
          group.add(leafMesh);
        }
      }
    }
  }

  return group;
}

// ─── Background: Panoramic Dạ Sơn Night Sky & Twinkling Stars ─────────────────
function createDaSonNightBackdrop(roomW, roomH) {
  const group = new THREE.Group();
  group.name = 'ADV_DaSon_Night_Backdrop';
  group.userData.ignoreRaycaster = true;

  if (typeof document !== 'undefined') {
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 1024;
    skyCanvas.height = 512;
    const sCtx = skyCanvas.getContext('2d');
    if (sCtx) {
      const sGrad = sCtx.createLinearGradient(0, 0, 0, 512);
      sGrad.addColorStop(0, '#04070e');
      sGrad.addColorStop(0.4, '#09101d');
      sGrad.addColorStop(0.8, '#12161f');
      sGrad.addColorStop(1, '#1b2230');
      sCtx.fillStyle = sGrad;
      sCtx.fillRect(0, 0, 1024, 512);

      const nGrad = sCtx.createRadialGradient(512, 380, 20, 512, 380, 420);
      nGrad.addColorStop(0, 'rgba(0, 245, 212, 0.12)');
      nGrad.addColorStop(0.5, 'rgba(255, 190, 85, 0.05)');
      nGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      sCtx.fillStyle = nGrad;
      sCtx.fillRect(0, 0, 1024, 512);

      const skyTex = new THREE.CanvasTexture(skyCanvas);
      skyTex.colorSpace = THREE.SRGBColorSpace;
      const skyGeo = prepGeo(new THREE.PlaneGeometry(roomW * 1.05, roomH * 1.15));
      const skyMat = new THREE.MeshBasicMaterial({
        map: skyTex,
        side: THREE.FrontSide,
        depthWrite: false
      });
      const skyMesh = new THREE.Mesh(skyGeo, skyMat);
      skyMesh.name = 'ADV_NightSky_Plane';
      skyMesh.position.set(0, roomH * 0.55, -0.6);
      skyMesh.userData.ignoreRaycaster = true;
      group.add(skyMesh);
    }
  }

  // 260 Twinkling Stars (THREE.Points)
  const starCount = 260;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    starPositions[i * 3] = (Math.random() - 0.5) * (roomW * 0.95);
    starPositions[i * 3 + 1] = roomH * 0.35 + Math.random() * (roomH * 0.75);
    starPositions[i * 3 + 2] = -0.4 + Math.random() * 0.3;
  }
  const starGeo = prepGeo(new THREE.BufferGeometry());
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xe0f2fe,
    size: 0.10,
    transparent: true,
    opacity: 0.90,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const starPoints = new THREE.Points(starGeo, starMat);
  starPoints.name = 'ADV_DaSon_Night_Stars';
  starPoints.userData.ignoreRaycaster = true;
  group.add(starPoints);

  // Silhouetted Mount Dạ Sơn Cliffs
  const mountainGeo = prepGeo(new THREE.ConeGeometry(roomW * 0.38, roomH * 0.65, 5));
  const mountainMat = new THREE.MeshBasicMaterial({
    color: 0x090d15,
    depthWrite: false
  });
  for (const mx of [-roomW * 0.28, roomW * 0.26]) {
    const mMesh = new THREE.Mesh(mountainGeo, mountainMat);
    mMesh.position.set(mx, roomH * 0.22, -0.3);
    mMesh.scale.set(1.4, 0.85, 0.2);
    mMesh.userData.ignoreRaycaster = true;
    group.add(mMesh);
  }

  // Soft Night Mist Layer
  const mistGeo = prepGeo(new THREE.PlaneGeometry(roomW, roomH * 0.45));
  const mistMat = new THREE.MeshBasicMaterial({
    color: 0x12161f,
    transparent: true,
    opacity: 0.45,
    depthWrite: false
  });
  const mistMesh = new THREE.Mesh(mistGeo, mistMat);
  mistMesh.position.set(0, roomH * 0.22, -0.15);
  mistMesh.userData.ignoreRaycaster = true;
  group.add(mistMesh);

  // Ancient Hazy Moon in Deep Ancient Night Sky
  const moonGeo = prepGeo(new THREE.CircleGeometry(1.2, 32));
  const moonMat = new THREE.MeshBasicMaterial({
    color: 0xfff3d6,
    transparent: true,
    opacity: 0.85,
    depthWrite: false
  });
  const moonMesh = new THREE.Mesh(moonGeo, moonMat);
  moonMesh.name = 'ADV_DaSon_Ancient_Moon';
  moonMesh.position.set(roomW * 0.22, roomH * 0.72, -0.55);
  moonMesh.userData.ignoreRaycaster = true;
  group.add(moonMesh);

  // Rolling Da Son Sea Water Horizon Plane
  const seaGeo = prepGeo(new THREE.PlaneGeometry(roomW * 1.1, 8.0, 32, 16));
  const seaMat = new THREE.MeshStandardMaterial({
    color: 0x00332c,
    roughness: 0.15,
    metalness: 0.65,
    emissive: new THREE.Color(0x004d40),
    emissiveIntensity: 0.45,
    transparent: true,
    opacity: 0.88,
    depthWrite: false
  });
  const seaMesh = new THREE.Mesh(seaGeo, seaMat);
  seaMesh.name = 'ADV_DaSon_Backdrop_Sea';
  seaMesh.rotation.x = -Math.PI / 2.3;
  seaMesh.position.set(0, 0.4, -0.4);
  seaMesh.userData.ignoreRaycaster = true;
  group.add(seaMesh);
  _backdropSeaMesh = seaMesh;

  return group;
}

// ─── Swirling Vortex Shader Portal (matching Day Thon Vi Da aesthetic) ────────
function createSwirlingVortexPortal(options = {}) {
  const group = new THREE.Group();
  group.name = 'ADV_Swirling_Vortex_Portal_Station';

  const portalWidth = options.width ?? 3.2;
  const portalHeight = options.height ?? 4.4;

  // 1. Ancient Stone Archway Frame
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x3d4450,
    roughness: 0.80,
    metalness: 0.15
  });
  const bronzeTrimMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.35,
    metalness: 0.85
  });

  // Pillars centered at ±1.68m
  const pGeo = prepGeo(new THREE.BoxGeometry(0.55, portalHeight, 0.55));
  const pL = new THREE.Mesh(pGeo, frameMat);
  pL.name = 'ADV_Portal_Pillar_Left';
  pL.position.set(-1.68, portalHeight / 2, 0);
  pL.castShadow = false;
  group.add(pL);

  const pR = new THREE.Mesh(pGeo, frameMat);
  pR.name = 'ADV_Portal_Pillar_Right';
  pR.position.set(1.68, portalHeight / 2, 0);
  pR.castShadow = false;
  group.add(pR);

  // Slim Pier Colliders at X = ±1.68m (Archway center opening is 100% OPEN, NO collider in center)
  const pierColliderGeo = prepGeo(new THREE.BoxGeometry(0.48, portalHeight, 0.65));
  const pierColliderMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  const pierLCollider = new THREE.Mesh(pierColliderGeo, pierColliderMat);
  pierLCollider.name = 'ADV_Portal_PierCollider_Left';
  pierLCollider.position.set(-1.68, portalHeight / 2, 0);
  pierLCollider.userData.isSolidObstacle = true;
  group.add(pierLCollider);

  const pierRCollider = new THREE.Mesh(pierColliderGeo, pierColliderMat);
  pierRCollider.name = 'ADV_Portal_PierCollider_Right';
  pierRCollider.position.set(1.68, portalHeight / 2, 0);
  pierRCollider.userData.isSolidObstacle = true;
  group.add(pierRCollider);

  group.userData.pierColliders = [pierLCollider, pierRCollider];

  // Lintel spanning across both pillars
  const lintelGeo = prepGeo(new THREE.BoxGeometry(3.9, 0.55, 0.65));
  const lintelMesh = new THREE.Mesh(lintelGeo, frameMat);
  lintelMesh.position.set(0, portalHeight + 0.2, 0);
  group.add(lintelMesh);

  // Bronze Eaves & Trim
  const trimGeo = prepGeo(new THREE.BoxGeometry(4.1, 0.12, 0.72));
  const trimMesh = new THREE.Mesh(trimGeo, bronzeTrimMat);
  trimMesh.position.set(0, portalHeight + 0.52, 0);
  group.add(trimMesh);

  // 2. Lacquer Plaque Sign above the portal
  const signTex = createPortalSignTexture();
  if (signTex) {
    const signGeo = prepGeo(new THREE.PlaneGeometry(2.4, 0.75));
    const signMat = new THREE.MeshBasicMaterial({ map: signTex, transparent: true, opacity: 0.9 });
    _portalSignMesh = new THREE.Mesh(signGeo, signMat);
    _portalSignMesh.position.set(0, portalHeight - 0.2, 0.32);
    group.add(_portalSignMesh);
  }

  // 3. Awakening Obsidian Mirror & Swirling Vortex Shader Plane (Custom GLSL Shader)
  _vortexUniforms = {
    uTime: { value: 0 },
    uAwaken: { value: 0.05 },
    uJadeDeep: { value: new THREE.Color(PALETTE.jadeDeep) },
    uJadeBright: { value: new THREE.Color(PALETTE.jadeGlow) },
    uGoldRim: { value: new THREE.Color(PALETTE.goldKham) },
    uObsidian: { value: new THREE.Color(0x0a0f12) },
    uObsidianRim: { value: new THREE.Color(0x182428) }
  };

  const portalShaderMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: _vortexUniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uAwaken;
      uniform vec3 uJadeDeep;
      uniform vec3 uJadeBright;
      uniform vec3 uGoldRim;
      uniform vec3 uObsidian;
      uniform vec3 uObsidianRim;
      varying vec2 vUv;
      void main() {
        vec2 p = (vUv - vec2(0.5, 0.46)) * vec2(1.0, 1.32);
        float d = length(p);
        float ang = atan(p.y, p.x);

        // 1. Idle state: Dark sleek obsidian mirror with faint breathing ripples
        float idleRipple = sin(d * 14.0 - uTime * 1.5) * 0.5 + 0.5;
        float idleBreath = sin(uTime * 0.9) * 0.5 + 0.5;
        float idleMask = smoothstep(0.64, 0.14, d);
        vec3 obsCol = mix(uObsidian, uObsidianRim, idleRipple * 0.35 + idleBreath * 0.15);
        obsCol = mix(obsCol, uJadeDeep, 0.30 * idleBreath * smoothstep(0.48, 0.0, d));
        float obsAlpha = clamp((0.88 + idleBreath * 0.06) * idleMask, 0.0, 0.95);

        // 2. Awakened state: Swirling vortex of emerald jade & gold
        float swirl = sin(d * 18.0 - uTime * 3.1 + ang * 3.0) * 0.5 + 0.5;
        float ripple = cos(d * 26.0 - uTime * 4.2 - ang * 2.0) * 0.5 + 0.5;
        float core = exp(-d * 3.4);
        float vortexMask = smoothstep(0.62, 0.12, d);
        vec3 vortexCol = mix(uJadeDeep, uJadeBright, swirl * 0.7 + core * 0.4);
        vortexCol = mix(vortexCol, uGoldRim, ripple * 0.28 * smoothstep(0.18, 0.52, d));
        float vortexAlpha = clamp((core * 0.72 + swirl * 0.36) * vortexMask, 0.0, 0.92);

        // 3. Smooth blend based on uAwaken (0.05 -> 1.0)
        vec3 finalCol = mix(obsCol, vortexCol, uAwaken);
        float finalAlpha = mix(obsAlpha * 0.75, vortexAlpha, uAwaken);

        gl_FragColor = vec4(finalCol, finalAlpha);
      }
    `
  });

  const vortexPlane = new THREE.Mesh(prepGeo(new THREE.PlaneGeometry(portalWidth - 0.6, portalHeight - 0.9)), portalShaderMat);
  vortexPlane.name = 'ADV_Portal_Vortex_Mesh';
  vortexPlane.position.set(0, (portalHeight - 0.9) / 2 + 0.25, 0);
  vortexPlane.userData.ignoreRaycaster = true;
  group.add(vortexPlane);

  // Portal point light
  _portalLight = new THREE.PointLight(0x00f5d4, 1.2, 9.0, 1.5);
  _portalLight.position.set(0, portalHeight * 0.55, 0.6);
  _portalLight.userData.ignoreRaycaster = true;
  group.add(_portalLight);
  _lights.push(_portalLight);

  // 4. Pedestal & Cuốn Sách Thiên Thư (Interactive Teleport Book)
  const bookAltar = new THREE.Group();
  bookAltar.name = 'ADV_Realm_Portal_Altar';
  bookAltar.position.set(0, 0, 0.95);
  group.add(bookAltar);

  const standGeo = prepGeo(new THREE.CylinderGeometry(0.38, 0.46, 1.05, 16));
  const standMesh = new THREE.Mesh(standGeo, frameMat);
  standMesh.position.set(0, 0.525, 0);
  bookAltar.add(standMesh);

  const bookGeo = prepGeo(new THREE.BoxGeometry(0.60, 0.10, 0.45));
  const bookMat = new THREE.MeshStandardMaterial({
    color: 0x00f5d4,
    emissive: new THREE.Color(0x00f5d4),
    emissiveIntensity: 1.4,
    roughness: 0.25,
    metalness: 0.40
  });
  const bookMesh = new THREE.Mesh(bookGeo, bookMat);
  bookMesh.name = 'Interactive_AnDuongVuong_Teleport_Book';
  bookMesh.position.set(0, 1.12, 0);
  bookMesh.rotation.x = -Math.PI / 6;
  bookMesh.userData = {
    type: 'portal',
    action: 'enterRealm',
    realmId: 'an_duong_vuong',
    title: 'Bước Vào Huyền Sử Cổ Loa – Dạ Sơn',
    interactive: true,
    isBookPortal: true,
    isTeleportBook: true,
    targetRealm: 'an_duong_vuong',
    loreKey: 'cuon_sach_thien_thu',
    onActivate: () => {
      playImmediateClickSound('portal');
      enterRealm('an_duong_vuong');
    }
  };
  bookAltar.add(bookMesh);
  teleportBook = bookMesh;

  // 5. Interactive Click Proxy with Dual Activation metadata (3.4m x 4.6m x 2.0m)
  const proxyGeo = prepGeo(new THREE.BoxGeometry(3.4, 4.6, 2.0));
  const proxyMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  _portalClickProxy = new THREE.Mesh(proxyGeo, proxyMat);
  _portalClickProxy.name = 'ADV_Portal_ClickProxy';
  _portalClickProxy.position.set(0, 2.3, 0.6);
  _portalClickProxy.userData = {
    type: 'portal',
    action: 'enterRealm',
    realmId: 'an_duong_vuong',
    title: 'Bước Vào Huyền Sử Cổ Loa – Dạ Sơn',
    isClickProxy: true,
    isBookPortal: true,
    isTeleportBook: true,
    interactive: true,
    roomId: 'an_duong_vuong',
    targetRealm: 'an_duong_vuong',
    onActivate: () => {
      playImmediateClickSound('portal');
      enterRealm('an_duong_vuong');
    },
    portalMetadata: {
      id: 'an_duong_vuong',
      title: 'Bước Vào Huyền Sử Cổ Loa – Dạ Sơn',
      subtitle: 'Sử Thi Âu Lạc • Thần Kim Quy Rẽ Sóng Trùng Dương',
      author: 'Truyền thuyết Cổ Loa • Dân gian Lạc Việt',
      genre: 'Truyền thuyết Lịch sử & Dựng Nước',
      themeColor: '#00f5d4',
      targetRealm: 'an_duong_vuong',
      onActivate: () => {
        playImmediateClickSound('portal');
        enterRealm('an_duong_vuong');
      }
    }
  };
  group.add(_portalClickProxy);

  _portalStation = group;

  // 6. WebXR Teleport Landing Anchor Ring on floor
  const ringGeo = prepGeo(new THREE.RingGeometry(0.85, 1.05, 32));
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00f5d4,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.name = 'ADV_WebXR_Teleport_Anchor';
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.set(0, 0.02, 1.8);
  ringMesh.userData.isTeleportFloor = true;
  ringMesh.userData.isWalkableFloor = true;
  ringMesh.userData.teleportAnchor = true;
  ringMesh.userData.ignoreRaycaster = true;
  group.add(ringMesh);

  return group;
}

// ─── Procedural 3D Audio Helper ───────────────────────────────────────────────
function setupAudioNode(anchor, kind = 'drum', refDist = 4.0, maxDist = 16.0, vol = 0.5) {
  const dummy = new THREE.Group();
  dummy.name = `ADV_AudioAnchor_${kind}`;
  dummy.position.copy(anchor);
  dummy.userData.soundKind = kind;
  dummy.userData.isPlaying = false;
  dummy.userData.stop = () => {
    dummy.userData.isPlaying = false;
  };
  dummy.userData.fadeOut = () => {
    dummy.userData.isPlaying = false;
  };
  _sounds.push(dummy);

  if (typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      if (!_audioCtx) {
        _audioCtx = new AudioContextClass();
      }
    }
  }

  return dummy;
}

// ─── Build Museum Room (Clean-Slate Implementation) ───────────────────────────
export async function buildAnDuongVuongRoom(roomGroup, options = {}) {
  disposeAnDuongVuongRoom(roomGroup);
  _roomGroup = roomGroup;
  const floorY = options.floorY ?? 0;

  // 1. Dynamic Adaptive Bounds Calculation
  const clusterBoxes = [
    { name: 'dais', box: new THREE.Box3(new THREE.Vector3(-4.4, 0, -6.8), new THREE.Vector3(4.4, 5.5, 1.8)) },
    { name: 'crossbow', box: new THREE.Box3(new THREE.Vector3(-8.8, 0, 2.6), new THREE.Vector3(-5.2, 2.8, 5.4)) },
    { name: 'well', box: new THREE.Box3(new THREE.Vector3(5.2, 0, 2.6), new THREE.Vector3(8.8, 1.6, 5.4)) },
    { name: 'portal', box: new THREE.Box3(new THREE.Vector3(5.2, 0, -10.2), new THREE.Vector3(8.4, 4.5, -6.8)) },
    { name: 'gate', box: new THREE.Box3(new THREE.Vector3(-3.2, 0, 10.2), new THREE.Vector3(3.2, 7.8, 12.0)) },
    { name: 'plaque', box: new THREE.Box3(new THREE.Vector3(4.2, 0, 7.6), new THREE.Vector3(6.6, 2.4, 8.8)) }
  ];

  const adaptiveBounds = calculateAdaptiveRoomBounds(clusterBoxes, {
    minCorridor: 3.5, // Giữ hành lang thông thủy rộng rãi
    minWidth: 22.0,
    minLength: 26.0,
    minHeight: 8.5
  });

  const roomW = adaptiveBounds.width;
  const roomL = adaptiveBounds.length;
  const roomH = adaptiveBounds.height;
  const halfW = roomW / 2;
  const halfL = roomL / 2;

  // Root Interior Container
  const interior = new THREE.Group();
  interior.name = 'ADV_Master_Interior';
  roomGroup.add(interior);
  _disposables.push(interior);

  // Materials with Tangent-Space Linear Normal Maps
  const limHC = createLimWoodHeightCanvas();
  const limWoodNormal = limHC ? heightCanvasToLinearNormalMap(limHC, 2.2, 4, 2, _disposables) : null;

  const limWoodMat = new THREE.MeshStandardMaterial({
    color: 0x24140e,
    roughness: 0.70,
    metalness: 0.08
  });
  if (limWoodNormal) {
    limWoodMat.normalMap = limWoodNormal;
    limWoodMat.normalScale = new THREE.Vector2(0.65, 0.65);
  }

  const colWoodMat = new THREE.MeshStandardMaterial({
    color: 0x3b1e14,
    roughness: 0.65,
    metalness: 0.12
  });
  if (limWoodNormal) {
    colWoodMat.normalMap = limWoodNormal;
    colWoodMat.normalScale = new THREE.Vector2(0.55, 0.55);
  }

  const bronzeRingMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.30,
    metalness: 0.85
  });
  const lotusBaseMat = new THREE.MeshStandardMaterial({
    color: 0x374151,
    roughness: 0.80,
    metalness: 0.10
  });

  // ══════════════════════════════════════════════════════════════════════════
  // A. SÀN ĐÁ XANH THANH HÓA KHẢM TRỐNG ĐỒNG 8M & TRẦN GỖ LIM
  // ══════════════════════════════════════════════════════════════════════════
  const floorGeo = prepGeo(new THREE.PlaneGeometry(roomW, roomL));
  const floorTex = createDongSonFloorTexture();
  const floorHC = createFloorHeightCanvas();
  const floorNormal = floorHC ? heightCanvasToLinearNormalMap(floorHC, 2.4, 1, 1, _disposables) : null;
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    bumpMap: floorTex,
    bumpScale: 0.02,
    roughnessMap: floorTex,
    color: 0xffffff,
    roughness: 0.55,
    metalness: 0.20
  });
  if (floorNormal) {
    floorMat.normalMap = floorNormal;
    floorMat.normalScale = new THREE.Vector2(0.85, 0.85);
  }
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.name = 'ADV_DongSon_Grand_Floor';
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.set(0, floorY + 0.005, 0);
  floorMesh.receiveShadow = true;
  floorMesh.userData.isTeleportFloor = true;
  floorMesh.userData.isWalkableFloor = true;
  interior.add(floorMesh);
  _disposables.push(floorMesh);

  // Trần Gỗ Lim
  const ceilingGeo = prepGeo(new THREE.PlaneGeometry(roomW, roomL));
  const ceilingMat = new THREE.MeshStandardMaterial({
    color: 0x180d09,
    roughness: 0.85,
    metalness: 0.05
  });
  const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
  ceilingMesh.name = 'ADV_LimWood_Ceiling';
  ceilingMesh.rotation.x = Math.PI / 2;
  ceilingMesh.position.set(0, floorY + roomH, 0);
  interior.add(ceilingMesh);
  _disposables.push(ceilingMesh);

  // ══════════════════════════════════════════════════════════════════════════
  // B. TƯỜNG BAO & HẬU CẢNH MỞ RỘNG (Trời đêm Dạ Sơn & Sương khói)
  // ══════════════════════════════════════════════════════════════════════════
  // 1. Tường Hậu (North Wall: Z = -halfL) — Mở rộng kết nối Cõi Trời Đêm Dạ Sơn
  const northWallGroup = new THREE.Group();
  northWallGroup.name = 'ADV_North_Colonnade_Wall';
  northWallGroup.position.set(0, floorY, -halfL);
  interior.add(northWallGroup);
  _disposables.push(northWallGroup);

  const northOpenW = Math.min(14.0, roomW - 4.0);
  const northWingW = (roomW - northOpenW) / 2;
  const northWingGeo = prepGeo(new THREE.BoxGeometry(northWingW, roomH, 0.4));

  const northWingL = new THREE.Mesh(northWingW > 0 ? northWingGeo : new THREE.BoxGeometry(0.1, 0.1, 0.1), limWoodMat);
  northWingL.position.set(-(northOpenW / 2 + northWingW / 2), roomH / 2, 0);
  northWallGroup.add(northWingL);

  const northWingR = new THREE.Mesh(northWingW > 0 ? northWingGeo : new THREE.BoxGeometry(0.1, 0.1, 0.1), limWoodMat);
  northWingR.position.set((northOpenW / 2 + northWingW / 2), roomH / 2, 0);
  northWallGroup.add(northWingR);

  const northHeaderGeo = prepGeo(new THREE.BoxGeometry(northOpenW + 0.4, roomH * 0.22, 0.45));
  const northHeader = new THREE.Mesh(northHeaderGeo, limWoodMat);
  northHeader.position.set(0, roomH - (roomH * 0.22) / 2, 0);
  northWallGroup.add(northHeader);

  // 4 cột gỗ lim thanh mảnh khung vòm vọng cảnh
  const northColGeo = prepGeo(new THREE.CylinderGeometry(0.20, 0.22, roomH * 0.78, 16));
  for (const nx of [-northOpenW * 0.36, -northOpenW * 0.12, northOpenW * 0.12, northOpenW * 0.36]) {
    const nCol = new THREE.Mesh(northColGeo, limWoodMat);
    nCol.position.set(nx, (roomH * 0.78) / 2, 0);
    northWallGroup.add(nCol);
  }

  // Hậu cảnh Dạ Sơn: Bầu trời đêm ngàn sao và sương mù
  const nightBackdrop = createDaSonNightBackdrop(roomW, roomH);
  nightBackdrop.position.set(0, floorY, -halfL - 0.2);
  interior.add(nightBackdrop);
  _disposables.push(nightBackdrop);

  // 2. Tường Trái (West Wall at X = -halfW)
  const westWallGeo = prepGeo(new THREE.BoxGeometry(0.4, roomH, roomL));
  const westWall = new THREE.Mesh(westWallGeo, limWoodMat);
  westWall.name = 'ADV_Enclosure_WestWall';
  westWall.position.set(-halfW, floorY + roomH / 2, 0);
  interior.add(westWall);
  _disposables.push(westWall);

  // 3. Tường Phải (East Wall at X = halfW)
  const eastWallGeo = prepGeo(new THREE.BoxGeometry(0.4, roomH, roomL));
  const eastWall = new THREE.Mesh(eastWallGeo, limWoodMat);
  eastWall.name = 'ADV_Enclosure_EastWall';
  eastWall.position.set(halfW, floorY + roomH / 2, 0);
  interior.add(eastWall);
  _disposables.push(eastWall);

  // 4. Tường Trước (South Wall at Z = halfL, lối vào mở 4.6m, |X| <= 2.3m 100% mở)
  const southOpenW = 4.6;
  const southWingWidth = (roomW - southOpenW) / 2;
  const southWallWingGeo = prepGeo(new THREE.BoxGeometry(southWingWidth, roomH, 0.4));
  const southWallLeft = new THREE.Mesh(southWallWingGeo, limWoodMat);
  southWallLeft.name = 'ADV_Enclosure_SouthWall_Left';
  southWallLeft.position.set(-(southWingWidth / 2 + southOpenW / 2), floorY + roomH / 2, halfL);
  interior.add(southWallLeft);
  _disposables.push(southWallLeft);

  const southWallRight = new THREE.Mesh(southWallWingGeo, limWoodMat);
  southWallRight.name = 'ADV_Enclosure_SouthWall_Right';
  southWallRight.position.set((southWingWidth / 2 + southOpenW / 2), floorY + roomH / 2, halfL);
  interior.add(southWallRight);
  _disposables.push(southWallRight);

  // 5. Phù Điêu Đồng Cổ Đông Sơn Treo Tường
  const reliefMat = new THREE.MeshStandardMaterial({
    color: 0xc59b27,
    roughness: 0.35,
    metalness: 0.85
  });
  const reliefGeo = prepGeo(new THREE.BoxGeometry(2.4, 3.2, 0.08));
  const reliefPositions = [
    { x: -halfW * 0.55, y: roomH * 0.52, z: -halfL + 0.25, rotY: 0 },
    { x: halfW * 0.55, y: roomH * 0.52, z: -halfL + 0.25, rotY: 0 },
    { x: -halfW + 0.25, y: roomH * 0.52, z: -halfL * 0.36, rotY: Math.PI / 2 },
    { x: -halfW + 0.25, y: roomH * 0.52, z: halfL * 0.36, rotY: Math.PI / 2 },
    { x: halfW - 0.25, y: roomH * 0.52, z: -halfL * 0.36, rotY: -Math.PI / 2 },
    { x: halfW - 0.25, y: roomH * 0.52, z: halfL * 0.36, rotY: -Math.PI / 2 },
  ];
  reliefPositions.forEach((pos, idx) => {
    const relief = new THREE.Mesh(reliefGeo, reliefMat);
    relief.name = `ADV_Bronze_Relief_${idx + 1}`;
    relief.position.set(pos.x, floorY + pos.y, pos.z);
    relief.rotation.y = pos.rotY;
    interior.add(relief);
    _disposables.push(relief);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // C. 8 CỘT GỖ LIM TRÒN (d=0.55m) + CHÂN TẢNG SEN & ĐAI ĐỒNG (Hoàn toàn ngoài |X|<=2.3m)
  // ══════════════════════════════════════════════════════════════════════════
  const colShaftGeo = prepGeo(new THREE.CylinderGeometry(0.275, 0.275, roomH - 0.4, 24));
  const colRingGeo = prepGeo(new THREE.CylinderGeometry(0.29, 0.29, 0.08, 24));
  const lotusPoints = [
    new THREE.Vector2(0.52, 0),
    new THREE.Vector2(0.50, 0.08),
    new THREE.Vector2(0.44, 0.16),
    new THREE.Vector2(0.47, 0.26),
    new THREE.Vector2(0.38, 0.34),
    new THREE.Vector2(0.32, 0.40)
  ];
  const colBaseGeo = prepGeo(new THREE.LatheGeometry(lotusPoints, 24));

  const colX = halfW - 2.2; // ~ 8.8m
  const colCoords = [
    [-colX, -halfL * 0.68], [-colX, -halfL * 0.23], [-colX, halfL * 0.23], [-colX, halfL * 0.68],
    [colX, -halfL * 0.68], [colX, -halfL * 0.23], [colX, halfL * 0.23], [colX, halfL * 0.68]
  ];

  const limColumns = [];
  colCoords.forEach(([cx, cz], i) => {
    const colGroup = new THREE.Group();
    colGroup.name = `ADV_Lim_Column_${i + 1}`;
    colGroup.position.set(cx, floorY, cz);

    const baseMesh = new THREE.Mesh(colBaseGeo, lotusBaseMat);
    baseMesh.position.y = 0.20;
    colGroup.add(baseMesh);

    const shaftMesh = new THREE.Mesh(colShaftGeo, colWoodMat);
    shaftMesh.position.y = (roomH - 0.4) / 2 + 0.2;
    colGroup.add(shaftMesh);

    const ringBot = new THREE.Mesh(colRingGeo, bronzeRingMat);
    ringBot.position.y = 0.45;
    colGroup.add(ringBot);

    const ringTop = new THREE.Mesh(colRingGeo, bronzeRingMat);
    ringTop.position.y = roomH - 0.3;
    colGroup.add(ringTop);

    limColumns.push(colGroup);
    interior.add(colGroup);
    _disposables.push(colGroup);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // D. LỐI VÀO: CỔNG THÀNH ĐÁ (4.6m, |X|<=2.3m thông thoáng) & KHÓM TRÚC XANH TIỀN CẢNH
  // ══════════════════════════════════════════════════════════════════════════
  const gateGroup = new THREE.Group();
  gateGroup.name = 'ADV_CoLoa_Stone_Archway';
  gateGroup.userData.canonicalName = 'CoLoa_Portal_Gate';
  gateGroup.userData.clearAperture = 4.6;
  gateGroup.position.set(0, floorY, halfL);
  interior.add(gateGroup);
  _disposables.push(gateGroup);

  const gateStoneMat = new THREE.MeshStandardMaterial({
    color: 0x4a5568,
    roughness: 0.85,
    metalness: 0.10
  });
  const gatePillarGeo = prepGeo(new THREE.BoxGeometry(0.55, 6.2, 0.65));
  const pillarL = new THREE.Mesh(gatePillarGeo, gateStoneMat);
  pillarL.name = 'ADV_Gate_Pillar_Left';
  pillarL.position.set(-2.575, 3.1, 0);
  gateGroup.add(pillarL);

  const pillarR = new THREE.Mesh(gatePillarGeo, gateStoneMat);
  pillarR.name = 'ADV_Gate_Pillar_Right';
  pillarR.position.set(2.575, 3.1, 0);
  gateGroup.add(pillarR);

  // Phù điêu trụ cổng: Thần Kim Quy (Trái) & Chim Lạc (Phải)
  const pillarReliefMat = new THREE.MeshStandardMaterial({
    color: 0xc59b27,
    roughness: 0.35,
    metalness: 0.85
  });
  const pillarReliefGeo = prepGeo(new THREE.BoxGeometry(0.5, 1.8, 0.04));
  const reliefL = new THREE.Mesh(pillarReliefGeo, pillarReliefMat);
  reliefL.name = 'ADV_Pillar_Relief_KimQuy';
  reliefL.position.set(-2.575, 3.0, 0.34);
  gateGroup.add(reliefL);

  const reliefR = new THREE.Mesh(pillarReliefGeo, pillarReliefMat);
  reliefR.name = 'ADV_Pillar_Relief_ChimLac';
  reliefR.position.set(2.575, 3.0, 0.34);
  gateGroup.add(reliefR);

  // Mái đao cong vút cổ truyền
  const lintelGeo = prepGeo(new THREE.BoxGeometry(5.7, 0.6, 0.8));
  const lintel = new THREE.Mesh(lintelGeo, gateStoneMat);
  lintel.position.set(0, 6.4, 0);
  gateGroup.add(lintel);

  const roofTier1Geo = prepGeo(new THREE.BoxGeometry(5.9, 0.4, 1.4));
  const terracottaMat = new THREE.MeshStandardMaterial({ color: 0x8b3a20, roughness: 0.75 });
  const roofTier1 = new THREE.Mesh(roofTier1Geo, terracottaMat);
  roofTier1.position.set(0, 6.9, 0);
  gateGroup.add(roofTier1);

  const roofTier2Geo = prepGeo(new THREE.BoxGeometry(5.2, 0.5, 1.1));
  const roofTier2 = new THREE.Mesh(roofTier2Geo, terracottaMat);
  roofTier2.position.set(0, 7.35, 0);
  gateGroup.add(roofTier2);

  const ridgeGeo = prepGeo(new THREE.BoxGeometry(4.6, 0.25, 0.4));
  const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x5a2312, roughness: 0.7 });
  const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
  ridge.position.set(0, 7.7, 0);
  gateGroup.add(ridge);

  // Cụm Trúc Xanh Tiền Cảnh đón khách hai bên cổng thành (Hoàn toàn ngoài |X|<=2.3m)
  const bambooLeft = createForegroundBambooCluster(8, 0.65);
  bambooLeft.name = 'ADV_Foreground_Bamboo_Left';
  bambooLeft.position.set(-3.8, floorY, halfL - 1.8);
  bambooLeft.userData.ignoreRaycaster = true;
  interior.add(bambooLeft);
  _disposables.push(bambooLeft);

  const bambooRight = createForegroundBambooCluster(8, 0.65);
  bambooRight.name = 'ADV_Foreground_Bamboo_Right';
  bambooRight.position.set(3.8, floorY, halfL - 1.8);
  bambooRight.userData.ignoreRaycaster = true;
  interior.add(bambooRight);
  _disposables.push(bambooRight);

  // Bảng Thông Tin Di Sản Đồng Cổ (X = 5.4, Z = halfL - 2.8)
  const infoPlaque = new THREE.Group();
  infoPlaque.name = 'ADV_Heritage_InfoPlaque';
  infoPlaque.position.set(5.4, floorY, halfL - 2.8);
  infoPlaque.rotation.y = -Math.PI / 8;
  interior.add(infoPlaque);
  _disposables.push(infoPlaque);

  const standGeo = prepGeo(new THREE.CylinderGeometry(0.08, 0.12, 1.2, 12));
  const standMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.7 });
  for (const sx of [-0.65, 0.65]) {
    const s = new THREE.Mesh(standGeo, standMat);
    s.position.set(sx, 0.6, 0);
    infoPlaque.add(s);
  }

  const plaqueTex = createPlaqueTexture();
  const boardGeo = prepGeo(new THREE.PlaneGeometry(2.4, 1.6));
  const boardMat = new THREE.MeshStandardMaterial({
    map: plaqueTex,
    color: 0xffffff,
    roughness: 0.45,
    metalness: 0.40
  });
  const boardMesh = new THREE.Mesh(boardGeo, boardMat);
  boardMesh.position.set(0, 1.5, 0.05);
  infoPlaque.add(boardMesh);

  const boardBackGeo = prepGeo(new THREE.BoxGeometry(2.45, 1.65, 0.08));
  const boardBack = new THREE.Mesh(boardBackGeo, gateStoneMat);
  boardBack.position.set(0, 1.5, 0);
  infoPlaque.add(boardBack);

  // Dedicated warm spotlight for antique bronze plaque
  const plaqueSpot = new THREE.SpotLight(0xffbe55, 22.0, 8.0, Math.PI / 4.2, 0.65, 1.2);
  plaqueSpot.position.set(0, 3.2, 1.8);
  plaqueSpot.target = boardMesh;
  plaqueSpot.userData.ignoreRaycaster = true;
  infoPlaque.add(plaqueSpot);
  infoPlaque.add(plaqueSpot.target);
  _lights.push(plaqueSpot, plaqueSpot.target);

  // Lim frame with Dong Son Lac bird bronze reliefs
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x24140e, roughness: 0.75, metalness: 0.15 });
  const bronzePlaqueTrimMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.35, metalness: 0.85 });

  const frameTop = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(2.65, 0.12, 0.12)), frameMat);
  frameTop.position.set(0, 2.36, 0.05);
  infoPlaque.add(frameTop);

  const frameBot = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(2.65, 0.12, 0.12)), frameMat);
  frameBot.position.set(0, 0.64, 0.05);
  infoPlaque.add(frameBot);

  const frameL = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(0.12, 1.84, 0.12)), frameMat);
  frameL.position.set(-1.26, 1.5, 0.05);
  infoPlaque.add(frameL);

  const frameR = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(0.12, 1.84, 0.12)), frameMat);
  frameR.position.set(1.26, 1.5, 0.05);
  infoPlaque.add(frameR);

  // Lac bird bronze medallions on 4 corners of the frame
  const lacMedallionGeo = prepGeo(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 16));
  for (const [lx, ly] of [[-1.26, 2.36], [1.26, 2.36], [-1.26, 0.64], [1.26, 0.64]]) {
    const lac = new THREE.Mesh(lacMedallionGeo, bronzePlaqueTrimMat);
    lac.rotation.x = Math.PI / 2;
    lac.position.set(lx, ly, 0.12);
    infoPlaque.add(lac);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // E. TRUNG TÂM: ĐÀI UY QUYỀN (amduongvuong.glb) & SA BÀN 3 VÒNG LOA THÀNH THẤP
  // ══════════════════════════════════════════════════════════════════════════
  const centralDais = new THREE.Group();
  centralDais.name = 'ADV_Central_Dais_LoaThanh';
  centralDais.position.set(0, floorY, -2.5);
  centralDais.userData.topContactSurfaceY = 1.35;
  interior.add(centralDais);
  _disposables.push(centralDais);

  // 1. Bệ Đá Trống Đồng Đông Sơn 3 Tầng (Cao 1.35m)
  const t1Geo = prepGeo(new THREE.CylinderGeometry(2.0, 2.2, 0.45, 24));
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x4a525a, roughness: 0.85, metalness: 0.10 });
  const t1Mesh = new THREE.Mesh(t1Geo, stoneMat);
  t1Mesh.name = 'ADV_Dais_Step1_Tier';
  t1Mesh.position.y = 0.225;
  t1Mesh.receiveShadow = true;
  centralDais.add(t1Mesh);

  const t2Geo = prepGeo(new THREE.CylinderGeometry(1.6, 1.75, 0.50, 24));
  const bronzeDrumMat = new THREE.MeshStandardMaterial({ color: 0x8a6b32, roughness: 0.50, metalness: 0.70 });
  const t2Mesh = new THREE.Mesh(t2Geo, bronzeDrumMat);
  t2Mesh.name = 'ADV_Dais_DongSon_Drum_Tier';
  t2Mesh.position.y = 0.70;
  t2Mesh.receiveShadow = true;
  centralDais.add(t2Mesh);

  const t3Geo = prepGeo(new THREE.CylinderGeometry(1.3, 1.45, 0.40, 24));
  const lotusMat = new THREE.MeshStandardMaterial({ color: 0xb38630, roughness: 0.40, metalness: 0.75 });
  const t3Mesh = new THREE.Mesh(t3Geo, lotusMat);
  t3Mesh.name = 'ADV_Dais_Lotus_Throne_Tier';
  t3Mesh.position.y = 1.15;
  t3Mesh.receiveShadow = true;
  centralDais.add(t3Mesh);

  // 2. Sa Bàn 3 Vòng Thành Cổ Loa Thấp (0.32m - 0.38m) Liền Mạch (ZERO Domino)
  const spiralGroup = new THREE.Group();
  spiralGroup.name = 'ADV_Spiral_Fortress_Walls';
  centralDais.add(spiralGroup);

  const wallStoneMat = new THREE.MeshStandardMaterial({
    color: 0x5a6372,
    roughness: 0.88,
    metalness: 0.08
  });
  const moatMat = new THREE.MeshStandardMaterial({
    color: 0x004d40,
    emissive: new THREE.Color(0x00f5d4),
    emissiveIntensity: 0.45,
    roughness: 0.15,
    transparent: true,
    opacity: 0.75
  });

  const rings = [
    { innerR: 2.35, outerR: 2.65, height: 0.32 },
    { innerR: 3.10, outerR: 3.40, height: 0.35 },
    { innerR: 3.85, outerR: 4.15, height: 0.38 }
  ];

  rings.forEach((r, idx) => {
    const wallArc = createContinuousWallArc(r.innerR, r.outerR, r.height, 0.65 * Math.PI, 2.35 * Math.PI, wallStoneMat);
    wallArc.name = `ADV_LoaThanh_Wall_Ring_${idx + 1}`;
    spiralGroup.add(wallArc);

    if (idx < 2) {
      const moatGeo = prepGeo(new THREE.RingGeometry(r.outerR + 0.04, rings[idx + 1].innerR - 0.04, 32, 1, 0.65 * Math.PI, 1.70 * Math.PI));
      const moatMesh = new THREE.Mesh(moatGeo, moatMat);
      moatMesh.rotation.x = -Math.PI / 2;
      moatMesh.position.y = 0.02;
      moatMesh.userData.ignoreRaycaster = true;
      spiralGroup.add(moatMesh);
    }
  });

  // 3. Tượng Uy Nghiêm amduongvuong.glb (Chuẩn 3.4m, ground Y = 1.35m)
  const statueHolder = new THREE.Group();
  statueHolder.name = 'ADV_Glb_Statue_Holder';
  centralDais.add(statueHolder);

  // Fallback King Statue
  const fbKingGroup = new THREE.Group();
  fbKingGroup.name = 'ADV_Fallback_King_Statue';

  const fbBaseGeo = prepGeo(new THREE.CylinderGeometry(0.7, 0.85, 0.4, 16));
  const fbBaseMat = new THREE.MeshStandardMaterial({ color: 0x8a6b32, roughness: 0.45, metalness: 0.75 });
  const fbBase = new THREE.Mesh(fbBaseGeo, fbBaseMat);
  fbBase.position.y = 1.35 + 0.2;
  fbBase.castShadow = true;
  fbKingGroup.add(fbBase);

  const fbBodyGeo = prepGeo(new THREE.CylinderGeometry(0.45, 0.65, 2.4, 16));
  const fbBody = new THREE.Mesh(fbBodyGeo, fbBaseMat);
  fbBody.position.y = 1.35 + 1.4;
  fbBody.castShadow = true;
  fbKingGroup.add(fbBody);

  const fbCrownGeo = prepGeo(new THREE.CylinderGeometry(0.25, 0.28, 0.6, 12));
  const fbCrownMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.9 });
  const fbCrown = new THREE.Mesh(fbCrownGeo, fbCrownMat);
  fbCrown.position.y = 1.35 + 2.8;
  fbCrown.castShadow = true;
  fbKingGroup.add(fbCrown);

  statueHolder.add(fbKingGroup);

  // Load Model Asynchronously
  if (typeof window !== 'undefined') {
    const glbUrls = [
      '/model/amduongvuong.glb',
      '/models/amduongvuong.glb',
      '/model/ANDUONGVUONG.glb',
      '/models/ANDUONGVUONG.glb',
      '/models/anduongvuong.glb',
      '/models/an_duong_vuong.glb'
    ];

    loadGlbCached(glbUrls, {
      maxTextureSize: 1024,
      returnGltf: true
    }).then((res) => {
      if (res && res.gltf?.scene) {
        const model = res.gltf.scene;
        setupAnDuongVuongGlb(model, 1.35);
        statueHolder.clear();
        statueHolder.add(model);
        _disposables.push(model);
      }
    }).catch((e) => {
      console.warn('[AnDuongVuong] loadGlbCached statue note:', e?.message);
    });
  }

  // 4 mini pedestal antique bronze plaques (from Thánh Gióng):
  // 1. King's dais plaque
  const kingPlaque = createMiniBronzePlaque(
    'VUA AN DƯƠNG VƯƠNG (THỤC PHÁN)',
    'Triều Đại Âu Lạc • 257 – 207 TCN',
    { width: 1.45, height: 0.36 },
    _disposables
  );
  kingPlaque.name = 'ADV_Mini_Plaque_VuaAnDuongVuong';
  kingPlaque.position.set(0, 0.42, 2.22);
  kingPlaque.rotation.x = -0.15;
  centralDais.add(kingPlaque);

  // 2. Sa bàn Loa Thành plaque
  const citadelPlaque = createMiniBronzePlaque(
    'SA BÀN 3 VÒNG THÀNH CỔ LOA',
    'Kỳ Tích Thành Ốc Archimedes',
    { width: 1.45, height: 0.36 },
    _disposables
  );
  citadelPlaque.name = 'ADV_Mini_Plaque_SaBanLoaThanh';
  citadelPlaque.position.set(0, 0.35, 4.18);
  citadelPlaque.rotation.x = -0.22;
  centralDais.add(citadelPlaque);

  // ══════════════════════════════════════════════════════════════════════════
  // F. CÁNH TRÁI: ĐIỆN THỜ NỎ THẦN LIÊN CHÂU (Vuốt Rùa Vàng & Mũi Tên Đồng)
  // ══════════════════════════════════════════════════════════════════════════
  const shrineArea = new THREE.Group();
  shrineArea.name = 'ADV_Crossbow_Shrine_Area';
  shrineArea.position.set(-7.0, floorY, 4.0);
  interior.add(shrineArea);
  _disposables.push(shrineArea);

  // Án thờ gỗ lim lớn
  const altarTableGeo = prepGeo(new THREE.BoxGeometry(2.6, 1.1, 1.1));
  const altarTableMat = new THREE.MeshStandardMaterial({ color: 0x3b1e14, roughness: 0.70, metalness: 0.10 });
  const altarTable = new THREE.Mesh(altarTableGeo, altarTableMat);
  altarTable.position.set(0, 0.55, 0);
  shrineArea.add(altarTable);

  // 3. Án thờ Nỏ Thần plaque
  const crossbowPlaque = createMiniBronzePlaque(
    'NỎ THẦN LIÊN CHÂU',
    'Linh Quang Kim Quy Thần Cơ',
    { width: 1.25, height: 0.32 },
    _disposables
  );
  crossbowPlaque.name = 'ADV_Mini_Plaque_NoThanLienChau';
  crossbowPlaque.position.set(0, 0.85, 0.58);
  crossbowPlaque.rotation.x = -0.10;
  shrineArea.add(crossbowPlaque);

  // Nỏ Thần Linh Quang Kim Quy Thần Cơ
  const crossbowMesh = new THREE.Group();
  crossbowMesh.name = 'ADV_Artifact_NoThan';
  crossbowMesh.position.set(0, 1.15, 0);
  shrineArea.add(crossbowMesh);

  const bowMat = new THREE.MeshStandardMaterial({
    color: 0xb8860b,
    roughness: 0.40,
    metalness: 0.80
  });
  const bowStockGeo = prepGeo(new THREE.BoxGeometry(1.6, 0.12, 0.15));
  const bowStock = new THREE.Mesh(bowStockGeo, bowMat);
  crossbowMesh.add(bowStock);

  for (const sx of [-1, 1]) {
    const limbGeo = prepGeo(new THREE.CylinderGeometry(0.04, 0.02, 1.0, 12));
    const limb = new THREE.Mesh(limbGeo, bowMat);
    limb.position.set(sx * 0.75, 0.12, 0);
    limb.rotation.z = sx * 0.45;
    crossbowMesh.add(limb);
  }

  // Lẫy Vuốt Rùa Vàng (Emissive #ffaa00 intensity 1.8)
  const clawTriggerGeo = prepGeo(new THREE.ConeGeometry(0.12, 0.35, 8));
  const clawTriggerMat = new THREE.MeshStandardMaterial({
    color: 0xffaa00,
    emissive: new THREE.Color(0xffaa00),
    emissiveIntensity: 1.8,
    roughness: 0.20,
    metalness: 0.90
  });
  _clawTriggerMesh = new THREE.Mesh(clawTriggerGeo, clawTriggerMat);
  _clawTriggerMesh.name = 'ADV_KimQuy_Claw_Trigger';
  _clawTriggerMesh.position.set(0, 0.15, 0);
  _clawTriggerMesh.rotation.x = Math.PI;
  crossbowMesh.add(_clawTriggerMesh);

  // Dedicated golden claw PointLight #ffaa00 (flickers with Math.sin(time * 3.5) + noise)
  const clawLight = new THREE.PointLight(0xffaa00, 3.2, 7.0, 1.6);
  clawLight.position.set(0, 0.25, 0);
  clawLight.userData.ignoreRaycaster = true;
  crossbowMesh.add(clawLight);
  _lights.push(clawLight);
  _clawLight = clawLight;

  // Giá Binh Khí Đồng Thau
  const weaponRack = new THREE.Group();
  weaponRack.name = 'ADV_Weapon_Rack';
  weaponRack.position.set(0, 0, -1.2);
  shrineArea.add(weaponRack);

  const rackStandGeo = prepGeo(new THREE.BoxGeometry(2.4, 0.3, 0.5));
  const rackStand = new THREE.Mesh(rackStandGeo, altarTableMat);
  rackStand.position.set(0, 0.15, 0);
  weaponRack.add(rackStand);

  // Instanced Giáo Đồng (8 cây)
  const spearGeo = prepGeo(new THREE.CylinderGeometry(0.025, 0.04, 2.4, 8));
  const spearMat = new THREE.MeshStandardMaterial({ color: 0x8a6b32, roughness: 0.45, metalness: 0.80 });
  const instancedSpears = new THREE.InstancedMesh(spearGeo, spearMat, 8);
  const dummyMatrix = new THREE.Matrix4();
  for (let i = 0; i < 8; i++) {
    const x = -0.9 + i * 0.26;
    dummyMatrix.makeTranslation(x, 1.25, (i % 2 === 0 ? 0.05 : -0.05));
    instancedSpears.setMatrixAt(i, dummyMatrix);
  }
  instancedSpears.instanceMatrix.needsUpdate = true;
  weaponRack.add(instancedSpears);

  // Hàng Trăm Mũi Tên Đồng Ba Cạnh Cổ Loa (InstancedMesh 120 mũi tên)
  const arrowGeo = prepGeo(new THREE.CylinderGeometry(0.008, 0.008, 0.85, 6));
  const arrowMat = new THREE.MeshStandardMaterial({
    color: 0x8a6b32,
    roughness: 0.35,
    metalness: 0.85
  });
  const instancedArrows = new THREE.InstancedMesh(arrowGeo, arrowMat, 120);
  const arrowMatrix = new THREE.Matrix4();
  for (let i = 0; i < 120; i++) {
    const quiverSide = i < 60 ? -1.15 : 1.15;
    const localIdx = i % 60;
    const row = Math.floor(localIdx / 10);
    const col = localIdx % 10;
    const qx = quiverSide + (col - 4.5) * 0.022;
    const qz = (row - 2.5) * 0.022;
    const qy = 0.65 + (Math.random() - 0.5) * 0.06;
    const rotZ = (Math.random() - 0.5) * 0.08;
    const rotX = (Math.random() - 0.5) * 0.08;
    arrowMatrix.makeRotationFromEuler(new THREE.Euler(rotX, 0, rotZ));
    arrowMatrix.setPosition(qx, qy, qz);
    instancedArrows.setMatrixAt(i, arrowMatrix);
  }
  instancedArrows.instanceMatrix.needsUpdate = true;
  weaponRack.add(instancedArrows);

  // Rìu Gót Hài Đông Sơn (Boot-axe đồng cổ)
  const axeMat = new THREE.MeshStandardMaterial({ color: 0x967332, roughness: 0.40, metalness: 0.80 });
  for (const axeX of [-0.45, 0.45]) {
    const axeGroup = new THREE.Group();
    axeGroup.name = 'ADV_DongSon_BootAxe';
    axeGroup.position.set(axeX, 1.1, 0.15);
    const axeHandle = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.02, 0.025, 0.75, 8)), colWoodMat);
    axeGroup.add(axeHandle);
    const axeBlade = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(0.24, 0.18, 0.03)), axeMat);
    axeBlade.position.set(0.10, 0.28, 0);
    axeBlade.rotation.z = -0.2;
    axeGroup.add(axeBlade);
    weaponRack.add(axeGroup);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // G. CÁNH PHẢI: GIẾNG NGỌC MỊ CHÂU (Minh Châu Ánh Ngọc Bích & Nước Trong Caustics)
  // ══════════════════════════════════════════════════════════════════════════
  const wellArea = new THREE.Group();
  wellArea.name = 'ADV_Coast_And_Well_Realm';
  wellArea.position.set(7.0, floorY, 4.0);
  interior.add(wellArea);
  _disposables.push(wellArea);

  const wellStoneMat = new THREE.MeshStandardMaterial({
    color: 0x4a5568,
    roughness: 0.85,
    metalness: 0.08
  });
  const wellCurbGeo = prepGeo(new THREE.CylinderGeometry(1.2, 1.3, 0.75, 8, 1, true));
  const wellCurb = new THREE.Mesh(wellCurbGeo, wellStoneMat);
  wellCurb.name = 'ADV_Artifact_GiengNgoc';
  wellCurb.position.set(0, 0.375, 0);
  wellArea.add(wellCurb);

  // 4. Giếng Ngọc plaque
  const wellPlaque = createMiniBronzePlaque(
    'GIẾNG NGỌC CỔ LOA',
    'Minh Châu Mị Châu Ngàn Năm',
    { width: 1.25, height: 0.32 },
    _disposables
  );
  wellPlaque.name = 'ADV_Mini_Plaque_GiengNgocCoLoa';
  wellPlaque.position.set(0, 0.65, 1.32);
  wellPlaque.rotation.x = -0.15;
  wellArea.add(wellPlaque);

  const wellBottomGeo = prepGeo(new THREE.CircleGeometry(1.15, 8));
  const wellBottom = new THREE.Mesh(wellBottomGeo, wellStoneMat);
  wellBottom.rotation.x = -Math.PI / 2;
  wellBottom.position.set(0, 0.02, 0);
  wellArea.add(wellBottom);

  // Nước Trong Caustics (transmission: 0.88, clearcoat: 1.0)
  const waterGeo = prepGeo(new THREE.CircleGeometry(1.1, 16));
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x004d40,
    transmission: 0.88,
    roughness: 0.05,
    ior: 1.333,
    transparent: true,
    opacity: 0.90,
    reflectivity: 0.5,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08
  });
  _waterCausticMesh = new THREE.Mesh(waterGeo, waterMat);
  _waterCausticMesh.name = 'ADV_DaSon_SeaWater';
  _waterCausticMesh.rotation.x = -Math.PI / 2;
  _waterCausticMesh.position.set(0, 0.70, 0);
  _waterCausticMesh.userData.ignoreRaycaster = true;
  wellArea.add(_waterCausticMesh);

  // Viên Minh Châu Dưới Đáy Giếng (Ngọc Bích #00f5d4, emissive 4.0)
  const pearlGeo = prepGeo(new THREE.SphereGeometry(0.22, 20, 16));
  const pearlMat = new THREE.MeshStandardMaterial({
    color: 0x00f5d4,
    emissive: new THREE.Color(0x00f5d4),
    emissiveIntensity: 4.0,
    roughness: 0.08,
    metalness: 0.25
  });
  _pearlMesh = new THREE.Mesh(pearlGeo, pearlMat);
  _pearlMesh.name = 'ADV_MinhChau_Pearl';
  _pearlMesh.position.set(0, 0.35, 0);
  _pearlMesh.userData.ignoreRaycaster = true;
  wellArea.add(_pearlMesh);

  // Ánh sáng ngọc bích tỏa rạng từ giếng lên vách gỗ lim
  const wellLight = new THREE.PointLight(0x00f5d4, 3.2, 8.0, 1.4);
  wellLight.position.set(0, 0.8, 0);
  wellLight.userData.ignoreRaycaster = true;
  wellArea.add(wellLight);
  _lights.push(wellLight);
  _wellLight = wellLight;

  // ══════════════════════════════════════════════════════════════════════════
  // H. CỔNG KHÔNG GIAN HAI CHIỀU: VÒNG XOÁY THỜI KHÔNG (Matching Đây Thôn Vĩ Dạ)
  // ══════════════════════════════════════════════════════════════════════════
  const portalStation = createSwirlingVortexPortal({ width: 3.2, height: 4.4 });
  portalStation.position.set(7.5, floorY, -9.5);
  portalStation.rotation.y = -Math.PI / 4;
  interior.add(portalStation);
  _disposables.push(portalStation);

  // Zone 2: Con đường mòn đất đỏ rợp bóng trúc xanh dẫn sang Cổng Dịch Chuyển & Cõi Mở Dạ Sơn
  const trailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(2.5, floorY + 0.015, -3.5),
    new THREE.Vector3(4.8, floorY + 0.015, -6.0),
    new THREE.Vector3(6.5, floorY + 0.015, -8.2),
    new THREE.Vector3(7.5, floorY + 0.015, -9.5)
  ]);
  const trailGeo = prepGeo(new THREE.TubeGeometry(trailCurve, 24, 0.95, 8, false));
  const trailMat = new THREE.MeshStandardMaterial({
    color: 0x8b3a20,
    roughness: 0.88,
    metalness: 0.05
  });
  const trailMesh = new THREE.Mesh(trailGeo, trailMat);
  trailMesh.name = 'ADV_RedEarth_Trail';
  trailMesh.scale.set(1, 0.02, 1);
  trailMesh.userData.ignoreRaycaster = true;
  interior.add(trailMesh);
  _disposables.push(trailMesh);

  const trailBamboo = createForegroundBambooCluster(6, 0.55);
  trailBamboo.name = 'ADV_Trail_Bamboo_Cluster';
  trailBamboo.position.set(5.2, floorY, -7.2);
  trailBamboo.userData.ignoreRaycaster = true;
  interior.add(trailBamboo);
  _disposables.push(trailBamboo);

  // ══════════════════════════════════════════════════════════════════════════
  // I. VFX LÔNG NGỖNG TRẮNG BAY LƯỢN (150 hạt, CanvasTexture)
  // ══════════════════════════════════════════════════════════════════════════
  const featherCount = 150;
  const featherGeo = prepGeo(new THREE.BufferGeometry());
  const featherPositions = new Float32Array(featherCount * 3);
  const featherPhases = new Float32Array(featherCount);

  for (let i = 0; i < featherCount; i++) {
    featherPositions[i * 3] = (Math.random() - 0.5) * (roomW - 2.0);
    featherPositions[i * 3 + 1] = 0.5 + Math.random() * (roomH - 1.5);
    featherPositions[i * 3 + 2] = (Math.random() - 0.5) * (roomL - 4.0);
    featherPhases[i] = Math.random() * Math.PI * 2;
  }
  featherGeo.setAttribute('position', new THREE.BufferAttribute(featherPositions, 3));

  const featherTex = createFeatherTexture();
  const featherMat = new THREE.PointsMaterial({
    map: featherTex,
    color: 0xffffff,
    size: 0.24,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  _featherPoints = new THREE.Points(featherGeo, featherMat);
  _featherPoints.name = 'ADV_Goose_Feather_Particles';
  _featherPoints.userData.ignoreRaycaster = true;
  _featherPoints.userData.phases = featherPhases;
  interior.add(_featherPoints);
  _disposables.push(_featherPoints);

  // ══════════════════════════════════════════════════════════════════════════
  // J. ÁNH SÁNG ĐIỆN ẢNH CHIAROSCURO & CHÙM SÁNG VÀNG HOÀNG KIM (#ffbe55)
  // ══════════════════════════════════════════════════════════════════════════
  // 1. Solitary Amber Golden Chiaroscuro SpotLight chiếu rọi bệ ngai
  const kingSpotLight = new THREE.SpotLight(0xffbe55, 52.0, 26.0, Math.PI / 4.8, 0.75, 1.2);
  kingSpotLight.position.set(0, roomH - 0.4 + floorY, -2.5);
  kingSpotLight.target.position.set(0, 1.35 + floorY, -2.5);
  kingSpotLight.castShadow = true;
  kingSpotLight.shadow.bias = -0.0004;
  kingSpotLight.shadow.mapSize.width = 1024;
  kingSpotLight.shadow.mapSize.height = 1024;
  interior.add(kingSpotLight);
  interior.add(kingSpotLight.target);
  _lights.push(kingSpotLight, kingSpotLight.target);

  // Delicate ethereal volumetric light beam (thanh thoát, không chắn tầm nhìn)
  const beamGeo = prepGeo(new THREE.CylinderGeometry(0.35, 2.5, roomH - 1.5, 24, 1, true));
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xffbe55,
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const beamMesh = new THREE.Mesh(beamGeo, beamMat);
  beamMesh.name = 'ADV_Chiaroscuro_VolumetricBeam';
  beamMesh.position.set(0, (roomH - 1.5) / 2 + 1.2 + floorY, -2.5);
  beamMesh.userData.ignoreRaycaster = true;
  interior.add(beamMesh);
  _disposables.push(beamMesh);

  // 2. Accent SpotLight cho Án Thờ Nỏ Thần
  const crossbowSpotLight = new THREE.SpotLight(0xffd700, 45.0, 20.0, Math.PI / 4, 0.70, 1.2);
  crossbowSpotLight.position.set(-7.0, roomH - 0.8 + floorY, 4.0);
  crossbowSpotLight.target.position.set(-7.0, 1.1 + floorY, 4.0);
  crossbowSpotLight.castShadow = true;
  crossbowSpotLight.shadow.bias = -0.0004;
  crossbowSpotLight.shadow.mapSize.width = 1024;
  crossbowSpotLight.shadow.mapSize.height = 1024;
  interior.add(crossbowSpotLight);
  interior.add(crossbowSpotLight.target);
  _lights.push(crossbowSpotLight, crossbowSpotLight.target);

  // 3. Hemisphere Ambient Light (Subtle low ambient for dramatic Chiaroscuro)
  const hemiLight = new THREE.HemisphereLight(0xffe8c2, 0x262930, 0.35);
  interior.add(hemiLight);
  _lights.push(hemiLight);

  // 4. Warm Wall Sconces
  const wallGlowPositions = [
    [-halfW + 1.0, roomH / 2, -halfL + 2.0], [-halfW + 1.0, roomH / 2, halfL - 2.0],
    [halfW - 1.0, roomH / 2, -halfL + 2.0], [halfW - 1.0, roomH / 2, halfL - 2.0]
  ];
  wallGlowPositions.forEach(([gx, gy, gz]) => {
    const pGlow = new THREE.PointLight(0xffaa44, 3.0, 10.0, 1.6);
    pGlow.position.set(gx, floorY + gy, gz);
    interior.add(pGlow);
    _lights.push(pGlow);
  });

  // Delicate Ground Fog (THREE.FogExp2 or subtle mist plane)
  const groundFogGeo = prepGeo(new THREE.PlaneGeometry(roomW * 0.95, roomL * 0.95));
  const groundFogMat = new THREE.MeshBasicMaterial({
    color: 0x12161f,
    transparent: true,
    opacity: 0.22,
    depthWrite: false
  });
  const groundFogMesh = new THREE.Mesh(groundFogGeo, groundFogMat);
  groundFogMesh.name = 'ADV_GroundFog_Plane';
  groundFogMesh.rotation.x = -Math.PI / 2;
  groundFogMesh.position.set(0, floorY + 0.15, 0);
  groundFogMesh.userData.ignoreRaycaster = true;
  interior.add(groundFogMesh);
  _disposables.push(groundFogMesh);

  // Ensure all lights ignore raycaster
  _lights.forEach((l) => {
    l.userData = l.userData || {};
    l.userData.ignoreRaycaster = true;
  });

  // ══════════════════════════════════════════════════════════════════════════
  // K. PROXY HITBOXES TƯƠNG TÁC (LAYER 1: RAYCAST PROXY HITBOXES)
  // ══════════════════════════════════════════════════════════════════════════
  const hitboxDefs = [
    {
      name: 'ADV_Hitbox_Statue_Pedestal',
      legacyName: 'hitbox_statue',
      id: 'anDuongVuongStatue',
      loreKey: 'an_duong_vuong_statue',
      soundKind: 'drum',
      title: 'Tượng An Dương Vương & Bệ Trống Đồng Đông Sơn',
      pos: [0, 2.4 + floorY, -2.5],
      size: [3.6, 4.8, 3.6],
      cameraFocusPos: [0, 2.5, -4.5],
      cameraLookTarget: [0, 3.2, -8.5]
    },
    {
      name: 'ADV_Hitbox_Spiral_Citadel',
      legacyName: 'hitbox_spiral_wall',
      id: 'coloaWall',
      loreKey: 'an_duong_vuong_loaThanh',
      soundKind: 'drum',
      title: 'Sa Bàn 3 Vòng Thành Cổ Loa',
      pos: [0, 0.6 + floorY, -2.5],
      size: [8.4, 1.2, 8.4],
      cameraFocusPos: [0, 3.5, -1.0],
      cameraLookTarget: [0, 0.8, -4.5]
    },
    {
      name: 'ADV_Hitbox_Magic_Crossbow',
      legacyName: 'hitbox_crossbow',
      id: 'altarNo',
      loreKey: 'an_duong_vuong_noThan',
      soundKind: 'crossbow',
      title: 'Bảo Vật Nỏ Thần Liên Châu & Vuốt Rùa Vàng',
      pos: [-7.0, 1.2 + floorY, 4.0],
      size: [3.2, 2.4, 2.4],
      cameraFocusPos: [-4.5, 2.0, -1.8],
      cameraLookTarget: [-7.0, 1.8, -3.8]
    },
    {
      name: 'ADV_Hitbox_Jade_Well',
      legacyName: 'hitbox_jade_well',
      id: 'giengNgoc',
      loreKey: 'an_duong_vuong_giengNgoc',
      soundKind: 'water',
      title: 'Giếng Ngọc Mị Châu & Viên Minh Châu',
      pos: [7.0, 1.2 + floorY, 4.0],
      size: [3.2, 2.4, 3.2],
      cameraFocusPos: [4.5, 2.0, -1.8],
      cameraLookTarget: [7.0, 1.2, -3.8]
    },
    {
      name: 'ADV_Hitbox_Info_Plaque',
      legacyName: 'hitbox_plate',
      id: 'bangThongTin',
      loreKey: 'an_duong_vuong_plaque',
      soundKind: 'chime',
      title: 'Bảng Thông Tin: Truyền Thuyết An Dương Vương',
      pos: [5.4, 1.4 + floorY, halfL - 2.8],
      size: [2.6, 2.4, 1.0],
      isPlaque: true,
      isPlaqueProxy: true,
      cameraFocusPos: [3.8, 1.8, 10.0],
      cameraLookTarget: [5.4, 1.6, 12.0]
    }
  ];

  hitboxDefs.forEach((def) => {
    const hitGeo = prepGeo(new THREE.BoxGeometry(...def.size));
    const hitMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.name = def.name;
    hitMesh.position.set(...def.pos);
    hitMesh.userData = {
      hitboxId: def.id,
      loreId: def.id,
      loreKey: def.loreKey,
      soundKind: def.soundKind,
      title: def.title,
      isClickProxy: true,
      isArtifact3D: true,
      roomId: 'an_duong_vuong',
      cameraFocusPos: def.cameraFocusPos,
      cameraLookTarget: def.cameraLookTarget,
      interactive: true,
      onActivate: () => {
        if (def.soundKind) {
          playImmediateClickSound(def.soundKind);
        }
        triggerAnDuongVuongLore(def.loreKey, {
          cameraFocusPos: def.cameraFocusPos,
          cameraLookTarget: def.cameraLookTarget
        });
      }
    };
    if (def.isPlaque) hitMesh.userData.isPlaque = true;
    if (def.isPlaqueProxy) hitMesh.userData.isPlaqueProxy = true;

    interior.add(hitMesh);
    _disposables.push(hitMesh);

    // Legacy alias registration for backward compatibility
    if (def.legacyName) {
      const aliasGeo = prepGeo(new THREE.BufferGeometry());
      const aliasMesh = new THREE.Mesh(aliasGeo, hitMat);
      aliasMesh.name = def.legacyName;
      aliasMesh.userData = hitMesh.userData;
      aliasMesh.visible = false;
      interior.add(aliasMesh);
      _disposables.push(aliasMesh);
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // L. ÂM THANH KHÔNG GIAN 3D (3D Positional Audio)
  // ══════════════════════════════════════════════════════════════════════════
  setupAudioNode(new THREE.Vector3(0, 1.5 + floorY, -2.5), 'drum', 4.0, 16.0, 0.5);
  setupAudioNode(new THREE.Vector3(-7.0, 1.2 + floorY, 4.0), 'crossbow', 3.0, 12.0, 0.4);
  setupAudioNode(new THREE.Vector3(6.8, 1.2 + floorY, -8.5), 'waves', 4.0, 18.0, 0.45);

  // ══════════════════════════════════════════════════════════════════════════
  // M. SOLID OBSTACLES LIST (LAYER 3: MOVEMENT COLLIDERS)
  // ══════════════════════════════════════════════════════════════════════════
  const solidObstacleList = [
    // 1. Perimeter Walls
    { obj: northWingL, tag: 'ADV_Wall_North_Left', shrinkFactor: 0.95 },
    { obj: northWingR, tag: 'ADV_Wall_North_Right', shrinkFactor: 0.95 },
    { obj: westWall, tag: 'ADV_Wall_West', shrinkFactor: 0.95 },
    { obj: eastWall, tag: 'ADV_Wall_East', shrinkFactor: 0.95 },
    { obj: southWallLeft, tag: 'ADV_Wall_South_Left', shrinkFactor: 0.95 },
    { obj: southWallRight, tag: 'ADV_Wall_South_Right', shrinkFactor: 0.95 },
    // 2. Entrance Gate Pillars
    { obj: pillarL, tag: 'ADV_Gate_Pillar_Left', shrinkFactor: 0.95 },
    { obj: pillarR, tag: 'ADV_Gate_Pillar_Right', shrinkFactor: 0.95 },
    // 3. 8 Lim Columns
    ...limColumns.map((col, idx) => ({ obj: col, tag: `ADV_Lim_Column_${idx + 1}`, shrinkFactor: 0.90 })),
    // 4. Entrance Bamboo Clusters
    { obj: bambooLeft, tag: 'ADV_Foreground_Bamboo_Left', shrinkFactor: 0.88 },
    { obj: bambooRight, tag: 'ADV_Foreground_Bamboo_Right', shrinkFactor: 0.88 },
    // 5. Central Pedestal Base
    { obj: t1Mesh, tag: 'ADV_Central_Dais_Step1_Tier', shrinkFactor: 0.92 },
    // 6. Crossbow Shrine
    { obj: altarTable, tag: 'ADV_Crossbow_Altar_Table', shrinkFactor: 0.92 },
    { obj: weaponRack, tag: 'ADV_Crossbow_Weapon_Rack', shrinkFactor: 0.92 },
    // 7. Jade Well
    { obj: wellCurb, tag: 'ADV_Jade_Well_Curb', shrinkFactor: 0.92 },
    // 8. Plaque Stand
    { obj: infoPlaque, tag: 'ADV_Heritage_InfoPlaque_Stand', shrinkFactor: 0.92 },
    // 9. Portal Pier Colliders
    ...(portalStation.userData?.pierColliders || []).map((pier, idx) => ({
      obj: pier,
      tag: pier.name || `ADV_Portal_Pier_${idx === 0 ? 'Left' : 'Right'}`,
      shrinkFactor: 0.95
    }))
  ];
  roomGroup.userData.solidObstacleList = solidObstacleList;

  // ══════════════════════════════════════════════════════════════════════════
  // M. ĐĂNG KÝ SPATIAL REGISTRY COLLIDERS
  // ══════════════════════════════════════════════════════════════════════════
  try {
    const registry = getSpatialRegistry?.();
    if (registry?.registerCollider) {
      targetConfigs.forEach((cfg) => {
        const obj = interior.getObjectByName(cfg.name);
        if (obj) {
          obj.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(obj);
          registry.registerCollider?.(`an_duong_vuong_${cfg.name}`, box, { padding: 1.5 });
        }
      });
    }
  } catch (_) {}

  return roomGroup;
}

// ─── Target configs for spatial registry & validation ────────────────────────
const targetConfigs = [
  { name: 'ADV_CoLoa_Stone_Archway' },
  { name: 'ADV_Heritage_InfoPlaque' },
  { name: 'ADV_Central_Dais_LoaThanh' },
  { name: 'ADV_Crossbow_Shrine_Area' },
  { name: 'ADV_Coast_And_Well_Realm' },
  { name: 'ADV_Realm_Portal_Altar' }
];

// ─── Clean Disposal Function ──────────────────────────────────────────────────
export function disposeAnDuongVuongRoom(scene) {
  if (_activeExhibition?.restoreFog) {
    _activeExhibition.restoreFog();
  }
  _lights.forEach((l) => {
    l.parent?.remove(l);
    scene?.remove(l);
  });
  _sounds.forEach((s) => {
    try {
      s?.userData?.stop?.();
      s?.stop?.();
      s?.disconnect?.();
    } catch (_) {}
  });

  _disposables.forEach((d) => {
    if (!d) return;
    d.traverse?.((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) child.material.forEach((m) => m?.dispose());
        else child.material.dispose();
      }
    });
    if (d.geometry) d.geometry.dispose();
    if (d.material) {
      if (Array.isArray(d.material)) d.material.forEach((m) => m?.dispose());
      else d.material.dispose();
    }
  });

  if (_roomGroup) {
    while (_roomGroup.children.length > 0) {
      const child = _roomGroup.children[0];
      _roomGroup.remove(child);
      child.traverse?.((c) => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          if (Array.isArray(c.material)) c.material.forEach((m) => m?.dispose());
          else c.material.dispose();
        }
      });
    }
  }

  _roomGroup = null;
  _disposables = [];
  _lights = [];
  _sounds = [];
  _vortexUniforms = null;
  _pearlMesh = null;
  _clawTriggerMesh = null;
  _clawLight = null;
  _wellLight = null;
  _backdropSeaMesh = null;
  _featherPoints = null;
  _waterCausticMesh = null;
  _portalStation = null;
  _portalLight = null;
  _portalSignMesh = null;
  _portalClickProxy = null;
  _proximityArmed = true;
  teleportBook = null;
}

// ─── Validate Room Spatial Layout (Anti-Collision Engine) ────────────────────
export function validateRoomSpatialLayout(roomGroup) {
  roomGroup?.updateMatrixWorld?.(true);
  const elements = [];
  targetConfigs.forEach((cfg) => {
    const obj = roomGroup?.getObjectByName?.(cfg.name);
    if (obj) {
      obj.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(obj);
      elements.push({ name: cfg.name, obj, box });
    }
  });

  const pairResults = [];
  let minPairwiseClearance = Infinity;
  let hasCollision = false;

  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      const a = elements[i];
      const b = elements[j];
      const isOverlap = a.box.intersectsBox(b.box);
      if (isOverlap) {
        hasCollision = true;
      }
      const dx = Math.max(0, a.box.min.x - b.box.max.x, b.box.min.x - a.box.max.x);
      const dz = Math.max(0, a.box.min.z - b.box.max.z, b.box.min.z - a.box.max.z);
      const clearance = isOverlap ? 0 : Math.hypot(dx, dz);
      if (clearance < minPairwiseClearance) {
        minPairwiseClearance = clearance;
      }
      pairResults.push({
        pair: `${a.name} <-> ${b.name}`,
        clearance,
        isOverlap
      });
    }
  }

  return {
    elements,
    hasCollision,
    minPairwiseClearance: elements.length > 1 ? minPairwiseClearance : 0,
    pairResults,
    isCleared: elements.length === 0
  };
}

// ─── Trigger Lore Overlay ─────────────────────────────────────────────────────
export function triggerAnDuongVuongLore(loreKey = 'an_duong_vuong', options = {}) {
  const soundMap = {
    an_duong_vuong: 'drum',
    an_duong_vuong_statue: 'drum',
    an_duong_vuong_loaThanh: 'drum',
    an_duong_vuong_noThan: 'crossbow',
    an_duong_vuong_giengNgoc: 'water',
    an_duong_vuong_plaque: 'chime',
    cuon_sach_thien_thu: 'portal'
  };
  const soundKind = soundMap[loreKey] || 'drum';
  playImmediateClickSound(soundKind);

  if (typeof window !== 'undefined') {
    const camMgr = window.__museumCameraManager || window.cameraManager;
    if (options.cameraFocusPos && options.cameraLookTarget && camMgr?.smoothZoomToFocus) {
      const posW = new THREE.Vector3(...options.cameraFocusPos);
      const tgtW = new THREE.Vector3(...options.cameraLookTarget);
      camMgr.smoothZoomToFocus(posW, tgtW, { duration: 0.75 });
    }

    if (window.__loreOverlay?.show) {
      window.__loreOverlay.show(loreKey);
      return true;
    }
    if (window.__loreGuide?.show) {
      window.__loreGuide.show(loreKey);
      return true;
    }
  }
  return true;
}

// ─── Context & Realm stubs ────────────────────────────────────────────────────
export function enterRealm(targetRealm = 'an_duong_vuong') {
  if (typeof window !== 'undefined' && window.__anDuongVuongRoom?.enterRealm) {
    window.__anDuongVuongRoom.enterRealm(targetRealm);
  }
}

export function setupContext(ctx = {}) {
  if (typeof window !== 'undefined' && window.__anDuongVuongRoom?.setupContext) {
    window.__anDuongVuongRoom.setupContext(ctx);
  }
}

// ─── Exhibition Master Root (Entry point for main.js) ────────────────────────
export function buildAnDuongVuongExhibition(options = {}) {
  const roomCenter = options.roomCenter ?? new THREE.Vector3(0, 0, 0);
  let _realmScene = options.realmScene ?? null;
  let _scene = options.mainScene ?? options.scene ?? null;
  let _camera = options.camera ?? null;
  let _renderer = options.renderer ?? null;
  let _cameraManager = options.cameraManager ?? null;
  let _controls = options.controls ?? null;
  let _hitboxManager = options.hitboxManager ?? null;
  let _world = null;
  let _isInsideRealm = false;
  let _isTransitioning = false;
  const _savedCameraPosition = new THREE.Vector3();

  const root = new THREE.Group();
  root.name = 'AnDuongVuong_Master_Root';
  if (roomCenter) {
    root.position.copy(roomCenter);
  }

  // 1. Museum Room Group
  const roomGroup = new THREE.Group();
  roomGroup.name = 'AnDuongVuong_Museum_Room';
  roomGroup.visible = true;
  root.add(roomGroup);

  // 2. Battle Realm Master Group
  const realmMaster = new THREE.Group();
  realmMaster.name = 'AnDuongVuong_Battle_Realm_Master';
  realmMaster.position.copy(ADV_REALM_ORIGIN);
  realmMaster.visible = false;
  root.add(realmMaster);

  // Build the room components
  buildAnDuongVuongRoom(roomGroup, { floorY: 0, glbUrl: options.glbUrl })
    .then(() => {
      if (_hitboxManager) {
        root.userData.registerHitboxes(_hitboxManager);
      }
    })
    .catch((err) => {
      console.warn('[AnDuongVuongRoom] build error:', err);
    });

  // Init open-world realm if realmScene passed
  if (_realmScene) {
    try {
      _world = new AnDuongVuongWorld(_realmScene, _camera, _renderer);
      _world.init().catch((err) => console.warn('[AnDuongVuongWorld] init error:', err));
    } catch (e) {
      console.warn('[AnDuongVuongWorld] error:', e);
    }
  }

  // ACESFilmicToneMapping configuration & Tone Mapping
  if (_renderer) {
    _renderer.toneMapping = THREE.ACESFilmicToneMapping;
    _renderer.toneMappingExposure = 1.1;
  }

  // ─── Dynamic Fog Blending (from Tắt Đèn) ──────────────────────────────────
  // When camera distance to room center < 22m, smoothly lerp mainScene.fog from lobby (0xdca878, 0.00075) to ancient night fog (0x12161f, 0.0038)
  // and attenuate exterior ambient light by 25%. When camera exits, smoothly restore!
  let _fogBlend = 0;
  let _capturedOriginals = false;
  const _savedFogColor = new THREE.Color(0xdca878);
  let _savedFogDensity = 0.00075;
  const _savedAtriumLights = [];
  const _ancientNightFogColor = new THREE.Color(0x12161f);
  const _ancientNightFogDensity = 0.0038;

  function captureAtriumState(sceneRef) {
    if (_capturedOriginals || !sceneRef) return;
    _capturedOriginals = true;
    if (sceneRef.fog && sceneRef.fog.isFogExp2) {
      _savedFogColor.copy(sceneRef.fog.color);
      _savedFogDensity = sceneRef.fog.density;
    }
    sceneRef.traverse((obj) => {
      if (!obj.isLight) return;
      if (
        obj.userData?.isPlaqueSpotLight ||
        obj.userData?.isPooledLight ||
        obj.name?.startsWith('Pooled_') ||
        obj.name?.startsWith('ADV_')
      ) {
        return;
      }
      let cur = obj;
      while (cur) {
        if (cur === roomGroup || cur === root) return;
        cur = cur.parent;
      }
      _savedAtriumLights.push({ light: obj, baseIntensity: obj.intensity });
    });
  }

  function restoreFog() {
    if (_capturedOriginals && _scene && _scene.fog && _scene.fog.isFogExp2) {
      _scene.fog.color.copy(_savedFogColor);
      _scene.fog.density = _savedFogDensity;
    }
    for (let i = 0; i < _savedAtriumLights.length; i++) {
      const entry = _savedAtriumLights[i];
      if (entry.light) entry.light.intensity = entry.baseIntensity;
    }
    _fogBlend = 0;
  }

  function updateFogBlend(delta = 0.016, camera = _camera, sceneRef = _scene, center = roomCenter) {
    const s = sceneRef || _scene;
    const cam = camera || _camera;
    if (!s || !cam) return _fogBlend;
    const camPos = cam.position;
    if (!camPos) return _fogBlend;

    const refCenter = center || roomCenter;
    const dist = camPos.distanceTo(refCenter);
    const inside = dist < 22.0;

    if (inside && !_capturedOriginals) {
      captureAtriumState(s);
    }

    const target = inside ? 1.0 : 0.0;
    const step = Math.min(1.0, Math.max(0.05, delta * 3.8));
    const prevBlend = _fogBlend;
    _fogBlend += (target - _fogBlend) * step;

    if (Math.abs(_fogBlend - prevBlend) > 0.0005 || inside) {
      if (!s.fog || !s.fog.isFogExp2) {
        s.fog = new THREE.FogExp2(_savedFogColor.getHex(), _savedFogDensity);
      }
      s.fog.color.copy(_savedFogColor).lerp(_ancientNightFogColor, _fogBlend);
      s.fog.density = _savedFogDensity + (_ancientNightFogDensity - _savedFogDensity) * _fogBlend;

      const lightScale = 1.0 - _fogBlend * 0.25;
      for (let i = 0; i < _savedAtriumLights.length; i++) {
        const entry = _savedAtriumLights[i];
        if (entry.light) {
          entry.light.intensity = entry.baseIntensity * lightScale;
        }
      }
    } else if (!inside && prevBlend > 0 && _fogBlend <= 0.001) {
      _fogBlend = 0;
      if (s.fog && s.fog.isFogExp2) {
        s.fog.color.copy(_savedFogColor);
        s.fog.density = _savedFogDensity;
      }
      for (let i = 0; i < _savedAtriumLights.length; i++) {
        const entry = _savedAtriumLights[i];
        if (entry.light) {
          entry.light.intensity = entry.baseIntensity;
        }
      }
    }

    return _fogBlend;
  }

  // Realm transitions
  function enterRealm(targetRealm = 'an_duong_vuong') {
    if (_isInsideRealm || _isTransitioning) return;
    _isTransitioning = true;
    _isInsideRealm = true;
    roomGroup.visible = false;
    realmMaster.visible = true;

    const cam = _camera || (typeof window !== 'undefined' ? window.__camera : null);
    if (cam) _savedCameraPosition.copy(cam.position);
    const ctrl = _cameraManager?.controls || (typeof window !== 'undefined' ? window.__controls : null);
    const camCtrl = _cameraManager?.cameraController || (typeof window !== 'undefined' ? window.__cameraController : null);

    const doTransition = () => {
      _isTransitioning = false;
      const targetScene = _realmScene || (typeof window !== 'undefined' ? window.__anDuongVuongScene : null);
      if (typeof window !== 'undefined' && window.__app?.setActiveScene && targetScene) {
        window.__app.setActiveScene(targetScene);
      } else if (_cameraManager && targetScene) {
        _cameraManager.switchScene?.(targetScene, ADV_REALM_ORIGIN.clone().add(ADV_OBS_PLATFORM_OFFSET));
      }
      if (typeof window !== 'undefined' && window.__spatialAudio?.playRealmSoundscape) {
        window.__spatialAudio.playRealmSoundscape('anDuongVuong_bienDong');
      }
    };

    const bookTarget = roomGroup.getObjectByName('Interactive_AnDuongVuong_Teleport_Book');
    if (playBookVortexCutscene && bookTarget && cam) {
      try {
        playBookVortexCutscene({
          camera: cam,
          cameraController: camCtrl,
          controls: ctrl,
          bookMesh: bookTarget,
          themeColor: 0x00f5d4,
          onTransition: doTransition
        });
      } catch (_) {
        doTransition();
      }
    } else {
      doTransition();
    }
  }

  function exitRealm() {
    _isInsideRealm = false;
    _isTransitioning = false;
    roomGroup.visible = true;
    realmMaster.visible = false;

    const targetScene = _scene || (typeof window !== 'undefined' ? window.__mainScene : null);
    if (typeof window !== 'undefined' && window.__app?.setActiveScene && window.__app?.scene) {
      window.__app.setActiveScene(window.__app.scene);
    } else if (_cameraManager && targetScene) {
      _cameraManager.switchScene?.(targetScene, _savedCameraPosition.lengthSq() > 0 ? _savedCameraPosition : new THREE.Vector3(0, 1.8, 0));
    }
  }

  // Animation update loop (Zero-Allocation 60+ FPS)
  root.update = function (delta = 0.016, elapsedTime = 0, camera = null) {
    if (!roomGroup.visible) return;
    if (camera) _camera = camera;

    // 0. Dynamic Fog Blending (from Tắt Đèn)
    // Lerp from lobby (0xdca878, 0.00075) to ancient night fog (0x12161f, 0.0038) within 22m
    updateFogBlend(delta, camera || _camera, _scene, roomCenter);

    // 1. Awakening Obsidian Mirror Portal Shader & Proximity Trigger
    if (_portalStation && _vortexUniforms) {
      _vortexUniforms.uTime.value = elapsedTime;

      const cam = camera || _camera || (typeof window !== 'undefined' ? (window.__camera || window.__mainCamera) : null);
      if (cam) {
        _portalStation.getWorldPosition(_portalWorldPos);
        cam.getWorldPosition(_cameraWorldPos);

        const dx = _cameraWorldPos.x - _portalWorldPos.x;
        const dz = _cameraWorldPos.z - _portalWorldPos.z;
        const dy = Math.abs(_cameraWorldPos.y - _portalWorldPos.y);
        const distXZ = Math.hypot(dx, dz);

        // Awakening lerp: 1.0 when within 6.0m, else 0.05 (idle)
        const targetAwaken = distXZ < 6.0 ? 1.0 : 0.05;
        _vortexUniforms.uAwaken.value += (targetAwaken - _vortexUniforms.uAwaken.value) * Math.min(1.0, delta * 3.5);

        // Adjust portal light & sign glow with awakening factor
        if (_portalLight) {
          _portalLight.intensity = 0.8 + _vortexUniforms.uAwaken.value * 2.6;
        }
        if (_portalSignMesh?.material) {
          _portalSignMesh.material.opacity = 0.65 + _vortexUniforms.uAwaken.value * 0.35;
        }

        // Proximity Trigger: when player is < 2.2m and dy < 2.5m
        if (distXZ < 2.2 && dy < 2.5 && !_isInsideRealm && !_isTransitioning && _proximityArmed) {
          _proximityArmed = false;
          enterRealm('an_duong_vuong');
        } else if (!_isInsideRealm && !_proximityArmed && distXZ > 3.8) {
          _proximityArmed = true;
        }
      }
    } else if (_vortexUniforms?.uTime) {
      _vortexUniforms.uTime.value = elapsedTime;
    }

    // 2. Floating goose feather wave motion
    if (_featherPoints?.geometry?.attributes?.position) {
      const posAttr = _featherPoints.geometry.attributes.position;
      const phases = _featherPoints.userData?.phases;
      if (phases) {
        const arr = posAttr.array;
        const count = phases.length;
        for (let i = 0; i < count; i++) {
          const idx = i * 3 + 1;
          arr[idx] += Math.sin(elapsedTime * 1.5 + phases[i]) * 0.003;
        }
        posAttr.needsUpdate = true;
      }
    }

    // 3. Minh Châu pearl pulse & well light caustics shimmer
    if (_pearlMesh?.material) {
      _pearlMesh.material.emissiveIntensity = 3.5 + Math.sin(elapsedTime * 2.2) * 1.2;
    }
    if (_wellLight) {
      _wellLight.intensity = 3.0 + Math.sin(elapsedTime * 2.2) * 0.7 + Math.cos(elapsedTime * 4.1) * 0.25;
    }

    // 4. Golden Turtle Claw Trigger glow breathing & procedural flicker (Math.sin(time * 3.5) + noise)
    if (_clawTriggerMesh?.material) {
      const flickerNoise = Math.sin(elapsedTime * 17.3) * 0.18 + Math.cos(elapsedTime * 23.7) * 0.08;
      const basePulse = Math.sin(elapsedTime * 3.5) * 0.45;
      const intensity = 1.6 + basePulse + flickerNoise;
      _clawTriggerMesh.material.emissiveIntensity = Math.max(0.8, intensity);
      if (_clawLight) {
        _clawLight.intensity = Math.max(1.2, 2.8 + basePulse * 1.5 + flickerNoise * 1.2);
      }
    }

    // 5. Water caustics opacity shimmer & subtle wave rotation
    if (_waterCausticMesh?.material) {
      _waterCausticMesh.material.opacity = 0.88 + Math.sin(elapsedTime * 1.8) * 0.05;
      _waterCausticMesh.rotation.z = elapsedTime * 0.04;
    }

    // 6. Rolling sea backdrop wave shimmer
    if (_backdropSeaMesh?.material) {
      _backdropSeaMesh.material.emissiveIntensity = 0.40 + Math.sin(elapsedTime * 1.5) * 0.12;
    }
  };

  root.updateRealm = function (delta, elapsedTime, camera) {
    if (_world) _world.update(delta, elapsedTime, camera);
  };

  root.enterRealm = enterRealm;
  root.exitRealm = exitRealm;
  root.isInsideRealm = () => _isInsideRealm;
  root.getGroup = () => roomGroup;
  root.teleportBook = teleportBook;
  root.updateFogBlend = updateFogBlend;
  root.restoreFog = restoreFog;

  _activeExhibition = root;

  root.setupContext = function (ctx = {}) {
    if (ctx.realmScene) _realmScene = ctx.realmScene;
    if (ctx.mainScene || ctx.scene) {
      _scene = ctx.mainScene || ctx.scene;
      if (_scene && !_capturedOriginals) {
        captureAtriumState(_scene);
      }
    }
    if (ctx.camera) _camera = ctx.camera;
    if (ctx.renderer) _renderer = ctx.renderer;
    if (ctx.cameraManager) _cameraManager = ctx.cameraManager;
    if (ctx.controls) _controls = ctx.controls;
    if (ctx.hitboxManager) {
      _hitboxManager = ctx.hitboxManager;
      root.userData.registerHitboxes(_hitboxManager);
    }
    if (ctx.portalInteraction?.registerInteractiveBook) {
      if (_portalClickProxy) {
        ctx.portalInteraction.registerInteractiveBook(_portalClickProxy, new THREE.Vector3(260, 424.0, -418.0), _portalClickProxy.userData.portalMetadata);
      }
      if (teleportBook) {
        ctx.portalInteraction.registerInteractiveBook(teleportBook, new THREE.Vector3(260, 424.0, -418.0), teleportBook.userData);
      }
    }
  };

  root.dispose = function () {
    restoreFog();
    disposeAnDuongVuongRoom(roomGroup);
  };

  root.getAutoTourWaypoints = () => AN_DUONG_VUONG_TOUR_WAYPOINTS;
  root.autoTourWaypoints = AN_DUONG_VUONG_TOUR_WAYPOINTS;

  root.userData = {
    themeKey: 'anDuongVuong',
    roomGroup,
    tourWaypoints: AN_DUONG_VUONG_TOUR_WAYPOINTS,
    wireInteractiveSystems: (ctx = {}) => {
      root.setupContext(ctx);
    },
    registerHitboxes: (hitboxManager) => {
      const hbm = hitboxManager || (typeof window !== 'undefined' ? (window.__museumHitboxManager || window.hitboxManager) : null);
      if (!hbm) return;

      // 1. Layer 1: Collect and Register Raycast Proxy Hitboxes
      const hitboxes = [];
      roomGroup.traverse((child) => {
        if (
          (child.name?.startsWith('ADV_Hitbox_') ||
           child.name?.startsWith('hitbox_') ||
           child.name === 'ADV_Portal_ClickProxy') &&
          child.userData?.isClickProxy
        ) {
          hitboxes.push(child);
        }
      });
      hbm.registerRoomHitboxes?.('an_duong_vuong', hitboxes);

      // Register individual clickable proxies with hitboxManager clickProxies
      hitboxes.forEach((hb) => {
        if (hbm.registerInteractiveObject) {
          hbm.registerInteractiveObject(hb, hb.userData);
        } else if (Array.isArray(hbm.clickProxies) && !hbm.clickProxies.includes(hb)) {
          hbm.clickProxies.push(hb);
        }
      });

      // Register Portal Proxy and Teleport Book
      if (_portalClickProxy) {
        if (hbm.registerInteractiveObject) {
          hbm.registerInteractiveObject(_portalClickProxy, _portalClickProxy.userData);
        } else if (Array.isArray(hbm.clickProxies) && !hbm.clickProxies.includes(_portalClickProxy)) {
          hbm.clickProxies.push(_portalClickProxy);
        }
        try {
          registerInteractiveBook(_portalClickProxy, new THREE.Vector3(260, 424.0, -418.0), _portalClickProxy.userData?.portalMetadata);
        } catch (_) {}
      }
      if (teleportBook) {
        if (hbm.registerInteractiveObject) {
          hbm.registerInteractiveObject(teleportBook, teleportBook.userData);
        } else if (Array.isArray(hbm.clickProxies) && !hbm.clickProxies.includes(teleportBook)) {
          hbm.clickProxies.push(teleportBook);
        }
        try {
          registerInteractiveBook(teleportBook, new THREE.Vector3(260, 424.0, -418.0), teleportBook.userData);
        } catch (_) {}
      }

      // 2. Layer 3: Register Movement Colliders (Box3) with hitboxManager.registerSolidObjectCollider
      if (hbm.registerSolidObjectCollider) {
        const solidEntries = roomGroup.userData?.solidObstacleList || [];
        solidEntries.forEach((entry) => {
          if (!entry.obj) return;
          try {
            entry.obj.updateMatrixWorld?.(true);
            hbm.registerSolidObjectCollider(entry.obj, {
              shrinkFactor: entry.shrinkFactor ?? 0.95,
              customBox: entry.customBox ?? null,
              tag: entry.tag ?? entry.obj?.name ?? 'ADV_Obstacle',
              helperColor: entry.helperColor ?? 0x22c55e,
              realm: 'museum'
            });
          } catch (err) {
            console.warn('[registerHitboxes] solid collider warning:', err?.message);
          }
        });
      }
    }
  };

  return root;
}

// ─── Module Export: updateFogBlend ───────────────────────────────────────────
export function updateFogBlend(delta = 0.016, camera = null, mainScene = null, roomCenter = null) {
  if (_activeExhibition?.updateFogBlend) {
    return _activeExhibition.updateFogBlend(delta, camera, mainScene, roomCenter);
  }
  return 0;
}
