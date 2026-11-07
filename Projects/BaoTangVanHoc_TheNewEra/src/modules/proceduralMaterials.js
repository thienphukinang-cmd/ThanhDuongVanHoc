import * as THREE from 'three';

/**
 * PROCEDURAL MATERIALS LIBRARY - BƯỚC 2 & 3:
 * BỘ CACHE VÂN ĐÁ / VÂN GỖ DƯỚI 1MB VRAM & ÁNH SÁNG GIẢ LẬP (FAKE GLOW)
 * 
 * 1. Texture Cache 256x256 (Tắt Mipmaps): 4 textures * 256KB = 1MB VRAM tổng thể.
 * 2. Material Cache dùng chung (Singleton): Không tạo lặp vật liệu, triệt tiêu phân mảnh bộ nhớ.
 * 3. Ánh sáng giả lập: silk_lit (tự phát sáng nhẹ), antique_gold (specular kim loại), lantern_glow (fake glow).
 */

// BỘ NHỚ ĐỆM DÙNG CHUNG TOÀN CỤC (CHỈ KHỞI TẠO 1 LẦN DUY NHẤT)
export const TEXTURE_CACHE = {};
export const MATERIAL_CACHE = {};

function createOptimizedCanvasTexture(key, drawCallback, repeatX = 2, repeatY = 2, width = 256, height = 256) {
  if (TEXTURE_CACHE[key]) return TEXTURE_CACHE[key];
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  drawCallback(ctx, width, height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  // Tắt mipmaps để tiết kiệm 33% VRAM và tránh giật khung hình trên GTX 1050 2GB
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  TEXTURE_CACHE[key] = texture;
  return texture;
}

// 1. Vân đá cẩm thạch vàng kem (Sàn sảnh chính)
export function getGoldMarbleTexture() {
  return createOptimizedCanvasTexture('gold_marble', (ctx, w, h) => {
    ctx.fillStyle = '#d8c39e';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(255, 250, 240, 0.35)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (i * 28) % h);
      ctx.bezierCurveTo(w * 0.3, ((i * 45) % h), w * 0.7, ((i * 15) % h), w, ((i * 35) % h));
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(140, 110, 75, 0.2)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo((i * 32) % w, 0);
      ctx.bezierCurveTo(((i * 20) % w), h * 0.4, ((i * 50) % w), h * 0.8, ((i * 38) % w), h);
      ctx.stroke();
    }
  }, 6, 6);
}

// 2. Vân đá cẩm thạch trắng (Cột trụ lớn & Tường sảnh)
export function getWhiteMarbleTexture() {
  return createOptimizedCanvasTexture('white_marble', (ctx, w, h) => {
    ctx.fillStyle = '#f5f2eb';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(180, 175, 165, 0.28)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (i * 22) % h);
      ctx.quadraticCurveTo(w * 0.5, ((i * 37) % h), w, ((i * 19) % h));
      ctx.stroke();
    }
  }, 2, 4);
}

// 3. Vân gỗ mun / gỗ lim Indochine (Tay vịn, khung cửa, bục trưng bày)
export function getDarkWoodTexture() {
  return createOptimizedCanvasTexture('dark_wood', (ctx, w, h) => {
    ctx.fillStyle = '#2b1810';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(25, 10, 5, 0.35)';
    for (let i = 0; i < 24; i++) {
      ctx.fillRect(0, i * 11, w, 3);
    }
    ctx.strokeStyle = 'rgba(75, 42, 24, 0.3)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 15; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * 17);
      ctx.lineTo(w, i * 17 + 4);
      ctx.stroke();
    }
  }, 2, 2);
}

// 4. Vân lụa / giấy dó cổ (Tranh treo tường, Sách Truyện Kiều, Bình phong)
export function getSilkPaperTexture() {
  return createOptimizedCanvasTexture('silk_paper', (ctx, w, h) => {
    ctx.fillStyle = '#ebdcb9';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(195, 170, 125, 0.25)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 32; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * 8);
      ctx.lineTo(w, i * 8);
      ctx.stroke();
    }
  }, 1, 1);
}

// BỘ KHỞI TẠO MATERIAL DÙNG CHUNG (SINGLETON MATERIALS - KHÔNG TẠO LẶP)
export function getSharedMaterial(type) {
  if (MATERIAL_CACHE[type]) return MATERIAL_CACHE[type];

  let mat;
  switch (type) {
    case 'floor_marble':
      mat = new THREE.MeshPhongMaterial({
        map: getGoldMarbleTexture(),
        color: 0xffffff,
        specular: 0xffe8b5,
        shininess: 55,
        side: THREE.DoubleSide
      });
      break;
    case 'column_marble':
    case 'wall_marble':
      mat = new THREE.MeshLambertMaterial({
        map: getWhiteMarbleTexture(),
        color: 0xf7f4ef,
        side: THREE.DoubleSide
      });
      break;
    case 'baluster':
      // Con tiện lan can chỉ dùng Lambert trơn để giảm tối đa tải shader ở cầu thang chữ Y
      mat = new THREE.MeshLambertMaterial({
        color: 0xf2efe9,
        side: THREE.DoubleSide
      });
      break;
    case 'dark_wood':
      mat = new THREE.MeshLambertMaterial({
        map: getDarkWoodTexture(),
        color: 0xffffff,
        side: THREE.DoubleSide
      });
      break;
    case 'antique_gold':
      mat = new THREE.MeshPhongMaterial({
        color: 0xdfb738, // Vàng đồng/kim hoàng gia Indochine đặc trưng
        emissive: 0x3d2c0b, // Độ tự phát xạ ấm nhẹ giúp chi tiết luôn ánh kim rạng rỡ ở góc khuất/gầm cầu thang
        specular: 0xffebaa, // Phản chiếu kim loại sáng ấm hoàng gia
        shininess: 75,
        side: THREE.DoubleSide
      });
      break;
    case 'silk_lit':
      // Tự phát sáng ấm hoài cổ đặc trưng lụa tơ tằm / giấy dó Indochine, không cần đèn rọi trực tiếp
      mat = new THREE.MeshLambertMaterial({
        map: getSilkPaperTexture(),
        color: 0xfff8e7,
        emissive: 0x48371e, // Tăng nhẹ tự phát xạ ấm áp cho thư tịch cổ & tranh lụa
        side: THREE.DoubleSide
      });
      break;
    case 'lantern_glow':
      // Giả lập hiệu ứng phát sáng đèn lồng (Fake Glow) màu vàng hổ phách Indochine ấm áp
      mat = new THREE.MeshBasicMaterial({
        color: 0xffbe55, // Vàng hổ phách rực rỡ, phát sáng tự nhiên mà không cần PointLight hay Bloom pass
        side: THREE.DoubleSide
      });
      break;
    case 'fake_shadow':
      return getFakeShadowMaterial();
    case 'fake_glow_sprite':
      return getFakeGlowSpriteMaterial();
    case 'light_beam':
      return getLightBeamMaterial();
    case 'floor_light_pool':
      return getFloorLightPoolMaterial();
    default:
      mat = new THREE.MeshLambertMaterial({ color: 0xdddddd, side: THREE.DoubleSide });
  }

  MATERIAL_CACHE[type] = mat;
  return mat;
}

// 5. Texture bóng đổ giả lập dưới chân cột/bục (128x128 - Cực nhẹ)
export function getFakeShadowMaterial() {
  if (MATERIAL_CACHE['fake_shadow']) return MATERIAL_CACHE['fake_shadow'];

  const tex = createOptimizedCanvasTexture('fake_shadow_tex', (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.05, w / 2, h / 2, w * 0.48);
    grad.addColorStop(0, 'rgba(15, 10, 5, 0.5)');
    grad.addColorStop(0.6, 'rgba(15, 10, 5, 0.2)');
    grad.addColorStop(1, 'rgba(15, 10, 5, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }, 1, 1, 128, 128);

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1
  });

  MATERIAL_CACHE['fake_shadow'] = mat;
  return mat;
}

export const getSharedShadowMaterial = getFakeShadowMaterial;

// 6. Texture quầng sáng giả lập (Fake Bloom Sprite - 128x128)
export function getFakeGlowSpriteMaterial() {
  if (MATERIAL_CACHE['fake_glow_sprite']) return MATERIAL_CACHE['fake_glow_sprite'];

  const tex = createOptimizedCanvasTexture('fake_glow_tex', (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const grad = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w * 0.48);
    grad.addColorStop(0, 'rgba(255, 230, 160, 0.85)');
    grad.addColorStop(0.35, 'rgba(255, 180, 70, 0.35)');
    grad.addColorStop(1, 'rgba(255, 150, 30, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }, 1, 1, 128, 128);

  const mat = new THREE.SpriteMaterial({
    map: tex,
    color: 0xffd27f,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  MATERIAL_CACHE['fake_glow_sprite'] = mat;
  return mat;
}

// 7. Bảng tên phòng & Hoành phi thư pháp mạ vàng siêu nhẹ (512x128 - Cached Singleton)
export function getCalligraphyPlaqueMaterial(title = 'TRUYỆN KIỀU', id = 'truyen_kieu') {
  const cacheKey = `plaque_${id}`;
  if (MATERIAL_CACHE[cacheKey]) return MATERIAL_CACHE[cacheKey];

  const textureKey = `plaque_tex_${id}`;
  const tex = createOptimizedCanvasTexture(textureKey, (ctx, w, h) => {
    // Nền gỗ mun sơn mài Indochine trầm ấm
    ctx.fillStyle = '#1c0f0a';
    ctx.fillRect(0, 0, w, h);

    // Vân gỗ mun tự nhiên
    ctx.fillStyle = 'rgba(10, 5, 2, 0.35)';
    for (let i = 0; i < 12; i++) {
      ctx.fillRect(0, i * 11, w, 2);
    }

    // Viền kim loại hoàng gia kép (Double Gold Trim)
    ctx.strokeStyle = '#dfb738';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 235, 168, 0.6)';
    ctx.strokeRect(12, 12, w - 24, h - 24);

    // Hoa văn góc hoàng gia Indochine
    ctx.fillStyle = '#dfb738';
    const cornerSize = 10;
    ctx.fillRect(14, 14, cornerSize, cornerSize);
    ctx.fillRect(w - 14 - cornerSize, 14, cornerSize, cornerSize);
    ctx.fillRect(14, h - 14 - cornerSize, cornerSize, cornerSize);
    ctx.fillRect(w - 14 - cornerSize, h - 14 - cornerSize, cornerSize, cornerSize);

    // Chữ thư pháp / hoành phi mạ vàng (Gold Foil Calligraphy)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 44px "Georgia", "Times New Roman", serif';

    // Đổ bóng chữ vàng ấm áp
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = '#dfb738';
    ctx.fillText(title.toUpperCase(), w / 2, h / 2);

    // Ánh kim phản chiếu trên mặt chữ
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = '#fff4cc';
    ctx.fillText(title.toUpperCase(), w / 2 - 1, h / 2 - 1);
  }, 1, 1, 512, 128);

  const mat = new THREE.MeshLambertMaterial({
    map: tex,
    color: 0xffffff,
    emissive: 0x221a08, // Tự phát xạ ấm để chữ vàng nổi bật sắc nét trên nền gỗ mun
    side: THREE.DoubleSide
  });

  MATERIAL_CACHE[cacheKey] = mat;
  return mat;
}

// 8. Vật liệu Tia sáng chiếu xiên / Đèn rọi giả lập (Volumetric Light Beam - 128x256)
export function getLightBeamMaterial() {
  if (MATERIAL_CACHE['light_beam']) return MATERIAL_CACHE['light_beam'];

  const tex = createOptimizedCanvasTexture('light_beam_tex', (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    // Mở đầu bằng 0.0 để không bị lộ viền cắt ngang trên đỉnh mái vòm
    grad.addColorStop(0.0, 'rgba(255, 230, 170, 0.0)');
    grad.addColorStop(0.2, 'rgba(255, 225, 160, 0.07)');
    grad.addColorStop(0.6, 'rgba(255, 215, 140, 0.03)');
    grad.addColorStop(1.0, 'rgba(255, 200, 120, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }, 1, 1);

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  MATERIAL_CACHE['light_beam'] = mat;
  return mat;
}

// 9. Vật liệu Vệt sáng in trên mặt sàn dưới bục trưng bày (Floor Light Pool - 128x128)
export function getFloorLightPoolMaterial() {
  if (MATERIAL_CACHE['floor_light_pool']) return MATERIAL_CACHE['floor_light_pool'];

  const tex = createOptimizedCanvasTexture('floor_light_pool_tex', (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const grad = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w * 0.48);
    grad.addColorStop(0.0, 'rgba(255, 230, 165, 0.45)');
    grad.addColorStop(0.5, 'rgba(255, 200, 110, 0.15)');
    grad.addColorStop(1.0, 'rgba(255, 180, 80, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }, 1, 1, 128, 128);

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2
  });

  MATERIAL_CACHE['floor_light_pool'] = mat;
  return mat;
}

/**
 * 10. NHỊP THỞ ÁNH SÁNG GIẢ LẬP (PULSING GLOW ANIMATION - 60+ FPS):
 * Điều tiết opacity của các vật liệu Singleton AdditiveBlending theo nhịp điệu thiêng liêng
 * Hoàn toàn không tạo rác bộ nhớ, chạy trong 0.001ms mỗi khung hình.
 */
export function updateProceduralLighting(elapsedTime = 0) {
  const beamMat = MATERIAL_CACHE['light_beam'];
  if (beamMat) {
    beamMat.opacity = 0.55 + Math.sin(elapsedTime * 0.85) * 0.05;
  }
  const poolMat = MATERIAL_CACHE['floor_light_pool'];
  if (poolMat) {
    poolMat.opacity = 0.85 + Math.sin(elapsedTime * 1.15 + 0.6) * 0.08;
  }
  const glowMat = MATERIAL_CACHE['fake_glow_sprite'];
  if (glowMat) {
    glowMat.opacity = 0.88 + Math.sin(elapsedTime * 1.35 + 1.2) * 0.06;
  }
}

/**
 * LỚP QUẢN LÝ MATERIAL LIBRARY - TƯƠNG THÍCH HOÀN TOÀN VỚI HỆ THỐNG HIỆN TẠI
 */
export class MaterialLibrary {
  constructor() {
    this.textures = TEXTURE_CACHE;
    this.materials = {};
    this.init();
  }

  init() {
    // Kết nối trực tiếp vào bộ Singleton Materials dùng chung
    this.materials.wall_marble = getSharedMaterial('wall_marble');
    this.materials.floor_marble = getSharedMaterial('floor_marble');
    this.materials.column_marble = getSharedMaterial('column_marble');
    this.materials.ceiling = getSharedMaterial('dark_wood');
    this.materials.blackGoldMarble = getSharedMaterial('floor_marble');
    this.materials.blackBorderMarble = getSharedMaterial('dark_wood');
    this.materials.whiteMarble = getSharedMaterial('column_marble');
    this.materials.polishedMahogany = getSharedMaterial('dark_wood');
    this.materials.whitePlaster = getSharedMaterial('wall_marble');
    this.materials.royalGold = getSharedMaterial('antique_gold');
    this.materials.bronzeFramework = getSharedMaterial('dark_wood');
    this.materials.skylightGlass = new THREE.MeshLambertMaterial({
      color: 0xe8f4f9,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide
    });
    this.materials.indochinePlaster = getSharedMaterial('wall_marble');
    this.materials.wallStone = this.materials.indochinePlaster;
    this.materials.wainscotWood = getSharedMaterial('dark_wood');
    this.materials.exteriorWall = getSharedMaterial('wall_marble');
    this.materials.warmLedCove = getSharedMaterial('lantern_glow');
    this.materials.indochineBalusterMarble = getSharedMaterial('baluster');
    this.materials.karstRock = new THREE.MeshLambertMaterial({ color: 0x5b6873, side: THREE.DoubleSide });
    this.materials.karstMoss = new THREE.MeshLambertMaterial({ color: 0x3b533d, side: THREE.DoubleSide });
    this.materials.cloudMist = new THREE.MeshLambertMaterial({ color: 0xf0f5fa, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide });
    this.materials.waterSurface = new THREE.MeshPhongMaterial({ color: 0x2d4857, shininess: 80, specular: 0xffeba8, side: THREE.DoubleSide });
    this.materials.silkLit = getSharedMaterial('silk_lit');
    this.materials.fakeShadow = getFakeShadowMaterial();
    this.materials.fakeGlowSprite = getFakeGlowSpriteMaterial();
    this.materials.lightBeam = getLightBeamMaterial();
    this.materials.floorLightPool = getFloorLightPoolMaterial();

    // Đảm bảo bật DoubleSide cho toàn bộ materials
    Object.values(this.materials).forEach(mat => {
      if (mat) {
        mat.side = THREE.DoubleSide;
        mat.needsUpdate = true;
      }
    });

    console.log("%c✓ [MATERIALS & LIGHTING UPGRADE 2 & 3] Bộ Cache vân đá / vân gỗ 1MB VRAM & Ánh sáng giả lập hoạt động!", "color: #39e58c; font-weight: bold;");
  }

  get(name) {
    const mat = this.materials[name] || getSharedMaterial(name) || this.materials.whiteMarble;
    if (mat) {
      mat.side = THREE.DoubleSide;
    }
    return mat;
  }

  getPlaque(title, id) {
    return getCalligraphyPlaqueMaterial(title, id);
  }
}

export default MaterialLibrary;
