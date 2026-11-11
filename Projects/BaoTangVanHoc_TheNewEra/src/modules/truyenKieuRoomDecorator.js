import * as THREE from 'three';
import {
  getSharedGltfLoader,
  loadGlbCached,
  loadGlbWithFallback,
  prepareUnlitVividGlbModel
} from '../utils/modelLoaderHelper.js';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger.js';
import { registerInteractiveBook } from './PortalInteraction.js';
import { playBookSuckInCutscene, playBookReturnCutscene } from './bookVortexCutscene.js';
import {
  ROOM_PALETTES,
  styleAndNormalizeGlbModel,
  createDetailedInstancedParticles,
  createDetailedMandalaFloorDecal,
  intersectInteractiveTargetsOnly,
  disposeSceneBranch
} from './museumMasterBeautifier.js';
import {
  createOptimizedGodRays,
  setupRealmAtmosphere
} from './realmOptimizer.js';
import {
  createTraditionalArchwayEntrance,
  createCuratedArtifactStation
} from './museumCuratorAndTourSystem.js';
import { upgradeRoomWallArchitecture } from './museumWallArchitectureSystem.js';

/**
 * =============================================================================
 * TRUYỆN KIỀU (ĐẠI THI HÀO NGUYỄN DU) - PHÒNG TRƯNG BÀY & CÕI THƠ ĐA CHI TIẾT
 * =============================================================================
 * 1. PHÒNG TRƯNG BÀY BẢO TÀNG:
 *    - Khớp khít 100% kiến trúc bảo tàng thật: Rộng 25.8m x Sâu 27.6m x Cao kịch trần 9.8m
 *    - Cửa chính vòm: Rộng 6.2m x Cao 7.5m khớp hoàn toàn cửa vòm bảo tàng (ZERO khoảng trống)
 *    - 4 Tường đặc trưng: Đêm Thề Nguyền, Thư Phòng Kim Trọng, Lầu Ngưng Bích, Cổng Vòm Vàng
 *    - Sàn Mandala Hoa Đào 8 cánh & 4 dây tơ đàn Hồ Cầm vàng kim nối 2 bệ tượng
 *    - 4 Hiện vật 3D: Đàn Hồ Cầm, Kim Thoa & Khăn Hồng, Lư Trầm & Chén Ngọc, Đào Thanh Minh
 * 
 * 2. CÕI THƠ TRUYỆN KIỀU TÁCH BIỆT HOÀN TOÀN (Y = 420m):
 *    - Bầu khí quyển đêm trăng Giang Nam: background #090314, sương tím FogExp2(#160729, 0.0038)
 *    - Bầu trời đêm Ngân Hà 250 sao chuyển sắc từ Tím Đêm sang Ráng Hồng Sông Tiền Đường
 *    - Vầng Trăng Thề Khổng Lồ (radius: 19.5m) kèm hào quang phát sáng đa tầng
 *    - Quần thể Lầu Ngưng Bích 2 Tầng Mái Đao Cổ Kính (Z = -22m), rèm lụa hồng, 8 đèn lồng mái đung đưa
 *    - Cầu Gỗ Đỏ Thanh Minh (createCrimsonArchBridge) 15 nhịp vòm cong nối đài quan sát vào đảo
 *    - Mặt Hồ Thu Thủy (240m x 240m) sóng gợn thời gian thực, 2 Thuyền Hoa Giang Nam, 36 Đèn Hoa Đăng
 *    - Dãy Núi Non Xa ("Vẻ non xa tấm trăng gần ở chung"), 6 Cây Đào Cổ Thụ 3 sắc độ & 4 Liễu Rủ Bên Hồ
 *    - Hiệu ứng Hạt (Particles): 90 cánh hoa đào rơi trong gió & 30 đèn trời Khổng Minh bay lên không trung
 *    - Chuyển động Procedural Idle Animation tự nhiên cho Kim Trọng & Thúy Kiều (.GLB):
 *      + Nhịp thở nhẹ nhàng (scale.y + position.y)
 *      + Nghiêng mình theo tiếng đàn & trao ánh nhìn (rotation.y, rotation.z)
 *      + Sóng nhạc Hồ Cầm (soundwaveRings) & Cầu Tơ Hồng nối giữa hai người
 *    - Ánh sáng đa tầng (castShadow = false, 60+ FPS):
 *      + HemisphereLight(0xfce7f3, 0x1e0938, 1.85)
 *      + DirectionalLight(0xfef08a, 1.75) từ vầng trăng rọi xuống
 *      + 3 PointLight: Lam Ngọc (Kim Trọng), Hồng Đào (Thúy Kiều), Vàng Ấm (Lầu Ngưng Bích)
 * =============================================================================
 */

export const TK_REALM_ORIGIN = new THREE.Vector3(0, 420, 450);
export const TK_OBS_PLATFORM_OFFSET = new THREE.Vector3(0, 4.2, 34);
export const TK_OBS_LOOK_TARGET_OFFSET = new THREE.Vector3(0, 8.5, -22);

const TK_CACHE = {};

function getCachedTex(key, w, h, drawFn, repeatX = 1, repeatY = 1, {
  canvasW = w,
  canvasH = h,
  disableMipmaps = false
} = {}) {
  if (TK_CACHE[key]) return TK_CACHE[key];
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d');
  if (ctx && (canvasW !== w || canvasH !== h)) {
    ctx.save();
    ctx.scale(canvasW / w, canvasH / h);
    drawFn(ctx, w, h);
    ctx.restore();
  } else if (ctx) {
    drawFn(ctx, w, h);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  if (disableMipmaps) {
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
  }
  if ('colorSpace' in tex && THREE.SRGBColorSpace) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  TK_CACHE[key] = tex;
  return tex;
}

/**
 * Luồng sáng Volumetric God-Ray hình nón AdditiveBlending
 */
function createVolumetricLightBeam(topRadius, bottomRadius, height, colorHex, opacity = 0.22) {
  const beamTex = getCachedTex(`tk_godray_${colorHex}`, 64, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0.0, 'rgba(255, 255, 255, 0.95)');
    g.addColorStop(0.40, 'rgba(255, 255, 255, 0.40)');
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

/**
 * Biển tên ngọc thấu quang cho các bệ hiện vật và bệ tượng
 */
function createRelicPlaque(title, subtitle, borderColor = '#f472b6', width = 2.1, height = 0.6) {
  const tex = getCachedTex(`tk_plaque_${title}`, 640, 180, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(24, 8, 38, 0.95)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 28px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, w / 2, 64);

    ctx.fillStyle = '#fce7f3';
    ctx.font = '22px "Segoe UI", sans-serif';
    ctx.fillText(subtitle, w / 2, 124);
  });

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, fog: false })
  );
  mesh.rotation.x = -0.22;
  return mesh;
}

/**
 * Banner hướng dẫn Cổng Dịch Chuyển (Không phím chữ, chỉ Click chuột vào sách)
 */
function createPortalBanner({
  headerTag = 'CỔNG DỊCH CHUYỂN CÕI THƠ',
  title = '📖 CLICK CHUỘT VÀO SÁCH ĐỂ VÀO CÕI THƠ',
  subtitle = 'Cutscene hút xoáy vào trang sách • Nhấn ESC để thoát',
  accentColor = '#f472b6',
  width = 4.4,
  height = 1.6
} = {}) {
  const tex = getCachedTex(`tk_banner_${title}`, 800, 320, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(22, 6, 36, 0.96)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 6;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    ctx.fillStyle = accentColor;
    ctx.font = 'bold 26px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`◈ ${headerTag} ◈`, w / 2, 62);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px "Segoe UI", sans-serif';
    ctx.fillText(title, w / 2, 154);

    ctx.fillStyle = '#fde047';
    ctx.font = '24px "Segoe UI", sans-serif';
    ctx.fillText(subtitle, w / 2, 240);
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

/**
 * BẢNG ĐIỆN TỬ HOLOGRAM PHÓNG ĐẠI (PlaneGeometry 11.2m x 6.5m, Canvas 1536x900)
 * Chữ tiêu đề: bold 44px • Nhãn trường: bold 30px • Nội dung: 28px
 */
function createGiantHologramScreen(index) {
  const titles = [
    'ĐẠI THI HÀO NGUYỄN DU & THỜI ĐẠI SÁNG TÁC',
    'BI KỊCH TÀI MỆNH TƯƠNG ĐỐ & BÁN MÌNH CỨU CHA',
    'MƯỜI LĂM NĂM LƯU LẠC & KHÁT VỌNG TỰ DO CÙNG TỪ HẢI',
    'ĐOÀN VIÊN TÁI HỢP & GIÁ TRỊ NHÂN ĐẠO BẤT HỦ'
  ];

  const screenLines = [
    [
      'TÊN TÁC PHẨM: ĐOẠN TRƯỜNG TÂN THANH (TRUYỆN KIỀU)',
      'TÁC GIẢ: Đại thi hào Nguyễn Du (1765 – 1820) • Danh nhân Văn hóa Thế giới',
      'THỂ LOẠI: Truyện thơ Nôm Lục bát (Gồm 3.254 câu thơ lục bát mẫu mực)',
      'NGUỒN GỐC: Tiếp thu cốt truyện "Kim Vân Kiều truyện" của Thanh Tâm Tài Nhân',
      'SÁNG TẠO ĐỘT PHÁ: Việt hóa toàn diện, nâng tầm tư tưởng nhân đạo và triết lý tài mệnh',
      'ĐỈNH CAO NGÔN NGỮ: Mẫu mực tuyệt đỉnh của thi ca cổ điển và tiếng Việt trung đại'
    ],
    [
      'TÀI SẮC VẸN TOÀN: Thúy Kiều mang vẻ đẹp "Hoa ghen thua thắm, liễu hờn kém xanh"',
      'MỐI TÌNH KIM - KIỀU: Lời thề đính ước dưới trăng thanh "Vầng trăng vằng vặc giữa trời"',
      'GIA BIẾN KINH HOÀNG: Bị vu oan giá họa, cha và em trai bị bắt giam khảo đả',
      'HIẾU NGHĨA VẸN TOÀN: Dứt tình duyên trao lại cho Thúy Vân để bán mình chuộc cha',
      'BƯỚC VÀO TRẦN AI: Bị lừa gạt bởi Mã Giám Sinh và Tú Bà, đày đọa chốn lầu xanh',
      'KHÚC CA BI TRÁNG: Tiếng đàn Hồ Cầm bạc mệnh ngân vang số phận người phụ nữ'
    ],
    [
      'LẦU NGƯNG BÍCH: Nỗi buồn cô đơn khóa xuân, hoài niệm quê hương và cha mẹ già',
      'BẪY RẬP TRẦN GIAN: Trải qua bàn tay Hoạn Thư, Thúc Sinh, Sở Khanh, Bạc Bà',
      'TRI KỶ TỪ HẢI: "Râu hùm, hàm én, mày ngài / Vai năm tấc rộng, thân mười thước cao"',
      'ANH HÙNG XUẤT THẾ: Từ Hải chuộc Kiều, giúp nàng lập đàn ân oán phân minh',
      'MẮC LỪA HỒ TÔN HIẾN: Khuyên hàng bất thành, Từ Hải chết đứng giữa bãi chiến trường',
      'TRẦM MÌNH TIỀN ĐƯỜNG: Tuyệt vọng gieo mình xuống dòng sông định mệnh Tiền Đường'
    ],
    [
      'CỨU VỚT TÂM LINH: Sư Giác Duyên lập bè cứu sống Kiều sau mười lăm năm chìm nổi',
      'CHÂU VỀ HỢP PHỐ: Kim Trọng đỗ đạt, không nguôi thương nhớ tìm lại người xưa',
      'ĐOÀN TỤ GIA ĐÌNH: Đêm đoàn viên thấu hiểu, "Đổi duyên cầm sắt đổi ra duyên bạn bầy"',
      'GIÁ TRỊ HIỆN THỰC: Tố cáo xã hội phong kiến đồng tiền đen tối chà đạp con người',
      'GIÁ TRỊ NHÂN ĐẠO: Đề cao tự do luyến ái, phẩm giá con người và quyền mưu cầu hạnh phúc',
      'SỐNG MÃI MUÔN ĐỜI: "Truyện Kiều còn, tiếng ta còn; tiếng ta còn, nước ta còn"'
    ]
  ];

  const tex = getCachedTex(`tk_giant_screen_v12_${index}`, 1536, 900, (ctx, w, h) => {
    const bgG = ctx.createLinearGradient(0, 0, w, h);
    bgG.addColorStop(0.0, 'rgba(24, 7, 38, 0.96)');
    bgG.addColorStop(0.5, 'rgba(44, 14, 66, 0.93)');
    bgG.addColorStop(1.0, 'rgba(16, 4, 28, 0.97)');
    ctx.fillStyle = bgG;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 6;
    ctx.strokeRect(16, 16, w - 32, h - 32);

    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 10;
    const corner = 60;
    ctx.beginPath(); ctx.moveTo(16, 16 + corner); ctx.lineTo(16, 16); ctx.lineTo(16 + corner, 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w - 16 - corner, 16); ctx.lineTo(w - 16, 16); ctx.lineTo(w - 16, 16 + corner); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(16, h - 16 - corner); ctx.lineTo(16, h - 16); ctx.lineTo(16 + corner, h - 16); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(w - 16 - corner, h - 16); ctx.lineTo(w - 16, h - 16); ctx.lineTo(w - 16, h - 16 - corner); ctx.stroke();

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 44px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`❖ BẢNG 0${index + 1}: ${titles[index]} ❖`, w / 2, 42);

    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(120, 110);
    ctx.lineTo(w - 120, 110);
    ctx.stroke();

    ctx.textAlign = 'left';
    const lines = screenLines[index];
    const startY = 160;
    const lineSpacing = 104;

    lines.forEach((line, i) => {
      const parts = line.split(':');
      const label = parts[0] + ':';
      const desc = parts.slice(1).join(':').trim();

      ctx.fillStyle = '#f472b6';
      ctx.beginPath();
      ctx.arc(72, startY + i * lineSpacing + 17, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 30px "Segoe UI", sans-serif';
      ctx.fillText(label, 104, startY + i * lineSpacing);

      const labelW = ctx.measureText(label).width;
      ctx.fillStyle = '#fdf2f8';
      ctx.font = '28px "Segoe UI", sans-serif';
      ctx.fillText(desc, 104 + labelW + 14, startY + i * lineSpacing);
    });
  }, 1, 1, { canvasW: 768, canvasH: 450, disableMipmaps: true });

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.95,
    side: THREE.DoubleSide,
    depthWrite: false,
    fog: false
  });

  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(11.2, 6.5), mat);
  const frameGeo = new THREE.BoxGeometry(11.32, 6.62, 0.08);
  const frameMat = new THREE.MeshBasicMaterial({ color: 0xf472b6, wireframe: true, fog: false });
  screenMesh.add(new THREE.Mesh(frameGeo, frameMat));

  return screenMesh;
}

/**
 * DỰNG KÍN 4 BỨC TƯỜNG NGĂN CÁCH KHỚP KHÍT 100% KIẾN TRÚC BẢO TÀNG THẬT
 * Rộng 25.8m x Sâu 27.6m x Cao kịch trần 9.8m, Cửa chính vòm 6.2m x 7.5m (ZERO KHOẢNG TRỐNG)
 */
function buildFullRoomEnclosureWalls(interiorGroup, {
  width = 25.32,
  depth = 27.30,
  height = 9.20,
  centerZ = -0.10,
  doorWidth = 14.5,
  doorHeight = 7.6,
  trimColor = 0xfde047,
  gltfLoader = null
} = {}) {
  const wallsGroup = new THREE.Group();
  wallsGroup.name = 'TruyenKieu_Full_4Walls_Enclosure';

  const halfW = width * 0.5;
  const halfD = depth * 0.5;
  const backZ = centerZ - halfD;
  const frontZ = centerZ + halfD;
  const wallThick = 0.16;

  // 1. TƯỜNG HẬU CẢNH (Z = -depth/2 = -13.8m): TRANH LỤA "ĐOẠN TRƯỜNG TÂN THANH - ĐÊM THỀ NGUYỀN"
  const backWallTex = getCachedTex('tk_wall_back_moon_oath_v6', 2048, 1024, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0.0, '#0e041d');
    g.addColorStop(0.5, '#2b0c45');
    g.addColorStop(1.0, '#160528');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h * 0.52;
    const moonG = ctx.createRadialGradient(cx, cy, 25, cx, cy, 330);
    moonG.addColorStop(0.0, 'rgba(255, 253, 230, 0.95)');
    moonG.addColorStop(0.35, 'rgba(253, 224, 71, 0.70)');
    moonG.addColorStop(0.65, 'rgba(244, 114, 182, 0.35)');
    moonG.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = moonG;
    ctx.beginPath();
    ctx.arc(cx, cy, 330, 0, Math.PI * 2);
    ctx.fill();

    // Cầu gỗ Thanh Minh
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(cx - 380, cy + 220);
    ctx.quadraticCurveTo(cx, cy + 130, cx + 380, cy + 220);
    ctx.stroke();

    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 380, cy + 200);
    ctx.quadraticCurveTo(cx, cy + 110, cx + 380, cy + 200);
    ctx.stroke();
    for (let p = -9; p <= 9; p++) {
      const px = cx + p * 38;
      const progress = (px - (cx - 380)) / 760;
      const py = (cy + 220) - Math.sin(progress * Math.PI) * 90;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, py - 20);
      ctx.stroke();
    }

    // Sóng nước Tiền Đường
    ctx.strokeStyle = 'rgba(253, 224, 71, 0.40)';
    ctx.lineWidth = 5;
    for (let y = h - 220; y < h - 40; y += 32) {
      ctx.beginPath();
      ctx.moveTo(100, y);
      ctx.bezierCurveTo(w * 0.3, y - 24, w * 0.7, y + 24, w - 100, y);
      ctx.stroke();
    }

    // Cành hoa đào mùa xuân
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.moveTo(60, 160);
    ctx.bezierCurveTo(240, 240, 380, 200, cx - 220, cy - 80);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(w - 60, 160);
    ctx.bezierCurveTo(w - 240, 240, w - 380, 200, cx + 220, cy - 80);
    ctx.stroke();

    for (let i = 0; i < 54; i++) {
      const bx = 140 + (i * 71) % (w - 280);
      const by = 160 + ((i * 53) % 480);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(244, 114, 182, 0.75)' : 'rgba(251, 207, 232, 0.85)';
      ctx.beginPath();
      ctx.arc(bx, by, 9 + (i % 4) * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 14;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 6;
    ctx.strokeRect(36, 36, w - 72, h - 72);

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 46px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText('ĐOẠN TRƯỜNG TÂN THANH • ĐÊM THỀ NGUYỀN', w / 2, 85);

    ctx.fillStyle = '#fbcfe8';
    ctx.font = 'italic 28px "Times New Roman", serif';
    ctx.fillText('“Vầng trăng vằng vặc giữa trời • Đinh ninh hai miệng một lời song song”', w / 2, 138);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'italic 23px "Times New Roman", serif';
    ctx.fillText('“Gìn vàng giữ ngọc cho hay • Cho đành lòng kẻ chân mây cuối trời”', w / 2, 180);
  }, 1, 1, { canvasW: 1024, canvasH: 512 });

  // 2. TƯỜNG NGĂN BÊN TRÁI (X = -width/2 = -12.9m): THƯ PHÒNG KIM TRỌNG
  const leftWallTex = getCachedTex('tk_wall_left_kim_trong_v6', 2048, 1024, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0.0, '#061329');
    g.addColorStop(0.5, '#122247');
    g.addColorStop(1.0, '#0d1733');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    for (let x = 140; x < w - 100; x += 140) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.40)';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(x, 190);
      ctx.lineTo(x, h - 50);
      ctx.stroke();

      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 4;
      for (let y = 250; y < h - 70; y += 110) {
        ctx.beginPath();
        ctx.moveTo(x - 12, y);
        ctx.lineTo(x + 12, y);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
      for (let y = 230; y < h - 110; y += 130) {
        ctx.beginPath();
        ctx.ellipse(x + 24, y - 10, 22, 6, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x - 24, y - 10, 22, 6, -Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 5;
    ctx.strokeRect(w / 2 - 280, h - 220, 560, 140);
    ctx.fillStyle = 'rgba(56, 189, 248, 0.20)';
    ctx.fillRect(w / 2 - 275, h - 215, 550, 130);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 14;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 6;
    ctx.strokeRect(36, 36, w - 72, h - 72);

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 44px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText('THƯ PHÒNG KIM TRỌNG • HIÊN LÃM THÚY', w / 2, 85);

    ctx.fillStyle = '#bae6fd';
    ctx.font = 'italic 28px "Times New Roman", serif';
    ctx.fillText('“Văn chương nết đất, thông minh tính trời”', w / 2, 138);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'italic 24px "Times New Roman", serif';
    ctx.fillText('“Phong tư tài mạo tót vời • Vào trong phong nhã ra ngoài hào hoa”', w / 2, 180);

    ctx.fillStyle = '#e0f2fe';
    ctx.font = 'italic 22px "Times New Roman", serif';
    ctx.fillText('“Tình trong như đã mặt ngoài còn e • Chập chờn cơn tỉnh cơn mê”', w / 2, 220);
  }, 1, 1, { canvasW: 1024, canvasH: 512 });

  // 3. TƯỜNG NGĂN BÊN PHẢI (X = +width/2 = +12.9m): LẦU NGƯNG BÍCH
  const rightWallTex = getCachedTex('tk_wall_right_thuy_kieu_v6', 2048, 1024, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0.0, '#30082d');
    g.addColorStop(0.5, '#4e1044');
    g.addColorStop(1.0, '#220526');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    for (let x = 100; x < w - 80; x += 38) {
      ctx.strokeStyle = 'rgba(251, 207, 232, 0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 110);
      const rLen = 290 + Math.sin(x * 0.05) * 130;
      ctx.lineTo(x, 110 + rLen);
      ctx.stroke();

      ctx.fillStyle = '#fde047';
      for (let y = 130; y < 110 + rLen; y += 42) {
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.strokeStyle = 'rgba(244, 114, 182, 0.45)';
    ctx.lineWidth = 5;
    for (let y = h - 240; y < h - 40; y += 36) {
      ctx.beginPath();
      ctx.moveTo(90, y);
      ctx.bezierCurveTo(w * 0.35, y - 26, w * 0.65, y + 26, w - 90, y);
      ctx.stroke();
    }

    for (let i = 0; i < 58; i++) {
      const bx = (i * 89) % w;
      const by = 170 + ((i * 57) % (h - 230));
      ctx.fillStyle = i % 2 === 0 ? 'rgba(244, 114, 182, 0.70)' : 'rgba(251, 207, 232, 0.85)';
      ctx.beginPath();
      ctx.arc(bx, by, 8 + (i % 4) * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 14;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 6;
    ctx.strokeRect(36, 36, w - 72, h - 72);

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 44px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText('LẦU NGƯNG BÍCH • TIẾNG ĐÀN BẠC MỆNH', w / 2, 85);

    ctx.fillStyle = '#fbcfe8';
    ctx.font = 'italic 28px "Times New Roman", serif';
    ctx.fillText('“Làn thu thủy nét xuân sơn • Hoa ghen thua thắm liễu hờn kém xanh”', w / 2, 138);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'italic 24px "Times New Roman", serif';
    ctx.fillText('“Cung thương lầu bậc ngũ âm • Nghề riêng ăn đứt hồ cầm một trương”', w / 2, 180);

    ctx.fillStyle = '#fdf2f8';
    ctx.font = 'italic 22px "Times New Roman", serif';
    ctx.fillText('“Buồn trông cửa bể chiều hôm • Thuyền ai thấp thoáng cánh buồm xa xa”', w / 2, 220);
  }, 1, 1, { canvasW: 1024, canvasH: 512 });

  // 4. TƯỜNG MẶT TIỀN (Z = +depth/2 = +13.8m): 2 CÁNH VÁCH LỤA GẤM ĐỐI XỨNG & CỔNG VÒM VÀNG
  const frontWingTex = getCachedTex('tk_wall_front_wing_v6', 1024, 1024, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0.0, '#1c082b');
    g.addColorStop(0.5, '#2e0e45');
    g.addColorStop(1.0, '#150524');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 8;
    ctx.strokeRect(16, 16, w - 32, h - 32);

    ctx.strokeStyle = 'rgba(244, 114, 182, 0.40)';
    ctx.lineWidth = 4;
    ctx.strokeRect(32, 32, w - 64, h - 64);

    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = 'rgba(253, 224, 71, 0.15)';
      ctx.beginPath();
      ctx.arc((i * 123) % w, 100 + ((i * 79) % (h - 200)), 18 + (i % 3) * 8, 0, Math.PI * 2);
      ctx.fill();
    }
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

  // 4. Vách Mặt Tiền (Z = frontZ): Hướng thẳng ra sảnh bảo tàng, cửa mở rộng 14.5m không chắn mặt người chơi
  const halfDoor = doorWidth * 0.5;
  const wingW = Math.max(0.1, halfW - halfDoor);
  const frontMat = new THREE.MeshBasicMaterial({ map: frontWingTex, side: THREE.DoubleSide, fog: false });

  // 2 cánh tường bên rìa ngoài (X = +-10m đến +-12.6m), để trống toàn bộ lòng cửa 14.5m ở giữa
  const leftFrontWing = new THREE.Mesh(new THREE.BoxGeometry(wingW + wallThick, height, wallThick), frontMat);
  leftFrontWing.position.set(-(halfDoor + (wingW + wallThick) * 0.5), height * 0.5, frontZ);
  wallsGroup.add(leftFrontWing);

  const rightFrontWing = new THREE.Mesh(new THREE.BoxGeometry(wingW + wallThick, height, wallThick), frontMat);
  rightFrontWing.position.set((halfDoor + (wingW + wallThick) * 0.5), height * 0.5, frontZ);
  wallsGroup.add(rightFrontWing);

  const lintelHeight = Math.max(0.1, height - doorHeight);
  const doorLintel = new THREE.Mesh(new THREE.BoxGeometry(doorWidth + 0.08, lintelHeight, wallThick), frontMat);
  doorLintel.position.set(0, doorHeight + lintelHeight * 0.5, frontZ);
  wallsGroup.add(doorLintel);

  const signTex = getCachedTex('tk_gate_signboard_v6', 800, 200, (ctx, w, h) => {
    ctx.fillStyle = '#1c0828';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 34px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText('❖ ĐOẠN TRƯỜNG TÂN THANH • TRUYỆN KIỀU ❖', w / 2, 72);

    ctx.fillStyle = '#fbcfe8';
    ctx.font = 'italic 22px "Times New Roman", serif';
    ctx.fillText('Đại thi hào Nguyễn Du (1765 – 1820) • Danh nhân Văn hóa Thế giới', w / 2, 134);
  });
  const gateSign = new THREE.Mesh(
    new THREE.PlaneGeometry(Math.min(doorWidth * 0.68, 8.5), 1.2),
    new THREE.MeshBasicMaterial({ map: signTex, side: THREE.FrontSide, fog: false })
  );
  gateSign.rotation.y = Math.PI;
  gateSign.position.set(0, Math.min(doorHeight + 0.65, height - 0.70), frontZ - 0.09);

  wallsGroup.add(gateSign);
  interiorGroup.add(wallsGroup);

  return {
    wallsGroup,
    collisionSolids: [backWall, leftWall, rightWall, leftFrontWing, rightFrontWing, doorLintel]
  };
}

const SHARED_PEACH_MATS = {
  trunk: new THREE.MeshLambertMaterial({ color: 0x3d2214, emissive: 0x160a04 }),
  blossomMain: new THREE.MeshBasicMaterial({ color: 0xf472b6, fog: false }),
  blossomSoft: new THREE.MeshBasicMaterial({ color: 0xfbcfe8, fog: false }),
  blossomDeep: new THREE.MeshBasicMaterial({ color: 0xdb2777, fog: false })
};

const SHARED_WILLOW_MATS = {
  trunk: new THREE.MeshLambertMaterial({ color: 0x33241b, emissive: 0x120b07 }),
  vine: new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.78, fog: false }),
  softVine: new THREE.MeshBasicMaterial({ color: 0x86efac, transparent: true, opacity: 0.65, fog: false })
};

/**
 * TẠO CÂY HOA ĐÀO CỔ THỤ CHI TIẾT CHO CÕI THƠ (3 SẮC ĐỘ HỒNG)
 */
function createDetailedPeachTree(scale = 1.0) {
  const tree = new THREE.Group();
  const trunkMat = SHARED_PEACH_MATS.trunk;
  const blossomMain = SHARED_PEACH_MATS.blossomMain;
  const blossomSoft = SHARED_PEACH_MATS.blossomSoft;
  const blossomDeep = SHARED_PEACH_MATS.blossomDeep;

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.52, 4.2, 10), trunkMat);
  trunk.position.y = 2.1;
  trunk.rotation.z = 0.05;
  tree.add(trunk);

  const branches = [
    { pos: [0.95, 3.6, 0.35], rot: [0.22, 0, -0.58], len: 2.5 },
    { pos: [-0.9, 3.4, -0.4], rot: [-0.25, 0, 0.52], len: 2.4 },
    { pos: [0.25, 3.9, -0.95], rot: [-0.52, 0, -0.15], len: 2.2 },
    { pos: [-0.3, 3.8, 0.95], rot: [0.48, 0, 0.2], len: 2.1 }
  ];
  branches.forEach((b) => {
    const br = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.22, b.len, 8), trunkMat);
    br.position.set(...b.pos);
    br.rotation.set(...b.rot);
    tree.add(br);
  });

  const crowns = [
    { pos: [0, 4.9, 0], r: 2.1, mat: blossomMain },
    { pos: [1.75, 4.3, 0.6], r: 1.65, mat: blossomSoft },
    { pos: [-1.65, 4.2, -0.5], r: 1.6, mat: blossomMain },
    { pos: [0.4, 4.5, -1.55], r: 1.5, mat: blossomDeep },
    { pos: [-0.5, 4.6, 1.45], r: 1.45, mat: blossomSoft },
    { pos: [1.1, 5.2, -0.7], r: 1.35, mat: blossomSoft },
    { pos: [-1.1, 5.1, 0.7], r: 1.35, mat: blossomDeep }
  ];
  crowns.forEach((c) => {
    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(c.r, 1), c.mat);
    crown.scale.set(1.28, 0.72, 1.28);
    crown.position.set(...c.pos);
    tree.add(crown);
  });

  tree.scale.setScalar(scale);
  return tree;
}

/**
 * TẠO CÂY LIỄU RỦ BÊN HỒ THU THỦY
 */
function createWeepingWillowTree(scale = 1.0) {
  const willow = new THREE.Group();
  const trunkMat = SHARED_WILLOW_MATS.trunk;
  const vineMat = SHARED_WILLOW_MATS.vine;
  const softVineMat = SHARED_WILLOW_MATS.softVine;

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.48, 4.4, 10), trunkMat);
  trunk.position.y = 2.2;
  trunk.rotation.z = -0.08;
  willow.add(trunk);

  const dome = new THREE.Mesh(new THREE.SphereGeometry(2.1, 12, 10), vineMat);
  dome.scale.set(1.3, 0.55, 1.3);
  dome.position.y = 4.6;
  willow.add(dome);

  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2;
    const rad = 1.2 + (i % 3) * 0.55;
    const strandH = 3.0 + (i % 4) * 0.45;
    const strand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.08, strandH, 6),
      i % 2 === 0 ? vineMat : softVineMat
    );
    strand.position.set(
      Math.cos(ang) * rad,
      4.3 - strandH * 0.5,
      Math.sin(ang) * rad
    );
    willow.add(strand);
  }

  willow.scale.setScalar(scale);
  return willow;
}

/**
 * TẠO LẦU NGƯNG BÍCH 2 TẦNG MÁI ĐAO CỔ KÍNH
 */
function createDetailedNgungBichPavilion(goldMat, lanternRefs = []) {
  const pavilion = new THREE.Group();

  const stoneMat = new THREE.MeshLambertMaterial({ color: 0x3b2d4a, emissive: 0x181024 });
  const crimsonPillarMat = new THREE.MeshPhongMaterial({
    color: 0x881337,
    emissive: 0x3b0718,
    specular: 0xf472b6,
    shininess: 75
  });
  const roofTileMat = new THREE.MeshPhongMaterial({
    color: 0x1e1333,
    emissive: 0x0d071a,
    specular: 0xfde047,
    shininess: 85
  });
  const silkCurtainMat = new THREE.MeshBasicMaterial({
    color: 0xf472b6,
    transparent: true,
    opacity: 0.42,
    side: THREE.DoubleSide,
    fog: false
  });

  const staticPavilion = new THREE.Group();

  // Nền đá 3 bậc
  const base1 = new THREE.Mesh(new THREE.CylinderGeometry(8.2, 9.2, 0.9, 8), stoneMat);
  base1.position.y = 0.45;
  const base2 = new THREE.Mesh(new THREE.CylinderGeometry(7.0, 7.6, 0.7, 8), stoneMat);
  base2.position.y = 1.25;
  const goldTrimBase = new THREE.Mesh(new THREE.CylinderGeometry(7.15, 7.15, 0.12, 8), goldMat);
  goldTrimBase.position.y = 1.62;
  staticPavilion.add(base1, base2, goldTrimBase);

  // 8 Cột Son Thếp Vàng & Rèm Lụa Hồng Phất Phơ
  const r1 = 5.4;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const px = Math.cos(a) * r1;
    const pz = Math.sin(a) * r1;

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 5.4, 12), crimsonPillarMat);
    pillar.position.set(px, 4.3, pz);
    staticPavilion.add(pillar);

    const pRing = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.25, 12), goldMat);
    pRing.position.set(px, 1.8, pz);
    staticPavilion.add(pRing);

    if (i % 2 === 0) {
      const curtain = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 4.2), silkCurtainMat);
      curtain.position.set(px * 0.85, 4.2, pz * 0.85);
      curtain.lookAt(0, 4.2, 0);
      staticPavilion.add(curtain);
    }
  }

  // Mái Đao Tầng 1 & 8 Đèn Lồng ở 8 góc mái (InstancedMesh: 2 Draw Calls)
  const roof1 = new THREE.Mesh(new THREE.ConeGeometry(8.6, 2.4, 8), roofTileMat);
  roof1.position.y = 8.1;
  roof1.rotation.y = Math.PI / 8;
  const eaveGold1 = new THREE.Mesh(new THREE.CylinderGeometry(8.65, 8.75, 0.16, 8), goldMat);
  eaveGold1.position.y = 6.95;
  eaveGold1.rotation.y = Math.PI / 8;
  staticPavilion.add(roof1, eaveGold1);

  const pavCordGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.7, 6);
  const pavCordMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
  const pavBulbGeo = new THREE.SphereGeometry(0.36, 12, 10);
  const pavBulbMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
  const instPavCords = new THREE.InstancedMesh(pavCordGeo, pavCordMat, 8);
  const instPavBulbs = new THREE.InstancedMesh(pavBulbGeo, pavBulbMat, 8);
  const pavDummy = new THREE.Object3D();
  const pavGoldColor = new THREE.Color(0xfde047);
  const pavPinkColor = new THREE.Color(0xf472b6);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const lx = Math.cos(a) * 8.1;
    const lz = Math.sin(a) * 8.1;

    pavDummy.position.set(lx, 6.2 + 0.45, lz);
    pavDummy.rotation.set(0, 0, 0);
    pavDummy.scale.set(1, 1, 1);
    pavDummy.updateMatrix();
    instPavCords.setMatrixAt(i, pavDummy.matrix);

    pavDummy.position.set(lx, 6.2, lz);
    pavDummy.scale.set(1, 1.25, 1);
    pavDummy.updateMatrix();
    instPavBulbs.setMatrixAt(i, pavDummy.matrix);
    instPavBulbs.setColorAt(i, i % 2 === 0 ? pavGoldColor : pavPinkColor);

    lanternRefs.push({
      lx,
      baseY: 6.2,
      lz,
      phase: i * 0.8,
      instCords: instPavCords,
      instBulbs: instPavBulbs,
      index: i
    });
  }
  instPavCords.instanceMatrix.needsUpdate = true;
  instPavBulbs.instanceMatrix.needsUpdate = true;
  if (instPavBulbs.instanceColor) instPavBulbs.instanceColor.needsUpdate = true;
  instPavCords.computeBoundingSphere();
  instPavBulbs.computeBoundingSphere();
  pavilion.add(instPavCords, instPavBulbs);

  // Tầng 2 Lầu Ngưng Bích
  const upperCore = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 4.1, 3.4, 8), crimsonPillarMat);
  upperCore.position.y = 10.2;
  upperCore.rotation.y = Math.PI / 8;
  staticPavilion.add(upperCore);

  const roof2 = new THREE.Mesh(new THREE.ConeGeometry(6.4, 2.3, 8), roofTileMat);
  roof2.position.y = 13.0;
  roof2.rotation.y = Math.PI / 8;
  const eaveGold2 = new THREE.Mesh(new THREE.CylinderGeometry(6.45, 6.55, 0.14, 8), goldMat);
  eaveGold2.position.y = 11.9;
  eaveGold2.rotation.y = Math.PI / 8;
  staticPavilion.add(roof2, eaveGold2);

  const finial = new THREE.Mesh(new THREE.OctahedronGeometry(0.65, 1), goldMat);
  finial.position.y = 14.6;
  staticPavilion.add(finial);

  mergeGroupMeshesByMaterial(staticPavilion);
  pavilion.add(staticPavilion);

  return pavilion;
}

/**
 * TẠO CẦU GỖ ĐỎ THANH MINH 15 NHỊP VÒM CONG (createCrimsonArchBridge)
 */
function createCrimsonArchBridge(goldMat) {
  const bridge = new THREE.Group();
  const crimsonWood = new THREE.MeshLambertMaterial({ color: 0x991b1b, emissive: 0x3b0808 });
  const darkDeckMat = new THREE.MeshLambertMaterial({ color: 0x3b1812, emissive: 0x170805 });

  const segCount = 15;
  const spanLength = 18.0;

  for (let i = 0; i < segCount; i++) {
    const t = i / (segCount - 1);
    const zPos = (t - 0.5) * spanLength;
    const archY = Math.sin(t * Math.PI) * 2.35;

    const plank = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.18, 1.35), darkDeckMat);
    plank.position.set(0, archY, zPos);
    plank.rotation.x = Math.cos(t * Math.PI) * 0.24;
    bridge.add(plank);

    [-1.68, 1.68].forEach((sideX) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.05, 8), crimsonWood);
      post.position.set(sideX, archY + 0.55, zPos);
      bridge.add(post);

      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), goldMat);
      cap.position.set(sideX, archY + 1.12, zPos);
      bridge.add(cap);
    });
  }

  mergeGroupMeshesByMaterial(bridge);
  return bridge;
}

/**
 * TẠO THUYỀN HOA GIANG NAM CỔ TRUYỀN
 */
function createPoeticSampanBoat(goldMat) {
  const boat = new THREE.Group();
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x3e2111, emissive: 0x170b04 });
  const canopyMat = new THREE.MeshLambertMaterial({ color: 0x581c3c, emissive: 0x240918 });

  const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.55, 5.2, 12), woodMat);
  hull.rotation.z = Math.PI / 2;
  hull.scale.set(0.55, 1.0, 1.25);
  hull.position.y = 0.25;
  boat.add(hull);

  const cabin = new THREE.Mesh(new THREE.CylinderGeometry(0.82, 0.82, 2.2, 10, 1, false, 0, Math.PI), canopyMat);
  cabin.rotation.z = Math.PI / 2;
  cabin.position.y = 0.45;
  boat.add(cabin);

  const prowPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.2, 6), woodMat);
  prowPole.position.set(2.3, 0.85, 0);
  prowPole.rotation.z = -0.35;
  boat.add(prowPole);

  const prowLantern = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xfef08a, fog: false })
  );
  prowLantern.position.set(2.55, 1.18, 0);
  boat.add(prowLantern);

  const goldTrim = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.06, 1.7), goldMat);
  goldTrim.position.y = 0.45;
  boat.add(goldTrim);

  mergeGroupMeshesByMaterial(boat);
  return boat;
}

/**
 * HÀM CHÍNH KHỞI TẠO TOÀN DIỆN PHÒNG TRƯNG BÀY & CÕI THƠ TRUYỆN KIỀU
 */
export function buildTruyenKieuExhibition({
  roomCenter = new THREE.Vector3(-48, 10, 19),
  poeticScene = null,
  kieuGlbUrl = '/model/thuykieu.glb',
  kimGlbUrl = '/model/kimtrongthuykieu.glb'
} = {}) {
  const root = new THREE.Group();
  root.name = 'TruyenKieu_Master_Root';
  root.position.set(0, 0, 0);

  let _poeticScene = poeticScene;
  const gltfLoader = getSharedGltfLoader();

  // =========================================================================
  // PHẦN A: PHÒNG TRƯNG BÀY BẢO TÀNG (KHỚP KHÍT 100% 25.32m x 27.30m x 9.20m)
  // =========================================================================
  const ROOM_W = 25.32;
  const ROOM_D = 27.30;
  const ROOM_H = 9.20;
  const ROOM_CENTER_Z = -0.10;
  const DOOR_W = 6.2;
  const DOOR_H = 7.5;

  const roomGroup = new THREE.Group();
  roomGroup.name = 'TruyenKieu_Museum_Room';
  roomGroup.position.copy(roomCenter);
  root.add(roomGroup);

  const interiorGroup = new THREE.Group();
  interiorGroup.name = 'TK_Aligned_Interior';
  if (Math.abs(roomCenter.x) >= Math.abs(roomCenter.z)) {
    interiorGroup.rotation.y = roomCenter.x < 0 ? Math.PI / 2 : -Math.PI / 2;
  } else {
    interiorGroup.rotation.y = roomCenter.z < 0 ? 0 : Math.PI;
  }
  roomGroup.add(interiorGroup);

  // A1. DỰNG 4 BỨC TƯỜNG ĐẶC TRƯNG KHỚP KHOANG PHÒNG BẢO TÀNG THẬT (CỬA RỘNG 14.5m HƯỚNG RA SẢNH)
  const enclosure = buildFullRoomEnclosureWalls(interiorGroup, {
    width: ROOM_W,
    depth: ROOM_D,
    height: ROOM_H,
    centerZ: ROOM_CENTER_Z,
    doorWidth: 14.5,
    doorHeight: DOOR_H,
    trimColor: 0xfde047,
    gltfLoader
  });

  // A1.0 NÂNG CẤP HỌA TIẾT TƯỜNG 3 TẦNG, PHÀO CHỈ, 4 TRANH PHÙ ĐIÊU & BÌNH PHONG HẮT SÁNG
  upgradeRoomWallArchitecture(interiorGroup, {
    themeKey: 'truyenKieu',
    roomWidth: ROOM_W,
    roomDepth: ROOM_D,
    wallHeight: ROOM_H
  });

  // A1.1 CỔNG VÒM MÁI ĐAO HOÀNG GIA KÈM HOÀNH PHI CÂU ĐỐI TẠI MẶT TIỀN (Z = +12.0m)
  const kieuTraditionalArchway = createTraditionalArchwayEntrance({
    roomTitle: 'ĐOẠN TRƯỜNG TÂN THANH',
    leftCouplet: 'Trăm năm trong cõi người ta',
    rightCouplet: 'Chữ tài chữ mệnh khéo là ghét nhau',
    archWidth: 6.2,
    archHeight: 4.8
  });
  kieuTraditionalArchway.position.set(0, 0, 12.0);
  interiorGroup.add(kieuTraditionalArchway);

  // A2. ÁNH SÁNG RIÊNG TRONG PHÒNG BẢO TÀNG (castShadow = false, 60+ FPS)
  const moonCenterLight = new THREE.PointLight(0xfde047, 2.6, 14, 2.0);
  moonCenterLight.position.set(0, 4.5, -1.0);
  moonCenterLight.castShadow = false;
  interiorGroup.add(moonCenterLight);

  const kimJadeBlueLight = new THREE.PointLight(0x38bdf8, 2.4, 12, 2.0);
  kimJadeBlueLight.position.set(-4.5, 4.0, -5.5);
  kimJadeBlueLight.castShadow = false;
  interiorGroup.add(kimJadeBlueLight);

  const kieuPeachPinkLight = new THREE.PointLight(0xf472b6, 2.4, 12, 2.0);
  kieuPeachPinkLight.position.set(4.5, 4.0, -5.5);
  kieuPeachPinkLight.castShadow = false;
  interiorGroup.add(kieuPeachPinkLight);

  // A3. TRẦN NHÀ VÒM TRỜI ĐÊM THANH MINH (25.0m x 27.0m tại Y = 8.6m)
  const ceilingTex = getCachedTex('tk_ceiling_moon_canopy_v7', 2048, 2048, (ctx, w, h) => {
    ctx.fillStyle = '#0e041d';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2, cy = h / 2;
    const g = ctx.createRadialGradient(cx, cy, 30, cx, cy, cx * 0.88);
    g.addColorStop(0.0, 'rgba(255, 252, 230, 0.85)');
    g.addColorStop(0.28, 'rgba(253, 224, 71, 0.60)');
    g.addColorStop(0.58, 'rgba(244, 114, 182, 0.38)');
    g.addColorStop(0.82, 'rgba(56, 189, 248, 0.22)');
    g.addColorStop(1.0, 'rgba(14, 4, 29, 1.0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, cx * 0.88, 0, Math.PI * 2);
    ctx.fill();

    for (let s = 0; s < 130; s++) {
      const sx = (s * 137) % w;
      const sy = (s * 191) % h;
      ctx.fillStyle = s % 3 === 0 ? '#fde047' : '#ffffff';
      ctx.beginPath();
      ctx.arc(sx, sy, 1.5 + (s % 3), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 4;
    [0.22, 0.44, 0.68, 0.88].forEach((r) => {
      ctx.beginPath();
      ctx.arc(cx, cy, cx * r, 0, Math.PI * 2);
      ctx.stroke();
    });
  }, 1, 1, { canvasW: 1024, canvasH: 1024 });

  const solidCeiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W + 0.20, ROOM_D + 0.20),
    new THREE.MeshBasicMaterial({ map: ceilingTex, side: THREE.FrontSide, depthWrite: true, fog: false })
  );
  solidCeiling.rotation.x = Math.PI / 2;
  solidCeiling.position.set(0, ROOM_H, ROOM_CENTER_Z);
  interiorGroup.add(solidCeiling);

  // 8 ĐÈN LỒNG LỤA HỒNG - VÀNG TREO THẢ TỪ TRẦN (InstancedMesh: 4 Draw Calls thay vì 40)
  const silkLanterns = [];
  const lanternY = 7.2;
  const cordLength = ROOM_H - 5.8;
  const instLanternCords = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.015, 0.015, cordLength, 6),
    new THREE.MeshBasicMaterial({ color: 0xfde047, fog: false }),
    8
  );
  const instLanternBodies = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.50, 16, 14),
    new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }),
    8
  );
  const instLanternCaps = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.20, 0.20, 0.08, 12),
    new THREE.MeshBasicMaterial({ color: 0xd97706, fog: false }),
    16
  );
  const instLanternTassels = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.04, 0.14, 0.65, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }),
    8
  );
  const _lanternDummy = new THREE.Object3D();
  const pinkLanternCol = new THREE.Color(0xf472b6);
  const goldLanternCol = new THREE.Color(0xfde047);

  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const radius = 7.2;
    const lx = Math.cos(angle) * radius;
    const lz = Math.sin(angle) * radius + ROOM_CENTER_Z - 0.7;
    const lGroup = new THREE.Group();
    lGroup.position.set(lx, lanternY, lz);
    interiorGroup.add(lGroup);

    const col = i % 2 === 0 ? pinkLanternCol : goldLanternCol;
    _lanternDummy.rotation.set(0, 0, 0);

    _lanternDummy.position.set(lx, lanternY + cordLength * 0.5, lz);
    _lanternDummy.scale.set(1, 1, 1);
    _lanternDummy.updateMatrix();
    instLanternCords.setMatrixAt(i, _lanternDummy.matrix);

    _lanternDummy.position.set(lx, lanternY, lz);
    _lanternDummy.scale.set(1.0, 1.35, 1.0);
    _lanternDummy.updateMatrix();
    instLanternBodies.setMatrixAt(i, _lanternDummy.matrix);
    instLanternBodies.setColorAt(i, col);

    _lanternDummy.scale.set(1, 1, 1);
    _lanternDummy.position.set(lx, lanternY + 0.68, lz);
    _lanternDummy.updateMatrix();
    instLanternCaps.setMatrixAt(i * 2, _lanternDummy.matrix);
    _lanternDummy.position.set(lx, lanternY - 0.68, lz);
    _lanternDummy.updateMatrix();
    instLanternCaps.setMatrixAt(i * 2 + 1, _lanternDummy.matrix);

    _lanternDummy.position.set(lx, lanternY - 1.05, lz);
    _lanternDummy.updateMatrix();
    instLanternTassels.setMatrixAt(i, _lanternDummy.matrix);
    instLanternTassels.setColorAt(i, col);

    silkLanterns.push({ group: lGroup, x: lx, z: lz });
  }
  instLanternCords.instanceMatrix.needsUpdate = true;
  instLanternBodies.instanceMatrix.needsUpdate = true;
  instLanternCaps.instanceMatrix.needsUpdate = true;
  instLanternTassels.instanceMatrix.needsUpdate = true;
  if (instLanternBodies.instanceColor) instLanternBodies.instanceColor.needsUpdate = true;
  if (instLanternTassels.instanceColor) instLanternTassels.instanceColor.needsUpdate = true;
  instLanternCords.computeBoundingSphere();
  instLanternBodies.computeBoundingSphere();
  instLanternCaps.computeBoundingSphere();
  instLanternTassels.computeBoundingSphere();
  interiorGroup.add(instLanternCords, instLanternBodies, instLanternCaps, instLanternTassels);

  // NẠP MÔ HÌNH ĐÈN LỒNG CỔ .GLB (den_long_treo.glb / den_long_co.glb) VÀO 8 ĐÈN LỒNG TREO TRẦN
  if (gltfLoader) {
    loadGlbWithFallback(
      gltfLoader,
      ['/model/den_long_treo.glb', '/models/den_long_treo.glb', '/model/den_long_co.glb'],
      (rawScene) => {
        silkLanterns.forEach((lEntry) => {
          const lModel = prepareUnlitVividGlbModel(rawScene.clone(true), {
            targetSpan: 1.1,
            fitAxis: 'y',
            groundY: false,
            color: 0xf472b6,
            castShadow: false,
            receiveShadow: false
          });
          lModel.position.set(0, -0.4, 0);
          lEntry.group.add(lModel);
        });
      }
    );
  }

  // A4. SÀN NHÀ MỞ RỘNG PHỦ KÍN 100% PHÒNG (25.8m x 27.6m) - MANDALA HOA ĐÀO 8 CÁNH
  const floorTex = getCachedTex('tk_floor_mandala_v7', 2048, 2048, (ctx, w, h) => {
    const bg = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w * 0.72);
    bg.addColorStop(0.0, '#2a0c47');
    bg.addColorStop(0.55, '#17062b');
    bg.addColorStop(1.0, '#0a0214');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2, cy = h / 2;

    for (let p = 0; p < 8; p++) {
      const a = (p / 8) * Math.PI * 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(a);

      ctx.fillStyle = p % 2 === 0 ? 'rgba(244, 114, 182, 0.38)' : 'rgba(56, 189, 248, 0.30)';
      ctx.beginPath();
      ctx.ellipse(0, -340, 100, 290, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }

    ctx.strokeStyle = 'rgba(253, 224, 71, 0.45)';
    ctx.lineWidth = 6;
    [220, 480, 720, 900].forEach((r) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    ctx.strokeStyle = '#f472b6';
    ctx.lineWidth = 20;
    ctx.strokeRect(24, 24, w - 48, h - 48);

    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 8;
    ctx.strokeRect(52, 52, w - 104, h - 104);
  }, 1, 1, { canvasW: 1024, canvasH: 1024 });

  const floorMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_W, ROOM_D),
    new THREE.MeshBasicMaterial({ map: floorTex, side: THREE.FrontSide, depthWrite: true, fog: false })
  );
  floorMesh.rotation.x = -Math.PI / 2;
  floorMesh.position.set(0, 0.02, ROOM_CENTER_Z);
  interiorGroup.add(floorMesh);

  // VẬT LIỆU DÙNG CHO CÁC BỆ TƯỢNG & HIỆN VẬT
  const goldMat = new THREE.MeshPhongMaterial({
    color: 0xf59e0b,
    emissive: 0x452804,
    specular: 0xfef08a,
    shininess: 95
  });
  const royalVioletMat = new THREE.MeshPhongMaterial({
    color: 0x3b0764,
    emissive: 0x1e0538,
    specular: 0xf472b6,
    shininess: 80
  });
  const jadeBlueMat = new THREE.MeshPhongMaterial({
    color: 0x0369a1,
    emissive: 0x082f49,
    specular: 0x7dd3fc,
    shininess: 85
  });
  const ebonyWoodMat = new THREE.MeshPhongMaterial({
    color: 0x220e05,
    emissive: 0x120602,
    specular: 0xfbbf24,
    shininess: 70
  });

  // A5. BỆ TƯỢNG ĐỐI XỨNG KIM TRỌNG (.GLB) & THÚY KIỀU (.GLB) VÀ TRĂNG THỀ
  const kimPedestal = new THREE.Group();
  kimPedestal.position.set(-3.8, 0, -6.2);
  interiorGroup.add(kimPedestal);

  const kimBase = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 0.72, 20), jadeBlueMat);
  kimBase.position.y = 0.36;
  const kimRim = new THREE.Mesh(new THREE.CylinderGeometry(1.58, 1.58, 0.09, 20), goldMat);
  kimRim.position.y = 0.74;

  const kimRay = createVolumetricLightBeam(0.55, 1.65, 7.0, 0x38bdf8, 0.24);
  kimRay.position.y = 4.2;

  const kimPlaque = createRelicPlaque('CHÀNG KIM TRỌNG', 'Phong Tư Tài Mạo • Vào Trong Phong Nhã', '#38bdf8');
  kimPlaque.position.set(0, 0.68, 1.68);
  kimPedestal.add(kimBase, kimRim, kimRay, kimPlaque);

  const kimRoomHolder = new THREE.Group();
  kimRoomHolder.position.set(0, 0.78, 0);
  kimRoomHolder.rotation.y = 0.25;
  kimPedestal.add(kimRoomHolder);

  const kieuPedestal = new THREE.Group();
  kieuPedestal.position.set(3.8, 0, -6.2);
  interiorGroup.add(kieuPedestal);

  const kieuBase = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.8, 0.72, 20), royalVioletMat);
  kieuBase.position.y = 0.36;
  const kieuRim = new THREE.Mesh(new THREE.CylinderGeometry(1.58, 1.58, 0.09, 20), goldMat);
  kieuRim.position.y = 0.74;

  const kieuRay = createVolumetricLightBeam(0.55, 1.65, 7.0, 0xf472b6, 0.24);
  kieuRay.position.y = 4.2;

  const kieuPlaque = createRelicPlaque('NÀNG THÚY KIỀU', 'Làn Thu Thủy Nét Xuân Sơn • Hoa Ghen Thua Thắm', '#f472b6');
  kieuPlaque.position.set(0, 0.68, 1.68);
  kieuPedestal.add(kieuBase, kieuRim, kieuRay, kieuPlaque);

  const kieuRoomHolder = new THREE.Group();
  kieuRoomHolder.position.set(0, 0.78, 0);
  kieuRoomHolder.rotation.y = -0.25;
  kieuPedestal.add(kieuRoomHolder);

  // Thảm Mandala Hoa Sen dưới chân tượng Kim Trọng & Thúy Kiều (mesh-detailing-specialist)
  const kimMandala = createDetailedMandalaFloorDecal('truyenKieu', 2.3);
  kimMandala.position.set(-3.8, 0.025, -6.2);
  interiorGroup.add(kimMandala);

  const kieuMandala = createDetailedMandalaFloorDecal('truyenKieu', 2.3);
  kieuMandala.position.set(3.8, 0.025, -6.2);
  interiorGroup.add(kieuMandala);

  const centerLotusDecal = createDetailedMandalaFloorDecal('truyenKieu', 3.8);
  centerLotusDecal.position.set(0, 0.022, 0.8);
  interiorGroup.add(centerLotusDecal);

  // Vầng Trăng Thề phát sáng ở giữa phía sau
  const moonOathGroup = new THREE.Group();
  moonOathGroup.position.set(0, 4.0, -7.8);

  const moonSphere = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 24, 20),
    new THREE.MeshBasicMaterial({ color: 0xfef08a, fog: false })
  );
  const moonHalo = new THREE.Mesh(
    new THREE.RingGeometry(1.45, 2.4, 32),
    new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
      fog: false
    })
  );
  moonOathGroup.add(moonSphere, moonHalo);
  interiorGroup.add(moonOathGroup);

  // 4 Dây tơ đàn Hồ Cầm vàng kim nối từ bệ Kim Trọng sang bệ Thúy Kiều
  const stringMat = new THREE.MeshBasicMaterial({ color: 0xfde047, fog: false });
  const harpStringsGroup = new THREE.Group();
  for (let s = 0; s < 4; s++) {
    const yOffset = 0.78 + s * 0.16;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3.8, yOffset, -6.2),
      new THREE.Vector3(-1.9, yOffset + 0.35 - s * 0.05, -6.6),
      new THREE.Vector3(0, yOffset + 0.45 - s * 0.05, -6.8),
      new THREE.Vector3(1.9, yOffset + 0.35 - s * 0.05, -6.6),
      new THREE.Vector3(3.8, yOffset, -6.2)
    ]);
    const strGeo = new THREE.TubeGeometry(curve, 32, 0.02, 6, false);
    harpStringsGroup.add(new THREE.Mesh(strGeo, stringMat));
  }
  mergeGroupMeshesByMaterial(harpStringsGroup);
  interiorGroup.add(harpStringsGroup);

  // A6. BỤC SÁCH DỊCH CHUYỂN TRUNG TÂM (Nạp Án Thư Gỗ Cổ .GLB thật từ web, thay thế Cylinder)
  const bookAltar = new THREE.Group();
  bookAltar.name = 'Interactive_TruyenKieu_Teleport_Book';
  bookAltar.position.set(0, 0, 0.6);
  bookAltar.userData.isTeleportBook = true;
  bookAltar.userData.targetRealm = 'TRUYEN_KIEU_REALM';
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
          color: 0x421d28,
          castShadow: false,
          receiveShadow: false
        });
        table.position.set(0, 0, 0);
        bookAltar.add(table);
      }
    );
  } else {
    const step1 = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.5, 0.26, 16), royalVioletMat);
    step1.position.y = 0.13;
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, 0.95, 16), royalVioletMat);
    pedestal.position.y = 0.72;
    bookAltar.add(step1, pedestal);
  }

  const bookMeshGroup = new THREE.Group();
  bookMeshGroup.position.set(0, 1.25, 0);
  bookMeshGroup.rotation.x = 0.38;
  bookMeshGroup.userData.isTeleportBook = true;
  bookMeshGroup.userData.targetRealm = 'TRUYEN_KIEU_REALM';

  const pageMat = new THREE.MeshLambertMaterial({ color: 0xfdf2f8, emissive: 0x831843 });
  const pageLeft = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.06, 0.92), pageMat);
  pageLeft.position.x = -0.34;
  pageLeft.rotation.z = -0.15;
  pageLeft.userData.isTeleportBook = true;
  pageLeft.userData.targetRealm = 'TRUYEN_KIEU_REALM';

  const pageRight = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.06, 0.92), pageMat);
  pageRight.position.x = 0.34;
  pageRight.rotation.z = 0.15;
  pageRight.userData.isTeleportBook = true;
  pageRight.userData.targetRealm = 'TRUYEN_KIEU_REALM';

  const bookSpine = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.96), goldMat);
  bookSpine.userData.isTeleportBook = true;
  bookSpine.userData.targetRealm = 'TRUYEN_KIEU_REALM';
  bookMeshGroup.add(pageLeft, pageRight, bookSpine);

  bookAltar.add(bookMeshGroup);

  // Cập nhật ma trận thế giới & Bọc Tight Click Hitbox cho Cuốn Sách Dịch Chuyển (padding: 0.12)
  bookMeshGroup.updateMatrixWorld(true);
  if (typeof window !== 'undefined' && window.__museumHitboxManager) {
    window.__museumHitboxManager.createTightClickHitbox(bookMeshGroup, {
      loreKey: 'truyen_kieu',
      isBookPortal: true,
      portalTargetRealm: 'TRUYEN_KIEU_REALM',
      padding: 0.12
    });
  }

  // Luồng sáng vàng kim thần thánh chiếu xuống án thư dịch chuyển (environment-lighting-artist & realmOptimizer)
  const centerGodRay = createOptimizedGodRays('#fde047', 7.2, 0.6, 2.2);
  centerGodRay.position.set(0, 7.6, 0.6);
  interiorGroup.add(centerGodRay);

  const promptBanner = createPortalBanner({
    headerTag: 'CỔNG DỊCH CHUYỂN CÕI THƠ',
    title: '📖 CLICK CHUỘT VÀO SÁCH ĐỂ VÀO CÕI KIỀU',
    subtitle: 'Cutscene hút xoáy vào trang sách • Nhấn ESC để thoát',
    accentColor: '#f472b6'
  });
  promptBanner.position.set(0, 3.1, 0);
  bookAltar.add(promptBanner);

  // A7. 4 MÔ HÌNH HIỆN VẬT 3D ĐẶC TRƯNG CỦA TRUYỆN KIỀU (Nạp Bệ Đá Cổ .GLB từ web thay thế Cylinder)
  function createExhibitPedestal(x, z, title, sub, borderCol, rayCol) {
    const pGroup = new THREE.Group();
    pGroup.position.set(x, 0, z);

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
            color: 0x3a1e2f,
            castShadow: false,
            receiveShadow: false
          });
          stonePed.position.set(0, 0, 0);
          pGroup.add(stonePed);
        }
      );
    } else {
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.1, 1.05, 14), royalVioletMat);
      base.position.y = 0.525;
      pGroup.add(base);
    }

    const relicRay = createVolumetricLightBeam(0.38, 1.2, 6.6, rayCol, 0.20);
    relicRay.position.y = 4.0;

    const plaque = createRelicPlaque(title, sub, borderCol);
    plaque.position.set(0, 0.68, 1.08);

    pGroup.add(relicRay, plaque);
    interiorGroup.add(pGroup);
    return pGroup;
  }

  // 1) Đàn Hồ Cầm (Tỳ Bà 4 dây vàng) của Thúy Kiều - Bệ Hoa Sen & Hàng Rào Dây Nhung Chuẩn Bảo Tàng
  const luteGroup = new THREE.Group();
  luteGroup.position.y = 0.25;
  luteGroup.rotation.z = -0.28;

  const luteBody = new THREE.Mesh(new THREE.SphereGeometry(0.38, 16, 12), ebonyWoodMat);
  luteBody.scale.set(0.85, 1.35, 0.35);
  const luteNeck = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.95, 0.08), goldMat);
  luteNeck.position.y = 0.65;
  luteGroup.add(luteBody, luteNeck);

  for (let s = -1.5; s <= 1.5; s += 1) {
    const str = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 1.25, 4),
      new THREE.MeshBasicMaterial({ color: 0xfef08a, fog: false })
    );
    str.position.set(s * 0.025, 0.42, 0.14);
    luteGroup.add(str);
  }

  const luteStation = createCuratedArtifactStation({
    artifactMesh: luteGroup,
    loreKey: 'truyenKieu_hoCam',
    stationTitle: 'ĐÀN HỒ CẦM (TỲ BÀ)',
    stationSubtitle: 'Cung Thương Lầu Bậc Ngũ Âm • Bốn Dây Tơ Lòng',
    position: new THREE.Vector3(7.5, 0, 3.2),
    accentColor: 0xf472b6,
    loreGuideInstance: typeof window !== 'undefined' ? window.__loreGuide : null,
    audioDirectorInstance: typeof window !== 'undefined' ? window.__spatialAudio : null
  });
  interiorGroup.add(luteStation);

  // 2) Kim Thoa & Khăn Hồng - Bệ Hoa Sen & Hàng Rào Dây Nhung Chuẩn Bảo Tàng
  const hairpinGroup = new THREE.Group();
  hairpinGroup.position.y = 0.18;

  const silkScarf = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.32, 0.07, 48, 10),
    new THREE.MeshBasicMaterial({ color: 0xf472b6, fog: false })
  );
  const goldenHairpin = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.95, 10), goldMat);
  goldenHairpin.rotation.z = Math.PI / 3;
  hairpinGroup.add(silkScarf, goldenHairpin);

  const hairpinStation = createCuratedArtifactStation({
    artifactMesh: hairpinGroup,
    loreKey: 'truyenKieu_kimThoa',
    stationTitle: 'KIM THOA & KHĂN HỒNG',
    stationSubtitle: 'Vật Đính Ước Tiết Thanh Minh • Trao Kỷ Vật Ăn Thề',
    position: new THREE.Vector3(-7.5, 0, 3.2),
    accentColor: 0x38bdf8,
    loreGuideInstance: typeof window !== 'undefined' ? window.__loreGuide : null,
    audioDirectorInstance: typeof window !== 'undefined' ? window.__spatialAudio : null
  });
  interiorGroup.add(hairpinStation);

  // Đăng ký thẻ thơ tương tác & Âm thanh không gian 3D cho Đàn Hồ Cầm và Kim Thoa
  if (typeof window !== 'undefined') {
    window.__loreGuide?.registerArtifact(luteGroup, 'truyenKieu_hoCam');
    window.__spatialAudio?.attachPositionalSound('truyenKieu_hoCam', luteGroup, {
      fallbackTheme: 'truyenKieu',
      refDistance: 6,
      maxDistance: 35
    });
    window.__loreGuide?.registerArtifact(hairpinGroup, 'truyenKieu_kimThoa');
  }

  // 3) Bình Gốm Hoa Lam & Cổ Vật Thư Phòng (Lê - Nguyễn) - Nạp Mô Hình Poly Haven CC0
  const incensePed = createExhibitPedestal(-7.8, -2.8, 'CỔ VẬT GỐM HOA LAM & LƯ TRẦM', 'Bình Gốm Men Lam Triều Lê - Nguyễn • Thư Phòng Kim - Kiều', '#38bdf8', 0x38bdf8);
  const burnerMesh = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), goldMat);
  burnerMesh.position.set(0.42, 1.25, 0.15);
  const cupL = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.07, 0.18, 12), jadeBlueMat);
  cupL.position.set(-0.42, 1.20, 0.22);
  incensePed.add(burnerMesh, cupL);

  if (gltfLoader) {
    loadGlbCached(['/model/polyhaven/antique_ceramic_vase_01/antique_ceramic_vase_01_1k.gltf'], {
      maxTextureSize: 1024,
      disableMipmaps: true
    })
      .then((vaseModel) => {
        if (!vaseModel) return;
        vaseModel.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = false;
            child.receiveShadow = false;
            child.frustumCulled = true;
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((m) => {
              if (m && !m.transparent && !(m.alphaTest > 0)) {
                m.side = THREE.FrontSide;
              }
            });
          }
        });
        const box = new THREE.Box3().setFromObject(vaseModel);
        const size = new THREE.Vector3();
        box.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 0.88 / (maxDim || 1);
        vaseModel.scale.setScalar(scale);

        box.setFromObject(vaseModel);
        const center = new THREE.Vector3();
        box.getCenter(center);
        vaseModel.position.x = -center.x;
        vaseModel.position.z = -center.z;
        vaseModel.position.y = 1.08;
        incensePed.add(vaseModel);
      })
      .catch((err) => {
        console.warn('[POLYHAVEN] Dùng fallback cho Bình Gốm Men Lam:', err);
      });
  }

  // 4) Cây Đào Cổ Thụ Mùa Thanh Minh nở hoa hồng phấn
  const peachTreePed = createExhibitPedestal(7.8, -2.8, 'ĐÀO HOA THANH MINH', 'Trước Sau Nào Thấy Bóng Người • Hoa Đào Năm Ngoái', '#fb7185', 0xfb7185);
  const treeGroup = new THREE.Group();
  treeGroup.position.y = 1.15;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.18, 1.1, 10), ebonyWoodMat);
  trunk.position.y = 0.55;
  treeGroup.add(trunk);

  const blossomMat = new THREE.MeshBasicMaterial({ color: 0xf472b6, fog: false });
  for (let b = 0; b < 9; b++) {
    const ba = (b / 9) * Math.PI * 2;
    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(0.30, 1), blossomMat);
    crown.position.set(Math.cos(ba) * 0.38, 1.05 + (b % 3) * 0.16, Math.sin(ba) * 0.38);
    treeGroup.add(crown);
  }
  mergeGroupMeshesByMaterial(treeGroup);
  peachTreePed.add(treeGroup);

  // =========================================================================
  // PHẦN B: CÕI THƠ TRUYỆN KIỀU ĐA CHI TIẾT (Y = 420m) - ĐÊM TRĂNG GIANG NAM
  // =========================================================================
  const tkRealmGroup = new THREE.Group();
  tkRealmGroup.name = 'TruyenKieu_Poetry_Realm_Master';
  tkRealmGroup.position.copy(TK_REALM_ORIGIN);
  tkRealmGroup.visible = false;

  // Đưa thẳng tkRealmGroup vào Scene độc lập truyenKieuScene (Tách biệt 100% bảo tàng)
  if (_poeticScene) {
    _poeticScene.add(tkRealmGroup);
  } else if (typeof window !== 'undefined' && window.__truyenKieuScene) {
    window.__truyenKieuScene.add(tkRealmGroup);
  } else {
    root.add(tkRealmGroup);
  }

  // B1. HỆ THỐNG ÁNH SÁNG ĐA TẦNG CÕI THƠ (castShadow = false, 60+ FPS)
  const realmAmbient = new THREE.HemisphereLight(0xfce7f3, 0x1e0938, 1.85);
  tkRealmGroup.add(realmAmbient);

  const moonDirectLight = new THREE.DirectionalLight(0xfef08a, 1.75);
  moonDirectLight.position.set(0, 48, -60);
  moonDirectLight.target.position.set(0, 5, -20);
  tkRealmGroup.add(moonDirectLight, moonDirectLight.target);

  const kimSpecialPointLight = new THREE.PointLight(0x38bdf8, 2.6, 28, 1.3);
  kimSpecialPointLight.position.set(-8.8, 6.5, -1.5);
  kimSpecialPointLight.castShadow = false;
  tkRealmGroup.add(kimSpecialPointLight);

  const kieuSpecialPointLight = new THREE.PointLight(0xf472b6, 2.6, 28, 1.3);
  kieuSpecialPointLight.position.set(8.8, 6.5, -1.5);
  kieuSpecialPointLight.castShadow = false;
  tkRealmGroup.add(kieuSpecialPointLight);

  const pavilionWarmLight = new THREE.PointLight(0xfde047, 3.0, 35, 1.2);
  pavilionWarmLight.position.set(0, 10.0, -22.0);
  pavilionWarmLight.castShadow = false;
  tkRealmGroup.add(pavilionWarmLight);

  // B2. BẦU TRỜI ĐÊM NGÂN HÀ 250 NGÔI SAO & VẦNG TRĂNG THỀ KHỔNG LỒ (radius: 19.5m)
  const realmSkyTex = getCachedTex('tk_sky_dome_twilight_v8', 2048, 1024, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0.0, '#090314'); // Tím đêm huyền ảo đỉnh vòm
    g.addColorStop(0.42, '#20083b');
    g.addColorStop(0.75, '#43103c'); // Ráng hồng sông Tiền Đường
    g.addColorStop(0.92, '#22062d');
    g.addColorStop(1.0, '#0b0216');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // 250 Ngôi sao Ngân Hà lấp lánh chuyển sắc
    for (let s = 0; s < 250; s++) {
      const sx = (s * 137.5) % w;
      const sy = Math.pow((s % 100) / 100, 1.4) * (h * 0.75);
      const starRadius = 1.0 + (s % 4) * 0.7;
      const starColor = s % 3 === 0 ? '#fde047' : (s % 3 === 1 ? '#fbcfe8' : '#ffffff');
      ctx.fillStyle = starColor;
      ctx.beginPath();
      ctx.arc(sx, sy, starRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 1, 1, { canvasW: 1024, canvasH: 512 });

  const realmSkyDome = new THREE.Mesh(
    new THREE.SphereGeometry(260, 36, 28),
    new THREE.MeshBasicMaterial({ map: realmSkyTex, side: THREE.BackSide, depthWrite: false, fog: false })
  );
  realmSkyDome.position.set(0, 20, -35);
  tkRealmGroup.add(realmSkyDome);

  // Vầng Trăng Thề Khổng Lồ (radius: 19.5m) & Hào quang đa tầng
  const giantMoonGroup = new THREE.Group();
  giantMoonGroup.position.set(0, 36, -65);
  tkRealmGroup.add(giantMoonGroup);

  const giantMoon = new THREE.Mesh(
    new THREE.SphereGeometry(19.5, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xfef9c3, fog: false })
  );
  giantMoonGroup.add(giantMoon);

  const moonGlowTex = getCachedTex('tk_moon_glow_aura_v8', 256, 256, (ctx, w, h) => {
    const cx = w / 2, cy = h / 2;
    const g = ctx.createRadialGradient(cx, cy, 20, cx, cy, cx);
    g.addColorStop(0.0, 'rgba(254, 240, 138, 0.85)');
    g.addColorStop(0.40, 'rgba(244, 114, 182, 0.40)');
    g.addColorStop(0.75, 'rgba(56, 189, 248, 0.18)');
    g.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  const moonGlowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(85, 85),
    new THREE.MeshBasicMaterial({
      map: moonGlowTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false
    })
  );
  moonGlowPlane.position.z = 2.0;
  giantMoonGroup.add(moonGlowPlane);

  // B3. MẶT HỒ THU THỦY (240m x 240m) CÓ SÓNG NƯỚC ĐỘNG, 2 THUYỀN HOA & 36 ĐÈN HOA ĐĂNG
  const lakeSystem = new THREE.Group();
  lakeSystem.position.set(0, -1.6, 0);
  tkRealmGroup.add(lakeSystem);

  const lakeWaterTex = getCachedTex('tk_moonlit_river_v8', 512, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0.0, '#100726');
    g.addColorStop(0.45, '#220e42');
    g.addColorStop(0.75, '#3b155e');
    g.addColorStop(1.0, '#14082e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(254, 240, 138, 0.35)';
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 28; i++) {
      const y = (i * 19) % h;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 16) {
        const wy = y + Math.sin(x * 0.04 + i) * 4.5;
        if (x === 0) ctx.moveTo(x, wy);
        else ctx.lineTo(x, wy);
      }
      ctx.stroke();
    }
  }, 7, 7);

  const lakeGeo = new THREE.PlaneGeometry(240, 240, 32, 32);
  lakeGeo.rotateX(-Math.PI / 2);
  lakeGeo.computeBoundingBox();
  lakeGeo.computeBoundingSphere();
  const lakeWaveUniforms = { uTime: { value: 0 } };
  const lakeMat = new THREE.MeshBasicMaterial({
    map: lakeWaterTex,
    color: 0xf5d0fe,
    transparent: true,
    opacity: 0.92,
    side: THREE.FrontSide,
    fog: false
  });
  lakeMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = lakeWaveUniforms.uTime;
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      transformed.y += sin(transformed.x * 0.09 + uTime * 1.5) * 0.26 + cos(transformed.z * 0.08 - uTime * 1.3) * 0.22;`
    );
  };
  lakeMat.customProgramCacheKey = () => 'tk_lake_wave_v1';

  const lakeMesh = new THREE.Mesh(lakeGeo, lakeMat);
  lakeSystem.add(lakeMesh);

  // Dãy Núi Non Xa ("Vẻ non xa tấm trăng gần ở chung") bao quanh chân trời
  const distantMountains = new THREE.Group();
  tkRealmGroup.add(distantMountains);
  const mountainMatDark = new THREE.MeshLambertMaterial({ color: 0x190a2e, emissive: 0x0d041a });
  const mountainMatMid = new THREE.MeshLambertMaterial({ color: 0x2a1047, emissive: 0x150726 });

  const mountainSpecs = [
    { x: -68, z: -78, r: 28, h: 38, mat: mountainMatDark },
    { x: -38, z: -88, r: 32, h: 46, mat: mountainMatMid },
    { x: 38, z: -88, r: 32, h: 44, mat: mountainMatMid },
    { x: 68, z: -78, r: 28, h: 36, mat: mountainMatDark },
    { x: -85, z: -42, r: 24, h: 30, mat: mountainMatDark },
    { x: 85, z: -42, r: 24, h: 30, mat: mountainMatDark }
  ];
  mountainSpecs.forEach((m) => {
    const peak = new THREE.Mesh(new THREE.ConeGeometry(m.r, m.h, 12), m.mat);
    peak.position.set(m.x, m.h * 0.5 - 3.0, m.z);
    distantMountains.add(peak);
  });
  mergeGroupMeshesByMaterial(distantMountains);

  // 36 Đèn Hoa Đăng & Hoa Sen trôi lững lờ trên mặt nước (InstancedMesh: 2 Draw Calls thay vì 72)
  const floatingWaterLanterns = [];
  const padGeo = new THREE.CylinderGeometry(0.52, 0.52, 0.05, 10);
  const padMat = new THREE.MeshBasicMaterial({ color: 0x15803d, fog: false });
  const lotusFlameGeo = new THREE.OctahedronGeometry(0.24, 1);
  const wlFlameMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
  const instWlPads = new THREE.InstancedMesh(padGeo, padMat, 36);
  const instWlFlames = new THREE.InstancedMesh(lotusFlameGeo, wlFlameMat, 36);
  const _wlDummy = new THREE.Object3D();
  const wlGoldCol = new THREE.Color(0xfef08a);
  const wlPinkCol = new THREE.Color(0xf472b6);

  for (let i = 0; i < 36; i++) {
    const ang = (i / 36) * Math.PI * 2 + (i % 3) * 0.25;
    const dist = 16 + ((i * 9) % 38);
    const baseX = Math.cos(ang) * dist;
    const baseZ = Math.sin(ang) * dist - 14;

    _wlDummy.rotation.set(0, 0, 0);
    _wlDummy.scale.set(1, 1, 1);
    _wlDummy.position.set(baseX, 0.22, baseZ);
    _wlDummy.updateMatrix();
    instWlPads.setMatrixAt(i, _wlDummy.matrix);

    _wlDummy.position.set(baseX, 0.22 + 0.24, baseZ);
    _wlDummy.updateMatrix();
    instWlFlames.setMatrixAt(i, _wlDummy.matrix);
    instWlFlames.setColorAt(i, i % 2 === 0 ? wlGoldCol : wlPinkCol);

    floatingWaterLanterns.push({
      baseX,
      baseZ,
      phase: i * 0.65
    });
  }
  instWlPads.instanceMatrix.needsUpdate = true;
  instWlFlames.instanceMatrix.needsUpdate = true;
  if (instWlFlames.instanceColor) instWlFlames.instanceColor.needsUpdate = true;
  instWlPads.computeBoundingSphere();
  instWlFlames.computeBoundingSphere();
  lakeSystem.add(instWlPads, instWlFlames);

  // 2 Thuyền Hoa Giang Nam trôi nhẹ hai bên hồ
  const sampanLeft = createPoeticSampanBoat(goldMat);
  sampanLeft.position.set(-25, 0.15, -6);
  sampanLeft.rotation.y = 0.35;
  lakeSystem.add(sampanLeft);

  const sampanRight = createPoeticSampanBoat(goldMat);
  sampanRight.position.set(25, 0.15, -8);
  sampanRight.rotation.y = Math.PI - 0.35;
  lakeSystem.add(sampanRight);

  // B4. QUẦN THỂ ĐẢO TRUNG TÂM, LẦU NGƯNG BÍCH, CẦU THANH MINH & RỪNG ĐÀO - LIỄU
  const realmIslandGroup = new THREE.Group();
  realmIslandGroup.position.set(0, -1.5, -24.0);
  tkRealmGroup.add(realmIslandGroup);

  const islandGrassTex = getCachedTex('tk_island_spring_grass_v8', 512, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0.0, '#1d3b2a');
    g.addColorStop(0.55, '#2b1e3d');
    g.addColorStop(1.0, '#140c21');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(244, 114, 182, 0.38)';
    for (let i = 0; i < 110; i++) {
      ctx.beginPath();
      ctx.arc((i * 89) % w, (i * 53) % (h * 0.65), 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 3, 2);

  const islandMat = new THREE.MeshLambertMaterial({ map: islandGrassTex });

  // Đảo Trung Tâm (Đài Trăng Thề Kim - Kiều)
  const mainIsland = new THREE.Mesh(new THREE.CylinderGeometry(18.5, 23.0, 3.8, 28), islandMat);
  mainIsland.position.set(0, 1.9, 0);
  realmIslandGroup.add(mainIsland);

  const mainIslandGoldRim = new THREE.Mesh(
    new THREE.TorusGeometry(18.6, 0.14, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xfde047, fog: false })
  );
  mainIslandGoldRim.rotation.x = Math.PI / 2;
  mainIslandGoldRim.position.y = 3.82;
  realmIslandGroup.add(mainIslandGoldRim);

  // Đảo Thượng Uyển phía sau đặt Lầu Ngưng Bích 2 Tầng (Z = -22m)
  const pavilionIsland = new THREE.Mesh(new THREE.CylinderGeometry(13.0, 16.5, 5.2, 24), islandMat);
  pavilionIsland.position.set(0, 2.6, -22.0);
  realmIslandGroup.add(pavilionIsland);

  const pavilionLanternRefs = [];
  const ngungBichPavilion = createDetailedNgungBichPavilion(goldMat, pavilionLanternRefs);
  ngungBichPavilion.position.set(0, 5.2, -22.0);
  realmIslandGroup.add(ngungBichPavilion);

  // Cầu Gỗ Đỏ Thanh Minh 15 nhịp (createCrimsonArchBridge) nối Đài Quan Sát vào Đảo Trung Tâm
  const thanhMinhBridge = createCrimsonArchBridge(goldMat);
  thanhMinhBridge.position.set(0, 3.4, 24.5);
  realmIslandGroup.add(thanhMinhBridge);

  // 6 Cây Hoa Đào Cổ Thụ (3 sắc độ) & 4 Cây Liễu Rủ Bên Hồ (Merged theo vật liệu: 7 Draw Calls thay vì 144)
  const peachForestGroup = new THREE.Group();
  const peachCoords = [
    { pos: [-14.5, 3.7, 3.5], scale: 1.45 },
    { pos: [14.5, 3.7, 3.5], scale: 1.45 },
    { pos: [-16.0, 3.7, -8.5], scale: 1.30 },
    { pos: [16.0, 3.7, -8.5], scale: 1.30 },
    { pos: [-10.5, 5.1, -20.0], scale: 1.25 },
    { pos: [10.5, 5.1, -20.0], scale: 1.25 }
  ];
  peachCoords.forEach((pc) => {
    const pTree = createDetailedPeachTree(pc.scale);
    pTree.position.set(...pc.pos);
    peachForestGroup.add(pTree);
  });
  mergeGroupMeshesByMaterial(peachForestGroup);
  realmIslandGroup.add(peachForestGroup);

  const willowForestGroup = new THREE.Group();
  const willowCoords = [
    { pos: [-17.2, 3.6, 9.2], scale: 1.2 },
    { pos: [17.2, 3.6, 9.2], scale: 1.2 },
    { pos: [-12.5, 3.6, -14.0], scale: 1.1 },
    { pos: [12.5, 3.6, -14.0], scale: 1.1 }
  ];
  willowCoords.forEach((wc) => {
    const wTree = createWeepingWillowTree(wc.scale);
    wTree.position.set(...wc.pos);
    willowForestGroup.add(wTree);
  });
  mergeGroupMeshesByMaterial(willowForestGroup);
  realmIslandGroup.add(willowForestGroup);

  // B5. ĐÀI TRĂNG THỀ KIM TRỌNG & THÚY KIỀU (.GLB) TRONG CÕI THƠ (targetSpan: 16.5m)
  // Đài Kim Trọng (Bên Trái Đảo Trung Tâm)
  const kimStageGroup = new THREE.Group();
  kimStageGroup.position.set(-8.8, 3.8, -1.5);
  realmIslandGroup.add(kimStageGroup);

  const kimLotusStage = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 4.2, 0.7, 24), jadeBlueMat);
  kimLotusStage.position.y = 0.35;
  const kimStageRing = new THREE.Mesh(
    new THREE.TorusGeometry(3.8, 0.1, 10, 36),
    new THREE.MeshBasicMaterial({ color: 0x38bdf8, fog: false })
  );
  kimStageRing.rotation.x = Math.PI / 2;
  kimStageRing.position.y = 0.72;
  const kimAuraHalo = new THREE.Mesh(
    new THREE.TorusGeometry(4.5, 0.06, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xfde047, fog: false })
  );
  kimAuraHalo.position.set(0, 6.8, -1.2);
  kimStageGroup.add(kimLotusStage, kimStageRing, kimAuraHalo);

  const realmKimHolder = new THREE.Group();
  realmKimHolder.position.set(0, 0.72, 0);
  realmKimHolder.rotation.y = 0.28;
  kimStageGroup.add(realmKimHolder);

  // Đài Thúy Kiều (Bên Phải Đảo Trung Tâm)
  const kieuStageGroup = new THREE.Group();
  kieuStageGroup.position.set(8.8, 3.8, -1.5);
  realmIslandGroup.add(kieuStageGroup);

  const kieuLotusStage = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 4.2, 0.7, 24), royalVioletMat);
  kieuLotusStage.position.y = 0.35;
  const kieuStageRing = new THREE.Mesh(
    new THREE.TorusGeometry(3.8, 0.1, 10, 36),
    new THREE.MeshBasicMaterial({ color: 0xf472b6, fog: false })
  );
  kieuStageRing.rotation.x = Math.PI / 2;
  kieuStageRing.position.y = 0.72;
  const kieuAuraHalo = new THREE.Mesh(
    new THREE.TorusGeometry(4.5, 0.06, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xf472b6, fog: false })
  );
  kieuAuraHalo.position.set(0, 6.8, -1.2);
  kieuStageGroup.add(kieuLotusStage, kieuStageRing, kieuAuraHalo);

  const realmKieuHolder = new THREE.Group();
  realmKieuHolder.position.set(0, 0.72, 0);
  realmKieuHolder.rotation.y = -0.28;
  kieuStageGroup.add(realmKieuHolder);

  // Cầu Tơ Hồng & Sóng Nhạc Hồ Cầm Bay Giữa Kim Trọng và Thúy Kiều
  const fateBridgeArc = new THREE.Mesh(
    new THREE.TorusGeometry(8.8, 0.07, 10, 32, Math.PI),
    new THREE.MeshBasicMaterial({ color: 0xf43f5e, fog: false })
  );
  fateBridgeArc.position.set(0, 4.8, -1.5);
  realmIslandGroup.add(fateBridgeArc);

  const soundwaveRings = [];
  for (let sr = 0; sr < 5; sr++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.4 + sr * 0.75, 0.035, 8, 32),
      new THREE.MeshBasicMaterial({
        color: sr % 2 === 0 ? 0xfde047 : 0xf472b6,
        transparent: true,
        opacity: 0.7,
        fog: false
      })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(8.8, 5.5, -1.5);
    realmIslandGroup.add(ring);
    soundwaveRings.push({ mesh: ring, phase: sr * 1.25 });
  }

  // NẠP 2 FILE .GLB CHÍNH (fitAxis: 'y') CHO CẢ PHÒNG BẢO TÀNG (3.4m) VÀ CÕI THƠ (16.5m)
  loadGlbWithFallback(
    gltfLoader,
    [kimGlbUrl, '/model/kimtrongthuykieu.glb', '/models/kimtrongthuykieu.glb'],
    (rawScene) => {
      const kimRoomModel = prepareUnlitVividGlbModel(rawScene.clone(true), {
        targetSpan: 3.4,
        fitAxis: 'y'
      });
      kimRoomHolder.add(kimRoomModel);

      // Cập nhật ma trận thế giới & Bọc Tight Click Hitbox (Skill: hitbox-collision-architect)
      kimRoomModel.updateMatrixWorld(true);
      if (typeof window !== 'undefined' && window.__museumHitboxManager) {
        window.__museumHitboxManager.createTightClickHitbox(kimRoomModel, {
          loreKey: 'truyenKieu_kimTrong',
          isBookPortal: false,
          padding: 0.12
        });
      }

      const kimRealmModel = prepareUnlitVividGlbModel(rawScene.clone(true), {
        targetSpan: 16.5,
        fitAxis: 'y'
      });
      realmKimHolder.add(kimRealmModel);
    }
  );

  loadGlbWithFallback(
    gltfLoader,
    [kieuGlbUrl, '/model/thuykieu.glb', '/models/thuykieu.glb'],
    (rawScene) => {
      const kieuRoomModel = prepareUnlitVividGlbModel(rawScene.clone(true), {
        targetSpan: 3.4,
        fitAxis: 'y'
      });
      kieuRoomHolder.add(kieuRoomModel);

      // Cập nhật ma trận thế giới & Bọc Tight Click Hitbox (Skill: hitbox-collision-architect)
      kieuRoomModel.updateMatrixWorld(true);
      if (typeof window !== 'undefined' && window.__museumHitboxManager) {
        window.__museumHitboxManager.createTightClickHitbox(kieuRoomModel, {
          loreKey: 'truyenKieu_thuyKieu',
          isBookPortal: false,
          padding: 0.12
        });
      }

      const kieuRealmModel = prepareUnlitVividGlbModel(rawScene.clone(true), {
        targetSpan: 16.5,
        fitAxis: 'y'
      });
      realmKieuHolder.add(kieuRealmModel);
    }
  );

  // B6. 180 CÁNH HOA ĐÀO RƠI INSTANCED MESH (fps-optimizer & museumMasterBeautifier: 1 Draw Call)
  const tkPetalParticles = createDetailedInstancedParticles('truyenKieu', 180, 26, 22);
  tkPetalParticles.mesh.name = 'Optimized_180_Falling_Petals';
  tkPetalParticles.mesh.position.set(0, 0, -28.0);
  tkRealmGroup.add(tkPetalParticles.mesh);

  // Thảm Mandala Cung Đình dưới đài Thề Nguyện cõi thơ
  const realmOathMandala = createDetailedMandalaFloorDecal('truyenKieu', 6.5);
  realmOathMandala.position.set(0, 0.02, -28.0);
  tkRealmGroup.add(realmOathMandala);

  // Luồng sáng Trăng Thề thần thánh tỏa xuống đảo hoa Kiều (environment-lighting-artist)
  const celestialMoonRay = createOptimizedGodRays('#fef08a', 36, 1.2, 14);
  celestialMoonRay.position.set(0, 36.0, -28.0);
  tkRealmGroup.add(celestialMoonRay);

  // 30 Đèn trời Khổng Minh bay lên bầu trời đêm (InstancedMesh: 1 Draw Call thay vì 30)
  const risingSkyLanterns = [];
  const skyLanternGeo = new THREE.CylinderGeometry(0.28, 0.20, 0.65, 8);
  const skyLanternMat = new THREE.MeshBasicMaterial({ color: 0xfef08a, fog: false });
  const instSkyLanterns = new THREE.InstancedMesh(skyLanternGeo, skyLanternMat, 30);
  const _skyDummy = new THREE.Object3D();

  for (let i = 0; i < 30; i++) {
    const x = (Math.random() - 0.5) * 85;
    const y = 4 + Math.random() * 45;
    const z = -45 + (Math.random() - 0.5) * 50;
    const rotY = Math.random() * Math.PI * 2;
    _skyDummy.position.set(x, y, z);
    _skyDummy.rotation.set(0, rotY, 0);
    _skyDummy.scale.set(1, 1, 1);
    _skyDummy.updateMatrix();
    instSkyLanterns.setMatrixAt(i, _skyDummy.matrix);
    risingSkyLanterns.push({
      x,
      y,
      z,
      rotY,
      speedY: 0.55 + Math.random() * 0.45,
      phase: Math.random() * Math.PI * 2
    });
  }
  instSkyLanterns.instanceMatrix.needsUpdate = true;
  instSkyLanterns.computeBoundingSphere();
  tkRealmGroup.add(instSkyLanterns);

  // B7. ĐÀI QUAN SÁT & 4 BẢNG ĐIỆN TỬ HOLOGRAM PHÓNG ĐẠI (PlaneGeometry 11.2m x 6.5m)
  const obsPlatformGroup = new THREE.Group();
  obsPlatformGroup.position.copy(TK_OBS_PLATFORM_OFFSET);
  tkRealmGroup.add(obsPlatformGroup);

  const platDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(8.5, 9.8, 1.2, 24),
    new THREE.MeshBasicMaterial({ color: 0x240a3d, fog: false })
  );
  platDisc.position.y = -0.6;
  obsPlatformGroup.add(platDisc);

  const platGoldRing = new THREE.Mesh(
    new THREE.TorusGeometry(8.55, 0.1, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xfde047, fog: false })
  );
  platGoldRing.rotation.x = Math.PI / 2;
  platGoldRing.position.y = 0.02;
  obsPlatformGroup.add(platGoldRing);

  const returnPortalGroup = new THREE.Group();
  returnPortalGroup.position.set(0, 0.2, 5.4);
  obsPlatformGroup.add(returnPortalGroup);

  const crystalMesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.6, 0),
    new THREE.MeshBasicMaterial({ color: 0xf472b6, fog: false })
  );
  crystalMesh.position.y = 1.3;
  crystalMesh.userData = { isReturnPortal: true, action: 'RETURN_TO_MUSEUM' };
  returnPortalGroup.add(crystalMesh);

  const returnLabel = createPortalBanner({
    headerTag: 'CỔNG TRỞ VỀ BẢO TÀNG',
    title: '↩ QUAY VỀ PHÒNG TRUYỆN KIỀU',
    subtitle: 'Click vào tinh thể hồng hoặc nhấn phím ESC',
    accentColor: '#fde047',
    width: 4.0,
    height: 1.45
  });
  returnLabel.position.set(0, 2.5, 0);
  returnPortalGroup.add(returnLabel);

  const screenAngles = [-1.18, -0.52, 0.52, 1.18];
  const screenRadius = 22.5;
  for (let sIdx = 0; sIdx < 4; sIdx++) {
    const angle = screenAngles[sIdx];
    const screen = createGiantHologramScreen(sIdx);
    screen.position.set(Math.sin(angle) * screenRadius, 4.3, -Math.cos(angle) * screenRadius);
    screen.lookAt(0, 4.0, 0);
    obsPlatformGroup.add(screen);
  }

  // =========================================================================
  // PHẦN C: CUTSCENE HÚT XOÁY VÀO SÁCH & CHUYỂN ĐỔI BẦU KHÔNG KHÍ ĐÊM TRĂNG
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
  const _addedRealmLights = [];

  const localReturnOffset = new THREE.Vector3(0, 1.7, 6.0).applyAxisAngle(
    new THREE.Vector3(0, 1, 0),
    interiorGroup.rotation.y
  );
  const museumReturnCamPos = roomCenter.clone().add(localReturnOffset);
  const museumBookTarget = new THREE.Vector3(roomCenter.x, roomCenter.y + 1.5, roomCenter.z);

  const realmObservationCamPos = TK_REALM_ORIGIN.clone().add(TK_OBS_PLATFORM_OFFSET);
  const realmObservationLookAt = TK_REALM_ORIGIN.clone().add(TK_OBS_LOOK_TARGET_OFFSET);

  function createOrGetRealmTopHUD() {
    if (typeof document === 'undefined') return null;
    let hud = document.getElementById('tk-realm-top-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'tk-realm-top-hud';
      hud.style.cssText = `
        position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
        display: none; align-items: center; gap: 18px;
        background: rgba(28, 8, 42, 0.92); border: 2px solid #f472b6;
        padding: 10px 24px; border-radius: 30px; z-index: 99999;
        box-shadow: 0 0 24px rgba(244, 114, 182, 0.45); backdrop-filter: blur(8px);
        font-family: 'Segoe UI', sans-serif;
      `;
      hud.innerHTML = `
        <span style="color: #fde047; font-weight: bold; font-size: 15px; letter-spacing: 1px;">🌸 CÕI THƠ: ĐOẠN TRƯỜNG TÂN THANH • LẦU NGƯNG BÍCH & ĐÊM TRĂNG THỀ 🌕</span>
        <button id="tk-btn-exit-realm" style="
          background: linear-gradient(135deg, #db2777, #831843);
          color: #ffffff; border: 1px solid #f9a8d4; padding: 6px 16px;
          border-radius: 20px; font-weight: bold; font-size: 13px; cursor: pointer;
        ">↩ QUAY VỀ BẢO TÀNG (ESC)</button>
      `;
      document.body.appendChild(hud);
      document.getElementById('tk-btn-exit-realm')?.addEventListener('click', (e) => {
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

    if (ctrl) ctrl.enabled = false;
    if (camCtrl) camCtrl.isEnabled = false;

    playBookSuckInCutscene({
      camera: cam,
      cameraController: camCtrl,
      controls: ctrl,
      bookMesh: bookAltar,
      themeColor: 0xf472b6,
      onTransition: () => {
        _isInsideRealm = true;
        if (typeof window !== 'undefined') window.__tkRealmActive = true;

        // CHUYỂN HOÁN SCENE: Đưa Scene Cõi Thơ Truyện Kiều lên Active Scene (tách biệt 100% bảo tàng)
        const targetScene = _poeticScene || window.__truyenKieuScene;
        if (window.__app?.setActiveScene && targetScene) {
          window.__app.setActiveScene(targetScene);
        }

        if (targetScene) {
          const beforeCount = targetScene.children.length;
          setupRealmAtmosphere(targetScene, 0x160729, 0.0035);
          for (let i = beforeCount; i < targetScene.children.length; i++) {
            const added = targetScene.children[i];
            if (added?.isLight) {
              _addedRealmLights.push(added);
            }
          }
        }

        roomGroup.visible = false;
        tkRealmGroup.visible = true;

        if (typeof window !== 'undefined') {
          window.__spatialAudio?.playRealmSoundscape('truyenKieu_hoCam');
        }

        if (_renderer) {
          _savedExposure = _renderer.toneMappingExposure ?? 1.0;
          _renderer.toneMappingExposure = 1.18;
        }

        if (camCtrl) {
          camCtrl.setFloorHeightProvider?.(() => 420.0 + 4.2 - 1.7);
          camCtrl.floorHeightProvider = () => 420.0 + 4.2 - 1.7;
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
      themeColorHex: '#f472b6',
      onSwapScene: () => {
        _isInsideRealm = false;
        if (typeof window !== 'undefined') window.__tkRealmActive = false;

        // CHUYỂN HOÁN SCENE: Đưa Sảnh Bảo Tàng (mainScene) về Active Scene
        if (typeof window !== 'undefined' && window.__app?.setActiveScene && window.__app.mainScene) {
          window.__app.setActiveScene(window.__app.mainScene);
        }

        // Ẩn thế giới tác phẩm & Hiện lại phòng bảo tàng
        tkRealmGroup.visible = false;
        roomGroup.visible = true;
        roomGroup.updateMatrixWorld(true);

        if (_addedRealmLights.length > 0) {
          _addedRealmLights.forEach((light) => {
            light.parent?.remove?.(light);
            light.dispose?.();
          });
          _addedRealmLights.length = 0;
        }

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
        if (_cameraManager?.controls) {
          _cameraManager.controls.target.copy(museumBookTarget);
          _cameraManager.controls.update();
          _cameraManager.controls.enabled = true;
        }
        if (_cameraManager?.cameraController) {
          _cameraManager.cameraController.isEnabled = true;
        }
        _isTransitioning = false;
      }
    });
  }

  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const ROOM_PROXIMITY_SQ = 42 * 42;

  function onPointerClick(e) {
    if (_isTransitioning) return;
    if (e.target.closest('#tk-realm-top-hud') || e.target.closest('#director-hud')) return;

    if (_isInsideRealm) {
      if (!tkRealmGroup.visible) return;
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

    if (!roomGroup.visible) return;
    const activeScene = typeof window !== 'undefined' ? window.__app?.activeScene : null;
    if (_scene && activeScene && activeScene !== _scene) return;

    const cam = _camera || window.__camera;
    if (!cam) return;
    if (cam.position?.distanceToSquared?.(roomGroup.position) > ROOM_PROXIMITY_SQ) return;

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
    if ((e.code === 'Escape' || e.key === 'Escape') && _isInsideRealm && !_isTransitioning) {
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
    id: 'truyen_kieu',
    title: 'ĐOẠN TRƯỜNG TÂN THANH • TRUYỆN KIỀU',
    author: 'Đại thi hào Nguyễn Du (1765 – 1820)',
    genre: 'Kiệt tác Truyện thơ Nôm Lục bát (3.254 câu)',
    quote: '"Trăm năm trong cõi người ta, chữ tài chữ mệnh khéo là ghét nhau..."',
    themeColor: 0xf472b6,
    targetRealm: 'TRUYEN_KIEU_REALM',
    portalReady: true,
    onActivate: () => enterRealm()
  };

  registerInteractiveBook(bookAltar, realmObservationCamPos, portalBookMeta);

  // =========================================================================
  // PHẦN D: VÒNG LẶP ANIMATION (60 FPS) • CHUYỂN ĐỘNG SỐNG ĐỘNG CỦA CẢNH VẬT & NHÂN VẬT
  // =========================================================================
  let clockTime = 0;
  const _pavAnimDummy = new THREE.Object3D();

  function updateRealmAnimation(delta, elapsedTime) {
    crystalMesh.rotation.y += delta * 1.2;
    returnLabel.position.y = 2.5 + Math.sin(clockTime * 2.5) * 0.05;

    // PROCEDURAL IDLE ANIMATION CHO KIM TRỌNG & THÚY KIỀU (.GLB):
    // 1) Nhịp thở nhẹ nhàng: co giãn scale.y + nâng hạ lồng ngực position.y
    // 2) Nghiêng mình theo tiếng đàn & trao ánh nhìn dưới trăng: dao động rotation.y, rotation.z
    realmKimHolder.position.y = 0.72 + Math.sin(clockTime * 1.6) * 0.14;
    realmKimHolder.rotation.y = 0.28 + Math.sin(clockTime * 0.75) * 0.085;
    realmKimHolder.rotation.z = Math.sin(clockTime * 1.1) * 0.022;
    realmKimHolder.scale.set(
      1.0 + Math.sin(clockTime * 2.0) * 0.012,
      1.0 + Math.sin(clockTime * 2.0) * 0.018,
      1.0 + Math.sin(clockTime * 2.0) * 0.012
    );

    realmKieuHolder.position.y = 0.72 + Math.sin(clockTime * 1.6 + 1.4) * 0.14;
    realmKieuHolder.rotation.y = -0.28 + Math.cos(clockTime * 0.75) * 0.085;
    realmKieuHolder.rotation.z = Math.sin(clockTime * 1.35 + 0.6) * 0.028;
    realmKieuHolder.scale.set(
      1.0 + Math.sin(clockTime * 2.0 + 1.4) * 0.012,
      1.0 + Math.sin(clockTime * 2.0 + 1.4) * 0.018,
      1.0 + Math.sin(clockTime * 2.0 + 1.4) * 0.012
    );

    // Vòng hào quang & Sóng nhạc Hồ Cầm lan tỏa từ đài Thúy Kiều
    kimAuraHalo.rotation.z += delta * 0.35;
    kieuAuraHalo.rotation.z -= delta * 0.35;

    soundwaveRings.forEach((sw) => {
      const progress = ((clockTime * 0.65 + sw.phase) % 3.5) / 3.5;
      const s = 0.6 + progress * 2.4;
      sw.mesh.scale.set(s, s, 1);
      sw.mesh.position.y = 2.0 + progress * 8.5;
      sw.mesh.material.opacity = (1.0 - progress) * 0.55;
    });

    // Mặt Hồ Thu Thủy gợn sóng lăn tăn thời gian thực (GPU vertex shader)
    lakeWaterTex.offset.x = clockTime * 0.016;
    lakeWaterTex.offset.y = -clockTime * 0.022;
    lakeWaveUniforms.uTime.value = clockTime;

    // Thuyền Hoa Giang Nam trôi bồng bềnh hai bên hồ
    sampanLeft.position.y = 0.15 + Math.sin(clockTime * 1.4) * 0.15;
    sampanLeft.rotation.z = Math.sin(clockTime * 1.1) * 0.04;
    sampanLeft.position.x = -25 + Math.sin(clockTime * 0.35) * 2.8;

    sampanRight.position.y = 0.15 + Math.sin(clockTime * 1.4 + 1.5) * 0.15;
    sampanRight.rotation.z = Math.sin(clockTime * 1.1 + 1.5) * 0.04;
    sampanRight.position.x = 25 - Math.sin(clockTime * 0.35) * 2.8;

    // 36 Đèn Hoa Đăng & Hoa Sen nổi dập dềnh trên mặt nước (InstancedMesh)
    _wlDummy.rotation.set(0, 0, 0);
    _wlDummy.scale.set(1, 1, 1);
    for (let i = 0; i < floatingWaterLanterns.length; i++) {
      const wl = floatingWaterLanterns[i];
      const ly = 0.22 + Math.sin(clockTime * 1.8 + wl.phase) * 0.12;
      const lx = wl.baseX + Math.sin(clockTime * 0.45 + wl.phase) * 0.55;
      _wlDummy.position.set(lx, ly, wl.baseZ);
      _wlDummy.updateMatrix();
      instWlPads.setMatrixAt(i, _wlDummy.matrix);
      _wlDummy.position.set(lx, ly + 0.24, wl.baseZ);
      _wlDummy.updateMatrix();
      instWlFlames.setMatrixAt(i, _wlDummy.matrix);
    }
    instWlPads.instanceMatrix.needsUpdate = true;
    instWlFlames.instanceMatrix.needsUpdate = true;

    // 8 Đèn lồng treo mái Lầu Ngưng Bích đung đưa trong gió (InstancedMesh)
    if (pavilionLanternRefs.length > 0) {
      const instCords = pavilionLanternRefs[0].instCords;
      const instBulbs = pavilionLanternRefs[0].instBulbs;
      for (let i = 0; i < pavilionLanternRefs.length; i++) {
        const pl = pavilionLanternRefs[i];
        const rz = Math.sin(clockTime * 1.7 + pl.phase) * 0.09;
        _pavAnimDummy.rotation.set(0, 0, rz);
        _pavAnimDummy.scale.set(1, 1.25, 1);
        _pavAnimDummy.position.set(pl.lx, pl.baseY, pl.lz);
        _pavAnimDummy.updateMatrix();
        instBulbs.setMatrixAt(pl.index, _pavAnimDummy.matrix);

        _pavAnimDummy.scale.set(1, 1, 1);
        _pavAnimDummy.position.set(pl.lx - 0.45 * Math.sin(rz), pl.baseY + 0.45 * Math.cos(rz), pl.lz);
        _pavAnimDummy.updateMatrix();
        instCords.setMatrixAt(pl.index, _pavAnimDummy.matrix);
      }
      instCords.instanceMatrix.needsUpdate = true;
      instBulbs.instanceMatrix.needsUpdate = true;
    }

    // 180 Cánh hoa đào rơi lả tả (1 Draw Call InstancedMesh qua museumMasterBeautifier)
    if (tkPetalParticles && tkPetalParticles.update) {
      tkPetalParticles.update(delta, clockTime);
    }

    // 30 Đèn trời Khổng Minh bay từ mặt hồ lên bầu trời đêm (InstancedMesh)
    _skyDummy.scale.set(1, 1, 1);
    for (let i = 0; i < risingSkyLanterns.length; i++) {
      const sl = risingSkyLanterns[i];
      sl.y += sl.speedY * delta * 1.8;
      sl.x += Math.sin(clockTime * 0.8 + sl.phase) * 0.015;
      sl.rotY += delta * 0.5;
      if (sl.y > 52.0) {
        sl.y = 2.0;
      }
      _skyDummy.position.set(sl.x, sl.y, sl.z);
      _skyDummy.rotation.set(0, sl.rotY, 0);
      _skyDummy.updateMatrix();
      instSkyLanterns.setMatrixAt(i, _skyDummy.matrix);
    }
    instSkyLanterns.instanceMatrix.needsUpdate = true;
  }

  function updateMuseumRoomAnimation(delta, elapsedTime) {
    promptBanner.position.y = 3.1 + Math.sin(clockTime * 2.5) * 0.05;
    bookMeshGroup.position.y = 1.74 + Math.sin(clockTime * 2.2) * 0.05;
    luteGroup.rotation.y = Math.sin(clockTime * 1.1) * 0.22;
    hairpinGroup.rotation.y += delta * 0.65;
    moonSphere.rotation.y += delta * 0.2;

    kimRoomHolder.position.y = 0.78 + Math.sin(clockTime * 1.8) * 0.035;
    kimRoomHolder.rotation.y = 0.25 + Math.sin(clockTime * 0.9) * 0.06;
    kimRoomHolder.scale.y = 1.0 + Math.sin(clockTime * 2.2) * 0.012;

    kieuRoomHolder.position.y = 0.78 + Math.sin(clockTime * 1.8 + 1.2) * 0.035;
    kieuRoomHolder.rotation.y = -0.25 + Math.cos(clockTime * 0.9) * 0.06;
    kieuRoomHolder.rotation.z = Math.sin(clockTime * 1.5) * 0.018;
    kieuRoomHolder.scale.y = 1.0 + Math.sin(clockTime * 2.2 + 1.2) * 0.012;

    _lanternDummy.rotation.set(0, 0, 0);
    for (let idx = 0; idx < silkLanterns.length; idx++) {
      const l = silkLanterns[idx];
      const ly = 7.2 + Math.sin(clockTime * 2.0 + idx) * 0.08;
      l.group.position.y = ly;

      _lanternDummy.position.set(l.x, ly + cordLength * 0.5, l.z);
      _lanternDummy.scale.set(1, 1, 1);
      _lanternDummy.updateMatrix();
      instLanternCords.setMatrixAt(idx, _lanternDummy.matrix);

      _lanternDummy.position.set(l.x, ly, l.z);
      _lanternDummy.scale.set(1.0, 1.35, 1.0);
      _lanternDummy.updateMatrix();
      instLanternBodies.setMatrixAt(idx, _lanternDummy.matrix);

      _lanternDummy.scale.set(1, 1, 1);
      _lanternDummy.position.set(l.x, ly + 0.68, l.z);
      _lanternDummy.updateMatrix();
      instLanternCaps.setMatrixAt(idx * 2, _lanternDummy.matrix);
      _lanternDummy.position.set(l.x, ly - 0.68, l.z);
      _lanternDummy.updateMatrix();
      instLanternCaps.setMatrixAt(idx * 2 + 1, _lanternDummy.matrix);

      _lanternDummy.position.set(l.x, ly - 1.05, l.z);
      _lanternDummy.updateMatrix();
      instLanternTassels.setMatrixAt(idx, _lanternDummy.matrix);
    }
    instLanternCords.instanceMatrix.needsUpdate = true;
    instLanternBodies.instanceMatrix.needsUpdate = true;
    instLanternCaps.instanceMatrix.needsUpdate = true;
    instLanternTassels.instanceMatrix.needsUpdate = true;
  }

  root.update = function(delta = 0.016, elapsedTime = 0, camera = null) {
    if (camera) _camera = camera;

    if (_isInsideRealm) {
      if (!tkRealmGroup.visible) return;
      clockTime += delta;
      updateRealmAnimation(delta, elapsedTime);
      return;
    }

    if (!roomGroup.visible) return;
    const activeCam = camera || _camera;
    if (activeCam?.position && activeCam.position.distanceToSquared(roomGroup.position) > ROOM_PROXIMITY_SQ) {
      return;
    }

    clockTime += delta;
    updateMuseumRoomAnimation(delta, elapsedTime);
  };

  root.updateRealm = function(delta = 0.016, elapsedTime = 0, camera = null) {
    if (camera) _camera = camera;
    if (!_isInsideRealm || !tkRealmGroup.visible) return;
    clockTime += delta;
    updateRealmAnimation(delta, elapsedTime);
  };

  root.setLightsActive = (active) => {
    const v = Boolean(active);
    moonCenterLight.visible = v;
    kimJadeBlueLight.visible = v;
    kieuPeachPinkLight.visible = v;
  };

  root.enterRealm = enterRealm;
  root.exitRealm = exitRealm;
  root.teleportBook = bookAltar;
  root.isInsideRealm = () => _isInsideRealm;
  root.getCollisionObjects = () => enclosure.collisionSolids;

  root.setupContext = function({
    scene = null,
    poeticScene = null,
    camera = null,
    renderer = null,
    cameraManager = null,
    portalInteraction = null
  } = {}) {
    if (scene) _scene = scene;
    if (camera) _camera = camera;
    if (renderer) _renderer = renderer;
    if (cameraManager) _cameraManager = cameraManager;
    if (poeticScene) {
      _poeticScene = poeticScene;
      if (tkRealmGroup.parent !== _poeticScene) {
        tkRealmGroup.parent?.remove?.(tkRealmGroup);
        _poeticScene.add(tkRealmGroup);
      }
    }
    if (portalInteraction) {
      portalInteraction.registerInteractiveBook(bookAltar, realmObservationCamPos, portalBookMeta);
    }
    if (typeof window !== 'undefined') {
      window.__loreGuide?.registerArtifact(luteGroup, 'truyenKieu_hoCam');
      window.__spatialAudio?.attachPositionalSound('truyenKieu_hoCam', luteGroup, {
        fallbackTheme: 'truyenKieu',
        refDistance: 6,
        maxDistance: 35
      });
      window.__loreGuide?.registerArtifact(hairpinGroup, 'truyenKieu_kimThoa');
    }
  };

  // Dọn dẹp tài nguyên GPU triệt để khi hủy phòng (fps-optimizer & museumMasterBeautifier)
  root.dispose = function() {
    if (_addedRealmLights.length > 0) {
      _addedRealmLights.forEach((light) => {
        light.parent?.remove?.(light);
        light.dispose?.();
      });
      _addedRealmLights.length = 0;
    }
    disposeSceneBranch(roomGroup);
    disposeSceneBranch(tkRealmGroup);
  };

  // ĐẶT root.getGroup = () => roomGroup; Ở CẤP NGOÀI CÙNG TRƯỚC return root;
  root.getGroup = () => roomGroup;

  return root;
}
