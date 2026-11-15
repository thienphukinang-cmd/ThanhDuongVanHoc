import * as THREE from 'three';
import { loadGlbCached } from '../utils/modelLoaderHelper.js';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger.js';
import { getRoomWorldPose, localRoomToWorld } from '../config/literatureRegistry.js';

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
const CURATOR_MAT_CACHE = new Map();
const _curatorBoxScratch = new THREE.Box3();
const _curatorVecScratch = new THREE.Vector3();

function getCuratorMat(key, factory) {
  if (CURATOR_MAT_CACHE.has(key)) return CURATOR_MAT_CACHE.get(key);
  const mat = factory();
  CURATOR_MAT_CACHE.set(key, mat);
  return mat;
}

function disposeCuratorBranch(branch) {
  if (!branch) return;
  const cachedMats = new Set(CURATOR_MAT_CACHE.values());
  branch.traverse((obj) => {
    if (obj.geometry && typeof obj.geometry.dispose === 'function') {
      obj.geometry.dispose();
    }
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    mats.forEach((m) => {
      if (m && !cachedMats.has(m) && typeof m.dispose === 'function') {
        m.dispose();
      }
    });
  });
}

function getHeritageCanvasTexture(key, w, h, drawFn) {
  if (HERITAGE_TEX_CACHE[key]) return HERITAGE_TEX_CACHE[key];
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, w, h);

  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
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
  const stoneMat = getCuratorMat('curator_stone_base', () => new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.5,
    metalness: 0.2,
    side: THREE.FrontSide
  }));
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
  const columnGeo = new THREE.CylinderGeometry(baseRadius * 0.54, baseRadius * 0.65, height * 0.52, 10);
  const lacquerMat = getCuratorMat('curator_lacquer_red', () => new THREE.MeshStandardMaterial({
    color: 0x661010,
    roughness: 0.25,
    metalness: 0.45,
    side: THREE.FrontSide
  }));
  const columnMesh = new THREE.Mesh(columnGeo, lacquerMat);
  columnMesh.position.y = height * 0.51;
  columnMesh.userData.ignoreRaycaster = true;
  proceduralHolder.add(columnMesh);

  // Vành chỉ vàng quanh eo trụ
  const ringGoldMat = getCuratorMat(`curator_ring_gold_${accentColor}`, () => new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.2,
    metalness: 0.88,
    emissive: 0x713f12,
    emissiveIntensity: 0.35,
    side: THREE.FrontSide
  }));
  const waistRing = new THREE.Mesh(
    new THREE.TorusGeometry(baseRadius * 0.59, 0.028, 6, 14),
    ringGoldMat
  );
  waistRing.rotation.x = Math.PI / 2;
  waistRing.position.y = height * 0.51;
  waistRing.userData.ignoreRaycaster = true;
  proceduralHolder.add(waistRing);

  // 3. Đài sen vàng 12 cánh sen xếp vòng đối xứng bằng InstancedMesh
  const petalCount = 12;
  const petalGeo = new THREE.ConeGeometry(0.24, 0.46, 4);
  petalGeo.scale(1.0, 1.0, 0.36);

  const petalInstanced = new THREE.InstancedMesh(petalGeo, ringGoldMat, petalCount);
  petalInstanced.castShadow = false;
  petalInstanced.receiveShadow = false;
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
    new THREE.CylinderGeometry(baseRadius * 0.80, baseRadius * 0.68, height * 0.15, 12),
    ringGoldMat
  );
  topPlate.position.y = height * 0.92;
  topPlate.userData.ignoreRaycaster = true;
  proceduralHolder.add(topPlate);

  // 5. Tự động nạp bệ sen hoa đá Blender PBR qua cache dùng chung (lotus_pedestal_high.glb)
  if (useHighPolyGlb && typeof window !== 'undefined') {
    loadGlbCached([glbUrl], {
      maxTextureSize: 512,
      disableMipmaps: true,
      clone: true
    })
      .then((glbScene) => {
        glbScene.name = 'Blender_Lotus_Pedestal_PBR';
        glbScene.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = false;
            c.receiveShadow = false;
            c.frustumCulled = true;
            c.userData.ignoreRaycaster = true;
            const mats = Array.isArray(c.material) ? c.material : [c.material];
            mats.forEach((m) => {
              if (!m) return;
              if (!m.transparent && !m.alphaTest) m.side = THREE.FrontSide;
              if (m.map && 'colorSpace' in m.map && THREE.SRGBColorSpace && m.map.colorSpace !== THREE.SRGBColorSpace) {
                m.map.colorSpace = THREE.SRGBColorSpace;
                m.map.needsUpdate = true;
              }
            });
          }
        });
        glbScene.updateMatrixWorld(true);
        _curatorBoxScratch.setFromObject(glbScene);
        _curatorBoxScratch.getSize(_curatorVecScratch);
        const s = height / Math.max(_curatorVecScratch.y, 0.001);
        glbScene.scale.set(s, s, s);
        glbScene.position.set(0, 0, 0);
        pedestalGroup.add(glbScene);

        // Giải phóng hoàn toàn các mesh procedural dự phòng khỏi scene & GPU memory
        pedestalGroup.remove(proceduralHolder);
        disposeCuratorBranch(proceduralHolder);

        pedestalGroup.updateMatrixWorld(true);
        if (typeof window !== 'undefined' && window.__museumHitboxManager) {
          window.__museumHitboxManager.registerSolidObjectCollider(pedestalGroup, {
            shrinkFactor: 0.92,
            tag: 'Lotus_Pedestal_Blender_PBR'
          });
        }
      })
      .catch(() => {});
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
  const pillarGeo = new THREE.CylinderGeometry(0.32, 0.38, archHeight + 0.6, 10);
  const lacquerWoodMat = getCuratorMat('curator_arch_lacquer', () => new THREE.MeshStandardMaterial({
    color: 0x580c0c, // Sơn son thẫm truyền thống
    roughness: 0.32,
    metalness: 0.35,
    side: THREE.FrontSide
  }));

  const stonePlinthMat = getCuratorMat('curator_stone_base', () => new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.55,
    metalness: 0.15,
    side: THREE.FrontSide
  }));

  const goldAccentMat = getCuratorMat('curator_arch_gold', () => new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    metalness: 0.88,
    roughness: 0.2,
    emissive: 0x713f12,
    emissiveIntensity: 0.35,
    side: THREE.FrontSide
  }));

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
    const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.34, 0.22, 10), goldAccentMat);
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
    new THREE.TorusGeometry(archWidth * 0.46, 0.12, 6, 14, Math.PI),
    goldAccentMat
  );
  archInner.position.set(0, archHeight - 0.12, 0.05);
  archInner.userData.ignoreRaycaster = true;
  proceduralFrame.add(archInner);

  // Mái ngói mũi hài truyền thống (Roof Eaves with Curve)
  const roofWidth = archWidth + 2.8;
  const roofTileMat = getCuratorMat('curator_arch_roof', () => new THREE.MeshStandardMaterial({
    color: 0x3f1609, // Ngói nung sẫm
    roughness: 0.48,
    metalness: 0.4,
    side: THREE.FrontSide
  }));
  const roofSlab = new THREE.Mesh(
    new THREE.BoxGeometry(roofWidth, 0.36, 1.65),
    roofTileMat
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
      new THREE.ConeGeometry(0.28, 1.25, 6),
      goldAccentMat
    );
    eaveHorn.position.set(dir * (roofWidth * 0.5 + 0.25), archHeight + 1.25, 0);
    eaveHorn.rotation.z = -dir * 0.72; // Nghiêng 41 độ vút lên trời
    eaveHorn.userData.ignoreRaycaster = true;
    proceduralFrame.add(eaveHorn);

    // Kìm nóc ở góc mái
    const ridgeTip = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 6, 5),
      goldAccentMat
    );
    ridgeTip.position.set(dir * (roofWidth * 0.41), archHeight + 1.22, 0);
    ridgeTip.userData.ignoreRaycaster = true;
    proceduralFrame.add(ridgeTip);
  });

  // Tự động nạp Cổng Tam Quan Mái Đao Blender qua cache dùng chung (mai_dao_archway.glb)
  if (useGlbArchway && typeof window !== 'undefined') {
    loadGlbCached([glbUrl], {
      maxTextureSize: 512,
      disableMipmaps: true,
      clone: true
    })
      .then((archGlb) => {
        archGlb.name = 'Blender_Mai_Dao_Archway_GLB';
        archGlb.traverse((c) => {
          if (c.isMesh) {
            c.castShadow = false;
            c.receiveShadow = false;
            c.frustumCulled = true;
            c.userData.ignoreRaycaster = true;
            const mats = Array.isArray(c.material) ? c.material : [c.material];
            mats.forEach((m) => {
              if (!m) return;
              if (!m.transparent && !m.alphaTest) m.side = THREE.FrontSide;
              if (m.map && 'colorSpace' in m.map && THREE.SRGBColorSpace && m.map.colorSpace !== THREE.SRGBColorSpace) {
                m.map.colorSpace = THREE.SRGBColorSpace;
                m.map.needsUpdate = true;
              }
            });
          }
        });
        archGlb.updateMatrixWorld(true);
        _curatorBoxScratch.setFromObject(archGlb);
        _curatorBoxScratch.getSize(_curatorVecScratch);
        const sx = (archWidth + 1.6) / Math.max(_curatorVecScratch.x, 0.001);
        const sy = (archHeight + 1.2) / Math.max(_curatorVecScratch.y, 0.001);
        const szScale = sx;
        archGlb.scale.set(sx, sy, szScale);
        archGlb.position.set(0, 0, 0);
        archGroup.add(archGlb);

        // Giải phóng hoàn toàn khung cổng procedural dự phòng
        archGroup.remove(proceduralFrame);
        disposeCuratorBranch(proceduralFrame);
      })
      .catch(() => {});
  }

  // Bức Hoành Phi Sơn Son Thếp Vàng (downscale 1024x256 -> 512x128)
  const plaqueTex = getHeritageCanvasTexture(`plaque_${roomTitle}`, 512, 128, (ctx) => {
    ctx.save();
    ctx.scale(0.5, 0.5);
    const w = 1024;
    const h = 256;
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
    ctx.font = 'bold 62px "Times New Roman", "Segoe UI", Arial, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 18;
    ctx.fillText(roomTitle, w / 2, h / 2, w - 80);
    ctx.restore();
  });

  const createDoubleFacedBoard = (width, height, tex, depth = 0.04) => {
    const boardGroup = new THREE.Group();
    boardGroup.userData.ignoreRaycaster = true;

    const backing = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.03, height + 0.03, depth),
      lacquerWoodMat
    );
    backing.userData.ignoreRaycaster = true;
    boardGroup.add(backing);

    const faceGeo = new THREE.PlaneGeometry(width, height);
    const faceMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide });

    const frontFace = new THREE.Mesh(faceGeo, faceMat);
    frontFace.position.z = depth * 0.5 + 0.004;
    frontFace.userData.ignoreRaycaster = true;
    boardGroup.add(frontFace);

    const backFace = new THREE.Mesh(faceGeo, faceMat);
    backFace.position.z = -(depth * 0.5 + 0.004);
    backFace.rotation.y = Math.PI;
    backFace.userData.ignoreRaycaster = true;
    boardGroup.add(backFace);

    return boardGroup;
  };

  const plaqueMesh = createDoubleFacedBoard(archWidth * 0.76, 0.98, plaqueTex);
  plaqueMesh.position.set(0, archHeight + 0.22, 0.44);
  archGroup.add(plaqueMesh);

  // Đôi Câu Đối chữ quốc ngữ thư pháp treo dọc 2 bên cột sơn son (downscale 256x1280 -> 128x640)
  const couplets = [
    { text: leftCouplet, x: -pillarOffset, key: `couplet_L_${roomTitle}` },
    { text: rightCouplet, x: pillarOffset, key: `couplet_R_${roomTitle}` }
  ];

  couplets.forEach((c) => {
    const cTex = getHeritageCanvasTexture(c.key, 128, 640, (ctx) => {
      ctx.save();
      ctx.scale(0.5, 0.5);
      const w = 256;
      const h = 1280;
      ctx.fillStyle = '#580c0c';
      ctx.fillRect(0, 0, w, h);

      // Viền vàng câu đối
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 10;
      ctx.strokeRect(10, 10, w - 20, h - 20);

      // Chữ quốc ngữ thư pháp viết dọc
      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 44px "Times New Roman", "Segoe UI", Arial, serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = '#fde047';
      ctx.shadowBlur = 12;

      const words = c.text.split(' ');
      const startY = 120;
      const step = (h - 220) / Math.max(words.length - 1, 1);

      words.forEach((word, idx) => {
        ctx.fillText(word, w / 2, startY + idx * step, w - 36);
      });
      ctx.restore();
    });

    const coupletMesh = createDoubleFacedBoard(0.56, archHeight * 0.78, cTex);
    coupletMesh.position.set(c.x, archHeight * 0.46, 0.44);
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

  // 3. Hàng rào 4 cọc vàng căng dây nhung đỏ bảo vệ (Bán kính đúng 1.65m) - Gộp thành 2 Draw Calls
  const stanchionRadius = 1.65;
  const postAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
  const goldStanchionMat = getCuratorMat('curator_stanchion_gold', () => new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    metalness: 0.88,
    roughness: 0.18,
    side: THREE.FrontSide
  }));

  const barrierGroup = new THREE.Group();
  barrierGroup.name = 'Curated_Barrier_Stanchions';
  barrierGroup.userData.ignoreRaycaster = true;

  postAngles.forEach((ang) => {
    const px = Math.cos(ang) * stanchionRadius;
    const pz = Math.sin(ang) * stanchionRadius;

    // Chân đế tròn cọc chắn
    const baseP = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.06, 10), goldStanchionMat);
    baseP.position.set(px, 0.03, pz);
    baseP.userData.ignoreRaycaster = true;
    barrierGroup.add(baseP);

    // Thân cọc vàng
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.045, 0.86, 8), goldStanchionMat);
    post.position.set(px, 0.46, pz);
    post.userData.ignoreRaycaster = true;
    barrierGroup.add(post);

    // Núm cầu vàng đỉnh cọc
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.068, 8, 6), goldStanchionMat);
    ball.position.set(px, 0.91, pz);
    ball.userData.ignoreRaycaster = true;
    barrierGroup.add(ball);
  });

  // Dây nhung đỏ căng võng giữa các cọc (hình vòng cung 270 độ, chừa lối đọc bảng mặt trước)
  const velvetRopeMat = getCuratorMat('curator_velvet_rope', () => new THREE.MeshStandardMaterial({
    color: 0x991b1b, // Đỏ nhung bảo tàng
    roughness: 0.65,
    metalness: 0.1,
    side: THREE.FrontSide
  }));

  const ropeRing = new THREE.Mesh(
    new THREE.TorusGeometry(stanchionRadius, 0.026, 6, 18, Math.PI * 1.5),
    velvetRopeMat
  );
  ropeRing.rotation.x = Math.PI / 2;
  ropeRing.rotation.z = Math.PI * 0.75;
  ropeRing.position.y = 0.76;
  ropeRing.userData.ignoreRaycaster = true;
  barrierGroup.add(ropeRing);

  barrierGroup.updateMatrixWorld(true);
  mergeGroupMeshesByMaterial(barrierGroup, {
    disposeSources: true,
    castShadow: false,
    receiveShadow: false
  });
  stationGroup.add(barrierGroup);

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
    new THREE.CylinderGeometry(0.024, 0.03, 1.05, 6),
    goldStanchionMat
  );
  standMesh.position.set(0, -0.52, 0);
  standMesh.castShadow = false;
  standMesh.receiveShadow = false;
  standMesh.userData.ignoreRaycaster = true;
  placardGroup.add(standMesh);

  // Mặt bảng
  const placardMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.96, 0.48),
    new THREE.MeshBasicMaterial({ map: placardTex, side: THREE.DoubleSide })
  );
  placardMesh.castShadow = false;
  placardMesh.receiveShadow = false;
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
    new THREE.CylinderGeometry(0.24, 1.55, 6.2, 12, 1, true),
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
  spotCone.castShadow = false;
  spotCone.receiveShadow = false;
  spotCone.userData.ignoreRaycaster = true;
  stationGroup.add(spotCone);

  // Vòng sáng hào quang trên sàn quanh chân bệ
  const floorGlow = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1.62, 20),
    new THREE.MeshBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.FrontSide
    })
  );
  floorGlow.rotation.x = -Math.PI / 2;
  floorGlow.position.y = 0.02;
  floorGlow.castShadow = false;
  floorGlow.receiveShadow = false;
  floorGlow.userData.ignoreRaycaster = true;
  stationGroup.add(floorGlow);

  return stationGroup;
}

/**
 * ============================================================================
 * 4. EDUCATIONAL TOUR GUIDE DIRECTOR: AUTO-TOUR TỰ ĐỘNG QUA 4 PHÒNG CHUYÊN ĐỀ
 * ============================================================================
 */

function toNamXuongWorldVec(pose, lx, ly, lz) {
  const w = localRoomToWorld(pose, lx, ly, lz);
  return new THREE.Vector3(w.x, w.y, w.z);
}

export function createNamXuongTourWaypoints() {
  const pose = getRoomWorldPose('nguoi_con_gai_nam_xuong');
  return [
    {
      id: 'namxuong_moon_gate',
      roomId: 'nguoi_con_gai_nam_xuong',
      title: 'Phòng 204 (1/3): Cổng Gỗ Hình Vành Trăng Khuyết',
      narration: 'Bước qua Cổng Trăng Khuyết rêu phong treo đèn lồng vào không gian huyền ảo Chuyện Người Con Gái Nam Xương.',
      cameraPos: toNamXuongWorldVec(pose, 0.0, 1.9, 13.2),
      lookAtPos: toNamXuongWorldVec(pose, 0.0, 1.5, 2.8),
      dwellTimeMs: 7000,
      soundKey: 'namxuong_cottage',
      loreKey: 'plaque_nguoi_con_gai_nam_xuong',
      styleTheme: 'lua_trang'
    },
    {
      id: 'namxuong_bamboo_shadow',
      roomId: 'nguoi_con_gai_nam_xuong',
      title: 'Phòng 204 (2/3): Đĩa Đèn Dầu & Vách Nứa Chiếc Bóng',
      narration: 'Ngọn đèn dầu leo lắt hắt bóng nàng Vũ Nương khổng lồ lên vách nứa — nút thắt bi kịch oan khuất.',
      cameraPos: toNamXuongWorldVec(pose, 2.8, 1.85, 6.2),
      lookAtPos: toNamXuongWorldVec(pose, -1.2, 1.55, 1.9),
      dwellTimeMs: 7500,
      soundKey: 'namxuong_cottage',
      loreKey: 'nam_xuong_vu_nuong',
      styleTheme: 'lua_trang'
    },
    {
      id: 'namxuong_hoang_giang',
      roomId: 'nguoi_con_gai_nam_xuong',
      title: 'Phòng 204 (3/3): Bến Hoàng Giang, Đàn Giải Oan & Lân Tinh',
      narration: 'Chiếc Trâm Vàng xoay nhẹ giữa dòng Hoàng Giang, ánh lân tinh ngọc lam soi sáng Đàn Giải Oan.',
      cameraPos: toNamXuongWorldVec(pose, 2.4, 2.25, -1.3),
      lookAtPos: toNamXuongWorldVec(pose, 0.0, 1.3, -6.8),
      dwellTimeMs: 8000,
      soundKey: 'namxuong_river',
      loreKey: 'nam_xuong_tram_vang',
      styleTheme: 'lua_trang'
    }
  ];
}

export const NAM_XUONG_TOUR_WAYPOINTS = createNamXuongTourWaypoints();

export function createDayThonViDaTourWaypoints() {
  const pose = getRoomWorldPose('day_thon_vi_da');
  return [
    {
      id: 'vida_bamboo_gate',
      roomId: 'day_thon_vi_da',
      title: 'Phòng 302 (1/4): Cổng Vòm Khóm Trúc & Bảng Ngọc Vĩ Dạ',
      narration: 'Bước qua cổng gạch rêu phong dưới tán lá trúc che ngang mặt chữ điền để về thăm thôn Vĩ ban mai.',
      cameraPos: toNamXuongWorldVec(pose, 0.0, 1.9, 13.0),
      lookAtPos: toNamXuongWorldVec(pose, -0.8, 1.55, 6.2),
      dwellTimeMs: 7000,
      soundKey: 'dayThonViDa_garden',
      loreKey: 'plaque_day_thon_vi_da',
      styleTheme: 'ngoc_vi_da'
    },
    {
      id: 'vida_sunlit_garden',
      roomId: 'day_thon_vi_da',
      title: 'Phòng 302 (2/4): Nắng Hàng Cau & Vườn Vĩ Dạ Xanh Như Ngọc',
      narration: 'Nắng sớm xuyên qua hàng cau cao vút, phủ ánh ngọc bích mướt xanh lên khu vườn thôn Vĩ.',
      cameraPos: toNamXuongWorldVec(pose, 3.2, 2.0, 7.6),
      lookAtPos: toNamXuongWorldVec(pose, 0.0, 1.55, 3.9),
      dwellTimeMs: 7500,
      soundKey: 'dayThonViDa_garden',
      loreKey: 'vida_vuon_vi_da',
      styleTheme: 'ngoc_vi_da'
    },
    {
      id: 'vida_moon_river_boat',
      roomId: 'day_thon_vi_da',
      title: 'Phòng 302 (3/4): Bến Sông Trăng, Hoa Bắp Lay & Thuyền Chở Trăng',
      narration: 'Gió thổi nhẹ qua khóm hoa bắp ven bờ sông Hương, nơi chiếc thuyền nan cổ chở đầy bụi trăng vàng.',
      cameraPos: toNamXuongWorldVec(pose, 2.2, 2.15, 0.4),
      lookAtPos: toNamXuongWorldVec(pose, -2.0, 1.05, -2.9),
      dwellTimeMs: 8000,
      soundKey: 'dayThonViDa_river',
      loreKey: 'vida_thuyen_trang',
      styleTheme: 'ngoc_vi_da'
    },
    {
      id: 'vida_mist_ao_dai',
      roomId: 'day_thon_vi_da',
      title: 'Phòng 302 (4/4): Cõi Mộng Sương Khói & Bóng Áo Trắng Hư Ảo',
      narration: 'Dưới vầng trăng khổng lồ giữa đêm sương #0f172a, bóng dáng áo dài trắng tan vào sương khói hư vô.',
      cameraPos: toNamXuongWorldVec(pose, 0.4, 1.85, -7.2),
      lookAtPos: toNamXuongWorldVec(pose, 0.0, 1.65, -11.2),
      dwellTimeMs: 8500,
      soundKey: 'dayThonViDa_river',
      loreKey: 'day_thon_vi_da',
      styleTheme: 'ngoc_vi_da'
    }
  ];
}

export const DAY_THON_VI_DA_TOUR_WAYPOINTS = createDayThonViDaTourWaypoints();

export function createAnDuongVuongTourWaypoints() {
  const pose = getRoomWorldPose('an_duong_vuong');
  const cosR = Math.cos(pose.rotY);
  const sinR = Math.sin(pose.rotY);
  const localToWorld = (lx, ly, lz) => new THREE.Vector3(
    pose.x + lx * cosR + lz * sinR,
    pose.y + ly,
    pose.z - lx * sinR + lz * cosR
  );

  return [
    {
      id: 'adv_gate',
      roomId: 'an_duong_vuong',
      title: 'Điểm 1/4: Cổng Thành Cổ Loa & Mái Đao Cổ Đại',
      narration: 'Cổng vòm đá xanh rêu phong uy nghiêm với phù điêu Thần Kim Quy và hoa văn chim Lạc Đông Sơn.',
      cameraPos: localToWorld(0, 2.2, 16.5),
      lookAtPos: localToWorld(0, 2.6, 12.8),
      dwellTimeMs: 6500,
      soundKey: 'anDuongVuong_dongSon',
      loreKey: 'an_duong_vuong',
      styleTheme: 'da_reu_phong'
    },
    {
      id: 'adv_king_pedestal',
      roomId: 'an_duong_vuong',
      title: 'Điểm 2/4: Đài Uy Quyền Âu Lạc & Tượng Vua An Dương Vương',
      narration: 'Bệ Đá Trống Đồng Đông Sơn 3 Tầng chạm nổi mặt trời 14 tia, tượng Thục Phán An Dương Vương hiên ngang giữa Loa Thành.',
      cameraPos: localToWorld(0, 2.8, -4.5),
      lookAtPos: localToWorld(0, 3.4, -8.5),
      dwellTimeMs: 7500,
      soundKey: 'anDuongVuong_dongSon',
      loreKey: 'an_duong_vuong_statue',
      styleTheme: 'da_reu_phong'
    },
    {
      id: 'adv_crossbow_shrine',
      roomId: 'an_duong_vuong',
      title: 'Điểm 3/4: Điện Thờ Nỏ Thần Liên Châu & Vuốt Rùa Vàng',
      narration: 'Án thờ nỏ thần Linh Quang Kim Quy Thần Cơ với lẫy móng rùa vàng và giá binh khí đồng cổ Loa Thành.',
      cameraPos: localToWorld(-4.2, 2.0, -1.8),
      lookAtPos: localToWorld(-6.5, 1.8, -3.8),
      dwellTimeMs: 6500,
      soundKey: 'anDuongVuong_noThan',
      loreKey: 'an_duong_vuong_noThan',
      styleTheme: 'da_reu_phong'
    },
    {
      id: 'adv_da_son_sea',
      roomId: 'an_duong_vuong',
      title: 'Điểm 4/4: Bờ Biển Dạ Sơn, Giếng Ngọc & Dấu Lông Ngỗng Trắng',
      narration: 'Sóng biển Dạ Sơn cuộn trào đón Thần Kim Quy, Giếng Cổ Loa tỏa ngọc sáng và vạt lông ngỗng trắng.',
      cameraPos: localToWorld(3.6, 2.0, 0.2),
      lookAtPos: localToWorld(5.5, 1.6, 2.2),
      dwellTimeMs: 7000,
      soundKey: 'anDuongVuong_sea',
      loreKey: 'an_duong_vuong_giengNgoc',
      styleTheme: 'da_reu_phong'
    }
  ];
}

export const AN_DUONG_VUONG_TOUR_WAYPOINTS = createAnDuongVuongTourWaypoints();

export function createVoNhatTourWaypoints() {
  const pose = getRoomWorldPose('vo_nhat');
  const cosR = Math.cos(pose.rotY);
  const sinR = Math.sin(pose.rotY);
  const localToWorld = (lx, ly, lz) => new THREE.Vector3(
    pose.x + lx * cosR + lz * sinR,
    pose.y + ly,
    pose.z - lx * sinR + lz * cosR
  );

  return [
    {
      id: 'vn_gate',
      roomId: 'vo_nhat',
      title: 'Điểm 1/4: Cổng Tre Xóm Ngụ Cư & Bảng Di Sản Hiện Thực',
      narration: 'Bước qua Cổng Tre Xóm Ngụ Cư 1945 và Bảng Di Sản ghi dấu bối cảnh nạn đói mùa xuân năm Ất Dậu.',
      cameraPos: localToWorld(0, 1.8, 14.5),
      lookAtPos: localToWorld(0, 2.2, 11.5),
      dwellTimeMs: 6500,
      soundKey: 'voNhat',
      loreKey: 'famine_context',
      styleTheme: 'voNhat'
    },
    {
      id: 'vn_statue_center',
      roomId: 'vo_nhat',
      title: 'Điểm 2/4: Tượng Đài "Vợ Nhặt" – Khát Vọng Sống Giữa Tang Thương',
      narration: 'Tượng đài Tràng và người vợ nhặt hiên ngang trên Bệ Đá Ong hai tầng in hằn vệt bánh xe bò và khóm lúa nảy mầm.',
      cameraPos: localToWorld(0, 2.0, 2.5),
      lookAtPos: localToWorld(0, 2.4, -2.5),
      dwellTimeMs: 7500,
      soundKey: 'voNhat',
      loreKey: 'trang_and_wife',
      styleTheme: 'voNhat'
    },
    {
      id: 'vn_cottage_meal',
      roomId: 'vo_nhat',
      title: 'Điểm 3/4: Ngôi Nhà Tranh Bà Cụ Tứ, Đèn Dầu & Nồi Chè Khoán',
      narration: 'Mâm cơm ngày đói với bát cháo cám đắng chát đượm tình mẫu tử bao dung và ngọn đèn dầu xua tan bóng tối.',
      cameraPos: localToWorld(-4.8, 1.8, 5.0),
      lookAtPos: localToWorld(-7.5, 1.4, 3.5),
      dwellTimeMs: 7000,
      soundKey: 'voNhat',
      loreKey: 'mrs_tu_meal',
      styleTheme: 'voNhat'
    },
    {
      id: 'vn_cart_flag',
      roomId: 'vo_nhat',
      title: 'Điểm 4/4: Xe Bò Thóc Liên Đoàn & Ánh Sáng Lá Cờ Đỏ Phá Kho Thóc',
      narration: 'Chiếc xe bò đẩy thóc đầu chợ dẫn đến hình ảnh đoàn người đói đi phá kho thóc Nhật cùng Lá Cờ Đỏ Sao Vàng.',
      cameraPos: localToWorld(4.8, 1.8, 5.0),
      lookAtPos: localToWorld(7.5, 1.4, 3.5),
      dwellTimeMs: 7000,
      soundKey: 'voNhat',
      loreKey: 'revolutionary_flag',
      styleTheme: 'voNhat'
    }
  ];
}

export const VO_NHAT_TOUR_WAYPOINTS = createVoNhatTourWaypoints();

export const DEFAULT_MUSEUM_TOUR_WAYPOINTS = [
  {
    id: 'lobby_center',
    title: 'Điểm 1/8: Đại Sảnh Trống Đồng Đông Sơn',
    narration: 'Đài Trống Đồng Ngọc Lũ ngàn năm tỏa sáng rực rỡ dưới vòm kính thiên đỉnh Đại Sảnh.',
    cameraPos: new THREE.Vector3(0, 2.0, 14.0),
    lookAtPos: new THREE.Vector3(0, 1.4, 0.0),
    dwellTimeMs: 7000,
    soundKey: 'dongSon',
    loreKey: 'lobby_dongSonDrum'
  },
  {
    id: 'room_nam_xuong_shadow',
    roomId: 'nguoi_con_gai_nam_xuong',
    title: 'Điểm 2/8: Phòng 204 – Vách Nứa Chiếc Bóng (Nam Xương)',
    narration: 'Chiêm ngưỡng nghệ thuật Chiaroscuro: ánh đèn dầu hắt bóng nàng Vũ Nương lên vách nứa đơn sơ.',
    cameraPos: NAM_XUONG_TOUR_WAYPOINTS[1].cameraPos.clone(),
    lookAtPos: NAM_XUONG_TOUR_WAYPOINTS[1].lookAtPos.clone(),
    dwellTimeMs: 7000,
    soundKey: 'namxuong_cottage',
    loreKey: 'nam_xuong_vu_nuong',
    styleTheme: 'lua_trang'
  },
  {
    id: 'room_nam_xuong_river',
    roomId: 'nguoi_con_gai_nam_xuong',
    title: 'Điểm 3/8: Phòng 204 – Bến Hoàng Giang & Đàn Giải Oan',
    narration: 'Chiếc Trâm Vàng tỏa sáng trên Đàn Giải Oan giữa sóng nước Hoàng Giang và làn lân tinh huyền ảo.',
    cameraPos: NAM_XUONG_TOUR_WAYPOINTS[2].cameraPos.clone(),
    lookAtPos: NAM_XUONG_TOUR_WAYPOINTS[2].lookAtPos.clone(),
    dwellTimeMs: 7000,
    soundKey: 'namxuong_river',
    loreKey: 'nam_xuong_tram_vang',
    styleTheme: 'lua_trang'
  },
  {
    id: 'room_truyen_kieu',
    title: 'Điểm 4/8: Phòng Trưng Bày Kiệt Tác Truyện Kiều',
    narration: 'Chiêm ngưỡng Đàn Hồ Cầm và Kim Thoa Đêm Thề Nguyền của nàng Kiều tại Tầng 2.',
    cameraPos: new THREE.Vector3(-42.0, 11.8, 19.0),
    lookAtPos: new THREE.Vector3(-48.0, 11.2, 19.0),
    dwellTimeMs: 7000,
    soundKey: 'truyenKieu',
    loreKey: 'truyenKieu_hoCam'
  },
  {
    id: 'room_son_tinh',
    title: 'Điểm 5/8: Không Gian Huyền Sử Sơn Tinh - Thủy Tinh',
    narration: 'Tái hiện cuộc đối đầu trực diện giữa Sơn Tinh non cao và Thủy Tinh cuộn sóng thần.',
    cameraPos: new THREE.Vector3(-42.0, 1.8, -19.0),
    lookAtPos: new THREE.Vector3(-48.0, 1.4, -19.0),
    dwellTimeMs: 7000,
    soundKey: 'sonTinh',
    loreKey: 'sonTinh_tanVien'
  },
  {
    id: 'room_an_duong_vuong',
    title: 'Điểm 6/8: Phòng Thành Cổ Loa & Nỏ Thần Liên Châu',
    narration: 'Chiêm ngưỡng Nỏ Thần Kim Quy và Giếng Ngọc Mỵ Châu trong ánh sáng hoàng thành Âu Lạc.',
    cameraPos: new THREE.Vector3(0.0, 1.8, -41.0),
    lookAtPos: new THREE.Vector3(0.0, 1.5, -48.0),
    dwellTimeMs: 7000,
    soundKey: 'anDuongVuong',
    loreKey: 'anDuongVuong_noThan'
  },
  {
    id: 'room_day_thon_vi_da',
    roomId: 'day_thon_vi_da',
    title: 'Điểm 7/8: Phòng 302 – Đây Thôn Vĩ Dạ (Hàn Mặc Tử)',
    narration: 'Dạo bước qua vườn Vĩ Dạ nắng mới hàng cau đến bến sông trăng xứ Huế và sương khói áo trắng.',
    cameraPos: DAY_THON_VI_DA_TOUR_WAYPOINTS[2].cameraPos.clone(),
    lookAtPos: DAY_THON_VI_DA_TOUR_WAYPOINTS[2].lookAtPos.clone(),
    dwellTimeMs: 7500,
    soundKey: 'dayThonViDa_river',
    loreKey: 'vida_thuyen_trang',
    styleTheme: 'ngoc_vi_da'
  },
  {
    id: 'room_vo_nhat',
    roomId: 'vo_nhat',
    title: 'Điểm 8/8: Không Gian Hiện Thực Vợ Nhặt (Kim Lân)',
    narration: 'Bát cháo cám ấm nồng tình nhân ái và ngọn đèn dầu xua tan bóng tối nạn đói năm 1945.',
    cameraPos: VO_NHAT_TOUR_WAYPOINTS[1].cameraPos.clone(),
    lookAtPos: VO_NHAT_TOUR_WAYPOINTS[1].lookAtPos.clone(),
    dwellTimeMs: 7000,
    soundKey: 'voNhat',
    loreKey: 'trang_and_wife',
    styleTheme: 'voNhat'
  }
];

function normalizeTourWaypoint(wp, fallback = {}) {
  const toVec3 = (v, fb) => {
    if (v?.isVector3) return v.clone();
    if (v && typeof v.x === 'number') return new THREE.Vector3(v.x, v.y, v.z);
    if (Array.isArray(v) && v.length >= 3) return new THREE.Vector3(v[0], v[1], v[2]);
    return fb ? fb.clone() : new THREE.Vector3();
  };
  return {
    ...fallback,
    ...wp,
    cameraPos: toVec3(wp?.cameraPos || wp?.position, fallback.cameraPos),
    lookAtPos: toVec3(wp?.lookAtPos || wp?.target || wp?.lookAt, fallback.lookAtPos),
    dwellTimeMs: wp?.dwellTimeMs ?? fallback.dwellTimeMs ?? 7000
  };
}

export class MuseumAutoTourDirector {
  constructor(camera, {
    waypoints = DEFAULT_MUSEUM_TOUR_WAYPOINTS,
    audioDirector = null,
    loreGuide = null,
    onTourStateChange = null
  } = {}) {
    this.camera = camera;
    this.waypoints = waypoints;
    this.activeWaypoints = waypoints;
    this.roomTours = new Map([
      ['nguoi_con_gai_nam_xuong', NAM_XUONG_TOUR_WAYPOINTS],
      ['day_thon_vi_da', DAY_THON_VI_DA_TOUR_WAYPOINTS],
      ['an_duong_vuong', AN_DUONG_VUONG_TOUR_WAYPOINTS],
      ['vo_nhat', VO_NHAT_TOUR_WAYPOINTS]
    ]);
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
      if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.key === 't' || e.key === 'T') {
        this.toggleTour();
      } else if (e.key === 'Escape' && this.isActive) {
        this.stopTour();
      }
    });
  }

  _getActiveWaypoints() {
    return (Array.isArray(this.activeWaypoints) && this.activeWaypoints.length > 0)
      ? this.activeWaypoints
      : this.waypoints;
  }

  registerRoomTour(roomId, roomWaypoints = []) {
    if (!roomId || !Array.isArray(roomWaypoints) || roomWaypoints.length === 0) return;
    const defaults = this.roomTours.get(roomId) || [];
    const normalized = roomWaypoints.map((wp, idx) => normalizeTourWaypoint(wp, defaults[idx] || {}));
    this.roomTours.set(roomId, normalized);
  }

  getRoomTourWaypoints(roomId = 'nguoi_con_gai_nam_xuong') {
    if (roomId === 'nguoi_con_gai_nam_xuong' || roomId === 'nam_xuong' || roomId === '204') {
      const roomObj = typeof window !== 'undefined' ? window.__namXuongRoom : null;
      const roomProvided = roomObj?.getAutoTourWaypoints?.() || roomObj?.autoTourWaypoints;
      if (Array.isArray(roomProvided) && roomProvided.length > 0) {
        return roomProvided.map((wp, idx) => normalizeTourWaypoint(wp, NAM_XUONG_TOUR_WAYPOINTS[idx] || {}));
      }
      return this.roomTours.get('nguoi_con_gai_nam_xuong') || NAM_XUONG_TOUR_WAYPOINTS;
    }
    if (roomId === 'day_thon_vi_da' || roomId === 'vi_da' || roomId === 'vida' || roomId === '302') {
      const roomObj = typeof window !== 'undefined' ? window.__dayThonViDaRoom : null;
      const roomProvided = roomObj?.getAutoTourWaypoints?.() || roomObj?.autoTourWaypoints;
      if (Array.isArray(roomProvided) && roomProvided.length > 0) {
        return roomProvided.map((wp, idx) => normalizeTourWaypoint(wp, DAY_THON_VI_DA_TOUR_WAYPOINTS[idx] || {}));
      }
      return this.roomTours.get('day_thon_vi_da') || DAY_THON_VI_DA_TOUR_WAYPOINTS;
    }
    if (roomId === 'an_duong_vuong' || roomId === 'co_loa' || roomId === '103') {
      const roomObj = typeof window !== 'undefined' ? window.__anDuongVuongRoom : null;
      const roomProvided = roomObj?.getAutoTourWaypoints?.() || roomObj?.autoTourWaypoints;
      if (Array.isArray(roomProvided) && roomProvided.length > 0) {
        return roomProvided.map((wp, idx) => normalizeTourWaypoint(wp, AN_DUONG_VUONG_TOUR_WAYPOINTS[idx] || {}));
      }
      return this.roomTours.get('an_duong_vuong') || AN_DUONG_VUONG_TOUR_WAYPOINTS;
    }
    if (roomId === 'vo_nhat' || roomId === '304' || roomId === '305') {
      const roomObj = typeof window !== 'undefined' ? window.__voNhatRoom : null;
      const roomProvided = roomObj?.getAutoTourWaypoints?.() || roomObj?.autoTourWaypoints || roomObj?.userData?.tourWaypoints;
      if (Array.isArray(roomProvided) && roomProvided.length > 0) {
        return roomProvided.map((wp, idx) => normalizeTourWaypoint(wp, VO_NHAT_TOUR_WAYPOINTS[idx] || {}));
      }
      return this.roomTours.get('vo_nhat') || VO_NHAT_TOUR_WAYPOINTS;
    }
    return this.roomTours.get(roomId) || [];
  }

  toggleTour() {
    if (this.isActive) this.stopTour();
    else this.startTour(0);
  }

  startTour(startIndex = 0, customWaypoints = null) {
    if (Array.isArray(customWaypoints) && customWaypoints.length > 0) {
      this.activeWaypoints = customWaypoints.map((wp) => normalizeTourWaypoint(wp));
    } else {
      this.activeWaypoints = this.waypoints;
    }
    const list = this._getActiveWaypoints();
    if (!list.length) return;
    if (typeof document !== 'undefined' && document.pointerLockElement) {
      try { document.exitPointerLock?.(); } catch (_) {}
    }

    this.isActive = true;
    this.onTourStateChange?.(true);

    const toggleBtn = document.getElementById('tour-toggle-btn');
    const nextBtn = document.getElementById('tour-next-btn');
    if (toggleBtn) toggleBtn.textContent = '⏹ Dừng Tour [ESC]';
    if (nextBtn) nextBtn.style.display = 'inline-block';

    this._beginFlightTo(Math.max(0, Math.min(startIndex, list.length - 1)));
  }

  startRoomTour(roomIdOrWaypoints = 'nguoi_con_gai_nam_xuong', startIndex = 0) {
    const waypoints = Array.isArray(roomIdOrWaypoints)
      ? roomIdOrWaypoints
      : this.getRoomTourWaypoints(roomIdOrWaypoints);
    if (!waypoints.length) return false;
    this.startTour(startIndex, waypoints);
    return true;
  }

  startNamXuongTour(startIndex = 0) {
    return this.startRoomTour('nguoi_con_gai_nam_xuong', startIndex);
  }

  startDayThonViDaTour(startIndex = 0) {
    return this.startRoomTour('day_thon_vi_da', startIndex);
  }

  stopTour() {
    this.isActive = false;
    this.phase = 'idle';
    this.activeWaypoints = this.waypoints;
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
    const list = this._getActiveWaypoints();
    if (!list.length) return;
    this.loreGuide?.hideLoreCard?.();
    const nextIdx = (this.currentIndex + 1) % list.length;
    this._beginFlightTo(nextIdx);
  }

  _beginFlightTo(index) {
    const list = this._getActiveWaypoints();
    if (!list.length) return;
    this.currentIndex = index % list.length;
    const wp = list[this.currentIndex];
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
    const list = this._getActiveWaypoints();
    const wp = list[this.currentIndex];
    if (!wp) return;

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

        // Tự động hiển thị thẻ thơ thuyết minh di sản
        if (wp.loreKey && this.loreGuide) {
          const meta = wp.styleTheme ? { styleTheme: wp.styleTheme, roomId: wp.roomId } : undefined;
          this.loreGuide.showLoreCard(wp.loreKey, meta);
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
