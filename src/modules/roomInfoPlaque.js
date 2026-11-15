import * as THREE from 'three';
import {
  PLAQUE_STYLE_THEMES,
  getSynthesizedPlaqueLore,
  normalizePlaqueStyleTheme
} from '../config/plaqueLoreSynthesis.js';

/**
 * ============================================================================
 * ROOM INFO PLAQUE MODULE - BẢNG THÔNG TIN DI SẢN TRUYỀN THỐNG VIỆT NAM
 *
 * Thiết kế thay thế hoàn toàn Hologram Sci-Fi bằng Bia / Giá Bảng Cổ Truyền:
 * 1. Khung gỗ quý (gỗ lim / gỗ gõ đỏ PBR) chạm khắc họa tiết Đông Sơn & mây cuộn,
 *    kết hợp 4 chốt đồng nổi ở 4 góc và mão bia Mặt trời Đông Sơn ở đỉnh bảng.
 * 2. 3 chất liệu bề mặt trưng bày chuẩn di sản:
 *    - 'giay_do'       : Giấy Dó cổ thấm sợi truyền thống
 *    - 'lua_hoang_kim' : Chiếu Lụa Hoàng Kim dệt gấm cung đình
 *    - 'da_reu_phong'  : Bia Đá Rêu Phong chạm khắc chữ vàng cổ kính
 * 3. CanvasTexture độ phân giải cao (1024x768, SRGBColorSpace), tự căn chỉnh cỡ chữ
 *    và ngắt dòng tiếng Việt chuẩn NFC không cắt chữ.
 * 4. Đèn SpotLight ấm (#ffdf73) chuyên biệt rọi thẳng mặt bảng + fallback emissiveMap
 *    dịu nhẹ giúp luôn đọc rõ trong các phòng tối (Tắt Đèn) mà vẫn đạt 60+ FPS.
 * 5. Proxy Hitbox vô hình (userData.isPlaqueProxy = true) tách biệt hoàn toàn khỏi
 *    toàn bộ mesh trang trí & đèn (userData.ignoreRaycaster = true).
 * ============================================================================
 */

const PLAQUE_TEXTURE_CACHE = new Map();
const SHARED_GEOMETRIES = new Map();
const SHARED_MATERIALS = new Map();
const SHARED_TEXTURES = new Map();

function getSharedGeometry(key, factory) {
  if (!SHARED_GEOMETRIES.has(key)) {
    SHARED_GEOMETRIES.set(key, factory());
  }
  return SHARED_GEOMETRIES.get(key);
}

function getSharedMaterial(key, factory) {
  if (!SHARED_MATERIALS.has(key)) {
    SHARED_MATERIALS.set(key, factory());
  }
  return SHARED_MATERIALS.get(key);
}

function getSharedTexture(key, factory) {
  if (!SHARED_TEXTURES.has(key)) {
    SHARED_TEXTURES.set(key, factory());
  }
  return SHARED_TEXTURES.get(key);
}

/**
 * Tạo cặp texture vân gỗ quý (gỗ lim / gỗ gõ đỏ) + bumpMap dùng chung
 */
function getWoodTextureSet(tone = 'lim') {
  const key = `wood_${tone}`;
  return getSharedTexture(key, () => {
    if (typeof document === 'undefined') return { map: null, bumpMap: null };

    const size = 256;
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = size;
    colorCanvas.height = size;
    const cCtx = colorCanvas.getContext('2d');

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = size;
    bumpCanvas.height = size;
    const bCtx = bumpCanvas.getContext('2d');

    const isMahogany = tone === 'go_do';
    cCtx.fillStyle = isMahogany ? '#592415' : '#352014';
    cCtx.fillRect(0, 0, size, size);

    bCtx.fillStyle = '#808080';
    bCtx.fillRect(0, 0, size, size);

    for (let y = 0; y < size; y++) {
      const wave = Math.sin(y * 0.14) * 0.5 + Math.sin(y * 0.37) * 0.3 + Math.cos(y * 0.05) * 0.2;
      const alpha = 0.06 + Math.abs(wave) * 0.12;
      cCtx.fillStyle = wave > 0
        ? (isMahogany ? `rgba(116, 48, 28, ${alpha})` : `rgba(78, 48, 30, ${alpha})`)
        : (isMahogany ? `rgba(42, 14, 8, ${alpha})` : `rgba(24, 13, 8, ${alpha})`);
      cCtx.fillRect(0, y, size, 1);

      const gVal = Math.max(40, Math.min(220, Math.round(128 + wave * 42)));
      bCtx.fillStyle = `rgb(${gVal},${gVal},${gVal})`;
      bCtx.fillRect(0, y, size, 1);
    }

    // Thớ gỗ sọc dọc nhẹ
    for (let i = 0; i < 42; i++) {
      const x = (i * 37) % size;
      const w = 1 + (i % 3);
      cCtx.fillStyle = isMahogany ? 'rgba(30, 10, 5, 0.12)' : 'rgba(18, 10, 6, 0.14)';
      cCtx.fillRect(x, 0, w, size);
      bCtx.fillStyle = 'rgba(70, 70, 70, 0.25)';
      bCtx.fillRect(x, 0, w, size);
    }

    const map = new THREE.CanvasTexture(colorCanvas);
    if ('colorSpace' in map && THREE.SRGBColorSpace) {
      map.colorSpace = THREE.SRGBColorSpace;
    }
    map.wrapS = map.wrapT = THREE.RepeatWrapping;
    map.needsUpdate = true;

    const bumpMap = new THREE.CanvasTexture(bumpCanvas);
    bumpMap.wrapS = bumpMap.wrapT = THREE.RepeatWrapping;
    bumpMap.needsUpdate = true;

    return { map, bumpMap };
  });
}

/**
 * Tạo bumpMap họa tiết Đông Sơn & mây cuộn chạm nổi cho viền đồng cổ
 */
function getBronzeReliefBumpTexture() {
  return getSharedTexture('bronze_dongson_bump', () => {
    if (typeof document === 'undefined') return null;
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#787878';
    ctx.fillRect(0, 0, size, size);

    // Đường hồi văn kỷ hà & mây cuộn Đông Sơn lặp lại
    ctx.strokeStyle = '#dcdcdc';
    ctx.lineWidth = 4;
    for (let x = 0; x < size; x += 32) {
      ctx.strokeRect(x + 4, 16, 24, 24);
      ctx.strokeRect(x + 10, 22, 12, 12);
      ctx.beginPath();
      ctx.arc(x + 16, 128, 12, 0, Math.PI, false);
      ctx.arc(x + 32, 128, 12, Math.PI, Math.PI * 2, false);
      ctx.stroke();
    }

    // Mặt trời Đông Sơn 12 tia ở tâm
    const cx = size * 0.5;
    const cy = size * 0.5;
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, 46, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.stroke();
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * 24, cy + Math.sin(ang) * 24);
      ctx.lineTo(cx + Math.cos(ang) * 44, cy + Math.sin(ang) * 44);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.needsUpdate = true;
    return tex;
  });
}

/**
 * Tạo bumpMap vi bề mặt cho 3 chất liệu hiển thị: Giấy Dó, Lụa Hoàng Kim, Đá Rêu Phong
 */
function getSurfaceMicroBumpTexture(styleTheme) {
  const norm = normalizePlaqueStyleTheme(styleTheme);
  return getSharedTexture(`surface_bump_${norm}`, () => {
    if (typeof document === 'undefined') return null;
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);

    if (norm === 'lua_hoang_kim') {
      // Sợi dệt lụa gấm đan chéo mảnh
      ctx.strokeStyle = 'rgba(205, 205, 205, 0.35)';
      ctx.lineWidth = 1;
      for (let i = 0; i < size; i += 4) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(size, i);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(75, 75, 75, 0.25)';
      for (let i = 0; i < size; i += 6) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, size);
        ctx.stroke();
      }
    } else if (norm === 'da_reu_phong') {
      // Hạt đá khắc nhám & rỗ cổ
      for (let i = 0; i < 900; i++) {
        const x = (i * 73) % size;
        const y = (i * 139) % size;
        const r = 1 + (i % 3);
        ctx.fillStyle = i % 2 === 0 ? 'rgba(210, 210, 210, 0.28)' : 'rgba(55, 55, 55, 0.34)';
        ctx.fillRect(x, y, r, r);
      }
    } else {
      // Sợi giấy Dó thủ công đan xen ngẫu nhiên có trật tự
      ctx.strokeStyle = 'rgba(220, 220, 220, 0.25)';
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 160; i++) {
        const x = (i * 53) % size;
        const y = (i * 97) % size;
        const dx = ((i % 7) - 3) * 6;
        const dy = (((i * 3) % 7) - 3) * 5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + dx, y + dy);
        ctx.stroke();
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(3, 2);
    tex.needsUpdate = true;
    return tex;
  });
}

function getWoodMaterial(woodTone = 'lim') {
  return getSharedMaterial(`plaque_wood_${woodTone}`, () => {
    const { map, bumpMap } = getWoodTextureSet(woodTone);
    return new THREE.MeshStandardMaterial({
      map,
      bumpMap,
      bumpScale: 0.008,
      color: woodTone === 'go_do' ? 0xc97b5d : 0xa68974,
      roughness: 0.56,
      metalness: 0.08
    });
  });
}

function getBronzeMaterial(patina = false) {
  const key = patina ? 'plaque_bronze_patina' : 'plaque_bronze_antique';
  return getSharedMaterial(key, () => new THREE.MeshStandardMaterial({
    color: patina ? 0x6f7546 : 0xb38b3e,
    bumpMap: getBronzeReliefBumpTexture(),
    bumpScale: 0.014,
    roughness: patina ? 0.44 : 0.32,
    metalness: 0.78
  }));
}

function getStoneMossFrameMaterial() {
  return getSharedMaterial('plaque_stone_moss', () => new THREE.MeshStandardMaterial({
    color: 0x3b453c,
    bumpMap: getSurfaceMicroBumpTexture('da_reu_phong'),
    bumpScale: 0.015,
    roughness: 0.86,
    metalness: 0.05
  }));
}

function getSharedProxyMaterial() {
  return getSharedMaterial('plaque_invisible_proxy', () => new THREE.MeshBasicMaterial({
    color: 0xfde047,
    transparent: true,
    opacity: 0.0,
    depthWrite: false
  }));
}

/**
 * Ngắt dòng văn bản tiếng Việt chuẩn xác trên Canvas 2D (NFC, có xét ellipsis khi vượt quá maxLines)
 */
function wrapVietnameseLines(ctx, text, maxWidth, maxLines = 8) {
  const clean = String(text || '').normalize('NFC').trim();
  if (!clean) return [];
  const paragraphs = clean.split(/\n+/);
  const lines = [];

  for (let p = 0; p < paragraphs.length; p++) {
    const words = paragraphs[p].trim().split(/\s+/).filter(Boolean);
    let line = '';
    for (let n = 0; n < words.length; n++) {
      const testLine = line ? `${line} ${words[n]}` : words[n];
      if (ctx.measureText(testLine).width > maxWidth && line) {
        lines.push(line);
        line = words[n];
        if (lines.length >= maxLines - 1) {
          // Gộp nốt phần còn lại nếu vừa hoặc cắt gọn bằng dấu '...'
          let tail = line;
          for (let k = n + 1; k < words.length; k++) {
            const cand = `${tail} ${words[k]}`;
            if (ctx.measureText(`${cand}...`).width <= maxWidth) {
              tail = cand;
            } else {
              tail = `${tail}...`;
              break;
            }
          }
          if (!tail.endsWith('...') && n < words.length - 1) {
            tail = `${tail}...`;
          }
          lines.push(tail);
          return lines;
        }
      } else {
        line = testLine;
      }
    }
    if (line) {
      lines.push(line);
      if (lines.length >= maxLines) return lines.slice(0, maxLines);
    }
  }
  return lines;
}

/**
 * Vẽ nền chất liệu truyền thống lên Canvas 2D (Giấy Dó / Lụa Hoàng Kim / Bia Đá Rêu Phong)
 */
function paintHeritageSurfaceBackground(ctx, width, height, styleTheme) {
  const norm = normalizePlaqueStyleTheme(styleTheme);

  if (norm === 'lua_hoang_kim') {
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0.0, '#fbf0cc');
    grad.addColorStop(0.5, '#f0d68c');
    grad.addColorStop(1.0, '#d7b056');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Sợi gấm lụa dệt chéo mờ
    ctx.strokeStyle = 'rgba(139, 30, 30, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 28) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Họa tiết chữ Thọ / đồng tiền mờ hoàng gia ở 4 góc nền
    ctx.strokeStyle = 'rgba(153, 27, 27, 0.08)';
    ctx.lineWidth = 3;
    [
      [width * 0.5, height * 0.52, 190],
      [width * 0.5, height * 0.52, 165]
    ].forEach(([cx, cy, r]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });
  } else if (norm === 'da_reu_phong') {
    const grad = ctx.createRadialGradient(width * 0.5, height * 0.42, 60, width * 0.5, height * 0.5, width * 0.72);
    grad.addColorStop(0.0, '#3e463f');
    grad.addColorStop(0.65, '#2d342e');
    grad.addColorStop(1.0, '#1e241f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Vệt rêu phong xanh trầm bám quanh viền đá
    const mossSpots = [
      [58, 70, 95], [width - 70, 82, 105], [75, height - 70, 120],
      [width - 80, height - 65, 115], [width * 0.5, 42, 130]
    ];
    for (let i = 0; i < mossSpots.length; i++) {
      const [mx, my, mr] = mossSpots[i];
      const mg = ctx.createRadialGradient(mx, my, 8, mx, my, mr);
      mg.addColorStop(0, 'rgba(74, 112, 68, 0.34)');
      mg.addColorStop(1, 'rgba(74, 112, 68, 0)');
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, Math.PI * 2);
      ctx.fill();
    }

    // Vân đá khắc chìm nhẹ
    ctx.fillStyle = 'rgba(255, 245, 220, 0.025)';
    for (let i = 0; i < 320; i++) {
      const rx = (i * 97) % width;
      const ry = (i * 173) % height;
      ctx.fillRect(rx, ry, 2 + (i % 4), 2);
    }
  } else {
    // Giấy Dó cổ (giay_do)
    const grad = ctx.createRadialGradient(width * 0.48, height * 0.45, 80, width * 0.5, height * 0.5, width * 0.74);
    grad.addColorStop(0.0, '#f5ebd0');
    grad.addColorStop(0.6, '#e9d4a6');
    grad.addColorStop(1.0, '#cfb17a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Sợi giấy Dó mảnh ngà tự nhiên
    ctx.strokeStyle = 'rgba(110, 72, 32, 0.08)';
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 180; i++) {
      const fx = (i * 61) % width;
      const fy = (i * 113) % height;
      const len = 12 + (i % 18);
      const ang = ((i * 29) % 180) * (Math.PI / 180);
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + Math.cos(ang) * len, fy + Math.sin(ang) * len);
      ctx.stroke();
    }
  }

  // Vignette nhẹ viền cổ
  const vig = ctx.createRadialGradient(width * 0.5, height * 0.5, width * 0.32, width * 0.5, height * 0.5, width * 0.72);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, norm === 'da_reu_phong' ? 'rgba(0,0,0,0.42)' : 'rgba(68, 38, 12, 0.20)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);
}

/**
 * Vẽ khung viền hoa văn hồi văn & góc Đông Sơn trên Canvas 2D
 */
function paintHeritageFrameOverlay(ctx, width, height, theme) {
  const padOut = 26;
  const padIn = 40;

  ctx.strokeStyle = theme.borderColor;
  ctx.lineWidth = 5;
  ctx.strokeRect(padOut, padOut, width - padOut * 2, height - padOut * 2);

  ctx.strokeStyle = theme.accentColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(padIn, padIn, width - padIn * 2, height - padIn * 2);

  // Khung góc hồi văn truyền thống ở 4 góc
  const cLen = 36;
  const corners = [
    [padOut, padOut, 1, 1],
    [width - padOut, padOut, -1, 1],
    [padOut, height - padOut, 1, -1],
    [width - padOut, height - padOut, -1, -1]
  ];
  ctx.strokeStyle = theme.accentColor;
  ctx.lineWidth = 3.5;
  for (let i = 0; i < corners.length; i++) {
    const [cx, cy, dx, dy] = corners[i];
    ctx.beginPath();
    ctx.moveTo(cx + dx * cLen, cy);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx, cy + dy * cLen);
    ctx.stroke();

    ctx.beginPath();
    ctx.rect(cx + (dx > 0 ? 10 : -24), cy + (dy > 0 ? 10 : -24), 14, 14);
    ctx.stroke();
  }
}

/**
 * Vẽ CanvasTexture độ phân giải cao (1024x768) chuẩn Vietnamese NFC & SRGBColorSpace
 */
export function getHeritagePlaqueCanvasTexture({
  title = 'Tác phẩm Văn học',
  author = 'Dân gian Việt Nam',
  years = '',
  historicalPeriod = '',
  subtitle = '',
  summary = '',
  description = '',
  styleTheme = 'giay_do',
  badgeLabel = '',
  sectorCode = 'BẢO TÀNG VĂN HỌC VIỆT NAM'
} = {}) {
  const normTheme = normalizePlaqueStyleTheme(styleTheme);
  const theme = PLAQUE_STYLE_THEMES[normTheme] || PLAQUE_STYLE_THEMES.giay_do;

  const cleanTitle = String(title || 'Tác phẩm Văn học').normalize('NFC').trim();
  const cleanAuthor = String(author || '').normalize('NFC').trim();
  const cleanYears = String(years || '').normalize('NFC').trim();
  const cleanPeriod = String(historicalPeriod || '').normalize('NFC').trim();
  const cleanSubtitle = String(
    subtitle ||
    [cleanAuthor ? `${cleanAuthor}${cleanYears ? ` (${cleanYears})` : ''}` : '', cleanPeriod]
      .filter(Boolean)
      .join(' • ')
  ).normalize('NFC').trim();
  const cleanSummary = String(summary || description || '').normalize('NFC').trim();
  const cleanBadge = String(badgeLabel || theme.badgeDefault).normalize('NFC').trim();
  const cleanSector = String(sectorCode || 'BẢO TÀNG VĂN HỌC VIỆT NAM').normalize('NFC').trim();

  const cacheKey = `${normTheme}|${cleanTitle}|${cleanSubtitle}|${cleanSummary.slice(0, 64)}|${cleanBadge}`;
  if (PLAQUE_TEXTURE_CACHE.has(cacheKey)) {
    return PLAQUE_TEXTURE_CACHE.get(cacheKey);
  }
  if (typeof document === 'undefined') return null;

  const width = 1024;
  const height = 768;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // 1. Nền & Khung truyền thống
  paintHeritageSurfaceBackground(ctx, width, height, normTheme);
  paintHeritageFrameOverlay(ctx, width, height, theme);

  const serifFont = '"Times New Roman", Georgia, serif';
  const sansFont = '"Segoe UI", Arial, sans-serif';

  // 2. Thanh tiêu đề nghi thức trên cùng + Ấn triện
  ctx.fillStyle = theme.inkSecondary;
  ctx.font = `700 17px ${sansFont}`;
  ctx.textAlign = 'left';
  ctx.fillText(`◈ ${cleanSector}`, 66, 78, width - 350);

  // Ấn triện đỏ / vàng son góc phải
  ctx.font = `700 15px ${sansFont}`;
  const badgeW = Math.min(250, Math.max(150, ctx.measureText(cleanBadge).width + 28));
  const badgeX = width - 64 - badgeW;
  const badgeY = 54;
  ctx.save();
  ctx.strokeStyle = theme.accentColor;
  ctx.lineWidth = 2.5;
  ctx.fillStyle = normTheme === 'da_reu_phong' ? 'rgba(217, 164, 65, 0.14)' : 'rgba(140, 34, 27, 0.08)';
  ctx.fillRect(badgeX, badgeY, badgeW, 34);
  ctx.strokeRect(badgeX, badgeY, badgeW, 34);
  ctx.fillStyle = theme.accentColor;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(cleanBadge, badgeX + badgeW * 0.5, badgeY + 17, badgeW - 14);
  ctx.restore();

  // Đường kẻ dưới header
  ctx.strokeStyle = theme.borderColor;
  ctx.globalAlpha = 0.45;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(64, 102);
  ctx.lineTo(width - 64, 102);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // 3. TIÊU ĐỀ CHÍNH (viết hoa trang trọng, tự động co cỡ chữ để không bao giờ tràn)
  const upperTitle = cleanTitle.toUpperCase();
  let titleFontSize = 50;
  let titleLines = [];
  const maxTitleW = width - 148;

  while (titleFontSize >= 32) {
    ctx.font = `bold ${titleFontSize}px ${serifFont}`;
    const singleW = ctx.measureText(upperTitle).width;
    if (singleW <= maxTitleW) {
      titleLines = [upperTitle];
      break;
    }
    if (titleFontSize <= 38) {
      const wrapped = wrapVietnameseLines(ctx, upperTitle, maxTitleW, 2);
      if (wrapped.length <= 2) {
        titleLines = wrapped;
        break;
      }
    }
    titleFontSize -= 3;
  }
  if (titleLines.length === 0) {
    ctx.font = `bold 32px ${serifFont}`;
    titleLines = wrapVietnameseLines(ctx, upperTitle, maxTitleW, 2);
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = normTheme === 'da_reu_phong' ? '#f6ebd0' : theme.inkPrimary;
  if (normTheme === 'da_reu_phong') {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 6;
  }

  let cursorY = titleLines.length > 1 ? 158 : 172;
  const titleLineH = titleFontSize + 10;
  for (let i = 0; i < titleLines.length; i++) {
    ctx.fillText(titleLines[i], width * 0.5, cursorY, maxTitleW);
    cursorY += titleLineH;
  }
  ctx.shadowBlur = 0;

  // Đường gạch phân cách Đông Sơn dưới tiêu đề
  const divY = Math.max(202, cursorY - 10);
  ctx.strokeStyle = theme.accentColor;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(width * 0.18, divY);
  ctx.lineTo(width * 0.46, divY);
  ctx.moveTo(width * 0.54, divY);
  ctx.lineTo(width * 0.82, divY);
  ctx.stroke();

  // Họa tiết mặt trời nhỏ ở tâm đường gạch
  ctx.beginPath();
  ctx.arc(width * 0.5, divY, 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = theme.accentColor;
  ctx.beginPath();
  ctx.arc(width * 0.5, divY, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // 4. PHỤ ĐỀ (Tác giả, năm sinh-mất, giai đoạn lịch sử)
  let subFontSize = 25;
  ctx.font = `italic bold ${subFontSize}px ${serifFont}`;
  let subLines = wrapVietnameseLines(ctx, cleanSubtitle, width - 160, 2);
  if (subLines.length > 2) {
    subFontSize = 22;
    ctx.font = `italic bold ${subFontSize}px ${serifFont}`;
    subLines = wrapVietnameseLines(ctx, cleanSubtitle, width - 160, 2);
  }

  let subY = divY + 42;
  ctx.fillStyle = theme.accentColor;
  for (let i = 0; i < subLines.length; i++) {
    ctx.fillText(subLines[i], width * 0.5, subY);
    subY += subFontSize + 10;
  }

  // Đường kẻ phân cách trước phần tóm tắt
  const ruleY = subY + 8;
  ctx.strokeStyle = theme.borderColor;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(86, ruleY);
  ctx.lineTo(width - 86, ruleY);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // 5. NỘI DUNG TÓM TẮT NGẮN GỌN (tự động điều chỉnh cỡ chữ vừa khung)
  const bodyMaxW = width - 168;
  const bodyStartY = ruleY + 46;
  const maxBodyBottom = height - 96;
  let bodyFontSize = 27;
  let bodyLineH = 42;
  let bodyLines = [];

  while (bodyFontSize >= 21) {
    ctx.font = `${bodyFontSize}px ${serifFont}`;
    bodyLineH = Math.round(bodyFontSize * 1.52);
    const maxLinesFit = Math.max(3, Math.floor((maxBodyBottom - bodyStartY) / bodyLineH) + 1);
    const testLines = wrapVietnameseLines(ctx, cleanSummary, bodyMaxW, maxLinesFit);
    const lastLineEnd = bodyStartY + (testLines.length - 1) * bodyLineH;
    if (lastLineEnd <= maxBodyBottom && !testLines[testLines.length - 1]?.endsWith('...')) {
      bodyLines = testLines;
      break;
    }
    bodyLines = testLines;
    bodyFontSize -= 2;
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = theme.inkPrimary;
  ctx.font = `${bodyFontSize}px ${serifFont}`;
  let textY = bodyStartY;
  for (let i = 0; i < bodyLines.length; i++) {
    ctx.fillText(bodyLines[i], 84, textY);
    textY += bodyLineH;
  }

  // 6. Chân bảng hướng dẫn tương tác
  ctx.strokeStyle = theme.borderColor;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(64, height - 74);
  ctx.lineTo(width - 64, height - 74);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.fillStyle = theme.inkSecondary;
  ctx.font = `600 17px ${sansFont}`;
  ctx.textAlign = 'center';
  ctx.fillText('◈ Nhấn vào bảng để mở Thẻ Hiện Vật & Tư Liệu Chi Tiết ◈', width * 0.5, height - 48);

  const texture = new THREE.CanvasTexture(canvas);
  if ('colorSpace' in texture && THREE.SRGBColorSpace) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  texture.anisotropy = 4;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  PLAQUE_TEXTURE_CACHE.set(cacheKey, texture);
  return texture;
}

/**
 * Tạo cụm 4 chốt đồng nổi ở 4 góc khung bảng (dùng lại geometry & material)
 */
function buildCornerBronzeBosses(boardWidth, boardHeight, bronzeMat) {
  const group = new THREE.Group();
  group.name = 'Plaque_Bronze_Corner_Bosses';

  const plateGeo = getSharedGeometry('corner_plate', () => new THREE.BoxGeometry(0.11, 0.11, 0.025));
  const bossGeo = getSharedGeometry('corner_stud', () => new THREE.CylinderGeometry(0.024, 0.032, 0.024, 12));

  const halfW = boardWidth * 0.5 - 0.055;
  const halfH = boardHeight * 0.5 - 0.055;
  const coords = [
    [-halfW, halfH],
    [halfW, halfH],
    [-halfW, -halfH],
    [halfW, -halfH]
  ];

  for (let i = 0; i < coords.length; i++) {
    const [cx, cy] = coords[i];
    const plate = new THREE.Mesh(plateGeo, bronzeMat);
    plate.position.set(cx, cy, 0.044);
    group.add(plate);

    const stud = new THREE.Mesh(bossGeo, bronzeMat);
    stud.rotation.x = Math.PI * 0.5;
    stud.position.set(cx, cy, 0.058);
    group.add(stud);
  }

  return group;
}

/**
 * Tạo Mão Bia / Trán Bảng chạm khắc họa tiết Mặt trời Đông Sơn & mây cuộn ở đỉnh bảng
 */
function buildTraditionalTopCrest(boardHeight, frameMat, bronzeMat) {
  const crestGroup = new THREE.Group();
  crestGroup.name = 'Plaque_DongSon_Top_Crest';
  crestGroup.position.set(0, boardHeight * 0.5 + 0.04, 0.01);

  // Bệ mão gỗ giật cấp
  const lowerArch = new THREE.Mesh(
    getSharedGeometry('crest_lower', () => new THREE.BoxGeometry(0.98, 0.09, 0.08)),
    frameMat
  );
  lowerArch.position.set(0, 0.01, 0);
  crestGroup.add(lowerArch);

  const upperArch = new THREE.Mesh(
    getSharedGeometry('crest_upper', () => new THREE.BoxGeometry(0.56, 0.09, 0.075)),
    frameMat
  );
  upperArch.position.set(0, 0.085, 0.002);
  crestGroup.add(upperArch);

  // Đôi cánh mây cuộn đồng cổ hai bên
  const wingGeo = getSharedGeometry('crest_cloud_wing', () => new THREE.TorusGeometry(0.065, 0.018, 8, 16, Math.PI * 1.25));
  [-1, 1].forEach((side) => {
    const wing = new THREE.Mesh(wingGeo, bronzeMat);
    wing.position.set(side * 0.37, 0.07, 0.02);
    wing.rotation.z = side > 0 ? -0.35 : 0.35 + Math.PI * 0.75;
    crestGroup.add(wing);
  });

  // Huy hiệu Trống đồng Đông Sơn ở đỉnh trung tâm
  const medallionDisc = new THREE.Mesh(
    getSharedGeometry('crest_medallion_disc', () => new THREE.CylinderGeometry(0.115, 0.125, 0.032, 24)),
    bronzeMat
  );
  medallionDisc.rotation.x = Math.PI * 0.5;
  medallionDisc.position.set(0, 0.115, 0.025);
  crestGroup.add(medallionDisc);

  const medallionRing = new THREE.Mesh(
    getSharedGeometry('crest_medallion_ring', () => new THREE.TorusGeometry(0.092, 0.013, 8, 24)),
    bronzeMat
  );
  medallionRing.position.set(0, 0.115, 0.044);
  crestGroup.add(medallionRing);

  const sunCore = new THREE.Mesh(
    getSharedGeometry('crest_sun_core', () => new THREE.SphereGeometry(0.028, 12, 10)),
    bronzeMat
  );
  sunCore.scale.set(1, 1, 0.55);
  sunCore.position.set(0, 0.115, 0.045);
  crestGroup.add(sunCore);

  return crestGroup;
}

/**
 * Cập nhật & đồng bộ tọa độ thế giới của focusPoint và focusNormal sau khi đặt bảng vào phòng
 */
export function syncPlaqueWorldMetadata(plaqueRoot) {
  if (!plaqueRoot) return null;
  plaqueRoot.updateMatrixWorld(true);
  const faceAnchor = plaqueRoot.userData?.faceAnchor;
  const proxyMesh = plaqueRoot.userData?.plaqueProxy;
  const focusPoint = plaqueRoot.userData?._focusPointVec || new THREE.Vector3();
  const focusNormal = plaqueRoot.userData?._focusNormalVec || new THREE.Vector3(0, 0, 1);

  if (faceAnchor) {
    faceAnchor.getWorldPosition(focusPoint);
    const quat = plaqueRoot.userData?._focusQuat || new THREE.Quaternion();
    faceAnchor.getWorldQuaternion(quat);
    focusNormal.set(0, 0, 1).applyQuaternion(quat).normalize();
    plaqueRoot.userData._focusQuat = quat;
  } else {
    plaqueRoot.getWorldPosition(focusPoint);
    focusNormal.set(0, 0, 1).applyQuaternion(plaqueRoot.getWorldQuaternion(new THREE.Quaternion())).normalize();
  }

  plaqueRoot.userData._focusPointVec = focusPoint;
  plaqueRoot.userData._focusNormalVec = focusNormal;

  if (proxyMesh) {
    proxyMesh.userData._focusPointVec = focusPoint;
    proxyMesh.userData._focusNormalVec = focusNormal;
  }
  return { focusPoint, focusNormal };
}

/**
 * Đăng ký bảng thông tin vào MuseumHitboxManager & LoreGuideSystem mà không tạo Proxy trùng lặp
 */
export function registerPlaqueWithSystems(plaqueRoot, {
  hitboxManager = (typeof window !== 'undefined' ? window.__museumHitboxManager : null),
  loreGuide = (typeof window !== 'undefined' ? window.__loreGuide : null),
  onFocusCamera = null,
  realm = 'museum'
} = {}) {
  if (!plaqueRoot) return null;
  syncPlaqueWorldMetadata(plaqueRoot);

  const proxyMesh = plaqueRoot.userData?.plaqueProxy;
  if (!proxyMesh) return null;

  proxyMesh.userData.realm = realm;
  if (typeof onFocusCamera === 'function') {
    proxyMesh.userData.onFocusCamera = onFocusCamera;
  }

  if (hitboxManager) {
    if (Array.isArray(hitboxManager.clickProxies) && !hitboxManager.clickProxies.includes(proxyMesh)) {
      hitboxManager.clickProxies.push(proxyMesh);
    }
    if (typeof hitboxManager._setDebugHelperSpec === 'function') {
      const box = new THREE.Box3().setFromObject(proxyMesh);
      hitboxManager._setDebugHelperSpec(`Helper_${proxyMesh.name}`, box, 0xfde047, realm);
    }
  }

  if (loreGuide && typeof loreGuide.registerArtifact === 'function') {
    loreGuide.registerArtifact(proxyMesh, proxyMesh.userData.loreKey);
  }

  return proxyMesh;
}

/**
 * XÂY DỰNG MÔ HÌNH BẢNG THÔNG TIN DI SẢN TRUYỀN THỐNG 3D
 *
 * @param {Object} options
 * @param {string} [options.roomId] - Mã phòng trong LITERATURE_REGISTRY (tự động suy xuất nếu truyền)
 * @param {string} [options.loreKey] - Khóa mở popup Lore Card
 * @param {string} [options.plaqueId] - Định danh bảng
 * @param {string} [options.title] - Tiêu đề tác phẩm
 * @param {string} [options.author] - Tác giả
 * @param {string} [options.years] - Năm sinh–mất hoặc niên đại (cũng nhận options.year)
 * @param {string} [options.historicalPeriod] - Giai đoạn lịch sử
 * @param {string} [options.subtitle] - Phụ đề tổng hợp
 * @param {string} [options.summary] - Tóm tắt nội dung hiển thị mặt bảng (cũng nhận options.description)
 * @param {string} [options.styleTheme='giay_do'] - 'giay_do' | 'lua_hoang_kim' | 'da_reu_phong'
 * @param {string} [options.mountMode='pedestal'] - 'pedestal' (chân đế đứng sàn tại y=0) | 'wall' (treo tường)
 * @param {boolean} [options.includeSpotLight=true] - Có gắn SpotLight ấm #ffdf73 rọi mặt bảng hay không
 * @param {number} [options.width=1.56] - Chiều rộng khung bảng ngoài (m)
 * @param {number} [options.height=1.16] - Chiều cao khung bảng ngoài (m)
 * @returns {THREE.Group}
 */
export function createRoomInfoPlaque(options = {}) {
  const synth = options.roomId || options.loreKey
    ? getSynthesizedPlaqueLore(options.roomId || options.loreKey)
    : null;

  const styleTheme = normalizePlaqueStyleTheme(
    options.styleTheme || synth?.styleTheme || 'giay_do'
  );
  const themeMeta = PLAQUE_STYLE_THEMES[styleTheme] || PLAQUE_STYLE_THEMES.giay_do;

  const roomId = options.roomId || synth?.roomId || 'custom';
  const plaqueId = options.plaqueId || synth?.plaqueId || `plaque_${roomId}`;
  const loreKey = options.loreKey || synth?.loreKey || plaqueId;

  const title = options.title || synth?.title || 'Tác phẩm Văn học';
  const author = options.author || synth?.author || 'Dân gian Việt Nam';
  const years = options.years || options.year || synth?.years || '';
  const historicalPeriod = options.historicalPeriod || synth?.historicalPeriod || '';
  const subtitle = options.subtitle || synth?.subtitle || '';
  const summary = options.summary || options.description || synth?.summary || synth?.description || '';
  const badgeLabel = options.badgeLabel || synth?.badgeLabel || themeMeta.badgeDefault;
  const sectorCode = options.sectorCode || synth?.sectorCode || 'BẢO TÀNG VĂN HỌC VIỆT NAM';

  const mountMode = options.mountMode === 'wall' ? 'wall' : 'pedestal';
  const includeSpotLight = options.includeSpotLight !== false;
  const boardW = options.width ?? 1.56;
  const boardH = options.height ?? 1.16;
  const faceW = boardW - 0.20; // 1.36m -> tỷ lệ 4:3 khớp 1024x768
  const faceH = boardH - 0.14; // 1.02m

  const root = new THREE.Group();
  root.name = `Heritage_InfoPlaque_${plaqueId}`;

  const frameMat = styleTheme === 'da_reu_phong'
    ? getStoneMossFrameMaterial()
    : getWoodMaterial(themeMeta.woodTone);
  const bronzeMat = getBronzeMaterial(styleTheme === 'da_reu_phong');

  // =========================================================================
  // 1. CHÂN ĐẾ & KHUNG GIÁ ĐỠ TRUYỀN THỐNG (nếu mountMode === 'pedestal')
  // =========================================================================
  if (mountMode === 'pedestal') {
    const pedestalGroup = new THREE.Group();
    pedestalGroup.name = 'Plaque_Pedestal_Stand';

    // Bậc đế dưới chạm sàn tại y = 0 (cao 0.08m)
    const baseStep1 = new THREE.Mesh(
      getSharedGeometry('ped_base1', () => new THREE.BoxGeometry(1.24, 0.08, 0.64)),
      frameMat
    );
    baseStep1.position.set(0, 0.04, 0);
    pedestalGroup.add(baseStep1);

    // Bậc đế trên (cao 0.10m)
    const baseStep2 = new THREE.Mesh(
      getSharedGeometry('ped_base2', () => new THREE.BoxGeometry(1.06, 0.10, 0.50)),
      frameMat
    );
    baseStep2.position.set(0, 0.13, 0);
    pedestalGroup.add(baseStep2);

    // Chỉ viền đồng cổ chân đế
    const bronzePlinthTrim = new THREE.Mesh(
      getSharedGeometry('ped_bronze_trim', () => new THREE.BoxGeometry(0.94, 0.028, 0.38)),
      bronzeMat
    );
    bronzePlinthTrim.position.set(0, 0.194, 0);
    pedestalGroup.add(bronzePlinthTrim);

    // Hai trụ cột gỗ đứng đỡ bảng
    const pillarGeo = getSharedGeometry('ped_pillar', () => new THREE.BoxGeometry(0.11, 0.72, 0.14));
    const pillarCapGeo = getSharedGeometry('ped_pillar_cap', () => new THREE.BoxGeometry(0.15, 0.045, 0.18));
    [-0.42, 0.42].forEach((px) => {
      const pillar = new THREE.Mesh(pillarGeo, frameMat);
      pillar.position.set(px, 0.56, 0);
      pedestalGroup.add(pillar);

      const cap = new THREE.Mesh(pillarCapGeo, bronzeMat);
      cap.position.set(px, 0.23, 0);
      pedestalGroup.add(cap);
    });

    // Thanh giằng ngang chạm trổ
    const stretcher = new THREE.Mesh(
      getSharedGeometry('ped_stretcher', () => new THREE.BoxGeometry(0.84, 0.14, 0.08)),
      frameMat
    );
    stretcher.position.set(0, 0.48, 0);
    pedestalGroup.add(stretcher);

    const stretcherBronze = new THREE.Mesh(
      getSharedGeometry('ped_stretcher_bronze', () => new THREE.BoxGeometry(0.74, 0.04, 0.095)),
      bronzeMat
    );
    stretcherBronze.position.set(0, 0.48, 0);
    pedestalGroup.add(stretcherBronze);

    root.add(pedestalGroup);
  }

  // =========================================================================
  // 2. MẶT BẢNG CHÍNH, KHUNG CHẠM KHẮC, 4 CHỐT ĐỒNG & MÃO ĐÔNG SƠN
  // =========================================================================
  const boardPivot = new THREE.Group();
  boardPivot.name = 'Plaque_Board_Pivot';
  if (mountMode === 'pedestal') {
    boardPivot.position.set(0, 1.32, 0.02);
    boardPivot.rotation.x = -0.15; // Nghiêng nhẹ ~8.6° thuận tầm mắt người xem
  }

  // Tấm hậu gỗ quý
  const backingMesh = new THREE.Mesh(
    getSharedGeometry(`board_back_${boardW}_${boardH}`, () => new THREE.BoxGeometry(boardW, boardH, 0.072)),
    frameMat
  );
  backingMesh.name = 'Plaque_Wood_Backing';
  boardPivot.add(backingMesh);

  // 4 thanh khung gỗ chạm nổi tạo chiều sâu
  const railThickness = 0.095;
  const topBottomGeo = getSharedGeometry(
    `rail_tb_${boardW}`,
    () => new THREE.BoxGeometry(boardW + 0.04, railThickness, 0.095)
  );
  const leftRightGeo = getSharedGeometry(
    `rail_lr_${boardH}`,
    () => new THREE.BoxGeometry(railThickness, boardH - railThickness * 1.4, 0.095)
  );

  const topRail = new THREE.Mesh(topBottomGeo, frameMat);
  topRail.position.set(0, boardH * 0.5 - railThickness * 0.4, 0.015);
  const bottomRail = new THREE.Mesh(topBottomGeo, frameMat);
  bottomRail.position.set(0, -boardH * 0.5 + railThickness * 0.4, 0.015);
  const leftRail = new THREE.Mesh(leftRightGeo, frameMat);
  leftRail.position.set(-boardW * 0.5 + railThickness * 0.4, 0, 0.015);
  const rightRail = new THREE.Mesh(leftRightGeo, frameMat);
  rightRail.position.set(boardW * 0.5 - railThickness * 0.4, 0, 0.015);
  boardPivot.add(topRail, bottomRail, leftRail, rightRail);

  // Nẹp đồng cổ viền trong ôm sát mặt hiển thị
  const trimW = faceW + 0.045;
  const trimH = faceH + 0.045;
  const trimTBGeo = getSharedGeometry(`trim_tb_${trimW.toFixed(2)}`, () => new THREE.BoxGeometry(trimW, 0.024, 0.032));
  const trimLRGeo = getSharedGeometry(`trim_lr_${trimH.toFixed(2)}`, () => new THREE.BoxGeometry(0.024, trimH, 0.032));

  const trimTop = new THREE.Mesh(trimTBGeo, bronzeMat);
  trimTop.position.set(0, faceH * 0.5 + 0.012, 0.044);
  const trimBottom = new THREE.Mesh(trimTBGeo, bronzeMat);
  trimBottom.position.set(0, -faceH * 0.5 - 0.012, 0.044);
  const trimLeft = new THREE.Mesh(trimLRGeo, bronzeMat);
  trimLeft.position.set(-faceW * 0.5 - 0.012, 0, 0.044);
  const trimRight = new THREE.Mesh(trimLRGeo, bronzeMat);
  trimRight.position.set(faceW * 0.5 + 0.012, 0, 0.044);
  boardPivot.add(trimTop, trimBottom, trimLeft, trimRight);

  // 4 Chốt đồng nổi ở 4 góc + Mão bia Đông Sơn ở đỉnh bảng
  boardPivot.add(buildCornerBronzeBosses(boardW, boardH, bronzeMat));
  boardPivot.add(buildTraditionalTopCrest(boardH, frameMat, bronzeMat));

  // Mặt hiển thị CanvasTexture PBR (có emissiveMap dịu nhẹ giữ độ rõ chữ trong phòng tối)
  const faceTexture = getHeritagePlaqueCanvasTexture({
    title,
    author,
    years,
    historicalPeriod,
    subtitle,
    summary,
    styleTheme,
    badgeLabel,
    sectorCode
  });

  const faceMat = new THREE.MeshStandardMaterial({
    map: faceTexture,
    bumpMap: getSurfaceMicroBumpTexture(styleTheme),
    bumpScale: styleTheme === 'da_reu_phong' ? 0.008 : 0.003,
    roughness: styleTheme === 'lua_hoang_kim' ? 0.50 : (styleTheme === 'da_reu_phong' ? 0.84 : 0.72),
    metalness: styleTheme === 'lua_hoang_kim' ? 0.12 : 0.02,
    emissive: new THREE.Color(0xfff4d6),
    emissiveMap: faceTexture,
    emissiveIntensity: styleTheme === 'da_reu_phong' ? 0.22 : 0.26
  });

  const faceMesh = new THREE.Mesh(
    getSharedGeometry(`face_plane_${faceW.toFixed(2)}_${faceH.toFixed(2)}`, () => new THREE.PlaneGeometry(faceW, faceH)),
    faceMat
  );
  faceMesh.name = 'Plaque_Heritage_Face';
  faceMesh.position.set(0, 0, 0.040);
  boardPivot.add(faceMesh);

  // Neo tâm mặt bảng dùng tính focusPoint & focusNormal chuẩn xác
  const faceAnchor = new THREE.Object3D();
  faceAnchor.name = 'Plaque_Face_Focus_Anchor';
  faceAnchor.position.set(0, 0, 0.045);
  boardPivot.add(faceAnchor);

  // =========================================================================
  // 3. PROXY HITBOX VÔ HÌNH CHO RAYCASTER (userData.isPlaqueProxy = true)
  // =========================================================================
  const proxyGeo = getSharedGeometry(
    `plaque_proxy_${boardW.toFixed(2)}_${boardH.toFixed(2)}`,
    () => new THREE.BoxGeometry(boardW + 0.08, boardH + 0.14, 0.26)
  );
  const proxyMesh = new THREE.Mesh(proxyGeo, getSharedProxyMaterial());
  proxyMesh.name = `PlaqueProxy_${plaqueId}`;
  proxyMesh.position.set(0, 0.04, 0.04);
  boardPivot.add(proxyMesh);

  root.add(boardPivot);

  // =========================================================================
  // 4. ĐÈN SPOTLIGHT ẤM (#ffdf73) CHUYÊN BIỆT RỌI MẶT BẢNG
  // =========================================================================
  let spotLight = null;
  if (includeSpotLight) {
    spotLight = new THREE.SpotLight(0xffdf73, 3.2, 5.5, Math.PI / 4, 0.65, 1.5);
    spotLight.name = `Plaque_SpotLight_${plaqueId}`;
    spotLight.castShadow = false;
    spotLight.position.set(0, mountMode === 'pedestal' ? 2.52 : 1.18, 1.28);
    spotLight.target.position.set(0, mountMode === 'pedestal' ? 1.32 : 0.0, 0.04);
    spotLight.userData.ignoreRaycaster = true;
    spotLight.userData.isPlaqueSpotLight = true;
    spotLight.target.userData.ignoreRaycaster = true;
    spotLight.target.userData.isPlaqueSpotLight = true;
    root.add(spotLight);
    root.add(spotLight.target);
  }

  // =========================================================================
  // 5. GẮN CỜ RAYCASTER, LAYER 1 & METADATA ĐỒNG BỘ TỌA ĐỘ FOCUS
  // =========================================================================
  const _focusPointVec = new THREE.Vector3();
  const _focusNormalVec = new THREE.Vector3(0, 0, 1);
  const _focusQuat = new THREE.Quaternion();

  root.traverse((child) => {
    child.layers?.enable?.(1);
    child.userData.ignoreRaycaster = true;
    if (child.isMesh) {
      child.castShadow = false;
      child.receiveShadow = false;
      child.frustumCulled = true;
    }
  });

  // Chỉ proxyMesh nhận Raycast tương tác
  proxyMesh.userData = {
    isPlaqueProxy: true,
    isClickProxy: true,
    isLoreArtifact: true,
    ignoreRaycaster: false,
    loreKey,
    plaqueId,
    roomId,
    styleTheme,
    linkedVisualObject: root,
    onFocusCamera: typeof options.onFocusCamera === 'function' ? options.onFocusCamera : null,
    _focusPointVec,
    _focusNormalVec
  };

  const defineFocusGetters = (targetObj) => {
    Object.defineProperty(targetObj, 'focusPoint', {
      enumerable: true,
      configurable: true,
      get() {
        syncPlaqueWorldMetadata(root);
        return _focusPointVec;
      }
    });
    Object.defineProperty(targetObj, 'focusNormal', {
      enumerable: true,
      configurable: true,
      get() {
        syncPlaqueWorldMetadata(root);
        return _focusNormalVec;
      }
    });
  };

  defineFocusGetters(proxyMesh.userData);

  root.userData = {
    ...(root.userData || {}),
    isInfoPlaqueRoot: true,
    ignoreRaycaster: true,
    plaqueId,
    roomId,
    loreKey,
    styleTheme,
    mountMode,
    faceAnchor,
    plaqueProxy: proxyMesh,
    clickProxyHitbox: proxyMesh,
    spotLight,
    _focusPointVec,
    _focusNormalVec,
    _focusQuat,
    getFocusTransform: () => syncPlaqueWorldMetadata(root)
  };
  defineFocusGetters(root.userData);

  // Áp dụng vị trí / góc xoay / parent nếu được truyền trực tiếp
  if (options.position) {
    if (Array.isArray(options.position)) {
      root.position.set(options.position[0] || 0, options.position[1] || 0, options.position[2] || 0);
    } else {
      root.position.copy(options.position);
    }
  }
  if (typeof options.rotationY === 'number') {
    root.rotation.y = options.rotationY;
  }
  if (typeof options.scale === 'number') {
    root.scale.setScalar(options.scale);
  }
  if (options.parent && typeof options.parent.add === 'function') {
    options.parent.add(root);
  }

  syncPlaqueWorldMetadata(root);

  // Đăng ký tự động nếu người gọi truyền hitboxManager / loreGuide
  if (options.hitboxManager || options.loreGuide || options.autoRegister) {
    registerPlaqueWithSystems(root, {
      hitboxManager: options.hitboxManager,
      loreGuide: options.loreGuide,
      onFocusCamera: options.onFocusCamera,
      realm: options.realm || 'museum'
    });
  }

  // Hàm update nhẹ giữ tương thích vòng lặp animation nếu caller gọi
  root.update = () => {};

  return root;
}

/**
 * TẠO BẢNG THÔNG TIN TỰ ĐỘNG TỔNG HỢP THEO MÃ PHÒNG TRONG LITERATURE_REGISTRY
 */
export function createAutoSynthesizedRoomPlaque(roomId, options = {}) {
  const synth = getSynthesizedPlaqueLore(roomId);
  if (!synth) {
    return createRoomInfoPlaque({ ...options, roomId });
  }
  return createRoomInfoPlaque({
    roomId: synth.roomId,
    plaqueId: synth.plaqueId,
    loreKey: synth.loreKey,
    title: synth.title,
    author: synth.author,
    years: synth.years,
    historicalPeriod: synth.historicalPeriod,
    subtitle: synth.subtitle,
    summary: synth.summary,
    styleTheme: synth.styleTheme,
    badgeLabel: synth.badgeLabel,
    sectorCode: synth.sectorCode,
    ...options
  });
}

export default createRoomInfoPlaque;
