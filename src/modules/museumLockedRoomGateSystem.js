import * as THREE from 'three';
import {
  LITERATURE_REGISTRY,
  ALCOVE_CENTERS,
  CUSTOM_ROOM_IDS,
  getRoomWorldPose,
  getRoomCode,
  isRoomLocked
} from '../config/literatureRegistry.js';

/**
 * ============================================================================
 * MUSEUM LOCKED ROOM GATE SYSTEM - HỆ THỐNG CỔNG KHÓA PHONG ẤN DI SẢN CUNG ĐÌNH
 * 
 * Áp dụng cho các phòng trưng bày chưa hoàn thiện trong Bảo Tàng:
 * 1. Thanh Chắn Gỗ Lim & Cửa Gỗ Mun Khép Chặt (Monumental Closed Lacquer Door & Lim Barricade):
 *    - Khung cột gỗ lim mun và xà ngang chạm khắc hoa văn mây cuộn Đại Việt.
 *    - Dầm chắn ngang bằng gỗ lim dày dặn bắc ngang qua cửa với ngàm đồng Đông Sơn hai đầu.
 * 2. Dải Lụa Vàng Phong Ấn (Imperial Golden Silk Seal Ribbon):
 *    - Dải lụa vàng hoàng kim uốn lượn mềm mại vắt ngang qua thanh chắn gỗ lim.
 *    - Nút thắt hoa lụa vàng và đĩa niêm phong son đỏ triều đình ở chính giữa dầm.
 * 3. Biển Đồng Trang Nhã Khắc Chữ "Không Gian Đang Phục Dựng – Sắp Ra Mắt":
 *    - Vẽ bằng CanvasTexture độ phân giải cao (1024x680) phong cách Antique Bronze Patina.
 *    - Khắc tiêu đề: "KHÔNG GIAN ĐANG PHỤC DỰNG – SẮP RA MẮT" mạ vàng kim Đông Sơn.
 *    - Tên tác phẩm, tác giả, thời kỳ và kính báo hoàn thiện nghệ thuật.
 *    - Đèn SpotLight ấm (#ffdf73) rọi sáng mặt biển đồng.
 * 4. Hitbox Va Chạm Tuyệt Đối (Solid Box3 Collider):
 *    - Chặn kín 100% cửa, ngăn người chơi / camera đi xuyên vào không gian chưa hoàn thiện.
 * 5. Tắt Toàn Bộ Hiệu Ứng Vòng Xoáy Portal (Portal Deactivation):
 *    - Triệt tiêu hoàn toàn vortex shader, portal glow, book portal trong alcove của phòng khóa.
 * 6. Tương Tác Raycaster & Toast Notification:
 *    - Click vào cửa hoặc biển kích hoạt âm thanh then cài và hiển thị Toast trang nhã.
 * ============================================================================
 */

const SHARED_SEAL_TEXTURES = new Map();

/**
 * Phát âm thanh then cài gỗ lim kết hợp chuông đồng cổ (Procedural Web Audio API)
 */
function playLockedDoorSound() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!window.__lockedGateAudioCtx) {
      window.__lockedGateAudioCtx = new AudioCtx();
    }
    const ctx = window.__lockedGateAudioCtx;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // 1. Âm then cài gỗ nặng (Thud)
    const oscWood = ctx.createOscillator();
    const gainWood = ctx.createGain();
    oscWood.type = 'triangle';
    oscWood.frequency.setValueAtTime(110, now);
    oscWood.frequency.exponentialRampToValueAtTime(38, now + 0.35);

    gainWood.gain.setValueAtTime(0.45, now);
    gainWood.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    oscWood.connect(gainWood);
    gainWood.connect(ctx.destination);
    oscWood.start(now);
    oscWood.stop(now + 0.40);

    // 2. Tiếng chuông đồng ngân vang (Bronze bell harmonic)
    const oscBell = ctx.createOscillator();
    const gainBell = ctx.createGain();
    oscBell.type = 'sine';
    oscBell.frequency.setValueAtTime(659.25, now + 0.05); // E5
    oscBell.frequency.exponentialRampToValueAtTime(329.63, now + 1.2); // E4

    gainBell.gain.setValueAtTime(0.28, now + 0.05);
    gainBell.gain.exponentialRampToValueAtTime(0.001, now + 1.25);

    oscBell.connect(gainBell);
    gainBell.connect(ctx.destination);
    oscBell.start(now + 0.05);
    oscBell.stop(now + 1.25);
  } catch (_) {}
}

/**
 * Hiển thị thông báo Toast trang nhã khi người chơi tương tác với phòng khóa
 */
function showLockedRoomNoticeToast(item, roomCode) {
  const msg = `🔒 Không gian nghệ thuật này đang được hoàn thiện và sẽ sớm ra mắt! (Phòng ${roomCode}: ${item?.name || ''})`;
  if (typeof window === 'undefined') return;

  if (typeof window.__showMuseumToast === 'function') {
    window.__showMuseumToast(msg);
    return;
  }

  try {
    const existing = document.getElementById('museum-locked-gate-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'museum-locked-gate-toast';
    toast.style.cssText = [
      'position:fixed', 'top:88px', 'left:50%', 'transform:translateX(-50%)',
      'background:rgba(28,25,23,0.94)', 'color:#fde68a',
      'border:2px solid #d4af37', 'border-radius:8px',
      'padding:14px 28px', 'font-size:16px', 'font-family:"Times New Roman", serif',
      'z-index:99999', 'box-shadow:0 4px 24px rgba(0,0,0,0.7)',
      'text-align:center', 'max-width:620px', 'pointer-events:none',
      'line-height:1.5', 'letter-spacing:0.5px'
    ].join(';');
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
      try { toast.remove(); } catch (_) {}
    }, 3800);
  } catch (_) {}
}

/**
 * Tạo Canvas Texture Biển Đồng Trang Nhã Khắc Chữ "Không Gian Đang Phục Dựng – Sắp Ra Mắt"
 */
export function createAntiqueBronzePlaqueTexture(roomCode, item) {
  const cacheKey = `bronze_plaque_${item.id}_${roomCode}`;
  if (SHARED_SEAL_TEXTURES.has(cacheKey)) {
    return SHARED_SEAL_TEXTURES.get(cacheKey);
  }

  if (typeof document === 'undefined') {
    // Node.js / Headless testing fallback DataTexture
    const size = 64;
    const data = new Uint8Array(size * size * 4);
    for (let i = 0; i < size * size * 4; i += 4) {
      data[i] = 120;
      data[i + 1] = 53;
      data[i + 2] = 15;
      data[i + 3] = 255;
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.needsUpdate = true;
    SHARED_SEAL_TEXTURES.set(cacheKey, tex);
    return tex;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 680;
  const ctx = canvas.getContext('2d');

  // 1. Nền kim loại đồng cổ (Antique Bronze Patina Gradient)
  const bgGrad = ctx.createRadialGradient(512, 340, 50, 512, 340, 540);
  bgGrad.addColorStop(0.0, '#52341b'); // Đồng đỏ thau ấm ở tâm
  bgGrad.addColorStop(0.45, '#3b2210'); // Đồng sẫm
  bgGrad.addColorStop(0.85, '#26160a'); // Viền rêu phong cổ kính
  bgGrad.addColorStop(1.0, '#160e06'); // Rìa đen mun
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 1024, 680);

  // 2. Viền hoa văn kỷ hà kép & hồi văn chữ S thếp vàng Đông Sơn
  ctx.strokeStyle = '#d4af37'; // Vàng kim Đông Sơn
  ctx.lineWidth = 10;
  ctx.strokeRect(26, 26, 972, 628);

  ctx.strokeStyle = '#f59e0b'; // Hổ phách viền trong
  ctx.lineWidth = 3;
  ctx.strokeRect(44, 44, 936, 592);

  // Họa tiết 4 góc chim Lạc / hoa văn Đại Việt
  const drawCornerFlourish = (x, y, sx, sy) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sx, sy);
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(12, 12);
    ctx.lineTo(52, 12);
    ctx.moveTo(12, 12);
    ctx.lineTo(12, 52);
    ctx.stroke();

    // Họa tiết chấm hạt ngọc
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(22, 22, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  drawCornerFlourish(44, 44, 1, 1);
  drawCornerFlourish(980, 44, -1, 1);
  drawCornerFlourish(44, 636, 1, -1);
  drawCornerFlourish(980, 636, -1, -1);

  // 3. Dải vương miện trên cùng: Biểu tượng bảo tàng
  ctx.fillStyle = '#fef08a';
  ctx.font = 'bold 20px "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.letterSpacing = '2px';
  ctx.fillText('🏛️  BẢO TÀNG VĂN HỌC VIỆT NAM  •  KHÔNG GIAN DI SẢN', 512, 92);

  // Dải phân cách mạ vàng
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(200, 114);
  ctx.lineTo(824, 114);
  ctx.stroke();

  // 4. TIÊU ĐỀ KHẮC NỔI CHÍNH: "KHÔNG GIAN ĐANG PHỤC DỰNG – SẮP RA MẮT"
  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 36px "Times New Roman", serif';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 3;
  ctx.fillText('KHÔNG GIAN ĐANG PHỤC DỰNG – SẮP RA MẮT', 512, 175);
  ctx.shadowColor = 'transparent';

  // 5. Mã phòng & Tên tác phẩm lớn
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px "Segoe UI", sans-serif';
  ctx.fillText(`PHÒNG ${roomCode}`, 512, 225);

  ctx.fillStyle = '#fed7aa';
  ctx.font = 'bold 40px "Times New Roman", serif';
  ctx.fillText(item.name.toUpperCase(), 512, 275);

  // Tác giả & Thời kỳ
  ctx.fillStyle = '#fef3c7';
  ctx.font = 'italic 22px "Times New Roman", serif';
  ctx.fillText(`${item.author}  —  ${item.era || 'Di sản Văn hiến'}`, 512, 318);

  // 6. Khung thông báo phục dựng ở giữa
  ctx.fillStyle = 'rgba(15, 10, 5, 0.65)';
  ctx.fillRect(130, 355, 764, 175);
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.75)';
  ctx.lineWidth = 2;
  ctx.strokeRect(130, 355, 764, 175);

  ctx.fillStyle = '#fde68a';
  ctx.font = 'bold 22px "Segoe UI", sans-serif';
  ctx.fillText('🔒  THÔNG BÁO TẠM PHONG ẤN BẢO TỒN', 512, 400);

  ctx.fillStyle = '#fef3c7';
  ctx.font = '22px "Times New Roman", serif';
  ctx.fillText('Không gian nghệ thuật này đang được hoàn thiện và sẽ sớm ra mắt!', 512, 445);

  ctx.fillStyle = '#ffd269';
  ctx.font = 'italic 19px "Segoe UI", sans-serif';
  ctx.fillText('Kính mời quý khách tham quan 9 phòng triển lãm đã hoàn thiện của bảo tàng.', 512, 488);

  // 7. Con dấu son đỏ triều đình "NIÊM PHONG PHỤC DỰNG"
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 4;
  ctx.strokeRect(745, 550, 135, 80);
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 18px "Times New Roman", serif';
  ctx.fillText('NIÊM PHONG', 812, 582);
  ctx.fillText('PHỤC DỰNG', 812, 612);

  // 8. Tinh chỉnh texture chuẩn Three.js
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  if ('colorSpace' in texture && THREE.SRGBColorSpace) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  texture.needsUpdate = true;

  SHARED_SEAL_TEXTURES.set(cacheKey, texture);
  return texture;
}

// Giữ lại alias tương thích ngược
export const createCrimsonSealPlaqueTexture = createAntiqueBronzePlaqueTexture;

/**
 * DỰNG CỔNG KHÓA DI SẢN CUNG ĐÌNH CHO MỘT PHÒNG CHƯA HOÀN THIỆN
 */
export function createLockedRoomHeritageGate(item, pose, alcove, options = {}) {
  const { hitboxManager = null, loreGuide = null, audioManager = null, parentGroup = null } = options;

  const roomCode = getRoomCode(item);
  const doorWidth = alcove.doorwayWidth || (alcove.isNorthHall ? 8.0 : 6.2);
  const archPos = alcove.archPos || [pose.x, pose.z];
  const rotY = alcove.rotY || 0;
  const floorY = pose.y;

  const gateGroup = new THREE.Group();
  gateGroup.name = `Locked_Heritage_Gate_${item.id}`;
  gateGroup.position.set(archPos[0], floorY, archPos[1]);
  gateGroup.rotation.y = rotY;

  // 1. Vật liệu gỗ lim, đồng thau và lụa vàng
  const darkLimMat = new THREE.MeshStandardMaterial({
    color: 0x1c1917,
    roughness: 0.38,
    metalness: 0.25
  });

  const lacquerDoorMat = new THREE.MeshStandardMaterial({
    color: 0x240808, // Sơn mài thẫm ánh son cổ
    roughness: 0.32,
    metalness: 0.30
  });

  const antiqueBronzeMat = new THREE.MeshStandardMaterial({
    color: 0xd97706, // Đồng thau Đông Sơn
    roughness: 0.28,
    metalness: 0.85
  });

  const goldenSilkMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24, // Vàng hoàng kim tơ tằm
    emissive: 0x78350f,
    emissiveIntensity: 0.32,
    roughness: 0.26,
    metalness: 0.35,
    side: THREE.DoubleSide
  });

  const vermilionSealMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c, // Đỏ son triều ấn
    emissive: 0x450a0a,
    emissiveIntensity: 0.25,
    roughness: 0.42,
    metalness: 0.18
  });

  // 2. Hai cột trụ gỗ lim hai bên cổng
  const pillarRadius = 0.32;
  const pillarHeight = 7.6;
  const pillarGeo = new THREE.CylinderGeometry(pillarRadius, pillarRadius * 1.15, pillarHeight, 16);
  pillarGeo.computeVertexNormals();

  const leftPillar = new THREE.Mesh(pillarGeo, darkLimMat);
  leftPillar.position.set(-doorWidth * 0.5 - pillarRadius * 0.7, pillarHeight * 0.5, 0);
  leftPillar.castShadow = false;
  leftPillar.receiveShadow = false;
  leftPillar.userData.ignoreRaycaster = true;
  gateGroup.add(leftPillar);

  const rightPillar = new THREE.Mesh(pillarGeo, darkLimMat);
  rightPillar.position.set(doorWidth * 0.5 + pillarRadius * 0.7, pillarHeight * 0.5, 0);
  rightPillar.castShadow = false;
  rightPillar.receiveShadow = false;
  rightPillar.userData.ignoreRaycaster = true;
  gateGroup.add(rightPillar);

  // 3. Xà ngang chạm khắc đỉnh cửa (Lintel beam)
  const lintelGeo = new THREE.BoxGeometry(doorWidth + 1.4, 0.65, 0.75);
  lintelGeo.computeVertexNormals();
  const lintelMesh = new THREE.Mesh(lintelGeo, darkLimMat);
  lintelMesh.position.set(0, 7.25, 0);
  lintelMesh.userData.ignoreRaycaster = true;
  gateGroup.add(lintelMesh);

  // 4. Hai cánh cửa gỗ lim cung đình đóng khép chặt
  const doorHeight = 7.0;
  const leafWidth = doorWidth * 0.5 - 0.04;
  const doorThickness = 0.28;
  const doorGeo = new THREE.BoxGeometry(leafWidth, doorHeight, doorThickness);
  doorGeo.computeVertexNormals();

  const leftLeaf = new THREE.Mesh(doorGeo, lacquerDoorMat);
  leftLeaf.position.set(-leafWidth * 0.5 - 0.02, doorHeight * 0.5, 0);
  leftLeaf.userData.ignoreRaycaster = true;
  gateGroup.add(leftLeaf);

  const rightLeaf = new THREE.Mesh(doorGeo, lacquerDoorMat);
  rightLeaf.position.set(leafWidth * 0.5 + 0.02, doorHeight * 0.5, 0);
  rightLeaf.userData.ignoreRaycaster = true;
  gateGroup.add(rightLeaf);

  // Đinh đồng tán hoa mai (Bronze stud rivets) tạo nhịp điệu cung đình
  const studCount = 5;
  const studGeo = new THREE.SphereGeometry(0.045, 8, 8);
  studGeo.computeVertexNormals();
  for (let i = 0; i < studCount; i++) {
    const sy = 1.0 + i * 1.25;
    [-doorWidth * 0.38, -doorWidth * 0.12, doorWidth * 0.12, doorWidth * 0.38].forEach((sx) => {
      const stud = new THREE.Mesh(studGeo, antiqueBronzeMat);
      stud.position.set(sx, sy, doorThickness * 0.5 + 0.02);
      stud.userData.ignoreRaycaster = true;
      gateGroup.add(stud);
    });
  }

  // 5. THANH CHẮN GỖ LIM (Lim Wood Barricade Beam)
  const beamWidth = doorWidth + 0.7;
  const beamGeo = new THREE.BoxGeometry(beamWidth, 0.26, 0.34);
  beamGeo.computeVertexNormals();
  const beamMesh = new THREE.Mesh(beamGeo, darkLimMat);
  beamMesh.position.set(0, 1.25, doorThickness * 0.5 + 0.16);
  beamMesh.userData.ignoreRaycaster = true;
  gateGroup.add(beamMesh);

  // Ngàm đồng đúc hoa văn hai đầu thanh chắn
  const bracketGeo = new THREE.BoxGeometry(0.38, 0.36, 0.42);
  bracketGeo.computeVertexNormals();
  const leftBracket = new THREE.Mesh(bracketGeo, antiqueBronzeMat);
  leftBracket.position.set(-doorWidth * 0.5, 1.25, doorThickness * 0.5 + 0.16);
  leftBracket.userData.ignoreRaycaster = true;
  gateGroup.add(leftBracket);

  const rightBracket = new THREE.Mesh(bracketGeo, antiqueBronzeMat);
  rightBracket.position.set(doorWidth * 0.5, 1.25, doorThickness * 0.5 + 0.16);
  rightBracket.userData.ignoreRaycaster = true;
  gateGroup.add(rightBracket);

  // 6. DẢI LỤA VÀNG PHONG ẤN (Imperial Golden Silk Seal Ribbon)
  const ribbonWidth = doorWidth * 0.88;
  const ribbonSegments = 32;
  const ribbonPositions = [];
  const ribbonNormals = [];
  const ribbonUvs = [];
  const ribbonH = 0.38;

  for (let i = 0; i <= ribbonSegments; i++) {
    const t = i / ribbonSegments;
    const rx = (t - 0.5) * ribbonWidth;
    // Đường cong lượn võng mềm mại hình sin
    const ry = 1.25 - Math.sin(t * Math.PI) * 0.24;
    const rz = doorThickness * 0.5 + 0.36 + Math.sin(t * Math.PI * 2.0) * 0.035;

    ribbonPositions.push(rx, ry + ribbonH * 0.5, rz);
    ribbonPositions.push(rx, ry - ribbonH * 0.5, rz);
    ribbonNormals.push(0, 0, 1, 0, 0, 1);
    ribbonUvs.push(t, 1, t, 0);
  }

  const ribbonIndices = [];
  for (let i = 0; i < ribbonSegments; i++) {
    const a = i * 2;
    const b = i * 2 + 1;
    const c = (i + 1) * 2;
    const d = (i + 1) * 2 + 1;
    ribbonIndices.push(a, b, c);
    ribbonIndices.push(b, d, c);
  }

  const ribbonGeo = new THREE.BufferGeometry();
  ribbonGeo.setAttribute('position', new THREE.Float32BufferAttribute(ribbonPositions, 3));
  ribbonGeo.setAttribute('normal', new THREE.Float32BufferAttribute(ribbonNormals, 3));
  ribbonGeo.setAttribute('uv', new THREE.Float32BufferAttribute(ribbonUvs, 2));
  ribbonGeo.setIndex(ribbonIndices);
  ribbonGeo.computeVertexNormals();

  const ribbonMesh = new THREE.Mesh(ribbonGeo, goldenSilkMat);
  ribbonMesh.name = `GoldenSilkRibbon_${item.id}`;
  ribbonMesh.userData.ignoreRaycaster = true;
  gateGroup.add(ribbonMesh);

  // Đuôi lụa rủ xuống hai bên ngàm đồng
  const streamerGeo = new THREE.PlaneGeometry(0.26, 0.95);
  streamerGeo.computeVertexNormals();

  const leftStreamer = new THREE.Mesh(streamerGeo, goldenSilkMat);
  leftStreamer.position.set(-doorWidth * 0.44, 0.78, doorThickness * 0.5 + 0.38);
  leftStreamer.rotation.z = 0.08;
  leftStreamer.userData.ignoreRaycaster = true;
  gateGroup.add(leftStreamer);

  const rightStreamer = new THREE.Mesh(streamerGeo, goldenSilkMat);
  rightStreamer.position.set(doorWidth * 0.44, 0.78, doorThickness * 0.5 + 0.38);
  rightStreamer.rotation.z = -0.08;
  rightStreamer.userData.ignoreRaycaster = true;
  gateGroup.add(rightStreamer);

  // Nút thắt hoa lụa vàng ở giữa thanh dầm
  const rosetteGeo = new THREE.TorusGeometry(0.20, 0.065, 12, 24);
  rosetteGeo.computeVertexNormals();
  const rosetteMesh = new THREE.Mesh(rosetteGeo, goldenSilkMat);
  rosetteMesh.position.set(0, 1.05, doorThickness * 0.5 + 0.39);
  rosetteMesh.userData.ignoreRaycaster = true;
  gateGroup.add(rosetteMesh);

  // Đĩa son đỏ niêm phong triều đình ở tâm nút hoa
  const sealMedalGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.04, 24);
  sealMedalGeo.computeVertexNormals();
  const sealMedal = new THREE.Mesh(sealMedalGeo, vermilionSealMat);
  sealMedal.rotation.x = Math.PI / 2;
  sealMedal.position.set(0, 1.05, doorThickness * 0.5 + 0.42);
  sealMedal.userData.ignoreRaycaster = true;
  gateGroup.add(sealMedal);

  // 7. BIỂN ĐỒNG TRANG NHÃ KHẮC CHỮ "KHÔNG GIAN ĐANG PHỤC DỰNG – SẮP RA MẮT"
  const bronzePlaqueTex = createAntiqueBronzePlaqueTexture(roomCode, item);
  const plaqueW = 2.45;
  const plaqueH = 1.62;
  const plaqueGeo = new THREE.BoxGeometry(plaqueW, plaqueH, 0.08);
  plaqueGeo.computeVertexNormals();

  const plaqueMat = new THREE.MeshStandardMaterial({
    map: bronzePlaqueTex,
    roughness: 0.35,
    metalness: 0.30,
    emissive: new THREE.Color(0x381e05),
    emissiveIntensity: 0.45
  });

  const plaqueMesh = new THREE.Mesh(plaqueGeo, plaqueMat);
  plaqueMesh.name = `BronzeSealPlaque_${item.id}`;
  plaqueMesh.position.set(0, 3.55, doorThickness * 0.5 + 0.12);
  plaqueMesh.userData.ignoreRaycaster = true;
  gateGroup.add(plaqueMesh);

  // Khung viền gỗ lim bao quanh biển đồng
  const plaqueFrameGeo = new THREE.BoxGeometry(plaqueW + 0.22, plaqueH + 0.22, 0.06);
  plaqueFrameGeo.computeVertexNormals();
  const plaqueFrame = new THREE.Mesh(plaqueFrameGeo, darkLimMat);
  plaqueFrame.position.set(0, 3.55, doorThickness * 0.5 + 0.07);
  plaqueFrame.userData.ignoreRaycaster = true;
  gateGroup.add(plaqueFrame);

  // Đèn SpotLight ấm chiếu rọi biển đồng từ xà ngang
  const spotLight = new THREE.SpotLight(0xffdf73, 2.2, 10.0, Math.PI / 4.2, 0.55, 1.5);
  spotLight.name = `SealSpotLight_${item.id}`;
  spotLight.position.set(0, 6.8, 2.0);
  spotLight.target = plaqueMesh;
  spotLight.userData.ignoreRaycaster = true;
  gateGroup.add(spotLight);

  // 8. HỘP VA CHẠM THỰC TẾ (SOLID BOX3 COLLIDER) CHẶN KÍN 100% CỬA
  const isNorth = alcove.isNorthHall;
  let minVec, maxVec;
  const halfW = doorWidth * 0.5 + 0.5;
  const barrierThickness = 1.4;

  if (isNorth || Math.abs(rotY) < 0.1) {
    // Cửa xoay ngang theo trục X
    minVec = new THREE.Vector3(archPos[0] - halfW, floorY, archPos[1] - barrierThickness * 0.5);
    maxVec = new THREE.Vector3(archPos[0] + halfW, floorY + 8.0, archPos[1] + barrierThickness * 0.5);
  } else {
    // Cửa xoay dọc theo trục Z (Cánh Đông / Cánh Tây)
    minVec = new THREE.Vector3(archPos[0] - barrierThickness * 0.5, floorY, archPos[1] - halfW);
    maxVec = new THREE.Vector3(archPos[0] + barrierThickness * 0.5, floorY + 8.0, archPos[1] + halfW);
  }
  const colliderBox = new THREE.Box3(minVec, maxVec);

  // 9. PROXY HITBOX VÔ HÌNH CHO TƯƠNG TÁC RAYCASTER
  const proxyGeo = new THREE.BoxGeometry(doorWidth * 0.96, 4.8, 1.6);
  proxyGeo.computeVertexNormals();
  const proxyMat = new THREE.MeshBasicMaterial({
    visible: false,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  const clickProxy = new THREE.Mesh(proxyGeo, proxyMat);
  clickProxy.name = `LockedDoorClickProxy_${item.id}`;
  clickProxy.position.set(0, 2.8, 0.2);
  clickProxy.userData = {
    isLockedDoorProxy: true,
    isBookPortal: false,
    portalReady: false,
    excludeFromCollision: true,
    roomId: item.id,
    roomCode,
    roomName: item.name,
    lockNotice: item.lockNotice || 'Không gian nghệ thuật này đang được hoàn thiện và sẽ sớm ra mắt!',
    onActivate: () => {
      playLockedDoorSound();
      showLockedRoomNoticeToast(item, roomCode);
    },
    onClick: () => {
      playLockedDoorSound();
      showLockedRoomNoticeToast(item, roomCode);
    }
  };
  gateGroup.add(clickProxy);

  // 10. TẮT TOÀN BỘ HIỆU ỨNG VÒNG XOÁY PORTAL (Portal Deactivation)
  const deactivatePortalsInGroup = (group) => {
    if (!group) return;
    group.traverse((child) => {
      if (!child) return;
      // Tìm các đối tượng portal / book / vortex liên quan
      const matchesItem = (child.name && (child.name.includes(item.id) || child.name.includes(`Room_${item.id}`)));
      const distMatch = child.position && child.position.distanceTo && (child.position.distanceTo(gateGroup.position) < doorWidth * 1.8);
      
      if (matchesItem || distMatch) {
        if (child.userData?.isBookPortal || child.userData?.type === 'portal') {
          child.userData.portalReady = false;
          child.visible = false;
        }
        if (child.name && (child.name.includes('Portal') || child.name.includes('Vortex') || child.name.includes('MagicBook'))) {
          child.visible = false;
          if (child.material?.uniforms?.uAwaken) {
            child.material.uniforms.uAwaken.value = 0.0;
          }
        }
      }
    });
  };

  if (parentGroup) {
    deactivatePortalsInGroup(parentGroup);
  }

  return {
    gateGroup,
    colliderBox,
    clickProxy,
    item,
    roomCode
  };
}

/**
 * ============================================================================
 * KHỞI TẠO VÀ LẮP ĐẶT TOÀN BỘ CỔNG KHÓA CHO CÁC PHÒNG CHƯA HOÀN THIỆN
 * ============================================================================
 */
export function setupAllLockedRoomGates(parentGroup, options = {}) {
  const { hitboxManager = null, loreGuide = null, audioManager = null, cameraController = null } = options;

  const lockedGates = [];
  const solidColliders = [];
  const clickProxies = [];

  // Lọc tất cả các phòng chưa hoàn thiện (hoặc có cờ isLocked)
  const uncompletedRooms = LITERATURE_REGISTRY.filter((item) => isRoomLocked(item));

  uncompletedRooms.forEach((item) => {
    const pose = getRoomWorldPose(item);
    const alcove = ALCOVE_CENTERS[item.roomIndex] || ALCOVE_CENTERS[0];

    const gateData = createLockedRoomHeritageGate(item, pose, alcove, {
      hitboxManager,
      loreGuide,
      audioManager,
      parentGroup
    });

    if (parentGroup) {
      parentGroup.add(gateData.gateGroup);
    }

    lockedGates.push(gateData.gateGroup);
    solidColliders.push(gateData.colliderBox);
    clickProxies.push(gateData.clickProxy);

    // 1. Đăng ký va chạm cứng với CameraController
    if (cameraController && typeof cameraController.registerHitbox === 'function') {
      cameraController.registerHitbox({
        name: `Locked_Door_Wall_${item.id}`,
        box: gateData.colliderBox
      });
    }

    // 2. Đăng ký va chạm cứng với MuseumHitboxManager
    if (hitboxManager && typeof hitboxManager.registerSolidObjectCollider === 'function') {
      hitboxManager.registerSolidObjectCollider(null, {
        customBox: gateData.colliderBox,
        tag: `Locked_Door_Wall_${item.id}`
      });
    }
  });

  console.log(`%c✓ [LOCKED ROOM GATES]: Đã phong ấn và dựng cổng khóa cho ${uncompletedRooms.length} không gian chưa hoàn thiện!`, 'color: #ef4444; font-weight: bold;');

  return {
    lockedGates,
    solidColliders,
    clickProxies,
    uncompletedCount: uncompletedRooms.length
  };
}

export default {
  createLockedRoomHeritageGate,
  setupAllLockedRoomGates,
  createAntiqueBronzePlaqueTexture,
  createCrimsonSealPlaqueTexture
};
