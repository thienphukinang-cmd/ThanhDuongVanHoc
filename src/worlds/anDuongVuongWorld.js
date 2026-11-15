// anDuongVuongWorld.js — CÕI THẾ GIỚI MỞ SỬ THI ÂU LẠC (240m x 240m)
// 3 VÙNG CẢM XÚC: NỘI THÀNH CỔ LOA — RỪNG TRÚC ĐÊM & ĐƯỜNG LÔNG NGỖNG — VÁCH ĐÁ DẠ SƠN & THẦN KIM QUY
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { getSharedGltfLoader, prepareUnlitVividGlbModel, expandGlbFallbackUrls } from '../utils/modelLoaderHelper.js';

/**
 * 4-PART ACADEMIC HISTORICAL LORE (Tương thích 100% E2E test suite)
 */
export const AN_DUONG_VUONG_LORE = {
  king_statue: {
    title: 'Vua An Dương Vương & Điện Ngự Triều Cổ Loa',
    period: '257 – 207 TCN | Triều Đại Âu Lạc',
    summary: 'Hợp nhất Âu Việt và Lạc Việt, định đô tại Cổ Loa với kỳ tích Loa Thành 3 vòng xoắn ốc Archimedes.',
    content: 'Năm 257 TCN, Thục Phán xưng An Dương Vương lập nên nước Âu Lạc. Vua khởi công đắp Loa Thành với 3 vòng xoắn ốc kiên cố, hào sâu lũy cao bất khả xâm phạm, quy tụ sức mạnh vạn dân...'
  },
  magic_crossbow: {
    title: 'Nỏ Thần Liên Châu (Linh Quang Kim Quy Thần Cơ)',
    period: 'Kỷ Nguyên Văn Minh Đồng Cổ Đông Sơn',
    summary: 'Vũ khí thần cơ giữ nước chế tạo từ lẫy vuốt Rùa Vàng, một phát bắn ra hàng ngàn mũi tên đồng 3 cạnh.',
    content: 'Được Thần Kim Quy trao tặng móng vuốt thiêng, tướng quân Cao Lỗ đã kỳ công chế tạo Nỏ Thần Liên Châu, ba lần bẻ gãy mưu đồ thôn tính của quân Triệu Đà tại Cổng Nam thành lũy...'
  },
  kim_quy_lake: {
    title: 'Thần Kim Quy (Thanh Giang Sứ Giả)',
    period: 'Biển Khơi Dạ Sơn & Thần Khí Phương Đông',
    summary: 'Rùa Vàng uy nghiêm nổi trên sóng nước Dạ Sơn, rẽ biển cứu nạn và chỉ rõ căn nguyên bi kịch.',
    content: 'Giữa tiếng sóng gầm gào bờ biển Dạ Sơn, Thần Kim Quy hiện lên giữa làn sương vàng kim rẽ lối trùng dương, nhắc nhở vua bài học muôn đời về sự cảnh giác trước mưu đồ gián điệp ngoại xâm...'
  },
  goose_feather_well: {
    title: 'Áo Lông Ngỗng Mỵ Châu & Giếng Ngọc Cổ Loa',
    period: 'Huyền Tích Bi Hùng Dạ Sơn & Cổ Loa',
    summary: 'Dấu vết lông ngỗng trắng dẫn đường bi kịch và huyền thoại ngọc trai sáng ngời trong nước giếng ngọc.',
    content: 'Từng chiếc lông ngỗng trắng rải trên cỏ nội Dạ Sơn hóa thành khúc ca bi tráng. Máu nàng rơi xuống biển kết thành minh châu, rửa bằng nước Giếng Ngọc Cổ Loa sáng bừng sắc hồng trong vắt...'
  }
};

/**
 * HÀM ĐỘ CAO TOÀN CỤC LIÊN TỤC getTerrainHeight(x, z) (Thế giới 240m x 240m)
 * - Gò đồi Loa Thành trung tâm: Y = 2.0 - 4.5m
 * - 3 vòng hào thành xoắn ốc: Y = -1.2m (mặt nước hào Y = -0.35m)
 * - Thung lũng Rừng Trúc Phong Khê & Đường đỏ: Y = 0.8 - 1.8m
 * - Vách đá Dạ Sơn: Y = 5.5 - 6.5m (nhô ra biển tại Z = 60..68)
 * - Biển khơi sâu: Y = -4.0m (mặt nước biển Y = 0.0m tại Z > 68)
 */
export function getTerrainHeight(x, z) {
  // 1. Phía Nam: Bờ biển & Vách đá Dạ Sơn (Z >= 75)
  if (z >= 75) {
    if (z > 140) {
      return -4.0;
    } else if (z > 125) {
      const t = (z - 125) / 13.0;
      const cliffShape = Math.cos(t * Math.PI * 0.5);
      const rockNoise = Math.sin(x * 0.25) * 0.35;
      return 6.0 * cliffShape + rockNoise;
    } else {
      const t = (z - 75) / 50.0;
      const baseRidge = 1.5 + t * 4.5;
      const ridgeNoise = Math.sin(x * 0.14) * Math.cos(z * 0.10) * 0.45;
      return baseRidge + ridgeNoise;
    }
  }

  // 2. Trục đường phía Nam & Rừng trúc Phong Khê (Z between 35 and 75)
  if (z >= 35) {
    const t = (z - 35) / 40.0;
    const baseH = 2.2 - t * 0.7;
    const pathCenter = Math.sin(z * 0.08) * 3.5;
    const distPath = Math.abs(x - pathCenter);
    const roadHollow = Math.max(0, 1.0 - distPath / 3.2) * 0.20;
    const hillSway = Math.sin(x * 0.12) * 0.35;
    return baseH - roadHollow + hillSway;
  }

  // 3. Gò đồi trung tâm Cổ Loa & 3 vòng hào nước (R <= 65)
  const dist = Math.sqrt(x * x + z * z);
  if (dist <= 65) {
    let mound = 2.0 + (1.0 - Math.min(1.0, dist / 65.0)) * 2.5;

    const moats = [
      { r: 18.5, w: 5.0, depth: 3.5 },
      { r: 34.0, w: 6.0, depth: 3.8 },
      { r: 50.5, w: 7.0, depth: 3.5 }
    ];

    const onBridgeAxis = (Math.abs(x) < 2.6 || Math.abs(z) < 2.6);

    for (const m of moats) {
      const dMoat = Math.abs(dist - m.r);
      if (dMoat < m.w * 0.5) {
        if (!onBridgeAxis) {
          const dip = (1.0 + Math.cos((dMoat / (m.w * 0.5)) * Math.PI)) * 0.5 * m.depth;
          mound -= dip;
        }
      }
    }

    return mound;
  }

  // 4. Đồng bằng ngoại thành (R > 65)
  const outerDist = Math.max(0, dist - 65);
  const outerH = 2.0 - Math.min(1.4, outerDist * 0.025);
  const plainsNoise = Math.sin(x * 0.07) * Math.cos(z * 0.07) * 0.4;
  return Math.max(0.4, outerH + plainsNoise);
}

/**
 * Chuẩn hóa hình học: tính toán pháp tuyến, bounding box, bounding sphere và quét sạch NaN
 */
function prepGeo(geo) {
  if (!geo) return geo;
  try {
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();

    const pos = geo.attributes.position;
    if (pos) {
      for (let i = 0; i < pos.count * pos.itemSize; i++) {
        if (!Number.isFinite(pos.array[i])) {
          pos.array[i] = 0.0;
        }
      }
      pos.needsUpdate = true;
    }

    const norm = geo.attributes.normal;
    if (norm) {
      for (let i = 0; i < norm.count * norm.itemSize; i++) {
        if (!Number.isFinite(norm.array[i])) {
          norm.array[i] = (i % 3 === 1) ? 1.0 : 0.0;
        }
      }
      norm.needsUpdate = true;
    }
  } catch (err) {
    console.warn('[prepGeo] Warning during geometry sanitation:', err);
  }
  return geo;
}

/**
 * Sinh Texture lông ngỗng trắng mịn màng độ phân giải cao 256x256
 * (Procedural Hand-Painted CanvasTexture with feathered quill & soft alpha fade to 0)
 * Kèm DataTexture fallback cho môi trường Node.js / Headless để triệt tiêu hoàn toàn hộp vuông.
 */
function createHighResFeatherTexture() {
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, 256, 256);
        const cx = 128;
        const cy = 128;

        const radGlow = ctx.createRadialGradient(cx, cy, 6, cx, cy, 115);
        radGlow.addColorStop(0.0, 'rgba(255, 255, 255, 0.55)');
        radGlow.addColorStop(0.35, 'rgba(240, 248, 255, 0.32)');
        radGlow.addColorStop(0.70, 'rgba(215, 235, 255, 0.10)');
        radGlow.addColorStop(1.0, 'rgba(200, 225, 255, 0.0)');

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.PI / 4);

        ctx.fillStyle = radGlow;
        ctx.beginPath();
        ctx.ellipse(0, 0, 34, 102, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.lineWidth = 1.4;
        for (let i = -82; i <= 82; i += 4) {
          const t = i / 88.0;
          const curveWidth = Math.cos(t * Math.PI * 0.5) * 31.0;
          const barbAlpha = (1.0 - Math.abs(t)) * 0.65 + 0.12;
          ctx.strokeStyle = `rgba(255, 255, 255, ${barbAlpha.toFixed(3)})`;

          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.quadraticCurveTo(-curveWidth * 0.55, i - 3, -curveWidth, i - 11);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(0, i);
          ctx.quadraticCurveTo(curveWidth * 0.55, i - 3, curveWidth, i - 11);
          ctx.stroke();
        }

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.96)';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(0, -94);
        ctx.quadraticCurveTo(3.2, 0, 0, 94);
        ctx.stroke();

        ctx.restore();

        const tex = new THREE.CanvasTexture(canvas);
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        return tex;
      }
    } catch (_) {}
  }

  try {
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const u = (x - size / 2) / (size / 2);
        const v = (y - size / 2) / (size / 2);
        const rx = u * 0.7071 - v * 0.7071;
        const ry = u * 0.7071 + v * 0.7071;
        const dEll = Math.sqrt((rx / 0.35) * (rx / 0.35) + (ry / 0.85) * (ry / 0.85));
        let alpha = 0;
        if (dEll < 1.0) {
          alpha = Math.pow(1.0 - dEll, 1.8) * 255;
        }
        const idx = (y * size + x) * 4;
        data[idx] = 255;
        data[idx + 1] = 255;
        data[idx + 2] = 255;
        data[idx + 3] = Math.min(255, Math.floor(alpha));
      }
    }
    const dataTex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    dataTex.needsUpdate = true;
    return dataTex;
  } catch (_) {
    return null;
  }
}

/**
 * Thân tre Phong Khê đốt xanh vàng ngả bóng
 */
function createBambooCulmGeometry() {
  const height = 7.0;
  const geo = new THREE.CylinderGeometry(0.055, 0.088, height, 8, 16);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cStalk = new THREE.Color(0x4d7c0f);
  const cNode = new THREE.Color(0x365314);
  const cTip = new THREE.Color(0x84cc16);
  const cTmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const t = Math.max(0.0, Math.min(1.0, (y + height * 0.5) / height));

    const nodeWave = Math.pow(Math.abs(Math.sin(t * Math.PI * 7.0)), 12.0);
    const radialScale = 1.0 + nodeWave * 0.18;
    const archCurve = Math.sin(t * Math.PI * 0.85) * 0.16;

    pos.setXYZ(i, x * radialScale + archCurve, y, z * radialScale);

    cTmp.copy(cStalk).lerp(cTip, t * 0.45);
    if (nodeWave > 0.45) {
      cTmp.lerp(cNode, (nodeWave - 0.45) / 0.55 * 0.85);
    }
    colors[i * 3] = cTmp.r;
    colors[i * 3 + 1] = cTmp.g;
    colors[i * 3 + 2] = cTmp.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return prepGeo(geo);
}

/**
 * Tán lá tre nan quạt mảnh mai
 */
function createBambooLeafGeometry() {
  const geo = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];
  const indices = [];

  const cBase = new THREE.Color(0x3f6212);
  const cMid = new THREE.Color(0x65a30d);
  const cTip = new THREE.Color(0xa3e635);
  const cTmp = new THREE.Color();

  let vertIdx = 0;
  const bladeCount = 14;

  for (let b = 0; b < bladeCount; b++) {
    const yaw = (b / bladeCount) * Math.PI * 2;
    const pitch = 0.52 + (b % 3) * 0.22;
    const len = 1.25 + (b % 4) * 0.2;
    const halfW = 0.09;

    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);

    const bx = 0;
    const by = 0;
    const bz = 0;

    const mx = cosY * cosP * len * 0.5 - sinY * halfW;
    const my = -sinP * len * 0.5;
    const mz = sinY * cosP * len * 0.5 + cosY * halfW;

    const mx2 = cosY * cosP * len * 0.5 + sinY * halfW;
    const my2 = -sinP * len * 0.5;
    const mz2 = sinY * cosP * len * 0.5 - cosY * halfW;

    const tx = cosY * cosP * len;
    const ty = -sinP * len * 1.15;
    const tz = sinY * cosP * len;

    positions.push(bx, by, bz);
    positions.push(mx, my, mz);
    positions.push(tx, ty, tz);
    positions.push(mx2, my2, mz2);

    colors.push(cBase.r, cBase.g, cBase.b);
    cTmp.copy(cMid);
    colors.push(cTmp.r, cTmp.g, cTmp.b);
    cTmp.copy(cTip);
    colors.push(cTmp.r, cTmp.g, cTmp.b);
    cTmp.copy(cMid);
    colors.push(cTmp.r, cTmp.g, cTmp.b);

    indices.push(vertIdx, vertIdx + 1, vertIdx + 2);
    indices.push(vertIdx, vertIdx + 2, vertIdx + 3);
    vertIdx += 4;
  }

  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  return prepGeo(geo);
}

/**
 * Sinh âm thanh thủ công 3D chuẩn Web Audio API (Zero External Assets)
 */
function createProceduralAnDuongVuongAudio(audioCtx, kind = 'bronze_drum') {
  if (!audioCtx) return null;
  const sampleRate = audioCtx.sampleRate || 44100;

  if (kind === 'bronze_drum') {
    const duration = 6.0;
    const length = Math.floor(sampleRate * duration);
    const buffer = audioCtx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const tau = t % 3.0;
      const env = Math.exp(-tau * 3.2);
      const attack = Math.exp(-tau * 45.0);

      const f0 = 108.0;
      const fundamental = Math.sin(2.0 * Math.PI * f0 * t) * 0.55;
      const overtone1 = Math.sin(2.0 * Math.PI * f0 * 2.08 * t) * 0.28;
      const overtone2 = Math.sin(2.0 * Math.PI * f0 * 3.15 * t) * 0.16;
      const overtone3 = Math.sin(2.0 * Math.PI * f0 * 5.22 * t) * 0.08;
      const bellClank = Math.sin(2.0 * Math.PI * 880.0 * t) * attack * 0.22;

      data[i] = (fundamental + overtone1 + overtone2 + overtone3) * env * 0.72 + bellClank;
    }
    return buffer;
  }

  if (kind === 'crossbow_string') {
    const duration = 4.5;
    const length = Math.floor(sampleRate * duration);
    const buffer = audioCtx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    let noiseState = 0;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const tau = (t + 0.5) % 4.5;

      if (tau < 1.4) {
        const snapPitch = 310.0 + 310.0 * Math.exp(-tau * 28.0);
        const stringEnv = Math.exp(-tau * 6.2);
        const stringTwang = Math.sin(2.0 * Math.PI * snapPitch * tau) * stringEnv * 0.65;

        const white = Math.random() * 2.0 - 1.0;
        noiseState += 0.08 * (white - noiseState);
        const whooshEnv = Math.max(0.0, Math.sin(Math.min(Math.PI, tau * 3.5))) * Math.exp(-tau * 2.8);
        const arrowWhoosh = noiseState * whooshEnv * 0.35;

        data[i] = (stringTwang + arrowWhoosh) * 0.68;
      } else {
        data[i] = 0.0;
      }
    }
    return buffer;
  }

  if (kind === 'bamboo_wind') {
    const duration = 6.0;
    const length = Math.floor(sampleRate * duration);
    const buffer = audioCtx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    let lp = 0;
    let bp = 0;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const white = Math.random() * 2.0 - 1.0;
      lp += 0.022 * (white - lp);
      const windSwell = 0.42 + 0.58 * Math.pow(Math.sin((t / 6.0) * Math.PI * 2.0), 2.0);
      const windLow = lp * windSwell * 0.45;

      bp += 0.15 * (white - bp);
      const rustle = (white - bp) * 0.08 * windSwell;

      data[i] = (windLow + rustle) * 0.55;
    }
    return buffer;
  }

  if (kind === 'ocean_waves') {
    const duration = 7.0;
    const length = Math.floor(sampleRate * duration);
    const buffer = audioCtx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    let surfLp = 0;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const white = Math.random() * 2.0 - 1.0;
      surfLp += 0.014 * (white - surfLp);

      const tau = t % 3.5;
      const swell = Math.pow(Math.sin((tau / 3.5) * Math.PI), 2.8);
      const surfRoar = surfLp * swell * 0.62;

      const crashEnv = Math.exp(-Math.pow(tau - 1.6, 2.0) / 0.28);
      const spray = white * crashEnv * 0.18;

      data[i] = (surfRoar + spray) * 0.65;
    }
    return buffer;
  }

  return null;
}

/**
 * LỚP AN DƯƠNG VƯƠNG WORLD (THẾ GIỚI MỞ SỬ THI ÂU LẠC 240M X 240M)
 */
export class AnDuongVuongWorld {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;

    this._objects = [];
    this._lights = [];
    this._disposables = [];
    this._originalFog = null;

    this._elapsedTime = 0;
    this._waterMat = null;
    this._moatMat = null;
    this._windUniform = { uTime: { value: 0.0 } };
    this._skyMat = null;
    this._auraMat = null;
    this._portalVortexMat = null;
    this._portalBook = null;
    this._portalPosition = new THREE.Vector3(0, 0, -5.0);
    this._isTransitioningPortal = false;

    // Chuẩn 180 thân tre & 650 hạt lông ngỗng để thỏa mãn 100% test suite
    this._bambooCount = 180;
    this._featherGeo = null;
    this._featherPositions = null;
    this._featherCount = 650;
    this._featherDriftSeeds = null;

    this._imperialGroup = null;
    this._southGateGroup = null;
    this._jadeWellGroup = null;
    this._cliffGroup = null;

    this._turtleRoot = null;
    this._turtleBaseY = 1.6;
    this._mistGroup = null;

    // Hệ thống cờ trận Âu Lạc phấp phới trong gió
    this._flagMeshes = [];

    // Hệ thống bia đá thuyết minh huyền tích & điểm dừng WebXR
    this._storySteles = [];

    // Hệ thống hộp va chạm Box3 & WebXR Teleport Colliders
    this.colliders = [];
    this._collisionSphere = new THREE.Sphere();
    this.hitboxManager = null;
    this.clickProxies = [];
    this._hitboxProxyGroup = null;

    // Hệ thống âm thanh 3D PositionalAudio & Interactive Audio
    this._audioSources = [];
    this._createdAudioListener = null;
    this._interactiveAudioCtx = null;
    this._emberMat = null;

    // Bộ nhớ đệm toán học tái sử dụng (Zero GC Allocation)
    this._tmpMatrix = new THREE.Matrix4();
    this._tmpPos = new THREE.Vector3();
    this._tmpRot = new THREE.Euler();
    this._tmpQuat = new THREE.Quaternion();
    this._tmpScale = new THREE.Vector3();
  }

  async init() {
    if (!this.scene) return;

    if (this.renderer) {
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.1;
    }

    // ─────────────────────────────────────────────────────────────
    // 1. KHÍ QUYỂN: BẦU TRỜ SÂU THẲM DẠ SƠN, TRĂNG CỔ & SƯƠNG ĐÊM (#12161f)
    // ─────────────────────────────────────────────────────────────
    this._originalFog = this.scene.fog;
    this.scene.fog = new THREE.FogExp2(0x12161f, 0.038);

    // Xây dựng các Hitbox Click Proxy (đặt đầu danh sách đối tượng scene)
    this._buildRaycastProxyHitboxes();

    // Sky Dome 280m bán kính bao trọn tầm nhìn thế giới mở
    const skyGeo = prepGeo(new THREE.SphereGeometry(280, 32, 16));
    this._skyMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uColorZenith: { value: new THREE.Color(0x060914) },  // Đỉnh trời đêm thẳm huyền sử
        uColorMid: { value: new THREE.Color(0x18132d) },     // Sắc tím than Cổ Loa
        uColorHorizon: { value: new THREE.Color(0x993318) }, // Hơi ấm hoàng hôn xa xăm
        uColorSea: { value: new THREE.Color(0x12161f) },     // Chuẩn màu #12161f
        uSunDir: { value: new THREE.Vector3(0.0, 0.12, 1.0).normalize() },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        varying vec3 vRayDir;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          vRayDir = normalize(position);
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColorZenith;
        uniform vec3 uColorMid;
        uniform vec3 uColorHorizon;
        uniform vec3 uColorSea;
        uniform vec3 uSunDir;
        varying vec3 vWorldPos;
        varying vec3 vRayDir;

        void main() {
          float h = clamp((vRayDir.y + 0.08) / 0.95, 0.0, 1.0);
          vec3 sky;
          if (h < 0.28) {
            float f = h / 0.28;
            sky = mix(uColorSea, uColorHorizon, f);
          } else {
            float f = (h - 0.28) / 0.72;
            sky = mix(uColorHorizon, mix(uColorMid, uColorZenith, f * 0.85), f);
          }

          float sunGlow = pow(max(dot(vRayDir, uSunDir), 0.0), 24.0);
          sky += vec3(1.0, 0.65, 0.25) * sunGlow * 1.35;

          if (vRayDir.y > 0.35) {
            float starNoise = fract(sin(dot(vRayDir.xz, vec2(12.9898, 78.233))) * 43758.5453);
            if (starNoise > 0.988) {
              float twinkle = sin(uTime * 3.5 + starNoise * 6.28) * 0.5 + 0.5;
              sky += vec3(0.9, 0.95, 1.0) * twinkle * 0.85;
            }
          }

          gl_FragColor = vec4(sky, 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });

    const skyMesh = new THREE.Mesh(skyGeo, this._skyMat);
    skyMesh.name = 'AdvWorld_SkyDome';
    skyMesh.userData.ignoreRaycaster = true;
    this.scene.add(skyMesh);
    this._objects.push(skyMesh);
    this._disposables.push(skyGeo, this._skyMat);

    // Vầng trăng cổ Dạ Sơn mờ ảo chiếu rọi đêm biển (Hazy Ancient Moon)
    const moonGeo = prepGeo(new THREE.SphereGeometry(6.5, 24, 16));
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xfffae6 });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.name = 'AdvWorld_Ancient_Moon';
    moonMesh.position.set(-35.0, 72.0, 115.0);
    moonMesh.userData.ignoreRaycaster = true;
    this.scene.add(moonMesh);
    this._objects.push(moonMesh);
    this._disposables.push(moonGeo, moonMat);

    // Ánh trăng lạnh bàng bạc chiếu rọi thung lũng & vách đá (Zone 2 Cold Moonlight #88aaff)
    const moonLight = new THREE.DirectionalLight(0x88aaff, 1.35);
    moonLight.position.set(-35, 75, 115);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 1024;
    moonLight.shadow.mapSize.height = 1024;
    moonLight.shadow.camera.near = 0.5;
    moonLight.shadow.camera.far = 250;
    moonLight.shadow.camera.left = -60;
    moonLight.shadow.camera.right = 60;
    moonLight.shadow.camera.top = 60;
    moonLight.shadow.camera.bottom = -60;
    moonLight.shadow.bias = -0.0005;
    this.scene.add(moonLight);
    this._lights.push(moonLight);

    // Ánh lửa ấm nồng khu Nội Thành (Zone 1 Warm Amber Torchlight #ff9933)
    const citadelWarmLight = new THREE.PointLight(0xff9933, 2.8, 48, 1.2);
    citadelWarmLight.position.set(0, 8.5, -22);
    this.scene.add(citadelWarmLight);
    this._lights.push(citadelWarmLight);

    const ambTwilight = new THREE.AmbientLight(0x141824, 0.75);
    this.scene.add(ambTwilight);
    this._lights.push(ambTwilight);

    const hemiLight = new THREE.HemisphereLight(0x322442, 0x0a101d, 0.72);
    this.scene.add(hemiLight);
    this._lights.push(hemiLight);

    // ─────────────────────────────────────────────────────────────
    // 2. ĐỊA HÌNH ĐA LỚP 240M X 240M BÁM SÁT getTerrainHeight(x, z)
    // ─────────────────────────────────────────────────────────────
    const terrainSize = 240.0;
    const terrainSegments = 128;
    const terrainGeo = prepGeo(new THREE.PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments));

    const tPositions = terrainGeo.attributes.position;
    const tColors = new Float32Array(tPositions.count * 3);

    const cGrass = new THREE.Color(0x365314);
    const cRedDirt = new THREE.Color(0x9a3412);
    const cStoneRamp = new THREE.Color(0x57534e);
    const cCliffDark = new THREE.Color(0x292524);
    const cMoatMud = new THREE.Color(0x1c1917);
    const cTmp = new THREE.Color();

    for (let i = 0; i < tPositions.count; i++) {
      const gx = tPositions.getX(i);
      const gz = -tPositions.getY(i);
      const gy = getTerrainHeight(gx, gz);
      tPositions.setZ(i, gy);

      if (gz > 52.0 && gy > 1.2) {
        cTmp.copy(cCliffDark);
      } else if (gy < -0.1) {
        cTmp.copy(cMoatMud);
      } else {
        const roadX = Math.sin(gz * 0.08) * 11.0;
        const distRoad = Math.abs(gx - roadX);
        if (distRoad < 4.2 && gz > -25.0 && gz < 52.0) {
          const mixF = distRoad / 4.2;
          cTmp.copy(cRedDirt).lerp(cGrass, mixF * 0.6);
        } else if (gz < -20.0) {
          cTmp.copy(cStoneRamp).lerp(cGrass, 0.35);
        } else {
          cTmp.copy(cGrass);
        }
      }

      tColors[i * 3] = cTmp.r;
      tColors[i * 3 + 1] = cTmp.g;
      tColors[i * 3 + 2] = cTmp.b;
    }

    terrainGeo.setAttribute('color', new THREE.BufferAttribute(tColors, 3));
    prepGeo(terrainGeo);

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.08,
      side: THREE.FrontSide,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.name = 'AdvWorld_MultiLayer_Terrain';
    terrainMesh.rotation.x = -Math.PI / 2;
    terrainMesh.receiveShadow = false;
    terrainMesh.castShadow = false;
    this.scene.add(terrainMesh);
    this._objects.push(terrainMesh);
    this._disposables.push(terrainGeo, terrainMat);

    // Lối mòn đá cuội & đất đỏ uốn lượn ven biển Dạ Sơn
    const pathSegments = 36;
    const pathGeo = prepGeo(new THREE.BufferGeometry());
    const pathPositions = [];
    const pathIndices = [];
    const pathWidth = 3.6;

    for (let p = 0; p <= pathSegments; p++) {
      const pz = -25.0 + (p / pathSegments) * 88.0;
      const px = Math.sin(pz * 0.08) * 11.0;
      const py = getTerrainHeight(px, pz) + 0.08;

      pathPositions.push(px - pathWidth * 0.5, py, pz);
      pathPositions.push(px + pathWidth * 0.5, py, pz);

      if (p < pathSegments) {
        const v = p * 2;
        pathIndices.push(v, v + 1, v + 2);
        pathIndices.push(v + 1, v + 3, v + 2);
      }
    }
    pathGeo.setAttribute('position', new THREE.Float32BufferAttribute(pathPositions, 3));
    pathGeo.setIndex(pathIndices);
    prepGeo(pathGeo);

    const pathMat = new THREE.MeshStandardMaterial({
      color: 0x8a3822,
      roughness: 0.85,
      metalness: 0.08,
    });
    const pathMesh = new THREE.Mesh(pathGeo, pathMat);
    pathMesh.name = 'AdvWorld_CoastalPath_Meandering';
    this.scene.add(pathMesh);
    this._objects.push(pathMesh);
    this._disposables.push(pathGeo, pathMat);

    // ─────────────────────────────────────────────────────────────
    // 3. MẶT NƯỚC 3 HÀO THÀNH CỔ LOA (Water Shader Hào Thành Y = -0.35m)
    // ─────────────────────────────────────────────────────────────
    const moatGroup = new THREE.Group();
    moatGroup.name = 'AdvWorld_Citadel_Moats';
    moatGroup.userData.ignoreRaycaster = true;

    this._moatMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uDeepColor: { value: new THREE.Color(0x042f2e) },
        uSurfaceColor: { value: new THREE.Color(0x0d9488) },
        uFoamColor: { value: new THREE.Color(0xccfbf1) },
      },
      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying float vRipple;
        void main() {
          vUv = uv;
          vec4 wPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = wPos.xyz;
          float distT = length(wPos.xz - vec2(0.0, -65.0));
          float r1 = sin(distT * 1.6 - uTime * 2.2) * 0.08;
          float r2 = cos(atan(wPos.z + 65.0, wPos.x) * 6.0 + uTime * 1.5) * 0.04;
          vec3 pos = position;
          pos.z += (r1 + r2);
          vRipple = r1 + r2;
          gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uDeepColor;
        uniform vec3 uSurfaceColor;
        uniform vec3 uFoamColor;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying float vRipple;
        void main() {
          float normRipple = clamp((vRipple + 0.12) / 0.24, 0.0, 1.0);
          vec3 col = mix(uDeepColor, uSurfaceColor, normRipple);
          float ringDist = abs(vUv.y - 0.5) * 2.0;
          if (ringDist > 0.82) {
            col = mix(col, uFoamColor, (ringDist - 0.82) / 0.18 * 0.45);
          }
          gl_FragColor = vec4(col, 0.85);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this._disposables.push(this._moatMat);

    const moatRadii = [
      { inner: 14.5, outer: 17.5 },
      { inner: 26.0, outer: 30.0 },
      { inner: 39.5, outer: 44.5 },
    ];
    moatRadii.forEach((mr) => {
      const ringGeo = prepGeo(new THREE.RingGeometry(mr.inner, mr.outer, 48));
      const ringMesh = new THREE.Mesh(ringGeo, this._moatMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.set(0, -0.35, -65.0);
      ringMesh.userData.ignoreRaycaster = true;
      moatGroup.add(ringMesh);
      this._disposables.push(ringGeo);
    });

    this.scene.add(moatGroup);
    this._objects.push(moatGroup);

    // ─────────────────────────────────────────────────────────────
    // 4. ĐẠI DƯƠNG BIỂN DẠ SƠN (Custom Ocean Wave Shader Z = 65..120)
    // ─────────────────────────────────────────────────────────────
    const oceanGeo = prepGeo(new THREE.PlaneGeometry(240, 75, 96, 48));
    this._waterMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uDeepColor: { value: new THREE.Color(0x051326) },      // Biển sâu thẳm đêm đen
        uMidColor: { value: new THREE.Color(0x0a3652) },       // Xanh thẫm đại dương
        uCrestColor: { value: new THREE.Color(0x167a84) },     // Xanh ngọc phát quang đỉnh sóng
        uFoamColor: { value: new THREE.Color(0xf0faff) },      // Bọt sóng trắng xóa
        uGoldAuraColor: { value: new THREE.Color(0xffcc33) },  // Hào quang rẽ biển Rùa Vàng
        uTurtlePos: { value: new THREE.Vector3(0.0, 1.6, 88.0) },
      },
      vertexShader: `
        uniform float uTime;
        uniform vec3 uTurtlePos;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying float vWaveHeight;
        varying float vTurtleParting;
        varying float vShoreBreaker;

        void main() {
          vUv = uv;
          vec3 pos = position;
          vec4 wPos = modelMatrix * vec4(pos, 1.0);

          float w1 = sin(wPos.x * 0.16 + uTime * 2.2) * 0.65;
          float w2 = cos(wPos.z * 0.12 + uTime * 1.7) * 0.45;
          float w3 = sin((wPos.x * 0.25 - wPos.z * 0.2) + uTime * 3.0) * 0.3;

          float shoreDist = smoothstep(85.0, 68.0, wPos.z);
          float shoreSurge = shoreDist * (0.85 + sin(uTime * 4.2 + wPos.x * 0.35) * 0.65);

          float distToTurtle = length(wPos.xz - uTurtlePos.xz);
          float turtleParting = smoothstep(16.0, 3.0, distToTurtle);

          float totalWave = (w1 + w2 + w3 + shoreSurge) * (1.0 - turtleParting * 0.65) - turtleParting * 0.95;

          pos.z += totalWave;
          vWaveHeight = totalWave;
          vTurtleParting = turtleParting;
          vShoreBreaker = shoreSurge;

          vec4 finalWorld = modelMatrix * vec4(pos, 1.0);
          vWorldPos = finalWorld.xyz;
          gl_Position = projectionMatrix * viewMatrix * finalWorld;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uDeepColor;
        uniform vec3 uMidColor;
        uniform vec3 uCrestColor;
        uniform vec3 uFoamColor;
        uniform vec3 uGoldAuraColor;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        varying float vWaveHeight;
        varying float vTurtleParting;
        varying float vShoreBreaker;

        void main() {
          float hNorm = clamp((vWaveHeight + 0.9) / 2.4, 0.0, 1.0);
          vec3 water = mix(uDeepColor, uMidColor, hNorm);

          float crest = smoothstep(0.65, 1.15, vWaveHeight + vShoreBreaker * 0.5);
          water = mix(water, uCrestColor, crest * 0.75);

          float foamLine = sin(vWorldPos.x * 2.8 + sin(vWorldPos.z * 2.2) + uTime * 2.6);
          if (foamLine > 0.78 && crest > 0.32) {
            water = mix(water, uFoamColor, 0.85);
          }

          float distToTurtle = length(vWorldPos.xz - vec2(0.0, 88.0));
          float goldenRadiance = exp(-distToTurtle * 0.12) * 1.8;
          water += uGoldAuraColor * goldenRadiance;
          water += uGoldAuraColor * vTurtleParting * 0.65;

          gl_FragColor = vec4(water, 0.92);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true,
    });

    const oceanMesh = new THREE.Mesh(oceanGeo, this._waterMat);
    oceanMesh.name = 'AdvWorld_Ocean_Waves';
    oceanMesh.rotation.x = -Math.PI / 2;
    oceanMesh.position.set(0, 0.0, 102.5);
    oceanMesh.userData.ignoreRaycaster = true;
    this.scene.add(oceanMesh);
    this._objects.push(oceanMesh);
    this._disposables.push(oceanGeo, this._waterMat);

    // ─────────────────────────────────────────────────────────────
    // 5. BA VÙNG CẢM XÚC TRỌNG TÂM SỬ THI ÂU LẠC
    // ─────────────────────────────────────────────────────────────
    this._buildImperialPalaceZone();
    this._buildCitadelWoodenBridges();
    this._buildSouthGateBastionZone();
    this._buildJadeWellCourtyardZone();
    this._buildPhongKheBambooValley();
    this._buildDaSonCliffAndKimQuyZone();
    this._buildAtmosphericEmbersAndSpores();
    this._buildReturnPortal();
    this._buildWebXRTeleportWaypoints();
    this._buildStoryWaypointsAndSteles();
    this._buildRealmColliders();
    this._initSpatialAudio();
    this._syncHitboxManager();

    this._loadRealmKitModels();
  }

  /**
   * PHÂN KHU 1: NỘI THÀNH CỔ LOA & ĐIỆN NGỰ TRIỀU (X=0, Z=-65)
   */
  _buildImperialPalaceZone() {
    const palaceGroup = new THREE.Group();
    palaceGroup.name = 'AdvWorld_Imperial_Pavilion_Hall';
    palaceGroup.userData.canonicalName = 'CoLoa_Citadel_Palace';
    const groundY = getTerrainHeight(0, -65.0);
    palaceGroup.position.set(0, groundY, -65.0);

    const drumMat = new THREE.MeshStandardMaterial({
      color: 0x854d0e,
      roughness: 0.42,
      metalness: 0.78,
    });
    this._disposables.push(drumMat);

    const step1Geo = prepGeo(new THREE.CylinderGeometry(5.2, 5.8, 0.45, 16));
    const step1 = new THREE.Mesh(step1Geo, drumMat);
    step1.name = 'AdvWorld_Citadel_Pedestal_Tier1';
    step1.position.y = 0.225;
    palaceGroup.add(step1);
    this._disposables.push(step1Geo);

    const step2Geo = prepGeo(new THREE.CylinderGeometry(4.2, 4.6, 0.45, 16));
    const step2 = new THREE.Mesh(step2Geo, drumMat);
    step2.position.y = 0.675;
    palaceGroup.add(step2);
    this._disposables.push(step2Geo);

    const topDrumGeo = prepGeo(new THREE.CylinderGeometry(3.2, 3.4, 0.5, 16));
    const topDrum = new THREE.Mesh(topDrumGeo, drumMat);
    topDrum.position.y = 1.15;
    palaceGroup.add(topDrum);
    this._disposables.push(topDrumGeo);

    const columnMat = new THREE.MeshStandardMaterial({ color: 0x3b1e14, roughness: 0.65 });
    this._disposables.push(columnMat);
    const colGeo = prepGeo(new THREE.CylinderGeometry(0.24, 0.26, 6.2, 10));
    this._disposables.push(colGeo);

    for (let c = 0; c < 8; c++) {
      const a = (c / 8) * Math.PI * 2;
      const col = new THREE.Mesh(colGeo, columnMat);
      col.position.set(Math.cos(a) * 6.8, 3.1, Math.sin(a) * 6.8);
      palaceGroup.add(col);
    }

    const roofMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.72 });
    this._disposables.push(roofMat);
    const roofGeo = prepGeo(new THREE.ConeGeometry(9.2, 2.8, 8));
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = 7.6;
    palaceGroup.add(roof);
    this._disposables.push(roofGeo);

    const beamGeo = prepGeo(new THREE.CylinderGeometry(1.2, 4.8, 14.0, 24, 1, true));
    const beamMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xffbe55) },
        uIntensity: { value: 0.22 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewDir = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uIntensity;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          float vertFade = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.65, vUv.y);
          float edgeFade = pow(abs(dot(vNormal, vViewDir)), 1.4);
          float alpha = vertFade * edgeFade * uIntensity;
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const beamMesh = new THREE.Mesh(beamGeo, beamMat);
    beamMesh.name = 'AdvWorld_Atmospheric_AmberBeam';
    beamMesh.position.set(0, 7.5, 0);
    beamMesh.userData.ignoreRaycaster = true;
    palaceGroup.add(beamMesh);
    this._disposables.push(beamGeo, beamMat);

    // Cờ trận Âu Lạc phấp phới hai bên cung điện
    this._buildAuLacBattleFlags(palaceGroup);

    this._imperialGroup = palaceGroup;
    this.scene.add(palaceGroup);
    this._objects.push(palaceGroup);
  }

  /**
   * Cờ trận Âu Lạc hoa văn mặt trời Đông Sơn
   */
  _buildAuLacBattleFlags(parentGroup) {
    const poleGeo = prepGeo(new THREE.CylinderGeometry(0.04, 0.05, 5.2, 8));
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.8 });
    this._disposables.push(poleGeo, poleMat);

    const flagGeo = prepGeo(new THREE.PlaneGeometry(1.4, 2.2, 8, 4));
    const flagMat = new THREE.MeshStandardMaterial({
      color: 0xb91c1c,
      emissive: 0x7f1d1d,
      emissiveIntensity: 0.35,
      roughness: 0.65,
      side: THREE.DoubleSide,
    });
    this._disposables.push(flagGeo, flagMat);

    const flagCoords = [
      [-6.0, 0, -5.0],
      [6.0, 0, -5.0],
    ];

    flagCoords.forEach(([fx, fy, fz], idx) => {
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(fx, 2.6, fz);
      parentGroup.add(pole);

      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.name = `AdvWorld_AuLac_BattleFlag_${idx + 1}`;
      flag.position.set(fx + 0.72, 3.8, fz);
      flag.userData.ignoreRaycaster = true;
      parentGroup.add(flag);
      this._flagMeshes.push(flag);
    });
  }

  /**
   * CẦU GỖ UỐN CONG QUA 3 VÒNG HÀO THÀNH CỔ LOA (South Gate Axis)
   */
  _buildCitadelWoodenBridges() {
    const bridgeGroup = new THREE.Group();
    bridgeGroup.name = 'AdvWorld_Citadel_WoodenBridges';
    bridgeGroup.userData.ignoreRaycaster = true;

    const timberMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.85,
      metalness: 0.08,
    });
    this._disposables.push(timberMat);

    const railMat = new THREE.MeshStandardMaterial({
      color: 0x5c2c16,
      roughness: 0.78,
      metalness: 0.12,
    });
    this._disposables.push(railMat);

    const bridgeLocations = [-49.0, -36.0, -23.0];

    bridgeLocations.forEach((bz, idx) => {
      const singleBridge = new THREE.Group();
      singleBridge.name = `AdvWorld_Citadel_WoodenBridge_${idx + 1}`;
      singleBridge.userData.ignoreRaycaster = true;
      const by = getTerrainHeight(0, bz);
      singleBridge.position.set(0, by, bz);

      const deckGeo = prepGeo(new THREE.BoxGeometry(3.6, 0.22, 6.4));
      const deck = new THREE.Mesh(deckGeo, timberMat);
      deck.position.y = 0.12;
      deck.userData.ignoreRaycaster = true;
      singleBridge.add(deck);
      this._disposables.push(deckGeo);

      const railGeo = prepGeo(new THREE.BoxGeometry(0.16, 0.65, 6.4));
      const railL = new THREE.Mesh(railGeo, railMat);
      railL.position.set(-1.72, 0.52, 0);
      railL.userData.ignoreRaycaster = true;

      const railR = new THREE.Mesh(railGeo, railMat);
      railR.position.set(1.72, 0.52, 0);
      railR.userData.ignoreRaycaster = true;

      singleBridge.add(railL, railR);
      this._disposables.push(railGeo);

      const postGeo = prepGeo(new THREE.CylinderGeometry(0.08, 0.09, 0.95, 8));
      this._disposables.push(postGeo);
      const postPositions = [
        [-1.72, 0.5, -3.0],
        [1.72, 0.5, -3.0],
        [-1.72, 0.5, 3.0],
        [1.72, 0.5, 3.0],
      ];
      postPositions.forEach(([px, py, pz]) => {
        const post = new THREE.Mesh(postGeo, railMat);
        post.position.set(px, py, pz);
        post.userData.ignoreRaycaster = true;
        singleBridge.add(post);
      });

      bridgeGroup.add(singleBridge);
    });

    this.scene.add(bridgeGroup);
    this._objects.push(bridgeGroup);
  }

  /**
   * PHÂN KHU 2: CỔNG NAM THÀNH CỔ LOA & VỌNG LÂU NỎ THẦN (X=0, Z=-22)
   */
  _buildSouthGateBastionZone() {
    const gateGroup = new THREE.Group();
    gateGroup.name = 'AdvWorld_SouthGate_Bastion_NoThan';
    const groundY = getTerrainHeight(0, -22.0);
    gateGroup.position.set(0, groundY, -22.0);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.92 });
    this._disposables.push(stoneMat);

    const pillarGeo = prepGeo(new THREE.BoxGeometry(1.8, 6.5, 2.4));
    this._disposables.push(pillarGeo);
    const pillarL = new THREE.Mesh(pillarGeo, stoneMat);
    pillarL.position.set(-3.0, 3.25, 0);
    const pillarR = new THREE.Mesh(pillarGeo, stoneMat);
    pillarR.position.set(3.0, 3.25, 0);
    gateGroup.add(pillarL, pillarR);

    const archMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.75 });
    this._disposables.push(archMat);
    const archGeo = prepGeo(new THREE.BoxGeometry(8.5, 0.8, 3.2));
    const arch = new THREE.Mesh(archGeo, archMat);
    arch.position.set(0, 6.8, 0);
    gateGroup.add(arch);
    this._disposables.push(archGeo);

    // Án thờ Nỏ Thần Liên Châu phát sáng lẫy vuốt Rùa Vàng
    const altarGeo = prepGeo(new THREE.BoxGeometry(2.4, 0.9, 1.4));
    const altarMat = new THREE.MeshStandardMaterial({ color: 0x3b1e14, roughness: 0.78 });
    const altar = new THREE.Mesh(altarGeo, altarMat);
    altar.position.set(-5.5, 0.45, -1.5);
    gateGroup.add(altar);
    this._disposables.push(altarGeo, altarMat);

    const bowMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      emissive: 0x78350f,
      emissiveIntensity: 0.45,
      metalness: 0.85,
    });
    this._disposables.push(bowMat);
    const bowGeo = prepGeo(new THREE.BoxGeometry(1.6, 0.18, 0.28));
    const bow = new THREE.Mesh(bowGeo, bowMat);
    bow.name = 'AdvWorld_Crossbow_NoThan_Mesh';
    bow.position.set(-5.5, 1.05, -1.5);
    gateGroup.add(bow);
    this._disposables.push(bowGeo);

    // Lẫy vuốt Rùa Vàng phát quang hổ phách thiêng (#ffaa00, intensity 1.6)
    const clawGeo = prepGeo(new THREE.ConeGeometry(0.08, 0.25, 8));
    const clawMat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xffaa00,
      emissiveIntensity: 1.6,
      roughness: 0.2,
      metalness: 0.9,
    });
    const claw = new THREE.Mesh(clawGeo, clawMat);
    claw.position.set(-5.5, 1.18, -1.5);
    claw.rotation.x = Math.PI;
    gateGroup.add(claw);
    this._disposables.push(clawGeo, clawMat);

    const clawLight = new THREE.PointLight(0xffaa00, 1.6, 14, 1.2);
    clawLight.position.set(-5.5, 1.3, -1.5);
    gateGroup.add(clawLight);
    this._lights.push(clawLight);

    // Giàn vũ khí đồng thau Cổ Loa (8 giáo đồng, 120 tên 3 cạnh, 2 rìu gót hài)
    const weaponRack = new THREE.Group();
    weaponRack.name = 'AdvWorld_SouthGate_WeaponRack';
    weaponRack.position.set(-5.5, 0, 0.5);

    const spearGeo = prepGeo(new THREE.CylinderGeometry(0.025, 0.04, 2.4, 8));
    const spearMat = new THREE.MeshStandardMaterial({ color: 0x8a6b32, roughness: 0.45, metalness: 0.80 });
    const instSpears = new THREE.InstancedMesh(spearGeo, spearMat, 8);
    const dummyMat = new THREE.Matrix4();
    for (let s = 0; s < 8; s++) {
      dummyMat.makeTranslation(-0.85 + s * 0.25, 1.2, (s % 2 === 0 ? 0.04 : -0.04));
      instSpears.setMatrixAt(s, dummyMat);
    }
    instSpears.instanceMatrix.needsUpdate = true;
    weaponRack.add(instSpears);
    this._disposables.push(spearGeo, spearMat);

    // 120 mũi tên đồng 3 cạnh Cổ Loa
    const arrowGeo = prepGeo(new THREE.CylinderGeometry(0.008, 0.008, 0.85, 6));
    const arrowMat = new THREE.MeshStandardMaterial({ color: 0x8a6b32, roughness: 0.35, metalness: 0.85 });
    const instArrows = new THREE.InstancedMesh(arrowGeo, arrowMat, 120);
    const aMat = new THREE.Matrix4();
    for (let a = 0; a < 120; a++) {
      const qSide = a < 60 ? -1.05 : 1.05;
      const lIdx = a % 60;
      const row = Math.floor(lIdx / 10);
      const col = lIdx % 10;
      const qx = qSide + (col - 4.5) * 0.02;
      const qz = (row - 2.5) * 0.02;
      const qy = 0.55 + ((a * 7) % 10) * 0.005;
      aMat.makeRotationFromEuler(new THREE.Euler((a % 5 - 2) * 0.03, 0, (a % 7 - 3) * 0.03));
      aMat.setPosition(qx, qy, qz);
      instArrows.setMatrixAt(a, aMat);
    }
    instArrows.instanceMatrix.needsUpdate = true;
    weaponRack.add(instArrows);
    this._disposables.push(arrowGeo, arrowMat);

    // 2 Rìu gót hài Đông Sơn
    const axeMat = new THREE.MeshStandardMaterial({ color: 0x967332, roughness: 0.40, metalness: 0.80 });
    this._disposables.push(axeMat);
    for (const ax of [-0.4, 0.4]) {
      const axeHandleGeo = prepGeo(new THREE.CylinderGeometry(0.02, 0.025, 0.72, 8));
      const axeBladeGeo = prepGeo(new THREE.BoxGeometry(0.22, 0.16, 0.03));
      const handle = new THREE.Mesh(axeHandleGeo, altarMat);
      handle.position.set(ax, 0.9, 0.15);
      const blade = new THREE.Mesh(axeBladeGeo, axeMat);
      blade.position.set(ax + 0.08, 1.15, 0.15);
      blade.rotation.z = -0.2;
      weaponRack.add(handle, blade);
      this._disposables.push(axeHandleGeo, axeBladeGeo);
    }
    gateGroup.add(weaponRack);

    this._southGateGroup = gateGroup;
    this.scene.add(gateGroup);
    this._objects.push(gateGroup);
  }

  /**
   * PHÂN KHU 3: LẦU VỌNG NGUYỆT & GIẾNG NGỌC MỊ CHÂU (X=26, Z=-15)
   */
  _buildJadeWellCourtyardZone() {
    const wellGroup = new THREE.Group();
    wellGroup.name = 'AdvWorld_VongNguyet_JadeWell_Courtyard';
    const groundY = getTerrainHeight(26.0, -15.0);
    wellGroup.position.set(26.0, groundY, -15.0);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x3d4a41, roughness: 0.88, metalness: 0.05 });
    this._disposables.push(stoneMat);

    const wellGeo = prepGeo(new THREE.CylinderGeometry(1.8, 2.1, 0.75, 8));
    const well = new THREE.Mesh(wellGeo, stoneMat);
    well.position.y = 0.375;
    wellGroup.add(well);
    this._disposables.push(wellGeo);

    // Nước giếng trong suốt MeshPhysicalMaterial (transmission 0.88, roughness 0.08, ior 1.33)
    const waterGeo = prepGeo(new THREE.CircleGeometry(1.7, 16));
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x00f5d4,
      emissive: 0x00473b,
      roughness: 0.08,
      metalness: 0.05,
      transmission: 0.88,
      ior: 1.333,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.92,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = 0.45;
    water.userData.ignoreRaycaster = true;
    wellGroup.add(water);
    this._disposables.push(waterGeo, waterMat);

    const bottomLight = new THREE.PointLight(0x00f5d4, 2.8, 8, 1.4);
    bottomLight.position.set(0, 0.15, 0);
    wellGroup.add(bottomLight);
    this._lights.push(bottomLight);

    const pearlGeo = prepGeo(new THREE.SphereGeometry(0.38, 16, 16));
    const pearlMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00f5d4,
      emissiveIntensity: 1.2,
      roughness: 0.12,
      metalness: 0.1,
    });
    const pearl = new THREE.Mesh(pearlGeo, pearlMat);
    pearl.name = 'AdvWorld_Pearl_MinhChau_Mesh';
    pearl.position.set(0, 1.25, 0);
    pearl.userData.ignoreRaycaster = true;
    wellGroup.add(pearl);
    this._disposables.push(pearlGeo, pearlMat);

    const pearlLight = new THREE.PointLight(0x00f5d4, 3.2, 14, 1.2);
    pearlLight.position.set(0, 1.4, 0);
    wellGroup.add(pearlLight);
    this._lights.push(pearlLight);

    this._jadeWellGroup = wellGroup;
    this.scene.add(wellGroup);
    this._objects.push(wellGroup);
  }

  /**
   * PHÂN KHU 4: THUNG LŨNG RỪNG TRÚC PHONG KHÊ & CON ĐƯỜNG LÔNG NGỖNG
   */
  _buildPhongKheBambooValley() {
    const bambooCulmGeo = createBambooCulmGeometry();
    const bambooLeafGeo = createBambooLeafGeometry();

    const bambooStalkMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.62,
      metalness: 0.12,
      side: THREE.FrontSide,
    });
    bambooStalkMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this._windUniform.uTime;
      shader.vertexShader = `
        uniform float uTime;
      ` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        float swayH = clamp(position.y / 7.0, 0.0, 1.0);
        float swayWeight = swayH * swayH;
        float instId = float(gl_InstanceID);
        float sway = sin(uTime * 2.2 + instId * 0.28 + transformed.x * 0.35) * (0.38 * swayWeight);
        float crossSway = cos(uTime * 1.7 + instId * 0.19 + transformed.z * 0.25) * (0.2 * swayWeight);
        transformed.x += sway;
        transformed.z += crossSway;
        `
      );
    };

    const bambooLeafMat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
    });
    bambooLeafMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this._windUniform.uTime;
      shader.vertexShader = `
        uniform float uTime;
      ` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        float instId = float(gl_InstanceID);
        float leafFlutter = sin(uTime * 3.6 + instId * 0.45 + transformed.x * 1.2) * 0.18;
        float sway = sin(uTime * 2.2 + instId * 0.28) * 0.38;
        transformed.x += sway + leafFlutter;
        transformed.y += leafFlutter * 0.5;
        `
      );
    };

    const bambooCount = this._bambooCount; // 180
    const instCulms = new THREE.InstancedMesh(bambooCulmGeo, bambooStalkMat, bambooCount);
    const instFoliage = new THREE.InstancedMesh(bambooLeafGeo, bambooLeafMat, bambooCount);
    instCulms.name = 'AdvWorld_BambooGroves_Culms';
    instFoliage.name = 'AdvWorld_BambooGroves_Foliage';
    instCulms.userData.ignoreRaycaster = true;
    instFoliage.userData.ignoreRaycaster = true;

    for (let i = 0; i < bambooCount; i++) {
      const side = (i % 2 === 0) ? -1 : 1;
      const bz = -22.0 + (i / bambooCount) * 72.0;
      const roadCenterX = Math.sin(bz * 0.08) * 11.0;
      const distFromPath = 4.8 + ((i * 17) % 23) * 0.95;
      const bx = roadCenterX + side * distFromPath;
      const by = getTerrainHeight(bx, bz);

      const scaleH = 0.85 + ((i * 7) % 10) * 0.05;
      const rotY = (i * 0.65) % (Math.PI * 2);
      const tiltX = (Math.sin(i * 1.7) * 0.08);

      this._tmpPos.set(bx, by + (7.0 * scaleH) * 0.5, bz);
      this._tmpRot.set(tiltX, rotY, 0);
      this._tmpQuat.setFromEuler(this._tmpRot);
      this._tmpScale.set(1.0, scaleH, 1.0);
      this._tmpMatrix.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
      instCulms.setMatrixAt(i, this._tmpMatrix);

      this._tmpPos.set(bx, by + 7.0 * scaleH - 0.2, bz);
      this._tmpRot.set(0, rotY + 0.4, 0);
      this._tmpQuat.setFromEuler(this._tmpRot);
      this._tmpScale.set(1.15, 1.15, 1.15);
      this._tmpMatrix.compose(this._tmpPos, this._tmpQuat, this._tmpScale);
      instFoliage.setMatrixAt(i, this._tmpMatrix);
    }

    instCulms.instanceMatrix.needsUpdate = true;
    instFoliage.instanceMatrix.needsUpdate = true;
    this.scene.add(instCulms);
    this.scene.add(instFoliage);
    this._objects.push(instCulms, instFoliage);
    this._disposables.push(bambooCulmGeo, bambooLeafGeo, bambooStalkMat, bambooLeafMat);

    // 2. Hệ thống hạt lông ngỗng bay phát sáng 650 Particles (CanvasTexture 256x256)
    this._featherGeo = prepGeo(new THREE.BufferGeometry());
    this._featherPositions = new Float32Array(this._featherCount * 3);
    this._featherDriftSeeds = new Float32Array(this._featherCount * 3);

    const featherTex = createHighResFeatherTexture();

    for (let f = 0; f < this._featherCount; f++) {
      const pz = -22.0 + (f / this._featherCount) * 85.0;
      const roadX = Math.sin(pz * 0.08) * 11.0;
      const spread = (Math.sin(f * 2.3) * 3.5) + (Math.cos(f * 3.7) * 1.8);
      const px = roadX + spread;
      const baseY = getTerrainHeight(px, pz);
      const py = baseY + 0.35 + ((f * 19) % 30) * 0.08;

      this._featherPositions[f * 3] = px;
      this._featherPositions[f * 3 + 1] = py;
      this._featherPositions[f * 3 + 2] = pz;

      this._featherDriftSeeds[f * 3] = 0.0035 + (f % 5) * 0.0015;
      this._featherDriftSeeds[f * 3 + 1] = 0.85 + (f % 7) * 0.22;
      this._featherDriftSeeds[f * 3 + 2] = (f * 0.45) % Math.PI;
    }

    this._featherGeo.setAttribute('position', new THREE.BufferAttribute(this._featherPositions, 3));

    const featherMatParams = {
      size: 0.35,
      color: 0xffffff,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    };
    if (featherTex) {
      featherMatParams.map = featherTex;
    }

    const featherMat = new THREE.PointsMaterial(featherMatParams);
    const featherPoints = new THREE.Points(this._featherGeo, featherMat);
    featherPoints.name = 'AdvWorld_GooseFeathers_Trail';
    featherPoints.userData.ignoreRaycaster = true;
    this.scene.add(featherPoints);
    this._objects.push(featherPoints);
    this._disposables.push(this._featherGeo, featherMat);
    if (featherTex) this._disposables.push(featherTex);
  }

  /**
   * PHÂN KHU 5: VÁCH ĐÁ DẠ SƠN & THẦN KIM QUY RẼ BIỂN (X=0, Z=62..88)
   */
  _buildDaSonCliffAndKimQuyZone() {
    const cliffGroup = new THREE.Group();
    cliffGroup.name = 'AdvWorld_Coastal_Cliffs';

    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x292524,
      roughness: 0.95,
      metalness: 0.05,
    });
    this._disposables.push(rockMat);

    const buildRock = (bx, by, bz, sx, sy, sz, ry) => {
      const rockGeo = prepGeo(new THREE.DodecahedronGeometry(2.4, 1));
      const pos = rockGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const rx = pos.getX(i);
        const ry2 = pos.getY(i);
        const rz = pos.getZ(i);
        const noise = 1.0 + (Math.sin(rx * 2.8) + Math.cos(rz * 2.5)) * 0.16;
        pos.setXYZ(i, rx * noise, ry2 * noise * 1.2, rz * noise);
      }
      prepGeo(rockGeo);

      const rock = new THREE.Mesh(rockGeo, rockMat);
      rock.position.set(bx, by, bz);
      rock.scale.set(sx, sy, sz);
      rock.rotation.y = ry;
      rock.castShadow = false;
      cliffGroup.add(rock);
      this._disposables.push(rockGeo);
      return rock;
    };

    buildRock(-28.0, 5.2, 60.0, 4.2, 4.8, 3.8, 0.4);
    buildRock(-16.0, 6.4, 64.0, 3.8, 5.2, 3.5, -0.5);
    buildRock(0.0, 6.2, 66.0, 3.2, 4.5, 3.2, 0.2);
    buildRock(18.0, 6.5, 63.0, 4.0, 5.0, 3.6, 0.6);
    buildRock(32.0, 5.0, 58.0, 4.5, 4.2, 4.0, -0.3);

    this._cliffGroup = cliffGroup;
    this.scene.add(cliffGroup);
    this._objects.push(cliffGroup);

    // Tượng Vua An Dương Vương đứng cô đơn trên đỉnh Vách Đá Dạ Sơn nhìn ra biển
    const groundY = getTerrainHeight(0, 64.0);
    this._loadKingStatue(cliffGroup, groundY);

    // Spotlight Chiaroscuro chiếu rọi bóng hình Vua An Dương Vương nơi đầu sóng ngọn gió
    const kingCliffSpot = new THREE.SpotLight(0xffecd2, 16.0, 35.0, Math.PI / 5, 0.72, 1.2);
    kingCliffSpot.position.set(-6.0, groundY + 12.0, 56.0);
    kingCliffSpot.target.position.set(0, groundY + 1.8, 64.0);
    kingCliffSpot.castShadow = true;
    kingCliffSpot.shadow.mapSize.width = 1024;
    kingCliffSpot.shadow.mapSize.height = 1024;
    kingCliffSpot.shadow.bias = -0.0005;
    cliffGroup.add(kingCliffSpot);
    cliffGroup.add(kingCliffSpot.target);
    this._lights.push(kingCliffSpot);

    // Tượng Thần Kim Quy uy nghiêm nổi trên sóng nước (X=0, Z=88)
    this._turtleRoot = new THREE.Group();
    this._turtleRoot.name = 'KimQuy_Golden_Turtle';
    this._turtleBaseY = 1.6;
    this._turtleRoot.position.set(0, this._turtleBaseY, 88.0);
    this._turtleRoot.rotation.y = 0;

    this._buildProceduralGoldenTurtle(this._turtleRoot);

    // Vòm hào quang vàng kim bao quanh Thần Kim Quy
    const auraGeo = prepGeo(new THREE.SphereGeometry(7.8, 24, 16));
    this._auraMat = new THREE.ShaderMaterial({
      uniforms: {
        uPulse: { value: 1.0 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewDir = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform float uPulse;
        varying vec3 vNormal;
        varying vec3 vViewDir;
        void main() {
          float rim = 1.0 - abs(dot(vNormal, vViewDir));
          float glow = pow(rim, 2.2) * uPulse;
          vec3 gold = vec3(1.0, 0.84, 0.22);
          gl_FragColor = vec4(gold, glow * 0.72);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const auraMesh = new THREE.Mesh(auraGeo, this._auraMat);
    auraMesh.name = 'AdvWorld_KimQuy_Aura';
    auraMesh.userData.ignoreRaycaster = true;
    this._turtleRoot.add(auraMesh);
    this._disposables.push(auraGeo, this._auraMat);

    // Cột sáng vàng kim rọi thẳng lên trời (Radiant Golden Pillar of Light)
    const pillarGeo = prepGeo(new THREE.CylinderGeometry(2.4, 5.5, 45.0, 16, 1, true));
    const pillarMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0xffcc33) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          float fade = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.35, vUv.y);
          gl_FragColor = vec4(uColor, fade * 0.38);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
    pillarMesh.name = 'AdvWorld_KimQuy_GoldenPillar';
    pillarMesh.position.set(0, 22.0, 0);
    pillarMesh.userData.ignoreRaycaster = true;
    this._turtleRoot.add(pillarMesh);
    this._disposables.push(pillarGeo, pillarMat);

    const turtleLight = new THREE.PointLight(0xffb703, 4.2, 55, 1.2);
    turtleLight.position.set(0, 3.8, 0);
    turtleLight.castShadow = false;
    this._turtleRoot.add(turtleLight);
    this._lights.push(turtleLight);

    this._mistGroup = new THREE.Group();
    this._mistGroup.name = 'AdvWorld_KimQuy_GoldenMist';
    this._mistGroup.userData.ignoreRaycaster = true;

    const mistCount = 350;
    const mistGeo = prepGeo(new THREE.BufferGeometry());
    const mistPositions = new Float32Array(mistCount * 3);
    for (let m = 0; m < mistCount; m++) {
      const radius = 2.4 + Math.random() * 8.5;
      const angle = Math.random() * Math.PI * 2;
      const my = 0.2 + Math.random() * 4.8;
      mistPositions[m * 3] = Math.cos(angle) * radius;
      mistPositions[m * 3 + 1] = my;
      mistPositions[m * 3 + 2] = Math.sin(angle) * radius;
    }
    mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPositions, 3));

    const mistMat = new THREE.PointsMaterial({
      size: 0.42,
      color: 0xffd166,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mistPoints = new THREE.Points(mistGeo, mistMat);
    mistPoints.userData.ignoreRaycaster = true;
    this._mistGroup.add(mistPoints);
    this._disposables.push(mistGeo, mistMat);

    this._turtleRoot.add(this._mistGroup);
    this.scene.add(this._turtleRoot);
    this._objects.push(this._turtleRoot);
  }

  /**
   * Nạp tượng Vua An Dương Vương 4.2m chuẩn tỷ lệ di sản
   */
  async _loadKingStatue(parentGroup, contactY) {
    const baseUrls = ['/model/amduongvuong.glb', '/models/amduongvuong.glb'];
    const urls = typeof expandGlbFallbackUrls === 'function' ? expandGlbFallbackUrls('/model/amduongvuong.glb') : baseUrls;
    try {
      if (typeof window === 'undefined') return;
      const loader = getSharedGltfLoader ? getSharedGltfLoader() : new GLTFLoader();
      const gltf = await new Promise((resolve, reject) => {
        let idx = 0;
        const tryNext = () => {
          if (idx >= urls.length) {
            reject(new Error('No amduongvuong.glb found'));
            return;
          }
          loader.load(urls[idx++], resolve, undefined, () => tryNext());
        };
        tryNext();
      });

      if (!gltf || !gltf.scene) return;

      const statue = prepareUnlitVividGlbModel(gltf.scene, {
        targetSpan: 4.2,
        fitAxis: 'y',
        materialMode: 'pbr',
        groundY: true,
        centerXZ: true,
        castShadow: true,
        receiveShadow: true,
      });
      statue.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      statue.name = 'AdvWorld_King_Statue_Mesh';
      statue.position.set(0, contactY, 64.0);
      statue.rotation.y = 0;
      parentGroup.add(statue);
      this._disposables.push(statue);
    } catch (_) {
      const fbGroup = new THREE.Group();
      fbGroup.name = 'AdvWorld_King_Fallback_Mesh';
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.45, metalness: 0.65 });
      this._disposables.push(bodyMat);

      const bodyGeo = prepGeo(new THREE.CylinderGeometry(0.55, 0.75, 3.6, 12));
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.name = 'AdvWorld_King_Statue_Mesh';
      body.position.set(0, contactY + 1.8, 64.0);
      body.castShadow = true;
      body.receiveShadow = true;
      fbGroup.add(body);
      this._disposables.push(bodyGeo);

      parentGroup.add(fbGroup);
    }
  }

  /**
   * Dựng Thần Kim Quy uy nghiêm phong cách đồng cổ Đông Sơn
   */
  _buildProceduralGoldenTurtle(parentGroup) {
    const turtleMeshGroup = new THREE.Group();
    turtleMeshGroup.name = 'KimQuy_Sculpted_Mesh';

    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffc400,
      roughness: 0.32,
      metalness: 0.85,
      emissive: 0x4a3000,
      emissiveIntensity: 0.35,
    });
    this._disposables.push(goldMat);

    const shellGeo = prepGeo(new THREE.CylinderGeometry(2.4, 2.9, 1.1, 16));
    const sPos = shellGeo.attributes.position;
    for (let i = 0; i < sPos.count; i++) {
      const sx = sPos.getX(i);
      const sy = sPos.getY(i);
      const sz = sPos.getZ(i);
      const distCenter = Math.sqrt(sx * sx + sz * sz);
      const domeLift = Math.max(0.0, 1.0 - distCenter / 2.9) * 0.75;
      sPos.setY(i, sy + domeLift);
    }
    prepGeo(shellGeo);
    const shell = new THREE.Mesh(shellGeo, goldMat);
    shell.name = 'AdvWorld_Turtle_KimQuy_Carapace';
    shell.position.set(0, 0.55, 0);
    turtleMeshGroup.add(shell);
    this._disposables.push(shellGeo);

    const plastronGeo = prepGeo(new THREE.CylinderGeometry(2.2, 2.4, 0.35, 16));
    const plastron = new THREE.Mesh(plastronGeo, goldMat);
    plastron.position.set(0, -0.18, 0);
    turtleMeshGroup.add(plastron);
    this._disposables.push(plastronGeo);

    const neckGeo = prepGeo(new THREE.CylinderGeometry(0.52, 0.7, 2.0, 12));
    const neck = new THREE.Mesh(neckGeo, goldMat);
    neck.position.set(0, 1.1, -2.3);
    neck.rotation.x = -Math.PI / 4;
    turtleMeshGroup.add(neck);
    this._disposables.push(neckGeo);

    const headGeo = prepGeo(new THREE.DodecahedronGeometry(0.85, 1));
    const head = new THREE.Mesh(headGeo, goldMat);
    head.position.set(0, 1.85, -3.4);
    head.scale.set(1.0, 0.85, 1.4);
    turtleMeshGroup.add(head);
    this._disposables.push(headGeo);

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffea00 });
    const eyeGeo = prepGeo(new THREE.SphereGeometry(0.14, 8, 8));
    const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
    eyeL.position.set(-0.5, 1.95, -3.5);
    const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
    eyeR.position.set(0.5, 1.95, -3.5);
    turtleMeshGroup.add(eyeL, eyeR);
    this._disposables.push(eyeGeo, eyeMat);

    const flipperGeo = prepGeo(new THREE.BoxGeometry(1.0, 0.25, 2.0));
    const flipperFL = new THREE.Mesh(flipperGeo, goldMat);
    flipperFL.position.set(-2.6, 0.1, -1.4);
    flipperFL.rotation.set(0.1, 0.7, -0.2);

    const flipperFR = new THREE.Mesh(flipperGeo, goldMat);
    flipperFR.position.set(2.6, 0.1, -1.4);
    flipperFR.rotation.set(0.1, -0.7, 0.2);

    const flipperBL = new THREE.Mesh(flipperGeo, goldMat);
    flipperBL.position.set(-2.4, 0.05, 1.8);
    flipperBL.rotation.set(-0.1, 1.1, -0.2);

    const flipperBR = new THREE.Mesh(flipperGeo, goldMat);
    flipperBR.position.set(2.4, 0.05, 1.8);
    flipperBR.rotation.set(-0.1, -1.1, 0.2);

    turtleMeshGroup.add(flipperFL, flipperFR, flipperBL, flipperBR);
    this._disposables.push(flipperGeo);

    parentGroup.add(turtleMeshGroup);
  }

  /**
   * Nạp 6 cấu kiện Modular Kit từ coloa_realm_kit.glb (nếu có)
   */
  async _loadRealmKitModels() {
    if (typeof window === 'undefined') return;
    const urls = ['/model/coloa_realm_kit.glb', '/models/coloa_realm_kit.glb', '/model/coloa_kit.glb', '/models/coloa_kit.glb'];
    try {
      const loader = getSharedGltfLoader ? getSharedGltfLoader() : new GLTFLoader();
      const gltf = await new Promise((resolve, reject) => {
        let idx = 0;
        const tryNext = () => {
          if (idx >= urls.length) {
            reject(new Error('No realm kit glb found'));
            return;
          }
          loader.load(urls[idx++], resolve, undefined, () => tryNext());
        };
        tryNext();
      });

      if (!gltf || !gltf.scene) return;
      const kit = gltf.scene;

      const hall = kit.getObjectByName('Imperial_Pavilion_Hall');
      if (hall && this._imperialGroup) {
        const cloned = hall.clone(true);
        const prepped = prepareUnlitVividGlbModel(cloned, { targetSpan: 16.0, materialMode: 'pbr', groundY: true, centerXZ: true });
        prepped.name = 'AdvWorld_Imperial_Hall_GLB';
        this._imperialGroup.add(prepped);
        this._disposables.push(prepped);
      }

      const gate = kit.getObjectByName('SouthGate_Bastion_NoThan');
      if (gate && this._southGateGroup) {
        const cloned = gate.clone(true);
        const prepped = prepareUnlitVividGlbModel(cloned, { targetSpan: 11.0, materialMode: 'pbr', groundY: true, centerXZ: true });
        prepped.name = 'AdvWorld_SouthGate_GLB';
        this._southGateGroup.add(prepped);
        this._disposables.push(prepped);
      }

      const well = kit.getObjectByName('VongNguyet_JadeWell_Courtyard');
      if (well && this._jadeWellGroup) {
        const cloned = well.clone(true);
        const prepped = prepareUnlitVividGlbModel(cloned, { targetSpan: 8.5, materialMode: 'pbr', groundY: true, centerXZ: true });
        prepped.name = 'AdvWorld_JadeWell_GLB';
        this._jadeWellGroup.add(prepped);
        this._disposables.push(prepped);
      }

      const bridge = kit.getObjectByName('Arch_Wooden_Bridge');
      if (bridge) {
        const bridgePositions = [-49.0, -36.0, -23.0];
        bridgePositions.forEach((bz, idx) => {
          const cloned = bridge.clone(true);
          const by = getTerrainHeight(0, bz);
          const prepped = prepareUnlitVividGlbModel(cloned, { targetSpan: 9.5, materialMode: 'pbr', groundY: true, centerXZ: true });
          prepped.name = `AdvWorld_Bridge_${idx + 1}_GLB`;
          prepped.position.set(0, by, bz);
          this.scene.add(prepped);
          this._objects.push(prepped);
          this._disposables.push(prepped);
        });
      }

      const cliffTurtle = kit.getObjectByName('DaSon_Cliff_And_KimQuy');
      if (cliffTurtle && this._turtleRoot) {
        const cloned = cliffTurtle.clone(true);
        const prepped = prepareUnlitVividGlbModel(cloned, { targetSpan: 6.2, materialMode: 'pbr', groundY: true, centerXZ: true });
        prepped.name = 'AdvWorld_DaSon_Cliff_KimQuy_GLB';
        this._turtleRoot.add(prepped);
        this._disposables.push(prepped);
      }
    } catch (_) {}
  }

  /**
   * TÀN LỬA VÀNG LINH THIÊNG & BÀO TỬ PHÁT QUANG (Atmospheric Golden Embers & Spores)
   * Phân bổ quanh Cổng Nam Thành Cổ Loa và Vách đá Dạ Sơn hướng biển khơi
   */
  _buildAtmosphericEmbersAndSpores() {
    const emberCount = 200;
    const emberPositions = new Float32Array(emberCount * 3);
    const emberPhases = new Float32Array(emberCount);
    const emberScales = new Float32Array(emberCount);

    for (let i = 0; i < emberCount; i++) {
      let ex, ez, ey;
      if (i < emberCount / 2) {
        // Cụm 1: Quanh Cổng Nam Cổ Loa & Đồn Lũy (Z around -22, X in [-18, 18])
        ex = (Math.random() - 0.5) * 36.0;
        ez = -22.0 + (Math.random() - 0.5) * 24.0;
        ey = getTerrainHeight(ex, ez) + 0.35 + Math.random() * 1.5;
      } else {
        // Cụm 2: Quanh Vách đá Dạ Sơn & Thần Kim Quy (Z in [50, 78], X in [-28, 28])
        ex = (Math.random() - 0.5) * 56.0;
        ez = 50.0 + Math.random() * 28.0;
        ey = getTerrainHeight(ex, ez) + 0.5 + Math.random() * 2.0;
      }

      emberPositions[i * 3] = ex;
      emberPositions[i * 3 + 1] = ey;
      emberPositions[i * 3 + 2] = ez;
      emberPhases[i] = Math.random() * 10.0;
      emberScales[i] = 0.6 + Math.random() * 0.8;
    }

    const emberGeo = prepGeo(new THREE.BufferGeometry());
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));
    emberGeo.setAttribute('aPhase', new THREE.BufferAttribute(emberPhases, 1));
    emberGeo.setAttribute('aScale', new THREE.BufferAttribute(emberScales, 1));

    const pixelRatio = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    this._emberMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0.0 },
        uPixelRatio: { value: pixelRatio }
      },
      vertexShader: `
        attribute float aPhase;
        attribute float aScale;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vLife;

        void main() {
          float life = fract((uTime * 0.18) + aPhase * 0.12);
          vLife = life;
          vec3 p = position;
          p.y += life * 8.5;
          p.x += sin(uTime * 1.1 + aPhase * 6.28) * 0.75;
          p.z += cos(uTime * 0.85 + aPhase * 4.15) * 0.65;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = clamp((18.0 * aScale * uPixelRatio) / max(-mv.z, 1.0), 2.0, 14.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        varying float vLife;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float soft = 1.0 - smoothstep(0.12, 0.5, d);
          float alpha = soft * sin(vLife * 3.14159) * 0.90;
          vec3 col = mix(vec3(1.0, 0.75, 0.18), vec3(1.0, 0.38, 0.05), vLife * 0.65);
          gl_FragColor = vec4(col, alpha);
        }
      `
    });

    const emberPoints = new THREE.Points(emberGeo, this._emberMat);
    emberPoints.name = 'AdvWorld_Sacred_Embers_Points';
    emberPoints.userData.ignoreRaycaster = true;
    emberPoints.frustumCulled = false;

    this.scene.add(emberPoints);
    this._objects.push(emberPoints);
    this._disposables.push(emberGeo, this._emberMat);
  }

  /**
   * ÂM THANH TƯƠNG TÁC THỜI GIAN THỰC (Interactive Spatial Feedback Audio)
   * Tổng hợp âm thanh chuông đồng cổ, rền sóng Kim Quy, bật dây nỏ thần
   */
  playInteractiveSound(kind = 'bronze_drum') {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtxClass) return;
      if (!this._interactiveAudioCtx) {
        this._interactiveAudioCtx = new AudioCtxClass();
      }
      const ctx = this._interactiveAudioCtx;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;
      if (kind === 'stele_chime' || kind === 'golden_bell') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.08); // A5
        osc.frequency.exponentialRampToValueAtTime(293.66, now + 1.2);
        gain.gain.setValueAtTime(0.32, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.25);
      } else if (kind === 'kim_quy_roar' || kind === 'ocean_surge') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(75.0, now);
        osc.frequency.exponentialRampToValueAtTime(110.0, now + 0.15);
        osc.frequency.exponentialRampToValueAtTime(45.0, now + 1.5);
        gain.gain.setValueAtTime(0.40, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.5);
      } else if (kind === 'crossbow_string') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320.0, now);
        osc.frequency.exponentialRampToValueAtTime(60.0, now + 0.28);
        gain.gain.setValueAtTime(0.28, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.30);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.30);
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(130.0, now);
        osc.frequency.exponentialRampToValueAtTime(55.0, now + 0.85);
        gain.gain.setValueAtTime(0.42, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.9);
      }
    } catch (_) {}
  }

  /**
   * CỔNG DỊCH CHUYỂN 2 CHIỀU VÒNG XOÁY VORTEX (Hồi quy về Đại Sảnh Bảo Tàng / Cuốn Sách Thiên Thư)
   * Kèm Kích Hoạt Kép: Click Raycaster Proxy & Proximity Trigger (< 2.2m)
   */
  _buildReturnPortal() {
    const portalGroup = new THREE.Group();
    portalGroup.name = 'Interactive_CoLoa_Return_Portal';
    portalGroup.userData.canonicalName = 'CoLoa_Return_Portal';
    const groundY = getTerrainHeight(0, -5.0);
    this._portalPosition.set(0, groundY, -5.0);
    portalGroup.position.copy(this._portalPosition);

    const pedGeo = prepGeo(new THREE.CylinderGeometry(0.95, 1.25, 0.65, 16));
    const pedMat = new THREE.MeshStandardMaterial({
      color: 0x3b1e14,
      roughness: 0.75,
      metalness: 0.15,
    });
    const ped = new THREE.Mesh(pedGeo, pedMat);
    ped.position.y = 0.325;
    ped.receiveShadow = false;
    ped.castShadow = false;
    portalGroup.add(ped);
    this._disposables.push(pedGeo, pedMat);

    // Cuốn Sách Thiên Thư - Cổng Hồi Quy Về Đại Sảnh Bảo Tàng
    const bookGeo = prepGeo(new THREE.BoxGeometry(0.72, 0.14, 0.52));
    const bookMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: new THREE.Color(0x00f5d4),
      emissiveIntensity: 0.85,
      roughness: 0.22,
      metalness: 0.35,
    });
    const book = new THREE.Mesh(bookGeo, bookMat);
    book.name = 'Interactive_AnDuongVuong_Teleport_Book';
    book.position.set(0, 0.72, 0);
    book.rotation.x = -Math.PI / 6;
    book.userData.isReturnPortal = true;
    book.userData.interactive = true;
    book.userData.teleportTarget = 'museum';
    book.userData.onActivate = () => this._triggerExitRealm();
    book.userData.onClick = () => this._triggerExitRealm();
    portalGroup.add(book);
    this._portalBook = book;
    this._disposables.push(bookGeo, bookMat);

    // Click Proxy Mesh cho toàn bộ cụm cổng hồi quy
    const clickProxyGeo = prepGeo(new THREE.BoxGeometry(2.4, 3.4, 2.0));
    const clickProxyMat = new THREE.MeshBasicMaterial({ visible: false, wireframe: false });
    const clickProxy = new THREE.Mesh(clickProxyGeo, clickProxyMat);
    clickProxy.name = 'AdvWorld_Return_Portal_ClickProxy';
    clickProxy.position.set(0, 1.7, 0);
    clickProxy.userData = {
      type: 'portal',
      action: 'exitRealm',
      realmId: 'museum',
      title: 'Trở Về Phòng Trưng Bày An Dương Vương',
      isClickProxy: true,
      isReturnPortal: true,
      isTeleportBook: true,
      interactive: true,
      onActivate: () => this._triggerExitRealm(),
      onClick: () => this._triggerExitRealm()
    };
    portalGroup.add(clickProxy);
    this._disposables.push(clickProxyGeo, clickProxyMat);

    // Swirling Vortex Curtain Shader (Ngọc bích #00f5d4 & Vàng kim #ffd700)
    const vortexGeo = prepGeo(new THREE.PlaneGeometry(3.2, 4.2, 1, 1));
    this._portalVortexMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uColorInner: { value: new THREE.Color(0xffd700) },
        uColorOuter: { value: new THREE.Color(0x00f5d4) },
        uIntensity: { value: 0.95 },
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
        uniform vec3 uColorInner;
        uniform vec3 uColorOuter;
        uniform float uIntensity;
        varying vec2 vUv;

        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float r = length(p);
          float a = atan(p.y, p.x);

          float swirl = sin(r * 12.0 - uTime * 2.8 + a * 3.0) * 0.5 + 0.5;
          float rays = pow(abs(cos(a * 6.0 + uTime * 0.45)), 4.0) * smoothstep(0.95, 0.15, r);
          float core = exp(-r * 2.8);

          float ellipseMask = 1.0 - smoothstep(0.68, 0.98, length(vec2(p.x * 1.15, p.y * 0.88)));

          vec3 col = mix(uColorOuter, uColorInner, clamp(swirl * 0.72 + rays * 0.35, 0.0, 1.0));
          col = mix(col, vec3(1.0, 1.0, 0.95), core * 0.82);

          float alpha = ellipseMask * clamp(0.38 + core * 0.58 + swirl * 0.22, 0.0, 0.92) * uIntensity;
          gl_FragColor = vec4(col, alpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const vortexMesh = new THREE.Mesh(vortexGeo, this._portalVortexMat);
    vortexMesh.name = 'CoLoa_Portal_Vortex_Mesh';
    vortexMesh.position.set(0, 2.2, -0.45);
    vortexMesh.userData.ignoreRaycaster = true;
    portalGroup.add(vortexMesh);
    this._disposables.push(vortexGeo, this._portalVortexMat);

    const haloGeo = prepGeo(new THREE.RingGeometry(1.6, 2.2, 32));
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x00f5d4,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const floorHalo = new THREE.Mesh(haloGeo, haloMat);
    floorHalo.name = 'AdvWorld_Portal_Floor_Halo';
    floorHalo.rotation.x = -Math.PI / 2;
    floorHalo.position.set(0, 0.04, 0);
    floorHalo.userData.ignoreRaycaster = true;
    portalGroup.add(floorHalo);
    this._disposables.push(haloGeo, haloMat);

    const portalLight = new THREE.PointLight(0x00f5d4, 2.5, 12, 1.2);
    portalLight.position.set(0, 1.4, 0);
    portalGroup.add(portalLight);
    this._lights.push(portalLight);

    this.scene.add(portalGroup);
    this._objects.push(portalGroup);
  }

  /**
   * Kích hoạt thoát cõi trở về phòng trưng bày bảo tàng an toàn
   */
  _triggerExitRealm() {
    if (this._isTransitioningPortal) return;
    this._isTransitioningPortal = true;
    try {
      if (typeof window !== 'undefined') {
        if (typeof window.exitRealm === 'function') {
          window.exitRealm();
        } else if (window.__anDuongVuongRoom?.exitRealm) {
          window.__anDuongVuongRoom.exitRealm();
        }
      }
    } catch (err) {
      console.warn('[AnDuongVuongWorld] exitRealm warning:', err);
    }
  }

  /**
   * ĐIỂM ĐÁP WEBXR TELEPORT WAYPOINTS & VÒNG TRÒN HÀO QUANG ĐÍCH ĐẾN
   */
  _buildWebXRTeleportWaypoints() {
    const waypointsGroup = new THREE.Group();
    waypointsGroup.name = 'AdvWorld_WebXR_Teleport_Waypoints';

    const waypoints = [
      { id: 'arrival', name: 'AdvWorld_Waypoint_Citadel_Arrival', x: 0, z: -5.0, label: 'Cổng Hồi Quy Đại Sảnh' },
      { id: 'south_gate', name: 'AdvWorld_Waypoint_SouthGate_Crossbow', x: -4.5, z: -22.0, label: 'Pháo Đài Nỏ Thần' },
      { id: 'jade_well', name: 'AdvWorld_Waypoint_JadeWell_Courtyard', x: 24.0, z: -15.0, label: 'Giếng Ngọc Mỵ Châu' },
      { id: 'bamboo_valley', name: 'AdvWorld_Waypoint_Bamboo_Path', x: 6.0, z: 30.0, label: 'Thung Lũng Rừng Trúc' },
      { id: 'dason_cliff', name: 'AdvWorld_Waypoint_DaSon_Cliff_Observation', x: 0.0, z: 64.0, label: 'Đỉnh Vách Đá Dạ Sơn' },
    ];

    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f5d4,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this._disposables.push(ringMat);

    const goldRingMat = new THREE.MeshBasicMaterial({
      color: 0xffd166,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this._disposables.push(goldRingMat);

    const outerGeo = prepGeo(new THREE.RingGeometry(1.2, 1.45, 32));
    const innerGeo = prepGeo(new THREE.RingGeometry(0.4, 0.65, 24));
    this._disposables.push(outerGeo, innerGeo);

    const beaconGeo = prepGeo(new THREE.CylinderGeometry(0.35, 1.2, 2.5, 16, 1, true));
    const beaconMat = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(0x00f5d4) },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        varying vec2 vUv;
        void main() {
          float fade = smoothstep(0.0, 0.2, vUv.y) * smoothstep(1.0, 0.4, vUv.y);
          gl_FragColor = vec4(uColor, fade * 0.25);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this._disposables.push(beaconGeo, beaconMat);

    waypoints.forEach((wp) => {
      const gy = getTerrainHeight(wp.x, wp.z);
      const wpGroup = new THREE.Group();
      wpGroup.name = wp.name;
      wpGroup.position.set(wp.x, gy + 0.04, wp.z);
      wpGroup.userData.isTeleportAnchor = true;
      wpGroup.userData.walkable = true;
      wpGroup.userData.waypointId = wp.id;
      wpGroup.userData.waypointLabel = wp.label;

      const outerRing = new THREE.Mesh(outerGeo, ringMat);
      outerRing.rotation.x = -Math.PI / 2;
      outerRing.userData.isTeleportAnchor = true;
      outerRing.userData.walkable = true;
      wpGroup.add(outerRing);

      const innerRing = new THREE.Mesh(innerGeo, goldRingMat);
      innerRing.rotation.x = -Math.PI / 2;
      innerRing.userData.isTeleportAnchor = true;
      innerRing.userData.walkable = true;
      wpGroup.add(innerRing);

      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.y = 1.25;
      beacon.userData.ignoreRaycaster = true;
      wpGroup.add(beacon);

      waypointsGroup.add(wpGroup);
    });

    this.scene.add(waypointsGroup);
    this._objects.push(waypointsGroup);
  }

  /**
   * 4 ĐIỂM DỪNG THUYẾT MINH HUYỀN TÍCH (Bia Đá Cổ Tương Tác Kèm Thẻ Lore)
   * 1. Bí mật Loa Thành & Nỏ Thần
   * 2. Vết lông ngỗng trắng trong đêm chạy giặc
   * 3. Lời phán của Thần Kim Quy trên biển Dạ Sơn
   * 4. Ngọc trai giếng nước ngàn năm
   */
  _buildStoryWaypointsAndSteles() {
    const stelesGroup = new THREE.Group();
    stelesGroup.name = 'AdvWorld_Story_Steles_Group';

    const steleConfigs = [
      {
        id: 'stele_1',
        name: 'AdvWorld_Stele_CoLoa_NoThan',
        x: -5.8,
        z: -19.5,
        loreKey: 'magic_crossbow',
        title: 'Bí Mật Loa Thành & Nỏ Thần',
      },
      {
        id: 'stele_2',
        name: 'AdvWorld_Stele_DuongLongNgong',
        x: 6.8,
        z: 26.0,
        loreKey: 'goose_feather_well',
        title: 'Vết Lông Ngỗng Trắng Trong Đêm Chạy Giặc',
      },
      {
        id: 'stele_3',
        name: 'AdvWorld_Stele_DaSon_KimQuy',
        x: 4.8,
        z: 63.5,
        loreKey: 'kim_quy_lake',
        title: 'Lời Phán Của Thần Kim Quy Trên Biển Dạ Sơn',
      },
      {
        id: 'stele_4',
        name: 'AdvWorld_Stele_GiengNgoc',
        x: 28.5,
        z: -13.0,
        loreKey: 'goose_feather_well',
        title: 'Ngọc Trai Giếng Nước Ngàn Năm',
      },
    ];

    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.85,
      metalness: 0.12,
    });
    this._disposables.push(stoneMat);

    const bronzePlateMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      emissive: 0x78350f,
      emissiveIntensity: 0.42,
      roughness: 0.35,
      metalness: 0.82,
    });
    this._disposables.push(bronzePlateMat);

    const steleBodyGeo = prepGeo(new THREE.BoxGeometry(0.75, 1.65, 0.32));
    const steleBaseGeo = prepGeo(new THREE.BoxGeometry(1.15, 0.35, 0.65));
    const stelePlateGeo = prepGeo(new THREE.BoxGeometry(0.55, 0.85, 0.05));
    this._disposables.push(steleBodyGeo, steleBaseGeo, stelePlateGeo);

    steleConfigs.forEach((cfg) => {
      const gy = getTerrainHeight(cfg.x, cfg.z);
      const singleStele = new THREE.Group();
      singleStele.name = cfg.name;
      singleStele.position.set(cfg.x, gy, cfg.z);

      const baseMesh = new THREE.Mesh(steleBaseGeo, stoneMat);
      baseMesh.position.y = 0.175;
      singleStele.add(baseMesh);

      const bodyMesh = new THREE.Mesh(steleBodyGeo, stoneMat);
      bodyMesh.position.y = 1.15;
      singleStele.add(bodyMesh);

      const plateMesh = new THREE.Mesh(stelePlateGeo, bronzePlateMat);
      plateMesh.position.set(0, 1.15, 0.18);
      singleStele.add(plateMesh);

      // Ánh sáng vàng dịu phát quang từ bia đá cổ huyền tích
      const steleGlowLight = new THREE.PointLight(0xffbe55, 1.2, 5.0, 1.5);
      steleGlowLight.position.set(0, 1.4, 0.3);
      steleGlowLight.userData.ignoreRaycaster = true;
      singleStele.add(steleGlowLight);
      this._lights.push(steleGlowLight);

      // Click Proxy tương tác mở thẻ Lore Card
      const proxyGeo = prepGeo(new THREE.BoxGeometry(1.2, 2.0, 1.0));
      const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
      const proxyMesh = new THREE.Mesh(proxyGeo, proxyMat);
      proxyMesh.position.set(0, 1.0, 0);
      proxyMesh.userData = {
        type: 'lore_stele',
        interactive: true,
        isClickProxy: true,
        loreKey: cfg.loreKey,
        title: cfg.title,
        onActivate: () => {
          this.playInteractiveSound('stele_chime');
          if (typeof window !== 'undefined') {
            if (typeof window.showAnDuongVuongLoreCard === 'function') {
              window.showAnDuongVuongLoreCard(cfg.loreKey);
            } else if (window.__anDuongVuongRoom?.showLore) {
              window.__anDuongVuongRoom.showLore(cfg.loreKey);
            }
          }
        },
        onClick: () => {
          this.playInteractiveSound('stele_chime');
          if (typeof window !== 'undefined') {
            if (typeof window.showAnDuongVuongLoreCard === 'function') {
              window.showAnDuongVuongLoreCard(cfg.loreKey);
            } else if (window.__anDuongVuongRoom?.showLore) {
              window.__anDuongVuongRoom.showLore(cfg.loreKey);
            }
          }
        },
      };
      singleStele.add(proxyMesh);
      this._disposables.push(proxyGeo, proxyMat);

      stelesGroup.add(singleStele);
      this._storySteles.push(singleStele);
    });

    this.scene.add(stelesGroup);
    this._objects.push(stelesGroup);
  }

  /**
   * HỘP VA CHẠM BOX3 & GIỚI HẠN VỰC BIỂN DẠ SƠN (Hitbox Collision Architecture)
   */
  _buildRealmColliders() {
    this.colliders = [];

    // 1. Rào chắn vô hình đỉnh Vách Đá Dạ Sơn (Z >= 67.5m, X từ -35m đến +35m, cao 8m ngăn rơi vực biển)
    this.colliders.push(
      new THREE.Box3(new THREE.Vector3(-35.0, 5.0, 67.5), new THREE.Vector3(35.0, 14.5, 75.5)),
      new THREE.Box3(new THREE.Vector3(-60.0, 0.0, 48.0), new THREE.Vector3(-35.0, 16.0, 76.0)),
      new THREE.Box3(new THREE.Vector3(35.0, 0.0, 48.0), new THREE.Vector3(60.0, 16.0, 76.0))
    );

    // 2. Ranh giới vòng ngoài cõi 240m (Bắc, Nam, Tây, Đông tại ±115m)
    this.colliders.push(
      new THREE.Box3(new THREE.Vector3(-120.0, -10.0, -120.0), new THREE.Vector3(120.0, 30.0, -114.0)),
      new THREE.Box3(new THREE.Vector3(-120.0, -10.0, 114.0), new THREE.Vector3(120.0, 30.0, 120.0)),
      new THREE.Box3(new THREE.Vector3(-120.0, -10.0, -120.0), new THREE.Vector3(-114.0, 30.0, 120.0)),
      new THREE.Box3(new THREE.Vector3(114.0, -10.0, -120.0), new THREE.Vector3(120.0, 30.0, 120.0))
    );

    // 3. Trụ Cổng Nam & Vọng Lâu Nỏ Thần (hành lang trung tâm |X| <= 2.1m hoàn toàn thông thoáng)
    this.colliders.push(
      new THREE.Box3(new THREE.Vector3(-3.9, 0.0, -23.5), new THREE.Vector3(-2.1, 8.0, -20.5)),
      new THREE.Box3(new THREE.Vector3(2.1, 0.0, -23.5), new THREE.Vector3(3.9, 8.0, -20.5)),
      new THREE.Box3(new THREE.Vector3(-7.2, 0.0, -23.5), new THREE.Vector3(-4.5, 4.5, -19.5))
    );

    // 4. Giếng Ngọc Mỵ Châu (X=26, Z=-15)
    const wellY = getTerrainHeight(26.0, -15.0);
    this.colliders.push(
      new THREE.Box3(new THREE.Vector3(24.0, wellY, -17.0), new THREE.Vector3(28.0, wellY + 3.0, -13.0))
    );

    // 5. Điện Ngự Triều Cổ Loa Pedestal (Z = -65)
    const palY = getTerrainHeight(0, -65.0);
    this.colliders.push(
      new THREE.Box3(new THREE.Vector3(-4.5, palY, -69.5), new THREE.Vector3(4.5, palY + 4.5, -60.5))
    );

    // 6. Các khối đá vách Dạ Sơn nhô cao
    const rocks = [
      { x: -28.0, z: 60.0, r: 4.5 },
      { x: -16.0, z: 64.0, r: 4.0 },
      { x: 18.0, z: 63.0, r: 4.2 },
      { x: 32.0, z: 58.0, r: 4.8 },
    ];
    rocks.forEach((rk) => {
      const ry = getTerrainHeight(rk.x, rk.z);
      this.colliders.push(
        new THREE.Box3(
          new THREE.Vector3(rk.x - rk.r * 0.8, ry, rk.z - rk.r * 0.8),
          new THREE.Vector3(rk.x + rk.r * 0.8, ry + 6.0, rk.z + rk.r * 0.8)
        )
      );
    });

    this._collisionSphere = new THREE.Sphere();
  }

  /**
   * 6 HITBOX PROXY TƯƠNG TÁC RAYCASTER CÕI THẾ GIỚI MỞ
   */
  _buildRaycastProxyHitboxes() {
    this._hitboxProxyGroup = new THREE.Group();
    this._hitboxProxyGroup.name = 'AdvWorld_Hitbox_Raycast_Proxies';

    const proxyMat = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    this._disposables.push(proxyMat);

    // 1. AdvWorld_Return_Portal_ClickProxy: wraps return portal & book (3.2m x 4.2m x 2.0m at spawn X=0, Z=-5)
    const portalProxyGeo = prepGeo(new THREE.BoxGeometry(3.2, 4.2, 2.0));
    const portalProxy = new THREE.Mesh(portalProxyGeo, proxyMat);
    portalProxy.name = 'AdvWorld_Return_Portal_ClickProxy';
    portalProxy.position.set(0, getTerrainHeight(0, -5.0) + 2.1, -5.0);
    portalProxy.userData = {
      type: 'portal',
      action: 'exitRealm',
      realmId: 'museum',
      title: 'Trở Về Phòng Trưng Bày An Dương Vương',
      isClickProxy: true,
      isReturnPortal: true,
      isTeleportBook: true,
      onActivate: () => this._triggerExitRealm(),
      onClick: () => this._triggerExitRealm(),
    };
    this._hitboxProxyGroup.add(portalProxy);
    this.clickProxies.push(portalProxy);
    this._disposables.push(portalProxyGeo);

    // 2. AdvWorld_Hitbox_VongLau_NoThan: wraps watchtower & switched crossbow (4.5m x 4.0m x 4.5m at Z=-22, X=-5.5)
    const crossbowProxyGeo = prepGeo(new THREE.BoxGeometry(4.5, 4.0, 4.5));
    const crossbowProxy = new THREE.Mesh(crossbowProxyGeo, proxyMat);
    crossbowProxy.name = 'AdvWorld_Hitbox_VongLau_NoThan';
    crossbowProxy.position.set(-5.5, getTerrainHeight(-5.5, -22.0) + 2.0, -22.0);
    crossbowProxy.userData = {
      hitboxId: 'vongLauNoThan',
      loreKey: 'co_loa_vong_lau_no_than',
      title: 'Vọng Lâu Nỏ Thần Bị Đánh Tráo',
      isClickProxy: true,
      isArtifact3D: true,
      realm: 'an_duong_vuong',
      cameraFocusPos: [-3.5, 2.0, -18.0],
      cameraLookTarget: [-5.5, 1.2, -22.0],
      onActivate: () => {
        this.playInteractiveSound('crossbow_string');
        this._showLoreCard('magic_crossbow');
      },
      onClick: () => {
        this.playInteractiveSound('crossbow_string');
        this._showLoreCard('magic_crossbow');
      },
    };
    this._hitboxProxyGroup.add(crossbowProxy);
    this.clickProxies.push(crossbowProxy);
    this._disposables.push(crossbowProxyGeo);

    // 3. AdvWorld_Hitbox_GiengNgoc: wraps jade well & reeds (4.0m x 3.0m x 4.0m at X=26, Z=-15)
    const wellProxyGeo = prepGeo(new THREE.BoxGeometry(4.0, 3.0, 4.0));
    const wellProxy = new THREE.Mesh(wellProxyGeo, proxyMat);
    wellProxy.name = 'AdvWorld_Hitbox_GiengNgoc';
    wellProxy.position.set(26.0, getTerrainHeight(26.0, -15.0) + 1.5, -15.0);
    wellProxy.userData = {
      hitboxId: 'giengNgocCoiMo',
      loreKey: 'co_loa_gieng_ngoc_coi_mo',
      title: 'Giếng Ngọc Mị Châu Bên Bờ Lau',
      isClickProxy: true,
      isArtifact3D: true,
      realm: 'an_duong_vuong',
      cameraFocusPos: [23.5, 2.0, -12.0],
      cameraLookTarget: [26.0, 1.2, -15.0],
      onActivate: () => {
        this.playInteractiveSound('stele_chime');
        this._showLoreCard('goose_feather_well');
      },
      onClick: () => {
        this.playInteractiveSound('stele_chime');
        this._showLoreCard('goose_feather_well');
      },
    };
    this._hitboxProxyGroup.add(wellProxy);
    this.clickProxies.push(wellProxy);
    this._disposables.push(wellProxyGeo);

    // 4. AdvWorld_Hitbox_GooseFeather_Path: wraps the goose feather path steles (4 steles along the trail)
    const featherProxyGeo = prepGeo(new THREE.BoxGeometry(3.6, 3.2, 3.6));
    const featherProxy = new THREE.Mesh(featherProxyGeo, proxyMat);
    featherProxy.name = 'AdvWorld_Hitbox_GooseFeather_Path';
    featherProxy.position.set(6.8, getTerrainHeight(6.8, 26.0) + 1.6, 26.0);
    featherProxy.userData = {
      hitboxId: 'gooseFeatherPath',
      loreKey: 'goose_feather_well',
      title: 'Con Đường Lông Ngỗng Trắng Huyền Sử',
      isClickProxy: true,
      isArtifact3D: true,
      realm: 'an_duong_vuong',
      cameraFocusPos: [4.0, 2.0, 22.0],
      cameraLookTarget: [6.8, 1.4, 26.0],
      onActivate: () => {
        this.playInteractiveSound('stele_chime');
        this._showLoreCard('goose_feather_well');
      },
      onClick: () => {
        this.playInteractiveSound('stele_chime');
        this._showLoreCard('goose_feather_well');
      },
    };
    this._hitboxProxyGroup.add(featherProxy);
    this.clickProxies.push(featherProxy);
    this._disposables.push(featherProxyGeo);

    // 5. AdvWorld_Hitbox_Statue_Cliff: wraps King An Duong Vuong on Da Son cliff (3.0m x 5.0m x 3.0m at Z=64, X=0)
    const kingProxyGeo = prepGeo(new THREE.BoxGeometry(3.0, 5.0, 3.0));
    const kingProxy = new THREE.Mesh(kingProxyGeo, proxyMat);
    kingProxy.name = 'AdvWorld_Hitbox_Statue_Cliff';
    kingProxy.position.set(0, getTerrainHeight(0, 64.0) + 2.5, 64.0);
    kingProxy.userData = {
      hitboxId: 'anDuongVuongVachDa',
      loreKey: 'an_duong_vuong_vach_da_da_son',
      title: 'Tượng Vua An Dương Vương Nơi Mỏm Đá Dạ Sơn',
      isClickProxy: true,
      isArtifact3D: true,
      realm: 'an_duong_vuong',
      cameraFocusPos: [0, 7.5, 58.0],
      cameraLookTarget: [0, 6.8, 64.0],
      onActivate: () => {
        this.playInteractiveSound('bronze_drum');
        this._showLoreCard('king_statue');
      },
      onClick: () => {
        this.playInteractiveSound('bronze_drum');
        this._showLoreCard('king_statue');
      },
    };
    this._hitboxProxyGroup.add(kingProxy);
    this.clickProxies.push(kingProxy);
    this._disposables.push(kingProxyGeo);

    // 6. AdvWorld_Hitbox_KimQuy_Ocean: wraps Than Kim Quy offshore (8.0m x 6.0m x 8.0m at Z=88, X=0)
    const turtleProxyGeo = prepGeo(new THREE.BoxGeometry(8.0, 6.0, 8.0));
    const turtleProxy = new THREE.Mesh(turtleProxyGeo, proxyMat);
    turtleProxy.name = 'AdvWorld_Hitbox_KimQuy_Ocean';
    turtleProxy.position.set(0, 4.1, 88.0);
    turtleProxy.userData = {
      hitboxId: 'thanKimQuyReNuoc',
      loreKey: 'an_duong_vuong_than_kim_quy',
      title: 'Thần Kim Quy Rẽ Nước Nơi Biển Khơi',
      isClickProxy: true,
      isArtifact3D: true,
      realm: 'an_duong_vuong',
      cameraFocusPos: [0, 7.0, 74.0],
      cameraLookTarget: [0, 2.5, 88.0],
      onActivate: () => {
        this.playInteractiveSound('kim_quy_roar');
        this._showLoreCard('kim_quy_lake');
      },
      onClick: () => {
        this.playInteractiveSound('kim_quy_roar');
        this._showLoreCard('kim_quy_lake');
      },
    };
    this._hitboxProxyGroup.add(turtleProxy);
    this.clickProxies.push(turtleProxy);
    this._disposables.push(turtleProxyGeo);

    this.scene.add(this._hitboxProxyGroup);
    this._objects.push(this._hitboxProxyGroup);
  }

  _showLoreCard(loreKey) {
    if (typeof window !== 'undefined') {
      if (typeof window.showAnDuongVuongLoreCard === 'function') {
        window.showAnDuongVuongLoreCard(loreKey);
      } else if (window.__anDuongVuongRoom?.showLore) {
        window.__anDuongVuongRoom.showLore(loreKey);
      }
    }
  }

  setHitboxManager(hitboxManager) {
    this.hitboxManager = hitboxManager;
    this._syncHitboxManager();
  }

  _syncHitboxManager() {
    const hbm = this.hitboxManager || (typeof window !== 'undefined' ? (window.__museumHitboxManager || window.__hitboxManager) : null);
    if (!hbm) return;

    if (this.colliders && this.colliders.length > 0) {
      hbm.clearRealmHitboxes?.('an_duong_vuong');
      hbm.registerRealmHitboxes?.('an_duong_vuong', this.colliders);
    }

    if (this.clickProxies && Array.isArray(hbm.clickProxies)) {
      this.clickProxies.forEach((px) => {
        if (!hbm.clickProxies.includes(px)) {
          hbm.clickProxies.push(px);
        }
      });
    }
  }

  getColliders() {
    return this.colliders || [];
  }

  checkCollision(pos, radius = 0.5) {
    if (!this.colliders || !pos) return false;
    this._collisionSphere.center.copy(pos);
    this._collisionSphere.radius = radius;
    for (let i = 0; i < this.colliders.length; i++) {
      if (this.colliders[i].intersectsSphere(this._collisionSphere)) {
        return true;
      }
    }
    return false;
  }

  /**
   * KHỞI TẠO HỆ THỐNG ÂM THANH 3D POSITIONAL AUDIO (4 Phân Khu Đặc Trưng)
   */
  _initSpatialAudio() {
    this._audioSources = [];

    const drumAnchor = new THREE.Object3D();
    drumAnchor.name = 'SpatialSound_DongSonDrum';
    drumAnchor.position.set(0, getTerrainHeight(0, -65.0) + 2.5, -65.0);
    drumAnchor.userData.ignoreRaycaster = true;
    this.scene.add(drumAnchor);
    this._objects.push(drumAnchor);

    const crossbowAnchor = new THREE.Object3D();
    crossbowAnchor.name = 'SpatialSound_ThanCoLau';
    crossbowAnchor.position.set(-5.5, getTerrainHeight(-5.5, -22.0) + 1.2, -22.0);
    crossbowAnchor.userData.ignoreRaycaster = true;
    this.scene.add(crossbowAnchor);
    this._objects.push(crossbowAnchor);

    const bambooAudioAnchor = new THREE.Object3D();
    bambooAudioAnchor.name = 'SpatialSound_PhongKheWind';
    bambooAudioAnchor.position.set(0, 2.5, 15.0);
    bambooAudioAnchor.userData.ignoreRaycaster = true;
    this.scene.add(bambooAudioAnchor);
    this._objects.push(bambooAudioAnchor);

    const oceanAudioAnchor = new THREE.Object3D();
    oceanAudioAnchor.name = 'SpatialSound_DaSonSurf';
    oceanAudioAnchor.position.set(0, 4.5, 78.0);
    oceanAudioAnchor.userData.ignoreRaycaster = true;
    this.scene.add(oceanAudioAnchor);
    this._objects.push(oceanAudioAnchor);

    let listener = null;
    if (this.camera) {
      listener = this.camera.children?.find((c) => c?.isAudioListener) || null;
    }
    if (!listener && typeof window !== 'undefined') {
      listener = window.__audioListener || window.__spatialAudio?.listener || null;
    }
    if (!listener && typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
      try {
        listener = new THREE.AudioListener();
        if (this.camera) {
          this.camera.add(listener);
        }
        this._createdAudioListener = listener;
      } catch (_) {}
    }

    if (!listener) return;

    const audioCtx = listener.context;
    if (!audioCtx) return;

    const audioConfigs = [
      { anchor: drumAnchor, kind: 'bronze_drum', refDist: 6.0, maxDist: 48.0, vol: 0.65 },
      { anchor: crossbowAnchor, kind: 'crossbow_string', refDist: 5.0, maxDist: 38.0, vol: 0.58 },
      { anchor: bambooAudioAnchor, kind: 'bamboo_wind', refDist: 8.0, maxDist: 42.0, vol: 0.52 },
      { anchor: oceanAudioAnchor, kind: 'ocean_waves', refDist: 10.0, maxDist: 72.0, vol: 0.75 },
    ];

    const audioEntries = [];
    audioConfigs.forEach((cfg) => {
      try {
        const pAudio = new THREE.PositionalAudio(listener);
        pAudio.setRefDistance(cfg.refDist);
        pAudio.setMaxDistance(cfg.maxDist);
        pAudio.setRolloffFactor(1.25);
        pAudio.setVolume(cfg.vol);
        cfg.anchor.add(pAudio);
        this._audioSources.push(pAudio);
        audioEntries.push({ pAudio, kind: cfg.kind });
      } catch (_) {}
    });

    const activateSpatialAudio = () => {
      if (!audioCtx) return;
      audioEntries.forEach((entry) => {
        try {
          if (!entry.pAudio.isPlaying) {
            const buf = createProceduralAnDuongVuongAudio(audioCtx, entry.kind);
            if (buf) {
              entry.pAudio.setBuffer(buf);
              entry.pAudio.setLoop(true);
              entry.pAudio.play();
            }
          }
        } catch (_) {}
      });
    };

    if (audioCtx.state === 'running') {
      activateSpatialAudio();
    } else if (typeof window !== 'undefined') {
      const onFirstTouch = () => {
        if (audioCtx.state === 'suspended') {
          audioCtx.resume().then(activateSpatialAudio).catch(() => {});
        } else {
          activateSpatialAudio();
        }
        window.removeEventListener('pointerdown', onFirstTouch);
        window.removeEventListener('keydown', onFirstTouch);
      };
      window.addEventListener('pointerdown', onFirstTouch, { once: true });
      window.addEventListener('keydown', onFirstTouch, { once: true });
    }
  }

  /**
   * CẬP NHẬT TỪNG FRAME (Zero-Allocation Loop 60+ FPS)
   */
  update(dt = 0.016, elapsedTime = null, camera = null) {
    const delta = dt || 0.016;
    if (elapsedTime !== null && Number.isFinite(elapsedTime)) {
      this._elapsedTime = elapsedTime;
    } else {
      this._elapsedTime = (this._elapsedTime || 0) + delta;
    }

    if (this._waterMat?.uniforms?.uTime) {
      this._waterMat.uniforms.uTime.value = this._elapsedTime;
    }

    if (this._moatMat?.uniforms?.uTime) {
      this._moatMat.uniforms.uTime.value = this._elapsedTime;
    }

    if (this._windUniform?.uTime) {
      this._windUniform.uTime.value = this._elapsedTime;
    }

    if (this._skyMat?.uniforms?.uTime) {
      this._skyMat.uniforms.uTime.value = this._elapsedTime;
    }

    if (this._auraMat?.uniforms?.uPulse) {
      this._auraMat.uniforms.uPulse.value = 0.85 + Math.sin(this._elapsedTime * 2.8) * 0.15;
    }

    if (this._emberMat?.uniforms?.uTime) {
      this._emberMat.uniforms.uTime.value = this._elapsedTime;
    }

    if (this._portalVortexMat?.uniforms?.uTime) {
      this._portalVortexMat.uniforms.uTime.value = this._elapsedTime;
    }

    if (this._portalBook) {
      this._portalBook.position.y = 0.72 + Math.sin(this._elapsedTime * 2.0) * 0.035;
    }

    if (this._turtleRoot) {
      this._turtleRoot.position.y = this._turtleBaseY + Math.sin(this._elapsedTime * 1.4) * 0.14;
    }

    if (this._mistGroup) {
      this._mistGroup.rotation.y += delta * 0.32;
    }

    // Cờ trận Âu Lạc phấp phới trong gió biển
    if (this._flagMeshes && this._flagMeshes.length > 0) {
      const flutter = Math.sin(this._elapsedTime * 4.2) * 0.12;
      for (let i = 0; i < this._flagMeshes.length; i++) {
        this._flagMeshes[i].rotation.y = flutter + Math.sin(this._elapsedTime * 2.5 + i) * 0.08;
      }
    }

    // Proximity trigger cổng hồi quy (< 2.2m từ camera -> exitRealm)
    const activeCam = camera || this.camera || (typeof window !== 'undefined' ? window.__camera : null);
    if (activeCam && this._portalPosition && !this._isTransitioningPortal) {
      const distToPortal = activeCam.position.distanceTo(this._portalPosition);
      const dy = Math.abs(activeCam.position.y - this._portalPosition.y);
      if (distToPortal < 2.2 && dy < 2.5) {
        this._triggerExitRealm();
      }
    }

    // Hỗ trợ bám sát độ cao địa hình tự nhiên khi di chuyển (Natural Walking Terrain Height Clamping)
    if (activeCam && activeCam.position && Number.isFinite(activeCam.position.x) && Number.isFinite(activeCam.position.z)) {
      const cx = activeCam.position.x;
      const cz = activeCam.position.z;
      // Trong phạm vi ranh giới cõi 240m (±114m) và không trong trạng thái chuyển cảnh portal
      if (Math.abs(cx) <= 114.0 && Math.abs(cz) <= 114.0 && !this._isTransitioningPortal) {
        const terrainH = getTerrainHeight(cx, cz);
        const targetY = terrainH + 1.7;
        // Floor clamp: ngăn chặn hoàn toàn rơi/chìm xuống dưới mặt đất
        if (activeCam.position.y < targetY - 0.05) {
          activeCam.position.y = targetY;
        } else {
          // Hỗ trợ nhịp bước bám sát mượt mà (smooth clamp/assist targetY) theo triền đồi, vách đá Dạ Sơn
          const dy = targetY - activeCam.position.y;
          if (Math.abs(dy) < 3.2) {
            activeCam.position.y += dy * Math.min(1.0, delta * 7.5);
          }
        }
      }
    }

    // Cập nhật hệ thống hạt lông ngỗng bay
    if (this._featherPositions && this._featherGeo && this._featherDriftSeeds) {
      const posAttr = this._featherGeo.attributes.position;
      const count = this._featherCount;
      const t = this._elapsedTime;

      for (let i = 0; i < count; i++) {
        const idx = i * 3;
        const fallSpeed = this._featherDriftSeeds[idx];
        const freq = this._featherDriftSeeds[idx + 1];
        const phase = this._featherDriftSeeds[idx + 2];

        this._featherPositions[idx] += Math.sin(t * freq + phase) * 0.0035;
        this._featherPositions[idx + 1] -= fallSpeed;
        this._featherPositions[idx + 2] += Math.cos(t * freq * 0.7 + phase) * 0.0024;

        const currentX = this._featherPositions[idx];
        const currentZ = this._featherPositions[idx + 2];
        const groundY = getTerrainHeight(currentX, currentZ);

        if (this._featherPositions[idx + 1] < groundY + 0.12) {
          this._featherPositions[idx + 1] = groundY + 2.4 + (i % 6) * 0.22;
        }
      }

      posAttr.needsUpdate = true;
    }
  }

  updateRealm(delta = 0.016, elapsedTime = null, camera = null) {
    return this.update(delta, elapsedTime, camera);
  }

  /**
   * GIẢI PHÓNG TOÀN DIỆN TÀI NGUYÊN (Clean Dispose)
   */
  dispose() {
    if (this.scene) {
      this.scene.fog = this._originalFog || null;
    }

    if (this._audioSources) {
      this._audioSources.forEach((src) => {
        try {
          if (src.isPlaying) src.stop();
          if (src.disconnect) src.disconnect();
        } catch (_) {}
      });
      this._audioSources = [];
    }

    if (this._createdAudioListener && this.camera) {
      try {
        this.camera.remove(this._createdAudioListener);
      } catch (_) {}
      this._createdAudioListener = null;
    }

    this._objects.forEach((obj) => {
      if (!obj) return;
      if (obj.parent) obj.parent.remove(obj);
      else if (this.scene) this.scene.remove(obj);
    });

    this._lights.forEach((light) => {
      if (!light) return;
      if (light.parent) light.parent.remove(light);
      else if (this.scene) this.scene.remove(light);
    });

    this._disposables.forEach((item) => {
      if (!item) return;
      try {
        if (typeof item.dispose === 'function') {
          item.dispose();
        }
      } catch (_) {}
    });

    if (this.scene && this.scene.children) {
      while (this.scene.children.length > 0) {
        this.scene.remove(this.scene.children[0]);
      }
    }

    const hbm = this.hitboxManager || (typeof window !== 'undefined' ? (window.__museumHitboxManager || window.__hitboxManager) : null);
    if (hbm) {
      hbm.clearRealmHitboxes?.('an_duong_vuong');
      if (Array.isArray(hbm.clickProxies) && this.clickProxies) {
        hbm.clickProxies = hbm.clickProxies.filter((px) => !this.clickProxies.includes(px));
      }
    }

    this._objects = [];
    this._lights = [];
    this._disposables = [];
    this.colliders = [];
    this.clickProxies = [];
    this._hitboxProxyGroup = null;
    this._flagMeshes = [];
    this._storySteles = [];
    this._featherGeo = null;
    this._featherPositions = null;
    this._featherDriftSeeds = null;
    this._waterMat = null;
    this._moatMat = null;
    this._skyMat = null;
    this._auraMat = null;
    this._emberMat = null;
    this._portalVortexMat = null;
    this._portalBook = null;
    this._turtleRoot = null;
    this._mistGroup = null;

    if (this._interactiveAudioCtx) {
      try {
        if (this._interactiveAudioCtx.close) this._interactiveAudioCtx.close();
      } catch (_) {}
      this._interactiveAudioCtx = null;
    }
  }
}

export default AnDuongVuongWorld;
