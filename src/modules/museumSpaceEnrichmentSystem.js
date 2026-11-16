import * as THREE from 'three';
import { ARTIFACT_LORE_DATABASE } from './museumImmersionSystem.js';

/**
 * ============================================================================
 * MUSEUM SPACE ENRICHMENT SYSTEM - ĐẠI QUY HOẠCH & LẤP ĐẦY TOÀN DIỆN KHÔNG GIAN
 * BẢO TÀNG VĂN HỌC VIỆT NAM 3D (60+ FPS PROCEDURAL ARCHITECTURE)
 * 
 * 6 HẠNG MỤC TÍCH HỢP TOÀN DIỆN:
 * 1. Thuật Toán Phân Bổ Không Gian Trống (museum-exhibition-curator):
 *    - Quét & lấp đầy các góc chết (X=±26, Z=-8; X=±33, Z=-10), gầm & chân cầu thang
 *      (X=±8, Z=10..18), mảng tường trống & khoảng không trần (Y=12..18m).
 * 2. Kiến Trúc Phụ Trợ & Nội Thất Cổ Truyền (cultural-heritage-modeler & ornamental-relief-sculptor):
 *    - Bình phong gỗ lim 4 cánh ziczac chạm lộng Tứ Linh / Sen Vàng / Bách Điểu.
 *    - Tàng Kinh Các thu nhỏ: 2 kệ sách cổ cao nhiều tầng chứa thẻ tre, sách chữ Nôm ngũ sắc, hộp sơn mài.
 *    - Bộ Đỉnh Đồng & Đôi Hạc Chầu cưỡi rùa bằng đồng patin xanh cổ kính bên lối vào.
 *    - Trướng lụa đào, mành trúc đan, hoành phi thếp vàng & câu đối chữ Nôm sơn son.
 * 3. Các Góc Tiểu Cảnh Văn Hóa & Nhạc Cụ Dân Tộc (mesh-detailing-specialist & interactive-lore-guide):
 *    - Góc Ông Đồ & Thư Pháp (X=-18.5, Z=10.0): Chiếu cói hoa, bàn gỗ mộc, nghiên mực đá, gác bút lông,
 *      ống triện ngọc, giấy đỏ "Tâm - Đức - Tài", click mở lore card.
 *    - Góc Nhạc Cụ Cổ Truyền & Trà Đạo (X=18.5, Z=10.0): Bệ gỗ cẩm lai trưng bày 3D Đàn Bầu, Đàn Tranh,
 *      Đàn Nguyệt, Sáo Trúc, ấm chén trà sen bốc hơi ấm, PositionalAudio tiếng đàn tranh ngân vang.
 *    - Góc Dân Gian & Làng Nghề (X=-8.0, Z=18.0): Bình gốm Chu Đậu, mặt nạ Tuồng/Chèo, nón quai thao, quang gánh tre mini.
 * 4. Tiểu Cảnh Thiên Nhiên Tứ Quý & Non Bộ (water-mountain-vfx-sculptor):
 *    - Chậu đôn sứ men lam Bát Tràng: Bonsai Tùng bách uốn thế, khóm Trúc xanh, chậu Cúc vàng, Mai/Đào phai.
 *    - Vạc gốm lớn nuôi sen hồng/hoa súng trên mặt nước Shader gợn sóng, non bộ rêu phong sương khói mờ ảo.
 * 5. Lấp Đầy Trần Nhà, Mặt Sàn & Living VFX (environment-lighting-artist & shader-coloring-artist):
 *    - Quần thể Đèn Kéo Quân lục giác tự xoay chậm, Đèn Lồng Hội An nhiều dáng, Đèn Hoa Sen thả trần.
 *    - Họa tiết Mặt Trống Đồng Đông Sơn 14 tia sáng chiếu phát quang mờ trên mặt sàn xoay cực chậm.
 *    - Living VFX: Khói trầm hương procedural uốn lượn, cánh hoa rơi chao lượn, đom đóm lân tinh xanh ngọc.
 * 6. Âm Thanh, Hitbox & Tối Ưu 60+ FPS (fps-optimizer & hitbox-collision-architect):
 *    - 100% Procedural Mesh + PBR Material + InstancedMesh (Zero GLB bloat).
 *    - Box3 solid colliders hoàn toàn nằm ngoài trục đường đi trung tâm |X| <= 2.3.
 *    - userData.ignoreRaycaster = true triệt để cho toàn bộ VFX, đèn trần và vật thể nền.
 * ============================================================================
 */

// Bổ sung các bản ghi thuyết minh tương tác vào ARTIFACT_LORE_DATABASE
if (ARTIFACT_LORE_DATABASE) {
  Object.assign(ARTIFACT_LORE_DATABASE, {
    lobby_ongDo_thuPhap: {
      room: 'ĐẠI SẢNH HOÀNG CUNG • GÓC ÔNG ĐỒ & THƯ PHÁP',
      title: 'Chiếu Cói Thư Pháp & Nghiên Mực Mài Son',
      subtitle: 'Hình bóng Ông Đồ già bên mực tàu giấy đỏ mỗi độ Tết đến xuân về',
      poem: [
        '“Mỗi năm hoa đào nở',
        'Lại thấy ông đồ già',
        'Bày mực tàu giấy đỏ',
        'Bên phố đông người qua.',
        'Bao nhiêu người thuê viết',
        'Tấm tắc ngợi khen tài:',
        'Tay thảo những nét phượng',
        'Như rồng bay phượng múa.”'
      ],
      description: 'Góc thư pháp cổ truyền tái hiện không gian văn hóa Nho học Việt Nam. Trên manh chiếu cói hoa dệt đỏ là chiếc bàn gỗ mộc thô mộc, nghiên mực đá tự nhiên óng ả, bút giá gác ba ngọn bút lông trúc, ống cắm ấn triện ngọc bích và những bức đại tự "TÂM", "ĐỨC", "TÀI" viết bằng mực tàu thơm nức trên giấy xuyến chỉ đỏ rực.'
    },
    lobby_nhacCu_traDao: {
      room: 'ĐẠI SẢNH HOÀNG CUNG • GÓC NHẠC CỤ CỔ TRUYỀN & TRÀ ĐẠO',
      title: 'Bộ Tứ Cổ Nhạc Cung Đình & Phong Vị Trà Sen',
      subtitle: 'Đàn Bầu, Đàn Tranh, Đàn Nguyệt, Sáo Trúc hòa quyện cùng hương trà mạn',
      poem: [
        '“Đàn bầu ai gảy nấy nghe,',
        'Làm thân con gái chớ nghe đàn bầu.',
        'Trong như tiếng hạc bay qua,',
        'Đục như nước suối mới sa nửa vời.',
        'Tiếng khoan như gió thoảng ngoài,',
        'Tiếng mau sầm sập như trời đổ mưa.”'
      ],
      description: 'Không gian thưởng thức nhã nhạc cổ truyền với bệ gỗ cẩm lai trưng bày 3D Đàn Tranh 16 dây khảm ốc, Đàn Bầu độc huyền cầm bằng sừng trâu và quả bầu khô, Đàn Nguyệt vòm nguyệt phím cao thanh thoát, cùng Sáo Trúc vàng óng. Bên cạnh là khay trà gốm nung Bát Tràng với chén quân bốc hơi ấm thơm ngát phong vị trà ướp hoa sen Tây Hồ.'
    },
    lobby_danGian_langNghe: {
      room: 'ĐẠI SẢNH HOÀNG CUNG • GÓC DÂN GIAN & LÀNG NGHỀ',
      title: 'Hồn Cốt Dân Gian & Tinh Hoa Làng Nghề Việt',
      subtitle: 'Gốm Hoa Nâu Chu Đậu, Mặt Nạ Tuồng Chèo & Nón Quai Thao Xứ Bắc',
      poem: [
        '“Nón ba tầm ai về hội Lim,',
        'Áo tứ thân thắm dải lụa điều.',
        'Chu Đậu men lam danh bất hư truyền,',
        'Mặt nạ tuồng chèo đọng nét nhân gian.”'
      ],
      description: 'Trưng bày bình gốm hoa nâu Chu Đậu thế kỷ XV với men tro trấu tự nhiên, bộ ba mặt nạ Tuồng Chèo rực rỡ khắc họa trung thần, mỹ nhân và hề chèo dân dã, chiếc nón quai thao truyền thống với dải lụa điều thướt tha của liền chị quan họ, cùng đôi quang gánh tre mộc mạc trĩu nặng hồn quê.'
    },
    lobby_tangKinhCac: {
      room: 'ĐẠI SẢNH HOÀNG CUNG • TÀNG KINH CÁC CỔ',
      title: 'Tàng Kinh Các Thu Nhỏ • Kho Tàng Hán Nôm',
      subtitle: 'Nơi lưu giữ thư tịch cổ, thẻ tre, sách chữ Nôm chỉ ngũ sắc',
      poem: [
        '“Sách soi kim cổ ngời trang sử,',
        'Bút vẽ non sông rạng chữ đồng.',
        'Ngàn năm bia đá mòn theo tháng,',
        'Nét chữ nghìn thu đượm cõi lòng.”'
      ],
      description: 'Kệ sách gỗ lim chạm khắc hoa văn mây cuốn thời Lê - Nguyễn, lưu giữ hàng trăm cuộn trục thư pháp chữ Hán, thẻ tre thời Tiền Lê - Lý - Trần, các tập thơ chữ Nôm đóng chỉ ngũ sắc cổ kính và những tráp sơn mài cẩn xà cừ bảo tồn di sản văn hiến dân tộc.'
    },
    lobby_binhPhongTuLinh: {
      room: 'ĐẠI SẢNH HOÀNG CUNG • NỘI THẤT CỔ TRUYỀN',
      title: 'Bình Phong Gỗ Lim Chạm Lộng Tứ Linh & Sen Vàng',
      subtitle: 'Tác phẩm điêu khắc gỗ truyền thống trấn giữ phong thủy sảnh đường',
      poem: [
        '“Bình phong che chắn luồng phong khí,',
        'Gỗ quý lim già chạm Tứ Linh.',
        'Long Phụng sum vầy sinh vượng khí,',
        'Sen vàng tỏa ngát chốn cung đình.”'
      ],
      description: 'Bình phong tứ bình ziczac 4 cánh bằng gỗ lim nguyên khối, chạm lộng thủng họa tiết Long - Lân - Quy - Phụng cùng hoa sen vàng và bách điểu chầu nguyệt, tạo ranh giới chuyển tiếp uy nghiêm, thanh tịnh giữa các đại gian sảnh đường.'
    },
    lobby_dinhDongHacChau: {
      room: 'ĐẠI SẢNH HOÀNG CUNG • ĐẠI CẦU THANG',
      title: 'Đại Bệ Cẩm Thạch Đen • Đỉnh Đồng Nghê & Hạc Chầu Cưỡi Rùa',
      subtitle: 'Bộ đôi đỉnh đồng tam sự kết hợp cây thế Bonsai tùng bách uy nghiêm trước Đại Cầu Thang',
      poem: [
        '“Lư trầm nghi ngút khói hoàng cung,',
        'Hạc ngự lưng rùa thế ung dung.',
        'Tùng bách nghinh phong sinh vượng khí,',
        'Văn hiến ngàn năm vẹn chữ trung.”'
      ],
      description: 'Hai đại bệ tròn cẩm thạch đen đường kính 4.4m đặt trang trọng hai bên lối đi trước Đại Cầu Thang. Trên mỗi bệ ngự một đỉnh đồng cổ lớn nắp chạm tượng Nghê vờn ngọc bốc khói trầm hương ngào ngạt, đôi hạc thờ ngậm cành hoa sen đứng chầu trên mai rùa thần Kim Quy, cùng chậu cây Bonsai tùng bách cổ thụ uốn thế nghinh phong mang vượng khí trường tồn.'
    },
    lobby_canhGa_gomCo: {
      room: 'ĐẠI SẢNH HOÀNG CUNG • GỐM SỨ & CÂY THẾ CÁNH GÀ',
      title: 'Bàn Trưng Bày Gốm Cổ Hoàng Triều & Cây Thế Nghệ Thuật',
      subtitle: 'Bộ sưu tập gốm Chu Đậu, Bát Tràng men lam thế kỷ XV và cây thế Bonsai cung đình',
      poem: [
        '“Đất nung nên sắc ngọc ngà,',
        'Men lam óng ánh tinh hoa ngàn đời.',
        'Cây tùng vươn thế tuyệt vời,',
        'Dáng rồng bay lượn giữa trời xuân sang.”'
      ],
      description: 'Cụm bàn trưng bày gỗ cẩm lai tròn bên cánh gà đại sảnh hội tụ những tinh hoa gốm sứ Việt qua các triều đại Lý - Trần - Lê - Nguyễn: bình hoa lam Chu Đậu vẽ họa tiết chim chích chòe, đĩa gốm đại men rạn Bát Tràng khảm lưỡng long chầu nguyệt, hòa cùng chậu cây thế bonsai tùng bách uốn lượn phong thủy mang sinh khí thanh cao cho không gian bảo tàng.'
    }
  });
}

// ============================================================================
// GEOMETRY SANITIZATION & SAFE NORMALS (SELF-HEALING 60+ FPS)
// ============================================================================
function prepareSafeGeometry(geo) {
  if (!geo) return geo;
  try {
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    const pos = geo.attributes.position;
    if (pos) {
      for (let i = 0; i < pos.count * pos.itemSize; i++) {
        if (!isFinite(pos.array[i])) pos.array[i] = 0;
      }
    }
  } catch (_) {}
  return geo;
}

// ============================================================================
// CACHE CANVAS TEXTURE
// ============================================================================
const SP_TEX_CACHE = {};

function getEnrichmentTex(key, w, h, drawFn, repeatX = 1, repeatY = 1) {
  if (SP_TEX_CACHE[key]) return SP_TEX_CACHE[key];
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
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  if ('colorSpace' in tex && THREE.SRGBColorSpace) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  SP_TEX_CACHE[key] = tex;
  return tex;
}

export function getSoftCircleParticleTex() {
  return getEnrichmentTex('particle_soft_radial_circle', 64, 64, (ctx, w, h) => {
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.35, 'rgba(255, 255, 255, 0.85)');
    grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.25)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
}

// ============================================================================
// PROCEDURAL AUDIO: TIẾNG ĐÀN TRANH NGŨ CUNG THANH TAO (WEB AUDIO API BUFFER)
// ============================================================================
let _cachedDanTranhAudioBuffer = null;

function createDanTranhAudioBuffer(audioCtx) {
  if (!audioCtx) return null;
  if (_cachedDanTranhAudioBuffer) return _cachedDanTranhAudioBuffer;

  const sampleRate = audioCtx.sampleRate || 44100;
  const duration = 8.0; // Vòng lặp 8 giây nhã nhạc ngũ cung
  const length = Math.floor(sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  // Thang âm ngũ cung Bắc (Hò Xự Xang Xê Cống): C4, D4, F4, G4, A4, C5, D5, F5
  const notes = [
    { time: 0.2, freq: 261.63, dur: 2.2, amp: 0.38, vibratoFreq: 5.2, vibratoAmp: 0.015 }, // C4 (Hò)
    { time: 1.1, freq: 349.23, dur: 1.8, amp: 0.32, vibratoFreq: 5.8, vibratoAmp: 0.018 }, // F4 (Xang)
    { time: 2.0, freq: 392.00, dur: 2.4, amp: 0.40, vibratoFreq: 5.5, vibratoAmp: 0.022 }, // G4 (Xê)
    { time: 3.2, freq: 440.00, dur: 1.6, amp: 0.30, vibratoFreq: 6.0, vibratoAmp: 0.016 }, // A4 (Cống)
    { time: 4.1, freq: 523.25, dur: 2.1, amp: 0.36, vibratoFreq: 5.4, vibratoAmp: 0.020 }, // C5 (Hò cao)
    { time: 5.3, freq: 587.33, dur: 1.5, amp: 0.28, vibratoFreq: 6.2, vibratoAmp: 0.014 }, // D5 (Xự cao)
    { time: 6.2, freq: 392.00, dur: 1.6, amp: 0.32, vibratoFreq: 5.5, vibratoAmp: 0.018 }  // G4 ngân kết
  ];

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    let sample = 0;

    for (let n = 0; n < notes.length; n++) {
      const note = notes[n];
      const dt = t - note.time;
      if (dt >= 0 && dt < note.dur) {
        // Tiếng gảy dây đàn tranh: Decay mũ kết hợp sóng hài phong phú
        const env = Math.exp(-dt * 3.2) * (1.0 - Math.exp(-dt * 65.0));
        const vib = Math.sin(2 * Math.PI * note.vibratoFreq * dt) * note.vibratoAmp * (dt > 0.25 ? 1 : dt * 4);
        const f = note.freq * (1.0 + vib);

        // Hài âm đàn tranh kim khí ngân vang
        const h1 = Math.sin(2 * Math.PI * f * dt);
        const h2 = Math.sin(2 * Math.PI * f * 2 * dt) * 0.45;
        const h3 = Math.sin(2 * Math.PI * f * 3 * dt) * 0.22;
        const h4 = Math.sin(2 * Math.PI * f * 4 * dt) * 0.12;
        const h5 = Math.sin(2 * Math.PI * f * 5 * dt) * 0.06;

        sample += (h1 + h2 + h3 + h4 + h5) * env * note.amp;
      }
    }

    // Khử click nối vòng lặp (crossfade 0.15s)
    const fadeLen = 0.15;
    if (t < fadeLen) {
      sample *= (t / fadeLen);
    } else if (t > duration - fadeLen) {
      sample *= ((duration - t) / fadeLen);
    }

    data[i] = sample;
  }

  _cachedDanTranhAudioBuffer = buffer;
  return buffer;
}

function attachDanTranhPositionalAudio(anchorObj, audioManager) {
  if (typeof window === 'undefined') return null;

  const spatial = audioManager || window.__spatialAudio || window.__audioManager;
  const listener = spatial?.listener || window.__audioListener;
  if (!listener) return null;

  try {
    const posAudio = new THREE.PositionalAudio(listener);
    posAudio.setRefDistance(3.5);
    posAudio.setMaxDistance(22.0);
    posAudio.setRolloffFactor(1.0);
    posAudio.setVolume(0.55);
    posAudio.setLoop(true);
    anchorObj.add(posAudio);

    const activate = () => {
      const ctx = listener.context;
      if (!ctx) return;
      if (!posAudio.buffer) {
        const buf = createDanTranhAudioBuffer(ctx);
        if (buf) posAudio.setBuffer(buf);
      }
      if (posAudio.buffer && !posAudio.isPlaying) {
        try {
          posAudio.play();
        } catch (_) {}
      }
    };

    if (listener.context?.state === 'running') {
      activate();
    } else {
      const unlockAudio = () => {
        if (listener.context?.state === 'suspended') {
          listener.context.resume().then(activate).catch(() => {});
        } else {
          activate();
        }
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('click', unlockAudio);
      };
      window.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
      window.addEventListener('keydown', unlockAudio, { once: true, passive: true });
      window.addEventListener('click', unlockAudio, { once: true, passive: true });
    }

    return posAudio;
  } catch (err) {
    console.warn('[SpaceEnrichment] DanTranh Audio error:', err);
    return null;
  }
}

// ============================================================================
// MATERIAL FACTORIES (PBR & SHADERS)
// ============================================================================
function getLimWoodMaterial() {
  const tex = getEnrichmentTex('lim_wood_tex', 512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#26120b';
    ctx.fillRect(0, 0, w, h);
    // Vân gỗ lim sẫm bóng
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(56, 26, 15, 0.45)' : 'rgba(18, 8, 4, 0.55)';
      ctx.fillRect(0, i * (h / 40), w, h / 45);
    }
    // Vệt thớ gỗ dọc tự nhiên
    ctx.strokeStyle = 'rgba(120, 53, 15, 0.25)';
    ctx.lineWidth = 1.5;
    for (let x = 0; x < w; x += 18) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 10, h * 0.3, x - 10, h * 0.7, x + 4, h);
      ctx.stroke();
    }
  });

  return new THREE.MeshStandardMaterial({
    map: tex,
    color: 0x3d1c12,
    roughness: 0.35,
    metalness: 0.22
  });
}

function getGoldReliefMaterial() {
  const tex = getEnrichmentTex('gold_lacquer_relief_tex', 512, 512, (ctx, w, h) => {
    // Nền sơn mài then đỏ đen hoàng gia
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#1c0707');
    bgGrad.addColorStop(0.5, '#3b0a0a');
    bgGrad.addColorStop(1, '#180404');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Khung viền chỉ vàng chạm khắc hồi văn
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 6;
    ctx.strokeRect(16, 16, w - 32, h - 32);

    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(28, 28, w - 56, h - 56);

    // Họa tiết hoa sen vàng & mây lượn Tứ Linh
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 70, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ca8a04';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 55, 0, Math.PI * 2);
    ctx.fill();

    // 8 cánh sen dát vàng tỏa ra xung quanh
    for (let a = 0; a < 8; a++) {
      const angle = (a * Math.PI) / 4;
      const px = w / 2 + Math.cos(angle) * 110;
      const py = h / 2 + Math.sin(angle) * 110;
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(px, py, 26, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  return new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.32,
    metalness: 0.72,
    emissive: 0x713f12,
    emissiveIntensity: 0.35
  });
}

function getAntiqueBronzeMaterial() {
  const tex = getEnrichmentTex('antique_bronze_patina_tex', 512, 512, (ctx, w, h) => {
    // Nền đồng sẫm cổ kính
    ctx.fillStyle = '#3f2c1d';
    ctx.fillRect(0, 0, w, h);

    // Vệt rỉ đồng patin xanh ngọc (verdigris)
    for (let i = 0; i < 45; i++) {
      const cx = Math.random() * w;
      const cy = Math.random() * h;
      const rad = 15 + Math.random() * 45;
      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, rad);
      grad.addColorStop(0, 'rgba(45, 212, 191, 0.45)');
      grad.addColorStop(0.6, 'rgba(13, 148, 136, 0.25)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    // Đốm kim loại đồng ánh vàng tại các mép mài
    ctx.fillStyle = 'rgba(253, 224, 71, 0.35)';
    for (let j = 0; j < 30; j++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, 3 + Math.random() * 8, 2);
    }
  });

  return new THREE.MeshStandardMaterial({
    map: tex,
    color: 0x5a4838,
    roughness: 0.48,
    metalness: 0.82
  });
}

function getBlueWhitePorcelainMaterial() {
  const tex = getEnrichmentTex('blue_white_porcelain_tex', 512, 512, (ctx, w, h) => {
    // Sứ trắng men ngọc Bát Tràng
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, w, h);

    // Họa tiết hoa lam Bát Tràng vẽ tay
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    ctx.fillStyle = '#1e40af';
    for (let y = 60; y < h - 40; y += 70) {
      for (let x = 60; x < w - 40; x += 70) {
        ctx.beginPath();
        ctx.arc(x, y, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  });

  return new THREE.MeshStandardMaterial({
    map: tex,
    color: 0xffffff,
    roughness: 0.12,
    metalness: 0.15
  });
}

function getBlackMarbleMaterial() {
  const tex = getEnrichmentTex('nero_marquina_black_marble_tex', 512, 512, (ctx, w, h) => {
    // Nền cẩm thạch đen tuyền sâu thẳm
    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#0a0d12');
    bgGrad.addColorStop(0.5, '#131820');
    bgGrad.addColorStop(1, '#090b0e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Các dải vân mây cẩm thạch trắng xám ngọc & chỉ vàng kim
    const veinColors = [
      'rgba(241, 245, 249, 0.65)',
      'rgba(203, 213, 225, 0.45)',
      'rgba(254, 240, 138, 0.35)',
      'rgba(255, 255, 255, 0.25)'
    ];

    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = veinColors[i % veinColors.length];
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      let sx = (i % 2 === 0 ? 0 : w * 0.3);
      let sy = (i * h) / 7 + 15;
      ctx.moveTo(sx, sy);
      for (let s = 1; s <= 4; s++) {
        let ex = sx + (w / 4);
        let ey = sy + (s % 2 === 0 ? 30 : -25);
        let cpx = (sx + ex) / 2 + (s % 2 === 0 ? -15 : 20);
        let cpy = (sy + ey) / 2 + (s % 2 === 0 ? 25 : -15);
        ctx.quadraticCurveTo(cpx, cpy, ex, ey);
        sx = ex;
        sy = ey;
      }
      ctx.stroke();

      // Nhánh vân tơ phụ
      ctx.lineWidth = 1.0;
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.28)';
      ctx.beginPath();
      ctx.moveTo(sx * 0.6, sy);
      ctx.lineTo(sx * 0.6 + 40, sy + 18);
      ctx.stroke();
    }
  });

  return new THREE.MeshStandardMaterial({
    map: tex,
    color: 0x1f242d,
    roughness: 0.18,
    metalness: 0.25
  });
}

// ============================================================================
// HẠNG MỤC 2: BÌNH PHONG GỖ LIM 4 CÁNH ZICZAC CHẠM LỘNG TỨ LINH
// ============================================================================
function createFoldingScreen() {
  const screenGroup = new THREE.Group();
  screenGroup.name = 'Carved_Lim_Folding_Screen';

  const limMat = getLimWoodMaterial();
  const reliefMat = getGoldReliefMaterial();

  const numLeaves = 4;
  const leafW = 0.72;
  const leafH = 2.45;
  const leafD = 0.055;
  const foldAngle = 0.32; // Ziczac ~18 độ

  let currentX = -(numLeaves * leafW) / 2 + leafW / 2;

  for (let i = 0; i < numLeaves; i++) {
    const leaf = new THREE.Group();
    leaf.name = `Screen_Leaf_${i + 1}`;

    // Khung gỗ lim bao quanh
    const frameMesh = new THREE.Mesh(
      new THREE.BoxGeometry(leafW, leafH, leafD),
      limMat
    );
    frameMesh.userData.ignoreRaycaster = true;
    leaf.add(frameMesh);

    // Lòng bình phong chạm lộng hoa văn sơn mài dát vàng
    const panelMesh = new THREE.Mesh(
      new THREE.BoxGeometry(leafW - 0.12, leafH - 0.22, leafD + 0.008),
      reliefMat
    );
    panelMesh.userData.ignoreRaycaster = true;
    leaf.add(panelMesh);

    // Chân đế chạm mây cuộn
    const footLeft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.065, 0.18, 8),
      limMat
    );
    footLeft.position.set(-leafW / 2 + 0.08, -leafH / 2 - 0.09, 0);
    footLeft.userData.ignoreRaycaster = true;

    const footRight = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.065, 0.18, 8),
      limMat
    );
    footRight.position.set(leafW / 2 - 0.08, -leafH / 2 - 0.09, 0);
    footRight.userData.ignoreRaycaster = true;

    leaf.add(footLeft, footRight);

    // Góc gập ziczac
    const rot = (i % 2 === 0 ? 1 : -1) * foldAngle;
    leaf.rotation.y = rot;
    leaf.position.set(currentX, leafH / 2 + 0.18, (i % 2 === 0 ? 1 : -1) * 0.12);

    currentX += leafW * Math.cos(foldAngle);
    screenGroup.add(leaf);
  }

  return screenGroup;
}

// ============================================================================
// HẠNG MỤC 2: TÀNG KINH CÁC THU NHỎ (2 KỆ SÁCH CỔ CAO NHIỀU TẦNG)
// ============================================================================
function createAntiqueHeritageBookcase() {
  const caseGroup = new THREE.Group();
  caseGroup.name = 'Heritage_Antique_Bookcase';

  const limMat = getLimWoodMaterial();
  const width = 2.6;
  const height = 3.2;
  const depth = 0.58;
  const tiers = 4;

  // Khung cột & tấm vách chính
  const backPanel = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, 0.04),
    limMat
  );
  backPanel.position.set(0, height / 2, -depth / 2 + 0.02);
  backPanel.userData.ignoreRaycaster = true;
  caseGroup.add(backPanel);

  // 2 Vách hồi 2 bên
  const sideGeo = new THREE.BoxGeometry(0.06, height, depth);
  const leftSide = new THREE.Mesh(sideGeo, limMat);
  leftSide.position.set(-width / 2 + 0.03, height / 2, 0);
  leftSide.userData.ignoreRaycaster = true;

  const rightSide = new THREE.Mesh(sideGeo, limMat);
  rightSide.position.set(width / 2 - 0.03, height / 2, 0);
  rightSide.userData.ignoreRaycaster = true;

  // Nóc chạm hoa văn hồi văn & chân kệ
  const topCrown = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.16, 0.16, depth + 0.12),
    getGoldReliefMaterial()
  );
  topCrown.position.set(0, height + 0.08, 0);
  topCrown.userData.ignoreRaycaster = true;

  const basePlinth = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.1, 0.22, depth + 0.08),
    limMat
  );
  basePlinth.position.set(0, 0.11, 0);
  basePlinth.userData.ignoreRaycaster = true;

  caseGroup.add(leftSide, rightSide, topCrown, basePlinth);

  // Các đợt ngang & đồ vật trưng bày trên từng tầng
  const shelfTierH = (height - 0.3) / tiers;
  const scrollMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.65 });
  const bambooMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.55 });
  const bookCoverColors = [0x991b1b, 0x1e3a8a, 0x166534, 0x78350f, 0x4c1d95];

  for (let t = 0; t <= tiers; t++) {
    const shelfY = 0.22 + t * shelfTierH;
    const shelfMesh = new THREE.Mesh(
      new THREE.BoxGeometry(width - 0.08, 0.045, depth - 0.04),
      limMat
    );
    shelfMesh.position.set(0, shelfY, 0);
    shelfMesh.userData.ignoreRaycaster = true;
    caseGroup.add(shelfMesh);

    // Bố trí hiện vật trên mặt đợt
    if (t < tiers) {
      const itemY = shelfY + 0.025;

      // 1. Chồng sách chữ Nôm chỉ ngũ sắc
      const stackCount = 2 + (t % 2);
      for (let s = 0; s < stackCount; s++) {
        const bookW = 0.24;
        const bookL = 0.34;
        const bookH = 0.045;
        const bookMat = new THREE.MeshStandardMaterial({
          color: bookCoverColors[(t + s) % bookCoverColors.length],
          roughness: 0.42
        });
        const bookMesh = new THREE.Mesh(
          new THREE.BoxGeometry(bookW, bookH, bookL),
          bookMat
        );
        bookMesh.position.set(-0.85 + s * 0.35, itemY + bookH / 2 + s * 0.046, -0.05);
        bookMesh.rotation.y = (s % 2 === 0 ? 0.08 : -0.06);
        bookMesh.userData.ignoreRaycaster = true;
        caseGroup.add(bookMesh);
      }

      // 2. Thẻ tre cổ xâu chỉ bó gọn
      const bambooBundle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.085, 0.085, 0.32, 10),
        bambooMat
      );
      bambooBundle.rotation.z = Math.PI / 2;
      bambooBundle.position.set(0.18, itemY + 0.09, -0.05);
      bambooBundle.userData.ignoreRaycaster = true;
      caseGroup.add(bambooBundle);

      // 3. Cuộn trục thư pháp bằng gấm lụa cuộn tròn
      for (let r = 0; r < 3; r++) {
        const roll = new THREE.Mesh(
          new THREE.CylinderGeometry(0.038, 0.038, 0.38, 12),
          scrollMat
        );
        roll.rotation.z = Math.PI / 2;
        roll.position.set(0.65, itemY + 0.04 + r * 0.075, -0.08 + r * 0.05);
        roll.userData.ignoreRaycaster = true;
        caseGroup.add(roll);
      }

      // 4. Hộp sơn mài then cẩn xà cừ
      const boxMesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.16, 0.24),
        getGoldReliefMaterial()
      );
      boxMesh.position.set(0.95, itemY + 0.08, -0.05);
      boxMesh.userData.ignoreRaycaster = true;
      caseGroup.add(boxMesh);
    }
  }

  // Đèn LED vàng ấm rọi dịu từng tầng
  const ledLight = new THREE.PointLight(0xfef08a, 0.65, 4.2, 1.8);
  ledLight.position.set(0, height * 0.7, 0.3);
  ledLight.userData.ignoreRaycaster = true;
  caseGroup.add(ledLight);

  return caseGroup;
}

// ============================================================================
// HẠNG MỤC 2: 2 ĐẠI BỆ TRÒN CẨM THẠCH ĐEN (R = 2.2m, H = 0.45m)
// TRÊN MỖI BỆ: 1 ĐỈNH ĐỒNG NGHÊ BỐC KHÓI, 2 HẠC THỜ CƯỠI RÙA & 1 BONSAI TÙNG BÁCH
// ============================================================================
function createGrandBronzePedestalSet(isLeft = true, options = {}) {
  const setGroup = new THREE.Group();
  setGroup.name = isLeft ? 'Grand_Black_Marble_Pedestal_Set_West' : 'Grand_Black_Marble_Pedestal_Set_East';

  const marbleMat = getBlackMarbleMaterial();
  const bronzeMat = getAntiqueBronzeMaterial();
  const porcelainMat = getBlueWhitePorcelainMaterial();
  const limMat = getLimWoodMaterial();
  const goldAccMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.25,
    metalness: 0.88
  });

  // 1. ĐẠI BỆ TRÒN CẨM THẠCH ĐEN LỚN (RADIUS 2.2m, HEIGHT 0.45m)
  const pedestalGeo = prepareSafeGeometry(new THREE.CylinderGeometry(2.2, 2.2, 0.45, 36));
  const pedestalMesh = new THREE.Mesh(pedestalGeo, marbleMat);
  pedestalMesh.position.y = 0.225;
  pedestalMesh.userData.ignoreRaycaster = true;
  pedestalMesh.castShadow = false;
  pedestalMesh.receiveShadow = false;
  setGroup.add(pedestalMesh);

  // Vành chân bệ cẩm thạch nẹp đồng cổ (Moulding base)
  const baseRimGeo = prepareSafeGeometry(new THREE.CylinderGeometry(2.26, 2.3, 0.08, 36));
  const baseRim = new THREE.Mesh(baseRimGeo, goldAccMat);
  baseRim.position.y = 0.04;
  baseRim.userData.ignoreRaycaster = true;
  baseRim.castShadow = false;
  baseRim.receiveShadow = false;
  setGroup.add(baseRim);

  // Vành mép trên vát cạnh dát chỉ đồng (Bevelled top lip)
  const topLipGeo = prepareSafeGeometry(new THREE.CylinderGeometry(2.23, 2.18, 0.06, 36));
  const topLip = new THREE.Mesh(topLipGeo, goldAccMat);
  topLip.position.y = 0.42;
  topLip.userData.ignoreRaycaster = true;
  topLip.castShadow = false;
  topLip.receiveShadow = false;
  setGroup.add(topLip);

  // Vòng hoa văn sen vàng Đông Sơn khảm chìm trên mặt bệ đá
  const inlayTex = getEnrichmentTex('pedestal_top_inlay', 512, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2;
    const cy = h / 2;
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 210, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, 180, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 16; i++) {
      const ang = (i * Math.PI * 2) / 16;
      const px = cx + Math.cos(ang) * 195;
      const py = cy + Math.sin(ang) * 195;
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  const inlayMesh = new THREE.Mesh(
    prepareSafeGeometry(new THREE.PlaneGeometry(3.6, 3.6)),
    new THREE.MeshStandardMaterial({
      map: inlayTex,
      transparent: true,
      opacity: 0.65,
      roughness: 0.3,
      metalness: 0.75
    })
  );
  inlayMesh.rotation.x = -Math.PI / 2;
  inlayMesh.position.y = 0.452;
  inlayMesh.userData.ignoreRaycaster = true;
  setGroup.add(inlayMesh);

  // 2. ĐỈNH ĐỒNG CỔ LỚN CÓ NẮP CHẠM NGHÊ BỐC KHÓI TRẦM (TÂM BỆ)
  const burnerGroup = new THREE.Group();
  burnerGroup.name = 'Grand_Antique_Bronze_Tripod_Urn';
  burnerGroup.position.set(0, 0.45, -0.15);

  // 3 Chân Quỳ Tam Lân uốn cong bề thế
  for (let c = 0; c < 3; c++) {
    const angle = (c * Math.PI * 2) / 3;
    const legGeo = prepareSafeGeometry(new THREE.CylinderGeometry(0.065, 0.12, 0.44, 10));
    const leg = new THREE.Mesh(legGeo, bronzeMat);
    leg.position.set(Math.cos(angle) * 0.32, 0.22, Math.sin(angle) * 0.32);
    leg.rotation.z = Math.cos(angle) * 0.32;
    leg.rotation.x = Math.sin(angle) * -0.32;
    leg.userData.ignoreRaycaster = true;
    burnerGroup.add(leg);

    // Móng vuốt lân bám bệ
    const clawGeo = prepareSafeGeometry(new THREE.SphereGeometry(0.08, 8, 8));
    const claw = new THREE.Mesh(clawGeo, goldAccMat);
    claw.position.set(Math.cos(angle) * 0.42, 0.05, Math.sin(angle) * 0.42);
    claw.userData.ignoreRaycaster = true;
    burnerGroup.add(claw);
  }

  // Bụng đỉnh tròn phình chạm nổi thao thiết uy nghiêm
  const bodyGeo = prepareSafeGeometry(new THREE.SphereGeometry(0.48, 20, 16));
  const bodyMesh = new THREE.Mesh(bodyGeo, bronzeMat);
  bodyMesh.position.y = 0.62;
  bodyMesh.scale.set(1.25, 0.92, 1.25);
  bodyMesh.userData.ignoreRaycaster = true;
  burnerGroup.add(bodyMesh);

  // Cổ đỉnh nẹp chỉ vàng chạm hồi văn
  const neckRingGeo = prepareSafeGeometry(new THREE.CylinderGeometry(0.44, 0.48, 0.14, 24));
  const neckRing = new THREE.Mesh(neckRingGeo, bronzeMat);
  neckRing.position.y = 0.98;
  neckRing.userData.ignoreRaycaster = true;
  burnerGroup.add(neckRing);

  const goldRimGeo = prepareSafeGeometry(new THREE.CylinderGeometry(0.46, 0.46, 0.04, 24));
  const goldRim = new THREE.Mesh(goldRimGeo, goldAccMat);
  goldRim.position.y = 1.05;
  goldRim.userData.ignoreRaycaster = true;
  burnerGroup.add(goldRim);

  // Đôi tai mây rồng lượn hai bên
  const earGeo = prepareSafeGeometry(new THREE.TorusGeometry(0.18, 0.048, 10, 20, Math.PI * 1.15));
  const leftEar = new THREE.Mesh(earGeo, bronzeMat);
  leftEar.position.set(-0.58, 0.74, 0);
  leftEar.rotation.z = -Math.PI / 2.1;
  leftEar.userData.ignoreRaycaster = true;

  const rightEar = new THREE.Mesh(earGeo, bronzeMat);
  rightEar.position.set(0.58, 0.74, 0);
  rightEar.rotation.z = Math.PI / 2.1;
  rightEar.userData.ignoreRaycaster = true;
  burnerGroup.add(leftEar, rightEar);

  // Nắp đỉnh hình vòm đúc thủng hoa văn thoát khói trầm
  const lidGeo = prepareSafeGeometry(new THREE.ConeGeometry(0.42, 0.35, 18));
  const lidMesh = new THREE.Mesh(lidGeo, bronzeMat);
  lidMesh.position.y = 1.22;
  lidMesh.userData.ignoreRaycaster = true;
  burnerGroup.add(lidMesh);

  // Tượng Nghê Vờn Ngọc mạ vàng trên đỉnh nắp
  const ngheBodyGeo = prepareSafeGeometry(new THREE.DodecahedronGeometry(0.13, 1));
  const ngheBody = new THREE.Mesh(ngheBodyGeo, goldAccMat);
  ngheBody.position.y = 1.45;
  ngheBody.userData.ignoreRaycaster = true;

  const ngheHeadGeo = prepareSafeGeometry(new THREE.SphereGeometry(0.08, 10, 10));
  const ngheHead = new THREE.Mesh(ngheHeadGeo, goldAccMat);
  ngheHead.position.set(0, 1.55, 0.06);
  ngheHead.userData.ignoreRaycaster = true;

  const jewelGeo = prepareSafeGeometry(new THREE.SphereGeometry(0.06, 12, 12));
  const jewelMesh = new THREE.Mesh(
    jewelGeo,
    new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0x991b1b,
      emissiveIntensity: 0.55,
      roughness: 0.15,
      metalness: 0.6
    })
  );
  jewelMesh.position.set(0, 1.44, 0.14);
  jewelMesh.userData.ignoreRaycaster = true;
  burnerGroup.add(ngheBody, ngheHead, jewelMesh);

  setGroup.add(burnerGroup);

  // 3. ĐÔI HẠC THỜ BẰNG ĐỒNG ĐỨNG TRÊN LƯNG RÙA NGẬM HOA SEN HAI BÊN
  const createGrandCraneOnTurtle = (isCraneLeft) => {
    const craneGroup = new THREE.Group();
    craneGroup.name = isCraneLeft ? 'Grand_Crane_Left' : 'Grand_Crane_Right';
    const offsetX = isCraneLeft ? -1.15 : 1.15;
    craneGroup.position.set(offsetX, 0.45, -0.05);
    craneGroup.rotation.y = isCraneLeft ? 0.38 : -0.38;

    // Rùa thần Kim Quy bằng đồng
    const turtleShellGeo = prepareSafeGeometry(new THREE.SphereGeometry(0.3, 14, 10));
    const turtleShell = new THREE.Mesh(turtleShellGeo, bronzeMat);
    turtleShell.scale.set(1.22, 0.45, 1.48);
    turtleShell.position.y = 0.12;
    turtleShell.userData.ignoreRaycaster = true;

    const turtleHeadGeo = prepareSafeGeometry(new THREE.CylinderGeometry(0.055, 0.05, 0.22, 8));
    const turtleHead = new THREE.Mesh(turtleHeadGeo, bronzeMat);
    turtleHead.rotation.x = Math.PI / 4;
    turtleHead.position.set(0, 0.16, 0.32);
    turtleHead.userData.ignoreRaycaster = true;

    const legGeo = prepareSafeGeometry(new THREE.CylinderGeometry(0.04, 0.06, 0.12, 6));
    const tl1 = new THREE.Mesh(legGeo, bronzeMat); tl1.position.set(-0.24, 0.06, 0.22);
    const tl2 = new THREE.Mesh(legGeo, bronzeMat); tl2.position.set(0.24, 0.06, 0.22);
    const tl3 = new THREE.Mesh(legGeo, bronzeMat); tl3.position.set(-0.24, 0.06, -0.22);
    const tl4 = new THREE.Mesh(legGeo, bronzeMat); tl4.position.set(0.24, 0.06, -0.22);
    tl1.userData.ignoreRaycaster = true; tl2.userData.ignoreRaycaster = true;
    tl3.userData.ignoreRaycaster = true; tl4.userData.ignoreRaycaster = true;

    craneGroup.add(turtleShell, turtleHead, tl1, tl2, tl3, tl4);

    // Đôi chân hạc mảnh mai cao vút
    const craneLegGeo = prepareSafeGeometry(new THREE.CylinderGeometry(0.02, 0.02, 1.05, 8));
    const leftLeg = new THREE.Mesh(craneLegGeo, bronzeMat);
    leftLeg.position.set(-0.075, 0.65, 0);
    leftLeg.userData.ignoreRaycaster = true;

    const rightLeg = new THREE.Mesh(craneLegGeo, bronzeMat);
    rightLeg.position.set(0.075, 0.65, 0);
    rightLeg.userData.ignoreRaycaster = true;
    craneGroup.add(leftLeg, rightLeg);

    // Thân hạc thuôn dài uyển chuyển
    const bGeo = prepareSafeGeometry(new THREE.ConeGeometry(0.18, 0.58, 10));
    const craneBody = new THREE.Mesh(bGeo, bronzeMat);
    craneBody.rotation.x = -Math.PI / 3.2;
    craneBody.position.set(0, 1.25, 0.06);
    craneBody.userData.ignoreRaycaster = true;

    const wingGeo = prepareSafeGeometry(new THREE.BoxGeometry(0.04, 0.42, 0.24));
    const leftWing = new THREE.Mesh(wingGeo, bronzeMat);
    leftWing.position.set(-0.16, 1.25, 0.06);
    leftWing.rotation.z = 0.15;
    leftWing.userData.ignoreRaycaster = true;

    const rightWing = new THREE.Mesh(wingGeo, bronzeMat);
    rightWing.position.set(0.16, 1.25, 0.06);
    rightWing.rotation.z = -0.15;
    rightWing.userData.ignoreRaycaster = true;
    craneGroup.add(craneBody, leftWing, rightWing);

    // Cổ hạc uốn lượn chữ S
    const neckGeo = prepareSafeGeometry(new THREE.CylinderGeometry(0.03, 0.036, 0.55, 10));
    const neck = new THREE.Mesh(neckGeo, bronzeMat);
    neck.rotation.x = 0.26;
    neck.position.set(0, 1.62, 0.18);
    neck.userData.ignoreRaycaster = true;

    // Đầu hạc & mào phượng thếp vàng
    const headGeo = prepareSafeGeometry(new THREE.SphereGeometry(0.055, 10, 10));
    const head = new THREE.Mesh(headGeo, goldAccMat);
    head.position.set(0, 1.88, 0.26);
    head.userData.ignoreRaycaster = true;

    // Mỏ ngậm cành sen vàng vươn cao
    const lotusStemGeo = prepareSafeGeometry(new THREE.CylinderGeometry(0.012, 0.012, 0.38, 8));
    const lotusStem = new THREE.Mesh(lotusStemGeo, goldAccMat);
    lotusStem.position.set(0, 1.98, 0.36);
    lotusStem.rotation.x = Math.PI / 4;
    lotusStem.userData.ignoreRaycaster = true;

    const lotusBudGeo = prepareSafeGeometry(new THREE.ConeGeometry(0.055, 0.14, 8));
    const lotusBud = new THREE.Mesh(lotusBudGeo, goldAccMat);
    lotusBud.position.set(0, 2.12, 0.46);
    lotusBud.rotation.x = Math.PI / 4;
    lotusBud.userData.ignoreRaycaster = true;

    craneGroup.add(neck, head, lotusStem, lotusBud);
    return craneGroup;
  };

  setGroup.add(createGrandCraneOnTurtle(true));
  setGroup.add(createGrandCraneOnTurtle(false));

  // 4. CHẬU CÂY BONSAI TÙNG BÁCH UỐN THẾ (TRÊN MẶT BỆ)
  const bonsaiGroup = new THREE.Group();
  bonsaiGroup.name = 'Imperial_Bonsai_Pine_Tree';
  bonsaiGroup.position.set(isLeft ? 0.35 : -0.35, 0.45, 0.85);

  const potW = 0.82;
  const potH = 0.26;
  const potD = 0.58;
  const potGeo = prepareSafeGeometry(new THREE.BoxGeometry(potW, potH, potD));
  const potMesh = new THREE.Mesh(potGeo, porcelainMat);
  potMesh.position.y = potH / 2;
  potMesh.userData.ignoreRaycaster = true;
  bonsaiGroup.add(potMesh);

  // 4 chân chậu sứ
  const potFootGeo = prepareSafeGeometry(new THREE.CylinderGeometry(0.04, 0.03, 0.06, 6));
  const pFoot1 = new THREE.Mesh(potFootGeo, porcelainMat); pFoot1.position.set(-potW / 2 + 0.06, -0.02, -potD / 2 + 0.06);
  const pFoot2 = new THREE.Mesh(potFootGeo, porcelainMat); pFoot2.position.set(potW / 2 - 0.06, -0.02, -potD / 2 + 0.06);
  const pFoot3 = new THREE.Mesh(potFootGeo, porcelainMat); pFoot3.position.set(-potW / 2 + 0.06, -0.02, potD / 2 - 0.06);
  const pFoot4 = new THREE.Mesh(potFootGeo, porcelainMat); pFoot4.position.set(potW / 2 - 0.06, -0.02, potD / 2 - 0.06);
  pFoot1.userData.ignoreRaycaster = true; pFoot2.userData.ignoreRaycaster = true;
  pFoot3.userData.ignoreRaycaster = true; pFoot4.userData.ignoreRaycaster = true;
  bonsaiGroup.add(pFoot1, pFoot2, pFoot3, pFoot4);

  // Lớp đất rêu phong
  const soilGeo = prepareSafeGeometry(new THREE.PlaneGeometry(potW - 0.06, potD - 0.06));
  const soilMesh = new THREE.Mesh(
    soilGeo,
    new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.95 })
  );
  soilMesh.rotation.x = -Math.PI / 2;
  soilMesh.position.y = potH + 0.005;
  soilMesh.userData.ignoreRaycaster = true;
  bonsaiGroup.add(soilMesh);

  // Đá non bộ điểm xuyết
  const rockGeo = prepareSafeGeometry(new THREE.DodecahedronGeometry(0.1, 0));
  const rockMesh = new THREE.Mesh(rockGeo, new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.85 }));
  rockMesh.position.set(-0.22, potH + 0.08, 0.12);
  rockMesh.userData.ignoreRaycaster = true;
  bonsaiGroup.add(rockMesh);

  // Thân cây Tùng già u sần uốn lượn
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3e2014, roughness: 0.88 });
  const trunkGeo = prepareSafeGeometry(new THREE.CylinderGeometry(0.075, 0.14, 0.65, 8));
  const trunk = new THREE.Mesh(trunkGeo, trunkMat);
  trunk.position.set(0.05, potH + 0.32, 0);
  trunk.rotation.z = isLeft ? -0.22 : 0.22;
  trunk.userData.ignoreRaycaster = true;
  bonsaiGroup.add(trunk);

  // Cành vươn nghiêng thế Nghinh Phong
  const b1Geo = prepareSafeGeometry(new THREE.CylinderGeometry(0.045, 0.065, 0.55, 6));
  const branch1 = new THREE.Mesh(b1Geo, trunkMat);
  branch1.position.set(isLeft ? -0.16 : 0.16, potH + 0.62, 0.08);
  branch1.rotation.z = isLeft ? 0.65 : -0.65;
  branch1.userData.ignoreRaycaster = true;

  const b2Geo = prepareSafeGeometry(new THREE.CylinderGeometry(0.038, 0.055, 0.6, 6));
  const branch2 = new THREE.Mesh(b2Geo, trunkMat);
  branch2.position.set(isLeft ? 0.22 : -0.22, potH + 0.72, -0.06);
  branch2.rotation.z = isLeft ? -0.55 : 0.55;
  branch2.userData.ignoreRaycaster = true;
  bonsaiGroup.add(branch1, branch2);

  // 5 Tán lá mây Tùng xanh thẫm
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x0f4c28, roughness: 0.75 });
  const padsData = [
    { x: isLeft ? -0.35 : 0.35, y: potH + 0.82, z: 0.15, r: 0.32, h: 0.09 },
    { x: isLeft ? -0.15 : 0.15, y: potH + 1.05, z: 0.0, r: 0.38, h: 0.11 },
    { x: isLeft ? 0.18 : -0.18, y: potH + 0.92, z: -0.12, r: 0.28, h: 0.08 },
    { x: isLeft ? 0.38 : -0.38, y: potH + 0.78, z: 0.08, r: 0.34, h: 0.09 },
    { x: 0.0, y: potH + 1.22, z: -0.05, r: 0.42, h: 0.12 }
  ];
  padsData.forEach((pd) => {
    const padGeo = prepareSafeGeometry(new THREE.CylinderGeometry(pd.r * 0.85, pd.r, pd.h, 12));
    const padMesh = new THREE.Mesh(padGeo, foliageMat);
    padMesh.position.set(pd.x, pd.y, pd.z);
    padMesh.userData.ignoreRaycaster = true;
    bonsaiGroup.add(padMesh);
  });

  setGroup.add(bonsaiGroup);

  // 5. BẢNG THUYẾT MINH LORE CARD TƯƠNG TÁC
  const labelTex = getEnrichmentTex('label_dinh_dong_hac', 512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#450a0a';
    ctx.fillRect(6, 6, w - 12, h - 12);

    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, w - 24, h - 24);

    ctx.strokeStyle = '#ca8a04';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 24px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText('Đỉnh Đồng Nghê & Hạc Chầu', w / 2, 70);

    ctx.font = '16px "Times New Roman", serif';
    ctx.fillStyle = '#fef3c7';
    ctx.fillText('Bảo Vật Trầm Hương & Cổ Thụ Bonsai', w / 2, 115);

    ctx.font = 'italic 15px sans-serif';
    ctx.fillStyle = '#fde047';
    ctx.fillText('[ Click để xem điển tích văn hiến ]', w / 2, 185);
  });

  const labelGeo = prepareSafeGeometry(new THREE.PlaneGeometry(0.72, 0.36));
  const labelMesh = new THREE.Mesh(
    labelGeo,
    new THREE.MeshBasicMaterial({ map: labelTex, side: THREE.FrontSide })
  );
  labelMesh.position.set(0, 0.32, 2.22);
  labelMesh.userData.loreKey = 'lobby_dinhDongHacChau';
  labelMesh.userData.isLoreArtifact = true;
  labelMesh.userData.ignoreRaycaster = false; // Bật raycast click
  setGroup.add(labelMesh);

  if (options.loreGuide?.registerArtifact) {
    options.loreGuide.registerArtifact(labelMesh, 'lobby_dinhDongHacChau');
  }

  return { setGroup, interactiveMesh: labelMesh, burnerSmokePos: new THREE.Vector3(0, 1.9, -0.15) };
}

export function createBronzeSanctuarySet(options = {}) {
  const res = createGrandBronzePedestalSet(true, options);
  return { setGroup: res.setGroup, burnerWorldPos: res.burnerSmokePos };
}

// ============================================================================
// HẠNG MỤC 2B: 2 CỤM BÀN/BỆ TRÒN TRƯNG BÀY BÊN CÁNH GÀ (X = ±14m, Z = 0m)
// TIỂU CẢNH GỐM CỔ HOÀNG TRIỀU & BONSAI NGHỆ THUẬT
// ============================================================================
function createWingDisplayTables(options = {}) {
  const wingGroup = new THREE.Group();
  wingGroup.name = 'Wing_Round_Exhibition_Tables_Group';

  const limMat = getLimWoodMaterial();
  const porcelainMat = getBlueWhitePorcelainMaterial();
  const goldAccMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.25,
    metalness: 0.85
  });

  const wingPositions = [
    { x: -14.0, z: 0.0, isLeft: true },
    { x: 14.0, z: 0.0, isLeft: false }
  ];

  wingPositions.forEach((pos) => {
    const tableGroup = new THREE.Group();
    tableGroup.name = pos.isLeft ? 'Wing_Table_West' : 'Wing_Table_East';
    tableGroup.position.set(pos.x, 0, pos.z);

    // 1. Bàn gỗ lim cẩm lai tròn (Radius 1.35m, Height 0.76m)
    const tableTopGeo = prepareSafeGeometry(new THREE.CylinderGeometry(1.35, 1.35, 0.06, 32));
    const tableTop = new THREE.Mesh(tableTopGeo, limMat);
    tableTop.position.y = 0.75;
    tableTop.userData.ignoreRaycaster = true;
    tableGroup.add(tableTop);

    // Vành viền đồng thau mép bàn
    const tableRimGeo = prepareSafeGeometry(new THREE.CylinderGeometry(1.37, 1.37, 0.04, 32));
    const tableRim = new THREE.Mesh(tableRimGeo, goldAccMat);
    tableRim.position.y = 0.73;
    tableRim.userData.ignoreRaycaster = true;
    tableGroup.add(tableRim);

    // Chân bàn trụ lớn chạm khắc
    const pillarGeo = prepareSafeGeometry(new THREE.CylinderGeometry(0.32, 0.45, 0.72, 16));
    const pillar = new THREE.Mesh(pillarGeo, limMat);
    pillar.position.y = 0.36;
    pillar.userData.ignoreRaycaster = true;
    tableGroup.add(pillar);

    // 4 Chân quỳ chạm lộng xòe tiếp đất
    for (let f = 0; f < 4; f++) {
      const ang = (f * Math.PI) / 2;
      const footGeo = prepareSafeGeometry(new THREE.BoxGeometry(0.18, 0.16, 0.55));
      const foot = new THREE.Mesh(footGeo, limMat);
      foot.position.set(Math.cos(ang) * 0.45, 0.08, Math.sin(ang) * 0.45);
      foot.rotation.y = -ang;
      foot.userData.ignoreRaycaster = true;
      tableGroup.add(foot);
    }

    // 2. BỘ SƯU TẬP GỐM CỔ HOÀNG TRIỀU TRÊN MẶT BÀN
    // Bình hoa lam Chu Đậu đại (tâm bàn)
    const mainVaseGroup = new THREE.Group();
    mainVaseGroup.position.set(0, 0.78, 0);

    const vaseBodyGeo = prepareSafeGeometry(new THREE.SphereGeometry(0.24, 16, 12));
    const vaseBody = new THREE.Mesh(vaseBodyGeo, porcelainMat);
    vaseBody.scale.set(1.1, 1.35, 1.1);
    vaseBody.position.y = 0.28;
    vaseBody.userData.ignoreRaycaster = true;

    const vaseNeckGeo = prepareSafeGeometry(new THREE.CylinderGeometry(0.09, 0.12, 0.28, 16));
    const vaseNeck = new THREE.Mesh(vaseNeckGeo, porcelainMat);
    vaseNeck.position.y = 0.56;
    vaseNeck.userData.ignoreRaycaster = true;

    const vaseLipGeo = prepareSafeGeometry(new THREE.CylinderGeometry(0.14, 0.08, 0.06, 16));
    const vaseLip = new THREE.Mesh(vaseLipGeo, goldAccMat);
    vaseLip.position.y = 0.71;
    vaseLip.userData.ignoreRaycaster = true;

    mainVaseGroup.add(vaseBody, vaseNeck, vaseLip);
    tableGroup.add(mainVaseGroup);

    // Đĩa gốm cổ đại men rạn đặt trên giá gỗ đứng phía sau
    const plateGeo = prepareSafeGeometry(new THREE.CylinderGeometry(0.32, 0.32, 0.025, 24));
    const plateMesh = new THREE.Mesh(plateGeo, porcelainMat);
    plateMesh.rotation.x = Math.PI / 2.3;
    plateMesh.position.set(0, 1.12, -0.45);
    plateMesh.userData.ignoreRaycaster = true;

    const standGeo = prepareSafeGeometry(new THREE.BoxGeometry(0.38, 0.22, 0.16));
    const standMesh = new THREE.Mesh(standGeo, limMat);
    standMesh.position.set(0, 0.88, -0.45);
    standMesh.userData.ignoreRaycaster = true;
    tableGroup.add(plateMesh, standMesh);

    // 2 Bình gốm hồ lô và tỳ bà nhỏ hai bên
    const vase2Geo = prepareSafeGeometry(new THREE.CylinderGeometry(0.08, 0.14, 0.42, 12));
    const vase2 = new THREE.Mesh(vase2Geo, porcelainMat);
    vase2.position.set(-0.55, 0.78 + 0.21, 0.15);
    vase2.userData.ignoreRaycaster = true;

    const vase3Geo = prepareSafeGeometry(new THREE.SphereGeometry(0.12, 12, 10));
    const vase3 = new THREE.Mesh(vase3Geo, porcelainMat);
    vase3.scale.set(1.0, 1.5, 1.0);
    vase3.position.set(0.55, 0.78 + 0.18, 0.15);
    vase3.userData.ignoreRaycaster = true;
    tableGroup.add(vase2, vase3);

    // 3. TIỂU CẢNH CÂY THẾ / BONSAI NGHỆ THUẬT MINI
    const miniBonsai = new THREE.Group();
    miniBonsai.position.set(pos.isLeft ? 0.52 : -0.52, 0.78, -0.15);

    const mPotGeo = prepareSafeGeometry(new THREE.CylinderGeometry(0.22, 0.16, 0.14, 8));
    const mPot = new THREE.Mesh(mPotGeo, limMat);
    mPot.position.y = 0.07;
    mPot.userData.ignoreRaycaster = true;

    const mTrunkGeo = prepareSafeGeometry(new THREE.CylinderGeometry(0.025, 0.05, 0.42, 6));
    const mTrunk = new THREE.Mesh(mTrunkGeo, new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.85 }));
    mTrunk.rotation.z = pos.isLeft ? -0.35 : 0.35;
    mTrunk.position.set(pos.isLeft ? -0.06 : 0.06, 0.26, 0);
    mTrunk.userData.ignoreRaycaster = true;

    const mFoliageGeo = prepareSafeGeometry(new THREE.SphereGeometry(0.18, 8, 6));
    const mFoliage = new THREE.Mesh(
      mFoliageGeo,
      new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.72 })
    );
    mFoliage.scale.set(1.2, 0.6, 1.2);
    mFoliage.position.set(pos.isLeft ? -0.14 : 0.14, 0.44, 0);
    mFoliage.userData.ignoreRaycaster = true;

    miniBonsai.add(mPot, mTrunk, mFoliage);
    tableGroup.add(miniBonsai);

    // 4. ĐÈN SPOTLIGHT ẤM DỊU RỌI TỪNG CHI TIẾT
    const spotLight = new THREE.PointLight(0xfef08a, 0.65, 4.2, 1.8);
    spotLight.position.set(0, 1.6, 0.2);
    spotLight.userData.ignoreRaycaster = true;
    tableGroup.add(spotLight);

    // 5. BẢNG THUYẾT MINH LORE CARD TƯƠNG TÁC
    const labelTex = getEnrichmentTex('label_canh_ga_gom', 256, 128, (ctx, w, h) => {
      ctx.fillStyle = '#1e3a8a';
      ctx.fillRect(4, 4, w - 8, h - 8);
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 4;
      ctx.strokeRect(8, 8, w - 16, h - 16);

      ctx.fillStyle = '#fef08a';
      ctx.font = 'bold 20px "Times New Roman", serif';
      ctx.textAlign = 'center';
      ctx.fillText('Gốm Cổ & Cây Thế', w / 2, 48);

      ctx.font = 'italic 14px sans-serif';
      ctx.fillStyle = '#dbeafe';
      ctx.fillText('[ Click xem bảo vật gốm ]', w / 2, 88);
    });

    const labelGeo = prepareSafeGeometry(new THREE.PlaneGeometry(0.52, 0.26));
    const labelMesh = new THREE.Mesh(
      labelGeo,
      new THREE.MeshBasicMaterial({ map: labelTex, side: THREE.FrontSide })
    );
    labelMesh.position.set(0, 0.72, 1.38);
    labelMesh.userData.loreKey = 'lobby_canhGa_gomCo';
    labelMesh.userData.isLoreArtifact = true;
    labelMesh.userData.ignoreRaycaster = false; // Bật raycast click
    tableGroup.add(labelMesh);

    if (options.loreGuide?.registerArtifact) {
      options.loreGuide.registerArtifact(labelMesh, 'lobby_canhGa_gomCo');
    }

    wingGroup.add(tableGroup);
  });

  return wingGroup;
}

// ============================================================================
// HẠNG MỤC 2: TRƯỚNG LỤA, RÈM TRÚC & HOÀNH PHI CÂU ĐỐI
// ============================================================================
function createSilkAndCalligraphyDecorations() {
  const decorGroup = new THREE.Group();
  decorGroup.name = 'Silk_Bamboo_And_Calligraphy_Decorations';

  // 1. Hoành phi thếp vàng sơn son "VĂN DĨ TẢI ĐẠO"
  const createHorizontalBanner = (titleText, subText, width = 3.6, height = 1.1) => {
    const tex = getEnrichmentTex(`banner_${titleText}`, 512, 256, (ctx, w, h) => {
      // Nền đỏ thắm thếp vàng viền rồng
      ctx.fillStyle = '#7f1d1d';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 8;
      ctx.strokeRect(10, 10, w - 20, h - 20);

      ctx.strokeStyle = '#eab308';
      ctx.lineWidth = 3;
      ctx.strokeRect(20, 20, w - 40, h - 40);

      // Chữ đại tự
      ctx.font = 'bold 44px "Times New Roman", serif';
      ctx.fillStyle = '#fef08a';
      ctx.textAlign = 'center';
      ctx.fillText(titleText, w / 2, h / 2 + 10);

      if (subText) {
        ctx.font = 'italic 18px "Times New Roman", serif';
        ctx.fillStyle = '#fde047';
        ctx.fillText(subText, w / 2, h / 2 + 55);
      }
    });

    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.28,
      metalness: 0.65
    });

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
    mesh.userData.ignoreRaycaster = true;
    return mesh;
  };

  // 2. Câu đối chữ Nôm dạng tấm đứng
  const createVerticalCouplet = (line1, line2, width = 0.55, height = 3.4) => {
    const coupletGroup = new THREE.Group();
    const createPlaque = (text, isLeft) => {
      const tex = getEnrichmentTex(`couplet_${text}`, 256, 1024, (ctx, w, h) => {
        ctx.fillStyle = '#450a0a';
        ctx.fillRect(0, 0, w, h);

        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 6;
        ctx.strokeRect(8, 8, w - 16, h - 16);

        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 36px "Times New Roman", serif';
        ctx.textAlign = 'center';

        const words = text.split(' ');
        const stepY = (h - 120) / Math.max(words.length, 1);
        words.forEach((wd, idx) => {
          ctx.fillText(wd, w / 2, 80 + idx * stepY);
        });
      });

      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshStandardMaterial({ map: tex, roughness: 0.32, metalness: 0.55 })
      );
      mesh.userData.ignoreRaycaster = true;
      mesh.position.x = isLeft ? -2.2 : 2.2;
      return mesh;
    };

    coupletGroup.add(createPlaque(line1, true));
    coupletGroup.add(createPlaque(line2, false));
    return coupletGroup;
  };

  // 3. Mành trúc đan tự nhiên
  const createBambooBlind = (w = 2.4, h = 3.6) => {
    const tex = getEnrichmentTex('bamboo_blind_tex', 256, 512, (ctx, bw, bh) => {
      ctx.fillStyle = '#b45309';
      ctx.fillRect(0, 0, bw, bh);

      // Nan trúc đan ngang
      for (let y = 0; y < bh; y += 8) {
        ctx.fillStyle = y % 16 === 0 ? '#d97706' : '#78350f';
        ctx.fillRect(0, y, bw, 6);
      }

      // Sợi dây chỉ dọc buộc nan
      ctx.strokeStyle = '#1c1917';
      ctx.lineWidth = 2;
      for (let x = 40; x < bw; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, bh);
        ctx.stroke();
      }
    });

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.75,
        transparent: true,
        opacity: 0.88,
        side: THREE.DoubleSide
      })
    );
    mesh.userData.ignoreRaycaster = true;
    return mesh;
  };

  // Bố trí Hoành Phi & Câu Đối tại các mảng tường trống
  // Mảng tường phía Bắc sảnh
  const banner1 = createHorizontalBanner('VĂN DĨ TẢI ĐẠO', 'Văn Chương Chở Đạo Lớn');
  banner1.position.set(0, 7.8, -26.8);
  decorGroup.add(banner1);

  const couplet1 = createVerticalCouplet('Đức thụ thiên linh đa cảnh sắc', 'Hoa khai vạn phúc hữu thi hương');
  couplet1.position.set(0, 5.2, -26.75);
  decorGroup.add(couplet1);

  // Mảng tường lối vào phía Nam
  const banner2 = createHorizontalBanner('VẠN CỔ LƯU PHƯƠNG', 'Muôn Thuở Lưu Danh Thơm');
  banner2.position.set(0, 7.8, 25.8);
  banner2.rotation.y = Math.PI;
  decorGroup.add(banner2);

  // Mành trúc buông rủ tại hai vách sảnh Đông/Tây
  const blindWest = createBambooBlind(2.8, 4.2);
  blindWest.position.set(-25.2, 5.0, 0);
  blindWest.rotation.y = Math.PI / 2;
  decorGroup.add(blindWest);

  const blindEast = createBambooBlind(2.8, 4.2);
  blindEast.position.set(25.2, 5.0, 0);
  blindEast.rotation.y = -Math.PI / 2;
  decorGroup.add(blindEast);

  return decorGroup;
}

// ============================================================================
// HẠNG MỤC 3: GÓC ÔNG ĐỒ & THƯ PHÁP (X = -18.5, Z = 10.0)
// ============================================================================
function createScholarsWritingNook(options = {}) {
  const nookGroup = new THREE.Group();
  nookGroup.name = 'Scholars_Writing_Nook_Root';
  nookGroup.position.set(-18.5, 0, 10.0);

  // 1. Chiếu cói hoa dệt đỏ (Sedge Mat)
  const matTex = getEnrichmentTex('sedge_mat_tex', 512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(0, 0, w, h);

    // Nan cói dệt chéo
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 3;
    for (let x = 0; x < w; x += 12) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Hoa văn chữ Vạn vàng ở 4 góc và tâm
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 6;
    ctx.strokeRect(30, 30, w - 60, h - 60);

    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 45, 0, Math.PI * 2);
    ctx.fill();
  });

  const matMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 2.6),
    new THREE.MeshStandardMaterial({ map: matTex, roughness: 0.85 })
  );
  matMesh.rotation.x = -Math.PI / 2;
  matMesh.position.y = 0.025;
  matMesh.userData.ignoreRaycaster = true;
  nookGroup.add(matMesh);

  // 2. Bàn gỗ mộc thấp (Low Wooden Scholar Desk)
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.65 });
  const deskTop = new THREE.Mesh(
    new THREE.BoxGeometry(1.65, 0.065, 0.72),
    deskMat
  );
  deskTop.position.set(0, 0.42, 0);
  deskTop.userData.ignoreRaycaster = true;

  const legGeo = new THREE.BoxGeometry(0.08, 0.42, 0.08);
  const leg1 = new THREE.Mesh(legGeo, deskMat);
  leg1.position.set(-0.72, 0.21, -0.28);
  const leg2 = new THREE.Mesh(legGeo, deskMat);
  leg2.position.set(0.72, 0.21, -0.28);
  const leg3 = new THREE.Mesh(legGeo, deskMat);
  leg3.position.set(-0.72, 0.21, 0.28);
  const leg4 = new THREE.Mesh(legGeo, deskMat);
  leg4.position.set(0.72, 0.21, 0.28);
  leg1.userData.ignoreRaycaster = true;
  leg2.userData.ignoreRaycaster = true;
  leg3.userData.ignoreRaycaster = true;
  leg4.userData.ignoreRaycaster = true;

  nookGroup.add(deskTop, leg1, leg2, leg3, leg4);

  // 3. Nghiên mực đá mài tự nhiên (Natural Inkstone)
  const inkstoneMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.16, 0.045, 12),
    new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.28, metalness: 0.45 })
  );
  inkstoneMesh.position.set(-0.52, 0.47, 0.1);
  inkstoneMesh.userData.ignoreRaycaster = true;

  // Lòng nghiên đọng mực đen nhánh bóng bẩy
  const inkPool = new THREE.Mesh(
    new THREE.CircleGeometry(0.1, 12),
    new THREE.MeshStandardMaterial({ color: 0x030712, roughness: 0.05, metalness: 0.85 })
  );
  inkPool.rotation.x = -Math.PI / 2;
  inkPool.position.set(-0.52, 0.495, 0.1);
  inkPool.userData.ignoreRaycaster = true;
  nookGroup.add(inkstoneMesh, inkPool);

  // 4. Bút giá gác 3 cây bút lông (Mountain-shaped Brush Rest & Brushes)
  const restMesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.08, 0.09, 5),
    new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.35 })
  );
  restMesh.rotation.z = Math.PI / 2;
  restMesh.position.set(-0.52, 0.48, -0.18);
  restMesh.userData.ignoreRaycaster = true;
  nookGroup.add(restMesh);

  for (let b = 0; b < 3; b++) {
    const brushStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.009, 0.34, 8),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.45 })
    );
    brushStem.rotation.x = Math.PI / 2;
    brushStem.position.set(-0.48 + b * 0.035, 0.48, -0.18);
    brushStem.userData.ignoreRaycaster = true;

    const brushTip = new THREE.Mesh(
      new THREE.ConeGeometry(0.014, 0.065, 8),
      new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.2 })
    );
    brushTip.rotation.x = -Math.PI / 2;
    brushTip.position.set(-0.48 + b * 0.035, 0.48, -0.36);
    brushTip.userData.ignoreRaycaster = true;

    nookGroup.add(brushStem, brushTip);
  }

  // 5. Ống cắm ấn triện ngọc bích (Jade Seal Cylinder)
  const sealMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.065, 0.14, 0.065),
    new THREE.MeshStandardMaterial({ color: 0x047857, roughness: 0.15, metalness: 0.32 })
  );
  sealMesh.position.set(-0.25, 0.52, -0.18);
  sealMesh.userData.ignoreRaycaster = true;
  nookGroup.add(sealMesh);

  // 6. Giấy xuyến chỉ đỏ viết đại tự "TÂM", "ĐỨC", "TÀI"
  const calligraphyWords = ['TÂM', 'ĐỨC', 'TÀI'];
  calligraphyWords.forEach((word, idx) => {
    const paperTex = getEnrichmentTex(`paper_${word}`, 256, 512, (ctx, w, h) => {
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 4;
      ctx.strokeRect(8, 8, w - 16, h - 16);

      ctx.fillStyle = '#18181b';
      ctx.font = 'bold 88px "Times New Roman", serif';
      ctx.textAlign = 'center';
      ctx.fillText(word, w / 2, h / 2 + 28);
    });

    const paperMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.28, 0.52),
      new THREE.MeshBasicMaterial({ map: paperTex, side: THREE.DoubleSide })
    );
    paperMesh.rotation.x = -Math.PI / 2;
    paperMesh.position.set(0.05 + idx * 0.32, 0.46, 0.02);
    paperMesh.userData.ignoreRaycaster = true;
    nookGroup.add(paperMesh);
  });

  // 7. Nhãn tương tác mở Lore Card (Thuyết Minh Ông Đồ)
  const labelTex = getEnrichmentTex('label_ong_do', 256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#7f1d1d';
    ctx.fillRect(4, 4, w - 8, h - 8);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 20px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText('Chiếu Thư Pháp Ông Đồ', w / 2, 48);

    ctx.font = 'italic 14px sans-serif';
    ctx.fillStyle = '#fef3c7';
    ctx.fillText('[ Click để xem điển tích ]', w / 2, 88);
  });

  const labelMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.28),
    new THREE.MeshBasicMaterial({ map: labelTex, side: THREE.FrontSide })
  );
  labelMesh.position.set(0, 0.32, 0.38);
  labelMesh.userData.loreKey = 'lobby_ongDo_thuPhap';
  labelMesh.userData.isLoreArtifact = true;
  labelMesh.userData.ignoreRaycaster = false; // Bật raycast
  nookGroup.add(labelMesh);

  // Đăng ký thẻ với LoreGuide nếu có
  if (options.loreGuide?.registerArtifact) {
    options.loreGuide.registerArtifact(labelMesh, 'lobby_ongDo_thuPhap');
  }

  // Bọc Hitbox collider Box3 cho bàn & chiếu
  const registerHitbox = (hbMgr) => {
    if (!hbMgr) return;
    const box = new THREE.Box3(
      new THREE.Vector3(-18.5 - 1.6, 0, 10.0 - 1.3),
      new THREE.Vector3(-18.5 + 1.6, 1.4, 10.0 + 1.3)
    );
    hbMgr.registerSolidObjectCollider(null, {
      customBox: box,
      tag: 'ScholarsWritingNook_SolidHitbox',
      helperColor: 0xdc2626
    });
  };

  return { nookGroup, registerHitbox, interactiveMesh: labelMesh };
}

// ============================================================================
// HẠNG MỤC 3: GÓC NHẠC CỤ CỔ TRUYỀN & TRÀ ĐẠO (X = 18.5, Z = 10.0)
// ============================================================================
function createTraditionalMusicAndTeaNook(options = {}) {
  const nookGroup = new THREE.Group();
  nookGroup.name = 'Traditional_Music_And_Tea_Nook_Root';
  nookGroup.position.set(18.5, 0, 10.0);

  // 1. Bệ gỗ cẩm lai uốn cong (Rosewood Display Plinth)
  const plinthMat = getLimWoodMaterial();
  const plinthMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.8, 1.95, 0.42, 24),
    plinthMat
  );
  plinthMesh.position.y = 0.21;
  plinthMesh.userData.ignoreRaycaster = true;
  nookGroup.add(plinthMesh);

  // Viền vàng kim mép bệ
  const goldRim = new THREE.Mesh(
    new THREE.CylinderGeometry(1.82, 1.82, 0.04, 24),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.85, roughness: 0.25 })
  );
  goldRim.position.y = 0.42;
  goldRim.userData.ignoreRaycaster = true;
  nookGroup.add(goldRim);

  const instrumentGroup = new THREE.Group();
  instrumentGroup.position.y = 0.42;

  // 2. ĐÀN TRANH 16 DÂY (16-string Zither)
  const danTranh = new THREE.Group();
  danTranh.position.set(-0.65, 0.08, -0.25);
  danTranh.rotation.y = 0.35;

  // Thân đàn vòm cong bằng gỗ ngô đồng
  const bodyZither = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.075, 1.35),
    new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.35 })
  );
  bodyZither.userData.ignoreRaycaster = true;
  danTranh.add(bodyZither);

  // 16 con nhạn đàn (bridges) hình chữ V ngược
  for (let z = 0; z < 16; z++) {
    const bridge = new THREE.Mesh(
      new THREE.ConeGeometry(0.016, 0.04, 3),
      new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.2 })
    );
    bridge.position.set(-0.08 + (z % 2) * 0.16, 0.055, -0.55 + z * 0.075);
    bridge.userData.ignoreRaycaster = true;
    danTranh.add(bridge);
  }

  // 16 dây đàn kim loại lấp lánh
  const wireMat = new THREE.MeshBasicMaterial({ color: 0xfde047 });
  for (let w = 0; w < 16; w++) {
    const wire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0015, 0.0015, 1.3, 4),
      wireMat
    );
    wire.rotation.x = Math.PI / 2;
    wire.position.set(-0.11 + w * 0.015, 0.078, 0);
    wire.userData.ignoreRaycaster = true;
    danTranh.add(wire);
  }
  instrumentGroup.add(danTranh);

  // 3. ĐÀN BẦU (Monochord / Độc huyền cầm)
  const danBau = new THREE.Group();
  danBau.position.set(0.65, 0.08, -0.25);
  danBau.rotation.y = -0.35;

  const bodyBau = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.065, 1.25),
    new THREE.MeshStandardMaterial({ color: 0x26120b, roughness: 0.28 })
  );
  bodyBau.userData.ignoreRaycaster = true;

  // Bầu đàn hình quả bầu khô ở đầu đàn
  const gourdMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.075, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.55 })
  );
  gourdMesh.position.set(0, 0.08, 0.55);
  gourdMesh.userData.ignoreRaycaster = true;

  // Vòi đàn bằng sừng trâu uốn cong vươn cao
  const hornStem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.018, 0.38, 8),
    new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.2 })
  );
  hornStem.position.set(0, 0.22, 0.55);
  hornStem.rotation.x = 0.22;
  hornStem.userData.ignoreRaycaster = true;

  danBau.add(bodyBau, gourdMesh, hornStem);
  instrumentGroup.add(danBau);

  // 4. ĐÀN NGUYỆT (Moon Lute)
  const danNguyet = new THREE.Group();
  danNguyet.position.set(-0.65, 0.12, 0.55);
  danNguyet.rotation.x = -Math.PI / 6;

  // Thùng đàn tròn trĩnh như mặt trăng rằm
  const moonBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.065, 20),
    new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.32 })
  );
  moonBody.rotation.x = Math.PI / 2;
  moonBody.userData.ignoreRaycaster = true;

  // Cần đàn rất dài
  const luteNeck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.022, 0.95, 8),
    new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.2 })
  );
  luteNeck.position.set(0, 0.55, 0);
  luteNeck.userData.ignoreRaycaster = true;

  danNguyet.add(moonBody, luteNeck);
  instrumentGroup.add(danNguyet);

  // 5. SÁO TRÚC (Bamboo Flute)
  const fluteMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.016, 0.016, 0.65, 8),
    new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.42 })
  );
  fluteMesh.rotation.z = Math.PI / 3;
  fluteMesh.position.set(0.1, 0.05, 0.15);
  fluteMesh.userData.ignoreRaycaster = true;
  instrumentGroup.add(fluteMesh);

  // 6. KHAY TRÀ ĐẠO & ẤM CHÉN BỐC HƠI ẤM
  const teaSetGroup = new THREE.Group();
  teaSetGroup.position.set(0.48, 0.02, 0.52);

  // Khay trà gỗ mun
  const trayMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.035, 0.42),
    new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.3 })
  );
  trayMesh.userData.ignoreRaycaster = true;
  teaSetGroup.add(trayMesh);

  // Ấm trà tử sa Bát Tràng
  const teapot = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.45 })
  );
  teapot.position.set(-0.12, 0.09, 0);
  teapot.userData.ignoreRaycaster = true;
  teaSetGroup.add(teapot);

  // 4 Chén quân sứ viền lam
  const cupGeo = new THREE.CylinderGeometry(0.032, 0.02, 0.038, 8);
  const cupMat = getBlueWhitePorcelainMaterial();
  const cupPositions = [
    [0.12, 0.04, -0.09],
    [0.12, 0.04, 0.09],
    [0.21, 0.04, -0.09],
    [0.21, 0.04, 0.09]
  ];
  cupPositions.forEach((pos) => {
    const cup = new THREE.Mesh(cupGeo, cupMat);
    cup.position.set(...pos);
    cup.userData.ignoreRaycaster = true;
    teaSetGroup.add(cup);
  });

  // Hơi ấm trà procedural (Steam particles)
  const steamCount = 35;
  const steamGeo = new THREE.BufferGeometry();
  const steamPos = new Float32Array(steamCount * 3);
  for (let s = 0; s < steamCount; s++) {
    steamPos[s * 3] = -0.12 + (Math.random() - 0.5) * 0.06;
    steamPos[s * 3 + 1] = 0.18 + Math.random() * 0.35;
    steamPos[s * 3 + 2] = (Math.random() - 0.5) * 0.06;
  }
  steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPos, 3));
  const pCircleTex = getSoftCircleParticleTex();
  const steamMat = new THREE.PointsMaterial({
    map: pCircleTex,
    color: 0xfef08a,
    size: 0.085,
    transparent: true,
    opacity: 0.35,
    depthWrite: false
  });
  const steamPoints = new THREE.Points(steamGeo, steamMat);
  steamPoints.userData.ignoreRaycaster = true;
  steamPoints.raycast = () => {};
  teaSetGroup.add(steamPoints);

  instrumentGroup.add(teaSetGroup);
  nookGroup.add(instrumentGroup);

  // 7. Nhãn tương tác mở Lore Card (Nhã Nhạc & Trà Đạo)
  const labelTex = getEnrichmentTex('label_nhac_cu', 256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#451a03';
    ctx.fillRect(4, 4, w - 8, h - 8);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 20px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText('Nhã Nhạc & Trà Đạo', w / 2, 48);

    ctx.font = 'italic 14px sans-serif';
    ctx.fillStyle = '#fef3c7';
    ctx.fillText('[ Click để lắng nghe & xem ]', w / 2, 88);
  });

  const labelMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.28),
    new THREE.MeshBasicMaterial({ map: labelTex, side: THREE.FrontSide })
  );
  labelMesh.position.set(0, 0.35, 1.82);
  labelMesh.userData.loreKey = 'lobby_nhacCu_traDao';
  labelMesh.userData.isLoreArtifact = true;
  labelMesh.userData.ignoreRaycaster = false; // Bật raycast
  nookGroup.add(labelMesh);

  // Đăng ký thẻ với LoreGuide nếu có
  if (options.loreGuide?.registerArtifact) {
    options.loreGuide.registerArtifact(labelMesh, 'lobby_nhacCu_traDao');
  }

  // 8. PositionalAudio tiếng đàn tranh ngân thanh tao
  const audioAnchor = new THREE.Object3D();
  audioAnchor.position.set(0, 0.6, 0);
  nookGroup.add(audioAnchor);
  attachDanTranhPositionalAudio(audioAnchor, options.audioManager);

  // Cập nhật hơi ấm trà bốc lên
  const updateSteam = (timeSec) => {
    const arr = steamGeo.attributes.position.array;
    for (let s = 0; s < steamCount; s++) {
      let y = arr[s * 3 + 1];
      y += 0.0035;
      if (y > 0.65) y = 0.18;
      arr[s * 3 + 1] = y;
      arr[s * 3] += Math.sin(timeSec * 2.5 + s) * 0.0008;
    }
    steamGeo.attributes.position.needsUpdate = true;
  };

  // Bọc Hitbox collider Box3 cho bệ nhạc cụ
  const registerHitbox = (hbMgr) => {
    if (!hbMgr) return;
    const box = new THREE.Box3(
      new THREE.Vector3(18.5 - 2.0, 0, 10.0 - 2.0),
      new THREE.Vector3(18.5 + 2.0, 1.6, 10.0 + 2.0)
    );
    hbMgr.registerSolidObjectCollider(null, {
      customBox: box,
      tag: 'TraditionalMusicNook_SolidHitbox',
      helperColor: 0xf59e0b
    });
  };

  return { nookGroup, registerHitbox, updateSteam, interactiveMesh: labelMesh };
}

// ============================================================================
// HẠNG MỤC 3: GÓC DÂN GIAN & LÀNG NGHỀ (X = -8.0, Z = 18.0)
// ============================================================================
function createFolkCraftsNook(options = {}) {
  const nookGroup = new THREE.Group();
  nookGroup.name = 'Folk_Crafts_Nook_Root';
  nookGroup.position.set(-8.0, 0, 18.0);

  // Bệ gỗ trưng bày mộc mạc
  const standMesh = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.55, 1.2),
    getLimWoodMaterial()
  );
  standMesh.position.y = 0.275;
  standMesh.userData.ignoreRaycaster = true;
  nookGroup.add(standMesh);

  // 1. Bình gốm hoa nâu Chu Đậu
  const potGeo = new THREE.CylinderGeometry(0.22, 0.16, 0.68, 16);
  const potMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    roughness: 0.35,
    metalness: 0.1
  });
  const chuDauPot = new THREE.Mesh(potGeo, potMat);
  chuDauPot.position.set(-0.75, 0.55 + 0.34, 0);
  chuDauPot.userData.ignoreRaycaster = true;
  nookGroup.add(chuDauPot);

  // 2. Bộ 3 mặt nạ Tuồng/Chèo rực rỡ sắc màu
  const maskColors = [0xef4444, 0xf59e0b, 0x10b981];
  for (let m = 0; m < 3; m++) {
    const maskMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 10),
      new THREE.MeshStandardMaterial({
        color: maskColors[m],
        roughness: 0.25,
        metalness: 0.15
      })
    );
    maskMesh.scale.set(1.0, 1.35, 0.35);
    maskMesh.position.set(-0.25 + m * 0.25, 0.55 + 0.32, 0.15);
    maskMesh.userData.ignoreRaycaster = true;
    nookGroup.add(maskMesh);
  }

  // 3. Nón quai thao với dải lụa điều đỏ thắm
  const hatMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.38, 0.42, 0.08, 20),
    new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.62 })
  );
  hatMesh.position.set(0.72, 0.55 + 0.08, -0.15);
  hatMesh.userData.ignoreRaycaster = true;

  const ribbonMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.09, 0.75),
    new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      side: THREE.DoubleSide,
      roughness: 0.35
    })
  );
  ribbonMesh.position.set(0.72, 0.55 - 0.25, 0.22);
  ribbonMesh.userData.ignoreRaycaster = true;
  nookGroup.add(hatMesh, ribbonMesh);

  // 4. Quang gánh tre mini mộc mạc
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 1.45, 8),
    new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.5 })
  );
  pole.rotation.z = Math.PI / 2.2;
  pole.position.set(0, 0.55 + 0.42, -0.32);
  pole.userData.ignoreRaycaster = true;
  nookGroup.add(pole);

  for (let b = 0; b < 2; b++) {
    const basket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.14, 0.16, 12),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.65 })
    );
    basket.position.set(b === 0 ? -0.55 : 0.55, 0.55 + 0.15, -0.32);
    basket.userData.ignoreRaycaster = true;
    nookGroup.add(basket);
  }

  // 5. Nhãn tương tác mở Lore Card (Góc Làng Nghề)
  const labelTex = getEnrichmentTex('label_dan_gian', 256, 128, (ctx, w, h) => {
    ctx.fillStyle = '#78350f';
    ctx.fillRect(4, 4, w - 8, h - 8);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 20px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText('Tinh Hoa Làng Nghề', w / 2, 48);

    ctx.font = 'italic 14px sans-serif';
    ctx.fillStyle = '#fef3c7';
    ctx.fillText('[ Click để xem bảo vật ]', w / 2, 88);
  });

  const labelMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.28),
    new THREE.MeshBasicMaterial({ map: labelTex, side: THREE.FrontSide })
  );
  labelMesh.position.set(0, 0.35, 0.62);
  labelMesh.userData.loreKey = 'lobby_danGian_langNghe';
  labelMesh.userData.isLoreArtifact = true;
  labelMesh.userData.ignoreRaycaster = false; // Bật raycast
  nookGroup.add(labelMesh);

  // Đăng ký thẻ với LoreGuide nếu có
  if (options.loreGuide?.registerArtifact) {
    options.loreGuide.registerArtifact(labelMesh, 'lobby_danGian_langNghe');
  }

  // Bọc Hitbox collider Box3 cho góc làng nghề
  const registerHitbox = (hbMgr) => {
    if (!hbMgr) return;
    const box = new THREE.Box3(
      new THREE.Vector3(-8.0 - 1.4, 0, 18.0 - 0.8),
      new THREE.Vector3(-8.0 + 1.4, 1.6, 18.0 + 0.8)
    );
    hbMgr.registerSolidObjectCollider(null, {
      customBox: box,
      tag: 'FolkCraftsNook_SolidHitbox',
      helperColor: 0x10b981
    });
  };

  return { nookGroup, registerHitbox, interactiveMesh: labelMesh };
}

// ============================================================================
// HẠNG MỤC 4: TIỂU CẢNH THIÊN NHIÊN TỨ QUÝ & NON BỘ SƯƠNG KHÓI
// ============================================================================
function createFourSeasonsBonsaiAndRockery() {
  const natureGroup = new THREE.Group();
  natureGroup.name = 'Four_Seasons_Bonsai_And_Rockery_Group';

  const porcelainMat = getBlueWhitePorcelainMaterial();

  // 1. Chậu đôn sứ men lam Bát Tràng trồng Bonsai Tùng bách (X = -26.0, Z = -8.0)
  const createPineBonsai = (x, z) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    // Chậu sứ men lam bát giác
    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.42, 0.45, 8),
      porcelainMat
    );
    pot.position.y = 0.225;
    pot.userData.ignoreRaycaster = true;
    group.add(pot);

    // Thân Tùng uốn thế ngoằn ngoèo
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.85 });
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.14, 1.25, 8),
      trunkMat
    );
    trunk.rotation.z = 0.25;
    trunk.position.set(0.12, 0.85, 0);
    trunk.userData.ignoreRaycaster = true;
    group.add(trunk);

    // 3 Tán lá mây xanh thẫm
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.72 });
    for (let f = 0; f < 3; f++) {
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38 - f * 0.08, 0.42 - f * 0.08, 0.12, 10),
        foliageMat
      );
      pad.position.set(0.25 + f * 0.15, 1.2 + f * 0.35, (f % 2 === 0 ? 0.1 : -0.1));
      pad.userData.ignoreRaycaster = true;
      group.add(pad);
    }

    return group;
  };

  // 2. Chậu Cúc vàng sum suê (X = -8.0, Z = 14.0)
  const createChrysanthemumPot = (x, z) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.38, 0.42, 8),
      porcelainMat
    );
    pot.position.y = 0.21;
    pot.userData.ignoreRaycaster = true;
    group.add(pot);

    // Khóm lá cúc xanh
    const leaves = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0x166534, roughness: 0.8 })
    );
    leaves.scale.set(1.0, 0.65, 1.0);
    leaves.position.y = 0.52;
    leaves.userData.ignoreRaycaster = true;
    group.add(leaves);

    // Hoa cúc vàng đại đóa
    const flowerMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0x854d0e,
      emissiveIntensity: 0.25
    });
    for (let c = 0; c < 12; c++) {
      const angle = (c * Math.PI * 2) / 12;
      const fl = new THREE.Mesh(new THREE.DodecahedronGeometry(0.075, 0), flowerMat);
      fl.position.set(
        Math.cos(angle) * (0.28 + Math.random() * 0.12),
        0.62 + Math.random() * 0.15,
        Math.sin(angle) * (0.28 + Math.random() * 0.12)
      );
      fl.userData.ignoreRaycaster = true;
      group.add(fl);
    }

    return group;
  };

  // 3. Chậu Cành Mai/Đào phai (X = 8.0, Z = 14.0)
  const createPeachBlossomPot = (x, z) => {
    const group = new THREE.Group();
    group.position.set(x, 0, z);

    const pot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.38, 0.42, 8),
      porcelainMat
    );
    pot.position.y = 0.21;
    pot.userData.ignoreRaycaster = true;
    group.add(pot);

    // Cành đào khẳng khiu
    const branchMat = new THREE.MeshStandardMaterial({ color: 0x3f1d1d, roughness: 0.8 });
    const branch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.08, 1.45, 6),
      branchMat
    );
    branch.rotation.z = -0.22;
    branch.position.set(-0.1, 0.95, 0);
    branch.userData.ignoreRaycaster = true;
    group.add(branch);

    // Hoa đào hồng phai 5 cánh
    const peachMat = new THREE.MeshStandardMaterial({
      color: 0xf472b6,
      emissive: 0x831843,
      emissiveIntensity: 0.3
    });
    for (let p = 0; p < 16; p++) {
      const petal = new THREE.Mesh(new THREE.DodecahedronGeometry(0.055, 0), peachMat);
      petal.position.set(
        -0.25 + (Math.random() - 0.5) * 0.65,
        0.85 + Math.random() * 0.85,
        (Math.random() - 0.5) * 0.45
      );
      petal.userData.ignoreRaycaster = true;
      group.add(petal);
    }

    return group;
  };

  // 4. VẠC GỐM LỚN NUÔI HOA SEN, HOA SÚNG & NON BỘ SƯƠNG KHÓI (X = 8.0, Z = 18.0)
  const createCeramicPondAndMistRockery = () => {
    const pondGroup = new THREE.Group();
    pondGroup.name = 'Ceramic_Pond_And_Mist_Rockery';
    pondGroup.position.set(8.0, 0, 18.0);
    pondGroup.userData.ignoreRaycaster = true;

    // Vạc gốm đại tròn R = 1.35m men nâu rêu cổ
    const basinMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.72,
      metalness: 0.15
    });
    const basin = new THREE.Mesh(
      new THREE.CylinderGeometry(1.35, 1.15, 0.65, 20),
      basinMat
    );
    basin.position.y = 0.325;
    basin.userData.ignoreRaycaster = true;
    pondGroup.add(basin);

    // Mặt nước gợn sóng lăn tăn
    const waterMesh = new THREE.Mesh(
      new THREE.CircleGeometry(1.3, 20),
      new THREE.MeshStandardMaterial({
        color: 0x0d9488,
        roughness: 0.15,
        metalness: 0.45,
        transparent: true,
        opacity: 0.85
      })
    );
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = 0.58;
    waterMesh.userData.ignoreRaycaster = true;
    pondGroup.add(waterMesh);

    // Hòn non bộ rêu phong nhiều đỉnh
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.88 });
    const peaks = [
      { r: 0.32, h: 1.1, x: 0.25, y: 0.95, z: -0.15 },
      { r: 0.24, h: 0.75, x: -0.25, y: 0.75, z: 0.12 },
      { r: 0.18, h: 0.55, x: 0.35, y: 0.65, z: 0.28 }
    ];
    peaks.forEach((pk) => {
      const pMesh = new THREE.Mesh(new THREE.ConeGeometry(pk.r, pk.h, 7), rockMat);
      pMesh.position.set(pk.x, pk.y, pk.z);
      pMesh.userData.ignoreRaycaster = true;
      pondGroup.add(pMesh);
    });

    // Hoa sen hồng nổi trên mặt nước
    const lotusFlower = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.18, 6),
      new THREE.MeshStandardMaterial({ color: 0xf472b6, emissive: 0x9d174d, emissiveIntensity: 0.35 })
    );
    lotusFlower.rotation.x = Math.PI;
    lotusFlower.position.set(-0.55, 0.62, -0.45);
    lotusFlower.userData.ignoreRaycaster = true;
    pondGroup.add(lotusFlower);

    // Lá sen dập dềnh
    const leafMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.015, 10),
      new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.55 })
    );
    leafMesh.position.set(-0.45, 0.59, 0.35);
    leafMesh.userData.ignoreRaycaster = true;
    pondGroup.add(leafMesh);

    // Làn sương mỏng bay quanh chân non bộ (Mist particles)
    const mistCount = 65;
    const mistGeo = new THREE.BufferGeometry();
    const mistPos = new Float32Array(mistCount * 3);
    for (let m = 0; m < mistCount; m++) {
      const rad = 0.4 + Math.random() * 0.85;
      const ang = Math.random() * Math.PI * 2;
      mistPos[m * 3] = Math.cos(ang) * rad;
      mistPos[m * 3 + 1] = 0.6 + Math.random() * 0.28;
      mistPos[m * 3 + 2] = Math.sin(ang) * rad;
    }
    mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
    const mistMat = new THREE.PointsMaterial({
      map: getSoftCircleParticleTex(),
      color: 0xccfbf1,
      size: 0.16,
      transparent: true,
      opacity: 0.32,
      depthWrite: false
    });
    const mistPoints = new THREE.Points(mistGeo, mistMat);
    mistPoints.userData.ignoreRaycaster = true;
    mistPoints.raycast = () => {};
    pondGroup.add(mistPoints);

    const updateMist = (timeSec) => {
      const arr = mistGeo.attributes.position.array;
      for (let m = 0; m < mistCount; m++) {
        const x = arr[m * 3];
        const z = arr[m * 3 + 2];
        const rad = Math.sqrt(x * x + z * z);
        let ang = Math.atan2(z, x) + 0.008;
        arr[m * 3] = Math.cos(ang) * rad;
        arr[m * 3 + 2] = Math.sin(ang) * rad;
        arr[m * 3 + 1] = 0.62 + Math.sin(timeSec * 1.5 + m) * 0.04;
      }
      mistGeo.attributes.position.needsUpdate = true;
    };

    return { pondGroup, updateMist };
  };

  natureGroup.add(createPineBonsai(-26.0, -8.0));
  natureGroup.add(createPineBonsai(26.0, -8.0));
  natureGroup.add(createChrysanthemumPot(-8.0, 14.0));
  natureGroup.add(createPeachBlossomPot(8.0, 14.0));

  const { pondGroup, updateMist } = createCeramicPondAndMistRockery();
  natureGroup.add(pondGroup);

  return { natureGroup, updateMist };
}

// ============================================================================
// HẠNG MỤC 5: LẤP ĐẦY TRẦN NHÀ, ĐÈN KÉO QUÂN & ĐÈN LỒNG HỘI AN ĐA SẮC
// ============================================================================

/**
 * Danh sách 32 tọa độ & màu sắc Đèn Lồng / Bóng Bay Đa Sắc Hội An
 * (Pastel colors: hồng #ec4899, xanh ngọc/cyan #06b6d4, vàng #facc15, đỏ #ef4444, cam #f97316, xanh lam #3b82f6)
 * Thả rủ từ trần xuống ở nhiều cao độ (Y = 7m đến 16m), đúng y hệt trong ảnh 1 và 2.
 */
export const HOI_AN_PASTEL_LANTERN_SPECS = [
  // Tầng 1: Tầm thấp & trung tâm (Y = 7.2m - 8.8m) - Ngay trên cuốn sách & tiền sảnh
  { x: -2.0, y: 7.4, z: 4.2, color: 0xec4899 }, // Hồng pastel - ngay trước sách di sản (ảnh 1)
  { x: 2.2, y: 8.4, z: 3.5, color: 0x3b82f6 },  // Xanh lam
  { x: -4.5, y: 7.8, z: 7.0, color: 0xef4444 }, // Đỏ tươi
  { x: 4.8, y: 8.2, z: 7.5, color: 0xf97316 },  // Cam
  { x: -6.2, y: 8.6, z: 2.0, color: 0x06b6d4 }, // Xanh ngọc / Cyan
  { x: 5.8, y: 7.6, z: 1.5, color: 0xfacc15 },  // Vàng
  { x: -1.5, y: 8.8, z: 8.5, color: 0xec4899 }, // Hồng
  { x: 2.0, y: 8.6, z: 8.0, color: 0x06b6d4 },  // Xanh ngọc

  // Tầng 2: Tầm trung (Y = 9.2m - 12.8m) - Giữa các hàng cột gỗ & hành lang
  { x: -3.2, y: 10.2, z: -2.5, color: 0xfacc15 }, // Vàng
  { x: 3.5, y: 10.8, z: -2.8, color: 0xec4899 },  // Hồng
  { x: -7.5, y: 11.2, z: -6.0, color: 0x06b6d4 }, // Xanh ngọc
  { x: 7.2, y: 10.5, z: -5.8, color: 0xef4444 },  // Đỏ
  { x: -8.5, y: 9.8, z: 4.0, color: 0x3b82f6 },   // Xanh lam
  { x: 8.6, y: 11.4, z: 4.5, color: 0xf97316 },   // Cam
  { x: -10.5, y: 12.0, z: -1.0, color: 0xec4899 },// Hồng
  { x: 10.8, y: 11.8, z: -0.5, color: 0x06b6d4 }, // Xanh ngọc
  { x: -5.5, y: 12.4, z: 10.0, color: 0xfacc15 }, // Vàng
  { x: 5.2, y: 12.2, z: 10.2, color: 0x3b82f6 },  // Xanh lam
  { x: -8.0, y: 11.0, z: -11.0, color: 0xf97316 },// Cam
  { x: 7.8, y: 10.8, z: -10.5, color: 0x06b6d4 }, // Xanh ngọc

  // Tầng 3: Tầm cao (Y = 13.0m - 16.0m) - Lơ lửng lưng chừng vòm giếng trời
  { x: -1.5, y: 13.8, z: -10.5, color: 0xef4444 }, // Đỏ
  { x: 1.8, y: 14.5, z: -9.5, color: 0xf97316 },   // Cam
  { x: -4.8, y: 15.2, z: -4.0, color: 0x06b6d4 },  // Xanh ngọc
  { x: 4.5, y: 15.0, z: -3.5, color: 0xfacc15 },   // Vàng
  { x: -11.2, y: 14.5, z: 7.5, color: 0x3b82f6 },  // Xanh lam
  { x: 11.0, y: 14.2, z: 7.0, color: 0xec4899 },   // Hồng
  { x: -12.0, y: 15.5, z: -5.0, color: 0xef4444 }, // Đỏ
  { x: 12.2, y: 15.2, z: -4.5, color: 0xf97316 },  // Cam
  { x: -3.5, y: 15.8, z: 5.5, color: 0xec4899 },   // Hồng
  { x: 3.2, y: 15.6, z: 5.0, color: 0x06b6d4 },    // Xanh ngọc
  { x: 0.0, y: 16.0, z: 0.0, color: 0xfacc15 },    // Vàng
  { x: 0.0, y: 14.8, z: -14.2, color: 0x3b82f6 }   // Xanh lam
];

/**
 * Phục hồi toàn bộ dàn Đèn Lồng / Bóng Bay Đa Sắc lơ lửng giữa không trung giếng trời
 * Tối ưu InstancedMesh / Zero dynamic allocations
 */
export function createFloatingPastelLanterns(ceilingHeight = 28.0) {
  const group = new THREE.Group();
  group.name = 'Ceiling_HoiAn_Floating_Pastel_Lanterns';
  group.userData.ignoreRaycaster = true;

  const count = HOI_AN_PASTEL_LANTERN_SPECS.length;

  // 1. Thân đèn lồng hình quả trám / balloon Hội An
  const lanternGeo = prepareSafeGeometry(new THREE.SphereGeometry(0.42, 16, 12));
  const silkLanternMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.95
  });

  const lanternInst = new THREE.InstancedMesh(lanternGeo, silkLanternMat, count);
  lanternInst.name = 'HoiAn_Pastel_Lanterns_Instanced';
  lanternInst.userData.ignoreRaycaster = true;

  // 2. Dây treo chỉ đỏ mảnh rủ từ trần xuống đỉnh đèn
  const cordGeo = prepareSafeGeometry(new THREE.CylinderGeometry(0.007, 0.007, 1.0, 4));
  const cordMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

  const cordInst = new THREE.InstancedMesh(cordGeo, cordMat, count);
  cordInst.name = 'HoiAn_Lantern_Red_Cords_Instanced';
  cordInst.userData.ignoreRaycaster = true;

  const dummy = new THREE.Object3D();
  const colorObj = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const spec = HOI_AN_PASTEL_LANTERN_SPECS[i];
    const lx = spec.x;
    const ly = spec.y;
    const lz = spec.z;

    // Đặt thân đèn: scale (1.0, 1.48, 1.0)
    dummy.position.set(lx, ly, lz);
    dummy.scale.set(1.0, 1.48, 1.0);
    dummy.rotation.set(0, (i * Math.PI) / 6, 0);
    dummy.updateMatrix();
    lanternInst.setMatrixAt(i, dummy.matrix);

    colorObj.setHex(spec.color);
    lanternInst.setColorAt(i, colorObj);

    // Đặt sợi dây chỉ đỏ mảnh rủ từ trần (ceilingHeight = 28m)
    const lanternTopY = ly + 0.62;
    const cordLength = Math.max(0.5, ceilingHeight - lanternTopY);
    const cordCenterY = lanternTopY + cordLength * 0.5;

    dummy.position.set(lx, cordCenterY, lz);
    dummy.scale.set(1.0, cordLength, 1.0);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    cordInst.setMatrixAt(i, dummy.matrix);
  }

  lanternInst.instanceMatrix.needsUpdate = true;
  if (lanternInst.instanceColor) lanternInst.instanceColor.needsUpdate = true;
  cordInst.instanceMatrix.needsUpdate = true;

  group.add(cordInst, lanternInst);
  return group;
}

export function createCeilingLanternsAndLighting() {
  const ceilingGroup = new THREE.Group();
  ceilingGroup.name = 'Ceiling_Revolving_Lanterns_Group';
  ceilingGroup.userData.ignoreRaycaster = true;

  const revolvingLanterns = [];
  const woodFrameMat = getLimWoodMaterial();
  const silkLanternMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xd97706,
    emissiveIntensity: 0.65,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide
  });

  // 1. ĐÃ BỎ LỒNG ĐÈN TREO TRÊN CHIẾU NGHỈ CẦU THANG THEO YÊU CẦU NGƯỜI DÙNG (Z = -16.5m)
  // Giữ không gian thông thoáng 100% nhìn rõ Chiêng Đồng & Đại Cầu Thang hoàng cung

  // 2. 4 ĐÈN KÉO QUÂN LỤC GIÁC VỆ TINH BỐN PHƯƠNG (SATELLITE REVOLVING LANTERNS)
  const satelliteSpots = [
    { x: -12.0, y: 15.2, z: -8.0 },
    { x: 12.0, y: 15.2, z: -8.0 },
    { x: -12.0, y: 15.2, z: 8.0 },
    { x: 12.0, y: 15.2, z: 8.0 }
  ];

  const satOuterGeo = prepareSafeGeometry(new THREE.CylinderGeometry(0.85, 0.95, 1.45, 6));
  const satRoofGeo = prepareSafeGeometry(new THREE.ConeGeometry(1.2, 0.45, 6));
  const satBaseGeo = prepareSafeGeometry(new THREE.CylinderGeometry(1.05, 0.9, 0.18, 6));
  const satInnerGeo = prepareSafeGeometry(new THREE.CylinderGeometry(0.65, 0.65, 1.2, 12));
  const innerMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0x92400e,
    emissiveIntensity: 0.85
  });

  satelliteSpots.forEach((spot, idx) => {
    const lGroup = new THREE.Group();
    lGroup.position.set(spot.x, spot.y, spot.z);
    lGroup.userData.ignoreRaycaster = true;

    // Dây treo thả từ trần Y = 28m
    const cordLen = 28.0 - spot.y;
    const cordMesh = new THREE.Mesh(
      prepareSafeGeometry(new THREE.CylinderGeometry(0.012, 0.012, cordLen, 4)),
      new THREE.MeshBasicMaterial({ color: 0x78350f })
    );
    cordMesh.position.y = cordLen / 2;
    cordMesh.userData.ignoreRaycaster = true;
    lGroup.add(cordMesh);

    // Vỏ ngoài lục giác
    const outerShell = new THREE.Mesh(satOuterGeo, silkLanternMat);
    outerShell.userData.ignoreRaycaster = true;
    lGroup.add(outerShell);

    // Mái ngói & đáy
    const roof = new THREE.Mesh(satRoofGeo, woodFrameMat);
    roof.position.y = 0.85;
    roof.userData.ignoreRaycaster = true;

    const base = new THREE.Mesh(satBaseGeo, woodFrameMat);
    base.position.y = -0.8;
    base.userData.ignoreRaycaster = true;
    lGroup.add(roof, base);

    // Trục xoay bên trong
    const innerDrum = new THREE.Mesh(satInnerGeo, innerMat);
    innerDrum.userData.ignoreRaycaster = true;
    lGroup.add(innerDrum);

    // PointLight dịu nhẹ
    const pointLight = new THREE.PointLight(0xfef08a, 0.75, 8.5, 1.4);
    pointLight.castShadow = false;
    pointLight.userData.ignoreRaycaster = true;
    lGroup.add(pointLight);

    revolvingLanterns.push({
      group: lGroup,
      outerShell,
      innerDrum,
      speed: 0.12 + idx * 0.03
    });
    ceilingGroup.add(lGroup);
  });

  // 3. TOÀN BỘ DÀN ĐÈN LỒNG / BÓNG BAY HỘI AN ĐA SẮC LƠ LỬNG
  const floatingPastelLanterns = createFloatingPastelLanterns(28.0);
  ceilingGroup.add(floatingPastelLanterns);

  // VÒNG LẶP CẬP NHẬT ANIMATION CHO CÁC ĐÈN XOAY (ZERO HEAP ALLOCATION)
  const updateLanterns = (timeSec) => {
    for (let i = 0; i < revolvingLanterns.length; i++) {
      const l = revolvingLanterns[i];
      if (l.outerShell) l.outerShell.rotation.y = timeSec * l.speed;
      if (l.innerDrum) l.innerDrum.rotation.y = -timeSec * l.speed * 2.5;
    }
  };

  return { ceilingGroup, updateLanterns };
}

// ============================================================================
// HẠNG MỤC 5: HỌA TIẾT MẶT TRỐNG ĐỒNG ĐÔNG SƠN CHIẾU PHÁT QUANG TRÊN SÀN
// ============================================================================
function createFloorMandalaProjection() {
  const floorMandalaGroup = new THREE.Group();
  floorMandalaGroup.name = 'Floor_DongSon_Mandala_Projections';
  floorMandalaGroup.userData.ignoreRaycaster = true;

  const mandalaSpots = [
    { x: -16.0, z: 0.0, r: 3.2 },
    { x: 16.0, z: 0.0, r: 3.2 }
  ];

  const mandalaMeshes = [];

  const tex = getEnrichmentTex('floor_dong_son_mandala', 512, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;

    // Mặt trời 14 tia sáng Đông Sơn
    ctx.fillStyle = 'rgba(253, 224, 71, 0.55)';
    ctx.beginPath();
    for (let i = 0; i < 28; i++) {
      const angle = (i * Math.PI) / 14;
      const rad = i % 2 === 0 ? 55 : 22;
      const px = cx + Math.cos(angle) * rad;
      const py = cy + Math.sin(angle) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();

    // Các vành hoa văn chim Lạc bay ngược chiều kim đồng hồ
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.42)';
    ctx.lineWidth = 3.5;
    for (let r = 75; r < 235; r += 35) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Vành ngoài răng cưa hồi văn
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.35)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, 245, 0, Math.PI * 2);
    ctx.stroke();
  });

  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.28,
    depthWrite: false
  });

  mandalaSpots.forEach((spot) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(spot.r * 2, spot.r * 2), mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(spot.x, 0.026, spot.z);
    mesh.userData.ignoreRaycaster = true;
    mandalaMeshes.push(mesh);
    floorMandalaGroup.add(mesh);
  });

  const updateFloorMandala = (timeSec) => {
    mandalaMeshes.forEach((m, idx) => {
      m.rotation.z = (idx % 2 === 0 ? 1 : -1) * timeSec * 0.04;
    });
  };

  return { floorMandalaGroup, updateFloorMandala };
}

// ============================================================================
// HẠNG MỤC 5: LIVING VFX (KHÓI TRẦM, CÁNH HOA RƠI, ĐOM ĐÓM LÂN TINH)
// ============================================================================
function createSpaceEnrichmentLivingVFX(burnerPositions = []) {
  const vfxGroup = new THREE.Group();
  vfxGroup.name = 'Space_Enrichment_Living_VFX_Root';
  vfxGroup.userData.ignoreRaycaster = true;

  // 1. Khói trầm hương procedural uốn lượn (Incense Smoke)
  const smokeCount = 180;
  const smokeGeo = new THREE.BufferGeometry();
  const smokePos = new Float32Array(smokeCount * 3);
  const smokeOrigins = burnerPositions.length > 0 ? burnerPositions : [new THREE.Vector3(-3.8, 1.15, 28.5), new THREE.Vector3(3.8, 1.15, 28.5)];

  for (let s = 0; s < smokeCount; s++) {
    const origin = smokeOrigins[s % smokeOrigins.length];
    smokePos[s * 3] = origin.x + (Math.random() - 0.5) * 0.08;
    smokePos[s * 3 + 1] = origin.y + Math.random() * 2.8;
    smokePos[s * 3 + 2] = origin.z + (Math.random() - 0.5) * 0.08;
  }
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
  const vfxCircleTex = getSoftCircleParticleTex();
  const smokeMat = new THREE.PointsMaterial({
    map: vfxCircleTex,
    color: 0xe2e8f0,
    size: 0.16,
    transparent: true,
    opacity: 0.38,
    depthWrite: false
  });
  const smokePoints = new THREE.Points(smokeGeo, smokeMat);
  smokePoints.userData.ignoreRaycaster = true;
  smokePoints.raycast = () => {};
  vfxGroup.add(smokePoints);

  // 2. Cánh hoa rơi chao lượn (Falling Petals)
  const petalCount = 200;
  const petalGeo = new THREE.BufferGeometry();
  const petalPos = new Float32Array(petalCount * 3);
  for (let p = 0; p < petalCount; p++) {
    petalPos[p * 3] = (Math.random() - 0.5) * 48.0;
    petalPos[p * 3 + 1] = 1.0 + Math.random() * 18.0;
    petalPos[p * 3 + 2] = (Math.random() - 0.5) * 36.0;
  }
  petalGeo.setAttribute('position', new THREE.BufferAttribute(petalPos, 3));
  const petalMat = new THREE.PointsMaterial({
    map: vfxCircleTex,
    color: 0xf472b6,
    size: 0.18,
    transparent: true,
    opacity: 0.65,
    depthWrite: false
  });
  const petalPoints = new THREE.Points(petalGeo, petalMat);
  petalPoints.userData.ignoreRaycaster = true;
  petalPoints.raycast = () => {};
  vfxGroup.add(petalPoints);

  // 3. Đom đóm lân tinh xanh ngọc lấp lánh (Emerald Fireflies)
  const fireflyCount = 140;
  const fireflyGeo = new THREE.BufferGeometry();
  const fireflyPos = new Float32Array(fireflyCount * 3);
  for (let f = 0; f < fireflyCount; f++) {
    fireflyPos[f * 3] = (Math.random() - 0.5) * 44.0;
    fireflyPos[f * 3 + 1] = 0.8 + Math.random() * 3.8;
    fireflyPos[f * 3 + 2] = (Math.random() - 0.5) * 36.0;
  }
  fireflyGeo.setAttribute('position', new THREE.BufferAttribute(fireflyPos, 3));
  const fireflyMat = new THREE.PointsMaterial({
    map: vfxCircleTex,
    color: 0x34d399,
    size: 0.14,
    transparent: true,
    opacity: 0.75,
    depthWrite: false
  });
  const fireflyPoints = new THREE.Points(fireflyGeo, fireflyMat);
  fireflyPoints.userData.ignoreRaycaster = true;
  fireflyPoints.raycast = () => {};
  vfxGroup.add(fireflyPoints);

  // Cập nhật Animation Living VFX
  const updateLivingVFX = (timeSec) => {
    // 1. Khói trầm bốc lên ziczac
    const sArr = smokeGeo.attributes.position.array;
    for (let s = 0; s < smokeCount; s++) {
      const origin = smokeOrigins[s % smokeOrigins.length];
      let y = sArr[s * 3 + 1];
      y += 0.006;
      if (y > origin.y + 3.2) y = origin.y;
      sArr[s * 3 + 1] = y;

      const progress = (y - origin.y) / 3.2;
      sArr[s * 3] = origin.x + Math.sin(timeSec * 2.2 + s) * 0.18 * progress;
      sArr[s * 3 + 2] = origin.z + Math.cos(timeSec * 1.8 + s) * 0.18 * progress;
    }
    smokeGeo.attributes.position.needsUpdate = true;

    // 2. Cánh hoa chao lượn rơi xuống sàn
    const pArr = petalGeo.attributes.position.array;
    for (let p = 0; p < petalCount; p++) {
      let py = pArr[p * 3 + 1];
      py -= 0.007;
      if (py < 0.2) py = 18.0;
      pArr[p * 3 + 1] = py;

      pArr[p * 3] += Math.sin(timeSec * 1.5 + p) * 0.004;
      pArr[p * 3 + 2] += Math.cos(timeSec * 1.2 + p) * 0.004;
    }
    petalGeo.attributes.position.needsUpdate = true;

    // 3. Đom đóm nhấp nháy dập dềnh
    const fArr = fireflyGeo.attributes.position.array;
    for (let f = 0; f < fireflyCount; f++) {
      fArr[f * 3] += Math.sin(timeSec * 1.4 + f) * 0.006;
      fArr[f * 3 + 1] += Math.cos(timeSec * 1.8 + f) * 0.004;
      fArr[f * 3 + 2] += Math.sin(timeSec * 1.6 + f * 2) * 0.006;
    }
    fireflyGeo.attributes.position.needsUpdate = true;
    fireflyMat.opacity = 0.5 + Math.sin(timeSec * 3.5) * 0.35;
  };

  return { vfxGroup, updateLivingVFX };
}

// ============================================================================
// MAIN SYSTEM BUILDER & FACTORY
// ============================================================================
export function createMuseumSpaceEnrichmentSystem(options = {}) {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'Museum_Space_Enrichment_Root';

  const updateFns = [];
  const hitboxCallbacks = [];

  // 1. BÌNH PHONG GỖ LIM 4 CÁNH ZICZAC (GÓC CHẾT X = ±26, Z = -8)
  const screenWest = createFoldingScreen();
  screenWest.position.set(-26.0, 0, -8.0);
  screenWest.rotation.y = 0.35;
  rootGroup.add(screenWest);

  const screenEast = createFoldingScreen();
  screenEast.position.set(26.0, 0, -8.0);
  screenEast.rotation.y = -0.35;
  rootGroup.add(screenEast);

  hitboxCallbacks.push((hb) => {
    if (!hb) return;
    const boxWest = new THREE.Box3(
      new THREE.Vector3(-26.0 - 1.6, 0, -8.0 - 0.6),
      new THREE.Vector3(-26.0 + 1.6, 2.6, -8.0 + 0.6)
    );
    const boxEast = new THREE.Box3(
      new THREE.Vector3(26.0 - 1.6, 0, -8.0 - 0.6),
      new THREE.Vector3(26.0 + 1.6, 2.6, -8.0 + 0.6)
    );
    hb.registerSolidObjectCollider(null, { customBox: boxWest, tag: 'ScreenWest_SolidHitbox' });
    hb.registerSolidObjectCollider(null, { customBox: boxEast, tag: 'ScreenEast_SolidHitbox' });
  });

  // 2. TÀNG KINH CÁC THU NHỎ (2 KỆ SÁCH CỔ TẠI X = ±33, Z = -10 SÁT TƯỜNG)
  const bookcaseWest = createAntiqueHeritageBookcase();
  bookcaseWest.position.set(-33.2, 0, -10.0);
  bookcaseWest.rotation.y = Math.PI / 2;
  rootGroup.add(bookcaseWest);

  const bookcaseEast = createAntiqueHeritageBookcase();
  bookcaseEast.position.set(33.2, 0, -10.0);
  bookcaseEast.rotation.y = -Math.PI / 2;
  rootGroup.add(bookcaseEast);

  hitboxCallbacks.push((hb) => {
    if (!hb) return;
    const boxWest = new THREE.Box3(
      new THREE.Vector3(-33.8, 0, -10.0 - 1.5),
      new THREE.Vector3(-32.6, 3.4, -10.0 + 1.5)
    );
    const boxEast = new THREE.Box3(
      new THREE.Vector3(32.6, 0, -10.0 - 1.5),
      new THREE.Vector3(33.8, 3.4, -10.0 + 1.5)
    );
    hb.registerSolidObjectCollider(null, { customBox: boxWest, tag: 'BookcaseWest_SolidHitbox' });
    hb.registerSolidObjectCollider(null, { customBox: boxEast, tag: 'BookcaseEast_SolidHitbox' });
  });

  // 3. 2 ĐẠI BỆ TRÒN CẨM THẠCH ĐEN (R = 2.2m, H = 0.45m) HAI BÊN LỐI ĐI TRƯỚC ĐẠI CẦU THANG (X = ±5.5m, Z = 7.2m)
  // Mỗi bệ gồm: 1 Đỉnh Đồng cổ lớn chạm nghê bốc khói trầm, 2 Hạc Thờ cưỡi rùa ngậm sen, 1 Chậu Cây Bonsai tùng bách uốn thế
  const grandPedestalWest = createGrandBronzePedestalSet(true, options);
  grandPedestalWest.setGroup.position.set(-5.5, 0, 7.2);
  rootGroup.add(grandPedestalWest.setGroup);

  const grandPedestalEast = createGrandBronzePedestalSet(false, options);
  grandPedestalEast.setGroup.position.set(5.5, 0, 7.2);
  rootGroup.add(grandPedestalEast.setGroup);

  hitboxCallbacks.push((hb) => {
    if (!hb) return;
    const boxWest = new THREE.Box3(
      new THREE.Vector3(-5.5 - 2.2, 0, 7.2 - 2.2),
      new THREE.Vector3(-5.5 + 2.2, 2.5, 7.2 + 2.2)
    );
    const boxEast = new THREE.Box3(
      new THREE.Vector3(5.5 - 2.2, 0, 7.2 - 2.2),
      new THREE.Vector3(5.5 + 2.2, 2.5, 7.2 + 2.2)
    );
    hb.registerSolidObjectCollider(null, { customBox: boxWest, tag: 'GrandBronzePedestalWest_SolidHitbox' });
    hb.registerSolidObjectCollider(null, { customBox: boxEast, tag: 'GrandBronzePedestalEast_SolidHitbox' });
  });

  // 3b. 2 CỤM BÀN/BỆ TRÒN TRƯNG BÀY BÊN CÁNH GÀ (X = ±14m, Z = 0m)
  // TIỂU CẢNH GỐM CỔ HOÀNG TRIỀU & BONSAI NGHỆ THUẬT CUNG ĐÌNH
  const wingTables = createWingDisplayTables(options);
  rootGroup.add(wingTables);

  hitboxCallbacks.push((hb) => {
    if (!hb) return;
    const boxWest = new THREE.Box3(
      new THREE.Vector3(-14.0 - 1.4, 0, -1.4),
      new THREE.Vector3(-14.0 + 1.4, 2.0, 1.4)
    );
    const boxEast = new THREE.Box3(
      new THREE.Vector3(14.0 - 1.4, 0, -1.4),
      new THREE.Vector3(14.0 + 1.4, 2.0, 1.4)
    );
    hb.registerSolidObjectCollider(null, { customBox: boxWest, tag: 'WingTableWest_SolidHitbox' });
    hb.registerSolidObjectCollider(null, { customBox: boxEast, tag: 'WingTableEast_SolidHitbox' });
  });

  // 4. TRƯỚNG LỤA, RÈM TRÚC, HOÀNH PHI & CÂU ĐỐI TRÊN TƯỜNG
  const silkDecor = createSilkAndCalligraphyDecorations();
  rootGroup.add(silkDecor);

  // 5. GÓC ÔNG ĐỒ & THƯ PHÁP (X = -18.5, Z = 10.0)
  const scholarsNook = createScholarsWritingNook(options);
  rootGroup.add(scholarsNook.nookGroup);
  hitboxCallbacks.push(scholarsNook.registerHitbox);

  // 6. GÓC NHẠC CỤ CỔ TRUYỀN & TRÀ ĐẠO (X = 18.5, Z = 10.0)
  const musicNook = createTraditionalMusicAndTeaNook(options);
  rootGroup.add(musicNook.nookGroup);
  updateFns.push(musicNook.updateSteam);
  hitboxCallbacks.push(musicNook.registerHitbox);

  // 7. GÓC DÂN GIAN & LÀNG NGHỀ (X = -8.0, Z = 18.0)
  const folkNook = createFolkCraftsNook(options);
  rootGroup.add(folkNook.nookGroup);
  hitboxCallbacks.push(folkNook.registerHitbox);

  // 8. TIỂU CẢNH THIÊN NHIÊN TỨ QUÝ & NON BỘ SƯƠNG KHÓI
  const natureGroup = createFourSeasonsBonsaiAndRockery();
  rootGroup.add(natureGroup.natureGroup);
  updateFns.push(natureGroup.updateMist);

  hitboxCallbacks.push((hb) => {
    if (!hb) return;
    const pondBox = new THREE.Box3(
      new THREE.Vector3(8.0 - 1.5, 0, 18.0 - 1.5),
      new THREE.Vector3(8.0 + 1.5, 1.8, 18.0 + 1.5)
    );
    hb.registerSolidObjectCollider(null, { customBox: pondBox, tag: 'CeramicPondRockery_SolidHitbox' });
  });

  // 9. QUẦN THỂ ĐÈN KÉO QUÂN & ĐÈN LỒNG THẢ TRẦN (Y = 12..18m)
  const ceilingLanterns = createCeilingLanternsAndLighting();
  rootGroup.add(ceilingLanterns.ceilingGroup);
  updateFns.push(ceilingLanterns.updateLanterns);

  // 10. HỌA TIẾT MẶT TRỐNG ĐỒNG ĐÔNG SƠN CHIẾU PHÁT QUANG TRÊN SÀN
  const floorMandala = createFloorMandalaProjection();
  rootGroup.add(floorMandala.floorMandalaGroup);
  updateFns.push(floorMandala.updateFloorMandala);

  // 11. LIVING VFX (KHÓI TRẦM, CÁNH HOA RƠI, ĐOM ĐÓM LÂN TINH)
  const burnerPositions = [
    new THREE.Vector3(-5.5, 1.9, 7.05),
    new THREE.Vector3(5.5, 1.9, 7.05)
  ];
  const livingVFX = createSpaceEnrichmentLivingVFX(burnerPositions);
  rootGroup.add(livingVFX.vfxGroup);
  updateFns.push(livingVFX.updateLivingVFX);

  // Hitbox registration function
  const registerHitboxes = (hbMgr) => {
    const hb = hbMgr || options.hitboxManager || (typeof window !== 'undefined' ? (window.__museumHitboxManager || window.hitboxManager) : null);
    if (!hb) return;
    hitboxCallbacks.forEach((cb) => {
      try {
        cb(hb);
      } catch (e) {
        console.warn('[SpaceEnrichment] registerHitbox error:', e);
      }
    });
  };

  rootGroup.userData.registerHitboxes = registerHitboxes;
  if (options.hitboxManager) {
    registerHitboxes(options.hitboxManager);
  }

  // Vòng lặp cập nhật animation
  const update = (timeSec = performance.now() * 0.001) => {
    for (let i = 0; i < updateFns.length; i++) {
      updateFns[i](timeSec);
    }
  };

  rootGroup.userData.update = update;
  rootGroup.userData.registerHitboxes = registerHitboxes;
  rootGroup.update = update;
  rootGroup.registerHitboxes = registerHitboxes;
  rootGroup.rootGroup = rootGroup;
  rootGroup.group = rootGroup;

  return rootGroup;
}
