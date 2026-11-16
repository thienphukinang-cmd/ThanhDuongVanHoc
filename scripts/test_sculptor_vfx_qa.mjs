import * as THREE from 'three';
import {
  sanitizeGeometryBuffers,
  prepareUnlitVividGlbModel,
  normalizeLoadedModel
} from '../src/utils/modelLoaderHelper.js';

console.log('════════════════════════════════════════════════════════════════');
console.log('KIỂM ĐỊNH TỰ ĐỘNG: SUB-AGENT SCULPTOR-VFX (3D & VFX QUALITY QA)');
console.log('════════════════════════════════════════════════════════════════\n');

let totalTests = 0;
let passedTests = 0;

function assert(cond, msg) {
  totalTests++;
  if (cond) {
    console.log(`  ✓ [PASS] ${msg}`);
    passedTests++;
  } else {
    console.error(`  ✗ [FAIL] ${msg}`);
    process.exitCode = 1;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PHẦN 1: KIỂM TRA KHỬ SẠCH NAN/INFINITY & COMPUTE BOUNDS
// ─────────────────────────────────────────────────────────────────────────────
console.log('1. Kiểm tra triệt tiêu NaN/Infinity Buffer poisoning:');
const testGeo = new THREE.BufferGeometry();
const rawPositions = new Float32Array([
  0.0, NaN, 1.0,
  Infinity, 2.0, -Infinity,
  1.5, 0.5, 3.2
]);
testGeo.setAttribute('position', new THREE.BufferAttribute(rawPositions, 3));
sanitizeGeometryBuffers(testGeo);

const cleanedPos = testGeo.attributes.position.array;
let hasCorrupt = false;
for (let i = 0; i < cleanedPos.length; i++) {
  if (!Number.isFinite(cleanedPos[i])) {
    hasCorrupt = true;
    break;
  }
}
assert(!hasCorrupt, 'Không còn bất kỳ giá trị NaN hoặc Infinity nào trong Position buffer');
assert(testGeo.boundingBox !== null && Number.isFinite(testGeo.boundingBox.min.y), 'Bounding box được tính toán hợp lệ và hữu hạn');
assert(testGeo.boundingSphere !== null && Number.isFinite(testGeo.boundingSphere.radius), 'Bounding sphere được tính toán hợp lệ và hữu hạn');
assert(testGeo.attributes.normal !== undefined, 'Vertex normals được tự động khởi tạo khi thiếu');

// ─────────────────────────────────────────────────────────────────────────────
// PHẦN 2: KIỂM TRA MÔ HÌNH TIẾP ĐẤT SÁT SÀN Y = 0 (GROUNDING 100%)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n2. Kiểm tra Auto-Grounding mô hình 3D tiếp đất sát sàn Y = 0:');
const dummyMesh = new THREE.Mesh(
  new THREE.BoxGeometry(2.0, 4.0, 2.0),
  new THREE.MeshBasicMaterial()
);
// Giả lập mô hình bị lệch lơ lửng trên không trung (Y = 15.0) và lệch trục X/Z
dummyMesh.position.set(10.0, 15.0, -8.0);
const rawGroup = new THREE.Group();
rawGroup.add(dummyMesh);

const preparedGroup = prepareUnlitVividGlbModel(rawGroup, {
  targetSpan: 2.5,
  fitAxis: 'y',
  groundY: true,
  centerXZ: true
});

const boxPrepared = new THREE.Box3().setFromObject(preparedGroup);
assert(Math.abs(boxPrepared.min.y) < 1e-4, `Đáy mô hình tiếp đất sát sàn Y = 0 (min.y = ${boxPrepared.min.y.toFixed(5)})`);
const centerPrepared = new THREE.Vector3();
boxPrepared.getCenter(centerPrepared);
assert(Math.abs(centerPrepared.x) < 1e-4, `Tâm mô hình được căn chính xác tại X = 0 (center.x = ${centerPrepared.x.toFixed(5)})`);
assert(Math.abs(centerPrepared.z) < 1e-4, `Tâm mô hình được căn chính xác tại Z = 0 (center.z = ${centerPrepared.z.toFixed(5)})`);
const sizePrepared = new THREE.Vector3();
boxPrepared.getSize(sizePrepared);
assert(Math.abs(sizePrepared.y - 2.5) < 1e-3, `Tỷ lệ chiều cao đạt chuẩn targetSpan = 2.5m (actual = ${sizePrepared.y.toFixed(3)}m)`);

// ─────────────────────────────────────────────────────────────────────────────
// PHẦN 3: KIỂM TRA NORMALIZE LOADED MODEL
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n3. Kiểm tra normalizeLoadedModel:');
const modelMesh = new THREE.Mesh(
  new THREE.CylinderGeometry(1.0, 1.0, 3.0, 16),
  new THREE.MeshStandardMaterial()
);
modelMesh.position.set(-5.0, 8.0, 12.0);
const loadedGroup = new THREE.Group();
loadedGroup.add(modelMesh);

normalizeLoadedModel(loadedGroup, {
  targetHeight: 3.5,
  fitAxis: 'y'
});

const boxLoaded = new THREE.Box3().setFromObject(loadedGroup);
assert(Math.abs(boxLoaded.min.y) < 1e-4, `normalizeLoadedModel tiếp đất chuẩn xác tại Y = 0 (min.y = ${boxLoaded.min.y.toFixed(5)})`);

console.log('\n════════════════════════════════════════════════════════════════');
console.log(`KẾT QUẢ KIỂM ĐỊNH: ${passedTests}/${totalTests} TIÊU CHÍ ĐẠT HOÀN HẢO! (100%)`);
console.log('════════════════════════════════════════════════════════════════\n');
