#!/usr/bin/env node
/**
 * ============================================================================
 * AI AGENT CLI RUNNER: MUSEUM ARCHITECT
 * Vietnamese Literature 3D Museum Lead WebGL Architect & Cultural Heritage Curator
 * ============================================================================
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const AGENT_SPEC = {
  name: 'museum_architect',
  displayName: 'Vietnamese 3D Museum Architect & Heritage Curator',
  version: '2.1.0',
  role: 'Lead WebGL Architect & Cultural Heritage Art Director',
  skills: [
    'museum-exhibition-curator',
    'cultural-heritage-modeler',
    'ornamental-relief-sculptor',
    'threejs-auto-integrator',
    'shader-coloring-artist',
    'water-mountain-vfx-sculptor',
    'mesh-detailing-specialist',
    'interactive-lore-guide',
    'audio-soundscape-director',
    'camera-director',
    'educational-tour-guide-director',
    'hitbox-collision-architect',
    'web-xr-teleport-controller',
    'fps-optimizer'
  ]
};

function logHeader(text) {
  console.log('\n' + '='.repeat(70));
  console.log(`  🏛  ${text}`);
  console.log('='.repeat(70));
}

function showInfo() {
  logHeader('THÔNG TIN AI AGENT: MUSEUM ARCHITECT');
  console.log(`  • Tên Agent:        ${AGENT_SPEC.name}`);
  console.log(`  • Danh Hiệu:        ${AGENT_SPEC.displayName}`);
  console.log(`  • Phiên Bản:        ${AGENT_SPEC.version}`);
  console.log(`  • Vai Trò:          ${AGENT_SPEC.role}`);
  console.log(`\n  📚 14 Kỹ Năng Tích Hợp Đồng Bộ:`);
  AGENT_SPEC.skills.forEach((skill, i) => {
    console.log(`    ${(i + 1).toString().padStart(2, ' ')}. ${skill}`);
  });
  console.log('\n  🎯 Quy Tắc Cốt Lõi:');
  console.log('    - Giữ thông thoáng 100% trục đường đi trung tâm (|X| <= 2.3m).');
  console.log('    - Khử sạch NaN/Infinity vertex buffer (zero NaN poisoning).');
  console.log('    - InstancedMesh cho mọi chi tiết lặp lại (1 Draw Call).');
  console.log('    - Kiểm chứng 3 tầng: node --check -> npm build -> Edge CDP QA.\n');
}

function runVerify() {
  logHeader('BƯỚC 1/2: KIỂM TRA BUILD TĨNH (VITE BUILD)');
  try {
    execSync('npm.cmd run build', { cwd: ROOT_DIR, stdio: 'inherit' });
    console.log('\n✅ [PASS] Build tĩnh thành công! Exit Code: 0');
  } catch (err) {
    console.error('\n❌ [FAIL] Lỗi build tĩnh:', err.message);
    process.exit(1);
  }

  logHeader('BƯỚC 2/2: KIỂM THỬ RUNTIME WEBGL (EDGE HEADLESS + CDP)');
  try {
    execSync('node scripts/qa_enrichment_verifier.mjs', { cwd: ROOT_DIR, stdio: 'inherit' });
    console.log('\n✅ [PASS] Runtime WebGL đạt chuẩn 60+ FPS, 0 lỗi console/network!');
  } catch (err) {
    console.error('\n❌ [FAIL] Lỗi kiểm thử runtime:', err.message);
    process.exit(1);
  }
}

function runAudit() {
  logHeader('RÀ SOÁT CẤU TRÚC & QUY HOẠCH KHÔNG GIAN BẢO TÀNG');
  const filesToCheck = [
    'src/modules/museumLobbyCorridorDecorator.js',
    'src/modules/museumSpaceEnrichmentSystem.js',
    'src/modules/museumThienThuBook3D.js',
    'src/modules/museumLobbyVFXAndArtifacts.js'
  ];

  let passed = true;
  filesToCheck.forEach((relPath) => {
    const fullPath = path.join(ROOT_DIR, relPath);
    if (!fs.existsSync(fullPath)) {
      console.log(`  ❌ Thiếu file: ${relPath}`);
      passed = false;
      return;
    }
    try {
      execSync(`node --check ${relPath}`, { cwd: ROOT_DIR, stdio: 'pipe' });
      console.log(`  ✅ Cú pháp hợp lệ: ${relPath}`);
    } catch (err) {
      console.log(`  ❌ Lỗi cú pháp trong ${relPath}:`, err.message);
      passed = false;
    }
  });

  if (passed) {
    console.log('\n🎉 Rà soát hoàn tất: Tất cả module kiến trúc cốt lõi đều đạt chuẩn!');
  } else {
    process.exit(1);
  }
}

const action = process.argv[2] || 'info';

switch (action) {
  case 'info':
    showInfo();
    break;
  case 'verify':
    runVerify();
    break;
  case 'audit':
    runAudit();
    break;
  default:
    console.log(`Lệnh không hợp lệ: "${action}". Các lệnh hỗ trợ: info, verify, audit`);
    process.exit(1);
}
