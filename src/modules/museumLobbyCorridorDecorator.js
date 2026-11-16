import * as THREE from 'three';
import { loadGlbCached } from '../utils/modelLoaderHelper.js';
import { upgradeRoomWallArchitecture } from './museumWallArchitectureSystem.js';
import { replaceAllMuseumCarpetsWithTimelinePattern, applyTimelineCarpetToMesh } from './museumCarpetReplacer.js';
import {
  createLobbyCornersLotusPonds,
  createCorridorLiteraryStream
} from './museumLobbyVFXAndArtifacts.js';
import {
  createMuseumSpaceEnrichmentSystem
} from './museumSpaceEnrichmentSystem.js';

const _lobbyBoxScratch = new THREE.Box3();
const _lobbyVecScratch = new THREE.Vector3();

/**
 * ============================================================================
 * MUSEUM GRAND LOBBY & CORRIDORS DECORATOR (60+ FPS)
 * Hệ thống Làm đẹp Toàn diện Đại Sảnh & Hành Lang Bảo Tàng Văn Học 3D
 * 
 * 6 Kỹ năng tích hợp:
 * 1. shader-coloring-artist: Sàn cẩm thạch đen vân vàng, Đại Mandala Trống Đồng 14 cánh,
 *    Thảm lụa thêu hoa sen vàng, 4 Bức phù điêu sơn mài chữ vàng thư pháp
 * 2. mesh-detailing-specialist: Đài Trống Đồng Đông Sơn 3D xoay uy nghi,
 *    Trụ sơn son thếp vàng, Đèn chùm hoàng cung, Lục bình đồng & Chậu cây cảnh
 * 3. environment-lighting-artist: Vòm kính thiên đỉnh (Skylight) & Luồng sáng God-Rays
 *    lập thể rọi thẳng xuống tâm sảnh, PointLight vàng ấm 3000K
 * 4. fps-optimizer: Gộp cột trụ và đèn lồng vào InstancedMesh (1 Draw Call),
 *    zero heavy shadows, CanvasTexture caching
 * 5. threejs-auto-integrator: Chuẩn hóa model .GLB fitAxis: 'y', bảo toàn SRGB
 * 6. camera-director: Cài đặt userData.ignoreRaycaster = true cho toàn bộ vật thể trang trí
 * ============================================================================
 */

const LOBBY_TEX_CACHE = {};

function getLobbyTex(key, w, h, drawFn, repeatX = 1, repeatY = 1) {
  if (LOBBY_TEX_CACHE[key]) return LOBBY_TEX_CACHE[key];
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, w, h);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  if ('colorSpace' in tex && THREE.SRGBColorSpace) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  LOBBY_TEX_CACHE[key] = tex;
  return tex;
}

/**
 * Tự động kiểm tra, chuẩn hóa Geometry & Quét sạch NaN/Infinity (Quy chuẩn AGENTS.md / GEMINI.md)
 */
export function prepGeo(geo) {
  if (!geo) return geo;
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  const pos = geo.getAttribute('position');
  if (pos) {
    for (let i = 0; i < pos.count * pos.itemSize; i++) {
      if (Number.isNaN(pos.array[i]) || !Number.isFinite(pos.array[i])) {
        pos.array[i] = 0;
      }
    }
  }
  const norm = geo.getAttribute('normal');
  if (norm) {
    for (let i = 0; i < norm.count * norm.itemSize; i++) {
      if (Number.isNaN(norm.array[i]) || !Number.isFinite(norm.array[i])) {
        norm.array[i] = 0;
      }
    }
  }
  return geo;
}

/**
 * Chuẩn hóa mô hình .GLB theo chiều cao mục tiêu (fitAxis: 'y') và gắn cờ bỏ qua Raycaster
 */
export function normalizeLobbyGlb(rootScene, targetHeight = 2.0) {
  rootScene.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = false;
    child.receiveShadow = false;
    child.frustumCulled = true;
    child.userData.ignoreRaycaster = true;

    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((m) => {
      if (!m) return;
      if (!m.transparent && !m.alphaTest) {
        m.side = THREE.FrontSide;
      }
      if (m.map && 'colorSpace' in m.map && THREE.SRGBColorSpace && m.map.colorSpace !== THREE.SRGBColorSpace) {
        m.map.colorSpace = THREE.SRGBColorSpace;
        m.map.needsUpdate = true;
      }
    });
  });

  const wrapper = new THREE.Group();
  wrapper.userData.ignoreRaycaster = true;
  rootScene.updateMatrixWorld(true);

  _lobbyBoxScratch.setFromObject(rootScene);
  _lobbyBoxScratch.getSize(_lobbyVecScratch);

  const scale = targetHeight / Math.max(_lobbyVecScratch.y, 0.001);
  rootScene.scale.multiplyScalar(scale);
  rootScene.updateMatrixWorld(true);

  _lobbyBoxScratch.setFromObject(rootScene);
  _lobbyBoxScratch.getCenter(_lobbyVecScratch);

  rootScene.position.x -= _lobbyVecScratch.x;
  rootScene.position.z -= _lobbyVecScratch.z;
  rootScene.position.y -= _lobbyBoxScratch.min.y;

  wrapper.add(rootScene);
  return wrapper;
}

/**
 * 1. SÀN ĐÁ CẨM THẠCH ĐEN VÂN HOÀNG KIM (IMPERIAL NERO MARQUINA MARBLE)
 */
export function createImperialMarbleFloorTexture() {
  return getLobbyTex('lobby_imperial_marble_v3', 1024, 1024, (ctx, w, h) => {
    // Nền đá đen bóng sâu thẳm
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0.0, '#0a080e');
    g.addColorStop(0.35, '#140f1a');
    g.addColorStop(0.7, '#1b1424');
    g.addColorStop(1.0, '#0c0910');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Mây đá tự nhiên
    for (let c = 0; c < 8; c++) {
      const cx = (c % 3) * (w / 3) + Math.random() * 80;
      const cy = Math.floor(c / 3) * (h / 3) + Math.random() * 80;
      const rg = ctx.createRadialGradient(cx, cy, 10, cx, cy, 220);
      rg.addColorStop(0.0, 'rgba(253, 224, 71, 0.06)');
      rg.addColorStop(0.6, 'rgba(217, 119, 6, 0.03)');
      rg.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(cx, cy, 220, 0, Math.PI * 2);
      ctx.fill();
    }

    // Các dải vân đá cẩm thạch vàng kim & hổ phách uốn lượn
    const veinColors = ['#f59e0b', '#fbbf24', '#fef08a', '#d97706'];
    for (let v = 0; v < 16; v++) {
      ctx.strokeStyle = veinColors[v % veinColors.length];
      ctx.globalAlpha = 0.22 + (v % 4) * 0.08;
      ctx.lineWidth = v % 3 === 0 ? 3.5 : 1.5;

      ctx.beginPath();
      let x = (v / 16) * w + (Math.random() - 0.5) * 60;
      let y = 0;
      ctx.moveTo(x, y);

      while (y < h) {
        y += 40 + Math.random() * 50;
        x += (Math.random() - 0.5) * 75;
        ctx.lineTo(x, y);

        // Nhánh vân nhỏ rẽ nhánh
        if (Math.random() > 0.65) {
          const bx = x + (Math.random() - 0.5) * 60;
          const by = y + Math.random() * 40;
          ctx.moveTo(x, y);
          ctx.lineTo(bx, by);
          ctx.moveTo(x, y);
        }
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // Khung viền gạch hoa văn hoàng cung dát đồng thau
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.45)';
    ctx.lineWidth = 6;
    ctx.strokeRect(16, 16, w - 32, h - 32);

    ctx.strokeStyle = 'rgba(253, 224, 71, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, w - 80, h - 80);

    // Họa tiết góc hồi văn
    const cornerSize = 48;
    const corners = [
      [16, 16], [w - 16 - cornerSize, 16],
      [16, h - 16 - cornerSize], [w - 16 - cornerSize, h - 16 - cornerSize]
    ];
    ctx.fillStyle = 'rgba(253, 224, 71, 0.35)';
    corners.forEach(([cx, cy]) => {
      ctx.fillRect(cx, cy, cornerSize, cornerSize);
    });
  }, 8, 8);
}

/**
 * 2. ĐẠI MANDALA TRỐNG ĐỒNG ĐÔNG SƠN 14 CÁNH & MA TRẬN CHỮ CỔ PHÁT SÁNG Ở TÂM SẢNH (0, 0.035, 0)
 * Khôi phục chính xác theo ảnh mẫu 1 của người dùng:
 * - 14 tia sáng mặt trời Đông Sơn phát sáng vàng kim rực rỡ từ chân bệ sách
 * - Vòng ma trận ký tự cổ tri thức di sản & hạt ngọc hào quang xếp tròn đều đặn
 * - Vành răng cưa Đông Sơn và 18 chim Lạc bay ngược chiều kim đồng hồ
 */
export function createDongSonCenterMandalaTexture() {
  return getLobbyTex('lobby_dongson_mandala_v5_ancient_matrix', 1024, 1024, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const R = w * 0.49; // Bán kính tối đa 501px

    // 1. Hào quang vàng kim lan tỏa từ tâm ra viền (Core to boundary glow)
    const glow = ctx.createRadialGradient(cx, cy, 15, cx, cy, R);
    glow.addColorStop(0.00, 'rgba(254, 240, 138, 0.95)'); // Sáng rực rỡ tâm bệ sách
    glow.addColorStop(0.35, 'rgba(250, 204, 21, 0.65)');  // Vàng hổ phách ấm
    glow.addColorStop(0.65, 'rgba(217, 119, 6, 0.38)');   // Đồng thau hoàng gia
    glow.addColorStop(0.88, 'rgba(180, 83, 9, 0.18)');
    glow.addColorStop(1.00, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();

    // 2. 14 TIA SÁNG MẶT TRỜI ĐÔNG SƠN PHÁT SÁNG RỰC RỠ (14 RADIANT SUNBURST RAYS)
    const rayCount = 14;
    const rBase = R * 0.36; // Bắt đầu ló ra từ chân bệ sách
    const rTip = R * 0.58;  // Đâm nhọn vươn xa
    const halfWidthAngle = (Math.PI / rayCount) * 0.55;

    for (let i = 0; i < rayCount; i++) {
      const angle = (i * 2 * Math.PI) / rayCount - Math.PI / 2;
      const tipX = cx + Math.cos(angle) * rTip;
      const tipY = cy + Math.sin(angle) * rTip;
      const leftX = cx + Math.cos(angle - halfWidthAngle) * rBase;
      const leftY = cy + Math.sin(angle - halfWidthAngle) * rBase;
      const rightX = cx + Math.cos(angle + halfWidthAngle) * rBase;
      const rightY = cy + Math.sin(angle + halfWidthAngle) * rBase;

      // Tia sáng chính dạng tam giác nhọn phát sáng
      const rayGrad = ctx.createLinearGradient(
        cx + Math.cos(angle) * rBase, cy + Math.sin(angle) * rBase,
        tipX, tipY
      );
      rayGrad.addColorStop(0.0, '#fef08a');
      rayGrad.addColorStop(0.65, '#facc15');
      rayGrad.addColorStop(1.0, '#ffffff');

      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(leftX, leftY);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(rightX, rightY);
      ctx.closePath();
      ctx.fill();

      // Sống lưng tia sáng phát quang trắng rực
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * (rBase * 1.08), cy + Math.sin(angle) * (rBase * 1.08));
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      // Họa tiết lông công / ngọn lửa phụ xen kẽ giữa 2 tia chính
      const midAngle = angle + Math.PI / rayCount;
      const midR = R * 0.46;
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(cx + Math.cos(midAngle) * midR, cy + Math.sin(midAngle) * midR, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(midAngle) * (rBase * 1.05), cy + Math.sin(midAngle) * (rBase * 1.05));
      ctx.lineTo(cx + Math.cos(midAngle) * (midR + 8), cy + Math.sin(midAngle) * (midR + 8));
      ctx.stroke();
    }

    // 3. VÒNG ĐỒNG TÂM PHÁT SÁNG CHÍNH (LUMINOUS CONCENTRIC TRACK)
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 7;
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.61, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0; // reset

    // 4. VÀNH MA TRẬN KÝ TỰ CỔ & HỌA TIẾT TRI THỨC DI SẢN (ANCIENT SCRIPT MATRIX BAND)
    const rBandInner = R * 0.66;
    const rBandOuter = R * 0.81;

    // Hai vòng biên vàng kim
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(cx, cy, rBandInner, 0, Math.PI * 2);
    ctx.arc(cx, cy, rBandOuter, 0, Math.PI * 2);
    ctx.stroke();

    // 28 Ký tự cổ / Biểu tượng Đông Sơn & Chữ Nôm cách điệu xếp vòng tròn
    const ancientGlyphs = [
      '𐍈', '⊛', '⟡', '꩜', '≋', '🜂', '🜄', '🜁', '🜃', '⊕',
      '⊙', '⧇', '𐌏', '𐌙', '𐌁', '𐌎', '𐌐', '𐌀', '𐌄', '𐌉',
      '𐌍', '𐌔', '𐌖', '𐌕', '𐌂', '𐌇', '𐌊', '𐌋'
    ];
    const glyphR = (rBandInner + rBandOuter) * 0.5;
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 24px "Times New Roman", serif, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ancientGlyphs.forEach((glyph, idx) => {
      const gAngle = (idx * 2 * Math.PI) / ancientGlyphs.length;
      const gx = cx + Math.cos(gAngle) * glyphR;
      const gy = cy + Math.sin(gAngle) * glyphR;

      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(gAngle + Math.PI / 2);
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 10;
      ctx.fillText(glyph, 0, 0);
      ctx.restore();
    });

    // 56 Hạt ngọc hào quang vàng sáng lấp lánh (Golden pearl dots)
    const dotCount = 56;
    const rDot = rBandOuter - 6;
    for (let d = 0; d < dotCount; d++) {
      const dAngle = (d * 2 * Math.PI) / dotCount;
      const dx = cx + Math.cos(dAngle) * rDot;
      const dy = cy + Math.sin(dAngle) * rDot;

      ctx.fillStyle = d % 2 === 0 ? '#ffffff' : '#fef08a';
      ctx.beginPath();
      ctx.arc(dx, dy, d % 2 === 0 ? 3.5 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 5. VÀNH RĂNG CƯA ĐÔNG SƠN NGOÀI CÙNG (SAWTOOTH SUNBURST RIM)
    const teethCount = 70;
    const rTeethIn = R * 0.83;
    const rTeethOut = R * 0.89;
    ctx.fillStyle = '#facc15';
    for (let t = 0; t < teethCount; t++) {
      const a1 = (t / teethCount) * Math.PI * 2;
      const a2 = ((t + 0.5) / teethCount) * Math.PI * 2;
      const a3 = ((t + 1) / teethCount) * Math.PI * 2;

      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a1) * rTeethIn, cy + Math.sin(a1) * rTeethIn);
      ctx.lineTo(cx + Math.cos(a2) * rTeethOut, cy + Math.sin(a2) * rTeethOut);
      ctx.lineTo(cx + Math.cos(a3) * rTeethIn, cy + Math.sin(a3) * rTeethIn);
      ctx.closePath();
      ctx.fill();
    }

    // Vòng chỉ ngoài cùng
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, R * 0.90, 0, Math.PI * 2);
    ctx.stroke();

    // 6. 18 CON CHIM LẠC BAY NGƯỢC CHIỀU KIM ĐỒNG HỒ Ở VIỀN NGOÀI
    const birdCount = 18;
    const rBird = R * 0.94;
    ctx.fillStyle = '#fde047';
    for (let b = 0; b < birdCount; b++) {
      const bAngle = (b * 2 * Math.PI) / birdCount;
      const bx = cx + Math.cos(bAngle) * rBird;
      const by = cy + Math.sin(bAngle) * rBird;

      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(bAngle + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(6, 6);
      ctx.lineTo(0, 3);
      ctx.lineTo(-6, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  });
}

/**
 * 3. THẢM LỤA ĐỎ THÊU HOA SEN VÀNG TRẢI DỌC CÁC HÀNH LANG (ROYAL CARPET)
 */
export function createCorridorRoyalCarpetTexture() {
  return getLobbyTex('corridor_royal_carpet_v3', 512, 1024, (ctx, w, h) => {
    // Nền nhung đỏ hoàng gia quý phái
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0.0, '#3f0707');
    g.addColorStop(0.12, '#7f1d1d');
    g.addColorStop(0.5, '#991b1b');
    g.addColorStop(0.88, '#7f1d1d');
    g.addColorStop(1.0, '#3f0707');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Diềm họa tiết dát vàng hai bên mép thảm
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 12;
    ctx.strokeRect(20, 0, w - 40, h);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 5;
    ctx.strokeRect(38, 0, w - 76, h);

    // Dải hoa sen vàng 8 cánh cách điệu dọc tâm thảm
    const lotusSpacing = 256;
    for (let y = 128; y < h; y += lotusSpacing) {
      // Hào quang hoa sen
      const lotusGlow = ctx.createRadialGradient(w / 2, y, 10, w / 2, y, 75);
      lotusGlow.addColorStop(0.0, 'rgba(254, 240, 138, 0.45)');
      lotusGlow.addColorStop(0.7, 'rgba(234, 179, 8, 0.20)');
      lotusGlow.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
      ctx.fillStyle = lotusGlow;
      ctx.beginPath();
      ctx.arc(w / 2, y, 75, 0, Math.PI * 2);
      ctx.fill();

      // 8 Cánh sen dát vàng
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 4;
      ctx.fillStyle = 'rgba(253, 224, 71, 0.35)';
      for (let p = 0; p < 8; p++) {
        const pa = (p * Math.PI) / 4;
        const px = w / 2 + Math.cos(pa) * 38;
        const py = y + Math.sin(pa) * 38;

        ctx.beginPath();
        ctx.arc(px, py, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Nhụy sen trung tâm
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(w / 2, y, 18, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 1, 4);
}

/**
 * 4. TRANH PHÙ ĐIÊU SƠN MÀI TREO TƯỜNG HÀNH LANG KHẮC THƠ BẢO TÀNG
 */
export function createCorridorLacquerMural(title, verse) {
  const tex = getLobbyTex(`lobby_mural_v3_${title}`, 512, 256, (ctx) => {
    ctx.save();
    ctx.scale(0.5, 0.5);
    const w = 1024;
    const h = 512;
    // Nền sơn mài đỏ then son truyền thống
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0.0, '#1c0707');
    bg.addColorStop(0.5, '#380d0d');
    bg.addColorStop(1.0, '#140505');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Khung gỗ mun thếp vàng chạm hoa sen
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 14;
    ctx.strokeRect(16, 16, w - 32, h - 32);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.strokeRect(36, 36, w - 72, h - 72);

    // Tiêu đề tác phẩm
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 42px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText(`❖ ${title} ❖`, w / 2, 165);

    // Câu thơ kinh điển
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'italic 30px "Times New Roman", serif';
    ctx.fillText(verse, w / 2, 285);
    ctx.restore();
  });

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 2.8),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide })
  );
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.ignoreRaycaster = true;
  return mesh;
}

/**
 * 5. ĐÀI TRỐNG ĐỒNG ĐÔNG SƠN 3D XOAY NHẸ Ở TÂM ĐẠI SẢNH
 */
export function createCentralDongSonMonument() {
  const monumentGroup = new THREE.Group();
  monumentGroup.name = 'Lobby_Central_DongSon_Monument';
  monumentGroup.userData.ignoreRaycaster = true;

  // Bệ đá bát giác 3 tầng cẩm thạch đen viền vàng hoàng kim (tối giản phân đoạn, FrontSide)
  const stepConfigs = [
    { radius: 4.8, height: 0.32, color: 0x140f1a, rimColor: 0xfacc15 },
    { radius: 3.8, height: 0.32, color: 0x1e1528, rimColor: 0xf59e0b },
    { radius: 2.8, height: 0.34, color: 0x78350f, rimColor: 0xfde047 }
  ];

  let currentY = 0;
  stepConfigs.forEach((cfg) => {
    const step = new THREE.Mesh(
      new THREE.CylinderGeometry(cfg.radius, cfg.radius + 0.22, cfg.height, 16),
      new THREE.MeshStandardMaterial({
        color: cfg.color,
        metalness: 0.65,
        roughness: 0.25,
        side: THREE.FrontSide
      })
    );
    step.position.y = currentY + cfg.height * 0.5;
    step.castShadow = false;
    step.receiveShadow = false;
    step.userData.ignoreRaycaster = true;

    // Viền kim loại dát vàng
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(cfg.radius + 0.05, 0.045, 6, 20),
      new THREE.MeshStandardMaterial({
        color: cfg.rimColor,
        metalness: 0.85,
        roughness: 0.2,
        emissive: 0x713f12,
        emissiveIntensity: 0.3,
        side: THREE.FrontSide
      })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = currentY + cfg.height;
    rim.castShadow = false;
    rim.receiveShadow = false;
    rim.userData.ignoreRaycaster = true;

    monumentGroup.add(step, rim);
    currentY += cfg.height;
  });

  // Đã bỏ hoàn toàn khối trống đồng & vòng hào quang xoay tròn ở tâm sảnh theo yêu cầu người dùng
  monumentGroup.userData.rotatingPart = null;

  monumentGroup.updateMatrixWorld(true);
  if (typeof window !== 'undefined' && window.__museumHitboxManager) {
    window.__museumHitboxManager.registerSolidObjectCollider(monumentGroup, {
      shrinkFactor: 0.92,
      tag: 'Central_DongSon_Drum_Monument'
    });
  }

  return monumentGroup;
}

/**
 * 6. HÀNG CỘT TRỤ SƠN SON THẾP VÀNG & ĐÈN LỒNG HOÀNG CUNG (INSTANCED MESH - 1 DRAW CALL)
 */
export function createInstancedCorridorPillarsAndLanterns(pillarPositions = [], pillarHeight = 9.2) {
  const group = new THREE.Group();
  group.name = 'Instanced_Corridor_Pillars_And_Lanterns';
  group.userData.ignoreRaycaster = true;
  const count = pillarPositions.length;
  if (count === 0) return group;

  // Thân cột sơn mài đỏ son hoàng cung
  const shaftGeo = prepGeo(new THREE.CylinderGeometry(0.44, 0.48, pillarHeight, 10));
  const shaftMat = new THREE.MeshStandardMaterial({
    color: 0x7f1d1d,
    roughness: 0.32,
    metalness: 0.35,
    side: THREE.FrontSide
  });

  // Chân đế & Đỉnh cột đấu củng thếp vàng
  const capGeo = prepGeo(new THREE.CylinderGeometry(0.66, 0.66, 0.48, 10));
  const capMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.22,
    metalness: 0.85,
    emissive: 0x713f12,
    emissiveIntensity: 0.35,
    side: THREE.FrontSide
  });

  // Chao đèn lồng hoàng cung phát sáng trên đỉnh hàng cột
  const lanternGeo = prepGeo(new THREE.CylinderGeometry(0.38, 0.48, 0.50, 8));
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.85,
    roughness: 0.32,
    metalness: 0.20,
    transparent: true,
    opacity: 0.95,
    side: THREE.FrontSide
  });

  const shaftInst = new THREE.InstancedMesh(shaftGeo, shaftMat, count);
  const baseInst = new THREE.InstancedMesh(capGeo, capMat, count);
  const topInst = new THREE.InstancedMesh(capGeo, capMat, count);
  const lanternInst = new THREE.InstancedMesh(lanternGeo, lanternMat, count);
  lanternInst.visible = true;

  const instBoundingSphere = new THREE.Sphere(new THREE.Vector3(0, pillarHeight * 0.5, 0), 30);
  [shaftInst, baseInst, topInst, lanternInst].forEach((inst) => {
    inst.castShadow = false;
    inst.receiveShadow = false;
    inst.frustumCulled = true;
    inst.boundingSphere = instBoundingSphere;
    inst.matrixAutoUpdate = false;
    inst.updateMatrix();
    inst.userData.ignoreRaycaster = true;
  });

  const dummy = new THREE.Object3D();
  pillarPositions.forEach((pos, i) => {
    // Thân cột
    dummy.position.set(pos.x, pillarHeight * 0.5, pos.z);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    shaftInst.setMatrixAt(i, dummy.matrix);

    // Chân đế vàng
    dummy.position.set(pos.x, 0.24, pos.z);
    dummy.updateMatrix();
    baseInst.setMatrixAt(i, dummy.matrix);

    // Đỉnh cột vàng
    dummy.position.set(pos.x, pillarHeight - 0.24, pos.z);
    dummy.updateMatrix();
    topInst.setMatrixAt(i, dummy.matrix);

    // Chao đèn lồng phát sáng trên đỉnh Hàng Cột Gỗ Lim
    dummy.position.set(pos.x, pillarHeight + 0.18, pos.z);
    dummy.updateMatrix();
    lanternInst.setMatrixAt(i, dummy.matrix);
  });

  shaftInst.instanceMatrix.needsUpdate = true;
  baseInst.instanceMatrix.needsUpdate = true;
  topInst.instanceMatrix.needsUpdate = true;
  lanternInst.instanceMatrix.needsUpdate = true;

  // Đăng ký Hitbox vật cản cho Hàng Cột Cung Đình với shrinkFactor: 0.92 (Skill: hitbox-collision-architect)
  if (typeof window !== 'undefined' && window.__museumHitboxManager) {
    const colRadius = 0.66 * 0.92;
    pillarPositions.forEach((pos, i) => {
      const pBox = new THREE.Box3(
        new THREE.Vector3(pos.x - colRadius, 0, pos.z - colRadius),
        new THREE.Vector3(pos.x + colRadius, pillarHeight, pos.z + colRadius)
      );
      window.__museumHitboxManager.registerSolidObjectCollider(null, {
        customBox: pBox,
        tag: `Imperial_Pillar_${i}`
      });
    });
  }

  group.add(shaftInst, baseInst, topInst, lanternInst);
  return group;
}

/**
 * 7. VÒM KÍNH THIÊN ĐỈNH & CHÙM TIA SÁNG THỂ TÍCH GOD-RAYS RỌI TÂM SẢNH (NỘI THẤT)
 */
export function createLobbySkylightAndGodRays(skylightApex = 28.0) {
  const lightGroup = new THREE.Group();
  lightGroup.name = 'Lobby_Skylight_And_GodRays';
  lightGroup.userData.ignoreRaycaster = true;

  // Khung giếng trời bát giác âm trần (phẳng sát trần nội thất Y = 28m, TUYỆT ĐỐI không chọc thủng mái ngói ra ngoài)
  const ceilingSkylightFrame = new THREE.Mesh(
    new THREE.RingGeometry(4.2, 6.8, 8),
    new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.85,
      roughness: 0.25,
      side: THREE.FrontSide
    })
  );
  ceilingSkylightFrame.rotation.x = Math.PI / 2;
  ceilingSkylightFrame.position.y = 28.2;
  ceilingSkylightFrame.castShadow = false;
  ceilingSkylightFrame.receiveShadow = false;
  ceilingSkylightFrame.userData.ignoreRaycaster = true;
  lightGroup.add(ceilingSkylightFrame);

  // Kính giếng trời âm trần phát quang dịu mát
  const ceilingGlass = new THREE.Mesh(
    new THREE.CircleGeometry(4.2, 8),
    new THREE.MeshBasicMaterial({
      color: 0xfef9c3,
      transparent: true,
      opacity: 0.35,
      side: THREE.FrontSide
    })
  );
  ceilingGlass.rotation.x = Math.PI / 2;
  ceilingGlass.position.y = 28.22;
  ceilingGlass.castShadow = false;
  ceilingGlass.receiveShadow = false;
  ceilingGlass.userData.ignoreRaycaster = true;
  lightGroup.add(ceilingGlass);

  // Chùm tia sáng thể tích God-Rays dốc từ trần xuống tâm đài Trống Đồng
  const rayTex = getLobbyTex('lobby_godray_v3', 64, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0.0, 'rgba(254, 240, 138, 0.75)');
    g.addColorStop(0.35, 'rgba(253, 224, 71, 0.35)');
    g.addColorStop(0.75, 'rgba(234, 179, 8, 0.12)');
    g.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  const mainRay = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 7.8, 28.0, 16, 1, true),
    new THREE.MeshBasicMaterial({
      map: rayTex,
      color: 0xfde047,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  mainRay.position.set(0, 14.0, 0);
  mainRay.castShadow = false;
  mainRay.receiveShadow = false;
  mainRay.userData.ignoreRaycaster = true;
  lightGroup.add(mainRay);
  lightGroup.userData.godRayMesh = mainRay;

  return lightGroup;
}

/**
 * 8. TỰ ĐỘNG NẠP CẢ 4 MODEL .GLB TỪ POLY HAVEN (VÀ DỰ PHÒNG PROCEDURAL)
 */
function placeInstancedLobbyGlb(baseObj, spots, yOffset, targetGroup, targetHeight = 2.0) {
  baseObj.updateMatrixWorld(true);
  const invRoot = baseObj.matrixWorld.clone().invert();
  const relMatrix = new THREE.Matrix4();
  const spotMatrix = new THREE.Matrix4();
  const finalMatrix = new THREE.Matrix4();

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < spots.length; i++) {
    const s = spots[i];
    if (s.x < minX) minX = s.x;
    if (s.x > maxX) maxX = s.x;
    if (s.z < minZ) minZ = s.z;
    if (s.z > maxZ) maxZ = s.z;
  }
  const cx = (minX + maxX) * 0.5;
  const cy = yOffset + targetHeight * 0.5;
  const cz = (minZ + maxZ) * 0.5;
  const rx = (maxX - minX) * 0.5 + 2.0;
  const ry = targetHeight * 0.5 + 1.0;
  const rz = (maxZ - minZ) * 0.5 + 2.0;
  const sharedBounds = new THREE.Sphere(new THREE.Vector3(cx, cy, cz), Math.sqrt(rx * rx + ry * ry + rz * rz));

  baseObj.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;
    const mat = Array.isArray(child.material) ? child.material[0] : child.material;
    if (!mat) return;
    if (!mat.transparent && !mat.alphaTest) {
      mat.side = THREE.FrontSide;
    }
    if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
    if (!child.geometry.boundingSphere) child.geometry.computeBoundingSphere();

    relMatrix.multiplyMatrices(invRoot, child.matrixWorld);
    const inst = new THREE.InstancedMesh(child.geometry, mat, spots.length);
    for (let i = 0; i < spots.length; i++) {
      spotMatrix.makeTranslation(spots[i].x, yOffset, spots[i].z);
      finalMatrix.multiplyMatrices(spotMatrix, relMatrix);
      inst.setMatrixAt(i, finalMatrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    inst.castShadow = false;
    inst.receiveShadow = false;
    inst.frustumCulled = true;
    inst.boundingSphere = sharedBounds;
    inst.matrixAutoUpdate = false;
    inst.updateMatrix();
    inst.userData.ignoreRaycaster = true;
    targetGroup.add(inst);
  });
}

export function populateLobbyGlbProps(targetGroup) {
  // 1. wooden_pedestal.glb (8 đôn gỗ trưng bày nép sát hàng cột, giải phóng 100% thảm đỏ)
  const pedestalSpots = [
    { x: -9.5, z: -10.5 }, { x: 9.5, z: -10.5 },
    { x: -9.5, z: 10.5 },  { x: 9.5, z: 10.5 },
    { x: -14.5, z: -5.0 }, { x: -14.5, z: 5.0 },
    { x: 14.5, z: -5.0 },  { x: 14.5, z: 5.0 }
  ];

  loadGlbCached(['/model/web/wooden_pedestal.glb', '/model/lobby/lobby_pedestal.glb'], {
    maxTextureSize: 512,
    disableMipmaps: true,
    clone: true
  })
    .then((sceneObj) => {
      const basePedestal = normalizeLobbyGlb(sceneObj, 1.05);
      placeInstancedLobbyGlb(basePedestal, pedestalSpots, 0, targetGroup, 1.05);
    })
    .catch(() => {
      // Fallback: Đôn gỗ bát giác procedural (InstancedMesh)
      const pGeo = new THREE.CylinderGeometry(0.48, 0.55, 1.05, 8);
      const pMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.3, metalness: 0.2, side: THREE.FrontSide });
      const inst = new THREE.InstancedMesh(pGeo, pMat, pedestalSpots.length);
      const m = new THREE.Matrix4();
      pedestalSpots.forEach((spot, idx) => {
        m.makeTranslation(spot.x, 0.525, spot.z);
        inst.setMatrixAt(idx, m);
      });
      inst.instanceMatrix.needsUpdate = true;
      inst.castShadow = false;
      inst.receiveShadow = false;
      inst.frustumCulled = true;
      inst.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.525, 0), 20);
      inst.userData.ignoreRaycaster = true;
      targetGroup.add(inst);
    });

  // 2. antique_vase.glb (8 lục bình đồng cổ đặt trên đôn - InstancedMesh)
  loadGlbCached(['/model/web/antique_vase.glb', '/model/lobby/lobby_vase.glb'], {
    maxTextureSize: 512,
    disableMipmaps: true,
    clone: true
  })
    .then((sceneObj) => {
      const baseVase = normalizeLobbyGlb(sceneObj, 1.75);
      placeInstancedLobbyGlb(baseVase, pedestalSpots, 1.05, targetGroup, 1.75);
    })
    .catch(() => {
      // Fallback: Lục bình gốm dát vàng (InstancedMesh)
      const points = [
        new THREE.Vector2(0.0, 0.0),
        new THREE.Vector2(0.36, 0.05),
        new THREE.Vector2(0.26, 0.35),
        new THREE.Vector2(0.48, 0.95),
        new THREE.Vector2(0.20, 1.40),
        new THREE.Vector2(0.34, 1.70)
      ];
      const vaseGeo = new THREE.LatheGeometry(points, 12);
      const vaseMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.25, side: THREE.FrontSide });
      const inst = new THREE.InstancedMesh(vaseGeo, vaseMat, pedestalSpots.length);
      const m = new THREE.Matrix4();
      pedestalSpots.forEach((spot, idx) => {
        m.makeTranslation(spot.x, 1.05, spot.z);
        inst.setMatrixAt(idx, m);
      });
      inst.instanceMatrix.needsUpdate = true;
      inst.castShadow = false;
      inst.receiveShadow = false;
      inst.frustumCulled = true;
      inst.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.9, 0), 20);
      inst.userData.ignoreRaycaster = true;
      targetGroup.add(inst);
    });

  // 3. lobby_plant.glb (8 chậu cây cảnh đặt tại các góc thoáng của đại sảnh - InstancedMesh)
  const plantSpots = [
    { x: -6.5, z: 26.0 },  { x: 6.5, z: 26.0 },   // Hai bên sảnh đón phía Nam (cách thảm đỏ 4.4m)
    { x: -6.5, z: 12.0 },  { x: 6.5, z: 12.0 },   // Nép sát hàng cột phía Nam (cách thảm đỏ 4.4m, cách hành lang 7.0m)
    { x: -6.5, z: -8.0 },  { x: 6.5, z: -8.0 },   // Hai bên lối dẫn lên cầu thang Bắc (cách thảm đỏ 4.4m, cách hành lang 11.0m)
    { x: -14.5, z: 0.0 },  { x: 14.5, z: 0.0 }    // Hai bên cánh gà đại sảnh trung tâm (cách mọi thảm đỏ > 14m)
  ];

  loadGlbCached(['/model/web/lobby_plant.glb', '/model/lobby/lobby_plant.glb'], {
    maxTextureSize: 512,
    disableMipmaps: true,
    clone: true
  })
    .then((sceneObj) => {
      const basePlant = normalizeLobbyGlb(sceneObj, 2.3);
      placeInstancedLobbyGlb(basePlant, plantSpots, 0, targetGroup, 2.3);
    })
    .catch(() => {
      // Fallback: Chậu cây xanh procedural (InstancedMesh)
      const potGeo = new THREE.CylinderGeometry(0.55, 0.42, 0.75, 10);
      const potMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, side: THREE.FrontSide });
      const foliageGeo = new THREE.DodecahedronGeometry(0.9, 0);
      const foliageMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.6, side: THREE.FrontSide });
      const potInst = new THREE.InstancedMesh(potGeo, potMat, plantSpots.length);
      const foliageInst = new THREE.InstancedMesh(foliageGeo, foliageMat, plantSpots.length);
      const m = new THREE.Matrix4();
      plantSpots.forEach((spot, idx) => {
        m.makeTranslation(spot.x, 0.375, spot.z);
        potInst.setMatrixAt(idx, m);
        m.makeTranslation(spot.x, 1.35, spot.z);
        foliageInst.setMatrixAt(idx, m);
      });
      const bounds = new THREE.Sphere(new THREE.Vector3(0, 1.15, 9), 30);
      [potInst, foliageInst].forEach((inst) => {
        inst.instanceMatrix.needsUpdate = true;
        inst.castShadow = false;
        inst.receiveShadow = false;
        inst.frustumCulled = true;
        inst.boundingSphere = bounds;
        inst.userData.ignoreRaycaster = true;
        targetGroup.add(inst);
      });
    });

  // 4. royal_chandelier.glb (Đèn chùm hoàng cung Poly Haven treo vòm sảnh chính)
  loadGlbCached(['/model/web/royal_chandelier.glb', '/model/lobby/lobby_chandelier.glb'], {
    maxTextureSize: 512,
    disableMipmaps: true,
    clone: true
  })
    .then((sceneObj) => {
      const chandelier = normalizeLobbyGlb(sceneObj, 4.2);
      chandelier.position.set(0, 18.5, 0); // Treo ở độ cao 18.5m
      targetGroup.add(chandelier);
      targetGroup.userData.chandelier = chandelier;

      // Xích đồng treo đèn lên đỉnh vòm
      const chainGeo = new THREE.CylinderGeometry(0.04, 0.04, 14.0, 6);
      const chainMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.85, side: THREE.FrontSide });
      const chain = new THREE.Mesh(chainGeo, chainMat);
      chain.position.set(0, 25.5, 0);
      chain.castShadow = false;
      chain.receiveShadow = false;
      chain.userData.ignoreRaycaster = true;
      targetGroup.add(chain);
    })
    .catch(() => {}); // Vòm kính God-Rays đã có luồng sáng trung tâm
}

/**
 * ============================================================================
 * 1. CHIÊNG ĐỒNG / TRỐNG ĐỒNG KHỔNG LỒ (FOCAL BRONZE MEDALLION WALL)
 * Treo ngay trên nhịp chiếu nghỉ Đại Cầu Thang (Z = -16.5m, Y = 5.8m)
 * Khớp hoàn toàn với ảnh tư liệu kiến trúc (media_1794757282430_84f6e25d.jpg)
 * ============================================================================
 */
export function createFocalBronzeMedallionWall() {
  const wallGroup = new THREE.Group();
  wallGroup.name = 'Focal_Bronze_Medallion_Wall';
  wallGroup.position.set(0, 5.8, -16.5);
  wallGroup.userData = { ignoreRaycaster: true, isHeritageDecor: true, isFloor: false };

  // Khung bệ đỡ kiến trúc gỗ lim hoàng gia phía sau (Backdrop Architectural Frame)
  const backdropWoodMat = new THREE.MeshStandardMaterial({
    color: 0x2b150c,
    roughness: 0.38,
    metalness: 0.16,
    side: THREE.FrontSide
  });
  backdropWoodMat.userData = { ignoreRaycaster: true };

  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.22,
    metalness: 0.85,
    emissive: 0x78350f,
    emissiveIntensity: 0.22,
    side: THREE.FrontSide
  });
  goldTrimMat.userData = { ignoreRaycaster: true };

  const backdrop = new THREE.Mesh(
    prepGeo(new THREE.BoxGeometry(7.2, 5.6, 0.22)),
    backdropWoodMat
  );
  backdrop.position.set(0, 0, -0.15);
  backdrop.userData = { ignoreRaycaster: true, isHeritageDecor: true };
  wallGroup.add(backdrop);

  // Viền chỉ đồng mạ vàng bao quanh tấm vách
  const frameMesh = new THREE.Mesh(
    prepGeo(new THREE.BoxGeometry(7.4, 5.8, 0.08)),
    goldTrimMat
  );
  frameMesh.position.set(0, 0, -0.22);
  frameMesh.userData = { ignoreRaycaster: true, isHeritageDecor: true };
  wallGroup.add(frameMesh);

  // 2 Trụ đỡ gỗ sơn son thếp vàng hai bên khung chiêng
  [-3.4, 3.4].forEach((postX) => {
    const post = new THREE.Mesh(
      prepGeo(new THREE.CylinderGeometry(0.20, 0.22, 5.8, 12)),
      new THREE.MeshStandardMaterial({
        color: 0x7f1d1d,
        roughness: 0.32,
        metalness: 0.28,
        side: THREE.FrontSide
      })
    );
    post.position.set(postX, 0, -0.05);
    post.userData = { ignoreRaycaster: true, isHeritageDecor: true };
    wallGroup.add(post);

    // Đế & Đầu trụ mạ vàng
    [-2.9, 2.9].forEach((capY) => {
      const cap = new THREE.Mesh(
        prepGeo(new THREE.CylinderGeometry(0.28, 0.28, 0.18, 12)),
        goldTrimMat
      );
      cap.position.set(postX, capY, -0.05);
      cap.userData = { ignoreRaycaster: true, isHeritageDecor: true };
      wallGroup.add(cap);
    });
  });

  // Xà ngang sơn son chạm trổ treo chiêng
  const crossBeam = new THREE.Mesh(
    prepGeo(new THREE.BoxGeometry(7.2, 0.35, 0.35)),
    backdropWoodMat
  );
  crossBeam.position.set(0, 2.65, 0.05);
  crossBeam.userData = { ignoreRaycaster: true, isHeritageDecor: true };
  wallGroup.add(crossBeam);

  // 2. ĐĨA TRỐNG ĐỒNG / CHIÊNG ĐỒNG KHỔNG LỒ (Đường kính ~ 4.9m, Bán kính discRadius = 2.45m)
  const discRadius = 2.45;
  const medallionTex = getLobbyTex('focal_bronze_gong_medallion_hd', 1024, 1024, (ctx, w, h) => {
    const cx = w * 0.5;
    const cy = h * 0.5;
    const r = w * 0.48;

    // Nền đồng cổ phay xước hoàng gia đa sắc
    const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, r);
    grad.addColorStop(0.0, '#fef08a');
    grad.addColorStop(0.18, '#f59e0b');
    grad.addColorStop(0.45, '#d97706');
    grad.addColorStop(0.72, '#92400e');
    grad.addColorStop(0.92, '#451a03');
    grad.addColorStop(1.0, '#1c0d02');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Ngôi sao mặt trời 14 tia ở tâm trống đồng Đông Sơn
    const sunR = r * 0.28;
    const numRays = 14;
    ctx.fillStyle = '#fef9c3';
    for (let i = 0; i < numRays; i++) {
      const ang = (i / numRays) * Math.PI * 2;
      const nextAng = ((i + 0.5) / numRays) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(ang) * sunR, cy + Math.sin(ang) * sunR);
      ctx.lineTo(cx + Math.cos(nextAng) * (sunR * 0.38), cy + Math.sin(nextAng) * (sunR * 0.38));
      ctx.closePath();
      ctx.fill();
    }

    // Các vòng tròn đồng tâm hoa văn
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, cy, sunR * 0.42, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, sunR * 1.05, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.48, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r * 0.94, 0, Math.PI * 2); ctx.stroke();

    // Vành răng cưa tam giác (Chevron teeth)
    const teethR = r * 0.38;
    const numTeeth = 36;
    ctx.fillStyle = '#fef08a';
    for (let i = 0; i < numTeeth; i++) {
      const ang = (i / numTeeth) * Math.PI * 2;
      const tx = cx + Math.cos(ang) * teethR;
      const ty = cy + Math.sin(ang) * teethR;
      ctx.fillRect(tx - 3, ty - 3, 6, 6);
    }

    // Vành đàn Chim Lạc bay ngược chiều kim đồng hồ
    const birdRingR = r * 0.60;
    const numBirds = 8;
    ctx.fillStyle = '#fef08a';
    for (let i = 0; i < numBirds; i++) {
      const ang = (i / numBirds) * Math.PI * 2;
      const bx = cx + Math.cos(ang) * birdRingR;
      const by = cy + Math.sin(ang) * birdRingR;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(ang + Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.lineTo(16, 16);
      ctx.lineTo(0, 8);
      ctx.lineTo(-16, 16);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Vòng chấm tròn hạt cườm ngoài cùng
    const dotR = r * 0.84;
    const numDots = 48;
    for (let i = 0; i < numDots; i++) {
      const ang = (i / numDots) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ang) * dotR, cy + Math.sin(ang) * dotR, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  const medallionMat = new THREE.MeshStandardMaterial({
    map: medallionTex,
    roughness: 0.28,
    metalness: 0.86,
    bumpScale: 0.05,
    side: THREE.FrontSide
  });
  medallionMat.userData = { ignoreRaycaster: true };

  const bronzeSideMat = new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.36,
    metalness: 0.82,
    side: THREE.FrontSide
  });
  bronzeSideMat.userData = { ignoreRaycaster: true };

  const centralDisc = new THREE.Mesh(
    prepGeo(new THREE.CylinderGeometry(discRadius, discRadius, 0.22, 64).rotateX(Math.PI / 2)),
    [bronzeSideMat, medallionMat, bronzeSideMat]
  );
  centralDisc.position.set(0, 0, 0.12);
  centralDisc.userData = { ignoreRaycaster: true, isHeritageDecor: true };
  wallGroup.add(centralDisc);

  // Vành đai đồng mạ vàng bọc mép ngoài đĩa chiêng
  const discRim = new THREE.Mesh(
    prepGeo(new THREE.TorusGeometry(discRadius, 0.08, 16, 64)),
    goldTrimMat
  );
  discRim.position.set(0, 0, 0.24);
  discRim.userData = { ignoreRaycaster: true, isHeritageDecor: true };
  wallGroup.add(discRim);

  // Núm chiêng lồi tròn ở tâm (Gong boss) mạ vàng
  const gongBoss = new THREE.Mesh(
    prepGeo(new THREE.CylinderGeometry(0.42, 0.52, 0.16, 24).rotateX(Math.PI / 2)),
    goldTrimMat
  );
  gongBoss.position.set(0, 0, 0.28);
  gongBoss.userData = { ignoreRaycaster: true, isHeritageDecor: true };
  wallGroup.add(gongBoss);

  // Hai vòng khuyên đồng treo chiêng vào xà ngang
  [-0.9, 0.9].forEach((ringX) => {
    const ring = new THREE.Mesh(
      prepGeo(new THREE.TorusGeometry(0.18, 0.04, 8, 20)),
      goldTrimMat
    );
    ring.position.set(ringX, discRadius + 0.12, 0.12);
    ring.userData = { ignoreRaycaster: true, isHeritageDecor: true };
    wallGroup.add(ring);

    // Dây treo đỏ son buộc vào xà ngang
    const strap = new THREE.Mesh(
      prepGeo(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 8)),
      new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.4 })
    );
    strap.position.set(ringX, discRadius + 0.35, 0.08);
    strap.userData.ignoreRaycaster = true;
    wallGroup.add(strap);
  });

  // Ánh sáng hào quang ấm (Halo Warm Light) hắt từ chiêng đồng ra chiếu nghỉ cầu thang
  const haloLight = new THREE.PointLight(0xf59e0b, 3.2, 18);
  haloLight.position.set(0, 0, 0.85);
  wallGroup.add(haloLight);

  return wallGroup;
}

/**
 * ============================================================================
 * 2. ĐÃ BỎ THÁP LẦU BÁT GIÁC GỖ / LỒNG ĐÈN TREO CHIẾU NGHỈ CẦU THANG THEO YÊU CẦU
 * ============================================================================
 */
export function createLobbyOctagonalWoodenTower() {
  const towerGroup = new THREE.Group();
  towerGroup.name = 'Lobby_Octagonal_Wooden_Tower_Pavilion';
  towerGroup.visible = false;
  towerGroup.userData = { ignoreRaycaster: true, isHeritageDecor: false, isFloor: false };
  return towerGroup;
}

/**
 * ============================================================================
 * 4. HAI HOÀNH PHI GỖ SƠN SON THẾP VÀNG NGANG HAI BÊN SẢNH
 * Khớp hoàn toàn với ảnh tư liệu kiến trúc (media_1794757274210_a60752a8.jpg)
 * Cánh Tây (Trái): "VĂN HIẾN THIÊN THU" (X = -7.2m, Y = 6.4m, Z = -8.2m)
 * Cánh Đông (Phải): "VẠN CỔ LƯU PHƯƠNG" (X = +7.2m, Y = 6.4m, Z = -8.2m)
 * ============================================================================
 */
export function createLobbyHorizontalLacqueredBanners() {
  const group = new THREE.Group();
  group.name = 'Lobby_Flanking_Horizontal_Lacquered_Banners';
  group.userData = { ignoreRaycaster: true, isHeritageDecor: true, isFloor: false };

  const banners = [
    {
      name: 'West_Imperial_Lacquered_Banner',
      title: 'VĂN HIẾN THIÊN THU',
      sub: 'Hào Khí Đông A • Tinh Hoa Lạc Hồng',
      pos: [-7.2, 6.4, -8.2],
      rotY: 0.08
    },
    {
      name: 'East_Imperial_Lacquered_Banner',
      title: 'VẠN CỔ LƯU PHƯƠNG',
      sub: 'Sơn Hà Định Phận • Sử Sách Ngàn Năm',
      pos: [7.2, 6.4, -8.2],
      rotY: -0.08
    }
  ];

  banners.forEach((cfg) => {
    const bannerGroup = new THREE.Group();
    bannerGroup.name = cfg.name;
    bannerGroup.position.set(...cfg.pos);
    bannerGroup.rotation.y = cfg.rotY;
    bannerGroup.userData = { ignoreRaycaster: true, isHeritageDecor: true };

    // Mặt hoành phi sơn son thếp vàng
    const bannerTex = getLobbyTex(`hoanh_phi_${cfg.title}`, 1024, 384, (ctx, w, h) => {
      // Nền sơn mài đỏ thắm hoàng cung (Imperial Crimson Lacquer)
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0.0, '#450a0a');
      g.addColorStop(0.3, '#7f1d1d');
      g.addColorStop(0.7, '#991b1b');
      g.addColorStop(1.0, '#450a0a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // Viền kép thếp vàng họa tiết mây cuốn cổ
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 14;
      ctx.strokeRect(10, 10, w - 20, h - 20);

      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 5;
      ctx.strokeRect(24, 24, w - 48, h - 48);

      // 4 Góc trang trí hoa văn kỷ hà / chữ Vạn vàng
      const cornerSize = 40;
      ctx.fillStyle = '#fef08a';
      [
        [28, 28],
        [w - 28 - cornerSize, 28],
        [28, h - 28 - cornerSize],
        [w - 28 - cornerSize, h - 28 - cornerSize]
      ].forEach(([cx, cy]) => {
        ctx.fillRect(cx, cy, cornerSize, 4);
        ctx.fillRect(cx, cy, 4, cornerSize);
      });

      // Chữ Đại Tự Thư Pháp Thếp Vàng
      ctx.font = 'bold 64px "Times New Roman", serif';
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#713f12';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;
      ctx.fillText(cfg.title, w / 2, h / 2 + 12);

      // Dòng chữ phụ trang nghiêm
      ctx.shadowColor = 'transparent';
      ctx.font = 'italic 26px "Times New Roman", serif';
      ctx.fillStyle = '#fde047';
      ctx.fillText(cfg.sub, w / 2, h / 2 + 75);
    });

    const frontMat = new THREE.MeshStandardMaterial({
      map: bannerTex,
      roughness: 0.26,
      metalness: 0.68,
      side: THREE.FrontSide
    });
    frontMat.userData = { ignoreRaycaster: true };

    const woodBackMat = new THREE.MeshStandardMaterial({
      color: 0x2b150c,
      roughness: 0.45,
      metalness: 0.15,
      side: THREE.FrontSide
    });
    woodBackMat.userData = { ignoreRaycaster: true };

    const goldFrameMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.22,
      metalness: 0.88,
      emissive: 0x78350f,
      emissiveIntensity: 0.25,
      side: THREE.FrontSide
    });
    goldFrameMat.userData = { ignoreRaycaster: true };

    const bWidth = 3.6;
    const bHeight = 1.25;
    const bDepth = 0.10;

    // Tấm thân hoành phi gỗ
    const bodyMesh = new THREE.Mesh(
      prepGeo(new THREE.BoxGeometry(bWidth, bHeight, bDepth)),
      [goldFrameMat, goldFrameMat, goldFrameMat, goldFrameMat, frontMat, woodBackMat]
    );
    bodyMesh.userData = { ignoreRaycaster: true, isHeritageDecor: true };
    bannerGroup.add(bodyMesh);

    // Khung nẹp gỗ thếp vàng viền ngoài 3D
    const outerFrame = new THREE.Mesh(
      prepGeo(new THREE.BoxGeometry(bWidth + 0.12, bHeight + 0.12, 0.05)),
      goldFrameMat
    );
    outerFrame.position.set(0, 0, -0.04);
    outerFrame.userData = { ignoreRaycaster: true, isHeritageDecor: true };
    bannerGroup.add(outerFrame);

    // 2 Khuyên đồng treo & Dây thừng lụa đỏ treo lên trần
    [-1.2, 1.2].forEach((cordX) => {
      const ring = new THREE.Mesh(
        prepGeo(new THREE.TorusGeometry(0.09, 0.02, 6, 16)),
        goldFrameMat
      );
      ring.position.set(cordX, bHeight * 0.5 + 0.08, 0);
      ring.userData = { ignoreRaycaster: true, isHeritageDecor: true };
      bannerGroup.add(ring);

      // Dây cáp treo đỏ son thếp vàng kéo lên trần (Y = 18.5m)
      const cordLen = 12.0;
      const cord = new THREE.Mesh(
        prepGeo(new THREE.CylinderGeometry(0.016, 0.016, cordLen, 6)),
        new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.38, metalness: 0.25 })
      );
      cord.position.set(cordX, bHeight * 0.5 + 0.08 + cordLen * 0.5, 0);
      cord.userData = { ignoreRaycaster: true, isHeritageDecor: true };
      bannerGroup.add(cord);
    });

    group.add(bannerGroup);
  });

  return group;
}

/**
 * ============================================================================
 * HÀM CHÍNH ĐƯỢC GỌI TỪ MAIN.JS:
 * decorateMuseumGrandLobbyAndCorridors(container, options)
 * ============================================================================
 */
export function decorateMuseumGrandLobbyAndCorridors(container, {
  lobbySize = 44,
  corridorLength = 32,
  corridorWidth = 8.4,
  wallHeight = 10.0,
  skylightApex = 32.0,
  hitboxManager = null
} = {}) {
  const lobbyGroup = new THREE.Group();
  lobbyGroup.name = 'Museum_Grand_Lobby_And_Corridors';
  lobbyGroup.userData.ignoreRaycaster = true;

  // Đã bỏ sàn 108x108m đè lên Ground_Floor_Marble (126x126m) để tránh 100% overdraw & tốn VRAM 1024x1024.

  // 2. ĐẠI MANDALA TRỐNG ĐỒNG ĐÔNG SƠN 14 CÁNH & MA TRẬN CHỮ CỔ PHÁT SÁNG Ở TÂM SẢNH (0, 0.035, 0)
  // Khôi phục chính xác theo ảnh 1: 14 tia sáng rực rỡ từ chân bệ, vành ma trận ký tự cổ & hạt ngọc
  const centerMandala = new THREE.Mesh(
    new THREE.CircleGeometry(6.8, 64),
    new THREE.MeshBasicMaterial({
      map: createDongSonCenterMandalaTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.FrontSide
    })
  );
  centerMandala.name = 'Grand_Lobby_DongSon_Matrix_Mandala';
  centerMandala.rotation.x = -Math.PI / 2;
  centerMandala.position.set(0, 0.035, 0);
  centerMandala.castShadow = false;
  centerMandala.receiveShadow = false;
  centerMandala.userData.ignoreRaycaster = true;
  lobbyGroup.add(centerMandala);
  lobbyGroup.userData.centerMandala = centerMandala;

  // 2.1. VÒNG CHỈ ĐỊNH TƯƠNG TÁC CYAN / NGỌC BÍCH TRÊN SÀN (Theo đúng ảnh mẫu 1 & 2)
  // Vòng 1: Ngay trước Cuốn Sách Di Sản giữa 2 bệ Đỉnh Đồng (X = 0, Z = 6.8m)
  const cyanRingGeo = new THREE.RingGeometry(1.05, 1.35, 32);
  const cyanRingMat = new THREE.MeshBasicMaterial({
    color: 0x2dd4bf, // Cyan / ngọc bích sáng rực
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    depthWrite: false
  });
  const cyanAnchorRing = new THREE.Mesh(cyanRingGeo, cyanRingMat);
  cyanAnchorRing.name = 'Lobby_Cyan_Interactive_Floor_Ring';
  cyanAnchorRing.rotation.x = -Math.PI / 2;
  cyanAnchorRing.position.set(0, 0.036, 6.8);
  cyanAnchorRing.userData.ignoreRaycaster = true;
  lobbyGroup.add(cyanAnchorRing);

  // Vòng 2: Phía cánh Tây bên ngoài vòng hào quang mandala (X = -5.2m, Z = 0.0m)
  const cyanWestRing = new THREE.Mesh(cyanRingGeo, cyanRingMat.clone());
  cyanWestRing.name = 'Lobby_Cyan_West_Floor_Ring';
  cyanWestRing.rotation.x = -Math.PI / 2;
  cyanWestRing.position.set(-5.2, 0.036, 0);
  cyanWestRing.userData.ignoreRaycaster = true;
  lobbyGroup.add(cyanWestRing);

  // 3. HỆ THỐNG THẢM SẢNH & HÀNH LANG LIỀN MẠCH 100% (SEAMLESS CONTINUOUS IMPERIAL CARPET NETWORK)
  // Thảm dọc trục Bắc - Nam (chạy dọc trục Z)
  const makeCarpetNS = (widthX, lengthZ, yOffset = 0.026) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(widthX, lengthZ),
      new THREE.MeshBasicMaterial()
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = yOffset;
    mesh.userData.ignoreRaycaster = true;
    mesh.userData.isCarpet = true;
    mesh.name = 'Museum_Corridor_Carpet_NS';
    applyTimelineCarpetToMesh(mesh);
    return mesh;
  };

  // Thảm ngang trục Đông - Tây (chạy dọc trục X) - nằm phẳng hoàn toàn trên mặt sàn
  const makeCarpetEW = (lengthX, widthZ, yOffset = 0.025) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(lengthX, widthZ),
      new THREE.MeshBasicMaterial()
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = yOffset;
    mesh.userData.ignoreRaycaster = true;
    mesh.userData.isCarpet = true;
    mesh.name = 'Museum_Corridor_Carpet_EW';
    applyTimelineCarpetToMesh(mesh);
    return mesh;
  };

  // 3.1. Thảm Trục Trung Tâm Phía Nam (Lối Đón Sảnh Chính: Z = +28m đến trước Bệ Sách Z = +4.8m)
  const southEntranceCarpet = makeCarpetNS(4.6, 23.2, 0.026);
  southEntranceCarpet.name = 'Lobby_Main_South_Entrance_Carpet';
  southEntranceCarpet.position.set(0, 0.026, 16.4);
  lobbyGroup.add(southEntranceCarpet);

  // 3.2. Thảm Trục Trung Tâm Phía Bắc (Từ sau Bệ Sách Z = -4.8m đến Đại Cầu Thang Z = -17.5m)
  const northGrandStairCarpet = makeCarpetNS(4.6, 12.7, 0.026);
  northGrandStairCarpet.name = 'Lobby_Main_North_GrandStair_Carpet';
  northGrandStairCarpet.position.set(0, 0.026, -11.15);
  lobbyGroup.add(northGrandStairCarpet);

  // 3.3. Thảm Hành Lang Ngang Bắc - Cánh Tây (Z = -17.15m): Chạy từ tâm giao lộ X = 0 thẳng vào cửa phòng Sơn Tinh - Thủy Tinh (X = -35.0m)
  const stttCarpet = makeCarpetEW(35.0, 5.0, 0.025);
  stttCarpet.name = 'Lobby_West_North_STTT_Carpet';
  stttCarpet.position.set(-17.5, 0.025, -17.15);
  lobbyGroup.add(stttCarpet);

  // 3.4. Thảm Hành Lang Ngang Bắc - Cánh Đông (Z = -17.15m): Chạy từ tâm giao lộ X = 0 thẳng vào cửa phòng Vợ Nhặt (X = +35.0m)
  const voNhatCarpet = makeCarpetEW(35.0, 5.0, 0.025);
  voNhatCarpet.name = 'Lobby_East_North_VoNhat_Carpet';
  voNhatCarpet.position.set(17.5, 0.025, -17.15);
  lobbyGroup.add(voNhatCarpet);

  // 3.5. Thảm Hành Lang Ngang Nam - Cánh Tây (Z = +17.15m): Chạy từ tâm giao lộ X = 0 thẳng vào cửa phòng Truyện Kiều / Thánh Gióng (X = -35.0m)
  const kieuCarpet = makeCarpetEW(35.0, 5.0, 0.025);
  kieuCarpet.name = 'Lobby_West_South_Kieu_Carpet';
  kieuCarpet.position.set(-17.5, 0.025, 17.15);
  lobbyGroup.add(kieuCarpet);

  // 3.6. Thảm Hành Lang Ngang Nam - Cánh Đông (Z = +17.15m): Chạy từ tâm giao lộ X = 0 thẳng vào cửa phòng Nam Quốc Sơn Hà (X = +35.0m)
  const namQuocCarpet = makeCarpetEW(35.0, 5.0, 0.025);
  namQuocCarpet.name = 'Lobby_East_South_NamQuoc_Carpet';
  namQuocCarpet.position.set(17.5, 0.025, 17.15);
  lobbyGroup.add(namQuocCarpet);

  // 3.5. THAY THẾ & ĐỒNG BỘ TOÀN BỘ THẢM SẢNH SANG HỌA TIẾT TRỤC THỜI GIAN
  replaceAllMuseumCarpetsWithTimelinePattern(lobbyGroup);

  // 4. Đài Trống Đồng Đông Sơn 3D ở tâm đại sảnh
  const monument = createCentralDongSonMonument();
  lobbyGroup.add(monument);

  // Đăng ký tương tác Thuyết Minh Hoàng Gia & Âm Thanh 3D cho Trống Đồng
  if (typeof window !== 'undefined') {
    window.__loreGuide?.registerArtifact(monument, 'lobby_dongSonDrum');
    window.__spatialAudio?.attachPositionalSound('lobby_dongSonDrum', monument, {
      fallbackTheme: 'sonTinhThuyTinh',
      refDistance: 8,
      maxDistance: 45
    });
  }

  // 5. Hàng Cột Trụ Sơn Son Thếp Vàng & Đèn Lồng Dọc Hành Lang (InstancedMesh - 1 Draw Call)
  const pillarCoords = [];
  const corridorOffsets = [-24, -18, -12, 12, 18, 24];
  const halfCorridorW = corridorWidth * 0.52;
  corridorOffsets.forEach((d) => {
    // Tránh tuyệt đối đặt cột sơn mài đỏ đè lên hoặc cắt ngang thảm hành lang (vùng Z quanh +-18m)
    if (Math.abs(d) < 15.0) {
      pillarCoords.push(new THREE.Vector3(-halfCorridorW, 0, d));
      pillarCoords.push(new THREE.Vector3(halfCorridorW, 0, d));
    }
    pillarCoords.push(new THREE.Vector3(d, 0, -halfCorridorW));
    pillarCoords.push(new THREE.Vector3(d, 0, halfCorridorW));
  });
  const pillarsAndLanterns = createInstancedCorridorPillarsAndLanterns(pillarCoords, wallHeight);
  lobbyGroup.add(pillarsAndLanterns);

  // 6. 4 Bức Phù Điêu Sơn Mài Khắc Thơ dọc hành lang
  const murals = [
    { title: 'NAM QUỐC SƠN HÀ', loreKey: 'lobby_mural_namQuocSonHa', verse: '“Sông núi nước Nam vua Nam ở • Rành rành định phận tại sách trời”', pos: [-14.5, 4.5, -20.5], rotY: 0 },
    { title: 'HỊCH TƯỚNG SĨ', loreKey: 'lobby_mural_hichTuongSi', verse: '“Ta thường tới bữa quên ăn, nửa đêm vỗ gối, ruột đau như cắt...”', pos: [14.5, 4.5, -20.5], rotY: 0 },
    { title: 'BÌNH NGÔ ĐẠI CÁO', loreKey: 'lobby_mural_binhNgoDaiCao', verse: '“Việc nhân nghĩa cốt ở yên dân • Quân điếu phạt trước lo trừ bạo”', pos: [-14.5, 4.5, 20.5], rotY: Math.PI },
    { title: 'ĐOẠN TRƯỜNG TÂN THANH', loreKey: 'lobby_mural_doanTruongTanThanh', verse: '“Trăm năm trong cõi người ta • Chữ tài chữ mệnh khéo là ghét nhau”', pos: [14.5, 4.5, 20.5], rotY: Math.PI }
  ];
  murals.forEach((m) => {
    const muralMesh = createCorridorLacquerMural(m.title, m.verse);
    muralMesh.position.set(...m.pos);
    muralMesh.rotation.y = m.rotY;
    if (typeof window !== 'undefined') {
      window.__loreGuide?.registerArtifact(muralMesh, m.loreKey);
    }
    lobbyGroup.add(muralMesh);
  });

  // 7. Vòm Kính Thiên Đỉnh & Luồng Sáng God-Rays
  const skylight = createLobbySkylightAndGodRays(skylightApex);
  lobbyGroup.add(skylight);

  // 8. Nạp Toàn Bộ 4 Model 3D (.glb)
  populateLobbyGlbProps(lobbyGroup);

  // 9. Nâng Cấp Kiến Trúc Tường, Phù Điêu Mặt Nguyệt Trống Đồng & Vách Bình Phong Hắt Sáng
  upgradeRoomWallArchitecture(lobbyGroup, { themeKey: 'lobby', isLobby: true });

  // 10. TIỂU CẢNH 2 HỒ SEN NON BỘ GÓC SẢNH CHÍNH (TÂY-BẮC & ĐÔNG-BẮC)
  const lotusPonds = createLobbyCornersLotusPonds({
    hitboxManager: typeof window !== 'undefined' ? window.__museumHitboxManager : null,
    audioManager: typeof window !== 'undefined' ? window.__audioManager : null
  });
  lobbyGroup.add(lotusPonds);

  // 11. HÀNH LANG "DÒNG CHẢY VĂN HỌC": CỘT GỖ LIM, ĐÈN LỒNG, TRANH SƠN MÀI, 5 TỦ KÍNH BẢO VẬT & DÒNG SÔNG CHỮ
  const corridorStream = createCorridorLiteraryStream({
    hitboxManager: typeof window !== 'undefined' ? window.__museumHitboxManager : null,
    loreGuide: typeof window !== 'undefined' ? window.__loreGuide : null
  });
  lobbyGroup.add(corridorStream);

  // 12. HỆ THỐNG ĐẠI QUY HOẠCH & LẤP ĐẦY KHÔNG GIAN BẢO TÀNG (SPACE ENRICHMENT SYSTEM)
  const spaceEnrichmentRes = createMuseumSpaceEnrichmentSystem({
    scene: lobbyGroup,
    hitboxManager: typeof window !== 'undefined' ? window.__museumHitboxManager : null,
    loreGuide: typeof window !== 'undefined' ? window.__loreGuide : null,
    audioManager: typeof window !== 'undefined' ? window.__audioManager : null
  });
  const spaceEnrichment = spaceEnrichmentRes?.rootGroup || spaceEnrichmentRes?.group || spaceEnrichmentRes;
  if (spaceEnrichment && spaceEnrichment.isObject3D) {
    spaceEnrichment.name = 'Museum_Space_Enrichment_Root';
    lobbyGroup.add(spaceEnrichment);
  }

  // 13. PHỤC HỒI CHIÊNG ĐỒNG / TRỐNG ĐỒNG KHỔNG LỒ (Focal Bronze Medallion Wall)
  // Treo ngay trên nhịp chiếu nghỉ Đại Cầu Thang (Z = -16.5m, Y = 5.8m)
  const focalWall = createFocalBronzeMedallionWall();
  lobbyGroup.add(focalWall);

  // 14. Đã bỏ Tháp Lầu Bát Giác Gỗ / Lồng đèn lớn treo chiếu nghỉ cầu thang (Z = -16.5m) theo yêu cầu người dùng
  const octagonalTower = createLobbyOctagonalWoodenTower();

  // 15. TREO 2 HOÀNH PHI GỖ SƠN SON THẾP VÀNG NGANG HAI BÊN SẢNH
  // Cánh Tây: "VĂN HIẾN THIÊN THU" (X = -7.2m, Y = 6.4m, Z = -8.2m)
  // Cánh Đông: "VẠN CỔ LƯU PHƯƠNG" (X = +7.2m, Y = 6.4m, Z = -8.2m)
  const horizontalBanners = createLobbyHorizontalLacqueredBanners();
  lobbyGroup.add(horizontalBanners);

  if (container) {
    container.add(lobbyGroup);
  }

  // Animation vòng lặp
  const updateLobby = (timeSec = performance.now() * 0.001) => {
    // 1. Đài Trống Đồng xoay nhẹ trang nghiêm
    if (monument.userData.rotatingPart) {
      monument.userData.rotatingPart.rotation.y = timeSec * 0.22;
      monument.userData.rotatingPart.position.y = 1.15 + Math.sin(timeSec * 1.5) * 0.04;
    }

    // 2. Luồng sáng God-Rays xoay nhẹ
    if (skylight.userData.godRayMesh) {
      skylight.userData.godRayMesh.rotation.y = timeSec * 0.08;
    }

    // 3. Đèn chùm đung đưa khẽ khàng
    if (lobbyGroup.userData.chandelier) {
      lobbyGroup.userData.chandelier.rotation.y = timeSec * 0.12;
      lobbyGroup.userData.chandelier.rotation.z = Math.sin(timeSec * 1.2) * 0.025;
    }

    // 4. Cập nhật hồ sen & hành lang dòng chảy văn học
    lotusPonds?.userData?.update?.(timeSec);
    corridorStream?.userData?.update?.(timeSec);

    // 5. Cập nhật hệ thống lấp đầy không gian (Living VFX, đom đóm, khói trầm, đèn xoay)
    spaceEnrichment?.userData?.update?.(timeSec);

    // 6. Cập nhật xoay khẽ tháp lầu bát giác nếu có
    if (octagonalTower?.userData?.update) {
      octagonalTower.userData.update(timeSec);
    }

    // 7. Cập nhật Vòng Hào Quang Ma Trận Chữ / Mandala Đông Sơn (xoay nhẹ & thở hào quang)
    if (centerMandala) {
      centerMandala.rotation.z = timeSec * 0.035;
      if (centerMandala.material) {
        centerMandala.material.opacity = 0.85 + Math.sin(timeSec * 1.8) * 0.15;
      }
    }
    if (cyanAnchorRing?.material) {
      cyanAnchorRing.material.opacity = 0.55 + Math.sin(timeSec * 2.5) * 0.15;
    }
    if (cyanWestRing?.material) {
      cyanWestRing.material.opacity = 0.50 + Math.sin(timeSec * 2.5 + 1.2) * 0.15;
    }
  };

  const registerHitboxes = (hb) => {
    lotusPonds?.userData?.registerHitboxes?.(hb);
    corridorStream?.userData?.registerHitboxes?.(hb);
    spaceEnrichment?.userData?.registerHitboxes?.(hb);
  };

  lobbyGroup.userData.registerHitboxes = registerHitboxes;

  return {
    group: lobbyGroup,
    lobbyGroup,
    focalWall,
    octagonalTower,
    horizontalBanners,
    updateLobby,
    registerHitboxes
  };
}
