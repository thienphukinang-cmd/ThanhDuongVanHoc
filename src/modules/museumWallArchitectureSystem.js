import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const WALL_TEXTURE_CACHE = new Map();
const GLB_MODEL_CACHE = new Map();

/**
 * Bộ nhớ đệm nạp model GLTF di sản tường (Blender export chuẩn Z-Up / PBR)
 */
function loadHeritageGlbModel(url) {
  if (GLB_MODEL_CACHE.has(url)) {
    return GLB_MODEL_CACHE.get(url);
  }
  const promise = new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        gltf.scene.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;
            child.frustumCulled = true;
            child.userData.ignoreRaycaster = true;
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((m) => {
              if (m?.map && 'colorSpace' in m.map && THREE.SRGBColorSpace) {
                m.map.colorSpace = THREE.SRGBColorSpace;
                m.map.needsUpdate = true;
              }
            });
          }
        });
        resolve(gltf.scene);
      },
      undefined,
      (err) => {
        console.warn(`[WallArchitecture] Không thể nạp GLB ${url}, dùng procedural fallback:`, err);
        reject(err);
      }
    );
  });
  GLB_MODEL_CACHE.set(url, promise);
  return promise;
}

// Cấu hình họa tiết tường đặc trưng cho từng không gian trong Bảo Tàng
export const WALL_THEME_PROFILES = {
  lobby: {
    baseTop: '#240808',
    baseMid: '#3d0c0c',
    baseBottom: '#170404',
    goldStroke: '#fde047',
    secondaryStroke: '#f59e0b',
    wainscotColor: 0x1c1917,
    backlightColor: 0xfde047,
    motifType: 'dongSonImperial',
    panels: [
      { title: 'VĂN HIẾN NGÀN NĂM', subtitle: 'Hào khí Đông A • Tinh hoa Lạc Hồng' },
      { title: 'DI SẢN MUÔN ĐỜI', subtitle: 'Tiếng vọng ngàn xưa trong từng trang sách' },
      { title: 'SÔNG NÚI NƯỚC NAM', subtitle: 'Rành rành định phận tại sách trời' },
      { title: 'ÁNH SÁNG TRI THỨC', subtitle: 'Khai mở tương lai từ cội nguồn văn hiến' }
    ]
  },
  truyenKieu: {
    baseTop: '#160726',
    baseMid: '#2e1042',
    baseBottom: '#12041c',
    goldStroke: '#fde047',
    secondaryStroke: '#f472b6',
    wainscotColor: 0x241230,
    backlightColor: 0xf472b6,
    motifType: 'peachBlossomSilk',
    panels: [
      { title: 'TIẾT THANH MINH', subtitle: 'Cỏ non xanh tận chân trời • Cành lê trắng điểm' },
      { title: 'ƯỚC HẸN HIÊN TÂY', subtitle: 'Vầng trăng vằng vặc giữa trời • Đinh ninh hai miệng' },
      { title: 'CUNG ĐÀN BẠC MỆNH', subtitle: 'Bốn dây nhỏ máu năm đầu ngón tay' },
      { title: 'LẦU NGƯNG BÍCH', subtitle: 'Bốn bề bát ngát xa trông • Cát vàng cồn nọ' }
    ]
  },
  sonTinhThuyTinh: {
    baseTop: '#061526',
    baseMid: '#0f2c47',
    baseBottom: '#040d18',
    goldStroke: '#fbbf24',
    secondaryStroke: '#38bdf8',
    wainscotColor: 0x0f172a,
    backlightColor: 0x38bdf8,
    motifType: 'wavesAndMountains',
    panels: [
      { title: 'TẢN VIÊN SƠN THÁNH', subtitle: 'Dời đồi dựng núi ngăn dòng nước lũ' },
      { title: 'THỦY TỘC DÂNG TRIỀU', subtitle: 'Hô mưa gọi gió • Sóng vỗ lưng trời' },
      { title: 'CHÍN NGÀ CHÍN CỰA', subtitle: 'Lễ vật thần kỳ đất cổ Phong Châu' },
      { title: 'Ý CHÍ TRỊ THỦY', subtitle: 'Sức mạnh đoàn kết chế ngự thiên tai' }
    ]
  },
  anDuongVuong: {
    baseTop: '#041d21',
    baseMid: '#0b3b40',
    baseBottom: '#021014',
    goldStroke: '#facc15',
    secondaryStroke: '#2dd4bf',
    wainscotColor: 0x132a2e,
    backlightColor: 0x2dd4bf,
    motifType: 'coLoaSpiral',
    panels: [
      { title: 'THÀNH ỐC CỔ LOA', subtitle: 'Chín vòng xoắn ốc kiên cố giữa đồng bằng' },
      { title: 'SỨ GIẢ KIM QUY', subtitle: 'Rùa Vàng rẽ nước trao vuốt thần giữ nước' },
      { title: 'NỎ THẦN LIÊN CHÂU', subtitle: 'Linh Quang Thần Cơ • Một phát vạn tên' },
      { title: 'BÀI HỌC CẢNH GIÁC', subtitle: 'Lời răn lịch sử về vận mệnh giang sơn' }
    ]
  },
  voNhat: {
    baseTop: '#1f130c',
    baseMid: '#3d2415',
    baseBottom: '#140b06',
    goldStroke: '#fbbf24',
    secondaryStroke: '#fb923c',
    wainscotColor: 0x271911,
    backlightColor: 0xfdba74,
    motifType: 'bambooAndSunrise',
    panels: [
      { title: 'CHIỀU XÓM NGỤ CƯ', subtitle: 'Tiếng hò kéo xe thóc và bóng chiều chạng vạng' },
      { title: 'MÁI ẤM NGÀY ĐÓI', subtitle: 'Tình người nảy nở giữa vực thẳm khốn cùng' },
      { title: 'NGỌN ĐÈN DẦU LẠC', subtitle: 'Lời dạy của người mẹ nghèo về niềm tin ngày mai' },
      { title: 'ÁNH SÁNG BÌNH MINH', subtitle: 'Khát vọng đổi đời hướng về tương lai tươi sáng' }
    ]
  }
};

/**
 * 1. TẠO BỘ ĐÔI TEXTURE MÀU (MAP) + BẢN ĐỒ ĐỘ NỔI (BUMP MAP) CHO TƯỜNG (2048x1024)
 */
export function generateRichWallMaterialMaps(themeKey = 'truyenKieu') {
  const cacheKey = `wall_maps_v5_${themeKey}`;
  if (WALL_TEXTURE_CACHE.has(cacheKey)) return WALL_TEXTURE_CACHE.get(cacheKey);

  const profile = WALL_THEME_PROFILES[themeKey] || WALL_THEME_PROFILES.truyenKieu;

  const colorCanvas = document.createElement('canvas');
  const bumpCanvas = document.createElement('canvas');
  colorCanvas.width = bumpCanvas.width = 2048;
  colorCanvas.height = bumpCanvas.height = 1024;

  const cCtx = colorCanvas.getContext('2d');
  const bCtx = bumpCanvas.getContext('2d');

  const w = 2048;
  const h = 1024;

  // --- NỀN TƯỜNG GẤM / SƠN MÀI ---
  const bgGrad = cCtx.createLinearGradient(0, 0, 0, h);
  bgGrad.addColorStop(0.0, profile.baseTop);
  bgGrad.addColorStop(0.5, profile.baseMid);
  bgGrad.addColorStop(1.0, profile.baseBottom);
  cCtx.fillStyle = bgGrad;
  cCtx.fillRect(0, 0, w, h);

  // Nền Bump Map
  bCtx.fillStyle = 'rgb(40, 40, 40)';
  bCtx.fillRect(0, 0, w, h);

  // --- VÂN LỤA GẤM & HỌA TIẾT NỀN CHÌM ---
  cCtx.strokeStyle = 'rgba(253, 224, 71, 0.16)';
  cCtx.lineWidth = 2;
  bCtx.strokeStyle = 'rgb(105, 105, 105)';
  bCtx.lineWidth = 3;

  const gridStep = 128;
  for (let x = gridStep / 2; x < w; x += gridStep) {
    for (let y = 180; y < h - 220; y += gridStep) {
      if (profile.motifType === 'peachBlossomSilk') {
        for (let p = 0; p < 5; p++) {
          const ang = (p / 5) * Math.PI * 2;
          const px = x + Math.cos(ang) * 22;
          const py = y + Math.sin(ang) * 22;
          cCtx.beginPath(); cCtx.arc(px, py, 14, 0, Math.PI * 2); cCtx.stroke();
          bCtx.beginPath(); bCtx.arc(px, py, 14, 0, Math.PI * 2); bCtx.stroke();
        }
        cCtx.beginPath(); cCtx.arc(x, y, 6, 0, Math.PI * 2); cCtx.stroke();
        bCtx.beginPath(); bCtx.arc(x, y, 6, 0, Math.PI * 2); bCtx.stroke();
      } else if (profile.motifType === 'wavesAndMountains') {
        for (let r = 18; r <= 54; r += 18) {
          cCtx.beginPath(); cCtx.arc(x, y + 20, r, Math.PI, 0); cCtx.stroke();
          bCtx.beginPath(); bCtx.arc(x, y + 20, r, Math.PI, 0); bCtx.stroke();
        }
        cCtx.beginPath();
        cCtx.moveTo(x - 24, y + 24); cCtx.lineTo(x, y - 28); cCtx.lineTo(x + 24, y + 24);
        cCtx.stroke();
        bCtx.beginPath();
        bCtx.moveTo(x - 24, y + 24); bCtx.lineTo(x, y - 28); bCtx.lineTo(x + 24, y + 24);
        bCtx.stroke();
      } else if (profile.motifType === 'coLoaSpiral') {
        for (let r = 10; r <= 46; r += 12) {
          cCtx.beginPath(); cCtx.arc(x, y, r, 0, Math.PI * 1.65); cCtx.stroke();
          bCtx.beginPath(); bCtx.arc(x, y, r, 0, Math.PI * 1.65); bCtx.stroke();
        }
        cCtx.beginPath();
        for (let s = 0; s < 6; s++) {
          const a = (s / 6) * Math.PI * 2;
          const hx = x + Math.cos(a) * 16;
          const hy = y + Math.sin(a) * 16;
          if (s === 0) cCtx.moveTo(hx, hy); else cCtx.lineTo(hx, hy);
        }
        cCtx.closePath(); cCtx.stroke();
      } else if (profile.motifType === 'bambooAndSunrise') {
        cCtx.beginPath();
        cCtx.moveTo(x - 32, y - 32); cCtx.lineTo(x + 32, y + 32);
        cCtx.moveTo(x + 32, y - 32); cCtx.lineTo(x - 32, y + 32);
        cCtx.stroke();
        bCtx.beginPath();
        bCtx.moveTo(x - 32, y - 32); bCtx.lineTo(x + 32, y + 32);
        bCtx.moveTo(x + 32, y - 32); bCtx.lineTo(x - 32, y + 32);
        bCtx.stroke();
        cCtx.beginPath(); cCtx.arc(x, y, 22, Math.PI, 0); cCtx.stroke();
        bCtx.beginPath(); bCtx.arc(x, y, 22, Math.PI, 0); bCtx.stroke();
      } else {
        cCtx.strokeRect(x - 28, y - 28, 56, 56);
        bCtx.strokeRect(x - 28, y - 28, 56, 56);
        cCtx.beginPath(); cCtx.arc(x, y, 16, 0, Math.PI * 2); cCtx.stroke();
        bCtx.beginPath(); bCtx.arc(x, y, 16, 0, Math.PI * 2); bCtx.stroke();
      }
    }
  }

  // --- DIỀM TRẦN CỔ THÁP (CROWN FRIEZE) ---
  cCtx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  cCtx.fillRect(0, 0, w, 130);
  cCtx.strokeStyle = profile.goldStroke;
  cCtx.lineWidth = 6;
  bCtx.strokeStyle = 'rgb(245, 245, 245)';
  bCtx.lineWidth = 8;

  cCtx.beginPath(); cCtx.moveTo(0, 130); cCtx.lineTo(w, 130); cCtx.stroke();
  bCtx.beginPath(); bCtx.moveTo(0, 130); bCtx.lineTo(w, 130); bCtx.stroke();

  for (let fx = 20; fx < w; fx += 96) {
    cCtx.strokeRect(fx, 28, 64, 64);
    cCtx.strokeRect(fx + 16, 44, 32, 32);
    bCtx.strokeRect(fx, 28, 64, 64);
    bCtx.strokeRect(fx + 16, 44, 32, 32);
  }

  const colorMap = new THREE.CanvasTexture(colorCanvas);
  const bumpMap = new THREE.CanvasTexture(bumpCanvas);

  [colorMap, bumpMap].forEach((t) => {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.needsUpdate = true;
  });

  if ('colorSpace' in colorMap && THREE.SRGBColorSpace) {
    colorMap.colorSpace = THREE.SRGBColorSpace;
  }

  const result = { colorMap, bumpMap };
  WALL_TEXTURE_CACHE.set(cacheKey, result);
  return result;
}

/**
 * 2. TẠO TRANH PHÙ ĐIÊU SƠN MÀI KHẮC CHỦ ĐỀ NỔI KHỐI TRÊN TƯỜNG (KẾT HỢP BLENDER GLB)
 * Model wall_lacquer_frame_3d.glb chuẩn: Width=3.66m, Height=2.16m, Depth=0.08m
 */
export function createWallReliefFrame({
  title,
  subtitle,
  themeKey = 'truyenKieu',
  width = 3.6,
  height = 2.1
} = {}) {
  const profile = WALL_THEME_PROFILES[themeKey] || WALL_THEME_PROFILES.truyenKieu;
  const group = new THREE.Group();
  group.name = `Wall_Relief_${title}`;
  group.userData.ignoreRaycaster = true;

  // 1. Mặt tranh sơn mài thư pháp
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, 1024, 512);
  g.addColorStop(0.0, profile.baseTop);
  g.addColorStop(0.5, profile.baseMid);
  g.addColorStop(1.0, profile.baseBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1024, 512);

  // Viền hoa văn chỉ vàng
  ctx.strokeStyle = profile.goldStroke;
  ctx.lineWidth = 10;
  ctx.strokeRect(20, 20, 984, 472);
  ctx.strokeStyle = profile.secondaryStroke;
  ctx.lineWidth = 4;
  ctx.strokeRect(38, 38, 948, 436);

  // Vòng tròn họa tiết tâm
  ctx.strokeStyle = 'rgba(253, 224, 71, 0.22)';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(512, 256, 170, 0, Math.PI * 2);
  ctx.stroke();

  // Chữ tiêu đề & phụ đề
  ctx.fillStyle = profile.goldStroke;
  ctx.font = 'bold 46px "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.fillText(`❖ ${title} ❖`, 512, 205);

  ctx.fillStyle = '#fef9c3';
  ctx.font = 'italic 28px "Times New Roman", serif';
  ctx.fillText(subtitle, 512, 310);

  const tex = new THREE.CanvasTexture(canvas);
  if ('colorSpace' in tex && THREE.SRGBColorSpace) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }

  // Tấm canvas tranh nằm áp sát tường tại Z = 0.015
  const facePlane = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 0.90, height * 0.86),
    new THREE.MeshBasicMaterial({ map: tex })
  );
  facePlane.position.z = 0.015;
  facePlane.userData.ignoreRaycaster = true;
  group.add(facePlane);

  // 2. Khung viền mỏng dát vàng dự phòng (procedural fallback thanh mảnh dày 3cm)
  const fallbackBorder = new THREE.Group();
  fallbackBorder.userData.ignoreRaycaster = true;
  const goldBorderMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    metalness: 0.88,
    roughness: 0.20
  });

  // 4 thanh nẹp viền mỏng ốp sát tường
  const railTop = new THREE.Mesh(new THREE.BoxGeometry(width, 0.10, 0.03), goldBorderMat);
  railTop.position.set(0, height * 0.5 - 0.05, 0.015);
  railTop.userData.ignoreRaycaster = true;

  const railBot = new THREE.Mesh(new THREE.BoxGeometry(width, 0.10, 0.03), goldBorderMat);
  railBot.position.set(0, -height * 0.5 + 0.05, 0.015);
  railBot.userData.ignoreRaycaster = true;

  const stileL = new THREE.Mesh(new THREE.BoxGeometry(0.10, height - 0.20, 0.03), goldBorderMat);
  stileL.position.set(-width * 0.5 + 0.05, 0, 0.015);
  stileL.userData.ignoreRaycaster = true;

  const stileR = new THREE.Mesh(new THREE.BoxGeometry(0.10, height - 0.20, 0.03), goldBorderMat);
  stileR.position.set(width * 0.5 - 0.05, 0, 0.015);
  stileR.userData.ignoreRaycaster = true;

  fallbackBorder.add(railTop, railBot, stileL, stileR);
  group.add(fallbackBorder);

  // 3. Khung viền mỏng dát vàng mỹ thuật truyền thống (hoàn toàn phẳng áp sát tường)
  return group;
}

/**
 * 3. TẠO VÁCH BÌNH PHONG SONG GỖ HẮT SÁNG (THANH MẢNH ÁP SÁT TƯỜNG, KHÔNG NHÔ RA NGOÀI)
 */
export function createBacklitLatticeWallScreen({
  backlightColor = 0xfde047,
  height = 4.2,
  width = 1.6
} = {}) {
  const screenGroup = new THREE.Group();
  screenGroup.userData.ignoreRaycaster = true;

  // 1. Tấm lụa phát sáng dịu hắt sáng lên tường phía sau
  const silkGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 0.95, height * 0.95),
    new THREE.MeshBasicMaterial({
      color: backlightColor,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending
    })
  );
  silkGlow.position.z = 0.005;
  silkGlow.userData.ignoreRaycaster = true;
  screenGroup.add(silkGlow);

  // 2. Nan gỗ song thưa thanh mảnh áp sát tường (chiều sâu tối đa 2cm, tuyệt đối không chìa ngang)
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x3d0c0c,
    roughness: 0.35,
    metalness: 0.25
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.22,
    metalness: 0.85
  });

  // 2 thanh đố dọc ngoài cùng
  [-width * 0.5 + 0.04, width * 0.5 - 0.04].forEach((x) => {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, height, 0.02), woodMat);
    post.position.set(x, 0, 0.015);
    post.userData.ignoreRaycaster = true;
    screenGroup.add(post);
  });

  // 4 nan dọc
  [-width * 0.25, -width * 0.08, width * 0.08, width * 0.25].forEach((x) => {
    const slat = new THREE.Mesh(new THREE.BoxGeometry(0.02, height - 0.16, 0.015), goldMat);
    slat.position.set(x, 0, 0.015);
    slat.userData.ignoreRaycaster = true;
    screenGroup.add(slat);
  });

  // 8 nan ngang
  for (let yi = -height * 0.4; yi <= height * 0.4; yi += height * 0.12) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(width - 0.16, 0.02, 0.015), goldMat);
    bar.position.set(0, yi, 0.015);
    bar.userData.ignoreRaycaster = true;
    screenGroup.add(bar);
  }

  // Vòng nguyệt vàng ở chính giữa
  const centerRing = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.02, 8, 32), goldMat);
  centerRing.position.set(0, 0, 0.02);
  centerRing.userData.ignoreRaycaster = true;
  screenGroup.add(centerRing);

  return screenGroup;
}

/**
 * 4. HÀM CHÍNH: NÂNG CẤP TOÀN BỘ HỌA TIẾT & PHÙ ĐIÊU TƯỜNG (DÙNG CHO TẤT CẢ CÁC PHÒNG & SẢNH)
 */
export function upgradeRoomWallArchitecture(roomGroup, {
  themeKey = 'truyenKieu',
  roomWidth = 25.32,
  roomDepth = 27.30,
  wallHeight = 9.20,
  isLobby = false
} = {}) {
  if (!roomGroup) return null;

  // Tránh gắn trùng lặp nếu đã nâng cấp
  const existingDecor = roomGroup.getObjectByName(`Wall_Architecture_Reliefs_${themeKey}`);
  if (existingDecor) {
    return existingDecor;
  }

  const profile = WALL_THEME_PROFILES[themeKey] || WALL_THEME_PROFILES.truyenKieu;
  const { colorMap, bumpMap } = generateRichWallMaterialMaps(themeKey);

  // 1. Nâng cấp vật liệu của các mảng tường hiện có trong phòng sang PBR Bump-Mapped
  roomGroup.traverse((child) => {
    if (!child.isMesh) return;
    const isWallMesh =
      child.name?.toLowerCase().includes('wall') ||
      (child.geometry?.type === 'BoxGeometry' && child.position.y > 2.0 && child.position.y < 7.0);

    if (isWallMesh && !child.userData?.isBookPortal && !child.userData?.isSignMesh) {
      child.material = new THREE.MeshStandardMaterial({
        map: colorMap,
        bumpMap: bumpMap,
        bumpScale: 0.05,
        roughness: 0.36,
        metalness: 0.22
      });
      child.userData.ignoreRaycaster = true;
    }
  });

  const wallDecorGroup = new THREE.Group();
  wallDecorGroup.name = `Wall_Architecture_Reliefs_${themeKey}`;
  wallDecorGroup.userData.ignoreRaycaster = true;

  if (isLobby || themeKey === 'lobby') {
    // -----------------------------------------------------------------------
    // ĐẠI SẢNH & HÀNH LANG:
    // Treo 2 Phù Điêu Mặt Nguyệt Trống Đồng 3D tại 2 vòm cổng Bắc & Nam (Y = 7.2m)
    // TUYỆT ĐỐI KHÔNG cắm vách bình phong đè lên các bức tranh thơ hành lang
    // -----------------------------------------------------------------------
    loadHeritageGlbModel('/model/heritage/wall_dong_son_medallion.glb')
      .then((medallionScene) => {
        [
          { pos: [0, 7.2, -20.6], rotY: 0 },
          { pos: [0, 7.2, 20.6], rotY: Math.PI }
        ].forEach((slot) => {
          const med = medallionScene.clone(true);
          med.scale.set(1.1, 1.1, 1.0);
          med.position.set(...slot.pos);
          med.rotation.y = slot.rotY;
          med.userData.ignoreRaycaster = true;
          wallDecorGroup.add(med);
        });
      })
      .catch(() => {});

    roomGroup.add(wallDecorGroup);
    return wallDecorGroup;
  }

  // -------------------------------------------------------------------------
  // 4 PHÒNG CHUYÊN ĐỀ (TRUYỆN KIỀU, SƠN TINH - THỦY TINH, AN DƯƠNG VƯƠNG, VỢ NHẶT)
  // -------------------------------------------------------------------------
  const halfW = roomWidth * 0.5 - 0.08;
  const halfD = roomDepth * 0.5 - 0.08;

  // 2. Ốp Phào Chỉ Chân Tường (Y = 1.35m) & Phào Cổ Trần (Y = 8.05m) Thếp Vàng 3D
  const moldingMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    metalness: 0.88,
    roughness: 0.20
  });

  const wallRuns = [
    { pos: [0, 0, -halfD], len: roomWidth - 0.2, rotY: 0 },
    { pos: [-halfW, 0, 0], len: roomDepth - 0.2, rotY: Math.PI / 2 },
    { pos: [halfW, 0, 0], len: roomDepth - 0.2, rotY: -Math.PI / 2 }
  ];

  wallRuns.forEach((run) => {
    [1.35, Math.min(8.05, wallHeight - 0.4)].forEach((yLevel) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(run.len, 0.10, 0.04), moldingMat);
      rail.position.set(run.pos[0], yLevel, run.pos[2]);
      rail.rotation.y = run.rotY;
      rail.userData.ignoreRaycaster = true;
      wallDecorGroup.add(rail);
    });
  });

  // Đối với 4 phòng chuyên đề lớn (Truyện Kiều, Sơn Tinh - Thủy Tinh, An Dương Vương, Vợ Nhặt),
  // mỗi phòng đã có sẵn hệ thống tường tranh lụa thư pháp, tiểu cảnh sân khấu và hoành phi riêng.
  // TUYỆT ĐỐI KHÔNG treo thêm tranh phù điêu hay gắn bình phong đè lên hoành phi và hiện vật.
  const isHandCraftedRoom = ['truyenKieu', 'sonTinhThuyTinh', 'anDuongVuong', 'voNhat'].includes(themeKey);

  if (!isHandCraftedRoom) {
    // 3. Treo 4 Bức Phù Điêu Sơn Mài Nổi Khối Dọc 2 Vách Tường Trái và Phải (cho các phòng phụ)
    const panelCoords = [
      { pos: [-halfW + 0.04, 4.3, -4.5], rotY: Math.PI / 2 },
      { pos: [-halfW + 0.04, 4.3, 4.5], rotY: Math.PI / 2 },
      { pos: [halfW - 0.04, 4.3, -4.5], rotY: -Math.PI / 2 },
      { pos: [halfW - 0.04, 4.3, 4.5], rotY: -Math.PI / 2 }
    ];

    panelCoords.forEach((slot, idx) => {
      const info = profile.panels[idx % profile.panels.length];
      const mural = createWallReliefFrame({
        title: info.title,
        subtitle: info.subtitle,
        themeKey,
        width: 3.4,
        height: 2.0
      });
      mural.position.set(...slot.pos);
      mural.rotation.y = slot.rotY;
      wallDecorGroup.add(mural);
    });

    // 4. Lắp 2 Vách Bình Phong Song Gỗ Hắt Sáng nép hai bên Tường Hậu
    const latticeSlots = [
      { pos: [-6.8, 4.0, -halfD + 0.04], rotY: 0 },
      { pos: [6.8, 4.0, -halfD + 0.04], rotY: 0 }
    ];

    latticeSlots.forEach((slot) => {
      const screen = createBacklitLatticeWallScreen({
        backlightColor: profile.backlightColor,
        height: 4.2,
        width: 1.6
      });
      screen.position.set(...slot.pos);
      screen.rotation.y = slot.rotY;
      wallDecorGroup.add(screen);
    });
  }

  roomGroup.add(wallDecorGroup);
  return wallDecorGroup;
}
