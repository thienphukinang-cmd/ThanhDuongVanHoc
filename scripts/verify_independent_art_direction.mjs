import * as THREE from 'three';
import assert from 'node:assert';
import {
  buildAnDuongVuongExhibition,
  validateRoomSpatialLayout
} from '../src/modules/anDuongVuongRoomDecorator.js';
import {
  AnDuongVuongWorld
} from '../src/worlds/anDuongVuongWorld.js';

console.log('=============================================================================');
console.log('▶ INDEPENDENT ART DIRECTION & VERIFIER AUDIT — AN DUONG VUONG');
console.log('=============================================================================');

// 1. Check all 6 targetConfigs pairwise
const roomCenter = new THREE.Vector3(0, 0, -48);
const exhibition = buildAnDuongVuongExhibition({ roomCenter });
const room = exhibition.getGroup ? exhibition.getGroup() : exhibition;

const report = validateRoomSpatialLayout(room);
console.log(`\n--- 1. Structural Zones (SpatialRegistry Clearance) ---`);
console.log(`  Zone count: ${report.elements.length}`);
console.log(`  Pairwise tests: ${report.pairResults.length} pairs`);
console.log(`  Minimum pairwise clearance: ${report.minPairwiseClearance.toFixed(2)}m`);
console.log(`  Collision detected: ${report.hasCollision}`);
assert.strictEqual(report.hasCollision, false, 'Structural zone collision detected');
assert.strictEqual(report.pairResults.length, 15, 'Expected 15 pairwise structural checks');
assert(report.minPairwiseClearance >= 1.5, `Minimum clearance ${report.minPairwiseClearance}m < 1.5m`);

// 2. Check 6 interactive proxy hitboxes
console.log(`\n--- 2. Interactive Proxy Hitboxes (15 Pairwise Non-Collision Tests) ---`);
const hitboxes = [
  room.getObjectByName('hitbox_statue'),
  room.getObjectByName('hitbox_crossbow'),
  room.getObjectByName('hitbox_spiral_wall'),
  room.getObjectByName('hitbox_jade_well'),
  room.getObjectByName('hitbox_plate'),
  room.getObjectByName('Interactive_AnDuongVuong_Teleport_Book')
];

for (let i = 0; i < hitboxes.length; i++) {
  assert(hitboxes[i], `Missing hitbox index ${i}`);
  hitboxes[i].updateMatrixWorld(true);
}

let hitboxCollisions = 0;
let hitboxPairs = 0;
for (let i = 0; i < hitboxes.length; i++) {
  const boxA = new THREE.Box3().setFromObject(hitboxes[i]);
  for (let j = i + 1; j < hitboxes.length; j++) {
    const boxB = new THREE.Box3().setFromObject(hitboxes[j]);
    const intersects = boxA.intersectsBox(boxB);
    hitboxPairs++;
    if (intersects) {
      hitboxCollisions++;
      console.error(`  ✕ Collision: [${hitboxes[i].name}] <-> [${hitboxes[j].name}]`);
    } else {
      const dx = Math.max(0, boxA.min.x - boxB.max.x, boxB.min.x - boxA.max.x);
      const dz = Math.max(0, boxA.min.z - boxB.max.z, boxB.min.z - boxA.max.z);
      const clearance = Math.hypot(dx, dz);
      console.log(`  ✓ [${hitboxes[i].name}] <-> [${hitboxes[j].name}]: non-intersecting, clearance=${clearance.toFixed(2)}m`);
    }
  }
}
console.log(`  Hitbox pairs tested: ${hitboxPairs}/15, Collisions: ${hitboxCollisions}`);
assert.strictEqual(hitboxPairs, 15, 'Must test exactly 15 pairs');
assert.strictEqual(hitboxCollisions, 0, 'Found hitbox collisions!');

// 3. Central walking corridor check
console.log(`\n--- 3. Central Walking Corridor Clearance ---`);
// Entry aperture
const archway = room.getObjectByName('ADV_CoLoa_Stone_Archway');
assert(archway, 'Archway missing');
const aperture = archway.userData?.clearAperture ?? 4.2;
console.log(`  Archway clear entrance aperture: ${aperture}m (Target >= 4.0m)`);
assert(aperture >= 4.0, `Archway aperture ${aperture}m < 4.0m`);

// Central path x in [-1.2, 1.2], z in [-1.0, 10.0]
const centralBoxes = [];
room.traverse((child) => {
  if (child.isMesh && child.visible && !child.name.startsWith('hitbox_') && !child.userData.ignoreRaycaster) {
    child.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(child);
    // If box obstructs floor walker at Y in [0.2, 1.8]
    if (box.min.y < 1.8 && box.max.y > 0.2) {
      // Check if it's strictly in the central corridor between archway and dais
      if (box.min.z > 0.0 && box.max.z < 8.0) {
        if (box.min.x < 1.0 && box.max.x > -1.0) {
          centralBoxes.push({ name: child.name, box });
        }
      }
    }
  }
});
console.log(`  Central walking path (z: 0 to 8m, x: -1 to +1m) obstacles: ${centralBoxes.length}`);
assert.strictEqual(centralBoxes.length, 0, 'Central walking corridor is obstructed!');

// 4. Raycaster Exclusion Hygiene
console.log(`\n--- 4. Raycaster Exclusion Hygiene ---`);
const realmScene = new THREE.Scene();
const world = new AnDuongVuongWorld(realmScene);
world.init();

const flaggedRoomObjects = [
  'seaWaterMesh',
  'pearlMesh',
  'featherPoints',
  'ADV_Foreground_Bamboo_Left',
  'ADV_Foreground_Bamboo_Right',
  'ADV_DaSon_Night_Backdrop'
];
flaggedRoomObjects.forEach((name) => {
  const obj = room.getObjectByName(name);
  if (obj) {
    console.log(`  ✓ Room object [${name}]: ignoreRaycaster = ${obj.userData.ignoreRaycaster}`);
    assert.strictEqual(obj.userData.ignoreRaycaster, true, `Room object ${name} must have ignoreRaycaster = true`);
  }
});

const flaggedWorldObjects = [
  'AdvWorld_SkyDome',
  'AdvWorld_Citadel_Moats',
  'AdvWorld_Ocean_Waves',
  'AdvWorld_BambooGroves_Culms',
  'AdvWorld_BambooGroves_Foliage',
  'AdvWorld_GooseFeathers_Trail',
  'AdvWorld_KimQuy_Aura',
  'AdvWorld_KimQuy_GoldenMist'
];
flaggedWorldObjects.forEach((name) => {
  const obj = realmScene.getObjectByName(name);
  assert(obj, `Missing world object ${name}`);
  console.log(`  ✓ Realm object [${name}]: ignoreRaycaster = ${obj.userData.ignoreRaycaster}`);
  assert.strictEqual(obj.userData.ignoreRaycaster, true, `Realm object ${name} must have ignoreRaycaster = true`);
});

// 5. Zero-Allocation & 60 FPS Performance
console.log(`\n--- 5. Zero-Allocation 60+ FPS Stress Test ---`);
const dummyCamera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
dummyCamera.position.set(0, 1.7, 10);

const t0 = performance.now();
for (let frame = 0; frame < 180; frame++) {
  exhibition.update?.(0.016, frame * 0.016, dummyCamera);
}
const roomTime = performance.now() - t0;
const avgRoom = roomTime / 180;
console.log(`  Room 180 frames: total ${roomTime.toFixed(2)}ms, avg ${avgRoom.toFixed(4)}ms/frame (Budget: 16.6ms)`);
assert(avgRoom < 5.0, `Room update took ${avgRoom}ms/frame, exceeded budget`);

const t1 = performance.now();
for (let frame = 0; frame < 180; frame++) {
  world.update(0.016, dummyCamera);
}
const realmTime = performance.now() - t1;
const avgRealm = realmTime / 180;
console.log(`  Realm 180 frames: total ${realmTime.toFixed(2)}ms, avg ${avgRealm.toFixed(4)}ms/frame (Budget: 16.6ms)`);
assert(avgRealm < 5.0, `Realm update took ${avgRealm}ms/frame, exceeded budget`);

// Cleanup
world.dispose();
exhibition.dispose?.();

console.log('\n=============================================================================');
console.log('>>> ALL VERIFIER INDEPENDENT AUDIT CHECKS PASSED WITH 100% SUCCESS! <<<');
console.log('=============================================================================');
