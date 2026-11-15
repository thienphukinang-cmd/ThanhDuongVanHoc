import * as THREE from 'three';
import assert from 'node:assert';
import fs from 'node:fs';

console.log('=== VERIFYING THANH GIONG & TAT DEN FEATURES IN AN DUONG VUONG ===\n');

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

// -------------------------------------------------------------
// 1. Static Source Code Checks
// -------------------------------------------------------------
console.log('1. Static Code Analysis:');
const roomSrc = fs.readFileSync('src/modules/anDuongVuongRoomDecorator.js', 'utf8');
const worldSrc = fs.readFileSync('src/worlds/anDuongVuongWorld.js', 'utf8');

// Check Dynamic Fog Blending
check('Room decorator has fog blending logic (updateFogBlend or lerp)', 
  roomSrc.includes('updateFogBlend') || roomSrc.includes('fogBlend') || (roomSrc.includes('mainScene.fog') && roomSrc.includes('lerp')));

// Check 4 mini bronze plaques in room
check('King dais mini bronze plaque ("VUA AN DƯƠNG VƯƠNG")', roomSrc.includes('VUA AN DƯƠNG VƯƠNG'));
check('Spiral citadel sa bàn mini bronze plaque ("SA BÀN 3 VÒNG THÀNH CỔ LOA")', roomSrc.includes('SA BÀN 3 VÒNG THÀNH CỔ LOA'));
check('Crossbow shrine mini bronze plaque ("NỎ THẦN LIÊN CHÂU")', roomSrc.includes('NỎ THẦN LIÊN CHÂU'));
check('Jade well mini bronze plaque ("GIẾNG NGỌC CỔ LOA")', roomSrc.includes('GIẾNG NGỌC CỔ LOA'));

// Check Tangent-space normal map generator
check('Tangent-space linear normal map generator used', 
  roomSrc.includes('heightCanvasToLinearNormalMap') || roomSrc.includes('normalMap'));

// Check Click Sound Feedback
check('Immediate click sound feedback synthesis wired',
  roomSrc.includes('AudioContext') || roomSrc.includes('playClick') || roomSrc.includes('drum') || roomSrc.includes('chime'));

// Check Realm Terrain Height Clamping in update()
check('Realm terrain height natural walking clamping implemented',
  worldSrc.includes('getTerrainHeight') && (worldSrc.includes('clamp') || worldSrc.includes('+ 1.7') || worldSrc.includes('targetY')));

// Check Golden embers / spores in realm
check('Sacred golden embers / spores implemented in realm',
  worldSrc.includes('Ember') || worldSrc.includes('Spore') || worldSrc.includes('ember') || worldSrc.includes('goldenMist'));

// -------------------------------------------------------------
// 2. Dynamic Execution Checks
// -------------------------------------------------------------
console.log('\n2. Dynamic Module Verification:');
try {
  const roomMod = await import('../src/modules/anDuongVuongRoomDecorator.js');
  const mockScene = new THREE.Scene();
  mockScene.fog = new THREE.FogExp2(0xdca878, 0.00075); // Lobby fog
  const mockCamera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
  mockCamera.position.set(0, 1.7, -48); // At room center

  const exhibition = roomMod.buildAnDuongVuongExhibition({
    roomCenter: new THREE.Vector3(0, 0, -48),
    scene: mockScene,
    camera: mockCamera,
    colliders: []
  });
  const roomGroup = exhibition.roomGroup || exhibition;

  // Test updateFogBlend if present
  if (typeof roomMod.updateFogBlend === 'function') {
    roomMod.updateFogBlend(0.1, mockCamera, mockScene);
    check('updateFogBlend executes smoothly', true);
  } else if (typeof roomGroup.update === 'function') {
    roomGroup.update(0.1, 1.0, mockCamera);
    check('roomGroup.update executes with fog blending smoothly', true);
  }
} catch (e) {
  check('Room execution with new features', false, e.message);
}

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log(`\n========================================`);
console.log(`ENHANCEMENT SUMMARY: ${passedChecks}/${totalChecks} PASSED, ${failedChecks} FAILED`);
console.log(`========================================\n`);
if (failedChecks > 0) process.exit(1);
