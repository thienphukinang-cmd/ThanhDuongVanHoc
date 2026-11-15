// voNhatRoomDecorator.js — VỢ NHẶT (KIM LÂN 1945) — KHÁT VỌNG SỐNG GIỮA NẠN ĐÓI ẤT DẬU
// Master Exhibition & Open-World Architecture System (60+ FPS, Zero-Domino, Real Chiaroscuro Lighting)
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { getSpatialRegistry } from './spatialRegistry.js';
import { getSharedGltfLoader, loadGlbCached } from '../utils/modelLoaderHelper.js';
import { VoNhatWorld, VO_NHAT_LORE } from '../worlds/voNhatWorld.js';
import { ARTIFACT_LORE_DATABASE } from './museumImmersionSystem.js';
import { playBookVortexCutscene } from './bookVortexCutscene.js';
import { registerInteractiveBook } from './PortalInteraction.js';
import { VO_NHAT_TOUR_WAYPOINTS } from './museumCuratorAndTourSystem.js';

// ─── Constants & Architecture Offsets ─────────────────────────────────────────
export const VN_REALM_ORIGIN = new THREE.Vector3(-260, 420, -450);
export const VN_OBS_PLATFORM_OFFSET = new THREE.Vector3(0, 18.0, 42.0);
export const VN_OBS_LOOK_TARGET_OFFSET = new THREE.Vector3(0, 4.0, 0);

// ─── Module-level state ───────────────────────────────────────────────────────
let _roomGroup = null;
let _disposables = [];
let _lights = [];
let _sounds = [];

// ─── Đăng ký 4 Chương Học Thuật Vợ Nhặt vào ARTIFACT_LORE_DATABASE ─────────────
function registerVoNhatAcademicLore() {
  if (!ARTIFACT_LORE_DATABASE || typeof ARTIFACT_LORE_DATABASE !== 'object') return;

  ARTIFACT_LORE_DATABASE.famine_context = {
    room: 'XÓM NGỤ CƯ • VỢ NHẶT (KIM LÂN 1945)',
    title: VO_NHAT_LORE.famine_context.title,
    subtitle: VO_NHAT_LORE.famine_context.period,
    author: 'Kim Lân',
    publicationYear: '1945',
    sectorCode: 'VN-1945-01',
    poem: [
      '“Cái đói đã tràn đến xóm ngụ cư tự lúc nào...',
      'Những gia đình từ Nam Định, Thái Bình đội chiếu lũ lượt bồng bế nhau lên.',
      'Dưới những gốc đa, gốc gạo xù xì, bóng những người đói dật dờ đi lại như những bóng ma.”',
      '— Vợ Nhặt (1945)'
    ],
    description: VO_NHAT_LORE.famine_context.content,
    styleTheme: 'giay_do'
  };

  ARTIFACT_LORE_DATABASE.trang_and_wife = {
    room: 'XÓM NGỤ CƯ • VỢ NHẶT (KIM LÂN 1945)',
    title: VO_NHAT_LORE.trang_and_wife.title,
    subtitle: VO_NHAT_LORE.trang_and_wife.period,
    author: 'Kim Lân',
    publicationYear: '1945',
    sectorCode: 'VN-1945-02',
    poem: [
      '“Tràng quay lại nhìn thị, thị cắp cái thúng con, đầu hơi cúi xuống...',
      'Tràng cảm thấy trong người có cái gì êm ái, lơ lửng.',
      'Bây giờ hắn mới thấy hắn nên người, hắn thấy hắn có bổn phận phải lo lắng cho vợ con sau này.”',
      '— Vợ Nhặt (1945)'
    ],
    description: VO_NHAT_LORE.trang_and_wife.content,
    styleTheme: 'giay_do'
  };

  ARTIFACT_LORE_DATABASE.mrs_tu_meal = {
    room: 'XÓM NGỤ CƯ • VỢ NHẶT (KIM LÂN 1945)',
    title: VO_NHAT_LORE.mrs_tu_meal.title,
    subtitle: VO_NHAT_LORE.mrs_tu_meal.period,
    author: 'Kim Lân',
    publicationYear: '1945',
    sectorCode: 'VN-1945-03',
    poem: [
      '“Bà cụ bưng vào một cái nồi bốc khói nghi ngút...',
      '— Chè khoán đây, ngon đáo để cơ mày ạ!',
      'Miếng cám đắng chát và nghẹn ứ ở cổ họng, nhưng bà cụ vẫn tươi cười nói toàn chuyện tương lai.”',
      '— Vợ Nhặt (1945)'
    ],
    description: VO_NHAT_LORE.mrs_tu_meal.content,
    styleTheme: 'giay_do'
  };

  ARTIFACT_LORE_DATABASE.revolutionary_flag = {
    room: 'XÓM NGỤ CƯ • VỢ NHẶT (KIM LÂN 1945)',
    title: VO_NHAT_LORE.revolutionary_flag.title,
    subtitle: VO_NHAT_LORE.revolutionary_flag.period,
    author: 'Kim Lân',
    publicationYear: '1945',
    sectorCode: 'VN-1945-04',
    poem: [
      '“Trên ngọn cây gạo đầu làng, đàn quạ bay liệng thành từng đám mây đen...',
      'Tiếng trống thúc thuế dồn dập vang lên đằng đình.',
      'Trong óc Tràng vẫn thấy đám người đói ầm ầm kéo nhau đi phá kho thóc Nhật,',
      'đằng trước là lá cờ đỏ sao vàng bay phấp phới...”',
      '— Kết truyện Vợ Nhặt (1945)'
    ],
    description: VO_NHAT_LORE.revolutionary_flag.content,
    styleTheme: 'giay_do'
  };

  // Aliases đồng bộ các mã định danh Hitbox
  ARTIFACT_LORE_DATABASE.voNhatStatue = ARTIFACT_LORE_DATABASE.trang_and_wife;
  ARTIFACT_LORE_DATABASE.weddingMeal = ARTIFACT_LORE_DATABASE.mrs_tu_meal;
  ARTIFACT_LORE_DATABASE.thatchedCottage = ARTIFACT_LORE_DATABASE.famine_context;
  ARTIFACT_LORE_DATABASE.grainCart = ARTIFACT_LORE_DATABASE.famine_context;
  ARTIFACT_LORE_DATABASE.redFlagBeacon = ARTIFACT_LORE_DATABASE.revolutionary_flag;
  ARTIFACT_LORE_DATABASE.voNhat_famine_context = ARTIFACT_LORE_DATABASE.famine_context;
  ARTIFACT_LORE_DATABASE.voNhat_trang_and_wife = ARTIFACT_LORE_DATABASE.trang_and_wife;
  ARTIFACT_LORE_DATABASE.voNhat_mrs_tu_meal = ARTIFACT_LORE_DATABASE.mrs_tu_meal;
  ARTIFACT_LORE_DATABASE.voNhat_revolutionary_flag = ARTIFACT_LORE_DATABASE.revolutionary_flag;
}
registerVoNhatAcademicLore();

// ─── Self-Healing Geometry Helper ────────────────────────────────────────────
function prepGeo(g) {
  if (!g) return g;
  try {
    g.computeVertexNormals();
    g.computeBoundingBox();
    g.computeBoundingSphere();

    // Khử triệt để NaN / Infinity trong BufferAttribute để chống đen màn hình (NaN pixel poisoning)
    const posAttr = g.attributes?.position;
    if (posAttr) {
      const arr = posAttr.array;
      const len = posAttr.count * posAttr.itemSize;
      for (let i = 0; i < len; i++) {
        if (!Number.isFinite(arr[i])) arr[i] = 0;
      }
      posAttr.needsUpdate = true;
    }
    const normAttr = g.attributes?.normal;
    if (normAttr) {
      const arr = normAttr.array;
      const len = normAttr.count * normAttr.itemSize;
      for (let i = 0; i < len; i++) {
        if (!Number.isFinite(arr[i])) arr[i] = 0;
      }
      normAttr.needsUpdate = true;
    }
  } catch (_) {}
  return g;
}

// ─── Chân tảng đá xanh chạm cánh sen (LatheGeometry) ─────────────────────────
function createLotusStonePedestalGeo() {
  const points = [];
  // Biên dạng cánh sen cách điệu truyền thống Bắc Bộ
  points.push(new THREE.Vector2(0.55, 0.0));
  points.push(new THREE.Vector2(0.55, 0.07));
  points.push(new THREE.Vector2(0.52, 0.11));
  points.push(new THREE.Vector2(0.49, 0.18)); // phình bụng cánh sen dưới
  points.push(new THREE.Vector2(0.44, 0.25)); // eo thắt
  points.push(new THREE.Vector2(0.46, 0.32)); // phình cánh sen trên
  points.push(new THREE.Vector2(0.40, 0.38));
  points.push(new THREE.Vector2(0.35, 0.40)); // gờ đỡ thân cột
  const geo = new THREE.LatheGeometry(points, 28);
  return prepGeo(geo);
}

// ─── 1. Soft Smoke & Morning Dust Texture (Canvas 128x128) ────────────────────
function createSmokeDustTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, 128, 128);

  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 58);
  grad.addColorStop(0.0, 'rgba(255, 240, 220, 0.90)');
  grad.addColorStop(0.35, 'rgba(240, 210, 180, 0.60)');
  grad.addColorStop(0.70, 'rgba(200, 170, 140, 0.20)');
  grad.addColorStop(1.0, 'rgba(200, 170, 140, 0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 58, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

// ─── 1b. Soft Steam Texture for Hot Bran Gruel Pot ────────────────────────────
function createSteamTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, 128, 128);

  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 56);
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.75)');
  grad.addColorStop(0.4, 'rgba(245, 235, 220, 0.40)');
  grad.addColorStop(0.8, 'rgba(220, 205, 190, 0.12)');
  grad.addColorStop(1.0, 'rgba(200, 190, 180, 0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 56, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

// ─── 2. Bát Tràng Terracotta & Ancient Brick Floor Textures (2048x2048) ──────
function createBatTrangFloorTextures() {
  if (typeof document === 'undefined') return { map: null, bumpMap: null, roughnessMap: null };

  // A. Diffuse Canvas (Color Map)
  const diffCanvas = document.createElement('canvas');
  diffCanvas.width = 2048;
  diffCanvas.height = 2048;
  const dCtx = diffCanvas.getContext('2d');

  // B. Bump Canvas
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 2048;
  bumpCanvas.height = 2048;
  const bCtx = bumpCanvas.getContext('2d');

  // C. Roughness Canvas
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 2048;
  roughCanvas.height = 2048;
  const rCtx = roughCanvas.getContext('2d');

  if (!dCtx || !bCtx || !rCtx) return { map: null, bumpMap: null, roughnessMap: null };

  // Nền gạch đất nung cổ trầm mặc kết hợp đá xanh tối màu (#2b241e, roughness 0.65)
  dCtx.fillStyle = '#2b241e';
  dCtx.fillRect(0, 0, 2048, 2048);

  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 2048, 2048);

  rCtx.fillStyle = '#a6a6a6'; // ~0.65 roughness
  rCtx.fillRect(0, 0, 2048, 2048);

  // Lưới gạch Bát Tràng cổ vuông 40x40cm
  dCtx.strokeStyle = '#1d1712';
  dCtx.lineWidth = 3.0;
  bCtx.strokeStyle = '#303030';
  bCtx.lineWidth = 3.0;
  rCtx.strokeStyle = '#e0e0e0'; // rãnh vữa nhám hơn
  rCtx.lineWidth = 3.0;

  const tileSize = 64;
  for (let x = 0; x < 2048; x += tileSize) {
    dCtx.beginPath(); dCtx.moveTo(x, 0); dCtx.lineTo(x, 2048); dCtx.stroke();
    bCtx.beginPath(); bCtx.moveTo(x, 0); bCtx.lineTo(x, 2048); bCtx.stroke();
    rCtx.beginPath(); rCtx.moveTo(x, 0); rCtx.lineTo(x, 2048); rCtx.stroke();
  }
  for (let y = 0; y < 2048; y += tileSize) {
    dCtx.beginPath(); dCtx.moveTo(0, y); dCtx.lineTo(2048, y); dCtx.stroke();
    bCtx.beginPath(); bCtx.moveTo(0, y); bCtx.lineTo(2048, y); bCtx.stroke();
    rCtx.beginPath(); rCtx.moveTo(0, y); rCtx.lineTo(2048, y); rCtx.stroke();
  }

  // Hạt sạn đá ong & đất phong hóa tự nhiên
  for (let i = 0; i < 5000; i++) {
    const rx = Math.random() * 2048;
    const ry = Math.random() * 2048;
    const v = Math.random() > 0.5 ? 230 : 25;
    dCtx.fillStyle = `rgba(${v}, ${v * 0.8}, ${v * 0.6}, 0.045)`;
    dCtx.fillRect(rx, ry, 3, 3);

    bCtx.fillStyle = v > 100 ? '#b0b0b0' : '#505050';
    bCtx.fillRect(rx, ry, 2, 2);
  }

  // Đường lát gạch đỏ cổ dẫn từ cổng vào tâm phòng (Trục X = 1024)
  const pathWidth = 260;
  const pathGrad = dCtx.createLinearGradient(1024 - pathWidth / 2, 0, 1024 + pathWidth / 2, 0);
  pathGrad.addColorStop(0, '#3e2c1e');
  pathGrad.addColorStop(0.5, '#5c3a21');
  pathGrad.addColorStop(1, '#3e2c1e');
  dCtx.fillStyle = pathGrad;
  dCtx.fillRect(1024 - pathWidth / 2, 0, pathWidth, 2048);

  bCtx.fillStyle = '#a0a0a0';
  bCtx.fillRect(1024 - pathWidth / 2, 0, pathWidth, 2048);

  rCtx.fillStyle = '#858585'; // đường đi mòn nhẵn hơn một chút
  rCtx.fillRect(1024 - pathWidth / 2, 0, pathWidth, 2048);

  // Viền đường gạch cổ
  dCtx.strokeStyle = '#8d5b32';
  dCtx.lineWidth = 4;
  dCtx.beginPath();
  dCtx.moveTo(1024 - pathWidth / 2, 0); dCtx.lineTo(1024 - pathWidth / 2, 2048);
  dCtx.moveTo(1024 + pathWidth / 2, 0); dCtx.lineTo(1024 + pathWidth / 2, 2048);
  dCtx.stroke();

  // Tâm phòng: Vòng hoa văn đất nung tròn dưới chân bệ
  const cx = 1024;
  const cy = 1024;
  const maxR = 430;
  const centerGrad = dCtx.createRadialGradient(cx, cy, 20, cx, cy, maxR);
  centerGrad.addColorStop(0, '#543622');
  centerGrad.addColorStop(0.7, '#3b2516');
  centerGrad.addColorStop(1, '#27180e');
  dCtx.beginPath();
  dCtx.arc(cx, cy, maxR, 0, Math.PI * 2);
  dCtx.fillStyle = centerGrad;
  dCtx.fill();

  dCtx.strokeStyle = '#c2854b';
  dCtx.lineWidth = 6;
  dCtx.beginPath();
  dCtx.arc(cx, cy, maxR - 4, 0, Math.PI * 2);
  dCtx.stroke();

  // Bán kính hoa văn cánh sen đất nung
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
    dCtx.beginPath();
    dCtx.moveTo(cx, cy);
    dCtx.lineTo(cx + Math.cos(a) * (maxR - 20), cy + Math.sin(a) * (maxR - 20));
    dCtx.strokeStyle = 'rgba(194, 133, 75, 0.25)';
    dCtx.lineWidth = 2;
    dCtx.stroke();
  }

  const map = new THREE.CanvasTexture(diffCanvas);
  map.wrapS = THREE.ClampToEdgeWrapping;
  map.wrapT = THREE.ClampToEdgeWrapping;
  map.colorSpace = THREE.SRGBColorSpace;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.ClampToEdgeWrapping;
  bumpMap.wrapT = THREE.ClampToEdgeWrapping;

  const roughnessMap = new THREE.CanvasTexture(roughCanvas);
  roughnessMap.wrapS = THREE.ClampToEdgeWrapping;
  roughnessMap.wrapT = THREE.ClampToEdgeWrapping;

  return { map, bumpMap, roughnessMap };
}

// ─── 3. Information Plaque Texture (1024x768) ─────────────────────────────────
function createVoNhatPlaqueTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Nền gỗ lim trầm mặc
  ctx.fillStyle = '#241711';
  ctx.fillRect(0, 0, 1024, 768);

  // Viền đồng vàng cổ
  ctx.strokeStyle = '#c2854b';
  ctx.lineWidth = 14;
  ctx.strokeRect(16, 16, 992, 736);

  ctx.strokeStyle = '#8c582d';
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 36, 952, 696);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffb366';
  ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
  ctx.fillText('VỢ NHẶT – KIM LÂN (1945)', 512, 110);
  ctx.fillText('KHÁT VỌNG SỐNG GIỮA NẠN ĐÓI ẤT DẬU', 512, 160);

  ctx.fillStyle = '#ff7043';
  ctx.font = 'italic 23px "Segoe UI", Arial, sans-serif';
  ctx.fillText('Văn Học Hiện Thực Cách Mạng • Bối Cảnh Mùa Xuân Năm Ất Dậu 1945', 512, 220);

  ctx.fillStyle = '#f5ebe0';
  ctx.font = '22px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'left';
  const lines = [
    '• TÌNH HUỐNG TRUYỆN: Cuộc "nhặt vợ" hy hữu sau 4 bát bánh đúc và câu hò đùa đẩy xe bò.',
    '• TƯỢNG ĐÀI NHÂN VẬT: Tràng và người vợ nhặt – Tình yêu thương xua tan bóng tối nạn đói.',
    '• BỮA CƠM NGÀY ĐÓI: Mâm rau chuối, muối trắng và nồi chè khoán (cháo cám) đẫm nước mắt mẹ Tứ.',
    '• ÁNH SÁNG CÁCH MẠNG: Đoàn người đói kéo đi phá kho thóc Nhật, dẫn đầu là Lá Cờ Đỏ Sao Vàng.',
    '• THÔNG ĐIỆP BẤT HỦ: "Trong sự túng đói quay quắt, người ta vẫn khao khát hạnh phúc và tương lai."'
  ];
  lines.forEach((line, idx) => {
    ctx.fillText(line, 60, 310 + idx * 65);
  });

  ctx.fillStyle = '#ffaa00';
  ctx.font = 'italic bold 22px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('▶ Nhấp chuột vào Hiện vật hoặc Mô hình để mở Thuyết minh chi tiết', 512, 690);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ─── Setup & Standardize vonhat.glb Model ────────────────────────────────────
export function setupVoNhatGlb(model, pedestalTopY = 0.70, targetHeight = 3.2) {
  if (!model) return null;

  // Giữ nguyên góc xoay quaternion gốc [0.7071068, 0, 0, 0.7071068] nếu có node_0
  const node0 = model.getObjectByName('node_0');
  if (node0) {
    node0.quaternion.set(0.7071068, 0, 0, 0.7071068);
  }

  // Xoay 180 độ để mặt chính phù điêu / tượng hướng ra cửa đón khách tham quan (+Z)
  model.rotation.y = Math.PI;

  model.updateMatrixWorld(true);
  const bbox0 = new THREE.Box3().setFromObject(model);
  const size0 = new THREE.Vector3();
  bbox0.getSize(size0);

  // Tự động scale chiều cao lý tưởng 3.0m - 3.4m (chuẩn 3.2m)
  const currentHeight = size0.y;
  if (currentHeight > 0.001) {
    const scaleFactor = targetHeight / currentHeight;
    model.scale.multiplyScalar(scaleFactor);
  }
  model.updateMatrixWorld(true);

  // Auto-grounding 100%: ép đáy box.min.y chạm khít mặt trên của bệ (pedestalTopY = 0.70m)
  const bbox1 = new THREE.Box3().setFromObject(model);
  if (Number.isFinite(bbox1.min.y)) {
    model.position.y += pedestalTopY - bbox1.min.y;
  }
  model.updateMatrixWorld(true);

  // Căn giữa tâm X/Z
  const centerAfter = new THREE.Vector3();
  const bbox2 = new THREE.Box3().setFromObject(model);
  bbox2.getCenter(centerAfter);
  if (Number.isFinite(centerAfter.x)) model.position.x -= centerAfter.x;
  if (Number.isFinite(centerAfter.z)) model.position.z -= centerAfter.z;
  model.updateMatrixWorld(true);

  // PBR Calibration & Geometry Normalization (Normals, SRGBColorSpace, DoubleSide)
  model.traverse((child) => {
    if (child.isMesh) {
      if (child.geometry) {
        prepGeo(child.geometry);
      }
      child.castShadow = true;
      child.receiveShadow = true;
      child.userData.ignoreRaycaster = true; // Optimization 60+ FPS: proxy hitbox handles clicks

      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          if (mat) {
            mat.side = THREE.DoubleSide;
            mat.metalness = 0.25;
            mat.roughness = 0.65;
            mat.envMapIntensity = 1.25;
            if (mat.map) {
              mat.map.colorSpace = THREE.SRGBColorSpace;
              mat.map.needsUpdate = true;
            }
            mat.needsUpdate = true;
          }
        });
      }
    }
  });

  return model;
}

// ─── Dynamic Adaptive Room Bounds Algorithm ──────────────────────────────────
export function calculateAdaptiveRoomBounds(clusters = [], options = {}) {
  const minCorridor = options.minCorridor ?? 3.5;
  const minWidth = options.minWidth ?? 20.0;
  const minLength = options.minLength ?? 24.0;
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
  const height = Math.max(minHeight, Math.ceil(spanY + 1.0));

  return { width, length, height, totalBox };
}

// ─── 4. Detailed Heritage Artifact Helpers ─────────────────────────────────────
function createRiceSproutClump(isGold = false) {
  const group = new THREE.Group();
  group.name = isGold ? 'VN_Rice_Panicle_Gold' : 'VN_Rice_Sprout_Green';

  const leafMat = new THREE.MeshStandardMaterial({
    color: isGold ? 0xfbc02d : 0x7cb342,
    roughness: 0.45,
    metalness: 0.12
  });

  // Cụm bẹ lá lúa non xòe ra các góc
  const leafGeo = prepGeo(new THREE.ConeGeometry(0.04, 0.42, 6));
  for (let i = 0; i < 4; i++) {
    const leaf = new THREE.Mesh(leafGeo, leafMat);
    const angle = (i * Math.PI) / 2 + 0.2;
    leaf.position.set(Math.cos(angle) * 0.04, 0.21, Math.sin(angle) * 0.04);
    leaf.rotation.x = Math.sin(angle) * 0.22;
    leaf.rotation.z = -Math.cos(angle) * 0.22;
    group.add(leaf);
  }

  if (isGold) {
    const grainMat = new THREE.MeshStandardMaterial({
      color: 0xffb300,
      roughness: 0.35,
      metalness: 0.18
    });
    // Nhánh lúa vàng trĩu hạt uốn cong
    const stemGeo = prepGeo(new THREE.CylinderGeometry(0.012, 0.018, 0.48, 6));
    const stem = new THREE.Mesh(stemGeo, leafMat);
    stem.position.set(0, 0.24, 0);
    stem.rotation.z = -0.32;
    group.add(stem);

    const earGeo = prepGeo(new THREE.SphereGeometry(0.03, 6, 6));
    for (let g = 0; g < 4; g++) {
      const grain = new THREE.Mesh(earGeo, grainMat);
      grain.scale.set(1.0, 1.6, 1.0);
      grain.position.set(0.10 + g * 0.035, 0.38 - g * 0.03, (g % 2 === 0 ? 0.02 : -0.02));
      group.add(grain);
    }
  }

  return group;
}

function createCartWheelGroup(woodMat, ironMat) {
  const wheel = new THREE.Group();
  wheel.name = 'VN_Cart_Spoke_Wheel';

  // 1. Vành bánh xe gỗ tròn (rim)
  const rimGeo = prepGeo(new THREE.TorusGeometry(0.55, 0.042, 8, 24));
  const rimMesh = new THREE.Mesh(rimGeo, woodMat);
  wheel.add(rimMesh);

  // 2. Trục moay-ơ mai bánh xe trung tâm (hub)
  const hubGeo = prepGeo(new THREE.CylinderGeometry(0.12, 0.12, 0.14, 14));
  const hubMesh = new THREE.Mesh(hubGeo, woodMat);
  hubMesh.rotation.x = Math.PI / 2;
  wheel.add(hubMesh);

  // 3. 12 Nan hoa gỗ chia đều 360 độ (spokes)
  const spokeGeo = prepGeo(new THREE.CylinderGeometry(0.02, 0.02, 0.46, 6));
  for (let s = 0; s < 12; s++) {
    const angle = (s * Math.PI) / 6;
    const spoke = new THREE.Mesh(spokeGeo, woodMat);
    spoke.position.set(Math.cos(angle) * 0.27, Math.sin(angle) * 0.27, 0);
    spoke.rotation.z = angle - Math.PI / 2;
    wheel.add(spoke);
  }

  // 4. Vòng niềng sắt bảo vệ ngoài vành bánh xe
  const ironTireGeo = prepGeo(new THREE.TorusGeometry(0.575, 0.012, 6, 24));
  const ironTire = new THREE.Mesh(ironTireGeo, ironMat);
  wheel.add(ironTire);

  return wheel;
}

// ─── Build Museum Room ────────────────────────────────────────────────────────
export async function buildVoNhatRoom(roomGroup, options = {}) {
  disposeVoNhatRoom(roomGroup);
  _roomGroup = roomGroup;
  const floorY = options.floorY ?? 0;

  // 1. TÍNH TOÁN DYNAMIC ADAPTIVE ROOM BOUNDS (Đo tổng Box3 + Thông thủy >= 3.5m)
  const clusterBoxes = [
    { name: 'center', box: new THREE.Box3(new THREE.Vector3(-4.5, 0, -6.5), new THREE.Vector3(4.5, 4.2, 1.5)) },
    { name: 'cottage', box: new THREE.Box3(new THREE.Vector3(-9.5, 0, 1.5), new THREE.Vector3(-5.5, 3.8, 6.0)) },
    { name: 'cart', box: new THREE.Box3(new THREE.Vector3(5.5, 0, 1.5), new THREE.Vector3(9.5, 2.5, 6.0)) },
    { name: 'portal', box: new THREE.Box3(new THREE.Vector3(5.0, 0, -10.0), new THREE.Vector3(8.5, 2.8, -7.0)) },
    { name: 'gate', box: new THREE.Box3(new THREE.Vector3(-3.5, 0, 10.0), new THREE.Vector3(3.5, 5.5, 12.0)) },
    { name: 'plaque', box: new THREE.Box3(new THREE.Vector3(3.0, 0, 8.5), new THREE.Vector3(6.5, 2.5, 10.5)) }
  ];
  const adaptiveBounds = calculateAdaptiveRoomBounds(clusterBoxes, {
    minCorridor: 3.5,
    minWidth: 20.0,
    minLength: 24.0,
    minHeight: 8.5
  });

  const roomW = adaptiveBounds.width;
  const roomL = adaptiveBounds.length;
  const roomH = adaptiveBounds.height;
  const halfW = roomW / 2;
  const halfL = roomL / 2;

  // ROOT INTERIOR GROUP — Xoay đón du khách từ hành lang sảnh chính
  const interior = new THREE.Group();
  interior.name = 'VN_Aligned_Interior';
  if (options.roomCenter) {
    const rc = options.roomCenter;
    if (Math.abs(rc.x) >= Math.abs(rc.z)) {
      interior.rotation.y = rc.x < 0 ? Math.PI / 2 : -Math.PI / 2;
    } else {
      interior.rotation.y = rc.z < 0 ? 0 : Math.PI;
    }
  } else {
    interior.rotation.y = -Math.PI / 2;
  }
  roomGroup.add(interior);
  _disposables.push(interior);

  // ══════════════════════════════════════════════════════════════════════════
  // A. GIAN ĐIỆN VỢ NHẶT — SÀN ĐẤT NUNG & VÁCH GỖ LIM TRẦM MẶC
  // ══════════════════════════════════════════════════════════════════════════
  const limWoodMat = new THREE.MeshStandardMaterial({
    color: 0x24140e,
    roughness: 0.72,
    metalness: 0.08
  });

  // 1. Sàn Gạch Bát Tràng cổ & Đá Xanh tối màu (map, bumpMap, roughnessMap)
  const floorGeo = prepGeo(new THREE.PlaneGeometry(roomW, roomL));
  const { map: fMap, bumpMap: fBump, roughnessMap: fRough } = createBatTrangFloorTextures();
  const floorMat = new THREE.MeshStandardMaterial({
    map: fMap,
    bumpMap: fBump,
    bumpScale: 0.05,
    roughnessMap: fRough,
    color: 0xffffff,
    roughness: 0.65,
    metalness: 0.12
  });
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.name = 'VN_BatTrang_Grand_Floor';
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.set(0, floorY + 0.005, 0);
  floorMesh.receiveShadow = true;
  floorMesh.userData.isWalkableFloor = true;
  floorMesh.userData.isTeleportFloor = true;
  interior.add(floorMesh);
  _disposables.push(floorMesh);

  // 2. Trần Gỗ Mộc Mái Rạ (Khép kín không gian 100%, DoubleSide)
  const ceilingGeo = prepGeo(new THREE.PlaneGeometry(roomW, roomL));
  const ceilingMat = new THREE.MeshStandardMaterial({
    color: 0x1c0f06,
    roughness: 0.90,
    metalness: 0.04,
    side: THREE.DoubleSide
  });
  const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
  ceilingMesh.name = 'VN_Rustic_Ceiling';
  ceilingMesh.rotation.x = Math.PI / 2;
  ceilingMesh.position.set(0, floorY + roomH, 0);
  ceilingMesh.userData.ignoreRaycaster = true;
  interior.add(ceilingMesh);
  _disposables.push(ceilingMesh);

  // 3. Hệ Tường Bao Khép Kín (Tự động thích ứng roomW x roomL x roomH)
  const northWallGeo = prepGeo(new THREE.BoxGeometry(roomW, roomH, 0.4));
  const northWall = new THREE.Mesh(northWallGeo, limWoodMat);
  northWall.name = 'VN_Enclosure_NorthWall';
  northWall.position.set(0, floorY + roomH / 2, -halfL);
  northWall.userData.ignoreRaycaster = true;
  interior.add(northWall);
  _disposables.push(northWall);

  const westWallGeo = prepGeo(new THREE.BoxGeometry(0.4, roomH, roomL));
  const westWall = new THREE.Mesh(westWallGeo, limWoodMat);
  westWall.name = 'VN_Enclosure_WestWall';
  westWall.position.set(-halfW, floorY + roomH / 2, 0);
  westWall.userData.ignoreRaycaster = true;
  interior.add(westWall);
  _disposables.push(westWall);

  const eastWallGeo = prepGeo(new THREE.BoxGeometry(0.4, roomH, roomL));
  const eastWall = new THREE.Mesh(eastWallGeo, limWoodMat);
  eastWall.name = 'VN_Enclosure_EastWall';
  eastWall.position.set(halfW, floorY + roomH / 2, 0);
  eastWall.userData.ignoreRaycaster = true;
  interior.add(eastWall);
  _disposables.push(eastWall);

  // Cửa chính thông thoáng (Khẩu độ 4.2m)
  const southWingWidth = (roomW - 4.2) / 2;
  const southWallWingGeo = prepGeo(new THREE.BoxGeometry(southWingWidth, roomH, 0.4));
  const southWallLeft = new THREE.Mesh(southWallWingGeo, limWoodMat);
  southWallLeft.position.set(-(southWingWidth / 2 + 2.1), floorY + roomH / 2, halfL);
  southWallLeft.userData.ignoreRaycaster = true;
  interior.add(southWallLeft);
  _disposables.push(southWallLeft);

  const southWallRight = new THREE.Mesh(southWallWingGeo, limWoodMat);
  southWallRight.position.set((southWingWidth / 2 + 2.1), floorY + roomH / 2, halfL);
  southWallRight.userData.ignoreRaycaster = true;
  interior.add(southWallRight);
  _disposables.push(southWallRight);

  // 4. Phù điêu đồng cổ chạm khắc làng quê Bắc Bộ 1945
  const reliefMat = new THREE.MeshStandardMaterial({
    color: 0xb57c48,
    roughness: 0.40,
    metalness: 0.75
  });
  const reliefGeo = prepGeo(new THREE.BoxGeometry(2.4, 3.2, 0.08));
  const reliefPositions = [
    { x: -halfW * 0.55, y: roomH * 0.52, z: -halfL + 0.25, rotY: 0 },
    { x: halfW * 0.55, y: roomH * 0.52, z: -halfL + 0.25, rotY: 0 },
    { x: -halfW + 0.25, y: roomH * 0.52, z: -halfL * 0.36, rotY: Math.PI / 2 },
    { x: -halfW + 0.25, y: roomH * 0.52, z: halfL * 0.36, rotY: Math.PI / 2 },
    { x: halfW - 0.25, y: roomH * 0.52, z: -halfL * 0.36, rotY: -Math.PI / 2 },
    { x: halfW - 0.25, y: roomH * 0.52, z: halfL * 0.36, rotY: -Math.PI / 2 }
  ];
  reliefPositions.forEach((pos, idx) => {
    const relief = new THREE.Mesh(reliefGeo, reliefMat);
    relief.name = `VN_Village_Relief_${idx + 1}`;
    relief.position.set(pos.x, floorY + pos.y, pos.z);
    relief.rotation.y = pos.rotY;
    interior.add(relief);
    _disposables.push(relief);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // B. ĐỒNG BỘ 8 CỘT GỖ LIM TRÒN TRÊN CHÂN TẢNG ĐÁ XANH CHẠM CÁNH SEN (LatheGeometry)
  // ══════════════════════════════════════════════════════════════════════════
  const colWoodMat = new THREE.MeshStandardMaterial({ color: 0x3b1e14, roughness: 0.65, metalness: 0.12 });
  const bronzeRingMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.30, metalness: 0.85 });
  const stoneBaseMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.80, metalness: 0.10 });

  const colShaftGeo = prepGeo(new THREE.CylinderGeometry(0.275, 0.275, roomH - 0.4, 24));
  const colRingGeo = prepGeo(new THREE.CylinderGeometry(0.29, 0.29, 0.08, 24));
  const lotusBaseGeo = createLotusStonePedestalGeo();

  const colX = halfW - 2.2;
  const colCoords = [
    [-colX, -halfL * 0.68], [-colX, -halfL * 0.23], [-colX, halfL * 0.23], [-colX, halfL * 0.68],
    [colX, -halfL * 0.68], [colX, -halfL * 0.23], [colX, halfL * 0.23], [colX, halfL * 0.68]
  ];

  colCoords.forEach(([cx, cz], i) => {
    const colGroup = new THREE.Group();
    colGroup.name = `VN_Lim_Column_${i + 1}`;
    colGroup.position.set(cx, floorY, cz);

    const baseMesh = new THREE.Mesh(lotusBaseGeo, stoneBaseMat);
    baseMesh.position.y = 0;
    colGroup.add(baseMesh);

    const shaftMesh = new THREE.Mesh(colShaftGeo, colWoodMat);
    shaftMesh.position.y = (roomH - 0.4) / 2 + 0.40;
    colGroup.add(shaftMesh);

    const ringBot = new THREE.Mesh(colRingGeo, bronzeRingMat);
    ringBot.position.y = 0.45;
    colGroup.add(ringBot);

    const ringTop = new THREE.Mesh(colRingGeo, bronzeRingMat);
    ringTop.position.y = roomH - 0.3;
    colGroup.add(ringTop);

    interior.add(colGroup);
    _disposables.push(colGroup);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // C. LỐI VÀO: CỔNG TRE XÓM NGỤ CƯ (4.2m) & BẢNG THÔNG TIN VỢ NHẶT
  // ══════════════════════════════════════════════════════════════════════════
  const gateGroup = new THREE.Group();
  gateGroup.name = 'VN_XomNguCu_Portal_Gate';
  gateGroup.userData.clearAperture = 4.2;
  gateGroup.position.set(0, floorY, halfL);
  interior.add(gateGroup);
  _disposables.push(gateGroup);

  const brickMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.85 });
  const pillarGeo = prepGeo(new THREE.BoxGeometry(0.65, 4.2, 0.65));
  const pillarL = new THREE.Mesh(pillarGeo, brickMat);
  pillarL.position.set(-2.4, 2.1, 0);
  gateGroup.add(pillarL);

  const pillarR = new THREE.Mesh(pillarGeo, brickMat);
  pillarR.position.set(2.4, 2.1, 0);
  gateGroup.add(pillarR);

  // Mái tre đan vòm cổng mộc mạc kết hợp cành cây khẳng khiu
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0x7c6e4e, roughness: 0.65 });
  const beamGeo = prepGeo(new THREE.CylinderGeometry(0.12, 0.12, 5.4, 12));
  const beamMesh = new THREE.Mesh(beamGeo, bambooMat);
  beamMesh.rotation.z = Math.PI / 2;
  beamMesh.position.set(0, 4.3, 0);
  gateGroup.add(beamMesh);

  // Cành cây khẳng khiu mùa đông ven cổng
  const branchMat = new THREE.MeshStandardMaterial({ color: 0x2e1d14, roughness: 0.95 });
  for (const bx of [-2.4, 2.4]) {
    const branchGeo = prepGeo(new THREE.CylinderGeometry(0.04, 0.08, 1.8, 8));
    const branch = new THREE.Mesh(branchGeo, branchMat);
    branch.position.set(bx + (bx > 0 ? 0.35 : -0.35), 4.6, 0);
    branch.rotation.z = bx > 0 ? -Math.PI / 4 : Math.PI / 4;
    gateGroup.add(branch);
  }

  // 2. Bảng Thông Tin Gỗ Lim & Đồng Patin Cổ (Cách cổng sang phải, thông thủy an toàn)
  const infoPlaque = new THREE.Group();
  infoPlaque.name = 'VN_Heritage_InfoPlaque';
  infoPlaque.position.set(4.2, floorY, halfL - 2.8);
  infoPlaque.rotation.y = -Math.PI / 7;
  interior.add(infoPlaque);
  _disposables.push(infoPlaque);

  const standGeo = prepGeo(new THREE.CylinderGeometry(0.08, 0.12, 1.2, 12));
  const standMat = new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.7 });
  for (const sx of [-0.65, 0.65]) {
    const s = new THREE.Mesh(standGeo, standMat);
    s.position.set(sx, 0.6, 0);
    infoPlaque.add(s);
  }

  const plaqueTex = createVoNhatPlaqueTexture();
  const boardGeo = prepGeo(new THREE.PlaneGeometry(2.4, 1.6));
  const boardMat = new THREE.MeshStandardMaterial({
    map: plaqueTex,
    color: 0xffffff,
    roughness: 0.45,
    metalness: 0.35
  });
  const boardMesh = new THREE.Mesh(boardGeo, boardMat);
  boardMesh.position.set(0, 1.5, 0.05);
  infoPlaque.add(boardMesh);

  const boardBackGeo = prepGeo(new THREE.BoxGeometry(2.45, 1.65, 0.08));
  const boardBack = new THREE.Mesh(boardBackGeo, limWoodMat);
  boardBack.position.set(0, 1.5, 0);
  infoPlaque.add(boardBack);

  // ══════════════════════════════════════════════════════════════════════════
  // D. TRUNG TÂM: TƯỢNG ĐÀI "VỢ NHẶT" (vonhat.glb) & BỆ ĐÁ ONG - ĐẤT NUNG 2 TẦNG
  // ══════════════════════════════════════════════════════════════════════════
  const centralDais = new THREE.Group();
  centralDais.name = 'VN_Central_Dais_Earth';
  centralDais.position.set(0, floorY, -2.5);
  interior.add(centralDais);
  _disposables.push(centralDais);

  // 1. Bệ đá ong và đất nung 2 tầng (Tổng cao 0.70m, in hằn 2 vệt bánh xe bò lún sâu)
  const lateriteMat = new THREE.MeshStandardMaterial({
    color: 0x523022, // Sắc nâu đỏ đá ong trầm tích trung du Bắc Bộ
    roughness: 0.88,
    metalness: 0.08
  });
  const terracottaMat = new THREE.MeshStandardMaterial({
    color: 0x46271a, // Đất nung Bát Tràng cổ
    roughness: 0.82,
    metalness: 0.12
  });

  // Tầng 1: Đá ong cổ vững chãi (4.6m x 0.35m x 4.6m)
  const p1Geo = prepGeo(new THREE.BoxGeometry(4.6, 0.35, 4.6));
  const p1Mesh = new THREE.Mesh(p1Geo, lateriteMat);
  p1Mesh.position.y = 0.175;
  p1Mesh.receiveShadow = true;
  centralDais.add(p1Mesh);

  // Tầng 2: Thềm đất nung cổ (3.8m x 0.35m x 3.8m, mặt trên chạm khít Y = 0.70m)
  const p2Geo = prepGeo(new THREE.BoxGeometry(3.8, 0.35, 3.8));
  const p2Mesh = new THREE.Mesh(p2Geo, terracottaMat);
  p2Mesh.position.y = 0.525;
  p2Mesh.receiveShadow = true;
  centralDais.add(p2Mesh);

  // Gờ đá ong bo viền mép bệ tầng 2
  const borderMat = new THREE.MeshStandardMaterial({ color: 0x361d13, roughness: 0.75 });
  const b1Geo = prepGeo(new THREE.BoxGeometry(3.86, 0.04, 0.06));
  for (const bz of [-1.9, 1.9]) {
    const borderZ = new THREE.Mesh(b1Geo, borderMat);
    borderZ.position.set(0, 0.69, bz);
    centralDais.add(borderZ);
  }
  const b2Geo = prepGeo(new THREE.BoxGeometry(0.06, 0.04, 3.86));
  for (const bx of [-1.9, 1.9]) {
    const borderX = new THREE.Mesh(b2Geo, borderMat);
    borderX.position.set(bx, 0.69, 0);
    centralDais.add(borderX);
  }

  // 2 Vệt bánh xe bò lún sâu vào mặt bệ đá đất nung (Grooved Rut Depth)
  const rutClayMat = new THREE.MeshStandardMaterial({ color: 0x22140d, roughness: 0.96 });
  const mudEdgeMat = new THREE.MeshStandardMaterial({ color: 0x3a2216, roughness: 0.90 });
  for (const wx of [-0.85, 0.85]) {
    // Rãnh bùn lún sâu in hằn
    const trackGeo = prepGeo(new THREE.BoxGeometry(0.18, 0.035, 3.6));
    const trackMesh = new THREE.Mesh(trackGeo, rutClayMat);
    trackMesh.position.set(wx, 0.702, 0);
    centralDais.add(trackMesh);

    // Gờ mép bùn nén nứt nẻ hai bên vệt bánh xe
    for (const side of [-0.11, 0.11]) {
      const edgeGeo = prepGeo(new THREE.BoxGeometry(0.04, 0.02, 3.6));
      const edgeMesh = new THREE.Mesh(edgeGeo, mudEdgeMat);
      edgeMesh.position.set(wx + side, 0.708, 0);
      centralDais.add(edgeMesh);
    }
  }

  // Khóm lúa xanh & vàng nảy mầm từ kẽ nứt đất khô cằn (Biểu tượng khát vọng sống)
  const sproutCoords = [
    // Tầng 2 (Y = 0.70m)
    [-1.5, -1.5, false], [1.5, -1.5, true],
    [-1.5, 1.5, true], [1.5, 1.5, false],
    // Tầng 1 (Y = 0.35m - các góc thềm đá ong)
    [-2.0, -1.8, false], [2.0, -1.8, true],
    [-2.0, 1.8, true], [2.0, 1.8, false]
  ];
  sproutCoords.forEach(([lx, lz, isGold]) => {
    const sprout = createRiceSproutClump(isGold);
    const baseY = (Math.abs(lx) > 1.8 || Math.abs(lz) > 1.8) ? 0.35 : 0.70;
    sprout.position.set(lx, baseY, lz);
    sprout.rotation.y = (Math.random() - 0.5) * Math.PI;
    centralDais.add(sprout);
  });

  // 2. Mô hình trung tâm vonhat.glb (Scale chuẩn 3.2m, ground Y = 0.70m)
  const statueHolder = new THREE.Group();
  statueHolder.name = 'VN_Glb_Statue_Holder';
  centralDais.add(statueHolder);

  // Fallback trang trọng trong khi tải GLB
  const fbGroup = new THREE.Group();
  fbGroup.name = 'VN_Fallback_Statue';
  const fbBaseGeo = prepGeo(new THREE.CylinderGeometry(0.5, 0.65, 0.3, 16));
  const fbBaseMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.6 });
  const fbBase = new THREE.Mesh(fbBaseGeo, fbBaseMat);
  fbBase.position.y = 0.7 + 0.15;
  fbGroup.add(fbBase);

  const fbBodyGeo = prepGeo(new THREE.CylinderGeometry(0.35, 0.45, 2.2, 16));
  const fbBody = new THREE.Mesh(fbBodyGeo, fbBaseMat);
  fbBody.position.y = 0.7 + 1.25;
  fbGroup.add(fbBody);
  statueHolder.add(fbGroup);

  if (typeof window !== 'undefined') {
    const candidateUrls = options.glbUrl
      ? [options.glbUrl, '/model/vonhat.glb', '/models/vonhat.glb']
      : ['/model/vonhat.glb', '/models/vonhat.glb'];
    loadGlbCached(candidateUrls, {
      maxTextureSize: 1024,
      returnGltf: true
    }).then((res) => {
      const model = res?.scene || res?.gltf?.scene || res;
      if (model && model.isObject3D) {
        setupVoNhatGlb(model, 0.70, 3.2);
        statueHolder.clear();
        statueHolder.add(model);
        _disposables.push(model);
      }
    }).catch((e) => {
      console.warn('[VoNhat] loadGlbCached statue notice:', e.message);
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // E. CÁNH TRÁI: NGÔI NHÀ TRANH BÀ CỤ TỨ & BỮA CƠM NGÀY ĐÓI (ÁNH ĐÈN DẦU ẤM ÁP)
  // ══════════════════════════════════════════════════════════════════════════
  const cottageArea = new THREE.Group();
  cottageArea.name = 'VN_Thatched_Cottage_Area';
  cottageArea.position.set(-7.5, floorY, 3.5);
  interior.add(cottageArea);
  _disposables.push(cottageArea);

  // Ngôi nhà tranh vách đất 3 gian quét tước gọn gàng (Gian giữa, gian tả, gian hữu)
  const thatchMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.92 });
  const thatchTrimMat = new THREE.MeshStandardMaterial({ color: 0x6d5040, roughness: 0.95 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x5c3d2e, roughness: 0.88 });
  const bambooFrameMat = new THREE.MeshStandardMaterial({ color: 0x7c6e4e, roughness: 0.65 });

  // Mái rạ che nghiêng 3 gian dày dặn
  const roofGeo = prepGeo(new THREE.BoxGeometry(5.2, 0.14, 3.8));
  const roofMesh = new THREE.Mesh(roofGeo, thatchMat);
  roofMesh.rotation.x = 0.18;
  roofMesh.position.set(0, 3.2, -0.2);
  cottageArea.add(roofMesh);

  // Viền rơm rạ rủ ở mép hiên
  const roofEavesGeo = prepGeo(new THREE.BoxGeometry(5.25, 0.08, 0.25));
  const roofEaves = new THREE.Mesh(roofEavesGeo, thatchTrimMat);
  roofEaves.position.set(0, 2.85, 1.55);
  cottageArea.add(roofEaves);

  // Vách đất trát rơm nứa sau 3 gian và bên hồi
  const backWallGeo = prepGeo(new THREE.BoxGeometry(4.8, 2.6, 0.15));
  const backWall = new THREE.Mesh(backWallGeo, wallMat);
  backWall.position.set(0, 1.3, -1.8);
  cottageArea.add(backWall);

  const sideWallGeo = prepGeo(new THREE.BoxGeometry(0.15, 2.6, 3.4));
  const sideWall = new THREE.Mesh(sideWallGeo, wallMat);
  sideWall.position.set(-2.4, 1.3, 0);
  cottageArea.add(sideWall);

  // Hệ 6 cột tre chia 3 gian truyền thống (2 cột cái giữa, 4 cột quân hai chái)
  const cottageColGeo = prepGeo(new THREE.CylinderGeometry(0.065, 0.075, 2.6, 10));
  const colPositions = [
    [-2.2, -1.6], [0, -1.6], [2.2, -1.6], // Hàng cột sau
    [-2.2, 1.4], [0, 1.4], [2.2, 1.4]     // Hàng cột hiên trước
  ];
  colPositions.forEach(([cx, cz]) => {
    const col = new THREE.Mesh(cottageColGeo, bambooFrameMat);
    col.position.set(cx, 1.3, cz);
    cottageArea.add(col);
  });

  // Xà tre ngang đỡ vì kèo 3 gian
  const cottageBeamGeo = prepGeo(new THREE.CylinderGeometry(0.05, 0.05, 4.8, 8));
  for (const bz of [-1.6, 1.4]) {
    const beam = new THREE.Mesh(cottageBeamGeo, bambooFrameMat);
    beam.rotation.z = Math.PI / 2;
    beam.position.set(0, 2.6, bz);
    cottageArea.add(beam);
  }

  // Hàng rào giậu nứa đơn sơ bên hiên nhà
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x8c7355, roughness: 0.75 });
  for (let f = 0; f < 5; f++) {
    const fenceStakeGeo = prepGeo(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 6));
    const stake = new THREE.Mesh(fenceStakeGeo, fenceMat);
    stake.position.set(-2.4 + f * 0.45, 0.5, 2.0);
    cottageArea.add(stake);
  }

  // Ang nước mưa sành gốm cổ đặt ngoài sân hiên
  const jarMat = new THREE.MeshStandardMaterial({ color: 0x4a3328, roughness: 0.70 });
  const jarGeo = prepGeo(new THREE.CylinderGeometry(0.38, 0.26, 0.75, 16));
  const jarMesh = new THREE.Mesh(jarGeo, jarMat);
  jarMesh.position.set(2.4, 0.375, 1.4);
  cottageArea.add(jarMesh);

  // Vành miệng chum sành
  const rimGeo = prepGeo(new THREE.TorusGeometry(0.38, 0.03, 8, 20));
  const rimMesh = new THREE.Mesh(rimGeo, jarMat);
  rimMesh.rotation.x = Math.PI / 2;
  rimMesh.position.set(2.4, 0.75, 1.4);
  cottageArea.add(rimMesh);

  const waterSurfaceMat = new THREE.MeshStandardMaterial({
    color: 0x2f4040,
    roughness: 0.08,
    metalness: 0.85
  });
  const waterGeo = prepGeo(new THREE.CircleGeometry(0.36, 16));
  const waterMesh = new THREE.Mesh(waterGeo, waterSurfaceMat);
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.set(2.4, 0.72, 1.4);
  waterMesh.userData.ignoreRaycaster = true;
  cottageArea.add(waterMesh);

  // Gáo dừa cán tre gác hờ hững trên miệng ang nước mưa
  const coconutShellMat = new THREE.MeshStandardMaterial({ color: 0x3e2316, roughness: 0.80 });
  const shellGeo = prepGeo(new THREE.SphereGeometry(0.075, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2));
  const shellMesh = new THREE.Mesh(shellGeo, coconutShellMat);
  shellMesh.rotation.x = Math.PI;
  shellMesh.position.set(2.45, 0.76, 1.35);
  cottageArea.add(shellMesh);

  const handleGeo = prepGeo(new THREE.CylinderGeometry(0.012, 0.012, 0.45, 6));
  const handleMesh = new THREE.Mesh(handleGeo, bambooFrameMat);
  handleMesh.rotation.z = Math.PI / 3;
  handleMesh.position.set(2.35, 0.78, 1.45);
  cottageArea.add(handleMesh);

  // Chõng tre tân hôn (1.9m x 1.1m x 0.55m) đặt trang trọng giữa nhà
  const bedFrameGeo = prepGeo(new THREE.BoxGeometry(1.9, 0.08, 1.1));
  const bedMesh = new THREE.Mesh(bedFrameGeo, bambooFrameMat);
  bedMesh.position.set(0, 0.55, 0);
  cottageArea.add(bedMesh);

  // Nan dát tre đan nong mốt mặt chõng
  const slatMat = new THREE.MeshStandardMaterial({ color: 0x9e7e52, roughness: 0.60 });
  const matGeo = prepGeo(new THREE.BoxGeometry(1.82, 0.01, 1.02));
  const matMesh = new THREE.Mesh(matGeo, slatMat);
  matMesh.position.set(0, 0.595, 0);
  cottageArea.add(matMesh);

  // 4 Chân tre tròn và thanh giằng chữ H
  for (const lx of [-0.85, 0.85]) {
    for (const lz of [-0.45, 0.45]) {
      const legGeo = prepGeo(new THREE.CylinderGeometry(0.05, 0.05, 0.55, 8));
      const legMesh = new THREE.Mesh(legGeo, bambooFrameMat);
      legMesh.position.set(lx, 0.275, lz);
      cottageArea.add(legMesh);
    }
    // Thanh giằng ngang liên kết chân
    const braceGeo = prepGeo(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 6));
    const braceMesh = new THREE.Mesh(braceGeo, bambooFrameMat);
    braceMesh.rotation.x = Math.PI / 2;
    braceMesh.position.set(lx, 0.18, 0);
    cottageArea.add(braceMesh);
  }

  // MÂM CƠM NGÀY ĐÓI TINH XẢO
  const mealGroup = new THREE.Group();
  mealGroup.name = 'VN_Artifact_Wedding_Meal';
  mealGroup.position.set(0, 0.60, 0);
  cottageArea.add(mealGroup);

  // 1. Cái mẹt tre rách cạp mây
  const metGeo = prepGeo(new THREE.CylinderGeometry(0.42, 0.38, 0.03, 18));
  const metMesh = new THREE.Mesh(metGeo, bambooFrameMat);
  mealGroup.add(metMesh);

  const rimMetGeo = prepGeo(new THREE.TorusGeometry(0.42, 0.022, 6, 20));
  const rimMet = new THREE.Mesh(rimMetGeo, slatMat);
  rimMet.rotation.x = Math.PI / 2;
  rimMet.position.y = 0.015;
  mealGroup.add(rimMet);

  // 2. Rổ rau chuối thái rối xoăn sợi
  const basketMat = new THREE.MeshStandardMaterial({ color: 0x6d4c41, roughness: 0.80 });
  const basketGeo = prepGeo(new THREE.CylinderGeometry(0.18, 0.12, 0.08, 12));
  const basketMesh = new THREE.Mesh(basketGeo, basketMat);
  basketMesh.position.set(-0.18, 0.05, -0.15);
  mealGroup.add(basketMesh);

  const saladMat = new THREE.MeshStandardMaterial({ color: 0x7c8535, roughness: 0.65 });
  const saladGeo = prepGeo(new THREE.SphereGeometry(0.14, 8, 8));
  const saladMesh = new THREE.Mesh(saladGeo, saladMat);
  saladMesh.scale.set(1.0, 0.45, 1.0);
  saladMesh.position.set(-0.18, 0.09, -0.15);
  mealGroup.add(saladMesh);

  // Sợi hoa chuối non điểm xuyết
  const petalMat = new THREE.MeshStandardMaterial({ color: 0x6d3c4d, roughness: 0.6 });
  for (let p = 0; p < 4; p++) {
    const petalGeo = prepGeo(new THREE.ConeGeometry(0.02, 0.06, 6));
    const petal = new THREE.Mesh(petalGeo, petalMat);
    petal.position.set(-0.18 + (p - 1.5) * 0.04, 0.12, -0.15 + (p % 2 === 0 ? 0.03 : -0.03));
    petal.rotation.z = (Math.random() - 0.5) * 0.5;
    mealGroup.add(petal);
  }

  // 3. Đĩa muối trắng hạt to sứt mép
  const plateMat = new THREE.MeshStandardMaterial({ color: 0xd7ccc8, roughness: 0.55 });
  const plateGeo = prepGeo(new THREE.CylinderGeometry(0.09, 0.06, 0.02, 12));
  const plateMesh = new THREE.Mesh(plateGeo, plateMat);
  plateMesh.position.set(0.18, 0.03, -0.15);
  mealGroup.add(plateMesh);

  const saltMat = new THREE.MeshStandardMaterial({ color: 0xfcfcfc, roughness: 0.25 });
  const saltGeo = prepGeo(new THREE.ConeGeometry(0.065, 0.045, 8));
  const saltMesh = new THREE.Mesh(saltGeo, saltMat);
  saltMesh.position.set(0.18, 0.05, -0.15);
  mealGroup.add(saltMesh);

  // 4. Bát cháo lõng bõng nước cháo hoa loãng
  const bowlCeramicMat = new THREE.MeshStandardMaterial({ color: 0x4a3227, roughness: 0.70 });
  const porridgeMat = new THREE.MeshStandardMaterial({ color: 0xe8e0d0, roughness: 0.30 });
  for (const bx of [-0.2, 0, 0.2]) {
    const porridgeBowlGeo = prepGeo(new THREE.CylinderGeometry(0.08, 0.045, 0.06, 12));
    const pBowl = new THREE.Mesh(porridgeBowlGeo, bowlCeramicMat);
    pBowl.position.set(bx, 0.04, 0.18);
    mealGroup.add(pBowl);

    const soupGeo = prepGeo(new THREE.CircleGeometry(0.065, 12));
    const soup = new THREE.Mesh(soupGeo, porridgeMat);
    soup.rotation.x = -Math.PI / 2;
    soup.position.set(bx, 0.065, 0.18);
    mealGroup.add(soup);
  }

  // 5. NỒI CHÈ KHOÁN (CHÁO CÁM) ĐẬY VUNG LÁ CHUỐI
  const potMat = new THREE.MeshStandardMaterial({ color: 0x221610, roughness: 0.88 });
  const potGeo = prepGeo(new THREE.CylinderGeometry(0.20, 0.15, 0.24, 16));
  const potMesh = new THREE.Mesh(potGeo, potMat);
  potMesh.name = 'VN_CheKhoan_Pot';
  potMesh.position.set(0, 0.13, 0);
  mealGroup.add(potMesh);

  // Hai quai tai nồi đất nhỏ
  for (const hx of [-0.20, 0.20]) {
    const handleGeo = prepGeo(new THREE.TorusGeometry(0.035, 0.012, 6, 10));
    const handle = new THREE.Mesh(handleGeo, potMat);
    handle.rotation.y = Math.PI / 2;
    handle.position.set(hx, 0.20, 0);
    mealGroup.add(handle);
  }

  // Vung lá chuối bánh tẻ xanh ngọc đậy kín nồi có gân sống lá
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.45 });
  const leafGeo = prepGeo(new THREE.ConeGeometry(0.22, 0.04, 16));
  const leafMesh = new THREE.Mesh(leafGeo, leafMat);
  leafMesh.position.set(0, 0.26, 0);
  mealGroup.add(leafMesh);

  const leafStemGeo = prepGeo(new THREE.CylinderGeometry(0.01, 0.015, 0.12, 6));
  const leafStem = new THREE.Mesh(leafStemGeo, leafMat);
  leafStem.rotation.z = Math.PI / 4;
  leafStem.position.set(0.04, 0.29, 0);
  mealGroup.add(leafStem);

  // Làn khói mềm mại bốc lên từ nồi chè khoán (cháo cám)
  const steamTex = createSteamTexture();
  const steamGeo = prepGeo(new THREE.BufferGeometry());
  const steamCount = 20;
  const steamPos = new Float32Array(steamCount * 3);
  for (let i = 0; i < steamCount; i++) {
    steamPos[i * 3] = (Math.random() - 0.5) * 0.12;
    steamPos[i * 3 + 1] = 0.28 + Math.random() * 0.45;
    steamPos[i * 3 + 2] = (Math.random() - 0.5) * 0.12;
  }
  steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPos, 3));
  const steamMat = new THREE.PointsMaterial({
    map: steamTex,
    color: 0xffffff,
    size: 0.22,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const steamPoints = new THREE.Points(steamGeo, steamMat);
  steamPoints.name = 'VN_CheKhoan_Steam';
  steamPoints.userData.ignoreRaycaster = true;
  mealGroup.add(steamPoints);

  // 6. Ngọn đèn dầu Hoa Kỳ đêm tân hôn
  const lampGroup = new THREE.Group();
  lampGroup.name = 'VN_Oil_Lamp_Artifact';
  lampGroup.position.set(0.60, 0.65, 0);
  cottageArea.add(lampGroup);

  const brassMat = new THREE.MeshStandardMaterial({ color: 0xb58928, metalness: 0.75, roughness: 0.35 });
  const lampBaseGeo = prepGeo(new THREE.CylinderGeometry(0.06, 0.08, 0.12, 12));
  const lampBase = new THREE.Mesh(lampBaseGeo, brassMat);
  lampBase.position.y = 0.06;
  lampGroup.add(lampBase);

  // Bóng thủy tinh đèn dầu Hoa Kỳ
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 0.85,
    opacity: 0.60,
    transparent: true,
    roughness: 0.10
  });
  const glassGeo = prepGeo(new THREE.CylinderGeometry(0.045, 0.045, 0.16, 12));
  const glassChimney = new THREE.Mesh(glassGeo, glassMat);
  glassChimney.position.y = 0.20;
  lampGroup.add(glassChimney);

  // Ngọn lửa đèn dầu phát sáng cam ấm
  const flameMat = new THREE.MeshStandardMaterial({
    color: 0xffa000,
    emissive: new THREE.Color(0xff6f00),
    emissiveIntensity: 4.2
  });
  const flameGeo = prepGeo(new THREE.ConeGeometry(0.02, 0.05, 8));
  const flameMesh = new THREE.Mesh(flameGeo, flameMat);
  flameMesh.name = 'VN_Lamp_Flame';
  flameMesh.position.y = 0.16;
  lampGroup.add(flameMesh);

  // PointLight cam ấm tỏa sáng từ ngọn đèn dầu
  const oilLampLight = new THREE.PointLight(0xff8822, 3.8, 12.0, 1.4);
  oilLampLight.name = 'VN_Oil_Lamp_Light';
  oilLampLight.position.set(0.60, 0.85, 0);
  oilLampLight.castShadow = true;
  oilLampLight.userData.ignoreRaycaster = true;
  cottageArea.add(oilLampLight);
  _lights.push(oilLampLight);

  // ══════════════════════════════════════════════════════════════════════════
  // F. CÁNH PHẢI: XE THÓC LIÊN ĐOÀN & 4 BÁT BÁNH ĐÚC ĐẦU CHỢ
  // ══════════════════════════════════════════════════════════════════════════
  const cartArea = new THREE.Group();
  cartArea.name = 'VN_Grain_Cart_Area';
  cartArea.position.set(7.5, floorY, 3.5);
  interior.add(cartArea);
  _disposables.push(cartArea);

  // Chiếc xe bò đẩy tay chở thóc của Tràng
  const cartWoodMat = new THREE.MeshStandardMaterial({ color: 0x54382c, roughness: 0.82 });
  const ironTireMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.40, metalness: 0.85 });
  const cartBedGeo = prepGeo(new THREE.BoxGeometry(2.4, 0.12, 1.2));
  const cartBed = new THREE.Mesh(cartBedGeo, cartWoodMat);
  cartBed.position.set(0, 0.55, 0);
  cartArea.add(cartBed);

  // Thành gióng gỗ xe bò giữ bao thóc
  for (const gz of [-0.58, 0.58]) {
    const sideRailGeo = prepGeo(new THREE.BoxGeometry(2.35, 0.18, 0.04));
    const sideRail = new THREE.Mesh(sideRailGeo, cartWoodMat);
    sideRail.position.set(0, 0.70, gz);
    cartArea.add(sideRail);
  }

  // 2 Bánh xe nan hoa gỗ to (đường kính 1.2m, 12 nan hoa hướng tâm)
  for (const wz of [-0.68, 0.68]) {
    const wheelGroup = createCartWheelGroup(cartWoodMat, ironTireMat);
    wheelGroup.position.set(0, 0.55, wz);
    cartArea.add(wheelGroup);
  }

  // Càng kéo xe bò uốn cong hướng về trước
  const shaftGeo = prepGeo(new THREE.CylinderGeometry(0.04, 0.045, 1.9, 8));
  for (const sz of [-0.4, 0.4]) {
    const shaft = new THREE.Mesh(shaftGeo, cartWoodMat);
    shaft.rotation.x = Math.PI / 2;
    shaft.rotation.y = 0.14;
    shaft.position.set(-1.6, 0.35, sz);
    cartArea.add(shaft);
  }
  // Thanh ngáng tay cầm tì ngực đẩy xe
  const handleBarGeo = prepGeo(new THREE.CylinderGeometry(0.035, 0.035, 0.92, 8));
  const handleBar = new THREE.Mesh(handleBarGeo, cartWoodMat);
  handleBar.position.set(-2.5, 0.22, 0);
  cartArea.add(handleBar);

  // 4 Bao thóc trên xe buộc dây thừng
  const bagMat = new THREE.MeshStandardMaterial({ color: 0x937c6d, roughness: 0.85 });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x5a432b, roughness: 0.90 });
  const bagPositions = [
    [-0.6, 0.78, -0.28], [0.2, 0.78, -0.28],
    [-0.5, 0.78, 0.28], [0.3, 0.78, 0.28]
  ];
  bagPositions.forEach(([bx, by, bz], bi) => {
    const bagGroup = new THREE.Group();
    bagGroup.name = `VN_Grain_Bag_${bi + 1}`;
    bagGroup.position.set(bx, by, bz);

    const bagGeo = prepGeo(new THREE.BoxGeometry(0.70, 0.36, 0.52));
    const bag = new THREE.Mesh(bagGeo, bagMat);
    bagGroup.add(bag);

    // Vòng dây thừng buộc ngang bao
    for (const rx of [-0.18, 0.18]) {
      const ropeGeo = prepGeo(new THREE.TorusGeometry(0.24, 0.015, 6, 16));
      const rope = new THREE.Mesh(ropeGeo, ropeMat);
      rope.rotation.y = Math.PI / 2;
      rope.position.set(rx, 0, 0);
      bagGroup.add(rope);
    }

    const knotGeo = prepGeo(new THREE.SphereGeometry(0.035, 6, 6));
    const knot = new THREE.Mesh(knotGeo, ropeMat);
    knot.position.set(0.36, 0.08, 0);
    bagGroup.add(knot);

    cartArea.add(bagGroup);
  });

  // QUÁN NƯỚC ĐẦU CHỢ VỚI 4 BÁT BÁNH ĐÚC SẮN
  const tableGeo = prepGeo(new THREE.BoxGeometry(1.3, 0.06, 1.0));
  const tableMesh = new THREE.Mesh(tableGeo, cartWoodMat);
  tableMesh.position.set(-1.8, 0.45, 0);
  cartArea.add(tableMesh);

  // 4 Chân bàn tre quán nước
  for (const tx of [-2.35, -1.25]) {
    for (const tz of [-0.42, 0.42]) {
      const legGeo = prepGeo(new THREE.CylinderGeometry(0.035, 0.035, 0.45, 6));
      const leg = new THREE.Mesh(legGeo, cartWoodMat);
      leg.position.set(tx, 0.225, tz);
      cartArea.add(leg);
    }
  }

  // Ghế băng tre quán nước
  const benchGeo = prepGeo(new THREE.BoxGeometry(1.2, 0.04, 0.28));
  const bench = new THREE.Mesh(benchGeo, cartWoodMat);
  bench.position.set(-1.8, 0.26, 0.68);
  cartArea.add(bench);

  // Ấm trà sành màu nâu đất cổ
  const teapotMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.65 });
  const teapotGeo = prepGeo(new THREE.CylinderGeometry(0.08, 0.10, 0.14, 12));
  const teapot = new THREE.Mesh(teapotGeo, teapotMat);
  teapot.position.set(-1.8, 0.55, -0.3);
  cartArea.add(teapot);

  // Vòi ấm trà và quai xách ấm
  const spoutGeo = prepGeo(new THREE.CylinderGeometry(0.016, 0.024, 0.08, 8));
  const spout = new THREE.Mesh(spoutGeo, teapotMat);
  spout.rotation.z = Math.PI / 4;
  spout.position.set(-1.72, 0.58, -0.3);
  cartArea.add(spout);

  const teapotHandleGeo = prepGeo(new THREE.TorusGeometry(0.08, 0.01, 6, 12, Math.PI));
  const teapotHandle = new THREE.Mesh(teapotHandleGeo, teapotMat);
  teapotHandle.position.set(-1.8, 0.63, -0.3);
  cartArea.add(teapotHandle);

  // 4 BÁT BÁNH ĐÚC SẮN LÁT MỎNG RẮC VỪNG
  const sesameBlackMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
  const sesameGoldMat = new THREE.MeshStandardMaterial({ color: 0xd4a017, roughness: 0.6 });

  for (const [bx, bz] of [[-1.6, -0.15], [-2.0, -0.15], [-1.6, 0.18], [-2.0, 0.18]]) {
    const bowlGeo = prepGeo(new THREE.CylinderGeometry(0.085, 0.045, 0.06, 12));
    const bowlMesh = new THREE.Mesh(bowlGeo, potMat);
    bowlMesh.position.set(bx, 0.51, bz);
    cartArea.add(bowlMesh);

    // Bánh đúc sắn lát dẻo trắng ngà
    const cakeMat = new THREE.MeshStandardMaterial({ color: 0xeae6dc, roughness: 0.65 });
    const cakeGeo = prepGeo(new THREE.CylinderGeometry(0.07, 0.065, 0.03, 12));
    const cakeMesh = new THREE.Mesh(cakeGeo, cakeMat);
    cakeMesh.position.set(bx, 0.54, bz);
    cartArea.add(cakeMesh);

    // Hạt vừng rắc lấm tấm trên mặt bánh đúc
    for (let s = 0; s < 4; s++) {
      const sMat = s % 2 === 0 ? sesameBlackMat : sesameGoldMat;
      const sGeo = prepGeo(new THREE.SphereGeometry(0.007, 4, 4));
      const sMesh = new THREE.Mesh(sGeo, sMat);
      sMesh.scale.set(1.4, 0.5, 1.0);
      sMesh.position.set(
        bx + (Math.sin(s * 1.5) * 0.035),
        0.558,
        bz + (Math.cos(s * 1.5) * 0.035)
      );
      cartArea.add(sMesh);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // G. HẬU CẢNH: CỔNG & CUỐN SÁCH CỔ DỊCH CHUYỂN CÕI XÓM NGỤ CƯ (enterRealm)
  // ══════════════════════════════════════════════════════════════════════════
  const bookAltar = new THREE.Group();
  bookAltar.name = 'VN_Realm_Portal_Altar';
  bookAltar.position.set(6.8, floorY, -8.0);
  interior.add(bookAltar);
  _disposables.push(bookAltar);

  const altarStoneMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.85 });
  const pedestalGeo = prepGeo(new THREE.CylinderGeometry(0.35, 0.45, 1.0, 16));
  const standMesh = new THREE.Mesh(pedestalGeo, altarStoneMat);
  standMesh.position.set(0, 0.5, 0);
  bookAltar.add(standMesh);

  const bookGeo = prepGeo(new THREE.BoxGeometry(0.55, 0.08, 0.40));
  const bookMat = new THREE.MeshStandardMaterial({
    color: 0xff5722,
    emissive: new THREE.Color(0xff5722),
    emissiveIntensity: 1.4,
    roughness: 0.25
  });
  const bookMesh = new THREE.Mesh(bookGeo, bookMat);
  bookMesh.name = 'Interactive_VoNhat_Teleport_Book';
  bookMesh.position.set(0, 1.06, 0);
  bookMesh.rotation.x = -Math.PI / 6;
  bookMesh.userData.interactive = true;
  bookMesh.userData.targetRealm = 'VO_NHAT_REALM';
  bookMesh.userData.isVoNhatTeleportBook = true;
  bookAltar.add(bookMesh);

  // Luồng sáng đỏ rực rỡ từ lá cờ đê chiếu qua cổng cõi mở (Chiaroscuro)
  const flagBeaconLight = new THREE.PointLight(0xef4444, 5.5, 18.0, 1.4);
  flagBeaconLight.name = 'VN_Flag_Beacon_Light';
  flagBeaconLight.position.set(0, 1.6, 0.2);
  bookAltar.add(flagBeaconLight);
  _lights.push(flagBeaconLight);

  const flagHaloSpot = new THREE.SpotLight(0xff3322, 35.0, 18.0, Math.PI / 3.8, 0.75, 1.2);
  flagHaloSpot.name = 'VN_Flag_Halo_Spot';
  flagHaloSpot.position.set(6.8, floorY + 2.4, -7.5);
  flagHaloSpot.target.position.set(6.8, floorY + 4.5, -halfL);
  interior.add(flagHaloSpot);
  interior.add(flagHaloSpot.target);
  _lights.push(flagHaloSpot, flagHaloSpot.target);

  // ══════════════════════════════════════════════════════════════════════════
  // H. VFX HẠT BỤI NẮNG SỚM & LÀN KHÓI BẾP MỀM MẠI (150 hạt CanvasTexture tròn)
  // ══════════════════════════════════════════════════════════════════════════
  const particleCount = 150;
  const particleGeo = prepGeo(new THREE.BufferGeometry());
  const particlePositions = new Float32Array(particleCount * 3);
  const particlePhases = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * (roomW - 2.0);
    particlePositions[i * 3 + 1] = 0.5 + Math.random() * (roomH - 1.5);
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * (roomL - 4.0);
    particlePhases[i] = Math.random() * Math.PI * 2;
  }
  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));

  const smokeTex = createSmokeDustTexture();
  const particleMat = new THREE.PointsMaterial({
    map: smokeTex,
    color: 0xffe0b2,
    size: 0.25,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });

  const particles = new THREE.Points(particleGeo, particleMat);
  particles.name = 'VN_Morning_Dust_Particles';
  particles.userData.ignoreRaycaster = true;
  particles.userData.phases = particlePhases;
  interior.add(particles);
  _disposables.push(particles);

  // ══════════════════════════════════════════════════════════════════════════
  // I. ÁNH SÁNG THỰC & ĐIỆN ẢNH CHIAROSCURO (ACESFilmic, NO Fake Cone)
  // ══════════════════════════════════════════════════════════════════════════
  // 1. SpotLight vàng ấm rọi tượng trung tâm từ phía trước chéo xuống
  const centerSpotLight = new THREE.SpotLight(0xffb84d, 70.0, 36.0, Math.PI / 3.2, 0.75, 1.25);
  centerSpotLight.position.set(0, roomH - 1.2 + floorY, 4.0);
  centerSpotLight.target.position.set(0, 1.8 + floorY, -2.5);
  centerSpotLight.castShadow = true;
  centerSpotLight.userData.ignoreRaycaster = true;
  centerSpotLight.target.userData.ignoreRaycaster = true;
  interior.add(centerSpotLight);
  interior.add(centerSpotLight.target);
  _lights.push(centerSpotLight, centerSpotLight.target);

  // 1b. PointLight vàng ấm chiếu sáng mặt trước hiện vật Vợ Nhặt
  const frontFillLight = new THREE.PointLight(0xffe0b2, 6.0, 16.0, 1.2);
  frontFillLight.position.set(0, 2.4 + floorY, 2.0);
  frontFillLight.userData.ignoreRaycaster = true;
  interior.add(frontFillLight);
  _lights.push(frontFillLight);

  // 2. SpotLight vàng cam rọi căn nhà tranh & chõng tre
  const cottageSpotLight = new THREE.SpotLight(0xff9944, 40.0, 20.0, Math.PI / 4, 0.70, 1.2);
  cottageSpotLight.position.set(-7.5, roomH - 0.8 + floorY, 3.5);
  cottageSpotLight.target.position.set(-7.5, 0.8 + floorY, 3.5);
  cottageSpotLight.castShadow = true;
  cottageSpotLight.userData.ignoreRaycaster = true;
  cottageSpotLight.target.userData.ignoreRaycaster = true;
  interior.add(cottageSpotLight);
  interior.add(cottageSpotLight.target);
  _lights.push(cottageSpotLight, cottageSpotLight.target);

  // 3. HemisphereLight chiều đói xám lạnh, tương phản gắt gao với ánh sáng ấm cúng nội thất
  const hemiLight = new THREE.HemisphereLight(0x7e8892, 0x241d18, 0.60);
  hemiLight.userData.ignoreRaycaster = true;
  interior.add(hemiLight);
  _lights.push(hemiLight);

  // 4. PointLight vàng ấm hắt tường gỗ
  const wallGlowPositions = [
    [-halfW + 1.0, roomH / 2, -halfL + 2.0], [-halfW + 1.0, roomH / 2, halfL - 2.0],
    [halfW - 1.0, roomH / 2, -halfL + 2.0], [halfW - 1.0, roomH / 2, halfL - 2.0]
  ];
  wallGlowPositions.forEach(([gx, gy, gz]) => {
    const pGlow = new THREE.PointLight(0xff9933, 3.0, 10.0, 1.6);
    pGlow.position.set(gx, floorY + gy, gz);
    pGlow.userData.ignoreRaycaster = true;
    interior.add(pGlow);
    _lights.push(pGlow);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // J. PROXY HITBOXES TƯƠNG TÁC (5 ĐIỂM CHÍNH - 0% OVERLAP)
  // ══════════════════════════════════════════════════════════════════════════
  const hitboxDefs = [
    { name: 'hitbox_vonhat_center', id: 'voNhatStatue', loreKey: 'trang_and_wife', pos: [0, 2.2 + floorY, -2.5], size: [2.2, 3.6, 2.2] },
    { name: 'hitbox_wedding_meal', id: 'weddingMeal', loreKey: 'mrs_tu_meal', pos: [-7.5, 0.9 + floorY, 3.6], size: [2.4, 1.4, 1.6] },
    { name: 'hitbox_thatched_cottage', id: 'thatchedCottage', loreKey: 'famine_context', pos: [-7.5, 2.6 + floorY, 1.8], size: [4.4, 1.8, 1.8] },
    { name: 'hitbox_grain_cart', id: 'grainCart', loreKey: 'famine_context', pos: [7.5, 1.2 + floorY, 3.5], size: [3.4, 1.8, 2.2] },
    { name: 'hitbox_red_flag_beacon', id: 'redFlagBeacon', loreKey: 'revolutionary_flag', pos: [4.2, 1.5 + floorY, halfL - 2.8], size: [2.5, 1.8, 0.6] }
  ];

  hitboxDefs.forEach((def) => {
    const hitGeo = prepGeo(new THREE.BoxGeometry(...def.size));
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    const hitMesh = new THREE.Mesh(hitGeo, hitMat);
    hitMesh.name = def.name;
    hitMesh.position.set(...def.pos);
    hitMesh.userData.hitboxId = def.id;
    hitMesh.userData.loreId = def.id;
    hitMesh.userData.loreKey = def.loreKey;
    hitMesh.userData.roomId = 'vo_nhat';
    hitMesh.userData.styleTheme = 'voNhat';
    hitMesh.userData.realm = 'museum';
    hitMesh.userData.interactive = true;
    hitMesh.userData.isClickProxy = true;
    hitMesh.userData.isArtifact3D = true;
    if (def.id === 'redFlagBeacon') {
      hitMesh.userData.isPlaque = true;
      hitMesh.userData.isPlaqueProxy = true;
    }
    interior.add(hitMesh);
    _disposables.push(hitMesh);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // K. ÂM THANH KHÔNG GIAN 3D (THREE.PositionalAudio Hooks)
  // ══════════════════════════════════════════════════════════════════════════
  const soundDefs = [
    { name: 'VN_Sound_CheKhoan_Bubbling', pos: [-7.5, 1.2, 3.5], refDistance: 3.5, maxDistance: 14.0, desc: 'Tiếng sôi lục bục của nồi chè khoán & gió lùa mái tranh' },
    { name: 'VN_Sound_Oil_Lamp_Crackle', pos: [-6.9, 1.5, 3.5], refDistance: 2.5, maxDistance: 10.0, desc: 'Tiếng lách tách tí tách ấm cúng của ngọn đèn dầu tân hôn' },
    { name: 'VN_Sound_Revolution_Distant_Drums', pos: [6.8, 1.5, -8.0], refDistance: 4.5, maxDistance: 20.0, desc: 'Tiếng trống thúc thuế dồn dập & âm vang khởi nghĩa phá kho thóc' },
    { name: 'VN_Sound_Grain_Cart_Creak', pos: [7.5, 1.2, 3.5], refDistance: 3.5, maxDistance: 14.0, desc: 'Tiếng kẽo kẹt bánh xe bò chở thóc' }
  ];
  soundDefs.forEach((sd) => {
    const sGroup = new THREE.Group();
    sGroup.name = sd.name;
    sGroup.position.set(sd.pos[0], floorY + sd.pos[1], sd.pos[2]);
    sGroup.userData.soundConfig = sd;
    sGroup.userData.stop = () => {};
    sGroup.userData.fadeOut = () => {};
    interior.add(sGroup);
    _sounds.push(sGroup);
    _disposables.push(sGroup);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // L. ĐĂNG KÝ SPATIAL REGISTRY COLLIDERS (Padding = 1.5m, 0% Overlap)
  // ══════════════════════════════════════════════════════════════════════════
  try {
    const registry = getSpatialRegistry?.();
    if (registry?.registerCollider) {
      targetConfigs.forEach((cfg) => {
        const obj = interior.getObjectByName(cfg.name);
        if (obj) {
          obj.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(obj);
          registry.registerCollider?.(`vo_nhat_${cfg.name}`, box, { padding: 1.5 });
        }
      });
    }
  } catch (_) {}

  return roomGroup;
}

// ─── Target configs for spatial registry & validation ────────────────────────
const targetConfigs = [
  { name: 'VN_XomNguCu_Portal_Gate' },
  { name: 'VN_Heritage_InfoPlaque' },
  { name: 'VN_Central_Dais_Earth' },
  { name: 'VN_Thatched_Cottage_Area' },
  { name: 'VN_Grain_Cart_Area' },
  { name: 'VN_Realm_Portal_Altar' }
];

// ─── Dispose ──────────────────────────────────────────────────────────────────
export function disposeVoNhatRoom(scene) {
  _lights.forEach((l) => {
    l.parent?.remove(l);
    scene?.remove(l);
  });
  _sounds.forEach((s) => {
    try {
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

  // Gỡ colliders khỏi SpatialRegistry
  try {
    const registry = getSpatialRegistry?.();
    if (registry?.unregisterCollider) {
      targetConfigs.forEach((cfg) => {
        registry.unregisterCollider?.(`vo_nhat_${cfg.name}`);
      });
    }
  } catch (_) {}

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
}

// ─── Validate Room Spatial Layout (Anti-Collision Engine) ────────────────────
export function validateRoomSpatialLayout(roomGroup) {
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
export function triggerVoNhatLore(loreKey = 'famine_context', options = {}) {
  if (typeof window !== 'undefined') {
    if (window.__loreOverlay?.show) {
      window.__loreOverlay.show(loreKey, options);
      return true;
    }
    if (window.__loreGuide?.showLoreCard) {
      window.__loreGuide.showLoreCard(loreKey, options);
      return true;
    }
    if (window.__loreGuide?.show) {
      window.__loreGuide.show(loreKey, options);
      return true;
    }
  }
  return true;
}

// ─── Context & Realm stubs ────────────────────────────────────────────────────
export let teleportBook = null;

export function enterRealm(targetRealm = 'vo-nhat') {
  if (typeof window !== 'undefined' && window.__voNhatRoom?.enterRealm) {
    window.__voNhatRoom.enterRealm(targetRealm);
  }
}

export function setupContext(ctx = {}) {
  if (typeof window !== 'undefined' && window.__voNhatRoom?.setupContext) {
    window.__voNhatRoom.setupContext(ctx);
  }
}

// ─── Exhibition Master Root (Entry point for main.js) ────────────────────────
export function buildVoNhatExhibition(options = {}) {
  const roomCenter = options.roomCenter ?? new THREE.Vector3(48.0, 20.0, 19.0);
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
  root.name = 'VoNhat_Master_Root';
  if (roomCenter) {
    root.position.copy(roomCenter);
  }

  // 1. Museum Room Group
  const roomGroup = new THREE.Group();
  roomGroup.name = 'VoNhat_Museum_Room';
  roomGroup.visible = true;
  root.add(roomGroup);

  // 2. Battle Realm Master Group
  const realmMaster = new THREE.Group();
  realmMaster.name = 'VoNhat_Realm_Master';
  realmMaster.position.copy(VN_REALM_ORIGIN);
  realmMaster.visible = false;
  root.add(realmMaster);

  // Build the room components
  buildVoNhatRoom(roomGroup, { floorY: 0, glbUrl: options.glbUrl, roomCenter }).catch((err) => {
    console.warn('[VoNhatRoom] build error:', err);
  });

  // Init open-world realm if realmScene passed
  if (_realmScene) {
    try {
      _world = new VoNhatWorld(_realmScene, _camera, _renderer);
      _world.init().catch((err) => console.warn('[VoNhatWorld] init error:', err));
    } catch (e) {
      console.warn('[VoNhatWorld] error:', e);
    }
  }

  // ACESFilmicToneMapping configuration
  if (_renderer) {
    _renderer.toneMapping = THREE.ACESFilmicToneMapping;
    _renderer.toneMappingExposure = 1.1;
  }

  // Realm transitions
  function enterRealm(targetRealm = 'vo-nhat') {
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
      const targetScene = _realmScene || (typeof window !== 'undefined' ? window.__voNhatScene : null);
      if (typeof window !== 'undefined' && window.__app?.setActiveScene && targetScene) {
        window.__app.setActiveScene(targetScene);
      } else if (_cameraManager && targetScene) {
        _cameraManager.switchScene?.(targetScene, VN_REALM_ORIGIN.clone().add(VN_OBS_PLATFORM_OFFSET));
      }
      if (typeof window !== 'undefined' && window.__spatialAudio?.playRealmSoundscape) {
        window.__spatialAudio.playRealmSoundscape('voNhat_xomNguCu');
      }
    };

    const bookTarget = roomGroup.getObjectByName('Interactive_VoNhat_Teleport_Book');
    if (playBookVortexCutscene && bookTarget && cam) {
      try {
        playBookVortexCutscene({
          camera: cam,
          cameraController: camCtrl,
          controls: ctrl,
          bookMesh: bookTarget,
          themeColor: 0xff5722,
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

  // Animation update loop (Zero-Allocation 60+ FPS with direct cached references)
  let _cachedDustObj = null;
  let _cachedSteamObj = null;
  let _cachedFlame = null;
  let _cachedOilLight = null;

  root.update = function (delta, elapsedTime, camera) {
    if (!roomGroup.visible) return;

    // 1. Dust particle motion (In-place BufferAttribute mutation)
    if (!_cachedDustObj) _cachedDustObj = roomGroup.getObjectByName('VN_Morning_Dust_Particles');
    if (_cachedDustObj?.geometry?.attributes?.position) {
      const posAttr = _cachedDustObj.geometry.attributes.position;
      const phases = _cachedDustObj.userData?.phases;
      if (phases) {
        const arr = posAttr.array;
        const count = phases.length;
        for (let i = 0; i < count; i++) {
          arr[i * 3 + 1] += Math.sin(elapsedTime * 1.5 + phases[i]) * 0.003;
        }
        posAttr.needsUpdate = true;
      }
    }

    // 2. Che Khoan porridge steam rising (In-place BufferAttribute mutation)
    if (!_cachedSteamObj) _cachedSteamObj = roomGroup.getObjectByName('VN_CheKhoan_Steam');
    if (_cachedSteamObj?.geometry?.attributes?.position) {
      const posAttr = _cachedSteamObj.geometry.attributes.position;
      const arr = posAttr.array;
      const count = posAttr.count;
      for (let i = 0; i < count; i++) {
        const yIdx = i * 3 + 1;
        arr[yIdx] += 0.003;
        if (arr[yIdx] > 0.75) {
          arr[yIdx] = 0.28;
        }
      }
      posAttr.needsUpdate = true;
    }

    // 3. Oil lamp flame flicker & PointLight dynamic modulation (Zero object allocation)
    if (!_cachedFlame) _cachedFlame = roomGroup.getObjectByName('VN_Lamp_Flame');
    if (_cachedFlame?.material) {
      _cachedFlame.material.emissiveIntensity = 3.6 + Math.sin(elapsedTime * 12.0) * 0.8 + Math.cos(elapsedTime * 7.0) * 0.4;
    }
    if (!_cachedOilLight) _cachedOilLight = roomGroup.getObjectByName('VN_Oil_Lamp_Light');
    if (_cachedOilLight) {
      _cachedOilLight.intensity = 3.4 + Math.sin(elapsedTime * 12.0) * 0.5 + Math.cos(elapsedTime * 7.0) * 0.25;
    }
  };

  root.updateRealm = function (delta, elapsedTime, camera) {
    if (_world) _world.update(delta, elapsedTime, camera);
  };

  root.enterRealm = enterRealm;
  root.exitRealm = exitRealm;
  root.isInsideRealm = () => _isInsideRealm;
  root.getGroup = () => roomGroup;
  root.teleportBook = root.getObjectByName?.('Interactive_VoNhat_Teleport_Book') || null;

  root.setupContext = function (ctx = {}) {
    if (ctx.realmScene) _realmScene = ctx.realmScene;
    if (ctx.mainScene || ctx.scene) _scene = ctx.mainScene || ctx.scene;
    if (ctx.camera) _camera = ctx.camera;
    if (ctx.renderer) {
      _renderer = ctx.renderer;
      _renderer.toneMapping = THREE.ACESFilmicToneMapping;
      _renderer.toneMappingExposure = 1.1;
    }
    if (ctx.cameraManager) _cameraManager = ctx.cameraManager;
    if (ctx.controls) _controls = ctx.controls;
    if (ctx.hitboxManager) _hitboxManager = ctx.hitboxManager;
  };

  root.dispose = function () {
    disposeVoNhatRoom(roomGroup);
    if (_world) {
      _world.dispose();
      _world = null;
    }
  };

  root.userData = {
    themeKey: 'voNhat',
    roomGroup,
    tourWaypoints: typeof VO_NHAT_TOUR_WAYPOINTS !== 'undefined' ? VO_NHAT_TOUR_WAYPOINTS : null,
    wireInteractiveSystems: (ctx = {}) => {
      root.setupContext(ctx);
    },
    registerHitboxes: (hitboxManager) => {
      const hbm = hitboxManager || (typeof window !== 'undefined' ? window.__museumHitboxManager : null);
      if (!hbm) return;
      const hitboxes = [];
      const guide = typeof window !== 'undefined' ? (window.__loreGuide || window.__museumLoreGuide) : null;
      roomGroup.traverse((child) => {
        if (child.name?.startsWith('hitbox_') && child.userData?.hitboxId) {
          hitboxes.push(child);
          if (guide?.registerArtifact && child.userData?.loreKey) {
            guide.registerArtifact(child, child.userData.loreKey);
          }
        }
      });

      // 1. Đăng ký Click Proxies với MuseumHitboxManager
      if (Array.isArray(hbm.clickProxies)) {
        hitboxes.forEach((hitMesh) => {
          hitMesh.userData.isClickProxy = true;
          hitMesh.userData.isArtifact3D = true;
          hitMesh.userData.roomId = 'vo_nhat';
          if (!hbm.clickProxies.includes(hitMesh)) {
            hbm.clickProxies.push(hitMesh);
          }
        });
      }

      // 2. Đăng ký vật cản rắn solid obstacle colliders
      if (typeof hbm.registerSolidObjectCollider === 'function') {
        const solidNames = ['VN_Central_Dais_Earth', 'VN_Thatched_Cottage_Area', 'VN_Grain_Cart_Area', 'VN_Heritage_InfoPlaque'];
        solidNames.forEach((targetName, idx) => {
          const obj = roomGroup.getObjectByName(targetName);
          if (obj) {
            hbm.registerSolidObjectCollider(obj, {
              shrinkFactor: 0.95,
              tag: `VoNhat_Solid_${idx}`,
              helperColor: 0xf59e0b,
              realm: 'museum'
            });
          }
        });
      }

      hbm.registerRoomHitboxes?.('vo_nhat', hitboxes);
    }
  };

  root.registerHitboxes = root.userData.registerHitboxes;
  root.autoTourWaypoints = typeof VO_NHAT_TOUR_WAYPOINTS !== 'undefined' ? VO_NHAT_TOUR_WAYPOINTS : null;
  root.getAutoTourWaypoints = () => (typeof VO_NHAT_TOUR_WAYPOINTS !== 'undefined' ? VO_NHAT_TOUR_WAYPOINTS : null);

  return root;
}
