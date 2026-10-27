import * as THREE from 'three';

/**
 * AUDIO MANAGER MODULE (SPATIAL SOUNDSCAPE ENGINE - GIAI ĐOẠN 5)
 * 
 * Kiến trúc âm thanh đa tầng & Self-Healing:
 * 1. Audio Core & Autoplay Unlocker:
 *    - THREE.AudioListener gắn chặt vào Camera.
 *    - Bắt sự kiện tương tác người dùng đầu tiên (click, keydown, pointerdown) mở khóa AudioContext.
 *    - Nút HUD Mute/Unmute phong cách Indochine Glassmorphism với phản hồi trạng thái tức thì.
 * 
 * 2. Adaptive Background Ambience (BGM Cross-fade 1.5s):
 *    - Kênh Sảnh chính (atriumBgm): Tiếng gió thoảng qua hành lang vòm kết hợp giai điệu Đàn Tranh / Đàn Kìm cổ truyền ngũ cung.
 *    - Kênh Thế giới Kiều (kieuBgm): Tiếng suối róc rách, sáo trúc thanh thoát và không khí hoài niệm chiều tà.
 *    - Tự động Cross-fade mượt mà 1.5 giây khi dịch chuyển qua lại giữa các thế giới.
 * 
 * 3. Interactive SFX Synthesizers (Web Audio API):
 *    - playWhoosh(): Hiệu ứng lướt gió tốc độ cao khi bấm Fast-Travel.
 *    - playBookHover(): Âm thoa / tiếng ngân pha lê vi mô khi tâm ngắm rà trúng cuốn sách ma thuật.
 *    - playFootstep(surfaceType): Nhịp bước chân tự động đổi âm sắc giữa sàn gạch đá bảo tàng ('stone') và nền đất cỏ KieuWorld ('grass').
 * 
 * 4. Positional 3D Audio (KieuWorld):
 *    - Dòng suối uốn lượn (streamAudio): refDistance: 4, maxDistance: 25, âm thanh nước reo rì rào chỉ nghe khi tiến lại gần.
 *    - Nấm mồ Đạm Tiên (damTienAudio): refDistance: 4, maxDistance: 25, tần số trầm dịu ngân u buồn hoài cổ.
 * 
 * Áp dụng quy tắc: AUTO-VALIDATION, DEFENSIVE PROGRAMMING & ZERO NaN POISONING
 */

export const SURFACE_TYPES = {
  STONE: 'stone',
  GRASS: 'grass'
};

export class AudioManager {
  constructor(camera = null, options = {}) {
    this.camera = camera;
    this.options = options;

    this.isUnlocked = false;
    this.isMuted = false;
    this.masterVolume = 1.0;
    this.currentWorld = options.initialWorld ?? 'MUSEUM_ATRIUM';

    // Animation ID cho Cross-fade
    this.crossfadeAnimId = null;

    // Bộ nhớ đệm chống spam âm thanh (Debounce)
    this.lastHoverTime = 0;
    this.lastStepTime = 0;

    try {
      this.initListener();
      this.initAutoplayUnlock();
      this.initBackgroundMusic();
      this.initPositionalAudios();
      this.createHUDToggleUI();
      console.log("%c✓ AudioManager initialized • Spatial Soundscape Engine ready", "color: #39e58c; font-weight: bold;");
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo AudioManager:", err);
    }
  }

  // =========================================================================
  // 1. KHỞI TẠO AUDIO LISTENER & AUTOPLAY UNLOCKER
  // =========================================================================

  initListener() {
    if (!this.camera) return;

    try {
      this.listener = new THREE.AudioListener();
      this.camera.add(this.listener);
      this.context = this.listener.context;

      // Master volume an toàn
      this.listener.setMasterVolume(this.masterVolume);
    } catch (e) {
      console.warn("[SELF-HEALING] Lỗi tạo AudioListener:", e);
    }
  }

  initAutoplayUnlock() {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      try {
        if (this.context && this.context.state === 'suspended') {
          this.context.resume().then(() => {
            this.isUnlocked = true;
            this.onAutoplayUnlocked();
            console.log("%c[AUDIO] AudioContext resumed successfully via user interaction.", "color: #39e58c; font-weight: bold;");
          }).catch(err => {
            console.warn("[AUDIO] Context resume error:", err);
          });
        } else {
          this.isUnlocked = true;
          this.onAutoplayUnlocked();
        }
      } catch (e) {
        console.warn("[SELF-HEALING] Unlock exception:", e);
      }

      window.removeEventListener('click', unlock);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('click', unlock, { once: true, passive: true });
    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true, passive: true });
    window.addEventListener('touchstart', unlock, { once: true, passive: true });
  }

  onAutoplayUnlocked() {
    // Kích hoạt BGM tương ứng với thế giới hiện tại
    if (this.currentWorld === 'KIEU_WORLD') {
      this.startKieuWorldAudio();
    } else {
      this.startMuseumAtriumAudio();
    }
  }

  // =========================================================================
  // 2. NÚT HUD MUTE/UNMUTE KIỂU DÁNG INDOCHINE GLASSMORPHISM
  // =========================================================================

  createHUDToggleUI() {
    if (typeof document === 'undefined') return;

    let toggleBtn = document.getElementById('audio-mute-toggle-btn');
    if (!toggleBtn) {
      toggleBtn = document.createElement('button');
      toggleBtn.id = 'audio-mute-toggle-btn';
      toggleBtn.setAttribute('title', 'Bật / Tắt âm thanh');
      toggleBtn.innerHTML = `
        <span class="audio-btn-icon" id="audio-icon-span">🔊</span>
        <span class="audio-btn-label" id="audio-text-span">ÂM THANH</span>
      `;
      document.body.appendChild(toggleBtn);
    }
    this.muteButton = toggleBtn;

    // Chèn CSS nếu chưa có
    if (!document.getElementById('audio-manager-styles')) {
      const style = document.createElement('style');
      style.id = 'audio-manager-styles';
      style.textContent = `
        #audio-mute-toggle-btn {
          position: fixed;
          top: 16px;
          right: 232px;
          z-index: 9998;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 9px 14px;
          background: rgba(14, 18, 26, 0.88);
          border: 1px solid rgba(212, 175, 55, 0.65);
          border-radius: 20px;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: #f7eed8;
          font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
          font-size: 11.5px;
          font-weight: 700;
          letter-spacing: 0.8px;
          cursor: pointer;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 15px rgba(212, 175, 55, 0.2);
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
          user-select: none;
        }

        #audio-mute-toggle-btn:hover {
          transform: translateY(-2px);
          background: rgba(22, 28, 40, 0.95);
          border-color: #ffd700;
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.6), 0 0 22px rgba(255, 215, 0, 0.4);
        }

        #audio-mute-toggle-btn.is-muted {
          border-color: rgba(255, 95, 87, 0.6);
          color: #ff8b80;
          background: rgba(26, 14, 16, 0.88);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5), 0 0 12px rgba(255, 95, 87, 0.25);
        }

        #audio-mute-toggle-btn .audio-btn-icon {
          font-size: 14px;
          line-height: 1;
        }

        #audio-mute-toggle-btn .audio-btn-label {
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }

        @media (max-width: 900px) {
          #audio-mute-toggle-btn {
            right: 190px;
            padding: 8px 10px;
          }
          #audio-mute-toggle-btn .audio-btn-label {
            display: none;
          }
        }
      `;
      document.head.appendChild(style);
    }

    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleMute();
    });
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    const targetVol = this.isMuted ? 0.0 : this.masterVolume;

    try {
      if (this.listener) {
        this.listener.setMasterVolume(targetVol);
      }
    } catch (e) {
      console.warn("[SELF-HEALING] Error setting master volume:", e);
    }

    this.updateMuteUI();

    // Nếu người dùng chủ động bấm unmute mà AudioContext đang suspended thì mở khóa luôn
    if (!this.isMuted && this.context?.state === 'suspended') {
      this.context.resume().then(() => {
        this.isUnlocked = true;
        this.onAutoplayUnlocked();
      }).catch(() => {});
    }

    console.log(`%c[AUDIO] Sound ${this.isMuted ? 'MUTED' : 'UNMUTED'}`, "color: #39e58c; font-weight: bold;");
    return this.isMuted;
  }

  updateMuteUI() {
    if (!this.muteButton) return;

    const iconSpan = document.getElementById('audio-icon-span');
    const textSpan = document.getElementById('audio-text-span');

    if (this.isMuted) {
      this.muteButton.classList.add('is-muted');
      if (iconSpan) iconSpan.textContent = '🔇';
      if (textSpan) textSpan.textContent = 'ĐÃ TẮT TIẾNG';
    } else {
      this.muteButton.classList.remove('is-muted');
      if (iconSpan) iconSpan.textContent = '🔊';
      if (textSpan) textSpan.textContent = 'ÂM THANH';
    }
  }

  // =========================================================================
  // 3. HỆ THỐNG NHẠC NỀN THÍCH ỨNG (ADAPTIVE AMBIENCE & CROSS-FADE 1.5S)
  // =========================================================================

  initBackgroundMusic() {
    if (!this.listener) return;

    try {
      this.atriumBgm = new THREE.Audio(this.listener);
      this.kieuBgm = new THREE.Audio(this.listener);

      const ctx = this.listener.context;
      if (!ctx) return;

      // 1. Kênh Sảnh chính (atriumBgm): Tiếng gió hành lang vòm + Đàn Tranh / Đàn Kìm cổ truyền
      const atriumBuffer = this.generateProceduralAtriumBgm(ctx);
      if (atriumBuffer) {
        this.atriumBgm.setBuffer(atriumBuffer);
        this.atriumBgm.setLoop(true);
        this.atriumBgm.setVolume(this.currentWorld === 'MUSEUM_ATRIUM' ? 0.6 : 0.0);
      }

      // 2. Kênh Thế giới Kiều (kieuBgm): Tiếng suối róc rách + Sáo Trúc thanh thoát chiều tà
      const kieuBuffer = this.generateProceduralKieuBgm(ctx);
      if (kieuBuffer) {
        this.kieuBgm.setBuffer(kieuBuffer);
        this.kieuBgm.setLoop(true);
        this.kieuBgm.setVolume(this.currentWorld === 'KIEU_WORLD' ? 0.6 : 0.0);
      }
    } catch (e) {
      console.warn("[SELF-HEALING] Error initializing background music channels:", e);
    }
  }

  startMuseumAtriumAudio() {
    try {
      if (this.atriumBgm && !this.atriumBgm.isPlaying && this.atriumBgm.buffer) {
        this.atriumBgm.play();
      }
      if (this.kieuBgm && !this.kieuBgm.isPlaying && this.kieuBgm.buffer) {
        this.kieuBgm.play();
        this.kieuBgm.setVolume(0.0); // Chạy song song ở mức 0 volume
      }
      // Dừng positional audio thế giới Kiều khi ở sảnh
      if (this.streamAudio?.isPlaying) this.streamAudio.pause();
      if (this.damTienAudio?.isPlaying) this.damTienAudio.pause();
    } catch (e) {
      console.warn("[SELF-HEALING] Start atrium audio:", e);
    }
  }

  startKieuWorldAudio() {
    try {
      if (this.kieuBgm && !this.kieuBgm.isPlaying && this.kieuBgm.buffer) {
        this.kieuBgm.play();
      }
      if (this.atriumBgm && !this.atriumBgm.isPlaying && this.atriumBgm.buffer) {
        this.atriumBgm.play();
        this.atriumBgm.setVolume(0.0); // Chạy song song ở mức 0 volume
      }
      // Phát positional audio tại Thế giới Kiều
      if (this.streamAudio && !this.streamAudio.isPlaying && this.streamAudio.buffer) {
        this.streamAudio.play();
      }
      if (this.damTienAudio && !this.damTienAudio.isPlaying && this.damTienAudio.buffer) {
        this.damTienAudio.play();
      }
    } catch (e) {
      console.warn("[SELF-HEALING] Start KieuWorld audio:", e);
    }
  }

  /**
   * Kỹ thuật Cross-fade chuyển âm lượng mượt mà 1.5s giữa 2 kênh BGM
   */
  crossfadeTo(targetWorld, duration = 1.5) {
    if (!this.atriumBgm || !this.kieuBgm) return;

    if (this.crossfadeAnimId) {
      cancelAnimationFrame(this.crossfadeAnimId);
      this.crossfadeAnimId = null;
    }

    this.currentWorld = targetWorld;

    // Đảm bảo cả hai kênh đều đang chạy nếu đã mở khóa
    if (this.isUnlocked) {
      try {
        if (!this.atriumBgm.isPlaying && this.atriumBgm.buffer) this.atriumBgm.play();
        if (!this.kieuBgm.isPlaying && this.kieuBgm.buffer) this.kieuBgm.play();
      } catch (e) {}
    }

    const startAtriumVol = Math.min(1.0, Math.max(0.0, this.atriumBgm.getVolume() || 0.0));
    const startKieuVol = Math.min(1.0, Math.max(0.0, this.kieuBgm.getVolume() || 0.0));

    const targetAtriumVol = targetWorld === 'MUSEUM_ATRIUM' ? 0.6 : 0.0;
    const targetKieuVol = targetWorld === 'KIEU_WORLD' ? 0.6 : 0.0;

    const startTime = performance.now();
    const durationMs = duration * 1000;

    const animateFade = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1.0, elapsed / durationMs);

      // Đường cong mượt mà ease-in-out
      const ease = progress < 0.5 
        ? 2.0 * progress * progress 
        : 1.0 - Math.pow(-2.0 * progress + 2.0, 2) / 2.0;

      const currentAtrium = startAtriumVol + (targetAtriumVol - startAtriumVol) * ease;
      const currentKieu = startKieuVol + (targetKieuVol - startKieuVol) * ease;

      // Khống chế volume tuyệt đối không vượt ngưỡng 1.0
      this.atriumBgm.setVolume(Math.min(1.0, Math.max(0.0, currentAtrium)));
      this.kieuBgm.setVolume(Math.min(1.0, Math.max(0.0, currentKieu)));

      if (progress < 1.0) {
        this.crossfadeAnimId = requestAnimationFrame(animateFade);
      } else {
        this.atriumBgm.setVolume(targetAtriumVol);
        this.kieuBgm.setVolume(targetKieuVol);
        this.crossfadeAnimId = null;

        // Bật/tắt Positional Audio theo thế giới
        if (targetWorld === 'KIEU_WORLD') {
          if (this.isUnlocked) {
            try {
              if (this.streamAudio && !this.streamAudio.isPlaying && this.streamAudio.buffer) this.streamAudio.play();
              if (this.damTienAudio && !this.damTienAudio.isPlaying && this.damTienAudio.buffer) this.damTienAudio.play();
            } catch (e) {}
          }
        } else {
          try {
            if (this.streamAudio?.isPlaying) this.streamAudio.pause();
            if (this.damTienAudio?.isPlaying) this.damTienAudio.pause();
          } catch (e) {}
        }
      }
    };

    this.crossfadeAnimId = requestAnimationFrame(animateFade);
    console.log(`%c[AUDIO] Cross-fading BGM to ${targetWorld} over ${duration}s`, "color: #ff99bb; font-weight: bold;");
  }

  // =========================================================================
  // 4. BỘ TỔNG HỢP ÂM THANH MÔI TRƯỜNG THỦ TỤC (PROCEDURAL SOUND SYNTHESIZER)
  // =========================================================================

  /**
   * Kênh Sảnh chính (atriumBgm):
   * Gió thoảng qua hành lang mở kết hợp giai điệu đàn tranh/đàn kìm cổ truyền bảng lảng
   */
  generateProceduralAtriumBgm(ctx) {
    try {
      const sampleRate = ctx.sampleRate || 44100;
      const loopDuration = 16.0; // 16 giây loop không khựng
      const numSamples = Math.floor(sampleRate * loopDuration);
      const audioBuffer = ctx.createBuffer(2, numSamples, sampleRate);
      const chL = audioBuffer.getChannelData(0);
      const chR = audioBuffer.getChannelData(1);

      // Thang âm ngũ cung truyền thống Việt Nam (C4, D4, F4, G4, A4, C5, D5, G5)
      // Hò (C4=261.63), Xự (D4=293.66), Xang (F4=349.23), Xê (G4=392.00), Cống (A4=440.00)
      const pentatonicNotes = [
        { time: 0.6, freq: 261.63, dur: 2.8, pan: -0.2 },
        { time: 2.8, freq: 392.00, dur: 2.5, pan: 0.25 },
        { time: 5.2, freq: 349.23, dur: 2.7, pan: -0.15 },
        { time: 7.6, freq: 440.00, dur: 3.2, pan: 0.3 },
        { time: 10.4, freq: 523.25, dur: 2.4, pan: 0.1 },
        { time: 12.6, freq: 392.00, dur: 2.8, pan: -0.25 },
      ];

      // 1. Tiếng gió thoảng qua hành lang mở (Filtered Pink Noise with slow breathing)
      let b0L = 0, b1L = 0, b2L = 0, b3L = 0, b4L = 0, b5L = 0, b6L = 0;
      let b0R = 0, b1R = 0, b2R = 0, b3R = 0, b4R = 0, b5R = 0, b6R = 0;

      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;

        // Nhịp thở gió êm dịu chu kỳ 5.3 giây
        const windBreathing = 0.35 + 0.15 * Math.sin(t * (Math.PI * 2 / 5.3));

        // Pink noise L
        const wL = (Math.random() * 2 - 1);
        b0L = 0.99886 * b0L + wL * 0.0555179;
        b1L = 0.99332 * b1L + wL * 0.0750759;
        b2L = 0.96900 * b2L + wL * 0.1538520;
        b3L = 0.86650 * b3L + wL * 0.3104856;
        b4L = 0.55000 * b4L + wL * 0.5329522;
        b5L = -0.7616 * b5L - wL * 0.0168980;
        const pinkL = (b0L + b1L + b2L + b3L + b4L + b5L + b6L + wL * 0.5362) * 0.02 * windBreathing;
        b6L = wL * 0.115926;

        // Pink noise R
        const wR = (Math.random() * 2 - 1);
        b0R = 0.99886 * b0R + wR * 0.0555179;
        b1R = 0.99332 * b1R + wR * 0.0750759;
        b2R = 0.96900 * b2R + wR * 0.1538520;
        b3R = 0.86650 * b3R + wR * 0.3104856;
        b4R = 0.55000 * b4R + wR * 0.5329522;
        b5R = -0.7616 * b5R - wR * 0.0168980;
        const pinkR = (b0R + b1R + b2R + b3R + b4R + b5R + b6R + wR * 0.5362) * 0.02 * windBreathing;
        b6R = wR * 0.115926;

        chL[i] = pinkL;
        chR[i] = pinkR;
      }

      // 2. Giai điệu Đàn Tranh / Đàn Kìm cổ truyền (Plucked String Synthesis)
      pentatonicNotes.forEach(note => {
        const startSample = Math.floor(note.time * sampleRate);
        const noteDurationSamples = Math.floor(note.dur * sampleRate);
        const endSample = Math.min(numSamples, startSample + noteDurationSamples);

        const leftGain = (1.0 - note.pan) * 0.5;
        const rightGain = (1.0 + note.pan) * 0.5;

        for (let i = startSample; i < endSample; i++) {
          const dt = (i - startSample) / sampleRate;

          // Âm sắc tiếng đàn gảy (Attack 2ms, exponential decay 1.1s)
          const attack = Math.min(1.0, dt / 0.003);
          const decay = Math.exp(-dt * 2.2);
          const envelope = attack * decay * 0.12;

          // Rung âm (Vibrato) nhẹ 4.8Hz
          const vibrato = 1.0 + 0.004 * Math.sin(dt * Math.PI * 2 * 4.8);
          const freq = note.freq * vibrato;

          // Họa âm dây đàn (Harmonics 1f, 2f, 3f, 4f)
          const phase = dt * Math.PI * 2 * freq;
          const tone = (
            Math.sin(phase) +
            0.55 * Math.sin(phase * 2.0) +
            0.28 * Math.sin(phase * 3.0) +
            0.12 * Math.sin(phase * 4.0)
          ) * envelope;

          chL[i] += tone * leftGain;
          chR[i] += tone * rightGain;
        }
      });

      // 3. Khử tiếng click tại biên vòng lặp (Seamless Loop Crossfade 0.25s)
      this.applySeamlessBoundaryCrossfade(chL, chR, sampleRate, 0.25);

      return audioBuffer;
    } catch (e) {
      console.warn("[SELF-HEALING] Error generating Atrium BGM buffer:", e);
      return null;
    }
  }

  /**
   * Kênh Thế giới Kiều (kieuBgm):
   * Tiếng suối róc rách, sáo trúc thanh thoát và không khí hoài niệm chiều tà
   */
  generateProceduralKieuBgm(ctx) {
    try {
      const sampleRate = ctx.sampleRate || 44100;
      const loopDuration = 16.0;
      const numSamples = Math.floor(sampleRate * loopDuration);
      const audioBuffer = ctx.createBuffer(2, numSamples, sampleRate);
      const chL = audioBuffer.getChannelData(0);
      const chR = audioBuffer.getChannelData(1);

      // 1. Nền suối róc rách & gió chiều tà
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;

        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        const waterNoise = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.024;
        b6 = white * 0.115926;

        // Bọt nước sủi bọt ngẫu nhiên (Water ripple texture)
        const ripple = Math.sin(t * 820.0 + Math.sin(t * 12.0) * 4.0) * 0.003;

        chL[i] = waterNoise + ripple;
        chR[i] = waterNoise - ripple;
      }

      // 2. Tiếng Sáo Trúc thanh thoát (Bamboo Flute Synthesis)
      // Câu nhạc hoài niệm chiều tà "Tiết Thanh Minh"
      const flutePhrases = [
        { time: 1.2, freq: 440.00, dur: 2.6, pan: -0.1 }, // A4
        { time: 3.9, freq: 523.25, dur: 2.2, pan: 0.15 }, // C5
        { time: 6.3, freq: 587.33, dur: 3.1, pan: -0.1 }, // D5
        { time: 9.6, freq: 440.00, dur: 2.4, pan: 0.2 },  // A4
        { time: 12.2, freq: 392.00, dur: 3.2, pan: -0.15 }, // G4
      ];

      flutePhrases.forEach(note => {
        const startSample = Math.floor(note.time * sampleRate);
        const durSamples = Math.floor(note.dur * sampleRate);
        const endSample = Math.min(numSamples, startSample + durSamples);

        const leftGain = (1.0 - note.pan) * 0.5;
        const rightGain = (1.0 + note.pan) * 0.5;

        for (let i = startSample; i < endSample; i++) {
          const dt = (i - startSample) / sampleRate;

          // Phong bì tiếng sáo (Attack êm đềm 0.18s, decay nhẹ 0.35s)
          const attack = Math.min(1.0, dt / 0.18);
          const release = Math.max(0.0, Math.min(1.0, (note.dur - dt) / 0.35));
          const envelope = attack * release * 0.085;

          // Rung sáo trúc truyền thống (Expression Vibrato 5.1Hz)
          const vibrato = 1.0 + 0.012 * Math.sin(dt * Math.PI * 2 * 5.1);
          const freq = note.freq * vibrato;

          const phase = dt * Math.PI * 2 * freq;

          // Cấu trúc sóng sáo: Fundamental mạnh, họa âm bậc 2 và 3 mờ ấm
          const breathNoise = (Math.random() * 2 - 1) * 0.004;
          const tone = (
            Math.sin(phase) +
            0.24 * Math.sin(phase * 2.0) +
            0.08 * Math.sin(phase * 3.0) +
            breathNoise
          ) * envelope;

          chL[i] += tone * leftGain;
          chR[i] += tone * rightGain;
        }
      });

      // 3. Khử tiếng click tại biên vòng lặp
      this.applySeamlessBoundaryCrossfade(chL, chR, sampleRate, 0.25);

      return audioBuffer;
    } catch (e) {
      console.warn("[SELF-HEALING] Error generating Kieu BGM buffer:", e);
      return null;
    }
  }

  applySeamlessBoundaryCrossfade(chL, chR, sampleRate, fadeSeconds = 0.25) {
    const fadeSamples = Math.floor(sampleRate * fadeSeconds);
    const numSamples = chL.length;
    if (fadeSamples >= numSamples / 2) return;

    for (let i = 0; i < fadeSamples; i++) {
      const alpha = i / fadeSamples; // 0 -> 1
      const invAlpha = 1.0 - alpha; // 1 -> 0

      // Nội suy làm phẳng giữa điểm đầu và điểm cuối
      const endIdx = numSamples - fadeSamples + i;
      const blendL = chL[endIdx] * invAlpha + chL[i] * alpha;
      const blendR = chR[endIdx] * invAlpha + chR[i] * alpha;

      chL[i] = blendL;
      chL[endIdx] = blendL;
      chR[i] = blendR;
      chR[endIdx] = blendR;
    }
  }

  // =========================================================================
  // 5. HIỆU ỨNG ÂM THANH TƯƠNG TÁC (INTERACTIVE SFX SYNTHESIZERS)
  // =========================================================================

  /**
   * playWhoosh():
   * Kích hoạt khi bấm Fast-Travel (tạo cảm giác camera lướt qua không trung)
   */
  playWhoosh() {
    if (!this.context || this.isMuted) return;

    try {
      const now = this.context.currentTime;
      const duration = 0.85;

      // 1. Tạo nguồn nhiễu trắng thời lượng ngắn
      const bufferSize = Math.floor(this.context.sampleRate * duration);
      const noiseBuffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.45;
      }

      const noiseSource = this.context.createBufferSource();
      noiseSource.buffer = noiseBuffer;

      // 2. Bộ lọc dải quét tần số lướt qua không trung (Bandpass Sweep)
      const filter = this.context.createBiquadFilter();
      filter.type = 'bandpass';
      filter.Q.setValueAtTime(2.2, now);
      filter.frequency.setValueAtTime(220, now);
      // Quét vút lên 1800Hz ở đỉnh điểm lướt rồi hạ về 280Hz khi tiếp đất
      filter.frequency.exponentialRampToValueAtTime(1850, now + 0.38);
      filter.frequency.exponentialRampToValueAtTime(260, now + duration);

      // 3. Khuyếch đại âm lượng hình chuông (Attack -> Peak -> Release)
      const gainNode = this.context.createGain();
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.linearRampToValueAtTime(0.38, now + 0.35);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      noiseSource.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.listener.getInput());

      noiseSource.start(now);
      noiseSource.stop(now + duration);

      noiseSource.onended = () => {
        try {
          noiseSource.disconnect();
          filter.disconnect();
          gainNode.disconnect();
        } catch (e) {}
      };
    } catch (e) {
      console.warn("[SELF-HEALING] Error playWhoosh:", e);
    }
  }

  /**
   * playBookHover():
   * Tiếng ngân trong trẻo vi mô khi tâm ngắm rà trúng cuốn sách ma thuật
   */
  playBookHover() {
    if (!this.context || this.isMuted) return;

    const currentTimeMs = performance.now();
    // Giới hạn tần suất phát (debounce 160ms) tránh rè khi liaison nhanh
    if (currentTimeMs - this.lastHoverTime < 160) return;
    this.lastHoverTime = currentTimeMs;

    try {
      const now = this.context.currentTime;
      const duration = 0.45;

      // Họa âm chuông pha lê (E6 = 1318.51Hz & B6 = 1975.53Hz)
      const osc1 = this.context.createOscillator();
      const osc2 = this.context.createOscillator();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1318.51, now);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1975.53, now);

      const gainNode = this.context.createGain();
      gainNode.gain.setValueAtTime(0.0001, now);
      // Attack siêu nhanh 5ms
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.005);
      // Ngân vang nhẹ nhõm tắt dần theo hàm mũ
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(this.listener.getInput());

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + duration);
      osc2.stop(now + duration);

      osc1.onended = () => {
        try {
          osc1.disconnect();
          osc2.disconnect();
          gainNode.disconnect();
        } catch (e) {}
      };
    } catch (e) {
      console.warn("[SELF-HEALING] Error playBookHover:", e);
    }
  }

  /**
   * playFootstep(surfaceType):
   * Tiếng bước chân nhịp nhàng khi đi bộ FPP (tự động đổi âm sắc giữa sàn gạch đá và nền đất cỏ)
   * - surfaceType: 'stone' (sàn đá bảo tàng) hoặc 'grass' (nền đất cỏ KieuWorld)
   */
  playFootstep(surfaceType = SURFACE_TYPES.STONE) {
    if (!this.context || this.isMuted) return;

    const currentTimeMs = performance.now();
    // Bước chân con người nhịp nhàng: tối thiểu 260ms giữa 2 bước
    if (currentTimeMs - this.lastStepTime < 260) return;
    this.lastStepTime = currentTimeMs;

    try {
      const now = this.context.currentTime;
      // Dao động cao độ ngẫu nhiên (+/- 6%) để từng bước chân nghe tự nhiên
      const pitchVariance = 0.94 + Math.random() * 0.12;

      if (surfaceType === SURFACE_TYPES.STONE) {
        // --- 1. SÀN GẠCH ĐÁ CẨM THẠCH: Âm đanh, rõ nét, có chút vang gõ nhẹ ---
        const duration = 0.075;
        const bufferSize = Math.floor(this.context.sampleRate * duration);
        const noiseBuffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.35;
        }

        const noise = this.context.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = this.context.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1150 * pitchVariance, now);
        filter.Q.setValueAtTime(2.8, now);

        // Tiếng gõ đáy nhẹ
        const thump = this.context.createOscillator();
        thump.type = 'sine';
        thump.frequency.setValueAtTime(130 * pitchVariance, now);
        thump.frequency.exponentialRampToValueAtTime(55, now + duration);

        const gainNode = this.context.createGain();
        gainNode.gain.setValueAtTime(0.14, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        noise.connect(filter);
        filter.connect(gainNode);
        thump.connect(gainNode);
        gainNode.connect(this.listener.getInput());

        noise.start(now);
        thump.start(now);
        noise.stop(now + duration);
        thump.stop(now + duration);

        noise.onended = () => {
          try {
            noise.disconnect();
            thump.disconnect();
            filter.disconnect();
            gainNode.disconnect();
          } catch (e) {}
        };
      } else {
        // --- 2. NỀN ĐẤT CỎ KIỀU WORLD: Âm trầm đục, mềm mại, có tiếng sột soạt lá cỏ ---
        const duration = 0.11;
        const bufferSize = Math.floor(this.context.sampleRate * duration);
        const noiseBuffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.28;
        }

        const noise = this.context.createBufferSource();
        noise.buffer = noiseBuffer;

        const filter = this.context.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(420 * pitchVariance, now);

        const softThump = this.context.createOscillator();
        softThump.type = 'sine';
        softThump.frequency.setValueAtTime(80 * pitchVariance, now);
        softThump.frequency.exponentialRampToValueAtTime(40, now + duration);

        const gainNode = this.context.createGain();
        gainNode.gain.setValueAtTime(0.11, now);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        noise.connect(filter);
        filter.connect(gainNode);
        softThump.connect(gainNode);
        gainNode.connect(this.listener.getInput());

        noise.start(now);
        softThump.start(now);
        noise.stop(now + duration);
        softThump.stop(now + duration);

        noise.onended = () => {
          try {
            noise.disconnect();
            softThump.disconnect();
            filter.disconnect();
            gainNode.disconnect();
          } catch (e) {}
        };
      }
    } catch (e) {
      console.warn("[SELF-HEALING] Error playFootstep:", e);
    }
  }

  // =========================================================================
  // 6. ÂM THANH VỊ TRÍ KHÔNG GIAN 3D (POSITIONAL AUDIO - KIEU WORLD)
  // =========================================================================

  initPositionalAudios() {
    if (!this.listener) return;

    try {
      const ctx = this.listener.context;
      if (!ctx) return;

      // A. Dòng suối uốn lượn (streamAudio: refDistance 4, maxDistance 25)
      this.streamAudio = new THREE.PositionalAudio(this.listener);
      this.streamAudio.setRefDistance(4);
      this.streamAudio.setMaxDistance(25);
      this.streamAudio.setRolloffFactor(1.2);
      this.streamAudio.setLoop(true);
      this.streamAudio.setVolume(0.5);

      const streamBuffer = this.generateProceduralStreamWaterBuffer(ctx);
      if (streamBuffer) {
        this.streamAudio.setBuffer(streamBuffer);
      }

      // B. Nấm mồ Đạm Tiên (damTienAudio: refDistance 4, maxDistance 25, âm trầm dịu)
      this.damTienAudio = new THREE.PositionalAudio(this.listener);
      this.damTienAudio.setRefDistance(4);
      this.damTienAudio.setMaxDistance(25);
      this.damTienAudio.setRolloffFactor(1.2);
      this.damTienAudio.setLoop(true);
      this.damTienAudio.setVolume(0.45);

      const graveBuffer = this.generateProceduralDamTienGraveBuffer(ctx);
      if (graveBuffer) {
        this.damTienAudio.setBuffer(graveBuffer);
      }
    } catch (e) {
      console.warn("[SELF-HEALING] Error initializing positional audios:", e);
    }
  }

  /**
   * Tạo buffer âm thanh tiếng nước chảy róc rách của dòng suối
   */
  generateProceduralStreamWaterBuffer(ctx) {
    try {
      const sampleRate = ctx.sampleRate || 44100;
      const duration = 6.0;
      const numSamples = Math.floor(sampleRate * duration);
      const buffer = ctx.createBuffer(1, numSamples, sampleRate);
      const data = buffer.getChannelData(0);

      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        const streamFlow = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.038;
        b6 = white * 0.115926;

        // Âm bọt nước lăn tăn qua ghềnh đá (Multi-resonant water drops)
        const droplet1 = Math.sin(t * 1150.0 + Math.sin(t * 14.0) * 6.0) * 0.006;
        const droplet2 = Math.sin(t * 1820.0 + Math.cos(t * 9.0) * 8.0) * 0.004;

        data[i] = streamFlow + droplet1 + droplet2;
      }

      // Khử click đầu đuôi
      const fadeSamples = Math.floor(sampleRate * 0.2);
      for (let i = 0; i < fadeSamples; i++) {
        const a = i / fadeSamples;
        const endIdx = numSamples - fadeSamples + i;
        const val = data[endIdx] * (1 - a) + data[i] * a;
        data[i] = val;
        data[endIdx] = val;
      }

      return buffer;
    } catch (e) {
      console.warn("[SELF-HEALING] Stream water buffer error:", e);
      return null;
    }
  }

  /**
   * Tạo buffer âm thanh trầm dịu u hoài cho Nấm mồ Đạm Tiên
   * (Tiếng chuông gió / bát hương ngân trầm 110Hz hoài cổ)
   */
  generateProceduralDamTienGraveBuffer(ctx) {
    try {
      const sampleRate = ctx.sampleRate || 44100;
      const duration = 8.0;
      const numSamples = Math.floor(sampleRate * duration);
      const buffer = ctx.createBuffer(1, numSamples, sampleRate);
      const data = buffer.getChannelData(0);

      // Tần số gốc A2 = 110.0Hz và các họa âm u trầm ấm áp
      const fundamental = 110.0;
      const harmonic2 = 220.0;
      const harmonic3 = 165.0; // Quãng 5 êm dịu

      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;

        // Điều chế biên độ chậm 0.25Hz mô phỏng làn khói hương uốn lượn
        const tremolo = 0.75 + 0.25 * Math.sin(t * Math.PI * 2 * 0.25);

        // Sóng sin tinh khiết trầm dịu
        const wave1 = Math.sin(t * Math.PI * 2 * fundamental) * 0.045;
        const wave2 = Math.sin(t * Math.PI * 2 * harmonic2) * 0.022;
        const wave3 = Math.sin(t * Math.PI * 2 * harmonic3) * 0.015;

        // Tiếng ngân chuông gió đồng cổ xa xôi chu kỳ 4s
        const chimeEnv = Math.max(0.0, Math.sin(t * Math.PI * 2 / 4.0));
        const chime = Math.sin(t * Math.PI * 2 * 880.0) * chimeEnv * chimeEnv * chimeEnv * 0.005;

        data[i] = (wave1 + wave2 + wave3 + chime) * tremolo;
      }

      // Khử click đầu đuôi
      const fadeSamples = Math.floor(sampleRate * 0.25);
      for (let i = 0; i < fadeSamples; i++) {
        const a = i / fadeSamples;
        const endIdx = numSamples - fadeSamples + i;
        const val = data[endIdx] * (1 - a) + data[i] * a;
        data[i] = val;
        data[endIdx] = val;
      }

      return buffer;
    } catch (e) {
      console.warn("[SELF-HEALING] Dam Tien buffer error:", e);
      return null;
    }
  }

  attachStreamAudio(streamMesh) {
    if (streamMesh && this.streamAudio) {
      try {
        streamMesh.add(this.streamAudio);
        if (this.isUnlocked && this.currentWorld === 'KIEU_WORLD') {
          if (!this.streamAudio.isPlaying) this.streamAudio.play();
        }
        console.log("%c✓ THREE.PositionalAudio attached to StreamMesh (ref:4, max:25)", "color: #39e58c; font-weight: bold;");
      } catch (e) {
        console.warn("[SELF-HEALING] attachStreamAudio:", e);
      }
    }
  }

  attachDamTienAudio(graveGroup) {
    if (graveGroup && this.damTienAudio) {
      try {
        graveGroup.add(this.damTienAudio);
        if (this.isUnlocked && this.currentWorld === 'KIEU_WORLD') {
          if (!this.damTienAudio.isPlaying) this.damTienAudio.play();
        }
        console.log("%c✓ THREE.PositionalAudio attached to DamTien Grave (ref:4, max:25)", "color: #39e58c; font-weight: bold;");
      } catch (e) {
        console.warn("[SELF-HEALING] attachDamTienAudio:", e);
      }
    }
  }

  // =========================================================================
  // 7. CLEANUP & DESTROY
  // =========================================================================

  dispose() {
    try {
      if (this.crossfadeAnimId) {
        cancelAnimationFrame(this.crossfadeAnimId);
      }
      this.muteButton?.remove?.();
      document.getElementById('audio-manager-styles')?.remove?.();

      if (this.atriumBgm?.isPlaying) this.atriumBgm.stop();
      if (this.kieuBgm?.isPlaying) this.kieuBgm.stop();
      if (this.streamAudio?.isPlaying) this.streamAudio.stop();
      if (this.damTienAudio?.isPlaying) this.damTienAudio.stop();
    } catch (e) {
      console.warn("[SELF-HEALING] Dispose AudioManager error:", e);
    }
  }
}
