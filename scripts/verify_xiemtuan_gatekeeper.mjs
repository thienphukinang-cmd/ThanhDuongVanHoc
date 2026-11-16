import * as THREE from 'three';
import { execSync } from 'node:child_process';
import { getMuseumHitboxManager } from '../src/modules/museumHitboxSystem.js';
import { createMuseumSpaceEnrichmentSystem } from '../src/modules/museumSpaceEnrichmentSystem.js';
import { createInstancedCorridorPillarsAndLanterns } from '../src/modules/museumLobbyCorridorDecorator.js';
import { createMuseumCrowdSystem } from '../src/modules/museumCrowdVFX.js';

console.log('================================================================');
console.log('🛡️ MÈO XIÊM TUẦN ĐINH (XIEMTUAN) - KIỂM THỬ NGHIỆM THU TỐI THƯỢNG');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assertCheck(name, condition, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } else {
    failedTests++;
    console.error(`  [FAIL] ${name} -> ${details}`);
  }
}

// =============================================================================
// PHẦN 1: KIỂM TRA HITBOX BOX3 & TRỤC ĐI BỘ TRUNG TÂM |X| <= 2.3M
// =============================================================================
console.log('--- 1. KIỂM ĐỊNH BOX3 SOLID COLLIDERS & TRỤC ĐI BỘ TRUNG TÂM ---');

const scene = new THREE.Scene();
const hbMgr = getMuseumHitboxManager(scene);
hbMgr.rebuildAllMuseumHitboxes();

// Kiểm tra bệ sách trung tâm
const bookBoxEntry = hbMgr.solidBoxes.find(b => b.tag === 'Center_Heritage_Book_Platform');
assertCheck('Box3 collider Bệ Sách Di Sản trung tâm (0, 0, 0) tồn tại', !!bookBoxEntry);
if (bookBoxEntry) {
  const b = bookBoxEntry.box;
  assertCheck('Bệ Sách có kích thước phù hợp (X: [-1.8, 1.8], Z: [-1.8, 1.8])',
    b.min.x === -1.8 && b.max.x === 1.8 && b.min.z === -1.8 && b.max.z === 1.8
  );
}

// Kiểm tra 2 bệ tròn đỉnh đồng & hạc thờ
const pedWestEntry = hbMgr.solidBoxes.find(b => b.tag === 'GrandBronzePedestalWest_SolidHitbox');
const pedEastEntry = hbMgr.solidBoxes.find(b => b.tag === 'GrandBronzePedestalEast_SolidHitbox');
assertCheck('Box3 collider Bệ Tròn Cẩm Thạch Đen Cánh Tây tồn tại', !!pedWestEntry);
assertCheck('Box3 collider Bệ Tròn Cẩm Thạch Đen Cánh Đông tồn tại', !!pedEastEntry);

if (pedWestEntry && pedEastEntry) {
  const bWest = pedWestEntry.box;
  const bEast = pedEastEntry.box;
  assertCheck('Bệ Tây hoàn toàn nằm ngoài trục trung tâm (|X| >= 3.3m > 2.3m)',
    bWest.max.x <= -3.3, `bWest.max.x = ${bWest.max.x}`
  );
  assertCheck('Bệ Đông hoàn toàn nằm ngoài trục trung tâm (|X| >= 3.3m > 2.3m)',
    bEast.min.x >= 3.3, `bEast.min.x = ${bEast.min.x}`
  );
  assertCheck('Khoảng cách an toàn tới biên hành lang |X| = 2.3m >= 1.0m',
    (Math.abs(bWest.max.x) - 2.3 >= 0.99) && (bEast.min.x - 2.3 >= 0.99)
  );
}

// Kiểm tra hàng cột lim cung đình (16 cột)
let pillarCount = 0;
let innerPillarClear = true;
for (let i = 1; i <= 16; i++) {
  const pEntry = hbMgr.solidBoxes.find(b => b.tag === `Imperial_Pillar_${i}`);
  if (pEntry) {
    pillarCount++;
    const b = pEntry.box;
    // Cột trong cùng ở |X| = 5.5, bán kính 0.48 -> |X| >= 5.02m >> 2.3m
    if (b.min.x < 2.3 && b.max.x > -2.3) {
      innerPillarClear = false;
    }
  }
}
assertCheck(`Đã đăng ký đủ 16 Box3 colliders cho Hàng Cột Cung Đình (Tìm thấy: ${pillarCount}/16)`, pillarCount === 16);
assertCheck('Toàn bộ 16 Cột Cung Đình không chạm vào trục trung tâm |X| <= 2.3m', innerPillarClear);

// Kiểm tra 2 cụm bàn tròn cánh gà
const tableWestEntry = hbMgr.solidBoxes.find(b => b.tag === 'WingTableWest_SolidHitbox');
const tableEastEntry = hbMgr.solidBoxes.find(b => b.tag === 'WingTableEast_SolidHitbox');
assertCheck('Box3 collider Bàn Tròn Cánh Gà Tây (X = -14m) tồn tại', !!tableWestEntry);
assertCheck('Box3 collider Bàn Tròn Cánh Gà Đông (X = +14m) tồn tại', !!tableEastEntry);

// Kiểm tra tích hợp từ SpaceEnrichmentSystem
const enrichmentGroup = createMuseumSpaceEnrichmentSystem({ hitboxManager: hbMgr });
scene.add(enrichmentGroup);
if (enrichmentGroup.userData?.registerHitboxes) {
  enrichmentGroup.userData.registerHitboxes(hbMgr);
}

// Xác minh 100% không gian trục đi bộ trung tâm |X| <= 2.3m trên mặt sàn Tầng 1 (Y in [0.2, 2.0]) thông thoáng
let corridorViolations = 0;
const violationDetails = [];

hbMgr.solidBoxes.forEach((entry) => {
  const b = entry.box;
  // Chỉ xét các vật cản ở tầm cao đi bộ mặt sàn Tầng 1 (Y: 0.2m -> 2.0m)
  const isGroundLevel = b.min.y <= 2.0 && b.max.y >= 0.2;
  if (!isGroundLevel) return;

  // Bỏ qua bệ sách tâm sảnh (Z in [-2.0, 2.0]), kiểm tra lối đi phía Nam (Z: 2.3 -> 28m) và phía Bắc (Z: -16m -> -2.3m)
  const isSouthCorridor = b.min.z < 28.0 && b.max.z > 2.3;
  const isNorthCorridor = b.min.z < -2.3 && b.max.z > -16.5;

  if (isSouthCorridor || isNorthCorridor) {
    // Nếu collider lấn vào vùng trục đi bộ trung tâm |X| <= 2.3m
    if (b.min.x < 2.3 && b.max.x > -2.3) {
      corridorViolations++;
      violationDetails.push(`${entry.tag}: X in [${b.min.x.toFixed(2)}, ${b.max.x.toFixed(2)}], Z in [${b.min.z.toFixed(2)}, ${b.max.z.toFixed(2)}], Y in [${b.min.y.toFixed(2)}, ${b.max.y.toFixed(2)}]`);
    }
  }
});

assertCheck(
  'Trục đường đi bộ trung tâm |X| <= 2.3m luôn 100% thông thoáng (Zero Obstacles)',
  corridorViolations === 0,
  violationDetails.join('; ')
);

// =============================================================================
// PHẦN 2: KIỂM TRA userData.ignoreRaycaster = true TRÊN TOÀN BỘ MESH NỀN/VFX
// =============================================================================
console.log('\n--- 2. KIỂM ĐỊNH userData.ignoreRaycaster = true TRÊN ĐÈN, DÂY, MANDALA, KHÓI & HẠT ---');

let checkedRaycastCount = 0;
let missingRaycastCount = 0;
const missingRaycastNames = [];

function checkIgnoreRaycaster(obj, label) {
  checkedRaycastCount++;
  const isIgnored = obj.userData?.ignoreRaycaster === true;
  if (!isIgnored) {
    missingRaycastCount++;
    missingRaycastNames.push(label || obj.name || 'unnamed');
  }
}

// A. Đèn lồng & Dây treo từ SpaceEnrichmentSystem
enrichmentGroup.traverse((child) => {
  const name = child.name || '';
  if (child.isInstancedMesh) {
    checkIgnoreRaycaster(child, `InstancedMesh_${name}`);
  }
  if (child.isPoints) {
    checkIgnoreRaycaster(child, `Points_${name}`);
  }
  if (name.includes('Lantern') || name.includes('Mandala') || name.includes('Smoke') || name.includes('Mist') || name.includes('Petal') || name.includes('Firefly')) {
    checkIgnoreRaycaster(child, name);
  }
});

// B. Cột & Đèn lồng từ Corridor Decorator
const corridorPillars = createInstancedCorridorPillarsAndLanterns([
  new THREE.Vector3(-8, 0, 10),
  new THREE.Vector3(8, 0, 10)
], 9.2);
corridorPillars.traverse((child) => {
  if (child.isInstancedMesh || child.name?.includes('Lantern')) {
    checkIgnoreRaycaster(child, `Corridor_${child.name}`);
  }
});

// C. Đám đông bóng đen Silhouette Crowd
const crowdSys = createMuseumCrowdSystem(scene, { totalVisitors: 42 });
const crowdGroup = crowdSys?.group || crowdSys?.crowdGroup || crowdSys;
if (crowdGroup?.traverse) {
  crowdGroup.traverse((child) => {
    if (child.isInstancedMesh) {
      checkIgnoreRaycaster(child, `Crowd_${child.name}`);
    }
  });
}

assertCheck(
  `Toàn bộ đèn lồng, dây treo, mandala sàn, khói và hạt ánh sáng có cờ userData.ignoreRaycaster = true (Đã quét: ${checkedRaycastCount})`,
  missingRaycastCount === 0,
  `Thiếu cờ: ${missingRaycastNames.slice(0, 5).join(', ')}`
);

// D. Tối ưu FPS: Kiểm tra castShadow và receiveShadow bị tắt trên mesh trang trí tĩnh
let shadowOverheadCount = 0;
enrichmentGroup.traverse((child) => {
  if (child.isMesh && (child.castShadow || child.receiveShadow)) {
    shadowOverheadCount++;
  }
});
assertCheck(
  'Tối ưu WebGL 60+ FPS: Tắt castShadow/receiveShadow trên mesh tĩnh sảnh chính để triệt tiêu sampler mismatch',
  shadowOverheadCount === 0,
  `Còn ${shadowOverheadCount} mesh bật shadow`
);

// =============================================================================
// PHẦN 3: TỔNG KẾT
// =============================================================================
console.log('\n================================================================');
console.log(`KẾT QUẢ KIỂM THỬ: ${passedTests}/${totalTests} BÀI PASS (${Math.round((passedTests / totalTests) * 100)}%)`);
if (failedTests > 0) {
  console.error(`CÓ ${failedTests} BÀI KIỂM TRA THẤT BẠI!`);
  process.exit(1);
} else {
  console.log('✅ 100% BÀI KIỂM TRA THÀNH CÔNG RỰC RỠ! HỆ THỐNG SẴN SÀNG NGHIỆM THU!');
}
