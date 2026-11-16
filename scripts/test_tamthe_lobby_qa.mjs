import * as THREE from 'three';
import {
  createFocalBronzeMedallionWall,
  createLobbyOctagonalWoodenTower,
  createLobbyHorizontalLacqueredBanners,
  createInstancedCorridorPillarsAndLanterns
} from '../src/modules/museumLobbyCorridorDecorator.js';
import { removeLobbyCeilingAndOverheadClutter } from '../src/modules/museumUltimate16SkillsUpgrade.js';

let allPassed = true;
function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    allPassed = false;
  }
}

console.log('--- TEST 1: Chiêng Đồng / Trống Đồng Khổng Lồ (Focal Bronze Medallion Wall) ---');
const medallionWall = createFocalBronzeMedallionWall();
assert(medallionWall instanceof THREE.Group, 'medallionWall is THREE.Group');
assert(medallionWall.name === 'Focal_Bronze_Medallion_Wall', 'Name is Focal_Bronze_Medallion_Wall');
assert(medallionWall.position.x === 0 && medallionWall.position.y === 5.8 && medallionWall.position.z === -16.5, `Position matches (0, 5.8, -16.5) -> actual: (${medallionWall.position.x}, ${medallionWall.position.y}, ${medallionWall.position.z})`);

let hasNaN = false;
let raycasterSafe = true;
let hasPointLight = false;
medallionWall.traverse((c) => {
  if (c.isMesh) {
    if (!c.userData?.ignoreRaycaster) raycasterSafe = false;
    const pos = c.geometry?.getAttribute('position');
    if (pos) {
      for (let i = 0; i < pos.count * pos.itemSize; i++) {
        if (Number.isNaN(pos.array[i]) || !Number.isFinite(pos.array[i])) hasNaN = true;
      }
    }
  }
  if (c.isPointLight) hasPointLight = true;
});
assert(!hasNaN, 'Zero NaN or Infinity in geometry buffers');
assert(raycasterSafe, 'All meshes have userData.ignoreRaycaster = true');
assert(hasPointLight, 'Has warm PointLight halo');

console.log('\n--- TEST 2: Tháp Lầu Bát Giác Gỗ Trên Chiếu Nghỉ Cầu Thang ---');
const octagonalTower = createLobbyOctagonalWoodenTower();
assert(octagonalTower instanceof THREE.Group, 'octagonalTower is THREE.Group');
assert(octagonalTower.name === 'Lobby_Octagonal_Wooden_Tower_Pavilion', 'Name is Lobby_Octagonal_Wooden_Tower_Pavilion');
assert(octagonalTower.position.x === 0 && octagonalTower.position.y === 11.2 && octagonalTower.position.z === -16.5, `Position matches (0, 11.2, -16.5) -> actual: (${octagonalTower.position.x}, ${octagonalTower.position.y}, ${octagonalTower.position.z})`);

let towerMeshCount = 0;
let towerHasNaN = false;
let towerRaycasterSafe = true;
let towerInnerLight = false;
octagonalTower.traverse((c) => {
  if (c.isMesh) {
    towerMeshCount++;
    if (!c.userData?.ignoreRaycaster) towerRaycasterSafe = false;
    const pos = c.geometry?.getAttribute('position');
    if (pos) {
      for (let i = 0; i < pos.count * pos.itemSize; i++) {
        if (Number.isNaN(pos.array[i]) || !Number.isFinite(pos.array[i])) towerHasNaN = true;
      }
    }
  }
  if (c.isPointLight) towerInnerLight = true;
});
assert(towerMeshCount > 15, `Has rich architectural elements (mesh count: ${towerMeshCount})`);
assert(!towerHasNaN, 'Zero NaN or Infinity in tower geometry');
assert(towerRaycasterSafe, 'All tower meshes have userData.ignoreRaycaster = true');
assert(towerInnerLight, 'Has inner PointLight for lantern glow');

console.log('\n--- TEST 3: Mở Chao Đèn Lồng Trên Đỉnh Hàng Cột Gỗ Lim ---');
const dummyPillars = [new THREE.Vector3(-4, 0, -10), new THREE.Vector3(4, 0, -10)];
const pillarsGroup = createInstancedCorridorPillarsAndLanterns(dummyPillars, 9.2);
assert(pillarsGroup.children.length === 4, `Pillars group has 4 instanced meshes (shaft, base, top, lantern) -> count: ${pillarsGroup.children.length}`);
const lanternInst = pillarsGroup.children[3];
assert(lanternInst.visible === true, 'lanternInst is visible = true initially');

const testContainer = new THREE.Group();
testContainer.add(pillarsGroup);
removeLobbyCeilingAndOverheadClutter(testContainer);
assert(lanternInst.visible === true, 'lanternInst remains visible = true after removeLobbyCeilingAndOverheadClutter');

console.log('\n--- TEST 4: 2 Hoành Phi Gỗ Sơn Son Thếp Vàng Ngang Hai Bên Sảnh ---');
const banners = createLobbyHorizontalLacqueredBanners();
assert(banners instanceof THREE.Group, 'banners is THREE.Group');
assert(banners.name === 'Lobby_Flanking_Horizontal_Lacquered_Banners', 'Name is Lobby_Flanking_Horizontal_Lacquered_Banners');
assert(banners.children.length === 2, `Contains 2 flanking banners -> count: ${banners.children.length}`);

const westBanner = banners.getObjectByName('West_Imperial_Lacquered_Banner');
const eastBanner = banners.getObjectByName('East_Imperial_Lacquered_Banner');
assert(!!westBanner, 'West banner exists ("VĂN HIẾN THIÊN THU")');
assert(!!eastBanner, 'East banner exists ("VẠN CỔ LƯU PHƯƠNG")');
assert(westBanner.position.x === -7.2 && westBanner.position.y === 6.4 && westBanner.position.z === -8.2, `West banner pos (-7.2, 6.4, -8.2) -> actual: (${westBanner.position.x}, ${westBanner.position.y}, ${westBanner.position.z})`);
assert(eastBanner.position.x === 7.2 && eastBanner.position.y === 6.4 && eastBanner.position.z === -8.2, `East banner pos (7.2, 6.4, -8.2) -> actual: (${eastBanner.position.x}, ${eastBanner.position.y}, ${eastBanner.position.z})`);

let bannerHasNaN = false;
let bannerRaycasterSafe = true;
banners.traverse((c) => {
  if (c.isMesh) {
    if (!c.userData?.ignoreRaycaster) bannerRaycasterSafe = false;
    const pos = c.geometry?.getAttribute('position');
    if (pos) {
      for (let i = 0; i < pos.count * pos.itemSize; i++) {
        if (Number.isNaN(pos.array[i]) || !Number.isFinite(pos.array[i])) bannerHasNaN = true;
      }
    }
  }
});
assert(!bannerHasNaN, 'Zero NaN or Infinity in banner geometries');
assert(bannerRaycasterSafe, 'All banner meshes have userData.ignoreRaycaster = true');

if (allPassed) {
  console.log('\n============================================================');
  console.log('✓ TOÀN BỘ 4 HẠNG MỤC KIẾN TRÚC ĐẠI SẢNH ĐẠT CHUẨN 100%!');
  console.log('============================================================');
  process.exit(0);
} else {
  console.error('\n❌ CÓ TIÊU CHÍ CHƯA ĐẠT!');
  process.exit(1);
}
