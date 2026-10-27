import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { registerInteractiveBook } from './PortalInteraction.js';

/**
 * ROOM DECORATOR MODULE: ĐẠI TU TOÀN DIỆN KHÔNG GIAN PHÒNG 01 - TRUYỆN KIỀU
 * SENIOR LIGHTING & ENVIRONMENT DIRECTOR
 * 
 * ĐỒNG BỘ KIẾN TRÚC & KHÔNG GIAN:
 * 1. PHỦ KÍN 100% SÀN GỖ LIM CỔ ĐIỂN (Y = 0.08) & THẢM LỤA ĐỎ CUNG ĐÌNH.
 * 
 * 2. CHIẾU SÁNG TRÀN NGẬP TOÀN BỘ KHÔNG GIAN PHÒNG 01 (GLOBAL AMBIENT & FILL ILLUMINATION):
 *    - Bù sáng toàn diện không gian: HemisphereLight & AmbientLight chuyên biệt cường độ 3.5.
 *      Màu bầu trời/trần nhà là sắc tím trầm sương mờ (#5C3D79), màu nền sàn là hổ phách ấm (#3A2215).
 *      Triệt tiêu hoàn toàn góc tối đen, bao phủ vách tường, cột gỗ và mặt sàn bằng lớp ánh sáng mờ ảo sang trọng.
 *    - Hệ thống 6 PointLight Fill Light dọc 2 bên vách tường: Màu vàng hổ phách pha tím nhạt (#E0A96D, intensity = 6.0, distance = 25.0, decay = 1.5).
 *    - Cột sáng God-Ray trung tâm: SpotLight Y = 14.0 rọi Bục Sách (intensity = 45.0, màu vàng nắng ấm pha hổ phách #FFBA38, castShadow = true, mapSize: 2048).
 *    - Khối trụ luồng sáng Volumetric Light Shaft (opacity: 0.25, THREE.AdditiveBlending).
 *    - 350 hạt bụi vàng kim phát sáng mạnh trải đều khắp thể tích phòng, bồng bềnh lấp lánh như bảo tàng nghệ thuật.
 *    - Kiểm soát Tone Mapping ACESFilmicToneMapping với exposure cân bằng (1.0), chống cháy sáng.
 * 
 * 3. BỐ CỤC 1:1 LIFE-SIZE CHÍNH GIỮA PHÒNG (CÁCH CAMERA 3.5M):
 *    - (Z = 0.0m) Bục gỗ & Cuốn Sách Truyện Kiều Mở Rộng 1.1m (sach_truyen_kieu.glb).
 *    - (Z = -2.5m) Án thư gỗ trắc bề thế 2.4m (an_thu.glb) & Đàn Tỳ Bà 1.25m (dan_ty_ba.glb).
 *    - (Z = -4.2m) Bình phong gỗ chạm hoa sen khổng lồ 5.0m x 3.2m (binh_phong.glb) che kín khoảng trống sau.
 *    - Dọc 2 bên tường: 2 hàng cột gỗ lim chạm trần, 4 bình gốm cổ 1.6m, và 2 cây hoa đào cổ thụ cao 3.8m.
 */

export class RoomDecorator {
  constructor(materialLibrary = null, options = {}) {
    this.matLib = materialLibrary;
    this.roomId = options.roomId || 'truyen_kieu';
    this.renderer = options.renderer || null;

    // Kiểm soát Tone Mapping tránh cháy sáng
    if (this.renderer) {
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.0;
    }

    // Tọa độ tâm Phòng 01 (Tầng 2 - Tây-Nam)
    this.origin = options.origin ?? new THREE.Vector3(-48.0, 10.0, 19.0);
    this.rotationY = options.rotationY ?? (Math.PI * 0.5);

    this.group = new THREE.Group();
    this.group.name = `Room01_TruyenKieu_${this.roomId}`;

    // Đặt vị trí và góc xoay hướng tâm cho Phòng 01
    this.group.position.set(this.origin.x, this.origin.y, this.origin.z);
    this.group.rotation.y = this.rotationY;

    // Các nhóm con
    this.floorGroup = new THREE.Group();
    this.floorGroup.name = "Kieu_Grand_Floor_Group";
    this.group.add(this.floorGroup);

    this.architectureGroup = new THREE.Group();
    this.architectureGroup.name = "Kieu_Colonnade_Walls_Group";
    this.group.add(this.architectureGroup);

    this.modelsGroup = new THREE.Group();
    this.modelsGroup.name = "Kieu_LifeSize_Models_Group";
    this.group.add(this.modelsGroup);

    this.particlesGroup = new THREE.Group();
    this.particlesGroup.name = "Kieu_Petals_Dust_VFX_Group";
    this.group.add(this.particlesGroup);

    this.lightsGroup = new THREE.Group();
    this.lightsGroup.name = "Kieu_Atmospheric_Lights_Group";
    this.group.add(this.lightsGroup);

    this.skylightGroup = new THREE.Group();
    this.skylightGroup.name = "Kieu_Skylight_GodRays_Group";
    this.group.add(this.skylightGroup);

    this.gltfLoader = new GLTFLoader();
    this.dioramaLights = [];

    // Trạng thái các model
    this.bookModel = null;
    this.deskModel = null;
    this.luteModel = null;
    this.screenModel = null;
    this.deskTopY = 0.98; // Cao độ mặt bàn thực tế

    // Hệ thống hạt bụi vàng kim phát sáng mạnh trải khắp thể tích phòng
    this.particles = null;
    this.particleData = [];
    this.particleCount = 90;

    // HỆ THỐNG VFX & TECH ART ĐIỆN ẢNH PHÒNG TRUYỆN KIỀU:
    // 1. Cánh hoa đào rơi (60 cánh hoa đào hồng phấn - tối ưu dưới 300 hạt)
    this.peachPetals = null;
    this.petalData = [];
    this.petalCount = 60;

    // 2. Bụi vàng God-Ray lấp lánh (90 hạt bụi vàng hoàng gia)
    this.goldDustParticles = null;
    this.goldDustData = [];
    this.goldDustCount = 90;

    // 3. Sương mù mặt sàn & Khói trầm bàn án thư
    this.groundMistPlanes = [];
    this.incenseSmoke = null;
    this.incenseSmokeData = [];
    this.incenseSmokeCount = 28;

    // 4. Vòng thơ thư pháp phát sáng bay lượn quanh bục sách
    this.calligraphyRing = null;

    // 5. Ánh sáng động: Đèn lồng đung đưa & nến/đèn rọi thở/nhấp nháy
    this.lanternItems = [];
    this.flickerLights = [];

    // Trạng thái luồng sáng God-Rays
    this.godRayShaftGroup = null;
    this.godRayCoreMat = null;
    this.godRayOuterMat = null;
    this.godRayMistMat = null;
    this.godRayFinMat = null;

    try {
      // 1. Phủ kín 100% diện tích sàn gỗ lim (Y=0.08) và thảm lụa hoàng gia
      this.initCompleteRoomFloor();

      // 2. Dựng kiến trúc hàng cột gỗ lim, bình gốm cổ và cây đào thế
      this.initSideArchitecturalFeatures();

      // 3. Chiếu sáng tràn ngập toàn bộ không gian phòng: Hemisphere/Ambient 3.5, 6 PointLights vách tường, SpotLight 45.0
      this.initAtmosphericLighting();

      // 3.1. Dựng vòm giếng trời kiến trúc & khối trụ luồng sáng Volumetric God-Rays (opacity: 0.25)
      this.initSkylightAndGodRays();

      // 4. Nạp các mô hình thật 1:1 qua Blender GLTF
      this.initMasterpieceModels();

      // 5. Khởi tạo 350 hạt bụi vàng phát sáng mạnh trải đều khắp thể tích phòng
      this.initPetalsAndDustVfx();

      // 5.1. Thiết lập Tech Art & Cinematic Extras (Đàn Tỳ Bà, Non Nước Tràng An, Mưa Hoa Đào, Trăng Thề)
      setupTruyenKieuCinematicExtras(this.group);

      // 5.2. ĐẠI TU TOÀN DIỆN PHÒNG 01 - TRUYỆN KIỀU (CHUẨN ĐIỆN ẢNH Á ĐÔNG)
      overhaulTruyenKieuRoom(this.group);

      // 5.3. Lát sàn gỗ lim Đông Dương & chống cháy sáng phòng 01
      fixFloorAndLightingRoom01(this.group, null, this.renderer, null);

      // 5.4. DỌN DẸP VẬT CẢN TẦM NHÌN & TÍCH HỢP MODEL GLB MỚI VÀO TRUNG TÂM PHÒNG TRUYỆN KIỀU
      redesignTruyenKieuWithHeroModel(this.group);

      this.onModelLoaded = () => {
        overhaulTruyenKieuRoom(this.group);
        fixFloorAndLightingRoom01(this.group, null, this.renderer, null);
        redesignTruyenKieuWithHeroModel(this.group);
      };

      // 6. Cách ly toàn bộ không gian phòng vào THREE.Layers(1)
      this.applyLayerOneIsolation();

      console.log("%c✓ RoomDecorator: Đã kích hoạt Chiếu Sáng Tràn Ngập & 350 Hạt Bụi Vàng Toàn Không Gian Phòng 01!", "color: #39e58c; font-weight: bold;");
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo RoomDecorator:", err);
    }
  }

  getGroup() {
    return this.group;
  }

  getBookMesh() {
    return this.bookModel;
  }

  sanitizeGeometry(geo) {
    if (!geo) return;
    try {
      geo.computeVertexNormals?.();
      geo.computeBoundingBox?.();
      geo.computeBoundingSphere?.();

      ['position', 'normal', 'uv'].forEach(attrName => {
        const attr = geo.attributes?.[attrName];
        if (attr?.array) {
          let dirty = false;
          for (let i = 0; i < attr.array.length; i++) {
            if (!Number.isFinite(attr.array[i])) {
              attr.array[i] = attrName === 'normal' && (i % 3 === 1) ? 1.0 : 0.0;
              dirty = true;
            }
          }
          if (dirty) attr.needsUpdate = true;
        }
      });
    } catch (err) {
      console.warn("[SELF-HEALING] Error sanitizing geometry:", err);
    }
  }

  /**
   * TIÊU DIỆT HOÀN TOÀN LIGHT HELPER & MESH BÓNG ĐÈN ẢO (Senior Lighting Director)
   * Quét và xóa bỏ triệt để:
   * 1. Mọi PointLightHelper, SpotLightHelper, DirectionalLightHelper, HemisphereLightHelper
   * 2. Mọi Mesh hình cầu/hình trụ làm bóng đèn ảo hoặc có tên chứa Bulb/Helper
   * 3. Mọi Mesh là con trực tiếp của nguồn sáng THREE.Light
   * Đèn chỉ là nguồn sáng vô hình, tuyệt đối không được lộ khối hình học phát sáng gây ra các đốm tím dưới sàn.
   */
  purgeLightHelpers(root = this.group) {
    if (!root) return;
    const helpersToRemove = [];
    root.traverse((child) => {
      // 1. Kiểm tra instance hoặc cờ helper
      if (
        child.isLightHelper ||
        child instanceof THREE.PointLightHelper ||
        child instanceof THREE.SpotLightHelper ||
        child instanceof THREE.DirectionalLightHelper ||
        child instanceof THREE.HemisphereLightHelper
      ) {
        helpersToRemove.push(child);
        return;
      }

      // 2. Kiểm tra tên bóng đèn ảo hoặc helper
      if (child.name && typeof child.name === 'string') {
        const lower = child.name.toLowerCase();
        if (
          lower.includes('lighthelper') ||
          lower.includes('pointlighthelper') ||
          lower.includes('spotlighthelper') ||
          lower.includes('virtualbulb') ||
          lower.includes('fakebulb') ||
          lower.includes('bulbmesh')
        ) {
          helpersToRemove.push(child);
          return;
        }
      }

      // 3. Kiểm tra Mesh bóng đèn ảo gắn vào nguồn sáng
      if (child.isMesh && child.parent instanceof THREE.Light) {
        helpersToRemove.push(child);
        return;
      }
    });

    helpersToRemove.forEach((h) => {
      if (h.parent) h.parent.remove(h);
      h.geometry?.dispose?.();
      if (h.material) {
        if (Array.isArray(h.material)) h.material.forEach(m => m?.dispose?.());
        else h.material?.dispose?.();
      }
      h.dispose?.();
    });
  }

  applyLayerOneIsolation() {
    this.purgeLightHelpers(this.group);

    this.group.traverse((child) => {
      child.layers.set(1);
      if (child.isMesh) {
        // Bật Frustum Culling để không render mô hình ngoài góc nhìn camera
        child.frustumCulled = true;

        // TỐI ƯU HÓA BÓNG ĐỔ: Giới hạn chỉ bật castShadow cho các vật thể quan trọng
        const name = child.name || '';
        const parentName = child.parent?.name || '';
        const isVolumetric = name.includes('GodRay') || name.includes('GlassDisc') || name.includes('Oculus') || name.includes('Fin');

        if (isVolumetric) {
          child.castShadow = false;
          child.receiveShadow = false;
        } else {
          const isMajorProp = name.includes('Desk') || name.includes('an_thu') ||
                              name.includes('Screen') || name.includes('binh_phong') ||
                              name.includes('Book') || name.includes('sach_truyen_kieu') ||
                              name.includes('Dais') || name.includes('Lotus') ||
                              name.includes('Col') || parentName.includes('Colonnade');
          child.castShadow = !!isMajorProp;
          child.receiveShadow = true;
        }
      }
    });

    this.dioramaLights.forEach(item => {
      item.light.layers.set(1);
    });
  }

  /**
   * BẬT/TẮT HỆ THỐNG ÁNH SÁNG & VFX THEO ZONE (TỐI ƯU HÓA FPS)
   */
  setLightsActive(active) {
    if (this.lightsActive === active) return;
    this.lightsActive = active;
    if (this.lightsGroup) this.lightsGroup.visible = active;
    if (this.skylightGroup) this.skylightGroup.visible = active;
    if (this.particles) this.particles.visible = active;
  }

  /**
   * GOM CÁC BỨC TƯỜNG BIÊN PHÒNG 01 (LẦU NGƯNG BÍCH) VÀO HỆ THỐNG VA CHẠM
   * CẤM TUYỆT ĐỐI đưa các mô hình trang trí (cây đào, bình gốm, đèn lồng, bàn ghế án thư, bục sách) vào va chạm.
   */
  getCollisionObjects() {
    const walls = [];
    if (this.architectureGroup) {
      this.architectureGroup.traverse((child) => {
        if (child.isMesh && child.name && child.name.includes('Room01_WallWoodCover')) {
          walls.push(child);
        }
      });
    }
    return walls;
  }

  /**
   * 1. PHỦ SÀN GỖ LIM TRẦM KÍN 100% CĂN PHÒNG (Y = 0.08) & THẢM LỤA ĐỎ:
   * - Rộng 26.2m, Sâu 29.0m, dày 8cm, che phủ tuyệt đối từ cửa vòm (Z = +14.4m) đến mép lan can (Z = -14.6m).
   * - Triệt tiêu 100% vệt đen Z-fighting.
   * - Dải thảm lụa đỏ thêu hoa văn vàng kim rộng 3.4m chạy từ cửa phòng đến trung tâm.
   * - Bệ thảm tròn hoa sen (đường kính 4.8m) cao Y = 0.13m.
   */
  initCompleteRoomFloor() {
    // A. Sàn Gỗ Lim Trầm Toàn Phòng (Rộng 26.2m x Sâu 29.0m, Dày 0.08m)
    // Tâm Z đặt tại -0.1m để phủ từ Z = +14.4m đến Z = -14.6m
    const floorGeo = new THREE.BoxGeometry(26.2, 0.08, 29.0);
    this.sanitizeGeometry(floorGeo);

    // Canvas tạo Texture ván gỗ lim trầm cổ điển với đường ghép tinh xảo
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Nền gỗ lim nâu trầm ấm áp tự nhiên (#422818)
    ctx.fillStyle = '#422818';
    ctx.fillRect(0, 0, 1024, 1024);

    // Mạch ván gỗ ghép dọc
    for (let x = 0; x < 1024; x += 64) {
      ctx.fillStyle = '#22120B';
      ctx.fillRect(x, 0, 3, 1024);
      // Ánh gỗ phản chiếu ấm ở bề mặt ván
      ctx.fillStyle = 'rgba(92, 56, 34, 0.45)';
      ctx.fillRect(x + 3, 0, 58, 1024);
    }
    // Vân thớ gỗ tự nhiên
    for (let i = 0; i < 60; i++) {
      const y = Math.random() * 1024;
      ctx.strokeStyle = 'rgba(40, 22, 12, 0.35)';
      ctx.lineWidth = 1 + Math.random() * 2.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y + (Math.random() - 0.5) * 12);
      ctx.stroke();
    }

    const woodTexture = new THREE.CanvasTexture(canvas);
    woodTexture.wrapS = THREE.RepeatWrapping;
    woodTexture.wrapT = THREE.RepeatWrapping;
    woodTexture.repeat.set(8, 8);

    const woodFloorMat = new THREE.MeshStandardMaterial({
      color: 0x5C3A21,
      map: woodTexture,
      roughness: 0.22, // Tinh chỉnh độ bóng satin cao cấp "Long lanh đáy nước in trời"
      metalness: 0.15,
      side: THREE.DoubleSide,
      bumpMap: woodTexture,
      bumpScale: 0.003,
      envMapIntensity: 2.0
    });

    // Cho phép ánh sáng từ dàn đèn âm sàn (Y = -0.3m) hắt ngược lên bề mặt sàn gỗ một cách mượt mà tự nhiên
    woodFloorMat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );',
        'float dotNL = saturate( dot( geometryNormal, directLight.direction ) + 0.35 );'
      );
    };

    const floorMesh = new THREE.Mesh(floorGeo, woodFloorMat);
    floorMesh.name = "Room01_Full_LimWood_Floor";
    floorMesh.position.set(0, 0.04, -0.1); // Mặt trên đúng tại Y = 0.08m
    floorMesh.receiveShadow = true;
    floorMesh.layers.set(1);

        // Dedicated floor illumination (DirectionalLight) to brighten the wooden floor
        const floorLight = new THREE.DirectionalLight(0xFFFFFF, 8.0);
        floorLight.name = "Kieu_Floor_DirectionalLight";
        floorLight.position.set(0, 10.0, 0);
        floorLight.target.position.set(0, 0, 0);
        floorLight.layers.set(1);
        this.lightsGroup.add(floorLight);
        this.lightsGroup.add(floorLight.target);
    this.floorGroup.add(floorMesh);

    // B. Dải thảm lụa đỏ thêu hoa văn vàng kim (Rộng 3.4m, Dài 18.0m)
    // Chạy từ mép cửa (Z = +14.2m) vào tới bục sách và án thư (Z = -3.8m)
    const runnerGeo = new THREE.BoxGeometry(3.4, 0.01, 18.0);
    this.sanitizeGeometry(runnerGeo);

    const runnerCanvas = document.createElement('canvas');
    runnerCanvas.width = 512;
    runnerCanvas.height = 1024;
    const rctx = runnerCanvas.getContext('2d');

    // Nền lụa đỏ hoàng gia
    rctx.fillStyle = '#421219';
    rctx.fillRect(0, 0, 512, 1024);

    // Dải viền vàng kim 2 bên thảm
    rctx.fillStyle = '#D4AF37';
    rctx.fillRect(16, 0, 20, 1024);
    rctx.fillRect(512 - 36, 0, 20, 1024);

    rctx.strokeStyle = 'rgba(212, 175, 55, 0.7)';
    rctx.lineWidth = 4;
    rctx.beginPath();
    rctx.moveTo(48, 0); rctx.lineTo(48, 1024);
    rctx.moveTo(512 - 48, 0); rctx.lineTo(512 - 48, 1024);
    rctx.stroke();

    // Họa tiết hoa văn cung đình lặp lại dọc tâm thảm
    rctx.fillStyle = 'rgba(212, 175, 55, 0.25)';
    for (let y = 64; y < 1024; y += 128) {
      rctx.beginPath();
      rctx.arc(256, y, 36, 0, Math.PI * 2);
      rctx.fill();
    }

    const runnerTexture = new THREE.CanvasTexture(runnerCanvas);
    runnerTexture.wrapS = THREE.ClampToEdgeWrapping;
    runnerTexture.wrapT = THREE.RepeatWrapping;
    runnerTexture.repeat.set(1, 4);

    const runnerMat = new THREE.MeshStandardMaterial({
      map: runnerTexture,
      roughness: 0.35,
      metalness: 0.15
    });

    runnerMat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        'float dotNL = saturate( dot( geometryNormal, directLight.direction ) );',
        'float dotNL = saturate( dot( geometryNormal, directLight.direction ) + 0.35 );'
      );
    };

    const runnerMesh = new THREE.Mesh(runnerGeo, runnerMat);
    runnerMesh.name = "Room01_Imperial_Silk_Runner";
    runnerMesh.position.set(0, 0.085, 5.2); // Nằm trên sàn gỗ, từ Z = -3.8 đến Z = +14.2m
    runnerMesh.receiveShadow = true;
    runnerMesh.layers.set(1);
    this.floorGroup.add(runnerMesh);

    // C. Bệ thảm tròn hoa sen trung tâm (Đường kính 4.8m, Cao Y = 0.13m)
    const daisGeo = new THREE.CylinderGeometry(2.40, 2.48, 0.05, 48);
    this.sanitizeGeometry(daisGeo);

    const daisCanvas = document.createElement('canvas');
    daisCanvas.width = 512;
    daisCanvas.height = 512;
    const dctx = daisCanvas.getContext('2d');

    dctx.fillStyle = '#3a131a';
    dctx.fillRect(0, 0, 512, 512);

    dctx.save();
    dctx.translate(256, 256);
    dctx.strokeStyle = '#D4AF37';
    dctx.lineWidth = 8;
    dctx.beginPath();
    dctx.arc(0, 0, 240, 0, Math.PI * 2);
    dctx.stroke();

    dctx.lineWidth = 3;
    dctx.beginPath();
    dctx.arc(0, 0, 226, 0, Math.PI * 2);
    dctx.stroke();

    // 8 Cánh hoa sen thếp vàng
    dctx.strokeStyle = 'rgba(212, 175, 55, 0.8)';
    dctx.lineWidth = 3.5;
    for (let p = 0; p < 8; p++) {
      const rot = (p * Math.PI) / 4;
      dctx.save();
      dctx.rotate(rot);
      dctx.beginPath();
      dctx.moveTo(0, -60);
      dctx.quadraticCurveTo(40, -125, 0, -180);
      dctx.quadraticCurveTo(-40, -125, 0, -60);
      dctx.fillStyle = 'rgba(212, 175, 55, 0.18)';
      dctx.fill();
      dctx.stroke();
      dctx.restore();
    }
    dctx.fillStyle = '#D4AF37';
    dctx.beginPath();
    dctx.arc(0, 0, 32, 0, Math.PI * 2);
    dctx.fill();
    dctx.restore();

    const daisTexture = new THREE.CanvasTexture(daisCanvas);
    const daisMat = new THREE.MeshStandardMaterial({
      map: daisTexture,
      roughness: 0.35,
      metalness: 0.30
    });

    const daisMesh = new THREE.Mesh(daisGeo, daisMat);
    daisMesh.name = "Room01_Lotus_Grand_Dais";
    daisMesh.position.set(0, 0.105, 0.0); // Mặt trên đúng tại Y = 0.13m
    daisMesh.receiveShadow = true;
    daisMesh.castShadow = true;
    daisMesh.layers.set(1);
    this.floorGroup.add(daisMesh);

    // Vành đai mạ vàng bo quanh bệ
    const rimGeo = new THREE.TorusGeometry(2.45, 0.025, 16, 64);
    this.sanitizeGeometry(rimGeo);
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xD4AF37,
      roughness: 0.20,
      metalness: 0.88
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.set(0, 0.125, 0.0);
    rimMesh.layers.set(1);
    this.floorGroup.add(rimMesh);
  }

  /**
   * 2. KIẾN TRÚC DỌC HAI BÊN TƯỜNG (CỘT GỖ LIM CHẠM TRẦN, CÂY ĐÀO THẾ & BÌNH GỐM):
   * - 2 hàng cột gỗ lim cao 8.0m chạm trần với chân đế và đai vàng hoàng gia.
   * - 2 cây hoa đào cổ thụ cao 3.8m tạo bóng mát thơ mộng.
   * - Ốp tấm vách gỗ trầm trang trí lên 2 bức tường ngăn để loại bỏ hoàn toàn vẻ xám xịt.
   */
  initSideArchitecturalFeatures() {
    const colWoodMat = new THREE.MeshStandardMaterial({
      color: 0x2b150c,
      roughness: 0.32,
      metalness: 0.08
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xD4AF37,
      roughness: 0.22,
      metalness: 0.88
    });

    // Cột gỗ lim cao 8.0m, đường kính 0.55m
    const colGeo = new THREE.CylinderGeometry(0.26, 0.28, 8.0, 24);
    this.sanitizeGeometry(colGeo);

    const baseGeo = new THREE.CylinderGeometry(0.36, 0.40, 0.35, 16);
    this.sanitizeGeometry(baseGeo);

    const ringGeo = new THREE.TorusGeometry(0.28, 0.02, 12, 24);
    this.sanitizeGeometry(ringGeo);

    // Tọa độ 8 vị trí cột dọc 2 bên vách (X = +-11.2m, Z = +10, +4, -2, -8)
    const colZPositions = [10.0, 4.0, -2.0, -8.0];
    [-11.2, 11.2].forEach(colX => {
      colZPositions.forEach((colZ, idx) => {
        const colGroup = new THREE.Group();
        colGroup.name = `Colonnade_${colX > 0 ? 'Right' : 'Left'}_${idx}`;
        colGroup.position.set(colX, 4.08, colZ); // Đáy cột đặt trên sàn Y=0.08m

        const colMesh = new THREE.Mesh(colGeo, colWoodMat);
        colMesh.castShadow = true;
        colMesh.receiveShadow = true;
        colGroup.add(colMesh);

        // Chân đế đá bọc đồng
        const baseMesh = new THREE.Mesh(baseGeo, goldMat);
        baseMesh.position.y = -3.82;
        colGroup.add(baseMesh);

        // Đai vàng trang trí giữa thân cột
        const ringMesh = new THREE.Mesh(ringGeo, goldMat);
        ringMesh.rotation.x = Math.PI / 2;
        ringMesh.position.y = 0.0;
        colGroup.add(ringMesh);

        colGroup.traverse(c => c.layers.set(1));
        this.architectureGroup.add(colGroup);
      });
    });

    // Ốp vách gỗ trang trí Indochine lên 2 bức tường ngăn (X = +-12.9m)
    // Tăng độ dày lên 0.5m làm lớp cản vật lý vững chắc chống xuyên tường
    const wallPanelGeo = new THREE.BoxGeometry(0.5, 7.8, 28.5);
    this.sanitizeGeometry(wallPanelGeo);

    [-12.94, 12.94].forEach(wx => {
      const wallPanel = new THREE.Mesh(wallPanelGeo, colWoodMat);
      wallPanel.name = `Room01_WallWoodCover_${wx > 0 ? 'Right' : 'Left'}`;
      wallPanel.position.set(wx, 4.0, -0.1);
      wallPanel.receiveShadow = true;
      wallPanel.layers.set(1);
      this.architectureGroup.add(wallPanel);
    });
  }

  /**
   * 3. CHIẾU SÁNG TRÀN NGẬP TOÀN BỘ KHÔNG GIAN PHÒNG 01 (GLOBAL AMBIENT & FILL ILLUMINATION):
   * 1. Bù sáng toàn diện không gian:
   *    - Tăng cường độ HemisphereLight và AmbientLight chuyên biệt lên mức intensity = 3.5.
   *    - Phối màu ánh sáng nền: Màu bầu trời/trần nhà là sắc tím trầm sương mờ (#5C3D79), màu nền sàn là hổ phách ấm (#3A2215).
   *    - Bao phủ vách tường, cột gỗ và mặt sàn bằng một lớp ánh sáng mờ ảo, nhìn rõ toàn cảnh đại sảnh.
   * 2. Hệ thống đèn Fill Light dọc 2 bên vách tường:
   *    - 6 nguồn PointLight công suất vừa (intensity = 6.0, distance = 25.0, decay = 1.5) đặt ẩn sát dọc 2 bên vách trái/phải.
   *    - Màu sắc: Vàng hổ phách pha tím nhạt (#E0A96D), giúp toàn bộ chiều dài căn phòng bừng sáng, không bị tối ở hai bên cánh gà.
   * 3. Cột sáng trung tâm (God-Ray Main Light):
   *    - SpotLight trần cao Y = 14.0 rọi xuống Bục Sách ở giữa: Màu vàng nắng ấm pha hổ phách (#FFBA38, intensity = 45.0, distance = 32.0).
   *    - Bật castShadow = true, shadow.mapSize = 2048x2048.
   */
  initAtmosphericLighting() {
    this.lightsGroup.clear();

    // Điểm tâm rọi thẳng Bục Sách Truyện Kiều tại giữa phòng (Y = 0.13m)
    const skylightTarget = new THREE.Object3D();
    skylightTarget.name = "Kieu_Skylight_Center_Target";
    skylightTarget.position.set(0, 0.13, 0.0);
    this.lightsGroup.add(skylightTarget);

    // 1. CỘT SÁNG TRUNG TÂM (God-Ray Main Light - Sắc vàng nắng nhẹ nhàng dịu mắt #FFE6A7):
    // SpotLight màu vàng nắng nhẹ (#FFE6A7), intensity = 45.0, distance = 32.0 đặt tại Y = 14.0
    const goldenSunlitAmber = new THREE.Color(0xFFE6A7); // Sắc vàng nắng nhẹ nhàng (#FFE6A7)

    const skylightSpot = new THREE.SpotLight(goldenSunlitAmber, 45.0, 32.0, Math.PI / 4.4, 0.45, 1.15);
    skylightSpot.name = "Kieu_Celestial_Skylight_SpotLight";
    skylightSpot.position.set(0, 14.0, 0.0);
    skylightSpot.target = skylightTarget;

    skylightSpot.castShadow = false; // Tối ưu hóa: Đèn trần lan tỏa, không cần đổ bóng nặng
    skylightSpot.layers.set(1);
    this.lightsGroup.add(skylightSpot);

    // Luồng sáng phụ trợ ánh trăng xanh sương mờ (#9A8C98) rọi nhẹ từ trần cao
    const moonlightRimLight = new THREE.DirectionalLight(0x9A8C98, 4.0);
    moonlightRimLight.name = "Kieu_Moonlight_Mist_Directional";
    moonlightRimLight.position.set(0.3, 14.0, -0.3);
    moonlightRimLight.target = skylightTarget;
    moonlightRimLight.castShadow = false;
    moonlightRimLight.layers.set(1);
    this.lightsGroup.add(moonlightRimLight);

    // 2. BÙ SÁNG TOÀN DIỆN KHÔNG GIAN (Global Ambient & Fill Illumination - intensity = 3.5):
    // Không để góc phòng và trần bị đen kịt; bầu trời/trần là tím trầm sương mờ (#5C3D79), nền sàn là hổ phách ấm (#3A2215)
    const ambientSky = new THREE.AmbientLight(0x5C3D79, 3.5);
    ambientSky.name = "Kieu_Ambient_GlobalIllumination";
    ambientSky.layers.set(1);
    this.lightsGroup.add(ambientSky);

    const hemiNocturne = new THREE.HemisphereLight(0x5C3D79, 0x3A2215, 3.5);
    hemiNocturne.name = "Kieu_Hemisphere_GlobalIllumination";
    hemiNocturne.layers.set(1);
    this.lightsGroup.add(hemiNocturne);

    // Golden SpotLight rọi trực diện Cuốn Sách Truyện Kiều (#FFB703 - Vàng hổ phách rực rỡ, intensity = 15.0)
    const bookSpot = new THREE.SpotLight(0xFFB703, 15.0, 20.0, Math.PI / 4.5, 0.65, 1.8);
    bookSpot.name = "Kieu_Book_Key_SpotLight";
    bookSpot.position.set(0, 7.5, 1.5);
    bookSpot.target = skylightTarget;

    bookSpot.castShadow = false; // Tối ưu hóa: Không sinh thêm pass đổ bóng thứ 2
    bookSpot.layers.set(1);
    this.lightsGroup.add(bookSpot);

    // Fill SpotLight chiếu Án Thư, Đàn Tỳ Bà & Bình Phong (#FFB703 - Vàng hổ phách cung đình)
    const deskSpot = new THREE.SpotLight(0xFFB703, 6.0, 20.0, Math.PI / 4.0, 0.7, 1.8);
    deskSpot.name = "Kieu_Desk_Fill_SpotLight";
    deskSpot.position.set(0, 7.8, -1.2);

    const deskTarget = new THREE.Object3D();
    deskTarget.position.set(0, 1.0, -3.2);
    this.lightsGroup.add(deskTarget);
    deskSpot.target = deskTarget;

    deskSpot.castShadow = false;
    deskSpot.shadow.bias = -0.002;
    deskSpot.shadow.normalBias = 0.03;
    deskSpot.layers.set(1);
    this.lightsGroup.add(deskSpot);

    // Door SpotLight chiếu lối vào & thảm đỏ (#E0A96D - Vàng hổ phách pha tím nhạt)
    const doorSpot = new THREE.SpotLight(0xE0A96D, 4.5, 18.0, Math.PI / 3.8, 0.7, 1.8);
    doorSpot.name = "Kieu_Entrance_SpotLight";
    doorSpot.position.set(0, 7.5, 9.0);

    const doorTarget = new THREE.Object3D();
    doorTarget.position.set(0, 0.1, 7.0);
    this.lightsGroup.add(doorTarget);
    doorSpot.target = doorTarget;
    doorSpot.layers.set(1);
    this.lightsGroup.add(doorSpot);

    // Đăng ký các nguồn đèn rọi ấm vào hệ thống ánh sáng động (breathing/flicker)
    this.flickerLights.push(
      { light: bookSpot, baseIntensity: 15.0, speed: 2.2, phase: 0.5 },
      { light: deskSpot, baseIntensity: 6.0, speed: 2.8, phase: 1.8 },
      { light: doorSpot, baseIntensity: 4.5, speed: 2.5, phase: 3.2 }
    );

    // 3. HỆ THỐNG 6 NGUỒN POINTLIGHT FILL LIGHT DỌC HAI BÊN VÁCH TƯỜNG:
    // Màu sắc: Vàng hổ phách pha tím nhạt (#E0A96D), intensity = 8.5, distance = 28.0, decay = 1.3
    // Đặt ẩn sát dọc theo hai bên vách tường trái và phải (X = +-11.5m), chiếu sáng bừng toàn bộ chiều dài phòng
    const wallFillLeft1 = new THREE.PointLight(0xE0A96D, 8.5, 28.0, 1.3);
    wallFillLeft1.name = "Kieu_WallFill_Left_Front";
    wallFillLeft1.position.set(-11.5, 4.8, 8.0);
    wallFillLeft1.layers.set(1);
    this.lightsGroup.add(wallFillLeft1);

    const wallFillLeft2 = new THREE.PointLight(0xE0A96D, 8.5, 28.0, 1.3);
    wallFillLeft2.name = "Kieu_WallFill_Left_Center";
    wallFillLeft2.position.set(-11.5, 4.8, 0.0);
    wallFillLeft2.layers.set(1);
    this.lightsGroup.add(wallFillLeft2);

    const wallFillLeft3 = new THREE.PointLight(0xE0A96D, 8.5, 28.0, 1.3);
    wallFillLeft3.name = "Kieu_WallFill_Left_Back";
    wallFillLeft3.position.set(-11.5, 4.8, -8.0);
    wallFillLeft3.layers.set(1);
    this.lightsGroup.add(wallFillLeft3);

    const wallFillRight1 = new THREE.PointLight(0xE0A96D, 8.5, 28.0, 1.3);
    wallFillRight1.name = "Kieu_WallFill_Right_Front";
    wallFillRight1.position.set(11.5, 4.8, 8.0);
    wallFillRight1.layers.set(1);
    this.lightsGroup.add(wallFillRight1);

    const wallFillRight2 = new THREE.PointLight(0xE0A96D, 8.5, 28.0, 1.3);
    wallFillRight2.name = "Kieu_WallFill_Right_Center";
    wallFillRight2.position.set(11.5, 4.8, 0.0);
    wallFillRight2.layers.set(1);
    this.lightsGroup.add(wallFillRight2);

    const wallFillRight3 = new THREE.PointLight(0xE0A96D, 8.5, 28.0, 1.3);
    wallFillRight3.name = "Kieu_WallFill_Right_Back";
    wallFillRight3.position.set(11.5, 4.8, -8.0);
    wallFillRight3.layers.set(1);
    this.lightsGroup.add(wallFillRight3);

    // 4. ĐẨY SÂU VÀ KHUẾCH ĐẠI HỆ THỐNG ĐÈN SÀN ÂM (FLOOR FILL LIGHTS OVERHAUL):
    // Đem toàn bộ cụm đèn hắt sàn dời xuống âm dưới mặt sàn ở độ cao Y = -0.3m.
    // Tăng mạnh bán kính phủ sáng distance = 35.0m, cường độ intensity = 4.0, decay = 1.0
    // để ánh sáng từ dưới hắt ngược lên, tỏa ra toàn bộ không gian từ cửa vào đến vách sau
    const floorWashFront = new THREE.PointLight(0xE0A96D, 4.0, 35.0, 1.0);
    floorWashFront.name = "Kieu_FloorWash_FrontCamera";
    floorWashFront.position.set(0, -0.30, 8.5); // Khu vực lối vào gần camera
    floorWashFront.layers.set(1);
    this.lightsGroup.add(floorWashFront);

    const floorWashMidFront = new THREE.PointLight(0xE0A96D, 4.0, 35.0, 1.0);
    floorWashMidFront.name = "Kieu_FloorWash_MidFront";
    floorWashMidFront.position.set(0, -0.30, 3.5);
    floorWashMidFront.layers.set(1);
    this.lightsGroup.add(floorWashMidFront);

    const floorWashMidBack = new THREE.PointLight(0xE0A96D, 4.0, 35.0, 1.0);
    floorWashMidBack.name = "Kieu_FloorWash_MidBack";
    floorWashMidBack.position.set(0, -0.30, -3.5);
    floorWashMidBack.layers.set(1);
    this.lightsGroup.add(floorWashMidBack);

    const floorWashBack = new THREE.PointLight(0xE0A96D, 4.0, 35.0, 1.0);
    floorWashBack.name = "Kieu_FloorWash_Back";
    floorWashBack.position.set(0, -0.30, -8.5);
    floorWashBack.layers.set(1);
    this.lightsGroup.add(floorWashBack);

    const floorWashSideLeft = new THREE.PointLight(0xE0A96D, 4.0, 35.0, 1.0);
    floorWashSideLeft.name = "Kieu_FloorWash_SideLeft";
    floorWashSideLeft.position.set(-5.5, -0.30, 4.0);
    floorWashSideLeft.layers.set(1);
    this.lightsGroup.add(floorWashSideLeft);

    const floorWashSideRight = new THREE.PointLight(0xE0A96D, 4.0, 35.0, 1.0);
    floorWashSideRight.name = "Kieu_FloorWash_SideRight";
    floorWashSideRight.position.set(5.5, -0.30, 4.0);
    floorWashSideRight.layers.set(1);
    this.lightsGroup.add(floorWashSideRight);

    // 5. ĐÈN RỌI TÔN VINH CÂY ĐÀO VÀ BÌNH GỐM (PEACH BLOSSOM & URN ACCENT LIGHTS):
    // 2 nguồn PointLight sắc hồng đào nhạt pha ánh ấm (#FFC8D6, intensity = 3.0, distance = 14.0)
    // Chiếu riêng vào khu vực 2 cây hoa đào cổ thụ và các bình gốm sứ hai bên
    const peachTreeAccentLeft = new THREE.PointLight(0xFFC8D6, 3.0, 14.0, 1.3);
    peachTreeAccentLeft.name = "Kieu_PeachTree_Accent_Left";
    peachTreeAccentLeft.position.set(-5.6, 2.6, 0.6); // Chiếu vào thân bonsai & tán đào trái
    peachTreeAccentLeft.layers.set(1);
    this.lightsGroup.add(peachTreeAccentLeft);

    const peachTreeAccentRight = new THREE.PointLight(0xFFC8D6, 3.0, 14.0, 1.3);
    peachTreeAccentRight.name = "Kieu_PeachTree_Accent_Right";
    peachTreeAccentRight.position.set(5.6, 2.6, 0.6); // Chiếu vào thân bonsai & tán đào phải
    peachTreeAccentRight.layers.set(1);
    this.lightsGroup.add(peachTreeAccentRight);

    // 6. ĐÈN HÀNH LANG LỐI VÀO SÁT CAMERA (CORRIDOR AMBIENT LIGHTS):
    // 2 PointLight lớn đặt ở hai bên vách tường ngay gần vị trí Camera đứng (Z = 10.0m)
    // Màu vàng ấm (#FFB703, intensity = 5.0, distance = 30.0), giúp vùng sàn ngay dưới chân người xem bừng sáng rõ nét
    const corridorLightLeft = new THREE.PointLight(0xFFB703, 5.0, 30.0, 1.2);
    corridorLightLeft.name = "Kieu_Corridor_Left_Z10";
    corridorLightLeft.position.set(-8.5, 3.8, 10.0);
    corridorLightLeft.layers.set(1);
    this.lightsGroup.add(corridorLightLeft);

    const corridorLightRight = new THREE.PointLight(0xFFB703, 5.0, 30.0, 1.2);
    corridorLightRight.name = "Kieu_Corridor_Right_Z10";
    corridorLightRight.position.set(8.5, 3.8, 10.0);
    corridorLightRight.layers.set(1);
    this.lightsGroup.add(corridorLightRight);

    // High Ceiling Wash Light: sắc tím trầm sương mờ (#5C3D79, intensity = 3.5, distance = 25.0, decay = 1.5)
    // Bao phủ vòm trần và các xà gồ cao, ngăn chặn hoàn toàn hiện tượng trần nhà bị tối đen
    const ceilingMoonLight = new THREE.PointLight(0x5C3D79, 3.5, 25.0, 1.5);
    ceilingMoonLight.name = "Kieu_Ceiling_MoonLight";
    ceilingMoonLight.position.set(0, 13.0, 0.0);
    ceilingMoonLight.layers.set(1);
    this.lightsGroup.add(ceilingMoonLight);

    // Tiêu diệt triệt để mọi LightHelper hoặc Mesh bóng đèn ảo trong nhóm đèn
    this.purgeLightHelpers(this.lightsGroup);

    // Đưa vào danh sách quản lý
    this.dioramaLights = [
      { light: skylightSpot, baseIntensity: 45.0, currentIntensity: 45.0 },
      { light: moonlightRimLight, baseIntensity: 4.0, currentIntensity: 4.0 },
      { light: ambientSky, baseIntensity: 3.5, currentIntensity: 3.5 },
      { light: hemiNocturne, baseIntensity: 3.5, currentIntensity: 3.5 },
      { light: bookSpot, baseIntensity: 15.0, currentIntensity: 15.0 },
      { light: deskSpot, baseIntensity: 6.0, currentIntensity: 6.0 },
      { light: doorSpot, baseIntensity: 4.5, currentIntensity: 4.5 },
      { light: wallFillLeft1, baseIntensity: 8.5, currentIntensity: 8.5 },
      { light: wallFillLeft2, baseIntensity: 8.5, currentIntensity: 8.5 },
      { light: wallFillLeft3, baseIntensity: 8.5, currentIntensity: 8.5 },
      { light: wallFillRight1, baseIntensity: 8.5, currentIntensity: 8.5 },
      { light: wallFillRight2, baseIntensity: 8.5, currentIntensity: 8.5 },
      { light: wallFillRight3, baseIntensity: 8.5, currentIntensity: 8.5 },
      { light: floorWashFront, baseIntensity: 4.0, currentIntensity: 4.0 },
      { light: floorWashMidFront, baseIntensity: 4.0, currentIntensity: 4.0 },
      { light: floorWashMidBack, baseIntensity: 4.0, currentIntensity: 4.0 },
      { light: floorWashBack, baseIntensity: 4.0, currentIntensity: 4.0 },
      { light: floorWashSideLeft, baseIntensity: 4.0, currentIntensity: 4.0 },
      { light: floorWashSideRight, baseIntensity: 4.0, currentIntensity: 4.0 },
      { light: peachTreeAccentLeft, baseIntensity: 3.0, currentIntensity: 3.0 },
      { light: peachTreeAccentRight, baseIntensity: 3.0, currentIntensity: 3.0 },
      { light: corridorLightLeft, baseIntensity: 5.0, currentIntensity: 5.0 },
      { light: corridorLightRight, baseIntensity: 5.0, currentIntensity: 5.0 },
      { light: ceilingMoonLight, baseIntensity: 3.5, currentIntensity: 3.5 }
    ];
  }

  /**
   * Tạo chất liệu Shader làm mềm khối trụ luồng sáng (Soft Volumetric God-Ray Shader):
   * - Phai mờ viền ngoài (Fresnel Edge Fade): Tiêu diệt hoàn toàn viền cứng hình trụ "ống nhựa"
   * - Phai mờ êm ái 2 đầu (Top/Bottom Smoothstep): Hòa quyện tự nhiên vào trần và sàn
   * - Độ mờ thấp (0.08 - 0.12), sắc vàng nắng dịu mát (#FFE6A7)
   */
  createSoftGodRayShader(baseOpacity = 0.10, colorHex = 0xFFE6A7, powEdge = 1.4) {
    const uniforms = {
      uColor: { value: new THREE.Color(colorHex) },
      uTime: { value: 0 },
      uOpacity: { value: baseOpacity }
    };
    return new THREE.ShaderMaterial({
      uniforms,
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPos;

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uTime;
        uniform float uOpacity;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPos;

        #if !defined(__VERSION__) || (__VERSION__ < 300)
        bool isnan(float val) { return (val != val); }
        bool isinf(float val) { return (val > 1e20 || val < -1e20); }
        #endif

        void main() {
          // 1. Phai mờ êm ái ở 2 đầu: đỉnh trần (vUv.y -> 1.0) và đáy sàn (vUv.y -> 0.0)
          float vFade = smoothstep(0.0, 0.28, vUv.y) * smoothstep(1.0, 0.78, vUv.y);

          // 2. Phai mờ viền ngoài (Fresnel Falloff): Triệt tiêu viền cạnh sắc của hình trụ
          vec3 viewVec = cameraPosition - vWorldPos;
          float viewDist = length(viewVec);
          vec3 viewDir = viewDist > 0.0001 ? viewVec / viewDist : vec3(0.0, 1.0, 0.0);
          float rim = clamp(abs(dot(viewDir, vNormal)), 0.0, 1.0);
          float edgeFade = pow(rim, ${powEdge.toFixed(1)});

          // 3. Gợn sóng luồng sáng chuyển động rất nhẹ
          float subtleWave = 0.92 + 0.08 * sin(vUv.x * 20.0 + uTime * 0.4);

          float alpha = uOpacity * vFade * edgeFade * subtleWave;

          if (isnan(alpha) || isinf(alpha) || alpha <= 0.001) {
            discard;
          }

          gl_FragColor = vec4(uColor, clamp(alpha, 0.0, 1.0));
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
  }

  createSoftFinTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Gradient mờ dần từ tâm ra 4 mép viền ngoài
    const radGrad = ctx.createRadialGradient(128, 256, 0, 128, 256, 250);
    radGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    radGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.85)');
    radGrad.addColorStop(0.70, 'rgba(255, 255, 255, 0.35)');
    radGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');

    ctx.fillStyle = radGrad;
    ctx.fillRect(0, 0, 256, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false;
    texture.minFilter = THREE.LinearFilter;
    return texture;
  }

  /**
   * 3.1. DỰNG KHỐI TRỤ LUỒNG SÁNG LÀM MỀM (SOFTEN VOLUMETRIC LIGHT SHAFT):
   * - Khắc phục tình trạng "ống nhựa đặc", làm mềm tự nhiên hòa quyện với không gian tối xung quanh:
   *   + Giảm độ mờ (opacity) xuống mức 0.08 – 0.12.
   *   + Phai mờ ở viền (Fresnel edge fade out) mờ dần từ tâm ra ngoài và mờ dần ở 2 đầu trần/sàn.
   *   + Đổi màu luồng sáng sang sắc vàng nắng nhẹ nhàng hơn (#FFE6A7), bớt gắt màu vàng nghệ.
   */
  initSkylightAndGodRays() {
    this.skylightGroup.clear();

    const beamTopY = 14.0;
    const beamBottomY = 0.13;
    const beamHeight = beamTopY - beamBottomY; // 13.87m
    const beamCenterY = beamBottomY + beamHeight / 2; // Y = 7.065m

    // A. Kiến trúc Vành Vòm Giếng Trời Mạ Vàng Cung Đình (Gilded Oculus Opening at Y = 14.0m)
    const oculusGroup = new THREE.Group();
    oculusGroup.name = "Kieu_Oculus_Skylight_Architecture";
    oculusGroup.position.set(0, beamTopY, 0);

    // Vành đai ngoài bằng đồng mạ vàng hoàng gia
    const oculusRimGeo = new THREE.TorusGeometry(3.6, 0.22, 16, 48);
    this.sanitizeGeometry(oculusRimGeo);
    const goldRimMat = new THREE.MeshStandardMaterial({
      color: 0xD4AF37,
      roughness: 0.25,
      metalness: 0.85
    });
    const oculusRim = new THREE.Mesh(oculusRimGeo, goldRimMat);
    oculusRim.rotation.x = Math.PI / 2;
    oculusRim.castShadow = true;
    oculusGroup.add(oculusRim);

    // Vành đai hoa sen chạm trổ bên trong
    const innerRimGeo = new THREE.TorusGeometry(2.4, 0.12, 12, 36);
    this.sanitizeGeometry(innerRimGeo);
    const innerRim = new THREE.Mesh(innerRimGeo, goldRimMat);
    innerRim.rotation.x = Math.PI / 2;
    oculusGroup.add(innerRim);

    // Đĩa phát quang vòm trời (Celestial Skylight Disc Emitter) - Vàng nắng dịu nhẹ #FFE6A7
    const glassGeo = new THREE.CircleGeometry(3.5, 36);
    this.sanitizeGeometry(glassGeo);
    const glassMat = new THREE.MeshBasicMaterial({
      color: 0xFFE6A7,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    const glassDisc = new THREE.Mesh(glassGeo, glassMat);
    glassDisc.rotation.x = Math.PI / 2;
    glassDisc.position.y = 0.05;
    oculusGroup.add(glassDisc);

    this.skylightGroup.add(oculusGroup);

    // B. KHỐI TRỤ LUỒNG SÁNG LÀM MỀM (SOFTEN VOLUMETRIC LIGHT SHAFT):
    const godRayGroup = new THREE.Group();
    godRayGroup.name = "Kieu_Volumetric_GodRay_System";
    godRayGroup.position.set(0, beamCenterY, 0);

    // 1. Lõi sáng trung tâm (Core Divine Light Shaft) - Vàng Nắng Nhẹ Nhàng #FFE6A7 (opacity = 0.10)
    // Tích hợp ShaderMaterial với hiệu ứng phai mờ viền ngoài (Fresnel falloff) mờ dần từ tâm ra ngoài
    const coreGeo = new THREE.CylinderGeometry(1.1, 2.8, beamHeight, 48, 1, true);
    this.sanitizeGeometry(coreGeo);
    const coreMat = this.createSoftGodRayShader(0.10, 0xFFE6A7, 1.4);
    const coreShaft = new THREE.Mesh(coreGeo, coreMat);
    coreShaft.name = "GodRay_Core_Shaft";
    coreShaft.frustumCulled = false;
    godRayGroup.add(coreShaft);

    // 2. Quầng sáng khí quyển mở rộng (Outer Atmospheric Corona Shaft) - #FFE6A7 (opacity = 0.08)
    const outerGeo = new THREE.CylinderGeometry(1.7, 4.0, beamHeight, 48, 1, true);
    this.sanitizeGeometry(outerGeo);
    const outerMat = this.createSoftGodRayShader(0.08, 0xFFE6A7, 1.2);
    const outerShaft = new THREE.Mesh(outerGeo, outerMat);
    outerShaft.name = "GodRay_Outer_Shaft";
    outerShaft.frustumCulled = false;
    godRayGroup.add(outerShaft);

    // 3. Quầng sương mờ ánh trăng bao quanh (#9A8C98) - Rất mỏng nhẹ (opacity = 0.06)
    const mistGeo = new THREE.CylinderGeometry(2.1, 4.6, beamHeight, 48, 1, true);
    this.sanitizeGeometry(mistGeo);
    const mistMat = this.createSoftGodRayShader(0.06, 0x9A8C98, 1.1);
    const mistShaft = new THREE.Mesh(mistGeo, mistMat);
    mistShaft.name = "GodRay_MoonlightMist_Shaft";
    mistShaft.frustumCulled = false;
    godRayGroup.add(mistShaft);

    // 4. Các nan tia sáng góc chéo với texture gradient mờ dần từ tâm ra 4 mép
    const finGeo = new THREE.PlaneGeometry(4.6, beamHeight);
    this.sanitizeGeometry(finGeo);
    const finMat = new THREE.MeshBasicMaterial({
      map: this.createSoftFinTexture(),
      color: 0xFFE6A7,
      transparent: true,
      opacity: 0.065,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const finAngles = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4];
    finAngles.forEach((ang, idx) => {
      const finMesh = new THREE.Mesh(finGeo, finMat);
      finMesh.name = `GodRay_Fin_${idx}`;
      finMesh.rotation.y = ang;
      finMesh.frustumCulled = false;
      godRayGroup.add(finMesh);
    });

    this.skylightGroup.add(godRayGroup);
    this.godRayShaftGroup = godRayGroup;
    this.godRayCoreMat = coreMat;
    this.godRayOuterMat = outerMat;
    this.godRayMistMat = mistMat;
    this.godRayFinMat = finMat;

    // Gán Layer 1 cho toàn bộ nhóm Giếng trời & God-Rays
    this.skylightGroup.traverse((child) => child.layers.set(1));
  }

  /**
   * Cấu hình vật liệu PBR cho mô hình nạp từ Blender
   */
  setupModelMaterials(model) {
    this.purgeLightHelpers(model);

    model.traverse((child) => {
      child.layers.set(1);
      if (child.isMesh) {
        const name = child.name || '';
        const isMinor = name.includes('cord') || name.includes('leaf') || name.includes('petal') || name.includes('twig');
        child.castShadow = !isMinor;
        child.receiveShadow = true;
        child.frustumCulled = true;

        if (child.geometry) {
          this.sanitizeGeometry(child.geometry);
        }

        if (child.material) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(mat => {
            if (mat) {
              mat.side = THREE.DoubleSide;
              mat.needsUpdate = true;
            }
          });
        }
      }
    });
  }

  /**
   * 4. NẠP ĐẦY ĐỦ CÁC MÔ HÌNH THẬT 1:1 QUA BLENDER GLTF:
   * 1. sach_truyen_kieu.glb tại (0, 0.13, 0.0)
   * 2. an_thu.glb tại (0, 0.08, -2.5)
   * 3. dan_ty_ba.glb tại (0.25, deskTopY, -2.5)
   * 4. binh_phong.glb tại (0, 0.08, -4.2)
   * 5. den_long_kieu.glb (8 chiếc dọc 2 bên vách tại Y = 3.8m)
   * 6. binh_gom_co.glb (4 chiếc đặt tại 4 góc trang trọng)
   */
  /**
   * 4. NẠP ĐẦY ĐỦ CÁC MÔ HÌNH THẬT 1:1 QUA BLENDER GLTF:
   * 1. sach_truyen_kieu.glb tại (0, 0.13, 0.0)
   * 2. an_thu.glb tại (0, 0.08, -2.5)
   * 3. dan_ty_ba.glb tại (0.25, deskTopY, -2.5)
   * 4. binh_phong.glb tại (0, 0.08, -4.2)
   * 5. den_long.glb / den_long_kieu.glb (8 chiếc dọc 2 bên vách tại Y = 3.8m)
   * 6. binh_gom_co.glb (4 chiếc đặt tại 4 góc trang trọng)
   * 7. cay_hoa_dao.glb (2 cây hoa đào cổ thụ dáng thế tại X = +-6.8m)
   */
  initMasterpieceModels() {
    this.loadBookModel();
    this.loadDeskModel();
    this.loadLuteModel();
    this.loadScreenModel();
    this.loadEightLanterns();
    this.loadCeramicUrns();
    this.loadPeachTrees();
  }

  // 1. Cuốn Sách Truyện Kiều Trung Tâm Mở Rộng 1.1m (Đặt tại Z = 0.0m)
  loadBookModel() {
    this.gltfLoader.load(
      '/assets/models/rooms/kieu/sach_truyen_kieu.glb',
      (gltf) => {
        try {
          const model = gltf.scene || gltf.scenes?.[0];
          if (!model) {
            console.error("THIẾU FILE 3D: sach_truyen_kieu.glb");
            return;
          }

          model.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());

          // Đặt tại tâm bệ tròn X = 0, Z = 0.0, mặt bệ Y = 0.13m
          model.position.x = -center.x;
          model.position.z = -center.z;
          model.position.y = 0.13 - box.min.y;
          model.updateMatrixWorld(true);

          model.userData.portalMetadata = {
            id: 'truyen_kieu',
            title: 'Truyện Kiều - Nguyễn Du'
          };

          this.setupModelMaterials(model);
          model.name = 'major_prop_sach_truyen_kieu';
          this.bookModel = model;
          this.modelsGroup.add(model);
          this.onModelLoaded?.(model);

          // Đăng ký tương tác Raycasting click để chuyển cảnh vào cõi Kiều
          registerInteractiveBook(model, new THREE.Vector3(0, 150, 0), {
            id: 'truyen_kieu',
            title: 'TRUYỆN KIỀU – NGUYỄN DU',
            author: 'Đại thi hào Nguyễn Du (1765 – 1820)',
            genre: 'Truyện thơ Nôm (Văn học Trung đại)',
            quote: 'Đoạn trường tân thanh – Khúc ca bi tráng về tài mệnh tương đố và khát vọng tự do.',
            targetZoneId: 1,
            themeColor: 0x39e58c,
            portalReady: true
          });

          console.log("%c✓ [BLENDER GLB 1:1] Sách Truyện Kiều Mở Rộng 1.1m nạp tại (0, 0.13, 0.0)!", "color: #39e58c; font-weight: bold;");
        } catch (err) {
          console.error("Lỗi xử lý sach_truyen_kieu.glb:", err);
        }
      },
      undefined,
      (err) => console.error("THIẾU FILE 3D: sach_truyen_kieu.glb", err)
    );
  }

  // 2. Án thư gỗ trắc bề thế (Rộng 2.4m, Sâu 1.0m, Cao 0.9m) tại Z = -2.5m
  loadDeskModel() {
    this.gltfLoader.load(
      '/assets/models/rooms/kieu/an_thu.glb',
      (gltf) => {
        try {
          const model = gltf.scene || gltf.scenes?.[0];
          if (!model) {
            console.error("THIẾU FILE 3D: an_thu.glb");
            return;
          }

          model.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());

          // Đặt lùi sau bục sách 2.5m (Z = -2.5m), trên sàn gỗ lim Y = 0.08m
          model.position.x = -center.x;
          model.position.z = -2.5 - center.z;
          model.position.y = 0.08 - box.min.y;
          model.updateMatrixWorld(true);

          const finalBox = new THREE.Box3().setFromObject(model);
          this.deskTopY = finalBox.max.y;
          model.name = 'major_prop_an_thu';
          this.deskModel = model;

          this.setupModelMaterials(model);
          this.modelsGroup.add(model);
          this.onModelLoaded?.(model);

          console.log(`%c✓ [BLENDER GLB 1:1] Án Thư Cổ 2.4m tại Z=-2.5m, cao độ ${this.deskTopY.toFixed(3)}m!`, "color: #39e58c; font-weight: bold;");

          if (this.luteModel) {
            this.placeLuteOnDesk();
          }
        } catch (err) {
          console.error("Lỗi xử lý an_thu.glb:", err);
        }
      },
      undefined,
      (err) => console.error("THIẾU FILE 3D: an_thu.glb", err)
    );
  }

  // 3. Đàn Tỳ Bà trên giá đỡ mặt bàn (Dài 1.25m)
  loadLuteModel() {
    this.gltfLoader.load(
      '/assets/models/rooms/kieu/dan_ty_ba.glb',
      (gltf) => {
        try {
          const model = gltf.scene || gltf.scenes?.[0];
          if (!model) {
            console.error("THIẾU FILE 3D: dan_ty_ba.glb");
            return;
          }

          // Xoay nằm nghiêng tự nhiên trên giá đỡ mặt bàn
          model.rotation.set(-Math.PI / 2.2, 0, Math.PI / 10);
          model.updateMatrixWorld(true);

          this.luteModel = model;
          this.setupModelMaterials(model);

          this.placeLuteOnDesk();
          this.modelsGroup.add(model);

          console.log("%c✓ [BLENDER GLB 1:1] Đàn Tỳ Bà 1.25m trên giá đỡ đã nạp thành công!", "color: #39e58c; font-weight: bold;");
        } catch (err) {
          console.error("Lỗi xử lý dan_ty_ba.glb:", err);
        }
      },
      undefined,
      (err) => console.error("THIẾU FILE 3D: dan_ty_ba.glb", err)
    );
  }

  placeLuteOnDesk() {
    if (!this.luteModel) return;

    this.luteModel.updateMatrixWorld(true);
    const luteBox = new THREE.Box3().setFromObject(this.luteModel);
    const luteCenter = luteBox.getCenter(new THREE.Vector3());

    const targetX = 0.25;
    const targetZ = -2.5;
    const targetTopY = (this.deskTopY !== undefined ? this.deskTopY : 0.98) + 0.005;

    this.luteModel.position.x += (targetX - luteCenter.x);
    this.luteModel.position.z += (targetZ - luteCenter.z);
    this.luteModel.position.y += (targetTopY - luteBox.min.y);
    this.luteModel.updateMatrixWorld(true);
  }

  // 4. Bình phong khổng lồ 5.0m x 3.2m tại Z = -4.2m
  loadScreenModel() {
    this.gltfLoader.load(
      '/assets/models/rooms/kieu/binh_phong.glb',
      (gltf) => {
        try {
          const model = gltf.scene || gltf.scenes?.[0];
          if (!model) {
            console.error("THIẾU FILE 3D: binh_phong.glb");
            return;
          }

          model.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());

          // Đặt phía sau Án thư 1.7m (Z = -4.2m)
          model.position.x = -center.x;
          model.position.z = -4.2 - center.z;
          model.position.y = 0.08 - box.min.y;
          model.updateMatrixWorld(true);

          this.setupModelMaterials(model);
          model.name = 'major_prop_binh_phong';
          this.screenModel = model;
          this.modelsGroup.add(model);
          this.onModelLoaded?.(model);

          console.log("%c✓ [BLENDER GLB 1:1] Bình Phong Khổng Lồ 5.0m x 3.2m dựng tại Z=-4.2m!", "color: #39e58c; font-weight: bold;");
        } catch (err) {
          console.error("Lỗi xử lý binh_phong.glb:", err);
        }
      },
      undefined,
      (err) => console.error("THIẾU FILE 3D: binh_phong.glb", err)
    );
  }

  // 5. Hai hàng đèn lồng lụa phát sáng (8 chiếc den_long.glb) chạy dọc 2 vách tường
  loadEightLanterns() {
    const lanternUrl = '/assets/models/rooms/kieu/den_long.glb';
    this.gltfLoader.load(
      lanternUrl,
      (gltf) => {
        try {
          const baseModel = gltf.scene || gltf.scenes?.[0];
          if (!baseModel) {
            console.error("THIẾU FILE 3D: den_long.glb");
            return;
          }

          const cordGeo = new THREE.CylinderGeometry(0.006, 0.006, 4.2, 6);
          const cordMat = new THREE.MeshStandardMaterial({ color: 0x8a1515, roughness: 0.5 });

          // 4 vị trí Z trải dài từ đầu phòng đến cuối phòng: Z = +9.0, +3.0, -3.0, -9.0
          const zPositions = [9.0, 3.0, -3.0, -9.0];

          [-8.5, 8.5].forEach((lx, sideIdx) => {
            zPositions.forEach((lz, zIdx) => {
              const lantern = baseModel.clone();
              lantern.name = `Lantern_${sideIdx === 0 ? 'Left' : 'Right'}_${zIdx}`;
              lantern.position.set(lx, 3.8, lz);
              // Thiết lập vật liệu và kiểm soát nghiêm ngặt emissiveIntensity của lồng đèn
              this.setupModelMaterials(lantern);
              lantern.traverse((child) => {
                if (child.isMesh && child.material) {
                  const mats = Array.isArray(child.material) ? child.material : [child.material];
                  mats.forEach((mat) => {
                    if (mat && mat.emissive) {
                      // Giảm emissiveIntensity xuống mức vừa phải (0.18) để hiệu ứng Bloom không làm phình to thành cục sáng
                      mat.emissiveIntensity = 0.18;
                      if (mat.emissive.getHex() !== 0xFFAA33) {
                        mat.emissive.setHex(0xFFAA33);
                      }
                      mat.needsUpdate = true;
                    }
                  });
                }
              });
              this.modelsGroup.add(lantern);

              // Đăng ký lồng đèn vào danh sách đung đưa (pendulum sway)
              this.lanternItems.push({
                group: lantern,
                baseY: 3.8,
                speed: 1.1 + (sideIdx + zIdx) * 0.12,
                phase: (sideIdx * 2.5 + zIdx * 1.1)
              });

              // Dây treo đỏ nối lên trần
              const cord = new THREE.Mesh(cordGeo, cordMat);
              cord.position.set(lx, 5.9, lz);
              cord.layers.set(1);
              this.modelsGroup.add(cord);

              // PointLight ấm áp dịu nhẹ tại mỗi đèn lồng (intensity: 1.0, distance: 5.0, decay: 2.0)
              const pLight = new THREE.PointLight(0xFFAA33, 1.0, 5.0, 2.0);
              pLight.name = `LanternLight_${sideIdx}_${zIdx}`;
              pLight.position.set(lx, 3.5, lz);
              pLight.layers.set(1);
              this.lightsGroup.add(pLight);

              this.dioramaLights.push({
                light: pLight,
                baseIntensity: 1.0,
                currentIntensity: 1.0
              });

              this.flickerLights.push({
                light: pLight,
                baseIntensity: 1.0,
                speed: 3.2 + Math.random() * 2.2,
                phase: Math.random() * Math.PI * 2
              });
            });
          });

          console.log("%c✓ [BLENDER GLB 1:1] 8 Đèn Lồng Cung Đình đã thắp sáng rực rỡ 2 vách tường!", "color: #39e58c; font-weight: bold;");
        } catch (err) {
          console.error("Lỗi xử lý den_long.glb:", err);
        }
      },
      undefined,
      (err) => {
        // Fallback sang den_long_kieu.glb nếu cần
        this.gltfLoader.load(
          '/assets/models/rooms/kieu/den_long_kieu.glb',
          (gltf) => {
            const baseModel = gltf.scene || gltf.scenes?.[0];
            if (baseModel) {
              const cordGeo = new THREE.CylinderGeometry(0.006, 0.006, 4.2, 6);
              const cordMat = new THREE.MeshStandardMaterial({ color: 0x8a1515, roughness: 0.5 });
              const zPositions = [9.0, 3.0, -3.0, -9.0];
              [-8.5, 8.5].forEach((lx, sideIdx) => {
                zPositions.forEach((lz, zIdx) => {
                  const lantern = baseModel.clone();
                  lantern.name = `Lantern_${sideIdx === 0 ? 'Left' : 'Right'}_${zIdx}`;
                  lantern.position.set(lx, 3.8, lz);
                  this.setupModelMaterials(lantern);
                  this.modelsGroup.add(lantern);
                  this.lanternItems.push({
                    group: lantern,
                    baseY: 3.8,
                    speed: 1.1 + (sideIdx + zIdx) * 0.12,
                    phase: (sideIdx * 2.5 + zIdx * 1.1)
                  });
                  const cord = new THREE.Mesh(cordGeo, cordMat);
                  cord.position.set(lx, 5.9, lz);
                  cord.layers.set(1);
                  this.modelsGroup.add(cord);
                  const pLight = new THREE.PointLight(0xFFAA33, 1.0, 5.0, 2.0);
                  pLight.position.set(lx, 3.5, lz);
                  pLight.layers.set(1);
                  this.lightsGroup.add(pLight);
                  this.dioramaLights.push({ light: pLight, baseIntensity: 1.0, currentIntensity: 1.0 });
                  this.flickerLights.push({
                    light: pLight,
                    baseIntensity: 1.0,
                    speed: 3.2 + Math.random() * 2.2,
                    phase: Math.random() * Math.PI * 2
                  });
                });
              });
            }
          },
          undefined,
          (e2) => console.error("THIẾU FILE 3D: den_long.glb", e2)
        );
      }
    );
  }

  // 6. 4 Bình Gốm Sứ Cổ Bát Tràng (Cao 1.6m) đặt tại 4 góc phòng
  loadCeramicUrns() {
    this.gltfLoader.load(
      '/assets/models/rooms/kieu/binh_gom_co.glb',
      (gltf) => {
        try {
          const baseUrn = gltf.scene || gltf.scenes?.[0];
          if (!baseUrn) return;

          // 4 vị trí đặt bình gốm
          const urnPositions = [
            [-4.8, 0.08, 3.2],
            [4.8, 0.08, 3.2],
            [-5.8, 0.08, -2.8],
            [5.8, 0.08, -2.8]
          ];

          urnPositions.forEach(([ux, uy, uz], idx) => {
            const urn = baseUrn.clone();
            urn.name = `Antique_Urn_${idx}`;
            urn.position.set(ux, uy, uz);
            this.setupModelMaterials(urn);
            this.modelsGroup.add(urn);
            this.onModelLoaded?.(urn);
          });

          console.log("%c✓ [BLENDER GLB 1:1] 4 Bình Gốm Cổ Bát Tràng (1.6m) đặt tại 4 góc trang trọng!", "color: #39e58c; font-weight: bold;");
        } catch (err) {
          console.warn("Lỗi xử lý binh_gom_co.glb:", err);
        }
      },
      undefined,
      (err) => console.warn("Missing binh_gom_co.glb", err)
    );
  }

  // 7. Hai Cây Hoa Đào Cổ Thụ Dáng Thế (Blender GLTF 1:1 cay_hoa_dao.glb)
  loadPeachTrees() {
    this.gltfLoader.load(
      '/assets/models/rooms/kieu/cay_hoa_dao.glb',
      (gltf) => {
        try {
          const baseTree = gltf.scene || gltf.scenes?.[0];
          if (!baseTree) {
            console.error("THIẾU FILE 3D: cay_hoa_dao.glb");
            return;
          }

          [-6.8, 6.8].forEach((tx, sIdx) => {
            const tree = baseTree.clone();
            tree.name = `Ancient_Peach_Tree_${sIdx === 0 ? 'Left' : 'Right'}`;

            // Căn chuẩn tọa độ tiếp xúc mặt sàn bằng Box3
            tree.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(tree);
            const center = box.getCenter(new THREE.Vector3());

            tree.position.x = tx - center.x;
            tree.position.z = 0.0 - center.z;
            tree.position.y = 0.08 - box.min.y; // Đặt chuẩn trên sàn gỗ lim Y = 0.08m
            tree.rotation.y = sIdx === 0 ? 0.35 : Math.PI - 0.35;
            tree.updateMatrixWorld(true);

            this.setupModelMaterials(tree);
            this.modelsGroup.add(tree);
            this.onModelLoaded?.(tree);
          });

          console.log("%c✓ [BLENDER GLB 1:1] 2 Cây Hoa Đào Cổ Thụ Dáng Thế (cay_hoa_dao.glb) đã nạp tại X=+-6.8m!", "color: #39e58c; font-weight: bold;");
        } catch (err) {
          console.error("Lỗi xử lý cay_hoa_dao.glb:", err);
        }
      },
      undefined,
      (err) => console.error("THIẾU FILE 3D: cay_hoa_dao.glb", err)
    );
  }

  /**
   * 5. HỆ THỐNG VFX & TECH ART ĐIỆN ẢNH PHÒNG TRUYỆN KIỀU:
   * - 150 Cánh hoa đào hồng phấn rơi & xoay nhẹ quanh 2 cây đào và thảm đỏ.
   * - 250 Hạt bụi vàng God-Ray (Golden Dust Motes) lấp lánh trong cột sáng trung tâm.
   * - Sương mù mặt sàn (Atmospheric Ground Mist) màu tím than pha hổ phách.
   * - Làn khói trầm mỏng bay lên từ bàn án thư.
   * - Vòng thơ thư pháp phát sáng ("Trăm năm trong cõi người ta", "Chữ tài chữ mệnh khéo là ghét nhau", "Long lanh đáy nước in trời") xoay quanh bệ hoa sen.
   */
  initPetalsAndDustVfx() {
    this.particlesGroup.clear();

    // 1. Cánh hoa đào rơi chậm rãi
    this.initFallingPeachPetals();

    // 2. Bụi vàng lấp lánh trong cột sáng God-Ray trung tâm
    this.initCentralGoldDust();

    // 3. Lớp sương mù mặt sàn bồng bềnh
    this.initAtmosphericGroundMist();

    // 4. Làn khói trầm hương bay lên từ bàn án thư
    this.initIncenseSmoke();

    // 5. Vòng thư pháp thơ phát sáng xoay quanh bục sách hoa sen
    this.initCalligraphyVersesRing();
  }

  /**
   * TẠO TEXTURE CÁNH HOA ĐÀO HỒNG PHẤN (PROCEDURAL SPRITE)
   */
  createPeachPetalTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.translate(64, 64);
    const grad = ctx.createRadialGradient(0, -6, 4, 0, 0, 52);
    grad.addColorStop(0.0, 'rgba(255, 245, 248, 0.98)'); // Nhụy hồng phấn nhạt
    grad.addColorStop(0.35, 'rgba(255, 180, 198, 0.92)'); // Thân cánh đào tươi
    grad.addColorStop(0.75, 'rgba(242, 125, 162, 0.75)'); // Viền cánh phai
    grad.addColorStop(1.0, 'rgba(240, 120, 160, 0.0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 44);
    ctx.bezierCurveTo(-42, 20, -48, -32, -15, -45);
    ctx.bezierCurveTo(0, -52, 0, -38, 0, -32);
    ctx.bezierCurveTo(0, -38, 0, -52, 15, -45);
    ctx.bezierCurveTo(48, -32, 42, 20, 0, 44);
    ctx.closePath();
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }

  /**
   * 1. 150 CÁNH HOA ĐÀO HỒNG PHẤN RƠI & XOAY NHẸ (1 Draw Call - THREE.Points)
   */
  initFallingPeachPetals() {
    this.petalData = [];
    const petalGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.petalCount * 3);
    const colors = new Float32Array(this.petalCount * 3);

    const petalTexture = this.createPeachPetalTexture();
    const pinkBright = new THREE.Color(0xFFB7C5);
    const pinkDeep = new THREE.Color(0xFF9EAA);
    const pinkPale = new THREE.Color(0xFFDDE4);

    for (let i = 0; i < this.petalCount; i++) {
      const idx = i * 3;
      let bx, by, bz;
      let treeSide = 0;

      // 45% gần cây đào trái (X ~ -6.8), 45% gần cây đào phải (X ~ +6.8), 10% trôi vào thảm đỏ
      if (i < 68) {
        treeSide = -1;
        bx = -6.8 + (Math.random() - 0.5) * 3.8;
        bz = (Math.random() - 0.5) * 4.2;
      } else if (i < 136) {
        treeSide = 1;
        bx = 6.8 + (Math.random() - 0.5) * 3.8;
        bz = (Math.random() - 0.5) * 4.2;
      } else {
        treeSide = 0;
        bx = (Math.random() - 0.5) * 4.0;
        bz = (Math.random() - 0.5) * 8.0;
      }

      by = 0.5 + Math.random() * 6.0;

      this.petalData.push({
        baseX: bx,
        baseZ: bz,
        y: by,
        treeSide: treeSide,
        fallSpeed: 0.30 + Math.random() * 0.40, // Rơi chậm rãi, êm dịu
        swayFreq: 1.2 + Math.random() * 1.5,
        swayAmp: 0.25 + Math.random() * 0.35,
        swayPhase: Math.random() * Math.PI * 2,
        tumbleSpeed: 0.8 + Math.random() * 1.4,
        tumblePhase: Math.random() * Math.PI * 2
      });

      positions[idx] = bx;
      positions[idx + 1] = by;
      positions[idx + 2] = bz;

      const col = (i % 3 === 0) ? pinkBright : (i % 3 === 1) ? pinkDeep : pinkPale;
      colors[idx] = col.r;
      colors[idx + 1] = col.g;
      colors[idx + 2] = col.b;
    }

    petalGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    petalGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.sanitizeGeometry(petalGeo);

    const petalMat = new THREE.PointsMaterial({
      size: 0.24,
      map: petalTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    this.peachPetals = new THREE.Points(petalGeo, petalMat);
    this.peachPetals.name = "Kieu_Peach_Blossom_Petals";
    this.peachPetals.layers.set(1);
    this.peachPetals.frustumCulled = true;
    this.peachPetals.castShadow = false;

    this.particlesGroup.add(this.peachPetals);
  }

  /**
   * TẠO TEXTURE BỤI VÀNG SAO LI TI (PROCEDURAL SPRITE)
   */
  createGoldDustTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');  // Lõi kim cương rực rỡ
    grad.addColorStop(0.2, 'rgba(255, 246, 200, 0.95)');
    grad.addColorStop(0.45, 'rgba(255, 215, 0, 0.65)');  // Vàng hoàng gia
    grad.addColorStop(0.75, 'rgba(224, 169, 109, 0.22)'); // Hổ phách
    grad.addColorStop(1.0, 'rgba(92, 61, 121, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 64, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }

  /**
   * 2. 250 HẠT BỤI VÀNG TRONG CỘT SÁNG GOD-RAY TRUNG TÂM (1 Draw Call - THREE.Points)
   */
  initCentralGoldDust() {
    this.goldDustData = [];
    const dustGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.goldDustCount * 3);
    const colors = new Float32Array(this.goldDustCount * 3);

    const dustTexture = this.createGoldDustTexture();
    const diamondWhite = new THREE.Color(0xFFFFFF);
    const goldenSun = new THREE.Color(0xFFEAA7);
    const deepGold = new THREE.Color(0xFFD700);
    const amberWarm = new THREE.Color(0xE0A96D);

    const beamHeight = 13.87;

    for (let i = 0; i < this.goldDustCount; i++) {
      const idx = i * 3;
      const py = 0.25 + Math.random() * 13.5;
      const heightFraction = Math.max(0.0, Math.min(1.0, (py - 0.25) / beamHeight));
      const coneR = THREE.MathUtils.lerp(3.2, 1.1, heightFraction);
      const rRatio = Math.sqrt(Math.random());
      const r = rRatio * coneR;
      const theta = Math.random() * Math.PI * 2;

      const px = Math.cos(theta) * r;
      const pz = Math.sin(theta) * r;

      this.goldDustData.push({
        rRatio: rRatio,
        theta: theta,
        y: py,
        floatSpeed: (Math.random() - 0.5) * 0.12, // Nhấp nhô bồng bềnh
        rotSpeed: ((Math.random() - 0.5) * 0.15) + (Math.random() > 0.5 ? 0.08 : -0.08), // Xoay vòng quanh trục Y
        swayFreq: 0.6 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2
      });

      positions[idx] = px;
      positions[idx + 1] = py;
      positions[idx + 2] = pz;

      const col = (i % 4 === 0) ? diamondWhite :
                  (i % 4 === 1) ? goldenSun :
                  (i % 4 === 2) ? deepGold :
                                  amberWarm;
      colors[idx] = col.r;
      colors[idx + 1] = col.g;
      colors[idx + 2] = col.b;
    }

    dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    dustGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.sanitizeGeometry(dustGeo);

    const dustMat = new THREE.PointsMaterial({
      size: 0.16,
      map: dustTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.78,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.goldDustParticles = new THREE.Points(dustGeo, dustMat);
    this.goldDustParticles.name = "Kieu_Central_Gold_Dust_Motes";
    this.goldDustParticles.layers.set(1);
    this.goldDustParticles.frustumCulled = true;
    this.goldDustParticles.castShadow = false;

    this.particlesGroup.add(this.goldDustParticles);
  }

  /**
   * TẠO TEXTURE SƯƠNG MÙ MẶT SÀN TÍM THAN PHA HỔ PHÁCH
   */
  createGroundMistTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0.0, 'rgba(224, 169, 109, 0.42)'); // Lõi vàng hổ phách ấm
    grad.addColorStop(0.35, 'rgba(120, 75, 145, 0.30)');  // Tím than sương khói
    grad.addColorStop(0.70, 'rgba(70, 42, 95, 0.14)');   // Tím trầm
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(128, 128, 128, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }

  /**
   * 3. LỚP SƯƠNG MÙ MẶT SÀN (Atmospheric Ground Mist)
   */
  initAtmosphericGroundMist() {
    this.groundMistPlanes = [];
    const mistTexture = this.createGroundMistTexture();

    const mistConfigs = [
      // Quanh bệ hoa sen trung tâm
      { x: 0, y: 0.14, z: 0, r: 5.2, rotSpeed: 0.015, baseOpacity: 0.22, pulseFreq: 0.7 },
      { x: 0, y: 0.18, z: 0, r: 4.2, rotSpeed: -0.018, baseOpacity: 0.18, pulseFreq: 0.9 },
      // Dọc lối đi thảm đỏ
      { x: 0, y: 0.12, z: 4.5, r: 3.4, rotSpeed: 0.012, baseOpacity: 0.20, pulseFreq: 0.8 },
      { x: 0, y: 0.12, z: -4.5, r: 3.4, rotSpeed: -0.014, baseOpacity: 0.20, pulseFreq: 0.85 },
      // Gốc 2 cây hoa đào
      { x: -6.8, y: 0.15, z: 0, r: 3.2, rotSpeed: 0.016, baseOpacity: 0.22, pulseFreq: 0.65 },
      { x: 6.8, y: 0.15, z: 0, r: 3.2, rotSpeed: -0.016, baseOpacity: 0.22, pulseFreq: 0.65 }
    ];

    const mistGroup = new THREE.Group();
    mistGroup.name = "Kieu_Ground_Mist_Group";

    mistConfigs.forEach((cfg, idx) => {
      const geo = new THREE.PlaneGeometry(cfg.r * 2, cfg.r * 2);
      this.sanitizeGeometry(geo);
      const mat = new THREE.MeshBasicMaterial({
        map: mistTexture,
        transparent: true,
        opacity: cfg.baseOpacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.name = `GroundMist_Disc_${idx}`;
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(cfg.x, cfg.y, cfg.z);
      mesh.layers.set(1);
      mesh.frustumCulled = true;
      mesh.castShadow = false;
      mistGroup.add(mesh);

      this.groundMistPlanes.push({
        mesh,
        rotSpeed: cfg.rotSpeed,
        baseOpacity: cfg.baseOpacity,
        pulseFreq: cfg.pulseFreq,
        phase: idx * 1.1
      });
    });

    this.particlesGroup.add(mistGroup);
  }

  /**
   * TẠO TEXTURE KHÓI TRẦM (PROCEDURAL PUFF SPRITE)
   */
  createSmokePuffTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0.0, 'rgba(235, 225, 245, 0.70)'); // Khói trầm ngọc bích tím nhạt
    grad.addColorStop(0.4, 'rgba(205, 190, 225, 0.38)');
    grad.addColorStop(0.8, 'rgba(165, 145, 195, 0.12)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(32, 32, 32, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    return tex;
  }

  /**
   * 4. LÀN KHÓI TRẦM BAY LÊN TỪ BÀN ÁN THƯ (Incense Smoke Wisps)
   */
  initIncenseSmoke() {
    this.incenseSmokeData = [];
    const smokeGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.incenseSmokeCount * 3);
    const colors = new Float32Array(this.incenseSmokeCount * 3);

    const smokeTex = this.createSmokePuffTexture();
    const burnerPos = { x: 0.35, y: 0.98, z: -2.45 }; // Lư hương đặt trên bàn án thư
    const smokeCol = new THREE.Color(0xE4D8EE);

    for (let i = 0; i < this.incenseSmokeCount; i++) {
      const idx = i * 3;
      const py = burnerPos.y + Math.random() * 1.7;

      this.incenseSmokeData.push({
        baseX: burnerPos.x,
        baseZ: burnerPos.z,
        baseY: burnerPos.y,
        y: py,
        maxY: burnerPos.y + 1.75,
        riseSpeed: 0.20 + Math.random() * 0.18,
        curlFreq: 2.2 + Math.random() * 1.6,
        curlAmp: 0.08 + Math.random() * 0.09,
        phase: Math.random() * Math.PI * 2
      });

      positions[idx] = burnerPos.x;
      positions[idx + 1] = py;
      positions[idx + 2] = burnerPos.z;

      colors[idx] = smokeCol.r;
      colors[idx + 1] = smokeCol.g;
      colors[idx + 2] = smokeCol.b;
    }

    smokeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    smokeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.sanitizeGeometry(smokeGeo);

    const smokeMat = new THREE.PointsMaterial({
      size: 0.18,
      map: smokeTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.58,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    this.incenseSmoke = new THREE.Points(smokeGeo, smokeMat);
    this.incenseSmoke.name = "Kieu_Incense_Smoke_Wisps";
    this.incenseSmoke.layers.set(1);
    this.incenseSmoke.frustumCulled = true;
    this.incenseSmoke.castShadow = false;

    this.particlesGroup.add(this.incenseSmoke);
  }

  /**
   * TẠO CANVAS TEXTURE THƯ PHÁP VÀNG PHÁT SÁNG (GLOWING GOLDEN CALLIGRAPHY)
   */
  createCalligraphyTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 2048, 256);

    // Hiệu ứng phát sáng vàng kim hoàng gia rực rỡ
    ctx.shadowColor = 'rgba(255, 215, 0, 0.95)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#FFEAA7';
    ctx.font = 'italic bold 44px "Cinzel", "Playfair Display", "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const verses = [
      { text: "✦ Trăm năm trong cõi người ta ✦", x: 341 },
      { text: "✦ Chữ tài chữ mệnh khéo là ghét nhau ✦", x: 1024 },
      { text: "✦ Long lanh đáy nước in trời ✦", x: 1707 }
    ];

    verses.forEach(v => {
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.65)';
      ctx.lineWidth = 3;
      ctx.strokeText(v.text, v.x, 128);
      ctx.fillText(v.text, v.x, 128);
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  /**
   * 5. VÒNG THƯ PHÁP PHÁT SÁNG QUANH BỤC SÁCH (Floating Poetic Verses Ring)
   */
  initCalligraphyVersesRing() {
    const calligraphyTex = this.createCalligraphyTexture();

    // Dải hình trụ cong bán kính 3.0m, cao 0.65m bao quanh bệ hoa sen
    const ringGeo = new THREE.CylinderGeometry(3.0, 3.0, 0.65, 64, 1, true);
    this.sanitizeGeometry(ringGeo);

    const ringMat = new THREE.MeshBasicMaterial({
      map: calligraphyTex,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.calligraphyRing = new THREE.Mesh(ringGeo, ringMat);
    this.calligraphyRing.name = "Kieu_Calligraphy_Verses_Ring";
    this.calligraphyRing.position.set(0, 1.45, 0);
    this.calligraphyRing.layers.set(1);
    this.calligraphyRing.frustumCulled = true;
    this.calligraphyRing.castShadow = false;

    this.particlesGroup.add(this.calligraphyRing);
  }

  /**
   * CẬP NHẬT HOẠT ẢNH TECH ART & VFX ĐIỆN ẢNH (60 FPS)
   */
  update(delta = 0.016, elapsedTime = 0, camera = null) {
    // 1. Hoạt ảnh xoay nhẹ & nhấp nhô quang học của khối trụ luồng sáng God-Rays mềm mại
    if (this.godRayShaftGroup) {
      this.godRayShaftGroup.rotation.y += delta * 0.012;
      const pulse = Math.sin(elapsedTime * 1.2) * 0.015;

      if (this.godRayCoreMat?.uniforms?.uTime) {
        this.godRayCoreMat.uniforms.uTime.value = elapsedTime;
        this.godRayCoreMat.uniforms.uOpacity.value = Math.max(0.08, Math.min(0.12, 0.10 + pulse));
      }
      if (this.godRayOuterMat?.uniforms?.uTime) {
        this.godRayOuterMat.uniforms.uTime.value = elapsedTime;
        this.godRayOuterMat.uniforms.uOpacity.value = Math.max(0.06, Math.min(0.10, 0.08 + pulse * 0.7));
      }
      if (this.godRayMistMat?.uniforms?.uTime) {
        this.godRayMistMat.uniforms.uTime.value = elapsedTime;
        this.godRayMistMat.uniforms.uOpacity.value = Math.max(0.04, Math.min(0.08, 0.06 + pulse * 0.5));
      }
      if (this.godRayFinMat) {
        this.godRayFinMat.opacity = Math.max(0.05, Math.min(0.08, 0.065 + pulse * 0.5));
      }
    }

    // 2. Chuyển động rơi & xoay nhẹ của 150 cánh hoa đào hồng phấn
    if (this.peachPetals?.geometry) {
      const pos = this.peachPetals.geometry.attributes.position.array;
      for (let i = 0; i < this.petalCount; i++) {
        const idx = i * 3;
        const p = this.petalData[i];

        p.y -= p.fallSpeed * delta;
        p.swayPhase += p.swayFreq * delta;
        p.tumblePhase += p.tumbleSpeed * delta;

        // Khi cánh hoa chạm mặt sàn gỗ (Y <= 0.08m), tự động reset lên cành cao
        if (p.y <= 0.08) {
          p.y = 5.2 + Math.random() * 1.6;
          if (p.treeSide === -1) {
            p.baseX = -6.8 + (Math.random() - 0.5) * 3.8;
            p.baseZ = (Math.random() - 0.5) * 4.2;
          } else if (p.treeSide === 1) {
            p.baseX = 6.8 + (Math.random() - 0.5) * 3.8;
            p.baseZ = (Math.random() - 0.5) * 4.2;
          } else {
            p.baseX = (Math.random() - 0.5) * 4.0;
            p.baseZ = (Math.random() - 0.5) * 8.0;
          }
        }

        const driftX = Math.sin(p.swayPhase) * p.swayAmp;
        const driftZ = Math.cos(p.swayPhase * 0.75 + p.tumblePhase) * p.swayAmp;

        pos[idx] = p.baseX + driftX;
        pos[idx + 1] = p.y;
        pos[idx + 2] = p.baseZ + driftZ;
      }
      this.peachPetals.geometry.attributes.position.needsUpdate = true;
    }

    // 3. Chuyển động xoay & bồng bềnh của 250 hạt bụi vàng trong cột sáng God-Ray
    if (this.goldDustParticles?.geometry) {
      const pos = this.goldDustParticles.geometry.attributes.position.array;
      const beamHeight = 13.87;
      for (let i = 0; i < this.goldDustCount; i++) {
        const idx = i * 3;
        const d = this.goldDustData[i];

        d.theta += d.rotSpeed * delta;
        d.y += d.floatSpeed * delta;
        if (d.y > 13.8) d.y = 0.25;
        if (d.y < 0.25) d.y = 13.8;

        const heightFraction = Math.max(0.0, Math.min(1.0, (d.y - 0.25) / beamHeight));
        const currentConeR = THREE.MathUtils.lerp(3.2, 1.1, heightFraction);
        const r = d.rRatio * currentConeR;

        const swayX = Math.sin(elapsedTime * d.swayFreq + d.phase) * 0.08;
        const swayZ = Math.cos(elapsedTime * (d.swayFreq * 0.9) + d.phase) * 0.08;

        pos[idx] = Math.cos(d.theta) * r + swayX;
        pos[idx + 1] = d.y;
        pos[idx + 2] = Math.sin(d.theta) * r + swayZ;
      }
      this.goldDustParticles.geometry.attributes.position.needsUpdate = true;
    }

    // 4. Sương mù mặt sàn trôi nhẹ & nhấp nhô quang học
    if (this.groundMistPlanes) {
      for (let i = 0; i < this.groundMistPlanes.length; i++) {
        const m = this.groundMistPlanes[i];
        m.mesh.rotation.z += m.rotSpeed * delta;
        const pulse = Math.sin(elapsedTime * m.pulseFreq + m.phase) * 0.035;
        m.mesh.material.opacity = Math.max(0.08, Math.min(0.28, m.baseOpacity + pulse));
      }
    }

    // 5. Làn khói trầm án thư bay lên uốn lượn
    if (this.incenseSmoke?.geometry) {
      const pos = this.incenseSmoke.geometry.attributes.position.array;
      for (let i = 0; i < this.incenseSmokeData.length; i++) {
        const idx = i * 3;
        const s = this.incenseSmokeData[i];

        s.y += s.riseSpeed * delta;
        if (s.y > s.maxY) {
          s.y = s.baseY;
          s.phase = Math.random() * Math.PI * 2;
        }

        const hFrac = (s.y - s.baseY) / (s.maxY - s.baseY);
        const curlX = Math.sin(elapsedTime * s.curlFreq + s.phase) * (s.curlAmp * hFrac);
        const curlZ = Math.cos(elapsedTime * (s.curlFreq * 0.8) + s.phase) * (s.curlAmp * hFrac);

        pos[idx] = s.baseX + curlX;
        pos[idx + 1] = s.y;
        pos[idx + 2] = s.baseZ + curlZ;
      }
      this.incenseSmoke.geometry.attributes.position.needsUpdate = true;
    }

    // 6. Vòng thư pháp thơ phát sáng xoay cực chậm & lơ lửng bồng bềnh
    if (this.calligraphyRing && this.calligraphyRing.parent) {
      this.calligraphyRing.rotation.y += delta * 0.025;
      this.calligraphyRing.position.y = 1.45 + Math.sin(elapsedTime * 0.85) * 0.035;
    }

    // 7. Chuyển động đung đưa nhẹ nhàng (sine wave) của 8 đèn lồng cung đình
    if (this.lanternItems && this.lanternItems.length > 0) {
      for (let i = 0; i < this.lanternItems.length; i++) {
        const item = this.lanternItems[i];
        item.group.rotation.z = Math.sin(elapsedTime * item.speed + item.phase) * 0.055;
        item.group.rotation.x = Math.cos(elapsedTime * (item.speed * 0.75) + item.phase) * 0.035;
      }
    }

    // 8. Hiệu ứng dao động cường độ sáng nhẹ (flicker/breathing) tạo cảm giác ánh nến lung linh
    if (this.flickerLights && this.flickerLights.length > 0) {
      for (let i = 0; i < this.flickerLights.length; i++) {
        const f = this.flickerLights[i];
        const flicker = 1.0 + Math.sin(elapsedTime * f.speed + f.phase) * 0.07 + Math.sin(elapsedTime * (f.speed * 2.1) + f.phase * 1.5) * 0.035;
        f.light.intensity = f.baseIntensity * flicker;
      }
    }

    // 9. Cập nhật hiệu ứng Cinematic Extras & Overhaul (Trăng Thề, Đầm Sen, Mưa Hoa Đào)
    updateTruyenKieuVFX(this.group, delta, elapsedTime);
    updateTruyenKieuCinematic(this.group, delta, elapsedTime);
  }

  dispose() {
    try {
      this.group.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m?.dispose?.());
          } else {
            child.material?.dispose?.();
          }
        }
      });
      this.group.clear();
    } catch (e) {
      console.warn("[SELF-HEALING] Error disposing RoomDecorator:", e);
    }
  }
}

// =========================================================================
// CINEMATIC EXTRAS: ĐÀN TỲ BÀ, NON NƯỚC TRÀNG AN & HOA ĐÀO RƠI PHÒNG 01
// =========================================================================

// Gọi hàm này bên trong hàm khởi tạo Phòng 01 (Truyện Kiều)
export function setupTruyenKieuCinematicExtras(roomGroup) {
  const vfxGroup = new THREE.Group();
  vfxGroup.name = 'TruyenKieu_Cinematic_Extras';
  vfxGroup.userData.excludeFromCollision = true;

  // =========================================================================
  // 1. CHẾ TÁC ĐÀN TỲ BÀ (PIPA) & GIÁ ĐỠ BÊN CẠNH BÀN ÁN THƯ
  // =========================================================================
  const pipaGroup = new THREE.Group();
  pipaGroup.name = 'Dan_Ty_Ba_Prop';

  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x4a1c11, // Gỗ hồng sắc / gỗ lim bóng
    roughness: 0.22,
    metalness: 0.15
  });
  const soundboardMat = new THREE.MeshStandardMaterial({
    color: 0xd9a76a, // Mặt đàn gỗ ngô đồng sáng
    roughness: 0.35,
    metalness: 0.05
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xffd700,
    roughness: 0.2,
    metalness: 0.85,
    emissive: 0x332200,
    emissiveIntensity: 0.3
  });

  // Bầu đàn hình giọt nước (Pear-shaped body)
  const bodyGeo = new THREE.SphereGeometry(0.22, 32, 24);
  bodyGeo.scale(1.0, 1.45, 0.32);
  const pipaBody = new THREE.Mesh(bodyGeo, woodMat);
  pipaBody.position.set(0, 0.55, 0);
  pipaGroup.add(pipaBody);

  // Mặt gỗ ngô đồng phía trước
  const frontGeo = new THREE.SphereGeometry(0.212, 32, 24);
  frontGeo.scale(0.98, 1.42, 0.12);
  const pipaFront = new THREE.Mesh(frontGeo, soundboardMat);
  pipaFront.position.set(0, 0.55, 0.045);
  pipaGroup.add(pipaFront);

  // Cần đàn (Neck) & Đầu đàn uốn cong (Pegbox)
  const neckGeo = new THREE.CylinderGeometry(0.022, 0.032, 0.48, 16);
  const neck = new THREE.Mesh(neckGeo, woodMat);
  neck.position.set(0, 0.96, 0.01);
  pipaGroup.add(neck);

  // 4 trục lên dây (Tuning pegs)
  for (let i = 0; i < 4; i++) {
    const side = i < 2 ? -1 : 1;
    const pegGeo = new THREE.CylinderGeometry(0.006, 0.01, 0.12, 8);
    pegGeo.rotateZ(Math.PI / 2);
    const peg = new THREE.Mesh(pegGeo, goldMat);
    peg.position.set(side * 0.05, 1.12 + (i % 2) * 0.045, 0.01);
    pipaGroup.add(peg);
  }

  // Ngựa đàn (Bridge) & 4 dây tơ vàng (4 Silk Strings)
  const bridgeGeo = new THREE.BoxGeometry(0.12, 0.025, 0.03);
  const bridge = new THREE.Mesh(bridgeGeo, goldMat);
  bridge.position.set(0, 0.42, 0.072);
  pipaGroup.add(bridge);

  for (let i = 0; i < 4; i++) {
    const offsetX = (i - 1.5) * 0.022;
    const stringGeo = new THREE.CylinderGeometry(0.0018, 0.0018, 0.72, 6);
    const stringMesh = new THREE.Mesh(stringGeo, goldMat);
    stringMesh.position.set(offsetX, 0.78, 0.075);
    pipaGroup.add(stringMesh);
  }

  // Giá đỡ đàn bằng gỗ chạm khắc
  const standBase = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.28, 0.04, 24), woodMat);
  standBase.position.y = 0.02;
  const standPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.65, 12), woodMat);
  standPole.position.set(0, 0.34, -0.06);
  pipaGroup.add(standBase, standPole);

  // Đặt nghiêng duyên dáng bên cạnh bàn án thư / bục trung tâm
  pipaGroup.rotation.x = -0.18;
  pipaGroup.rotation.y = 0.45;
  pipaGroup.rotation.z = -0.12;
  pipaGroup.position.set(1.65, 0.15, -4.8); // Điều chỉnh sát cạnh bàn án thư

  // Đèn rọi ấm riêng cho cây đàn Tỳ Bà
  const pipaLight = new THREE.PointLight(0xffb84d, 1.8, 3.5);
  pipaLight.position.set(1.5, 1.4, -4.2);
  vfxGroup.add(pipaGroup, pipaLight);

  // =========================================================================
  // 2. NÂNG CẤP CẢNH NÚI NON SÔNG NƯỚC & TRĂNG THỀ (PHÍA SAU BÌNH PHONG)
  // =========================================================================
  const landscapeGroup = new THREE.Group();
  landscapeGroup.name = 'Non_Nuoc_Trang_An_Backdrop';

  // A. Mặt nước sông Tiền Đường / Đầm sen phản chiếu ánh trăng
  const riverGeo = new THREE.PlaneGeometry(46, 26, 64, 64);
  const riverMat = new THREE.MeshStandardMaterial({
    color: 0x091a2a,
    emissive: 0x05101c,
    roughness: 0.08, // Phản chiếu bóng trăng và núi rõ nét
    metalness: 0.85
  });
  const riverMesh = new THREE.Mesh(riverGeo, riverMat);
  riverMesh.rotation.x = -Math.PI / 2;
  riverMesh.position.set(0, 0.02, -19.5);
  landscapeGroup.add(riverMesh);

  // Vệt ánh trăng dát vàng lấp lánh trên mặt nước ("Long lanh đáy nước in trời")
  const moonPathGeo = new THREE.PlaneGeometry(5.5, 18, 32, 32);
  const moonPathMat = new THREE.MeshBasicMaterial({
    color: 0xffdf80,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const moonPath = new THREE.Mesh(moonPathGeo, moonPathMat);
  moonPath.rotation.x = -Math.PI / 2;
  moonPath.position.set(0, 0.04, -18.0);
  landscapeGroup.add(moonPath);

  // B. Quần thể núi trùng điệp 3 lớp có Rim-Light viền sáng rõ nét
  const mountainConfigs = [
    // Lớp gần (Xanh lam sẫm sắc nét)
    { x: -11.5, z: -17.5, r: 5.2, h: 11.5, color: 0x162b40, emissive: 0x0a1826 },
    { x: -5.2,  z: -18.2, r: 4.5, h: 9.8,  color: 0x1b334b, emissive: 0x0d1f30 },
    { x: 5.8,   z: -17.8, r: 4.8, h: 10.5, color: 0x162b40, emissive: 0x0a1826 },
    { x: 12.0,  z: -17.2, r: 5.5, h: 12.2, color: 0x132639, emissive: 0x081521 },
    // Lớp trung (Tím khói huyền ảo)
    { x: -8.5,  z: -22.0, r: 6.5, h: 15.5, color: 0x243b55, emissive: 0x142438 },
    { x: 0.0,   z: -23.5, r: 7.2, h: 14.0, color: 0x2a4461, emissive: 0x192b42 },
    { x: 9.2,   z: -22.5, r: 6.8, h: 16.0, color: 0x243b55, emissive: 0x142438 },
  ];

  mountainConfigs.forEach((cfg, idx) => {
    const geo = new THREE.ConeGeometry(cfg.r, cfg.h, 7, 4);
    // Biến dạng đỉnh núi tự nhiên như núi đá vôi Tràng An
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx = pos.getX(i);
      const vy = pos.getY(i);
      const vz = pos.getZ(i);
      const noise = Math.sin(vx * 1.5 + idx) * 0.45 + Math.cos(vz * 1.5) * 0.45;
      pos.setX(i, vx + noise);
      if (vy > 0) pos.setY(i, vy + noise * 0.6);
    }
    geo.computeVertexNormals();
    geo.computeBoundingBox?.();
    geo.computeBoundingSphere?.();

    const mat = new THREE.MeshStandardMaterial({
      color: cfg.color,
      emissive: cfg.emissive,
      roughness: 0.65,
      metalness: 0.2,
      flatShading: true
    });

    const peak = new THREE.Mesh(geo, mat);
    peak.position.set(cfg.x, cfg.h / 2 - 0.5, cfg.z);
    landscapeGroup.add(peak);
  });

  // C. Vầng trăng khổng lồ ("Vầng trăng vằng vặc giữa trời") & Đèn chiếu viền núi
  const moonGeo = new THREE.SphereGeometry(3.6, 32, 32);
  const moonMat = new THREE.MeshBasicMaterial({
    color: 0xfff3cc
  });
  const fullMoon = new THREE.Mesh(moonGeo, moonMat);
  fullMoon.position.set(0, 13.5, -26.5);
  landscapeGroup.add(fullMoon);

  // Hào quang quanh vầng trăng
  const moonGlowGeo = new THREE.PlaneGeometry(16, 16);
  const moonGlowMat = new THREE.MeshBasicMaterial({
    color: 0xffd27d,
    transparent: true,
    opacity: 0.28,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const moonGlow = new THREE.Mesh(moonGlowGeo, moonGlowMat);
  moonGlow.position.set(0, 13.5, -26.2);
  landscapeGroup.add(moonGlow);

  // Hệ thống đèn Rim-Light đánh bật khối núi và sương mù phía sau bình phong
  const mountainBackLight = new THREE.PointLight(0x88ccff, 8.0, 35);
  mountainBackLight.position.set(0, 12.0, -19.0);
  const mountainWarmLight = new THREE.PointLight(0xffbb55, 6.0, 30);
  mountainWarmLight.position.set(0, 4.5, -15.5);
  landscapeGroup.add(mountainBackLight, mountainWarmLight);

  vfxGroup.add(landscapeGroup);

  // =========================================================================
  // 3. MƯA HOA ĐÀO RƠI & KHÓI TRẦM ÁN THƯ
  // =========================================================================
  const petalCount = 160;
  const petalGeo = new THREE.BufferGeometry();
  const petalPositions = new Float32Array(petalCount * 3);
  const petalSpeeds = new Float32Array(petalCount);

  for (let i = 0; i < petalCount; i++) {
    petalPositions[i * 3] = (Math.random() - 0.5) * 14.0;     // X quanh 2 cây đào và thảm đỏ
    petalPositions[i * 3 + 1] = Math.random() * 6.5 + 0.5;   // Y độ cao
    petalPositions[i * 3 + 2] = (Math.random() - 0.5) * 14.0; // Z dọc phòng
    petalSpeeds[i] = 0.35 + Math.random() * 0.45;
  }

  petalGeo.setAttribute('position', new THREE.BufferAttribute(petalPositions, 3));
  const petalMat = new THREE.PointsMaterial({
    color: 0xff99bb,
    size: 0.11,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const petalParticles = new THREE.Points(petalGeo, petalMat);
  petalParticles.name = 'Peach_Blossom_Petals';
  petalParticles.userData = { speeds: petalSpeeds };
  vfxGroup.add(petalParticles);

  // Lưu tham chiếu để animate mỗi frame
  roomGroup.userData.cinematicVFX = {
    petalParticles,
    moonPath,
    pipaGroup
  };

  // Đánh dấu toàn bộ cây con không tham gia va chạm & gán Layer 1
  vfxGroup.traverse((child) => {
    child.userData.excludeFromCollision = true;
    child.layers.set(1);
    if (child.isMesh) {
      child.frustumCulled = false; // Đảm bảo núi và trăng phía sau luôn hiển thị
    }
  });

  roomGroup.add(vfxGroup);
}

// Hàm cập nhật chuyển động mượt mà mỗi frame
export function updateTruyenKieuVFX(roomGroup, delta, elapsedTime) {
  const vfx = roomGroup?.userData?.cinematicVFX;
  if (!vfx) return;
  if (vfx.lastUpdateTime === elapsedTime) return;
  vfx.lastUpdateTime = elapsedTime;

  // 1. Cánh hoa đào rơi lả tả & xoay theo gió
  const posAttr = vfx.petalParticles?.geometry?.attributes?.position;
  const speeds = vfx.petalParticles?.userData?.speeds;
  if (posAttr && speeds) {
    for (let i = 0; i < speeds.length; i++) {
      let x = posAttr.getX(i);
      let y = posAttr.getY(i);
      let z = posAttr.getZ(i);

      y -= speeds[i] * delta;
      x += Math.sin(elapsedTime * 1.2 + i) * 0.25 * delta;
      z += Math.cos(elapsedTime * 0.9 + i) * 0.15 * delta;

      if (y < 0.1) {
        y = 6.5;
        x = (Math.random() - 0.5) * 14.0;
      }
      posAttr.setXYZ(i, x, y, z);
    }
    posAttr.needsUpdate = true;
  }

  // 2. Mặt nước sông Tiền Đường lấp lánh ánh trăng
  if (vfx.moonPath?.material) {
    vfx.moonPath.material.opacity = 0.28 + Math.sin(elapsedTime * 2.0) * 0.08;
  }
}

// =========================================================================
// ĐẠI TU TOÀN DIỆN PHÒNG 01 - TRUYỆN KIỀU (CHUẨN ĐIỆN ẢNH Á ĐÔNG)
// =========================================================================

/**
 * Tạo Texture Tranh Lụa Thư Pháp & Thủy Mặc bằng Canvas 2D
 */
function createSilkScrollTexture(verseLine1, verseLine2, subtitle) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Nền lụa vàng hoàng gia ấm áp (chống cháy sáng trắng)
  const grad = ctx.createLinearGradient(0, 0, 0, 1024);
  grad.addColorStop(0, '#d8be8b');
  grad.addColorStop(0.5, '#f2dfb6');
  grad.addColorStop(1, '#cfa968');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 1024);

  // Viền gấm vàng kim kép
  ctx.strokeStyle = '#6e4715';
  ctx.lineWidth = 18;
  ctx.strokeRect(20, 20, 472, 984);
  ctx.strokeStyle = '#b8860b';
  ctx.lineWidth = 4;
  ctx.strokeRect(36, 36, 440, 952);

  // Vẽ núi non thủy mặc mờ ảo ở chân tranh
  ctx.fillStyle = 'rgba(45, 55, 72, 0.18)';
  ctx.beginPath();
  ctx.moveTo(36, 950);
  ctx.quadraticCurveTo(160, 720, 290, 860);
  ctx.quadraticCurveTo(390, 750, 476, 950);
  ctx.fill();

  // Vẽ mặt trời/trăng đỏ son
  ctx.fillStyle = 'rgba(180, 40, 30, 0.35)';
  ctx.beginPath();
  ctx.arc(256, 210, 55, 0, Math.PI * 2);
  ctx.fill();

  // Chữ thư pháp chính
  ctx.fillStyle = '#2b1704';
  ctx.font = 'italic bold 34px "Georgia", "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.fillText(verseLine1, 256, 420);
  ctx.fillText(verseLine2, 256, 480);

  // Triện đỏ & Phụ đề
  ctx.fillStyle = '#9e1b1b';
  ctx.fillRect(236, 560, 40, 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px serif';
  ctx.fillText('KIỀU', 256, 586);

  ctx.fillStyle = '#5c3c10';
  ctx.font = '22px serif';
  ctx.fillText(subtitle, 256, 660);

  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * Tạo Texture Gốm Sứ Men Lam Huế cho các bình gốm đang bị trắng trơn
 */
function createBluePorcelainTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#eef2f5';
  ctx.fillRect(0, 0, 512, 512);

  // Họa tiết cổ bình & chân bình men lam
  ctx.fillStyle = '#1b4b8a';
  ctx.fillRect(0, 40, 512, 28);
  ctx.fillRect(0, 440, 512, 32);

  // Họa tiết hoa sen & mây cổ điển
  ctx.strokeStyle = '#1e5799';
  ctx.lineWidth = 6;
  for (let x = 32; x < 512; x += 64) {
    ctx.beginPath();
    ctx.arc(x, 256, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, 120, 14, 0, Math.PI);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

/**
 * HÀM ĐẠI TU TOÀN DIỆN PHÒNG 01 (TRUYỆN KIỀU)
 */
export function overhaulTruyenKieuRoom(roomGroup) {
  if (!roomGroup) return;

  // Xóa bản cũ nếu đã gọi trước đó để tránh trùng lặp
  const oldOverhaul = roomGroup.getObjectByName('TruyenKieu_Master_Overhaul');
  if (oldOverhaul) roomGroup.remove(oldOverhaul);

  const masterGroup = new THREE.Group();
  masterGroup.name = 'TruyenKieu_Master_Overhaul';
  masterGroup.userData.excludeFromCollision = true;

  const porcelainTex = createBluePorcelainTexture();
  const screenTex = createSilkScrollTexture(
    'Trăm năm trong cõi người ta',
    'Chữ tài chữ mệnh khéo là ghét nhau',
    '— Nguyễn Du • Đoạn Trường Tân Thanh —'
  );

  // =========================================================================
  // 1. SỬA LỖI VẬT LIỆU CŨ: CHỐNG CHÁY SÁNG TƯỜNG TRẮNG & LÀM RÕ GỖ LIM, BÌNH GỐM
  // =========================================================================
  roomGroup.traverse((child) => {
    if (!child.isMesh || !child.material) return;

    const mats = Array.isArray(child.material) ? child.material : [child.material];
    const meshName = (child.name || '').toLowerCase();

    mats.forEach((mat, mIdx) => {
      if (!mat) return;

      // A. Khắc phục các mảng tường trắng lóa & bình phong cháy sáng
      if (mat.color && mat.color.r > 0.85 && mat.color.g > 0.85 && mat.color.b > 0.85) {
        // Nếu là bình gốm (hình trụ/cầu thấp gần thảm)
        if (child.position.y < 2.2 && (child.geometry?.type?.includes('Lathe') || meshName.includes('vase') || meshName.includes('binh') || meshName.includes('urn'))) {
          const newMat = new THREE.MeshStandardMaterial({
            map: porcelainTex,
            roughness: 0.12,
            metalness: 0.15
          });
          if (Array.isArray(child.material)) child.material[mIdx] = newMat;
          else child.material = newMat;
        } else if (child.position.y > 0.5 && Math.abs(child.position.z) < 11.0 && Math.abs(child.position.x) < 4.5) {
          // Nếu là tấm Bình Phong trung tâm bị trắng lóa -> Phủ lụa thư pháp
          const newMat = new THREE.MeshStandardMaterial({
            map: screenTex,
            color: 0xffeedd,
            emissive: 0x3a250a,
            emissiveIntensity: 0.25,
            roughness: 0.45
          });
          if (Array.isArray(child.material)) child.material[mIdx] = newMat;
          else child.material = newMat;
        } else if (Math.abs(child.position.x) > 5.0) {
          // Các ô tường trắng hai bên -> Chuyển sang màu sơn mài vàng kem trầm ấm
          const newMat = new THREE.MeshStandardMaterial({
            color: 0xd9c29c,
            emissive: 0x241708,
            emissiveIntensity: 0.2,
            roughness: 0.6,
            metalness: 0.05
          });
          if (Array.isArray(child.material)) child.material[mIdx] = newMat;
          else child.material = newMat;
        }
      }

      // B. Làm nổi bật cột gỗ lim và mặt sàn đang bị đen kịt
      if (mat.color && mat.color.r < 0.18 && mat.color.g < 0.15 && mat.color.b < 0.15) {
        mat.color.setHex(0x3b1e10); // Nâu đỏ gỗ lim Indochine
        mat.roughness = 0.22;       // Bóng mượt phản chiếu ánh đèn lồng
        mat.metalness = 0.15;
        mat.needsUpdate = true;
      }
    });
  });

  // =========================================================================
  // 2. HỆ THỐNG ÁNH SÁNG ĐIỆN ẢNH ẤM ÁP (XÓA BỎ VÙNG TỐI ĐEN KỊT)
  // =========================================================================
  const hemiFill = new THREE.HemisphereLight(0xffdca8, 0x3d2210, 1.35);
  hemiFill.position.set(0, 8, 0);
  masterGroup.add(hemiFill);

  // Dãy đèn hắt cột và tranh lụa hai bên hành lang
  const wallLightPositions = [
    [-7.5, 4.2, -2.0], [-7.5, 4.2, 3.5],
    [7.5, 4.2, -2.0],  [7.5, 4.2, 3.5]
  ];
  wallLightPositions.forEach(([lx, ly, lz]) => {
    const pLight = new THREE.PointLight(0xffaa44, 2.2, 12.0);
    pLight.position.set(lx, ly, lz);
    masterGroup.add(pLight);
  });

  // =========================================================================
  // 3. TREO 6 BỨC TRANH LỤA THƯ PHÁP LÊN CÁC Ô TƯỜNG TRẮNG HAI BÊN
  // =========================================================================
  const verses = [
    ['Long lanh đáy nước in trời', 'Thành xây khói biếc non phơi bóng vàng', 'Cảnh Ngày Xuân • Kiều Du Xuân'],
    ['Dưới trăng quyên đã gọi hè', 'Đầu tường lửa lựu lập lòe đơm bông', 'Tiết Thanh Minh • Kim Kiều Gặp Gỡ'],
    ['Trong như tiếng hạc bay qua', 'Đục như nước suối mới sa nửa vời', 'Tiếng Đàn Thúy Kiều • Đêm Thề Nguyền'],
    ['Vầng trăng ai xẻ làm đôi', 'Nửa in gối chiếc nửa soi dặm trường', 'Thúc Sinh Từ Biệt • Nỗi Nhớ Quê Nhà'],
    ['Buồn trông cửa bể chiều hôm', 'Thuyền ai thấp thoáng cánh buồm xa xa', 'Kiều Ở Lầu Ngưng Bích'],
    ['Sen tàn cúc lại nở hoa', 'Sầu dài ngày ngắn đông đà sang xuân', 'Đoàn Viên • Chữ Tâm Kia Mới Bằng Ba Chữ Tài']
  ];

  const scrollConfigs = [
    { x: -9.8, y: 3.3, z: -4.2, rotY: Math.PI / 2 },
    { x: -9.8, y: 3.3, z: 0.0,  rotY: Math.PI / 2 },
    { x: -9.8, y: 3.3, z: 4.2,  rotY: Math.PI / 2 },
    { x: 9.8,  y: 3.3, z: -4.2, rotY: -Math.PI / 2 },
    { x: 9.8,  y: 3.3, z: 0.0,  rotY: -Math.PI / 2 },
    { x: 9.8,  y: 3.3, z: 4.2,  rotY: -Math.PI / 2 }
  ];

  const rollerMat = new THREE.MeshStandardMaterial({ color: 0x3a1809, roughness: 0.3, metalness: 0.2 });
  const goldCapMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.2, metalness: 0.85 });

  scrollConfigs.forEach((cfg, idx) => {
    const [v1, v2, sub] = verses[idx];
    const tex = createSilkScrollTexture(v1, v2, sub);
    const scrollGroup = new THREE.Group();

    const bannerGeo = new THREE.PlaneGeometry(2.1, 4.0);
    const bannerMat = new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0x2b1b08,
      emissiveIntensity: 0.25,
      roughness: 0.4,
      side: THREE.DoubleSide
    });
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    scrollGroup.add(banner);

    // Thanh cuộn gỗ hai đầu tranh lụa
    const topRoller = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.3, 12), rollerMat);
    topRoller.rotation.z = Math.PI / 2;
    topRoller.position.y = 2.02;
    const botRoller = topRoller.clone();
    botRoller.position.y = -2.02;
    scrollGroup.add(topRoller, botRoller);

    scrollGroup.position.set(cfg.x, cfg.y, cfg.z);
    scrollGroup.rotation.y = cfg.rotY;
    masterGroup.add(scrollGroup);
  });

  // =========================================================================
  // 4. ĐẮP TÁN HOA ĐÀO RỰC RỠ LÊN CÂY ĐÀO TRƠ TRỤI & THÊM CÂY ĐỐI XỨNG
  // =========================================================================
  const blossomMat = new THREE.MeshStandardMaterial({
    color: 0xff8da6,
    emissive: 0x882244,
    emissiveIntensity: 0.45,
    roughness: 0.4
  });
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.7 });

  function createLushBlossomCanopy(centerX, centerY, centerZ) {
    const canopyGroup = new THREE.Group();
    const clusterGeo = new THREE.DodecahedronGeometry(0.28, 1);

    // 45 chùm hoa đào hồng phấn kết thành tán cây sum suê
    for (let i = 0; i < 45; i++) {
      const cluster = new THREE.Mesh(clusterGeo, blossomMat);
      const angle = (i / 45) * Math.PI * 6;
      const radius = 0.2 + Math.random() * 1.15;
      const heightOffset = (Math.random() - 0.3) * 1.1;
      cluster.position.set(
        Math.cos(angle) * radius,
        heightOffset,
        Math.sin(angle) * radius
      );
      const s = 0.6 + Math.random() * 0.85;
      cluster.scale.set(s, s * 0.75, s);
      cluster.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      canopyGroup.add(cluster);
    }
    canopyGroup.position.set(centerX, centerY, centerZ);
    return canopyGroup;
  }

  // Đắp tán hoa đào vào cây bên phải và tạo thêm cây đào đối xứng bên trái
  masterGroup.add(createLushBlossomCanopy(3.2, 2.35, -3.5));
  masterGroup.add(createLushBlossomCanopy(-3.2, 2.35, -3.5));

  // Thân cây đào cổ thụ bên trái (nếu bên trái đang thiếu thân cây)
  const leftTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 2.1, 10), trunkMat);
  leftTrunk.position.set(-3.2, 1.05, -3.5);
  masterGroup.add(leftTrunk);

  // =========================================================================
  // 5. CHẾ TÁC ĐÀN TỲ BÀ (PIPA) & LƯ HƯƠNG TRẦM BÊN BÀN ÁN THƯ TRUNG TÂM
  // =========================================================================
  const pipaGroup = new THREE.Group();
  pipaGroup.name = 'Dan_Ty_Ba_Kieu';

  const pipaWoodMat = new THREE.MeshStandardMaterial({ color: 0x521b0c, roughness: 0.2, metalness: 0.15 });
  const pipaFaceMat = new THREE.MeshStandardMaterial({ color: 0xe3b476, roughness: 0.3 });

  const bodyGeo = new THREE.SphereGeometry(0.24, 28, 20);
  bodyGeo.scale(1.0, 1.48, 0.3);
  const pipaBody = new THREE.Mesh(bodyGeo, pipaWoodMat);
  pipaBody.position.set(0, 0.58, 0);

  const faceGeo = new THREE.SphereGeometry(0.23, 28, 20);
  faceGeo.scale(0.96, 1.44, 0.12);
  const pipaFace = new THREE.Mesh(faceGeo, pipaFaceMat);
  pipaFace.position.set(0, 0.58, 0.05);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.035, 0.52, 12), pipaWoodMat);
  neck.position.set(0, 1.02, 0.01);

  pipaGroup.add(pipaBody, pipaFace, neck);

  // 4 dây tơ vàng óng
  for (let i = 0; i < 4; i++) {
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.76, 6), goldCapMat);
    str.position.set((i - 1.5) * 0.022, 0.82, 0.08);
    pipaGroup.add(str);
  }

  // Giá đỡ đàn chạm vàng
  const standBase = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.05, 20), pipaWoodMat);
  pipaGroup.add(standBase);

  pipaGroup.position.set(1.25, 0.18, -3.2);
  pipaGroup.rotation.set(-0.2, -0.45, -0.12);
  masterGroup.add(pipaGroup);

  // =========================================================================
  // 6. CẢNH SÔNG TIỀN ĐƯỜNG, NÚI TRÀNG AN & VẦNG TRĂNG THỀ SAU LAN CAN
  // =========================================================================
  const backdropGroup = new THREE.Group();
  backdropGroup.name = 'Moonlit_Landscape_Backdrop';

  // Mặt nước hồ sen phản chiếu phía sau lan can trắng
  const waterGeo = new THREE.PlaneGeometry(42, 22);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0b1d33,
    emissive: 0x061324,
    roughness: 0.06,
    metalness: 0.88
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.05, -18.5);
  backdropGroup.add(water);

  // Ánh trăng dát vàng chảy dài trên mặt nước
  const moonReflection = new THREE.Mesh(
    new THREE.PlaneGeometry(4.8, 16),
    new THREE.MeshBasicMaterial({
      color: 0xffdd88,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  moonReflection.rotation.x = -Math.PI / 2;
  moonReflection.position.set(0, 0.08, -17.0);
  backdropGroup.add(moonReflection);

  // Vầng trăng tròn khổng lồ tỏa hào quang ấm áp
  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(3.4, 32, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff4d2 })
  );
  moonMesh.position.set(0, 11.5, -24.5);
  backdropGroup.add(moonMesh);

  const moonHalo = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 15),
    new THREE.MeshBasicMaterial({
      color: 0xffc866,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  moonHalo.position.set(0, 11.5, -24.0);
  backdropGroup.add(moonHalo);

  // Đèn chiếu sáng viền núi phía sau lan can
  const vistaLight = new THREE.PointLight(0x77bbff, 6.5, 32);
  vistaLight.position.set(0, 9.0, -16.5);
  backdropGroup.add(vistaLight);

  masterGroup.add(backdropGroup);

  // =========================================================================
  // 7. MƯA CÁNH HOA ĐÀO MỊN MÀNG (THAY THẾ CÁC ĐỐM CAM LƠ LỬNG THÔ KỆCH)
  // =========================================================================
  const petalCount = 180;
  const petalGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(petalCount * 3);
  const speeds = new Float32Array(petalCount);

  for (let i = 0; i < petalCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 15.0;
    positions[i * 3 + 1] = Math.random() * 6.5 + 0.5;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 14.0;
    speeds[i] = 0.35 + Math.random() * 0.4;
  }
  petalGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const petalMat = new THREE.PointsMaterial({
    color: 0xff9eb5,
    size: 0.09,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  const petals = new THREE.Points(petalGeo, petalMat);
  petals.userData = { speeds };
  masterGroup.add(petals);

  // Đảm bảo toàn bộ hệ thống mới KHÔNG bao giờ gây kẹt va chạm & gán Layer 1
  masterGroup.traverse((obj) => {
    obj.userData.excludeFromCollision = true;
    obj.layers.set(1);
    if (obj.isMesh) {
      obj.frustumCulled = false;
    }
  });

  roomGroup.userData.truyenKieuOverhaul = { petals, moonReflection };
  roomGroup.add(masterGroup);
}

/**
 * Hàm cập nhật chuyển động trong vòng lặp animate()
 */
export function updateTruyenKieuCinematic(roomGroup, delta, elapsedTime) {
  const data = roomGroup?.userData?.truyenKieuOverhaul;
  if (!data) return;
  if (data.lastUpdateTime === elapsedTime) return;
  data.lastUpdateTime = elapsedTime;

  const pos = data.petals?.geometry?.attributes?.position;
  const speeds = data.petals?.userData?.speeds;
  if (pos && speeds) {
    for (let i = 0; i < speeds.length; i++) {
      let x = pos.getX(i) + Math.sin(elapsedTime * 1.3 + i) * 0.22 * delta;
      let y = pos.getY(i) - speeds[i] * delta;
      let z = pos.getZ(i) + Math.cos(elapsedTime * 1.0 + i) * 0.15 * delta;
      if (y < 0.1) y = 6.5;
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
  }

  if (data.moonReflection?.material) {
    data.moonReflection.material.opacity = 0.3 + Math.sin(elapsedTime * 2.2) * 0.08;
  }
}

// =========================================================================
// LÁT SÀN GỖ LIM ĐÔNG DƯƠNG & CHỐNG CHÁY SÁNG PHÒNG 01 (HERRINGBONE PARQUET)
// =========================================================================

/**
 * Tạo Texture Sàn Gỗ Lim Đông Dương (kèm Bump/Roughness Map chống lóa đốm vàng)
 */
function createIndochineWoodFloorTextures() {
  const size = 1024;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d');

  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = size;
  roughCanvas.height = size;
  const rCtx = roughCanvas.getContext('2d');

  // Nền gỗ lim nâu trầm ấm
  ctx.fillStyle = '#2d160b';
  ctx.fillRect(0, 0, size, size);

  rCtx.fillStyle = '#888888';
  rCtx.fillRect(0, 0, size, size);

  const plankW = 128;
  const plankH = 256;
  const palette = ['#381c0e', '#2e160a', '#422212', '#33190c', '#4a2615'];

  for (let y = 0; y < size; y += plankH) {
    for (let x = 0; x < size; x += plankW) {
      const shiftY = ((x / plankW) % 2) * (plankH / 2);
      const py = (y + shiftY) % size;

      // Màu từng thanh gỗ
      ctx.fillStyle = palette[(x + y) % palette.length];
      ctx.fillRect(x, py, plankW, plankH);

      // Vân gỗ tự nhiên dọc theo thớ
      ctx.strokeStyle = 'rgba(20, 8, 2, 0.32)';
      ctx.lineWidth = 2;
      for (let g = 8; g < plankW; g += 14) {
        ctx.beginPath();
        ctx.moveTo(x + g, py);
        ctx.bezierCurveTo(
          x + g + 6, py + plankH * 0.33,
          x + g - 6, py + plankH * 0.66,
          x + g, py + plankH
        );
        ctx.stroke();
      }

      // Đường ron/rãnh ghép giữa các thanh gỗ (chỉ vàng đồng mảnh kết hợp khe tối)
      ctx.strokeStyle = '#140803';
      ctx.lineWidth = 4;
      ctx.strokeRect(x, py, plankW, plankH);

      // Roughness map: Rãnh gỗ nhám hơn, bề mặt thanh gỗ bóng dịu vừa phải
      const roughVal = 115 + ((x * 3 + y * 7) % 35);
      rCtx.fillStyle = `rgb(${roughVal}, ${roughVal}, ${roughVal})`;
      rCtx.fillRect(x + 3, py + 3, plankW - 6, plankH - 6);
      rCtx.strokeStyle = '#ffffff';
      rCtx.lineWidth = 4;
      rCtx.strokeRect(x, py, plankW, plankH);
    }
  }

  const colorMap = new THREE.CanvasTexture(colorCanvas);
  colorMap.wrapS = THREE.RepeatWrapping;
  colorMap.wrapT = THREE.RepeatWrapping;
  colorMap.repeat.set(8, 8);
  colorMap.anisotropy = 8;

  const roughMap = new THREE.CanvasTexture(roughCanvas);
  roughMap.wrapS = THREE.RepeatWrapping;
  roughMap.wrapT = THREE.RepeatWrapping;
  roughMap.repeat.set(8, 8);

  return { colorMap, roughMap };
}

/**
 * Tạo Texture Thảm Dệt Hoa Văn Hoàng Gia chạy dọc lối đi giữa
 */
function createRoyalCarpetRunnerTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Nền đỏ nhung trầm (không bị chói)
  ctx.fillStyle = '#5e141c';
  ctx.fillRect(0, 0, 512, 1024);

  // Đường viền kim tuyến vàng cổ điển hai bên mép thảm
  ctx.fillStyle = '#b88938';
  ctx.fillRect(18, 0, 14, 1024);
  ctx.fillRect(480, 0, 14, 1024);
  ctx.fillRect(40, 0, 4, 1024);
  ctx.fillRect(468, 0, 4, 1024);

  // Họa tiết hoa sen cách điệu dọc tâm thảm
  ctx.strokeStyle = 'rgba(212, 165, 85, 0.45)';
  ctx.lineWidth = 4;
  for (let y = 64; y < 1024; y += 128) {
    ctx.beginPath();
    ctx.arc(256, y, 36, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(256, y, 18, 0, Math.PI * 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 3);
  return tex;
}

/**
 * HÀM XỬ LÝ TRIỆT ĐỂ SÀN NHÀ & ÁNH SÁNG BỊ CHÁY (OVEREXPOSURE)
 */
export function fixFloorAndLightingRoom01(roomGroup, scene, renderer, bloomPass) {
  if (!roomGroup) return;

  // 1. HẠ TONE MAPPING & GIẢM BLOOM QUÁ GẮT ĐỂ HẾT LÓA TRẮNG
  if (renderer) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.78; // Hạ độ phơi sáng tổng thể để giữ chi tiết vùng sáng
  }
  if (bloomPass) {
    bloomPass.threshold = 0.88; // Chỉ những nguồn đèn thật sự sáng mới phát hào quang
    bloomPass.strength = 0.28;  // Giảm mạnh độ nhòe sáng gây mù chữ trên tranh
    bloomPass.radius = 0.35;
  }

  const { colorMap: woodMap, roughMap: woodRough } = createIndochineWoodFloorTextures();
  const carpetTex = createRoyalCarpetRunnerTexture();

  const luxuryWoodFloorMat = new THREE.MeshStandardMaterial({
    map: woodMap,
    roughnessMap: woodRough,
    bumpMap: woodRough,
    bumpScale: 0.015,
    color: 0x9e7256,
    roughness: 0.58, // Độ nhám chuẩn để tán xạ ánh đèn mềm mại, xóa bỏ đốm vàng gắt
    metalness: 0.08
  });

  // 2. DUYỆT QUA CÁC MESH VÀ ĐÈN TRONG PHÒNG ĐỂ SỬA VẬT LIỆU & HẠ ĐÈN CHÁY
  roomGroup.traverse((child) => {
    // A. Hạ cường độ toàn bộ đèn PointLight / SpotLight đang gây cháy sáng
    if (child.isLight) {
      if (child.isPointLight) {
        child.intensity = Math.min(child.intensity, 0.85); // Kìm hãm đèn điểm quá gắt
        child.distance = 14.0;
        child.decay = 2.0; // Suy hao vật lý tự nhiên, không gây đốm tròn gắt dưới sàn
      } else if (child.isSpotLight) {
        child.intensity = Math.min(child.intensity, 1.2);
        child.penumbra = 0.85; // Làm mềm viền đèn rọi
      } else if (child.isHemisphereLight) {
        child.intensity = 0.65;
      } else if (child.isDirectionalLight) {
        child.intensity = Math.min(child.intensity, 1.2);
      }
    }

    if (!child.isMesh || !child.material) return;
    const mats = Array.isArray(child.material) ? child.material : [child.material];

    // B. Xử lý các tấm phẳng nằm dưới đất (Y < 0.25): Sàn nhà, thảm, và các mảng vuông bị trắng lóa
    if (child.position.y < 0.25) {
      const box = new THREE.Box3().setFromObject(child);
      const size = new THREE.Vector3();
      box.getSize(size);

      // Nếu là tấm sàn lớn của căn phòng
      if (size.x > 12.0 && size.z > 12.0 && size.y < 0.6) {
        child.material = luxuryWoodFloorMat;
        child.receiveShadow = true;
        return;
      }

      // Nếu là tấm thảm dài ở giữa
      if (Math.abs(child.position.x) < 1.0 && size.z > 6.0 && size.x < 4.5) {
        child.material = new THREE.MeshStandardMaterial({
          map: carpetTex,
          roughness: 0.82, // Vải nhung lì không bóng lóa
          metalness: 0.05
        });
        return;
      }

      // Nếu là các mảng đế vuông dưới chân cây đào / bục đang bị lóa trắng xóa
      const isWhiteBase = mats.some(m => m && m.color && (m.color.r > 0.6 || (m.emissive && m.emissive.r > 0.1)));
      if (size.y < 0.4 && isWhiteBase) {
        child.material = new THREE.MeshStandardMaterial({
          color: 0x3b2314, // Chuyển thành bệ gỗ mun/đồng trầm sang trọng
          roughness: 0.65,
          metalness: 0.25,
          emissive: 0x000000,
          emissiveIntensity: 0
        });
        return;
      }
    }

    mats.forEach(mat => {
      if (!mat) return;

      // C. Chữa cháy sáng cho các bức tường, tranh lụa và bình phong
      if (mat.emissive) {
        // Nếu không phải đèn lồng trên cao hay mặt trăng phía xa thì tắt/giảm mạnh emissive
        if (child.position.y < 5.2 && child.position.z > -16.0) {
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0.0;
        }
      }

      // Hạ độ chói của các mảng tường trắng/vàng sáng hai bên
      if (mat.color && mat.color.r > 0.75 && mat.color.g > 0.7 && child.position.y > 0.5 && child.position.z > -15.0) {
        mat.color.setHex(0xb89b72); // Màu lụa trầm cổ điển, ăn đèn vừa vặn không bị lóa trắng
        mat.roughness = 0.75;       // Bề mặt lụa/giấy dó mờ, chống phản xạ chói mắt
        mat.metalness = 0.02;
        mat.needsUpdate = true;
      }

      // Giữ độ nhám vừa phải cho cột gỗ để thấy rõ khối tròn mà không bị đen kịt
      if (child.geometry && child.geometry.type && child.geometry.type.includes('Cylinder') && child.position.y > 1.0) {
        mat.color.setHex(0x4a2512);
        mat.roughness = 0.45;
        mat.metalness = 0.1;
        mat.needsUpdate = true;
      }
    });
  });

  // 3. TẠO LỚP SÀN GỖ LIM ĐÔNG DƯƠNG CHUẨN XÁC (Đảm bảo 100% có vân gỗ dù mesh sàn cũ bị ẩn)
  const existingCustomFloor = roomGroup.getObjectByName('Indochine_Parquet_Floor_Mesh');
  if (existingCustomFloor) roomGroup.remove(existingCustomFloor);

  const floorGeo = new THREE.PlaneGeometry(23.6, 24.6);
  const customFloor = new THREE.Mesh(floorGeo, luxuryWoodFloorMat);
  customFloor.name = 'Indochine_Parquet_Floor_Mesh';
  customFloor.rotation.x = -Math.PI / 2;
  customFloor.position.set(0, 0.082, 0); // Nằm ngay trên mặt cốt sàn để hiển thị vân gỗ sắc nét
  customFloor.receiveShadow = true;
  customFloor.userData.excludeFromCollision = true;
  customFloor.layers.set(1);
  roomGroup.add(customFloor);
}

/**
 * HÀM DỌN DẸP CỤC TRÒN ĐEN CHẮN TẦM NHÌN & TÁI CẤU TRÚC PHÒNG TRUYỆN KIỀU VỚI MODEL GLB MỚI
 */
export function redesignTruyenKieuWithHeroModel(roomGroup, modelUrl = '/models/truyen_kieu_hero.glb') {
  if (!roomGroup) return;

  const toRemove = [];
  let vaseIndex = 0;

  // 1. QUÉT VÀ XÓA CỤC VÒNG TRÒN ĐEN CHẮN TẦM NHÌN + GOD-RAYS ĐỤC + CẦU HỒNG NHỰA
  roomGroup.traverse((child) => {
    if (!child.isMesh) return;

    // Không đụng vào model GLB mới nếu đã load
    if (child.userData.isHeroGLB) return;

    const geoType = child.geometry ? child.geometry.type : '';
    const box = new THREE.Box3().setFromObject(child);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    const mat = child.material;
    const isTransparentCone = mat && mat.transparent && mat.opacity < 0.6 && size.y > 2.0;

    // A. Xóa cục vòng tròn/hình trụ đen nằm chắn ngang tầm mắt ở khu vực giữa phòng
    const isCentralFloatingBlocker =
      Math.abs(child.position.x) < 4.5 &&
      child.position.z > -8.0 &&
      child.position.z < 4.0 &&
      child.position.y > 0.45 &&
      child.position.y < 4.5 &&
      (geoType.includes('Cylinder') || geoType.includes('Circle') || geoType.includes('Ring') || geoType.includes('Sphere') || (size.x > 1.8 && size.z > 1.8 && size.y < 1.5));

    // B. Xóa các khối cầu hồng phấn giả lập (Dodecahedron / Icosahedron) và nón God-Ray đục trên trần
    const isPlasticBlossomOrCone =
      geoType.includes('Dodecahedron') ||
      geoType.includes('Icosahedron') ||
      (geoType.includes('Cone') && child.position.y > 2.5 && Math.abs(child.position.x) < 5.0 && child.position.z > -12.0) ||
      isTransparentCone;

    if (isCentralFloatingBlocker || isPlasticBlossomOrCone) {
      toRemove.push(child);
      return;
    }

    // C. Dời các bình gốm trắng/xanh sang hai bên mép thảm để mở thoáng trục nhìn chính diện
    const nameLower = (child.name || '').toLowerCase();
    const parentNameLower = (child.parent?.name || '').toLowerCase();
    const isVase = geoType.includes('Lathe') ||
      nameLower.includes('vase') || nameLower.includes('urn') || nameLower.includes('binh') ||
      parentNameLower.includes('vase') || parentNameLower.includes('urn') || parentNameLower.includes('binh');

    if (isVase && child.position.y < 2.0) {
      const targetObj = (child.parent && child.parent !== roomGroup && (parentNameLower.includes('urn') || parentNameLower.includes('vase') || parentNameLower.includes('binh')))
        ? child.parent
        : child;
      if (!targetObj.userData.vaseRepositioned) {
        targetObj.userData.vaseRepositioned = true;
        const sideX = vaseIndex % 2 === 0 ? -4.2 : 4.2;
        const sideZ = -1.5 - Math.floor(vaseIndex / 2) * 3.8;
        targetObj.position.set(sideX, targetObj.position.y, sideZ);
        vaseIndex++;
      }
    }
  });

  // Thực thi xóa các vật cản khỏi phòng
  toRemove.forEach((mesh) => {
    if (mesh.parent) mesh.parent.remove(mesh);
  });

  // Cũng xóa nhóm Canopy cũ nếu có
  const oldOverhaul = roomGroup.getObjectByName('TruyenKieu_Master_Overhaul');
  if (oldOverhaul) {
    const subRemove = [];
    oldOverhaul.traverse((c) => {
      if (c.isMesh && (c.geometry?.type?.includes('Dodecahedron') || (c.geometry?.type?.includes('Cylinder') && c.position.y > 0.5 && c.position.y < 3.5))) {
        subRemove.push(c);
      }
    });
    subRemove.forEach((c) => c.parent && c.parent.remove(c));
  }

  // 2. DỰNG BỆ GỖ LIM THẤP SANG TRỌNG & TÍCH HỢP MODEL GLB MỚI VÀO TRUNG TÂM
  const oldCenterpiece = roomGroup.getObjectByName('TruyenKieu_Hero_Centerpiece');
  if (oldCenterpiece) {
    let alreadyHasHero = false;
    oldCenterpiece.traverse((c) => {
      if (c.userData.isHeroGLB) alreadyHasHero = true;
    });
    if (alreadyHasHero) return;
    roomGroup.remove(oldCenterpiece);
  }

  const centerpieceGroup = new THREE.Group();
  centerpieceGroup.name = 'TruyenKieu_Hero_Centerpiece';
  centerpieceGroup.position.set(0, 0.02, -3.2); // Đặt ngay tâm điểm cuối thảm đỏ
  centerpieceGroup.userData.excludeFromCollision = true;

  // Bệ trưng bày thấp (cao 0.28m) viền đồng vàng, tuyệt đối không chắn tầm mắt
  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x2b140a,
    roughness: 0.35,
    metalness: 0.15
  });
  const goldRimMat = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.25,
    metalness: 0.85
  });

  const baseStep1 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 2.6), plinthMat);
  baseStep1.position.y = 0.06;
  const baseStep2 = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.16, 2.2), plinthMat);
  baseStep2.position.y = 0.20;
  const goldTrim = new THREE.Mesh(new THREE.BoxGeometry(2.96, 0.03, 2.26), goldRimMat);
  goldTrim.position.y = 0.28;

  centerpieceGroup.add(baseStep1, baseStep2, goldTrim);

  // Hệ thống đèn chiếu điểm (SpotLight & Fill Light) tôn vinh riêng Model GLB mới
  const keyLight = new THREE.PointLight(0xfff0dd, 2.4, 9.0, 1.5);
  keyLight.position.set(0, 3.2, 1.8);
  const rimLight = new THREE.PointLight(0xffb86c, 1.8, 8.0, 1.5);
  rimLight.position.set(0, 2.6, -2.2);

  const spotTarget = new THREE.Object3D();
  spotTarget.position.set(0, 0.5, 0);
  centerpieceGroup.add(spotTarget);

  const heroSpot = new THREE.SpotLight(0xfffaed, 4.0, 12.0, Math.PI / 4, 0.35, 1.2);
  heroSpot.position.set(0, 5.0, 1.2);
  heroSpot.target = spotTarget;
  heroSpot.castShadow = true;
  heroSpot.shadow.bias = -0.001;
  heroSpot.shadow.mapSize.width = 512;
  heroSpot.shadow.mapSize.height = 512;

  centerpieceGroup.add(keyLight, rimLight, heroSpot);

  // 3. LOAD FILE GLB CỦA BẠN VÀ TỐI ƯU HÓA VẬT LIỆU PBR
  const loader = new GLTFLoader();
  loader.load(
    modelUrl,
    (gltf) => {
      const model = gltf.scene;

      // Tính toán kích thước thật của model để tự động căn giữa và đặt vừa vặn trên bệ
      const box = new THREE.Box3().setFromObject(model);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      // Quy chuẩn kích thước hiển thị nổi bật ~ 2.2m chiều rộng/cao
      const maxDim = Math.max(size.x, size.y, size.z);
      const targetSize = 2.2;
      const scale = maxDim > 0 ? targetSize / maxDim : 1.0;
      model.scale.setScalar(scale);

      // Đưa tâm đáy của model đặt chuẩn xác lên mặt bệ (Y = 0.29m)
      const scaledBox = new THREE.Box3().setFromObject(model);
      const scaledCenter = new THREE.Vector3();
      scaledBox.getCenter(scaledCenter);

      model.position.x = -scaledCenter.x;
      model.position.y = 0.29 - scaledBox.min.y;
      model.position.z = -scaledCenter.z;

      // Quan trọng: Sửa lỗi metallicFactor = 1.0 trong file GLB khiến model bị tối đen
      model.traverse((child) => {
        child.userData.excludeFromCollision = true;
        child.userData.isHeroGLB = true;
        child.layers.enable(1);

        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          if (child.material) {
            // Giữ nguyên 100% baseColorTexture, normalTexture, metallicRoughnessTexture của file GLB
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((mat) => {
              if (!mat) return;
              mat.metalness = 0.18; // Chỉnh metalness = 0.18 để model sáng rõ không bị đen PBR
              mat.roughness = 0.55; // Chỉnh roughness = 0.55
              if (mat.map) {
                mat.map.colorSpace = THREE.SRGBColorSpace;
              }
              mat.needsUpdate = true;
            });
          }
        }
      });

      centerpieceGroup.add(model);

      // Đăng ký tương tác Raycasting click cho Model trung tâm Phòng 01
      registerInteractiveBook(model, new THREE.Vector3(0, 150, 0), {
        id: 'truyen_kieu',
        title: 'TRUYỆN KIỀU – NGUYỄN DU',
        author: 'Đại thi hào Nguyễn Du (1765 – 1820)',
        genre: 'Truyện thơ Nôm (Văn học Trung đại)',
        quote: 'Đoạn trường tân thanh – Khúc ca bi tráng về tài mệnh tương đố và khát vọng tự do.',
        targetZoneId: 1,
        themeColor: 0x39e58c,
        portalReady: true
      });
    },
    undefined,
    (err) => {
      console.error('Không tìm thấy file GLB tại ' + modelUrl, err);
    }
  );

  centerpieceGroup.traverse((obj) => {
    obj.userData.excludeFromCollision = true;
    obj.layers.enable(1);
  });

  roomGroup.add(centerpieceGroup);
}

export default RoomDecorator;
