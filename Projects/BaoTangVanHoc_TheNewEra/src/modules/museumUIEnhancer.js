/**
 * Module tinh chỉnh giao diện HUD, Bảng điều khiển và các nút bấm trong bảo tàng
 */
export function initMuseumUIEnhancer() {
  if (typeof document === 'undefined') return;

  // Kiểm tra xem đã có thẻ style tinh chỉnh chưa, nếu chưa thì thêm vào
  if (document.getElementById('museum-ui-enhancer-style')) return;

  const style = document.createElement('style');
  style.id = 'museum-ui-enhancer-style';
  style.innerHTML = `
    /* --- TINH CHỈNH GIAO DIỆN CHUNG --- */
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      overflow: hidden;
      user-select: none;
    }

    /* --- THANH HUD TRẠNG THÁI PHÍA TRÊN --- */
    #top-hud-bar, .top-header-bar {
      background: rgba(10, 22, 38, 0.92) !important;
      border-bottom: 2px solid rgba(0, 216, 255, 0.35) !important;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    }

    /* --- BẢNG ĐIỀU KHIỂN BÊN TRÁI (CONTROLS PANEL) --- */
    #control-panel, .sidebar-panel, div[class*="control"] {
      background: rgba(12, 22, 35, 0.94) !important;
      border: 1px solid rgba(0, 216, 255, 0.28) !important;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      color: #e2f1ff !important;
    }

    /* --- CÁC NÚT BẤM (BUTTONS) TRONG BẢO TÀNG --- */
    button, .museum-btn {
      background: linear-gradient(135deg, #1b3a5c, #0d2138) !important;
      border: 1px solid #00d8ff !important;
      color: #ffffff !important;
      border-radius: 8px;
      padding: 8px 14px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      box-shadow: 0 0 10px rgba(0, 216, 255, 0.2);
    }

    button:hover, .museum-btn:hover {
      background: linear-gradient(135deg, #00d8ff, #0077ff) !important;
      color: #04101e !important;
      box-shadow: 0 0 18px rgba(0, 216, 255, 0.6);
      transform: translateY(-1px);
    }

    /* --- THANH ĐIỀU HƯỚNG / TRỢ GIÚP DƯỚI ĐÁY MÀN HÌNH --- */
    #footer-instructions, .bottom-nav-bar {
      background: rgba(8, 16, 28, 0.92) !important;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      color: #ffd15c !important;
      font-weight: 500;
      letter-spacing: 0.5px;
    }
  `;
  document.head.appendChild(style);

  console.log('%c🎨 [UI ENHANCER] Đã áp dụng tinh chỉnh giao diện bảo tàng thành công!', 'color: #38ef7d; font-weight: bold;');
}