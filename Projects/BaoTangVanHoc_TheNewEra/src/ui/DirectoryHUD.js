import * as THREE from 'three';
import { LITERATURE_REGISTRY } from '../config/literatureRegistry.js';
import { ALCOVE_CENTERS } from '../modules/RoomGenerator.js';

/**
 * INTERACTIVE DIRECTORY HUD (BẢNG THƯ MỤC ĐIỀU HƯỚNG TÁC PHẨM & FAST-TRAVEL)
 * 
 * Tính năng chính:
 * 1. UI phong cách Indochine hiện đại (khung viền vàng đồng, kính mờ backdrop-filter: blur(16px)).
 * 2. Phím tắt kích hoạt: Nhấn 'M' (Map/Menu) hoặc nút bấm nhỏ góc trên màn hình.
 * 3. 3 cột tương ứng 3 Tầng: Tầng 1 (Dân gian & Sử thi), Tầng 2 (Trung đại), Tầng 3 (Hiện đại).
 * 4. Fast-Travel: Click vào tác phẩm -> đóng HUD -> camera lướt điện ảnh 1.8s power2.inOut
 *    đến điểm quan sát lý tưởng (cách sách 3.5m, mắt nhìn ngang tầm sách).
 */

export function getRoomFastTravelTarget(item) {
  const alcove = ALCOVE_CENTERS[item.roomIndex] || ALCOVE_CENTERS[0];
  const floorElevation = (item.floor - 1) * 10.0;
  const bookPos = new THREE.Vector3(alcove.x, floorElevation + 1.58, alcove.z);

  // Vector từ bệ sách hướng về tâm giếng trời sảnh chính (0, 0)
  const dirX = 0.0 - alcove.x;
  const dirZ = 0.0 - alcove.z;
  const len = Math.hypot(dirX, dirZ) || 1.0;
  const uX = dirX / len;
  const uZ = dirZ / len;

  // Điểm quan sát lý tưởng: đứng cách sách 3.5m theo phương hướng về tâm, mắt nhìn ngang tầm sách (1.7m)
  const camPos = new THREE.Vector3(
    alcove.x + uX * 3.5,
    floorElevation + 1.7,
    alcove.z + uZ * 3.5
  );

  return {
    cameraPosition: camPos,
    lookAtTarget: bookPos,
    bookPosition: bookPos,
    item
  };
}

export class DirectoryHUD {
  constructor(cameraManager = null) {
    this.cameraManager = cameraManager;
    this.isOpen = false;

    try {
      this.initUI();
      this.initEvents();
      console.log("%c✓ DirectoryHUD initialized • Phím tắt [M] hoặc click nút để mở Thư mục!", "color: #39e58c; font-weight: bold;");
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo DirectoryHUD:", err);
    }
  }

  initUI() {
    if (typeof document === 'undefined') return;

    // 1. Nút bấm nhỏ góc trên bên phải màn hình
    let toggleBtn = document.getElementById('directory-hud-toggle-btn');
    if (!toggleBtn) {
      toggleBtn = document.createElement('button');
      toggleBtn.id = 'directory-hud-toggle-btn';
      toggleBtn.innerHTML = `
        <span class="btn-icon">🧭</span>
        <span class="btn-label">BẢN ĐỒ VĂN HỌC</span>
        <span class="btn-hotkey">M</span>
      `;
      document.body.appendChild(toggleBtn);
    }
    this.toggleButton = toggleBtn;

    // 2. Modal Overlay Thư mục Indochine
    let modal = document.getElementById('directory-hud-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'directory-hud-modal';
      modal.innerHTML = `
        <div class="dir-modal-backdrop" id="dir-modal-backdrop"></div>
        <div class="dir-modal-container">
          <div class="dir-modal-header">
            <div class="dir-title-wrapper">
              <div class="dir-badge">THÁNH ĐƯỜNG VĂN HỌC • VIỆT NAM VĂN TUYỂN</div>
              <h2 class="dir-main-title">THƯ MỤC ĐIỀU HƯỚNG 15 KHÔNG GIAN TỰ SỰ</h2>
              <div class="dir-subtitle">
                Bấm vào một tác phẩm bất kỳ để kích hoạt <strong>Lướt Camera Điện Ảnh (Fast-Travel)</strong> • Phím tắt <span class="kbd">M</span> hoặc <span class="kbd">ESC</span> để đóng
              </div>
            </div>
            <button class="dir-close-btn" id="dir-close-btn" title="Đóng thư mục (ESC)">✕</button>
          </div>

          <div class="dir-columns-grid">
            <!-- CỘT 1: TẦNG 1 -->
            <div class="dir-column col-floor-1">
              <div class="column-header">
                <div class="col-floor-badge floor-badge-1">TẦNG 1</div>
                <div class="col-title">DÂN GIAN & SỬ THI</div>
                <div class="col-desc">Khí phách quật khởi • Cội nguồn thiêng liêng</div>
              </div>
              <div class="cards-list" id="cards-floor-1"></div>
            </div>

            <!-- CỘT 2: TẦNG 2 -->
            <div class="dir-column col-floor-2">
              <div class="column-header">
                <div class="col-floor-badge floor-badge-2">TẦNG 2</div>
                <div class="col-title">VĂN HỌC TRUNG ĐẠI</div>
                <div class="col-desc">Hào khí Đông A • Đoạn trường tân thanh</div>
              </div>
              <div class="cards-list" id="cards-floor-2"></div>
            </div>

            <!-- CỘT 3: TẦNG 3 -->
            <div class="dir-column col-floor-3">
              <div class="column-header">
                <div class="col-floor-badge floor-badge-3">TẦNG 3</div>
                <div class="col-title">CẬN – HIỆN ĐẠI</div>
                <div class="col-desc">Hiện thực phê phán • Thơ mới bảng lảng</div>
              </div>
              <div class="cards-list" id="cards-floor-3"></div>
            </div>
          </div>

          <div class="dir-modal-footer">
            <div class="footer-note">
              <span class="status-dot online"></span> <strong>Phòng 01 (Truyện Kiều)</strong>: Cổng dịch chuyển KieuWorld đã sẵn sàng kết nối.
            </div>
            <div class="footer-fast-travel-hint">
              <span>✈ 1.8s Cinematic Camera Glide</span>
            </div>
          </div>
        </div>

        <div id="fast-travel-toast"></div>
      `;
      document.body.appendChild(modal);
    }
    this.modalElement = modal;

    // Render danh sách 15 tác phẩm vào 3 cột
    this.renderCards();

    // Thêm CSS style toàn cục
    this.injectStyles();
  }

  renderCards() {
    const floorContainers = {
      1: document.getElementById('cards-floor-1'),
      2: document.getElementById('cards-floor-2'),
      3: document.getElementById('cards-floor-3')
    };

    if (!floorContainers[1] || !floorContainers[2] || !floorContainers[3]) return;

    floorContainers[1].innerHTML = '';
    floorContainers[2].innerHTML = '';
    floorContainers[3].innerHTML = '';

    LITERATURE_REGISTRY.forEach((item, index) => {
      const container = floorContainers[item.floor];
      if (!container) return;

      const roomCode = `${item.floor}0${item.roomIndex + 1}`;
      const isPortalReady = item.portalReady === true;

      const card = document.createElement('div');
      card.className = `dir-room-card ${isPortalReady ? 'portal-ready-card' : ''}`;
      card.dataset.id = item.id;

      card.innerHTML = `
        <div class="card-top-row">
          <span class="room-code-tag">PHÒNG ${roomCode}</span>
          <span class="room-status-badge ${isPortalReady ? 'status-open' : 'status-exhibit'}">
            ${isPortalReady ? '✓ [ĐÃ MỞ CỔNG]' : '[SẢNH TRƯNG BÀY]'}
          </span>
        </div>
        <div class="room-work-title">${item.name}</div>
        <div class="room-work-author">${item.author}</div>
        <div class="card-hover-action">
          <span class="action-icon">✈</span>
          <span class="action-text">Lướt camera tới phòng</span>
        </div>
      `;

      card.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleCardClick(item);
      });

      container.appendChild(card);
    });
  }

  handleCardClick(item) {
    this.close();

    const target = getRoomFastTravelTarget(item);
    const roomCode = `${item.floor}0${item.roomIndex + 1}`;

    this.showToast(`✨ Đang lướt camera tới Phòng ${roomCode}: ${item.name}...`);

    if (this.cameraManager?.fastTravelTo) {
      this.cameraManager.fastTravelTo(target.cameraPosition, target.lookAtTarget, () => {
        this.showToast(`✓ Đã đến sảnh trưng bày: ${item.name}`);
      });
    }
  }

  showToast(message, duration = 2800) {
    const toast = document.getElementById('fast-travel-toast');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('visible');

    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }

    this.toastTimeout = setTimeout(() => {
      toast.classList.remove('visible');
    }, duration);
  }

  open() {
    if (this.isOpen) return;

    // Thoát PointerLock nếu đang điều khiển góc nhìn FPP
    if (typeof document !== 'undefined' && document.pointerLockElement) {
      document.exitPointerLock();
    }
    if (this.cameraManager?.cameraController?.controls?.isLocked) {
      try {
        this.cameraManager.cameraController.controls.unlock();
      } catch (e) {}
    }

    this.modalElement?.classList?.add('active');
    this.isOpen = true;
  }

  close() {
    if (!this.isOpen) return;
    this.modalElement?.classList?.remove('active');
    this.isOpen = false;
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  initEvents() {
    // 1. Phím tắt 'M' bật/tắt thư mục & 'ESC' đóng thư mục
    this.onKeyDown = (e) => {
      if (e.code === 'KeyM') {
        // Tránh kích hoạt nếu đang gõ vào input
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
        this.toggle();
      } else if (e.code === 'Escape' && this.isOpen) {
        this.close();
      }
    };
    window.addEventListener('keydown', this.onKeyDown);

    // 2. Nút bấm toggle góc trên
    this.toggleButton?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // 3. Nút đóng modal
    const closeBtn = document.getElementById('dir-close-btn');
    closeBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
    });

    // 4. Click vào vùng nền mờ backdrop để đóng
    const backdrop = document.getElementById('dir-modal-backdrop');
    backdrop?.addEventListener('click', () => {
      this.close();
    });
  }

  hideToggle(hide = true) {
    if (this.toggleButton) {
      this.toggleButton.style.display = hide ? 'none' : 'flex';
    }
    if (hide && this.isOpen) {
      this.close();
    }
  }

  injectStyles() {
    if (document.getElementById('directory-hud-styles')) return;

    const style = document.createElement('style');
    style.id = 'directory-hud-styles';
    style.innerHTML = `
      /* NÚT TOGGLE GÓC TRÊN MÀN HÌNH */
      #directory-hud-toggle-btn {
        position: fixed;
        top: 16px;
        right: 28px;
        z-index: 9998;
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 9px 16px;
        background: rgba(14, 18, 26, 0.88);
        border: 1px solid rgba(212, 175, 55, 0.65);
        border-radius: 20px;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        color: #f7eed8;
        font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.8px;
        cursor: pointer;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 15px rgba(212, 175, 55, 0.2);
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        user-select: none;
      }

      #directory-hud-toggle-btn:hover {
        transform: translateY(-2px);
        background: rgba(22, 28, 40, 0.95);
        border-color: #ffd700;
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.6), 0 0 22px rgba(255, 215, 0, 0.4);
      }

      #directory-hud-toggle-btn .btn-icon {
        font-size: 15px;
      }

      #directory-hud-toggle-btn .btn-hotkey {
        display: inline-block;
        background: rgba(212, 175, 55, 0.25);
        border: 1px solid rgba(212, 175, 55, 0.5);
        color: #ffd700;
        padding: 1px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 800;
        margin-left: 2px;
      }

      /* MODAL OVERLAY */
      #directory-hud-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 99990;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
      }

      #directory-hud-modal.active {
        opacity: 1;
        pointer-events: auto;
      }

      .dir-modal-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(6, 9, 14, 0.72);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }

      .dir-modal-container {
        position: relative;
        z-index: 2;
        width: 1140px;
        max-width: calc(100vw - 48px);
        max-height: calc(100vh - 48px);
        display: flex;
        flex-direction: column;
        background: radial-gradient(ellipse at 50% 0%, rgba(26, 33, 44, 0.96) 0%, rgba(12, 16, 22, 0.98) 100%);
        border: 1px solid rgba(212, 175, 55, 0.55);
        border-radius: 16px;
        padding: 28px 34px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.85), 0 0 40px rgba(212, 175, 55, 0.2);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        color: #f7eed8;
        transform: scale(0.96);
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        overflow: hidden;
      }

      #directory-hud-modal.active .dir-modal-container {
        transform: scale(1.0);
      }

      /* HEADER */
      .dir-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding-bottom: 18px;
        border-bottom: 1px solid rgba(212, 175, 55, 0.25);
        margin-bottom: 20px;
      }

      .dir-badge {
        display: inline-block;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 2px;
        color: #ffd700;
        background: rgba(212, 175, 55, 0.15);
        border: 1px solid rgba(212, 175, 55, 0.4);
        padding: 2px 9px;
        border-radius: 12px;
        margin-bottom: 6px;
        text-transform: uppercase;
      }

      .dir-main-title {
        margin: 0 0 6px 0;
        font-size: 22px;
        font-weight: 800;
        letter-spacing: 1.5px;
        background: linear-gradient(135deg, #fff5d0 0%, #d4af37 60%, #b8860b 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-transform: uppercase;
      }

      .dir-subtitle {
        font-size: 13px;
        color: #a8b9cc;
      }

      .dir-subtitle strong {
        color: #ffd269;
      }

      .kbd {
        display: inline-block;
        background: rgba(255, 255, 255, 0.12);
        border: 1px solid rgba(255, 255, 255, 0.25);
        padding: 1px 5px;
        border-radius: 4px;
        font-family: monospace;
        font-weight: 700;
        color: #fff;
      }

      .dir-close-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(212, 175, 55, 0.35);
        color: #ffd700;
        width: 34px;
        height: 34px;
        border-radius: 50%;
        font-size: 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .dir-close-btn:hover {
        background: rgba(212, 175, 55, 0.25);
        border-color: #ffd700;
        transform: rotate(90deg);
      }

      /* 3 CỘT GRID */
      .dir-columns-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
        overflow-y: auto;
        max-height: calc(88vh - 180px);
        padding-right: 6px;
        scrollbar-width: thin;
        scrollbar-color: rgba(212, 175, 55, 0.4) transparent;
      }

      .dir-columns-grid::-webkit-scrollbar {
        width: 5px;
      }
      .dir-columns-grid::-webkit-scrollbar-thumb {
        background: rgba(212, 175, 55, 0.4);
        border-radius: 4px;
      }

      .dir-column {
        background: rgba(255, 255, 255, 0.02);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .column-header {
        border-bottom: 1px solid rgba(212, 175, 55, 0.2);
        padding-bottom: 10px;
        margin-bottom: 4px;
      }

      .col-floor-badge {
        display: inline-block;
        font-size: 9.5px;
        font-weight: 800;
        letter-spacing: 1px;
        padding: 2px 7px;
        border-radius: 4px;
        margin-bottom: 4px;
        text-transform: uppercase;
      }

      .floor-badge-1 { background: rgba(230, 126, 34, 0.2); color: #f39c12; border: 1px solid rgba(230, 126, 34, 0.5); }
      .floor-badge-2 { background: rgba(57, 229, 140, 0.2); color: #39e58c; border: 1px solid rgba(57, 229, 140, 0.5); }
      .floor-badge-3 { background: rgba(231, 76, 60, 0.2); color: #e74c3c; border: 1px solid rgba(231, 76, 60, 0.5); }

      .col-title {
        font-size: 15px;
        font-weight: 800;
        letter-spacing: 0.8px;
        color: #fff;
        margin-bottom: 2px;
      }

      .col-desc {
        font-size: 11.5px;
        color: #8c9dae;
      }

      .cards-list {
        display: flex;
        flex-direction: column;
        gap: 9px;
      }

      /* ROOM CARD */
      .dir-room-card {
        background: rgba(20, 25, 34, 0.7);
        border: 1px solid rgba(212, 175, 55, 0.22);
        border-radius: 8px;
        padding: 11px 14px;
        cursor: pointer;
        transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        position: relative;
        overflow: hidden;
      }

      .dir-room-card:hover {
        transform: translateY(-2px);
        background: rgba(30, 38, 52, 0.9);
        border-color: #ffd700;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5), 0 0 14px rgba(212, 175, 55, 0.3);
      }

      .portal-ready-card {
        border-color: rgba(57, 229, 140, 0.55);
        box-shadow: inset 0 0 14px rgba(57, 229, 140, 0.08);
      }

      .portal-ready-card:hover {
        border-color: #39e58c;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6), 0 0 18px rgba(57, 229, 140, 0.5);
      }

      .card-top-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 5px;
      }

      .room-code-tag {
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 1px;
        color: #c9d6e4;
      }

      .room-status-badge {
        font-size: 9px;
        font-weight: 700;
        padding: 2px 6px;
        border-radius: 4px;
        letter-spacing: 0.5px;
      }

      .status-open {
        background: rgba(57, 229, 140, 0.2);
        border: 1px solid #39e58c;
        color: #4ef09e;
        box-shadow: 0 0 8px rgba(57, 229, 140, 0.3);
      }

      .status-exhibit {
        background: rgba(212, 175, 55, 0.12);
        border: 1px solid rgba(212, 175, 55, 0.35);
        color: #ffd269;
      }

      .room-work-title {
        font-size: 14px;
        font-weight: 700;
        color: #fff9eb;
        margin-bottom: 2px;
        letter-spacing: 0.4px;
      }

      .room-work-author {
        font-size: 11.5px;
        color: #9cb0c5;
      }

      .card-hover-action {
        display: flex;
        align-items: center;
        gap: 5px;
        margin-top: 8px;
        padding-top: 6px;
        border-top: 1px dashed rgba(255, 255, 255, 0.1);
        font-size: 10.5px;
        font-weight: 700;
        color: #ffd700;
        opacity: 0.7;
        transition: opacity 0.2s;
      }

      .dir-room-card:hover .card-hover-action {
        opacity: 1;
        color: #fff3be;
      }

      /* FOOTER */
      .dir-modal-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 16px;
        border-top: 1px solid rgba(212, 175, 55, 0.25);
        margin-top: 18px;
        font-size: 12px;
        color: #a0b2c6;
      }

      .status-dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #39e58c;
        box-shadow: 0 0 8px #39e58c;
        margin-right: 6px;
      }

      .footer-fast-travel-hint {
        color: #ffd700;
        font-weight: 600;
      }

      /* TOAST NOTIFICATION */
      #fast-travel-toast {
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: rgba(14, 18, 26, 0.94);
        border: 1px solid #ffd269;
        color: #fff8e7;
        padding: 10px 22px;
        border-radius: 24px;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.7), 0 0 20px rgba(212, 175, 55, 0.4);
        backdrop-filter: blur(14px);
        font-size: 13px;
        font-weight: 700;
        letter-spacing: 0.5px;
        opacity: 0;
        pointer-events: none;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        z-index: 99999;
      }

      #fast-travel-toast.visible {
        opacity: 1;
        transform: translateX(-50%) translateY(0);
      }
    `;
    document.head.appendChild(style);
  }

  destroy() {
    try {
      window.removeEventListener('keydown', this.onKeyDown);
      this.toggleButton?.remove?.();
      this.modalElement?.remove?.();
      document.getElementById('directory-hud-styles')?.remove?.();
    } catch (e) {}
  }
}
