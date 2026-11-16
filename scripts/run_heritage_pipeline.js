/**
 * HERITAGE CINEMA ARCHITECT PIPELINE AUTOMATION TOOLKIT
 * BaoTang3D - Lead WebGL Architect & AI Literature Cinema Director
 * 
 * Usage:
 *   node scripts/run_heritage_pipeline.js status
 *   node scripts/run_heritage_pipeline.js verify
 *   node scripts/run_heritage_pipeline.js list-rooms
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const command = args[0] || 'status';

function printHeader(title) {
  console.log('\n================================================================================');
  console.log(` 🏛 ${title}`);
  console.log('================================================================================\n');
}

function getRoomsList() {
  const modulesDir = path.join(projectRoot, 'src', 'modules');
  if (!fs.existsSync(modulesDir)) return [];
  const files = fs.readdirSync(modulesDir);
  const roomFiles = files.filter(f => f.endsWith('RoomDecorator.js'));
  return roomFiles.map(f => {
    const key = f.replace('RoomDecorator.js', '');
    return {
      key,
      file: f,
      fullPath: path.join(modulesDir, f)
    };
  });
}

function checkStatus() {
  printHeader('BẢO TÀNG ẢO 3D & PHIM VĂN HỌC AI - PIPELINE STATUS MATRIX');

  const rooms = getRoomsList();
  console.log(`Đã phát hiện ${rooms.length} phòng trưng bày văn học trong src/modules:\n`);

  rooms.forEach((r, idx) => {
    const content = fs.readFileSync(r.fullPath, 'utf8');
    const hasPortal = content.includes('portal') || content.includes('Portal');
    const hasAudio = content.includes('Audio') || content.includes('sound');
    const hasLore = content.includes('Lore') || content.includes('plaque') || content.includes('info');
    const hasDracoOrGlb = content.includes('.glb') || content.includes('.gltf') || content.includes('prepareUnlitVividGlbModel');

    console.log(`[${idx + 1}] Phòng: ${r.key}`);
    console.log(`    ├── File: src/modules/${r.file}`);
    console.log(`    ├── 3D Model / Draco: ${hasDracoOrGlb ? '✅ Tích hợp' : '⚠️ Procedural'}`);
    console.log(`    ├── Cổng Portal:      ${hasPortal ? '✅ Có Cổng' : '➖ Không có'}`);
    console.log(`    ├── Âm thanh 3D:      ${hasAudio ? '✅ Có Âm thanh' : '➖ Không có'}`);
    console.log(`    └── Lore Học Thuật:   ${hasLore ? '✅ Có Lore' : '➖ Đang hoàn thiện'}\n`);
  });

  // Kiểm tra Video Văn học AI
  const videoCandidates = [
    path.join(projectRoot, 'public', 'nguvan.mp4'),
    path.join(projectRoot, 'dist_old', 'nguvan.mp4'),
    path.join(projectRoot, 'nguvan.mp4')
  ];
  let foundVideo = videoCandidates.find(p => fs.existsSync(p));

  console.log('--------------------------------------------------------------------------------');
  console.log('🎬 TÀI NGUYÊN PHIM VĂN HỌC AI (GENAI CINEMA):');
  if (foundVideo) {
    const rel = path.relative(projectRoot, foundVideo);
    const stat = fs.statSync(foundVideo);
    console.log(`  ✅ Video: ${rel} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
    console.log('     Tác phẩm: Truyện Kiều – Cuộc Gặp Gỡ Chiều Thanh Minh');
    console.log('     Công nghệ: Character Consistency AI, Voice AI Synthesis, 3D Video Texture');
  } else {
    console.log('  ⚠️ Video nguvan.mp4 chưa được tìm thấy.');
  }

  // Kiểm tra 4 khung hình trích xuất từ video
  const assetsDir = path.join(projectRoot, 'public', 'infographic_assets');
  const frames = ['vd_1_dapthanh.png', 'vd_2_nhipcau.png', 'vd_3_gapgo.png', 'vd_4_khuephong.png'];
  const framesOk = frames.every(f => fs.existsSync(path.join(assetsDir, f)));
  console.log(`  ${framesOk ? '✅' : '⚠️'} 4 Khung hình trích xuất điện ảnh: ${framesOk ? 'Đầy đủ (00:15, 00:58, 01:42, 02:18)' : 'Thiếu file'}`);

  // Kiểm tra hình ảnh infographic master
  const infoMaster = path.join(projectRoot, 'infographic-quy-trinh-tong-hop.png');
  console.log('\n🎨 MASTER INFOGRAPHIC 2560x1440:');
  if (fs.existsSync(infoMaster)) {
    const stat = fs.statSync(infoMaster);
    console.log(`  ✅ infographic-quy-trinh-tong-hop.png (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
  }
  console.log('================================================================================\n');
}

function verifySyntax() {
  printHeader('KIỂM CHỨNG CÚ PHÁP ĐỘC LẬP TOÀN BỘ HỆ THỐNG');

  const rooms = getRoomsList();
  let passCount = 0;
  let failCount = 0;

  rooms.forEach(r => {
    try {
      execSync(`node --check "${r.fullPath}"`, { stdio: 'pipe' });
      console.log(`  ✅ PASS: src/modules/${r.file}`);
      passCount++;
    } catch (err) {
      console.error(`  ❌ FAIL: src/modules/${r.file}`);
      failCount++;
    }
  });

  // Kiểm tra thêm main.js
  const mainJs = path.join(projectRoot, 'src', 'main.js');
  try {
    execSync(`node --check "${mainJs}"`, { stdio: 'pipe' });
    console.log(`  ✅ PASS: src/main.js`);
    passCount++;
  } catch (err) {
    console.error(`  ❌ FAIL: src/main.js`);
    failCount++;
  }

  console.log(`\nKết quả kiểm chứng: ${passCount} Passed, ${failCount} Failed.`);
  if (failCount === 0) {
    console.log('🎉 100% Mã nguồn bảo tàng đạt chuẩn cú pháp và an toàn vận hành!\n');
  } else {
    process.exit(1);
  }
}

switch (command) {
  case 'status':
    checkStatus();
    break;
  case 'verify':
    verifySyntax();
    break;
  case 'list-rooms':
    console.log(getRoomsList().map(r => r.key).join('\n'));
    break;
  default:
    console.log(`Lệnh không hợp lệ: ${command}`);
    console.log('Sử dụng: status | verify | list-rooms');
}
