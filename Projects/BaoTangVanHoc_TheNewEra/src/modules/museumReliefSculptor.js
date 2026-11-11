import * as THREE from 'three';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger.js';

/**
 * ============================================================================
 * MUSEUM ORNAMENTAL RELIEF SCULPTOR ENGINE
 * Ứng dụng kỹ năng: ornamental-relief-sculptor, shader-coloring-artist, fps-optimizer
 * - Chuyển đổi hoa văn cổ truyền thành Sobel Normal Map 3D (chiều sâu ánh sáng thật)
 * - Điêu khắc Chạm Lộng 3D (Extrude Bezier): Mây xoắn, Bọ góc chữ Vạn, Chim Lạc
 * - Đai đồng chạm nổi ôm quanh thân cột & bệ đá bằng merge/InstancedMesh (60+ FPS)
 * ============================================================================
 */

const SCULPT_CACHE = new Map();
const RELIEF_MAT_CACHE = new Map();
const RELIEF_GEO_CACHE = new Map();

/**
 * 1. BỘ CHUYỂN ĐỔI HEIGHTMAP SANG SOBEL TANGENT-SPACE NORMAL MAP
 * Biến mọi nét vẽ hoa văn trắng-đen thành bề mặt chạm khắc 3D bắt sáng theo góc đèn
 */
export function generateSculptedNormalAndAlbedoMaps(key, width, height, drawHeightAndColorFn, strength = 3.2) {
  if (SCULPT_CACHE.has(key)) return SCULPT_CACHE.get(key);

  const albedoCanvas = document.createElement('canvas');
  const heightCanvas = document.createElement('canvas');
  const normalCanvas = document.createElement('canvas');

  albedoCanvas.width = heightCanvas.width = normalCanvas.width = width;
  albedoCanvas.height = heightCanvas.height = normalCanvas.height = height;

  const aCtx = albedoCanvas.getContext('2d');
  const hCtx = heightCanvas.getContext('2d');
  const nCtx = normalCanvas.getContext('2d');

  // Mặc định nền Heightmap sâu (màu đen = rãnh chìm, màu trắng = gờ chạm nổi)
  hCtx.fillStyle = '#181818';
  hCtx.fillRect(0, 0, width, height);

  // Gọi hàm vẽ hoa văn đồng thời lên Albedo (màu sắc) và Height (độ cao điêu khắc)
  drawHeightAndColorFn(aCtx, hCtx, width, height);

  // Thuật toán Sobel 3x3 tối ưu (truy cập trực tiếp TypedArray, không cấp phát/closure mỗi pixel)
  const srcData = hCtx.getImageData(0, 0, width, height).data;
  const normImg = nCtx.createImageData(width, height);
  const dstData = normImg.data;
  const inv255 = 1.0 / 255.0;

  for (let y = 0; y < height; y++) {
    const yUp = y > 0 ? y - 1 : 0;
    const yDn = y < height - 1 ? y + 1 : height - 1;
    const rowUp = yUp * width;
    const rowMid = y * width;
    const rowDn = yDn * width;

    for (let x = 0; x < width; x++) {
      const xL = x > 0 ? x - 1 : width - 1;
      const xR = x < width - 1 ? x + 1 : 0;

      const tl = srcData[(rowUp + xL) << 2] * inv255;
      const t  = srcData[(rowUp + x)  << 2] * inv255;
      const tr = srcData[(rowUp + xR) << 2] * inv255;
      const l  = srcData[(rowMid + xL) << 2] * inv255;
      const r  = srcData[(rowMid + xR) << 2] * inv255;
      const bl = srcData[(rowDn + xL) << 2] * inv255;
      const b  = srcData[(rowDn + x)  << 2] * inv255;
      const br = srcData[(rowDn + xR) << 2] * inv255;

      const dX = (tr + 2.0 * r + br) - (tl + 2.0 * l + bl);
      const dY = (bl + 2.0 * b + br) - (tl + 2.0 * t + tr);

      const nx = -dX * strength;
      const ny = -dY * strength;
      const invLen = 1.0 / Math.sqrt(nx * nx + ny * ny + 1.0);

      const idx = (rowMid + x) << 2;
      dstData[idx]     = ((nx * invLen) * 127.5 + 127.5) | 0;
      dstData[idx + 1] = ((ny * invLen) * 127.5 + 127.5) | 0;
      dstData[idx + 2] = (invLen * 127.5 + 127.5) | 0;
      dstData[idx + 3] = 255;
    }
  }
  nCtx.putImageData(normImg, 0, 0);

  const albedoMap = new THREE.CanvasTexture(albedoCanvas);
  const normalMap = new THREE.CanvasTexture(normalCanvas);

  [albedoMap, normalMap].forEach((tex) => {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
  });

  // QUAN TRỌNG: Chỉ Albedo dùng SRGB, NormalMap giữ không gian tuyến tính THREE.LinearSRGBColorSpace
  if ('colorSpace' in albedoMap && THREE.SRGBColorSpace) {
    albedoMap.colorSpace = THREE.SRGBColorSpace;
  }
  if ('colorSpace' in normalMap && THREE.LinearSRGBColorSpace) {
    normalMap.colorSpace = THREE.LinearSRGBColorSpace;
  }

  const maps = { albedoMap, normalMap, bumpMap: null };
  SCULPT_CACHE.set(key, maps);
  return maps;
}

/**
 * 2. TẠO VẬT LIỆU PHÙ ĐIÊU ĐỒNG ĐÔNG SƠN / SƠN MÀI CHẠM NỔI (CACHED SINGLETON)
 */
export function createCarvedHeritagePbrMaterial(motifStyle = 'dongSon', repeatX = 2, repeatY = 2) {
  const key = `carved_mat_v2_${motifStyle}_${repeatX}_${repeatY}`;
  if (RELIEF_MAT_CACHE.has(key)) return RELIEF_MAT_CACHE.get(key);

  const { albedoMap, normalMap } = generateSculptedNormalAndAlbedoMaps(
    `tex_${motifStyle}`,
    512,
    512,
    (aCtx, hCtx) => {
      // Scale virtual 1024x1024 -> 512x512 để giảm 75% VRAM và 4x tốc độ Sobel
      aCtx.save();
      hCtx.save();
      aCtx.scale(0.5, 0.5);
      hCtx.scale(0.5, 0.5);
      const w = 1024;
      const h = 1024;

      // Nền sơn mài/đồng cổ trầm
      aCtx.fillStyle = motifStyle === 'lotusGold' ? '#3b0a0a' : '#1f1610';
      aCtx.fillRect(0, 0, w, h);

      const drawCarvedStroke = (drawPathFn, goldColor = '#fde047', heightVal = 245, lineW = 10) => {
        hCtx.strokeStyle = 'rgb(10, 10, 10)';
        hCtx.lineWidth = lineW + 8;
        drawPathFn(hCtx);
        hCtx.stroke();

        hCtx.strokeStyle = `rgb(${heightVal}, ${heightVal}, ${heightVal})`;
        hCtx.lineWidth = lineW;
        drawPathFn(hCtx);
        hCtx.stroke();

        aCtx.strokeStyle = goldColor;
        aCtx.lineWidth = lineW;
        drawPathFn(aCtx);
        aCtx.stroke();
      };

      // 1. Đường diềm Hồi Văn Chữ S / Chữ Vạn ở mép trên và mép dưới
      for (let x = 32; x < w; x += 128) {
        drawCarvedStroke((ctx) => {
          ctx.beginPath();
          ctx.rect(x, 28, 76, 76);
          ctx.rect(x + 18, 46, 40, 40);
          ctx.rect(x, h - 104, 76, 76);
          ctx.rect(x + 18, h - 86, 40, 40);
        }, '#facc15', 250, 8);
      }

      // 2. Hoa văn trung tâm: Hoa Sen Chạm Nổi & Mây Xoắn Cổ Truyền
      for (let cx = 128; cx < w; cx += 256) {
        for (let cy = 256; cy < h - 160; cy += 256) {
          drawCarvedStroke((ctx) => {
            ctx.beginPath();
            ctx.arc(cx, cy, 88, 0, Math.PI * 2);
          }, '#fde047', 235, 7);

          for (let p = 0; p < 8; p++) {
            const ang = (p / 8) * Math.PI * 2;
            drawCarvedStroke((ctx) => {
              ctx.beginPath();
              const x1 = cx + Math.cos(ang) * 20;
              const y1 = cy + Math.sin(ang) * 20;
              const x2 = cx + Math.cos(ang) * 78;
              const y2 = cy + Math.sin(ang) * 78;
              const ctrlX = cx + Math.cos(ang + 0.32) * 56;
              const ctrlY = cy + Math.sin(ang + 0.32) * 56;
              ctx.moveTo(x1, y1);
              ctx.quadraticCurveTo(ctrlX, ctrlY, x2, y2);
              ctx.quadraticCurveTo(
                cx + Math.cos(ang - 0.32) * 56,
                cy + Math.sin(ang - 0.32) * 56,
                x1,
                y1
              );
            }, '#fef08a', 255, 6);
          }
        }
      }

      aCtx.restore();
      hCtx.restore();
    },
    3.8
  );

  const aTex = albedoMap.clone();
  const nTex = normalMap.clone();
  // Tái sử dụng chung image, chỉ khác repeat nếu khác tham số
  aTex.repeat.set(repeatX, repeatY);
  nTex.repeat.set(repeatX, repeatY);

  const mat = new THREE.MeshStandardMaterial({
    map: repeatX === 1 && repeatY === 1 ? albedoMap : aTex,
    normalMap: repeatX === 1 && repeatY === 1 ? normalMap : nTex,
    normalScale: new THREE.Vector2(1.6, 1.6),
    roughness: 0.28,
    metalness: 0.78,
    side: THREE.FrontSide
  });

  RELIEF_MAT_CACHE.set(key, mat);
  return mat;
}

/**
 * 3. ĐIÊU KHẮC KHỐI 3D CHẠM LỘNG: ĐẦU DƯ VÂN MÂY / CON SƠN ĐẤU CỦNG (EXTRUDE BEZIER)
 * Tạo chi tiết hoa văn mây xoắn 3D thật có vát cạnh (bevel) gắn lên đầu cột hoặc góc khung
 */
export function createSculptedCloudScrollBracket3D({
  scale = 1.0,
  color = 0xfacc15
} = {}) {
  let geo = RELIEF_GEO_CACHE.get('cloud_scroll_bracket');
  if (!geo) {
    const shape = new THREE.Shape();
    // Đường cong Bezier mô phỏng hoa văn Mây Xoắn (Vân Khánh) cổ truyền
    shape.moveTo(0, 0);
    shape.lineTo(0.85, 0);
    shape.bezierCurveTo(0.95, 0.22, 0.72, 0.45, 0.48, 0.42);
    shape.bezierCurveTo(0.32, 0.40, 0.28, 0.62, 0.12, 0.75);
    shape.bezierCurveTo(-0.02, 0.85, 0, 0.45, 0, 0);

    // Khoét lỗ chạm lộng (Openwork Filigree) ở giữa đám mây
    const hole = new THREE.Path();
    hole.absarc(0.38, 0.22, 0.11, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    geo = new THREE.ExtrudeGeometry(shape, {
      steps: 1,
      depth: 0.08,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.02,
      bevelSegments: 1,
      curveSegments: 5
    });
    geo.center();
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    RELIEF_GEO_CACHE.set('cloud_scroll_bracket', geo);
  }

  const matKey = `cloud_scroll_mat_${color}`;
  let mat = RELIEF_MAT_CACHE.get(matKey);
  if (!mat) {
    mat = new THREE.MeshStandardMaterial({
      color,
      metalness: 0.88,
      roughness: 0.2,
      emissive: 0x713f12,
      emissiveIntensity: 0.22,
      side: THREE.FrontSide
    });
    RELIEF_MAT_CACHE.set(matKey, mat);
  }

  const mesh = new THREE.Mesh(geo, mat);
  mesh.scale.setScalar(scale);
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.userData.ignoreRaycaster = true;
  return mesh;
}

/**
 * 4. TẠO ĐAI ĐỒNG CHẠM NỔI CÁNH SEN ÔM QUANH THÂN CỘT & BỆ HIỆN VẬT
 * Biến các cây cột tròn trơn thành cột chạm trổ tinh xảo
 */
export function attachSculptedCollarRingsToPillar(pillarPosition, pillarRadius = 0.44, heights = [1.2, 4.2, 7.2]) {
  const group = new THREE.Group();
  group.position.set(pillarPosition.x, 0, pillarPosition.z);
  group.userData.ignoreRaycaster = true;

  const carvedMat = createCarvedHeritagePbrMaterial('lotusGold', 4, 1);

  const bandGeoKey = `collar_band_${pillarRadius.toFixed(3)}`;
  let bandGeo = RELIEF_GEO_CACHE.get(bandGeoKey);
  if (!bandGeo) {
    bandGeo = new THREE.CylinderGeometry(pillarRadius * 1.08, pillarRadius * 1.08, 0.36, 12, 1, true);
    bandGeo.computeVertexNormals();
    bandGeo.computeBoundingBox();
    bandGeo.computeBoundingSphere();
    RELIEF_GEO_CACHE.set(bandGeoKey, bandGeo);
  }

  const rimGeoKey = `collar_rim_${pillarRadius.toFixed(3)}`;
  let rimGeo = RELIEF_GEO_CACHE.get(rimGeoKey);
  if (!rimGeo) {
    rimGeo = new THREE.TorusGeometry(pillarRadius * 1.09, 0.025, 5, 12).rotateX(Math.PI / 2);
    rimGeo.computeVertexNormals();
    rimGeo.computeBoundingBox();
    rimGeo.computeBoundingSphere();
    RELIEF_GEO_CACHE.set(rimGeoKey, rimGeo);
  }

  heights.forEach((h) => {
    // Vòng đai đồng chạm nổi ôm sát thân cột
    const band = new THREE.Mesh(bandGeo, carvedMat);
    band.position.y = h;
    band.userData.ignoreRaycaster = true;
    group.add(band);

    // Viền chỉ vàng vát cạnh trên & dưới đai
    [-0.19, 0.19].forEach((offsetY) => {
      const rim = new THREE.Mesh(rimGeo, carvedMat);
      rim.position.y = h + offsetY;
      rim.userData.ignoreRaycaster = true;
      group.add(rim);
    });
  });

  // Gắn 4 Đầu Dư Vân Mây Chạm Lộng 3D tỏa ra 4 hướng trên đỉnh cột
  const topY = heights[heights.length - 1] + 0.45;
  for (let i = 0; i < 4; i++) {
    const bracket = createSculptedCloudScrollBracket3D({ scale: 0.75 });
    const ang = (i / 4) * Math.PI * 2;
    bracket.position.set(
      Math.cos(ang) * (pillarRadius + 0.25),
      topY,
      Math.sin(ang) * (pillarRadius + 0.25)
    );
    bracket.rotation.y = -ang;
    group.add(bracket);
  }

  group.updateMatrixWorld(true);
  mergeGroupMeshesByMaterial(group, {
    disposeSources: false,
    castShadow: false,
    receiveShadow: false
  });
  return group;
}

/**
 * 5. PHÙ ĐIÊU RỒNG THỜI LÝ (MÌNH UỐN LƯỢN MỀM MẠI) BẰNG EXTRUDEGEOMETRY
 * Đặc trưng mỹ thuật triều Lý: thân trơn uốn lượn hình sin thắt túi mềm mại,
 * mào lửa vút cong về phía trước, không vảy thô cứng, đầu ngẩng chầu minh châu.
 */
export function createLyDynastyDragonRelief3D({
  scale = 1.0,
  color = 0xd4af37,
  emissive = 0x452b05,
  mirrorX = false,
  material = null
} = {}) {
  const group = new THREE.Group();
  group.name = 'Sculpted_LyDynasty_Dragon_Relief';
  group.userData.ignoreRaycaster = true;

  let goldMat = material;
  if (!goldMat) {
    const matKey = `ly_dragon_gold_${color}_${emissive}`;
    goldMat = RELIEF_MAT_CACHE.get(matKey);
    if (!goldMat) {
      goldMat = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.86,
        roughness: 0.24,
        emissive,
        emissiveIntensity: 0.26,
        side: THREE.FrontSide
      });
      RELIEF_MAT_CACHE.set(matKey, goldMat);
    }
  }

  let bodyGeo = RELIEF_GEO_CACHE.get('ly_dragon_body');
  if (!bodyGeo) {
    // 1. Thân rồng thời Lý uốn lượn hình sin mềm mại (từ đuôi bên trái sang đầu bên phải)
    const bodyShape = new THREE.Shape();
    bodyShape.moveTo(-1.35, 0.06);
    bodyShape.bezierCurveTo(-1.05, 0.34, -0.78, -0.22, -0.50, 0.04);
    bodyShape.bezierCurveTo(-0.22, 0.30, 0.02, -0.26, 0.34, 0.06);
    bodyShape.bezierCurveTo(0.62, 0.32, 0.88, -0.10, 1.12, 0.22);
    // Cổ & đầu rồng vút cao kèm mào lửa đặc trưng thời Lý
    bodyShape.bezierCurveTo(1.25, 0.36, 1.38, 0.42, 1.46, 0.28);
    bodyShape.bezierCurveTo(1.36, 0.22, 1.32, 0.14, 1.24, 0.12);
    // Bụng dưới lượn ngược về đuôi
    bodyShape.bezierCurveTo(1.06, -0.02, 0.85, -0.26, 0.56, -0.14);
    bodyShape.bezierCurveTo(0.28, -0.02, 0.02, -0.38, -0.28, -0.12);
    bodyShape.bezierCurveTo(-0.56, 0.12, -0.82, -0.34, -1.12, -0.08);
    bodyShape.bezierCurveTo(-1.26, 0.04, -1.32, 0.02, -1.35, 0.06);

    bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
      steps: 1,
      depth: 0.09,
      bevelEnabled: true,
      bevelThickness: 0.032,
      bevelSize: 0.024,
      bevelSegments: 1,
      curveSegments: 6
    });
    bodyGeo.computeVertexNormals();
    bodyGeo.computeBoundingBox();
    bodyGeo.computeBoundingSphere();
    RELIEF_GEO_CACHE.set('ly_dragon_body', bodyGeo);
  }
  const bodyMesh = new THREE.Mesh(bodyGeo, goldMat);
  bodyMesh.userData.ignoreRaycaster = true;
  group.add(bodyMesh);

  let crestGeo = RELIEF_GEO_CACHE.get('ly_dragon_crest');
  if (!crestGeo) {
    // 2. Mào lửa thời Lý vút cong trên đầu rồng (Shape + ExtrudeGeometry)
    const crestShape = new THREE.Shape();
    crestShape.moveTo(1.16, 0.24);
    crestShape.bezierCurveTo(1.02, 0.50, 0.86, 0.56, 0.72, 0.48);
    crestShape.bezierCurveTo(0.88, 0.42, 1.00, 0.32, 1.08, 0.20);
    crestShape.closePath();

    crestGeo = new THREE.ExtrudeGeometry(crestShape, {
      steps: 1,
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.012,
      bevelSegments: 1,
      curveSegments: 5
    });
    crestGeo.computeVertexNormals();
    crestGeo.computeBoundingBox();
    crestGeo.computeBoundingSphere();
    RELIEF_GEO_CACHE.set('ly_dragon_crest', crestGeo);
  }
  const crestMesh = new THREE.Mesh(crestGeo, goldMat);
  crestMesh.position.z = 0.015;
  crestMesh.userData.ignoreRaycaster = true;
  group.add(crestMesh);

  // 3. Viên Minh Châu / Lá Đề rồng chầu phía trước
  let pearlGeo = RELIEF_GEO_CACHE.get('ly_dragon_pearl');
  if (!pearlGeo) {
    pearlGeo = new THREE.SphereGeometry(0.085, 8, 6);
    pearlGeo.computeVertexNormals();
    pearlGeo.computeBoundingBox();
    pearlGeo.computeBoundingSphere();
    RELIEF_GEO_CACHE.set('ly_dragon_pearl', pearlGeo);
  }
  const pearl = new THREE.Mesh(pearlGeo, goldMat);
  pearl.position.set(1.58, 0.28, 0.05);
  pearl.userData.ignoreRaycaster = true;
  group.add(pearl);

  group.updateMatrixWorld(true);
  mergeGroupMeshesByMaterial(group, {
    disposeSources: false,
    castShadow: false,
    receiveShadow: false
  });
  group.scale.set(mirrorX ? -scale : scale, scale, scale);
  return group;
}

/**
 * 6. DẢI PHÙ ĐIÊU VÂN MÂY & SÓNG THỦY BA THỜI LÝ (EXTRUDEGEOMETRY)
 * Tạo dải phù điêu sóng nước hình cung kết hợp vân mây xoắn gắn lên tường, bệ tượng & cổng dịch chuyển.
 */
export function createLyCloudAndWaveRelief3D({
  width = 4.2,
  color = 0xd4af37,
  crimsonAccent = 0x8b1e1e,
  material = null
} = {}) {
  const group = new THREE.Group();
  group.name = 'Sculpted_Ly_Cloud_Wave_Frieze';
  group.userData.ignoreRaycaster = true;

  let goldMat = material;
  if (!goldMat) {
    const matKey = `ly_wave_gold_${color}`;
    goldMat = RELIEF_MAT_CACHE.get(matKey);
    if (!goldMat) {
      goldMat = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.84,
        roughness: 0.26,
        emissive: 0x3b2606,
        emissiveIntensity: 0.2,
        side: THREE.FrontSide
      });
      RELIEF_MAT_CACHE.set(matKey, goldMat);
    }
  }

  const unitW = 0.84;
  const count = Math.max(2, Math.round(width / unitW));

  let waveGeo = RELIEF_GEO_CACHE.get('ly_wave_unit');
  if (!waveGeo) {
    // Hình sóng Thủy Ba 3 ngọn cung uốn lượn + mây xoắn
    const waveShape = new THREE.Shape();
    waveShape.moveTo(-0.42, -0.14);
    waveShape.lineTo(-0.42, 0.0);
    waveShape.bezierCurveTo(-0.28, 0.22, -0.14, 0.22, 0.0, 0.02);
    waveShape.bezierCurveTo(0.14, 0.24, 0.28, 0.24, 0.42, 0.0);
    waveShape.lineTo(0.42, -0.14);
    waveShape.closePath();

    waveGeo = new THREE.ExtrudeGeometry(waveShape, {
      steps: 1,
      depth: 0.06,
      bevelEnabled: true,
      bevelThickness: 0.018,
      bevelSize: 0.015,
      bevelSegments: 1,
      curveSegments: 5
    });
    waveGeo.computeVertexNormals();
    waveGeo.computeBoundingBox();
    waveGeo.computeBoundingSphere();
    RELIEF_GEO_CACHE.set('ly_wave_unit', waveGeo);
  }

  let cloudGeo = RELIEF_GEO_CACHE.get('ly_cloud_unit');
  if (!cloudGeo) {
    // Mây khánh thời Lý nổi phía trên
    const cloudShape = new THREE.Shape();
    cloudShape.moveTo(-0.26, 0.08);
    cloudShape.bezierCurveTo(-0.18, 0.26, 0.18, 0.26, 0.26, 0.08);
    cloudShape.bezierCurveTo(0.14, 0.14, -0.14, 0.14, -0.26, 0.08);

    cloudGeo = new THREE.ExtrudeGeometry(cloudShape, {
      steps: 1,
      depth: 0.05,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.01,
      bevelSegments: 1,
      curveSegments: 4
    });
    cloudGeo.computeVertexNormals();
    cloudGeo.computeBoundingBox();
    cloudGeo.computeBoundingSphere();
    RELIEF_GEO_CACHE.set('ly_cloud_unit', cloudGeo);
  }

  const startX = -((count - 1) * unitW) * 0.5;
  for (let i = 0; i < count; i++) {
    const x = startX + i * unitW;
    const wMesh = new THREE.Mesh(waveGeo, goldMat);
    wMesh.position.set(x, 0, 0);
    wMesh.userData.ignoreRaycaster = true;
    group.add(wMesh);

    const cMesh = new THREE.Mesh(cloudGeo, goldMat);
    cMesh.position.set(x, 0.12, 0.015);
    cMesh.userData.ignoreRaycaster = true;
    group.add(cMesh);
  }

  const backingMatKey = `ly_wave_crimson_${crimsonAccent}`;
  let backingMat = RELIEF_MAT_CACHE.get(backingMatKey);
  if (!backingMat) {
    backingMat = new THREE.MeshStandardMaterial({
      color: crimsonAccent,
      roughness: 0.4,
      metalness: 0.2,
      side: THREE.FrontSide
    });
    RELIEF_MAT_CACHE.set(backingMatKey, backingMat);
  }

  // Nẹp chỉ đỏ son nền dưới dải phù điêu
  const backing = new THREE.Mesh(
    new THREE.BoxGeometry(count * unitW + 0.16, 0.06, 0.08),
    backingMat
  );
  backing.position.set(0, -0.14, 0.01);
  backing.userData.ignoreRaycaster = true;
  group.add(backing);

  group.updateMatrixWorld(true);
  mergeGroupMeshesByMaterial(group, {
    disposeSources: false,
    castShadow: false,
    receiveShadow: false
  });
  return group;
}

/**
 * 7. VẬT LIỆU PHÙ ĐIÊU THỜI LÝ (SÓNG THỦY BA, HOA SEN, VÂN MÂY) VỚI PROCEDURAL NORMAL MAP LINEARSRGB
 */
export function createLyLotusWaveNormalMaterial(style = 'midnightGold', repeatX = 3, repeatY = 2) {
  const key = `ly_relief_mat_${style}_${repeatX}_${repeatY}`;
  if (RELIEF_MAT_CACHE.has(key)) {
    return RELIEF_MAT_CACHE.get(key);
  }

  const { albedoMap, normalMap } = generateSculptedNormalAndAlbedoMaps(
    key,
    256,
    256,
    (aCtx, hCtx) => {
      aCtx.save();
      hCtx.save();
      aCtx.scale(0.5, 0.5);
      hCtx.scale(0.5, 0.5);
      const w = 512;
      const h = 512;

      if (style === 'crimsonGold') {
        aCtx.fillStyle = '#5c1212';
      } else if (style === 'lotusStone') {
        aCtx.fillStyle = '#182436';
      } else {
        aCtx.fillStyle = '#0b1528';
      }
      aCtx.fillRect(0, 0, w, h);

      const drawRelief = (drawFn, strokeHex, heightLevel = 235, lw = 5) => {
        hCtx.strokeStyle = 'rgb(12,12,12)';
        hCtx.lineWidth = lw + 5;
        drawFn(hCtx);
        hCtx.stroke();

        hCtx.strokeStyle = `rgb(${heightLevel},${heightLevel},${heightLevel})`;
        hCtx.lineWidth = lw;
        drawFn(hCtx);
        hCtx.stroke();

        aCtx.strokeStyle = strokeHex;
        aCtx.lineWidth = lw;
        drawFn(aCtx);
        aCtx.stroke();
      };

      const goldStroke = style === 'lotusStone' ? '#9bb2cc' : '#d4af37';
      const brightStroke = style === 'lotusStone' ? '#d4af37' : '#f4d97b';

      // Sóng Thủy Ba nhiều tầng
      for (let row = 0; row < 4; row++) {
        const baseY = 64 + row * 128;
        for (let cx = 64; cx <= w; cx += 128) {
          for (let r = 22; r <= 58; r += 18) {
            drawRelief((ctx) => {
              ctx.beginPath();
              ctx.arc(cx, baseY + 34, r, Math.PI, 0, false);
            }, goldStroke, 215, 4);
          }
          // Cánh sen thời Lý & mây xoắn xen kẽ
          drawRelief((ctx) => {
            ctx.beginPath();
            ctx.moveTo(cx, baseY - 46);
            ctx.quadraticCurveTo(cx + 30, baseY - 18, cx, baseY + 4);
            ctx.quadraticCurveTo(cx - 30, baseY - 18, cx, baseY - 46);
          }, brightStroke, 245, 4);
        }
      }

      aCtx.restore();
      hCtx.restore();
    },
    3.2
  );

  albedoMap.repeat.set(repeatX, repeatY);
  normalMap.repeat.set(repeatX, repeatY);

  const mat = new THREE.MeshStandardMaterial({
    map: albedoMap,
    normalMap,
    normalScale: new THREE.Vector2(1.45, 1.45),
    roughness: style === 'lotusStone' ? 0.62 : 0.34,
    metalness: style === 'lotusStone' ? 0.25 : 0.68,
    side: THREE.FrontSide
  });
  RELIEF_MAT_CACHE.set(key, mat);
  return mat;
}
