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

const prepareUnlitVividGlbModel = styleAndNormalizeGlbModel;

/**
 * =============================================================================
 * VỢ NHẶT (KIM LÂN): PHÒNG TRƯNG BÀY QUÊ NGHÈO ẤM ÁP & CÕI BÌNH MINH (60+ FPS)
 * - Ánh sáng riêng: Cam Ấm Đèn Dầu (#fb923c) • Vàng Rơm (#eab308) • Đỏ Cờ Việt Minh (#ef4444)
 * - Sàn, Tường, Trần riêng: Nền đất nện & Chiếu cói tân hôn, Vách đất trát rơm, Trần mái tranh
 * - Hiện vật 3D: Nồi chè khoán & Bánh đúc, Đèn dầu tân hôn, Xe bò thóc, Cờ đỏ sao vàng
 * - Tương tác click chuột vào Sách & phím ESC để thoát
 * =============================================================================
 */

export const VN_REALM_ORIGIN = new THREE.Vector3(-260, 420, -450);
export const VN_OBS_PLATFORM_OFFSET = new THREE.Vector3(0, 4.0, 32);
export const VN_OBS_LOOK_TARGET_OFFSET = new THREE.Vector3(0, 9.5, -24);

const VN_CACHE = {};

function getCachedTex(key, w, h, drawFn, repeatX = 1, repeatY = 1) {
  if (VN_CACHE[key]) return VN_CACHE[key];
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
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  VN_CACHE[key] = tex;
  return tex;
}

function createVolumetricLightBeam(topRadius, bottomRadius, height, colorHex, opacity = 0.25) {
  const beamTex = getCachedTex(`vn_godray_${colorHex}`, 64, 256, (ctx, w, h) => {
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
  headerTag = 'CỔNG DỊCH CHUYỂN VĂN HỌC',
  title = '📖 CLICK CHUỘT VÀO SÁCH ĐỂ VÀO THẾ GIỚI TÁC PHẨM',
  subtitle = 'Nhấn ESC bất kỳ lúc nào để thoát ra',
  accentColor = '#fb923c',
  width = 3.8,
  height = 1.45
} = {}) {
  const tex = getCachedTex(`vn_banner_${title}`, 512, 220, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(28, 17, 10, 0.94)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 5;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    ctx.fillStyle = accentColor;
    ctx.font = 'bold 18px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`◈ ${headerTag} ◈`, w / 2, 42);

    ctx.fillStyle = '#fffbeb';
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

function createRelicPlaque(title, subtitle, borderColor = '#fb923c') {
  const tex = getCachedTex(`vn_plaque_${title}`, 512, 140, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(30, 18, 10, 0.95)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 5;
    ctx.strokeRect(6, 6, w - 12, h - 12);

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 24px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, w / 2, 52);

    ctx.fillStyle = '#ffedd5';
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
    'TÁC GIẢ KIM LÂN & HOÀN CẢNH RA ĐỜI',
    'CUỘC "NHẶT VỢ" KỲ LẠ GIỮA NẠN ĐÓI 1945',
    'TẤM LÒNG BÀ CỤ TỨ & BỮA CƠM NGÀY ĐÓI',
    'LÁ CỜ ĐỎ & KHÁT VỌNG SỐNG BẤT DIỆT'
  ];

  const screenLines = [
    [
      'TÊN TÁC PHẨM: VỢ NHẶT (In trong tập "Con chó xấu xí" - 1962)',
      'TÁC GIẢ: Nhà văn Kim Lân (1920 – 2007) • Cây bút viết về nông thôn Việt Nam',
      'TIỀN THÂN: Viết từ tiểu thuyết "Xóm ngụ cư" ngay sau Cách mạng tháng Tám',
      'BỐI CẢNH LỊCH SỬ: Nạn đói khủng khiếp năm Ất Dậu 1945 ở miền Bắc',
      'KHÔNG GIAN NGHỆ THUẬT: Xóm ngụ cư tiêu điều trong buổi chiều chạng vạng',
      'CHỦ ĐỀ CỐT LÕI: Ánh sáng tình người và khát vọng sống vượt lên bờ vực cái chết'
    ],
    [
      'NHÂN VẬT TRÀNG: Dân ngụ cư nghèo khổ, thô kệch, đẩy xe bò thóc thuê',
      'CÂU HÒ ĐÙA: "Muốn ăn cơm trắng mấy giò này! Lại đây mà đẩy xe bò với anh"',
      'LẦN GẶP THỨ HAI: Thị rách rưới như tổ đỉa, ăn một chặp bốn bát bánh đúc',
      'QUYẾT ĐỊNH TÁO BẠO: Giữa lúc đói khát, Tràng "đèo bòng" đưa thị về làm vợ',
      'DỌC ĐƯỜNG VỀ XÓM: Sự ngỡ ngàng của dân xóm ngụ cư trước đôi vợ chồng mới',
      'SỰ THAY ĐỔI KỲ DIỆU: Người vợ nhặt trở nên e thẹn, hiền hậu và vun vén cửa nhà'
    ],
    [
      'NỖI LÒNG NGƯỜI MẸ: Bà cụ Tứ đi từ ngạc nhiên, xót thương đến mừng tủi',
      'TÌNH THƯƠNG BAO LA: "Người ta có gặp bước khó khăn, đói khổ này, người ta mới lấy đến con mình"',
      'ĐÊM TÂN HÔN: Ngọn đèn dầu vặn nhỏ ấm áp xua tan cái lạnh lẽo của xóm nghèo',
      'BUỔI SÁNG HÔM SAU: Sân vườn sạch sẽ, tiếng chổi quét sân, nước gánh đầy chum',
      'MÓN "CHÈ KHOÁN": Nồi chè cám đắng chát nghẹn cổ nhưng chan chứa yêu thương',
      'NIỀM TIN TƯƠNG LAI: "Ai giàu ba họ, ai khó ba đời" • Bà cụ toàn nói chuyện vui'
    ],
    [
      'TIẾNG TRỐNG THÚC THUẾ: Dồn dập, dữ dội nhưng không còn làm người ta tuyệt vọng',
      'TIN VUI VIỆT MINH: Đoàn người đi trên đê phá kho thóc Nhật chia cho người đói',
      'HÌNH ẢNH KẾT TRUYỆN: Trong óc Tràng vẫn thấy đám người đói và lá cờ đỏ bay phấp phới',
      'GIÁ TRỊ HIỆN THỰC: Tố cáo tội ác thực dân - phát xít đẩy dân ta vào nạn đói 1945',
      'GIÁ TRỊ NHÂN ĐẠO: Ca ngợi vẻ đẹp tâm hồn, tình nghĩa vợ chồng, tình mẫu tử thiêng liêng',
      'PHONG CÁCH NGHỆ THUẬT: Tình huống truyện độc đáo, ngôn ngữ mộc mạc, giàu sức gợi'
    ]
  ];

  const tex = getCachedTex(`vn_giant_screen_v10_${index}`, 768, 450, (ctx) => {
    ctx.save();
    ctx.scale(0.5, 0.5);
    const w = 1536;
    const h = 900;
    const bgG = ctx.createLinearGradient(0, 0, w, h);
    bgG.addColorStop(0.0, 'rgba(32, 18, 8, 0.95)');
    bgG.addColorStop(0.5, 'rgba(45, 24, 12, 0.92)');
    bgG.addColorStop(1.0, 'rgba(24, 12, 6, 0.96)');
    ctx.fillStyle = bgG;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 7;
    ctx.strokeRect(16, 16, w - 32, h - 32);

    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 10;
    const corner = 60;
    ctx.beginPath(); ctx.moveTo(16, 16 + corner); ctx.lineTo(16, 16); ctx.lineTo(16 + corner, 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w - 16 - corner, 16); ctx.lineTo(w - 16, 16); ctx.lineTo(w - 16, 16 + corner); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(16, h - 16 - corner); ctx.lineTo(16, h - 16); ctx.lineTo(16 + corner, h - 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w - 16 - corner, h - 16); ctx.lineTo(w - 16, h - 16); ctx.lineTo(w - 16, h - 16 - corner); ctx.stroke();

    ctx.strokeStyle = 'rgba(251, 146, 60, 0.65)';
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

      ctx.fillStyle = '#ef4444';
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
  const frameMat = new THREE.MeshBasicMaterial({ color: 0xfb923c, wireframe: true, fog: false });
  screenMesh.add(new THREE.Mesh(frameGeo, frameMat));

  return screenMesh;
}

/**
 * HÀM DỰNG KÍN 4 BỨC TƯỜNG NGĂN CÁCH PHÒNG (KHỚP KHÍT 100% KIẾN TRÚC BẢO TÀNG THẬT)
 * - Mở rộng kích thước khớp diện tích khoang phòng thật: Rộng 25.8m x Sâu 27.6m x Cao kịch trần 9.8m
 * - Cửa chính vòm mặt tiền khớp 100% cửa vòm bảo tàng: Rộng 6.2m x Cao 7.5m
 */
function buildFullRoomEnclosureWalls(interiorGroup, {
  width = 25.8,
  depth = 27.6,
  height = 9.8,
  doorWidth = 6.2,
  doorHeight = 7.5,
  backWallTex = null,
  leftWallTex = null,
  rightWallTex = null,
  trimColor = 0xd97706,
  signTitle = 'VĂN HỌC HIỆN THỰC 1945: VỢ NHẶT (KIM LÂN)',
  signSubtitle = 'Khát vọng sống và tình người cưu mang vượt lên bờ vực cái chết'
} = {}) {
  const wallGroup = new THREE.Group();
  wallGroup.name = 'VN_Full_4Walls_Enclosure';

  const backMat = new THREE.MeshBasicMaterial({
    map: backWallTex,
    color: backWallTex ? 0xffffff : 0x2e1d0f,
    side: THREE.FrontSide,
    fog: false
  });
  const leftMat = new THREE.MeshBasicMaterial({
    map: leftWallTex || backWallTex,
    color: leftWallTex ? 0xffffff : 0x362212,
    side: THREE.FrontSide,
    fog: false
  });
  const rightMat = new THREE.MeshBasicMaterial({
    map: rightWallTex || backWallTex,
    color: rightWallTex ? 0xffffff : 0x362212,
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

  // 4. Vách Mặt Tiền (Z = +depth/2): Ốp sát mặt trong tường cửa vòm trắng, khoét đúng khung vòm 6.2m x 7.5m
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

  // Khung viền tre quanh cửa chính vòm bảo tàng
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
  const signTex = getCachedTex('vn_entrance_sign_grand', 512, 128, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, w, 0);
    bg.addColorStop(0.0, '#362212');
    bg.addColorStop(0.5, '#452612');
    bg.addColorStop(1.0, '#4c1414');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, w - 12, h - 12);
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 22px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText(signTitle, w / 2, 48);
    ctx.fillStyle = '#ffedd5';
    ctx.font = 'italic 16px "Times New Roman", serif';
    ctx.fillText(signSubtitle, w / 2, 88);
  });
  const entranceSign = new THREE.Mesh(
    new THREE.PlaneGeometry(4.6, 1.15),
    new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide, fog: false })
  );
  entranceSign.position.set(0, doorHeight + 0.95, depth * 0.5 + 0.16);
  wallGroup.add(entranceSign);

  interiorGroup.add(wallGroup);
  return wallGroup;
}

export function buildVoNhatExhibition({
  roomCenter = new THREE.Vector3(48.0, 20.0, -19.0),
  glbUrl = '/model/vonhat.glb',
  realmScene = null
} = {}) {
  let _realmScene = realmScene;
  const root = new THREE.Group();
  root.name = 'VoNhat_Master_Root';
  root.position.set(0, 0, 0);

  const candidateGlbUrls = [
    glbUrl,
    '/model/vonhat.glb',
    '/models/vonhat.glb',
    '/model/VoNhat.glb',
    '/models/VoNhat.glb'
  ];

  // =========================================================================
  // PHẦN A: PHÒNG TRƯNG BÀY "VỢ NHẶT" (TRẦN MÁI TRANH, TƯỜNG ĐẤT RƠM, SÀN CHIẾU CÓI)
  // =========================================================================
  const roomGroup = new THREE.Group();
  roomGroup.name = 'VoNhat_Museum_Room';
  roomGroup.position.copy(roomCenter);
  root.add(roomGroup);

  // Tự động xoay nội thất hướng mặt tiền (+Z) ra sảnh hành lang chính (0,0,0)
  const interiorGroup = new THREE.Group();
  interiorGroup.name = 'VN_Aligned_Interior';
  if (Math.abs(roomCenter.x) >= Math.abs(roomCenter.z)) {
    interiorGroup.rotation.y = roomCenter.x < 0 ? Math.PI / 2 : -Math.PI / 2;
  } else {
    interiorGroup.rotation.y = roomCenter.z < 0 ? 0 : Math.PI;
  }
  roomGroup.add(interiorGroup);

  // -------------------------------------------------------------------------
  // A1. HỆ THỐNG ÁNH SÁNG RIÊNG (NGỌN ĐÈN DẦU CAM ẤM, RƠM VÀNG & CỜ ĐỎ BÌNH MINH)
  // -------------------------------------------------------------------------
  // 1. Đèn trung tâm: Ánh lửa đèn dầu đêm tân hôn (Cam Vàng ấm áp)
  const oilLampWarmLight = new THREE.PointLight(0xfb923c, 2.9, 19, 1.4);
  oilLampWarmLight.position.set(0, 4.5, 0.5);
  oilLampWarmLight.castShadow = false;
  interiorGroup.add(oilLampWarmLight);

  // 2. Đèn cánh trái: Ánh vàng rơm chiều xóm ngụ cư
  const strawGoldLight = new THREE.PointLight(0xeab308, 2.3, 17, 1.5);
  strawGoldLight.position.set(-5.2, 4.0, -1.5);
  strawGoldLight.castShadow = false;
  interiorGroup.add(strawGoldLight);

  // 3. Đèn cánh phải: Ánh đỏ bình minh & lá cờ phá kho thóc
  const dawnRedLight = new THREE.PointLight(0xef4444, 2.4, 17, 1.5);
  dawnRedLight.position.set(5.2, 4.0, -1.5);
  dawnRedLight.castShadow = false;
  interiorGroup.add(dawnRedLight);

  // -------------------------------------------------------------------------
  // A2. TRẦN NHÀ RIÊNG: MÁI TRANH RƠM VÀNG & QUẦNG SÁNG ĐÈN DẦU ẤM ÁP
  // -------------------------------------------------------------------------
  const thatchCeilingTex = getCachedTex('vn_thatch_ceiling_tex', 512, 512, (ctx, w, h) => {
    // Nền mái tranh rơm nâu vàng đặc trưng của mái nhà bà cụ Tứ
    const bg = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.65);
    bg.addColorStop(0.0, '#78350f');
    bg.addColorStop(0.5, '#451a03');
    bg.addColorStop(1.0, '#1c0f06');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Các nan tre và sợi rơm đan chéo trên trần nhà
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.28)';
    ctx.lineWidth = 3;
    for (let y = 0; y < h; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.22)';
    ctx.lineWidth = 2;
    for (let x = 0; x < w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 12, h);
      ctx.stroke();
    }

    // Quầng sáng ấm của ngọn đèn dầu và ánh bình minh ở tâm trần
    const cx = w / 2, cy = h / 2;
    const glow = ctx.createRadialGradient(cx, cy, 8, cx, cy, cx * 0.75);
    glow.addColorStop(0.0, 'rgba(254, 240, 138, 0.85)');
    glow.addColorStop(0.45, 'rgba(251, 146, 60, 0.45)');
    glow.addColorStop(0.80, 'rgba(239, 68, 68, 0.20)');
    glow.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, cx * 0.75, 0, Math.PI * 2);
    ctx.fill();
  });

  // TRẦN NHÀ MỞ RỘNG PHỦ KÍN TOÀN BỘ PHÒNG (25.8M x 27.6M) CHẠM KỊCH TRẦN BẢO TÀNG (Y = 9.8M)
  const ceilingCanopy = new THREE.Mesh(
    new THREE.PlaneGeometry(25.8, 27.6),
    new THREE.MeshBasicMaterial({
      map: thatchCeilingTex,
      side: THREE.DoubleSide,
      fog: false
    })
  );
  ceilingCanopy.rotation.x = Math.PI / 2;
  ceilingCanopy.position.set(0, 9.8, 0);
  interiorGroup.add(ceilingCanopy);

  const centerGodRay = createVolumetricLightBeam(0.85, 3.0, 9.2, 0xfb923c, 0.28);
  centerGodRay.position.set(0, 4.6, -0.6);
  interiorGroup.add(centerGodRay);

  // -------------------------------------------------------------------------
  // A3. SÀN NHÀ RIÊNG: NỀN ĐẤT NỆN NỨT CHÂN CHIM & CHIẾU CÓI TÂN HÔN DỆT ĐỎ
  // -------------------------------------------------------------------------
  const earthenFloorTex = getCachedTex('vn_earthen_floor_mat_tex', 1024, 1024, (ctx, w, h) => {
    // 1. Nền đất nện nâu sẫm làng quê nghèo
    const bg = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.72);
    bg.addColorStop(0.0, '#4a2c18');
    bg.addColorStop(0.55, '#2e1b0f');
    bg.addColorStop(1.0, '#1a0f08');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Vết đất nứt chân chim mùa đói khô hạn ở viền ngoài
    ctx.strokeStyle = 'rgba(15, 8, 4, 0.65)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const r1 = 290 + (i % 3) * 25;
      const r2 = 480;
      ctx.beginPath();
      ctx.moveTo(w / 2 + Math.cos(a) * r1, h / 2 + Math.sin(a) * r1);
      ctx.lineTo(w / 2 + Math.cos(a + 0.08) * ((r1 + r2) * 0.5), h / 2 + Math.sin(a + 0.08) * ((r1 + r2) * 0.5));
      ctx.lineTo(w / 2 + Math.cos(a - 0.05) * r2, h / 2 + Math.sin(a - 0.05) * r2);
      ctx.stroke();
    }

    // 2. Chiếu cói dệt chữ Hỷ / vạch đỏ ấm áp ở trung tâm phòng (Tổ ấm của Tràng)
    const matX = w * 0.22, matY = h * 0.22, matW = w * 0.56, matH = h * 0.56;
    ctx.fillStyle = '#b47b38';
    ctx.fillRect(matX, matY, matW, matH);

    // Sợi cói dệt ngang
    ctx.strokeStyle = 'rgba(254, 240, 138, 0.25)';
    ctx.lineWidth = 2;
    for (let y = matY; y <= matY + matH; y += 8) {
      ctx.beginPath();
      ctx.moveTo(matX, y);
      ctx.lineTo(matX + matW, y);
      ctx.stroke();
    }

    // Đường viền đỏ và hoa văn đỏ truyền thống trên chiếu cói miền Bắc
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 14;
    ctx.strokeRect(matX + 12, matY + 12, matW - 24, matH - 24);
    ctx.lineWidth = 6;
    ctx.strokeRect(matX + 36, matY + 36, matW - 72, matH - 72);

    // Vòng bông lúa vàng bao quanh tâm chiếu
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 165, 0, Math.PI * 2);
    ctx.stroke();

    // Viền ngoài cùng của sàn phòng
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 12;
    ctx.strokeRect(12, 12, w - 24, h - 24);
  });

  // SÀN NHÀ RIÊNG: NỀN ĐẤT NỆN & CHIẾU CÓI MỞ RỘNG PHỦ KÍN 100% CĂN PHÒNG (25.8M x 27.6M)
  const floorCarpet = new THREE.Mesh(
    new THREE.PlaneGeometry(25.8, 27.6),
    new THREE.MeshBasicMaterial({ map: earthenFloorTex, side: THREE.FrontSide, fog: false })
  );
  floorCarpet.rotation.x = -Math.PI / 2;
  floorCarpet.position.set(0, 0.02, 0);
  interiorGroup.add(floorCarpet);

  const floorWarmRing = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 2.95, 40),
    new THREE.MeshBasicMaterial({
      color: 0xfb923c,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false
    })
  );
  floorWarmRing.rotation.x = -Math.PI / 2;
  floorWarmRing.position.set(0, 0.04, -0.6);
  interiorGroup.add(floorWarmRing);

  // -------------------------------------------------------------------------
  // A4. TƯỜNG NHÀ RIÊNG: VÁCH TRÌNH ĐẤT VÀNG RƠM & TRANH PHÙ ĐIÊU XÓM NGỤ CƯ
  // -------------------------------------------------------------------------
  const backWallTex = getCachedTex('vn_back_mural_wall_tex', 1024, 512, (ctx, w, h) => {
    // Màu tường trình đất trộn rơm vàng nâu chuyển sang ánh hồng bình minh
    const bg = ctx.createLinearGradient(0, 0, w, 0);
    bg.addColorStop(0.0, '#2e1d0f');
    bg.addColorStop(0.5, '#452612');
    bg.addColorStop(1.0, '#4c1414');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Hiệu ứng vân rơm trộn đất sét trên vách tường quê
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.16)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 120; i++) {
      const rx = (i * 89) % w;
      const ry = (i * 53) % h;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + 22, ry + ((i % 2 === 0) ? 8 : -8));
      ctx.stroke();
    }

    // Bên trái: Cảnh con đê chiều chạng vạng & mái nhà tranh bà cụ Tứ
    ctx.fillStyle = 'rgba(245, 158, 11, 0.28)';
    ctx.beginPath();
    ctx.moveTo(40, h - 40);
    ctx.lineTo(180, h - 190);
    ctx.lineTo(320, h - 40);
    ctx.closePath();
    ctx.fill();

    // Bên phải: Lá cờ đỏ sao vàng tung bay trên đê phá kho thóc
    ctx.fillStyle = 'rgba(239, 68, 68, 0.65)';
    ctx.fillRect(w - 280, 150, 180, 110);
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(w - 190, 205, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#fb923c';
    ctx.lineWidth = 10;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 40px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText('KIỆT TÁC VỢ NHẶT • NHÀ VĂN KIM LÂN', w / 2, 66);

    ctx.fillStyle = '#ffedd5';
    ctx.font = 'italic 23px "Times New Roman", serif';
    ctx.fillText('“Trong bóng tối của nạn đói năm 1945, tình người và khát vọng sống vẫn bừng sáng”', w / 2, 114);
  });

  // 2 Vách Phên Tre Đan Xóm Ngụ Cư
  const bambooSideTex = getCachedTex('vn_side_bamboo_wall_tex', 512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#362212';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#784721';
    ctx.lineWidth = 6;
    for (let x = 0; x < w; x += 24) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 24) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, w - 12, h - 12);
  });

  // 1. HỆ THỐNG TƯỜNG NGĂN CÁCH KHỚP 100% KIẾN TRÚC THẬT BẢO TÀNG (Rộng 25.8m x Sâu 27.6m x Cao kịch trần 9.8m)
  buildFullRoomEnclosureWalls(interiorGroup, {
    width: 25.8,
    depth: 27.6,
    height: 9.8,
    doorWidth: 6.2,
    doorHeight: 7.5,
    backWallTex: backWallTex,
    leftWallTex: bambooSideTex,
    rightWallTex: bambooSideTex,
    trimColor: 0xd97706,
    signTitle: 'VĂN HỌC HIỆN THỰC 1945: VỢ NHẶT (KIM LÂN)',
    signSubtitle: 'Khát vọng sống và tình người cưu mang vượt lên bờ vực cái chết'
  });

  // A1.0 NÂNG CẤP HỌA TIẾT TƯỜNG 3 TẦNG, PHÀO CHỈ, 4 TRANH PHÙ ĐIÊU & BÌNH PHONG HẮT SÁNG
  upgradeRoomWallArchitecture(interiorGroup, {
    themeKey: 'voNhat',
    roomWidth: 25.8,
    roomDepth: 27.6,
    wallHeight: 9.8
  });

  // A1.1 CỔNG VÒM MÁI ĐAO HOÀNG GIA KÈM HOÀNH PHI CÂU ĐỐI TẠI MẶT TIỀN (Z = +12.0m)
  const vnTraditionalArchway = createTraditionalArchwayEntrance({
    roomTitle: 'ÁNH SÁNG NGỤ CƯ',
    leftCouplet: 'Bát cháo cám ấm nồng tình nhân nghĩa',
    rightCouplet: 'Đèn dầu khuya rạng rỡ ánh tương lai',
    archWidth: 6.2,
    archHeight: 4.8
  });
  vnTraditionalArchway.position.set(0, 0, 12.0);
  interiorGroup.add(vnTraditionalArchway);

  // Vật liệu gốm đất nung, tre gỗ, đồng cổ và lúa vàng
  const terracottaMat = new THREE.MeshPhongMaterial({
    color: 0x6b3410,
    emissive: 0x241004,
    specular: 0xfb923c,
    shininess: 45
  });
  const bambooGoldMat = new THREE.MeshPhongMaterial({
    color: 0xd97706,
    emissive: 0x3d1e03,
    specular: 0xfef08a,
    shininess: 75
  });
  const crimsonFlagMat = new THREE.MeshBasicMaterial({
    color: 0xdc2626,
    side: THREE.DoubleSide,
    fog: false
  });

  // Bệ trưng bày mô hình .GLB chính trong phòng (ở trung tâm hậu cảnh Z = -8.5m)
  const roomStatuePedestal = new THREE.Group();
  roomStatuePedestal.position.set(0, 0, -8.5);
  interiorGroup.add(roomStatuePedestal);

  // Thảm Mandala Vàng Rơm & Cam Ấm dưới chân tượng Vợ Nhặt
  const vnMandala = createDetailedMandalaFloorDecal('voNhat', 3.5);
  vnMandala.position.y = 0.03;
  roomStatuePedestal.add(vnMandala);

  const statueBase = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.85, 0.72, 16), terracottaMat);
  statueBase.position.y = 0.36;
  roomStatuePedestal.add(statueBase);

  const statueRim = new THREE.Mesh(new THREE.CylinderGeometry(1.62, 1.62, 0.08, 16), bambooGoldMat);
  statueRim.position.y = 0.74;
  roomStatuePedestal.add(statueRim);

  const roomGlbHolder = new THREE.Group();
  roomGlbHolder.position.set(0, 0.78, 0);
  roomStatuePedestal.add(roomGlbHolder);

  loadGlbCached(candidateGlbUrls, { maxTextureSize: 512 })
    .then((rawScene) => {
      const roomModel = prepareUnlitVividGlbModel(rawScene, {
        targetSpan: 3.1,
        fitAxis: 'y',
        maxTextureSize: 512
      });
      roomGlbHolder.add(roomModel);

      roomModel.updateMatrixWorld(true);
      if (typeof window !== 'undefined' && window.__museumHitboxManager) {
        window.__museumHitboxManager.createTightClickHitbox(roomModel, {
          loreKey: 'vo_nhat_trang_thi',
          isBookPortal: false,
          padding: 0.12
        });
      }
    })
    .catch(() => {});

  // 4 Cột Tre Đèn Dầu cao 7.8m ở 4 góc phòng (Rộng 25.8m x Sâu 27.6m)
  const pillarCoords = [
    { pos: new THREE.Vector3(-10.5, 0, -10.5), flameColor: 0xfb923c },
    { pos: new THREE.Vector3(10.5, 0, -10.5), flameColor: 0xef4444 },
    { pos: new THREE.Vector3(-10.5, 0, 10.5), flameColor: 0xfacc15 },
    { pos: new THREE.Vector3(10.5, 0, 10.5), flameColor: 0xfb923c }
  ];

  const staticPillarsGroup = new THREE.Group();
  staticPillarsGroup.name = 'VN_Static_Pillars';
  const sharedColGeo = new THREE.CylinderGeometry(0.34, 0.40, 7.6, 12);
  const sharedKnotGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.12, 12);
  const sharedFlameGeo = new THREE.OctahedronGeometry(0.42, 1);

  const lampFlames = [];
  pillarCoords.forEach(({ pos, flameColor }) => {
    const col = new THREE.Mesh(sharedColGeo, terracottaMat);
    col.position.set(pos.x, pos.y + 3.8, pos.z);
    staticPillarsGroup.add(col);

    // Các đốt tre vàng
    for (let b = 1; b <= 6; b++) {
      const knot = new THREE.Mesh(sharedKnotGeo, bambooGoldMat);
      knot.position.set(pos.x, pos.y + b * 1.15, pos.z);
      staticPillarsGroup.add(knot);
    }

    const flame = new THREE.Mesh(
      sharedFlameGeo,
      new THREE.MeshBasicMaterial({ color: flameColor, fog: false })
    );
    flame.position.set(pos.x, pos.y + 7.6, pos.z);
    interiorGroup.add(flame);
    lampFlames.push(flame);
  });
  mergeGroupMeshesByMaterial(staticPillarsGroup);
  sharedColGeo.dispose();
  sharedKnotGeo.dispose();
  interiorGroup.add(staticPillarsGroup);

  // Hệ thống đèn lồng ấm áp Vàng Rơm & Cam Đèn Dầu (InstancedMesh - 1 Draw Call - museumMasterBeautifier)
  const vnLanternPositions = [
    new THREE.Vector3(-8.5, 7.4, -6.5),
    new THREE.Vector3(-8.5, 7.4, 6.5),
    new THREE.Vector3(8.5, 7.4, -6.5),
    new THREE.Vector3(8.5, 7.4, 6.5),
    new THREE.Vector3(-12.0, 7.4, 0),
    new THREE.Vector3(12.0, 7.4, 0),
    new THREE.Vector3(0, 7.4, -9.5),
    new THREE.Vector3(0, 7.4, 7.5)
  ];
  const vnSilkLanterns = createInstancedSilkLanterns(vnLanternPositions, 0xfb923c, 0xfacc15);
  interiorGroup.add(vnSilkLanterns);

  // -------------------------------------------------------------------------
  // A5. BỤC SÁCH DỊCH CHUYỂN TRUNG TÂM (ĐỒNG BỘ 100% VỚI PORTALINTERACTION.JS)
  // -------------------------------------------------------------------------
  const bookAltar = new THREE.Group();
  bookAltar.name = 'Interactive_VoNhat_Teleport_Book';
  bookAltar.position.set(0, 0, 0.4);
  bookAltar.userData.isTeleportBook = true;
  bookAltar.userData.targetRealm = 'VO_NHAT_REALM';
  interiorGroup.add(bookAltar);

  const step1 = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.4, 0.26, 12), terracottaMat);
  step1.position.y = 0.13;
  bookAltar.add(step1);

  const step2 = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.75, 0.30, 12), bambooGoldMat);
  step2.position.y = 0.41;
  bookAltar.add(step2);

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 1.0, 0.92, 12), terracottaMat);
  pedestal.position.y = 1.02;
  bookAltar.add(pedestal);

  const bookMeshGroup = new THREE.Group();
  bookMeshGroup.position.set(0, 1.72, 0);
  bookMeshGroup.rotation.x = 0.38;
  bookMeshGroup.userData.isTeleportBook = true;
  bookMeshGroup.userData.targetRealm = 'VO_NHAT_REALM';

  const pageMat = new THREE.MeshLambertMaterial({ color: 0xfef3c7, emissive: 0x78350f });
  const pageLeft = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.06, 0.88), pageMat);
  pageLeft.position.x = -0.32;
  pageLeft.rotation.z = -0.15;
  pageLeft.userData.isTeleportBook = true;
  pageLeft.userData.targetRealm = 'VO_NHAT_REALM';
  bookMeshGroup.add(pageLeft);

  const pageRight = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.06, 0.88), pageMat);
  pageRight.position.x = 0.32;
  pageRight.rotation.z = 0.15;
  pageRight.userData.isTeleportBook = true;
  pageRight.userData.targetRealm = 'VO_NHAT_REALM';
  bookMeshGroup.add(pageRight);

  const bookSpine = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.92), bambooGoldMat);
  bookSpine.userData.isTeleportBook = true;
  bookSpine.userData.targetRealm = 'VO_NHAT_REALM';
  bookMeshGroup.add(bookSpine);

  bookAltar.add(bookMeshGroup);
  bookAltar.userData.bookMeshGroup = bookMeshGroup;

  // Cập nhật ma trận thế giới & Bọc Tight Click Hitbox cho Cuốn Sách Dịch Chuyển (padding: 0.12)
  bookMeshGroup.updateMatrixWorld(true);
  if (typeof window !== 'undefined' && window.__museumHitboxManager) {
    window.__museumHitboxManager.createTightClickHitbox(bookMeshGroup, {
      loreKey: 'vo_nhat',
      isBookPortal: true,
      portalTargetRealm: 'VO_NHAT_REALM',
      padding: 0.12
    });
  }

  const promptBanner = createPortalBanner({
    headerTag: 'CỔNG DỊCH CHUYỂN XÓM NGỤ CƯ',
    title: '📖 CLICK CHUỘT VÀO SÁCH ĐỂ VÀO THẾ GIỚI TÁC PHẨM',
    subtitle: 'Nhấn ESC bất kỳ lúc nào để thoát ra',
    accentColor: '#fb923c',
    width: 4.2,
    height: 1.55
  });
  promptBanner.position.set(0, 3.05, 0);
  bookAltar.add(promptBanner);

  // -------------------------------------------------------------------------
  // A6. 4 BỆ SỰ VẬT / HIỆN VẬT ĐẶC TRƯNG CỦA TRUYỆN "VỢ NHẶT"
  // -------------------------------------------------------------------------
  function createExhibitPedestal(x, z, title, sub, borderCol, rayCol) {
    const pGroup = new THREE.Group();
    pGroup.position.set(x, 0, z);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, 1.05, 10), terracottaMat);
    base.position.y = 0.525;
    pGroup.add(base);

    const topRim = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.92, 0.1, 10), bambooGoldMat);
    topRim.position.y = 1.08;
    pGroup.add(topRim);

    const relicRay = createVolumetricLightBeam(0.35, 1.15, 4.8, rayCol, 0.22);
    relicRay.position.y = 3.2;
    pGroup.add(relicRay);

    const plaque = createRelicPlaque(title, sub, borderCol);
    plaque.position.set(0, 0.68, 1.02);
    pGroup.add(plaque);

    interiorGroup.add(pGroup);
    return pGroup;
  }

  // 1. Nồi Chè Khoán Bà Cụ Tứ & 4 Bát Bánh Đúc - Bệ Hoa Sen Chuẩn Bảo Tàng
  const porridgeGroup = new THREE.Group();
  const potMesh = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), terracottaMat);
  potMesh.scale.set(1.15, 0.82, 1.15);
  potMesh.position.y = 0.22;
  porridgeGroup.add(potMesh);
  for (let b = 0; b < 4; b++) {
    const ba = (b / 4) * Math.PI * 2;
    const bowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.10, 0.14, 12),
      new THREE.MeshBasicMaterial({ color: 0xfef3c7, fog: false })
    );
    bowl.position.set(Math.cos(ba) * 0.58, 0.08, Math.sin(ba) * 0.58);
    porridgeGroup.add(bowl);
  }

  const porridgeStation = createCuratedArtifactStation({
    artifactMesh: porridgeGroup,
    loreKey: 'voNhat_nieuChao',
    stationTitle: 'NỒI CHÈ KHOÁN (CHÁO CÁM)',
    stationSubtitle: 'Bữa Cơm Ngày Đói • Tình Mẹ Bà Cụ Tứ',
    position: new THREE.Vector3(-4.8, 0, 2.0),
    accentColor: 0xfb923c,
    loreGuideInstance: typeof window !== 'undefined' ? window.__loreGuide : null,
    audioDirectorInstance: typeof window !== 'undefined' ? window.__spatialAudio : null
  });
  interiorGroup.add(porridgeStation);

  // 2. Cây Đèn Dầu Đêm Tân Hôn - Bệ Hoa Sen Chuẩn Bảo Tàng
  const lampGroup = new THREE.Group();
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.30, 0.25, 12), bambooGoldMat);
  lampBase.position.y = 0.12;
  const lampGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.20, 0.45, 12),
    new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.65, fog: false })
  );
  lampGlass.position.y = 0.45;
  const innerFlame = new THREE.Mesh(
    new THREE.ConeGeometry(0.09, 0.24, 8),
    new THREE.MeshBasicMaterial({ color: 0xf97316, fog: false })
  );
  innerFlame.position.y = 0.43;
  lampGroup.add(lampBase, lampGlass, innerFlame);

  const oilLampStation = createCuratedArtifactStation({
    artifactMesh: lampGroup,
    loreKey: 'voNhat_denDau',
    stationTitle: 'NGỌN ĐÈN DẦU TÂN HÔN',
    stationSubtitle: 'Ánh Sáng Tình Người Giữa Đêm Tối Ất Dậu',
    position: new THREE.Vector3(-4.8, 0, -3.2),
    accentColor: 0xfde047,
    loreGuideInstance: typeof window !== 'undefined' ? window.__loreGuide : null,
    audioDirectorInstance: typeof window !== 'undefined' ? window.__spatialAudio : null
  });
  interiorGroup.add(oilLampStation);

  // Đăng ký thẻ thơ tương tác & Âm thanh không gian 3D cho Nồi Chè Khoán & Ngọn Đèn Dầu
  if (typeof window !== 'undefined') {
    window.__loreGuide?.registerArtifact(porridgeStation, 'voNhat_nieuChao');
    window.__spatialAudio?.attachPositionalSound('voNhat_nieuChao', porridgeStation, {
      fallbackTheme: 'voNhat',
      refDistance: 6,
      maxDistance: 35
    });
    window.__loreGuide?.registerArtifact(oilLampStation, 'voNhat_denDau');
  }

  // 3. Xe Bò Đẩy Thóc Của Tràng & Thúng Con Của Thị (Góc Phải Trước)
  const cartPed = createExhibitPedestal(4.8, 2.0, 'XE BÒ THÓC & THÚNG CON', 'Câu Hò Đùa Nên Duyên Vợ Chồng', '#eab308', 0xfacc15);
  const cartGroup = new THREE.Group();
  cartGroup.position.y = 1.48;
  const cartBed = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.12, 0.95), terracottaMat);
  const wheelL = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.04, 8, 20), bambooGoldMat);
  wheelL.rotation.y = Math.PI / 2;
  wheelL.position.x = -0.36;
  const wheelR = wheelL.clone();
  wheelR.position.x = 0.36;
  const basketMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.16, 0.24, 12), bambooGoldMat);
  basketMesh.position.set(0, 0.18, 0.1);
  cartGroup.add(cartBed, wheelL, wheelR, basketMesh);
  cartPed.add(cartGroup);

  // 4. Lá Cờ Đỏ Sao Vàng & Kho Thóc Cứu Đói (Góc Phải Sau)
  const redFlagPed = createExhibitPedestal(4.8, -3.2, 'LÁ CỜ ĐỎ PHÁ KHO THÓC', 'Ánh Sáng Cách Mạng & Con Đường Sống', '#ef4444', 0xef4444);
  const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.35, 8), bambooGoldMat);
  flagPole.position.set(-0.28, 1.80, 0);
  const flagCloth = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.52, 12, 8), crimsonFlagMat);
  flagCloth.position.set(0.12, 2.15, 0);
  const goldStar = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.11, 0),
    new THREE.MeshBasicMaterial({ color: 0xfde047, fog: false })
  );
  goldStar.position.set(0.12, 2.15, 0.02);
  redFlagPed.add(flagPole, flagCloth, goldStar);

  // =========================================================================
  // PHẦN B: ĐẠI CẢNH CÕI VĂN HỌC "VỢ NHẶT" (Y = +420m)
  // =========================================================================
  const vnRealmGroup = new THREE.Group();
  vnRealmGroup.name = 'VoNhat_Realm_Master';
  vnRealmGroup.position.copy(VN_REALM_ORIGIN);
  vnRealmGroup.visible = true;

  // Đưa thẳng vnRealmGroup vào Scene độc lập voNhatScene (KHÔNG nằm trong sảnh bảo tàng)
  if (_realmScene) {
    _realmScene.add(vnRealmGroup);
  } else if (typeof window !== 'undefined' && window.__voNhatScene) {
    window.__voNhatScene.add(vnRealmGroup);
  } else {
    root.add(vnRealmGroup);
  }

  // Bầu trời chuyển sắc từ Hoàng Hôn Xám Chạng Vạng (bên trái) sang Bình Minh Đỏ Rực (bên phải)
  const skyTex = getCachedTex('vn_realm_sky_dome', 1024, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0.0, '#18130e');
    g.addColorStop(0.45, '#3b2313');
    g.addColorStop(0.78, '#7c2d12');
    g.addColorStop(1.0, '#991b1b');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(240, 32, 24),
    new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, depthWrite: false, fog: false })
  );
  skyDome.position.set(0, 15, -30);
  vnRealmGroup.add(skyDome);

  // Đài quan sát của người chơi
  const obsPlatformGroup = new THREE.Group();
  obsPlatformGroup.position.copy(VN_OBS_PLATFORM_OFFSET);
  vnRealmGroup.add(obsPlatformGroup);

  const platDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(7.2, 8.4, 1.2, 16),
    new THREE.MeshBasicMaterial({ color: 0x2e1b0f, fog: false })
  );
  platDisc.position.y = -0.6;
  obsPlatformGroup.add(platDisc);

  const returnPortalGroup = new THREE.Group();
  returnPortalGroup.position.set(0, 0.2, 5.0);
  obsPlatformGroup.add(returnPortalGroup);

  const crystalMesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.55, 0),
    new THREE.MeshBasicMaterial({ color: 0xfb923c, fog: false })
  );
  crystalMesh.position.y = 1.25;
  crystalMesh.userData = { isReturnPortal: true, action: 'RETURN_TO_MUSEUM' };
  returnPortalGroup.add(crystalMesh);

  const returnLabel = createPortalBanner({
    headerTag: 'CỔNG TRỞ VỀ',
    title: '↩ QUAY VỀ BẢO TÀNG (Nhấn phím ESC)',
    subtitle: 'Click vào tinh thể cam hoặc nhấn phím ESC',
    accentColor: '#fde047',
    width: 3.6,
    height: 1.35
  });
  returnLabel.position.set(0, 2.4, 0);
  returnPortalGroup.add(returnLabel);

  const screenAngles = [-1.08, -0.58, 0.58, 1.08];
  const screenRadius = 19.5;
  for (let sIdx = 0; sIdx < 4; sIdx++) {
    const angle = screenAngles[sIdx];
    const screen = createGiantHologramScreen(sIdx);
    screen.position.set(Math.sin(angle) * screenRadius, 4.5, -Math.cos(angle) * screenRadius);
    screen.lookAt(0, 4.0, 0);
    obsPlatformGroup.add(screen);
  }

  // B1. BÊN TRÁI: MÁI NHÀ BÀ CỤ TỨ & MÔ HÌNH .GLB VỢ NHẶT KHỔNG LỒ (X = -18m, Z = -24m)
  const villageHomeGroup = new THREE.Group();
  villageHomeGroup.position.set(-16.0, 0, -24.0);
  vnRealmGroup.add(villageHomeGroup);

  const earthMound = new THREE.Mesh(
    new THREE.CylinderGeometry(14, 18, 4.0, 20),
    new THREE.MeshBasicMaterial({ color: 0x3b2313, fog: false })
  );
  earthMound.position.y = 2.0;
  villageHomeGroup.add(earthMound);

  const realmGlbHolder = new THREE.Group();
  realmGlbHolder.position.set(0, 4.2, 0);
  villageHomeGroup.add(realmGlbHolder);

  loadGlbCached(candidateGlbUrls, { maxTextureSize: 512 })
    .then((rawScene) => {
      const giantVnModel = prepareUnlitVividGlbModel(rawScene, {
        targetSpan: 18.5,
        fitAxis: 'y',
        maxTextureSize: 512
      });
      realmGlbHolder.add(giantVnModel);
    })
    .catch(() => {});

  // B2. BÊN PHẢI: ĐÊ LÀNG, KHO THÓC MỞ TUNG & ĐẠI KỲ ĐỎ SAO VÀNG TUNG BAY (X = +20m, Z = -24m)
  const revolutionDykeGroup = new THREE.Group();
  revolutionDykeGroup.position.set(20.0, 0, -24.0);
  vnRealmGroup.add(revolutionDykeGroup);

  const dykeSlope = new THREE.Mesh(
    new THREE.ConeGeometry(16, 12, 16),
    new THREE.MeshBasicMaterial({ color: 0x78350f, fog: false })
  );
  dykeSlope.position.y = 6.0;
  revolutionDykeGroup.add(dykeSlope);

  const giantPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.35, 22, 10),
    new THREE.MeshBasicMaterial({ color: 0xfbbf24, fog: false })
  );
  giantPole.position.set(-4.5, 18.0, 0);
  revolutionDykeGroup.add(giantPole);

  const giantFlagGeo = new THREE.PlaneGeometry(14.0, 9.2, 10, 6);
  const giantFlagMesh = new THREE.Mesh(giantFlagGeo, crimsonFlagMat);
  giantFlagMesh.position.set(2.5, 24.0, 0);
  revolutionDykeGroup.add(giantFlagMesh);

  const giantStar = new THREE.Mesh(
    new THREE.OctahedronGeometry(2.2, 0),
    new THREE.MeshBasicMaterial({ color: 0xfde047, fog: false })
  );
  giantStar.position.set(2.5, 24.0, 0.25);
  revolutionDykeGroup.add(giantStar);

  // Mặt đất đồng quê & đường đê phía dưới
  const groundPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(240, 240, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x241409, side: THREE.FrontSide, fog: false })
  );
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.position.y = -0.5;
  vnRealmGroup.add(groundPlane);

  // Bụi rơm vàng & ánh tà dương (1 Draw Call InstancedMesh - museumMasterBeautifier)
  const vnParticles = createDetailedInstancedParticles('voNhat', 140, 36, 26);
  if (vnParticles) {
    if (vnParticles.position) {
      vnParticles.position.set(0, 6, -18);
    }
    vnRealmGroup.add(vnParticles);
  }

  // =========================================================================
  // PHẦN C: LOGIC DỊCH CHUYỂN & ĐỒNG BỘ PORTALINTERACTION.JS (CLICK SÁCH & PHÍM ESC)
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

  const realmObservationCamPos = VN_REALM_ORIGIN.clone().add(VN_OBS_PLATFORM_OFFSET);
  const realmObservationLookAt = VN_REALM_ORIGIN.clone().add(VN_OBS_LOOK_TARGET_OFFSET);

  function createOrGetRealmTopHUD() {
    if (typeof document === 'undefined') return null;
    let hud = document.getElementById('vn-realm-top-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'vn-realm-top-hud';
      hud.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        display: none; align-items: center; gap: 18px;
        background: rgba(30, 16, 8, 0.92); border: 2px solid #fb923c;
        padding: 10px 24px; border-radius: 30px; z-index: 99999;
        box-shadow: 0 0 24px rgba(251, 146, 60, 0.45); backdrop-filter: blur(8px);
        font-family: 'Segoe UI', sans-serif;
      `;
      hud.innerHTML = `
        <span style="color: #fde047; font-weight: bold; font-size: 15px; letter-spacing: 1px;">🌾 CÕI VĂN HỌC: VỢ NHẶT (KIM LÂN) 🚩</span>
        <button id="vn-btn-exit-realm" style="
          background: linear-gradient(135deg, #ea580c, #9a3412);
          color: #ffffff; border: 1px solid #fdba74; padding: 6px 16px;
          border-radius: 20px; font-weight: bold; font-size: 13px; cursor: pointer;
        ">↩ QUAY VỀ BẢO TÀNG (Nhấn phím ESC)</button>
      `;
      document.body.appendChild(hud);
      document.getElementById('vn-btn-exit-realm')?.addEventListener('click', (e) => {
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
      themeColor: 0xfb923c,
      onTransition: () => {
        _isInsideRealm = true;
        roomGroup.visible = false;
        const targetScene = _realmScene || (typeof window !== 'undefined' ? window.__voNhatScene : null);
        if (typeof window !== 'undefined' && window.__app?.setActiveScene && targetScene) {
          window.__app.setActiveScene(targetScene);
        }
        vnRealmGroup.visible = true;

        if (typeof window !== 'undefined') {
          window.__spatialAudio?.playRealmSoundscape('voNhat_nieuChao');
        }

        if (_scene) {
          _savedFog = _scene.fog;
          _savedBackground = _scene.background;
          _scene.fog = null;
          _scene.background = new THREE.Color(0x18130e);
        }

        if (_renderer) {
          _savedExposure = _renderer.toneMappingExposure ?? 1.0;
          _renderer.toneMappingExposure = 1.15;
        }

        if (camCtrl) {
          camCtrl.setFloorHeightProvider?.(() => 420.0 + 4.0 - 1.7);
          camCtrl.floorHeightProvider = () => 420.0 + 4.0 - 1.7;
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
      themeColorHex: '#fb923c',
      onSwapScene: () => {
        _isInsideRealm = false;
        if (typeof window !== 'undefined') window.__vnRealmActive = false;

        // CHUYỂN HOÁN SCENE: Đưa Sảnh Bảo Tàng (mainScene) về Active Scene
        if (typeof window !== 'undefined' && window.__app?.setActiveScene && window.__app.mainScene) {
          window.__app.setActiveScene(window.__app.mainScene);
        }

        // Ẩn thế giới tác phẩm & Hiện lại phòng bảo tàng
        vnRealmGroup.visible = false;
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
    if (e.target.closest('#vn-realm-top-hud') || e.target.closest('#director-hud')) return;

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

      const intersects = intersectInteractiveTargetsOnly(raycaster, returnPortalGroup);
      if (intersects.length > 0) {
        exitRealm();
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

  const portalBookMeta = {
    id: 'vo_nhat',
    title: 'VỢ NHẶT • KIM LÂN',
    author: 'Nhà văn Kim Lân (1920 – 2007)',
    genre: 'Truyện ngắn Hiện thực Nhân đạo • Bối cảnh năm 1945',
    quote: '"Trong óc Tràng vẫn thấy đám người đói và lá cờ đỏ bay phấp phới..."',
    themeColor: 0xfb923c,
    targetRealm: 'VO_NHAT_REALM',
    portalReady: true,
    onActivate: () => enterRealm()
  };

  registerInteractiveBook(bookAltar, realmObservationCamPos, portalBookMeta);

  // =========================================================================
  // PHẦN D: VÒNG LẶP ANIMATION (60 FPS) & CÁC PHƯƠNG THỨC CẤP CAO CỦA ROOT
  // =========================================================================
  let clockTime = 0;
  const flagPosAttr = giantFlagGeo.attributes.position;

  root.update = function(delta = 0.016, elapsedTime = 0, camera = null) {
    if (camera) _camera = camera;
    clockTime += delta;

    if (!_isInsideRealm) {
      if (!roomGroup.visible) return;
      const cam = _camera || (typeof window !== 'undefined' ? window.__camera : null);
      if (cam && cam.position.distanceToSquared(roomCenter) > 42 * 42) return;

      promptBanner.position.y = 3.05 + Math.sin(clockTime * 2.5) * 0.05;
      bookMeshGroup.position.y = 1.72 + Math.sin(clockTime * 2.2) * 0.05;
      floorWarmRing.rotation.z += delta * 0.35;
      innerFlame.scale.y = 1.0 + Math.sin(clockTime * 8.0) * 0.18;

      lampFlames.forEach((f, idx) => {
        f.rotation.y += delta * 2.2;
        const s = 1.0 + Math.sin(clockTime * 6.0 + idx) * 0.14;
        f.scale.set(s, s, s);
      });

      if (vnSilkLanterns && vnSilkLanterns.update) {
        vnSilkLanterns.update(delta, clockTime);
      }
      return;
    }

    if (!vnRealmGroup.visible) return;

    // Chuyển động bụi rơm vàng & tà dương
    if (vnParticles && vnParticles.update) {
      vnParticles.update(delta, clockTime);
    }

    // Chuyển động lá cờ đỏ sao vàng tung bay phấp phới trong Cõi Văn Học Vợ Nhặt
    for (let i = 0; i < flagPosAttr.count; i++) {
      const lx = flagPosAttr.getX(i);
      const waveZ = Math.sin(lx * 0.45 - clockTime * 4.2) * 0.65;
      flagPosAttr.setZ(i, waveZ);
    }
    flagPosAttr.needsUpdate = true;

    crystalMesh.rotation.y += delta * 1.2;
    returnLabel.position.y = 2.4 + Math.sin(clockTime * 2.5) * 0.05;
  };

  // ĐẶT CÁC PHƯƠNG THỨC CẤP CAO Ở NGOÀI HÀM UPDATE ĐỂ TƯƠNG THÍCH 100% VỚI MAIN.JS
  root.enterRealm = enterRealm;
  root.updateRealm = root.update;
  root.exitRealm = exitRealm;
  root.teleportBook = bookAltar;
  root.isInsideRealm = () => _isInsideRealm;
  root.getGroup = function() {
    return roomGroup;
  };

  root.setupContext = function({
    scene = null,
    camera = null,
    renderer = null,
    cameraManager = null,
    portalInteraction = null,
    realmScene = null,
    app = null,
    setActiveScene = null
  } = {}) {
    if (scene) _scene = scene;
    if (camera) _camera = camera;
    if (renderer) _renderer = renderer;
    if (cameraManager) _cameraManager = cameraManager;
    if (realmScene) {
      _realmScene = realmScene;
      if (vnRealmGroup.parent !== _realmScene) {
        vnRealmGroup.parent?.remove?.(vnRealmGroup);
        _realmScene.add(vnRealmGroup);
      }
    }
    if (scene) _scene = scene;
    if (camera) _camera = camera;
    if (renderer) _renderer = renderer;
    if (cameraManager) _cameraManager = cameraManager;

    if (portalInteraction) {
      portalInteraction.registerInteractiveBook(bookAltar, realmObservationCamPos, portalBookMeta);
    }
    if (typeof window !== 'undefined') {
      window.__loreGuide?.registerArtifact(porridgeStation, 'voNhat_nieuChao');
      window.__spatialAudio?.attachPositionalSound('voNhat_nieuChao', porridgeStation, {
        fallbackTheme: 'voNhat',
        refDistance: 6,
        maxDistance: 35
      });
      window.__loreGuide?.registerArtifact(oilLampStation, 'voNhat_denDau');
    }
  };

  // Dọn dẹp tài nguyên GPU triệt để khi hủy phòng (fps-optimizer & museumMasterBeautifier)
  root.dispose = function() {
    disposeSceneBranch(roomGroup);
    disposeSceneBranch(vnRealmGroup);
  };

  return root;
}