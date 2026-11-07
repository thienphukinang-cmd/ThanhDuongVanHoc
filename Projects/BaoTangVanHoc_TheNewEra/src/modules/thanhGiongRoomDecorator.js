import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { registerInteractiveBook } from './PortalInteraction.js';
import * as ProceduralMats from './proceduralMaterials.js';
import { playBookSuckInCutscene, playBookReturnCutscene } from './bookVortexCutscene.js';
/**
 * THÁNH GIÓNG ROOM DECORATOR - EPIC HEROIC MASTERPIECE (PHÒNG 00 - TẦNG 1)
 * Phong cách Đông Sơn Rực Lửa, Uy Nghiêm & Độc Bản (Hùng Vương Bronze Age)
 * 
 * QUY TẮC HIỆU NĂNG BẮT BUỘC:
 * 1. 0 PointLight, 0 SpotLight, 0 ShadowMap, 0 EffectComposer.
 * 2. Toàn bộ hiệu ứng ánh sáng (Hào quang mặt trời 8.5m, Trống đồng Ngọc Lũ 14m,
 *    Đỉnh lửa đồng, Tia sáng God-rays, Tàn lửa) dùng MeshBasicMaterial / SpriteMaterial
 *    với THREE.AdditiveBlending, depthWrite: false và dùng chung Texture Cache.
 * 3. Chuẩn hóa kích thước Thánh Gióng 4.2m trên Bệ Đá Núi Sóc cao 1.6m.
 * 4. Sàn đá núi lửa huyền vũ Obsidian 26m x 26m che phủ hoàn toàn sàn trắng mặc định.
 * 5. Đúng 1 THREE.Points với 150 hạt tàn lửa bay lên (1 Draw Call).
 * 6. Tự động nén texture .glb <= 512px, tắt mipmap, bảo vệ VRAM < 2GB (GTX 1050).
 */

const DOWNSAMPLED_TEX_CACHE = new WeakMap();
const THANH_GIONG_TEXTURE_CACHE = {};

// =============================================================================
// HỆ THỐNG CACHE TEXTURE DÙNG CHUNG (ZERO VRAM OVERHEAD)
// =============================================================================
function getCachedTexture(key, width, height, drawFn, repeatX = 1, repeatY = 1) {
  if (THANH_GIONG_TEXTURE_CACHE[key]) return THANH_GIONG_TEXTURE_CACHE[key];
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, width, height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;

  THANH_GIONG_TEXTURE_CACHE[key] = tex;
  return tex;
}

/**
 * 1. SÀN ĐÁ HUYỀN VŨ OBSIDIAN CÓ VÂN NHAM THẠCH ĐỒNG (512x512)
 * Che lấp hoàn toàn sàn trắng của sảnh bảo tàng
 */
function getObsidianVolcanicFloorTexture() {
  return getCachedTexture('obsidian_volcanic_floor_tex', 512, 512, (ctx, w, h) => {
    // Nền đá đen huyền vũ nhám sâu
    ctx.fillStyle = '#141110';
    ctx.fillRect(0, 0, w, h);

    // Mảng phiến đá núi lửa thô nhám
    ctx.fillStyle = '#1c1715';
    for (let i = 0; i < 48; i++) {
      const rx = Math.random() * w;
      const ry = Math.random() * h;
      const rw = 20 + Math.random() * 60;
      const rh = 15 + Math.random() * 45;
      ctx.fillRect(rx, ry, rw, rh);
    }

    // Các vết nứt nham thạch rực ánh lửa đồng ngầm
    ctx.strokeStyle = '#c45c1a';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#ff7722';
    ctx.shadowBlur = 4;

    const drawMagmaCrack = (x1, y1, x2, y2) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * 40;
      const my = (y1 + y2) / 2 + (Math.random() - 0.5) * 40;
      ctx.lineTo(mx, my);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };

    drawMagmaCrack(0, 80, 240, 280);
    drawMagmaCrack(240, 280, 512, 340);
    drawMagmaCrack(180, 0, 360, 210);
    drawMagmaCrack(360, 210, 512, 120);
    drawMagmaCrack(40, 380, 320, 512);

    // Hoa văn đốm than hồng li ti
    ctx.fillStyle = 'rgba(255, 120, 30, 0.4)';
    for (let i = 0; i < 80; i++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
  }, 4, 4);
}

/**
 * 2. MẶT TRỐNG ĐỒNG NGỌC LŨ 14M PHÁT QUANG ĐỒNG LỬA (512x512)
 * Ngôi sao 14 cánh, đàn chim Lạc, hươu sao, người múa giáo và họa tiết răng lược
 */
function getNgocLuBronzeDrum14mTexture() {
  return getCachedTexture('ngoc_lu_bronze_drum_14m_tex', 512, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;

    // Vòng phát quang vàng lửa cam Additive
    const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, w * 0.49);
    bgGrad.addColorStop(0.0, 'rgba(255, 235, 140, 0.95)');
    bgGrad.addColorStop(0.25, 'rgba(255, 165, 45, 0.85)');
    bgGrad.addColorStop(0.65, 'rgba(220, 95, 20, 0.55)');
    bgGrad.addColorStop(0.88, 'rgba(180, 60, 10, 0.25)');
    bgGrad.addColorStop(1.0, 'rgba(120, 30, 5, 0.0)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#ffd066';
    ctx.fillStyle = '#ffd066';

    // 1. Mặt trời Đông Sơn 14 tia sáng ở tâm
    const numRays = 14;
    ctx.beginPath();
    for (let i = 0; i < numRays; i++) {
      const angle = (i / numRays) * Math.PI * 2;
      const nextAngle = ((i + 0.5) / numRays) * Math.PI * 2;
      const rOuter = w * 0.17;
      const rInner = w * 0.055;

      const ox = cx + Math.cos(angle) * rOuter;
      const oy = cy + Math.sin(angle) * rOuter;
      const ix = cx + Math.cos(nextAngle) * rInner;
      const iy = cy + Math.sin(nextAngle) * rInner;

      if (i === 0) ctx.moveTo(ox, oy);
      else ctx.lineTo(ox, oy);
      ctx.lineTo(ix, iy);
    }
    ctx.closePath();
    ctx.fill();

    // Họa tiết lông công / tam giác xen giữa các tia sáng
    ctx.strokeStyle = '#ffae33';
    ctx.lineWidth = 1.5;

    // 2. Hệ các vành tròn đồng tâm khắc vạch kỷ hà
    [0.19, 0.22, 0.26, 0.31, 0.36, 0.41, 0.45, 0.48].forEach((r, idx) => {
      ctx.beginPath();
      ctx.arc(cx, cy, w * r, 0, Math.PI * 2);
      ctx.lineWidth = idx % 2 === 0 ? 3 : 1.5;
      ctx.stroke();
    });

    // 3. Vòng răng cưa / tam giác kỷ hà Đông Sơn
    const teethCount = 42;
    ctx.beginPath();
    for (let i = 0; i < teethCount; i++) {
      const a1 = (i / teethCount) * Math.PI * 2;
      const a2 = ((i + 0.5) / teethCount) * Math.PI * 2;
      const r1 = w * 0.225;
      const r2 = w * 0.255;
      ctx.moveTo(cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1);
      ctx.lineTo(cx + Math.cos(a2) * r2, cy + Math.sin(a2) * r2);
    }
    ctx.stroke();

    // 4. Vòng 14 chim Lạc bay ngược chiều kim đồng hồ
    const birdCount = 14;
    ctx.fillStyle = '#ffe082';
    for (let i = 0; i < birdCount; i++) {
      const a = (i / birdCount) * Math.PI * 2;
      const bx = cx + Math.cos(a) * (w * 0.385);
      const by = cy + Math.sin(a) * (h * 0.385);

      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(a - Math.PI / 2);
      ctx.beginPath();
      // Mỏ dài, mào lông và sải cánh chim Lạc vút cao
      ctx.moveTo(-14, -3);
      ctx.lineTo(16, -2);
      ctx.lineTo(-6, -9);
      ctx.lineTo(-10, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // 5. Vòng hươu sao & người múa khiên ở vành ngoài
    ctx.strokeStyle = '#ffd066';
    ctx.lineWidth = 2;
    const spiralCount = 28;
    for (let i = 0; i < spiralCount; i++) {
      const a = (i / spiralCount) * Math.PI * 2;
      const sx = cx + Math.cos(a) * (w * 0.43);
      const sy = cy + Math.sin(a) * (h * 0.43);
      ctx.beginPath();
      ctx.arc(sx, sy, 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

/**
 * 3. HÀO QUANG MẶT TRỜI ĐÔNG SƠN KHỔNG LỒ 8.5M (512x512)
 * 14 tia lửa mặt trời sắc cam vàng rực lửa bao bọc Thánh Gióng
 */
function getEpicSunHalo85mTexture() {
  return getCachedTexture('epic_sun_halo_8_5m_tex', 512, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;

    // Vầng tỏa nhiệt Additive rực rỡ
    const grad = ctx.createRadialGradient(cx, cy, w * 0.06, cx, cy, w * 0.49);
    grad.addColorStop(0.0, 'rgba(255, 252, 230, 0.98)');
    grad.addColorStop(0.2, 'rgba(255, 195, 60, 0.85)');
    grad.addColorStop(0.48, 'rgba(255, 110, 20, 0.55)');
    grad.addColorStop(0.75, 'rgba(200, 50, 10, 0.22)');
    grad.addColorStop(1.0, 'rgba(140, 20, 5, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 14 Tia lửa hào quang mặt trời vươn dài
    ctx.fillStyle = 'rgba(255, 220, 100, 0.65)';
    for (let i = 0; i < 14; i++) {
      const a1 = (i / 14) * Math.PI * 2;
      const aMid = ((i + 0.5) / 14) * Math.PI * 2;
      const a2 = ((i + 1) / 14) * Math.PI * 2;

      const rOuter = w * 0.48;
      const rInner = w * 0.16;

      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a1) * rInner, cy + Math.sin(a1) * rInner);
      ctx.lineTo(cx + Math.cos(aMid) * rOuter, cy + Math.sin(aMid) * rOuter);
      ctx.lineTo(cx + Math.cos(a2) * rInner, cy + Math.sin(a2) * rInner);
      ctx.closePath();
      ctx.fill();
    }
  });
}

/**
 * 4. THẢM CHIẾN BÀO ĐỎ HUYẾT DỤ VIỀN ĐỒNG THAU (256x256)
 */
function getBloodRedCapeRunnerCarpetTexture() {
  return getCachedTexture('blood_red_cape_runner_carpet_tex', 256, 256, (ctx, w, h) => {
    // Đỏ huyết dụ sẫm uy nghiêm
    ctx.fillStyle = '#58111a';
    ctx.fillRect(0, 0, w, h);

    // Viền đồng thau kép hai bên
    ctx.strokeStyle = '#c48c3b';
    ctx.lineWidth = 14;
    ctx.strokeRect(8, 0, w - 16, h);

    ctx.strokeStyle = 'rgba(255, 215, 110, 0.6)';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(26, 4, w - 52, h - 8);

    // Hoa văn gấm vương triều sóng nước
    ctx.fillStyle = 'rgba(35, 5, 10, 0.35)';
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(0, i * 32, w, 8);
    }
  }, 1, 4);
}

/**
 * 5. PHÙ ĐIÊU ĐỒNG ĐỎ VĂN LANG ỐP TƯỜNG (512x256)
 * Thuyền chiến mũi cong, chiến binh giã gạo, múa khiên và hoa văn kỷ hà
 */
function getVanLangWallReliefTexture() {
  return getCachedTexture('van_lang_wall_relief_tex', 512, 256, (ctx, w, h) => {
    // Nền đồng đỏ sẫm khắc chìm
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0.0, '#361e12');
    grad.addColorStop(0.5, '#5a341b');
    grad.addColorStop(1.0, '#261309');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#c98a38';
    ctx.fillStyle = '#c98a38';
    ctx.lineWidth = 3;

    // Viền khung kỷ hà trên và dưới
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.strokeRect(18, 18, w - 36, h - 36);

    // Họa tiết Thuyền Chiến Đông Sơn lướt sóng
    ctx.beginPath();
    ctx.moveTo(w * 0.1, h * 0.72);
    ctx.quadraticCurveTo(w * 0.5, h * 0.82, w * 0.9, h * 0.68);
    ctx.lineTo(w * 0.88, h * 0.62);
    ctx.quadraticCurveTo(w * 0.5, h * 0.74, w * 0.12, h * 0.62);
    ctx.closePath();
    ctx.fill();

    // Mũi thuyền hình đầu chim Phượng / Lạc vươn cao
    ctx.beginPath();
    ctx.moveTo(w * 0.88, h * 0.62);
    ctx.lineTo(w * 0.95, h * 0.38);
    ctx.lineTo(w * 0.91, h * 0.42);
    ctx.stroke();

    // Các chiến binh trên thuyền đội mũ lông chim cầm giáo
    for (let i = 0; i < 6; i++) {
      const px = w * (0.25 + i * 0.1);
      const py = h * 0.62;

      ctx.beginPath();
      ctx.arc(px, py - 18, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(px, py - 12);
      ctx.lineTo(px, py);
      ctx.moveTo(px - 4, py - 8);
      ctx.lineTo(px + 6, py - 6);
      ctx.stroke();

      // Mũ lông chim vút cao
      ctx.beginPath();
      ctx.moveTo(px, py - 24);
      ctx.lineTo(px + 8, py - 36);
      ctx.stroke();
    }
  }, 2, 1);
}

/**
 * 6. VỆT SÁNG ĐỈNH LỬA ĐỒNG (128x128)
 */
function getFireFlameSpriteTexture() {
  return getCachedTexture('fire_flame_sprite_tex', 128, 128, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, w * 0.48);
    grad.addColorStop(0.0, 'rgba(255, 240, 160, 0.95)');
    grad.addColorStop(0.35, 'rgba(255, 130, 30, 0.65)');
    grad.addColorStop(0.75, 'rgba(200, 45, 10, 0.22)');
    grad.addColorStop(1.0, 'rgba(120, 20, 5, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
}

/**
 * 7. BẢNG TÊN PHÙ ĐỔNG NÚI SÓC MẠ KIM NỔI (512x128)
 */
function createSocMountainBronzePlaque(title, width = 1.6, height = 0.42) {
  const tex = getCachedTexture(`label_soc_mountain_${title}`, 512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#180f08';
    ctx.fillRect(0, 0, w, h);

    // Viền kim loại đồng cổ Đông Sơn
    ctx.strokeStyle = '#d6963a';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, w - 12, h - 12);

    ctx.strokeStyle = 'rgba(255, 215, 120, 0.65)';
    ctx.lineWidth = 3;
    ctx.strokeRect(16, 16, w - 32, h - 32);

    ctx.fillStyle = '#ffd66b';
    ctx.font = 'bold 36px "Cinzel", "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 10;
    ctx.fillText(title.toUpperCase(), w / 2, h / 2);
  });

  const mat = new THREE.MeshLambertMaterial({
    map: tex,
    emissive: new THREE.Color(0x3a240a),
    emissiveIntensity: 0.55,
    side: THREE.DoubleSide
  });

  return new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.06), mat);
}

// =============================================================================
// BỘ LỌC BẢO VỆ 2GB VRAM KHI NẠP GLB TRÊN GTX 1050
// =============================================================================
function compressTextureIfNeeded(tex) {
  if (!tex || !tex.image) return tex;
  if (DOWNSAMPLED_TEX_CACHE.has(tex)) return DOWNSAMPLED_TEX_CACHE.get(tex);

  const img = tex.image;
  const w = img.width || img.videoWidth || 0;
  const h = img.height || img.videoHeight || 0;

  if (w > 512 || h > 512) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(512, w);
    canvas.height = Math.min(512, h);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    tex.image = canvas;
  }

  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  DOWNSAMPLED_TEX_CACHE.set(tex, tex);
  return tex;
}

function optimizeGlbModel(root) {
  root.traverse((child) => {
    // Tắt toàn bộ PointLight / SpotLight nhúng trong file
    if (child.isLight) {
      child.visible = false;
      child.intensity = 0;
      child.castShadow = false;
      if (child.parent) {
        setTimeout(() => {
          try { child.parent?.remove?.(child); } catch (_) {}
        }, 0);
      }
      return;
    }

    child.layers?.enable?.(1);
    child.userData.excludeFromCollision = true;

    if (!child.isMesh) return;
    child.castShadow = false;
    child.receiveShadow = false;
    child.frustumCulled = true;

    const mats = Array.isArray(child.material) ? child.material : [child.material];
    const optimizedMats = mats.map((mat) => {
      if (!mat) return new THREE.MeshLambertMaterial({ color: 0xc89848 });
      if (mat.map) compressTextureIfNeeded(mat.map);
      return new THREE.MeshLambertMaterial({
        color: mat.color ? mat.color.clone() : new THREE.Color(0xffffff),
        map: mat.map || null,
        transparent: Boolean(mat.transparent),
        opacity: mat.opacity ?? 1.0,
        side: THREE.DoubleSide
      });
    });
    child.material = optimizedMats.length === 1 ? optimizedMats[0] : optimizedMats;
  });
}

function normalizeModelTransform(model, targetHeight = 4.2) {
  const wrapper = new THREE.Group();
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);

  // Chuẩn hóa trực tiếp theo chiều cao đứng size.y để đảm bảo tượng cao đúng 4.2m
  const refDimension = size.y > 0.05 ? size.y : Math.max(size.x, size.z, 0.001);
  const scale = targetHeight / refDimension;
  model.scale.setScalar(scale);

  const scaledBox = new THREE.Box3().setFromObject(model);
  const scaledCenter = new THREE.Vector3();
  scaledBox.getCenter(scaledCenter);

  model.position.x -= scaledCenter.x;
  model.position.z -= scaledCenter.z;
  model.position.y -= scaledBox.min.y;

  wrapper.add(model);
  return wrapper;
}

/**
 * TƯỢNG ĐÀI NGHỆ THUẬT QUY MÔ THÁNH GIÓNG CƯỠI NGỰA SẮT VƯƠN MÌNH LÊN TRỜI
 * (Dựng hình học chi tiết mạ đồng đen & vàng kim - Tuyệt đối không dùng khối trụ đơn giản)
 */
function createMonumentalGiongStatueFallback(bronzeMat, ironMat, goldMat, glowSpriteMat, targetHeight = 4.2) {
  const monument = new THREE.Group();
  monument.name = 'Monumental_ThanhGiong_Statue_Fallback';

  // 1. CHIẾN MÃ SẮT HUYỀN THOẠI (TƯ THẾ HÍ VANG, 2 CHÂN TRƯỚC VƯƠN LÊN CAO)
  const horse = new THREE.Group();
  horse.position.set(0, 0, 0);

  // Thân chiến mã sắt bóng loáng
  const horseBody = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.82, 2.3, 12), ironMat);
  horseBody.rotation.x = Math.PI * 0.38; // Nghiêng dốc phi thiên
  horseBody.position.set(0, 1.85, 0.1);
  horse.add(horseBody);

  // Cổ ngựa vươn dài ngạo nghễ
  const horseNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.58, 1.5, 10), ironMat);
  horseNeck.rotation.x = -Math.PI * 0.28;
  horseNeck.position.set(0, 2.75, 0.95);
  horse.add(horseNeck);

  // Đầu ngựa sắt hí vang
  const horseHead = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.65, 0.95), ironMat);
  horseHead.rotation.x = Math.PI * 0.16;
  horseHead.position.set(0, 3.45, 1.48);
  horse.add(horseHead);

  // Tai ngựa
  [-0.18, 0.18].forEach(ex => {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.32, 6), ironMat);
    ear.position.set(ex, 3.82, 1.35);
    ear.rotation.x = -0.2;
    horse.add(ear);
  });

  // Bờm ngựa sắt mạ vàng hoàng kim rực rỡ
  const horseMane = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.45, 0.45), goldMat);
  horseMane.position.set(0, 2.95, 0.75);
  horseMane.rotation.x = -Math.PI * 0.28;
  horse.add(horseMane);

  // Giáp ngực ngựa mạ đồng Đông Sơn
  const chestArmor = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 0.6, 12), bronzeMat);
  chestArmor.rotation.x = Math.PI * 0.38;
  chestArmor.position.set(0, 2.05, 0.7);
  horse.add(chestArmor);

  // 2 Chân sau đứng vững như bàn thạch trên đá
  const rearLegGeo = new THREE.CylinderGeometry(0.16, 0.12, 1.9, 8);
  [-0.55, 0.55].forEach(lx => {
    const leg = new THREE.Mesh(rearLegGeo, ironMat);
    leg.position.set(lx, 0.95, -0.75);
    leg.rotation.x = -0.15;
    horse.add(leg);

    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.22, 8), bronzeMat);
    hoof.position.set(lx, 0.11, -0.85);
    horse.add(hoof);
  });

  // 2 Chân trước tung vó vươn lên mây trời
  const frontLegGeo = new THREE.CylinderGeometry(0.14, 0.10, 1.8, 8);
  [-0.5, 0.5].forEach((lx, idx) => {
    const leg = new THREE.Mesh(frontLegGeo, ironMat);
    leg.position.set(lx, 2.45, 0.95 + idx * 0.25);
    leg.rotation.x = Math.PI * 0.38;
    horse.add(leg);

    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.2, 8), bronzeMat);
    hoof.position.set(lx, 3.05, 1.6 + idx * 0.25);
    horse.add(hoof);
  });

  monument.add(horse);

  // 2. TRÁNG SĨ THÁNH GIÓNG OAI PHONG LẪM LIỆT
  const hero = new THREE.Group();
  hero.position.set(0, 2.45, 0.2);

  // Thân giáp sắt và cẩm bào
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.42, 1.35, 10), bronzeMat);
  torso.rotation.x = -0.1;
  torso.position.y = 0.68;
  hero.add(torso);

  // Tấm che ngực phù đổng chạm rồng lửa
  const breastplate = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.75, 0.52), goldMat);
  breastplate.position.set(0, 0.72, 0.08);
  hero.add(breastplate);

  // Đầu và mũ sắt thần linh
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 10), bronzeMat);
  head.position.set(0, 1.55, 0.05);
  hero.add(head);

  const helmet = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.65, 8), goldMat);
  helmet.position.set(0, 1.88, 0.05);
  hero.add(helmet);

  // Tay phải vung cụm tre đằng ngà chỉ lên trời cao
  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.10, 1.35, 8), bronzeMat);
  armR.position.set(0.65, 1.25, 0.35);
  armR.rotation.x = -Math.PI * 0.32;
  armR.rotation.z = -Math.PI * 0.22;
  hero.add(armR);

  // BỤI TRE ĐẰNG NGÀ HOÀNG KIM TRÊN TAY GIÓNG
  const bambooStaff = new THREE.Group();
  bambooStaff.position.set(0.95, 1.75, 0.85);
  bambooStaff.rotation.x = -Math.PI * 0.35;

  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 3.8, 8), goldMat);
  bambooStaff.add(stalk);

  for (let n = -2; n <= 2; n++) {
    const node = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 6, 12), bronzeMat);
    node.rotation.x = Math.PI / 2;
    node.position.y = n * 0.7;
    bambooStaff.add(node);
  }

  // Quầng sáng rực lửa trên ngọn tre
  const fireGlow = new THREE.Sprite(glowSpriteMat);
  fireGlow.scale.set(2.4, 2.4, 1.0);
  fireGlow.position.y = 1.95;
  bambooStaff.add(fireGlow);

  hero.add(bambooStaff);
  monument.add(hero);

  // Scale toàn bộ tượng đài chuẩn hóa theo targetHeight
  const box = new THREE.Box3().setFromObject(monument);
  const size = new THREE.Vector3();
  box.getSize(size);
  const scale = targetHeight / (size.y || 4.2);
  monument.scale.setScalar(scale);

  return monument;
}

// =============================================================================
// HÀM CHÍNH: XÂY DỰNG TOÀN DIỆN KHÔNG GIAN TRIỂN LÃM THÁNH GIÓNG
// =============================================================================
export function buildThanhGiongExhibition({
  roomCenter = new THREE.Vector3(-48.0, 0.0, 19.0), // Khớp Tầng 1 Cánh Tây-Nam
  targetHeight = 4.2, // Kích thước Thánh Gióng chuẩn hóa 4.2m
  characters = [
    {
      name: 'Thánh Gióng',
      files: [
        '/model/thanh_giong.glb',
        '/model/thanhgiong.glb',
        '/models/thanh_giong.glb',
        '/models/thanhgiong.glb'
      ]
    }
  ]
} = {}) {
  const root = new THREE.Group();
  root.name = 'ThanhGiong_Epic_Masterpiece_Exhibition';
  root.position.copy(roomCenter);

  // Vật liệu đồng, sắt và đá núi lửa dùng chung
  const bronzeMat = ProceduralMats.getSharedMaterial?.('antique_gold')
    || new THREE.MeshPhongMaterial({
      color: 0xc88f3a,
      emissive: 0x3d2408,
      specular: 0xffe292,
      shininess: 75,
      side: THREE.DoubleSide
    });

  const ironMat = new THREE.MeshPhongMaterial({
    color: 0x222428,
    emissive: 0x0f1114,
    specular: 0x7c858e,
    shininess: 85,
    side: THREE.DoubleSide
  });

  const goldMat = new THREE.MeshPhongMaterial({
    color: 0xdfb738,
    emissive: 0x48320c,
    specular: 0xffe89e,
    shininess: 90,
    side: THREE.DoubleSide
  });

  const basaltRockMat = new THREE.MeshLambertMaterial({
    color: 0x181412,
    emissive: 0x140a06,
    side: THREE.DoubleSide
  });

  const flameSpriteTex = getFireFlameSpriteTexture();
  const flameSpriteMat = new THREE.SpriteMaterial({
    map: flameSpriteTex,
    color: 0xff8822,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  // =========================================================================
  // 1. SÀN ĐÁ HUYỀN VŨ OBSIDIAN (26m x 26m) CHE PHỦ 100% SÀN TRẮNG BẢO TÀNG
  // =========================================================================
  const floorTex = getObsidianVolcanicFloorTexture();
  const obsidianFloorMat = new THREE.MeshLambertMaterial({
    map: floorTex,
    color: 0xffffff,
    emissive: 0x180905,
    side: THREE.DoubleSide
  });

  const volcanicFloor = new THREE.Mesh(new THREE.PlaneGeometry(26.4, 26.4), obsidianFloorMat);
  volcanicFloor.name = 'Obsidian_Volcanic_Floor_26m';
  volcanicFloor.rotation.x = -Math.PI / 2;
  volcanicFloor.position.set(0, 0.008, 0); // Đặt nằm sát trên mặt sàn trắng gốc
  volcanicFloor.receiveShadow = false;
  root.add(volcanicFloor);

  // =========================================================================
  // 2. KHẢM MẶT TRỐNG ĐỒNG NGỌC LŨ 14M PHÁT QUANG ĐỒNG LỬA CHÍNH GIỮA SÀN
  // =========================================================================
  const drum14mTex = getNgocLuBronzeDrum14mTexture();
  const drum14mMat = new THREE.MeshBasicMaterial({
    map: drum14mTex,
    transparent: true,
    opacity: 0.96,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -3
  });

  const ngocLuDrumFloor = new THREE.Mesh(new THREE.PlaneGeometry(14.0, 14.0), drum14mMat);
  ngocLuDrumFloor.name = 'NgocLu_Bronze_Drum_14m_Floor_Inlay';
  ngocLuDrumFloor.rotation.x = -Math.PI / 2;
  ngocLuDrumFloor.position.set(0, 0.016, 0);
  root.add(ngocLuDrumFloor);

  // Vành hào quang lửa mở rộng quanh trống đồng (15.5m)
  const haloFloorMat = new THREE.MeshBasicMaterial({
    map: flameSpriteTex,
    color: 0xff6600,
    transparent: true,
    opacity: 0.38,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2
  });
  const drumOuterHalo = new THREE.Mesh(new THREE.PlaneGeometry(15.5, 15.5), haloFloorMat);
  drumOuterHalo.rotation.x = -Math.PI / 2;
  drumOuterHalo.position.set(0, 0.012, 0);
  root.add(drumOuterHalo);

  // =========================================================================
  // 3. THẢM CHIẾN BÀO ĐỎ HUYẾT DỤ & 6 TRỤ GIÁO ĐỒNG + CỜ LỆNH VĂN LANG
  // =========================================================================
  const carpetTex = getBloodRedCapeRunnerCarpetTexture();
  const runnerMat = new THREE.MeshLambertMaterial({ map: carpetTex, emissive: 0x220508 });
  const battleRunner = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.02, 3.6), runnerMat);
  battleRunner.name = 'Battle_Cape_Runner_Carpet';
  battleRunner.position.set(7.6, 0.022, 0);
  battleRunner.receiveShadow = false;
  root.add(battleRunner);

  // 6 Trụ giáo đồng & Cờ lệnh Văn Lang dọc thảm chiến bào
  const bannerMat = new THREE.MeshLambertMaterial({
    color: 0x7c141a,
    emissive: 0x36080c,
    side: THREE.DoubleSide
  });

  [-2.6, 2.6].forEach((laneZ, sideIdx) => {
    [3.5, 7.5, 11.5].forEach((laneX) => {
      const spearPillar = new THREE.Group();
      spearPillar.position.set(laneX, 0, laneZ);

      // Chân đế đá bát giác
      const baseStone = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.3, 8), basaltRockMat);
      baseStone.position.y = 0.15;
      spearPillar.add(baseStone);

      // Thân cán giáo đồng cao 4.2m
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.065, 4.2, 8), bronzeMat);
      shaft.position.y = 2.25;
      spearPillar.add(shaft);

      // Lưỡi giáo đồng Đông Sơn hình thoi búp sen
      const spearHead = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.65, 4), bronzeMat);
      spearHead.position.y = 4.65;
      spearPillar.add(spearHead);

      // Cờ lệnh Văn Lang viền vàng bay phất phới
      const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 2.2), bannerMat);
      banner.position.set(0, 3.2, sideIdx === 0 ? 0.72 : -0.72);
      banner.rotation.y = Math.PI / 2;
      spearPillar.add(banner);

      // Họa tiết viền cờ mạ vàng
      const bannerTrim = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.08, 0.04), goldMat);
      bannerTrim.position.set(0, 4.3, sideIdx === 0 ? 0.72 : -0.72);
      spearPillar.add(bannerTrim);

      root.add(spearPillar);
    });
  });

  // =========================================================================
  // 4. BỆ ĐÁ NÚI SÓC CAO 1.6M (SOC MOUNTAIN STONE PLINTH)
  // =========================================================================
  const socMountainPlinth = new THREE.Group();
  socMountainPlinth.name = 'Soc_Mountain_Stone_Plinth_1_6m';
  socMountainPlinth.position.set(0, 0, 0);

  // Cấp 1: Bệ đá núi lửa bát giác đại khối (Cao 0.55m, rộng 5.8m x 5.2m)
  const plinthStep1 = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.55, 5.2), basaltRockMat);
  plinthStep1.position.y = 0.275;
  socMountainPlinth.add(plinthStep1);

  // Đai đồng Đông Sơn viền quanh bệ cấp 1
  const plinthRim1 = new THREE.Mesh(new THREE.BoxGeometry(5.95, 0.08, 5.35), bronzeMat);
  plinthRim1.position.y = 0.55;
  socMountainPlinth.add(plinthRim1);

  // Cấp 2: Bệ đá sa thạch khắc phù điêu đồng (Cao 0.55m, rộng 4.6m x 4.0m)
  const plinthStep2 = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.55, 4.0), basaltRockMat);
  plinthStep2.position.y = 0.825;
  socMountainPlinth.add(plinthStep2);

  const plinthRim2 = new THREE.Mesh(new THREE.BoxGeometry(4.75, 0.08, 4.15), bronzeMat);
  plinthRim2.position.y = 1.10;
  socMountainPlinth.add(plinthRim2);

  // Cấp 3: Phiến đá đỉnh Núi Sóc (Cao 0.50m, rộng 3.8m x 3.4m, đỉnh tại Y = 1.60m)
  const plinthTop = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.50, 3.4), basaltRockMat);
  plinthTop.position.y = 1.35;
  socMountainPlinth.add(plinthTop);

  // Bảng tên đồng mạ vàng "PHÙ ĐỔNG THIÊN VƯƠNG" gắn mặt trước bệ Núi Sóc
  const socPlaque = createSocMountainBronzePlaque('PHÙ ĐỔNG THIÊN VƯƠNG', 1.8, 0.45);
  socPlaque.position.set(0, 0.85, 2.05);
  socPlaque.rotation.x = -0.1;
  socMountainPlinth.add(socPlaque);

  root.add(socMountainPlinth);

  // =========================================================================
  // 5. 4 ĐỈNH LỬA ĐỒNG (BRONZE FIRE BRAZIERS) Ở 4 GÓC BỆ ĐÁ
  // =========================================================================
  const fireSpriteArray = [];
  [
    [-2.4, 0, -2.1],
    [2.4, 0, -2.1],
    [-2.4, 0, 2.1],
    [2.4, 0, 2.1]
  ].forEach(([fx, fy, fz]) => {
    const brazier = new THREE.Group();
    brazier.position.set(fx, 0.55, fz); // Đặt trên cấp 1 của bệ đá

    // Đỉnh đồng 3 chân
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 10), bronzeMat);
    pot.scale.set(1.1, 0.75, 1.1);
    pot.position.y = 0.45;
    brazier.add(pot);

    // Chân đỉnh đồng
    [-0.25, 0.25].forEach(cx => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.04, 0.42, 6), bronzeMat);
      leg.position.set(cx, 0.18, 0.18);
      brazier.add(leg);
    });

    // Vành đỉnh đồng chạm hoa văn
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.05, 6, 16), goldMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.72;
    brazier.add(rim);

    // Ngọn lửa thiêng bùng cháy Additive
    const flame = new THREE.Sprite(flameSpriteMat);
    flame.scale.set(2.4, 3.2, 1.0);
    flame.position.set(0, 1.6, 0);
    brazier.add(flame);
    fireSpriteArray.push(flame);

    root.add(brazier);
  });

  // =========================================================================
  // 6. VẦNG HÀO QUANG MẶT TRỜI ĐÔNG SƠN KHỔNG LỒ 8.5M PHÍA SAU LƯNG GIÓNG
  // =========================================================================
  const backdropGroup = new THREE.Group();
  backdropGroup.position.set(-8.5, 0, 0); // Vách Tây phía sau tượng tại X = -56.5 trong bảo tàng
  backdropGroup.rotation.y = Math.PI / 2;

  const sunHalo85Tex = getEpicSunHalo85mTexture();
  const sunHalo85Mat = new THREE.MeshBasicMaterial({
    map: sunHalo85Tex,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  // VẦNG HÀO QUANG MẶT TRỜI ĐƯỜNG KÍNH 8.5M
  const epicSun85 = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 8.5), sunHalo85Mat);
  epicSun85.name = 'Epic_Sun_Halo_8_5m_Backdrop';
  epicSun85.position.set(0, 4.6, -0.6);
  backdropGroup.add(epicSun85);

  // Đại phù điêu đồng đỏ hậu cảnh
  const reliefTex = getVanLangWallReliefTexture();
  const reliefMat = new THREE.MeshLambertMaterial({
    map: reliefTex,
    emissive: 0x32180c,
    side: THREE.DoubleSide
  });
  const backMural = new THREE.Mesh(new THREE.BoxGeometry(16.5, 6.8, 0.22), reliefMat);
  backMural.position.set(0, 3.4, -0.3);
  backdropGroup.add(backMural);

  // Hoành phi đồng đỏ mạ vàng trên đỉnh phù điêu
  const hoanhPhi = createSocMountainBronzePlaque('ĐẠI THẦN BẢO QUỐC PHÙ ĐỔNG', 5.6, 0.95);
  hoanhPhi.position.set(0, 6.2, 0.1);
  backdropGroup.add(hoanhPhi);

  root.add(backdropGroup);

  // =========================================================================
  // 7. ỐP KÍN VÁCH TƯỜNG HAI BÊN (Z = ±12.2) VỚI PHÙ ĐIÊU ĐỒNG VĂN LANG
  // =========================================================================
  [-12.2, 12.2].forEach((wallZ, sideIdx) => {
    [-4.5, 1.2, 6.8].forEach((posX) => {
      const wallPanel = new THREE.Group();
      wallPanel.position.set(posX, 3.8, wallZ);
      wallPanel.rotation.y = sideIdx === 0 ? 0 : Math.PI;

      const backing = new THREE.Mesh(new THREE.BoxGeometry(5.2, 6.2, 0.12), basaltRockMat);
      wallPanel.add(backing);

      const bronzeFrame = new THREE.Mesh(new THREE.BoxGeometry(4.85, 5.85, 0.16), bronzeMat);
      wallPanel.add(bronzeFrame);

      const relief = new THREE.Mesh(new THREE.BoxGeometry(4.55, 5.5, 0.2), reliefMat);
      wallPanel.add(relief);

      root.add(wallPanel);
    });
  });

  // =========================================================================
  // 8. DỰNG 2 CỤM "LŨY TRE NGÀ ĐẰNG CHÂU" DỌC TƯỜNG & SAU LƯNG THÁNH GIÓNG
  // =========================================================================
  const bambooMat = new THREE.MeshPhongMaterial({
    color: 0xe6b84d,
    emissive: 0x3d2c0b,
    specular: 0xffe89e,
    shininess: 70,
    side: THREE.DoubleSide
  });

  const createBambooHedge = (startPos, count, spacingZ, rotY) => {
    const hedge = new THREE.Group();
    hedge.position.copy(startPos);
    hedge.rotation.y = rotY;

    for (let i = 0; i < count; i++) {
      const pz = (i - count / 2) * spacingZ;
      const px = (Math.random() - 0.5) * 0.45;
      const h = 4.2 + Math.random() * 1.8;

      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.095, h, 8), bambooMat);
      stalk.position.set(px, h / 2, pz);
      stalk.rotation.z = (Math.random() - 0.5) * 0.12;
      hedge.add(stalk);

      // Đốt tre
      const nodes = 7;
      for (let n = 1; n < nodes; n++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.025, 6, 12), bronzeMat);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(px, (h / nodes) * n, pz);
        hedge.add(ring);
      }

      // Đầu ngọn tre vuốt nhọn tự nhiên, thanh thoát
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.35, 8), bambooMat);
      tip.position.set(px, h + 0.175, pz);
      tip.rotation.z = stalk.rotation.z;
      hedge.add(tip);
    }

    root.add(hedge);
  };

  // Cụm 1: Lũy tre dọc tường Bắc (Z = -10.8)
  createBambooHedge(new THREE.Vector3(0, 0, -10.8), 12, 1.2, 0);

  // Cụm 2: Lũy tre dọc tường Nam (Z = +10.8)
  createBambooHedge(new THREE.Vector3(0, 0, 10.8), 12, 1.2, 0);

  // Cụm 3: Hàng tre sau lưng Thánh Gióng bao bọc Hào Quang (X = -7.5)
  createBambooHedge(new THREE.Vector3(-7.5, 0, 0), 10, 1.3, Math.PI / 2);

  // =========================================================================
  // 9. BỤC THƯ TỊCH CỔ MỞ ĐÔI (CHRONICLE STAND)
  // =========================================================================
  const bookStand = new THREE.Group();
  bookStand.name = 'ThanhGiong_Epic_Scroll_Stand';
  bookStand.position.set(2.4, 0.95, 1.25);

  const standPillar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.95, 8), bronzeMat);
  standPillar.position.y = 0.48;
  bookStand.add(standPillar);

  const bookGroup = new THREE.Group();
  bookGroup.name = 'Interactive_ThanhGiong_EpicBook';
  bookGroup.position.set(0, 1.0, 0);
  bookGroup.rotation.y = Math.PI * 0.45;
  bookGroup.rotation.x = 0.35;

  const silkPageMat = ProceduralMats.getSharedMaterial?.('silk_lit')
    || new THREE.MeshLambertMaterial({ color: 0xfff2d4, emissive: 0x483215, side: THREE.DoubleSide });

  const pageL = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.65), silkPageMat);
  pageL.position.x = -0.24;
  pageL.rotation.z = -0.12;
  bookGroup.add(pageL);

  const pageR = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.65), silkPageMat);
  pageR.position.x = 0.24;
  pageR.rotation.z = 0.12;
  bookGroup.add(pageR);

  const spineBronze = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.68), bronzeMat);
  bookGroup.add(spineBronze);
  bookStand.add(bookGroup);

  const bookHalo = new THREE.Sprite(flameSpriteMat);
  bookHalo.name = 'Epic_Book_Halo_Sprite';
  bookHalo.scale.set(2.4, 2.4, 1.0);
  bookHalo.position.set(0, 1.2, 0);
  bookStand.add(bookHalo);

  root.add(bookStand);
  root.bookMesh = bookGroup;

  registerInteractiveBook(bookGroup, new THREE.Vector3(0, 0, 0), {
    id: 'thanh_giong',
    title: 'TRUYỀN THUYẾT THÁNH GIÓNG',
    author: 'Văn học Dân gian & Sử thi Hùng Vương',
    genre: 'Truyền thuyết thời đại dựng nước',
    quote: 'Gióng nhổ từng bụi tre đằng ngà quất tan giặc Ân, cởi áo giáp bay về trời, non nước thái bình muôn thuở.',
    targetZoneId: 0,
    themeColor: 0xe67e22,
    portalReady: false
  });

  // =========================================================================
  // 10. NẠP MÔ HÌNH THÁNH GIÓNG 4.2M ĐỨNG TRÊN BỆ ĐÁ NÚI SÓC CAO 1.6M
  // =========================================================================
  const loader = new GLTFLoader();
  const charGroup = new THREE.Group();
  charGroup.name = 'ThanhGiong_Mounted_Statue';
  charGroup.position.set(0, 1.60, 0); // Đặt chính xác trên đỉnh Bệ Đá Núi Sóc (y = 1.6m)

  const charCfg = characters[0] || {};
  const fileCandidates = charCfg.files || [
    '/model/thanh_giong.glb',
    '/model/thanhgiong.glb',
    '/models/thanh_giong.glb',
    '/models/thanhgiong.glb'
  ];
  const finalHeight = charCfg.targetHeight || targetHeight || 4.2;

  let fileIdx = 0;
  const tryLoadNextGlb = () => {
    if (fileIdx >= fileCandidates.length) {
      // Dựng Tượng Đài Nghệ Thuật Thánh Gióng Vươn Mình Lên Trời cực kỳ chi tiết
      const monumentalStatue = createMonumentalGiongStatueFallback(bronzeMat, ironMat, goldMat, flameSpriteMat, finalHeight);
      charGroup.add(monumentalStatue);
      return;
    }

    const url = fileCandidates[fileIdx++];
    loader.load(
      url,
      (gltf) => {
        const rawModel = gltf.scene;
        optimizeGlbModel(rawModel);
        const fitted = normalizeModelTransform(rawModel, finalHeight);
        charGroup.add(fitted);

        fitted.updateMatrixWorld(true);
        if (typeof window !== 'undefined' && window.__museumHitboxManager) {
          window.__museumHitboxManager.createTightClickHitbox(fitted, {
            loreKey: 'thanh_giong',
            isBookPortal: false,
            padding: 0.12
          });
        }
      },
      undefined,
      () => {
        tryLoadNextGlb();
      }
    );
  };

  tryLoadNextGlb();
  root.add(charGroup);

  // Tia sáng hào quang khổng lồ bao trọn tượng Gióng và bệ đá
  const beamTex = ProceduralMats.getLightBeamMaterial?.()?.map || flameSpriteTex;
  const beamMat = new THREE.MeshBasicMaterial({
    map: beamTex,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const mainEpicBeam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 3.8, 8.8, 16, 1, true), beamMat);
  mainEpicBeam.position.set(0, 5.2, 0);
  root.add(mainEpicBeam);

  // =========================================================================
  // 11. HỆ THỐNG 150 HẠT TÀN LỬA VÀNG BAY LÊN (ĐÚNG 1 DRAW CALL)
  // =========================================================================
  const particleCount = 150;
  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 18.0;
    positions[i * 3 + 1] = 0.2 + Math.random() * 7.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 18.0;

    velocities[i * 3]     = (Math.random() - 0.5) * 0.22;
    velocities[i * 3 + 1] = 0.18 + Math.random() * 0.42; // Tốc độ tàn lửa bốc lên
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.22;
  }

  const emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const emberMat = new THREE.PointsMaterial({
    map: flameSpriteTex,
    color: 0xffa028,
    size: 0.38,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const emberPoints = new THREE.Points(emberGeo, emberMat);
  emberPoints.name = 'Epic_150_Golden_Embers_Points';
  root.add(emberPoints);

  // =========================================================================
  // 12. VÒNG LẶP UPDATE HOẠT ẢNH CHO PHÒNG (ANIMATION LOOP)
  // =========================================================================
  root.update = (delta = 0.016, elapsedTime = 0) => {
    // 1. Cập nhật chuyển động 150 hạt tàn lửa bay bốc lên
    const posAttr = emberGeo.attributes.position;
    const posArr = posAttr.array;

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      posArr[idx + 1] += velocities[idx + 1] * delta;
      posArr[idx]     += Math.sin(elapsedTime * 1.8 + i) * 0.005;
      posArr[idx + 2] += Math.cos(elapsedTime * 1.5 + i) * 0.005;

      if (posArr[idx + 1] > 7.6) {
        posArr[idx + 1] = 0.15;
        posArr[idx]     = (Math.random() - 0.5) * 18.0;
        posArr[idx + 2] = (Math.random() - 0.5) * 18.0;
      }
    }
    posAttr.needsUpdate = true;

    // 2. Nhịp thở rực lửa của Vầng Hào Quang Mặt Trời 8.5m & 4 Đỉnh Lửa
    const sunPulse = 1.0 + Math.sin(elapsedTime * 1.8) * 0.05;
    if (epicSun85) {
      epicSun85.scale.set(sunPulse, sunPulse, 1.0);
    }

    const fireFlicker = 1.0 + Math.sin(elapsedTime * 6.5) * 0.12;
    for (let f = 0; f < fireSpriteArray.length; f++) {
      fireSpriteArray[f].scale.set(2.4 * fireFlicker, 3.2 * fireFlicker, 1.0);
    }

    if (bookHalo) {
      bookHalo.scale.set(2.4 * sunPulse, 2.4 * sunPulse, 1.0);
    }

    if (ngocLuDrumFloor) {
      ngocLuDrumFloor.material.opacity = 0.82 + Math.sin(elapsedTime * 2.2) * 0.14;
    }
  };

  // Khả năng tương thích ngược
  root.getGroup = () => root;
  root.getBookMesh = () => bookGroup;
  root.getCollisionObjects = () => [];
  root.setLightsActive = () => {};

  root.traverse((child) => {
    child.layers?.enable?.(1);
  });

  return root;
}
