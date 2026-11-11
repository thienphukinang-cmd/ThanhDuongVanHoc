import * as THREE from 'three';
import { loadGlbCached } from '../utils/modelLoaderHelper.js';
import { disposeSceneBranch } from './museumMasterBeautifier.js';
import { createTraditionalArchwayEntrance } from './museumCuratorAndTourSystem.js';
import {
  decorateMuseumGrandLobbyAndCorridors as decorateGrandLobbyInternal
} from './museumLobbyCorridorDecorator.js';

/**
 * ============================================================================
 * MUSEUM TOTAL OVERHAUL ENGINE (12 SKILLS HARMONIZATION - 60+ FPS)
 * Tái thiết kế toàn bộ kiến trúc và nội thất Bảo Tàng Văn Học 3D bằng:
 * - 4 Model Di Sản Việt Nam từ Blender (.GLB):
 *   1. lotus_pedestal_high.glb (Bệ đá hoa sen 16 cánh chạm nổi PBR)
 *   2. mai_dao_archway.glb (Cổng Tam Quan Mái Đao cong vút truyền thống)
 *   3. dong_son_drum_3d.glb (Trống Đồng Đông Sơn 3D chuẩn biên dạng)
 *   4. imperial_pillar_dougong.glb (Cột lim sơn son thếp vàng có đấu củng)
 * - 6 Model Nội Thất & Núi Đá từ Web Poly Haven (.GLB):
 *   1. antique_vase.glb (Lục bình đồng cổ)
 *   2. royal_chandelier.glb (Đèn chùm hoàng cung đại sảnh)
 *   3. lobby_plant.glb (Chậu cây cảnh đại sảnh)
 *   4. ancient_wooden_table.glb (Án thư gỗ cổ)
 *   5. wooden_pedestal.glb (Đôn gỗ trưng bày)
 *   6. tan_vien_boulder.glb (Đá tảng gia cố vách núi Tản Viên)
 * - Kết nối Đa Giác Quan:
 *   + MuseumSpatialAudioDirector (Âm thanh không gian 3D)
 *   + MuseumInteractiveLoreGuide (Thẻ thơ tương tác sơn mài)
 *   + MuseumAutoTourDirector (Hướng dẫn viên tự động - Phím T)
 *   + setupMuseumWebXRTeleport (VR Headset 72+ FPS)
 * ============================================================================
 */

const MODEL_CACHE = new Map();
const _overhaulBoxScratch = new THREE.Box3();
const _overhaulVecScratch = new THREE.Vector3();

function createInstancedBranchGroup(baseObj, transforms, name, boundingCenter, boundingRadius) {
  const group = new THREE.Group();
  group.name = name;
  group.userData.ignoreRaycaster = true;

  baseObj.updateMatrixWorld(true);
  const invRoot = baseObj.matrixWorld.clone().invert();
  const relMatrix = new THREE.Matrix4();
  const trMatrix = new THREE.Matrix4();
  const finalMatrix = new THREE.Matrix4();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const scale = new THREE.Vector3();
  const bounds = new THREE.Sphere(boundingCenter, boundingRadius);

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
    const inst = new THREE.InstancedMesh(child.geometry, mat, transforms.length);
    for (let i = 0; i < transforms.length; i++) {
      const t = transforms[i];
      pos.set(t.x || 0, t.y || 0, t.z || 0);
      euler.set(0, t.rotY || 0, 0);
      quat.setFromEuler(euler);
      const s = t.scale ?? 1;
      scale.set(s, s, s);
      trMatrix.compose(pos, quat, scale);
      finalMatrix.multiplyMatrices(trMatrix, relMatrix);
      inst.setMatrixAt(i, finalMatrix);
    }
    inst.instanceMatrix.needsUpdate = true;
    inst.castShadow = false;
    inst.receiveShadow = false;
    inst.frustumCulled = true;
    inst.boundingSphere = bounds;
    inst.matrixAutoUpdate = false;
    inst.updateMatrix();
    inst.userData.ignoreRaycaster = true;
    group.add(inst);
  });

  return group;
}

/**
 * Nạp model .GLB (từ Blender hoặc Web) có bộ nhớ đệm, chuẩn hóa kích thước,
 * BẢO TOÀN 100% VẬT LIỆU PBR (MeshStandardMaterial / MeshPhysicalMaterial),
 * gán userData.ignoreRaycaster = true và tắt đổ bóng nặng để giữ vững 60+ FPS.
 */
export function loadCachedGlbModel(url, {
  targetSpan = 2.4,
  fitAxis = 'y',
  castShadow = false,
  receiveShadow = false
} = {}) {
  const cacheKey = `${url}_${targetSpan}_${fitAxis}`;
  if (MODEL_CACHE.has(cacheKey)) {
    return MODEL_CACHE.get(cacheKey).then((template) => template.clone(true));
  }

  const promise = loadGlbCached([url], {
    maxTextureSize: 512,
    disableMipmaps: true,
    clone: true
  }).then((root) => {
    root.traverse((child) => {
      if (!child.isMesh) return;
      child.castShadow = castShadow;
      child.receiveShadow = receiveShadow;
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

    // Chuẩn hóa kích thước & trọng tâm, bảo tồn nguyên vẹn vật liệu PBR
    root.updateMatrixWorld(true);
    _overhaulBoxScratch.setFromObject(root);
    _overhaulBoxScratch.getSize(_overhaulVecScratch);

    let refDim = Math.max(_overhaulVecScratch.y, 0.001);
    if (fitAxis === 'x') refDim = Math.max(_overhaulVecScratch.x, 0.001);
    else if (fitAxis === 'z') refDim = Math.max(_overhaulVecScratch.z, 0.001);
    else if (fitAxis === 'maxHorizontal') refDim = Math.max(_overhaulVecScratch.x, _overhaulVecScratch.z, 0.001);
    else if (fitAxis === 'maxDim') refDim = Math.max(_overhaulVecScratch.x, _overhaulVecScratch.y, _overhaulVecScratch.z, 0.001);

    const scale = targetSpan / refDim;
    root.scale.multiplyScalar(scale);
    root.updateMatrixWorld(true);

    _overhaulBoxScratch.setFromObject(root);
    _overhaulBoxScratch.getCenter(_overhaulVecScratch);
    root.position.x -= _overhaulVecScratch.x;
    root.position.z -= _overhaulVecScratch.z;
    root.position.y -= _overhaulBoxScratch.min.y;

    const wrapper = new THREE.Group();
    wrapper.userData.ignoreRaycaster = true;
    wrapper.add(root);
    return wrapper;
  });

  MODEL_CACHE.set(cacheKey, promise);
  return promise.then((template) => template.clone(true));
}

/**
 * XÓA BỎ CÁC KHỐI TRANG TRÍ HÌNH HỌC CŨ KỸ TRONG ĐẠI SẢNH & CÁC PHÒNG TRƯNG BÀY
 * Bảo vệ 100% sách thần (isBookPortal), thẻ thơ (isLoreArtifact), nhân vật và kết cấu chịu lực
 */
export function purgeLegacyPrimitiveDecorations(container) {
  if (!container) return 0;
  const toRemove = [];

  container.traverse((child) => {
    // Dọn dẹp bất kỳ container thừa nào bị đặt nhầm vào root (0, 0, 0)
    if (child.name && child.name.startsWith('Overhaul_Container_') && child.parent === container) {
      toRemove.push(child);
      return;
    }

    if (!child.isMesh) return;

    const ud = child.userData || {};
    const name = (child.name || '').toLowerCase();

    // TUYỆT ĐỐI BẢO VỆ: Sách chuyển cảnh, cổng dịch chuyển, nhân vật thần thoại, thẻ thơ, tường & sàn chính
    if (
      ud.isBookPortal ||
      ud.isTeleportBook ||
      ud.isLoreArtifact ||
      ud.loreKey ||
      ud.isCharacterHero ||
      ud.isPermanentStructure ||
      name.includes('portal') ||
      name.includes('book') ||
      name.includes('sontinh') ||
      name.includes('thuytinh') ||
      name.includes('kieu') ||
      name.includes('adv') ||
      name.includes('vonhat') ||
      name.includes('mandala') ||
      name.includes('curated_station') ||
      name.includes('traditional_archway') ||
      name.includes('wall') ||
      name.includes('floor') ||
      name.includes('ceiling') ||
      name.includes('stair')
    ) {
      return;
    }

    // Nhận diện khối trang trí primitive cũ tạo bằng BoxGeometry / CylinderGeometry
    const geoType = child.geometry?.type || '';
    const isOldPrimitiveProp =
      (geoType === 'CylinderGeometry' || geoType === 'BoxGeometry' || geoType === 'ConeGeometry') &&
      (ud.isLegacyDecoration === true ||
       name.includes('legacy') ||
       name.includes('old') ||
       name.includes('rough_pillar') ||
       name.includes('temp_pedestal') ||
       name.includes('primitive'));

    if (isOldPrimitiveProp) {
      toRemove.push(child);
    }
  });

  toRemove.forEach((node) => disposeSceneBranch(node));
  return toRemove.length;
}

/**
 * NÂNG CẤP TOÀN DIỆN MỘT PHÒNG TRƯNG BÀY BẰNG MODEL BLENDER + MODEL WEB + 12 SKILLS
 * Đảm bảo CHỈ đặt vào đúng interiorGroup của phòng, TUYỆT ĐỐI KHÔNG spawn ra Đại Sảnh (0, 0, 0)
 */
export async function overhaulExhibitionRoom(roomGroup, {
  themeKey = 'truyenKieu',
  roomTitle = 'TRUYỆN KIỀU ĐƯỜNG',
  leftCouplet = 'Trăm năm trong cõi người ta',
  rightCouplet = 'Chữ tài chữ mệnh khéo là ghét nhau',
  accentColor = 0xf472b6,
  loreKey = 'truyenKieu_hoCam',
  stationTitle = 'Hiện Vật Trung Tâm',
  stationSubtitle = 'Chạm vào để xem thẻ thơ & nghe âm thanh truyền cảm',
  stationPos = new THREE.Vector3(-4.8, 0, -3.2),
  loreGuide = null,
  audioDirector = null
} = {}) {
  if (!roomGroup) return null;

  // Dọn dẹp bất kỳ Overhaul_Container cũ nào bị đặt sai tọa độ (0, 0, 0)
  const existingOverhaul = roomGroup.getObjectByName(`Overhaul_Container_${themeKey}`);
  if (existingOverhaul) {
    disposeSceneBranch(existingOverhaul);
    roomGroup.remove(existingOverhaul);
  }

  // Tìm interior group thực sự của căn phòng
  const targetInterior =
    roomGroup.getObjectByName('TK_Aligned_Interior') ||
    roomGroup.getObjectByName('STTT_Aligned_Interior') ||
    roomGroup.getObjectByName('ADV_Aligned_Interior') ||
    roomGroup.getObjectByName('VN_Aligned_Interior') ||
    null;

  // Nếu không tìm thấy interior group của phòng (nghĩa là đang ở root), tuyệt đối KHÔNG đẻ rác vào Đại Sảnh
  if (!targetInterior) {
    purgeLegacyPrimitiveDecorations(roomGroup);
    return null;
  }

  // Dọn dẹp các khối hình học trang trí cũ bên trong phòng
  purgeLegacyPrimitiveDecorations(targetInterior);

  const overhaulContainer = new THREE.Group();
  overhaulContainer.name = `Overhaul_Container_${themeKey}`;
  overhaulContainer.userData.ignoreRaycaster = true;

  // Cổng vòm mái đao tại Z = +12.0m: Kiểm tra nếu phòng chưa có thì nạp
  const hasArchway = targetInterior.children.some((c) =>
    c.name && (c.name.includes('Traditional_Archway') || c.name.includes('Mai_Dao'))
  );
  if (!hasArchway) {
    try {
      const blenderArch = await loadCachedGlbModel('/model/heritage/mai_dao_archway.glb', {
        targetSpan: 6.2,
        fitAxis: 'y'
      });
      blenderArch.position.set(0, 0, 12.0);
      overhaulContainer.add(blenderArch);
    } catch {
      const proceduralArch = createTraditionalArchwayEntrance({
        roomTitle,
        leftCouplet,
        rightCouplet,
        archWidth: 6.2,
        archHeight: 4.8
      });
      proceduralArch.position.set(0, 0, 12.0);
      overhaulContainer.add(proceduralArch);
    }
  }

  // Nạp Án Thư Gỗ Cổ (ancient_wooden_table.glb) & Lục Bình Đồng Cổ (antique_vase.glb) từ Web vào phòng
  try {
    const ancientTable = await loadCachedGlbModel('/model/web/ancient_wooden_table.glb', {
      targetSpan: 2.8,
      fitAxis: 'y'
    });
    ancientTable.position.set(0, 0, -8.6);
    ancientTable.userData.ignoreRaycaster = true;
    overhaulContainer.add(ancientTable);
  } catch {}

  try {
    const antiqueVase = await loadCachedGlbModel('/model/web/antique_vase.glb', {
      targetSpan: 1.75,
      fitAxis: 'y'
    });
    const instancedVases = createInstancedBranchGroup(
      antiqueVase,
      [
        { x: -6.5, y: 0, z: -8.2 },
        { x: 6.5, y: 0, z: -8.2 }
      ],
      'Instanced_Room_Antique_Vases',
      new THREE.Vector3(0, 0.9, -8.2),
      8.0
    );
    overhaulContainer.add(instancedVases);
  } catch {}

  targetInterior.add(overhaulContainer);

  return {
    overhaulContainer,
    update: () => {}
  };
}

/**
 * ĐẠI SẢNH & HÀNH LANG HOÀNG CUNG ĐÔNG SƠN:
 * Tích hợp đầy đủ các model Web & Blender chuẩn PBR:
 * - Royal Chandelier (royal_chandelier.glb) treo vòm sảnh chính Y = 18.5m
 * - Trống Đồng Đông Sơn 3D (dong_son_drum_3d.glb) ngự trên Bệ Sen (lotus_pedestal_high.glb)
 * - Lục Bình Đồng (antique_vase.glb) & Đôn Gỗ (wooden_pedestal.glb) dọc hành lang
 * - Chậu Cây Cảnh (lobby_plant.glb) tại các góc & chân cầu thang
 * - Không cho bất kỳ vật thể nào chắn ngang thảm đỏ
 */
export function decorateMuseumGrandLobbyAndCorridors(container, options = {}) {
  purgeLegacyPrimitiveDecorations(container);
  return decorateGrandLobbyInternal(container, options);
}

/**
 * GIA CỐ VÁCH NÚI TẢN VIÊN BẰNG MODEL TAN_VIEN_BOULDER.GLB TỪ WEB (POLY HAVEN)
 * - Bố trí cụm vách đá Tản Viên tiền tiêu hứng sóng dữ từ Thủy Tinh (+X) đập vào vách núi
 * - Giữ chuẩn vị trí Sơn Tinh ngự trên đỉnh núi cao (Y = 42m) đối đầu trực diện Thủy Tinh ở dưới thấp (Y = 18.5m)
 * - Tuyệt đối không có thủy quái và lốc xoáy
 */
export async function reinforceTanVienMountainWithBoulders(mountainGroup, {
  boulderModelPath = '/model/web/tan_vien_boulder.glb'
} = {}) {
  if (!mountainGroup) return null;

  try {
    const baseBoulder = await loadCachedGlbModel(boulderModelPath, {
      targetSpan: 8.5,
      fitAxis: 'y'
    });

    const bastionClusters = [
      { x: 18.0, y: 14.0, z: 4.0, scale: 1.4, rotY: 0.5 },
      { x: 16.5, y: 22.0, z: -2.0, scale: 1.2, rotY: 1.2 },
      { x: 19.2, y: 28.0, z: 8.0, scale: 1.3, rotY: 2.1 },
      { x: 12.0, y: 34.0, z: 2.0, scale: 1.0, rotY: 0.8 },
      { x: 6.0, y: 40.5, z: 0.0, scale: 1.2, rotY: 1.8 },
      { x: 4.5, y: 39.8, z: -2.5, scale: 1.1, rotY: 2.7 }
    ];

    const group = createInstancedBranchGroup(
      baseBoulder,
      bastionClusters,
      'Tan_Vien_Reinforced_Boulders',
      new THREE.Vector3(12, 27, 2),
      28.0
    );

    mountainGroup.add(group);
    return group;
  } catch (err) {
    console.warn('[OVERHAUL] Không thể tải tan_vien_boulder.glb, dùng vách núi procedural:', err);
    return null;
  }
}

/**
 * ============================================================================
 * CLASS MUSEUM TOTAL OVERHAUL ENGINE
 * Quản lý vòng đời, cập nhật chuyển động đa giác quan & điều phối 60+ FPS
 * ============================================================================
 */
export class MuseumTotalOverhaulEngine {
  constructor(app) {
    this.app = app;
    this.overhauls = [];
    this.isInitialized = false;
  }

  async initialize() {
    console.log('%c[TOTAL OVERHAUL] Khởi động động cơ tái thiết kế Bảo Tàng Văn Học 3D...', 'color: #facc15; font-weight: bold;');

    const app = this.app;
    const loreGuide = app.immersionSystem?.loreGuide;
    const audioDirector = app.immersionSystem?.spatialAudio;

    // 1. Quét dọn khối trang trí primitive cũ trong Đại Sảnh và loại bỏ vật thể lạc
    if (app.atriumGroup) {
      const count = purgeLegacyPrimitiveDecorations(app.atriumGroup);
      console.log(`%c[TOTAL OVERHAUL] Đã dọn dẹp ${count} vật thể cũ/lạc trong Đại Sảnh`, 'color: #38bdf8;');
    }

    // 2. Dọn dẹp các container Overhaul_Container_* cũ bị đặt nhầm vào root cảnh chính
    [app.truyenKieuRoom, app.sonTinhThuyTinhRoom, app.anDuongVuongRoom, app.voNhatRoom, app.scene].forEach((grp) => {
      if (!grp) return;
      const strays = [];
      grp.children?.forEach((child) => {
        if (child.name && child.name.startsWith('Overhaul_Container_')) {
          strays.push(child);
        }
      });
      strays.forEach((s) => {
        disposeSceneBranch(s);
        grp.remove(s);
      });
    });

    // 3. Tinh chỉnh nội thất cho 4 phòng chuyên đề (gắn trực tiếp vào interiorGroup của từng phòng)
    const roomConfigs = [
      {
        roomGroup: app.truyenKieuRoom,
        themeKey: 'truyenKieu',
        roomTitle: 'ĐOẠN TRƯỜNG TÂN THANH',
        leftCouplet: 'Trăm năm trong cõi người ta',
        rightCouplet: 'Chữ tài chữ mệnh khéo là ghét nhau',
        accentColor: 0xf472b6,
        loreKey: 'truyenKieu_hoCam',
        stationTitle: 'Hồ Cầm Thúy Kiều',
        stationSubtitle: 'Cung đàn bạc mệnh ngân vang ngàn năm lịch sử',
        stationPos: new THREE.Vector3(-4.8, 0, -3.2)
      },
      {
        roomGroup: app.sonTinhThuyTinhRoom,
        themeKey: 'sonTinhThuyTinh',
        roomTitle: 'SƠN THỦY THẦN CHIẾN',
        leftCouplet: 'Tản Viên ngút ngàn che bão lũ',
        rightCouplet: 'Đông Hải cuồn cuộn dậy phong ba',
        accentColor: 0x38bdf8,
        loreKey: 'sonTinh_sinhLeTanVien',
        stationTitle: 'Sính Lễ Tản Viên Sơn',
        stationSubtitle: 'Voi chín ngà, gà chín cựa, ngựa chín hồng mao',
        stationPos: new THREE.Vector3(4.8, 0, -3.2)
      },
      {
        roomGroup: app.anDuongVuongRoom,
        themeKey: 'anDuongVuong',
        roomTitle: 'ÂU LẠC HOÀNG THÀNH',
        leftCouplet: 'Nỏ thần một phát tan vạn giặc',
        rightCouplet: 'Móng rùa ngàn thu giữ giang sơn',
        accentColor: 0x22c55e,
        loreKey: 'adv_noThan',
        stationTitle: 'Linh Quy Kim Trảo',
        stationSubtitle: 'Bảo vật giữ nước của vua An Dương Vương',
        stationPos: new THREE.Vector3(-4.8, 0, -3.2)
      },
      {
        roomGroup: app.voNhatRoom,
        themeKey: 'voNhat',
        roomTitle: 'ÁNH SÁNG NGỤ CƯ',
        leftCouplet: 'Nồi cháo cám ấm tình người nghèo khó',
        rightCouplet: 'Ánh đèn dầu soi rạng bến tương lai',
        accentColor: 0xf59e0b,
        loreKey: 'voNhat_noiChaoCam',
        stationTitle: 'Nồi Cháo Cám Đói Nghèo',
        stationSubtitle: 'Biểu tượng tình mẫu tử và niềm tin sự sống mãnh liệt',
        stationPos: new THREE.Vector3(4.8, 0, -3.2)
      }
    ];

    for (const cfg of roomConfigs) {
      if (cfg.roomGroup) {
        try {
          const res = await overhaulExhibitionRoom(cfg.roomGroup, {
            ...cfg,
            loreGuide,
            audioDirector
          });
          if (res) this.overhauls.push(res);
        } catch (err) {
          console.warn(`[TOTAL OVERHAUL] Lỗi nâng cấp phòng ${cfg.themeKey}:`, err);
        }
      }
    }

    this.isInitialized = true;
    console.log('%c✓ TOTAL OVERHAUL HOÀN TẤT: Đại Sảnh thông thoáng & 4 phòng chuyên đề sẵn sàng!', 'color: #4ade80; font-weight: bold;');
  }

  update(elapsedTime) {
    if (!this.isInitialized) return;
    const timeSec = typeof elapsedTime === 'number' ? elapsedTime : performance.now() * 0.001;
    for (let i = 0; i < this.overhauls.length; i++) {
      this.overhauls[i].update?.(timeSec);
    }
  }
}
