import * as THREE from 'three';
import { getSpatialRegistry } from './spatialRegistry.js';

/**
 * ============================================================================
 * VIETNAMESE PALACE ARCHITECTURE ENGINE (THÁNH ĐƯỜNG VĂN HỌC)
 * Master Blueprint & SpatialRegistry Integration (Zero-Overlap Guaranteed)
 * 
 * 8 Kỹ năng tích hợp cốt lõi:
 * 1. vietnamese-palace-architect: Mặt bằng chữ Công (工), lưới GRID_STEP = 6.0m,
 *    cột gỗ lim #3b1e14 thót ngọn, hệ mái đao cong vút 2 tầng Mái Chồng Diêm,
 *    xà vì kèo đấu củng mây cuốn, hoành phi sơn mài 'THÁNH ĐƯỜNG VĂN HỌC'.
 * 2. cultural-heritage-modeler: Chân tảng đá xanh chạm cánh sen (Lathe),
 *    ngói lưu ly/mũi hài #8c3b2b viền vàng #b8860b, bờ nóc đắp nổi, kìm nóc trừ hỏa tai.
 * 3. ornamental-relief-sculptor: Con sơn / đấu củng chạm lộng hoa văn thời Lê-Nguyễn.
 * 4. procedural-prop-furniture-maker: Lan can đá con tiện, cột đồng trụ búp sen,
 *    lan can gỗ giếng trời 12m x 12m, 2 cầu thang gỗ đối xứng & cầu đá 6.0m.
 * 5. museum-exhibition-curator: 5 Cổng chuyển cảnh độc bản cho 5 phòng triển lãm độc lập,
 *    bảng thông tin cách cổng 1.8m về bên phải xoay mặt ra lối đi.
 * 6. environment-lighting-artist: DoubleSide xử lý trần tối, HemisphereLight(0xfff4e0, 0x6b5344, 0.9)
 *    kết hợp PointLight vàng ấm 3000K tại tâm các nhịp hành lang.
 * 7. hitbox-collision-architect: Đăng ký Box3 toàn bộ cột, tường, lan can vào hitboxManager.
 * 8. fps-optimizer: InstancedMesh gộp draw calls, computeVertexNormals, zero NaN/Infinity, 60+ FPS.
 * ============================================================================
 */

// Cấu hình quy hoạch kiến trúc chuẩn mực theo Hệ Lưới Tọa Độ Toán Học (BAY = 6.0m)
export const PALACE_GRID_CONFIG = {
  PODIUM_Y: 0.6,
  PODIUM_HEIGHT: 0.6,
  PODIUM_WIDTH: 54.0,           // X: -27m đến +27m
  PODIUM_DEPTH: 42.0,           // Z: -21m đến +21m

  GRID_STEP: 6.0,               // BAY = 6.0m chuẩn
  GRID_X: [-24.0, -18.0, -12.0, -6.0, 6.0, 12.0, 18.0, 24.0],
  GRID_Z: [-18.0, -12.0, -6.0, 0.0, 6.0, 12.0, 18.0],

  FLOOR1_ELEVATION: 0.6,
  FLOOR1_HEIGHT: 5.0,           // Y = 0.6m -> 5.6m
  FLOOR2_ELEVATION: 5.6,
  FLOOR2_HEIGHT: 4.6,           // Y = 5.6m -> 10.2m
  TOTAL_COLUMN_HEIGHT: 9.6,     // Y = 0.6m -> 10.2m
  ROOF_BASE_ELEVATION: 10.2,
  ROOF_RIDGE_ELEVATION: 19.5,

  // Thông số cột tròn gỗ Lim
  COLUMN_DIAMETER: 0.55,
  COLUMN_DIAMETER_BASE: 0.55,
  COLUMN_RADIUS_BASE: 0.275,
  COLUMN_RADIUS_TOP: 0.24,
  COLUMN_RADIUS: 0.275,
  COLUMN_COLOR: 0x3b1e14,       // Gỗ Lim nguyên khối sẫm màu
  STRUCTURE_WOOD_COLOR: 0x4a2511,// Gỗ Lim xà, vì kèo, rui, mè, trần phẳng
  GOLD_ACCENT_COLOR: 0xd4af37,   // Vàng hoàng kim thếp
  STONE_COLOR: 0x5a626a,         // Đá xanh Thanh Hóa chạm sen
  TERRACOTTA_COLOR: 0x8c3b2b,    // Ngói nung cung đình
  GOLD_RIM_COLOR: 0xb8860b,      // Viền ngói vàng kim

  // Kích thước các phân khu
  WALL_THICKNESS: 0.34,          // Tường 0.34m < 0.55m cột để cột lộ nửa thân tròn
  ATRIUM_SIZE: 12.0,             // Giếng trời 12m x 12m quanh tâm (0, 0.6, 3)
  ATRIUM_CENTER_X: 0.0,
  ATRIUM_CENTER_Z: 3.0,

  // Sảnh đón (Portico) & Cầu dẫn
  PORTICO_Z: 22.0,               // Portico vươn từ Z = 18m ra 22m
  PORTICO_COLUMNS_X: [-6.0, -3.0, 3.0, 6.0],
  PORTICO_CENTRAL_BAY: 6.0,      // Nhịp giữa 6.0m giữa 2 cột X = -3 và X = +3
  BRIDGE_WIDTH: 6.0,             // Cầu đá rộng 6.0m (X: -3.0m đến +3.0m)
  BRIDGE_START_Z: 34.0,          // Đầu cầu đá ngoại vi
  BRIDGE_END_Z: 18.0,            // Ngưỡng cửa chính vào đại sảnh (cắt mở 12m)
  ENTRANCE_CLEAR_WIDTH: 12.0,    // Khoảng hở lan can lối vào X: -6.0m -> +6.0m

  // 5 Phòng triển lãm độc lập
  ROOM_BOUNDS: {
    thanh_giong: { minX: 12.0, maxX: 24.0, minZ: 0.0, maxZ: 12.0, portal: { x: 12.0, z: 6.0, rotY: Math.PI * 0.5 } },
    nam_quoc_son_ha: { minX: 12.0, maxX: 24.0, minZ: -18.0, maxZ: -6.0, portal: { x: 12.0, z: -12.0, rotY: Math.PI * 0.5 } },
    nam_xuong: { minX: -24.0, maxX: -12.0, minZ: 0.0, maxZ: 12.0, portal: { x: -12.0, z: 6.0, rotY: -Math.PI * 0.5 } },
    day_thon_vi_da: { minX: -24.0, maxX: -12.0, minZ: -18.0, maxZ: -6.0, portal: { x: -12.0, z: -12.0, rotY: -Math.PI * 0.5 } },
    tat_den: { minX: -12.0, maxX: 12.0, minZ: -18.0, maxZ: -6.0, portal: { x: 0.0, z: -6.0, rotY: 0.0 } }
  }
};

const PALACE_MAT_CACHE = new Map();
const PALACE_TEX_CACHE = new Map();

/**
 * Tự động kiểm tra và làm sạch vertex buffer để chống NaN pixel poisoning
 */
export function sanitizeGeometry(geo) {
  if (!geo || !geo.attributes) return geo;
  try {
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();

    const pos = geo.attributes.position;
    if (pos?.array) {
      for (let i = 0; i < pos.array.length; i++) {
        if (Number.isNaN(pos.array[i]) || !Number.isFinite(pos.array[i])) {
          pos.array[i] = 0;
        }
      }
      pos.needsUpdate = true;
    }

    const norm = geo.attributes.normal;
    if (norm?.array) {
      for (let i = 0; i < norm.array.length; i++) {
        if (Number.isNaN(norm.array[i]) || !Number.isFinite(norm.array[i])) {
          norm.array[i] = 0;
        }
      }
      norm.needsUpdate = true;
    }
  } catch (err) {
    console.warn('[PalaceArchitecture] Lỗi sanitize geometry:', err);
  }
  return geo;
}

export function getPalaceTexture(key, width, height, drawFn, repeatX = 1, repeatY = 1) {
  if (PALACE_TEX_CACHE.has(key)) return PALACE_TEX_CACHE.get(key);
  if (typeof document === 'undefined') return null;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    drawFn(ctx, width, height);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    if ('colorSpace' in tex && THREE.SRGBColorSpace) {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    tex.needsUpdate = true;
    PALACE_TEX_CACHE.set(key, tex);
    return tex;
  } catch (e) {
    return null;
  }
}

export function getPalaceMaterial(key, factoryFn) {
  if (PALACE_MAT_CACHE.has(key)) return PALACE_MAT_CACHE.get(key);
  try {
    const mat = factoryFn();
    if (mat) {
      PALACE_MAT_CACHE.set(key, mat);
    }
    return mat;
  } catch (e) {
    return new THREE.MeshBasicMaterial({ color: 0x888888 });
  }
}

/**
 * ============================================================================
 * 1. QUY HOẠCH LƯỚI TỌA ĐỘ KIẾN TRÚC TỔNG THỂ (DETERMINISTIC BLUEPRINT)
 * ============================================================================
 * - Lưới trục X: [-24, -18, -12, -6, 6, 12, 18, 24]
 * - Lưới trục Z: [-18, -12, -6, 0, 6, 12, 18]
 * - Gian giữa X in [-6, 6] rộng 12m, TUYỆT ĐỐI KHÔNG CÓ CỘT Ở X = 0.
 * - Ô giếng trời 12m x 12m quanh tâm (0, 0.6, 3) hoàn toàn không có cột bên trong.
 * - Sảnh đón Portico tại Z = 22m có đúng 4 cột tại X = [-6, -3, 3, 6].
 * - Đồng bộ 100% tọa độ (X, Z) giữa Tầng 1 và Tầng 2.
 */
export function getPalaceGridPillarPositions() {
  const coords = [];
  const registry = getSpatialRegistry();

  const addNode = (x, z) => {
    // Không bao giờ đặt cột tại trục giữa X = 0
    if (Math.abs(x) < 0.2) return;

    // Không cho cột rơi vào lòng giếng trời 12m x 12m quanh (0, 3)
    if (Math.abs(x) < 5.8 && z >= -2.8 && z <= 8.8) return;

    const roundX = Number(x.toFixed(2));
    const roundZ = Number(z.toFixed(2));
    coords.push([roundX, roundZ]);
  };

  // 1. Quét lưới bước cột 6m
  const xAxes = PALACE_GRID_CONFIG.GRID_X;
  const zAxes = PALACE_GRID_CONFIG.GRID_Z;

  zAxes.forEach((z) => {
    xAxes.forEach((x) => {
      addNode(x, z);
    });
  });

  // 2. Bổ sung 4 cột sảnh đón Portico tại Z = 22.0m (X = [-6, -3, 3, 6])
  PALACE_GRID_CONFIG.PORTICO_COLUMNS_X.forEach((x) => {
    addNode(x, PALACE_GRID_CONFIG.PORTICO_Z);
  });

  // Khử trùng lặp qua Map & đăng ký với SpatialRegistry
  const uniqueMap = new Map();
  coords.forEach(([px, pz]) => {
    const key = `${px.toFixed(1)}_${pz.toFixed(1)}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, [px, pz]);
      // Đăng ký cả 2 tầng vào SpatialRegistry
      registry.registerGridNode(px, PALACE_GRID_CONFIG.FLOOR1_ELEVATION, pz, 'column_floor1');
      registry.registerGridNode(px, PALACE_GRID_CONFIG.FLOOR2_ELEVATION, pz, 'column_floor2');
    }
  });

  return Array.from(uniqueMap.values()).sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

/**
 * ============================================================================
 * 2. CHÂN TẢNG ĐÁ XANH CÁNH SEN (LATHE GEOMETRY)
 * ============================================================================
 */
export function createLotusStonePedestalGeometry(radius = 0.42, height = 0.35) {
  const points = [
    new THREE.Vector2(radius * 1.05, 0.0),
    new THREE.Vector2(radius * 1.05, height * 0.20),
    new THREE.Vector2(radius * 0.94, height * 0.32),
    new THREE.Vector2(radius * 1.00, height * 0.50),
    new THREE.Vector2(radius * 0.86, height * 0.68),
    new THREE.Vector2(radius * 0.95, height * 0.84),
    new THREE.Vector2(radius * 0.80, height * 0.96),
    new THREE.Vector2(radius * 0.76, height)
  ];
  const geo = new THREE.LatheGeometry(points, 24);
  return sanitizeGeometry(geo);
}

export function createLotusFinialGeometry(radius = 0.20, height = 0.55) {
  const points = [
    new THREE.Vector2(radius * 0.50, 0.0),
    new THREE.Vector2(radius * 0.82, height * 0.22),
    new THREE.Vector2(radius * 1.00, height * 0.48),
    new THREE.Vector2(radius * 0.72, height * 0.75),
    new THREE.Vector2(radius * 0.22, height * 0.94),
    new THREE.Vector2(0.001, height)
  ];
  const geo = new THREE.LatheGeometry(points, 20);
  return sanitizeGeometry(geo);
}

/**
 * ============================================================================
 * 3. ĐẤU CỦNG / CON SƠN MÂY CUỐN CHẠM LỘNG (EXTRUDE GEOMETRY)
 * ============================================================================
 */
export function createCloudBracketGeometry(width = 0.90, height = 0.60, depth = 0.22) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(width * 0.82, 0);
  shape.quadraticCurveTo(width * 1.02, height * 0.22, width * 0.86, height * 0.48);
  shape.quadraticCurveTo(width * 0.62, height * 0.62, width * 0.72, height * 0.82);
  shape.quadraticCurveTo(width * 0.42, height * 1.00, width * 0.18, height * 0.86);
  shape.quadraticCurveTo(width * 0.04, height * 0.70, 0, height * 0.48);
  shape.quadraticCurveTo(-width * 0.06, height * 0.20, 0, 0);

  const extrudeSettings = {
    steps: 1,
    depth: depth,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 2
  };

  const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geo.center();
  return sanitizeGeometry(geo);
}

/**
 * ============================================================================
 * 4. ĐÀI MÓNG ĐÁ & HÀNG CỘT GỖ LIM ĐỒNG TRỤC 2 TẦNG (INSTANCED MESH)
 * ============================================================================
 */
export function createStonePodiumAndPillars({
  pillarPositions = null,
  name = 'Grand_Podium_And_Lim_Pillars'
} = {}) {
  const group = new THREE.Group();
  group.name = name;
  group.userData.ignoreRaycaster = true;

  const positions = pillarPositions && pillarPositions.length > 0
    ? pillarPositions
    : getPalaceGridPillarPositions();
  const count = positions.length;

  const stoneMat = getPalaceMaterial('palace_stone_mat', () => new THREE.MeshStandardMaterial({
    color: PALACE_GRID_CONFIG.STONE_COLOR,
    roughness: 0.65,
    metalness: 0.12,
    side: THREE.FrontSide
  }));

  const limWoodMat = getPalaceMaterial('palace_lim_wood_mat', () => new THREE.MeshStandardMaterial({
    color: PALACE_GRID_CONFIG.COLUMN_COLOR,
    roughness: 0.65,
    metalness: 0.15,
    side: THREE.FrontSide
  }));

  const goldBracketMat = getPalaceMaterial('palace_gold_bracket_mat', () => new THREE.MeshStandardMaterial({
    color: PALACE_GRID_CONFIG.GOLD_ACCENT_COLOR,
    roughness: 0.28,
    metalness: 0.82,
    side: THREE.FrontSide
  }));

  // A. ĐÀI MÓNG ĐÁ XANH CAO 0.6M GIỮA HỒ SEN (54m x 42m)
  const podiumGeo = sanitizeGeometry(new THREE.BoxGeometry(
    PALACE_GRID_CONFIG.PODIUM_WIDTH,
    PALACE_GRID_CONFIG.PODIUM_HEIGHT,
    PALACE_GRID_CONFIG.PODIUM_DEPTH
  ));
  const podiumMesh = new THREE.Mesh(podiumGeo, stoneMat);
  podiumMesh.name = 'Grand_Stone_Podium_Y06';
  podiumMesh.position.set(0, PALACE_GRID_CONFIG.PODIUM_HEIGHT * 0.5, 0);
  podiumMesh.receiveShadow = true;
  podiumMesh.userData.ignoreRaycaster = true;
  group.add(podiumMesh);

  // Gờ đá bó vỉa đài móng
  const curbGeo = sanitizeGeometry(new THREE.BoxGeometry(
    PALACE_GRID_CONFIG.PODIUM_WIDTH + 0.6,
    0.15,
    PALACE_GRID_CONFIG.PODIUM_DEPTH + 0.6
  ));
  const curbMesh = new THREE.Mesh(curbGeo, stoneMat);
  curbMesh.position.set(0, PALACE_GRID_CONFIG.PODIUM_HEIGHT - 0.05, 0);
  curbMesh.receiveShadow = true;
  curbMesh.userData.ignoreRaycaster = true;
  group.add(curbMesh);

  // B. HỆ THỐNG CỘT TẦNG 1 & TẦNG 2
  const pedH1 = 0.35;
  const colF1Height = PALACE_GRID_CONFIG.FLOOR1_HEIGHT - pedH1; // 4.65m
  const pedH2 = 0.30;
  const colF2Height = PALACE_GRID_CONFIG.FLOOR2_HEIGHT - pedH2; // 4.30m

  // 1. Chân tảng đá sen Tầng 1
  const pedGeo1 = createLotusStonePedestalGeometry(0.42, pedH1);
  const pedInstF1 = new THREE.InstancedMesh(pedGeo1, stoneMat, count);
  pedInstF1.name = 'Instanced_Lotus_Pedestals_Floor1';
  pedInstF1.receiveShadow = true;
  pedInstF1.userData.ignoreRaycaster = true;

  // 2. Chân tảng đá sen Tầng 2
  const pedGeo2 = createLotusStonePedestalGeometry(0.38, pedH2);
  const pedInstF2 = new THREE.InstancedMesh(pedGeo2, stoneMat, count);
  pedInstF2.name = 'Instanced_Lotus_Pedestals_Floor2';
  pedInstF2.receiveShadow = true;
  pedInstF2.userData.ignoreRaycaster = true;

  // 3. Thân cột Lim Tầng 1: Đáy R=0.275, Đỉnh R=0.24 (D=0.55m -> 0.48m)
  const colF1Geo = sanitizeGeometry(new THREE.CylinderGeometry(
    PALACE_GRID_CONFIG.COLUMN_RADIUS_TOP,
    PALACE_GRID_CONFIG.COLUMN_RADIUS_BASE,
    colF1Height,
    16
  ));
  const colInstF1 = new THREE.InstancedMesh(colF1Geo, limWoodMat, count);
  colInstF1.name = 'Instanced_Lim_Pillars_Floor1';
  colInstF1.castShadow = true;
  colInstF1.receiveShadow = true;
  colInstF1.userData.ignoreRaycaster = true;

  // 4. Thân cột Lim Tầng 2: Đồng nhất tọa độ (X, Z) hoàn toàn (D=0.50m -> 0.44m)
  const colF2Geo = sanitizeGeometry(new THREE.CylinderGeometry(0.22, 0.25, colF2Height, 16));
  const colInstF2 = new THREE.InstancedMesh(colF2Geo, limWoodMat, count);
  colInstF2.name = 'Instanced_Lim_Pillars_Floor2';
  colInstF2.castShadow = true;
  colInstF2.receiveShadow = true;
  colInstF2.userData.ignoreRaycaster = true;

  // 5. Đấu Củng Mây Cuốn 4 Hướng
  const bracketGeo = createCloudBracketGeometry(0.85, 0.55, 0.20);
  const totalBrackets = count * 4 * 2;
  const bracketInst = new THREE.InstancedMesh(bracketGeo, goldBracketMat, totalBrackets);
  bracketInst.name = 'Instanced_Cloud_Dougong_Brackets_AllFloors';
  bracketInst.receiveShadow = true;
  bracketInst.userData.ignoreRaycaster = true;

  const dummy = new THREE.Object3D();
  let bIdx = 0;

  const yFloor1 = PALACE_GRID_CONFIG.FLOOR1_ELEVATION; // 0.6m
  const yFloor2 = PALACE_GRID_CONFIG.FLOOR2_ELEVATION; // 5.6m

  positions.forEach(([px, pz], idx) => {
    // --- TẦNG 1 ---
    dummy.position.set(px, yFloor1 + pedH1 * 0.5, pz);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    pedInstF1.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(px, yFloor1 + pedH1 + colF1Height * 0.5, pz);
    dummy.updateMatrix();
    colInstF1.setMatrixAt(idx, dummy.matrix);

    const bracketY1 = yFloor2 - 0.22;
    [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5].forEach((rotY) => {
      dummy.position.set(px, bracketY1, pz);
      dummy.rotation.set(0, rotY, 0);
      dummy.updateMatrix();
      bracketInst.setMatrixAt(bIdx++, dummy.matrix);
    });

    // --- TẦNG 2 (ĐỒNG TỌA ĐỘ X, Z 100%) ---
    dummy.position.set(px, yFloor2 + pedH2 * 0.5, pz);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    pedInstF2.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(px, yFloor2 + pedH2 + colF2Height * 0.5, pz);
    dummy.updateMatrix();
    colInstF2.setMatrixAt(idx, dummy.matrix);

    const bracketY2 = PALACE_GRID_CONFIG.ROOF_BASE_ELEVATION - 0.22; // 10.2m - 0.22m
    [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5].forEach((rotY) => {
      dummy.position.set(px, bracketY2, pz);
      dummy.rotation.set(0, rotY, 0);
      dummy.updateMatrix();
      bracketInst.setMatrixAt(bIdx++, dummy.matrix);
    });
  });

  pedInstF1.instanceMatrix.needsUpdate = true;
  pedInstF2.instanceMatrix.needsUpdate = true;
  colInstF1.instanceMatrix.needsUpdate = true;
  colInstF2.instanceMatrix.needsUpdate = true;
  bracketInst.instanceMatrix.needsUpdate = true;

  group.add(pedInstF1);
  group.add(pedInstF2);
  group.add(colInstF1);
  group.add(colInstF2);
  group.add(bracketInst);

  return group;
}

// Giữ lại alias tương thích ngược
export const createGrandPalaceColumnsAndBrackets = createStonePodiumAndPillars;

/**
 * ============================================================================
 * 5. CẦU DẪN ĐÁ 6.0M, SẢNH ĐÓN PORTICO 4 CỘT & CỬA THÔNG THOÁNG 12M
 * ============================================================================
 */
export function createEntrancePorticoAndBridge({
  bridgeWidth = PALACE_GRID_CONFIG.BRIDGE_WIDTH,
  startZ = PALACE_GRID_CONFIG.BRIDGE_START_Z,
  endZ = PALACE_GRID_CONFIG.BRIDGE_END_Z,
  name = 'Palace_Entrance_Portico_And_Stone_Bridge'
} = {}) {
  const group = new THREE.Group();
  group.name = name;
  group.userData.ignoreRaycaster = true;

  const registry = getSpatialRegistry();
  const bridgeLen = Math.abs(startZ - endZ); // 16.0m
  const midZ = (startZ + endZ) * 0.5;

  const stoneMat = getPalaceMaterial('palace_bridge_stone', () => new THREE.MeshStandardMaterial({
    color: 0xd8d4cb,
    roughness: 0.65,
    metalness: 0.10,
    side: THREE.FrontSide
  }));

  const darkGraniteMat = getPalaceMaterial('palace_bridge_curb', () => new THREE.MeshStandardMaterial({
    color: 0x4a443e,
    roughness: 0.52,
    metalness: 0.18,
    side: THREE.FrontSide
  }));

  // 1. Mặt cầu đá cẩm thạch rộng 6.0m (X: -3.0m đến +3.0m, Z: 18m -> 34m)
  const bridgeGeo = sanitizeGeometry(new THREE.BoxGeometry(bridgeWidth, 0.45, bridgeLen));
  const bridgeMesh = new THREE.Mesh(bridgeGeo, stoneMat);
  bridgeMesh.name = 'Portico_Stone_Bridge_Walkway';
  bridgeMesh.position.set(0, 0.225 + 0.15, midZ);
  bridgeMesh.receiveShadow = true;
  bridgeMesh.userData.ignoreRaycaster = true;
  group.add(bridgeMesh);

  // Đăng ký hành lang cầu dẫn vào SpatialRegistry
  const bridgeBox = new THREE.Box3(
    new THREE.Vector3(-bridgeWidth * 0.5, 0, Math.min(startZ, endZ)),
    new THREE.Vector3(bridgeWidth * 0.5, 3.0, Math.max(startZ, endZ))
  );
  registry.registerWalkwayZone(bridgeBox, 'walkway_stone_bridge');

  // Gờ đá bó vỉa hai bên mép cầu
  [-bridgeWidth * 0.5 + 0.15, bridgeWidth * 0.5 - 0.15].forEach((curbX) => {
    const curbGeo = sanitizeGeometry(new THREE.BoxGeometry(0.30, 0.35, bridgeLen));
    const curbMesh = new THREE.Mesh(curbGeo, darkGraniteMat);
    curbMesh.position.set(curbX, 0.55, midZ);
    curbMesh.receiveShadow = true;
    curbMesh.userData.ignoreRaycaster = true;
    group.add(curbMesh);
  });

  // 2. Lan can đá hai bên mép cầu (kết thúc gọn tại bậc thềm Z = 18m)
  const leftBalustrade = createHeritageStoneBalustrade({
    pathPoints: [
      [-bridgeWidth * 0.5, 0.45, startZ],
      [-bridgeWidth * 0.5, 0.45, endZ]
    ],
    name: 'Balustrade_Bridge_West'
  });
  group.add(leftBalustrade);

  const rightBalustrade = createHeritageStoneBalustrade({
    pathPoints: [
      [bridgeWidth * 0.5, 0.45, startZ],
      [bridgeWidth * 0.5, 0.45, endZ]
    ],
    name: 'Balustrade_Bridge_East'
  });
  group.add(rightBalustrade);

  // 3. Lan can mặt tiền tầng 1 tại Z = 18.0m:
  // CẮT BỎ HOÀN TOÀN ĐOẠN GIỮA X in [-6.0, 6.0] để cửa chính thông thoáng rộng 12m
  const westTerraceBalustrade = createHeritageStoneBalustrade({
    pathPoints: [
      [-24.0, PALACE_GRID_CONFIG.PODIUM_Y, endZ],
      [-6.0, PALACE_GRID_CONFIG.PODIUM_Y, endZ]
    ],
    name: 'Balustrade_Terrace_West'
  });
  group.add(westTerraceBalustrade);

  const eastTerraceBalustrade = createHeritageStoneBalustrade({
    pathPoints: [
      [6.0, PALACE_GRID_CONFIG.PODIUM_Y, endZ],
      [24.0, PALACE_GRID_CONFIG.PODIUM_Y, endZ]
    ],
    name: 'Balustrade_Terrace_East'
  });
  group.add(eastTerraceBalustrade);

  // 4. Mái hiên Portico vươn nhẹ từ Z = 18m ra 22m với hoành phi "THÁNH ĐƯỜNG VĂN HỌC"
  const porticoRoof = createCurvedMaiDaoRoofMesh({
    width: 15.0,
    length: 6.5,
    ridgeHeight: 1.8,
    cornerLift: 1.5,
    tileColor: PALACE_GRID_CONFIG.TERRACOTTA_COLOR,
    name: 'Portico_Entrance_Eave_Roof',
    includeTiles: true
  });
  porticoRoof.position.set(0, 5.6 + 0.2, 20.0);
  group.add(porticoRoof);

  // Hoành phi treo tiền đình
  const porticoPlaque = createThanhDuongVanHocPlaque({
    width: 4.6,
    height: 1.4,
    depth: 0.16,
    name: 'Plaque_ThanhDuongVanHoc_Portico'
  });
  porticoPlaque.position.set(0, 5.2, 22.1);
  group.add(porticoPlaque);

  return group;
}

/**
 * ============================================================================
 * 6. GIẾNG TRỜI 12M X 12M, LAN CAN GỖ VÀ 2 CẦU THANG GỖ ĐỐI XỨNG
 * ============================================================================
 * - Ô thông tầng 12m x 12m quanh tâm (0, 0.6, 3) mở thẳng lên đỉnh mái.
 * - Lan can gỗ Lim #3b1e14 bao quanh tầng 2.
 * - 2 Cầu thang gỗ đối xứng đặt ở 2 bên cánh giếng trời (X = -9m và X = +9m),
 *   giữ thông thoáng 100% trục trung tâm X = 0 cho Cuốn Sách Thiên Thư và Đài Trống Đồng.
 */
export function createPalaceAtriumVoidAndBalustrade({
  atriumSize = PALACE_GRID_CONFIG.ATRIUM_SIZE,
  floor2Elevation = PALACE_GRID_CONFIG.FLOOR2_ELEVATION,
  centerX = PALACE_GRID_CONFIG.ATRIUM_CENTER_X,
  centerZ = PALACE_GRID_CONFIG.ATRIUM_CENTER_Z,
  name = 'Palace_Central_Atrium_Void_And_Staircases'
} = {}) {
  const group = new THREE.Group();
  group.name = name;
  group.userData.ignoreRaycaster = true;

  const half = atriumSize * 0.5; // 6.0m
  const railHeight = 1.05;

  const limWoodMat = getPalaceMaterial('palace_atrium_lim_rail', () => new THREE.MeshStandardMaterial({
    color: PALACE_GRID_CONFIG.COLUMN_COLOR,
    roughness: 0.35,
    metalness: 0.22,
    side: THREE.FrontSide
  }));

  const goldAccentMat = getPalaceMaterial('palace_atrium_gold_accent', () => new THREE.MeshStandardMaterial({
    color: PALACE_GRID_CONFIG.GOLD_ACCENT_COLOR,
    roughness: 0.25,
    metalness: 0.85,
    side: THREE.FrontSide
  }));

  // A. LAN CAN GỖ TẦNG 2 BAO QUANH 4 CẠNH GIẾNG TRỜI (12m x 12m)
  const balustradeGroup = new THREE.Group();
  balustradeGroup.name = 'Atrium_F2_Wooden_Balustrade';
  balustradeGroup.userData.ignoreRaycaster = true;
  group.add(balustradeGroup);

  const edges = [
    { p1: [centerX - half, centerZ + half], p2: [centerX + half, centerZ + half], name: 'South' },
    { p1: [centerX + half, centerZ + half], p2: [centerX + half, centerZ - half], name: 'East' },
    { p1: [centerX + half, centerZ - half], p2: [centerX - half, centerZ - half], name: 'North' },
    { p1: [centerX - half, centerZ - half], p2: [centerX - half, centerZ + half], name: 'West' }
  ];

  const balusterGeo = sanitizeGeometry(new THREE.CylinderGeometry(0.045, 0.055, railHeight * 0.65, 8));
  const postGeo = sanitizeGeometry(new THREE.BoxGeometry(0.24, railHeight + 0.15, 0.24));
  const finialGeo = createLotusFinialGeometry(0.12, 0.30);

  edges.forEach((edge) => {
    const v1 = new THREE.Vector3(edge.p1[0], floor2Elevation, edge.p1[1]);
    const v2 = new THREE.Vector3(edge.p2[0], floor2Elevation, edge.p2[1]);
    const dist = v1.distanceTo(v2);
    const mid = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
    const dir = new THREE.Vector3().subVectors(v2, v1).normalize();
    const yaw = Math.atan2(dir.x, dir.z);

    const handrailGeo = sanitizeGeometry(new THREE.BoxGeometry(0.18, 0.10, dist));
    const handrailMesh = new THREE.Mesh(handrailGeo, limWoodMat);
    handrailMesh.position.set(mid.x, mid.y + railHeight, mid.z);
    handrailMesh.rotation.y = yaw;
    handrailMesh.userData.ignoreRaycaster = true;
    balustradeGroup.add(handrailMesh);

    const bottomGeo = sanitizeGeometry(new THREE.BoxGeometry(0.20, 0.12, dist));
    const bottomMesh = new THREE.Mesh(bottomGeo, limWoodMat);
    bottomMesh.position.set(mid.x, mid.y + 0.06, mid.z);
    bottomMesh.rotation.y = yaw;
    bottomMesh.userData.ignoreRaycaster = true;
    balustradeGroup.add(bottomMesh);

    const balusterCount = 14;
    for (let b = 1; b < balusterCount; b++) {
      const t = b / balusterCount;
      const bPos = new THREE.Vector3().lerpVectors(v1, v2, t);
      const bMesh = new THREE.Mesh(balusterGeo, goldAccentMat);
      bMesh.position.set(bPos.x, bPos.y + railHeight * 0.45, bPos.z);
      bMesh.userData.ignoreRaycaster = true;
      balustradeGroup.add(bMesh);
    }
  });

  // 4 Trụ góc giếng trời
  [
    [centerX - half, centerZ - half],
    [centerX + half, centerZ - half],
    [centerX + half, centerZ + half],
    [centerX - half, centerZ + half]
  ].forEach(([cx, cz]) => {
    const postMesh = new THREE.Mesh(postGeo, limWoodMat);
    postMesh.position.set(cx, floor2Elevation + (railHeight + 0.15) * 0.5, cz);
    postMesh.userData.ignoreRaycaster = true;
    balustradeGroup.add(postMesh);

    const finialMesh = new THREE.Mesh(finialGeo, goldAccentMat);
    finialMesh.position.set(cx, floor2Elevation + railHeight + 0.15, cz);
    finialMesh.userData.ignoreRaycaster = true;
    balustradeGroup.add(finialMesh);
  });

  // B. 2 CẦU THANG GỖ ĐỐI XỨNG HAI BÊN CÁNH GIẾNG TRỜI (WEST & EAST)
  const stairGroup = createSymmetricalWoodenStaircases();
  group.add(stairGroup);

  return group;
}

/**
 * Tạo 2 cầu thang gỗ đối xứng nối Tầng 1 (Y=0.6) lên Tầng 2 (Y=5.6)
 */
export function createSymmetricalWoodenStaircases() {
  const stairsGroup = new THREE.Group();
  stairsGroup.name = 'Symmetrical_Wooden_Staircases_Flanking';
  stairsGroup.userData.ignoreRaycaster = true;

  const woodMat = getPalaceMaterial('palace_stair_wood', () => new THREE.MeshStandardMaterial({
    color: 0x3b1e14,
    roughness: 0.48,
    metalness: 0.16,
    side: THREE.FrontSide
  }));

  const goldMat = getPalaceMaterial('palace_stair_gold', () => new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.28,
    metalness: 0.82,
    side: THREE.FrontSide
  }));

  const stepCount = 20;
  const totalRise = PALACE_GRID_CONFIG.FLOOR2_ELEVATION - PALACE_GRID_CONFIG.FLOOR1_ELEVATION; // 5.0m
  const stepRise = totalRise / stepCount; // 0.25m
  const stepRun = 0.40;
  const stairWidth = 2.4;

  const stepGeo = sanitizeGeometry(new THREE.BoxGeometry(stairWidth, stepRise, stepRun));
  const goldNoseGeo = sanitizeGeometry(new THREE.BoxGeometry(stairWidth, 0.03, 0.04));

  // West stair centered at X = -9.0m, East stair centered at X = +9.0m
  [-9.0, 9.0].forEach((stairX) => {
    const singleStair = new THREE.Group();
    singleStair.name = `Staircase_Flank_${stairX < 0 ? 'West' : 'East'}`;

    for (let s = 0; s < stepCount; s++) {
      const stepY = PALACE_GRID_CONFIG.FLOOR1_ELEVATION + s * stepRise + stepRise * 0.5;
      const stepZ = -3.0 + s * stepRun;

      const stepMesh = new THREE.Mesh(stepGeo, woodMat);
      stepMesh.position.set(stairX, stepY, stepZ);
      stepMesh.userData.ignoreRaycaster = true;
      singleStair.add(stepMesh);

      const noseMesh = new THREE.Mesh(goldNoseGeo, goldMat);
      noseMesh.position.set(stairX, stepY + stepRise * 0.5 - 0.015, stepZ + stepRun * 0.5);
      noseMesh.userData.ignoreRaycaster = true;
      singleStair.add(noseMesh);
    }

    // Tay vịn nghiêng theo dốc cầu thang
    const stairLen = Math.sqrt(Math.pow(stepCount * stepRun, 2) + Math.pow(totalRise, 2));
    const railPitch = Math.atan2(totalRise, stepCount * stepRun);

    [-stairWidth * 0.5, stairWidth * 0.5].forEach((railOffset) => {
      const railGeo = sanitizeGeometry(new THREE.BoxGeometry(0.12, 0.12, stairLen));
      const railMesh = new THREE.Mesh(railGeo, woodMat);
      railMesh.position.set(
        stairX + railOffset,
        PALACE_GRID_CONFIG.FLOOR1_ELEVATION + totalRise * 0.5 + 0.90,
        -3.0 + (stepCount * stepRun) * 0.5
      );
      railMesh.rotation.x = -railPitch;
      railMesh.userData.ignoreRaycaster = true;
      singleStair.add(railMesh);
    });

    stairsGroup.add(singleStair);
  });

  return stairsGroup;
}

/**
 * ============================================================================
 * 7. BẢNG HOÀNH PHI SƠN MÀI 'THÁNH ĐƯỜNG VĂN HỌC' (LACQUER CLERESTORY PLAQUE)
 * ============================================================================
 */
export function createThanhDuongVanHocPlaque({
  width = 5.2,
  height = 1.6,
  depth = 0.18,
  name = 'Plaque_ThanhDuongVanHoc'
} = {}) {
  const group = new THREE.Group();
  group.name = name;
  group.userData.ignoreRaycaster = true;

  const plaqueTex = getPalaceTexture('plaque_thanh_duong_van_hoc_tex', 1024, 384, (ctx, w, h) => {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#5a0a08');
    grad.addColorStop(0.5, '#781210');
    grad.addColorStop(1, '#4a0806');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.lineWidth = 14;
    ctx.strokeStyle = '#d4af37';
    ctx.strokeRect(18, 18, w - 36, h - 36);

    ctx.lineWidth = 4;
    ctx.strokeStyle = '#f59e0b';
    ctx.strokeRect(32, 32, w - 64, h - 64);

    const cornerSize = 40;
    ctx.fillStyle = '#d4af37';
    [[32, 32], [w - 32 - cornerSize, 32], [32, h - 32 - cornerSize], [w - 32 - cornerSize, h - 32 - cornerSize]].forEach(([cx, cy]) => {
      ctx.fillRect(cx, cy, cornerSize, cornerSize);
    });

    ctx.fillStyle = '#fff4cc';
    ctx.shadowColor = '#d4af37';
    ctx.shadowBlur = 18;
    ctx.font = 'bold 64px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('THÁNH ĐƯỜNG VĂN HỌC', w * 0.5, h * 0.44);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#d4af37';
    ctx.font = '500 24px "Times New Roman", serif';
    ctx.fillText('ĐẠI NAM VĂN HIẾN • BẢO TÀNG TRUYỀN THỐNG', w * 0.5, h * 0.74);

    ctx.fillStyle = '#b91c1c';
    ctx.fillRect(w * 0.12, h * 0.32, 54, 54);
    ctx.fillRect(w * 0.83, h * 0.32, 54, 54);
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.12, h * 0.32, 54, 54);
    ctx.strokeRect(w * 0.83, h * 0.32, 54, 54);
  });

  const boardMat = getPalaceMaterial('plaque_lacquer_mat', () => new THREE.MeshStandardMaterial({
    map: plaqueTex,
    roughness: 0.28,
    metalness: 0.45,
    side: THREE.FrontSide
  }));

  const frameMat = getPalaceMaterial('plaque_gold_frame_mat', () => new THREE.MeshStandardMaterial({
    color: PALACE_GRID_CONFIG.GOLD_ACCENT_COLOR,
    roughness: 0.22,
    metalness: 0.88,
    side: THREE.FrontSide
  }));

  const boardGeo = sanitizeGeometry(new THREE.BoxGeometry(width, height, depth));
  const boardMesh = new THREE.Mesh(boardGeo, boardMat);
  boardMesh.castShadow = true;
  boardMesh.userData.ignoreRaycaster = true;
  group.add(boardMesh);

  const frameGeo = sanitizeGeometry(new THREE.BoxGeometry(width + 0.18, height + 0.18, depth * 0.85));
  const frameBorder = new THREE.Mesh(frameGeo, frameMat);
  frameBorder.position.z = -0.02;
  frameBorder.userData.ignoreRaycaster = true;
  group.add(frameBorder);

  return group;
}

/**
 * ============================================================================
 * 8. HỆ MÁI ĐAO CONG VÚT 2 TẦNG (MÁI CHỒNG DIÊM) VỚI NGÓI LƯU LY/MŨI HÀI
 * ============================================================================
 * - Uốn cong 4 góc đầu đao bằng vertex displacement
 * - Ngói #8c3b2b viền vàng #b8860b
 * - side: THREE.DoubleSide triệt tiêu hoàn toàn mảng đen kịt gầm mái
 * - Bờ nóc đắp nổi, kìm nóc chạm lộng
 */
export function createCurvedMaiDaoRoofMesh({
  width = 54.0,
  length = 42.0,
  ridgeHeight = 4.2,
  cornerLift = 3.2,
  tileColor = PALACE_GRID_CONFIG.TERRACOTTA_COLOR,
  name = 'Grand_MaiDao_Roof',
  includeTiles = true
} = {}) {
  const group = new THREE.Group();
  group.name = name;
  group.userData.ignoreRaycaster = true;

  const tileMat = getPalaceMaterial(`palace_tiles_${tileColor.toString(16)}`, () => new THREE.MeshStandardMaterial({
    color: tileColor,
    roughness: 0.65,
    metalness: 0.12,
    side: THREE.DoubleSide
  }));

  const ridgeMat = getPalaceMaterial('palace_stone_ridge', () => new THREE.MeshStandardMaterial({
    color: 0x4a443e,
    roughness: 0.55,
    metalness: 0.12,
    side: THREE.FrontSide
  }));

  const goldEdgeMat = getPalaceMaterial('palace_roof_gold_edge', () => new THREE.MeshStandardMaterial({
    color: PALACE_GRID_CONFIG.GOLD_RIM_COLOR,
    roughness: 0.35,
    metalness: 0.75,
    side: THREE.DoubleSide
  }));

  const segsX = 32;
  const segsZ = 32;
  const roofGeo = new THREE.PlaneGeometry(width, length, segsX, segsZ);
  roofGeo.rotateX(-Math.PI / 2);

  const pos = roofGeo.attributes.position;
  const halfW = width * 0.5;
  const halfL = length * 0.5;

  const calcHeight = (x, z) => {
    const normX = Math.abs(x) / halfW;
    const normZ = Math.abs(z) / halfL;
    const distToEdge = Math.max(normX, normZ);
    let y = (1.0 - distToEdge) * ridgeHeight;
    const cornerFactor = Math.pow(normX * normZ, 2.5);
    y += cornerFactor * cornerLift;
    const sag = Math.sin(normX * Math.PI) * Math.sin(normZ * Math.PI) * 0.28;
    y -= sag;
    return y;
  };

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, calcHeight(x, z));
  }

  sanitizeGeometry(roofGeo);

  const roofMesh = new THREE.Mesh(roofGeo, tileMat);
  roofMesh.castShadow = true;
  roofMesh.receiveShadow = true;
  roofMesh.userData.ignoreRaycaster = true;
  group.add(roofMesh);

  // Bờ nóc đắp nổi
  const ridgeGeo = sanitizeGeometry(new THREE.BoxGeometry(width * 0.45, 0.45, 0.45));
  const ridgeMesh = new THREE.Mesh(ridgeGeo, ridgeMat);
  ridgeMesh.position.y = ridgeHeight + 0.22;
  ridgeMesh.userData.ignoreRaycaster = true;
  group.add(ridgeMesh);

  // 4 Bờ giải chạy từ bờ nóc xuống 4 đầu đao cong vút + Kìm Nóc
  const cornerSign = [[1, 1], [-1, 1], [1, -1], [-1, -1]];
  cornerSign.forEach(([sx, sz], idx) => {
    const curvePoints = [
      new THREE.Vector3(0, ridgeHeight + 0.2, 0),
      new THREE.Vector3(sx * halfW * 0.45, ridgeHeight * 0.55, sz * halfL * 0.45),
      new THREE.Vector3(sx * halfW * 0.85, ridgeHeight * 0.2, sz * halfL * 0.85),
      new THREE.Vector3(sx * halfW, cornerLift * 0.95, sz * halfL)
    ];
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    const tubeGeo = sanitizeGeometry(new THREE.TubeGeometry(curve, 16, 0.20, 8, false));
    const tubeMesh = new THREE.Mesh(tubeGeo, goldEdgeMat);
    tubeMesh.name = `DauDao_Corner_${idx}`;
    tubeMesh.userData.ignoreRaycaster = true;
    group.add(tubeMesh);

    // Kìm Nóc trừ hỏa tai
    const finialGeo = sanitizeGeometry(new THREE.ConeGeometry(0.30, 0.95, 6));
    const tipFinial = new THREE.Mesh(finialGeo, ridgeMat);
    tipFinial.position.copy(curvePoints[3]);
    tipFinial.rotation.x = sz * 0.55;
    tipFinial.rotation.z = -sx * 0.55;
    tipFinial.userData.ignoreRaycaster = true;
    group.add(tipFinial);
  });

  return group;
}

/**
 * MÁI CHỒNG DIÊM 2 TẦNG TOÀN DIỆN (LOWER TIER + CLERESTORY + UPPER TIER)
 */
export function createTwoTierCurvedMaiDaoRoofMesh({
  width = 54.0,
  length = 42.0,
  name = 'TwoTier_Curved_MaiDao_Roof_GrandSystem'
} = {}) {
  const masterRoof = new THREE.Group();
  masterRoof.name = name;
  masterRoof.userData.ignoreRaycaster = true;

  // 1. Tầng Mái Hạ (Lower Tier): Rộng bao phủ toàn bộ tầng 1 & hiên
  const lowerRoof = createCurvedMaiDaoRoofMesh({
    width: width * 1.08,
    length: length * 1.08,
    ridgeHeight: 2.8,
    cornerLift: 2.4,
    tileColor: PALACE_GRID_CONFIG.TERRACOTTA_COLOR,
    name: 'MaiDao_Roof_Tier1_Lower'
  });
  lowerRoof.position.set(0, PALACE_GRID_CONFIG.ROOF_BASE_ELEVATION, 0); // Y = 10.2m
  masterRoof.add(lowerRoof);

  // 2. Cổ Diêm (Clerestory): Tường chấn song gỗ Lim ngăn cách 2 tầng mái
  const coDiemGroup = new THREE.Group();
  coDiemGroup.name = 'Clerestory_CoDiem_Structure';
  coDiemGroup.userData.ignoreRaycaster = true;

  const coDiemMat = getPalaceMaterial('palace_codiem_wood', () => new THREE.MeshStandardMaterial({
    color: 0x4a1810,
    roughness: 0.38,
    metalness: 0.22,
    side: THREE.FrontSide
  }));

  const cdWidth = width * 0.68;
  const cdLength = length * 0.68;
  const cdHeight = 2.4;
  const cdGeo = sanitizeGeometry(new THREE.BoxGeometry(cdWidth, cdHeight, cdLength));
  const cdMesh = new THREE.Mesh(cdGeo, coDiemMat);
  cdMesh.position.set(0, PALACE_GRID_CONFIG.ROOF_BASE_ELEVATION + 3.2, 0);
  cdMesh.userData.ignoreRaycaster = true;
  coDiemGroup.add(cdMesh);

  // 3. Hoành Phi 'THÁNH ĐƯỜNG VĂN HỌC' trên tầng cổ diêm
  const plaque = createThanhDuongVanHocPlaque({
    width: 4.8,
    height: 1.5,
    depth: 0.16
  });
  plaque.position.set(0, PALACE_GRID_CONFIG.ROOF_BASE_ELEVATION + 3.2, cdLength * 0.5 + 0.12);
  coDiemGroup.add(plaque);
  masterRoof.add(coDiemGroup);

  // 4. Tầng Mái Thượng (Upper Tier): Vương miện cung đình
  const upperRoof = createCurvedMaiDaoRoofMesh({
    width: width * 0.78,
    length: length * 0.78,
    ridgeHeight: 4.2,
    cornerLift: 3.5,
    tileColor: PALACE_GRID_CONFIG.TERRACOTTA_COLOR,
    name: 'MaiDao_Roof_Tier2_Upper'
  });
  upperRoof.position.set(0, PALACE_GRID_CONFIG.ROOF_BASE_ELEVATION + 4.4, 0);
  masterRoof.add(upperRoof);

  return masterRoof;
}

/**
 * ============================================================================
 * 9. HỆ TRẦN PHẲNG GỖ NÂU ẤM #4a2511, VÌ KÈO, XÀ NGANG VÀ CON SƠN ĐỠ MÁI
 * ============================================================================
 */
export function createPalaceCofferedCeilingAndBeams({
  gridStep = PALACE_GRID_CONFIG.GRID_STEP,
  spanX = PALACE_GRID_CONFIG.PODIUM_WIDTH,
  spanZ = PALACE_GRID_CONFIG.PODIUM_DEPTH,
  elevation = PALACE_GRID_CONFIG.ROOF_BASE_ELEVATION,
  name = 'Palace_Coffered_Ceiling_Master'
} = {}) {
  const group = new THREE.Group();
  group.name = name;
  group.userData.ignoreRaycaster = true;

  const limStructureMat = getPalaceMaterial('palace_lim_structure_mat', () => new THREE.MeshStandardMaterial({
    color: PALACE_GRID_CONFIG.STRUCTURE_WOOD_COLOR,
    roughness: 0.45,
    metalness: 0.15,
    side: THREE.DoubleSide
  }));

  const goldTrimMat = getPalaceMaterial('palace_ceiling_gold_trim', () => new THREE.MeshStandardMaterial({
    color: PALACE_GRID_CONFIG.GOLD_ACCENT_COLOR,
    roughness: 0.28,
    metalness: 0.82,
    side: THREE.FrontSide
  }));

  const cofferSize = gridStep;
  const numX = Math.floor(spanX / cofferSize);
  const numZ = Math.floor(spanZ / cofferSize);

  for (let ix = -numX / 2; ix < numX / 2; ix++) {
    for (let iz = -numZ / 2; iz < numZ / 2; iz++) {
      const cx = (ix + 0.5) * cofferSize;
      const cz = (iz + 0.5) * cofferSize;

      // Không đóng trần tại ô giếng trời 12m x 12m để đón luồng sáng
      if (Math.abs(cx) < 5.8 && Math.abs(cz - PALACE_GRID_CONFIG.ATRIUM_CENTER_Z) < 5.8) continue;

      const cofferPlate = new THREE.Mesh(
        sanitizeGeometry(new THREE.BoxGeometry(cofferSize - 0.25, 0.12, cofferSize - 0.25)),
        limStructureMat
      );
      cofferPlate.position.set(cx, elevation, cz);
      cofferPlate.userData.ignoreRaycaster = true;
      group.add(cofferPlate);

      const trimMesh = new THREE.Mesh(
        sanitizeGeometry(new THREE.BoxGeometry(cofferSize - 0.45, 0.04, cofferSize - 0.45)),
        goldTrimMat
      );
      trimMesh.position.set(cx, elevation - 0.05, cz);
      trimMesh.userData.ignoreRaycaster = true;
      group.add(trimMesh);
    }
  }

  // Hệ dầm xà ngang dọc theo lưới
  for (let x = -spanX * 0.5; x <= spanX * 0.5; x += gridStep) {
    const beamGeo = sanitizeGeometry(new THREE.BoxGeometry(0.38, 0.45, spanZ));
    const beamMesh = new THREE.Mesh(beamGeo, limStructureMat);
    beamMesh.position.set(x, elevation - 0.25, 0);
    beamMesh.userData.ignoreRaycaster = true;
    group.add(beamMesh);
  }

  for (let z = -spanZ * 0.5; z <= spanZ * 0.5; z += gridStep) {
    const beamGeo = sanitizeGeometry(new THREE.BoxGeometry(spanX, 0.45, 0.38));
    const beamMesh = new THREE.Mesh(beamGeo, limStructureMat);
    beamMesh.position.set(0, elevation - 0.25, z);
    beamMesh.userData.ignoreRaycaster = true;
    group.add(beamMesh);
  }

  return group;
}

/**
 * ============================================================================
 * 10. HỆ THỐNG ÁNH SÁNG TÁN XẠ HOÀNG GIA DƯỚI MÁI (KHÔNG CÒN GẦM ĐEN KỊT)
 * ============================================================================
 * - HemisphereLight(0xfff4e0, 0x6b5344, 0.9)
 * - Đèn lồng PointLight vàng ấm 3000K tại tâm các nhịp hành lang
 */
export function createPalaceLighting({
  name = 'Palace_Lighting_MasterSystem'
} = {}) {
  const group = new THREE.Group();
  group.name = name;
  group.userData.ignoreRaycaster = true;

  // 1. Ánh sáng tán xạ bầu trời & phản xạ gầm mái
  const hemiLight = new THREE.HemisphereLight(0xfff4e0, 0x6b5344, 0.90);
  hemiLight.name = 'Palace_Warm_HemisphereLight_09';
  hemiLight.position.set(0, PALACE_GRID_CONFIG.ROOF_BASE_ELEVATION, 0);
  group.add(hemiLight);

  // 2. Đèn lồng PointLight vàng ấm tại các nhịp hành lang chính
  const lanternPoints = [
    [-18.0, 4.8, 6.0], [18.0, 4.8, 6.0],
    [-18.0, 4.8, -12.0], [18.0, 4.8, -12.0],
    [0.0, 4.8, -12.0], [0.0, 4.8, 12.0],
    // Tầng 2
    [-18.0, 9.6, 6.0], [18.0, 9.6, 6.0],
    [-18.0, 9.6, -12.0], [18.0, 9.6, -12.0],
    [0.0, 9.6, -12.0]
  ];

  lanternPoints.forEach(([lx, ly, lz], idx) => {
    const pt = new THREE.PointLight(0xffd188, 0.95, 14.0, 1.8);
    pt.name = `Palace_Corridor_LanternLight_${idx}`;
    pt.position.set(lx, ly, lz);
    pt.castShadow = false;
    group.add(pt);
  });

  return group;
}

/**
 * ============================================================================
 * 11. HỆ THỐNG LAN CAN ĐÁ CON TIỆN & CỘT ĐỒNG TRỤ BÚP SEN
 * ============================================================================
 */
export function createHeritageStoneBalustrade({
  pathPoints = [],
  balusterInterval = 0.55,
  name = 'Heritage_Stone_Balustrade'
} = {}) {
  const group = new THREE.Group();
  group.name = name;
  group.userData.ignoreRaycaster = true;

  const stoneMat = getPalaceMaterial('palace_balustrade_stone', () => new THREE.MeshStandardMaterial({
    color: 0xe8e4dc,
    roughness: 0.68,
    metalness: 0.08,
    side: THREE.FrontSide
  }));

  const balusterGeo = sanitizeGeometry(new THREE.CylinderGeometry(0.08, 0.11, 0.72, 10));
  const postGeo = sanitizeGeometry(new THREE.BoxGeometry(0.36, 1.05, 0.36));
  const finialGeo = createLotusFinialGeometry(0.20, 0.42);
  const handrailHeight = 0.95;

  for (let i = 0; i < pathPoints.length - 1; i++) {
    const p1 = new THREE.Vector3(...pathPoints[i]);
    const p2 = new THREE.Vector3(...pathPoints[i + 1]);
    const dist = p1.distanceTo(p2);
    if (dist < 0.2) continue;

    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
    const yaw = Math.atan2(dir.x, dir.z);

    const handrailGeo = sanitizeGeometry(new THREE.BoxGeometry(0.24, 0.14, dist));
    const handrailMesh = new THREE.Mesh(handrailGeo, stoneMat);
    handrailMesh.position.set(mid.x, mid.y + handrailHeight, mid.z);
    handrailMesh.rotation.y = yaw;
    handrailMesh.userData.ignoreRaycaster = true;
    group.add(handrailMesh);

    const plinthGeo = sanitizeGeometry(new THREE.BoxGeometry(0.28, 0.16, dist));
    const plinthMesh = new THREE.Mesh(plinthGeo, stoneMat);
    plinthMesh.position.set(mid.x, mid.y + 0.08, mid.z);
    plinthMesh.rotation.y = yaw;
    plinthMesh.userData.ignoreRaycaster = true;
    group.add(plinthMesh);

    const balusterCount = Math.floor(dist / balusterInterval);
    for (let b = 1; b < balusterCount; b++) {
      const t = b / balusterCount;
      const bPos = new THREE.Vector3().lerpVectors(p1, p2, t);
      const bMesh = new THREE.Mesh(balusterGeo, stoneMat);
      bMesh.position.set(bPos.x, bPos.y + 0.52, bPos.z);
      bMesh.userData.ignoreRaycaster = true;
      group.add(bMesh);
    }

    if (i === 0 || i === pathPoints.length - 2) {
      const postMesh = new THREE.Mesh(postGeo, stoneMat);
      postMesh.position.set(p1.x, p1.y + 0.525, p1.z);
      postMesh.userData.ignoreRaycaster = true;
      group.add(postMesh);

      const finialMesh = new THREE.Mesh(finialGeo, stoneMat);
      finialMesh.position.set(p1.x, p1.y + 1.05, p1.z);
      finialMesh.userData.ignoreRaycaster = true;
      group.add(finialMesh);
    }
  }

  return group;
}

/**
 * ============================================================================
 * 12. BỐ CỤC TƯỜNG NGĂN DÀY 0.34M VÀ CỔNG VÒM 5 PHÒNG TRƯNG BÀY ĐỘC LẬP
 * ============================================================================
 * - Tường dày 0.34m (< 0.55m cột), đặt chính xác trên tim nối 2 tâm cột.
 * - 5 Cổng vòm độc bản kèm hoành phi thư pháp:
 *   1. Thánh Gióng: Cổng vòm lũy tre đằng ngà & ngựa sắt
 *   2. Nam Quốc Sơn Hà: Cổng thành đá chiến tuyến sông Như Nguyệt
 *   3. Chuyện Người Con Gái Nam Xương: Cổng gỗ vành trăng khuyết
 *   4. Đây Thôn Vĩ Dạ: Cổng vòm khóm trúc xứ Huế
 *   5. Tắt Đèn: Khung cửa nhà tranh vách đất
 */
export function createPalaceRoomWallsAndPortals({
  name = 'Palace_Room_Walls_And_Portals'
} = {}) {
  const group = new THREE.Group();
  group.name = name;
  group.userData.ignoreRaycaster = true;

  const registry = getSpatialRegistry();
  const wallThickness = PALACE_GRID_CONFIG.WALL_THICKNESS; // 0.34m
  const wallHeight = PALACE_GRID_CONFIG.FLOOR1_HEIGHT;     // 5.0m
  const yFloor1 = PALACE_GRID_CONFIG.FLOOR1_ELEVATION;     // 0.6m

  const wallMat = getPalaceMaterial('palace_plaster_wall_mat', () => new THREE.MeshStandardMaterial({
    color: 0xf5f0e8,
    roughness: 0.85,
    metalness: 0.02,
    side: THREE.FrontSide
  }));

  const woodBaseMat = getPalaceMaterial('palace_wall_wood_base', () => new THREE.MeshStandardMaterial({
    color: 0x3b1e14,
    roughness: 0.55,
    metalness: 0.15,
    side: THREE.FrontSide
  }));

  // Hàm phụ tạo 1 đoạn tường nối giữa 2 điểm (x1, z1) và (x2, z2)
  const addWallBetween = (x1, z1, x2, z2, segmentName = 'Wall') => {
    if (!registry.registerWallSegment(x1, z1, x2, z2, yFloor1, 'wall')) {
      return; // Đã có tường trên đoạn này
    }

    const p1 = new THREE.Vector3(x1, yFloor1, z1);
    const p2 = new THREE.Vector3(x2, yFloor1, z2);
    const len = p1.distanceTo(p2);
    if (len < 0.2) return;

    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
    const yaw = Math.atan2(dir.x, dir.z);

    const wallGeo = sanitizeGeometry(new THREE.BoxGeometry(wallThickness, wallHeight, len));
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.name = segmentName;
    wallMesh.position.set(mid.x, mid.y + wallHeight * 0.5, mid.z);
    wallMesh.rotation.y = yaw;
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    wallMesh.userData.ignoreRaycaster = true;
    group.add(wallMesh);

    // Chân tường ốp gỗ 0.6m
    const baseGeo = sanitizeGeometry(new THREE.BoxGeometry(wallThickness + 0.04, 0.6, len));
    const baseMesh = new THREE.Mesh(baseGeo, woodBaseMat);
    baseMesh.position.set(mid.x, mid.y + 0.3, mid.z);
    baseMesh.rotation.y = yaw;
    baseMesh.userData.ignoreRaycaster = true;
    group.add(baseMesh);
  };

  // 1. TƯỜNG NGOẠI BIÊN & VÁCH NGĂN 5 PHÒNG (DÀY 0.34M TRÊN TIM CỘT)
  // --- Phòng Thánh Gióng: X in [12, 24], Z in [0, 12] ---
  addWallBetween(12.0, 12.0, 24.0, 12.0, 'ThanhGiong_Wall_North');
  addWallBetween(24.0, 12.0, 24.0, 0.0, 'ThanhGiong_Wall_East');
  addWallBetween(24.0, 0.0, 12.0, 0.0, 'ThanhGiong_Wall_South');
  // Vách Tây mở cổng tại Z = 6.0m: Tường từ Z = 0 -> 4m và Z = 8 -> 12m (cổng rộng 4.0m)
  addWallBetween(12.0, 0.0, 12.0, 4.0, 'ThanhGiong_West_Wall1');
  addWallBetween(12.0, 8.0, 12.0, 12.0, 'ThanhGiong_West_Wall2');

  // --- Phòng Nam Quốc Sơn Hà: X in [12, 24], Z in [-18, -6] ---
  addWallBetween(12.0, -6.0, 24.0, -6.0, 'NamQuocSonHa_Wall_North');
  addWallBetween(24.0, -6.0, 24.0, -18.0, 'NamQuocSonHa_Wall_East');
  addWallBetween(24.0, -18.0, 12.0, -18.0, 'NamQuocSonHa_Wall_South');
  // Vách Tây mở cổng tại Z = -12.0m: Tường từ Z = -18 -> -14m và Z = -10 -> -6m (cổng rộng 4.0m)
  addWallBetween(12.0, -18.0, 12.0, -14.0, 'NamQuocSonHa_West_Wall1');
  addWallBetween(12.0, -10.0, 12.0, -6.0, 'NamQuocSonHa_West_Wall2');

  // --- Phòng Người Con Gái Nam Xương: X in [-24, -12], Z in [0, 12] ---
  addWallBetween(-24.0, 12.0, -12.0, 12.0, 'NamXuong_Wall_North');
  addWallBetween(-24.0, 12.0, -24.0, 0.0, 'NamXuong_Wall_West');
  addWallBetween(-24.0, 0.0, -12.0, 0.0, 'NamXuong_Wall_South');
  // Vách Đông mở cổng tại Z = 6.0m: Tường từ Z = 0 -> 4m và Z = 8 -> 12m (cổng rộng 4.0m)
  addWallBetween(-12.0, 0.0, -12.0, 4.0, 'NamXuong_East_Wall1');
  addWallBetween(-12.0, 8.0, -12.0, 12.0, 'NamXuong_East_Wall2');

  // --- Phòng Đây Thôn Vĩ Dạ: X in [-24, -12], Z in [-18, -6] ---
  addWallBetween(-24.0, -6.0, -12.0, -6.0, 'DayThonViDa_Wall_North');
  addWallBetween(-24.0, -6.0, -24.0, -18.0, 'DayThonViDa_Wall_West');
  addWallBetween(-24.0, -18.0, -12.0, -18.0, 'DayThonViDa_Wall_South');
  // Vách Đông mở cổng tại Z = -12.0m: Tường từ Z = -18 -> -14m và Z = -10 -> -6m (cổng rộng 4.0m)
  addWallBetween(-12.0, -18.0, -12.0, -14.0, 'DayThonViDa_East_Wall1');
  addWallBetween(-12.0, -10.0, -12.0, -6.0, 'DayThonViDa_East_Wall2');

  // --- Phòng Tắt Đèn: X in [-12, 12], Z in [-18, -6] ---
  addWallBetween(-12.0, -18.0, 12.0, -18.0, 'TatDen_Wall_North');
  // Vách Nam mở cổng tại X = 0.0m: Tường từ X = -12 -> -2m và X = 2 -> 12m (cổng rộng 4.0m)
  addWallBetween(-12.0, -6.0, -2.0, -6.0, 'TatDen_South_Wall1');
  addWallBetween(2.0, -6.0, 12.0, -6.0, 'TatDen_South_Wall2');

  // 2. DỰNG 5 CỔNG CHUYỂN CẢNH ĐỘC BẢN VÀ ĐĂNG KÝ VÙNG CỬA MỞ VÀO SPATIALREGISTRY
  // 1. Cổng Thánh Gióng: (12.0, 0.6, 6.0)
  const tgGate = createThanhGiongBambooIronHorseGate({ width: 4.8, height: 4.5 });
  tgGate.position.set(12.0, yFloor1, 6.0);
  tgGate.rotation.y = Math.PI * 0.5;
  group.add(tgGate);
  registry.registerPortalClearanceZone(
    new THREE.Box3(new THREE.Vector3(10.5, yFloor1, 4.4), new THREE.Vector3(13.5, yFloor1 + 4.5, 7.6)),
    'portal_thanh_giong'
  );

  // 2. Cổng Nam Quốc Sơn Hà: (12.0, 0.6, -12.0)
  const nqGate = createNhuNguyetStoneFortressGate({ width: 4.8, height: 4.5 });
  nqGate.position.set(12.0, yFloor1, -12.0);
  nqGate.rotation.y = Math.PI * 0.5;
  group.add(nqGate);
  registry.registerPortalClearanceZone(
    new THREE.Box3(new THREE.Vector3(10.5, yFloor1, -13.6), new THREE.Vector3(13.5, yFloor1 + 4.5, -10.4)),
    'portal_nam_quoc_son_ha'
  );

  // 3. Cổng Nam Xương: (-12.0, 0.6, 6.0)
  const nxGate = createNamXuongMoonGate({ radius: 2.2 });
  nxGate.position.set(-12.0, yFloor1, 6.0);
  nxGate.rotation.y = -Math.PI * 0.5;
  group.add(nxGate);
  registry.registerPortalClearanceZone(
    new THREE.Box3(new THREE.Vector3(-13.5, yFloor1, 4.4), new THREE.Vector3(-10.5, yFloor1 + 4.5, 7.6)),
    'portal_nam_xuong'
  );

  // 4. Cổng Đây Thôn Vĩ Dạ: (-12.0, 0.6, -12.0)
  const vdGate = createHueBambooArborGate({ width: 4.8, height: 4.5 });
  vdGate.position.set(-12.0, yFloor1, -12.0);
  vdGate.rotation.y = -Math.PI * 0.5;
  group.add(vdGate);
  registry.registerPortalClearanceZone(
    new THREE.Box3(new THREE.Vector3(-13.5, yFloor1, -13.6), new THREE.Vector3(-10.5, yFloor1 + 4.5, -10.4)),
    'portal_day_thon_vi_da'
  );

  // 5. Cổng Tắt Đèn: (0.0, 0.6, -6.0)
  const tdGate = createTatDenThatchedCottageGate({ width: 4.8, height: 4.5 });
  tdGate.position.set(0.0, yFloor1, -6.0);
  tdGate.rotation.y = 0;
  group.add(tdGate);
  registry.registerPortalClearanceZone(
    new THREE.Box3(new THREE.Vector3(-1.6, yFloor1, -7.5), new THREE.Vector3(1.6, yFloor1 + 4.5, -4.5)),
    'portal_tat_den'
  );

  // 3. DỰNG 5 BẢNG THÔNG TIN CỐ ĐỊNH CÁCH CỔNG 1.8M VỀ BÊN PHẢI, XOAY MẶT RA LỐI ĐI CHÍNH
  const infoStands = [
    { title: 'Thánh Gióng', author: 'Truyền Thuyết Làng Gióng', period: 'Thời Đại Hùng Vương', pos: { x: 11.65, y: yFloor1, z: 8.0 }, rotY: -Math.PI * 0.5, roomKey: 'thanh_giong' },
    { title: 'Nam Quốc Sơn Hà', author: 'Lý Thường Kiệt', period: 'Triều Đại Nhà Lý (1077)', pos: { x: 11.65, y: yFloor1, z: -10.0 }, rotY: -Math.PI * 0.5, roomKey: 'nam_quoc_son_ha' },
    { title: 'Người Con Gái Nam Xương', author: 'Nguyễn Dữ', period: 'Truyền Kỳ Mạn Lục', pos: { x: -11.65, y: yFloor1, z: 4.0 }, rotY: Math.PI * 0.5, roomKey: 'nam_xuong' },
    { title: 'Đây Thôn Vĩ Dạ', author: 'Hàn Mặc Tử', period: 'Thơ Mới Việt Nam (1938)', pos: { x: -11.65, y: yFloor1, z: -14.0 }, rotY: Math.PI * 0.5, roomKey: 'day_thon_vi_da' },
    { title: 'Tắt Đèn', author: 'Ngô Tất Tố', period: 'Văn Học Hiện Thực (1939)', pos: { x: 2.2, y: yFloor1, z: -5.65 }, rotY: 0, roomKey: 'tat_den' }
  ];

  infoStands.forEach((info) => {
    const standMesh = createRoomEntryInfoStand(info);
    group.add(standMesh);
  });

  return group;
}

/**
 * ============================================================================
 * BẢNG THÔNG TIN ĐỨNG TRUYỀN THỐNG TRƯỚC CỔNG PHÒNG (1.8m BÊN PHẢI CỔNG)
 * ============================================================================
 */
export function createRoomEntryInfoStand({
  title = '',
  author = '',
  period = '',
  pos = { x: 0, y: 0.6, z: 0 },
  rotY = 0,
  roomKey = 'room'
} = {}) {
  const stand = new THREE.Group();
  stand.name = `Room_InfoStand_${roomKey}`;
  stand.position.set(pos.x, pos.y, pos.z);
  stand.rotation.y = rotY;
  stand.userData.ignoreRaycaster = true;

  const stoneMat = getPalaceMaterial('info_stand_stone_mat', () => new THREE.MeshStandardMaterial({
    color: PALACE_GRID_CONFIG.STONE_COLOR,
    roughness: 0.65,
    metalness: 0.15,
    side: THREE.FrontSide
  }));

  const woodMat = getPalaceMaterial('info_stand_wood_mat', () => new THREE.MeshStandardMaterial({
    color: PALACE_GRID_CONFIG.COLUMN_COLOR,
    roughness: 0.45,
    metalness: 0.20,
    side: THREE.FrontSide
  }));

  const goldMat = getPalaceMaterial('info_stand_gold_mat', () => new THREE.MeshStandardMaterial({
    color: PALACE_GRID_CONFIG.GOLD_ACCENT_COLOR,
    roughness: 0.30,
    metalness: 0.85,
    side: THREE.FrontSide
  }));

  // Chân tảng đá xanh
  const baseGeo = sanitizeGeometry(new THREE.CylinderGeometry(0.24, 0.28, 0.22, 16));
  const baseMesh = new THREE.Mesh(baseGeo, stoneMat);
  baseMesh.position.y = 0.11;
  baseMesh.userData.ignoreRaycaster = true;
  stand.add(baseMesh);

  // Thân trụ gỗ lim
  const postGeo = sanitizeGeometry(new THREE.CylinderGeometry(0.08, 0.09, 0.75, 12));
  const postMesh = new THREE.Mesh(postGeo, woodMat);
  postMesh.position.y = 0.22 + 0.375;
  postMesh.userData.ignoreRaycaster = true;
  stand.add(postMesh);

  // Khung bảng thông tin nghiêng 31 độ
  const frameGeo = sanitizeGeometry(new THREE.BoxGeometry(0.68, 0.48, 0.06));
  const frameMesh = new THREE.Mesh(frameGeo, woodMat);
  frameMesh.position.set(0, 1.05, 0.05);
  frameMesh.rotation.x = -0.55;
  frameMesh.userData.ignoreRaycaster = true;
  stand.add(frameMesh);

  // Mặt biển sơn mài chữ vàng
  const plaqueGeo = sanitizeGeometry(new THREE.PlaneGeometry(0.60, 0.40));
  const plaqueMesh = new THREE.Mesh(plaqueGeo, goldMat);
  plaqueMesh.position.set(0, 1.06, 0.085);
  plaqueMesh.rotation.x = -0.55;
  plaqueMesh.userData.ignoreRaycaster = true;
  stand.add(plaqueMesh);

  // Canvas texture cho biển thông tin nếu có document
  const plaqueTex = getPalaceTexture(`tex_info_stand_${roomKey}`, 512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#2b1008';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, w - 32, h - 32);

    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 26px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText(title.toUpperCase(), w / 2, 70);

    ctx.font = 'italic 18px "Times New Roman", serif';
    ctx.fillStyle = '#f0d9b5';
    ctx.fillText(author, w / 2, 120);
    ctx.fillText(period, w / 2, 155);

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#c8a66a';
    ctx.fillText('THÁNH ĐƯỜNG VĂN HỌC', w / 2, 215);
  });

  if (plaqueTex) {
    plaqueMesh.material = new THREE.MeshStandardMaterial({
      map: plaqueTex,
      roughness: 0.35,
      metalness: 0.4,
      side: THREE.FrontSide
    });
  }

  getSpatialRegistry().autoGround(stand, pos.y);
  getSpatialRegistry().registerElement(stand, `info_stand_${roomKey}`, 0.05);

  return stand;
}

/**
 * ============================================================================
 * CÁC HÀM TẠO 5 CỔNG ĐỘC BẢN CHI TIẾT
 * ============================================================================
 */
export function createTamQuanChongDiemGate({
  width = 12.0,
  height = 7.2,
  name = 'TamQuan_ChongDiem_Gate'
} = {}) {
  const gate = new THREE.Group();
  gate.name = name;
  gate.userData.ignoreRaycaster = true;

  const woodMat = getPalaceMaterial('gate_tamquan_wood', () => new THREE.MeshStandardMaterial({
    color: 0x4a1810,
    roughness: 0.35,
    metalness: 0.25,
    side: THREE.FrontSide
  }));

  const mainPillarGeo = sanitizeGeometry(new THREE.BoxGeometry(0.85, height * 0.75, 0.85));
  [-width * 0.22, width * 0.22].forEach((x) => {
    const p = new THREE.Mesh(mainPillarGeo, woodMat);
    p.position.set(x, height * 0.375, 0);
    p.castShadow = true;
    p.userData.ignoreRaycaster = true;
    gate.add(p);
  });

  const sidePillarGeo = sanitizeGeometry(new THREE.BoxGeometry(0.65, height * 0.55, 0.65));
  [-width * 0.46, width * 0.46].forEach((x) => {
    const p = new THREE.Mesh(sidePillarGeo, woodMat);
    p.position.set(x, height * 0.275, 0);
    p.castShadow = true;
    p.userData.ignoreRaycaster = true;
    gate.add(p);
  });

  const mainRoof = createCurvedMaiDaoRoofMesh({
    width: width * 0.65,
    length: 5.5,
    ridgeHeight: 2.2,
    cornerLift: 1.8,
    name: 'TamQuan_MainRoof'
  });
  mainRoof.position.set(0, height * 0.75, 0);
  gate.add(mainRoof);

  return gate;
}

export function createThanhGiongBambooIronHorseGate({
  width = 4.8,
  height = 4.5,
  name = 'ThanhGiong_Bamboo_IronHorse_Gate'
} = {}) {
  const gate = new THREE.Group();
  gate.name = name;
  gate.userData.ignoreRaycaster = true;

  const yellowBambooMat = getPalaceMaterial('gate_yellow_bamboo', () => new THREE.MeshStandardMaterial({
    color: 0xd4a017,
    roughness: 0.42,
    metalness: 0.18,
    side: THREE.FrontSide
  }));

  const ironMat = getPalaceMaterial('gate_wrought_iron', () => new THREE.MeshStandardMaterial({
    color: 0x222225,
    roughness: 0.35,
    metalness: 0.88,
    side: THREE.FrontSide
  }));

  const bambooGeo = sanitizeGeometry(new THREE.CylinderGeometry(0.08, 0.08, height, 10));
  const stalksPerSide = 5;
  for (let s = 0; s < stalksPerSide; s++) {
    const xLeft = -width * 0.5 + s * 0.14;
    const bLeft = new THREE.Mesh(bambooGeo, yellowBambooMat);
    bLeft.position.set(xLeft, height * 0.5, (s % 2) * 0.08);
    bLeft.userData.ignoreRaycaster = true;
    gate.add(bLeft);

    const xRight = width * 0.5 - s * 0.14;
    const bRight = new THREE.Mesh(bambooGeo, yellowBambooMat);
    bRight.position.set(xRight, height * 0.5, (s % 2) * 0.08);
    bRight.userData.ignoreRaycaster = true;
    gate.add(bRight);
  }

  const horseReliefGeo = sanitizeGeometry(new THREE.BoxGeometry(1.6, 1.2, 0.15));
  const horseRelief = new THREE.Mesh(horseReliefGeo, ironMat);
  horseRelief.position.set(0, height - 0.4, 0);
  horseRelief.userData.ignoreRaycaster = true;
  gate.add(horseRelief);

  return gate;
}

export function createNhuNguyetStoneFortressGate({
  width = 4.8,
  height = 4.5,
  name = 'NhuNguyet_Stone_Fortress_Gate'
} = {}) {
  const gate = new THREE.Group();
  gate.name = name;
  gate.userData.ignoreRaycaster = true;

  const mossyStoneMat = getPalaceMaterial('gate_mossy_stone', () => new THREE.MeshStandardMaterial({
    color: 0x4a5852,
    roughness: 0.88,
    metalness: 0.08,
    side: THREE.FrontSide
  }));

  const wallW = (width - 2.8) * 0.5;
  const leftBlock = new THREE.Mesh(sanitizeGeometry(new THREE.BoxGeometry(wallW, height, 0.8)), mossyStoneMat);
  leftBlock.position.set(-width * 0.5 + wallW * 0.5, height * 0.5, 0);
  leftBlock.castShadow = true;
  leftBlock.userData.ignoreRaycaster = true;
  gate.add(leftBlock);

  const rightBlock = new THREE.Mesh(sanitizeGeometry(new THREE.BoxGeometry(wallW, height, 0.8)), mossyStoneMat);
  rightBlock.position.set(width * 0.5 - wallW * 0.5, height * 0.5, 0);
  rightBlock.castShadow = true;
  rightBlock.userData.ignoreRaycaster = true;
  gate.add(rightBlock);

  const archBeam = new THREE.Mesh(sanitizeGeometry(new THREE.BoxGeometry(width, 0.6, 0.9)), mossyStoneMat);
  archBeam.position.set(0, height - 0.3, 0);
  archBeam.userData.ignoreRaycaster = true;
  gate.add(archBeam);

  return gate;
}

export function createNamXuongMoonGate({
  radius = 2.2,
  depth = 0.55,
  name = 'NamXuong_Moon_Gate'
} = {}) {
  const gate = new THREE.Group();
  gate.name = name;
  gate.userData.ignoreRaycaster = true;

  const woodMat = getPalaceMaterial('gate_namxuong_wood', () => new THREE.MeshStandardMaterial({
    color: 0x3d271e,
    roughness: 0.62,
    metalness: 0.12,
    side: THREE.FrontSide
  }));

  const outerW = radius * 2 + 1.2;
  const outerH = radius * 2 + 0.8;
  const shape = new THREE.Shape();
  shape.moveTo(-outerW * 0.5, 0);
  shape.lineTo(outerW * 0.5, 0);
  shape.lineTo(outerW * 0.5, outerH);
  shape.lineTo(-outerW * 0.5, outerH);
  shape.closePath();

  const hole = new THREE.Path();
  hole.absarc(0, radius + 0.2, radius, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const moonGeo = sanitizeGeometry(new THREE.ExtrudeGeometry(shape, {
    depth: depth,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 2
  }));
  moonGeo.center();

  const moonMesh = new THREE.Mesh(moonGeo, woodMat);
  moonMesh.position.y = outerH * 0.5;
  moonMesh.castShadow = true;
  moonMesh.userData.ignoreRaycaster = true;
  gate.add(moonMesh);

  return gate;
}

export function createHueBambooArborGate({
  width = 4.8,
  height = 4.5,
  name = 'DayThonViDa_Hue_Bamboo_Arbor_Gate'
} = {}) {
  const gate = new THREE.Group();
  gate.name = name;
  gate.userData.ignoreRaycaster = true;

  const greenBambooMat = getPalaceMaterial('gate_green_bamboo_hue', () => new THREE.MeshStandardMaterial({
    color: 0x3d6b38,
    roughness: 0.38,
    metalness: 0.12,
    side: THREE.FrontSide
  }));

  const antiqueBrickMat = getPalaceMaterial('gate_hue_antique_brick', () => new THREE.MeshStandardMaterial({
    color: 0x8a5238,
    roughness: 0.82,
    metalness: 0.06,
    side: THREE.FrontSide
  }));

  const pillarGeo = sanitizeGeometry(new THREE.BoxGeometry(0.68, height * 0.8, 0.68));
  [-width * 0.45, width * 0.45].forEach((x) => {
    const p = new THREE.Mesh(pillarGeo, antiqueBrickMat);
    p.position.set(x, height * 0.4, 0);
    p.castShadow = true;
    p.userData.ignoreRaycaster = true;
    gate.add(p);
  });

  const archCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-width * 0.45, height * 0.8, 0),
    new THREE.Vector3(-width * 0.25, height * 0.98, 0.1),
    new THREE.Vector3(0, height * 1.05, 0),
    new THREE.Vector3(width * 0.25, height * 0.98, -0.1),
    new THREE.Vector3(width * 0.45, height * 0.8, 0)
  ]);
  const archTubeGeo = sanitizeGeometry(new THREE.TubeGeometry(archCurve, 24, 0.12, 8, false));
  const archTube = new THREE.Mesh(archTubeGeo, greenBambooMat);
  archTube.userData.ignoreRaycaster = true;
  gate.add(archTube);

  return gate;
}

export function createTatDenThatchedCottageGate({
  width = 4.8,
  height = 4.5,
  name = 'TatDen_Thatched_Cottage_Gate'
} = {}) {
  const gate = new THREE.Group();
  gate.name = name;
  gate.userData.ignoreRaycaster = true;

  const mudWallMat = getPalaceMaterial('gate_tatden_mud_wall', () => new THREE.MeshStandardMaterial({
    color: 0x544332,
    roughness: 0.92,
    metalness: 0.02,
    side: THREE.FrontSide
  }));

  const thatchMat = getPalaceMaterial('gate_tatden_thatch_roof', () => new THREE.MeshStandardMaterial({
    color: 0x8a704a,
    roughness: 0.88,
    metalness: 0.05,
    side: THREE.FrontSide
  }));

  const bambooWoodMat = getPalaceMaterial('gate_tatden_bamboo_post', () => new THREE.MeshStandardMaterial({
    color: 0x483a2b,
    roughness: 0.72,
    metalness: 0.08,
    side: THREE.FrontSide
  }));

  const wallW = (width - 2.8) * 0.5;
  const leftWall = new THREE.Mesh(sanitizeGeometry(new THREE.BoxGeometry(wallW, height, 0.7)), mudWallMat);
  leftWall.position.set(-width * 0.5 + wallW * 0.5, height * 0.5, 0);
  leftWall.castShadow = true;
  leftWall.userData.ignoreRaycaster = true;
  gate.add(leftWall);

  const rightWall = new THREE.Mesh(sanitizeGeometry(new THREE.BoxGeometry(wallW, height, 0.7)), mudWallMat);
  rightWall.position.set(width * 0.5 - wallW * 0.5, height * 0.5, 0);
  rightWall.castShadow = true;
  rightWall.userData.ignoreRaycaster = true;
  gate.add(rightWall);

  const lintelGeo = sanitizeGeometry(new THREE.CylinderGeometry(0.12, 0.12, width, 8));
  const lintel = new THREE.Mesh(lintelGeo, bambooWoodMat);
  lintel.rotation.z = Math.PI * 0.5;
  lintel.position.set(0, height * 0.85, 0);
  lintel.userData.ignoreRaycaster = true;
  gate.add(lintel);

  const thatchRoofGeo = sanitizeGeometry(new THREE.ConeGeometry(width * 0.65, 1.2, 4));
  const thatchRoof = new THREE.Mesh(thatchRoofGeo, thatchMat);
  thatchRoof.rotation.y = Math.PI * 0.25;
  thatchRoof.scale.set(1.4, 0.65, 0.8);
  thatchRoof.position.set(0, height + 0.35, 0.15);
  thatchRoof.userData.ignoreRaycaster = true;
  gate.add(thatchRoof);

  return gate;
}

/**
 * ============================================================================
 * 13. MASTER BUILDER: KIẾN TRÚC TOÀN DIỆN THÁNH ĐƯỜNG VĂN HỌC (CHỮ CÔNG 工)
 * ============================================================================
 * Tích hợp toàn diện:
 * 1. Lưới mặt bằng chữ Công (工) GRID_STEP = 6.0m
 * 2. Cột lim thót ngọn 2 tầng đồng trục (X, Z) 100% trên đài móng đá cao 0.6m
 * 3. Tiền đình 4 cột đón khách, gian giữa 12m mở toang, cầu đá 6.0m
 * 4. Giếng trời 12m x 12m cho Sách Thiên Thư & 2 cầu thang gỗ đối xứng
 * 5. Mái đao 2 tầng Mái Chồng Diêm + Hoành phi 'THÁNH ĐƯỜNG VĂN HỌC'
 * 6. Hệ trần phẳng kẻ ô vì kèo lim #4a2511 + ánh sáng tán xạ Hemisphere 0.9 chống đen
 * 7. Tường ngăn 0.34m và 5 cổng chuyển cảnh độc bản
 */
export function createVietnamesePalaceArchitecture({
  name = 'Vietnamese_Palace_Architecture_GrandSystem'
} = {}) {
  const masterGroup = new THREE.Group();
  masterGroup.name = name;
  masterGroup.userData.ignoreRaycaster = true;

  const pillarPositions = getPalaceGridPillarPositions();

  // A. Đài móng đá Y = 0.6m và Hàng Cột Lim 2 tầng đồng trục
  const columnsAndPodium = createStonePodiumAndPillars({ pillarPositions });
  masterGroup.add(columnsAndPodium);

  // B. Giếng trời 12m x 12m, Lan can gỗ & 2 Cầu thang gỗ đối xứng
  const atriumSystem = createPalaceAtriumVoidAndBalustrade();
  masterGroup.add(atriumSystem);

  // C. Tiền đình Portico 4 cột & Cầu đá 6.0m
  const porticoAndBridge = createEntrancePorticoAndBridge();
  masterGroup.add(porticoAndBridge);

  // D. Hệ mái đao 2 tầng Mái Chồng Diêm + Hoành phi 'THÁNH ĐƯỜNG VĂN HỌC'
  const grandRoof = createTwoTierCurvedMaiDaoRoofMesh({
    width: PALACE_GRID_CONFIG.PODIUM_WIDTH,
    length: PALACE_GRID_CONFIG.PODIUM_DEPTH
  });
  masterGroup.add(grandRoof);

  // E. Hệ trần gỗ kẻ ô vì kèo lim #4a2511
  const cofferedCeiling = createPalaceCofferedCeilingAndBeams();
  masterGroup.add(cofferedCeiling);

  // F. Hệ thống ánh sáng vàng ấm hoàng cung chống tối đen góc khuất
  const palaceLighting = createPalaceLighting();
  masterGroup.add(palaceLighting);

  // G. Tường bao ngăn phòng dày 0.34m và 5 Cổng chuyển cảnh độc bản
  const roomWallsAndPortals = createPalaceRoomWallsAndPortals();
  masterGroup.add(roomWallsAndPortals);

  // H. Đăng ký hitbox cản va chạm vật lý vào hitboxManager
  const registerHitboxes = (hitboxMgr) => {
    if (!hitboxMgr) return;

    // 1. Lan can hai bên cầu đá (X = -3m và X = +3m, Z in [18m, 34m])
    hitboxMgr.registerStaticObstacle?.({
      minX: -PALACE_GRID_CONFIG.BRIDGE_WIDTH * 0.5 - 0.35,
      maxX: -PALACE_GRID_CONFIG.BRIDGE_WIDTH * 0.5 + 0.05,
      minZ: PALACE_GRID_CONFIG.BRIDGE_END_Z,
      maxZ: PALACE_GRID_CONFIG.BRIDGE_START_Z,
      height: 1.2,
      name: 'Hitbox_Bridge_Balustrade_West'
    });
    hitboxMgr.registerStaticObstacle?.({
      minX: PALACE_GRID_CONFIG.BRIDGE_WIDTH * 0.5 - 0.05,
      maxX: PALACE_GRID_CONFIG.BRIDGE_WIDTH * 0.5 + 0.35,
      minZ: PALACE_GRID_CONFIG.BRIDGE_END_Z,
      maxZ: PALACE_GRID_CONFIG.BRIDGE_START_Z,
      height: 1.2,
      name: 'Hitbox_Bridge_Balustrade_East'
    });

    // 2. Lan can mặt tiền tầng 1 (Z = 18m, X in [-24, -6] và [6, 24])
    hitboxMgr.registerStaticObstacle?.({
      minX: -24.0,
      maxX: -6.0,
      minZ: 17.8,
      maxZ: 18.2,
      height: 1.2,
      name: 'Hitbox_Front_Balustrade_West'
    });
    hitboxMgr.registerStaticObstacle?.({
      minX: 6.0,
      maxX: 24.0,
      minZ: 17.8,
      maxZ: 18.2,
      height: 1.2,
      name: 'Hitbox_Front_Balustrade_East'
    });

    // 3. Toàn bộ các cột trên lưới
    pillarPositions.forEach(([px, pz]) => {
      hitboxMgr.registerStaticObstacle?.({
        minX: px - 0.35,
        maxX: px + 0.35,
        minZ: pz - 0.35,
        maxZ: pz + 0.35,
        height: 10.2,
        name: `Hitbox_Col_${px}_${pz}`
      });
    });

    // 4. Lan can tầng 2 quanh giếng trời 12m x 12m
    const hHalf = PALACE_GRID_CONFIG.ATRIUM_SIZE * 0.5;
    const cX = PALACE_GRID_CONFIG.ATRIUM_CENTER_X;
    const cZ = PALACE_GRID_CONFIG.ATRIUM_CENTER_Z;
    hitboxMgr.registerStaticObstacle?.({
      minX: cX - hHalf, maxX: cX + hHalf,
      minZ: cZ - hHalf - 0.2, maxZ: cZ - hHalf + 0.2,
      minY: PALACE_GRID_CONFIG.FLOOR2_ELEVATION, height: 1.2,
      name: 'Hitbox_Atrium_Rail_North'
    });
    hitboxMgr.registerStaticObstacle?.({
      minX: cX - hHalf, maxX: cX + hHalf,
      minZ: cZ + hHalf - 0.2, maxZ: cZ + hHalf + 0.2,
      minY: PALACE_GRID_CONFIG.FLOOR2_ELEVATION, height: 1.2,
      name: 'Hitbox_Atrium_Rail_South'
    });
    hitboxMgr.registerStaticObstacle?.({
      minX: cX - hHalf - 0.2, maxX: cX - hHalf + 0.2,
      minZ: cZ - hHalf, maxZ: cZ + hHalf,
      minY: PALACE_GRID_CONFIG.FLOOR2_ELEVATION, height: 1.2,
      name: 'Hitbox_Atrium_Rail_West'
    });
    hitboxMgr.registerStaticObstacle?.({
      minX: cX + hHalf - 0.2, maxX: cX + hHalf + 0.2,
      minZ: cZ - hHalf, maxZ: cZ + hHalf,
      minY: PALACE_GRID_CONFIG.FLOOR2_ELEVATION, height: 1.2,
      name: 'Hitbox_Atrium_Rail_East'
    });
  };

  return {
    group: masterGroup,
    pillarPositions,
    config: PALACE_GRID_CONFIG,
    registerHitboxes,
    atriumBounds: {
      minX: PALACE_GRID_CONFIG.ATRIUM_CENTER_X - PALACE_GRID_CONFIG.ATRIUM_SIZE * 0.5,
      maxX: PALACE_GRID_CONFIG.ATRIUM_CENTER_X + PALACE_GRID_CONFIG.ATRIUM_SIZE * 0.5,
      minZ: PALACE_GRID_CONFIG.ATRIUM_CENTER_Z - PALACE_GRID_CONFIG.ATRIUM_SIZE * 0.5,
      maxZ: PALACE_GRID_CONFIG.ATRIUM_CENTER_Z + PALACE_GRID_CONFIG.ATRIUM_SIZE * 0.5
    },
    porticoBounds: {
      minX: -PALACE_GRID_CONFIG.BRIDGE_WIDTH * 0.5,
      maxX: PALACE_GRID_CONFIG.BRIDGE_WIDTH * 0.5,
      thresholdZ: PALACE_GRID_CONFIG.PORTICO_Z
    },
    bridgeBounds: {
      minX: -PALACE_GRID_CONFIG.BRIDGE_WIDTH * 0.5,
      maxX: PALACE_GRID_CONFIG.BRIDGE_WIDTH * 0.5,
      startZ: PALACE_GRID_CONFIG.BRIDGE_START_Z,
      endZ: PALACE_GRID_CONFIG.BRIDGE_END_Z
    }
  };
}
