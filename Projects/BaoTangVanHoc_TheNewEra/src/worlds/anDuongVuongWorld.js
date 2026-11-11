import * as THREE from 'three';
import { loadGlbCached, downscaleTexture, sanitizeGeometryBuffers } from '../utils/modelLoaderHelper.js';

/**
 * ============================================================================
 * THẾ GIỚI TRUYỆN AN DƯƠNG VƯƠNG – THÀNH CỔ LOA 3 TẦNG XOẮN ỐC
 * Tích hợp toàn diện các kỹ năng:
 * 1. blender-3d-asset-pipeline: Tích hợp tượng an_duong_vuong_web.glb & no_than_kim_quy.glb
 * 2. fps-optimizer: InstancedMesh 120 mũi tên đồng, WebP textures, tối ưu draw call
 * 3. ornamental-relief-sculptor: Sobel Normal Map & Height Map xoắn ốc Archimedes Cổ Loa
 * 4. hitbox-collision-architect: Invisible Proxy Hitbox (opacity: 0), F2 toggle Box3Helper, Sliding Collision
 * 5. interactive-lore-guide: UI Overlay thẻ thuyết minh AN_DUONG_VUONG_LORE & thơ sử thi
 * 6. cultural-heritage-modeler: 3 vòng thành xoắn ốc, Hồ Kim Quy, Giếng Ngọc Trọng Thủy
 * 7. environment-lighting-artist: Volumetric God Rays, ánh sáng ngọc bích & vàng kim
 * ============================================================================
 */

// ============================================================================
// 1. DỮ LIỆU THUYẾT MINH SỬ THI ÂU LẠC (skill: interactive-lore-guide)
// ============================================================================
export const AN_DUONG_VUONG_LORE = {
  king_statue: {
    title: 'An Dương Vương – Vua Nước Âu Lạc',
    era: 'Thế kỷ III TCN – Kinh đô Cổ Loa',
    poem: '“Chín vòng thành ốc xoay vần đất,\nMột lẫy Kim Quy trấn cõi bờ.”',
    description:
      'Thục Phán An Dương Vương hợp nhất hai bộ tộc lớn Tây Âu và Lạc Việt, lập nên nhà nước Âu Lạc độc lập tự chủ. Ngài dời đô từ miền núi Nghĩa Lĩnh về Phong Khê đồng bằng, khởi công đắp Cửu Trùng Loa Thành kiên cố bậc nhất thời cổ đại.'
  },
  magic_crossbow: {
    title: 'Nỏ Thần Liên Châu (Linh Quang Kim Quy Thần Cơ)',
    era: 'Bảo vật Trấn Quốc Triều Âu Lạc',
    poem: '“Vuốt thần Cao Lỗ chế thần cơ,\nMỗi phát tên bay vạn giặc mờ.”',
    description:
      'Tướng quân Cao Lỗ phụng mệnh vua, dùng chiếc móng vuốt rùa vàng do Thần Kim Quy ban tặng làm lẫy nỏ, chế tạo thành công nỏ thần Linh Quang Kim Quy Thần Cơ. Mỗi lần bật lẫy, hàng trăm mũi tên đồng Cổ Loa đồng loạt phóng ra như bão táp, quét sạch hàng vạn quân xâm lược Triệu Đà.'
  },
  kim_quy_lake: {
    title: 'Thần Kim Quy (Thanh Giang Sứ Giả)',
    era: 'Huyền tích Xây Thành & Trừ Yêu',
    poem: '“Rùa Vàng rẽ sóng hồ Phong Khê,\nTrừ yêu Bạch Kê, giữ trọn thề.”',
    description:
      'Thuở dựng nước, thành Cổ Loa cứ đắp xong lại sụp đổ do yêu tinh Bạch Kê (Gà Trắng) ở núi Thất Diệu quấy phá. Thần Kim Quy từ biển Đông theo dòng sông Hồng bơi vào, chỉ cho nhà vua cách trừ quái vật, giúp việc xây thành hoàn tất vẻ vang và ban tặng chiếc vuốt thần hộ quốc.'
  },
  goose_feather_well: {
    title: 'Áo Lông Ngỗng Mỵ Châu & Giếng Ngọc Trọng Thủy',
    era: 'Bi kịch Nợ Nước – Tình Yêu Bất Diệt',
    poem: '“Tôi kể ngày xưa chuyện Mỵ Châu,\nTrái tim lầm chỗ để trên đầu,\nNỏ thần vô ý trao tay giặc,\nNên nỗi cơ đồ đắm biển sâu.”',
    description:
      'Trước mưu đồ tráo lẫy nỏ của cha con Triệu Đà, Mỵ Châu vô tình rắc lông ngỗng làm dấu chạy nạn theo vua cha về hướng Dạ Trạch. Giọt máu trung trinh của nàng chìm xuống đáy biển hóa thành ngọc trai; nước giếng Cổ Loa nơi Trọng Thủy trầm mình khi rửa ngọc lại càng sáng ngời tinh khiết.'
  }
};

// ============================================================================
// 2. SOBEL NORMAL MAP HỌA TIẾT XOẮN ỐC CỔ LOA (skill: ornamental-relief-sculptor)
// ============================================================================
export function createCoLoaSpiralReliefMaps(size = 256) {
  if (typeof document === 'undefined') {
    return { normalMap: null, bumpMap: null };
  }

  const hCanvas = document.createElement('canvas');
  hCanvas.width = size;
  hCanvas.height = size;
  const ctx = hCanvas.getContext('2d');

  ctx.fillStyle = '#181818';
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(2, Math.round((size / 512) * 7));

  // Vẽ đường xoắn ốc Archimedes biểu trưng Thành Cổ Loa
  ctx.beginPath();
  const maxTurns = 5 * Math.PI * 2;
  for (let a = 0; a <= maxTurns; a += 0.08) {
    const r = (a / maxTurns) * (size * 0.44);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (a === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // Họa tiết mũi tên đồng Cổ Loa tỏa tròn quanh tâm
  ctx.lineWidth = Math.max(2, Math.round((size / 512) * 4));
  const arrowPad = Math.max(2, Math.round((size / 512) * 6));
  for (let i = 0; i < 12; i++) {
    const ang = (i * Math.PI * 2) / 12;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(size * 0.36, -arrowPad);
    ctx.lineTo(size * 0.45, 0);
    ctx.lineTo(size * 0.36, arrowPad);
    ctx.stroke();
    ctx.restore();
  }

  // Chuyển sang Sobel Normal Map chuẩn LinearSRGBColorSpace
  const src = ctx.getImageData(0, 0, size, size).data;
  const nCanvas = document.createElement('canvas');
  nCanvas.width = size;
  nCanvas.height = size;
  const nCtx = nCanvas.getContext('2d');
  const imgData = nCtx.createImageData(size, size);
  const dst = imgData.data;
  const strength = 4.2;

  const sample = (x, y) => {
    const sx = (x + size) % size;
    const sy = (y + size) % size;
    return src[(sy * size + sx) * 4] / 255.0;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dX =
        sample(x + 1, y - 1) +
        2 * sample(x + 1, y) +
        sample(x + 1, y + 1) -
        (sample(x - 1, y - 1) + 2 * sample(x - 1, y) + sample(x - 1, y + 1));
      const dY =
        sample(x - 1, y + 1) +
        2 * sample(x, y + 1) +
        sample(x + 1, y + 1) -
        (sample(x - 1, y - 1) + 2 * sample(x, y - 1) + sample(x + 1, y - 1));
      const dZ = 1.0 / strength;
      const invLen = 1.0 / (Math.sqrt(dX * dX + dY * dY + dZ * dZ) || 1);
      const idx = (y * size + x) * 4;
      dst[idx] = Math.floor(((dX * invLen) * 0.5 + 0.5) * 255);
      dst[idx + 1] = Math.floor(((-dY * invLen) * 0.5 + 0.5) * 255);
      dst[idx + 2] = Math.floor(((dZ * invLen) * 0.5 + 0.5) * 255);
      dst[idx + 3] = 255;
    }
  }
  nCtx.putImageData(imgData, 0, 0);

  const normalMap = new THREE.CanvasTexture(nCanvas);
  normalMap.wrapS = THREE.RepeatWrapping;
  normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.colorSpace = THREE.LinearSRGBColorSpace;
  normalMap.generateMipmaps = false;
  normalMap.minFilter = THREE.LinearFilter;
  normalMap.needsUpdate = true;

  return { normalMap, bumpMap: null };
}

// ============================================================================
// 3. CHUẨN HÓA MÔ HÌNH AN DƯƠNG VƯƠNG .GLB (skill: blender-3d-asset-pipeline)
// ============================================================================
export function normalizeAnDuongVuongModel(gltfScene, targetHeight = 3.8) {
  gltfScene.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(gltfScene);
  const size = new THREE.Vector3();
  box.getSize(size);

  // Nếu trục chiều cao sau khi xoay vẫn nằm ngang, tự động dựng đứng tượng
  if (size.z > size.y * 1.35) {
    gltfScene.rotation.x += Math.PI / 2;
    gltfScene.updateMatrixWorld(true);
    box.setFromObject(gltfScene);
    box.getSize(size);
  }

  if (size.y > 0) {
    const scaleFactor = targetHeight / size.y;
    gltfScene.scale.multiplyScalar(scaleFactor);
  }

  gltfScene.updateMatrixWorld(true);
  box.setFromObject(gltfScene);
  const center = new THREE.Vector3();
  box.getCenter(center);

  gltfScene.position.x -= center.x;
  gltfScene.position.z -= center.z;
  gltfScene.position.y -= box.min.y; // Neo đáy tượng chạm sát chuẩn sàn Y = 0
  gltfScene.updateMatrixWorld(true);

  // Tinh chỉnh vật liệu + tắt bóng đổ nặng + nén texture quá khổ (1024px)
  gltfScene.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = false;
      child.receiveShadow = false;
      child.frustumCulled = true;
      if (child.geometry) {
        sanitizeGeometryBuffers(child.geometry);
      }
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((mat) => {
        if (!mat) return;
        mat.side = (mat.transparent || mat.alphaTest > 0 || mat.opacity < 1.0)
          ? THREE.DoubleSide
          : THREE.FrontSide;
        if (mat.map) {
          mat.map.colorSpace = THREE.SRGBColorSpace;
          downscaleTexture(mat.map, 1024, { disableMipmaps: true, colorSpace: THREE.SRGBColorSpace });
        }
        if (mat.normalMap) {
          mat.normalMap.colorSpace = THREE.LinearSRGBColorSpace;
          downscaleTexture(mat.normalMap, 512, { disableMipmaps: true, colorSpace: THREE.LinearSRGBColorSpace });
          mat.normalScale = new THREE.Vector2(1.35, 1.35);
        }
        if ('envMapIntensity' in mat) {
          mat.envMapIntensity = 1.4;
        }
        mat.needsUpdate = true;
      });
    }
  });

  return gltfScene;
}

// ============================================================================
// 4. HỆ THỐNG THẺ THUYẾT MINH MODAL UI (skill: interactive-lore-guide)
// ============================================================================
let globalLoreOverlay = null;

function ensureLoreOverlayDOM() {
  if (typeof document === 'undefined') return null;
  if (globalLoreOverlay) return globalLoreOverlay;

  const existing = document.getElementById('an-duong-vuong-lore-modal');
  if (existing) {
    globalLoreOverlay = existing;
    return globalLoreOverlay;
  }

  const style = document.createElement('style');
  style.id = 'adv-lore-modal-style';
  style.textContent = `
    .adv-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(3, 18, 16, 0.78);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 99999;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.35s ease;
    }
    .adv-modal-backdrop.active {
      opacity: 1;
      pointer-events: auto;
    }
    .adv-modal-card {
      position: relative;
      width: 90%;
      max-width: 620px;
      background: radial-gradient(circle at 50% 0%, #134e4a 0%, #042f2e 55%, #02201d 100%);
      border: 2px solid #f59e0b;
      box-shadow: 0 0 32px rgba(245, 158, 11, 0.35), 0 20px 48px rgba(0, 0, 0, 0.8);
      border-radius: 14px;
      padding: 32px 36px;
      color: #f8fafc;
      font-family: 'Cinzel', 'Merriweather', 'Palatino', serif;
      transform: translateY(20px) scale(0.96);
      transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .adv-modal-backdrop.active .adv-modal-card {
      transform: translateY(0) scale(1);
    }
    .adv-modal-badge {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #38bdf8;
      border: 1px solid rgba(56, 189, 248, 0.4);
      background: rgba(56, 189, 248, 0.12);
      padding: 4px 12px;
      border-radius: 20px;
      margin-bottom: 12px;
    }
    .adv-modal-title {
      font-size: 24px;
      font-weight: 700;
      color: #fef08a;
      margin: 0 0 6px 0;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
    }
    .adv-modal-era {
      font-size: 13px;
      color: #94a3b8;
      font-style: italic;
      margin-bottom: 18px;
    }
    .adv-modal-divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, #f59e0b, transparent);
      margin: 16px 0;
    }
    .adv-modal-poem {
      font-size: 15px;
      line-height: 1.7;
      color: #fde047;
      font-style: italic;
      white-space: pre-line;
      text-align: center;
      background: rgba(0, 0, 0, 0.35);
      border-left: 3px solid #f59e0b;
      padding: 14px 18px;
      border-radius: 6px;
      margin-bottom: 20px;
    }
    .adv-modal-desc {
      font-size: 14px;
      line-height: 1.8;
      color: #e2e8f0;
      text-align: justify;
    }
    .adv-modal-close-btn {
      position: absolute;
      top: 14px;
      right: 18px;
      background: transparent;
      border: none;
      color: #cbd5e1;
      font-size: 24px;
      cursor: pointer;
      line-height: 1;
      padding: 6px;
      transition: color 0.2s ease, transform 0.2s ease;
    }
    .adv-modal-close-btn:hover {
      color: #fef08a;
      transform: scale(1.15);
    }
    .adv-modal-action-bar {
      margin-top: 24px;
      text-align: center;
    }
    .adv-modal-confirm-btn {
      background: linear-gradient(135deg, #d97706, #b45309);
      color: #ffffff;
      border: 1px solid #fef08a;
      padding: 10px 28px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 1px;
      border-radius: 6px;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(217, 119, 6, 0.4);
      transition: all 0.2s ease;
    }
    .adv-modal-confirm-btn:hover {
      background: linear-gradient(135deg, #f59e0b, #d97706);
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(245, 158, 11, 0.6);
    }
  `;
  document.head.appendChild(style);

  const modal = document.createElement('div');
  modal.id = 'an-duong-vuong-lore-modal';
  modal.className = 'adv-modal-backdrop';
  modal.innerHTML = `
    <div class="adv-modal-card">
      <button class="adv-modal-close-btn" id="adv-modal-close" title="Đóng">&times;</button>
      <div class="adv-modal-badge">Di Sản Văn Học Dân Gian Âu Lạc</div>
      <h3 class="adv-modal-title" id="adv-modal-title">Tiêu Đề Hiện Vật</h3>
      <div class="adv-modal-era" id="adv-modal-era">Niên đại / Xuất xứ</div>
      <div class="adv-modal-poem" id="adv-modal-poem">Trích đoạn sử thi</div>
      <div class="adv-modal-divider"></div>
      <div class="adv-modal-desc" id="adv-modal-desc">Nội dung thuyết minh chi tiết.</div>
      <div class="adv-modal-action-bar">
        <button class="adv-modal-confirm-btn" id="adv-modal-ack">ĐÓNG LẠI (ESC)</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  const hideModal = () => {
    modal.classList.remove('active');
  };

  modal.querySelector('#adv-modal-close').addEventListener('click', hideModal);
  modal.querySelector('#adv-modal-ack').addEventListener('click', hideModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) hideModal();
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      hideModal();
    }
  });

  globalLoreOverlay = modal;
  return globalLoreOverlay;
}

export function showAnDuongVuongLoreCard(loreKey) {
  const data = AN_DUONG_VUONG_LORE[loreKey];
  if (!data) return;

  const modal = ensureLoreOverlayDOM();
  if (!modal) return;

  modal.querySelector('#adv-modal-title').textContent = data.title;
  modal.querySelector('#adv-modal-era').textContent = data.era;
  modal.querySelector('#adv-modal-poem').textContent = data.poem;
  modal.querySelector('#adv-modal-desc').textContent = data.description;
  modal.classList.add('active');

  // Phát âm thanh khánh đồng WebAudio nhẹ nhàng (procedural chime)
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(329.63, ctx.currentTime); // Mi
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.35); // Mi octave
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.25);
    }
  } catch (_) {}
}

// ============================================================================
// 5. ĐĂNG KÝ PROXY HITBOX VÀ HELPER (skill: hitbox-collision-architect)
// ============================================================================
function registerArtifactProxy(targetObj, loreKey, worldGroup, raycastTargets, collisionBoxes, debugHelpers) {
  targetObj.updateMatrixWorld(true);
  const worldBox = new THREE.Box3().setFromObject(targetObj);
  worldBox.expandByScalar(0.15);

  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  worldBox.getSize(size);
  worldBox.getCenter(center);

  // Invisible Proxy Hitbox ôm sát THREE.Box3
  const proxyGeo = new THREE.BoxGeometry(size.x, size.y, size.z);
  const proxyMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.0,
    depthWrite: false
  });
  const proxyMesh = new THREE.Mesh(proxyGeo, proxyMat);

  const localCenter = center.clone();
  worldGroup.worldToLocal(localCenter);
  proxyMesh.position.copy(localCenter);

  proxyMesh.userData = {
    isArtifactProxy: true,
    loreKey,
    loreData: AN_DUONG_VUONG_LORE[loreKey]
  };

  worldGroup.add(proxyMesh);
  raycastTargets.push(proxyMesh);
  collisionBoxes.push(worldBox);

  // Box3Helper wireframe bật/tắt bằng phím F2
  const helper = new THREE.Box3Helper(worldBox, 0x38bdf8);
  helper.visible = false;
  worldGroup.add(helper);
  debugHelpers.push(helper);
}

// ============================================================================
// 6. HÀM KHỞI TẠO CHÍNH: CREATE AN DƯƠNG VƯƠNG WORLD
// ============================================================================
export function createAnDuongVuongWorld(scene, options = {}) {
  const worldOrigin = options.worldOrigin || new THREE.Vector3(0, 0, 0);
  const camera = options.camera || null;
  const domElement = options.domElement || (typeof document !== 'undefined' ? document.body : null);

  const worldGroup = new THREE.Group();
  worldGroup.name = 'AnDuongVuong_CoLoa_World';
  worldGroup.position.copy(worldOrigin);
  scene.add(worldGroup);

  const raycastTargets = [];
  const collisionBoxes = [];
  const debugHelpers = [];
  const disposableResources = [];

  const { normalMap, bumpMap } = createCoLoaSpiralReliefMaps(512);
  if (normalMap) disposableResources.push(normalMap);
  if (bumpMap) disposableResources.push(bumpMap);

  // Bảng vật liệu PBR Chủ Đạo (skill: shader-coloring-artist)
  const matCitadelStone = new THREE.MeshStandardMaterial({
    color: 0x292524,
    roughness: 0.55,
    metalness: 0.25,
    normalMap: normalMap || null,
    normalScale: new THREE.Vector2(1.6, 1.6)
  });
  const matAncientBronze = new THREE.MeshStandardMaterial({
    color: 0x3f2e1e,
    metalness: 0.86,
    roughness: 0.30,
    normalMap: normalMap || null,
    normalScale: new THREE.Vector2(2.0, 2.0)
  });
  const matDivineGold = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    metalness: 0.94,
    roughness: 0.18,
    emissive: 0x78350f,
    emissiveIntensity: 0.35,
    bumpMap: bumpMap || null,
    bumpScale: 0.03
  });
  const matJadeWater = new THREE.MeshStandardMaterial({
    color: 0x0d9488,
    metalness: 0.65,
    roughness: 0.12,
    transparent: true,
    opacity: 0.84
  });
  const matGooseWhite = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.4,
    metalness: 0.1,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.2
  });

  disposableResources.push(matCitadelStone, matAncientBronze, matDivineGold, matJadeWater, matGooseWhite);

  // --------------------------------------------------------------------------
  // A. NỀN ĐẤT PHONG KHÊ & 3 VÒNG THÀNH CỔ LOA XOẮN ỐC (skills: cultural-heritage-modeler + ornamental-relief-sculptor)
  // --------------------------------------------------------------------------
  const groundGeo = new THREE.CylinderGeometry(28, 30, 0.4, 32);
  const groundMesh = new THREE.Mesh(groundGeo, matCitadelStone);
  groundMesh.position.y = -0.2;
  groundMesh.receiveShadow = false;
  worldGroup.add(groundMesh);
  disposableResources.push(groundGeo);

  // Đĩa Phù Điêu Loa Thành 9 Vòng Xoáy ở trung tâm
  const spiralPlazaGeo = new THREE.CylinderGeometry(6.2, 6.5, 0.08, 32);
  const spiralPlazaMesh = new THREE.Mesh(spiralPlazaGeo, matAncientBronze);
  spiralPlazaMesh.position.y = 0.04;
  spiralPlazaMesh.receiveShadow = false;
  worldGroup.add(spiralPlazaMesh);
  disposableResources.push(spiralPlazaGeo);

  // Dựng 3 vòng thành Cổ Loa xoắn ốc bằng THREE.ExtrudeGeometry chừa cổng hành lang thông suốt
  const ringConfigs = [
    { radius: 11.5, height: 3.2, startAngle: 0.35, arcLength: Math.PI * 1.45 },
    { radius: 17.5, height: 4.4, startAngle: Math.PI * 0.65, arcLength: Math.PI * 1.55 },
    { radius: 23.5, height: 5.6, startAngle: -0.25, arcLength: Math.PI * 1.65 }
  ];

  ringConfigs.forEach(({ radius, height, startAngle, arcLength }) => {
    const wallShape = new THREE.Shape();
    const innerR = radius - 0.65;
    const outerR = radius + 0.65;
    wallShape.absarc(0, 0, outerR, startAngle, startAngle + arcLength, false);
    wallShape.absarc(0, 0, innerR, startAngle + arcLength, startAngle, true);
    wallShape.closePath();

    const wallGeo = new THREE.ExtrudeGeometry(wallShape, {
      depth: height,
      bevelEnabled: true,
      bevelSegments: 1,
      steps: 1,
      bevelSize: 0.08,
      bevelThickness: 0.08,
      curveSegments: 20
    });
    const wallMesh = new THREE.Mesh(wallGeo, matCitadelStone);
    wallMesh.rotation.x = -Math.PI / 2;
    wallMesh.castShadow = false;
    wallMesh.receiveShadow = false;
    worldGroup.add(wallMesh);
    disposableResources.push(wallGeo);
  });

  // --------------------------------------------------------------------------
  // B. TÂM ĐIỂM: ĐÀI CHÍNH ĐIỆN TƯỢNG AN DƯƠNG VƯƠNG (.GLB) & NỎ THẦN LIÊN CHÂU
  // --------------------------------------------------------------------------
  const altarGroup = new THREE.Group();
  altarGroup.position.set(0, 0, 0);
  worldGroup.add(altarGroup);

  const altarBase1 = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 0.55, 24), matAncientBronze);
  altarBase1.position.y = 0.275;
  const altarBase2 = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.6, 0.50, 24), matCitadelStone);
  altarBase2.position.y = 0.80;
  const altarGoldRim = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.07, 10, 24), matDivineGold);
  altarGoldRim.rotation.x = Math.PI / 2;
  altarGoldRim.position.y = 1.05;
  altarGroup.add(altarBase1, altarBase2, altarGoldRim);

  // Slot tượng An Dương Vương cao 3.8m
  const kingStatueSlot = new THREE.Group();
  kingStatueSlot.position.set(0, 1.05, -0.4);
  altarGroup.add(kingStatueSlot);

  const kingCandidateUrls = [
    '/models/an_duong_vuong_web.glb',
    '/model/an_duong_vuong_web.glb',
    '/models/an_duong_vuong.glb',
    '/model/ANDUONGVUONG.glb'
  ];

  loadGlbCached(kingCandidateUrls, { maxTextureSize: 1024 })
    .then((rawScene) => {
      const kingModel = normalizeAnDuongVuongModel(rawScene, 3.8);
      kingStatueSlot.add(kingModel);
      registerArtifactProxy(altarGroup, 'king_statue', worldGroup, raycastTargets, collisionBoxes, debugHelpers);
    })
    .catch(() => {
      // Fallback Procedural Tượng An Dương Vương uy nghiêm nếu chưa có file
      const fallbackKing = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 3.8, 16), matDivineGold);
      fallbackKing.position.y = 1.9;
      kingStatueSlot.add(fallbackKing);
      registerArtifactProxy(altarGroup, 'king_statue', worldGroup, raycastTargets, collisionBoxes, debugHelpers);
    });

  // Đài Nỏ Thần Liên Châu phía trước đài chính điện (X = 0, Z = 4.2)
  const crossbowGroup = new THREE.Group();
  crossbowGroup.position.set(0, 0, 4.2);
  worldGroup.add(crossbowGroup);

  const crossbowCandidateUrls = [
    '/models/no_than_kim_quy.glb',
    '/model/no_than_kim_quy.glb'
  ];

  loadGlbCached(crossbowCandidateUrls, { maxTextureSize: 1024 })
    .then((rawScene) => {
      const crossbowModel = normalizeAnDuongVuongModel(rawScene, 2.1);
      crossbowGroup.add(crossbowModel);
      registerArtifactProxy(crossbowGroup, 'magic_crossbow', worldGroup, raycastTargets, collisionBoxes, debugHelpers);
    })
    .catch(() => {
      // Procedural Fallback
      const cbPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.9, 16), matAncientBronze);
      cbPedestal.position.y = 0.45;
      const cbBow = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.05, 10, 20, Math.PI), matDivineGold);
      cbBow.rotation.x = Math.PI / 2.3;
      cbBow.position.set(0, 1.35, 0.2);
      const cbStock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 1.35), matAncientBronze);
      cbStock.position.set(0, 1.25, 0);
      crossbowGroup.add(cbPedestal, cbBow, cbStock);
      registerArtifactProxy(crossbowGroup, 'magic_crossbow', worldGroup, raycastTargets, collisionBoxes, debugHelpers);
    });

  // --------------------------------------------------------------------------
  // C. PHÂN KHU TÂY: HỒ KIM QUY & RÙA VÀNG HIỂN LINH (X = -6.8, Z = 3.2)
  // --------------------------------------------------------------------------
  const kimQuyGroup = new THREE.Group();
  kimQuyGroup.position.set(-6.8, 0, 3.2);
  worldGroup.add(kimQuyGroup);

  const lakeRim = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.22, 10, 24), matAncientBronze);
  lakeRim.rotation.x = Math.PI / 2;
  lakeRim.position.y = 0.18;
  const lakeWater = new THREE.Mesh(new THREE.CylinderGeometry(2.55, 2.55, 0.15, 24), matJadeWater);
  lakeWater.position.y = 0.12;

  // Thần Kim Quy (Rùa Vàng) trồi lên giữa mặt nước ngọc bích
  const turtleShell = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    matDivineGold
  );
  turtleShell.scale.set(0.88, 0.65, 1.18);
  turtleShell.position.y = 0.22;

  const turtleHead = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), matDivineGold);
  turtleHead.scale.set(0.85, 0.85, 1.35);
  turtleHead.position.set(0, 0.58, 1.15);

  kimQuyGroup.add(lakeRim, lakeWater, turtleShell, turtleHead);
  registerArtifactProxy(kimQuyGroup, 'kim_quy_lake', worldGroup, raycastTargets, collisionBoxes, debugHelpers);

  // --------------------------------------------------------------------------
  // D. PHÂN KHU ĐÔNG: GIẾNG NGỌC TRỌNG THỦY & LÔNG NGỖNG TRẮNG MỴ CHÂU (X = 6.8, Z = 3.2)
  // --------------------------------------------------------------------------
  const wellGroup = new THREE.Group();
  wellGroup.position.set(6.8, 0, 3.2);
  worldGroup.add(wellGroup);

  const wellWall = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.45, 0.95, 20, 1, true), matAncientBronze);
  wellWall.position.y = 0.475;
  const wellTopRim = new THREE.Mesh(new THREE.TorusGeometry(1.38, 0.12, 10, 20), matDivineGold);
  wellTopRim.rotation.x = Math.PI / 2;
  wellTopRim.position.y = 0.95;
  const pearlCore = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), matGooseWhite);
  pearlCore.position.y = 1.35;

  wellGroup.add(wellWall, wellTopRim, pearlCore);
  registerArtifactProxy(wellGroup, 'goose_feather_well', worldGroup, raycastTargets, collisionBoxes, debugHelpers);

  // --------------------------------------------------------------------------
  // E. MƯA TÊN ĐỒNG LIÊN CHÂU BẰNG INSTANCEDMESH (skills: fps-optimizer + mesh-detailing-specialist)
  // --------------------------------------------------------------------------
  const arrowCount = 120;
  const arrowGeo = new THREE.ConeGeometry(0.04, 0.85, 8);
  const arrowInstanced = new THREE.InstancedMesh(arrowGeo, matDivineGold, arrowCount);
  const dummy = new THREE.Object3D();

  for (let i = 0; i < arrowCount; i++) {
    const ring = i % 3;
    const r = 11.5 + ring * 6.0;
    const theta = (i / arrowCount) * Math.PI * 6;
    const h = 3.4 + ring * 1.2 + Math.sin(i) * 0.25;
    dummy.position.set(Math.cos(theta) * r, h, Math.sin(theta) * r);
    dummy.rotation.set(Math.PI / 4, -theta, 0);
    dummy.updateMatrix();
    arrowInstanced.setMatrixAt(i, dummy.matrix);
  }
  arrowInstanced.instanceMatrix.needsUpdate = true;
  arrowInstanced.computeBoundingSphere?.();
  arrowInstanced.frustumCulled = true;
  worldGroup.add(arrowInstanced);
  disposableResources.push(arrowGeo);

  // --------------------------------------------------------------------------
  // F. BẦU KHÍ QUYỂN, GOD RAYS & HẠT LÔNG NGỖNG (skill: environment-lighting-artist)
  // --------------------------------------------------------------------------
  const kingSpotLight = new THREE.SpotLight(0xfde047, 6.2, 26, Math.PI / 5, 0.4, 1.4);
  kingSpotLight.position.set(0, 11.5, 4.5);
  kingSpotLight.target = altarGroup;
  kingSpotLight.castShadow = false;
  worldGroup.add(kingSpotLight);

  const kimQuyGlow = new THREE.PointLight(0x2dd4bf, 3.5, 12, 1.6);
  kimQuyGlow.position.set(-6.8, 1.8, 3.2);
  worldGroup.add(kimQuyGlow);

  // Luồng sáng Volumetric God Rays rọi từ đỉnh trời Cổ Loa
  const godRayGeo = new THREE.CylinderGeometry(1.4, 4.2, 12.0, 20, 1, true);
  const godRayMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.10,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const godRayMesh = new THREE.Mesh(godRayGeo, godRayMat);
  godRayMesh.position.set(0, 6.0, 0);
  godRayMesh.userData.ignoreRaycaster = true;
  worldGroup.add(godRayMesh);
  disposableResources.push(godRayGeo, godRayMat);

  // Hệ thống 160 hạt Lông Ngỗng Trắng Mỵ Châu bay trong gió
  const featherCount = 160;
  const featherGeo = new THREE.BufferGeometry();
  const featherPositions = new Float32Array(featherCount * 3);
  for (let i = 0; i < featherCount; i++) {
    const rad = 2.0 + Math.random() * 18.0;
    const ang = Math.random() * Math.PI * 2;
    featherPositions[i * 3] = Math.cos(ang) * rad;
    featherPositions[i * 3 + 1] = 0.5 + Math.random() * 7.5;
    featherPositions[i * 3 + 2] = Math.sin(ang) * rad;
  }
  featherGeo.setAttribute('position', new THREE.BufferAttribute(featherPositions, 3));
  featherGeo.boundingBox = new THREE.Box3(
    new THREE.Vector3(-22, 0, -22),
    new THREE.Vector3(22, 9, 22)
  );
  featherGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 4.5, 0), 32);

  const featherMat = new THREE.PointsMaterial({
    color: 0xf8fafc,
    size: 0.13,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const featherParticles = new THREE.Points(featherGeo, featherMat);
  featherParticles.frustumCulled = true;
  featherParticles.userData.ignoreRaycaster = true;
  worldGroup.add(featherParticles);
  disposableResources.push(featherGeo, featherMat);

  // --------------------------------------------------------------------------
  // G. TƯƠNG TÁC CLICK CHUỘT VÀO PROXY HITBOX (skill: interactive-lore-guide)
  // --------------------------------------------------------------------------
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  function onPointerDown(event) {
    if (!camera || !domElement || !worldGroup.visible) return;
    const rect = domElement.getBoundingClientRect ? domElement.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(raycastTargets, true);

    if (intersects.length > 0) {
      let hit = intersects[0].object;
      while (hit && !hit.userData?.isArtifactProxy && hit.parent && hit.parent !== worldGroup) {
        hit = hit.parent;
      }
      if (hit && hit.userData?.isArtifactProxy && hit.userData.loreKey) {
        showAnDuongVuongLoreCard(hit.userData.loreKey);
      }
    }
  }

  function onKeyDown(event) {
    if (event.key === 'F2') {
      toggleHitboxDebug();
    }
  }

  if (domElement) {
    domElement.addEventListener('pointerdown', onPointerDown);
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeyDown);
  }

  // --------------------------------------------------------------------------
  // H. VÒNG LẶP ANIMATION, SLIDING COLLISION & CLEANUP
  // --------------------------------------------------------------------------
  function update(deltaTime = 0.016, elapsedTime = 0) {
    if (!worldGroup.visible) return;
    // Chuyển động Rùa Vàng nhấp nhô trên Hồ Kim Quy & Ngọc Trai dao động
    turtleShell.position.y = 0.22 + Math.sin(elapsedTime * 1.8) * 0.05;
    turtleHead.position.y = 0.58 + Math.sin(elapsedTime * 1.8 + 0.4) * 0.06;
    pearlCore.position.y = 1.35 + Math.sin(elapsedTime * 2.4) * 0.10;

    // Lông ngỗng trắng rơi nhẹ theo gió xoáy Loa Thành
    const posAttr = featherGeo.attributes.position;
    for (let i = 0; i < featherCount; i++) {
      let y = posAttr.getY(i) - 0.45 * deltaTime;
      if (y < 0.2) y = 7.8;
      posAttr.setY(i, y);
      posAttr.setX(i, posAttr.getX(i) + Math.cos(elapsedTime + i) * 0.004);
      posAttr.setZ(i, posAttr.getZ(i) + Math.sin(elapsedTime + i) * 0.004);
    }
    posAttr.needsUpdate = true;
  }

  function resolvePlayerCollision(nextPos, playerRadius = 0.5) {
    const playerBox = new THREE.Box3();
    playerBox.setFromCenterAndSize(nextPos, new THREE.Vector3(playerRadius * 2, 3.2, playerRadius * 2));

    for (const box of collisionBoxes) {
      if (playerBox.intersectsBox(box)) {
        const boxCenter = new THREE.Vector3();
        box.getCenter(boxCenter);
        const pushDir = new THREE.Vector3().subVectors(nextPos, boxCenter);
        pushDir.y = 0;
        if (pushDir.lengthSq() > 0.0001) {
          pushDir.normalize();
          nextPos.addScaledVector(pushDir, 0.08); // Phản lực trượt nhẹ nhàng
        }
      }
    }
    return nextPos;
  }

  let debugVisible = false;
  function toggleHitboxDebug() {
    debugVisible = !debugVisible;
    debugHelpers.forEach((h) => {
      h.visible = debugVisible;
    });
  }

  function dispose() {
    if (domElement) {
      domElement.removeEventListener('pointerdown', onPointerDown);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', onKeyDown);
    }
    disposableResources.forEach((r) => {
      if (r && typeof r.dispose === 'function') r.dispose();
    });
    scene.remove(worldGroup);
  }

  return {
    worldGroup,
    raycastTargets,
    collisionBoxes,
    update,
    resolvePlayerCollision,
    toggleHitboxDebug,
    showLore: showAnDuongVuongLoreCard,
    dispose
  };
}
