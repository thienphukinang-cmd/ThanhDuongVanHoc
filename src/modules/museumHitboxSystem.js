import * as THREE from 'three';

/**
 * ============================================================================
 * MUSEUM HITBOX & COLLISION ARCHITECT SYSTEM
 * Ứng dụng kỹ năng: hitbox-collision-architect & fps-optimizer
 * - Tự động bọc Proxy Hitbox ôm sát mô hình .GLB để click chuẩn 100%
 * - Chặn đi xuyên tường, cột trụ, bệ hoa sen với cơ chế trượt mượt (Wall Sliding)
 * - Tường phòng trưng bày chia 2 nửa chừa khoảng cửa rộng 5.4m (Door Opening)
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

export class MuseumHitboxManager {
  constructor(scene) {
    this.scene = scene;
    this.solidBoxes = [];       // Danh sách Box3 chặn người chơi đi xuyên qua (Obstacles)
    this.clickProxies = [];     // Danh sách Mesh hộp vô hình dùng để bắt click cực nhạy
    this.debugHelpers = new THREE.Group();
    this.debugHelpers.name = 'Museum_Hitbox_Debug_Helpers';
    this.debugHelpers.visible = false; // Mặc định ẩn, bấm phím H hoặc F2 để hiện
    this.scene.add(this.debugHelpers);

    activeHitboxManagerInstance = this;
    if (typeof window !== 'undefined') {
      window.__museumHitboxManager = this;
      window.hitboxManager = this;
    }

    this._bindDebugShortcut();
  }

  _bindDebugShortcut() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', (e) => {
      // Tránh bắt phím khi đang nhập form/input
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        return;
      }
      if (e.key === 'h' || e.key === 'H' || e.key === 'F2') {
        this.toggleDebugWireframes();
      }
    });
  }

  /**
   * Bật/Tắt hiển thị toàn bộ Hitbox trong bảo tàng (Màu xanh lá: Vật cản, Màu vàng: Click tương tác)
   */
  toggleDebugWireframes(forceState = null) {
    this.debugHelpers.visible =
      forceState !== null ? forceState : !this.debugHelpers.visible;
    const isVisible = this.debugHelpers.visible;

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
        background: rgba(15, 23, 42, 0.92);
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
   * Đảm bảo tính nhất quán tuyệt đối, không có hitbox rác hay va chạm trùng lặp.
   */
  rebuildAllMuseumHitboxes() {
    this.clearAllHitboxes();
    console.log(
      '%c[Hitbox Architect] Đang xóa sạch mọi hitbox cũ và tái thiết lập toàn diện hệ thống Hitbox...',
      'color: #38bdf8; font-weight: bold;'
    );

    const addMacroWall = (minX, minY, minZ, maxX, maxY, maxZ, tag) => {
      const box = new THREE.Box3(
        new THREE.Vector3(minX, minY, minZ),
        new THREE.Vector3(maxX, maxY, maxZ)
      );
      this.registerSolidObjectCollider(null, { customBox: box, tag });
    };

    // 1. TƯỜNG BIÊN NGOẠI VI BẢO TÀNG (Outer Perimeter Boundary Walls)
    // Tường Bắc: Tách làm 2 đoạn Tây & Đông, chừa trống lối vào & lòng Phòng An Dương Vương (X: -16.0 đến +16.0)
    addMacroWall(-64.5, 0.0, -45.5, -16.0, 32.0, -44.2, 'Perimeter_Wall_North_West');
    addMacroWall(16.0, 0.0, -45.5, 64.5, 32.0, -44.2, 'Perimeter_Wall_North_East');
    addMacroWall(-64.5, 0.0, 44.2, 64.5, 32.0, 45.5, 'Perimeter_Wall_South');
    addMacroWall(-65.5, 0.0, -45.0, -64.2, 32.0, 45.0, 'Perimeter_Wall_West');
    addMacroWall(64.2, 0.0, -45.0, 65.5, 32.0, 45.0, 'Perimeter_Wall_East');

    // 2. VÁCH NGĂN TRUNG TÂM TẦNG 2 GIỮA CÁC PHÒNG (Divider Partitions)
    addMacroWall(-64.0, 9.8, -0.4, -34.8, 18.2, 0.4, 'Floor2_Partition_West');
    addMacroWall(34.8, 9.8, -0.4, 64.0, 18.2, 0.4, 'Floor2_Partition_East');

    // 3. TƯỜNG PHÒNG TRƯNG BÀY CÓ CHỪA Ô CỬA RỘNG 5.4M (Doorway Width = 5.4m)
    // Tuyệt đối chia 2 nửa Trái - Phải, chừa trống cửa ở giữa!
    // Phòng 01: Truyện Kiều (Tầng 2, Cửa vòm hướng Đông / Đại sảnh tại X = -35.0, Z=19.0)
    this.registerRoomWallsWithDoorway({
      roomCenter: new THREE.Vector3(-48.0, 9.8, 19.0),
      roomWidth: 26,
      roomDepth: 28,
      wallHeight: 8.4,
      doorSide: 'right', // Cửa ở vách Đông nhìn ra sảnh
      doorWidth: 5.4,
      floorY: 9.8
    });

    // Phòng 02: Nam Quốc Sơn Hà (Tầng 2, Cửa vòm hướng Đông / Đại sảnh tại X = -35.0, Z=-19.0)
    this.registerRoomWallsWithDoorway({
      roomCenter: new THREE.Vector3(-48.0, 9.8, -19.0),
      roomWidth: 26,
      roomDepth: 28,
      wallHeight: 8.4,
      doorSide: 'right', // Cửa ở vách Đông nhìn ra sảnh
      doorWidth: 5.4,
      floorY: 9.8
    });

    // Phòng 03: Sơn Tinh - Thủy Tinh (Tầng 1, Cửa hướng Đông, Z=-19.0)
    this.registerRoomWallsWithDoorway({
      roomCenter: new THREE.Vector3(-48.0, 0.0, -19.0),
      roomWidth: 26,
      roomDepth: 28,
      wallHeight: 8.4,
      doorSide: 'right',
      doorWidth: 5.4,
      floorY: 0.0
    });

    // Phòng 04: An Dương Vương & Cổ Loa Thành (Tầng 1, Cửa chính hướng Nam / Z=-34.0)
    this.registerRoomWallsWithDoorway({
      roomCenter: new THREE.Vector3(0.0, 0.0, -48.0),
      roomWidth: 32,
      roomDepth: 28,
      wallHeight: 8.4,
      doorSide: 'front', // Cửa ở vách Z+ (hướng sảnh)
      doorWidth: 5.4,
      floorY: 0.0
    });

    // Phòng 05: Vợ Nhặt (Tầng 3, Cửa hướng Tây / Đại sảnh, Z=-19.0)
    this.registerRoomWallsWithDoorway({
      roomCenter: new THREE.Vector3(48.0, 19.6, -19.0),
      roomWidth: 26,
      roomDepth: 28,
      wallHeight: 8.4,
      doorSide: 'left', // Cửa ở vách Tây nhìn ra sảnh
      doorWidth: 5.4,
      floorY: 19.6
    });

    // 4. ĐÀI TRỐNG ĐỒNG ĐÔNG SƠN TRUNG TÂM SẢNH (shrinkFactor: 0.92)
    const drumBox = new THREE.Box3(
      new THREE.Vector3(-1.45 * 0.92, 0.0, -1.45 * 0.92),
      new THREE.Vector3(1.45 * 0.92, 2.2, 1.45 * 0.92)
    );
    this.registerSolidObjectCollider(null, { customBox: drumBox, tag: 'Central_DongSon_Drum_Monument' });

    // 5. 16 CỘT CUNG ĐÌNH ĐẠI SẢNH (Hitbox nhỏ gọn, ôm sát thân cột)
    const pillarRadius = 0.48; // Bán kính ôm khít thân cột (đường kính 0.96m)
    const pillarHeight = 32.0;
    const pillarPositions = [
      { x: -16.5, z: -22.0 }, { x: -5.5, z: -22.0 }, { x: 5.5, z: -22.0 }, { x: 16.5, z: -22.0 },
      { x: -16.5, z: 22.0 },  { x: -5.5, z: 22.0 },  { x: 5.5, z: 22.0 },  { x: 16.5, z: 22.0 },
      { x: -22.0, z: -5.5 },  { x: -22.0, z: 5.5 },
      { x: 22.0, z: -5.5 },   { x: 22.0, z: 5.5 },
      { x: -34.0, z: -34.0 }, { x: 34.0, z: -34.0 }, { x: -34.0, z: 34.0 }, { x: 34.0, z: 34.0 }
    ];

    pillarPositions.forEach((pos, idx) => {
      const pBox = new THREE.Box3(
        new THREE.Vector3(pos.x - pillarRadius, 0.0, pos.z - pillarRadius),
        new THREE.Vector3(pos.x + pillarRadius, pillarHeight, pos.z + pillarRadius)
      );
      this.registerSolidObjectCollider(null, { customBox: pBox, tag: `Imperial_Pillar_${idx + 1}` });
    });

    // 6. LAN CAN INDOCHINE GIẾNG TRỜI TẦNG 2 & TẦNG 3 (Hitbox mảnh 12cm ôm sát phào chỉ lan can)
    // Lan can Tầng 2 (Y: 9.9m -> 11.0m, dày 12cm)
    // Cạnh Bắc: chừa ô thông thủy X in [-3.2, 3.2] rộng 6.4m cho vế cầu thang T2 -> T3
    addMacroWall(-22.06, 9.9, -22.06, -3.2, 11.0, -21.94, 'Balustrade_North_West_L2');
    addMacroWall(3.2, 9.9, -22.06, 22.06, 11.0, -21.94, 'Balustrade_North_East_L2');
    addMacroWall(-22.06, 9.9, 21.94, 22.06, 11.0, 22.06, 'Balustrade_South_L2');
    // Cánh Tây & Đông mở khoảng thông thủy Z in [13.0, 18.0] cho cầu thang T1 -> T2
    addMacroWall(-22.06, 9.9, -22.0, -21.94, 11.0, 13.0, 'Balustrade_West_North_L2');
    addMacroWall(-22.06, 9.9, 18.0, -21.94, 11.0, 22.0, 'Balustrade_West_South_L2');
    addMacroWall(21.94, 9.9, -22.0, 22.06, 11.0, 13.0, 'Balustrade_East_North_L2');
    addMacroWall(21.94, 9.9, 18.0, 22.06, 11.0, 22.0, 'Balustrade_East_South_L2');

    // Lan can Tầng 3 (Y: 19.9m -> 21.0m, dày 12cm)
    addMacroWall(-22.06, 19.9, -22.06, 22.06, 21.0, -21.94, 'Balustrade_North_L3');
    addMacroWall(-22.06, 19.9, 21.94, 22.06, 21.0, 22.06, 'Balustrade_South_L3');
    // Cánh Tây & Đông mở khoảng thông thủy Z in [-18.0, -13.0] cho cầu thang T2 -> T3
    addMacroWall(-22.06, 19.9, -22.0, -21.94, 21.0, -18.0, 'Balustrade_West_North_L3');
    addMacroWall(-22.06, 19.9, -13.0, -21.94, 21.0, 22.0, 'Balustrade_West_South_L3');
    addMacroWall(21.94, 19.9, -22.0, 22.06, 21.0, -18.0, 'Balustrade_East_North_L3');
    addMacroWall(21.94, 19.9, -13.0, 22.06, 21.0, 22.0, 'Balustrade_East_South_L3');

    // 7. LAN CAN TAY VỊN TOÀN BỘ CẦU THANG CHỮ Y & CHIẾU NGHỈ (Hitbox siêu mảnh, ôm khít 100% tay vịn mạ vàng)
    this.registerStaircaseBalustrades();

    console.log(
      `%c[Hitbox Architect] Hoàn tất tái thiết lập: Đã tạo ${this.solidBoxes.length} vật cản đi bộ chuẩn hóa O(1).`,
      'color: #22c55e; font-weight: bold;'
    );
  }

  /**
   * ĐĂNG KÝ HITBOX LAN CAN TAY VỊN CẦU THANG CHỮ Y (SKILL: hitbox-collision-architect)
   * Tự động uốn theo các đường cong CatmullRomCurve3 của 6 vế thang và 2 chiếu nghỉ tròn.
   * Giúp người chơi di chuyển an toàn, trượt tường mượt mà dọc theo tay vịn,
   * tuyệt đối không bị trượt ngã khỏi mép cầu thang vào giếng trời.
   */
  registerStaircaseBalustrades() {
    const registerFlightRail = (curvePoints, flightWidth, flightName, segmentsCount = 14) => {
      if (!curvePoints || curvePoints.length < 2) return;
      const curve = new THREE.CatmullRomCurve3(curvePoints);
      curve.curveType = 'centripetal';

      const halfW = flightWidth * 0.5;
      const railHeight = 1.0;  // Chiều cao tay vịn nhỏ gọn 1.0m
      const thickness = 0.10;  // Bề dày hitbox siêu mảnh 10cm (ôm khít ống tay vịn mạ vàng)

      [-1, 1].forEach((side) => {
        const sideName = side === -1 ? 'Left' : 'Right';
        for (let i = 0; i < segmentsCount; i++) {
          const u1 = i / segmentsCount;
          const u2 = (i + 1) / segmentsCount;

          const p1 = curve.getPoint(u1);
          const tan1 = curve.getTangent(u1);
          const norm1 = new THREE.Vector3(-tan1.z, 0, tan1.x).normalize();
          const pt1 = p1.clone().add(norm1.multiplyScalar(side * (halfW - 0.05)));

          const p2 = curve.getPoint(u2);
          const tan2 = curve.getTangent(u2);
          const norm2 = new THREE.Vector3(-tan2.z, 0, tan2.x).normalize();
          const pt2 = p2.clone().add(norm2.multiplyScalar(side * (halfW - 0.05)));

          const minX = Math.min(pt1.x, pt2.x) - thickness * 0.5;
          const maxX = Math.max(pt1.x, pt2.x) + thickness * 0.5;
          const minY = Math.min(pt1.y, pt2.y);
          const maxY = Math.max(pt1.y, pt2.y) + railHeight;
          const minZ = Math.min(pt1.z, pt2.z) - thickness * 0.5;
          const maxZ = Math.max(pt1.z, pt2.z) + thickness * 0.5;

          const box = new THREE.Box3(
            new THREE.Vector3(minX, minY, minZ),
            new THREE.Vector3(maxX, maxY, maxZ)
          );
          this.registerSolidObjectCollider(null, {
            customBox: box,
            tag: `StairRail_${flightName}_${sideName}_s${i + 1}`
          });
        }
      });
    };

    // 1. CẦU THANG TẦNG 1 -> TẦNG 2:
    // 1.1. Vế trung tâm T1 (5.8m rộng, Z: 24.0 -> 8.0)
    registerFlightRail([
      new THREE.Vector3(0, 0.0, 24.0),
      new THREE.Vector3(0, 1.6, 18.5),
      new THREE.Vector3(0, 3.4, 13.0),
      new THREE.Vector3(0, 5.0, 8.0)
    ], 5.8, 'T1_Central', 8);

    // 1.2. Vế Tây T1 -> T2 (4.0m rộng, 14 phân đoạn nhỏ ôm trọn đường cong mềm mại)
    registerFlightRail([
      new THREE.Vector3(-1.8, 5.0, 6.5),
      new THREE.Vector3(-7.5, 6.4, 7.8),
      new THREE.Vector3(-14.5, 8.2, 11.0),
      new THREE.Vector3(-22.0, 10.0, 15.5)
    ], 4.0, 'T1T2_Wing_West', 14);

    // 1.3. Vế Đông T1 -> T2 (4.0m rộng, 14 phân đoạn nhỏ ôm trọn đường cong mềm mại)
    registerFlightRail([
      new THREE.Vector3(1.8, 5.0, 6.5),
      new THREE.Vector3(7.5, 6.4, 7.8),
      new THREE.Vector3(14.5, 8.2, 11.0),
      new THREE.Vector3(22.0, 10.0, 15.5)
    ], 4.0, 'T1T2_Wing_East', 14);

    // 1.4. Mép chiếu nghỉ T1 (Bán kính R=4.95m tại Z=7.5m, Y=5.0m, dải mảnh 10cm chắn cung tròn hướng giếng trời)
    const landing1Center = new THREE.Vector3(0, 5.0, 7.5);
    const landing1R = 4.95;
    const l1Segments = 10;
    const l1StartAngle = -Math.PI * 0.35;
    const l1EndAngle = Math.PI * 0.35;
    for (let i = 0; i < l1Segments; i++) {
      const a1 = l1StartAngle + (i / l1Segments) * (l1EndAngle - l1StartAngle);
      const a2 = l1StartAngle + ((i + 1) / l1Segments) * (l1EndAngle - l1StartAngle);
      const x1 = landing1Center.x + Math.sin(a1) * landing1R;
      const z1 = landing1Center.z - Math.cos(a1) * landing1R;
      const x2 = landing1Center.x + Math.sin(a2) * landing1R;
      const z2 = landing1Center.z - Math.cos(a2) * landing1R;
      const box = new THREE.Box3(
        new THREE.Vector3(Math.min(x1, x2) - 0.05, 5.0, Math.min(z1, z2) - 0.05),
        new THREE.Vector3(Math.max(x1, x2) + 0.05, 6.0, Math.max(z1, z2) + 0.05)
      );
      this.registerSolidObjectCollider(null, { customBox: box, tag: `Landing_L1_FrontRail_s${i + 1}` });
    }

    // 2. CẦU THANG TẦNG 2 -> TẦNG 3:
    // 2.1. Vế trung tâm T2 (5.4m rộng, Z: -24.0 -> -8.0)
    registerFlightRail([
      new THREE.Vector3(0, 10.0, -24.0),
      new THREE.Vector3(0, 11.6, -18.5),
      new THREE.Vector3(0, 13.4, -13.0),
      new THREE.Vector3(0, 15.0, -8.0)
    ], 5.4, 'T2_Central', 8);

    // 2.2. Vế Tây T2 -> T3 (4.0m rộng, 14 phân đoạn nhỏ ôm trọn đường cong mềm mại)
    registerFlightRail([
      new THREE.Vector3(-1.8, 15.0, -6.5),
      new THREE.Vector3(-7.5, 16.4, -7.8),
      new THREE.Vector3(-14.5, 18.2, -11.0),
      new THREE.Vector3(-22.0, 20.0, -15.5)
    ], 4.0, 'T2T3_Wing_West', 14);

    // 2.3. Vế Đông T2 -> T3 (4.0m rộng, 14 phân đoạn nhỏ ôm trọn đường cong mềm mại)
    registerFlightRail([
      new THREE.Vector3(1.8, 15.0, -6.5),
      new THREE.Vector3(7.5, 16.4, -7.8),
      new THREE.Vector3(14.5, 18.2, -11.0),
      new THREE.Vector3(22.0, 20.0, -15.5)
    ], 4.0, 'T2T3_Wing_East', 14);

    // 2.4. Mép chiếu nghỉ T2 (Bán kính R=4.75m tại Z=-7.5m, Y=15.0m, dải mảnh 10cm chắn cung tròn hướng giếng trời)
    const landing2Center = new THREE.Vector3(0, 15.0, -7.5);
    const landing2R = 4.75;
    const l2Segments = 10;
    const l2StartAngle = -Math.PI * 0.35;
    const l2EndAngle = Math.PI * 0.35;
    for (let i = 0; i < l2Segments; i++) {
      const a1 = l2StartAngle + (i / l2Segments) * (l2EndAngle - l2StartAngle);
      const a2 = l2StartAngle + ((i + 1) / l2Segments) * (l2EndAngle - l2StartAngle);
      const x1 = landing2Center.x + Math.sin(a1) * landing2R;
      const z1 = landing2Center.z + Math.cos(a1) * landing2R;
      const x2 = landing2Center.x + Math.sin(a2) * landing2R;
      const z2 = landing2Center.z + Math.cos(a2) * landing2R;
      const box = new THREE.Box3(
        new THREE.Vector3(Math.min(x1, x2) - 0.05, 15.0, Math.min(z1, z2) - 0.05),
        new THREE.Vector3(Math.max(x1, x2) + 0.05, 16.0, Math.max(z1, z2) + 0.05)
      );
      this.registerSolidObjectCollider(null, { customBox: box, tag: `Landing_L2_FrontRail_s${i + 1}` });
    }
  }

  /**
   * 1. BỌC PROXY HITBOX CHO SÁCH DỊCH CHUYỂN & HIỆN VẬT .GLB
   * - Tự động gọi model.updateMatrixWorld(true)
   * - Đo Box3 ôm khít thực tế của mô hình sau khi scale/xoay
   * - Tạo một khối hộp vô hình (opacity: 0, transparent: true) ôm khít với padding = 0.12
   * - Giúp người chơi click ở bất kỳ góc nào cũng trúng 100%, không bị bắn nhầm qua khe hở mesh
   */
  createTightClickHitbox(targetObject, {
    loreKey = null,
    isBookPortal = false,
    portalTargetRealm = null,
    portalMetadata = null,
    targetSceneCoordinates = null,
    onActivate = null,
    padding = 0.05,        // Nới nhẹ 5cm quanh vật thể (nhỏ gọn, ôm sát mô hình)
    minSize = 0.30         // Kích thước tối thiểu nhỏ gọn 30cm
  } = {}) {
    if (!targetObject) return null;

    // BẮT BUỘC: Cập nhật ma trận thế giới trước khi đo Box3 để không bị lệch tâm/tỷ lệ
    targetObject.updateMatrixWorld(true);
    let worldBox = new THREE.Box3().setFromObject(targetObject);

    // Xử lý trường hợp đối tượng rỗng hoặc vị trí cục bộ chưa sẵn sàng
    if (worldBox.isEmpty()) {
      const fallbackPos = new THREE.Vector3();
      targetObject.getWorldPosition(fallbackPos);
      worldBox = new THREE.Box3(
        new THREE.Vector3(fallbackPos.x - minSize * 0.5, fallbackPos.y, fallbackPos.z - minSize * 0.5),
        new THREE.Vector3(fallbackPos.x + minSize * 0.5, fallbackPos.y + minSize, fallbackPos.z + minSize * 0.5)
      );
    }

    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    worldBox.getSize(size);
    worldBox.getCenter(center);

    const boxW = Math.max(size.x + padding * 2, minSize);
    const boxH = Math.max(size.y + padding * 2, minSize);
    const boxD = Math.max(size.z + padding * 2, minSize);

    // Tạo hộp Proxy vô hình nhưng Raycaster luôn bắt trúng 100% (12 tam giác thay vì 50.000 tam giác)
    const proxyGeo = new THREE.BoxGeometry(boxW, boxH, boxD);
    const proxyMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.0,       // Vô hình với mắt thường nhưng Raycaster vẫn nhận diện
      depthWrite: false,
      wireframe: false
    });

    const proxyMesh = new THREE.Mesh(proxyGeo, proxyMat);
    proxyMesh.name = `ClickHitbox_${loreKey || portalTargetRealm || targetObject.name || 'Artifact'}`;
    proxyMesh.position.copy(center);

    // Gắn toàn bộ metadata tương tác lên hộp Hitbox chuẩn này
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
      linkedVisualObject: targetObject
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

    // Đăng ký tự động với Lore Guide nếu có loreKey
    if (mergedUserData.loreKey && typeof window !== 'undefined' && window.__loreGuide?.registerArtifact) {
      window.__loreGuide.registerArtifact(proxyMesh, mergedUserData.loreKey);
    }

    // Đăng ký tự động với PortalInteraction nếu là sách dịch chuyển
    if (mergedUserData.isBookPortal && typeof window !== 'undefined' && window.registerInteractiveBook) {
      window.registerInteractiveBook(proxyMesh, mergedUserData.targetSceneCoordinates, mergedUserData.portalMetadata || {
        id: mergedUserData.loreKey || 'interactive_book',
        targetRealm: mergedUserData.portalTargetRealm
      });
    }

    // Thêm khung dây màu VÀNG KIM vào nhóm Debug (bấm phím H sẽ thấy)
    const debugBox = new THREE.Box3().setFromCenterAndSize(center, new THREE.Vector3(boxW, boxH, boxD));
    const helper = new THREE.Box3Helper(debugBox, 0xfde047);
    helper.name = `Helper_${proxyMesh.name}`;
    this.debugHelpers.add(helper);

    return proxyMesh;
  }

  /**
   * 2. ĐĂNG KÝ HITBOX VẬT CẢN CỨNG (BỆ ĐÁ HOA SEN, ĐÀI TRỐNG ĐỒNG, HÀNG CỘT CUNG ĐÌNH, TƯỜNG)
   * shrinkFactor: 0.92 thu nhẹ 8% quanh tâm để người chơi tiến sát ngắm hiện vật tự nhiên
   */
  registerSolidObjectCollider(object3D, {
    shrinkFactor = 0.92,   // Thu nhẹ 8% để người chơi tiến sát bệ ngắm hiện vật tự nhiên
    customBox = null,
    tag = 'Obstacle'
  } = {}) {
    let box3 = null;

    if (customBox) {
      box3 = customBox.clone();
    } else if (object3D) {
      object3D.updateMatrixWorld(true);
      box3 = new THREE.Box3().setFromObject(object3D);
      if (box3.isEmpty()) return null;

      // Co giãn nhẹ theo shrinkFactor quanh tâm để tránh kẹt vai nhân vật
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      box3.getCenter(center);
      box3.getSize(size);
      size.x = Math.max(0.2, size.x * shrinkFactor);
      size.z = Math.max(0.2, size.z * shrinkFactor);
      box3.setFromCenterAndSize(center, size);
    }

    if (!box3) return null;

    this.solidBoxes.push({ box: box3, tag, sourceObject: object3D });

    // Thêm khung dây màu XANH LÁ vào nhóm Debug (bấm phím H sẽ thấy)
    const helper = new THREE.Box3Helper(box3, 0x22c55e);
    helper.name = `SolidHelper_${tag}`;
    this.debugHelpers.add(helper);

    return box3;
  }

  /**
   * CHUẨN HÓA HITBOX TƯỜNG PHÒNG CÓ CHỪA Ô CỬA RA VÀO (DOORWAY WIDTH = 5.4M)
   * Tuyệt đối không dùng 1 Box3 bọc kín cả mặt tiền làm chặn lối vào phòng!
   * Chia bức tường có cửa thành 2 nửa Trái và Phải chừa trống đúng 5.4m ở giữa.
   *
   * @param {THREE.Vector3} roomCenter Tâm phòng trưng bày
   * @param {number} roomWidth Chiều rộng phòng (trục X nếu door ở front/back)
   * @param {number} roomDepth Chiều sâu phòng (trục Z nếu door ở front/back)
   * @param {number} wallHeight Chiều cao tường (mặc định 8.4m)
   * @param {number} wallThickness Độ dày tường (mặc định 0.55m)
   * @param {string} doorSide Hướng cửa: 'front' (Z+), 'back' (Z-), 'left' (X-), 'right' (X+)
   * @param {number} doorWidth Chiều rộng ô cửa thông thoáng (mặc định 5.4m)
   * @param {number} floorY Cao độ sàn phòng (mặc định 0m)
   */
  registerRoomWallsWithDoorway({
    roomCenter = new THREE.Vector3(0, 0, 0),
    roomWidth = 26,
    roomDepth = 28,
    wallHeight = 8.4,
    wallThickness = 0.25,
    doorSide = 'front',    // 'front' (Z+), 'back' (Z-), 'left' (X-), 'right' (X+)
    doorWidth = 5.4,
    floorY = 0
  } = {}) {
    const hw = roomWidth * 0.5;
    const hd = roomDepth * 0.5;
    const cx = roomCenter.x;
    const cy = floorY || roomCenter.y || 0;
    const cz = roomCenter.z;
    const halfDoor = doorWidth * 0.5;

    const addWallSegment = (minX, minZ, maxX, maxZ, label) => {
      const box = new THREE.Box3(
        new THREE.Vector3(minX, cy, minZ),
        new THREE.Vector3(maxX, cy + wallHeight, maxZ)
      );
      this.registerSolidObjectCollider(null, { customBox: box, tag: label });
    };

    if (doorSide === 'front') {
      // Cửa ở tường Nam (Z+)
      // Nửa Trái (X âm hơn cửa)
      addWallSegment(cx - hw, cz + hd - wallThickness, cx - halfDoor, cz + hd + wallThickness, 'Wall_Front_Left');
      // Nửa Phải (X dương hơn cửa)
      addWallSegment(cx + halfDoor, cz + hd - wallThickness, cx + hw, cz + hd + wallThickness, 'Wall_Front_Right');
      // Tường Bắc (Z-)
      addWallSegment(cx - hw, cz - hd - wallThickness, cx + hw, cz - hd + wallThickness, 'Wall_Back');
      // Tường Tây (X-) & Tường Đông (X+)
      addWallSegment(cx - hw - wallThickness, cz - hd, cx - hw + wallThickness, cz + hd, 'Wall_Left');
      addWallSegment(cx + hw - wallThickness, cz - hd, cx + hw + wallThickness, cz + hd, 'Wall_Right');

    } else if (doorSide === 'back') {
      // Cửa ở tường Bắc (Z-)
      addWallSegment(cx - hw, cz - hd - wallThickness, cx - halfDoor, cz - hd + wallThickness, 'Wall_Back_Left');
      addWallSegment(cx + halfDoor, cz - hd - wallThickness, cx + hw, cz - hd + wallThickness, 'Wall_Back_Right');
      // Tường Nam (Z+)
      addWallSegment(cx - hw, cz + hd - wallThickness, cx + hw, cz + hd + wallThickness, 'Wall_Front');
      // Tường Tây & Đông
      addWallSegment(cx - hw - wallThickness, cz - hd, cx - hw + wallThickness, cz + hd, 'Wall_Left');
      addWallSegment(cx + hw - wallThickness, cz - hd, cx + hw + wallThickness, cz + hd, 'Wall_Right');

    } else if (doorSide === 'right') {
      // Cửa ở tường Đông (X+) - Hướng nhìn từ phòng ra đại sảnh (Phòng 01, Phòng 02, Phòng 03)
      // Nửa Bắc (Z âm hơn cửa)
      addWallSegment(cx + hw - wallThickness, cz - hd, cx + hw + wallThickness, cz - halfDoor, 'Wall_Right_North');
      // Nửa Nam (Z dương hơn cửa)
      addWallSegment(cx + hw - wallThickness, cz + halfDoor, cx + hw + wallThickness, cz + hd, 'Wall_Right_South');
      // Tường Tây (X-)
      addWallSegment(cx - hw - wallThickness, cz - hd, cx - hw + wallThickness, cz + hd, 'Wall_Left');
      // Tường Bắc (Z-) & Tường Nam (Z+)
      addWallSegment(cx - hw, cz - hd - wallThickness, cx + hw, cz - hd + wallThickness, 'Wall_Back');
      addWallSegment(cx - hw, cz + hd - wallThickness, cx + hw, cz + hd + wallThickness, 'Wall_Front');

    } else if (doorSide === 'left') {
      // Cửa ở tường Tây (X-) - Hướng nhìn từ phòng ra đại sảnh (Phòng 05 Vợ Nhặt)
      // Nửa Bắc
      addWallSegment(cx - hw - wallThickness, cz - hd, cx - hw + wallThickness, cz - halfDoor, 'Wall_Left_North');
      // Nửa Nam
      addWallSegment(cx - hw - wallThickness, cz + halfDoor, cx - hw + wallThickness, cz + hd, 'Wall_Left_South');
      // Tường Đông (X+)
      addWallSegment(cx + hw - wallThickness, cz - hd, cx + hw + wallThickness, cz + hd, 'Wall_Right');
      // Tường Bắc & Nam
      addWallSegment(cx - hw, cz - hd - wallThickness, cx + hw, cz - hd + wallThickness, 'Wall_Back');
      addWallSegment(cx - hw, cz + hd - wallThickness, cx + hw, cz + hd + wallThickness, 'Wall_Front');
    }
  }

  /**
   * 3. XỬ LÝ VA CHẠM TRƯỢT MƯỢT (SLIDING COLLISION RESOLUTION) CHO NGƯỜI CHƠI
   * Tách kiểm tra trục X và trục Z độc lập giúp nhân vật trượt êm mượt dọc mặt tường hoặc bệ đá mà không bị kẹt cứng!
   *
   * @param {THREE.Vector3} currentPos Vị trí chân hiện tại của người chơi
   * @param {THREE.Vector3} targetPos Vị trí mong muốn đi tới trong frame này
   * @param {number} playerRadius Bán kính va chạm thân người (mặc định 0.45m)
   * @param {number} playerHeight Chiều cao người chơi (mặc định 1.8m)
   * @returns {THREE.Vector3} Tọa độ an toàn sau khi trượt mượt
   */
  resolvePlayerMovement(currentPos, targetPos, playerRadius = 0.45, playerHeight = 1.8) {
    if (!this.solidBoxes || this.solidBoxes.length === 0) {
      return targetPos.clone();
    }

    // 1. Kiểm tra nếu bước đi thẳng không chạm bất kỳ vật cản nào -> đi thẳng thoải mái
    if (!this._checkPlayerIntersectsAny(targetPos, playerRadius, playerHeight)) {
      return targetPos.clone();
    }

    const resolved = currentPos.clone();
    resolved.y = targetPos.y;

    // 2. Thử nghiệm trượt theo trục X trước (giữ nguyên Z cũ)
    const testPosX = new THREE.Vector3(targetPos.x, currentPos.y, currentPos.z);
    let movedX = false;
    if (!this._checkPlayerIntersectsAny(testPosX, playerRadius, playerHeight)) {
      resolved.x = targetPos.x;
      movedX = true;
    }

    // 3. Thử nghiệm trượt theo trục Z tiếp theo (dựa trên X đã resolved)
    const testPosZ = new THREE.Vector3(resolved.x, currentPos.y, targetPos.z);
    let movedZ = false;
    if (!this._checkPlayerIntersectsAny(testPosZ, playerRadius, playerHeight)) {
      resolved.z = targetPos.z;
      movedZ = true;
    }

    // 4. Nếu di chuyển X bị chặn, thử nghiệm chỉ đi theo trục Z độc lập từ currentPos
    if (!movedX && !movedZ) {
      const testPosZOnly = new THREE.Vector3(currentPos.x, currentPos.y, targetPos.z);
      if (!this._checkPlayerIntersectsAny(testPosZOnly, playerRadius, playerHeight)) {
        resolved.z = targetPos.z;
        movedZ = true;
      }
    }

    return resolved;
  }

  _checkPlayerIntersectsAny(feetPos, radius, height) {
    const playerBox = new THREE.Box3(
      new THREE.Vector3(feetPos.x - radius, feetPos.y + 0.1, feetPos.z - radius),
      new THREE.Vector3(feetPos.x + radius, feetPos.y + height, feetPos.z + radius)
    );

    for (let i = 0; i < this.solidBoxes.length; i++) {
      if (playerBox.intersectsBox(this.solidBoxes[i].box)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 4. BẮN TIA RAYCASTER CHỈ QUÉT QUA CÁC HỘP PROXY HITBOX CHUẨN
   */
  raycastInteractiveHitboxes(raycaster, maxDistance = 24.0) {
    if (this.clickProxies.length === 0) return null;
    const hits = raycaster.intersectObjects(this.clickProxies, false);
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
    this.clickProxies.forEach((mesh) => {
      mesh.geometry?.dispose?.();
      mesh.material?.dispose?.();
      this.scene.remove(mesh);
    });
    this.clickProxies.length = 0;
    this.debugHelpers.clear();
  }
}
