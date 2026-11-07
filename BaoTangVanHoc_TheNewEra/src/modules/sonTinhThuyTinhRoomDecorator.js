import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { registerInteractiveBook } from './PortalInteraction.js';
import * as VortexCutscene from './bookVortexCutscene.js';
import { buildSonTinhThuyTinhMasterVfx, separateGodsAndCleanScene } from './sonTinhWaterMountainVfx.js';
import {
  ROOM_PALETTES,
  styleAndNormalizeGlbModel,
  createDetailedInstancedParticles,
  createInstancedSilkLanterns,
  createDetailedMandalaFloorDecal,
  createArtisticSkyDomeAndGodRays,
  intersectInteractiveTargetsOnly,
  disposeSceneBranch
} from './museumMasterBeautifier.js';
import {
  createTraditionalArchwayEntrance,
  createCuratedArtifactStation
} from './museumCuratorAndTourSystem.js';
import { upgradeRoomWallArchitecture } from './museumWallArchitectureSystem.js';

const prepareUnlitVividGlbModel = styleAndNormalizeGlbModel;

/**
 * =============================================================================
 * SƠN TINH - THỦY TINH: PHÒNG TRƯNG BÀY ĐÔNG SƠN & ĐẠI CẢNH ĐẠI HỒNG THỦY (60+ FPS)
 * - Phòng Trưng Bày (24m x 24m x 8.4m): Tự động xoay đúng hướng cổng vòm lối vào,
 *   4 bức tường phù điêu Đông Sơn - Tản Viên - Đông Hải, trần Trống Đồng & 8 đèn lồng,
 *   tượng Sơn Tinh & Thủy Tinh (.GLB) đối diện nhau dưới luồng sáng God-Rays,
 *   4 bệ sính lễ (Voi Chín Ngà, Gà Chín Cựa, Ngựa Chín Hồng Mao, Trống Đồng)
 * - Đại Cảnh Đại Hồng Thủy (Y = 420m):
 *   + Đã bỏ hoàn toàn thủy quái, lốc xoáy và lưới wireframe trên mặt biển
 *   + Sơn Tinh đứng uy nghi trên đỉnh núi Tản Viên cao (Y = 42m), Thủy Tinh đứng
 *     ở dưới thấp hơn (Y = 18.5m) giữa biển lũ, cả hai QUAY MẶT ĐỐI ĐẦU TRỰC DIỆN
 *   + Các bức tường Sóng Thần khổng lồ và từng đợt sóng dữ lao trực diện từ phía
 *     Thủy Tinh (+X) đập thẳng vào vách núi Tản Viên (-X) tung bọt trắng xóa
 * =============================================================================
 */

export const SON_TINH_REALM_OFFSET = new THREE.Vector3(5000, 0, 5000);
export const STTT_REALM_ORIGIN = SON_TINH_REALM_OFFSET;
export const STTT_OBS_PLATFORM_OFFSET = new THREE.Vector3(0, 36.0, 88.0);
export const STTT_OBS_LOOK_TARGET_OFFSET = new THREE.Vector3(0, 24.0, -16.0);
export const PLAYER_SPAWN_IN_MYTHIC_WORLD = new THREE.Vector3(5000, 37.7, 5088.0);

const STTT_CACHE = {};

function getCachedTex(key, w, h, drawFn, repeatX = 1, repeatY = 1) {
  if (STTT_CACHE[key]) return STTT_CACHE[key];
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, w, h);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if ('colorSpace' in tex && THREE.SRGBColorSpace) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  STTT_CACHE[key] = tex;
  return tex;
}



function loadGlbWithFallback(loader, urls, onSuccess, onFail) {
  let idx = 0;
  const tryNext = () => {
    if (idx >= urls.length) {
      if (onFail) onFail();
      return;
    }
    loader.load(
      urls[idx++],
      (gltf) => onSuccess(gltf.scene),
      undefined,
      () => tryNext()
    );
  };
  tryNext();
}

function createVolumetricLightBeam(topRadius, bottomRadius, height, colorHex, opacity = 0.24) {
  const beamTex = getCachedTex(`sttt_godray_${colorHex}`, 64, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
    g.addColorStop(0.45, 'rgba(255, 255, 255, 0.42)');
    g.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  const geo = new THREE.CylinderGeometry(topRadius, bottomRadius, height, 20, 1, true);
  const mat = new THREE.MeshBasicMaterial({
    map: beamTex,
    color: colorHex,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    fog: false
  });
  return new THREE.Mesh(geo, mat);
}

function createRelicPlaque(title, subtitle, borderColor = '#facc15') {
  const tex = getCachedTex(`sttt_plaque_v6_${title}`, 640, 180, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(12, 22, 34, 0.96)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 30px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, w / 2, 66);

    ctx.fillStyle = '#e0f2fe';
    ctx.font = '23px "Segoe UI", sans-serif';
    ctx.fillText(subtitle, w / 2, 126);
  });

  return new THREE.Mesh(
    new THREE.PlaneGeometry(1.95, 0.55),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, fog: false })
  );
}

/**
 * DỰNG 4 BỨC TƯỜNG ĐẶC TRƯNG ĐÔNG SƠN - TẢN VIÊN - ĐÔNG HẢI (25.32m x 27.30m x 9.20m)
 * Khớp khít 100% với kiến trúc phòng bảo tàng thật, không khe hở, không tràn ra hành lang
 */
function buildCharacteristicFourWalls(interiorGroup, {
  width = 25.32,
  depth = 27.30,
  height = 9.20,
  centerZ = -0.10,
  doorWidth = 14.5,
  doorHeight = 7.6,
  trimColor = 0xfacc15,
  gltfLoader = null
} = {}) {
  const wallsGroup = new THREE.Group();
  wallsGroup.name = 'STTT_4_Characteristic_Walls';

  const halfW = width * 0.5;
  const halfD = depth * 0.5;
  const backZ = centerZ - halfD;
  const frontZ = centerZ + halfD;
  const wallThick = 0.16;

  // 1. TƯỜNG HẬU CẢNH (Z = backZ): ĐẠI CHIẾN SƠN TINH - THỦY TINH
  const backWallTex = getCachedTex('sttt_wall_back_v6', 1024, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0.0, '#0f291e');
    g.addColorStop(0.5, '#2b1d0e');
    g.addColorStop(1.0, '#082038');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Mặt trời Trống Đồng Đông Sơn tỏa sáng ở tâm
    const sunG = ctx.createRadialGradient(w / 2, h * 0.58, 12, w / 2, h * 0.58, 170);
    sunG.addColorStop(0.0, 'rgba(254, 240, 138, 0.90)');
    sunG.addColorStop(0.45, 'rgba(234, 179, 8, 0.45)');
    sunG.addColorStop(0.8, 'rgba(56, 189, 248, 0.22)');
    sunG.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sunG;
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.58, 170, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 10;
    ctx.strokeRect(12, 12, w - 24, h - 24);

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 40px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText('THẦN THOẠI SƠN TINH • THỦY TINH', w / 2, 66);

    ctx.fillStyle = '#e0f2fe';
    ctx.font = 'italic 25px "Times New Roman", serif';
    ctx.fillText('“Nước dâng cao lên bao nhiêu • Đồi núi Tản Viên dâng cao lên bấy nhiêu”', w / 2, 114);
  });

  // 2. TƯỜNG TRÁI (X = -halfW): TẢN VIÊN SƠN THÁNH (XANH NGỌC & VÀNG ĐỒNG)
  const leftWallTex = getCachedTex('sttt_wall_left_sontinh_v6', 1024, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0.0, '#0b2419');
    g.addColorStop(0.5, '#173826');
    g.addColorStop(1.0, '#1f1910');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Họa tiết dãy núi Tản Viên vàng kim
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.42)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(60, h - 40);
    ctx.lineTo(260, 170);
    ctx.lineTo(460, h - 40);
    ctx.lineTo(680, 150);
    ctx.lineTo(940, h - 40);
    ctx.stroke();

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 10;
    ctx.strokeRect(12, 12, w - 24, h - 24);

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 36px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText('TẢN VIÊN SƠN THÁNH • ĐỆ NHẤT TỨ BẤT TỬ', w / 2, 68);

    ctx.fillStyle = '#a7f3d0';
    ctx.font = 'italic 24px "Times New Roman", serif';
    ctx.fillText('“Dời từng quả đồi, bốc từng dãy núi • Giữ yên bờ cõi Văn Lang”', w / 2, 116);
  });

  // 3. TƯỜNG PHẢI (X = +halfW): ĐÔNG HẢI THỦY THẦN (LAM ĐẠI DƯƠNG & SÓNG THẦN)
  const rightWallTex = getCachedTex('sttt_wall_right_thuytinh_v6', 1024, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0.0, '#061a2e');
    g.addColorStop(0.5, '#0c2e4e');
    g.addColorStop(1.0, '#071526');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.42)';
    ctx.lineWidth = 5;
    for (let y = 180; y < h - 40; y += 42) {
      ctx.beginPath();
      for (let x = 60; x <= w - 60; x += 40) {
        const wy = y + Math.sin(x * 0.03) * 16;
        if (x === 60) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 10;
    ctx.strokeRect(12, 12, w - 24, h - 24);

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 36px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText('ĐÔNG HẢI THỦY THẦN • HÔ MƯA GỌI GIÓ', w / 2, 68);

    ctx.fillStyle = '#bae6fd';
    ctx.font = 'italic 24px "Times New Roman", serif';
    ctx.fillText('“Nước ngập ruộng đồng, sóng cuộn thành Phong Châu”', w / 2, 116);
  });

  // 4. TƯỜNG MẶT TIỀN (Z = frontZ): Mở rộng cửa vòm không che lối vào
  const frontWallTex = getCachedTex('sttt_wall_front_v6', 512, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0.0, '#141e18');
    g.addColorStop(1.0, '#1e160c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 8;
    ctx.strokeRect(10, 10, w - 20, h - 20);
  });

  // 1. Tường Hậu Cảnh (Đóng kín sát tường sau, Z = backZ)
  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(width + wallThick * 2, height, wallThick),
    new THREE.MeshBasicMaterial({ map: backWallTex, side: THREE.DoubleSide, fog: false })
  );
  backWall.position.set(0, height * 0.5, backZ);
  wallsGroup.add(backWall);

  // 2. Tường Ngăn Bên Trái (Nối liền từ cửa vòm đến mép sau X = -halfW)
  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(wallThick, height, depth),
    new THREE.MeshBasicMaterial({ map: leftWallTex, side: THREE.DoubleSide, fog: false })
  );
  leftWall.position.set(-halfW, height * 0.5, centerZ);
  wallsGroup.add(leftWall);

  // 3. Tường Ngăn Bên Phải (Nối liền từ cửa vòm đến mép sau X = +halfW)
  const rightWall = new THREE.Mesh(
    new THREE.BoxGeometry(wallThick, height, depth),
    new THREE.MeshBasicMaterial({ map: rightWallTex, side: THREE.DoubleSide, fog: false })
  );
  rightWall.position.set(halfW, height * 0.5, centerZ);
  wallsGroup.add(rightWall);

  // 4. Vách Mặt Tiền (Z = frontZ): Hướng thẳng ra sảnh bảo tàng, cửa mở rộng 14.5m không bao giờ chắn mặt người chơi
  const halfDoor = doorWidth * 0.5;
  const wingW = Math.max(0.1, halfW - halfDoor);
  const frontMat = new THREE.MeshBasicMaterial({ map: frontWallTex, side: THREE.DoubleSide, fog: false });

  // 2 cánh tường bên rìa ngoài (X = +-10m đến +-12.6m), để trống toàn bộ lòng cửa 14.5m ở giữa
  const leftFrontWing = new THREE.Mesh(new THREE.BoxGeometry(wingW + wallThick, height, wallThick), frontMat);
  leftFrontWing.position.set(-(halfDoor + (wingW + wallThick) * 0.5), height * 0.5, frontZ);
  wallsGroup.add(leftFrontWing);

  const rightFrontWing = new THREE.Mesh(new THREE.BoxGeometry(wingW + wallThick, height, wallThick), frontMat);
  rightFrontWing.position.set((halfDoor + (wingW + wallThick) * 0.5), height * 0.5, frontZ);
  wallsGroup.add(rightFrontWing);

  // Thanh xà trên đỉnh cửa (ở độ cao Y = 7.6m đến 9.2m)
  const lintelHeight = Math.max(0.1, height - doorHeight);
  const doorLintel = new THREE.Mesh(new THREE.BoxGeometry(doorWidth + 0.08, lintelHeight, wallThick), frontMat);
  doorLintel.position.set(0, doorHeight + lintelHeight * 0.5, frontZ);
  wallsGroup.add(doorLintel);

  const signTex = getCachedTex('sttt_gate_signboard_v6', 800, 200, (ctx, w, h) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 34px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText('❖ THẦN THOẠI SƠN TINH • THỦY TINH ❖', w / 2, 72);

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'italic 22px "Times New Roman", serif';
    ctx.fillText('Đệ Nhất Tứ Bất Tử Việt Nam • Bản Hùng Ca Trị Thủy', w / 2, 134);
  });
  const gateSign = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.min(doorWidth * 0.68, 8.5), 1.1),
    new THREE.MeshBasicMaterial({ map: signTex, side: THREE.FrontSide, fog: false })
  );
  gateSign.position.set(0, doorHeight + 0.65, frontZ - 0.05);
  gateSign.rotation.y = Math.PI; // Quay vào trong phòng
  wallsGroup.add(gateSign);

  interiorGroup.add(wallsGroup);
  return wallsGroup;
}

/**
 * Tạo khối núi đá Tản Viên khổng lồ với địa hình vách đá gồ ghề tự nhiên
 */
function createColossalMountainPeak(radiusBottom, height, radialSegs, heightSegs, material, seed = 1, flatTopRatio = 0.85) {
  const geo = new THREE.ConeGeometry(radiusBottom, height, radialSegs, heightSegs, false);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);
    const vz = pos.getZ(i);
    const normalizedH = (vy + height * 0.5) / height;

    const angle = Math.atan2(vz, vx);
    const ridgeNoise =
      Math.sin(angle * 5 + seed * 1.3) * 0.20 +
      Math.cos(normalizedH * 8 + seed * 2.1) * 0.15 +
      Math.sin(angle * 11 - normalizedH * 6) * 0.08;

    const factor = 1 + ridgeNoise * (1 - normalizedH * 0.35);
    pos.setX(i, vx * factor);
    pos.setZ(i, vz * factor);
    if (normalizedH > flatTopRatio) {
      const capY = height * (flatTopRatio - 0.5);
      pos.setY(i, capY + (vy - capY) * 0.25);
    }
  }
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, material);
}

/**
 * Tạo Bức Tường Sóng Thần Đại Hồng Thủy Uốn Cong Chồm Lên (3D Curving Tsunami Wall)
 * Khi xoay rotation.y = -Math.PI / 2, sóng sẽ chồm trực diện từ hướng +X (Thủy Tinh) đập thẳng vào -X (Núi Tản Viên)
 */
function createColossalTsunamiWallGeometry(width = 96, height = 50, segW = 48, segH = 28) {
  const geo = new THREE.PlaneGeometry(width, height, segW, segH);
  const pos = geo.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const normH = (y + height * 0.5) / height; // 0 (đáy) -> 1 (đỉnh sóng)

    // Uốn cong mặt sóng chồm về phía trước (+Z cục bộ) để khi xoay sang hướng -X sẽ bổ nhào thẳng vào vách núi
    const curlForward = Math.pow(normH, 2.0) * 22.0 - Math.sin(normH * Math.PI) * 5.5;
    const lipDrop = normH > 0.85 ? -Math.pow((normH - 0.85) / 0.15, 2) * 6.5 : 0;
    const horizontalCurve = Math.cos((x / (width * 0.5)) * Math.PI * 0.45) * 6.5;

    pos.setY(i, normH * height + lipDrop);
    pos.setZ(i, curlForward + horizontalCurve);
  }
  geo.computeVertexNormals();
  return geo;
}

/**
 * Tạo Ngọn Sóng Cuộn Dài Đánh Trực Diện Từ Biển Vào Vách Núi (Rolling Wave Crest)
 */
function createAssaultWaveRollerGeometry(lengthZ = 76, heightY = 14) {
  const geo = new THREE.CylinderGeometry(heightY * 0.45, heightY * 0.65, lengthZ, 20, 16, true, 0, Math.PI * 1.15);
  geo.rotateX(Math.PI / 2);
  return geo;
}

/**
 * Tạo Tia Sét 3D Phân Nhánh (3D Jagged Lightning Bolt)
 */
function createLightningBoltMesh(height = 70, colorHex = 0xe0f2fe) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.95,
    fog: false
  });

  const segs = 10;
  const segH = height / segs;
  let curX = 0;
  let curZ = 0;

  for (let i = 0; i < segs; i++) {
    const nextX = curX + (Math.random() - 0.5) * 6.5;
    const nextZ = curZ + (Math.random() - 0.5) * 4.5;
    const y1 = height - i * segH;
    const y2 = height - (i + 1) * segH;

    const p1 = new THREE.Vector3(curX, y1, curZ);
    const p2 = new THREE.Vector3(nextX, y2, nextZ);
    const dist = p1.distanceTo(p2);

    const boltSeg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28 * (1 - i * 0.05), 0.22 * (1 - i * 0.05), dist, 6),
      mat
    );
    boltSeg.position.copy(p1).add(p2).multiplyScalar(0.5);
    boltSeg.lookAt(p2);
    boltSeg.rotateX(Math.PI / 2);
    group.add(boltSeg);

    curX = nextX;
    curZ = nextZ;
  }

  group.userData.mat = mat;
  return group;
}

/**
 * Tạo Đền Thượng Cổ Kính trên sườn Núi Tản Viên
 */
function createMountainShrine(goldMat, jadeMat) {
  const shrine = new THREE.Group();
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x451a03, emissive: 0x1c0a00 });
  const roofMat = new THREE.MeshPhongMaterial({ color: 0x991b1b, emissive: 0x3b0707, specular: 0xfacc15 });

  const base = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.2, 4.2), jadeMat);
  base.position.y = 0.6;
  shrine.add(base);

  [[-2.0, -1.5], [2.0, -1.5], [-2.0, 1.5], [2.0, 1.5]].forEach(([px, pz]) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 3.2, 8), woodMat);
    col.position.set(px, 2.8, pz);
    shrine.add(col);
  });

  const roof = new THREE.Mesh(new THREE.ConeGeometry(4.6, 2.2, 4), roofMat);
  roof.position.y = 5.3;
  roof.rotation.y = Math.PI / 4;
  shrine.add(roof);

  const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), goldMat);
  finial.position.y = 6.6;
  shrine.add(finial);

  return shrine;
}

/**
 * Tạo hiện vật 3D đặc trưng của truyền thuyết Sơn Tinh - Thủy Tinh trong Phòng Bảo Tàng:
 * 1. Voi Chín Ngà (Mô hình Poly Haven CC0 + 9 Ngà Vàng Thần Tộc)
 * 2. Gà Chín Cựa
 * 3. Ngựa Chín Hồng Mao (Mô hình Poly Haven CC0 + 9 Bờm Lửa Hồng Mao)
 * 4. Trống Đồng & Ấn Thủy Tộc
 */
function createSignatureRelicModel(type, mats, gltfLoader = null) {
  const group = new THREE.Group();
  const { goldMat, ivoryMat, crimsonMat, jadeMat, oceanMat, bronzeMat } = mats;

  if (type === 'VOI_CHIN_NGA') {
    const fallbackGroup = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.55, 0.95), bronzeMat);
    body.position.y = 0.42;
    fallbackGroup.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 12), bronzeMat);
    head.position.set(0, 0.62, 0.48);
    fallbackGroup.add(head);

    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.28), goldMat);
      ear.position.set(side * 0.34, 0.62, 0.42);
      ear.rotation.y = side * 0.35;
      fallbackGroup.add(ear);
    });

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.14, 0.55, 10), bronzeMat);
    trunk.position.set(0, 0.52, 0.78);
    trunk.rotation.x = 0.65;
    fallbackGroup.add(trunk);

    for (let i = 0; i < 9; i++) {
      const offset = (i - 4) * 0.085;
      const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.48, 8), ivoryMat);
      tusk.position.set(offset, 0.52 + Math.abs(i - 4) * 0.02, 0.74);
      tusk.rotation.x = Math.PI * 0.38;
      tusk.rotation.z = -offset * 0.9;
      fallbackGroup.add(tusk);
    }

    const howdah = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.25, 8), jadeMat);
    howdah.position.set(0, 0.82, -0.05);
    fallbackGroup.add(howdah);
    group.add(fallbackGroup);

    // TÍCH HỢP MÔ HÌNH POLY HAVEN CC0 CHO VOI CHÍN NGÀ
    if (gltfLoader) {
      gltfLoader.load(
        '/model/polyhaven/carved_wooden_elephant/carved_wooden_elephant_1k.gltf',
        (gltf) => {
          fallbackGroup.visible = false;
          const elephantModel = gltf.scene;
          elephantModel.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = false;
              child.receiveShadow = false;
              child.frustumCulled = true;
            }
          });
          const box = new THREE.Box3().setFromObject(elephantModel);
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 1.05 / (maxDim || 1);
          elephantModel.scale.setScalar(scale);

          box.setFromObject(elephantModel);
          const center = new THREE.Vector3();
          box.getCenter(center);
          elephantModel.position.x = -center.x;
          elephantModel.position.z = -center.z;
          elephantModel.position.y = -box.min.y;

          // 9 Ngà Vàng Hoàng Kim phát sáng quanh đầu voi
          const tusksGroup = new THREE.Group();
          for (let i = 0; i < 9; i++) {
            const offset = (i - 4) * 0.065;
            const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.38, 8), goldMat);
            tusk.position.set(offset, 0.38 + Math.abs(i - 4) * 0.015, 0.42);
            tusk.rotation.x = Math.PI * 0.36;
            tusk.rotation.z = -offset * 0.85;
            tusksGroup.add(tusk);
          }
          elephantModel.add(tusksGroup);
          group.add(elephantModel);
        },
        undefined,
        (err) => {
          console.warn('[POLYHAVEN] Dùng fallback cho Voi Chín Ngà:', err);
        }
      );
    }
  } else if (type === 'GA_CHIN_CUA') {
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 12), goldMat);
    body.scale.set(0.85, 1.0, 1.25);
    body.position.y = 0.52;
    group.add(body);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.38, 10), goldMat);
    neck.position.set(0, 0.82, 0.26);
    neck.rotation.x = -0.25;
    group.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), goldMat);
    head.position.set(0, 1.02, 0.34);
    group.add(head);

    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.18, 0.24), crimsonMat);
    crest.position.set(0, 1.16, 0.34);
    group.add(crest);

    for (let i = 0; i < 5; i++) {
      const tailFeather = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.55, 6), i % 2 === 0 ? crimsonMat : goldMat);
      tailFeather.position.set((i - 2) * 0.08, 0.75, -0.38);
      tailFeather.rotation.x = -0.75;
      tailFeather.rotation.z = (i - 2) * 0.18;
      group.add(tailFeather);
    }

    [-0.14, 0.14].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.38, 8), bronzeMat);
      leg.position.set(lx, 0.2, 0.05);
      group.add(leg);
    });

    for (let i = 0; i < 9; i++) {
      const side = i < 5 ? -0.14 : 0.14;
      const idxOnLeg = i < 5 ? i : i - 5;
      const spur = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.22, 6), ivoryMat);
      spur.position.set(side, 0.12 + idxOnLeg * 0.055, -0.04);
      spur.rotation.x = -Math.PI * 0.42;
      spur.rotation.z = side < 0 ? 0.35 : -0.35;
      group.add(spur);
    }
  } else if (type === 'NGUA_CHIN_HONG_MAO') {
    const fallbackGroup = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.92), ivoryMat);
    body.position.y = 0.56;
    body.rotation.x = -0.15;
    fallbackGroup.add(body);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.52, 10), ivoryMat);
    neck.position.set(0, 0.88, 0.36);
    neck.rotation.x = 0.42;
    fallbackGroup.add(neck);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.42), ivoryMat);
    head.position.set(0, 1.08, 0.55);
    head.rotation.x = 0.35;
    fallbackGroup.add(head);

    for (let i = 0; i < 9; i++) {
      const mane = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.42, 8), crimsonMat);
      mane.position.set(
        (i % 2 === 0 ? 1 : -1) * 0.04,
        1.12 - i * 0.055,
        0.42 - i * 0.075
      );
      mane.rotation.x = -0.85;
      fallbackGroup.add(mane);
    }

    [
      [-0.16, 0.26, 0.32],
      [0.16, 0.26, 0.32],
      [-0.16, 0.24, -0.32],
      [0.16, 0.24, -0.32]
    ].forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.48, 8), goldMat);
      leg.position.set(x, y, z);
      fallbackGroup.add(leg);
    });
    group.add(fallbackGroup);

    // TÍCH HỢP MÔ HÌNH POLY HAVEN CC0 CHO NGỰA CHÍN HỒNG MAO
    if (gltfLoader) {
      gltfLoader.load(
        '/model/polyhaven/horse_statue_01/horse_statue_01_1k.gltf',
        (gltf) => {
          fallbackGroup.visible = false;
          const horseModel = gltf.scene;
          horseModel.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = false;
              child.receiveShadow = false;
              child.frustumCulled = true;
            }
          });
          const box = new THREE.Box3().setFromObject(horseModel);
          const size = new THREE.Vector3();
          box.getSize(size);
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 1.12 / (maxDim || 1);
          horseModel.scale.setScalar(scale);

          box.setFromObject(horseModel);
          const center = new THREE.Vector3();
          box.getCenter(center);
          horseModel.position.x = -center.x;
          horseModel.position.z = -center.z;
          horseModel.position.y = -box.min.y;

          // 9 Chùm Bờm Hồng Mao rực lửa
          const manesGroup = new THREE.Group();
          for (let i = 0; i < 9; i++) {
            const mane = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.32, 8), crimsonMat);
            mane.position.set(
              (i % 2 === 0 ? 1 : -1) * 0.035,
              0.72 - i * 0.04,
              0.24 - i * 0.045
            );
            mane.rotation.x = -0.85;
            manesGroup.add(mane);
          }
          horseModel.add(manesGroup);
          group.add(horseModel);
        },
        undefined,
        (err) => {
          console.warn('[POLYHAVEN] Dùng fallback cho Ngựa Chín Hồng Mao:', err);
        }
      );
    }
  } else {
    const drumTop = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.38, 0.32, 20), bronzeMat);
    drumTop.position.y = 0.36;
    group.add(drumTop);

    const drumBase = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, 0.24, 20), goldMat);
    drumBase.position.y = 0.12;
    group.add(drumBase);

    const oceanOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 2), oceanMat);
    oceanOrb.position.y = 0.82;
    group.add(oceanOrb);

    const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 10, 28), goldMat);
    haloRing.position.y = 0.82;
    group.add(haloRing);
  }

  return group;
}

/**
 * Tạo Bảng Điện Tử Hologram siêu nét
 */
function createGiantVoidHologram({
  headerTag = 'HỒ SƠ VĂN HỌC SỐ HÓA',
  title = 'SƠN TINH - THỦY TINH',
  author = 'Kho tàng Thần thoại Dân gian Việt Nam',
  year = 'Thời đại Hùng Vương thứ XVIII',
  bullets = [],
  accentColor = '#38bdf8',
  secondaryColor = '#eab308',
  width = 5.8,
  height = 3.6
} = {}) {
  const group = new THREE.Group();

  const tex = getCachedTex(`sttt_holo_v7_${title}_${headerTag}_${width}`, 2048, 1152, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0.0, 'rgba(6, 15, 28, 0.95)');
    bg.addColorStop(0.5, 'rgba(12, 28, 48, 0.92)');
    bg.addColorStop(1.0, 'rgba(5, 12, 22, 0.96)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 10;
    ctx.strokeRect(24, 24, w - 48, h - 48);

    ctx.strokeStyle = secondaryColor;
    ctx.lineWidth = 3;
    ctx.strokeRect(40, 40, w - 80, h - 80);

    ctx.fillStyle = accentColor;
    ctx.fillRect(40, 40, w - 80, 76);
    ctx.fillStyle = '#04101e';
    ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`◈ ${headerTag}`, 64, 78);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 60px "Segoe UI", sans-serif';
    ctx.fillText(title.toUpperCase(), 64, 185);

    ctx.fillStyle = secondaryColor;
    ctx.font = 'bold 38px "Segoe UI", sans-serif';
    ctx.fillText('• Nguồn gốc: ', 64, 265);
    ctx.fillStyle = '#e2f1ff';
    ctx.font = '38px "Segoe UI", sans-serif';
    ctx.fillText(author, 330, 265);

    ctx.fillStyle = secondaryColor;
    ctx.font = 'bold 38px "Segoe UI", sans-serif';
    ctx.fillText('• Bối cảnh: ', 64, 330);
    ctx.fillStyle = '#e2f1ff';
    ctx.font = '38px "Segoe UI", sans-serif';
    ctx.fillText(year, 290, 330);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(64, 380);
    ctx.lineTo(w - 64, 380);
    ctx.stroke();

    ctx.fillStyle = '#d8eeff';
    ctx.font = '36px "Segoe UI", sans-serif';
    let curY = 445;
    const maxW = w - 130;
    const lineH = 54;

    bullets.forEach((paragraph) => {
      const words = paragraph.split(' ');
      let line = '▸ ';
      for (let i = 0; i < words.length; i++) {
        const test = line + words[i] + ' ';
        if (ctx.measureText(test).width > maxW && i > 0) {
          ctx.fillText(line, 64, curY);
          line = '   ' + words[i] + ' ';
          curY += lineH;
        } else {
          line = test;
        }
      }
      ctx.fillText(line, 64, curY);
      curY += lineH + 16;
    });
  });

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      opacity: 0.94,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false
    })
  );
  group.add(screen);

  return group;
}

/**
 * HÀM THIẾT LẬP PHÒNG SƠN TINH - THỦY TINH (NHẬN TRỰC TIẾP ĐỐI TƯỢNG SCENE LÀM THAM SỐ)
 */
// =========================================================================
// BẬC THẦY ĐIÊU KHẮC HÌNH TƯỢNG SƠN TINH & THỦY TINH ĐỐI ĐẦU 76M
// =========================================================================
function createProceduralSonTinhFigure() {
  const group = new THREE.Group();
  group.name = 'Procedural_SonTinh_Hero';
  group.userData = { preserve: true, isHero: true };

  const legMat = new THREE.MeshBasicMaterial({ color: 0x854d0e, side: THREE.DoubleSide, fog: false });
  const goldArmorMat = new THREE.MeshBasicMaterial({ color: 0xfde047, side: THREE.DoubleSide, fog: false });
  const bronzeBodyMat = new THREE.MeshBasicMaterial({ color: 0xd97706, side: THREE.DoubleSide, fog: false });
  const capeMat = new THREE.MeshBasicMaterial({ color: 0xb91c1c, side: THREE.DoubleSide, fog: false });

  // 2 chân uy dũng trên đỉnh Tản Viên
  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.1, 6.0, 8), legMat);
  leftLeg.position.set(-1.4, 3.0, 0);
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.1, 6.0, 8), legMat);
  rightLeg.position.set(1.4, 3.0, 0);
  group.add(rightLeg);

  // Thân giáp đồng Đông Sơn hộ tâm phiến
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 1.8, 6.5, 10), bronzeBodyMat);
  torso.position.set(0, 9.25, 0);
  group.add(torso);

  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.8, 2.2), goldArmorMat);
  chestPlate.position.set(0, 10.2, 0.4);
  group.add(chestPlate);

  // Giáp vai đại bàng tung cánh
  const leftShoulder = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.8, 6), goldArmorMat);
  leftShoulder.position.set(-2.8, 12.0, 0);
  leftShoulder.rotation.z = Math.PI / 4;
  group.add(leftShoulder);

  const rightShoulder = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.8, 6), goldArmorMat);
  rightShoulder.position.set(2.8, 12.0, 0);
  rightShoulder.rotation.z = -Math.PI / 4;
  group.add(rightShoulder);

  // Đầu và Mũ lông chim Lạc Việt vươn cao
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), new THREE.MeshBasicMaterial({ color: 0xfbbf24, fog: false }));
  head.position.set(0, 13.8, 0);
  group.add(head);

  const crown = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3.6, 8), goldArmorMat);
  crown.position.set(0, 16.0, 0);
  group.add(crown);

  // Áo choàng đỏ rực bay cuộn sau lưng
  const cape = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 11.0, 4, 4), capeMat);
  cape.position.set(0, 8.5, -1.4);
  cape.rotation.x = 0.15;
  group.add(cape);

  // Thần Khí: Búa Thần Dời Non Lạc Việt rực ánh kim
  const weaponStaff = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 18.0, 8), goldArmorMat);
  weaponStaff.position.set(2.9, 9.0, 1.2);
  weaponStaff.rotation.x = -0.15;
  group.add(weaponStaff);

  const axeBlade = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.4, 0.3), goldArmorMat);
  axeBlade.position.set(3.8, 16.5, 1.2);
  group.add(axeBlade);

  return group;
}

function createProceduralThuyTinhFigure() {
  const group = new THREE.Group();
  group.name = 'Procedural_ThuyTinh_Hero';
  group.userData = { preserve: true, isHero: true };

  const seaBodyMat = new THREE.MeshBasicMaterial({ color: 0x0369a1, side: THREE.DoubleSide, fog: false });
  const seaArmorMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, fog: false });
  const waveCapeMat = new THREE.MeshBasicMaterial({ color: 0x0284c7, side: THREE.DoubleSide, fog: false });
  const waterGlowMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe, side: THREE.DoubleSide, fog: false });

  // 2 chân thần biển đạp trên đầu sóng dữ
  const leftLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.05, 5.8, 8), seaBodyMat);
  leftLeg.position.set(-1.3, 2.9, 0);
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.05, 5.8, 8), seaBodyMat);
  rightLeg.position.set(1.3, 2.9, 0);
  group.add(rightLeg);

  // Thân giáp vảy rồng lam ngọc
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 1.7, 6.2, 10), seaBodyMat);
  torso.position.set(0, 8.8, 0);
  group.add(torso);

  const chestScale = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3.6, 2.0), seaArmorMat);
  chestScale.position.set(0, 9.6, 0.35);
  group.add(chestScale);

  // Giáp vai vi cá mập / sóng nhọn
  const leftShoulder = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.6, 6), seaArmorMat);
  leftShoulder.position.set(-2.6, 11.2, 0);
  leftShoulder.rotation.z = Math.PI / 4;
  group.add(leftShoulder);

  const rightShoulder = new THREE.Mesh(new THREE.ConeGeometry(1.5, 2.6, 6), seaArmorMat);
  rightShoulder.position.set(2.6, 11.2, 0);
  rightShoulder.rotation.z = -Math.PI / 4;
  group.add(rightShoulder);

  // Đầu và Vương Miện Thủy Thần Đông Hải
  const head = new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 16), new THREE.MeshBasicMaterial({ color: 0x7dd3fc, fog: false }));
  head.position.set(0, 13.0, 0);
  group.add(head);

  const crown = new THREE.Mesh(new THREE.ConeGeometry(1.4, 3.2, 6), seaArmorMat);
  crown.position.set(0, 15.0, 0);
  group.add(crown);

  // Áo choàng bão tố cuộn sóng lam thẫm
  const cape = new THREE.Mesh(new THREE.PlaneGeometry(5.0, 10.5, 4, 4), waveCapeMat);
  cape.position.set(0, 8.0, -1.3);
  cape.rotation.x = 0.15;
  group.add(cape);

  // Thần Khí: Đinh Ba Tam Soa Thủy Tinh (Trident)
  const tridentStaff = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 17.5, 8), waterGlowMat);
  tridentStaff.position.set(2.8, 8.5, 1.1);
  tridentStaff.rotation.x = -0.15;
  group.add(tridentStaff);

  [-0.9, 0, 0.9].forEach((ox) => {
    const prong = new THREE.Mesh(new THREE.ConeGeometry(0.25, 2.8, 6), seaArmorMat);
    prong.position.set(2.8 + ox, 17.2, 1.1);
    group.add(prong);
  });
  const crossbar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 0.3), seaArmorMat);
  crossbar.position.set(2.8, 15.8, 1.1);
  group.add(crossbar);

  return group;
}

export function setupSonTinhThuyTinhRoom(scene, options = {}) {
  const targetScene = scene || (typeof window !== 'undefined' ? (window.__sonTinhThuyTinhScene || window.__app?.scene) : null);
  const room = buildSonTinhThuyTinhExhibition({
    scene: targetScene,
    ...options
  });
  if (scene && typeof scene.add === 'function' && room.parent !== scene) {
    scene.add(room);
  }
  return room;
}

export function buildSonTinhThuyTinhExhibition({
  scene = null,
  roomCenter = new THREE.Vector3(-48, 0, -19),
  battleScene = null
} = {}) {
  const root = new THREE.Group();
  root.name = 'SonTinhThuyTinh_DirectFaceOff_And_GrandRoom_V6';
  root.position.set(0, 0, 0);

  let _scene = scene;
  let _battleScene = battleScene;
  let _camera = null;
  let _renderer = null;
  let _cameraManager = null;
  let _isInsideRealm = false;
  let _isTransitioning = false;
  let _savedFog = null;
  let _savedBackground = null;
  const savedReturnPosition = new THREE.Vector3();
  const gltfLoader = new GLTFLoader();
  const interactiveTargets = [];

  // =========================================================================
  // PHẦN A: PHÒNG TRƯNG BÀY ĐÔNG SƠN - TẢN VIÊN - ĐÔNG HẢI (25.32m x 27.30m x 9.20m)
  // Tự động căn hướng interiorGroup.rotation.y để cửa phòng luôn đón thẳng lối vào!
  // =========================================================================
  const ROOM_W = 25.32;
  const ROOM_D = 27.30;
  const ROOM_H = 9.20;
  const ROOM_CENTER_Z = -0.10;
  const DOOR_W = 6.2;
  const DOOR_H = 7.5;

  const roomGroup = new THREE.Group();
  roomGroup.name = 'SonTinhThuyTinh_Museum_Room';
  roomGroup.position.copy(roomCenter);
  root.add(roomGroup);

  const interiorGroup = new THREE.Group();
  interiorGroup.name = 'STTT_Aligned_Interior';
  if (Math.abs(roomCenter.x) >= Math.abs(roomCenter.z)) {
    interiorGroup.rotation.y = roomCenter.x < 0 ? Math.PI / 2 : -Math.PI / 2;
  } else {
    interiorGroup.rotation.y = roomCenter.z < 0 ? 0 : Math.PI;
  }
  roomGroup.add(interiorGroup);

  // A1. 4 Bức Tường Đặc Trưng Khớp Sát Phòng Lớn (Cửa 14.5m không bao giờ chặn lối vào)
  buildCharacteristicFourWalls(interiorGroup, {
    width: ROOM_W,
    depth: ROOM_D,
    height: ROOM_H,
    centerZ: ROOM_CENTER_Z,
    doorWidth: 14.5,
    doorHeight: DOOR_H,
    trimColor: 0xfacc15,
    gltfLoader
  });

  // A1.0 NÂNG CẤP HỌA TIẾT TƯỜNG 3 TẦNG, PHÀO CHỈ, 4 TRANH PHÙ ĐIÊU & BÌNH PHONG HẮT SÁNG
  upgradeRoomWallArchitecture(interiorGroup, {
    themeKey: 'sonTinhThuyTinh',
    roomWidth: ROOM_W,
    roomDepth: ROOM_D,
    wallHeight: ROOM_H
  });

  // A1.1 CỔNG VÒM MÁI ĐAO HOÀNG GIA KÈM HOÀNH PHI CÂU ĐỐI TẠI MẶT TIỀN (Z = +12.0m)
  const stTraditionalArchway = createTraditionalArchwayEntrance({
    roomTitle: 'SƠN THỦY THẦN CHIẾN',
    leftCouplet: 'Nước dâng cao dâng cao đồi núi',
    rightCouplet: 'Sóng gầm thét chuyển đất Tản Viên',
    archWidth: 6.2,
    archHeight: 4.8
  });
  stTraditionalArchway.position.set(0, 0, 12.0);
  interiorGroup.add(stTraditionalArchway);

  const woodMat = new THREE.MeshLambertMaterial({ color: 0x261509 });
  const bronzeMat = new THREE.MeshPhongMaterial({
    color: 0x8c6239,
    emissive: 0x241608,
    specular: 0xd4af37,
    shininess: 65
  });
  const goldMat = new THREE.MeshPhongMaterial({
    color: 0xfacc15,
    emissive: 0x422c06,
    specular: 0xfef08a,
    shininess: 90
  });
  const ivoryMat = new THREE.MeshPhongMaterial({
    color: 0xfffbeb,
    emissive: 0x3b3018,
    specular: 0xffffff,
    shininess: 80
  });
  const crimsonMat = new THREE.MeshPhongMaterial({
    color: 0xef4444,
    emissive: 0x450a0a,
    specular: 0xfca5a5,
    shininess: 75
  });
  const jadeMat = new THREE.MeshPhongMaterial({
    color: 0x10b981,
    emissive: 0x064e3b,
    specular: 0x6ee7b7,
    shininess: 75
  });
  const oceanMat = new THREE.MeshPhongMaterial({
    color: 0x0ea5e9,
    emissive: 0x082f49,
    specular: 0x7dd3fc,
    shininess: 85
  });

  // A2. Ánh Sáng Phòng Trưng Bày (Vàng Đông Sơn Trung Tâm, Ngọc Tản Viên Trái, Lam Đông Hải Phải)
  const roomCenterLight = new THREE.PointLight(0xfde047, 2.8, 25, 1.3);
  roomCenterLight.position.set(0, 7.2, -1.0);
  roomCenterLight.castShadow = false;
  interiorGroup.add(roomCenterLight);

  const roomGoldLight = new THREE.PointLight(0x10b981, 2.5, 22, 1.4);
  roomGoldLight.position.set(-6.5, 6.0, -3.5);
  roomGoldLight.castShadow = false;
  interiorGroup.add(roomGoldLight);

  const roomOceanLight = new THREE.PointLight(0x38bdf8, 2.6, 22, 1.4);
  roomOceanLight.position.set(6.5, 6.0, -3.5);
  roomOceanLight.castShadow = false;
  interiorGroup.add(roomOceanLight);

  // A3. Trần Nhà Trống Đồng Đông Sơn (25.32m x 27.30m tại Y = 9.20m) & 8 Đèn Lồng Đồng Cổ
  const ceilingTex = getCachedTex('sttt_ceiling_dongson_canopy_v6', 1024, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#09131c';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2, cy = h / 2;
    const g = ctx.createRadialGradient(cx, cy, 20, cx, cy, cx * 0.85);
    g.addColorStop(0.0, 'rgba(250, 204, 21, 0.78)');
    g.addColorStop(0.38, 'rgba(16, 185, 129, 0.42)');
    g.addColorStop(0.72, 'rgba(56, 189, 248, 0.30)');
    g.addColorStop(1.0, 'rgba(9, 19, 28, 1.0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, cx * 0.85, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 5;
    [0.22, 0.45, 0.68, 0.85].forEach((r) => {
      ctx.beginPath();
      ctx.arc(cx, cy, cx * r, 0, Math.PI * 2);
      ctx.stroke();
    });
  });

  const solidCeiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W + 0.20, ROOM_D + 0.20),
    new THREE.MeshBasicMaterial({ map: ceilingTex, side: THREE.FrontSide, depthWrite: true, fog: false })
  );
  solidCeiling.rotation.x = Math.PI / 2;
  solidCeiling.position.set(0, ROOM_H, ROOM_CENTER_Z);
  interiorGroup.add(solidCeiling);

  const bronzeLanterns = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const radius = 7.5;
    const lGroup = new THREE.Group();
    lGroup.position.set(Math.cos(angle) * radius, 7.5, Math.sin(angle) * radius - 0.8);

    const cord = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 1.6, 6),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    cord.position.y = 0.8;
    lGroup.add(cord);

    const drumLantern = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.36, 0.62, 14),
      new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xfacc15 : 0x38bdf8,
        fog: false
      })
    );
    lGroup.add(drumLantern);

    interiorGroup.add(lGroup);
    bronzeLanterns.push({ group: lGroup, phase: i * 0.8 });
  }

  // NẠP MÔ HÌNH ĐÈN LỒNG CỔ .GLB (den_long_co.glb / den_long_treo.glb) VÀO 8 ĐÈN TREO TRẦN
  if (gltfLoader) {
    loadGlbWithFallback(
      gltfLoader,
      ['/model/den_long_co.glb', '/models/den_long_co.glb', '/model/den_long_treo.glb'],
      (rawScene) => {
        bronzeLanterns.forEach((item) => {
          const lModel = prepareUnlitVividGlbModel(rawScene.clone(true), {
            targetSpan: 0.95,
            fitAxis: 'y',
            groundY: false,
            color: 0xfacc15,
            castShadow: false,
            receiveShadow: false
          });
          lModel.position.set(0, -0.35, 0);
          item.group.add(lModel);
        });
      }
    );
  }

  // A4. Sàn Trống Đồng Đông Sơn - Đông Hải (Full-Size 25.32m x 27.30m)
  const grandFloorTex = getCachedTex('sttt_grand_dongson_floor_v6', 1024, 1024, (ctx, w, h) => {
    const cx = w / 2, cy = h / 2;
    const bgGrad = ctx.createLinearGradient(0, 0, w, 0);
    bgGrad.addColorStop(0.0, '#0d261b');
    bgGrad.addColorStop(0.5, '#241a0e');
    bgGrad.addColorStop(1.0, '#082036');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 14;
    ctx.strokeRect(16, 16, w - 32, h - 32);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.strokeRect(34, 34, w - 68, h - 68);

    [0.14, 0.25, 0.35, 0.44].forEach((r, idx) => {
      ctx.beginPath();
      ctx.arc(cx, cy, w * r, 0, Math.PI * 2);
      ctx.strokeStyle = idx % 2 === 0 ? 'rgba(250, 204, 21, 0.75)' : 'rgba(56, 189, 248, 0.58)';
      ctx.lineWidth = idx === 0 ? 7 : 4;
      ctx.stroke();
    });

    ctx.fillStyle = 'rgba(250, 204, 21, 0.82)';
    ctx.beginPath();
    const spikes = 14;
    for (let i = 0; i < spikes * 2; i++) {
      const rad = i % 2 === 0 ? w * 0.13 : w * 0.055;
      const ang = (i / (spikes * 2)) * Math.PI * 2;
      const px = cx + Math.cos(ang) * rad;
      const py = cy + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  });

  const customFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    new THREE.MeshBasicMaterial({ map: grandFloorTex, side: THREE.FrontSide, depthWrite: true, fog: false })
  );
  customFloor.rotation.x = -Math.PI / 2;
  customFloor.position.set(0, 0.02, ROOM_CENTER_Z);
  interiorGroup.add(customFloor);

  // A5. BỆ TƯỢNG ĐỐI ĐẦU SƠN TINH (.GLB) & THỦY TINH (.GLB) Ở HẬU CẢNH PHÒNG TRƯNG BÀY
  // 1) Bệ Tượng Sơn Tinh (Bên Trái Hậu Cảnh: X = -4.2m, Z = -6.4m, cao hơn Thủy Tinh)
  const stRoomPedestal = new THREE.Group();
  stRoomPedestal.position.set(-4.2, 0, -6.4);
  interiorGroup.add(stRoomPedestal);

  const stMandala = createDetailedMandalaFloorDecal('sonTinhThuyTinh', 2.3);
  stMandala.position.y = 0.03;
  stRoomPedestal.add(stMandala);

  const stPedBase = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 2.0, 1.05, 20), jadeMat);
  stPedBase.position.y = 0.525;
  const stPedRim = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.1, 20), goldMat);
  stPedRim.position.y = 1.08;
  const stGodRay = createVolumetricLightBeam(0.6, 1.8, 7.2, 0xfacc15, 0.25);
  stGodRay.position.y = 4.5;
  const stPlaque = createRelicPlaque('TẢN VIÊN SƠN THÁNH', 'Chúa Miền Non Cao • Dời Đồi Nâng Núi', '#10b981');
  stPlaque.position.set(0, 0.68, 1.85);
  stRoomPedestal.add(stPedBase, stPedRim, stGodRay, stPlaque);

  const stRoomHolder = new THREE.Group();
  stRoomHolder.position.set(0, 1.12, 0);
  stRoomPedestal.add(stRoomHolder);

  // 2) Bệ Tượng Thủy Tinh (Bên Phải Hậu Cảnh: X = +4.2m, Z = -6.4m, thấp hơn Sơn Tinh)
  const ttRoomPedestal = new THREE.Group();
  ttRoomPedestal.position.set(4.2, 0, -6.4);
  interiorGroup.add(ttRoomPedestal);

  const ttMandala = createDetailedMandalaFloorDecal('sonTinhThuyTinh', 2.3);
  ttMandala.position.y = 0.03;
  ttRoomPedestal.add(ttMandala);

  const ttPedBase = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 2.0, 0.68, 20), oceanMat);
  ttPedBase.position.y = 0.34;
  const ttPedRim = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.75, 0.1, 20), goldMat);
  ttPedRim.position.y = 0.72;
  const ttGodRay = createVolumetricLightBeam(0.6, 1.8, 7.2, 0x38bdf8, 0.25);
  ttGodRay.position.y = 4.3;
  const ttPlaque = createRelicPlaque('ĐÔNG HẢI THỦY THẦN', 'Chúa Vùng Nước Thẳm • Dâng Sóng Phong Châu', '#38bdf8');
  ttPlaque.position.set(0, 0.52, 1.85);
  ttRoomPedestal.add(ttPedBase, ttPedRim, ttGodRay, ttPlaque);

  const ttRoomHolder = new THREE.Group();
  ttRoomHolder.position.set(0, 0.76, 0);
  ttRoomPedestal.add(ttRoomHolder);

  // Vòm Xung Đột Sét Vàng - Lam nối giữa 2 tượng trong phòng
  const clashArcRoom = new THREE.Mesh(
    new THREE.TorusGeometry(4.2, 0.05, 10, 40, Math.PI),
    new THREE.MeshBasicMaterial({ color: 0xfacc15, fog: false })
  );
  clashArcRoom.position.set(0, 1.2, -6.4);
  interiorGroup.add(clashArcRoom);

  // Đăng ký thẻ thơ tương tác & Âm thanh không gian 3D cho tượng Sơn Tinh & Thủy Tinh
  if (typeof window !== 'undefined') {
    window.__loreGuide?.registerArtifact(stRoomPedestal, 'sonTinh_tanVien');
    window.__spatialAudio?.attachPositionalSound('sonTinh_tanVien', stRoomPedestal, {
      fallbackTheme: 'sonTinhThuyTinh',
      refDistance: 8,
      maxDistance: 45
    });
    window.__loreGuide?.registerArtifact(ttRoomPedestal, 'sonTinh_thuyTinh');
  }

  // A6. BỤC SÁCH CỔ DỊCH CHUYỂN TRUNG TÂM (Nạp Án Thư Gỗ Cổ .GLB thật từ web, thay thế Cylinder)
  const bookAltar = new THREE.Group();
  bookAltar.name = 'Interactive_SonTinh_Teleport_Book';
  bookAltar.position.set(0, 0, 0.8);
  bookAltar.userData.isTeleportBook = true;
  bookAltar.userData.targetRealm = 'SON_TINH_THUY_TINH_REALM';
  interiorGroup.add(bookAltar);

  // NẠP MÔ HÌNH ÁN THƯ GỖ .GLB CHUẨN CAO 1.15m (fitAxis: 'y')
  if (gltfLoader) {
    loadGlbWithFallback(
      gltfLoader,
      ['/model/an_thu_go.glb', '/models/an_thu_go.glb', '/model/polyhaven/an_thu_go_co/an_thu_go_co_1k.gltf'],
      (rawScene) => {
        const table = prepareUnlitVividGlbModel(rawScene, {
          targetSpan: 1.15,
          fitAxis: 'y',
          groundY: true,
          color: 0x54260f,
          castShadow: false,
          receiveShadow: false
        });
        table.position.set(0, 0, 0);
        bookAltar.add(table);
      }
    );
  } else {
    const step1 = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.7, 0.28, 16), woodMat);
    step1.position.y = 0.14;
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.12, 0.95, 16), bronzeMat);
    pedestal.position.y = 0.75;
    bookAltar.add(step1, pedestal);
  }

  const bookMeshGroup = new THREE.Group();
  bookMeshGroup.position.set(0, 1.25, 0);
  bookMeshGroup.rotation.x = 0.38;
  bookMeshGroup.userData.isTeleportBook = true;

  const pageMat = new THREE.MeshLambertMaterial({ color: 0xfff3d1, emissive: 0x4a3510 });
  const pageLeft = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.06, 0.96), pageMat);
  pageLeft.position.x = -0.35;
  pageLeft.rotation.z = -0.15;
  const pageRight = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.06, 0.96), pageMat);
  pageRight.position.x = 0.35;
  pageRight.rotation.z = 0.15;
  const bookSpine = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 1.0), goldMat);
  bookMeshGroup.add(pageLeft, pageRight, bookSpine);

  bookAltar.add(bookMeshGroup);
  interactiveTargets.push(pageLeft, pageRight, bookSpine);

  // Cập nhật ma trận thế giới & Bọc Tight Click Hitbox cho Cuốn Sách Dịch Chuyển (padding: 0.12)
  bookMeshGroup.userData.isSonTinhTeleportBook = true;
  pageLeft.userData.isSonTinhTeleportBook = true;
  pageRight.userData.isSonTinhTeleportBook = true;
  bookSpine.userData.isSonTinhTeleportBook = true;
  bookMeshGroup.updateMatrixWorld(true);
  let bookHitbox = null;
  if (typeof window !== 'undefined' && window.__museumHitboxManager) {
    bookHitbox = window.__museumHitboxManager.createTightClickHitbox(bookMeshGroup, {
      loreKey: 'son_tinh_thuy_tinh',
      isBookPortal: true,
      portalTargetRealm: 'SON_TINH_THUY_TINH_REALM',
      padding: 0.12
    });
    if (bookHitbox) {
      bookHitbox.userData.isSonTinhTeleportBook = true;
      bookHitbox.userData.isBookPortal = true;
      bookHitbox.userData.isTeleportBook = true;
      interactiveTargets.push(bookHitbox);
    }
  }

  const centerBookRay = createVolumetricLightBeam(0.8, 2.4, 8.2, 0xfde047, 0.24);
  centerBookRay.position.set(0, 4.1, 0.8);
  interiorGroup.add(centerBookRay);

  const promptBanner = createGiantVoidHologram({
    headerTag: 'CỔNG DỊCH CHUYỂN ĐẠI CẢNH',
    title: '📖 CLICK VÀO SÁCH ĐỂ VÀO ĐẠI HỒNG THỦY',
    author: 'Thần Thoại Sơn Tinh - Thủy Tinh',
    year: 'Cutscene hút vào trang sách • Nhấn [ESC] để thoát ra',
    bullets: [
      'Chiêm ngưỡng Sơn Tinh trên đỉnh Tản Viên đối đầu trực diện Thủy Tinh dâng sóng thần.',
      'Từng đợt sóng Đại Hồng Thủy đánh thẳng vào vách núi tung bọt trắng xóa.'
    ],
    accentColor: '#facc15',
    secondaryColor: '#38bdf8',
    width: 4.1,
    height: 2.1
  });
  promptBanner.position.set(0, 3.45, 0);
  bookAltar.add(promptBanner);

  // A7. 4 BỆ HIỆN VẬT SÍNH LỄ (Nạp Bệ Đá Cổ .GLB từ web thay thế CylinderGeometry)
  const relicMats = { goldMat, ivoryMat, crimsonMat, jadeMat, oceanMat, bronzeMat };
  const relicDefinitions = [
    { pos: new THREE.Vector3(-6.6, 0, -1.8), type: 'VOI_CHIN_NGA', title: 'VOI CHÍN NGÀ', subtitle: 'Sính lễ Linh Thú Sơn Lâm', accent: '#facc15', ray: 0xfacc15 },
    { pos: new THREE.Vector3(-6.4, 0, 3.2), type: 'GA_CHIN_CUA', title: 'GÀ CHÍN CỰA', subtitle: 'Sính lễ Bình Minh Phong Châu', accent: '#ef4444', ray: 0xf97316 },
    { pos: new THREE.Vector3(6.6, 0, -1.8), type: 'NGUA_CHIN_HONG_MAO', title: 'NGỰA CHÍN HỒNG MAO', subtitle: 'Sính lễ Tuấn Mã Tản Viên', accent: '#fb923c', ray: 0x10b981 },
    { pos: new THREE.Vector3(6.4, 0, 3.2), type: 'TRONG_DONG_THUY_TOC', title: 'TRỐNG ĐỒNG & NGỌC THỦY TỘC', subtitle: 'Biểu tượng Quyền Uy Núi - Biển', accent: '#38bdf8', ray: 0x38bdf8 }
  ];

  const rotatingRelicModels = [];
  relicDefinitions.forEach((def, idx) => {
    const modelHolder = createSignatureRelicModel(def.type, relicMats, gltfLoader);
    modelHolder.position.y = 1.25;
    modelHolder.scale.setScalar(1.22);

    if (def.type === 'VOI_CHIN_NGA' || def.type === 'GA_CHIN_CUA') {
      // Bố trí Cụm Trưng Bày Hoa Sen Chuẩn Bảo Tàng cho Sính Lễ Tản Viên
      const curatedStation = createCuratedArtifactStation({
        artifactMesh: modelHolder,
        loreKey: 'sonTinh_tanVien',
        stationTitle: def.title,
        stationSubtitle: def.subtitle,
        position: def.pos,
        accentColor: 0xfacc15,
        loreGuideInstance: typeof window !== 'undefined' ? window.__loreGuide : null,
        audioDirectorInstance: typeof window !== 'undefined' ? window.__spatialAudio : null
      });
      rotatingRelicModels.push({ mesh: modelHolder, baseY: 1.25, phase: idx * 1.5 });
      interiorGroup.add(curatedStation);
      return;
    } else if (def.type === 'TRONG_DONG_THUY_TOC') {
      // Bố trí Cụm Trưng Bày Hoa Sen Chuẩn Bảo Tàng cho Sính Lễ Thủy Tộc
      const curatedStation = createCuratedArtifactStation({
        artifactMesh: modelHolder,
        loreKey: 'sonTinh_thuyTinh',
        stationTitle: def.title,
        stationSubtitle: def.subtitle,
        position: def.pos,
        accentColor: 0x38bdf8,
        loreGuideInstance: typeof window !== 'undefined' ? window.__loreGuide : null,
        audioDirectorInstance: typeof window !== 'undefined' ? window.__spatialAudio : null
      });
      rotatingRelicModels.push({ mesh: modelHolder, baseY: 1.25, phase: idx * 1.5 });
      interiorGroup.add(curatedStation);
      return;
    }

    const pedGroup = new THREE.Group();
    pedGroup.position.copy(def.pos);

    // NẠP BỆ ĐÁ CỔ .GLB (be_da_co.glb) CHUẨN 1.15m CHO TỪNG BỆ HIỆN VẬT
    if (gltfLoader) {
      loadGlbWithFallback(
        gltfLoader,
        ['/model/be_da_co.glb', '/models/be_da_co.glb'],
        (rawScene) => {
          const stonePed = prepareUnlitVividGlbModel(rawScene.clone(true), {
            targetSpan: 1.15,
            fitAxis: 'y',
            groundY: true,
            color: 0x473e35,
            castShadow: false,
            receiveShadow: false
          });
          stonePed.position.set(0, 0, 0);
          pedGroup.add(stonePed);
        }
      );
    } else {
      const baseStep = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.25, 14), woodMat);
      baseStep.position.y = 0.125;
      const pedBody = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.0, 1.0, 14), bronzeMat);
      pedBody.position.y = 0.72;
      pedGroup.add(baseStep, pedBody);
    }

    const relicRay = createVolumetricLightBeam(0.38, 1.2, 6.4, def.ray, 0.18);
    relicRay.position.y = 4.2;
    const plaque = createRelicPlaque(def.title, def.subtitle, def.accent);
    plaque.position.set(0, 0.68, 1.08);

    pedGroup.add(relicRay, plaque, modelHolder);
    rotatingRelicModels.push({ mesh: modelHolder, baseY: 1.25, phase: idx * 1.5 });
    interiorGroup.add(pedGroup);
  });

  // =========================================================================
  // PHẦN B: ĐẠI CẢNH ĐẠI HỒNG THỦY & ĐẠI SƠN MẠCH TẢN VIÊN (Y = 420m)
  // - Đã bỏ Thủy Quái, Lốc Xoáy và lưới Wireframe mặt biển
  // - Sơn Tinh đứng trên đỉnh núi cao (-X), Thủy Tinh đứng ở dưới thấp hơn (+X)
  // - Cả hai quay mặt đối đầu trực diện, các đợt sóng thần đánh thẳng vào vách núi
    // =========================================================================
  // THẾ GIỚI SƠN TINH - THỦY TINH ĐỘC LẬP (TÁCH BIỆT KHỎI BẢO TÀNG TẠI 5000, 0, 5000)
  // - Áp dụng: ornamental-relief-sculptor, pixel-retro-vfx, water-mountain-vfx-sculptor, hitbox-collision-architect
  // - Đã xóa bỏ hoàn toàn nensontinhthuytinhglb.glb và các chóp núi đen lỗi
  // - Sơn Tinh (-38, 42m) & Thủy Tinh (+38, 18.5m) đối đầu trực diện 76m
  // - Bục đứng hoa sen tại (0, 22.5, 28) có sàn cứng Hitbox không bị rơi xuống biển
  // =========================================================================
  const battleRealm = new THREE.Group();
  battleRealm.name = 'STTT_Colossal_Cataclysm_Realm_V6';
  battleRealm.position.copy(SON_TINH_REALM_OFFSET);
  battleRealm.visible = false;

  // Đưa thẳng battleRealm vào Scene độc lập sonTinhThuyTinhScene (Tách biệt 100% bảo tàng)
  if (_battleScene) {
    _battleScene.add(battleRealm);
  } else if (typeof window !== 'undefined' && window.__sonTinhThuyTinhScene) {
    window.__sonTinhThuyTinhScene.add(battleRealm);
  } else {
    root.add(battleRealm);
  }

  // KHỞI TẠO ĐẠI CẢNH SƠN TINH - THỦY TINH MASTER VFX
  // Tạo: 5 Đỉnh núi Tản Viên chạm nổi Sobel 3D, 18 tảng đá thần lực bay, Mặt biển Shader Bayer 4x4, Tường sóng thần và Đài Quan Sát Hoa Sen
  const hitboxMgr = typeof window !== 'undefined' ? (window.__museumHitboxManager || window.__hitboxManager) : null;
  const {
    roomGroup: masterVfxGroup,
    updateRealm: updateMasterVfx,
    deckGroup: mythicDeckGroup
  } = buildSonTinhThuyTinhMasterVfx(battleRealm, {
    hitboxManager: hitboxMgr,
    moveRealmToSeparateOffset: true
  });

  // 1. HỆ THỐNG ÁNH SÁNG ĐẠI CHIẾN
  const realmHemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 1.85);
  realmHemiLight.position.set(0, 120, 0);
  battleRealm.add(realmHemiLight);

  const mountainSunLight = new THREE.PointLight(0xfde047, 4.2, 140, 1.1);
  mountainSunLight.position.set(-32, 65, -26);
  mountainSunLight.castShadow = false;
  battleRealm.add(mountainSunLight);

  const tsunamiStormLight = new THREE.PointLight(0x38bdf8, 4.5, 140, 1.1);
  tsunamiStormLight.position.set(50, 55, -26);
  tsunamiStormLight.castShadow = false;
  battleRealm.add(tsunamiStormLight);

  const clashCenterLight = new THREE.PointLight(0xffffff, 3.8, 95, 1.2);
  clashCenterLight.position.set(0, 28, -16);
  clashCenterLight.castShadow = false;
  battleRealm.add(clashCenterLight);

  // 2. VỊ TRÍ SƠN TINH NGỰ TRÊN ĐỈNH NÚI TẢN VIÊN (Cực Tây: X = -38, Y = 42m, Z = -16)
  const sonTinhHolder = new THREE.Group();
  sonTinhHolder.name = 'SonTinh_Mythic_Hero_Holder';
  sonTinhHolder.userData = { preserve: true, isHeroHolder: true };
  sonTinhHolder.position.set(-38.0, 0.0, -16.0);
  battleRealm.add(sonTinhHolder);

  const sonTinhModelRotator = new THREE.Group();
  sonTinhModelRotator.name = 'SonTinh_Model_Rotator';
  sonTinhModelRotator.userData = { preserve: true };
  sonTinhModelRotator.position.set(0, 42.0, 0); // Đỉnh chính núi Tản Viên Y = 42.0m
  sonTinhHolder.add(sonTinhModelRotator);

  const sonTinhHalo = new THREE.Mesh(
    new THREE.RingGeometry(2.4, 5.2, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.88, side: THREE.DoubleSide, fog: false })
  );
  sonTinhHalo.position.set(0, 42.2, 0);
  sonTinhHolder.add(sonTinhHalo);

  // Hiển thị ngay lập tức Sơn Tinh (đảm bảo không bao giờ bị biến mất khỏi cõi thần thoại)
  const sonTinhInitialFigure = createProceduralSonTinhFigure();
  sonTinhInitialFigure.rotation.y = Math.PI * 0.5; // Sơn Tinh nhìn sang phải đối diện Thủy Tinh (+X)
  sonTinhModelRotator.add(sonTinhInitialFigure);

  // 3. VỊ TRÍ THỦY TINH NGỰ TRÊN ĐẦU SÓNG THẦN (Cực Đông: X = +38, Y = 18.5m, Z = -16)
  const thuyTinhHolder = new THREE.Group();
  thuyTinhHolder.name = 'ThuyTinh_Mythic_Hero_Holder';
  thuyTinhHolder.userData = { preserve: true, isHeroHolder: true };
  thuyTinhHolder.position.set(38.0, 0.0, -16.0);
  battleRealm.add(thuyTinhHolder);

  const thuyTinhModelRotator = new THREE.Group();
  thuyTinhModelRotator.name = 'ThuyTinh_Model_Rotator';
  thuyTinhModelRotator.userData = { preserve: true };
  thuyTinhModelRotator.position.set(0, 18.5, 0); // Đầu sóng thần Y = 18.5m
  thuyTinhHolder.add(thuyTinhModelRotator);

  const thuyTinhHalo = new THREE.Mesh(
    new THREE.RingGeometry(2.6, 5.8, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9, side: THREE.DoubleSide, fog: false })
  );
  thuyTinhHalo.position.set(0, 18.7, 0);
  thuyTinhHolder.add(thuyTinhHalo);

  // Hiển thị ngay lập tức Thủy Tinh (đảm bảo không bao giờ bị biến mất khỏi cõi thần thoại)
  const thuyTinhInitialFigure = createProceduralThuyTinhFigure();
  thuyTinhInitialFigure.rotation.y = -Math.PI * 0.5; // Thủy Tinh nhìn sang trái đối diện Sơn Tinh (-X)
  thuyTinhModelRotator.add(thuyTinhInitialFigure);

  // 4. NẠP MÔ HÌNH .GLB SƠN TINH & THỦY TINH VÀ XOAY ĐỐI ĐẦU NHAU 76M
  loadGlbWithFallback(
    gltfLoader,
    ['/model/sontinh.glb', '/models/sontinh.glb', './model/sontinh.glb', './models/sontinh.glb', '/model/SonTinh.glb', '/models/SonTinh.glb'],
    (rawScene) => {
      // Khi nạp xong .GLB, thay thế procedural figure bằng GLB chi tiết cao
      const oldFigure = sonTinhModelRotator.getObjectByName('Procedural_SonTinh_Hero');
      if (oldFigure) sonTinhModelRotator.remove(oldFigure);

      // Trong Thế Giới Thần Thoại: Sơn Tinh đứng trên đỉnh núi cao (Y = 42m), quay mặt +90 độ (+Math.PI / 2) nhìn sang phải đối diện Thủy Tinh
      const stHero = prepareUnlitVividGlbModel(rawScene.clone(true), {
        targetSpan: 17.5,
        fitAxis: 'y',
        color: 0xfef08a
      });
      stHero.name = 'SonTinh_Glb_Hero';
      stHero.rotation.y = Math.PI * 0.5; // SƠN TINH QUAY +90 ĐỘ ĐỐI MẶT THỦY TINH (+X)
      sonTinhModelRotator.add(stHero);

      // Trong Phòng Trưng Bày Bảo Tàng: Giữ nguyên tượng đồng Sơn Thánh
      const stRoomStatue = prepareUnlitVividGlbModel(rawScene.clone(true), {
        targetSpan: 3.5,
        fitAxis: 'y',
        color: 0xfbbf24
      });
      stRoomStatue.rotation.y = Math.PI * 0.42;
      stRoomHolder.add(stRoomStatue);

      stRoomStatue.updateMatrixWorld(true);
      if (typeof window !== 'undefined' && window.__museumHitboxManager) {
        window.__museumHitboxManager.createTightClickHitbox(stRoomStatue, {
          loreKey: 'son_tinh_hero',
          isBookPortal: false,
          padding: 0.12
        });
      }
    }
  );

  loadGlbWithFallback(
    gltfLoader,
    ['/model/thuytinh.glb', '/models/thuytinh.glb', './model/thuytinh.glb', './models/thuytinh.glb', '/model/ThuyTinh.glb', '/models/ThuyTinh.glb'],
    (rawScene) => {
      // Khi nạp xong .GLB, thay thế procedural figure bằng GLB chi tiết cao
      const oldFigure = thuyTinhModelRotator.getObjectByName('Procedural_ThuyTinh_Hero');
      if (oldFigure) thuyTinhModelRotator.remove(oldFigure);

      // Trong Thế Giới Thần Thoại: Thủy Tinh đứng ở dưới thấp (Y = 18.5m), quay mặt -90 độ (-Math.PI / 2) nhìn sang trái đối diện Sơn Tinh
      const ttHero = prepareUnlitVividGlbModel(rawScene.clone(true), {
        targetSpan: 16.5,
        fitAxis: 'y',
        color: 0x38bdf8
      });
      ttHero.name = 'ThuyTinh_Glb_Hero';
      ttHero.rotation.y = -Math.PI * 0.5; // THỦY TINH QUAY -90 ĐỘ ĐỐI MẶT SƠN TINH (-X)
      thuyTinhModelRotator.add(ttHero);

      // Trong Phòng Trưng Bày Bảo Tàng: Giữ nguyên tượng lưu ly Thủy Thần
      const ttRoomStatue = prepareUnlitVividGlbModel(rawScene.clone(true), {
        targetSpan: 3.4,
        fitAxis: 'y',
        color: 0x38bdf8
      });
      ttRoomStatue.rotation.y = -Math.PI * 0.42;
      ttRoomHolder.add(ttRoomStatue);

      ttRoomStatue.updateMatrixWorld(true);
      if (typeof window !== 'undefined' && window.__museumHitboxManager) {
        window.__museumHitboxManager.createTightClickHitbox(ttRoomStatue, {
          loreKey: 'thuy_tinh_hero',
          isBookPortal: false,
          padding: 0.12
        });
      }

      separateGodsAndCleanScene(battleRealm, sonTinhHolder, thuyTinhHolder);
    }
  );

  separateGodsAndCleanScene(battleRealm, sonTinhHolder, thuyTinhHolder);

  // 5. ĐÀI QUAN SÁT & 4 BẢNG THÔNG TIN KHỔNG LỒ (Đài hoa sen tại 0, 22.5, 28)
  const playerPlatform = new THREE.Group();
  playerPlatform.position.copy(STTT_OBS_PLATFORM_OFFSET);
  battleRealm.add(playerPlatform);

  const returnCrystalGroup = new THREE.Group();
  returnCrystalGroup.position.set(0, 1.25, 5.6);
  playerPlatform.add(returnCrystalGroup);

  const returnCrystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.62, 0),
    new THREE.MeshBasicMaterial({ color: 0xfacc15, fog: false })
  );
  returnCrystal.userData = { isSonTinhTeleportBook: true, isReturnPortal: true, action: 'RETURN_TO_MUSEUM' };
  returnCrystalGroup.add(returnCrystal);
  interactiveTargets.push(returnCrystal);

  const returnLabel = createGiantVoidHologram({
    headerTag: 'CỔNG TRỞ VỀ BẢO TÀNG',
    title: '↩ QUAY VỀ PHÒNG TRƯNG BÀY',
    author: 'Click vào tinh thể vàng hoặc nhấn phím [ESC]',
    year: 'Hiệu ứng bay ngược từ trang sách ra sảnh',
    bullets: ['Trở về không gian trưng bày Sơn Tinh - Thủy Tinh tại Bảo Tàng.'],
    accentColor: '#facc15',
    secondaryColor: '#38bdf8',
    width: 5.4,
    height: 2.5
  });
  returnLabel.position.set(0, 1.5, 0);
  returnLabel.rotation.y = Math.PI;
  returnLabel.userData = { isSonTinhTeleportBook: true, isReturnPortal: true, action: 'RETURN_TO_MUSEUM' };
  returnLabel.traverse((c) => {
    c.userData = { isSonTinhTeleportBook: true, isReturnPortal: true, action: 'RETURN_TO_MUSEUM' };
  });
  returnCrystalGroup.add(returnLabel);
  interactiveTargets.push(returnLabel);

  returnCrystalGroup.updateMatrixWorld(true);
  let returnCrystalHitbox = null;
  if (typeof window !== 'undefined' && window.__museumHitboxManager) {
    returnCrystalHitbox = window.__museumHitboxManager.createTightClickHitbox(returnCrystalGroup, {
      loreKey: 'son_tinh_return_portal',
      isReturnPortal: true,
      action: 'RETURN_TO_MUSEUM',
      padding: 0.35
    });
    if (returnCrystalHitbox) {
      returnCrystalHitbox.userData = { isSonTinhTeleportBook: true, isReturnPortal: true, action: 'RETURN_TO_MUSEUM' };
      interactiveTargets.push(returnCrystalHitbox);
    }
  }

  // 4 Bảng Thông Tin bao quanh bục đứng (áp sát quanh lan can, bán kính 9.8m - 10.2m)
  const giantHolograms = [
    {
      pos: new THREE.Vector3(-7.2, 2.3, -7.2),
      headerTag: 'THÔNG TIN TÁC PHẨM // ARCHIVE 01',
      title: 'SƠN TINH - THỦY TINH',
      author: 'Kho tàng Thần thoại & Truyền thuyết Dân gian Việt Nam',
      year: 'Thời đại Hùng Vương thứ XVIII (Nhà nước Văn Lang)',
      accentColor: '#38bdf8',
      secondaryColor: '#eab308',
      width: 5.8,
      height: 3.6,
      bullets: [
        'Văn bản tiêu biểu: Truyện Sơn Tinh - Thủy Tinh (Lĩnh Nam Chích Quái & Kho tàng Cổ tích).',
        'Thể loại: Thần thoại suy nguyên kết hợp Truyền thuyết anh hùng thời dựng nước.',
        'Bối cảnh: Kinh đô Phong Châu, đỉnh Tản Viên (Ba Vì) và lưu vực sông Hồng - Đông Hải.'
      ]
    },
    {
      pos: new THREE.Vector3(-9.8, 2.3, 0.0),
      headerTag: 'TÓM TẮT NỘI DUNG // ARCHIVE 02',
      title: 'CẦU HÔN MỴ NƯƠNG & LỄ VẬT TAM SINH',
      author: 'Vua Hùng Vương thứ XVIII • Công chúa Mỵ Nương',
      year: 'Sính lễ: Voi chín ngà • Gà chín cựa • Ngựa chín hồng mao',
      accentColor: '#34d399',
      secondaryColor: '#eab308',
      width: 5.8,
      height: 3.6,
      bullets: [
        'Vua Hùng thứ 18 kén rể cho công chúa Mỵ Nương; hai vị thần tài phép ngang nhau cùng đến.',
        'Sơn Tinh mang lễ vật đến trước, rước được Mỵ Nương về đỉnh núi Tản Viên.',
        'Thủy Tinh đến sau đùng đùng nổi giận, hô mưa gọi gió dâng Đại Hồng Thủy đuổi đánh.'
      ]
    },
    {
      pos: new THREE.Vector3(7.2, 2.3, -7.2),
      headerTag: 'ĐẠI CHIẾN TRỊ THỦY // ARCHIVE 03',
      title: 'NƯỚC DÂNG TỚI ĐÂU - NÚI CAO TỚI ĐÓ',
      author: 'Cuộc Đọ Sức Giữa Chúa Miền Non Cao & Chúa Vùng Nước Thẳm',
      year: 'Biểu tượng: Sức mạnh Chế ngự Thiên nhiên',
      accentColor: '#f87171',
      secondaryColor: '#eab308',
      width: 5.8,
      height: 3.6,
      bullets: [
        'Thủy Tinh gọi vòi rồng, sóng thần cao hàng chục trượng cùng thủy quái ngập trắng Phong Châu.',
        'Sơn Tinh dùng phép lạ bốc từng quả đồi, dời từng dãy núi chặn đứng dòng đại hồng thủy.',
        'Sóng thần dâng cao bao nhiêu, dãy núi Tản Viên vươn cao sừng sững lên bấy nhiêu.'
      ]
    },
    {
      pos: new THREE.Vector3(9.8, 2.3, 0.0),
      headerTag: 'GIÁ TRỊ LỊCH SỬ // ARCHIVE 04',
      title: 'BẢN ANH HÙNG CA ĐẮP ĐÊ CHỐNG LỤT',
      author: 'Tản Viên Sơn Thánh - Đứng đầu Tứ Bất Tử Việt Nam',
      year: 'Di sản Văn hóa Dân gian Ngàn năm',
      accentColor: '#eab308',
      secondaryColor: '#38bdf8',
      width: 5.8,
      height: 3.6,
      bullets: [
        'Phản ánh quy luật bão lũ sông Hồng và ca ngợi ý chí đắp đê trị thủy kiên cường của người Việt cổ.',
        'Tôn vinh Sơn Tinh trở thành vị thánh đứng đầu Tứ Bất Tử trong tâm thức dân tộc.'
      ]
    }
  ];

  const platCenter = new THREE.Vector3(0, 2.3, 0);
  giantHolograms.forEach((cfg) => {
    const holoPanel = createGiantVoidHologram(cfg);
    holoPanel.position.copy(cfg.pos);
    holoPanel.lookAt(platCenter); // Quay mặt vào tâm bục đứng
    playerPlatform.add(holoPanel); // Gắn trực tiếp bao quanh bục đứng
  });

  // =========================================================================
  // 6. VÒNG LẶP ANIMATION: ĐỐI ĐẦU TRỰC DIỆN & CẬP NHẬT MASTER VFX
  // =========================================================================
  let clockTime = 0;

  function stepAnimation(dt = 0.016) {
    clockTime += dt;

    // 1. Animation trong Phòng Trưng Bày Bảo Tàng
    bookMeshGroup.position.y = 1.78 + Math.sin(clockTime * 2.2) * 0.06;
    returnCrystal.rotation.y += dt * 1.5;

    rotatingRelicModels.forEach((item) => {
      item.mesh.rotation.y += dt * 0.75;
      item.mesh.position.y = item.baseY + Math.sin(clockTime * 2.0 + item.phase) * 0.05;
    });

    bronzeLanterns.forEach((bl) => {
      bl.group.position.y = 6.8 + Math.sin(clockTime * 2.0 + bl.phase) * 0.08;
    });

    stRoomHolder.position.y = 1.12 + Math.sin(clockTime * 1.8) * 0.04;
    ttRoomHolder.position.y = 0.76 + Math.sin(clockTime * 2.0 + 1.2) * 0.04;

    // 2. Animation Thế Giới Thần Thoại: Cập nhật Master VFX (Shader Biển Bayer 4x4, Đá thần, Hào quang & Sấm sét)
    updateMasterVfx?.(clockTime);

    // Sơn Tinh (trên đỉnh núi cao Y = 42m) & Thủy Tinh (dưới sóng thấp Y = 18.5m) luôn nhìn thẳng đối đầu nhau
    sonTinhHolder.position.y = Math.sin(clockTime * 1.8) * 0.35;
    sonTinhModelRotator.rotation.z = -0.06 + Math.sin(clockTime * 1.5) * 0.03;

    thuyTinhHolder.position.y = Math.sin(clockTime * 2.2 + 1.0) * 0.65;
    thuyTinhModelRotator.rotation.z = 0.08 + Math.cos(clockTime * 1.7) * 0.04;

    sonTinhHalo.rotation.z += dt * 0.45;
    thuyTinhHalo.rotation.z -= dt * 0.65;
  }

  // =========================================================================
  // 7. CHUYỂN DỊCH KHÔNG GIAN BẢO TÀNG <---> THẾ GIỚI THẦN THOẠI
  // =========================================================================
  // Đã khai báo ở đầu hàm: savedReturnPosition, _isInsideRealm, _isTransitioning, _savedFog, _savedBackground

  const findActiveCameraAndPlayer = () => {
    const app = typeof window !== 'undefined' ? (window.__app || window.__cathedralApp) : null;
    const cam = _cameraManager?.camera || app?.camera || (typeof window !== 'undefined' ? window.__camera : null);
    const player = app?.player || app?.controls?.getObject?.() || null;
    return { cam, player };
  };

  const realmWorldCamPos = new THREE.Vector3(5000, 37.7, 5088.0);
  const realmWorldLookTarget = new THREE.Vector3(5000, 24.0, 4984.0);

  const localReturnOffset = new THREE.Vector3(0, 1.8, 5.2).applyAxisAngle(
    new THREE.Vector3(0, 1, 0),
    interiorGroup.rotation.y
  );
  const defaultMuseumReturnPos = roomCenter.clone().add(localReturnOffset);
  const museumBookTarget = new THREE.Vector3(roomCenter.x, roomCenter.y + 1.8, roomCenter.z);

  function createOrGetRealmTopHUD() {
    if (typeof document === 'undefined') return null;
    let hud = document.getElementById('sttt-realm-top-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'sttt-realm-top-hud';
      hud.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        display: none; align-items: center; gap: 18px;
        background: rgba(6, 20, 38, 0.92); border: 2px solid #facc15;
        padding: 10px 24px; border-radius: 30px; z-index: 99999;
        box-shadow: 0 0 25px rgba(56, 189, 248, 0.5); backdrop-filter: blur(8px);
        font-family: 'Segoe UI', sans-serif;
      `;
      hud.innerHTML = `
        <span style="color: #fde047; font-weight: bold; font-size: 15px; letter-spacing: 1px;">⚡ ĐẠI CẢNH: SƠN TINH DỜI NON ĐỐI ĐẦU ĐẠI HỒNG THỦY THỦY TINH 🌊</span>
        <button id="sttt-btn-exit-realm" style="
          background: linear-gradient(135deg, #0284c7, #1e3a8a);
          color: #ffffff; border: 1px solid #fde047; padding: 6px 16px;
          border-radius: 20px; font-weight: bold; font-size: 13px; cursor: pointer;
        ">↩ QUAY VỀ BẢO TÀNG (Nhấn phím ESC)</button>
      `;
      document.body.appendChild(hud);
      document.getElementById('sttt-btn-exit-realm')?.addEventListener('click', (e) => {
        e.stopPropagation();
        teleportBackToMuseum();
      });
    }
    return hud;
  }

  const applyEnterRealmState = () => {
    const { cam, player } = findActiveCameraAndPlayer();
    _isInsideRealm = true;
    if (typeof window !== 'undefined') window.__stttRealmActive = true;

    // ẨN TOÀN BỘ KHÔNG GIAN BẢO TÀNG (museumGroup.visible = false / mainScene.visible = false)
    if (typeof window !== 'undefined') {
      if (window.__mainScene) window.__mainScene.visible = false;
      if (window.__scene) window.__scene.visible = false;
    }
    roomGroup.visible = false;
    battleRealm.visible = true;

    // CHUYỂN HOÁN SCENE: Đưa Scene Cõi Sơn Tinh - Thủy Tinh lên Active Scene (tách biệt 100% bảo tàng)
    const targetScene = _battleScene || (typeof window !== 'undefined' ? window.__sonTinhThuyTinhScene : null);
    if (typeof window !== 'undefined' && window.__app?.setActiveScene && targetScene) {
      window.__app.setActiveScene(targetScene);
    }

    if (targetScene) {
      targetScene.fog = new THREE.FogExp2(0x0c1e33, 0.002);
      targetScene.background = new THREE.Color(0x050b14);
    }

    if (_scene) {
      _savedFog = _scene.fog;
      _savedBackground = _scene.background;
    }

    if (typeof window !== 'undefined') {
      window.__spatialAudio?.playRealmSoundscape('sonTinh_tanVien');
    }

    // Thiết lập sàn cứng Hitbox cho CameraController trên Đài Quan Sát Hoa Sen
    if (_cameraManager?.cameraController) {
      _cameraManager.cameraController.setFloorHeightProvider?.(() => 36.0);
      _cameraManager.cameraController.floorHeightProvider = () => 36.0;
      _cameraManager.cameraController.velocity?.set?.(0, 0, 0);
      _cameraManager.cameraController.isEnabled = true;
    }

    if (cam) {
      cam.position.copy(realmWorldCamPos);
      cam.lookAt(realmWorldLookTarget);
    }
    if (player && player.position) {
      player.position.copy(realmWorldCamPos);
    }
    if (_cameraManager?.controls) {
      _cameraManager.controls.target.copy(realmWorldLookTarget);
      _cameraManager.controls.update();
      _cameraManager.controls.enabled = true;
    }

    const hud = createOrGetRealmTopHUD();
    if (hud) hud.style.display = 'flex';
    _isTransitioning = false;
  };

  const teleportToBattleRealm = (scene = null) => {
    if (scene && scene.isScene) {
      _battleScene = scene;
      if (battleRealm.parent !== _battleScene) {
        battleRealm.parent?.remove?.(battleRealm);
        _battleScene.add(battleRealm);
      }
    }
    if (_isInsideRealm || _isTransitioning) return;
    _isTransitioning = true;

    const { cam } = findActiveCameraAndPlayer();
    if (cam) savedReturnPosition.copy(cam.position);

    if (_cameraManager?.controls) _cameraManager.controls.enabled = false;
    if (_cameraManager?.cameraController) _cameraManager.cameraController.isEnabled = false;

    if (typeof VortexCutscene.playBookSuckInCutscene === 'function' && cam) {
      VortexCutscene.playBookSuckInCutscene({
        camera: cam,
        bookObject: bookMeshGroup,
        themeColorHex: '#38bdf8',
        onComplete: applyEnterRealmState
      });
    } else {
      applyEnterRealmState();
    }
  };

  const teleportBackToMuseum = () => {
    if (!_isInsideRealm || _isTransitioning) return;
    _isTransitioning = true;

    const { cam, player } = findActiveCameraAndPlayer();
    const distToCenter = savedReturnPosition.distanceTo(roomCenter);
    const returnPos = (savedReturnPosition.lengthSq() > 0 && distToCenter >= 5.0) ? savedReturnPosition : defaultMuseumReturnPos;

    const hud = createOrGetRealmTopHUD();
    if (hud) hud.style.display = 'none';

    const restoreMuseumScene = () => {
      _isInsideRealm = false;
      if (typeof window !== 'undefined') window.__stttRealmActive = false;

      // ẨN THẾ GIỚI THẦN THOẠI & HIỆN LẠI HOÀN TOÀN KHÔNG GIAN BẢO TÀNG
      battleRealm.visible = false;
      if (typeof window !== 'undefined') {
        if (window.__mainScene) window.__mainScene.visible = true;
        if (window.__scene) window.__scene.visible = true;
      }
      roomGroup.visible = true;
      roomGroup.updateMatrixWorld(true);

      // CHUYỂN HOÀN SCENE: Đưa Sảnh Bảo Tàng (mainScene) về Active Scene
      if (typeof window !== 'undefined' && window.__app?.setActiveScene && window.__app.mainScene) {
        window.__app.setActiveScene(window.__app.mainScene);
      }

      if (typeof window !== 'undefined') {
        window.__spatialAudio?.stopAllSounds();
      }

      if (_scene) {
        _scene.fog = _savedFog || new THREE.FogExp2(0xdca878, 0.00075);
        _scene.background = _savedBackground || new THREE.Color(0xdca878);
      }

      if (_cameraManager?.cameraController) {
        _cameraManager.cameraController.setFloorHeightProvider?.(null);
        _cameraManager.cameraController.floorHeightProvider = null;
        _cameraManager.cameraController.velocity?.set?.(0, 0, 0);
      }
    };

    const finishReturn = () => {
      if (cam) {
        cam.position.copy(returnPos);
        cam.lookAt(museumBookTarget);
      }
      if (player && player.position) {
        player.position.copy(returnPos);
      }
      if (_cameraManager?.controls) {
        _cameraManager.controls.target.copy(museumBookTarget);
        _cameraManager.controls.update();
        _cameraManager.controls.enabled = true;
      }
      if (_cameraManager?.cameraController) {
        _cameraManager.cameraController.isEnabled = true;
      }
      _isTransitioning = false;
    };

    restoreMuseumScene();
    if (typeof VortexCutscene.playBookSuckInCutscene === 'function' && cam) {
      VortexCutscene.playBookSuckInCutscene({
        camera: cam,
        bookObject: bookMeshGroup,
        themeColorHex: '#facc15',
        reverse: true,
        onComplete: finishReturn
      });
    } else {
      finishReturn();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && _isInsideRealm && !_isTransitioning) {
      teleportBackToMuseum();
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeyDown);
  }

  const clickRaycaster = new THREE.Raycaster();
  const clickMouse = new THREE.Vector2();
  const getPointerDownTargets = () => {
    const list = [returnCrystal, returnLabel, bookMeshGroup, pageLeft, pageRight, bookSpine];
    if (bookHitbox) list.push(bookHitbox);
    if (returnCrystalHitbox) list.push(returnCrystalHitbox);
    return list;
  };
  const onPointerDown = (event) => {
    if (_isTransitioning) return;
    if (event.target && event.target.closest && (
      event.target.closest('#sttt-realm-top-hud') ||
      event.target.closest('#adv-realm-top-hud') ||
      event.target.closest('#director-hud')
    )) {
      return;
    }
    const { cam } = findActiveCameraAndPlayer();
    if (!cam) return;
    if (document.pointerLockElement) {
      clickMouse.set(0, 0);
    } else if (event.clientX !== undefined && event.clientY !== undefined) {
      clickMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      clickMouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    } else {
      return;
    }
    clickRaycaster.setFromCamera(clickMouse, cam);
    const targets = getPointerDownTargets();
    const hits = clickRaycaster.intersectObjects(targets, true);
    if (!hits.length) return;
    let curr = hits[0].object;
    let isReturn = false;
    let isTeleport = false;
    while (curr) {
      if (curr.userData?.action === 'RETURN_TO_MUSEUM' || curr.userData?.isReturnPortal || curr === returnCrystal) {
        isReturn = true;
        break;
      }
      if (
        curr.userData?.isSonTinhTeleportBook ||
        curr.userData?.isBookPortal ||
        curr.userData?.isTeleportBook ||
        curr === bookMeshGroup ||
        curr === pageLeft ||
        curr === pageRight ||
        curr === bookSpine ||
        (bookHitbox && curr === bookHitbox)
      ) {
        isTeleport = true;
        break;
      }
      curr = curr.parent;
    }
    if (isReturn && _isInsideRealm) {
      teleportBackToMuseum();
    } else if (isTeleport && !_isInsideRealm) {
      teleportToBattleRealm();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', onPointerDown);
  }

  // Trả về đối tượng quản lý phòng triển lãm và cõi thần thoại
  root.userData = {
    roomGroup,
    battleRealm,
    stepAnimation,
    teleportToBattleRealm,
    teleportBackToMuseum,
    enterRealm: teleportToBattleRealm,
    exitRealm: teleportBackToMuseum,
    updateRealm: (dt, et, cam) => {
      stepAnimation(dt);
    },
    update: (dt, et, cam) => {
      stepAnimation(dt);
    },
    teleportBook: bookMeshGroup,
    interactiveTargets,
    dispose: () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('pointerdown', onPointerDown);
      }
      const hud = document.getElementById('sttt-realm-top-hud');
      hud?.remove();
      disposeSceneBranch(root);
      disposeSceneBranch(battleRealm);
    }
  };

  root.battleRealm = battleRealm;
  root.mythicWorldGroup = battleRealm;
  root.sonTinhHolder = sonTinhHolder;
  root.thuyTinhHolder = thuyTinhHolder;
  root.userData.battleRealm = battleRealm;
  root.userData.mythicWorldGroup = battleRealm;
  root.userData.sonTinhHolder = sonTinhHolder;
  root.userData.thuyTinhHolder = thuyTinhHolder;

  root.enterRealm = () => teleportToBattleRealm();
  root.exitRealm = () => teleportBackToMuseum();
  root.teleportBook = bookMeshGroup;
  root.updateRealm = (dt, et, cam) => stepAnimation(dt);
  root.update = (dt, et, cam) => stepAnimation(dt);
  root.setupContext = function({
    scene = null,
    battleScene = null,
    camera = null,
    renderer = null,
    cameraManager = null,
    portalInteraction = null
  } = {}) {
    if (scene) _scene = scene;
    if (camera) _camera = camera;
    if (renderer) _renderer = renderer;
    if (cameraManager) _cameraManager = cameraManager;
    if (battleScene) {
      _battleScene = battleScene;
      if (battleRealm.parent !== _battleScene) {
        battleRealm.parent?.remove?.(battleRealm);
        _battleScene.add(battleRealm);
      }
    }
    if (portalInteraction) {
      portalInteraction.registerInteractiveBook?.(bookAltar, defaultMuseumReturnPos, {
        id: 'son_tinh_thuy_tinh',
        targetRealm: 'SON_TINH_THUY_TINH_REALM',
        onActivate: () => teleportToBattleRealm()
      });
    }
  };

  return root;
}
