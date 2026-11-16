import * as THREE from 'three';
import {
  createHienThuCacReadingLounge,
  buildGrandWallBookshelf,
  buildCentralStudyClusters,
  buildBalconyBistroTables,
  buildEntranceWelcomePlaque
} from '../src/modules/hienThuCacReadingLounge.js';

let allPassed = true;
function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    allPassed = false;
  }
}

console.log('--- TEST HIÊN THƯ CÁC – KHÔNG GIAN ĐỌC SÁCH & THƯỞNG TRÀ (tamthe) ---');

const lounge = createHienThuCacReadingLounge();
assert(lounge && lounge.group instanceof THREE.Group, 'createHienThuCacReadingLounge returns valid group');
assert(lounge.group.name === 'HienThuCac_ReadingLounge_Master', 'Master group name is HienThuCac_ReadingLounge_Master');

// 1. Kiểm tra cao độ sàn Tầng 2 (Y = 10.0m)
const wallBookshelf = lounge.wallBookshelf;
assert(wallBookshelf && wallBookshelf.position.y === 10.0, 'Phân khu A tiếp đất đúng Y = 10.0m');
assert(Math.abs(wallBookshelf.position.x - 33.2) < 0.1, 'Phân khu A áp tường tại X ≈ 33.2m');
assert(wallBookshelf.position.z === 13.0, 'Phân khu A căn giữa dải Z = [6, 20]');

// 2. Kiểm tra thông thoáng hành lang (|X| <= 6m)
let minX = Infinity;
let maxX = -Infinity;
lounge.group.traverse((c) => {
  if (c.isMesh) {
    const worldPos = new THREE.Vector3();
    c.getWorldPosition(worldPos);
    // Vị trí cục bộ tương đối trong lounge
    const box = new THREE.Box3().setFromObject(c);
    if (box.min.x < minX) minX = box.min.x;
    if (box.max.x > maxX) maxX = box.max.x;
  }
});
assert(minX >= 6.0, `Trục hành lang |X| <= 6m hoàn toàn thông thoáng 100% (minX của Hiên Thư Các = ${minX.toFixed(2)}m > 6.0m)`);

// 3. Kiểm tra Phân khu B: 6 cụm bàn đọc trung tâm
assert(lounge.studyTables && lounge.studyTables.length === 6, `Phân khu B có đúng 6 cụm bàn đọc (actual: ${lounge.studyTables?.length})`);
let tableZoneValid = true;
lounge.studyTables.forEach((t) => {
  if (t.position.x < 18 || t.position.x > 26 || t.position.z < 7 || t.position.z > 19) {
    tableZoneValid = false;
  }
  if (t.position.y !== 10.0) tableZoneValid = false;
});
assert(tableZoneValid, '6 Cụm bàn đọc nằm chính xác trong vùng X in [18, 26], Z in [7, 19], Y = 10.0m');

// 4. Kiểm tra Phân khu C: 4 bàn đôi ven lan can và cổng chào
assert(lounge.balconyTables && lounge.balconyTables.children.length === 4, `Phân khu C có đúng 4 bàn đôi ven lan can (actual: ${lounge.balconyTables?.children.length})`);
let balconyZValid = true;
lounge.balconyTables.children.forEach((bp) => {
  if (Math.abs(bp.position.z - 21.0) > 0.5) balconyZValid = false;
});
assert(balconyZValid, '4 Bàn đôi đặt đúng ven lan can Z ≈ 21.0m');

// 5. Kiểm tra Cổng chào lối vào
const entrance = lounge.entrancePlaque;
assert(entrance && Math.abs(entrance.position.x - 8.5) < 0.2 && Math.abs(entrance.position.z - 6.0) < 0.2, 'Cổng chào/biển hiệu đứng đặt tại X ≈ 8.5m, Z ≈ 6.0m');

// 6. Kiểm tra an toàn WebGL: Không NaN/Infinity, userData.ignoreRaycaster = true
let hasNaN = false;
let raycasterSafe = true;
let totalMeshes = 0;
lounge.group.traverse((c) => {
  if (c.isMesh) {
    totalMeshes++;
    if (!c.userData?.ignoreRaycaster) raycasterSafe = false;
    const pos = c.geometry?.getAttribute('position');
    if (pos) {
      for (let i = 0; i < pos.count * pos.itemSize; i++) {
        if (Number.isNaN(pos.array[i]) || !Number.isFinite(pos.array[i])) hasNaN = true;
      }
    }
  }
});
assert(!hasNaN, 'Zero NaN or Infinity in all geometry buffers');
assert(raycasterSafe, '100% Meshes have userData.ignoreRaycaster = true');
assert(totalMeshes > 100, `Kiến trúc phong phú, đầy đủ chi tiết di sản (tổng mesh: ${totalMeshes})`);

if (allPassed) {
  console.log('\n============================================================');
  console.log('✓ TOÀN BỘ PART 1 – HIÊN THƯ CÁC ĐẠT CHUẨN 100% TIÊU CHÍ!');
  console.log('============================================================');
  process.exit(0);
} else {
  console.error('\n❌ CÓ TIÊU CHÍ CHƯA ĐẠT!');
  process.exit(1);
}
