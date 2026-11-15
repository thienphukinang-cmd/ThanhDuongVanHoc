import * as THREE from 'three';

/**
 * ============================================================================
 * SPATIAL REGISTRY ENGINE (CHỐNG CHỒNG CHÉO KIẾN TRÚC & NỘI THẤT TUYỆT ĐỐI)
 * Skill: hitbox-collision-architect, vietnamese-palace-architect, fps-optimizer
 * 
 * - Quản lý không gian toán học O(1) qua Bounding Box (THREE.Box3).
 * - Khử trùng lặp cột & tường tuyệt đối bằng Map khóa tọa độ lưới.
 * - Cơ chế tự động chạm sàn autoGround() chống bay lơ lửng & lún sàn.
 * - Bảo vệ các hành lang giao thông (walkway) và vùng cửa mở (portal clearance).
 * ============================================================================
 */

export class SpatialRegistry {
  constructor() {
    this.elements = [];
    this.gridNodeMap = new Map();     // Key: `${Math.round(x*10)}_${Math.round(y*10)}_${Math.round(z*10)}`
    this.wallSegmentMap = new Map();  // Key: sorted normalized segment endpoints
    this.walkwayZones = [];           // Array of THREE.Box3 for main thoroughfares (min 4.0m clear)
    this.portalClearanceZones = [];   // Array of THREE.Box3 for room entrances (min 4.0m clear)
    this.scratchBox1 = new THREE.Box3();
    this.scratchBox2 = new THREE.Box3();
  }

  /**
   * Khởi tạo lại toàn bộ dữ liệu kiểm soát không gian
   */
  clear() {
    this.elements = [];
    this.gridNodeMap.clear();
    this.wallSegmentMap.clear();
    this.walkwayZones = [];
    this.portalClearanceZones = [];
  }

  /**
   * Tạo khóa chuẩn hóa tọa độ lưới làm tròn đến 0.1m
   */
  getGridKey(x, y, z) {
    const kx = Math.round((Number(x) || 0) * 10);
    const ky = Math.round((Number(y) || 0) * 10);
    const kz = Math.round((Number(z) || 0) * 10);
    return `${kx}_${ky}_${kz}`;
  }

  /**
   * Tạo khóa chuẩn hóa cho đoạn tường 2D (x1, z1) -> (x2, z2)
   */
  getSegmentKey(x1, z1, x2, z2, y = 0) {
    const p1 = `${Math.round(x1 * 10)}_${Math.round(z1 * 10)}`;
    const p2 = `${Math.round(x2 * 10)}_${Math.round(z2 * 10)}`;
    const ky = Math.round(y * 10);
    return p1 < p2 ? `${p1}__${p2}__${ky}` : `${p2}__${p1}__${ky}`;
  }

  /**
   * Đăng ký một nút lưới cột. Nếu đã có cột tại nút này, trả về false để ngăn duplicate.
   */
  registerGridNode(x, y, z, category = 'column', metadata = {}) {
    const key = this.getGridKey(x, y, z);
    if (this.gridNodeMap.has(key)) {
      // Đã có phần tử đăng ký tại nút này
      return false;
    }
    this.gridNodeMap.set(key, { x, y, z, category, metadata, timestamp: Date.now() });
    return true;
  }

  /**
   * Kiểm tra xem nút lưới đã bị chiếm chưa
   */
  hasGridNode(x, y, z) {
    const key = this.getGridKey(x, y, z);
    return this.gridNodeMap.has(key);
  }

  /**
   * Đăng ký đoạn tường nối giữa 2 điểm (x1, z1) và (x2, z2). Trả về false nếu đoạn tường đã tồn tại.
   */
  registerWallSegment(x1, z1, x2, z2, y = 0.6, category = 'wall', metadata = {}) {
    const key = this.getSegmentKey(x1, z1, x2, z2, y);
    if (this.wallSegmentMap.has(key)) {
      return false;
    }
    this.wallSegmentMap.set(key, { x1, z1, x2, z2, y, category, metadata });
    return true;
  }

  /**
   * Kiểm tra đoạn tường đã tồn tại chưa
   */
  hasWallSegment(x1, z1, x2, z2, y = 0.6) {
    const key = this.getSegmentKey(x1, z1, x2, z2, y);
    return this.wallSegmentMap.has(key);
  }

  /**
   * Đăng ký vùng hành lang cấm đặt vật cản lớn (Walkway Zone)
   */
  registerWalkwayZone(box3, name = 'walkway') {
    const b = box3.clone();
    b.name = name;
    this.walkwayZones.push(b);
  }

  /**
   * Đăng ký vùng trước cửa phòng cần để trống hoàn toàn (Portal Clearance Zone)
   */
  registerPortalClearanceZone(box3, portalName = 'portal') {
    const b = box3.clone();
    b.name = portalName;
    this.portalClearanceZones.push(b);
  }

  /**
   * Đăng ký một cấu kiện thực tế (Mesh / Group).
   * Tự động tính Box3 sau updateMatrixWorld(true), kiểm tra va chạm với các vật đã có nếu cần.
   */
  registerElement(object3D, category = 'furniture', padding = 0.25, allowOverlap = false) {
    if (!object3D) return false;
    try {
      object3D.updateMatrixWorld(true);
    } catch (_) {}

    const box = new THREE.Box3().setFromObject(object3D);
    if (box.isEmpty()) return false;

    // Mở rộng box theo padding kiểm tra
    const paddedBox = box.clone().expandByScalar(padding);

    if (!allowOverlap) {
      // 1. Kiểm tra va chạm với vùng cửa mở
      for (const pZone of this.portalClearanceZones) {
        if (pZone.intersectsBox(paddedBox)) {
          console.warn(`[SpatialRegistry] Vật thể "${object3D.name || category}" vi phạm vùng cửa mở ${pZone.name}.`);
          return false;
        }
      }

      // 2. Nếu là nội thất to, kiểm tra không đè lên hành lang chính
      if (category === 'large_furniture' || category === 'display_case') {
        for (const wZone of this.walkwayZones) {
          if (wZone.intersectsBox(paddedBox)) {
            console.warn(`[SpatialRegistry] Nội thất "${object3D.name || category}" cản trở hành lang chính ${wZone.name}.`);
            return false;
          }
        }
      }

      // 3. Kiểm tra va chạm với các vật thể cứng đã đăng ký cùng hoặc khác category
      for (const item of this.elements) {
        if (item.category === 'walkway_zone' || item.category === 'portal_zone') continue;
        if (item.box.intersectsBox(paddedBox)) {
          // Giao cắt vật thể
          return false;
        }
      }
    }

    this.elements.push({
      object: object3D,
      box,
      paddedBox,
      category,
      padding
    });

    return true;
  }

  /**
   * Đăng ký một Bounding Box Collider trực tiếp (kèm padding và tên định danh).
   */
  registerCollider(id, box3, options = {}) {
    if (!id || !box3 || box3.isEmpty()) return false;
    const padding = options.padding ?? 0;
    const paddedBox = box3.clone().expandByScalar(padding);
    this.unregisterCollider(id);
    this.elements.push({
      id,
      name: id,
      box: box3.clone(),
      paddedBox,
      category: options.category || 'collider',
      padding
    });
    return true;
  }

  /**
   * Hủy đăng ký Bounding Box Collider theo id định danh.
   */
  unregisterCollider(id) {
    if (!id) return false;
    const idx = this.elements.findIndex((e) => e.id === id || e.name === id);
    if (idx !== -1) {
      this.elements.splice(idx, 1);
      return true;
    }
    return false;
  }

  /**
   * Tự động chạm sàn (Auto-Grounding):
   * Ép chân vật thể chạm chuẩn xác cao độ targetFloorY, triệt tiêu lơ lửng hoặc lún sàn.
   */
  autoGround(object3D, targetFloorY = 0.6) {
    if (!object3D) return 0;
    try {
      object3D.updateMatrixWorld(true);
    } catch (_) {}

    const box = new THREE.Box3().setFromObject(object3D);
    if (box.isEmpty()) return 0;

    const currentMinY = box.min.y;
    const deltaY = targetFloorY - currentMinY;
    object3D.position.y += deltaY;

    // Cập nhật lại ma trận thế giới sau khi dịch chuyển
    try {
      object3D.updateMatrixWorld(true);
    } catch (_) {}

    return deltaY;
  }

  /**
   * Kiểm tra nhanh một Box3 có thể đặt an toàn không trước khi spawn object
   */
  canPlaceBox(targetBox3, padding = 0.2, checkWalkways = true) {
    if (!targetBox3 || targetBox3.isEmpty()) return false;
    const testBox = targetBox3.clone().expandByScalar(padding);

    // Kiểm tra cửa
    for (const pZone of this.portalClearanceZones) {
      if (pZone.intersectsBox(testBox)) return false;
    }

    // Kiểm tra hành lang nếu cần
    if (checkWalkways) {
      for (const wZone of this.walkwayZones) {
        if (wZone.intersectsBox(testBox)) return false;
      }
    }

    // Kiểm tra vật cản đã có
    for (const item of this.elements) {
      if (item.category === 'walkway_zone' || item.category === 'portal_zone') continue;
      if (item.box.intersectsBox(testBox)) return false;
    }

    return true;
  }
}

// Singleton toàn cục cho toàn bộ hệ thống bảo tàng
let _globalSpatialRegistry = null;

export function getSpatialRegistry() {
  if (!_globalSpatialRegistry) {
    _globalSpatialRegistry = new SpatialRegistry();
  }
  return _globalSpatialRegistry;
}

export function resetSpatialRegistry() {
  if (_globalSpatialRegistry) {
    _globalSpatialRegistry.clear();
  } else {
    _globalSpatialRegistry = new SpatialRegistry();
  }
  return _globalSpatialRegistry;
}
