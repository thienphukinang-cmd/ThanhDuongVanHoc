import * as THREE from 'three';

/**
 * ============================================================================
 * MUSEUM LOBBY CORNERS LOTUS PONDS & "DÒNG CHẢY VĂN HỌC" CORRIDOR (60+ FPS)
 * 
 * Tích hợp toàn diện các Kỹ Năng & Hạng Mục:
 * 1. 2 Hồ Sen & Tiểu Cảnh Hòn Non Bộ Trước Sảnh (Góc Tây-Bắc & Đông-Bắc):
 *    - Hồ nước cạn viền đá cổ, mặt nước Custom GLSL Water Shader lăn tăn sóng ngọc bích
 *      phản quang hoàng kim (uTime).
 *    - Cụm lá sen dập dềnh (InstancedMesh), hoa sen hồng/trắng đang hé nở.
 *    - Đàn Cá Chép Vàng bơi lượn: đàn cá chép vàng lấp lánh màu cam vàng (#f59e0b / #fbbf24)
 *      bơi lội uốn lượn nhẹ nhàng theo quỹ đạo vòng cung dưới làn nước trong vắt.
 *    - Cụm Hòn Non Bộ rêu phong nhiều tầng và Đèn Đá Á Đông tỏa ánh sáng vàng ấm (PointLight).
 *    - Âm thanh róc rách thanh tịnh: THREE.PositionalAudio phát âm thanh tiếng nước róc rách
 *      procedural bằng Web Audio API tại mỗi hồ sen (tương thích audioManager / spatialAudio).
 *    - Bọc Box3 collider cản va chạm xung quanh mỗi hồ sen.
 * 
 * 2. Hệ Thống Hành Lang "Dòng Chảy Văn Học" (Corridors & Galleries):
 *    - Hàng Cột Gỗ Lim Uy Nghi: hai hàng cột gỗ lim chạm mây cuốn (InstancedMesh), chân tảng
 *      đá hoa sen, đèn lồng lụa đỏ/vàng tỏa PointLight ấm áp.
 *    - Vệt Nắng Nghiêng Qua Cửa Vòm (InstancedMesh): dải vệt nắng nghiêng bằng InstancedMesh
 *      vật liệu bán trong suốt màu vàng kim đổ xiên từ khung cửa vòm xuống lòng hành lang.
 *    - Phù Điêu & Tranh Khắc Gỗ Dọc Tường: tranh sơn mài then đỏ, tranh dân gian Đông Hồ
 *      (Đám cưới chuột, Hứng dừa...) và các dải lụa thư pháp danh tác (Hồ Xuân Hương, Nguyễn Trãi...),
 *      bố trí đèn hắt (SpotLight) chiếu điểm Chiaroscuro riêng biệt.
 *    - 5 Tủ Kính Bảo Vật Văn Chương: tủ kính đế gỗ trưng bày hiện vật 3D (bút lông trúc & gác bút cổ,
 *      nghiên mực cổ chạm rồng, bản thảo Truyện Kiều chữ Nôm, nón quai thao lụa tơ tằm, ngọn đèn dầu
 *      Bát Tràng) có đèn LED mini rọi và nhãn thông tin tương tác khi lại gần.
 *    - Dòng Sông Chữ (River of Words): dải hạt phát sáng vàng kim và ngọc bích (THREE.Points)
 *      uốn lượn như dải ngân hà chữ cái trôi lững lờ trên trần hành lang.
 *    - WebXR Teleport Waypoints & Hitbox Colliders: đăng ký các điểm dịch chuyển WebXR và Box3
 *      collider cản va chạm cho các cột và tủ kính.
 * 
 * 3. Tối Ưu 60+ FPS:
 *    - Gắn userData.ignoreRaycaster = true trên toàn bộ hạt, vệt nắng, god rays, và mặt nước.
 *    - Zero-allocation trong vòng lặp update.
 * ============================================================================
 */

const LOBBY_VFX_TEX_CACHE = {};

function getVfxTex(key, w, h, drawFn) {
  if (LOBBY_VFX_TEX_CACHE[key]) return LOBBY_VFX_TEX_CACHE[key];
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, w, h);

  const tex = new THREE.CanvasTexture(canvas);
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  if ('colorSpace' in tex && THREE.SRGBColorSpace) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  LOBBY_VFX_TEX_CACHE[key] = tex;
  return tex;
}
const getLobbyVfxTex = getVfxTex;

function getLobbyBubbleTexture() {
  return getLobbyVfxTex('lobby_soft_bubble_particle', 64, 64, (ctx, w, h) => {
    const grad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.4, 'rgba(254, 240, 138, 0.85)');
    grad.addColorStop(0.75, 'rgba(254, 240, 138, 0.2)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
}

/**
 * ============================================================================
 * PROCEDURAL WEB AUDIO BUFFER CHO TIẾNG NƯỚC RÓC RÁCH HỒ SEN (0 MISSING MP3s)
 * ============================================================================
 */
let _cachedLotusPondAudioBuffer = null;

function createLotusPondAudioBuffer(audioCtx) {
  if (!audioCtx) return null;
  if (_cachedLotusPondAudioBuffer) return _cachedLotusPondAudioBuffer;

  const sampleRate = audioCtx.sampleRate || 44100;
  const duration = 5.0; // Vòng lặp 5 giây vô tận
  const length = Math.floor(sampleRate * duration);
  const buffer = audioCtx.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  // Sinh tiếng nước chảy róc rách: Brown noise lọc dải tần thấp + tiếng bọt nước / giọt nước tí tách
  let lp1 = 0;
  let lp2 = 0;
  let bpState1 = 0;
  let bpState2 = 0;

  // Hạt giống ngẫu nhiên cố định để âm thanh mượt mà
  const bubbleSchedule = [];
  const numBubbles = 36;
  for (let b = 0; b < numBubbles; b++) {
    bubbleSchedule.push({
      time: (b / numBubbles) * duration + (Math.random() * 0.08 - 0.04),
      freq: 680 + Math.random() * 720,
      decay: 26 + Math.random() * 18,
      amp: 0.12 + Math.random() * 0.16
    });
  }

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;

    // 1. Dòng suối róc rách nền (Filtered Noise)
    const white = Math.random() * 2 - 1;
    lp1 += 0.04 * (white - lp1);
    lp2 += 0.03 * (lp1 - lp2);

    // Bandpass cộng hưởng khoảng 480Hz - 900Hz
    const bpFreq = 0.065;
    bpState1 += bpFreq * (lp2 - bpState1 - 0.35 * bpState2);
    bpState2 += bpFreq * bpState1;

    let sample = bpState2 * 0.38;

    // 2. Tiếng giọt nước tí tách rơi vào lòng hồ (Procedural Water Droplets)
    for (let b = 0; b < numBubbles; b++) {
      const bubble = bubbleSchedule[b];
      const dt = t - bubble.time;
      if (dt >= 0 && dt < 0.18) {
        const env = Math.exp(-dt * bubble.decay);
        // Tần số biến thiên nhẹ như bong bóng nở rồi vỡ
        const f = bubble.freq * (1.0 + dt * 1.5);
        const drop = Math.sin(2 * Math.PI * f * dt) * env * bubble.amp;
        sample += drop;
      }
    }

    // 3. Khử tiếng click tại điểm nối đầu - cuối (Seamless loop crossfade)
    const fadeLen = 0.12;
    if (t < fadeLen) {
      const w = t / fadeLen;
      sample *= w;
    } else if (t > duration - fadeLen) {
      const w = (duration - t) / fadeLen;
      sample *= w;
    }

    data[i] = sample;
  }

  _cachedLotusPondAudioBuffer = buffer;
  return buffer;
}

/**
 * Gắn PositionalAudio procedural vào vị trí hồ sen
 */
function attachLotusPondPositionalAudio(anchorObj, audioManager) {
  if (typeof window === 'undefined') return null;

  const spatial = audioManager || window.__spatialAudio || window.__audioManager;
  const listener = spatial?.listener || window.__audioListener;
  if (!listener) return null;

  try {
    const posAudio = new THREE.PositionalAudio(listener);
    posAudio.setRefDistance(2.8);
    posAudio.setMaxDistance(16.0);
    posAudio.setRolloffFactor(1.0);
    posAudio.setVolume(0.48);
    posAudio.setLoop(true);
    anchorObj.add(posAudio);

    const activate = () => {
      const ctx = listener.context;
      if (!ctx) return;
      if (!posAudio.buffer) {
        const buf = createLotusPondAudioBuffer(ctx);
        if (buf) {
          posAudio.setBuffer(buf);
        }
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
    console.warn('[LobbyLotusPond] PositionalAudio init error:', err);
    return null;
  }
}

/**
 * ============================================================================
 * 1. CUSTOM WATER SHADER CHO HỒ SEN NON BỘ
 * ============================================================================
 */
function createCustomWaterMaterial() {
  const uniforms = {
    uTime: { value: 0.0 },
    uDeepColor: { value: new THREE.Color(0x064e3b) },    // Xanh thẳm ngọc bích
    uShallowColor: { value: new THREE.Color(0x14b8a6) }, // Xanh lam ngọc trong veo
    uSunHighlight: { value: new THREE.Color(0xfef08a) }   // Vàng kim phản xạ mặt trời
  };

  const vertexShader = `
    uniform float uTime;
    varying vec2 vUv;
    varying float vWave;

    void main() {
      vUv = uv;
      vec3 pos = position;

      // Sóng gợn lăn tăn mềm mại đa tần số
      float wave1 = sin(pos.x * 4.6 + uTime * 2.2) * 0.022;
      float wave2 = cos(pos.y * 5.0 + uTime * 1.9) * 0.022;
      float wave3 = sin((pos.x + pos.y) * 3.2 + uTime * 1.4) * 0.014;
      pos.z += wave1 + wave2 + wave3;
      vWave = wave1 + wave2 + wave3;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `;

  const fragmentShader = `
    uniform float uTime;
    uniform vec3 uDeepColor;
    uniform vec3 uShallowColor;
    uniform vec3 uSunHighlight;
    varying vec2 vUv;
    varying float vWave;

    void main() {
      // Phối màu nước ngọc bích theo độ sâu gợn sóng
      float depthMix = smoothstep(-0.035, 0.035, vWave);
      vec3 waterCol = mix(uDeepColor, uShallowColor, depthMix);

      // Mạng lưới vân caustics phản quang lấp lánh
      float c1 = sin(vUv.x * 26.0 + uTime * 2.4) * sin(vUv.y * 26.0 + uTime * 1.8);
      float c2 = cos(vUv.x * 18.0 - uTime * 1.6) * cos(vUv.y * 18.0 + uTime * 2.1);
      float caustic = clamp((c1 + c2) * 0.35 + 0.5, 0.0, 1.0);
      caustic = pow(caustic, 4.0) * 0.52;

      // Phản chiếu ánh nắng hoàng kim
      vec3 finalCol = waterCol + uSunHighlight * caustic;
      gl_FragColor = vec4(finalCol, 0.82);
    }
  `;

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  mat.userData.uniforms = uniforms;
  return mat;
}

/**
 * ============================================================================
 * 2. ĐÀN CÁ CHÉP VÀNG BƠI LƯỢN (GOLDEN KOI CARP SCHOOL) DƯỚI LÀN NƯỚC TRONG VẮT
 * ============================================================================
 */
function createGoldenKoiSchool(pondRadius = 2.2) {
  const koiGroup = new THREE.Group();
  koiGroup.name = 'Golden_Koi_Fish_School';
  koiGroup.userData.ignoreRaycaster = true;

  const koiCount = 7; // Mỗi hồ 7 chú cá chép vàng
  const koiList = [];

  // Tạo geometry cá chép: Thân thuôn dài + Vây đuôi mềm mại + Vây lưng
  const bodyGeo = new THREE.ConeGeometry(0.065, 0.32, 7);
  bodyGeo.rotateX(Math.PI / 2); // Trục bơi dọc theo Z

  const tailGeo = new THREE.PlaneGeometry(0.12, 0.16);
  tailGeo.rotateY(Math.PI / 2);

  // Chất liệu cá chép vàng lấp lánh (#f59e0b / #fbbf24)
  const koiMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.28,
    metalness: 0.75,
    emissive: 0x78350f,
    emissiveIntensity: 0.42
  });

  const koiAccentMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.2,
    metalness: 0.85,
    emissive: 0xd97706,
    emissiveIntensity: 0.55,
    side: THREE.DoubleSide
  });

  for (let k = 0; k < koiCount; k++) {
    const singleKoi = new THREE.Group();
    singleKoi.name = `GoldenKoi_${k + 1}`;
    singleKoi.userData.ignoreRaycaster = true;

    // Thân cá
    const bodyMesh = new THREE.Mesh(bodyGeo, koiMat);
    bodyMesh.castShadow = false;
    bodyMesh.receiveShadow = false;
    bodyMesh.userData.ignoreRaycaster = true;
    singleKoi.add(bodyMesh);

    // Đầu cá tròn
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), koiAccentMat);
    headMesh.position.set(0, 0, 0.15);
    headMesh.userData.ignoreRaycaster = true;
    singleKoi.add(headMesh);

    // Khớp đuôi và vây đuôi cá lụa
    const tailAnchor = new THREE.Group();
    tailAnchor.position.set(0, 0, -0.16);
    tailAnchor.userData.ignoreRaycaster = true;

    const tailMesh = new THREE.Mesh(tailGeo, koiAccentMat);
    tailMesh.position.set(0, 0.02, -0.07);
    tailMesh.userData.ignoreRaycaster = true;
    tailAnchor.add(tailMesh);
    singleKoi.add(tailAnchor);

    // Vây ngực 2 bên
    const finGeo = new THREE.PlaneGeometry(0.06, 0.08);
    const leftFin = new THREE.Mesh(finGeo, koiAccentMat);
    leftFin.rotation.set(-0.3, 0.5, 0.2);
    leftFin.position.set(0.065, -0.01, 0.05);
    leftFin.userData.ignoreRaycaster = true;

    const rightFin = new THREE.Mesh(finGeo, koiAccentMat);
    rightFin.rotation.set(-0.3, -0.5, -0.2);
    rightFin.position.set(-0.065, -0.01, 0.05);
    rightFin.userData.ignoreRaycaster = true;
    singleKoi.add(leftFin, rightFin);

    // Tham số bơi lội vòng cung mềm mại
    const orbitRadiusX = 0.75 + (k % 4) * 0.32;
    const orbitRadiusZ = 0.65 + (k % 3) * 0.38;
    const speed = 0.48 + (k % 3) * 0.16;
    const phaseOffset = k * ((Math.PI * 2) / koiCount);
    const swimDepth = 0.18 + (k % 3) * 0.04; // Nằm sâu dưới mặt nước Y = 0.36m
    const direction = k % 4 === 0 ? -1.0 : 1.0; // Phần lớn bơi thuận chiều, 1 số rẽ lối

    singleKoi.position.y = swimDepth;
    koiGroup.add(singleKoi);

    koiList.push({
      group: singleKoi,
      tailAnchor,
      orbitRadiusX,
      orbitRadiusZ,
      speed,
      phaseOffset,
      swimDepth,
      direction
    });
  }

  // Bụi nước lấp lánh phản quang theo đàn cá
  const bubbleCount = 28;
  const bubbleGeo = new THREE.BufferGeometry();
  const bubblePos = new Float32Array(bubbleCount * 3);
  for (let b = 0; b < bubbleCount; b++) {
    const ang = Math.random() * Math.PI * 2;
    const rad = Math.random() * (pondRadius * 0.85);
    bubblePos[b * 3 + 0] = Math.cos(ang) * rad;
    bubblePos[b * 3 + 1] = 0.15 + Math.random() * 0.18;
    bubblePos[b * 3 + 2] = Math.sin(ang) * rad;
  }
  bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bubblePos, 3));
  const bubbleTex = getLobbyBubbleTexture();
  const bubbleMat = new THREE.PointsMaterial({
    map: bubbleTex,
    color: 0xfef08a,
    size: 0.18,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const bubblePoints = new THREE.Points(bubbleGeo, bubbleMat);
  bubblePoints.userData.ignoreRaycaster = true;
  bubblePoints.raycast = () => {};
  koiGroup.add(bubblePoints);

  const updateKoi = (timeSec) => {
    // 1. Cập nhật vị trí & hướng bơi cho từng chú cá chép
    for (let i = 0; i < koiList.length; i++) {
      const koi = koiList[i];
      const theta = koi.phaseOffset + timeSec * koi.speed * koi.direction;

      // Quỹ đạo hình elip kết hợp gợn sóng hình sin
      const posX = Math.cos(theta) * koi.orbitRadiusX + Math.sin(theta * 2.0) * 0.08;
      const posZ = Math.sin(theta) * koi.orbitRadiusZ + Math.cos(theta * 1.5) * 0.08;
      const posY = koi.swimDepth + Math.sin(timeSec * 2.5 + koi.phaseOffset) * 0.025;

      // Vector tiếp tuyến hướng đi để xoay đầu cá chuẩn xác
      const nextTheta = theta + 0.04 * koi.direction;
      const nextX = Math.cos(nextTheta) * koi.orbitRadiusX;
      const nextZ = Math.sin(nextTheta) * koi.orbitRadiusZ;
      const heading = Math.atan2(nextX - posX, nextZ - posZ);

      koi.group.position.set(posX, posY, posZ);
      koi.group.rotation.y = heading;
      koi.group.rotation.x = Math.sin(timeSec * 3.0 + koi.phaseOffset) * 0.06;
      koi.group.rotation.z = Math.cos(timeSec * 2.2 + koi.phaseOffset) * 0.05;

      // Vẫy đuôi cá nhịp nhàng linh động
      if (koi.tailAnchor) {
        koi.tailAnchor.rotation.y = Math.sin(timeSec * 6.5 + koi.phaseOffset) * 0.45;
      }
    }

    // 2. Bụi bọt nước lững lờ dưới hồ
    const bPosAttr = bubbleGeo.attributes.position;
    for (let b = 0; b < bubbleCount; b++) {
      bubblePos[b * 3 + 1] += 0.0012;
      if (bubblePos[b * 3 + 1] > 0.35) {
        bubblePos[b * 3 + 1] = 0.12;
      }
    }
    bPosAttr.needsUpdate = true;
  };

  return { koiGroup, updateKoi };
}

/**
 * ============================================================================
 * 3. TIỂU CẢNH 2 HỒ SEN & NON BỘ GÓC SẢNH (TÂY-BẮC & ĐÔNG-BẮC)
 * ============================================================================
 */
export function createLobbyCornersLotusPonds({ hitboxManager = null, audioManager = null } = {}) {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'Lobby_Corner_Lotus_Ponds_Root';

  // 2 Góc sảnh chính: Tây-Bắc (-14.5, 0, -13.5) và Đông-Bắc (14.5, 0, -13.5)
  const pondSpots = [
    { x: -14.5, z: -13.5, rotY: 0.35, name: 'WestNorth' },
    { x: 14.5, z: -13.5, rotY: -0.35, name: 'EastNorth' }
  ];

  const waterMaterials = [];
  const updateFns = [];

  // Vị trí phân bố lá sen trên mỗi hồ sen (InstancedMesh cho 60+ FPS)
  const leavesPerPond = 10;
  const leafLayouts = [
    { lx: -0.85, lz: -0.45, s: 1.15, phase: 0.2 },
    { lx: -1.25, lz: 0.35, s: 0.95, phase: 1.1 },
    { lx: -0.45, lz: 0.85, s: 1.05, phase: 2.3 },
    { lx: 0.85, lz: 0.75, s: 1.2, phase: 3.4 },
    { lx: 1.15, lz: -0.25, s: 0.9, phase: 4.2 },
    { lx: 0.15, lz: -1.05, s: 1.0, phase: 5.1 },
    { lx: -0.75, lz: -0.95, s: 0.85, phase: 0.7 },
    { lx: 0.75, lz: -0.85, s: 0.95, phase: 2.9 },
    { lx: -1.1, lz: -0.15, s: 1.1, phase: 1.8 },
    { lx: 1.25, lz: 0.45, s: 0.8, phase: 3.9 }
  ];

  // InstancedMesh Lá sen chung cho cả 2 hồ (20 lá tổng cộng)
  const totalLeaves = pondSpots.length * leavesPerPond;
  const leafGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.018, 14);
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x166534,
    roughness: 0.55,
    metalness: 0.1,
    side: THREE.FrontSide
  });
  const leafInstanced = new THREE.InstancedMesh(leafGeo, leafMat, totalLeaves);
  leafInstanced.name = 'Lotus_Leaves_Instanced';
  leafInstanced.userData.ignoreRaycaster = true;
  rootGroup.add(leafInstanced);

  const dummyLeaf = new THREE.Object3D();
  const leafStateList = [];

  pondSpots.forEach((spot, pIdx) => {
    const pondGroup = new THREE.Group();
    pondGroup.name = `Lotus_Pond_${spot.name}`;
    pondGroup.position.set(spot.x, 0, spot.z);
    pondGroup.rotation.y = spot.rotY;

    // 1. Viền đá hồ tự nhiên (Stone Basin Plinth) R = 2.45m, cao 0.42m
    const rimGeo = new THREE.CylinderGeometry(2.45, 2.6, 0.42, 18);
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.78,
      metalness: 0.12,
      side: THREE.FrontSide
    });
    const rimMesh = new THREE.Mesh(rimGeo, stoneMat);
    rimMesh.position.y = 0.21;
    rimMesh.userData.ignoreRaycaster = true;
    pondGroup.add(rimMesh);

    // Đáy hồ đá sỏi rêu cổ
    const bedGeo = new THREE.CircleGeometry(2.4, 18);
    const bedMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.9,
      side: THREE.FrontSide
    });
    const bedMesh = new THREE.Mesh(bedGeo, bedMat);
    bedMesh.rotation.x = -Math.PI / 2;
    bedMesh.position.y = 0.04;
    bedMesh.userData.ignoreRaycaster = true;
    pondGroup.add(bedMesh);

    // 2. Mặt nước Custom GLSL Water Shader R = 2.35m tại Y = 0.36m
    const waterGeo = new THREE.PlaneGeometry(4.7, 4.7, 24, 24);
    const waterMat = createCustomWaterMaterial();
    waterMaterials.push(waterMat);

    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = 0.36;
    waterMesh.userData.ignoreRaycaster = true;
    pondGroup.add(waterMesh);

    // 3. Đàn Cá Chép Vàng bơi lội uốn lượn dưới làn nước
    const { koiGroup, updateKoi } = createGoldenKoiSchool(2.2);
    pondGroup.add(koiGroup);
    updateFns.push(updateKoi);

    // 4. Hòn Non Bộ rêu phong nhiều tầng (Layered Rockery Peaks)
    const nonBoGroup = new THREE.Group();
    nonBoGroup.name = `NonBo_Peaks_${spot.name}`;
    nonBoGroup.position.set(0.4, 0.36, -0.4);

    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.88,
      metalness: 0.1
    });

    const peaks = [
      { rTop: 0.14, rBot: 0.58, h: 1.65, x: 0, y: 0.82, z: 0 },
      { rTop: 0.09, rBot: 0.42, h: 1.15, x: -0.48, y: 0.58, z: 0.32 },
      { rTop: 0.08, rBot: 0.36, h: 0.9, x: 0.48, y: 0.45, z: 0.28 },
      { rTop: 0.06, rBot: 0.28, h: 0.65, x: -0.2, y: 0.32, z: -0.42 }
    ];

    peaks.forEach((pk) => {
      const pMesh = new THREE.Mesh(new THREE.ConeGeometry(pk.rBot, pk.h, 7), rockMat);
      pMesh.position.set(pk.x, pk.y, pk.z);
      pMesh.userData.ignoreRaycaster = true;
      nonBoGroup.add(pMesh);
    });

    // Điểm các mảng rêu phong xanh mướt nhiều tầng
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.92 });
    const mossNodes = [
      { x: -0.25, y: 0.98, z: 0.15, r: 0.32 },
      { x: 0.35, y: 0.65, z: 0.12, r: 0.26 },
      { x: -0.42, y: 0.48, z: -0.15, r: 0.24 }
    ];
    mossNodes.forEach((mn) => {
      const mossMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(mn.r, 0), mossMat);
      mossMesh.position.set(mn.x, mn.y, mn.z);
      mossMesh.userData.ignoreRaycaster = true;
      nonBoGroup.add(mossMesh);
    });

    // Đèn đá Á Đông (Stone Toro Lantern) trên mỏm non bộ
    const lanternBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.2, 0.48, 6),
      stoneMat
    );
    lanternBase.position.set(0.68, 0.68, -0.22);

    const lanternRoof = new THREE.Mesh(
      new THREE.ConeGeometry(0.38, 0.26, 6),
      stoneMat
    );
    lanternRoof.position.set(0.68, 1.0, -0.22);
    lanternBase.userData.ignoreRaycaster = true;
    lanternRoof.userData.ignoreRaycaster = true;
    nonBoGroup.add(lanternBase, lanternRoof);

    // Ánh sáng PointLight vàng ấm 2700K từ đèn đá
    const lanternLight = new THREE.PointLight(0xfef08a, 0.9, 7.0, 1.2);
    lanternLight.position.set(spot.x + 0.68, 1.25, spot.z - 0.22);
    lanternLight.userData.ignoreRaycaster = true;
    rootGroup.add(lanternLight);

    pondGroup.add(nonBoGroup);

    // 5. Hoa Sen Hồng & Trắng hé nở nổi trên mặt hồ
    const flowerSpecs = [
      { x: -1.1, z: 0.5, isWhite: false, scale: 1.0 },  // Hoa sen hồng thắm
      { x: 0.95, z: -0.1, isWhite: true, scale: 0.92 }, // Hoa sen trắng tinh khôi
      { x: -0.3, z: 0.95, isWhite: false, scale: 0.85 } // Búp sen hồng hé nở
    ];

    flowerSpecs.forEach((fSpec) => {
      const flowerGroup = new THREE.Group();
      flowerGroup.position.set(fSpec.x, 0.42, fSpec.z);
      flowerGroup.scale.setScalar(fSpec.scale);
      flowerGroup.userData.ignoreRaycaster = true;

      // Cánh hoa
      const petalMat = new THREE.MeshStandardMaterial({
        color: fSpec.isWhite ? 0xf8fafc : 0xf472b6,
        emissive: fSpec.isWhite ? 0xfbcfe8 : 0x831843,
        emissiveIntensity: fSpec.isWhite ? 0.15 : 0.28,
        roughness: 0.38,
        side: THREE.DoubleSide
      });

      // Lớp cánh xòe
      const petals1 = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.22, 6), petalMat);
      petals1.rotation.x = Math.PI;
      petals1.userData.ignoreRaycaster = true;

      // Nhụy sen vàng rực rỡ
      const carpel = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xfacc15 })
      );
      carpel.position.y = 0.08;
      carpel.userData.ignoreRaycaster = true;

      flowerGroup.add(petals1, carpel);
      pondGroup.add(flowerGroup);
    });

    // 6. Cài đặt ma trận ban đầu cho cụm lá sen InstancedMesh
    leafLayouts.forEach((l, lIdx) => {
      const globalIdx = pIdx * leavesPerPond + lIdx;

      // Chuyển vị trí cục bộ sang tọa độ thế giới của sảnh
      const cosR = Math.cos(spot.rotY);
      const sinR = Math.sin(spot.rotY);
      const wx = spot.x + (l.lx * cosR - l.lz * sinR);
      const wz = spot.z + (l.lx * sinR + l.lz * cosR);

      leafStateList.push({
        idx: globalIdx,
        baseX: wx,
        baseY: 0.38,
        baseZ: wz,
        scale: l.s,
        phase: l.phase,
        rotY: spot.rotY + (Math.random() - 0.5) * 0.5
      });

      dummyLeaf.position.set(wx, 0.38, wz);
      dummyLeaf.rotation.set(0, spot.rotY, 0);
      dummyLeaf.scale.set(l.s, 1, l.s);
      dummyLeaf.updateMatrix();
      leafInstanced.setMatrixAt(globalIdx, dummyLeaf.matrix);
    });

    // 7. Gắn THREE.PositionalAudio phát âm thanh tiếng nước róc rách procedural
    const audioAnchor = new THREE.Object3D();
    audioAnchor.position.set(0.4, 0.45, -0.4);
    pondGroup.add(audioAnchor);
    attachLotusPondPositionalAudio(audioAnchor, audioManager);
    pondGroup.userData.audioAnchor = audioAnchor;

    rootGroup.add(pondGroup);
  });

  // 8. Bọc Hitbox Box3 collider cản va chạm xung quanh mỗi hồ sen
  const registerPondHitboxes = (hbMgr) => {
    const hb = hbMgr || hitboxManager || (typeof window !== 'undefined' ? (window.__museumHitboxManager || window.hitboxManager) : null);
    if (!hb) return;
    pondSpots.forEach((spot) => {
      const pondBox = new THREE.Box3(
        new THREE.Vector3(spot.x - 2.55, 0, spot.z - 2.55),
        new THREE.Vector3(spot.x + 2.55, 1.85, spot.z + 2.55)
      );
      hb.registerSolidObjectCollider(null, {
        customBox: pondBox,
        tag: `LotusPond_${spot.name}_SolidHitbox`,
        helperColor: 0x14b8a6
      });
    });
  };

  rootGroup.userData.registerHitboxes = registerPondHitboxes;
  if (hitboxManager) {
    registerPondHitboxes(hitboxManager);
  }

  // Kết nối audio phụ trợ khi audioManager được khởi tạo trễ
  rootGroup.userData.wireAudio = (mgr) => {
    pondSpots.forEach((spot) => {
      const pg = rootGroup.getObjectByName(`Lotus_Pond_${spot.name}`);
      if (pg && pg.userData.audioAnchor) {
        attachLotusPondPositionalAudio(pg.userData.audioAnchor, mgr);
      }
    });
  };

  leafInstanced.instanceMatrix.needsUpdate = true;

  // Vòng lặp cập nhật animation: Sóng nước + Đàn cá bơi + Lá sen dập dềnh
  rootGroup.userData.update = (timeSec) => {
    // 1. Cập nhật uTime cho Custom Water Shader
    waterMaterials.forEach((mat) => {
      if (mat?.userData?.uniforms) {
        mat.userData.uniforms.uTime.value = timeSec;
      }
    });

    // 2. Cập nhật đàn cá chép bơi lội
    updateFns.forEach((fn) => fn(timeSec));

    // 3. Lá sen dập dềnh bập bềnh theo sóng nước
    leafStateList.forEach((st) => {
      const bobY = st.baseY + Math.sin(timeSec * 2.2 + st.phase) * 0.016;
      const tiltX = Math.sin(timeSec * 1.8 + st.phase) * 0.045;
      const tiltZ = Math.cos(timeSec * 1.6 + st.phase) * 0.045;

      dummyLeaf.position.set(st.baseX, bobY, st.baseZ);
      dummyLeaf.rotation.set(tiltX, st.rotY, tiltZ);
      dummyLeaf.scale.set(st.scale, 1, st.scale);
      dummyLeaf.updateMatrix();
      leafInstanced.setMatrixAt(st.idx, dummyLeaf.matrix);
    });
    leafInstanced.instanceMatrix.needsUpdate = true;
  };

  return rootGroup;
}

/**
 * ============================================================================
 * 4. TỦ KÍNH BẢO VẬT VĂN CHƯƠNG: HIỆN VẬT 3D ĐẶC SẮC CHẾ TÁC RIÊNG
 * ============================================================================
 */
function createArtifact3DModel(showcaseId) {
  const itemGroup = new THREE.Group();
  itemGroup.name = `Item3D_${showcaseId}`;
  itemGroup.userData.ignoreRaycaster = true;

  switch (showcaseId) {
    case 'showcase_but_long': {
      // 1. GÁC BÚT & BÚT LÔNG TRÚC VÀNG
      // Gác bút hình núi non tam sơn bằng đồng hun
      const restGeo = new THREE.ConeGeometry(0.08, 0.14, 5);
      const restMat = new THREE.MeshStandardMaterial({ color: 0x3b2f2f, roughness: 0.6, metalness: 0.5 });
      const r1 = new THREE.Mesh(restGeo, restMat);
      r1.position.set(-0.06, 0.07, 0);
      const r2 = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.18, 5), restMat);
      r2.position.set(0, 0.09, 0);
      const r3 = new THREE.Mesh(restGeo, restMat);
      r3.position.set(0.06, 0.07, 0);
      r1.userData.ignoreRaycaster = true;
      r2.userData.ignoreRaycaster = true;
      r3.userData.ignoreRaycaster = true;
      itemGroup.add(r1, r2, r3);

      // Thân bút lông trúc vàng óng
      const brushHandle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.015, 0.38, 8),
        new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.3 })
      );
      brushHandle.rotation.z = Math.PI / 4.2;
      brushHandle.position.set(0, 0.14, 0.04);
      brushHandle.userData.ignoreRaycaster = true;

      // Đai kim loại dát vàng
      const brushFerrule = new THREE.Mesh(
        new THREE.CylinderGeometry(0.017, 0.017, 0.04, 8),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.2 })
      );
      brushFerrule.rotation.z = Math.PI / 4.2;
      brushFerrule.position.set(-0.13, 0.01, 0.04);
      brushFerrule.userData.ignoreRaycaster = true;

      // Ngọn lông thỏ đen vuốt nhọn
      const brushTip = new THREE.Mesh(
        new THREE.ConeGeometry(0.017, 0.07, 8),
        new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.85 })
      );
      brushTip.rotation.z = -Math.PI / 1.35;
      brushTip.position.set(-0.17, -0.03, 0.04);
      brushTip.userData.ignoreRaycaster = true;

      itemGroup.add(brushHandle, brushFerrule, brushTip);
      break;
    }

    case 'showcase_nghien_muc': {
      // 2. NGHIÊN MỰC ĐÁ ĐEN CHẠM RỒNG & THỎI MỰC TÀU
      // Phiến đá tự nhiên viền chạm khắc
      const inkStone = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.26, 0.06, 12),
        new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.72, metalness: 0.2 })
      );
      inkStone.position.y = 0.03;
      inkStone.userData.ignoreRaycaster = true;

      // Lòng nghiên trũng chứa mực sánh bóng
      const inkPool = new THREE.Mesh(
        new THREE.CylinderGeometry(0.17, 0.17, 0.02, 16),
        new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.08, metalness: 0.85 })
      );
      inkPool.position.y = 0.055;
      inkPool.userData.ignoreRaycaster = true;

      // Thỏi mực tàu gác nghiêng mép nghiên
      const inkStick = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.14, 0.02),
        new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.4, metalness: 0.3 })
      );
      inkStick.position.set(0.16, 0.08, 0.06);
      inkStick.rotation.set(0.3, 0.4, -0.5);
      inkStick.userData.ignoreRaycaster = true;

      itemGroup.add(inkStone, inkPool, inkStick);
      break;
    }

    case 'showcase_ban_kieu_nom': {
      // 3. BẢN THẢO TRUYỆN KIỀU CHỮ NÔM MỘC BẢN
      // Giá đỡ sách bằng gỗ gụ
      const stand = new THREE.Mesh(
        new THREE.BoxGeometry(0.34, 0.08, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x27170e, roughness: 0.5 })
      );
      stand.position.y = 0.04;
      stand.userData.ignoreRaycaster = true;

      // Tập sách mộc bản mở rộng 2 trang
      const bookLeft = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.02, 0.24),
        new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.65 }) // Giấy dó vàng ngà
      );
      bookLeft.position.set(-0.085, 0.09, 0);
      bookLeft.rotation.z = 0.12;
      bookLeft.userData.ignoreRaycaster = true;

      const bookRight = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.02, 0.24),
        new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.65 })
      );
      bookRight.position.set(0.085, 0.09, 0);
      bookRight.rotation.z = -0.12;
      bookRight.userData.ignoreRaycaster = true;

      // Dấu triện đỏ son góc bản thảo
      const sealMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.035, 0.035),
        new THREE.MeshBasicMaterial({ color: 0xef4444 })
      );
      sealMesh.rotation.x = -Math.PI / 2;
      sealMesh.position.set(0.12, 0.105, 0.08);
      sealMesh.userData.ignoreRaycaster = true;

      itemGroup.add(stand, bookLeft, bookRight, sealMesh);
      break;
    }

    case 'showcase_non_quai_thao': {
      // 4. NÓN QUAI THAO LỤA TƠ TẰM QUAN HỌ
      // Vành nón ba tầm tròn rộng
      const hatBrim = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 0.02, 24),
        new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.72 }) // Nan tre lá cọ
      );
      hatBrim.position.y = 0.12;
      hatBrim.userData.ignoreRaycaster = true;

      // Đỉnh chóp nón
      const hatTop = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.16, 0.04, 20),
        new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.65 })
      );
      hatTop.position.y = 0.145;
      hatTop.userData.ignoreRaycaster = true;

      // Hai dải quai thao lụa điều đỏ buông rủ
      const ribbonMat = new THREE.MeshStandardMaterial({
        color: 0xb91c1c, // Lụa điều đỏ thắm
        roughness: 0.35,
        side: THREE.DoubleSide
      });
      const ribbonLeft = new THREE.Mesh(new THREE.PlaneGeometry(0.045, 0.26), ribbonMat);
      ribbonLeft.position.set(-0.14, 0.02, 0.08);
      ribbonLeft.rotation.set(0.4, 0.2, 0.2);
      ribbonLeft.userData.ignoreRaycaster = true;

      const ribbonRight = new THREE.Mesh(new THREE.PlaneGeometry(0.045, 0.26), ribbonMat);
      ribbonRight.position.set(0.14, 0.02, 0.08);
      ribbonRight.rotation.set(0.4, -0.2, -0.2);
      ribbonRight.userData.ignoreRaycaster = true;

      itemGroup.add(hatBrim, hatTop, ribbonLeft, ribbonRight);
      break;
    }

    case 'showcase_den_dau_co':
    default: {
      // 5. ĐÈN DẦU GỐM HOA LAM BÁT TRÀNG THẾ KỶ XVI
      // Chân đế gốm loe
      const baseMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.16, 0.08, 14),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35, metalness: 0.15 })
      );
      baseMesh.position.y = 0.04;
      baseMesh.userData.ignoreRaycaster = true;

      // Thân đèn gốm men lam
      const bodyMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.06, 0.14, 12),
        new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.3, metalness: 0.2 })
      );
      bodyMesh.position.y = 0.15;
      bodyMesh.userData.ignoreRaycaster = true;

      // Bầu đĩa dầu viền đồng
      const dishMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.08, 0.06, 14),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 })
      );
      dishMesh.position.y = 0.25;
      dishMesh.userData.ignoreRaycaster = true;

      // Ngọn lửa đèn dầu lung linh
      const flameMesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.025, 0.07, 6),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
      );
      flameMesh.position.y = 0.31;
      flameMesh.userData.ignoreRaycaster = true;

      const flameLight = new THREE.PointLight(0xfef08a, 0.65, 1.8, 2);
      flameLight.position.set(0, 0.32, 0);
      flameLight.userData.ignoreRaycaster = true;

      itemGroup.add(baseMesh, bodyMesh, dishMesh, flameMesh, flameLight);
      break;
    }
  }

  return itemGroup;
}

/**
 * ============================================================================
 * 5. HÀNH LANG "DÒNG CHẢY VĂN HỌC": CỘT GỖ LIM, VỆT NẮNG CỬA VÒM, TRANH SƠN MÀI,
 *    5 TỦ KÍNH BẢO VẬT & VFX "DÒNG SÔNG CHỮ" TRÊN TRẦN
 * ============================================================================
 */
export function createCorridorLiteraryStream({ hitboxManager = null, loreGuide = null } = {}) {
  const corridorGroup = new THREE.Group();
  corridorGroup.name = 'Corridor_Literary_Stream_Group';

  // ĐÃ VÔ HIỆU HÓA HÀNG CỘT LẠC TRÔI NGOÀI TRỜI (Z = 28..52m), VỆT NẮNG & DẢI HẠT RỐI MẮT:
  // Trả lại không gian cho Cầu Đá Cẩm Thạch 6.0m và Hồ Sen Tràng An của vietnamesePalaceArchitecture.js.
  corridorGroup.userData.registerHitboxes = () => {};
  corridorGroup.userData.update = () => {};

  const teleportSpots = [
    { x: 0, y: 0.45, z: 32.0, name: 'StoneBridge' },
    { x: 0, y: 0.62, z: 18.0, name: 'LobbyArrival' },
    { x: -8.5, y: 0.62, z: 0, name: 'WestWingLobby' },
    { x: 8.5, y: 0.62, z: 0, name: 'EastWingLobby' },
    { x: 0, y: 0.62, z: -10.5, name: 'NorthGrandAtrium' }
  ];

  const markerGeo = new THREE.RingGeometry(0.85, 1.15, 24);
  const markerMat = new THREE.MeshBasicMaterial({
    color: 0x34d399,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.65,
    depthWrite: false
  });

  teleportSpots.forEach((tp) => {
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.name = `TeleportMarker_${tp.name}`;
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(tp.x, tp.y, tp.z);
    marker.userData.isTeleportFloor = true;
    marker.userData.isTeleportHotspot = true;
    marker.userData.ignoreRaycaster = false;
    corridorGroup.add(marker);
  });

  return corridorGroup;
}