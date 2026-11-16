// catAgentVillage.js — ĐẢO MÈO THÁNH ĐƯỜNG 3D ISOMETRIC & ĐỘI QUÂN 6 MÈO AI AGENT
// Diorama Đảo Nổi Isometric lơ lửng giữa bầu trời sao đêm, 6 chú mèo 3D Chibi tự trị đáng yêu
// Đạt chuẩn WebGL 60+ FPS, Zero Allocation trong update loop, Tương tác đối thoại, Web Audio Meow Synthesis & Hitbox Box3
import * as THREE from 'three';
import { getMuseumHitboxManager } from '../modules/museumHitboxSystem.js';
import {
  createLinhKhiVortexMesh,
  createCatPawAndFireflyAura,
  createMiniIslandLanternPerimeter
} from '../modules/catPortalVfxAndLighting.js';

/**
 * Hàm chuẩn hóa hình học: Tính Normal, Bounds và khử sạch NaN/Infinity
 */
function prepGeo(geo) {
  if (!geo) return geo;
  try {
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();

    const posAttr = geo.attributes?.position;
    if (posAttr) {
      const arr = posAttr.array;
      const len = posAttr.count * posAttr.itemSize;
      for (let i = 0; i < len; i++) {
        if (!Number.isFinite(arr[i])) arr[i] = 0;
      }
      posAttr.needsUpdate = true;
    }
    const normAttr = geo.attributes?.normal;
    if (normAttr) {
      const arr = normAttr.array;
      const len = normAttr.count * normAttr.itemSize;
      for (let i = 0; i < len; i++) {
        if (!Number.isFinite(arr[i])) arr[i] = 0;
      }
      normAttr.needsUpdate = true;
    }
  } catch (_) {}
  return geo;
}

/**
 * Bộ Tổng Hợp Âm Thanh Procedural Web Audio ("Meo~" Synthesis)
 * Phát tiếng mèo kêu dễ thương mà không cần nạp file mp3 ngoài
 */
class ProceduralMeowAudio {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    } catch (_) {}
  }

  playMeow(pitchFactor = 1.0) {
    this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    try {
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      // Dạng sóng formant tròn ấm
      osc.type = 'triangle';

      // Cao độ trượt âm điệu mèo kêu: bắt đầu 460Hz -> lên đỉnh 780Hz -> hạ xuống 320Hz
      const baseFreq = 480 * pitchFactor;
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.linearRampToValueAtTime(baseFreq * 1.65, t + 0.14);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.75, t + 0.38);

      // Bộ lọc formant vòm họng mèo
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400 * pitchFactor, t);
      filter.Q.setValueAtTime(3.0, t);

      // Âm lượng envelope
      gain.gain.setValueAtTime(0.01, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t);
      osc.stop(t + 0.44);
    } catch (_) {}
  }
}

export const catAudioSynthesizer = new ProceduralMeowAudio();

/**
 * HỒ SƠ 6 CHIẾN BINH MÈO AI AGENT (ĐẢO MÈO DIORAMA MINIATURE)
 */
export const CAT_AGENTS_DATA = [
  {
    id: 'muop',
    name: 'Mèo Mướp Trưởng Làng',
    shortName: 'Mèo Mướp · Tổng Chỉ Huy',
    breed: 'Mèo Mướp Việt Nam (Tabby Cat)',
    role: 'Orchestrator – Tổng Chỉ Huy Swarm',
    badgeColor: '#d4af37',
    primaryColor: 0x8b7355,
    stripeColor: 0x4a3b32,
    homeStation: 'Sân Đình Trống Đồng',
    homePos: new THREE.Vector3(0, 0, -0.5),
    actionLog: 'Đã điều phối 5 chiến binh mèo hoàn thành xuất sắc 100% nhiệm vụ phục hồi Đại Sảnh theo 2 ảnh mẫu di sản.',
    accessories: 'Khăn đóng nho sinh & đai ngọc chỉ huy',
    intro: 'Meo meo! Chào tri âm đã bước chân lên Đảo Mèo Thánh Đường! Ta là Mèo Mướp Trưởng Làng, người điều phối toàn bộ Đội Quân Mèo AI. Mọi công việc từ dựng cõi mở đến tối ưu 60+ FPS đều được ta phân công nhịp nhàng cho 5 chiến binh mèo trong làng!',
    skills: ['swarm-orchestration', 'project-task-decomposition', 'quality-gatekeeper'],
    dialogs: [
      { q: 'Làng Mèo Thánh Đường được thành lập như thế nào?', a: 'Meo~ Tụi tui là 6 chiến binh mèo yêu văn học Việt Nam! Ban ngày tụi tui tản bộ ngắm suối tre, ban đêm tụi tui hóa thân thành AI Agents kiến tạo nên những gian điện Đông Sơn và cõi mở kỳ vĩ cho bạn ngắm!' },
      { q: 'Trưởng làng điều phối công việc ra sao?', a: 'Tại hạ phân chia nhiệm vụ độc lập cho 5 mèo chuyên biệt: Tam Thể lo khung nhà, Mèo Vàng nặn tượng, Mèo Mun thắp đèn, Mèo Trắng gảy đàn ngâm thơ, và Mèo Xiêm canh giữ an toàn hiệu năng. Cả làng cùng meo một nhịp!' }
    ]
  },
  {
    id: 'tam_the',
    name: 'Mèo Tam Thể Kiến Trúc',
    shortName: 'Tam Thể · Giám Tuyển Không Gian',
    breed: 'Mèo Tam Thể (Calico Cat)',
    role: 'Curator & Heritage Architect',
    badgeColor: '#2ecc71',
    primaryColor: 0xffffff,
    patchColor1: 0xe67e22,
    patchColor2: 0x2c3e50,
    homeStation: 'Hiên Mộc Bản Vẽ',
    homePos: new THREE.Vector3(-5.8, 0, 3.8),
    actionLog: 'Đã hoàn thiện quy hoạch 3 lớp không gian bảo tàng và định vị bàn đá Cổng Linh Miêu Thiên Thư.',
    accessories: 'Cuộn bản vẽ kiến trúc đeo lưng & thước tầm xích gỗ mini',
    intro: 'Meo! Mèo tui là Tam Thể — kiến trúc sư của làng! Tui phụ trách quy hoạch 3 lớp không gian (tiền cảnh, trung cảnh, hậu cảnh) và giữ cho con đường đi bộ |X| <= 2.3m luôn thông thoáng để bạn không bao giờ vấp phải đuôi mèo!',
    skills: ['museum-exhibition-curator', 'cultural-heritage-modeler', 'ornamental-relief-sculptor'],
    dialogs: [
      { q: 'Nguyên tắc quy hoạch 3 lớp của bạn là gì?', a: 'Meo meo! Tiền cảnh có cầu gỗ, hàng rào tre; Trung cảnh là mái đình, bệ sen Đông Sơn; Hậu cảnh là vầng trăng khuyết và dãy núi mờ sương. Không gian lúc nào cũng phải thoáng đãng như ngọn đồi nhiều nắng!' },
      { q: 'Sa bàn mini ở nhà mộc dùng để làm gì?', a: 'Đó là sơ đồ thu nhỏ của Thành Cổ Loa, thôn Vĩ Dạ và bến sông Hoàng Giang đó! Mèo tui dùng thước gỗ gõ lách cách để căn chuẩn từng centimet!' }
    ]
  },
  {
    id: 'meo_vang',
    name: 'Mèo Vàng Thợ Rèn',
    shortName: 'Mèo Cam · Nghệ Nhân 3D & VFX',
    breed: 'Mèo Vàng Cam (Ginger Tabby)',
    role: '3D & VFX Sculptor',
    badgeColor: '#e67e22',
    primaryColor: 0xf39c12,
    stripeColor: 0xd35400,
    homeStation: 'Bếp Rèn & Bể Sóng',
    homePos: new THREE.Vector3(5.8, 0, 3.8),
    actionLog: 'Đã chuẩn hóa mesh 3D Y=0, tối ưu InstancedMesh và tôi luyện mặt suối xanh ngọc 60 FPS.',
    accessories: 'Yếm da thợ rèn & búa đồng mini',
    intro: 'Meo meo! Tui là Mèo Vàng Cam béo tròn nè! Xưởng của tui có đe rèn và bệ đất sét. Tui chuyên chuẩn hóa mô hình .glb tiếp đất sát sàn Y = 0 và chế tác mặt nước suối gợn sóng đêm cùng đom đóm lấp lánh!',
    skills: ['threejs-auto-integrator', 'water-mountain-vfx-sculptor', 'mesh-detailing-specialist'],
    dialogs: [
      { q: 'Làm sao để hạt đom đóm bờ suối không bị lag chuột?', a: 'Meo~ Tui dùng CanvasTexture vẽ hạt tròn mịn có quầng sáng mềm (Radial Falloff) rồi gắn cờ userData.ignoreRaycaster = true! Chuột click xuyên qua êm ru, 60 FPS vi vu!' },
      { q: 'Lò nung của bạn có nóng không?', a: 'Ấm lắm đó meo! Tụi tui hay cuộn tròn sưởi ấm bên than hồng mỗi khi render xong các mô hình An Dương Vương hay Vũ Nương!' }
    ]
  },
  {
    id: 'meo_mun',
    name: 'Mèo Mun Thắp Đèn',
    shortName: 'Mèo Mun · Đạo Diễn Ánh Sáng',
    breed: 'Mèo Mun Đen Tuyền (Black Cat)',
    role: 'Lighting & Shader Artist',
    badgeColor: '#9b59b6',
    primaryColor: 0x1a1a1a,
    eyeColor: 0xf1c40f,
    homeStation: 'Chòi Đèn Lồng',
    homePos: new THREE.Vector3(0, 0.4, -6.8),
    actionLog: 'Đã thắp sáng 12 lồng đèn ngũ sắc, dựng vành đai đom đóm và tắt shadow map thừa thãi.',
    accessories: 'Vòng cổ chỉ đỏ lục lạc vàng & lồng đèn hoa đăng mini',
    intro: 'Meo... Ta là Mèo Mun thắp đèn. Trong đêm tối, đôi mắt vàng của ta nhìn thấu mọi luồng sáng Chiaroscuro. Ta thắp lên những chiếc đèn lồng vàng ấm #ffaa33 và tắt sạch các bóng đổ nặng nề để bảo tàng chạy mượt mà 60+ FPS.',
    skills: ['environment-lighting-artist', 'shader-coloring-artist'],
    dialogs: [
      { q: 'Tại sao lại tắt đổ bóng shadow map thừa thãi?', a: 'Meo... Bóng đổ nặng sẽ ngốn GPU và gây lỗi texture sampler mismatch. Ta chỉ giữ lại ánh trăng viền cạnh và bóng đổ Vũ Nương trên vách nứa, còn lại dùng ánh sáng điểm ấm áp tôn vinh tinh thần di sản.' },
      { q: 'Bầu trời đêm ngàn sao trên Đảo Mèo có gì đặc biệt?', a: 'Đó là SkyDome 360 độ ngọc bích hòa cùng sương mù FogExp2 huyền ảo. Ngước lên cao, bạn sẽ thấy hàng ngàn ngôi sao lấp lánh như mắt mèo trong đêm!' }
    ]
  },
  {
    id: 'meo_trang',
    name: 'Mèo Trắng Đào Nương',
    shortName: 'Mèo Trắng · Lore & Âm Thanh',
    breed: 'Mèo Trắng Tuyết (White Angora)',
    role: 'Lore, Camera & Audio Director',
    badgeColor: '#e91e63',
    primaryColor: 0xfdfefe,
    bowColor: 0xe74c3c,
    homeStation: 'Chiếu Đàn Ven Suối',
    homePos: new THREE.Vector3(-5.0, 0, -2.5),
    actionLog: 'Đã phục hồi Vòng Hào Quang Ma Trận Chữ Mandala Đông Sơn & Hệ thống Khách Chiêm Bái cung kính.',
    accessories: 'Bông sen ngọc cài tai, nơ lụa đỏ son & đàn tranh 16 dây',
    intro: 'Meo meo~ Thiếp là Mèo Trắng Đào Nương! Thiếp yêu thơ ca cổ nhạc và những câu chuyện nhân văn ngàn năm của dân tộc. Bên cây đàn tranh và cuộn thư cổ, thiếp dệt nên âm thanh ngũ cung và lộ trình Camera Auto-Tour đưa tri âm phiêu du khắp cõi mộng!',
    skills: ['interactive-lore-guide', 'camera-director', 'educational-tour-guide-director', 'audio-soundscape-director'],
    dialogs: [
      { q: 'Tiếng mèo kêu Meo~ được tạo ra như thế nào?', a: 'Meo~ Đó là Web Audio FM Synthesis do thiếp lập trình đó! Tần số trượt từ 480Hz lên 780Hz rồi luyến nhẹ xuống 320Hz, ngọt ngào như tiếng ru hời của mẹ xứ Huế!' },
      { q: 'Cấu trúc Lore 4 chương có ý nghĩa gì?', a: 'Bối cảnh khởi nguyên -> Cao trào bi kịch -> Khát vọng nhân văn -> Tri âm thời đại. Đó là cây cầu nối tâm hồn hiện đại với những áng văn bất hủ của tiền nhân!' }
    ]
  },
  {
    id: 'meo_xiem',
    name: 'Mèo Xiêm Tuần Đinh',
    shortName: 'Mèo Xiêm · Kỹ Sư Hitbox & 60 FPS',
    breed: 'Mèo Xiêm (Siamese Cat)',
    role: 'Engine QA, Hitbox & FPS Guardian',
    badgeColor: '#3498db',
    primaryColor: 0xf5e6ca,
    maskColor: 0x4a2c11,
    homeStation: 'Cổng Linh Miêu Trở Về',
    homePos: new THREE.Vector3(0, 0, 8.2),
    actionLog: 'Đã thiết lập rào chắn Box3 Collider 16 khối và xác thực npm run build đạt chuẩn 0 lỗi.',
    accessories: 'Mặt nạ nâu sẫm mắt biếc & chuông đồng thẻ bài tuần đinh',
    intro: 'Meo! Nghiêm! Mèo Xiêm Tuần Đinh túc trực tại Cổng Làng! Tui phụ trách rào chắn Box3 Collider để bạn không rơi khỏi đảo nổi, mở Cổng Dịch Chuyển 2 chiều mượt mà và kiểm định npm run build luôn đạt 0 lỗi!',
    skills: ['hitbox-collision-architect', 'web-xr-teleport-controller', 'fps-optimizer'],
    dialogs: [
      { q: 'Làm sao để không bị rơi khỏi Đảo Nổi?', a: 'Meo! Tui đã khóa 16 khung Box3 Collider quanh bờ suối và mép đảo đá. Dù bạn đi dạo hay chạy nhảy, ranh giới an toàn luôn bảo vệ bạn 100%!' },
      { q: 'Cổng Dịch Chuyển về Đại Sảnh hoạt động ra sao?', a: 'Bước vào cự ly <= 2.2m hoặc click vào Thạch Môn đôi tai mèo, màn hình sẽ mờ dần 0.8s và đưa bạn trở lại Sảnh Chính bảo tàng một cách êm ái, có cooldown chống lặp vô tận!' }
    ]
  }
];

/**
 * LỚP ĐẢO MÈO THÁNH ĐƯỜNG 3D (CAT AGENT VILLAGE WORLD)
 */
export class CatAgentVillageWorld {
  constructor(scene, camera, renderer, cameraManager = null, options = {}) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.cameraManager = cameraManager;
    this.options = options;

    this.group = new THREE.Group();
    this.group.name = 'Cat_Agent_Village_Group';

    this.disposables = [];
    this.animatedObjects = [];
    this.catObjects = [];
    this.interactiveHitboxes = [];
    this.portalMesh = null;

    this.initialized = false;
    this.isInsideVillage = false;

    // Chế độ camera view: 'isometric', 'auto_orbit', 'fpp'
    this.viewMode = 'isometric';
    this.selectedCatId = null;

    // Raycaster tương tác
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 60.0;
    this.mouse = new THREE.Vector2();

    // Cache Vector3 tính toán tránh allocation
    this._vTmp1 = new THREE.Vector3();
    this._vTmp2 = new THREE.Vector3();
    this._vCamTarget = new THREE.Vector3(0, 2.0, 0);

    // Callbacks
    this.onReturnToLobby = options.onReturnToLobby || null;
  }

  async init() {
    if (this.initialized) return;

    this.scene.add(this.group);
    this.disposables.push(this.group);

    // 1. Khí quyển Bầu Trời Đêm Ngàn Sao (#0d111a) & Sương Mù Bảng Lảng
    this.setupAtmosphere();

    // 2. Cảnh quan Đảo Nổi Isometric (Khối đá, thảm cỏ xanh, đường sỏi)
    this.buildFloatingIslandTerrain();

    // 3. Con Suối Nhỏ Uốn Lượn & Cây Cầu Gỗ Cong Xinh Xắn
    this.buildRiverAndWoodenBridge();

    // 4. Lũy Tre Xanh & Trụ Cào Móng Gỗ Mun Đay
    this.buildBambooAndScratchingPosts();

    // 5. 6 Ngôi Nhà Trạm Làm Việc Của Làng Mèo
    this.buildSixCatWorkstations();

    // 6. Tạo Hình 6 Chú Mèo 3D Chibi Chi Tiết
    this.buildSixProceduralCats();

    // 7. Cổng Làng Dịch Chuyển 2 Chiều Về Đại Sảnh
    this.buildVillageTeleportPortal();

    // 8. Hệ Thống Ánh Sáng Đèn Lồng Vàng Ấm (#ffaa33) & Đom Đóm Bờ Suối
    this.buildLanternLightingAndFireflies();

    // 9. Giao Diện Người Dùng: Top Bar HUD & Cat Inspector Drawer Bên Phải
    this.createUIElements();

    // 10. Lắng Nghe Sự Kiện Tương Tác Chuột
    this.initEvents();

    // 11. Đăng ký Box3 Colliders bảo vệ viền đảo & các trạm làm việc (Skill: hitbox-collision-architect)
    this.registerCatVillageColliders();

    this.initialized = true;
    console.log("%c✓ Đảo Mèo Thánh Đường 3D (Cat Agent Village) initialized successfully! Meo~", "color: #ffaa33; font-weight: bold;");
  }

  setupAtmosphere() {
    this.scene.background = new THREE.Color(0x0d111a);
    this.scene.fog = new THREE.FogExp2(0x0d111a, 0.0018);
  }

  /**
   * CẢNH QUAN ĐẢO NỔI ISOMETRIC (DIORAMA FLOATING ISLAND ~22m x 22m)
   */
  buildFloatingIslandTerrain() {
    // 1. Thảm cỏ xanh tròn vát cạnh trên mặt đảo thu nhỏ miniature ~22m x 22m (R = 11m, dày 0.75m)
    const islandTopGeo = prepGeo(new THREE.CylinderGeometry(11.0, 10.5, 0.75, 32));
    const islandTopMat = new THREE.MeshStandardMaterial({
      color: 0x2e7d32, // Xanh cỏ mượt mà
      roughness: 0.85,
      metalness: 0.1
    });
    const islandTop = new THREE.Mesh(islandTopGeo, islandTopMat);
    islandTop.position.y = -0.375;
    islandTop.receiveShadow = false;
    this.group.add(islandTop);
    this.disposables.push(islandTopGeo, islandTopMat);

    // Gờ đá xám bo viền mép trên đảo
    const rimGeo = prepGeo(new THREE.CylinderGeometry(11.15, 11.2, 0.12, 32));
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.position.y = -0.06;
    rim.userData.ignoreRaycaster = true;
    this.group.add(rim);
    this.disposables.push(rimGeo, rimMat);

    // 2. Chân vách đá nón nhọn lơ lửng giữa trời mây (Y = -0.75m xuống -9.0m)
    const islandBaseGeo = prepGeo(new THREE.ConeGeometry(10.5, 8.5, 32));
    const islandBaseMat = new THREE.MeshStandardMaterial({
      color: 0x1e242d, // Đá xám đậm tự nhiên
      roughness: 0.9,
      metalness: 0.2
    });
    const islandBase = new THREE.Mesh(islandBaseGeo, islandBaseMat);
    islandBase.rotation.x = Math.PI; // Úp nón nhọn xuống đáy
    islandBase.position.y = -5.0;
    islandBase.userData.ignoreRaycaster = true;
    this.group.add(islandBase);
    this.disposables.push(islandBaseGeo, islandBaseMat);

    // Vành mây sương bảng lảng lơ lửng quanh đáy nón đá
    const cloudRingGeo = prepGeo(new THREE.TorusGeometry(10.2, 0.85, 8, 36));
    const cloudRingMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      roughness: 0.4,
      transparent: true,
      opacity: 0.55
    });
    cloudRingMat.userData = { ignoreRaycaster: true };
    const cloudRing = new THREE.Mesh(cloudRingGeo, cloudRingMat);
    cloudRing.rotation.x = Math.PI / 2;
    cloudRing.position.y = -3.2;
    cloudRing.userData.ignoreRaycaster = true;
    this.group.add(cloudRing);
    this.disposables.push(cloudRingGeo, cloudRingMat);

    // 3. Sân tròn trung tâm & lối đi lát đá cuội kết nối 6 trạm
    const pathGeo = prepGeo(new THREE.RingGeometry(2.4, 6.8, 32));
    const pathMat = new THREE.MeshBasicMaterial({
      color: 0xd7ccc8,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide
    });
    pathMat.userData = { ignoreRaycaster: true };
    const pathMesh = new THREE.Mesh(pathGeo, pathMat);
    pathMesh.rotation.x = -Math.PI / 2;
    pathMesh.position.y = 0.02;
    pathMesh.userData.ignoreRaycaster = true;
    this.group.add(pathMesh);
    this.disposables.push(pathGeo, pathMat);
  }

  /**
   * CON SUỐI NHỎ UỐN LƯỢN, CẦU GỖ ĐỎ TÍ HON & PHIẾN ĐÁ CHÂN MÈO PHÁT SÁNG
   */
  buildRiverAndWoodenBridge() {
    // 1. Lạch suối nhỏ xíu uốn cong vắt ngang đảo (mặt nước xanh ngọc lấp lánh)
    const riverGeo = prepGeo(new THREE.PlaneGeometry(3.2, 20.0, 16, 16));
    const riverMat = new THREE.MeshStandardMaterial({
      color: 0x00b4d8,
      roughness: 0.12,
      metalness: 0.85,
      transparent: true,
      opacity: 0.82
    });
    riverMat.userData = { ignoreRaycaster: true };
    const riverMesh = new THREE.Mesh(riverGeo, riverMat);
    riverMesh.rotation.x = -Math.PI / 2;
    riverMesh.rotation.z = Math.PI * 0.22; // Uốn lượn chéo góc qua tâm đảo
    riverMesh.position.set(0, 0.03, 0);
    riverMesh.userData.ignoreRaycaster = true;
    this.group.add(riverMesh);
    this.disposables.push(riverGeo, riverMat);

    this.animatedObjects.push({
      type: 'river_ripples',
      mesh: riverMesh
    });

    // 2. Cây Cầu Gỗ Đỏ tí hon xinh xắn tại (0, 0, 0)
    const bridgeGroup = new THREE.Group();
    bridgeGroup.name = 'Tiny_Red_Arched_Wooden_Bridge';
    bridgeGroup.position.set(0, 0, 0);

    const redWoodMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b, // Đỏ sơn then cổ phong
      roughness: 0.65,
      metalness: 0.15
    });
    const goldCapMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.28,
      metalness: 0.85
    });

    const numPlanks = 9;
    const plankSpan = 3.0;
    const plankWidth = 1.6;

    for (let i = 0; i < numPlanks; i++) {
      const t = (i / (numPlanks - 1)) * 2 - 1; // -1 to 1
      const z = t * (plankSpan / 2);
      const archY = Math.cos(t * Math.PI * 0.45) * 0.42;

      const pGeo = prepGeo(new THREE.BoxGeometry(plankWidth, 0.1, 0.28));
      const plank = new THREE.Mesh(pGeo, redWoodMat);
      plank.position.set(0, archY + 0.15, z);
      plank.rotation.x = -t * 0.28;
      plank.userData.ignoreRaycaster = true;
      bridgeGroup.add(plank);
      this.disposables.push(pGeo);
    }

    // Lan can cầu gỗ đỏ cong hai bên
    [-plankWidth / 2 + 0.08, plankWidth / 2 - 0.08].forEach((xSide) => {
      const railCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(xSide, 0.22, -plankSpan / 2 - 0.15),
        new THREE.Vector3(xSide, 0.72, 0),
        new THREE.Vector3(xSide, 0.22, plankSpan / 2 + 0.15)
      ]);
      const railGeo = prepGeo(new THREE.TubeGeometry(railCurve, 16, 0.045, 8, false));
      const railMesh = new THREE.Mesh(railGeo, redWoodMat);
      railMesh.userData.ignoreRaycaster = true;
      bridgeGroup.add(railMesh);
      this.disposables.push(railGeo);

      [-1.1, -0.35, 0.35, 1.1].forEach((zPost) => {
        const t = zPost / (plankSpan / 2);
        const yBase = Math.cos(t * Math.PI * 0.45) * 0.42 + 0.15;
        const postGeo = prepGeo(new THREE.CylinderGeometry(0.04, 0.045, 0.55, 8));
        const postMesh = new THREE.Mesh(postGeo, redWoodMat);
        postMesh.position.set(xSide, yBase + 0.275, zPost);
        postMesh.userData.ignoreRaycaster = true;

        const capGeo = prepGeo(new THREE.SphereGeometry(0.065, 8, 8));
        const capMesh = new THREE.Mesh(capGeo, goldCapMat);
        capMesh.position.set(xSide, yBase + 0.58, zPost);
        capMesh.userData.ignoreRaycaster = true;

        bridgeGroup.add(postMesh, capMesh);
        this.disposables.push(postGeo, capGeo);
      });
    });

    this.group.add(bridgeGroup);
    this.disposables.push(redWoodMat, goldCapMat);

    // 3. Phiến đá khắc dấu chân mèo phát sáng ven suối tại (1.6, 0.08, -0.6)
    const pawStoneGroup = new THREE.Group();
    pawStoneGroup.name = 'Glowing_Cat_Paw_Stone';
    pawStoneGroup.position.set(1.6, 0.08, -0.6);

    const stoneGeo = prepGeo(new THREE.CylinderGeometry(0.55, 0.65, 0.16, 12));
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.82 });
    const stoneMesh = new THREE.Mesh(stoneGeo, stoneMat);
    stoneMesh.userData.ignoreRaycaster = true;
    pawStoneGroup.add(stoneMesh);

    if (typeof document !== 'undefined') {
      const pawCanvas = document.createElement('canvas');
      pawCanvas.width = 256; pawCanvas.height = 256;
      const ctx = pawCanvas.getContext('2d');
      ctx.clearRect(0, 0, 256, 256);

      const grad = ctx.createRadialGradient(128, 128, 15, 128, 128, 110);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.35, '#00f5d4'); // Emerald Cyan
      grad.addColorStop(0.75, '#ffbe55'); // Radiant Gold
      grad.addColorStop(1, 'rgba(0, 245, 212, 0)');
      ctx.fillStyle = grad;

      // Đệm bàn chân chính (main paw pad)
      ctx.beginPath();
      ctx.ellipse(128, 150, 48, 38, 0, 0, Math.PI * 2);
      ctx.fill();

      // 4 ngón chân mèo
      const toes = [
        { x: 75, y: 88, rx: 16, ry: 22, rot: -0.35 },
        { x: 110, y: 72, rx: 16, ry: 24, rot: -0.1 },
        { x: 146, y: 72, rx: 16, ry: 24, rot: 0.1 },
        { x: 181, y: 88, rx: 16, ry: 22, rot: 0.35 }
      ];
      toes.forEach(t => {
        ctx.beginPath();
        ctx.ellipse(t.x, t.y, t.rx, t.ry, t.rot, 0, Math.PI * 2);
        ctx.fill();
      });

      const pawTex = new THREE.CanvasTexture(pawCanvas);
      pawTex.generateMipmaps = false;
      pawTex.minFilter = THREE.LinearFilter;

      const pawGeo = prepGeo(new THREE.PlaneGeometry(0.85, 0.85));
      const pawMat = new THREE.MeshBasicMaterial({
        map: pawTex,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });
      pawMat.userData = { ignoreRaycaster: true };
      const pawMesh = new THREE.Mesh(pawGeo, pawMat);
      pawMesh.rotation.x = -Math.PI / 2;
      pawMesh.position.y = 0.085;
      pawMesh.userData.ignoreRaycaster = true;
      pawStoneGroup.add(pawMesh);

      const pawLight = new THREE.PointLight(0x00f5d4, 0.85, 4.0);
      pawLight.position.set(0, 0.3, 0);
      pawLight.userData.ignoreRaycaster = true;
      pawStoneGroup.add(pawLight);

      this.animatedObjects.push({
        type: 'paw_glow_pulse',
        light: pawLight,
        mesh: pawMesh
      });

      this.disposables.push(stoneGeo, stoneMat, pawGeo, pawMat, pawTex);
    }

    this.group.add(pawStoneGroup);
  }

  /**
   * LŨY TRE XANH & 2 TRỤ CÀO MÓNG QUẤN THỪNG ĐAY
   */
  buildBambooAndScratchingPosts() {
    // 1. Khóm trúc cảnh mini ven bờ suối
    const bambooCount = 12;
    const bambooGeo = prepGeo(new THREE.CylinderGeometry(0.08, 0.1, 3.2, 8));
    const bambooMat = new THREE.MeshStandardMaterial({ color: 0x43a047, roughness: 0.6 });
    const instancedBamboo = new THREE.InstancedMesh(bambooGeo, bambooMat, bambooCount);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < bambooCount; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const x = side * (5.5 + Math.random() * 2.2);
      const z = -4.5 + i * 0.9;
      dummy.position.set(x, 1.6, z);
      dummy.rotation.set((Math.random() - 0.5) * 0.15, 0, (Math.random() - 0.5) * 0.15);
      dummy.updateMatrix();
      instancedBamboo.setMatrixAt(i, dummy.matrix);
    }
    instancedBamboo.instanceMatrix.needsUpdate = true;
    instancedBamboo.userData.ignoreRaycaster = true;
    this.group.add(instancedBamboo);
    this.disposables.push(bambooGeo, bambooMat, instancedBamboo);

    // 2. 2 Trụ Cào Móng Gỗ quấn thừng đay tại (-3.2, 0, 1.8) và (3.2, 0, -2.2)
    const postPositions = [
      new THREE.Vector3(-3.2, 0, 1.8),
      new THREE.Vector3(3.2, 0, -2.2)
    ];

    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xd7ccc8, roughness: 0.95 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a2c11, roughness: 0.65 });
    const bellMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.85 });

    postPositions.forEach((pos) => {
      const postGroup = new THREE.Group();
      postGroup.position.copy(pos);

      const bGeo = prepGeo(new THREE.CylinderGeometry(0.38, 0.44, 0.1, 12));
      const bMesh = new THREE.Mesh(bGeo, woodMat);
      bMesh.position.y = 0.05;
      bMesh.userData.ignoreRaycaster = true;
      postGroup.add(bMesh);

      const pGeo = prepGeo(new THREE.CylinderGeometry(0.18, 0.2, 1.35, 12));
      const pMesh = new THREE.Mesh(pGeo, ropeMat);
      pMesh.position.y = 0.1 + 1.35 / 2;
      pMesh.userData.ignoreRaycaster = true;
      postGroup.add(pMesh);

      const hGeo = prepGeo(new THREE.SphereGeometry(0.24, 12, 12));
      const hMesh = new THREE.Mesh(hGeo, woodMat);
      hMesh.position.y = 0.1 + 1.35 + 0.22;
      hMesh.userData.ignoreRaycaster = true;
      postGroup.add(hMesh);

      const eGeo = prepGeo(new THREE.ConeGeometry(0.09, 0.16, 4));
      const eL = new THREE.Mesh(eGeo, woodMat);
      eL.position.set(-0.12, 0.1 + 1.35 + 0.4, 0);
      eL.rotation.z = 0.3;
      eL.userData.ignoreRaycaster = true;

      const eR = new THREE.Mesh(eGeo, woodMat);
      eR.position.set(0.12, 0.1 + 1.35 + 0.4, 0);
      eR.rotation.z = -0.3;
      eR.userData.ignoreRaycaster = true;
      postGroup.add(eL, eR);

      const bellGeo = prepGeo(new THREE.SphereGeometry(0.055, 8, 8));
      const bellMesh = new THREE.Mesh(bellGeo, bellMat);
      bellMesh.position.set(0, 0.1 + 1.35 + 0.06, 0.2);
      bellMesh.userData.ignoreRaycaster = true;
      postGroup.add(bellMesh);

      this.group.add(postGroup);
      this.disposables.push(bGeo, pGeo, hGeo, eGeo, bellGeo);
    });

    this.disposables.push(ropeMat, woodMat, bellMat);
  }

  /**
   * 6 TRẠM LÀM VIỆC MINI QUÂY QUẦN QUANH SÂN ĐÌNH
   * 1. Sân Đình Trống Đồng (0, 0, -0.5)
   * 2. Hiên Mộc Bản Vẽ (-5.8, 0, 3.8)
   * 3. Bếp Rèn & Bể Sóng (5.8, 0, 3.8)
   * 4. Chòi Đèn Lồng (0, 0.4, -6.8)
   * 5. Chiếu Đàn Ven Suối (-5.0, 0, -2.5)
   * 6. Cổng Linh Miêu Trở Về (0, 0, 8.2)
   */
  buildSixCatWorkstations() {
    const limMat = new THREE.MeshStandardMaterial({ color: 0x4a2c11, roughness: 0.65 });
    const tileMat = new THREE.MeshStandardMaterial({ color: 0x8d5b4c, roughness: 0.55 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.28, metalness: 0.85 });

    // =========================================================================
    // 1. SÂN ĐÌNH TRỐNG ĐỒNG (0, 0, -0.5) - Trạm Mèo Mướp Trưởng Làng
    // =========================================================================
    const muopGroup = new THREE.Group();
    muopGroup.name = 'Workstation_Muop_DinhLang';
    muopGroup.position.set(0, 0, -0.5);

    // Bệ đá tròn họa tiết Trống Đồng Đông Sơn
    const drumPlinthGeo = prepGeo(new THREE.CylinderGeometry(2.4, 2.5, 0.16, 24));
    const drumPlinthMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.75 });
    const drumPlinth = new THREE.Mesh(drumPlinthGeo, drumPlinthMat);
    drumPlinth.position.y = 0.08;
    drumPlinth.userData.ignoreRaycaster = true;
    muopGroup.add(drumPlinth);

    // Mái đình làng 4 góc đao cong
    const dinhRoofGeo = prepGeo(new THREE.ConeGeometry(2.8, 1.2, 4));
    const dinhRoof = new THREE.Mesh(dinhRoofGeo, tileMat);
    dinhRoof.position.set(0, 2.6, 0);
    dinhRoof.rotation.y = Math.PI / 4;
    dinhRoof.userData.ignoreRaycaster = true;
    muopGroup.add(dinhRoof);

    // 4 Cột gỗ lim
    const dColGeo = prepGeo(new THREE.CylinderGeometry(0.12, 0.14, 2.0, 8));
    [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]].forEach(([ox, oz]) => {
      const col = new THREE.Mesh(dColGeo, limMat);
      col.position.set(ox, 1.08, oz);
      col.userData.ignoreRaycaster = true;
      muopGroup.add(col);
    });

    // Bàn chỉ huy với cuộn chiếu sớ & bút lông
    const deskGeo = prepGeo(new THREE.BoxGeometry(0.9, 0.35, 0.5));
    const deskMesh = new THREE.Mesh(deskGeo, limMat);
    deskMesh.position.set(0, 0.16 + 0.175, 0);
    deskMesh.userData.ignoreRaycaster = true;
    muopGroup.add(deskMesh);

    // Đèn lồng vàng đình làng
    const dLight = new THREE.PointLight(0xffaa33, 1.2, 8.0);
    dLight.position.set(0, 2.0, 0);
    dLight.userData.ignoreRaycaster = true;
    muopGroup.add(dLight);

    this.group.add(muopGroup);

    // =========================================================================
    // 2. HIÊN MỘC BẢN VẼ (-5.8, 0, 3.8) - Trạm Mèo Tam Thể Kiến Trúc
    // =========================================================================
    const tamTheGroup = new THREE.Group();
    tamTheGroup.name = 'Workstation_TamThe_HienMoc';
    tamTheGroup.position.set(-5.8, 0, 3.8);

    const floorGeo = prepGeo(new THREE.BoxGeometry(2.4, 0.14, 2.0));
    const floorMesh = new THREE.Mesh(floorGeo, limMat);
    floorMesh.position.y = 0.07;
    floorMesh.userData.ignoreRaycaster = true;
    tamTheGroup.add(floorMesh);

    // Mái hiên gỗ dốc
    const hienRoofGeo = prepGeo(new THREE.BoxGeometry(2.6, 0.12, 2.2));
    const hienRoof = new THREE.Mesh(hienRoofGeo, tileMat);
    hienRoof.position.set(0, 2.1, 0);
    hienRoof.rotation.x = 0.15;
    hienRoof.userData.ignoreRaycaster = true;
    tamTheGroup.add(hienRoof);

    // 2 Cột chống phía trước
    const hColGeo = prepGeo(new THREE.CylinderGeometry(0.09, 0.1, 1.9, 8));
    const colL = new THREE.Mesh(hColGeo, limMat); colL.position.set(-1.0, 1.0, 0.8);
    const colR = new THREE.Mesh(hColGeo, limMat); colR.position.set(1.0, 1.0, 0.8);
    colL.userData.ignoreRaycaster = true; colR.userData.ignoreRaycaster = true;
    tamTheGroup.add(colL, colR);

    // Bàn vẽ kiến trúc & cuộn bản vẽ xanh
    const draftDeskGeo = prepGeo(new THREE.BoxGeometry(1.2, 0.45, 0.7));
    const draftDesk = new THREE.Mesh(draftDeskGeo, limMat);
    draftDesk.position.set(0, 0.14 + 0.225, 0);
    draftDesk.userData.ignoreRaycaster = true;

    const blueprintGeo = prepGeo(new THREE.PlaneGeometry(0.8, 0.45));
    const blueprintMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
    const blueprint = new THREE.Mesh(blueprintGeo, blueprintMat);
    blueprint.rotation.x = -Math.PI / 2;
    blueprint.position.set(0, 0.14 + 0.455, 0);
    blueprint.userData.ignoreRaycaster = true;

    tamTheGroup.add(draftDesk, blueprint);

    // Đèn lồng xanh ngọc
    const tLight = new THREE.PointLight(0x06b6d4, 1.0, 7.0);
    tLight.position.set(0, 1.8, 0.5);
    tLight.userData.ignoreRaycaster = true;
    tamTheGroup.add(tLight);

    this.group.add(tamTheGroup);

    // =========================================================================
    // 3. BẾP RÈN & BỂ SÓNG (5.8, 0, 3.8) - Trạm Mèo Vàng Thợ Rèn
    // =========================================================================
    const meoVangGroup = new THREE.Group();
    meoVangGroup.name = 'Workstation_MeoVang_BepRen';
    meoVangGroup.position.set(5.8, 0, 3.8);

    // Nền đá sa thạch
    const forgeBaseGeo = prepGeo(new THREE.BoxGeometry(2.5, 0.14, 2.2));
    const forgeBaseMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9 });
    const forgeBase = new THREE.Mesh(forgeBaseGeo, forgeBaseMat);
    forgeBase.position.y = 0.07;
    forgeBase.userData.ignoreRaycaster = true;
    meoVangGroup.add(forgeBase);

    // Lò rèn tí hon than hồng
    const furnaceGeo = prepGeo(new THREE.CylinderGeometry(0.45, 0.55, 0.75, 12));
    const furnaceMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.85 });
    const furnace = new THREE.Mesh(furnaceGeo, furnaceMat);
    furnace.position.set(-0.6, 0.14 + 0.375, -0.4);
    furnace.userData.ignoreRaycaster = true;

    const coalGeo = prepGeo(new THREE.SphereGeometry(0.32, 8, 8));
    const coalMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 0.85
    });
    const coals = new THREE.Mesh(coalGeo, coalMat);
    coals.position.set(-0.6, 0.14 + 0.65, -0.4);
    coals.userData.ignoreRaycaster = true;

    const forgeLight = new THREE.PointLight(0xf97316, 1.4, 6.0);
    forgeLight.position.set(-0.6, 1.1, -0.4);
    forgeLight.userData.ignoreRaycaster = true;
    meoVangGroup.add(furnace, coals, forgeLight);

    // Đe rèn sắt đen bóng
    const anvilGeo = prepGeo(new THREE.BoxGeometry(0.35, 0.45, 0.25));
    const anvilMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.35, metalness: 0.85 });
    const anvil = new THREE.Mesh(anvilGeo, anvilMat);
    anvil.position.set(0.1, 0.14 + 0.225, 0);
    anvil.userData.ignoreRaycaster = true;
    meoVangGroup.add(anvil);

    // Bể sóng (máng nước làm nguội kim loại gợn sóng)
    const troughGeo = prepGeo(new THREE.BoxGeometry(0.75, 0.35, 0.5));
    const troughMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const trough = new THREE.Mesh(troughGeo, troughMat);
    trough.position.set(0.65, 0.14 + 0.175, 0.35);
    trough.userData.ignoreRaycaster = true;

    const waterGeo = prepGeo(new THREE.PlaneGeometry(0.68, 0.42));
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x06b6d4, roughness: 0.1, metalness: 0.8, opacity: 0.85, transparent: true });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(0.65, 0.14 + 0.34, 0.35);
    water.userData.ignoreRaycaster = true;
    meoVangGroup.add(trough, water);

    this.group.add(meoVangGroup);

    // =========================================================================
    // 4. CHÒI ĐÈN LỒNG (0, 0.4, -6.8) - Trạm Mèo Mun Thắp Đèn
    // =========================================================================
    const meoMunGroup = new THREE.Group();
    meoMunGroup.name = 'Workstation_MeoMun_ChoiDenLong';
    meoMunGroup.position.set(0, 0.4, -6.8);

    // Sàn gỗ bát giác nâng cao 0.4m
    const deckGeo = prepGeo(new THREE.CylinderGeometry(2.2, 2.3, 0.2, 8));
    const deckMesh = new THREE.Mesh(deckGeo, limMat);
    deckMesh.position.y = 0.1;
    deckMesh.userData.ignoreRaycaster = true;
    meoMunGroup.add(deckMesh);

    // Mái ngói bát giác
    const octRoofGeo = prepGeo(new THREE.ConeGeometry(2.6, 1.4, 8));
    const octRoof = new THREE.Mesh(octRoofGeo, tileMat);
    octRoof.position.set(0, 2.7, 0);
    octRoof.userData.ignoreRaycaster = true;
    meoMunGroup.add(octRoof);

    // 4 Cột gỗ
    const oColGeo = prepGeo(new THREE.CylinderGeometry(0.1, 0.12, 2.2, 8));
    [[-1.1, -1.1], [1.1, -1.1], [-1.1, 1.1], [1.1, 1.1]].forEach(([ox, oz]) => {
      const col = new THREE.Mesh(oColGeo, limMat);
      col.position.set(ox, 1.2, oz);
      col.userData.ignoreRaycaster = true;
      meoMunGroup.add(col);
    });

    // Chùm đèn lồng Hội An đa sắc (vàng, đỏ, xanh, cam)
    const lanternColors = [0xfacc15, 0xef4444, 0x06b6d4, 0xf97316];
    for (let l = 0; l < 4; l++) {
      const ang = (l * Math.PI) / 2;
      const lx = Math.cos(ang) * 1.2;
      const lz = Math.sin(ang) * 1.2;

      const lMesh = new THREE.Mesh(
        prepGeo(new THREE.SphereGeometry(0.2, 8, 8)),
        new THREE.MeshStandardMaterial({
          color: lanternColors[l],
          emissive: lanternColors[l],
          emissiveIntensity: 0.65
        })
      );
      lMesh.position.set(lx, 2.0, lz);
      lMesh.userData.ignoreRaycaster = true;
      meoMunGroup.add(lMesh);
    }

    const munLight = new THREE.PointLight(0xffaa33, 1.6, 9.0);
    munLight.position.set(0, 2.1, 0);
    munLight.userData.ignoreRaycaster = true;
    meoMunGroup.add(munLight);

    this.group.add(meoMunGroup);

    // =========================================================================
    // 5. CHIẾU ĐÀN VEN SUỐI (-5.0, 0, -2.5) - Trạm Mèo Trắng Đào Nương
    // =========================================================================
    const meoTrangGroup = new THREE.Group();
    meoTrangGroup.name = 'Workstation_MeoTrang_ChieuDan';
    meoTrangGroup.position.set(-5.0, 0, -2.5);

    // Chiếu cói hoa dệt đỏ viền vàng
    const matGeo = prepGeo(new THREE.PlaneGeometry(2.0, 1.6));
    const matMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.85 });
    const matMesh = new THREE.Mesh(matGeo, matMat);
    matMesh.rotation.x = -Math.PI / 2;
    matMesh.position.y = 0.03;
    matMesh.userData.ignoreRaycaster = true;
    meoTrangGroup.add(matMesh);

    // Đàn Tranh 16 dây tí hon
    const zitherGeo = prepGeo(new THREE.BoxGeometry(0.24, 0.06, 0.95));
    const zitherMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.35 });
    const zitherMesh = new THREE.Mesh(zitherGeo, zitherMat);
    zitherMesh.position.set(0.1, 0.09, 0);
    zitherMesh.rotation.y = 0.25;
    zitherMesh.userData.ignoreRaycaster = true;
    meoTrangGroup.add(zitherMesh);

    // Khay trà sen tử sa
    const teaGeo = prepGeo(new THREE.CylinderGeometry(0.12, 0.14, 0.04, 10));
    const teaMat = new THREE.MeshStandardMaterial({ color: 0x451a03 });
    const teaMesh = new THREE.Mesh(teaGeo, teaMat);
    teaMesh.position.set(-0.45, 0.05, 0.2);
    teaMesh.userData.ignoreRaycaster = true;
    meoTrangGroup.add(teaMesh);

    // Cành hoa đào phai nghiêng mình
    const branchGeo = prepGeo(new THREE.CylinderGeometry(0.02, 0.04, 1.4, 6));
    const branchMat = new THREE.MeshStandardMaterial({ color: 0x3e2014 });
    const branch = new THREE.Mesh(branchGeo, branchMat);
    branch.rotation.z = -0.55;
    branch.position.set(-0.6, 0.65, -0.4);
    branch.userData.ignoreRaycaster = true;
    meoTrangGroup.add(branch);

    const pinkFlowerMat = new THREE.MeshBasicMaterial({ color: 0xf472b6 });
    for (let f = 0; f < 6; f++) {
      const fl = new THREE.Mesh(prepGeo(new THREE.DodecahedronGeometry(0.06, 0)), pinkFlowerMat);
      fl.position.set(-0.35 - f * 0.12, 0.6 + (f % 3) * 0.15, -0.4 + (f % 2) * 0.1);
      fl.userData.ignoreRaycaster = true;
      meoTrangGroup.add(fl);
    }

    const trangLight = new THREE.PointLight(0xf472b6, 0.9, 5.0);
    trangLight.position.set(0, 1.2, 0);
    trangLight.userData.ignoreRaycaster = true;
    meoTrangGroup.add(trangLight);

    this.group.add(meoTrangGroup);

    // =========================================================================
    // 6. CỔNG LINH MIÊU TRỞ VỀ (0, 0, 8.2) - Trạm Mèo Xiêm Tuần Đinh
    // =========================================================================
    const meoXiemGroup = new THREE.Group();
    meoXiemGroup.name = 'Workstation_MeoXiem_CongLinhMieu';
    meoXiemGroup.position.set(0, 0, 8.2);

    // Bậc thềm đá chạm mây
    const stepGeo = prepGeo(new THREE.BoxGeometry(4.0, 0.18, 1.6));
    const stepMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
    const step = new THREE.Mesh(stepGeo, stepMat);
    step.position.y = 0.09;
    step.userData.ignoreRaycaster = true;
    meoXiemGroup.add(step);

    // Khiên đồng & gậy tre của Mèo Xiêm
    const shieldGeo = prepGeo(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 12));
    const shield = new THREE.Mesh(shieldGeo, goldMat);
    shield.rotation.x = Math.PI / 2.5;
    shield.position.set(1.4, 0.32, 0.2);
    shield.userData.ignoreRaycaster = true;

    const staffGeo = prepGeo(new THREE.CylinderGeometry(0.02, 0.02, 1.5, 6));
    const staffMat = new THREE.MeshStandardMaterial({ color: 0x854d0e });
    const staff = new THREE.Mesh(staffGeo, staffMat);
    staff.rotation.z = -0.2;
    staff.position.set(1.5, 0.75, 0.2);
    staff.userData.ignoreRaycaster = true;

    meoXiemGroup.add(shield, staff);
    this.group.add(meoXiemGroup);

    this.disposables.push(limMat, tileMat, goldMat, drumPlinthMat, forgeBaseMat);
  }

  /**
   * TẠO HÌNH 6 CHÚ MÈO 3D CHIBI CHI TIẾT (FULL ANIME DETAILS & PHỤ KIỆN CỔ PHONG)
   */
  buildSixProceduralCats() {
    const whiskerGeo = prepGeo(new THREE.CylinderGeometry(0.007, 0.004, 0.36, 4));
    const whiskerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const innerEarGeo = prepGeo(new THREE.ConeGeometry(0.12, 0.26, 4));
    const innerEarMat = new THREE.MeshStandardMaterial({ color: 0xfda4af, roughness: 0.6 });
    const sparkleGeo1 = prepGeo(new THREE.SphereGeometry(0.036, 8, 8));
    const sparkleGeo2 = prepGeo(new THREE.SphereGeometry(0.018, 6, 6));
    const sparkleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    CAT_AGENTS_DATA.forEach((catData, idx) => {
      const catGroup = new THREE.Group();
      catGroup.name = `CatAgent_${catData.id}`;
      catGroup.position.copy(catData.homePos);

      // 1. THÂN MÈO TRÒN TRỊA (CHIBI BODY)
      const bodyGeo = prepGeo(new THREE.SphereGeometry(0.48, 16, 16));
      const bodyMat = new THREE.MeshStandardMaterial({
        color: catData.primaryColor,
        roughness: 0.75
      });
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      bodyMesh.scale.set(1.0, 1.15, 1.1);
      bodyMesh.position.y = 0.65;
      bodyMesh.userData.ignoreRaycaster = true;
      catGroup.add(bodyMesh);

      // 2. ĐẦU MÈO TO TRÒN ĐÁNG YÊU (CHIBI HEAD)
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 1.35, 0.25);

      const headGeo = prepGeo(new THREE.SphereGeometry(0.52, 16, 16));
      const headMesh = new THREE.Mesh(headGeo, bodyMat);
      headMesh.userData.ignoreRaycaster = true;
      headGroup.add(headMesh);

      // Đôi tai tam giác nhọn vểnh
      const earGeo = prepGeo(new THREE.ConeGeometry(0.18, 0.35, 4));
      const earColor = catData.id === 'meo_xiem' ? 0x4a2c11 : catData.primaryColor;
      const earMat = new THREE.MeshStandardMaterial({ color: earColor, roughness: 0.7 });

      const leftEar = new THREE.Mesh(earGeo, earMat);
      leftEar.position.set(-0.32, 0.48, 0);
      leftEar.rotation.set(-0.1, 0, 0.35);
      leftEar.userData.ignoreRaycaster = true;
      headGroup.add(leftEar);

      const rightEar = new THREE.Mesh(earGeo, earMat);
      rightEar.position.set(0.32, 0.48, 0);
      rightEar.rotation.set(-0.1, 0, -0.35);
      rightEar.userData.ignoreRaycaster = true;
      headGroup.add(rightEar);

      // Tai trong màu hồng phấn dễ thương
      const inEarL = new THREE.Mesh(innerEarGeo, innerEarMat);
      inEarL.position.set(-0.31, 0.47, 0.04);
      inEarL.rotation.set(-0.1, 0, 0.35);
      inEarL.userData.ignoreRaycaster = true;
      headGroup.add(inEarL);

      const inEarR = new THREE.Mesh(innerEarGeo, innerEarMat);
      inEarR.position.set(0.31, 0.47, 0.04);
      inEarR.rotation.set(-0.1, 0, -0.35);
      inEarR.userData.ignoreRaycaster = true;
      headGroup.add(inEarR);

      // Mắt mèo to tròn
      const eyeGeo = prepGeo(new THREE.SphereGeometry(0.12, 12, 12));
      const eyeColor = catData.eyeColor || (catData.id === 'meo_xiem' ? 0x0ea5e9 : 0x27ae60);
      const eyeMat = new THREE.MeshBasicMaterial({ color: eyeColor });

      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.2, 0.08, 0.44);
      leftEye.userData.ignoreRaycaster = true;
      headGroup.add(leftEye);

      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(0.2, 0.08, 0.44);
      rightEye.userData.ignoreRaycaster = true;
      headGroup.add(rightEye);

      // Con ngươi hình bầu dục đen nhánh
      const pupilGeo = prepGeo(new THREE.SphereGeometry(0.06, 8, 8));
      const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

      const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
      leftPupil.scale.set(0.6, 1.3, 0.6);
      leftPupil.position.set(-0.2, 0.08, 0.52);
      leftPupil.userData.ignoreRaycaster = true;
      headGroup.add(leftPupil);

      const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
      rightPupil.scale.set(0.6, 1.3, 0.6);
      rightPupil.position.set(0.2, 0.08, 0.52);
      rightPupil.userData.ignoreRaycaster = true;
      headGroup.add(rightPupil);

      // Đốm sáng anime lấp lánh trong mắt (Eye sparkle highlights)
      const sL1 = new THREE.Mesh(sparkleGeo1, sparkleMat);
      sL1.position.set(-0.17, 0.12, 0.55);
      sL1.userData.ignoreRaycaster = true;
      const sL2 = new THREE.Mesh(sparkleGeo2, sparkleMat);
      sL2.position.set(-0.23, 0.04, 0.55);
      sL2.userData.ignoreRaycaster = true;
      headGroup.add(sL1, sL2);

      const sR1 = new THREE.Mesh(sparkleGeo1, sparkleMat);
      sR1.position.set(0.23, 0.12, 0.55);
      sR1.userData.ignoreRaycaster = true;
      const sR2 = new THREE.Mesh(sparkleGeo2, sparkleMat);
      sR2.position.set(0.17, 0.04, 0.55);
      sR2.userData.ignoreRaycaster = true;
      headGroup.add(sR1, sR2);

      // Mũi hồng nhỏ xinh
      const noseGeo = prepGeo(new THREE.ConeGeometry(0.06, 0.06, 3));
      const noseMat = new THREE.MeshBasicMaterial({ color: 0xffb6c1 });
      const nose = new THREE.Mesh(noseGeo, noseMat);
      nose.rotation.x = Math.PI;
      nose.position.set(0, -0.05, 0.53);
      nose.userData.ignoreRaycaster = true;
      headGroup.add(nose);

      // 3 RIA MÉP TRẮNG MỖI BÊN MÁ (WHISKERS)
      [-0.14, 0.0, 0.14].forEach((rotZ) => {
        const wL = new THREE.Mesh(whiskerGeo, whiskerMat);
        wL.rotation.set(0, 0, Math.PI / 2 + rotZ);
        wL.position.set(-0.35, -0.06 + rotZ * 0.12, 0.44);
        wL.userData.ignoreRaycaster = true;
        headGroup.add(wL);

        const wR = new THREE.Mesh(whiskerGeo, whiskerMat);
        wR.rotation.set(0, 0, -Math.PI / 2 + rotZ);
        wR.position.set(0.35, -0.06 + rotZ * 0.12, 0.44);
        wR.userData.ignoreRaycaster = true;
        headGroup.add(wR);
      });

      // PHỤ KIỆN CỔ PHONG ĐẶC TRƯNG TỪNG CHÚ MÈO:
      if (catData.id === 'muop') {
        // Mèo Mướp: Khăn đóng nho sinh & đai ngọc chỉ huy
        const hatGeo = prepGeo(new THREE.CylinderGeometry(0.32, 0.35, 0.22, 16));
        const hatMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5 });
        const hat = new THREE.Mesh(hatGeo, hatMat);
        hat.position.set(0, 0.55, -0.05);
        hat.userData.ignoreRaycaster = true;
        headGroup.add(hat);

        const hatRimGeo = prepGeo(new THREE.TorusGeometry(0.35, 0.025, 8, 16));
        const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.8 });
        const hatRim = new THREE.Mesh(hatRimGeo, goldMat);
        hatRim.rotation.x = Math.PI / 2;
        hatRim.position.set(0, 0.45, -0.05);
        hatRim.userData.ignoreRaycaster = true;
        headGroup.add(hatRim);

        const beltGeo = prepGeo(new THREE.TorusGeometry(0.5, 0.04, 8, 20));
        const beltMat = new THREE.MeshStandardMaterial({ color: 0x4a2c11, roughness: 0.6 });
        const belt = new THREE.Mesh(beltGeo, beltMat);
        belt.rotation.x = Math.PI / 2;
        belt.position.y = 0.62;
        belt.userData.ignoreRaycaster = true;
        catGroup.add(belt);

        const jadeGeo = prepGeo(new THREE.SphereGeometry(0.08, 12, 12));
        const jadeMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.2, metalness: 0.4 });
        const jade = new THREE.Mesh(jadeGeo, jadeMat);
        jade.position.set(0, 0.62, 0.52);
        jade.userData.ignoreRaycaster = true;
        catGroup.add(jade);
        this.disposables.push(hatGeo, hatMat, hatRimGeo, goldMat, beltGeo, beltMat, jadeGeo, jadeMat);
      } else if (catData.id === 'tam_the') {
        // Mèo Tam Thể: Cuộn bản vẽ kiến trúc đeo chéo sau lưng & thước tầm xích gỗ mini
        const scrollGeo = prepGeo(new THREE.CylinderGeometry(0.09, 0.09, 0.75, 12));
        const scrollMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.5 });
        const scroll = new THREE.Mesh(scrollGeo, scrollMat);
        scroll.rotation.z = Math.PI / 4;
        scroll.position.set(-0.15, 0.8, -0.42);
        scroll.userData.ignoreRaycaster = true;
        catGroup.add(scroll);

        const rulerGeo = prepGeo(new THREE.BoxGeometry(0.05, 0.48, 0.02));
        const woodRulerMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.6 });
        const ruler = new THREE.Mesh(rulerGeo, woodRulerMat);
        ruler.rotation.z = -0.3;
        ruler.position.set(0.48, 0.55, 0.1);
        ruler.userData.ignoreRaycaster = true;
        catGroup.add(ruler);

        // Đốm lông tam thể cam & xám tro
        const patchGeo = prepGeo(new THREE.SphereGeometry(0.24, 12, 12));
        const pMat1 = new THREE.MeshStandardMaterial({ color: catData.patchColor1, roughness: 0.75 });
        const pMat2 = new THREE.MeshStandardMaterial({ color: catData.patchColor2, roughness: 0.75 });
        const p1 = new THREE.Mesh(patchGeo, pMat1);
        p1.position.set(-0.25, 0.85, 0.25);
        p1.scale.set(1.1, 0.8, 1.0);
        p1.userData.ignoreRaycaster = true;
        const p2 = new THREE.Mesh(patchGeo, pMat2);
        p2.position.set(0.26, 0.7, -0.2);
        p2.scale.set(1.0, 1.2, 0.9);
        p2.userData.ignoreRaycaster = true;
        catGroup.add(p1, p2);
        this.disposables.push(scrollGeo, scrollMat, rulerGeo, woodRulerMat, patchGeo, pMat1, pMat2);
      } else if (catData.id === 'meo_vang') {
        // Mèo Vàng: Yếm da thợ rèn & búa đồng mini dắt bên hông
        const apronGeo = prepGeo(new THREE.BoxGeometry(0.46, 0.5, 0.08));
        const apronMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.75 });
        const apron = new THREE.Mesh(apronGeo, apronMat);
        apron.position.set(0, 0.62, 0.44);
        apron.userData.ignoreRaycaster = true;
        catGroup.add(apron);

        const bHandleGeo = prepGeo(new THREE.CylinderGeometry(0.02, 0.02, 0.42, 6));
        const bHeadGeo = prepGeo(new THREE.BoxGeometry(0.16, 0.09, 0.09));
        const hammerMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.8 });
        const hHandleMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.7 });
        const hammerHandle = new THREE.Mesh(bHandleGeo, hHandleMat);
        hammerHandle.position.set(0.48, 0.6, 0.0);
        hammerHandle.rotation.z = -0.3;
        hammerHandle.userData.ignoreRaycaster = true;
        const hammerHead = new THREE.Mesh(bHeadGeo, hammerMat);
        hammerHead.position.set(0.44, 0.8, 0.0);
        hammerHead.userData.ignoreRaycaster = true;
        catGroup.add(hammerHandle, hammerHead);
        this.disposables.push(apronGeo, apronMat, bHandleGeo, bHeadGeo, hammerMat, hHandleMat);
      } else if (catData.id === 'meo_mun') {
        // Mèo Mun: Vòng cổ chỉ đỏ thắm + lục lạc vàng & lồng đèn hoa đăng mini
        const collarGeo = prepGeo(new THREE.TorusGeometry(0.44, 0.035, 8, 20));
        const collarMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
        const collar = new THREE.Mesh(collarGeo, collarMat);
        collar.rotation.x = Math.PI / 2;
        collar.position.y = 0.98;
        collar.userData.ignoreRaycaster = true;
        catGroup.add(collar);

        const bellGeo = prepGeo(new THREE.SphereGeometry(0.09, 12, 12));
        const bellMat = new THREE.MeshStandardMaterial({
          color: 0xfacc15, emissive: 0xf59e0b, emissiveIntensity: 0.8, roughness: 0.2, metalness: 0.85
        });
        const bell = new THREE.Mesh(bellGeo, bellMat);
        bell.position.set(0, 0.95, 0.46);
        bell.userData.ignoreRaycaster = true;
        catGroup.add(bell);

        const lanternGeo = prepGeo(new THREE.SphereGeometry(0.14, 8, 8));
        const lanternMat = new THREE.MeshStandardMaterial({
          color: 0xf97316, emissive: 0xea580c, emissiveIntensity: 0.9
        });
        const miniLantern = new THREE.Mesh(lanternGeo, lanternMat);
        miniLantern.position.set(-0.52, 0.85, 0.2);
        miniLantern.userData.ignoreRaycaster = true;
        catGroup.add(miniLantern);
        this.disposables.push(collarGeo, collarMat, bellGeo, bellMat, lanternGeo, lanternMat);
      } else if (catData.id === 'meo_trang') {
        // Mèo Trắng: Bông sen ngọc cài tai, nơ lụa đỏ son & đàn tranh 16 dây mini
        const lotusGeo = prepGeo(new THREE.ConeGeometry(0.09, 0.18, 5));
        const lotusMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.5 });
        const lotus = new THREE.Mesh(lotusGeo, lotusMat);
        lotus.position.set(-0.38, 0.38, 0.22);
        lotus.rotation.set(-0.3, 0.2, 0.6);
        lotus.userData.ignoreRaycaster = true;
        headGroup.add(lotus);

        const bowGeo = prepGeo(new THREE.TorusGeometry(0.18, 0.06, 8, 16));
        const bowMat = new THREE.MeshBasicMaterial({ color: 0xe11d48 });
        const bow = new THREE.Mesh(bowGeo, bowMat);
        bow.position.set(0, -0.42, 0.38);
        bow.userData.ignoreRaycaster = true;
        headGroup.add(bow);

        const zitherGeo = prepGeo(new THREE.BoxGeometry(0.14, 0.05, 0.72));
        const zitherMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.35 });
        const miniZither = new THREE.Mesh(zitherGeo, zitherMat);
        miniZither.rotation.set(0.4, 0.2, -0.5);
        miniZither.position.set(0.2, 0.8, -0.42);
        miniZither.userData.ignoreRaycaster = true;
        catGroup.add(miniZither);
        this.disposables.push(lotusGeo, lotusMat, bowGeo, bowMat, zitherGeo, zitherMat);
      } else if (catData.id === 'meo_xiem') {
        // Mèo Xiêm: Mặt nạ nâu sẫm, mắt xanh biếc & chuông đồng thẻ bài tuần đinh
        const muzzlePatchGeo = prepGeo(new THREE.SphereGeometry(0.25, 12, 12));
        const maskMat = new THREE.MeshStandardMaterial({ color: 0x4a2c11, roughness: 0.8 });
        const muzzlePatch = new THREE.Mesh(muzzlePatchGeo, maskMat);
        muzzlePatch.scale.set(1.2, 0.9, 0.9);
        muzzlePatch.position.set(0, -0.06, 0.38);
        muzzlePatch.userData.ignoreRaycaster = true;
        headGroup.add(muzzlePatch);

        const tagGeo = prepGeo(new THREE.BoxGeometry(0.12, 0.24, 0.03));
        const tagMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.5 });
        const patrolTag = new THREE.Mesh(tagGeo, tagMat);
        patrolTag.position.set(-0.48, 0.52, 0.1);
        patrolTag.rotation.z = 0.2;
        patrolTag.userData.ignoreRaycaster = true;
        catGroup.add(patrolTag);

        const xiemBellGeo = prepGeo(new THREE.SphereGeometry(0.075, 10, 10));
        const goldMatXiem = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.28, metalness: 0.85 });
        const xiemBell = new THREE.Mesh(xiemBellGeo, goldMatXiem);
        xiemBell.position.set(-0.48, 0.65, 0.1);
        xiemBell.userData.ignoreRaycaster = true;
        catGroup.add(xiemBell);
        this.disposables.push(muzzlePatchGeo, maskMat, tagGeo, tagMat, xiemBellGeo, goldMatXiem);
      }

      catGroup.add(headGroup);

      // 3. 4 CHÂN NGẮN MŨM MĨM
      const legGeo = prepGeo(new THREE.CylinderGeometry(0.12, 0.14, 0.38, 8));
      const legMat = new THREE.MeshStandardMaterial({
        color: catData.id === 'meo_xiem' ? 0x4a2c11 : catData.primaryColor,
        roughness: 0.75
      });

      const legFL = new THREE.Mesh(legGeo, legMat);
      legFL.position.set(-0.25, 0.19, 0.26);
      legFL.userData.ignoreRaycaster = true;
      catGroup.add(legFL);

      const legFR = new THREE.Mesh(legGeo, legMat);
      legFR.position.set(0.25, 0.19, 0.26);
      legFR.userData.ignoreRaycaster = true;
      catGroup.add(legFR);

      const legBL = new THREE.Mesh(legGeo, legMat);
      legBL.position.set(-0.25, 0.19, -0.26);
      legBL.userData.ignoreRaycaster = true;
      catGroup.add(legBL);

      const legBR = new THREE.Mesh(legGeo, legMat);
      legBR.position.set(0.25, 0.19, -0.26);
      legBR.userData.ignoreRaycaster = true;
      catGroup.add(legBR);

      // 4. CHIẾC ĐUÔI CONG DÀI UỐN LƯỢN (SIN WAVE TAIL)
      const tailCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.45, -0.45),
        new THREE.Vector3(0, 0.75, -0.85),
        new THREE.Vector3(0.15, 1.15, -0.75),
        new THREE.Vector3(0.0, 1.45, -0.6)
      ]);
      const tailGeo = prepGeo(new THREE.TubeGeometry(tailCurve, 16, 0.07, 8, false));
      const tailMesh = new THREE.Mesh(tailGeo, bodyMat);
      tailMesh.userData.ignoreRaycaster = true;
      catGroup.add(tailMesh);

      // 5. THẺ TÊN BAY TRÊN ĐẦU (FLOATING PILL BADGE)
      const pillBadge = this.createCatFloatingBadge(catData.shortName, catData.badgeColor);
      pillBadge.position.set(0, 2.25, 0);
      catGroup.add(pillBadge);

      // 6. INVISIBLE PROXY HITBOX (Mesh tàng hình bao quanh để click chính xác 100%)
      const hitboxGeo = prepGeo(new THREE.CylinderGeometry(1.2, 1.2, 2.6, 12));
      const hitboxMat = new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.0,
        depthWrite: false
      });
      const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
      hitbox.position.y = 1.2;
      hitbox.userData = {
        isCatHitbox: true,
        catId: catData.id,
        catData: catData,
        rootCat: catGroup
      };
      catGroup.add(hitbox);
      this.interactiveHitboxes.push(hitbox);

      // Dữ liệu điều khiển animation
      const catAnimData = {
        id: catData.id,
        group: catGroup,
        headGroup: headGroup,
        tailMesh: tailMesh,
        pillBadge: pillBadge,
        legFL, legFR, legBL, legBR,
        leftEar, rightEar,
        basePos: catData.homePos.clone(),
        targetPos: catData.homePos.clone(),
        wanderRadius: 2.2,
        moveSpeed: 1.2 + idx * 0.15,
        idleTimer: 2.0 + Math.random() * 3.0,
        isWalking: false,
        phaseOffset: idx * 1.05,
        bubbleTimer: 0
      };

      // 7. BONG BÓNG SUY NGHĨ (THOUGHT BUBBLE)
      const thoughtBubble = this.createCatThoughtBubble(catAnimData);
      catGroup.add(thoughtBubble);

      this.catObjects.push(catAnimData);
      this.group.add(catGroup);

      this.disposables.push(
        bodyGeo, bodyMat, headGeo, earGeo, earMat, eyeGeo, eyeMat,
        pupilGeo, pupilMat, noseGeo, noseMat, legGeo, legMat, tailGeo, hitboxGeo, hitboxMat
      );
    });

    this.disposables.push(whiskerGeo, whiskerMat, innerEarGeo, innerEarMat, sparkleGeo1, sparkleGeo2, sparkleMat);
  }

  /**
   * TẠO THẺ TÊN BAY TRÊN ĐẦU (FLOATING PILL BADGE)
   * Định dạng [Tên Mèo · Vai Trò | ● Đang chạy] với chấm xanh #22c55e
   */
  createCatFloatingBadge(title, badgeColor) {
    if (typeof document === 'undefined') {
      const dummyGeo = prepGeo(new THREE.PlaneGeometry(0.1, 0.1));
      const dummyMat = new THREE.MeshBasicMaterial({ visible: false });
      const dummy = new THREE.Mesh(dummyGeo, dummyMat);
      dummy.userData.ignoreRaycaster = true;
      return dummy;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 460;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');

    // Nền viên thuốc bo tròn (Pill Badge)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.beginPath();
    ctx.roundRect(8, 8, 444, 80, 40);
    ctx.fill();

    // Viền màu đặc trưng
    ctx.strokeStyle = badgeColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.roundRect(8, 8, 444, 80, 40);
    ctx.stroke();

    // Văn bản: [Tên Mèo · Vai Trò |
    ctx.font = 'bold 20px "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.textBaseline = 'middle';
    const prefix = `[ ${title}  | `;
    ctx.fillText(prefix, 24, 48);
    const textW = ctx.measureText(prefix).width;

    // Chấm xanh trạng thái đang chạy (#22c55e)
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(24 + textW + 8, 48, 7, 0, Math.PI * 2);
    ctx.fill();

    // Text: Đang chạy ]
    ctx.fillStyle = '#22c55e';
    ctx.fillText('Đang chạy ]', 24 + textW + 20, 48);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;

    const badgeGeo = prepGeo(new THREE.PlaneGeometry(2.4, 0.5));
    const badgeMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });
    badgeMat.userData = { ignoreRaycaster: true };

    const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
    badgeMesh.userData.ignoreRaycaster = true;
    this.disposables.push(badgeGeo, badgeMat, texture);
    return badgeMesh;
  }

  /**
   * TẠO BONG BÓNG SUY NGHĨ (THOUGHT BUBBLE)
   * Hiện trên đầu mèo khi chào nhau hoặc trả lời câu hỏi
   */
  createCatThoughtBubble(catAnimData) {
    if (typeof document === 'undefined') {
      const dummyGeo = prepGeo(new THREE.PlaneGeometry(0.1, 0.1));
      const dummyMat = new THREE.MeshBasicMaterial({ visible: false });
      const dummy = new THREE.Mesh(dummyGeo, dummyMat);
      dummy.userData.ignoreRaycaster = true;
      dummy.userData.showThought = () => {};
      dummy.visible = false;
      return dummy;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 140;
    const ctx = canvas.getContext('2d');

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false;

    const drawThoughtText = (text) => {
      ctx.clearRect(0, 0, 400, 140);
      // Nền đám mây suy nghĩ bo tròn
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(8, 8, 384, 88, 22);
      ctx.fill();
      ctx.stroke();

      // Bong bóng nhỏ dẫn xuống đỉnh đầu
      ctx.beginPath();
      ctx.arc(200, 108, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(192, 126, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Chữ hiển thị
      ctx.font = 'bold 18px "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, 200, 52);
      texture.needsUpdate = true;
    };

    const bubbleGeo = prepGeo(new THREE.PlaneGeometry(2.4, 0.84));
    const bubbleMat = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide
    });
    bubbleMat.userData = { ignoreRaycaster: true };
    const bubbleMesh = new THREE.Mesh(bubbleGeo, bubbleMat);
    bubbleMesh.position.set(0, 2.85, 0);
    bubbleMesh.visible = false;
    bubbleMesh.userData.ignoreRaycaster = true;

    catAnimData.thoughtBubble = bubbleMesh;
    catAnimData.drawThoughtText = drawThoughtText;
    catAnimData.bubbleTimer = 0;

    const defaultQuotes = {
      muop: [
        'Meo! Tiến độ Swarm hôm nay đạt 100%!',
        'Chào đồng chí! Sẵn sàng nhận lệnh mới chưa?',
        'Đại sảnh đã phục hồi chuẩn theo 2 ảnh mẫu!'
      ],
      tam_the: [
        'Quy hoạch 3 lớp không gian thoáng đãng ghê!',
        'Cây cầu gỗ đỏ tí hon vừa khít chân mèo!',
        'Meo meo! Bản vẽ kiến trúc đã duyệt 100%!'
      ],
      meo_vang: [
        'Tôi vừa tôi luyện mặt suối 60 FPS vi vu!',
        'Hạt đom đóm bờ suối bay êm ru, không hề lag chuột!',
        'Ấm quá, ngồi sưởi than hồng một tẹo nào!'
      ],
      meo_mun: [
        'Mắt vàng nhìn thấu ánh sáng Chiaroscuro!',
        'Đã tắt bóng đổ nặng, GPU nhẹ tênh 60+ FPS!',
        'Lồng đèn thắp sáng lung linh cả đảo!'
      ],
      meo_trang: [
        'Meo meo~ Đàn tranh hòa cùng tiếng suối reo!',
        'Mandala 14 tia sáng dưới sách di sản đẹp mê hồn!',
        'Khách bóng đen đang chiêm bái cung kính!'
      ],
      meo_xiem: [
        'Meo! Tuần đinh canh giữ 16 Box3 an toàn!',
        'Cổng Dịch Chuyển sẵn sàng đưa về Đại Sảnh!',
        'npm run build kiểm định thành công 0 lỗi!'
      ]
    };

    catAnimData.showThought = (customText = null, duration = 3.5) => {
      const list = defaultQuotes[catAnimData.id] || ['Meo meo! Chào bạn hiền!'];
      const text = customText || list[Math.floor(Math.random() * list.length)];
      drawThoughtText(text);
      bubbleMesh.visible = true;
      catAnimData.bubbleTimer = duration;
    };

    this.disposables.push(bubbleGeo, bubbleMat, texture);
    return bubbleMesh;
  }

  /**
   * CỔNG LÀNG DỊCH CHUYỂN 2 CHIỀU VỀ ĐẠI SẢNH
   */
  buildVillageTeleportPortal() {
    const portalGroup = new THREE.Group();
    portalGroup.name = 'Village_Return_Portal_Group';
    portalGroup.position.set(0, 0, 8.2); // Ở lối vào phía Nam đảo (Z = 8.2m)
    portalGroup.rotation.y = Math.PI;

    // 1. Thạch Môn cách điệu đôi tai mèo
    const archGeo = prepGeo(new THREE.BoxGeometry(4.8, 5.5, 0.8));
    const archMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
    const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5.0, 0.8), archMat);
    leftPillar.position.set(-2.0, 2.5, 0);
    portalGroup.add(leftPillar);

    const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 5.0, 0.8), archMat);
    rightPillar.position.set(2.0, 2.5, 0);
    portalGroup.add(rightPillar);

    const topBeam = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.8, 1.0), archMat);
    topBeam.position.set(0, 5.2, 0);
    portalGroup.add(topBeam);

    // Đôi tai mèo trên đỉnh cổng
    const earGeo = prepGeo(new THREE.ConeGeometry(0.8, 1.2, 4));
    const leftEar = new THREE.Mesh(earGeo, archMat);
    leftEar.position.set(-1.6, 6.2, 0);
    leftEar.rotation.z = 0.2;
    portalGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, archMat);
    rightEar.position.set(1.6, 6.2, 0);
    rightEar.rotation.z = -0.2;
    portalGroup.add(rightEar);

    // 2. Vòng xoáy Linh Khí Xanh Ngọc Lục Bảo pha Vàng Kim (#00f5d4 & #ffbe55)
    const vortexRes = createLinhKhiVortexMesh({ radius: 1.85, isLobby: false });
    vortexRes.vortexGroup.position.set(0, 2.6, 0);
    portalGroup.add(vortexRes.vortexGroup);

    // Hạt dấu chân mèo & đom đóm lơ lửng quanh cổng
    const auraRes = createCatPawAndFireflyAura({ radius: 2.2, count: 28 });
    auraRes.auraGroup.position.set(0, 2.6, 0);
    portalGroup.add(auraRes.auraGroup);

    // 3. Invisible Proxy Hitbox cho Portal
    const hitboxGeo = prepGeo(new THREE.BoxGeometry(4.2, 5.5, 2.0));
    const hitboxMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0, depthWrite: false });
    const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
    hitbox.position.set(0, 2.8, 0);
    hitbox.userData = {
      isVillagePortal: true,
      action: 'returnToLobby'
    };
    portalGroup.add(hitbox);
    this.portalMesh = hitbox;

    this.group.add(portalGroup);
    this.animatedObjects.push({
      type: 'village_portal_linh_khi',
      update: (timeSec) => {
        vortexRes.updateVortex(timeSec);
        auraRes.updateAura(timeSec);
      }
    });
    this.disposables.push(archGeo, archMat, earGeo, hitboxGeo, hitboxMat);
  }

  /**
   * ÁNH SÁNG ĐÈN LỒNG & ĐOM ĐÓM BỜ SUỐI
   */
  buildLanternLightingAndFireflies() {
    // 1. Ánh sáng môi trường đêm xanh huyền bí
    const hemiLight = new THREE.HemisphereLight(0x0d111a, 0x1e293b, 0.7);
    hemiLight.userData.ignoreRaycaster = true;
    this.group.add(hemiLight);

    // 2. Đèn trung tâm Đảo Mèo tỏa ánh sáng vàng ấm (#ffaa33)
    const islandCenterLight = new THREE.PointLight(0xffaa33, 1.8, 22.0, 1.2);
    islandCenterLight.position.set(0, 4.2, 0);
    islandCenterLight.castShadow = false;
    islandCenterLight.userData.ignoreRaycaster = true;
    this.group.add(islandCenterLight);

    // 3. Hệ thống hạt đom đóm bờ suối trong khuôn viên Đảo Diorama ~22m x 22m
    const fireflyCount = 90;
    const fireflyGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(fireflyCount * 3);
    const phases = new Float32Array(fireflyCount);

    for (let i = 0; i < fireflyCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 19.0;
      positions[i * 3 + 1] = 0.4 + Math.random() * 2.8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 19.0;
      phases[i] = Math.random() * Math.PI * 2;
    }

    fireflyGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    prepGeo(fireflyGeo);

    // Tạo CanvasTexture tròn mịn
    let fTex = null;
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.4, '#ffea79');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 32);

      fTex = new THREE.CanvasTexture(canvas);
      fTex.colorSpace = THREE.SRGBColorSpace;
      fTex.generateMipmaps = false;
      this.disposables.push(fTex);
    }

    const fireflyMat = new THREE.PointsMaterial({
      size: 0.35,
      map: fTex,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    fireflyMat.userData = { ignoreRaycaster: true };

    const fireflies = new THREE.Points(fireflyGeo, fireflyMat);
    fireflies.userData.ignoreRaycaster = true;
    fireflies.raycast = () => {};
    this.group.add(fireflies);

    this.animatedObjects.push({
      type: 'fireflies',
      system: fireflies,
      phases
    });

    // 4. Hệ thống Đèn Lồng Vàng Ấm cúng & Đom đóm viền quanh Đảo Mèo Diorama R = 11m (MUNTHAPDEN)
    const perimeterLighting = createMiniIslandLanternPerimeter({ islandRadius: 11.0 });
    this.group.add(perimeterLighting.islandLightingGroup);
    this.animatedObjects.push({
      type: 'island_perimeter_lanterns',
      update: (timeSec) => perimeterLighting.updateIslandLighting(timeSec)
    });

    this.disposables.push(fireflyGeo, fireflyMat, fTex);
  }

  /**
   * GIAO DIỆN NGƯỜI DÙNG: TOP BAR HUD & CAT INSPECTOR DRAWER
   */
  createUIElements() {
    if (typeof document === 'undefined') return;

    // A. TOP BAR HUD (Thanh công cụ trên cùng)
    let topBar = document.getElementById('cat-village-top-bar');
    if (!topBar) {
      topBar = document.createElement('div');
      topBar.id = 'cat-village-top-bar';
      topBar.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(15, 23, 42, 0.88);
        border: 1px solid rgba(255, 170, 51, 0.5);
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(255, 170, 51, 0.2);
        border-radius: 30px;
        padding: 8px 18px;
        display: none;
        align-items: center;
        gap: 12px;
        z-index: 100010;
        backdrop-filter: blur(10px);
        font-family: "Segoe UI", Roboto, sans-serif;
      `;

      topBar.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; padding-right: 12px; border-right: 1px solid rgba(255,255,255,0.15);">
          <span style="font-size: 20px;">🐱</span>
          <span style="font-weight: bold; color: #ffaa33; font-size: 14px; letter-spacing: 0.5px;">ĐẢO MÈO THÁNH ĐƯỜNG</span>
        </div>

        <button id="cat-btn-view-iso" class="cat-hud-btn active" style="${this.getBtnStyle(true)}">
          🌿 Toàn cảnh Đảo Nhỏ
        </button>
        <button id="cat-btn-view-orbit" class="cat-hud-btn" style="${this.getBtnStyle(false)}">
          🔄 Xoay 3D
        </button>
        <button id="cat-btn-view-fpp" class="cat-hud-btn" style="${this.getBtnStyle(false)}">
          🐾 Đi dạo trên đảo
        </button>

        <div style="background: rgba(34, 197, 94, 0.15); border: 1px solid #22c55e; border-radius: 14px; padding: 4px 10px; font-size: 12px; color: #22c55e; font-weight: bold;">
          Đang chạy (6/6)
        </div>

        <button id="cat-btn-assign-task" style="background: linear-gradient(135deg, #f59e0b, #d97706); border: none; border-radius: 14px; padding: 6px 14px; color: #ffffff; font-weight: bold; font-size: 12.5px; cursor: pointer; transition: all 0.2s;">
          ✨ + Giao việc
        </button>

        <button id="cat-btn-return-lobby" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 14px; padding: 6px 14px; color: #e2e8f0; font-size: 12.5px; cursor: pointer; transition: all 0.2s;">
          🏛️ Về Đại Sảnh
        </button>
      `;

      document.body.appendChild(topBar);

      // Gắn sự kiện các nút
      document.getElementById('cat-btn-view-iso')?.addEventListener('click', () => this.setViewMode('isometric'));
      document.getElementById('cat-btn-view-orbit')?.addEventListener('click', () => this.setViewMode('auto_orbit'));
      document.getElementById('cat-btn-view-fpp')?.addEventListener('click', () => this.setViewMode('fpp'));
      document.getElementById('cat-btn-assign-task')?.addEventListener('click', () => this.promptAssignRandomTask());
      document.getElementById('cat-btn-return-lobby')?.addEventListener('click', () => this.triggerReturnToLobby());
    }

    // B. CAT INSPECTOR DRAWER (Bảng kính mờ bên phải)
    let drawer = document.getElementById('cat-inspector-drawer');
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.id = 'cat-inspector-drawer';
      drawer.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: min(390px, 90vw);
        max-height: calc(100vh - 40px);
        background: linear-gradient(180deg, rgba(15, 23, 42, 0.94) 0%, rgba(30, 41, 59, 0.92) 100%);
        border: 2px solid #ffaa33;
        border-radius: 20px;
        box-shadow: -10px 15px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(255, 170, 51, 0.2);
        color: #f8fafc;
        padding: 22px;
        display: none;
        flex-direction: column;
        gap: 14px;
        z-index: 100020;
        backdrop-filter: blur(14px);
        overflow-y: auto;
        font-family: "Segoe UI", Roboto, sans-serif;
      `;

      drawer.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid rgba(255, 170, 51, 0.25); padding-bottom: 10px;">
          <div>
            <div id="cat-drawer-badge" style="display: inline-block; padding: 3px 8px; border-radius: 8px; font-size: 11px; font-weight: bold; margin-bottom: 4px;">
              CAT AGENT
            </div>
            <h2 id="cat-drawer-name" style="margin: 0; font-size: 20px; color: #ffffff;">Tên Mèo</h2>
            <div id="cat-drawer-breed" style="font-size: 12.5px; color: #94a3b8;">Giống mèo & Danh xưng</div>
          </div>
          <button id="cat-drawer-close-btn" style="background: none; border: 1px solid rgba(255,255,255,0.2); color: #e2e8f0; border-radius: 8px; width: 30px; height: 30px; cursor: pointer; font-size: 16px;">
            ✕
          </button>
        </div>

        <div style="background: rgba(0, 0, 0, 0.3); border-radius: 10px; padding: 12px 14px; border-left: 3px solid #ffaa33;">
          <p id="cat-drawer-intro" style="margin: 0; font-size: 13.5px; line-height: 1.55; color: #f1f5f9;">
            Lời chào của chú mèo...
          </p>
        </div>

        <div style="background: rgba(30, 41, 59, 0.65); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px; padding: 10px 12px;">
          <div style="font-size: 11.5px; font-weight: bold; color: #22c55e; display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
            <span style="display: inline-block; width: 7px; height: 7px; background: #22c55e; border-radius: 50%;"></span>
            NHẬT KÝ HOẠT ĐỘNG GẦN NHẤT:
          </div>
          <div id="cat-drawer-action-log" style="font-size: 12.5px; color: #cbd5e1; line-height: 1.45;"></div>
        </div>

        <div>
          <div style="font-size: 12px; font-weight: bold; color: #ffaa33; text-transform: uppercase; margin-bottom: 6px;">
            Kỹ Năng Di Sản Quản Lý:
          </div>
          <div id="cat-drawer-skills" style="display: flex; flex-wrap: wrap; gap: 6px;"></div>
        </div>

        <div style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 10px;">
          <div style="font-size: 12px; font-weight: bold; color: #38bdf8; text-transform: uppercase; margin-bottom: 8px;">
            Trò Chuyện Cùng Mèo (Click Câu Hỏi):
          </div>
          <div id="cat-drawer-questions" style="display: flex; flex-direction: column; gap: 6px;"></div>
          <div id="cat-drawer-answer" style="display: none; margin-top: 10px; background: rgba(56, 189, 248, 0.1); border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 8px; padding: 10px; font-size: 13px; line-height: 1.5; color: #e0f2fe;"></div>
        </div>

        <div style="border-top: 1px solid rgba(255, 255, 255, 0.12); padding-top: 10px; display: flex; flex-direction: column; gap: 8px;">
          <div style="font-size: 12px; font-weight: bold; color: #f59e0b; display: flex; align-items: center; gap: 6px;">
            <span>💬</span> TRÒ CHUYỆN TRỰC TIẾP VỚI MÈO (LIVE AI CHAT):
          </div>
          <div id="cat-chat-history" style="max-height: 130px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 8px; font-size: 12.5px;">
            <div style="color: #94a3b8; font-style: italic; font-size: 12px;">Hãy gửi tin nhắn hoặc giao việc cho chú mèo... Meo~</div>
          </div>
          <div style="display: flex; gap: 6px;">
            <input id="cat-chat-input" type="text" placeholder="Gõ tin nhắn cho mèo..." style="flex: 1; background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 170, 51, 0.4); border-radius: 8px; padding: 7px 10px; color: #ffffff; font-size: 12.5px; outline: none;"/>
            <button id="cat-chat-send-btn" style="background: #ffaa33; border: none; border-radius: 8px; padding: 0 12px; color: #0f172a; font-weight: bold; font-size: 12.5px; cursor: pointer; transition: all 0.2s;">
              Meo~
            </button>
          </div>
        </div>

        <button id="cat-drawer-assign-btn" style="background: linear-gradient(135deg, #f59e0b, #d97706); border: none; border-radius: 12px; padding: 10px; color: #ffffff; font-weight: bold; font-size: 13.5px; cursor: pointer; transition: all 0.2s; margin-top: 4px;">
          🐾 Giao Việc Mới Cho Chú Mèo Này
        </button>
      `;

      document.body.appendChild(drawer);

      document.getElementById('cat-drawer-close-btn')?.addEventListener('click', () => this.closeInspectorDrawer());
      document.getElementById('cat-drawer-assign-btn')?.addEventListener('click', () => {
        if (this.selectedCatId) this.assignTaskToCat(this.selectedCatId);
      });
      document.getElementById('cat-chat-send-btn')?.addEventListener('click', () => this.handleCatChatMessage());
      document.getElementById('cat-chat-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.handleCatChatMessage();
      });
    }
  }

  getBtnStyle(isActive) {
    return `
      background: ${isActive ? 'rgba(255, 170, 51, 0.2)' : 'rgba(255, 255, 255, 0.06)'};
      border: 1px solid ${isActive ? '#ffaa33' : 'rgba(255, 255, 255, 0.18)'};
      color: ${isActive ? '#ffaa33' : '#e2e8f0'};
      border-radius: 14px;
      padding: 6px 14px;
      font-size: 12.5px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s;
    `;
  }

  setViewMode(mode) {
    this.viewMode = mode;
    ['iso', 'orbit', 'fpp'].forEach((m) => {
      const btn = document.getElementById(`cat-btn-view-${m}`);
      if (btn) {
        const isAct = (mode === 'isometric' && m === 'iso') ||
                      (mode === 'auto_orbit' && m === 'orbit') ||
                      (mode === 'fpp' && m === 'fpp');
        btn.style.background = isAct ? 'rgba(255, 170, 51, 0.2)' : 'rgba(255, 255, 255, 0.06)';
        btn.style.borderColor = isAct ? '#ffaa33' : 'rgba(255, 255, 255, 0.18)';
        btn.style.color = isAct ? '#ffaa33' : '#e2e8f0';
      }
    });

    if (mode === 'isometric') {
      this.setCameraTarget(new THREE.Vector3(16, 15, 16), new THREE.Vector3(0, 0.8, 0));
    } else if (mode === 'fpp') {
      this.setCameraTarget(new THREE.Vector3(0, 1.4, 2.0), new THREE.Vector3(0, 0.8, 0));
    }
  }

  setCameraTarget(pos, target) {
    if (this.cameraManager?.setCustomView) {
      this.cameraManager.setCustomView(pos, target);
    } else if (this.camera) {
      this.camera.position.copy(pos);
      this.camera.lookAt(target);
    }
  }

  openInspectorDrawer(catData) {
    const drawer = document.getElementById('cat-inspector-drawer');
    if (!drawer || !catData) return;

    this.selectedCatId = catData.id;

    // Phát tiếng kêu Meo~ dễ thương
    catAudioSynthesizer.playMeow(catData.id === 'meo_trang' ? 1.25 : 1.0);

    // Zoom camera mượt mà về phía chú mèo được chọn
    const catObj = this.catObjects.find((c) => c.id === catData.id);
    if (catObj) {
      const p = catObj.group.position;
      this.setCameraTarget(
        new THREE.Vector3(p.x + 3.2, p.y + 2.4, p.z + 3.8),
        new THREE.Vector3(p.x, p.y + 0.9, p.z)
      );
    }

    const badge = document.getElementById('cat-drawer-badge');
    const nameEl = document.getElementById('cat-drawer-name');
    const breedEl = document.getElementById('cat-drawer-breed');
    const introEl = document.getElementById('cat-drawer-intro');
    const actionLogEl = document.getElementById('cat-drawer-action-log');
    const skillsContainer = document.getElementById('cat-drawer-skills');
    const questionsContainer = document.getElementById('cat-drawer-questions');
    const answerEl = document.getElementById('cat-drawer-answer');
    const chatHistory = document.getElementById('cat-chat-history');

    if (badge) {
      badge.style.background = `${catData.badgeColor}22`;
      badge.style.border = `1px solid ${catData.badgeColor}`;
      badge.style.color = catData.badgeColor;
      badge.textContent = catData.role;
    }
    if (nameEl) nameEl.textContent = catData.name;
    if (breedEl) breedEl.textContent = `${catData.breed} • Trạm: ${catData.homeStation}`;
    if (introEl) introEl.textContent = catData.intro;
    if (actionLogEl) actionLogEl.textContent = catData.actionLog || 'Đang thực thi nhiệm vụ trong làng di sản.';

    if (skillsContainer) {
      skillsContainer.innerHTML = '';
      (catData.skills || []).forEach((sk) => {
        const tag = document.createElement('span');
        tag.style.cssText = `
          display: inline-block; padding: 2px 8px; background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.2); border-radius: 10px; font-size: 11px;
        `;
        tag.textContent = sk;
        skillsContainer.appendChild(tag);
      });
    }

    if (questionsContainer && answerEl) {
      questionsContainer.innerHTML = '';
      answerEl.style.display = 'none';

      (catData.dialogs || []).forEach((item) => {
        const qBtn = document.createElement('button');
        qBtn.style.cssText = `
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,170,51,0.4);
          border-radius: 8px; padding: 6px 10px; color: #f1f5f9; text-align: left;
          font-size: 12.5px; cursor: pointer; transition: all 0.2s;
        `;
        qBtn.textContent = `💬 ${item.q}`;
        qBtn.onmouseover = () => { qBtn.style.background = 'rgba(255,170,51,0.2)'; };
        qBtn.onmouseout = () => { qBtn.style.background = 'rgba(255,255,255,0.06)'; };
        qBtn.onclick = () => {
          catAudioSynthesizer.playMeow(1.1);
          answerEl.style.display = 'block';
          answerEl.innerHTML = `<strong>🐾 ${catData.name}:</strong> ${item.a}`;
          if (catObj && typeof catObj.showThought === 'function') {
            catObj.showThought(item.a.length > 35 ? item.a.substring(0, 32) + '...' : item.a, 4.0);
          }
        };
        questionsContainer.appendChild(qBtn);
      });
    }

    // Reset lịch sử chat trực tiếp
    if (chatHistory) {
      chatHistory.innerHTML = `
        <div style="background: rgba(255,255,255,0.06); border-radius: 8px; padding: 6px 10px; color: #94a3b8; font-style: italic; font-size: 12px;">
          🐾 <strong>${catData.shortName.split('·')[0].trim()}:</strong> Meo~ Tri âm muốn trò chuyện hay giao việc gì cho tui nào?
        </div>
      `;
    }

    drawer.style.display = 'flex';
  }

  handleCatChatMessage() {
    const inputEl = document.getElementById('cat-chat-input');
    const chatHistory = document.getElementById('cat-chat-history');
    if (!inputEl || !chatHistory || !this.selectedCatId) return;

    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = '';

    const catData = CAT_AGENTS_DATA.find((c) => c.id === this.selectedCatId);
    if (!catData) return;

    // Phát âm thanh tiếng mèo kêu
    catAudioSynthesizer.playMeow(1.15);

    // Gắn tin nhắn người dùng
    const userMsg = document.createElement('div');
    userMsg.style.cssText = `
      align-self: flex-end; background: rgba(56, 189, 248, 0.2); border: 1px solid rgba(56, 189, 248, 0.4);
      border-radius: 8px; padding: 6px 10px; color: #e0f2fe; max-width: 85%; font-size: 12.5px;
    `;
    userMsg.textContent = text;
    chatHistory.appendChild(userMsg);
    chatHistory.scrollTop = chatHistory.scrollHeight;

    // Sinh phản hồi nhân vật mèo
    const lower = text.toLowerCase();
    let reply = '';

    if (lower.includes('giao việc') || lower.includes('nhiệm vụ') || lower.includes('làm việc') || lower.includes('chạy')) {
      reply = `Meo meo! Tuân lệnh tri âm! Tui đang chạy về trạm ${catData.homeStation} triển khai ngay đây!`;
      this.assignTaskToCat(catData.id);
    } else if (lower.includes('chào') || lower.includes('hello') || lower.includes('hi')) {
      reply = `Meo meo~ Chào bạn hiền! Hôm nay Đảo Mèo ngập tràn gió mát và hương hoa đào!`;
    } else if (lower.includes('cá') || lower.includes('ăn') || lower.includes('thức ăn')) {
      reply = `Meo! Suối xanh có cá bống tung tăng, nhưng tui phải canh giữ di sản xong mới đi câu cá được meo!`;
    } else if (lower.includes('bảo tàng') || lower.includes('sảnh') || lower.includes('di sản') || lower.includes('đông sơn')) {
      reply = `Meo~ Cuốn Sách Di Sản và Vòng Hào Quang Đông Sơn 14 tia sáng ở Đại Sảnh là tâm huyết của cả làng mèo tụi tui đó!`;
    } else if (lower.includes('fps') || lower.includes('lag') || lower.includes('mượt')) {
      reply = `Đừng lo meo! Tụi tui đã quét sạch NaN/Infinity, tối ưu InstancedMesh và userData.ignoreRaycaster, luôn giữ vững 60+ FPS!`;
    } else {
      const responses = {
        muop: 'Meo! Cả Swarm 6 chiến binh mèo luôn sẵn sàng! Cứ để Trưởng Làng điều phối phân công cho các bạn mèo!',
        tam_the: 'Meo~ Tui luôn đảm bảo lối đi dạo thông thoáng và không gian 3 lớp tiền cảnh - trung cảnh - hậu cảnh hài hòa!',
        meo_vang: 'Meo meo! Xưởng rèn của tui lúc nào cũng đỏ lửa, chuẩn hóa từng vertex chuẩn xác đến từng milimet!',
        meo_mun: 'Meo... Đèn lồng vàng ấm đã thắp sáng khắp lối. Ánh sáng Chiaroscuro sẽ dẫn lối tri âm qua đêm huyền diệu!',
        meo_trang: 'Meo meo~ Thiếp vừa gảy xong khúc đàn tranh Lưu Thủy Hành Vân. Tri âm có muốn nghe thiếp kể chuyện Vũ Nương không?',
        meo_xiem: 'Meo! Nghiêm! Vành đai đảo nổi được bảo vệ 100% bằng 16 Box3 Collider, an toàn tuyệt đối!'
      };
      reply = responses[catData.id] || `Meo meo! Tui nghe rõ rồi tri âm ơi! Cảm ơn bạn đã ghé thăm Đảo Mèo!`;
    }

    // Hiển thị bong bóng suy nghĩ trên mô hình 3D mèo
    const catObj = this.catObjects.find((c) => c.id === catData.id);
    if (catObj && typeof catObj.showThought === 'function') {
      catObj.showThought(reply.length > 35 ? reply.substring(0, 32) + '...' : reply, 4.0);
    }

    setTimeout(() => {
      catAudioSynthesizer.playMeow(1.2);
      const catMsg = document.createElement('div');
      catMsg.style.cssText = `
        align-self: flex-start; background: rgba(255, 170, 51, 0.15); border: 1px solid rgba(255, 170, 51, 0.4);
        border-radius: 8px; padding: 6px 10px; color: #ffedd5; max-width: 90%; font-size: 12.5px; line-height: 1.45;
      `;
      catMsg.innerHTML = `🐾 <strong>${catData.shortName.split('·')[0].trim()}:</strong> ${reply}`;
      chatHistory.appendChild(catMsg);
      chatHistory.scrollTop = chatHistory.scrollHeight;
    }, 240);
  }

  closeInspectorDrawer() {
    if (typeof document === 'undefined') return;
    const drawer = document.getElementById('cat-inspector-drawer');
    if (drawer) drawer.style.display = 'none';
    this.selectedCatId = null;
  }

  assignTaskToCat(catId) {
    const catObj = this.catObjects.find((c) => c.id === catId);
    if (!catObj) return;

    catAudioSynthesizer.playMeow(1.3);

    // Chú mèo chạy lon ton về trạm làm việc
    catObj.targetPos.copy(catObj.basePos);
    catObj.isWalking = true;

    const answerEl = document.getElementById('cat-drawer-answer');
    if (answerEl) {
      answerEl.style.display = 'block';
      answerEl.innerHTML = `<strong>✨ Mèo ${catObj.id} reo lên:</strong> "Meo meo! Tuân lệnh tri âm! Tui đang chạy về ${catObj.basePos.x < 0 ? 'nhà Tây' : 'nhà Đông'} làm việc ngay đây!"`;
    }
  }

  promptAssignRandomTask() {
    const randomCat = this.catObjects[Math.floor(Math.random() * this.catObjects.length)];
    if (randomCat) {
      const data = CAT_AGENTS_DATA.find((d) => d.id === randomCat.id);
      if (data) this.openInspectorDrawer(data);
    }
  }

  initEvents() {
    if (typeof window === 'undefined') return;

    const onPointerDown = (event) => {
      if (!this.group.visible || !this.isInsideVillage) return;

      // Không raycast nếu click trúng UI
      const topBar = document.getElementById('cat-village-top-bar');
      const drawer = document.getElementById('cat-inspector-drawer');
      if (topBar && topBar.contains(event.target)) return;
      if (drawer && drawer.contains(event.target)) return;

      this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      const activeCam = this.camera || this.cameraManager?.camera || (typeof window !== 'undefined' ? (window.__app?.camera || window.__camera) : null);
      if (!activeCam) return;
      this.raycaster.setFromCamera(this.mouse, activeCam);

      // 1. Kiểm tra click vào Cổng Làng
      if (this.portalMesh) {
        const portalHits = this.raycaster.intersectObject(this.portalMesh, true);
        if (portalHits.length > 0) {
          this.triggerReturnToLobby();
          return;
        }
      }

      // 2. Kiểm tra click vào Mèo
      const hits = this.raycaster.intersectObjects(this.interactiveHitboxes, true);
      if (hits.length > 0) {
        const catData = hits[0].object.userData.catData;
        if (catData) {
          this.openInspectorDrawer(catData);
        }
      }
    };

    window.addEventListener('pointerdown', onPointerDown);
    this._onPointerDown = onPointerDown;
  }

  triggerReturnToLobby() {
    const now = performance.now();
    if (this._isReturning || (this._lastReturnTime && now - this._lastReturnTime < 4500) || (this._lastEnterTime && now - this._lastEnterTime < 4500)) return;
    this._isReturning = true;
    this._lastReturnTime = now;

    console.log("%c[Cat Agent Village] Returning to Grand Lobby...", "color: #ffaa33; font-weight: bold;");
    this.closeInspectorDrawer();

    if (this.onReturnToLobby) {
      this.onReturnToLobby();
    } else if (typeof window !== 'undefined' && window.exitCatVillage) {
      window.exitCatVillage();
    }
  }

  showUI() {
    if (typeof document === 'undefined') return;
    const topBar = document.getElementById('cat-village-top-bar');
    if (topBar) topBar.style.display = 'flex';
  }

  hideUI() {
    if (typeof document === 'undefined') return;
    const topBar = document.getElementById('cat-village-top-bar');
    if (topBar) topBar.style.display = 'none';
    this.closeInspectorDrawer();
  }

  /**
   * VÒNG LẶP ANIMATION (ZERO ALLOCATION WEBGL 60+ FPS)
   */
  update(delta, elapsedTime, camera) {
    if (!this.group.visible) return;

    // 1. Kiểm tra cự ly tự động kích hoạt Cổng về Đại Sảnh (<= 2.0m, chỉ sau khi vào cõi > 4.5s)
    const now = performance.now();
    if (camera && this.portalMesh && (!this._lastEnterTime || now - this._lastEnterTime > 4500) && !this._isReturning) {
      this._vTmp1.set(0, 1.8, 8.2);
      if (camera.position.distanceTo(this._vTmp1) <= 2.0) {
        this.triggerReturnToLobby();
        return;
      }
    }

    // 2. Điều khiển Camera Orbit tự động nếu đang ở chế độ 'auto_orbit'
    if (this.viewMode === 'auto_orbit' && camera) {
      const radius = 18.0;
      const camX = Math.cos(elapsedTime * 0.12) * radius;
      const camZ = Math.sin(elapsedTime * 0.12) * radius;
      camera.position.set(camX, 13.0, camZ);
      camera.lookAt(0, 0.8, 0);
    }

    // 3. Hoạt ảnh tự trị của 6 chú mèo (Idle, Bounce, Tail Wag, Lon ton đi dạo, Thought Bubbles & Billboard)
    const catCount = this.catObjects.length;
    for (let i = 0; i < catCount; i++) {
      const cat = this.catObjects[i];
      const phase = elapsedTime * 3.2 + cat.phaseOffset;

      // A. Nhún nhảy theo nhịp thở (Idle bounce)
      cat.group.position.y = Math.sin(phase) * 0.04;

      // B. Đuôi uốn lượn vẫy liên tục (Tail wagging)
      if (cat.tailMesh) {
        cat.tailMesh.rotation.y = Math.sin(elapsedTime * 4.0 + cat.phaseOffset) * 0.35;
        cat.tailMesh.rotation.z = Math.cos(elapsedTime * 2.5 + cat.phaseOffset) * 0.15;
      }

      // C. Tai khẽ giật ngẫu nhiên (Ear twitching)
      if (Math.sin(elapsedTime * 0.8 + cat.phaseOffset) > 0.94) {
        cat.leftEar.rotation.z = 0.35 + Math.sin(elapsedTime * 25.0) * 0.15;
        cat.rightEar.rotation.z = -0.35 - Math.sin(elapsedTime * 25.0) * 0.15;
      }

      // D. Billboard Thẻ tên (Pill Badge) & Bong bóng suy nghĩ (Thought Bubble) luôn quay về Camera
      if (camera) {
        if (cat.pillBadge) cat.pillBadge.quaternion.copy(camera.quaternion);
        if (cat.thoughtBubble && cat.thoughtBubble.visible) cat.thoughtBubble.quaternion.copy(camera.quaternion);
      }

      // Xử lý thời gian hiển thị bong bóng suy nghĩ
      if (cat.bubbleTimer > 0) {
        cat.bubbleTimer -= delta;
        if (cat.bubbleTimer <= 0 && cat.thoughtBubble) {
          cat.thoughtBubble.visible = false;
          cat.headGroup.rotation.z = 0;
        }
      }

      // E. Hành vi di chuyển lon ton đi dạo
      cat.idleTimer -= delta;
      if (cat.idleTimer <= 0) {
        // Chọn điểm đích ngẫu nhiên trong bán kính quanh trạm
        const ang = Math.random() * Math.PI * 2;
        const dist = 1.5 + Math.random() * cat.wanderRadius;
        cat.targetPos.set(
          cat.basePos.x + Math.cos(ang) * dist,
          0,
          cat.basePos.z + Math.sin(ang) * dist
        );
        cat.isWalking = true;
        cat.idleTimer = 4.0 + Math.random() * 5.0;
      }

      if (cat.isWalking) {
        this._vTmp1.copy(cat.targetPos).sub(cat.group.position);
        const distToTarget = this._vTmp1.length();

        if (distToTarget > 0.3) {
          this._vTmp1.normalize();
          cat.group.position.addScaledVector(this._vTmp1, cat.moveSpeed * delta);
          cat.group.rotation.y = Math.atan2(this._vTmp1.x, this._vTmp1.z);

          // Nhịp bước chân lon ton
          const walkStep = Math.sin(elapsedTime * 14.0);
          cat.legFL.rotation.x = walkStep * 0.45;
          cat.legBR.rotation.x = walkStep * 0.45;
          cat.legFR.rotation.x = -walkStep * 0.45;
          cat.legBL.rotation.x = -walkStep * 0.45;
        } else {
          cat.isWalking = false;
          cat.legFL.rotation.x = 0;
          cat.legFR.rotation.x = 0;
          cat.legBL.rotation.x = 0;
          cat.legBR.rotation.x = 0;
        }
      }

      // F. Tương tác xã hội: Khi 2 chú mèo đi ngang qua nhau (< 1.8m), dừng lại chào hỏi
      for (let j = i + 1; j < catCount; j++) {
        const otherCat = this.catObjects[j];
        const distBetween = cat.group.position.distanceTo(otherCat.group.position);
        if (distBetween < 1.8) {
          // Dừng bước chân
          cat.isWalking = false;
          otherCat.isWalking = false;
          cat.legFL.rotation.x = 0;
          cat.legFR.rotation.x = 0;
          cat.legBL.rotation.x = 0;
          cat.legBR.rotation.x = 0;
          otherCat.legFL.rotation.x = 0;
          otherCat.legFR.rotation.x = 0;
          otherCat.legBL.rotation.x = 0;
          otherCat.legBR.rotation.x = 0;

          // Nghiêng đầu chào nhau
          cat.headGroup.rotation.z = 0.22;
          otherCat.headGroup.rotation.z = -0.22;

          // Vẫy đuôi nhanh phấn khích
          if (cat.tailMesh) cat.tailMesh.rotation.y = Math.sin(elapsedTime * 8.0) * 0.55;
          if (otherCat.tailMesh) otherCat.tailMesh.rotation.y = Math.sin(elapsedTime * 8.0 + 1.0) * 0.55;

          // Hiện bong bóng suy nghĩ nếu chưa hiện
          if (cat.bubbleTimer <= 0 && typeof cat.showThought === 'function') {
            cat.showThought();
          }
          if (otherCat.bubbleTimer <= 0 && typeof otherCat.showThought === 'function') {
            otherCat.showThought();
          }
        }
      }
    }

    // 4. Cập nhật các hiệu ứng nền (Vòng xoáy portal, đom đóm bờ suối)
    for (let k = 0; k < this.animatedObjects.length; k++) {
      const obj = this.animatedObjects[k];
      if (typeof obj.update === 'function') {
        obj.update(elapsedTime);
      } else if (obj.type === 'village_portal_vortex') {
        obj.mesh.rotation.z = elapsedTime * 1.4;
      } else if (obj.type === 'fireflies') {
        const posAttr = obj.system.geometry.attributes.position;
        const arr = posAttr.array;
        const phases = obj.phases;
        const count = phases.length;
        for (let f = 0; f < count; f++) {
          const yIdx = f * 3 + 1;
          arr[yIdx] += Math.sin(elapsedTime * 1.5 + phases[f]) * 0.006;
          if (arr[yIdx] > 5.5) arr[yIdx] = 0.5;
        }
        posAttr.needsUpdate = true;
      } else if (obj.type === 'river_ripples') {
        obj.mesh.position.y = 0.03 + Math.sin(elapsedTime * 1.8) * 0.008;
      } else if (obj.type === 'paw_glow_pulse') {
        if (obj.light) obj.light.intensity = 0.65 + Math.sin(elapsedTime * 2.5) * 0.35;
        if (obj.mesh?.material) obj.mesh.material.opacity = 0.75 + Math.sin(elapsedTime * 2.5) * 0.2;
      }
    }
  }

  /**
   * ĐĂNG KÝ BOX3 COLLIDERS BẢO VỆ VIỀN ĐẢO (~22m x 22m) & TRẠM LÀM VIỆC
   * Ứng dụng kỹ năng: hitbox-collision-architect
   */
  registerCatVillageColliders() {
    const hitboxMgr = getMuseumHitboxManager(this.scene);
    if (!hitboxMgr) return;

    // 1. Khóa 16 Box3 Colliders quanh viền đảo (~22m x 22m, R = 11.2m) chống rơi vực
    const perimeterSegments = 16;
    const boundaryRadius = 11.2;
    for (let i = 0; i < perimeterSegments; i++) {
      const angle = (i * 2 * Math.PI) / perimeterSegments;
      const bx = Math.cos(angle) * boundaryRadius;
      const bz = Math.sin(angle) * boundaryRadius;

      // Không đặt collider chắn ngay lối qua cổng dịch chuyển tại (0, 0, 8.2)
      if (Math.abs(bx) < 1.4 && bz > 6.8 && bz < 9.6) {
        continue;
      }

      const boundBox = new THREE.Box3(
        new THREE.Vector3(bx - 1.8, 0.0, bz - 1.8),
        new THREE.Vector3(bx + 1.8, 4.0, bz + 1.8)
      );
      hitboxMgr.registerSolidObjectCollider(null, {
        customBox: boundBox,
        tag: `Cat_Village_Boundary_${i}`,
        helperColor: 0xff0055,
        realm: 'cat_village'
      });
    }

    // 2. Box3 Collider cho các Trạm làm việc & Chướng ngại vật trên đảo
    // Hiên Mộc Bản Vẽ (-5.8, 0, 3.8)
    hitboxMgr.registerSolidObjectCollider(null, {
      customBox: new THREE.Box3(new THREE.Vector3(-6.8, 0.0, 2.8), new THREE.Vector3(-4.8, 2.4, 4.8)),
      tag: 'Cat_Station_HienMoc',
      helperColor: 0x00f5d4,
      realm: 'cat_village'
    });

    // Bếp Rèn & Bể Sóng (5.8, 0, 3.8)
    hitboxMgr.registerSolidObjectCollider(null, {
      customBox: new THREE.Box3(new THREE.Vector3(4.8, 0.0, 2.8), new THREE.Vector3(6.8, 2.4, 4.8)),
      tag: 'Cat_Station_BepRen',
      helperColor: 0xffbe55,
      realm: 'cat_village'
    });

    // Chòi Đèn Lồng (0, 0.4, -6.8)
    hitboxMgr.registerSolidObjectCollider(null, {
      customBox: new THREE.Box3(new THREE.Vector3(-1.4, 0.0, -7.8), new THREE.Vector3(1.4, 2.8, -5.8)),
      tag: 'Cat_Station_ChoiDenLong',
      helperColor: 0xfacc15,
      realm: 'cat_village'
    });

    // Chiếu Đàn Ven Suối (-5.0, 0, -2.5)
    hitboxMgr.registerSolidObjectCollider(null, {
      customBox: new THREE.Box3(new THREE.Vector3(-5.8, 0.0, -3.2), new THREE.Vector3(-4.2, 1.8, -1.8)),
      tag: 'Cat_Station_ChieuDan',
      helperColor: 0xec4899,
      realm: 'cat_village'
    });

    // 2 Trụ cào móng
    hitboxMgr.registerSolidObjectCollider(null, {
      customBox: new THREE.Box3(new THREE.Vector3(-3.5, 0.0, 1.5), new THREE.Vector3(-2.9, 1.8, 2.1)),
      tag: 'Cat_ScratchingPost_1',
      helperColor: 0xa855f7,
      realm: 'cat_village'
    });
    hitboxMgr.registerSolidObjectCollider(null, {
      customBox: new THREE.Box3(new THREE.Vector3(2.9, 0.0, -2.5), new THREE.Vector3(3.5, 1.8, -1.9)),
      tag: 'Cat_ScratchingPost_2',
      helperColor: 0xa855f7,
      realm: 'cat_village'
    });
  }

  dispose() {
    if (typeof window !== 'undefined' && this._onPointerDown) {
      window.removeEventListener('pointerdown', this._onPointerDown);
    }

    this.hideUI();

    if (typeof document !== 'undefined') {
      const topBar = document.getElementById('cat-village-top-bar');
      if (topBar && topBar.parentNode) topBar.parentNode.removeChild(topBar);

      const drawer = document.getElementById('cat-inspector-drawer');
      if (drawer && drawer.parentNode) drawer.parentNode.removeChild(drawer);
    }

    const hitboxMgr = getMuseumHitboxManager(this.scene);
    if (hitboxMgr) {
      hitboxMgr.clearRealmHitboxes('cat_village');
    }

    this.disposables.forEach((d) => {
      d?.traverse?.((c) => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          if (Array.isArray(c.material)) c.material.forEach((m) => m?.dispose?.());
          else c.material.dispose?.();
        }
      });
      if (d?.dispose) d.dispose();
    });

    this.disposables = [];
    this.animatedObjects = [];
    this.catObjects = [];
    this.interactiveHitboxes = [];

    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
    this.initialized = false;
    this.isInsideVillage = false;
    console.log("%c✓ Cat Agent Village World disposed cleanly.", "color: #888;");
  }
}

export default CatAgentVillageWorld;
