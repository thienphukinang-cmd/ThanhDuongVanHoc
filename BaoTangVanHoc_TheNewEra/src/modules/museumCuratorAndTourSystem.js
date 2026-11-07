import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const curatorGltfLoader = new GLTFLoader();

/**
 * ============================================================================
 * MUSEUM CURATOR, CULTURAL HERITAGE & EDUCATIONAL AUTO-TOUR DIRECTOR
 * ============================================================================
 * Tích hợp bộ 3 kỹ năng chuyên ngành Bảo Tàng:
 * 1. cultural-heritage-modeler:
 *    - Bệ đá bát giác kết hợp 12 cánh sen vàng (InstancedMesh)
 *    - Cổng vòm mái đao cong vút cổ truyền, Hoành Phi sơn son thếp vàng & Đôi Câu Đối chữ quốc ngữ thư pháp
 * 2. museum-exhibition-curator:
 *    - Cụm trưng bày chuẩn bảo tàng quốc gia: Bệ Hoa Sen, 4 cọc vàng căng dây nhung đỏ (R = 1.65m)
 *    - Bảng thông tin nghiêng 20° chuẩn tầm mắt (Y = 1.05m)
 *    - Phễu sáng Spotlight chiếu điểm từ trần xuống hiện vật
 * 3. educational-tour-guide-director:
 *    - Thanh HUD điều khiển dưới đáy màn hình (phím tắt T, ESC, phím chuyển điểm)
 *    - Camera bay mượt mà bằng lerpVectors & slerpQuaternions qua Đại Sảnh Trống Đồng và 4 phòng chuyên đề
 *    - Tự động dừng 7 giây trước hiện vật, kích hoạt MuseumSpatialAudioDirector và hiển thị MuseumInteractiveLoreGuide
 * ============================================================================
 */

const HERITAGE_TEX_CACHE = {};

function getHeritageCanvasTexture(key, w, h, drawFn) {
  if (HERITAGE_TEX_CACHE[key]) return HERITAGE_TEX_CACHE[key];
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, w, h);

  const tex = new THREE.CanvasTexture(canvas);
  if ('colorSpace' in tex && THREE.SRGBColorSpace) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  HERITAGE_TEX_CACHE[key] = tex;
  return tex;
}

/**
 * ============================================================================
 * 1. CULTURAL HERITAGE MODELER: BỆ ĐÁ BÁT GIÁC 12 CÁNH SEN VÀNG
 * ============================================================================
 */

/**
 * Tạo bệ đá bát giác kết hợp 12 cánh sen vàng bằng InstancedMesh để kê các hiện vật văn học
 * Tự động đồng bộ và nạp model Blender 16 cánh chạm nổi PBR (lotus_pedestal_high.glb)
 */
export function createLotusHeritagePedestal({
  height = 1.25,
  baseRadius = 0.85,
  accentColor = 0xfacc15,
  useHighPolyGlb = true,
  glbUrl = '/model/heritage/lotus_pedestal_high.glb'
} = {}) {
  const pedestalGroup = new THREE.Group();
  pedestalGroup.name = 'Heritage_Lotus_Pedestal';
  pedestalGroup.userData.ignoreRaycaster = true;

  const proceduralHolder = new THREE.Group();
  proceduralHolder.name = 'Procedural_Lotus_Pedestal_Mesh';
  proceduralHolder.userData.ignoreRaycaster = true;
  pedestalGroup.add(proceduralHolder);

  // 1. Chân đế bát giác đá xanh Thanh Hóa (Octagonal Carved Stone Base)
  const baseGeo = new THREE.CylinderGeometry(baseRadius * 0.94, baseRadius * 1.12, height * 0.22, 8);
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.5,
    metalness: 0.2
  });
  const baseMesh = new THREE.Mesh(baseGeo, stoneMat);
  baseMesh.position.y = height * 0.11;
  baseMesh.userData.ignoreRaycaster = true;
  proceduralHolder.add(baseMesh);

  // Vành gờ đế bát giác giật cấp (Stepped Tier)
  const stepGeo = new THREE.CylinderGeometry(baseRadius * 0.84, baseRadius * 0.96, height * 0.08, 8);
  const stepMesh = new THREE.Mesh(stepGeo, stoneMat);
  stepMesh.position.y = height * 0.23;
  stepMesh.userData.ignoreRaycaster = true;
  proceduralHolder.add(stepMesh);

  // 2. Thân trụ chạm khắc sơn son thếp vàng & gỗ trắc cổ
  const columnGeo = new THREE.CylinderGeometry(baseRadius * 0.54, baseRadius * 0.65, height * 0.52, 16);
  const lacquerMat = new THREE.MeshStandardMaterial({
    color: 0x661010,
    roughness: 0.25,
    metalness: 0.45
  });
  const columnMesh = new THREE.Mesh(columnGeo, lacquerMat);
  columnMesh.position.y = height * 0.51;
  columnMesh.userData.ignoreRaycaster = true;
  proceduralHolder.add(columnMesh);

  // Vành chỉ vàng quanh eo trụ
  const ringGoldMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.2,
    metalness: 0.88,
    emissive: 0x713f12,
    emissiveIntensity: 0.35
  });
  const waistRing = new THREE.Mesh(
    new THREE.TorusGeometry(baseRadius * 0.59, 0.028, 12, 24),
    ringGoldMat
  );
  waistRing.rotation.x = Math.PI / 2;
  waistRing.position.y = height * 0.51;
  waistRing.userData.ignoreRaycaster = true;
  proceduralHolder.add(waistRing);

  // 3. Đài sen vàng 12 cánh sen xếp vòng đối xứng bằng InstancedMesh
  const petalCount = 12;
  const petalGeo = new THREE.ConeGeometry(0.24, 0.46, 5);
  petalGeo.scale(1.0, 1.0, 0.36);

  const petalInstanced = new THREE.InstancedMesh(petalGeo, ringGoldMat, petalCount);
  petalInstanced.userData.ignoreRaycaster = true;
  const dummy = new THREE.Object3D();
  const ringRadius = baseRadius * 0.68;

  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2;
    dummy.position.set(
      Math.cos(angle) * ringRadius,
      height * 0.78,
      Math.sin(angle) * ringRadius
    );
    // Cánh sen xòe nhẹ ra ngoài 24 độ và xoay theo tiếp tuyến
    dummy.rotation.set(0, -angle + Math.PI / 2, -0.42);
    dummy.updateMatrix();
    petalInstanced.setMatrixAt(i, dummy.matrix);
  }
  petalInstanced.instanceMatrix.needsUpdate = true;
  proceduralHolder.add(petalInstanced);

  // 4. Mặt gương đồng / mâm vàng đặt hiện vật trên đỉnh
  const topPlate = new THREE.Mesh(
    new THREE.CylinderGeometry(baseRadius * 0.80, baseRadius * 0.68, height * 0.15, 24),
    ringGoldMat
  );
  topPlate.position.y = height * 0.92;
  topPlate.userData.ignoreRaycaster = true;
  proceduralHolder.add(topPlate);

  // 5. Tự động nạp bệ sen hoa đá Blender PBR (lotus_pedestal_high.glb)
  if (useHighPolyGlb && typeof window !== 'undefined') {
    curatorGltfLoader.load(
      glbUrl,
      (gltf) => {
        const glbScene = gltf.scene;
        glbScene.name = 'Blender_Lotus_Pedestal_PBR';
        glbScene.traverse((c) => {
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
        const box = new THREE.Box3().setFromObject(glbScene);
        const sz = new THREE.Vector3();
        box.getSize(sz);
        const s = height / Math.max(sz.y, 0.001);
        glbScene.scale.set(s, s, s);
        glbScene.position.set(0, 0, 0);
        pedestalGroup.add(glbScene);
        proceduralHolder.visible = false;

        pedestalGroup.updateMatrixWorld(true);
        if (typeof window !== 'undefined' && window.__museumHitboxManager) {
          window.__museumHitboxManager.registerSolidObjectCollider(pedestalGroup, {
            shrinkFactor: 0.92,
            tag: 'Lotus_Pedestal_Blender_PBR'
          });
        }
      },
      undefined,
      () => {}
    );
  }

  return pedestalGroup;
}

/**
 * ============================================================================
 * 2. CULTURAL HERITAGE MODELER: CỔNG VÒM MÁI ĐAO, HOÀNH PHI & CÂU ĐỐI
 * ============================================================================
 */

/**
 * Tạo cổng vòm mái đao cong vút truyền thống, gắn bức Hoành Phi sơn son thếp vàng
 * và đôi Câu Đối chữ quốc ngữ thư pháp ngay tại mặt tiền (Z = +12.0m) của phòng trưng bày
 * Tự động đồng bộ và nạp model Blender Mái Đao Tam Quan (mai_dao_archway.glb)
 */
export function createTraditionalArchwayEntrance({
  roomTitle = 'TRUYỆN KIỀU ĐƯỜNG',
  leftCouplet = 'Trăm năm trong cõi người ta',
  rightCouplet = 'Chữ tài chữ mệnh khéo là ghét nhau',
  archWidth = 6.2,
  archHeight = 4.8,
  useGlbArchway = true,
  glbUrl = '/model/heritage/mai_dao_archway.glb'
} = {}) {
  const archGroup = new THREE.Group();
  archGroup.name = `Traditional_Archway_${roomTitle}`;
  archGroup.userData.ignoreRaycaster = true;

  const proceduralFrame = new THREE.Group();
  proceduralFrame.name = 'Procedural_Archway_Frame';
  proceduralFrame.userData.ignoreRaycaster = true;
  archGroup.add(proceduralFrame);

  const pillarOffset = archWidth * 0.5 + 0.35;
  const pillarGeo = new THREE.CylinderGeometry(0.32, 0.38, archHeight + 0.6, 16);
  const lacquerWoodMat = new THREE.MeshStandardMaterial({
    color: 0x580c0c, // Sơn son thẫm truyền thống
    roughness: 0.32,
    metalness: 0.35
  });

  const stonePlinthMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.55,
    metalness: 0.15
  });

  const goldAccentMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    metalness: 0.88,
    roughness: 0.2,
    emissive: 0x713f12,
    emissiveIntensity: 0.35
  });

  // Hai cột gỗ lim sơn son + Bệ đá hoa sen đỡ chân cột
  [-pillarOffset, pillarOffset].forEach((xPos) => {
    // Chân tảng đá bát giác
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.56, 0.42, 8), stonePlinthMat);
    plinth.position.set(xPos, 0.21, 0);
    plinth.userData.ignoreRaycaster = true;
    proceduralFrame.add(plinth);

    // Thân cột
    const pillar = new THREE.Mesh(pillarGeo, lacquerWoodMat);
    pillar.position.set(xPos, (archHeight + 0.6) * 0.5 + 0.2, 0);
    pillar.userData.ignoreRaycaster = true;
    proceduralFrame.add(pillar);

    // Vành đồng bọc đầu cột
    const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.22, 16), goldAccentMat);
    capital.position.set(xPos, archHeight + 0.55, 0);
    capital.userData.ignoreRaycaster = true;
    proceduralFrame.add(capital);
  });

  // Xà ngang sơn son (Transverse Beam)
  const beamWidth = archWidth + 1.8;
  const mainBeam = new THREE.Mesh(
    new THREE.BoxGeometry(beamWidth, 0.42, 0.82),
    lacquerWoodMat
  );
  mainBeam.position.set(0, archHeight + 0.35, 0);
  mainBeam.userData.ignoreRaycaster = true;
  proceduralFrame.add(mainBeam);

  // Vòm khuyết lượn cong mềm mại phía dưới xà
  const archInner = new THREE.Mesh(
    new THREE.TorusGeometry(archWidth * 0.46, 0.12, 8, 24, Math.PI),
    goldAccentMat
  );
  archInner.position.set(0, archHeight - 0.12, 0.05);
  archInner.userData.ignoreRaycaster = true;
  proceduralFrame.add(archInner);

  // Mái ngói mũi hài truyền thống (Roof Eaves with Curve)
  const roofWidth = archWidth + 2.8;
  const roofSlab = new THREE.Mesh(
    new THREE.BoxGeometry(roofWidth, 0.36, 1.65),
    new THREE.MeshStandardMaterial({
      color: 0x3f1609, // Ngói nung sẫm
      roughness: 0.48,
      metalness: 0.4
    })
  );
  roofSlab.position.set(0, archHeight + 0.82, 0);
  roofSlab.userData.ignoreRaycaster = true;
  proceduralFrame.add(roofSlab);

  // Bờ nóc mái ngói (Roof Ridge)
  const ridgeMesh = new THREE.Mesh(
    new THREE.BoxGeometry(roofWidth * 0.82, 0.24, 0.45),
    goldAccentMat
  );
  ridgeMesh.position.set(0, archHeight + 1.10, 0);
  ridgeMesh.userData.ignoreRaycaster = true;
  proceduralFrame.add(ridgeMesh);

  // Hai đầu đao cong vút mạ vàng ở hai bên mái (Curved Eave Horns)
  [-1, 1].forEach((dir) => {
    const eaveHorn = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 1.25, 8),
      goldAccentMat
    );
    eaveHorn.position.set(dir * (roofWidth * 0.5 + 0.25), archHeight + 1.25, 0);
    eaveHorn.rotation.z = -dir * 0.72; // Nghiêng 41 độ vút lên trời
    eaveHorn.userData.ignoreRaycaster = true;
    proceduralFrame.add(eaveHorn);

    // Kìm nóc ở góc mái
    const ridgeTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 12, 10),
      goldAccentMat
    );
    ridgeTip.position.set(dir * (roofWidth * 0.41), archHeight + 1.22, 0);
    ridgeTip.userData.ignoreRaycaster = true;
    proceduralFrame.add(ridgeTip);
  });

  // Tự động nạp Cổng Tam Quan Mái Đao Blender (mai_dao_archway.glb)
  if (useGlbArchway && typeof window !== 'undefined') {
    curatorGltfLoader.load(
      glbUrl,
      (gltf) => {
        const archGlb = gltf.scene;
        archGlb.name = 'Blender_Mai_Dao_Archway_GLB';
        archGlb.traverse((c) => {
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
        const box = new THREE.Box3().setFromObject(archGlb);
        const sz = new THREE.Vector3();
        box.getSize(sz);
        const sx = (archWidth + 1.6) / Math.max(sz.x, 0.001);
        const sy = (archHeight + 1.2) / Math.max(sz.y, 0.001);
        const szScale = sx;
        archGlb.scale.set(sx, sy, szScale);
        archGlb.position.set(0, 0, 0);
        archGroup.add(archGlb);
        proceduralFrame.visible = false;
      },
      undefined,
      () => {}
    );
  }

  // Bức Hoành Phi Sơn Son Thếp Vàng (Lacquer Gold Plaque)
  const plaqueTex = getHeritageCanvasTexture(`plaque_${roomTitle}`, 1024, 256, (ctx, w, h) => {
    // Nền sơn mài đỏ thẫm
    ctx.fillStyle = '#450a0a';
    ctx.fillRect(0, 0, w, h);

    // Khung đôi hoa văn triện vàng
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 14;
    ctx.strokeRect(14, 14, w - 28, h - 28);

    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 4;
    ctx.strokeRect(26, 26, w - 52, h - 52);

    // Chữ Hoành Phi thếp vàng sáng rực
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 62px "Times New Roman", "Palatino", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 18;
    ctx.fillText(roomTitle, w / 2, h / 2);
  });

  const plaqueMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(archWidth * 0.76, 0.98),
    new THREE.MeshBasicMaterial({ map: plaqueTex, side: THREE.DoubleSide })
  );
  plaqueMesh.position.set(0, archHeight + 0.22, 0.44);
  plaqueMesh.userData.ignoreRaycaster = true;
  archGroup.add(plaqueMesh);

  // Đôi Câu Đối chữ quốc ngữ thư pháp treo dọc 2 bên cột sơn son
  const couplets = [
    { text: leftCouplet, x: -pillarOffset, key: `couplet_L_${roomTitle}` },
    { text: rightCouplet, x: pillarOffset, key: `couplet_R_${roomTitle}` }
  ];

  couplets.forEach((c) => {
    const cTex = getHeritageCanvasTexture(c.key, 256, 1280, (ctx, w, h) => {
      ctx.fillStyle = '#580c0c';
      ctx.fillRect(0, 0, w, h);

      // Viền vàng câu đối
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 10;
      ctx.strokeRect(10, 10, w - 20, h - 20);

      // Chữ quốc ngữ thư pháp viết dọc
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 44px "Times New Roman", "Palatino", serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#fde047';
      ctx.shadowBlur = 12;

      const words = c.text.split(' ');
      const startY = 120;
      const step = (h - 220) / Math.max(words.length - 1, 1);

      words.forEach((word, idx) => {
        ctx.fillText(word, w / 2, startY + idx * step);
      });
    });

    const coupletMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.56, archHeight * 0.78),
      new THREE.MeshBasicMaterial({ map: cTex, side: THREE.DoubleSide })
    );
    coupletMesh.position.set(c.x, archHeight * 0.46, 0.44);
    coupletMesh.userData.ignoreRaycaster = true;
    archGroup.add(coupletMesh);
  });

  return archGroup;
}

/**
 * ============================================================================
 * 3. MUSEUM EXHIBITION CURATOR: CỤM TRƯNG BÀY HIỆN VẬT CHUẨN BẢO TÀNG
 * ============================================================================
 */

/**
 * Bố trí cụm trưng bày chuẩn bảo tàng gồm:
 * - Bệ Hoa Sen bát giác (createLotusHeritagePedestal)
 * - 4 cọc vàng căng dây nhung đỏ bảo vệ (bán kính 1.65m)
 * - Bảng thông tin nghiêng 20° đúng tầm mắt (Y = 1.05m)
 * - Phễu sáng Spotlight chiếu điểm từ trần xuống hiện vật
 */
export function createCuratedArtifactStation({
  artifactMesh = null,
  loreKey = 'truyenKieu_hoCam',
  stationTitle = 'Hiện Vật Bảo Tàng',
  stationSubtitle = 'Chạm vào hiện vật để xem thẻ thơ & nghe âm thanh',
  position = new THREE.Vector3(0, 0, 0),
  accentColor = 0xf472b6,
  customPedestal = null,
  loreGuideInstance = null,
  audioDirectorInstance = null
} = {}) {
  const stationGroup = new THREE.Group();
  stationGroup.position.copy(position);
  stationGroup.name = `Curated_Station_${loreKey}`;

  // 1. Bệ Đá Hoa Sen Cổ Truyền (Blender PBR hoặc Custom Pedestal)
  const pedestal = customPedestal || createLotusHeritagePedestal({
    height: 1.25,
    baseRadius: 0.85,
    accentColor
  });
  stationGroup.add(pedestal);

  // Đăng ký Hitbox vật cản cho Bệ Đá Hoa Sen (shrinkFactor: 0.92 - Skill: hitbox-collision-architect)
  if (typeof window !== 'undefined' && window.__museumHitboxManager) {
    stationGroup.updateMatrixWorld(true);
    window.__museumHitboxManager.registerSolidObjectCollider(pedestal, {
      shrinkFactor: 0.92,
      tag: `Lotus_Pedestal_${loreKey}`
    });
  }

  // 2. Hiện vật đặt trên đỉnh bệ (Y = 1.28m)
  if (artifactMesh) {
    artifactMesh.position.set(0, 1.28, 0);
    stationGroup.add(artifactMesh);
    artifactMesh.updateMatrixWorld(true);

    // Bọc Tight Click Hitbox ôm sát hiện vật để click chuẩn 100% không lọt khe mesh .glb
    if (typeof window !== 'undefined' && window.__museumHitboxManager) {
      window.__museumHitboxManager.createTightClickHitbox(artifactMesh, {
        loreKey,
        isBookPortal: false,
        padding: 0.12
      });
    }

    // Gắn thẻ tương tác lore guide
    if (loreGuideInstance) {
      loreGuideInstance.registerArtifact(artifactMesh, loreKey);
    }
    if (audioDirectorInstance) {
      audioDirectorInstance.attachPositionalSound(loreKey, artifactMesh, {
        fallbackTheme: loreKey,
        refDistance: 6,
        maxDistance: 32
      });
    }
  }

  // 3. Hàng rào 4 cọc vàng căng dây nhung đỏ bảo vệ (Bán kính đúng 1.65m)
  const stanchionRadius = 1.65;
  const postAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
  const goldStanchionMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    metalness: 0.88,
    roughness: 0.18
  });

  postAngles.forEach((ang) => {
    const px = Math.cos(ang) * stanchionRadius;
    const pz = Math.sin(ang) * stanchionRadius;

    // Chân đế tròn cọc chắn
    const baseP = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.06, 16), goldStanchionMat);
    baseP.position.set(px, 0.03, pz);
    baseP.userData.ignoreRaycaster = true;
    stationGroup.add(baseP);

    // Thân cọc vàng
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.045, 0.86, 12), goldStanchionMat);
    post.position.set(px, 0.46, pz);
    post.userData.ignoreRaycaster = true;
    stationGroup.add(post);

    // Núm cầu vàng đỉnh cọc
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 12), goldStanchionMat);
    ball.position.set(px, 0.91, pz);
    ball.userData.ignoreRaycaster = true;
    stationGroup.add(ball);
  });

  // Dây nhung đỏ căng võng giữa các cọc (hình vòng cung 270 độ, chừa lối đọc bảng mặt trước)
  const velvetRopeMat = new THREE.MeshStandardMaterial({
    color: 0x991b1b, // Đỏ nhung bảo tàng
    roughness: 0.65,
    metalness: 0.1
  });

  const ropeRing = new THREE.Mesh(
    new THREE.TorusGeometry(stanchionRadius, 0.026, 8, 36, Math.PI * 1.5),
    velvetRopeMat
  );
  ropeRing.rotation.x = Math.PI / 2;
  ropeRing.rotation.z = Math.PI * 0.75;
  ropeRing.position.y = 0.76;
  ropeRing.userData.ignoreRaycaster = true;
  stationGroup.add(ropeRing);

  // 4. Bảng thông tin nghiêng 20° đúng tầm mắt (Y = 1.05m)
  const placardTex = getHeritageCanvasTexture(`curator_placard_${loreKey}`, 512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#1c0a24';
    ctx.fillRect(0, 0, w, h);

    // Khung kép mạ vàng
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2;
    ctx.strokeRect(16, 16, w - 32, h - 32);

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 30px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 8;
    ctx.fillText(stationTitle, w / 2, 78);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fce7f3';
    ctx.font = 'italic 18px "Segoe UI", sans-serif';
    ctx.fillText(stationSubtitle, w / 2, 140);

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 15px "Segoe UI", sans-serif';
    ctx.fillText('◈ CHẠM ĐỂ XEM THƠ & THUYẾT MINH ◈', w / 2, 205);
  });

  const placardGroup = new THREE.Group();
  placardGroup.position.set(0, 1.05, stanchionRadius + 0.12);
  placardGroup.rotation.x = -0.35; // Nghiêng đúng 20 độ (-0.35 rad) ngửa lên tầm mắt

  // Chân đỡ bảng nghiêng
  const standMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.03, 1.05, 8),
    goldStanchionMat
  );
  standMesh.position.set(0, -0.52, 0);
  standMesh.userData.ignoreRaycaster = true;
  placardGroup.add(standMesh);

  // Mặt bảng
  const placardMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.96, 0.48),
    new THREE.MeshBasicMaterial({ map: placardTex, side: THREE.DoubleSide })
  );
  placardMesh.userData.loreKey = loreKey;
  placardMesh.userData.isLoreArtifact = true;
  placardGroup.add(placardMesh);

  stationGroup.add(placardGroup);

  if (typeof window !== 'undefined' && window.__museumHitboxManager) {
    placardMesh.updateMatrixWorld(true);
    window.__museumHitboxManager.createTightClickHitbox(placardMesh, {
      loreKey,
      isBookPortal: false,
      padding: 0.10
    });
  }

  if (loreGuideInstance) {
    loreGuideInstance.registerArtifact(placardMesh, loreKey);
  }

  // 5. Phễu sáng Spotlight chiếu điểm từ trần xuống hiện vật
  const spotCone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 1.55, 6.2, 20, 1, true),
    new THREE.MeshBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  spotCone.position.set(0, 4.2, 0);
  spotCone.userData.ignoreRaycaster = true;
  stationGroup.add(spotCone);

  // Vòng sáng hào quang trên sàn quanh chân bệ
  const floorGlow = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1.62, 32),
    new THREE.MeshBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.y = 0.02;
  floorGlow.userData.ignoreRaycaster = true;
  stationGroup.add(floorGlow);

  return stationGroup;
}

/**
 * ============================================================================
 * 4. EDUCATIONAL TOUR GUIDE DIRECTOR: AUTO-TOUR TỰ ĐỘNG QUA 4 PHÒNG CHUYÊN ĐỀ
 * ============================================================================
 */

export const DEFAULT_MUSEUM_TOUR_WAYPOINTS = [
  {
    id: 'lobby_center',
    title: 'Điểm 1/5: Đại Sảnh Trống Đồng Đông Sơn',
    narration: 'Đài Trống Đồng Ngọc Lũ ngàn năm tỏa sáng rực rỡ dưới vòm kính thiên đỉnh Đại Sảnh.',
    cameraPos: new THREE.Vector3(0, 2.0, 14.0),
    lookAtPos: new THREE.Vector3(0, 1.4, 0.0),
    dwellTimeMs: 7000,
    soundKey: 'dongSon',
    loreKey: 'lobby_dongSonDrum'
  },
  {
    id: 'room_truyen_kieu',
    title: 'Điểm 2/5: Phòng Trưng Bày Kiệt Tác Truyện Kiều',
    narration: 'Chiêm ngưỡng Đàn Hồ Cầm và Kim Thoa Đêm Thề Nguyền của nàng Kiều tại Tầng 2.',
    cameraPos: new THREE.Vector3(-42.0, 11.8, 19.0),
    lookAtPos: new THREE.Vector3(-48.0, 11.2, 19.0),
    dwellTimeMs: 7000,
    soundKey: 'truyenKieu',
    loreKey: 'truyenKieu_hoCam'
  },
  {
    id: 'room_son_tinh',
    title: 'Điểm 3/5: Không Gian Huyền Sử Sơn Tinh - Thủy Tinh',
    narration: 'Tái hiện cuộc đối đầu trực diện giữa Sơn Tinh non cao và Thủy Tinh cuộn sóng thần.',
    cameraPos: new THREE.Vector3(-42.0, 1.8, -19.0),
    lookAtPos: new THREE.Vector3(-48.0, 1.4, -19.0),
    dwellTimeMs: 7000,
    soundKey: 'sonTinh',
    loreKey: 'sonTinh_tanVien'
  },
  {
    id: 'room_an_duong_vuong',
    title: 'Điểm 4/5: Phòng Thành Cổ Loa & Nỏ Thần Liên Châu',
    narration: 'Chiêm ngưỡng Nỏ Thần Kim Quy và Giếng Ngọc Mỵ Châu trong ánh sáng hoàng thành Âu Lạc.',
    cameraPos: new THREE.Vector3(0.0, 1.8, -41.0),
    lookAtPos: new THREE.Vector3(0.0, 1.5, -48.0),
    dwellTimeMs: 7000,
    soundKey: 'anDuongVuong',
    loreKey: 'anDuongVuong_noThan'
  },
  {
    id: 'room_vo_nhat',
    title: 'Điểm 5/5: Không Gian Hiện Thực Vợ Nhặt (Kim Lân)',
    narration: 'Bát cháo cám ấm nồng tình nhân ái và ngọn đèn dầu xua tan bóng tối nạn đói năm 1945.',
    cameraPos: new THREE.Vector3(41.0, 21.8, -19.0),
    lookAtPos: new THREE.Vector3(48.0, 21.2, -19.0),
    dwellTimeMs: 7000,
    soundKey: 'voNhat',
    loreKey: 'voNhat_nieuChao'
  }
];

export class MuseumAutoTourDirector {
  constructor(camera, {
    waypoints = DEFAULT_MUSEUM_TOUR_WAYPOINTS,
    audioDirector = null,
    loreGuide = null,
    onTourStateChange = null
  } = {}) {
    this.camera = camera;
    this.waypoints = waypoints;
    this.audioDirector = audioDirector;
    this.loreGuide = loreGuide;
    this.onTourStateChange = onTourStateChange;

    this.isActive = false;
    this.currentIndex = 0;
    this.phase = 'idle'; // 'flying' | 'dwelling' | 'idle'
    this.phaseStartTime = 0;
    this.flightDurationMs = 4500;

    this.startPos = new THREE.Vector3();
    this.startQuat = new THREE.Quaternion();
    this.targetQuat = new THREE.Quaternion();

    this._injectTourHUD();
    this._bindShortcuts();
  }

  _injectTourHUD() {
    if (typeof document === 'undefined') return;
    if (document.getElementById('museum-autotour-hud')) return;

    const style = document.createElement('style');
    style.id = 'museum-autotour-style';
    style.textContent = `
      #museum-autotour-hud {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, rgba(28, 9, 36, 0.94), rgba(69, 10, 10, 0.94));
        border: 2px solid #facc15;
        border-radius: 999px;
        padding: 9px 24px;
        display: flex;
        align-items: center;
        gap: 15px;
        color: #fef08a;
        font-family: "Segoe UI", Roboto, sans-serif;
        z-index: 9998;
        box-shadow: 0 10px 36px rgba(0, 0, 0, 0.75), 0 0 20px rgba(250, 204, 21, 0.35);
        backdrop-filter: blur(8px);
        transition: all 0.3s ease;
      }
      .tour-btn {
        background: linear-gradient(90deg, #eab308, #facc15);
        color: #1a0505;
        border: none;
        border-radius: 999px;
        padding: 8px 18px;
        font-weight: 700;
        cursor: pointer;
        font-size: 13.5px;
        box-shadow: 0 4px 12px rgba(234, 179, 8, 0.4);
        transition: transform 0.15s ease, filter 0.15s ease;
      }
      .tour-btn:hover {
        transform: scale(1.05);
        filter: brightness(1.1);
      }
      .tour-btn.secondary {
        background: rgba(255, 255, 255, 0.16);
        color: #ffffff;
        box-shadow: none;
      }
      .tour-btn.secondary:hover {
        background: rgba(255, 255, 255, 0.28);
      }
      #tour-status-text {
        font-size: 13.5px;
        max-width: 440px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #fef08a;
        font-weight: 500;
      }
    `;
    document.head.appendChild(style);

    const hud = document.createElement('div');
    hud.id = 'museum-autotour-hud';
    hud.innerHTML = `
      <button class="tour-btn" id="tour-toggle-btn">🧭 Auto-Tour [Phím T]</button>
      <button class="tour-btn secondary" id="tour-hitbox-btn" title="Bật/Tắt Khung Dây Hitbox Debug (Phím H hoặc F2)">🛡️ Hitbox [H]</button>
      <span id="tour-status-text">Khám phá tự do hoặc bật Hướng dẫn viên tham quan tự động</span>
      <button class="tour-btn secondary" id="tour-next-btn" style="display:none;">Điểm kế ⏭</button>
    `;
    document.body.appendChild(hud);

    document.getElementById('tour-hitbox-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (typeof window !== 'undefined' && window.__museumHitboxManager) {
        window.__museumHitboxManager.toggleDebugWireframes();
      }
    });

    document.getElementById('tour-toggle-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleTour();
    });

    document.getElementById('tour-next-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.nextWaypoint();
    });
  }

  _bindShortcuts() {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', (e) => {
      if (e.key === 't' || e.key === 'T') {
        this.toggleTour();
      } else if (e.key === 'Escape' && this.isActive) {
        this.stopTour();
      }
    });
  }

  toggleTour() {
    if (this.isActive) this.stopTour();
    else this.startTour(0);
  }

  startTour(startIndex = 0) {
    if (!this.waypoints.length) return;
    this.isActive = true;
    this.onTourStateChange?.(true);

    const toggleBtn = document.getElementById('tour-toggle-btn');
    const nextBtn = document.getElementById('tour-next-btn');
    if (toggleBtn) toggleBtn.textContent = '⏹ Dừng Tour [ESC]';
    if (nextBtn) nextBtn.style.display = 'inline-block';

    this._beginFlightTo(startIndex);
  }

  stopTour() {
    this.isActive = false;
    this.phase = 'idle';
    this.loreGuide?.hideLoreCard?.();
    this.onTourStateChange?.(false);

    const toggleBtn = document.getElementById('tour-toggle-btn');
    const nextBtn = document.getElementById('tour-next-btn');
    const statusText = document.getElementById('tour-status-text');
    if (toggleBtn) toggleBtn.textContent = '🧭 Auto-Tour [Phím T]';
    if (nextBtn) nextBtn.style.display = 'none';
    if (statusText) statusText.textContent = 'Đã quay lại chế độ tham quan tự do';
  }

  nextWaypoint() {
    if (!this.isActive) return;
    this.loreGuide?.hideLoreCard?.();
    const nextIdx = (this.currentIndex + 1) % this.waypoints.length;
    this._beginFlightTo(nextIdx);
  }

  _beginFlightTo(index) {
    this.currentIndex = index;
    const wp = this.waypoints[index];
    this.phase = 'flying';
    this.phaseStartTime = performance.now();

    this.startPos.copy(this.camera.position);
    this.startQuat.copy(this.camera.quaternion);

    // Tính toán góc quay hướng nhìn thẳng vào hiện vật
    const tempCam = this.camera.clone();
    tempCam.position.copy(wp.cameraPos);
    tempCam.lookAt(wp.lookAtPos);
    this.targetQuat.copy(tempCam.quaternion);

    const statusText = document.getElementById('tour-status-text');
    if (statusText) {
      statusText.textContent = `Đang di chuyển tới: ${wp.title}...`;
    }
  }

  /**
   * Gọi autoTour.update(performance.now()) trong vòng lặp requestAnimationFrame chính
   */
  update(nowMs = performance.now()) {
    if (!this.isActive || this.phase === 'idle') return;
    const wp = this.waypoints[this.currentIndex];

    if (this.phase === 'flying') {
      const elapsed = nowMs - this.phaseStartTime;
      const rawT = Math.min(elapsed / this.flightDurationMs, 1.0);
      // Hàm nội suy mượt Ease-In-Out Cubic
      const easeT = rawT < 0.5
        ? 4 * rawT * rawT * rawT
        : 1 - Math.pow(-2 * rawT + 2, 3) / 2;

      this.camera.position.lerpVectors(this.startPos, wp.cameraPos, easeT);
      this.camera.quaternion.slerpQuaternions(this.startQuat, this.targetQuat, easeT);

      if (rawT >= 1.0) {
        this.phase = 'dwelling';
        this.phaseStartTime = nowMs;

        const statusText = document.getElementById('tour-status-text');
        if (statusText) {
          statusText.textContent = `${wp.title} — ${wp.narration}`;
        }

        // Tự động phát âm thanh ngũ cung không gian
        if (wp.soundKey && this.audioDirector) {
          this.audioDirector.playRealmSoundscape(wp.soundKey);
        }

        // Tự động hiển thị thẻ thơ thuyết minh sơn mài
        if (wp.loreKey && this.loreGuide) {
          this.loreGuide.showLoreCard(wp.loreKey);
        }
      }
    } else if (this.phase === 'dwelling') {
      const dwellElapsed = nowMs - this.phaseStartTime;
      const waitTime = wp.dwellTimeMs || 7000;
      if (dwellElapsed >= waitTime) {
        this.nextWaypoint();
      }
    }
  }
}
