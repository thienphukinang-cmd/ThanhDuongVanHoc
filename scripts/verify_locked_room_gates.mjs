import * as THREE from 'three';
import assert from 'node:assert';
import fs from 'node:fs';

console.log('=== VERIFYING LOCKED ROOM GATE SYSTEM UPGRADES ===\n');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function check(desc, condition, details = '') {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  [PASS] ${desc}`);
  } else {
    failedChecks++;
    console.error(`  [FAIL] ${desc} ${details ? '--> ' + details : ''}`);
  }
}

// 1. Static Source Code Checks
console.log('1. Static Code Analysis:');
const gateSrc = fs.readFileSync('src/modules/museumLockedRoomGateSystem.js', 'utf8');

check('Biển đồng khắc chữ "KHÔNG GIAN ĐANG PHỤC DỰNG – SẮP RA MẮT" trong texture',
  gateSrc.includes('KHÔNG GIAN ĐANG PHỤC DỰNG – SẮP RA MẮT') || gateSrc.includes('KHÔNG GIAN ĐANG PHỤC DỰNG'));

check('Thanh chắn gỗ lim (Lim Wood Barricade Beam) implemented',
  gateSrc.includes('beamMesh') || gateSrc.includes('Barricade') || gateSrc.includes('beamWidth'));

check('Dải lụa vàng phong ấn (Imperial Golden Silk Seal Ribbon) implemented',
  gateSrc.includes('GoldenSilkRibbon') || gateSrc.includes('goldenSilkMat') || gateSrc.includes('ribbonMesh'));

check('Đĩa son đỏ triều đình & nút thắt hoa lụa (Rosette & Seal Medal)',
  gateSrc.includes('rosette') || gateSrc.includes('sealMedal') || gateSrc.includes('vermilionSealMat'));

check('Hộp va chạm Box3 chặn kín cửa (Solid Wall Barrier) với độ dày và chiều cao 8m',
  gateSrc.includes('colliderBox') && (gateSrc.includes('8.0') || gateSrc.includes('floorY + 8')));

check('Tắt toàn bộ hiệu ứng vòng xoáy portal (Portal Deactivation logic)',
  gateSrc.includes('deactivatePortals') || (gateSrc.includes('portalReady = false') && gateSrc.includes('uAwaken')));

check('Tương tác âm thanh Web Audio và thông báo Toast trang trọng',
  gateSrc.includes('playLockedDoorSound') && gateSrc.includes('showLockedRoomNoticeToast'));

// 2. Dynamic Execution & Scene Generation Checks
console.log('\n2. Dynamic Module Execution Verification:');
try {
  const gateMod = await import('../src/modules/museumLockedRoomGateSystem.js');
  const parentGroup = new THREE.Group();
  parentGroup.name = 'MockMuseumHall';

  // Thêm một portal mẫu để kiểm tra cơ chế vô hiệu hóa (deactivation)
  const dummyPortal = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.ShaderMaterial({ uniforms: { uAwaken: { value: 0.8 } } })
  );
  dummyPortal.name = 'MagicBook_Portal_su_tich_trau_cau';
  dummyPortal.userData = { isBookPortal: true, portalReady: true };
  parentGroup.add(dummyPortal);

  const result = gateMod.setupAllLockedRoomGates(parentGroup);

  check(`setupAllLockedRoomGates tạo ${result.uncompletedCount} cổng khóa`, result.uncompletedCount > 0);
  check(`solidColliders có ${result.solidColliders.length} hộp va chạm Box3`, result.solidColliders.length === result.uncompletedCount);
  check(`clickProxies có ${result.clickProxies.length} click proxies`, result.clickProxies.length === result.uncompletedCount);

  // Kiểm tra thành phần bên trong một cổng khóa mẫu
  const firstGate = result.lockedGates[0];
  let hasBeam = false;
  let hasRibbon = false;
  let hasPlaque = false;
  let hasCollider = false;
  let hasSpotLight = false;

  firstGate.traverse((child) => {
    if (child.name?.includes('GoldenSilkRibbon')) hasRibbon = true;
    if (child.name?.includes('BronzeSealPlaque') || child.name?.includes('SealPlaque')) hasPlaque = true;
    if (child.isSpotLight) hasSpotLight = true;
    if (child.geometry?.type === 'BoxGeometry' && child.geometry.parameters.width > 5.0) hasBeam = true;
  });

  check('Cổng khóa có dải lụa vàng phong ấn (GoldenSilkRibbon)', hasRibbon);
  check('Cổng khóa có biển đồng trang nhã (BronzeSealPlaque)', hasPlaque);
  check('Cổng khóa có thanh chắn ngang gỗ lim (Lim barricade beam)', hasBeam);
  check('Cổng khóa có đèn SpotLight ấm rọi biển đồng', hasSpotLight);

  // Kiểm tra cơ chế deactivation của portal trong phòng khóa
  check('Vòng xoáy portal mẫu đã bị tắt hoàn toàn (visible = false, uAwaken = 0)',
    dummyPortal.visible === false && dummyPortal.material.uniforms.uAwaken.value === 0);
  check('userData.portalReady được đặt thành false', dummyPortal.userData.portalReady === false);

  // Kiểm tra kích thước của Box3 collider
  const sampleBox = result.solidColliders[0];
  const boxHeight = sampleBox.max.y - sampleBox.min.y;
  check('Box3 collider có chiều cao >= 7.5m bảo vệ kín cửa', boxHeight >= 7.5);

} catch (err) {
  check('Dynamic execution with gate system', false, err.message);
}

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log(`\n========================================`);
console.log(`LOCKED ROOM GATE VERIFICATION: ${passedChecks}/${totalChecks} PASSED, ${failedChecks} FAILED`);
console.log(`========================================\n`);
if (failedChecks > 0) process.exit(1);
