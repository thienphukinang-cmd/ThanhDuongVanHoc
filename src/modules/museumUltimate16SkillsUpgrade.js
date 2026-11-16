import * as THREE from 'three';
import {
  createCarvedHeritagePbrMaterial
} from './museumReliefSculptor.js';
import { upgradeRoomWallArchitecture } from './museumWallArchitectureSystem.js';
import { MuseumHitboxManager, getMuseumHitboxManager } from './museumHitboxSystem.js';
import { createFloatingPastelLanterns } from './museumSpaceEnrichmentSystem.js';
import {
  createFocalBronzeMedallionWall,
  createLobbyOctagonalWoodenTower,
  createLobbyHorizontalLacqueredBanners
} from './museumLobbyCorridorDecorator.js';

/**
 * ============================================================================
 * MUSEUM ULTIMATE 16-SKILLS ORCHESTRATOR
 * TỔNG CHỈ HUY ĐỒNG BỘ 16 KỸ NĂNG NÂNG CẤP BẢO TÀNG VĂN HỌC 3D
 * ============================================================================
 */

/**
 * Dọn dẹp triệt để trần giả và vật thể bay lơ lửng trên đầu Đại Sảnh
 */
export function removeLobbyCeilingAndOverheadClutter(container) {
  if (!container) return;
  const toRemove = [];

  container.traverse((child) => {
    if (child === container) return;
    const name = child.name || '';

    // 1. Chỉ dọn trần hoa sen thấp bịt kín giếng trời, TUYỆT ĐỐI BẢO VỆ ĐÈN LỒNG TREO TRẦN
    if (
      name === 'Sculpted_Lotus_Coffered_Ceiling' ||
      (name.toLowerCase().includes('coffered_ceiling') && !name.toLowerCase().includes('lantern'))
    ) {
      toRemove.push(child);
      return;
    }

    // 2. Kiểm tra bất kỳ tấm PlaneGeometry nào chắn ngang đầu sảnh ở độ cao Y từ 5.0m đến 16.0m
    if (child.isMesh && child.geometry?.type === 'PlaneGeometry') {
      const pos = child.position;
      const rot = child.rotation;
      if (Math.abs(rot.x - Math.PI / 2) < 0.15 && pos.y >= 5.0 && pos.y <= 16.0) {
        if (!child.userData?.isStructural && !child.userData?.isFloor && !child.userData?.isHeritageDecor) {
          toRemove.push(child);
        }
      }
    }

    // 3. Mở hiển thị chao đèn lồng trên đỉnh Hàng Cột Gỗ Lim (Instanced_Corridor_Pillars_And_Lanterns)
    if (name === 'Instanced_Corridor_Pillars_And_Lanterns' && child.children) {
      if (child.children[3] && child.children[3].isInstancedMesh) {
        child.children[3].visible = true;
      }
    }
  });

  toRemove.forEach((obj) => {
    obj.traverse((c) => {
      if (c.isMesh) {
        c.geometry?.dispose?.();
        if (Array.isArray(c.material)) c.material.forEach((m) => m?.dispose?.());
        else c.material?.dispose?.();
      }
    });
    if (obj.parent) {
      obj.parent.remove(obj);
    }
  });
}

/**
 * ============================================================================
 * HẠNG MỤC 1: ĐẶT CUỐN SÁCH DI SẢN KHỔNG LỒ TẠI TÂM ĐẠI SẢNH (0, 0, 0)
 * - ĐÃ BỎ HOÀN TOÀN BỤC VÒNG TRÒN / BÁT GIÁC Ở GIỮA
 * - GIỮ NGUYÊN CUỐN SÁCH TỰ THIẾT KẾ ĐẶT TRÊN SÀN
 * - TÍCH HỢP HIỆU ỨNG TỰ ĐỘNG LẬT TRANG (AUTOMATIC PAGE-FLIPPING EFFECT)
 * ============================================================================
 */
export async function setupGrandLobbyGiantBookCenterpiece(lobbyGroup, {
  hitboxManager = null,
  loreGuide = null,
  audioDirector = null,
  candidateGlbPaths = []
} = {}) {
  if (!lobbyGroup) return null;

  // 1. DỌN SẠCH CỤC XOAY XOAY TRÒN TRÒN (TRỐNG ĐỒNG XOAY & VÒNG HÀO QUANG) Ở TÂM SẢNH
  const namesToRemove = [
    'Grand_Lobby_Giant_Book_Centerpiece',
    'Grand_Lobby_Octagonal_Lotus_Podium'
  ];
  namesToRemove.forEach((name) => {
    const existing = lobbyGroup.getObjectByName(name);
    if (existing) {
      existing.traverse((c) => {
        if (c.isMesh) {
          c.geometry?.dispose?.();
          if (Array.isArray(c.material)) c.material.forEach((m) => m?.dispose?.());
          else c.material?.dispose?.();
        }
      });
      lobbyGroup.remove(existing);
    }
  });

  // Triệt tiêu 100% "cục xoay xoay tròn tròn" (Trống đồng xoay & vòng hào quang) trong đài tròn
  const centralMonument = lobbyGroup.getObjectByName('Lobby_Central_DongSon_Monument') ||
                          lobbyGroup.getObjectByName('Central_DongSon_Drum_Monument');
  if (centralMonument) {
    if (centralMonument.userData?.rotatingPart) {
      centralMonument.remove(centralMonument.userData.rotatingPart);
      centralMonument.userData.rotatingPart.traverse((c) => {
        if (c.isMesh) {
          c.geometry?.dispose?.();
          if (Array.isArray(c.material)) c.material.forEach((m) => m?.dispose?.());
          else c.material?.dispose?.();
        }
      });
      centralMonument.userData.rotatingPart = null;
    }
    const toRemoveDrumParts = [];
    centralMonument.traverse((child) => {
      if (
        child.name === 'Blender_Dong_Son_Drum_3D' ||
        child.geometry?.type === 'LatheGeometry' ||
        (child.isMesh && child.geometry?.type === 'TorusGeometry' && (child.geometry.parameters?.radius || 0) < 2.5) ||
        (child.isMesh && child.geometry?.type === 'CircleGeometry' && (child.geometry.parameters?.radius || 0) < 1.5)
      ) {
        toRemoveDrumParts.push(child);
      }
    });
    toRemoveDrumParts.forEach((ch) => {
      if (ch.parent) ch.parent.remove(ch);
    });
  }

  const centerpieceGroup = new THREE.Group();
  centerpieceGroup.name = 'Grand_Lobby_Giant_Book_Centerpiece';
  centerpieceGroup.position.set(0, 0, 0);

  // 1. DỰNG BỆ ĐÁ TRÒN ĐÔNG SƠN & ĐÀI SEN HOÀNG KIM 16 CÁNH 3 TẦNG (BỆ TRƯNG SÁCH UY NGHI)
  const lotusPedestal = createGrandDongSonLotusPedestal();
  centerpieceGroup.add(lotusPedestal);

  // 2. DỰNG 4 TỦ KÍNH BẢO VẬT HOÀNG GIA QUANH ĐÀI SEN (KIM VÂN KIỀU, CHIẾU DỜI ĐÔ, NGỌC TỶ, BÚT LÔNG)
  const displayCases = createGrandLobbyDisplayCases();
  centerpieceGroup.add(displayCases);

  // 3. DỰNG SÁCH MỞ ĐIÊU KHẮC 3D CÓ HIỆU ỨNG TỰ ĐỘNG LẬT
  const bookVisualRoot = createProceduralMonumentalOpenBook();
  bookVisualRoot.position.set(0, 1.18, 0); // Ngự trang trọng vững chãi trên đỉnh Đài Sen
  centerpieceGroup.add(bookVisualRoot);

  // 3. CỘT SÁNG VOLUMETRIC GOD RAYS VÀNG KIM PHÁT SÁNG LÊN GIẾNG TRỜI (18M)
  const godRays = createMonumentalBookGodRays();
  centerpieceGroup.add(godRays);

  // 4. BỤI SÁNG HOÀNG KIM & KÝ TỰ PHÁT SÁNG BAY XOẮN ỐC TỪ TRANG SÁCH
  const spiralParticles = createMonumentalBookSpiralParticles();
  centerpieceGroup.add(spiralParticles);

  // 5. ĐÈN POINTLIGHT VÀNG KIM ẤM ÁP RỌI TRANG SÁCH & SẢNH CHÍNH
  const bookLight = new THREE.PointLight(0xfde047, 3.4, 15.0, 1.8);
  bookLight.name = 'Monumental_Book_Illumination_Light';
  bookLight.position.set(0, 2.5, 0);
  bookLight.userData.ignoreRaycaster = true;
  centerpieceGroup.add(bookLight);

  // 6. VÒNG HÀO QUANG TRẬN ĐỒ HOÀNG KIM TRÊN MẶT BỤC TRÒN
  const ringGeo = new THREE.RingGeometry(1.95, 2.25, 48);
  ringGeo.computeVertexNormals();
  ringGeo.computeBoundingBox();
  ringGeo.computeBoundingSphere();
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xfde047,
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.name = 'Monumental_Book_Pedestal_AuraRing';
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.y = 1.19; // Nằm sát bề mặt bục tròn
  ringMesh.userData.ignoreRaycaster = true;
  centerpieceGroup.add(ringMesh);

  // 4. HITBOX VẬT CẢN & CLICK TƯƠNG TÁC ÔM SÁT CUỐN SÁCH
  if (hitboxManager) {
    hitboxManager.registerSolidObjectCollider(bookVisualRoot, {
      shrinkFactor: 0.88,
      tag: 'Grand_Lobby_Giant_Book'
    });

    const clickProxy = hitboxManager.createTightClickHitbox(bookVisualRoot, {
      loreKey: 'lobby_giantHeritageBook',
      isBookPortal: false,
      padding: 0.35,
      minSize: 3.5
    });

    if (clickProxy && loreGuide) {
      loreGuide.registerArtifact(clickProxy, 'lobby_giantHeritageBook');
    }
  }

  if (audioDirector) {
    audioDirector.attachPositionalSound('lobby', centerpieceGroup);
  }

  // Kết nối hàm update để chạy hiệu ứng lật trang, cột sáng và bụi sáng trong animate loop
  centerpieceGroup.userData.update = (timeSec, delta) => {
    bookVisualRoot?.userData?.update?.(timeSec, delta);
    godRays?.userData?.update?.(timeSec);
    spiralParticles?.userData?.update?.(timeSec);
    ringMesh.rotation.z = timeSec * 0.12;
    bookLight.intensity = 3.2 + Math.sin(timeSec * 2.2) * 0.45;
  };

  lobbyGroup.add(centerpieceGroup);
  return centerpieceGroup;
}

/**
 * DỰNG BỆ ĐÁ TRÒN ĐÔNG SƠN & ĐÀI SEN HOÀNG KIM 16 CÁNH 3 TẦNG (BỆ TRƯNG SÁCH)
 */
export function createGrandDongSonLotusPedestal() {
  const pedestal = new THREE.Group();
  pedestal.name = 'Grand_Lobby_DongSon_Lotus_Pedestal';

  // Tầng 1: Đế cẩm thạch bát giác viền vàng hoàng kim (R=2.45m, H=0.35m, Y=0.175m)
  // Thu gọn tỉ lệ chuẩn xác để không che mất Vòng Hào Quang 14 tia sáng & Ma Trận Chữ trên sàn
  const baseGeo = new THREE.CylinderGeometry(2.35, 2.55, 0.35, 16);
  baseGeo.computeVertexNormals();
  baseGeo.computeBoundingBox();
  baseGeo.computeBoundingSphere();
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x140f1a,
    roughness: 0.32,
    metalness: 0.45,
    side: THREE.FrontSide
  });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = 0.175;
  baseMesh.userData.ignoreRaycaster = true;
  pedestal.add(baseMesh);

  // Vành nẹp vàng Tầng 1
  const rim1Geo = new THREE.TorusGeometry(2.58, 0.045, 8, 32);
  rim1Geo.computeVertexNormals();
  rim1Geo.computeBoundingBox();
  rim1Geo.computeBoundingSphere();
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.22,
    metalness: 0.88,
    side: THREE.FrontSide
  });
  const rim1 = new THREE.Mesh(rim1Geo, goldMat);
  rim1.rotation.x = Math.PI / 2;
  rim1.position.y = 0.35;
  rim1.userData.ignoreRaycaster = true;
  pedestal.add(rim1);

  // Tầng 2: Thân Trống Đồng Đông Sơn chạm khắc hoa văn (R=2.15m, H=0.45m, Y=0.575m)
  const drumGeo = new THREE.CylinderGeometry(2.05, 2.25, 0.45, 32);
  drumGeo.computeVertexNormals();
  drumGeo.computeBoundingBox();
  drumGeo.computeBoundingSphere();
  const drumMat = new THREE.MeshStandardMaterial({
    color: 0x8a6d3b,
    roughness: 0.35,
    metalness: 0.65,
    side: THREE.FrontSide
  });
  const drumMesh = new THREE.Mesh(drumGeo, drumMat);
  drumMesh.position.y = 0.575;
  drumMesh.userData.ignoreRaycaster = true;
  pedestal.add(drumMesh);

  // Vành nẹp vàng Tầng 2
  const rim2Geo = new THREE.TorusGeometry(2.28, 0.04, 8, 32);
  rim2Geo.computeVertexNormals();
  rim2Geo.computeBoundingBox();
  rim2Geo.computeBoundingSphere();
  const rim2 = new THREE.Mesh(rim2Geo, goldMat);
  rim2.rotation.x = Math.PI / 2;
  rim2.position.y = 0.80;
  rim2.userData.ignoreRaycaster = true;
  pedestal.add(rim2);

  // Tầng 3: Đài Sen Hoàng Kim 16 cánh chạm nổi nâng đỡ cuốn sách (Y=0.80 đến Y=1.18m)
  const lotusCoreGeo = new THREE.CylinderGeometry(1.85, 2.05, 0.38, 24);
  lotusCoreGeo.computeVertexNormals();
  lotusCoreGeo.computeBoundingBox();
  lotusCoreGeo.computeBoundingSphere();
  const lotusCoreMat = new THREE.MeshStandardMaterial({
    color: 0xb45309,
    roughness: 0.28,
    metalness: 0.85,
    emissive: 0x78350f,
    emissiveIntensity: 0.25,
    side: THREE.FrontSide
  });
  const lotusCore = new THREE.Mesh(lotusCoreGeo, lotusCoreMat);
  lotusCore.position.y = 0.99;
  lotusCore.userData.ignoreRaycaster = true;
  pedestal.add(lotusCore);

  // 16 Cánh sen vàng vát cong mềm mại
  const petalCount = 16;
  const petalR = 1.95;
  const petalGeo = new THREE.ConeGeometry(0.32, 0.45, 4);
  petalGeo.computeVertexNormals();
  petalGeo.computeBoundingBox();
  petalGeo.computeBoundingSphere();
  const petalMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    roughness: 0.22,
    metalness: 0.85,
    emissive: 0xd97706,
    emissiveIntensity: 0.2,
    side: THREE.FrontSide
  });
  const petalsInst = new THREE.InstancedMesh(petalGeo, petalMat, petalCount);
  petalsInst.userData.ignoreRaycaster = true;
  const dummy = new THREE.Object3D();
  for (let i = 0; i < petalCount; i++) {
    const angle = (i * Math.PI * 2) / petalCount;
    dummy.position.set(Math.cos(angle) * petalR, 1.05, Math.sin(angle) * petalR);
    dummy.rotation.set(0.35, -angle, 0);
    dummy.updateMatrix();
    petalsInst.setMatrixAt(i, dummy.matrix);
  }
  petalsInst.instanceMatrix.needsUpdate = true;
  pedestal.add(petalsInst);

  return pedestal;
}

/**
 * 4 TỦ KÍNH BẢO VẬT HOÀNG GIA QUANH ĐÀI SEN TRUNG TÂM
 */
export function createGrandLobbyDisplayCases() {
  const group = new THREE.Group();
  group.name = 'Grand_Lobby_Artifact_Display_Cases';

  const caseSpecs = [
    { x: -5.8, z: 4.2, title: 'BẢN THẢO TRUYỆN KIỀU CỔ', color: 0xf472b6 },
    { x: 5.8, z: 4.2, title: 'CHIẾU DỜI ĐÔ MỘC BẢN', color: 0x38bdf8 },
    { x: -5.8, z: -4.2, title: 'NGỌC TỶ HOÀNG ĐẾ CHI BẢO', color: 0xfacc15 },
    { x: 5.8, z: -4.2, title: 'BỘ BÚT LÔNG NGỌC BÍCH', color: 0x34d399 }
  ];

  const woodPedestalGeo = new THREE.BoxGeometry(1.2, 0.9, 0.85);
  woodPedestalGeo.computeVertexNormals();
  woodPedestalGeo.computeBoundingBox();
  woodPedestalGeo.computeBoundingSphere();
  const woodPedestalMat = new THREE.MeshStandardMaterial({
    color: 0x1f1610,
    roughness: 0.45,
    metalness: 0.35
  });

  const glassGeo = new THREE.BoxGeometry(1.15, 0.75, 0.8);
  glassGeo.computeVertexNormals();
  glassGeo.computeBoundingBox();
  glassGeo.computeBoundingSphere();
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xdbeafe,
    roughness: 0.05,
    metalness: 0.1,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide
  });

  const goldRimGeo = new THREE.BoxGeometry(1.22, 0.04, 0.87);
  goldRimGeo.computeVertexNormals();
  goldRimGeo.computeBoundingBox();
  goldRimGeo.computeBoundingSphere();
  const goldRimMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.25,
    metalness: 0.85
  });

  caseSpecs.forEach((spec) => {
    const caseGroup = new THREE.Group();
    caseGroup.position.set(spec.x, 0, spec.z);
    caseGroup.rotation.y = Math.atan2(-spec.x, -spec.z);

    const base = new THREE.Mesh(woodPedestalGeo, woodPedestalMat);
    base.position.y = 0.45;
    base.userData.ignoreRaycaster = true;
    caseGroup.add(base);

    const rim = new THREE.Mesh(goldRimGeo, goldRimMat);
    rim.position.y = 0.90;
    rim.userData.ignoreRaycaster = true;
    caseGroup.add(rim);

    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.y = 1.28;
    glass.userData.ignoreRaycaster = true;
    caseGroup.add(glass);

    const relicGeo = new THREE.BoxGeometry(0.45, 0.08, 0.32);
    relicGeo.computeVertexNormals();
    relicGeo.computeBoundingBox();
    relicGeo.computeBoundingSphere();
    const relicMat = new THREE.MeshStandardMaterial({
      color: spec.color,
      roughness: 0.3,
      metalness: 0.65,
      emissive: spec.color,
      emissiveIntensity: 0.35
    });
    const relic = new THREE.Mesh(relicGeo, relicMat);
    relic.position.y = 1.05;
    relic.rotation.x = 0.2;
    relic.userData.ignoreRaycaster = true;
    caseGroup.add(relic);

    const spot = new THREE.PointLight(0xfef08a, 0.85, 4.5, 1.4);
    spot.position.set(0, 1.55, 0);
    spot.userData.ignoreRaycaster = true;
    caseGroup.add(spot);

    group.add(caseGroup);
  });

  return group;
}

/**
 * HỆ THỐNG ĐÈN LỒNG CUNG ĐÌNH TREO TRẦN ĐẠI SẢNH (CEILING PALACE LANTERNS)
 * Phục hồi toàn bộ dàn Đèn Lồng / Bóng Bay Đa Sắc Hội An lơ lửng giếng trời (Y = 7m đến 16m)
 * Tối ưu InstancedMesh / Zero dynamic allocations
 */
export function createLobbyCeilingHangingLanterns(parent = null) {
  const group = new THREE.Group();
  group.name = 'Ceiling_Palace_Hanging_Lanterns_Master';
  group.userData.ignoreRaycaster = true;

  // Nếu parent hoặc sảnh đã có cụm đèn lồng từ MuseumSpaceEnrichmentSystem, không tạo trùng lặp
  if (parent && (parent.getObjectByName('Ceiling_HoiAn_Floating_Pastel_Lanterns') || parent.getObjectByName('Ceiling_Revolving_Lanterns_Group'))) {
    return group;
  }

  // Khởi tạo dàn đèn lồng Hội An pastel chuẩn xác
  const floatingLanterns = createFloatingPastelLanterns(28.0);
  group.add(floatingLanterns);
  return group;
}

/**
 * ============================================================================
 * CỘT SÁNG VOLUMETRIC GOD RAYS VÀNG KIM TỎA TỪ MẶT SÁCH LÊN GIẾNG TRỜI (18M)
 * Chuẩn hóa WebGL 60+ FPS: Additive blending, zero-allocation trong update loop
 * ============================================================================
 */
function createMonumentalBookGodRays() {
  const godRayGroup = new THREE.Group();
  godRayGroup.name = 'Monumental_Book_Volumetric_GodRays';
  godRayGroup.userData.ignoreRaycaster = true;

  const rayHeight = 22.0;
  // 1. Hình nón cụt mở rộng từ mặt sách (Y = 1.3m) lên giếng trời thông tầng (Y = 23.3m)
  const outerConeGeo = new THREE.CylinderGeometry(5.2, 2.3, rayHeight, 32, 1, true);
  outerConeGeo.computeVertexNormals();
  outerConeGeo.computeBoundingBox();
  outerConeGeo.computeBoundingSphere();

  const outerMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const outerMesh = new THREE.Mesh(outerConeGeo, outerMat);
  outerMesh.position.y = 1.3 + rayHeight * 0.5;
  outerMesh.userData.ignoreRaycaster = true;
  godRayGroup.add(outerMesh);

  // 2. Lõi sáng bên trong rực rỡ vàng hổ phách
  const innerConeGeo = new THREE.CylinderGeometry(2.6, 1.15, rayHeight, 24, 1, true);
  innerConeGeo.computeVertexNormals();
  innerConeGeo.computeBoundingBox();
  innerConeGeo.computeBoundingSphere();

  const innerMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const innerMesh = new THREE.Mesh(innerConeGeo, innerMat);
  innerMesh.position.y = outerMesh.position.y;
  innerMesh.userData.ignoreRaycaster = true;
  godRayGroup.add(innerMesh);

  godRayGroup.userData.update = (timeSec) => {
    outerMesh.rotation.y = timeSec * 0.05;
    innerMesh.rotation.y = -timeSec * 0.08;
    outerMat.opacity = 0.16 + Math.sin(timeSec * 1.5) * 0.04;
    innerMat.opacity = 0.26 + Math.cos(timeSec * 1.9) * 0.05;
  };

  return godRayGroup;
}

/**
 * ============================================================================
 * HỆ THỐNG BỤI SÁNG HOÀNG KIM & KÝ TỰ DI SẢN BAY XOẮN ỐC TỪ TRANG SÁCH
 * Zero-allocation trong animate update loop, texture Canvas gradient mềm mại
 * ============================================================================
 */
function createMonumentalBookSpiralParticles() {
  const particleCount = 380;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const speeds = new Float32Array(particleCount);
  const initialAngles = new Float32Array(particleCount);
  const radii = new Float32Array(particleCount);

  const palette = [
    new THREE.Color(0xffffff),
    new THREE.Color(0xfef08a),
    new THREE.Color(0xfbbf24),
    new THREE.Color(0xf59e0b)
  ];

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 0.7 + Math.random() * 2.2;
    const y = 1.3 + Math.random() * 21.0;

    positions[i * 3 + 0] = Math.cos(angle) * r;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(angle) * r;

    const col = palette[i % palette.length];
    colors[i * 3 + 0] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;

    speeds[i] = 0.8 + Math.random() * 1.3;
    initialAngles[i] = angle;
    radii[i] = r;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  // Canvas Texture hạt ánh sáng vàng mềm mại
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const rad = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  rad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  rad.addColorStop(0.35, 'rgba(254, 240, 138, 0.85)');
  rad.addColorStop(0.7, 'rgba(245, 158, 11, 0.35)');
  rad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
  ctx.fillStyle = rad;
  ctx.fillRect(0, 0, 64, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;

  const mat = new THREE.PointsMaterial({
    size: 0.42,
    map: tex,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const pointsMesh = new THREE.Points(geometry, mat);
  pointsMesh.name = 'Monumental_Book_Spiral_Particles';
  pointsMesh.userData.ignoreRaycaster = true;

  const posAttr = geometry.attributes.position;
  pointsMesh.userData.update = (timeSec) => {
    for (let i = 0; i < particleCount; i++) {
      let curY = positions[i * 3 + 1];
      curY += speeds[i] * 0.042;
      if (curY > 22.0) {
        curY = 1.3;
      }
      positions[i * 3 + 1] = curY;

      const currentAngle = initialAngles[i] + timeSec * (0.35 * speeds[i]);
      const currentR = radii[i] + ((curY - 1.3) / 21.0) * 2.2;
      positions[i * 3 + 0] = Math.cos(currentAngle) * currentR;
      positions[i * 3 + 2] = Math.sin(currentAngle) * currentR;
    }
    posAttr.needsUpdate = true;
  };

  return pointsMesh;
}

/**
 * TẠO TEXTURE TRANG SÁCH BẢO TÀNG BẰNG CANVAS (downscale 1024x1024 -> 512x512)
 */
function createHeritagePageCanvasTexture(pageTitle, chapterName, verses = []) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.save();
  ctx.scale(0.5, 0.5);

  // Nền giấy điệp hoàng kim ấm áp
  ctx.fillStyle = '#f6edd9';
  ctx.fillRect(0, 0, 1024, 1024);

  // Khung viền hồi văn chữ S và kỷ hà kép
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = 14;
  ctx.strokeRect(36, 36, 952, 952);
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 4;
  ctx.strokeRect(56, 56, 912, 912);

  // Tiêu đề sách thư pháp
  ctx.fillStyle = '#451a03';
  ctx.font = 'bold 44px "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.fillText(pageTitle, 512, 135);

  // Tên chương / tác phẩm
  ctx.fillStyle = '#78350f';
  ctx.font = 'italic bold 28px "Times New Roman", serif';
  ctx.fillText(chapterName, 512, 195);

  // Các dòng thơ di sản
  ctx.fillStyle = '#57361a';
  ctx.font = '24px "Times New Roman", serif';
  const startY = 270;
  verses.forEach((verse, i) => {
    ctx.fillText(verse, 512, startY + i * 46);
  });

  // Vẽ các dòng kẻ trang sách cổ
  ctx.fillStyle = 'rgba(120, 53, 15, 0.35)';
  for (let r = verses.length; r < 12; r++) {
    const y = startY + r * 46;
    ctx.fillRect(160, y, 704, 3);
  }

  // Con dấu son đỏ bảo tàng
  ctx.strokeStyle = '#b91c1c';
  ctx.lineWidth = 6;
  ctx.strokeRect(760, 810, 115, 115);
  ctx.fillStyle = 'rgba(185, 28, 28, 0.88)';
  ctx.font = 'bold 26px "Times New Roman", serif';
  ctx.fillText('BẢO', 817, 856);
  ctx.fillText('TÀNG', 817, 896);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  if ('colorSpace' in texture && THREE.SRGBColorSpace) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  texture.needsUpdate = true;
  return texture;
}

/**
 * DỰNG MÔ HÌNH SÁCH MỞ ĐIÊU KHẮC 3D KHỔ LỚN TÍCH HỢP HIỆU ỨNG TỰ ĐỘNG LẬT TRANG
 * - Rộng 6.8m, sâu 4.2m
 * - Gáy sơn mài đỏ thẫm
 * - Chân đế gỗ mun thanh thoát đặt trực tiếp trên sàn
 * - Trang giấy lật uốn cong mềm mại theo khí động học (Aerodynamic Curl Wave)
 */
export function createProceduralMonumentalOpenBook() {
  const bookGroup = new THREE.Group();
  bookGroup.name = 'Monumental_Open_Book_3D';

  // 1. Chân đế gỗ mun thanh thoát nâng đỡ gáy sách
  const cradleMesh = new THREE.Mesh(
    new THREE.BoxGeometry(6.4, 0.52, 3.8),
    new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 0.38,
      metalness: 0.28
    })
  );
  cradleMesh.rotation.x = 0.28;
  cradleMesh.position.y = -0.20;
  cradleMesh.userData.ignoreRaycaster = true;
  bookGroup.add(cradleMesh);

  // 2. Gáy sách sơn mài đỏ thẫm bóng bẩy thếp vàng
  const spineMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.50, 0.32, 4.15),
    new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.24,
      metalness: 0.45
    })
  );
  spineMesh.rotation.x = 0.28;
  spineMesh.position.y = 0.16;
  spineMesh.userData.ignoreRaycaster = true;
  bookGroup.add(spineMesh);

  // 3. Hai chồng trang giấy cố định ở hai bên (Trang Trái & Trang Phải)
  const leftPageTex = createHeritagePageCanvasTexture(
    'TỔNG TẬP DI SẢN VĂN HIẾN',
    'NAM QUỐC SƠN HÀ • LÝ THƯỜNG KIỆT',
    [
      'Nam quốc sơn hà Nam đế cư,',
      'Tiệt nhiên định phận tại thiên thư.',
      'Như hà nghịch lỗ lai xâm phạm,',
      'Nhữ đẳng hành khan thủ bại hư.',
      '— — — — — — — — — —',
      'Hào khí Đông A ngàn thu tỏa rạng,',
      'Sông núi nước Nam rực rỡ muôn đời.'
    ]
  );
  const leftPageMat = new THREE.MeshStandardMaterial({
    map: leftPageTex,
    roughness: 0.45,
    metalness: 0.10,
    emissive: new THREE.Color(0xb45309),
    emissiveIntensity: 0.35
  });

  const rightPageTex = createHeritagePageCanvasTexture(
    'TỔNG TẬP DI SẢN VĂN HIẾN',
    'BÌNH NGÔ ĐẠI CÁO • NGUYỄN TRÃI',
    [
      'Từng nghe: Việc nhân nghĩa cốt ở yên dân,',
      'Quân điếu phạt trước lo trừ bạo.',
      'Như nước Đại Việt ta từ trước,',
      'Vốn xưng nền văn hiến đã lâu.',
      'Núi sông bờ cõi đã chia,',
      'Phong tục Bắc Nam cũng khác.',
      'Từ Triệu, Đinh, Lý, Trần bao đời xây nền độc lập.'
    ]
  );
  const rightPageMat = new THREE.MeshStandardMaterial({
    map: rightPageTex,
    roughness: 0.45,
    metalness: 0.10,
    emissive: new THREE.Color(0xb45309),
    emissiveIntensity: 0.35
  });

  // Chồng trang bên Trái
  const leftPageGeo = new THREE.BoxGeometry(3.25, 0.18, 4.05, 10, 1, 4);
  const leftPos = leftPageGeo.attributes.position;
  for (let i = 0; i < leftPos.count; i++) {
    const x = leftPos.getX(i);
    const arch = Math.sin(((x * -1 + 1.625) / 3.25) * Math.PI) * 0.16;
    leftPos.setY(i, leftPos.getY(i) + arch);
  }
  leftPageGeo.computeVertexNormals();
  const leftMesh = new THREE.Mesh(leftPageGeo, leftPageMat);
  leftMesh.position.set(-1.78, 0.20, 0);
  leftMesh.rotation.x = 0.28;
  leftMesh.rotation.z = 0.08;
  leftMesh.castShadow = false;
  leftMesh.receiveShadow = false;
  leftMesh.userData.ignoreRaycaster = true;
  bookGroup.add(leftMesh);

  // Chồng trang bên Phải
  const rightPageGeo = new THREE.BoxGeometry(3.25, 0.18, 4.05, 10, 1, 4);
  const rightPos = rightPageGeo.attributes.position;
  for (let i = 0; i < rightPos.count; i++) {
    const x = rightPos.getX(i);
    const arch = Math.sin(((x + 1.625) / 3.25) * Math.PI) * 0.16;
    rightPos.setY(i, rightPos.getY(i) + arch);
  }
  rightPageGeo.computeVertexNormals();
  const rightMesh = new THREE.Mesh(rightPageGeo, rightPageMat);
  rightMesh.position.set(1.78, 0.20, 0);
  rightMesh.rotation.x = 0.28;
  rightMesh.rotation.z = -0.08;
  rightMesh.castShadow = false;
  rightMesh.receiveShadow = false;
  rightMesh.userData.ignoreRaycaster = true;
  bookGroup.add(rightMesh);

  // =========================================================================
  // 4. HỆ THỐNG TRANG LẬT TỰ ĐỘNG (GPU VERTEX CURL SHADER - 0 CPU VERTEX UPLOAD)
  // =========================================================================
  const turnPivot = new THREE.Group();
  turnPivot.name = 'Monumental_Turning_Page_Pivot';
  turnPivot.position.set(0, 0.22, 0);
  turnPivot.rotation.x = 0.28;
  bookGroup.add(turnPivot);

  const flipPageW = 3.25;
  const flipPageD = 4.05;
  const flipGeo = new THREE.PlaneGeometry(flipPageW, flipPageD, 16, 6);
  flipGeo.rotateX(-Math.PI / 2); // Đưa về mặt phẳng XZ (normal hướng lên +Y)
  flipGeo.translate(flipPageW * 0.5, 0, 0); // Dời mép gáy về x = 0 (trục quay gáy sách)

  const flipShaderUniforms = {
    uPageWidth: { value: flipPageW },
    uCurlAmp: { value: 0.0 },
    uFlutterAmp: { value: 0.0 },
    uTime: { value: 0.0 }
  };

  const attachPageCurlShader = (mat) => {
    mat.customProgramCacheKey = () => 'monumental_book_page_curl_v1';
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uPageWidth = flipShaderUniforms.uPageWidth;
      shader.uniforms.uCurlAmp = flipShaderUniforms.uCurlAmp;
      shader.uniforms.uFlutterAmp = flipShaderUniforms.uFlutterAmp;
      shader.uniforms.uTime = flipShaderUniforms.uTime;
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform float uPageWidth;
          uniform float uCurlAmp;
          uniform float uFlutterAmp;
          uniform float uTime;`
        )
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float normX = clamp(transformed.x / max(uPageWidth, 0.001), 0.0, 1.0);
          float pageCurl = uCurlAmp * pow(normX, 1.45);
          float pageFlutter = uFlutterAmp * sin(uTime * 7.5 + normX * 4.5);
          transformed.y += pageCurl + pageFlutter;`
        );
    };
  };

  // Mặt trước của trang lật (nhìn thấy khi ở bên phải và khi đang nhấc lên)
  const flipFrontTex = createHeritagePageCanvasTexture(
    'ĐOẠN TRƯỜNG TÂN THANH',
    'TRUYỆN KIỀU • NGUYỄN DU',
    [
      'Trăm năm trong cõi người ta,',
      'Chữ tài chữ mệnh khéo là ghét nhau.',
      'Trải qua một cuộc bể dâu,',
      'Những điều trông thấy mà đau đớn lòng.',
      'Lạ gì bỉ sắc tư phong,',
      'Trời xanh quen thói má hồng đánh ghen.'
    ]
  );
  const flipFrontMat = new THREE.MeshStandardMaterial({
    map: flipFrontTex,
    roughness: 0.45,
    metalness: 0.10,
    side: THREE.FrontSide,
    transparent: true,
    opacity: 1.0,
    emissive: new THREE.Color(0xb45309),
    emissiveIntensity: 0.35
  });
  attachPageCurlShader(flipFrontMat);
  const flipFrontMesh = new THREE.Mesh(flipGeo, flipFrontMat);
  flipFrontMesh.castShadow = false;
  flipFrontMesh.receiveShadow = false;
  flipFrontMesh.userData.ignoreRaycaster = true;
  turnPivot.add(flipFrontMesh);

  // Mặt sau của trang lật (nhìn thấy khi lật qua bên trái)
  const flipBackTex = createHeritagePageCanvasTexture(
    'HỊCH TƯỚNG SĨ',
    'TRẦN HƯNG ĐẠO • ĐẠI VIỆT',
    [
      'Ta thường tới bữa quên ăn,',
      'Nửa đêm vỗ gối, ruột đau như cắt,',
      'Nước mắt đầm đìa;',
      'Chỉ căm tức chưa xả thịt lột da,',
      'Nuốt gan uống máu quân thù.',
      'Dẫu cho trăm thân này phơi ngoài nội cỏ,',
      'Nghìn xác này gói trong da ngựa,',
      'Ta cũng cam lòng.'
    ]
  );
  const flipBackMat = new THREE.MeshStandardMaterial({
    map: flipBackTex,
    roughness: 0.45,
    metalness: 0.10,
    side: THREE.BackSide,
    transparent: true,
    opacity: 1.0,
    emissive: new THREE.Color(0xb45309),
    emissiveIntensity: 0.35
  });
  attachPageCurlShader(flipBackMat);
  const flipBackMesh = new THREE.Mesh(flipGeo, flipBackMat);
  flipBackMesh.position.y = -0.003; // Tránh z-fighting
  flipBackMesh.castShadow = false;
  flipBackMesh.receiveShadow = false;
  flipBackMesh.userData.ignoreRaycaster = true;
  turnPivot.add(flipBackMesh);

  // VÒNG LẶP HOẠT HỌA TỰ ĐỘNG LẬT TRANG (CHỈ CẬP NHẬT UNIFORMS)
  bookGroup.userData.update = (timeSec) => {
    // Nhịp thở phát sáng hoàng kim của các trang sách di sản
    const pageEmissivePulse = 0.30 + Math.sin(timeSec * 2.2) * 0.08;
    leftPageMat.emissiveIntensity = pageEmissivePulse;
    rightPageMat.emissiveIntensity = pageEmissivePulse;
    flipFrontMat.emissiveIntensity = pageEmissivePulse;
    flipBackMat.emissiveIntensity = pageEmissivePulse;

    const cyclePeriod = 6.0;
    const t = timeSec % cyclePeriod;

    // Pha 1: Nghỉ êm đềm ở bên phải cho khách đọc (0.0s -> 1.2s)
    if (t < 1.2) {
      turnPivot.rotation.z = -0.08;
      flipFrontMat.opacity = 1.0;
      flipBackMat.opacity = 1.0;
      flipShaderUniforms.uCurlAmp.value = 0.0;
      flipShaderUniforms.uFlutterAmp.value = 0.0;
    }
    // Pha 2: Lật trang từ phải sang trái (1.2s -> 4.4s)
    else if (t >= 1.2 && t < 4.4) {
      const progress = (t - 1.2) / 3.2;
      const ease = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      turnPivot.rotation.z = -0.08 + ease * (Math.PI + 0.16);

      const sinProg = Math.sin(progress * Math.PI);
      const curlDirection = progress < 0.5 ? -1.0 : 1.0;
      flipShaderUniforms.uCurlAmp.value = curlDirection * sinProg * 0.44 * 0.85;
      flipShaderUniforms.uFlutterAmp.value = sinProg * 0.02;
      flipShaderUniforms.uTime.value = timeSec;

      flipFrontMat.opacity = 1.0;
      flipBackMat.opacity = 1.0;
    }
    // Pha 3: Nằm yên êm ái trên chồng trang bên trái (4.4s -> 5.4s)
    else if (t >= 4.4 && t < 5.4) {
      turnPivot.rotation.z = Math.PI + 0.08;
      flipShaderUniforms.uCurlAmp.value = 0.0;
      flipShaderUniforms.uFlutterAmp.value = 0.0;
      flipFrontMat.opacity = 1.0;
      flipBackMat.opacity = 1.0;
    }
    // Pha 4: Chuyển tiếp mờ dần nhẹ nhàng để bắt đầu trang kế tiếp (5.4s -> 6.0s)
    else {
      const resetProgress = (t - 5.4) / 0.6;
      flipShaderUniforms.uCurlAmp.value = 0.0;
      flipShaderUniforms.uFlutterAmp.value = 0.0;
      if (resetProgress < 0.5) {
        const fadeOut = 1.0 - resetProgress * 2.0;
        flipFrontMat.opacity = fadeOut;
        flipBackMat.opacity = fadeOut;
      } else {
        turnPivot.rotation.z = -0.08;
        const fadeIn = (resetProgress - 0.5) * 2.0;
        flipFrontMat.opacity = fadeIn;
        flipBackMat.opacity = fadeIn;
      }
    }
  };

  return bookGroup;
}

/**
 * ============================================================================
 * HẠNG MỤC 2: TRẦN GỖ HOA SEN & ĐÈN LỒNG CUNG ĐÌNH
 * (Không áp dụng cho Đại Sảnh để bảo tồn giếng trời thông tầng 32m)
 * ============================================================================
 */
export function buildSculptedLotusCofferCeiling(roomGroup, {
  roomWidth = 25.32,
  roomDepth = 27.30,
  ceilingHeight = 8.40,
  isLobby = false
} = {}) {
  // Tuyệt đối không gắn trần cho Đại Sảnh
  if (!roomGroup || isLobby || roomGroup.name === 'Museum_Atrium_Root') return null;

  const existingCeiling = roomGroup.getObjectByName('Sculpted_Lotus_Coffered_Ceiling');
  if (existingCeiling) return existingCeiling;

  const ceilingGroup = new THREE.Group();
  ceilingGroup.name = 'Sculpted_Lotus_Coffered_Ceiling';
  ceilingGroup.userData.ignoreRaycaster = true;

  const cofferMat = createCarvedHeritagePbrMaterial('lotusGold', 6, 6);
  const ceilingPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(roomWidth, roomDepth),
    cofferMat
  );
  ceilingPlane.rotation.x = Math.PI / 2;
  ceilingPlane.position.y = ceilingHeight;
  ceilingPlane.userData.ignoreRaycaster = true;
  ceilingGroup.add(ceilingPlane);

  const lanternGeo = new THREE.CylinderGeometry(0.32, 0.26, 0.68, 12);
  const lanternMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const lanternInstanced = new THREE.InstancedMesh(lanternGeo, lanternMat, 9);
  lanternInstanced.name = 'Ceiling_Palace_Lanterns_Instanced';
  lanternInstanced.userData.ignoreRaycaster = true;

  const dummy = new THREE.Object3D();
  let idx = 0;
  for (let gx = -1; gx <= 1; gx++) {
    for (let gz = -1; gz <= 1; gz++) {
      dummy.position.set(gx * (roomWidth * 0.28), ceilingHeight - 0.55, gz * (roomDepth * 0.28));
      dummy.updateMatrix();
      lanternInstanced.setMatrixAt(idx++, dummy.matrix);
    }
  }
  lanternInstanced.instanceMatrix.needsUpdate = true;
  ceilingGroup.add(lanternInstanced);

  roomGroup.add(ceilingGroup);
  return ceilingGroup;
}

/**
 * ============================================================================
 * HẠNG MỤC 3: BỘ ĐIỀU KHIỂN CHẾ ĐỘ HIỂN THỊ PIXELFX RETRO / CRT SCANLINE [P]
 * ============================================================================
 */
export function setupPixelFxRetroController(renderer) {
  let mode = 0;
  let scanlineOverlay = null;
  const basePixelRatio = Math.min(renderer?.getPixelRatio?.() || (typeof window !== 'undefined' ? window.devicePixelRatio : 1) || 1, 1.0);

  if (typeof document !== 'undefined') {
    scanlineOverlay = document.getElementById('pixelfx-crt-overlay');
    if (!scanlineOverlay) {
      scanlineOverlay = document.createElement('div');
      scanlineOverlay.id = 'pixelfx-crt-overlay';
      scanlineOverlay.style.cssText = `
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 9980;
        display: none;
        background: repeating-linear-gradient(
          0deg,
          rgba(0, 0, 0, 0.24) 0px,
          rgba(0, 0, 0, 0.24) 1px,
          transparent 1px,
          transparent 3px
        );
      `;
      document.body.appendChild(scanlineOverlay);
    }
  }

  const showPixelFxToast = (modeName, color) => {
    if (typeof document === 'undefined') return;
    let toast = document.getElementById('pixelfx-mode-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'pixelfx-mode-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 28px;
        left: 28px;
        padding: 10px 18px;
        background: rgba(15, 23, 42, 0.92);
        color: #f8fafc;
        border-radius: 8px;
        font-family: 'Segoe UI', system-ui, sans-serif;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.5px;
        z-index: 999999;
        pointer-events: none;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(8px);
        transition: opacity 0.3s ease;
      `;
      document.body.appendChild(toast);
    }
    toast.style.borderColor = color;
    toast.style.border = `1px solid ${color}`;
    toast.innerHTML = `<span style="color:${color}">⚡ Chế độ hiển thị [P]:</span> ${modeName}`;
    toast.style.opacity = '1';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.style.opacity = '0';
    }, 2400);
  };

  const applyMode = (newMode) => {
    mode = newMode % 3;
    if (!renderer) return;

    if (mode === 0) {
      renderer.setPixelRatio(basePixelRatio);
      renderer.domElement.style.imageRendering = 'auto';
      if (scanlineOverlay) scanlineOverlay.style.display = 'none';
      showPixelFxToast('Crisp PBR HD (Nguyên Bản)', '#38bdf8');
    } else if (mode === 1) {
      renderer.setPixelRatio(0.45);
      renderer.domElement.style.imageRendering = 'pixelated';
      if (scanlineOverlay) scanlineOverlay.style.display = 'none';
      showPixelFxToast('PixelFX Stylized (Dither 16-bit)', '#facc15');
    } else {
      renderer.setPixelRatio(0.38);
      renderer.domElement.style.imageRendering = 'pixelated';
      if (scanlineOverlay) scanlineOverlay.style.display = 'block';
      showPixelFxToast('PixelFX Retro CRT (Scanlines Cổ Điển)', '#4ade80');
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.key === 'p' || e.key === 'P') {
        applyMode(mode + 1);
      }
    });
  }

  return { applyMode, getMode: () => mode };
}

/**
 * ============================================================================
 * HÀM TỔNG KHỞI TẠO & VẬN HÀNH 16 KỸ NĂNG CHO TOÀN BỘ BẢO TÀNG
 * ============================================================================
 */
export async function applyAll16SkillsToMuseum({
  scene = null,
  camera = null,
  renderer = null,
  lobbyGroup = null,
  roomsMap = {},
  sonTinhMythicRealmGroup = null,
  sonTinhModel = null,
  thuyTinhModel = null,
  hitboxManager = null,
  cameraManager = null,
  loreGuide = null,
  audioDirector = null,
  walkableFloors = [],
  onTourStateChange = null
} = {}) {
  const targetScene = scene || (typeof window !== 'undefined' ? (window.__scene || window.__mainScene || window.__app?.scene) : null);

  // 1. Khởi tạo / lấy Hitbox Manager tập trung
  const hbm = hitboxManager || getMuseumHitboxManager(targetScene);
  if (cameraManager && hbm) {
    cameraManager.setHitboxManager(hbm);
  }

  // 2. ĐẶT CUỐN SÁCH DI SẢN KHỔNG LỒ TẠI TÂM ĐẠI SẢNH (0, 0, 0)
  // Đã bỏ bục vòng tròn/bát giác, giữ lại cuốn sách với hiệu ứng tự động lật
  let giantBookCenterpiece = null;
  if (lobbyGroup) {
    removeLobbyCeilingAndOverheadClutter(lobbyGroup);
    if (targetScene && targetScene !== lobbyGroup) {
      removeLobbyCeilingAndOverheadClutter(targetScene);
    }

    giantBookCenterpiece = await setupGrandLobbyGiantBookCenterpiece(lobbyGroup, {
      hitboxManager: hbm,
      loreGuide,
      audioDirector
    });

    upgradeRoomWallArchitecture(lobbyGroup, {
      themeKey: 'lobby',
      isLobby: true,
      roomWidth: 32,
      roomDepth: 32,
      wallHeight: 8.4
    });

    // 2.2. Phục hồi và bổ sung hệ thống đèn lồng cung đình treo trần hoàng cung
    const hangingLanterns = createLobbyCeilingHangingLanterns(lobbyGroup);
    if (hangingLanterns && hangingLanterns.children.length > 0) {
      lobbyGroup.add(hangingLanterns);
    }

    // 2.3. Đảm bảo Chiêng Đồng và 2 Hoành Phi hiển thị trang nghiêm; gỡ bỏ Tháp Lầu Bát Giác theo yêu cầu
    if (!lobbyGroup.getObjectByName('Focal_Bronze_Medallion_Wall')) {
      const focalWall = createFocalBronzeMedallionWall();
      lobbyGroup.add(focalWall);
    }
    const existingTower = lobbyGroup.getObjectByName('Lobby_Octagonal_Wooden_Tower_Pavilion');
    if (existingTower) {
      existingTower.traverse((c) => {
        if (c.isMesh) {
          c.geometry?.dispose?.();
          if (Array.isArray(c.material)) c.material.forEach((m) => m?.dispose?.());
          else c.material?.dispose?.();
        }
      });
      if (existingTower.parent) existingTower.parent.remove(existingTower);
    }
    if (!lobbyGroup.getObjectByName('Lobby_Flanking_Horizontal_Lacquered_Banners')) {
      const horizontalBanners = createLobbyHorizontalLacqueredBanners();
      lobbyGroup.add(horizontalBanners);
    }
  }

  // 3. ĐIÊU KHẮC TƯỜNG CHO CÁC PHÒNG TRƯNG BÀY (tránh gắn trùng cổng vòm đã có trong TotalOverhaulEngine)
  const roomUpgradeConfigs = [
    { key: 'truyenKieu' },
    { key: 'voNhat' }
  ];

  roomUpgradeConfigs.forEach((cfg) => {
    const rGroup = roomsMap[cfg.key];
    if (!rGroup) return;
    upgradeRoomWallArchitecture(rGroup, { themeKey: cfg.key });
  });

  // 4 & 5. PixelFX Retro Mode [P]; giữ null cho AutoTour/WebXR/SonTinhRealm (đã quản lý tại main.js để tránh trùng lặp)
  const pixelFxController = setupPixelFxRetroController(renderer);
  const autoTourDirector = null;
  const webXrController = null;
  const sonTinhRealmController = null;

  // VÒNG LẶP CẬP NHẬT TỔNG UPDATEALL: CHỈ CẬP NHẬT SÁCH DI SẢN ĐẠI SẢNH
  const updateAll = (nowMs = performance.now()) => {
    const timeSec = nowMs * 0.001;

    try {
      if (giantBookCenterpiece?.userData?.update) {
        giantBookCenterpiece.userData.update(timeSec, 0.016);
      }
    } catch (err) {
      console.warn('[16-Skills Loop Self-Healing]:', err);
    }
  };

  console.log('%c✓ ĐÃ THIẾT LẬP HOÀN TẤT CUỐN SÁCH DI SẢN ĐẶT TRÊN SÀN (TỰ ĐỘNG LẬT TRANG - ĐÃ BỎ BỤC VÒNG TRÒN)!', 'color: #38bdf8; font-weight: bold; font-size: 14px;');

  return {
    hitboxManager: hbm,
    giantBookCenterpiece,
    autoTourDirector,
    pixelFxController,
    sonTinhRealmController,
    webXrController,
    updateAll
  };
}
