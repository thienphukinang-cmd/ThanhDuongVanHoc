import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// ============================================================================
// 1. DỮ LIỆU THUYẾT MINH SỬ THI ÂU LẠC (skill: interactive-lore-guide)
// ============================================================================
export const AN_DUONG_VUONG_LORE = {
  king_statue: {
    title: 'An Dương Vương – Vua Nước Âu Lạc',
    era: 'Thế kỷ III TCN – Kinh đô Cổ Loa',
    poem: '“Chín vòng thành ốc xoay vần đất,\nMột lẫy Kim Quy trấn cõi bờ.”',
    description:
      'Thục Phán An Dương Vương hợp nhất bộ tộc Tây Âu và Lạc Việt, lập nên nước Âu Lạc và dời đô về Phong Khê xây dựng Loa Thành 9 vòng xoắn ốc kiên cố.'
  },
  magic_crossbow: {
    title: 'Nỏ Thần Liên Châu (Linh Quang Kim Quy Thần Cơ)',
    era: 'Bảo vật Quốc gia Âu Lạc',
    poem: '“Vuốt thần Cao Lỗ chế thần cơ,\nMỗi phát tên bay vạn giặc mờ.”',
    description:
      'Tướng quân Cao Lỗ dùng chiếc vuốt của Rùa Vàng Kim Quy làm lẫy nỏ, đặt tên là Linh Quang Kim Quy Thần Cơ. Một lần bóp cò phóng ra hàng vạn mũi tên đồng Cổ Loa, đánh bại quân Triệu Đà xâm lược.'
  },
  kim_quy_lake: {
    title: 'Thần Kim Quy (Thanh Giang Sứ Giả)',
    era: 'Huyền tích Xây Thành Cổ Loa',
    poem: '“Rùa Vàng rẽ sóng hồ Phong Khê,\nTrừ yêu Bạch Kê, giữ trọn thề.”',
    description:
      'Khi thành Cổ Loa đắp cao tới đâu lại lở tới đó, Thần Kim Quy đã hiện lên từ phương Đông, giúp nhà vua trừ tinh Gà Trắng ở núi Thất Diệu và trao vuốt thần trước khi rẽ nước trở về biển.'
  },
  goose_feather_well: {
    title: 'Áo Lông Ngỗng Mỵ Châu & Giếng Ngọc Trọng Thủy',
    era: 'Bi kịch Tình Yêu & Nợ Nước',
    poem: '“Tôi kể ngày xưa chuyện Mỵ Châu,\nTrái tim lầm chỗ để trên đầu,\nNỏ thần vô ý trao tay giặc,\nNên nỗi cơ đồ đắm biển sâu.”',
    description:
      'Dấu lông ngỗng trắng rải dọc đường chạy nạn về biển Dạ Trạch và giếng nước cổ nơi máu Mỵ Châu hóa thành ngọc trai, còn Trọng Thủy gieo mình tự vẫn vì ân hận.'
  }
};

// ============================================================================
// 2. SOBEL NORMAL MAP HỌA TIẾT XOẮN ỐC CỔ LOA & MAI RÙA (skill: ornamental-relief-sculptor)
// ============================================================================
function createCoLoaSpiralReliefMaps(size = 512) {
  const hCanvas = document.createElement('canvas');
  hCanvas.width = size;
  hCanvas.height = size;
  const ctx = hCanvas.getContext('2d');

  ctx.fillStyle = '#181818';
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 7;

  // Vẽ đường xoắn ốc Archimedes 9 vòng biểu trưng Thành Cổ Loa
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

  // Họa tiết mũi tên đồng Cổ Loa tỏa tròn
  ctx.lineWidth = 4;
  for (let i = 0; i < 12; i++) {
    const ang = (i * Math.PI * 2) / 12;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(size * 0.36, -6);
    ctx.lineTo(size * 0.45, 0);
    ctx.lineTo(size * 0.36, 6);
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
  normalMap.needsUpdate = true;

  const bumpMap = new THREE.CanvasTexture(hCanvas);
  bumpMap.colorSpace = THREE.LinearSRGBColorSpace;
  bumpMap.needsUpdate = true;

  return { normalMap, bumpMap };
}

// ============================================================================
// 3. CHUẨN HÓA FILE AN DƯƠNG VƯƠNG .GLB & TẠO HITBOX (skills: blender-3d-asset-pipeline + hitbox-collision-architect)
// ============================================================================
export function normalizeAnDuongVuongModel(gltfScene, targetHeight = 3.6) {
  // Cập nhật ma trận thế giới để tính đúng quaternion [0.7071, 0, 0, 0.7071] của node_0
  gltfScene.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(gltfScene);
  const size = new THREE.Vector3();
  box.getSize(size);

  // Nếu trục chiều cao sau khi xoay vẫn nằm ngang, tự động dựng đứng tượng
  if (size.z > size.y * 1.4) {
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
  gltfScene.position.y -= box.min.y; // Neo đáy tượng chạm chuẩn mặt bệ Y = 0
  gltfScene.updateMatrixWorld(true);

  // Tinh chỉnh vật liệu Material.001 (KHR_materials_specular) để lên ánh đồng/vàng uy nghi
  gltfScene.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material.side = THREE.DoubleSide;
        if (child.material.map) {
          child.material.map.colorSpace = THREE.SRGBColorSpace;
        }
        if (child.material.normalMap) {
          child.material.normalMap.colorSpace = THREE.LinearSRGBColorSpace;
          child.material.normalScale = new THREE.Vector2(1.35, 1.35);
        }
        child.material.envMapIntensity = 1.4;
        child.material.needsUpdate = true;
      }
    }
  });

  return gltfScene;
}

function registerArtifactProxy(targetObj, loreKey, worldGroup, raycastTargets, collisionBoxes, debugHelpers) {
  targetObj.updateMatrixWorld(true);
  const worldBox = new THREE.Box3().setFromObject(targetObj);
  worldBox.expandByScalar(0.1);

  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  worldBox.getSize(size);
  worldBox.getCenter(center);

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

  const helper = new THREE.Box3Helper(worldBox, 0x38bdf8);
  helper.visible = false;
  worldGroup.add(helper);
  debugHelpers.push(helper);
}

// ============================================================================
// 4. HÀM KHỞI TẠO THẾ GIỚI AN DƯƠNG VƯƠNG – THÀNH CỔ LOA 9 VÒNG
// ============================================================================
export function createAnDuongVuongWorld(scene, worldOrigin = new THREE.Vector3(0, 0, 0)) {
  const worldGroup = new THREE.Group();
  worldGroup.name = 'AnDuongVuong_CoLoa_World';
  worldGroup.position.copy(worldOrigin);
  scene.add(worldGroup);

  const raycastTargets = [];
  const collisionBoxes = [];
  const debugHelpers = [];
  const disposableResources = [];

  const { normalMap, bumpMap } = createCoLoaSpiralReliefMaps(512);
  disposableResources.push(normalMap, bumpMap);

  // Bảng vật liệu PBR Chủ Đạo (skill: shader-coloring-artist)
  const matCitadelStone = new THREE.MeshStandardMaterial({
    color: 0x292524,
    roughness: 0.55,
    metalness: 0.25,
    normalMap,
    normalScale: new THREE.Vector2(1.6, 1.6)
  });
  const matAncientBronze = new THREE.MeshStandardMaterial({
    color: 0x3f2e1e,
    metalness: 0.86,
    roughness: 0.30,
    normalMap,
    normalScale: new THREE.Vector2(2.0, 2.0)
  });
  const matDivineGold = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    metalness: 0.94,
    roughness: 0.18,
    emissive: 0x78350f,
    emissiveIntensity: 0.35,
    bumpMap,
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
  const groundGeo = new THREE.CylinderGeometry(28, 30, 0.4, 64);
  const groundMesh = new THREE.Mesh(groundGeo, matCitadelStone);
  groundMesh.position.y = -0.2;
  groundMesh.receiveShadow = true;
  worldGroup.add(groundMesh);
  disposableResources.push(groundGeo);

  // Đĩa Phù Điêu Loa Thành 9 Vòng Xoáy ở trung tâm
  const spiralPlazaGeo = new THREE.CylinderGeometry(6.2, 6.5, 0.08, 64);
  const spiralPlazaMesh = new THREE.Mesh(spiralPlazaGeo, matAncientBronze);
  spiralPlazaMesh.position.y = 0.04;
  spiralPlazaMesh.receiveShadow = true;
  worldGroup.add(spiralPlazaMesh);
  disposableResources.push(spiralPlazaGeo);

  // Dựng các cung tường thành Cổ Loa xoắn ốc chừa lối đi thông suốt (skill: museum-exhibition-curator)
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
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.08,
      bevelThickness: 0.08,
      curveSegments: 32
    });
    const wallMesh = new THREE.Mesh(wallGeo, matCitadelStone);
    wallMesh.rotation.x = -Math.PI / 2;
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    worldGroup.add(wallMesh);
    disposableResources.push(wallGeo);
  });

  // --------------------------------------------------------------------------
  // B. TÂM ĐIỂM ĐÀI CHÍNH ĐIỆN: TƯỢNG ĐÀI AN DƯƠNG VƯƠNG (.GLB) & NỎ THẦN LIÊN CHÂU
  // --------------------------------------------------------------------------
  const altarGroup = new THREE.Group();
  altarGroup.position.set(0, 0, 0);
  worldGroup.add(altarGroup);

  const altarBase1 = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 0.55, 48), matAncientBronze);
  altarBase1.position.y = 0.275;
  const altarBase2 = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.6, 0.50, 48), matCitadelStone);
  altarBase2.position.y = 0.80;
  const altarGoldRim = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.07, 12, 48), matDivineGold);
  altarGoldRim.rotation.x = Math.PI / 2;
  altarGoldRim.position.y = 1.05;
  altarGroup.add(altarBase1, altarBase2, altarGoldRim);

  // Slot đặt mô hình An Dương Vương từ file .glb đã tải lên
  const kingStatueSlot = new THREE.Group();
  kingStatueSlot.position.set(0, 1.05, -0.4);
  altarGroup.add(kingStatueSlot);

  const gltfLoader = new GLTFLoader();
  const loadKingModel = (url, fallbackUrl) => {
    gltfLoader.load(
      url,
      (gltf) => {
        const kingModel = normalizeAnDuongVuongModel(gltf.scene, 3.8);
        kingStatueSlot.add(kingModel);
        registerArtifactProxy(altarGroup, 'king_statue', worldGroup, raycastTargets, collisionBoxes, debugHelpers);
      },
      undefined,
      () => {
        if (fallbackUrl) {
          loadKingModel(fallbackUrl, null);
        } else {
          // Procedural Fallback nếu file chưa copy vào public/models/
          const fallbackKing = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 3.6, 24), matDivineGold);
          fallbackKing.position.y = 1.8;
          kingStatueSlot.add(fallbackKing);
          registerArtifactProxy(altarGroup, 'king_statue', worldGroup, raycastTargets, collisionBoxes, debugHelpers);
        }
      }
    );
  };
  // Ưu tiên tải bản đã nén WebP, tự động lùi về file an_duong_vuong.glb gốc nếu cần
  loadKingModel('/models/an_duong_vuong_web.glb', '/models/an_duong_vuong.glb');

  // Đài Nỏ Thần Liên Châu đặt phía trước An Dương Vương (X = 0, Z = 4.2)
  const crossbowGroup = new THREE.Group();
  crossbowGroup.position.set(0, 0, 4.2);
  worldGroup.add(crossbowGroup);

  gltfLoader.load(
    '/models/no_than_kim_quy.glb',
    (gltf) => {
      const crossbowModel = normalizeAnDuongVuongModel(gltf.scene, 2.1);
      crossbowGroup.add(crossbowModel);
      registerArtifactProxy(crossbowGroup, 'magic_crossbow', worldGroup, raycastTargets, collisionBoxes, debugHelpers);
    },
    undefined,
    () => {
      // Procedural Nỏ Thần Liên Châu với Lẫy Vuốt Rùa Vàng phát sáng
      const cbPedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 0.9, 24), matAncientBronze);
      cbPedestal.position.y = 0.45;
      const cbBow = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.05, 12, 32, Math.PI), matDivineGold);
      cbBow.rotation.x = Math.PI / 2.3;
      cbBow.position.set(0, 1.35, 0.2);
      const cbStock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 1.35), matAncientBronze);
      cbStock.position.set(0, 1.25, 0);
      crossbowGroup.add(cbPedestal, cbBow, cbStock);
      registerArtifactProxy(crossbowGroup, 'magic_crossbow', worldGroup, raycastTargets, collisionBoxes, debugHelpers);
    }
  );

  // --------------------------------------------------------------------------
  // C. PHÂN KHU ĐÔNG: HỒ KIM QUY & RÙA VÀNG HIỂN LINH (X = -6.8, Z = 3.2)
  // --------------------------------------------------------------------------
  const kimQuyGroup = new THREE.Group();
  kimQuyGroup.position.set(-6.8, 0, 3.2);
  worldGroup.add(kimQuyGroup);

  const lakeRim = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.22, 16, 48), matAncientBronze);
  lakeRim.rotation.x = Math.PI / 2;
  lakeRim.position.y = 0.18;
  const lakeWater = new THREE.Mesh(new THREE.CylinderGeometry(2.55, 2.55, 0.15, 48), matJadeWater);
  lakeWater.position.y = 0.12;

  // Rùa Vàng Kim Quy trồi lên giữa hồ nước ngọc bích
  const turtleShell = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 28, 18, 0, Math.PI * 2, 0, Math.PI / 2),
    matDivineGold
  );
  turtleShell.scale.set(0.88, 0.65, 1.18);
  turtleShell.position.y = 0.22;

  const turtleHead = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 16), matDivineGold);
  turtleHead.scale.set(0.85, 0.85, 1.35);
  turtleHead.position.set(0, 0.58, 1.15);

  kimQuyGroup.add(lakeRim, lakeWater, turtleShell, turtleHead);
  registerArtifactProxy(kimQuyGroup, 'kim_quy_lake', worldGroup, raycastTargets, collisionBoxes, debugHelpers);

  // --------------------------------------------------------------------------
  // D. PHÂN KHU TÂY: CON ĐƯỜNG LÔNG NGỖNG MỴ CHÂU & GIẾNG NGỌC TRỌNG THỦY (X = 6.8, Z = 3.2)
  // --------------------------------------------------------------------------
  const wellGroup = new THREE.Group();
  wellGroup.position.set(6.8, 0, 3.2);
  worldGroup.add(wellGroup);

  const wellWall = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.45, 0.95, 32, 1, true), matAncientBronze);
  wellWall.position.y = 0.475;
  const wellTopRim = new THREE.Mesh(new THREE.TorusGeometry(1.38, 0.12, 14, 36), matDivineGold);
  wellTopRim.rotation.x = Math.PI / 2;
  wellTopRim.position.y = 0.95;
  const pearlCore = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 24), matGooseWhite);
  pearlCore.position.y = 1.35;

  wellGroup.add(wellWall, wellTopRim, pearlCore);
  registerArtifactProxy(wellGroup, 'goose_feather_well', worldGroup, raycastTargets, collisionBoxes, debugHelpers);

  // --------------------------------------------------------------------------
  // E. MƯA TÊN ĐỒNG LIÊN CHÂU BẰNG INSTANCEDMESH (skills: mesh-detailing-specialist + fps-optimizer)
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
  worldGroup.add(arrowInstanced);
  disposableResources.push(arrowGeo);

  // --------------------------------------------------------------------------
  // F. BẦU KHÍ QUYỂN HUYỀN SỬ, GOD RAYS & HẠT LÔNG NGỖNG BAY (skill: environment-lighting-artist)
  // --------------------------------------------------------------------------
  const kingSpotLight = new THREE.SpotLight(0xfde047, 6.2, 26, Math.PI / 5, 0.4, 1.4);
  kingSpotLight.position.set(0, 11.5, 4.5);
  kingSpotLight.target = altarGroup;
  kingSpotLight.castShadow = true;
  worldGroup.add(kingSpotLight);

  const kimQuyGlow = new THREE.PointLight(0x2dd4bf, 3.5, 12, 1.6);
  kimQuyGlow.position.set(-6.8, 1.8, 3.2);
  worldGroup.add(kimQuyGlow);

  // Luồng sáng God Rays chiếu xuống tượng An Dương Vương & Nỏ Thần
  const godRayGeo = new THREE.CylinderGeometry(1.4, 4.2, 12.0, 28, 1, true);
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

  // Hệ thống hạt Lông Ngỗng Trắng Mỵ Châu & Hào Quang Kim Quy
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

  const featherMat = new THREE.PointsMaterial({
    color: 0xf8fafc,
    size: 0.13,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const featherParticles = new THREE.Points(featherGeo, featherMat);
  featherParticles.userData.ignoreRaycaster = true;
  worldGroup.add(featherParticles);
  disposableResources.push(featherGeo, featherMat);

  // --------------------------------------------------------------------------
  // G. VÒNG LẶP ANIMATION, SLIDING COLLISION & DỌN BỘ NHỚ
  // --------------------------------------------------------------------------
  function update(deltaTime, elapsedTime = 0) {
    // Chuyển động Rùa Vàng nhấp nhô trên mặt Hồ Kim Quy & Viên Ngọc Trai lơ lửng
    turtleShell.position.y = 0.22 + Math.sin(elapsedTime * 1.8) * 0.05;
    turtleHead.position.y = 0.58 + Math.sin(elapsedTime * 1.8 + 0.4) * 0.06;
    pearlCore.position.y = 1.35 + Math.sin(elapsedTime * 2.4) * 0.10;

    // Lông ngỗng trắng rơi nhẹ và xoay theo chiều gió xoắn ốc Cổ Loa
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
          nextPos.addScaledVector(pushDir, 0.08);
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
    dispose
  };
}