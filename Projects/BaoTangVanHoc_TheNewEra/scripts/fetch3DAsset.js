/**
 * FETCH 3D ASSET AUTOMATION TOOLKIT FOR ANTIGRAVITY (BAO TANG 3D)
 * Lead Architect & WebGL Tech Lead
 * 
 * Tự động tìm kiếm, tải xuống và chuẩn hóa mô hình 3D (.glb / .gltf) từ các kho tài nguyên mở:
 * 1. Poly Haven API (CC0 Models: Kiến trúc, đồ nội thất, chậu cây, tượng, hiện vật cổ...)
 * 2. Khronos Sample Models & Open WebGL Repositories (CC0 / Open Assets)
 * 3. Tải trực tiếp qua URL (.glb) với chuẩn hóa tên file snake_case không dấu
 * 4. Tự động đồng bộ vào cả public/model/ và public/models/ cùng thư mục gốc model/
 * 
 * Sử dụng CLI:
 *   node scripts/fetch3DAsset.js search <từ_khóa>
 *   node scripts/fetch3DAsset.js polyhaven <asset_id> [tên_chuẩn_hóa] [--res 1k|2k]
 *   node scripts/fetch3DAsset.js url <glb_url> <tên_chuẩn_hóa>
 *   node scripts/fetch3DAsset.js list
 *   node scripts/fetch3DAsset.js presets
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tìm các thư mục mục tiêu trong dự án
function getTargetDirs() {
  const projectRoot = path.resolve(__dirname, '..');
  const workspaceRoot = path.resolve(projectRoot, '..', '..');

  const dirs = {
    projectRoot,
    workspaceRoot,
    publicModel: path.join(projectRoot, 'public', 'model'),
    publicModels: path.join(projectRoot, 'public', 'models'),
    polyhavenDir: path.join(projectRoot, 'public', 'model', 'polyhaven'),
    rootModel: path.join(workspaceRoot, 'model')
  };

  // Đảm bảo tất cả các thư mục đích đều tồn tại
  for (const p of [dirs.publicModel, dirs.publicModels, dirs.polyhavenDir]) {
    if (!fs.existsSync(p)) {
      fs.mkdirSync(p, { recursive: true });
    }
  }
  if (fs.existsSync(workspaceRoot) && !fs.existsSync(dirs.rootModel)) {
    try {
      fs.mkdirSync(dirs.rootModel, { recursive: true });
    } catch (_) {}
  }

  return dirs;
}

/**
 * Chuẩn hóa tên file: loại bỏ dấu tiếng Việt, ký tự đặc biệt, chuyển thành snake_case
 * Ví dụ: "Đèn Lồng Cung Đình" -> "den_long_cung_dinh.glb"
 */
export function sanitizeModelName(name, ext = '.glb') {
  if (!name) return `model_${Date.now()}${ext}`;
  
  let clean = name.trim();
  // Bỏ phần mở rộng nếu có
  clean = clean.replace(/\.(glb|gltf|bin|blend|obj)$/i, '');

  // Chuẩn hóa tiếng Việt có dấu
  clean = clean
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd');

  // Thay ký tự không phải chữ/số bằng dấu gạch dưới
  clean = clean.replace(/[^a-zA-Z0-9_-]/g, '_');

  // Gộp nhiều dấu gạch dưới liên tiếp
  clean = clean.replace(/_+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();

  if (!clean) clean = `model_${Date.now()}`;
  return clean.endsWith(ext) ? clean : `${clean}${ext}`;
}

/**
 * Tải file từ internet về đường dẫn local bằng fetch (Node 18+)
 */
export async function downloadFile(url, destPath) {
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log(`[DOWNLOAD] Đang tải: ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Tải thất bại [${res.status} ${res.statusText}]: ${url}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  fs.writeFileSync(destPath, buffer);
  console.log(`[SAVED] Đã lưu (${(buffer.length / 1024 / 1024).toFixed(2)} MB) -> ${destPath}`);
  return buffer.length;
}

/**
 * Đồng bộ file sang các thư mục public/model/, public/models/ và root model/
 */
function syncModelFiles(sourcePath, fileName) {
  const dirs = getTargetDirs();
  const targets = [
    path.join(dirs.publicModel, fileName),
    path.join(dirs.publicModels, fileName)
  ];
  if (fs.existsSync(dirs.rootModel)) {
    targets.push(path.join(dirs.rootModel, fileName));
  }

  for (const target of targets) {
    if (path.resolve(sourcePath) !== path.resolve(target)) {
      try {
        fs.copyFileSync(sourcePath, target);
        console.log(`[SYNC] Đã đồng bộ sang: ${target}`);
      } catch (err) {
        console.warn(`[SYNC-WARN] Không thể copy sang ${target}:`, err.message);
      }
    }
  }
}

/**
 * 1. TÌM KIẾM TRÊN POLY HAVEN API (CC0)
 */
export async function searchPolyhaven(keyword) {
  console.log(`[POLYHAVEN] Đang tìm kiếm các mô hình với từ khóa: "${keyword}"...`);
  const res = await fetch('https://api.polyhaven.com/assets?t=models');
  if (!res.ok) {
    throw new Error(`Không thể kết nối đến Poly Haven API: ${res.status}`);
  }

  const allAssets = await res.json();
  const lowerKw = keyword.toLowerCase().trim();

  const results = [];
  for (const [id, item] of Object.entries(allAssets)) {
    const nameMatch = item.name && item.name.toLowerCase().includes(lowerKw);
    const tagMatch = Array.isArray(item.tags) && item.tags.some(t => t.toLowerCase().includes(lowerKw));
    const catMatch = Array.isArray(item.categories) && item.categories.some(c => c.toLowerCase().includes(lowerKw));
    const descMatch = item.description && item.description.toLowerCase().includes(lowerKw);

    if (nameMatch || tagMatch || catMatch || descMatch) {
      results.push({
        id,
        name: item.name,
        categories: item.categories || [],
        tags: item.tags || [],
        polycount: item.polycount,
        dimensions: item.dimensions ? item.dimensions.map(d => (d / 1000).toFixed(2) + 'm').join(' x ') : 'N/A',
        thumbnail: item.thumbnail_url,
        description: item.description
      });
    }
  }

  return results;
}

/**
 * 2. TẢI ASSET TỪ POLY HAVEN (GLTF + BIN + TEXTURES CC0)
 */
export async function fetchPolyhavenAsset(assetId, customName = null, resolution = '1k') {
  const dirs = getTargetDirs();
  console.log(`[POLYHAVEN] Đang lấy thông tin tệp cho asset "${assetId}" (res: ${resolution})...`);

  const fileInfoRes = await fetch(`https://api.polyhaven.com/files/${assetId}`);
  if (!fileInfoRes.ok) {
    throw new Error(`Không tìm thấy asset Poly Haven "${assetId}": ${fileInfoRes.status}`);
  }

  const fileInfo = await fileInfoRes.json();
  if (!fileInfo.gltf) {
    throw new Error(`Asset "${assetId}" không có định dạng glTF.`);
  }

  const targetRes = fileInfo.gltf[resolution] ? resolution : (fileInfo.gltf['1k'] ? '1k' : Object.keys(fileInfo.gltf)[0]);
  const gltfData = fileInfo.gltf[targetRes]?.gltf;

  if (!gltfData || !gltfData.url) {
    throw new Error(`Không tìm thấy URL glTF cho asset "${assetId}" ở độ phân giải ${targetRes}`);
  }

  const folderName = customName ? sanitizeModelName(customName, '').replace(/\.glb$/, '') : assetId.toLowerCase();
  const assetDir = path.join(dirs.polyhavenDir, folderName);

  if (!fs.existsSync(assetDir)) {
    fs.mkdirSync(assetDir, { recursive: true });
  }

  // Tải file .gltf chính
  const gltfFileName = `${folderName}_${targetRes}.gltf`;
  const gltfDest = path.join(assetDir, gltfFileName);
  await downloadFile(gltfData.url, gltfDest);

  // Tải các dependencies (bin và textures)
  if (gltfData.include) {
    for (const [relPath, incInfo] of Object.entries(gltfData.include)) {
      const incDest = path.join(assetDir, relPath);
      await downloadFile(incInfo.url, incDest);
    }
  }

  // Đồng bộ cả thư mục sang public/models/polyhaven nếu cần
  const altPolyhavenDir = path.join(dirs.publicModels, 'polyhaven', folderName);
  try {
    fs.cpSync(assetDir, altPolyhavenDir, { recursive: true });
    console.log(`[SYNC] Đã đồng bộ thư mục Poly Haven sang: ${altPolyhavenDir}`);
  } catch (err) {
    console.warn(`[SYNC-WARN]`, err.message);
  }

  const webPathPrimary = `/model/polyhaven/${folderName}/${gltfFileName}`;
  const webPathAlt = `/models/polyhaven/${folderName}/${gltfFileName}`;

  console.log(`\n======================================================`);
  console.log(`[THÀNH CÔNG] Đã tải asset Poly Haven "${assetId}"!`);
  console.log(`-> Đường dẫn Three.js URL: "${webPathPrimary}"`);
  console.log(`-> Đường dẫn Fallback:    "${webPathAlt}"`);
  console.log(`======================================================\n`);

  return {
    folderName,
    gltfFileName,
    assetDir,
    webPathPrimary,
    webPathAlt
  };
}

/**
 * 3. TẢI TRỰC TIẾP FILE .GLB TỪ BẤT KỲ ĐƯỜNG LINK MỞ NÀO
 */
export async function downloadGlbFromUrl(url, customName) {
  const dirs = getTargetDirs();
  const cleanFileName = sanitizeModelName(customName || path.basename(new URL(url).pathname), '.glb');
  const targetPath = path.join(dirs.publicModel, cleanFileName);

  console.log(`[FETCH-GLB] Đang tải file .glb từ: ${url}`);
  console.log(`[FETCH-GLB] Tên file chuẩn hóa: ${cleanFileName}`);

  await downloadFile(url, targetPath);

  // Kiểm tra header magic bytes của file .glb (phải bắt đầu bằng 'glTF')
  const fd = fs.openSync(targetPath, 'r');
  const magic = Buffer.alloc(4);
  fs.readSync(fd, magic, 0, 4, 0);
  fs.closeSync(fd);

  const magicStr = magic.toString('ascii');
  if (magicStr !== 'glTF') {
    console.warn(`[CẢNH BÁO] File tải về không có magic header "glTF" (Header thực tế: "${magicStr}"). Vui lòng kiểm tra lại URL có trỏ trực tiếp đến binary .glb không.`);
  } else {
    console.log(`[XÁC THỰC] Magic header GLB hợp lệ: "${magicStr}" OK.`);
  }

  // Đồng bộ file sang public/models/ và root model/
  syncModelFiles(targetPath, cleanFileName);

  const webPathPrimary = `/model/${cleanFileName}`;
  const webPathAlt = `/models/${cleanFileName}`;

  console.log(`\n======================================================`);
  console.log(`[THÀNH CÔNG] Đã tải và đồng bộ mô hình: ${cleanFileName}`);
  console.log(`-> Đường dẫn Three.js: "${webPathPrimary}"`);
  console.log(`-> Fallback URL:       "${webPathAlt}"`);
  console.log(`======================================================\n`);

  return {
    fileName: cleanFileName,
    webPathPrimary,
    webPathAlt
  };
}

/**
 * DANH SÁCH CÁC MẪU ASSET MỞ PHỔ BIẾN (CC0 PRESETS)
 * Giúp Antigravity có thể tức thì tải các vật phẩm bảo tàng thông dụng
 */
export const OPEN_ASSET_PRESETS = {
  // Đồ gốm / Hiện vật cổ
  'antique_vase': {
    source: 'polyhaven',
    id: 'antique_ceramic_vase_01',
    cleanName: 'binh_gom_hoa_lam_co',
    description: 'Bình gốm sứ hoa lam cổ điển CC0'
  },
  'wooden_elephant': {
    source: 'polyhaven',
    id: 'carved_wooden_elephant',
    cleanName: 'voi_go_cham_khac',
    description: 'Tượng voi gỗ chạm khắc hoàng gia'
  },
  'horse_statue': {
    source: 'polyhaven',
    id: 'horse_statue_01',
    cleanName: 'tuong_ngua_chien',
    description: 'Tượng ngựa chiến dũng mãnh'
  },
  'wooden_bench': {
    source: 'polyhaven',
    id: 'painted_wooden_bench',
    cleanName: 'ghe_go_co_kinh',
    description: 'Ghế dài gỗ sơn son cổ kính bảo tàng'
  },
  'potted_plant': {
    source: 'polyhaven',
    id: 'potted_plant_04',
    cleanName: 'chau_cay_canh',
    description: 'Chậu cây kiểng trang trí đại sảnh'
  },
  // Khronos CC0 Standard Assets
  'lantern': {
    source: 'url',
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/Lantern/glTF-Binary/Lantern.glb',
    cleanName: 'den_long_co.glb',
    description: 'Đèn lồng kim loại cổ kính phát sáng'
  },
  'damaged_helmet': {
    source: 'url',
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/DamagedHelmet/glTF-Binary/DamagedHelmet.glb',
    cleanName: 'mu_giap_chien_binh.glb',
    description: 'Mũ giáp chiến binh cổ đại'
  },
  'water_bottle': {
    source: 'url',
    url: 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/WaterBottle/glTF-Binary/WaterBottle.glb',
    cleanName: 'binh_nuoc_hanh_quan.glb',
    description: 'Bình nước hành quân cổ'
  }
};

/**
 * Liệt kê tất cả mô hình hiện có trong thư mục public/model/
 */
export function listLocalModels() {
  const dirs = getTargetDirs();
  console.log(`\n--- DANH SÁCH MÔ HÌNH HIỆN CÓ TẠI ${dirs.publicModel} ---`);
  if (!fs.existsSync(dirs.publicModel)) {
    console.log('Thư mục trống.');
    return [];
  }

  const files = fs.readdirSync(dirs.publicModel);
  const models = [];
  for (const f of files) {
    const full = path.join(dirs.publicModel, f);
    const stat = fs.statSync(full);
    if (stat.isFile() && (f.endsWith('.glb') || f.endsWith('.gltf'))) {
      models.push({ name: f, sizeMb: (stat.size / 1024 / 1024).toFixed(2) });
      console.log(` • ${f.padEnd(35)} [${(stat.size / 1024 / 1024).toFixed(2)} MB]`);
    } else if (stat.isDirectory()) {
      console.log(` [DIR] ${f}/`);
    }
  }
  return models;
}

// CLI RUNNER
async function runCli() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    console.log(`
CÔNG CỤ TỰ ĐỘNG TÌM VÀ TẢI MÔ HÌNH 3D (.GLB/.GLTF) - ANTIGRAVITY 3D
------------------------------------------------------------------
Lệnh khả dụng:
  search <từ_khóa>                   Tìm kiếm mô hình trên Poly Haven CC0
  polyhaven <assetId> [tên_chuẩn]    Tải mô hình Poly Haven về thư mục public
  url <glb_url> <tên_chuẩn>          Tải trực tiếp file .glb từ internet
  preset <preset_key>                Tải nhanh một mô hình CC0 có sẵn trong thư viện
  presets                            Liệt kê danh sách presets
  list                               Liệt kê mô hình hiện có trong dự án
    `);
    return;
  }

  try {
    if (command === 'search') {
      const keyword = args[1] || 'vase';
      const results = await searchPolyhaven(keyword);
      console.log(`Tìm thấy ${results.length} kết quả phù hợp với "${keyword}":\n`);
      for (const item of results.slice(0, 15)) {
        console.log(`• ID: ${item.id}`);
        console.log(`  Tên:        ${item.name}`);
        console.log(`  Danh mục:   ${item.categories.join(', ')}`);
        console.log(`  Tags:       ${item.tags.slice(0, 6).join(', ')}`);
        console.log(`  Kích thước: ${item.dimensions} | Polys: ${item.polycount}`);
        console.log(`  Lệnh tải:   node scripts/fetch3DAsset.js polyhaven ${item.id} <tên_tùy_chọn>\n`);
      }
    } else if (command === 'polyhaven') {
      const assetId = args[1];
      if (!assetId) {
        console.error('Lỗi: Cần cung cấp assetId. Ví dụ: node scripts/fetch3DAsset.js polyhaven antique_ceramic_vase_01 binh_hoa');
        return;
      }
      const customName = args[2] || assetId;
      await fetchPolyhavenAsset(assetId, customName, '1k');
    } else if (command === 'url') {
      const url = args[1];
      const customName = args[2];
      if (!url || !customName) {
        console.error('Lỗi: Cần URL và tên file. Ví dụ: node scripts/fetch3DAsset.js url https://example.com/tree.glb cay_co');
        return;
      }
      await downloadGlbFromUrl(url, customName);
    } else if (command === 'preset') {
      const key = args[1];
      const preset = OPEN_ASSET_PRESETS[key];
      if (!preset) {
        console.error(`Không tìm thấy preset "${key}". Dùng "presets" để xem danh sách.`);
        return;
      }
      console.log(`[PRESET] Đang tải preset: ${preset.description}...`);
      if (preset.source === 'polyhaven') {
        await fetchPolyhavenAsset(preset.id, preset.cleanName, '1k');
      } else if (preset.source === 'url') {
        await downloadGlbFromUrl(preset.url, preset.cleanName);
      }
    } else if (command === 'presets') {
      console.log('\n--- DANH SÁCH CC0 ASSET PRESETS KHẢ DỤNG ---');
      for (const [k, p] of Object.entries(OPEN_ASSET_PRESETS)) {
        console.log(`• [${k}]: ${p.description} (Lệnh tải: node scripts/fetch3DAsset.js preset ${k})`);
      }
    } else if (command === 'list') {
      listLocalModels();
    } else {
      console.warn(`Lệnh không rõ: "${command}". Dùng --help để xem hướng dẫn.`);
    }
  } catch (err) {
    console.error(`[LỖI THỰC THI]`, err);
    process.exit(1);
  }
}

if (process.argv[1] && process.argv[1].endsWith('fetch3DAsset.js')) {
  runCli();
}
