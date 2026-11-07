import * as THREE from 'three';
import { generateSculptedNormalAndAlbedoMaps } from './museumReliefSculptor.js';

/**
 * ============================================================================
 * MUSEUM BRONZE TIMELINE FLOOR & FLANKING RED STEPPED CARPET SYSTEM
 * 
 * Đồng bộ kích hoạt 6 kỹ năng chuyên gia:
 * 1. museum-exhibition-curator:
 *    - Quy hoạch trục dẫn hướng niên đại lịch sử văn học Việt Nam xuyên suốt sảnh chính.
 *    - Bố trí 2 dãy bục bậc thang 3 cấp đối xứng trải thảm nhung đỏ danh dự và đĩa đồng tiêu điểm.
 * 2. ornamental-relief-sculptor:
 *    - Điêu khắc hoa văn trống đồng Đông Sơn, chạm khắc rãnh chìm trục niên đại và chữ sự kiện.
 * 3. shader-coloring-artist:
 *    - Phối màu PBR đồng phay xước (Brushed Bronze) với độ bóng kim loại phản chiếu ánh đèn sảnh,
 *      kết hợp bề mặt đá granite đen bóng gương (Roughness: 0.14) và thảm nhung đỏ thẫm (0x991b1b).
 * 4. cultural-heritage-modeler:
 *    - Tái hiện 5 mốc son văn học Việt Nam:
 *      (2000 TCN Văn Lang, 257 TCN Âu Lạc, 1077 Đại Việt, 1820 Truyện Kiều, 1945 Hiện Đại).
 *    - Đĩa đồng mặt trời 14 tia và đàn chim Lạc bay ngược chiều kim đồng hồ.
 * 5. hitbox-collision-architect:
 *    - Tự động bọc và đăng ký Hitbox Box3 chuẩn xác O(1) cho 2 dãy bục thảm đỏ qua registerSolidObjectCollider().
 *    - Gắn userData.ignoreRaycaster = true trên 100% mắt lưới để tia tương tác không bị lệch.
 * 6. fps-optimizer:
 *    - Bộ nhớ đệm Cache Texture Canvas, gộp vật liệu kim loại dùng chung, duy trì 60+ FPS mượt mà.
 * ============================================================================
 */

export const TIMELINE_MILESTONES = [
  {
    yearBig: '2000',
    unit: 'NĂM TCN',
    era: 'VĂN LANG',
    leftTitle: 'THỜI ĐẠI HÙNG VƯƠNG • VĂN LANG',
    leftSub: 'Sơn Tinh - Thủy Tinh • Con Rồng Cháu Tiên • Dời non lấp biển',
    rightTitle: 'BẢO VẬT TRỐNG ĐỒNG ĐÔNG SƠN',
    rightSub: 'Khởi nguyên nền văn hiến sông Hồng 4.000 năm rực rỡ'
  },
  {
    yearBig: '257',
    unit: 'NĂM TCN',
    era: 'ÂU LẠC',
    leftTitle: 'KỶ NGUYÊN ÂU LẠC • THÀNH CỔ LOA',
    leftSub: 'An Dương Vương xây thành ốc chín vòng kiên cố uy linh',
    rightTitle: 'BI KỊCH NỎ THẦN LIÊN CHÂU',
    rightSub: 'Kim Quy trao vuốt thần • Khúc tráng ca Mỵ Châu - Trọng Thủy'
  },
  {
    yearBig: '1077',
    unit: 'ĐẠI VIỆT',
    era: 'ĐẠI VIỆT',
    leftTitle: 'BẢN TUYÊN NGÔN SÔNG NÚI (1077)',
    leftSub: 'Nam Quốc Sơn Hà • Hào khí Đông A ba lần thắng Nguyên Mông',
    rightTitle: 'BÌNH NGÔ ĐẠI CÁO (1428)',
    rightSub: 'Nguyễn Trãi • Đem đại nghĩa để thắng hung tàn'
  },
  {
    yearBig: '1820',
    unit: 'TRUYỆN KIỀU',
    era: 'TRUYỆN KIỀU',
    leftTitle: 'ĐẠI THI HÀO NGUYỄN DU (1820)',
    leftSub: 'Đoạn Trường Tân Thanh • 3.254 câu lục bát bất hủ',
    rightTitle: 'TINH HOA TIẾNG VIỆT CỔ ĐIỂN',
    rightSub: 'Hồ Xuân Hương • Đoàn Thị Điểm • Chinh Phụ Ngâm'
  },
  {
    yearBig: '1945',
    unit: 'HIỆN ĐẠI',
    era: 'HIỆN ĐẠI',
    leftTitle: 'TUYÊN NGÔN ĐỘC LẬP (1945)',
    leftSub: 'Kỷ nguyên tự do • Ánh sáng văn hóa soi đường quốc dân',
    rightTitle: 'VĂN HỌC HIỆN THỰC & KHÁNG CHIẾN',
    rightSub: 'Kim Lân (Vợ Nhặt) • Nam Cao • Ngô Tất Tố • Thơ Mới'
  }
];

let cachedTimelineMaterial = null;
let cachedMedallionMaterial = null;

/**
 * 1. TẠO BỘ VẬT LIỆU PBR ĐỒNG PHAY XƯỚC (BRUSHED BRONZE) VỚI KHẮC CHÌM TRỤC NIÊN ĐẠI
 * Sử dụng generateSculptedNormalAndAlbedoMaps() để tạo Sobel RGB Normal Map & Bump Map
 */
export function createBronzeTimelineCarpetMaterial() {
  if (cachedTimelineMaterial) return cachedTimelineMaterial;

  const { albedoMap, normalMap, bumpMap } = generateSculptedNormalAndAlbedoMaps(
    'bronze_timeline_walkway_v3',
    2048,
    4096,
    (aCtx, hCtx, w, h) => {
      // --- A. NỀN ĐỒNG VÀNG ÁNH ĐỎ PHAY XƯỚC (BRUSHED BRONZE SLABS) ---
      const bronzeGrad = aCtx.createLinearGradient(0, 0, w, h);
      bronzeGrad.addColorStop(0.0, '#d89f72');
      bronzeGrad.addColorStop(0.25, '#c88a59');
      bronzeGrad.addColorStop(0.5, '#b87544');
      bronzeGrad.addColorStop(0.75, '#c98a58');
      bronzeGrad.addColorStop(1.0, '#d79e70');
      aCtx.fillStyle = bronzeGrad;
      aCtx.fillRect(0, 0, w, h);

      // Heightmap mặc định mức cao (225) cho mặt đồng phẳng kim loại
      hCtx.fillStyle = 'rgb(225, 225, 225)';
      hCtx.fillRect(0, 0, w, h);

      // Hiệu ứng phay xước vi kim loại ngang (Brushed hairline grain)
      aCtx.strokeStyle = 'rgba(65, 30, 10, 0.14)';
      aCtx.lineWidth = 1.8;
      for (let y = 0; y < h; y += 14) {
        aCtx.beginPath();
        aCtx.moveTo(0, y);
        aCtx.lineTo(w, y);
        aCtx.stroke();
      }

      // Khe ghép tấm sàn đồng lớn (Architectural Slab Seams)
      const slabRows = 10;
      const rowH = h / slabRows;
      for (let r = 1; r < slabRows; r++) {
        const y = r * rowH;
        // Rãnh chìm màu đậm
        aCtx.strokeStyle = 'rgba(38, 18, 8, 0.65)';
        aCtx.lineWidth = 6;
        aCtx.beginPath(); aCtx.moveTo(0, y); aCtx.lineTo(w, y); aCtx.stroke();

        // Gờ phản quang nhẹ phía trên khe ghép
        aCtx.strokeStyle = 'rgba(255, 225, 195, 0.28)';
        aCtx.lineWidth = 2;
        aCtx.beginPath(); aCtx.moveTo(0, y - 3); aCtx.lineTo(w, y - 3); aCtx.stroke();

        // Khắc rãnh chìm sâu vào HeightMap
        hCtx.strokeStyle = 'rgb(50, 50, 50)';
        hCtx.lineWidth = 8;
        hCtx.beginPath(); hCtx.moveTo(0, y); hCtx.lineTo(w, y); hCtx.stroke();
      }

      // Khung viền nẹp đồng bao quanh dải sàn
      const marginX = 96;
      aCtx.strokeStyle = '#261408';
      aCtx.lineWidth = 12;
      aCtx.strokeRect(marginX, 45, w - marginX * 2, h - 90);

      hCtx.strokeStyle = 'rgb(30, 30, 30)';
      hCtx.lineWidth = 16;
      hCtx.strokeRect(marginX, 45, w - marginX * 2, h - 90);

      // Tán đinh đồng trang trí (Rivets) ở góc các tấm ghép
      for (let r = 0; r <= slabRows; r++) {
        const ry = Math.max(50, Math.min(h - 50, r * rowH));
        [-1, 1].forEach((dir) => {
          const rx = dir > 0 ? w - marginX + 35 : marginX - 35;
          aCtx.fillStyle = '#1e0e05';
          aCtx.beginPath(); aCtx.arc(rx, ry, 7, 0, Math.PI * 2); aCtx.fill();
          hCtx.fillStyle = 'rgb(245, 245, 245)';
          hCtx.beginPath(); hCtx.arc(rx, ry, 7, 0, Math.PI * 2); hCtx.fill();
        });
      }

      // --- B. TRỤC THỜI GIAN CHÍNH GIỮA (CENTRAL TIMELINE AXIS) ---
      const centerX = w * 0.5;
      aCtx.strokeStyle = '#1e0e05';
      aCtx.lineWidth = 22;
      aCtx.beginPath();
      aCtx.moveTo(centerX, 60);
      aCtx.lineTo(centerX, h - 60);
      aCtx.stroke();

      hCtx.strokeStyle = 'rgb(20, 20, 20)';
      hCtx.lineWidth = 26;
      hCtx.beginPath();
      hCtx.moveTo(centerX, 60);
      hCtx.lineTo(centerX, h - 60);
      hCtx.stroke();

      // --- C. 5 CỘT MỐC LỊCH SỬ VĂN HỌC VIỆT NAM (5 HISTORICAL MILESTONES) ---
      const count = TIMELINE_MILESTONES.length;
      for (let i = 0; i < count; i++) {
        const m = TIMELINE_MILESTONES[i];
        // Phân bổ trục thời gian từ dưới (Cửa đón khách: 2000 TCN) đến trên (Sâu sảnh: 1945)
        const cy = h - 460 - i * ((h - 920) / (count - 1));
        const radius = 152;

        // Nền vòng tròn cột mốc
        aCtx.fillStyle = '#d49666';
        aCtx.beginPath();
        aCtx.arc(centerX, cy, radius, 0, Math.PI * 2);
        aCtx.fill();

        hCtx.fillStyle = 'rgb(230, 230, 230)';
        hCtx.beginPath();
        hCtx.arc(centerX, cy, radius, 0, Math.PI * 2);
        hCtx.fill();

        // Vành đai kép khắc chìm hoa văn răng cưa trống đồng
        [aCtx, hCtx].forEach((ctx, idx) => {
          ctx.strokeStyle = idx === 0 ? '#1e0e05' : 'rgb(15, 15, 15)';
          ctx.lineWidth = 16;
          ctx.beginPath();
          ctx.arc(centerX, cy, radius, 0, Math.PI * 2);
          ctx.stroke();

          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(centerX, cy, radius - 24, 0, Math.PI * 2);
          ctx.stroke();
        });

        // Họa tiết vạch khía răng cưa kiểu trống đồng quanh vành tròn
        const numTicks = 24;
        for (let t = 0; t < numTicks; t++) {
          const ang = (t / numTicks) * Math.PI * 2;
          const cosA = Math.cos(ang);
          const sinA = Math.sin(ang);
          const rIn = radius - 22;
          const rOut = radius - 2;

          aCtx.strokeStyle = '#231207';
          aCtx.lineWidth = 3;
          aCtx.beginPath();
          aCtx.moveTo(centerX + cosA * rIn, cy + sinA * rIn);
          aCtx.lineTo(centerX + cosA * rOut, cy + sinA * rOut);
          aCtx.stroke();

          hCtx.strokeStyle = 'rgb(30, 30, 30)';
          hCtx.lineWidth = 4;
          hCtx.beginPath();
          hCtx.moveTo(centerX + cosA * rIn, cy + sinA * rIn);
          hCtx.lineTo(centerX + cosA * rOut, cy + sinA * rOut);
          hCtx.stroke();
        }

        // Chữ niên đại khắc chìm ở tâm vòng tròn
        aCtx.fillStyle = '#1e0e05';
        aCtx.textAlign = 'center';
        aCtx.textBaseline = 'middle';
        aCtx.font = 'bold 24px "Times New Roman", serif';
        aCtx.fillText('NIÊN ĐẠI', centerX, cy - 54);

        aCtx.font = 'bold 74px "Times New Roman", serif';
        aCtx.fillText(m.yearBig, centerX, cy + 12);

        aCtx.font = 'bold 26px "Times New Roman", serif';
        aCtx.fillText(m.unit, centerX, cy + 64);

        // Khắc chìm năm lớn vào HeightMap để tạo Sobel Normal phản chiếu mạnh
        hCtx.fillStyle = 'rgb(25, 25, 25)';
        hCtx.textAlign = 'center';
        hCtx.textBaseline = 'middle';
        hCtx.font = 'bold 74px "Times New Roman", serif';
        hCtx.fillText(m.yearBig, centerX, cy + 12);

        // Đường nhánh vuông góc dẫn đối xứng ra hai bên mép sàn
        [aCtx, hCtx].forEach((ctx, idx) => {
          ctx.strokeStyle = idx === 0 ? '#261408' : 'rgb(30, 30, 30)';
          ctx.lineWidth = 6;

          // Nhánh Trái
          ctx.beginPath();
          ctx.moveTo(centerX - radius - 12, cy);
          ctx.lineTo(marginX + 45, cy);
          ctx.lineTo(marginX + 45, cy - 85);
          ctx.stroke();

          // Nhánh Phải
          ctx.beginPath();
          ctx.moveTo(centerX + radius + 12, cy);
          ctx.lineTo(w - marginX - 45, cy);
          ctx.lineTo(w - marginX - 45, cy - 85);
          ctx.stroke();
        });

        // Điểm đặt khối chữ đối xứng 2 bên trục
        const leftTextX = (marginX + (centerX - radius - 20)) * 0.5;
        const rightTextX = ((centerX + radius + 20) + (w - marginX)) * 0.5;

        // Đường nẹp trang trí ngang trên và dưới dòng chữ
        const bracketW = 340;
        [aCtx, hCtx].forEach((ctx, idx) => {
          ctx.strokeStyle = idx === 0 ? 'rgba(38, 18, 8, 0.4)' : 'rgb(45, 45, 45)';
          ctx.lineWidth = 2.5;

          ctx.beginPath();
          ctx.moveTo(leftTextX - bracketW * 0.5, cy - 55);
          ctx.lineTo(leftTextX + bracketW * 0.5, cy - 55);
          ctx.moveTo(leftTextX - bracketW * 0.5, cy + 55);
          ctx.lineTo(leftTextX + bracketW * 0.5, cy + 55);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(rightTextX - bracketW * 0.5, cy - 55);
          ctx.lineTo(rightTextX + bracketW * 0.5, cy - 55);
          ctx.moveTo(rightTextX - bracketW * 0.5, cy + 55);
          ctx.lineTo(rightTextX + bracketW * 0.5, cy + 55);
          ctx.stroke();
        });

        // Dòng chữ sự kiện lịch sử & danh tác văn học
        aCtx.fillStyle = '#1e0e05';
        aCtx.textAlign = 'center';
        aCtx.textBaseline = 'middle';
        aCtx.font = 'bold 31px "Times New Roman", serif';
        aCtx.fillText(m.leftTitle, leftTextX, cy - 24);
        aCtx.fillText(m.rightTitle, rightTextX, cy - 24);

        aCtx.font = '24px "Times New Roman", serif';
        aCtx.fillText(m.leftSub, leftTextX, cy + 24);
        aCtx.fillText(m.rightSub, rightTextX, cy + 24);

        // Khắc chìm tiêu đề vào HeightMap để Sobel Normal bắt sáng nổi
        hCtx.fillStyle = 'rgb(35, 35, 35)';
        hCtx.textAlign = 'center';
        hCtx.textBaseline = 'middle';
        hCtx.font = 'bold 31px "Times New Roman", serif';
        hCtx.fillText(m.leftTitle, leftTextX, cy - 24);
        hCtx.fillText(m.rightTitle, rightTextX, cy - 24);
      }
    },
    3.6
  );

  // Cố định không lặp (ClampToEdgeWrapping) để duy trì đúng 1 dải niên đại xuyên suốt sảnh
  [albedoMap, normalMap, bumpMap].forEach((tex) => {
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(1, 1);
    tex.needsUpdate = true;
  });

  cachedTimelineMaterial = new THREE.MeshStandardMaterial({
    map: albedoMap,
    normalMap: normalMap,
    normalScale: new THREE.Vector2(1.5, 1.5),
    bumpMap: bumpMap,
    bumpScale: 0.045,
    roughness: 0.32,   // Ánh đồng phay xước bóng sang trọng
    metalness: 0.78
  });

  return cachedTimelineMaterial;
}

/**
 * 2. TẠO VẬT LIỆU CHO ĐĨA ĐỒNG TRÒN KHỔNG LỒ (FOCAL BRONZE MEDALLION)
 * Họa tiết mặt trời 14 tia sáng và chim Lạc Đông Sơn chạm nổi
 */
export function createFocalBronzeMedallionMaterial() {
  if (cachedMedallionMaterial) return cachedMedallionMaterial;

  const { albedoMap, normalMap, bumpMap } = generateSculptedNormalAndAlbedoMaps(
    'giant_focal_bronze_medallion_v3',
    1024,
    1024,
    (aCtx, hCtx, w, h) => {
      const cx = w * 0.5;
      const cy = h * 0.5;
      const r = w * 0.48;

      // Nền đồng vàng hoàng gia đa sắc
      const grad = aCtx.createRadialGradient(cx, cy, 20, cx, cy, r);
      grad.addColorStop(0.0, '#fde047');
      grad.addColorStop(0.35, '#d97706');
      grad.addColorStop(0.75, '#92400e');
      grad.addColorStop(1.0, '#451a03');
      aCtx.fillStyle = grad;
      aCtx.fillRect(0, 0, w, h);

      hCtx.fillStyle = 'rgb(180, 180, 180)';
      hCtx.fillRect(0, 0, w, h);

      // Ngôi sao mặt trời 14 tia ở tâm trống đồng Đông Sơn
      const sunR = r * 0.3;
      const numRays = 14;
      aCtx.fillStyle = '#fef08a';
      hCtx.fillStyle = 'rgb(255, 255, 255)';

      for (let i = 0; i < numRays; i++) {
        const ang = (i / numRays) * Math.PI * 2;
        const nextAng = ((i + 0.5) / numRays) * Math.PI * 2;
        [aCtx, hCtx].forEach((ctx) => {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(ang) * sunR, cy + Math.sin(ang) * sunR);
          ctx.lineTo(cx + Math.cos(nextAng) * (sunR * 0.36), cy + Math.sin(nextAng) * (sunR * 0.36));
          ctx.closePath();
          ctx.fill();
        });
      }

      // Các vòng tròn đồng tâm phân tách vành hoa văn
      [aCtx, hCtx].forEach((ctx, idx) => {
        ctx.strokeStyle = idx === 0 ? '#451a03' : 'rgb(30, 30, 30)';
        ctx.lineWidth = 12;
        ctx.beginPath(); ctx.arc(cx, cy, sunR * 0.38, 0, Math.PI * 2); ctx.stroke();

        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(cx, cy, sunR, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.54, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.76, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.94, 0, Math.PI * 2); ctx.stroke();
      });

      // Vành Chim Lạc bay ngược chiều kim đồng hồ
      const birdRingR = r * 0.65;
      const numBirds = 8;
      aCtx.fillStyle = '#fef08a';
      hCtx.fillStyle = 'rgb(245, 245, 245)';
      for (let i = 0; i < numBirds; i++) {
        const ang = (i / numBirds) * Math.PI * 2;
        const bx = cx + Math.cos(ang) * birdRingR;
        const by = cy + Math.sin(ang) * birdRingR;
        [aCtx, hCtx].forEach((ctx) => {
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(ang + Math.PI / 2);
          ctx.beginPath();
          ctx.moveTo(0, -26);
          ctx.lineTo(18, 14);
          ctx.lineTo(0, 6);
          ctx.lineTo(-18, 14);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        });
      }
    },
    3.8
  );

  cachedMedallionMaterial = new THREE.MeshStandardMaterial({
    map: albedoMap,
    normalMap: normalMap,
    normalScale: new THREE.Vector2(1.6, 1.6),
    bumpMap: bumpMap,
    bumpScale: 0.05,
    color: 0xd97706,
    emissive: 0x78350f,
    emissiveIntensity: 0.42,
    roughness: 0.28,
    metalness: 0.86
  });

  return cachedMedallionMaterial;
}

/**
 * 3. DỰNG 2 DÃY BỤC THẢM NHUNG ĐỎ 3 BẬC HAI BÊN DẢI SÀN ĐỒNG (FLANKING RED CARPET PLATFORMS)
 */
export function createFlankingRedCarpetPlatforms(hallLength = 32, walkwayWidth = 8.6) {
  const platformsGroup = new THREE.Group();
  platformsGroup.name = 'Flanking_Red_Carpet_Platforms';
  platformsGroup.userData = { ignoreRaycaster: true, isFloor: true };

  // Thảm nhung đỏ thẫm danh dự (0x991b1b) lì sang trọng
  const redCarpetMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b,
    roughness: 0.78,
    metalness: 0.08
  });
  redCarpetMat.userData = { ignoreRaycaster: true, isFloor: true };

  // Nẹp đồng vàng bóng bảo vệ mũi bậc
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.22,
    metalness: 0.88
  });
  goldTrimMat.userData = { ignoreRaycaster: true, isFloor: true };

  const platformLength = Math.min(hallLength * 0.72, 24.0);
  const stepHeight = 0.16;
  const numSteps = 3;

  // Dựng 2 dãy bục đối xứng Trái (-1) và Phải (+1) bám sát mép dải sàn đồng
  [-1, 1].forEach((side) => {
    // Điểm bắt đầu của bục ngay sát mép ngoài của dải nẹp đồng
    const startX = side * (walkwayWidth * 0.5 + 0.15);

    for (let step = 0; step < numSteps; step++) {
      // Bậc thấp nhất rộng nhất (4.6m), các bậc trên thu hẹp dần (4.05m, 3.5m)
      const stepWidth = 4.6 - step * 0.55;
      const stepY = step * stepHeight + stepHeight * 0.5;
      const stepCenterX = startX + side * (step * 0.275 + stepWidth * 0.5);

      // Thân bậc thang thảm đỏ
      const stepMesh = new THREE.Mesh(
        new THREE.BoxGeometry(stepWidth, stepHeight, platformLength),
        redCarpetMat
      );
      stepMesh.position.set(stepCenterX, stepY, -1.5);
      stepMesh.userData = { ignoreRaycaster: true, isFloor: true };
      platformsGroup.add(stepMesh);

      // Nẹp đồng vàng chạy dọc toàn bộ chiều dài mũi bậc thang
      const nosingX = stepCenterX - side * (stepWidth * 0.5);
      const nosingMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.026, platformLength),
        goldTrimMat
      );
      nosingMesh.position.set(nosingX, stepY + stepHeight * 0.5, -1.5);
      nosingMesh.userData = { ignoreRaycaster: true, isFloor: true };
      platformsGroup.add(nosingMesh);
    }
  });

  return platformsGroup;
}

/**
 * 4. DỰNG BỨC TƯỜNG PHÙ ĐIÊU & ĐĨA ĐỒNG TRÒN KHỔNG LỒ PHÁT SÁNG Ở CUỐI TRỤC (FOCAL BRONZE MEDALLION WALL)
 */
export function createFocalBronzeMedallionWall(hallZEnd = -15.5) {
  const wallGroup = new THREE.Group();
  wallGroup.name = 'Focal_Bronze_Medallion_Wall';
  wallGroup.position.set(0, 0, hallZEnd);
  wallGroup.userData = { ignoreRaycaster: true, isFloor: false };

  // Khung tường kiến trúc bệ đỡ phía sau (Backdrop Wall)
  const backdropWallMat = new THREE.MeshStandardMaterial({
    color: 0x161616,
    roughness: 0.18,
    metalness: 0.32
  });
  backdropWallMat.userData = { ignoreRaycaster: true };

  const backdrop = new THREE.Mesh(
    new THREE.BoxGeometry(10.5, 8.5, 0.35),
    backdropWallMat
  );
  backdrop.position.set(0, 4.25, 0);
  backdrop.userData = { ignoreRaycaster: true };
  wallGroup.add(backdrop);

  // Nẹp chỉ đồng viền quanh bức tường tiêu điểm
  const wallFrameMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.24,
    metalness: 0.88
  });
  wallFrameMat.userData = { ignoreRaycaster: true };

  const frameMesh = new THREE.Mesh(
    new THREE.BoxGeometry(10.7, 8.7, 0.12),
    wallFrameMat
  );
  frameMesh.position.set(0, 4.25, -0.15);
  frameMesh.userData = { ignoreRaycaster: true };
  wallGroup.add(frameMesh);

  // Đĩa Đồng Tròn Khổng Lồ (discRadius = 2.65m) chạm khắc Đông Sơn
  const discRadius = 2.65;
  const medallionMat = createFocalBronzeMedallionMaterial();

  const centralDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(discRadius, discRadius, 0.24, 64).rotateX(Math.PI / 2),
    medallionMat
  );
  centralDisc.position.set(0, 4.4, 0.20);
  centralDisc.userData = { ignoreRaycaster: true };
  wallGroup.add(centralDisc);

  // Vành đai đồng mạ vàng bọc mép ngoài đĩa đồng
  const discRim = new THREE.Mesh(
    new THREE.TorusGeometry(discRadius, 0.05, 16, 64),
    wallFrameMat
  );
  discRim.position.set(0, 4.4, 0.32);
  discRim.userData = { ignoreRaycaster: true };
  wallGroup.add(discRim);

  // Ánh sáng hào quang ấm (Halo Warm Light) hắt từ đĩa đồng ra toàn trục hành lang
  const haloLight = new THREE.PointLight(0xfbbf24, 3.8, 22);
  haloLight.position.set(0, 4.4, 1.6);
  wallGroup.add(haloLight);

  return wallGroup;
}

/**
 * 5. HÀM CHÍNH: LẮP ĐẶT ĐỒNG TRỤC THỜI GIAN & BỤC THẢM ĐỎ VÀO ĐẠI SẢNH / HÀNH LANG CHÍNH
 */
export function installMuseumTimelineFloorAndCarpets(targetContainer, {
  hallWidth = 32,
  hallLength = 32,
  walkwayWidth = 8.6,
  includeRedPlatforms = true,
  includeFocalDisc = true,
  hitboxManager = null
} = {}) {
  if (!targetContainer) return null;

  // Xóa bỏ thực thể cũ nếu đã từng cài đặt (Tránh trùng lặp / Memory Leak)
  const existing = targetContainer.getObjectByName('Museum_Timeline_Floor_System');
  if (existing) {
    targetContainer.remove(existing);
  }

  const floorRoot = new THREE.Group();
  floorRoot.name = 'Museum_Timeline_Floor_System';
  floorRoot.userData = { ignoreRaycaster: true, isFloor: true };

  // 1. SÀN ĐÁ GRANITE ĐEN BÓNG GƯƠNG Ở HAI BÊN (Roughness: 0.14)
  const darkGraniteMat = new THREE.MeshStandardMaterial({
    color: 0x141413,
    roughness: 0.14,  // Bóng gương cao cấp phản chiếu ánh sáng và bục thảm đỏ
    metalness: 0.35
  });
  darkGraniteMat.userData = { ignoreRaycaster: true, isFloor: true };

  const baseFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(hallWidth, hallLength).rotateX(-Math.PI / 2),
    darkGraniteMat
  );
  baseFloor.position.y = 0.005;
  baseFloor.userData = { ignoreRaycaster: true, isFloor: true };
  floorRoot.add(baseFloor);

  // 2. DẢI SÀN ĐỒNG TRỤC THỜI GIAN CHÍNH GIỮA (walkwayWidth = 8.6m)
  const timelineMat = createBronzeTimelineCarpetMaterial();
  const sideBronzeMat = new THREE.MeshStandardMaterial({
    color: 0x8a5528,
    roughness: 0.35,
    metalness: 0.82
  });
  sideBronzeMat.userData = { ignoreRaycaster: true, isFloor: true };

  // BoxGeometry 6 mặt: Mặt trên (+Y, index 2) mang hoa văn trục thời gian, các cạnh bên dùng màu đồng phay xước
  const boxMaterials = [
    sideBronzeMat,  // +X
    sideBronzeMat,  // -X
    timelineMat,    // +Y (Top face)
    sideBronzeMat,  // -Y
    sideBronzeMat,  // +Z
    sideBronzeMat   // -Z
  ];

  const timelineWalkway = new THREE.Mesh(
    new THREE.BoxGeometry(walkwayWidth, 0.025, hallLength - 1.2),
    boxMaterials
  );
  timelineWalkway.position.set(0, 0.018, 0);
  timelineWalkway.userData = { ignoreRaycaster: true, isFloor: true };
  floorRoot.add(timelineWalkway);

  // Hai đường nẹp đồng đen phân tách giữa dải sàn đồng trung tâm và nền đá granite hai bên
  const borderTrimMat = new THREE.MeshStandardMaterial({
    color: 0x24150b,
    roughness: 0.28,
    metalness: 0.84
  });
  borderTrimMat.userData = { ignoreRaycaster: true, isFloor: true };

  [-1, 1].forEach((side) => {
    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.032, hallLength - 1.2),
      borderTrimMat
    );
    trim.position.set(side * (walkwayWidth * 0.5 + 0.06), 0.02, 0);
    trim.userData = { ignoreRaycaster: true, isFloor: true };
    floorRoot.add(trim);
  });

  // 3. BỤC THẢM ĐỎ 3 BẬC HAI BÊN DẢI SÀN
  if (includeRedPlatforms) {
    const redPlatforms = createFlankingRedCarpetPlatforms(hallLength, walkwayWidth);
    floorRoot.add(redPlatforms);

    // Đăng ký Hitbox chuẩn O(1) qua hitboxManager
    const activeHbm = hitboxManager || (typeof window !== 'undefined' ? window.__museumHitboxManager || window.hitboxManager : null);
    if (activeHbm && typeof activeHbm.registerSolidObjectCollider === 'function') {
      const platformLength = Math.min(hallLength * 0.72, 24.0);
      [-1, 1].forEach((side) => {
        const minX = side > 0 ? walkwayWidth * 0.5 + 0.15 : -(walkwayWidth * 0.5 + 0.15 + 4.6);
        const maxX = side > 0 ? walkwayWidth * 0.5 + 0.15 + 4.6 : -(walkwayWidth * 0.5 + 0.15);
        const box = new THREE.Box3(
          new THREE.Vector3(minX, 0.0, -1.5 - platformLength * 0.5),
          new THREE.Vector3(maxX, 0.52, -1.5 + platformLength * 0.5)
        );
        activeHbm.registerSolidObjectCollider(null, {
          customBox: box,
          tag: `Red_Carpet_Platform_${side > 0 ? 'Right' : 'Left'}`
        });
      });
      console.log('%c[Timeline Floor System] Đã đăng ký Hitbox 2 dãy bục thảm đỏ 3 bậc với hitboxManager.', 'color: #38bdf8; font-weight: bold;');
    }
  }

  // 4. ĐĨA ĐỒNG TRÒN KHỔNG LỒ (discRadius = 2.65m) CUỐI TRỤC THỜI GIAN
  if (includeFocalDisc) {
    const focalZ = -(hallLength * 0.5 - 0.4);
    const focalWall = createFocalBronzeMedallionWall(focalZ);
    floorRoot.add(focalWall);
  }

  // Đảm bảo 100% mắt lưới con đều có cờ ignoreRaycaster = true
  floorRoot.traverse((child) => {
    if (child.isMesh) {
      child.userData.ignoreRaycaster = true;
      child.userData.isFloor = true;
    }
  });

  targetContainer.add(floorRoot);
  console.log('%c[Timeline Floor System] Đã hoàn tất cài đặt Sàn Đồng Trục Thời Gian & Bục Thảm Đỏ.', 'color: #22c55e; font-weight: bold;');
  return floorRoot;
}
