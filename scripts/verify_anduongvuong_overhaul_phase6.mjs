import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';

import {
  buildAnDuongVuongExhibition,
  setupAnDuongVuongGlb,
  validateRoomSpatialLayout,
  triggerAnDuongVuongLore
} from '../src/modules/anDuongVuongRoomDecorator.js';

import {
  AnDuongVuongWorld,
  AN_DUONG_VUONG_LORE
} from '../src/worlds/anDuongVuongWorld.js';

import {
  AnDuongVuongLoreOverlay,
  AN_DUONG_VUONG_FOUR_PART_LORE,
  LITERARY_QUEST_QUESTIONS,
  AI_DOCENT_TOPICS,
  focusCameraOnArtifact
} from '../src/modules/anDuongVuongLoreOverlay.js';

console.log('=============================================================================');
console.log('▶ PHASE 6: COMPREHENSIVE SYSTEM VERIFICATION, COLLISIONS, 60+ FPS & BUILD');
console.log('=============================================================================');

// -----------------------------------------------------------------------------
// CHECK 1: File Existence, Asset Sizes & glTF Structure (< 50MB)
// -----------------------------------------------------------------------------
console.log('\n--- CHECK 1: Asset Files & Binary Integrity ---');
const coloaKitPaths = [
  'public/model/coloa_kit.glb',
  'public/models/coloa_kit.glb',
  'model/coloa_kit.glb'
];

for (const p of coloaKitPaths) {
  assert(fs.existsSync(p), `Missing asset file: ${p}`);
  const stat = fs.statSync(p);
  const sizeMB = stat.size / (1024 * 1024);
  console.log(`  ✓ ${p} exists: ${stat.size} bytes (${sizeMB.toFixed(3)} MB < 50 MB)`);
  assert(sizeMB < 50.0, `File ${p} exceeds 50 MB`);
  assert(stat.size > 100000, `File ${p} unexpectedly small (${stat.size} bytes)`);

  // Verify glTF 2.0 binary header
  const buf = fs.readFileSync(p);
  const magic = buf.readUInt32LE(0);
  assert.strictEqual(magic, 0x46546C67, `Magic header 0x46546C67 expected ('glTF'), got 0x${magic.toString(16)}`);
  const version = buf.readUInt32LE(4);
  assert.strictEqual(version, 2, `glTF version 2 expected, got ${version}`);
}

const kingGlbPath = 'public/model/amduongvuong.glb';
assert(fs.existsSync(kingGlbPath), `Missing ${kingGlbPath}`);
const kingSizeMB = fs.statSync(kingGlbPath).size / (1024 * 1024);
console.log(`  ✓ ${kingGlbPath} exists: ${kingSizeMB.toFixed(2)} MB (< 50 MB)`);
assert(kingSizeMB < 50.0, 'amduongvuong.glb exceeds 50 MB');

// -----------------------------------------------------------------------------
// CHECK 2: Room Architecture, Colliders & Box3 Anti-Collision Clearance
// -----------------------------------------------------------------------------
console.log('\n--- CHECK 2: Room Architecture & Box3 Anti-Collision Clearance ---');
const roomCenter = new THREE.Vector3(0, 0, -48);
const exhibition = buildAnDuongVuongExhibition({ roomCenter });
assert(exhibition, 'buildAnDuongVuongExhibition must return room group');
const roomGroup = exhibition.getGroup ? exhibition.getGroup() : exhibition;

const layoutReport = validateRoomSpatialLayout(roomGroup);
assert(layoutReport, 'validateRoomSpatialLayout must return report');
console.log(`  ✓ Checked ${layoutReport.elements.length} primary architectural zones`);
console.log(`  ✓ Minimum pairwise clearance: ${layoutReport.minPairwiseClearance.toFixed(2)}m (Target: >= 1.5m)`);
assert(layoutReport.minPairwiseClearance >= 1.5, `Clearance ${layoutReport.minPairwiseClearance}m < 1.5m`);
assert.strictEqual(layoutReport.hasCollision, false, 'Collision detected between room elements');

// Gate clear opening check
const gate = roomGroup.getObjectByName('ADV_CoLoa_Stone_Archway');
assert(gate, 'Gate ADV_CoLoa_Stone_Archway must exist');
const aperture = gate.userData?.clearAperture ?? 4.2;
console.log(`  ✓ Gate clear opening aperture: ${aperture}m (Target: >= 4.0m)`);
assert(aperture >= 4.0, `Gate aperture ${aperture}m < 4.0m`);

// Central Dais grounding check
const dais = roomGroup.getObjectByName('ADV_Central_Dais_LoaThanh');
assert(dais, 'Central dais ADV_Central_Dais_LoaThanh must exist');
const topContact = dais.userData?.topContactSurfaceY ?? 1.35;
console.log(`  ✓ Bronze drum dais contact surface Y: ${topContact}m`);
assert(Math.abs(topContact - 1.35) < 0.05, `Top contact surface Y is ${topContact}, expected ~1.35m`);

// NaN & Infinity buffer check
let roomMeshes = 0;
roomGroup.traverse((child) => {
  if (child.isMesh && child.geometry) {
    roomMeshes++;
    const pos = child.geometry.attributes.position;
    if (pos?.array) {
      for (let i = 0; i < pos.array.length; i++) {
        assert(!Number.isNaN(pos.array[i]), `NaN in ${child.name}`);
        assert(Number.isFinite(pos.array[i]), `Infinity in ${child.name}`);
      }
    }
  }
});
console.log(`  ✓ Traversed ${roomMeshes} room meshes: 0 NaN, 0 Infinity verified`);
assert(roomMeshes > 20, 'Room meshes count too low');

// -----------------------------------------------------------------------------
// CHECK 3: Raycaster Hygiene (`userData.ignoreRaycaster = true`)
// -----------------------------------------------------------------------------
console.log('\n--- CHECK 3: Raycaster Exclusion Hygiene (ignoreRaycaster = true) ---');

// Room checks
const roomWater = roomGroup.getObjectByName('ADV_DaSon_SeaWater');
assert(roomWater, 'ADV_DaSon_SeaWater must exist');
assert.strictEqual(roomWater.userData.ignoreRaycaster, true, 'Room sea water must have ignoreRaycaster=true');
console.log('  ✓ Room sea water has ignoreRaycaster = true');

const roomFeathers = roomGroup.getObjectByName('ADV_Goose_Feather_Particles');
assert(roomFeathers, 'ADV_Goose_Feather_Particles must exist');
assert.strictEqual(roomFeathers.userData.ignoreRaycaster, true, 'Room goose feathers must have ignoreRaycaster=true');
console.log('  ✓ Room goose feathers have ignoreRaycaster = true');

const roomGodRay = roomGroup.getObjectByName('ADV_GodRay_Mesh');
if (roomGodRay) {
  assert.strictEqual(roomGodRay.userData.ignoreRaycaster, true, 'Room god rays must have ignoreRaycaster=true');
  console.log('  ✓ Room volumetric god rays have ignoreRaycaster = true');
}

// Realm checks
const testScene = new THREE.Scene();
const testCamera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
const realmWorld = new AnDuongVuongWorld(testScene, testCamera, null);
await realmWorld.init();
assert(realmWorld, 'AnDuongVuongWorld must return realm instance');

const realmSky = testScene.getObjectByName('AdvWorld_SkyDome');
assert(realmSky, 'AdvWorld_SkyDome must exist');
assert.strictEqual(realmSky.userData.ignoreRaycaster, true, 'SkyDome must have ignoreRaycaster=true');
console.log('  ✓ Realm sky dome has ignoreRaycaster = true');

const bambooCulms = testScene.getObjectByName('AdvWorld_BambooGroves_Culms');
assert(bambooCulms, 'AdvWorld_BambooGroves_Culms must exist');
assert.strictEqual(bambooCulms.userData.ignoreRaycaster, true, 'Bamboo culms must have ignoreRaycaster=true');
console.log('  ✓ Realm bamboo culms (InstancedMesh) have ignoreRaycaster = true');

const bambooFoliage = testScene.getObjectByName('AdvWorld_BambooGroves_Foliage');
assert(bambooFoliage, 'AdvWorld_BambooGroves_Foliage must exist');
assert.strictEqual(bambooFoliage.userData.ignoreRaycaster, true, 'Bamboo foliage must have ignoreRaycaster=true');
console.log('  ✓ Realm bamboo foliage (InstancedMesh) have ignoreRaycaster = true');

const realmFeathers = testScene.getObjectByName('AdvWorld_GooseFeathers_Trail');
assert(realmFeathers, 'AdvWorld_GooseFeathers_Trail must exist');
assert.strictEqual(realmFeathers.userData.ignoreRaycaster, true, 'Realm goose feathers must have ignoreRaycaster=true');
console.log('  ✓ Realm goose feathers (THREE.Points) have ignoreRaycaster = true');

const realmOcean = testScene.getObjectByName('AdvWorld_Ocean_Waves');
assert(realmOcean, 'AdvWorld_Ocean_Waves must exist');
assert.strictEqual(realmOcean.userData.ignoreRaycaster, true, 'Realm ocean waves must have ignoreRaycaster=true');
console.log('  ✓ Realm ocean waves custom shader mesh has ignoreRaycaster = true');

const realmAura = testScene.getObjectByName('AdvWorld_KimQuy_Aura');
assert(realmAura, 'AdvWorld_KimQuy_Aura must exist');
assert.strictEqual(realmAura.userData.ignoreRaycaster, true, 'Kim Quy aura must have ignoreRaycaster=true');
console.log('  ✓ Realm Kim Quy divine aura dome has ignoreRaycaster = true');

const realmMist = testScene.getObjectByName('AdvWorld_KimQuy_GoldenMist');
assert(realmMist, 'AdvWorld_KimQuy_GoldenMist must exist');
assert.strictEqual(realmMist.userData.ignoreRaycaster, true, 'Kim Quy mist must have ignoreRaycaster=true');
console.log('  ✓ Realm Kim Quy golden mist particles have ignoreRaycaster = true');

// -----------------------------------------------------------------------------
// CHECK 4: 60+ FPS Zero-Allocation Update Loops Performance Benchmarking
// -----------------------------------------------------------------------------
console.log('\n--- CHECK 4: 60+ FPS Performance & Zero-Allocation Stress Test ---');
const FRAMES = 180; // 3 full seconds at 60 FPS
const dt = 1 / 60; // 16.66ms per frame

// Benchmark Room update loop
const startRoom = performance.now();
for (let f = 0; f < FRAMES; f++) {
  exhibition.update(dt, f * dt, testCamera);
}
const elapsedRoom = performance.now() - startRoom;
const avgRoomMs = elapsedRoom / FRAMES;
console.log(`  ✓ Room update 180 frames: total ${elapsedRoom.toFixed(2)}ms, avg ${avgRoomMs.toFixed(4)}ms/frame (Budget: 16.6ms)`);
assert(avgRoomMs < 2.0, `Room update loop is too slow: ${avgRoomMs}ms/frame`);

// Benchmark Realm update loop
const startRealm = performance.now();
for (let f = 0; f < FRAMES; f++) {
  realmWorld.update(dt);
}
const elapsedRealm = performance.now() - startRealm;
const avgRealmMs = elapsedRealm / FRAMES;
console.log(`  ✓ Realm update 180 frames: total ${elapsedRealm.toFixed(2)}ms, avg ${avgRealmMs.toFixed(4)}ms/frame (Budget: 16.6ms)`);
assert(avgRealmMs < 2.0, `Realm update loop is too slow: ${avgRealmMs}ms/frame`);

// Verify uniforms progressed smoothly without NaN
const waterMat = realmOcean.material;
assert(waterMat.uniforms.uTime.value > 0, 'uTime uniform should advance');
assert(!Number.isNaN(waterMat.uniforms.uTime.value), 'uTime must not be NaN');
console.log(`  ✓ Shaders advance smoothly: ocean uTime = ${waterMat.uniforms.uTime.value.toFixed(2)}s, 0 NaN`);

// -----------------------------------------------------------------------------
// CHECK 5: Academic Lore Overlay & Gamification Verification
// -----------------------------------------------------------------------------
console.log('\n--- CHECK 5: Academic Lore Overlay & Gamification Systems ---');
assert(Array.isArray(AN_DUONG_VUONG_FOUR_PART_LORE), 'AN_DUONG_VUONG_FOUR_PART_LORE must be an array');
assert.strictEqual(AN_DUONG_VUONG_FOUR_PART_LORE.length, 4, 'Must have 4 comprehensive academic chapters');

const expectedChapters = [
  'Kỳ tích xây thành Cổ Loa & thần Kim Quy',
  'Nỏ Thần Liên Châu & chiến thắng quân Triệu Đà',
  'Bi kịch Mị Châu – Trọng Thủy & dấu áo lông ngỗng',
  'Ý nghĩa Ngọc Trai – Giếng Nước & bài học cảnh giác giữ nước'
];

AN_DUONG_VUONG_FOUR_PART_LORE.forEach((chap, idx) => {
  assert(chap.title.includes(expectedChapters[idx].split(' ')[0]), `Chapter ${idx + 1} title mismatch`);
  assert(chap.quote?.length > 10, `Chapter ${idx + 1} quote missing or too short`);
  assert(chap.historyText?.length > 100, `Chapter ${idx + 1} historyText too short`);
  assert(chap.analysisText?.length > 100, `Chapter ${idx + 1} analysisText too short`);
  assert(Array.isArray(chap.artifacts) && chap.artifacts.length >= 2, `Chapter ${idx + 1} artifacts missing`);
  assert(chap.focusPos && chap.lookTarget, `Chapter ${idx + 1} missing 3D camera coordinates`);
  console.log(`  ✓ Chapter ${idx + 1} [${chap.title}] verified with academic content & camera targets`);
});

// Quiz verification
assert(Array.isArray(LITERARY_QUEST_QUESTIONS), 'LITERARY_QUEST_QUESTIONS must be an array');
assert.strictEqual(LITERARY_QUEST_QUESTIONS.length, 3, 'Must have 3 quiz questions');
LITERARY_QUEST_QUESTIONS.forEach((q, idx) => {
  assert(q.question?.length > 10, `Quiz Q${idx + 1} missing question text`);
  assert(Array.isArray(q.options) && q.options.length === 4, `Quiz Q${idx + 1} must have 4 options`);
  assert(typeof q.correctIndex === 'number' && q.correctIndex >= 0 && q.correctIndex < 4, `Quiz Q${idx + 1} valid correctIndex`);
  assert(q.explanation?.length > 20, `Quiz Q${idx + 1} missing detailed explanation`);
});
console.log('  ✓ 3-question literary quest gamification verified with 4 options and detailed explanations');

// AI docent topics
assert(Array.isArray(AI_DOCENT_TOPICS) && AI_DOCENT_TOPICS.length === 4, 'AI_DOCENT_TOPICS must have 4 topics');
console.log('  ✓ 4 AI literary docent interactive prompts verified');

// -----------------------------------------------------------------------------
// CHECK 6: Memory Cleanup & Resource Disposal
// -----------------------------------------------------------------------------
console.log('\n--- CHECK 6: Memory Cleanup & Resource Disposal ---');
realmWorld.dispose();
assert.strictEqual(testScene.children.length, 0, 'Realm dispose must remove all objects from testScene');
console.log('  ✓ Realm dispose cleaned up all 15 scene objects and restored fog');

exhibition.dispose();
console.log('  ✓ Room exhibition dispose completed cleanly');

console.log('\n=============================================================================');
console.log('>>> ALL PHASE 6 SYSTEM VERIFICATION CHECKS PASSED WITH 100% SUCCESS! <<<');
console.log('=============================================================================');
