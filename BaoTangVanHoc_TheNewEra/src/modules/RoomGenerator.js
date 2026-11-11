import * as THREE from 'three';
import { LITERATURE_REGISTRY } from '../config/literatureRegistry.js';
import { registerInteractiveBook } from './PortalInteraction.js';
import { 
  getFakeShadowMaterial, 
  getFakeGlowSpriteMaterial, 
  getLightBeamMaterial, 
  getFloorLightPoolMaterial 
} from './proceduralMaterials.js';

/**
 * ROOM GENERATOR MODULE: KIẾN TRÚC TIỂU CẢNH VĂN HỌC (THEMATIC DIORAMA ENGINE)
 * Lead Architect & Art Director WebGL Specification
 * 
 * 1. Mở rộng diện tích bệ trưng bày thành đài tiểu cảnh quy mô lớn (5.0m x 4.0m x 0.28m)
 * 2. Phân hóa chất liệu sàn tiểu cảnh theo 3 tầng văn học:
 *    - TẦNG 1: Đất nung / Sỏi rêu cổ đại (Terracotta & Moss Stone)
 *    - TẦNG 2: Gỗ trắc cổ sơn mài Indochine (Antique Rosewood Parquet)
 *    - TẦNG 3: Nền gạch vỡ / Xi măng thời chiến (Fractured Vintage Brick)
 * 3. Ánh sáng cục bộ (Localized Mood Lighting):
 *    - Mỗi tiểu cảnh gắn 1 PointLight và 1 SpotLight mang đúng dải màu atmosphere.primaryColor
 *    - Giới hạn phạm vi chiếu rọi không làm ảnh hưởng ánh sáng chung của sảnh chính
 * 4. Tối ưu cự ly & Hiệu năng 60 FPS (Proximity Streaming LOD):
 *    - Tự động điều tiết độ sáng đèn cục bộ khi camera cách xa > 25m
 */

// Tọa độ tâm 5 gian hiên mở trên mỗi tầng (Tây-Nam, Tây-Bắc, Bắc-Đại Gian, Đông-Bắc, Đông-Nam)

// Danh sách các phòng đã được thiết kế kiến trúc và vách ngăn độc lập hoàn toàn
export const CUSTOM_ROOM_IDS = new Set([
  'truyen_kieu',
  'thanh_giong',
  'son_tinh_thuy_tinh',
  'nam_quoc_son_ha',
  'an_duong_vuong',
  'vo_nhat',
  'tat_den'
]);

export const ALCOVE_CENTERS = [
  { x: -48.0, z: 19.0,  name: 'Tây-Nam',       rotY: Math.PI * 0.5 },
  { x: -48.0, z: -19.0, name: 'Tây-Bắc',       rotY: Math.PI * 0.5 },
  { x: 0.0,   z: -48.0, name: 'Bắc - Đại Gian', rotY: 0.0 },
  { x: 48.0,  z: -19.0, name: 'Đông-Bắc',      rotY: -Math.PI * 0.5 },
  { x: 48.0,  z: 19.0,  name: 'Đông-Nam',      rotY: -Math.PI * 0.5 }
];

export class RoomGenerator {
  constructor(materialLibrary = null) {
    this.matLib = materialLibrary;
    this.group = new THREE.Group();
    this.group.name = "Fifteen_Literature_Dioramas_Generator";

    this.books = [];
    this.interactiveBookMeshes = [];
    this.dioramaRooms = [];
    this.localizedLights = [];

    try {
      this.initAlcovePartitionWalls();
      this.initInstancedPedestals();
      this.initMagicBooks();
      this.initLocalizedMoodLighting();

      console.log("%c✓ RoomGenerator initialized • 15 Thematic Diorama Alcoves & Partition Walls Ready!", "color: #39e58c; font-weight: bold;");
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo RoomGenerator:", err);
    }
  }

  getMat(name) {
    return this.matLib?.get?.(name) ?? new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.FrontSide
    });
  }

  prepareGeometry(geo) {
    if (!geo) return;
    try {
      geo.computeVertexNormals?.();
      geo.computeBoundingBox?.();
      geo.computeBoundingSphere?.();

      ['position', 'normal', 'uv'].forEach(attrName => {
        const attr = geo.attributes?.[attrName];
        if (attr?.array) {
          let dirty = false;
          for (let i = 0; i < attr.array.length; i++) {
            if (!Number.isFinite(attr.array[i])) {
              attr.array[i] = attrName === 'normal' && (i % 3 === 1) ? 1.0 : 0.0;
              dirty = true;
            }
          }
          if (dirty) attr.needsUpdate = true;
        }
      });
    } catch (err) {
      console.warn("[SELF-HEALING] Geometry preparation error:", err);
    }
  }

  /**
   * Tính toán tọa độ không gian 3D của tác phẩm dựa trên floor (1,2,3) và roomIndex (0..4)
   */
  calculateItemPosition(item) {
    const alcove = ALCOVE_CENTERS[item.roomIndex] || ALCOVE_CENTERS[0];
    const floorElevation = (item.floor - 1) * 10.0; // Tầng 1: 0m, Tầng 2: 10m, Tầng 3: 20m
    return {
      x: alcove.x,
      y: floorElevation,
      z: alcove.z,
      rotY: alcove.rotY ?? 0
    };
  }

  /**
   * 1. DỰNG VÁCH NGĂN CHIA CẮT ĐẠI SẢNH (MASSIVE PARTITION WALLS)
   * - Hủy bỏ hoàn toàn mô hình "Ki-ốt mini" cụt ngủn 3 mặt tường.
   * - Vách ngăn mang kích thước kiến trúc vĩ mô:
   *   + Chiều cao chạm trần: Height = 8.0m
   *   + Chiều sâu đâm thẳng từ mép lan can sảnh ra vách đá/background: Depth = 20.0m
   *   + Độ dày vách: Width = 0.5m
   * - Phân bổ hướng tâm (Radial placement): Cắt dọc đại sảnh thành các đại gian không gian khổng lồ (rộng 26m)
   * - Sàn phòng chính là toàn bộ mặt sàn đại sảnh nằm kẹp giữa 2 vách ngăn lớn.
   */
  initAlcovePartitionWalls() {
    // ProceduralArchitecture.buildFifteenOpenPavilions() đã dựng đầy đủ tường ngăn kiến trúc cho cả 15 phòng.
    // Chỉ giữ cachedWallColliders dạng toán học để không tạo thêm 48 mesh tường trùng lặp gây overdraw & draw calls.
    this.cachedWallColliders = [];

    LITERATURE_REGISTRY.forEach((item) => {
      if (CUSTOM_ROOM_IDS.has(item.id)) return;
      const pos = this.calculateItemPosition(item);
      const rotY = pos.rotY !== undefined ? pos.rotY : Math.atan2(pos.x, pos.z);
      const cosR = Math.cos(rotY);
      const sinR = Math.sin(rotY);

      [-13.0, 13.0].forEach((localX, sideIdx) => {
        const localZ = -3.0;
        const wx = pos.x + localX * cosR + localZ * sinR;
        const wz = pos.z - localX * sinR + localZ * cosR;
        const isRot = Math.abs(sinR) > 0.707;
        const halfX = isRot ? 10.0 : 0.425;
        const halfZ = isRot ? 0.425 : 10.0;
        const box = new THREE.Box3(
          new THREE.Vector3(wx - halfX, pos.y, wz - halfZ),
          new THREE.Vector3(wx + halfX, pos.y + 8.0, wz + halfZ)
        );
        const center = new THREE.Vector3(wx, pos.y + 4.0, wz);
        this.cachedWallColliders.push({
          name: `Massive_Alcove_${sideIdx === 0 ? 'Left' : 'Right'}Wall_${item.id}`,
          isMesh: false,
          visible: true,
          userData: { worldAABB: box, center }
        });
      });
    });
  }

  /**
   * 2. KHỞI TẠO 15 BỆ ĐÁ CẨM THẠCH TRẮNG TRÊN SÀN BẢO TÀNG (THREE.InstancedMesh)
   */
  initInstancedPedestals() {
    const pedestalGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.95, 16);
    this.prepareGeometry(pedestalGeo);

    const marbleMat = this.getMat('whiteMarble');
    const totalPedestals = LITERATURE_REGISTRY.length;
    const instancedPedestals = new THREE.InstancedMesh(pedestalGeo, marbleMat, totalPedestals);
    instancedPedestals.name = "Instanced_Marble_Pedestals_15Rooms";
    instancedPedestals.frustumCulled = true;
    instancedPedestals.castShadow = false; // Tối ưu hóa: Không đổ bóng bệ sách
    instancedPedestals.receiveShadow = false;
    instancedPedestals.matrixAutoUpdate = false;

    const dummy = new THREE.Object3D();
    const nonCustomPositions = [];

    LITERATURE_REGISTRY.forEach((item, idx) => {
      const pos = this.calculateItemPosition(item);
      // Đặt bệ đá trực tiếp trên sàn bảo tàng (đáy tại pos.y, tâm Y = pos.y + 0.475m)
      dummy.position.set(pos.x, pos.y + 0.475, pos.z);
      dummy.rotation.set(0, 0, 0);

      if (CUSTOM_ROOM_IDS.has(item.id)) {
        dummy.scale.set(0, 0, 0);
      } else {
        dummy.scale.set(1, 1, 1);
        nonCustomPositions.push(pos);
      }
      dummy.updateMatrix();

      instancedPedestals.setMatrixAt(idx, dummy.matrix);
    });

    instancedPedestals.instanceMatrix.needsUpdate = true;
    instancedPedestals.computeBoundingBox();
    instancedPedestals.computeBoundingSphere();
    instancedPedestals.updateMatrix();

    this.group.add(instancedPedestals);

    // BÓNG ĐỔ GIẢ LẬP & VỆT SÁNG DƯỚI CHÂN CÁC BỆ TRƯNG BÀY (INSTANCED MESH - 2 DRAW CALLS)
    if (nonCustomPositions.length > 0) {
      const pedestalShadowGeo = new THREE.PlaneGeometry(2.6, 2.6);
      pedestalShadowGeo.rotateX(-Math.PI / 2);
      this.prepareGeometry(pedestalShadowGeo);
      const shadowMat = this.matLib?.get?.('fakeShadow') ?? getFakeShadowMaterial();

      const pedestalLightPoolGeo = new THREE.PlaneGeometry(3.6, 3.6);
      pedestalLightPoolGeo.rotateX(-Math.PI / 2);
      this.prepareGeometry(pedestalLightPoolGeo);
      const poolMat = this.matLib?.get?.('floorLightPool') ?? getFloorLightPoolMaterial();

      const shadowInst = new THREE.InstancedMesh(pedestalShadowGeo, shadowMat, nonCustomPositions.length);
      shadowInst.name = "Instanced_Pedestal_Shadows";
      shadowInst.frustumCulled = true;
      shadowInst.renderOrder = 1;
      shadowInst.matrixAutoUpdate = false;

      const poolInst = new THREE.InstancedMesh(pedestalLightPoolGeo, poolMat, nonCustomPositions.length);
      poolInst.name = "Instanced_Pedestal_LightPools";
      poolInst.frustumCulled = true;
      poolInst.renderOrder = 2;
      poolInst.matrixAutoUpdate = false;

      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      nonCustomPositions.forEach((pos, idx) => {
        dummy.position.set(pos.x, pos.y + 0.012, pos.z);
        dummy.updateMatrix();
        shadowInst.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(pos.x, pos.y + 0.015, pos.z);
        dummy.updateMatrix();
        poolInst.setMatrixAt(idx, dummy.matrix);
      });

      shadowInst.instanceMatrix.needsUpdate = true;
      shadowInst.computeBoundingBox();
      shadowInst.computeBoundingSphere();
      shadowInst.updateMatrix();

      poolInst.instanceMatrix.needsUpdate = true;
      poolInst.computeBoundingBox();
      poolInst.computeBoundingSphere();
      poolInst.updateMatrix();

      this.group.add(shadowInst, poolInst);
    }
  }

  /**
   * 4. KHỞI TẠO 15 CUỐN SÁCH MA THUẬT VỚI MÀU SẮC THEMECOLOR VÀ NHỊP ĐỘ BAY ĐỘC LẬP
   */
  initMagicBooks() {
    const bookCoverGeo = new THREE.BoxGeometry(0.82, 0.16, 1.12);
    this.prepareGeometry(bookCoverGeo);

    const bookPagesGeo = new THREE.BoxGeometry(0.74, 0.12, 1.02);
    this.prepareGeometry(bookPagesGeo);

    const pagesMat = new THREE.MeshLambertMaterial({ color: 0xf5f2eb, side: THREE.FrontSide });

    const goldRibMat = this.getMat('royalGold');

    LITERATURE_REGISTRY.forEach((item, idx) => {
      // BỎ HOÀN TOÀN MÔ HÌNH NHÁP (THANH XANH LÁ) CHO PHÒNG 01 TRUYỆN KIỀU
      // Phòng 01 được quản lý 100% bằng RoomDecorator với model .glb thật 1:1
      if (CUSTOM_ROOM_IDS.has(item.id)) {
        return;
      }

      const pos = this.calculateItemPosition(item);
      const bookGroup = new THREE.Group();
      bookGroup.name = `MagicBook_${item.id}`;

      // Vị trí bay lơ lửng trên bệ đá / án thư (mặt bệ Y = floor + 0.95m, sách bay tại Y = floor + 1.55m)
      const baseHoverY = pos.y + 1.55;
      bookGroup.position.set(pos.x, baseHoverY, pos.z);

      const coverMat = new THREE.MeshLambertMaterial({ color: item.themeColor, side: THREE.FrontSide });

      const coverMesh = new THREE.Mesh(bookCoverGeo, coverMat);
      coverMesh.castShadow = false; // Tối ưu hóa: Không đổ bóng bìa sách
      coverMesh.receiveShadow = false;
      coverMesh.frustumCulled = true;
      bookGroup.add(coverMesh);

      const pagesMesh = new THREE.Mesh(bookPagesGeo, pagesMat);
      pagesMesh.position.x = 0.02;
      pagesMesh.frustumCulled = true;
      pagesMesh.castShadow = false;
      bookGroup.add(pagesMesh);

      const ribGeo = new THREE.BoxGeometry(0.04, 0.18, 1.14);
      this.prepareGeometry(ribGeo);
      const ribMesh = new THREE.Mesh(ribGeo, goldRibMat);
      ribMesh.position.x = -0.41;
      ribMesh.frustumCulled = true;
      ribMesh.castShadow = false;
      bookGroup.add(ribMesh);

      bookGroup.rotation.x = Math.PI / 7.2;

      // Quầng sáng giả lập siêu nhẹ quanh sách ma thuật (Fake Glow Sprite)
      const glowMat = this.matLib?.get?.('fakeGlowSprite') ?? getFakeGlowSpriteMaterial();
      const bookGlow = new THREE.Sprite(glowMat);
      bookGlow.name = `MagicBook_Glow_${item.id}`;
      bookGlow.position.set(0, 0, 0);
      bookGlow.scale.set(1.8, 1.8, 1.0);
      bookGlow.frustumCulled = true;
      bookGroup.add(bookGlow);

      // Dữ liệu tương tác raycasting
      coverMesh.userData.literatureData = item;
      coverMesh.userData.portalMetadata = {
        id: item.id,
        title: item.name,
        author: item.author,
        genre: item.era,
        quote: item.quote,
        portalReady: item.portalReady,
        themeColor: item.themeColor,
        floor: item.floor,
        roomIndex: item.roomIndex
      };

      this.interactiveBookMeshes.push(coverMesh);

      if (CUSTOM_ROOM_IDS.has(item.id)) {
        bookGroup.traverse(c => {
          c.layers.enable(1);
        });
      }

      this.books.push({
        group: bookGroup,
        mesh: coverMesh,
        baseY: baseHoverY,
        floatSpeed: 1.35 + (idx % 5) * 0.22,
        phase: (idx * 1.38) % (Math.PI * 2),
        rotSpeed: 0.22 + (idx % 3) * 0.08,
        bobbingAmp: 0.05 + (idx % 4) * 0.012
      });

      this.group.add(bookGroup);
    });
  }

  /**
   * 5. ÁNH SÁNG CỤC BỘ (LOCALIZED MOOD LIGHTING): 1 POINTLIGHT & 1 SPOTLIGHT CHO MỖI TIỂU CẢNH
   */
  initLocalizedMoodLighting() {
    const lightsGroup = new THREE.Group();
    lightsGroup.name = "Diorama_Localized_Mood_Lights_Group";
    this.lightsGroup = lightsGroup;

    LITERATURE_REGISTRY.forEach((item) => {
      // Bỏ qua Phòng 01 vì RoomDecorator đã quản lý hệ sinh thái ánh sáng cô lập Layer 1
      if (CUSTOM_ROOM_IDS.has(item.id)) return;

      const pos = this.calculateItemPosition(item);
      const atmos = item.atmosphere || {};
      const primaryColor = atmos.primaryColor ?? item.themeColor ?? 0xffd700;
      const baseIntensity = atmos.lightIntensity ?? 2.0;

      // 1. PointLight tỏa sáng dịu mát quanh đài tiểu cảnh
      const pointLight = new THREE.PointLight(primaryColor, baseIntensity * 0.85, 7.5, 2.0);
      pointLight.name = `Diorama_PointLight_${item.id}`;
      pointLight.position.set(pos.x, pos.y + 1.6, pos.z);
      lightsGroup.add(pointLight);

      // 2. SpotLight rọi nghệ thuật tập trung từ trần xuống đài tiểu cảnh
      const spotLight = new THREE.SpotLight(
        primaryColor,
        baseIntensity * 1.4,
        11.0,
        Math.PI / 4.2,
        0.55,
        1.8
      );
      spotLight.name = `Diorama_SpotLight_${item.id}`;
      spotLight.position.set(pos.x, pos.y + 5.2, pos.z);

      const spotTarget = new THREE.Object3D();
      spotTarget.position.set(pos.x, pos.y + 0.3, pos.z);
      lightsGroup.add(spotTarget);
      spotLight.target = spotTarget;
      lightsGroup.add(spotLight);

      this.localizedLights.push({
        roomId: item.id,
        center: new THREE.Vector3(pos.x, pos.y, pos.z),
        pointLight,
        spotLight,
        basePointIntensity: baseIntensity * 0.85,
        baseSpotIntensity: baseIntensity * 1.4,
        currentPointIntensity: baseIntensity * 0.85,
        currentSpotIntensity: baseIntensity * 1.4
      });
    });

    this.group.add(lightsGroup);
  }

  /**
   * Kết nối toàn bộ 15 sách vào danh sách tương tác của PortalInteraction
   */
  registerWithPortal(portalInteraction) {
    if (!portalInteraction) return;

    this.interactiveBookMeshes.forEach(mesh => {
      const meta = mesh.userData.portalMetadata || {};
      const pos = new THREE.Vector3();
      mesh.getWorldPosition(pos);
      const targetCoords = new THREE.Vector3(pos.x, pos.y + 150.0, pos.z);

      registerInteractiveBook(mesh, targetCoords, {
        ...meta,
        themeColor: meta.themeColor || 0xffd700,
        portalReady: meta.portalReady !== false
      });
    });

    console.log(`%c[ROOM GENERATOR] Đã kết nối ${this.interactiveBookMeshes.length} cuốn sách vào hệ thống Interactive Book!`, "color: #39e58c; font-weight: bold;");
  }

  /**
   * Lấy mesh của cuốn sách Truyện Kiều (Phòng mẫu 01)
   */
  getTruyenKieuBookMesh() {
    const item = this.interactiveBookMeshes.find(m => m.userData?.portalMetadata?.id === 'truyen_kieu');
    return item || this.interactiveBookMeshes[0] || null;
  }

  /**
   * Cập nhật hoạt ảnh bay lơ lửng và điều tiết ánh sáng theo cự ly camera (Proximity Streaming)
   */
  update(delta = 0.016, elapsedTime = 0, camera = null) {
    if (!this.group.visible) return;

    const camPos = camera?.position;

    // 1. Cập nhật hoạt ảnh sách bay kết hợp Distance Culling (dùng distanceToSquared tránh Math.sqrt)
    const maxBookDistSq = 4900.0; // 70m * 70m
    for (let i = 0; i < this.books.length; i++) {
      const b = this.books[i];
      if (camPos) {
        const distSq = camPos.distanceToSquared(b.group.position);
        const vis = distSq < maxBookDistSq;
        if (b.group.visible !== vis) b.group.visible = vis;
        if (!vis) continue;
      }
      const yOffset = Math.sin(elapsedTime * b.floatSpeed + b.phase) * b.bobbingAmp;
      b.group.position.y = b.baseY + yOffset;
      b.group.rotation.y += b.rotSpeed * delta;
    }

    // 2. Bỏ qua throttle đèn nếu initThreePointLighting đã gỡ toàn bộ đèn cục bộ khỏi atriumGroup
    if (!this.lightsGroup || this.lightsGroup.children.length === 0) return;

    this.lightThrottleTimer = (this.lightThrottleTimer || 0) + delta;
    if (this.lightThrottleTimer >= 0.35) {
      this.lightThrottleTimer = 0;
      for (let i = 0; i < this.localizedLights.length; i++) {
        const item = this.localizedLights[i];
        let inRange = true;
        if (camPos) {
          const distSq = (camPos.x - item.center.x) ** 2 + (camPos.z - item.center.z) ** 2;
          inRange = distSq < 2500.0; // 50m * 50m
        }
        if (item.pointLight && item.pointLight.visible !== inRange) {
          item.pointLight.visible = inRange;
        }
        if (item.spotLight && item.spotLight.visible !== inRange) {
          item.spotLight.visible = inRange;
        }
      }
    }
  }

  /**
   * LUÔN BẬT TOÀN BỘ ÁNH SÁNG TẤT CẢ CÁC PHÒNG (VÔ HIỆU HÓA PROXIMITY STREAMING)
   */
  setAllRoomsVisible(visible = true) {
    for (let i = 0; i < this.localizedLights.length; i++) {
      const item = this.localizedLights[i];
      if (item.pointLight) item.pointLight.visible = visible;
      if (item.spotLight) item.spotLight.visible = visible;
    }
  }

  /**
   * BẬT/TẮT ÁNH SÁNG CỦA TOÀN BỘ CÁC PHÒNG KHÁC (LUÔN GIỮ SÁNG ĐỂ KHÔNG MẤT CẢNH QUAN)
   */
  setAllOtherRoomsVisible(visible, exceptRoomId = null) {
    // Vô hiệu hóa việc tắt đèn: giữ toàn bộ các phòng luôn sáng rõ
    for (let i = 0; i < this.localizedLights.length; i++) {
      const item = this.localizedLights[i];
      if (item.pointLight) item.pointLight.visible = true;
      if (item.spotLight) item.spotLight.visible = true;
    }
  }

  /**
   * VÔ HIỆU HÓA PROXIMITY ZONE STREAMING:
   * Luôn bật đèn cho toàn bộ 15 phòng, không bao giờ tắt phòng nào.
   */
  updateActiveRoomByProximity(camPos) {
    for (let i = 0; i < this.localizedLights.length; i++) {
      const item = this.localizedLights[i];
      if (item.pointLight) item.pointLight.visible = true;
      if (item.spotLight) item.spotLight.visible = true;
    }
  }

  /**
   * GOM CÁC BỨC TƯỜNG CỐ ĐỊNH VÀ BỆ ĐÁ RIÊNG BIỆT VÀO HỆ THỐNG VA CHẠM
   * CẤM TUYỆT ĐỐI đưa mô hình trang trí, đèn lồng, cửa vòm hay composite InstancedMesh vào danh sách va chạm.
   */
  getCollisionObjects() {
    const collisionList = [...(this.cachedWallColliders || [])];

    // Thêm 14 bệ đá cẩm thạch độc lập cho 14 phòng còn lại (ôm sát kích thước bệ bán kính 0.95m, cao 0.95m)
    LITERATURE_REGISTRY.forEach((item) => {
      if (CUSTOM_ROOM_IDS.has(item.id)) return;
      const pos = this.calculateItemPosition(item);
      const pedestalBox = new THREE.Box3(
        new THREE.Vector3(pos.x - 0.95, pos.y, pos.z - 0.95),
        new THREE.Vector3(pos.x + 0.95, pos.y + 0.95, pos.z + 0.95)
      );
      collisionList.push({
        name: `pedestal_${item.id}`,
        isMesh: false,
        visible: true,
        userData: {
          worldAABB: pedestalBox,
          center: new THREE.Vector3(pos.x, pos.y + 0.475, pos.z)
        }
      });
    });

    return collisionList;
  }

  getGroup() {
    this.group.traverse((child) => {
      if (child.isMesh) {
        child.frustumCulled = true;
        child.castShadow = false;
        child.receiveShadow = false;
        if (child.geometry) {
          if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
          if (!child.geometry.boundingSphere) child.geometry.computeBoundingSphere();
        }
      }
    });
    return this.group;
  }
}

export default RoomGenerator;
