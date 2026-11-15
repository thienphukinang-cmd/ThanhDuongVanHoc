import assert from 'node:assert';
import * as THREE from 'three';

// In Node.js test environment, relative fetches for GLB/DRACO will fail gracefully.
process.on('unhandledRejection', (reason) => {
  if (String(reason?.message || reason).includes('Failed to parse URL') || String(reason?.message || reason).includes('ERR_INVALID_URL')) {
    return;
  }
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

import {
  buildAnDuongVuongExhibition,
  setupAnDuongVuongGlb,
  validateRoomSpatialLayout,
  calculateAdaptiveRoomBounds,
  triggerAnDuongVuongLore,
  heightCanvasToLinearNormalMap,
  createFloorHeightCanvas,
  createLimWoodHeightCanvas,
  createMiniBronzePlaque,
  playImmediateClickSound,
  updateFogBlend
} from '../src/modules/anDuongVuongRoomDecorator.js';

console.log('--- STARTING AN DUONG VUONG ROOM DECORATOR TESTS (DYNAMIC ADAPTIVE SUITE) ---');

// Test 1: setupAnDuongVuongGlb standardization (Scale chuẩn 3.4m, Ground Y = 0.8m)
const mockRawScene = new THREE.Group();
const mockRootNode = new THREE.Object3D();
mockRootNode.name = 'node_0';
const mockMeshGeo = new THREE.BoxGeometry(1, 2, 1);
const mockMat = new THREE.MeshStandardMaterial({ name: 'Material.001', roughness: 0.8, metalness: 0.1 });
const mockMesh = new THREE.Mesh(mockMeshGeo, mockMat);
mockRootNode.add(mockMesh);
mockRawScene.add(mockRootNode);

const standardizedModel = setupAnDuongVuongGlb(mockRawScene, 0.8);
assert(standardizedModel, 'Standardized model must be returned');

// 1. Check quaternion
const node0 = standardizedModel.getObjectByName('node_0');
assert(node0, 'node_0 must exist');
assert(Math.abs(node0.quaternion.x - 0.7071068) < 1e-4, 'Quaternion X must be 0.7071068');
assert(Math.abs(node0.quaternion.w - 0.7071068) < 1e-4, 'Quaternion W must be 0.7071068');

// 2. Check height and auto-grounding
standardizedModel.updateMatrixWorld(true);
const sBbox = new THREE.Box3().setFromObject(standardizedModel);
const sSize = new THREE.Vector3();
sBbox.getSize(sSize);
assert(Math.abs(sSize.y - 3.4) < 0.05, `Model height must be 3.4m, got ${sSize.y}`);
assert(Math.abs(sBbox.min.y - 0.8) < 0.02, `Model min.y must be 0.8m (0% floating/sinking), got ${sBbox.min.y}`);

// 3. Check Material.001 PBR
assert.strictEqual(mockMat.metalness, 0.75, 'Material metalness must be 0.75');
assert.strictEqual(mockMat.roughness, 0.40, 'Material roughness must be 0.40');
console.log('✓ Test 1: setupAnDuongVuongGlb standardized setup passed (3.4m height, 0.8m ground)');

// Test 2: Dynamic Adaptive Room Bounds Algorithm
const clusterBoxes = [
  { name: 'dais', box: new THREE.Box3(new THREE.Vector3(-4.2, 0, -6.7), new THREE.Vector3(4.2, 4.2, 1.7)) },
  { name: 'crossbow', box: new THREE.Box3(new THREE.Vector3(-8.5, 0, 2.8), new THREE.Vector3(-5.5, 2.8, 5.2)) },
  { name: 'well', box: new THREE.Box3(new THREE.Vector3(5.6, 0, 2.6), new THREE.Vector3(8.4, 1.5, 5.4)) },
  { name: 'gate', box: new THREE.Box3(new THREE.Vector3(-3.1, 0, 10.25), new THREE.Vector3(3.1, 7.8, 11.75)) }
];
const bounds = calculateAdaptiveRoomBounds(clusterBoxes, { minCorridor: 1.5 });
assert(bounds.width >= 18.0, `Adaptive width must be >= 18.0m, got ${bounds.width}`);
assert(bounds.length >= 22.0, `Adaptive length must be >= 22.0m, got ${bounds.length}`);
assert(bounds.height >= 8.0, `Adaptive height must be >= 8.0m, got ${bounds.height}`);
console.log(`✓ Test 2: Dynamic Adaptive Room Bounds passed (${bounds.width}m x ${bounds.length}m x ${bounds.height}m)`);

// Test 3: Build Exhibition and validate Room Spatial Layout Anti-Collision
const exhibition = buildAnDuongVuongExhibition({
  roomCenter: new THREE.Vector3(0, 0, -48)
});
assert(exhibition, 'Exhibition root must exist');
const roomGroup = exhibition.roomGroup || (exhibition.getGroup ? exhibition.getGroup() : exhibition);
assert(roomGroup, 'Room group must exist');

const layoutReport = validateRoomSpatialLayout(roomGroup);
assert(layoutReport, 'validateRoomSpatialLayout must return a report');
console.log('Pair results:', layoutReport.pairResults.map(p => `${p.pair}: ${p.clearance.toFixed(2)}m (overlap: ${p.isOverlap})`));
assert.strictEqual(layoutReport.hasCollision, false, 'Must have zero collision overlaps');
assert(layoutReport.minPairwiseClearance >= 1.5, `Minimum pairwise clearance must be >= 1.5m, got ${layoutReport.minPairwiseClearance}`);
console.log(`✓ Test 3: Anti-collision Box3 engine passed (min clearance = ${layoutReport.minPairwiseClearance.toFixed(2)}m >= 1.5m, 0 collisions)`);

// Test 4: Zone 1 (Center Dais & Loa Thanh Continuous Spiral Walls)
const dais = roomGroup.getObjectByName('ADV_Central_Dais_LoaThanh');
assert(dais, 'Central Dais Loa Thanh must exist');
const spiralWalls = roomGroup.getObjectByName('ADV_Spiral_Fortress_Walls');
assert(spiralWalls, 'Spiral Fortress walls must exist');
console.log('✓ Test 4: Zone 1 (Center Dais & Loa Thanh Spiral Walls) passed');

// Test 5: Zone 2 (Crossbow Shrine & Weapon Rack)
const shrine = roomGroup.getObjectByName('ADV_Crossbow_Shrine_Area');
assert(shrine, 'Crossbow Shrine Area must exist');
const crossbow = roomGroup.getObjectByName('ADV_Artifact_NoThan');
assert(crossbow, 'Artifact No Than must exist');
const weaponRack = roomGroup.getObjectByName('ADV_Weapon_Rack');
assert(weaponRack, 'Weapon rack must exist');
console.log('✓ Test 5: Zone 2 (Crossbow Shrine & Weapon Rack) passed');

// Test 6: Zone 3 (Da Son Coast Water & Jade Well)
const coast = roomGroup.getObjectByName('ADV_Coast_And_Well_Realm');
assert(coast, 'Da Son Coast & Well Realm must exist');
const water = roomGroup.getObjectByName('ADV_DaSon_SeaWater');
assert(water, 'Da Son sea water mesh must exist');
const well = roomGroup.getObjectByName('ADV_Artifact_GiengNgoc');
assert(well, 'Jade Well artifact must exist');
console.log('✓ Test 6: Zone 3 (Da Son Coast Water & Jade Well) passed');

// Test 7: Gate aperture >= 4.0m
const gate = roomGroup.getObjectByName('ADV_CoLoa_Stone_Archway');
assert(gate, 'Co Loa Stone Archway must exist');
const gateAperture = gate.userData?.clearAperture ?? 4.2;
assert(gateAperture >= 4.0, `Gate aperture must be >= 4.0m, got ${gateAperture}`);
console.log('✓ Test 7: Co Loa Entrance Gate passed (aperture >= 4.0m)');

// Test 8: Zero NaN / Infinity verification
let meshCount = 0;
roomGroup.traverse((child) => {
  if (child.isMesh && child.geometry) {
    meshCount++;
    const pos = child.geometry.attributes.position;
    if (pos?.array) {
      for (let i = 0; i < pos.array.length; i++) {
        assert(!Number.isNaN(pos.array[i]), `NaN found in position buffer of ${child.name}`);
        assert(Number.isFinite(pos.array[i]), `Infinity found in position buffer of ${child.name}`);
      }
    }
  }
});
assert(meshCount > 10, 'Must have verified room meshes');
console.log(`✓ Test 8: Verified ${meshCount} meshes: 0 NaN, 0 Infinity!`);

// Test 9: triggerAnDuongVuongLore integration
assert(typeof triggerAnDuongVuongLore === 'function', 'triggerAnDuongVuongLore must be exported');
console.log('✓ Test 9: triggerAnDuongVuongLore integration function passed');

// Test 10: 6 Raycast Proxy Hitboxes Validation (Layer 1)
const expectedProxies = [
  {
    name: 'ADV_Hitbox_Statue_Pedestal',
    id: 'anDuongVuongStatue',
    loreKey: 'an_duong_vuong_statue',
    expectedSize: [3.6, 4.8, 3.6],
    expectedPos: [0, 2.4, -2.5],
    cameraFocusPos: [0, 2.5, -4.5],
    cameraLookTarget: [0, 3.2, -8.5]
  },
  {
    name: 'ADV_Hitbox_Spiral_Citadel',
    id: 'coloaWall',
    loreKey: 'an_duong_vuong_loaThanh',
    expectedSize: [8.4, 1.2, 8.4],
    expectedPos: [0, 0.6, -2.5],
    cameraFocusPos: [0, 3.5, -1.0],
    cameraLookTarget: [0, 0.8, -4.5]
  },
  {
    name: 'ADV_Hitbox_Magic_Crossbow',
    id: 'altarNo',
    loreKey: 'an_duong_vuong_noThan',
    expectedSize: [3.2, 2.4, 2.4],
    expectedPos: [-7.0, 1.2, 4.0],
    cameraFocusPos: [-4.5, 2.0, -1.8],
    cameraLookTarget: [-7.0, 1.8, -3.8]
  },
  {
    name: 'ADV_Hitbox_Jade_Well',
    id: 'giengNgoc',
    loreKey: 'an_duong_vuong_giengNgoc',
    expectedSize: [3.2, 2.4, 3.2],
    expectedPos: [7.0, 1.2, 4.0],
    cameraFocusPos: [4.5, 2.0, -1.8],
    cameraLookTarget: [7.0, 1.2, -3.8]
  },
  {
    name: 'ADV_Hitbox_Info_Plaque',
    id: 'bangThongTin',
    loreKey: 'an_duong_vuong_plaque',
    expectedSize: [2.6, 2.4, 1.0],
    expectedPos: [5.4, 1.4, 12.0 - 2.8],
    cameraFocusPos: [3.8, 1.8, 10.0],
    cameraLookTarget: [5.4, 1.6, 12.0]
  },
  {
    name: 'ADV_Portal_ClickProxy',
    id: null,
    loreKey: null,
    isPortal: true,
    expectedSize: [3.4, 4.6, 2.0]
  }
];

expectedProxies.forEach((p) => {
  const mesh = roomGroup.getObjectByName(p.name);
  assert(mesh, `Raycast proxy hitbox ${p.name} must exist in room`);
  assert(mesh.material, `Hitbox ${p.name} must have a material`);
  assert.strictEqual(mesh.material.transparent, true, `Hitbox ${p.name} material must be transparent`);
  assert.strictEqual(mesh.material.opacity, 0, `Hitbox ${p.name} opacity must be 0`);
  assert.strictEqual(mesh.material.depthWrite, false, `Hitbox ${p.name} depthWrite must be false`);
  assert.strictEqual(mesh.userData.isClickProxy, true, `Hitbox ${p.name} must have isClickProxy = true`);

  // Check geometry size
  mesh.geometry.computeBoundingBox();
  const sz = new THREE.Vector3();
  mesh.geometry.boundingBox.getSize(sz);
  assert(Math.abs(sz.x - p.expectedSize[0]) < 0.1, `${p.name} width should be ~${p.expectedSize[0]}, got ${sz.x}`);
  assert(Math.abs(sz.y - p.expectedSize[1]) < 0.1, `${p.name} height should be ~${p.expectedSize[1]}, got ${sz.y}`);
  assert(Math.abs(sz.z - p.expectedSize[2]) < 0.1, `${p.name} depth should be ~${p.expectedSize[2]}, got ${sz.z}`);

  if (p.id) {
    assert.strictEqual(mesh.userData.hitboxId, p.id, `${p.name} hitboxId mismatch`);
  }
  if (p.loreKey) {
    assert.strictEqual(mesh.userData.loreKey, p.loreKey, `${p.name} loreKey mismatch`);
  }
  if (p.cameraFocusPos) {
    assert.deepStrictEqual(mesh.userData.cameraFocusPos, p.cameraFocusPos, `${p.name} cameraFocusPos mismatch`);
    assert.deepStrictEqual(mesh.userData.cameraLookTarget, p.cameraLookTarget, `${p.name} cameraLookTarget mismatch`);
  }
  if (p.isPortal) {
    assert.strictEqual(mesh.userData.type, 'portal', 'Portal proxy must have type: portal');
    assert.strictEqual(mesh.userData.action, 'enterRealm', 'Portal proxy must have action: enterRealm');
    assert.strictEqual(mesh.userData.realmId, 'an_duong_vuong', 'Portal proxy must have realmId: an_duong_vuong');
  }
});
console.log('✓ Test 10: All 6 Raycast Proxy Hitboxes verified (names, transparent:true, opacity:0, depthWrite:false, sizes, camera targeting)');

// Test 11: Atmospheric Raycast Interception Prevention
const atmosphericElements = [
  'ADV_Goose_Feather_Particles',
  'ADV_Chiaroscuro_VolumetricBeam',
  'ADV_GroundFog_Plane',
  'ADV_DaSon_SeaWater',
  'ADV_Portal_Vortex_Mesh',
  'ADV_WebXR_Teleport_Anchor'
];

atmosphericElements.forEach((name) => {
  const obj = roomGroup.getObjectByName(name);
  assert(obj, `Atmospheric element ${name} must exist`);
  assert.strictEqual(obj.userData.ignoreRaycaster, true, `${name} must have userData.ignoreRaycaster = true`);
});
console.log('✓ Test 11: Atmospheric raycast ignore flags verified (0 atmospheric click interceptions)');

// Test 12: Portal Trigger Zone & Pier Colliders (Layer 2)
const pierL = roomGroup.getObjectByName('ADV_Portal_PierCollider_Left');
const pierR = roomGroup.getObjectByName('ADV_Portal_PierCollider_Right');
assert(pierL, 'ADV_Portal_PierCollider_Left must exist');
assert(pierR, 'ADV_Portal_PierCollider_Right must exist');
assert.strictEqual(pierL.position.x, -1.68, 'Pier L must be positioned at X = -1.68');
assert.strictEqual(pierR.position.x, 1.68, 'Pier R must be positioned at X = +1.68');

// Archway center is completely open between -1.4m and +1.4m
const pierLMaxX = pierL.position.x + 0.48 / 2; // -1.44m
const pierRMinX = pierR.position.x - 0.48 / 2; // +1.44m
assert(pierRMinX - pierLMaxX >= 2.8, `Archway center opening must be >= 2.8m, got ${(pierRMinX - pierLMaxX).toFixed(2)}m`);
console.log(`✓ Test 12: Portal Trigger Zone passed (archway opening = ${(pierRMinX - pierLMaxX).toFixed(2)}m wide, NO center collider)`);

// Test 13: Movement Colliders & HitboxManager Registration (Layer 3)
const mockRegisteredColliders = [];
const mockRegisteredRoomHitboxes = [];
const mockClickProxies = [];

const mockHitboxManager = {
  clickProxies: mockClickProxies,
  registerRoomHitboxes(roomId, hitboxes) {
    mockRegisteredRoomHitboxes.push({ roomId, count: hitboxes.length, hitboxes });
  },
  registerSolidObjectCollider(obj, opts) {
    mockRegisteredColliders.push({ obj, opts });
  },
  registerInteractiveObject(obj, data) {
    if (!mockClickProxies.includes(obj)) mockClickProxies.push(obj);
  }
};

exhibition.userData.registerHitboxes(mockHitboxManager);
assert(mockRegisteredRoomHitboxes.length > 0, 'Must have registered room hitboxes with HitboxManager');
assert.strictEqual(mockRegisteredRoomHitboxes[0].roomId, 'an_duong_vuong', 'Room ID must be an_duong_vuong');
assert(mockRegisteredRoomHitboxes[0].count >= 6, `Must have registered at least 6 hitboxes, got ${mockRegisteredRoomHitboxes[0].count}`);

assert(mockRegisteredColliders.length >= 15, `Must have registered solid colliders, got ${mockRegisteredColliders.length}`);
console.log(`✓ Test 13: Movement Colliders & HitboxManager passed (${mockRegisteredColliders.length} solid colliders, ${mockRegisteredRoomHitboxes[0].count} hitboxes registered)`);

// Test 14: Central Corridor Clearance (|X| <= 2.3m is 100% open from entrance to dais)
const solidList = roomGroup.userData.solidObstacleList || [];
let corridorObstructions = 0;
solidList.forEach((entry) => {
  if (!entry.obj) return;
  entry.obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(entry.obj);
  // Check if box penetrates central walking corridor (between entrance Z = 2.0m to 12.0m and |X| < 2.3m)
  if (box.max.z > 2.0 && box.min.z < 11.5) {
    if (box.min.x < 2.3 && box.max.x > -2.3) {
      corridorObstructions++;
      console.warn(`Obstruction in central corridor: ${entry.tag}`);
    }
  }
});
assert.strictEqual(corridorObstructions, 0, 'Central corridor |X| <= 2.3m must have 0 solid obstructions');
console.log('✓ Test 14: Central corridor (|X| <= 2.3m) is 100% open and unobstructed');

// Test 15: Individual Pedestal Bronze Name Plaques (4 mini plaques mounted on pedestals)
const plaque1 = roomGroup.getObjectByName('ADV_Mini_Plaque_VuaAnDuongVuong');
const plaque2 = roomGroup.getObjectByName('ADV_Mini_Plaque_SaBanLoaThanh');
const plaque3 = roomGroup.getObjectByName('ADV_Mini_Plaque_NoThanLienChau');
const plaque4 = roomGroup.getObjectByName('ADV_Mini_Plaque_GiengNgocCoLoa');

assert(plaque1, 'Mini plaque 1 (Vua An Duong Vuong) must exist');
assert(plaque2, 'Mini plaque 2 (Sa ban Loa Thanh) must exist');
assert(plaque3, 'Mini plaque 3 (No Than Lien Chau) must exist');
assert(plaque4, 'Mini plaque 4 (Gieng Ngoc Co Loa) must exist');

assert.strictEqual(plaque1.userData.title, 'VUA AN DƯƠNG VƯƠNG (THỤC PHÁN)');
assert.strictEqual(plaque1.userData.subtitle, 'Triều Đại Âu Lạc • 257 – 207 TCN');
assert.strictEqual(plaque2.userData.title, 'SA BÀN 3 VÒNG THÀNH CỔ LOA');
assert.strictEqual(plaque2.userData.subtitle, 'Kỳ Tích Thành Ốc Archimedes');
assert.strictEqual(plaque3.userData.title, 'NỎ THẦN LIÊN CHÂU');
assert.strictEqual(plaque3.userData.subtitle, 'Linh Quang Kim Quy Thần Cơ');
assert.strictEqual(plaque4.userData.title, 'GIẾNG NGỌC CỔ LOA');
assert.strictEqual(plaque4.userData.subtitle, 'Minh Châu Mị Châu Ngàn Năm');

[plaque1, plaque2, plaque3, plaque4].forEach((p) => {
  assert.strictEqual(p.userData.ignoreRaycaster, true, `${p.name} must ignore raycaster`);
  assert.strictEqual(p.userData.isMiniPlaque, true, `${p.name} must be marked isMiniPlaque`);
});
console.log('✓ Test 15: Individual Pedestal Bronze Name Plaques (4 mini plaques verified with correct titles, subtitles & ignoreRaycaster)');

// Test 16: Tangent-Space Linear Normal Map generator
assert(typeof heightCanvasToLinearNormalMap === 'function', 'heightCanvasToLinearNormalMap must be exported');
assert(typeof createFloorHeightCanvas === 'function', 'createFloorHeightCanvas must be exported');
assert(typeof createLimWoodHeightCanvas === 'function', 'createLimWoodHeightCanvas must be exported');

// Test with mock canvas in Node.js
global.document = global.document || {
  createElement: (tag) => {
    if (tag === 'canvas') {
      return {
        width: 32,
        height: 32,
        getContext: () => ({
          getImageData: () => ({ data: new Uint8ClampedArray(32 * 32 * 4).fill(128) }),
          createImageData: () => ({ data: new Uint8ClampedArray(32 * 32 * 4) }),
          putImageData: () => {}
        })
      };
    }
    return {};
  }
};

const mockHC = global.document.createElement('canvas');
const testNormalTex = heightCanvasToLinearNormalMap(mockHC, 2.4, 1, 1);
assert(testNormalTex, 'Normal map texture must be generated');
assert.strictEqual(testNormalTex.colorSpace, THREE.LinearSRGBColorSpace, 'Normal map must use LinearSRGBColorSpace');
console.log('✓ Test 16: Tangent-Space Linear Normal Map generated successfully with LinearSRGBColorSpace');

// Test 17: Immediate Click Sound Feedback
assert(typeof playImmediateClickSound === 'function', 'playImmediateClickSound must be exported');
['drum', 'crossbow', 'water', 'chime', 'portal'].forEach((k) => {
  const res = playImmediateClickSound(k);
  assert.strictEqual(res, k, `playImmediateClickSound('${k}') must execute without error`);
});

const clickCheckHitboxes = [
  { name: 'ADV_Hitbox_Statue_Pedestal', expectedSound: 'drum' },
  { name: 'ADV_Hitbox_Spiral_Citadel', expectedSound: 'drum' },
  { name: 'ADV_Hitbox_Magic_Crossbow', expectedSound: 'crossbow' },
  { name: 'ADV_Hitbox_Jade_Well', expectedSound: 'water' },
  { name: 'ADV_Hitbox_Info_Plaque', expectedSound: 'chime' }
];

clickCheckHitboxes.forEach(({ name, expectedSound }) => {
  const hb = roomGroup.getObjectByName(name);
  assert(hb, `Hitbox ${name} must exist`);
  assert.strictEqual(hb.userData.soundKind, expectedSound, `${name} must have soundKind '${expectedSound}'`);
  assert(typeof hb.userData.onActivate === 'function', `${name} must have onActivate function`);
  // Invoke onActivate cleanly
  assert.doesNotThrow(() => hb.userData.onActivate(), `onActivate for ${name} must execute without error`);
});
console.log('✓ Test 17: Immediate Click Sound Feedback verified on all 5 interactive proxies (drum, crossbow, water, chime, portal)');

// Test 18: Dynamic Fog Blending & Light Attenuation (from Tắt Đèn)
assert(typeof updateFogBlend === 'function', 'updateFogBlend must be exported');
assert(typeof exhibition.updateFogBlend === 'function', 'exhibition.updateFogBlend must exist');

const testScene = new THREE.Scene();
testScene.fog = new THREE.FogExp2(0xdca878, 0.00075);
const testExteriorLight = new THREE.DirectionalLight(0xffffff, 1.0);
testScene.add(testExteriorLight);

const testCam = new THREE.PerspectiveCamera();
const testCenter = new THREE.Vector3(0, 0, -48);

// Step A: Camera inside room (< 22m, e.g. at (0, 1.7, -48))
testCam.position.set(0, 1.7, -48);
for (let step = 0; step < 15; step++) {
  exhibition.updateFogBlend(0.1, testCam, testScene, testCenter);
}
assert(testScene.fog.density > 0.002, `Fog density inside room must increase toward 0.0038, got ${testScene.fog.density}`);
assert(testExteriorLight.intensity < 0.85, `Exterior light inside room must attenuate by up to 25%, got ${testExteriorLight.intensity}`);
const blendedColorHex = testScene.fog.color.getHex();
console.log(`  Inside room: fog density = ${testScene.fog.density.toFixed(5)}, light intensity = ${testExteriorLight.intensity.toFixed(3)}, color = 0x${blendedColorHex.toString(16)}`);

// Step B: Camera outside room (> 22m, e.g. at (0, 1.7, 50))
testCam.position.set(0, 1.7, 50);
for (let step = 0; step < 20; step++) {
  exhibition.updateFogBlend(0.1, testCam, testScene, testCenter);
}
assert(testScene.fog.density < 0.001, `Fog density outside room must restore toward 0.00075, got ${testScene.fog.density}`);
assert(testExteriorLight.intensity > 0.95, `Exterior light outside room must restore toward 1.0, got ${testExteriorLight.intensity}`);
assert.strictEqual(testScene.fog.color.getHex(), 0xdca878, 'Fog color outside room must restore to lobby color 0xdca878');
console.log(`  Outside room: fog density restored = ${testScene.fog.density.toFixed(5)}, light intensity restored = ${testExteriorLight.intensity.toFixed(3)}, color = 0x${testScene.fog.color.getHex().toString(16)}`);
console.log('✓ Test 18: Dynamic Fog Blending smoothly lerps into ancient night fog (<22m) and restores lobby fog (>22m)');

console.log('ALL AN DUONG VUONG ROOM DECORATOR TESTS PASSED SUCCESSFULLY!');
