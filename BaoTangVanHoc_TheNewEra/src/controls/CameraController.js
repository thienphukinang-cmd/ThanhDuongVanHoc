import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

/**
 * CAMERA CONTROLLER MODULE (DUAL CAMERA SYSTEM - OPTIMIZED FOR 60 FPS)
 * Skill: threejs-camera-direction
 */

export const CAMERA_MODES = {
  WALKER: 'walker',
  FREECAM: 'freecam'
};

class SpatialCollisionGrid {
  constructor(cellSize = 8.0) {
    this.cellSize = cellSize;
    this.grid = new Map();
    this.allObjects = [];
    this._candidates = [];
    this._seen = new Set();
  }

  clear() {
    this.grid.clear();
    this.allObjects = [];
    this._candidates.length = 0;
    this._seen.clear();
  }

  _getKey(cx, cz) {
    return `${cx},${cz}`;
  }

  insert(item) {
    if (!item || !item.box) return;
    const box = item.box;
    const center = item.center || new THREE.Vector3();
    if (!item.center) box.getCenter(center);

    const size = new THREE.Vector3();
    box.getSize(size);
    const radius = Math.hypot(size.x, size.z) * 0.5;
    const radiusSq = radius * radius;

    const data = {
      box: box,
      center: center,
      radiusSq: radiusSq,
      name: item.name || '',
      isWorld: !!item.isWorld,
      isLocal: !!item.isLocal,
      userData: item.userData || {}
    };

    this.allObjects.push(data);

    const minCX = Math.floor(box.min.x / this.cellSize);
    const maxCX = Math.floor(box.max.x / this.cellSize);
    const minCZ = Math.floor(box.min.z / this.cellSize);
    const maxCZ = Math.floor(box.max.z / this.cellSize);

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cz = minCZ; cz <= maxCZ; cz++) {
        const key = this._getKey(cx, cz);
        let list = this.grid.get(key);
        if (!list) {
          list = [];
          this.grid.set(key, list);
        }
        list.push(data);
      }
    }
  }

  queryNear(posX, posZ, searchRadius = 4.0) {
    const minCX = Math.floor((posX - searchRadius) / this.cellSize);
    const maxCX = Math.floor((posX + searchRadius) / this.cellSize);
    const minCZ = Math.floor((posZ - searchRadius) / this.cellSize);
    const maxCZ = Math.floor((posZ + searchRadius) / this.cellSize);

    const candidates = this._candidates;
    candidates.length = 0;
    const seen = this._seen;
    seen.clear();

    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cz = minCZ; cz <= maxCZ; cz++) {
        const key = this._getKey(cx, cz);
        const list = this.grid.get(key);
        if (list) {
          for (let i = 0; i < list.length; i++) {
            const item = list[i];
            if (!seen.has(item)) {
              seen.add(item);
              candidates.push(item);
            }
          }
        }
      }
    }
    return candidates;
  }
}

export class CameraController {
  constructor(camera = null, domElement = null, options = {}) {
    this.camera = camera;
    this.domElement = domElement ?? document.body;

    this.walkSpeed = options?.walkSpeed ?? 10.0;
    this.flySpeed = options?.flySpeed ?? 22.0;
    this.eyeHeight = options?.eyeHeight ?? 1.8;
    this.gravity = options?.gravity ?? 24.0;
    this.jumpForce = options?.jumpForce ?? 8.5;

    this.mode = options?.initialMode ?? CAMERA_MODES.WALKER;
    this.isEnabled = true;

    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,
      down: false,
    };

    this.velocity = new THREE.Vector3();
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._moveDir = new THREE.Vector3();
    this.isOnGround = true;

    this.collisionObjects = [];
    this.stairObjects = [];
    this.playerRadius = 0.25;
    this._testBoxX = new THREE.Box3();
    this._testBoxZ = new THREE.Box3();
    this._testBoxXZ = new THREE.Box3();
    this._resolveStartPos = new THREE.Vector3();
    this._resolveTargetPos = new THREE.Vector3();
    this._tempSize = new THREE.Vector3();

    this.spatialGrid = new SpatialCollisionGrid(8.0);
    this.customHitboxes = [];
    this.hitboxManager = null;
    this.initAccurateCustomHitboxes();

    this.onModeChange = null;
    this.isFastTraveling = false;
    this.fastTravelTime = 0.0;
    this.fastTravelDuration = 1.8;
    this.travelStartPos = new THREE.Vector3();
    this.travelEndPos = new THREE.Vector3();
    this.travelStartLook = new THREE.Vector3();
    this.travelEndLook = new THREE.Vector3();
    this.travelCurrentLook = new THREE.Vector3();
    this.onFastTravelComplete = null;
    this.audioManager = options?.audioManager ?? null;
    this.stepDistanceAccumulator = 0.6;
    this._stairPolylines = this._buildStaircasePolylines();

    try {
      this.initControls();
      this.initEventListeners();
      this.createHUDIndicator();
      console.log(`%c[CAMERA CONTROLLER OPTIMIZED] Khởi tạo thành công • Chế độ: ${this.mode.toUpperCase()}`, "color: #39e58c; font-weight: bold;");
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo CameraController:", err);
    }
  }

  _buildStaircasePolylines() {
    const sampleFlight = (controlPoints, halfWidth, segments = 28) => {
      const curve = new THREE.CatmullRomCurve3(controlPoints);
      curve.curveType = 'centripetal';
      const pts = [];
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (let i = 0; i <= segments; i++) {
        const p = curve.getPoint(i / segments);
        pts.push(p);
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.z < minZ) minZ = p.z;
        if (p.z > maxZ) maxZ = p.z;
      }
      const pad = halfWidth + 0.15;
      return {
        pts,
        halfWidthSq: halfWidth * halfWidth,
        minX: minX - pad,
        maxX: maxX + pad,
        minZ: minZ - pad,
        maxZ: maxZ + pad
      };
    };

    return [
      // Tầng 1 -> Tầng 2 (Khớp 100% BifurcatedStaircase)
      sampleFlight([
        new THREE.Vector3(0, 0.0, 24.0),
        new THREE.Vector3(0, 1.6, 18.5),
        new THREE.Vector3(0, 3.4, 13.0),
        new THREE.Vector3(0, 5.0, 8.0)
      ], 2.85),
      sampleFlight([
        new THREE.Vector3(-1.8, 5.0, 6.5),
        new THREE.Vector3(-7.5, 6.4, 7.8),
        new THREE.Vector3(-14.5, 8.2, 11.0),
        new THREE.Vector3(-22.0, 10.0, 15.5)
      ], 2.0),
      sampleFlight([
        new THREE.Vector3(1.8, 5.0, 6.5),
        new THREE.Vector3(7.5, 6.4, 7.8),
        new THREE.Vector3(14.5, 8.2, 11.0),
        new THREE.Vector3(22.0, 10.0, 15.5)
      ], 2.0),
      // Tầng 2 -> Tầng 3 (Khớp 100% BifurcatedStaircase)
      sampleFlight([
        new THREE.Vector3(0, 10.0, -24.0),
        new THREE.Vector3(0, 11.6, -18.5),
        new THREE.Vector3(0, 13.4, -13.0),
        new THREE.Vector3(0, 15.0, -8.0)
      ], 2.68),
      sampleFlight([
        new THREE.Vector3(-1.8, 15.0, -6.5),
        new THREE.Vector3(-7.5, 16.4, -7.8),
        new THREE.Vector3(-14.5, 18.2, -11.0),
        new THREE.Vector3(-22.0, 20.0, -15.5)
      ], 2.0),
      sampleFlight([
        new THREE.Vector3(1.8, 15.0, -6.5),
        new THREE.Vector3(7.5, 16.4, -7.8),
        new THREE.Vector3(14.5, 18.2, -11.0),
        new THREE.Vector3(22.0, 20.0, -15.5)
      ], 2.0)
    ];
  }

  _sampleFlightHeightAt(flight, x, z) {
    if (x < flight.minX || x > flight.maxX || z < flight.minZ || z > flight.maxZ) {
      return null;
    }
    const pts = flight.pts;
    let bestDistSq = flight.halfWidthSq;
    let bestY = null;

    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const lenSq = dx * dx + dz * dz;
      let s = 0.0;
      if (lenSq > 1e-8) {
        s = ((x - a.x) * dx + (z - a.z) * dz) / lenSq;
        if (s < 0.0) s = 0.0;
        else if (s > 1.0) s = 1.0;
      }
      const cx = a.x + s * dx;
      const cz = a.z + s * dz;
      const distSq = (x - cx) * (x - cx) + (z - cz) * (z - cz);
      if (distSq <= bestDistSq) {
        bestDistSq = distSq;
        bestY = a.y + s * (b.y - a.y);
      }
    }
    return bestY;
  }

  initControls() {
    if (!this.camera) return;
    try {
      this.controls = new PointerLockControls(this.camera, this.domElement);
      this.controls.addEventListener('lock', () => {
        this.velocity.y = 0;
        this.isOnGround = true;
        this.updateLockHint(true);
      });
      this.controls.addEventListener('unlock', () => this.updateLockHint(false));
    } catch (err) {
      console.warn("[SELF-HEALING] Lỗi tạo PointerLockControls:", err);
    }
  }

  createHUDIndicator() {
    if (typeof document === 'undefined') return;
    let hint = document.getElementById('camera-mode-hint');
    if (!hint) {
      hint = document.createElement('div');
      hint.id = 'camera-mode-hint';
      hint.innerHTML = `
        <style>
          #camera-mode-hint {
            position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
            z-index: 1000; background: rgba(12, 16, 24, 0.94);
            border: 1px solid rgba(212, 175, 55, 0.45);
            color: #f0f3f6; font-family: 'Segoe UI', sans-serif; font-size: 12px;
            padding: 8px 18px; border-radius: 24px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
            display: flex; align-items: center; gap: 12px; user-select: none;
          }
          .mode-badge-indicator { background: rgba(57, 229, 140, 0.2); border: 1px solid #39e58c; color: #4ef09e; padding: 3px 8px; border-radius: 12px; font-weight: 700; font-size: 10.5px; }
          .key-badge { background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.2); color: #fff; padding: 1px 5px; border-radius: 4px; font-family: monospace; }
        </style>
        <span class="mode-badge-indicator" id="mode-text-badge">WALKER (ĐI BỘ)</span>
        <span class="mode-controls-guide" id="mode-guide-text">
          <span class="key-badge">WASD</span> Di chuyển • <span class="key-badge">V</span> Đổi chế độ • <span class="key-badge">R</span> Thoát kẹt
        </span>
      `;
      document.body.appendChild(hint);
    }
    this.hintElement = hint;
    this.updateHUDText();
  }

  updateLockHint(isLocked) {
    const guide = document.getElementById('mode-guide-text');
    if (!guide) return;
    if (isLocked) {
      guide.innerHTML = `<span class="key-badge">WASD</span> Di chuyển • <span class="key-badge">SPACE</span> Nhảy • <span class="key-badge">V</span> Đổi chế độ • <span class="key-badge">R</span> Thoát kẹt • <span class="key-badge">ESC</span> Mở chuột`;
    } else {
      guide.innerHTML = `Click chuột vào màn hình để điều khiển • <span class="key-badge">V</span> Đổi chế độ • <span class="key-badge">R</span> Thoát kẹt`;
    }
  }

  updateHUDText() {
    const badge = document.getElementById('mode-text-badge');
    if (badge) {
      if (this.mode === CAMERA_MODES.WALKER) {
        badge.textContent = "WALKER (ĐI BỘ 1.8M)";
        badge.style.borderColor = "#39e58c";
        badge.style.color = "#4ef09e";
      } else {
        badge.textContent = "FREECAM (BAY TỰ DO)";
        badge.style.borderColor = "#ffd700";
        badge.style.color = "#ffe082";
      }
    }
    this.updateLockHint(this.controls?.isLocked ?? false);
  }

  initEventListeners() {
    this.onKeyDown = (e) => {
      if (this.isFastTraveling) return;
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.keys.forward = true; break;
        case 'KeyS': case 'ArrowDown': this.keys.backward = true; break;
        case 'KeyA': case 'ArrowLeft': this.keys.left = true; break;
        case 'KeyD': case 'ArrowRight': this.keys.right = true; break;
        case 'Space':
          this.keys.up = true;
          if (this.mode === CAMERA_MODES.WALKER && this.isOnGround) {
            this.velocity.y = this.jumpForce;
            this.isOnGround = false;
          }
          e.preventDefault();
          break;
        case 'ShiftLeft': case 'ShiftRight': this.keys.down = true; break;
        case 'KeyV': this.toggleMode(); break;
        case 'KeyR': this.emergencyUnstick(); break;
      }
    };

    this.onKeyUp = (e) => {
      if (this.isFastTraveling) return;
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': this.keys.forward = false; break;
        case 'KeyS': case 'ArrowDown': this.keys.backward = false; break;
        case 'KeyA': case 'ArrowLeft': this.keys.left = false; break;
        case 'KeyD': case 'ArrowRight': this.keys.right = false; break;
        case 'Space': this.keys.up = false; break;
        case 'ShiftLeft': case 'ShiftRight': this.keys.down = false; break;
      }
    };

    this.onCanvasClick = (e) => {
      if (this.isFastTraveling) return;
      if (e.target?.closest?.('#director-hud, #portal-modal-overlay, #directory-hud-modal, #directory-hud-toggle-btn, #literature-summary-panel, #audio-mute-toggle-btn, #perf-fps-badge, #return-waypoint-prompt')) return;
      if (this.isEnabled && this.controls && !this.controls.isLocked) {
        this.controls.lock();
      }
    };

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.domElement?.addEventListener?.('click', this.onCanvasClick);
  }

  toggleMode() {
    this.mode = (this.mode === CAMERA_MODES.WALKER) ? CAMERA_MODES.FREECAM : CAMERA_MODES.WALKER;
    if (this.mode === CAMERA_MODES.WALKER && this.camera && this.camera.position.y < this.eyeHeight) {
      this.camera.position.y = this.eyeHeight;
    }
    this.velocity.set(0, 0, 0);
    this.updateHUDText();
    this.onModeChange?.(this.mode);
  }

  emergencyUnstick() {
    if (!this.camera) return;
    const isInsideStoryRealm = (typeof window !== 'undefined' && window.__activeScene && window.__truyenKieuScene && window.__activeScene === window.__truyenKieuScene) || (this.camera.position.y > 100.0);
    if (isInsideStoryRealm) {
      // Đang ở Thế giới Truyện Kiều (Multi-Scene: Tọa độ gốc 0,0,0): unstick về điểm xuất phát Zone 1
      this.camera.position.set(0, this.eyeHeight, 5.5);
      this.velocity.set(0, 0, 0);
      this.isOnGround = true;
      this.camera.lookAt(0.5, 1.6, -0.5);
      return;
    }
    this.camera.position.set(0, this.eyeHeight, 32);
    this.velocity.set(0, 0, 0);
    this.isOnGround = true;
    this.camera.lookAt(0, this.eyeHeight + 1.0, 0);
  }

  setMode(mode) {
    if (mode === CAMERA_MODES.WALKER || mode === CAMERA_MODES.FREECAM) {
      this.mode = mode;
      this.velocity.set(0, 0, 0);
      this.updateHUDText();
      this.onModeChange?.(this.mode);
    }
  }

  initAccurateCustomHitboxes() {
    // Toàn bộ Hitbox được quản lý tập trung và chuẩn hóa bởi MuseumHitboxManager (hitbox-collision-architect)
    this.customHitboxes = [];
  }

  setFloorHeightProvider(provider) {
    this.floorHeightProvider = provider;
  }

  registerHitbox(hitbox) {
    if (!hitbox || !hitbox.box) return;
    if (!hitbox.center) {
      hitbox.center = new THREE.Vector3();
      hitbox.box.getCenter(hitbox.center);
    }
    this.customHitboxes = this.customHitboxes || [];
    const exists = this.customHitboxes.some(h => h.name === hitbox.name);
    if (!exists) {
      this.customHitboxes.push(hitbox);
      this.spatialGrid?.insert(hitbox);
    }
  }

  registerHitboxes(hitboxes) {
    if (Array.isArray(hitboxes)) {
      hitboxes.forEach(hb => this.registerHitbox(hb));
    }
  }

  setHitboxManager(hitboxManager) {
    this.hitboxManager = hitboxManager;
  }

  setCollisionObjects(collisionObjects = [], stairObjects = []) {
    this.spatialGrid.clear();
    (this.customHitboxes || []).forEach(hb => this.spatialGrid.insert(hb));
    (collisionObjects || []).forEach(obj => this.addCollisionObject(obj));
    if (Array.isArray(stairObjects)) this.stairObjects = stairObjects;
  }

  addCollisionObject(obj) {
    if (!obj || obj.userData?.excludeFromCollision) return;
    if (Array.isArray(obj)) {
      obj.forEach(item => this.addCollisionObject(item));
      return;
    }

    // Nếu object đã có sẵn precomputed worldAABB (như vách tường từ RoomGenerator)
    if (obj.userData?.worldAABB) {
      const aabb = obj.userData.worldAABB;
      const size = new THREE.Vector3();
      aabb.getSize(size);
      const isLargeWall = (size.x >= 2.0 && size.y >= 2.0) || (size.z >= 2.0 && size.y >= 2.0) || (size.x >= 4.0 && size.z >= 4.0);
      if (isLargeWall || obj.userData?.isMainBoundary) {
        const center = obj.userData.center || new THREE.Vector3();
        if (!obj.userData.center) aabb.getCenter(center);
        this.spatialGrid.insert({ box: aabb, center: center, name: obj.name || 'Macro_Wall' });
      }
      return;
    }

    const addMesh = (m) => {
      if (!m || m.userData?.excludeFromCollision) return;

      // PERFORMANCE BLOCKOUT MODE: VÔ HIỆU HÓA HOÀN TOÀN CÁC HITBOX VI MÔ
      // Bỏ qua từng bậc thang, con tiện lan can, tay vịn, đồ trang trí nhỏ, đèn, sách
      const name = (m.name || '').toLowerCase();
      if (
        name.includes('baluster') || name.includes('con_tien') ||
        name.includes('step') || name.includes('tread') || name.includes('nosing') ||
        name.includes('rail') || name.includes('spindle') || name.includes('detail') ||
        name.includes('decor') || name.includes('petal') || name.includes('leaf') ||
        name.includes('vase') || name.includes('urn') || name.includes('lantern') ||
        name.includes('lamp') || name.includes('torch') || name.includes('spike') ||
        name.includes('book') || name.includes('trim') || name.includes('baseboard') ||
        name.includes('pedestal') || name.includes('screen') || name.includes('frame') ||
        name.includes('arch') || name.includes('foliage') || name.includes('prop')
      ) {
        return;
      }

      if (m.isMesh || m.userData?.worldAABB) {
        if (m.updateMatrixWorld) m.updateMatrixWorld(true);
        let aabb = m.userData?.worldAABB;
        if (!aabb && m.isMesh && m.geometry) aabb = new THREE.Box3().setFromObject(m);
        if (aabb) {
          // Chỉ giữ lại các hitbox lớn bao quanh các bức tường chính và sàn nhà
          const size = new THREE.Vector3();
          aabb.getSize(size);
          const isLargeWallOrFloor = 
            (size.x >= 2.0 && size.y >= 2.0) || 
            (size.z >= 2.0 && size.y >= 2.0) || 
            (size.x >= 4.0 && size.z >= 4.0);

          if (!isLargeWallOrFloor && !m.userData?.isMainBoundary) {
            return; // Đóng băng micro-hitbox
          }

          const center = new THREE.Vector3();
          aabb.getCenter(center);
          this.spatialGrid.insert({ box: aabb, center: center, name: m.name });
        }
      }
    };
    if (obj.isMesh) addMesh(obj);
    else if (obj.traverse) obj.traverse(addMesh);
  }

  getPlayerBoxAt(posX, posY, posZ, targetBox) {
    const r = this.playerRadius || 0.25;
    const footY = posY - this.eyeHeight + 0.35;
    const headY = posY + 0.1;
    targetBox.min.set(posX - r, footY, posZ - r);
    targetBox.max.set(posX + r, headY, posZ + r);
    return targetBox;
  }

  isObstacleBlocked(testBox) {
    const testCenterX = (testBox.min.x + testBox.max.x) * 0.5;
    const testCenterZ = (testBox.min.z + testBox.max.z) * 0.5;
    const candidates = this.spatialGrid.queryNear(testCenterX, testCenterZ, 3.5);
    if (!candidates || candidates.length === 0) return false;

    for (let i = 0; i < candidates.length; i++) {
      const item = candidates[i];
      if (testBox.intersectsBox(item.box)) return true;
    }
    return false;
  }

  /**
   * TỐI ƯU HÓA TÍNH TOÁN CAO ĐỘ SÀN & CẦU THANG (O(1) CACHED LOOKUP)
   */
  getFloorHeightAt(x = 0, z = 0) {
    if (typeof this.floorHeightProvider === 'function') {
      try {
        const fh = this.floorHeightProvider(x, z);
        if (typeof fh === 'number' && !isNaN(fh)) return fh;
      } catch (e) {
        // Fallback bảo vệ bên dưới
      }
    }

    const currentY = this.camera?.position?.y ?? this.eyeHeight;
    const feetY = currentY - this.eyeHeight;

    // Tự động bảo vệ cao độ khi ở Thế giới Sơn Tinh - Thủy Tinh (Tọa độ X >= 4000, Z >= 4000)
    if ((x >= 4000.0 && z >= 4000.0) || (typeof window !== 'undefined' && window.__stttRealmActive)) {
      return 36.0;
    }

    // Tự động bảo vệ cao độ khi ở Thế giới Truyện Kiều (Multi-Scene Architecture: Tọa độ gốc 0,0,0)
    const isInsideStoryRealm = (typeof window !== 'undefined' && window.__activeScene && window.__truyenKieuScene && window.__activeScene === window.__truyenKieuScene) || (currentY > 100.0);
    if (isInsideStoryRealm) {
      if (currentY >= 350.0) {
        if (Math.abs(x) < 40.0 && z < -350.0 && z > -450.0) {
          return 466.3; // Sàn đài quan sát cõi Sơn Tinh trên cao (420.0 + 48.0 - 1.7)
        }
        return 422.3; // Sàn đài quan sát các cõi truyện (420.0 + 4.0 - 1.7)
      }
      // Zone 2: Vọng Lầu Ngưng Bích (sàn cao 4.5m tại quanh X = -140, Z = 0)
      if (Math.abs(x - (-140)) <= 6.5 && Math.abs(z) <= 6.5) {
        return 4.5;
      }
      return 0.0;
    }

    // B. ĐỊNH NGHĨA SÀN BÊ TÔNG ĐẶC (CÁC TẦNG BẢO TÀNG)
    // Ngoại vi bảo tàng: |x| <= 63.5 và |z| <= 63.5
    // Giếng trời trung tâm thông tầng rỗng: |x| < 21.75 và |z| < 21.75
    const isSolidFloorSlab = (Math.abs(x) >= 21.75 || Math.abs(z) >= 21.75) && Math.abs(x) <= 63.5 && Math.abs(z) <= 63.5;

    // Ngưỡng bước bậc hợp lý:
    // - Khi đang đứng/đi trên mặt sàn: cho phép bước lên tối đa 0.55m -> leo bậc thang mượt,
    //   nhưng TUYỆT ĐỐI không hút người đi dưới gầm cầu thang/chiếu nghỉ lên trên (chênh >= 1.5m..5.0m).
    // - Khi đang nhảy giữa không trung: không tự nhấc lên mặt thang phía trên đầu khi đang bay lên.
    const maxStepUp = this.isOnGround
      ? 0.55
      : (this.velocity.y > 0 ? 0.05 : 0.25);
    const maxAllowedY = feetY + maxStepUp;

    let bestFloorY = 0.0; // Sàn Tầng 1 (Y = 0.0m)

    // 1. Sàn bê tông đặc Tầng 2 (10.0m) & Tầng 3 (20.0m)
    if (isSolidFloorSlab) {
      if (10.0 <= maxAllowedY && 10.0 > bestFloorY) bestFloorY = 10.0;
      if (20.0 <= maxAllowedY && 20.0 > bestFloorY) bestFloorY = 20.0;
    }

    // 2. 6 vế cầu thang chữ Y bám chính xác đường cong CatmullRomCurve3 & bề rộng thật
    if (this._stairPolylines) {
      for (let i = 0; i < this._stairPolylines.length; i++) {
        const stairY = this._sampleFlightHeightAt(this._stairPolylines[i], x, z);
        if (stairY !== null && stairY <= maxAllowedY && stairY > bestFloorY) {
          bestFloorY = stairY;
        }
      }
    }

    // 3. Chiếu nghỉ Tầng 1 -> Tầng 2 (Y = 5.0m tại (0, 7.5), R = 4.95m, chừa rãnh vào vế thang Z > 8.5)
    if (!(Math.abs(x) < 2.75 && z > 8.5) && Math.hypot(x, z - 7.5) <= 4.95) {
      if (5.0 <= maxAllowedY && 5.0 > bestFloorY) bestFloorY = 5.0;
    }

    // 4. Chiếu nghỉ Tầng 2 -> Tầng 3 (Y = 15.0m tại (0, -7.5), R = 4.75m, chừa rãnh vào vế thang Z < -8.5)
    if (!(Math.abs(x) < 2.55 && z < -8.5) && Math.hypot(x, z + 7.5) <= 4.75) {
      if (15.0 <= maxAllowedY && 15.0 > bestFloorY) bestFloorY = 15.0;
    }

    return bestFloorY;
  }

  fastTravelTo(targetPos, lookAtTarget, onComplete = null) {
    if (!this.camera || !targetPos || !lookAtTarget) return;
    this.audioManager?.playWhoosh?.();
    this.isFastTraveling = true;
    this.fastTravelTime = 0.0;
    if (this.controls?.isLocked) this.controls.unlock();

    this.travelStartPos.copy(this.camera.position);
    this.travelEndPos.copy(targetPos);
    this.camera.getWorldDirection(this._moveDir);
    this.travelStartLook.copy(this.camera.position);
    this.travelStartLook.x += this._moveDir.x * 10.0;
    this.travelStartLook.y += this._moveDir.y * 10.0;
    this.travelStartLook.z += this._moveDir.z * 10.0;
    this.travelEndLook.copy(lookAtTarget);
    this.onFastTravelComplete = onComplete;
  }

  update(delta = 0.016) {
    if (!this.camera) return;

    if (this.isFastTraveling) {
      this.fastTravelTime += delta;
      const progress = Math.min(1.0, this.fastTravelTime / this.fastTravelDuration);
      const ease = progress < 0.5 ? 2.0 * progress * progress : 1.0 - Math.pow(-2.0 * progress + 2.0, 2) / 2.0;
      this.camera.position.lerpVectors(this.travelStartPos, this.travelEndPos, ease);
      this.travelCurrentLook.lerpVectors(this.travelStartLook, this.travelEndLook, ease);
      this.camera.lookAt(this.travelCurrentLook);

      if (progress >= 1.0) {
        this.isFastTraveling = false;
        this.camera.position.copy(this.travelEndPos);
        this.camera.lookAt(this.travelEndLook);
        const cb = this.onFastTravelComplete;
        this.onFastTravelComplete = null;
        cb?.();
      }
      return;
    }

    if (!this.isEnabled || !this.controls?.isLocked) return;

    const dt = Math.min(delta, 0.1);

    try {
      if (this.mode === CAMERA_MODES.WALKER) {
        this.camera.getWorldDirection(this._forward);
        this._forward.y = 0;
        this._forward.normalize();
        this._right.crossVectors(this._forward, this.camera.up).normalize();

        this._moveDir.set(0, 0, 0);
        if (this.keys.forward) this._moveDir.add(this._forward);
        if (this.keys.backward) this._moveDir.sub(this._forward);
        if (this.keys.right) this._moveDir.add(this._right);
        if (this.keys.left) this._moveDir.sub(this._right);

        if (this._moveDir.lengthSq() > 0) {
          this._moveDir.normalize();
          const totalDist = this.walkSpeed * dt;
          const moveX = this._moveDir.x * totalDist;
          const moveZ = this._moveDir.z * totalDist;

          const prevX = this.camera.position.x;
          const prevZ = this.camera.position.z;

          this.camera.position.x += moveX;
          this.camera.position.z += moveZ;

          // 0. Xử lý va chạm trượt mượt mà duy nhất với MuseumHitboxManager (Wall Sliding - Skill: hitbox-collision-architect)
          const hbm = this.hitboxManager || (typeof window !== 'undefined' ? window.__museumHitboxManager : null);
          if (hbm && typeof hbm.resolvePlayerMovement === 'function') {


            const currFloorY = this.getFloorHeightAt(prevX, prevZ);
            const targetFloorY = this.getFloorHeightAt(this.camera.position.x, this.camera.position.z);
            const footY = Math.max(this.camera.position.y - this.eyeHeight, currFloorY);
            const currentPos = this._resolveStartPos.set(prevX, footY, prevZ);
            const targetPos = this._resolveTargetPos.set(this.camera.position.x, Math.max(footY, targetFloorY), this.camera.position.z);
            const resolved = hbm.resolvePlayerMovement(currentPos, targetPos, this.playerRadius || 0.25, 1.8);
            this.camera.position.x = resolved.x;
            this.camera.position.z = resolved.z;

            // Chặn đi từ gầm cầu thang chui ngược vào phần gầm thấp (< 1.8m) rồi trồi lên mặt bậc
            const currFeetY = this.camera.position.y - this.eyeHeight;
            const inLowT1UnderStair =
              currFeetY < 0.35 &&
              Math.abs(this.camera.position.x) < 2.95 &&
              this.camera.position.z >= 16.8 &&
              this.camera.position.z <= 23.2 &&
              (prevZ < 17.0 || Math.abs(prevX) >= 2.95);
            const inLowT2UnderStair =
              currFeetY >= 9.4 &&
              currFeetY < 10.35 &&
              Math.abs(this.camera.position.x) < 2.75 &&
              this.camera.position.z <= -16.8 &&
              this.camera.position.z >= -23.2 &&
              (prevZ > -17.0 || Math.abs(prevX) >= 2.75);
            if (inLowT1UnderStair || inLowT2UnderStair) {
              this.camera.position.x = prevX;
              this.camera.position.z = prevZ;
            }
          } else {
            // Fallback nếu chưa nạp MuseumHitboxManager
            this.handleInteriorObstacleCollision(prevX, prevZ);
            this.applyWallBoundaryClamping(prevX, prevZ);
          }

          // Giới hạn biên bản đồ & chống no-clip
          this.applyClippingPrevention();
        }

        // Trọng lực & Bám sàn mượt mà
        this.velocity.y -= this.gravity * dt;
        this.camera.position.y += this.velocity.y * dt;

        const floorHeight = this.getFloorHeightAt(this.camera.position.x, this.camera.position.z);
        const targetMinY = Math.max(this.eyeHeight, floorHeight + this.eyeHeight);

        if (this.camera.position.y <= targetMinY) {
          this.camera.position.y = targetMinY;
          this.velocity.y = 0;
          this.isOnGround = true;
        } else if (this.camera.position.y > targetMinY + 0.35) {
          this.isOnGround = false;
        }

        // 4. Khóa an toàn chống clipping / rơi xuống dưới cao độ sàn thế giới truyện
        this.applyClippingPrevention();
      } else if (this.mode === CAMERA_MODES.FREECAM) {
        this.camera.getWorldDirection(this._forward);
        this._right.crossVectors(this._forward, this.camera.up).normalize();
        this._moveDir.set(0, 0, 0);
        if (this.keys.forward) this._moveDir.add(this._forward);
        if (this.keys.backward) this._moveDir.sub(this._forward);
        if (this.keys.right) this._moveDir.add(this._right);
        if (this.keys.left) this._moveDir.sub(this._right);
        if (this.keys.up) this._moveDir.y += 1.0;
        if (this.keys.down) this._moveDir.y -= 1.0;

        if (this._moveDir.lengthSq() > 0) this._moveDir.normalize();
        this.camera.position.addScaledVector(this._moveDir, this.flySpeed * dt);
      }
    } catch (err) {
      console.warn("[SELF-HEALING] Lỗi update CameraController:", err);
    }
  }

  /**
   * XỬ LÝ VA CHẠM VẬT CẢN NỘI THẤT (O(1) SPATIAL GRID VỚI CƠ CHẾ TRƯỢT SLIDE-ON-HIT)
   * Áp dụng đồng đều cho cả Sảnh Bảo Tàng và Thế Giới Truyện.
   */
  handleInteriorObstacleCollision(prevX, prevZ) {
    if (!this.camera || this.camera.position.y > 30.0) return;
    const currX = this.camera.position.x;
    const currY = this.camera.position.y;
    const currZ = this.camera.position.z;
    if ((currX >= 4000.0 && currZ >= 4000.0) || (typeof window !== 'undefined' && window.__stttRealmActive)) return;
    if (!this.spatialGrid || this.spatialGrid.allObjects.length === 0) return;

    const maxSearchRadius = 3.8;
    const candidates = this.spatialGrid.queryNear(currX, currZ, maxSearchRadius);
    if (!candidates || candidates.length === 0) return;

    this.getPlayerBoxAt(currX, currY, currZ, this._testBoxXZ);
    let collidedBox = null;

    for (let i = 0; i < candidates.length; i++) {
      const item = candidates[i];
      if (!item || !item.box) continue;

      if (this._testBoxXZ.intersectsBox(item.box)) {
        collidedBox = item.box;
        break;
      }
    }

    if (!collidedBox) return;

    // Trượt mượt mà dọc theo bề mặt vật cản (Slide on Hit):
    // 1. Thử nghiệm giữ nguyên X cũ, chỉ đi theo Z:
    this.getPlayerBoxAt(prevX, currY, currZ, this._testBoxZ);
    if (!this._testBoxZ.intersectsBox(collidedBox)) {
      this.camera.position.x = prevX;
      return;
    }

    // 2. Thử nghiệm giữ nguyên Z cũ, chỉ đi theo X:
    this.getPlayerBoxAt(currX, currY, prevZ, this._testBoxX);
    if (!this._testBoxX.intersectsBox(collidedBox)) {
      this.camera.position.z = prevZ;
      return;
    }

    // 3. Nếu cả 2 đều chạm, giữ nguyên vị trí cũ:
    this.camera.position.x = prevX;
    this.camera.position.z = prevZ;
  }

  /**
   * GIỚI HẠN TƯỜNG BIÊN PHÒNG 01 & 02 (CỬA VÒM 2 CHIỀU) VÀ KHUÔN VIÊN THẾ GIỚI TRUYỆN
   */
  applyWallBoundaryClamping(prevX, prevZ) {
    if (!this.camera) return;
    const currX = this.camera.position.x;
    const currY = this.camera.position.y;
    const currZ = this.camera.position.z;

    // Không kẹp biên bảo tàng nếu đang ở Thế Giới Sơn Tinh - Thủy Tinh (tọa độ 5000, 0, 5000)
    if ((currX >= 4000.0 && currZ >= 4000.0) || (typeof window !== 'undefined' && window.__stttRealmActive)) {
      return;
    }

    // A. THẾ GIỚI TRUYỆN TRÊN CAO (Y > 30.0m) - ĐÃ ĐƯỢC XỬ LÝ TRONG applyClippingPrevention()
    if (currY > 30.0) {
      return;
    }

    // B. SẢNH BẢO TÀNG (TẦNG 2, Y khoảng 8.5m - 18.0m)
    if (currY >= 8.5 && currY <= 18.0) {
      // 1. KHU VỰC PHÒNG 01 (TRUYỆN KIỀU): X in [-61.1, -34.5], Z in [4.5, 33.5]
      // Cửa vòm tại X = -34.5, khe Z in [15.8, 22.2]
      const isInP1_XZ = (currX < -34.5 && currX > -62.0 && currZ > 3.5 && currZ < 34.5);
      const wasInP1_XZ = (prevX < -34.5 && prevX > -62.0 && prevZ > 3.5 && prevZ < 34.5);
      const isP1Doorway = (currZ >= 15.6 && currZ <= 22.4);

      if (wasInP1_XZ && !isInP1_XZ) {
        // Đang ở trong P01 muốn đi ra ngoài: Chỉ được qua cửa vòm
        if (!isP1Doorway) {
          this.camera.position.x = Math.min(-34.8, currX);
        }
      } else if (!wasInP1_XZ && isInP1_XZ) {
        // Ngoài hành lang muốn vào P01: Chỉ được qua cửa vòm
        if (!isP1Doorway) {
          this.camera.position.x = Math.max(-34.2, currX);
        }
      }

      if (this.camera.position.x < -34.5 && this.camera.position.x > -62.0 && currZ > 3.5 && currZ < 34.5) {
        // Đang ở trong phòng P01: Chặn các bức tường biên
        if (this.camera.position.x < -60.8) this.camera.position.x = -60.8;
        if (this.camera.position.z < 4.8) this.camera.position.z = 4.8;
        if (this.camera.position.z > 33.2) this.camera.position.z = 33.2;
      }

      // 2. KHU VỰC PHÒNG 02 (NAM QUỐC SƠN HÀ): X in [-61.1, -34.5], Z in [-33.5, -4.5]
      // Cửa vòm tại X = -34.5, khe Z in [-22.2, -15.8]
      const isInP2_XZ = (currX < -34.5 && currX > -62.0 && currZ < -3.5 && currZ > -34.5);
      const wasInP2_XZ = (prevX < -34.5 && prevX > -62.0 && prevZ < -3.5 && prevZ > -34.5);
      const isP2Doorway = (currZ >= -22.4 && currZ <= -15.6);

      if (wasInP2_XZ && !isInP2_XZ) {
        // Đang ở trong P02 muốn đi ra sảnh: Chỉ được qua cửa vòm
        if (!isP2Doorway) {
          this.camera.position.x = Math.min(-34.8, currX);
        }
      } else if (!wasInP2_XZ && isInP2_XZ) {
        // Ngoài sảnh muốn vào P02: Chỉ được qua cửa vòm
        if (!isP2Doorway) {
          this.camera.position.x = Math.max(-34.2, currX);
        }
      }

      if (this.camera.position.x < -34.5 && this.camera.position.x > -62.0 && currZ < -3.5 && currZ > -34.5) {
        // Đang ở trong phòng P02: Chặn các bức tường biên
        if (this.camera.position.x < -60.8) this.camera.position.x = -60.8;
        if (this.camera.position.z > -4.8) this.camera.position.z = -4.8;
        if (this.camera.position.z < -33.2) this.camera.position.z = -33.2;
      }
    }

    // Giới hạn biên an toàn chung bảo tàng
    const maxBound = 140.0;
    this.camera.position.x = Math.max(-maxBound, Math.min(maxBound, this.camera.position.x));
    this.camera.position.z = Math.max(-maxBound, Math.min(maxBound, this.camera.position.z));
  }

  /**
   * GIỚI HẠN BIÊN BẢN ĐỒ & CHỐNG RƠI KHỎI THẾ GIỚI (CLIPPING PREVENTION)
   * Áp dụng khi ở Thế giới Truyện Kiều (Y > 100.0m) hoặc Thế giới Như Nguyệt, và Sảnh Bảo Tàng.
   */
  applyClippingPrevention() {
    if (!this.camera) return;
    const currX = this.camera.position.x;
    const currY = this.camera.position.y;
    const currZ = this.camera.position.z;

    // 0. CÕI SƠN TINH - THỦY TINH (TÁCH BIỆT TẠI TỌA ĐỘ X >= 4000, Z >= 4000)
    const isSonTinhRealm = (currX >= 4000.0 && currZ >= 4000.0) || 
      (typeof window !== 'undefined' && (window.__stttRealmActive || (window.__activeScene && window.__activeScene === window.__sonTinhThuyTinhScene)));
    
    if (isSonTinhRealm) {
      const deckCenterX = 5000.0;
      const deckCenterZ = 5088.0;
      const dx = currX - deckCenterX;
      const dz = currZ - deckCenterZ;
      const dist = Math.hypot(dx, dz);
      const maxDeckRadius = 7.6; // Bán kính đài hoa sen 8m có gờ lan can an toàn
      if (dist > maxDeckRadius && dist > 0.0001) {
        this.camera.position.x = deckCenterX + (dx / dist) * maxDeckRadius;
        this.camera.position.z = deckCenterZ + (dz / dist) * maxDeckRadius;
      }
      const minWorldY = 36.0 + this.eyeHeight;
      if (this.camera.position.y < minWorldY) {
        this.camera.position.y = minWorldY;
        this.velocity.y = 0;
        this.isOnGround = true;
      }
      return;
    }

    // A. THẾ GIỚI TRUYỆN TRÊN CAO (Y > 100.0m)
    if (currY > 100.0) {
      // 0. CÁC ĐẠI CẢNH CÕI VĂN HỌC TRÊN CAO (Y >= 350.0m)
      if (currY >= 350.0) {
        let minX = -130.0;
        let maxX = 130.0;
        let minZ = -580.0;
        let maxZ = -320.0;

        // 0.1. Cõi Truyện Kiều (TK_REALM_ORIGIN: X = 0, Y = 420, Z = +450 | Đài quan sát: 0, 424.2, +484)
        if (currZ > 100.0) {
          minX = -180.0;
          maxX = 180.0;
          minZ = 280.0;
          maxZ = 620.0;
        }
        // 0.2. Cõi Vợ Nhặt (VN_REALM_ORIGIN: X = -260, Y = 420, Z = -450 | Đài quan sát: -260, 424, -418)
        else if (currX < -130.0) {
          minX = -390.0;
          maxX = -130.0;
          minZ = -580.0;
          maxZ = -320.0;
        }
        // 0.3. Cõi An Dương Vương (ADV_REALM_ORIGIN: X = +260, Y = 420, Z = -450 | Đài quan sát: +260, 424, -418)
        else if (currX > 130.0) {
          minX = 130.0;
          maxX = 390.0;
          minZ = -580.0;
          maxZ = -320.0;
        }
        // 0.4. Cõi Sơn Tinh - Thủy Tinh (REALM_ORIGIN: X = 0, Y = 420, Z = -450 | Đài quan sát: 0, 424, -416)
        else {
          minX = -130.0;
          maxX = 130.0;
          minZ = -580.0;
          maxZ = -320.0;
        }

        this.camera.position.x = Math.max(minX, Math.min(maxX, currX));
        this.camera.position.z = Math.max(minZ, Math.min(maxZ, currZ));

        const minWorldY = 415.0 + this.eyeHeight;
        if (this.camera.position.y < minWorldY) {
          const floorH = this.getFloorHeightAt(this.camera.position.x, this.camera.position.z);
          this.camera.position.y = Math.max(minWorldY, floorH + this.eyeHeight);
          this.velocity.y = 0;
          this.isOnGround = true;
        }
        return;
      }

      // 1. Cõi Như Nguyệt (X in [250, 390])
      if (currX >= 250.0 && currX <= 390.0) {
        const minX = 272.0;
        const maxX = 368.0;
        const minZ = -2.5;
        const maxZ = 34.0;
        this.camera.position.x = Math.max(minX, Math.min(maxX, currX));
        this.camera.position.z = Math.max(minZ, Math.min(maxZ, currZ));
      } else {
        // 2. Cõi Kiều (X quanh -140 đến 140, Z quanh 0)
        // worldBound = 180.0 bao trọn 3 phân cảnh (Zone 1: X=0, Zone 2: X=-140, Zone 3: X=140)
        const worldBound = 180.0;
        this.camera.position.x = Math.max(-worldBound, Math.min(worldBound, currX));
        this.camera.position.z = Math.max(-worldBound, Math.min(worldBound, currZ));
      }

      // Giới hạn cao độ tối thiểu: Chặn tuyệt đối không cho rơi xuống dưới cao độ mặt đất thế giới truyện (minY = 140.0)
      const minWorldY = 140.0 + this.eyeHeight;
      if (this.camera.position.y < minWorldY) {
        const floorH = this.getFloorHeightAt(this.camera.position.x, this.camera.position.z);
        this.camera.position.y = Math.max(minWorldY, floorH + this.eyeHeight);
        this.velocity.y = 0;
        this.isOnGround = true;
      }
      return;
    }

    // B. SẢNH BẢO TÀNG (DƯỚI ĐẤT)
    const maxBound = 140.0;
    this.camera.position.x = Math.max(-maxBound, Math.min(maxBound, currX));
    this.camera.position.z = Math.max(-maxBound, Math.min(maxBound, currZ));

    if (this.mode === CAMERA_MODES.WALKER && this.camera.position.y < this.eyeHeight) {
      this.camera.position.y = this.eyeHeight;
      this.velocity.y = 0;
      this.isOnGround = true;
    }
  }

  destroy() {
    try {
      window.removeEventListener('keydown', this.onKeyDown);
      window.removeEventListener('keyup', this.onKeyUp);
      this.domElement?.removeEventListener?.('click', this.onCanvasClick);
      this.controls?.dispose?.();
      this.hintElement?.remove?.();
    } catch (e) {}
  }
}