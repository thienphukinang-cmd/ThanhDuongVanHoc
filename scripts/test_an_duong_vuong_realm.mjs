import assert from 'assert';
import * as THREE from 'three';
import { AnDuongVuongWorld, getTerrainHeight, AN_DUONG_VUONG_LORE } from '../src/worlds/anDuongVuongWorld.js';

console.log('--- STARTING AN DƯƠNG VƯƠNG OPEN-WORLD REALM TESTS (240m x 240m) ---');

// 1. Kiểm tra getTerrainHeight(x, z)
console.log('Test 1: Testing continuous terrain height function getTerrainHeight(x, z)...');
const hCenter = getTerrainHeight(0, 0);
assert(hCenter >= 4.0, `Center height should be >= 4.0m (got ${hCenter})`);

const cos45 = Math.cos(Math.PI / 4);
const sin45 = Math.sin(Math.PI / 4);

const hMoat1 = getTerrainHeight(18.5 * cos45, 18.5 * sin45);
assert(hMoat1 < 2.0, `Moat 1 should dip down (got ${hMoat1})`);

const hMoat2 = getTerrainHeight(34.0 * cos45, 34.0 * sin45);
assert(hMoat2 < 2.0, `Moat 2 should dip down (got ${hMoat2})`);

const hMoat3 = getTerrainHeight(50.5 * cos45, 50.5 * sin45);
assert(hMoat3 < 2.0, `Moat 3 should dip down (got ${hMoat3})`);

const hValley = getTerrainHeight(0, 60.0);
assert(hValley >= 1.0 && hValley <= 2.5, `South road valley should be 1.0m-2.5m (got ${hValley})`);

const hCliff = getTerrainHeight(0, 125.0);
assert(hCliff >= 5.5, `Dạ Sơn cliff headland should be >= 5.5m (got ${hCliff})`);

const hOcean = getTerrainHeight(0, 160.0);
assert(hOcean <= -3.0, `Ocean abyss should be <= -3.0m (got ${hOcean})`);
console.log('✓ Test 1: getTerrainHeight passed for all key zones (Center, 3 Moats, Valley, Dạ Sơn Cliff, Ocean).');

// 2. Kiểm tra AN_DUONG_VUONG_LORE
console.log('Test 2: Verifying 4-chapter academic historical lore structure...');
assert(AN_DUONG_VUONG_LORE.king_statue, 'king_statue lore missing');
assert(AN_DUONG_VUONG_LORE.magic_crossbow, 'magic_crossbow lore missing');
assert(AN_DUONG_VUONG_LORE.kim_quy_lake, 'kim_quy_lake lore missing');
assert(AN_DUONG_VUONG_LORE.goose_feather_well, 'goose_feather_well lore missing');
console.log('✓ Test 2: AN_DUONG_VUONG_LORE verified.');

// 3. Khởi tạo AnDuongVuongWorld trong mock Scene
console.log('Test 3: Initializing AnDuongVuongWorld inside mock scene...');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 16/9, 0.1, 1000);
const renderer = {
  toneMapping: THREE.ACESFilmicToneMapping,
  toneMappingExposure: 1.1
};

const world = new AnDuongVuongWorld(scene, camera, renderer);
assert(world, 'Failed to create AnDuongVuongWorld');

await world.init();
console.log('✓ Test 3: world.init() completed successfully.');

// 4. Kiểm tra các thành phần kiến trúc và đối tượng trong Scene
console.log('Test 4: Verifying key architectural components in scene...');
const terrain = scene.getObjectByName('AdvWorld_MultiLayer_Terrain');
assert(terrain, 'Terrain mesh AdvWorld_MultiLayer_Terrain missing');

const sky = scene.getObjectByName('AdvWorld_SkyDome');
assert(sky, 'Sky dome AdvWorld_SkyDome missing');

const zone1 = scene.getObjectByName('AdvWorld_Imperial_Pavilion_Hall');
assert(zone1, 'Zone 1 Citadel Pavilion missing');

const zone2 = scene.getObjectByName('AdvWorld_SouthGate_Bastion_NoThan');
assert(zone2, 'Zone 2 South Gate Bastion missing');

const zone3 = scene.getObjectByName('AdvWorld_VongNguyet_JadeWell_Courtyard');
assert(zone3, 'Zone 3 Jade Well missing');

const bambooCulms = scene.getObjectByName('AdvWorld_BambooGroves_Culms');
assert(bambooCulms, 'Bamboo culms InstancedMesh missing');

const featherPoints = scene.getObjectByName('AdvWorld_GooseFeathers_Trail');
assert(featherPoints, 'Goose feather trail Points missing');

const zone5 = scene.getObjectByName('AdvWorld_Coastal_Cliffs');
assert(zone5, 'Zone 5 Da Son Cliffs missing');

const ocean = scene.getObjectByName('AdvWorld_Ocean_Waves');
assert(ocean, 'Ocean mesh missing');

const portal = scene.getObjectByName('Interactive_CoLoa_Return_Portal');
assert(portal, 'Return portal missing');
console.log('✓ Test 4: All 10 major components verified in scene.');

// 5. Kiểm tra ignoreRaycaster
console.log('Test 5: Verifying userData.ignoreRaycaster = true on particles, water, background...');
assert.strictEqual(sky.userData.ignoreRaycaster, true, 'Sky dome must ignore raycaster');
assert.strictEqual(ocean.userData.ignoreRaycaster, true, 'Ocean must ignore raycaster');
assert.strictEqual(bambooCulms.userData.ignoreRaycaster, true, 'Bamboo culms must ignore raycaster');
assert.strictEqual(featherPoints.userData.ignoreRaycaster, true, 'Feather points must ignore raycaster');
console.log('✓ Test 5: Raycaster optimization flags verified.');

// 6. Kiểm tra NaN / Infinity trên toàn bộ geometries
console.log('Test 6: Sanitizing all meshes for NaN / Infinity poisoning...');
let totalMeshes = 0;
scene.traverse((obj) => {
  if (obj.isMesh || obj.isPoints) {
    totalMeshes++;
    const pos = obj.geometry?.attributes?.position;
    if (pos) {
      for (let i = 0; i < pos.count * pos.itemSize; i++) {
        assert(Number.isFinite(pos.array[i]), `NaN or Infinity found in ${obj.name} position at index ${i}`);
      }
    }
    const norm = obj.geometry?.attributes?.normal;
    if (norm) {
      for (let i = 0; i < norm.count * norm.itemSize; i++) {
        assert(Number.isFinite(norm.array[i]), `NaN or Infinity found in ${obj.name} normal at index ${i}`);
      }
    }
  }
});
assert(totalMeshes >= 15, `Expected at least 15 meshes in realm, found ${totalMeshes}`);
console.log(`✓ Test 6: Verified ${totalMeshes} meshes in realm: 0 NaN, 0 Infinity!`);

// 7. Kiểm tra update render loop
console.log('Test 7: Testing update() animation loop...');
assert.doesNotThrow(() => {
  world.update(0.016, 1.0, camera);
  world.update(0.016, 1.5, camera);
}, 'world.update() threw an error');
console.log('✓ Test 7: update() loop executed with 0 errors.');

// 8. Kiểm tra dispose
console.log('Test 8: Testing clean disposal of all resources...');
world.dispose();
assert.strictEqual(world._objects.length, 0, 'All objects should be cleared after dispose');
assert.strictEqual(world._lights.length, 0, 'All lights should be cleared after dispose');
assert.strictEqual(world._disposables.length, 0, 'All disposables should be cleared after dispose');
console.log('✓ Test 8: world.dispose() executed with 100% clean slate.');

console.log('ALL AN DƯƠNG VƯƠNG OPEN-WORLD REALM TESTS PASSED SUCCESSFULLY!');
