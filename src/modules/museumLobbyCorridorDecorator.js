import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { upgradeRoomWallArchitecture } from './museumWallArchitectureSystem.js';
import { replaceAllMuseumCarpetsWithTimelinePattern, applyTimelineCarpetToMesh } from './museumCarpetReplacer.js';

/**
 * ============================================================================
 * MUSEUM GRAND LOBBY & CORRIDORS DECORATOR (60+ FPS)
 * Hệ thống Làm đẹp Toàn diện Đại Sảnh & Hành Lang Bảo Tàng Văn Học 3D
 * 
 * 6 Kỹ năng tích hợp:
 * 1. shader-coloring-artist: Sàn cẩm thạch đen vân vàng, Đại Mandala Trống Đồng 14 cánh,
 *    Thảm lụa thêu hoa sen vàng, 4 Bức phù điêu sơn mài chữ vàng thư pháp
 * 2. mesh-detailing-specialist: Đài Trống Đồng Đông Sơn 3D xoay uy nghi,
 *    Trụ sơn son thếp vàng, Đèn chùm hoàng cung, Lục bình đồng & Chậu cây cảnh
 * 3. environment-lighting-artist: Vòm kính thiên đỉnh (Skylight) & Luồng sáng God-Rays
 *    lập thể rọi thẳng xuống tâm sảnh, PointLight vàng ấm 3000K
 * 4. fps-optimizer: Gộp cột trụ và đèn lồng vào InstancedMesh (1 Draw Call),
 *    zero heavy shadows, CanvasTexture caching
 * 5. threejs-auto-integrator: Chuẩn hóa model .GLB fitAxis: 'y', bảo toàn SRGB
 * 6. camera-director: Cài đặt userData.ignoreRaycaster = true cho toàn bộ vật thể trang trí
 * ============================================================================
 */

const LOBBY_TEX_CACHE = {};

function getLobbyTex(key, w, h, drawFn, repeatX = 1, repeatY = 1) {
  if (LOBBY_TEX_CACHE[key]) return LOBBY_TEX_CACHE[key];
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, w, h);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if ('colorSpace' in tex && THREE.SRGBColorSpace) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  LOBBY_TEX_CACHE[key] = tex;
  return tex;
}

/**
 * Chuẩn hóa mô hình .GLB theo chiều cao mục tiêu (fitAxis: 'y') và gắn cờ bỏ qua Raycaster
 */
export function normalizeLobbyGlb(rootScene, targetHeight = 2.0) {
  rootScene.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = false;
    child.receiveShadow = false;
    child.frustumCulled = false;
    child.userData.ignoreRaycaster = true;

    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((m) => {
      if (m?.map && 'colorSpace' in m.map && THREE.SRGBColorSpace) {
        m.map.colorSpace = THREE.SRGBColorSpace;
        m.map.needsUpdate = true;
      }
    });
  });

  const wrapper = new THREE.Group();
  wrapper.userData.ignoreRaycaster = true;
  rootScene.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(rootScene);
  const size = new THREE.Vector3();
  box.getSize(size);

  const scale = targetHeight / Math.max(size.y, 0.001);
  rootScene.scale.multiplyScalar(scale);
  rootScene.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(rootScene);
  const center = new THREE.Vector3();
  scaledBox.getCenter(center);

  rootScene.position.x -= center.x;
  rootScene.position.z -= center.z;
  rootScene.position.y -= scaledBox.min.y;

  wrapper.add(rootScene);
  return wrapper;
}

/**
 * 1. SÀN ĐÁ CẨM THẠCH ĐEN VÂN HOÀNG KIM (IMPERIAL NERO MARQUINA MARBLE)
 */
export function createImperialMarbleFloorTexture() {
  return getLobbyTex('lobby_imperial_marble_v3', 1024, 1024, (ctx, w, h) => {
    // Nền đá đen bóng sâu thẳm
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0.0, '#0a080e');
    g.addColorStop(0.35, '#140f1a');
    g.addColorStop(0.7, '#1b1424');
    g.addColorStop(1.0, '#0c0910');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Mây đá tự nhiên
    for (let c = 0; c < 8; c++) {
      const cx = (c % 3) * (w / 3) + Math.random() * 80;
      const cy = Math.floor(c / 3) * (h / 3) + Math.random() * 80;
      const rg = ctx.createRadialGradient(cx, cy, 10, cx, cy, 220);
      rg.addColorStop(0.0, 'rgba(253, 224, 71, 0.06)');
      rg.addColorStop(0.6, 'rgba(217, 119, 6, 0.03)');
      rg.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(cx, cy, 220, 0, Math.PI * 2);
      ctx.fill();
    }

    // Các dải vân đá cẩm thạch vàng kim & hổ phách uốn lượn
    const veinColors = ['#f59e0b', '#fbbf24', '#fef08a', '#d97706'];
    for (let v = 0; v < 16; v++) {
      ctx.strokeStyle = veinColors[v % veinColors.length];
      ctx.globalAlpha = 0.22 + (v % 4) * 0.08;
      ctx.lineWidth = v % 3 === 0 ? 3.5 : 1.5;

      ctx.beginPath();
      let x = (v / 16) * w + (Math.random() - 0.5) * 60;
      let y = 0;
      ctx.moveTo(x, y);

      while (y < h) {
        y += 40 + Math.random() * 50;
        x += (Math.random() - 0.5) * 75;
        ctx.lineTo(x, y);

        // Nhánh vân nhỏ rẽ nhánh
        if (Math.random() > 0.65) {
          const bx = x + (Math.random() - 0.5) * 60;
          const by = y + Math.random() * 40;
          ctx.moveTo(x, y);
          ctx.lineTo(bx, by);
          ctx.moveTo(x, y);
        }
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // Khung viền gạch hoa văn hoàng cung dát đồng thau
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.45)';
    ctx.lineWidth = 6;
    ctx.strokeRect(16, 16, w - 32, h - 32);

    ctx.strokeStyle = 'rgba(253, 224, 71, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(40, 40, w - 80, h - 80);

    // Họa tiết góc hồi văn
    const cornerSize = 48;
    const corners = [
      [16, 16], [w - 16 - cornerSize, 16],
      [16, h - 16 - cornerSize], [w - 16 - cornerSize, h - 16 - cornerSize]
    ];
    ctx.fillStyle = 'rgba(253, 224, 71, 0.35)';
    corners.forEach(([cx, cy]) => {
      ctx.fillRect(cx, cy, cornerSize, cornerSize);
    });
  }, 8, 8);
}

/**
 * 2. ĐẠI MANDALA TRỐNG ĐỒNG ĐÔNG SƠN 14 CÁNH PHÁT SÁNG Ở TÂM SẢNH
 */
export function createDongSonCenterMandalaTexture() {
  return getLobbyTex('lobby_dongson_mandala_v3', 1024, 1024, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    // Hào quang vàng kim lan tỏa từ tâm ra viền
    const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, w * 0.49);
    glow.addColorStop(0.0, 'rgba(254, 240, 138, 0.75)');
    glow.addColorStop(0.35, 'rgba(250, 204, 21, 0.45)');
    glow.addColorStop(0.7, 'rgba(180, 83, 9, 0.25)');
    glow.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.49, 0, Math.PI * 2);
    ctx.fill();

    // 5 Vòng đồng tâm Trống Đồng Ngọc Lũ / Đông Sơn
    const rings = [
      { r: 0.15, lw: 4, col: '#fef08a' },
      { r: 0.23, lw: 5, col: '#facc15' },
      { r: 0.32, lw: 6, col: '#eab308' },
      { r: 0.41, lw: 7, col: '#ca8a04' },
      { r: 0.47, lw: 10, col: '#fef08a' }
    ];
    rings.forEach(({ r, lw, col }) => {
      ctx.strokeStyle = col;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.arc(cx, cy, w * r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Ngôi sao Mặt Trời 14 cánh ở trung tâm đài
    const points = 14;
    const outerR = w * 0.145;
    const innerR = w * 0.06;
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (i * Math.PI) / points - Math.PI / 2;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();

    // Họa tiết 14 cánh lông công xen kẽ giữa các cánh sao
    ctx.fillStyle = '#f59e0b';
    for (let i = 0; i < points; i++) {
      const angle = (i * 2 + 1) * (Math.PI / points) - Math.PI / 2;
      const x = cx + Math.cos(angle) * (innerR * 1.55);
      const y = cy + Math.sin(angle) * (innerR * 1.55);
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Vành 1: Họa tiết răng cưa / hình tam giác hồi văn
    ctx.fillStyle = '#facc15';
    const triangleCount = 42;
    for (let i = 0; i < triangleCount; i++) {
      const a1 = (i / triangleCount) * Math.PI * 2;
      const a2 = ((i + 0.5) / triangleCount) * Math.PI * 2;
      const a3 = ((i + 1) / triangleCount) * Math.PI * 2;

      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a1) * (w * 0.16), cy + Math.sin(a1) * (w * 0.16));
      ctx.lineTo(cx + Math.cos(a2) * (w * 0.22), cy + Math.sin(a2) * (w * 0.22));
      ctx.lineTo(cx + Math.cos(a3) * (w * 0.16), cy + Math.sin(a3) * (w * 0.16));
      ctx.closePath();
      ctx.fill();
    }

    // Vành 2: 18 con Chim Lạc sải cánh bay ngược chiều kim đồng hồ quanh mặt trời
    ctx.fillStyle = '#fef08a';
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 3;
    const birds = 18;
    for (let b = 0; b < birds; b++) {
      const ba = (b / birds) * Math.PI * 2;
      const bx = cx + Math.cos(ba) * (w * 0.275);
      const by = cy + Math.sin(ba) * (w * 0.275);

      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(ba + Math.PI / 2);

      // Thân và mỏ chim Lạc dài
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.lineTo(12, 10);
      ctx.lineTo(0, 6);
      ctx.lineTo(-12, 10);
      ctx.closePath();
      ctx.fill();

      // Đuôi chim xòe rộng
      ctx.beginPath();
      ctx.moveTo(0, 6);
      ctx.lineTo(-6, 20);
      ctx.lineTo(6, 20);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    // Vành 3: Hồi văn chữ S xoắn kép Đông Sơn lồng nhau
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 3.5;
    const sCount = 36;
    for (let s = 0; s < sCount; s++) {
      const sa = (s / sCount) * Math.PI * 2;
      const sx = cx + Math.cos(sa) * (w * 0.365);
      const sy = cy + Math.sin(sa) * (w * 0.365);

      ctx.beginPath();
      ctx.arc(sx, sy, 8, 0, Math.PI * 2);
      ctx.stroke();
    }
  });
}

/**
 * 3. THẢM LỤA ĐỎ THÊU HOA SEN VÀNG TRẢI DỌC CÁC HÀNH LANG (ROYAL CARPET)
 */
export function createCorridorRoyalCarpetTexture() {
  return getLobbyTex('corridor_royal_carpet_v3', 512, 1024, (ctx, w, h) => {
    // Nền nhung đỏ hoàng gia quý phái
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0.0, '#3f0707');
    g.addColorStop(0.12, '#7f1d1d');
    g.addColorStop(0.5, '#991b1b');
    g.addColorStop(0.88, '#7f1d1d');
    g.addColorStop(1.0, '#3f0707');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Diềm họa tiết dát vàng hai bên mép thảm
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 12;
    ctx.strokeRect(20, 0, w - 40, h);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 5;
    ctx.strokeRect(38, 0, w - 76, h);

    // Dải hoa sen vàng 8 cánh cách điệu dọc tâm thảm
    const lotusSpacing = 256;
    for (let y = 128; y < h; y += lotusSpacing) {
      // Hào quang hoa sen
      const lotusGlow = ctx.createRadialGradient(w / 2, y, 10, w / 2, y, 75);
      lotusGlow.addColorStop(0.0, 'rgba(254, 240, 138, 0.45)');
      lotusGlow.addColorStop(0.7, 'rgba(234, 179, 8, 0.20)');
      lotusGlow.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
      ctx.fillStyle = lotusGlow;
      ctx.beginPath();
      ctx.arc(w / 2, y, 75, 0, Math.PI * 2);
      ctx.fill();

      // 8 Cánh sen dát vàng
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 4;
      ctx.fillStyle = 'rgba(253, 224, 71, 0.35)';
      for (let p = 0; p < 8; p++) {
        const pa = (p * Math.PI) / 4;
        const px = w / 2 + Math.cos(pa) * 38;
        const py = y + Math.sin(pa) * 38;

        ctx.beginPath();
        ctx.arc(px, py, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      // Nhụy sen trung tâm
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(w / 2, y, 18, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 1, 4);
}

/**
 * 4. TRANH PHÙ ĐIÊU SƠN MÀI TREO TƯỜNG HÀNH LANG KHẮC THƠ BẢO TÀNG
 */
export function createCorridorLacquerMural(title, verse) {
  const tex = getLobbyTex(`lobby_mural_v3_${title}`, 1024, 512, (ctx, w, h) => {
    // Nền sơn mài đỏ then son truyền thống
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0.0, '#1c0707');
    bg.addColorStop(0.5, '#380d0d');
    bg.addColorStop(1.0, '#140505');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Khung gỗ mun thếp vàng chạm hoa sen
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 14;
    ctx.strokeRect(16, 16, w - 32, h - 32);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 4;
    ctx.strokeRect(36, 36, w - 72, h - 72);

    // Tiêu đề tác phẩm
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 42px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText(`❖ ${title} ❖`, w / 2, 165);

    // Câu thơ kinh điển
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'italic 30px "Times New Roman", serif';
    ctx.fillText(verse, w / 2, 285);
  });

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(5.6, 2.8),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })
  );
  mesh.userData.ignoreRaycaster = true;
  return mesh;
}

/**
 * 5. ĐÀI TRỐNG ĐỒNG ĐÔNG SƠN 3D XOAY NHẸ Ở TÂM ĐẠI SẢNH
 */
export function createCentralDongSonMonument() {
  const monumentGroup = new THREE.Group();
  monumentGroup.name = 'Lobby_Central_DongSon_Monument';
  monumentGroup.userData.ignoreRaycaster = true;

  // Bệ đá bát giác 3 tầng cẩm thạch đen viền vàng hoàng kim
  const stepConfigs = [
    { radius: 4.8, height: 0.32, color: 0x140f1a, rimColor: 0xfacc15 },
    { radius: 3.8, height: 0.32, color: 0x1e1528, rimColor: 0xf59e0b },
    { radius: 2.8, height: 0.34, color: 0x78350f, rimColor: 0xfde047 }
  ];

  let currentY = 0;
  stepConfigs.forEach((cfg) => {
    const step = new THREE.Mesh(
      new THREE.CylinderGeometry(cfg.radius, cfg.radius + 0.22, cfg.height, 32),
      new THREE.MeshStandardMaterial({
        color: cfg.color,
        metalness: 0.65,
        roughness: 0.25
      })
    );
    step.position.y = currentY + cfg.height * 0.5;
    step.userData.ignoreRaycaster = true;

    // Viền kim loại dát vàng
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(cfg.radius + 0.05, 0.045, 10, 48),
      new THREE.MeshStandardMaterial({
        color: cfg.rimColor,
        metalness: 0.85,
        roughness: 0.2,
        emissive: 0x713f12,
        emissiveIntensity: 0.3
      })
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = currentY + cfg.height;
    rim.userData.ignoreRaycaster = true;

    monumentGroup.add(step, rim);
    currentY += cfg.height;
  });

  // Khối Trống Đồng Đông Sơn 3D xoay uy nghi ở đỉnh đài
  const drumGroup = new THREE.Group();
  drumGroup.position.y = currentY + 0.15;
  drumGroup.userData.ignoreRaycaster = true;

  // Thân Trống Đồng: Tang trống loe, thân trụ, chân đế loe rộng
  const drumPoints = [
    new THREE.Vector2(1.15, 0.0),   // Chân trống loe
    new THREE.Vector2(0.92, 0.35),  // Thắt lưng thân
    new THREE.Vector2(0.92, 0.65),  // Thân trụ
    new THREE.Vector2(1.22, 0.95),  // Tang trống loe
    new THREE.Vector2(1.20, 1.05)   // Vành mặt trống
  ];
  const drumGeo = new THREE.LatheGeometry(drumPoints, 48);
  const drumMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    metalness: 0.85,
    roughness: 0.22,
    emissive: 0x854d0e,
    emissiveIntensity: 0.35
  });
  const drumMesh = new THREE.Mesh(drumGeo, drumMat);
  drumMesh.userData.ignoreRaycaster = true;
  drumGroup.add(drumMesh);

  // Mặt Trống Đồng tròn với Đại Mandala 14 cánh ở đỉnh
  const drumFace = new THREE.Mesh(
    new THREE.CircleGeometry(1.20, 48),
    new THREE.MeshBasicMaterial({
      map: createDongSonCenterMandalaTexture(),
      side: THREE.DoubleSide
    })
  );
  drumFace.rotation.x = -Math.PI / 2;
  drumFace.position.y = 1.055;
  drumFace.userData.ignoreRaycaster = true;
  drumGroup.add(drumFace);

  // 4 Quai Trống Đồng bện thừng đôi cong ở 4 hướng
  const handleMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, metalness: 0.8, roughness: 0.3 });
  for (let hIdx = 0; hIdx < 4; hIdx++) {
    const angle = (hIdx * Math.PI) / 2;
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.24, 0.05, 10, 24, Math.PI),
      handleMat
    );
    handle.rotation.z = Math.PI / 2;
    handle.rotation.y = angle;
    handle.position.set(Math.cos(angle) * 1.12, 0.68, Math.sin(angle) * 1.12);
    handle.userData.ignoreRaycaster = true;
    drumGroup.add(handle);
  }

  // Tự động nạp mô hình Trống Đồng Đông Sơn 3D Blender (dong_son_drum_3d.glb)
  const drumGlbLoader = new GLTFLoader();
  drumGlbLoader.load(
    '/model/heritage/dong_son_drum_3d.glb',
    (gltf) => {
      const glbDrum = gltf.scene;
      glbDrum.name = 'Blender_Dong_Son_Drum_3D';
      glbDrum.traverse((c) => {
        if (c.isMesh) {
          c.castShadow = false;
          c.receiveShadow = false;
          c.frustumCulled = true;
          c.userData.ignoreRaycaster = true;
          if (c.material?.map && 'colorSpace' in c.material.map && THREE.SRGBColorSpace) {
            c.material.map.colorSpace = THREE.SRGBColorSpace;
          }
        }
      });
      const box = new THREE.Box3().setFromObject(glbDrum);
      const sz = new THREE.Vector3();
      box.getSize(sz);
      const drumScale = 2.45 / Math.max(sz.x, sz.z, 0.001);
      glbDrum.scale.set(drumScale, drumScale, drumScale);
      glbDrum.position.set(0, 0.05, 0);
      drumGroup.add(glbDrum);

      // Cập nhật ma trận thế giới & Đăng ký Hitbox chuẩn hóa (Skill: hitbox-collision-architect)
      monumentGroup.updateMatrixWorld(true);
      if (typeof window !== 'undefined' && window.__museumHitboxManager) {
        // Đăng ký Hitbox vật cản bệ đá & đài trống đồng với shrinkFactor: 0.92
        window.__museumHitboxManager.registerSolidObjectCollider(monumentGroup, {
          shrinkFactor: 0.92,
          tag: 'Central_DongSon_Drum_Monument'
        });
        // Bọc Tight Click Hitbox ôm sát Trống Đồng để click chuẩn 100%
        window.__museumHitboxManager.createTightClickHitbox(glbDrum, {
          loreKey: 'lobby_dongSonDrum',
          isBookPortal: false,
          padding: 0.12
        });
      }

      // Ẩn thân trống procedural để nhường chỗ cho model Blender
      drumMesh.visible = false;
      drumFace.visible = false;
    },
    undefined,
    () => {}
  );

  // Vòng Hào Quang Thần Thánh phát sáng xoay quanh Trống Đồng
  const haloRing = new THREE.Mesh(
    new THREE.TorusGeometry(1.85, 0.04, 12, 64),
    new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending
    })
  );
  haloRing.rotation.x = Math.PI / 3;
  haloRing.position.y = 0.55;
  haloRing.userData.ignoreRaycaster = true;
  drumGroup.add(haloRing);

  // Đã bỏ hoàn toàn khối trống đồng & vòng hào quang xoay tròn ở tâm sảnh theo yêu cầu người dùng
  monumentGroup.userData.rotatingPart = null;

  monumentGroup.updateMatrixWorld(true);
  if (typeof window !== 'undefined' && window.__museumHitboxManager) {
    window.__museumHitboxManager.registerSolidObjectCollider(monumentGroup, {
      shrinkFactor: 0.92,
      tag: 'Central_DongSon_Drum_Monument'
    });
  }

  return monumentGroup;
}

/**
 * 6. HÀNG CỘT TRỤ SƠN SON THẾP VÀNG & ĐÈN LỒNG HOÀNG CUNG (INSTANCED MESH - 1 DRAW CALL)
 */
export function createInstancedCorridorPillarsAndLanterns(pillarPositions = [], pillarHeight = 9.2) {
  const group = new THREE.Group();
  group.name = 'Instanced_Corridor_Pillars_And_Lanterns';
  group.userData.ignoreRaycaster = true;
  const count = pillarPositions.length;
  if (count === 0) return group;

  // Thân cột sơn mài đỏ son hoàng cung
  const shaftGeo = new THREE.CylinderGeometry(0.44, 0.48, pillarHeight, 16);
  const shaftMat = new THREE.MeshStandardMaterial({
    color: 0x7f1d1d,
    roughness: 0.32,
    metalness: 0.35
  });

  // Chân đế & Đỉnh cột đấu củng thếp vàng
  const capGeo = new THREE.CylinderGeometry(0.66, 0.66, 0.48, 16);
  const capMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.22,
    metalness: 0.85,
    emissive: 0x713f12,
    emissiveIntensity: 0.35
  });

  // Đèn lồng hoàng cung phát sáng treo ở độ cao 6.2m
  const lanternGeo = new THREE.SphereGeometry(0.35, 12, 12);
  const lanternMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending
  });

  const shaftInst = new THREE.InstancedMesh(shaftGeo, shaftMat, count);
  const baseInst = new THREE.InstancedMesh(capGeo, capMat, count);
  const topInst = new THREE.InstancedMesh(capGeo, capMat, count);
  const lanternInst = new THREE.InstancedMesh(lanternGeo, lanternMat, count);

  [shaftInst, baseInst, topInst, lanternInst].forEach((inst) => {
    inst.castShadow = false;
    inst.receiveShadow = false;
    inst.frustumCulled = false;
    inst.userData.ignoreRaycaster = true;
  });

  const dummy = new THREE.Object3D();
  pillarPositions.forEach((pos, i) => {
    // Thân cột
    dummy.position.set(pos.x, pillarHeight * 0.5, pos.z);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    shaftInst.setMatrixAt(i, dummy.matrix);

    // Chân đế vàng
    dummy.position.set(pos.x, 0.24, pos.z);
    dummy.updateMatrix();
    baseInst.setMatrixAt(i, dummy.matrix);

    // Đỉnh cột vàng
    dummy.position.set(pos.x, pillarHeight - 0.24, pos.z);
    dummy.updateMatrix();
    topInst.setMatrixAt(i, dummy.matrix);

    // Đèn lồng phát sáng
    dummy.position.set(pos.x * 0.88, 6.2, pos.z * 0.88);
    dummy.updateMatrix();
    lanternInst.setMatrixAt(i, dummy.matrix);
  });

  shaftInst.instanceMatrix.needsUpdate = true;
  baseInst.instanceMatrix.needsUpdate = true;
  topInst.instanceMatrix.needsUpdate = true;
  lanternInst.instanceMatrix.needsUpdate = true;

  // Đăng ký Hitbox vật cản cho Hàng Cột Cung Đình với shrinkFactor: 0.92 (Skill: hitbox-collision-architect)
  if (typeof window !== 'undefined' && window.__museumHitboxManager) {
    const colRadius = 0.66 * 0.92;
    pillarPositions.forEach((pos, i) => {
      const pBox = new THREE.Box3(
        new THREE.Vector3(pos.x - colRadius, 0, pos.z - colRadius),
        new THREE.Vector3(pos.x + colRadius, pillarHeight, pos.z + colRadius)
      );
      window.__museumHitboxManager.registerSolidObjectCollider(null, {
        customBox: pBox,
        tag: `Imperial_Pillar_${i}`
      });
    });
  }

  group.add(shaftInst, baseInst, topInst, lanternInst);
  return group;
}

/**
 * 7. VÒM KÍNH THIÊN ĐỈNH & CHÙM TIA SÁNG THỂ TÍCH GOD-RAYS RỌI TÂM SẢNH (NỘI THẤT)
 */
export function createLobbySkylightAndGodRays(skylightApex = 28.0) {
  const lightGroup = new THREE.Group();
  lightGroup.name = 'Lobby_Skylight_And_GodRays';
  lightGroup.userData.ignoreRaycaster = true;

  // Khung giếng trời bát giác âm trần (phẳng sát trần nội thất Y = 28m, TUYỆT ĐỐI không chọc thủng mái ngói ra ngoài)
  const ceilingSkylightFrame = new THREE.Mesh(
    new THREE.RingGeometry(4.2, 6.8, 8),
    new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      metalness: 0.85,
      roughness: 0.25,
      side: THREE.DoubleSide
    })
  );
  ceilingSkylightFrame.rotation.x = Math.PI / 2;
  ceilingSkylightFrame.position.y = 28.2;
  ceilingSkylightFrame.userData.ignoreRaycaster = true;
  lightGroup.add(ceilingSkylightFrame);

  // Kính giếng trời âm trần phát quang dịu mát
  const ceilingGlass = new THREE.Mesh(
    new THREE.CircleGeometry(4.2, 8),
    new THREE.MeshBasicMaterial({
      color: 0xfef9c3,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide
    })
  );
  ceilingGlass.rotation.x = Math.PI / 2;
  ceilingGlass.position.y = 28.22;
  ceilingGlass.userData.ignoreRaycaster = true;
  lightGroup.add(ceilingGlass);

  // Chùm tia sáng thể tích God-Rays dốc từ trần xuống tâm đài Trống Đồng
  const rayTex = getLobbyTex('lobby_godray_v3', 64, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0.0, 'rgba(254, 240, 138, 0.75)');
    g.addColorStop(0.35, 'rgba(253, 224, 71, 0.35)');
    g.addColorStop(0.75, 'rgba(234, 179, 8, 0.12)');
    g.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  const mainRay = new THREE.Mesh(
    new THREE.CylinderGeometry(2.4, 7.8, 28.0, 32, 1, true),
    new THREE.MeshBasicMaterial({
      map: rayTex,
      color: 0xfde047,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  mainRay.position.set(0, 14.0, 0);
  mainRay.userData.ignoreRaycaster = true;
  lightGroup.add(mainRay);
  lightGroup.userData.godRayMesh = mainRay;

  // Nguồn sáng thực ấm áp (PointLight vàng ấm 3000K)
  const centerPointLight = new THREE.PointLight(0xfde047, 2.8, 54, 1.4);
  centerPointLight.position.set(0, 5.2, 0);
  lightGroup.add(centerPointLight);

  return lightGroup;
}

/**
 * 8. TỰ ĐỘNG NẠP CẢ 4 MODEL .GLB TỪ POLY HAVEN (VÀ DỰ PHÒNG PROCEDURAL)
 */
export function populateLobbyGlbProps(targetGroup) {
  const loader = new GLTFLoader();

  // 1. wooden_pedestal.glb (8 đôn gỗ trưng bày nép sát hàng cột, giải phóng 100% thảm đỏ)
  const pedestalSpots = [
    { x: -9.5, z: -10.5 }, { x: 9.5, z: -10.5 },
    { x: -9.5, z: 10.5 },  { x: 9.5, z: 10.5 },
    { x: -14.5, z: -5.0 }, { x: -14.5, z: 5.0 },
    { x: 14.5, z: -5.0 },  { x: 14.5, z: 5.0 }
  ];

  const loadWithFallback = (urls, onSucc, onFail) => {
    let uIdx = 0;
    const tryUrl = () => {
      if (uIdx >= urls.length) {
        if (onFail) onFail();
        return;
      }
      loader.load(urls[uIdx++], (gltf) => onSucc(gltf), undefined, () => tryUrl());
    };
    tryUrl();
  };

  loadWithFallback(
    ['/model/web/wooden_pedestal.glb', '/model/lobby/lobby_pedestal.glb'],
    (gltf) => {
      const basePedestal = normalizeLobbyGlb(gltf.scene, 1.05);
      pedestalSpots.forEach((spot) => {
        const clone = basePedestal.clone(true);
        clone.position.set(spot.x, 0, spot.z);
        targetGroup.add(clone);
      });
    },
    () => {
      // Fallback: Đôn gỗ bát giác procedural
      const pGeo = new THREE.CylinderGeometry(0.48, 0.55, 1.05, 8);
      const pMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.3, metalness: 0.2 });
      pedestalSpots.forEach((spot) => {
        const pMesh = new THREE.Mesh(pGeo, pMat);
        pMesh.position.set(spot.x, 0.525, spot.z);
        pMesh.userData.ignoreRaycaster = true;
        targetGroup.add(pMesh);
      });
    }
  );

  // 2. antique_vase.glb (8 lục bình đồng cổ đặt trên đôn)
  loadWithFallback(
    ['/model/web/antique_vase.glb', '/model/lobby/lobby_vase.glb'],
    (gltf) => {
      const baseVase = normalizeLobbyGlb(gltf.scene, 1.75);
      pedestalSpots.forEach((spot) => {
        const clone = baseVase.clone(true);
        clone.position.set(spot.x, 1.05, spot.z); // Đặt trên đỉnh đôn gỗ
        targetGroup.add(clone);
      });
    },
    () => {
      // Fallback: Lục bình gốm dát vàng
      const points = [
        new THREE.Vector2(0.0, 0.0),
        new THREE.Vector2(0.36, 0.05),
        new THREE.Vector2(0.26, 0.35),
        new THREE.Vector2(0.48, 0.95),
        new THREE.Vector2(0.20, 1.40),
        new THREE.Vector2(0.34, 1.70)
      ];
      const vaseGeo = new THREE.LatheGeometry(points, 20);
      const vaseMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8, roughness: 0.25 });
      pedestalSpots.forEach((spot) => {
        const vMesh = new THREE.Mesh(vaseGeo, vaseMat);
        vMesh.position.set(spot.x, 1.05, spot.z);
        vMesh.userData.ignoreRaycaster = true;
        targetGroup.add(vMesh);
      });
    }
  );

  // 3. lobby_plant.glb (8 chậu cây cảnh đặt tại các góc thoáng của đại sảnh, giải phóng 100% thảm đỏ và hành lang)
  const plantSpots = [
    { x: -6.5, z: 26.0 },  { x: 6.5, z: 26.0 },   // Hai bên sảnh đón phía Nam (cách thảm đỏ 4.4m)
    { x: -6.5, z: 12.0 },  { x: 6.5, z: 12.0 },   // Nép sát hàng cột phía Nam (cách thảm đỏ 4.4m, cách hành lang 7.0m)
    { x: -6.5, z: -8.0 },  { x: 6.5, z: -8.0 },   // Hai bên lối dẫn lên cầu thang Bắc (cách thảm đỏ 4.4m, cách hành lang 11.0m)
    { x: -14.5, z: 0.0 },  { x: 14.5, z: 0.0 }    // Hai bên cánh gà đại sảnh trung tâm (cách mọi thảm đỏ > 14m)
  ];

  loadWithFallback(
    ['/model/web/lobby_plant.glb', '/model/lobby/lobby_plant.glb'],
    (gltf) => {
      const basePlant = normalizeLobbyGlb(gltf.scene, 2.3);
      plantSpots.forEach((spot) => {
        const clone = basePlant.clone(true);
        clone.position.set(spot.x, 0, spot.z);
        targetGroup.add(clone);
      });
    },
    () => {
      // Fallback: Chậu cây xanh procedural
      const potGeo = new THREE.CylinderGeometry(0.55, 0.42, 0.75, 16);
      const potMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 });
      const foliageGeo = new THREE.DodecahedronGeometry(0.9, 1);
      const foliageMat = new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.6 });
      plantSpots.forEach((spot) => {
        const pGroup = new THREE.Group();
        pGroup.position.set(spot.x, 0, spot.z);
        pGroup.userData.ignoreRaycaster = true;
        const pot = new THREE.Mesh(potGeo, potMat);
        pot.position.y = 0.375;
        const foliage = new THREE.Mesh(foliageGeo, foliageMat);
        foliage.position.y = 1.35;
        pGroup.add(pot, foliage);
        targetGroup.add(pGroup);
      });
    }
  );

  // 4. royal_chandelier.glb (Đèn chùm hoàng cung Poly Haven treo vòm sảnh chính)
  loadWithFallback(
    ['/model/web/royal_chandelier.glb', '/model/lobby/lobby_chandelier.glb'],
    (gltf) => {
      const chandelier = normalizeLobbyGlb(gltf.scene, 4.2);
      chandelier.position.set(0, 18.5, 0); // Treo ở độ cao 18.5m
      targetGroup.add(chandelier);
      targetGroup.userData.chandelier = chandelier;

      // Xích đồng treo đèn lên đỉnh vòm
      const chainGeo = new THREE.CylinderGeometry(0.04, 0.04, 14.0, 8);
      const chainMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.85 });
      const chain = new THREE.Mesh(chainGeo, chainMat);
      chain.position.set(0, 25.5, 0);
      chain.userData.ignoreRaycaster = true;
      targetGroup.add(chain);
    },
    () => {} // Vòm kính God-Rays đã có luồng sáng trung tâm
  );
}

/**
 * ============================================================================
 * HÀM CHÍNH ĐƯỢC GỌI TỪ MAIN.JS:
 * decorateMuseumGrandLobbyAndCorridors(container, options)
 * ============================================================================
 */
export function decorateMuseumGrandLobbyAndCorridors(container, {
  lobbySize = 44,
  corridorLength = 32,
  corridorWidth = 8.4,
  wallHeight = 10.0,
  skylightApex = 32.0,
  hitboxManager = null
} = {}) {
  const lobbyGroup = new THREE.Group();
  lobbyGroup.name = 'Museum_Grand_Lobby_And_Corridors';
  lobbyGroup.userData.ignoreRaycaster = true;

  // 1.1. Sàn Đá Cẩm Thạch Phủ Kín Ngoại Vi Các Hành Lang Kết Nối
  const floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(lobbySize + corridorLength * 2, lobbySize + corridorLength * 2),
    new THREE.MeshStandardMaterial({
      map: createImperialMarbleFloorTexture(),
      roughness: 0.22,
      metalness: 0.35
    })
  );
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.y = 0.015;
  floorMesh.userData.ignoreRaycaster = true;
  floorMesh.userData.isFloor = true;
  lobbyGroup.add(floorMesh);

  // 2. Đại Mandala Trống Đồng Đông Sơn 14 cánh phát sáng giữa đại sảnh
  const centerMandala = new THREE.Mesh(
    new THREE.CircleGeometry(10.5, 64),
    new THREE.MeshBasicMaterial({
      map: createDongSonCenterMandalaTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  centerMandala.rotation.x = -Math.PI / 2;
  centerMandala.position.y = 0.035;
  centerMandala.userData.ignoreRaycaster = true;
  lobbyGroup.add(centerMandala);

  // 3. HỆ THỐNG THẢM SẢNH & HÀNH LANG LIỀN MẠCH 100% (SEAMLESS CONTINUOUS IMPERIAL CARPET NETWORK)
  // Thảm dọc trục Bắc - Nam (chạy dọc trục Z)
  const makeCarpetNS = (widthX, lengthZ, yOffset = 0.026) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(widthX, lengthZ),
      new THREE.MeshBasicMaterial()
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = yOffset;
    mesh.userData.ignoreRaycaster = true;
    mesh.userData.isCarpet = true;
    mesh.name = 'Museum_Corridor_Carpet_NS';
    applyTimelineCarpetToMesh(mesh);
    return mesh;
  };

  // Thảm ngang trục Đông - Tây (chạy dọc trục X) - nằm phẳng hoàn toàn trên mặt sàn
  const makeCarpetEW = (lengthX, widthZ, yOffset = 0.025) => {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(lengthX, widthZ),
      new THREE.MeshBasicMaterial()
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = yOffset;
    mesh.userData.ignoreRaycaster = true;
    mesh.userData.isCarpet = true;
    mesh.name = 'Museum_Corridor_Carpet_EW';
    applyTimelineCarpetToMesh(mesh);
    return mesh;
  };

  // 3.1. Thảm Hành Lang Ngang Bắc - Cánh Tây (Z = -17.15m): Chạy từ tâm giao lộ X = 0 thẳng vào cửa phòng Sơn Tinh - Thủy Tinh (X = -35.0m)
  const stttCarpet = makeCarpetEW(35.0, 5.0, 0.025);
  stttCarpet.name = 'Lobby_West_North_STTT_Carpet';
  stttCarpet.position.set(-17.5, 0.025, -17.15);
  lobbyGroup.add(stttCarpet);

  // 3.2. Thảm Hành Lang Ngang Bắc - Cánh Đông (Z = -17.15m): Chạy từ tâm giao lộ X = 0 thẳng vào cửa phòng Vợ Nhặt (X = +35.0m)
  const voNhatCarpet = makeCarpetEW(35.0, 5.0, 0.025);
  voNhatCarpet.name = 'Lobby_East_North_VoNhat_Carpet';
  voNhatCarpet.position.set(17.5, 0.025, -17.15);
  lobbyGroup.add(voNhatCarpet);

  // 3.3. Thảm Hành Lang Ngang Nam - Cánh Tây (Z = +17.15m): Chạy từ tâm giao lộ X = 0 thẳng vào cửa phòng Truyện Kiều / Thánh Gióng (X = -35.0m)
  const kieuCarpet = makeCarpetEW(35.0, 5.0, 0.025);
  kieuCarpet.name = 'Lobby_West_South_Kieu_Carpet';
  kieuCarpet.position.set(-17.5, 0.025, 17.15);
  lobbyGroup.add(kieuCarpet);

  // 3.4. Thảm Hành Lang Ngang Nam - Cánh Đông (Z = +17.15m): Chạy từ tâm giao lộ X = 0 thẳng vào cửa phòng Nam Quốc Sơn Hà (X = +35.0m)
  const namQuocCarpet = makeCarpetEW(35.0, 5.0, 0.025);
  namQuocCarpet.name = 'Lobby_East_South_NamQuoc_Carpet';
  namQuocCarpet.position.set(17.5, 0.025, 17.15);
  lobbyGroup.add(namQuocCarpet);

  // 3.5. THAY THẾ & ĐỒNG BỘ TOÀN BỘ THẢM SẢNH SANG HỌA TIẾT TRỤC THỜI GIAN
  replaceAllMuseumCarpetsWithTimelinePattern(lobbyGroup);

  // 4. Đài Trống Đồng Đông Sơn 3D ở tâm đại sảnh
  const monument = createCentralDongSonMonument();
  lobbyGroup.add(monument);

  // Đăng ký tương tác Thuyết Minh Hoàng Gia & Âm Thanh 3D cho Trống Đồng
  if (typeof window !== 'undefined') {
    window.__loreGuide?.registerArtifact(monument, 'lobby_dongSonDrum');
    window.__spatialAudio?.attachPositionalSound('lobby_dongSonDrum', monument, {
      fallbackTheme: 'sonTinhThuyTinh',
      refDistance: 8,
      maxDistance: 45
    });
  }

  // 5. Hàng Cột Trụ Sơn Son Thếp Vàng & Đèn Lồng Dọc Hành Lang (InstancedMesh - 1 Draw Call)
  const pillarCoords = [];
  const corridorOffsets = [-24, -18, -12, 12, 18, 24];
  const halfCorridorW = corridorWidth * 0.52;
  corridorOffsets.forEach((d) => {
    // Tránh tuyệt đối đặt cột sơn mài đỏ đè lên hoặc cắt ngang thảm hành lang (vùng Z quanh +-18m)
    if (Math.abs(d) < 15.0) {
      pillarCoords.push(new THREE.Vector3(-halfCorridorW, 0, d));
      pillarCoords.push(new THREE.Vector3(halfCorridorW, 0, d));
    }
    pillarCoords.push(new THREE.Vector3(d, 0, -halfCorridorW));
    pillarCoords.push(new THREE.Vector3(d, 0, halfCorridorW));
  });
  const pillarsAndLanterns = createInstancedCorridorPillarsAndLanterns(pillarCoords, wallHeight);
  lobbyGroup.add(pillarsAndLanterns);

  // 6. 4 Bức Phù Điêu Sơn Mài Khắc Thơ dọc hành lang
  const murals = [
    { title: 'NAM QUỐC SƠN HÀ', loreKey: 'lobby_mural_namQuocSonHa', verse: '“Sông núi nước Nam vua Nam ở • Rành rành định phận tại sách trời”', pos: [-14.5, 4.5, -20.5], rotY: 0 },
    { title: 'HỊCH TƯỚNG SĨ', loreKey: 'lobby_mural_hichTuongSi', verse: '“Ta thường tới bữa quên ăn, nửa đêm vỗ gối, ruột đau như cắt...”', pos: [14.5, 4.5, -20.5], rotY: 0 },
    { title: 'BÌNH NGÔ ĐẠI CÁO', loreKey: 'lobby_mural_binhNgoDaiCao', verse: '“Việc nhân nghĩa cốt ở yên dân • Quân điếu phạt trước lo trừ bạo”', pos: [-14.5, 4.5, 20.5], rotY: Math.PI },
    { title: 'ĐOẠN TRƯỜNG TÂN THANH', loreKey: 'lobby_mural_doanTruongTanThanh', verse: '“Trăm năm trong cõi người ta • Chữ tài chữ mệnh khéo là ghét nhau”', pos: [14.5, 4.5, 20.5], rotY: Math.PI }
  ];
  murals.forEach((m) => {
    const muralMesh = createCorridorLacquerMural(m.title, m.verse);
    muralMesh.position.set(...m.pos);
    muralMesh.rotation.y = m.rotY;
    if (typeof window !== 'undefined') {
      window.__loreGuide?.registerArtifact(muralMesh, m.loreKey);
    }
    lobbyGroup.add(muralMesh);
  });

  // 7. Vòm Kính Thiên Đỉnh & Luồng Sáng God-Rays
  const skylight = createLobbySkylightAndGodRays(skylightApex);
  lobbyGroup.add(skylight);

  // 8. Nạp Toàn Bộ 4 Model 3D (.glb)
  populateLobbyGlbProps(lobbyGroup);

  // 9. Nâng Cấp Kiến Trúc Tường, Phù Điêu Mặt Nguyệt Trống Đồng & Vách Bình Phong Hắt Sáng
  upgradeRoomWallArchitecture(lobbyGroup, { themeKey: 'lobby', isLobby: true });

  if (container) {
    container.add(lobbyGroup);
  }

  // Animation vòng lặp
  const updateLobby = (timeSec = performance.now() * 0.001) => {
    // 1. Đài Trống Đồng xoay nhẹ trang nghiêm
    if (monument.userData.rotatingPart) {
      monument.userData.rotatingPart.rotation.y = timeSec * 0.22;
      monument.userData.rotatingPart.position.y = 1.15 + Math.sin(timeSec * 1.5) * 0.04;
    }

    // 2. Luồng sáng God-Rays xoay nhẹ
    if (skylight.userData.godRayMesh) {
      skylight.userData.godRayMesh.rotation.y = timeSec * 0.08;
    }

    // 3. Đèn chùm đung đưa khẽ khàng
    if (lobbyGroup.userData.chandelier) {
      lobbyGroup.userData.chandelier.rotation.y = timeSec * 0.12;
      lobbyGroup.userData.chandelier.rotation.z = Math.sin(timeSec * 1.2) * 0.025;
    }
  };

  return {
    group: lobbyGroup,
    lobbyGroup,
    updateLobby
  };
}
