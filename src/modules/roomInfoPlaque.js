import * as THREE from 'three';

/**
 * ROOM INFO PLAQUE MODULE - HOLOGRAM FLOATING INTERFACE
 * Giao diện Bảng Thông Tin Hiện Vật Hologram Lơ Lửng Giữa Không Trung
 * 
 * ĐẶC TÍNH NỔI BẬT:
 * 1. Nền kính mờ tương lai Dark Glassmorphism (rgba(10, 22, 35, 0.85)).
 * 2. Viền sáng neon hologram sắc xanh ngọc tương lai (#38ef7d) hoặc vàng kim (#ffb84d).
 * 3. Lược bỏ hoàn toàn chân trụ và cột đứng - lơ lửng tự do giữa không trung.
 * 4. depthWrite: false, hiệu ứng xuyên sáng mượt mà, tối ưu hóa tuyệt đối 60+ FPS trên GTX 1050.
 * 5. Hoạt ảnh nhấp nhô lơ lửng (levitation bobbing) và đĩa chiếu phát quang từ mặt sàn.
 */

const HOLO_TEXTURE_CACHE = new Map();

/**
 * Tự động ngắt dòng văn bản tiếng Việt chuẩn xác trên Canvas 2D
 */
function wrapVietnameseText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 10) {
  if (!text) return y;
  const words = text.split(/\s+/);
  let line = '';
  let currentY = y;
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line ? `${line} ${words[n]}` : words[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line, x, currentY);
      line = words[n];
      currentY += lineHeight;
      lineCount++;
      if (lineCount >= maxLines - 1 && n < words.length - 1) {
        line += '...';
        ctx.fillText(line, x, currentY);
        return currentY + lineHeight;
      }
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
  return currentY + lineHeight;
}

/**
 * Vẽ giao diện Hologram công nghệ cao trên Canvas 1024x768
 */
function getHoloCanvasTexture({
  title = '',
  author = '',
  year = '',
  yearLabel = 'Năm sáng tác',
  description = '',
  themeColor = '#38ef7d' // Xanh ngọc neon hologram mặc định
}) {
  const cacheKey = `${title}|${author}|${year}|${themeColor}|${description.slice(0, 30)}`;
  if (HOLO_TEXTURE_CACHE.has(cacheKey)) {
    return HOLO_TEXTURE_CACHE.get(cacheKey);
  }

  if (typeof document === 'undefined') return null;

  const width = 1024;
  const height = 768;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // 1. NỀN KÍNH MỜ CÔNG NGHỆ CAO (DARK GLASSMORPHISM)
  ctx.fillStyle = 'rgba(10, 22, 35, 0.85)';
  ctx.fillRect(0, 0, width, height);

  // Lưới ma trận hạt chấm li ti (Futuristic Matrix Dots)
  ctx.fillStyle = 'rgba(56, 239, 125, 0.04)';
  for (let x = 30; x < width; x += 40) {
    for (let y = 30; y < height; y += 40) {
      ctx.fillRect(x, y, 2, 2);
    }
  }

  // Dải quét Hologram Gradient (Holo scanline sheen)
  const scanGrad = ctx.createLinearGradient(0, 0, 0, height);
  scanGrad.addColorStop(0.0, 'rgba(56, 239, 125, 0.08)');
  scanGrad.addColorStop(0.5, 'rgba(10, 22, 35, 0.0)');
  scanGrad.addColorStop(1.0, 'rgba(56, 239, 125, 0.06)');
  ctx.fillStyle = scanGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. KHUNG VIỀN SÁNG NEON / HOLOGRAM
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 4;
  ctx.shadowColor = themeColor;
  ctx.shadowBlur = 12;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  // Viền phụ mờ bên trong
  ctx.strokeStyle = 'rgba(56, 239, 125, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.shadowBlur = 0;
  ctx.strokeRect(32, 32, width - 64, height - 64);

  // Các góc bracket công nghệ phong cách Sci-Fi
  ctx.fillStyle = themeColor;
  const bSize = 38;
  const bThick = 6;
  const corners = [
    [20, 20, 1, 1],
    [width - 20, 20, -1, 1],
    [20, height - 20, 1, -1],
    [width - 20, height - 20, -1, -1]
  ];
  corners.forEach(([cx, cy, dirX, dirY]) => {
    ctx.fillRect(dirX > 0 ? cx : cx - bSize, cy, bSize, bThick * dirY);
    ctx.fillRect(cx, dirY > 0 ? cy : cy - bSize, bThick * dirX, bSize);
  });

  // 3. THANH THÔNG TIN HỆ THỐNG TRÊN CÙNG (SYSTEM HEADER)
  ctx.fillStyle = themeColor;
  ctx.font = 'bold 18px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('• HOLO-ARCHIVE // VIETNAMESE LITERATURE MUSEUM', 55, 68);

  ctx.textAlign = 'right';
  ctx.fillText('STATUS: SYNCHRONIZED [60 FPS]', width - 55, 68);

  // Đường line chia phân tách
  ctx.strokeStyle = 'rgba(56, 239, 125, 0.6)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(55, 86);
  ctx.lineTo(width - 55, 86);
  ctx.stroke();

  // 4. TIÊU ĐỀ TÁC PHẨM (HOLOGRAM TITLE)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px "Cinzel", "Times New Roman", "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = themeColor;
  ctx.shadowBlur = 16;
  ctx.fillText(title.toUpperCase(), width / 2, 146);
  ctx.shadowBlur = 0;

  // Thanh gạch phân cách phát sáng
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(width * 0.18, 172);
  ctx.lineTo(width * 0.82, 172);
  ctx.stroke();

  // Điểm phát quang trang trí tâm tiêu đề
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(width / 2, 172, 4, 0, Math.PI * 2);
  ctx.fill();

  // 5. THÔNG TIN METADATA: TÁC GIẢ & NĂM SÁNG TÁC
  const metaY = 225;
  ctx.textAlign = 'left';

  // Khối Tác Giả
  ctx.fillStyle = '#8be9fd';
  ctx.font = 'bold 26px "Georgia", "Times New Roman", serif';
  ctx.fillText('Tác giả:', 75, metaY);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'italic 26px "Georgia", "Times New Roman", serif';
  ctx.fillText(author, 185, metaY);

  // Khối Thời Gian
  ctx.fillStyle = '#8be9fd';
  ctx.font = 'bold 26px "Georgia", "Times New Roman", serif';
  ctx.fillText(`${yearLabel}:`, 75, metaY + 48);

  ctx.fillStyle = '#ffffff';
  ctx.font = '26px "Georgia", "Times New Roman", serif';
  ctx.fillText(year, 75 + ctx.measureText(`${yearLabel}: `).width + 10, metaY + 48);

  // Đường phân cách mỏng
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(75, metaY + 80);
  ctx.lineTo(width - 75, metaY + 80);
  ctx.stroke();

  // 6. NỘI DUNG TÓM TẮT TÁC PHẨM (BODY TEXT TỰ ĐỘNG NGẮT DÒNG)
  ctx.fillStyle = '#e6f1f5';
  ctx.font = '27px/42px "Georgia", "Times New Roman", serif';
  ctx.textAlign = 'left';

  const descStartY = metaY + 125;
  const maxWidth = width - 150; // 874px
  const lineHeight = 44;

  wrapVietnameseText(ctx, description, 75, descStartY, maxWidth, lineHeight, 7);

  // 7. THANH TRẠNG THÁI CUỐI BẢNG (FOOTER TECH BAR)
  const footY = height - 55;
  ctx.fillStyle = 'rgba(56, 239, 125, 0.7)';
  ctx.font = '16px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText('// INTERACTIVE HOLO-PANEL • INDOCHINE DIGITAL TWIN', 65, footY);

  ctx.textAlign = 'right';
  ctx.fillText('ID: KIEU-01 • SECTOR WEST-SOUTH', width - 65, footY);

  // Tạo Three.js CanvasTexture tối ưu hiệu năng
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  HOLO_TEXTURE_CACHE.set(cacheKey, texture);
  return texture;
}

/**
 * XÂY DỰNG MÔ HÌNH BẢNG THÔNG TIN HOLOGRAM LƠ LỬNG
 * @param {Object} options
 * @param {string} options.title - Tiêu đề tác phẩm
 * @param {string} options.author - Tác giả
 * @param {string} options.year - Năm sáng tác
 * @param {string} options.yearLabel - Nhãn thời gian
 * @param {string} options.description - Tóm tắt nội dung
 * @param {string} options.themeColor - Màu neon chủ đạo ('#38ef7d' hoặc '#ffb84d')
 * @param {number} options.width - Chiều rộng bảng hologram (mặc định: 2.2m)
 * @param {number} options.height - Chiều cao bảng hologram (mặc định: 1.55m)
 * @returns {THREE.Group} - Nhóm đối tượng lơ lửng hoàn toàn trong không gian
 */
export function createRoomInfoPlaque({
  title = 'Tác phẩm Văn học',
  author = 'Khuyết danh',
  year = 'Thời kỳ Trung đại',
  yearLabel = 'Năm sáng tác',
  description = 'Kiệt tác văn học tiêu biểu trong kho tàng văn hóa dân tộc.',
  themeColor = '#38ef7d',
  width = 2.2,
  height = 1.55
} = {}) {
  const root = new THREE.Group();
  root.name = `Hologram_Floating_InfoPlaque_${title.replace(/\s+/g, '_')}`;

  // =========================================================================
  // 1. TẤM BẢNG KÍNH HOLOGRAM MỜ XUYÊN SÁNG (FLOATING GLASS PANEL)
  // =========================================================================
  const holoTexture = getHoloCanvasTexture({
    title,
    author,
    year,
    yearLabel,
    description,
    themeColor
  });

  const hologramScreenMat = new THREE.MeshBasicMaterial({
    map: holoTexture,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const panelMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    hologramScreenMat
  );
  panelMesh.name = 'Holo_Screen_Panel';
  root.add(panelMesh);

  // Viền hào quang ánh sáng Neon viền mỏng quanh tấm bảng
  const neonRimMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(themeColor),
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const rimOutline = new THREE.Mesh(
    new THREE.RingGeometry(width * 0.48, width * 0.48 + 0.02, 4),
    neonRimMat
  );
  rimOutline.scale.set(1.04, (height / width) * 1.04, 1.0);
  rimOutline.position.z = -0.005;
  root.add(rimOutline);

  // Khung viền mỏng công nghệ phía sau bảo vệ độ tương phản
  const glassBackingMat = new THREE.MeshBasicMaterial({
    color: 0x050c14,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const glassBacking = new THREE.Mesh(
    new THREE.PlaneGeometry(width + 0.03, height + 0.03),
    glassBackingMat
  );
  glassBacking.position.z = -0.01;
  root.add(glassBacking);

  // =========================================================================
  // 2. ĐĨA CHIẾU PHÁT QUANG MẶT SÀN (FLOOR HOLO EMITTER RING)
  // =========================================================================
  // Nằm tại vị trí chân chiếu lên (relative y = -1.6m để tiếp đất trên sàn)
  const emitterGroup = new THREE.Group();
  emitterGroup.name = 'Holo_Floor_Emitter';
  emitterGroup.position.set(0, -1.65, 0);

  // Vòng tròn đĩa phát quang trên mặt sàn
  const emitterRingMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(themeColor),
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const emitterDisc = new THREE.Mesh(
    new THREE.RingGeometry(0.25, 0.75, 24),
    emitterRingMat
  );
  emitterDisc.rotation.x = -Math.PI / 2;
  emitterDisc.position.y = 0.02;
  emitterGroup.add(emitterDisc);

  // Tâm phát sóng laser tròn
  const emitterCore = new THREE.Mesh(
    new THREE.CircleGeometry(0.18, 16),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  emitterCore.rotation.x = -Math.PI / 2;
  emitterCore.position.y = 0.025;
  emitterGroup.add(emitterCore);

  // Nón tia sáng Hologram mỏng chiếu từ mặt sàn lên đáy bảng
  const beamMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(themeColor),
    transparent: true,
    opacity: 0.12,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const holoBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(width * 0.42, 0.35, 1.65, 16, 1, true),
    beamMat
  );
  holoBeam.position.y = 0.825;
  emitterGroup.add(holoBeam);

  root.add(emitterGroup);

  // =========================================================================
  // 3. HOẠT ẢNH LƠ LỬNG NHẸ NHÀNG (LEVITATION & BOBBING ANIMATION)
  // =========================================================================
  let baseY = 0;
  let isBaseYSet = false;

  root.update = (delta = 0.016, elapsedTime = 0) => {
    if (!isBaseYSet) {
      baseY = root.position.y;
      isBaseYSet = true;
    }

    // Nhấp nhô lơ lửng êm ái giữa không trung (biên độ 2.5cm)
    const floatOffset = Math.sin(elapsedTime * 1.8) * 0.025;
    root.position.y = baseY + floatOffset;

    // Nhịp thở phát quang dịu nhẹ của đường viền neon
    const glowPulse = 0.65 + Math.sin(elapsedTime * 2.4) * 0.15;
    neonRimMat.opacity = glowPulse;
  };

  // Kích hoạt Layer 1 để Camera luôn nhìn thấy
  root.traverse((child) => {
    child.layers?.enable?.(1);
    child.userData.excludeFromCollision = true;
    if (child.isMesh) {
      child.castShadow = false;
      child.receiveShadow = false;
      child.frustumCulled = true;
    }
  });

  return root;
}

export default createRoomInfoPlaque;
