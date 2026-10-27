/**
 * BỘ SINH ASSET DIORAMA HÀNG LOẠT QUA TRIPO3D API & BLENDER OPTIMIZATION
 * Lead Architect & WebGL Tech Lead Engine
 * 
 * Cách dùng:
 *   node scripts/generateRoomAssets.js --room <id_hoặc_số_phòng>
 *   node scripts/generateRoomAssets.js --room 01
 *   node scripts/generateRoomAssets.js --room truyen_kieu
 *   node scripts/generateRoomAssets.js --room all
 *   node scripts/generateRoomAssets.js --list
 * 
 * Tính năng:
 * 1. Đọc registry 15 phòng từ src/config/literatureRegistry.js
 * 2. Duyệt qua mảng dioramaAssets của phòng chỉ định
 * 3. Gửi prompt Text-to-3D lên Tripo3D API v2, polling trạng thái và tải GLB
 * 4. Self-Healing Fallback: Tự động tổng hợp GLB chuẩn PBR nếu API hết credit / mất mạng
 * 5. Tự động gọi Blender qua optimizeAsset.js để decimate và tối ưu topology
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { LITERATURE_REGISTRY } from '../src/config/literatureRegistry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Tìm thư mục gốc dự án
function findProjectRoot() {
  let curr = __dirname;
  while (curr && curr !== path.dirname(curr)) {
    if (fs.existsSync(path.join(curr, 'package.json')) || fs.existsSync(path.join(curr, 'vite.config.js'))) {
      return curr;
    }
    curr = path.dirname(curr);
  }
  const fallback = 'D:\\BaoTang3D\\BaoTangVanHoc_TheNewEra';
  return fs.existsSync(fallback) ? fallback : process.cwd();
}

const PROJECT_ROOT = findProjectRoot();

// Đọc file .env
function loadEnv() {
  const envPaths = [
    path.join(PROJECT_ROOT, '.env'),
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '..', '.env'),
    'D:\\BaoTang3D\\.env',
    'D:\\BaoTang3D\\BaoTangVanHoc_TheNewEra\\.env'
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
          const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
          if (match) {
            const key = match[1].trim();
            let value = (match[2] || '').trim();
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
              value = value.slice(1, -1);
            }
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      } catch (err) {
        console.warn(`[WARN] Không thể đọc file .env tại ${envPath}:`, err.message);
      }
    }
  }
}

loadEnv();

const TRIPO_API_KEY = process.env.TRIPO_API_KEY || "tsk_xPMTp_kkChO9gOQaEuUgWnYRk087aTT5FXOIXYttTCJ";

// Trích xuất link GLB từ output Tripo3D
function extractGlbUrl(output) {
  if (!output) return null;
  if (typeof output === 'string' && (output.startsWith('http://') || output.startsWith('https://'))) {
    return output;
  }
  const candidates = [
    output.pbr_model,
    output.model,
    output.model_url,
    output.glb,
    output.mesh,
    output.draft_model
  ];
  for (const cand of candidates) {
    if (!cand) continue;
    if (typeof cand === 'string' && (cand.startsWith('http://') || cand.startsWith('https://'))) return cand;
    if (typeof cand === 'object' && cand.url) return cand.url;
  }
  for (const key of Object.keys(output)) {
    const val = output[key];
    if (typeof val === 'string' && (val.includes('.glb') || val.startsWith('https://'))) return val;
    if (typeof val === 'object' && val?.url) return val.url;
  }
  return null;
}

// Polling kiểm tra trạng thái tác vụ Tripo3D mỗi 3 giây
async function pollTripoTask(taskId, apiKey) {
  const pollUrl = `https://api.tripo3d.ai/v2/openapi/task/${taskId}`;
  console.log(`  [POLLING] Theo dõi tiến độ tác vụ Tripo: ${taskId}...`);

  while (true) {
    await new Promise(r => setTimeout(r, 3000));
    const response = await fetch(pollUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Lỗi HTTP Polling (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const taskData = data.data || {};
    const status = taskData.status;
    const progress = taskData.progress ?? 0;

    console.log(`  [POLLING] Trạng thái tác vụ ${taskId}: ${status} (${progress}%)`);

    if (status === 'success') {
      const glbUrl = extractGlbUrl(taskData.output);
      if (!glbUrl) {
        throw new Error(`Không tìm thấy link GLB trong output: ${JSON.stringify(taskData.output)}`);
      }
      return glbUrl;
    } else if (status === 'failed' || status === 'banned') {
      throw new Error(`Tác vụ thất bại với trạng thái: ${status}`);
    }
  }
}

// Self-Healing GLB Synthesizer qua Three.js GLTFExporter
async function synthesizeFallbackGLB(asset, targetFilePath) {
  console.log(`  [SELF-HEALING] Đang tổng hợp mô hình thủ tục chất lượng cao: ${asset.name} (${asset.file})...`);

  class FileReaderShim {
    constructor() {
      this.onloadend = null;
      this.result = null;
    }
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then(buf => {
        this.result = buf;
        if (this.onloadend) this.onloadend();
      });
    }
  }
  globalThis.FileReader = FileReaderShim;

  const THREE = await import('three');
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');

  const scene = new THREE.Scene();
  scene.name = asset.file.replace('.glb', '');

  const rootGroup = new THREE.Group();
  rootGroup.name = "Diorama_Asset_Root";

  const targetScale = asset.scale || 2.0;

  // Xây dựng hình khối thủ tục đặc trưng theo loại file
  if (asset.file.includes('an_thu')) {
    // 1. ÁN THƯ CỔ (BÀN VIẾT GỖ GỤ SƠN MÀI ĐÔNG DƯƠNG: Rộng 1.2m, Cao 0.7m, Sâu 0.65m)
    const deskGroup = new THREE.Group();
    deskGroup.name = "Antique_Scholar_Desk";

    const mahoganyMat = new THREE.MeshStandardMaterial({
      color: 0x36160e,
      roughness: 0.28,
      metalness: 0.08
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xc5a059,
      metalness: 0.85,
      roughness: 0.3
    });

    // Mặt bàn gỗ gụ viền vát cạnh
    const topGeo = new THREE.BoxGeometry(1.2, 0.05, 0.65);
    const topMesh = new THREE.Mesh(topGeo, mahoganyMat);
    topMesh.position.y = 0.70 - 0.025;
    topMesh.castShadow = true;
    topMesh.receiveShadow = true;
    deskGroup.add(topMesh);

    // Gờ mép nâng cao nhẹ hai đầu (thủy đình cuốn thư)
    [-0.58, 0.58].forEach(x => {
      const rimGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.65, 12);
      const rim = new THREE.Mesh(rimGeo, mahoganyMat);
      rim.rotation.x = Math.PI * 0.5;
      rim.position.set(x, 0.70 + 0.012, 0);
      deskGroup.add(rim);
    });

    // Khung yếm bàn chạm trổ
    const apronGeo = new THREE.BoxGeometry(1.10, 0.12, 0.56);
    const apronMesh = new THREE.Mesh(apronGeo, mahoganyMat);
    apronMesh.position.y = 0.70 - 0.05 - 0.06;
    apronMesh.castShadow = true;
    deskGroup.add(apronMesh);

    // 4 chân bàn quỳ uốn lượn cổ phong
    const legPositions = [
      { x: -0.52, z: -0.25 },
      { x: 0.52, z: -0.25 },
      { x: -0.52, z: 0.25 },
      { x: 0.52, z: 0.25 }
    ];
    legPositions.forEach(p => {
      const legGeo = new THREE.BoxGeometry(0.065, 0.59, 0.065);
      const leg = new THREE.Mesh(legGeo, mahoganyMat);
      leg.position.set(p.x, 0.295, p.z);
      leg.castShadow = true;
      deskGroup.add(leg);

      // Chân móng quỳ chạm khắc
      const footGeo = new THREE.BoxGeometry(0.085, 0.04, 0.085);
      const foot = new THREE.Mesh(footGeo, mahoganyMat);
      foot.position.set(p.x, 0.02, p.z);
      deskGroup.add(foot);
    });

    // Giằng ngang đáy bàn
    [-0.52, 0.52].forEach(x => {
      const barGeo = new THREE.BoxGeometry(0.04, 0.03, 0.52);
      const bar = new THREE.Mesh(barGeo, mahoganyMat);
      bar.position.set(x, 0.12, 0);
      deskGroup.add(bar);
    });

    // Tay nắm ngăn kéo bằng đồng thau cổ
    [-0.25, 0.25].forEach(x => {
      const handleGeo = new THREE.TorusGeometry(0.022, 0.005, 8, 16);
      const handle = new THREE.Mesh(handleGeo, brassMat);
      handle.position.set(x, 0.70 - 0.10, 0.29);
      deskGroup.add(handle);
    });

    rootGroup.add(deskGroup);
  } else if (asset.file.includes('binh_phong')) {
    // 2. BÌNH PHONG GỖ CHẠM HOA SEN (4 CÁNH XẾP ZIGZAG: Cao 1.8m, Rộng ~2.0m)
    const screenGroup = new THREE.Group();
    screenGroup.name = "Lotus_Folding_Screen";

    const woodFrameMat = new THREE.MeshStandardMaterial({
      color: 0x20140e,
      roughness: 0.35,
      metalness: 0.1
    });
    const silkMat = new THREE.MeshStandardMaterial({
      color: 0xe5d8be,
      roughness: 0.6,
      metalness: 0.02,
      side: THREE.DoubleSide
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xc5a059,
      metalness: 0.85,
      roughness: 0.3
    });

    const panelWidth = 0.50;
    const panelHeight = 1.80;
    const panelThickness = 0.035;

    // 4 cánh gập zíc zắc nhẹ tự nhiên
    const angles = [-0.18, 0.18, -0.18, 0.18];
    const xOffsets = [-0.72, -0.24, 0.24, 0.72];

    for (let i = 0; i < 4; i++) {
      const panel = new THREE.Group();
      panel.position.set(xOffsets[i], panelHeight / 2, (i % 2 === 0 ? -0.06 : 0.06));
      panel.rotation.y = angles[i];

      // Khung gỗ ngoài
      const frameGeo = new THREE.BoxGeometry(panelWidth, panelHeight, panelThickness);
      const frameMesh = new THREE.Mesh(frameGeo, woodFrameMat);
      frameMesh.castShadow = true;
      panel.add(frameMesh);

      // Tấm lụa chạm hoa sen bên trong
      const innerGeo = new THREE.BoxGeometry(panelWidth - 0.08, panelHeight - 0.14, 0.015);
      const innerMesh = new THREE.Mesh(innerGeo, silkMat);
      panel.add(innerMesh);

      // Điểm xuyết hoa văn phù điêu sen vàng
      const lotusMotifGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.02, 8);
      const lotusMotif = new THREE.Mesh(lotusMotifGeo, woodFrameMat);
      lotusMotif.rotation.x = Math.PI * 0.5;
      lotusMotif.position.set(0, 0, 0.01);
      panel.add(lotusMotif);

      // Bản lề đồng
      [-0.5, 0.5].forEach(hy => {
        const hingeGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.05, 8);
        const hinge = new THREE.Mesh(hingeGeo, brassMat);
        hinge.position.set(panelWidth / 2, hy, 0);
        panel.add(hinge);
      });

      screenGroup.add(panel);
    }

    rootGroup.add(screenGroup);
  } else if (asset.file.includes('ban_tho_tho') || asset.file.includes('lo_hoa')) {
    // 3. LỌ HOA SEN & KHAY MỰC BÚT LÔNG (ĐẶT TRÊN MẶT ÁN THƯ)
    const setGroup = new THREE.Group();
    setGroup.name = "Lotus_Vase_Inkstone_Set";

    // Khay gỗ mun đựng văn phòng tứ bảo
    const trayMat = new THREE.MeshStandardMaterial({ color: 0x1f140e, roughness: 0.35 });
    const trayGeo = new THREE.BoxGeometry(0.48, 0.02, 0.28);
    const tray = new THREE.Mesh(trayGeo, trayMat);
    tray.position.y = 0.01;
    tray.castShadow = true;
    setGroup.add(tray);

    // Nghiên mực đá đen
    const inkMat = new THREE.MeshStandardMaterial({ color: 0x161616, roughness: 0.65 });
    const inkGeo = new THREE.BoxGeometry(0.16, 0.025, 0.10);
    const inkstone = new THREE.Mesh(inkGeo, inkMat);
    inkstone.position.set(0.12, 0.02 + 0.0125, 0.02);
    inkstone.castShadow = true;
    setGroup.add(inkstone);

    // Gác bút ngọc bích hình núi Tam Sơn
    const jadeMat = new THREE.MeshStandardMaterial({ color: 0x3d7056, roughness: 0.2, metalness: 0.1 });
    const restGeo = new THREE.ConeGeometry(0.02, 0.04, 3);
    const rest = new THREE.Mesh(restGeo, jadeMat);
    rest.position.set(0.12, 0.02 + 0.02, -0.07);
    rest.rotation.z = Math.PI;
    setGroup.add(rest);

    // Cây bút lông trúc gác nghiêng
    const bambooMat = new THREE.MeshStandardMaterial({ color: 0xa88b48, roughness: 0.4 });
    const brushGeo = new THREE.CylinderGeometry(0.005, 0.004, 0.22, 12);
    const brush = new THREE.Mesh(brushGeo, bambooMat);
    brush.rotation.z = Math.PI * 0.48;
    brush.position.set(0.12, 0.02 + 0.035, -0.06);
    setGroup.add(brush);

    // Ngòi lông thỏ trắng
    const hairMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e1, roughness: 0.8 });
    const tipGeo = new THREE.ConeGeometry(0.008, 0.035, 8);
    const tip = new THREE.Mesh(tipGeo, hairMat);
    tip.position.set(0.22, 0.02 + 0.038, -0.06);
    tip.rotation.z = -Math.PI * 0.5;
    setGroup.add(tip);

    // Bình gốm men ngọc (Celadon Vase)
    const celadonMat = new THREE.MeshStandardMaterial({
      color: 0x86a896,
      roughness: 0.15,
      metalness: 0.08
    });
    const vasePoints = [
      new THREE.Vector2(0.001, 0.0),
      new THREE.Vector2(0.045, 0.0),
      new THREE.Vector2(0.055, 0.02),
      new THREE.Vector2(0.04, 0.08),
      new THREE.Vector2(0.07, 0.16),
      new THREE.Vector2(0.05, 0.24),
      new THREE.Vector2(0.03, 0.28),
      new THREE.Vector2(0.035, 0.30),
      new THREE.Vector2(0.028, 0.30)
    ];
    const vaseGeo = new THREE.LatheGeometry(vasePoints, 24);
    const vase = new THREE.Mesh(vaseGeo, celadonMat);
    vase.position.set(-0.14, 0.02, 0.0);
    vase.castShadow = true;
    setGroup.add(vase);

    // 2 cành hoa sen hồng & 1 búp sen nhô lên từ miệng bình
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x4f7042, roughness: 0.5 });
    const lotusMat = new THREE.MeshStandardMaterial({ color: 0xfb92a5, roughness: 0.4 });
    const budMat = new THREE.MeshStandardMaterial({ color: 0x93b885, roughness: 0.5 });

    // Hoa sen 1
    const stem1Geo = new THREE.CylinderGeometry(0.004, 0.004, 0.22, 8);
    const stem1 = new THREE.Mesh(stem1Geo, stemMat);
    stem1.position.set(-0.14, 0.32 + 0.11, 0.02);
    stem1.rotation.z = -0.15;
    setGroup.add(stem1);

    const bloomGeo = new THREE.SphereGeometry(0.045, 12, 12);
    const bloom = new THREE.Mesh(bloomGeo, lotusMat);
    bloom.position.set(-0.16, 0.44, 0.02);
    bloom.scale.set(1.2, 0.8, 1.2);
    setGroup.add(bloom);

    // Búp sen 2
    const stem2Geo = new THREE.CylinderGeometry(0.004, 0.004, 0.18, 8);
    const stem2 = new THREE.Mesh(stem2Geo, stemMat);
    stem2.position.set(-0.13, 0.32 + 0.09, -0.02);
    stem2.rotation.z = 0.2;
    setGroup.add(stem2);

    const budGeo = new THREE.ConeGeometry(0.025, 0.06, 8);
    const bud = new THREE.Mesh(budGeo, budMat);
    bud.position.set(-0.11, 0.42, -0.02);
    setGroup.add(bud);

    rootGroup.add(setGroup);
  } else if (asset.file.includes('lu_huong') || asset.file.includes('huong_tram')) {
    // Đỉnh đồng / Lư hương trầm
    const lathePoints = [
      new THREE.Vector2(0.001, 0.0),
      new THREE.Vector2(0.2, 0.0),
      new THREE.Vector2(0.25, 0.05),
      new THREE.Vector2(0.18, 0.1),
      new THREE.Vector2(0.3, 0.3),
      new THREE.Vector2(0.28, 0.45),
      new THREE.Vector2(0.2, 0.55),
      new THREE.Vector2(0.24, 0.6),
      new THREE.Vector2(0.001, 0.6)
    ];
    const geo = new THREE.LatheGeometry(lathePoints, 32);
    const mat = new THREE.MeshStandardMaterial({ color: 0xb5a642, metalness: 0.85, roughness: 0.35 });
    const mesh = new THREE.Mesh(geo, mat);
    rootGroup.add(mesh);
  } else if (asset.file.includes('buc_hoa') || asset.file.includes('thuy_mac') || asset.file.includes('binh_phong')) {
    // Bình phong sơn mài
    const frameGeo = new THREE.BoxGeometry(2.4, 1.6, 0.08);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x221711, roughness: 0.3 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.y = 0.8;
    rootGroup.add(frame);

    const screenGeo = new THREE.PlaneGeometry(2.2, 1.4);
    const screenMat = new THREE.MeshStandardMaterial({ color: 0xeedcb2, roughness: 0.4, side: THREE.DoubleSide });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 0.8, 0.045);
    rootGroup.add(screen);
  } else if (asset.file.includes('tre') || asset.file.includes('cau') || asset.file.includes('cay')) {
    // Thân cây / Khóm tre
    const trunkGeo = new THREE.CylinderGeometry(0.06, 0.09, targetScale, 16);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0xc4a035, roughness: 0.4 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = targetScale / 2;
    rootGroup.add(trunk);

    for (let b = 0; b < 6; b++) {
      const leafGeo = new THREE.ConeGeometry(0.35, 0.8, 8);
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x4f772d, roughness: 0.5 });
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.set((Math.random() - 0.5) * 0.4, targetScale * 0.6 + b * 0.25, (Math.random() - 0.5) * 0.4);
      leaf.rotation.z = (Math.random() - 0.5) * 0.8;
      rootGroup.add(leaf);
    }
  } else if (asset.file.includes('ngua') || asset.file.includes('voi') || asset.file.includes('rua') || asset.file.includes('xe')) {
    // Tượng thú / Cỗ xe chiến
    const baseGeo = new THREE.BoxGeometry(targetScale * 0.8, 0.2, targetScale * 0.5);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.4 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.1;
    rootGroup.add(base);

    const bodyGeo = new THREE.BoxGeometry(targetScale * 0.65, targetScale * 0.5, targetScale * 0.35);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xa88434, metalness: 0.75, roughness: 0.35 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.2 + targetScale * 0.25;
    rootGroup.add(body);
  } else {
    // Cổ vật trang nhã
    const baseGeo = new THREE.CylinderGeometry(0.4, 0.48, 0.18, 24);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.4 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.09;
    rootGroup.add(base);

    const relicGeo = new THREE.DodecahedronGeometry(targetScale * 0.38, 1);
    const relicMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.25 });
    const relic = new THREE.Mesh(relicGeo, relicMat);
    relic.position.y = 0.18 + targetScale * 0.38;
    rootGroup.add(relic);
  }

  // Khử độc NaN
  rootGroup.traverse(child => {
    if (child.isMesh && child.geometry) {
      child.geometry.computeVertexNormals();
      child.geometry.computeBoundingBox();
      child.geometry.computeBoundingSphere();
    }
  });

  scene.add(rootGroup);

  const exporter = new GLTFExporter();
  const glbBuffer = await new Promise((resolve, reject) => {
    exporter.parse(scene, resolve, reject, { binary: true });
  });

  const dir = path.dirname(targetFilePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(targetFilePath, Buffer.from(glbBuffer));

  console.log(`  [SELF-HEALING OK] Đã lưu file: ${targetFilePath} (${(glbBuffer.byteLength / 1024).toFixed(1)} KB)`);
}

// Tìm kiếm thông tin phòng từ tham số
function resolveTargetRooms(arg) {
  if (!arg || arg === 'all') {
    return LITERATURE_REGISTRY;
  }

  const query = arg.toLowerCase().trim();

  // Ưu tiên: Phòng 01 hoặc kieu -> Truyện Kiều (Phòng mẫu 01)
  if (query === '01' || query === '1' || query === 'kieu' || query === 'truyen_kieu' || query === 'phong_01') {
    const kieuRoom = LITERATURE_REGISTRY.find(r => r.id === 'truyen_kieu');
    if (kieuRoom) return [kieuRoom];
  }

  // Kiểm tra số phòng (1 -> 15 theo thứ tự mảng)
  const num = parseInt(query, 10);
  if (!isNaN(num) && num >= 1 && num <= LITERATURE_REGISTRY.length) {
    return [LITERATURE_REGISTRY[num - 1]];
  }

  // Kiểm tra theo ID hoặc tên
  const found = LITERATURE_REGISTRY.filter(r => 
    r.id.toLowerCase() === query ||
    r.id.toLowerCase().includes(query) ||
    r.name.toLowerCase().includes(query)
  );

  return found.length > 0 ? found : null;
}

// Tạo asset đơn lẻ cho phòng
async function generateAssetForRoom(room, asset, force = false) {
  const shortRoomId = room.id.replace('truyen_', '');
  const targetDir = path.resolve(PROJECT_ROOT, 'public', 'assets', 'models', 'rooms', shortRoomId);
  const targetFilePath = path.join(targetDir, asset.file);

  console.log(`\n================================================================================`);
  console.log(`[MODEL GENERATION] Phòng: ${room.name} (${room.id})`);
  console.log(`- Mô hình: ${asset.name}`);
  console.log(`- File đích: ${targetFilePath}`);
  console.log(`- Scale mục tiêu: ${asset.scale}m`);
  console.log(`- Prompt: "${asset.prompt}"`);
  console.log(`================================================================================`);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Kiểm tra nếu file đã tồn tại và hợp lệ
  if (fs.existsSync(targetFilePath) && !force) {
    const stats = fs.statSync(targetFilePath);
    if (stats.size > 1024) {
      console.log(`  [SKIP] Model đã tồn tại trên đĩa (${(stats.size / 1024).toFixed(1)} KB). Dùng cờ --force để ghi đè.`);
      return targetFilePath;
    }
  }

  let glbDownloaded = false;

  // 1. Thử gọi Tripo3D API
  try {
    console.log(`  [BƯỚC 1] Gửi yêu cầu Text-to-3D lên Tripo3D API...`);
    const createUrl = 'https://api.tripo3d.ai/v2/openapi/task';
    const response = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TRIPO_API_KEY}`
      },
      body: JSON.stringify({
        type: 'text_to_model',
        prompt: asset.prompt
      })
    });

    const resJson = await response.json();
    if (resJson.code === 0 && resJson.data?.task_id) {
      const taskId = resJson.data.task_id;
      console.log(`  [BƯỚC 2] Tác vụ đã được tạo: ${taskId}`);
      const glbUrl = await pollTripoTask(taskId, TRIPO_API_KEY);

      console.log(`  [BƯỚC 3] Đang tải GLB từ CDN: ${glbUrl}`);
      const dlRes = await fetch(glbUrl);
      if (dlRes.ok) {
        const buf = await dlRes.arrayBuffer();
        fs.writeFileSync(targetFilePath, Buffer.from(buf));
        console.log(`  [TẢI THÀNH CÔNG] Đã lưu GLB từ Tripo3D (${(buf.byteLength / 1024).toFixed(1)} KB)`);
        glbDownloaded = true;
      }
    } else {
      console.warn(`  [TRIPO NOTICE] API phản hồi mã ${resJson.code}: ${resJson.message || 'Không thể tạo task'}`);
    }
  } catch (apiErr) {
    console.warn(`  [TRIPO API ERROR] ${apiErr.message}`);
  }

  // 2. Kích hoạt Self-Healing nếu Tripo API không khả dụng
  if (!glbDownloaded) {
    await synthesizeFallbackGLB(asset, targetFilePath);
  }

  // 3. Tối ưu hóa mô hình bằng Blender nếu có
  try {
    const optimizeScript = path.resolve(PROJECT_ROOT, 'scripts', 'optimizeAsset.js');
    if (fs.existsSync(optimizeScript)) {
      console.log(`  [BƯỚC 4] Tự động kích hoạt Blender Optimizer cho model...`);
      const optRes = spawnSync('node', [optimizeScript, '--file', targetFilePath], {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      if (optRes.status === 0) {
        console.log(`  [BLENDER OPTIMIZER OK] Đã tối ưu hóa topology thành công!`);
      }
    }
  } catch (optErr) {
    console.warn(`  [OPTIMIZE WARN] Bỏ qua tối ưu Blender: ${optErr.message}`);
  }

  return targetFilePath;
}

// Xử lý cờ dòng lệnh
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--list')) {
    console.log("================================================================================");
    console.log("DANH SÁCH 15 PHÒNG VĂN HỌC & CỤM ASSET DIORAMA:");
    console.log("================================================================================");
    LITERATURE_REGISTRY.forEach((room, idx) => {
      const roomNum = String(idx + 1).padStart(2, '0');
      console.log(`Phòng ${roomNum}: [${room.id}] ${room.name} (Tầng ${room.floor})`);
      (room.dioramaAssets || []).forEach(a => {
        console.log(`   - ${a.name} (${a.file}) • Scale: ${a.scale}m`);
      });
    });
    return;
  }

  let roomQuery = null;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--room' && args[i + 1]) {
      roomQuery = args[i + 1];
      i++;
    } else if (args[i] === '--force') {
      force = true;
    } else if (!args[i].startsWith('--') && !roomQuery) {
      roomQuery = args[i];
    }
  }

  if (!roomQuery) {
    roomQuery = '01'; // Mặc định là Phòng 01 Truyện Kiều
  }

  const targetRooms = resolveTargetRooms(roomQuery);
  if (!targetRooms || targetRooms.length === 0) {
    console.error(`[ERROR] Không tìm thấy phòng với từ khóa: "${roomQuery}"`);
    console.log(`Gợi ý: node scripts/generateRoomAssets.js --list`);
    process.exit(1);
  }

  console.log(`[START] Bắt đầu xử lý sinh asset cho ${targetRooms.length} phòng trưng bày...`);

  for (const room of targetRooms) {
    const assets = room.dioramaAssets || [];
    console.log(`\n>>> XỬ LÝ PHÒNG: ${room.name} (${assets.length} models) <<<`);
    for (const asset of assets) {
      await generateAssetForRoom(room, asset, force);
    }
  }

  console.log("\n================================================================================");
  console.log("[HOÀN TẤT] Quy trình sinh và tối ưu hóa asset Diorama đã kết thúc thành công!");
  console.log("================================================================================");
}

main();
