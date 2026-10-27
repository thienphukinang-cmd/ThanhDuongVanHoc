import * as THREE from 'three';

/**
 * WORLD MANAGER MODULE: QUẢN TRỊ BỘ NHỚ & CHUYỂN CẢNH ĐA KHÔNG GIAN
 * 
 * Quản lý 2 Thế Giới:
 * 1. MUSEUM_ATRIUM: Đại Sảnh Bảo Tàng Văn Học & 15 Hiên Mở Non Nước Tràng An
 * 2. KIEU_WORLD: Thế Giới Tự Sự Truyện Kiều ("Tiết Thanh Minh" - Nguyễn Du)
 * 
 * QUY TRÌNH CHUYỂN CẢNH (WORLD TRANSITION PIPELINE):
 * - Fade to Black (1.2s) che phủ màn hình.
 * - Tắt hiển thị toàn bộ sảnh bảo tàng (atriumGroup.visible = false) ngắt 100% Draw Calls của sảnh.
 * - Chuyển đổi FogExp2 & Background sang sắc hoàng hôn chiều xuân (#E8C5B0, 0.008).
 * - Đưa người chơi về tọa độ gốc (0, 1.8, 15) ngắm đồi cỏ, dòng suối và rặng liễu.
 * - Bật kieuWorld.visible = true và từ từ Fade In (1.0s).
 * - Bức Cuốn Thư cổ lơ lửng tại điểm xuất phát hỗ trợ click để quay ngược trở lại bảo tàng.
 */

export const WORLD_STATES = {
  MUSEUM_ATRIUM: 'MUSEUM_ATRIUM',
  KIEU_WORLD: 'KIEU_WORLD'
};

export class WorldManager {
  constructor(scene, camera, renderer, cameraManager, options = {}) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.cameraManager = cameraManager;

    this.atriumGroup = options.atriumGroup ?? null;
    this.kieuWorld = options.kieuWorld ?? null;
    this.portalInteraction = options.portalInteraction ?? null;
    this.audioManager = options.audioManager ?? null;

    this.currentState = WORLD_STATES.MUSEUM_ATRIUM;
    this.isTransitioning = false;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 25.0; // Tầm tương tác 25m với cuốn thư
    this.mouse = new THREE.Vector2(0, 0);

    try {
      this.createFadeOverlayUI();
      this.createReturnWaypointUI();
      this.initEvents();
      console.log("%c✓ WorldManager initialized • Initial State: MUSEUM_ATRIUM", "color: #39e58c; font-weight: bold;");
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo WorldManager:", err);
    }
  }

  setAtriumGroup(group) {
    this.atriumGroup = group;
  }

  setKieuWorld(kieuWorld) {
    this.kieuWorld = kieuWorld;
  }

  setTruyenKieuStoryWorld(world) {
    this.truyenKieuStoryWorld = world;
  }

  setAudioManager(audioManager) {
    this.audioManager = audioManager;
  }

  /**
   * Tạo màn đen che phủ chuyển cảnh (Fade Overlay)
   */
  createFadeOverlayUI() {
    if (typeof document === 'undefined') return;

    let overlay = document.getElementById('world-transition-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'world-transition-overlay';
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background-color: #000000;
        opacity: 0;
        pointer-events: none;
        z-index: 99999;
        transition: opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1);
      `;
      document.body.appendChild(overlay);
    }
    this.fadeOverlay = overlay;
  }

  /**
   * UI thông báo khi hover vào Bức Cuốn Thư cổ
   */
  createReturnWaypointUI() {
    if (typeof document === 'undefined') return;

    let prompt = document.getElementById('return-waypoint-prompt');
    if (!prompt) {
      prompt = document.createElement('div');
      prompt.id = 'return-waypoint-prompt';
      prompt.innerHTML = `
        <style>
          #return-waypoint-prompt {
            position: fixed;
            bottom: 80px;
            left: 50%;
            transform: translateX(-50%) translateY(20px);
            background: rgba(12, 28, 22, 0.94);
            border: 1.5px solid #39e58c;
            box-shadow: 0 0 25px rgba(57, 229, 140, 0.4), 0 10px 30px rgba(0, 0, 0, 0.8);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            color: #eafff4;
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 1.2px;
            padding: 12px 24px;
            border-radius: 30px;
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            pointer-events: none;
            opacity: 0;
            z-index: 9999;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            user-select: none;
          }

          #return-waypoint-prompt.visible {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
            pointer-events: auto;
          }

          #return-waypoint-prompt:hover {
            background: rgba(18, 45, 34, 0.98);
            border-color: #5effa5;
            box-shadow: 0 0 35px rgba(94, 255, 165, 0.6);
            transform: translateX(-50%) scale(1.05);
          }

          .waypoint-icon {
            font-size: 16px;
            animation: pulse-gem 1.8s infinite alternate ease-in-out;
          }

          @keyframes pulse-gem {
            from { transform: scale(1.0); filter: drop-shadow(0 0 2px #39e58c); }
            to { transform: scale(1.25); filter: drop-shadow(0 0 8px #5effa5); }
          }
        </style>
        <span class="waypoint-icon">📜</span>
        <span>[NHẤN ĐỂ QUAY TRỞ LẠI BẢO TÀNG VĂN HỌC]</span>
      `;
      document.body.appendChild(prompt);
    }
    this.returnPromptElement = prompt;

    // Click vào thanh prompt cũng kích hoạt trở về
    prompt.addEventListener('click', () => {
      if (this.currentState === WORLD_STATES.KIEU_WORLD) {
        this.transitionTo(WORLD_STATES.MUSEUM_ATRIUM);
      }
    });
  }

  setFade(opacity = 0, durationSeconds = 1.0) {
    if (this.fadeOverlay) {
      this.fadeOverlay.style.transition = `opacity ${durationSeconds}s cubic-bezier(0.4, 0, 0.2, 1)`;
      this.fadeOverlay.style.opacity = opacity.toString();
    }
    const portalOverlay = document.getElementById('portal-fade-to-black');
    if (portalOverlay) {
      portalOverlay.style.transition = `opacity ${durationSeconds}s cubic-bezier(0.4, 0, 0.2, 1)`;
      if (opacity > 0.5) {
        portalOverlay.classList.add('active');
      } else {
        portalOverlay.classList.remove('active');
      }
    }
  }

  initEvents() {
    this.mouseMoved = false;
    window.addEventListener('pointermove', (e) => {
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.mouseMoved = true;
    });

    window.addEventListener('click', (e) => {
      if (this.currentState !== WORLD_STATES.KIEU_WORLD || this.isTransitioning) return;

      // Nếu bấm vào bảng UI HUD thì bỏ qua
      if (e.target?.closest?.('#director-hud')) return;

      if (this.isHoveringWaypoint) {
        this.transitionTo(WORLD_STATES.MUSEUM_ATRIUM);
      }
    });
  }

  /**
   * CHUYỂN CẢNH MƯỢT MÀ GIỮA 2 THẾ GIỚI (WORLD TRANSITION STATE MACHINE)
   */
  transitionTo(targetWorld) {
    if (this.isTransitioning || this.currentState === targetWorld) return;
    this.isTransitioning = true;

    console.log(`%c[WORLD MANAGER] Khởi động chuyển cảnh: ${this.currentState} ➔ ${targetWorld}`, "color: #39e58c; font-weight: bold; font-size: 14px;");

    // 1. Tạm khóa điều khiển camera
    try {
      if (typeof document !== 'undefined' && document.exitPointerLock) {
        document.exitPointerLock();
      }
      if (this.cameraManager?.controls) {
        this.cameraManager.controls.enabled = false;
      }
      if (this.cameraManager?.cameraController) {
        this.cameraManager.cameraController.isEnabled = false;
      }
    } catch (e) {}

    // Ẩn prompt cuốn thư
    if (this.returnPromptElement) {
      this.returnPromptElement.classList.remove('visible');
    }

    // 2. KÍCH HOẠT FADE TO BLACK (1.2 GIÂY) & CROSS-FADE ÂM THANH 1.5 GIÂY
    this.setFade(1.0, 1.2);
    this.audioManager?.crossfadeTo?.(targetWorld, 1.5);

    setTimeout(() => {
      try {
        if (targetWorld === WORLD_STATES.KIEU_WORLD) {
          // Ưu tiên Thế giới Truyện Kiều trên cao (TruyenKieuStoryWorld Y = 150m)
          if (this.truyenKieuStoryWorld) {
            if (!this.truyenKieuStoryWorld.isInsideWorld) {
              this.truyenKieuStoryWorld.toggleStoryWorld();
            }
            if (this.kieuWorld) this.kieuWorld.setVisible(false);
            this.directoryHUD?.hideToggle?.(true);
            this.currentState = WORLD_STATES.KIEU_WORLD;
          } else {
            // Fallback không gian cỏ thủ công cũ
            if (this.atriumGroup) this.atriumGroup.visible = false;
            if (this.kieuWorld) this.kieuWorld.setVisible(true);
            this.scene.fog = new THREE.FogExp2(0xe8c5b0, 0.008);
            this.scene.background = new THREE.Color(0xf5cb98);
            this.camera.position.set(0, 1.8, 15.0);
            this.camera.lookAt(0, 2.2, 0);
            if (this.cameraManager?.controls) {
              this.cameraManager.controls.target.set(0, 2.2, 0);
              this.cameraManager.controls.update();
            }
            if (this.cameraManager?.cameraController) {
              this.cameraManager.cameraController.floorHeightProvider = (x, z) => {
                return this.kieuWorld?.getTerrainHeight?.(x, z) ?? 0;
              };
            }
            this.directoryHUD?.hideToggle?.(true);
            this.currentState = WORLD_STATES.KIEU_WORLD;
          }
        } else if (targetWorld === WORLD_STATES.MUSEUM_ATRIUM) {
          // --- QUAY TRỞ LẠI BẢO TÀNG VĂN HỌC ---
          if (this.truyenKieuStoryWorld && this.truyenKieuStoryWorld.isInsideWorld) {
            this.truyenKieuStoryWorld.toggleStoryWorld();
          }
          if (this.kieuWorld) {
            this.kieuWorld.setVisible(false);
          }
          if (this.atriumGroup) {
            this.atriumGroup.visible = true;
          }

          // C. Khôi phục sương khói sáng sớm bảo tàng (#d6e5f0, 0.0015)
          this.scene.fog = new THREE.FogExp2(0xd6e5f0, 0.0015);
          this.scene.background = new THREE.Color(0xd6e5f0);

          // Gỡ bỏ floor provider của KieuWorld
          if (this.cameraManager?.cameraController) {
            this.cameraManager.cameraController.floorHeightProvider = null;
          }

          // Reset trạng thái tương tác cuốn sách phòng 01
          this.portalInteraction?.resetTransition?.();

          // D. Đưa camera trở lại trước bệ sách Tầng 2 (Phòng 201)
          this.camera.position.set(-44.0, 11.8, 19.0);
          this.camera.lookAt(-48.0, 11.6, 19.0);

          if (this.cameraManager?.controls) {
            this.cameraManager.controls.target.set(-48.0, 11.6, 19.0);
            this.cameraManager.controls.update();
          }

          // Hiện lại nút Thư mục bảo tàng
          this.directoryHUD?.hideToggle?.(false);

          this.currentState = WORLD_STATES.MUSEUM_ATRIUM;
        }

        // 3. MỞ SÁNG MÀN HÌNH TỪ TỪ (FADE IN 1.0 GIÂY)
        this.setFade(0.0, 1.0);

        setTimeout(() => {
          // Mở khóa điều khiển camera
          try {
            if (this.cameraManager?.controls) {
              this.cameraManager.controls.enabled = true;
            }
            if (this.cameraManager?.cameraController) {
              this.cameraManager.cameraController.isEnabled = true;
            }
          } catch (e) {}

          this.isTransitioning = false;
          console.log(`%c[WORLD MANAGER] Hoàn tất chuyển cảnh thành công vào ${this.currentState}`, "color: #39e58c; font-weight: bold;");

          // TỰ ĐỘNG THEO DÕI & ÉP FPS >= 60 KHI BƯỚC VÀO THẾ GIỚI
          const perf = window.performanceOptimizer;
          perf?.startBenchmark?.(this.currentState === WORLD_STATES.KIEU_WORLD ? 'THẾ GIỚI TRUYỆN KIỀU' : 'SẢNH BẢO TÀNG');
        }, 1000);

      } catch (err) {
        console.error("[SELF-HEALING] Lỗi chuyển cảnh:", err);
        this.setFade(0.0, 0.5);
        this.isTransitioning = false;
      }
    }, 1200);
  }

  /**
   * Cập nhật vòng lặp Render & Raycast tương tác Cuốn Thư (Chỉ raycast khi có sự kiện di chuột)
   */
  update(delta = 0.016, elapsedTime = 0) {
    if (this.currentState === WORLD_STATES.KIEU_WORLD) {
      this.kieuWorld?.update?.(delta, elapsedTime);
      // Chỉ raycast khi người dùng di chuột thực tế, tuyệt đối không lặp vô hạn mỗi frame
      if (this.mouseMoved) {
        this.mouseMoved = false;
        this.updateWaypointRaycasting();
      }
    }
  }

  /**
   * Raycast phát hiện con trỏ chuột hover vào Bức Cuốn Thư cổ
   */
  updateWaypointRaycasting() {
    if (this.isTransitioning || !this.kieuWorld?.interactiveWaypoint || !this.camera) return;

    const isLocked = this.cameraManager?.cameraController?.controls?.isLocked ?? false;
    if (isLocked) {
      this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    } else {
      this.raycaster.setFromCamera(this.mouse, this.camera);
    }

    const intersects = this.raycaster.intersectObject(this.kieuWorld.interactiveWaypoint, true);
    if (intersects.length > 0) {
      if (!this.isHoveringWaypoint) {
        this.isHoveringWaypoint = true;
        this.returnPromptElement?.classList?.add?.('visible');
        if (typeof document !== 'undefined' && document.body) {
          document.body.style.cursor = 'pointer';
        }
      }
    } else {
      if (this.isHoveringWaypoint) {
        this.isHoveringWaypoint = false;
        this.returnPromptElement?.classList?.remove?.('visible');
        if (typeof document !== 'undefined' && document.body) {
          document.body.style.cursor = 'default';
        }
      }
    }
  }

  destroy() {
    try {
      this.fadeOverlay?.remove?.();
      this.returnPromptElement?.remove?.();
    } catch (e) {}
  }
}
