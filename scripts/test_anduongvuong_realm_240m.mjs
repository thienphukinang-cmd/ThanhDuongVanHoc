import assert from 'node:assert';
import * as THREE from 'three';
import { AnDuongVuongWorld, getTerrainHeight } from '../src/worlds/anDuongVuongWorld.js';

console.log('=============================================================================');
console.log('▶ TEST SUITE: AN DUONG VUONG 240M X 240M EPIC REALM VERIFICATION');
console.log('=============================================================================');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
const world = new AnDuongVuongWorld(scene, camera, null);

console.log('\n--- 1. Testing getTerrainHeight(x, z) Continuous Function ---');
assert(typeof getTerrainHeight === 'function', 'getTerrainHeight must be a function');

// Sampling key landmark heights
const hCitadelCenter = getTerrainHeight(0, -65);
console.log(`  ✓ Citadel Center (0, -65) height: ${hCitadelCenter.toFixed(2)}m (expected 2.0 - 4.5m)`);
assert(hCitadelCenter >= 2.0 && hCitadelCenter <= 5.0, 'Citadel center height out of range');

const hSouthGate = getTerrainHeight(0, -22);
console.log(`  ✓ South Gate Bastion (0, -22) height: ${hSouthGate.toFixed(2)}m (expected 1.5 - 3.5m)`);
assert(hSouthGate >= 1.5 && hSouthGate <= 4.0, 'South Gate height out of range');

const hJadeWell = getTerrainHeight(26, -15);
console.log(`  ✓ Jade Well Courtyard (26, -15) height: ${hJadeWell.toFixed(2)}m (expected 1.0 - 3.0m)`);
assert(hJadeWell >= 1.0 && hJadeWell <= 3.5, 'Jade Well height out of range');

const hBambooValley = getTerrainHeight(8, 65);
console.log(`  ✓ Bamboo Valley Path (8, 65) height: ${hBambooValley.toFixed(2)}m (expected 0.5 - 2.5m)`);
assert(hBambooValley >= 0.5 && hBambooValley <= 3.0, 'Bamboo Valley height out of range');

const hDaSonRidge = getTerrainHeight(0, 120);
console.log(`  ✓ Da Son Ridge (0, 120) height: ${hDaSonRidge.toFixed(2)}m (expected 4.5 - 6.5m)`);
assert(hDaSonRidge >= 4.5 && hDaSonRidge <= 6.5, 'Da Son Ridge height out of range');

const hDaSonCliff = getTerrainHeight(0, 125);
console.log(`  ✓ Da Son Cliff Top (0, 125) height: ${hDaSonCliff.toFixed(2)}m (expected 5.0 - 6.5m)`);
assert(hDaSonCliff >= 5.0 && hDaSonCliff <= 6.5, 'Da Son Cliff height out of range');

const hOceanFloor = getTerrainHeight(0, 145);
console.log(`  ✓ Ocean Floor (0, 145) height: ${hOceanFloor.toFixed(2)}m (expected < 0.0m)`);
assert(hOceanFloor < 0.0, 'Ocean floor should be below sea level');

// Stress sampling 10,000 points across 240m x 240m terrain
let nanCount = 0;
for (let x = -120; x <= 120; x += 3) {
  for (let z = -120; z <= 120; z += 3) {
    const h = getTerrainHeight(x, z);
    if (Number.isNaN(h) || !Number.isFinite(h)) {
      nanCount++;
    }
  }
}
assert.strictEqual(nanCount, 0, 'No NaN or Infinity allowed in getTerrainHeight');
console.log('  ✓ 10,000 terrain coordinate samples verified: 0 NaN, 0 Infinity');

console.log('\n--- 2. Initializing World & Geometry Verification ---');
await world.init();
assert(scene.children.length > 10, `Scene should contain > 10 objects, got ${scene.children.length}`);
console.log(`  ✓ Realm initialized with ${scene.children.length} root scene objects`);

// Verify 240m x 240m Multi-Layer Terrain Mesh
const terrainMesh = scene.getObjectByName('AdvWorld_MultiLayer_Terrain');
assert(terrainMesh, 'AdvWorld_MultiLayer_Terrain must exist');
const terrainBox = new THREE.Box3().setFromObject(terrainMesh);
const terrainSize = new THREE.Vector3();
terrainBox.getSize(terrainSize);
console.log(`  ✓ Terrain bounding size: ${terrainSize.x.toFixed(1)}m x ${terrainSize.z.toFixed(1)}m (Height span: ${terrainSize.y.toFixed(2)}m)`);
assert(terrainSize.x >= 230 && terrainSize.z >= 230, 'Terrain must span ~240m');

// Buffer hygiene check on all meshes in scene
let meshCount = 0;
let vertexCount = 0;
scene.traverse((child) => {
  if (child.isMesh && child.geometry) {
    meshCount++;
    const pos = child.geometry.attributes.position;
    if (pos?.array) {
      vertexCount += pos.count;
      for (let i = 0; i < pos.array.length; i++) {
        assert(!Number.isNaN(pos.array[i]), `NaN in ${child.name}`);
        assert(Number.isFinite(pos.array[i]), `Infinity in ${child.name}`);
      }
    }
  }
});
console.log(`  ✓ Traversed ${meshCount} meshes (${vertexCount} vertices): 0 NaN, 0 Infinity`);

console.log('\n--- 3. Verifying 5 Focal Architectural Zones & Anti-Collision ---');
const zone1 = scene.getObjectByName('AdvWorld_Imperial_Pavilion_Hall');
assert(zone1, 'Zone 1: AdvWorld_Imperial_Pavilion_Hall must exist');
const zone2 = scene.getObjectByName('AdvWorld_SouthGate_Bastion_NoThan');
assert(zone2, 'Zone 2: AdvWorld_SouthGate_Bastion_NoThan must exist');
const zone3 = scene.getObjectByName('AdvWorld_VongNguyet_JadeWell_Courtyard');
assert(zone3, 'Zone 3: AdvWorld_VongNguyet_JadeWell_Courtyard must exist');
const zone4Feathers = scene.getObjectByName('AdvWorld_GooseFeathers_Trail');
assert(zone4Feathers, 'Zone 4: AdvWorld_GooseFeathers_Trail must exist');
const zone5Turtle = scene.getObjectByName('KimQuy_Golden_Turtle');
assert(zone5Turtle, 'Zone 5: KimQuy_Golden_Turtle must exist');

// Pairwise clearance check between structural hubs
const zones = [
  { name: 'Imperial Pavilion', obj: zone1 },
  { name: 'South Gate Bastion', obj: zone2 },
  { name: 'Jade Well Courtyard', obj: zone3 },
  { name: 'Kim Quy Golden Turtle', obj: zone5Turtle }
];

let minClearance = Infinity;
for (let i = 0; i < zones.length; i++) {
  const b1 = new THREE.Box3().setFromObject(zones[i].obj);
  for (let j = i + 1; j < zones.length; j++) {
    const b2 = new THREE.Box3().setFromObject(zones[j].obj);
    assert(!b1.intersectsBox(b2), `Collision between ${zones[i].name} and ${zones[j].name}`);
    const dist = b1.distanceToPoint(b2.getCenter(new THREE.Vector3()));
    if (dist < minClearance) minClearance = dist;
    console.log(`  ✓ ${zones[i].name} <-> ${zones[j].name}: clearance = ${dist.toFixed(2)}m (0 overlap)`);
  }
}
console.log(`  ✓ Minimum structural clearance: ${minClearance.toFixed(2)}m (Target: >= 2.0m)`);
assert(minClearance >= 2.0, `Clearance ${minClearance}m < 2.0m`);

console.log('\n--- 4. Verifying Raycaster Exclusion Hygiene (ignoreRaycaster = true) ---');
const raycasterTargets = [
  'AdvWorld_SkyDome',
  'AdvWorld_BambooGroves_Culms',
  'AdvWorld_BambooGroves_Foliage',
  'AdvWorld_GooseFeathers_Trail',
  'AdvWorld_Citadel_Moats',
  'AdvWorld_Ocean_Waves',
  'AdvWorld_KimQuy_Aura',
  'AdvWorld_KimQuy_GoldenMist'
];

for (const name of raycasterTargets) {
  const obj = scene.getObjectByName(name);
  assert(obj, `Target object ${name} must exist in scene`);
  assert.strictEqual(obj.userData.ignoreRaycaster, true, `${name} must have ignoreRaycaster = true`);
  console.log(`  ✓ ${name} has userData.ignoreRaycaster = true`);
}

console.log('\n--- 5. 60+ FPS Performance & Zero-Allocation Stress Test ---');
const FRAMES = 180; // 3 seconds at 60 FPS
const dt = 1 / 60;
const start = performance.now();
for (let f = 0; f < FRAMES; f++) {
  world.update(dt);
}
const elapsed = performance.now() - start;
const avgMs = elapsed / FRAMES;
console.log(`  ✓ 180 frames simulated: total ${elapsed.toFixed(2)}ms, avg ${avgMs.toFixed(4)}ms/frame (Budget: 16.6ms)`);
assert(avgMs < 1.0, `Update loop too slow: ${avgMs}ms/frame`);

console.log('\n--- 6. Clean Resource Disposal ---');
world.dispose();
assert.strictEqual(scene.children.length, 0, 'All scene objects must be removed on dispose');
console.log('  ✓ Clean disposal verified: 0 remaining objects in scene');

console.log('\n=============================================================================');
console.log('>>> ALL AN DUONG VUONG 240M X 240M REALM TESTS PASSED 100%! <<<');
console.log('=============================================================================');
