import * as THREE from 'three';
import assert from 'node:assert';
import { execSync } from 'node:child_process';

console.log('=== VERIFYING HITBOX ARCHITECT OVERHAUL (3 LAYERS) ===\n');

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
// 1. Room Raycast Proxies & Colliders
// -------------------------------------------------------------
console.log('1. Checking Room Hitbox Overhaul:');
const roomMod = await import('../src/modules/anDuongVuongRoomDecorator.js');
const mockScene = new THREE.Scene();
const mockCamera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
const colliders = [];

const exhibition = roomMod.buildAnDuongVuongExhibition({
  roomCenter: new THREE.Vector3(0, 0, -48),
  scene: mockScene,
  camera: mockCamera,
  colliders: colliders
});
const roomGroup = exhibition.roomGroup || exhibition;

const expectedRoomProxies = [
  'ADV_Hitbox_Statue_Pedestal',
  'ADV_Hitbox_Spiral_Citadel',
  'ADV_Hitbox_Magic_Crossbow',
  'ADV_Hitbox_Jade_Well',
  'ADV_Hitbox_Info_Plaque',
  'ADV_Portal_ClickProxy'
];

const foundRoomProxies = new Map();
roomGroup.traverse((obj) => {
  if (expectedRoomProxies.includes(obj.name) || obj.userData?.hitboxId || obj.userData?.isClickProxy) {
    foundRoomProxies.set(obj.name, obj);
  }
});

for (const proxyName of expectedRoomProxies) {
  const proxy = foundRoomProxies.get(proxyName) || roomGroup.getObjectByName(proxyName);
  const exists = proxy !== null && proxy !== undefined;
  check(`Room Proxy ${proxyName} exists`, exists, exists ? `hitboxId: ${proxy.userData?.hitboxId || proxy.userData?.action}` : 'NOT FOUND');
  if (exists && proxy.material) {
    check(`  ${proxyName} material is transparent (opacity 0, depthWrite false)`, 
      proxy.material.transparent === true && proxy.material.opacity === 0 && proxy.material.depthWrite === false);
  }
}

// Check Portal opening unobstructed in center
const portalCenterBlockers = colliders.filter((c) => {
  const box = c.box || (c.isBox3 ? c : (c.geometry?.boundingBox ? new THREE.Box3().setFromObject(c) : null));
  if (!box) return false;
  // Portal area: around Z = -36 to -33, X between -1.0 and 1.0
  if (box.min.z < -34 && box.max.z > -36) {
    if (box.min.x < 1.0 && box.max.x > -1.0) {
      return true;
    }
  }
  return false;
});
check('Portal archway opening has NO center blocking colliders', portalCenterBlockers.length === 0, `${portalCenterBlockers.length} center blockers found`);

// Check Central Corridor (|X| <= 2.3m)
const corridorBlockers = colliders.filter((c) => {
  const box = c.box || (c.isBox3 ? c : (c.geometry?.boundingBox ? new THREE.Box3().setFromObject(c) : null));
  if (!box) return false;
  // Entrance corridor Z from -34 down to -44
  if (box.min.z < -34 && box.max.z > -44) {
    if (box.min.x < 2.0 && box.max.x > -2.0) {
      return true;
    }
  }
  return false;
});
check('Central walking corridor (|X| <= 2.3m) 100% open', corridorBlockers.length === 0, `${corridorBlockers.length} corridor blockers`);

// -------------------------------------------------------------
// 2. Realm Raycast Proxies & Abyss Safety Barriers
// -------------------------------------------------------------
console.log('\n2. Checking Realm Hitbox Overhaul:');
const worldMod = await import('../src/worlds/anDuongVuongWorld.js');
const realmScene = new THREE.Scene();
const realmCamera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
const world = new worldMod.AnDuongVuongWorld(realmScene, realmCamera, null);
await world.init();

const expectedRealmProxies = [
  'AdvWorld_Return_Portal_ClickProxy',
  'AdvWorld_Hitbox_VongLau_NoThan',
  'AdvWorld_Hitbox_GiengNgoc',
  'AdvWorld_Hitbox_GooseFeather_Path',
  'AdvWorld_Hitbox_Statue_Cliff',
  'AdvWorld_Hitbox_KimQuy_Ocean'
];

for (const proxyName of expectedRealmProxies) {
  let found = realmScene.getObjectByName(proxyName);
  if (!found) {
    realmScene.traverse((obj) => {
      if (!found && (obj.name === proxyName || obj.userData?.canonicalName === proxyName || obj.userData?.hitboxId === proxyName)) {
        found = obj;
      }
    });
  }
  const exists = found !== null && found !== undefined;
  check(`Realm Proxy ${proxyName} exists`, exists, exists ? `hitboxId: ${found.userData?.hitboxId || found.userData?.action}` : 'NOT FOUND');
}

// Check Abyss Safety Barriers along Da Son Cliff (Z >= 67.5) and Map Borders (X=±115, Z=±115)
let hasCliffBarrier = false;
let hasBorderBarrier = false;
const realmColliders = world.colliders || [];
for (const col of realmColliders) {
  const box = col.box || (col.isBox3 ? col : (col.geometry?.boundingBox ? new THREE.Box3().setFromObject(col) : null));
  if (box) {
    // Cliff edge barrier: around Z >= 67
    if (box.min.z >= 65 && (box.max.x - box.min.x > 30)) {
      hasCliffBarrier = true;
    }
    // Realm border barrier: |X| >= 110 or |Z| >= 110
    if (Math.abs(box.min.x) >= 110 || Math.abs(box.max.x) >= 110 || Math.abs(box.min.z) >= 110 || Math.abs(box.max.z) >= 110) {
      hasBorderBarrier = true;
    }
  }
}
check('Invisible safety barrier along Da Son cliff edge (prevent falling into ocean)', hasCliffBarrier);
check('Invisible safety perimeter boundaries along realm borders (prevent falling into void)', hasBorderBarrier);

// Check Raycaster exclusion on visual atmospheric effects
let unmaskedParticles = 0;
realmScene.traverse((obj) => {
  if (obj.isPoints || (obj.material?.transparent && (obj.name?.toLowerCase().includes('water') || obj.name?.toLowerCase().includes('foam') || obj.name?.toLowerCase().includes('mist') || obj.name?.toLowerCase().includes('aura')))) {
    if (!obj.userData?.ignoreRaycaster) {
      unmaskedParticles++;
    }
  }
});
check(`Atmospheric effects strictly masked from raycaster`, unmaskedParticles === 0, `${unmaskedParticles} unmasked objects`);

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log(`\n========================================`);
console.log(`HITBOX OVERHAUL SUMMARY: ${passedChecks}/${totalChecks} PASSED, ${failedChecks} FAILED`);
console.log(`========================================\n`);
if (failedChecks > 0) process.exit(1);
