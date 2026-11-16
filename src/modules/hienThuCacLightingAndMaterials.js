import * as THREE from 'three';

/**
 * ============================================================================
 * HIÊN THƯ CÁC - LIGHTING & PBR MATERIALS SYSTEM (PART 3)
 * PHỤ TRÁCH BỞI MÈO MUN THẮP ĐÈN (MUNTHAPDEN)
 * 
 * 1. Ánh sáng ấm 2700K - 3000K: 2 hàng đèn lồng khung gỗ mun lụa vàng hổ phách
 *    (#ffaa33) treo thả từ trần tầng 2 rọi xuống khu bàn đọc.
 * 2. Dải đèn hắt PointLight & Emissive strip dọc theo các tầng kệ sách áp tường
 *    làm nổi bật gáy sách và bức phù điêu hoa sen & cuộn thư Đông Sơn.
 * 3. Thư viện Vật liệu PBR chuẩn Á Đông Đương Đại:
 *    - Gỗ mun đen (#181412) viền vàng đồng
 *    - Vàng đồng cổ (#d4af37)
 *    - Men ngọc (#a7f3d0) & Sứ trắng Bát Tràng (#f8fafc)
 *    - Vải lanh kem (#f5efe6)
 *    - Lụa vàng hổ phách (#ffaa33)
 * 4. 100% userData.ignoreRaycaster = true trên đèn & dải sáng, Zero dynamic heap allocations
 * ============================================================================
 */

function prepGeo(geo) {
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
  } catch (_) {}
  return geo;
}

// ============================================================================
// 1. THƯ VIỆN VẬT LIỆU PBR CHUẨN Á ĐÔNG ĐƯƠNG ĐẠI (SHARED SINGLETONS)
// ============================================================================
let pbrMaterialsCache = null;

export function getHienThuCacMaterials() {
  if (pbrMaterialsCache) return pbrMaterialsCache;

  // 1. Gỗ mun đen bóng mờ satin (#181412)
  const ebonyWoodMat = new THREE.MeshStandardMaterial({
    color: 0x181412,
    roughness: 0.38,
    metalness: 0.12
  });

  // 2. Vàng đồng cổ / Dát vàng thếp cổ kính (#d4af37)
  const antiqueGoldMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.24,
    metalness: 0.86,
    emissive: 0x422006,
    emissiveIntensity: 0.15
  });

  // 3. Vải lanh kem bọc đệm ghế (#f5efe6)
  const creamLinenMat = new THREE.MeshStandardMaterial({
    color: 0xf5efe6,
    roughness: 0.88,
    metalness: 0.02
  });

  // 4. Sứ trắng Bát Tràng (#f8fafc)
  const whitePorcelainMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.12,
    metalness: 0.05
  });

  // 5. Men ngọc Celadon (#a7f3d0)
  const celadonJadeMat = new THREE.MeshStandardMaterial({
    color: 0xa7f3d0,
    roughness: 0.18,
    metalness: 0.08
  });

  // 6. Lụa vàng hổ phách phát sáng ấm áp (#ffaa33)
  const amberSilkMat = new THREE.MeshStandardMaterial({
    color: 0xffaa33,
    emissive: 0xd97706,
    emissiveIntensity: 0.78,
    roughness: 0.35,
    metalness: 0.08,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide
  });

  // 7. Dải đèn LED Emissive hắt sáng 3000K (#ffbe55)
  const warmLedStripMat = new THREE.MeshBasicMaterial({
    color: 0xffbe55,
    transparent: true,
    opacity: 0.95
  });

  pbrMaterialsCache = {
    ebonyWoodMat,
    antiqueGoldMat,
    creamLinenMat,
    whitePorcelainMat,
    celadonJadeMat,
    amberSilkMat,
    warmLedStripMat
  };

  return pbrMaterialsCache;
}

// ============================================================================
// 2. HAI HÀNG ĐÈN LỒNG LỤA VÀNG HỔ PHÁCH TREO TRẦN TẦNG 2 (Y = 13.8M)
// ============================================================================
export function createHienThuCacCeilingLanterns({
  floorY = 10.0,
  ceilingY = 18.0
} = {}) {
  const lanternsGroup = new THREE.Group();
  lanternsGroup.name = 'HienThuCac_Ceiling_Lanterns_Group';
  lanternsGroup.userData.ignoreRaycaster = true;

  const mats = getHienThuCacMaterials();
  const animatedLanterns = [];

  // Tọa độ 2 hàng đèn lồng (3 đèn/hàng = 6 đèn lồng rọi thẳng xuống 6 cụm bàn đọc)
  // Hàng Tây: X = 19.5m, Hàng Đông: X = 24.5m; Z in [8.5m, 13.0m, 17.5m]
  const lanternSpots = [
    { x: 19.5, z: 8.5 },
    { x: 19.5, z: 13.0 },
    { x: 19.5, z: 17.5 },
    { x: 24.5, z: 8.5 },
    { x: 24.5, z: 13.0 },
    { x: 24.5, z: 17.5 }
  ];

  const lanternHeight = 13.8; // Độ cao lơ lửng của chao đèn trên sàn Y = 10m
  const cordLength = ceilingY - (lanternHeight + 0.65); // Chiều dài dây treo từ trần Y = 18m

  const cordGeo = prepGeo(new THREE.CylinderGeometry(0.012, 0.012, cordLength, 6));
  const lanternFrameGeo = prepGeo(new THREE.CylinderGeometry(0.48, 0.56, 1.15, 8));
  const lanternSilkGeo = prepGeo(new THREE.CylinderGeometry(0.42, 0.50, 1.08, 8));
  const roofEavesGeo = prepGeo(new THREE.ConeGeometry(0.72, 0.35, 8));
  const baseTrimGeo = prepGeo(new THREE.CylinderGeometry(0.58, 0.48, 0.12, 8));
  const tasselGeo = prepGeo(new THREE.ConeGeometry(0.08, 0.45, 6));

  lanternSpots.forEach((spot, idx) => {
    const lGroup = new THREE.Group();
    lGroup.position.set(spot.x, lanternHeight, spot.z);
    lGroup.userData.ignoreRaycaster = true;

    // 1. Dây treo thả từ trần tầng 2
    const cordMesh = new THREE.Mesh(cordGeo, mats.antiqueGoldMat);
    cordMesh.position.y = 0.65 + cordLength * 0.5;
    cordMesh.userData.ignoreRaycaster = true;
    lGroup.add(cordMesh);

    // 2. Mái che gỗ mun bát giác & chụp nóc
    const roof = new THREE.Mesh(roofEavesGeo, mats.ebonyWoodMat);
    roof.position.y = 0.68;
    roof.userData.ignoreRaycaster = true;
    lGroup.add(roof);

    // 3. Khung gỗ mun bao quanh thân đèn
    const frame = new THREE.Mesh(lanternFrameGeo, mats.ebonyWoodMat);
    frame.userData.ignoreRaycaster = true;
    lGroup.add(frame);

    // 4. Chao lụa vàng hổ phách phát sáng ấm áp (#ffaa33)
    const silk = new THREE.Mesh(lanternSilkGeo, mats.amberSilkMat);
    silk.userData.ignoreRaycaster = true;
    lGroup.add(silk);

    // 5. Đáy đèn bằng đồng viền vàng
    const base = new THREE.Mesh(baseTrimGeo, mats.antiqueGoldMat);
    base.position.y = -0.62;
    base.userData.ignoreRaycaster = true;
    lGroup.add(base);

    // 6. Tua rua lụa đỏ vàng rủ dưới đáy đèn
    const tassel = new THREE.Mesh(tasselGeo, mats.amberSilkMat);
    tassel.position.y = -0.88;
    tassel.rotation.x = Math.PI;
    tassel.userData.ignoreRaycaster = true;
    lGroup.add(tassel);

    // 7. PointLight 2700K - 3000K vàng ấm dịu rọi rực rỡ mặt bàn đọc
    const pointLight = new THREE.PointLight(0xffbe55, 0.85, 8.5, 1.6);
    pointLight.position.set(0, 0, 0);
    pointLight.castShadow = false;
    pointLight.userData.ignoreRaycaster = true;
    lGroup.add(pointLight);

    animatedLanterns.push({
      group: lGroup,
      silk,
      light: pointLight,
      phase: idx * 1.05
    });

    lanternsGroup.add(lGroup);
  });

  // Vòng lặp cập nhật đung đưa nhẹ nhàng & nhịp thở quang năng (Zero allocation)
  const updateLanterns = (timeSec) => {
    for (let i = 0; i < animatedLanterns.length; i++) {
      const item = animatedLanterns[i];
      const ph = item.phase;
      // Đung đưa vi diệu
      item.group.rotation.z = Math.sin(timeSec * 1.2 + ph) * 0.025;
      item.group.rotation.x = Math.cos(timeSec * 0.9 + ph) * 0.018;

      // Nhịp thở ấm áp 2700K
      const pulse = 0.82 + Math.sin(timeSec * 2.5 + ph) * 0.08;
      item.light.intensity = 0.85 * pulse;
    }
  };

  lanternsGroup.userData.update = updateLanterns;
  return { lanternsGroup, updateLanterns };
}

// ============================================================================
// 3. DẢI ĐÈN HẮT KỆ SÁCH ÁP TƯỜNG & CHIẾU SÁNG PHÙ ĐIÊU HOA SEN
// ============================================================================
export function createHienThuCacBookshelfLighting({
  shelfX = 33.1,
  floorY = 10.0,
  zMin = 6.2,
  zMax = 19.8,
  shelfHeight = 6.2
} = {}) {
  const shelfLightingGroup = new THREE.Group();
  shelfLightingGroup.name = 'HienThuCac_Bookshelf_Lighting_Group';
  shelfLightingGroup.userData.ignoreRaycaster = true;

  const mats = getHienThuCacMaterials();
  const shelfLength = zMax - zMin;
  const zCenter = (zMin + zMax) * 0.5;

  // 1. Dải LED Strip Emissive chạy suốt diềm mái kệ sách (Top Cornice Emissive Strip)
  const topStripGeo = prepGeo(new THREE.BoxGeometry(0.08, 0.06, shelfLength));
  const topStripMesh = new THREE.Mesh(topStripGeo, mats.warmLedStripMat);
  topStripMesh.position.set(shelfX - 0.55, floorY + shelfHeight - 0.15, zCenter);
  topStripMesh.userData.ignoreRaycaster = true;
  shelfLightingGroup.add(topStripMesh);

  // 2. Các dải LED hắt tầng đợt sách (4 tầng đợt kệ)
  const tierHeights = [floorY + 1.2, floorY + 2.4, floorY + 3.6, floorY + 4.8];
  tierHeights.forEach((ty) => {
    const tierStripGeo = prepGeo(new THREE.BoxGeometry(0.04, 0.025, shelfLength * 0.96));
    const tierStrip = new THREE.Mesh(tierStripGeo, mats.warmLedStripMat);
    tierStrip.position.set(shelfX - 0.42, ty, zCenter);
    tierStrip.userData.ignoreRaycaster = true;
    shelfLightingGroup.add(tierStrip);
  });

  // 3. Đèn hắt dịu PointLight vàng ấm (3000K) rải đều dọc kệ sách áp tường
  // Bố trí 4 điểm sáng cách nhau 3.5m dọc theo kệ sách
  const lightZPositions = [zMin + 1.8, zMin + 5.2, zMin + 8.6, zMin + 12.0];
  const shelfLights = [];

  lightZPositions.forEach((lz, idx) => {
    const sLight = new THREE.PointLight(0xffd188, 0.75, 6.2, 1.8);
    sLight.position.set(shelfX - 0.65, floorY + 3.2, lz);
    sLight.castShadow = false;
    sLight.userData.ignoreRaycaster = true;
    shelfLightingGroup.add(sLight);
    shelfLights.push(sLight);
  });

  // 4. Hai đèn chiếu tiêu điểm làm rực rỡ Bức Phù Điêu Hoa Sen & Cuộn Thư Đông Sơn (Tâm Z = 13.0m)
  const reliefSpotLightLeft = new THREE.PointLight(0xffeedd, 1.1, 7.5, 1.6);
  reliefSpotLightLeft.position.set(shelfX - 1.2, floorY + 4.0, zCenter - 1.5);
  reliefSpotLightLeft.castShadow = false;
  reliefSpotLightLeft.userData.ignoreRaycaster = true;
  shelfLightingGroup.add(reliefSpotLightLeft);

  const reliefSpotLightRight = new THREE.PointLight(0xffeedd, 1.1, 7.5, 1.6);
  reliefSpotLightRight.position.set(shelfX - 1.2, floorY + 4.0, zCenter + 1.5);
  reliefSpotLightRight.castShadow = false;
  reliefSpotLightRight.userData.ignoreRaycaster = true;
  shelfLightingGroup.add(reliefSpotLightRight);

  shelfLights.push(reliefSpotLightLeft, reliefSpotLightRight);

  // Vòng lặp cập nhật độ sáng tĩnh mượt mà (Zero dynamic allocations)
  const updateShelfLighting = (timeSec) => {
    const pulse = 0.92 + Math.sin(timeSec * 1.8) * 0.08;
    for (let i = 0; i < shelfLights.length; i++) {
      shelfLights[i].intensity = (i < 4 ? 0.75 : 1.1) * pulse;
    }
  };

  shelfLightingGroup.userData.update = updateShelfLighting;
  return { shelfLightingGroup, updateShelfLighting };
}

// ============================================================================
// 4. TỔNG HỢP TOÀN BỘ ÁNH SÁNG & SHADER HIÊN THƯ CÁC (MASTER EXPORT)
// ============================================================================
export function setupHienThuCacLighting(loungeGroup, {
  floorY = 10.0,
  ceilingY = 18.0,
  shelfX = 33.1,
  zMin = 6.2,
  zMax = 19.8
} = {}) {
  if (!loungeGroup) return null;

  const masterLightingGroup = new THREE.Group();
  masterLightingGroup.name = 'HienThuCac_Master_Lighting_System';
  masterLightingGroup.userData.ignoreRaycaster = true;

  // 1. Hệ thống 2 hàng Đèn Lồng Lụa Vàng Hổ Phách
  const { lanternsGroup, updateLanterns } = createHienThuCacCeilingLanterns({ floorY, ceilingY });
  masterLightingGroup.add(lanternsGroup);

  // 2. Hệ thống Dải Đèn Hắt Kệ Sách & Phù Điêu Hoa Sen
  const { shelfLightingGroup, updateShelfLighting } = createHienThuCacBookshelfLighting({
    shelfX,
    floorY,
    zMin,
    zMax
  });
  masterLightingGroup.add(shelfLightingGroup);

  // Vòng lặp cập nhật tổng hợp
  const update = (timeSec) => {
    if (updateLanterns) updateLanterns(timeSec);
    if (updateShelfLighting) updateShelfLighting(timeSec);
  };

  masterLightingGroup.userData.update = update;
  loungeGroup.add(masterLightingGroup);

  return {
    masterLightingGroup,
    lanternsGroup,
    shelfLightingGroup,
    update
  };
}

export default {
  getHienThuCacMaterials,
  createHienThuCacCeilingLanterns,
  createHienThuCacBookshelfLighting,
  setupHienThuCacLighting
};
