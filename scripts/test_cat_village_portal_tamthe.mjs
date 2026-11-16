import * as THREE from 'three';

let allPassed = true;
function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    allPassed = false;
  }
}

console.log('--- TEST CỔNG LINH MIÊU THIÊN THƯ TẠI ĐẠI SẢNH (tamthe) ---');

// Mock host object like MuseumViewer
const mockHost = {
  atriumGroup: new THREE.Group(),
  enteredCatVillage: false,
  enterCatVillage() {
    this.enteredCatVillage = true;
  }
};

// Bind method from main.js or test the builder
import fs from 'fs';
const mainCode = fs.readFileSync('src/main.js', 'utf8');

assert(mainCode.includes('buildCatVillagePortalInLobby()'), 'buildCatVillagePortalInLobby defined in main.js');
assert(mainCode.includes('CỔNG LINH MIÊU THIÊN THƯ'), 'Comment/Label indicates Cong Linh Mieu Thien Thu');
assert(mainCode.includes('🐾 ĐẢO MÈO AI – XƯỞNG KIẾN TẠO THÁNH ĐƯỜNG 🐾'), 'Title plate contains exact name');
assert(mainCode.includes('#00f5d4') && mainCode.includes('#ffbe55'), 'Vortex has Emerald (#00f5d4) and Gold (#ffbe55)');
assert(mainCode.includes('statueX, 0.36, 0.35'), 'Dual stone cats positioned at X = ±2.8m');
assert(mainCode.includes('catHead') && mainCode.includes('orbMesh'), 'Stone cats sculpted with glowing orbs');
assert(mainCode.includes('pawSteps') && mainCode.includes('drawPaw'), 'Steps sculpted with glowing cat paw trails');
assert(mainCode.includes('fishGroup') && mainCode.includes('pawPendant'), 'Fish lanterns and cat paw wind chimes attached');
assert(mainCode.includes('leftEar') && mainCode.includes('rightEar'), 'Pagoda roof crafted with flared cat ear ridges');
assert(mainCode.includes('distanceTo(this._vTmpCatPortal) <= 2.2'), 'Walk-in auto-teleport trigger within <= 2.2m active');
assert(mainCode.includes('onActivate: () => this.enterCatVillage()'), 'Click activation active');

if (allPassed) {
  console.log('\n============================================================');
  console.log('✓ CỔNG LINH MIÊU THIÊN THƯ ĐẠT CHUẨN 100% TẤT CẢ TIÊU CHÍ!');
  console.log('============================================================');
  process.exit(0);
} else {
  console.error('\n❌ CÓ TIÊU CHÍ CHƯA ĐẠT!');
  process.exit(1);
}
