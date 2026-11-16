import * as THREE from 'three';
import { setupHienThuCacLighting } from './hienThuCacLightingAndMaterials.js';
import { HienThuCacInteractiveBookSystem } from './hienThuCacLoreAndAudio.js';
import { setupHienThuCacPropsAndGreenery } from './hienThuCacPropsAndGreenery.js';

/**
 * ============================================================================
 * HIÊN THƯ CÁC – KHÔNG GIAN ĐỌC SÁCH & THƯỞNG TRÀ TẦNG 2
 * Reading Lounge & Tea Sanctuary on Level 2 (Elevation Y = 10.0m)
 * 
 * Chủ trì quy hoạch & kiến trúc di sản: @tamthe (Curator & Heritage Architect)
 * Phối hợp Swarm:
 * - Part 1: Bố cục Không gian & Kiến trúc Di sản (@tamthe)
 * - Part 2: Đạo cụ, Trà Đạo & Tiểu cảnh (@vangtho)
 * - Part 3: Chiếu sáng Chiaroscuro & PBR (@munthapden)
 * - Part 4: Tương tác 6 Cuốn Sách & Âm thanh (@trangdaonuong)
 * - Part 5: Hitbox, Tối ưu 60+ FPS & Tích hợp Main (@xiemtuan)
 * ============================================================================
 */

// Bộ đệm Cache Canvas Texture dùng chung
const HIEN_THU_CAC_TEX_CACHE = {};

function getHtcTex(key, w, h, drawFn) {
  if (HIEN_THU_CAC_TEX_CACHE[key]) return HIEN_THU_CAC_TEX_CACHE[key];
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) drawFn(ctx, w, h);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  HIEN_THU_CAC_TEX_CACHE[key] = tex;
  return tex;
}

/**
 * Tự động kiểm tra, chuẩn hóa Geometry & Khử sạch triệt để NaN/Infinity
 */
export function prepHtcGeo(geo) {
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
 * ============================================================================
 * PART 1.1: PHÂN KHU A – ĐẠI THƯ CÁC ÁP TƯỜNG (GRAND WALL BOOKSHELF)
 * Tọa độ áp sát mảng tường lớn bên phải: X ≈ 33.2m, Z in [6.0, 20.0], Y = 10.0m
 * Khung gỗ mun đen (#181412) viền vàng kim (#d4af37), phù điêu Hoa Sen & Cuộn Thư
 * ============================================================================
 */
export function buildGrandWallBookshelf(parentGroup, options = {}) {
  const shelfGroup = new THREE.Group();
  shelfGroup.name = 'HTC_Grand_Wall_Bookshelf_ZoneA';
  shelfGroup.position.set(33.2, 10.0, 13.0);
  shelfGroup.rotation.y = -Math.PI / 2; // Mặt kệ hướng về phía Tây (nhìn vào sảnh)
  shelfGroup.userData = { ignoreRaycaster: true, isStructural: true };

  const totalLength = 14.0; // Z từ 6.0 đến 20.0
  const shelfHeight = 5.8;  // Y từ 10.0 đến 15.8
  const shelfDepth = 0.65;

  // Vật liệu PBR Gỗ mun đen & Nẹp vàng kim
  const ebonyWoodMat = new THREE.MeshStandardMaterial({
    color: 0x181412,
    roughness: 0.35,
    metalness: 0.16,
    side: THREE.FrontSide
  });
  ebonyWoodMat.userData = { ignoreRaycaster: true };

  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.22,
    metalness: 0.86,
    emissive: 0x78350f,
    emissiveIntensity: 0.22,
    side: THREE.FrontSide
  });
  goldTrimMat.userData = { ignoreRaycaster: true };

  // 1. Tấm lưng kệ gỗ mun áp tường
  const backPanel = new THREE.Mesh(
    prepHtcGeo(new THREE.BoxGeometry(totalLength, shelfHeight, 0.08)),
    ebonyWoodMat
  );
  backPanel.position.set(0, shelfHeight * 0.5, -shelfDepth * 0.5 + 0.04);
  backPanel.userData.ignoreRaycaster = true;
  shelfGroup.add(backPanel);

  // Khung viền nẹp vàng quanh kệ
  const outerFrameGold = new THREE.Mesh(
    prepHtcGeo(new THREE.BoxGeometry(totalLength + 0.12, shelfHeight + 0.12, 0.04)),
    goldTrimMat
  );
  outerFrameGold.position.set(0, shelfHeight * 0.5, -shelfDepth * 0.5);
  outerFrameGold.userData.ignoreRaycaster = true;
  shelfGroup.add(outerFrameGold);

  // 2. Các đợt kệ ngang (5 tầng đợt gỗ dày bo nẹp vàng)
  const numTiers = 5;
  const tierSpacing = shelfHeight / numTiers;
  for (let t = 0; t <= numTiers; t++) {
    const tierY = t * tierSpacing;
    const shelfBoard = new THREE.Mesh(
      prepHtcGeo(new THREE.BoxGeometry(totalLength, 0.08, shelfDepth)),
      ebonyWoodMat
    );
    shelfBoard.position.set(0, tierY, 0);
    shelfBoard.userData.ignoreRaycaster = true;
    shelfGroup.add(shelfBoard);

    // Nẹp chỉ vàng kim viền mép trước đợt kệ
    const goldNose = new THREE.Mesh(
      prepHtcGeo(new THREE.BoxGeometry(totalLength + 0.02, 0.025, 0.03)),
      goldTrimMat
    );
    goldNose.position.set(0, tierY, shelfDepth * 0.5 + 0.015);
    goldNose.userData.ignoreRaycaster = true;
    shelfGroup.add(goldNose);
  }

  // 3. Vách ngăn dọc chia khoang (7 vách dọc)
  const numVerticals = 7;
  const bayWidth = totalLength / (numVerticals - 1);
  for (let v = 0; v < numVerticals; v++) {
    const vx = -totalLength * 0.5 + v * bayWidth;
    const divider = new THREE.Mesh(
      prepHtcGeo(new THREE.BoxGeometry(0.08, shelfHeight, shelfDepth)),
      ebonyWoodMat
    );
    divider.position.set(vx, shelfHeight * 0.5, 0);
    divider.userData.ignoreRaycaster = true;
    shelfGroup.add(divider);

    // Nẹp vàng cạnh đứng
    const vGold = new THREE.Mesh(
      prepHtcGeo(new THREE.BoxGeometry(0.025, shelfHeight + 0.02, 0.03)),
      goldTrimMat
    );
    vGold.position.set(vx, shelfHeight * 0.5, shelfDepth * 0.5 + 0.015);
    vGold.userData.ignoreRaycaster = true;
    shelfGroup.add(vGold);
  }

  // 4. PHÙ ĐIÊU HOA SEN & CUỘN THƯ ĐÔNG SƠN CHÍNH GIỮA (Khoang trung tâm X ≈ 0 của kệ)
  const reliefWidth = bayWidth * 1.85; // Khoang giữa rộng thoáng
  const reliefHeight = tierSpacing * 2.6;
  const reliefTex = getHtcTex('htc_lotus_scroll_relief_hd', 1024, 1024, (ctx, w, h) => {
    // Nền sơn mài chu sa kết hợp hoàng kim
    const g = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.5);
    g.addColorStop(0.0, '#3f110c');
    g.addColorStop(0.4, '#240a08');
    g.addColorStop(0.85, '#140605');
    g.addColorStop(1.0, '#0a0302');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Viền khung chữ Vạn & hoa sen cổ
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 14;
    ctx.strokeRect(16, 16, w - 32, h - 32);

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.strokeRect(32, 32, w - 64, h - 64);

    // Vẽ vầng hào quang sóng nước Đông Sơn
    const cx = w / 2;
    const cy = h / 2;
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 3;
    for (let r = 80; r < 360; r += 35) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Cuộn thư di sản mở rộng
    ctx.fillStyle = '#fef3c7';
    ctx.shadowColor = '#d97706';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.roundRect(cx - 240, cy - 80, 480, 190, 16);
    ctx.fill();

    // Dải hoa sen hồng ngọc vươn cao
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(cx, cy - 120, 55, 0, Math.PI);
    ctx.fill();

    // Cánh sen vàng kim vươn nở
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 135, 24, 60, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx - 38, cy - 125, 20, 50, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 38, cy - 125, 20, 50, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Chữ thư pháp thiêng liêng trên cuộn thư
    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 36px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText('VĂN HIẾN THIÊN THU', cx, cy - 15);

    ctx.font = 'italic 20px "Times New Roman", serif';
    ctx.fillStyle = '#92400e';
    ctx.fillText('“Sách mở văn minh • Trà ươm đạo vị”', cx, cy + 35);
    ctx.fillText('BẢO TÀNG VĂN HỌC VIỆT NAM', cx, cy + 75);
  });

  const reliefMat = new THREE.MeshStandardMaterial({
    map: reliefTex,
    roughness: 0.32,
    metalness: 0.45,
    side: THREE.FrontSide
  });
  reliefMat.userData = { ignoreRaycaster: true };

  const reliefMesh = new THREE.Mesh(
    prepHtcGeo(new THREE.PlaneGeometry(reliefWidth, reliefHeight)),
    reliefMat
  );
  reliefMesh.position.set(0, shelfHeight * 0.52, -shelfDepth * 0.5 + 0.12);
  reliefMesh.userData.ignoreRaycaster = true;
  reliefMesh.userData.isHeritageDecor = true;
  shelfGroup.add(reliefMesh);

  // Khung viền thếp vàng 3D quanh bức phù điêu
  const reliefBorder = new THREE.Mesh(
    prepHtcGeo(new THREE.BoxGeometry(reliefWidth + 0.15, reliefHeight + 0.15, 0.08)),
    goldTrimMat
  );
  reliefBorder.position.set(0, shelfHeight * 0.52, -shelfDepth * 0.5 + 0.06);
  reliefBorder.userData.ignoreRaycaster = true;
  shelfGroup.add(reliefBorder);

  // 5. TRƯNG BÀY SÁCH DI SẢN ĐA SẮC, CUỘN TRÚC & GỐM CỔ
  const bookColors = [0x881337, 0x1e3a8a, 0x14532d, 0x78350f, 0x451a03, 0x312e81, 0x701a75];
  const bookGeo = prepHtcGeo(new THREE.BoxGeometry(0.065, 0.42, 0.38));

  // Rải sách vào các ô kệ hai bên phù điêu
  for (let v = 0; v < numVerticals - 1; v++) {
    // Bỏ qua khoang giữa (v = 2, 3) để nhường không gian cho Phù Điêu Hoa Sen
    if (v === 2 || v === 3) continue;

    const bayCenterX = -totalLength * 0.5 + (v + 0.5) * bayWidth;

    for (let t = 0; t < numTiers; t++) {
      const bayBottomY = t * tierSpacing + 0.04;
      const booksInRow = 14;

      for (let b = 0; b < booksInRow; b++) {
        const bookX = bayCenterX - (bayWidth * 0.42) + b * (bayWidth * 0.84 / booksInRow);
        const colIdx = (v * 7 + t * 5 + b) % bookColors.length;

        const bMat = new THREE.MeshStandardMaterial({
          color: bookColors[colIdx],
          roughness: 0.45,
          metalness: 0.12,
          side: THREE.FrontSide
        });
        bMat.userData = { ignoreRaycaster: true };

        const book = new THREE.Mesh(bookGeo, bMat);
        const heightJitter = 0.85 + Math.sin(b * 1.7 + t) * 0.15;
        book.scale.set(1.0, heightJitter, 1.0);
        book.position.set(bookX, bayBottomY + (0.42 * heightJitter) * 0.5, 0.02);
        book.userData.ignoreRaycaster = true;
        shelfGroup.add(book);
      }

      // Thêm vài cuộn thư trúc cổ / bình gốm ở các góc ngẫu nhiên
      if ((v + t) % 3 === 0) {
        const scrollGeo = prepHtcGeo(new THREE.CylinderGeometry(0.04, 0.04, 0.38, 8).rotateZ(Math.PI / 2));
        const scrollMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
        const scroll = new THREE.Mesh(scrollGeo, scrollMat);
        scroll.position.set(bayCenterX + 0.45, bayBottomY + 0.05, 0.05);
        scroll.userData.ignoreRaycaster = true;
        shelfGroup.add(scroll);
      }
    }
  }

  // Thêm vào nhóm cha
  if (parentGroup) parentGroup.add(shelfGroup);
  return shelfGroup;
}

/**
 * ============================================================================
 * PART 1.2: PHÂN KHU B – 6 CỤM BÀN ĐỌC TRUNG TÂM (6 CENTRAL STUDY CLUSTERS)
 * Tọa độ: X in [18, 26], Z in [7, 19], Y = 10.0m
 * Gồm 6 bàn gỗ dài bóng mờ bo viền vàng, mỗi bàn 4 ghế tựa cong đệm lanh kem, thảm kỷ hà
 * ============================================================================
 */
export function buildCentralStudyClusters(parentGroup, options = {}) {
  const clustersGroup = new THREE.Group();
  clustersGroup.name = 'HTC_Central_Study_Clusters_ZoneB';
  clustersGroup.userData = { ignoreRaycaster: true };

  // Bố trí lưới 2 x 3 đối xứng thoáng đãng
  // Dãy 1: X = 19.5m; Dãy 2: X = 25.5m. Các tọa độ Z: 8.5m, 13.0m, 17.5m
  const clusterCoords = [
    { id: 1, x: 19.5, z: 8.5,  title: 'Bàn Đọc 1 • Truyện Kiều' },
    { id: 2, x: 19.5, z: 13.0, title: 'Bàn Đọc 2 • Nam Quốc Sơn Hà' },
    { id: 3, x: 19.5, z: 17.5, title: 'Bàn Đọc 3 • Bình Ngô Đại Cáo' },
    { id: 4, x: 25.5, z: 8.5,  title: 'Bàn Đọc 4 • Hịch Tướng Sĩ' },
    { id: 5, x: 25.5, z: 13.0, title: 'Bàn Đọc 5 • Chinh Phụ Ngâm' },
    { id: 6, x: 25.5, z: 17.5, title: 'Bàn Đọc 6 • Lục Vân Tiên' }
  ];

  // Vật liệu dùng chung cho bàn, ghế và thảm
  const tableWoodMat = new THREE.MeshStandardMaterial({
    color: 0x221c17,
    roughness: 0.28,
    metalness: 0.22,
    side: THREE.FrontSide
  });
  tableWoodMat.userData = { ignoreRaycaster: true };

  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.20,
    metalness: 0.88,
    side: THREE.FrontSide
  });
  goldTrimMat.userData = { ignoreRaycaster: true };

  const linenCushionMat = new THREE.MeshStandardMaterial({
    color: 0xf5efe6, // Đệm lanh kem tao nhã
    roughness: 0.75,
    metalness: 0.05,
    side: THREE.FrontSide
  });
  linenCushionMat.userData = { ignoreRaycaster: true };

  const chairWoodMat = new THREE.MeshStandardMaterial({
    color: 0x1a1512,
    roughness: 0.32,
    metalness: 0.18,
    side: THREE.FrontSide
  });
  chairWoodMat.userData = { ignoreRaycaster: true };

  // Texture thảm dệt phẳng kỷ hà (Chu Đậu Geometric Flat-Weave Rug)
  const rugTex = getHtcTex('htc_geometric_flat_rug_hd', 512, 512, (ctx, w, h) => {
    // Nền nâu be dệt sợi
    ctx.fillStyle = '#2d241e';
    ctx.fillRect(0, 0, w, h);

    // Viền vàng hổ phách đôi
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 10;
    ctx.strokeRect(12, 12, w - 24, h - 24);

    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 4;
    ctx.strokeRect(24, 24, w - 48, h - 48);

    // Hoa văn kỷ hà đan chéo
    ctx.strokeStyle = '#4a3b32';
    ctx.lineWidth = 2;
    const step = 32;
    for (let x = 32; x < w - 32; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 32); ctx.lineTo(x, h - 32); ctx.stroke();
    }
    for (let y = 32; y < h - 32; y += step) {
      ctx.beginPath(); ctx.moveTo(32, y); ctx.lineTo(w - 32, y); ctx.stroke();
    }

    // Tâm điểm hoa văn hoa sen cách điệu
    ctx.fillStyle = '#d4af37';
    ctx.font = '28px serif';
    ctx.textAlign = 'center';
    ctx.fillText('❖', w / 2, h / 2 + 10);
  });

  const rugMat = new THREE.MeshStandardMaterial({
    map: rugTex,
    roughness: 0.85,
    metalness: 0.05,
    side: THREE.FrontSide
  });
  rugMat.userData = { ignoreRaycaster: true, isFloor: true };

  const tablesList = [];

  clusterCoords.forEach((cfg) => {
    const singleCluster = new THREE.Group();
    singleCluster.name = `HTC_StudyCluster_${cfg.id}`;
    singleCluster.position.set(cfg.x, 10.0, cfg.z);
    singleCluster.userData = { ignoreRaycaster: true, id: cfg.id, title: cfg.title };

    // 1. Thảm dệt phẳng kỷ hà bên dưới (3.2m x 2.2m)
    const rugMesh = new THREE.Mesh(
      prepHtcGeo(new THREE.PlaneGeometry(3.2, 2.2)).rotateX(-Math.PI / 2),
      rugMat
    );
    rugMesh.position.y = 0.012; // Nhô nhẹ trên sàn Y=10.0m
    rugMesh.userData.ignoreRaycaster = true;
    rugMesh.userData.isFloor = true;
    singleCluster.add(rugMesh);

    // 2. BÀN GỖ DÀI BÓNG MỜ BO VIỀN VÀNG (2.4m x 1.1m, Cao 0.76m)
    const tableTop = new THREE.Mesh(
      prepHtcGeo(new THREE.BoxGeometry(2.4, 0.07, 1.1)),
      tableWoodMat
    );
    tableTop.position.set(0, 0.725, 0);
    tableTop.userData.ignoreRaycaster = true;
    singleCluster.add(tableTop);

    // Nẹp viền vàng kim bo mép mặt bàn
    const tableTrim = new THREE.Mesh(
      prepHtcGeo(new THREE.BoxGeometry(2.43, 0.025, 1.13)),
      goldTrimMat
    );
    tableTrim.position.set(0, 0.71, 0);
    tableTrim.userData.ignoreRaycaster = true;
    singleCluster.add(tableTrim);

    // 4 Chân bàn tiện tròn gỗ mun tiếp đất vững chãi
    const legGeo = prepHtcGeo(new THREE.CylinderGeometry(0.045, 0.035, 0.69, 12));
    const legCapGeo = prepHtcGeo(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 12));
    [
      [-1.05, -0.42], [1.05, -0.42],
      [-1.05, 0.42], [1.05, 0.42]
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, tableWoodMat);
      leg.position.set(lx, 0.345, lz);
      leg.userData.ignoreRaycaster = true;
      singleCluster.add(leg);

      // Móng đồng bọc chân bàn
      const footCap = new THREE.Mesh(legCapGeo, goldTrimMat);
      footCap.position.set(lx, 0.02, lz);
      footCap.userData.ignoreRaycaster = true;
      singleCluster.add(footCap);
    });

    // 3. 4 GHẾ TỰA CONG ĐỆM LANH KEM (#f5efe6)
    // 2 ghế phía trước (Z = -0.75m), 2 ghế phía sau (Z = 0.75m)
    const chairOffsets = [
      { x: -0.65, z: -0.75, rotY: 0 },
      { x: 0.65,  z: -0.75, rotY: 0 },
      { x: -0.65, z: 0.75,  rotY: Math.PI },
      { x: 0.65,  z: 0.75,  rotY: Math.PI }
    ];

    chairOffsets.forEach((co) => {
      const chairGroup = new THREE.Group();
      chairGroup.position.set(co.x, 0, co.z);
      chairGroup.rotation.y = co.rotY;
      chairGroup.userData.ignoreRaycaster = true;

      // Đệm ngồi bọc lanh kem (0.50m x 0.48m x 0.08m tại Y = 0.44m)
      const seatMesh = new THREE.Mesh(
        prepHtcGeo(new THREE.BoxGeometry(0.50, 0.08, 0.48)),
        linenCushionMat
      );
      seatMesh.position.set(0, 0.44, 0);
      seatMesh.userData.ignoreRaycaster = true;
      chairGroup.add(seatMesh);

      // Khung bệ đỡ đệm gỗ mun
      const seatFrame = new THREE.Mesh(
        prepHtcGeo(new THREE.BoxGeometry(0.52, 0.04, 0.50)),
        chairWoodMat
      );
      seatFrame.position.set(0, 0.38, 0);
      seatFrame.userData.ignoreRaycaster = true;
      chairGroup.add(seatFrame);

      // 4 Chân ghế gỗ mun
      const chairLegGeo = prepHtcGeo(new THREE.CylinderGeometry(0.028, 0.022, 0.36, 8));
      [
        [-0.21, -0.20], [0.21, -0.20],
        [-0.21, 0.20], [0.21, 0.20]
      ].forEach(([cx, cz]) => {
        const cl = new THREE.Mesh(chairLegGeo, chairWoodMat);
        cl.position.set(cx, 0.18, cz);
        cl.userData.ignoreRaycaster = true;
        chairGroup.add(cl);
      });

      // Lưng tựa uốn cong thanh thoát (Curved Backrest)
      const backrestGeo = prepHtcGeo(new THREE.CylinderGeometry(0.26, 0.26, 0.42, 16, 1, true, 0, Math.PI));
      const backrest = new THREE.Mesh(backrestGeo, chairWoodMat);
      backrest.rotation.y = -Math.PI / 2;
      backrest.position.set(0, 0.65, -0.16);
      backrest.userData.ignoreRaycaster = true;
      chairGroup.add(backrest);

      // Tay vịn ghế mạ đầu vàng
      const topRail = new THREE.Mesh(
        prepHtcGeo(new THREE.TorusGeometry(0.26, 0.022, 8, 16, Math.PI)),
        goldTrimMat
      );
      topRail.rotation.x = Math.PI / 2;
      topRail.rotation.z = Math.PI;
      topRail.position.set(0, 0.86, -0.16);
      topRail.userData.ignoreRaycaster = true;
      chairGroup.add(topRail);

      singleCluster.add(chairGroup);
    });

    clustersGroup.add(singleCluster);
    tablesList.push(singleCluster);
  });

  if (parentGroup) parentGroup.add(clustersGroup);
  return { group: clustersGroup, tables: tablesList };
}

/**
 * ============================================================================
 * PART 1.3: PHÂN KHU C – 4 BÀN ĐÔI VEN LAN CAN & CỔNG CHÀO HIÊN THƯ CÁC
 * 4 Bàn đôi ven lan can tầng 2 (Z ≈ 21.0m, X in [11.5, 27.5])
 * Cổng chào / bảng hiệu đứng lối vào tại (X ≈ 8.5m, Z ≈ 6.0m)
 * ============================================================================
 */
export function buildBalconyBistroTables(parentGroup, options = {}) {
  const balconyGroup = new THREE.Group();
  balconyGroup.name = 'HTC_Balcony_Bistro_Tables_ZoneC';
  balconyGroup.userData = { ignoreRaycaster: true };

  const tableWoodMat = new THREE.MeshStandardMaterial({
    color: 0x221c17,
    roughness: 0.28,
    metalness: 0.22,
    side: THREE.FrontSide
  });
  tableWoodMat.userData = { ignoreRaycaster: true };

  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.20,
    metalness: 0.88,
    side: THREE.FrontSide
  });
  goldTrimMat.userData = { ignoreRaycaster: true };

  const linenCushionMat = new THREE.MeshStandardMaterial({
    color: 0xf5efe6,
    roughness: 0.75,
    metalness: 0.05,
    side: THREE.FrontSide
  });
  linenCushionMat.userData = { ignoreRaycaster: true };

  // 4 Vị trí bàn đôi ven lan can nhìn ra giếng trời
  const bistroPositions = [11.5, 16.5, 22.0, 27.5];

  bistroPositions.forEach((bx, idx) => {
    const bistroPair = new THREE.Group();
    bistroPair.name = `HTC_BistroPair_${idx + 1}`;
    bistroPair.position.set(bx, 10.0, 21.0);
    bistroPair.userData = { ignoreRaycaster: true };

    // Thảm tròn nhỏ bên dưới
    const smallRug = new THREE.Mesh(
      prepHtcGeo(new THREE.CircleGeometry(0.95, 24)).rotateX(-Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: 0x241d18, roughness: 0.85 })
    );
    smallRug.position.y = 0.01;
    smallRug.userData.ignoreRaycaster = true;
    smallRug.userData.isFloor = true;
    bistroPair.add(smallRug);

    // Bàn tròn gỗ nhỏ (Đường kính 0.85m, Cao 0.72m)
    const tableTop = new THREE.Mesh(
      prepHtcGeo(new THREE.CylinderGeometry(0.425, 0.425, 0.05, 24)),
      tableWoodMat
    );
    tableTop.position.set(0, 0.695, 0);
    tableTop.userData.ignoreRaycaster = true;
    bistroPair.add(tableTop);

    // Vành nẹp vàng quanh bàn tròn
    const tableRim = new THREE.Mesh(
      prepHtcGeo(new THREE.TorusGeometry(0.43, 0.015, 6, 24)),
      goldTrimMat
    );
    tableRim.rotation.x = Math.PI / 2;
    tableRim.position.set(0, 0.695, 0);
    tableRim.userData.ignoreRaycaster = true;
    bistroPair.add(tableRim);

    // Chân trụ xòe 3 chấu
    const centerPole = new THREE.Mesh(
      prepHtcGeo(new THREE.CylinderGeometry(0.045, 0.055, 0.67, 12)),
      tableWoodMat
    );
    centerPole.position.set(0, 0.335, 0);
    centerPole.userData.ignoreRaycaster = true;
    bistroPair.add(centerPole);

    const baseStand = new THREE.Mesh(
      prepHtcGeo(new THREE.CylinderGeometry(0.24, 0.28, 0.04, 16)),
      goldTrimMat
    );
    baseStand.position.set(0, 0.02, 0);
    baseStand.userData.ignoreRaycaster = true;
    bistroPair.add(baseStand);

    // 2 Ghế gỗ tựa cong trang nhã ngồi đối diện nhau
    [-0.58, 0.58].forEach((gx, gIdx) => {
      const chair = new THREE.Group();
      chair.position.set(gx, 0, 0);
      chair.rotation.y = gIdx === 0 ? Math.PI / 2 : -Math.PI / 2;
      chair.userData.ignoreRaycaster = true;

      // Đệm tròn bọc lanh kem
      const seat = new THREE.Mesh(
        prepHtcGeo(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 16)),
        linenCushionMat
      );
      seat.position.set(0, 0.42, 0);
      seat.userData.ignoreRaycaster = true;
      chair.add(seat);

      // 3 Chân ghế xòe
      for (let l = 0; l < 3; l++) {
        const ang = (l / 3) * Math.PI * 2;
        const cLeg = new THREE.Mesh(
          prepHtcGeo(new THREE.CylinderGeometry(0.022, 0.018, 0.39, 8)),
          tableWoodMat
        );
        cLeg.position.set(Math.cos(ang) * 0.16, 0.195, Math.sin(ang) * 0.16);
        cLeg.userData.ignoreRaycaster = true;
        chair.add(cLeg);
      }

      // Lưng tựa vòm cong
      const back = new THREE.Mesh(
        prepHtcGeo(new THREE.TorusGeometry(0.22, 0.02, 6, 16, Math.PI)),
        goldTrimMat
      );
      back.rotation.x = Math.PI / 2;
      back.rotation.z = Math.PI;
      back.position.set(0, 0.72, -0.12);
      back.userData.ignoreRaycaster = true;
      chair.add(back);

      bistroPair.add(chair);
    });

    balconyGroup.add(bistroPair);
  });

  if (parentGroup) parentGroup.add(balconyGroup);
  return balconyGroup;
}

/**
 * ============================================================================
 * PART 1.4: CỔNG CHÀO & BẢNG HIỆU ĐỨNG "HIÊN THƯ CÁC"
 * Tọa độ lối vào từ hành lang: X ≈ 8.5m, Z ≈ 6.0m, Y = 10.0m
 * ============================================================================
 */
export function buildEntranceWelcomePlaque(parentGroup, options = {}) {
  const entranceGroup = new THREE.Group();
  entranceGroup.name = 'HTC_Entrance_Welcome_Plaque';
  entranceGroup.position.set(8.5, 10.0, 6.0);
  entranceGroup.rotation.y = Math.PI * 0.25; // Chếch nhẹ 45 độ đón luồng khách từ cầu thang
  entranceGroup.userData = { ignoreRaycaster: true, isStructural: true };

  // Bệ đá xanh Thanh Hóa chạm sen
  const stoneBase = new THREE.Mesh(
    prepHtcGeo(new THREE.BoxGeometry(2.4, 0.35, 0.65)),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.42, metalness: 0.15 })
  );
  stoneBase.position.set(0, 0.175, 0);
  stoneBase.userData.ignoreRaycaster = true;
  entranceGroup.add(stoneBase);

  // 2 Cột gỗ lim sơn son thếp vàng
  const colGeo = prepHtcGeo(new THREE.CylinderGeometry(0.09, 0.10, 2.6, 12));
  const colMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.35, metalness: 0.25 });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.20, metalness: 0.88 });

  [-0.95, 0.95].forEach((cx) => {
    const col = new THREE.Mesh(colGeo, colMat);
    col.position.set(cx, 1.475, 0);
    col.userData.ignoreRaycaster = true;
    entranceGroup.add(col);

    // Chân & Đầu cột mạ vàng
    [0.38, 2.58].forEach((cy) => {
      const cap = new THREE.Mesh(
        prepHtcGeo(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12)),
        goldMat
      );
      cap.position.set(cx, cy, 0);
      cap.userData.ignoreRaycaster = true;
      entranceGroup.add(cap);
    });
  });

  // Mái che ngói đao cong mini
  const roof = new THREE.Mesh(
    prepHtcGeo(new THREE.ConeGeometry(1.6, 0.45, 4)),
    new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.55 })
  );
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(1.4, 1.0, 0.65);
  roof.position.set(0, 2.85, 0);
  roof.userData.ignoreRaycaster = true;
  entranceGroup.add(roof);

  // BẢNG HIỆU ĐỨNG SƠN MÀI THẾP VÀNG
  const signTex = getHtcTex('htc_welcome_sign_hd', 512, 384, (ctx, w, h) => {
    // Nền gỗ then sơn mài đen thẫm bóng gương
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0.0, '#1a1410');
    g.addColorStop(0.5, '#261b14');
    g.addColorStop(1.0, '#140e0a');
    ctx.fillStyle = g;
    ctx.roundRect(10, 10, w - 20, h - 20, 14);
    ctx.fill();

    // Viền kép thếp vàng hoa văn mây cuốn
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 8;
    ctx.strokeRect(16, 16, w - 32, h - 32);

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 2;
    ctx.strokeRect(26, 26, w - 52, h - 52);

    // Đại tự thư pháp
    ctx.fillStyle = '#6ee7b7';
    ctx.font = 'bold 20px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText('❖ BẢO TÀNG VĂN HỌC VIỆT NAM ❖', w / 2, 58);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 36px "Times New Roman", serif';
    ctx.shadowColor = '#d97706';
    ctx.shadowBlur = 12;
    ctx.fillText('📖 HIÊN THƯ CÁC 📖', w / 2, 125);

    ctx.shadowColor = 'transparent';
    ctx.font = 'bold 21px "Times New Roman", serif';
    ctx.fillStyle = '#facc15';
    ctx.fillText('KHÔNG GIAN ĐỌC SÁCH & THƯỞNG TRÀ', w / 2, 175);

    ctx.font = 'italic 17px "Times New Roman", serif';
    ctx.fillStyle = '#fef3c7';
    ctx.fillText('“Lặng ngắm mây trôi • Đọc thiên thu sử”', w / 2, 230);
    ctx.fillText('Trà đạo tao nhã • Thư viện di sản Tầng 2', w / 2, 265);
  });

  const signMat = new THREE.MeshStandardMaterial({
    map: signTex,
    roughness: 0.28,
    metalness: 0.65,
    side: THREE.DoubleSide
  });
  signMat.userData = { ignoreRaycaster: true };

  const signBoard = new THREE.Mesh(
    prepHtcGeo(new THREE.BoxGeometry(1.65, 1.25, 0.06)),
    [goldMat, goldMat, goldMat, goldMat, signMat, signMat]
  );
  signBoard.position.set(0, 1.60, 0);
  signBoard.userData.ignoreRaycaster = true;
  entranceGroup.add(signBoard);

  if (parentGroup) parentGroup.add(entranceGroup);
  return entranceGroup;
}

/**
 * ============================================================================
 * HÀM KHỞI TẠO TỔNG THỂ HIÊN THƯ CÁC (ENTRY POINT)
 * createHienThuCacReadingLounge(options)
 * ============================================================================
 */
export function createHienThuCacReadingLounge(options = {}) {
  const loungeGroup = new THREE.Group();
  loungeGroup.name = 'HienThuCac_ReadingLounge_Master';
  loungeGroup.userData = { ignoreRaycaster: true };

  // 1. Phân khu A: Đại Thư Các Áp Tường
  const wallBookshelf = buildGrandWallBookshelf(loungeGroup, options);

  // 2. Phân khu B: 6 Cụm Bàn Đọc Trung Tâm
  const studyClustersRes = buildCentralStudyClusters(loungeGroup, options);
  const studyTables = studyClustersRes.tables;

  // 3. Phân khu C: 4 Bàn Đôi Ven Lan Can & Cổng Chào
  const balconyTables = buildBalconyBistroTables(loungeGroup, options);
  const entrancePlaque = buildEntranceWelcomePlaque(loungeGroup, options);

  // 4. Tích hợp Chiếu sáng Chiaroscuro & PBR (@munthapden)
  let lightingSystem = null;
  try {
    lightingSystem = setupHienThuCacLighting(loungeGroup, options);
  } catch (err) {
    console.warn('[HienThuCac] Lỗi khởi tạo Lighting:', err);
  }

  // 5. Tích hợp Tương tác 6 Cuốn Sách & Âm thanh (@trangdaonuong)
  let bookSystem = null;
  const { scene, camera, cameraManager } = options;
  if (scene || camera) {
    try {
      bookSystem = new HienThuCacInteractiveBookSystem(scene || loungeGroup, camera, cameraManager);
      const tableCenters = studyTables.map((t) => {
        return new THREE.Vector3(t.position.x, t.position.y + 0.78, t.position.z);
      });
      bookSystem.buildBooksOnTables(tableCenters);
      loungeGroup.add(bookSystem.group);
      bookSystem.initInteraction();
    } catch (err) {
      console.warn('[HienThuCac] Lỗi khởi tạo Book System:', err);
    }
  }

  // Hook điểm mở rộng cho các đồng đội:
  // - Part 2 (@vangtho): Đạo cụ, Trà Đạo & Tiểu cảnh
  // - Part 5 (@xiemtuan): Hitbox & Collision

  const update = (timeSec = performance.now() * 0.001, delta = 0.016, activeCam = null) => {
    loungeGroup.userData.updateProps?.(timeSec);
    if (lightingSystem?.update) lightingSystem.update(timeSec);
    if (bookSystem?.update) bookSystem.update(delta, timeSec, activeCam || camera);
    loungeGroup.userData.updateLore?.(timeSec);
  };

  const registerHitboxes = (hitboxManager) => {
    loungeGroup.userData.registerHitboxes?.(hitboxManager);
  };

  const dispose = () => {
    bookSystem?.dispose?.();
  };

  loungeGroup.userData.update = update;
  loungeGroup.userData.registerHitboxes = registerHitboxes;
  loungeGroup.userData.dispose = dispose;

  return {
    group: loungeGroup,
    loungeGroup,
    wallBookshelf,
    studyTables,
    balconyTables,
    entrancePlaque,
    li