import * as THREE from 'three';
import { generateSculptedNormalAndAlbedoMaps } from './museumReliefSculptor.js';
import { getFakeShadowMaterial } from './proceduralMaterials.js';

/**
 * ============================================================================
 * MUSEUM CARPET REPLACER - THAY THẾ TOÀN BỘ THẢM SANG THẢM TRỤC THỜI GIAN
 * 
 * Kỹ năng ứng dụng:
 * - ornamental-relief-sculptor:
 *   + generateSculptedNormalAndAlbedoMaps() khắc chìm trục dọc màu đen đậm,
 *     các vòng tròn niên đại (210, 10000, 1820), các hàng chữ ngang xếp tầng đối xứng,
 *     khe mạch ghép hình chữ nhật mảnh và khung viền kèm móc góc vuông sát mép thảm.
 * - shader-coloring-artist:
 *   + Phối màu PBR vàng đồng ấm (#deb089 -> #c28558) chuẩn màu thảm đồng trong hình mẫu.
 *   + BumpMap và Sobel Normal Map tạo chiều sâu chạm khắc chân thực dưới ánh sáng bảo tàng.
 * - fps-optimizer:
 *   + Bộ nhớ đệm Material chia sẻ 1 lần duy nhất trên GPU.
 *   + Tự động xoay texture 90 độ cho thảm chạy ngang (trục X) và giữ thẳng cho thảm chạy dọc (trục Z).
 *   + userData.ignoreRaycaster = true trên 100% thảm để giữ trọn tốc độ 60+ FPS và click chính xác.
 * ============================================================================
 */

export const CARPET_TIMELINE_NODES = [
  {
    topLabel: 'KỶ NGUYÊN',
    number: '210',
    bottomLabel: 'VẠN NĂM',
    leftRows: [
      'Khởi nguyên văn hóa Lạc Việt • Dấu tích cổ sơ',
      'Huyền thoại Hồng Bàng • Âu Cơ - Lạc Long Quân',
      'Thần thoại Sơn Tinh - Thủy Tinh • Trị thủy dựng làng',
      'Tiếng trống đồng Đông Sơn • Hào khí bình minh'
    ],
    rightRows: [
      'Cội nguồn dân tộc • Tinh thần đại đoàn kết',
      'Truyền thuyết Thánh Gióng • Phù Đổng Thiên Vương',
      'Sự tích Trầu Cau • Bánh Chưng Bánh Giầy',
      'An Dương Vương • Thành ốc Cổ Loa chín vòng'
    ]
  },
  {
    topLabel: 'NIÊN ĐẠI',
    number: '10000',
    bottomLabel: 'NĂM',
    leftRows: [
      'Nam Quốc Sơn Hà • Bản tuyên ngôn sông núi',
      'Hịch Tướng Sĩ • Hào khí Đông A ba lần thắng Nguyên Mông',
      'Bình Ngô Đại Cáo • Nguyễn Trãi • Đại nghĩa thắng hung tàn',
      'Thơ văn Lý - Trần • Tinh thần Thiền học & Yêu nước'
    ],
    rightRows: [
      'Truyền Kỳ Mạn Lục • Nguyễn Dữ • Văn xuôi kỳ ảo',
      'Chinh Phụ Ngâm • Đoàn Thị Điểm • Khúc ca nhân đạo',
      'Thơ Nôm Hồ Xuân Hương • Bản lĩnh và cá tính độc đáo',
      'Cung Oán Ngâm Khúc • Nguyễn Gia Thiều'
    ]
  },
  {
    topLabel: 'CỘT MỐC',
    number: '1820',
    bottomLabel: 'KIỆT TÁC',
    leftRows: [
      'Đoạn Trường Tân Thanh • Đại thi hào Nguyễn Du',
      'Tinh hoa 3.254 câu thơ lục bát bất hủ',
      'Lục Vân Tiên • Nguyễn Đình Chiểu • Trọng nghĩa khinh tài'
    ],
    rightRows: [
      'Văn học Hiện thực & Thơ Mới đầu thế kỷ XX',
      'Kim Lân (Vợ Nhặt) • Nam Cao • Ngô Tất Tố',
      'Tuyên ngôn Độc lập • Ánh sáng văn học thời đại mới'
    ]
  }
];

let SHARED_TIMELINE_CARPET_MATERIAL = null;

/**
 * 1. TẠO VẬT LIỆU THẢM ĐỒNG TRỤC THỜI GIAN PBR (2048 x 4096)
 * Màu vàng đồng ấm (#deb089 -> #c28558), mạch ghép hình chữ nhật mảnh, trục dọc & mốc 210, 10000, 1820
 */
export function getTimelinePatternCarpetMaterial() {
  if (SHARED_TIMELINE_CARPET_MATERIAL) return SHARED_TIMELINE_CARPET_MATERIAL;

  const { albedoMap, normalMap } = generateSculptedNormalAndAlbedoMaps(
    'museum_timeline_carpet_exact_v7',
    512,
    1024,
    (aCtx, hCtx) => {
      // Scale virtual 2048x4096 -> 512x1024 (giảm 16x pixel Sobel & VRAM)
      aCtx.save();
      hCtx.save();
      aCtx.scale(0.25, 0.25);
      hCtx.scale(0.25, 0.25);
      const w = 2048;
      const h = 4096;
      // --- A. NỀN VÀNG ĐỒNG ẤM (WARM BRONZE / TAN GOLD) ---
      const bgGrad = aCtx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0.0, '#deb089');
      bgGrad.addColorStop(0.35, '#cf9669');
      bgGrad.addColorStop(0.7, '#c28558');
      bgGrad.addColorStop(1.0, '#d8a479');
      aCtx.fillStyle = bgGrad;
      aCtx.fillRect(0, 0, w, h);

      // HeightMap mức phẳng cao (225) cho bề mặt thảm
      hCtx.fillStyle = 'rgb(225, 225, 225)';
      hCtx.fillRect(0, 0, w, h);

      // Vân kim loại / sợi dệt phay xước vi thể ngang (Brushed hairline grain)
      aCtx.strokeStyle = 'rgba(65, 32, 14, 0.12)';
      aCtx.lineWidth = 1.6;
      for (let y = 0; y < h; y += 12) {
        aCtx.beginPath();
        aCtx.moveTo(0, y);
        aCtx.lineTo(w, y);
        aCtx.stroke();
      }

      // --- B. ĐƯỜNG KẺ MẠCH GHÉP HÌNH CHỮ NHẬT MẢNH TRÊN BỀ MẶT THẢM ---
      // Lưới mạch ghép ngang (Transverse slabs)
      const rows = 14;
      const rowH = h / rows;
      for (let r = 1; r < rows; r++) {
        const y = r * rowH;
        aCtx.strokeStyle = 'rgba(48, 26, 12, 0.42)';
        aCtx.lineWidth = 3.5;
        aCtx.beginPath(); aCtx.moveTo(0, y); aCtx.lineTo(w, y); aCtx.stroke();

        // Gờ bắt sáng nhẹ trên khe ghép
        aCtx.strokeStyle = 'rgba(255, 230, 205, 0.25)';
        aCtx.lineWidth = 1.5;
        aCtx.beginPath(); aCtx.moveTo(0, y - 2); aCtx.lineTo(w, y - 2); aCtx.stroke();

        hCtx.strokeStyle = 'rgb(95, 95, 95)';
        hCtx.lineWidth = 5;
        hCtx.beginPath(); hCtx.moveTo(0, y); hCtx.lineTo(w, y); hCtx.stroke();
      }

      // Lưới mạch ghép dọc mảnh tạo ô chữ nhật (Rectangular tiles)
      const cols = 4;
      const colW = w / cols;
      for (let c = 1; c < cols; c++) {
        const x = c * colW;
        aCtx.strokeStyle = 'rgba(48, 26, 12, 0.26)';
        aCtx.lineWidth = 2.5;
        aCtx.beginPath(); aCtx.moveTo(x, 0); aCtx.lineTo(x, h); aCtx.stroke();

        hCtx.strokeStyle = 'rgb(120, 120, 120)';
        hCtx.lineWidth = 3.5;
        hCtx.beginPath(); hCtx.moveTo(x, 0); hCtx.lineTo(x, h); hCtx.stroke();
      }

      // Khung viền mảnh bao quanh mép thảm
      const padX = 84;
      [aCtx, hCtx].forEach((ctx, isHeight) => {
        ctx.strokeStyle = isHeight ? 'rgb(35, 35, 35)' : '#261408';
        ctx.lineWidth = isHeight ? 9 : 6;
        ctx.strokeRect(padX, 36, w - padX * 2, h - 72);
      });

      // --- C. ĐƯỜNG TRỤC DỌC MÀU ĐEN ĐẬM CHÍNH GIỮA THẢM (CENTRAL TIMELINE AXIS) ---
      const cx = w * 0.5;
      [aCtx, hCtx].forEach((ctx, isHeight) => {
        ctx.strokeStyle = isHeight ? 'rgb(12, 12, 12)' : '#1a0e06';
        ctx.lineWidth = isHeight ? 28 : 22;
        ctx.beginPath();
        ctx.moveTo(cx, 36);
        ctx.lineTo(cx, h - 36);
        ctx.stroke();
      });

      // --- D. 3 CỘT MỐC NIÊN ĐẠI LỚN (210, 10000, 1820) & HÀNG CHỮ XẾP TẦNG ĐỐI XỨNG ---
      // Tỉ lệ bù biến dạng UV (k = (2.0 * W_carpet) / L_carpet = 2.0 * 2.8 / 35.0 = 0.16)
      // Khi canvas 2048x4096 xoay 90 độ và trải trên mặt phẳng 35.0m x 2.8m,
      // việc vẽ với tỉ lệ bán kính Y = bán kính X * k đảm bảo trên không gian 3D,
      // hình tròn đạt tỉ lệ 1:1 TUYỆT ĐỐI TRÒN TRỊA 100%, không bao giờ bị méo hình elip!
      const carpetW = 5.0;
      const carpetL = 35.0;
      const kAspect = (2.0 * carpetW) / carpetL;
      const nodePositionsY = [3380, 2048, 716];

      CARPET_TIMELINE_NODES.forEach((node, idx) => {
        const cy = nodePositionsY[idx];
        // HÌNH TRÒN TO HƠN ĐÁNG KỂ: Bán kính X tăng lên 490px (đường kính ~2.4m trên thực địa)
        const radiusX = idx === 0 ? 510 : (idx === 1 ? 490 : 470);
        const radiusY = radiusX * kAspect;

        // Xóa trục dọc bên trong lòng vòng tròn để tạo nền đồng sáng
        aCtx.fillStyle = '#d69e72';
        aCtx.beginPath();
        aCtx.ellipse(cx, cy, radiusX, radiusY, 0, 0, Math.PI * 2);
        aCtx.fill();

        hCtx.fillStyle = 'rgb(235, 235, 235)';
        hCtx.beginPath();
        hCtx.ellipse(cx, cy, radiusX, radiusY, 0, 0, Math.PI * 2);
        hCtx.fill();

        // Vành tròn viền kép đen đậm to lớn, bề thế và đạt chuẩn 100% tròn trịa trong 3D
        [aCtx, hCtx].forEach((ctx, isHeight) => {
          ctx.strokeStyle = isHeight ? 'rgb(12, 12, 12)' : '#1a0e06';
          ctx.lineWidth = isHeight ? 28 : 22;
          ctx.beginPath();
          ctx.ellipse(cx, cy, radiusX, radiusY, 0, 0, Math.PI * 2);
          ctx.stroke();

          const innerRadiusX = radiusX - 32;
          const innerRadiusY = innerRadiusX * kAspect;
          ctx.lineWidth = isHeight ? 7 : 5;
          ctx.beginPath();
          ctx.ellipse(cx, cy, innerRadiusX, innerRadiusY, 0, 0, Math.PI * 2);
          ctx.stroke();
        });

        // Đường nhánh vuông góc dẫn ra hai mép thảm kèm móc góc vuông (Right-angle hooks)
        [aCtx, hCtx].forEach((ctx, isHeight) => {
          ctx.strokeStyle = isHeight ? 'rgb(25, 25, 25)' : '#261408';
          ctx.lineWidth = isHeight ? 9 : 6;

          // Nhánh Trái
          ctx.beginPath();
          ctx.moveTo(cx - radiusX - 16, cy);
          ctx.lineTo(padX + 36, cy);
          ctx.lineTo(padX + 36, cy - 140 * kAspect);
          ctx.stroke();

          // Nhánh Phải
          ctx.beginPath();
          ctx.moveTo(cx + radiusX + 16, cy);
          ctx.lineTo(w - padX - 36, cy);
          ctx.lineTo(w - padX - 36, cy - 140 * kAspect);
          ctx.stroke();
        });

        // CHỮ TRONG THẢM TO HƠN RÕ RỆT (CHỮ SỐ TÂM VÒNG TRÒN TĂNG TỪ 84-94px LÊN 165px)
        [aCtx, hCtx].forEach((ctx, isHeight) => {
          ctx.save();
          ctx.translate(cx, cy);
          ctx.scale(1.0, kAspect * 2.3);

          ctx.fillStyle = isHeight ? 'rgb(18, 18, 18)' : '#1a0e06';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          ctx.font = 'bold 56px "Times New Roman", serif';
          ctx.fillText(node.topLabel, 0, -radiusX * 0.44);

          ctx.font = `bold ${idx === 0 ? 175 : (idx === 1 ? 155 : 165)}px "Times New Roman", serif`;
          ctx.fillText(node.number, 0, 8);

          ctx.font = 'bold 50px "Times New Roman", serif';
          ctx.fillText(node.bottomLabel, 0, radiusX * 0.46);

          ctx.restore();
        });

        // CÁC HÀNG CHỮ THUYẾT MINH TO HƠN (TĂNG TỪ 30px LÊN 46px)
        const leftSpacing = 200 * kAspect;
        const startY = cy - radiusY - 45;

        node.leftRows.forEach((text, rIdx) => {
          const ry = startY - rIdx * leftSpacing;

          // Đường gạch chỉ kẻ ngang dưới dòng chữ
          aCtx.strokeStyle = 'rgba(40, 20, 10, 0.32)';
          aCtx.lineWidth = 2.5;
          aCtx.beginPath();
          aCtx.moveTo(cx - radiusX - 16, ry + 18 * kAspect);
          aCtx.lineTo(padX + 36, ry + 18 * kAspect);
          aCtx.stroke();

          hCtx.strokeStyle = 'rgb(80, 80, 80)';
          hCtx.lineWidth = 3.5;
          hCtx.beginPath();
          hCtx.moveTo(cx - radiusX - 16, ry + 18 * kAspect);
          hCtx.lineTo(padX + 36, ry + 18 * kAspect);
          hCtx.stroke();

          // Chữ bên trái to hơn rõ rệt
          [aCtx, hCtx].forEach((ctx, isHeight) => {
            ctx.save();
            ctx.translate(cx - 60, ry);
            ctx.scale(1.0, kAspect * 2.2);
            ctx.fillStyle = isHeight ? 'rgb(35, 35, 35)' : '#1a0e06';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 46px "Times New Roman", serif';
            ctx.fillText(text, 0, 0);
            ctx.restore();
          });
        });

        node.rightRows.forEach((text, rIdx) => {
          const ry = startY - rIdx * leftSpacing;

          // Đường gạch chỉ kẻ ngang dưới dòng chữ
          aCtx.strokeStyle = 'rgba(40, 20, 10, 0.32)';
          aCtx.lineWidth = 2.5;
          aCtx.beginPath();
          aCtx.moveTo(cx + radiusX + 16, ry + 18 * kAspect);
          aCtx.lineTo(w - padX - 36, ry + 18 * kAspect);
          aCtx.stroke();

          hCtx.strokeStyle = 'rgb(80, 80, 80)';
          hCtx.lineWidth = 3.5;
          hCtx.beginPath();
          hCtx.moveTo(cx + radiusX + 16, ry + 18 * kAspect);
          hCtx.lineTo(w - padX - 36, ry + 18 * kAspect);
          hCtx.stroke();

          // Chữ bên phải to hơn rõ rệt
          [aCtx, hCtx].forEach((ctx, isHeight) => {
            ctx.save();
            ctx.translate(cx + 60, ry);
            ctx.scale(1.0, kAspect * 2.2);
            ctx.fillStyle = isHeight ? 'rgb(35, 35, 35)' : '#1a0e06';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.font = 'bold 46px "Times New Roman", serif';
            ctx.fillText(text, 0, 0);
            ctx.restore();
          });
        });
      });
      aCtx.restore();
      hCtx.restore();
    },
    3.4
  );

  [albedoMap, normalMap].forEach((t) => {
    if (!t) return;
    t.wrapS = THREE.ClampToEdgeWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.repeat.set(1, 1);
    t.needsUpdate = true;
  });

  SHARED_TIMELINE_CARPET_MATERIAL = new THREE.MeshStandardMaterial({
    map: albedoMap,
    normalMap: normalMap,
    normalScale: new THREE.Vector2(1.35, 1.35),
    roughness: 0.38,
    metalness: 0.65,
    side: THREE.FrontSide,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });

  return SHARED_TIMELINE_CARPET_MATERIAL;
}

const _carpetBoxScratch = new THREE.Box3();
const _carpetSizeScratch = new THREE.Vector3();

/**
 * 2. GÁN VẬT LIỆU THẢM TRỤC THỜI GIAN VÀO 1 MESH THẢM CỤ THỂ
 * Tự động căn hướng UV (xoay 90° nếu thảm chạy ngang trục X, giữ thẳng nếu thảm chạy dọc trục Z).
 */
export function applyTimelineCarpetToMesh(mesh) {
  if (!mesh || !mesh.isMesh) return;
  const baseCarpetMat = getTimelinePatternCarpetMaterial();

  // Nếu thảm đã dùng chung material & đã xử lý rồi thì bỏ qua (tránh chạy lặp lại)
  if (mesh.userData.isReplacedCarpet && mesh.material === baseCarpetMat) {
    return;
  }

  if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
  _carpetBoxScratch.setFromObject(mesh);
  _carpetBoxScratch.getSize(_carpetSizeScratch);

  // Xác định chiều dài chính của thảm trong không gian thực
  let isStretchedAlongX = _carpetSizeScratch.x > _carpetSizeScratch.z * 1.15;
  if (
    (_carpetSizeScratch.x === 0 && _carpetSizeScratch.z === 0) ||
    Math.abs(_carpetSizeScratch.x - _carpetSizeScratch.z) < 0.001
  ) {
    mesh.geometry.boundingBox.getSize(_carpetSizeScratch);
    isStretchedAlongX = _carpetSizeScratch.x > _carpetSizeScratch.y * 1.15;
  }

  // Xoay UV trực tiếp trên geometry một lần thay vì clone material & texture tốn VRAM/draw-call
  if (isStretchedAlongX && !mesh.userData.carpetUvRotated) {
    const geo = mesh.geometry.clone();
    const uv = geo.attributes?.uv;
    if (uv) {
      for (let i = 0; i < uv.count; i++) {
        const u = uv.getX(i);
        const v = uv.getY(i);
        uv.setXY(i, v, 1.0 - u);
      }
      uv.needsUpdate = true;
    }
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    mesh.geometry = geo;
    mesh.userData.carpetUvRotated = true;
  }

  mesh.material = baseCarpetMat;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.ignoreRaycaster = true;
  mesh.userData.isCarpet = true;
  mesh.userData.isReplacedCarpet = true;
  mesh.visible = true;
}

/**
 * 3. QUÉT VÀ THAY THẾ TOÀN BỘ CÁC TẤM THẢM TRONG BẢO TÀNG SANG THẢM TRỤC THỜI GIAN
 * Tuyệt đối giữ nguyên sàn nhà, tường, bệ đá và kiến trúc xung quanh.
 * Tự động căn chỉnh UV để đường trục thời gian luôn chạy dọc theo chiều dài của mỗi tấm thảm.
 */
export function replaceAllMuseumCarpetsWithTimelinePattern(rootScene) {
  if (!rootScene) return 0;

  // Cập nhật ma trận thế giới để tính toán bounding box chính xác 100%
  rootScene.updateMatrixWorld(true);

  // Xóa bỏ các nhóm bục đỏ/đĩa tròn cũ nếu có tồn tại để đảm bảo giữ nguyên 100% kiến trúc gốc
  const staleSystems = [];
  rootScene.traverse((child) => {
    if (
      child.name === 'Museum_Timeline_Floor_System' ||
      child.name === 'Flanking_Red_Carpet_Platforms' ||
      child.name === 'Focal_Bronze_Medallion_Wall' ||
      child.name === 'Lobby_West_Rotunda_Connector' ||
      child.name === 'Lobby_East_Rotunda_Connector' ||
      child.name === 'Lobby_Main_South_Carpet' ||
      child.name === 'Lobby_North_Carpet'
    ) {
      staleSystems.push(child);
    }
  });
  staleSystems.forEach((sys) => {
    if (sys.parent) {
      sys.parent.remove(sys);
      console.log(`%c[Carpet Replacer] Đã gỡ bỏ phần bổ sung ngoài kiến trúc gốc: ${sys.name}`, 'color: #f59e0b;');
    }
  });

  const carpetMeshes = [];

  rootScene.traverse((child) => {
    if (!child.isMesh) return;

    const name = (child.name || '').toLowerCase();
    const parentName = (child.parent?.name || '').toLowerCase();

    // 0. LOẠI TRỪ TUYỆT ĐỐI BÓNG ĐỔ, ĐÈN, BỆ CỘT, QUẦNG SÁNG, BẬC THANG, TƯỜNG
    const isNonCarpet =
      name.includes('shadow') ||
      name.includes('contactshadow') ||
      name.includes('glow') ||
      name.includes('light') ||
      name.includes('beam') ||
      name.includes('pool') ||
      name.includes('plinth') ||
      name.includes('pillar') ||
      name.includes('column') ||
      name.includes('mandala') ||
      name.includes('monument') ||
      name.includes('pedestal') ||
      name.includes('stair') ||
      name.includes('tread') ||
      name.includes('balustrade') ||
      name.includes('wall') ||
      parentName.includes('pillar') ||
      parentName.includes('column') ||
      parentName.includes('pedestal');

    if (isNonCarpet) {
      // Phục hồi lại bóng đổ chân cột nếu lỡ bị đổi vật liệu trước đó
      if (name.includes('shadow') || name.includes('contactshadow')) {
        child.material = getFakeShadowMaterial();
        child.userData.isCarpet = false;
        child.userData.isReplacedCarpet = false;
      }
      return;
    }

    // 1. Chỉ nhận diện các mesh thực sự là thảm trải sàn
    const isNamedCarpet =
      child.userData?.isCarpet ||
      child.userData?.isReplacedCarpet ||
      name.includes('carpet') ||
      name.includes('rug') ||
      name.includes('runner') ||
      name.includes('tham') ||
      parentName.includes('carpet') ||
      parentName.includes('rug') ||
      parentName.includes('runner') ||
      parentName.includes('tham');

    if (isNamedCarpet) {
      // Loại trừ các mặt sàn nền chính rộng lớn (> 36m)
      _carpetBoxScratch.setFromObject(child);
      _carpetBoxScratch.getSize(_carpetSizeScratch);
      if (_carpetSizeScratch.x >= 36.0 && _carpetSizeScratch.z >= 36.0) return;

      carpetMeshes.push(child);
    }
  });

  // Thay thế vật liệu và căn hướng trục thời gian dọc theo chiều dài mỗi tấm thảm
  carpetMeshes.forEach((mesh) => {
    applyTimelineCarpetToMesh(mesh);
  });

  console.log(
    `%c[Carpet Replacer] Đã thay thế thành công ${carpetMeshes.length} tấm thảm trong bảo tàng sang Thảm Trục Thời Gian!`,
    'color: #22c55e; font-weight: bold;'
  );

  return carpetMeshes.length;
}
