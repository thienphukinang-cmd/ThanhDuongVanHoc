import * as THREE from 'three';

/**
 * NARRATIVE TRIGGER SYSTEM (PROXIMITY POETRY TRIGGERS & TYPOGRAPHY HUD)
 * Skills: threejs-design-director, threejs-ui
 * 
 * Quản lý các vùng va chạm tự sự (Narrative Zones) kích hoạt thơ Nguyễn Du:
 * - Vùng 1 (Đầu cầu/Ven suối): "Thanh minh trong tiết tháng ba / Lễ là tảo mộ hội là đạp thanh"
 * - Vùng 2 (Nấm mồ Đạm Tiên): "Sè sè nấm đất bên đường / Rầu rầu ngọn cỏ nửa vàng nửa xanh"
 * - Vùng 3 (Rặng liễu hoàng hôn): "Tà tà bóng ngả về tây / Gương nga chênh chếch dặm mây coi chừng"
 * 
 * Tối ưu hóa WebGL Lead Architect:
 * - Vòng lặp check cự ly chỉ dùng distanceToSquared (bình phương khoảng cách), triệt tiêu Math.sqrt() mỗi frame.
 * - Typography UI dạng chữ khắc cổ điển mờ ảo dưới đáy màn hình với hiệu ứng Fade-in/Fade-out mượt mà.
 */

export class NarrativeTrigger {
  constructor(camera = null, options = {}) {
    this.camera = camera;
    this.activeZone = null;
    this.enabled = true;

    // Danh sách 3 vùng tự sự kinh điển của Tiết Thanh Minh
    this.zones = [
      {
        id: 'bridge_stream',
        title: 'HỘI ĐẠP THANH VEN SUỐI',
        landmarkName: 'Nhịp Cầu Thoang Thoảng',
        position: new THREE.Vector3(2.0, 0, 3.5),
        radius: 5.5,
        radiusSq: 5.5 * 5.5, // 30.25 (Tránh gọi Math.sqrt)
        verses: [
          "Thanh minh trong tiết tháng ba,",
          "Lễ là tảo mộ hội là đạp thanh."
        ],
        subtext: "Dập dìu tài tử giai nhân, ngựa xe như nước áo quần như nêm."
      },
      {
        id: 'dam_tien_grave',
        title: 'NẤM MỒ ĐẠM TIÊN',
        landmarkName: 'Nấm Đất Vô Chủ Bên Đường',
        position: new THREE.Vector3(-15.0, 0, -5.0),
        radius: 6.0,
        radiusSq: 6.0 * 6.0, // 36.00
        verses: [
          "Sè sè nấm đất bên đường,",
          "Rầu rầu ngọn cỏ nửa vàng nửa xanh."
        ],
        subtext: "Một nấm mồ vô chủ hoang lạnh, khói hương thoang thoảng tấc lòng xót thương giai nhân bạc mệnh."
      },
      {
        id: 'willow_sunset',
        title: 'HOÀNG HÔN BÊN RẶNG LIỄU',
        landmarkName: 'Rặng Liễu Chiều Tà',
        position: new THREE.Vector3(-8.0, 0, 6.0),
        radius: 6.5,
        radiusSq: 6.5 * 6.5, // 42.25
        verses: [
          "Tà tà bóng ngả về tây,",
          "Gương nga chênh chếch dặm mây coi chừng."
        ],
        subtext: "Bóng chiều tà ngả nghiêng trên rặng liễu, hoa lê lác đác bay trong làn gió xuân bảng lảng."
      }
    ];

    try {
      this.createTypographyUI();
      console.log("%c✓ NarrativeTrigger initialized • 3 Proximity Poetry Zones registered", "color: #39e58c; font-weight: bold;");
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo NarrativeTrigger:", err);
    }
  }

  setCamera(cam) {
    this.camera = cam;
  }

  setEnabled(val = true) {
    this.enabled = val;
    if (!val) {
      this.hideTypography();
      this.activeZone = null;
    }
  }

  /**
   * Tạo Component UI Typography Thơ Cổ Điển
   */
  createTypographyUI() {
    if (typeof document === 'undefined') return;

    let el = document.getElementById('narrative-poetry-hud');
    if (!el) {
      el = document.createElement('div');
      el.id = 'narrative-poetry-hud';
      el.innerHTML = `
        <style>
          #narrative-poetry-hud {
            position: fixed;
            bottom: 36px;
            left: 50%;
            transform: translateX(-50%) translateY(24px);
            width: auto;
            min-width: 480px;
            max-width: 90vw;
            background: radial-gradient(ellipse at center, rgba(14, 18, 24, 0.92) 0%, rgba(8, 11, 16, 0.98) 100%);
            border: 1px solid rgba(212, 175, 55, 0.45);
            border-radius: 12px;
            padding: 20px 32px;
            box-shadow: 0 16px 40px rgba(0, 0, 0, 0.85), 0 0 30px rgba(212, 175, 55, 0.22);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            text-align: center;
            opacity: 0;
            pointer-events: none;
            z-index: 9995;
            transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
            user-select: none;
          }

          #narrative-poetry-hud.visible {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }

          .poetry-header {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-bottom: 12px;
          }

          .poetry-badge {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: #39e58c;
            background: rgba(57, 229, 140, 0.15);
            border: 1px solid rgba(57, 229, 140, 0.5);
            padding: 3px 9px;
            border-radius: 4px;
          }

          .poetry-landmark {
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 1.2px;
            color: #dfb746;
            text-transform: uppercase;
          }

          .poetry-verses {
            font-family: 'Playfair Display', 'Merriweather', 'Georgia', serif;
            font-size: 21px;
            line-height: 1.75;
            font-weight: 600;
            font-style: italic;
            background: linear-gradient(135deg, #fff7dc 0%, #ffd978 60%, #e0a33c 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin: 0;
            letter-spacing: 0.5px;
            text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
          }

          .poetry-subtext {
            font-size: 11.5px;
            color: #a4b4c4;
            margin-top: 10px;
            font-style: normal;
            letter-spacing: 0.4px;
          }
        </style>

        <div class="poetry-header">
          <span class="poetry-badge">TRUYỆN KIỀU • NGUYỄN DU</span>
          <span class="poetry-landmark" id="poetry-landmark-title">HỘI ĐẠP THANH VEN SUỐI</span>
        </div>
        <div class="poetry-verses" id="poetry-verses-content">
          Thanh minh trong tiết tháng ba,<br>
          Lễ là tảo mộ hội là đạp thanh.
        </div>
        <div class="poetry-subtext" id="poetry-subtext-content">
          Dập dìu tài tử giai nhân, ngựa xe như nước áo quần như nêm.
        </div>
      `;
      document.body.appendChild(el);
    }

    this.hudElement = el;
    this.titleElement = document.getElementById('poetry-landmark-title');
    this.versesElement = document.getElementById('poetry-verses-content');
    this.subtextElement = document.getElementById('poetry-subtext-content');
  }

  showTypography(zone) {
    if (!this.hudElement || !zone) return;

    if (this.titleElement) {
      this.titleElement.textContent = zone.title;
    }
    if (this.versesElement) {
      this.versesElement.innerHTML = zone.verses.join('<br>');
    }
    if (this.subtextElement) {
      this.subtextElement.textContent = zone.subtext || '';
    }

    this.hudElement.classList.add('visible');
  }

  hideTypography() {
    if (this.hudElement) {
      this.hudElement.classList.remove('visible');
    }
  }

  /**
   * TỐI ƯU VÒNG LẶP RENDER: Chỉ so sánh bình phương khoảng cách (distanceToSquared)
   * Tuyệt đối không dùng Math.sqrt() nhằm duy trì 60 FPS
   */
  update() {
    if (!this.enabled || !this.camera) return;

    const camX = this.camera.position.x;
    const camZ = this.camera.position.z;

    let closestZone = null;
    let closestDistSq = Infinity;

    for (let i = 0; i < this.zones.length; i++) {
      const z = this.zones[i];
      const dx = camX - z.position.x;
      const dz = camZ - z.position.z;
      const distSq = dx * dx + dz * dz; // KHÔNG CĂN BẬC HAI

      if (distSq <= z.radiusSq) {
        if (distSq < closestDistSq) {
          closestDistSq = distSq;
          closestZone = z;
        }
      }
    }

    // Xử lý chuyển đổi hiển thị mượt mà
    if (closestZone) {
      if (this.activeZone?.id !== closestZone.id) {
        this.activeZone = closestZone;
        this.showTypography(closestZone);
        console.log(`%c[POETRY TRIGGER] Bước vào vùng: ${closestZone.title}`, "color: #ffd700; font-weight: bold;");
      }
    } else {
      if (this.activeZone !== null) {
        this.activeZone = null;
        this.hideTypography();
      }
    }
  }

  destroy() {
    try {
      this.hudElement?.remove?.();
    } catch (e) {}
  }
}
