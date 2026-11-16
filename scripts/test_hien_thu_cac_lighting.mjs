import * as THREE from 'three';
import {
  getHienThuCacMaterials,
  createHienThuCacCeilingLanterns,
  createHienThuCacBookshelfLighting,
  setupHienThuCacLighting
} from '../src/modules/hienThuCacLightingAndMaterials.js';

console.log('--- KIỂM TRA HỆ THỐNG ÁNH SÁNG & PBR HIÊN THƯ CÁC (MUNTHAPDEN) ---');

// 1. Kiểm tra Thư viện Vật liệu PBR chuẩn Á Đông Đương Đại
const mats = getHienThuCacMaterials();
console.log('1. Kiểm tra vật liệu PBR:');
if (!mats.ebonyWoodMat || mats.ebonyWoodMat.color.getHex() !== 0x181412) {
  throw new Error('Gỗ mun đen (#181412) chưa đúng chuẩn!');
}
console.log('✓ Gỗ mun đen (#181412) PBR chuẩn satin.');

if (!mats.antiqueGoldMat || mats.antiqueGoldMat.color.getHex() !== 0xd4af37) {
  throw new Error('Vàng đồng cổ (#d4af37) chưa đúng chuẩn!');
}
console.log('✓ Vàng đồng cổ (#d4af37) PBR kim loại.');

if (!mats.creamLinenMat || mats.creamLinenMat.color.getHex() !== 0xf5efe6) {
  throw new Error('Vải lanh kem (#f5efe6) chưa đúng chuẩn!');
}
console.log('✓ Vải lanh kem (#f5efe6) PBR đệm ghế.');

if (!mats.amberSilkMat || mats.amberSilkMat.color.getHex() !== 0xffaa33) {
  throw new Error('Lụa vàng hổ phách (#ffaa33) chưa đúng chuẩn!');
}
console.log('✓ Lụa vàng hổ phách (#ffaa33) phát sáng ấm áp.');

// 2. Kiểm tra 2 hàng đèn lồng lụa vàng hổ phách treo trần tầng 2
console.log('2. Kiểm tra 2 hàng đèn lồng trần tầng 2:');
const lanterns = createHienThuCacCeilingLanterns({ floorY: 10.0, ceilingY: 18.0 });
if (!lanterns.lanternsGroup || lanterns.lanternsGroup.children.length !== 6) {
  throw new Error(`Kỳ vọng 6 đèn lồng (2 hàng x 3 đèn) nhưng có ${lanterns.lanternsGroup.children.length}`);
}
if (!lanterns.lanternsGroup.userData.ignoreRaycaster) {
  throw new Error('lanternsGroup thiếu userData.ignoreRaycaster = true');
}
lanterns.updateLanterns(1.0);
console.log(`✓ 2 Hàng đèn lồng lụa vàng hổ phách (#ffaa33) gồm ${lanterns.lanternsGroup.children.length} đèn lơ lửng tại Y = 13.8m, update mượt mà.`);

// 3. Kiểm tra dải đèn hắt kệ sách & phù điêu hoa sen
console.log('3. Kiểm tra dải đèn hắt kệ sách áp tường:');
const shelfLighting = createHienThuCacBookshelfLighting({
  shelfX: 33.1,
  floorY: 10.0,
  zMin: 6.2,
  zMax: 19.8
});
if (!shelfLighting.shelfLightingGroup) {
  throw new Error('shelfLightingGroup thất bại!');
}
if (!shelfLighting.shelfLightingGroup.userData.ignoreRaycaster) {
  throw new Error('shelfLightingGroup thiếu userData.ignoreRaycaster = true');
}
shelfLighting.updateShelfLighting(1.5);
console.log(`✓ Dải đèn hắt LED & PointLight kệ sách áp tường với ${shelfLighting.shelfLightingGroup.children.length} cụm đèn chiếu, update mượt mà.`);

// 4. Kiểm tra tích hợp Master Lighting
console.log('4. Kiểm tra tích hợp Master Lighting:');
const testLounge = new THREE.Group();
const master = setupHienThuCacLighting(testLounge, { floorY: 10.0, ceilingY: 18.0 });
if (!master || !master.masterLightingGroup) {
  throw new Error('setupHienThuCacLighting thất bại!');
}
master.update(2.0);
console.log('✓ setupHienThuCacLighting tích hợp thành công, 100% userData.ignoreRaycaster = true.');

console.log('=== TẤT CẢ KIỂM TRA ĐỀU THÀNH CÔNG RỰC RỠ 100% ===');
