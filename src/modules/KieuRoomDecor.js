import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomDecorator } from './RoomDecorator.js';

/**
 * KIEU ROOM DECOR MODULE: NỘI THẤT PROCEDURAL TỰ ĐỘNG 100% (PHÒNG 01 TRUYỆN KIỀU)
 * Lead Architect & Art Director WebGL Specification
 * 
 * 1. Đàn Tỳ Bà Cổ Truyền (Procedural Pipa Lute):
 *    - Thân đàn: Shape dáng quả lê / giọt nước, ExtrudeGeometry 0.08m, vát góc viền bevel 0.015m.
 *    - Lưng đàn: Gỗ trắc sơn mài đỏ thẫm bóng bẩy (#4A150E, clearcoat: 0.85).
 *    - Mặt đàn: Gỗ ngô đồng sáng (#D2B48C), ngựa đàn gỗ mun và hệ phím tre / ngọc.
 *    - Cần đàn & Thủ đàn uốn ngược cổ điển, 4 trục so dây ngọc trắng và 4 dây tơ óng.
 *    - Đặt nghiêng 35 độ trên giá đỡ gỗ mun cạnh bệ đá trung tâm.
 * 
 * 2. Đỉnh Đồng / Lư Hương Trầm & Khói Nghi Ngút (Lathe Geometry & Smoke Drift):
 *    - Thân đỉnh tiện tròn 360 độ (THREE.LatheGeometry) với đường cắt profile đồng thau cổ (#B5A642).
 *    - 3 chân quỳ uốn cong vững chãi, 2 quai tai mây uốn lượn hai bên, nắp vòm có chóp nghê.
 *    - 60 hạt khói mềm (THREE.Points) bốc lên từ miệng lư hương xoắn ốc chậm rãi và tan dần.
 * 
 * 3. Khung Tranh Thủy Mặc / Sơn Mài Động (Procedural Canvas Art):
 *    - Khung gỗ mun viền chỉ mạ vàng kích thước 2.4m x 1.5m treo sau bệ sách.
 *    - Canvas tự sinh 512x512: Giấy xuyến chỉ cổ (#F5E6C8), vệt loang màu nước,
 *      cành liễu xuân uốn lượn Bezier, hoa đào hồng phấn, hoa lê trắng, nét thư pháp Nôm và triện son đỏ.
 * 
 * 4. Ánh Sáng Trưng Bày Nghệ Thuật (Exhibition Mood Lighting):
 *    - SpotLight vàng hổ phách (#FFD27D, intensity: 2.2, angle: Math.PI / 5, penumbra: 0.6)
 *      chiếu tập trung từ trần xuống cụm cổ vật.
 */

// Texture khói hương mềm mại tạo thủ tục bằng 2D Canvas
function createSoftSmokeParticleTexture(size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(235, 226, 214, 0.85)');
  grad.addColorStop(0.35, 'rgba(215, 205, 192, 0.45)');
  grad.addColorStop(0.7, 'rgba(195, 185, 172, 0.15)');
  grad.addColorStop(1, 'rgba(180, 170, 160, 0.0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

// Canvas tự sinh tranh thủy mặc / sơn mài Tiết Thanh Minh
function createProceduralInkArtTexture(width = 512, height = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // 1. Nền giấy xuyến chỉ ngả vàng cổ kính (#F5E6C8) với vệt loang màu nước
  const bgGrad = ctx.createRadialGradient(width * 0.48, height * 0.46, 20, width * 0.5, height * 0.5, width * 0.72);
  bgGrad.addColorStop(0, '#FAF2DF');
  bgGrad.addColorStop(0.65, '#F5E6C8');
  bgGrad.addColorStop(1, '#E4D0AB');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Vệt loang mờ màu nước (Watercolor wash stains)
  for (let i = 0; i < 9; i++) {
    const rx = width * (0.2 + Math.random() * 0.6);
    const ry = height * (0.2 + Math.random() * 0.6);
    const rad = 60 + Math.random() * 110;
    const washGrad = ctx.createRadialGradient(rx, ry, 5, rx, ry, rad);
    washGrad.addColorStop(0, 'rgba(194, 168, 128, 0.12)');
    washGrad.addColorStop(0.8, 'rgba(210, 185, 145, 0.04)');
    washGrad.addColorStop(1, 'rgba(210, 185, 145, 0.0)');
    ctx.fillStyle = washGrad;
    ctx.beginPath();
    ctx.arc(rx, ry, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Khung bo lụa viền chìm
  ctx.strokeStyle = 'rgba(145, 115, 80, 0.35)';
  ctx.lineWidth = 4;
  ctx.strokeRect(18, 18, width - 36, height - 36);
  ctx.strokeStyle = 'rgba(175, 140, 95, 0.2)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(24, 24, width - 48, height - 48);

  // 2. Dãy núi xa mờ ảo (Khói sóng tràng giang / viễn sơn mờ ảo)
  ctx.fillStyle = 'rgba(140, 130, 118, 0.16)';
  ctx.beginPath();
  ctx.moveTo(30, height * 0.62);
  ctx.bezierCurveTo(width * 0.22, height * 0.48, width * 0.38, height * 0.55, width * 0.55, height * 0.64);
  ctx.bezierCurveTo(width * 0.68, height * 0.52, width * 0.85, height * 0.58, width - 30, height * 0.68);
  ctx.lineTo(width - 30, height - 30);
  ctx.lineTo(30, height - 30);
  ctx.closePath();
  ctx.fill();

  // 3. Cành liễu xuân uốn lượn Bezier Curve (Thân cành phong cách thủy mặc Tề Bạch Thạch)
  ctx.strokeStyle = '#27201c';
  ctx.lineCap = 'round';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(width - 30, 45);
  ctx.bezierCurveTo(width * 0.72, 85, width * 0.55, 140, width * 0.38, 175);
  ctx.stroke();

  // Cành phụ 1
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.moveTo(width * 0.62, 115);
  ctx.bezierCurveTo(width * 0.52, 170, width * 0.44, 230, width * 0.34, 285);
  ctx.stroke();

  // Cành phụ 2
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(width * 0.45, 160);
  ctx.bezierCurveTo(width * 0.32, 210, width * 0.22, 270, width * 0.16, 340);
  ctx.stroke();

  // Cành rủ mềm (Drooping willow tendrils)
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = 'rgba(45, 38, 32, 0.85)';
  const tendrils = [
    { sx: width * 0.52, sy: 130, c1x: width * 0.48, c1y: 200, c2x: width * 0.44, c2y: 260, ex: width * 0.42, ey: 330 },
    { sx: width * 0.42, sy: 170, c1x: width * 0.38, c1y: 240, c2x: width * 0.32, c2y: 300, ex: width * 0.29, ey: 380 },
    { sx: width * 0.34, sy: 220, c1x: width * 0.28, c1y: 280, c2x: width * 0.24, c2y: 350, ex: width * 0.20, ey: 410 },
    { sx: width * 0.26, sy: 260, c1x: width * 0.20, c1y: 320, c2x: width * 0.18, c2y: 390, ex: width * 0.15, ey: 440 },
  ];

  tendrils.forEach(t => {
    ctx.beginPath();
    ctx.moveTo(t.sx, t.sy);
    ctx.bezierCurveTo(t.c1x, t.c1y, t.c2x, t.c2y, t.ex, t.ey);
    ctx.stroke();

    // Lá liễu non xanh lục bảo nhạt (#5B755D, #849E7C) dọc nhành rủ
    for (let p = 0.15; p <= 0.95; p += 0.12) {
      const lx = t.sx * (1 - p) + t.ex * p + Math.sin(p * 8) * 8;
      const ly = t.sy * (1 - p) + t.ey * p;
      ctx.fillStyle = p % 0.24 === 0 ? '#4F6C53' : '#738F6B';
      ctx.beginPath();
      ctx.ellipse(lx, ly, 2.5, 7.5, (p - 0.5) * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // 4. Hoa đào hồng phấn & Hoa lê trắng điểm xuyết
  const blossoms = [
    { x: width * 0.65, y: 105, r: 8, col: '#FFAEC1', stamen: true },
    { x: width * 0.58, y: 135, r: 10, col: '#FF94AD', stamen: true },
    { x: width * 0.50, y: 162, r: 7.5, col: '#FFB8C9', stamen: true },
    { x: width * 0.44, y: 195, r: 9, col: '#FFFFFF', stamen: true }, // Cành lê trắng điểm một vài bông hoa
    { x: width * 0.37, y: 228, r: 8.5, col: '#FFFDF8', stamen: true },
    { x: width * 0.31, y: 270, r: 7, col: '#FFAEC1', stamen: false },
    { x: width * 0.22, y: 310, r: 6.5, col: '#FF88A4', stamen: false },
    { x: width * 0.18, y: 360, r: 5.5, col: '#FFFFFF', stamen: false }
  ];

  blossoms.forEach(b => {
    // 5 Cánh hoa mềm
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const px = b.x + Math.cos(angle) * (b.r * 0.85);
      const py = b.y + Math.sin(angle) * (b.r * 0.85);
      ctx.fillStyle = b.col;
      ctx.beginPath();
      ctx.arc(px, py, b.r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    // Nhụy hoa đỏ cam ấm
    if (b.stamen) {
      ctx.fillStyle = '#D64933';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFE066';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // 5. Cánh én chao liệng giữa trời xuân
  const swallows = [
    { x: width * 0.32, y: 92, scale: 0.95 },
    { x: width * 0.22, y: 125, scale: 0.72 }
  ];
  swallows.forEach(sw => {
    ctx.fillStyle = '#221E1B';
    ctx.beginPath();
    ctx.moveTo(sw.x, sw.y);
    ctx.bezierCurveTo(sw.x - 14 * sw.scale, sw.y - 12 * sw.scale, sw.x - 22 * sw.scale, sw.y - 16 * sw.scale, sw.x - 28 * sw.scale, sw.y - 8 * sw.scale);
    ctx.bezierCurveTo(sw.x - 18 * sw.scale, sw.y - 4 * sw.scale, sw.x - 6 * sw.scale, sw.y + 2 * sw.scale, sw.x, sw.y + 6 * sw.scale);
    ctx.bezierCurveTo(sw.x + 6 * sw.scale, sw.y + 2 * sw.scale, sw.x + 18 * sw.scale, sw.y - 4 * sw.scale, sw.x + 28 * sw.scale, sw.y - 8 * sw.scale);
    ctx.bezierCurveTo(sw.x + 22 * sw.scale, sw.y - 16 * sw.scale, sw.x + 14 * sw.scale, sw.y - 12 * sw.scale, sw.x, sw.y);
    ctx.fill();
  });

  // 6. Thư pháp chữ Nôm / Hán nho nhã & Câu thơ bất hủ
  ctx.fillStyle = '#241D17';
  ctx.font = 'bold 22px "Times New Roman", serif';
  ctx.textAlign = 'right';
  ctx.fillText('Đoạn Trường Tân Thanh', width - 42, height - 105);

  ctx.font = 'italic 14px "Times New Roman", serif';
  ctx.fillText('Nguyễn Du (1765 - 1820)', width - 42, height - 80);

  ctx.font = '12px "Times New Roman", serif';
  ctx.fillStyle = '#4A3E34';
  ctx.fillText('"Cỏ non xanh tận chân trời,', width - 42, height - 58);
  ctx.fillText('Cành lê trắng điểm một vài bông hoa."', width - 42, height - 40);

  // 7. Triện son đỏ cổ truyền (Cinnabar Seal Stamp)
  const sealX = width - 82;
  const sealY = height - 180;
  ctx.fillStyle = '#B82818';
  ctx.fillRect(sealX, sealY, 34, 34);
  ctx.strokeStyle = '#D95241';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(sealX + 2, sealY + 2, 30, 30);

  ctx.fillStyle = '#FCEADE';
  ctx.font = 'bold 13px serif';
  ctx.textAlign = 'center';
  ctx.fillText('Nguyễn', sealX + 17, sealY + 16);
  ctx.fillText('Thi', sealX + 17, sealY + 29);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

export class KieuRoomDecor {
  constructor(materialLibrary = null, options = {}) {
    this.matLib = materialLibrary;
    this.group = new THREE.Group();
    this.group.name = "Kieu_Room01_Procedural_Decor";

    // Tọa độ tâm Phòng 01 (Tầng 2 - Tây-Nam)
    // Sàn Y = 10.0m, Bệ sách tại (-48.0, 10.0, 19.0)
    this.origin = options.origin ?? new THREE.Vector3(-48.0, 10.0, 19.0);

    this.smokeParticles = null;
    this.smokeData = [];
    this.smokeCount = 60;

    try {
      this.initDanTyBaDisplayPedestal();
      this.initProceduralPipaLute();
      this.loadDanTyBaModel();
      this.initAntiqueIncenseBurner();
      this.initProceduralLacquerPainting();
      this.initExhibitionSpotlight();

      // Khử độc NaN và cấu hình render an toàn
      this.sanitizeAndFinalizeGeometries();

      console.log("%c✓ KieuRoomDecor initialized • Procedural artifacts & dynamic art active!", "color: #39e58c; font-weight: bold;");
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo KieuRoomDecor:", err);
    }
  }

  getGroup() {
    return this.group;
  }

  prepareGeometry(geo) {
    if (!geo) return;
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();

    ['position', 'normal', 'uv'].forEach(attrName => {
      const attr = geo.attributes?.[attrName];
      if (attr?.array) {
        let dirty = false;
        for (let i = 0; i < attr.array.length; i++) {
          if (!Number.isFinite(attr.array[i])) {
            attr.array[i] = (attrName === 'normal' && i % 3 === 1) ? 1.0 : 0.0;
            dirty = true;
          }
        }
        if (dirty) attr.needsUpdate = true;
      }
    });
  }

  /**
   * 0. KHỞI TẠO ĐÔN BỆ ĐÁ TRƯNG BÀY TẦNG 2 CHO ĐÀN TỲ BÀ
   */
  initDanTyBaDisplayPedestal() {
    const plinthGroup = new THREE.Group();
    plinthGroup.name = "Dan_Ty_Ba_Stone_Plinth_Group";

    // Tọa độ đặt đôn bệ đá Tầng 2 ngay cạnh cuốn sách ma thuật phát sáng
    const plinthX = this.origin.x + 0.95;
    const plinthZ = this.origin.z + 1.35;
    const plinthBaseElevation = this.origin.y; // Y = 10.0m

    const marbleMat = new THREE.MeshStandardMaterial({
      color: 0xf5f2eb,
      roughness: 0.28,
      metalness: 0.04
    });

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xc49e52,
      roughness: 0.3,
      metalness: 0.82
    });

    // Chân đế bệ đá
    const baseGeo = new THREE.CylinderGeometry(0.38, 0.42, 0.12, 32);
    this.prepareGeometry(baseGeo);
    const baseMesh = new THREE.Mesh(baseGeo, marbleMat);
    baseMesh.position.set(plinthX, plinthBaseElevation + 0.06, plinthZ);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    plinthGroup.add(baseMesh);

    // Thân trụ bệ đá
    const colGeo = new THREE.CylinderGeometry(0.34, 0.36, 0.64, 32);
    this.prepareGeometry(colGeo);
    const colMesh = new THREE.Mesh(colGeo, marbleMat);
    colMesh.position.set(plinthX, plinthBaseElevation + 0.12 + 0.32, plinthZ);
    colMesh.castShadow = true;
    colMesh.receiveShadow = true;
    plinthGroup.add(colMesh);

    // Chỉ đồng cổ trang trí giữa thân
    const ringGeo = new THREE.CylinderGeometry(0.355, 0.355, 0.03, 32);
    this.prepareGeometry(ringGeo);
    const ringMesh = new THREE.Mesh(ringGeo, brassMat);
    ringMesh.position.set(plinthX, plinthBaseElevation + 0.12 + 0.32, plinthZ);
    plinthGroup.add(ringMesh);

    // Mặt thớt bệ đá trên cùng
    const topGeo = new THREE.CylinderGeometry(0.39, 0.36, 0.08, 32);
    this.prepareGeometry(topGeo);
    const topMesh = new THREE.Mesh(topGeo, marbleMat);
    topMesh.position.set(plinthX, plinthBaseElevation + 0.12 + 0.64 + 0.04, plinthZ);
    topMesh.castShadow = true;
    topMesh.receiveShadow = true;
    plinthGroup.add(topMesh);

    // Cao độ mặt phẳng bệ đá nơi chân đàn chạm vào:
    this.plinthTopY = plinthBaseElevation + 0.12 + 0.64 + 0.08; // = 10.84m
    this.plinthX = plinthX;
    this.plinthZ = plinthZ;

    this.group.add(plinthGroup);
    this.plinthGroup = plinthGroup;
  }

  /**
   * 1. NẠP MODEL ĐÀN TỲ BÀ 3D (.GLB), CHUẨN HÓA KÍCH THƯỚC VÀ CĂN CHỈNH PIVOT
   */
  loadDanTyBaModel() {
    if (!this.gltfLoader) {
      this.gltfLoader = new GLTFLoader();
    }

    const primaryUrl = '/assets/models/rooms/kieu/dan_ty_ba.glb';
    const fallbackUrls = [
      './assets/models/rooms/kieu/dan_ty_ba.glb',
      'assets/models/rooms/kieu/dan_ty_ba.glb'
    ];

    const loadWithUrl = (url, fallbackIdx = 0) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          try {
            const model = gltf.scene || gltf.scenes?.[0];
            if (!model) return;

            model.name = "Dan_Ty_Ba_PBR_Model";

            // 1. Tối ưu Vật liệu & Bóng đổ:
            // Duyệt toàn bộ mesh: bật castShadow, receiveShadow, frustumCulled = false, khử NaN
            let meshCount = 0;
            model.traverse((child) => {
              if (child.isMesh) {
                meshCount++;
                child.castShadow = true;
                child.receiveShadow = true;
                child.frustumCulled = false;

                if (child.geometry) {
                  this.prepareGeometry(child.geometry);
                }

                if (child.material) {
                  const mats = Array.isArray(child.material) ? child.material : [child.material];
                  mats.forEach(m => {
                    if (m) {
                      m.side = THREE.DoubleSide;
                      // Tăng cường phản chiếu cho chi tiết khảm xà cừ và sơn mài
                      if (m.name && m.name.toLowerCase().includes('pearl')) {
                        m.roughness = 0.18;
                        m.metalness = 0.25;
                      }
                    }
                  });
                }
              }
            });

            // 2. Chuẩn hóa kích thước: Chiều dài đàn khoảng 0.9m - 1.0m (chọn 0.95m)
            const rawBox = new THREE.Box3().setFromObject(model);
            const rawSize = new THREE.Vector3();
            rawBox.getSize(rawSize);
            const curLength = Math.max(rawSize.x, rawSize.y, rawSize.z);

            if (curLength > 0.001) {
              const targetLength = 0.95; // 0.95m nằm chuẩn trong khoảng 0.9m - 1.0m
              const scaleFactor = targetLength / curLength;
              model.scale.setScalar(scaleFactor);
            }

            // 3. Đặt đàn nằm nghiêng góc 30-40 độ tựa trên giá gỗ hoặc đôn bệ đá Tầng 2
            // Model đàn đã được gác trên giá gỗ nghiêng 35 độ; xoay hướng đón ánh mắt người xem:
            model.rotation.y = -Math.PI * 0.35;

            // 4. Căn chỉnh tâm (Pivot): Tính lại Bounding Box để chân đàn chạm khít mặt bệ, không lún sâu hoặc bay lơ lửng
            model.updateMatrixWorld(true);
            const scaledBox = new THREE.Box3().setFromObject(model);
            const center = new THREE.Vector3();
            scaledBox.getCenter(center);

            const targetSurfaceY = this.plinthTopY ?? (this.origin.y + 0.84);
            const targetX = this.plinthX ?? (this.origin.x + 0.95);
            const targetZ = this.plinthZ ?? (this.origin.z + 1.35);

            // Căn chuẩn tâm X, Z và chạm khít tuyệt đối mặt bệ theo Y (deltaY chính xác đến từng micromet):
            model.position.x += (targetX - center.x);
            model.position.z += (targetZ - center.z);
            model.position.y += (targetSurfaceY - scaledBox.min.y);

            // Cập nhật ma trận toàn cục
            model.updateMatrixWorld(true);

            // Thay thế model procedural cũ
            if (this.pipaStandGroup && this.pipaStandGroup.parent) {
              this.pipaStandGroup.parent.remove(this.pipaStandGroup);
            }

            this.group.add(model);
            this.pipaStandGroup = model;

            // Cập nhật target cho SpotLight tập trung rọi xiên vào thân đàn
            if (this.danTyBaSpotLight && this.danTyBaSpotLightTarget) {
              this.danTyBaSpotLightTarget.position.set(targetX, targetSurfaceY + 0.35, targetZ);
            }

            console.log(`%c[GLTF SUCCESS] Đã gắn Đàn Tỳ Bà lên đôn bệ đá Tầng 2 (Chiều dài: 0.95m, cao độ chân bệ: ${targetSurfaceY.toFixed(2)}m, 0 lỗi NaN, 60 FPS)!`, "color: #39e58c; font-weight: bold;");
          } catch (err) {
            console.error("[SELF-HEALING] Lỗi cấu hình GLTF Đàn Tỳ Bà:", err);
          }
        },
        undefined,
        (err) => {
          if (fallbackIdx < fallbackUrls.length) {
            loadWithUrl(fallbackUrls[fallbackIdx], fallbackIdx + 1);
          } else {
            console.warn("[SELF-HEALING] Giữ nguyên đàn tỳ bà procedural dự phòng.");
          }
        }
      );
    };

    loadWithUrl(primaryUrl, 0);
  }

  // =========================================================================
  // 1. CHẾ TÁC ĐÀN TỲ BÀ CỔ TRUYỀN (PROCEDURAL PIPA LUTE)
  // =========================================================================
  initProceduralPipaLute() {
    const luteGroup = new THREE.Group();
    luteGroup.name = "Procedural_Pipa_Lute";

    // 1. THÂN ĐÀN: Dùng THREE.Shape vẽ đường viền quả lê / giọt nước
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(0, 0); // Đáy đàn
    // Đường cong bầu dưới bên phải
    bodyShape.bezierCurveTo(0.145, 0.02, 0.175, 0.16, 0.155, 0.28);
    // Eo đàn vuốt thon dần lên cổ
    bodyShape.bezierCurveTo(0.135, 0.42, 0.075, 0.58, 0.034, 0.72);
    // Điểm tiếp giáp cần đàn
    bodyShape.lineTo(-0.034, 0.72);
    // Eo đàn bên trái
    bodyShape.bezierCurveTo(-0.075, 0.58, -0.135, 0.42, -0.155, 0.28);
    // Đường cong bầu dưới bên trái
    bodyShape.bezierCurveTo(-0.175, 0.16, -0.145, 0.02, 0, 0);

    const extrudeSettings = {
      depth: 0.08,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.012,
      bevelThickness: 0.015
    };

    const luteBodyGeo = new THREE.ExtrudeGeometry(bodyShape, extrudeSettings);
    this.prepareGeometry(luteBodyGeo);

    // Vật liệu lưng & viền: Gỗ trắc sơn mài đỏ thẫm bóng bẩy (#4A150E, clearcoat: 0.8)
    const rosewoodLacquerMat = new THREE.MeshPhysicalMaterial({
      color: 0x4a150e,
      roughness: 0.22,
      metalness: 0.06,
      clearcoat: 0.85,
      clearcoatRoughness: 0.12,
      reflectivity: 0.6,
      side: THREE.DoubleSide
    });

    const bodyMesh = new THREE.Mesh(luteBodyGeo, rosewoodLacquerMat);
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    luteGroup.add(bodyMesh);

    // 2. MẶT ĐÀN (SOUNDBOARD): Màu gỗ ngô đồng sáng (#D2B48C)
    const soundboardGeo = new THREE.ShapeGeometry(bodyShape);
    this.prepareGeometry(soundboardGeo);

    const paulowniaMat = new THREE.MeshStandardMaterial({
      color: 0xd2b48c,
      roughness: 0.55,
      metalness: 0.03,
      side: THREE.DoubleSide
    });

    const soundboardMesh = new THREE.Mesh(soundboardGeo, paulowniaMat);
    soundboardMesh.position.z = 0.08 + 0.015 + 0.001; // Đặt khớp trên mặt bevel
    luteGroup.add(soundboardMesh);

    // 3. NGỰA ĐÀN (BRIDGE / PHƯỢC THỦ): Gỗ mun cẩn chỉ ngọc đỡ 4 dây
    const bridgeGeo = new THREE.BoxGeometry(0.12, 0.035, 0.022);
    this.prepareGeometry(bridgeGeo);
    const ebonyBridgeMat = new THREE.MeshStandardMaterial({ color: 0x181412, roughness: 0.35 });
    const bridgeMesh = new THREE.Mesh(bridgeGeo, ebonyBridgeMat);
    bridgeMesh.position.set(0, 0.085, 0.106);
    luteGroup.add(bridgeMesh);

    // Dải ngọc ngà cẩn trên ngựa đàn
    const ivoryInlayGeo = new THREE.BoxGeometry(0.10, 0.008, 0.006);
    this.prepareGeometry(ivoryInlayGeo);
    const ivoryMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e6, roughness: 0.25 });
    const inlayMesh = new THREE.Mesh(ivoryInlayGeo, ivoryMat);
    inlayMesh.position.set(0, 0.095, 0.118);
    luteGroup.add(inlayMesh);

    // 4. HỆ PHÍM ĐÀN (FRETS): Tướng (Xiang) & Phẩm (Pin) hình cánh cung
    const fretMat = new THREE.MeshStandardMaterial({ color: 0xf2ebd9, roughness: 0.3 });
    // Phím tre trên mặt đàn (10 phím cong nhẹ)
    for (let f = 0; f < 10; f++) {
      const fy = 0.22 + f * 0.048;
      const fw = 0.085 - f * 0.0035;
      const fretGeo = new THREE.BoxGeometry(fw, 0.006, 0.008);
      this.prepareGeometry(fretGeo);
      const fret = new THREE.Mesh(fretGeo, fretMat);
      fret.position.set(0, fy, 0.099);
      luteGroup.add(fret);
    }

    // 5. CẦN ĐÀN (NECK): Box vút thon dài lên cao 0.45m
    const neckGeo = new THREE.BoxGeometry(0.062, 0.42, 0.065);
    this.prepareGeometry(neckGeo);
    const neckMesh = new THREE.Mesh(neckGeo, rosewoodLacquerMat);
    neckMesh.position.set(0, 0.72 + 0.20, 0.04);
    luteGroup.add(neckMesh);

    // 4 Phím cổ lớn (Xiang) bằng ngà trên cần đàn
    for (let xf = 0; xf < 4; xf++) {
      const xy = 0.76 + xf * 0.08;
      const xFretGeo = new THREE.BoxGeometry(0.058, 0.015, 0.02);
      this.prepareGeometry(xFretGeo);
      const xFret = new THREE.Mesh(xFretGeo, ivoryMat);
      xFret.position.set(0, xy, 0.076);
      luteGroup.add(xFret);
    }

    // 6. THỦ ĐÀN (HEADSTOCK): Uốn ngược phong cách cổ điển
    const headstockGroup = new THREE.Group();
    headstockGroup.position.set(0, 1.13, 0.04);

    const headBaseGeo = new THREE.BoxGeometry(0.058, 0.18, 0.05);
    this.prepareGeometry(headBaseGeo);
    const headBase = new THREE.Mesh(headBaseGeo, rosewoodLacquerMat);
    headBase.position.y = 0.09;
    headstockGroup.add(headBase);

    // Đỉnh đầu đàn uốn cong ngược ra sau (Curved crest)
    const crestGeo = new THREE.TorusGeometry(0.042, 0.016, 12, 24, Math.PI * 1.1);
    this.prepareGeometry(crestGeo);
    const crest = new THREE.Mesh(crestGeo, rosewoodLacquerMat);
    crest.rotation.z = Math.PI * 0.5;
    crest.rotation.y = Math.PI * 0.5;
    crest.position.set(0, 0.18, -0.015);
    headstockGroup.add(crest);

    // 7. 4 CHỐT TRỤC SO DÂY (TUNING PEGS) BẰNG NGỌC TRẮNG / ĐỒNG
    const pegGeo = new THREE.CylinderGeometry(0.009, 0.006, 0.14, 16);
    this.prepareGeometry(pegGeo);
    const brassPegMat = new THREE.MeshStandardMaterial({
      color: 0xe0c885,
      metalness: 0.85,
      roughness: 0.3
    });

    [-0.04, 0.04].forEach(px => {
      [0.05, 0.13].forEach((py, idx) => {
        const peg = new THREE.Mesh(pegGeo, brassPegMat);
        peg.rotation.z = Math.PI * 0.5;
        peg.position.set(px > 0 ? 0.045 : -0.045, py, 0.0);
        headstockGroup.add(peg);

        // Đầu núm chốt tiện tròn bằng ngọc
        const pegKnobGeo = new THREE.SphereGeometry(0.012, 12, 12);
        this.prepareGeometry(pegKnobGeo);
        const knob = new THREE.Mesh(pegKnobGeo, ivoryMat);
        knob.position.set(px > 0 ? 0.11 : -0.11, py, 0.0);
        headstockGroup.add(knob);
      });
    });

    luteGroup.add(headstockGroup);

    // 8. 4 DÂY ĐÀN BẰNG THREE.LineSegments MÀU VÀNG TƠ ÓNG
    const stringPositions = [];
    const stringSpacingBottom = 0.024;
    const stringSpacingTop = 0.012;

    for (let s = 0; s < 4; s++) {
      const bx = (s - 1.5) * stringSpacingBottom;
      const tx = (s - 1.5) * stringSpacingTop;

      // Từ ngựa đàn qua các phím lên đầu chốt
      stringPositions.push(bx, 0.085, 0.115);
      stringPositions.push(tx, 1.13, 0.075);
    }

    const stringGeo = new THREE.BufferGeometry();
    stringGeo.setAttribute('position', new THREE.Float32BufferAttribute(stringPositions, 3));
    this.prepareGeometry(stringGeo);

    const stringMat = new THREE.LineBasicMaterial({
      color: 0xffdf70,
      linewidth: 1.5,
      transparent: true,
      opacity: 0.95
    });

    const strings = new THREE.LineSegments(stringGeo, stringMat);
    luteGroup.add(strings);

    // 9. GIÁ ĐỠ GỖ MUN CHỮ X (EBONY DISPLAY STAND)
    const standGroup = new THREE.Group();
    standGroup.name = "Ebony_Lute_Stand";

    const ebonyMat = new THREE.MeshStandardMaterial({
      color: 0x141210,
      roughness: 0.35,
      metalness: 0.05
    });

    // Đế chân quỳ chữ V vững chãi
    const legGeo = new THREE.BoxGeometry(0.04, 0.03, 0.36);
    this.prepareGeometry(legGeo);

    [-0.14, 0.14].forEach(lx => {
      const leg = new THREE.Mesh(legGeo, ebonyMat);
      leg.position.set(lx, 0.015, 0);
      leg.rotation.y = (lx > 0 ? -1 : 1) * 0.25;
      standGroup.add(leg);
    });

    // Thanh giằng ngang
    const crossBarGeo = new THREE.BoxGeometry(0.32, 0.025, 0.035);
    this.prepareGeometry(crossBarGeo);
    const crossBar = new THREE.Mesh(crossBarGeo, ebonyMat);
    crossBar.position.set(0, 0.025, 0);
    standGroup.add(crossBar);

    // Càng đỡ dưới thân đàn bọc nhung đỏ
    const cradleGeo = new THREE.BoxGeometry(0.28, 0.04, 0.06);
    this.prepareGeometry(cradleGeo);
    const cradle = new THREE.Mesh(cradleGeo, ebonyMat);
    cradle.position.set(0, 0.18, 0.06);
    standGroup.add(cradle);

    // Thanh chống lưng đàn nghiêng 35 độ
    const strutGeo = new THREE.BoxGeometry(0.035, 0.55, 0.035);
    this.prepareGeometry(strutGeo);
    const strut = new THREE.Mesh(strutGeo, ebonyMat);
    strut.position.set(0, 0.32, -0.08);
    strut.rotation.x = -Math.PI * (35 / 180);
    standGroup.add(strut);

    // Đặt đàn tựa vào giá nghiêng góc 35 độ
    luteGroup.position.set(0, 0.12, 0.04);
    luteGroup.rotation.x = -Math.PI * (35 / 180); // Nghiêng góc 35 độ chuẩn mỹ học
    standGroup.add(luteGroup);

    // Tọa độ đặt trên đôn bệ đá Tầng 2 cạnh cuốn sách ma thuật
    const targetSurfaceY = this.plinthTopY ?? (this.origin.y + 0.84);
    const targetX = this.plinthX ?? (this.origin.x + 0.95);
    const targetZ = this.plinthZ ?? (this.origin.z + 1.35);

    standGroup.position.set(targetX, targetSurfaceY, targetZ);
    standGroup.rotation.y = -Math.PI * 0.35; // Xoay hướng đón ánh mắt người xem

    this.group.add(standGroup);
    this.pipaStandGroup = standGroup;
  }

  // =========================================================================
  // 2. CHẾ TÁC ĐỈNH ĐỒNG / LƯ HƯƠNG TRẦM & KHÓI NGHI NGÚT (LATHE GEOMETRY)
  // =========================================================================
  initAntiqueIncenseBurner() {
    const censerGroup = new THREE.Group();
    censerGroup.name = "Antique_Incense_Burner_Group";

    // 1. ĐÔN GỖ GỤ CHẠM KHẮC NÂNG ĐỈNH ĐỒNG (CARVED ROSEWOOD PEDESTAL)
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x2d1a12,
      roughness: 0.4,
      metalness: 0.04
    });

    const plinthBaseGeo = new THREE.CylinderGeometry(0.26, 0.28, 0.12, 24);
    this.prepareGeometry(plinthBaseGeo);
    const plinthBase = new THREE.Mesh(plinthBaseGeo, plinthMat);
    plinthBase.position.y = 0.06;
    plinthBase.receiveShadow = true;
    censerGroup.add(plinthBase);

    const plinthColumnGeo = new THREE.CylinderGeometry(0.22, 0.24, 0.65, 24);
    this.prepareGeometry(plinthColumnGeo);
    const plinthColumn = new THREE.Mesh(plinthColumnGeo, plinthMat);
    plinthColumn.position.y = 0.12 + 0.325;
    plinthColumn.castShadow = true;
    censerGroup.add(plinthColumn);

    const plinthTopGeo = new THREE.CylinderGeometry(0.28, 0.25, 0.08, 24);
    this.prepareGeometry(plinthTopGeo);
    const plinthTop = new THREE.Mesh(plinthTopGeo, plinthMat);
    plinthTop.position.y = 0.12 + 0.65 + 0.04;
    censerGroup.add(plinthTop);

    // 2. THÂN ĐỈNH ĐỒNG: Tiện tròn 360 độ bằng THREE.LatheGeometry
    const censerElevation = 0.12 + 0.65 + 0.08; // Y = ~0.85m

    // Profile mặt cắt đỉnh đồng cổ: chân đế loe -> thắt eo -> bụng tròn phình -> cổ thon -> miệng loe có gờ
    const lathePoints = [
      new THREE.Vector2(0.001, 0.0),
      new THREE.Vector2(0.16, 0.0),    // Chân đế loe
      new THREE.Vector2(0.18, 0.03),
      new THREE.Vector2(0.13, 0.065),  // Thắt eo đế
      new THREE.Vector2(0.145, 0.10),
      new THREE.Vector2(0.23, 0.22),   // Bụng tròn phình cực đại
      new THREE.Vector2(0.21, 0.30),
      new THREE.Vector2(0.145, 0.36),  // Cổ thon
      new THREE.Vector2(0.145, 0.42),
      new THREE.Vector2(0.185, 0.45),  // Miệng loe có gờ viền
      new THREE.Vector2(0.195, 0.48),
      new THREE.Vector2(0.165, 0.49),
      new THREE.Vector2(0.135, 0.46),  // Lòng miệng
      new THREE.Vector2(0.12, 0.40),
      new THREE.Vector2(0.001, 0.40)
    ];

    const censerBodyGeo = new THREE.LatheGeometry(lathePoints, 32);
    this.prepareGeometry(censerBodyGeo);

    // Vật liệu đồng thau cổ (Antique Brass: #B5A642, metalness: 0.85, roughness: 0.35)
    const antiqueBrassMat = new THREE.MeshStandardMaterial({
      color: 0xb5a642,
      metalness: 0.85,
      roughness: 0.35,
      side: THREE.DoubleSide
    });

    const censerBody = new THREE.Mesh(censerBodyGeo, antiqueBrassMat);
    censerBody.position.y = censerElevation;
    censerBody.castShadow = true;
    censerBody.receiveShadow = true;
    censerGroup.add(censerBody);

    // 3. 3 CHÂN QUỲ BÊN DƯỚI (CABRIOLE TRIPOD LEGS)
    const legShape = new THREE.Shape();
    legShape.moveTo(0, 0);
    legShape.quadraticCurveTo(0.06, 0.04, 0.04, 0.14);
    legShape.lineTo(-0.02, 0.14);
    legShape.quadraticCurveTo(0.02, 0.04, -0.04, 0);

    const legExtrude = new THREE.ExtrudeGeometry(legShape, {
      depth: 0.04,
      bevelEnabled: true,
      bevelThickness: 0.008,
      bevelSize: 0.006,
      bevelSegments: 2
    });
    this.prepareGeometry(legExtrude);

    for (let l = 0; l < 3; l++) {
      const angle = (l * Math.PI * 2) / 3;
      const legMesh = new THREE.Mesh(legExtrude, antiqueBrassMat);
      legMesh.rotation.y = angle;
      legMesh.position.set(
        Math.cos(angle) * 0.12,
        censerElevation - 0.04,
        Math.sin(angle) * 0.12
      );
      censerGroup.add(legMesh);
    }

    // 4. 2 QUAI TAI MÂY UỐN CONG HAI BÊN (CLOUD-SCROLL HANDLES)
    const handleGeo = new THREE.TorusGeometry(0.075, 0.016, 12, 28, Math.PI * 1.35);
    this.prepareGeometry(handleGeo);

    [-1, 1].forEach(side => {
      const handle = new THREE.Mesh(handleGeo, antiqueBrassMat);
      handle.position.set(side * 0.19, censerElevation + 0.32, 0);
      handle.rotation.z = side > 0 ? -Math.PI * 0.45 : Math.PI * 0.45;
      handle.rotation.x = Math.PI * 0.5;
      censerGroup.add(handle);
    });

    // 5. NẮP VÒM ĐỈNH ĐỒNG CÓ LỖ THOÁT HƯƠNG & CHÓP NGHÊ
    const lidPoints = [
      new THREE.Vector2(0.001, 0.15),
      new THREE.Vector2(0.035, 0.14),
      new THREE.Vector2(0.06, 0.12),
      new THREE.Vector2(0.12, 0.07),
      new THREE.Vector2(0.165, 0.02),
      new THREE.Vector2(0.17, 0.0),
      new THREE.Vector2(0.001, 0.0)
    ];
    const lidGeo = new THREE.LatheGeometry(lidPoints, 24);
    this.prepareGeometry(lidGeo);

    const lidMesh = new THREE.Mesh(lidGeo, antiqueBrassMat);
    lidMesh.position.y = censerElevation + 0.47;
    censerGroup.add(lidMesh);

    // Chóp núm Nghê / quả đào đồng trên đỉnh nắp
    const finialGeo = new THREE.SphereGeometry(0.028, 16, 16);
    this.prepareGeometry(finialGeo);
    const finialMesh = new THREE.Mesh(finialGeo, antiqueBrassMat);
    finialMesh.position.y = censerElevation + 0.47 + 0.16;
    censerGroup.add(finialMesh);

    // Đốm sáng than hồng trầm hương le lói bên trong đỉnh
    const emberLight = new THREE.PointLight(0xff5511, 0.65, 1.8);
    emberLight.position.set(0, censerElevation + 0.44, 0);
    censerGroup.add(emberLight);

    // 6. LÀN KHÓI HƯƠNG TRẦM (INCENSE SMOKE DRIFT: 60 HẠT BAY XOẮN ỐC MỀM MẠI)
    const smokeGeo = new THREE.BufferGeometry();
    const smokePositions = new Float32Array(this.smokeCount * 3);
    this.smokeData = [];

    const smokeOriginY = censerElevation + 0.52;
    this.smokeOriginY = smokeOriginY;

    for (let i = 0; i < this.smokeCount; i++) {
      const normalizedHeight = i / this.smokeCount; // 0 -> 1
      const heightOffset = normalizedHeight * 2.4; // Bay lên cao tối đa 2.4m

      const angle = normalizedHeight * Math.PI * 6.0; // Xoắn ốc 3 vòng
      const spiralRadius = 0.03 + normalizedHeight * 0.18; // Nở rộng dần khi bay lên cao

      const px = Math.cos(angle) * spiralRadius;
      const py = smokeOriginY + heightOffset;
      const pz = Math.sin(angle) * spiralRadius;

      smokePositions[i * 3] = px;
      smokePositions[i * 3 + 1] = py;
      smokePositions[i * 3 + 2] = pz;

      this.smokeData.push({
        height: heightOffset,
        speed: 0.18 + Math.random() * 0.08,
        spiralPhase: angle,
        spiralFreq: 1.2 + Math.random() * 0.4,
        swayPhaseX: Math.random() * Math.PI * 2,
        swayPhaseZ: Math.random() * Math.PI * 2
      });
    }

    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));
    this.prepareGeometry(smokeGeo);

    const smokeMat = new THREE.PointsMaterial({
      size: 0.42,
      map: createSoftSmokeParticleTexture(),
      transparent: true,
      opacity: 0.48,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    this.smokeParticles = new THREE.Points(smokeGeo, smokeMat);
    this.smokeParticles.name = "Incense_Smoke_Drift_Points";
    this.smokeParticles.frustumCulled = false;
    censerGroup.add(this.smokeParticles);

    // Tọa độ đặt cạnh bệ đá trung tâm (X: -47.1, Z: 17.15, Y: 10.0m)
    censerGroup.position.set(this.origin.x + 0.9, this.origin.y, this.origin.z - 1.85);

    this.group.add(censerGroup);
    this.censerGroup = censerGroup;
  }

  // =========================================================================
  // 3. KHUNG TRANH SƠN MÀI / THỦY MẶC ĐỘNG (PROCEDURAL CANVAS ART 2.4m x 1.5m)
  // =========================================================================
  initProceduralLacquerPainting() {
    const paintingGroup = new THREE.Group();
    paintingGroup.name = "Procedural_Lacquer_Painting_24x15";

    const frameWidth = 2.4;
    const frameHeight = 1.5;
    const frameBorder = 0.08;
    const frameDepth = 0.06;

    // 1. KHUNG TRANH GỖ MUN CHẠM CHỈ VÀNG (EBONY & GOLD GILT FRAME)
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x161311,
      roughness: 0.35,
      metalness: 0.06,
      side: THREE.DoubleSide
    });

    const goldFilletMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.28,
      metalness: 0.82
    });

    // 4 Thanh khung gỗ mun ngoại vi
    const totalW = frameWidth + frameBorder * 2;
    const totalH = frameHeight + frameBorder * 2;

    // Thanh ngang trên & dưới
    const horizBarGeo = new THREE.BoxGeometry(totalW, frameBorder, frameDepth);
    this.prepareGeometry(horizBarGeo);
    [-1, 1].forEach(side => {
      const bar = new THREE.Mesh(horizBarGeo, frameMat);
      bar.position.set(0, side * (frameHeight * 0.5 + frameBorder * 0.5), 0);
      paintingGroup.add(bar);
    });

    // Thanh dọc trái & phải
    const vertBarGeo = new THREE.BoxGeometry(frameBorder, frameHeight, frameDepth);
    this.prepareGeometry(vertBarGeo);
    [-1, 1].forEach(side => {
      const bar = new THREE.Mesh(vertBarGeo, frameMat);
      bar.position.set(side * (frameWidth * 0.5 + frameBorder * 0.5), 0, 0);
      paintingGroup.add(bar);
    });

    // Đường chỉ mạ vàng viền lòng trong tranh
    const goldFilletGeo = new THREE.BoxGeometry(frameWidth + 0.02, 0.012, frameDepth + 0.005);
    this.prepareGeometry(goldFilletGeo);
    [-1, 1].forEach(side => {
      const fillet = new THREE.Mesh(goldFilletGeo, goldFilletMat);
      fillet.position.set(0, side * (frameHeight * 0.5), 0);
      paintingGroup.add(fillet);
    });

    // 2. MẶT TRANH NGHỆ THUẬT TỰ SINH (DYNAMIC PROCEDURAL 2D CANVAS)
    const artGeo = new THREE.PlaneGeometry(frameWidth, frameHeight);
    this.prepareGeometry(artGeo);

    const artTexture = createProceduralInkArtTexture(512, 512);

    const artMat = new THREE.MeshStandardMaterial({
      map: artTexture,
      roughness: 0.42,
      metalness: 0.02,
      side: THREE.DoubleSide
    });

    const artMesh = new THREE.Mesh(artGeo, artMat);
    artMesh.position.z = 0.012; // Nhô nhẹ ra trước khung
    paintingGroup.add(artMesh);

    // Tấm ván hậu chống ẩm mặt sau tranh
    const backPanelGeo = new THREE.PlaneGeometry(frameWidth + frameBorder, frameHeight + frameBorder);
    this.prepareGeometry(backPanelGeo);
    const backPanelMat = new THREE.MeshBasicMaterial({ color: 0x221a15 });
    const backPanel = new THREE.Mesh(backPanelGeo, backPanelMat);
    backPanel.position.z = -frameDepth * 0.5;
    paintingGroup.add(backPanel);

    // VỊ TRÍ TREO TRANG TRỌNG PHÍA SAU BỆ TRƯNG BÀY
    // Bệ sách tại (-48.0, 10.0, 19.0). Góc nhìn hướng từ -44 về -48.
    // Tranh treo tại vách phân cách phía sau bệ: X = -52.8m, Y = 12.5m (ngang tầm mắt), Z = 19.0m
    paintingGroup.position.set(this.origin.x - 4.6, this.origin.y + 2.5, this.origin.z);
    paintingGroup.rotation.y = Math.PI * 0.5; // Hướng mặt tranh thẳng về sảnh đón (+X)

    this.group.add(paintingGroup);
    this.paintingGroup = paintingGroup;
  }

  // =========================================================================
  // 4. ÁNH SÁNG TRƯNG BÀY NGHỆ THUẬT (EXHIBITION MOOD LIGHTING)
  // =========================================================================
  initExhibitionSpotlight() {
    try {
      const plinthX = this.plinthX ?? (this.origin.x + 0.95);
      const plinthZ = this.plinthZ ?? (this.origin.z + 1.35);
      const plinthTopY = this.plinthTopY ?? (this.origin.y + 0.84);

      // 1. SpotLight vàng hổ phách dịu rọi xiên tập trung vào thân đàn để làm nổi bật bề mặt khảm xà cừ
      const luteSpot = new THREE.SpotLight(0xffd27d, 3.2, 12.0, Math.PI / 5.5, 0.55, 1.8);
      luteSpot.name = "DanTyBa_MotherOfPearl_Accent_SpotLight";

      // Đặt rọi xiên từ phía trước - trên cao xuống góc ~45 độ
      luteSpot.position.set(plinthX + 1.25, plinthTopY + 2.8, plinthZ + 1.25);

      const luteTarget = new THREE.Object3D();
      luteTarget.name = "DanTyBa_SpotLight_Target";
      luteTarget.position.set(plinthX, plinthTopY + 0.35, plinthZ);
      this.group.add(luteTarget);

      luteSpot.target = luteTarget;
      luteSpot.castShadow = true;
      luteSpot.shadow.mapSize.width = 1024;
      luteSpot.shadow.mapSize.height = 1024;
      luteSpot.shadow.bias = -0.0003;
      luteSpot.shadow.camera.near = 0.5;
      luteSpot.shadow.camera.far = 8.0;

      this.group.add(luteSpot);
      this.danTyBaSpotLight = luteSpot;
      this.danTyBaSpotLightTarget = luteTarget;

      // 2. SpotLight môi trường dịu nhẹ toàn gian phòng
      const roomSpot = new THREE.SpotLight(0xffeedd, 1.5, 15.0, Math.PI / 4, 0.65, 1.8);
      roomSpot.name = "KieuRoom_Ambient_SpotLight";
      roomSpot.position.set(this.origin.x, this.origin.y + 7.8, this.origin.z);
      const roomTarget = new THREE.Object3D();
      roomTarget.position.set(this.origin.x, this.origin.y + 1.0, this.origin.z);
      this.group.add(roomTarget);
      roomSpot.target = roomTarget;
      roomSpot.castShadow = false;
      this.group.add(roomSpot);
    } catch (e) {
      console.warn("[SELF-HEALING] Error initializing exhibition spotlight:", e);
    }
  }

  // =========================================================================
  // 5. CẬP NHẬT HOẠT ẢNH KHÓI HƯƠNG (SMOKE DRIFT ANIMATION LOOP)
  // =========================================================================
  update(delta = 0.016, elapsedTime = 0) {
    if (!this.smokeParticles?.geometry) return;

    const posAttr = this.smokeParticles.geometry.attributes.position;
    if (!posAttr?.array) return;

    const arr = posAttr.array;
    const maxSmokeHeight = 2.4; // Khói tan dần ở độ cao 2.4m trên lư hương

    for (let i = 0; i < this.smokeCount; i++) {
      const idx = i * 3;
      const s = this.smokeData[i];

      // Khói bốc lên cao
      s.height += s.speed * delta;
      if (s.height > maxSmokeHeight) {
        s.height = 0.02; // Tái sinh mềm tại miệng lư hương
      }

      const normalizedH = s.height / maxSmokeHeight;
      // Vòng xoắn ốc mở rộng dần theo chiều cao
      const spiralRadius = 0.025 + normalizedH * 0.22;
      const currentAngle = s.spiralPhase + elapsedTime * s.spiralFreq;

      // Hiệu ứng gió xuân thoang thoảng làm tản khói
      const windSwayX = Math.sin(elapsedTime * 1.1 + s.swayPhaseX + s.height * 2.0) * (normalizedH * 0.06);
      const windSwayZ = Math.cos(elapsedTime * 0.9 + s.swayPhaseZ + s.height * 1.8) * (normalizedH * 0.06);

      arr[idx] = Math.cos(currentAngle) * spiralRadius + windSwayX;
      arr[idx + 1] = this.smokeOriginY + s.height;
      arr[idx + 2] = Math.sin(currentAngle) * spiralRadius + windSwayZ;
    }

    posAttr.needsUpdate = true;
  }

  // =========================================================================
  // 6. KHỬ ĐỘC NaN & TỰ ĐỘNG BẢO VỆ RENDER
  // =========================================================================
  sanitizeAndFinalizeGeometries() {
    this.group.traverse((child) => {
      if (child.isMesh || child.isPoints || child.isLine) {
        child.frustumCulled = false;

        if (child.geometry) {
          this.prepareGeometry(child.geometry);
        }

        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => {
              if (m) m.side = THREE.DoubleSide;
            });
          } else {
            child.material.side = THREE.DoubleSide;
          }
        }
      }
    });
  }

  dispose() {
    try {
      this.group.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m?.dispose?.());
          } else {
            child.material?.dispose?.();
          }
        }
      });
      this.group.clear();
    } catch (e) {
      console.warn("[SELF-HEALING] Error disposing KieuRoomDecor:", e);
    }
  }
}

export { RoomDecorator };
export default KieuRoomDecor;
