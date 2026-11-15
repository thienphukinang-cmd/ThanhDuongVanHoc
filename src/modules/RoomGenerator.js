import * as THREE from 'three';
import {
  LITERATURE_REGISTRY,
  ALCOVE_CENTERS,
  CUSTOM_ROOM_IDS,
  getRoomCode,
  getRoomWorldPose,
  localRoomToWorld
} from '../config/literatureRegistry.js';
import { registerInteractiveBook } from './PortalInteraction.js';
import {
  createAutoSynthesizedRoomPlaque,
  registerPlaqueWithSystems,
  syncPlaqueWorldMetadata
} from './roomInfoPlaque.js';
import { 
  getFakeShadowMaterial, 
  getFakeGlowSpriteMaterial, 
  getLightBeamMaterial, 
  getFloorLightPoolMaterial 
} from './proceduralMaterials.js';

/**
 * ROOM GENERATOR MODULE: KIẾN TRÚC TIỂU CẢNH VĂN HỌC (THEMATIC DIORAMA ENGINE)
 * Lead Architect & Art Director WebGL Specification
 * 
 * 1. Mở rộng diện tích bệ trưng bày thành đài tiểu cảnh quy mô lớn
 * 2. Phân hóa chất liệu sàn & banner trưng bày theo 3 tầng văn học:
 *    - TẦNG 1: Đất nung / Sỏi rêu cổ đại (Terracotta & Moss Stone)
 *    - TẦNG 2: Gỗ trắc cổ sơn mài Indochine (Antique Rosewood Parquet)
 *    - TẦNG 3: Nền gạch vỡ / Xi măng thời chiến (Fractured Vintage Brick)
 * 3. Đồng bộ tọa độ tuyệt đối qua LITERATURE_REGISTRY + ALCOVE_CENTERS (Single Source of Truth)
 * 4. Trang bị kiến trúc triển lãm đồng bộ cho 8 gian tiểu cảnh (bệ thảm, phướn trích dẫn CanvasTexture,
 *    4 trụ đèn lồng di sản, ghế băng ngắm hiện vật) bằng InstancedMesh tối ưu draw calls & hitbox chuẩn.
 */

export { ALCOVE_CENTERS, CUSTOM_ROOM_IDS };

function buildRoomLocalAABB(pose, lx, ly, lz, w, h, d, localRotY = 0) {
  const world = localRoomToWorld(pose, lx, ly, lz);
  const totalRot = (pose.rotY || 0) + localRotY;
  const c = Math.abs(Math.cos(totalRot));
  const s = Math.abs(Math.sin(totalRot));
  const halfX = (c * w + s * d) * 0.5;
  const halfZ = (s * w + c * d) * 0.5;
  return {
    box: new THREE.Box3(
      new THREE.Vector3(world.x - halfX, world.y, world.z - halfZ),
      new THREE.Vector3(world.x + halfX, world.y + h, world.z + halfZ)
    ),
    center: new THREE.Vector3(world.x, world.y + h * 0.5, world.z)
  };
}

function getEraBannerPalette(floor) {
  if (floor === 1) {
    return {
      bgTop: '#3b1e12',
      bgBottom: '#1c0e08',
      border: '#d99b38',
      accent: '#f5b041',
      textMain: '#fff4dc',
      textSub: '#e7c389',
      rugHex: 0x8f3f24,
      eraLabel: 'TẦNG 1 • VĂN HỌC DÂN GIAN & SỬ THI'
    };
  }
  if (floor === 2) {
    return {
      bgTop: '#3d1016',
      bgBottom: '#1b070a',
      border: '#e5bc55',
      accent: '#ffd86b',
      textMain: '#fff7e2',
      textSub: '#e9cc8a',
      rugHex: 0x7c1d24,
      eraLabel: 'TẦNG 2 • VĂN HỌC TRUNG ĐẠI'
    };
  }
  return {
    bgTop: '#1d2733',
    bgBottom: '#0e141c',
    border: '#d4a64a',
    accent: '#f2c15a',
    textMain: '#f5efe0',
    textSub: '#c5d1de',
    rugHex: 0x2c3e50,
    eraLabel: 'TẦNG 3 • VĂN HỌC CẬN – HIỆN ĐẠI'
  };
}

function drawBannerWorkMotif(ctx, itemId, cx, cy, r, palette) {
  ctx.save();
  ctx.translate(cx, cy);

  // Vòng tròn huy hiệu di sản
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, r - 4, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = palette.accent;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.arc(0, 0, r - 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = palette.accent;
  ctx.fillStyle = palette.accent;
  ctx.lineWidth = 3;

  if (itemId === 'su_tich_trau_cau') {
    // Thân cau vươn thẳng + lá trầu quấn + tảng đá vôi
    ctx.beginPath();
    ctx.moveTo(0, r * 0.56);
    ctx.lineTo(0, -r * 0.52);
    ctx.stroke();
    for (let k = -2; k <= 2; k++) {
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.52);
      ctx.quadraticCurveTo(k * 16, -r * 0.72, k * 24, -r * 0.38);
      ctx.stroke();
    }
    ctx.fillStyle = '#52b788';
    ctx.beginPath();
    ctx.ellipse(-18, 6, 16, 10, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d8d2c5';
    ctx.beginPath();
    ctx.arc(24, r * 0.42, 18, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
  } else if (itemId === 'de_dat_de_nuoc') {
    // Mặt trời trống đồng Đông Sơn & cây Chu Đồng
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 18, Math.sin(a) * 18);
      ctx.lineTo(Math.cos(a) * (r * 0.58), Math.sin(a) * (r * 0.58));
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fill();
  } else if (itemId === 'hich_tuong_si') {
    // Cọc Bạch Đằng & Khiên Đông A
    ctx.beginPath();
    ctx.arc(0, 4, r * 0.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-28, 42);
    ctx.lineTo(28, -44);
    ctx.moveTo(28, 42);
    ctx.lineTo(-28, -44);
    ctx.stroke();
  } else if (itemId === 'binh_ngo_dai_cao') {
    // Cuộn chiếu thư & bút lông đại nghĩa
    ctx.fillStyle = '#f6e6b4';
    ctx.fillRect(-38, -26, 76, 52);
    ctx.strokeRect(-38, -26, 76, 52);
    ctx.fillStyle = '#8c221b';
    ctx.fillRect(-44, -30, 8, 60);
    ctx.fillRect(36, -30, 8, 60);
    ctx.strokeStyle = '#6b3314';
    ctx.beginPath();
    ctx.moveTo(-22, -8);
    ctx.lineTo(22, -8);
    ctx.moveTo(-22, 8);
    ctx.lineTo(18, 8);
    ctx.stroke();
  } else if (itemId === 'nguoi_con_gai_nam_xuong') {
    // Đèn dầu cổ & sóng bến Hoàng Giang
    ctx.fillStyle = '#ffcf5c';
    ctx.beginPath();
    ctx.ellipse(0, -18, 10, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeRect(-14, 2, 28, 22);
    ctx.beginPath();
    ctx.moveTo(-46, 38);
    ctx.quadraticCurveTo(-20, 26, 0, 38);
    ctx.quadraticCurveTo(20, 50, 46, 38);
    ctx.stroke();
  } else if (itemId === 'so_do') {
    // Mũ phớt & vợt trào phúng thập niên 1930
    ctx.beginPath();
    ctx.ellipse(0, 12, 42, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillRect(-22, -24, 44, 34);
  } else if (itemId === 'day_thon_vi_da') {
    // Vầng trăng sông Hương & lá trúc thanh mảnh
    ctx.fillStyle = '#e8f8f5';
    ctx.beginPath();
    ctx.arc(10, -16, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#52d6b3';
    ctx.beginPath();
    ctx.moveTo(-42, 34);
    ctx.quadraticCurveTo(0, 44, 44, 28);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-36, -36);
    ctx.lineTo(-18, 12);
    ctx.stroke();
  } else {
    // Chí Phèo: Lò gạch cũ & vầng trăng làng Vũ Đại
    ctx.beginPath();
    ctx.arc(0, 30, 34, Math.PI, 0);
    ctx.lineTo(34, 40);
    ctx.lineTo(-34, 40);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = '#f5b041';
    ctx.beginPath();
    ctx.arc(26, -28, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function wrapCanvasText(ctx, text, maxWidth) {
  const words = String(text || '').normalize('NFC').split(/\s+/);
  const lines = [];
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const testLine = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines.push(line);
      line = words[i];
    } else {
      line = testLine;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function createAlcoveBannerTexture(item, pose) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 560;
  const ctx = canvas.getContext('2d');
  const palette = getEraBannerPalette(item.floor);

  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, palette.bgTop);
  grad.addColorStop(1, palette.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Khung viền kép Indochine
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 8;
  ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
  ctx.lineWidth = 2;
  ctx.strokeRect(32, 32, canvas.width - 64, canvas.height - 64);

  // Huy hiệu hoa văn bên trái
  drawBannerWorkMotif(ctx, item.id, 175, 285, 92, palette);

  // Nhãn tầng & mã phòng trên đầu
  const roomCode = pose.roomCode || getRoomCode(item);
  const badgeText = `PHÒNG ${roomCode} • ${palette.eraLabel}`.normalize('NFC');
  ctx.fillStyle = 'rgba(212, 175, 55, 0.16)';
  ctx.fillRect(310, 62, 650, 44);
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(310, 62, 650, 44);
  ctx.fillStyle = palette.accent;
  ctx.font = 'bold 21px "Segoe UI", "Times New Roman", serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, 330, 84);

  // Tên tác phẩm
  const titleText = String(item.name || '').normalize('NFC').toUpperCase();
  let titleSize = 46;
  ctx.font = `bold ${titleSize}px "Times New Roman", Georgia, serif`;
  while (titleSize > 28 && ctx.measureText(titleText).width > 640) {
    titleSize -= 2;
    ctx.font = `bold ${titleSize}px "Times New Roman", Georgia, serif`;
  }
  ctx.fillStyle = palette.textMain;
  ctx.fillText(titleText, 310, 158, 650);

  // Tác giả & Thời kỳ
  ctx.fillStyle = palette.textSub;
  ctx.font = 'italic 24px "Times New Roman", Georgia, serif';
  const metaLine = `${item.author || ''} • ${item.era || ''}`.normalize('NFC');
  ctx.fillText(metaLine, 310, 212, 650);

  // Đường kẻ phân cách vàng đồng
  ctx.strokeStyle = palette.border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(310, 242);
  ctx.lineTo(950, 242);
  ctx.stroke();

  // Trích dẫn văn học
  ctx.fillStyle = '#fff9eb';
  ctx.font = '26px "Times New Roman", Georgia, serif';
  const quoteLines = wrapCanvasText(ctx, `“${item.quote || ''}”`, 640).slice(0, 5);
  let yCursor = 294;
  for (let i = 0; i < quoteLines.length; i++) {
    ctx.fillText(quoteLines[i], 310, yCursor);
    yCursor += 42;
  }

  // Footer khu trưng bày
  ctx.fillStyle = palette.accent;
  ctx.font = 'bold 18px "Segoe UI", sans-serif';
  ctx.fillText(`KHU TRƯNG BÀY ${pose.alcoveName.toUpperCase()} • BẢO TÀNG VĂN HỌC VIỆT NAM`.normalize('NFC'), 310, 496);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function createWovenRugTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#d8cfc0';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = 'rgba(255, 242, 204, 0.55)';
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, 232, 232);
  ctx.lineWidth = 3;
  ctx.strokeRect(24, 24, 208, 208);

  ctx.strokeStyle = 'rgba(40, 22, 12, 0.22)';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 256; i += 8) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(245, 210, 125, 0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(128, 128, 56, 0, Math.PI * 2);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export class RoomGenerator {
  constructor(materialLibrary = null) {
    this.matLib = materialLibrary;
    this.group = new THREE.Group();
    this.group.name = "Fifteen_Literature_Dioramas_Generator";

    this.books = [];
    this.interactiveBookMeshes = [];
    this.dioramaRooms = [];
    this.localizedLights = [];
    this.alcoveLightSpecs = [];
    this.roomPlaques = [];
    this.plaqueCollisionBoxes = [];
    this.alcoveSolidColliders = [];
    this.cachedWallColliders = [];

    try {
      this.initAlcovePartitionWalls();
      this.initInstancedPedestals();
      this.initNonCustomAlcovePresentations();
      this.initMagicBooks();
      this.initLocalizedMoodLighting();
      this.initRoomInfoPlaques();

      console.log("%c✓ RoomGenerator initialized • 15 Thematic Diorama Alcoves & Presentations Ready!", "color: #39e58c; font-weight: bold;");
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo RoomGenerator:", err);
    }
  }

  getMat(name) {
    return this.matLib?.get?.(name) ?? new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.FrontSide
    });
  }

  prepareGeometry(geo) {
    if (!geo) return;
    try {
      geo.computeVertexNormals?.();
      geo.computeBoundingBox?.();
      geo.computeBoundingSphere?.();

      ['position', 'normal', 'uv'].forEach(attrName => {
        const attr = geo.attributes?.[attrName];
        if (attr?.array) {
          let dirty = false;
          for (let i = 0; i < attr.array.length; i++) {
            if (!Number.isFinite(attr.array[i])) {
              attr.array[i] = attrName === 'normal' && (i % 3 === 1) ? 1.0 : 0.0;
              dirty = true;
            }
          }
          if (dirty) attr.needsUpdate = true;
        }
      });
    } catch (err) {
      console.warn("[SELF-HEALING] Geometry preparation error:", err);
    }
  }

  /**
   * Tính toán tọa độ không gian 3D của tác phẩm dựa trên LITERATURE_REGISTRY + ALCOVE_CENTERS
   */
  calculateItemPosition(item) {
    return getRoomWorldPose(item);
  }

  /**
   * 1. XÓA BỎ TƯỜNG ẢO 20M CŨ (MuseumHitboxSystem đã quản lý tường kiến trúc thật 28x26 / 44x28)
   */
  initAlcovePartitionWalls() {
    this.cachedWallColliders = [];
  }

  /**
   * 2. KHỞI TẠO 15 BỆ ĐÁ CẨM THẠCH TRẮNG TRÊN SÀN BẢO TÀNG (THREE.InstancedMesh)
   */
  initInstancedPedestals() {
    const pedestalGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.95, 16);
    this.prepareGeometry(pedestalGeo);

    const marbleMat = this.getMat('whiteMarble');
    const totalPedestals = LITERATURE_REGISTRY.length;
    const instancedPedestals = new THREE.InstancedMesh(pedestalGeo, marbleMat, totalPedestals);
    instancedPedestals.name = "Instanced_Marble_Pedestals_15Rooms";
    instancedPedestals.frustumCulled = true;
    instancedPedestals.castShadow = false; // Tối ưu hóa: Không đổ bóng bệ sách
    instancedPedestals.receiveShadow = false;
    instancedPedestals.matrixAutoUpdate = false;

    const dummy = new THREE.Object3D();
    const nonCustomPositions = [];

    LITERATURE_REGISTRY.forEach((item, idx) => {
      const pos = this.calculateItemPosition(item);
      // 8 gian tiểu cảnh đặt bệ đá trên thảm/bục trưng bày cao 0.08m (tâm Y = pos.y + 0.555m)
      dummy.position.set(pos.x, pos.y + 0.555, pos.z);
      dummy.rotation.set(0, 0, 0);

      if (CUSTOM_ROOM_IDS.has(item.id)) {
        dummy.scale.set(0, 0, 0);
      } else {
        dummy.scale.set(1, 1, 1);
        nonCustomPositions.push(pos);
      }
      dummy.updateMatrix();

      instancedPedestals.setMatrixAt(idx, dummy.matrix);
    });

    instancedPedestals.instanceMatrix.needsUpdate = true;
    instancedPedestals.computeBoundingBox();
    instancedPedestals.computeBoundingSphere();
    instancedPedestals.updateMatrix();

    this.group.add(instancedPedestals);

    // BÓNG ĐỔ GIẢ LẬP & VỆT SÁNG DƯỚI CHÂN CÁC BỆ TRƯNG BÀY (INSTANCED MESH - 2 DRAW CALLS)
    if (nonCustomPositions.length > 0) {
      const pedestalShadowGeo = new THREE.PlaneGeometry(2.6, 2.6);
      pedestalShadowGeo.rotateX(-Math.PI / 2);
      this.prepareGeometry(pedestalShadowGeo);
      const shadowMat = this.matLib?.get?.('fakeShadow') ?? getFakeShadowMaterial();

      const pedestalLightPoolGeo = new THREE.PlaneGeometry(3.6, 3.6);
      pedestalLightPoolGeo.rotateX(-Math.PI / 2);
      this.prepareGeometry(pedestalLightPoolGeo);
      const poolMat = this.matLib?.get?.('floorLightPool') ?? getFloorLightPoolMaterial();

      const shadowInst = new THREE.InstancedMesh(pedestalShadowGeo, shadowMat, nonCustomPositions.length);
      shadowInst.name = "Instanced_Pedestal_Shadows";
      shadowInst.frustumCulled = true;
      shadowInst.renderOrder = 1;
      shadowInst.matrixAutoUpdate = false;

      const poolInst = new THREE.InstancedMesh(pedestalLightPoolGeo, poolMat, nonCustomPositions.length);
      poolInst.name = "Instanced_Pedestal_LightPools";
      poolInst.frustumCulled = true;
      poolInst.renderOrder = 2;
      poolInst.matrixAutoUpdate = false;

      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1);
      nonCustomPositions.forEach((pos, idx) => {
        dummy.position.set(pos.x, pos.y + 0.09, pos.z);
        dummy.updateMatrix();
        shadowInst.setMatrixAt(idx, dummy.matrix);

        dummy.position.set(pos.x, pos.y + 0.093, pos.z);
        dummy.updateMatrix();
        poolInst.setMatrixAt(idx, dummy.matrix);
      });

      shadowInst.instanceMatrix.needsUpdate = true;
      shadowInst.computeBoundingBox();
      shadowInst.computeBoundingSphere();
      shadowInst.updateMatrix();

      poolInst.instanceMatrix.needsUpdate = true;
      poolInst.computeBoundingBox();
      poolInst.computeBoundingSphere();
      poolInst.updateMatrix();

      this.group.add(shadowInst, poolInst);
    }
  }

  /**
   * 3. TRANG BỊ KIẾN TRÚC TRIỂN LÃM ĐỒNG BỘ CHO 8 GIAN TIỂU CẢNH (INSTANCED MESH + HITBOX)
   * - Thảm/bục triển lãm viền đồng dưới chân bệ đá trung tâm
   * - Phướn trưng bày hậu cảnh CanvasTexture (SRGBColorSpace) trích dẫn & biểu tượng tác phẩm
   * - 4 trụ đèn lồng di sản tại 4 góc thảm
   * - Ghế băng gỗ trắc hướng tâm phục vụ khách dừng chân ngắm sách
   */
  initNonCustomAlcovePresentations() {
    this.alcoveSolidColliders = [];
    const nonCustomItems = LITERATURE_REGISTRY.filter((item) => !CUSTOM_ROOM_IDS.has(item.id));
    if (nonCustomItems.length === 0) return;

    const count = nonCustomItems.length;
    const darkWoodMat = this.getMat('dark_wood');
    const goldMat = this.getMat('royalGold');
    const rugTexture = createWovenRugTexture();
    const rugMat = new THREE.MeshLambertMaterial({
      map: rugTexture,
      color: 0xffffff,
      side: THREE.FrontSide
    });
    const lanternGlowMat = new THREE.MeshBasicMaterial({
      color: 0xffdf94,
      side: THREE.FrontSide
    });

    // Helper tạo InstancedMesh tối ưu draw call
    const makeInstanced = (name, geo, mat, instanceCount) => {
      this.prepareGeometry(geo);
      const mesh = new THREE.InstancedMesh(geo, mat, instanceCount);
      mesh.name = name;
      mesh.frustumCulled = true;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      mesh.matrixAutoUpdate = false;
      return mesh;
    };

    // (a) Bục & Thảm triển lãm trung tâm (8 gian)
    const daisMesh = makeInstanced('Alcove_Instanced_Dais', new THREE.BoxGeometry(7.6, 0.08, 7.6), darkWoodMat, count);
    const daisTrimMesh = makeInstanced('Alcove_Instanced_DaisTrim', new THREE.BoxGeometry(7.36, 0.086, 7.36), goldMat, count);
    const rugMesh = makeInstanced('Alcove_Instanced_WovenRug', new THREE.BoxGeometry(7.0, 0.02, 7.0), rugMat, count);

    // (b) Khung phướn hậu cảnh (8 gian)
    const bannerPostMesh = makeInstanced('Alcove_Instanced_BannerPosts', new THREE.BoxGeometry(0.18, 3.5, 0.18), darkWoodMat, count * 2);
    const bannerPlinthMesh = makeInstanced('Alcove_Instanced_BannerPlinths', new THREE.BoxGeometry(0.62, 0.22, 0.62), darkWoodMat, count * 2);
    const bannerBarMesh = makeInstanced('Alcove_Instanced_BannerBars', new THREE.BoxGeometry(5.56, 0.16, 0.22), darkWoodMat, count * 2);
    const bannerBackMesh = makeInstanced('Alcove_Instanced_BannerBacking', new THREE.BoxGeometry(4.96, 2.76, 0.08), goldMat, count);
    const bannerFaceGeo = new THREE.PlaneGeometry(4.78, 2.60);
    this.prepareGeometry(bannerFaceGeo);

    // (c) 4 trụ đèn lồng di sản mỗi gian (8 * 4 = 32 trụ)
    const cornerBaseMesh = makeInstanced('Alcove_Instanced_LanternBases', new THREE.BoxGeometry(0.42, 0.18, 0.42), darkWoodMat, count * 4);
    const cornerShaftMesh = makeInstanced('Alcove_Instanced_LanternShafts', new THREE.CylinderGeometry(0.065, 0.075, 1.55, 8), darkWoodMat, count * 4);
    const cornerCollarMesh = makeInstanced('Alcove_Instanced_LanternCollars', new THREE.BoxGeometry(0.36, 0.12, 0.36), goldMat, count * 4);
    const cornerCoreMesh = makeInstanced('Alcove_Instanced_LanternCores', new THREE.BoxGeometry(0.24, 0.38, 0.24), lanternGlowMat, count * 4);
    const cornerCapMesh = makeInstanced('Alcove_Instanced_LanternCaps', new THREE.ConeGeometry(0.28, 0.26, 4), goldMat, count * 4);

    // (d) Ghế băng gỗ trắc ngắm hiện vật (8 gian)
    const benchSeatMesh = makeInstanced('Alcove_Instanced_BenchSeats', new THREE.BoxGeometry(2.30, 0.12, 0.74), darkWoodMat, count);
    const benchInlayMesh = makeInstanced('Alcove_Instanced_BenchInlays', new THREE.BoxGeometry(2.34, 0.04, 0.78), goldMat, count);
    const benchLegMesh = makeInstanced('Alcove_Instanced_BenchLegs', new THREE.BoxGeometry(0.20, 0.44, 0.64), darkWoodMat, count * 2);

    const dummy = new THREE.Object3D();
    const eraRugTints = {
      1: new THREE.Color(0xb85d3b), // Đất nung & sỏi rêu cổ đại
      2: new THREE.Color(0x8e6334), // Sơn mài vàng son Trung đại
      3: new THREE.Color(0x4a6178)  // Xám xanh Cận - Hiện đại
    };

    const setInstanceFromLocal = (instMesh, idx, pose, lx, ly, lz, localRotY = 0) => {
      const wp = localRoomToWorld(pose, lx, ly, lz);
      dummy.position.set(wp.x, wp.y, wp.z);
      dummy.rotation.set(0, (pose.rotY || 0) + localRotY, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      instMesh.setMatrixAt(idx, dummy.matrix);
    };

    const pushCollider = (tag, pose, lx, ly, lz, w, h, d, localRotY = 0) => {
      const { box, center } = buildRoomLocalAABB(pose, lx, ly, lz, w, h, d, localRotY);
      this.alcoveSolidColliders.push({
        name: tag,
        isMesh: false,
        visible: true,
        userData: { worldAABB: box, center }
      });
    };

    nonCustomItems.forEach((item, roomIdx) => {
      const pose = this.calculateItemPosition(item);

      // (a) Bục & Thảm triển lãm
      setInstanceFromLocal(daisMesh, roomIdx, pose, 0, 0.04, 0);
      setInstanceFromLocal(daisTrimMesh, roomIdx, pose, 0, 0.043, 0);
      setInstanceFromLocal(rugMesh, roomIdx, pose, 0, 0.082, 0);
      rugMesh.setColorAt(roomIdx, eraRugTints[item.floor] || eraRugTints[2]);

      // (b) Phướn trưng bày hậu cảnh (local Z = -6.2)
      setInstanceFromLocal(bannerPostMesh, roomIdx * 2, pose, -2.65, 1.75, -6.2);
      setInstanceFromLocal(bannerPostMesh, roomIdx * 2 + 1, pose, 2.65, 1.75, -6.2);
      setInstanceFromLocal(bannerPlinthMesh, roomIdx * 2, pose, -2.65, 0.11, -6.2);
      setInstanceFromLocal(bannerPlinthMesh, roomIdx * 2 + 1, pose, 2.65, 0.11, -6.2);
      setInstanceFromLocal(bannerBarMesh, roomIdx * 2, pose, 0, 3.45, -6.2);
      setInstanceFromLocal(bannerBarMesh, roomIdx * 2 + 1, pose, 0, 0.42, -6.2);
      setInstanceFromLocal(bannerBackMesh, roomIdx, pose, 0, 1.98, -6.2);

      const bannerTex = createAlcoveBannerTexture(item, pose);
      const bannerFaceMat = new THREE.MeshBasicMaterial({
        map: bannerTex,
        side: THREE.FrontSide
      });
      const bannerFace = new THREE.Mesh(bannerFaceGeo, bannerFaceMat);
      bannerFace.name = `Alcove_BannerCanvas_${item.id}`;
      const facePos = localRoomToWorld(pose, 0, 1.98, -6.14);
      bannerFace.position.set(facePos.x, facePos.y, facePos.z);
      bannerFace.rotation.y = pose.rotY || 0;
      bannerFace.frustumCulled = true;
      bannerFace.castShadow = false;
      bannerFace.receiveShadow = false;
      this.group.add(bannerFace);

      pushCollider(`alcove_banner_${item.id}`, pose, 0, 0, -6.2, 5.7, 3.55, 0.72);

      // (c) 4 trụ đèn lồng di sản tại 4 góc thảm
      const corners = [
        [-3.55, -3.55],
        [3.55, -3.55],
        [-3.55, 3.55],
        [3.55, 3.55]
      ];
      corners.forEach(([cx, cz], cIdx) => {
        const instIdx = roomIdx * 4 + cIdx;
        setInstanceFromLocal(cornerBaseMesh, instIdx, pose, cx, 0.09, cz);
        setInstanceFromLocal(cornerShaftMesh, instIdx, pose, cx, 0.955, cz);
        setInstanceFromLocal(cornerCollarMesh, instIdx, pose, cx, 1.76, cz);
        setInstanceFromLocal(cornerCoreMesh, instIdx, pose, cx, 1.98, cz);
        setInstanceFromLocal(cornerCapMesh, instIdx, pose, cx, 2.27, cz, Math.PI * 0.25);

        pushCollider(`alcove_lantern_${item.id}_${cIdx}`, pose, cx, 0, cz, 0.56, 2.4, 0.56);
      });

      // (d) Ghế băng ngắm hiện vật (bên phải lối vào, đối xứng với Plaque bên trái)
      const benchX = pose.isNorthHall ? 4.8 : 4.1;
      const benchZ = pose.isNorthHall ? 5.6 : 5.1;
      const benchRotY = -0.35;
      const cosB = Math.cos(benchRotY);
      const sinB = Math.sin(benchRotY);

      setInstanceFromLocal(benchSeatMesh, roomIdx, pose, benchX, 0.48, benchZ, benchRotY);
      setInstanceFromLocal(benchInlayMesh, roomIdx, pose, benchX, 0.43, benchZ, benchRotY);
      setInstanceFromLocal(
        benchLegMesh,
        roomIdx * 2,
        pose,
        benchX - 0.86 * cosB,
        0.22,
        benchZ + 0.86 * sinB,
        benchRotY
      );
      setInstanceFromLocal(
        benchLegMesh,
        roomIdx * 2 + 1,
        pose,
        benchX + 0.86 * cosB,
        0.22,
        benchZ - 0.86 * sinB,
        benchRotY
      );

      pushCollider(`alcove_bench_${item.id}`, pose, benchX, 0, benchZ, 2.38, 0.58, 0.82, benchRotY);
    });

    const allInstanced = [
      daisMesh,
      daisTrimMesh,
      rugMesh,
      bannerPostMesh,
      bannerPlinthMesh,
      bannerBarMesh,
      bannerBackMesh,
      cornerBaseMesh,
      cornerShaftMesh,
      cornerCollarMesh,
      cornerCoreMesh,
      cornerCapMesh,
      benchSeatMesh,
      benchInlayMesh,
      benchLegMesh
    ];
    allInstanced.forEach((m) => {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.computeBoundingBox();
      m.computeBoundingSphere();
      m.updateMatrix();
      this.group.add(m);
    });
  }

  /**
   * 4. KHỞI TẠO 15 CUỐN SÁCH MA THUẬT VỚI MÀU SẮC THEMECOLOR VÀ NHỊP ĐỘ BAY ĐỘC LẬP
   */
  initMagicBooks() {
    const bookCoverGeo = new THREE.BoxGeometry(0.82, 0.16, 1.12);
    this.prepareGeometry(bookCoverGeo);

    const bookPagesGeo = new THREE.BoxGeometry(0.74, 0.12, 1.02);
    this.prepareGeometry(bookPagesGeo);

    const pagesMat = new THREE.MeshLambertMaterial({ color: 0xf5f2eb, side: THREE.FrontSide });

    const goldRibMat = this.getMat('royalGold');

    LITERATURE_REGISTRY.forEach((item, idx) => {
      // BỎ HOÀN TOÀN MÔ HÌNH NHÁP (THANH XANH LÁ) CHO PHÒNG 01 TRUYỆN KIỀU
      // Phòng 01 được quản lý 100% bằng RoomDecorator với model .glb thật 1:1
      if (CUSTOM_ROOM_IDS.has(item.id)) {
        return;
      }

      const pos = this.calculateItemPosition(item);
      const bookGroup = new THREE.Group();
      bookGroup.name = `MagicBook_${item.id}`;

      // Vị trí bay lơ lửng trên bệ đá đặt trên thảm triển lãm (mặt bệ Y = floor + 1.03m, sách bay tại Y = floor + 1.62m)
      const baseHoverY = pos.y + 1.62;
      bookGroup.position.set(pos.x, baseHoverY, pos.z);

      const coverMat = new THREE.MeshLambertMaterial({ color: item.themeColor, side: THREE.FrontSide });

      const coverMesh = new THREE.Mesh(bookCoverGeo, coverMat);
      coverMesh.castShadow = false; // Tối ưu hóa: Không đổ bóng bìa sách
      coverMesh.receiveShadow = false;
      coverMesh.frustumCulled = true;
      bookGroup.add(coverMesh);

      const pagesMesh = new THREE.Mesh(bookPagesGeo, pagesMat);
      pagesMesh.position.x = 0.02;
      pagesMesh.frustumCulled = true;
      pagesMesh.castShadow = false;
      bookGroup.add(pagesMesh);

      const ribGeo = new THREE.BoxGeometry(0.04, 0.18, 1.14);
      this.prepareGeometry(ribGeo);
      const ribMesh = new THREE.Mesh(ribGeo, goldRibMat);
      ribMesh.position.x = -0.41;
      ribMesh.frustumCulled = true;
      ribMesh.castShadow = false;
      bookGroup.add(ribMesh);

      bookGroup.rotation.x = Math.PI / 7.2;

      // Quầng sáng giả lập siêu nhẹ quanh sách ma thuật (Fake Glow Sprite)
      const glowMat = this.matLib?.get?.('fakeGlowSprite') ?? getFakeGlowSpriteMaterial();
      const bookGlow = new THREE.Sprite(glowMat);
      bookGlow.name = `MagicBook_Glow_${item.id}`;
      bookGlow.position.set(0, 0, 0);
      bookGlow.scale.set(1.8, 1.8, 1.0);
      bookGlow.frustumCulled = true;
      bookGroup.add(bookGlow);

      // Dữ liệu tương tác raycasting
      coverMesh.userData.literatureData = item;
      coverMesh.userData.portalMetadata = {
        id: item.id,
        title: item.name,
        author: item.author,
        genre: item.era,
        quote: item.quote,
        portalReady: item.portalReady,
        themeColor: item.themeColor,
        floor: item.floor,
        roomIndex: item.roomIndex
      };

      this.interactiveBookMeshes.push(coverMesh);

      if (CUSTOM_ROOM_IDS.has(item.id)) {
        bookGroup.traverse(c => {
          c.layers.enable(1);
        });
      }

      this.books.push({
        group: bookGroup,
        mesh: coverMesh,
        baseY: baseHoverY,
        floatSpeed: 1.35 + (idx % 5) * 0.22,
        phase: (idx * 1.38) % (Math.PI * 2),
        rotSpeed: 0.22 + (idx % 3) * 0.08,
        bobbingAmp: 0.05 + (idx % 4) * 0.012
      });

      this.group.add(bookGroup);
    });
  }

  /**
   * 5. ÁNH SÁNG CỤC BỘ (LOCALIZED MOOD LIGHTING): 1 POINTLIGHT & 1 SPOTLIGHT CHO MỖI TIỂU CẢNH
   */
  initLocalizedMoodLighting() {
    const lightsGroup = new THREE.Group();
    lightsGroup.name = "Diorama_Localized_Mood_Lights_Group";
    this.lightsGroup = lightsGroup;

    LITERATURE_REGISTRY.forEach((item) => {
      // Bỏ qua Phòng 01 vì RoomDecorator đã quản lý hệ sinh thái ánh sáng cô lập Layer 1
      if (CUSTOM_ROOM_IDS.has(item.id)) return;

      const pos = this.calculateItemPosition(item);
      const atmos = item.atmosphere || {};
      const primaryColor = atmos.primaryColor ?? item.themeColor ?? 0xffd700;
      const baseIntensity = atmos.lightIntensity ?? 2.0;

      // 1. PointLight tỏa sáng dịu mát quanh đài tiểu cảnh
      const pointLight = new THREE.PointLight(primaryColor, baseIntensity * 0.85, 7.5, 2.0);
      pointLight.name = `Diorama_PointLight_${item.id}`;
      pointLight.position.set(pos.x, pos.y + 1.6, pos.z);
      lightsGroup.add(pointLight);

      // 2. SpotLight rọi nghệ thuật tập trung từ trần xuống đài tiểu cảnh
      const spotLight = new THREE.SpotLight(
        primaryColor,
        baseIntensity * 1.4,
        11.0,
        Math.PI / 4.2,
        0.55,
        1.8
      );
      spotLight.name = `Diorama_SpotLight_${item.id}`;
      spotLight.position.set(pos.x, pos.y + 5.2, pos.z);

      const spotTarget = new THREE.Object3D();
      spotTarget.position.set(pos.x, pos.y + 0.3, pos.z);
      lightsGroup.add(spotTarget);
      spotLight.target = spotTarget;
      lightsGroup.add(spotLight);

      this.localizedLights.push({
        roomId: item.id,
        center: new THREE.Vector3(pos.x, pos.y, pos.z),
        pointLight,
        spotLight,
        basePointIntensity: baseIntensity * 0.85,
        baseSpotIntensity: baseIntensity * 1.4,
        currentPointIntensity: baseIntensity * 0.85,
        currentSpotIntensity: baseIntensity * 1.4
      });

      this.alcoveLightSpecs.push({
        roomId: item.id,
        center: new THREE.Vector3(pos.x, pos.y, pos.z),
        lightPos: new THREE.Vector3(pos.x, pos.y + 4.4, pos.z),
        color: primaryColor,
        intensity: Math.max(1.8, baseIntensity * 1.35),
        distance: 22.0
      });
    });

    this.group.add(lightsGroup);
  }

  /**
   * Kết nối toàn bộ 15 sách vào danh sách tương tác của PortalInteraction
   */
  registerWithPortal(portalInteraction) {
    if (!portalInteraction) return;

    this.interactiveBookMeshes.forEach(mesh => {
      const meta = mesh.userData.portalMetadata || {};
      const pos = new THREE.Vector3();
      mesh.getWorldPosition(pos);
      const targetCoords = new THREE.Vector3(pos.x, pos.y + 150.0, pos.z);

      registerInteractiveBook(mesh, targetCoords, {
        ...meta,
        themeColor: meta.themeColor || 0xffd700,
        portalReady: meta.portalReady !== false
      });
    });

    console.log(`%c[ROOM GENERATOR] Đã kết nối ${this.interactiveBookMeshes.length} cuốn sách vào hệ thống Interactive Book!`, "color: #39e58c; font-weight: bold;");
  }

  /**
   * Lấy mesh của cuốn sách Truyện Kiều (Phòng mẫu 01)
   */
  getTruyenKieuBookMesh() {
    const item = this.interactiveBookMeshes.find(m => m.userData?.portalMetadata?.id === 'truyen_kieu');
    return item || this.interactiveBookMeshes[0] || null;
  }

  /**
   * Cập nhật hoạt ảnh bay lơ lửng và điều tiết ánh sáng theo cự ly camera (Proximity Streaming)
   */
  update(delta = 0.016, elapsedTime = 0, camera = null) {
    if (!this.group.visible) return;

    const camPos = camera?.position;

    // 1. Cập nhật hoạt ảnh sách bay kết hợp Distance Culling (dùng distanceToSquared tránh Math.sqrt)
    const maxBookDistSq = 4900.0; // 70m * 70m
    for (let i = 0; i < this.books.length; i++) {
      const b = this.books[i];
      if (camPos) {
        const distSq = camPos.distanceToSquared(b.group.position);
        const vis = distSq < maxBookDistSq;
        if (b.group.visible !== vis) b.group.visible = vis;
        if (!vis) continue;
      }
      const yOffset = Math.sin(elapsedTime * b.floatSpeed + b.phase) * b.bobbingAmp;
      b.group.position.y = b.baseY + yOffset;
      b.group.rotation.y += b.rotSpeed * delta;
    }

    // 2. Bỏ qua throttle đèn nếu initThreePointLighting đã gỡ toàn bộ đèn cục bộ khỏi atriumGroup
    if (!this.lightsGroup || this.lightsGroup.children.length === 0) return;

    this.lightThrottleTimer = (this.lightThrottleTimer || 0) + delta;
    if (this.lightThrottleTimer >= 0.35) {
      this.lightThrottleTimer = 0;
      for (let i = 0; i < this.localizedLights.length; i++) {
        const item = this.localizedLights[i];
        let inRange = true;
        if (camPos) {
          const distSq = (camPos.x - item.center.x) ** 2 + (camPos.z - item.center.z) ** 2;
          inRange = distSq < 2500.0; // 50m * 50m
        }
        if (item.pointLight && item.pointLight.visible !== inRange) {
          item.pointLight.visible = inRange;
        }
        if (item.spotLight && item.spotLight.visible !== inRange) {
          item.spotLight.visible = inRange;
        }
      }
    }
  }

  /**
   * LUÔN BẬT TOÀN BỘ ÁNH SÁNG TẤT CẢ CÁC PHÒNG (VÔ HIỆU HÓA PROXIMITY STREAMING)
   */
  setAllRoomsVisible(visible = true) {
    for (let i = 0; i < this.localizedLights.length; i++) {
      const item = this.localizedLights[i];
      if (item.pointLight) item.pointLight.visible = visible;
      if (item.spotLight) item.spotLight.visible = visible;
    }
  }

  /**
   * BẬT/TẮT ÁNH SÁNG CỦA TOÀN BỘ CÁC PHÒNG KHÁC (LUÔN GIỮ SÁNG ĐỂ KHÔNG MẤT CẢNH QUAN)
   */
  setAllOtherRoomsVisible(visible, exceptRoomId = null) {
    // Vô hiệu hóa việc tắt đèn: giữ toàn bộ các phòng luôn sáng rõ
    for (let i = 0; i < this.localizedLights.length; i++) {
      const item = this.localizedLights[i];
      if (item.pointLight) item.pointLight.visible = true;
      if (item.spotLight) item.spotLight.visible = true;
    }
  }

  /**
   * VÔ HIỆU HÓA PROXIMITY ZONE STREAMING:
   * Luôn bật đèn cho toàn bộ 15 phòng, không bao giờ tắt phòng nào.
   */
  updateActiveRoomByProximity(camPos) {
    for (let i = 0; i < this.localizedLights.length; i++) {
      const item = this.localizedLights[i];
      if (item.pointLight) item.pointLight.visible = true;
      if (item.spotLight) item.spotLight.visible = true;
    }
  }

  /**
   * LẮP ĐẶT BẢNG THÔNG TIN DI SẢN 3D CHO CÁC PHÒNG TRƯNG BÀY
   * (Các phòng tự lắp đặt bảng riêng trong decorator như Tắt Đèn, Nam Quốc Sơn Hà, Thánh Gióng,
   * Chuyện Người Con Gái Nam Xương, Đây Thôn Vĩ Dạ được bỏ qua để tránh trùng lặp)
   */
  initRoomInfoPlaques() {
    const SELF_MOUNTED_DECORATOR_ROOMS = new Set([
      'tat_den',
      'nam_quoc_son_ha',
      'thanh_giong',
      'nguoi_con_gai_nam_xuong',
      'day_thon_vi_da'
    ]);

    LITERATURE_REGISTRY.forEach((item) => {
      if (SELF_MOUNTED_DECORATOR_ROOMS.has(item.id)) return;

      const pos = this.calculateItemPosition(item);
      const isCustomRoom = CUSTOM_ROOM_IDS.has(item.id);
      const localX = isCustomRoom
        ? (pos.isNorthHall ? -5.4 : -4.8)
        : (pos.isNorthHall ? -5.0 : -4.0);
      const localZ = isCustomRoom
        ? 8.4
        : (pos.isNorthHall ? 6.8 : 6.4);
      const localRotY = isCustomRoom ? 0.32 : 0.34;

      const worldPos = localRoomToWorld(pos, localX, 0, localZ);
      const worldX = worldPos.x;
      const worldZ = worldPos.z;
      const worldRotY = pos.rotY + localRotY;

      const plaqueRoot = createAutoSynthesizedRoomPlaque(item.id, {
        mountMode: 'pedestal',
        includeSpotLight: true,
        position: new THREE.Vector3(worldX, pos.y, worldZ),
        rotationY: worldRotY,
        parent: this.group
      });

      if (!plaqueRoot) return;
      plaqueRoot.name = `RoomInfoPlaque_${item.id}`;
      plaqueRoot.userData.roomId = item.id;
      plaqueRoot.userData.floor = item.floor;
      syncPlaqueWorldMetadata(plaqueRoot);

      this.roomPlaques.push({ item, plaqueRoot });

      // Hộp va chạm chuẩn hóa cho chân đế bảng thông tin (~1.56m W x 2.04m H x 0.72m D)
      const plaqueCos = Math.abs(Math.cos(worldRotY));
      const plaqueSin = Math.abs(Math.sin(worldRotY));
      const halfSpanX = (plaqueCos * 1.56 + plaqueSin * 0.76) * 0.5;
      const halfSpanZ = (plaqueSin * 1.56 + plaqueCos * 0.76) * 0.5;
      const plaqueBox = new THREE.Box3(
        new THREE.Vector3(worldX - halfSpanX, pos.y, worldZ - halfSpanZ),
        new THREE.Vector3(worldX + halfSpanX, pos.y + 2.04, worldZ + halfSpanZ)
      );
      this.plaqueCollisionBoxes.push({
        name: `plaque_pedestal_${item.id}`,
        isMesh: false,
        visible: true,
        userData: {
          worldAABB: plaqueBox,
          center: new THREE.Vector3(worldX, pos.y + 1.0, worldZ)
        }
      });
    });
  }

  /**
   * ĐĂNG KÝ PROXY CLICK & CAMERA FOCUS CHO TOÀN BỘ BẢNG THÔNG TIN TRONG ROOM GENERATOR
   */
  registerPlaqueHitboxes(hitboxManager = null, loreGuide = null, cameraManager = null) {
    const hbm = hitboxManager || (typeof window !== 'undefined' ? window.__museumHitboxManager : null);
    const guide = loreGuide || (typeof window !== 'undefined' ? window.__loreGuide : null);
    if (!hbm && !guide) return;

    for (let i = 0; i < this.roomPlaques.length; i++) {
      const { plaqueRoot } = this.roomPlaques[i];
      if (!plaqueRoot) continue;
      registerPlaqueWithSystems(plaqueRoot, {
        hitboxManager: hbm,
        loreGuide: guide,
        realm: 'museum',
        onFocusCamera: () => {
          const camMgr = cameraManager || (typeof window !== 'undefined' ? window.__museumCameraManager : null);
          if (!camMgr) return;
          if (typeof camMgr.smoothZoomToFocus === 'function') {
            camMgr.smoothZoomToFocus(plaqueRoot, { distance: 2.25 });
          } else if (typeof camMgr.setView === 'function') {
            const meta = syncPlaqueWorldMetadata(plaqueRoot);
            if (!meta) return;
            const target = meta.focusPoint.clone();
            const position = target.clone().addScaledVector(meta.focusNormal, 2.25);
            position.y = Math.max(target.y - 0.04, position.y);
            camMgr.setView({ position, target }, true);
          }
        }
      });
    }
  }

  /**
   * ĐĂNG KÝ TOÀN BỘ HITBOX RẮN (BỆ SÁCH, BẢNG THÔNG TIN, PHƯỚN, ĐÈN LỒNG, GHẾ BĂNG) VÀO MUSEUM HITBOX SYSTEM
   */
  registerSolidHitboxes(hitboxManager = null) {
    const hbm = hitboxManager || (typeof window !== 'undefined' ? window.__museumHitboxManager : null);
    if (!hbm || typeof hbm.registerSolidObjectCollider !== 'function') return;

    const registerBoxList = (list) => {
      if (!Array.isArray(list)) return;
      for (let i = 0; i < list.length; i++) {
        const entry = list[i];
        const box = entry?.userData?.worldAABB;
        if (!box) continue;
        hbm.registerSolidObjectCollider(null, {
          customBox: box.clone(),
          tag: entry.name || 'alcove_prop',
          helperColor: 0x39e58c,
          realm: 'museum'
        });
      }
    };

    registerBoxList(this.plaqueCollisionBoxes);
    registerBoxList(this.alcoveSolidColliders);

    LITERATURE_REGISTRY.forEach((item) => {
      if (CUSTOM_ROOM_IDS.has(item.id)) return;
      const pos = this.calculateItemPosition(item);
      const pedestalBox = new THREE.Box3(
        new THREE.Vector3(pos.x - 1.0, pos.y, pos.z - 1.0),
        new THREE.Vector3(pos.x + 1.0, pos.y + 1.05, pos.z + 1.0)
      );
      hbm.registerSolidObjectCollider(null, {
        customBox: pedestalBox,
        tag: `pedestal_${item.id}`,
        helperColor: 0xffc857,
        realm: 'museum'
      });
    });
  }

  /**
   * GOM CÁC BỆ ĐÁ, BẢNG THÔNG TIN & VẬT THỂ TIỂU CẢNH VÀO HỆ THỐNG VA CHẠM
   */
  getCollisionObjects() {
    const collisionList = [
      ...(this.cachedWallColliders || []),
      ...(this.plaqueCollisionBoxes || []),
      ...(this.alcoveSolidColliders || [])
    ];

    // Thêm 8 bệ đá cẩm thạch độc lập cho 8 gian tiểu cảnh (đặt trên bục 0.08m, cao tổng ~1.03m)
    LITERATURE_REGISTRY.forEach((item) => {
      if (CUSTOM_ROOM_IDS.has(item.id)) return;
      const pos = this.calculateItemPosition(item);
      const pedestalBox = new THREE.Box3(
        new THREE.Vector3(pos.x - 1.0, pos.y, pos.z - 1.0),
        new THREE.Vector3(pos.x + 1.0, pos.y + 1.05, pos.z + 1.0)
      );
      collisionList.push({
        name: `pedestal_${item.id}`,
        isMesh: false,
        visible: true,
        userData: {
          worldAABB: pedestalBox,
          center: new THREE.Vector3(pos.x, pos.y + 0.525, pos.z)
        }
      });
    });

    return collisionList;
  }

  getGroup() {
    this.group.traverse((child) => {
      if (child.isMesh) {
        child.frustumCulled = true;
        child.castShadow = false;
        child.receiveShadow = false;
        if (child.geometry) {
          if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
          if (!child.geometry.boundingSphere) child.geometry.computeBoundingSphere();
        }
      }
    });
    return this.group;
  }
}

export default RoomGenerator;
