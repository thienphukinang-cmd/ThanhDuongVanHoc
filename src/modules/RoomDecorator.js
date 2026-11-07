import { playBookVortexCutscene } from './bookVortexCutscene.js';
import { WORLD_STATES } from './worldManager.js';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { registerInteractiveBook } from './PortalInteraction.js';
import { 
  getSharedMaterial, 
  getFakeShadowMaterial, 
  getFakeGlowSpriteMaterial, 
  getCalligraphyPlaqueMaterial,
  getFloorLightPoolMaterial
} from './proceduralMaterials.js';

/**
 * ROOM DECORATOR MODULE: PHÒNG TRƯNG BÀY TRUYỆN KIỀU (PHÒNG 01 - TẦNG 2)
 * BỐ CỤC TRANG TRÍ CHUẨN ĐÔNG DƯƠNG (INDOCHINE CATHEDRAL SPECIFICATION)
 * 
 * 1. Tọa độ phòng chuẩn:
 *    - Tâm phòng: X = -48.0, Y = 10.0, Z = 19.0 (Tầng 2 - Hiên Tây-Nam)
 *    - Cửa vòm hướng Đông: X = -34.0, Z = 19.0 (Delta X = +14.0)
 *    - Phía sau bình phong: X = -56.0, Z = 19.0 (Delta X = -8.0)
 * 
 * 2. Bộ lọc bảo vệ 2GB VRAM (GTX 1050 & GPU Văn Phòng):
 *    - Tuyệt đối KHÔNG tạo thêm PointLight / SpotLight trong phòng.
 *    - Toàn bộ mesh: castShadow = false, receiveShadow = false, frustumCulled = true.
 *    - Downscale texture maps > 512px về 512x512 canvas, generateMipmaps = false, minFilter = THREE.LinearFilter.
 * 
 * 3. Chuẩn hóa kích thước nhân vật:
 *    - Tự động scale chiều cao về chuẩn 2.4m qua THREE.Box3().setFromObject(model).
 *    - Đặt chân nhân vật đứng sát mặt bục (y = pedestalTopY = 0.9m).
 *    - Gắn bảng tên chữ vàng (512x128 Cached CanvasTexture) mặt trước bục hướng về cửa vòm.
 */

// Cache vật liệu bảng tên nhân vật để tránh cấp phát trùng lặp bộ nhớ
const NAMEPLATE_CACHE = {};

/**
 * Tạo vật liệu bảng tên chữ vàng nền gỗ mun sơn mài Indochine (512x128 Cached CanvasTexture)
 */
export function getCharacterNameplateMaterial(name = '', subtitle = '', id = 'char') {
  const cacheKey = `nameplate_${id}`;
  if (NAMEPLATE_CACHE[cacheKey]) return NAMEPLATE_CACHE[cacheKey];

  if (typeof document === 'undefined') {
    return new THREE.MeshBasicMaterial({ color: 0xdfb738 });
  }

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // 1. Nền gỗ mun sơn mài Indochine trầm ấm
    ctx.fillStyle = '#140c08';
    ctx.fillRect(0, 0, 512, 128);

    // 2. Vân gỗ mun tự nhiên
    ctx.fillStyle = 'rgba(25, 15, 8, 0.45)';
    for (let i = 0; i < 14; i++) {
      ctx.fillRect(0, i * 9, 512, 2.5);
    }

    // 3. Viền kép kim loại hoàng gia (Double Gold Foil Trim)
    ctx.strokeStyle = '#dfb738';
    ctx.lineWidth = 4;
    ctx.strokeRect(5, 5, 502, 118);

    ctx.strokeStyle = 'rgba(255, 235, 168, 0.65)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(11, 11, 490, 106);

    // 4. Hoa văn góc hoàng gia Indochine
    ctx.fillStyle = '#dfb738';
    const cSize = 9;
    ctx.fillRect(13, 13, cSize, cSize);
    ctx.fillRect(512 - 13 - cSize, 13, cSize, cSize);
    ctx.fillRect(13, 128 - 13 - cSize, cSize, cSize);
    ctx.fillRect(512 - 13 - cSize, 128 - 13 - cSize, cSize, cSize);

    // 5. Tiêu đề tên nhân vật mạ vàng
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 30px "Cinzel", "Georgia", "Times New Roman", serif';

    ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = '#ffd56b';
    ctx.fillText(name.toUpperCase(), 256, subtitle ? 48 : 64);

    // 6. Phụ đề / câu thơ đặc trưng
    if (subtitle) {
      ctx.font = 'italic 16px "Georgia", "Times New Roman", serif';
      ctx.fillStyle = '#e8c47e';
      ctx.shadowBlur = 3;
      ctx.fillText(subtitle, 256, 88);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const mat = new THREE.MeshLambertMaterial({
    map: texture,
    emissive: new THREE.Color(0x281c0e),
    emissiveIntensity: 0.35,
    side: THREE.DoubleSide
  });

  NAMEPLATE_CACHE[cacheKey] = mat;
  return mat;
}

/**
 * BỘ LỌC BẢO VỆ 2GB VRAM BẮT BUỘC KHI LOAD FILE .GLB
 * Khóa chặt GPU, triệt tiêu shadow passes, downscale texture > 512px
 */
export function apply2GBVRAMFilter(model) {
  if (!model) return;

  model.traverse((child) => {
    // 1. Loại bỏ toàn bộ PointLight / SpotLight bên trong file GLB
    if (child.isLight) {
      child.visible = false;
      child.intensity = 0;
      child.castShadow = false;
      if (child.parent) {
        setTimeout(() => {
          try { child.parent?.remove?.(child); } catch (_) {}
        }, 0);
      }
      return;
    }

    // 2. Kích hoạt Layer 1 để tương thích hệ thống Camera & Culling
    child.layers?.enable?.(1);
    child.userData.excludeFromCollision = true;

    if (child.isMesh) {
      // Khóa đổ bóng toàn phần để giải phóng 100% băng thông shadow passes
      child.castShadow = false;
      child.receiveShadow = false;
      child.frustumCulled = true;

      // 3. Downscale mọi texture map > 512px về canvas 512x512
      if (child.material) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((mat) => {
          if (!mat) return;
          const texProps = ['map', 'emissiveMap', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap'];
          texProps.forEach((prop) => {
            const tex = mat[prop];
            if (tex && tex.isTexture) {
              downscaleTextureTo512(tex);
            }
          });
        });
      }
    }
  });
}

/**
 * Downscale texture xuống tối đa 512x512 và tắt mipmaps
 */
function downscaleTextureTo512(texture, maxSize = 512) {
  if (!texture) return;
  try {
    const img = texture.image;
    if (img && typeof document !== 'undefined') {
      const width = img.width || img.videoWidth || (img.naturalWidth ?? 0);
      const height = img.height || img.videoHeight || (img.naturalHeight ?? 0);

      if (width > maxSize || height > maxSize) {
        const canvas = document.createElement('canvas');
        let targetW = maxSize;
        let targetH = maxSize;
        if (width >= height) {
          targetW = maxSize;
          targetH = Math.max(1, Math.round((height / width) * maxSize));
        } else {
          targetH = maxSize;
          targetW = Math.max(1, Math.round((width / height) * maxSize));
        }

        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, targetW, targetH);
          texture.image = canvas;
          texture.needsUpdate = true;
          if (img.src && img.src.startsWith('blob:')) {
            try { URL.revokeObjectURL(img.src); } catch (_) {}
          }
        }
      }
    }
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
  } catch (err) {
    console.warn('[VRAM Optimizer] Lỗi downscale texture:', err);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
  }
}

/**
 * TỰ ĐỘNG CHUẨN HÓA KÍCH THƯỚC NHÂN VẬT (THREE.Box3().setFromObject(model))
 * - Scale chiều cao về chuẩn 2.4m
 * - Đặt chân nhân vật đứng sát mặt bục (y = pedestalTopY)
 * - Căn giữa nhân vật trên bục
 */
export function normalizeCharacterModel(model, pedestalTopY = 0.90, targetHeight = 2.40) {
  if (!model) return;

  model.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);

  const initialHeight = size.y > 0.05 ? size.y : 1.0;
  const scaleRatio = targetHeight / initialHeight;
  model.scale.multiplyScalar(scaleRatio);

  // Cập nhật lại bounding box sau khi scale
  model.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(model);
  box.getSize(size);

  // Đặt đáy chân nhân vật (box.min.y) sát mặt trên của bục (pedestalTopY)
  const deltaY = pedestalTopY - box.min.y;
  model.position.y += deltaY;

  // Căn giữa nhân vật theo trục X và Z
  box = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  box.getCenter(center);
  model.position.x -= center.x;
  model.position.z -= center.z;

  console.log(`%c✓ [Pedestal Normalizer] Nhân vật scale = ${size.y.toFixed(2)}m • Chân đặt tại Y = ${pedestalTopY}m`, 'color: #39e58c;');
}

export class RoomDecorator {
  constructor(materialLibrary = null, options = {}) {
    this.matLib = materialLibrary;
    this.roomId = options.roomId || 'truyen_kieu';
    this.renderer = options.renderer || null;

    if (this.renderer) {
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.0;
    }

    // TỌA ĐỘ PHÒNG TRUYỆN KIỀU: TẦNG 2 (ELEVATION Y = 10.0), HIÊN TÂY-NAM (-48, 10, 19)
    this.origin = options.origin ?? new THREE.Vector3(-48.0, 10.0, 19.0);
    this.doorWorldPosition = new THREE.Vector3(-34.0, 10.0, 19.0); // Cửa vòm hướng Đông

    this.group = new THREE.Group();
    this.group.name = "TruyenKieuRoomGroup";
    this.group.position.copy(this.origin);
    this.group.rotation.y = 0; // Tọa độ local đồng bộ tuyệt đối với trục bảo tàng (+X: Đông, -X: Tây)

    window.truyenKieuRoomGroup = this.group;

    this.gltfLoader = new GLTFLoader();
    this.bookModel = null;
    this.bookHalo = null;
    this.characterPedestals = [];
    this.collisionObjects = [];
    this.lightsActive = true;

    // KHỞI TẠO BỐ CỤC TRANG TRÍ CHUẨN INDOCHINE
    this.buildIndochineFloorInlay();
    this.buildCentralBookPedestal();
    this.buildCharacterPedestalsArc();
    this.buildBackSilkScreenAndHoanhPhi();
    this.buildHexagonalCeilingLanterns();

    // Bật Layer 1 cho toàn bộ nhóm phòng 01
    this.group.traverse((c) => {
      c.layers?.enable?.(1);
    });

    console.log("%c🏛️ [ROOM 01 DECORATOR] Đã trang trí Phòng Truyện Kiều Indochine thành công!", "color: #39e58c; font-weight: bold; font-size: 14px;");
  }

  getMat(name) {
    return this.matLib?.get?.(name) ?? getSharedMaterial(name);
  }

  getGroup() {
    return this.group;
  }

  getBookMesh() {
    return this.bookModel;
  }

  getCollisionObjects() {
    return this.collisionObjects;
  }

  setLightsActive(active) {
    this.lightsActive = active;
  }

  /**
   * VÒNG LẶP CẬP NHẬT HOẠT ẢNH NHẸ NHÀNG (ZERO CPU OVERHEAD)
   */
  update(delta = 0.016, elapsedTime = 0, camera = null) {
    if (this.bookHalo) {
      // Hào quang cuốn sách thở nhẹ nhàng
      const pulse = 1.0 + Math.sin(elapsedTime * 2.2) * 0.06;
      this.bookHalo.scale.set(2.2 * pulse, 2.2 * pulse, 1.0);
    }
  }

  /**
   * 0. NỀN GỖ TRẮC CỔ KHẢM HOA VĂN INDOCHINE DƯỚI SÀN PHÒNG
   */
  buildIndochineFloorInlay() {
    const matWood = this.getMat('dark_wood');
    const matGold = this.getMat('royalGold');

    // Thảm gỗ sàn nổi viền vàng mỏng
    const floorBorder = new THREE.Mesh(new THREE.BoxGeometry(15.2, 0.02, 15.2), matGold);
    floorBorder.position.set(-3.5, 0.01, 0);
    floorBorder.receiveShadow = false;

    const floorInlay = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.025, 14.8), matWood);
    floorInlay.position.set(-3.5, 0.015, 0);
    floorInlay.receiveShadow = false;

    this.group.add(floorBorder, floorInlay);
  }

  /**
   * 1. TRUNG TÂM PHÒNG (-48, Y, 19): BỤC GỖ MUN VIỀN VÀNG TRƯNG BÀY CUỐN SÁCH CỔ TRUYỆN KIỀU
   * Kèm quầng sáng AdditiveBlending và bóng đổ getFakeShadowMaterial()
   */
  buildCentralBookPedestal() {
    const matWood = this.getMat('dark_wood');
    const matGold = this.getMat('royalGold');
    const matSilk = this.getMat('silkLit');

    const pedestalGroup = new THREE.Group();
    pedestalGroup.name = "Central_Book_Pedestal_Group";
    pedestalGroup.position.set(0, 0, 0); // Tọa độ local (0, 0, 0) chính là World (-48, 10, 19)

    // A. Bóng đổ giả lập dưới chân bục sách trung tâm (Fake Contact Shadow)
    const shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), getFakeShadowMaterial());
    shadowMesh.name = "CentralPedestal_FakeShadow";
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, 0.02, 0);
    shadowMesh.renderOrder = 1;
    pedestalGroup.add(shadowMesh);

    // Vệt sáng sàn ấm áp dưới chân bục (Floor Light Pool)
    const lightPool = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4), getFloorLightPoolMaterial());
    lightPool.name = "CentralPedestal_LightPool";
    lightPool.rotation.x = -Math.PI / 2;
    lightPool.position.set(0, 0.025, 0);
    lightPool.renderOrder = 2;
    pedestalGroup.add(lightPool);

    // B. Bục gỗ mun viền vàng tam cấp Indochine
    const step1 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 2.4), matWood);
    step1.position.y = 0.08;
    const step1Trim = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.03, 2.45), matGold);
    step1Trim.position.y = 0.16;

    const step2 = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.16, 1.8), matWood);
    step2.position.y = 0.24;
    const step2Trim = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.03, 1.85), matGold);
    step2Trim.position.y = 0.32;

    // Cột trụ bục sách bát giác
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.72, 16), matWood);
    column.position.y = 0.68;
    const colTrimTop = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.56, 0.06, 16), matGold);
    colTrimTop.position.y = 1.02;

    // Mặt bàn trưng bày nghiêng đón ánh nhìn từ cửa vòm (nghiêng 15 độ về hướng +X)
    const tableTopGroup = new THREE.Group();
    tableTopGroup.position.set(0, 1.08, 0);
    tableTopGroup.rotation.z = -0.18; // Nghiêng đón hướng nhìn người bước vào từ cửa Đông (+X)

    const tableBase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, 0.9), matWood);
    const tableTrim = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.04, 0.94), matGold);
    tableTrim.position.y = 0.03;
    tableTopGroup.add(tableBase, tableTrim);

    // C. Cuốn Sách Cổ Truyện Kiều mở đôi mạ vàng & lụa ngà
    const bookGroup = new THREE.Group();
    bookGroup.name = "Ancient_TruyenKieu_OpenBook";
    bookGroup.position.set(0, 0.08, 0);

    const bookCover = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.04, 0.64), matGold);
    bookCover.name = "Interactive_TruyenKieu_Book_Cover";

    // Trang sách lụa mở cong hai cánh
    const pageLeft = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.58), matSilk);
    pageLeft.position.set(-0.21, 0.03, 0);
    pageLeft.rotation.z = 0.06;

    const pageRight = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.03, 0.58), matSilk);
    pageRight.position.set(0.21, 0.03, 0);
    pageRight.rotation.z = -0.06;

    // Hào quang ma thuật AdditiveBlending tỏa sáng dịu ngọt quanh cuốn sách
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x39e58c,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const haloDisk = new THREE.Mesh(new THREE.RingGeometry(0.25, 0.85, 32), haloMat);
    haloDisk.rotation.x = -Math.PI / 2;
    haloDisk.position.y = 0.05;
    haloDisk.renderOrder = 10;

    // Quầng sáng Sprite AdditiveBlending
    const haloSprite = new THREE.Sprite(getFakeGlowSpriteMaterial());
    haloSprite.name = "Book_Glow_Sprite";
    haloSprite.position.set(0, 0.15, 0);
    haloSprite.scale.set(2.2, 2.2, 1.0);
    this.bookHalo = haloSprite;

    bookGroup.add(bookCover, pageLeft, pageRight, haloDisk, haloSprite);
    tableTopGroup.add(bookGroup);

    pedestalGroup.add(step1, step1Trim, step2, step2Trim, column, colTrimTop, tableTopGroup);
    this.group.add(pedestalGroup);
    this.bookModel = bookCover;

    // Phương thức kích hoạt Cutscene 1.15s dịch chuyển vào Thế Giới Tự Sự Truyện Kiều (Tiết Thanh Minh)
    this.enterRealm = () => {
      const app = window.__app;
      const cam = app?.camera || window.__camera;
      const ctrl = app?.cameraManager?.controls || window.__controls;
      const camCtrl = app?.cameraManager?.cameraController || window.__cameraController;

      playBookVortexCutscene({
        camera: cam,
        cameraController: camCtrl,
        controls: ctrl,
        bookMesh: bookCover,
        themeColor: 0x39e58c,
        onTransition: () => {
          if (app?.worldManager) {
            app.worldManager.transitionTo(WORLD_STATES.KIEU_WORLD);
          } else if (app?.setActiveScene && (app?.truyenKieuScene || window.__truyenKieuScene)) {
            app.setActiveScene(app.truyenKieuScene || window.__truyenKieuScene);
            if (app.kieuWorld) app.kieuWorld.setVisible(true);
          }
        }
      });
    };

    // Đăng ký tương tác Raycasting click cho cuốn sách trung tâm
    registerInteractiveBook(bookCover, new THREE.Vector3(0, 0, 0), {
      id: 'truyen_kieu',
      title: 'TRUYỆN KIỀU – NGUYỄN DU',
      author: 'Đại thi hào Nguyễn Du (1765 – 1820)',
      genre: 'Truyện thơ Nôm (Văn học Trung đại)',
      quote: 'Đoạn trường tân thanh – Khúc ca bi tráng về tài mệnh tương đố và khát vọng tự do ngút trời.',
      targetZoneId: 1,
      themeColor: 0x39e58c,
      portalReady: true,
      onActivate: () => this.enterRealm()
    });

    // Bắt sự kiện Click trực tiếp lên bàn/sách trung tâm
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    window.addEventListener('click', (e) => {
      const app = window.__app;
      if (app?.worldManager?.currentState === WORLD_STATES.KIEU_WORLD) return;
      const cam = app?.camera || window.__camera;
      if (!cam) return;
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, cam);
      const intersects = raycaster.intersectObjects([bookCover, pageLeft, pageRight, tableTopGroup], true);
      if (intersects.length > 0 && intersects[0].distance < 14) {
        this.enterRealm();
      }
    });
  }

  /**
   * 2. BỐ TRÍ CÁC BỤC TƯỢNG NHÂN VẬT XẾP HÌNH VÒNG CUNG HƯỚNG VỀ CỬA VÒM (X = -34)
   * Nạp file .glb, chuẩn hóa 2.4m, chân sát mặt bục (y = 0.9m), gắn bảng tên chữ vàng 512x128
   */
  buildCharacterPedestalsArc() {
    const matWood = this.getMat('dark_wood');
    const matGold = this.getMat('royalGold');

    // Danh sách cấu hình nhân vật Truyện Kiều trong vòng cung
    const arcCharacters = [
      {
        id: 'thuy_kieu',
        name: 'NÀNG THÚY KIỀU',
        subtitle: 'ĐOẠN TRƯỜNG TÂN THANH • TUYỆT THẾ GIAI NHÂN',
        file: '/model/thuykieu.glb',
        fallbackFile: '/models/thuykieu.glb',
        pos: new THREE.Vector3(-4.2, 0, 0), // Trung tâm vòng cung (World X = -52.2, Z = 19.0)
        isHero: true
      },
      {
        id: 'kim_trong',
        name: 'CHÀNG KIM TRỌNG',
        subtitle: 'PHONG TƯ TÀI MẠO • ĐỒNG TÂM TRI KỶ',
        file: '/model/kimtrongthuykieu.glb',
        fallbackFile: '/models/kimtrongthuykieu.glb',
        pos: new THREE.Vector3(-3.2, 0, -3.8), // Cánh trái vòng cung (World X = -51.2, Z = 15.2)
        relicType: 'desk'
      },
      {
        id: 'tu_hai',
        name: 'TƯỚNG QUÂN TỪ HẢI',
        subtitle: 'ĐỘI TRỜI ĐẠP ĐẤT • KHÍ PHÁCH ANH HÙNG',
        file: '/model/tuhai.glb',
        fallbackFile: '/model/thuykieu.glb',
        pos: new THREE.Vector3(-3.2, 0, 3.8), // Cánh phải vòng cung (World X = -51.2, Z = 22.8)
        relicType: 'sword'
      },
      {
        id: 'thuy_van',
        name: 'NÀNG THÚY VÂN',
        subtitle: 'KHUÔN TRĂNG ĐẦY ĐẶN • NÉT NGÀI NỞ NANG',
        file: '/model/thuykieu.glb',
        fallbackFile: '/models/thuykieu.glb',
        pos: new THREE.Vector3(-1.8, 0, -6.8), // Cánh ngoài trái (World X = -49.8, Z = 12.2)
        relicType: 'lute'
      },
      {
        id: 'vuong_quan',
        name: 'GIA ĐÌNH VƯƠNG ÔNG',
        subtitle: 'GIA TƯ NGHĨ CŨNG THƯỜNG THƯỜNG BẬC TRUNG',
        file: '/model/tieudong.glb',
        pos: new THREE.Vector3(-1.8, 0, 6.8), // Cánh ngoài phải (World X = -49.8, Z = 25.8)
        relicType: 'vase'
      }
    ];

    const pedestalTopY = 0.90; // Độ cao mặt trên của bục tượng

    arcCharacters.forEach((char) => {
      const pGroup = new THREE.Group();
      pGroup.name = `PedestalGroup_${char.id}`;
      pGroup.position.copy(char.pos);

      // Xoay bục và nhân vật hướng thẳng về phía cửa vòm (+14, 0, 0 trong local space)
      const lookTarget = new THREE.Vector3(14.0, char.pos.y, 0);
      pGroup.lookAt(lookTarget);

      // A. Bóng đổ giả lập dưới chân bục nhân vật
      const pShadow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), getFakeShadowMaterial());
      pShadow.name = `Pedestal_Shadow_${char.id}`;
      pShadow.rotation.x = -Math.PI / 2;
      pShadow.position.set(0, 0.015, 0);
      pShadow.renderOrder = 1;
      pGroup.add(pShadow);

      // B. Thân bục trụ tròn gỗ mun viền vàng hoàng gia
      const basePlinth = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.86, 0.20, 20), matWood);
      basePlinth.position.y = 0.10;
      const baseTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.87, 0.87, 0.04, 20), matGold);
      baseTrim.position.y = 0.20;

      const columnMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.74, 0.58, 20), matWood);
      columnMesh.position.y = 0.50;

      const topPlinth = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.68, 0.12, 20), matWood);
      topPlinth.position.y = 0.84;
      const topTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.04, 20), matGold);
      topTrim.position.y = 0.90;

      pGroup.add(basePlinth, baseTrim, columnMesh, topPlinth, topTrim);

      // C. Bảng tên chữ vàng 512x128 Cached CanvasTexture gắn mặt trước bục
      const nameplateMat = getCharacterNameplateMaterial(char.name, char.subtitle, char.id);
      const nameplateMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.24), nameplateMat);
      nameplateMesh.name = `Nameplate_${char.id}`;
      // Gắn ở mặt trước (trục +Z của pGroup vì pGroup đã lookAt cửa vòm)
      nameplateMesh.position.set(0, 0.50, 0.72);
      pGroup.add(nameplateMesh);

      // D. Nạp mô hình nhân vật .glb và chuẩn hóa kích thước chuẩn 2.4m
      this.loadCharacterGLB(char, pGroup, pedestalTopY);

      this.group.add(pGroup);
      this.characterPedestals.push(pGroup);

      // Thêm va chạm hình hộp cho bục nhân vật
      const worldPos = new THREE.Vector3().addVectors(this.origin, char.pos);
      this.collisionObjects.push({
        name: `pedestal_char_${char.id}`,
        isMesh: false,
        visible: true,
        userData: {
          worldAABB: new THREE.Box3(
            new THREE.Vector3(worldPos.x - 0.9, worldPos.y, worldPos.z - 0.9),
            new THREE.Vector3(worldPos.x + 0.9, worldPos.y + pedestalTopY, worldPos.z + 0.9)
          ),
          center: new THREE.Vector3(worldPos.x, worldPos.y + pedestalTopY * 0.5, worldPos.z)
        }
      });
    });
  }

  /**
   * Nạp file mô hình nhân vật với bộ lọc bảo vệ 2GB VRAM & chuẩn hóa kích thước 2.4m
   */
  loadCharacterGLB(charConfig, parentGroup, pedestalTopY = 0.90) {
    if (typeof window === 'undefined') return;

    const urlsToTry = [charConfig.file];
    if (charConfig.fallbackFile && charConfig.fallbackFile !== charConfig.file) {
      urlsToTry.push(charConfig.fallbackFile);
    }

    const tryLoad = (index) => {
      if (index >= urlsToTry.length) {
        // Nếu không có file .glb, tạo tiểu cảnh cổ vật Indochine dự phòng tương ứng
        this.buildFallbackRelic(charConfig, parentGroup, pedestalTopY);
        return;
      }

      const url = urlsToTry[index];
      this.gltfLoader.load(
        url,
        (gltf) => {
          const model = gltf.scene || gltf.scenes?.[0];
          if (!model) {
            tryLoad(index + 1);
            return;
          }

          model.name = `Character_Model_${charConfig.id}`;

          // 1. Áp dụng bộ lọc bảo vệ 2GB VRAM
          apply2GBVRAMFilter(model);

          // 2. Thêm vào bục
          parentGroup.add(model);

          // Nếu là Thúy Vân: phủ sắc áo lụa hoàng yến đoan trang quý phái (#ffe680)
          if (charConfig.id === 'thuy_van') {
            model.traverse((c) => {
              if (c.isMesh && c.material) {
                c.material = c.material.clone();
                if (c.material.color) {
                  c.material.color.multiply(new THREE.Color(0xffe680));
                }
              }
            });
          }

          // 3. Tự động chuẩn hóa kích thước về chuẩn 2.4m & đặt chân sát mặt bục (y = pedestalTopY)
          normalizeCharacterModel(model, pedestalTopY, 2.40);

          // Cập nhật ma trận thế giới & Bọc Tight Click Hitbox (Skill: hitbox-collision-architect)
          model.updateMatrixWorld(true);
          if (typeof window !== 'undefined' && window.__museumHitboxManager) {
            window.__museumHitboxManager.createTightClickHitbox(model, {
              loreKey: charConfig.id,
              isBookPortal: false,
              padding: 0.12
            });
          }

          console.log(`%c✓ [GLB Loaded] Nạp thành công tượng ${charConfig.name} từ ${url}`, 'color: #39e58c; font-weight: bold;');
        },
        undefined,
        (err) => {
          // Thử tiếp URL dự phòng hoặc chuyển sang fallback relic
          tryLoad(index + 1);
        }
      );
    };

    tryLoad(0);
  }

  /**
   * Tiểu cảnh cổ vật biểu trưng Indochine dự phòng cho các nhân vật phụ chưa có GLB
   */
  buildFallbackRelic(charConfig, parentGroup, pedestalTopY) {
    const matWood = this.getMat('dark_wood');
    const matGold = this.getMat('royalGold');
    const matSilk = this.getMat('silkLit');

    const relicGroup = new THREE.Group();
    relicGroup.name = `FallbackRelic_${charConfig.id}`;
    relicGroup.position.set(0, pedestalTopY, 0);

    switch (charConfig.relicType) {
      case 'desk': // Kim Trọng: Án thư văn chương & Cuộn thư ngọc
        const desk = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 0.55), matWood);
        desk.position.y = 0.225;
        const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.8, 12), matSilk);
        scroll.rotation.z = Math.PI / 2;
        scroll.position.set(0, 0.52, 0);
        relicGroup.add(desk, scroll);
        break;

      case 'sword': // Từ Hải: Giá bảo kiếm & Thanh kiếm anh hùng
        const stand = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.2), matWood);
        stand.position.y = 0.3;
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.4, 0.02), matGold);
        blade.position.set(0, 0.8, 0);
        relicGroup.add(stand, blade);
        break;

      case 'lute': // Thúy Vân: Đàn tỳ bà khảm xà cừ
        const luteBody = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.12, 0.65, 12), matSilk);
        luteBody.rotation.z = Math.PI / 2;
        luteBody.position.set(0, 0.45, 0);
        const luteNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.55, 8), matWood);
        luteNeck.rotation.z = Math.PI / 2;
        luteNeck.position.set(0.48, 0.45, 0);
        relicGroup.add(luteBody, luteNeck);
        break;

      default: // Bình gốm / Lư hương trầm
        const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.75, 16), matGold);
        vase.position.y = 0.38;
        relicGroup.add(vase);
        break;
    }

    parentGroup.add(relicGroup);
    relicGroup.updateMatrixWorld(true);
    if (typeof window !== 'undefined' && window.__museumHitboxManager) {
      window.__museumHitboxManager.createTightClickHitbox(relicGroup, {
        loreKey: charConfig.id,
        isBookPortal: false,
        padding: 0.12
      });
    }
  }

  /**
   * 3. PHÍA SAU CÁC NHÂN VẬT (X = -56): BÌNH PHONG LỤA 3 TẤM + HOÀNH PHI "ĐOẠN TRƯỜNG TÂN THANH"
   * Local X = -8.0 (World X = -48 + (-8) = -56.0, Z = 19.0)
   */
  buildBackSilkScreenAndHoanhPhi() {
    const matWood = this.getMat('dark_wood');
    const matGold = this.getMat('royalGold');
    const matSilk = this.getMat('silkLit');

    const screenMasterGroup = new THREE.Group();
    screenMasterGroup.name = "Back_SilkScreen_3Panels_Master";
    screenMasterGroup.position.set(-8.0, 0, 0); // Vị trí X = -56.0 trong không gian bảo tàng

    // A. Bức bình phong lụa 3 tấm Indochine
    const screenBase = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 9.6), matWood);
    screenBase.position.y = 0.09;
    screenMasterGroup.add(screenBase);

    // 1. Tấm bình phong giữa (Width = 3.8m, Height = 4.2m)
    const centerPanelGroup = new THREE.Group();
    const postC1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 4.3, 0.14), matWood);
    postC1.position.set(0, 2.15, -1.9);
    const postC2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 4.3, 0.14), matWood);
    postC2.position.set(0, 2.15, 1.9);
    const topBarC = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 3.8), matGold);
    topBarC.position.set(0, 4.25, 0);

    const silkC = new THREE.Mesh(new THREE.BoxGeometry(0.04, 3.9, 3.65), matSilk);
    silkC.position.set(0, 2.15, 0);

    centerPanelGroup.add(postC1, postC2, topBarC, silkC);
    screenMasterGroup.add(centerPanelGroup);

    // 2. Tấm bình phong cánh trái (gập góc 18 độ về phía trước +X)
    const leftPanelGroup = new THREE.Group();
    leftPanelGroup.position.set(0, 0, -1.9);
    leftPanelGroup.rotation.y = 0.32; // Gập nhẹ về hướng +X đón không gian phòng

    const postL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 4.0, 0.14), matWood);
    postL.position.set(0, 2.0, -2.6);
    const topBarL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 2.6), matGold);
    topBarL.position.set(0, 3.95, -1.3);
    const silkL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 3.6, 2.45), matSilk);
    silkL.position.set(0, 2.0, -1.3);

    leftPanelGroup.add(postL, topBarL, silkL);
    screenMasterGroup.add(leftPanelGroup);

    // 3. Tấm bình phong cánh phải (gập góc -18 độ về phía trước +X)
    const rightPanelGroup = new THREE.Group();
    rightPanelGroup.position.set(0, 0, 1.9);
    rightPanelGroup.rotation.y = -0.32;

    const postR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 4.0, 0.14), matWood);
    postR.position.set(0, 2.0, 2.6);
    const topBarR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 2.6), matGold);
    topBarR.position.set(0, 3.95, 1.3);
    const silkR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 3.6, 2.45), matSilk);
    silkR.position.set(0, 2.0, 1.3);

    rightPanelGroup.add(postR, topBarR, silkR);
    screenMasterGroup.add(rightPanelGroup);

    // B. Hoành phi mạ vàng "ĐOẠN TRƯỜNG TÂN THANH"
    const hoanhPhiPlaqueMat = getCalligraphyPlaqueMaterial('ĐOẠN TRƯỜNG TÂN THANH', 'doan_truong_tan_thanh');
    const hoanhPhiGeo = new THREE.BoxGeometry(0.08, 0.85, 3.4);
    const hoanhPhiMesh = new THREE.Mesh(hoanhPhiGeo, hoanhPhiPlaqueMat);
    hoanhPhiMesh.name = "HoanhPhi_DoanTruongTanThanh";
    // Quay mặt bảng về hướng Đông (+X)
    hoanhPhiMesh.position.set(0.12, 4.45, 0);

    const hoanhPhiTrim = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.91, 3.46), matGold);
    hoanhPhiTrim.position.set(0.10, 4.45, 0);

    screenMasterGroup.add(hoanhPhiMesh, hoanhPhiTrim);

    this.group.add(screenMasterGroup);

    // Thêm va chạm hình hộp cho bức bình phong lớn phía sau
    this.collisionObjects.push({
      name: 'screen_truyen_kieu_back',
      isMesh: false,
      visible: true,
      userData: {
        worldAABB: new THREE.Box3(
          new THREE.Vector3(this.origin.x - 8.6, this.origin.y, this.origin.z - 5.0),
          new THREE.Vector3(this.origin.x - 7.5, this.origin.y + 4.5, this.origin.z + 5.0)
        ),
        center: new THREE.Vector3(this.origin.x - 8.0, this.origin.y + 2.25, this.origin.z)
      }
    });
  }

  /**
   * 4. 4 ĐÈN LỒNG LỤC GIÁC TREO TRẦN DÙNG getFakeGlowSpriteMaterial()
   * Tuyệt đối không dùng PointLight / SpotLight
   */
  buildHexagonalCeilingLanterns() {
    const matWood = this.getMat('dark_wood');
    const matGold = this.getMat('royalGold');
    const matGlow = this.getMat('warmLedCove') || new THREE.MeshLambertMaterial({
      color: 0xffbe55,
      emissive: 0xff9f22,
      emissiveIntensity: 2.0
    });

    const lanternGroup = new THREE.Group();
    lanternGroup.name = "Hexagonal_Ceiling_Lanterns_Group";

    // 4 vị trí đèn lồng 4 góc phòng
    const lanternCoords = [
      { x: -6.0, z: -5.5 }, // Góc Tây-Bắc (World X = -54.0, Z = 13.5)
      { x: -6.0, z: 5.5 },  // Góc Tây-Nam (World X = -54.0, Z = 24.5)
      { x: 4.5,  z: -5.5 }, // Góc Đông-Bắc (World X = -43.5, Z = 13.5)
      { x: 4.5,  z: 5.5 }   // Góc Đông-Nam (World X = -43.5, Z = 24.5)
    ];

    lanternCoords.forEach((coord, i) => {
      const item = new THREE.Group();
      item.position.set(coord.x, 0, coord.z);

      // Dây treo từ trần nhà cao (Y = 7.8m buông xuống Y = 5.2m)
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2.6, 6), matWood);
      cord.position.y = 6.5;

      // Nắp trên & nắp dưới đèn lục giác
      const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.32, 0.14, 6), matGold);
      capTop.position.y = 5.25;

      const capBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.14, 6), matGold);
      capBottom.position.y = 4.05;

      // Thân đèn lồng lục giác phát sáng
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.1, 6), matGlow);
      body.position.y = 4.65;

      // Tua rua đèn lồng Indochine
      const tassel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.08, 0.5, 6), matGold);
      tassel.position.y = 3.75;

      // Quầng sáng giả lập siêu nhẹ Fake Glow Sprite (Additive)
      const halo = new THREE.Sprite(getFakeGlowSpriteMaterial());
      halo.name = `HexLantern_FakeHalo_${i}`;
      halo.position.set(0, 4.65, 0);
      halo.scale.set(2.6, 2.6, 1.0);

      item.add(cord, capTop, capBottom, body, tassel, halo);
      lanternGroup.add(item);
    });

    this.group.add(lanternGroup);
  }

  dispose() {
    try {
      if (this.group) {
        this.group.traverse((child) => {
          if (child.isMesh) {
            child.geometry?.dispose?.();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach((m) => m?.dispose?.());
              } else {
                child.material?.dispose?.();
              }
            }
          }
        });
        if (this.group.parent) {
          this.group.parent.remove(this.group);
        }
      }
    } catch (err) {
      console.warn('[RoomDecorator] Lỗi giải phóng bộ nhớ:', err);
    }
  }
}

// CÁC HÀM TƯƠNG THÍCH ĐƯỢC MAIN.JS IMPORT
export function setupTruyenKieuCinematicExtras(roomGroup) {}
export function overhaulTruyenKieuRoom(roomGroup) {}
export function updateTruyenKieuVFX(roomGroup, delta, elapsedTime) {}
export function updateTruyenKieuCinematic(roomGroup, delta, elapsedTime) {}

export function fixFloorAndLightingRoom01(roomGroup, scene, renderer, bloomPass) {
  if (renderer) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
  }
}

export function redesignTruyenKieuWithHeroModel(roomGroup, modelUrl = '/model/thuykieu.glb') {
  // Phòng 01 đã được trang trí toàn diện qua RoomDecorator với mô hình Thúy Kiều và bố cục Indochine
}

export default RoomDecorator;
