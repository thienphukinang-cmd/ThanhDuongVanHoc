import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

/**
 * CAMERA CONTROLLER MODULE (DUAL CAMERA SYSTEM)
 * Skills: threejs-camera-direction
 * 
 * Tích hợp 2 Chế độ Điều khiển:
 * - CHẾ ĐỘ 1: First-Person Walker (Đi bộ tầm mắt 1.8m, trọng lực, khóa sàn)
 * - CHẾ ĐỘ 2: Freecam (Bay tự do theo hướng nhìn, Space bay lên, Shift hạ xuống, không giới hạn va chạm)
 * - Cơ chế chuyển đổi phím 'V' hoặc UI button kèm Console log
 * - Áp dụng Lập trình phòng ngừa (Defensive Programming & Try...Catch)
 */

export const CAMERA_MODES = {
  WALKER: 'walker',
  FREECAM: 'freecam'
};

/**
 * SPATIAL COLLISION GRID (PHÂN VÙNG KHÔNG GIAN O(1) CHO VA CHẠM)
 * Chia mặt phẳng XZ thành các ô lưới kích thước 8m x 8m.
 * Thay vì duyệt for toàn bộ đối tượng mỗi khung hình, chỉ kiểm tra các đối tượng
 * nằm trong các ô lưới lân cận người chơi.
 * Khi ở hành lang hoặc cầu thang không có vật cản, trả về 0 đối tượng ngay tức khắc O(1).
 */
class SpatialCollisionGrid {
  constructor(cellSize = 8.0) {
    this.cellSize = cellSize;
    this.grid = new Map();
    this.allObjects = [];
  }

  clear() {
    this.grid.clear();
    this.allObjects = [];
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
    // Bán kính hình cầu bao 2D trên mặt phẳng XZ
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

    const candidates = [];
    const seen = new Set();

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

    // Cấu hình tốc độ & vật lý an toàn (Defensive Fallbacks)
    this.walkSpeed = options?.walkSpeed ?? 10.0;     // m/s
    this.flySpeed = options?.flySpeed ?? 22.0;       // m/s
    this.eyeHeight = options?.eyeHeight ?? 1.8;      // 1.8m
    this.gravity = options?.gravity ?? 24.0;         // m/s^2
    this.jumpForce = options?.jumpForce ?? 8.5;      // m/s

    // Trạng thái hiện tại (Mặc định: WALKER)
    this.mode = options?.initialMode ?? CAMERA_MODES.WALKER;
    this.isEnabled = true;

    // Trạng thái bàn phím
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      up: false,       // Space
      down: false,     // Shift
    };

    // Vector tính toán tái sử dụng (Tránh Garbage Collection)
    this.velocity = new THREE.Vector3();
    this._forward = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._moveDir = new THREE.Vector3();
    this.isOnGround = true;

    // HỆ THỐNG XỬ LÝ VA CHẠM THÔNG MINH (Smart Box3 Slide & Push Collision)
    this.collisionObjects = [];
    this.stairObjects = [];
    this.playerRadius = 0.25; // Bán kính hình hộp cơ thể 25cm (rộng 50cm, lọt qua mọi cửa vòm)
    this._playerBox = new THREE.Box3();
    this._testBoxX = new THREE.Box3();
    this._testBoxZ = new THREE.Box3();
    this._testBoxXZ = new THREE.Box3();
    this._objBox = new THREE.Box3();
    this.lastCollisionVector = new THREE.Vector3(0, 0, 1);
    this.stuckFrameCount = 0;

    // THIẾT LẬP BIÊN GIỚI TƯỜNG CỨNG AABB PHÒNG 01 CÓ KHOÉT CỬA RA VÀO (Doorway Gap Clamping)
    this.room01Bounds = {
      minX: -11.2,    // Giới hạn trục X (Chiều ngang) tối thiểu
      maxX: 11.2,     // Giới hạn trục X (Chiều ngang) tối đa
      minZ: -12.0,    // Giới hạn trục Z (Chiều dọc) tối thiểu
      maxZ: 12.0,     // Giới hạn trục Z (Chiều dọc) tối đa
      doorMinX: -2.0, // Mép trái ô cửa mở (trục X)
      doorMaxX: 2.0   // Mép phải ô cửa mở (trục X)
    };

    // HỆ THỐNG PHÂN VÙNG KHÔNG GIAN SPATIAL GRID O(1) CHO VA CHẠM
    this.spatialGrid = new SpatialCollisionGrid(8.0);

    // DANH SÁCH HITBOX THỦ CÔNG CHUẨN XÁC ÔM SÁT VẬT CẢN (Accurate Prop & Wall Hitboxes)
    this.customHitboxes = [];
    this.initAccurateCustomHitboxes();

    // Callbacks
    this.onModeChange = null;

    // Trạng thái Cinematic Fast-Travel 1.8s power2.inOut
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

    try {
      this.initControls();
      this.initEventListeners();
      this.createHUDIndicator();
      console.log(`%c[CAMERA CONTROLLER] Khởi tạo thành công • Chế độ: ${this.mode.toUpperCase()}`, "color: #39e58c; font-weight: bold;");
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo CameraController:", err);
    }
  }

  initControls() {
    if (!this.camera) return;

    try {
      this.controls = new PointerLockControls(this.camera, this.domElement);

      this.controls.addEventListener('lock', () => {
        this.updateLockHint(true);
      });

      this.controls.addEventListener('unlock', () => {
        this.updateLockHint(false);
      });
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
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 1000;
            background: rgba(12, 16, 24, 0.88);
            border: 1px solid rgba(212, 175, 55, 0.45);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            color: #f0f3f6;
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
            font-size: 12px;
            padding: 8px 18px;
            border-radius: 24px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            gap: 12px;
            pointer-events: auto;
            user-select: none;
            transition: all 0.25s ease;
          }

          .mode-badge-indicator {
            background: rgba(212, 175, 55, 0.25);
            border: 1px solid #d4af37;
            color: #ffe082;
            padding: 3px 8px;
            border-radius: 12px;
            font-weight: 700;
            font-size: 10.5px;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }

          .mode-controls-guide {
            color: #9bb4c9;
            font-size: 11.5px;
          }

          .key-badge {
            background: rgba(255, 255, 255, 0.12);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: #fff;
            padding: 1px 5px;
            border-radius: 4px;
            font-family: monospace;
            font-weight: bold;
          }
        </style>
        <span class="mode-badge-indicator" id="mode-text-badge">WALKER (ĐI BỘ)</span>
        <span class="mode-controls-guide" id="mode-guide-text">
          <span class="key-badge">WASD</span> Di chuyển • <span class="key-badge">V</span> Đổi Freecam • <span class="key-badge">R</span> Thoát kẹt • Click khóa chuột
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
      if (this.mode === CAMERA_MODES.WALKER) {
        guide.innerHTML = `<span class="key-badge">WASD</span> Đi bộ • <span class="key-badge">SPACE</span> Nhảy • <span class="key-badge">V</span> Đổi Freecam • <span class="key-badge">R</span> Thoát kẹt • <span class="key-badge">ESC</span> Mở chuột`;
      } else {
        guide.innerHTML = `<span class="key-badge">WASD</span> Bay • <span class="key-badge">SPACE</span> Bay lên • <span class="key-badge">SHIFT</span> Hạ xuống • <span class="key-badge">V</span> Đổi Walker • <span class="key-badge">R</span> Thoát kẹt • <span class="key-badge">ESC</span> Mở chuột`;
      }
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
        badge.style.background = "rgba(57, 229, 140, 0.2)";
      } else {
        badge.textContent = "FREECAM (BAY TỰ DO)";
        badge.style.borderColor = "#ffd700";
        badge.style.color = "#ffe082";
        badge.style.background = "rgba(212, 175, 55, 0.25)";
      }
    }
    this.updateLockHint(this.controls?.isLocked ?? false);
  }

  initEventListeners() {
    this.onKeyDown = (e) => {
      // Khóa tuyệt đối input khi đang lướt Fast-Travel
      if (this.isFastTraveling) return;

      try {
        switch (e.code) {
          case 'KeyW':
          case 'ArrowUp':
            this.keys.forward = true;
            break;
          case 'KeyS':
          case 'ArrowDown':
            this.keys.backward = true;
            break;
          case 'KeyA':
          case 'ArrowLeft':
            this.keys.left = true;
            break;
          case 'KeyD':
          case 'ArrowRight':
            this.keys.right = true;
            break;
          case 'Space':
            this.keys.up = true;
            // Nhảy ở chế độ Walker
            if (this.mode === CAMERA_MODES.WALKER && this.isOnGround) {
              this.velocity.y = this.jumpForce;
              this.isOnGround = false;
            }
            e.preventDefault();
            break;
          case 'ShiftLeft':
          case 'ShiftRight':
            this.keys.down = true;
            break;
          case 'KeyV':
            // Chuyển đổi qua lại giữa 2 chế độ
            this.toggleMode();
            break;
          case 'KeyR':
            // Thoát kẹt khẩn cấp (Emergency Unstick)
            this.emergencyUnstick();
            break;
        }
      } catch (err) {
        // Defensive key handling
      }
    };

    this.onKeyUp = (e) => {
      if (this.isFastTraveling) return;

      try {
        switch (e.code) {
          case 'KeyW':
          case 'ArrowUp':
            this.keys.forward = false;
            break;
          case 'KeyS':
          case 'ArrowDown':
            this.keys.backward = false;
            break;
          case 'KeyA':
          case 'ArrowLeft':
            this.keys.left = false;
            break;
          case 'KeyD':
          case 'ArrowRight':
            this.keys.right = false;
            break;
          case 'Space':
            this.keys.up = false;
            break;
          case 'ShiftLeft':
          case 'ShiftRight':
            this.keys.down = false;
            break;
        }
      } catch (err) {}
    };

    // Click vào canvas để kích hoạt PointerLock
    this.onCanvasClick = (e) => {
      try {
        // Không lock chuột khi đang fast-travel hoặc click vào UI/HUD/Modal
        if (this.isFastTraveling) return;
        if (e.target?.closest?.('#director-hud') || 
            e.target?.closest?.('#portal-modal-overlay') ||
            e.target?.closest?.('#directory-hud-modal') ||
            e.target?.closest?.('#directory-hud-toggle-btn') ||
            e.target?.closest?.('#literature-summary-panel')) {
          return;
        }
        if (this.isEnabled && this.controls && !this.controls.isLocked) {
          this.controls.lock();
        }
      } catch (err) {
        console.warn("[SELF-HEALING] Lỗi gọi controls.lock():", err);
      }
    };

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.domElement?.addEventListener?.('click', this.onCanvasClick);
  }

  /**
   * 2. CƠ CHẾ CHUYỂN ĐỔI (TOGGLE MECHANISM) PHÍM V
   */
  toggleMode() {
    if (this.mode === CAMERA_MODES.WALKER) {
      this.mode = CAMERA_MODES.FREECAM;
      console.log("%cMode: Freecam Activated", "color: #ffd700; font-weight: bold; font-size: 13px;");
    } else {
      this.mode = CAMERA_MODES.WALKER;
      console.log("%cMode: First-Person Walker Activated", "color: #39e58c; font-weight: bold; font-size: 13px;");
      // Khi trở lại walker, đảm bảo vị trí Y không bị chìm dưới sàn
      if (this.camera && this.camera.position.y < this.eyeHeight) {
        this.camera.position.y = this.eyeHeight;
      }
      this.velocity.set(0, 0, 0);
    }

    this.updateHUDText();

    try {
      this.onModeChange?.(this.mode);
    } catch (e) {}
  }

  /**
   * 3. CƠ CHẾ THOÁT HIỂM KHẨN CẤP (EMERGENCY UNSTICK) - PHÍM R
   * Teleport người chơi về vị trí an toàn giữa sảnh chính (0, 1.8, 32),
   * triệt tiêu gia tốc rơi tự do và phục hồi ngay lập tức quyền di chuyển tự do.
   */
  emergencyUnstick() {
    if (!this.camera) return;
    this.camera.position.set(0, this.eyeHeight, 32);
    this.velocity.set(0, 0, 0);
    this.isOnGround = true;
    this.stuckFrameCount = 0;
    this.camera.lookAt(0, this.eyeHeight + 1.0, 0);
    console.log("%c[EMERGENCY UNSTICK] Phím R: Đã giải cứu người chơi về tâm sảnh chính an toàn (0, 1.8, 32)!", "color: #ff9800; font-weight: bold; font-size: 13px;");
  }

  setMode(mode) {
    if (mode === CAMERA_MODES.WALKER || mode === CAMERA_MODES.FREECAM) {
      this.mode = mode;
      console.log(`%cMode: ${this.mode === CAMERA_MODES.WALKER ? 'First-Person Walker' : 'Freecam'} Activated`, "color: #39e58c; font-weight: bold;");
      this.updateHUDText();
      this.onModeChange?.(this.mode);
    }
  }

  /**
   * ĐỊNH NGHĨA KÍCH THƯỚC BOX3 THỦ CÔNG VỪA KHÍT VỚI THỰC TẾ (Accurate Prop & Wall Hitboxes)
   * - Án thư (an_thu.glb): Dài ~2.4m, Rộng ~0.8m, Cao ~0.9m
   * - Bình phong (binh_phong.glb): Mỏng đúng bề dày ~0.25m, Dài ~5.0m, Cao ~3.2m
   * - Bục sách trung tâm: Ôm sát thân bục ~1.8m x 1.8m, Cao ~0.45m
   * - Cột nhà: 8 cột gỗ lim ôm sát thân cột bán kính 0.35m
   */
  initAccurateCustomHitboxes() {
    this.customHitboxes = [];

    // =========================================================================
    // 1. ÁN THƯ CỔ (an_thu.glb): World Space (Tâm phòng X = -48.0, Y = 10.0, Z = 19.0)
    // =========================================================================
    this.customHitboxes.push({
      name: 'Án thư cổ (World)',
      isWorld: true,
      box: new THREE.Box3(
        new THREE.Vector3(-50.9, 10.08, 17.8),
        new THREE.Vector3(-50.1, 10.98, 20.2)
      )
    });

    // =========================================================================
    // 2. BÌNH PHONG GỖ (binh_phong.glb): World Space: Tâm X = -52.2m, Y = 11.68m, Z = 19.0m
    // =========================================================================
    this.customHitboxes.push({
      name: 'Bình phong gỗ (World)',
      isWorld: true,
      box: new THREE.Box3(
        new THREE.Vector3(-52.325, 10.08, 16.5),
        new THREE.Vector3(-52.075, 13.28, 21.5)
      )
    });

    // =========================================================================
    // 3. BỤC SÁCH TRUNG TÂM: World Space: Tâm X = -48.0m, Z = 19.0m
    // =========================================================================
    this.customHitboxes.push({
      name: 'Bục sách trung tâm (World)',
      isWorld: true,
      box: new THREE.Box3(
        new THREE.Vector3(-48.9, 10.08, 18.1),
        new THREE.Vector3(-47.1, 10.53, 19.9)
      )
    });

    // =========================================================================
    // 4. 8 CỘT GỖ LIM PHÒNG 01: World Space
    // =========================================================================
    const colZLocal = [10.0, 4.0, -2.0, -8.0];
    [-11.2, 11.2].forEach(colX => {
      colZLocal.forEach((colZ, idx) => {
        const worldX = -48.0 + colZ;
        const worldZ = 19.0 - colX;
        this.customHitboxes.push({
          name: `Cột gỗ lim World ${colX > 0 ? 'Phải' : 'Trái'} #${idx + 1}`,
          isWorld: true,
          box: new THREE.Box3(
            new THREE.Vector3(worldX - 0.35, 10.08, worldZ - 0.35),
            new THREE.Vector3(worldX + 0.35, 18.08, worldZ + 0.35)
          )
        });
      });
    });

    // TÍNH TOÁN TRƯỚC TÂM HỘP VÀ ĐƯA VÀO SPATIAL PARTITIONING GRID O(1)
    if (!this.spatialGrid) {
      this.spatialGrid = new SpatialCollisionGrid(8.0);
    }
    for (let i = 0; i < this.customHitboxes.length; i++) {
      const it = this.customHitboxes[i];
      if (it.box) {
        it.center = new THREE.Vector3();
        it.box.getCenter(it.center);
        this.spatialGrid.insert(it);
      }
    }
  }

  /**
   * CẤU HÌNH HỆ THỐNG VA CHẠM THỰC THỂ (CLEANED PERIMETER WALLS & PROPS)
   */
  setCollisionObjects(collisionObjects = [], stairObjects = []) {
    const isExcluded = (name = '') => {
      const n = (name || '').toLowerCase();
      return n.includes('arched') || n.includes('arch') || 
             n.includes('door') || n.includes('facade') || 
             n.includes('floor') || n.includes('runner') ||
             n.includes('carpet') || n.includes('ground') ||
             n.includes('godray') || n.includes('glassdisc') ||
             n.includes('oculus') || n.includes('fin') ||
             n.includes('den_long') || n.includes('lantern') ||
             n.includes('cord') || n.includes('binh_gom') ||
             n.includes('cay_hoa_dao') || n.includes('dan_ty_ba') ||
             n.includes('instanced') || n.includes('light') || 
             n.includes('vfx') || n.includes('particle') || 
             n.includes('helper') || n.includes('trim') || 
             n.includes('baseboard') || n.includes('stair') ||
             n.includes('tread') || n.includes('baluster');
    };

    const isWallOrBoundary = (name = '') => {
      const n = (name || '').toLowerCase();
      return n.includes('wall') || n.includes('pedestal');
    };

    this.collisionObjects = [];
    if (!this.spatialGrid) {
      this.spatialGrid = new SpatialCollisionGrid(8.0);
    } else {
      this.spatialGrid.clear();
    }

    // Nạp lại các custom hitboxes chuẩn xác vào spatial grid
    (this.customHitboxes || []).forEach(hb => {
      this.spatialGrid.insert(hb);
    });

    (collisionObjects || []).forEach(obj => {
      if (obj && !isExcluded(obj.name) && isWallOrBoundary(obj.name) && !obj.userData?.excludeFromCollision) {
        this.addCollisionObject(obj);
      }
    });

    if (Array.isArray(stairObjects) && stairObjects.length > 0) {
      this.stairObjects = stairObjects;
    }

    console.log(`%c[CAMERA CONTROLLER] Đã nạp ${this.collisionObjects.length} đối tượng va chạm & ${this.customHitboxes.length} hitbox thủ công vào Spatial Grid.`, "color: #39e58c; font-weight: bold;");
  }

  addCollisionObject(obj) {
    if (!obj || obj.userData?.excludeFromCollision) return;
    const isExcluded = (name = '') => {
      const n = (name || '').toLowerCase();
      return n.includes('arched') || n.includes('arch') || 
             n.includes('door') || n.includes('facade') || 
             n.includes('floor') || n.includes('runner') ||
             n.includes('carpet') || n.includes('ground') ||
             n.includes('godray') || n.includes('glassdisc') ||
             n.includes('oculus') || n.includes('fin') ||
             n.includes('den_long') || n.includes('lantern') ||
             n.includes('cord') || n.includes('binh_gom') ||
             n.includes('cay_hoa_dao') || n.includes('dan_ty_ba') ||
             n.includes('instanced') || n.includes('light') || 
             n.includes('vfx') || n.includes('particle') || 
             n.includes('helper') || n.includes('trim') || 
             n.includes('baseboard') || n.includes('stair') ||
             n.includes('tread') || n.includes('baluster');
    };

    const isWallOrBoundary = (name = '') => {
      const n = (name || '').toLowerCase();
      return n.includes('wall') || n.includes('pedestal');
    };

    if (Array.isArray(obj)) {
      obj.forEach(item => this.addCollisionObject(item));
      return;
    }

    const addMesh = (m) => {
      if (!m || m.userData?.excludeFromCollision) return;
      if ((m.isMesh || m.userData?.worldAABB) && !isExcluded(m.name) && isWallOrBoundary(m.name) && !this.collisionObjects.includes(m)) {
        if (m.updateMatrixWorld) m.updateMatrixWorld(true);
        let aabb = m.userData?.worldAABB;
        if (!aabb && m.isMesh && m.geometry) {
          aabb = new THREE.Box3().setFromObject(m);
        }
        if (aabb) {
          const size = new THREE.Vector3();
          aabb.getSize(size);
          // Loại bỏ mọi vật thể có bounding box quá rộng ở cả 2 trục ngang (tránh lỗi composite box)
          if (size.x > 35 && size.z > 35) {
            return;
          }
          const center = new THREE.Vector3();
          aabb.getCenter(center);
          m.userData = m.userData || {};
          m.userData.worldAABB = aabb;
          m.userData.center = center;
          this.collisionObjects.push(m);

          // Đăng ký trực tiếp vào Spatial Partitioning Grid O(1)
          if (!this.spatialGrid) this.spatialGrid = new SpatialCollisionGrid(8.0);
          this.spatialGrid.insert({
            box: aabb,
            center: center,
            name: m.name,
            userData: m.userData
          });
        }
      }
    };

    if (obj.isMesh || obj.userData?.worldAABB) {
      addMesh(obj);
    } else if (obj.traverse) {
      obj.traverse(addMesh);
    }
  }

  /**
   * TẠO HỘP BAO THREE.Box3 CHO NGƯỜI CHƠI TẠI VỊ TRÍ (posX, posY, posZ)
   * Bán kính r = 0.25m, cao độ từ chân (+0.35m để không vấp mép thảm/sàn) đến đỉnh đầu (+0.1m)
   */
  getPlayerBoxAt(posX, posY, posZ, targetBox) {
    const r = this.playerRadius || 0.25;
    const footY = posY - this.eyeHeight + 0.35;
    const headY = posY + 0.1;
    targetBox.min.set(posX - r, footY, posZ - r);
    targetBox.max.set(posX + r, headY, posZ + r);
    return targetBox;
  }

  /**
   * KIỂM TRA VA CHẠM VẬT CẢN (OBSTACLE HITBOXES: ÁN THƯ, BÌNH PHONG, BỤC SÁCH, CỘT, BỆ ĐÁ)
   * - Áp dụng Spatial Partitioning Grid O(1): Chỉ kiểm tra các ô lưới lân cận.
   * - Proximity BoundingSphere Culling O(1): Loại bỏ 100% việc quét toàn bộ scene.
   */
  isObstacleBlocked(testBox, currentBox = null) {
    const isMuseumRoom01 = (testBox.min.x <= -28.0 && testBox.max.x >= -66.0 && testBox.min.z <= 36.0 && testBox.max.z >= 2.0);
    const testCenterX = (testBox.min.x + testBox.max.x) * 0.5;
    const testCenterZ = (testBox.min.z + testBox.max.z) * 0.5;
    const maxSearchRadius = 3.5;
    const maxProximityDistSq = maxSearchRadius * maxSearchRadius;

    // SPATIAL PARTITIONING GRID QUERY O(1):
    // Chỉ truy vấn các vật thể trong bán kính gần nhân vật, hoàn toàn không quét toàn bộ scene
    const candidates = this.spatialGrid
      ? this.spatialGrid.queryNear(testCenterX, testCenterZ, maxSearchRadius)
      : this.customHitboxes;

    if (!candidates || candidates.length === 0) return false;

    for (let i = 0; i < candidates.length; i++) {
      const item = candidates[i];
      if (!item || !item.box) continue;

      if (item.isWorld && !isMuseumRoom01) continue;

      // Proximity Bounding Sphere Culling O(1):
      if (item.center) {
        const dSq = (testCenterX - item.center.x) ** 2 + (testCenterZ - item.center.z) ** 2;
        const rSq = item.radiusSq || 1.0;
        if (dSq > rSq + maxProximityDistSq) continue;
      }

      const box = item.box;

      if (testBox.intersectsBox(box)) {
        // Thoát kẹt thông minh (Smart Unstick)
        if (currentBox && currentBox.intersectsBox(box)) {
          const centerX = (box.min.x + box.max.x) * 0.5;
          const centerZ = (box.min.z + box.max.z) * 0.5;
          const currDistSq = ((currentBox.min.x + currentBox.max.x) * 0.5 - centerX) ** 2 +
                             ((currentBox.min.z + currentBox.max.z) * 0.5 - centerZ) ** 2;
          const newDistSq = ((testBox.min.x + testBox.max.x) * 0.5 - centerX) ** 2 +
                            ((testBox.min.z + testBox.max.z) * 0.5 - centerZ) ** 2;

          if (newDistSq > currDistSq + 0.00001) {
            continue; // Đang bước ra xa -> không chặn
          }
        }

        return true; // Bị chặn!
      }
    }

    return false;
  }

  checkObstacleCollision(testBox, currentBox = null) {
    return this.isObstacleBlocked(testBox, currentBox) ? { box: testBox } : null;
  }

  checkCylinderCollision(posX, posY, posZ) {
    this.getPlayerBoxAt(posX, posY, posZ, this._testBoxXZ);
    return !!this.checkObstacleCollision(this._testBoxXZ);
  }

  checkMovementCollision(startX, startY, startZ, deltaX, deltaZ) {
    this.getPlayerBoxAt(startX + deltaX, startY, startZ + deltaZ, this._testBoxXZ);
    return !!this.checkObstacleCollision(this._testBoxXZ);
  }

  /**
   * CẬP NHẬT HỆ THỐNG CAO ĐỘ SÀN & BÁM BẬC THANG CẦU THANG CHỮ Y (Stair Height & Snapping)
   * Sử dụng công thức bậc thang tuyến tính và kiểm tra vùng không gian của từng bậc/chiếu nghỉ.
   * Ngăn chặn tuyệt đối tình trạng lọt xuống dưới hoặc giật cục khi leo thang.
   */
  getFloorHeightAt(x = 0, z = 0) {
    // 0. Provider độ cao thế giới tự sự / không gian biệt lập trên cao (Truyện Kiều Y = 150m)
    if (typeof this.floorHeightProvider === 'function') {
      try {
        return this.floorHeightProvider(x, z);
      } catch (e) {
        return 0.0;
      }
    }

    const currentY = this.camera?.position?.y ?? this.eyeHeight;
    const footY = currentY - this.eyeHeight;

    // -------------------------------------------------------------------------
    // A. CẦU THANG CHỮ Y TẦNG 1 -> TẦNG 2 (Y = 0.0m -> 10.0m)
    // -------------------------------------------------------------------------
    // 1. Chiếu nghỉ Tầng 1 -> Tầng 2 (Bán kính 5.2m tại tâm X=0, Z=7.5m, Y=5.0m)
    const distSqLanding1 = x * x + (z - 7.5) * (z - 7.5);
    if (distSqLanding1 <= 27.04) {
      if (footY >= 2.5 && footY <= 7.8) {
        return 5.0;
      }
    }

    // 2. Nhánh Trung Tâm Tầng 1 (Central Flight L1): Từ Z=24.5 (Y=0) lên Z=7.5 (Y=5.0), |X| <= 3.4m
    if (Math.abs(x) <= 3.4 && z >= 7.2 && z <= 24.8) {
      if (footY >= -0.5 && footY <= 6.8) {
        const t = Math.max(0.0, Math.min(1.0, (24.5 - z) / 17.0));
        return 0.0 + t * 5.0;
      }
    }

    // 3. Nhánh Cánh Tây Tầng 2 (West Wing L2): Từ Landing (X=-1.8, Z=6.5, Y=5.0) lên Tầng 2 (X=-22.0, Z=15.5, Y=10.0)
    if (x <= -1.5 && x >= -24.5 && z >= 5.0 && z <= 18.0) {
      if (footY >= 3.8 && footY <= 12.0) {
        const t = Math.max(0.0, Math.min(1.0, (-x - 1.8) / 20.2));
        return 5.0 + t * 5.0;
      }
    }

    // 4. Nhánh Cánh Đông Tầng 2 (East Wing L2): Từ Landing (X=1.8, Z=6.5, Y=5.0) lên Tầng 2 (X=22.0, Z=15.5, Y=10.0)
    if (x >= 1.5 && x <= 24.5 && z >= 5.0 && z <= 18.0) {
      if (footY >= 3.8 && footY <= 12.0) {
        const t = Math.max(0.0, Math.min(1.0, (x - 1.8) / 20.2));
        return 5.0 + t * 5.0;
      }
    }

    // -------------------------------------------------------------------------
    // B. CẦU THANG CHỮ Y TẦNG 2 -> TẦNG 3 (Y = 10.0m -> 20.0m)
    // -------------------------------------------------------------------------
    // 5. Chiếu nghỉ Tầng 2 -> Tầng 3 (Bán kính 5.0m tại tâm X=0, Z=-7.5m, Y=15.0m)
    const distSqLanding2 = x * x + (z - (-7.5)) * (z - (-7.5));
    if (distSqLanding2 <= 27.04) {
      if (footY >= 12.5 && footY <= 17.8) {
        return 15.0;
      }
    }

    // 6. Nhánh Trung Tâm Phía Bắc Tầng 2 (Central Flight L2 North): Từ Z=-24.5 (Y=10.0) lên Z=-7.5 (Y=15.0), |X| <= 3.4m
    if (Math.abs(x) <= 3.4 && z >= -24.8 && z <= -7.2) {
      if (footY >= 8.5 && footY <= 16.8) {
        const t = Math.max(0.0, Math.min(1.0, (z - (-24.5)) / 17.0));
        return 10.0 + t * 5.0;
      }
    }

    // 7. Nhánh Cánh Tây Tầng 3 (West Wing L3): Từ Landing (X=-1.8, Z=-6.5, Y=15.0) lên Tầng 3 (X=-22.0, Z=-15.5, Y=20.0)
    if (x <= -1.5 && x >= -24.5 && z <= -5.0 && z >= -18.0) {
      if (footY >= 13.8 && footY <= 22.0) {
        const t = Math.max(0.0, Math.min(1.0, (-x - 1.8) / 20.2));
        return 15.0 + t * 5.0;
      }
    }

    // 8. Nhánh Cánh Đông Tầng 3 (East Wing L3): Từ Landing (X=1.8, Z=-6.5, Y=15.0) lên Tầng 3 (X=22.0, Z=-15.5, Y=20.0)
    if (x >= 1.5 && x <= 24.5 && z <= -5.0 && z >= -18.0) {
      if (footY >= 13.8 && footY <= 22.0) {
        const t = Math.max(0.0, Math.min(1.0, (x - 1.8) / 20.2));
        return 15.0 + t * 5.0;
      }
    }

    // -------------------------------------------------------------------------
    // C. CÁC KHÔNG GIAN KHÁC: SÀN HÀNH LANG & ĐẠI SẢNH 3 TẦNG
    // -------------------------------------------------------------------------
    // Cầu nối / Chiếu nghỉ tiếp giáp cầu thang với sàn Tầng 2 & Tầng 3
    const isLandingBridgeL2 = (Math.abs(x) >= 19.0 && Math.abs(x) <= 25.0 && z >= 12.0 && z <= 18.5);
    const isLandingBridgeL3 = (Math.abs(x) >= 19.0 && Math.abs(x) <= 25.0 && z >= -18.5 && z <= -12.0);

    // 10. Sàn Tầng 3 (Cao độ sàn 20.0m)
    if (footY >= 16.5 || currentY >= 18.0) {
      if (Math.abs(x) <= 65 && Math.abs(z) <= 65) {
        const insideVoid = Math.abs(x) < 21.5 && Math.abs(z) < 21.5 && !isLandingBridgeL3;
        if (!insideVoid) {
          return 20.0;
        }
      }
    }

    // 11. Sàn Tầng 2 (Cao độ sàn 10.0m)
    if (footY >= 7.5 || currentY >= 9.0) {
      if (Math.abs(x) <= 65 && Math.abs(z) <= 65) {
        const insideVoid = Math.abs(x) < 21.5 && Math.abs(z) < 21.5 && !isLandingBridgeL2;
        if (!insideVoid) {
          return 10.0;
        }
      }
    }

    // 12. Sàn tầng trệt mặc định luôn là 0.0m (Mắt người Y = 1.8m)
    return 0.0;
  }

  setFloorHeightProvider(providerFn) {
    this.floorHeightProvider = (typeof providerFn === 'function') ? providerFn : null;
  }

  /**
   * CƠ CHẾ LƯỚT CAMERA ĐIỆN ẢNH (CINEMATIC FAST-TRAVEL - 1.8s power2.inOut)
   * - Tạm thời khóa input chuột/WASD để tránh xung đột vector điều khiển.
   * - Dịch chuyển camera từ vị trí hiện tại đến điểm quan sát lý tưởng của phòng.
   * - Xoay hướng nhìn (camera.lookAt) tập trung thẳng vào cuốn sách ma thuật.
   * - Mở khóa lại ngay khi đến đích.
   */
  fastTravelTo(targetPos, lookAtTarget, onComplete = null) {
    if (!this.camera || !targetPos || !lookAtTarget) return;

    // Âm thanh lướt gió qua không gian khi Fast-Travel
    this.audioManager?.playWhoosh?.();

    this.isFastTraveling = true;
    this.fastTravelTime = 0.0;
    this.fastTravelDuration = 1.8; // 1.8 giây chuẩn điện ảnh

    // Mở khóa PointerLock nếu đang khóa để trả lại con trỏ tự do
    if (this.controls?.isLocked) {
      try {
        this.controls.unlock();
      } catch (e) {}
    }

    // Reset trạng thái bàn phím và vận tốc tức thời
    this.keys.forward = false;
    this.keys.backward = false;
    this.keys.left = false;
    this.keys.right = false;
    this.keys.up = false;
    this.keys.down = false;
    this.velocity.set(0, 0, 0);

    // Điểm xuất phát và đích đến
    this.travelStartPos.copy(this.camera.position);
    this.travelEndPos.copy(targetPos);

    // Tính hướng nhìn xuất phát
    const currentDir = new THREE.Vector3();
    this.camera.getWorldDirection(currentDir);
    this.travelStartLook.copy(this.camera.position).add(currentDir.multiplyScalar(10.0));
    this.travelEndLook.copy(lookAtTarget);

    this.onFastTravelComplete = onComplete;

    console.log(`%c[FAST-TRAVEL START] Bắt đầu lướt camera điện ảnh 1.8s power2.inOut tới: (${targetPos.x.toFixed(1)}, ${targetPos.y.toFixed(1)}, ${targetPos.z.toFixed(1)})`, "color: #ffd700; font-weight: bold;");
  }

  /**
   * 4. HÀM UPDATE TRONG VÒNG LẶP RENDER (Tính toán delta time mượt mà)
   */
  update(delta = 0.016) {
    if (!this.camera) return;

    // A. XỬ LÝ CINEMATIC FAST-TRAVEL (KHÓA TUYỆT ĐỐI INPUT TRONG 1.8S)
    if (this.isFastTraveling) {
      this.fastTravelTime += delta;
      const progress = Math.min(1.0, this.fastTravelTime / this.fastTravelDuration);

      // Đường cong easing power2.inOut (Quadratic Ease In-Out)
      const ease = progress < 0.5 
        ? 2.0 * progress * progress 
        : 1.0 - Math.pow(-2.0 * progress + 2.0, 2) / 2.0;

      this.camera.position.lerpVectors(this.travelStartPos, this.travelEndPos, ease);
      this.travelCurrentLook.lerpVectors(this.travelStartLook, this.travelEndLook, ease);
      this.camera.lookAt(this.travelCurrentLook);

      if (progress >= 1.0) {
        this.isFastTraveling = false;
        this.camera.position.copy(this.travelEndPos);
        this.camera.lookAt(this.travelEndLook);

        const cb = this.onFastTravelComplete;
        this.onFastTravelComplete = null;
        try {
          cb?.();
        } catch (err) {
          console.warn("[SELF-HEALING] Lỗi callback Fast-Travel:", err);
        }

        console.log("%c[FAST-TRAVEL COMPLETE] Đã hạ cánh tại cự ly quan sát 3.5m ngang tầm sách!", "color: #39e58c; font-weight: bold;");
      }
      return; // Khóa input trong suốt quá trình bay
    }

    if (!this.isEnabled) return;

    // Chỉ nhận phím WASD di chuyển khi PointerLock đang khóa hoặc đang bay
    const isLocked = this.controls?.isLocked ?? false;
    if (!isLocked) return;

    const dt = Math.min(delta, 0.1); // Giới hạn delta chống giật khung hình

    try {
      // -----------------------------------------------------------------------
      // CHẾ ĐỘ 1: FIRST-PERSON WALKER (ĐI BỘ)
      // -----------------------------------------------------------------------
      if (this.mode === CAMERA_MODES.WALKER) {
        // 1. Tính toán hướng di chuyển ngang (Horizontal Plane: Y = 0)
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

          if (!this.prevPos) this.prevPos = new THREE.Vector3();
          this.prevPos.copy(this.camera.position);

          const prevX = this.camera.position.x;
          const prevZ = this.camera.position.z;

          // 1. Di chuyển trực tiếp vị trí camera theo phím bấm
          this.camera.position.x += moveX;
          this.camera.position.z += moveZ;

          // 2. Chặn biên tường bằng cơ chế hoàn nguyên vị trí cũ (Revert to Previous Position)
          this.applyWallBoundaryClamping(prevX, prevZ);

          // 3. Xử lý va chạm vật cản lớn nội thất (án thư, bình phong, bục sách, cột gỗ lim)
          this.handleInteriorObstacleCollision(prevX, prevZ);

          const actualMoveDistSq = (this.camera.position.x - prevX) ** 2 + (this.camera.position.z - prevZ) ** 2;
          const hasMoved = actualMoveDistSq > 0.000001;

          // Âm thanh bước chân nhịp nhàng FPP (tự động đổi âm sắc giữa sàn gạch đá và nền đất cỏ)
          if (this.isOnGround && hasMoved) {
            this.stepDistanceAccumulator = (this.stepDistanceAccumulator || 0) + Math.sqrt(actualMoveDistSq);
            if (this.stepDistanceAccumulator >= 1.7) {
              this.stepDistanceAccumulator = 0;
              const surfaceType = this.floorHeightProvider ? 'grass' : 'stone';
              this.audioManager?.playFootstep?.(surfaceType);
            }
          }
        } else {
          this.stepDistanceAccumulator = 0.6; // Sẵn sàng cho bước đầu tiên khi nhấn phím lại
        }

        // 3. Giả lập trọng lực (Gravity)
        this.velocity.y -= this.gravity * dt;
        this.camera.position.y += this.velocity.y * dt;

        // 4. Giới hạn sàn & raycast bám sát mặt bậc thang (Stair Treads Auto-Snapping)
        const floorHeight = this.getFloorHeightAt(this.camera.position.x, this.camera.position.z);
        const minEyeLevel = floorHeight + this.eyeHeight;

        // Sàn thấp nhất tuyệt đối là tầng trệt (1.8m)
        const absoluteMinY = this.eyeHeight; // 1.8m
        const targetMinY = Math.max(absoluteMinY, minEyeLevel);

        if (this.camera.position.y <= targetMinY) {
          this.camera.position.y = targetMinY;
          this.velocity.y = 0;
          this.isOnGround = true;
        } else if (this.isOnGround && Math.abs(this.camera.position.y - targetMinY) < 0.65) {
          // Ép cao độ Y bám sát mặt phẳng bậc thang theo công thức tuyến tính, không giật cục
          this.camera.position.y = targetMinY;
          this.velocity.y = 0;
        }
      }
      // -----------------------------------------------------------------------
      // CHẾ ĐỘ 2: FREECAM (BAY TỰ DO 3D)
      // -----------------------------------------------------------------------
      else if (this.mode === CAMERA_MODES.FREECAM) {
        // 1. Bay theo hướng nhìn 3D đầy đủ của chuột
        this.camera.getWorldDirection(this._forward); // 3D forward
        this._right.crossVectors(this._forward, this.camera.up).normalize();

        this._moveDir.set(0, 0, 0);
        if (this.keys.forward) this._moveDir.add(this._forward);
        if (this.keys.backward) this._moveDir.sub(this._forward);
        if (this.keys.right) this._moveDir.add(this._right);
        if (this.keys.left) this._moveDir.sub(this._right);

        // Phím Space bay thẳng lên (+Y), Shift hạ thẳng xuống (-Y)
        if (this.keys.up) this._moveDir.y += 1.0;
        if (this.keys.down) this._moveDir.y -= 1.0;

        if (this._moveDir.lengthSq() > 0) {
          this._moveDir.normalize();
        }

        // Tốc độ bay tự do mượt mà, tắt va chạm để bay qua mọi ngóc ngách
        this.camera.position.addScaledVector(this._moveDir, this.flySpeed * dt);
        this.velocity.set(0, 0, 0);
      }

      // -----------------------------------------------------------------------
      // 5. NGĂN NGỪA XUYÊN THỦNG ĐỐI TƯỢNG (CLIPPING PREVENTION)
      // -----------------------------------------------------------------------
      this.applyClippingPrevention();
    } catch (err) {
      console.warn("[SELF-HEALING] Lỗi update CameraController:", err);
    }
  }

  /**
   * CƠ CHẾ CHẶN BIÊN TƯỜNG BẰNG HOÀN NGUYÊN VỊ TRÍ CŨ (REVERT TO PREVIOUS POSITION)
   * - Tuyệt đối không ép tọa độ, không đẩy lùi, không gán số cứng làm dịch chuyển/teleport camera.
   * - Nếu vị trí mới vượt quá ranh giới tường (và không nằm trong vùng cửa vòm), lập tức hoàn nguyên
   *   về vị trí hợp lệ trước đó (prevPos) hoặc giữ nguyên trục bị va chạm.
   * - Tại các ô cửa vòm: cho phép qua lại tự do 100% hai chiều.
   */
  applyWallBoundaryClamping(prevX = null, prevZ = null) {
    if (!this.camera) return;
    if (this.mode !== CAMERA_MODES.WALKER) return; // Freecam bay tự do không chặn tường
    if (prevX === null || prevZ === null) return;
    // Bỏ qua chặn tường nếu đang ở trong thế giới biệt lập trên cao (Truyện Kiều Y = 150m)
    if (this.floorHeightProvider || this.camera.position.y > 30.0) return;

    const currX = this.camera.position.x;
    const currY = this.camera.position.y;
    const currZ = this.camera.position.z;

    // Helper: Kiểm tra một tọa độ (x, z) có vi phạm ranh giới tường Phòng 01 hay không
    const isWallBlocked = (x, z) => {
      // BẢO TÀNG WORLD SPACE (TÂM -48.0, 19.0; TẦNG 2 Y >= 8.0)
      // Chỉ áp dụng khi người chơi đang ở trong hoặc tiếp cận khu vực Phòng 01
      // Tuyệt đối KHÔNG chặn ở đại sảnh, hành lang hay cầu thang chữ Y
      if (currY >= 8.0 && x <= -30.0 && x >= -66.0 && z >= 4.0 && z <= 34.0) {
        const minX = -61.8; // Vách sau / lan can ngắm Tràng An
        const maxX = -34.2; // Mặt trong tường trước giáp sảnh chính
        const minZ = 6.3;   // Vách Bắc (bên trái)
        const maxZ = 31.7;  // Vách Nam (bên phải)
        const doorMinZ = 15.8; // Vòm cửa Indochine rộng 6.4m (19.0 +- 3.2m)
        const doorMaxZ = 22.2;

        const wasInside = (prevX < maxX && prevX > minX && prevZ > minZ && prevZ < maxZ);
        if (wasInside) {
          // Người chơi ở trong phòng bước ra:
          if (x >= maxX) {
            const isAtDoor = (z >= doorMinZ && z <= doorMaxZ);
            if (!isAtDoor) return true; // Chạm tường trước ngoài cửa vòm
          }
          if (x <= minX) return true; // Chạm lan can / vách sau
          if (z <= minZ) return true; // Chạm vách trái
          if (z >= maxZ) return true; // Chạm vách phải
        } else {
          // Người chơi ở ngoài đại sảnh bước vào:
          const wouldBeInside = (x < maxX && x > minX && z > minZ && z < maxZ);
          if (wouldBeInside) {
            const isEnteringDoor = (prevX >= maxX && z >= doorMinZ && z <= doorMaxZ);
            if (!isEnteringDoor) return true; // Cố bước qua tường kín từ ngoài
          }
        }
      }

      return false;
    };

    // Kiểm tra xem vị trí mới có bị cản bởi tường không
    if (!isWallBlocked(currX, currZ)) {
      return; // Không vi phạm, di chuyển bình thường
    }

    // VỊ TRÍ MỚI VI PHẠM TƯỜNG: ÁP DỤNG CƠ CHẾ HOÀN NGUYÊN (REVERT) HOÀN TOÀN KHÔNG DỊCH CHUYỂN
    // 1. Thử giữ nguyên X cũ, cho phép trượt theo Z (nếu Z an toàn):
    if (!isWallBlocked(prevX, currZ)) {
      this.camera.position.x = prevX;
      return;
    }

    // 2. Thử giữ nguyên Z cũ, cho phép trượt theo X (nếu X an toàn):
    if (!isWallBlocked(currX, prevZ)) {
      this.camera.position.z = prevZ;
      return;
    }

    // 3. Nếu cả 2 đều chạm tường, giữ nguyên vị trí cũ (không tiến lên nữa):
    this.camera.position.x = prevX;
    this.camera.position.z = prevZ;
  }

  /**
   * XỬ LÝ VA CHẠM VỚI VẬT CẢN NỘI THẤT (Án thư, Bình phong, Bục sách, Cột gỗ lim)
   * Sử dụng Spatial Partitioning Grid O(1) và rollback vị trí thuần túy.
   * Tuyệt đối không duyệt for toàn bộ scene.
   */
  handleInteriorObstacleCollision(prevX, prevZ) {
    if (!this.spatialGrid || this.spatialGrid.allObjects.length === 0) return;
    // Bỏ qua va chạm nội thất nếu đang ở trong thế giới biệt lập trên cao (Truyện Kiều Y = 150m)
    if (this.floorHeightProvider || this.camera.position.y > 30.0) return;

    const currX = this.camera.position.x;
    const currY = this.camera.position.y;
    const currZ = this.camera.position.z;

    const isMuseum = (currX <= -28.0 && currX >= -66.0 && currZ >= 2.0 && currZ <= 36.0 && currY >= 8.0);
    const maxSearchRadius = 3.5;
    const maxProximitySq = maxSearchRadius * maxSearchRadius;

    // SPATIAL PARTITIONING QUERY O(1):
    // Chỉ lấy các đối tượng trong các ô lưới lân cận người chơi.
    // Tại cầu thang và hành lang thông thoáng, candidates = [] -> Thoát ngay lập tức 0ms!
    const candidates = this.spatialGrid.queryNear(currX, currZ, maxSearchRadius);
    if (!candidates || candidates.length === 0) return;

    this.getPlayerBoxAt(currX, currY, currZ, this._testBoxXZ);
    let collidedBox = null;

    for (let i = 0; i < candidates.length; i++) {
      const item = candidates[i];
      if (!item || !item.box) continue;

      if (item.isWorld && !isMuseum) continue;

      // Proximity Bounding Sphere Culling O(1):
      if (item.center) {
        const dSq = (currX - item.center.x) ** 2 + (currZ - item.center.z) ** 2;
        const rSq = item.radiusSq || 1.0;
        if (dSq > rSq + maxProximitySq) continue;
      }

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

  applyRoom01WallBoundaryClamping() {
    this.applyWallBoundaryClamping();
  }

  /**
   * 5. GIỚI HẠN KHÔNG GIAN BẢO TÀNG (OUTER BOUNDS SAFETY)
   * Giữ người chơi trong khuôn viên bảo tàng, hoàn toàn không chặn va chạm vật thể.
   */
  applyClippingPrevention() {
    if (!this.camera) return;

    // Trong không gian biệt lập trên cao (KieuWorld / TruyenKieuWorld Y = 150m)
    if (typeof this.floorHeightProvider === 'function' || this.camera.position.y > 30.0) {
      const meadowBound = this.mode === CAMERA_MODES.WALKER ? 220.0 : 350.0;
      this.camera.position.x = Math.max(-meadowBound, Math.min(meadowBound, this.camera.position.x));
      this.camera.position.z = Math.max(-meadowBound, Math.min(meadowBound, this.camera.position.z));
      return;
    }

    // Giới hạn biên ngoài khuôn viên bảo tàng (tránh rơi ra khoảng không)
    const maxBound = 150.0;
    this.camera.position.x = Math.max(-maxBound, Math.min(maxBound, this.camera.position.x));
    this.camera.position.z = Math.max(-maxBound, Math.min(maxBound, this.camera.position.z));

    if (this.mode === CAMERA_MODES.FREECAM) {
      this.camera.position.y = Math.max(-15.0, Math.min(120.0, this.camera.position.y));
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
