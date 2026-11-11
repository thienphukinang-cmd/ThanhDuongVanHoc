import * as THREE from 'three';

/**
 * ============================================================================
 * MUSEUM HITBOX & COLLISION ARCHITECT SYSTEM (MASTER OVERHAUL)
 * Ứng dụng kỹ năng: hitbox-collision-architect & fps-optimizer
 * - Tự động bọc Proxy Hitbox ôm sát mô hình .GLB để click chuẩn 100% không lọt khe
 * - Hệ thống 15 phòng triển lãm trên cả 3 tầng với cửa vòm đúng chuẩn thông thủy:
 *   + Cửa vòm cánh Đông/Tây rộng 6.2m
 *   + Đại môn cánh Bắc rộng 8.0m
 * - Hệ thống tường biên ngoại vi 125m x 125m (+-62.5m) với đại môn Nam tầng 1 rộng 12m
 * - 16 Cột trụ cung đình khổng lồ (bán kính ôm khít 0.50m)
 * - Lan can giếng trời tầng 2 & 3 quanh ô thông tầng 44m x 44m (+-22.0m)
 * - Lan can tay vịn uốn lượn Catmull-Rom bảo vệ toàn bộ cầu thang chữ Y & chiếu nghỉ
 * - Thuật toán va chạm trượt tường mượt mà (Continuous Wall Sliding) kèm cơ chế
 *   De-penetration AABB Pushout chống kẹt góc 100%
 * - Phân vùng đa cõi (Multi-Realm Separation: Museum, Truyện Kiều, Sơn Tinh, v.v.)
 * - Bấm phím [H] hoặc [F2] để Bật/Tắt khung dây Wireframe Debug kiểm tra Hitbox
 * ============================================================================
 */

let activeHitboxManagerInstance = null;

export function getMuseumHitboxManager(scene = null) {
  if (!activeHitboxManagerInstance && scene) {
    activeHitboxManagerInstance = new MuseumHitboxManager(scene);
  }
  return activeHitboxManagerInstance;
}

/**
 * Hàm tính toán bounding box ôm khít vật lý của một Object3D
 * Loại bỏ hoàn toàn đèn, camera, hạt particle, tia sáng god ray, sprite hào quang
 */
export function computeTightWorldBox(obj, minSize = 0.3) {
  if (!obj) return new THREE.Box3();
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3();
  let hasValidMesh = false;

  obj.traverse((child) => {
    if (!child.isMesh) return;
    if (child.isLight || child.isPoints || child.isSprite) return;

    const name = (child.name || '').toLowerCase();
    // Bỏ qua các vệt sáng hoặc hào quang dạng mesh
    if (name.includes('ray') || name.includes('beam') || name.includes('halo') || name.includes('godray') || name.includes('lightpool')) {
      return;
    }
    // Bỏ qua các mesh bị ẩn hoặc gắn cờ ignoreRaycaster mà không phải hiện vật
    if (child.visible === false) return;

    if (child.geometry) {
      if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
      const geomBox = child.geometry.boundingBox;
      if (geomBox && !geomBox.isEmpty()) {
        const meshWorldBox = geomBox.clone().applyMatrix4(child.matrixWorld);
        const sz = new THREE.Vector3();
        meshWorldBox.getSize(sz);
        // Tránh bounding box dị biệt (như skybox hay mặt phẳng vô cực)
        if (sz.x < 35.0 && sz.y < 35.0 && sz.z < 35.0) {
          box.union(meshWorldBox);
          hasValidMesh = true;
        }
      }
    }
  });

  if (!hasValidMesh || box.isEmpty()) {
    const fallbackPos = new THREE.Vector3();
    obj.getWorldPosition(fallbackPos);
    box.set(
      new THREE.Vector3(fallbackPos.x - minSize * 0.5, fallbackPos.y, fallbackPos.z - minSize * 0.5),
      new THREE.Vector3(fallbackPos.x + minSize * 0.5, fallbackPos.y + minSize, fallbackPos.z + minSize * 0.5)
    );
  }

  return box;
}

export class MuseumHitboxManager {
  constructor(scene) {
    this.scene = scene;
    this.solidBoxes = [];       // Danh sách Box3 chặn người chơi đi xuyên qua
    this.realmBuckets = new Map(); // Phân vùng theo Realm
    this._museumGrid = new Map();  // Spatial hash (Y tier + 20m XZ cell) cho museum
    this._candidateBoxes = [];     // Scratch array tái sử dụng mỗi frame
    this._queryStamp = 0;
    this.clickProxies = [];     // Danh sách Mesh hộp vô hình dùng để bắt click tương tác
    this.debugHelperSpecs = new Map(); // Lưu thông số Box3Helper để khởi tạo lười khi bật debug [H]/[F2]
    this.debugHelpers = new THREE.Group();
    this.debugHelpers.name = 'Museum_Hitbox_Debug_Helpers';
    this.debugHelpers.visible = false;
    this.scene.add(this.debugHelpers);

    activeHitboxManagerInstance = this;
    if (typeof window !== 'undefined') {
      window.__museumHitboxManager = this;
      window.hitboxManager = this;
    }

    this._bindDebugShortcut();
  }

  _getMuseumTier(y) {
    if (y < 9.0) return 0;
    if (y < 18.0) return 1;
    if (y < 30.0) return 2;
    return 3;
  }

  _getMuseumCellKey(tier, cx, cz) {
    const clampedX = Math.max(-511, Math.min(511, cx)) + 512;
    const clampedZ = Math.max(-511, Math.min(511, cz)) + 512;
    return ((tier & 7) << 20) | (clampedX << 10) | clampedZ;
  }

  _indexSolidEntry(entry) {
    const realm = entry.realm || 'museum';
    let realmList = this.realmBuckets.get(realm);
    if (!realmList) {
      realmList = [];
      this.realmBuckets.set(realm, realmList);
    }
    realmList.push(entry);

    if (realm === 'museum') {
      const b = entry.box;
      const minTier = this._getMuseumTier(b.min.y);
      const maxTier = this._getMuseumTier(b.max.y);
      const minCx = Math.max(-511, Math.min(511, Math.floor((b.min.x - 1.0) / 20.0)));
      const maxCx = Math.max(-511, Math.min(511, Math.floor((b.max.x + 1.0) / 20.0)));
      const minCz = Math.max(-511, Math.min(511, Math.floor((b.min.z - 1.0) / 20.0)));
      const maxCz = Math.max(-511, Math.min(511, Math.floor((b.max.z + 1.0) / 20.0)));

      const keys = [];
      for (let t = minTier; t <= maxTier; t++) {
        for (let cx = minCx; cx <= maxCx; cx++) {
          for (let cz = minCz; cz <= maxCz; cz++) {
            const key = this._getMuseumCellKey(t, cx, cz);
            let cell = this._museumGrid.get(key);
            if (!cell) {
              cell = [];
              this._museumGrid.set(key, cell);
            }
            cell.push(entry);
            keys.push(key);
          }
        }
      }
      entry._bucketKeys = keys;
    }
  }

  _unindexSolidEntry(entry) {
    if (!entry) return;
    const realm = entry.realm || 'museum';
    const realmList = this.realmBuckets.get(realm);
    if (realmList) {
      const rIdx = realmList.indexOf(entry);
      if (rIdx !== -1) realmList.splice(rIdx, 1);
    }
    if (entry._bucketKeys) {
      for (let i = 0; i < entry._bucketKeys.length; i++) {
        const cell = this._museumGrid.get(entry._bucketKeys[i]);
        if (cell) {
          const cIdx = cell.indexOf(entry);
          if (cIdx !== -1) cell.splice(cIdx, 1);
        }
      }
      entry._bucketKeys = null;
    }
  }

  _setDebugHelperSpec(name, box, color, realm) {
    this.debugHelperSpecs.set(name, { box, color, realm });
    if (this.debugHelpers.visible) {
      const old = this.debugHelpers.getObjectByName(name);
      if (old) {
        this.debugHelpers.remove(old);
        old.geometry?.dispose?.();
        old.material?.dispose?.();
      }
      const helper = new THREE.Box3Helper(box, color);
      helper.name = name;
      this.debugHelpers.add(helper);
    }
  }

  _removeDebugHelper(name) {
    this.debugHelperSpecs.delete(name);
    const old = this.debugHelpers.getObjectByName(name);
    if (old) {
      this.debugHelpers.remove(old);
      old.geometry?.dispose?.();
      old.material?.dispose?.();
    }
  }

  _bindDebugShortcut() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        return;
      }
      if (e.key === 'h' || e.key === 'H' || e.key === 'F2') {
        this.toggleDebugWireframes();
      }
    });
  }

  /**
   * Bật/Tắt hiển thị toàn bộ Hitbox trong bảo tàng
   * - Xanh lá (#22c55e): Tường, vách ngăn, cột trụ, bệ đá
   * - Vàng kim (#fde047): Hộp click tương tác sách/hiện vật
   * - Xanh lơ (#06b6d4): Lan can cầu thang & cửa ra vào
   */
  toggleDebugWireframes(forceState = null) {
    this.debugHelpers.visible =
      forceState !== null ? forceState : !this.debugHelpers.visible;
    const isVisible = this.debugHelpers.visible;

    // Khởi tạo lười các Box3Helper chỉ khi người dùng bật [H] hoặc [F2]
    if (isVisible) {
      this.debugHelperSpecs.forEach((spec, name) => {
        if (!this.debugHelpers.getObjectByName(name)) {
          const helper = new THREE.Box3Helper(spec.box, spec.color);
          helper.name = name;
          this.debugHelpers.add(helper);
        }
      });
    }

    console.log(
      `%c[Hitbox Architect] Hiển thị khung Hitbox Debug: ${isVisible ? 'BẬT' : 'TẮT'} (Phím H/F2)`,
      `color: ${isVisible ? '#22c55e' : '#f59e0b'}; font-weight: bold; font-size: 13px;`
    );

    this._showDebugToast(isVisible);
  }

  _showDebugToast(isVisible) {
    if (typeof document === 'undefined') return;
    let toast = document.getElementById('museum-hitbox-debug-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'museum-hitbox-debug-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 28px;
        right: 28px;
        padding: 12px 20px;
        background: rgba(15, 23, 42, 0.94);
        color: #f8fafc;
        border: 1px solid rgba(253, 224, 71, 0.6);
        border-radius: 10px;
        font-family: 'Segoe UI', system-ui, sans-serif;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.5px;
        z-index: 999999;
        pointer-events: none;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(8px);
        transition: opacity 0.35s ease, transform 0.35s ease;
      `;
      document.body.appendChild(toast);
    }

    if (isVisible) {
      toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 16px;">🛡️</span>
          <span>HITBOX DEBUG (Phím H / F2): <strong style="color: #22c55e;">BẬT</strong></span>
        </div>
        <div style="margin-top: 6px; font-size: 11px; color: #cbd5e1; display: flex; gap: 12px;">
          <span><span style="color: #22c55e;">🟩 Khung Xanh:</span> Vật cản đi bộ</span>
          <span><span style="color: #fde047;">🟨 Khung Vàng:</span> Click tương tác</span>
          <span><span style="color: #06b6d4;">🟦 Khung Lam:</span> Lan can & cửa</span>
        </div>
      `;
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
    } else {
      toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 16px;">🛡️</span>
          <span>HITBOX DEBUG (Phím H / F2): <strong style="color: #ef4444;">ĐÃ TẮT</strong></span>
        </div>
      `;
      toast.style.opacity = '1';
      toast.style.transform = 'translateY(0)';
      setTimeout(() => {
        if (!this.debugHelpers.visible && toast) {
          toast.style.opacity = '0';
          toast.style.transform = 'translateY(10px)';
        }
      }, 2200);
    }
  }

  /**
   * XÓA SẠCH VÀ TÁI THIẾT LẬP TOÀN DIỆN MỌI HITBOX TRONG BẢO TÀNG
   * Đảm bảo tính nhất quán tuyệt đối giữa kiến trúc WebGL và hệ thống va chạm.
   */
  rebuildAllMuseumHitboxes() {
    this.clearAllHitboxes();
    console.log(
      '%c[Hitbox Architect] Đang thiết lập toàn diện hệ sinh thái Hitbox chuẩn xác 100%...',
      'color: #38bdf8; font-weight: bold;'
    );

    const addWallBox = (minX, minY, minZ, maxX, maxY, maxZ, tag, helperColor = 0x22c55e, realm = 'museum') => {
      const box = new THREE.Box3(
        new THREE.Vector3(minX, minY, minZ),
        new THREE.Vector3(maxX, maxY, maxZ)
      );
      this.registerSolidObjectCollider(null, { customBox: box, tag, helperColor, realm });
    };

    // =========================================================================
    // 1. TƯỜNG BIÊN NGOẠI VI BẢO TÀNG (Outer Perimeter: 125m x 125m, +-62.5m)
    // =========================================================================
    // Cánh Tây (X = -62.5m) chạy dọc từ Z = -62.5 đến +62.5, cao 32m
    addWallBox(-63.0, 0.0, -62.5, -62.0, 32.0, 62.5, 'Perimeter_Wall_West');
    // Cánh Đông (X = +62.5m) chạy dọc từ Z = -62.5 đến +62.5, cao 32m
    addWallBox(62.0, 0.0, -62.5, 63.0, 32.0, 62.5, 'Perimeter_Wall_East');
    // Cánh Bắc (Z = -62.5m) chạy ngang từ X = -62.5 đến +62.5, cao 32m
    addWallBox(-62.5, 0.0, -63.0, 62.5, 32.0, -62.0, 'Perimeter_Wall_North');

    // Cánh Nam (Z = +62.5m):
    // - Tầng 1: Chừa ô đại môn đón khách rộng 12m tại X in [-6.0, 6.0]
    addWallBox(-62.5, 0.0, 62.0, -6.0, 10.0, 63.0, 'Perimeter_Wall_South_West_L1');
    addWallBox(6.0, 0.0, 62.0, 62.5, 10.0, 63.0, 'Perimeter_Wall_South_East_L1');
    // - Tầng 2 & 3: Lan can và tường kín từ X = -62.5 đến +62.5
    addWallBox(-62.5, 10.0, 62.0, 62.5, 32.0, 63.0, 'Perimeter_Wall_South_L2_L3');

    // =========================================================================
    // 2. HỆ THỐNG 15 PHÒNG TRIỂN LÃM (5 PHÒNG / TẦNG x 3 TẦNG)
    // Khớp 100% kiến trúc ProceduralArchitecture và LiteratureRegistry
    // =========================================================================
    const floors = [
      { id: 1, elevation: 0.0,  height: 9.8,  name: 'T1' },
      { id: 2, elevation: 10.0, height: 9.8,  name: 'T2' },
      { id: 3, elevation: 20.0, height: 11.8, name: 'T3' }
    ];

    floors.forEach((fl) => {
      const y = fl.elevation;
      const h = fl.height;
      const pfx = fl.name;

      // -----------------------------------------------------------------------
      // PHÒNG 0: CÁNH TÂY - NAM (idx 0, Tâm X = -48.0, Z = 19.0)
      // T1: Thánh Gióng | T2: Truyện Kiều | T3: Chí Phèo
      // Cửa vòm nhìn ra sảnh ở vách Đông tại X = -34.0, khe mở Z in [15.9, 22.1] (rộng 6.2m)
      // -----------------------------------------------------------------------
      // Vách Đông (Mặt tiền có cửa vòm)
      addWallBox(-34.25, y, 6.0, -33.75, y + h, 15.9, `${pfx}_WestSouth_Front_North`, 0x06b6d4);
      addWallBox(-34.25, y, 22.1, -33.75, y + h, 32.0, `${pfx}_WestSouth_Front_South`, 0x06b6d4);
      // Vách ngăn Bắc (Z = 6.0m)
      addWallBox(-62.0, y, 5.75, -34.0, y + h, 6.25, `${pfx}_WestSouth_Partition_North`);
      // Vách ngăn Nam (Z = 32.0m)
      addWallBox(-62.0, y, 31.75, -34.0, y + h, 32.25, `${pfx}_WestSouth_Partition_South`);
      // Vách hậu Tây (X = -62.0m)
      addWallBox(-62.25, y, 6.0, -61.75, y + h, 32.0, `${pfx}_WestSouth_Back_West`);

      // -----------------------------------------------------------------------
      // VÁCH BỊT HÀNH LANG TÂY GIỮA PHÒNG 0 VÀ PHÒNG 1 (X = -34.0, Z in [-6.0, 6.0])
      // -----------------------------------------------------------------------
      addWallBox(-34.25, y, -6.0, -33.75, y + h, 6.0, `${pfx}_West_Corridor_Infill`);

      // -----------------------------------------------------------------------
      // PHÒNG 1: CÁNH TÂY - BẮC (idx 1, Tâm X = -48.0, Z = -19.0)
      // T1: Sơn Tinh - Thủy Tinh | T2: Nam Quốc Sơn Hà | T3: Tắt Đèn
      // Cửa vòm nhìn ra sảnh ở vách Đông tại X = -34.0, khe mở Z in [-22.1, -15.9] (rộng 6.2m)
      // -----------------------------------------------------------------------
      addWallBox(-34.25, y, -32.0, -33.75, y + h, -22.1, `${pfx}_WestNorth_Front_North`, 0x06b6d4);
      addWallBox(-34.25, y, -15.9, -33.75, y + h, -6.0, `${pfx}_WestNorth_Front_South`, 0x06b6d4);
      addWallBox(-62.0, y, -6.25, -34.0, y + h, -5.75, `${pfx}_WestNorth_Partition_South`);
      addWallBox(-62.0, y, -32.25, -34.0, y + h, -31.75, `${pfx}_WestNorth_Partition_North`);
      addWallBox(-62.25, y, -32.0, -61.75, y + h, -6.0, `${pfx}_WestNorth_Back_West`);

      // -----------------------------------------------------------------------
      // PHÒNG 2: CÁNH BẮC - ĐẠI GIAN (idx 2, Tâm X = 0.0, Z = -48.0)
      // T1: An Dương Vương | T2: Hịch Tướng Sĩ | T3: Số Đỏ
      // Đại môn hướng Nam tại Z = -34.0, khe mở X in [-4.0, 4.0] (rộng 8.0m)
      // -----------------------------------------------------------------------
      // Vách Nam (Mặt tiền có cửa vòm lớn 8m)
      addWallBox(-22.0, y, -34.25, -4.0, y + h, -33.75, `${pfx}_NorthHall_Front_West`, 0x06b6d4);
      addWallBox(4.0, y, -34.25, 22.0, y + h, -33.75, `${pfx}_NorthHall_Front_East`, 0x06b6d4);
      // Vách ngăn Tây (X = -22.0m)
      addWallBox(-22.25, y, -62.0, -21.75, y + h, -34.0, `${pfx}_NorthHall_Partition_West`);
      // Vách ngăn Đông (X = +22.0m)
      addWallBox(21.75, y, -62.0, 22.25, y + h, -34.0, `${pfx}_NorthHall_Partition_East`);
      // Vách hậu Bắc (Z = -62.0m)
      addWallBox(-22.0, y, -62.25, 22.0, y + h, -61.75, `${pfx}_NorthHall_Back_North`);

      // -----------------------------------------------------------------------
      // PHÒNG 3: CÁNH ĐÔNG - BẮC (idx 3, Tâm X = 48.0, Z = -19.0)
      // T1: Sự Tích Trầu Cau | T2: Bình Ngô Đại Cáo | T3: Vợ Nhặt
      // Cửa vòm nhìn ra sảnh ở vách Tây tại X = 34.0, khe mở Z in [-22.1, -15.9] (rộng 6.2m)
      // -----------------------------------------------------------------------
      addWallBox(33.75, y, -32.0, 34.25, y + h, -22.1, `${pfx}_EastNorth_Front_North`, 0x06b6d4);
      addWallBox(33.75, y, -15.9, 34.25, y + h, -6.0, `${pfx}_EastNorth_Front_South`, 0x06b6d4);
      addWallBox(34.0, y, -6.25, 62.0, y + h, -5.75, `${pfx}_EastNorth_Partition_South`);
      addWallBox(34.0, y, -32.25, 62.0, y + h, -31.75, `${pfx}_EastNorth_Partition_North`);
      addWallBox(61.75, y, -32.0, 62.25, y + h, -6.0, `${pfx}_EastNorth_Back_East`);

      // -----------------------------------------------------------------------
      // VÁCH BỊT HÀNH LANG ĐÔNG GIỮA PHÒNG 3 VÀ PHÒNG 4 (X = 34.0, Z in [-6.0, 6.0])
      // -----------------------------------------------------------------------
      addWallBox(33.75, y, -6.0, 34.25, y + h, 6.0, `${pfx}_East_Corridor_Infill`);

      // -----------------------------------------------------------------------
      // PHÒNG 4: CÁNH ĐÔNG - NAM (idx 4, Tâm X = 48.0, Z = 19.0)
      // T1: Đẻ Đất Đẻ Nước | T2: Chuyện Người Con Gái Nam Xương | T3: Đây Thôn Vĩ Dạ
      // Cửa vòm nhìn ra sảnh ở vách Tây tại X = 34.0, khe mở Z in [15.9, 22.1] (rộng 6.2m)
      // -----------------------------------------------------------------------
      addWallBox(33.75, y, 6.0, 34.25, y + h, 15.9, `${pfx}_EastSouth_Front_North`, 0x06b6d4);
      addWallBox(33.75, y, 22.1, 34.25, y + h, 32.0, `${pfx}_EastSouth_Front_South`, 0x06b6d4);
      addWallBox(34.0, y, 5.75, 62.0, y + h, 6.25, `${pfx}_EastSouth_Partition_North`);
      addWallBox(34.0, y, 31.75, 62.0, y + h, 32.25, `${pfx}_EastSouth_Partition_South`);
      addWallBox(61.75, y, 6.0, 62.25, y + h, 32.0, `${pfx}_EastSouth_Back_East`);
    });

    // =========================================================================
    // 3. 16 CỘT CUNG ĐÌNH ĐẠI SẢNH (Hitbox tròn hóa nhỏ gọn, ôm sát thân cột)
    // =========================================================================
    const pillarHalf = 0.48; // Bán kính thân cột 0.50m (shrink nhẹ 4%)
    const pillarHeight = 32.0;
    const pillarPositions = [
      { x: -16.5, z: -22.0 }, { x: -5.5, z: -22.0 }, { x: 5.5, z: -22.0 }, { x: 16.5, z: -22.0 },
      { x: -16.5, z: 22.0 },  { x: -5.5, z: 22.0 },  { x: 5.5, z: 22.0 },  { x: 16.5, z: 22.0 },
      { x: -22.0, z: -5.5 },  { x: -22.0, z: 5.5 },
      { x: 22.0, z: -5.5 },   { x: 22.0, z: 5.5 },
      { x: -34.0, z: -34.0 }, { x: 34.0, z: -34.0 }, { x: -34.0, z: 34.0 }, { x: 34.0, z: 34.0 }
    ];

    pillarPositions.forEach((pos, idx) => {
      addWallBox(
        pos.x - pillarHalf, 0.0, pos.z - pillarHalf,
        pos.x + pillarHalf, pillarHeight, pos.z + pillarHalf,
        `Imperial_Pillar_${idx + 1}`
      );
    });

    // =========================================================================
    // 4. LAN CAN INDOCHINE GIẾNG TRỜI TẦNG 2 & TẦNG 3 (Dày 16cm, cao 1.1m)
    // =========================================================================
    // LAN CAN TẦNG 2 (Y: 10.0m -> 11.1m):
    // Cạnh Bắc: Chừa ô thông thủy X in [-2.82, 2.82] khớp khít bề rộng thang T2 -> T3 (5.4m + tay vịn)
    addWallBox(-22.0, 10.0, -22.08, -2.82, 11.1, -21.92, 'Balustrade_North_West_L2', 0x06b6d4);
    addWallBox(2.82, 10.0, -22.08, 22.0, 11.1, -21.92, 'Balustrade_North_East_L2', 0x06b6d4);
    // Cạnh Nam: Chạy suốt từ -22.0 đến 22.0
    addWallBox(-22.0, 10.0, 21.92, 22.0, 11.1, 22.08, 'Balustrade_South_L2', 0x06b6d4);
    // Cánh Tây: Chừa ô thông thủy Z in [13.65, 17.35] khớp khít tay vịn 2 bên vế thang cong T1 -> T2
    addWallBox(-22.08, 10.0, -22.0, -21.92, 11.1, 13.65, 'Balustrade_West_North_L2', 0x06b6d4);
    addWallBox(-22.08, 10.0, 17.35, -21.92, 11.1, 22.0, 'Balustrade_West_South_L2', 0x06b6d4);
    // Cánh Đông: Chừa ô thông thủy Z in [13.65, 17.35] khớp khít tay vịn 2 bên vế thang cong T1 -> T2
    addWallBox(21.92, 10.0, -22.0, 22.08, 11.1, 13.65, 'Balustrade_East_North_L2', 0x06b6d4);
    addWallBox(21.92, 10.0, 17.35, 22.08, 11.1, 22.0, 'Balustrade_East_South_L2', 0x06b6d4);

    // LAN CAN TẦNG 3 (Y: 20.0m -> 21.1m):
    addWallBox(-22.0, 20.0, -22.08, 22.0, 21.1, -21.92, 'Balustrade_North_L3', 0x06b6d4);
    addWallBox(-22.0, 20.0, 21.92, 22.0, 21.1, 22.08, 'Balustrade_South_L3', 0x06b6d4);
    // Cánh Tây & Đông mở khoảng thông thủy Z in [-17.35, -13.65] khớp khít vế thang T2 -> T3
    addWallBox(-22.08, 20.0, -22.0, -21.92, 21.1, -17.35, 'Balustrade_West_North_L3', 0x06b6d4);
    addWallBox(-22.08, 20.0, -13.65, -21.92, 21.1, 22.0, 'Balustrade_West_South_L3', 0x06b6d4);
    addWallBox(21.92, 20.0, -22.0, 22.08, 21.1, -17.35, 'Balustrade_East_North_L3', 0x06b6d4);
    addWallBox(21.92, 20.0, -13.65, 22.08, 21.1, 22.0, 'Balustrade_East_South_L3', 0x06b6d4);

    // =========================================================================
    // 5. LAN CAN TAY VỊN CẦU THANG CHỮ Y & CHIẾU NGHỈ
    // =========================================================================
    this.registerStaircaseBalustrades();

    // =========================================================================
    // 6. BỆ SÁCH DI SẢN TRUNG TÂM SẢNH (0, 0, 0)
    // =========================================================================
    const centerBookBox = new THREE.Box3(
      new THREE.Vector3(-1.8, 0.0, -1.8),
      new THREE.Vector3(1.8, 1.8, 1.8)
    );
    this.registerSolidObjectCollider(null, { customBox: centerBookBox, tag: 'Center_Heritage_Book_Platform' });

    console.log(
      `%c[Hitbox Architect] Hoàn tất: Đã kích hoạt ${this.solidBoxes.length} vật cản không gian chuẩn hóa O(1).`,
      'color: #22c55e; font-weight: bold;'
    );
  }

  /**
   * ĐĂNG KÝ HITBOX LAN CAN TAY VỊN CẦU THANG CHỮ Y & CHIẾU NGHỈ
   * Thiết kế lại hoàn chỉnh:
   * 1. Vế trung tâm thẳng theo trục Z: Ray/Box dọc mỏng 8cm đặt ngoài mép bậc (X = ±(halfW + 0.12m)),
   *    triệt tiêu 100% hiện tượng góc chéo AABB nhô vào lối đi.
   * 2. Vế cánh uốn cong (West & East): Mật độ cao 36 phân đoạn/vế, ôm khít theo CatmullRomCurve3,
   *    tự động cắt gọn chuẩn xác tại biên hành lang (|X| = 22.0m) đón tiếp nối mượt mà vào Tầng 2 & 3.
   * 3. Chiếu nghỉ tròn (Landing 1 & 2): Vòng cung 16 phân đoạn bảo vệ mép mở nhìn ra giếng trời trung tâm,
   *    đảm bảo lối chuyển hướng từ vế trung tâm rẽ sang 2 cánh thông thoáng 100%.
   */
  registerStaircaseBalustrades() {
    // -------------------------------------------------------------------------
    // HÀM TẠO VẬT CẢN LAN CAN VẾ THẲNG TRUNG TÂM (Trục Z)
    // -------------------------------------------------------------------------
    const registerStraightCentralFlight = (centerZ1, centerZ2, y1, y2, flightWidth, flightName, segments = 12) => {
      const halfW = flightWidth * 0.5;
      const railH = 1.05;
      const railThick = 0.08;
      const zMin = Math.min(centerZ1, centerZ2);
      const zMax = Math.max(centerZ1, centerZ2);
      const zStep = (zMax - zMin) / segments;
      const isReversed = centerZ1 > centerZ2;

      for (let i = 0; i < segments; i++) {
        const segZ1 = zMin + i * zStep;
        const segZ2 = zMin + (i + 1) * zStep;
        const u1 = isReversed ? (zMax - segZ1) / (zMax - zMin) : (segZ1 - zMin) / (zMax - zMin);
        const u2 = isReversed ? (zMax - segZ2) / (zMax - zMin) : (segZ2 - zMin) / (zMax - zMin);
        const segY1 = y1 + Math.min(u1, u2) * (y2 - y1);
        const segY2 = y1 + Math.max(u1, u2) * (y2 - y1);

        // Lan can mép Trái (X âm): Đặt tại X in [-(halfW + 0.16), -(halfW + 0.08)]
        const leftBox = new THREE.Box3(
          new THREE.Vector3(-(halfW + 0.16), segY1, segZ1),
          new THREE.Vector3(-(halfW + 0.08), segY2 + railH, segZ2)
        );
        this.registerSolidObjectCollider(null, {
          customBox: leftBox,
          tag: `StairRail_${flightName}_Left_s${i + 1}`,
          helperColor: 0x06b6d4
        });

        // Lan can mép Phải (X dương): Đặt tại X in [halfW + 0.08, halfW + 0.16]
        const rightBox = new THREE.Box3(
          new THREE.Vector3(halfW + 0.08, segY1, segZ1),
          new THREE.Vector3(halfW + 0.16, segY2 + railH, segZ2)
        );
        this.registerSolidObjectCollider(null, {
          customBox: rightBox,
          tag: `StairRail_${flightName}_Right_s${i + 1}`,
          helperColor: 0x06b6d4
        });
      }
    };

    // -------------------------------------------------------------------------
    // HÀM TẠO LAN CAN VẾ CÁNH UỐN LƯỢN (36 Phân đoạn / vế, mỏng 8cm)
    // -------------------------------------------------------------------------
    const registerCurvedWingFlight = (curvePoints, flightWidth, flightName, segmentsCount = 36, isWest = true) => {
      if (!curvePoints || curvePoints.length < 2) return;
      const curve = new THREE.CatmullRomCurve3(curvePoints);
      curve.curveType = 'centripetal';

      const halfW = flightWidth * 0.5;
      const railHeight = 1.05;
      const thickness = 0.08;

      [-1, 1].forEach((side) => {
        const sideName = side === -1 ? 'Left' : 'Right';
        for (let i = 0; i < segmentsCount; i++) {
          const u1 = i / segmentsCount;
          const u2 = (i + 1) / segmentsCount;

          const p1 = curve.getPoint(u1);
          const tan1 = curve.getTangent(u1);
          const norm1 = new THREE.Vector3(-tan1.z, 0, tan1.x).normalize();
          const pt1 = p1.clone().add(norm1.multiplyScalar(side * (halfW + 0.16)));

          const p2 = curve.getPoint(u2);
          const tan2 = curve.getTangent(u2);
          const norm2 = new THREE.Vector3(-tan2.z, 0, tan2.x).normalize();
          const pt2 = p2.clone().add(norm2.multiplyScalar(side * (halfW + 0.16)));

          let minX = Math.min(pt1.x, pt2.x) - thickness * 0.5;
          let maxX = Math.max(pt1.x, pt2.x) + thickness * 0.5;
          const minY = Math.min(pt1.y, pt2.y);
          const maxY = Math.max(pt1.y, pt2.y) + railHeight;
          const minZ = Math.min(pt1.z, pt2.z) - thickness * 0.5;
          const maxZ = Math.max(pt1.z, pt2.z) + thickness * 0.5;

          // Cắt gọn chuẩn xác tại ranh giới hành lang (|X| = 22.0m)
          if (isWest) {
            if (minX < -22.0) minX = -22.0;
            if (maxX < -22.0) continue; // Nằm trọn trong hành lang, nhường cho lan can tầng
          } else {
            if (maxX > 22.0) maxX = 22.0;
            if (minX > 22.0) continue;
          }

          const box = new THREE.Box3(
            new THREE.Vector3(minX, minY, minZ),
            new THREE.Vector3(maxX, maxY, maxZ)
          );
          this.registerSolidObjectCollider(null, {
            customBox: box,
            tag: `StairRail_${flightName}_${sideName}_s${i + 1}`,
            helperColor: 0x06b6d4
          });

          // Nối kín đầu tay vịn trong với lan can hành lang tại |X| = 22.0m để không hở góc rơi
          if (i === segmentsCount - 1) {
            if (isWest && pt2.x > -22.0) {
              const bridgeBox = new THREE.Box3(
                new THREE.Vector3(-22.0, pt2.y, pt2.z - thickness * 0.5),
                new THREE.Vector3(pt2.x + thickness * 0.5, pt2.y + railHeight, pt2.z + thickness * 0.5)
              );
              this.registerSolidObjectCollider(null, {
                customBox: bridgeBox,
                tag: `StairRail_${flightName}_${sideName}_CorridorBridge`,
                helperColor: 0x06b6d4
              });
            } else if (!isWest && pt2.x < 22.0) {
              const bridgeBox = new THREE.Box3(
                new THREE.Vector3(pt2.x - thickness * 0.5, pt2.y, pt2.z - thickness * 0.5),
                new THREE.Vector3(22.0, pt2.y + railHeight, pt2.z + thickness * 0.5)
              );
              this.registerSolidObjectCollider(null, {
                customBox: bridgeBox,
                tag: `StairRail_${flightName}_${sideName}_CorridorBridge`,
                helperColor: 0x06b6d4
              });
            }
          }
        }
      });
    };

    // -------------------------------------------------------------------------
    // HÀM TẠO LAN CAN VÒNG CUNG CHIẾU NGHỈ TRÒN (16 Phân đoạn)
    // -------------------------------------------------------------------------
    const registerLandingRails = (center, radius, y, startAngle, endAngle, facingZ, name, segments = 16) => {
      const railH = 1.05;
      const thick = 0.08;
      for (let i = 0; i < segments; i++) {
        const a1 = startAngle + (i / segments) * (endAngle - startAngle);
        const a2 = startAngle + ((i + 1) / segments) * (endAngle - startAngle);

        const x1 = center.x + Math.sin(a1) * (radius + 0.10);
        const z1 = center.z + facingZ * Math.cos(a1) * (radius + 0.10);
        const x2 = center.x + Math.sin(a2) * (radius + 0.10);
        const z2 = center.z + facingZ * Math.cos(a2) * (radius + 0.10);

        const box = new THREE.Box3(
          new THREE.Vector3(Math.min(x1, x2) - thick * 0.5, y, Math.min(z1, z2) - thick * 0.5),
          new THREE.Vector3(Math.max(x1, x2) + thick * 0.5, y + railH, Math.max(z1, z2) + thick * 0.5)
        );
        this.registerSolidObjectCollider(null, {
          customBox: box,
          tag: `StairRail_${name}_s${i + 1}`,
          helperColor: 0x06b6d4
        });
      }
    };

    // =========================================================================
    // 1. CẦU THANG TẦNG 1 -> TẦNG 2 (Y: 0.0m -> 10.0m)
    // =========================================================================
    // 1.1. Vế trung tâm thẳng T1 (Rộng 5.8m, Z từ 24.0m đến 9.2m tiếp nối Chiếu nghỉ 1)
    registerStraightCentralFlight(24.0, 9.2, 0.0, 4.6, 5.8, 'T1_Central', 14);

    // 1.2. Mép vòng cung Chiếu nghỉ 1 (R = 5.0m tại Z = 7.5m, Y = 5.0m, quay về hướng Bắc Z < 7.5)
    registerLandingRails(new THREE.Vector3(0, 5.0, 7.5), 5.0, 5.0, -Math.PI * 0.28, Math.PI * 0.28, -1, 'Landing_L1_FrontRail', 16);

    // 1.3. Vế cong Tây T1 -> T2 (Rộng 4.0m, từ Chiếu nghỉ lên Hành lang Tây Tầng 2)
    registerCurvedWingFlight([
      new THREE.Vector3(-1.8, 5.0, 6.5),
      new THREE.Vector3(-7.5, 6.4, 7.8),
      new THREE.Vector3(-14.5, 8.2, 11.0),
      new THREE.Vector3(-22.0, 10.0, 15.5)
    ], 4.0, 'T1T2_Wing_West', 36, true);

    // 1.4. Vế cong Đông T1 -> T2 (Rộng 4.0m, từ Chiếu nghỉ lên Hành lang Đông Tầng 2)
    registerCurvedWingFlight([
      new THREE.Vector3(1.8, 5.0, 6.5),
      new THREE.Vector3(7.5, 6.4, 7.8),
      new THREE.Vector3(14.5, 8.2, 11.0),
      new THREE.Vector3(22.0, 10.0, 15.5)
    ], 4.0, 'T1T2_Wing_East', 36, false);

    // =========================================================================
    // 2. CẦU THANG TẦNG 2 -> TẦNG 3 (Y: 10.0m -> 20.0m)
    // =========================================================================
    // 2.1. Vế trung tâm thẳng T2 (Rộng 5.4m, Z từ -24.0m đến -9.2m tiếp nối Chiếu nghỉ 2)
    registerStraightCentralFlight(-24.0, -9.2, 10.0, 14.6, 5.4, 'T2_Central', 14);

    // 2.2. Mép vòng cung Chiếu nghỉ 2 (R = 4.8m tại Z = -7.5m, Y = 15.0m, quay về hướng Nam Z > -7.5)
    registerLandingRails(new THREE.Vector3(0, 15.0, -7.5), 4.8, 15.0, -Math.PI * 0.28, Math.PI * 0.28, 1, 'Landing_L2_FrontRail', 16);

    // 2.3. Vế cong Tây T2 -> T3 (Rộng 4.0m, từ Chiếu nghỉ lên Hành lang Tây Tầng 3)
    registerCurvedWingFlight([
      new THREE.Vector3(-1.8, 15.0, -6.5),
      new THREE.Vector3(-7.5, 16.4, -7.8),
      new THREE.Vector3(-14.5, 18.2, -11.0),
      new THREE.Vector3(-22.0, 20.0, -15.5)
    ], 4.0, 'T2T3_Wing_West', 36, true);

    // 2.4. Vế cong Đông T2 -> T3 (Rộng 4.0m, từ Chiếu nghỉ lên Hành lang Đông Tầng 3)
    registerCurvedWingFlight([
      new THREE.Vector3(1.8, 15.0, -6.5),
      new THREE.Vector3(7.5, 16.4, -7.8),
      new THREE.Vector3(14.5, 18.2, -11.0),
      new THREE.Vector3(22.0, 20.0, -15.5)
    ], 4.0, 'T2T3_Wing_East', 36, false);
  }

  /**
   * BỌC PROXY HITBOX CHO SÁCH DỊCH CHUYỂN & HIỆN VẬT .GLB
   * - Tự động tính toán Bounding Box ôm sát mô hình thực tế, loại trừ hoàn toàn tia sáng & hào quang
   * - Tạo một khối hộp vô hình (opacity: 0, depthWrite: false) với padding nhẹ
   * - Click chuột ở bất kỳ góc nào cũng trúng 100%, không bị bắn tia lọt qua khe mesh
   */
  createTightClickHitbox(targetObject, {
    loreKey = null,
    isBookPortal = false,
    portalTargetRealm = null,
    portalMetadata = null,
    targetSceneCoordinates = null,
    onActivate = null,
    padding = 0.08,
    minSize = 0.35,
    realm = 'museum'
  } = {}) {
    if (!targetObject) return null;

    // Dọn dẹp proxy cũ nếu đã từng bọc đối tượng này để tránh rác bộ nhớ
    if (targetObject.userData?.clickProxyHitbox) {
      const oldProxy = targetObject.userData.clickProxyHitbox;
      const oldIdx = this.clickProxies.indexOf(oldProxy);
      if (oldIdx !== -1) this.clickProxies.splice(oldIdx, 1);
      this._removeDebugHelper(`Helper_${oldProxy.name}`);
      oldProxy.geometry?.dispose();
      oldProxy.material?.dispose();
      this.scene.remove(oldProxy);
    }

    const worldBox = computeTightWorldBox(targetObject, minSize);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    worldBox.getSize(size);
    worldBox.getCenter(center);

    const boxW = Math.max(size.x + padding * 2, minSize);
    const boxH = Math.max(size.y + padding * 2, minSize);
    const boxD = Math.max(size.z + padding * 2, minSize);

    // Hộp Proxy vô hình cho Raycaster
    const proxyGeo = new THREE.BoxGeometry(boxW, boxH, boxD);
    const proxyMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
      wireframe: false
    });

    const proxyMesh = new THREE.Mesh(proxyGeo, proxyMat);
    proxyMesh.name = `ClickHitbox_${loreKey || portalTargetRealm || targetObject.name || 'Artifact'}`;
    proxyMesh.position.copy(center);

    // Gắn metadata tương tác
    const mergedUserData = {
      ...(targetObject.userData || {}),
      isClickProxy: true,
      ignoreRaycaster: false,
      loreKey: loreKey || targetObject.userData?.loreKey,
      isBookPortal: Boolean(isBookPortal || targetObject.userData?.isBookPortal || targetObject.userData?.isTeleportBook),
      portalTargetRealm: portalTargetRealm || targetObject.userData?.targetRealm,
      portalMetadata: portalMetadata || targetObject.userData?.portalMetadata,
      targetSceneCoordinates: targetSceneCoordinates || targetObject.userData?.targetSceneCoordinates,
      onActivate: onActivate || targetObject.userData?.onActivate,
      linkedVisualObject: targetObject,
      realm
    };

    if (mergedUserData.isBookPortal) {
      mergedUserData.isTeleportBook = true;
    }

    proxyMesh.userData = mergedUserData;
    targetObject.userData.clickProxyHitbox = proxyMesh;

    // Tắt kiểm tra Raycaster trên các lưới con phức tạp của model .glb để tăng tốc FPS
    targetObject.traverse((child) => {
      if (child.isMesh && child !== proxyMesh) {
        child.userData.ignoreRaycaster = true;
      }
    });

    this.scene.add(proxyMesh);
    this.clickProxies.push(proxyMesh);

    // Đăng ký tự động với Lore Guide
    if (mergedUserData.loreKey && typeof window !== 'undefined' && window.__loreGuide?.registerArtifact) {
      window.__loreGuide.registerArtifact(proxyMesh, mergedUserData.loreKey);
    }

    // Đăng ký tự động với PortalInteraction
    if (mergedUserData.isBookPortal && typeof window !== 'undefined' && window.registerInteractiveBook) {
      window.registerInteractiveBook(proxyMesh, mergedUserData.targetSceneCoordinates, mergedUserData.portalMetadata || {
        id: mergedUserData.loreKey || 'interactive_book',
        targetRealm: mergedUserData.portalTargetRealm
      });
    }

    // Lưu thông số khung dây VÀNG KIM (khởi tạo lười khi bật phím H hoặc F2)
    worldBox.setFromCenterAndSize(center, size.set(boxW, boxH, boxD));
    this._setDebugHelperSpec(`Helper_${proxyMesh.name}`, worldBox, 0xfde047, realm);

    return proxyMesh;
  }

  /**
   * ĐĂNG KÝ HITBOX VẬT CẢN CỨNG (BỆ ĐÁ, CỘT, TƯỜNG, ĐÀI QUAN SÁT)
   */
  registerSolidObjectCollider(object3D, {
    shrinkFactor = 0.92,
    customBox = null,
    tag = 'Obstacle',
    helperColor = 0x22c55e,
    realm = 'museum'
  } = {}) {
    let box3 = null;

    if (customBox) {
      box3 = customBox.clone();
    } else if (object3D) {
      box3 = computeTightWorldBox(object3D);
      if (box3.isEmpty()) return null;

      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      box3.getCenter(center);
      box3.getSize(size);
      size.x = Math.max(0.2, size.x * shrinkFactor);
      size.z = Math.max(0.2, size.z * shrinkFactor);
      box3.setFromCenterAndSize(center, size);
    }

    if (!box3) return null;

    // Dọn dẹp collider cũ nếu object3D đã từng đăng ký
    if (object3D && object3D.userData?.solidBoxEntry) {
      const oldEntry = object3D.userData.solidBoxEntry;
      const oldIdx = this.solidBoxes.indexOf(oldEntry);
      if (oldIdx !== -1) this.solidBoxes.splice(oldIdx, 1);
      this._unindexSolidEntry(oldEntry);
      this._removeDebugHelper(`SolidHelper_${tag}`);
    }

    const entry = { box: box3, tag, sourceObject: object3D, realm, _stamp: 0, _bucketKeys: null };
    if (object3D) object3D.userData.solidBoxEntry = entry;
    this.solidBoxes.push(entry);
    this._indexSolidEntry(entry);

    // Lưu thông số khung dây Debug (khởi tạo lười khi bật [H]/[F2])
    this._setDebugHelperSpec(`SolidHelper_${tag}`, box3, helperColor, realm);

    return box3;
  }

  /**
   * ĐĂNG KÝ DANH SÁCH HITBOX CHO CÁC THẾ GIỚI TRUYỆN ĐỘC LẬP
   * (Truyện Kiều, Sơn Tinh - Thủy Tinh, An Dương Vương, Vợ Nhặt)
   */
  registerRealmHitboxes(realmName, hitboxes = []) {
    if (!Array.isArray(hitboxes) || hitboxes.length === 0) return;
    hitboxes.forEach((hb) => {
      if (!hb || !hb.box) return;
      this.registerSolidObjectCollider(null, {
        customBox: hb.box,
        tag: `${realmName}_${hb.name || 'Object'}`,
        helperColor: 0x38bdf8,
        realm: realmName
      });
    });
    console.log(
      `%c[Hitbox Architect] Đã đăng ký ${hitboxes.length} hitbox riêng biệt cho cõi: ${realmName}`,
      'color: #38bdf8; font-weight: bold;'
    );
  }

  /**
   * Gỡ bỏ và giải phóng Hitbox vật cản & Debug helper của một cõi truyện riêng (khi exitRealm)
   */
  clearRealmHitboxes(realmName) {
    if (!realmName) return;
    for (let i = this.solidBoxes.length - 1; i >= 0; i--) {
      const entry = this.solidBoxes[i];
      if (entry.realm === realmName) {
        this._unindexSolidEntry(entry);
        this._removeDebugHelper(`SolidHelper_${entry.tag}`);
        this.solidBoxes.splice(i, 1);
      }
    }
    this.realmBuckets.delete(realmName);
    for (let i = this.clickProxies.length - 1; i >= 0; i--) {
      const p = this.clickProxies[i];
      if (p?.userData?.realm === realmName) {
        this._removeDebugHelper(`Helper_${p.name}`);
        p.geometry?.dispose?.();
        p.material?.dispose?.();
        this.scene.remove(p);
        this.clickProxies.splice(i, 1);
      }
    }
  }

  /**
   * XỬ LÝ VA CHẠM TRƯỢT MƯỢT LIÊN TỤC (CONTINUOUS SWEPT WALL SLIDING & AABB PUSHOUT)
   * - Phân vùng kiểm tra theo chiều cao (Vertical Height Filtering)
   * - Tự động nhận diện Realm (Bảo Tàng vs Thế Giới Truyện) để không bị đụng nhầm vật thể
   * - Chia nhỏ bước di chuyển (Swept Sub-stepping) chống tuyệt đối hiện tượng đi xuyên tường khi lag FPS
   * - Trượt mượt theo mặt phẳng tiếp xúc (Wall Sliding)
   * - Cơ chế De-penetration Pushout đẩy nhân vật ra khỏi kẹt góc 100%
   */
  resolvePlayerMovement(currentPos, targetPos, playerRadius = 0.25, playerHeight = 1.8) {
    if (!this.solidBoxes || this.solidBoxes.length === 0) {
      return targetPos.clone();
    }

    // 1. Xác định Realm hiện tại
    let activeRealm = 'museum';
    if (typeof window !== 'undefined') {
      if (window.__activeScene && window.__truyenKieuScene && window.__activeScene === window.__truyenKieuScene) {
        activeRealm = 'truyen_kieu';
      } else if (window.__stttRealmActive || (window.__activeScene && window.__sonTinhThuyTinhScene && window.__activeScene === window.__sonTinhThuyTinhScene) || (targetPos.x >= 3000.0 && targetPos.z >= 3000.0)) {
        activeRealm = 'son_tinh';
      } else if (window.__activeScene && window.__anDuongVuongScene && window.__activeScene === window.__anDuongVuongScene) {
        activeRealm = 'an_duong_vuong';
      } else if (window.__activeScene && window.__voNhatScene && window.__activeScene === window.__voNhatScene) {
        activeRealm = 'vo_nhat';
      } else if (window.__tatDenRealmActive || (window.__activeScene && window.__tatDenScene && window.__activeScene === window.__tatDenScene)) {
        activeRealm = 'tat_den';
      } else if (window.__nqshRealmActive || (window.__activeScene && window.__namQuocSonHaScene && window.__activeScene === window.__namQuocSonHaScene)) {
        activeRealm = 'nam_quoc_son_ha';
      } else if (window.__thanhGiongRealmActive || (window.__activeScene && window.__thanhGiongScene && window.__activeScene === window.__thanhGiongScene)) {
        activeRealm = 'thanh_giong';
      } else if (targetPos.y > 35.0) {
        activeRealm = 'aerial_realm';
      }
    }

    // 2. Lọc các hộp vật cản cùng Realm và vùng không gian (Spatial Bucketing + Height Filtering)
    const feetY = Math.min(currentPos.y, targetPos.y);
    const headY = Math.max(currentPos.y, targetPos.y) + playerHeight;
    const candidateBoxes = this._candidateBoxes;
    candidateBoxes.length = 0;

    if (activeRealm === 'museum') {
      const minTier = this._getMuseumTier(feetY + 0.12);
      const maxTier = this._getMuseumTier(headY - 0.10);
      const minX = Math.min(currentPos.x, targetPos.x) - playerRadius;
      const maxX = Math.max(currentPos.x, targetPos.x) + playerRadius;
      const minZ = Math.min(currentPos.z, targetPos.z) - playerRadius;
      const maxZ = Math.max(currentPos.z, targetPos.z) + playerRadius;
      const minCx = Math.max(-511, Math.min(511, Math.floor(minX / 20.0)));
      const maxCx = Math.max(-511, Math.min(511, Math.floor(maxX / 20.0)));
      const minCz = Math.max(-511, Math.min(511, Math.floor(minZ / 20.0)));
      const maxCz = Math.max(-511, Math.min(511, Math.floor(maxZ / 20.0)));

      const stamp = (this._queryStamp = (this._queryStamp + 1) | 0);
      for (let t = minTier; t <= maxTier; t++) {
        for (let cx = minCx; cx <= maxCx; cx++) {
          for (let cz = minCz; cz <= maxCz; cz++) {
            const cell = this._museumGrid.get(this._getMuseumCellKey(t, cx, cz));
            if (!cell) continue;
            for (let k = 0; k < cell.length; k++) {
              const entry = cell[k];
              if (entry._stamp === stamp) continue;
              entry._stamp = stamp;
              const b = entry.box;
              if (b.max.y >= feetY + 0.12 && b.min.y <= headY - 0.10) {
                candidateBoxes.push(b);
              }
            }
          }
        }
      }
    } else {
      const realmList = this.realmBuckets.get(activeRealm);
      if (realmList) {
        for (let i = 0; i < realmList.length; i++) {
          const b = realmList[i].box;
          if (b.max.y >= feetY + 0.12 && b.min.y <= headY - 0.10) {
            candidateBoxes.push(b);
          }
        }
      }
    }

    if (candidateBoxes.length === 0) {
      return targetPos.clone();
    }

    const checkOverlap = (posX, posY, posZ) => {
      const minX = posX - playerRadius;
      const maxX = posX + playerRadius;
      const minY = posY + 0.12;
      const maxY = posY + playerHeight;
      const minZ = posZ - playerRadius;
      const maxZ = posZ + playerRadius;

      for (let i = 0; i < candidateBoxes.length; i++) {
        const b = candidateBoxes[i];
        if (maxX > b.min.x && minX < b.max.x &&
            maxY > b.min.y && minY < b.max.y &&
            maxZ > b.min.z && minZ < b.max.z) {
          return b;
        }
      }
      return null;
    };

    // 3. Quãng đường di chuyển trong frame
    const totalDist = Math.hypot(targetPos.x - currentPos.x, targetPos.z - currentPos.z);
    if (totalDist < 0.0001) {
      return currentPos.clone();
    }

    const maxSubStep = Math.min(playerRadius * 0.6, 0.15);

    // Fast-path: Nếu di chuyển rất ngắn (frame 60 FPS thông thường) và đích đến hoàn toàn trống -> đi thẳng tức thì O(1)
    if (totalDist <= maxSubStep && !checkOverlap(targetPos.x, targetPos.y, targetPos.z)) {
      return targetPos.clone();
    }

    // 4. Swept Sub-stepping: Chia nhỏ quãng đường theo delta bước nhỏ để kiểm tra liên tục, chống tuyệt đối xuyên tường
    const numSteps = Math.max(1, Math.min(64, Math.ceil(totalDist / maxSubStep)));
    const deltaX = (targetPos.x - currentPos.x) / numSteps;
    const deltaZ = (targetPos.z - currentPos.z) / numSteps;

    let simPos = currentPos.clone();
    simPos.y = targetPos.y;

    for (let step = 0; step < numSteps; step++) {
      const nextX = simPos.x + deltaX;
      const nextZ = simPos.z + deltaZ;

      // A. Nếu bước tiếp theo không va chạm -> tiến tới thẳng
      if (!checkOverlap(nextX, simPos.y, nextZ)) {
        simPos.x = nextX;
        simPos.z = nextZ;
        continue;
      }

      // B. Thử trượt theo trục X (bị cản Z, chỉ đi X)
      if (Math.abs(deltaX) > 0.0001 && !checkOverlap(nextX, simPos.y, simPos.z)) {
        simPos.x = nextX;
      }

      // C. Thử trượt theo trục Z (bị cản X, chỉ đi Z)
      if (Math.abs(deltaZ) > 0.0001 && !checkOverlap(simPos.x, simPos.y, nextZ)) {
        simPos.z = nextZ;
      }

      // D. De-penetration pushout nếu vẫn còn chạm góc
      const hitBox = checkOverlap(simPos.x, simPos.y, simPos.z);
      if (hitBox) {
        const overlapX1 = (hitBox.max.x + playerRadius) - simPos.x;
        const overlapX2 = simPos.x - (hitBox.min.x - playerRadius);
        const pushX = overlapX1 < overlapX2 ? overlapX1 : -overlapX2;

        const overlapZ1 = (hitBox.max.z + playerRadius) - simPos.z;
        const overlapZ2 = simPos.z - (hitBox.min.z - playerRadius);
        const pushZ = overlapZ1 < overlapZ2 ? overlapZ1 : -overlapZ2;

        if (Math.abs(pushX) < Math.abs(pushZ)) {
          simPos.x += pushX + Math.sign(pushX) * 0.005;
        } else {
          simPos.z += pushZ + Math.sign(pushZ) * 0.005;
        }
      }
    }

    return simPos;
  }

  /**
   * BẮN TIA RAYCASTER TƯƠNG TÁC QUA CÁC HỘP PROXY HITBOX CHUẨN
   * Tự động lọc chỉ các đối tượng đang hiển thị (visible=true) và trong cõi hoạt động
   */
  raycastInteractiveHitboxes(raycaster, maxDistance = 28.0) {
    if (!this.clickProxies || this.clickProxies.length === 0) return null;

    const validProxies = [];
    for (let i = 0; i < this.clickProxies.length; i++) {
      const p = this.clickProxies[i];
      if (!p || !p.visible) continue;
      const linked = p.userData?.linkedVisualObject;
      if (linked) {
        let isVis = true;
        let cur = linked;
        while (cur) {
          if (cur.visible === false) { isVis = false; break; }
          cur = cur.parent;
        }
        if (!isVis) continue;
      }
      validProxies.push(p);
    }

    if (validProxies.length === 0) return null;

    const hits = raycaster.intersectObjects(validProxies, false);
    if (hits.length > 0 && hits[0].distance <= maxDistance) {
      return hits[0];
    }
    return null;
  }

  /**
   * Dọn dẹp Hitbox khi chuyển cảnh hoặc làm mới toàn bộ
   */
  clearAllHitboxes() {
    this.solidBoxes.length = 0;
    this.realmBuckets.clear();
    this._museumGrid.clear();
    this._candidateBoxes.length = 0;
    this.debugHelperSpecs.clear();
    this.clickProxies.forEach((mesh) => {
      mesh.geometry?.dispose?.();
      mesh.material?.dispose?.();
      this.scene.remove(mesh);
    });
    this.clickProxies.length = 0;
    this.debugHelpers.children.forEach((h) => {
      h.geometry?.dispose?.();
      h.material?.dispose?.();
    });
    this.debugHelpers.clear();
  }
}
