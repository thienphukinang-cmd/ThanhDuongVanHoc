/**
 * FETCH LOBBY MODELS AUTOMATION SCRIPT FOR BAO TANG VAN HOC 3D
 * Poly Haven API CC0 Downloader & GLB Packer
 * 
 * Tự động tải 4 mô hình trang trí Đại Sảnh & Hành Lang:
 * 1. lobby_vase.glb (Lục bình đồng cổ - brass_vase_01)
 * 2. lobby_plant.glb (Chậu cây cảnh đại sảnh - potted_plant_01)
 * 3. lobby_chandelier.glb (Đèn chùm hoàng cung treo vòm sảnh - chinese_chandelier)
 * 4. lobby_pedestal.glb (Đôn gỗ trưng bày cổ điển - ClassicNightstand_01)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(projectRoot, '..', '..');

const TARGET_MODELS = [
  {
    assetId: 'brass_vase_01',
    fileName: 'lobby_vase.glb',
    title: 'Lục bình đồng cổ',
    resolution: '1k'
  },
  {
    assetId: 'potted_plant_01',
    fileName: 'lobby_plant.glb',
    title: 'Chậu cây cảnh đại sảnh',
    resolution: '1k'
  },
  {
    assetId: 'chinese_chandelier',
    fileName: 'lobby_chandelier.glb',
    title: 'Đèn chùm hoàng cung vòm sảnh',
    resolution: '1k'
  },
  {
    assetId: 'ClassicNightstand_01',
    fileName: 'lobby_pedestal.glb',
    title: 'Đôn gỗ trưng bày cổ điển',
    resolution: '1k'
  }
];

function ensureDir(p) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
  }
}

/**
 * Đóng gói glTF + bin + images thành 1 file .GLB nhị phân duy nhất
 */
export function packGltfToGlb(gltfJson, binBuffer, imageMap = {}) {
  const json = JSON.parse(JSON.stringify(gltfJson));
  let currentBin = binBuffer ? Buffer.from(binBuffer) : Buffer.alloc(0);

  function padBuffer(buf, padByte = 0x00) {
    const rem = buf.length % 4;
    if (rem === 0) return buf;
    const padding = 4 - rem;
    return Buffer.concat([buf, Buffer.alloc(padding, padByte)]);
  }

  currentBin = padBuffer(currentBin);

  if (!json.bufferViews) json.bufferViews = [];
  if (!json.buffers) json.buffers = [{ byteLength: 0 }];

  if (Array.isArray(json.images)) {
    json.images.forEach((img) => {
      const normUri = img.uri ? img.uri.replace(/^\.\//, '') : '';
      const matchedKey = Object.keys(imageMap).find(
        k => k === img.uri || k === normUri || k.endsWith(img.uri) || (img.uri && img.uri.endsWith(k))
      );

      if (matchedKey && imageMap[matchedKey]) {
        const imgBuf = imageMap[matchedKey];
        const offset = currentBin.length;
        const length = imgBuf.length;

        const bvIdx = json.bufferViews.length;
        json.bufferViews.push({
          buffer: 0,
          byteOffset: offset,
          byteLength: length
        });

        currentBin = padBuffer(Buffer.concat([currentBin, imgBuf]));

        const ext = path.extname(img.uri || '').toLowerCase();
        const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';

        delete img.uri;
        img.bufferView = bvIdx;
        img.mimeType = mimeType;
      }
    });
  }

  json.buffers = [{ byteLength: currentBin.length }];

  const jsonString = JSON.stringify(json);
  let jsonBuffer = Buffer.from(jsonString, 'utf8');
  jsonBuffer = padBuffer(jsonBuffer, 0x20); // Pad with spaces

  const totalLength = 12 + 8 + jsonBuffer.length + 8 + currentBin.length;
  const glbBuffer = Buffer.alloc(totalLength);

  let pos = 0;
  // Header: magic 'glTF' (0x46546C67), version 2, totalLength
  glbBuffer.writeUInt32LE(0x46546C67, pos); pos += 4;
  glbBuffer.writeUInt32LE(2, pos); pos += 4;
  glbBuffer.writeUInt32LE(totalLength, pos); pos += 4;

  // Chunk 0: JSON
  glbBuffer.writeUInt32LE(jsonBuffer.length, pos); pos += 4;
  glbBuffer.writeUInt32LE(0x4E4F534A, pos); pos += 4; // 'JSON'
  jsonBuffer.copy(glbBuffer, pos); pos += jsonBuffer.length;

  // Chunk 1: BIN
  glbBuffer.writeUInt32LE(currentBin.length, pos); pos += 4;
  glbBuffer.writeUInt32LE(0x004E4942, pos); pos += 4; // 'BIN\0'
  currentBin.copy(glbBuffer, pos); pos += currentBin.length;

  return glbBuffer;
}

export async function fetchLobbyModel(item) {
  const { assetId, fileName, title, resolution = '1k' } = item;
  console.log(`\n--------------------------------------------------------------`);
  console.log(`[POLYHAVEN] Bắt đầu tải "${title}" (Asset: ${assetId})...`);

  const fileInfoUrl = `https://api.polyhaven.com/files/${assetId}`;
  const fileInfoRes = await fetch(fileInfoUrl);
  if (!fileInfoRes.ok) {
    throw new Error(`Không thể lấy thông tin asset "${assetId}": ${fileInfoRes.status}`);
  }

  const fileInfo = await fileInfoRes.json();
  if (!fileInfo.gltf) {
    throw new Error(`Asset "${assetId}" không có định dạng glTF.`);
  }

  const targetRes = fileInfo.gltf[resolution] ? resolution : (fileInfo.gltf['1k'] ? '1k' : Object.keys(fileInfo.gltf)[0]);
  const gltfMeta = fileInfo.gltf[targetRes]?.gltf;

  if (!gltfMeta || !gltfMeta.url) {
    throw new Error(`Không tìm thấy glTF url cho ${assetId} ở độ phân giải ${targetRes}`);
  }

  console.log(`[DOWNLOAD] Đang tải glTF descriptor: ${gltfMeta.url}`);
  const gltfJson = await fetch(gltfMeta.url).then(r => r.json());

  let binBuf = null;
  const imageMap = {};

  for (const [relPath, incInfo] of Object.entries(gltfMeta.include || {})) {
    console.log(`  -> Đang tải component: ${relPath}`);
    const res = await fetch(incInfo.url);
    if (!res.ok) {
      console.warn(`  [CẢNH BÁO] Không tải được component ${relPath}`);
      continue;
    }
    const ab = await res.arrayBuffer();
    const buf = Buffer.from(ab);

    if (relPath.endsWith('.bin')) {
      binBuf = buf;
    } else {
      imageMap[relPath] = buf;
    }
  }

  console.log(`[PACKING] Đóng gói thành binary .GLB: ${fileName}...`);
  const glbBuffer = packGltfToGlb(gltfJson, binBuf, imageMap);

  // Lưu file vào các thư mục mục tiêu
  const targetDirs = [
    path.join(projectRoot, 'public', 'model', 'lobby'),
    path.join(projectRoot, 'public', 'models', 'lobby')
  ];
  if (fs.existsSync(workspaceRoot)) {
    targetDirs.push(path.join(workspaceRoot, 'model', 'lobby'));
  }

  for (const dir of targetDirs) {
    ensureDir(dir);
    const dest = path.join(dir, fileName);
    fs.writeFileSync(dest, glbBuffer);
    console.log(`[SAVED] Đã lưu (${(glbBuffer.length / 1024 / 1024).toFixed(2)} MB) -> ${dest}`);
  }

  return {
    assetId,
    fileName,
    size: glbBuffer.length,
    path: `/model/lobby/${fileName}`
  };
}

export async function fetchAllLobbyModels() {
  console.log('==============================================================');
  console.log('KHỞI CHẠY TẢI & ĐÓNG GÓI MODEL ĐẠI SẢNH BẢO TÀNG VĂN HỌC 3D');
  console.log('==============================================================');

  const results = [];
  for (const item of TARGET_MODELS) {
    try {
      const res = await fetchLobbyModel(item);
      results.push(res);
    } catch (err) {
      console.error(`[LỖI] Tải thất bại ${item.fileName}:`, err.message);
    }
  }

  console.log('\n==============================================================');
  console.log('HOÀN TẤT TẢI TOÀN BỘ 4 MODEL TRANG TRÍ ĐẠI SẢNH!');
  results.forEach(r => {
    console.log(`- ${r.fileName} (${(r.size / 1024 / 1024).toFixed(2)} MB) -> ${r.path}`);
  });
  console.log('==============================================================\n');
  return results;
}

if (process.argv[1] && process.argv[1].endsWith('fetchLobbyModels.mjs')) {
  fetchAllLobbyModels().catch(console.error);
}
