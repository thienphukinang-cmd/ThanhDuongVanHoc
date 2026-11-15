// voNhatWorld.js — BỜ ĐÊ XÓM NGỤ CƯ & LÁ CỜ ĐỎ SAO VÀNG PHÁ KHO THÓC
// Master Open-World Realm for "Vợ Nhặt – Kim Lân (1945)" (60+ FPS, Zero Allocation)
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * 4-PART ACADEMIC HISTORICAL LORE (VỢ NHẶT - KIM LÂN 1945)
 */
export const VO_NHAT_LORE = {
  famine_context: {
    title: 'Bối cảnh nạn đói Ất Dậu 1945 & Tình huống "Nhặt vợ"',
    period: 'Mùa xuân năm 1945 | Nạn đói lịch sử hơn 2 triệu đồng bào tử nạn',
    summary: 'Tình huống truyện độc đáo chưa từng có trong lịch sử văn học: người ta có thể "nhặt" được vợ như nhặt cọng rơm rác giữa đường.',
    content: 'Nạn đói khủng khiếp năm 1945 ùa vào xóm ngụ cư như một cơn bão đen tối. Giữa ranh giới mong manh của cái chết, anh cu Tràng đẩy xe bò thóc tình cờ buông câu hò đùa, rồi nhặt được một người vợ chỉ sau bốn bát bánh đúc. Một cuộc hôn nhân lạ lùng, vừa tủi cực vừa tràn đầy ánh sáng của tình người cưu mang.'
  },
  trang_and_wife: {
    title: 'Nhân vật Tràng & Người Vợ Nhặt – Khát vọng hạnh phúc',
    period: 'Xóm ngụ cư nghèo khó ven ngoại thành',
    summary: 'Sự biến đổi tâm lý kỳ diệu từ những con người cùng khổ, tìm thấy ý nghĩa cuộc đời khi có gia đình.',
    content: 'Từ một gã trai nghèo thô kệch, Tràng bỗng thấy mình nên người, có trách nhiệm gắn bó với ngôi nhà và mảnh vườn. Người vợ nhặt từ chỗ chao chát, trơ trẽn vì miếng ăn đã trở về đúng thiên chức người phụ nữ hiền hậu, đúng mực. Tình yêu thương đã xua tan mùi tử khí bao trùm khắp xóm ngụ cư.'
  },
  mrs_tu_meal: {
    title: 'Bà cụ Tứ & Bữa cơm ngày đói đẫm nước mắt',
    period: 'Căn nhà tranh ba gian xiêu vẹo trong đêm tân hôn',
    summary: 'Tấm lòng người mẹ bao dung, nuốt nước mắt đón dâu mới và nồi cháo cám ấm áp tình thân.',
    content: 'Bà cụ Tứ hiện thân cho vẻ đẹp vĩ đại của người mẹ Việt Nam nghèo khó. Bà mừng cho con, nhưng xót xa cho duyên kiếp. Bữa cơm đón dâu chỉ có mâm rau chuối, muối trắng và nồi cháo cám đắng chát nghẹn ứ ở cổ họng, nhưng tràn ngập những câu chuyện tương lai về đàn gà sinh sôi.'
  },
  revolutionary_flag: {
    title: 'Hình ảnh Lá Cờ Đỏ Sao Vàng & Con đường cách mạng',
    period: 'Khởi sắc phong trào Việt Minh phá kho thóc Nhật cứu đói',
    summary: 'Kết thúc mở đầy lạc quan: Ánh sáng cách mạng dẫn dắt những người cùng khổ đổi đời.',
    content: 'Trong tiếng trống thúc thuế dồn dập và đàn quạ bay liệng như đám mây đen, trong óc Tràng hiện lên hình ảnh đoàn người đói ầm ầm kéo nhau đi phá kho thóc của Nhật, phía trước là lá cờ đỏ sao vàng bay phấp phới. Đó là dự báo tất yếu về một cuộc đổi đời vĩ đại của toàn thể dân tộc.'
  }
};

function prepGeo(geo) {
  if (!geo) return geo;
  try {
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();

    // Khử triệt để NaN / Infinity để bảo vệ pipeline WebGL
    const posAttr = geo.attributes?.position;
    if (posAttr) {
      const arr = posAttr.array;
      const len = posAttr.count * posAttr.itemSize;
      for (let i = 0; i < len; i++) {
        if (!Number.isFinite(arr[i])) arr[i] = 0;
      }
      posAttr.needsUpdate = true;
    }
    const normAttr = geo.attributes?.normal;
    if (normAttr) {
      const arr = normAttr.array;
      const len = normAttr.count * normAttr.itemSize;
      for (let i = 0; i < len; i++) {
        if (!Number.isFinite(arr[i])) arr[i] = 0;
      }
      normAttr.needsUpdate = true;
    }
  } catch (_) {}
  return geo;
}

/**
 * Tạo Texture Lá Cờ Đỏ Sao Vàng chuẩn tỷ lệ Quốc kỳ (512x340)
 * Khắc phục triệt để lỗi tách rời sao vàng khỏi cờ khi animate sóng gió (Zero clipping)
 */
function createVietnameseFlagTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 340; // Tỉ lệ 3:2 chuẩn
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // 1. Nền cờ đỏ thắm cách mạng (#d32020)
  ctx.fillStyle = '#cc1818';
  ctx.fillRect(0, 0, 512, 340);

  // Vân sợi dệt vải cờ
  ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
  for (let y = 0; y < 340; y += 4) {
    ctx.fillRect(0, y, 512, 2);
  }

  // 2. Ngôi sao vàng năm cánh ở tâm chính xác
  const cx = 256;
  const cy = 170;
  const R = 82; // Bán kính ngoài
  const r = 31.5; // Bán kính trong

  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? R : r;
    const x = cx + Math.cos(angle) * rad;
    const y = cy + Math.sin(angle) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  // Đổ màu vàng rực rỡ với gradient chiều sâu
  const starGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, R);
  starGrad.addColorStop(0, '#fff176');
  starGrad.addColorStop(0.7, '#ffd600');
  starGrad.addColorStop(1, '#ffab00');
  ctx.fillStyle = starGrad;
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 171, 0, 0.6)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

/**
 * Hạt sương mù mùa đông mờ viền (Radial Gradient Canvas Texture)
 */
function createMistTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.clearRect(0, 0, 128, 128);
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
  grad.addColorStop(0.0, 'rgba(215, 220, 225, 0.65)');
  grad.addColorStop(0.4, 'rgba(180, 185, 195, 0.35)');
  grad.addColorStop(0.75, 'rgba(140, 145, 155, 0.12)');
  grad.addColorStop(1.0, 'rgba(120, 125, 135, 0.0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  return tex;
}

/**
 * Hình học cây mùa đông khẳng khiu gãy góc (Trunk + 3 Branches merged)
 */
function createBarrenWinterTreeGeo() {
  const parts = [];

  // Thân chính khẳng khiu, hơi nghiêng tự nhiên
  const trunkGeo = new THREE.CylinderGeometry(0.13, 0.25, 5.8, 8);
  trunkGeo.translate(0, 2.9, 0);
  parts.push(trunkGeo);

  // Cành lớn vươn chéo sang trái
  const b1Geo = new THREE.CylinderGeometry(0.065, 0.12, 2.6, 6);
  b1Geo.rotateZ(0.68);
  b1Geo.translate(-0.85, 4.3, 0.15);
  parts.push(b1Geo);

  // Cành vươn chéo sang phải
  const b2Geo = new THREE.CylinderGeometry(0.055, 0.10, 2.3, 6);
  b2Geo.rotateZ(-0.72);
  b2Geo.rotateY(0.4);
  b2Geo.translate(0.8, 4.1, -0.2);
  parts.push(b2Geo);

  // Ngọn cành khô vút cao
  const b3Geo = new THREE.CylinderGeometry(0.03, 0.07, 1.8, 6);
  b3Geo.rotateZ(0.32);
  b3Geo.translate(-1.4, 5.3, 0.3);
  parts.push(b3Geo);

  let merged = null;
  try {
    merged = mergeGeometries(parts, false);
  } catch (_) {
    merged = trunkGeo;
  }
  return prepGeo(merged || trunkGeo);
}

export class VoNhatWorld {
  constructor(scene, camera, renderer) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.group = new THREE.Group();
    this.group.name = 'VoNhat_Realm_World_Group';
    this.disposables = [];
    this.animatedObjects = [];
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    this.scene.add(this.group);
    this.disposables.push(this.group);

    // 1. Bầu trời & Sương mù khí quyển (Chiều đông đói kém chuyển giao bình minh cách mạng)
    this.scene.background = new THREE.Color(0x181008);
    this.scene.fog = new THREE.FogExp2(0x23170e, 0.0022);

    // 2. Con đường đất Xóm Ngụ Cư uốn lượn lên triền đê
    this.buildTerrainAndPath();

    // 3. Hàng cây khô khẳng khiu trụi lá mùa đông 1945 (InstancedMesh gnarled branches)
    this.buildBarrenTrees();

    // 4. Những mái nhà tranh tiêu điều hai bên đường
    this.buildDilapidatedHuts();

    // 5. Đỉnh đê: Lá cờ đỏ sao vàng tung bay phấp phới & Kho thóc Nhật
    this.buildDikeAndRevolutionFlag();

    // 6. VFX Lớp sương lạnh là là mặt đất (Soft CanvasTexture Particles)
    this.buildWinterMist();

    // 7. Ánh sáng cõi mở Chiaroscuro (Đông lạnh đối lập Bình minh cách mạng)
    this.buildLighting();

    this.initialized = true;
    console.log('[VoNhatWorld] Open-world realm initialized successfully.');
  }

  buildTerrainAndPath() {
    // Đất nện gồ ghề triền đê
    const terrainGeo = prepGeo(new THREE.PlaneGeometry(150, 190, 42, 42));
    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getY(i);
      // Triền đê dâng cao uy nghi ở phía xa (Z < -20)
      if (z < -20) {
        const heightFactor = Math.min(14.0, (-z - 20) * 0.32);
        // Sống đê ở giữa hơi vồng lên tạo lối mòn
        const x = pos.getX(i);
        const roadCrown = Math.max(0, 1.2 - Math.abs(x) * 0.08);
        pos.setZ(i, heightFactor + roadCrown + (Math.random() - 0.5) * 0.30);
      } else {
        pos.setZ(i, (Math.random() - 0.5) * 0.25);
      }
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0x3d2817,
      roughness: 0.92,
      metalness: 0.04
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.name = 'VN_Realm_Dike_Terrain';
    terrain.rotation.x = -Math.PI / 2;
    terrain.position.set(0, 0, -40);
    terrain.receiveShadow = true;
    terrain.userData.isWalkableFloor = true;
    terrain.userData.isTeleportFloor = true;
    terrain.userData.ignoreRaycaster = true;
    this.group.add(terrain);
    this.disposables.push(terrain);
  }

  buildBarrenTrees() {
    // Cây khô gãy góc, gnarled bare branches của mùa đông Ất Dậu 1945
    const treeGeo = createBarrenWinterTreeGeo();
    const treeMat = new THREE.MeshStandardMaterial({
      color: 0x24170f,
      roughness: 0.96,
      metalness: 0.0
    });

    const treeCount = 36;
    const instancedTrees = new THREE.InstancedMesh(treeGeo, treeMat, treeCount);
    instancedTrees.name = 'VN_Realm_Barren_Trees_Instanced';
    const dummy = new THREE.Matrix4();
    const pos = new THREE.Vector3();
    const rot = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    for (let i = 0; i < treeCount; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const x = side * (6.5 + Math.random() * 16.0);
      const z = 24.0 - i * 4.4;
      const y = z < -20 ? (-z - 20) * 0.32 + 0.1 : 0.0;
      pos.set(x, y, z);

      const euler = new THREE.Euler(
        (Math.random() - 0.5) * 0.15,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.18
      );
      rot.setFromEuler(euler);

      const s = 0.85 + Math.random() * 0.35;
      scale.set(s, s, s);

      dummy.compose(pos, rot, scale);
      instancedTrees.setMatrixAt(i, dummy);
    }
    instancedTrees.instanceMatrix.needsUpdate = true;
    instancedTrees.userData.ignoreRaycaster = true;
    instancedTrees.castShadow = true;
    this.group.add(instancedTrees);
    this.disposables.push(instancedTrees);
  }

  buildDilapidatedHuts() {
    const hutWallMat = new THREE.MeshStandardMaterial({ color: 0x4a2f20, roughness: 0.88 });
    const thatchMat = new THREE.MeshStandardMaterial({ color: 0x6d4c38, roughness: 0.95 });

    for (let i = 0; i < 6; i++) {
      const hutGroup = new THREE.Group();
      hutGroup.name = `VN_Dilapidated_Hut_${i + 1}`;
      const side = i % 2 === 0 ? -1 : 1;
      const z = 14.0 - i * 14.0;
      const y = z < -20 ? (-z - 20) * 0.32 : 0;
      hutGroup.position.set(side * (13.5 + Math.random() * 3.0), y, z);
      hutGroup.rotation.y = side * (0.3 + Math.random() * 0.2);

      // Thân nhà vách đất liếp nứa
      const bodyGeo = prepGeo(new THREE.BoxGeometry(4.4, 2.4, 3.6));
      const bodyMesh = new THREE.Mesh(bodyGeo, hutWallMat);
      bodyMesh.position.y = 1.2;
      hutGroup.add(bodyMesh);

      // Mái tranh rạ dốc xiêu vẹo
      const roofGeo = prepGeo(new THREE.ConeGeometry(3.6, 1.4, 4));
      const roofMesh = new THREE.Mesh(roofGeo, thatchMat);
      roofMesh.rotation.y = Math.PI / 4;
      roofMesh.position.y = 3.0;
      hutGroup.add(roofMesh);

      hutGroup.traverse((c) => {
        c.userData.ignoreRaycaster = true;
      });

      this.group.add(hutGroup);
      this.disposables.push(hutGroup);
    }
  }

  buildDikeAndRevolutionFlag() {
    // Đỉnh đê rực sáng: Cột cờ và Lá cờ đỏ sao vàng
    const flagGroup = new THREE.Group();
    flagGroup.name = 'RedFlag_Revolution_Beacon_Realm';
    flagGroup.position.set(0, 14.2, -88);
    this.group.add(flagGroup);
    this.disposables.push(flagGroup);

    // Cột tre cao 8.5m mộc mạc
    const poleGeo = prepGeo(new THREE.CylinderGeometry(0.08, 0.13, 8.5, 12));
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x7c6e4e, roughness: 0.72 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 4.25;
    pole.castShadow = true;
    pole.userData.ignoreRaycaster = true;
    flagGroup.add(pole);

    // Lá Cờ Đỏ Sao Vàng tung bay phấp phới
    // Sử dụng CanvasTexture tích hợp trực tiếp cờ đỏ và sao vàng để loại bỏ hoàn toàn hiện tượng lệch/clip sao
    const flagGeo = prepGeo(new THREE.PlaneGeometry(3.8, 2.5, 24, 16));
    const flagTex = createVietnameseFlagTexture();
    const flagMat = new THREE.MeshStandardMaterial({
      map: flagTex,
      color: 0xffffff,
      roughness: 0.55,
      metalness: 0.05,
      emissive: new THREE.Color(0x3a0808),
      side: THREE.DoubleSide
    });
    const flagMesh = new THREE.Mesh(flagGeo, flagMat);
    flagMesh.name = 'VN_Revolution_Red_Flag_Mesh';
    flagMesh.position.set(1.90, 6.4, 0);
    flagMesh.castShadow = true;
    flagMesh.userData.ignoreRaycaster = true;
    flagGroup.add(flagMesh);

    // Điểm sáng đỏ rực rỡ từ lá cờ soi rọi đỉnh đê
    const flagLight = new THREE.PointLight(0xff3322, 6.0, 36.0, 1.3);
    flagLight.name = 'VN_Flag_PointLight_Beacon';
    flagLight.position.set(1.90, 6.6, 0.8);
    flagLight.userData.ignoreRaycaster = true;
    flagGroup.add(flagLight);

    const flagGoldGlow = new THREE.PointLight(0xffaa00, 3.5, 20.0, 1.4);
    flagGoldGlow.position.set(1.90, 6.6, -0.8);
    flagGoldGlow.userData.ignoreRaycaster = true;
    flagGroup.add(flagGoldGlow);

    // ══════════════════════════════════════════════════════════════════════════
    // KHO THÓC NHẬT Ở SƯỜN ĐÊ (Kiến trúc nhà kho quân sự Nhật Bản 1945)
    // ══════════════════════════════════════════════════════════════════════════
    const warehouseGroup = new THREE.Group();
    warehouseGroup.name = 'Japanese_Grain_Warehouse';
    warehouseGroup.position.set(13.5, 2.2, -14.0);
    flagGroup.add(warehouseGroup);

    // Thân nhà kho gỗ lim sẫm màu
    const timberMat = new THREE.MeshStandardMaterial({ color: 0x362117, roughness: 0.85 });
    const whBodyGeo = prepGeo(new THREE.BoxGeometry(10.5, 4.4, 8.2));
    const whBody = new THREE.Mesh(whBodyGeo, timberMat);
    whBody.position.y = 2.2;
    warehouseGroup.add(whBody);

    // Mái ngói dốc kép kiểu Nhật (Dual-pitched Roof)
    const roofTileMat = new THREE.MeshStandardMaterial({ color: 0x1f1a18, roughness: 0.70 });
    const roofLeftGeo = prepGeo(new THREE.BoxGeometry(6.4, 0.30, 9.4));
    const roofLeft = new THREE.Mesh(roofLeftGeo, roofTileMat);
    roofLeft.rotation.z = 0.38;
    roofLeft.position.set(-2.5, 5.1, 0);
    warehouseGroup.add(roofLeft);

    const roofRightGeo = prepGeo(new THREE.BoxGeometry(6.4, 0.30, 9.4));
    const roofRight = new THREE.Mesh(roofRightGeo, roofTileMat);
    roofRight.rotation.z = -0.38;
    roofRight.position.set(2.5, 5.1, 0);
    warehouseGroup.add(roofRight);

    // Cổng gỗ kho thóc kiên cố gia cố then sắt khóa ngoài
    const gateMat = new THREE.MeshStandardMaterial({ color: 0x22150f, roughness: 0.90 });
    const gateGeo = prepGeo(new THREE.BoxGeometry(3.2, 3.2, 0.25));
    const gateMesh = new THREE.Mesh(gateGeo, gateMat);
    gateMesh.position.set(-5.3, 1.6, 0);
    gateMesh.rotation.y = Math.PI / 2;
    warehouseGroup.add(gateMesh);

    // Then cài sắt ngang cửa
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, metalness: 0.8, roughness: 0.4 });
    const barGeo = prepGeo(new THREE.BoxGeometry(0.18, 0.20, 3.0));
    const barMesh = new THREE.Mesh(barGeo, ironMat);
    barMesh.position.set(-5.45, 1.7, 0);
    warehouseGroup.add(barMesh);

    // Các bao thóc xếp trước cửa kho
    const bagMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.85 });
    for (let bx = -1.2; bx <= 1.2; bx += 0.8) {
      const bagGeo = prepGeo(new THREE.BoxGeometry(0.70, 0.42, 0.50));
      const bagMesh = new THREE.Mesh(bagGeo, bagMat);
      bagMesh.position.set(-5.8, 0.21, bx);
      warehouseGroup.add(bagMesh);
    }

    warehouseGroup.traverse((c) => {
      c.userData.ignoreRaycaster = true;
    });

    this.animatedObjects.push({
      type: 'flag',
      flagGeo,
      originalPos: flagGeo.attributes.position.clone()
    });
  }

  buildWinterMist() {
    // VFX hạt sương lạnh mờ viền là là mặt đất xóm ngụ cư
    const mistCount = 70;
    const mistGeo = prepGeo(new THREE.BufferGeometry());
    const mistPositions = new Float32Array(mistCount * 3);
    const mistPhases = new Float32Array(mistCount);

    for (let i = 0; i < mistCount; i++) {
      mistPositions[i * 3] = (Math.random() - 0.5) * 85.0;
      mistPositions[i * 3 + 1] = 0.6 + Math.random() * 3.2;
      mistPositions[i * 3 + 2] = 20.0 - Math.random() * 115.0;
      mistPhases[i] = Math.random() * Math.PI * 2;
    }
    mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPositions, 3));

    const mistTex = createMistTexture();
    const mistMat = new THREE.PointsMaterial({
      map: mistTex,
      color: 0xc8d0d8,
      size: 3.2,
      transparent: true,
      opacity: 0.40,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
    const mistPoints = new THREE.Points(mistGeo, mistMat);
    mistPoints.name = 'VN_Realm_Winter_Mist';
    mistPoints.userData.ignoreRaycaster = true;
    mistPoints.userData.phases = mistPhases;
    this.group.add(mistPoints);
    this.disposables.push(mistPoints);

    this.animatedObjects.push({
      type: 'mist',
      mistPoints
    });
  }

  buildLighting() {
    // 1. HemisphereLight chiều đông đói kém xám lạnh, tương phản gắt gao với ánh bình minh
    const hemiLight = new THREE.HemisphereLight(0x76828d, 0x1f1914, 0.60);
    hemiLight.userData.ignoreRaycaster = true;
    this.group.add(hemiLight);

    // 2. DirectionalLight bình minh cách mạng từ chân trời phía sau đê
    const dawnLight = new THREE.DirectionalLight(0xff6a3d, 2.2);
    dawnLight.position.set(15, 22, -105);
    dawnLight.castShadow = true;
    dawnLight.userData.ignoreRaycaster = true;
    this.group.add(dawnLight);

    // 3. Ánh sáng vàng dịu soi dọc con đường đất
    const pathLight = new THREE.PointLight(0xffb066, 2.0, 45.0, 1.4);
    pathLight.position.set(0, 6.0, 5.0);
    pathLight.userData.ignoreRaycaster = true;
    this.group.add(pathLight);
  }

  update(delta, elapsedTime, camera) {
    // Flag wave wave motion (Zero Allocation, organic double-harmonic wind ripple)
    for (let obj of this.animatedObjects) {
      if (obj.type === 'flag') {
        const { flagGeo, originalPos } = obj;
        const pos = flagGeo.attributes.position;
        const orig = originalPos.array;
        const arr = pos.array;
        const count = pos.count;
        for (let i = 0; i < count; i++) {
          const x = orig[i * 3];
          const y = orig[i * 3 + 1];
          // Sóng chính thổi từ cột cờ ra mép + rung động vi sợi mép cờ
          const wave =
            (Math.sin(elapsedTime * 4.4 + x * 2.2) * 0.18 +
              Math.sin(elapsedTime * 8.2 + y * 3.1) * 0.05) *
            (x / 3.8);
          arr[i * 3 + 2] = wave;
        }
        pos.needsUpdate = true;
      } else if (obj.type === 'mist') {
        // Sương mù trôi lững lờ nhẹ nhàng
        const points = obj.mistPoints;
        const posAttr = points.geometry.attributes.position;
        const phases = points.userData.phases;
        const arr = posAttr.array;
        const count = phases.length;
        for (let i = 0; i < count; i++) {
          const xIdx = i * 3;
          const yIdx = i * 3 + 1;
          arr[xIdx] += Math.sin(elapsedTime * 0.5 + phases[i]) * 0.006;
          arr[yIdx] += Math.cos(elapsedTime * 0.8 + phases[i]) * 0.002;
        }
        posAttr.needsUpdate = true;
      }
    }
  }

  dispose() {
    this.disposables.forEach((d) => {
      d.traverse?.((c) => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          if (Array.isArray(c.material)) c.material.forEach((m) => m?.dispose());
          else c.material.dispose();
        }
      });
      if (d.geometry) d.geometry.dispose();
      if (d.material) {
        if (Array.isArray(d.material)) d.material.forEach((m) => m?.dispose());
        else d.material.dispose();
      }
    });
    this.disposables = [];
    this.animatedObjects = [];
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
    this.initialized = false;
  }
}
