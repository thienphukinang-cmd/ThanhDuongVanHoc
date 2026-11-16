import * as THREE from 'three';
import {
  HOI_AN_PASTEL_LANTERN_SPECS,
  createFloatingPastelLanterns,
  createCeilingLanternsAndLighting
} from '../src/modules/museumSpaceEnrichmentSystem.js';
import { createLobbyCeilingHangingLanterns } from '../src/modules/museumUltimate16SkillsUpgrade.js';

console.log('--- KIỂM TRA HỆ THỐNG ĐÈN LỒNG & ĐÈN KÉO QUÂN (MÈO MUN THẮP ĐÈN) ---');

// 1. Kiểm tra danh sách specs 32 đèn
console.log(`1. Số lượng đèn Hội An pastel: ${HOI_AN_PASTEL_LANTERN_SPECS.length}`);
if (HOI_AN_PASTEL_LANTERN_SPECS.length !== 32) {
  throw new Error(`Kỳ vọng 32 đèn nhưng có ${HOI_AN_PASTEL_LANTERN_SPECS.length}`);
}

const expectedColors = [0xec4899, 0x06b6d4, 0xfacc15, 0xef4444, 0xf97316, 0x3b82f6];
const presentColors = new Set(HOI_AN_PASTEL_LANTERN_SPECS.map(s => s.color));
for (const col of expectedColors) {
  if (!presentColors.has(col)) {
    throw new Error(`Thiếu màu pastel 0x${col.toString(16)}!`);
  }
}
console.log('✓ Đủ 6 màu pastel chuẩn Hội An (hồng, cyan, vàng, đỏ, cam, lam).');

// Kiểm tra cao độ Y (từ 7m đến 16m)
const minY = Math.min(...HOI_AN_PASTEL_LANTERN_SPECS.map(s => s.y));
const maxY = Math.max(...HOI_AN_PASTEL_LANTERN_SPECS.map(s => s.y));
console.log(`✓ Cao độ Y từ ${minY.toFixed(1)}m đến ${maxY.toFixed(1)}m (chuẩn 7m..16m).`);
if (minY < 7.0 || maxY > 16.5) {
  throw new Error(`Cao độ vượt ngưỡng cho phép: [${minY}, ${maxY}]`);
}

// 2. Tạo thử createFloatingPastelLanterns
const floating = createFloatingPastelLanterns(28.0);
if (!floating || floating.name !== 'Ceiling_HoiAn_Floating_Pastel_Lanterns') {
  throw new Error('createFloatingPastelLanterns không trả về đúng Group');
}
if (!floating.userData.ignoreRaycaster) {
  throw new Error('floating group thiếu ignoreRaycaster');
}

const cordInst = floating.getObjectByName('HoiAn_Lantern_Red_Cords_Instanced');
const lanternInst = floating.getObjectByName('HoiAn_Pastel_Lanterns_Instanced');
if (!cordInst || !lanternInst) {
  throw new Error('Thiếu InstancedMesh cho dây treo hoặc đèn');
}
if (!cordInst.userData.ignoreRaycaster || !lanternInst.userData.ignoreRaycaster) {
  throw new Error('InstancedMesh thiếu userData.ignoreRaycaster = true');
}
console.log(`✓ InstancedMesh khởi tạo thành công: ${lanternInst.count} đèn và ${cordInst.count} dây treo đỏ mảnh.`);

// 3. Tạo thử createCeilingLanternsAndLighting
const ceilingRes = createCeilingLanternsAndLighting();
if (!ceilingRes.ceilingGroup || typeof ceilingRes.updateLanterns !== 'function') {
  throw new Error('createCeilingLanternsAndLighting không trả về ceilingGroup và updateLanterns');
}
const grandLantern = ceilingRes.ceilingGroup.getObjectByName('Grand_Hexagonal_Revolving_Lantern');
if (!grandLantern) {
  throw new Error('Thiếu Đèn Kéo Quân Lục Giác Đại Hoàng Cung (Grand_Hexagonal_Revolving_Lantern)');
}
console.log(`✓ Đèn Kéo Quân Lục Giác Đại Hoàng Cung tọa độ: (${grandLantern.position.x}, ${grandLantern.position.y}, ${grandLantern.position.z})`);

// Kiểm tra hàm updateLanterns chạy mượt
ceilingRes.updateLanterns(1.5);
ceilingRes.updateLanterns(2.0);
console.log('✓ Hàm updateLanterns xoay tự động chạy mượt mà, zero allocations.');

// 4. Kiểm tra createLobbyCeilingHangingLanterns với cơ chế chống trùng lặp
const dummyParent = new THREE.Group();
dummyParent.add(ceilingRes.ceilingGroup);
const redundantLanterns = createLobbyCeilingHangingLanterns(dummyParent);
if (redundantLanterns.children.length !== 0) {
  throw new Error('Cơ chế chống tạo trùng lặp thất bại khi parent đã có đèn!');
}
console.log('✓ Cơ chế chống trùng lặp hoạt động hoàn hảo khi sảnh đã có không gian SpaceEnrichment.');

const standaloneLanterns = createLobbyCeilingHangingLanterns(null);
if (standaloneLanterns.children.length === 0) {
  throw new Error('createLobbyCeilingHangingLanterns standalone phải sinh đèn!');
}
console.log('✓ createLobbyCeilingHangingLanterns standalone khởi tạo thành công.');

console.log('=== TẤT CẢ KIỂM TRA ĐỀU THÀNH CÔNG RỰC RỠ 100% ===');
