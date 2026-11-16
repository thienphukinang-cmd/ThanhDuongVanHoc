import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const f of list) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(walk(full));
    } else if (full.endsWith('.js') || full.endsWith('.mjs')) {
      results.push(full);
    }
  }
  return results;
}

const files = walk('src');
console.log(`Checking ${files.length} JS files in src...`);
let errors = 0;
for (const f of files) {
  try {
    execSync(`node --check "${f}"`, { stdio: 'pipe' });
    console.log(`  [OK] ${f}`);
  } catch (err) {
    console.error(`  [SYNTAX ERROR] ${f}:\n${err.message}`);
    errors++;
  }
}

if (errors === 0) {
  console.log(`\n🎉 TOÀN BỘ ${files.length} FILE JS ĐẠT 100% CÚ PHÁP CHUẨN XÁC!`);
} else {
  console.error(`\n❌ CÓ ${errors} FILE BỊ LỖI CÚ PHÁP!`);
  process.exit(1);
}
