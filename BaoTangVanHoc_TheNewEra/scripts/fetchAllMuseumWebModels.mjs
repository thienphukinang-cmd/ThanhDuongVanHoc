import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(projectRoot, '..', '..');

const WEB_MODEL_DIR = path.resolve(projectRoot, 'public', 'model', 'web');
if (!fs.existsSync(WEB_MODEL_DIR)) {
  fs.mkdirSync(WEB_MODEL_DIR, { recursive: true });
}

const HEADERS = { 'User-Agent': 'BaoTangVanHoc3D/2.0 (FullOverhaulFetcher)' };

const WEB_ASSETS_MANIFEST = [
  {
    id: 'brass_vase_01',
    file: 'antique_vase.glb',
    desc: 'Lục bình đồng cổ trang trí sảnh & phòng',
    existingSource: path.join(workspaceRoot, 'model', 'lobby', 'lobby_vase.glb')
  },
  {
    id: 'chinese_chandelier',
    file: 'royal_chandelier.glb',
    desc: 'Đèn chùm đại sảnh',
    existingSource: path.join(workspaceRoot, 'model', 'lobby', 'lobby_chandelier.glb')
  },
  {
    id: 'potted_plant_01',
    file: 'lobby_plant.glb',
    desc: 'Chậu cây cảnh hành lang',
    existingSource: path.join(workspaceRoot, 'model', 'lobby', 'lobby_plant.glb')
  },
  {
    id: 'wooden_table_02',
    file: 'ancient_wooden_table.glb',
    desc: 'Án thư gỗ cổ đặt sách thần và hiện vật',
    existingSource: path.join(workspaceRoot, 'model', 'an_thu_go.glb')
  },
  {
    id: 'ClassicNightstand_01',
    file: 'wooden_pedestal.glb',
    desc: 'Đôn gỗ trưng bày cổ điển',
    existingSource: path.join(workspaceRoot, 'model', 'lobby', 'lobby_pedestal.glb')
  },
  {
    id: 'boulder_01',
    file: 'tan_vien_boulder.glb',
    desc: 'Đá tảng tự nhiên ghép núi Tản Viên',
    resolution: '1k'
  }
];

function isBinaryGlb(filePath) {
  if (!fs.existsSync(filePath)) return false;
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(4);
    fs.readSync(fd, buf, 0, 4, 0);
    fs.closeSync(fd);
    return buf.toString('utf8') === 'glTF';
  } catch (_) {
    return false;
  }
}

function padBuffer(buf, padByte = 0x00) {
  const rem = buf.length % 4;
  if (rem === 0) return buf;
  const padding = 4 - rem;
  return Buffer.concat([buf, Buffer.alloc(padding, padByte)]);
}

function packGltfToGlb(gltfJson, binBuffer, imageMap = {}) {
  const json = JSON.parse(JSON.stringify(gltfJson));
  let currentBin = binBuffer ? Buffer.from(binBuffer) : Buffer.alloc(0);
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
  jsonBuffer = padBuffer(jsonBuffer, 0x20);

  const totalLength = 12 + 8 + jsonBuffer.length + 8 + currentBin.length;
  const glbBuffer = Buffer.alloc(totalLength);

  let pos = 0;
  glbBuffer.writeUInt32LE(0x46546C67, pos); pos += 4;
  glbBuffer.writeUInt32LE(2, pos); pos += 4;
  glbBuffer.writeUInt32LE(totalLength, pos); pos += 4;

  glbBuffer.writeUInt32LE(jsonBuffer.length, pos); pos += 4;
  glbBuffer.writeUInt32LE(0x4E4F534A, pos); pos += 4;
  jsonBuffer.copy(glbBuffer, pos); pos += jsonBuffer.length;

  glbBuffer.writeUInt32LE(currentBin.length, pos); pos += 4;
  glbBuffer.writeUInt32LE(0x004E4942, pos); pos += 4;
  currentBin.copy(glbBuffer, pos); pos += currentBin.length;

  return glbBuffer;
}

async function fetchAndPackFromPolyHaven(assetId, resolution = '1k') {
  const fileInfoUrl = `https://api.polyhaven.com/files/${assetId}`;
  const res = await fetch(fileInfoUrl, { headers: HEADERS });
  if (!res.ok) throw new Error(`Poly Haven API error ${res.status}`);
  const json = await res.json();
  if (!json.gltf) throw new Error(`Asset ${assetId} does not have gltf`);

  const resKey = json.gltf[resolution] ? resolution : Object.keys(json.gltf)[0];
  const gltfMeta = json.gltf[resKey]?.gltf;
  if (!gltfMeta || !gltfMeta.url) throw new Error(`No gltf URL for ${assetId}`);

  console.log(`  -> Đang tải descriptor glTF: ${gltfMeta.url}`);
  const gltfJson = await fetch(gltfMeta.url, { headers: HEADERS }).then(r => r.json());

  let binBuf = null;
  const imageMap = {};

  for (const [relPath, incInfo] of Object.entries(gltfMeta.include || {})) {
    console.log(`  -> Đang tải component: ${relPath}`);
    const compRes = await fetch(incInfo.url, { headers: HEADERS });
    if (!compRes.ok) continue;
    const ab = await compRes.arrayBuffer();
    const buf = Buffer.from(ab);
    if (relPath.endsWith('.bin')) {
      binBuf = buf;
    } else {
      imageMap[relPath] = buf;
    }
  }

  return packGltfToGlb(gltfJson, binBuf, imageMap);
}

async function runWebAssetHarvest() {
  console.log('=== ĐANG TẢI VÀ ĐÓNG GÓI MODEL 3D TỪ WEB (POLY HAVEN CC0) ===');

  const targetDirs = [
    WEB_MODEL_DIR,
    path.resolve(projectRoot, 'public', 'models', 'web'),
    path.resolve(workspaceRoot, 'BaoTangVanHoc_TheNewEra', 'public', 'model', 'web')
  ];

  for (const d of targetDirs) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  }

  for (const item of WEB_ASSETS_MANIFEST) {
    const mainTarget = path.join(WEB_MODEL_DIR, item.file);

    if (isBinaryGlb(mainTarget)) {
      console.log(`✔ Đã có sẵn GLB nhị phân chuẩn: ${item.file}`);
      // Đồng bộ sang các thư mục khác
      for (const d of targetDirs) {
        const dest = path.join(d, item.file);
        if (dest !== mainTarget && !isBinaryGlb(dest)) {
          fs.copyFileSync(mainTarget, dest);
        }
      }
      continue;
    }

    // Kiểm tra nếu có sẵn nguồn binary GLB từ model/lobby hoặc model/
    if (item.existingSource && isBinaryGlb(item.existingSource)) {
      console.log(`✔ Sao chép GLB chuẩn từ kho dự án: ${item.existingSource} -> ${item.file}`);
      const content = fs.readFileSync(item.existingSource);
      for (const d of targetDirs) {
        fs.writeFileSync(path.join(d, item.file), content);
      }
      continue;
    }

    // Tải và đóng gói trực tiếp từ Poly Haven
    try {
      console.log(`\n[FETCH] Đang tải & đóng gói từ Poly Haven: ${item.id} (${item.desc})...`);
      const glbBuf = await fetchAndPackFromPolyHaven(item.id, item.resolution || '1k');
      for (const d of targetDirs) {
        fs.writeFileSync(path.join(d, item.file), glbBuf);
      }
      console.log(`✔ Đã đóng gói thành công ${item.file} (${(glbBuf.length / 1024 / 1024).toFixed(2)} MB)`);
    } catch (e) {
      console.warn(`⚠ Lỗi khi tải ${item.id}:`, e.message);
    }
  }

  console.log('\n=== HOÀN TẤT BƯỚC 2: TẤT CẢ MODEL 3D WEB ĐÃ SẴN SÀNG ===');
}

runWebAssetHarvest();
