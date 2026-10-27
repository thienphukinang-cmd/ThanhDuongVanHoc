import { PRESET_VIEWS } from '../controls/cameraManager.js';

/**
 * ARCHITECTURAL DIRECTOR UI HUD
 * GIAI ĐOẠN 1: BỘ KHUNG (BLOCKOUT) & CINEMATIC FLY-THROUGH TOUR (30S)
 * Skill: threejs-camera-direction
 * 
 * Áp dụng Lập trình phòng ngừa (Defensive Programming & Nullish Coalescing)
 */

export class DirectorPanel {
  constructor(cameraManager = null, artDirectorLighting = null, postProcessingManager = null, proceduralVfx = null, worldManager = null, audioManager = null) {
    this.camMgr = cameraManager;
    this.lighting = artDirectorLighting;
    this.post = postProcessingManager;
    this.vfx = proceduralVfx;
    this.worldManager = worldManager;
    this.audioManager = audioManager;
    this.truyenKieuStoryWorld = null;

    try {
      this.initUI();
      this.bindTourEvents();
      this.bindEvents();
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo DirectorPanel UI:", err);
    }
  }

  initUI() {
    if (typeof document === 'undefined') return;

    const existingHud = document.getElementById('director-hud');
    if (existingHud) {
      existingHud.remove();
    }

    const container = document.createElement('div');
    container.id = 'director-hud';
    container.innerHTML = `
      <style>
        #director-hud {
          position: absolute;
          top: 16px;
          left: 16px;
          z-index: 100;
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
          color: #f0f3f6;
          user-select: none;
          width: 405px;
          max-height: 94vh;
          overflow-y: auto;
          pointer-events: none;
          scrollbar-width: thin;
          scrollbar-color: rgba(212, 175, 55, 0.4) transparent;
        }

        #director-hud::-webkit-scrollbar {
          width: 5px;
        }
        #director-hud::-webkit-scrollbar-thumb {
          background: rgba(212, 175, 55, 0.4);
          border-radius: 4px;
        }

        .hud-card {
          background: rgba(10, 14, 22, 0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(212, 175, 55, 0.4);
          border-radius: 12px;
          padding: 16px 18px;
          margin-bottom: 12px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.75), 0 0 24px rgba(212, 175, 55, 0.18);
          pointer-events: auto;
        }

        .hud-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 8px;
        }

        .hud-title {
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          background: linear-gradient(135deg, #fff5d0 0%, #dfb746 55%, #ad821a 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hud-tag {
          font-size: 9px;
          font-weight: 700;
          background: rgba(212, 175, 55, 0.22);
          border: 1px solid rgba(212, 175, 55, 0.55);
          color: #ffe082;
          padding: 2px 7px;
          border-radius: 4px;
          letter-spacing: 0.5px;
        }

        .hud-subtitle {
          font-size: 11px;
          color: #8da4b8;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .hud-subtitle::before {
          content: '';
          display: inline-block;
          width: 7px;
          height: 7px;
          background: #39e58c;
          border-radius: 50%;
          box-shadow: 0 0 8px #39e58c;
        }

        .tour-box {
          background: linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(20, 26, 38, 0.6) 100%);
          border: 1px solid rgba(212, 175, 55, 0.5);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 14px;
        }

        .tour-title {
          font-size: 12px;
          font-weight: 700;
          color: #ffd770;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 6px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .btn-tour {
          width: 100%;
          background: linear-gradient(135deg, #d4af37 0%, #aa801a 100%);
          border: none;
          color: #0c0e14;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.8px;
          padding: 10px 12px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.25s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-transform: uppercase;
          box-shadow: 0 4px 14px rgba(212, 175, 55, 0.35);
        }

        .btn-tour:hover {
          background: linear-gradient(135deg, #ffd770 0%, #c49622 100%);
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(212, 175, 55, 0.5);
        }

        .progress-bar-wrap {
          width: 100%;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          margin-top: 10px;
          overflow: hidden;
          position: relative;
        }

        .progress-bar-fill {
          width: 0%;
          height: 100%;
          background: linear-gradient(90deg, #d4af37, #39e58c);
          transition: width 0.1s linear;
        }

        .tour-status {
          font-size: 10.5px;
          color: #cddbe8;
          margin-top: 6px;
          line-height: 1.4;
          min-height: 30px;
        }

        .section-label {
          font-size: 11px;
          font-weight: 700;
          color: #ffd770;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }

        .btn-group {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          margin-bottom: 12px;
        }

        .cam-btn {
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: #e8eff5;
          font-size: 10.5px;
          padding: 6px 6px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }

        .cam-btn:hover {
          background: rgba(212, 175, 55, 0.25);
          border-color: #d4af37;
          color: #ffffff;
        }

        .cam-btn.active {
          background: linear-gradient(135deg, rgba(212, 175, 55, 0.4), rgba(150, 110, 20, 0.4));
          border-color: #ffd770;
          color: #fff8e8;
          font-weight: 600;
        }

        .slider-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 11px;
          margin-bottom: 6px;
          color: #b0c4de;
        }

        .slider-row input[type=range] {
          width: 140px;
          accent-color: #d4af37;
          cursor: pointer;
        }

        .hud-footer {
          font-size: 9.5px;
          color: #6a7c91;
          text-align: center;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          padding-top: 6px;
        }
      </style>

      <div class="hud-card">
        <div class="hud-header">
          <div>
            <div class="hud-title">Bảo Tàng Văn Học</div>
            <div class="hud-subtitle">Khởi Tạo & Blockout 3 Tầng</div>
          </div>
          <div class="hud-tag">FLY-THROUGH 30S</div>
        </div>

        <!-- 30-SECOND CINEMATIC AUTO TOUR -->
        <div class="tour-box">
          <div class="tour-title">
            <span>Auto-Camera Tour Nghiệm Thu</span>
            <span id="tour-time-text" style="color: #4ef09e; font-family: monospace;">00:00 / 00:30</span>
          </div>

          <button class="btn-tour" id="btn-play-tour">
            <span>▶ BẮT ĐẦU TOUR ĐIỆN ẢNH (30 GIÂY)</span>
          </button>

          <div class="progress-bar-wrap">
            <div class="progress-bar-fill" id="tour-progress-bar"></div>
          </div>

          <div class="tour-status" id="tour-status-desc">
            Sẵn sàng thực thi chuyến bay điện ảnh 30s qua 4 giai đoạn spline để nghiệm thu toàn bộ khung kiến trúc sảnh và các phòng.
          </div>
        </div>

        <!-- DUAL CAMERA SYSTEM CONTROLS -->
        <div class="section-label" style="display: flex; justify-content: space-between; align-items: center;">
          <span>Hệ Thống Dual Camera (WASD)</span>
          <span id="hud-camera-mode-badge" style="font-size: 9px; background: rgba(57, 229, 140, 0.2); color: #39e58c; padding: 2px 6px; border-radius: 4px; border: 1px solid #39e58c;">WALKER (1.8M)</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 12px;">
          <button class="cam-btn" id="btn-toggle-camera-mode" style="background: rgba(212, 175, 55, 0.2); border-color: #d4af37; color: #ffe082;">
            🔄 Đổi Mode (Phím V)
          </button>
          <button class="cam-btn" id="btn-lock-pointer" style="background: rgba(57, 229, 140, 0.15); border-color: #39e58c; color: #4ef09e;">
            🔒 Khóa Chuột (FPS)
          </button>
        </div>

        <!-- CAMERA PRESETS -->
        <div class="section-label">Điểm Nhìn & Phòng Mẫu</div>
        <div class="btn-group">
          <button class="cam-btn active" id="btn-room201" style="grid-column: span 2; background: linear-gradient(135deg, rgba(212, 175, 55, 0.45), rgba(150, 110, 20, 0.45)); border-color: #ffd770; font-weight: 700;">
            📖 Vào Phòng Mẫu 01 (Sách Truyện Kiều)
          </button>
          <button class="cam-btn" id="btn-staircase">Cầu Thang Chữ Y</button>
          <button class="cam-btn" id="btn-landing">Chiếu Nghỉ (Y=5.5m)</button>
          <button class="cam-btn" id="btn-rooms">Cửa Vòm Tầng 2</button>
          <button class="cam-btn" id="btn-lvl3">Thượng Tầng 3</button>
          <button class="cam-btn" id="btn-birds">Toàn Cảnh Chim Bay</button>
          <button class="cam-btn" id="btn-trangan" style="grid-column: span 2; background: linear-gradient(135deg, rgba(74, 144, 226, 0.35), rgba(40, 90, 150, 0.35)); border-color: #82b1ff; color: #e3f2fd; font-weight: 600;">
            ⛰️ Ngắm Non Nước Tràng An & Lan Can Indochine
          </button>
          <button class="cam-btn" id="btn-enter-kieuworld" style="grid-column: span 2; background: linear-gradient(135deg, rgba(235, 140, 160, 0.45), rgba(180, 80, 110, 0.45)); border-color: #ff99bb; color: #ffe4ec; font-weight: 700;">
            🌸 Cổng Dịch Chuyển: 3 Cõi Truyện Kiều (Click Sách)
          </button>
          <div style="grid-column: span 2; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; margin-top: 2px;">
            <button class="cam-btn" id="hud-zone-1" style="font-size: 9.5px; padding: 5px 2px;">🌸 Vườn Thúy</button>
            <button class="cam-btn" id="hud-zone-2" style="font-size: 9.5px; padding: 5px 2px;">🌊 Lầu Ngưng Bích</button>
            <button class="cam-btn" id="hud-zone-3" style="font-size: 9.5px; padding: 5px 2px;">⚔️ Từ Hải</button>
          </div>
        </div>

        <!-- LIGHTING & CONTROLS -->
        <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 8px;">
          <div class="slider-row">
            <span>Tia Sáng God-Rays:</span>
            <input type="range" id="slider-godrays" min="0" max="3" step="0.1" value="1.15">
          </div>
          <div class="slider-row">
            <span>Quầng Sáng Bloom:</span>
            <input type="range" id="slider-bloom" min="0" max="1.2" step="0.05" value="0.40">
          </div>
        </div>

        <!-- PERFORMANCE & DYNAMIC QUALITY (FPS LOD) -->
        <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 8px; margin-top: 6px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 700; color: #39e58c;">⚡ Tối Ưu FPS (LOD):</span>
            <span id="hud-perf-status" style="font-size: 10px; color: #ffd770;">AUTO (60 FPS)</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px;">
            <button class="cam-btn active" id="btn-perf-auto" style="font-size: 9.5px; padding: 4px;">Tự Động</button>
            <button class="cam-btn" id="btn-perf-high" style="font-size: 9.5px; padding: 4px;">Cao (60)</button>
            <button class="cam-btn" id="btn-perf-eco" style="font-size: 9.5px; padding: 4px;">Tiết Kiệm</button>
          </div>
        </div>

        <div class="hud-footer">
          Chuột trái: Xoay 360° | Chuột phải: Pan | Cuộn: Thu phóng
        </div>
      </div>
    `;

    document.body.appendChild(container);
  }

  bindTourEvents() {
    const playBtn = document.getElementById('btn-play-tour');
    const timeText = document.getElementById('tour-time-text');
    const progBar = document.getElementById('tour-progress-bar');
    const statusDesc = document.getElementById('tour-status-desc');

    const tour = this.camMgr?.cinematicTour;
    if (!tour) return;

    if (playBtn) {
      playBtn.addEventListener('click', () => {
        try {
          if (!tour.isPlaying) {
            tour.start();
            playBtn.innerHTML = '<span>⏸ ĐANG BAY ĐIỆN ẢNH...</span>';
          } else {
            tour.stop();
            playBtn.innerHTML = '<span>▶ BẮT ĐẦU TOUR ĐIỆN ẢNH (30 GIÂY)</span>';
            if (statusDesc) {
              statusDesc.textContent = "Tour tạm dừng. Bạn có thể nhấn để bắt đầu lại hoặc dùng chuột tự do.";
            }
          }
        } catch (e) {
          console.warn("[SELF-HEALING] Lỗi bật tour:", e);
        }
      });
    }

    tour.onProgressUpdate = (current, total) => {
      try {
        const curSec = Math.floor(current ?? 0).toString().padStart(2, '0');
        const totSec = Math.floor(total ?? 30).toString().padStart(2, '0');
        if (timeText) timeText.textContent = `00:${curSec} / 00:${totSec}`;

        const pct = Math.min(100, Math.max(0, ((current ?? 0) / (total || 30)) * 100));
        if (progBar) progBar.style.width = `${pct}%`;

        if (statusDesc) {
          statusDesc.textContent = tour.getCurrentPhaseName?.() ?? "Đang bay nghiệm thu...";
        }
      } catch (e) {
        console.warn("[SELF-HEALING] Lỗi cập nhật tiến độ tour:", e);
      }
    };

    tour.onTourComplete = () => {
      try {
        if (playBtn) playBtn.innerHTML = '<span>↺ XEM LẠI TOUR (30 GIÂY)</span>';
        if (timeText) timeText.textContent = `00:30 / 00:30`;
        if (progBar) progBar.style.width = `100%`;
        if (statusDesc) {
          statusDesc.textContent = "✓ Hoàn thành 30 giây nghiệm thu bộ khung kiến trúc! Bạn có thể xem lại hoặc dùng chuột tự do.";
        }
      } catch (e) {
        console.warn("[SELF-HEALING] Lỗi kết thúc tour:", e);
      }
    };
  }

  bindEvents() {
    // Nút đổi Camera Mode (Walker / Freecam)
    const toggleModeBtn = document.getElementById('btn-toggle-camera-mode');
    const modeBadge = document.getElementById('hud-camera-mode-badge');
    if (toggleModeBtn) {
      toggleModeBtn.addEventListener('click', () => {
        try {
          this.camMgr?.cameraController?.toggleMode?.();
          const currentMode = this.camMgr?.cameraController?.mode ?? 'walker';
          if (modeBadge) {
            modeBadge.textContent = currentMode === 'walker' ? 'WALKER (1.8M)' : 'FREECAM (BAY)';
            modeBadge.style.color = currentMode === 'walker' ? '#39e58c' : '#ffd700';
            modeBadge.style.borderColor = currentMode === 'walker' ? '#39e58c' : '#ffd700';
          }
        } catch (e) {
          console.warn("[SELF-HEALING] Lỗi toggle camera mode:", e);
        }
      });
    }

    // Nút khóa chuột PointerLock
    const lockPointerBtn = document.getElementById('btn-lock-pointer');
    if (lockPointerBtn) {
      lockPointerBtn.addEventListener('click', () => {
        try {
          this.camMgr?.cameraController?.controls?.lock?.();
        } catch (e) {
          console.warn("[SELF-HEALING] Lỗi lock pointer:", e);
        }
      });
    }

    // Đồng bộ badge khi phím V được nhấn
    if (this.camMgr?.cameraController) {
      this.camMgr.cameraController.onModeChange = (mode) => {
        if (modeBadge) {
          modeBadge.textContent = mode === 'walker' ? 'WALKER (1.8M)' : 'FREECAM (BAY)';
          modeBadge.style.color = mode === 'walker' ? '#39e58c' : '#ffd700';
          modeBadge.style.borderColor = mode === 'walker' ? '#39e58c' : '#ffd700';
        }
      };
    }

    const buttons = {
      'btn-room201': PRESET_VIEWS?.ROOM_201_BOOK,
      'btn-staircase': PRESET_VIEWS?.STAIRCASE_FRONT,
      'btn-landing': PRESET_VIEWS?.STAIRCASE_LANDING,
      'btn-rooms': PRESET_VIEWS?.LEVEL_2_ROOMS,
      'btn-lvl3': PRESET_VIEWS?.LEVEL_3_GALLERY,
      'btn-birds': PRESET_VIEWS?.BIRDS_EYE,
      'btn-trangan': PRESET_VIEWS?.TRANG_AN_VISTA,
    };

    Object.entries(buttons).forEach(([id, preset]) => {
      const btn = document.getElementById(id);
      if (btn && preset) {
        btn.addEventListener('click', () => {
          try {
            document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (this.truyenKieuStoryWorld?.isInsideWorld) {
              this.truyenKieuStoryWorld.toggleStoryWorld();
            }
            if (this.worldManager?.currentState === 'KIEU_WORLD') {
              this.worldManager?.transitionTo?.('MUSEUM_ATRIUM');
            }
            this.camMgr?.setView?.(preset, true);
          } catch (e) {
            console.warn("[SELF-HEALING] Lỗi đặt preset góc nhìn:", e);
          }
        });
      }
    });

    const enterKieuBtn = document.getElementById('btn-enter-kieuworld');
    if (enterKieuBtn) {
      enterKieuBtn.addEventListener('click', () => {
        try {
          document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
          enterKieuBtn.classList.add('active');
          if (this.truyenKieuStoryWorld) {
            this.truyenKieuStoryWorld.toggleStoryWorld();
          } else {
            this.worldManager?.transitionTo?.('KIEU_WORLD');
          }
        } catch (e) {
          console.warn("[SELF-HEALING] Lỗi chuyển KieuWorld:", e);
        }
      });
    }

    [1, 2, 3].forEach((zid) => {
      const zBtn = document.getElementById(`hud-zone-${zid}`);
      if (zBtn) {
        zBtn.addEventListener('click', () => {
          try {
            document.querySelectorAll('.cam-btn').forEach(b => b.classList.remove('active'));
            zBtn.classList.add('active');
            if (this.truyenKieuStoryWorld) {
              this.truyenKieuStoryWorld.switchZone(zid);
            }
          } catch (err) {
            console.warn(`[SELF-HEALING] Lỗi chuyển Zone ${zid}:`, err);
          }
        });
      }
    });

    const godRaySlider = document.getElementById('slider-godrays');
    if (godRaySlider) {
      godRaySlider.addEventListener('input', (e) => {
        try {
          this.lighting?.setGodRayIntensity?.(parseFloat(e.target.value));
        } catch (err) {
          console.warn("[SELF-HEALING] Lỗi slider godrays:", err);
        }
      });
    }

    const bloomSlider = document.getElementById('slider-bloom');
    if (bloomSlider) {
      bloomSlider.addEventListener('input', (e) => {
        try {
          this.post?.setBloomStrength?.(parseFloat(e.target.value));
        } catch (err) {
          console.warn("[SELF-HEALING] Lỗi slider bloom:", err);
        }
      });
    }

    // Điều khiển chế độ chất lượng & tối ưu FPS
    const perfStatus = document.getElementById('hud-perf-status');
    const btnAuto = document.getElementById('btn-perf-auto');
    const btnHigh = document.getElementById('btn-perf-high');
    const btnEco = document.getElementById('btn-perf-eco');

    const setActivePerf = (activeBtn, modeName) => {
      [btnAuto, btnHigh, btnEco].forEach((b) => b?.classList?.remove?.('active'));
      activeBtn?.classList?.add?.('active');
      if (perfStatus) perfStatus.textContent = modeName;
    };

    btnAuto?.addEventListener('click', () => {
      window.performanceOptimizer?.setMode?.('auto');
      setActivePerf(btnAuto, 'AUTO (Thích Ứng)');
    });
    btnHigh?.addEventListener('click', () => {
      window.performanceOptimizer?.setMode?.('high');
      setActivePerf(btnHigh, 'HIGH (Cao)');
    });
    btnEco?.addEventListener('click', () => {
      window.performanceOptimizer?.setMode?.('low');
      setActivePerf(btnEco, 'ECO (Tiết Kiệm)');
    });
  }

  setTruyenKieuStoryWorld(world) {
    this.truyenKieuStoryWorld = world;
  }

  setPerformanceOptimizer(optimizer) {
    this.performanceOptimizer = optimizer;
  }
}
