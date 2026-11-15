import * as THREE from 'three';
import { getRoomWorldPose } from '../config/literatureRegistry.js';

/**
 * ============================================================================
 * MUSEUM "THIÊN THƯ SỬ VIỆT" 3D BOOK & POP-UP HOLOGRAM ENGINE
 * TÂM ĐIỂM SẢNH CHÍNH BẢO TÀNG VĂN HỌC (GRAND LOBBY CENTERPIECE)
 * 
 * Tích hợp đầy đủ các kỹ năng di sản tối thượng:
 * 1. Kiến trúc Bệ đá cẩm thạch đen chạm hoa văn Trống đồng Đông Sơn (Mặt trời 14 tia,
 *    chim Lạc, hoa văn răng cưa, vòng tròn tiếp tuyến) + Đài Sen Vàng 16 cánh dát vàng.
 * 2. Cuốn Sách Khổ Lớn 3D: Bìa sơn son thếp vàng, gáy ngọc bích nẹp hoàng kim, hai trang
 *    Giấy Dó phát sáng lơ lửng và nhấp nhô nhịp nhàng theo Math.sin(time).
 * 3. Cột sáng Volumetric God Rays vàng kim rọi thẳng từ mặt sách lên giếng trời trần vòm 32m.
 * 4. Hệ thống hạt THREE.Points ký tự Quốc ngữ & chữ Nôm cổ phát sáng bay xoắn ốc phễu lên trần.
 * 5. Cơ chế click lật trang mép trái/phải (ThienThu_Left_Page_Mesh, ThienThu_Right_Page_Mesh)
 *    chuyển đổi 4 Chương kèm âm thanh sột soạt lật giấy cổ (WebAudio synthesizer).
 * 6. Mô hình nổi Pop-up 3D Hologram cho 4 Chương:
 *    - Khai Từ: Đóa sen vàng 3D nở rộ tỏa hào quang
 *    - Chương I: Tre đằng ngà, ngựa sắt phun lửa và sóng nước Như Nguyệt
 *    - Chương II: Đèn dầu lay lắt, bóng Vũ Nương cô đơn & khói sông Hoàng Giang ánh ngọc
 *    - Chương III: Hàng cau nắng mai, thuyền chở trăng xứ Huế & mái tranh nghèo Tắt Đèn
 * 7. Nút Ấn Triện Đỏ "Du Ngoạn Tự Động" (ThienThu_Royal_AutoTour_Seal) kích hoạt window.__autoTour.toggleTour().
 * 8. Camera Smooth Zoom nghiêng 45 độ hoàn hảo khi click vào trang sách.
 * 9. Điều hướng nhanh ưu tiên window.enterRealm() cho từng tác phẩm.
 * 10. Âm thanh 3D PositionalAudio tiếng đàn bầu / nhã nhạc cung đình (procedural fallback).
 * 11. Box3 Collider cản va chạm xung quanh bệ sách (Center_Heritage_Book_Platform &
 *     ThienThu_SuViet_CentralPedestal_SolidHitbox).
 * 12. Tối ưu 60+ FPS: userData.ignoreRaycaster = true trên toàn bộ particle, god rays, và hiệu ứng.
 * ============================================================================
 */

// Cache Canvas Texture để tiết kiệm tài nguyên bộ nhớ
const THIEN_THU_TEX_CACHE = {};

function getCachedCanvasTexture(key, width, height, drawFn) {
  if (THIEN_THU_TEX_CACHE[key]) return THIEN_THU_TEX_CACHE[key];
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, width, height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  if ('colorSpace' in tex && THREE.SRGBColorSpace) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  THIEN_THU_TEX_CACHE[key] = tex;
  return tex;
}

/**
 * ============================================================================
 * BỘ TỔNG HỢP ÂM THANH LẬT GIẤY CỔ (WEB AUDIO VINTAGE PARCHMENT SYNTHESIZER)
 * ============================================================================
 */
export function playVintagePageTurnSound() {
  if (typeof window === 'undefined') return;
  try {
    const audioCtx = window.__audioManager?.context ||
                     (window.AudioContext ? new (window.AudioContext || window.webkitAudioContext)() : null);
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const now = audioCtx.currentTime;
    const duration = 0.32;
    const bufferSize = Math.floor(audioCtx.sampleRate * duration);
    const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const t = i / bufferSize;
      // Đường bao ma sát bề mặt thô ráp của Giấy Dó cổ truyền
      const envelope = Math.sin(t * Math.PI) * (1.0 - t * 0.35);
      data[i] = (Math.random() * 2 - 1) * envelope;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1550, now);
    filter.frequency.exponentialRampToValueAtTime(680, now + duration);
    filter.Q.setValueAtTime(2.4, now);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    noise.start(now);
    noise.stop(now + duration);
  } catch (err) {
    console.warn('[ThienThuAudio] Vintage page turn sound fallback:', err);
  }
}

/**
 * ============================================================================
 * BỘ TỔNG HỢP ÂM THANH ĐÀN BẦU / NHÃ NHẠC CUNG ĐÌNH NGŨ CUNG PROCEDURAL
 * Thang âm ngũ cung Hò - Xự - Xang - Xê - Cống với vibrato và luyến láy
 * ============================================================================
 */
export function generateDanBauProceduralBuffer(audioCtx, durationSec = 12.0) {
  const sampleRate = audioCtx.sampleRate || 44100;
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = audioCtx.createBuffer(1, numSamples, sampleRate);
  const data = buffer.getChannelData(0);

  // Giai điệu ngũ cung truyền thống Việt Nam:
  // D4 (293.66Hz), F4 (349.23Hz), G4 (392.00Hz), A4 (440.00Hz), C5 (523.25Hz), D5 (587.33Hz)
  const notes = [
    { freq: 293.66, start: 0.0, dur: 2.2 },  // Hò (D4)
    { freq: 349.23, start: 2.0, dur: 2.0 },  // Xự (F4)
    { freq: 392.00, start: 3.8, dur: 2.4 },  // Xang (G4)
    { freq: 440.00, start: 6.0, dur: 2.2 },  // Xê (A4)
    { freq: 523.25, start: 8.0, dur: 1.8 },  // Cống (C5)
    { freq: 392.00, start: 9.6, dur: 2.4 }   // Về Xang (G4)
  ];

  for (let n = 0; n < notes.length; n++) {
    const note = notes[n];
    const startSample = Math.floor(note.start * sampleRate);
    const noteSampleCount = Math.floor(note.dur * sampleRate);
    const endSample = Math.min(numSamples, startSample + noteSampleCount);

    for (let s = startSample; s < endSample; s++) {
      const t = (s - startSample) / sampleRate;
      const progress = (s - startSample) / noteSampleCount;

      // Độ rung & uốn cần đàn bầu (Dan Bau glissando & microtonal vibrato)
      const vibrato = Math.sin(t * 11.5) * 0.016;
      const bend = Math.sin(progress * Math.PI) * 0.022;
      const currentFreq = note.freq * (1.0 + vibrato + bend);

      // Phổ sóng hài đàn bầu độc huyền cầm (Fundamental + 2nd, 3rd, 4th harmonics)
      const phase = 2 * Math.PI * currentFreq * t;
      const h1 = Math.sin(phase) * 0.65;
      const h2 = Math.sin(phase * 2) * 0.24;
      const h3 = Math.sin(phase * 3) * 0.12;
      const h4 = Math.sin(phase * 4) * 0.05;
      const timbre = h1 + h2 + h3 + h4;

      // Đường bao gảy đàn bầu (Pluck attack nhanh, ngân dài thanh tao)
      const attackTime = 0.035;
      let amp = 0;
      if (t < attackTime) {
        amp = t / attackTime;
      } else {
        amp = Math.exp(-(t - attackTime) * 1.65);
      }

      data[s] += timbre * amp * 0.35;
    }
  }

  // Crossfade hai đầu mút để loop không bị giật tiếng
  const fadeSamples = Math.floor(sampleRate * 0.12);
  for (let i = 0; i < fadeSamples; i++) {
    const fade = i / fadeSamples;
    data[i] *= fade;
    data[numSamples - 1 - i] *= fade;
  }

  return buffer;
}

/**
 * ============================================================================
 * DỮ LIỆU NỘI DUNG 4 CHƯƠNG CỦA THIÊN THƯ SỬ VIỆT
 * ============================================================================
 */
export const THIEN_THU_CHAPTERS = [
  {
    chapterIndex: 0,
    title: 'KHAI TỪ',
    subtitle: 'THÁNH ĐƯỜNG VĂN HỌC',
    bannerText: 'THÁNH ĐƯỜNG VĂN HỌC',
    quoteLeft: [
      '❖ THÁNH ĐƯỜNG VĂN HỌC',
      'Trăm năm bia đá thì mòn,',
      'Ngàn năm bia miệng vẫn còn trơ trơ.',
      'Nơi lưu giữ hồn cốt non sông',
      'qua từng trang viết di sản.'
    ],
    quoteRight: [
      '❖ HỒN CỐT NON SÔNG',
      'Hội tụ tinh hoa các kiệt tác ngàn năm,',
      'từ huyền tích mở cõi dựng non sông',
      'đến bản tuyên ngôn quật cường bất khuất,',
      'tiếng lòng nhân đạo & khát vọng',
      'tự do muôn thuở của đất Việt.'
    ],
    hologramType: 'LOTUS_BLOSSOM',
    buttons: []
  },
  {
    chapterIndex: 1,
    title: 'CHƯƠNG I',
    subtitle: 'HÀO KHÍ NGÀN NĂM',
    bannerText: 'HÀO KHÍ NON SÔNG',
    quoteLeft: [
      '❖ THÁNH GIÓNG (DÂN GIAN)',
      'Ngựa sắt phun lửa thấu trời xanh,',
      'Tre đằng ngà quất tan giặc dữ.',
      'Áo giáp bay về trời thanh tịnh,',
      'Để lại non sông thái bình ca.'
    ],
    quoteRight: [
      '❖ NAM QUỐC SƠN HÀ (1077)',
      'Nam quốc sơn hà Nam đế cư,',
      'Tiệt nhiên định phận tại thiên thư.',
      'Như hà nghịch lỗ lai xâm phạm,',
      'Nhữ đẳng hành khan thủ bại hư!'
    ],
    hologramType: 'HEROIC_BAMBOO_HORSE',
    buttons: [
      { id: 'btn_thanh_giong', text: '⚔️ Thánh Gióng', target: 'thanh_giong', realm: 'thanhgiong' },
      { id: 'btn_an_duong_vuong', text: '🏹 Du hành Cõi Âu Lạc – Thành Cổ Loa', target: 'an_duong_vuong', realm: 'an_duong_vuong' },
      { id: 'btn_nam_quoc', text: '📜 Nam Quốc Sơn Hà', target: 'nam_quoc_son_ha', realm: 'namquocsonha' }
    ]
  },
  {
    chapterIndex: 2,
    title: 'CHƯƠNG II',
    subtitle: 'TIẾNG LÒNG NHÂN ĐẠO',
    bannerText: 'TIẾNG LÒNG NHÂN ĐẠO',
    quoteLeft: [
      '❖ NGƯỜI CON GÁI NAM XƯƠNG',
      'Ngọn đèn dầu hắt bóng vách nứa,',
      'Chiếc bóng oan khiên lệ thắm dòng.',
      'Hoàng Giang một dải ngọc biếc trong,',
      'Chứng cho tiết liệt dạ tấc lòng.'
    ],
    quoteRight: [
      '❖ NGUYỄN DỮ • THẾ KỶ XVI',
      'Tiếng kêu thương cho thân phận',
      'người phụ nữ đức hạnh chịu nỗi oan khiên.',
      'Chiếc trâm ngọc bích lấp lánh đáy sông,',
      'ngàn thu khát vọng đoàn tụ vẹn tròn.'
    ],
    hologramType: 'NAM_XUONG_LAMP_RIVER',
    buttons: [
      { id: 'btn_nam_xuong', text: '🌊 Bước vào cõi Nam Xương', target: 'nguoi_con_gai_nam_xuong', realm: 'nguoi_con_gai_nam_xuong' }
    ]
  },
  {
    chapterIndex: 3,
    title: 'CHƯƠNG III',
    subtitle: 'ÁNH TRĂNG & BÓNG TỐI',
    bannerText: 'ÁNH TRĂNG & BÓNG TỐI',
    quoteLeft: [
      '❖ ĐÂY THÔN VĨ DẠ (HÀN MẶC TỬ)',
      '“Sao anh không về chơi thôn Vĩ?',
      'Nhìn nắng hàng cau nắng mới lên...',
      'Thuyền ai đậu bến sông trăng đó,',
      'Có chở trăng về kịp tối nay?”'
    ],
    quoteRight: [
      '❖ TẮT ĐÈN (NGÔ TẤT TỐ)',
      'Đêm đen như mực của làng Đông Xá,',
      'Ngọn lửa quật khởi bừng cháy nơi Chị Dậu.',
      'Tiếng thét đòi quyền sống làm rung chuyển',
      'bức màn tăm tối của xã hội thực dân.'
    ],
    hologramType: 'MOON_AND_SHADOW',
    buttons: [
      { id: 'btn_thon_vi_da', text: '🌙 Dạo bước Thôn Vĩ Dạ', target: 'day_thon_vi_da', realm: 'day_thon_vi_da' },
      { id: 'btn_tat_den', text: '🏮 Tham quan phòng Tắt Đèn', target: 'tat_den', realm: 'tat_den' }
    ]
  }
];

/**
 * ============================================================================
 * TẠO TEXTURE TRANG GIẤY DÓ PHÁT SÁNG CHO TỪNG CHƯƠNG
 * ============================================================================
 */
function createDoPaperPageTexture(chapter, isLeft = true) {
  const cacheKey = `thien_thu_chapter_${chapter.chapterIndex}_${isLeft ? 'L' : 'R'}_v2`;
  return getCachedCanvasTexture(cacheKey, 1024, 1024, (ctx, w, h) => {
    // 1. Nền Giấy Dó cổ truyền nhuốm màu thời gian hoàng kim ấm áp
    const bg = ctx.createRadialGradient(w / 2, h / 2, 70, w / 2, h / 2, w * 0.74);
    bg.addColorStop(0.0, '#fdf8ec');
    bg.addColorStop(0.55, '#f7eed4');
    bg.addColorStop(0.85, '#e9d7aa');
    bg.addColorStop(1.0, '#d3bc89');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // 2. Vân xơ sợi Giấy Dó tự nhiên
    ctx.fillStyle = 'rgba(161, 98, 7, 0.04)';
    for (let f = 0; f < 350; f++) {
      const fx = Math.random() * w;
      const fy = Math.random() * h;
      const fl = 10 + Math.random() * 32;
      ctx.fillRect(fx, fy, fl, 1.5);
    }

    // 3. Khung viền hồi văn chữ S & kỷ hà dát vàng hoàng kim
    ctx.strokeStyle = '#92400e';
    ctx.lineWidth = 14;
    ctx.strokeRect(36, 36, w - 72, h - 72);

    ctx.strokeStyle = '#d97706';
    ctx.lineWidth = 4;
    ctx.strokeRect(58, 58, w - 116, h - 116);

    // Họa tiết góc mây cuốn
    const cornerSize = 56;
    ctx.fillStyle = 'rgba(217, 119, 6, 0.28)';
    ctx.fillRect(36, 36, cornerSize, cornerSize);
    ctx.fillRect(w - 36 - cornerSize, 36, cornerSize, cornerSize);
    ctx.fillRect(36, h - 36 - cornerSize, cornerSize, cornerSize);
    ctx.fillRect(w - 36 - cornerSize, h - 36 - cornerSize, cornerSize, cornerSize);

    // 4. Header: Tên sách & Chương
    ctx.textAlign = 'center';
    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 34px "Times New Roman", serif';
    ctx.fillText('❖ THIÊN THƯ SỬ VIỆT ❖', w / 2, 115);

    ctx.fillStyle = '#b45309';
    ctx.font = 'bold 44px "Times New Roman", serif';
    ctx.fillText(chapter.title, w / 2, 175);

    ctx.fillStyle = '#92400e';
    ctx.font = 'italic bold 26px "Times New Roman", serif';
    ctx.fillText(chapter.subtitle, w / 2, 225);

    // Đường kẻ phân cách thư pháp
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(w * 0.18, 248);
    ctx.lineTo(w * 0.82, 248);
    ctx.stroke();

    // 5. Nội dung văn chương
    const quotes = isLeft ? chapter.quoteLeft : chapter.quoteRight;
    ctx.fillStyle = '#451a03';
    ctx.font = 'bold 30px "Times New Roman", serif';
    ctx.textAlign = 'left';

    const startX = 85;
    let startY = 320;
    quotes.forEach((line) => {
      if (line.startsWith('❖')) {
        ctx.fillStyle = '#b91c1c';
        ctx.font = 'bold 32px "Times New Roman", serif';
        ctx.fillText(line, startX, startY);
        startY += 52;
        ctx.fillStyle = '#451a03';
        ctx.font = '28px "Times New Roman", serif';
      } else {
        ctx.fillText(line, startX, startY);
        startY += 48;
      }
    });

    // Các dòng kẻ chỉ dẫn trang sách cổ
    ctx.strokeStyle = 'rgba(180, 83, 9, 0.2)';
    ctx.lineWidth = 1.5;
    for (let r = 0; r < 5; r++) {
      const y = startY + r * 44;
      if (y < h - 140) {
        ctx.beginPath();
        ctx.moveTo(85, y);
        ctx.lineTo(w - 85, y);
        ctx.stroke();
      }
    }

    // 6. Số trang & Mép lật trang
    ctx.fillStyle = '#92400e';
    ctx.font = 'bold 22px "Times New Roman", serif';
    ctx.textAlign = 'center';
    const pageNum = isLeft ? chapter.chapterIndex * 2 + 1 : chapter.chapterIndex * 2 + 2;
    ctx.fillText(`— Trang ${pageNum} / 8 —`, w / 2, h - 80);

    // Con dấu son góc trang phải
    if (!isLeft) {
      ctx.strokeStyle = '#b91c1c';
      ctx.lineWidth = 5;
      ctx.strokeRect(w - 200, h - 210, 110, 110);
      ctx.fillStyle = 'rgba(185, 28, 28, 0.9)';
      ctx.font = 'bold 24px "Times New Roman", serif';
      ctx.fillText('THIÊN', w - 145, h - 165);
      ctx.fillText('THƯ', w - 145, h - 128);
    }
  });
}

/**
 * ============================================================================
 * TẠO TEXTURE BÌA SƠN SON THẾP VÀNG
 * ============================================================================
 */
function createLacqueredBookCoverTexture() {
  return getCachedCanvasTexture('thien_thu_book_cover_v2', 512, 512, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0.0, '#4a0808');
    bg.addColorStop(0.5, '#7f1d1d');
    bg.addColorStop(1.0, '#380505');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Viền dát vàng hoàng kim
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 16;
    ctx.strokeRect(16, 16, w - 32, h - 32);

    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 4;
    ctx.strokeRect(36, 36, w - 72, h - 72);

    // Họa tiết hoa cúc đại đóa dát vàng hoàng gia
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 48, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Các cánh hoa cúc
    const petals = 16;
    for (let p = 0; p < petals; p++) {
      const ang = (p / petals) * Math.PI * 2;
      const px = w / 2 + Math.cos(ang) * 65;
      const py = h / 2 + Math.sin(ang) * 65;
      ctx.beginPath();
      ctx.arc(px, py, 14, 0, Math.PI * 2);
      ctx.fillStyle = '#fde047';
      ctx.fill();
      ctx.stroke();
    }
  });
}

/**
 * ============================================================================
 * TẠO HOA VĂN THÂN TRỐNG ĐỒNG ĐÔNG SƠN (DẢI CHU VI CYLINDER)
 * ============================================================================
 */
function createDongSonDrumSideTexture() {
  return getCachedCanvasTexture('dong_son_drum_side_v2', 1024, 256, (ctx, w, h) => {
    // 1. Nền đồng cổ thẫm màu thời gian
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#1c1524');
    bg.addColorStop(0.5, '#261b32');
    bg.addColorStop(1, '#150f1c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // 2. Viền vàng hoàng kim trên và dưới
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.strokeRect(0, 4, w, h - 8);

    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 14, w, h - 28);

    // 3. Dải hoa văn răng cưa (Sawtooth band)
    ctx.fillStyle = '#fde047';
    const toothW = 16;
    for (let x = 0; x < w; x += toothW) {
      ctx.beginPath();
      ctx.moveTo(x, 24);
      ctx.lineTo(x + toothW / 2, 42);
      ctx.lineTo(x + toothW, 24);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(x, h - 24);
      ctx.lineTo(x + toothW / 2, h - 42);
      ctx.lineTo(x + toothW, h - 24);
      ctx.fill();
    }

    // 4. Dải Chim Lạc tung cánh bay (Lạc Bird frieze)
    const birdCount = 14;
    const birdSpacing = w / birdCount;
    ctx.strokeStyle = '#facc15';
    ctx.fillStyle = '#fef08a';
    ctx.lineWidth = 2.5;

    for (let b = 0; b < birdCount; b++) {
      const bx = b * birdSpacing + 20;
      const by = h / 2;

      ctx.beginPath();
      // Mỏ dài & đầu
      ctx.moveTo(bx + 40, by - 6);
      ctx.lineTo(bx + 15, by);
      // Mào dài vuốt ngược
      ctx.quadraticCurveTo(bx + 35, by - 22, bx + 55, by - 28);
      // Cánh sải dài vươn cao
      ctx.moveTo(bx + 20, by - 2);
      ctx.quadraticCurveTo(bx + 30, by - 36, bx + 10, by - 44);
      ctx.quadraticCurveTo(bx + 5, by - 26, bx + 16, by - 4);
      // Thân chim & đuôi xòe dài
      ctx.quadraticCurveTo(bx - 15, by + 10, bx - 35, by + 14);
      ctx.stroke();

      // Mắt chim
      ctx.beginPath();
      ctx.arc(bx + 18, by - 3, 2, 0, Math.PI * 2);
      ctx.fill();

      // Hoa văn chấm tròn đồng tâm có tiếp tuyến giữa các chú chim Lạc
      const dotX = bx + birdSpacing * 0.65;
      ctx.beginPath();
      ctx.arc(dotX, by, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(dotX, by, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/**
 * ============================================================================
 * TẠO HOA VĂN MẶT TRỐNG ĐỒNG ĐÔNG SƠN (MẶT TRỜI 14 TIA, CHIM LẠC & VÒNG TRÒN)
 * ============================================================================
 */
function createDongSonDrumTopTexture() {
  return getCachedCanvasTexture('dong_son_drum_top_v2', 1024, 1024, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    // 1. Nền đồng patin cổ kính
    const bg = ctx.createRadialGradient(cx, cy, 50, cx, cy, w * 0.5);
    bg.addColorStop(0, '#2c1e38');
    bg.addColorStop(0.65, '#1e1428');
    bg.addColorStop(1, '#110b17');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // 2. Vành tròn đồng tâm dát vàng
    const rings = [65, 110, 160, 230, 310, 390, 460, 490];
    ctx.strokeStyle = '#eab308';
    rings.forEach((r, idx) => {
      ctx.lineWidth = idx % 2 === 0 ? 3 : 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    });

    // 3. Ngôi sao mặt trời 14 tia sáng ở tâm (14-pointed Sun Star)
    ctx.fillStyle = '#fde047';
    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2;
    const rays = 14;
    const innerR = 26;
    const outerR = 64;

    ctx.beginPath();
    for (let i = 0; i < rays * 2; i++) {
      const angle = (i * Math.PI) / rays - Math.PI / 2;
      const r = i % 2 === 0 ? outerR : innerR;
      const rx = cx + Math.cos(angle) * r;
      const ry = cy + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(rx, ry);
      else ctx.lineTo(rx, ry);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Họa tiết lông công / tam giác giữa các tia nắng
    for (let i = 0; i < rays; i++) {
      const angle = ((i * 2 + 1) * Math.PI) / rays - Math.PI / 2;
      const fx = cx + Math.cos(angle) * 42;
      const fy = cy + Math.sin(angle) * 42;
      ctx.beginPath();
      ctx.arc(fx, fy, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4. Vành 14 Chim Lạc bay ngược chiều kim đồng hồ
    const birdR = 270;
    const birdCount = 14;
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 2.5;

    for (let b = 0; b < birdCount; b++) {
      const bAng = -(b / birdCount) * Math.PI * 2;
      ctx.save();
      ctx.translate(cx + Math.cos(bAng) * birdR, cy + Math.sin(bAng) * birdR);
      ctx.rotate(bAng + Math.PI / 2);

      ctx.beginPath();
      // Mỏ dài & đầu
      ctx.moveTo(35, -5);
      ctx.lineTo(12, 0);
      // Mào dài
      ctx.quadraticCurveTo(28, -18, 45, -22);
      // Cánh sải
      ctx.moveTo(15, -2);
      ctx.quadraticCurveTo(25, -30, 8, -38);
      ctx.quadraticCurveTo(4, -20, 12, -3);
      // Thân & đuôi dài
      ctx.quadraticCurveTo(-10, 8, -30, 12);
      ctx.stroke();

      ctx.restore();
    }

    // 5. Vành ngoài: Hồi văn kỷ hà & hoa văn răng cưa
    ctx.fillStyle = '#facc15';
    const outerRingR = 425;
    const numTeeth = 72;
    for (let t = 0; t < numTeeth; t++) {
      const tAng = (t / numTeeth) * Math.PI * 2;
      const tx = cx + Math.cos(tAng) * outerRingR;
      const ty = cy + Math.sin(tAng) * outerRingR;
      ctx.beginPath();
      ctx.arc(tx, ty, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/**
 * ============================================================================
 * TẠO TEXTURE ẤN TRIỆN ĐỎ "DU NGOẠN TỰ ĐỘNG"
 * ============================================================================
 */
function createRoyalAutoTourSealTexture() {
  return getCachedCanvasTexture('thien_thu_royal_seal_v2', 256, 256, (ctx, w, h) => {
    // Con dấu vuông màu son đỏ son
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(10, 10, w - 20, h - 20);

    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 8;
    ctx.strokeRect(18, 18, w - 36, h - 36);

    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 2;
    ctx.strokeRect(28, 28, w - 56, h - 56);

    // Chữ triện thư
    ctx.fillStyle = '#fff1f2';
    ctx.textAlign = 'center';
    ctx.font = 'bold 36px "Times New Roman", serif';
    ctx.fillText('DU', w / 2, 75);
    ctx.fillText('NGOẠN', w / 2, 125);
    ctx.fillText('TỰ ĐỘNG', w / 2, 175);

    ctx.font = 'bold 18px sans-serif';
    ctx.fillStyle = '#fef08a';
    ctx.fillText('★ AUTO TOUR ★', w / 2, 215);
  });
}

/**
 * ============================================================================
 * DỰNG BỆ ĐÁ TRÒN CHẠM NỔI HOA VĂN TRỐNG ĐỒNG ĐÔNG SƠN & ĐÀI SEN VÀNG 16 CÁNH
 * ============================================================================
 */
function createDongSonLotusPedestal() {
  const pedestalGroup = new THREE.Group();
  pedestalGroup.name = 'ThienThu_DongSon_Lotus_Pedestal';

  // 1. Tầng đá cẩm thạch đen đế lớn R=4.4m, cao 0.35m
  const baseStoneGeo = new THREE.CylinderGeometry(4.4, 4.6, 0.35, 32);
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x140f1a,
    roughness: 0.32,
    metalness: 0.45,
    side: THREE.FrontSide
  });
  const baseStone = new THREE.Mesh(baseStoneGeo, stoneMat);
  baseStone.position.y = 0.175;
  baseStone.userData.ignoreRaycaster = true;
  pedestalGroup.add(baseStone);

  // Vòng viền vàng đế lớn
  const baseRimGeo = new THREE.TorusGeometry(4.42, 0.05, 8, 36);
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.22,
    metalness: 0.88,
    side: THREE.FrontSide
  });
  const baseRim = new THREE.Mesh(baseRimGeo, goldMat);
  baseRim.rotation.x = Math.PI / 2;
  baseRim.position.y = 0.35;
  baseRim.userData.ignoreRaycaster = true;
  pedestalGroup.add(baseRim);

  // 2. Tầng giữa R=3.8m, cao 0.45m chạm nổi hoa văn Trống Đồng Đông Sơn
  const drumGeo = new THREE.CylinderGeometry(3.7, 3.8, 0.45, 32);
  const drumMat = new THREE.MeshStandardMaterial({
    map: createDongSonDrumSideTexture(),
    roughness: 0.38,
    metalness: 0.55,
    side: THREE.FrontSide
  });
  const drumMesh = new THREE.Mesh(drumGeo, drumMat);
  drumMesh.position.y = 0.35 + 0.225;
  drumMesh.userData.ignoreRaycaster = true;
  pedestalGroup.add(drumMesh);

  // Mặt Trống Đồng tròn hoa văn Mặt trời 14 tia & Chim Lạc trên đỉnh bệ đá
  const drumTopGeo = new THREE.CircleGeometry(3.68, 48);
  const drumTopMat = new THREE.MeshStandardMaterial({
    map: createDongSonDrumTopTexture(),
    roughness: 0.32,
    metalness: 0.65,
    side: THREE.FrontSide
  });
  const drumTopMesh = new THREE.Mesh(drumTopGeo, drumTopMat);
  drumTopMesh.rotation.x = -Math.PI / 2;
  drumTopMesh.position.y = 0.35 + 0.45 + 0.002;
  drumTopMesh.userData.ignoreRaycaster = true;
  pedestalGroup.add(drumTopMesh);

  // 3. ĐÀI SEN VÀNG 16 CÁNH NÂNG ĐỠ CUỐN SÁCH (GOLDEN LOTUS PLINTH)
  const lotusRingGroup = new THREE.Group();
  lotusRingGroup.name = 'Golden_Lotus_Petal_Ring';
  lotusRingGroup.position.y = 0.80;

  const petalCount = 16;
  const petalR = 3.65;
  const petalShape = new THREE.Shape();
  petalShape.moveTo(0, 0);
  petalShape.quadraticCurveTo(0.35, 0.3, 0.25, 0.75);
  petalShape.quadraticCurveTo(0, 1.1, -0.25, 0.75);
  petalShape.quadraticCurveTo(-0.35, 0.3, 0, 0);

  const extrudeSettings = {
    steps: 1,
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2
  };
  const petalGeo = new THREE.ExtrudeGeometry(petalShape, extrudeSettings);
  petalGeo.center();

  const petalMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.22,
    metalness: 0.85,
    emissive: 0x78350f,
    emissiveIntensity: 0.25,
    side: THREE.FrontSide
  });

  for (let i = 0; i < petalCount; i++) {
    const angle = (i / petalCount) * Math.PI * 2;
    const px = Math.cos(angle) * petalR;
    const pz = Math.sin(angle) * petalR;

    const petal = new THREE.Mesh(petalGeo, petalMat);
    petal.position.set(px, 0.15, pz);
    petal.rotation.y = -angle + Math.PI / 2;
    petal.rotation.x = 0.42; // Cánh sen xòe nghiêng ra ngoài duyên dáng
    petal.scale.set(1.4, 1.2, 1.2);
    petal.userData.ignoreRaycaster = true;
    lotusRingGroup.add(petal);
  }

  // Nhụy sen vàng trung tâm
  const lotusCenterGeo = new THREE.CylinderGeometry(3.3, 3.4, 0.20, 24);
  const centerMesh = new THREE.Mesh(lotusCenterGeo, goldMat);
  centerMesh.position.y = 0.10;
  centerMesh.userData.ignoreRaycaster = true;
  lotusRingGroup.add(centerMesh);

  pedestalGroup.add(lotusRingGroup);
  pedestalGroup.userData.topY = 0.95;

  return pedestalGroup;
}

/**
 * ============================================================================
 * CỘT SÁNG VOLUMETRIC GOD RAYS VÀNG KIM TỪ MẶT SÁCH LÊN GIẾNG TRỜI THÔNG TẦNG (10.2M)
 * Chuẩn hóa khớp chính xác trần giếng trời Atrium, TUYỆT ĐỐI không đâm xuyên mái ngói
 * ============================================================================
 */
function createVolumetricGodRays() {
  const godRayGroup = new THREE.Group();
  godRayGroup.name = 'ThienThu_Volumetric_GodRays';
  godRayGroup.userData.ignoreRaycaster = true;

  // Hình nón cụt mở rộng từ mặt sách (Y=1.8m) lên trần giếng trời 10.2m (chiều cao h = 8.4m)
  const rayHeight = 8.4;
  const coneGeo = new THREE.CylinderGeometry(3.6, 1.8, rayHeight, 32, 1, true);
  const godRayMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.18,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const coneMesh = new THREE.Mesh(coneGeo, godRayMat);
  coneMesh.position.y = 1.8 + rayHeight * 0.5; // Tâm ở Y = 6.0m, đỉnh ở 10.2m (sát trần gỗ)
  coneMesh.userData.ignoreRaycaster = true;
  godRayGroup.add(coneMesh);

  // Lõi sáng hẹp bên trong rực rỡ hơn
  const innerConeGeo = new THREE.CylinderGeometry(1.8, 0.9, rayHeight, 24, 1, true);
  const innerMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const innerMesh = new THREE.Mesh(innerConeGeo, innerMat);
  innerMesh.position.y = coneMesh.position.y;
  innerMesh.userData.ignoreRaycaster = true;
  godRayGroup.add(innerMesh);

  godRayGroup.userData.update = (timeSec) => {
    coneMesh.rotation.y = timeSec * 0.06;
    innerMesh.rotation.y = -timeSec * 0.09;
    godRayMat.opacity = 0.15 + Math.sin(timeSec * 1.8) * 0.04;
    innerMat.opacity = 0.22 + Math.cos(timeSec * 2.2) * 0.05;
  };

  return godRayGroup;
}

/**
 * ============================================================================
 * HỆ THỐNG HẠT THREE.POINTS BAY XOẮN ỐC MÔ PHỎNG KÝ TỰ QUỐC NGỮ & CHỮ NÔM PHÁT SÁNG
 * ============================================================================
 */
function createSpiralLetterParticles() {
  const particleCount = 420;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const speeds = new Float32Array(particleCount);
  const initialAngles = new Float32Array(particleCount);
  const radii = new Float32Array(particleCount);

  const colorPalette = [
    new THREE.Color(0xfef08a), // Vàng kim sáng
    new THREE.Color(0xfbbf24), // Hổ phách
    new THREE.Color(0x34d399), // Ngọc bích
    new THREE.Color(0xf87171)  // Đỏ son
  ];

  for (let i = 0; i < particleCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 0.6 + Math.random() * 2.2;
    const y = 1.6 + Math.random() * 8.0; // Trong khoảng Y = 1.6m -> 9.6m dưới trần giếng trời

    positions[i * 3 + 0] = Math.cos(angle) * r;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(angle) * r;

    const col = colorPalette[i % colorPalette.length];
    colors[i * 3 + 0] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;

    speeds[i] = 0.8 + Math.random() * 1.4;
    initialAngles[i] = angle;
    radii[i] = r;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // Canvas Texture hình chữ cổ / ngôi sao phát sáng
  const tex = getCachedCanvasTexture('spiral_char_particle_tex_v2', 64, 64, (ctx, w, h) => {
    const rad = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    rad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    rad.addColorStop(0.35, 'rgba(253, 224, 71, 0.85)');
    rad.addColorStop(0.7, 'rgba(245, 158, 11, 0.4)');
    rad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, w, h);
  });

  const material = new THREE.PointsMaterial({
    size: 0.38,
    map: tex,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const pointsMesh = new THREE.Points(geometry, material);
  pointsMesh.name = 'ThienThu_Spiral_Letters';
  pointsMesh.userData.ignoreRaycaster = true;

  const posAttr = geometry.attributes.position;
  pointsMesh.userData.update = (timeSec) => {
    for (let i = 0; i < particleCount; i++) {
      let curY = positions[i * 3 + 1];
      curY += speeds[i] * 0.038;
      if (curY > 9.8) {
        curY = 1.6;
      }
      positions[i * 3 + 1] = curY;

      // Xoắn ốc quanh trục Y theo phễu mở rộng lên trần giếng trời 10.2m
      const currentAngle = initialAngles[i] + timeSec * (0.45 * speeds[i]);
      const currentR = radii[i] + ((curY - 1.6) / 8.4) * 1.5;
      positions[i * 3 + 0] = Math.cos(currentAngle) * currentR;
      positions[i * 3 + 2] = Math.sin(currentAngle) * currentR;
    }
    posAttr.needsUpdate = true;
  };

  return pointsMesh;
}

/**
 * ============================================================================
 * XÂY DỰNG 4 MÔ HÌNH NỔI POP-UP 3D HOLOGRAM CHO 4 CHƯƠNG
 * ============================================================================
 */
function createChapterHolograms() {
  const hologramRoot = new THREE.Group();
  hologramRoot.name = 'ThienThu_Chapter_Holograms_Root';
  hologramRoot.userData.ignoreRaycaster = true;

  const holoGroups = [];

  // --------------------------------------------------------------------------
  // 1. HOLOGRAM CHƯƠNG 0 (KHAI TỪ): ĐÓA SEN VÀNG NỞ RỘ & HÀO QUANG
  // --------------------------------------------------------------------------
  const holoLotus = new THREE.Group();
  holoLotus.name = 'Holo_Chapter0_GoldenLotus';
  holoLotus.userData.ignoreRaycaster = true;

  const lotusMat = new THREE.MeshBasicMaterial({
    color: 0xfde047,
    wireframe: true,
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending
  });

  // 16 cánh sen hologram vươn lên thành 2 tầng
  const petalGeoOuter = new THREE.ConeGeometry(0.35, 1.25, 5);
  for (let i = 0; i < 16; i++) {
    const ang = (i / 16) * Math.PI * 2;
    const pMesh = new THREE.Mesh(petalGeoOuter, lotusMat);
    pMesh.position.set(Math.cos(ang) * 0.75, 0.45, Math.sin(ang) * 0.75);
    pMesh.rotation.y = -ang;
    pMesh.rotation.z = 0.38;
    pMesh.userData.ignoreRaycaster = true;
    holoLotus.add(pMesh);
  }

  const petalGeoInner = new THREE.ConeGeometry(0.24, 0.85, 5);
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2 + 0.2;
    const pMesh = new THREE.Mesh(petalGeoInner, lotusMat);
    pMesh.position.set(Math.cos(ang) * 0.42, 0.52, Math.sin(ang) * 0.42);
    pMesh.rotation.y = -ang;
    pMesh.rotation.z = 0.22;
    pMesh.userData.ignoreRaycaster = true;
    holoLotus.add(pMesh);
  }

  // Nhụy sen phát sáng lân tinh
  const centerSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 16, 16),
    new THREE.MeshBasicMaterial({
      color: 0xffedd5,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending
    })
  );
  centerSphere.position.y = 0.62;
  centerSphere.userData.ignoreRaycaster = true;
  holoLotus.add(centerSphere);

  // Vòng hào quang tỏa sáng xung quanh hoa sen
  const haloMat = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
  const haloRing1 = new THREE.Mesh(new THREE.RingGeometry(0.85, 0.95, 24), haloMat);
  haloRing1.rotation.x = Math.PI / 2;
  haloRing1.position.y = 0.5;
  haloRing1.userData.ignoreRaycaster = true;

  const haloRing2 = new THREE.Mesh(new THREE.RingGeometry(1.15, 1.25, 24), haloMat);
  haloRing2.rotation.x = Math.PI / 2;
  haloRing2.position.y = 0.35;
  haloRing2.userData.ignoreRaycaster = true;
  holoLotus.add(haloRing1, haloRing2);

  holoLotus.position.set(0, 0.75, 0);
  hologramRoot.add(holoLotus);
  holoGroups[0] = holoLotus;

  // --------------------------------------------------------------------------
  // 2. HOLOGRAM CHƯƠNG I: RẶNG TRE ĐẰNG NGÀ, NGỰA SẮT RỰC LỬA & SÓNG NHƯ NGUYỆT
  // --------------------------------------------------------------------------
  const holoHeroic = new THREE.Group();
  holoHeroic.name = 'Holo_Chapter1_Heroic';
  holoHeroic.userData.ignoreRaycaster = true;

  // Rặng tre đằng ngà
  const bambooMat = new THREE.MeshBasicMaterial({
    color: 0xfacc15,
    wireframe: true,
    transparent: true,
    opacity: 0.72,
    blending: THREE.AdditiveBlending
  });
  for (let b = 0; b < 8; b++) {
    const bGeo = new THREE.CylinderGeometry(0.04, 0.05, 1.6 + (b % 4) * 0.25, 8);
    const bMesh = new THREE.Mesh(bGeo, bambooMat);
    bMesh.position.set(-1.45 + (b % 4) * 0.26, 0.85, -0.45 + Math.floor(b / 4) * 0.35);
    bMesh.rotation.z = (Math.random() - 0.5) * 0.16;
    bMesh.userData.ignoreRaycaster = true;
    holoHeroic.add(bMesh);
  }

  // Ngựa sắt rực lửa (Stylized Wireframe Horse Silhouette)
  const horseMat = new THREE.MeshBasicMaterial({
    color: 0xef4444,
    wireframe: true,
    transparent: true,
    opacity: 0.82,
    blending: THREE.AdditiveBlending
  });
  const horseBody = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.45, 1.1), horseMat);
  horseBody.position.set(0, 0.8, 0);
  horseBody.rotation.x = -0.32; // Chồm lên dũng mãnh
  const horseHead = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 6), horseMat);
  horseHead.position.set(0, 1.2, -0.45);
  horseHead.rotation.x = 0.5;

  // Lửa phun từ miệng ngựa sắt
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0xf97316,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending
  });
  const horseFlame = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.52, 6), flameMat);
  horseFlame.position.set(0, 1.35, -0.8);
  horseFlame.rotation.x = -Math.PI / 2.5;

  horseBody.userData.ignoreRaycaster = true;
  horseHead.userData.ignoreRaycaster = true;
  horseFlame.userData.ignoreRaycaster = true;
  holoHeroic.add(horseBody, horseHead, horseFlame);

  // Sóng sông Như Nguyệt
  const waveMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
    transparent: true,
    opacity: 0.68,
    blending: THREE.AdditiveBlending
  });
  const waveMesh1 = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2, 12, 6), waveMat);
  waveMesh1.rotation.x = -Math.PI / 2.3;
  waveMesh1.position.set(1.15, 0.35, 0.2);
  waveMesh1.userData.ignoreRaycaster = true;

  const waveMesh2 = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.8, 10, 4), waveMat);
  waveMesh2.rotation.x = -Math.PI / 2.2;
  waveMesh2.position.set(1.15, 0.52, 0.4);
  waveMesh2.userData.ignoreRaycaster = true;
  holoHeroic.add(waveMesh1, waveMesh2);

  holoHeroic.position.set(0, 0.75, 0);
  holoHeroic.visible = false;
  hologramRoot.add(holoHeroic);
  holoGroups[1] = holoHeroic;

  // --------------------------------------------------------------------------
  // 3. HOLOGRAM CHƯƠNG II: ĐÈN DẦU HẮT BÓNG & NƯỚC HOÀNG GIANG LÂN TINH
  // --------------------------------------------------------------------------
  const holoNamXuong = new THREE.Group();
  holoNamXuong.name = 'Holo_Chapter2_NamXuong';
  holoNamXuong.userData.ignoreRaycaster = true;

  // Cây đèn dầu cổ hắt ánh lửa
  const lampMat = new THREE.MeshBasicMaterial({
    color: 0xf59e0b,
    wireframe: true,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending
  });
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.22, 0.45, 10), lampMat);
  lampBase.position.set(-1.15, 0.5, 0);
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.34, 8),
    new THREE.MeshBasicMaterial({ color: 0xffedd5, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending })
  );
  flame.position.set(-1.15, 0.88, 0);
  lampBase.userData.ignoreRaycaster = true;
  flame.userData.ignoreRaycaster = true;
  holoNamXuong.add(lampBase, flame);

  // Vách nứa hắt bóng Vũ Nương cô đơn
  const screenMat = new THREE.MeshBasicMaterial({
    color: 0xca8a04,
    wireframe: true,
    transparent: true,
    opacity: 0.48,
    blending: THREE.AdditiveBlending
  });
  const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.4, 8, 8), screenMat);
  screenMesh.position.set(-0.25, 0.85, -0.4);
  screenMesh.userData.ignoreRaycaster = true;
  holoNamXuong.add(screenMesh);

  // Mặt nước & làn khói Hoàng Giang lấp lánh lân tinh xanh ngọc
  const riverMat = new THREE.MeshBasicMaterial({
    color: 0x14b8a6,
    wireframe: true,
    transparent: true,
    opacity: 0.68,
    blending: THREE.AdditiveBlending
  });
  const riverMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.3, 12, 8), riverMat);
  riverMesh.rotation.x = -Math.PI / 2.2;
  riverMesh.position.set(1.05, 0.4, 0.1);
  riverMesh.userData.ignoreRaycaster = true;

  // Dải khói sương sông nước
  const mistMat = new THREE.MeshBasicMaterial({
    color: 0x5eead4,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending
  });
  const mistMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.8, 0.6, 12, 1, true), mistMat);
  mistMesh.position.set(1.05, 0.72, 0.1);
  mistMesh.userData.ignoreRaycaster = true;
  holoNamXuong.add(riverMesh, mistMesh);

  holoNamXuong.position.set(0, 0.75, 0);
  holoNamXuong.visible = false;
  hologramRoot.add(holoNamXuong);
  holoGroups[2] = holoNamXuong;

  // --------------------------------------------------------------------------
  // 4. HOLOGRAM CHƯƠNG III: HÀNG CAU NẮNG MAI, THUYỀN CHỞ TRĂNG & MÁI TRANH NGHÈO
  // --------------------------------------------------------------------------
  const holoMoonShadow = new THREE.Group();
  holoMoonShadow.name = 'Holo_Chapter3_MoonShadow';
  holoMoonShadow.userData.ignoreRaycaster = true;

  // Hàng cau Vĩ Dạ thanh mảnh
  const arecaMat = new THREE.MeshBasicMaterial({
    color: 0x22c55e,
    wireframe: true,
    transparent: true,
    opacity: 0.76,
    blending: THREE.AdditiveBlending
  });
  for (let c = 0; c < 4; c++) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.9, 8), arecaMat);
    trunk.position.set(-1.45 + c * 0.32, 0.95, -0.35 + c * 0.14);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.52, 6), arecaMat);
    crown.position.set(-1.45 + c * 0.32, 2.0, -0.35 + c * 0.14);
    crown.rotation.x = Math.PI;
    trunk.userData.ignoreRaycaster = true;
    crown.userData.ignoreRaycaster = true;
    holoMoonShadow.add(trunk, crown);
  }

  // Thuyền nan chở trăng xứ Huế (Sampan carrying crescent moon)
  const boatMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    wireframe: true,
    transparent: true,
    opacity: 0.82,
    blending: THREE.AdditiveBlending
  });
  const boatMesh = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.3, 5), boatMat);
  boatMesh.rotation.z = Math.PI / 2;
  boatMesh.position.set(0.1, 0.52, 0.2);
  const moonMesh = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.05, 8, 16, Math.PI * 1.3),
    new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending })
  );
  moonMesh.position.set(0.1, 1.0, 0.2);
  boatMesh.userData.ignoreRaycaster = true;
  moonMesh.userData.ignoreRaycaster = true;
  holoMoonShadow.add(boatMesh, moonMesh);

  // Mái tranh nghèo xiêu vẹo của làng Đông Xá (Tắt Đèn)
  const hutMat = new THREE.MeshBasicMaterial({
    color: 0x94a3b8,
    wireframe: true,
    transparent: true,
    opacity: 0.68,
    blending: THREE.AdditiveBlending
  });
  const hutRoof = new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.55, 4), hutMat);
  hutRoof.position.set(1.4, 0.8, -0.2);
  hutRoof.rotation.z = 0.08; // Xiêu vẹo nhẹ
  const hutPillars = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.5, 0.65), hutMat);
  hutPillars.position.set(1.4, 0.35, -0.2);
  hutRoof.userData.ignoreRaycaster = true;
  hutPillars.userData.ignoreRaycaster = true;
  holoMoonShadow.add(hutRoof, hutPillars);

  holoMoonShadow.position.set(0, 0.75, 0);
  holoMoonShadow.visible = false;
  hologramRoot.add(holoMoonShadow);
  holoGroups[3] = holoMoonShadow;

  // Hàm chuyển đổi hologram theo chương
  hologramRoot.userData.setChapter = (chapterIdx) => {
    holoGroups.forEach((group, idx) => {
      if (group) {
        group.visible = idx === chapterIdx;
        group.scale.setScalar(0.01);
      }
    });
  };

  hologramRoot.userData.update = (timeSec) => {
    holoGroups.forEach((group, idx) => {
      if (group && group.visible) {
        // Hiệu ứng mọc lên mượt mà (Ease pop-up scale)
        if (group.scale.x < 1.0) {
          group.scale.lerp(new THREE.Vector3(1, 1, 1), 0.12);
        }
        // Nhấp nhô bồng bềnh nhẹ nhàng
        group.position.y = 0.75 + Math.sin(timeSec * 2.0 + idx) * 0.05;
        group.rotation.y = timeSec * 0.18;
      }
    });
  };

  return hologramRoot;
}

/**
 * ============================================================================
 * HÀM CHÍNH TẠO TOÀN BỘ CUỐN SÁCH TRUNG TÂM "THIÊN THƯ SỬ VIỆT" 3D
 * ============================================================================
 */
export function createThienThuSuVietCenterpiece({
  camera = null,
  cameraManager = null,
  hitboxManager = null,
  loreGuide = null,
  audioManager = null,
  onNavigateToRoom = null
} = {}) {
  const root = new THREE.Group();
  root.name = 'ThienThu_SuViet_Grand_Centerpiece';
  root.position.set(0, 0, 0);

  let currentChapterIndex = 0;

  // 1. DỰNG BỆ ĐÁ TRÒN ĐÔNG SƠN & ĐÀI SEN VÀNG 16 CÁNH
  const pedestal = createDongSonLotusPedestal();
  root.add(pedestal);

  // 2. CUỐN SÁCH KHỔ LỚN LƠ LỬNG
  const bookFloatingRoot = new THREE.Group();
  bookFloatingRoot.name = 'ThienThu_Floating_Book_Root';
  bookFloatingRoot.position.set(0, pedestal.userData.topY + 0.65, 0);

  // A. Chân đế đỡ sách gỗ mun nẹp kim loại
  const cradleGeo = new THREE.BoxGeometry(6.2, 0.28, 3.8);
  const cradleMat = new THREE.MeshStandardMaterial({
    color: 0x1c1917,
    roughness: 0.35,
    metalness: 0.35,
    side: THREE.FrontSide
  });
  const cradle = new THREE.Mesh(cradleGeo, cradleMat);
  cradle.userData.ignoreRaycaster = true;
  bookFloatingRoot.add(cradle);

  // B. Bìa sách sơn son thếp vàng
  const coverMat = new THREE.MeshStandardMaterial({
    map: createLacqueredBookCoverTexture(),
    roughness: 0.25,
    metalness: 0.55,
    side: THREE.FrontSide
  });
  const leftCover = new THREE.Mesh(new THREE.BoxGeometry(3.05, 0.08, 3.9), coverMat);
  leftCover.position.set(-1.58, 0.18, 0);
  leftCover.rotation.x = 0.24;
  leftCover.rotation.z = 0.06;
  leftCover.userData.ignoreRaycaster = true;

  const rightCover = new THREE.Mesh(new THREE.BoxGeometry(3.05, 0.08, 3.9), coverMat);
  rightCover.position.set(1.58, 0.18, 0);
  rightCover.rotation.x = 0.24;
  rightCover.rotation.z = -0.06;
  rightCover.userData.ignoreRaycaster = true;
  bookFloatingRoot.add(leftCover, rightCover);

  // C. Gáy sách nạm ngọc bích nẹp hoàng kim
  const spineGeo = new THREE.CylinderGeometry(0.24, 0.24, 4.0, 16);
  const jadeMat = new THREE.MeshStandardMaterial({
    color: 0x0f766e,
    roughness: 0.15,
    metalness: 0.6,
    emissive: 0x042f2e,
    emissiveIntensity: 0.35,
    side: THREE.FrontSide
  });
  const spine = new THREE.Mesh(spineGeo, jadeMat);
  spine.rotation.x = Math.PI / 2 + 0.24;
  spine.position.set(0, 0.32, 0);
  spine.userData.ignoreRaycaster = true;

  // 4 vòng nẹp vàng gáy sách hoàng kim
  const goldSpineMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.22,
    metalness: 0.85
  });
  for (let g = 0; g < 4; g++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.025, 8, 24), goldSpineMat);
    ring.rotation.x = Math.PI / 2 + 0.24;
    ring.position.set(0, 0.32, -1.35 + g * 0.9);
    ring.userData.ignoreRaycaster = true;
    bookFloatingRoot.add(ring);
  }
  bookFloatingRoot.add(spine);

  // D. Hai trang Giấy Dó phát sáng (Trang Trái & Trang Phải)
  const leftPageGeo = new THREE.BoxGeometry(2.95, 0.16, 3.75, 10, 1, 4);
  const leftPos = leftPageGeo.attributes.position;
  for (let i = 0; i < leftPos.count; i++) {
    const x = leftPos.getX(i);
    const arch = Math.sin(((x * -1 + 1.475) / 2.95) * Math.PI) * 0.14;
    leftPos.setY(i, leftPos.getY(i) + arch);
  }
  leftPageGeo.computeVertexNormals();

  const leftInitialTex = createDoPaperPageTexture(THIEN_THU_CHAPTERS[0], true);
  const leftPageMat = new THREE.MeshStandardMaterial({
    map: leftInitialTex,
    emissive: new THREE.Color(0x3a200a),
    emissiveIntensity: 0.28,
    emissiveMap: leftInitialTex,
    roughness: 0.52,
    metalness: 0.06,
    side: THREE.FrontSide
  });
  const leftPageMesh = new THREE.Mesh(leftPageGeo, leftPageMat);
  leftPageMesh.position.set(-1.58, 0.30, 0);
  leftPageMesh.rotation.x = 0.24;
  leftPageMesh.rotation.z = 0.06;
  leftPageMesh.name = 'ThienThu_Left_Page_Mesh';
  leftPageMesh.userData.isLeftPage = true;

  const rightPageGeo = new THREE.BoxGeometry(2.95, 0.16, 3.75, 10, 1, 4);
  const rightPos = rightPageGeo.attributes.position;
  for (let i = 0; i < rightPos.count; i++) {
    const x = rightPos.getX(i);
    const arch = Math.sin(((x + 1.475) / 2.95) * Math.PI) * 0.14;
    rightPos.setY(i, rightPos.getY(i) + arch);
  }
  rightPageGeo.computeVertexNormals();

  const rightInitialTex = createDoPaperPageTexture(THIEN_THU_CHAPTERS[0], false);
  const rightPageMat = new THREE.MeshStandardMaterial({
    map: rightInitialTex,
    emissive: new THREE.Color(0x3a200a),
    emissiveIntensity: 0.28,
    emissiveMap: rightInitialTex,
    roughness: 0.52,
    metalness: 0.06,
    side: THREE.FrontSide
  });
  const rightPageMesh = new THREE.Mesh(rightPageGeo, rightPageMat);
  rightPageMesh.position.set(1.58, 0.30, 0);
  rightPageMesh.rotation.x = 0.24;
  rightPageMesh.rotation.z = -0.06;
  rightPageMesh.name = 'ThienThu_Right_Page_Mesh';
  rightPageMesh.userData.isRightPage = true;

  bookFloatingRoot.add(leftPageMesh, rightPageMesh);

  // 3. HỆ THỐNG MÔ HÌNH NỔI 3D POP-UP HOLOGRAM TRÊN MẶT TRANG
  const holograms = createChapterHolograms();
  bookFloatingRoot.add(holograms);

  // 4. CỘT SÁNG VOLUMETRIC GOD RAYS & HẠT XOẮN ỐC KÝ TỰ BAY
  const godRays = createVolumetricGodRays();
  root.add(godRays);

  const spiralLetters = createSpiralLetterParticles();
  root.add(spiralLetters);

  // 5. CÁC NÚT TƯƠNG TÁC 3D TRÊN TRANG SÁCH & MÉP LẬT TRANG
  const interactiveButtonsGroup = new THREE.Group();
  interactiveButtonsGroup.name = 'ThienThu_Interactive_Buttons_Group';

  // Nút lật trang mép trái
  const prevBtnGeo = new THREE.PlaneGeometry(0.68, 0.34);
  const prevBtnTex = getCachedCanvasTexture('thien_thu_btn_prev_v2', 256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(4, 4, w - 8, h - 8);
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 34px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText('◀ TRANG TRƯỚC', w / 2, 75);
  });
  const prevBtnMat = new THREE.MeshBasicMaterial({ map: prevBtnTex, side: THREE.FrontSide });
  const prevBtnMesh = new THREE.Mesh(prevBtnGeo, prevBtnMat);
  prevBtnMesh.position.set(-2.65, 0.46, 1.4);
  prevBtnMesh.rotation.x = -Math.PI / 2.3;
  prevBtnMesh.userData.isPageTurnBtn = true;
  prevBtnMesh.userData.direction = -1;
  interactiveButtonsGroup.add(prevBtnMesh);

  // Nút lật trang mép phải
  const nextBtnGeo = new THREE.PlaneGeometry(0.68, 0.34);
  const nextBtnTex = getCachedCanvasTexture('thien_thu_btn_next_v2', 256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(4, 4, w - 8, h - 8);
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 34px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText('TRANG KẾ ▶', w / 2, 75);
  });
  const nextBtnMat = new THREE.MeshBasicMaterial({ map: nextBtnTex, side: THREE.FrontSide });
  const nextBtnMesh = new THREE.Mesh(nextBtnGeo, nextBtnMat);
  nextBtnMesh.position.set(2.65, 0.46, 1.4);
  nextBtnMesh.rotation.x = -Math.PI / 2.3;
  nextBtnMesh.userData.isPageTurnBtn = true;
  nextBtnMesh.userData.direction = 1;
  interactiveButtonsGroup.add(nextBtnMesh);

  // Nút hành động tác phẩm mọc nổi ở chân trang
  const actionButtonMeshes = [];
  function refreshActionButtons(chapter) {
    actionButtonMeshes.forEach((mesh) => {
      interactiveButtonsGroup.remove(mesh);
      mesh.geometry?.dispose?.();
      mesh.material?.map?.dispose?.();
      mesh.material?.dispose?.();
    });
    actionButtonMeshes.length = 0;

    const btns = chapter.buttons || [];
    const count = btns.length;
    const btnW = count >= 3 ? 1.32 : 1.45;
    const btnH = 0.36;
    const spacing = count >= 3 ? 1.48 : 1.90;

    btns.forEach((btnData, idx) => {
      const bGeo = new THREE.PlaneGeometry(btnW, btnH);
      const bTex = getCachedCanvasTexture(`btn_act_${btnData.id}_v3`, 512, 128, (ctx, w, h) => {
        // Nền đỏ hoàng gia viền vàng hoàng kim
        const g = ctx.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, '#991b1b');
        g.addColorStop(0.5, '#dc2626');
        g.addColorStop(1, '#991b1b');
        ctx.fillStyle = g;
        ctx.fillRect(4, 4, w - 8, h - 8);

        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 6;
        ctx.strokeRect(8, 8, w - 16, h - 16);

        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 34px "Times New Roman", serif';
        ctx.textAlign = 'center';
        ctx.fillText(btnData.text, w / 2, 78);
      });

      const bMat = new THREE.MeshBasicMaterial({ map: bTex, side: THREE.FrontSide });
      const bMesh = new THREE.Mesh(bGeo, bMat);

      // Bố trí nút cân đối phía dưới mặt trang
      const xOffset = count === 1 ? 0.0 : (idx - (count - 1) / 2) * spacing;
      bMesh.position.set(xOffset, 0.52, 1.48);
      bMesh.rotation.x = -Math.PI / 2.3;
      bMesh.userData.isActionBtn = true;
      bMesh.userData.actionData = btnData;
      bMesh.userData.ignoreRaycaster = false;

      interactiveButtonsGroup.add(bMesh);
      actionButtonMeshes.push(bMesh);
    });
  }

  // Khởi tạo nút cho chương 0
  refreshActionButtons(THIEN_THU_CHAPTERS[0]);

  // 6. ẤN TRIỆN ĐỎ "DU NGOẠN TỰ ĐỘNG" Ở GÓC DƯỚI CUỐN SÁCH
  const sealGeo = new THREE.PlaneGeometry(0.58, 0.58);
  const sealMat = new THREE.MeshBasicMaterial({
    map: createRoyalAutoTourSealTexture(),
    side: THREE.FrontSide
  });
  const sealMesh = new THREE.Mesh(sealGeo, sealMat);
  sealMesh.name = 'ThienThu_Royal_AutoTour_Seal';
  sealMesh.position.set(2.45, 0.52, -1.35);
  sealMesh.rotation.x = -Math.PI / 2.3;
  sealMesh.userData.isRoyalSeal = true;
  sealMesh.userData.ignoreRaycaster = false;
  interactiveButtonsGroup.add(sealMesh);

  bookFloatingRoot.add(interactiveButtonsGroup);
  root.add(bookFloatingRoot);

  // 7. HÀM CHUYỂN CHƯƠNG (PAGE TURN LOGIC)
  function setChapter(newIndex) {
    const total = THIEN_THU_CHAPTERS.length;
    currentChapterIndex = ((newIndex % total) + total) % total;
    const currentChapter = THIEN_THU_CHAPTERS[currentChapterIndex];

    // Cập nhật texture trang sách Giấy Dó
    const lTex = createDoPaperPageTexture(currentChapter, true);
    leftPageMat.map = lTex;
    leftPageMat.emissiveMap = lTex;
    leftPageMat.needsUpdate = true;

    const rTex = createDoPaperPageTexture(currentChapter, false);
    rightPageMat.map = rTex;
    rightPageMat.emissiveMap = rTex;
    rightPageMat.needsUpdate = true;

    // Cập nhật hologram 3D
    holograms.userData.setChapter(currentChapterIndex);

    // Cập nhật các nút tác phẩm
    refreshActionButtons(currentChapter);

    // Phát âm thanh sột soạt lật giấy cổ
    playVintagePageTurnSound();

    console.log(`%c[THIÊN THƯ SỬ VIỆT] Đã lật sang: ${currentChapter.title} - ${currentChapter.subtitle}`, 'color: #facc15; font-weight: bold;');
  }

  // 8. TƯƠNG TÁC ĐIỀU HƯỚNG TỚI TÁC PHẨM (ƯU TIÊN WINDOW.ENTERREALM)
  function handleNavigateToRoom(targetRoomId, realmId = null) {
    if (typeof onNavigateToRoom === 'function') {
      onNavigateToRoom(targetRoomId, realmId);
      return;
    }

    const targetRealm = realmId || targetRoomId;

    // 1. Ưu tiên cao nhất: Gọi window.enterRealm nếu có
    if (typeof window !== 'undefined' && typeof window.enterRealm === 'function') {
      const entered = window.enterRealm(targetRealm);
      if (entered) return;
    }

    // 2. Thử gọi trực tiếp vào instance phòng trên window hoặc __app
    const app = typeof window !== 'undefined' ? window.__app : null;
    let roomObj = null;
    if (targetRoomId === 'thanh_giong') roomObj = app?.thanhGiongRoom || window.__thanhGiongRoom;
    else if (targetRoomId === 'an_duong_vuong') roomObj = app?.anDuongVuongRoom || window.__anDuongVuongRoom;
    else if (targetRoomId === 'nam_quoc_son_ha') roomObj = app?.namQuocSonHaRoom || window.__namQuocSonHaRoom;
    else if (targetRoomId === 'nguoi_con_gai_nam_xuong') roomObj = app?.namXuongRoom || window.__namXuongRoom;
    else if (targetRoomId === 'day_thon_vi_da') roomObj = app?.dayThonViDaRoom || window.__dayThonViDaRoom;
    else if (targetRoomId === 'tat_den') roomObj = app?.tatDenRoom || window.__tatDenRoom;

    if (roomObj?.enterRealm) {
      roomObj.enterRealm(targetRealm);
      return;
    }

    // 3. Fallback: Fast travel camera đến tâm phòng
    const camMgr = cameraManager || (typeof window !== 'undefined' ? (window.__cameraManager || window.__app?.cameraManager) : null);
    if (camMgr && typeof camMgr.fastTravelTo === 'function') {
      if (targetRoomId === 'thanh_giong') {
        camMgr.fastTravelTo(new THREE.Vector3(-22, 1.8, 19), new THREE.Vector3(-35, 1.8, 19));
      } else if (targetRoomId === 'nam_quoc_son_ha') {
        camMgr.fastTravelTo(new THREE.Vector3(-22, 11.8, 19), new THREE.Vector3(-35, 11.8, 19));
      } else if (targetRoomId === 'nguoi_con_gai_nam_xuong') {
        camMgr.fastTravelTo(new THREE.Vector3(22, 11.8, -19), new THREE.Vector3(35, 11.8, -19));
      } else if (targetRoomId === 'day_thon_vi_da') {
        camMgr.fastTravelTo(new THREE.Vector3(-22, 21.8, -19), new THREE.Vector3(-35, 21.8, -19));
      } else if (targetRoomId === 'tat_den') {
        camMgr.fastTravelTo(new THREE.Vector3(0, 21.8, -28), new THREE.Vector3(0, 21.8, -40));
      } else {
        const pose = getRoomWorldPose(targetRoomId);
        if (pose) {
          camMgr.fastTravelTo(new THREE.Vector3(pose.x, pose.y + 1.8, pose.z + 8), new THREE.Vector3(pose.x, pose.y + 1.8, pose.z));
        }
      }
    }
  }

  // 9. XỬ LÝ CLICK RAYCASTER TRỰC TIẾP TRÊN CANVAS
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  function onPointerDown(e) {
    if (e.button !== 0) return; // Chỉ nhận click chuột trái
    if (typeof window === 'undefined') return;

    const canvas = document.querySelector('canvas') || e.target;
    const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const currentCam = camera || (typeof window !== 'undefined' ? window.__app?.camera : null);
    if (!currentCam) return;

    raycaster.setFromCamera(mouse, currentCam);

    // Danh sách mục tiêu có thể tương tác (tuyệt đối không raycast vào particle hay god rays)
    const clickableTargets = [
      prevBtnMesh,
      nextBtnMesh,
      sealMesh,
      ...actionButtonMeshes,
      leftPageMesh,
      rightPageMesh
    ];

    const intersects = raycaster.intersectObjects(clickableTargets, true);
    if (intersects.length === 0) return;

    const hit = intersects[0].object;

    if (hit.userData.isPageTurnBtn) {
      setChapter(currentChapterIndex + hit.userData.direction);
      e.stopPropagation();
    } else if (hit.userData.isActionBtn && hit.userData.actionData) {
      const act = hit.userData.actionData;
      handleNavigateToRoom(act.target, act.realm);
      e.stopPropagation();
    } else if (hit.userData.isRoyalSeal || hit.name === 'ThienThu_Royal_AutoTour_Seal') {
      // Bật Ấn Triện Đỏ "Du Ngoạn Tự Động"
      if (typeof window !== 'undefined' && window.__autoTour?.toggleTour) {
        window.__autoTour.toggleTour();
      } else if (typeof window !== 'undefined' && window.__autoTourDirector?.toggleTour) {
        window.__autoTourDirector.toggleTour();
      } else if (typeof window !== 'undefined' && window.__curatorSystem?.toggleTour) {
        window.__curatorSystem.toggleTour();
      } else {
        console.log('[THIÊN THƯ] Đã kích hoạt Ấn Triện Du Ngoạn Tự Động!');
      }
      e.stopPropagation();
    } else if (hit === leftPageMesh || hit.name === 'ThienThu_Left_Page_Mesh' || hit.userData.isLeftPage) {
      // Click mép trang trái: Lật về chương trước + Zoom mượt mà nghiêng 45 độ
      setChapter(currentChapterIndex - 1);
      const camMgr = cameraManager || (typeof window !== 'undefined' ? (window.__cameraManager || window.__app?.cameraManager) : null);
      if (camMgr && typeof camMgr.smoothZoomToFocus === 'function') {
        camMgr.smoothZoomToFocus(
          new THREE.Vector3(0, 3.4, 2.8),
          new THREE.Vector3(0, 1.8, 0),
          { duration: 0.85 }
        );
      }
      e.stopPropagation();
    } else if (hit === rightPageMesh || hit.name === 'ThienThu_Right_Page_Mesh' || hit.userData.isRightPage) {
      // Click mép trang phải: Lật sang chương kế + Zoom mượt mà nghiêng 45 độ
      setChapter(currentChapterIndex + 1);
      const camMgr = cameraManager || (typeof window !== 'undefined' ? (window.__cameraManager || window.__app?.cameraManager) : null);
      if (camMgr && typeof camMgr.smoothZoomToFocus === 'function') {
        camMgr.smoothZoomToFocus(
          new THREE.Vector3(0, 3.4, 2.8),
          new THREE.Vector3(0, 1.8, 0),
          { duration: 0.85 }
        );
      }
      e.stopPropagation();
    }
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pointerdown', onPointerDown);
  }

  // 10. BỌC HITBOX CHỐNG ĐI XUYÊN VẬT THỂ CHO BỆ ĐÁ & CUỐN SÁCH
  let colliderRegistered = false;
  function ensureColliders() {
    if (colliderRegistered) return;
    const hbm = hitboxManager || (typeof window !== 'undefined' ? (window.__museumHitboxManager || window.__app?.hitboxManager) : null);
    if (hbm && typeof hbm.registerSolidObjectCollider === 'function') {
      const customBox = new THREE.Box3(
        new THREE.Vector3(-2.2, 0.6, 0.8),
        new THREE.Vector3(2.2, 2.6, 5.2)
      );
      // Đăng ký cả hai tag nhận diện hệ thống
      hbm.registerSolidObjectCollider(null, {
        customBox,
        tag: 'Center_Heritage_Book_Platform',
        helperColor: 0xfacc15
      });
      hbm.registerSolidObjectCollider(null, {
        customBox,
        tag: 'ThienThu_SuViet_CentralPedestal_SolidHitbox',
        helperColor: 0xfacc15
      });

      if (typeof hbm.createTightClickHitbox === 'function') {
        hbm.createTightClickHitbox(bookFloatingRoot, {
          loreKey: 'lobby_giantHeritageBook',
          padding: 0.35,
          minSize: 3.8
        });
      }
      colliderRegistered = true;
    }
  }
  ensureColliders();

  // 11. GẮN ÂM THANH 3D KHÔNG GIAN (POSITIONAL AUDIO & PROCEDURAL DAN BAU)
  let positionalAudio = null;
  const listener = audioManager?.listener || (typeof window !== 'undefined' ? window.__audioManager?.listener : null);
  if (listener) {
    try {
      positionalAudio = new THREE.PositionalAudio(listener);
      positionalAudio.setRefDistance(6);
      positionalAudio.setMaxDistance(38);
      positionalAudio.setRolloffFactor(1.1);
      positionalAudio.setLoop(true);
      positionalAudio.setVolume(0.42);

      const audioCtx = listener.context || (typeof window !== 'undefined' ? (window.AudioContext && (window.__audioManager?.context || new (window.AudioContext || window.webkitAudioContext)())) : null);

      if (audioManager?.atriumBgm?.buffer) {
        positionalAudio.setBuffer(audioManager.atriumBgm.buffer);
        positionalAudio.play();
      } else if (audioCtx) {
        try {
          const proceduralBuffer = generateDanBauProceduralBuffer(audioCtx, 12.0);
          positionalAudio.setBuffer(proceduralBuffer);
          if (audioCtx.state === 'running') {
            positionalAudio.play();
          } else {
            const onAudioResume = () => {
              try {
                if (positionalAudio && !positionalAudio.isPlaying) {
                  positionalAudio.play();
                }
              } catch (_) {}
              window.removeEventListener('click', onAudioResume);
              window.removeEventListener('pointerdown', onAudioResume);
            };
            window.addEventListener('click', onAudioResume, { once: true });
            window.addEventListener('pointerdown', onAudioResume, { once: true });
          }
        } catch (synthErr) {
          console.warn('[ThienThu] Procedural Dan Bau synthesis fallback:', synthErr);
        }
      }
      root.add(positionalAudio);
    } catch (soundErr) {
      console.warn('[ThienThu] PositionalAudio setup:', soundErr);
    }
  }

  // 12. BẢO ĐẢM TẤT CẢ ĐỐI TƯỢNG NỀN & HIỆU ỨNG CÓ USERDATA.IGNORERAYCASTER = TRUE
  [pedestal, godRays, spiralLetters, holograms, cradle, leftCover, rightCover, spine].forEach((obj) => {
    if (obj) {
      obj.userData.ignoreRaycaster = true;
      obj.traverse((c) => {
        c.userData.ignoreRaycaster = true;
      });
    }
  });

  // Đảm bảo các đối tượng có thể click nhận tương tác chính xác
  leftPageMesh.userData.ignoreRaycaster = false;
  rightPageMesh.userData.ignoreRaycaster = false;
  prevBtnMesh.userData.ignoreRaycaster = false;
  nextBtnMesh.userData.ignoreRaycaster = false;
  sealMesh.userData.ignoreRaycaster = false;

  // 13. VÒNG LẶP UPDATE ANIMATION (60+ FPS)
  const update = (timeSec = performance.now() * 0.001) => {
    // Đảm bảo hitbox được đăng ký nếu chưa
    if (!colliderRegistered) {
      ensureColliders();
    }

    // A. Cuốn sách lơ lửng và nhấp nhô nhẹ theo Math.sin(time)
    const hoverY = pedestal.userData.topY + 0.65 + Math.sin(timeSec * 1.5) * 0.08;
    bookFloatingRoot.position.y = hoverY;
    bookFloatingRoot.rotation.z = Math.sin(timeSec * 0.8) * 0.015;

    // B. Cập nhật God Rays & Hạt xoắn ốc ký tự bay
    godRays.userData.update?.(timeSec);
    spiralLetters.userData.update?.(timeSec);

    // C. Cập nhật Hologram 3D mọc lên
    holograms.userData.update?.(timeSec);
  };

  root.userData.update = update;
  root.userData.setChapter = setChapter;
  root.userData.getChapterIndex = () => currentChapterIndex;
  root.userData.positionalAudio = positionalAudio;

  return root;
}
