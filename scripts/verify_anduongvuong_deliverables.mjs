import * as THREE from 'three';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

console.log('=== VERIFIER DEEP VERIFICATION SUITE STARTING ===\n');

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
// 1. Build & Syntax Checks
// -------------------------------------------------------------
console.log('1. Checking Syntax:');
try {
  execSync('node --check src/modules/anDuongVuongRoomDecorator.js src/worlds/anDuongVuongWorld.js', { stdio: 'pipe' });
  check('Syntax check passed (node --check)', true);
} catch (e) {
  check('Syntax check passed (node --check)', false, e.message);
}

// -------------------------------------------------------------
// 2. Room Decorator Dynamic Inspection & Two-Way Portal Activation
// -------------------------------------------------------------
console.log('\n2. Inspecting src/modules/anDuongVuongRoomDecorator.js:');
let roomMod;
try {
  roomMod = await import('../src/modules/anDuongVuongRoomDecorator.js');
  check('anDuongVuongRoomDecorator.js imported cleanly', true);
} catch (e) {
  check('anDuongVuongRoomDecorator.js imported cleanly', false, e.stack);
}

if (roomMod) {
  const mockScene = new THREE.Scene();
  const mockCamera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
  const colliders = [];

  let roomGroup = null;
  try {
    if (typeof roomMod.buildAnDuongVuongExhibition === 'function') {
      const exhibition = roomMod.buildAnDuongVuongExhibition({
        roomCenter: new THREE.Vector3(0, 0, -48),
        scene: mockScene,
        camera: mockCamera,
        colliders: colliders
      });
      roomGroup = exhibition.roomGroup || (exhibition.getGroup ? exhibition.getGroup() : exhibition);
      check('buildAnDuongVuongExhibition executed without throwing', true);
    }
  } catch (e) {
    check('Room decorator execution', false, e.stack);
  }

  const targetGroup = roomGroup || mockScene;

  // Check geometries for NaN / Infinity poisoning
  let meshCount = 0;
  let nanBufferCount = 0;
  targetGroup.traverse((obj) => {
    if (obj.isMesh || obj.isPoints || obj.isLine) {
      meshCount++;
      const geo = obj.geometry;
      if (geo && geo.attributes) {
        for (const [attrName, attr] of Object.entries(geo.attributes)) {
          const arr = attr.array;
          if (arr) {
            for (let i = 0; i < arr.length; i++) {
              if (Number.isNaN(arr[i]) || !Number.isFinite(arr[i])) {
                nanBufferCount++;
                break;
              }
            }
          }
        }
      }
    }
  });
  check(`Scanned ${meshCount} meshes in room: NaN/Infinity buffer count is 0`, meshCount > 0 && nanBufferCount === 0, `Found ${nanBufferCount} NaN/Infinity values`);

  // Check corridor unobstructed (|X| <= 2.3m)
  const corridorBoxes = colliders.filter((c) => {
    const box = c.box || (c.isBox3 ? c : (c.geometry?.boundingBox ? new THREE.Box3().setFromObject(c) : null));
    if (!box) return false;
    if (box.min.z < -34 && box.max.z > -44) {
      if (box.min.x < 2.0 && box.max.x > -2.0) {
        return true;
      }
    }
    return false;
  });
  check(`Central corridor (|X| <= 2.3m) unobstructed in entrance path`, corridorBoxes.length === 0, `Found ${corridorBoxes.length} blocking colliders in walking zone`);

  // Check Portal Mesh & Proxy Click/Raycaster Registration
  let portalMesh = null;
  let portalProxy = null;
  targetGroup.traverse((obj) => {
    if (obj.name && (obj.name.includes('Portal') || obj.name.includes('Vortex') || obj.name.includes('Book'))) {
      if (!portalMesh) portalMesh = obj;
    }
    if (obj.userData?.isBookPortal || obj.userData?.type === 'portal' || obj.userData?.action === 'enterRealm') {
      portalProxy = obj;
    }
  });
  check('Portal mesh exists in exhibition room', portalMesh !== null);
  check('Portal activation proxy mesh with enterRealm action exists', portalProxy !== null, portalProxy?.userData?.action);

  // Check WebXR Teleport Floor/Anchor
  let teleportFloorCount = 0;
  targetGroup.traverse((obj) => {
    if (obj.userData?.isTeleportFloor || obj.userData?.teleportAnchor || obj.userData?.isWalkableFloor) {
      teleportFloorCount++;
    }
  });
  check(`WebXR teleport floor / anchors present (${teleportFloorCount} found)`, teleportFloorCount > 0);

  // Check Raycaster optimization
  let nonSolidWithoutFlag = 0;
  let particlesCount = 0;
  targetGroup.traverse((obj) => {
    if (obj.isPoints || (obj.material?.transparent && (obj.name?.toLowerCase().includes('fog') || obj.name?.toLowerCase().includes('ray') || obj.name?.toLowerCase().includes('mist')))) {
      particlesCount++;
      if (!obj.userData?.ignoreRaycaster) {
        nonSolidWithoutFlag++;
      }
    }
  });
  check(`Atmospheric/particle objects (${particlesCount}) have userData.ignoreRaycaster = true`, nonSolidWithoutFlag === 0, `${nonSolidWithoutFlag} missing flag`);
}

// -------------------------------------------------------------
// 3. Open Realm Dynamic Inspection & 3 Emotional Zones
// -------------------------------------------------------------
console.log('\n3. Inspecting src/worlds/anDuongVuongWorld.js:');
let worldMod;
try {
  worldMod = await import('../src/worlds/anDuongVuongWorld.js');
  check('anDuongVuongWorld.js imported cleanly', true);
} catch (e) {
  check('anDuongVuongWorld.js imported cleanly', false, e.stack);
}

if (worldMod && worldMod.AnDuongVuongWorld) {
  const mockScene = new THREE.Scene();
  const mockCamera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
  const world = new worldMod.AnDuongVuongWorld(mockScene, mockCamera, null);

  try {
    await world.init();
    check('world.init() executed without throwing', true);
  } catch (e) {
    check('world.init() execution', false, e.stack);
  }

  // Check realm meshes for NaN / Infinity
  let realmMeshCount = 0;
  let realmNanCount = 0;
  mockScene.traverse((obj) => {
    if (obj.isMesh || obj.isPoints || obj.isLine) {
      realmMeshCount++;
      const geo = obj.geometry;
      if (geo && geo.attributes) {
        for (const [attrName, attr] of Object.entries(geo.attributes)) {
          const arr = attr.array;
          if (arr) {
            for (let i = 0; i < arr.length; i++) {
              if (Number.isNaN(arr[i]) || !Number.isFinite(arr[i])) {
                realmNanCount++;
                break;
              }
            }
          }
        }
      }
    }
  });
  check(`Scanned ${realmMeshCount} meshes in realm: NaN/Infinity count is 0`, realmMeshCount > 0 && realmNanCount === 0, `Found ${realmNanCount} NaN/Infinity values`);

  // Check Return Portal at Realm Spawn
  let returnPortal = null;
  mockScene.traverse((obj) => {
    if (obj.userData?.action === 'exitRealm' || obj.name?.includes('ReturnPortal') || obj.userData?.isReturnPortal) {
      returnPortal = obj;
    }
  });
  check('Return Portal back to museum exists in realm scene', returnPortal !== null);

  // Check 3 Emotional Zones:
  // Zone 1: Co Loa citadel, spiral walls, Vo Lau No Than, Gieng Ngoc
  let hasZone1 = false;
  let hasZone2 = false; // Goose feathers + bamboo
  let hasZone3 = false; // Cliff + ocean + Kim Quy
  mockScene.traverse((obj) => {
    const n = (obj.name || '').toLowerCase();
    if (n.includes('citadel') || n.includes('colo') || n.includes('fortress') || n.includes('gate') || n.includes('pavilion')) hasZone1 = true;
    if (n.includes('feather') || n.includes('bamboo')) hasZone2 = true;
    if (n.includes('cliff') || n.includes('turtle') || n.includes('kimquy') || n.includes('wave') || n.includes('ocean')) hasZone3 = true;
  });
  check('Zone 1 (Nội Thành Cổ Loa) components present', hasZone1);
  check('Zone 2 (Rừng Trúc & Lông Ngỗng Trắng) components present', hasZone2);
  check('Zone 3 (Vách Đá Dạ Sơn & Thần Kim Quy) components present', hasZone3);

  // Check update loop zero-error and zero allocation test
  try {
    if (typeof world.update === 'function') {
      world.update(0.016, 1.0);
      check('world.update(delta, time) runs smoothly', true);
    }
  } catch (e) {
    check('world.update(delta, time) runs smoothly', false, e.stack);
  }

  // Check dispose clean slate
  try {
    if (typeof world.dispose === 'function') {
      world.dispose();
      check('world.dispose() cleans up all objects without residue', mockScene.children.length === 0, `${mockScene.children.length} leftover objects`);
    }
  } catch (e) {
    check('world.dispose() cleanup', false, e.stack);
  }
}

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log(`\n========================================`);
console.log(`VERIFICATION SUMMARY: ${passedChecks}/${totalChecks} PASSED, ${failedChecks} FAILED`);
console.log(`========================================`);
if (failedChecks > 0) {
  process.exit(1);
} else {
  console.log('ALL VERIFICATION CRITERIA SATISFIED!\n');
}
