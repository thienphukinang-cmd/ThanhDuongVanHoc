import * as THREE from 'three';

/**
 * PORTAL INTERACTION SYSTEM & INTERACTIVE BOOK ENGINE
 * 
 * Tính năng chính:
 * 1. Raycaster tương tác vật thể 3D chính xác cao (hỗ trợ cả FPP PointerLock và Free Cursor).
 * 2. Hover feedback: Đổi con trỏ chuột thành hình bàn tay (pointer), kích hoạt hiệu ứng
 *    phát quang nổi bật (outline/highlight glow) kèm vòng hào quang ma trận 3D (Aura Selection Ring).
 * 3. Click chuột trái vào sách: Kích hoạt hiệu ứng "Warp into Book" lao thẳng vào trang sách,
 *    màn hình lóe sáng và dịch chuyển đến không gian 3D riêng biệt của tác phẩm.
 * 4. Hàm mở rộng chuẩn hóa `registerInteractiveBook(mesh, targetSceneCoordinates, options)`:
 *    Cho phép thêm bất kỳ tác phẩm nào trong tương lai (Lục Vân Tiên, Chinh Phụ Ngâm...) chỉ với 1 dòng lệnh.
 */

// Singleton & hàng đợi đăng ký nếu PortalInteraction chưa khởi tạo
let activePortalInteractionInstance = null;
const pendingInteractiveBooks = [];

export function getActivePortalInteraction() {
  return activePortalInteractionInstance;
}

/**
 * HÀM QUẢN LÝ ĐĂNG KÝ SÁCH TƯƠNG TÁC DẠNG CHUẨN HÓA MỞ RỘNG
 * @param {THREE.Object3D|THREE.Mesh} mesh - Đối tượng 3D (Mesh hoặc Group) của cuốn sách
 * @param {THREE.Vector3|Object|Function} targetSceneCoordinates - Tọa độ không gian 3D đích hoặc hàm chuyển cảnh
 * @param {Object} [options] - Cấu hình metadata (id, title, author, genre, quote, themeColor...)
 */
export function registerInteractiveBook(mesh, targetSceneCoordinates = null, options = {}) {
  if (activePortalInteractionInstance) {
    return activePortalInteractionInstance.registerInteractiveBook(mesh, targetSceneCoordinates, options);
  } else {
    pendingInteractiveBooks.push({ mesh, targetSceneCoordinates, options });
    return mesh;
  }
}

// Gắn vào window để truy cập toàn cục thuận tiện
if (typeof window !== 'undefined') {
  window.registerInteractiveBook = registerInteractiveBook;
}

export class PortalInteraction {
  constructor(scene = null, camera = null, renderer = null, cameraManager = null, options = {}) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.cameraManager = cameraManager;
    this.audioManager = options?.audioManager ?? null;

    this.interactiveTargets = []; // Danh sách mesh tương tác được duyệt raycast
    this.interactiveBooksMap = new Map(); // Map lưu trữ dữ liệu từng cuốn sách
    this.isHovered = false;
    this.hoveredRoot = null;
    this.hoveredObject = null;
    this.isTransitioning = false;

    this.mouse = new THREE.Vector2(0, 0);
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 45.0; // Tầm tương tác 45m lý tưởng cho đại sảnh và các phòng

    // Quỹ đạo camera zoom dự phòng
    this.zoomProgress = 0.0;
    this.zoomDuration = 1.0;
    this.startCamPos = new THREE.Vector3();
    this.targetCamPos = new THREE.Vector3();
    this.zoomTargetLookAt = new THREE.Vector3();

    activePortalInteractionInstance = this;

    try {
      this.createCrosshairUI();
      this.createSummaryPanelUI();
      this.createFadeOverlayUI();
      this.createAuraHighlightMesh();
      this.initEvents();

      // Xử lý các sách đăng ký sớm trong hàng đợi
      while (pendingInteractiveBooks.length > 0) {
        const item = pendingInteractiveBooks.shift();
        this.registerInteractiveBook(item.mesh, item.targetSceneCoordinates, item.options);
      }
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo PortalInteraction:", err);
    }
  }

  /**
   * 1. HÀM ĐĂNG KÝ SÁCH TƯƠNG TÁC (EXTENSIBLE INTERACTIVE BOOK REGISTRATION)
   */
  registerInteractiveBook(mesh, targetSceneCoordinates = null, options = {}) {
    if (!mesh) return null;

    // Chuẩn hóa tham số tọa độ đích
    let coords = null;
    let opts = options || {};

    if (targetSceneCoordinates) {
      if (targetSceneCoordinates instanceof THREE.Vector3 || (typeof targetSceneCoordinates.x === 'number' && typeof targetSceneCoordinates.y === 'number')) {
        coords = new THREE.Vector3(targetSceneCoordinates.x, targetSceneCoordinates.y, targetSceneCoordinates.z || 0);
      } else if (typeof targetSceneCoordinates === 'object' && !options.title && (targetSceneCoordinates.title || targetSceneCoordinates.id)) {
        opts = targetSceneCoordinates;
        if (opts.coordinates) {
          coords = new THREE.Vector3(opts.coordinates.x, opts.coordinates.y, opts.coordinates.z || 0);
        }
      }
    }

    const metadata = {
      id: opts.id || mesh.name || `book_${Date.now()}`,
      title: opts.title || opts.name || 'TÁC PHẨM VĂN HỌC',
      author: opts.author || 'Tác giả khuyết danh',
      genre: opts.genre || opts.era || 'Văn học Việt Nam',
      quote: opts.quote || 'Trang sách mở ra chân trời kỳ vĩ của tâm hồn dân tộc.',
      themeColor: opts.themeColor || 0xffd700,
      portalReady: opts.portalReady !== false,
      targetZoneId: opts.targetZoneId || 1,
      targetSceneCoordinates: coords,
      onActivate: typeof opts.onActivate === 'function' ? opts.onActivate : null,
      floor: opts.floor || 2,
      roomIndex: opts.roomIndex !== undefined ? opts.roomIndex : 0,
    };

    mesh.userData.portalMetadata = metadata;
    mesh.userData.interactiveBookRoot = mesh;
    mesh.userData.targetSceneCoordinates = coords;

    const worldPos = new THREE.Vector3();
    mesh.getWorldPosition(worldPos);
    mesh.userData.cachedWorldPos = worldPos;

    // Duyệt qua tất cả các mesh con (cho trường hợp GLTF hierarchy)
    mesh.traverse((child) => {
      if (child.isMesh) {
        child.userData.portalMetadata = metadata;
        child.userData.interactiveBookRoot = mesh;
        child.userData.targetSceneCoordinates = coords;
        child.userData.excludeFromCollision = true;
        child.userData.cachedWorldPos = worldPos;

        if (!this.interactiveTargets.includes(child)) {
          this.interactiveTargets.push(child);
        }
      }
    });

    if (!this.interactiveTargets.includes(mesh)) {
      this.interactiveTargets.push(mesh);
    }

    this.interactiveBooksMap.set(metadata.id, {
      root: mesh,
      metadata,
      coordinates: coords
    });

    console.log(`%c✓ [INTERACTIVE BOOK]: Đã đăng ký thành công tác phẩm "${metadata.title}" [ID: ${metadata.id}]`, "color: #39e58c; font-weight: bold; font-size: 12px;");
    return mesh;
  }

  /**
   * Phương thức tương thích ngược với code cũ
   */
  registerTarget(mesh, metadata = {}) {
    return this.registerInteractiveBook(mesh, metadata.targetSceneCoordinates || null, metadata);
  }

  /**
   * 2. VÒNG HÀO QUANG 3D MA TRẬN CHỌN SÁCH (3D AURA SELECTION RETICLE)
   */
  createAuraHighlightMesh() {
    if (!this.scene) return;
    try {
      const auraGroup = new THREE.Group();
      auraGroup.name = "Portal_Interactive_Aura_Ring";

      const ringGeo = new THREE.RingGeometry(0.70, 0.90, 48);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      auraGroup.add(ringMesh);

      // Vòng tròn nét đứt ngoài
      const outerRingGeo = new THREE.RingGeometry(0.95, 0.99, 48);
      const outerRingMat = new THREE.MeshBasicMaterial({
        color: 0xfffae6,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const outerRingMesh = new THREE.Mesh(outerRingGeo, outerRingMat);
      outerRingMesh.rotation.x = -Math.PI / 2;
      auraGroup.add(outerRingMesh);

      auraGroup.visible = false;
      auraGroup.userData.excludeFromCollision = true;
      this.scene.add(auraGroup);
      this.auraRing = auraGroup;
      this.auraRingMaterial = ringMat;
    } catch (e) {
      console.warn("[SELF-HEALING] Aura mesh init:", e);
    }
  }

  /**
   * 3. TÂM NGẮM NHỎ (CROSSHAIR) Ở CHẾ ĐỘ FPP
   */
  createCrosshairUI() {
    if (typeof document === 'undefined') return;

    let crosshair = document.getElementById('portal-fpp-crosshair');
    if (!crosshair) {
      crosshair = document.createElement('div');
      crosshair.id = 'portal-fpp-crosshair';
      crosshair.innerHTML = `
        <style>
          #portal-fpp-crosshair {
            position: fixed;
            top: 50%;
            left: 50%;
            width: 8px;
            height: 8px;
            transform: translate(-50%, -50%);
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.55);
            box-shadow: 0 0 6px rgba(0, 0, 0, 0.8);
            pointer-events: none;
            z-index: 9998;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
            opacity: 0;
          }

          #portal-fpp-crosshair.active {
            opacity: 1;
          }

          #portal-fpp-crosshair.hovered {
            width: 18px;
            height: 18px;
            background: #ffd269;
            box-shadow: 0 0 14px #ffc436, 0 0 25px rgba(255, 196, 54, 0.8);
            border: 2px solid #fff;
          }
        </style>
      `;
      document.body.appendChild(crosshair);
    }
    this.crosshairElement = crosshair;
  }

  /**
   * 4. GIAO DIỆN TÓM TẮT TÁC PHẨM & HƯỚNG DẪN CLICK
   */
  createSummaryPanelUI() {
    if (typeof document === 'undefined') return;

    let panel = document.getElementById('literature-summary-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'literature-summary-panel';
      panel.innerHTML = `
        <style>
          #literature-summary-panel {
            position: fixed;
            right: 32px;
            top: 50%;
            transform: translateY(-50%) translateX(40px);
            width: 360px;
            max-width: calc(100vw - 64px);
            background: radial-gradient(circle at 10% 10%, rgba(20, 26, 32, 0.94) 0%, rgba(10, 14, 18, 0.98) 100%);
            border: 1px solid rgba(212, 175, 55, 0.65);
            border-radius: 12px;
            padding: 24px 28px;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.75), 0 0 30px rgba(212, 175, 55, 0.25);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            color: #f5eed8;
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
            pointer-events: none;
            opacity: 0;
            z-index: 9990;
            transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
            user-select: none;
          }

          #literature-summary-panel.visible {
            opacity: 1;
            transform: translateY(-50%) translateX(0);
            pointer-events: auto;
          }

          .lsp-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: #ffd269;
            background: rgba(212, 175, 55, 0.15);
            border: 1px solid rgba(212, 175, 55, 0.4);
            padding: 3px 10px;
            border-radius: 12px;
            margin-bottom: 12px;
          }

          .lsp-title {
            font-size: 20px;
            font-weight: 800;
            letter-spacing: 1.2px;
            line-height: 1.3;
            margin: 0 0 6px 0;
            background: linear-gradient(135deg, #fff3be 0%, #d4af37 60%, #b8860b 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            text-transform: uppercase;
          }

          .lsp-author {
            font-size: 13px;
            color: #b0c4de;
            margin-bottom: 14px;
            font-weight: 600;
          }

          .lsp-genre {
            font-size: 12px;
            color: #ffd700;
            background: rgba(255, 215, 0, 0.08);
            border-left: 2px solid #d4af37;
            padding: 4px 10px;
            margin-bottom: 14px;
            border-radius: 0 4px 4px 0;
          }

          .lsp-quote {
            font-style: italic;
            font-size: 13px;
            line-height: 1.6;
            color: #e0d5c1;
            background: rgba(255, 255, 255, 0.04);
            border: 1px dashed rgba(212, 175, 55, 0.35);
            border-radius: 8px;
            padding: 12px 14px;
            margin-bottom: 18px;
          }

          .lsp-action-hint {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            background: linear-gradient(135deg, rgba(212, 175, 55, 0.3) 0%, rgba(184, 134, 11, 0.5) 100%);
            border: 1px solid #ffd269;
            color: #fff9e6;
            padding: 11px 16px;
            border-radius: 8px;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            box-shadow: 0 4px 16px rgba(212, 175, 55, 0.4);
            animation: pulseHint 1.8s infinite ease-in-out;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .lsp-action-hint:hover {
            background: linear-gradient(135deg, #ffd269 0%, #dfa515 100%);
            color: #1a1202;
            transform: scale(1.02);
            box-shadow: 0 6px 22px rgba(255, 210, 105, 0.7);
          }

          .lsp-action-hint.disabled {
            background: rgba(45, 52, 60, 0.7) !important;
            border: 1px solid rgba(140, 150, 160, 0.35) !important;
            color: #9aa0a6 !important;
            box-shadow: none !important;
            animation: none !important;
            cursor: not-allowed !important;
          }

          @keyframes pulseHint {
            0%, 100% { transform: scale(1.0); box-shadow: 0 4px 16px rgba(212, 175, 55, 0.4); }
            50% { transform: scale(1.03); box-shadow: 0 6px 24px rgba(255, 210, 105, 0.8); }
          }
        </style>

        <div class="lsp-badge" id="lsp-badge-text">📖 TÁC PHẨM TRƯNG BÀY • PHÒNG 01 (TẦNG 2)</div>
        <div class="lsp-title" id="lsp-title-text">TRUYỆN KIỀU – NGUYỄN DU</div>
        <div class="lsp-author" id="lsp-author-text">Đại thi hào Nguyễn Du (1765 – 1820)</div>
        <div class="lsp-genre" id="lsp-genre-text"><strong>Thời kỳ:</strong> Truyện thơ Nôm (Văn học Trung đại)</div>
        <div class="lsp-quote" id="lsp-quote-text">
          "Đoạn trường tân thanh – Khúc ca bi tráng về tài mệnh tương đố và khát vọng tự do."
        </div>
        <div class="lsp-action-hint" id="lsp-click-button">
          ✨ [CLICK CHUỘT VÀO SÁCH ĐỂ BƯỚC VÀO THẾ GIỚI]
        </div>
      `;
      document.body.appendChild(panel);

      const clickBtn = document.getElementById('lsp-click-button');
      if (clickBtn) {
        clickBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.triggerPortalTransition();
        });
      }
    }
    this.summaryPanelElement = panel;
  }

  /**
   * 5. MÀN ĐEN FADE TO BLACK (DỰ PHÒNG)
   */
  createFadeOverlayUI() {
    if (typeof document === 'undefined') return;

    let overlay = document.getElementById('portal-fade-to-black');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'portal-fade-to-black';
      overlay.innerHTML = `
        <style>
          #portal-fade-to-black {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: #000;
            opacity: 0;
            pointer-events: none;
            z-index: 99999;
            transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1);
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
            color: #ffd700;
            font-family: 'Segoe UI', sans-serif;
          }

          #portal-fade-to-black.active {
            opacity: 1;
            pointer-events: auto;
          }

          .portal-loading-text {
            font-size: 22px;
            font-weight: 700;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin-top: 16px;
            text-shadow: 0 0 16px rgba(212, 175, 55, 0.8);
          }
        </style>
        <div style="font-size: 48px;">📖✨</div>
        <div class="portal-loading-text">Đang dịch chuyển vào không gian Truyện Kiều...</div>
      `;
      document.body.appendChild(overlay);
    }
    this.fadeOverlayElement = overlay;
  }

  /**
   * 6. SỰ KIỆN RAYCASTER (MOUSEMOVE & CLICK)
   */
  initEvents() {
    this.mouseMoved = false;
    this.raycastThrottleTimer = 0.0;

    this.onPointerMove = (e) => {
      try {
        this.mouseMoved = true;
        const rect = this.renderer?.domElement?.getBoundingClientRect?.();
        if (rect) {
          this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        } else {
          this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
          this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        }
      } catch (err) {}
    };

    // Sự kiện CLICK CHUỘT TRỰC TIẾP VÀO SÁCH
    this.onClick = (e) => {
      try {
        if (this.isTransitioning) return;

        // Bỏ qua nếu click vào UI HUD / Director panel
        if (e.target.closest('#director-hud') || e.target.closest('#kieuworld-realm-hud') || e.target.closest('#directory-hud-modal')) {
          return;
        }

        const isLocked = this.isPointerLocked();
        const pointerPos = isLocked ? { x: 0, y: 0 } : this.mouse;
        const result = this.performRaycast(pointerPos);

        if (result && result.rootBook) {
          this.triggerPortalTransition(result.rootBook);
        } else if (this.isHovered && this.hoveredRoot) {
          this.triggerPortalTransition(this.hoveredRoot);
        }
      } catch (err) {
        console.warn("[SELF-HEALING] Lỗi click portal:", err);
      }
    };

    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('click', this.onClick);
  }

  isPointerLocked() {
    return (
      (typeof document !== 'undefined' && document.pointerLockElement !== null) ||
      (this.cameraManager?.cameraController?.controls?.isLocked ?? false)
    );
  }

  /**
   * 7. THỰC THI BẮN TIA RAYCAST CÓ BỘ LỌC CỰ LY (PROXIMITY RAYCAST FILTERING)
   */
  performRaycast(pointerPos, maxDist = 20.0) {
    if (!this.camera || this.interactiveTargets.length === 0) return null;

    try {
      this.raycaster.setFromCamera(pointerPos, this.camera);
      this.raycaster.far = maxDist;

      const camPos = this.camera.position;
      const maxDistSq = maxDist * maxDist;

      // Chỉ lọc các cuốn sách ở gần camera (< 20m) để tối ưu hóa raycasting
      const nearTargets = [];
      for (let i = 0; i < this.interactiveTargets.length; i++) {
        const t = this.interactiveTargets[i];
        if (!t || t.visible === false) continue;
        const wp = t.userData?.cachedWorldPos;
        if (wp) {
          const dSq = (camPos.x - wp.x) ** 2 + (camPos.y - wp.y) ** 2 + (camPos.z - wp.z) ** 2;
          if (dSq <= maxDistSq) nearTargets.push(t);
        } else {
          nearTargets.push(t);
        }
      }

      if (nearTargets.length === 0) return null;

      const intersects = this.raycaster.intersectObjects(nearTargets, true);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        let root = hit.userData.interactiveBookRoot || hit;

        while (root && !root.userData?.portalMetadata && root.parent && root.parent !== this.scene) {
          root = root.parent;
        }

        return {
          hitMesh: hit,
          rootBook: root || hit,
          distance: intersects[0].distance,
          point: intersects[0].point
        };
      }
    } catch (e) {}

    return null;
  }

  /**
   * 8. HÀM CẬP NHẬT TRONG VÒNG LẶP RENDER (UPDATE LOOP CÓ THROTTLE 10HZ)
   */
  update(delta = 0.016, elapsedTime = 0) {
    if (!this.camera) return;

    if (this.isTransitioning) {
      this.updateCameraZoomAnimation(delta);
      return;
    }

    // Hiệu ứng xoay vòng hào quang 3D khi đang hover sách
    if (this.auraRing && this.auraRing.visible) {
      this.auraRing.rotation.y += delta * 1.5;
      const pulseScale = 1.0 + Math.sin(elapsedTime * 6.0) * 0.06;
      this.auraRing.scale.set(pulseScale, pulseScale, pulseScale);
    }

    if (this.interactiveTargets.length === 0) return;

    // TẮT HOÀN TOÀN RAYCASTER NGẦM TRONG UPDATE:
    // Tuyệt đối không gọi raycaster.intersectObjects() định kỳ mỗi frame/100ms.
    // Chỉ kích hoạt raycast khi có sự kiện di chuột thực tế (mouseMoved = true).
    if (!this.mouseMoved) return;
    this.mouseMoved = false;

    try {
      const isLocked = this.isPointerLocked();
      const pointerPos = isLocked ? { x: 0, y: 0 } : this.mouse;

      // Tâm ngắm crosshair FPP
      if (this.crosshairElement) {
        if (isLocked) {
          this.crosshairElement.classList.add('active');
        } else {
          this.crosshairElement.classList.remove('active');
        }
      }

      const result = this.performRaycast(pointerPos, 20.0);

      if (result && result.rootBook) {
        const root = result.rootBook;
        if (!this.isHovered || this.hoveredRoot !== root) {
          if (this.isHovered && this.hoveredRoot) {
            this.onHoverExit(this.hoveredRoot);
          }
          this.isHovered = true;
          this.hoveredRoot = root;
          this.hoveredObject = result.hitMesh;
          this.onHoverEnter(root);
        }
      } else {
        if (this.isHovered) {
          this.isHovered = false;
          if (this.hoveredRoot) {
            this.onHoverExit(this.hoveredRoot);
          }
          this.hoveredRoot = null;
          this.hoveredObject = null;
        }
      }
    } catch (err) {}
  }

  /**
   * 9. HOVER ENTER: ĐỔI CON TRỎ POINTER, PHÁT SÁNG VIỀN & AURA RETICLE
   */
  onHoverEnter(rootBook) {
    try {
      this.audioManager?.playBookHover?.();

      const meta = rootBook?.userData?.portalMetadata;
      const themeColor = meta?.themeColor ?? 0xffd700;

      // Đổi con trỏ chuột thành hình bàn tay (pointer)
      if (typeof document !== 'undefined' && document.body && !this.isPointerLocked()) {
        const isClickable = meta ? meta.portalReady !== false : true;
        document.body.style.cursor = isClickable ? 'pointer' : 'not-allowed';
      }

      if (this.crosshairElement) {
        this.crosshairElement.classList.add('hovered');
      }

      // 1. Kích hoạt hiệu ứng phát sáng viền/emissive (Outline / Highlight)
      rootBook.traverse((child) => {
        if (child.isMesh && child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach((m) => {
            if (!m) return;
            if (!m.userData._origHighlightState) {
              m.userData._origHighlightState = {
                emissive: m.emissive ? m.emissive.clone() : new THREE.Color(0x000000),
                emissiveIntensity: m.emissiveIntensity !== undefined ? m.emissiveIntensity : 0.0
              };
            }
            if (m.emissive) {
              m.emissive.set(themeColor);
              m.emissiveIntensity = 1.35; // Phát quang rực rỡ ăn vào Postprocessing Bloom
            }
            m.needsUpdate = true;
          });
        }
      });

      // 2. Định vị vòng hào quang ma trận 3D ngay dưới chân bục cuốn sách
      if (this.auraRing) {
        const worldPos = new THREE.Vector3();
        rootBook.getWorldPosition(worldPos);
        const box = new THREE.Box3().setFromObject(rootBook);
        this.auraRing.position.set(worldPos.x, box.min.y + 0.04, worldPos.z);
        if (this.auraRingMaterial) {
          this.auraRingMaterial.color.set(themeColor);
        }
        this.auraRing.visible = true;
      }

      // 3. Cập nhật bảng tóm tắt tác phẩm
      if (meta) {
        const badgeEl = document.getElementById('lsp-badge-text');
        const titleEl = document.getElementById('lsp-title-text');
        const authorEl = document.getElementById('lsp-author-text');
        const genreEl = document.getElementById('lsp-genre-text');
        const quoteEl = document.getElementById('lsp-quote-text');
        const clickBtn = document.getElementById('lsp-click-button');

        const roomNum = (meta.roomIndex !== undefined) ? String(meta.roomIndex + 1).padStart(2, '0') : '01';
        const floorNum = meta.floor ?? 2;

        if (badgeEl) badgeEl.textContent = `📖 TÁC PHẨM TRƯNG BÀY • PHÒNG ${roomNum} (TẦNG ${floorNum})`;
        if (titleEl) titleEl.textContent = meta.title ?? meta.name ?? 'TÁC PHẨM VĂN HỌC';
        if (authorEl) authorEl.textContent = meta.author ?? 'Tác giả khuyết danh';
        if (genreEl) genreEl.innerHTML = `<strong>Thời kỳ / Thể loại:</strong> ${meta.genre ?? meta.era ?? 'Văn học Việt Nam'}`;
        if (quoteEl) quoteEl.textContent = `"${meta.quote ?? ''}"`;

        if (clickBtn) {
          if (meta.portalReady !== false) {
            clickBtn.textContent = '✨ [CLICK CHUỘT VÀO SÁCH ĐỂ BƯỚC VÀO THẾ GIỚI]';
            clickBtn.classList.remove('disabled');
          } else {
            clickBtn.textContent = '🔒 [KHÔNG GIAN NARRATIVE ĐANG TRONG QUÁ TRÌNH KHỞI TẠO]';
            clickBtn.classList.add('disabled');
          }
        }
      }

      if (this.summaryPanelElement) {
        this.summaryPanelElement.classList.add('visible');
      }
    } catch (e) {
      console.warn("[SELF-HEALING] HoverEnter:", e);
    }
  }

  /**
   * 10. HOVER EXIT: HOÀN TRẢ VẬT LIỆU, ẨN VÒNG HÀO QUANG & TRẢ CON TRỎ DEFAULT
   */
  onHoverExit(rootBook) {
    try {
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.cursor = 'default';
      }

      if (this.crosshairElement) {
        this.crosshairElement.classList.remove('hovered');
      }

      if (rootBook) {
        rootBook.traverse((child) => {
          if (child.isMesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((m) => {
              if (m && m.userData._origHighlightState) {
                if (m.emissive) {
                  m.emissive.copy(m.userData._origHighlightState.emissive);
                  m.emissiveIntensity = m.userData._origHighlightState.emissiveIntensity;
                }
                m.needsUpdate = true;
              }
            });
          }
        });
      }

      if (this.auraRing) {
        this.auraRing.visible = false;
      }

      if (this.summaryPanelElement) {
        this.summaryPanelElement.classList.remove('visible');
      }
    } catch (e) {
      console.warn("[SELF-HEALING] HoverExit:", e);
    }
  }

  /**
   * 11. KÍCH HOẠT DỊCH CHUYỂN "WARP INTO BOOK" KHI CLICK
   */
  triggerPortalTransition(targetBook = null) {
    if (this.isTransitioning) return;

    const target = targetBook || this.hoveredRoot || this.hoveredObject;
    if (!target) return;

    const meta = target.userData?.portalMetadata;
    const coords = target.userData?.targetSceneCoordinates;

    if (meta && meta.portalReady === false) {
      console.log(`%c[PORTAL INTERACTION]: Không gian "${meta.title}" đang trong quá trình khởi tạo. Vui lòng quay lại sau!`, "color: #ffa500; font-weight: bold; font-size: 13px;");
      return;
    }

    // Ẩn panel & con trỏ
    if (this.summaryPanelElement) this.summaryPanelElement.classList.remove('visible');
    if (this.crosshairElement) this.crosshairElement.classList.remove('active');
    if (this.auraRing) this.auraRing.visible = false;
    if (typeof document !== 'undefined' && document.body) document.body.style.cursor = 'default';

    // Âm thanh kích hoạt
    this.audioManager?.playBookHover?.();

    // 1. Kiểm tra handler callback tùy biến
    if (meta && typeof meta.onActivate === 'function') {
      meta.onActivate(coords, meta);
      return;
    }

    // 2. Chuyển giao trực tiếp cho hook của TruyenKieuWorld (Warp into Book)
    if (typeof this.loadNarrativeWorld === 'function') {
      const handled = this.loadNarrativeWorld(meta?.id || 'truyen_kieu', coords, meta);
      if (handled !== false) {
        return;
      }
    }

    // 3. Nếu là sách mở rộng có targetSceneCoordinates -> Thực thi camera dive & warp
    if (coords && this.camera) {
      this.warpToCoordinates(coords, meta, target);
      return;
    }

    // 4. Dự phòng camera zoom 1 giây
    this.runLegacyZoom(target, meta);
  }

  /**
   * WARP TỚI TỌA ĐỘ BẤT KỲ (CHO CÁC TÁC PHẨM MỞ RỘNG TRONG TƯƠNG LAI)
   */
  warpToCoordinates(targetCoords, meta, targetMesh) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    if (document.exitPointerLock) document.exitPointerLock();
    if (this.cameraManager?.controls) this.cameraManager.controls.enabled = false;
    if (this.cameraManager?.cameraController) this.cameraManager.cameraController.isEnabled = false;

    // Camera dive về vị trí cuốn sách trong 0.7s
    const startPos = this.camera.position.clone();
    const bookPos = new THREE.Vector3();
    targetMesh.getWorldPosition(bookPos);

    const diveTarget = bookPos.clone().add(new THREE.Vector3(0, 0.25, 0.45));
    const startTime = performance.now();
    const duration = 700;

    const overlay = document.getElementById('kieu-warp-overlay');
    if (overlay) {
      const title = document.getElementById('warp-title');
      const subtitle = document.getElementById('warp-subtitle');
      if (title) title.textContent = `✨ ĐANG BƯỚC VÀO THẾ GIỚI ${meta?.title?.toUpperCase() || 'TÁC PHẨM'}... ✨`;
      if (subtitle) subtitle.textContent = meta?.author?.toUpperCase() || 'BẢO TÀNG VĂN HỌC VIỆT NAM';
      overlay.classList.add('active');
    }

    if (this.diveAnimId) {
      cancelAnimationFrame(this.diveAnimId);
      this.diveAnimId = null;
    }

    const animateDive = (now) => {
      const progress = Math.min(1.0, (now - startTime) / duration);
      const easeT = progress * progress * progress; // Cubic ease in

      this.camera.position.lerpVectors(startPos, diveTarget, easeT);
      this.camera.lookAt(bookPos);

      if (progress < 1.0) {
        this.diveAnimId = requestAnimationFrame(animateDive);
      } else {
        this.diveAnimId = null;
        // Teleport tới tọa độ đích
        this.camera.position.copy(targetCoords);
        if (this.cameraManager?.controls) {
          this.cameraManager.controls.target.copy(targetCoords).add(new THREE.Vector3(0, 0, -10));
        }

        setTimeout(() => {
          if (overlay) overlay.classList.remove('active');
          if (this.cameraManager?.controls) this.cameraManager.controls.enabled = true;
          if (this.cameraManager?.cameraController) this.cameraManager.cameraController.isEnabled = true;
          this.isTransitioning = false;
          this.diveAnimId = null;
        }, 300);
      }
    };
    this.diveAnimId = requestAnimationFrame(animateDive);
  }

  runLegacyZoom(targetMesh, meta) {
    this.isTransitioning = true;
    if (document.exitPointerLock) document.exitPointerLock();
    if (this.cameraManager?.controls) this.cameraManager.controls.enabled = false;

    this.startCamPos.copy(this.camera.position);
    const targetWorldPos = new THREE.Vector3();
    targetMesh.getWorldPosition(targetWorldPos);
    this.zoomTargetLookAt.copy(targetWorldPos);

    const zoomOffset = this.camera.position.clone().sub(targetWorldPos).normalize().multiplyScalar(0.75);
    zoomOffset.y = Math.max(0.15, zoomOffset.y);
    this.targetCamPos.copy(targetWorldPos).add(zoomOffset);

    this.zoomProgress = 0.0;
    if (this.fadeOverlayElement) this.fadeOverlayElement.classList.add('active');

    setTimeout(() => {
      this.resetTransition();
    }, 1200);
  }

  updateCameraZoomAnimation(delta) {
    this.zoomProgress += delta / this.zoomDuration;
    const t = Math.min(1.0, this.zoomProgress);
    const easeT = t * t * (3.0 - 2.0 * t);

    if (this.camera) {
      this.camera.position.lerpVectors(this.startCamPos, this.targetCamPos, easeT);
      this.camera.lookAt(this.zoomTargetLookAt);
    }
  }

  loadNarrativeWorld(worldId = 'truyen_kieu') {
    return false;
  }

  resetTransition() {
    this.isTransitioning = false;
    if (this.fadeOverlayElement) {
      this.fadeOverlayElement.classList.remove('active');
    }
  }

  setAudioManager(audioManager) {
    this.audioManager = audioManager;
  }

  destroy() {
    try {
      window.removeEventListener('pointermove', this.onPointerMove);
      window.removeEventListener('click', this.onClick);
      this.crosshairElement?.remove?.();
      this.summaryPanelElement?.remove?.();
      this.fadeOverlayElement?.remove?.();
      if (this.auraRing && this.auraRing.parent) {
        this.auraRing.parent.remove(this.auraRing);
      }
      activePortalInteractionInstance = null;
    } catch (e) {}
  }
}
