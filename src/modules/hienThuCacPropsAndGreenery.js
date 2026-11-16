import * as THREE from 'three';
import { getHienThuCacMaterials } from './hienThuCacLightingAndMaterials.js';

/**
 * ============================================================================
 * HIÊN THƯ CÁC – PROPS, TEA CEREMONY & HERITAGE GREENERY (PART 2)
 * Phụ trách bởi: Mèo Vàng Thợ Rèn (vangtho)
 * 
 * CÁC HẠNG MỤC SỞ HỮU:
 * 1. ĐẠO CỤ BÀN ĐỌC & TRÀ ĐẠO:
 *    - Đèn bàn cổ điển chụp đồng / ngọc bích tỏa sáng ấm áp 2700K (Brass & Celadon Banker Lamp).
 *    - Giá gỗ kê sách chạm khắc hoa sen nâng đỡ bản thảo di sản (Carved Lotus Wooden Bookstand).
 *    - Chồng sách cổ 2-3 cuốn bìa lụa gấm / da gáy chỉ vàng dập vân (Antique Book Stacks).
 *    - Bộ ấm chén trà đạo sứ trắng men ngà (Kyusu Teapot & Porcelain Tea Cups) trên khay gỗ mun.
 *    - Hiệu ứng khói trà mỏng nhẹ sống động (Living Tea Mist / Steam Particle VFX) 60+ FPS zero GC.
 *    - Ống bút lông trúc & nghiên mực đá đen mài bóng kèm thỏi mực vàng (Brush Pot & Ink Stone).
 * 
 * 2. TIỂU CẢNH & CÂY XANH DI SẢN:
 *    - Đôn sứ trắng hoàng gia viền chỉ vàng kim (White Porcelain Pedestal Planters).
 *    - Bụi Trúc Quân Tử thân ngọc lá biếc vươn cao (Aristocratic Slender Bamboos).
 *    - Cây Tùng Bonsai cổ thụ gân guốc tán mây tầng bậc (Gnarled Pine Bonsai with Cloud Pads).
 *    - Bố trí nhịp điệu ranh giới hành lang X = 8.0m, chân cột tròn và ven lan can giếng trời.
 * ============================================================================
 */

// Bộ đệm Cache Canvas Texture nội bộ cho Part 2
const PROPS_TEX_CACHE = {};

function getPropsTex(key, w, h, drawFn) {
  if (PROPS_TEX_CACHE[key]) return PROPS_TEX_CACHE[key];
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
  PROPS_TEX_CACHE[key] = tex;
  return tex;
}

/**
 * Chuẩn hóa Geometry, tính pháp tuyến & khử sạch triệt để NaN/Infinity
 */
export function prepHtcGeo(geo) {
  if (!geo) return geo;
  try {
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    const pos = geo.attributes.position;
    if (pos) {
      const arr = pos.array;
      for (let i = 0; i < arr.length; i++) {
        if (!Number.isFinite(arr[i])) arr[i] = 0;
      }
      pos.needsUpdate = true;
    }
    const norm = geo.attributes.normal;
    if (norm) {
      const arr = norm.array;
      for (let i = 0; i < arr.length; i++) {
        if (!Number.isFinite(arr[i])) arr[i] = 0;
      }
      norm.needsUpdate = true;
    }
  } catch (_) {}
  return geo;
}

// ============================================================================
// 1. VẬT LIỆU CHUYÊN BIỆT CHO ĐẠO CỤ & CÂY XANH
// ============================================================================
let localPropsMaterials = null;

export function getPropsMaterials() {
  if (localPropsMaterials) return localPropsMaterials;

  // Lấy các vật liệu PBR cơ bản từ module Lighting & Materials
  let basePbr = {};
  try {
    basePbr = getHienThuCacMaterials();
  } catch (_) {}

  // 1. Đồng thau chải xước cổ (Antique Brushed Brass)
  const antiqueBrassMat = new THREE.MeshStandardMaterial({
    color: 0xc8963e,
    roughness: 0.28,
    metalness: 0.82,
    side: THREE.FrontSide
  });
  antiqueBrassMat.userData = { ignoreRaycaster: true };

  // 2. Chụp đèn men ngọc Celadon bóng kính (Celadon Glass Shade)
  const celadonGlassMat = new THREE.MeshStandardMaterial({
    color: 0x2e7d5e,
    roughness: 0.15,
    metalness: 0.18,
    side: THREE.DoubleSide
  });
  celadonGlassMat.userData = { ignoreRaycaster: true };

  // 3. Đá đen nghiên mực Ninh Bình (Black Ink Stone)
  const inkStoneMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.45,
    metalness: 0.15,
    side: THREE.FrontSide
  });
  inkStoneMat.userData = { ignoreRaycaster: true };

  // 4. Mực tàu đen bóng gương đọng trong nghiên (Wet Chinese Ink)
  const wetInkMat = new THREE.MeshStandardMaterial({
    color: 0x050505,
    roughness: 0.05,
    metalness: 0.75,
    side: THREE.FrontSide
  });
  wetInkMat.userData = { ignoreRaycaster: true };

  // 5. Thân trúc vàng ngọc óng ả (Bamboo Stalk)
  const bambooStalkMat = new THREE.MeshStandardMaterial({
    color: 0x65a30d,
    roughness: 0.35,
    metalness: 0.12,
    side: THREE.FrontSide
  });
  bambooStalkMat.userData = { ignoreRaycaster: true };

  // 6. Khớp đốt trúc vàng sẫm (Bamboo Joint)
  const bambooJointMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.45,
    metalness: 0.15,
    side: THREE.FrontSide
  });
  bambooJointMat.userData = { ignoreRaycaster: true };

  // 7. Lá trúc xanh non bóng mờ (Bamboo Leaf DoubleSide)
  const bambooLeafMat = new THREE.MeshStandardMaterial({
    color: 0x4d7c0f,
    roughness: 0.32,
    metalness: 0.05,
    side: THREE.DoubleSide
  });
  bambooLeafMat.userData = { ignoreRaycaster: true };

  // 8. Vỏ cây tùng già cỗi sần sùi (Gnarled Pine Bark)
  const pineBarkMat = new THREE.MeshStandardMaterial({
    color: 0x3b2314,
    roughness: 0.85,
    metalness: 0.05,
    side: THREE.FrontSide
  });
  pineBarkMat.userData = { ignoreRaycaster: true };

  // 9. Tán lá mây tùng xanh thẫm (Pine Cloud Foliage Pad)
  const pineFoliageMat = new THREE.MeshStandardMaterial({
    color: 0x14532d,
    roughness: 0.72,
    metalness: 0.08,
    side: THREE.FrontSide
  });
  pineFoliageMat.userData = { ignoreRaycaster: true };

  // 10. Rêu nhung phủ chậu (Velvet Moss)
  const mossMat = new THREE.MeshStandardMaterial({
    color: 0x2e6930,
    roughness: 0.90,
    metalness: 0.02,
    side: THREE.FrontSide
  });
  mossMat.userData = { ignoreRaycaster: true };

  // 11. Nước trà xanh hổ phách sóng sánh (Amber Green Tea)
  const amberTeaMat = new THREE.MeshStandardMaterial({
    color: 0x84cc16,
    emissive: 0x3f6212,
    emissiveIntensity: 0.25,
    roughness: 0.08,
    metalness: 0.15,
    side: THREE.FrontSide
  });
  amberTeaMat.userData = { ignoreRaycaster: true };

  // 12. Hạt khói trà mỏng nhẹ (Tea Steam Sprite Particle Material)
  const steamTex = getPropsTex('htc_steam_particle_soft_alpha', 128, 128, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, cx);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 0.75)');
    grad.addColorStop(0.3, 'rgba(250, 245, 235, 0.45)');
    grad.addColorStop(0.7, 'rgba(240, 230, 215, 0.15)');
    grad.addColorStop(1.0, 'rgba(240, 230, 215, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });

  const steamParticleMat = new THREE.MeshBasicMaterial({
    map: steamTex,
    color: 0xfff8ee,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  steamParticleMat.userData = { ignoreRaycaster: true };

  localPropsMaterials = {
    antiqueBrassMat,
    celadonGlassMat,
    inkStoneMat,
    wetInkMat,
    bambooStalkMat,
    bambooJointMat,
    bambooLeafMat,
    pineBarkMat,
    pineFoliageMat,
    mossMat,
    amberTeaMat,
    steamParticleMat,
    ebonyWoodMat: basePbr.ebonyWoodMat || new THREE.MeshStandardMaterial({ color: 0x181412, roughness: 0.38, metalness: 0.12 }),
    antiqueGoldMat: basePbr.antiqueGoldMat || new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.24, metalness: 0.86 }),
    whitePorcelainMat: basePbr.whitePorcelainMat || new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.12, metalness: 0.05 }),
    celadonJadeMat: basePbr.celadonJadeMat || new THREE.MeshStandardMaterial({ color: 0xa7f3d0, roughness: 0.18, metalness: 0.08 }),
    creamLinenMat: basePbr.creamLinenMat || new THREE.MeshStandardMaterial({ color: 0xf5efe6, roughness: 0.85, metalness: 0.02 })
  };

  return localPropsMaterials;
}

// ============================================================================
// 2. TẠO HÌNH CHI TIẾT CÁC ĐẠO CỤ BÀN ĐỌC
// ============================================================================

/**
 * 2.1. Đèn bàn cổ điển chụp đồng / ngọc bích tỏa sáng ấm áp (Brass Banker Desk Lamp)
 */
export function createClassicDeskLamp(options = {}) {
  const mats = getPropsMaterials();
  const lampGroup = new THREE.Group();
  lampGroup.name = 'HTC_Classic_Desk_Lamp';
  lampGroup.userData = { ignoreRaycaster: true };

  // Đế đèn đúc đồng tròn 2 tầng giật cấp
  const baseLower = new THREE.Mesh(
    prepHtcGeo(new THREE.CylinderGeometry(0.09, 0.095, 0.015, 16)),
    mats.antiqueBrassMat
  );
  baseLower.position.y = 0.0075;
  baseLower.userData.ignoreRaycaster = true;
  lampGroup.add(baseLower);

  const baseUpper = new THREE.Mesh(
    prepHtcGeo(new THREE.CylinderGeometry(0.07, 0.08, 0.015, 16)),
    mats.antiqueBrassMat
  );
  baseUpper.position.y = 0.02;
  baseUpper.userData.ignoreRaycaster = true;
  lampGroup.add(baseUpper);

  // Thân trụ đèn uốn cong thanh thoát
  const stem = new THREE.Mesh(
    prepHtcGeo(new THREE.CylinderGeometry(0.012, 0.012, 0.32, 12)),
    mats.antiqueBrassMat
  );
  stem.position.set(0, 0.175, 0);
  stem.userData.ignoreRaycaster = true;
  lampGroup.add(stem);

  // Khớp nối xoay ngang đỉnh đèn
  const joint = new THREE.Mesh(
    prepHtcGeo(new THREE.CylinderGeometry(0.016, 0.016, 0.16, 12).rotateZ(Math.PI / 2)),
    mats.antiqueGoldMat
  );
  joint.position.set(0, 0.33, 0);
  joint.userData.ignoreRaycaster = true;
  lampGroup.add(joint);

  // Chao đèn vòm bán trụ ngọc bích / celadon viền nẹp đồng
  const shadeGeo = prepHtcGeo(new THREE.CylinderGeometry(0.065, 0.065, 0.22, 16, 1, false, 0, Math.PI));
  const shade = new THREE.Mesh(shadeGeo, mats.celadonGlassMat);
  shade.rotation.z = Math.PI / 2;
  shade.rotation.x = Math.PI * 0.15; // Nghiêng nhẹ rọi xuống bàn
  shade.position.set(0, 0.34, 0.02);
  shade.userData.ignoreRaycaster = true;
  lampGroup.add(shade);

  // Nẹp viền vàng hai đầu chao đèn
  [-0.108, 0.108].forEach((ex) => {
    const endCap = new THREE.Mesh(
      prepHtcGeo(new THREE.TorusGeometry(0.066, 0.006, 6, 16, Math.PI)),
      mats.antiqueGoldMat
    );
    endCap.rotation.y = Math.PI / 2;
    endCap.rotation.z = Math.PI * 0.15;
    endCap.position.set(ex, 0.34, 0.02);
    endCap.userData.ignoreRaycaster = true;
    lampGroup.add(endCap);
  });

  // Bóng đèn LED ấm 2700K bên trong chao
  const bulb = new THREE.Mesh(
    prepHtcGeo(new THREE.SphereGeometry(0.022, 8, 8)),
    new THREE.MeshBasicMaterial({ color: 0xffe8ba })
  );
  bulb.position.set(0, 0.325, 0.02);
  bulb.userData.ignoreRaycaster = true;
  lampGroup.add(bulb);

  // Đèn PointLight ấm áp nội tại (0.42 intensity, bán kính 2.2m)
  const pointLight = new THREE.PointLight(0xffedd5, 0.42, 2.4, 2.0);
  pointLight.position.set(0, 0.30, 0.03);
  pointLight.castShadow = false;
  pointLight.userData.ignoreRaycaster = true;
  lampGroup.add(pointLight);

  // Dây kéo bật tắt đính hạt ngọc đồng buông xuống
  const pullChain = new THREE.Mesh(
    prepHtcGeo(new THREE.CylinderGeometry(0.002, 0.002, 0.12, 6)),
    mats.antiqueBrassMat
  );
  pullChain.position.set(0.05, 0.24, 0.03);
  pullChain.userData.ignoreRaycaster = true;
  lampGroup.add(pullChain);

  const pullBead = new THREE.Mesh(
    prepHtcGeo(new THREE.SphereGeometry(0.007, 6, 6)),
    mats.antiqueGoldMat
  );
  pullBead.position.set(0.05, 0.18, 0.03);
  pullBead.userData.ignoreRaycaster = true;
  lampGroup.add(pullBead);

  return lampGroup;
}

/**
 * 2.2. Giá gỗ kê sách chạm khắc hoa sen nâng đỡ bản thảo (Carved Lotus Wooden Bookstand)
 */
export function createLotusWoodenBookstand(options = {}) {
  const mats = getPropsMaterials();
  const standGroup = new THREE.Group();
  standGroup.name = 'HTC_Lotus_Wooden_Bookstand';
  standGroup.userData = { ignoreRaycaster: true };

  // 1. Đế gỗ mun nằm trên mặt bàn (0.38m x 0.26m x 0.02m)
  const basePlank = new THREE.Mesh(
    prepHtcGeo(new THREE.BoxGeometry(0.38, 0.02, 0.26)),
    mats.ebonyWoodMat
  );
  basePlank.position.y = 0.01;
  basePlank.userData.ignoreRaycaster = true;
  standGroup.add(basePlank);

  // Viền chỉ vàng đế gỗ
  const baseTrim = new THREE.Mesh(
    prepHtcGeo(new THREE.BoxGeometry(0.385, 0.008, 0.265)),
    mats.antiqueGoldMat
  );
  baseTrim.position.y = 0.004;
  baseTrim.userData.ignoreRaycaster = true;
  standGroup.add(baseTrim);

  // 2. Mặt giá nghiêng 20 độ đỡ sách (0.36m x 0.24m x 0.015m)
  const slantedPanel = new THREE.Mesh(
    prepHtcGeo(new THREE.BoxGeometry(0.36, 0.015, 0.24)),
    mats.ebonyWoodMat
  );
  slantedPanel.rotation.x = -0.32; // Nghiêng khoảng 18.5 độ
  slantedPanel.position.set(0, 0.065, -0.01);
  slantedPanel.userData.ignoreRaycaster = true;
  standGroup.add(slantedPanel);

  // Gờ chặn gáy sách phía dưới
  const lipRail = new THREE.Mesh(
    prepHtcGeo(new THREE.BoxGeometry(0.36, 0.03, 0.02)),
    mats.antiqueGoldMat
  );
  lipRail.rotation.x = -0.32;
  lipRail.position.set(0, 0.035, 0.10);
  lipRail.userData.ignoreRaycaster = true;
  standGroup.add(lipRail);

  // 2 Tay kẹp giữ trang sách bằng đồng thau chạm rồng/sen hai bên
  [-0.14, 0.14].forEach((kx) => {
    const clip = new THREE.Mesh(
      prepHtcGeo(new THREE.BoxGeometry(0.016, 0.045, 0.012)),
      mats.antiqueBrassMat
    );
    clip.rotation.x = -0.32;
    clip.position.set(kx, 0.05, 0.09);
    clip.userData.ignoreRaycaster = true;
    standGroup.add(clip);
  });

  return standGroup;
}

/**
 * 2.3. Chồng sách cổ 2-3 cuốn bìa lụa gấm / da gáy chỉ vàng dập vân (Antique Book Stacks)
 */
export function createAntiqueBookStack(options = {}) {
  const mats = getPropsMaterials();
  const stackGroup = new THREE.Group();
  stackGroup.name = 'HTC_Antique_Book_Stack';
  stackGroup.userData = { ignoreRaycaster: true };

  // Màu sắc bìa sách cổ phong: Đỏ chu sa, Chàm thẫm, Nâu hổ phách
  const bookThemes = [
    { color: 0x881337, w: 0.28, d: 0.21, h: 0.045, rotY: 0.04 },
    { color: 0x1e3a8a, w: 0.26, d: 0.19, h: 0.040, rotY: -0.08 },
    { color: 0x78350f, w: 0.24, d: 0.18, h: 0.035, rotY: 0.12 }
  ];

  let currentY = 0;
  bookThemes.forEach((b, idx) => {
    const singleBook = new THREE.Group();
    singleBook.position.set(0, currentY, 0);
    singleBook.rotation.y = b.rotY;
    singleBook.userData.ignoreRaycaster = true;

    // Ruột trang sách giấy dó ngả vàng
    const pagesMesh = new THREE.Mesh(
      prepHtcGeo(new THREE.BoxGeometry(b.w - 0.015, b.h - 0.008, b.d - 0.01)),
      new THREE.MeshStandardMaterial({ color: 0xf5eedb, roughness: 0.85, metalness: 0.02 })
    );
    pagesMesh.position.set(0.005, b.h * 0.5, 0);
    pagesMesh.userData.ignoreRaycaster = true;
    singleBook.add(pagesMesh);

    // Bìa bọc gấm / da cổ điển
    const bookCoverMat = new THREE.MeshStandardMaterial({
      color: b.color,
      roughness: 0.65,
      metalness: 0.15,
      side: THREE.FrontSide
    });
    bookCoverMat.userData = { ignoreRaycaster: true };

    // Bìa trên & dưới
    [-b.h * 0.5 + 0.002, b.h * 0.5 - 0.002].forEach((by) => {
      const cover = new THREE.Mesh(
        prepHtcGeo(new THREE.BoxGeometry(b.w, 0.004, b.d)),
        bookCoverMat
      );
      cover.position.set(0, b.h * 0.5 + by, 0);
      cover.userData.ignoreRaycaster = true;
      singleBook.add(cover);
    });

    // Gáy sách dập chỉ vàng
    const spine = new THREE.Mesh(
      prepHtcGeo(new THREE.CylinderGeometry(b.h * 0.5, b.h * 0.5, b.d, 8, 1, false, 0, Math.PI)),
      mats.antiqueGoldMat
    );
    spine.rotation.x = Math.PI / 2;
    spine.position.set(-b.w * 0.5, b.h * 0.5, 0);
    spine.userData.ignoreRaycaster = true;
    singleBook.add(spine);

    // Ruy băng đánh dấu trang lụa đỏ buông thõng từ cuốn trên cùng
    if (idx === bookThemes.length - 1) {
      const ribbon = new THREE.Mesh(
        prepHtcGeo(new THREE.BoxGeometry(0.018, 0.003, 0.28)),
        new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 })
      );
      ribbon.position.set(0.04, b.h + 0.002, 0.06);
      ribbon.rotation.y = 0.25;
      ribbon.userData.ignoreRaycaster = true;
      singleBook.add(ribbon);
    }

    stackGroup.add(singleBook);
    currentY += b.h;
  });

  return stackGroup;
}

/**
 * 2.4. Bộ ấm chén trà đạo sứ trắng men ngà (White Porcelain Tea Set)
 */
export function createWhitePorcelainTeaSet(options = {}) {
  const mats = getPropsMaterials();
  const teaSetGroup = new THREE.Group();
  teaSetGroup.name = 'HTC_White_Porcelain_Tea_Set';
  teaSetGroup.userData = { ignoreRaycaster: true };

  // 1. Khay trà gỗ mun hình chữ nhật bo góc viền vàng (0.42m x 0.28m x 0.025m)
  const trayBase = new THREE.Mesh(
    prepHtcGeo(new THREE.BoxGeometry(0.42, 0.02, 0.28)),
    mats.ebonyWoodMat
  );
  trayBase.position.y = 0.01;
  trayBase.userData.ignoreRaycaster = true;
  teaSetGroup.add(trayBase);

  // Viền vàng kim mạ quanh mép khay
  const trayRim = new THREE.Mesh(
    prepHtcGeo(new THREE.BoxGeometry(0.43, 0.012, 0.29)),
    mats.antiqueGoldMat
  );
  trayRim.position.y = 0.018;
  trayRim.userData.ignoreRaycaster = true;
  teaSetGroup.add(trayRim);

  // 2. Ấm trà sứ trắng men ngà (Kyusu Teapot) đặt tại vị trí trung tâm khay (x: -0.08, z: 0)
  const teapotGroup = new THREE.Group();
  teapotGroup.position.set(-0.08, 0.02, 0);
  teapotGroup.userData = { ignoreRaycaster: true };

  // Thân ấm hình quả lê tròn dẹt
  const potBody = new THREE.Mesh(
    prepHtcGeo(new THREE.SphereGeometry(0.065, 16, 12)),
    mats.whitePorcelainMat
  );
  potBody.scale.set(1.0, 0.85, 1.0);
  potBody.position.y = 0.06;
  potBody.userData.ignoreRaycaster = true;
  teapotGroup.add(potBody);

  // Đáy chân ấm
  const potFoot = new THREE.Mesh(
    prepHtcGeo(new THREE.CylinderGeometry(0.042, 0.045, 0.012, 16)),
    mats.whitePorcelainMat
  );
  potFoot.position.y = 0.006;
  potFoot.userData.ignoreRaycaster = true;
  teapotGroup.add(potFoot);

  // Nắp ấm có núm búp sen mạ vàng
  const potLid = new THREE.Mesh(
    prepHtcGeo(new THREE.CylinderGeometry(0.038, 0.044, 0.014, 16)),
    mats.whitePorcelainMat
  );
  potLid.position.y = 0.115;
  potLid.userData.ignoreRaycaster = true;
  teapotGroup.add(potLid);

  const potKnob = new THREE.Mesh(
    prepHtcGeo(new THREE.SphereGeometry(0.01, 8, 8)),
    mats.antiqueGoldMat
  );
  potKnob.position.y = 0.13;
  potKnob.userData.ignoreRaycaster = true;
  teapotGroup.add(potKnob);

  // Vòi ấm vươn cong tinh tế hướng về phía chén trà (+X)
  const spoutGeo = prepHtcGeo(new THREE.CylinderGeometry(0.010, 0.018, 0.075, 12).rotateZ(-Math.PI * 0.35));
  const spout = new THREE.Mesh(spoutGeo, mats.whitePorcelainMat);
  spout.position.set(0.075, 0.075, 0);
  spout.userData.ignoreRaycaster = true;
  teapotGroup.add(spout);

  // Quai ấm tre uốn vòm cung phía trên
  const handleGeo = prepHtcGeo(new THREE.TorusGeometry(0.055, 0.007, 8, 16, Math.PI));
  const handle = new THREE.Mesh(handleGeo, mats.bambooJointMat);
  handle.rotation.x = Math.PI / 2;
  handle.rotation.z = Math.PI / 2;
  handle.position.set(-0.01, 0.11, 0);
  handle.userData.ignoreRaycaster = true;
  teapotGroup.add(handle);

  teaSetGroup.add(teapotGroup);

  // 3. Chén tống (chén chuyên trà) sứ trắng (x: 0.06, z: -0.06)
  const pitcher = new THREE.Mesh(
    prepHtcGeo(new THREE.CylinderGeometry(0.038, 0.026, 0.05, 16)),
    mats.whitePorcelainMat
  );
  pitcher.position.set(0.06, 0.045, -0.06);
  pitcher.userData.ignoreRaycaster = true;
  teaSetGroup.add(pitcher);

  // Nước trà sóng sánh trong chén tống
  const pitcherTea = new THREE.Mesh(
    prepHtcGeo(new THREE.CircleGeometry(0.034, 16).rotateX(-Math.PI / 2)),
    mats.amberTeaMat
  );
  pitcherTea.position.set(0.06, 0.062, -0.06);
  pitcherTea.userData.ignoreRaycaster = true;
  teaSetGroup.add(pitcherTea);

  // 4. 2 Chén quân sứ trắng thanh khiết (x: 0.05, z: 0.04) & (x: 0.13, z: 0.02)
  const cupCoords = [
    { x: 0.05, z: 0.04 },
    { x: 0.13, z: 0.02 }
  ];

  cupCoords.forEach((cc, idx) => {
    // Đĩa lót chén
    const saucer = new THREE.Mesh(
      prepHtcGeo(new THREE.CylinderGeometry(0.035, 0.028, 0.006, 14)),
      mats.whitePorcelainMat
    );
    saucer.position.set(cc.x, 0.023, cc.z);
    saucer.userData.ignoreRaycaster = true;
    teaSetGroup.add(saucer);

    // Chén trà nhỏ
    const cup = new THREE.Mesh(
      prepHtcGeo(new THREE.CylinderGeometry(0.025, 0.018, 0.032, 14)),
      mats.whitePorcelainMat
    );
    cup.position.set(cc.x, 0.038, cc.z);
    cup.userData.ignoreRaycaster = true;
    teaSetGroup.add(cup);

    // Nước trà xanh hổ phách trong chén
    const teaWater = new THREE.Mesh(
      prepHtcGeo(new THREE.CircleGeometry(0.022, 12).rotateX(-Math.PI / 2)),
      mats.amberTeaMat
    );
    teaWater.position.set(cc.x, 0.048, cc.z);
    teaWater.userData.ignoreRaycaster = true;
    teaSetGroup.add(teaWater);
  });

  // 5. Hũ đựng trà khô men ngọc Celadon (x: -0.12, z: 0.08)
  const caddy = new THREE.Mesh(
    prepHtcGeo(new THREE.CylinderGeometry(0.032, 0.032, 0.065, 14)),
    mats.celadonJadeMat
  );
  caddy.position.set(-0.12, 0.052, 0.08);
  caddy.userData.ignoreRaycaster = true;
  teaSetGroup.add(caddy);

  const caddyLid = new THREE.Mesh(
    prepHtcGeo(new THREE.CylinderGeometry(0.034, 0.034, 0.012, 14)),
    mats.antiqueGoldMat
  );
  caddyLid.position.set(-0.12, 0.088, 0.08);
  caddyLid.userData.ignoreRaycaster = true;
  teaSetGroup.add(caddyLid);

  return teaSetGroup;
}

/**
 * 2.5. Ống bút lông trúc & Nghiên mực đá đen thiên nhiên (Brush Pot & Ink Stone)
 */
export function createCalligraphyBrushPotAndInkStone(options = {}) {
  const mats = getPropsMaterials();
  const writingGroup = new THREE.Group();
  writingGroup.name = 'HTC_Calligraphy_Writing_Set';
  writingGroup.userData = { ignoreRaycaster: true };

  // 1. Ống cắm bút bằng đốt tre già khắc hoa cúc viền đồng
  const potGroup = new THREE.Group();
  potGroup.position.set(-0.08, 0, 0);
  potGroup.userData.ignoreRaycaster = true;

  const potMesh = new THREE.Mesh(
    prepHtcGeo(new THREE.CylinderGeometry(0.042, 0.038, 0.15, 16)),
    mats.bambooJointMat
  );
  potMesh.position.y = 0.075;
  potMesh.userData.ignoreRaycaster = true;
  potGroup.add(potMesh);

  // Viền vàng kim miệng ống bút
  const rimGold = new THREE.Mesh(
    prepHtcGeo(new THREE.TorusGeometry(0.042, 0.005, 6, 16)),
    mats.antiqueGoldMat
  );
  rimGold.rotation.x = Math.PI / 2;
  rimGold.position.y = 0.15;
  rimGold.userData.ignoreRaycaster = true;
  potGroup.add(rimGold);

  // 3 Cây bút lông cán trúc cắm nghiêng tự nhiên trong ống
  const brushConfigs = [
    { tiltX: 0.12, tiltZ: 0.10, len: 0.22, tipColor: 0x262626 },
    { tiltX: -0.15, tiltZ: 0.08, len: 0.20, tipColor: 0xffffff },
    { tiltX: 0.05, tiltZ: -0.14, len: 0.24, tipColor: 0x3b1e14 }
  ];

  brushConfigs.forEach((b) => {
    const singleBrush = new THREE.Group();
    singleBrush.position.set(0, 0.06, 0);
    singleBrush.rotation.x = b.tiltX;
    singleBrush.rotation.z = b.tiltZ;
    singleBrush.userData.ignoreRaycaster = true;

    // Cán bút lông bằng trúc vàng
    const handle = new THREE.Mesh(
      prepHtcGeo(new THREE.CylinderGeometry(0.005, 0.005, b.len, 8)),
      mats.bambooStalkMat
    );
    handle.position.y = b.len * 0.5;
    handle.userData.ignoreRaycaster = true;
    singleBrush.add(handle);

    // Bọc đồng nối ngòi bút
    const ferrule = new THREE.Mesh(
      prepHtcGeo(new THREE.CylinderGeometry(0.006, 0.006, 0.02, 8)),
      mats.antiqueGoldMat
    );
    ferrule.position.y = b.len + 0.01;
    ferrule.userData.ignoreRaycaster = true;
    singleBrush.add(ferrule);

    // Ngòi lông vuốt nhọn hướng lên
    const tip = new THREE.Mesh(
      prepHtcGeo(new THREE.ConeGeometry(0.007, 0.04, 8)),
      new THREE.MeshStandardMaterial({ color: b.tipColor, roughness: 0.9 })
    );
    tip.position.y = b.len + 0.035;
    tip.userData.ignoreRaycaster = true;
    singleBrush.add(tip);

    potGroup.add(singleBrush);
  });

  writingGroup.add(potGroup);

  // 2. Nghiên mực đá đen Ninh Bình (Black Ink Stone) (x: 0.08, z: 0)
  const inkStoneGroup = new THREE.Group();
  inkStoneGroup.position.set(0.08, 0, 0);
  inkStoneGroup.userData.ignoreRaycaster = true;

  // Phiến đá đen bầu dục bo viền mềm mại (0.16m x 0.11m x 0.025m)
  const stoneBody = new THREE.Mesh(
    prepHtcGeo(new THREE.CylinderGeometry(0.06, 0.062, 0.025, 20)),
    mats.inkStoneMat
  );
  stoneBody.scale.set(1.3, 1.0, 0.9);
  stoneBody.position.y = 0.0125;
  stoneBody.userData.ignoreRaycaster = true;
  inkStoneGroup.add(stoneBody);

  // Lòng trũng chứa mực đọng bóng loáng
  const inkPool = new THREE.Mesh(
    prepHtcGeo(new THREE.CylinderGeometry(0.045, 0.045, 0.005, 16)),
    mats.wetInkMat
  );
  inkPool.scale.set(1.2, 1.0, 0.85);
  inkPool.position.set(0.01, 0.023, 0);
  inkPool.userData.ignoreRaycaster = true;
  inkStoneGroup.add(inkPool);

  // Thỏi mực tàu khắc chữ vàng gác nhẹ chéo góc nghiên
  const inkStick = new THREE.Mesh(
    prepHtcGeo(new THREE.BoxGeometry(0.022, 0.014, 0.08)),
    new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.25, metalness: 0.6 })
  );
  inkStick.rotation.y = 0.45;
  inkStick.position.set(-0.045, 0.028, 0.02);
  inkStick.userData.ignoreRaycaster = true;
  inkStoneGroup.add(inkStick);

  // Chữ thếp vàng trên thỏi mực
  const goldInsignia = new THREE.Mesh(
    prepHtcGeo(new THREE.BoxGeometry(0.012, 0.004, 0.03)),
    mats.antiqueGoldMat
  );
  goldInsignia.rotation.y = 0.45;
  goldInsignia.position.set(-0.045, 0.036, 0.02);
  goldInsignia.userData.ignoreRaycaster = true;
  inkStoneGroup.add(goldInsignia);

  writingGroup.add(inkStoneGroup);

  return writingGroup;
}

// ============================================================================
// 3. HỆ THỐNG KHÓI TRÀ MỎNG NHẸ SỐNG ĐỘNG (LIVING TEA STEAM PARTICLE VFX)
// ============================================================================

/**
 * Quản lý hạt khói trà bốc hơi 60+ FPS, Zero dynamic memory allocations
 */
export function createTeaSteamVfx(parentGroup, emitterPositions = []) {
  const mats = getPropsMaterials();
  const numEmitters = Math.max(emitterPositions.length, 1);
  const particlesPerEmitter = 8;
  const totalParticles = numEmitters * particlesPerEmitter;

  // Sử dụng InstancedMesh với PlaneGeometry đơn giản
  const puffGeo = prepHtcGeo(new THREE.PlaneGeometry(0.065, 0.065));
  const instancedMesh = new THREE.InstancedMesh(puffGeo, mats.steamParticleMat, totalParticles);
  instancedMesh.name = 'HTC_Tea_Steam_VFX_InstancedMesh';
  instancedMesh.userData = { ignoreRaycaster: true, isParticleVfx: true };
  instancedMesh.frustumCulled = false;

  // Mảng dữ liệu tĩnh cho từng hạt khói
  const particleData = [];
  const dummy = new THREE.Object3D();

  let pIdx = 0;
  emitterPositions.forEach((pos, eIdx) => {
    for (let p = 0; p < particlesPerEmitter; p++) {
      const lifetime = 2.4 + (p / particlesPerEmitter) * 0.8;
      const birthOffset = (p / particlesPerEmitter) * lifetime;
      const seed = eIdx * 11 + p * 3.7;

      particleData.push({
        baseX: pos.x,
        baseY: pos.y,
        baseZ: pos.z,
        lifetime: lifetime,
        birthOffset: birthOffset,
        speedY: 0.18 + (p % 3) * 0.04,
        swayFreq: 2.2 + (p % 4) * 0.6,
        swayAmp: 0.03 + (p % 3) * 0.015,
        rotSpeed: 0.4 + (p % 5) * 0.2,
        seed: seed
      });

      // Khởi tạo ma trận ban đầu
      dummy.position.set(pos.x, pos.y, pos.z);
      dummy.scale.set(0.001, 0.001, 0.001);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(pIdx++, dummy.matrix);
    }
  });

  instancedMesh.instanceMatrix.needsUpdate = true;
  if (parentGroup) parentGroup.add(instancedMesh);

  /**
   * Cập nhật vòng lặp khói trà theo thời gian
   */
  const updateSteam = (timeSec) => {
    if (!instancedMesh.visible) return;

    for (let i = 0; i < totalParticles; i++) {
      const p = particleData[i];
      const age = (timeSec + p.birthOffset) % p.lifetime;
      const progress = age / p.lifetime; // Từ 0.0 -> 1.0

      // Chuyển động vươn lên theo phương Y (khoảng 0.55m)
      const posY = p.baseY + progress * (p.lifetime * p.speedY);

      // Đong đưa lượn sóng theo phương X, Z
      const posX = p.baseX + Math.sin(progress * p.swayFreq * Math.PI * 2 + p.seed) * p.swayAmp;
      const posZ = p.baseZ + Math.cos(progress * p.swayFreq * Math.PI * 2 + p.seed * 1.5) * p.swayAmp;

      // Độ lớn: Nở rộng từ nhỏ (0.3x) đến cực đại (1.8x) rồi tan biến
      let scale = Math.sin(progress * Math.PI) * 1.6;
      if (scale < 0.001) scale = 0.001;

      dummy.position.set(posX, posY, posZ);
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.z = timeSec * p.rotSpeed + p.seed;
      dummy.updateMatrix();

      instancedMesh.setMatrixAt(i, dummy.matrix);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
  };

  return {
    instancedMesh,
    updateSteam
  };
}

// ============================================================================
// 4. TIỂU CẢNH & CÂY XANH DI SẢN (HERITAGE PLANTERS & BOTANICALS)
// ============================================================================

/**
 * 4.1. Đôn sứ trắng hoàng gia viền chỉ vàng kim (White Porcelain Pedestal Planter)
 */
export function createPorcelainPedestal(options = {}) {
  const mats = getPropsMaterials();
  const pedestalGroup = new THREE.Group();
  pedestalGroup.name = 'HTC_Porcelain_Pedestal';
  pedestalGroup.userData = { ignoreRaycaster: true };

  const height = options.height || 0.75;
  const radius = options.radius || 0.32;

  // 1. Chân đế tròn 3 tầng giật cấp
  const baseTiers = [
    { r: radius * 1.15, h: 0.05, y: 0.025 },
    { r: radius * 1.05, h: 0.04, y: 0.07 },
    { r: radius * 0.95, h: 0.04, y: 0.11 }
  ];

  baseTiers.forEach((bt) => {
    const mesh = new THREE.Mesh(
      prepHtcGeo(new THREE.CylinderGeometry(bt.r, bt.r, bt.h, 24)),
      mats.whitePorcelainMat
    );
    mesh.position.y = bt.y;
    mesh.userData.ignoreRaycaster = true;
    pedestalGroup.add(mesh);

    // Chỉ vàng kim viền quanh mỗi tầng chân đế
    const trim = new THREE.Mesh(
      prepHtcGeo(new THREE.TorusGeometry(bt.r + 0.004, 0.006, 6, 24)),
      mats.antiqueGoldMat
    );
    trim.rotation.x = Math.PI / 2;
    trim.position.y = bt.y;
    trim.userData.ignoreRaycaster = true;
    pedestalGroup.add(trim);
  });

  // 2. Thân đôn tiện cong thắt eo hình lục bình duyên dáng
  const waistMesh = new THREE.Mesh(
    prepHtcGeo(new THREE.CylinderGeometry(radius * 0.72, radius * 0.88, height * 0.52, 24)),
    mats.whitePorcelainMat
  );
  waistMesh.position.y = height * 0.38;
  waistMesh.userData.ignoreRaycaster = true;
  pedestalGroup.add(waistMesh);

  // Vòng chỉ vàng ở điểm thắt eo
  const waistRing = new THREE.Mesh(
    prepHtcGeo(new THREE.TorusGeometry(radius * 0.73, 0.008, 6, 24)),
    mats.antiqueGoldMat
  );
  waistRing.rotation.x = Math.PI / 2;
  waistRing.position.y = height * 0.38;
  waistRing.userData.ignoreRaycaster = true;
  pedestalGroup.add(waistRing);

  // 3. Miệng đôn loe rộng bọc gờ đồng thau mạ vàng
  const topBowl = new THREE.Mesh(
    prepHtcGeo(new THREE.CylinderGeometry(radius * 1.12, radius * 0.76, height * 0.32, 24)),
    mats.whitePorcelainMat
  );
  topBowl.position.y = height * 0.78;
  topBowl.userData.ignoreRaycaster = true;
  pedestalGroup.add(topBowl);

  const topRimGold = new THREE.Mesh(
    prepHtcGeo(new THREE.TorusGeometry(radius * 1.13, 0.012, 8, 24)),
    mats.antiqueGoldMat
  );
  topRimGold.rotation.x = Math.PI / 2;
  topRimGold.position.y = height * 0.94;
  topRimGold.userData.ignoreRaycaster = true;
  pedestalGroup.add(topRimGold);

  // 4. Lớp đất màu nâu thẫm & Rêu nhung phủ mặt chậu
  const soilMesh = new THREE.Mesh(
    prepHtcGeo(new THREE.CylinderGeometry(radius * 1.05, radius * 1.05, 0.04, 24)),
    mats.mossMat
  );
  soilMesh.position.y = height * 0.92;
  soilMesh.userData.ignoreRaycaster = true;
  pedestalGroup.add(soilMesh);

  return { pedestalGroup, topY: height * 0.94, radius };
}

/**
 * 4.2. Chậu Trúc Quân Tử (Aristocratic Slender Bamboo Planter)
 */
export function createAristocraticBambooPlanter(options = {}) {
  const mats = getPropsMaterials();
  const bambooGroup = new THREE.Group();
  bambooGroup.name = 'HTC_Bamboo_Planter';
  bambooGroup.userData = { ignoreRaycaster: true, plantType: 'bamboo' };

  // Tạo đôn sứ trắng bên dưới
  const { pedestalGroup, topY } = createPorcelainPedestal({ height: 0.75, radius: 0.32 });
  bambooGroup.add(pedestalGroup);

  // Bụi gồm 6 thân trúc thanh mảnh vươn cao từ 1.8m đến 2.5m
  const stalkConfigs = [
    { x: -0.10, z: -0.08, h: 2.2, tiltX: 0.04, tiltZ: -0.06 },
    { x: 0.12,  z: -0.06, h: 2.4, tiltX: -0.05, tiltZ: 0.04 },
    { x: -0.08, z: 0.10,  h: 1.9, tiltX: 0.06, tiltZ: 0.05 },
    { x: 0.09,  z: 0.08,  h: 2.3, tiltX: -0.04, tiltZ: -0.05 },
    { x: 0.00,  z: 0.00,  h: 2.5, tiltX: 0.02, tiltZ: 0.01 },
    { x: -0.02, z: -0.14, h: 2.0, tiltX: -0.03, tiltZ: -0.07 }
  ];

  const stalkGeo = prepHtcGeo(new THREE.CylinderGeometry(0.016, 0.020, 1.0, 8));
  const jointGeo = prepHtcGeo(new THREE.TorusGeometry(0.021, 0.005, 6, 12));
  const leafClusterGeo = prepHtcGeo(new THREE.ConeGeometry(0.24, 0.38, 4));

  stalkConfigs.forEach((sc) => {
    const singleStalk = new THREE.Group();
    singleStalk.position.set(sc.x, topY, sc.z);
    singleStalk.rotation.x = sc.tiltX;
    singleStalk.rotation.z = sc.tiltZ;
    singleStalk.userData.ignoreRaycaster = true;

    // Thân trúc kéo dài
    const stalkMesh = new THREE.Mesh(stalkGeo, mats.bambooStalkMat);
    stalkMesh.scale.set(1.0, sc.h, 1.0);
    stalkMesh.position.y = sc.h * 0.5;
    stalkMesh.userData.ignoreRaycaster = true;
    singleStalk.add(stalkMesh);

    // 5 - 7 Mấu đốt trúc vàng sẫm dọc thân
    const numJoints = 6;
    for (let j = 1; j <= numJoints; j++) {
      const jy = (j / (numJoints + 1)) * sc.h;
      const jointMesh = new THREE.Mesh(jointGeo, mats.bambooJointMat);
      jointMesh.rotation.x = Math.PI / 2;
      jointMesh.position.y = jy;
      jointMesh.userData.ignoreRaycaster = true;
      singleStalk.add(jointMesh);

      // Cành lá xòe ra ở 3 đốt phía trên (j >= 4)
      if (j >= 3) {
        const leafAngle = (j * 1.9) % (Math.PI * 2);
        const leafMesh = new THREE.Mesh(leafClusterGeo, mats.bambooLeafMat);
        leafMesh.rotation.x = 0.5;
        leafMesh.rotation.y = leafAngle;
        leafMesh.scale.set(0.65, 0.9, 0.25);
        leafMesh.position.set(Math.cos(leafAngle) * 0.08, jy, Math.sin(leafAngle) * 0.08);
        leafMesh.userData.ignoreRaycaster = true;
        singleStalk.add(leafMesh);
      }
    }

    bambooGroup.add(singleStalk);
  });

  return bambooGroup;
}

/**
 * 4.3. Chậu Tùng Bonsai Cổ Thụ (Miniature Gnarled Pine Bonsai Planter)
 */
export function createGnarledPineBonsaiPlanter(options = {}) {
  const mats = getPropsMaterials();
  const bonsaiGroup = new THREE.Group();
  bonsaiGroup.name = 'HTC_Pine_Bonsai_Planter';
  bonsaiGroup.userData = { ignoreRaycaster: true, plantType: 'pine_bonsai' };

  // Tạo đôn sứ trắng bên dưới (cao 0.65m tạo tầm nhìn bề thế)
  const { pedestalGroup, topY } = createPorcelainPedestal({ height: 0.65, radius: 0.35 });
  bonsaiGroup.add(pedestalGroup);

  // Gốc tùng uốn lượn cổ quái (Gnarled Trunk thế Huyền vũ / Nghinh phong)
  const trunkGroup = new THREE.Group();
  trunkGroup.position.set(0, topY, 0);
  trunkGroup.userData.ignoreRaycaster = true;

  // 1. Gốc cây bạnh rễ ôm lấy sỏi đá
  const rootMesh = new THREE.Mesh(
    prepHtcGeo(new THREE.CylinderGeometry(0.065, 0.095, 0.12, 10)),
    mats.pineBarkMat
  );
  rootMesh.position.y = 0.06;
  rootMesh.userData.ignoreRaycaster = true;
  trunkGroup.add(rootMesh);

  // 2-3 Viên sỏi trắng / đá phong thủy cẩm thạch đặt cạnh gốc
  [-0.14, 0.15].forEach((sx, sIdx) => {
    const rock = new THREE.Mesh(
      prepHtcGeo(new THREE.DodecahedronGeometry(0.045, 0)),
      new THREE.MeshStandardMaterial({ color: sIdx === 0 ? 0xf8fafc : 0x475569, roughness: 0.65 })
    );
    rock.scale.set(1.4, 0.8, 1.1);
    rock.position.set(sx, 0.035, sIdx === 0 ? 0.08 : -0.06);
    rock.userData.ignoreRaycaster = true;
    trunkGroup.add(rock);
  });

  // 2. Thân chính uốn khúc cong ngoạn mục chia 4 đoạn
  const trunkSegments = [
    { startY: 0.10, endY: 0.35, offX: 0.08, offZ: 0.04, r1: 0.060, r2: 0.050, rotZ: -0.28 },
    { startY: 0.32, endY: 0.62, offX: -0.10, offZ: 0.02, r1: 0.050, r2: 0.038, rotZ: 0.35 },
    { startY: 0.58, endY: 0.88, offX: 0.12, offZ: -0.05, r1: 0.038, r2: 0.028, rotZ: -0.30 },
    { startY: 0.84, endY: 1.15, offX: 0.02, offZ: 0.00, r1: 0.028, r2: 0.018, rotZ: 0.12 }
  ];

  trunkSegments.forEach((ts) => {
    const segLen = ts.endY - ts.startY;
    const segMesh = new THREE.Mesh(
      prepHtcGeo(new THREE.CylinderGeometry(ts.r2, ts.r1, segLen, 8)),
      mats.pineBarkMat
    );
    segMesh.position.set(ts.offX, ts.startY + segLen * 0.5, ts.offZ);
    segMesh.rotation.z = ts.rotZ;
    segMesh.userData.ignoreRaycaster = true;
    trunkGroup.add(segMesh);
  });

  // 3. 5 Tầng tán mây lá tùng xanh thẫm (Cloud Foliage Pads)
  const cloudPadConfigs = [
    { x: 0.28,  y: 0.42, z: 0.08,  rx: 0.28, rz: 0.22, ry: 0.075 },
    { x: -0.32, y: 0.68, z: 0.04,  rx: 0.34, rz: 0.26, ry: 0.085 },
    { x: 0.30,  y: 0.92, z: -0.10, rx: 0.30, rz: 0.24, ry: 0.080 },
    { x: -0.12, y: 1.12, z: 0.12,  rx: 0.26, rz: 0.22, ry: 0.070 },
    { x: 0.04,  y: 1.25, z: 0.00,  rx: 0.36, rz: 0.30, ry: 0.095 } // Tầng ngọn xòe rộng
  ];

  cloudPadConfigs.forEach((cp) => {
    // Tán đĩa dẹt lồi hai mặt hình mây
    const padMesh = new THREE.Mesh(
      prepHtcGeo(new THREE.SphereGeometry(1.0, 14, 8)),
      mats.pineFoliageMat
    );
    padMesh.scale.set(cp.rx, cp.ry, cp.rz);
    padMesh.position.set(cp.x, cp.y, cp.z);
    padMesh.userData.ignoreRaycaster = true;
    trunkGroup.add(padMesh);

    // Cành nhánh đỡ tán từ thân
    const branchLen = Math.sqrt(cp.x * cp.x + cp.z * cp.z);
    const branchMesh = new THREE.Mesh(
      prepHtcGeo(new THREE.CylinderGeometry(0.012, 0.020, branchLen, 6)),
      mats.pineBarkMat
    );
    branchMesh.position.set(cp.x * 0.5, cp.y - 0.04, cp.z * 0.5);
    branchMesh.rotation.z = Math.atan2(cp.y, cp.x) - Math.PI / 2;
    branchMesh.userData.ignoreRaycaster = true;
    trunkGroup.add(branchMesh);
  });

  bonsaiGroup.add(trunkGroup);
  return bonsaiGroup;
}

// ============================================================================
// 5. TRANG TRÍ HOÀN CHỈNH 6 CỤM BÀN ĐỌC & BÀN VEN LAN CAN
// ============================================================================

/**
 * 5.1. Trang bị đầy đủ bộ đạo cụ lên 6 cụm bàn đọc trung tâm
 */
export function decorateStudyTablesWithProps(studyTables = [], options = {}) {
  const propsGroup = new THREE.Group();
  propsGroup.name = 'HTC_Study_Tables_Props_Group';
  propsGroup.userData = { ignoreRaycaster: true };

  const teaSteamEmitters = [];

  // Chiều cao mặt bàn Y = 10.76m (bàn cao 0.76m trên sàn Y = 10.0m)
  // Các table cluster group trong hienThuCacReadingLounge đã ở Y = 10.0m
  // Mặt bàn ở local Y = 0.76m
  studyTables.forEach((tableGroup, idx) => {
    const tablePropsSubGroup = new THREE.Group();
    tablePropsSubGroup.name = `HTC_TableProps_Cluster_${idx + 1}`;
    tablePropsSubGroup.position.set(0, 0.76, 0); // Đặt ngay trên mặt bàn gỗ
    tablePropsSubGroup.userData.ignoreRaycaster = true;

    // 1. ĐÈN BÀN CỔ ĐIỂN CHỤP ĐỒNG (Góc trái phía xa: x: -0.85, z: -0.32)
    const lamp = createClassicDeskLamp();
    lamp.position.set(-0.85, 0, -0.32);
    lamp.rotation.y = 0.35;
    tablePropsSubGroup.add(lamp);

    // 2. GIÁ GỖ KÊ SÁCH CHẠM SEN (Chính giữa bàn: x: -0.15, z: 0.02)
    // Tương thích nâng đỡ cuốn sách di sản tương tác của @trangdaonuong
    const bookstand = createLotusWoodenBookstand();
    bookstand.position.set(-0.15, 0, 0.02);
    bookstand.rotation.y = idx % 2 === 0 ? 0.06 : -0.06;
    tablePropsSubGroup.add(bookstand);

    // 3. CHỒNG SÁCH CỔ 3 CUỐN (Góc phải phía sau: x: 0.78, z: -0.28)
    const bookStack = createAntiqueBookStack();
    bookStack.position.set(0.78, 0, -0.28);
    bookStack.rotation.y = -0.18;
    tablePropsSubGroup.add(bookStack);

    // 4. BỘ ẤM CHÉN TRÀ ĐẠO SỨ TRẮNG (Phía trước bên phải: x: 0.52, z: 0.18)
    const teaSet = createWhitePorcelainTeaSet();
    teaSet.position.set(0.52, 0, 0.18);
    teaSet.rotation.y = -0.10;
    tablePropsSubGroup.add(teaSet);

    // Ghi nhận vị trí bốc khói trà (tính theo tọa độ thế giới thực của bàn)
    // Table cluster world pos: tableGroup.position.x, 10.76m, tableGroup.position.z
    const worldTeaPos = new THREE.Vector3(
      tableGroup.position.x + 0.44,
      10.76 + 0.14,
      tableGroup.position.z + 0.18
    );
    teaSteamEmitters.push(worldTeaPos);

    // 5. ỐNG BÚT LÔNG TRÚC & NGHIÊN MỰC ĐÁ (Bên trái phía trước: x: -0.65, z: 0.22)
    const writingSet = createCalligraphyBrushPotAndInkStone();
    writingSet.position.set(-0.65, 0, 0.22);
    writingSet.rotation.y = 0.15;
    tablePropsSubGroup.add(writingSet);

    tableGroup.add(tablePropsSubGroup);
  });

  return { propsGroup, teaSteamEmitters };
}

/**
 * 5.2. Trang bị tiểu cảnh trà đạo mini lên 4 bàn đôi ven lan can tầng 2
 */
export function decorateBalconyTablesWithProps(balconyTablesGroup, options = {}) {
  if (!balconyTablesGroup) return [];
  const mats = getPropsMaterials();
  const bistroSteamEmitters = [];

  // Duyệt qua từng cặp bàn bistro con trong balconyTablesGroup
  balconyTablesGroup.children.forEach((bistroPair, idx) => {
    // Mặt bàn tròn tại local y = 0.72m
    const bistroProps = new THREE.Group();
    bistroProps.position.set(0, 0.72, 0);
    bistroProps.userData.ignoreRaycaster = true;

    // Khay tròn nhỏ sứ men ngọc + 1 ấm trà mini + 1 chén quân
    const miniTray = new THREE.Mesh(
      prepHtcGeo(new THREE.CylinderGeometry(0.16, 0.16, 0.012, 16)),
      mats.ebonyWoodMat
    );
    miniTray.position.y = 0.006;
    miniTray.userData.ignoreRaycaster = true;
    bistroProps.add(miniTray);

    const miniPot = new THREE.Mesh(
      prepHtcGeo(new THREE.SphereGeometry(0.045, 12, 10)),
      mats.whitePorcelainMat
    );
    miniPot.scale.set(1.0, 0.85, 1.0);
    miniPot.position.set(-0.04, 0.045, 0);
    miniPot.userData.ignoreRaycaster = true;
    bistroProps.add(miniPot);

    const miniCup = new THREE.Mesh(
      prepHtcGeo(new THREE.CylinderGeometry(0.022, 0.016, 0.028, 12)),
      mats.whitePorcelainMat
    );
    miniCup.position.set(0.05, 0.025, 0.02);
    miniCup.userData.ignoreRaycaster = true;
    bistroProps.add(miniCup);

    // Cuốn sách nhỏ mở ra ngắm cảnh
    const smallBook = new THREE.Mesh(
      prepHtcGeo(new THREE.BoxGeometry(0.18, 0.018, 0.13)),
      new THREE.MeshStandardMaterial({ color: 0x881337, roughness: 0.6 })
    );
    smallBook.position.set(0.0, 0.015, -0.12);
    smallBook.rotation.y = 0.2;
    smallBook.userData.ignoreRaycaster = true;
    bistroProps.add(smallBook);

    bistroPair.add(bistroProps);

    // Vị trí emitter khói trà bàn bistro
    bistroSteamEmitters.push(new THREE.Vector3(
      bistroPair.position.x - 0.04,
      10.72 + 0.10,
      bistroPair.position.z
    ));
  });

  return bistroSteamEmitters;
}

// ============================================================================
// 6. QUY HOẠCH TIỂU CẢNH CÂY XANH TOÀN KHU HIÊN THƯ CÁC
// ============================================================================

/**
 * Bố trí toàn bộ chậu Trúc Quân Tử và Tùng Bonsai tại các vị trí phong thủy đắc địa
 */
export function buildHienThuCacGreenery(parentGroup, options = {}) {
  const greeneryGroup = new THREE.Group();
  greeneryGroup.name = 'HTC_Greenery_Botanical_Sanctuary';
  greeneryGroup.userData = { ignoreRaycaster: true, isGreenery: true };

  // Danh mục tọa độ bố trí cây xanh chuẩn mực tại Sàn Tầng 2 (Y = 10.0m)
  // X in [8.0, 33.5], Z in [4.0, 21.0]
  const plantLayout = [
    // 1. DỌC RANH GIỚI HÀNH LANG (X = 8.0m): Tạo dải phân cách mềm mại với sảnh chung
    { type: 'bamboo', x: 8.0, z: 5.2,  scale: 1.05, rotY: 0.2 },
    { type: 'pine',   x: 8.0, z: 8.5,  scale: 1.00, rotY: 1.1 },
    { type: 'bamboo', x: 8.0, z: 12.0, scale: 1.00, rotY: -0.4 },
    { type: 'pine',   x: 8.0, z: 15.2, scale: 1.08, rotY: 2.3 },
    { type: 'bamboo', x: 8.0, z: 18.2, scale: 1.02, rotY: 0.8 },
    { type: 'pine',   x: 8.0, z: 20.2, scale: 1.00, rotY: -1.5 },

    // 2. HAI BÊN CỔNG CHÀO VÀ BẢNG HIỆU ĐỨNG (X ≈ 8.5m, Z ≈ 6.0m)
    { type: 'bamboo', x: 7.2, z: 6.8, scale: 1.10, rotY: 0.5 },
    { type: 'pine',   x: 9.8, z: 5.2, scale: 1.05, rotY: -0.8 },

    // 3. ĐỆM XANH GIỮA 2 DÃY BÀN ĐỌC TRUNG TÂM (X = 22.5m)
    { type: 'bamboo', x: 22.5, z: 8.5,  scale: 0.95, rotY: 1.4 },
    { type: 'pine',   x: 22.5, z: 13.0, scale: 1.00, rotY: -0.5 },
    { type: 'bamboo', x: 22.5, z: 17.5, scale: 0.95, rotY: 2.1 },

    // 4. HAI BÊN ĐẠI THƯ CÁC ÁP TƯỜNG (X = 32.2m)
    { type: 'pine', x: 32.2, z: 6.5,  scale: 1.15, rotY: -2.0 },
    { type: 'pine', x: 32.2, z: 19.5, scale: 1.15, rotY: 0.9 },

    // 5. VEN LAN CAN NHÌN RA GIẾNG TRỜI (Z = 20.6m)
    { type: 'bamboo', x: 14.0, z: 20.6, scale: 1.00, rotY: -0.6 },
    { type: 'pine',   x: 19.2, z: 20.6, scale: 1.05, rotY: 1.8 },
    { type: 'bamboo', x: 24.8, z: 20.6, scale: 1.00, rotY: 0.3 },
    { type: 'pine',   x: 30.0, z: 20.6, scale: 1.05, rotY: -1.2 }
  ];

  const plantItems = [];

  plantLayout.forEach((cfg, idx) => {
    let plantMesh = null;
    if (cfg.type === 'bamboo') {
      plantMesh = createAristocraticBambooPlanter();
    } else {
      plantMesh = createGnarledPineBonsaiPlanter();
    }

    plantMesh.position.set(cfg.x, 10.0, cfg.z);
    plantMesh.rotation.y = cfg.rotY || 0;
    const s = cfg.scale || 1.0;
    plantMesh.scale.set(s, s, s);
    plantMesh.userData = {
      ignoreRaycaster: true,
      isGreenery: true,
      plantIndex: idx,
      plantType: cfg.type,
      baseRotY: cfg.rotY || 0
    };

    greeneryGroup.add(plantMesh);
    plantItems.push(plantMesh);
  });

  if (parentGroup) parentGroup.add(greeneryGroup);

  /**
   * Cập nhật đung đưa gió nhẹ tự nhiên cho tán lá cây xanh
   */
  const updateGreenery = (timeSec) => {
    if (!greeneryGroup.visible) return;
    for (let i = 0; i < plantItems.length; i++) {
      const p = plantItems[i];
      const phase = timeSec * 1.4 + i * 0.75;
      // Dao động nghiêng vi diệu (khoảng 0.015 rad ~ 0.8 độ)
      p.rotation.z = Math.sin(phase) * 0.012;
      p.rotation.x = Math.cos(phase * 0.8) * 0.008;
    }
  };

  return { greeneryGroup, plantItems, updateGreenery };
}

// ============================================================================
// 7. HÀM TỔNG HỢP SETUP CHO TOÀN BỘ PART 2 (MAIN ENTRY POINT OF PART 2)
// ============================================================================

/**
 * Tích hợp toàn diện Đạo Cụ Bàn Đọc, Khói Trà Sống Động & Cây Xanh Di Sản
 * vào Lounge Group của Hiên Thư Các
 */
export function setupHienThuCacPropsAndGreenery(loungeGroup, options = {}) {
  if (!loungeGroup) return null;

  const studyTables = options.studyTables || [];
  const balconyTables = options.balconyTables || null;

  // 1. Bố trí Đạo cụ bàn đọc & Bộ ấm chén trà đạo
  const tablePropsRes = decorateStudyTablesWithProps(studyTables, options);
  loungeGroup.add(tablePropsRes.propsGroup);

  // 2. Bố trí tiểu cảnh bàn đôi ven lan can
  const balconyEmitters = decorateBalconyTablesWithProps(balconyTables, options);

  // 3. Bố trí Tiểu cảnh Cây xanh (Trúc Quân Tử & Tùng Bonsai)
  const greeneryRes = buildHienThuCacGreenery(loungeGroup, options);

  // 4. Khởi tạo Hiệu ứng Khói Trà Sống Động (Living Tea Steam VFX)
  const allSteamEmitters = [...tablePropsRes.teaSteamEmitters, ...balconyEmitters];
  const steamVfxRes = createTeaSteamVfx(loungeGroup, allSteamEmitters);

  // 5. Kết nối hàm update vào userData.updateProps
  const updateProps = (timeSec = performance.now() * 0.001) => {
    steamVfxRes.updateSteam(timeSec);
    greeneryRes.updateGreenery(timeSec);
  };

  loungeGroup.userData.updateProps = updateProps;

  return {
    propsGroup: tablePropsRes.propsGroup,
    greeneryGroup: greeneryRes.greeneryGroup,
    steamMesh: steamVfxRes.instancedMesh,
    updateProps
  };
}

export default setupHienThuCacPropsAndGreenery;
