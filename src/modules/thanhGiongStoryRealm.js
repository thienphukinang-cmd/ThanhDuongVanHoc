import * as THREE from 'three';
import { registerInteractiveBook } from './PortalInteraction.js';
import { loadGlbCached, sanitizeGeometryBuffers } from '../utils/modelLoaderHelper.js';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger.js';

/**
 * THANH GIONG STORY REALM ENGINE (CÕI SỬ THI PHÙ ĐỔNG & ĐỈNH NÚI SÓC SƠN)
 * --------------------------------------------------------------------------
 * Kiến trúc Lazy-Mounted 60+ FPS chuẩn bảo tàng:
 * 1. Cổng dịch chuyển Đền Phù Đổng & Tre Đằng Ngà (`portal_soc_son.glb` + fallback).
 * 2. Shader dòng xoáy lửa vàng Đông Sơn + proxy vô hình + trigger < 2.5m / click + Dolly-Zoom.
 * 3. Đại cảnh Sóc Sơn lazy-mount khi `enterRealm()` và giải phóng triệt để khi `exitRealm()`:
 *    - Vòm trời hoàng hôn rực lửa (`#ff4500 -> #c59b27 -> #101d29`) + FogExp2.
 *    - Địa hình Núi Sóc Sơn (`z = +46, y = 0` lên Đỉnh `z = -56, y = +15.0`) + `floorHeightProvider`.
 *    - Đầm nước chân núi sóng shader GPU phản chiếu tàn lửa (0 CPU vertex upload).
 *    - Rừng Tre Đằng Ngà đứng & bị nhổ bật gốc quật giặc Ân (`InstancedMesh`).
 *    - Dấu vó ngựa sắt rực lửa + tàn lửa & sương đỉnh núi shader GPU (`THREE.Points`).
 *    - Trống Đồng Đông Sơn hồi quy (`isReturnPortal`), God Rays & Áo Giáp Sắt Sóc Sơn.
 *    - Full Auto-Tour (Phòng 101 Zone 1 -> Zone 2 -> Orbit Tượng 6.5s -> Xuyên cổng -> Đỉnh Sóc Sơn).
 */

const GLB_PORTAL_CANDIDATES = [
  '/models/thanhgiong/portal_soc_son.glb',
  '/model/thanhgiong/portal_soc_son.glb'
];

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0, edge1, x) {
  const denom = edge1 - edge0;
  if (Math.abs(denom) < 1e-6) return x >= edge1 ? 1.0 : 0.0;
  const t = clamp((x - edge0) / denom, 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function createSeededRandom(seed = 1007) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Chuẩn hóa Geometry theo `.rules` (NaN/Infinity guard, Normals, BoundingBox/Sphere)
 */
function prepGeo(geo, recomputeNormals = false) {
  if (!geo) return geo;
  try {
    sanitizeGeometryBuffers(geo);
    if (recomputeNormals || !geo.attributes?.normal) {
      geo.computeVertexNormals();
    }
    if (geo.attributes?.position && geo.attributes.position.count > 0) {
      geo.computeBoundingBox();
      geo.computeBoundingSphere();
    }
  } catch (err) {
    console.warn('[ThanhGiongRealm] prepGeo warning:', err);
  }
  return geo;
}

function setNoShadowCull(obj, { doubleSided = false, ignoreRaycaster = null } = {}) {
  if (!obj) return obj;
  obj.traverse((child) => {
    if (child.isMesh || child.isInstancedMesh || child.isPoints) {
      child.castShadow = false;
      child.receiveShadow = false;
      child.frustumCulled = true;
      if (ignoreRaycaster !== null) {
        child.userData.ignoreRaycaster = ignoreRaycaster;
      }
      if (child.isMesh && child.material && !doubleSided) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => {
          if (m && !m.transparent && !m.alphaTest) {
            m.side = THREE.FrontSide;
          }
        });
      }
    }
  });
  return obj;
}

/**
 * Đường tâm lối đá cổ uốn lượn từ Chân Núi (`z = +44`) lên Đỉnh Sóc Sơn (`z = -56`)
 */
export function getSocSonTrailCenterX(z) {
  const climbRatio = clamp((44.0 - z) / 96.0, 0.0, 1.0);
  const summitStraighten = 1.0 - smoothstep(-32.0, -50.0, z);
  return Math.sin(climbRatio * Math.PI * 1.45) * 3.2 * summitStraighten;
}

/**
 * Hàm tính cao độ địa hình Sóc Sơn liên tục & xác định cho cả Mesh và `floorHeightProvider`.
 * - Chân núi & chiến trường (`z >= +22`): y ≈ 0.0m
 * - Sườn núi (`z = +22 -> -46`): leo mượt lên y = +15.0m
 * - Đỉnh Núi Sóc Sơn (`z = -56, x = 0`): plateau đá phẳng tại y = +15.0m
 */
export function getSocSonHeightAt(x = 0, z = 0) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return 0.0;

  const baseClimb = 15.0 * smoothstep(22.0, -46.0, z);
  const trailX = getSocSonTrailCenterX(z);
  const dxTrail = Math.abs(x - trailX);

  // Làm phẳng sân đỉnh núi (0, -56) bán kính ~8.2m và bệ trống quay về (-4.5, 42)
  const distSummit = Math.hypot(x, z + 56.0);
  const distExitDrum = Math.hypot(x + 4.5, z - 42.0);
  const distSpawn = Math.hypot(x + 1.2, z - 44.5);

  // Lòng đầm nước chân núi phía đông (x = +21, z = +20)
  const distLake = Math.hypot((x - 21.0) / 1.05, (z - 20.0) / 1.15);
  const lakeRimBlend = smoothstep(5.5, 13.5, distLake);
  const lakeBasin = -0.88 * (1.0 - smoothstep(4.5, 11.8, distLake));

  const trailFlat = smoothstep(2.8, 7.8, dxTrail);
  const summitFlat = smoothstep(7.6, 13.5, distSummit);
  const exitFlat = smoothstep(3.4, 6.2, distExitDrum);
  const spawnFlat = smoothstep(3.0, 5.5, distSpawn);
  const flattenFactor = trailFlat * summitFlat * exitFlat * spawnFlat * lakeRimBlend;

  // Gợn đồi đá hai bên sườn
  const sideRise = Math.max(0.0, dxTrail - 6.0) * 0.135;
  const microUndulation = (
    Math.sin(x * 0.145 + 0.4) * Math.cos(z * 0.115) * 0.52 +
    Math.sin(x * 0.31 - z * 0.24) * 0.22
  );

  // Sườn sau đỉnh núi nâng nhẹ tạo thế tựa lưng
  const backRidge = z < -62.0 ? smoothstep(-62.0, -76.0, z) * 4.5 : 0.0;

  const rawY = baseClimb * smoothstep(7.5, 13.8, distLake) + lakeBasin + (sideRise + microUndulation) * flattenFactor + backRidge;
  return Number.isFinite(rawY) ? rawY : 0.0;
}

function createCanvasTexture(width, height, drawFn, disposables = null, { repeatX = 1, repeatY = 1 } = {}) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) drawFn(ctx, width, height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  } else {
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
  }
  tex.needsUpdate = true;
  if (Array.isArray(disposables)) disposables.push(tex);
  return tex;
}

function createPlaqueTexture(title, subtitle, disposables, opts = {}) {
  const {
    bg = '#1b0f0a',
    border = '#f59e0b',
    titleCol = '#fde68a',
    subCol = '#fed7aa',
    w = 512,
    h = 128
  } = opts;
  return createCanvasTexture(w, h, (ctx, cw, ch) => {
    const grad = ctx.createLinearGradient(0, 0, cw, ch);
    grad.addColorStop(0, bg);
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, cw, ch);

    ctx.strokeStyle = border;
    ctx.lineWidth = 5;
    ctx.strokeRect(5, 5, cw - 10, ch - 10);

    ctx.strokeStyle = 'rgba(253, 230, 138, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(11, 11, cw - 22, ch - 22);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = titleCol;
    ctx.font = 'bold 26px "Segoe UI", sans-serif';
    ctx.fillText(title, cw / 2, ch * 0.36);

    ctx.fillStyle = subCol;
    ctx.font = '600 17px "Segoe UI", sans-serif';
    ctx.fillText(subtitle, cw / 2, ch * 0.72);
  }, disposables);
}

function createDongSonDrumHeadTexture(disposables) {
  return createCanvasTexture(256, 256, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, 126);
    g.addColorStop(0, '#fef08a');
    g.addColorStop(0.35, '#d97706');
    g.addColorStop(0.8, '#78350f');
    g.addColorStop(1, '#451a03');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Mặt trời Đông Sơn 12 tia giữa mặt trống
    ctx.fillStyle = '#fef9c3';
    ctx.beginPath();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      const r = i % 2 === 0 ? 44 : 18;
      const px = cx + Math.cos(a) * r;
      const py = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Các vòng tròn đồng tâm & hoa văn chim Lạc cách điệu
    ctx.strokeStyle = '#fde68a';
    [52, 72, 92, 112].forEach((radius, idx) => {
      ctx.lineWidth = idx === 3 ? 4 : 2;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.stroke();
    });

    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 2;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 58, cy + Math.sin(a) * 58);
      ctx.lineTo(cx + Math.cos(a + 0.14) * 84, cy + Math.sin(a + 0.14) * 84);
      ctx.stroke();
    }
  }, disposables);
}

/**
 * Tạo thân cây Tre Đằng Ngà đốt vàng óng (hơi uốn cong tự nhiên + khớp đốt tre)
 */
function createGoldenBambooCulmGeometry() {
  const height = 6.2;
  const geo = new THREE.CylinderGeometry(0.054, 0.088, height, 7, 15);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const cStalk = new THREE.Color(0xe6b800);
  const cNode = new THREE.Color(0x9a6b0c);
  const cTip = new THREE.Color(0xf3cf4a);
  const cTmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const t = clamp((y + height * 0.5) / height, 0.0, 1.0); // 0..1

    // Gợn đốt tre dọc thân (~6 đốt)
    const nodeWave = Math.pow(Math.abs(Math.sin(t * Math.PI * 6.0)), 14.0);
    const radialScale = 1.0 + nodeWave * 0.16;
    const archBendX = Math.sin(t * Math.PI * 0.85) * 0.16;

    pos.setXYZ(i, x * radialScale + archBendX, y, z * radialScale);

    cTmp.copy(cStalk).lerp(cTip, t * 0.45);
    if (nodeWave > 0.45) {
      cTmp.lerp(cNode, (nodeWave - 0.45) / 0.55 * 0.85);
    }
    colors[i * 3] = cTmp.r;
    colors[i * 3 + 1] = cTmp.g;
    colors[i * 3 + 2] = cTmp.b;
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return prepGeo(geo, true);
}

/**
 * Tạo cụm tán lá Tre Đằng Ngà nhiều phiến thon mềm mại (16 lá mảnh rủ hình nan quạt)
 * Dùng cho InstancedMesh -> 0 draw call phát sinh, loại bỏ hoàn toàn chóp nón nhọn.
 */
function createBambooLeafClusterGeometry() {
  const positions = [];
  const colors = [];
  const indices = [];

  const rng = createSeededRandom(551);
  const cBase = new THREE.Color(0x65a30d);   // Xanh lục rêu cuống lá
  const cMid = new THREE.Color(0xa3e635);    // Xanh vàng nõn lá tre
  const cTip = new THREE.Color(0xd97706);    // Vàng đồng ánh nắng đầu lá
  const cTmp = new THREE.Color();

  const tiers = [
    { count: 7, pitchBase: 0.42, yOff: -0.22, len: 1.38, width: 0.15, droop: 0.52 },
    { count: 6, pitchBase: 0.78, yOff: 0.12,  len: 1.18, width: 0.13, droop: 0.36 },
    { count: 5, pitchBase: 1.16, yOff: 0.42,  len: 0.92, width: 0.11, droop: 0.20 }
  ];

  let vertCursor = 0;

  tiers.forEach((tier, tIdx) => {
    for (let b = 0; b < tier.count; b++) {
      const yaw = (b / tier.count) * Math.PI * 2 + tIdx * 0.58 + (rng() - 0.5) * 0.35;
      const pitch = tier.pitchBase + (rng() - 0.5) * 0.16;
      const len = tier.len * (0.86 + rng() * 0.28);
      const halfW = tier.width * 0.5;
      const droop = tier.droop * (0.85 + rng() * 0.3);
      const roll = (rng() - 0.5) * 0.45;

      const cosY = Math.cos(yaw);
      const sinY = Math.sin(yaw);
      const cosP = Math.cos(pitch);
      const sinP = Math.sin(pitch);

      // Mỗi lá gồm 3 khúc (base -> mid1 -> mid2 -> tip nhọn mảnh)
      const stations = [
        { s: 0.0,  w: halfW * 0.30 },
        { s: 0.34, w: halfW * 1.00 },
        { s: 0.72, w: halfW * 0.72 },
        { s: 1.0,  w: 0.008 }
      ];

      const localBaseVert = vertCursor;
      stations.forEach((st, sIdx) => {
        const along = st.s * len;
        // Tọa độ cục bộ dọc thân lá trước khi xoay yaw
        const lx = along * cosP;
        const ly = tier.yOff + along * sinP - (st.s * st.s) * droop;

        // Hai mép trái & phải của lá (nghiêng nhẹ theo roll)
        const bankY = Math.sin(roll) * st.w;
        const sideW = Math.cos(roll) * st.w;

        const wx = lx * cosY;
        const wz = lx * sinY;
        // Vector ngang vuông góc hướng lá
        const px = -sinY * sideW;
        const pz = cosY * sideW;

        // Màu gradient cuống -> thân -> chóp lá
        if (st.s < 0.45) {
          cTmp.copy(cBase).lerp(cMid, st.s / 0.45);
        } else {
          cTmp.copy(cMid).lerp(cTip, (st.s - 0.45) / 0.55);
        }

        // Left vertex
        positions.push(wx - px, ly - bankY, wz - pz);
        colors.push(cTmp.r, cTmp.g, cTmp.b);
        // Right vertex
        positions.push(wx + px, ly + bankY, wz + pz);
        colors.push(cTmp.r, cTmp.g, cTmp.b);
        vertCursor += 2;

        if (sIdx > 0) {
          const prev = localBaseVert + (sIdx - 1) * 2;
          const cur = localBaseVert + sIdx * 2;
          indices.push(prev, cur, prev + 1);
          indices.push(prev + 1, cur, cur + 1);
        }
      });
    }
  });

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setIndex(indices);
  return prepGeo(geo, true);
}

/**
 * Tạo hình học dãy núi Sóc Sơn sống núi uốn lượn mềm mại (thay thế nón tam giác nhọn)
 */
function createSoftMountainRidgeGeometry(baseRadius = 24, height = 22, seed = 77) {
  const geo = new THREE.PlaneGeometry(baseRadius * 2.4, baseRadius * 1.85, 20, 14);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const rx = baseRadius * 1.18;
  const rz = baseRadius * 0.90;
  const phaseA = seed * 1.37;
  const phaseB = seed * 2.71;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const nx = x / rx;
    const nz = z / rz;
    const r = Math.hypot(nx, nz);

    // Mặt cắt hình vòm núi tự nhiên mềm mại (không có đỉnh nhọn)
    const dome = Math.pow(Math.max(0.0, 1.0 - r * r), 1.35);
    const ridgeUndulation =
      0.78 +
      0.22 * Math.cos(nx * 2.6 + phaseA) +
      0.14 * Math.sin(nx * 4.4 + nz * 1.8 + phaseB);
    // Tạo thế lệch vai trái/phải tự nhiên của sườn núi thật
    const shoulder = 1.0 + nx * 0.22 * Math.sin(phaseA);
    const y = Math.max(0.0, height * dome * ridgeUndulation * shoulder);
    pos.setY(i, y);
  }

  return prepGeo(geo, true);
}

/**
 * Xây dựng cổng Phù Đổng + Khóm Tre Đằng Ngà uốn vòm dự phòng khi chưa tải/hoặc song song GLB.
 * Chiều cao tổng ~4.1m, khoảng thông thủy giữa cổng >= 2.8m x 3.4m.
 */
function buildProceduralPhuDongArch(disposables) {
  const archGroup = new THREE.Group();
  archGroup.name = 'ThanhGiong_Procedural_PortalArch';

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x3b3532,
    roughness: 0.88,
    metalness: 0.12,
    side: THREE.FrontSide
  });
  const bronzeMat = new THREE.MeshStandardMaterial({
    color: 0x6b5628,
    roughness: 0.42,
    metalness: 0.72,
    side: THREE.FrontSide
  });
  const crimsonLacquerMat = new THREE.MeshStandardMaterial({
    color: 0x6e1814,
    roughness: 0.48,
    metalness: 0.18,
    side: THREE.FrontSide
  });
  const bambooGoldMat = new THREE.MeshStandardMaterial({
    color: 0xd4a024,
    emissive: 0x451a03,
    emissiveIntensity: 0.25,
    roughness: 0.46,
    metalness: 0.28,
    side: THREE.FrontSide
  });
  const bambooLeafMat = new THREE.MeshLambertMaterial({
    color: 0xeab308,
    emissive: 0x78350f,
    emissiveIntensity: 0.22,
    side: THREE.FrontSide
  });

  // 1. Hai trụ đá & cột đồng Đông Sơn (thông thủy 2.9m)
  [-1.85, 1.85].forEach((px) => {
    const plinth = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(0.95, 0.48, 0.95)), stoneMat);
    plinth.position.set(px, 0.24, 0);
    archGroup.add(plinth);

    const collarBase = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.32, 0.38, 0.28, 12)), bronzeMat);
    collarBase.position.set(px, 0.62, 0);
    archGroup.add(collarBase);

    const pillar = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.22, 0.26, 2.85, 12)), crimsonLacquerMat);
    pillar.position.set(px, 2.05, 0);
    archGroup.add(pillar);

    const collarTop = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.31, 0.26, 0.24, 12)), bronzeMat);
    collarTop.position.set(px, 3.48, 0);
    archGroup.add(collarTop);
  });

  // 2. Xà ngang sơn son thếp vàng & mái cong đầu đao Đông Sơn
  const mainBeam = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(4.45, 0.34, 0.58)), crimsonLacquerMat);
  mainBeam.position.set(0, 3.62, 0);
  archGroup.add(mainBeam);

  const roofCap = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(4.95, 0.18, 0.78)), bronzeMat);
  roofCap.position.set(0, 3.88, 0);
  archGroup.add(roofCap);

  [-2.42, 2.42].forEach((rx) => {
    const eave = new THREE.Mesh(prepGeo(new THREE.ConeGeometry(0.24, 0.56, 6)), bronzeMat);
    eave.position.set(rx, 4.04, 0);
    eave.rotation.z = rx < 0 ? 0.52 : -0.52;
    archGroup.add(eave);
  });

  const crestSun = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.28, 0.28, 0.12, 16)), bronzeMat);
  crestSun.rotation.x = Math.PI / 2;
  crestSun.position.set(0, 4.10, 0);
  archGroup.add(crestSun);

  // 3. Hai cụm Tre Đằng Ngà uốn vòm ôm hai bên cổng
  const rng = createSeededRandom(101);
  [-1, 1].forEach((side) => {
    for (let k = 0; k < 4; k++) {
      const baseX = side * (1.72 + k * 0.18);
      const baseZ = (k - 1.5) * 0.22;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(baseX, 0.05, baseZ),
        new THREE.Vector3(baseX + side * 0.22, 1.55, baseZ * 0.9),
        new THREE.Vector3(baseX - side * (0.28 + k * 0.08), 3.05, baseZ * 0.55),
        new THREE.Vector3(side * (0.35 + k * 0.18), 4.02 + (rng() - 0.5) * 0.14, baseZ * 0.3)
      ]);
      const stalkGeo = prepGeo(new THREE.TubeGeometry(curve, 10, 0.048 - k * 0.004, 6, false));
      const stalkMesh = new THREE.Mesh(stalkGeo, bambooGoldMat);
      archGroup.add(stalkMesh);

      const tipPt = curve.getPoint(0.85);
      const leafCone = new THREE.Mesh(prepGeo(new THREE.ConeGeometry(0.24, 0.52, 5)), bambooLeafMat);
      leafCone.position.copy(tipPt);
      leafCone.rotation.set(0.3, k * 0.9, side * 0.85);
      archGroup.add(leafCone);
    }
  });

  setNoShadowCull(archGroup, { ignoreRaycaster: true });
  mergeGroupMeshesByMaterial(archGroup, { preserveUserData: true });
  setNoShadowCull(archGroup, { ignoreRaycaster: true });
  return archGroup;
}

function disposeObjectSubtree(root, { skipShared = true } = {}) {
  if (!root) return;
  const matSet = new Set();
  const texSet = new Set();
  root.traverse((obj) => {
    if (skipShared && obj.userData?.isSharedCachedAsset) return;
    if (obj.geometry && typeof obj.geometry.dispose === 'function') {
      obj.geometry.dispose();
    }
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => {
        if (!m || m.userData?.isSharedCachedAsset) return;
        matSet.add(m);
        ['map', 'emissiveMap', 'alphaMap', 'normalMap', 'roughnessMap', 'metalnessMap'].forEach((k) => {
          if (m[k] && typeof m[k].dispose === 'function' && !m[k].userData?.isSharedCachedAsset) {
            texSet.add(m[k]);
          }
        });
      });
    }
  });
  texSet.forEach((t) => {
    try { t.dispose(); } catch (_) {}
  });
  matSet.forEach((m) => {
    try { m.dispose(); } catch (_) {}
  });
}

export function createThanhGiongStoryRealm({
  roomGroup,
  interiorGroup,
  mainScene = null,
  realmScene = null,
  cameraManager = null,
  portalPositionLocal = new THREE.Vector3(0, 0, -10.5),
  roomCenter = new THREE.Vector3(-48.0, 0.0, 19.0),
  tourStopsInRoom = null
} = {}) {
  let _disposed = false;
  let _cameraManager = cameraManager || (typeof window !== 'undefined' ? window.__cameraManager : null);
  let _camera = cameraManager?.camera || (typeof window !== 'undefined' ? window.__camera : null);
  let _renderer = (typeof window !== 'undefined' ? window.__renderer : null);
  let _hitboxManager = (typeof window !== 'undefined' ? (window.__museumHitboxManager || window.__hitboxManager) : null);
  let _loreGuide = (typeof window !== 'undefined' ? (window.__loreGuide || window.__museumLoreGuide) : null);
  let _spatialAudio = (typeof window !== 'undefined' ? (window.__spatialAudio || window.__museumSpatialAudio) : null);
  let _portalInteraction = (typeof window !== 'undefined' ? window.__portalInteraction : null);
  let _immersionSystem = (typeof window !== 'undefined' ? (window.__museumImmersion || window.__museumImmersionSystem) : null);

  let _isInsideRealm = false;
  let _isTransitioning = false;
  let _reentryCooldown = 0;
  let _registeredPortal = false;
  let _portalHitboxesSynced = false;

  let _realmRoot = null;
  let _realmDebugGroup = null;
  let _realmDisposables = [];
  let _realmWalkables = [];
  let _realmState = null;
  let _prevSceneFog = null;
  let _prevSceneBg = null;

  // Auto-tour state
  let _tourActive = false;
  let _tourPhase = 'idle'; // 'room_flying' | 'room_dwelling' | 'portal_crossing' | 'realm_flying' | 'realm_dwelling'
  let _tourIdx = 0;
  let _tourPhaseStart = 0;
  const _tourFlightStartPos = new THREE.Vector3();
  const _tourFlightStartQuat = new THREE.Quaternion();
  const _tourFlightEndQuat = new THREE.Quaternion();
  const _tourTmpVec = new THREE.Vector3();
  const _tourLookVec = new THREE.Vector3();
  const _tourOrbitCenterWorld = new THREE.Vector3();
  const _tourOrbitLocalVec = new THREE.Vector3();

  // Reuse scratch vectors/raycaster/matrix to minimize per-frame GC
  const _raycaster = new THREE.Raycaster();
  const _ndc = new THREE.Vector2();
  const _tmpLookMat = new THREE.Matrix4();
  const _tmpLookQuat = new THREE.Quaternion();
  const _worldUp = new THREE.Vector3(0, 1, 0);
  const _roomCenterVec = roomCenter instanceof THREE.Vector3
    ? roomCenter.clone()
    : new THREE.Vector3(roomCenter?.x ?? -48.0, roomCenter?.y ?? 0.0, roomCenter?.z ?? 19.0);
  const museumPortalTriggerWorldPos = new THREE.Vector3();
  const realmSpawnPos = new THREE.Vector3(-1.2, 2.35, 44.5);
  const realmSpawnLookAt = new THREE.Vector3(0.4, 4.4, -12.0);
  const _portalDisposables = [];

  // =========================================================================
  // PHẦN 1: CỔNG DỊCH CHUYỂN ĐỀN PHÙ ĐỔNG (INSIDE `interiorGroup`)
  // =========================================================================
  const portalGroup = new THREE.Group();
  portalGroup.name = 'ThanhGiong_SocSon_Portal_Group';
  if (portalPositionLocal instanceof THREE.Vector3) {
    portalGroup.position.copy(portalPositionLocal);
  } else {
    portalGroup.position.set(
      portalPositionLocal?.x ?? 0,
      portalPositionLocal?.y ?? 0,
      portalPositionLocal?.z ?? -10.5
    );
  }
  interiorGroup?.add(portalGroup);

  const fallbackPortalArch = buildProceduralPhuDongArch(_portalDisposables);
  portalGroup.add(fallbackPortalArch);

  // Tải bất đồng bộ mô hình GLB chính thức (`portal_soc_son.glb`) và thay thế fallback nếu có
  try {
    loadGlbCached(GLB_PORTAL_CANDIDATES, {
      targetHeight: 4.1,
      maxTextureSize: 1024,
      disableMipmaps: true,
      prepareOptions: null,
      materialMode: 'pbr'
    }).then((glbModel) => {
      if (_disposed || !glbModel) return;
      try {
        glbModel.name = 'Portal_SocSon_GLB';
        glbModel.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(glbModel);
        if (!box.isEmpty()) {
          const center = box.getCenter(new THREE.Vector3());
          glbModel.position.x -= center.x;
          glbModel.position.z -= center.z;
          glbModel.position.y -= box.min.y;
        }
        glbModel.traverse((child) => {
          child.userData.isSharedCachedAsset = true;
          if (child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;
            child.frustumCulled = true;
            child.userData.ignoreRaycaster = true;
          }
        });
        fallbackPortalArch.visible = false;
        portalGroup.remove(fallbackPortalArch);
        disposeObjectSubtree(fallbackPortalArch, { skipShared: true });
        portalGroup.add(glbModel);

        // Khớp dòng xoáy lửa vàng, đèn lồng & proxy vừa vặn lòng cổng portal_soc_son.glb (scale ~0.727 -> lỗ cổng ~1.89m x 2.63m)
        vortexCurtain.scale.set(1.78 / 2.52, 2.48 / 3.32, 1);
        vortexCurtain.position.set(0, 1.32, 0.04);
        portalFloorRing.scale.set(0.86, 0.86, 1);
        portalSignMesh.visible = false;
        portalLampSpecs.forEach((spec, idx) => {
          const sx = idx === 0 ? -1.42 : 1.42;
          spec.orb.position.set(sx, 1.55, 0.52);
          spec.glow.position.set(sx, 1.55, 0.52);
        });
      } catch (err) {
        console.warn('[ThanhGiongRealm] portal_soc_son.glb mount warning:', err);
      }
    }).catch(() => {
      // Fallback procedural Phù Đổng + Tre Đằng Ngà vẫn hoạt động bình thường
    });
  } catch (_) {}

  // Shader dòng xoáy lửa vàng Đông Sơn bên trong khung cổng
  const portalShaderMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 1.0 }
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uIntensity;
      varying vec2 vUv;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453);
      }
      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        p.x *= 0.88;
        float r = length(p);
        float a = atan(p.y, p.x);

        // Vòng xoáy lửa thiêng Phù Đổng & tia mặt trời Đông Sơn
        float swirl = sin(r * 13.0 - uTime * 3.1 + a * 3.0) * 0.5 + 0.5;
        float sunRays = pow(abs(cos(a * 6.0 + uTime * 0.45)), 4.0) * smoothstep(0.95, 0.15, r);
        float risingSparks = noise(vec2(vUv.x * 7.5, vUv.y * 10.0 - uTime * 1.9));

        float ellipseMask = 1.0 - smoothstep(0.68, 0.99, length(vec2(p.x * 1.08, (vUv.y - 0.48) * 1.95)));
        float core = exp(-r * 2.35);

        vec3 emberRed = vec3(1.0, 0.27, 0.04);
        vec3 bronzeGold = vec3(0.95, 0.68, 0.15);
        vec3 brightCore = vec3(1.0, 0.95, 0.74);

        vec3 col = mix(emberRed, bronzeGold, clamp(swirl * 0.72 + sunRays * 0.35, 0.0, 1.0));
        col = mix(col, brightCore, clamp(core * 0.75 + risingSparks * 0.28, 0.0, 1.0));

        float alpha = ellipseMask * clamp(0.42 + core * 0.52 + swirl * 0.24 + risingSparks * 0.22, 0.0, 0.92) * uIntensity;
        gl_FragColor = vec4(col, alpha);
      }
    `
  });

  const vortexCurtain = new THREE.Mesh(
    prepGeo(new THREE.PlaneGeometry(2.52, 3.32, 1, 1)),
    portalShaderMat
  );
  vortexCurtain.name = 'ThanhGiong_Portal_FireGoldVortex';
  vortexCurtain.position.set(0, 1.78, 0.04);
  vortexCurtain.userData.ignoreRaycaster = true;
  portalGroup.add(vortexCurtain);

  const haloRingMat = new THREE.MeshBasicMaterial({
    color: 0xf97316,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const portalFloorRing = new THREE.Mesh(
    prepGeo(new THREE.RingGeometry(1.42, 1.88, 32)).rotateX(-Math.PI / 2),
    haloRingMat
  );
  portalFloorRing.position.set(0, 0.03, 0.45);
  portalFloorRing.userData.ignoreRaycaster = true;
  portalGroup.add(portalFloorRing);

  // Subtle pulsing emissive lamp specs (0 dynamic PointLights để giữ cố định shader count trong mainScene)
  const portalLampSpecs = [];
  const lampOrbGeo = prepGeo(new THREE.SphereGeometry(0.11, 10, 8));
  const lampHaloGeo = prepGeo(new THREE.SphereGeometry(0.24, 10, 8));
  [-1.78, 1.78].forEach((lx) => {
    const orbMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
    const orb = new THREE.Mesh(lampOrbGeo, orbMat);
    orb.position.set(lx, 1.65, 0.52);
    orb.userData.ignoreRaycaster = true;

    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xff6a1a,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const glow = new THREE.Mesh(lampHaloGeo, glowMat);
    glow.position.copy(orb.position);
    glow.userData.ignoreRaycaster = true;

    portalGroup.add(orb, glow);
    portalLampSpecs.push({ orb, glow, orbMat, glowMat, phase: lx > 0 ? 1.5 : 0.0 });
  });

  // Biển đề tên cổng dịch chuyển
  const portalSignTex = createPlaqueTexture(
    'CỔNG SỬ THI • CHIẾN TRƯỜNG SÓC SƠN',
    'Click vào cổng hoặc bước lại gần (< 2.5m) để tiến vào',
    _portalDisposables
  );
  const portalSignMat = new THREE.MeshBasicMaterial({
    map: portalSignTex,
    transparent: true,
    side: THREE.DoubleSide
  });
  const portalSignMesh = new THREE.Mesh(prepGeo(new THREE.PlaneGeometry(3.2, 0.74)), portalSignMat);
  portalSignMesh.position.set(0, 4.38, 0.25);
  portalSignMesh.userData.ignoreRaycaster = true;
  portalGroup.add(portalSignMesh);

  // Proxy raycast vô hình bao toàn bộ cửa cổng
  const portalClickProxy = new THREE.Mesh(
    prepGeo(new THREE.BoxGeometry(2.9, 3.85, 1.45)),
    new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    })
  );
  portalClickProxy.name = 'ThanhGiong_Portal_ClickProxy';
  portalClickProxy.position.set(0, 1.92, 0);
  portalClickProxy.userData = {
    isClickProxy: true,
    isBookPortal: true,
    isTeleportBook: true,
    portalTargetRealm: 'THANH_GIONG_REALM',
    targetRealm: 'THANH_GIONG_REALM',
    ignoreRaycaster: false,
    linkedVisualObject: portalGroup,
    portalMetadata: {
      id: 'thanh_giong',
      title: 'CÕI NGOẠI CẢNH • CHIẾN TRƯỜNG GIẶC ÂN & ĐỈNH NÚI SÓC SƠN',
      author: 'Truyền thuyết Dân gian Việt Nam (Thời Hùng Vương)',
      genre: 'Sử thi Thần thoại • Thánh Gióng – Phù Đổng Thiên Vương',
      quote: '“Vung tre đằng ngà quét sạch giặc Ân, cưỡi ngựa sắt bay lên đỉnh Sóc Sơn...”',
      themeColor: 0xf97316,
      targetRealm: 'THANH_GIONG_REALM',
      portalReady: true,
      onActivate: () => enterRealm('thanhgiong')
    },
    onActivate: () => enterRealm('thanhgiong')
  };
  portalGroup.add(portalClickProxy);

  function syncMuseumPortalHitboxes() {
    if (!roomGroup || !interiorGroup) return;
    roomGroup.updateMatrixWorld(true);
    interiorGroup.updateMatrixWorld(true);

    museumPortalTriggerWorldPos.copy(
      interiorGroup.localToWorld(new THREE.Vector3(portalGroup.position.x, 1.8, portalGroup.position.z))
    );

    if (_hitboxManager) {
      if (!_portalHitboxesSynced) {
        _portalHitboxesSynced = true;
        const leftPierWorld = interiorGroup.localToWorld(
          new THREE.Vector3(portalGroup.position.x - 1.75, 1.9, portalGroup.position.z)
        );
        const rightPierWorld = interiorGroup.localToWorld(
          new THREE.Vector3(portalGroup.position.x + 1.75, 1.9, portalGroup.position.z)
        );
        _hitboxManager.registerSolidObjectCollider?.(null, {
          customBox: new THREE.Box3().setFromCenterAndSize(leftPierWorld, new THREE.Vector3(1.3, 3.8, 1.4)),
          tag: 'TG_PortalPierLeft',
          helperColor: 0xf97316,
          realm: 'museum'
        });
        _hitboxManager.registerSolidObjectCollider?.(null, {
          customBox: new THREE.Box3().setFromCenterAndSize(rightPierWorld, new THREE.Vector3(1.3, 3.8, 1.4)),
          tag: 'TG_PortalPierRight',
          helperColor: 0xf97316,
          realm: 'museum'
        });
      }

      portalClickProxy.updateMatrixWorld(true);
      if (Array.isArray(_hitboxManager.clickProxies) && !_hitboxManager.clickProxies.includes(portalClickProxy)) {
        portalClickProxy.userData.realm = 'museum';
        _hitboxManager.clickProxies.push(portalClickProxy);
        const portalBox = new THREE.Box3().setFromObject(portalClickProxy);
        const helper = new THREE.Box3Helper(portalBox, 0xfde047);
        helper.name = `Helper_${portalClickProxy.name}`;
        _hitboxManager.debugHelpers?.add(helper);
      }
    }
  }

  // =========================================================================
  // PHẦN 2: OVERLAY DOLLY-ZOOM & HUD CÕI SÓC SƠN
  // =========================================================================
  function getOrCreateVignetteOverlay() {
    if (typeof document === 'undefined') return null;
    let el = document.getElementById('thanhgiong-dolly-vignette');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'thanhgiong-dolly-vignette';
    el.style.cssText = `
      position: fixed; inset: 0; pointer-events: none; z-index: 999990;
      opacity: 0; transition: opacity 0.18s ease;
      background: radial-gradient(circle, rgba(255,115,29,0.28) 0%, rgba(16,29,41,0.92) 56%, #05080f 100%);
    `;
    document.body.appendChild(el);
    return el;
  }

  function getOrCreateRealmHUD() {
    if (typeof document === 'undefined') return null;
    let hud = document.getElementById('thanhgiong-realm-top-hud');
    if (hud) return hud;

    hud = document.createElement('div');
    hud.id = 'thanhgiong-realm-top-hud';
    hud.style.cssText = `
      position: fixed; top: 62px; left: clamp(436px, calc(50% + 110px), calc(100vw - 260px)); transform: translateX(-50%);
      max-width: min(515px, calc(100vw - 455px)); white-space: nowrap;
      z-index: 99990; display: none; align-items: center; gap: 8px;
      padding: 6px 14px; border-radius: 999px;
      background: linear-gradient(135deg, rgba(16,29,41,0.95), rgba(88,28,12,0.92));
      border: 1.5px solid #f59e0b; color: #fef3c7;
      font-family: "Segoe UI", system-ui, sans-serif; font-size: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.72); backdrop-filter: blur(8px);
    `;
    hud.innerHTML = `
      <span id="tg-hud-title" style="font-weight:700; color:#fde68a; letter-spacing:0.3px; overflow:hidden; text-overflow:ellipsis;">
        🔥 CHIẾN TRƯỜNG & ĐỈNH SÓC SƠN
      </span>
      <button id="tg-btn-tour" style="
        background: linear-gradient(90deg, #d97706, #fbbf24); border:none; color:#111827;
        padding:5px 11px; border-radius:999px; cursor:pointer; font-weight:700; font-size:11.5px; flex-shrink:0;
      ">🧭 Auto-Tour</button>
      <button id="tg-btn-exit" style="
        background: rgba(153,27,27,0.82); border:1px solid #f87171; color:#fee2e2;
        padding:5px 11px; border-radius:999px; cursor:pointer; font-weight:700; font-size:11.5px; flex-shrink:0;
      ">⬅ Phòng 101 [ESC]</button>
    `;
    document.body.appendChild(hud);

    document.getElementById('tg-btn-tour')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (_tourActive) stopAutoTour();
      else startRealmOnlyTour();
    });
    document.getElementById('tg-btn-exit')?.addEventListener('click', (e) => {
      e.stopPropagation();
      exitRealm();
    });

    return hud;
  }

  function updateRoomTourBanner(text) {
    if (typeof document === 'undefined') return;
    let el = document.getElementById('thanhgiong-room-tour-banner');
    if (!text) {
      if (el) el.style.display = 'none';
      return;
    }
    if (!el) {
      el = document.createElement('div');
      el.id = 'thanhgiong-room-tour-banner';
      el.style.cssText = `
        position: fixed; top: 62px; left: clamp(436px, calc(50% + 110px), calc(100vw - 260px)); transform: translateX(-50%);
        max-width: min(540px, calc(100vw - 455px)); white-space: nowrap;
        z-index: 99985; padding: 6px 14px; border-radius: 999px;
        background: linear-gradient(135deg, rgba(16,29,41,0.95), rgba(124,45,18,0.90));
        border: 1.5px solid #f59e0b; color: #fde68a;
        font-family: "Segoe UI", sans-serif; font-size: 12px; font-weight: 700;
        box-shadow: 0 8px 24px rgba(0,0,0,0.7); display: flex; align-items: center; gap: 10px;
      `;
      document.body.appendChild(el);
    }
    el.style.display = 'flex';
    el.innerHTML = `<span style="overflow:hidden; text-overflow:ellipsis;">🧭 ${text}</span><button id="tg-room-tour-stop" style="background:#f59e0b;color:#0f172a;border:none;border-radius:999px;padding:4px 10px;font-weight:700;font-size:11.5px;cursor:pointer;flex-shrink:0;">Dừng [ESC]</button>`;
    document.getElementById('tg-room-tour-stop')?.addEventListener('click', (e) => {
      e.stopPropagation();
      stopAutoTour();
    });
  }

  /**
   * Tạo texture Vòm Cổng Trời Thiên Đình (Heavenly Rift)
   * Tâm vàng kim rực rỡ loang sang cam lửa thiêng và tím sẫm thiên đình với 16 tia hào quang Đông Sơn
   */
  function createHeavenlyRiftTexture(disposables) {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const cx = 256;
    const cy = 256;
    ctx.clearRect(0, 0, 512, 512);

    // Gradient hào quang thiên đình
    const radGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 256);
    radGrad.addColorStop(0.0, 'rgba(255, 255, 240, 1.0)');     // Tâm vàng sáng rực
    radGrad.addColorStop(0.12, 'rgba(254, 240, 138, 0.95)');   // Vàng kim nhạt
    radGrad.addColorStop(0.28, 'rgba(251, 191, 36, 0.85)');    // Vàng đồng hoàng kim
    radGrad.addColorStop(0.48, 'rgba(249, 115, 22, 0.65)');    // Cam lửa
    radGrad.addColorStop(0.70, 'rgba(220, 38, 38, 0.38)');     // Đỏ thiêng
    radGrad.addColorStop(0.88, 'rgba(88, 28, 135, 0.18)');     // Tím cõi trời
    radGrad.addColorStop(1.0, 'rgba(18, 10, 42, 0.0)');        // Tan vào nền trời

    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 256, 0, Math.PI * 2);
    ctx.fill();

    // 16 tia sáng tỏa Đông Sơn
    ctx.save();
    ctx.translate(cx, cy);
    for (let i = 0; i < 16; i++) {
      ctx.rotate((Math.PI * 2) / 16);
      const rayLen = i % 2 === 0 ? 245 : 185;
      const rayGrad = ctx.createLinearGradient(0, 0, 0, rayLen);
      rayGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.9)');
      rayGrad.addColorStop(0.3, 'rgba(253, 230, 138, 0.6)');
      rayGrad.addColorStop(1.0, 'rgba(249, 115, 22, 0.0)');
      ctx.fillStyle = rayGrad;
      ctx.beginPath();
      ctx.moveTo(-6, 20);
      ctx.lineTo(0, rayLen);
      ctx.lineTo(6, 20);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // Vành đai thái cực / hào quang thiên đỉnh
    ctx.strokeStyle = 'rgba(254, 243, 199, 0.7)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 78, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 128, 0, Math.PI * 2);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    if (disposables) disposables.push(tex);
    return tex;
  }

  // =========================================================================
  // PHẦN 3: LAZY-MOUNT ĐẠI CẢNH CHIẾN TRƯỜNG & ĐỈNH NÚI SÓC SƠN (`realmScene`)
  // =========================================================================
  function mountSocSonRealm() {
    if (!realmScene) return;
    disposeSocSonRealm();

    const rng = createSeededRandom(1207);
    const dummy = new THREE.Object3D();
    const root = new THREE.Group();
    root.name = 'ThanhGiong_SocSon_Universe_Root';
    realmScene.add(root);
    _realmRoot = root;

    // Bảo toàn & thiết lập khí quyển + sương hoàng hôn rực lửa
    _prevSceneFog = realmScene.fog || null;
    _prevSceneBg = realmScene.background || null;
    realmScene.background = new THREE.Color(0x101d29);
    realmScene.fog = new THREE.FogExp2(0x281312, 0.0082);

    // Ánh sáng hoàng hôn rực lửa trên dãy Sóc Sơn (castShadow = false)
    const hemiLight = new THREE.HemisphereLight(0xff8533, 0x162230, 1.38);
    root.add(hemiLight);

    const sunDirLight = new THREE.DirectionalLight(0xffb366, 1.9);
    sunDirLight.position.set(14, 28, -82);
    sunDirLight.castShadow = false;
    root.add(sunDirLight);

    const battleEmberLight = new THREE.PointLight(0xff5a1f, 11.0, 28.0, 1.4);
    battleEmberLight.position.set(1.5, 3.2, 22.0);
    battleEmberLight.castShadow = false;
    root.add(battleEmberLight);

    const exitDrumLight = new THREE.PointLight(0xfbbf24, 10.0, 18.0, 1.5);
    exitDrumLight.position.set(-4.5, 3.2, 42.0);
    exitDrumLight.castShadow = false;
    root.add(exitDrumLight);

    const summitHaloLight = new THREE.PointLight(0xfde68a, 14.0, 26.0, 1.35);
    summitHaloLight.position.set(0.0, 18.8, -56.0);
    summitHaloLight.castShadow = false;
    root.add(summitHaloLight);

    const flyingGiongLight = new THREE.PointLight(0xff9900, 16.0, 36.0, 1.25);
    flyingGiongLight.position.set(0.0, 30.5, -56.0);
    flyingGiongLight.castShadow = false;
    root.add(flyingGiongLight);

    // 1. Vòm trời hoàng hôn rực lửa (#ff4500 -> #c59b27 -> #101d29)
    const skyGeo = prepGeo(new THREE.SphereGeometry(235, 36, 20));
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: { uTime: { value: 0 } },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        varying vec3 vDir;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
          );
        }

        void main() {
          float h = clamp(vDir.y, 0.0, 1.0);
          vec3 horizonFire = vec3(1.0, 0.2706, 0.0);     // #ff4500
          vec3 midAmber    = vec3(0.7725, 0.6078, 0.1529); // #c59b27
          vec3 zenithDeep  = vec3(0.0627, 0.1137, 0.1608); // #101d29

          vec3 col = mix(horizonFire, midAmber, smoothstep(0.02, 0.28, h));
          col = mix(col, zenithDeep, smoothstep(0.24, 0.72, h));

          // Mặt trời lặn sau đỉnh Sóc Sơn
          vec3 sunDir = normalize(vec3(0.05, 0.22, -1.0));
          float sunAmt = max(dot(normalize(vDir), sunDir), 0.0);
          col += vec3(1.0, 0.55, 0.18) * pow(sunAmt, 14.0) * 0.65;
          col += vec3(1.0, 0.92, 0.65) * smoothstep(0.9965, 0.9992, sunAmt) * 1.1;

          // Mây khói chiến trận trôi nhẹ trên vòm trời
          vec2 cloudUv = vDir.xz / (h + 0.18) * 1.6 + vec2(uTime * 0.014, uTime * 0.006);
          float cloud = noise(cloudUv * 2.4);
          col = mix(col, vec3(0.95, 0.42, 0.12), cloud * smoothstep(0.05, 0.36, h) * (1.0 - smoothstep(0.42, 0.78, h)) * 0.28);

          gl_FragColor = vec4(col, 1.0);
        }
      `
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    skyDome.name = 'SocSon_FierySunset_SkyDome';
    skyDome.userData.ignoreRaycaster = true;
    root.add(skyDome);

    // 1.1 Vòm Cổng Trời Thiên Đình (Heavenly Rift) ngay trên Đỉnh Sóc Sơn
    const riftTex = createHeavenlyRiftTexture(_realmDisposables);
    const riftMat = new THREE.MeshBasicMaterial({
      map: riftTex,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const riftGeo = prepGeo(new THREE.PlaneGeometry(38, 38));
    const heavenlyRiftMesh = new THREE.Mesh(riftGeo, riftMat);
    heavenlyRiftMesh.name = 'SocSon_HeavenlyRift_Gate';
    heavenlyRiftMesh.position.set(0, 48.0, -56.0);
    heavenlyRiftMesh.rotation.x = Math.PI / 2;
    heavenlyRiftMesh.userData.ignoreRaycaster = true;
    root.add(heavenlyRiftMesh);
    _realmDisposables.push(riftGeo, riftMat);

    // 2. Địa hình Núi Sóc Sơn liên tục từ Chân Núi (z = +46, y = 0) lên Đỉnh (z = -56, y = +15)
    const terrainGeo = new THREE.PlaneGeometry(126, 136, 72, 76);
    terrainGeo.rotateX(-Math.PI / 2);
    const posAttr = terrainGeo.attributes.position;
    const terrainColors = new Float32Array(posAttr.count * 3);
    const terrainOffsetZ = -8.0; // cover z = -76 .. +60

    const colScorched = new THREE.Color(0x281b16);
    const colTrailStone = new THREE.Color(0x4b4640);
    const colMountainSlope = new THREE.Color(0x1f2d24);
    const colSummitGranite = new THREE.Color(0x6b5c46);
    const tmpCol = new THREE.Color();

    for (let i = 0; i < posAttr.count; i++) {
      const wx = posAttr.getX(i);
      const wz = posAttr.getZ(i) + terrainOffsetZ;
      const wy = getSocSonHeightAt(wx, wz);
      posAttr.setY(i, wy);

      const dxTrail = Math.abs(wx - getSocSonTrailCenterX(wz));
      const trailBlend = 1.0 - smoothstep(1.9, 3.6, dxTrail);
      const summitBlend = smoothstep(11.5, 14.8, wy);
      const slopeBlend = smoothstep(0.5, 7.5, wy);

      tmpCol.copy(colScorched).lerp(colMountainSlope, slopeBlend);
      tmpCol.lerp(colTrailStone, trailBlend * 0.85);
      tmpCol.lerp(colSummitGranite, summitBlend);

      terrainColors[i * 3] = tmpCol.r;
      terrainColors[i * 3 + 1] = tmpCol.g;
      terrainColors[i * 3 + 2] = tmpCol.b;
    }
    terrainGeo.setAttribute('color', new THREE.BufferAttribute(terrainColors, 3));
    prepGeo(terrainGeo, true);

    const terrainMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.06,
      side: THREE.FrontSide
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.name = 'SocSon_Mountain_Terrain';
    terrainMesh.position.set(0, 0, terrainOffsetZ);
    terrainMesh.userData.isFloor = true;
    terrainMesh.userData.isWalkable = true;
    terrainMesh.castShadow = false;
    terrainMesh.receiveShadow = false;
    terrainMesh.frustumCulled = true;
    root.add(terrainMesh);
    _realmWalkables.push(terrainMesh);

    // 2.1 Bậc đá cổ dọc đường leo Núi Sóc Sơn (InstancedMesh)
    const stepCount = 68;
    const stepGeo = prepGeo(new THREE.BoxGeometry(3.2, 0.24, 1.05));
    const stepMat = new THREE.MeshStandardMaterial({
      color: 0x57534e,
      roughness: 0.88,
      metalness: 0.1,
      side: THREE.FrontSide
    });
    const instStoneSteps = new THREE.InstancedMesh(stepGeo, stepMat, stepCount);
    instStoneSteps.name = 'SocSon_StonePath_Steps';
    instStoneSteps.userData.ignoreRaycaster = true;
    for (let i = 0; i < stepCount; i++) {
      const sz = 43.0 - i * 1.38;
      const sx = getSocSonTrailCenterX(sz);
      const sy = getSocSonHeightAt(sx, sz);
      const syNext = getSocSonHeightAt(getSocSonTrailCenterX(sz - 1.0), sz - 1.0);
      const sxNext = getSocSonTrailCenterX(sz - 1.0);
      const slopePitch = Math.atan2(syNext - sy, 1.0);
      const yaw = Math.atan2(sxNext - sx, -1.0);
      dummy.position.set(sx, sy + 0.04, sz);
      dummy.rotation.set(slopePitch, -yaw, 0);
      dummy.scale.set(1.0 + (i % 3) * 0.05, 1, 1);
      dummy.updateMatrix();
      instStoneSteps.setMatrixAt(i, dummy.matrix);
    }
    instStoneSteps.instanceMatrix.needsUpdate = true;
    setNoShadowCull(instStoneSteps);
    root.add(instStoneSteps);

    // 3. Dãy núi Sóc Sơn nhiều lớp với sống núi uốn lượn mềm mại (merged draw calls)
    const mountainGroup = new THREE.Group();
    mountainGroup.name = 'SocSon_Layered_Mountains';
    const mtNearMat = new THREE.MeshLambertMaterial({ color: 0x1c2530, side: THREE.FrontSide });
    const mtMidMat = new THREE.MeshLambertMaterial({ color: 0x182230, emissive: 0x2b1108, emissiveIntensity: 0.28, side: THREE.FrontSide });
    const mtFarMat = new THREE.MeshLambertMaterial({ color: 0x131d29, emissive: 0x451a03, emissiveIntensity: 0.35, side: THREE.FrontSide });
    const layerMats = [mtNearMat, mtMidMat, mtFarMat];
    const layerRadii = [72, 102, 134];
    const ridgeGeos = [
      createSoftMountainRidgeGeometry(24, 18, 11),
      createSoftMountainRidgeGeometry(28, 22, 29),
      createSoftMountainRidgeGeometry(32, 26, 47)
    ];

    layerRadii.forEach((radius, layerIdx) => {
      const count = 12 + layerIdx * 3;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2 + layerIdx * 0.26;
        const dist = radius + (rng() - 0.5) * 14.0;
        const mx = Math.cos(angle) * dist;
        const mz = Math.sin(angle) * dist - 14.0;
        const heightScale = (0.72 + layerIdx * 0.36 + rng() * 0.42) * (mz < -30 ? 1.24 : 0.88);
        const widthScale = 1.05 + layerIdx * 0.32 + rng() * 0.45;
        const ridgeMesh = new THREE.Mesh(ridgeGeos[i % ridgeGeos.length], layerMats[layerIdx]);
        ridgeMesh.position.set(mx, -2.5, mz);
        ridgeMesh.rotation.y = -angle + Math.PI * 0.5 + (rng() - 0.5) * 0.45;
        ridgeMesh.scale.set(widthScale, heightScale, 0.9 + rng() * 0.35);
        mountainGroup.add(ridgeMesh);
      }
    });
    setNoShadowCull(mountainGroup, { ignoreRaycaster: true });
    mergeGroupMeshesByMaterial(mountainGroup, { preserveUserData: true });
    setNoShadowCull(mountainGroup, { ignoreRaycaster: true });
    root.add(mountainGroup);

    // 4. Đầm nước chân núi Sóc Sơn với Shader sóng GPU phản chiếu lửa chiến trận (0 CPU loop)
    const lakeWaterGeo = prepGeo(new THREE.PlaneGeometry(25, 27, 28, 28)).rotateX(-Math.PI / 2);
    const lakeWaterMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: true,
      uniforms: {
        uTime: { value: 0 },
        uDeepColor: { value: new THREE.Color(0x0f1c2b) },
        uSkyColor: { value: new THREE.Color(0x3a241b) },
        uEmberColor: { value: new THREE.Color(0xff6b1a) }
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        varying vec2 vUv;
        varying float vWave;
        void main() {
          vUv = uv;
          vec3 pos = position;
          float w = sin(pos.x * 0.72 + uTime * 1.85) * 0.055
                  + cos(pos.z * 0.64 - uTime * 1.45) * 0.045;
          pos.y += w;
          vWave = w;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uDeepColor;
        uniform vec3 uSkyColor;
        uniform vec3 uEmberColor;
        varying vec2 vUv;
        varying float vWave;
        void main() {
          vec2 p = vUv * 2.0 - 1.0;
          float d = length(vec2(p.x / 0.92, p.y / 0.95));
          float edgeFade = 1.0 - smoothstep(0.68, 0.98, d);
          if (edgeFade <= 0.01) discard;

          float shimmer = sin(vUv.x * 38.0 + uTime * 2.4 + vWave * 14.0)
                        * cos(vUv.y * 34.0 - uTime * 1.9);
          float glint = smoothstep(0.55, 0.96, shimmer * 0.5 + 0.5);

          vec3 col = mix(uDeepColor, uSkyColor, clamp(0.35 + vWave * 3.5, 0.0, 1.0));
          col += uEmberColor * glint * 0.58;
          gl_FragColor = vec4(col, 0.88 * edgeFade);
        }
      `
    });
    const lakeWaterMesh = new THREE.Mesh(lakeWaterGeo, lakeWaterMat);
    lakeWaterMesh.name = 'SocSon_MountainLake_Water';
    lakeWaterMesh.position.set(21.0, 0.14, 20.0);
    lakeWaterMesh.userData.ignoreRaycaster = true;
    lakeWaterMesh.castShadow = false;
    lakeWaterMesh.receiveShadow = false;
    root.add(lakeWaterMesh);

    // 4.1 Chuỗi Ao Hồ Dấu Chân Ngựa Chiến ("Ao hồ dấu chân ngựa") & Bọt nước quanh bờ (InstancedMesh)
    const hoofLakeGroup = new THREE.Group();
    hoofLakeGroup.name = 'SocSon_HoofPrint_Lakes';
    const hoofLakeSpots = [
      { x: -14.0, z: 32.0, rx: 4.8, rz: 3.8, rotY: 0.25 },
      { x: 9.5, z: 26.0, rx: 5.2, rz: 4.2, rotY: -0.32 },
      { x: -7.0, z: 15.0, rx: 4.2, rz: 3.4, rotY: 0.18 },
      { x: 13.5, z: 7.0, rx: 4.6, rz: 3.6, rotY: -0.21 },
      { x: -2.5, z: -3.0, rx: 3.8, rz: 3.0, rotY: 0.12 }
    ];

    hoofLakeSpots.forEach((spot, idx) => {
      const lakeY = getSocSonHeightAt(spot.x, spot.z) + 0.08;
      const geo = prepGeo(new THREE.PlaneGeometry(spot.rx * 2, spot.rz * 2, 16, 16)).rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, lakeWaterMat);
      mesh.name = `SocSon_HoofLake_${idx}`;
      mesh.position.set(spot.x, lakeY, spot.z);
      mesh.rotation.y = spot.rotY;
      mesh.userData.ignoreRaycaster = true;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      hoofLakeGroup.add(mesh);
      _realmDisposables.push(geo);
    });
    root.add(hoofLakeGroup);

    const foamCount = 120;
    const foamGeo = prepGeo(new THREE.CircleGeometry(0.35, 6)).rotateX(-Math.PI / 2);
    const foamMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    const instFoam = new THREE.InstancedMesh(foamGeo, foamMat, foamCount);
    instFoam.name = 'SocSon_HoofLake_Foam';
    instFoam.userData.ignoreRaycaster = true;
    let foamIdx = 0;
    hoofLakeSpots.forEach((spot) => {
      const perSpot = Math.floor(foamCount / hoofLakeSpots.length);
      for (let i = 0; i < perSpot && foamIdx < foamCount; i++) {
        const a = (i / perSpot) * Math.PI * 2 + rng() * 0.2;
        const fx = spot.x + Math.cos(a) * spot.rx * (0.88 + rng() * 0.18);
        const fz = spot.z + Math.sin(a) * spot.rz * (0.88 + rng() * 0.18);
        const fy = getSocSonHeightAt(fx, fz) + 0.06;
        dummy.position.set(fx, fy, fz);
        const sc = 0.6 + rng() * 0.7;
        dummy.scale.set(sc, sc, sc);
        dummy.rotation.set(0, rng() * Math.PI * 2, 0);
        dummy.updateMatrix();
        instFoam.setMatrixAt(foamIdx++, dummy.matrix);
      }
    });
    instFoam.instanceMatrix.needsUpdate = true;
    setNoShadowCull(instFoam, { ignoreRaycaster: true });
    root.add(instFoam);
    _realmDisposables.push(foamGeo, foamMat);

    // 5. Rừng Tre Đằng Ngà Đốt Vàng & Tán Lá Nan Quạt (Standing & Battle-Torn Uprooted InstancedMesh)
    const standingBambooCount = 136;
    const uprootedBambooCount = 52;
    const totalBamboo = standingBambooCount + uprootedBambooCount;

    const culmGeo = createGoldenBambooCulmGeometry();
    const bambooMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      emissive: 0x3f2304,
      emissiveIntensity: 0.18,
      roughness: 0.46,
      metalness: 0.22,
      side: THREE.FrontSide
    });
    const foliageGeo = createBambooLeafClusterGeometry();
    const foliageMat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      emissive: 0x2f3b08,
      emissiveIntensity: 0.18,
      side: THREE.DoubleSide
    });

    const instBambooCulms = new THREE.InstancedMesh(culmGeo, bambooMat, totalBamboo);
    const instBambooFoliage = new THREE.InstancedMesh(foliageGeo, foliageMat, totalBamboo);
    instBambooCulms.name = 'SocSon_TreDangNga_Culms';
    instBambooFoliage.name = 'SocSon_TreDangNga_Foliage';
    instBambooCulms.userData.ignoreRaycaster = true;
    instBambooFoliage.userData.ignoreRaycaster = true;

    const stalkTipVec = new THREE.Vector3();
    const stalkEuler = new THREE.Euler();
    let bIdx = 0;

    // 5.1 Rừng Tre Đằng Ngà mọc hai bên chiến trường & triền núi
    for (let i = 0; i < standingBambooCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const bz = 41.0 - rng() * 76.0;
      const trailX = getSocSonTrailCenterX(bz);
      let bx = trailX + side * (5.2 + rng() * 24.0);
      // Tránh đặt cây mọc giữa lòng đầm nước
      if (Math.hypot(bx - 21.0, bz - 20.0) < 11.5) {
        bx -= 14.0;
      }
      const by = getSocSonHeightAt(bx, bz);
      const scaleH = 0.78 + rng() * 0.52;
      const leanX = (rng() - 0.5) * 0.14;
      const stalkYaw = rng() * Math.PI * 2;
      const leanZ = (rng() - 0.5) * 0.14;

      dummy.position.set(bx, by + 3.0 * scaleH, bz);
      dummy.rotation.set(leanX, stalkYaw, leanZ);
      dummy.scale.set(1, scaleH, 1);
      dummy.updateMatrix();
      instBambooCulms.setMatrixAt(bIdx, dummy.matrix);

      // Gắn chùm lá tre mềm mại ngay đầu ngọn thân tre cong nhẹ
      stalkEuler.set(leanX, stalkYaw, leanZ);
      stalkTipVec.set(0.08, 3.05 * scaleH, 0).applyEuler(stalkEuler);
      dummy.position.set(bx + stalkTipVec.x, by + 3.0 * scaleH + stalkTipVec.y, bz + stalkTipVec.z);
      dummy.rotation.set(leanX * 0.6, stalkYaw + 0.4, leanZ * 0.6);
      const leafScale = 0.88 + rng() * 0.36;
      dummy.scale.set(leafScale, leafScale, leafScale);
      dummy.updateMatrix();
      instBambooFoliage.setMatrixAt(bIdx, dummy.matrix);
      bIdx++;
    }

    // 5.2 Tre Đằng Ngà bị Thánh Gióng nhổ bật gốc, ngả nghiêng trên chiến trường
    for (let i = 0; i < uprootedBambooCount; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const bz = 8.0 + rng() * 30.0;
      const trailX = getSocSonTrailCenterX(bz);
      const bx = trailX + side * (3.2 + rng() * 11.5);
      const by = getSocSonHeightAt(bx, bz);
      const tiltPitch = (Math.PI * 0.34) + rng() * (Math.PI * 0.14);
      const yaw = rng() * Math.PI * 2;
      const roll = (rng() - 0.5) * 0.35;
      const sc = 0.72 + rng() * 0.36;

      dummy.position.set(bx, by + 0.85, bz);
      dummy.rotation.set(tiltPitch, yaw, roll);
      dummy.scale.set(0.95, sc, 0.95);
      dummy.updateMatrix();
      instBambooCulms.setMatrixAt(bIdx, dummy.matrix);

      // Chùm lá nghiêng tự nhiên đúng theo đầu ngọn cây bị nhổ bật gốc
      stalkEuler.set(tiltPitch, yaw, roll);
      stalkTipVec.set(0.06, 2.95 * sc, 0).applyEuler(stalkEuler);
      dummy.position.set(bx + stalkTipVec.x, by + 0.85 + stalkTipVec.y, bz + stalkTipVec.z);
      dummy.rotation.set(tiltPitch * 0.72, yaw, roll * 0.7);
      const leafScale = 0.72 + rng() * 0.22;
      dummy.scale.set(leafScale, leafScale, leafScale);
      dummy.updateMatrix();
      instBambooFoliage.setMatrixAt(bIdx, dummy.matrix);
      bIdx++;
    }

    instBambooCulms.instanceMatrix.needsUpdate = true;
    instBambooFoliage.instanceMatrix.needsUpdate = true;
    setNoShadowCull(instBambooCulms);
    setNoShadowCull(instBambooFoliage, { doubleSided: true });
    root.add(instBambooCulms, instBambooFoliage);

    // 6. Hố vó ngựa sắt cháy rực lửa & tàn tích binh khí giặc Ân trên chiến trường
    const craterCoords = [
      [-2.2, 34.0], [1.4, 30.5], [-1.0, 26.5], [2.4, 22.8], [0.2, 18.5],
      [3.1, 14.2], [1.2, 9.6], [2.8, 4.2], [1.6, -2.5]
    ];
    const craterRimGroup = new THREE.Group();
    craterRimGroup.name = 'SocSon_HoofCraters_Rims';
    const charredBasaltMat = new THREE.MeshStandardMaterial({
      color: 0x1c1412,
      roughness: 0.95,
      metalness: 0.15,
      side: THREE.FrontSide
    });
    const moltenMagmaMat = new THREE.MeshStandardMaterial({
      color: 0xff5a1f,
      emissive: 0xff4500,
      emissiveIntensity: 1.9,
      roughness: 0.4,
      metalness: 0.1,
      side: THREE.FrontSide
    });

    const magmaCoreGeo = prepGeo(new THREE.CylinderGeometry(0.68, 0.78, 0.08, 12));
    const instHoofMagma = new THREE.InstancedMesh(magmaCoreGeo, moltenMagmaMat, craterCoords.length);
    instHoofMagma.name = 'SocSon_HoofCraters_Magma';
    instHoofMagma.userData.ignoreRaycaster = true;

    craterCoords.forEach(([cx, cz], idx) => {
      const cy = getSocSonHeightAt(cx, cz);
      const rim = new THREE.Mesh(prepGeo(new THREE.TorusGeometry(0.88, 0.22, 6, 14)), charredBasaltMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.set(cx, cy + 0.06, cz);
      craterRimGroup.add(rim);

      dummy.position.set(cx, cy + 0.05, cz);
      dummy.rotation.set(0, idx * 0.6, 0);
      dummy.scale.set(1.0 + (idx % 2) * 0.15, 1, 1.25);
      dummy.updateMatrix();
      instHoofMagma.setMatrixAt(idx, dummy.matrix);
    });
    setNoShadowCull(craterRimGroup, { ignoreRaycaster: true });
    mergeGroupMeshesByMaterial(craterRimGroup, { preserveUserData: true });
    setNoShadowCull(craterRimGroup, { ignoreRaycaster: true });
    instHoofMagma.instanceMatrix.needsUpdate = true;
    setNoShadowCull(instHoofMagma);
    root.add(craterRimGroup, instHoofMagma);

    // Mảnh khiên, giáo gãy của giặc Ân vương vãi (merged)
    const debrisGroup = new THREE.Group();
    debrisGroup.name = 'SocSon_BattleDebris';
    const debrisIronMat = new THREE.MeshStandardMaterial({
      color: 0x3f3f46,
      roughness: 0.65,
      metalness: 0.7,
      side: THREE.FrontSide
    });
    const debrisWoodMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.9,
      metalness: 0.05,
      side: THREE.FrontSide
    });
    const debrisCoords = [
      [4.4, 31.2], [-4.8, 28.0], [5.8, 22.0], [-4.2, 17.5], [4.9, 13.0], [-5.1, 21.4]
    ];
    debrisCoords.forEach(([dx, dz], idx) => {
      const dy = getSocSonHeightAt(dx, dz);
      const shield = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 8)), debrisIronMat);
      shield.position.set(dx, dy + 0.12, dz);
      shield.rotation.set(0.35 + idx * 0.2, idx * 1.1, 0.25);
      debrisGroup.add(shield);

      const brokenSpear = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.03, 0.04, 1.9, 6)), debrisWoodMat);
      brokenSpear.position.set(dx + 0.45, dy + 0.22, dz - 0.3);
      brokenSpear.rotation.set(1.1, idx * 0.7, 0.4);
      debrisGroup.add(brokenSpear);
    });
    setNoShadowCull(debrisGroup, { ignoreRaycaster: true });
    mergeGroupMeshesByMaterial(debrisGroup, { preserveUserData: true });
    setNoShadowCull(debrisGroup, { ignoreRaycaster: true });
    root.add(debrisGroup);

    // Proxy click chiến trường (loreKey: 'thanhgiong_battlefield')
    const battleY = getSocSonHeightAt(1.5, 22.8);
    const battlefieldProxy = new THREE.Mesh(
      prepGeo(new THREE.BoxGeometry(7.2, 3.2, 7.2)),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false })
    );
    battlefieldProxy.name = 'ThanhGiong_Battlefield_Proxy';
    battlefieldProxy.position.set(1.5, battleY + 1.5, 22.8);
    battlefieldProxy.userData = {
      isClickProxy: true,
      loreKey: 'thanhgiong_battlefield',
      realm: 'thanh_giong',
      ignoreRaycaster: false
    };
    root.add(battlefieldProxy);

    // 7. Cổng quay lại Bảo Tàng: Trống Đồng Đông Sơn Phát Sáng (-4.5, y, +42.0)
    const exitDrumY = getSocSonHeightAt(-4.5, 42.0);
    const exitDrumStation = new THREE.Group();
    exitDrumStation.name = 'ThanhGiong_DongSon_ExitDrum';
    exitDrumStation.position.set(-4.5, exitDrumY, 42.0);
    root.add(exitDrumStation);

    const altarStoneMat = new THREE.MeshStandardMaterial({ color: 0x33302e, roughness: 0.88, metalness: 0.1, side: THREE.FrontSide });
    const bronzePatinaMat = new THREE.MeshStandardMaterial({
      color: 0x926b24,
      emissive: 0x451a03,
      emissiveIntensity: 0.35,
      roughness: 0.36,
      metalness: 0.78,
      side: THREE.FrontSide
    });
    const drumHeadTex = createDongSonDrumHeadTexture(_realmDisposables);
    const drumHeadMat = new THREE.MeshStandardMaterial({
      map: drumHeadTex,
      emissive: 0xd97706,
      emissiveMap: drumHeadTex,
      emissiveIntensity: 1.05,
      roughness: 0.32,
      metalness: 0.65,
      side: THREE.FrontSide
    });

    const altarTier1 = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(1.45, 1.65, 0.34, 12)), altarStoneMat);
    altarTier1.position.y = 0.17;
    const altarTier2 = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(1.02, 1.18, 0.42, 12)), altarStoneMat);
    altarTier2.position.y = 0.55;
    const drumBodyLower = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.56, 0.72, 0.48, 18)), bronzePatinaMat);
    drumBodyLower.position.y = 1.00;
    const drumBodyUpper = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.76, 0.56, 0.44, 18)), bronzePatinaMat);
    drumBodyUpper.position.y = 1.46;
    const drumHead = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.77, 0.77, 0.05, 20)), drumHeadMat);
    drumHead.position.y = 1.69;

    exitDrumStation.add(altarTier1, altarTier2, drumBodyLower, drumBodyUpper, drumHead);

    const exitAuraMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const exitAuraRing = new THREE.Mesh(
      prepGeo(new THREE.RingGeometry(1.58, 1.92, 32)).rotateX(-Math.PI / 2),
      exitAuraMat
    );
    exitAuraRing.position.y = 0.04;
    exitAuraRing.userData.ignoreRaycaster = true;
    exitDrumStation.add(exitAuraRing);

    const exitSignTex = createPlaqueTexture(
      'TRỐNG ĐỒNG HỒI QUY',
      'Click Trống Đồng hoặc nhấn [ESC] để về Phòng 101',
      _realmDisposables,
      { w: 512, h: 128 }
    );
    const exitBanner = new THREE.Mesh(
      prepGeo(new THREE.PlaneGeometry(2.55, 0.62)),
      new THREE.MeshBasicMaterial({ map: exitSignTex, transparent: true, side: THREE.DoubleSide })
    );
    exitBanner.position.set(0, 2.68, 0);
    exitBanner.userData.ignoreRaycaster = true;
    exitDrumStation.add(exitBanner);

    setNoShadowCull(exitDrumStation, { ignoreRaycaster: true });

    const exitDrumProxy = new THREE.Mesh(
      prepGeo(new THREE.BoxGeometry(2.65, 2.7, 2.65)),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false })
    );
    exitDrumProxy.name = 'ThanhGiong_Realm_ExitDrumProxy';
    exitDrumProxy.position.set(0, 1.35, 0);
    exitDrumProxy.userData = {
      isClickProxy: true,
      isReturnPortal: true,
      ignoreRaycaster: false,
      realm: 'thanh_giong'
    };
    exitDrumStation.add(exitDrumProxy);

    // 8. ĐỈNH NÚI SÓC SƠN (z = -56, y = +15.0): Sân Đá, Volumetric God Rays & Mảnh Áo Giáp Sắt
    const summitY = getSocSonHeightAt(0, -56.0);
    const summitGroup = new THREE.Group();
    summitGroup.name = 'SocSon_Summit_Shrine';
    summitGroup.position.set(0, summitY, -56.0);
    root.add(summitGroup);

    const summitStoneMat = new THREE.MeshStandardMaterial({
      color: 0x575049,
      roughness: 0.86,
      metalness: 0.14,
      side: THREE.FrontSide
    });
    const summitPlatform = new THREE.Mesh(
      prepGeo(new THREE.CylinderGeometry(6.8, 7.8, 0.85, 24)),
      summitStoneMat
    );
    summitPlatform.position.y = -0.36;
    summitPlatform.name = 'SocSon_Summit_Platform';
    summitPlatform.userData.isFloor = true;
    summitPlatform.userData.isWalkable = true;
    summitPlatform.castShadow = false;
    summitPlatform.receiveShadow = false;
    summitPlatform.frustumCulled = true;
    summitGroup.add(summitPlatform);
    _realmWalkables.push(summitPlatform);

    // Khối đá thiên đỉnh & Bệ tôn nghiêm
    const summitRockGroup = new THREE.Group();
    const centralRock = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(1.55, 2.2, 1.05, 8)), altarStoneMat);
    centralRock.position.y = 0.52;
    const upperSlab = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(1.65, 0.34, 1.35)), summitStoneMat);
    upperSlab.position.y = 1.18;
    summitRockGroup.add(centralRock, upperSlab);

    // Cột đá khắc hoa văn bao nửa sau đỉnh núi
    for (let i = -3; i <= 3; i++) {
      const a = Math.PI + i * 0.34;
      const pillar = new THREE.Mesh(prepGeo(new THREE.BoxGeometry(0.42, 1.25, 0.42)), summitStoneMat);
      pillar.position.set(Math.sin(a) * 6.0, 0.62, Math.cos(a) * 6.0);
      summitRockGroup.add(pillar);
    }

    // 6. Bộ Mảnh Áo Giáp Sắt & Mũ Trụ Bỏ Lại Trên Đỉnh Sóc Sơn (GLB chính thức + Procedural fallback)
    const proceduralArmorGroup = new THREE.Group();
    proceduralArmorGroup.name = 'SocSon_ProceduralArmor_Group';

    const ironArmorMat = new THREE.MeshStandardMaterial({
      color: 0x3b4252,
      emissive: 0x451a03,
      emissiveIntensity: 0.25,
      roughness: 0.34,
      metalness: 0.88,
      side: THREE.FrontSide
    });
    const armorTrimMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      emissive: 0x78350f,
      emissiveIntensity: 0.35,
      roughness: 0.32,
      metalness: 0.82,
      side: THREE.FrontSide
    });

    const standPole = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.06, 0.08, 1.05, 8)), bronzePatinaMat);
    standPole.position.set(-0.18, 1.75, 0);
    const chestPlate = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.36, 0.30, 0.66, 10)), ironArmorMat);
    chestPlate.scale.set(1.18, 1.0, 0.72);
    chestPlate.position.set(-0.18, 1.88, 0);
    const chestSunMedallion = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.16, 0.16, 0.06, 14)), armorTrimMat);
    chestSunMedallion.rotation.x = Math.PI / 2;
    chestSunMedallion.position.set(-0.18, 1.94, 0.23);

    [-0.58, 0.22].forEach((sx, idx) => {
      const pauldron = new THREE.Mesh(prepGeo(new THREE.SphereGeometry(0.21, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.58)), ironArmorMat);
      pauldron.position.set(sx, 2.12, 0);
      pauldron.rotation.z = idx === 0 ? 0.38 : -0.38;
      proceduralArmorGroup.add(pauldron);
    });
    const waistArmor = new THREE.Mesh(prepGeo(new THREE.CylinderGeometry(0.33, 0.42, 0.28, 10)), armorTrimMat);
    waistArmor.scale.set(1.15, 1.0, 0.75);
    waistArmor.position.set(-0.18, 1.48, 0);

    const helmetDome = new THREE.Mesh(prepGeo(new THREE.SphereGeometry(0.22, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.62)), ironArmorMat);
    helmetDome.position.set(0.45, 1.44, 0.14);
    const helmetCrest = new THREE.Mesh(prepGeo(new THREE.ConeGeometry(0.06, 0.26, 6)), armorTrimMat);
    helmetCrest.position.set(0.45, 1.70, 0.14);

    proceduralArmorGroup.add(standPole, chestPlate, chestSunMedallion, waistArmor, helmetDome, helmetCrest);
    setNoShadowCull(proceduralArmorGroup, { ignoreRaycaster: true });
    mergeGroupMeshesByMaterial(proceduralArmorGroup, { preserveUserData: true });
    setNoShadowCull(proceduralArmorGroup, { ignoreRaycaster: true });
    summitRockGroup.add(proceduralArmorGroup);
    summitGroup.add(summitRockGroup);

    // Tải mô hình giáp sắt chính thức `giap_sat_soc_son.glb`
    const GLB_ARMOR_CANDIDATES = [
      '/models/thanhgiong/giap_sat_soc_son.glb',
      'models/thanhgiong/giap_sat_soc_son.glb',
      'public/models/thanhgiong/giap_sat_soc_son.glb'
    ];
    try {
      loadGlbCached(GLB_ARMOR_CANDIDATES, {
        targetHeight: 1.85,
        maxTextureSize: 1024,
        disableMipmaps: true,
        materialMode: 'pbr'
      }).then((armorModel) => {
        if (_disposed || !armorModel || !_isInsideRealm) return;
        try {
          const aClone = armorModel.clone(true);
          aClone.position.set(0, 1.25, 0);
          aClone.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = false;
              child.receiveShadow = false;
              child.userData.ignoreRaycaster = true;
            }
          });
          summitRockGroup.add(aClone);
          proceduralArmorGroup.visible = false;
        } catch (err) {
          console.warn('[ThanhGiongRealm] giap_sat_soc_son.glb mount warning:', err);
        }
      }).catch(() => {});
    } catch (_) {}

    // 7. Tượng Thánh Gióng Bay Vút Lên Trời Trên Không Trung Đỉnh Sóc Sơn (public/models/thanhgiong.glb)
    const flyingGiongGroup = new THREE.Group();
    flyingGiongGroup.name = 'SocSon_FlyingThanhGiong_Group';
    flyingGiongGroup.position.set(0.0, 29.5, -56.0);
    flyingGiongGroup.rotation.set(0.43, Math.PI, 0.0); // Ngẩng 25° phi nước đại về cõi trời
    flyingGiongGroup.scale.setScalar(0.72);
    flyingGiongGroup.userData.ignoreRaycaster = true;
    root.add(flyingGiongGroup);

    const flyingGiongCustomMats = [];
    const GLB_THANHGIONG_CANDIDATES = [
      '/models/thanhgiong.glb',
      'models/thanhgiong.glb',
      'public/models/thanhgiong.glb'
    ];
    try {
      loadGlbCached(GLB_THANHGIONG_CANDIDATES, {
        targetHeight: 5.2,
        maxTextureSize: 1024,
        disableMipmaps: true,
        materialMode: 'pbr'
      }).then((gModel) => {
        if (_disposed || !gModel || !_isInsideRealm) return;
        try {
          const gClone = gModel.clone(true);
          gClone.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = false;
              child.receiveShadow = false;
              child.userData.ignoreRaycaster = true;
              if (child.material) {
                const m = child.material.clone();
                m.emissive = new THREE.Color(0xff6a00);
                m.emissiveIntensity = 0.65;
                m.roughness = 0.35;
                m.metalness = 0.82;
                child.material = m;
                flyingGiongCustomMats.push(m);
              }
            }
          });
          flyingGiongGroup.add(gClone);
        } catch (err) {
          console.warn('[ThanhGiongRealm] Flying Giong mount warning:', err);
        }
      }).catch(() => {});
    } catch (_) {}

    // 8. Volumetric God Rays rọi từ Vòm Cổng Trời bao quanh Thánh Gióng bay & Bệ Áo Giáp Sắt
    const godRayMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0xfde68a) }
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vNormalView;
        varying vec3 vViewDir;
        void main() {
          vUv = uv;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vNormalView = normalize(normalMatrix * normal);
          vViewDir = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform vec3 uColor;
        varying vec2 vUv;
        varying vec3 vNormalView;
        varying vec3 vViewDir;
        void main() {
          float fresnel = pow(abs(dot(normalize(vNormalView), normalize(vViewDir))), 1.75);
          float verticalFade = smoothstep(0.0, 0.22, vUv.y) * (1.0 - smoothstep(0.68, 1.0, vUv.y));
          float shimmer = 0.78 + 0.22 * sin(uTime * 1.45 + vUv.x * 18.849);
          float alpha = fresnel * verticalFade * shimmer * 0.24;
          gl_FragColor = vec4(uColor, alpha);
        }
      `
    });

    const godRays = [];
    [
      { x: 0.0, z: 0.0, rTop: 1.4, rBot: 8.5, h: 36, rotX: 0.0, rotZ: 0.0 },
      { x: -1.8, z: -0.8, rTop: 0.9, rBot: 5.5, h: 34, rotX: 0.08, rotZ: 0.12 },
      { x: 1.8, z: -0.8, rTop: 0.9, rBot: 5.5, h: 34, rotX: 0.08, rotZ: -0.12 },
      { x: 0.0, z: 1.6, rTop: 0.8, rBot: 5.0, h: 32, rotX: -0.10, rotZ: 0.0 },
      { x: 0.0, z: -1.6, rTop: 0.8, rBot: 5.0, h: 32, rotX: 0.10, rotZ: 0.0 }
    ].forEach((spec, idx) => {
      const rayMesh = new THREE.Mesh(
        prepGeo(new THREE.CylinderGeometry(spec.rTop, spec.rBot, spec.h, 18, 1, true)),
        godRayMat
      );
      rayMesh.name = `SocSon_Summit_GodRay_${idx}`;
      rayMesh.position.set(spec.x, 16.5 + spec.h * 0.48, -56.0 + spec.z);
      rayMesh.rotation.set(spec.rotX, 0, spec.rotZ);
      rayMesh.userData.ignoreRaycaster = true;
      rayMesh.castShadow = false;
      rayMesh.receiveShadow = false;
      rayMesh.frustumCulled = true;
      root.add(rayMesh);
      godRays.push(rayMesh);
      _realmDisposables.push(rayMesh.geometry);
    });

    // 8.1 Dải Lửa Xoắn Ốc (Fire Vortex Spiral) & Vòng Mây Xoáy Thiên Đình
    const tubeMats = [];
    for (let arm = 0; arm < 2; arm++) {
      const pts = [];
      const armOffset = arm * Math.PI;
      const turns = 2.4;
      for (let s = 0; s <= 36; s++) {
        const t = s / 36;
        const a = armOffset + t * Math.PI * 2 * turns;
        const r = 2.2 + t * 4.2;
        const y = 16.5 + t * 29.5;
        pts.push(new THREE.Vector3(Math.cos(a) * r, y, -56.0 + Math.sin(a) * r));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const tubeGeo = prepGeo(new THREE.TubeGeometry(curve, 48, 0.28, 8, false));
      const tubeMat = new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(arm === 0 ? 0xff6b1a : 0xfbbf24) }
        },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform vec3 uColor;
          varying vec2 vUv;
          void main() {
            float flow = fract(vUv.x * 2.8 - uTime * 1.6);
            float pulse = 0.5 + 0.5 * sin(flow * 3.14159 * 2.0);
            float fade = sin(vUv.x * 3.14159);
            gl_FragColor = vec4(uColor * (1.2 + pulse * 0.8), fade * (0.35 + pulse * 0.45));
          }
        `
      });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      tubeMesh.name = `SocSon_FireVortex_Arm_${arm}`;
      tubeMesh.userData.ignoreRaycaster = true;
      root.add(tubeMesh);
      tubeMats.push(tubeMat);
      _realmDisposables.push(tubeGeo, tubeMat);
    }

    const cloudRings = [];
    const cloudRingMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    [22.0, 27.5, 33.0, 39.5].forEach((cy, idx) => {
      const r = 3.6 + idx * 1.3;
      const ringGeo = prepGeo(new THREE.TorusGeometry(r, 0.45, 6, 24));
      const ringMesh = new THREE.Mesh(ringGeo, cloudRingMat);
      ringMesh.name = `SocSon_CloudRing_${idx}`;
      ringMesh.position.set(0, cy, -56.0);
      ringMesh.rotation.x = Math.PI / 2 + (idx % 2 === 0 ? 0.08 : -0.08);
      ringMesh.userData.ignoreRaycaster = true;
      root.add(ringMesh);
      cloudRings.push(ringMesh);
      _realmDisposables.push(ringGeo);
    });
    _realmDisposables.push(cloudRingMat);

    // 8.2 Biển Mây Bồng Bềnh Quanh Sườn Núi Sóc Sơn (InstancedMesh)
    const cloudCount = 180;
    const cloudGeo = prepGeo(new THREE.DodecahedronGeometry(2.4, 1));
    const cloudMat = new THREE.MeshLambertMaterial({
      color: 0xfef3c7,
      emissive: 0x78350f,
      emissiveIntensity: 0.15,
      transparent: true,
      opacity: 0.68,
      depthWrite: false,
      side: THREE.FrontSide
    });
    const instCloudSea = new THREE.InstancedMesh(cloudGeo, cloudMat, cloudCount);
    instCloudSea.name = 'SocSon_CloudSea_Clusters';
    instCloudSea.userData.ignoreRaycaster = true;
    for (let i = 0; i < cloudCount; i++) {
      const a = (i / cloudCount) * Math.PI * 2 + rng() * 0.3;
      const dist = 16.0 + rng() * 42.0;
      const cx = Math.cos(a) * dist;
      const cz = -56.0 + Math.sin(a) * dist;
      const cy = 11.0 + rng() * 6.5;
      const scX = 1.6 + rng() * 2.2;
      const scY = 0.6 + rng() * 0.7;
      const scZ = 1.4 + rng() * 2.0;
      dummy.position.set(cx, cy, cz);
      dummy.scale.set(scX, scY, scZ);
      dummy.rotation.set(rng() * 0.2, rng() * Math.PI * 2, rng() * 0.2);
      dummy.updateMatrix();
      instCloudSea.setMatrixAt(i, dummy.matrix);
    }
    instCloudSea.instanceMatrix.needsUpdate = true;
    setNoShadowCull(instCloudSea, { ignoreRaycaster: true });
    root.add(instCloudSea);
    _realmDisposables.push(cloudGeo, cloudMat);

    // 8.3 Hạt Tia Lửa & Bụi Vàng Bay Xoắn Ngược Lên Trời (THREE.Points GPU-shader)
    const sparkCount = 240;
    const sparkBasePos = new Float32Array(sparkCount * 3);
    const sparkPhase = new Float32Array(sparkCount);
    for (let i = 0; i < sparkCount; i++) {
      const a = rng() * Math.PI * 2;
      const r = 0.5 + rng() * 4.5;
      sparkBasePos[i * 3] = Math.cos(a) * r;
      sparkBasePos[i * 3 + 1] = 16.5 + rng() * 3.0; // Xuất phát từ đỉnh đá
      sparkBasePos[i * 3 + 2] = -56.0 + Math.sin(a) * r;
      sparkPhase[i] = rng() * 10.0;
    }
    const sparkGeo = prepGeo(new THREE.BufferGeometry());
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkBasePos, 3));
    sparkGeo.setAttribute('aPhase', new THREE.BufferAttribute(sparkPhase, 1));
    const sparkMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2) }
      },
      vertexShader: /* glsl */ `
        attribute float aPhase;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vLife;
        void main() {
          float life = fract(uTime * 0.18 + aPhase * 0.11);
          vLife = life;
          vec3 p = position;
          float a = aPhase + life * 6.28318 * 2.0;
          float r = 1.0 + life * 5.0;
          p.x += cos(a) * r * 0.45;
          p.z += sin(a) * r * 0.45;
          p.y += life * 31.0; // Bay vút lên trời cao
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = clamp((22.0 * uPixelRatio) / max(-mv.z, 1.0), 3.0, 16.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vLife;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float soft = 1.0 - smoothstep(0.08, 0.5, d);
          float alpha = soft * sin(vLife * 3.14159) * 0.95;
          vec3 col = mix(vec3(1.0, 0.85, 0.25), vec3(1.0, 0.35, 0.05), vLife);
          gl_FragColor = vec4(col, alpha);
        }
      `
    });
    const sparkPoints = new THREE.Points(sparkGeo, sparkMat);
    sparkPoints.name = 'SocSon_AscensionSparks_Points';
    sparkPoints.userData.ignoreRaycaster = true;
    sparkPoints.frustumCulled = false;
    root.add(sparkPoints);
    _realmDisposables.push(sparkGeo, sparkMat);

    // Biển khắc đỉnh Sóc Sơn
    const summitSignTex = createPlaqueTexture(
      'ĐỈNH SÓC SƠN • ÁO GIÁP SẮT & HÓA THÁNH',
      'Click Mảnh Áo Giáp Sắt hoặc Tượng Bay để chiêm ngưỡng khoảnh khắc Hóa Thánh',
      _realmDisposables
    );
    const summitBanner = new THREE.Mesh(
      prepGeo(new THREE.PlaneGeometry(3.2, 0.76)),
      new THREE.MeshBasicMaterial({ map: summitSignTex, transparent: true, side: THREE.DoubleSide })
    );
    summitBanner.position.set(0, 3.32, 0.2);
    summitBanner.userData.ignoreRaycaster = true;
    summitGroup.add(summitBanner);

    // Proxy click Áo Giáp Sắt (loreKey: 'thanhgiong_ascension', isAscensionProxy: true)
    const armorProxy = new THREE.Mesh(
      prepGeo(new THREE.BoxGeometry(2.8, 2.7, 2.8)),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false })
    );
    armorProxy.name = 'ThanhGiong_SocSonArmor_Proxy';
    armorProxy.position.set(0, 1.5, 0);
    armorProxy.userData = {
      isClickProxy: true,
      loreKey: 'thanhgiong_ascension',
      isAscensionProxy: true,
      realm: 'thanh_giong',
      ignoreRaycaster: false
    };
    summitGroup.add(armorProxy);

    // Proxy click Tượng Thánh Gióng Bay Trên Không Trung (loreKey: 'thanhgiong_ascension', isAscensionProxy: true)
    const flyingProxy = new THREE.Mesh(
      prepGeo(new THREE.BoxGeometry(4.8, 5.2, 4.8)),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false })
    );
    flyingProxy.name = 'ThanhGiong_FlyingAscension_Proxy';
    flyingProxy.position.set(0.0, 29.5, -56.0);
    flyingProxy.userData = {
      isClickProxy: true,
      loreKey: 'thanhgiong_ascension',
      isAscensionProxy: true,
      realm: 'thanh_giong',
      ignoreRaycaster: false
    };
    root.add(flyingProxy);

    // 9. Hệ thống hạt GPU-shader (0 CPU upload mỗi frame): Tàn lửa chiến trường & Sương vàng đỉnh Sóc Sơn
    const emberCount = 160;
    const emberBasePos = new Float32Array(emberCount * 3);
    const emberPhase = new Float32Array(emberCount);
    for (let i = 0; i < emberCount; i++) {
      const ex = (rng() - 0.5) * 34.0;
      const ez = -8.0 + rng() * 50.0;
      const ey = getSocSonHeightAt(ex, ez) + 0.2;
      emberBasePos[i * 3] = ex;
      emberBasePos[i * 3 + 1] = ey;
      emberBasePos[i * 3 + 2] = ez;
      emberPhase[i] = rng() * 12.0;
    }
    const emberGeo = prepGeo(new THREE.BufferGeometry());
    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberBasePos, 3));
    emberGeo.setAttribute('aPhase', new THREE.BufferAttribute(emberPhase, 1));
    const emberMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2) }
      },
      vertexShader: /* glsl */ `
        attribute float aPhase;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vLife;
        void main() {
          float life = fract((uTime * 0.22) + aPhase * 0.13);
          vLife = life;
          vec3 p = position;
          p.y += life * 8.5;
          p.x += sin(uTime * 1.4 + aPhase) * 0.75;
          p.z += cos(uTime * 1.1 + aPhase * 1.3) * 0.55;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = clamp((16.0 * uPixelRatio) / max(-mv.z, 1.0), 2.0, 12.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vLife;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float soft = 1.0 - smoothstep(0.1, 0.5, d);
          float alpha = soft * sin(vLife * 3.14159) * 0.92;
          vec3 col = mix(vec3(1.0, 0.35, 0.05), vec3(1.0, 0.88, 0.45), 1.0 - vLife);
          gl_FragColor = vec4(col, alpha);
        }
      `
    });
    const emberPoints = new THREE.Points(emberGeo, emberMat);
    emberPoints.name = 'SocSon_BattleEmbers_Points';
    emberPoints.userData.ignoreRaycaster = true;
    emberPoints.frustumCulled = false; // GPU vertex animation quanh chiến trường
    root.add(emberPoints);

    // Sương mù vàng hoàng hôn trên đỉnh Núi Sóc Sơn (THREE.Points, GPU-shader)
    const mistCount = 120;
    const mistBasePos = new Float32Array(mistCount * 3);
    const mistPhase = new Float32Array(mistCount);
    for (let i = 0; i < mistCount; i++) {
      const angle = rng() * Math.PI * 2;
      const dist = 2.0 + rng() * 14.0;
      const mx = Math.cos(angle) * dist;
      const mz = -56.0 + Math.sin(angle) * dist;
      const my = getSocSonHeightAt(mx, mz) + 0.65 + rng() * 2.2;
      mistBasePos[i * 3] = mx;
      mistBasePos[i * 3 + 1] = my;
      mistBasePos[i * 3 + 2] = mz;
      mistPhase[i] = rng() * 10.0;
    }
    const mistGeo = prepGeo(new THREE.BufferGeometry());
    mistGeo.setAttribute('position', new THREE.BufferAttribute(mistBasePos, 3));
    mistGeo.setAttribute('aPhase', new THREE.BufferAttribute(mistPhase, 1));
    const mistMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, 2) }
      },
      vertexShader: /* glsl */ `
        attribute float aPhase;
        uniform float uTime;
        uniform float uPixelRatio;
        varying float vAlpha;
        void main() {
          vec3 p = position;
          p.x += sin(uTime * 0.32 + aPhase) * 2.4;
          p.z += cos(uTime * 0.25 + aPhase * 1.4) * 1.6;
          p.y += sin(uTime * 0.45 + aPhase) * 0.35;
          vAlpha = 0.14 + 0.08 * sin(uTime * 0.6 + aPhase);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = clamp((130.0 * uPixelRatio) / max(-mv.z, 1.0), 12.0, 96.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float soft = pow(1.0 - d * 2.0, 2.0);
          gl_FragColor = vec4(vec3(0.98, 0.78, 0.42), soft * vAlpha);
        }
      `
    });
    const mistPoints = new THREE.Points(mistGeo, mistMat);
    mistPoints.name = 'SocSon_SummitMist_Points';
    mistPoints.userData.ignoreRaycaster = true;
    mistPoints.frustumCulled = false;
    root.add(mistPoints);

    // 10. Đăng ký Hitboxes (`realm: 'thanh_giong'`), Debug `[H]/[F2]`, Lore & Spatial Audio
    root.updateMatrixWorld(true);

    const realmDebugGroup = new THREE.Group();
    realmDebugGroup.name = 'ThanhGiong_Realm_DebugHitboxes';
    realmDebugGroup.visible = Boolean(_hitboxManager?.debugHelpers?.visible);
    root.add(realmDebugGroup);
    _realmDebugGroup = realmDebugGroup;

    const interactiveProxies = [battlefieldProxy, armorProxy, flyingProxy, exitDrumProxy];
    const realmColliders = [];
    const addRealmCollider = (center, size, name, color = 0x22c55e) => {
      const box = new THREE.Box3().setFromCenterAndSize(center, size);
      realmColliders.push({ box, name });
      realmDebugGroup.add(new THREE.Box3Helper(box, color));
    };

    // Collider cho Trống Đồng hồi quy, Bệ Áo Giáp Sóc Sơn, Tượng Gióng Bay, Đầm nước & Biên thung lũng
    addRealmCollider(new THREE.Vector3(-4.5, exitDrumY + 1.1, 42.0), new THREE.Vector3(2.8, 2.5, 2.8), 'TrongDongHoiQuy', 0x22c55e);
    addRealmCollider(new THREE.Vector3(0.0, summitY + 1.2, -56.0), new THREE.Vector3(3.1, 2.6, 2.9), 'BeAoGiapSatSocSon', 0x22c55e);
    addRealmCollider(new THREE.Vector3(0.0, 29.5, -56.0), new THREE.Vector3(4.8, 5.2, 4.8), 'ThanhGiongBayVeTroi', 0xf59e0b);
    addRealmCollider(new THREE.Vector3(21.0, 1.0, 20.0), new THREE.Vector3(18.0, 3.0, 20.0), 'BienDamNuocChanNui', 0x38bdf8);
    addRealmCollider(new THREE.Vector3(0.0, 4.0, 54.0), new THREE.Vector3(96.0, 12.0, 2.0), 'BienChanNuiSau', 0x38bdf8);
    addRealmCollider(new THREE.Vector3(0.0, 18.0, -65.5), new THREE.Vector3(48.0, 14.0, 2.0), 'BienSauDinhSocSon', 0x38bdf8);
    addRealmCollider(new THREE.Vector3(-42.0, 10.0, -6.0), new THREE.Vector3(2.0, 24.0, 124.0), 'BienNuiTrai', 0x38bdf8);
    addRealmCollider(new THREE.Vector3(42.0, 10.0, -6.0), new THREE.Vector3(2.0, 24.0, 124.0), 'BienNuiPhai', 0x38bdf8);

    if (_hitboxManager) {
      _hitboxManager.clearRealmHitboxes?.('thanh_giong');
      _hitboxManager.registerRealmHitboxes?.('thanh_giong', realmColliders);
    }

    interactiveProxies.forEach((px) => {
      px.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(px);
      realmDebugGroup.add(new THREE.Box3Helper(b, px.userData.isReturnPortal ? 0x38bdf8 : 0xfde047));
      if (px.userData.loreKey && _loreGuide?.registerArtifact) {
        _loreGuide.registerArtifact(px, px.userData.loreKey);
      }
    });

    // Âm thanh không gian 3D (`PositionalAudio`)
    const battleAudioAnchor = new THREE.Object3D();
    battleAudioAnchor.position.set(1.5, battleY + 1.8, 22.0);
    root.add(battleAudioAnchor);

    const summitAudioAnchor = new THREE.Object3D();
    summitAudioAnchor.position.set(0.0, summitY + 2.0, -56.0);
    root.add(summitAudioAnchor);

    if (_spatialAudio?.attachPositionalSound) {
      try {
        _spatialAudio.attachPositionalSound('thanhgiong_realm_battle', battleAudioAnchor, {
          fallbackTheme: 'thanhgiong_realm_battle',
          refDistance: 12,
          maxDistance: 56,
          volume: 0.56
        });
        _spatialAudio.attachPositionalSound('thanhgiong_realm_summit', summitAudioAnchor, {
          fallbackTheme: 'thanhgiong_realm_summit',
          refDistance: 10,
          maxDistance: 52,
          volume: 0.54
        });
        _spatialAudio.playRealmSoundscape?.('thanhgiong_realm_battle');
      } catch (_) {}
    }

    // Đồng bộ WebXR Teleport context sang địa hình & sân đỉnh Sóc Sơn
    _immersionSystem?.xrTeleport?.setTargetContext?.(realmScene, _realmWalkables);

    _realmState = {
      skyMat,
      lakeWaterMat,
      moltenMagmaMat,
      godRayMat,
      emberMat,
      mistMat,
      sparkMat,
      tubeMats,
      cloudRings,
      flyingGiongGroup,
      flyingGiongCustomMats,
      flyingGiongLight,
      heavenlyRiftMesh,
      exitAuraRing,
      exitBanner,
      summitBanner,
      battleEmberLight,
      summitHaloLight,
      interactiveProxies
    };
  }

  function disposeSocSonRealm() {
    try {
      _spatialAudio?.stopAllSounds?.();
      if (_spatialAudio?.detachPositionalSound) {
        _spatialAudio.detachPositionalSound('thanhgiong_realm_battle');
        _spatialAudio.detachPositionalSound('thanhgiong_realm_summit');
      }
    } catch (_) {}

    if (_realmState?.flyingGiongCustomMats?.length) {
      _realmState.flyingGiongCustomMats.forEach((m) => {
        try { m?.dispose?.(); } catch (_) {}
      });
    }

    if (_realmState?.interactiveProxies && Array.isArray(_loreGuide?.interactiveArtifacts)) {
      _realmState.interactiveProxies.forEach((px) => {
        const idx = _loreGuide.interactiveArtifacts.indexOf(px);
        if (idx !== -1) _loreGuide.interactiveArtifacts.splice(idx, 1);
      });
    }

    try {
      _hitboxManager?.clearRealmHitboxes?.('thanh_giong');
    } catch (_) {}

    if (_realmRoot) {
      disposeObjectSubtree(_realmRoot, { skipShared: true });
      _realmRoot.parent?.remove(_realmRoot);
      _realmRoot = null;
    }

    if (realmScene) {
      realmScene.fog = _prevSceneFog;
      realmScene.background = _prevSceneBg;
    }
    _prevSceneFog = null;
    _prevSceneBg = null;

    _realmDisposables.forEach((t) => {
      try { t?.dispose?.(); } catch (_) {}
    });
    _realmDisposables = [];
    _realmWalkables = [];
    _realmDebugGroup = null;
    _realmState = null;
  }

  // =========================================================================
  // PHẦN 4: DOLLY-ZOOM CUTSCENE & ENTER / EXIT REALM
  // =========================================================================
  function getMuseumReturnPose() {
    if (interiorGroup) {
      interiorGroup.updateMatrixWorld(true);
      return {
        camPos: interiorGroup.localToWorld(
          new THREE.Vector3(portalGroup.position.x, 1.85, portalGroup.position.z + 3.6)
        ),
        lookAt: interiorGroup.localToWorld(new THREE.Vector3(0, 2.2, -1.2))
      };
    }
    return {
      camPos: new THREE.Vector3(_roomCenterVec.x - 6.8, 1.85, _roomCenterVec.z),
      lookAt: new THREE.Vector3(_roomCenterVec.x - 1.2, 2.2, _roomCenterVec.z)
    };
  }

  function runDollyZoomTransition({ targetPos, lookAtPos, durationMs = 1150, onSwap, onFinish }) {
    const cam = _camera || (typeof window !== 'undefined' ? window.__camera : null);
    const vignette = getOrCreateVignetteOverlay();
    if (!cam) {
      onSwap?.();
      onFinish?.();
      return;
    }

    const startPos = cam.position.clone();
    const startQuat = cam.quaternion.clone();
    const baseFov = cam.fov || 65;

    _tmpLookMat.lookAt(targetPos, lookAtPos, _worldUp);
    const endQuat = new THREE.Quaternion().setFromRotationMatrix(_tmpLookMat);

    const startTime = performance.now();
    let swapped = false;

    const step = (now) => {
      if (_disposed) return;
      const raw = Math.min(1, (now - startTime) / durationMs);
      const e = easeInOutCubic(raw);

      if (!swapped) {
        const p = Math.min(1, e / 0.55);
        cam.position.lerpVectors(startPos, targetPos, easeInOutCubic(p));
        cam.quaternion.slerpQuaternions(startQuat, endQuat, easeInOutCubic(p));
        cam.fov = baseFov - Math.sin(p * Math.PI * 0.5) * 18.0;
        cam.updateProjectionMatrix();
        if (vignette) vignette.style.opacity = String(Math.min(1, p * 1.15));

        if (raw >= 0.55) {
          swapped = true;
          onSwap?.();
        }
      } else {
        const p = Math.min(1, (raw - 0.55) / 0.45);
        cam.fov = (baseFov + 11.0) - easeInOutCubic(p) * 11.0;
        cam.updateProjectionMatrix();
        if (vignette) vignette.style.opacity = String(Math.max(0, 1 - p * 1.15));
      }

      if (raw < 1) {
        requestAnimationFrame(step);
      } else {
        cam.fov = baseFov;
        cam.updateProjectionMatrix();
        if (vignette) vignette.style.opacity = '0';
        onFinish?.();
      }
    };

    requestAnimationFrame(step);
  }

  function enterRealm(realmName = 'thanhgiong', { continueTourAfterEntry = false } = {}) {
    if (typeof realmName === 'object' && realmName !== null) {
      continueTourAfterEntry = Boolean(realmName.continueTourAfterEntry);
      realmName = realmName.realm || 'thanhgiong';
    }
    if (_disposed || _isInsideRealm || _isTransitioning) return;
    _isTransitioning = true;
    _loreGuide?.hideLoreCard?.();

    const cam = _camera || (typeof window !== 'undefined' ? window.__camera : null);
    const ctrl = _cameraManager?.controls || (typeof window !== 'undefined' ? window.__controls : null);
    const camCtrl = _cameraManager?.cameraController || (typeof window !== 'undefined' ? window.__cameraController : null);

    if (typeof document !== 'undefined' && document.exitPointerLock) {
      try { document.exitPointerLock(); } catch (_) {}
    }
    if (ctrl) ctrl.enabled = false;
    if (camCtrl) camCtrl.isEnabled = false;

    roomGroup?.updateMatrixWorld?.(true);
    interiorGroup?.updateMatrixWorld?.(true);
    const portalFocusWorld = interiorGroup
      ? interiorGroup.localToWorld(new THREE.Vector3(portalGroup.position.x, 2.0, portalGroup.position.z))
      : _roomCenterVec.clone().add(new THREE.Vector3(-10.5, 2.0, 0));
    const dollyStandWorld = interiorGroup
      ? interiorGroup.localToWorld(new THREE.Vector3(portalGroup.position.x, 1.95, portalGroup.position.z + 1.6))
      : _roomCenterVec.clone().add(new THREE.Vector3(-8.9, 1.95, 0));

    runDollyZoomTransition({
      targetPos: dollyStandWorld,
      lookAtPos: portalFocusWorld,
      durationMs: 1150,
      onSwap: () => {
        _isInsideRealm = true;
        if (typeof window !== 'undefined') window.__thanhGiongRealmActive = true;
        if (roomGroup) roomGroup.visible = false;

        mountSocSonRealm();

        if (typeof window !== 'undefined' && window.__app?.setActiveScene && realmScene) {
          window.__app.setActiveScene(realmScene);
        }

        if (camCtrl) {
          camCtrl.setFloorHeightProvider?.(getSocSonHeightAt);
          camCtrl.floorHeightProvider = getSocSonHeightAt;
          camCtrl.velocity?.set?.(0, 0, 0);
        }
        if (cam) {
          cam.position.copy(realmSpawnPos);
          cam.lookAt(realmSpawnLookAt);
        }
        if (ctrl) {
          ctrl.target.copy(realmSpawnLookAt);
          ctrl.update();
        }
        const hud = getOrCreateRealmHUD();
        if (hud) hud.style.display = 'flex';
      },
      onFinish: () => {
        _isTransitioning = false;
        if (!continueTourAfterEntry) {
          if (ctrl) ctrl.enabled = true;
          if (camCtrl) camCtrl.isEnabled = true;
        } else {
          beginRealmTourStop(0);
        }
      }
    });
  }

  function exitRealm({ immediate = false, moveCameraBack = true } = {}) {
    if (!_isInsideRealm || _isTransitioning) return;
    _isTransitioning = true;
    stopAutoTour();
    _loreGuide?.hideLoreCard?.();

    const cam = _camera || (typeof window !== 'undefined' ? window.__camera : null);
    const ctrl = _cameraManager?.controls || (typeof window !== 'undefined' ? window.__controls : null);
    const camCtrl = _cameraManager?.cameraController || (typeof window !== 'undefined' ? window.__cameraController : null);
    const vignette = getOrCreateVignetteOverlay();

    if (typeof document !== 'undefined' && document.exitPointerLock) {
      try { document.exitPointerLock(); } catch (_) {}
    }

    const hud = getOrCreateRealmHUD();
    if (hud) hud.style.display = 'none';

    const performExitSwap = () => {
      _isInsideRealm = false;
      _reentryCooldown = 4.0;
      if (typeof window !== 'undefined') window.__thanhGiongRealmActive = false;

      disposeSocSonRealm();

      if (typeof window !== 'undefined' && window.__app?.setActiveScene) {
        const targetMain = window.__app.mainScene || mainScene;
        if (targetMain) window.__app.setActiveScene(targetMain);
      }
      if (roomGroup) {
        roomGroup.visible = true;
        roomGroup.updateMatrixWorld(true);
      }

      if (camCtrl) {
        camCtrl.setFloorHeightProvider?.(null);
        camCtrl.floorHeightProvider = null;
        camCtrl.velocity?.set?.(0, 0, 0);
      }

      if (typeof window !== 'undefined' && window.__app?.atriumGroup) {
        _immersionSystem?.xrTeleport?.setTargetContext?.(
          mainScene || window.__app.mainScene,
          [window.__app.atriumGroup, roomGroup].filter(Boolean)
        );
      }

      if (moveCameraBack) {
        const retPose = getMuseumReturnPose();
        if (cam) {
          cam.position.copy(retPose.camPos);
          cam.lookAt(retPose.lookAt);
        }
        if (ctrl) {
          ctrl.target.copy(retPose.lookAt);
          ctrl.update();
        }
      }
    };

    if (immediate) {
      performExitSwap();
      if (vignette) vignette.style.opacity = '0';
      _isTransitioning = false;
      if (ctrl) ctrl.enabled = true;
      if (camCtrl) camCtrl.isEnabled = true;
      return;
    }

    if (ctrl) ctrl.enabled = false;
    if (camCtrl) camCtrl.isEnabled = false;

    const startTime = performance.now();
    let swapped = false;

    const step = (now) => {
      if (_disposed) return;
      const raw = Math.min(1, (now - startTime) / 850);
      if (!swapped) {
        if (vignette) vignette.style.opacity = String(Math.min(1, raw * 2.1));
        if (raw >= 0.48) {
          swapped = true;
          performExitSwap();
        }
      } else {
        const p = (raw - 0.48) / 0.52;
        if (vignette) vignette.style.opacity = String(Math.max(0, 1 - p));
      }

      if (raw < 1) {
        requestAnimationFrame(step);
      } else {
        if (vignette) vignette.style.opacity = '0';
        _isTransitioning = false;
        if (ctrl) ctrl.enabled = true;
        if (camCtrl) camCtrl.isEnabled = true;
      }
    };
    requestAnimationFrame(step);
  }

  // =========================================================================
  // PHẦN 5: EDUCATIONAL AUTO-TOUR (PHÒNG 101 -> ORBIT TƯỢNG 6.5s -> CỔNG -> ĐỈNH SÓC SƠN)
  // =========================================================================
  const DEFAULT_ROOM_TOUR_STOPS = [
    {
      key: 'thanhgiong_village',
      camLocalPos: [-3.4, 2.25, 7.6],
      lookLocalTarget: [-6.8, 1.35, 4.2],
      dwellMs: 3600,
      label: 'Khu 1: Làng Phù Đổng • Dấu Chân Khổng Lồ, Nia Tre & 7 Nong Cơm 3 Nong Cà'
    },
    {
      key: 'thanhgiong_forge',
      camLocalPos: [3.4, 2.25, 7.6],
      lookLocalTarget: [6.8, 1.4, 4.2],
      dwellMs: 3600,
      label: 'Khu 2: Lò Rèn Làng Gióng • Loa Đồng Sứ Giả & Roi Sắt'
    },
    {
      key: 'thanhgiong_statue',
      orbit: true,
      orbitCenterLocal: [0, 2.9, -1.2],
      orbitRadius: 5.2,
      orbitHeight: 2.8,
      camLocalPos: [0, 2.8, 4.2],
      lookLocalTarget: [0, 3.0, -1.2],
      dwellMs: 6500,
      label: 'Tâm Điểm: Tượng Đài Phù Đổng Thiên Vương Cưỡi Ngựa Sắt'
    }
  ];

  const resolvedRoomStops = (Array.isArray(tourStopsInRoom) && tourStopsInRoom.length > 0
    ? tourStopsInRoom.map((s) => ({
        key: s.key ?? s.loreKey ?? null,
        camLocalPos: s.camLocalPos || s.localPos || [0, 2.4, 4.5],
        lookLocalTarget: s.lookLocalTarget || s.localLook || [0, 2.2, -1.2],
        orbit: Boolean(s.orbit),
        orbitCenterLocal: s.orbitCenterLocal || [0, 2.9, -1.2],
        orbitRadius: s.orbitRadius ?? 5.2,
        orbitHeight: s.orbitHeight ?? 2.8,
        dwellMs: s.dwellMs ?? (s.orbit ? 6500 : 3800),
        label: s.label || s.title || 'Điểm tham quan Phòng Thánh Gióng'
      }))
    : DEFAULT_ROOM_TOUR_STOPS
  ).concat([
    {
      key: null,
      camLocalPos: [portalGroup.position.x, 2.25, portalGroup.position.z + 4.4],
      lookLocalTarget: [portalGroup.position.x, 2.1, portalGroup.position.z],
      orbit: false,
      dwellMs: 1350,
      label: 'Cổng Sử Thi: Tiến vào Chiến Trường Giặc Ân & Đỉnh Núi Sóc Sơn'
    }
  ]);

  // Đường bay spline qua Chiến Trường Giặc Ân & Đường Đá lên Đỉnh Núi Sóc Sơn
  const REALM_TOUR_STOPS = [
    {
      title: 'Sóc Sơn 1/3: Chiến Trường Tre Đằng Ngà & Dấu Vó Ngựa Sắt',
      splinePoints: [
        new THREE.Vector3(-1.2, 2.6, 42.5),
        new THREE.Vector3(-3.2, 3.1, 34.0),
        new THREE.Vector3(-1.8, 3.5, 29.2)
      ],
      lookAt: new THREE.Vector3(1.5, 1.3, 21.0),
      loreKey: 'thanhgiong_battlefield',
      flightMs: 2600,
      dwellMs: 6200
    },
    {
      title: 'Sóc Sơn 2/3: Leo Dốc Đường Đá Cổ lên Triền Núi Sóc Sơn',
      splinePoints: [
        new THREE.Vector3(-1.8, 3.5, 29.2),
        new THREE.Vector3(1.4, 4.8, 12.0),
        new THREE.Vector3(-2.1, 8.8, -8.0),
        new THREE.Vector3(1.6, 13.8, -30.0),
        new THREE.Vector3(-1.8, 17.6, -46.5)
      ],
      lookAt: new THREE.Vector3(0.0, 16.8, -56.0),
      loreKey: null,
      flightMs: 4200,
      dwellMs: 900
    },
    {
      title: 'Sóc Sơn 3/3: Đỉnh Núi Sóc Sơn • Hóa Thánh Bay Về Trời Giữa Hào Quang Thiên Đình',
      splinePoints: [
        new THREE.Vector3(-1.8, 17.6, -46.5),
        new THREE.Vector3(2.8, 17.8, -50.2),
        new THREE.Vector3(2.4, 17.4, -50.0)
      ],
      lookAt: new THREE.Vector3(0.0, 29.5, -56.0),
      loreKey: 'thanhgiong_ascension',
      flightMs: 2400,
      dwellMs: 7600
    }
  ];

  function lockPlayerControls(locked) {
    const ctrl = _cameraManager?.controls || (typeof window !== 'undefined' ? window.__controls : null);
    const camCtrl = _cameraManager?.cameraController || (typeof window !== 'undefined' ? window.__cameraController : null);
    if (ctrl) ctrl.enabled = !locked;
    if (camCtrl) camCtrl.isEnabled = !locked;
  }

  function beginRoomTourStop(idx) {
    const cam = _camera || (typeof window !== 'undefined' ? window.__camera : null);
    if (!cam || !interiorGroup) return;
    _tourIdx = idx;
    const stop = resolvedRoomStops[idx];
    _tourPhase = 'room_flying';
    _tourPhaseStart = performance.now();

    interiorGroup.updateMatrixWorld(true);
    const targetPos = interiorGroup.localToWorld(new THREE.Vector3(...stop.camLocalPos));
    const lookWorld = interiorGroup.localToWorld(new THREE.Vector3(...stop.lookLocalTarget));
    stop._worldPos = targetPos;
    stop._worldLook = lookWorld;

    if (stop.orbit && stop.orbitCenterLocal) {
      const oc = interiorGroup.localToWorld(new THREE.Vector3(...stop.orbitCenterLocal));
      const relX = targetPos.x - oc.x;
      const relZ = targetPos.z - oc.z;
      stop._orbitStartAngle = Math.atan2(relZ, relX);
      stop._orbitStartRadius = Math.hypot(relX, relZ);
      stop._orbitStartHeightLocal = stop.camLocalPos[1] ?? (stop.orbitHeight ?? 2.8);
    }

    _tourFlightStartPos.copy(cam.position);
    _tourFlightStartQuat.copy(cam.quaternion);

    _tmpLookMat.lookAt(targetPos, lookWorld, _worldUp);
    _tourFlightEndQuat.setFromRotationMatrix(_tmpLookMat);

    updateRoomTourBanner(stop.label);
  }

  function beginRealmTourStop(idx) {
    const cam = _camera || (typeof window !== 'undefined' ? window.__camera : null);
    if (!cam) return;
    _tourIdx = idx;
    const stop = REALM_TOUR_STOPS[idx];
    _tourPhase = 'realm_flying';
    _tourPhaseStart = performance.now();

    const pts = [cam.position.clone(), ...stop.splinePoints.slice(1)];
    stop._curve = new THREE.CatmullRomCurve3(pts.length >= 2 ? pts : [cam.position.clone(), stop.splinePoints[stop.splinePoints.length - 1]]);

    _tourFlightStartQuat.copy(cam.quaternion);
    const endPos = stop._curve.getPoint(1.0);
    _tmpLookMat.lookAt(endPos, stop.lookAt, _worldUp);
    _tourFlightEndQuat.setFromRotationMatrix(_tmpLookMat);

    const hudTitle = typeof document !== 'undefined' ? document.getElementById('tg-hud-title') : null;
    if (hudTitle) hudTitle.textContent = `🧭 ${stop.title}`;
  }

  function startFullAutoTour() {
    if (_disposed || _isTransitioning) return;
    if (_isInsideRealm) {
      startRealmOnlyTour();
      return;
    }
    _tourActive = true;
    lockPlayerControls(true);
    _loreGuide?.hideLoreCard?.();
    beginRoomTourStop(0);
  }

  function startRealmOnlyTour() {
    if (_disposed || _isTransitioning) return;
    if (!_isInsideRealm) {
      _tourActive = true;
      enterRealm('thanhgiong', { continueTourAfterEntry: true });
      return;
    }
    _tourActive = true;
    lockPlayerControls(true);
    const btn = typeof document !== 'undefined' ? document.getElementById('tg-btn-tour') : null;
    if (btn) btn.textContent = '⏹ Dừng Auto-Tour';
    _loreGuide?.hideLoreCard?.();
    beginRealmTourStop(0);
  }

  function stopAutoTour() {
    if (!_tourActive) return;
    _tourActive = false;
    _tourPhase = 'idle';
    lockPlayerControls(false);
    updateRoomTourBanner(null);
    const btn = typeof document !== 'undefined' ? document.getElementById('tg-btn-tour') : null;
    if (btn) btn.textContent = '🧭 Auto-Tour';
    const hudTitle = typeof document !== 'undefined' ? document.getElementById('tg-hud-title') : null;
    if (hudTitle) hudTitle.textContent = '🔥 CHIẾN TRƯỜNG & ĐỈNH SÓC SƠN';
  }

  function updateAutoTour(nowMs) {
    if (!_tourActive) return;
    const cam = _camera || (typeof window !== 'undefined' ? window.__camera : null);
    if (!cam) return;

    if (_tourPhase === 'room_flying') {
      const stop = resolvedRoomStops[_tourIdx];
      const t = Math.min(1, (nowMs - _tourPhaseStart) / 2100);
      const e = easeInOutCubic(t);
      cam.position.lerpVectors(_tourFlightStartPos, stop._worldPos, e);
      cam.quaternion.slerpQuaternions(_tourFlightStartQuat, _tourFlightEndQuat, e);

      if (t >= 1) {
        _tourPhase = 'room_dwelling';
        _tourPhaseStart = nowMs;
        if (stop.key && _loreGuide?.showLoreCard) {
          _loreGuide.showLoreCard(stop.key);
        }
      }
    } else if (_tourPhase === 'room_dwelling') {
      const stop = resolvedRoomStops[_tourIdx];
      const elapsedDwell = nowMs - _tourPhaseStart;

      // Orbit cận cảnh 6.5s quanh tượng đài Thánh Gióng
      if (stop.orbit && interiorGroup) {
        const p = clamp(elapsedDwell / stop.dwellMs, 0, 1);
        const blendIn = smoothstep(0.0, 0.18, p);
        const startAng = Number.isFinite(stop._orbitStartAngle) ? stop._orbitStartAngle : Math.PI * 0.5;
        const theta = startAng + p * Math.PI * 1.45;
        const ocLocal = stop.orbitCenterLocal || [0, 2.9, -1.2];
        const targetRad = stop.orbitRadius ?? 5.2;
        const startRad = Number.isFinite(stop._orbitStartRadius) ? stop._orbitStartRadius : targetRad;
        const rad = startRad + (targetRad - startRad) * blendIn;
        const targetHeight = stop.orbitHeight ?? 2.8;
        const startHeight = Number.isFinite(stop._orbitStartHeightLocal) ? stop._orbitStartHeightLocal : targetHeight;
        const oHeight = startHeight + (targetHeight - startHeight) * blendIn;

        _tourOrbitLocalVec.set(
          ocLocal[0] + Math.cos(theta) * rad,
          oHeight + Math.sin(p * Math.PI) * 0.42,
          ocLocal[2] + Math.sin(theta) * rad
        );
        interiorGroup.localToWorld(_tourOrbitLocalVec);
        cam.position.copy(_tourOrbitLocalVec);

        _tourOrbitCenterWorld.set(ocLocal[0], ocLocal[1], ocLocal[2]);
        interiorGroup.localToWorld(_tourOrbitCenterWorld);
        cam.lookAt(_tourOrbitCenterWorld);
      }

      if (elapsedDwell >= stop.dwellMs) {
        _loreGuide?.hideLoreCard?.();
        if (_tourIdx + 1 < resolvedRoomStops.length) {
          beginRoomTourStop(_tourIdx + 1);
        } else {
          _tourPhase = 'portal_crossing';
          updateRoomTourBanner(null);
          enterRealm('thanhgiong', { continueTourAfterEntry: true });
        }
      }
    } else if (_tourPhase === 'realm_flying' && _isInsideRealm) {
      const stop = REALM_TOUR_STOPS[_tourIdx];
      const t = Math.min(1, (nowMs - _tourPhaseStart) / (stop.flightMs || 2600));
      const e = easeInOutCubic(t);

      if (stop._curve) {
        stop._curve.getPoint(e, _tourTmpVec);
        const groundY = getSocSonHeightAt(_tourTmpVec.x, _tourTmpVec.z);
        if (_tourTmpVec.y < groundY + 1.8) _tourTmpVec.y = groundY + 1.8;
        cam.position.copy(_tourTmpVec);
      }

      // Trong pha leo dốc hoặc bay dài, giữ hướng nhìn mượt về mục tiêu (zero-alloc)
      if (t < 0.85) {
        _tourLookVec.copy(stop.lookAt);
        _tmpLookMat.lookAt(cam.position, _tourLookVec, _worldUp);
        _tmpLookQuat.setFromRotationMatrix(_tmpLookMat);
        cam.quaternion.slerp(_tmpLookQuat, 0.08);
      } else {
        cam.quaternion.slerpQuaternions(cam.quaternion, _tourFlightEndQuat, 0.16);
      }

      if (t >= 1) {
        _tourPhase = 'realm_dwelling';
        _tourPhaseStart = nowMs;
        cam.lookAt(stop.lookAt);
        if (stop.loreKey && _loreGuide?.showLoreCard) {
          _loreGuide.showLoreCard(stop.loreKey);
        }
      }
    } else if (_tourPhase === 'realm_dwelling' && _isInsideRealm) {
      const stop = REALM_TOUR_STOPS[_tourIdx];
      if (nowMs - _tourPhaseStart >= stop.dwellMs) {
        _loreGuide?.hideLoreCard?.();
        if (_tourIdx + 1 < REALM_TOUR_STOPS.length) {
          beginRealmTourStop(_tourIdx + 1);
        } else {
          stopAutoTour();
        }
      }
    }
  }

  // =========================================================================
  // PHẦN 6: POINTER & KEYBOARD CAPTURE-PHASE LISTENERS + UPDATE LOOP
  // =========================================================================
  function isEventOnHudOrOverlay(e) {
    const t = e?.target;
    if (!t || typeof t.closest !== 'function') return false;
    return Boolean(
      t.closest('#thanhgiong-realm-top-hud') ||
      t.closest('#thanhgiong-room-tour-banner') ||
      t.closest('#museum-lore-overlay') ||
      t.closest('#director-hud')
    );
  }

  function updateRaycasterFromPointer(e, cam) {
    if (typeof document !== 'undefined' && document.pointerLockElement) {
      _ndc.set(0, 0);
    } else {
      const canvas = _renderer?.domElement || (typeof document !== 'undefined' ? document.querySelector('canvas') : null);
      const rect = canvas?.getBoundingClientRect?.() || {
        left: 0,
        top: 0,
        width: (typeof window !== 'undefined' ? window.innerWidth : 1) || 1,
        height: (typeof window !== 'undefined' ? window.innerHeight : 1) || 1
      };
      _ndc.x = ((e.clientX - rect.left) / (rect.width || 1)) * 2 - 1;
      _ndc.y = -((e.clientY - rect.top) / (rect.height || 1)) * 2 + 1;
    }
    _raycaster.setFromCamera(_ndc, cam);
  }

  let _ascensionCutsceneActive = false;

  function playAscensionCutscene() {
    if (_ascensionCutsceneActive || _disposed || !_isInsideRealm) return;
    const cam = _camera || (typeof window !== 'undefined' ? window.__camera : null);
    if (!cam) {
      _loreGuide?.showLoreCard?.('thanhgiong_ascension');
      _spatialAudio?.playThanhGiongAscensionFanfare?.();
      return;
    }

    _ascensionCutsceneActive = true;
    lockPlayerControls(true);

    // Âm thanh sử thi hào hùng: tiếng ngựa hí kết hợp tiếng trống đồng
    _spatialAudio?.playThanhGiongAscensionFanfare?.();

    const startPos = cam.position.clone();
    const startQuat = cam.quaternion.clone();

    // Vị trí quan sát ngước nhìn tuyệt đẹp trên đỉnh Sóc Sơn
    const targetPos = new THREE.Vector3(2.4, 17.5, -49.5);
    const lookTarget = new THREE.Vector3(0.0, 29.8, -56.0);

    _tmpLookMat.lookAt(targetPos, lookTarget, _worldUp);
    const endQuat = new THREE.Quaternion().setFromRotationMatrix(_tmpLookMat);

    const durationMs = 2800;
    const startTime = performance.now();

    const step = (now) => {
      if (_disposed || !_isInsideRealm) {
        _ascensionCutsceneActive = false;
        lockPlayerControls(false);
        return;
      }
      const t = Math.min(1, (now - startTime) / durationMs);
      const e = easeInOutCubic(t);

      cam.position.lerpVectors(startPos, targetPos, e);
      cam.quaternion.slerpQuaternions(startQuat, endQuat, e);

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        cam.lookAt(lookTarget);
        _ascensionCutsceneActive = false;
        _loreGuide?.showLoreCard?.('thanhgiong_ascension');
        lockPlayerControls(false);
      }
    };

    requestAnimationFrame(step);
  }

  function onWindowPointerDown(e) {
    if (_disposed || e.button !== 0 || _isTransitioning) return;
    if (isEventOnHudOrOverlay(e)) return;

    const cam = _camera || (typeof window !== 'undefined' ? window.__camera : null);
    if (!cam) return;

    if (!_isInsideRealm) {
      // Cổng bảo tàng: chỉ raycast `portalClickProxy` khi Room 101 đang hiển thị & ở gần
      if (roomGroup && roomGroup.visible === false) return;
      if (typeof window !== 'undefined' && window.__activeScene && mainScene && window.__activeScene !== mainScene) return;
      if (cam.position.distanceToSquared(_roomCenterVec) > 42 * 42) return;

      updateRaycasterFromPointer(e, cam);
      const hits = _raycaster.intersectObject(portalClickProxy, false);
      if (hits.length > 0 && hits[0].distance <= 32.0) {
        e.stopPropagation();
        enterRealm('thanhgiong');
      }
      return;
    }

    // Bên trong cõi Sóc Sơn: chỉ raycast `interactiveProxies`
    if (!_realmState?.interactiveProxies?.length) return;
    if (typeof window !== 'undefined' && window.__activeScene && realmScene && window.__activeScene !== realmScene) return;

    updateRaycasterFromPointer(e, cam);
    const hits = _raycaster.intersectObjects(_realmState.interactiveProxies, false);
    if (hits.length > 0 && hits[0].distance <= 48.0) {
      const ud = hits[0].object?.userData;
      if (!ud) return;
      e.stopPropagation();
      if (ud.isReturnPortal) {
        exitRealm();
      } else if (ud.isAscensionProxy) {
        playAscensionCutscene();
      } else if (ud.loreKey && !_loreGuide?.isOpen) {
        _loreGuide?.showLoreCard?.(ud.loreKey);
      }
    }
  }

  function onWindowKeyDown(e) {
    if (_disposed) return;

    // Cho phép hủy Auto-Tour bất cứ lúc nào bằng phím di chuyển hoặc ESC
    if (_tourActive && ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      stopAutoTour();
      return;
    }

    if (e.key === 'Escape') {
      if (_loreGuide?.isOpen) {
        _loreGuide.hideLoreCard?.();
        return;
      }
      if (_tourActive) {
        stopAutoTour();
        return;
      }
      if (_isInsideRealm && !_isTransitioning) {
        exitRealm();
      }
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', onWindowPointerDown, true);
    window.addEventListener('keydown', onWindowKeyDown);
  }

  function updateMuseumPortal(dt = 0.016, elapsedTime = 0, camera = null) {
    if (_disposed) return;
    if (camera) _camera = camera;
    const cam = _camera || (typeof window !== 'undefined' ? window.__camera : null);

    if (_reentryCooldown > 0) {
      _reentryCooldown = Math.max(0, _reentryCooldown - dt);
    }

    if (_tourActive && !_isInsideRealm) {
      updateAutoTour(performance.now());
    }

    if (_isInsideRealm || !roomGroup || roomGroup.visible === false) return;

    // Gate hiệu ứng & proximity trigger ở khoảng cách <= 42m từ tâm Phòng 101
    if (cam && cam.position.distanceToSquared(_roomCenterVec) > 42 * 42 && !_tourActive) {
      return;
    }

    portalShaderMat.uniforms.uTime.value = elapsedTime;
    haloRingMat.opacity = 0.45 + Math.sin(elapsedTime * 2.6) * 0.16;

    for (let i = 0; i < portalLampSpecs.length; i++) {
      const spec = portalLampSpecs[i];
      const pulse = 0.85 + Math.sin(elapsedTime * 3.8 + spec.phase) * 0.18;
      spec.glow.scale.setScalar(pulse);
      spec.glowMat.opacity = 0.34 + Math.sin(elapsedTime * 4.4 + spec.phase) * 0.11;
    }

    if (cam && !_isTransitioning && !_tourActive && _reentryCooldown <= 0) {
      interiorGroup?.updateMatrixWorld?.(true);
      museumPortalTriggerWorldPos.copy(
        interiorGroup
          ? interiorGroup.localToWorld(new THREE.Vector3(portalGroup.position.x, 1.8, portalGroup.position.z))
          : _roomCenterVec.clone().add(new THREE.Vector3(-10.5, 1.8, 0))
      );

      const dx = cam.position.x - museumPortalTriggerWorldPos.x;
      const dy = cam.position.y - museumPortalTriggerWorldPos.y;
      const dz = cam.position.z - museumPortalTriggerWorldPos.z;
      if (Math.hypot(dx, dz) < 2.5 && Math.abs(dy) < 2.8) {
        enterRealm('thanhgiong');
      }
    }
  }

  function updateRealm(dt = 0.016, elapsedTime = 0, camera = null) {
    if (_disposed || !_isInsideRealm || !_realmState) return;
    if (camera) _camera = camera;
    const cam = _camera || (typeof window !== 'undefined' ? window.__camera : null);

    _realmState.skyMat.uniforms.uTime.value = elapsedTime;
    _realmState.lakeWaterMat.uniforms.uTime.value = elapsedTime;
    _realmState.godRayMat.uniforms.uTime.value = elapsedTime;
    _realmState.emberMat.uniforms.uTime.value = elapsedTime;
    _realmState.mistMat.uniforms.uTime.value = elapsedTime;
    if (_realmState.sparkMat) _realmState.sparkMat.uniforms.uTime.value = elapsedTime;
    if (_realmState.tubeMats) {
      _realmState.tubeMats.forEach((tm) => { if (tm?.uniforms?.uTime) tm.uniforms.uTime.value = elapsedTime; });
    }

    _realmState.moltenMagmaMat.emissiveIntensity = 1.65 + Math.sin(elapsedTime * 3.4) * 0.42;
    _realmState.battleEmberLight.intensity = 10.0 + Math.sin(elapsedTime * 4.2) * 2.2;
    _realmState.summitHaloLight.intensity = 13.0 + Math.sin(elapsedTime * 1.9) * 1.8;
    if (_realmState.flyingGiongLight) {
      _realmState.flyingGiongLight.intensity = 16.0 + Math.sin(elapsedTime * 3.0) * 4.0;
    }

    if (_realmState.flyingGiongGroup) {
      _realmState.flyingGiongGroup.position.y = 29.5 + Math.sin(elapsedTime * 1.8) * 0.38;
      _realmState.flyingGiongGroup.rotation.z = Math.sin(elapsedTime * 1.2) * 0.04;
    }

    if (_realmState.flyingGiongCustomMats?.length) {
      const gPulse = 0.55 + Math.sin(elapsedTime * 2.6) * 0.32;
      _realmState.flyingGiongCustomMats.forEach((m) => {
        m.emissiveIntensity = gPulse;
      });
    }

    if (_realmState.cloudRings?.length) {
      _realmState.cloudRings.forEach((cr, idx) => {
        cr.rotation.z += (idx % 2 === 0 ? 0.008 : -0.006);
      });
    }

    if (_realmState.heavenlyRiftMesh) {
      _realmState.heavenlyRiftMesh.rotation.z += 0.003;
    }

    const ringScale = 1.0 + Math.sin(elapsedTime * 2.4) * 0.05;
    _realmState.exitAuraRing.scale.set(ringScale, ringScale, 1);

    if (cam) {
      _realmState.exitBanner.lookAt(cam.position.x, _realmState.exitBanner.getWorldPosition(_tourTmpVec).y, cam.position.z);
      _realmState.summitBanner.lookAt(cam.position.x, _realmState.summitBanner.getWorldPosition(_tourTmpVec).y, cam.position.z);
    }

    // Đồng bộ bật/tắt wireframe hitbox [H]/[F2] trong Sóc Sơn realm
    if (_realmDebugGroup && _hitboxManager?.debugHelpers) {
      _realmDebugGroup.visible = Boolean(_hitboxManager.debugHelpers.visible);
    }

    if (_tourActive) {
      updateAutoTour(performance.now());
    }
  }

  function setupContext({
    camera = null,
    renderer = null,
    cameraManager: camMgr = null,
    hitboxManager = null,
    loreGuide = null,
    spatialAudio = null,
    portalInteraction = null,
    immersionSystem = null
  } = {}) {
    if (camera) _camera = camera;
    if (renderer) _renderer = renderer;
    if (camMgr) _cameraManager = camMgr;
    if (hitboxManager) _hitboxManager = hitboxManager;
    if (loreGuide) _loreGuide = loreGuide;
    if (spatialAudio) _spatialAudio = spatialAudio;
    if (portalInteraction) _portalInteraction = portalInteraction;
    if (immersionSystem) _immersionSystem = immersionSystem;

    if (!_registeredPortal) {
      _registeredPortal = true;
      try {
        if (_portalInteraction?.registerInteractiveBook) {
          _portalInteraction.registerInteractiveBook(
            portalClickProxy,
            realmSpawnPos,
            portalClickProxy.userData.portalMetadata
          );
        } else {
          registerInteractiveBook(
            portalClickProxy,
            realmSpawnPos,
            portalClickProxy.userData.portalMetadata
          );
        }
        portalClickProxy.userData.isBookPortal = true;
        portalClickProxy.userData.portalTargetRealm = 'THANH_GIONG_REALM';
        portalClickProxy.userData.targetRealm = 'THANH_GIONG_REALM';
      } catch (err) {
        console.warn('[ThanhGiongRealm] registerInteractiveBook warning:', err);
      }
    }

    syncMuseumPortalHitboxes();
  }

  function dispose() {
    if (_disposed) return;
    _disposed = true;

    if (typeof window !== 'undefined') {
      window.removeEventListener('pointerdown', onWindowPointerDown, true);
      window.removeEventListener('keydown', onWindowKeyDown);
      window.__thanhGiongRealmActive = false;
    }

    stopAutoTour();
    disposeSocSonRealm();

    const hud = typeof document !== 'undefined' ? document.getElementById('thanhgiong-realm-top-hud') : null;
    if (hud) hud.style.display = 'none';
    const banner = typeof document !== 'undefined' ? document.getElementById('thanhgiong-room-tour-banner') : null;
    if (banner) banner.style.display = 'none';

    disposeObjectSubtree(portalGroup, { skipShared: true });
    portalGroup.parent?.remove(portalGroup);

    _portalDisposables.forEach((t) => {
      try { t?.dispose?.(); } catch (_) {}
    });
    _portalDisposables.length = 0;
  }

  return {
    portalGroup,
    portalClickProxy,
    enterRealm,
    exitRealm,
    updateMuseumPortal,
    updateRealm,
    startFullAutoTour,
    startRealmOnlyTour,
    stopAutoTour,
    isInsideRealm: () => _isInsideRealm,
    setupContext,
    syncMuseumPortalHitboxes,
    dispose
  };
}
