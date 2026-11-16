import * as THREE from 'three';
import { getMuseumHitboxManager } from '../src/modules/museumHitboxSystem.js';
import { CatAgentVillageWorld } from '../src/worlds/catAgentVillage.js';

console.log('================================================================');
console.log('🐾 KIỂM ĐỊNH HITBOX, AN TOÀN CÕI MỞ & BUILD SẢN XUẤT - ĐẢO MÈO');
console.log('   MÈO XIÊM TUẦN ĐINH (XIEMTUAN) - QUALITY GATEKEEPER');
console.log('================================================================\n');

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
    console.error(`  [FAIL] ${desc} -> ${details}`);
  }
}

// -----------------------------------------------------------------------------
// 1. KIỂM TRA BOX3 COLLIDERS QUANH VIỀN ĐẢO (~22m x 22m) VÀ TRẠM LÀM VIỆC
// -----------------------------------------------------------------------------
console.log('--- 1. KIỂM TRA BOX3 COLLIDERS TRÊN ĐẢO MÈO (REALM: cat_village) ---');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
const hitboxMgr = getMuseumHitboxManager(scene);

const catWorld = new CatAgentVillageWorld(scene, camera, null, null, {});
await catWorld.init();

// Lọc các colliders thuộc realm 'cat_village'
const catColliders = hitboxMgr.solidBoxes.filter(b => b.realm === 'cat_village');
check(`Đã đăng ký danh sách Box3 colliders cho realm 'cat_village' (Số lượng: ${catColliders.length})`, catColliders.length > 0);

// Kiểm tra 16 khung bao vật lý quanh viền đảo R = 11.2m
const perimeterBoxes = catColliders.filter(b => b.tag.startsWith('Cat_Village_Boundary_'));
check(`Có ít nhất 12-16 khung Box3 bao quanh viền đảo R = 11.2m (Tìm thấy: ${perimeterBoxes.length})`, perimeterBoxes.length >= 12);

// Kiểm tra các trạm làm việc chính
const stationHienMoc = catColliders.find(b => b.tag === 'Cat_Station_HienMoc');
const stationBepRen = catColliders.find(b => b.tag === 'Cat_Station_BepRen');
const stationChoiDen = catColliders.find(b => b.tag === 'Cat_Station_ChoiDenLong');
const stationChieuDan = catColliders.find(b => b.tag === 'Cat_Station_ChieuDan');
const scratch1 = catColliders.find(b => b.tag === 'Cat_ScratchingPost_1');
const scratch2 = catColliders.find(b => b.tag === 'Cat_ScratchingPost_2');

check('Box3 collider Trạm Hiên Mộc Bản Vẽ tồn tại', !!stationHienMoc);
check('Box3 collider Trạm Bếp Rèn & Bể Sóng tồn tại', !!stationBepRen);
check('Box3 collider Trạm Chòi Đèn Lồng tồn tại', !!stationChoiDen);
check('Box3 collider Trạm Chiếu Đàn Ven Suối tồn tại', !!stationChieuDan);
check('Box3 colliders Trụ Cào Móng tồn tại', !!scratch1 && !!scratch2);

// -----------------------------------------------------------------------------
// 2. ĐẢM BẢO 2 CỔNG DỊCH CHUYỂN KHÔNG BỊ VẬT CẢN CHẶN GIỮA LÒNG CỔNG
// -----------------------------------------------------------------------------
console.log('\n--- 2. KIỂM ĐỊNH THÔNG THOÁNG 2 LÒNG CỔNG DỊCH CHUYỂN ---');

// A. Cổng Hồi Quy trên Đảo Mèo (0, 0, 8.2)
let portalBlockerCount = 0;
catColliders.forEach((c) => {
  const b = c.box;
  // Vùng lòng cổng: X in [-0.8, 0.8], Z in [7.4, 9.0]
  if (b.min.x < 0.8 && b.max.x > -0.8 && b.min.z < 9.0 && b.max.z > 7.4) {
    portalBlockerCount++;
    console.warn(`    Vật cản chặn lòng cổng đảo: ${c.tag}`);
  }
});
check('Lòng Cổng Hồi Quy trên Đảo Mèo (0, 0, 8.2) hoàn toàn thông thoáng 100% (0 Blocker)', portalBlockerCount === 0);

// B. Cổng Linh Miêu tại Đại Sảnh (-16.5, 0, 8.0)
let lobbyPortalBlockerCount = 0;
const lobbyColliders = hitboxMgr.solidBoxes.filter(b => b.realm === 'museum');
lobbyColliders.forEach((c) => {
  const b = c.box;
  // Vùng lòng cổng sảnh: X in [-17.2, -15.8], Z in [7.2, 8.8]
  if (b.min.x < -15.8 && b.max.x > -17.2 && b.min.z < 8.8 && b.max.z > 7.2) {
    lobbyPortalBlockerCount++;
    console.warn(`    Vật cản chặn lòng cổng sảnh: ${c.tag}`);
  }
});
check('Lòng Cổng Linh Miêu tại Đại Sảnh (-16.5, 0, 8.0) hoàn toàn thông thoáng 100% (0 Blocker)', lobbyPortalBlockerCount === 0);

// C. Kiểm tra Proxy Hitbox bắt click của Cổng Đảo Mèo
check('Proxy Hitbox bắt click của Cổng Hồi Quy tồn tại', !!catWorld.portalMesh);
if (catWorld.portalMesh) {
  check('Proxy Hitbox Cổng tàng hình (opacity = 0, depthWrite = false)',
    catWorld.portalMesh.material.transparent === true &&
    catWorld.portalMesh.material.opacity === 0.0 &&
    catWorld.portalMesh.material.depthWrite === false
  );
  check('Proxy Hitbox có action = returnToLobby', catWorld.portalMesh.userData?.action === 'returnToLobby');
}

// -----------------------------------------------------------------------------
// 3. KIỂM TRA THU HỒI BỘ NHỚ (DISPOSE)
// -----------------------------------------------------------------------------
console.log('\n--- 3. KIỂM ĐỊNH THU HỒI BỘ NHỚ KHI RỜI ĐẢO MÈO (.dispose()) ---');
catWorld.dispose();
const remainingCatBoxes = hitboxMgr.solidBoxes.filter(b => b.realm === 'cat_village');
check(`Toàn bộ Box3 colliders của Đảo Mèo được giải phóng sạch sẽ khi dispose (Còn lại: ${remainingCatBoxes.length})`, remainingCatBoxes.length === 0);
check('Khởi tạo initialized chuyển về false sau khi dispose', catWorld.initialized === false);

console.log('\n================================================================');
console.log(`KẾT QUẢ KIỂM THỬ: ${passedChecks}/${totalChecks} BÀI PASS (${Math.round((passedChecks / totalChecks) * 100)}%)`);
if (failedChecks > 0) {
  console.error(`CÓ ${failedChecks} BÀI KIỂM TRA THẤT BẠI!`);
  process.exit(1);
} else {
  console.log('✅ 100% BÀI KIỂM TRA ĐẠT CHUẨN XUẤT SẮC! HỆ THỐNG AN TOÀN TUYỆT ĐỐI!');
}
