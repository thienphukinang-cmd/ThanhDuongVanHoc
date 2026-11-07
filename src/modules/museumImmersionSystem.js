import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';

/**
 * ============================================================================
 * MUSEUM IMMERSION SYSTEM - ÂM THANH 3D, THẺ THƠ TƯƠNG TÁC & WEBXR TELEPORT
 * 
 * Tích hợp 9 kỹ năng chuyên sâu:
 * 1. audio-soundscape-director: THREE.PositionalAudio + Bộ tổng hợp ngũ cung WebAudio
 * 2. interactive-lore-guide: Giao diện thẻ thơ sơn mài hoàng gia + Raycaster Artifacts
 * 3. web-xr-teleport-controller: Hỗ trợ VR Headset + Teleportation Rig 72+ FPS
 * 4. threejs-auto-integrator: Chuẩn hóa listeners, materials và event routing
 * 5. camera-director: Tách biệt Raycaster, hỗ trợ cả FPS PointerLock và chuột tự do
 * 6. environment-lighting-artist: Hiệu ứng ánh sáng hào quang thẻ thơ và teleport marker
 * 7. fps-optimizer: Tối ưu bộ nhớ, dọn dẹp oscillator, audio context pooling
 * 8. shader-coloring-artist: Bảng màu sơn mài đỏ then son, vàng hoàng tộc #fde047
 * 9. mesh-detailing-specialist: Vòng tròn đánh dấu Teleport và Laser beam tinh xảo
 * ============================================================================
 */

// 1. KHO DỮ LIỆU THUYẾT MINH & TRÍCH ĐOẠN THƠ HOÀNG GIA CHO CÁC HIỆN VẬT
export const ARTIFACT_LORE_DATABASE = {
  lobby_dongSonDrum: {
    room: 'ĐẠI SẢNH HOÀNG CUNG • BẢO TÀNG VĂN HỌC',
    title: 'Đài Trống Đồng Đông Sơn - Ngọc Lũ',
    subtitle: 'Bảo vật ngàn năm kết tinh nền văn minh lúa nước sông Hồng',
    poem: [
      '“Trống đồng một thuở vang bờ cõi,',
      'Hồn nước ngàn năm đọng nét hoa.',
      'Mười bốn tia sao bừng nhật nguyệt,',
      'Lạc Hồng muôn thuở vững âu ca.”'
    ],
    description: 'Trống Đồng Ngọc Lũ là đỉnh cao nghệ thuật đúc đồng thời kỳ Hùng Vương. Mặt trống đúc nổi mặt trời 14 tia sáng, bao quanh bởi các vành chim Lạc bay ngược chiều kim đồng hồ, tái hiện sống động tín ngưỡng thờ mặt trời và khát vọng thái bình của dân tộc.'
  },
  lobby_mural_namQuocSonHa: {
    room: 'HÀNH LANG VĂN HIẾN • BẢO TÀNG',
    title: 'Bản Tuyên Ngôn Độc Lập Đầu Tiên',
    subtitle: 'Nam Quốc Sơn Hà • Thái úy Lý Thường Kiệt (1077)',
    poem: [
      '“Nam quốc sơn hà Nam đế cư,',
      'Tiệt nhiên định phận tại thiên thư.',
      'Như hà nghịch lỗ lai xâm phạm,',
      'Nhữ đẳng hành khan thủ bại hư.”'
    ],
    description: 'Bài thơ thần vang vọng bên dòng sông Như Nguyệt năm 1077, khẳng định chủ quyền lãnh thổ bất khả xâm phạm của nước Đại Việt và ý chí quật cường đè bẹp quân xâm lược phương Bắc.'
  },
  lobby_mural_hichTuongSi: {
    room: 'HÀNH LANG VĂN HIẾN • BẢO TÀNG',
    title: 'Hịch Tướng Sĩ • Hưng Đạo Đại Vương',
    subtitle: 'Khí phách Đông A ba lần đại phá quân Nguyên Mông',
    poem: [
      '“Ta thường tới bữa quên ăn,',
      'Nửa đêm vỗ gối, ruột đau như cắt,',
      'Nước mắt đầm đìa, chỉ căm tức rằng',
      'Chưa xả thịt lột da, nuốt gan uống máu quân thù!”'
    ],
    description: 'Hịch Tướng Sĩ là áng văn chính luận bất hủ của Quốc công Tiết chế Trần Hưng Đạo, hiệu triệu lòng yêu nước và tinh thần quyết chiến quyết thắng bảo vệ xã tắc non sông.'
  },
  lobby_mural_binhNgoDaiCao: {
    room: 'HÀNH LANG VĂN HIẾN • BẢO TÀNG',
    title: 'Bình Ngô Đại Cáo • Nguyễn Trãi',
    subtitle: 'Bản Tuyên Ngôn Độc Lập thứ hai của dân tộc (1428)',
    poem: [
      '“Từng nghe: Việc nhân nghĩa cốt ở yên dân,',
      'Quân điếu phạt trước lo trừ bạo.',
      'Như nước Đại Việt ta từ trước,',
      'Vốn xưng nền văn hiến đã lâu.”'
    ],
    description: 'Áng thiên cổ hùng văn do Nguyễn Trãi thừa lệnh vua Lê Thái Tổ tuyên cáo kết thúc 20 năm kháng chiến chống giặc Minh, mở ra kỷ nguyên độc lập tự chủ huy hoàng cho Đại Việt.'
  },
  lobby_mural_doanTruongTanThanh: {
    room: 'HÀNH LANG VĂN HIẾN • BẢO TÀNG',
    title: 'Kiệt Tác Đoạn Trường Tân Thanh',
    subtitle: 'Đại thi hào Nguyễn Du (1765 – 1820)',
    poem: [
      '“Trăm năm trong cõi người ta,',
      'Chữ tài chữ mệnh khéo là ghét nhau.',
      'Trải qua một cuộc bể dâu,',
      'Những điều trông thấy mà đau đớn lòng.”'
    ],
    description: 'Đỉnh cao chói lọi của văn học chữ Nôm và tiếng Việt trung đại, kết tinh tấm lòng nhân đạo bao la của Nguyễn Du trước thân phận con người và kiếp tài hoa bạc mệnh.'
  },
  truyenKieu_hoCam: {
    room: 'CÕI THƠ TRUYỆN KIỀU • NGUYỄN DU',
    title: 'Đàn Hồ Cầm Đêm Thề Nguyền',
    subtitle: 'Hiện vật biểu tượng cho tài sắc và tiếng lòng Thúy Kiều',
    poem: [
      '“Trong như tiếng hạc bay qua,',
      'Đục như nước suối mới sa nửa vời.',
      'Tiếng khoan như gió thoảng ngoài,',
      'Tiếng mau sầm sập như trời đổ mưa.”'
    ],
    description: 'Cung đàn Hồ Cầm do Thúy Kiều so dây trong đêm thề nguyền dưới trăng cùng Kim Trọng tại hiên Lãm Thúy. Tiếng đàn vừa thanh tao trong trẻo vừa chất chứa dự cảm về mười lăm năm lưu lạc trần ai.'
  },
  truyenKieu_kimThoa: {
    room: 'CÕI THƠ TRUYỆN KIỀU • NGUYỄN DU',
    title: 'Trâm Vàng Kim Thoa & Khăn Hồng',
    subtitle: 'Tín vật định tình bên hiên Lãm Thúy',
    poem: [
      '“Cành đào thoắt rụng tay tiên,',
      'Chàng Kim vội vã nâng lên gửi lời.',
      'Trăm năm tạc một chữ đồng,',
      'Đến xương thịt nát, tấm lòng chưa phai.”'
    ],
    description: 'Chiếc trâm vàng vướng trên cành đào chiều thanh minh trở thành sợi dây tơ hồng gắn kết mối tình đầu trong sáng giữa người quốc sắc và kẻ thiên tài.'
  },
  sonTinh_tanVien: {
    room: 'ĐẠI CẢNH SƠN TINH - THỦY TINH',
    title: 'Tản Viên Sơn Thánh • Chúa Miền Non Cao',
    subtitle: 'Biểu tượng ý chí trị thủy bất khuất của dân tộc Văn Lang',
    poem: [
      '“Núi cao sông hãy còn dài,',
      'Năm năm báo oán đời đời đánh ghen.',
      'Nước dâng cao lên bao nhiêu,',
      'Đồi núi Tản Viên lại dâng cao lên bấy nhiêu!”'
    ],
    description: 'Tái hiện cuộc đối đầu nghìn thu giữa Sơn Tinh ngự trên đỉnh núi cao (Y = 42m) và Thủy Tinh cuộn sóng thần (Y = 18.5m), ngợi ca sức mạnh dời non lấp bể chế ngự thiên tai của tổ tiên.'
  },
  sonTinh_thuyTinh: {
    room: 'ĐẠI CẢNH SƠN TINH - THỦY TINH',
    title: 'Đông Hải Thủy Thần • Chúa Vùng Nước Thẳm',
    subtitle: 'Cơn thịnh nộ đại hồng thủy và sóng dữ cuộn trào',
    poem: [
      '“Hô phong hoán vũ dậy trời mây,',
      'Sóng thần cuộn xiết ngập bờ cây.',
      'Đông Hải đùng đùng dâng nước lũ,',
      'Quyết chiến Tản Viên chuyển đất này!”'
    ],
    description: 'Thủy Thần dâng nước sông Hồng và biển Đông cuộn sóng đánh thẳng vào vách núi Tản Viên, tượng trưng cho bão lũ khắc nghiệt miền nhiệt đới.'
  },
  anDuongVuong_noThan: {
    room: 'THÀNH CỔ LOA • AN DƯƠNG VƯƠNG',
    title: 'Nỏ Thần Liên Châu (Linh Quang Thần Cơ)',
    subtitle: 'Vũ khí thần cơ giữ vững non sông Âu Lạc • Cao Lỗ chế tạo',
    poem: [
      '“Một phát tên bay muôn giặc ngã,',
      'Cơ đồ Âu Lạc vững ngàn thu.',
      'Nỏ thần vô ý trao tay giặc,',
      'Nên nỗi cơ đồ đắm biển sâu...”'
    ],
    description: 'Nỏ thần do tướng Cao Lỗ chế tạo với lẫy nỏ bằng vuốt rùa vàng Kim Quy, mỗi phát bắn hàng vạn mũi tên đồng xé gió đẩy lui quân Triệu Đà, để lại bài học xương máu về tinh thần cảnh giác.'
  },
  anDuongVuong_giengNgoc: {
    room: 'THÀNH CỔ LOA • AN DƯƠNG VƯƠNG',
    title: 'Giếng Ngọc Mỵ Châu - Trọng Thủy',
    subtitle: 'Nước mắt nàng Mỵ Châu và ngọc trai sáng ngời',
    poem: [
      '“Lông ngỗng rải đường ngây thơ dẫn lối,',
      'Máu rơi xuống biển hóa châu sa.',
      'Nước giếng Cổ Loa rửa ngọc sáng,',
      'Chứng cho tình bạc xót lòng ta.”'
    ],
    description: 'Hạt ngọc trai mò ở Biển Đông đem rửa bằng nước giếng Cổ Loa thì sáng ngời rực rỡ, minh oan cho trái tim trong sáng của nàng công chúa ngây thơ.'
  },
  voNhat_nieuChao: {
    room: 'XÓM NGỤ CƯ • VỢ NHẶT (KIM LÂN)',
    title: 'Nồi Cháo Cám Đêm Tân Hôn',
    subtitle: 'Ánh sáng tình người và khát vọng sống giữa nạn đói 1945',
    poem: [
      '“Bát cháo cám nghẹn ngào trong cổ họng,',
      'Tiếng trống thúc thuế dồn dập ngoài xa.',
      'Trong tâm trí Tràng bừng lên hình ảnh,',
      'Đoàn người phá kho thóc và cờ đỏ bay qua.”'
    ],
    description: 'Bữa cơm đón dâu nghèo khó nhưng chan chứa tình mẹ thương con của bà cụ Tứ, nhen nhóm niềm tin mãnh liệt vào cách mạng và sự đổi đời.'
  },
  voNhat_denDau: {
    room: 'XÓM NGỤ CƯ • VỢ NHẶT (KIM LÂN)',
    title: 'Ngọn Đèn Dầu Tân Hôn',
    subtitle: 'Ngọn lửa xua tan u tối nghèo khổ của Tràng và Vợ',
    poem: [
      '“Hai hào dầu thắp sáng gian nhà rách,',
      'Nụ cười hé nở giữa chiều tà.',
      'Dù trong đói khát cùng đường tận,',
      'Hạnh phúc vẫn về sưởi ấm ta.”'
    ],
    description: 'Tràng bỏ ra hai hào mua dầu thắp sáng căn nhà rách nát, biểu hiện của sự trân trọng hạnh phúc gia đình và khao khát một mái ấm lương thiện.'
  }
};

/**
 * ============================================================================
 * PHẦN 1: AUDIO SOUNDSCAPE DIRECTOR (ÂM THANH KHÔNG GIAN 3D & NGŨ CUNG)
 * ============================================================================
 */
export class MuseumSpatialAudioDirector {
  constructor(camera, existingListener = null) {
    this.camera = camera;

    // Tái sử dụng AudioListener nếu camera đã có để tránh trùng lặp AudioContext
    if (existingListener) {
      this.listener = existingListener;
    } else {
      const found = this.camera?.children?.find(c => c.isAudioListener);
      if (found) {
        this.listener = found;
      } else {
        this.listener = new THREE.AudioListener();
        this.camera?.add(this.listener);
      }
    }

    this.audioLoader = new THREE.AudioLoader();
    this.positionalSources = new Map();
    this.synthInterval = null;
    this.activeOscillators = [];
    this.isUnlocked = false;

    this._setupAutoUnlock();
  }

  _setupAutoUnlock() {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      try {
        if (this.listener?.context && this.listener.context.state === 'suspended') {
          this.listener.context.resume().then(() => {
            this.isUnlocked = true;
          }).catch(() => {});
        } else {
          this.isUnlocked = true;
        }
      } catch (e) {}

      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('click', unlock);
    };

    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true, passive: true });
    window.addEventListener('click', unlock, { once: true, passive: true });
  }

  /**
   * Gắn nguồn âm thanh 3D (THREE.PositionalAudio) vào một vật thể trung tâm
   */
  attachPositionalSound(key, targetObject3D, {
    audioUrl = null,
    fallbackTheme = 'truyenKieu',
    refDistance = 6,
    maxDistance = 38,
    volume = 0.65
  } = {}) {
    if (!targetObject3D || !this.listener) return null;

    const posAudio = new THREE.PositionalAudio(this.listener);
    posAudio.setRefDistance(refDistance);
    posAudio.setMaxDistance(maxDistance);
    posAudio.setRolloffFactor(1.35);
    posAudio.setVolume(volume);

    targetObject3D.add(posAudio);

    const record = {
      key,
      posAudio,
      fallbackTheme,
      isLoadedFile: false
    };

    if (audioUrl) {
      this.audioLoader.load(
        audioUrl,
        (buffer) => {
          posAudio.setBuffer(buffer);
          posAudio.setLoop(true);
          record.isLoadedFile = true;
        },
        undefined,
        () => {
          record.isLoadedFile = false;
        }
      );
    }

    this.positionalSources.set(key, record);
    return posAudio;
  }

  /**
   * Kích hoạt âm thanh khi bước vào phòng (enterRealm)
   */
  playRealmSoundscape(key) {
    this.stopAllSounds();
    const record = this.positionalSources.get(key);
    const theme = record?.fallbackTheme || key;

    try {
      if (this.listener?.context?.state === 'suspended') {
        this.listener.context.resume().catch(() => {});
      }
    } catch (_) {}

    if (record?.isLoadedFile && record.posAudio && !record.posAudio.isPlaying) {
      record.posAudio.play();
    } else {
      this._startProceduralSoundscape(theme);
    }
  }

  /**
   * Bộ tổng hợp âm thanh WebAudio dự phòng chuẩn thang âm ngũ cung Việt Nam
   */
  _startProceduralSoundscape(theme) {
    if (!this.listener?.context) return;
    const ctx = this.listener.context;

    // Cấu hình thang âm ngũ cung đặc thù theo từng phòng văn học
    let notes = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25]; // Mặc định Đàn Kiều
    let oscType = 'sine';
    let tempoMs = 1800;
    let baseGain = 0.055;

    if (theme.includes('sonTinh') || theme.includes('tanVien')) {
      // Sơn Tinh: Âm cồng chiêng trầm hùng & tiếng gió đại hải
      notes = [82.41, 110.0, 130.81, 146.83, 164.81, 196.0];
      oscType = 'triangle';
      tempoMs = 2200;
      baseGain = 0.075;
    } else if (theme.includes('anDuong') || theme.includes('coloa')) {
      // An Dương Vương: Âm khánh đồng Cổ Loa & chuông chùa
      notes = [196.0, 220.0, 261.63, 329.63, 392.0];
      oscType = 'sine';
      tempoMs = 2400;
      baseGain = 0.06;
    } else if (theme.includes('voNhat')) {
      // Vợ Nhặt: Âm sáo trúc đồng quê trầm lắng
      notes = [329.63, 392.0, 440.0, 523.25, 659.25];
      oscType = 'sine';
      tempoMs = 2000;
      baseGain = 0.045;
    }

    this.synthInterval = setInterval(() => {
      if (ctx.state !== 'running') return;
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        const freq = notes[Math.floor(Math.random() * notes.length)];
        osc.type = oscType;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(baseGain, ctx.currentTime + 0.12);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.2);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 2.3);

        this.activeOscillators.push(osc);
        setTimeout(() => {
          const idx = this.activeOscillators.indexOf(osc);
          if (idx !== -1) this.activeOscillators.splice(idx, 1);
        }, 2400);
      } catch (_) {}
    }, tempoMs);
  }

  /**
   * Dừng toàn bộ âm thanh khi rời phòng (exitRealm)
   */
  stopAllSounds() {
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }

    this.activeOscillators.forEach((osc) => {
      try { osc.stop(); } catch (_) {}
    });
    this.activeOscillators = [];

    this.positionalSources.forEach((rec) => {
      if (rec.posAudio && rec.posAudio.isPlaying) {
        try { rec.posAudio.stop(); } catch (_) {}
      }
    });
  }
}

/**
 * ============================================================================
 * PHẦN 2: INTERACTIVE LORE GUIDE (GIAO DIỆN THẺ THƠ SƠN MÀI HOÀNG GIA)
 * ============================================================================
 */
export class MuseumInteractiveLoreGuide {
  constructor(camera, domElement = document.body) {
    this.camera = camera;
    this.domElement = domElement;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.interactiveArtifacts = [];
    this.isOpen = false;

    this._injectLoreOverlayDOM();
    this._bindEvents();
  }

  _injectLoreOverlayDOM() {
    if (typeof document === 'undefined') return;
    let existing = document.getElementById('museum-lore-overlay');
    if (existing) {
      this.overlayEl = existing;
      return;
    }

    const style = document.createElement('style');
    style.id = 'museum-lore-style';
    style.textContent = `
      #museum-lore-overlay {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(10, 4, 18, 0.78);
        backdrop-filter: blur(8px);
        z-index: 99999;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.28s ease;
        font-family: "Times New Roman", Georgia, serif;
      }
      #museum-lore-overlay.active {
        opacity: 1;
        pointer-events: auto;
      }
      .lore-card {
        max-width: 640px;
        width: 90%;
        background: linear-gradient(145deg, #1f0707 0%, #2e0d16 55%, #12030a 100%);
        border: 3px solid #fde047;
        box-shadow: 0 0 45px rgba(234, 179, 8, 0.45), inset 0 0 24px rgba(253, 224, 71, 0.2);
        border-radius: 14px;
        padding: 30px 36px;
        color: #fdf2f8;
        transform: translateY(18px) scale(0.96);
        transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        position: relative;
      }
      #museum-lore-overlay.active .lore-card {
        transform: translateY(0) scale(1);
      }
      .lore-room-tag {
        color: #f472b6;
        font-size: 13px;
        letter-spacing: 2.5px;
        text-transform: uppercase;
        font-family: "Segoe UI", sans-serif;
        font-weight: 700;
        margin-bottom: 6px;
      }
      .lore-title {
        color: #fde047;
        font-size: 28px;
        font-weight: bold;
        margin: 0 0 6px 0;
        letter-spacing: 0.5px;
        text-shadow: 0 0 16px rgba(253, 224, 71, 0.35);
      }
      .lore-subtitle {
        color: #fbcfe8;
        font-size: 16px;
        font-style: italic;
        margin-bottom: 18px;
      }
      .lore-poem-box {
        background: rgba(0, 0, 0, 0.42);
        border-left: 4px solid #fde047;
        padding: 16px 22px;
        margin: 16px 0;
        font-size: 20px;
        line-height: 1.65;
        color: #fef08a;
        font-style: italic;
        border-radius: 0 8px 8px 0;
      }
      .lore-desc {
        font-family: "Segoe UI", sans-serif;
        font-size: 15.5px;
        line-height: 1.65;
        color: #f8fafc;
        margin-bottom: 24px;
      }
      .lore-close-btn {
        background: linear-gradient(90deg, #ca8a04, #eab308);
        color: #1a0505;
        border: none;
        padding: 10px 24px;
        font-size: 14.5px;
        font-weight: bold;
        border-radius: 6px;
        cursor: pointer;
        float: right;
        box-shadow: 0 0 16px rgba(234, 179, 8, 0.4);
        transition: transform 0.15s ease;
      }
      .lore-close-btn:hover {
        transform: scale(1.04);
      }
    `;
    document.head.appendChild(style);

    this.overlayEl = document.createElement('div');
    this.overlayEl.id = 'museum-lore-overlay';
    this.overlayEl.innerHTML = `
      <div class="lore-card" id="museum-lore-card">
        <div class="lore-room-tag" id="lore-room"></div>
        <h2 class="lore-title" id="lore-title"></h2>
        <div class="lore-subtitle" id="lore-subtitle"></div>
        <div class="lore-poem-box" id="lore-poem"></div>
        <div class="lore-desc" id="lore-desc"></div>
        <button class="lore-close-btn" id="lore-close-btn">Đóng thẻ [ESC]</button>
      </div>
    `;
    document.body.appendChild(this.overlayEl);

    this.overlayEl.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (e.target === this.overlayEl || e.target.id === 'lore-close-btn') {
        this.hideLoreCard();
      }
    });
  }

  /**
   * Đăng ký một hiện vật 3D tương tác với Lore Key tương ứng
   */
  registerArtifact(object3D, loreKey) {
    if (!object3D) return;
    object3D.userData.loreKey = loreKey;
    object3D.userData.isLoreArtifact = true;
    object3D.userData.ignoreRaycaster = false;

    object3D.traverse((child) => {
      if (child.isMesh) {
        child.userData.loreKey = loreKey;
        child.userData.isLoreArtifact = true;
        child.userData.ignoreRaycaster = false;
      }
    });

    if (!this.interactiveArtifacts.includes(object3D)) {
      this.interactiveArtifacts.push(object3D);
    }
  }

  showLoreCard(loreKey) {
    const data = ARTIFACT_LORE_DATABASE[loreKey];
    if (!data || !this.overlayEl) return;

    document.getElementById('lore-room').textContent = `◈ ${data.room} ◈`;
    document.getElementById('lore-title').textContent = data.title;
    document.getElementById('lore-subtitle').textContent = data.subtitle;
    document.getElementById('lore-poem').innerHTML = data.poem.join('<br/>');
    document.getElementById('lore-desc').textContent = data.description;

    this.overlayEl.classList.add('active');
    this.isOpen = true;

    if (document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }

  hideLoreCard() {
    if (!this.overlayEl) return;
    this.overlayEl.classList.remove('active');
    this.isOpen = false;
  }

  _bindEvents() {
    if (typeof window === 'undefined') return;

    window.addEventListener('pointerdown', (e) => {
      if (this.isOpen || this.interactiveArtifacts.length === 0) return;
      if (e.target.closest('#museum-lore-overlay') || e.target.closest('#director-hud')) return;

      const cam = this.camera || window.__camera;
      if (!cam) return;

      if (document.pointerLockElement) {
        this.mouse.set(0, 0);
      } else {
        this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      }

      this.raycaster.setFromCamera(this.mouse, cam);

      // Ưu tiên quét qua các hộp Proxy Hitbox chuẩn của MuseumHitboxManager (Skill: hitbox-collision-architect)
      if (typeof window !== 'undefined' && window.__museumHitboxManager) {
        const proxyHit = window.__museumHitboxManager.raycastInteractiveHitboxes(this.raycaster, 28);
        if (proxyHit && proxyHit.object?.userData?.loreKey) {
          e.stopPropagation();
          this.showLoreCard(proxyHit.object.userData.loreKey);
          return;
        }
      }

      const hits = this.raycaster.intersectObjects(this.interactiveArtifacts, true);

      if (hits.length > 0 && hits[0].distance <= 28) {
        let curr = hits[0].object;
        let loreKey = null;
        while (curr) {
          if (curr.userData && curr.userData.loreKey) {
            loreKey = curr.userData.loreKey;
            break;
          }
          curr = curr.parent;
        }
        if (loreKey) {
          e.stopPropagation();
          this.showLoreCard(loreKey);
        }
      }
    }, true); // Bắt ở capture phase để xử lý trước khi camera xoay

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        e.stopPropagation();
        this.hideLoreCard();
      }
    });
  }
}

/**
 * ============================================================================
 * PHẦN 3: WEBXR TELEPORT CONTROLLER (VR BUTTON & DỊCH CHUYỂN TỨC THỜI 72+ FPS)
 * ============================================================================
 */
export function setupMuseumWebXRTeleport(renderer, scene, cameraRig, walkableFloors = []) {
  if (!renderer || typeof document === 'undefined') return null;

  renderer.xr.enabled = true;
  const vrButton = VRButton.createButton(renderer);
  vrButton.style.zIndex = '9990';
  vrButton.style.bottom = '24px';
  vrButton.style.right = '24px';
  vrButton.style.left = 'auto';
  vrButton.style.opacity = '0.85';
  vrButton.style.borderRadius = '8px';
  vrButton.style.boxShadow = '0 0 16px rgba(56, 189, 248, 0.4)';
  document.body.appendChild(vrButton);

  // Vòng tròn đánh dấu điểm đáp Teleport phát sáng trên mặt sàn bảo tàng
  const markerGroup = new THREE.Group();
  markerGroup.name = 'VR_Teleport_Marker';

  const ringMesh = new THREE.Mesh(
    new THREE.RingGeometry(0.38, 0.56, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      color: 0xfde047,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending
    })
  );
  ringMesh.position.y = 0.04;

  const coreGlow = new THREE.Mesh(
    new THREE.CircleGeometry(0.32, 24).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    })
  );
  coreGlow.position.y = 0.045;

  markerGroup.add(ringMesh, coreGlow);
  markerGroup.visible = false;
  if (scene) scene.add(markerGroup);

  // Tia chỉ tay cầm VR (Controller 0)
  const controller = renderer.xr.getController(0);
  const rayGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -10)
  ]);
  const rayLine = new THREE.Line(
    rayGeo,
    new THREE.LineBasicMaterial({ color: 0x38bdf8 })
  );
  controller.add(rayLine);

  if (scene) {
    scene.add(controller);
  } else if (cameraRig) {
    cameraRig.add(controller);
  }

  const vrRaycaster = new THREE.Raycaster();
  const tempMatrix = new THREE.Matrix4();
  let validTargetPoint = null;

  controller.addEventListener('selectend', () => {
    if (validTargetPoint && renderer.xr.isPresenting) {
      if (cameraRig) {
        cameraRig.position.set(validTargetPoint.x, cameraRig.position.y, validTargetPoint.z);
      }
      markerGroup.visible = false;
    }
  });

  const updateVRTeleport = () => {
    if (!renderer.xr.isPresenting || walkableFloors.length === 0) {
      markerGroup.visible = false;
      return;
    }

    tempMatrix.identity().extractRotation(controller.matrixWorld);
    vrRaycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    vrRaycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const hits = vrRaycaster.intersectObjects(walkableFloors, true);
    if (hits.length > 0 && hits[0].distance <= 25) {
      validTargetPoint = hits[0].point;
      markerGroup.position.copy(validTargetPoint);
      markerGroup.visible = true;
    } else {
      validTargetPoint = null;
      markerGroup.visible = false;
    }
  };

  return { controller, markerGroup, updateVRTeleport };
}

/**
 * ============================================================================
 * FACTORY HÀM KHỞI TẠO TẬP TRUNG HỆ THỐNG ĐA GIÁC QUAN
 * ============================================================================
 */
export function createMuseumImmersionSystem({
  renderer = null,
  scene = null,
  camera = null,
  cameraRig = null,
  walkableFloors = []
} = {}) {
  const spatialAudio = new MuseumSpatialAudioDirector(camera);
  const loreGuide = new MuseumInteractiveLoreGuide(camera);
  const xrTeleport = renderer ? setupMuseumWebXRTeleport(renderer, scene, cameraRig || camera, walkableFloors) : null;

  const immersion = {
    spatialAudio,
    loreGuide,
    xrTeleport,
    update: () => {
      xrTeleport?.updateVRTeleport?.();
    }
  };

  if (typeof window !== 'undefined') {
    window.__museumImmersion = immersion;
    window.__spatialAudio = spatialAudio;
    window.__loreGuide = loreGuide;
  }

  return immersion;
}
