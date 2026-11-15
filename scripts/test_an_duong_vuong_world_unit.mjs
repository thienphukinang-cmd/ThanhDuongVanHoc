// test_an_duong_vuong_world_unit.mjs
import * as THREE from 'three';
import { AnDuongVuongWorld, AN_DUONG_VUONG_LORE } from '../src/worlds/anDuongVuongWorld.js';

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed++;
    console.log(`  [PASS] ${msg}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${msg}`);
  }
}

async function runTests() {
  console.log('=== TEST SUITE: AnDuongVuongWorld (Phase 4: Open-World Realm) ===\n');

  // Test 1: AN_DUONG_VUONG_LORE exports
  console.log('1. Kiểm tra cấu trúc AN_DUONG_VUONG_LORE:');
  assert(AN_DUONG_VUONG_LORE !== undefined, 'AN_DUONG_VUONG_LORE được export');
  assert(Boolean(AN_DUONG_VUONG_LORE.king_statue), 'Chương 1: king_statue tồn tại');
  assert(Boolean(AN_DUONG_VUONG_LORE.magic_crossbow), 'Chương 2: magic_crossbow tồn tại');
  assert(Boolean(AN_DUONG_VUONG_LORE.kim_quy_lake), 'Chương 3: kim_quy_lake tồn tại');
  assert(Boolean(AN_DUONG_VUONG_LORE.goose_feather_well), 'Chương 4: goose_feather_well tồn tại');

  // Test 2: Khởi tạo Scene và World
  console.log('\n2. Khởi tạo AnDuongVuongWorld & init():');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
  const world = new AnDuongVuongWorld(scene, camera, null);

  await world.init();
  assert(scene.children.length > 0, `Scene có ${scene.children.length} đối tượng`);

  // Test 3: Atmosphere & Fog
  console.log('\n3. Kiểm tra Atmosphere & Fog:');
  assert(scene.fog !== null, 'scene.fog đã được thiết lập');
  assert(scene.fog.isFogExp2, 'scene.fog là THREE.FogExp2');
  assert(scene.fog.color.getHex() === 0x12161f, `Fog color là #12161f (thực tế: 0x${scene.fog.color.getHexString()})`);

  let skyObj = null;
  scene.traverse(o => {
    if (o.name?.includes('Sky')) skyObj = o;
  });
  assert(skyObj !== null, 'Bầu trời SkyDome tồn tại');
  assert(skyObj?.userData?.ignoreRaycaster === true, 'Bầu trời có userData.ignoreRaycaster = true');

  // Test 4: Pathway & Vegetation (InstancedMesh với GPU wind shader)
  console.log('\n4. Kiểm tra Pathway & Native Bamboo Groves (InstancedMesh):');
  let bambooCulms = null;
  let bambooFoliage = null;
  let coastalPath = null;
  let coastalCliffs = null;

  scene.traverse(o => {
    if (o.name === 'AdvWorld_BambooGroves_Culms') bambooCulms = o;
    if (o.name === 'AdvWorld_BambooGroves_Foliage') bambooFoliage = o;
    if (o.name?.includes('CoastalPath')) coastalPath = o;
    if (o.name?.includes('Cliffs')) coastalCliffs = o;
  });

  assert(bambooCulms !== null && bambooCulms.isInstancedMesh, 'Thân tre là InstancedMesh');
  assert(bambooCulms?.count === 180, `Số lượng thân tre là 180 (thực tế: ${bambooCulms?.count})`);
  assert(bambooCulms?.userData?.ignoreRaycaster === true, 'Thân tre có userData.ignoreRaycaster = true');
  assert(bambooFoliage !== null && bambooFoliage.isInstancedMesh, 'Tán lá tre là InstancedMesh');
  assert(bambooFoliage?.userData?.ignoreRaycaster === true, 'Tán lá tre có userData.ignoreRaycaster = true');
  assert(coastalPath !== null, 'Lối mòn ven biển Dạ Sơn tồn tại');
  assert(coastalCliffs !== null, 'Vách đá bờ biển Dạ Sơn tồn tại');

  // Test 5: Goose Feathers Particle System
  console.log('\n5. Kiểm tra Hệ thống Lông Ngỗng Bay (Goose Feathers):');
  let feathers = null;
  scene.traverse(o => {
    if (o.name?.includes('Feather')) feathers = o;
  });
  assert(feathers !== null && feathers.isPoints, 'Lông ngỗng là THREE.Points');
  assert(feathers?.userData?.ignoreRaycaster === true, 'Lông ngỗng có userData.ignoreRaycaster = true');
  const featherPosCount = feathers?.geometry?.attributes?.position?.count;
  assert(featherPosCount === 650, `Số lượng hạt lông ngỗng là 650 (thực tế: ${featherPosCount})`);

  // Test 6: Ocean & Waves Custom Shader
  console.log('\n6. Kiểm tra Đại Dương Sóng Biển (Custom Water Ocean Shader):');
  let oceanWaves = null;
  scene.traverse(o => {
    if (o.name?.includes('Ocean') || o.name?.includes('Waves')) oceanWaves = o;
  });
  assert(oceanWaves !== null && oceanWaves.isMesh, 'Mặt biển Ocean Waves là THREE.Mesh');
  assert(oceanWaves?.material?.isShaderMaterial, 'Mặt biển sử dụng ShaderMaterial');
  assert(oceanWaves?.material?.uniforms?.uTime !== undefined, 'Mặt biển có uniform uTime');
  assert(oceanWaves?.material?.uniforms?.uTurtlePos !== undefined, 'Mặt biển có uniform uTurtlePos rẽ nước');
  assert(oceanWaves?.userData?.ignoreRaycaster === true, 'Mặt biển có userData.ignoreRaycaster = true');

  // Test 7: Golden Turtle God (Kim Quy)
  console.log('\n7. Kiểm tra Thần Kim Quy (KimQuy_Golden_Turtle):');
  let turtleGod = null;
  let turtleAura = null;
  let turtleMist = null;
  scene.traverse(o => {
    if (o.name === 'KimQuy_Golden_Turtle') turtleGod = o;
    if (o.name?.includes('Aura')) turtleAura = o;
    if (o.name?.includes('Mist')) turtleMist = o;
  });
  assert(turtleGod !== null, 'Thần Kim Quy KimQuy_Golden_Turtle tồn tại trong cõi');
  assert(turtleAura !== null, 'Hào quang vàng kim (KimQuy_Aura) tồn tại');
  assert(turtleAura?.userData?.ignoreRaycaster === true, 'Hào quang có userData.ignoreRaycaster = true');
  assert(turtleMist !== null, 'Làn sương vàng kim huyền ảo (KimQuy_GoldenMist) tồn tại');
  assert(turtleMist?.userData?.ignoreRaycaster === true, 'Làn sương có userData.ignoreRaycaster = true');

  // Test 8: Distant Lore Landmarks
  console.log('\n8. Kiểm tra các địa danh huyền thoại:');
  let citadel = null;
  let crossbow = null;
  let jadeWell = null;
  scene.traverse(o => {
    if (o.name?.includes('Citadel') || o.name?.includes('LoaThanh')) citadel = o;
    if (o.name?.includes('Crossbow') || o.name?.includes('NoThan')) crossbow = o;
    if (o.name?.includes('JadeWell') || o.name?.includes('Pearl')) jadeWell = o;
  });
  assert(citadel !== null, 'Thành Cổ Loa xa xa tồn tại');
  assert(crossbow !== null, 'Miếu Nỏ Thần Liên Châu tồn tại');
  assert(jadeWell !== null, 'Giếng Ngọc Mỵ Châu bên bờ biển tồn tại');

  // Test 9: Zero-Allocation update(dt) loop
  console.log('\n9. Kiểm tra Zero-Allocation update() loop 60 FPS:');
  const initialY = turtleGod.position.y;
  for (let f = 0; f < 60; f++) {
    world.update(0.016);
  }
  assert(world._elapsedTime > 0.9, `_elapsedTime tăng chính xác (${world._elapsedTime.toFixed(2)}s)`);
  assert(world._waterMat.uniforms.uTime.value === world._elapsedTime, 'waterMat.uTime cập nhật đều đặn');
  assert(world._windUniform.uTime.value === world._elapsedTime, 'windUniform.uTime cập nhật đều đặn');
  assert(Math.abs(turtleGod.position.y - initialY) > 0.001, 'Thần Kim Quy cử động bồng bềnh tự nhiên theo sóng');

  // Test 10: Clean Dispose
  console.log('\n10. Kiểm tra Giải phóng tài nguyên (dispose):');
  world.dispose();
  assert(scene.children.length === 0, `Scene rỗng hoàn toàn sau dispose (còn ${scene.children.length} đối tượng)`);
  assert(world._objects.length === 0, 'world._objects đã dọn sạch');
  assert(world._lights.length === 0, 'world._lights đã dọn sạch');

  console.log(`\n======================================================`);
  console.log(`KẾT QUẢ KIỂM THỬ: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Unhandled error in test:', err);
  process.exit(1);
});
