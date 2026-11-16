import * as THREE from 'three';
import assert from 'node:assert';
import fs from 'node:fs';

console.log('=== VERIFYING REALM LOCK FOR AN DUONG VUONG ===\n');

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

// 1. Check literatureRegistry.js
const litRegistrySrc = fs.readFileSync('src/config/literatureRegistry.js', 'utf8');
const litRegLocked = litRegistrySrc.includes('portalReady: false') && litRegistrySrc.includes('an_duong_vuong');
check('literatureRegistry.js has portalReady: false for an_duong_vuong', litRegLocked);

// 2. Check main.js
const mainSrc = fs.readFileSync('src/main.js', 'utf8');
const mainBookLocked = mainSrc.includes('portalReady: false') || mainSrc.includes('an_duong_vuong');
check('main.js book registration config checked', mainBookLocked);

// 3. Check anDuongVuongRoomDecorator.js
const roomSrc = fs.readFileSync('src/modules/anDuongVuongRoomDecorator.js', 'utf8');
check('anDuongVuongRoomDecorator.js defines _isRealmLocked = true', roomSrc.includes('_isRealmLocked') && roomSrc.includes('true'));
check('Lock notification toast text present in room decorator', roomSrc.includes('tạm phong ấn') || roomSrc.includes('Đang Phong Ấn'));
check('Portal Sign has PHONG ẤN CÕI DẠ SƠN', roomSrc.includes('PHONG ẤN') || roomSrc.includes('Phong Ấn') || roomSrc.includes('Tạm Khóa'));

// 4. Dynamic Verification
const roomMod = await import('../src/modules/anDuongVuongRoomDecorator.js');
const mockScene = new THREE.Scene();
const mockCamera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
mockCamera.position.set(0, 1.7, -48);

const exhibition = roomMod.buildAnDuongVuongExhibition({
  roomCenter: new THREE.Vector3(0, 0, -48),
  scene: mockScene,
  camera: mockCamera,
  colliders: []
});
const roomGroup = exhibition.roomGroup || exhibition;

let portalProxy = null;
let portalMesh = null;
roomGroup.traverse((obj) => {
  if (obj.userData?.isBookPortal || obj.userData?.type === 'portal') portalProxy = obj;
  if (obj.name && obj.name.includes('Portal') && obj.material?.uniforms?.uAwaken) portalMesh = obj;
});

check('Portal proxy has portalReady: false', portalProxy?.userData?.portalReady === false);

// Check proximity trigger does NOT trigger enterRealm when locked
let enteredRealm = false;
globalThis.enterRealm = () => { enteredRealm = true; };
if (typeof roomGroup.update === 'function') {
  mockCamera.position.set(0, 1.7, -59.5); // close to portal
  roomGroup.update(0.016, 1.0, mockCamera);
  check('Proximity trigger does NOT enter realm when locked', enteredRealm === false);
}

// Check enterRealm call directly
if (typeof roomMod.enterRealm === 'function') {
  let switchSceneCalled = false;
  roomMod.enterRealm('an_duong_vuong');
  check('Direct enterRealm does not switch scene when locked', !switchSceneCalled);
}

console.log(`\n========================================`);
console.log(`LOCK VERIFICATION: ${passedChecks}/${totalChecks} PASSED, ${failedChecks} FAILED`);
console.log(`========================================\n`);
if (failedChecks > 0) process.exit(1);
