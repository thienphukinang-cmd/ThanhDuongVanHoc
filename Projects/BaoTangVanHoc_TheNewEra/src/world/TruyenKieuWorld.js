import * as THREE from 'three';
import { loadGlbCached } from '../utils/modelLoaderHelper.js';
import { mergeGroupMeshesByMaterial, mergeAllMeshesIntoSingleUnifiedMesh, disposeHierarchy } from '../utils/geometryMerger.js';

// Tọa độ gốc độc lập của Thế giới Truyện Kiều trong Scene riêng biệt (truyenKieuScene - Multi-Scene Architecture)
export const KIEU_WORLD_ORIGIN = new THREE.Vector3(0, 0, 0);

// Tọa độ 3 Phân Cảnh (cách nhau 140m, hoàn toàn không chồng lấn tầm nhìn)
export const REALM_ZONES = {
  ZONE_1: {
    id: 1,
    name: 'Vườn Thúy & Tiết Thanh Minh',
    poem: 'Cỏ non xanh tận chân trời / Cành lê trắng điểm một vài bông hoa',
    offset: new THREE.Vector3(0, 0, 0),
    cameraPos: new THREE.Vector3(0, 1.8, 5.5),
    targetPos: new THREE.Vector3(0.5, 1.6, -0.5),
    fogColor: 0xc4e2fa,
    fogDensity: 0.0022,
    skyColor: 0x87ceeb,
    floorHeight: 0.0
  },
  ZONE_2: {
    id: 2,
    name: 'Lầu Ngưng Bích Cửa Bể',
    poem: 'Buồn trông cửa bể chiều hôm / Thuyền ai thấp thoáng cánh buồm xa xa',
    offset: new THREE.Vector3(-140, 0, 0),
    cameraPos: new THREE.Vector3(0, 5.8, 4.2), // Trên vọng lâu tầng 2 nhìn ra biển
    targetPos: new THREE.Vector3(0, 5.2, -18.0),
    fogColor: 0x4f4068,
    fogDensity: 0.0028,
    skyColor: 0x5a4a75,
    floorHeight: 4.5 // Cao độ sàn vọng lâu (tọa độ gốc Y=0)
  },
  ZONE_3: {
    id: 3,
    name: 'Doanh Trại Từ Hải',
    poem: 'Trướng hùm mở giữa phù vân / Triệu binh nghiêm ngặt muôn phần uy linh',
    offset: new THREE.Vector3(140, 0, 0),
    cameraPos: new THREE.Vector3(0, 2.2, 9.5), // Trước bệ soái trướng ngắm lửa trại & cờ xí
    targetPos: new THREE.Vector3(0, 2.0, -1.0),
    fogColor: 0x351f10,
    fogDensity: 0.0028,
    skyColor: 0x3d2716,
    floorHeight: 0.0
  }
};

/**
 * THƯ VIỆN VẬT LIỆU PBR CHUẨN THREE.JS CHO CẢNH TIẾT THANH MINH (PHÂN CẢNH 1)
 */
export const ThanhMinhMaterials = {
  ground: new THREE.MeshLambertMaterial({
    color: 0x2b4c22,
    name: 'TM_Mat_Ground'
  }),
  bark: new THREE.MeshLambertMaterial({
    color: 0x3d2314,
    name: 'TM_Mat_Bark'
  }),
  pearBlossom: new THREE.MeshLambertMaterial({
    color: 0xf5e1e5,
    name: 'TM_Mat_PearBlossom'
  }),
  peachBlossom: new THREE.MeshLambertMaterial({
    color: 0xffb7c5,
    name: 'TM_Mat_PeachBlossom'
  }),
  leaf: new THREE.MeshLambertMaterial({
    color: 0x345c22,
    name: 'TM_Mat_Leaf'
  }),
  water: new THREE.MeshLambertMaterial({
    color: 0x114444,
    transparent: true,
    opacity: 0.88,
    depthWrite: false, // CHỐNG OVERDRAW: Tắt depthWrite cho vật liệu trong suốt
    name: 'TM_Mat_Water'
  }),
  stone: new THREE.MeshLambertMaterial({
    color: 0x5a6358,
    name: 'TM_Mat_Stone'
  }),
  woodRed: new THREE.MeshLambertMaterial({
    color: 0x5c1d18,
    name: 'TM_Mat_WoodRed'
  })
};

export function applyThanhMinhMaterials(model) {
  if (!model) return;
  model.traverse((child) => {
    if (!child.isMesh) return;
    child.userData.excludeFromCollision = true;
    child.userData.isThanhMinhScene = true;

    // BẬT FRUSTUM CULLING TOÀN DIỆN CHO MÔ HÌNH VÀ TÍNH TOÁN BOUNDING SPHERE
    child.frustumCulled = true;
    if (child.geometry && !child.geometry.boundingSphere) {
      child.geometry.computeBoundingSphere();
    }

    const meshName = (child.name || '').toLowerCase();
    const origMat = child.material;
    const matName = (origMat && origMat.name ? origMat.name : '').toLowerCase();

    // GIẢM TẢI ĐỒ HỌA: Tắt castShadow/receiveShadow cho mọi vật thể phức tạp, chỉ giữ receiveShadow cho mặt đất
    const isGround = meshName.includes('ground') || meshName.includes('diahinh') || matName.includes('datco');
    child.castShadow = false;
    child.receiveShadow = isGround;

    if (
      matName.includes('datco') ||
      meshName.includes('diahinh') ||
      meshName.includes('ground') ||
      meshName.includes('tomb')
    ) {
      child.material = ThanhMinhMaterials.ground;
    } else if (
      matName.includes('vocay') ||
      meshName.includes('trunk') ||
      meshName.includes('branch') ||
      meshName.includes('root') ||
      meshName.includes('plank')
    ) {
      child.material = ThanhMinhMaterials.bark;
    } else if (matName.includes('hoale')) {
      child.material = ThanhMinhMaterials.pearBlossom;
    } else if (matName.includes('hoadao')) {
      child.material = ThanhMinhMaterials.peachBlossom;
    } else if (matName.includes('laxanh')) {
      child.material = ThanhMinhMaterials.leaf;
    } else if (
      matName.includes('nuoc') ||
      meshName.includes('nuoc') ||
      meshName.includes('water')
    ) {
      child.material = ThanhMinhMaterials.water;
    } else if (
      matName.includes('daco') ||
      meshName.includes('rock') ||
      meshName.includes('stone') ||
      meshName.includes('stele')
    ) {
      child.material = ThanhMinhMaterials.stone;
    } else if (
      matName.includes('gosondo') ||
      meshName.includes('post') ||
      meshName.includes('rail')
    ) {
      child.material = ThanhMinhMaterials.woodRed;
    } else {
      const geoType = child.geometry ? child.geometry.type : '';
      if (geoType.includes('Plane') && child.position.y <= 0) {
        child.material = ThanhMinhMaterials.water;
      } else if (child.position.y > 1.2 && geoType.includes('Sphere')) {
        child.material = Math.random() < 0.6 ? ThanhMinhMaterials.pearBlossom : ThanhMinhMaterials.peachBlossom;
      } else if (geoType.includes('Cylinder') || geoType.includes('Cone')) {
        child.material = ThanhMinhMaterials.bark;
      } else {
        child.material = ThanhMinhMaterials.ground;
      }
    }
    if (child.material) child.material.needsUpdate = true;
  });
}

function createPoeticSignboard(title, poemLine1, poemLine2, subTitle = '— Thế Giới Trong Truyện Kiều • Nguyễn Du —') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(22, 12, 8, 0.90)';
  ctx.fillRect(8, 8, 496, 240);
  ctx.strokeStyle = '#dfb746';
  ctx.lineWidth = 5;
  ctx.strokeRect(12, 12, 488, 232);

  ctx.fillStyle = '#ffd97d';
  ctx.font = 'bold 22px "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 256, 65);

  ctx.fillStyle = '#fff5e4';
  ctx.font = 'italic 17px "Georgia", serif';
  ctx.fillText(`"${poemLine1}"`, 256, 128);
  ctx.fillText(`"${poemLine2}"`, 256, 163);

  ctx.fillStyle = '#c99738';
  ctx.font = '12px sans-serif';
  ctx.fillText(subTitle, 256, 212);

  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 2.1),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide })
  );
  mesh.userData.excludeFromCollision = true;
  return mesh;
}

function createPortalWaypoint(targetZoneId, title, subText) {
  const group = new THREE.Group();
  group.name = `Portal_To_Zone_${targetZoneId}`;

  const baseMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.4, 0.35, 8),
    new THREE.MeshLambertMaterial({ color: 0x3d3830 })
  );
  baseMesh.position.y = 0.17;
  baseMesh.userData.excludeFromCollision = true;
  group.add(baseMesh);

  const steleGeo = new THREE.BoxGeometry(1.1, 2.2, 0.18);
  const steleMat = new THREE.MeshLambertMaterial({
    color: 0x484236
  });
  const steleMesh = new THREE.Mesh(steleGeo, steleMat);
  steleMesh.position.y = 1.35;
  steleMesh.userData.excludeFromCollision = true;
  group.add(steleMesh);

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#181410';
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = '#e6b84c';
  ctx.lineWidth = 8;
  ctx.strokeRect(16, 16, 480, 480);
  ctx.fillStyle = '#ffd770';
  ctx.font = 'bold 36px serif';
  ctx.textAlign = 'center';
  ctx.fillText('✨ CỔNG DỊCH CHUYỂN ✨', 256, 110);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 42px serif';
  ctx.fillText(title, 256, 230);
  ctx.fillStyle = '#9fd6b2';
  ctx.font = 'italic 28px sans-serif';
  ctx.fillText(subText, 256, 330);
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('[CLICK CHUỘT ĐỂ ĐẾN]', 256, 420);

  const signTex = new THREE.CanvasTexture(canvas);
  signTex.generateMipmaps = false;
  signTex.minFilter = THREE.LinearFilter;
  const signMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 1.8),
    new THREE.MeshBasicMaterial({ map: signTex })
  );
  signMesh.position.set(0, 1.35, 0.10);
  signMesh.userData.excludeFromCollision = true;
  group.add(signMesh);

  const runeCanvas = document.createElement('canvas');
  runeCanvas.width = 256;
  runeCanvas.height = 256;
  const rctx = runeCanvas.getContext('2d');
  rctx.strokeStyle = 'rgba(255, 215, 100, 0.85)';
  rctx.lineWidth = 6;
  rctx.beginPath();
  rctx.arc(128, 128, 115, 0, Math.PI * 2);
  rctx.stroke();
  rctx.beginPath();
  rctx.arc(128, 128, 85, 0, Math.PI * 2);
  rctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    rctx.moveTo(128 + Math.cos(a) * 85, 128 + Math.sin(a) * 85);
    rctx.lineTo(128 + Math.cos(a) * 115, 128 + Math.sin(a) * 115);
  }
  rctx.stroke();

  const runeTex = new THREE.CanvasTexture(runeCanvas);
  runeTex.generateMipmaps = false;
  runeTex.minFilter = THREE.LinearFilter;
  const runeMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 2.6),
    new THREE.MeshBasicMaterial({ map: runeTex, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide })
  );
  runeMesh.rotation.x = -Math.PI / 2;
  runeMesh.position.y = 0.36;
  runeMesh.userData.excludeFromCollision = true;
  group.add(runeMesh);

  const light = new THREE.PointLight(0xffdf80, 2.0, 6.0);
  light.position.set(0, 1.5, 0.5);
  light.castShadow = false; // GPU SAVER: PointLight shadow = 6 render passes
  group.add(light);

  group.userData.isRealmPortal = true;
  group.userData.targetZoneId = targetZoneId;
  group.userData.excludeFromCollision = true;
  return group;
}

function createReturnMuseumPortalStele() {
  const group = new THREE.Group();
  group.name = 'Return_Museum_Portal_Stele';

  // 1. Chân đế đá cẩm thạch đen viền đồng
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 1.05, 0.45, 16),
    new THREE.MeshLambertMaterial({ color: 0x1a1a1a })
  );
  base.position.y = 0.22;
  base.userData.excludeFromCollision = true;
  group.add(base);

  // 2. Vành gương cổ bằng đồng vàng
  const mirrorRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.75, 0.08, 16, 32),
    new THREE.MeshLambertMaterial({ color: 0xd4af37 })
  );
  mirrorRim.position.y = 1.45;
  mirrorRim.userData.excludeFromCollision = true;
  group.add(mirrorRim);

  // 3. Mặt gương không gian xoáy lam ngọc (Swirling Cyan Portal Vortex)
  const mirrorGeo = new THREE.CircleGeometry(0.72, 32);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0a191e';
  ctx.fillRect(0, 0, 512, 512);

  const grad = ctx.createRadialGradient(256, 256, 10, 256, 256, 240);
  grad.addColorStop(0, '#7df9ff');
  grad.addColorStop(0.35, '#1b6ca8');
  grad.addColorStop(0.75, '#0b2b3f');
  grad.addColorStop(1, '#051119');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(256, 256, 240, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#e6b84c';
  ctx.lineWidth = 10;
  ctx.stroke();

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 34px serif';
  ctx.textAlign = 'center';
  ctx.fillText('🏛️ CỔNG QUY HỒI 🏛️', 256, 150);

  ctx.fillStyle = '#ffd770';
  ctx.font = 'bold 44px serif';
  ctx.fillText('BẢO TÀNG VĂN HỌC', 256, 230);

  ctx.fillStyle = '#b0e0e6';
  ctx.font = 'italic 26px sans-serif';
  ctx.fillText('Trở về Phòng 01 Nguyễn Du', 256, 310);

  ctx.fillStyle = '#5effa5';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('[CLICK ĐỂ QUAY VỀ]', 256, 400);

  const mirrorTex = new THREE.CanvasTexture(canvas);
  mirrorTex.generateMipmaps = false;
  mirrorTex.minFilter = THREE.LinearFilter;
  const mirrorMesh = new THREE.Mesh(
    mirrorGeo,
    new THREE.MeshLambertMaterial({
      map: mirrorTex,
      emissive: new THREE.Color(0x1b6ca8),
      emissiveIntensity: 0.65,
      side: THREE.DoubleSide
    })
  );
  mirrorMesh.position.y = 1.45;
  mirrorMesh.userData.isReturnPortal = true;
  mirrorMesh.userData.excludeFromCollision = true;
  group.add(mirrorMesh);

  // 4. Vòng phù điêu ma trận sàn
  const runeCanvas = document.createElement('canvas');
  runeCanvas.width = 256;
  runeCanvas.height = 256;
  const rctx = runeCanvas.getContext('2d');
  rctx.strokeStyle = 'rgba(100, 230, 255, 0.85)';
  rctx.lineWidth = 6;
  rctx.beginPath();
  rctx.arc(128, 128, 110, 0, Math.PI * 2);
  rctx.stroke();
  rctx.beginPath();
  rctx.arc(128, 128, 80, 0, Math.PI * 2);
  rctx.stroke();
  const runeMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 2.4),
    new THREE.MeshBasicMaterial({
      map: new THREE.CanvasTexture(runeCanvas),
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  runeMesh.rotation.x = -Math.PI / 2;
  runeMesh.position.y = 0.46;
  runeMesh.userData.excludeFromCollision = true;
  group.add(runeMesh);

  // 5. Nguồn sáng lung linh
  const light = new THREE.PointLight(0x7df9ff, 2.5, 7.0);
  light.position.set(0, 1.6, 0.4);
  light.castShadow = false; // GPU SAVER: PointLight shadow = 6 render passes
  group.add(light);

  group.userData.isReturnPortal = true;
  group.userData.excludeFromCollision = true;

  group.traverse((c) => {
    c.userData.isReturnPortal = true;
    c.userData.excludeFromCollision = true;
  });

  return group;
}

export class TruyenKieuStoryWorld {
  constructor(scene, camera, cameraController, atriumGroup = null, options = {}) {
    // KIẾN TRÚC ĐA VŨ TRỤ (MULTI-SCENE ARCHITECTURE):
    // Tách biệt hoàn toàn Thế giới Truyện Kiều sang Scene riêng biệt để giải phóng VRAM (GTX 1050 2GB)
    this.truyenKieuScene = options.truyenKieuScene || (scene?.name === 'TruyenKieu_Universe' ? scene : new THREE.Scene());
    this.truyenKieuScene.name = 'TruyenKieu_Universe';
    this.scene = this.truyenKieuScene; // Scene nội bộ của TruyenKieuStoryWorld
    this.mainScene = options.mainScene || null;
    this.app = options.app || null;

    this.camera = camera;
    this.cameraManager = cameraController?.controls ? cameraController : (cameraController?.cameraManager || null);
    this.cameraController = cameraController?.cameraController || cameraController;
    this.renderer = options.renderer || this.cameraController?.renderer || null;
    this.atriumGroup = atriumGroup || scene?.getObjectByName?.('Museum_Atrium_Root') || null;

    // Phân cảnh hiện tại (Mặc định: 1 - Vườn Thúy & Thanh Minh)
    this.currentZoneId = 1;
    this.isInsideWorld = false;
    this.isWarping = false; // Khóa chống spam click / phím trong khi hiệu ứng bay đang diễn ra

    // 1. ROOT WORLD GROUP ĐẶT TẠI TỌA ĐỘ GỐC (0, 0, 0) CỦA TRUYENKIEUSCENE
    this.worldGroup = new THREE.Group();
    this.worldGroup.name = 'TruyenKieu_Three_Realms';
    this.worldGroup.position.copy(KIEU_WORLD_ORIGIN);
    this.worldGroup.visible = true; // Luôn visible bên trong truyenKieuScene, việc ẩn hiện do renderer.render(activeScene) quản lý!

    this.savedPos = new THREE.Vector3(-44.5, 11.8, 19.0);
    this.savedTarget = new THREE.Vector3(-48.0, 11.2, 19.0);
    this.savedFog = null;
    this.savedBackground = null;
    this.savedExposure = 1.0;

    // 3 Nhóm không gian
    this.zone1Group = new THREE.Group();
    this.zone1Group.name = 'Zone1_VuonThuy_ThanhMinh';
    this.zone1Group.position.copy(REALM_ZONES.ZONE_1.offset);

    this.zone2Group = new THREE.Group();
    this.zone2Group.name = 'Zone2_LauNgungBich';
    this.zone2Group.position.copy(REALM_ZONES.ZONE_2.offset);

    this.zone3Group = new THREE.Group();
    this.zone3Group.name = 'Zone3_DoanhTraiTuHai';
    this.zone3Group.position.copy(REALM_ZONES.ZONE_3.offset);

    this.zoneInteractables = { 1: [], 2: [], 3: [] };
    this.worldGroup.add(this.zone1Group, this.zone2Group, this.zone3Group);

    // Cài đặt Fog & Background mặc định cho truyenKieuScene
    const z1 = REALM_ZONES.ZONE_1;
    this.truyenKieuScene.fog = new THREE.FogExp2(z1.fogColor, z1.fogDensity);
    this.truyenKieuScene.background = new THREE.Color(z1.skyColor);

    this.initGlobalSkyAndWater();
    this.initZone1VuonThuy();
    this.initZone2LauNgungBich();
    this.initZone3DoanhTraiTuHai();

    // Cô lập ban đầu: chỉ bật Zone 1 (ẩn Zone 2 & Zone 3 để giảm ánh sáng + draw calls)
    this.zone1Group.visible = true;
    this.zone2Group.visible = false;
    this.zone3Group.visible = false;
    if (this.zone1Lights) this.zone1Lights.visible = true;
    if (this.zone2Lights) this.zone2Lights.visible = false;
    if (this.zone3Lights) this.zone3Lights.visible = false;
    this.initFloatingRealmNavigatorHUD();
    this.createWarpOverlayUI();
    this.initSpatialSoundSynth();
    this.bindControlsAndEvents();
    this.initTruyenKieuHitboxes();

    // TỐI ƯU HÓA HIỂN THỊ, FRUSTUM CULLING & SHADOW CHO THẾ GIỚI KIỀU
    let meshCount = 0;
    this.worldGroup.traverse((c) => {
      c.userData.excludeFromCollision = true;
      
      if (c.isMesh) {
        c.frustumCulled = true;
        if (c.geometry && !c.geometry.boundingSphere) {
          c.geometry.computeBoundingSphere();
        }

        // TẮT ĐỔ BÓNG ĐỘNG CHO CÁC VẬT THỂ PHỨC TẠP, CHỈ GIỮ RECEIVESHADOW CHO MẶT ĐẤT CHÍNH
        const meshName = (c.name || '').toLowerCase();
        const isMainGround = meshName.includes('ground') || meshName.includes('diahinh') ||
          meshName.includes('terrain') || meshName.includes('sand');
        c.castShadow = false;
        c.receiveShadow = isMainGround;
        meshCount++;
      }
      
      // Ép FrontSide cho khối kiến trúc đặc, chỉ giữ DoubleSide cho lá, cờ, mặt nước, biển hiệu
      if (c.isMesh && c.material) {
        const meshName = (c.name || '').toLowerCase();
        const isThinSurface = meshName.includes('flag') || meshName.includes('banner') ||
          meshName.includes('sail') || meshName.includes('sign') || meshName.includes('scroll') ||
          meshName.includes('rune') || meshName.includes('portal') || meshName.includes('mirror') ||
          meshName.includes('canvas') || meshName.includes('leaf') || meshName.includes('petal');
        
        const mats = Array.isArray(c.material) ? c.material : [c.material];
        mats.forEach(mat => {
          if (mat && !isThinSurface && !mat.transparent && !(mat.alphaTest > 0) && mat.side === THREE.DoubleSide) {
            mat.side = THREE.FrontSide;
            mat.needsUpdate = true;
          }
        });
      }
    });
    console.log(`%c[MULTI-SCENE TRUYEN KIEU] Đã khởi tạo và tối ưu frustumCulled & shadow cho ${meshCount} meshes trong truyenKieuScene!`, "color: #39e58c; font-weight: bold;");
    this.truyenKieuScene.add(this.worldGroup);
  }

  /**
   * ĐĂNG KÝ HỘP VA CHẠM THỰC TẾ (SPATIAL COLLISION GRID O(1)) CHO THẾ GIỚI TRUYỆN KIỀU
   * Tọa độ gốc (0, 0, 0) bên trong truyenKieuScene độc lập
   */
  initTruyenKieuHitboxes() {
    const hitboxes = [
      // ZONE 1: VƯỜN THÚY & LỄ THANH MINH (Origin: 0, 0, 0)
      { name: 'Mộ Đạm Tiên cổ kính', isWorld: true, box: new THREE.Box3(new THREE.Vector3(5.2, -0.5, -6.2), new THREE.Vector3(7.8, 3.0, -3.8)) },
      { name: 'Cầu gỗ qua suối (Bao quát)', isWorld: true, box: new THREE.Box3(new THREE.Vector3(-4.0, -0.2, -1.5), new THREE.Vector3(5.0, 2.2, 1.5)) },
      { name: 'Cổ thụ Hoa Lê Tây-Bắc Z1', isWorld: true, box: new THREE.Box3(new THREE.Vector3(-10.5, -0.5, -9.0), new THREE.Vector3(-8.5, 10.0, -7.0)) },
      { name: 'Cổ thụ Hoa Đào Tây-Nam Z1', isWorld: true, box: new THREE.Box3(new THREE.Vector3(-12.0, -0.5, 8.0), new THREE.Vector3(-10.0, 10.0, 10.0)) },
      { name: 'Cổ thụ Hoa Đào Đông-Bắc Z1', isWorld: true, box: new THREE.Box3(new THREE.Vector3(9.5, -0.5, -11.0), new THREE.Vector3(11.5, 10.0, -9.0)) },
      { name: 'Cổ thụ Hoa Lê Đông-Nam Z1', isWorld: true, box: new THREE.Box3(new THREE.Vector3(11.0, -0.5, 6.5), new THREE.Vector3(13.0, 10.0, 8.5)) },
      { name: 'Cổ thụ Hoa Lê Tây Z1', isWorld: true, box: new THREE.Box3(new THREE.Vector3(-15.0, -0.5, -0.5), new THREE.Vector3(-13.0, 10.0, 1.5)) },
      { name: 'Bia đá thơ Thanh Minh', isWorld: true, box: new THREE.Box3(new THREE.Vector3(-4.2, -0.5, 2.2), new THREE.Vector3(-2.8, 3.5, 3.4)) },
      { name: 'Cổng quy hồi sảnh P01 (Z1)', isWorld: true, box: new THREE.Box3(new THREE.Vector3(5.4, -0.5, 7.4), new THREE.Vector3(6.6, 3.5, 8.6)) },
      { name: 'Trụ dịch chuyển sang Zone 2', isWorld: true, box: new THREE.Box3(new THREE.Vector3(-16.8, -0.5, -0.8), new THREE.Vector3(-15.2, 3.5, 0.8)) },
      { name: 'Trụ dịch chuyển sang Zone 3', isWorld: true, box: new THREE.Box3(new THREE.Vector3(15.2, -0.5, -0.8), new THREE.Vector3(16.8, 3.5, 0.8)) },

      // ZONE 2: LẦU NGƯNG BÍCH (Origin: -140, 0, 0)
      { name: 'Khối đình đài Vọng Lầu Ngưng Bích (Bao quát)', isWorld: true, box: new THREE.Box3(new THREE.Vector3(-144.5, 0.0, -4.5), new THREE.Vector3(-135.5, 12.0, 4.5)) },
      { name: 'Bia đá thơ Lầu Ngưng Bích', isWorld: true, box: new THREE.Box3(new THREE.Vector3(-147.2, 4.5, 1.4), new THREE.Vector3(-145.8, 7.5, 2.6)) },
      { name: 'Cổng quy hồi sảnh P01 (Z2)', isWorld: true, box: new THREE.Box3(new THREE.Vector3(-136.6, 4.5, 3.4), new THREE.Vector3(-135.4, 7.5, 4.6)) },

      // ZONE 3: DOANH TRẠI TỪ HẢI (Origin: 140, 0, 0)
      { name: 'Vách Soái trướng Từ Hải', isWorld: true, box: new THREE.Box3(new THREE.Vector3(133.5, 0.0, -12.5), new THREE.Vector3(146.5, 7.0, -4.5)) },
      { name: 'Hàng rào chông phòng thủ Bắc', isWorld: true, box: new THREE.Box3(new THREE.Vector3(122.0, 0.0, -23.0), new THREE.Vector3(158.0, 3.5, -19.0)) },
      { name: 'Hàng rào chông phòng thủ Đông', isWorld: true, box: new THREE.Box3(new THREE.Vector3(158.0, 0.0, -18.0), new THREE.Vector3(163.0, 3.5, 18.0)) },
      { name: 'Hàng rào chông phòng thủ Tây', isWorld: true, box: new THREE.Box3(new THREE.Vector3(117.0, 0.0, -18.0), new THREE.Vector3(122.0, 3.5, 18.0)) },
      { name: 'Đống lửa trại quân doanh', isWorld: true, box: new THREE.Box3(new THREE.Vector3(138.8, 0.0, 3.0), new THREE.Vector3(141.2, 3.0, 5.0)) },
      { name: 'Bia đá thơ Doanh Trại Từ Hải', isWorld: true, box: new THREE.Box3(new THREE.Vector3(133.0, 0.0, 6.0), new THREE.Vector3(134.6, 3.5, 7.4)) },
      { name: 'Cổng quy hồi sảnh P01 (Z3)', isWorld: true, box: new THREE.Box3(new THREE.Vector3(144.4, 0.0, 7.4), new THREE.Vector3(145.6, 3.5, 8.6)) }
    ];

    if (typeof window !== 'undefined' && window.__museumHitboxManager) {
      window.__museumHitboxManager.registerRealmHitboxes('truyen_kieu', hitboxes);
    }

    if (this.cameraController?.registerHitboxes) {
      this.cameraController.registerHitboxes(hitboxes);
    } else if (this.cameraController?.spatialGrid) {
      hitboxes.forEach(hb => {
        if (!hb.center) {
          hb.center = new THREE.Vector3();
          hb.box.getCenter(hb.center);
        }
        this.cameraController.customHitboxes = this.cameraController.customHitboxes || [];
        const exists = this.cameraController.customHitboxes.some(h => h.name === hb.name);
        if (!exists) this.cameraController.customHitboxes.push(hb);
        this.cameraController.spatialGrid.insert(hb);
      });
    }
  }

  // =========================================================================
  // 0. BẦU TRỜI & ĐẠI DƯƠNG BAO LA TRÊN CAO
  // =========================================================================
  initGlobalSkyAndWater() {
    const skyGeo = new THREE.SphereGeometry(260, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.52);
    const skyMat = new THREE.MeshBasicMaterial({
      color: 0x141e2e,
      side: THREE.BackSide,
      depthWrite: false
    });
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.skyDome.userData.excludeFromCollision = true;
    this.worldGroup.add(this.skyDome);

    const oceanGeo = new THREE.PlaneGeometry(360, 180, 32, 32);
    const oceanMat = new THREE.MeshLambertMaterial({
      color: 0x091c28,
      emissive: 0x030f18
    });
    this.oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    this.oceanMesh.rotation.x = -Math.PI / 2;
    this.oceanMesh.position.y = -0.25;
    this.oceanMesh.userData.excludeFromCollision = true;
    this.worldGroup.add(this.oceanMesh);

    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(7.0, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xfff2d6 })
    );
    moon.position.set(0, 48, -110);
    moon.userData.excludeFromCollision = true;
    this.worldGroup.add(moon);
  }

  // =========================================================================
  // 1. KHÔNG GIAN 1: VƯỜN THÚY & LỄ THANH MINH (SẮC XUÂN TƯƠI VUI, HOÀI NIỆM)
  // =========================================================================
  buildLowPolyThanhMinhLandscape() {
    const group = new THREE.Group();
    group.name = "Zone1_ThanhMinh_LowPoly_Landscape";

    // 1. ĐỊA HÌNH CỎ XANH RỢN CHÂN TRỜI (Low-poly Terrain ~300 vertices)
    const groundGeo = new THREE.PlaneGeometry(64, 64, 16, 16);
    groundGeo.rotateX(-Math.PI / 2);
    const pos = groundGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const riverDist = Math.abs(x - Math.sin(z * 0.15) * 4.0);
      let y = 0.0;
      if (riverDist < 3.5) {
        y = -0.75 + (riverDist / 3.5) * 0.45;
      } else {
        y = Math.sin(x * 0.18) * Math.cos(z * 0.15) * 0.65;
      }
      pos.setY(i, y);
    }
    groundGeo.computeVertexNormals();

    const groundMesh = new THREE.Mesh(groundGeo, ThanhMinhMaterials.ground);
    groundMesh.receiveShadow = false;
    group.add(groundMesh);

    // 2. MẶT NƯỚC SUỐI TRONG NGỌC BÍCH
    const riverGeo = new THREE.PlaneGeometry(8, 64, 1, 8);
    riverGeo.rotateX(-Math.PI / 2);
    const riverMesh = new THREE.Mesh(riverGeo, ThanhMinhMaterials.water);
    riverMesh.position.y = -0.32;
    riverMesh.receiveShadow = false;
    group.add(riverMesh);

    // 3. CẦU GỖ UỐN CONG BẮC NGANG SUỐI
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(0.5, 0.1, 0.0);
    const bridgeDeck = new THREE.Mesh(
      new THREE.BoxGeometry(9.0, 0.22, 2.6),
      ThanhMinhMaterials.woodRed
    );
    bridgeDeck.position.y = 0.45;
    bridgeDeck.castShadow = false;
    bridgeGroup.add(bridgeDeck);

    const railMat = ThanhMinhMaterials.woodRed;
    const leftRail = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.14, 0.14), railMat);
    leftRail.position.set(0, 1.15, -1.2);
    const rightRail = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.14, 0.14), railMat);
    rightRail.position.set(0, 1.15, 1.2);
    bridgeGroup.add(leftRail, rightRail);
    mergeGroupMeshesByMaterial(bridgeGroup);
    group.add(bridgeGroup);

    // 4. MỘ ĐẠM TIÊN CỔ KÍNH ("Sè sè nấm đất bên đường")
    const tombGroup = new THREE.Group();
    tombGroup.position.set(6.5, 0.25, -5.0);
    const mound = new THREE.Mesh(
      new THREE.SphereGeometry(1.6, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
      ThanhMinhMaterials.ground
    );
    mound.scale.set(1.4, 0.6, 1.4);
    const stele = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 1.2, 0.2),
      ThanhMinhMaterials.stone
    );
    stele.position.set(0, 0.6, 1.2);
    stele.castShadow = false;
    tombGroup.add(mound, stele);
    group.add(tombGroup);

    // 5. CÂY CỔ THỤ HOA LÊ & ĐÀO HỒNG (5 Cây cách điệu Low-poly - Merged theo vật liệu: 3 Draw Calls)
    const treePositions = [
      { x: -9.5, z: -8.0, mat: ThanhMinhMaterials.pearBlossom, s: 1.2 },
      { x: -11.0, z: 9.0, mat: ThanhMinhMaterials.peachBlossom, s: 1.1 },
      { x: 10.5, z: -10.0, mat: ThanhMinhMaterials.peachBlossom, s: 1.3 },
      { x: 12.0, z: 7.5, mat: ThanhMinhMaterials.pearBlossom, s: 1.15 },
      { x: -14.0, z: 0.5, mat: ThanhMinhMaterials.pearBlossom, s: 1.0 }
    ];

    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.65, 4.2, 8);
    const canopyGeo = new THREE.IcosahedronGeometry(2.4, 1);
    const treesGroup = new THREE.Group();

    treePositions.forEach((tp) => {
      const tree = new THREE.Group();
      tree.position.set(tp.x, 0, tp.z);
      tree.scale.setScalar(tp.s);

      const trunk = new THREE.Mesh(trunkGeo, ThanhMinhMaterials.bark);
      trunk.position.y = 2.1;
      trunk.castShadow = false;

      const canopy = new THREE.Mesh(canopyGeo, tp.mat);
      canopy.position.y = 4.5;
      canopy.scale.set(1.3, 0.9, 1.3);

      tree.add(trunk, canopy);
      treesGroup.add(tree);
    });
    mergeGroupMeshesByMaterial(treesGroup);
    group.add(treesGroup);

    // 6. ĐÁ CUỘI SUỐI (12 hòn đá low-poly) - OPTIMIZED: InstancedMesh (1 Draw Call thay vì 12)
    const rockGeo = new THREE.DodecahedronGeometry(0.55, 0);
    const rockMat = ThanhMinhMaterials.stone;
    const rockInstanced = new THREE.InstancedMesh(rockGeo, rockMat, 12);
    const dummyRock = new THREE.Object3D();
    for (let r = 0; r < 12; r++) {
      const rz = (r - 6) * 4.5;
      const rx = Math.sin(rz * 0.15) * 4.0 + (r % 2 === 0 ? 2.2 : -2.2);
      dummyRock.position.set(rx, -0.2, rz);
      dummyRock.updateMatrix();
      rockInstanced.setMatrixAt(r, dummyRock.matrix);
    }
    rockInstanced.instanceMatrix.needsUpdate = true;
    rockInstanced.computeBoundingSphere();
    rockInstanced.frustumCulled = true;
    group.add(rockInstanced);

    return group;
  }

  initZone1VuonThuy() {
    this.zone1Lights = new THREE.Group();
    const ambient1 = new THREE.AmbientLight(0xfff6ec, 1.8);
    const sun1 = new THREE.DirectionalLight(0xffecd0, 2.6);
    sun1.position.set(18, 35, 14);
    sun1.castShadow = false;
    sun1.shadow.mapSize.width = 1024;
    sun1.shadow.mapSize.height = 1024;
    sun1.shadow.bias = -0.0005;
    this.sun1 = sun1;

    const fill1 = new THREE.DirectionalLight(0xb0d8ff, 1.2);
    fill1.position.set(-16, 25, -14);
    fill1.castShadow = false; // Chỉ sun1 được phép castShadow

    const bridgeLight = new THREE.PointLight(0xffd580, 2.5, 18);
    bridgeLight.position.set(0.5, 3.2, 0.0);
    bridgeLight.castShadow = false; // GPU SAVER: PointLight shadow = 6 render passes

    const tombLight = new THREE.PointLight(0xd0e8ff, 2.8, 18);
    tombLight.position.set(5.2, 2.5, -4.5);
    tombLight.castShadow = false; // GPU SAVER: PointLight shadow = 6 render passes

    this.zone1Lights.add(ambient1, sun1, fill1, bridgeLight, tombLight);
    this.zone1Group.add(this.zone1Lights);

    // LỆNH KHẨN CẤP: VÔ HIỆU HÓA LOAD FILE GLB NẶNG NỀ GÂY TREO TRÌNH DUYỆT
    // THAY THẾ BẰNG MÔ HÌNH LOW-POLY THIÊN NHIÊN SIÊU NHẸ (400 VERTICES) TUYỆT ĐỐI MƯỢT MÀ
    const lowPolyLandscape = this.buildLowPolyThanhMinhLandscape();
    this.zone1Group.add(lowPolyLandscape);

    const sign1 = createPoeticSignboard(
      'I. VƯỜN THÚY & LỄ THANH MINH',
      'Cỏ non xanh tận chân trời',
      'Cành lê trắng điểm một vài bông hoa'
    );
    sign1.position.set(-3.5, 2.4, 2.8);
    sign1.rotation.y = 0.35;
    this.zone1Group.add(sign1);

    const portalToZone2 = createPortalWaypoint(2, 'LẦU NGƯNG BÍCH', 'Cửa bể chiều hôm • Cát vàng sóng vỗ');
    portalToZone2.position.set(-16.0, 0.0, 0.0);
    portalToZone2.rotation.y = Math.PI / 2;
    this.zone1Group.add(portalToZone2);

    const portalToZone3 = createPortalWaypoint(3, 'DOANH TRẠI TỪ HẢI', 'Trướng hùm uy nghiêm • Lửa trại cờ xí');
    portalToZone3.position.set(16.0, 0.0, 0.0);
    portalToZone3.rotation.y = -Math.PI / 2;
    this.zone1Group.add(portalToZone3);

    // Cổng quy hồi trở về sảnh bảo tàng tại Zone 1
    const returnPortalZone1 = createReturnMuseumPortalStele();
    returnPortalZone1.position.set(6.0, 0.0, 8.0);
    returnPortalZone1.rotation.y = -Math.PI / 4;
    this.zone1Group.add(returnPortalZone1);
    this.zoneInteractables[1].push(portalToZone2, portalToZone3, returnPortalZone1);

    const pCount = 90; // PERFORMANCE: Giảm 50% số hạt hoa rơi (180 -> 90)
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 55;
      pPos[i * 3 + 1] = Math.random() * 12 + 0.5;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 55;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    this.particlesZone1 = new THREE.Points(
      pGeo,
      new THREE.PointsMaterial({
        color: 0xffeef5,
        size: 0.16,
        transparent: true,
        opacity: 0.90,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.zone1Group.add(this.particlesZone1);

    const sCount = 10; // PERFORMANCE: Giảm 50% hạt khói (20 -> 10)
    const sGeo = new THREE.BufferGeometry();
    const sPos = new Float32Array(sCount * 3);
    this.smokeData = [];
    for (let i = 0; i < sCount; i++) {
      const y = 0.5 + Math.random() * 2.8;
      sPos[i * 3] = 5.2 + (Math.random() - 0.5) * 0.15;
      sPos[i * 3 + 1] = y;
      sPos[i * 3 + 2] = -4.5 + (Math.random() - 0.5) * 0.15;
      this.smokeData.push({ y, speed: 0.28 + Math.random() * 0.2, phase: Math.random() * Math.PI * 2 });
    }
    sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    this.smokeZone1 = new THREE.Points(
      sGeo,
      new THREE.PointsMaterial({ color: 0xd6c4b2, size: 0.22, transparent: true, opacity: 0.5, depthWrite: false })
    );
    this.zone1Group.add(this.smokeZone1);

    // BỔ SUNG 4 BẢNG THÔNG TIN HOLOGRAM KHỔNG LỒ (1536x900) TRÊN ĐÀI QUAN SÁT VƯỜN THÚY
    this.initZone1HologramOverlook();
  }

  // =========================================================================
  // 2. KHÔNG GIAN 2: LẦU NGƯNG BÍCH (CÔ ĐỘC, TIÊU ĐIỀU, SÓNG GIÓ CỬA BỂ)
  // =========================================================================

  initZone1HologramOverlook() {
    const overlookGroup = new THREE.Group();
    overlookGroup.name = "Zone1_Hologram_Observation_Overlook";
    overlookGroup.position.set(0, 0.05, 5.5);
    this.zone1Group.add(overlookGroup);

    // Bục đài quan sát bằng đá cẩm thạch tím thẫm
    const platMat = new THREE.MeshBasicMaterial({ color: 0x1e1525, fog: false });
    const platDisc = new THREE.Mesh(new THREE.CylinderGeometry(7.2, 8.4, 0.4, 16), platMat);
    platDisc.position.y = -0.2;
    overlookGroup.add(platDisc);

    // Vành neon viền đài quan sát hồng đào
    const platBorder = new THREE.Mesh(
      new THREE.TorusGeometry(7.25, 0.08, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xf472b6, fog: false })
    );
    platBorder.rotation.x = Math.PI / 2;
    platBorder.position.y = 0.02;
    overlookGroup.add(platBorder);

    // 4 BẢNG THÔNG TIN HOLOGRAM ĐIỆN TỬ KHỔNG LỒ (1536 x 900 pixels)
    const titles = [
      'ĐẠI THI HÀO NGUYỄN DU & THỜI ĐẠI SÁNG TÁC',
      'BI KỊCH TÀI MỆNH TƯƠNG ĐỐ & BÁN MÌNH CỨU CHA',
      'MƯỜI NĂM LƯU LẠC & KHÁT VỌNG TỰ DO CÙNG TỪ HẢI',
      'ĐOÀN VIÊN TÁI HỢP & GIÁ TRỊ NHÂN ĐẠO BẤT HỦ'
    ];

    const screenLines = [
      [
        'TÊN TÁC PHẨM: ĐOẠN TRƯỜNG TÂN THANH (TRUYỆN KIỀU)',
        'TÁC GIẢ: Đại thi hào Nguyễn Du (1765 – 1820) • Danh nhân Văn hóa Thế giới',
        'THỂ LOẠI: Truyện thơ Nôm Lục bát (Gồm 3.254 câu thơ lục bát mẫu mực)',
        'NGUỒN GỐC: Tiếp thu cốt truyện "Kim Vân Kiều truyện" của Thanh Tâm Tài Nhân',
        'SÁNG TẠO ĐỘT PHÁ: Việt hóa toàn diện, nâng tầm tư tưởng nhân đạo và triết lý tài mệnh',
        'ĐỈNH CAO NGÔN NGỮ: Mẫu mực tuyệt đỉnh của thi ca cổ điển và tiếng Việt trung đại'
      ],
      [
        'TÀI SẮC VẸN TOÀN: Thúy Kiều mang vẻ đẹp "Hoa ghen thua thắm, liễu hờn kém xanh"',
        'MỐI TÌNH KIM - KIỀU: Lời thề đính ước dưới trăng thanh "Vầng trăng vằng vặc giữa trời"',
        'GIA BIẾN KINH HOÀNG: Bị thằng bán tơ vu oan, cha và em trai bị bắt giam khảo đả',
        'HIẾU NGHĨA VẸN TOÀN: Dứt tình duyên trao lại cho em gái Thúy Vân để bán mình chuộc cha',
        'BƯỚC VÀO TRẦN AI: Bị lừa gạt bởi Mã Giám Sinh và Tú Bà, đày đọa chốn lầu xanh',
        'KHÚC CA BI TRÁNG: Tiếng đàn bạc mệnh ngân vang số phận người phụ nữ thời phong kiến'
      ],
      [
        'LẦU NGƯNG BÍCH: Nỗi buồn cô đơn khóa xuân, hoài niệm quê hương và cha mẹ già',
        'BẪY RẬP TRẦN GIAN: Trải qua bàn tay Hoạn Thư, Thúc Sinh, Sở Khanh, Bạc Bà',
        'TRI KỶ TỪ HẢI: "Râu hùm, hàm én, mày ngài / Vai năm tấc rộng, thân mười thước cao"',
        'ANH HÙNG XUẤT THẾ: Từ Hải chuộc Kiều, giúp nàng lập đàn ân oán phân minh',
        'MẮC LỪA HỒ TÔN HIẾN: Khuyên hàng bất thành, Từ Hải chết đứng giữa bãi chiến trường',
        'TRẦM MÌNH TIỀN ĐƯỜNG: Tuyệt vọng gieo mình xuống dòng sông định mệnh Tiền Đường'
      ],
      [
        'CỨU VỚT TÂM LINH: Sư Giác Duyên lập bè cứu sống Kiều sau mười lăm năm chìm nổi',
        'CHÂU VỀ HỢP PHỐ: Kim Trọng đỗ đạt, không nguôi thương nhớ tìm lại người xưa',
        'ĐOÀN TỤ GIA ĐÌNH: Đêm đoàn viên thấu hiểu, "Đổi duyên cầm sắt đổi ra duyên bạn bầy"',
        'GIÁ TRỊ HIỆN THỰC: Tố cáo xã hội phong kiến đồng tiền đen tối chà đạp con người',
        'GIÁ TRỊ NHÂN ĐẠO: Đề cao tự do luyến ái, phẩm giá con người và quyền mưu cầu hạnh phúc',
        'SỐNG MÃI MUÔN ĐỜI: "Truyện Kiều còn, tiếng ta còn; tiếng ta còn, nước ta còn"'
      ]
    ];

    const screenAngles = [-1.08, -0.58, 0.58, 1.08];
    const screenRadius = 18.5;

    for (let sIdx = 0; sIdx < 4; sIdx++) {
      const angle = screenAngles[sIdx];
      let cv = null;
      if (typeof document !== 'undefined') {
        cv = document.createElement('canvas');
        cv.width = 768;
        cv.height = 450;
        const ctx = cv.getContext('2d');
        const w = 1536, h = 900;
        if (ctx) {
          ctx.save();
          ctx.scale(0.5, 0.5);

          const bgG = ctx.createLinearGradient(0, 0, w, h);
          bgG.addColorStop(0.0, 'rgba(28, 12, 38, 0.95)');
          bgG.addColorStop(0.5, 'rgba(42, 16, 52, 0.92)');
          bgG.addColorStop(1.0, 'rgba(20, 8, 28, 0.97)');
          ctx.fillStyle = bgG;
          ctx.fillRect(0, 0, w, h);

          ctx.strokeStyle = '#f472b6';
          ctx.lineWidth = 7;
          ctx.strokeRect(16, 16, w - 32, h - 32);

          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 10;
          const corner = 60;
          ctx.beginPath(); ctx.moveTo(16, 16 + corner); ctx.lineTo(16, 16); ctx.lineTo(16 + corner, 16); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(w - 16 - corner, 16); ctx.lineTo(w - 16, 16); ctx.lineTo(w - 16, 16 + corner); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(16, h - 16 - corner); ctx.lineTo(16, h - 16); ctx.lineTo(16 + corner, h - 16); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(w - 16 - corner, h - 16); ctx.lineTo(w - 16, h - 16); ctx.lineTo(w - 16, h - 16 - corner); ctx.stroke();

          ctx.strokeStyle = 'rgba(244, 114, 182, 0.65)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(120, 115);
          ctx.lineTo(w - 120, 115);
          ctx.stroke();

          ctx.fillStyle = '#fde047';
          ctx.font = 'bold 44px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(`❖ BẢNG 0${sIdx + 1}: ${titles[sIdx]} ❖`, w / 2, 45);

          ctx.textAlign = 'left';
          const lines = screenLines[sIdx];
          const startY = 175;
          const lineSpacing = 102;

          lines.forEach((line, i) => {
            const parts = line.split(':');
            const label = parts[0] + ':';
            const desc = parts.slice(1).join(':');

            ctx.fillStyle = '#f472b6';
            ctx.beginPath();
            ctx.arc(80, startY + i * lineSpacing + 16, 7, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#fde047';
            ctx.font = 'bold 30px "Segoe UI", sans-serif';
            ctx.fillText(label, 110, startY + i * lineSpacing);

            const labelW = ctx.measureText(label).width;
            ctx.fillStyle = '#f1f5f9';
            ctx.font = '28px "Segoe UI", sans-serif';
            ctx.fillText(desc, 110 + labelW + 14, startY + i * lineSpacing);
          });
          ctx.restore();
        }
      }

      const tex = cv ? new THREE.CanvasTexture(cv) : null;
      if (tex) {
        tex.generateMipmaps = false;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
      }
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        color: tex ? 0xffffff : 0x221133,
        transparent: true,
        opacity: 0.94,
        side: THREE.DoubleSide,
        depthWrite: false,
        fog: false
      });

      const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(11.2, 6.5), mat);
      const frameGeo = new THREE.BoxGeometry(11.32, 6.62, 0.08);
      const frameMat = new THREE.MeshBasicMaterial({ color: 0xf472b6, wireframe: true, fog: false });
      screenMesh.add(new THREE.Mesh(frameGeo, frameMat));

      screenMesh.position.set(Math.sin(angle) * screenRadius, 3.8, -Math.cos(angle) * screenRadius);
      screenMesh.lookAt(0, 3.5, 0);
      overlookGroup.add(screenMesh);
    }

    // =========================================================================
    // BỘ 3 TƯỢNG NHÂN VẬT TRUYỆN KIỀU TRONG VƯỜN THÚY: KIM TRỌNG, THÚY KIỀU & THÚY VÂN
    // =========================================================================
    const goldMat = new THREE.MeshPhongMaterial({ color: 0xfbbf24, emissive: 0x452804, shininess: 90 });

    const createPedestal = (name, poem1, poem2, colorHex) => {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.6, 16), goldMat);
      g.add(base);

      if (typeof document !== 'undefined') {
        const cv = document.createElement('canvas');
        cv.width = 512;
        cv.height = 170;
        const ctx = cv.getContext('2d');
        ctx.fillStyle = 'rgba(20, 8, 30, 0.94)';
        ctx.fillRect(0, 0, 512, 170);
        ctx.strokeStyle = colorHex;
        ctx.lineWidth = 4;
        ctx.strokeRect(6, 6, 500, 158);
        ctx.fillStyle = colorHex;
        ctx.font = 'bold 22px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(name, 256, 40);
        ctx.fillStyle = '#f1f5f9';
        ctx.font = 'italic 16px "Segoe UI", sans-serif';
        ctx.fillText(`"${poem1}"`, 256, 85);
        ctx.fillText(`"${poem2}"`, 256, 122);

        const plateTex = new THREE.CanvasTexture(cv);
        const plate = new THREE.Mesh(
          new THREE.PlaneGeometry(2.4, 0.8),
          new THREE.MeshBasicMaterial({ map: plateTex, transparent: true, side: THREE.DoubleSide, fog: false })
        );
        plate.position.set(0, 0.95, 1.15);
        plate.rotation.x = -0.22;
        g.add(plate);
      }
      return g;
    };

    // 1. Tượng Kim Trọng (bên trái đài quan sát)
    const kimPed = createPedestal('CHÀNG KIM TRỌNG', 'Văn chương nết đất, thông minh tính trời', 'Phong tư tài mạo tót vời, vào trong phong nhã', '#38bdf8');
    kimPed.position.set(-6.5, 0.0, -1.0);
    overlookGroup.add(kimPed);

    // 2. Tượng Nàng Thúy Kiều (bên phải đài quan sát)
    const kieuPed = createPedestal('NÀNG THÚY KIỀU', 'Làn thu thủy nét xuân sơn', 'Hoa ghen thua thắm liễu hờn kém xanh', '#f472b6');
    kieuPed.position.set(4.0, 0.0, -1.0);
    overlookGroup.add(kieuPed);

    // 3. Tượng Nàng Thúy Vân (kế bên Thúy Kiều)
    const vanPed = createPedestal('NÀNG THÚY VÂN', 'Vân xem trang trọng khác vời', 'Khuôn trăng đầy đặn nét ngài nở nang', '#fde047');
    vanPed.position.set(8.5, 0.0, -1.0);
    overlookGroup.add(vanPed);

    loadGlbCached(['/model/kimtrongthuykieu.glb'], {
      maxTextureSize: 1024,
      disableMipmaps: true,
      prepareOptions: {
        targetSpan: 2.85,
        fitAxis: 'y',
        groundY: true,
        centerXZ: true
      }
    })
      .then((wrapped) => {
        if (!wrapped) return;
        wrapped.position.y = 0.32;
        kimPed.add(wrapped);
      })
      .catch(() => {});

    loadGlbCached(['/model/thuykieu.glb'], {
      maxTextureSize: 1024,
      disableMipmaps: true,
      prepareOptions: {
        targetSpan: 2.85,
        fitAxis: 'y',
        groundY: true,
        centerXZ: true
      }
    })
      .then((wrapped) => {
        if (!wrapped) return;
        wrapped.position.y = 0.32;
        kieuPed.add(wrapped);
      })
      .catch(() => {});

    loadGlbCached(['/model/thuykieu.glb'], {
      maxTextureSize: 1024,
      disableMipmaps: true,
      prepareOptions: {
        targetSpan: 2.75,
        fitAxis: 'y',
        groundY: true,
        centerXZ: true,
        color: 0xffe680
      }
    })
      .then((wrapped) => {
        if (!wrapped) return;
        wrapped.position.y = 0.32;
        vanPed.add(wrapped);
      })
      .catch(() => {});
  }

  initZone2LauNgungBich() {
    this.zone2Lights = new THREE.Group();
    const ambient2 = new THREE.AmbientLight(0xd4c0e6, 1.4);
    const sun2 = new THREE.DirectionalLight(0xff7744, 2.5);
    sun2.position.set(-20, 25, -25);
    sun2.castShadow = false; // Tối ưu hóa: Hoàng hôn biển chiều dùng ánh sáng bán cầu, không sinh shadow pass

    const lanternLight1 = new THREE.PointLight(0xffa542, 2.8, 14);
    lanternLight1.position.set(0, 5.2, 0);
    lanternLight1.castShadow = false; // GPU SAVER: PointLight shadow = 6 render passes

    const oceanRimLight = new THREE.DirectionalLight(0x4a75a0, 1.5);
    oceanRimLight.position.set(25, 15, 20);
    oceanRimLight.castShadow = false; // Chỉ sun1 (Zone 1) được phép castShadow

    this.zone2Lights.add(ambient2, sun2, lanternLight1, oceanRimLight);
    this.zone2Group.add(this.zone2Lights);

    const cliffGeo = new THREE.CylinderGeometry(14, 18, 4.0, 16);
    const cliffMat = new THREE.MeshLambertMaterial({
      color: 0x363a38
    });
    const cliffMesh = new THREE.Mesh(cliffGeo, cliffMat);
    cliffMesh.position.y = 1.9;
    cliffMesh.userData.excludeFromCollision = true;
    this.zone2Group.add(cliffMesh);

    const sandGeo = new THREE.RingGeometry(14, 28, 32);
    const sandMat = new THREE.MeshLambertMaterial({
      color: 0xbaa16e,
      side: THREE.DoubleSide
    });
    const sandMesh = new THREE.Mesh(sandGeo, sandMat);
    sandMesh.rotation.x = -Math.PI / 2;
    sandMesh.position.y = 0.05;
    sandMesh.userData.excludeFromCollision = true;
    this.zone2Group.add(sandMesh);

    const pavilionGroup = new THREE.Group();
    pavilionGroup.position.set(0, 3.9, 0);

    const baseGeo = new THREE.BoxGeometry(9.0, 0.6, 9.0);
    const baseMat = new THREE.MeshLambertMaterial({ color: 0x4a4740 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.3;
    pavilionGroup.add(baseMesh);

    const colMat = new THREE.MeshLambertMaterial({ color: 0x342922 });
    const colCoords = [
      [-3.6, -3.6], [0, -3.6], [3.6, -3.6],
      [-3.6, 3.6], [0, 3.6], [3.6, 3.6],
      [-3.6, 0], [3.6, 0]
    ];
    // OPTIMIZED: InstancedMesh cho 8 cột tầng 1 (1 Draw Call thay vì 8)
    const col1Geo = new THREE.CylinderGeometry(0.20, 0.22, 3.2, 12);
    const col1Instanced = new THREE.InstancedMesh(col1Geo, colMat, colCoords.length);
    const dummyCol = new THREE.Object3D();
    colCoords.forEach(([cx, cz], i) => {
      dummyCol.position.set(cx, 2.2, cz);
      dummyCol.updateMatrix();
      col1Instanced.setMatrixAt(i, dummyCol.matrix);
    });
    col1Instanced.instanceMatrix.needsUpdate = true;
    col1Instanced.computeBoundingSphere();
    col1Instanced.frustumCulled = true;
    pavilionGroup.add(col1Instanced);

    const roof1Geo = new THREE.ConeGeometry(7.2, 1.8, 4);
    const roofMat = new THREE.MeshLambertMaterial({ color: 0x3b3d3c });
    const roof1 = new THREE.Mesh(roof1Geo, roofMat);
    roof1.rotation.y = Math.PI / 4;
    roof1.position.y = 4.4;
    pavilionGroup.add(roof1);

    const floor2Geo = new THREE.BoxGeometry(6.6, 0.35, 6.6);
    const floor2 = new THREE.Mesh(floor2Geo, baseMat);
    floor2.position.y = 4.6;
    pavilionGroup.add(floor2);

    // OPTIMIZED: InstancedMesh cho 4 cột tầng 2 (1 Draw Call thay vì 4)
    const upperColCoords = [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]];
    const col2Geo = new THREE.CylinderGeometry(0.16, 0.18, 2.6, 12);
    const col2Instanced = new THREE.InstancedMesh(col2Geo, colMat, upperColCoords.length);
    upperColCoords.forEach(([cx, cz], i) => {
      dummyCol.position.set(cx, 5.9, cz);
      dummyCol.updateMatrix();
      col2Instanced.setMatrixAt(i, dummyCol.matrix);
    });
    col2Instanced.instanceMatrix.needsUpdate = true;
    col2Instanced.computeBoundingSphere();
    col2Instanced.frustumCulled = true;
    pavilionGroup.add(col2Instanced);

    const railMat = new THREE.MeshLambertMaterial({ color: 0x5a231b });
    const railGeo = new THREE.BoxGeometry(5.8, 0.75, 0.1);
    [[-2.8, 0, Math.PI / 2], [2.8, 0, Math.PI / 2], [0, -2.8, 0], [0, 2.8, 0]].forEach(([rx, rz, ry]) => {
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.position.set(rx, 5.2, rz);
      rail.rotation.y = ry;
      pavilionGroup.add(rail);
    });

    const roof2 = new THREE.Mesh(new THREE.ConeGeometry(5.4, 1.9, 4), roofMat);
    roof2.rotation.y = Math.PI / 4;
    roof2.position.y = 7.8;
    pavilionGroup.add(roof2);

    const gourdTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 16, 16),
      new THREE.MeshLambertMaterial({ color: 0xd4af37 })
    );
    gourdTop.position.y = 8.9;
    pavilionGroup.add(gourdTop);

    const chairMat = new THREE.MeshLambertMaterial({ color: 0x42261a });
    const kieuChair = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.6), chairMat);
    kieuChair.position.set(0, 5.0, 0.6);
    pavilionGroup.add(kieuChair);

    const teaTable = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.55, 12), chairMat);
    teaTable.position.set(0, 5.0, -0.4);
    pavilionGroup.add(teaTable);

    const luteBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.32, 0.8, 12),
      new THREE.MeshLambertMaterial({ color: 0xb57842 })
    );
    luteBody.scale.set(1.0, 1.0, 0.35);
    luteBody.position.set(0.45, 5.25, -0.3);
    luteBody.rotation.z = 0.45;
    pavilionGroup.add(luteBody);

    const lanternMat = new THREE.MeshLambertMaterial({ color: 0xffaa33, emissive: 0xff8811, emissiveIntensity: 1.2 });
    const lanternCoords = [[-2.4, 7.0, -2.4], [2.4, 7.0, -2.4], [-2.4, 7.0, 2.4], [2.4, 7.0, 2.4]];
    const lanternGeo = new THREE.SphereGeometry(0.24, 12, 12);
    const lanternInstanced = new THREE.InstancedMesh(lanternGeo, lanternMat, lanternCoords.length);
    const dummyLantern = new THREE.Object3D();
    lanternCoords.forEach(([lx, ly, lz], i) => {
      dummyLantern.position.set(lx, ly, lz);
      dummyLantern.scale.set(0.9, 1.3, 0.9);
      dummyLantern.updateMatrix();
      lanternInstanced.setMatrixAt(i, dummyLantern.matrix);
    });
    lanternInstanced.instanceMatrix.needsUpdate = true;
    lanternInstanced.computeBoundingSphere();
    lanternInstanced.frustumCulled = true;
    pavilionGroup.add(lanternInstanced);

    mergeGroupMeshesByMaterial(pavilionGroup);
    this.zone2Group.add(pavilionGroup);

    this.sailboats = [];
    const sharedBoatHullMat = new THREE.MeshLambertMaterial({ color: 0x3d2b1f });
    const sharedBoatSailMat = new THREE.MeshLambertMaterial({
      color: 0xdfd4be,
      side: THREE.DoubleSide
    });
    const createSailboat = (bx, by, bz, scale, rotY) => {
      const boatGroup = new THREE.Group();
      boatGroup.position.set(bx, by, bz);
      boatGroup.rotation.y = rotY;

      const hullGeo = new THREE.BoxGeometry(1.6 * scale, 0.5 * scale, 4.2 * scale);
      const hull = new THREE.Mesh(hullGeo, sharedBoatHullMat);
      boatGroup.add(hull);

      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * scale, 0.08 * scale, 3.2 * scale, 8), colMat);
      mast.position.y = 1.6 * scale;
      boatGroup.add(mast);

      const sailGeo = new THREE.PlaneGeometry(1.8 * scale, 2.4 * scale);
      const sail = new THREE.Mesh(sailGeo, sharedBoatSailMat);
      sail.position.set(0, 1.8 * scale, 0.3 * scale);
      sail.rotation.y = 0.25;
      boatGroup.add(sail);

      boatGroup.userData.baseY = by;
      boatGroup.userData.bobPhase = Math.random() * Math.PI * 2;
      this.sailboats.push(boatGroup);
      this.zone2Group.add(boatGroup);
    };

    createSailboat(-12, 0.1, -45, 1.5, 0.4);
    createSailboat(18, 0.1, -65, 1.2, -0.6);
    createSailboat(-35, 0.1, -85, 2.0, 0.8);

    const sandPCount = 60; // PERFORMANCE: Giảm 50% số hạt cát vàng (120 -> 60)
    const sandPGeo = new THREE.BufferGeometry();
    const sandPPos = new Float32Array(sandPCount * 3);
    for (let i = 0; i < sandPCount; i++) {
      sandPPos[i * 3] = (Math.random() - 0.5) * 45;
      sandPPos[i * 3 + 1] = Math.random() * 6 + 0.1;
      sandPPos[i * 3 + 2] = (Math.random() - 0.5) * 45;
    }
    sandPGeo.setAttribute('position', new THREE.BufferAttribute(sandPPos, 3));
    this.particlesZone2 = new THREE.Points(
      sandPGeo,
      new THREE.PointsMaterial({
        color: 0xd6b77c,
        size: 0.14,
        transparent: true,
        opacity: 0.75,
        depthWrite: false
      })
    );
    this.zone2Group.add(this.particlesZone2);

    const sign2 = createPoeticSignboard(
      'II. LẦU NGƯNG BÍCH CỬA BỂ',
      'Buồn trông cửa bể chiều hôm',
      'Thuyền ai thấp thoáng cánh buồm xa xa',
      '— Nguyễn Du • Kiều Ở Lầu Ngưng Bích —'
    );
    sign2.position.set(-6.5, 5.6, 2.0);
    sign2.rotation.y = 0.5;
    this.zone2Group.add(sign2);

    const portalToZone1 = createPortalWaypoint(1, 'VƯỜN THÚY & THANH MINH', 'Suối hoa lê trắng • Mộ Đạm Tiên');
    portalToZone1.position.set(12.0, 0.0, 4.0);
    portalToZone1.rotation.y = -Math.PI / 2;
    this.zone2Group.add(portalToZone1);

    const portalToZone3 = createPortalWaypoint(3, 'DOANH TRẠI TỪ HẢI', 'Trướng hùm uy nghiêm • Gươm giáo rực lửa');
    portalToZone3.position.set(12.0, 0.0, -8.0);
    portalToZone3.rotation.y = -Math.PI / 2;
    this.zone2Group.add(portalToZone3);

    // Cổng quy hồi trở về sảnh bảo tàng tại Zone 2 (Lầu Ngưng Bích)
    const returnPortalZone2 = createReturnMuseumPortalStele();
    returnPortalZone2.position.set(4.0, 4.5, 4.0);
    returnPortalZone2.rotation.y = -Math.PI / 3;
    this.zone2Group.add(returnPortalZone2);
    this.zoneInteractables[2].push(portalToZone1, portalToZone3, returnPortalZone2);
  }

  // =========================================================================
  // 3. KHÔNG GIAN 3: DOANH TRẠI TỪ HẢI (UY NGHIÊM, HÀO HÙNG, CHIẾN CHINH)
  // =========================================================================
  initZone3DoanhTraiTuHai() {
    this.zone3Lights = new THREE.Group();
    const ambient3 = new THREE.AmbientLight(0xffdfc4, 1.8);
    const sun3 = new THREE.DirectionalLight(0xff9922, 3.0);
    sun3.position.set(22, 32, 18);
    sun3.castShadow = false; // Tối ưu hóa: Doanh trại Từ Hải dùng ánh lửa trại, không sinh shadow pass phụ

    this.fireLight = new THREE.PointLight(0xff5500, 3.8, 22);
    this.fireLight.position.set(0, 2.5, 4.0);
    this.fireLight.castShadow = false; // GPU SAVER: PointLight shadow = 6 render passes

    const fill3 = new THREE.DirectionalLight(0xffcc88, 1.2);
    fill3.position.set(-18, 20, -15);
    fill3.castShadow = false; // Chỉ sun1 (Zone 1) được phép castShadow

    this.zone3Lights.add(ambient3, sun3, this.fireLight, fill3);
    this.zone3Group.add(this.zone3Lights);

    const groundGeo = new THREE.CylinderGeometry(24, 25, 0.5, 24);
    const groundMat = new THREE.MeshLambertMaterial({
      color: 0x3d3224
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.position.y = 0.25;
    this.zone3Group.add(groundMesh);

    const fenceMat = new THREE.MeshLambertMaterial({ color: 0x453123 });
    const stakeGeo = new THREE.ConeGeometry(0.18, 2.4, 8);
    const stakePositions = [];
    for (let i = 0; i < 38; i++) {
      const ang = (i * Math.PI * 2) / 38;
      if (ang > 0.85 * Math.PI && ang < 1.15 * Math.PI) continue;

      const px = Math.cos(ang) * 22;
      const pz = Math.sin(ang) * 22;
      stakePositions.push({ x: px, y: 1.6, z: pz, rx: (Math.sin(i * 1.7) * 0.06), rz: (Math.cos(i * 2.3) * 0.06) });
    }
    const fenceInstanced = new THREE.InstancedMesh(stakeGeo, fenceMat, stakePositions.length);
    const dummyStake = new THREE.Object3D();
    stakePositions.forEach((sp, idx) => {
      dummyStake.position.set(sp.x, sp.y, sp.z);
      dummyStake.rotation.set(sp.rx, 0, sp.rz);
      dummyStake.updateMatrix();
      fenceInstanced.setMatrixAt(idx, dummyStake.matrix);
    });
    fenceInstanced.instanceMatrix.needsUpdate = true;
    fenceInstanced.computeBoundingSphere();
    fenceInstanced.frustumCulled = true;
    this.zone3Group.add(fenceInstanced);

    const tentGroup = new THREE.Group();
    tentGroup.position.set(0, 0.5, -6.5);

    const platGeo = new THREE.BoxGeometry(14, 0.6, 11);
    const platMat = new THREE.MeshLambertMaterial({ color: 0x4d3928 });
    const plat = new THREE.Mesh(platGeo, platMat);
    plat.position.y = 0.3;
    tentGroup.add(plat);

    const tentRoofGeo = new THREE.ConeGeometry(8.2, 5.8, 6);
    const tentRoofMat = new THREE.MeshLambertMaterial({
      color: 0x6e1616
    });
    const tentRoof = new THREE.Mesh(tentRoofGeo, tentRoofMat);
    tentRoof.rotation.y = Math.PI / 6;
    tentRoof.position.y = 5.2;
    tentGroup.add(tentRoof);

    const goldTrim = new THREE.Mesh(
      new THREE.CylinderGeometry(6.6, 6.7, 0.25, 6),
      new THREE.MeshLambertMaterial({ color: 0xd4af37 })
    );
    goldTrim.rotation.y = Math.PI / 6;
    goldTrim.position.y = 2.4;
    tentGroup.add(goldTrim);

    const wallGeo = new THREE.CylinderGeometry(6.4, 6.4, 2.2, 6, 1, true);
    const wallMat = new THREE.MeshLambertMaterial({ color: 0x581212, side: THREE.DoubleSide });
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.rotation.y = Math.PI / 6;
    wallMesh.position.y = 1.35;
    tentGroup.add(wallMesh);

    const couchGeo = new THREE.BoxGeometry(3.6, 0.7, 1.8);
    const tigerCanvas = document.createElement('canvas');
    tigerCanvas.width = 256;
    tigerCanvas.height = 256;
    const tctx = tigerCanvas.getContext('2d');
    tctx.fillStyle = '#d98c2a';
    tctx.fillRect(0, 0, 256, 256);
    tctx.fillStyle = '#221105';
    for (let i = 0; i < 20; i++) {
      tctx.beginPath();
      tctx.ellipse(Math.random() * 256, Math.random() * 256, 40, 6, Math.random() * Math.PI, 0, Math.PI * 2);
      tctx.fill();
    }
    const tigerTex = new THREE.CanvasTexture(tigerCanvas);
  tigerTex.generateMipmaps = false;
  tigerTex.minFilter = THREE.LinearFilter;
    const tigerMat = new THREE.MeshLambertMaterial({ map: tigerTex });
    const tigerCouch = new THREE.Mesh(couchGeo, tigerMat);
    tigerCouch.position.set(0, 0.95, -1.8);
    tentGroup.add(tigerCouch);

    const deskGeo = new THREE.BoxGeometry(3.2, 0.65, 1.2);
    const deskMat = new THREE.MeshLambertMaterial({ color: 0x2e1d14 });
    const desk = new THREE.Mesh(deskGeo, deskMat);
    desk.position.set(0, 0.92, 0.4);
    tentGroup.add(desk);

    const scrollGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
    const scrollMat = new THREE.MeshLambertMaterial({ color: 0xe5d8be });
    const mapScroll = new THREE.Mesh(scrollGeo, scrollMat);
    mapScroll.rotation.z = Math.PI / 2;
    mapScroll.position.set(0, 1.3, 0.4);
    tentGroup.add(mapScroll);

    const zone3StaticProps = new THREE.Group();
    zone3StaticProps.name = 'Zone3_Static_Merged_Props';
    zone3StaticProps.add(tentGroup);

    const daoGroup = new THREE.Group();
    daoGroup.position.set(4.8, 0.5, -4.5);

    const bladePole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, 3.8, 10),
      new THREE.MeshLambertMaterial({ color: 0x3d2b1f })
    );
    bladePole.position.y = 1.9;
    daoGroup.add(bladePole);

    const bladeGeo = new THREE.BoxGeometry(0.04, 1.6, 0.42);
    const bladeMat = new THREE.MeshLambertMaterial({ color: 0xd8e0e8 });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.set(0, 3.4, 0.12);
    daoGroup.add(blade);
    zone3StaticProps.add(daoGroup);

    const drumMat = new THREE.MeshLambertMaterial({ color: 0x8a241c });
    const drumHeadMat = new THREE.MeshLambertMaterial({ color: 0xe5ceaa });
    [-5.5, 5.5].forEach((dx) => {
      const drumGroup = new THREE.Group();
      drumGroup.position.set(dx, 0.5, -1.0);

      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 1.6, 8), fenceMat);
      stand.position.y = 0.8;
      drumGroup.add(stand);

      const drumBody = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.1, 16), drumMat);
      drumBody.rotation.x = Math.PI / 2;
      drumBody.position.y = 1.5;
      drumGroup.add(drumBody);

      const head = new THREE.Mesh(new THREE.CircleGeometry(0.88, 16), drumHeadMat);
      head.position.set(0, 1.5, 0.56);
      drumGroup.add(head);

      zone3StaticProps.add(drumGroup);
    });

    this.flags = [];
    this.flagTimeUniform = { value: 0 };
    const sharedTextFlagMats = new Map();
    const attachFlagWaveShader = (mat, keySuffix) => {
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = this.flagTimeUniform;
        shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          float flagWaveFactor = transformed.x / 2.4;
          transformed.z += sin(uTime * 5.5 + transformed.x * 3.0) * 0.18 * flagWaveFactor;`
        );
      };
      mat.customProgramCacheKey = () => `tkw_flag_wave_${keySuffix}`;
      return mat;
    };

    const flagGeo = new THREE.PlaneGeometry(2.4, 1.6, 8, 4);
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.10, 6.8, 8);
    const createFlag = (fx, fz, colorHex, flagText = '') => {
      const pole = new THREE.Mesh(poleGeo, fenceMat);
      pole.position.set(fx, 0.5 + 3.4, fz);
      zone3StaticProps.add(pole);

      let flagMat;
      if (flagText) {
        if (sharedTextFlagMats.has(flagText)) {
          flagMat = sharedTextFlagMats.get(flagText);
        } else {
          const fcanvas = document.createElement('canvas');
          fcanvas.width = 512;
          fcanvas.height = 340;
          const fctx = fcanvas.getContext('2d');
          fctx.fillStyle = '#8b1818';
          fctx.fillRect(0, 0, 512, 340);
          fctx.strokeStyle = '#ffd700';
          fctx.lineWidth = 14;
          fctx.strokeRect(16, 16, 480, 308);
          fctx.fillStyle = '#ffd700';
          fctx.font = 'bold 180px serif';
          fctx.textAlign = 'center';
          fctx.fillText(flagText, 256, 235);
          const ftex = new THREE.CanvasTexture(fcanvas);
          ftex.generateMipmaps = false;
          ftex.minFilter = THREE.LinearFilter;
          flagMat = attachFlagWaveShader(new THREE.MeshLambertMaterial({ map: ftex, side: THREE.DoubleSide }), 'tex');
          sharedTextFlagMats.set(flagText, flagMat);
        }
      } else {
        flagMat = attachFlagWaveShader(new THREE.MeshLambertMaterial({ color: colorHex, side: THREE.DoubleSide }), 'col');
      }

      const flagMesh = new THREE.Mesh(flagGeo, flagMat);
      flagMesh.name = 'zone3_flag_banner';
      flagMesh.position.set(fx + 1.2, 0.5 + 5.8, fz);
      this.flags.push(flagMesh);
      this.zone3Group.add(flagMesh);
    };

    createFlag(-6.8, -4.5, 0x8b1818, '徐');
    createFlag(6.8, -4.5, 0x8b1818, '徐');
    createFlag(-14.0, 4.0, 0xd4af37);
    createFlag(14.0, 4.0, 0x1b4f72);
    createFlag(-11.0, 11.0, 0x196f3d);
    createFlag(11.0, 11.0, 0x212f3d);

    mergeGroupMeshesByMaterial(zone3StaticProps);
    this.zone3Group.add(zone3StaticProps);

    const fireGroup = new THREE.Group();
    fireGroup.position.set(0, 0.5, 4.0);

    // OPTIMIZED: InstancedMesh cho 10 khúc củi lửa trại (1 Draw Call thay vì 10)
    const logGeo = new THREE.CylinderGeometry(0.12, 0.14, 1.8, 8);
    const logsInstanced = new THREE.InstancedMesh(logGeo, fenceMat, 10);
    const dummyLog = new THREE.Object3D();
    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI * 2) / 10;
      dummyLog.position.set(Math.cos(a) * 0.45, 0.55, Math.sin(a) * 0.45);
      dummyLog.rotation.set(Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45);
      dummyLog.updateMatrix();
      logsInstanced.setMatrixAt(i, dummyLog.matrix);
    }
    logsInstanced.instanceMatrix.needsUpdate = true;
    logsInstanced.computeBoundingSphere();
    logsInstanced.frustumCulled = true;
    fireGroup.add(logsInstanced);

    const emberMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
    const ember = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65), emberMat);
    ember.position.y = 0.5;
    fireGroup.add(ember);
    this.zone3Group.add(fireGroup);

    // OPTIMIZED: InstancedMesh cho 4 chậu đuốc chiến doanh (3 Draw Calls thay vì 12)
    const bzCoords = [[-3.8, 2.0], [3.8, 2.0], [-3.8, 8.0], [3.8, 8.0]];
    const bzStandGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.8, 8);
    const bzBowlGeo = new THREE.CylinderGeometry(0.4, 0.15, 0.35, 10);
    const bzBowlMat = new THREE.MeshLambertMaterial({ color: 0x1f1f1f });
    const bzFlameGeo = new THREE.ConeGeometry(0.22, 0.55, 8);
    const bzFlameMat = new THREE.MeshBasicMaterial({ color: 0xff7700 });

    const standsInstanced = new THREE.InstancedMesh(bzStandGeo, fenceMat, 4);
    const bowlsInstanced = new THREE.InstancedMesh(bzBowlGeo, bzBowlMat, 4);
    const flamesInstanced = new THREE.InstancedMesh(bzFlameGeo, bzFlameMat, 4);
    const dummyBz = new THREE.Object3D();

    bzCoords.forEach(([tx, tz], i) => {
      // Chân đỡ đuốc
      dummyBz.position.set(tx, 0.5 + 0.9, tz);
      dummyBz.rotation.set(0, 0, 0);
      dummyBz.updateMatrix();
      standsInstanced.setMatrixAt(i, dummyBz.matrix);

      // Chậu đồng
      dummyBz.position.set(tx, 0.5 + 1.95, tz);
      dummyBz.updateMatrix();
      bowlsInstanced.setMatrixAt(i, dummyBz.matrix);

      // Ngọn lửa
      dummyBz.position.set(tx, 0.5 + 2.3, tz);
      dummyBz.updateMatrix();
      flamesInstanced.setMatrixAt(i, dummyBz.matrix);

      // Nguồn sáng PointLight không bóng đổ (gắn vào zone3Lights để tự tắt khi chuyển Zone)
      const bLight = new THREE.PointLight(0xff7711, 2.0, 10);
      bLight.position.set(tx, 2.9, tz);
      bLight.castShadow = false; // GPU SAVER: PointLight shadow = 6 render passes
      this.zone3Lights.add(bLight);
    });

    standsInstanced.instanceMatrix.needsUpdate = true;
    standsInstanced.computeBoundingSphere();
    standsInstanced.frustumCulled = true;

    bowlsInstanced.instanceMatrix.needsUpdate = true;
    bowlsInstanced.computeBoundingSphere();
    bowlsInstanced.frustumCulled = true;

    flamesInstanced.instanceMatrix.needsUpdate = true;
    flamesInstanced.computeBoundingSphere();
    flamesInstanced.frustumCulled = true;

    this.zone3Group.add(standsInstanced, bowlsInstanced, flamesInstanced);

    const sparkCount = 40; // PERFORMANCE: Giảm 50% tàn lửa (80 -> 40)
    const sparkGeo = new THREE.BufferGeometry();
    const sparkPos = new Float32Array(sparkCount * 3);
    this.sparkData = [];
    for (let i = 0; i < sparkCount; i++) {
      const y = 0.8 + Math.random() * 8.0;
      sparkPos[i * 3] = (Math.random() - 0.5) * 4.0;
      sparkPos[i * 3 + 1] = y;
      sparkPos[i * 3 + 2] = 4.0 + (Math.random() - 0.5) * 4.0;
      this.sparkData.push({
        y,
        speed: 1.2 + Math.random() * 1.5,
        driftSpeed: Math.random() * 2 + 1,
        angle: Math.random() * Math.PI * 2
      });
    }
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    this.particlesZone3 = new THREE.Points(
      sparkGeo,
      new THREE.PointsMaterial({
        color: 0xff8822,
        size: 0.18,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.zone3Group.add(this.particlesZone3);

    const sign3 = createPoeticSignboard(
      'III. DOANH TRẠI TỪ HẢI',
      'Trướng hùm mở giữa phù vân',
      'Triệu binh nghiêm ngặt muôn phần uy linh',
      '— Nguyễn Du • Từ Hải Hào Kiệt —'
    );
    sign3.position.set(6.5, 2.4, 6.0);
    sign3.rotation.y = -0.4;
    this.zone3Group.add(sign3);

    const portalToZone1 = createPortalWaypoint(1, 'VƯỜN THÚY & THANH MINH', 'Suối hoa lê trắng • Mộ Đạm Tiên');
    portalToZone1.position.set(-16.0, 0.0, 4.0);
    portalToZone1.rotation.y = Math.PI / 2;
    this.zone3Group.add(portalToZone1);

    const portalToZone2 = createPortalWaypoint(2, 'LẦU NGƯNG BÍCH', 'Cửa bể chiều hôm • Cát vàng sóng vỗ');
    portalToZone2.position.set(-16.0, 0.0, -8.0);
    portalToZone2.rotation.y = Math.PI / 2;
    this.zone3Group.add(portalToZone2);

    // Cổng quy hồi trở về sảnh bảo tàng tại Zone 3 (Doanh Trại Từ Hải)
    const returnPortalZone3 = createReturnMuseumPortalStele();
    returnPortalZone3.position.set(-6.0, 0.0, 7.5);
    returnPortalZone3.rotation.y = Math.PI / 4;
    this.zone3Group.add(returnPortalZone3);
    this.zoneInteractables[3].push(portalToZone1, portalToZone2, returnPortalZone3);
  }

  // =========================================================================
  // 4. FLOATING REALM NAVIGATOR HUD (THANH ĐIỀU HƯỚNG 3 KHÔNG GIAN)
  // =========================================================================
  initFloatingRealmNavigatorHUD() {
    if (typeof document === 'undefined') return;

    let hud = document.getElementById('kieuworld-realm-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'kieuworld-realm-hud';
      hud.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(12, 18, 28, 0.94);
        border: 1.5px solid #d4af37;
        box-shadow: 0 0 30px rgba(212, 175, 55, 0.35), 0 10px 40px rgba(0, 0, 0, 0.9);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        color: #fff;
        font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
        border-radius: 40px;
        padding: 6px 10px;
        display: none;
        align-items: center;
        gap: 8px;
        z-index: 9999;
        user-select: none;
        transition: all 0.3s ease;
      `;
      hud.innerHTML = `
        <button class="kieu-realm-btn active" id="btn-goto-zone1" data-zone="1">
          🌸 I. Vườn Thúy & Thanh Minh [Phím 1]
        </button>
        <button class="kieu-realm-btn" id="btn-goto-zone2" data-zone="2">
          🌊 II. Lầu Ngưng Bích [Phím 2]
        </button>
        <button class="kieu-realm-btn" id="btn-goto-zone3" data-zone="3">
          ⚔️ III. Doanh Trại Từ Hải [Phím 3]
        </button>
        <div style="width: 1px; height: 24px; background: rgba(255,255,255,0.2); margin: 0 4px;"></div>
        <button class="kieu-realm-btn exit-realm-btn" id="btn-realm-exit">
          ↩ QUAY VỀ BẢO TÀNG (Nhấn phím ESC)
        </button>
      `;

      // Nút thoát nhanh góc trên bên phải khi ở trong cõi Kiều
      let topExit = document.getElementById('btn-realm-exit-top');
      if (!topExit) {
        topExit = document.createElement('button');
        topExit.id = 'btn-realm-exit-top';
        topExit.innerHTML = '↩ QUAY VỀ BẢO TÀNG (Nhấn phím ESC)';
        topExit.style.cssText = `
          position: fixed;
          top: 24px;
          right: 28px;
          z-index: 9999;
          display: none;
          background: linear-gradient(135deg, rgba(20, 26, 38, 0.92) 0%, rgba(12, 18, 28, 0.96) 100%);
          border: 1.5px solid #39e58c;
          color: #eafff4;
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
          font-weight: 700;
          font-size: 13px;
          letter-spacing: 1px;
          padding: 10px 20px;
          border-radius: 30px;
          cursor: pointer;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6), 0 0 16px rgba(57, 229, 140, 0.35);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          transition: all 0.25s ease;
        `;
        topExit.addEventListener('click', (e) => {
          e.preventDefault();
          this.exitStoryWorldWithWarp();
        });
        topExit.addEventListener('mouseenter', () => {
          topExit.style.background = 'linear-gradient(135deg, rgba(57, 229, 140, 0.35) 0%, rgba(20, 120, 70, 0.45) 100%)';
          topExit.style.transform = 'scale(1.04)';
          topExit.style.boxShadow = '0 6px 24px rgba(57, 229, 140, 0.5)';
        });
        topExit.addEventListener('mouseleave', () => {
          topExit.style.background = 'linear-gradient(135deg, rgba(20, 26, 38, 0.92) 0%, rgba(12, 18, 28, 0.96) 100%)';
          topExit.style.transform = 'scale(1.0)';
          topExit.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.6), 0 0 16px rgba(57, 229, 140, 0.35)';
        });
        document.body.appendChild(topExit);
      }
      this.topExitElement = topExit;

      const style = document.createElement('style');
      style.textContent = `
        .kieu-realm-btn {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.18);
          color: #e2eaf4;
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.5px;
          padding: 8px 14px;
          border-radius: 24px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          white-space: nowrap;
        }
        .kieu-realm-btn:hover {
          background: rgba(212, 175, 55, 0.25);
          border-color: #ffd770;
          color: #fff;
          transform: translateY(-2px);
        }
        .kieu-realm-btn.active {
          background: linear-gradient(135deg, rgba(212, 175, 55, 0.5), rgba(150, 110, 20, 0.5));
          border-color: #ffd770;
          color: #fff8e8;
          box-shadow: 0 0 14px rgba(255, 215, 112, 0.5);
        }
        .exit-realm-btn {
          background: linear-gradient(135deg, rgba(57, 229, 140, 0.3), rgba(20, 120, 70, 0.3));
          border-color: #39e58c;
          color: #eafff4;
        }
        .exit-realm-btn:hover {
          background: linear-gradient(135deg, rgba(57, 229, 140, 0.5), rgba(20, 120, 70, 0.5));
          border-color: #5effa5;
          box-shadow: 0 0 14px rgba(57, 229, 140, 0.5);
        }
      `;
      document.head.appendChild(style);
      document.body.appendChild(hud);

      hud.querySelectorAll('[data-zone]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const zid = parseInt(btn.getAttribute('data-zone'));
          this.switchZone(zid);
        });
      });

      const exitBtn = document.getElementById('btn-realm-exit');
      if (exitBtn) {
        exitBtn.addEventListener('click', (e) => {
          e.preventDefault();
          this.toggleStoryWorld();
        });
      }
    }
    this.realmHudElement = hud;
  }

  // =========================================================================
  // 5. HIỆU ỨNG "WARP INTO BOOK" (HÚT VÀO CUỐN SÁCH) & RETRO RETURN
  // =========================================================================
  createWarpOverlayUI() {
    if (typeof document === 'undefined') return;

    let overlay = document.getElementById('kieu-warp-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'kieu-warp-overlay';
      overlay.innerHTML = `
        <div class="warp-book-vortex">📖✨</div>
        <div class="warp-title-text" id="warp-title">ĐANG BƯỚC VÀO THẾ GIỚI TRUYỆN KIỀU...</div>
        <div class="warp-sub-text" id="warp-subtitle">CỖ MÁY KHÔNG GIAN NGUYỄN DU</div>
        <div class="warp-ray-container">
          <div class="warp-light-ray r1"></div>
          <div class="warp-light-ray r2"></div>
          <div class="warp-light-ray r3"></div>
        </div>
      `;

      const style = document.createElement('style');
      style.textContent = `
        #kieu-warp-overlay {
          position: fixed;
          top: 0; left: 0;
          width: 100vw; height: 100vh;
          pointer-events: none;
          z-index: 999999;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          opacity: 0;
          background: radial-gradient(circle at center, rgba(255, 245, 180, 0.98) 0%, rgba(220, 175, 55, 0.88) 35%, rgba(14, 20, 32, 0.98) 85%, #050810 100%);
          backdrop-filter: blur(0px);
          -webkit-backdrop-filter: blur(0px);
          transform: scale(0.92);
          transition: opacity 0.55s cubic-bezier(0.16, 1, 0.3, 1), transform 0.55s cubic-bezier(0.16, 1, 0.3, 1), backdrop-filter 0.55s ease;
          user-select: none;
        }

        #kieu-warp-overlay.active {
          opacity: 1;
          pointer-events: auto;
          transform: scale(1.0);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
        }

        .warp-book-vortex {
          width: 160px;
          height: 160px;
          border-radius: 50%;
          border: 3px solid rgba(255, 225, 120, 0.85);
          box-shadow: 0 0 50px rgba(255, 215, 80, 0.9), inset 0 0 40px rgba(255, 235, 150, 0.7);
          animation: warpRotate 1.8s infinite linear;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 56px;
        }

        @keyframes warpRotate {
          0% { transform: rotate(0deg) scale(0.9); box-shadow: 0 0 35px rgba(255, 215, 80, 0.8); }
          50% { transform: rotate(180deg) scale(1.12); box-shadow: 0 0 65px rgba(255, 240, 120, 1.0); }
          100% { transform: rotate(360deg) scale(0.9); box-shadow: 0 0 35px rgba(255, 215, 80, 0.8); }
        }

        .warp-title-text {
          margin-top: 24px;
          font-family: 'Georgia', serif;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 2.5px;
          color: #fff9e6;
          text-shadow: 0 0 20px rgba(255, 215, 80, 0.95), 0 0 40px rgba(212, 175, 55, 0.7);
          text-transform: uppercase;
          text-align: center;
        }

        .warp-sub-text {
          margin-top: 8px;
          font-family: 'Segoe UI', sans-serif;
          font-size: 14px;
          letter-spacing: 2px;
          color: #ffe082;
          text-transform: uppercase;
          text-shadow: 0 0 10px rgba(212, 175, 55, 0.8);
          text-align: center;
        }

        .warp-ray-container {
          position: absolute;
          width: 100%;
          height: 100%;
          pointer-events: none;
          overflow: hidden;
        }

        .warp-light-ray {
          position: absolute;
          top: 50%; left: 50%;
          width: 250vw; height: 12px;
          background: linear-gradient(90deg, transparent, rgba(255, 235, 150, 0.6), transparent);
          transform-origin: center center;
          animation: raySpin 3.5s infinite linear;
        }
        .warp-light-ray.r2 { transform: translate(-50%, -50%) rotate(60deg); animation-duration: 4.5s; }
        .warp-light-ray.r3 { transform: translate(-50%, -50%) rotate(120deg); animation-duration: 5.5s; }

        @keyframes raySpin {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
      document.body.appendChild(overlay);
    }
    this.warpOverlayElement = overlay;
  }

  showWarpOverlay(statusClass, title, subtitle) {
    if (!this.warpOverlayElement) this.createWarpOverlayUI();
    const t = document.getElementById('warp-title');
    const s = document.getElementById('warp-subtitle');
    if (t && title) t.textContent = title;
    if (s && subtitle) s.textContent = subtitle;
    if (this.warpOverlayElement) {
      this.warpOverlayElement.classList.add('active');
    }
  }

  hideWarpOverlay() {
    if (this.warpOverlayElement) {
      this.warpOverlayElement.classList.remove('active');
    }
  }

  /**
   * CÚ BAY "WARP INTO BOOK": LAO VÚT VÀO CUỐN SÁCH PHÒNG 01 -> LÓE SÁNG -> DỊCH CHUYỂN
   * KÍCH HOẠT SCENE SWAPPING SANG TRUYENKIEUSCENE ĐỘC LẬP
   */
  enterStoryWorldWithWarp(targetZoneId = 1, skipDive = false) {
    if (this.isWarping) return;
    this.isWarping = true;
    this.currentZoneId = targetZoneId;

    if (skipDive) {
      this.isInsideWorld = true;
      this.isWarping = false;
      if (this.worldGroup) this.worldGroup.visible = true;

      const targetMainScene = this.truyenKieuScene;
      if (this.app?.setActiveScene) {
        this.app.setActiveScene(targetMainScene);
      } else if (this.app) {
        this.app.activeScene = targetMainScene;
      }
      window.__activeScene = targetMainScene;

      this.switchZone(targetZoneId);
      this.initTruyenKieuHitboxes();

      if (this.realmHudElement) this.realmHudElement.style.display = 'flex';
      if (this.topExitElement) this.topExitElement.style.display = 'block';

      this.adaptSoundscapeToZone(targetZoneId);

      if (this.cameraManager?.controls) this.cameraManager.controls.enabled = true;
      if (this.cameraController) this.cameraController.isEnabled = true;
      return;
    }

    // 1. Lưu lại vị trí và góc nhìn hiện tại trong bảo tàng
    this.savedPos = this.camera.position.clone();
    if (this.cameraManager?.controls) {
      this.savedTarget = this.cameraManager.controls.target.clone();
    }
    this.savedFog = this.mainScene?.fog || this.scene.fog;
    this.savedBackground = this.mainScene?.background || this.scene.background;
    if (this.renderer) {
      this.savedExposure = this.renderer.toneMappingExposure ?? 1.0;
      this.renderer.toneMappingExposure = 1.30;
    }

    // Vị trí tâm cuốn sách mở ở Phòng 01 trong world space
    const bookCenter = new THREE.Vector3(-48.0, 11.20, 19.0);
    // Điểm zoom-in sát mặt sách: cách tâm sách chỉ 0.28m
    const bookDiveTarget = new THREE.Vector3(-47.72, 11.25, 19.0);

    // Khóa điều khiển người chơi trong khi camera dive
    if (document.exitPointerLock) document.exitPointerLock();
    if (this.cameraManager?.controls) this.cameraManager.controls.enabled = false;
    if (this.cameraController) this.cameraController.isEnabled = false;

    // Nếu người chơi đang đứng xa Phòng 01 (> 12m), dịch chuyển nhanh về góc nhìn trước bục sách
    if (this.camera.position.distanceTo(bookCenter) > 12.0) {
      this.camera.position.set(-44.5, 11.8, 19.0);
      this.camera.lookAt(bookCenter);
    }

    const startPos = this.camera.position.clone();
    this.playWarpDiveSound();

    // Kích hoạt overlay chớp sáng vàng kim (Loading mờ)
    const zoneName = REALM_ZONES[`ZONE_${targetZoneId}`]?.name || 'TIẾT THANH MINH';
    this.showWarpOverlay(
      'active',
      '✨ ĐANG BƯỚC VÀO THẾ GIỚI TRUYỆN KIỀU... ✨',
      `PHÂN CẢNH: ${zoneName.toUpperCase()}`
    );

    // Camera dive animation cực nhanh vào tâm sách trong 0.70 giây
    const diveDuration = 0.70;
    const startTime = performance.now();

    if (this.warpAnimId) {
      cancelAnimationFrame(this.warpAnimId);
      this.warpAnimId = null;
    }

    const animateDive = (now) => {
      const elapsed = (now - startTime) / 1000;
      const progress = Math.min(1.0, elapsed / diveDuration);

      // Easing tăng tốc dữ dội khi lao vào sách (Ease-In Quartic)
      const t = progress * progress * progress * progress;
      this.camera.position.lerpVectors(startPos, bookDiveTarget, t);
      this.camera.lookAt(bookCenter);

      if (progress < 1.0) {
        this.warpAnimId = requestAnimationFrame(animateDive);
      } else {
        this.warpAnimId = null;

        // TẠI ĐỈNH CHỚP SÁNG: HOÁN ĐỔI SANG TRUYEN KIEU SCENE (SCENE SWAPPING)
        this.isInsideWorld = true;

        if (this.app?.setActiveScene) {
          this.app.setActiveScene(this.truyenKieuScene);
        } else if (this.app) {
          this.app.activeScene = this.truyenKieuScene;
        }
        window.__activeScene = this.truyenKieuScene;

        // Đặt camera vào phân cảnh tương ứng bên trong truyenKieuScene (Tọa độ gốc 0,0,0)
        this.switchZone(targetZoneId);

        // Đảm bảo nạp đầy đủ hitbox va chạm cho Thế giới Kiều
        this.initTruyenKieuHitboxes();

        if (this.realmHudElement) this.realmHudElement.style.display = 'flex';
        if (this.topExitElement) this.topExitElement.style.display = 'block';

        const enterBtn = document.getElementById('btn-enter-kieuworld');
        if (enterBtn) {
          enterBtn.innerHTML = '🏛️ Trở Về Sảnh Bảo Tàng';
          enterBtn.style.borderColor = '#39e58c';
        }

        // FADE-IN MÀN HÌNH MỞ RA CHÂN TRỜI THIÊN NHIÊN CÕI KIỀU
        setTimeout(() => {
          this.hideWarpOverlay();
          setTimeout(() => {
            if (this.cameraManager?.controls) this.cameraManager.controls.enabled = true;
            if (this.cameraController) this.cameraController.isEnabled = true;
            this.isWarping = false;

            const perf = this.performanceOptimizer || window.performanceOptimizer;
            perf?.startBenchmark?.(`THẾ GIỚI KIỀU (${zoneName})`);
          }, 450);
        }, 150);
      }
      this.warpAnimId = this.warpAnimId || null;
    };
    this.warpAnimId = requestAnimationFrame(animateDive);
  }

  /**
   * CÚ BAY NGƯỢC LẠI (QUAY VỀ BẢO TÀNG): HOÁN ĐỔI ACTIVE SCENE TRỞ LẠI SẢNH CHÍNH
   */
  exitStoryWorldWithWarp() {
    if (this.isWarping) return;
    this.isWarping = true;

    if (document.exitPointerLock) document.exitPointerLock();
    if (this.cameraManager?.controls) this.cameraManager.controls.enabled = false;
    if (this.cameraController) this.cameraController.isEnabled = false;

    this.playWarpReturnSound();

    // Bật màn hình Loading mờ
    this.showWarpOverlay(
      'active',
      '🏛️ ĐANG TRỞ VỀ BẢO TÀNG VĂN HỌC... 🏛️',
      'PHÒNG TRƯNG BÀY 01 • BỤC SÁCH NGUYỄN DU'
    );

    const bookCenter = new THREE.Vector3(-48.0, 11.45, 19.40);
    const bookReturnNear = new THREE.Vector3(-48.0, 11.70, 22.80);
    const idealMuseumView = new THREE.Vector3(-48.0, 11.70, 22.80);

    setTimeout(() => {
      this.isInsideWorld = false;

      // HOÁN ĐỔI SCENE TRỞ LẠI SẢNH BẢO TÀNG (SCENE SWAPPING)
      const targetMainScene = this.mainScene || this.app?.mainScene || this.app?.scene;
      if (this.app?.setActiveScene) {
        this.app.setActiveScene(targetMainScene);
      } else if (this.app) {
        this.app.activeScene = targetMainScene;
      }
      window.__activeScene = targetMainScene;

      if (this.realmHudElement) this.realmHudElement.style.display = 'none';
      if (this.topExitElement) this.topExitElement.style.display = 'none';

      if (this.renderer) {
        this.renderer.toneMappingExposure = this.savedExposure || 1.0;
      }

      if (this.cameraController) {
        this.cameraController.setFloorHeightProvider?.(null);
        this.cameraController.floorHeightProvider = null;
        this.cameraController.velocity?.set?.(0, 0, 0);
      }

      // Đặt camera sát mặt cuốn sách Phòng 01
      this.camera.position.copy(bookReturnNear);
      this.camera.lookAt(bookCenter);

      const enterBtn = document.getElementById('btn-enter-kieuworld');
      if (enterBtn) {
        enterBtn.innerHTML = '🌸 Cổng Dịch Chuyển: Truyện Kiều (Click Sách)';
        enterBtn.style.borderColor = '#ff99bb';
      }

      // Tắt màn hình Loading mờ
      this.hideWarpOverlay();

      // CÚ BAY LÙI (SMOOTH PULL-BACK / ZOOM-OUT) TRONG 0.85 GIÂY TỪ SÁCH VỀ PHÒNG
      const pullDuration = 0.85;
      const pullStartTime = performance.now();

      if (this.pullBackAnimId) {
        cancelAnimationFrame(this.pullBackAnimId);
        this.pullBackAnimId = null;
      }

      const animatePullBack = (now) => {
        const elapsed = (now - pullStartTime) / 1000;
        const progress = Math.min(1.0, elapsed / pullDuration);

        // Easing giảm tốc mượt mà (Ease-Out Cubic)
        const t = 1 - Math.pow(1 - progress, 3);
        this.camera.position.lerpVectors(bookReturnNear, idealMuseumView, t);
        this.camera.lookAt(bookCenter);

        if (progress < 1.0) {
          this.pullBackAnimId = requestAnimationFrame(animatePullBack);
        } else {
          this.pullBackAnimId = null;
          if (this.cameraManager?.controls) {
            this.cameraManager.controls.target.copy(bookCenter);
            this.cameraManager.controls.update();
            this.cameraManager.controls.enabled = true;
          }
          if (this.cameraController) this.cameraController.isEnabled = true;
          this.isWarping = false;
          console.log('%c🏛️ [MULTI-SCENE] Đã trở về Sảnh Bảo tàng Văn học!', 'color: #39e58c; font-weight: bold;');

          const perf = this.performanceOptimizer || window.performanceOptimizer;
          perf?.startBenchmark?.('SẢNH BẢO TÀNG (HẬU WARP)');
        }
      };
      this.pullBackAnimId = requestAnimationFrame(animatePullBack);
    }, 450);
  }

  // =========================================================================
  // 6. CHUYỂN ĐỔI GIỮA 3 KHÔNG GIAN (SWITCH ZONE)
  // =========================================================================
  switchZone(targetZoneId) {
    if (this.isWarping && this.isInsideWorld === false) return;

    if (!this.isInsideWorld) {
      this.enterStoryWorldWithWarp(targetZoneId);
      return;
    }

    const zoneData = REALM_ZONES[`ZONE_${targetZoneId}`];
    if (!zoneData) return;

    this.currentZoneId = targetZoneId;

    // Cô lập render & lighting: CHỈ hiển thị phân cảnh đang hoạt động
    if (this.zone1Group) this.zone1Group.visible = targetZoneId === 1;
    if (this.zone2Group) this.zone2Group.visible = targetZoneId === 2;
    if (this.zone3Group) this.zone3Group.visible = targetZoneId === 3;
    if (this.zone1Lights) this.zone1Lights.visible = targetZoneId === 1;
    if (this.zone2Lights) this.zone2Lights.visible = targetZoneId === 2;
    if (this.zone3Lights) this.zone3Lights.visible = targetZoneId === 3;

    const worldCamPos = new THREE.Vector3().copy(KIEU_WORLD_ORIGIN).add(zoneData.offset).add(zoneData.cameraPos);
    const worldTargetPos = new THREE.Vector3().copy(KIEU_WORLD_ORIGIN).add(zoneData.offset).add(zoneData.targetPos);

    if (this.cameraManager?.setCustomView) {
      this.cameraManager.setCustomView(worldCamPos, worldTargetPos, true);
    } else {
      this.camera.position.copy(worldCamPos);
      this.camera.lookAt(worldTargetPos);
      if (this.cameraManager?.controls) {
        this.cameraManager.controls.target.copy(worldTargetPos);
        this.cameraManager.controls.update();
      }
    }

    if (this.cameraController) {
      const floorProvider = (x, z) => {
        if (targetZoneId === 2) {
          if (Math.abs(x - (-140)) <= 6.5 && Math.abs(z) <= 6.5) {
            return 4.5; // Cao độ sàn vọng lâu tầng 2
          }
        }
        return 0.0;
      };
      this.cameraController.setFloorHeightProvider?.(floorProvider);
      this.cameraController.floorHeightProvider = floorProvider;
      this.cameraController.velocity?.set?.(0, 0, 0);
    }

    // Áp dụng Fog và Background riêng biệt cho truyenKieuScene (không ảnh hưởng sảnh chính)
    this.truyenKieuScene.fog = new THREE.FogExp2(zoneData.fogColor, zoneData.fogDensity);
    this.truyenKieuScene.background = new THREE.Color(zoneData.skyColor);

    if (this.realmHudElement) {
      this.realmHudElement.querySelectorAll('[data-zone]').forEach((btn) => {
        const zid = parseInt(btn.getAttribute('data-zone'));
        if (zid === targetZoneId) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    this.adaptSoundscapeToZone(targetZoneId);
    console.log(`%c✓ [TRUYEN KIEU] Đã dịch chuyển sang [${zoneData.name}]!`, 'color: #ffd770; font-weight: bold; font-size: 14px;');

    // TỰ ĐỘNG THEO DÕI & ÉP FPS >= 60 KHI ĐỔI PHÂN CẢNH (5 GIÂY LIÊN TỤC)
    const perf = this.performanceOptimizer || window.performanceOptimizer;
    perf?.startBenchmark?.(`THẾ GIỚI KIỀU - ${zoneData.name}`);
  }

  // =========================================================================
  // 7. ÂM THANH KHÔNG GIAN PROCEDURAL (SPATIAL SOUNDSCAPE SYNTH)
  // =========================================================================
  initSpatialSoundSynth() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.audioCtx = new AudioCtx();

      const bufferSize = this.audioCtx.sampleRate * 2;
      const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = noiseBuffer;
    } catch (e) {}
  }

  playWarpDiveSound() {
    try {
      if (!this.audioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.audioCtx = new AudioCtx();
      }
      if (!this.audioCtx) return;
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      const now = this.audioCtx.currentTime;

      // 1. Whoosh wind surge (Filtered noise sweep)
      const bufferSize = Math.floor(this.audioCtx.sampleRate * 0.9);
      const buffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = this.audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(250, now);
      filter.frequency.exponentialRampToValueAtTime(2800, now + 0.65);
      filter.Q.setValueAtTime(3.0, now);

      const gain = this.audioCtx.createGain();
      gain.gain.setValueAtTime(0.01, now);
      gain.gain.exponentialRampToValueAtTime(0.40, now + 0.55);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);
      noise.start(now);

      // 2. Resonant celestial tone rising
      const osc = this.audioCtx.createOscillator();
      const oscGain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.65);

      oscGain.gain.setValueAtTime(0.01, now);
      oscGain.gain.linearRampToValueAtTime(0.22, now + 0.55);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

      osc.connect(oscGain);
      oscGain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.85);

      setTimeout(() => {
        this.playChimeBurst();
      }, 650);
    } catch (e) {}
  }

  playWarpReturnSound() {
    try {
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;

      const osc = this.audioCtx.createOscillator();
      const oscGain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(330, now + 0.6);

      oscGain.gain.setValueAtTime(0.18, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc.connect(oscGain);
      oscGain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.75);
    } catch (e) {}
  }

  playChimeBurst() {
    try {
      if (!this.audioCtx) return;
      const now = this.audioCtx.currentTime;
      [1046.5, 1318.5, 1567.98, 2093.0].forEach((freq, idx) => {
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);

        gain.gain.setValueAtTime(0.10, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.05 + 0.8);

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.85);
      });
    } catch (e) {}
  }

  adaptSoundscapeToZone(zoneId) {
    if (!this.audioCtx || this.audioCtx.state === 'suspended') {
      this.audioCtx?.resume?.().catch(() => {});
    }
    if (zoneId === 2) {
      console.log('%c🌊 [Âm Thanh Lầu Ngưng Bích]: Gió biển u hoài & tiếng sóng vỗ ầm ầm quanh ghế ngồi.', 'color: #82b1ff;');
    } else if (zoneId === 3) {
      console.log('%c⚔️ [Âm Thanh Doanh Trại Từ Hải]: Tiếng lửa than bập bùng & nhịp trống trận uy nghiêm.', 'color: #ff9944;');
    } else {
      console.log('%c🌸 [Âm Thanh Vườn Thúy]: Tiếng suối reo róc rách & tiếng gió thoảng mùa xuân.', 'color: #ffb7c5;');
    }
  }

  // =========================================================================
  // 8. BINDING CONTROLS, RAYCASTING & PHÍM TẮT
  // =========================================================================
  bindControlsAndEvents() {
    // Bắt ESC nhả khóa chuột để thoát cõi Kiều
    document.addEventListener('pointerlockchange', () => {
      if (!document.pointerLockElement && this.isInsideWorld && !this.isWarping) {
        this.exitStoryWorldWithWarp();
      }
    });

    window.addEventListener('keydown', (e) => {
      if ((e.code === 'Escape' || e.key === 'Escape') && this.isInsideWorld && !this.isWarping) {
        this.exitStoryWorldWithWarp();
      } else if (this.isInsideWorld && !this.isWarping) {
        if (e.code === 'Digit1') this.switchZone(1);
        if (e.code === 'Digit2') this.switchZone(2);
        if (e.code === 'Digit3') this.switchZone(3);
      }
    });

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    window.addEventListener('click', (e) => {
      if (!this.isInsideWorld || this.isWarping) return;
      if (e.target.closest('#kieuworld-realm-hud') || e.target.closest('#director-hud') || e.target.closest('#btn-realm-exit-top')) return;

      // Chặn nổi bọt sự kiện click khi ở trong cõi để không ảnh hưởng camera bên ngoài
      e.stopPropagation();

      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, this.camera);
      const targets = this.zoneInteractables?.[this.currentZoneId] || [];
      if (targets.length === 0) return;
      const intersects = raycaster.intersectObjects(targets, true);

      for (let i = 0; i < intersects.length; i++) {
        let obj = intersects[i].object;
        while (obj && obj !== this.worldGroup) {
          // 1. Click vào Cổ Thạch / Gương Quy Hồi -> Dịch chuyển mượt về sảnh bảo tàng
          if (obj.userData?.isReturnPortal) {
            this.exitStoryWorldWithWarp();
            return;
          }
          // 2. Click vào cổng dịch chuyển phân cảnh
          if (obj.userData?.isRealmPortal && obj.userData?.targetZoneId) {
            this.switchZone(obj.userData.targetZoneId);
            return;
          }
          obj = obj.parent;
        }
      }
    });

    // Hover raycaster đổi con trỏ pointer (CHỈ raycast các cổng tương tác thuộc phân cảnh hiện tại)
    window.addEventListener('pointermove', (e) => {
      if (!this.isInsideWorld || !this.worldGroup.visible || this.isWarping) return;
      const targets = this.zoneInteractables?.[this.currentZoneId] || [];
      if (targets.length === 0) return;

      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObjects(targets, true);
      let hitInteractive = false;

      for (let i = 0; i < intersects.length; i++) {
        let obj = intersects[i].object;
        while (obj && obj !== this.worldGroup) {
          if (obj.userData?.isReturnPortal || obj.userData?.isRealmPortal) {
            hitInteractive = true;
            break;
          }
          obj = obj.parent;
        }
        if (hitInteractive) break;
      }

      if (typeof document !== 'undefined' && document.body) {
        document.body.style.cursor = hitInteractive ? 'pointer' : 'default';
      }
    });

    const bindHUD = () => {
      const btn = document.getElementById('btn-enter-kieuworld');
      if (btn && !btn._kieuBound) {
        btn._kieuBound = true;
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.toggleStoryWorld();
        });
      }
    };
    bindHUD();
    setTimeout(bindHUD, 1200);
  }

  toggleStoryWorld() {
    if (this.isWarping) return;

    if (!this.atriumGroup && this.scene) {
      this.atriumGroup = this.scene.getObjectByName('Museum_Atrium_Root');
    }

    if (this.isInsideWorld) {
      this.exitStoryWorldWithWarp();
    } else {
      this.enterStoryWorldWithWarp(this.currentZoneId || 1);
    }
  }

  // =========================================================================
  // 9. UPDATE VÒNG LẶP RENDER & HIỆU ỨNG ĐỘNG (THROTTLED 2-FRAME)
  // =========================================================================
  update(delta, elapsedTime) {
    if (!this.isInsideWorld || !this.worldGroup.visible) return;

    this.particleFrameCounter = (this.particleFrameCounter || 0) + 1;
    if (this.particleFrameCounter % 2 !== 0) return;

    const twoFrameDelta = delta * 2.0;

    if (this.currentZoneId === 1) {
      // 1. Chuyển động hoa rơi ở Zone 1
      if (this.particlesZone1) {
        const pos = this.particlesZone1.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          let y = pos.getY(i) - 0.55 * twoFrameDelta;
          let x = pos.getX(i) + Math.sin(elapsedTime + i) * 0.25 * twoFrameDelta;
          if (y < 0.2) y = 12.0;
          pos.setXY(i, x, y);
        }
        pos.needsUpdate = true;
      }

      // 2. Chuyển động khói hương mộ Đạm Tiên
      if (this.smokeZone1 && this.smokeData) {
        const pos = this.smokeZone1.geometry.attributes.position;
        for (let i = 0; i < this.smokeData.length; i++) {
          const s = this.smokeData[i];
          s.y += s.speed * twoFrameDelta;
          if (s.y > 3.2) s.y = 0.5;
          const driftX = Math.sin(elapsedTime * 2.0 + s.phase) * 0.15 * ((s.y - 0.5) / 2.7);
          const driftZ = Math.cos(elapsedTime * 1.5 + s.phase) * 0.12 * ((s.y - 0.5) / 2.7);
          pos.setXYZ(i, 5.2 + driftX, s.y, -4.5 + driftZ);
        }
        pos.needsUpdate = true;
      }
    } else if (this.currentZoneId === 2) {
      // 3. Thuyền buồm nhấp nhô trên sóng biển Zone 2 (Lầu Ngưng Bích)
      if (this.sailboats) {
        this.sailboats.forEach((b) => {
          b.position.y = (b.userData.baseY || 0.1) + Math.sin(elapsedTime * 1.2 + b.userData.bobPhase) * 0.12;
          b.rotation.z = Math.sin(elapsedTime * 0.9 + b.userData.bobPhase) * 0.04;
          b.updateMatrix();
        });
      }

      // 4. Bụi cát vàng cuộn theo gió ở Zone 2
      if (this.particlesZone2) {
        const pos = this.particlesZone2.geometry.attributes.position;
        for (let i = 0; i < pos.count; i++) {
          let x = pos.getX(i) + 1.8 * twoFrameDelta;
          let y = pos.getY(i) + Math.sin(elapsedTime * 2.5 + i) * 0.1 * twoFrameDelta;
          if (x > 22) x = -22;
          pos.setXY(i, x, y);
        }
        pos.needsUpdate = true;
      }
    } else if (this.currentZoneId === 3) {
      // 5. Cờ xí ngũ sắc tung bay trong gió chiến chinh Zone 3 (GPU vertex shader)
      if (this.flagTimeUniform) {
        this.flagTimeUniform.value = elapsedTime;
      }

      // 6. Ánh lửa trại nhấp nháy sống động Zone 3
      if (this.fireLight) {
        this.fireLight.intensity = 3.6 + Math.sin(elapsedTime * 12.0) * 0.45 + Math.cos(elapsedTime * 17.0) * 0.35;
      }

      // 7. Tàn tro lửa than bay cuộn lên trời đêm Zone 3
      if (this.particlesZone3 && this.sparkData) {
        const pos = this.particlesZone3.geometry.attributes.position;
        for (let i = 0; i < this.sparkData.length; i++) {
          const sp = this.sparkData[i];
          sp.y += sp.speed * twoFrameDelta;
          if (sp.y > 8.5) sp.y = 0.8;
          const sx = Math.sin(elapsedTime * sp.driftSpeed + sp.angle) * 0.6;
          const sz = 4.0 + Math.cos(elapsedTime * sp.driftSpeed + sp.angle) * 0.6;
          pos.setXYZ(i, sx, sp.y, sz);
        }
        pos.needsUpdate = true;
      }
    }

    // 8. Đảm bảo cao độ an toàn cho Walker (Multi-Scene: Tọa độ gốc Y=0)
    const currentZone = REALM_ZONES[`ZONE_${this.currentZoneId}`];
    const minFloorY = KIEU_WORLD_ORIGIN.y + (currentZone?.floorHeight === 4.5 ? 5.8 : 1.8);
    if (this.camera.position.y < minFloorY && !this.isWarping) {
      this.camera.position.y = minFloorY;
    }
  }
}
