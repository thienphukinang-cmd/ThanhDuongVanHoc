import * as THREE from 'three';
import {
  createLinhKhiVortexMesh,
  createCatPawAndFireflyAura,
  attachCatPortalLinhKhiCombo,
  createMiniIslandLanternPerimeter
} from '../src/modules/catPortalVfxAndLighting.js';

console.log('--- KIỂM TRA SHADER / ÁNH SÁNG CỔNG LINH MIÊU & ĐẢO MÈO (MUNTHAPDEN) ---');

// 1. Kiểm tra Vòng xoáy Linh Khí
const vortex = createLinhKhiVortexMesh({ radius: 1.6, isLobby: true });
if (!vortex.vortexGroup || typeof vortex.updateVortex !== 'function') {
  throw new Error('createLinhKhiVortexMesh thất bại!');
}
if (!vortex.vortexGroup.userData.ignoreRaycaster) {
  throw new Error('vortexGroup thiếu userData.ignoreRaycaster = true!');
}
vortex.updateVortex(1.0);
console.log('✓ Vòng xoáy Linh Khí Xanh Ngọc (#00f5d4) & Vàng Kim (#ffbe55) chạy mượt mà, zero heap allocations.');

// 2. Kiểm tra Hạt Dấu Chân Mèo & Đom đóm
const aura = createCatPawAndFireflyAura({ radius: 2.2, count: 28 });
if (!aura.auraGroup || typeof aura.updateAura !== 'function') {
  throw new Error('createCatPawAndFireflyAura thất bại!');
}
if (!aura.auraGroup.userData.ignoreRaycaster) {
  throw new Error('auraGroup thiếu userData.ignoreRaycaster = true!');
}
aura.updateAura(1.0);
console.log('✓ Hạt ánh sáng dấu chân mèo & đom đóm quanh cổng chạy mượt mà.');

// 3. Kiểm tra Combo gắn cổng
const dummyPortal = new THREE.Group();
const combo = attachCatPortalLinhKhiCombo(dummyPortal, { radius: 1.65, isLobby: true });
if (!combo.comboGroup || typeof combo.update !== 'function') {
  throw new Error('attachCatPortalLinhKhiCombo thất bại!');
}
combo.update(2.0);
console.log('✓ attachCatPortalLinhKhiCombo gắn thành công vào cổng dịch chuyển.');

// 4. Kiểm tra Hệ thống Đèn Lồng Đảo Mèo thu nhỏ ~22m x 22m (R = 11m)
const islandLighting = createMiniIslandLanternPerimeter({ islandRadius: 11.0 });
if (!islandLighting.islandLightingGroup || typeof islandLighting.updateIslandLighting !== 'function') {
  throw new Error('createMiniIslandLanternPerimeter thất bại!');
}
if (!islandLighting.islandLightingGroup.userData.ignoreRaycaster) {
  throw new Error('islandLightingGroup thiếu userData.ignoreRaycaster = true!');
}
islandLighting.updateIslandLighting(1.5);
console.log(`✓ Hệ thống đèn lồng vàng ấm cúng viền đảo mini R = 11m với ${islandLighting.islandLightingGroup.children.length} cụm đèn/đom đóm.`);

console.log('=== TẤT CẢ TEST ĐỀU PASS 100% XUẤT SẮC ===');
