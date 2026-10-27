import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGroupMeshesByMaterial, mergeAllMeshesIntoSingleUnifiedMesh, disposeHierarchy } from '../utils/geometryMerger.js';

// Tọa độ biệt lập trên cao của toàn cõi Thế giới Truyện Kiều (cách biệt 120m trên nóc bảo tàng)
export const KIEU_WORLD_ORIGIN = new THREE.Vector3(0, 150, 0);

// Tọa độ 3 Phân Cảnh (cách nhau 140m, hoàn toàn không chồng lấn tầm nhìn)
export const REALM_ZONES = {
  ZONE_1: {
    id: 1,
    name: 'Vườn Thúy & Tiết Thanh Minh',
    poem: 'Cỏ non xanh tận chân trời / Cành lê trắng điểm một vài bông hoa',
    offset: new THREE.Vector3(0, 0, 0),
    cameraPos: new THREE.Vector3(0, 1.8, 5.5),
    targetPos: new THREE.Vector3(0.5, 1.6, -0.5),
    fogColor: 0x142032,
    fogDensity: 0.005,
    skyColor: 0x142032,
    floorHeight: 150.0
  },
  ZONE_2: {
    id: 2,
    name: 'Lầu Ngưng Bích Cửa Bể',
    poem: 'Buồn trông cửa bể chiều hôm / Thuyền ai thấp thoáng cánh buồm xa xa',
    offset: new THREE.Vector3(-140, 0, 0),
    cameraPos: new THREE.Vector3(-140, 5.8, 4.2), // Trên vọng lâu tầng 2 nhìn ra biển
    targetPos: new THREE.Vector3(-140, 5.2, -18.0),
    fogColor: 0x1c1a2e,
    fogDensity: 0.006,
    skyColor: 0x181628,
    floorHeight: 154.5 // Cao độ sàn vọng lâu
  },
  ZONE_3: {
    id: 3,
    name: 'Doanh Trại Từ Hải',
    poem: 'Trướng hùm mở giữa phù vân / Triệu binh nghiêm ngặt muôn phần uy linh',
    offset: new THREE.Vector3(140, 0, 0),
    cameraPos: new THREE.Vector3(140, 2.2, 9.5), // Trước bệ soái trướng ngắm lửa trại & cờ xí
    targetPos: new THREE.Vector3(140, 2.0, -1.0),
    fogColor: 0x241408,
    fogDensity: 0.005,
    skyColor: 0x221208,
    floorHeight: 150.0
  }
};

/**
 * THƯ VIỆN VẬT LIỆU PBR CHUẨN THREE.JS CHO CẢNH TIẾT THANH MINH (PHÂN CẢNH 1)
 */
export const ThanhMinhMaterials = {
  ground: new THREE.MeshStandardMaterial({
    color: 0x2b4c22,
    roughness: 0.85,
    metalness: 0.05,
    name: 'TM_Mat_Ground'
  }),
  bark: new THREE.MeshStandardMaterial({
    color: 0x3d2314,
    roughness: 0.88,
    metalness: 0.08,
    name: 'TM_Mat_Bark'
  }),
  pearBlossom: new THREE.MeshStandardMaterial({
    color: 0xf5e1e5,
    roughness: 0.55,
    metalness: 0.02,
    name: 'TM_Mat_PearBlossom'
  }),
  peachBlossom: new THREE.MeshStandardMaterial({
    color: 0xffb7c5,
    roughness: 0.55,
    metalness: 0.02,
    name: 'TM_Mat_PeachBlossom'
  }),
  leaf: new THREE.MeshStandardMaterial({
    color: 0x345c22,
    roughness: 0.65,
    metalness: 0.05,
    name: 'TM_Mat_Leaf'
  }),
  water: new THREE.MeshStandardMaterial({
    color: 0x114444,
    roughness: 0.10,
    metalness: 0.35,
    transparent: true,
    opacity: 0.88,
    name: 'TM_Mat_Water'
  }),
  stone: new THREE.MeshStandardMaterial({
    color: 0x5a6358,
    roughness: 0.82,
    metalness: 0.10,
    name: 'TM_Mat_Stone'
  }),
  woodRed: new THREE.MeshStandardMaterial({
    color: 0x5c1d18,
    roughness: 0.65,
    metalness: 0.10,
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

    // TỐI ƯU HÓA ĐỔ BÓNG: Chỉ thân cây, mộ Đạm Tiên, cầu gỗ và khối đá lớn mới castShadow
    // Tán hoa lê/đào, lá, mặt nước và địa hình chỉ receiveShadow để cắt giảm 80% shadow passes
    const isMajorShadowCaster =
      matName.includes('vocay') || meshName.includes('trunk') || meshName.includes('root') ||
      meshName.includes('bridge') || meshName.includes('plank') || meshName.includes('tomb') ||
      (matName.includes('daco') && !meshName.includes('pebble'));

    child.castShadow = isMajorShadowCaster;
    child.receiveShadow = true;

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
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(22, 12, 8, 0.90)';
  ctx.fillRect(16, 16, 992, 480);
  ctx.strokeStyle = '#dfb746';
  ctx.lineWidth = 10;
  ctx.strokeRect(24, 24, 976, 464);

  ctx.fillStyle = '#ffd97d';
  ctx.font = 'bold 44px "Georgia", serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 512, 130);

  ctx.fillStyle = '#fff5e4';
  ctx.font = 'italic 34px "Georgia", serif';
  ctx.fillText(`"${poemLine1}"`, 512, 255);
  ctx.fillText(`"${poemLine2}"`, 512, 325);

  ctx.fillStyle = '#c99738';
  ctx.font = '24px sans-serif';
  ctx.fillText(subTitle, 512, 425);

  const tex = new THREE.CanvasTexture(canvas);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(4.2, 2.1),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
  );
  mesh.userData.excludeFromCollision = true;
  return mesh;
}

function createPortalWaypoint(targetZoneId, title, subText) {
  const group = new THREE.Group();
  group.name = `Portal_To_Zone_${targetZoneId}`;

  const baseMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.4, 0.35, 8),
    new THREE.MeshStandardMaterial({ color: 0x3d3830, roughness: 0.85 })
  );
  baseMesh.position.y = 0.17;
  baseMesh.userData.excludeFromCollision = true;
  group.add(baseMesh);

  const steleGeo = new THREE.BoxGeometry(1.1, 2.2, 0.18);
  const steleMat = new THREE.MeshStandardMaterial({
    color: 0x484236,
    roughness: 0.75,
    metalness: 0.1
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
  const runeMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.6, 2.6),
    new THREE.MeshBasicMaterial({ map: runeTex, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  runeMesh.rotation.x = -Math.PI / 2;
  runeMesh.position.y = 0.36;
  runeMesh.userData.excludeFromCollision = true;
  group.add(runeMesh);

  const light = new THREE.PointLight(0xffdf80, 2.0, 6.0);
  light.position.set(0, 1.5, 0.5);
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
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.35, metalness: 0.25 })
  );
  base.position.y = 0.22;
  base.userData.excludeFromCollision = true;
  group.add(base);

  // 2. Vành gương cổ bằng đồng vàng
  const mirrorRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.75, 0.08, 16, 32),
    new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.25, metalness: 0.85 })
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
  const mirrorMesh = new THREE.Mesh(
    mirrorGeo,
    new THREE.MeshStandardMaterial({
      map: mirrorTex,
      emissive: new THREE.Color(0x1b6ca8),
      emissiveIntensity: 0.65,
      roughness: 0.1,
      metalness: 0.4,
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
  constructor(scene, camera, cameraController, atriumGroup = null) {
    this.scene = scene;
    this.camera = camera;
    this.cameraManager = cameraController?.controls ? cameraController : (cameraController?.cameraManager || null);
    this.cameraController = cameraController?.cameraController || cameraController;
    this.atriumGroup = atriumGroup || scene?.getObjectByName?.('Museum_Atrium_Root') || null;

    // Phân cảnh hiện tại (Mặc định: 1 - Vườn Thúy & Thanh Minh)
    this.currentZoneId = 1;
    this.isInsideWorld = false;
    this.isWarping = false; // Khóa chống spam click / phím trong khi hiệu ứng bay đang diễn ra

    // 1. ROOT WORLD GROUP BIỆT LẬP TRÊN CAO (Y = 150m)
    this.worldGroup = new THREE.Group();
    this.worldGroup.name = 'TruyenKieu_Three_Realms';
    this.worldGroup.position.copy(KIEU_WORLD_ORIGIN);
    this.worldGroup.visible = false;

    this.savedPos = new THREE.Vector3(-44.5, 11.8, 19.0);
    this.savedTarget = new THREE.Vector3(-48.0, 11.2, 19.0);
    this.savedFog = null;
    this.savedBackground = null;

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

    this.worldGroup.add(this.zone1Group, this.zone2Group, this.zone3Group);

    this.initGlobalSkyAndWater();
    this.initZone1VuonThuy();
    this.initZone2LauNgungBich();
    this.initZone3DoanhTraiTuHai();
    this.initFloatingRealmNavigatorHUD();
    this.createWarpOverlayUI();
    this.initSpatialSoundSynth();
    this.bindControlsAndEvents();

    this.worldGroup.traverse((c) => {
      c.userData.excludeFromCollision = true;
    });
    this.scene.add(this.worldGroup);
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
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x091c28,
      emissive: 0x030f18,
      roughness: 0.14,
      metalness: 0.82
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
    groundMesh.receiveShadow = true;
    groundMesh.matrixAutoUpdate = false;
    groundMesh.updateMatrix();
    group.add(groundMesh);

    // 2. MẶT NƯỚC SUỐI TRONG NGỌC BÍCH
    const riverGeo = new THREE.PlaneGeometry(8, 64, 1, 8);
    riverGeo.rotateX(-Math.PI / 2);
    const riverMesh = new THREE.Mesh(riverGeo, ThanhMinhMaterials.water);
    riverMesh.position.y = -0.32;
    riverMesh.receiveShadow = true;
    riverMesh.matrixAutoUpdate = false;
    riverMesh.updateMatrix();
    group.add(riverMesh);

    // 3. CẦU GỖ UỐN CONG BẮC NGANG SUỐI
    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.set(0.5, 0.1, 0.0);
    const bridgeDeck = new THREE.Mesh(
      new THREE.BoxGeometry(9.0, 0.22, 2.6),
      ThanhMinhMaterials.woodRed
    );
    bridgeDeck.position.y = 0.45;
    bridgeDeck.castShadow = true;
    bridgeGroup.add(bridgeDeck);

    const railMat = ThanhMinhMaterials.woodRed;
    const leftRail = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.14, 0.14), railMat);
    leftRail.position.set(0, 1.15, -1.2);
    const rightRail = new THREE.Mesh(new THREE.BoxGeometry(9.0, 0.14, 0.14), railMat);
    rightRail.position.set(0, 1.15, 1.2);
    bridgeGroup.add(leftRail, rightRail);
    bridgeGroup.matrixAutoUpdate = false;
    bridgeGroup.updateMatrix();
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
    stele.castShadow = true;
    tombGroup.add(mound, stele);
    tombGroup.matrixAutoUpdate = false;
    tombGroup.updateMatrix();
    group.add(tombGroup);

    // 5. CÂY CỔ THỤ HOA LÊ & ĐÀO HỒNG (5 Cây cách điệu Low-poly ~200 vertices)
    const treePositions = [
      { x: -9.5, z: -8.0, mat: ThanhMinhMaterials.pearBlossom, s: 1.2 },
      { x: -11.0, z: 9.0, mat: ThanhMinhMaterials.peachBlossom, s: 1.1 },
      { x: 10.5, z: -10.0, mat: ThanhMinhMaterials.peachBlossom, s: 1.3 },
      { x: 12.0, z: 7.5, mat: ThanhMinhMaterials.pearBlossom, s: 1.15 },
      { x: -14.0, z: 0.5, mat: ThanhMinhMaterials.pearBlossom, s: 1.0 }
    ];

    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.65, 4.2, 8);
    const canopyGeo = new THREE.IcosahedronGeometry(2.4, 1);

    treePositions.forEach((tp) => {
      const tree = new THREE.Group();
      tree.position.set(tp.x, 0, tp.z);
      tree.scale.setScalar(tp.s);

      const trunk = new THREE.Mesh(trunkGeo, ThanhMinhMaterials.bark);
      trunk.position.y = 2.1;
      trunk.castShadow = true;

      const canopy = new THREE.Mesh(canopyGeo, tp.mat);
      canopy.position.y = 4.5;
      canopy.scale.set(1.3, 0.9, 1.3);

      tree.add(trunk, canopy);
      tree.matrixAutoUpdate = false;
      tree.updateMatrix();
      group.add(tree);
    });

    // 6. ĐÁ CUỘI SUỐI (12 hòn đá low-poly)
    const rockGeo = new THREE.DodecahedronGeometry(0.55, 0);
    const rockMat = ThanhMinhMaterials.stone;
    for (let r = 0; r < 12; r++) {
      const rock = new THREE.Mesh(rockGeo, rockMat);
      const rz = (r - 6) * 4.5;
      const rx = Math.sin(rz * 0.15) * 4.0 + (r % 2 === 0 ? 2.2 : -2.2);
      rock.position.set(rx, -0.2, rz);
      rock.matrixAutoUpdate = false;
      rock.updateMatrix();
      group.add(rock);
    }

    group.matrixAutoUpdate = false;
    group.updateMatrix();
    return group;
  }

  initZone1VuonThuy() {
    this.zone1Lights = new THREE.Group();
    const ambient1 = new THREE.AmbientLight(0xfff6ec, 1.8);
    const sun1 = new THREE.DirectionalLight(0xffecd0, 2.6);
    sun1.position.set(18, 35, 14);
    sun1.castShadow = true;
    sun1.shadow.mapSize.width = 1024;
    sun1.shadow.mapSize.height = 1024;
    sun1.shadow.bias = -0.0005;
    this.sun1 = sun1;

    const fill1 = new THREE.DirectionalLight(0xb0d8ff, 1.2);
    fill1.position.set(-16, 25, -14);

    const bridgeLight = new THREE.PointLight(0xffd580, 2.5, 18);
    bridgeLight.position.set(0.5, 3.2, 0.0);

    const tombLight = new THREE.PointLight(0xd0e8ff, 2.8, 18);
    tombLight.position.set(5.2, 2.5, -4.5);

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

    const pCount = 180;
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

    const sCount = 20;
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
  }

  // =========================================================================
  // 2. KHÔNG GIAN 2: LẦU NGƯNG BÍCH (CÔ ĐỘC, TIÊU ĐIỀU, SÓNG GIÓ CỬA BỂ)
  // =========================================================================
  initZone2LauNgungBich() {
    this.zone2Lights = new THREE.Group();
    const ambient2 = new THREE.AmbientLight(0xd4c0e6, 1.4);
    const sun2 = new THREE.DirectionalLight(0xff7744, 2.5);
    sun2.position.set(-20, 25, -25);
    sun2.castShadow = false; // Tối ưu hóa: Hoàng hôn biển chiều dùng ánh sáng bán cầu, không sinh shadow pass

    const lanternLight1 = new THREE.PointLight(0xffa542, 2.8, 14);
    lanternLight1.position.set(0, 5.2, 0);

    const oceanRimLight = new THREE.DirectionalLight(0x4a75a0, 1.5);
    oceanRimLight.position.set(25, 15, 20);

    this.zone2Lights.add(ambient2, sun2, lanternLight1, oceanRimLight);
    this.zone2Group.add(this.zone2Lights);

    const cliffGeo = new THREE.CylinderGeometry(14, 18, 4.0, 16);
    const cliffMat = new THREE.MeshStandardMaterial({
      color: 0x363a38,
      roughness: 0.92,
      metalness: 0.12
    });
    const cliffMesh = new THREE.Mesh(cliffGeo, cliffMat);
    cliffMesh.position.y = 1.9;
    cliffMesh.userData.excludeFromCollision = true;
    this.zone2Group.add(cliffMesh);

    const sandGeo = new THREE.RingGeometry(14, 28, 32);
    const sandMat = new THREE.MeshStandardMaterial({
      color: 0xbaa16e,
      roughness: 0.95,
      metalness: 0.05,
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
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x4a4740, roughness: 0.85 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.3;
    pavilionGroup.add(baseMesh);

    const colMat = new THREE.MeshStandardMaterial({ color: 0x342922, roughness: 0.85 });
    const colCoords = [
      [-3.6, -3.6], [0, -3.6], [3.6, -3.6],
      [-3.6, 3.6], [0, 3.6], [3.6, 3.6],
      [-3.6, 0], [3.6, 0]
    ];
    colCoords.forEach(([cx, cz]) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.22, 3.2, 12), colMat);
      col.position.set(cx, 2.2, cz);
      pavilionGroup.add(col);
    });

    const roof1Geo = new THREE.ConeGeometry(7.2, 1.8, 4);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x3b3d3c, roughness: 0.78 });
    const roof1 = new THREE.Mesh(roof1Geo, roofMat);
    roof1.rotation.y = Math.PI / 4;
    roof1.position.y = 4.4;
    pavilionGroup.add(roof1);

    const floor2Geo = new THREE.BoxGeometry(6.6, 0.35, 6.6);
    const floor2 = new THREE.Mesh(floor2Geo, baseMat);
    floor2.position.y = 4.6;
    pavilionGroup.add(floor2);

    [[-2.4, -2.4], [2.4, -2.4], [-2.4, 2.4], [2.4, 2.4]].forEach(([cx, cz]) => {
      const col2 = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 2.6, 12), colMat);
      col2.position.set(cx, 5.9, cz);
      pavilionGroup.add(col2);
    });

    const railMat = new THREE.MeshStandardMaterial({ color: 0x5a231b, roughness: 0.65 });
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
      new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.8 })
    );
    gourdTop.position.y = 8.9;
    pavilionGroup.add(gourdTop);

    const chairMat = new THREE.MeshStandardMaterial({ color: 0x42261a, roughness: 0.75 });
    const kieuChair = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.6), chairMat);
    kieuChair.position.set(0, 5.0, 0.6);
    pavilionGroup.add(kieuChair);

    const teaTable = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.55, 12), chairMat);
    teaTable.position.set(0, 5.0, -0.4);
    pavilionGroup.add(teaTable);

    const luteBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.32, 0.8, 12),
      new THREE.MeshStandardMaterial({ color: 0xb57842, roughness: 0.45 })
    );
    luteBody.scale.set(1.0, 1.0, 0.35);
    luteBody.position.set(0.45, 5.25, -0.3);
    luteBody.rotation.z = 0.45;
    pavilionGroup.add(luteBody);

    const lanternMat = new THREE.MeshStandardMaterial({ color: 0xffaa33, emissive: 0xff8811, emissiveIntensity: 1.2 });
    [[-2.4, 7.0, -2.4], [2.4, 7.0, -2.4], [-2.4, 7.0, 2.4], [2.4, 7.0, 2.4]].forEach(([lx, ly, lz]) => {
      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 12), lanternMat);
      lantern.scale.set(0.9, 1.3, 0.9);
      lantern.position.set(lx, ly, lz);
      pavilionGroup.add(lantern);
    });

    this.zone2Group.add(pavilionGroup);

    this.sailboats = [];
    const createSailboat = (bx, by, bz, scale, rotY) => {
      const boatGroup = new THREE.Group();
      boatGroup.position.set(bx, by, bz);
      boatGroup.rotation.y = rotY;

      const hullGeo = new THREE.BoxGeometry(1.6 * scale, 0.5 * scale, 4.2 * scale);
      const hull = new THREE.Mesh(hullGeo, new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.8 }));
      boatGroup.add(hull);

      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * scale, 0.08 * scale, 3.2 * scale, 8), colMat);
      mast.position.y = 1.6 * scale;
      boatGroup.add(mast);

      const sailGeo = new THREE.PlaneGeometry(1.8 * scale, 2.4 * scale);
      const sailMat = new THREE.MeshStandardMaterial({
        color: 0xdfd4be,
        roughness: 0.85,
        side: THREE.DoubleSide
      });
      const sail = new THREE.Mesh(sailGeo, sailMat);
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

    const sandPCount = 120;
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

    const fill3 = new THREE.DirectionalLight(0xffcc88, 1.2);
    fill3.position.set(-18, 20, -15);

    this.zone3Lights.add(ambient3, sun3, this.fireLight, fill3);
    this.zone3Group.add(this.zone3Lights);

    const groundGeo = new THREE.CylinderGeometry(24, 25, 0.5, 24);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x3d3224,
      roughness: 0.95,
      metalness: 0.05
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.position.y = 0.25;
    this.zone3Group.add(groundMesh);

    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x453123, roughness: 0.9 });
    for (let i = 0; i < 38; i++) {
      const ang = (i * Math.PI * 2) / 38;
      if (ang > 0.85 * Math.PI && ang < 1.15 * Math.PI) continue;

      const px = Math.cos(ang) * 22;
      const pz = Math.sin(ang) * 22;
      const stake = new THREE.Mesh(new THREE.ConeGeometry(0.18, 2.4, 8), fenceMat);
      stake.position.set(px, 1.6, pz);
      stake.rotation.x = (Math.random() - 0.5) * 0.12;
      stake.rotation.z = (Math.random() - 0.5) * 0.12;
      this.zone3Group.add(stake);
    }

    const tentGroup = new THREE.Group();
    tentGroup.position.set(0, 0.5, -6.5);

    const platGeo = new THREE.BoxGeometry(14, 0.6, 11);
    const platMat = new THREE.MeshStandardMaterial({ color: 0x4d3928, roughness: 0.85 });
    const plat = new THREE.Mesh(platGeo, platMat);
    plat.position.y = 0.3;
    tentGroup.add(plat);

    const tentRoofGeo = new THREE.ConeGeometry(8.2, 5.8, 6);
    const tentRoofMat = new THREE.MeshStandardMaterial({
      color: 0x6e1616,
      roughness: 0.72,
      metalness: 0.15
    });
    const tentRoof = new THREE.Mesh(tentRoofGeo, tentRoofMat);
    tentRoof.rotation.y = Math.PI / 6;
    tentRoof.position.y = 5.2;
    tentGroup.add(tentRoof);

    const goldTrim = new THREE.Mesh(
      new THREE.CylinderGeometry(6.6, 6.7, 0.25, 6),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.35, metalness: 0.85 })
    );
    goldTrim.rotation.y = Math.PI / 6;
    goldTrim.position.y = 2.4;
    tentGroup.add(goldTrim);

    const wallGeo = new THREE.CylinderGeometry(6.4, 6.4, 2.2, 6, 1, true);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x581212, roughness: 0.8, side: THREE.DoubleSide });
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
    const tigerMat = new THREE.MeshStandardMaterial({ map: tigerTex, roughness: 0.8 });
    const tigerCouch = new THREE.Mesh(couchGeo, tigerMat);
    tigerCouch.position.set(0, 0.95, -1.8);
    tentGroup.add(tigerCouch);

    const deskGeo = new THREE.BoxGeometry(3.2, 0.65, 1.2);
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x2e1d14, roughness: 0.65 });
    const desk = new THREE.Mesh(deskGeo, deskMat);
    desk.position.set(0, 0.92, 0.4);
    tentGroup.add(desk);

    const scrollGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
    const scrollMat = new THREE.MeshStandardMaterial({ color: 0xe5d8be, roughness: 0.9 });
    const mapScroll = new THREE.Mesh(scrollGeo, scrollMat);
    mapScroll.rotation.z = Math.PI / 2;
    mapScroll.position.set(0, 1.3, 0.4);
    tentGroup.add(mapScroll);

    this.zone3Group.add(tentGroup);

    const daoGroup = new THREE.Group();
    daoGroup.position.set(4.8, 0.5, -4.5);

    const bladePole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, 3.8, 10),
      new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.7 })
    );
    bladePole.position.y = 1.9;
    daoGroup.add(bladePole);

    const bladeGeo = new THREE.BoxGeometry(0.04, 1.6, 0.42);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xd8e0e8, metalness: 0.92, roughness: 0.18 });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.set(0, 3.4, 0.12);
    daoGroup.add(blade);
    this.zone3Group.add(daoGroup);

    const drumMat = new THREE.MeshStandardMaterial({ color: 0x8a241c, roughness: 0.7 });
    const drumHeadMat = new THREE.MeshStandardMaterial({ color: 0xe5ceaa, roughness: 0.85 });
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

      this.zone3Group.add(drumGroup);
    });

    this.flags = [];
    const createFlag = (fx, fz, colorHex, flagText = '') => {
      const flagGroup = new THREE.Group();
      flagGroup.position.set(fx, 0.5, fz);

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.10, 6.8, 8), fenceMat);
      pole.position.y = 3.4;
      flagGroup.add(pole);

      const flagGeo = new THREE.PlaneGeometry(2.4, 1.6, 12, 6);
      let flagMat;
      if (flagText) {
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
        flagMat = new THREE.MeshStandardMaterial({ map: ftex, roughness: 0.85, side: THREE.DoubleSide });
      } else {
        flagMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.85, side: THREE.DoubleSide });
      }

      const flagMesh = new THREE.Mesh(flagGeo, flagMat);
      flagMesh.position.set(1.2, 5.8, 0);
      flagGroup.add(flagMesh);

      flagMesh.userData.origPositions = flagGeo.attributes.position.clone();
      this.flags.push(flagMesh);
      this.zone3Group.add(flagGroup);
    };

    createFlag(-6.8, -4.5, 0x8b1818, '徐');
    createFlag(6.8, -4.5, 0x8b1818, '徐');
    createFlag(-14.0, 4.0, 0xd4af37);
    createFlag(14.0, 4.0, 0x1b4f72);
    createFlag(-11.0, 11.0, 0x196f3d);
    createFlag(11.0, 11.0, 0x212f3d);

    const fireGroup = new THREE.Group();
    fireGroup.position.set(0, 0.5, 4.0);

    for (let i = 0; i < 10; i++) {
      const a = (i * Math.PI * 2) / 10;
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 1.8, 8), fenceMat);
      log.position.set(Math.cos(a) * 0.45, 0.55, Math.sin(a) * 0.45);
      log.rotation.x = Math.sin(a) * 0.45;
      log.rotation.z = -Math.cos(a) * 0.45;
      fireGroup.add(log);
    }

    const emberMat = new THREE.MeshBasicMaterial({ color: 0xff3300 });
    const ember = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65), emberMat);
    ember.position.y = 0.5;
    fireGroup.add(ember);
    this.zone3Group.add(fireGroup);

    [[-3.8, 2.0], [3.8, 2.0], [-3.8, 8.0], [3.8, 8.0]].forEach(([tx, tz]) => {
      const bGroup = new THREE.Group();
      bGroup.position.set(tx, 0.5, tz);

      const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.8, 8), fenceMat);
      stand.position.y = 0.9;
      bGroup.add(stand);

      const bowl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.15, 0.35, 10),
        new THREE.MeshStandardMaterial({ color: 0x1f1f1f, metalness: 0.8, roughness: 0.3 })
      );
      bowl.position.y = 1.95;
      bGroup.add(bowl);

      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.55, 8),
        new THREE.MeshBasicMaterial({ color: 0xff7700 })
      );
      flame.position.y = 2.3;
      bGroup.add(flame);

      const bLight = new THREE.PointLight(0xff7711, 2.0, 10);
      bLight.position.set(0, 2.4, 0);
      bGroup.add(bLight);

      this.zone3Group.add(bGroup);
    });

    const sparkCount = 80;
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
          🏛️ Về Bảo Tàng
        </button>
      `;

      // Nút thoát nhanh góc trên bên phải khi ở trong cõi Kiều
      let topExit = document.getElementById('btn-realm-exit-top');
      if (!topExit) {
        topExit = document.createElement('button');
        topExit.id = 'btn-realm-exit-top';
        topExit.innerHTML = '🏛️ VỀ BẢO TÀNG';
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
   */
  enterStoryWorldWithWarp(targetZoneId = 1) {
    if (this.isWarping) return;
    this.isWarping = true;
    this.currentZoneId = targetZoneId;

    // 1. Lưu lại vị trí và góc nhìn hiện tại trong bảo tàng
    this.savedPos = this.camera.position.clone();
    if (this.cameraManager?.controls) {
      this.savedTarget = this.cameraManager.controls.target.clone();
    }
    this.savedFog = this.scene.fog;
    this.savedBackground = this.scene.background;

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

    // Kích hoạt overlay chớp sáng vàng kim
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
        // TẠI ĐỈNH CHỚP SÁNG (PEAK FLASH): ÂM THẦM DỊCH CHUYỂN LÊN KHÔNG GIAN TRUYỆN KIỀU TRÊN CAO
        this.isInsideWorld = true;

        // Ẩn bảo tàng & hiện cõi Kiều (Giải phóng Draw Calls sảnh bảo tàng)
        if (this.atriumGroup) this.atriumGroup.visible = false;
        this.worldGroup.visible = true;
        this.performanceOptimizer?.isolateWorldState?.(true);

        // Đặt camera vào phân cảnh tương ứng
        this.switchZone(targetZoneId);

        if (this.realmHudElement) this.realmHudElement.style.display = 'flex';
        if (this.topExitElement) this.topExitElement.style.display = 'block';

        const enterBtn = document.getElementById('btn-enter-kieuworld');
        if (enterBtn) {
          enterBtn.innerHTML = '🏛️ Trở Về Sảnh Bảo Tàng';
          enterBtn.style.borderColor = '#39e58c';
        }

        // FADE-IN MÀN HÌNH MỞ RA CHÂN TRỜI THIÊN NHIÊN
        setTimeout(() => {
          this.hideWarpOverlay();
          setTimeout(() => {
            if (this.cameraManager?.controls) this.cameraManager.controls.enabled = true;
            if (this.cameraController) this.cameraController.isEnabled = true;
            this.isWarping = false;

            // TỰ ĐỘNG THEO DÕI & ÉP FPS >= 60 KHI BƯỚC VÀO THẾ GIỚI TRUYỆN KIỀU (5 GIÂY LIÊN TỤC)
            const perf = this.performanceOptimizer || window.performanceOptimizer;
            perf?.startBenchmark?.(`THẾ GIỚI KIỀU (${zoneName})`);
          }, 650);
        }, 150);
      }
      this.warpAnimId = this.warpAnimId || null;
    };
    this.warpAnimId = requestAnimationFrame(animateDive);
  }

  /**
   * CÚ BAY NGƯỢC LẠI (QUAY VỀ BẢO TÀNG): THU NHỎ -> DỊCH CHUYỂN SÁT SÁCH -> BAY LÙI RA
   */
  exitStoryWorldWithWarp() {
    if (this.isWarping) return;
    this.isWarping = true;

    if (document.exitPointerLock) document.exitPointerLock();
    if (this.cameraManager?.controls) this.cameraManager.controls.enabled = false;
    if (this.cameraController) this.cameraController.isEnabled = false;

    this.playWarpReturnSound();

    this.showWarpOverlay(
      'active',
      '🏛️ ĐANG TRỞ VỀ BẢO TÀNG VĂN HỌC... 🏛️',
      'PHÒNG TRƯNG BÀY 01 • BỤC SÁCH NGUYỄN DU'
    );

    const bookCenter = new THREE.Vector3(-48.0, 11.20, 19.0);
    const bookReturnNear = new THREE.Vector3(-47.15, 11.35, 19.0);
    const idealMuseumView = (this.savedPos && this.savedPos.y < 35.0) 
      ? this.savedPos 
      : new THREE.Vector3(-44.5, 11.8, 19.0);

    setTimeout(() => {
      this.isInsideWorld = false;

      // Ẩn thế giới Kiều & hiện lại bảo tàng (Giải phóng Draw Calls cõi Kiều)
      this.worldGroup.visible = false;
      if (this.atriumGroup) this.atriumGroup.visible = true;
      this.performanceOptimizer?.isolateWorldState?.(false);

      if (this.realmHudElement) this.realmHudElement.style.display = 'none';
      if (this.topExitElement) this.topExitElement.style.display = 'none';

      this.scene.fog = this.savedFog || new THREE.FogExp2(0xd6e5f0, 0.0015);
      this.scene.background = this.savedBackground || new THREE.Color(0xd6e5f0);

      if (this.cameraController) {
        this.cameraController.setFloorHeightProvider?.(null);
        this.cameraController.floorHeightProvider = null;
        this.cameraController.velocity?.set?.(0, 0, 0);
      }

      // Đặt camera sát mặt cuốn sách
      this.camera.position.copy(bookReturnNear);
      this.camera.lookAt(bookCenter);

      const enterBtn = document.getElementById('btn-enter-kieuworld');
      if (enterBtn) {
        enterBtn.innerHTML = '🌸 Cổng Dịch Chuyển: Truyện Kiều (Click Sách)';
        enterBtn.style.borderColor = '#ff99bb';
      }

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
          console.log('%c🏛️ Đã trở về Không gian Bảo tàng Văn học!', 'color: #39e58c; font-weight: bold;');

          // TỰ ĐỘNG THEO DÕI & ÉP FPS >= 60 KHI QUAY VỀ SẢNH BẢO TÀNG (5 GIÂY LIÊN TỤC)
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
      this.cameraController.setFloorHeightProvider?.((x, z) => {
        if (Math.abs(x - (-140)) < 5.0 && Math.abs(z) < 5.0) {
          return 154.5;
        }
        return 150.0;
      });
      this.cameraController.velocity?.set?.(0, 0, 0);
    }

    this.scene.fog = new THREE.FogExp2(zoneData.fogColor, zoneData.fogDensity);
    this.scene.background = new THREE.Color(zoneData.skyColor);

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
    console.log(`%c✓ Đã dịch chuyển sang [${zoneData.name}]!`, 'color: #ffd770; font-weight: bold; font-size: 14px;');

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
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyG') {
        this.toggleStoryWorld();
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

      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObjects(this.worldGroup.children, true);

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

    // Hover raycaster đổi con trỏ pointer khi rà trúng vật phẩm quy hồi hoặc cổng dịch chuyển
    window.addEventListener('pointermove', (e) => {
      if (!this.isInsideWorld || this.isWarping) return;
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObjects(this.worldGroup.children, true);
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
  // 9. UPDATE VÒNG LẶP RENDER & HIỆU ỨNG ĐỘNG
  // =========================================================================
  update(delta, elapsedTime) {
    if (!this.isInsideWorld || !this.worldGroup.visible) return;

    // 1. Chuyển động hoa rơi ở Zone 1
    if (this.particlesZone1) {
      const pos = this.particlesZone1.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) - 0.55 * delta;
        let x = pos.getX(i) + Math.sin(elapsedTime + i) * 0.25 * delta;
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
        s.y += s.speed * delta;
        if (s.y > 3.2) s.y = 0.5;
        const driftX = Math.sin(elapsedTime * 2.0 + s.phase) * 0.15 * ((s.y - 0.5) / 2.7);
        const driftZ = Math.cos(elapsedTime * 1.5 + s.phase) * 0.12 * ((s.y - 0.5) / 2.7);
        pos.setXYZ(i, 5.2 + driftX, s.y, -4.5 + driftZ);
      }
      pos.needsUpdate = true;
    }

    // 3. Thuyền buồm nhấp nhô trên sóng biển Zone 2 (Lầu Ngưng Bích)
    if (this.sailboats) {
      this.sailboats.forEach((b) => {
        b.position.y = (b.userData.baseY || 0.1) + Math.sin(elapsedTime * 1.2 + b.userData.bobPhase) * 0.12;
        b.rotation.z = Math.sin(elapsedTime * 0.9 + b.userData.bobPhase) * 0.04;
      });
    }

    // 4. Bụi cát vàng cuộn theo gió ở Zone 2
    if (this.particlesZone2) {
      const pos = this.particlesZone2.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i) + 1.8 * delta;
        let y = pos.getY(i) + Math.sin(elapsedTime * 2.5 + i) * 0.1 * delta;
        if (x > 22) x = -22;
        pos.setXY(i, x, y);
      }
      pos.needsUpdate = true;
    }

    // 5. Cờ xí ngũ sắc tung bay trong gió chiến chinh Zone 3 (Doanh Trại Từ Hải)
    if (this.flags) {
      this.flags.forEach((f) => {
        const geo = f.geometry;
        const pos = geo.attributes.position;
        const orig = f.userData.origPositions;
        for (let i = 0; i < pos.count; i++) {
          const ox = orig.getX(i);
          const oy = orig.getY(i);
          const oz = orig.getZ(i);
          const waveFactor = (ox / 2.4);
          const zWave = Math.sin(elapsedTime * 5.5 + ox * 3.0) * 0.18 * waveFactor;
          pos.setXYZ(i, ox, oy, oz + zWave);
        }
        pos.needsUpdate = true;
      });
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
        sp.y += sp.speed * delta;
        if (sp.y > 8.5) sp.y = 0.8;
        const sx = Math.sin(elapsedTime * sp.driftSpeed + sp.angle) * 0.6;
        const sz = 4.0 + Math.cos(elapsedTime * sp.driftSpeed + sp.angle) * 0.6;
        pos.setXYZ(i, sx, sp.y, sz);
      }
      pos.needsUpdate = true;
    }

    // 8. Đảm bảo cao độ an toàn cho Walker
    const currentZone = REALM_ZONES[`ZONE_${this.currentZoneId}`];
    const minFloorY = KIEU_WORLD_ORIGIN.y + (currentZone?.floorHeight === 154.5 ? 5.8 : 1.8);
    if (this.camera.position.y < minFloorY && !this.isWarping) {
      this.camera.position.y = minFloorY;
    }
  }
}
