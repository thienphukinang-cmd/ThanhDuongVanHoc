import * as THREE from 'three';
import { registerInteractiveBook } from './PortalInteraction.js';
import { playBookSuckInCutscene, playBookReturnCutscene, playBookVortexCutscene } from './bookVortexCutscene.js';
import { loadGlbCached } from '../utils/modelLoaderHelper.js';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger.js';
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
import { createAnDuongVuongWorld } from '../worlds/anDuongVuongWorld.js';

const prepareUnlitVividGlbModel = styleAndNormalizeGlbModel;

/**
 * =============================================================================
 * AN DƯƠNG VƯƠNG (MỴ CHÂU - TRỌNG THỦY): PHÒNG TRƯNG BÀY & CÕI CỔ LOA (60+ FPS)
 * - Tự động xoay interiorGroup hướng mặt tiền (+Z) ra sảnh hành lang chính (0,0,0)
 * - Sàn nhà riêng: 9 vòng xoáy ốc Thành Cổ Loa (Cửu Trùng Loa Thành) Ngọc Bích & Vàng Kim Quy
 * - Ánh sáng riêng: Vàng Kim Quy (#fbbf24) • Ngọc Lục Bảo (#10b981) • Lam Biển Dạ Sơn (#38bdf8)
 * - 5 cột sáng Volumetric God-Rays rọi thẳng xuống Bục Sách và 4 Bệ Hiện Vật
 * - 4 Bệ Hiện Vật 3D: Nỏ Thần Liên Châu, Thần Kim Quy, Áo Lông Ngỗng, Giếng Ngọc Trai Châu
 * - Mô hình .glb (ANDUONGVUONG.glb) unlit vivid giữ nguyên 100% PBR & góc xoay node_0
 * - Đại cảnh Cõi Cổ Loa Thành & Biển Đông (Y = +420m) với mưa tên Liên Châu & lông ngỗng bay
 * - Tương tác click chuột vào Sách & phím ESC để thoát và root.getGroup = () => roomGroup
 * =============================================================================
 */

export const ADV_REALM_ORIGIN = new THREE.Vector3(260, 420, -450);
export const ADV_OBS_PLATFORM_OFFSET = new THREE.Vector3(0, 1.8, 14.0);
export const ADV_OBS_LOOK_TARGET_OFFSET = new THREE.Vector3(0, 2.6, 0.0);

const ADV_CACHE = {};

function getCachedTex(key, w, h, drawFn, repeatX = 1, repeatY = 1) {
  if (ADV_CACHE[key]) return ADV_CACHE[key];
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  drawFn(ctx, w, h);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if ('colorSpace' in tex && THREE.SRGBColorSpace) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  ADV_CACHE[key] = tex;
  return tex;
}

function createVolumetricLightBeam(topRadius, bottomRadius, height, colorHex, opacity = 0.26) {
  const beamTex = getCachedTex(`adv_godray_${colorHex}`, 64, 256, (ctx, w, h) => {
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

function createPortalBanner({
  headerTag = 'CỔNG DỊCH CHUYỂN CỔ LOA',
  title = '📖 CLICK CHUỘT VÀO SÁCH ĐỂ VÀO THẾ GIỚI TÁC PHẨM',
  subtitle = 'Nhấn ESC bất kỳ lúc nào để thoát ra',
  accentColor = '#10b981',
  width = 3.8,
  height = 1.45
} = {}) {
  const tex = getCachedTex(`adv_banner_${title}`, 512, 220, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(6, 22, 20, 0.94)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 5;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    ctx.fillStyle = accentColor;
    ctx.font = 'bold 18px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`◈ ${headerTag} ◈`, w / 2, 42);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px "Segoe UI", sans-serif';
    ctx.fillText(title, w / 2, 105);

    ctx.fillStyle = '#fde047';
    ctx.font = '19px "Segoe UI", sans-serif';
    ctx.fillText(subtitle, w / 2, 165);
  });

  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false
    })
  );
}

function createRelicPlaque(title, subtitle, borderColor = '#10b981') {
  const tex = getCachedTex(`adv_plaque_${title}`, 512, 140, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(8, 24, 22, 0.95)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 5;
    ctx.strokeRect(6, 6, w - 12, h - 12);

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 24px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, w / 2, 52);

    ctx.fillStyle = '#d1fae5';
    ctx.font = '19px "Segoe UI", sans-serif';
    ctx.fillText(subtitle, w / 2, 98);
  });

  return new THREE.Mesh(
    new THREE.PlaneGeometry(1.75, 0.48),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, fog: false })
  );
}

function createGiantHologramScreen(index) {
  const titles = [
    'NIÊN ĐẠI ÂU LẠC & THÀNH ỐC CỔ LOA',
    'THẦN KIM QUY & NỎ THẦN LIÊN CHÂU',
    'BI KỊCH MỴ CHÂU - TRỌNG THỦY',
    'GIÁ TRỊ LỊCH SỬ & BÀI HỌC GIỮ NƯỚC'
  ];

  const screenLines = [
    [
      'TÊN TÁC PHẨM: TRUYỆN AN DƯƠNG VƯƠNG VÀ MỴ CHÂU - TRỌNG THỦY',
      'THỂ LOẠI: Truyền thuyết Lịch sử Dân gian Việt Nam (Thời kỳ Âu Lạc)',
      'NIÊN ĐẠI: Thế kỷ III TCN (Khoảng năm 257 TCN - 179 TCN)',
      'KINH ĐÔ CỔ LOA: Thành ốc 9 vòng xoáy trôn ốc bên bờ sông Hoàng Giang',
      'NHÂN VẬT TRUNG TÂM: Thục Phán An Dương Vương • Công chúa Mỵ Châu',
      'DẤU ẤN KỸ THUẬT: Đỉnh cao quân sự đắp thành và chế tạo nỏ Liên Châu'
    ],
    [
      'GIAN NAN ĐẮP THÀNH: Thành Cổ Loa đắp đến đâu lại lở đến đấy vì yêu khí',
      'SỨ GIẢ THANH GIANG: Thần Kim Quy (Rùa Vàng) hiện lên giúp vua trừ Bạch Kê Tinh',
      'VUỐT RÙA THIÊNG: Kim Quy trao chiếc vuốt làm lẫy nỏ trước khi rẽ nước về biển',
      'TƯỚNG QUÂN CAO LỖ: Chế tạo Nỏ Thần "Linh Quang Kim Quy Thần Cơ"',
      'UY LỰC VẠN QUÂN: Một phát bắn hàng vạn mũi tên đồng tiêu diệt quân Triệu Đà',
      'BIỂU TƯỢNG SỨC MẠNH: Sự hòa quyện giữa thiên thời, địa lợi và trí tuệ Việt'
    ],
    [
      'MƯU KẾ CẦU HÔN: Triệu Đà bại trận, xin giảng hòa và cho Trọng Thủy sang ở rể',
      'TRÁI TIM NGÂY THƠ: Mỵ Châu vì tình riêng mà cho chồng xem lẫy Nỏ Thần bí mật',
      'ĐÁNH TRÁO LẪY NỎ: Trọng Thủy lén tráo vuốt Kim Quy rồi xin về phương Bắc',
      'LÔNG NGỖNG DẪN ĐƯỜNG: "Thiếp có áo lông ngỗng, đi đến đâu sẽ rắc lông ở ngã ba đường"',
      'NỖI ĐAU MẤT NƯỚC: Nỏ thần mất linh, Cổ Loa thất thủ, hai cha con chạy về biển Dạ Sơn',
      'LỜI KẾT TỘI THẦN LINH: "Kẻ nào ngồi sau ngựa chính là giặc đó!"'
    ],
    [
      'OAN HỒN HÓA NGỌC: Máu Mỵ Châu chảy xuống biển Đông, trai ăn phải hóa thành ngọc sáng',
      'GIẾNG NƯỚC LOA THÀNH: Trọng Thủy ôm xác vợ về táng ở Cổ Loa rồi gieo mình xuống giếng',
      'THỦY CHUNG & HỐI HẬN: Ngọc trai biển Đông rửa bằng nước giếng Cổ Loa thì sáng trong',
      'BÀI HỌC CẢNH GIÁC: Đặt vận mệnh quốc gia và chủ quyền dân tộc lên trên tình riêng',
      'KHÔNG GIAN TÁI HIỆN: Thành Cổ Loa 9 vòng xoáy ốc đối diện Biển Đông & Thần Kim Quy',
      'HIỆU NĂNG ĐỒ HỌA: Tối ưu hóa 60+ FPS • Không đổ bóng động • Màu PBR chuẩn'
    ]
  ];

  const tex = getCachedTex(`adv_giant_screen_v10_${index}`, 768, 450, (ctx) => {
    ctx.save();
    ctx.scale(0.5, 0.5);
    const w = 1536;
    const h = 900;
    const bgG = ctx.createLinearGradient(0, 0, w, h);
    bgG.addColorStop(0.0, 'rgba(4, 24, 22, 0.95)');
    bgG.addColorStop(0.5, 'rgba(8, 38, 34, 0.92)');
    bgG.addColorStop(1.0, 'rgba(4, 16, 20, 0.96)');
    ctx.fillStyle = bgG;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 7;
    ctx.strokeRect(16, 16, w - 32, h - 32);

    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 10;
    const corner = 60;
    ctx.beginPath(); ctx.moveTo(16, 16 + corner); ctx.lineTo(16, 16); ctx.lineTo(16 + corner, 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w - 16 - corner, 16); ctx.lineTo(w - 16, 16); ctx.lineTo(w - 16, 16 + corner); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(16, h - 16 - corner); ctx.lineTo(16, h - 16); ctx.lineTo(16 + corner, h - 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w - 16 - corner, h - 16); ctx.lineTo(w - 16, h - 16); ctx.lineTo(w - 16, h - 16 - corner); ctx.stroke();

    ctx.strokeStyle = 'rgba(16, 185, 129, 0.65)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(120, 115);
    ctx.lineTo(w - 120, 115);
    ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 44px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`❖ BẢNG 0${index + 1}: ${titles[index]} ❖`, w / 2, 45);

    ctx.textAlign = 'left';
    const lines = screenLines[index];
    const startY = 175;
    const lineSpacing = 102;

    lines.forEach((line, i) => {
      const parts = line.split(':');
      const label = parts[0] + ':';
      const desc = parts.slice(1).join(':');

      ctx.fillStyle = '#10b981';
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
  });

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.94,
    side: THREE.DoubleSide,
    depthWrite: false,
    fog: false
  });

  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(11.2, 6.5), mat);
  const frameGeo = new THREE.BoxGeometry(11.32, 6.62, 0.08);
  const frameMat = new THREE.MeshBasicMaterial({ color: 0x10b981, wireframe: true, fog: false });
  screenMesh.add(new THREE.Mesh(frameGeo, frameMat));

  return screenMesh;
}

/**
 * HÀM DỰNG KÍN 4 BỨC TƯỜNG NGĂN CÁCH PHÒNG (KHỚP KHÍT 100% KIẾN TRÚC BẢO TÀNG THẬT)
 * - Mở rộng kích thước khớp diện tích khoang Đại Gian Cánh Bắc: Rộng 43.8m x Sâu 27.6m x Cao kịch trần 9.8m
 * - Cửa chính vòm mặt tiền khớp 100% cửa đại vòm bảo tàng: Rộng 8.0m x Cao 7.5m
 */
function buildFullRoomEnclosureWalls(interiorGroup, {
  width = 43.8,
  depth = 27.6,
  height = 9.8,
  doorWidth = 8.0,
  doorHeight = 7.5,
  backWallTex = null,
  leftWallTex = null,
  rightWallTex = null,
  trimColor = 0x10b981,
  signTitle = 'HUYỀN THOẠI AN DƯƠNG VƯƠNG & CỔ LOA THÀNH',
  signSubtitle = 'Truyền thuyết Thời đại Dựng Nước Âu Lạc'
} = {}) {
  const wallGroup = new THREE.Group();
  wallGroup.name = 'ADV_Full_4Walls_Enclosure';

  const backMat = new THREE.MeshBasicMaterial({
    map: backWallTex,
    color: backWallTex ? 0xffffff : 0x062019,
    side: THREE.FrontSide,
    fog: false
  });
  const leftMat = new THREE.MeshBasicMaterial({
    map: leftWallTex || backWallTex,
    color: leftWallTex ? 0xffffff : 0x0a2e24,
    side: THREE.FrontSide,
    fog: false
  });
  const rightMat = new THREE.MeshBasicMaterial({
    map: rightWallTex || backWallTex,
    color: rightWallTex ? 0xffffff : 0x061c24,
    side: THREE.FrontSide,
    fog: false
  });
  const trimMat = new THREE.MeshBasicMaterial({ color: trimColor, fog: false });

  // 1. Tường Hậu Cảnh (Đóng kín sát mép lan can/cột phía sau Z = -depth/2, cao kịch trần 9.8m)
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.28), backMat);
  backWall.position.set(0, height * 0.5, -depth * 0.5);
  wallGroup.add(backWall);

  // 2. Tường Ngăn Bên Trái (Nối liền từ tường cửa vòm đến lan can sau X = -width/2, cao 9.8m)
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.28, height, depth), leftMat);
  leftWall.position.set(-width * 0.5, height * 0.5, 0);
  wallGroup.add(leftWall);

  // 3. Tường Ngăn Bên Phải (Nối liền từ tường cửa vòm đến lan can sau X = +width/2, cao 9.8m)
  const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.28, height, depth), rightMat);
  rightWall.position.set(width * 0.5, height * 0.5, 0);
  wallGroup.add(rightWall);

  // 4. Vách Mặt Tiền (Z = +depth/2): Ốp sát mặt trong tường cửa vòm trắng, khoét đúng khung đại vòm 8.0m x 7.5m
  const wingWidth = (width - doorWidth) * 0.5;
  const leftFrontWing = new THREE.Mesh(new THREE.BoxGeometry(wingWidth, height, 0.28), leftMat);
  leftFrontWing.position.set(-(doorWidth * 0.5 + wingWidth * 0.5), height * 0.5, depth * 0.5);
  wallGroup.add(leftFrontWing);

  const rightFrontWing = new THREE.Mesh(new THREE.BoxGeometry(wingWidth, height, 0.28), rightMat);
  rightFrontWing.position.set(doorWidth * 0.5 + wingWidth * 0.5, height * 0.5, depth * 0.5);
  wallGroup.add(rightFrontWing);

  const lintelHeight = height - doorHeight;
  const doorLintel = new THREE.Mesh(new THREE.BoxGeometry(doorWidth, lintelHeight, 0.28), backMat);
  doorLintel.position.set(0, doorHeight + lintelHeight * 0.5, depth * 0.5);
  wallGroup.add(doorLintel);

  // Khung viền ngọc bích quanh cửa chính vòm bảo tàng
  const leftDoorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.18, doorHeight, 0.34), trimMat);
  leftDoorFrame.position.set(-doorWidth * 0.5, doorHeight * 0.5, depth * 0.5);
  wallGroup.add(leftDoorFrame);

  const rightDoorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.18, doorHeight, 0.34), trimMat);
  rightDoorFrame.position.set(doorWidth * 0.5, doorHeight * 0.5, depth * 0.5);
  wallGroup.add(rightDoorFrame);

  const topDoorFrame = new THREE.Mesh(new THREE.BoxGeometry(doorWidth + 0.36, 0.18, 0.34), trimMat);
  topDoorFrame.position.set(0, doorHeight, depth * 0.5);
  wallGroup.add(topDoorFrame);

  // Biển hiệu tên phòng trưng bày phía trên cổng chính vòm
  const signTex = getCachedTex('adv_entrance_sign_grand', 512, 128, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, w, 0);
    bg.addColorStop(0.0, '#062019');
    bg.addColorStop(0.5, '#0a2e24');
    bg.addColorStop(1.0, '#061c24');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 22px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText(signTitle, w / 2, 48);
    ctx.fillStyle = '#6ee7b7';
    ctx.font = 'italic 16px "Times New Roman", serif';
    ctx.fillText(signSubtitle, w / 2, 88);
  });
  const entranceSign = new THREE.Mesh(
    new THREE.PlaneGeometry(4.8, 1.15),
    new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide, fog: false })
  );
  entranceSign.position.set(0, doorHeight + 0.95, depth * 0.5 + 0.16);
  wallGroup.add(entranceSign);

  interiorGroup.add(wallGroup);
  return wallGroup;
}

export function buildAnDuongVuongExhibition({
  roomCenter = new THREE.Vector3(0, 0, -48),
  glbUrl = '/model/ANDUONGVUONG.glb',
  realmScene = null
} = {}) {
  const root = new THREE.Group();
  root.name = 'AnDuongVuong_Master_Root';
  root.position.set(0, 0, 0);

  let _realmScene = realmScene;
  const candidateGlbUrls = [
    '/models/an_duong_vuong_web.glb',
    '/model/an_duong_vuong_web.glb',
    glbUrl,
    '/model/ANDUONGVUONG.glb',
    '/models/ANDUONGVUONG.glb',
    '/model/anduongvuong.glb',
    '/models/anduongvuong.glb'
  ];

  // =========================================================================
  // PHẦN A: PHÒNG TRƯNG BÀY AN DƯƠNG VƯƠNG (ÁNH SÁNG RIÊNG, SÀN XOÁY ỐC, HIỆN VẬT)
  // =========================================================================
  const roomGroup = new THREE.Group();
  roomGroup.name = 'AnDuongVuong_Museum_Room';
  roomGroup.position.copy(roomCenter);
  root.add(roomGroup);

  // Tự động xoay nội thất hướng mặt tiền (+Z) ra sảnh hành lang chính (0,0,0) để mở thông cửa vòm
  const interiorGroup = new THREE.Group();
  interiorGroup.name = 'ADV_Aligned_Interior';
  // Can chỉnh góc xoay trực giao 100% khớp kiến trúc bảo tàng (không bị méo/xiên)
  let rotY = 0.0;
  if (Math.abs(roomCenter.x) > Math.abs(roomCenter.z)) {
    rotY = roomCenter.x < 0 ? Math.PI / 2 : -Math.PI / 2;
  } else {
    rotY = roomCenter.z < 0 ? 0.0 : Math.PI;
  }
  interiorGroup.rotation.y = rotY;
  roomGroup.add(interiorGroup);

  // -------------------------------------------------------------------------
  // A1. HỆ THỐNG ÁNH SÁNG RIÊNG (60+ FPS, castShadow = false)
  // -------------------------------------------------------------------------
  // Đèn Vàng Kim Quy chiếu Bục Sách Trung Tâm
  const altarGoldLight = new THREE.PointLight(0xfbbf24, 2.8, 22, 1.4);
  altarGoldLight.position.set(0, 5.0, -0.6);
  altarGoldLight.castShadow = false;
  interiorGroup.add(altarGoldLight);

  // Đèn Hoàng Kim chiếu Tượng Vua An Dương Vương
  const kingStatueLight = new THREE.PointLight(0xfde047, 2.6, 20, 1.4);
  kingStatueLight.position.set(0, 5.5, -9.0);
  kingStatueLight.castShadow = false;
  interiorGroup.add(kingStatueLight);

  // Đèn Ngọc Lục Bảo Cổ Loa chiếu cánh Tây
  const coLoaJadeLight = new THREE.PointLight(0x10b981, 2.4, 20, 1.5);
  coLoaJadeLight.position.set(-8.2, 4.8, -4.0);
  coLoaJadeLight.castShadow = false;
  interiorGroup.add(coLoaJadeLight);

  // Đèn Lam Biển Dạ Sơn chiếu cánh Đông
  const seaTurtleLight = new THREE.PointLight(0x38bdf8, 2.4, 20, 1.5);
  seaTurtleLight.position.set(8.2, 4.8, -4.0);
  seaTurtleLight.castShadow = false;
  interiorGroup.add(seaTurtleLight);

  // Đèn Vàng Ấm cửa sảnh vào
  const entranceWarmLight = new THREE.PointLight(0xfef08a, 2.0, 18, 1.5);
  entranceWarmLight.position.set(0, 4.6, 4.8);
  entranceWarmLight.castShadow = false;
  interiorGroup.add(entranceWarmLight);

  // Vòm trần hào quang Xoáy Ốc Cổ Loa bao trùm toàn bộ trần phòng (27.0m x 20.6m)
  const ceilingSpiralTex = getCachedTex('adv_ceiling_spiral_glow_grand', 1024, 1024, (ctx, w, h) => {
    const cx = w / 2, cy = h / 2;
    const g = ctx.createRadialGradient(cx, cy, 20, cx, cy, cx * 0.95);
    g.addColorStop(0.0, 'rgba(253, 224, 71, 0.70)');
    g.addColorStop(0.35, 'rgba(16, 185, 129, 0.40)');
    g.addColorStop(0.70, 'rgba(14, 165, 233, 0.25)');
    g.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(253, 224, 71, 0.75)';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 14; a += 0.08) {
      const r = a * 11.2;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const sx = cx + Math.cos(a) * 360;
      const sy = cy + Math.sin(a) * 360;
      ctx.fillStyle = 'rgba(254, 240, 138, 0.65)';
      ctx.beginPath();
      ctx.arc(sx, sy, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // TRẦN NHÀ ĐẠI GIAN MỞ RỘNG PHỦ KÍN TOÀN BỘ PHÒNG (43.8M x 27.6M) CHẠM KỊCH TRẦN BẢO TÀNG (Y = 9.8M)
  const ceilingCanopy = new THREE.Mesh(
    new THREE.PlaneGeometry(43.8, 27.6),
    new THREE.MeshBasicMaterial({
      map: ceilingSpiralTex,
      side: THREE.DoubleSide,
      fog: false
    })
  );
  ceilingCanopy.rotation.x = Math.PI / 2;
  ceilingCanopy.position.set(0, 9.8, 0);
  interiorGroup.add(ceilingCanopy);

  // Cột sáng Volumetric God-Ray trung tâm rọi xuống Bục Sách
  const centerGodRay = createVolumetricLightBeam(1.0, 3.8, 9.2, 0xfbbf24, 0.28);
  centerGodRay.position.set(0, 4.6, -0.6);
  interiorGroup.add(centerGodRay);

  // -------------------------------------------------------------------------
  // A2. SÀN NHÀ RIÊNG: HỌA TIẾT 9 VÒNG THÀNH CỔ LOA BAO PHỦ 100% CĂN PHÒNG (27.2m x 20.8m)
  // -------------------------------------------------------------------------
  const coLoaSpiralFloorTex = getCachedTex('adv_coloa_spiral_floor_grand', 1024, 1024, (ctx) => {
    ctx.save();
    ctx.scale(0.5, 0.5);
    const w = 2048;
    const h = 2048;
    const bg = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.72);
    bg.addColorStop(0.0, '#0d2d25');
    bg.addColorStop(0.50, '#071e19');
    bg.addColorStop(0.85, '#051416');
    bg.addColorStop(1.0, '#020b0d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2, cy = h / 2;

    // Vành đai hoa văn Đông Sơn ngoài cùng
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 18;
    ctx.strokeRect(24, 24, w - 48, h - 48);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 6;
    ctx.strokeRect(48, 48, w - 96, h - 96);

    // Họa tiết răng cưa saw-tooth và chim Lạc chạy quanh viền
    ctx.fillStyle = '#b45309';
    for (let x = 60; x < w - 60; x += 36) {
      ctx.beginPath();
      ctx.moveTo(x, 50);
      ctx.lineTo(x + 18, 72);
      ctx.lineTo(x + 36, 50);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x, h - 50);
      ctx.lineTo(x + 18, h - 72);
      ctx.lineTo(x + 36, h - 50);
      ctx.fill();
    }
    for (let y = 60; y < h - 60; y += 36) {
      ctx.beginPath();
      ctx.moveTo(50, y);
      ctx.lineTo(72, y + 18);
      ctx.lineTo(50, y + 36);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(w - 50, y);
      ctx.lineTo(w - 72, y + 18);
      ctx.lineTo(w - 50, y + 36);
      ctx.fill();
    }

    // Vẽ 9 vòng thành xoáy trôn ốc Cổ Loa màu Xanh Ngọc Bích (#10b981)
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.82)';
    ctx.lineWidth = 12;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 18; a += 0.05) {
      const r = 40 + a * 15.5;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (a === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Họa tiết 16 mũi tên đồng Liên Châu & Ngôi sao Đông Sơn Vàng Kim Quy (#f59e0b)
    ctx.fillStyle = 'rgba(245, 158, 11, 0.70)';
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 120, cy + Math.sin(a) * 120);
      ctx.lineTo(cx + Math.cos(a - 0.05) * 580, cy + Math.sin(a - 0.05) * 580);
      ctx.lineTo(cx + Math.cos(a) * 720, cy + Math.sin(a) * 720);
      ctx.lineTo(cx + Math.cos(a + 0.05) * 580, cy + Math.sin(a + 0.05) * 580);
      ctx.closePath();
      ctx.fill();
    }

    // Vòng tròn tâm Mandala Đồng Cổ
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(cx, cy, 140, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });

  // SÀN NHÀ RIÊNG: HỌA TIẾT THÀNH CỔ LOA MỞ RỘNG PHỦ KÍN 100% ĐẠI GIAN (43.8M x 27.6M)
  const floorCarpet = new THREE.Mesh(
    new THREE.PlaneGeometry(43.8, 27.6),
    new THREE.MeshBasicMaterial({ map: coLoaSpiralFloorTex, side: THREE.FrontSide, fog: false })
  );
  floorCarpet.rotation.x = -Math.PI / 2;
  floorCarpet.position.set(0, 0.02, 0);
  interiorGroup.add(floorCarpet);

  const floorHaloRing = new THREE.Mesh(
    new THREE.RingGeometry(3.2, 4.6, 48),
    new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false
    })
  );
  floorHaloRing.rotation.x = -Math.PI / 2;
  floorHaloRing.position.set(0, 0.04, -0.6);
  interiorGroup.add(floorHaloRing);

  // -------------------------------------------------------------------------
  // A3. HỆ THỐNG 3 VÁCH PHÙ ĐIÊU KHỔ LỚN BAO TRÙM TOÀN BỘ PHÒNG (HẬU, TRÁI, PHẢI)
  // -------------------------------------------------------------------------
  // 1. Vách Phù Điêu Hậu Cảnh (Back Wall Mural: 27.0m x 8.0m)
  const backMuralTex = getCachedTex('adv_back_mural_wall_grand', 1024, 512, (ctx) => {
    ctx.save();
    ctx.scale(0.5, 0.5);
    const w = 2048;
    const h = 1024;
    const bg = ctx.createLinearGradient(0, 0, w, 0);
    bg.addColorStop(0.0, '#062019');
    bg.addColorStop(0.25, '#0c2d25');
    bg.addColorStop(0.50, '#102538');
    bg.addColorStop(0.75, '#0c2b33');
    bg.addColorStop(1.0, '#061c24');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 16;
    ctx.strokeRect(18, 18, w - 36, h - 36);

    ctx.strokeStyle = 'rgba(16, 185, 129, 0.65)';
    ctx.lineWidth = 6;
    ctx.strokeRect(36, 36, w - 72, h - 72);

    ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
    ctx.lineWidth = 8;
    for (let r = 1; r <= 8; r++) {
      ctx.beginPath();
      ctx.arc(w * 0.22, h * 0.58, r * 46, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(253, 224, 71, 0.55)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(w * 0.50, h * 0.60, 160, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(w * 0.50 + Math.cos(a) * 160, h * 0.60 + Math.sin(a) * 160);
      ctx.lineTo(w * 0.50 + Math.cos(a) * 260, h * 0.60 + Math.sin(a) * 260);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.50)';
    ctx.lineWidth = 8;
    for (let r = 1; r <= 8; r++) {
      ctx.beginPath();
      ctx.arc(w * 0.78, h * 0.65, r * 48, Math.PI * 0.8, Math.PI * 2.2);
      ctx.stroke();
    }

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 56px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText('TRUYỀN THUYẾT AN DƯƠNG VƯƠNG & CỔ LOA THÀNH • ĐẠI ÂU LẠC', w / 2, 105);

    ctx.fillStyle = '#a7f3d0';
    ctx.font = 'italic 34px "Times New Roman", serif';
    ctx.fillText('“Nỏ thần vô ý trao tay giặc • Nên nỗi cơ đồ đắm biển sâu”', w / 2, 175);
    ctx.restore();
  });

  // 2. Vách Phù Điêu Cánh Trái (Cổ Loa Thành 9 Vòng)
  const leftMuralTex = getCachedTex('adv_left_mural_wall_grand', 1024, 512, (ctx) => {
    ctx.save();
    ctx.scale(0.5, 0.5);
    const w = 2048;
    const h = 1024;
    const bg = ctx.createLinearGradient(0, 0, w, 0);
    bg.addColorStop(0.0, '#062019');
    bg.addColorStop(0.5, '#0a2e24');
    bg.addColorStop(1.0, '#061c16');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 14;
    ctx.strokeRect(16, 16, w - 32, h - 32);
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 46px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText('CỬU TRÙNG LOA THÀNH • KỲ QUAN QUÂN SỰ PHÒNG THỦ CỔ ĐẠI', w / 2, 95);
    ctx.fillStyle = '#6ee7b7';
    ctx.font = 'italic 28px "Times New Roman", serif';
    ctx.fillText('Hào sâu lũy dày trôn ốc chín tầng • Linh Quang Thần Cơ muôn mũi tên đồng', w / 2, 155);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.40)';
    ctx.lineWidth = 7;
    for (let r = 1; r <= 6; r++) {
      ctx.beginPath();
      ctx.arc(w * 0.35, h * 0.62, r * 55, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  });

  // 3. Vách Phù Điêu Cánh Phải (Mỵ Châu - Trọng Thủy & Giếng Ngọc)
  const rightMuralTex = getCachedTex('adv_right_mural_wall_grand', 1024, 512, (ctx) => {
    ctx.save();
    ctx.scale(0.5, 0.5);
    const w = 2048;
    const h = 1024;
    const bg = ctx.createLinearGradient(0, 0, w, 0);
    bg.addColorStop(0.0, '#061c24');
    bg.addColorStop(0.5, '#092535');
    bg.addColorStop(1.0, '#051820');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 14;
    ctx.strokeRect(16, 16, w - 32, h - 32);
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 46px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText('HUYỀN TÍCH MỴ CHÂU - TRỌNG THỦY • GIẾNG NGỌC BIỂN ĐÔNG', w / 2, 95);
    ctx.fillStyle = '#93c5fd';
    ctx.font = 'italic 28px "Times New Roman", serif';
    ctx.fillText('Lông ngỗng rải đường ngã ba Dạ Sơn • Ngọc trai rửa nước giếng sáng ngàn thu', w / 2, 155);
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.40)';
    ctx.lineWidth = 7;
    for (let r = 1; r <= 6; r++) {
      ctx.beginPath();
      ctx.arc(w * 0.65, h * 0.62, r * 55, Math.PI * 0.6, Math.PI * 2.4);
      ctx.stroke();
    }
    ctx.restore();
  });

  // 1. HỆ THỐNG TƯỜNG NGĂN CÁCH KHỚP 100% KIẾN TRÚC THẬT BẢO TÀNG (Rộng 43.8m x Sâu 27.6m x Cao kịch trần 9.8m)
  buildFullRoomEnclosureWalls(interiorGroup, {
    width: 43.8,
    depth: 27.6,
    height: 9.8,
    doorWidth: 8.0,
    doorHeight: 7.5,
    backWallTex: backMuralTex,
    leftWallTex: leftMuralTex,
    rightWallTex: rightMuralTex,
    trimColor: 0x10b981,
    signTitle: 'HUYỀN THOẠI AN DƯƠNG VƯƠNG & CỔ LOA THÀNH',
    signSubtitle: 'Truyền thuyết Thời đại Dựng Nước Âu Lạc'
  });

  // A1.0 NÂNG CẤP HỌA TIẾT TƯỜNG 3 TẦNG, PHÀO CHỈ, 4 TRANH PHÙ ĐIÊU & BÌNH PHONG HẮT SÁNG
  upgradeRoomWallArchitecture(interiorGroup, {
    themeKey: 'anDuongVuong',
    roomWidth: 43.8,
    roomDepth: 27.6,
    wallHeight: 9.8
  });

  // A1.1 CỔNG VÒM MÁI ĐAO HOÀNG GIA KÈM HOÀNH PHI CÂU ĐỐI TẠI MẶT TIỀN (Z = +12.0m)
  const advTraditionalArchway = createTraditionalArchwayEntrance({
    roomTitle: 'ÂU LẠC HOÀNG THÀNH',
    leftCouplet: 'Thành ốc chín tầng uy vũ giữ non sông',
    rightCouplet: 'Nỏ thần muôn phát anh linh trừ bạo nghịch',
    archWidth: 6.2,
    archHeight: 4.8
  });
  advTraditionalArchway.position.set(0, 0, 12.0);
  interiorGroup.add(advTraditionalArchway);

  const bronzeMat = new THREE.MeshPhongMaterial({
    color: 0x3d2b1f,
    emissive: 0x171008,
    specular: 0xfbbf24,
    shininess: 75
  });
  const goldMat = new THREE.MeshPhongMaterial({
    color: 0xf59e0b,
    emissive: 0x452804,
    specular: 0xfef08a,
    shininess: 95
  });
  const jadeMat = new THREE.MeshPhongMaterial({
    color: 0x059669,
    emissive: 0x022c22,
    specular: 0x6ee7b7,
    shininess: 85
  });
  const featherWhiteMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc, fog: false });

  // Bệ tượng An Dương Vương (.glb) trang trọng đặt trước bức phù điêu hậu cảnh Z = -8.5m
  const roomStatuePedestal = new THREE.Group();
  roomStatuePedestal.position.set(0, 0, -8.5);
  interiorGroup.add(roomStatuePedestal);

  // Thảm Mandala Cổ Loa & Hoa Sen Ngọc Bích dưới chân tượng An Dương Vương
  const advMandala = createDetailedMandalaFloorDecal('anDuongVuong', 3.6);
  advMandala.position.y = 0.03;
  roomStatuePedestal.add(advMandala);

  const statueBase = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.4, 0.8, 16), bronzeMat);
  statueBase.position.y = 0.40;
  roomStatuePedestal.add(statueBase);

  const statueRim = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.1, 16), goldMat);
  statueRim.position.y = 0.85;
  roomStatuePedestal.add(statueRim);

  const roomGlbHolder = new THREE.Group();
  roomGlbHolder.position.set(0, 0.90, 0);
  roomStatuePedestal.add(roomGlbHolder);

  // Nạp mô hình .glb An Dương Vương chuẩn màu PBR và bảo toàn góc xoay node_0
  loadGlbCached(candidateGlbUrls, { maxTextureSize: 1024 })
    .then((rawScene) => {
      const roomModel = prepareUnlitVividGlbModel(rawScene, {
        targetSpan: 4.2,
        fitAxis: 'maxHorizontal',
        maxTextureSize: 1024
      });
      roomGlbHolder.add(roomModel);

      roomModel.updateMatrixWorld(true);
      if (typeof window !== 'undefined' && window.__museumHitboxManager) {
        window.__museumHitboxManager.createTightClickHitbox(roomModel, {
          loreKey: 'an_duong_vuong_statue',
          isBookPortal: false,
          padding: 0.12
        });
      }
    })
    .catch(() => {});

  // Cột Đồng Cổ Loa cao 7.8m chạy dọc hai bên cánh Đại Gian (Rộng 43.8m)
  const pillarCoords = [
    { pos: new THREE.Vector3(-18.5, 0, -10.5), flameColor: 0xfbbf24 },
    { pos: new THREE.Vector3(18.5, 0, -10.5), flameColor: 0x10b981 },
    { pos: new THREE.Vector3(-18.5, 0, 10.5), flameColor: 0xfbbf24 },
    { pos: new THREE.Vector3(18.5, 0, 10.5), flameColor: 0x38bdf8 }
  ];

  const staticPillarsGroup = new THREE.Group();
  staticPillarsGroup.name = 'ADV_Static_Pillars';
  const sharedColGeo = new THREE.CylinderGeometry(0.40, 0.50, 7.6, 12);
  const sharedCapGeo = new THREE.CylinderGeometry(0.68, 0.46, 0.42, 12);
  const sharedFlameGeo = new THREE.OctahedronGeometry(0.52, 1);

  const torchFlames = [];
  pillarCoords.forEach(({ pos, flameColor }) => {
    const col = new THREE.Mesh(sharedColGeo, bronzeMat);
    col.position.set(pos.x, pos.y + 3.8, pos.z);
    staticPillarsGroup.add(col);

    const capital = new THREE.Mesh(sharedCapGeo, goldMat);
    capital.position.set(pos.x, pos.y + 7.6, pos.z);
    staticPillarsGroup.add(capital);

    const flame = new THREE.Mesh(
      sharedFlameGeo,
      new THREE.MeshBasicMaterial({ color: flameColor, fog: false })
    );
    flame.position.set(pos.x, pos.y + 7.8, pos.z);
    interiorGroup.add(flame);
    torchFlames.push(flame);
  });
  mergeGroupMeshesByMaterial(staticPillarsGroup);
  sharedColGeo.dispose();
  sharedCapGeo.dispose();
  interiorGroup.add(staticPillarsGroup);

  // Hệ thống đèn lồng lụa Cổ Loa Ngọc Bích (InstancedMesh - 1 Draw Call - museumMasterBeautifier)
  const advLanternPositions = [
    new THREE.Vector3(-9.5, 7.6, -7.0),
    new THREE.Vector3(-9.5, 7.6, 7.0),
    new THREE.Vector3(9.5, 7.6, -7.0),
    new THREE.Vector3(9.5, 7.6, 7.0),
    new THREE.Vector3(-14.5, 7.6, 0),
    new THREE.Vector3(14.5, 7.6, 0),
    new THREE.Vector3(0, 7.6, -10.5),
    new THREE.Vector3(0, 7.6, 8.5)
  ];
  const advSilkLanterns = createInstancedSilkLanterns(advLanternPositions, 0x10b981, 0xfbbf24);
  interiorGroup.add(advSilkLanterns);

  // -------------------------------------------------------------------------
  // A4. BỤC SÁCH CỔ TRUNG TÂM & 3D BANNER DỊCH CHUYỂN
  // -------------------------------------------------------------------------
  const bookAltar = new THREE.Group();
  bookAltar.name = 'Interactive_AnDuongVuong_Teleport_Book';
  bookAltar.position.set(0, 0, -0.6);
  bookAltar.userData.isTeleportBook = true;
  bookAltar.userData.targetRealm = 'AN_DUONG_VUONG_REALM';
  bookAltar.userData.isAnDuongVuongTeleportBook = true;
  interiorGroup.add(bookAltar);

  const step1 = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.6, 0.28, 12), bronzeMat);
  step1.position.y = 0.14;
  bookAltar.add(step1);

  const step2 = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 0.32, 12), jadeMat);
  step2.position.y = 0.44;
  bookAltar.add(step2);

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.1, 0.96, 12), bronzeMat);
  pedestal.position.y = 1.08;
  bookAltar.add(pedestal);

  const goldRim = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.1, 12), goldMat);
  goldRim.position.y = 1.58;
  bookAltar.add(goldRim);

  const bookMeshGroup = new THREE.Group();
  bookMeshGroup.position.set(0, 1.80, 0);
  bookMeshGroup.rotation.x = 0.38;
  bookMeshGroup.userData.isTeleportBook = true;
  bookMeshGroup.userData.targetRealm = 'AN_DUONG_VUONG_REALM';

  const pageMat = new THREE.MeshLambertMaterial({ color: 0xecfdf5, emissive: 0x064e3b });
  const pageLeft = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.07, 0.96), pageMat);
  pageLeft.position.x = -0.36;
  pageLeft.rotation.z = -0.15;
  bookMeshGroup.add(pageLeft);

  const pageRight = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.07, 0.96), pageMat);
  pageRight.position.x = 0.36;
  pageRight.rotation.z = 0.15;
  bookMeshGroup.add(pageRight);

  const bookSpine = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 1.0), goldMat);
  bookMeshGroup.add(bookSpine);

  bookAltar.add(bookMeshGroup);
  bookAltar.userData.bookMeshGroup = bookMeshGroup;

  // Cập nhật ma trận thế giới & Bọc Tight Click Hitbox cho Cuốn Sách Dịch Chuyển (padding: 0.12)
  bookMeshGroup.updateMatrixWorld(true);
  if (typeof window !== 'undefined' && window.__museumHitboxManager) {
    window.__museumHitboxManager.createTightClickHitbox(bookMeshGroup, {
      loreKey: 'an_duong_vuong',
      isBookPortal: true,
      portalTargetRealm: 'AN_DUONG_VUONG_REALM',
      padding: 0.12
    });
  }

  const promptBanner = createPortalBanner({
    headerTag: 'CỔNG DỊCH CHUYỂN CỔ LOA',
    title: '📖 CLICK CHUỘT VÀO SÁCH ĐỂ VÀO THẾ GIỚI TÁC PHẨM',
    subtitle: 'Nhấn ESC bất kỳ lúc nào để thoát ra',
    accentColor: '#10b981',
    width: 4.2,
    height: 1.55
  });
  promptBanner.position.set(0, 3.25, 0);
  bookAltar.add(promptBanner);

  // Gán userData bảo vệ cho toàn bộ mesh con của bookAltar
  bookAltar.traverse((child) => {
    if (child.isMesh) {
      child.userData.isTeleportBook = true;
      child.userData.targetRealm = 'AN_DUONG_VUONG_REALM';
      child.userData.isAnDuongVuongTeleportBook = true;
    }
  });

  // -------------------------------------------------------------------------
  // A5. 4 BỆ HIỆN VẬT 3D ĐẶC TRƯNG KÈM CỘT SÁNG GOD-RAYS RIÊNG
  // -------------------------------------------------------------------------
  function createExhibitPedestal(x, z, title, sub, borderCol, rayCol) {
    const pGroup = new THREE.Group();
    pGroup.position.set(x, 0, z);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.18, 1.1, 10), bronzeMat);
    base.position.y = 0.55;
    pGroup.add(base);

    const topRim = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.12, 10), goldMat);
    topRim.position.y = 1.15;
    pGroup.add(topRim);

    // Cột sáng God-Ray rọi thẳng từ trần xuống bệ hiện vật
    const relicRay = createVolumetricLightBeam(0.42, 1.35, 6.8, rayCol, 0.22);
    relicRay.position.y = 4.5;
    pGroup.add(relicRay);

    const plaque = createRelicPlaque(title, sub, borderCol);
    plaque.position.set(0, 0.72, 1.12);
    pGroup.add(plaque);

    interiorGroup.add(pGroup);
    return pGroup;
  }

  // 1. Nỏ Thần Liên Châu (Cao Lỗ chế tạo) - Bệ Hoa Sen Chuẩn Bảo Tàng
  const crossbowGroup = new THREE.Group();
  crossbowGroup.position.y = 0.28;
  const bowStock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 1.45), bronzeMat);
  const bowArc = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.06, 8, 24, Math.PI), goldMat);
  bowArc.rotation.x = Math.PI / 2;
  bowArc.position.z = -0.30;
  const goldenClawTrigger = new THREE.Mesh(
    new THREE.ConeGeometry(0.09, 0.32, 6),
    new THREE.MeshBasicMaterial({ color: 0xfef08a, fog: false })
  );
  goldenClawTrigger.position.set(0, 0.18, 0.28);
  crossbowGroup.add(bowStock, bowArc, goldenClawTrigger);
  const arrowsGroup = new THREE.Group();
  const sharedArrowGeo = new THREE.CylinderGeometry(0.018, 0.018, 1.05, 6);
  for (let aIdx = -2; aIdx <= 2; aIdx++) {
    const arrow = new THREE.Mesh(sharedArrowGeo, goldMat);
    arrow.rotation.x = Math.PI / 2;
    arrow.position.set(aIdx * 0.10, 0.11, -0.12);
    arrowsGroup.add(arrow);
  }
  mergeGroupMeshesByMaterial(arrowsGroup);
  sharedArrowGeo.dispose();
  crossbowGroup.add(arrowsGroup);

  const crossbowStation = createCuratedArtifactStation({
    artifactMesh: crossbowGroup,
    loreKey: 'anDuongVuong_noThan',
    stationTitle: 'NỎ THẦN LIÊN CHÂU',
    stationSubtitle: 'Linh Quang Kim Quy Thần Cơ • Cao Lỗ Chế Tạo',
    position: new THREE.Vector3(-5.0, 0, -3.8),
    accentColor: 0xfbbf24,
    loreGuideInstance: typeof window !== 'undefined' ? window.__loreGuide : null,
    audioDirectorInstance: typeof window !== 'undefined' ? window.__spatialAudio : null
  });
  interiorGroup.add(crossbowStation);

  // 2. Thần Kim Quy (Rùa Vàng trao vuốt thiêng)
  const kimQuyPed = createExhibitPedestal(5.0, -3.8, 'THẦN KIM QUY', 'Sứ Giả Thanh Giang • Trừ Yêu Giữ Thành', '#10b981', 0x10b981);
  const turtleGroup = new THREE.Group();
  turtleGroup.position.y = 1.55;
  const shellMesh = new THREE.Mesh(new THREE.SphereGeometry(0.68, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), goldMat);
  const turtleHead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), goldMat);
  turtleHead.position.set(0, 0.18, 0.68);
  const sacredClaw = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.28, 5), new THREE.MeshBasicMaterial({ color: 0xfef08a, fog: false }));
  sacredClaw.position.set(0, 0.15, 0.84);
  sacredClaw.rotation.x = Math.PI / 3;
  turtleGroup.add(shellMesh, turtleHead, sacredClaw);
  kimQuyPed.add(turtleGroup);

  // 3. Áo Lông Ngỗng Trắng Mỵ Châu
  const featherCloakPed = createExhibitPedestal(-5.0, 2.0, 'ÁO LÔNG NGỖNG MỴ CHÂU', 'Dấu Vết Ngã Ba Đường • Bi Kịch Tình Riêng', '#f8fafc', 0xf8fafc);
  const cloakGroup = new THREE.Group();
  cloakGroup.position.y = 1.70;
  const cloakCone = new THREE.Mesh(new THREE.ConeGeometry(0.52, 1.1, 12, 1, true), featherWhiteMat);
  cloakGroup.add(cloakCone);
  const sharedFeatherGeo = new THREE.PlaneGeometry(0.16, 0.36);
  for (let f = 0; f < 14; f++) {
    const feather = new THREE.Mesh(sharedFeatherGeo, featherWhiteMat);
    const fa = (f / 14) * Math.PI * 2;
    feather.position.set(Math.cos(fa) * 0.60, (f % 3) * 0.18 - 0.1, Math.sin(fa) * 0.60);
    feather.rotation.y = -fa;
    cloakGroup.add(feather);
  }
  mergeGroupMeshesByMaterial(cloakGroup);
  sharedFeatherGeo.dispose();
  featherCloakPed.add(cloakGroup);

  // 4. Giếng Ngọc Trọng Thủy & Trai Ngọc Biển Đông - Bệ Hoa Sen Chuẩn Bảo Tàng
  const wellRim = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.12, 10, 24), jadeMat);
  wellRim.rotation.x = Math.PI / 2;
  wellRim.position.y = 0.28;
  const wellWater = new THREE.Mesh(
    new THREE.CircleGeometry(0.50, 16),
    new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.82, side: THREE.FrontSide, fog: false })
  );
  wellWater.rotation.x = -Math.PI / 2;
  wellWater.position.y = 0.24;
  const glowingPearl = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xe0f2fe, fog: false })
  );
  glowingPearl.position.y = 0.68;
  const pearlWellGroup = new THREE.Group();
  pearlWellGroup.add(wellRim, wellWater, glowingPearl);

  const pearlWellStation = createCuratedArtifactStation({
    artifactMesh: pearlWellGroup,
    loreKey: 'anDuongVuong_giengNgoc',
    stationTitle: 'GIẾNG NGỌC & TRAI CHÂU',
    stationSubtitle: 'Hối Hận Muộn Màng • Ngọc Sáng Nước Giếng',
    position: new THREE.Vector3(5.0, 0, 2.0),
    accentColor: 0x38bdf8,
    loreGuideInstance: typeof window !== 'undefined' ? window.__loreGuide : null,
    audioDirectorInstance: typeof window !== 'undefined' ? window.__spatialAudio : null
  });
  interiorGroup.add(pearlWellStation);

  // Đăng ký thẻ thơ tương tác & Âm thanh không gian 3D cho Nỏ Thần & Giếng Ngọc
  if (typeof window !== 'undefined') {
    window.__loreGuide?.registerArtifact(crossbowStation, 'anDuongVuong_noThan');
    window.__spatialAudio?.attachPositionalSound('anDuongVuong_noThan', crossbowStation, {
      fallbackTheme: 'anDuongVuong',
      refDistance: 7,
      maxDistance: 40
    });
    window.__loreGuide?.registerArtifact(pearlWellStation, 'anDuongVuong_giengNgoc');
  }

  // =========================================================================
  // PHẦN B: ĐẠI CẢNH CÕI CỔ LOA THÀNH & BIỂN DẠ SƠN (SCENE ĐỘC LẬP anDuongVuongScene)
  // =========================================================================
  const advRealmGroup = new THREE.Group();
  advRealmGroup.name = 'AnDuongVuong_Battle_Realm_Master';
  advRealmGroup.position.copy(ADV_REALM_ORIGIN);
  advRealmGroup.visible = true;

  // Ánh sáng riêng độc lập cho Cõi Cổ Loa Thành trong anDuongVuongScene
  const advAmbientLight = new THREE.AmbientLight(0x0e2a22, 1.4);
  advRealmGroup.add(advAmbientLight);

  const advMoonLight = new THREE.DirectionalLight(0xfef08a, 2.0);
  advMoonLight.position.set(-60, 160, 80);
  advMoonLight.castShadow = false;
  advRealmGroup.add(advMoonLight);

  const citadelGlowLight = new THREE.PointLight(0x10b981, 3.0, 140, 1.2);
  citadelGlowLight.position.set(-24, 30, -22);
  citadelGlowLight.castShadow = false;
  advRealmGroup.add(citadelGlowLight);

  const kimQuySeaLight = new THREE.PointLight(0x38bdf8, 3.0, 140, 1.2);
  kimQuySeaLight.position.set(24, 25, -22);
  kimQuySeaLight.castShadow = false;
  advRealmGroup.add(kimQuySeaLight);

  // Đưa thẳng advRealmGroup vào Scene độc lập anDuongVuongScene (KHÔNG nằm trong sảnh bảo tàng)
  if (_realmScene) {
    _realmScene.add(advRealmGroup);
  } else if (typeof window !== 'undefined' && window.__anDuongVuongScene) {
    window.__anDuongVuongScene.add(advRealmGroup);
  } else {
    root.add(advRealmGroup);
  }

  const skyTex = getCachedTex('adv_realm_sky_dome', 1024, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0.0, '#031210');
    g.addColorStop(0.40, '#072a24');
    g.addColorStop(0.75, '#0c3b42');
    g.addColorStop(1.0, '#051923');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(240, 32, 24),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, depthWrite: false, fog: false })
  );
  skyDome.position.set(0, 15, -30);
  advRealmGroup.add(skyDome);

  // =========================================================================
  // THẾ GIỚI CỔ LOA THÀNH MỚI: 3 VÒNG THÀNH XOẮN ỐC, TƯỢNG AN DƯƠNG VƯƠNG, NỎ THẦN, HỒ KIM QUY, GIẾNG NGỌC
  // Tích hợp từ createAnDuongVuongWorld (src/worlds/anDuongVuongWorld.js)
  // =========================================================================
  const coLoaWorldInstance = createAnDuongVuongWorld(advRealmGroup, {
    worldOrigin: new THREE.Vector3(0, 0, 0),
    camera: null,
    domElement: typeof document !== 'undefined' ? document.body : null
  });

  // Cổng Trở Về với Tinh thể ngọc xanh ở lối vào phía Nam thành Cổ Loa (Z = 16.0m)
  const returnPortalGroup = new THREE.Group();
  returnPortalGroup.position.set(0, 0.2, 16.0);
  advRealmGroup.add(returnPortalGroup);

  const crystalMesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.55, 0),
    new THREE.MeshBasicMaterial({ color: 0x10b981, fog: false })
  );
  crystalMesh.position.y = 1.25;
  crystalMesh.userData = { isReturnPortal: true, action: 'RETURN_TO_MUSEUM' };
  returnPortalGroup.add(crystalMesh);

  const returnLabel = createPortalBanner({
    headerTag: 'CỔNG TRỞ VỀ',
    title: '↩ QUAY VỀ BẢO TÀNG (Nhấn phím ESC)',
    subtitle: 'Click vào tinh thể ngọc hoặc nhấn phím ESC',
    accentColor: '#facc15',
    width: 3.6,
    height: 1.35
  });
  returnLabel.position.set(0, 2.4, 0);
  returnPortalGroup.add(returnLabel);

  // 140 Hạt lông ngỗng Mỵ Châu & Linh khí Cổ Loa Thành (1 Draw Call InstancedMesh - museumMasterBeautifier)
  const advParticles = createDetailedInstancedParticles('anDuongVuong', 140, 42, 32);
  if (advParticles) {
    if (advParticles.position) {
      advParticles.position.set(0, 10, -20);
    }
    advRealmGroup.add(advParticles);
  }

  // =========================================================================
  // PHẦN C: LOGIC DỊCH CHUYỂN & ĐỒNG BỘ PORTALINTERACTION (CLICK SÁCH & PHÍM ESC)
  // =========================================================================
  let _scene = null;
  let _camera = null;
  let _renderer = null;
  let _cameraManager = null;
  let _isInsideRealm = false;
  let _isTransitioning = false;

  let _savedFog = null;
  let _savedBackground = null;
  let _savedExposure = 1.0;

  const localReturnOffset = new THREE.Vector3(0, 1.7, 6.8).applyAxisAngle(
    new THREE.Vector3(0, 1, 0),
    interiorGroup.rotation.y
  );
  const museumReturnCamPos = roomCenter.clone().add(localReturnOffset);
  const museumBookTarget = new THREE.Vector3(roomCenter.x, roomCenter.y + 1.5, roomCenter.z);

  const realmObservationCamPos = ADV_REALM_ORIGIN.clone().add(ADV_OBS_PLATFORM_OFFSET);
  const realmObservationLookAt = ADV_REALM_ORIGIN.clone().add(ADV_OBS_LOOK_TARGET_OFFSET);

  function createOrGetRealmTopHUD() {
    if (typeof document === 'undefined') return null;
    let hud = document.getElementById('adv-realm-top-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'adv-realm-top-hud';
      hud.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        display: none; align-items: center; gap: 18px;
        background: rgba(4, 24, 22, 0.90); border: 2px solid #10b981;
        padding: 10px 24px; border-radius: 30px; z-index: 99999;
        box-shadow: 0 0 24px rgba(16, 185, 129, 0.45); backdrop-filter: blur(8px);
        font-family: 'Segoe UI', sans-serif;
      `;
      hud.innerHTML = `
        <span style="color: #fde047; font-weight: bold; font-size: 15px; letter-spacing: 1px;">🏹 CÕI CỔ LOA THÀNH • AN DƯƠNG VƯƠNG 🐢</span>
        <button id="adv-btn-exit-realm" style="
          background: linear-gradient(135deg, #059669, #065f46);
          color: #ffffff; border: 1px solid #34d399; padding: 6px 16px;
          border-radius: 20px; font-weight: bold; font-size: 13px; cursor: pointer;
        ">↩ QUAY VỀ BẢO TÀNG (Nhấn phím ESC)</button>
      `;
      document.body.appendChild(hud);
      document.getElementById('adv-btn-exit-realm')?.addEventListener('click', (e) => {
        e.stopPropagation();
        exitRealm();
      });
    }
    return hud;
  }

  function enterRealm() {
    if (_isInsideRealm || _isTransitioning) return;
    _isTransitioning = true;

    const cam = _camera || window.__camera;
    const ctrl = _cameraManager?.controls || window.__controls;
    const camCtrl = _cameraManager?.cameraController || window.__cameraController;

    playBookVortexCutscene({
      camera: cam,
      cameraController: camCtrl,
      controls: ctrl,
      bookMesh: bookAltar,
      themeColor: 0x10b981,
      onTransition: () => {
        _isInsideRealm = true;

        // CHUYỂN HOÁN SCENE: Đưa Scene Cõi Cổ Loa Thành lên Active Scene (cách ly 100% bảo tàng)
        const targetScene = _realmScene || window.__anDuongVuongScene;
        if (window.__app?.setActiveScene && targetScene) {
          window.__app.setActiveScene(targetScene);
        }

        roomGroup.visible = false;
        advRealmGroup.visible = true;

        if (typeof window !== 'undefined') {
          window.__spatialAudio?.playRealmSoundscape('anDuongVuong_noThan');
        }

        if (_scene) {
          _savedFog = _scene.fog;
          _savedBackground = _scene.background;
          _scene.fog = null;
          _scene.background = new THREE.Color(0x031210);
        }

        if (_renderer) {
          _savedExposure = _renderer.toneMappingExposure ?? 1.0;
          _renderer.toneMappingExposure = 1.15;
        }

        if (camCtrl) {
          camCtrl.setFloorHeightProvider?.(() => 420.0);
          camCtrl.floorHeightProvider = () => 420.0;
          camCtrl.velocity?.set?.(0, 0, 0);
        }

        if (cam) {
          cam.position.copy(realmObservationCamPos);
          cam.lookAt(realmObservationLookAt);
        }

        if (ctrl) {
          ctrl.target.copy(realmObservationLookAt);
          ctrl.update();
          ctrl.enabled = true;
        }

        if (camCtrl) {
          camCtrl.isEnabled = true;
        }

        const topHud = createOrGetRealmTopHUD();
        if (topHud) topHud.style.display = 'flex';
      },
      onComplete: () => {
        _isTransitioning = false;
        if (ctrl) ctrl.enabled = true;
        if (camCtrl) camCtrl.isEnabled = true;
      }
    });
  }

  function exitRealm() {
    if (!_isInsideRealm || _isTransitioning) return;
    _isTransitioning = true;

    const cam = _camera || window.__camera;

    if (document.exitPointerLock) {
      try { document.exitPointerLock(); } catch (e) {}
    }
    if (_cameraManager?.controls) _cameraManager.controls.enabled = false;
    if (_cameraManager?.cameraController) _cameraManager.cameraController.isEnabled = false;

    const topHud = createOrGetRealmTopHUD();
    if (topHud) topHud.style.display = 'none';

    // Chạy Cutscene thu hồi từ Thế Giới và bay ngược từ giữa trang sách ra Bảo Tàng
    playBookReturnCutscene({
      camera: cam,
      bookObject: bookAltar,
      returnCamPos: museumReturnCamPos,
      lookTargetPos: museumBookTarget,
      themeColorHex: '#10b981',
      onSwapScene: () => {
        _isInsideRealm = false;

        // CHUYỂN HOÁN SCENE: Đưa Sảnh Bảo Tàng (mainScene) về Active Scene
        if (typeof window !== 'undefined' && window.__app?.setActiveScene && window.__app.mainScene) {
          window.__app.setActiveScene(window.__app.mainScene);
        }

        advRealmGroup.visible = false;
        roomGroup.visible = true;
        roomGroup.updateMatrixWorld(true);

        if (typeof window !== 'undefined') {
          window.__spatialAudio?.stopAllSounds();
        }

        if (_scene) {
          _scene.fog = _savedFog || new THREE.FogExp2(0xdca878, 0.00075);
          _scene.background = _savedBackground || new THREE.Color(0xdca878);
        }

        if (_renderer) {
          _renderer.toneMappingExposure = _savedExposure || 1.0;
        }

        if (_cameraManager?.cameraController) {
          _cameraManager.cameraController.setFloorHeightProvider?.(null);
          _cameraManager.cameraController.floorHeightProvider = null;
          _cameraManager.cameraController.velocity?.set?.(0, 0, 0);
        }
      },
      onComplete: () => {
        if (cam) {
          cam.position.copy(museumReturnCamPos);
          cam.lookAt(museumBookTarget);
        }
        if (_cameraManager?.controls) {
          _cameraManager.controls.target.copy(museumBookTarget);
          _cameraManager.controls.update();
          _cameraManager.controls.enabled = true;
        }
        if (_cameraManager?.cameraController) {
          _cameraManager.cameraController.velocity?.set?.(0, 0, 0);
          _cameraManager.cameraController.isEnabled = true;
        }
        _isTransitioning = false;
      }
    });
  }

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  function onPointerClick(e) {
    if (_isTransitioning) return;
    if (e.target.closest('#adv-realm-top-hud') || e.target.closest('#director-hud')) return;

    if (_isInsideRealm) {
      e.stopPropagation();
      const cam = _camera || window.__camera;
      if (!cam) return;

      if (document.pointerLockElement) {
        mouse.set(0, 0);
      } else {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      }
      raycaster.setFromCamera(mouse, cam);

      const portalIntersects = intersectInteractiveTargetsOnly(raycaster, returnPortalGroup);
      if (portalIntersects.length > 0) {
        exitRealm();
        return;
      }

      if (coLoaWorldInstance?.raycastTargets) {
        const artifactIntersects = raycaster.intersectObjects(coLoaWorldInstance.raycastTargets, true);
        if (artifactIntersects.length > 0) {
          let hit = artifactIntersects[0].object;
          while (hit && !hit.userData?.isArtifactProxy && hit.parent) {
            hit = hit.parent;
          }
          if (hit && hit.userData?.isArtifactProxy && hit.userData.loreKey) {
            coLoaWorldInstance.showLore?.(hit.userData.loreKey);
            return;
          }
        }
      }
      return;
    }

    const cam = _camera || window.__camera;
    if (!cam) return;
    if (!roomGroup.visible || cam.position.distanceToSquared(roomCenter) > 32 * 32) return;

    if (document.pointerLockElement) {
      mouse.set(0, 0);
    } else {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }
    raycaster.setFromCamera(mouse, cam);

    const intersects = raycaster.intersectObjects(bookAltar.children, true);
    if (intersects.length > 0 && intersects[0].distance < 18) {
      enterRealm();
    }
  }

  function onKeyDown(e) {
    if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
    if ((e.code === 'Escape' || e.key === 'Escape') && _isInsideRealm) {
      exitRealm();
    }
  }

  function onPointerLockChange() {
    if (!document.pointerLockElement && _isInsideRealm && !_isTransitioning) {
      exitRealm();
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('click', onPointerClick);
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerlockchange', onPointerLockChange);
  }

  // Đăng ký chuẩn 3 tham số với PortalInteraction (targetRealm: 'AN_DUONG_VUONG_REALM')
  const portalBookMeta = {
    id: 'an_duong_vuong',
    title: 'AN DƯƠNG VƯƠNG & THÀNH CỔ LOA',
    author: 'Kho tàng Truyền thuyết Lịch sử Việt Nam',
    genre: 'Truyền thuyết Thời đại Âu Lạc • Thế kỷ III TCN',
    quote: '"Nỏ thần vô ý trao tay giặc, nên nỗi cơ đồ đắm biển sâu..."',
    themeColor: 0x10b981,
    targetRealm: 'AN_DUONG_VUONG_REALM',
    portalReady: true,
    onActivate: () => enterRealm()
  };

  registerInteractiveBook(bookAltar, realmObservationCamPos, portalBookMeta);

  // =========================================================================
  // PHẦN D: VÒNG LẶP ANIMATION (60 FPS) & CÁC PHƯƠNG THỨC CẤP CAO CỦA ROOT
  // =========================================================================
  let clockTime = 0;

  root.update = function(delta = 0.016, elapsedTime = 0, camera = null) {
    if (camera) _camera = camera;
    clockTime += delta;

    if (!_isInsideRealm) {
      if (!roomGroup.visible) return;
      const cam = _camera || (typeof window !== 'undefined' ? window.__camera : null);
      if (cam && cam.position.distanceToSquared(roomCenter) > 42 * 42) return;

      promptBanner.position.y = 3.05 + Math.sin(clockTime * 2.5) * 0.05;
      bookMeshGroup.position.y = 1.72 + Math.sin(clockTime * 2.2) * 0.05;
      floorHaloRing.rotation.z += delta * 0.45;
      // ceilingCanopy rotation removed to preserve orthogonal alignment
      crossbowGroup.rotation.y = Math.sin(clockTime * 1.2) * 0.25;
      glowingPearl.position.y = 1.68 + Math.sin(clockTime * 2.8) * 0.08;

      torchFlames.forEach((f, idx) => {
        f.rotation.y += delta * 2.2;
        const s = 1.0 + Math.sin(clockTime * 6.0 + idx) * 0.14;
        f.scale.set(s, s, s);
      });

      if (advSilkLanterns && advSilkLanterns.update) {
        advSilkLanterns.update(delta, clockTime);
      }
      return;
    }

    if (!advRealmGroup.visible) return;

    // Chuyển động trong Thế Giới Cổ Loa Thành Mới
    if (coLoaWorldInstance && coLoaWorldInstance.update) {
      coLoaWorldInstance.update(delta, clockTime);
    }
    if (advParticles && advParticles.update) {
      advParticles.update(delta, clockTime);
    }

    crystalMesh.rotation.y += delta * 1.2;
    returnLabel.position.y = 2.4 + Math.sin(clockTime * 2.5) * 0.05;
  };

  // Khai báo root.getGroup = () => roomGroup ở cấp ngoài cùng trước return root
  root.enterRealm = enterRealm;
  root.exitRealm = exitRealm;
  root.teleportBook = bookAltar;
  root.isInsideRealm = () => _isInsideRealm;
  root.updateRealm = root.update;
  root.getGroup = function() {
    return roomGroup;
  };

  root.setupContext = function({
    scene = null,
    realmScene = null,
    camera = null,
    renderer = null,
    cameraManager = null,
    portalInteraction = null
  } = {}) {
    if (scene) _scene = scene;
    if (camera) _camera = camera;
    if (renderer) _renderer = renderer;
    if (cameraManager) _cameraManager = cameraManager;

    if (realmScene) {
      _realmScene = realmScene;
      if (advRealmGroup.parent !== _realmScene) {
        advRealmGroup.parent?.remove?.(advRealmGroup);
        _realmScene.add(advRealmGroup);
      }
    }

    if (portalInteraction) {
      portalInteraction.registerInteractiveBook(bookAltar, realmObservationCamPos, portalBookMeta);
    }
    if (typeof window !== 'undefined') {
      window.__loreGuide?.registerArtifact(crossbowStation, 'anDuongVuong_noThan');
      window.__spatialAudio?.attachPositionalSound('anDuongVuong_noThan', crossbowStation, {
        fallbackTheme: 'anDuongVuong',
        refDistance: 7,
        maxDistance: 40
      });
      window.__loreGuide?.registerArtifact(pearlWellStation, 'anDuongVuong_giengNgoc');
    }
  };

  // Dọn dẹp tài nguyên GPU triệt để khi hủy phòng (fps-optimizer & museumMasterBeautifier)
  root.dispose = function() {
    if (coLoaWorldInstance?.dispose) coLoaWorldInstance.dispose();
    disposeSceneBranch(roomGroup);
    disposeSceneBranch(advRealmGroup);
  };

  return root;
}
