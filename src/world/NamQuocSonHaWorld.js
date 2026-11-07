import * as THREE from 'three';

/**
 * NAM QUỐC SƠN HÀ NARRATIVE WORLD: PHÂN CẢNH 3D PHÒNG TUYẾN SÔNG NHƯ NGUYỆT (1077)
 * Lead Architect & Art Director WebGL Specification
 * 
 * Cao độ biệt lập: Y = 150m, Tọa độ X = 320m, Z = 0m (Cách ly hoàn toàn khỏi Sảnh Bảo Tàng và Cõi Kiều)
 * 
 * PHÂN CẢNH TỰ SỰ ĐIỆN ẢNH:
 * 1. DÒNG SÔNG NHƯ NGUYỆT ĐÊM CHIẾN TRẬN:
 *    - Mặt nước sông đêm huyền ảo phản chiếu ánh trăng bạc, làn sương mờ ảo trôi là đà.
 *    - Hàng cọc gỗ phòng tuyến vót nhọn cắm dưới lòng sông ngăn chiến thuyền giặc Tống.
 * 
 * 2. BỜ CHIẾN LŨY & ĐẠI BẢN DOANH LÝ THƯỜNG KIỆT:
 *    - Bờ lũy đất kiên cố, hàng rào tre chông gai, doanh trại quân Đại Việt.
 *    - Cờ ngũ sắc thêu rồng triều Lý tung bay kiêu hãnh trong gió đêm.
 *    - Đuốc chiến lũy bập bùng soi rực bờ sông cùng các tàn lửa bay lơ lửng.
 *    - Soái thuyền rồng cổ đại uy nghi neo bên bến sông.
 * 
 * 3. BẢN THẦN THI ĐẾ VƯƠNG HIỂN LINH GIỮA TRỜI ĐÊM (CELESTIAL STELE & RUNE RING):
 *    - Bức Thiên Thư khổng lồ phát hào quang vàng kim chấn động hư không, khắc 4 câu thơ bất hủ:
 *      "Nam quốc sơn hà Nam đế cư / Tiệt nhiên định phận tại thiên thư / Như hà nghịch lỗ lai xâm phạm / Nhữ đẳng hành khan thủ bại hư."
 * 
 * 4. CỔNG HỒI QUY (PORTAL RETURN WAYPOINT) & HUD THOÁT RA BẢO TÀNG:
 *    - Cổng xoay ánh sáng đa chiều cho phép người chơi bước vào hoặc bấm nút thoát về Sảnh Bảo Tàng an toàn.
 *    - Ẩn toàn bộ `atriumGroup` khi ở trong cõi Như Nguyệt để khóa chặt hiệu năng 60 FPS.
 */

export const NAM_QUOC_WORLD_ORIGIN = new THREE.Vector3(320, 150, 0);

export class NamQuocSonHaStoryWorld {
  constructor(scene = null, camera = null, cameraManager = null, atriumGroup = null, options = {}) {
    this.scene = scene;
    this.camera = camera;
    this.cameraManager = cameraManager;
    this.cameraController = cameraManager?.cameraController || null;
    this.renderer = options.renderer || cameraManager?.cameraController?.renderer || null;
    this.atriumGroup = atriumGroup;

    this.group = new THREE.Group();
    this.group.name = "NamQuocSonHa_Narrative_World_Master";
    this.group.position.copy(NAM_QUOC_WORLD_ORIGIN);

    this.isInsideWorld = false;
    this.savedCameraPos = new THREE.Vector3();
    this.savedCameraTarget = new THREE.Vector3();
    this.savedFog = null;
    this.savedBackground = null;
    this.savedExposure = 1.0;

    // Visual items
    this.celestialStele = null;
    this.runeRing = null;
    this.waterMesh = null;
    this.fireEmbers = null;
    this.emberData = [];
    this.emberCount = 16; // PERFORMANCE: Giảm 50% tàn lửa (32 -> 16)
    this.particleFrameCounter = 0;
    this.flags = [];
    this.worldLights = [];

    // Tọa độ đứng ngắm cảnh chuẩn điện ảnh
    this.viewCameraPos = new THREE.Vector3(320, 153.2, 18.0);
    this.viewTargetPos = new THREE.Vector3(320, 154.5, -12.0);
    this._room2Pos = new THREE.Vector3(-44.5, 11.8, -19.0);
    this._room2Look = new THREE.Vector3(-48.0, 11.2, -19.0);

    try {
      this.initEnvironmentAndTerrain();
      this.initRiverAndDefenseStakes();
      this.initMilitaryFortressAndBanners();
      this.initCelestialProclamationMonolith();
      this.initReturnPortalWaypoint();
      this.initNarrativeLighting();
      this.initFireEmbersVFX();
      this.initUIOverlay();

      // ĐÓNG BĂNG MA TRẬN & ÉP FRONTSIDE CHO TOÀN BỘ VẬT THỂ TĨNH
      let frozenCount = 0;
      this.group.traverse((c) => {
        if (c.isMesh || c.isGroup) {
          c.updateMatrix();
          c.matrixAutoUpdate = false;
          c.frustumCulled = true;
          frozenCount++;
        }
        if (c.isMesh && c.material) {
          const meshName = (c.name || '').toLowerCase();
          const isThinSurface = meshName.includes('flag') || meshName.includes('banner') ||
            meshName.includes('scroll') || meshName.includes('portal') || meshName.includes('disc') ||
            meshName.includes('label') || meshName.includes('rune') || meshName.includes('ring');
          const mats = Array.isArray(c.material) ? c.material : [c.material];
          mats.forEach(mat => {
            if (mat && !isThinSurface && mat.side === THREE.DoubleSide) {
              mat.side = THREE.FrontSide;
              mat.needsUpdate = true;
            }
          });
        }
      });
      console.log(`%c[NAM QUOC PERF] Đã đóng băng matrixAutoUpdate & ép FrontSide cho ${frozenCount} objects!`, "color: #f1c40f; font-weight: bold;");
      
      this.group.visible = false;
      if (this.scene) {
        this.scene.add(this.group);
      }

      console.log("%c✓ NamQuocSonHaStoryWorld initialized • Thế giới Sông Như Nguyệt sẵn sàng!", "color: #f1c40f; font-weight: bold;");
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi tạo NamQuocSonHaStoryWorld:", err);
    }
  }

  prepareGeometry(geo) {
    if (!geo) return;
    try {
      geo.computeVertexNormals?.();
      geo.computeBoundingBox?.();
      geo.computeBoundingSphere?.();
    } catch (e) {}
  }

  // =========================================================================
  // 1. MẶT ĐẤT CHIẾN LŨY & ĐỊA HÌNH BỜ SÔNG
  // =========================================================================
  initEnvironmentAndTerrain() {
    // A. Bờ thành lũy đất đắp (Rộng 120m x Sâu 50m)
    const bankGeo = new THREE.BoxGeometry(110, 3.5, 45);
    this.prepareGeometry(bankGeo);
    const bankMat = new THREE.MeshStandardMaterial({
      color: 0x221810,
      roughness: 0.9,
      metalness: 0.05
    });
    const bankMesh = new THREE.Mesh(bankGeo, bankMat);
    bankMesh.position.set(0, 1.75, 18);
    bankMesh.receiveShadow = true;
    this.group.add(bankMesh);

    // B. Dãy hàng rào tre chông gai phòng thủ biên ải - OPTIMIZED: InstancedMesh (1 Draw Call thay vì 27)
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x4a3b2c, roughness: 0.8 });
    const spikeGeo = new THREE.CylinderGeometry(0.04, 0.12, 2.6, 6);
    this.prepareGeometry(spikeGeo);
    const spikeXPositions = [];
    for (let x = -45; x <= 45; x += 3.5) {
      spikeXPositions.push(x);
    }
    const fenceInstanced = new THREE.InstancedMesh(spikeGeo, fenceMat, spikeXPositions.length);
    const dummySpike = new THREE.Object3D();
    spikeXPositions.forEach((x, idx) => {
      dummySpike.position.set(x, 4.2, -3.5);
      dummySpike.rotation.set(-Math.PI * 0.15, 0, 0);
      dummySpike.updateMatrix();
      fenceInstanced.setMatrixAt(idx, dummySpike.matrix);
    });
    fenceInstanced.instanceMatrix.needsUpdate = true;
    fenceInstanced.computeBoundingSphere();
    fenceInstanced.frustumCulled = true;
    this.group.add(fenceInstanced);
  }

  // =========================================================================
  // 2. MẶT NƯỚC SÔNG NHƯ NGUYỆT & BÃI CỌC PHÒNG TUYẾN
  // =========================================================================
  initRiverAndDefenseStakes() {
    // A. Mặt nước sông đêm huyền ảo phản chiếu trăng bạc (120m x 80m)
    const waterGeo = new THREE.PlaneGeometry(120, 80, 32, 32);
    this.prepareGeometry(waterGeo);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x0a1c2a,
      roughness: 0.12,
      metalness: 0.65,
      transparent: true,
      opacity: 0.92,
      depthWrite: false
    });
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.rotation.x = -Math.PI * 0.5;
    this.waterMesh.position.set(0, 0.45, -28);
    this.waterMesh.receiveShadow = true;
    this.group.add(this.waterMesh);

    // B. Bãi cọc gỗ phòng tuyến vót nhọn cắm dưới lòng sông
    const stakeMat = new THREE.MeshStandardMaterial({
      color: 0x2e2016,
      roughness: 0.85
    });

    const stakePositions = [
      { x: -30, z: -18, h: 3.2, rotX: 0.15, rotZ: 0.1 },
      { x: -22, z: -25, h: 2.8, rotX: -0.1, rotZ: 0.15 },
      { x: -14, z: -20, h: 3.4, rotX: 0.12, rotZ: -0.08 },
      { x: -5, z: -28, h: 3.0, rotX: -0.15, rotZ: 0.12 },
      { x: 4, z: -22, h: 3.5, rotX: 0.18, rotZ: 0.1 },
      { x: 15, z: -26, h: 2.9, rotX: -0.12, rotZ: -0.15 },
      { x: 24, z: -19, h: 3.3, rotX: 0.1, rotZ: 0.12 },
      { x: 32, z: -27, h: 3.1, rotX: -0.14, rotZ: 0.08 }
    ];

    stakePositions.forEach((s, idx) => {
      const stakeGeo = new THREE.CylinderGeometry(0.06, 0.18, s.h, 8);
      this.prepareGeometry(stakeGeo);
      const stake = new THREE.Mesh(stakeGeo, stakeMat);
      stake.rotation.x = s.rotX;
      stake.rotation.z = s.rotZ;
      stake.position.set(s.x, s.h * 0.4, s.z);
      stake.castShadow = true;
      this.group.add(stake);
    });

    // C. Soái thuyền rồng triều Lý neo bên bờ sông
    const boatGroup = new THREE.Group();
    boatGroup.name = "Ly_Dynasty_Dragon_Boat";

    const hullGeo = new THREE.BoxGeometry(3.2, 1.8, 14.0);
    this.prepareGeometry(hullGeo);
    const hullMat = new THREE.MeshStandardMaterial({ color: 0x3d1a10, roughness: 0.55 });
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.position.y = 0.9;
    boatGroup.add(hull);

    // Mũi thuyền rồng vươn cao
    const bowGeo = new THREE.ConeGeometry(1.6, 3.5, 4);
    this.prepareGeometry(bowGeo);
    const bow = new THREE.Mesh(bowGeo, hullMat);
    bow.rotation.x = Math.PI * 0.45;
    bow.position.set(0, 1.6, -7.5);
    boatGroup.add(bow);

    // Cột buồm và cờ trận
    const mastGeo = new THREE.CylinderGeometry(0.08, 0.12, 7.5, 10);
    this.prepareGeometry(mastGeo);
    const mast = new THREE.Mesh(mastGeo, hullMat);
    mast.position.set(0, 4.5, 0);
    boatGroup.add(mast);

    boatGroup.position.set(-28, 0.3, -12);
    boatGroup.rotation.y = Math.PI * 0.15;
    this.group.add(boatGroup);
  }

  // =========================================================================
  // 3. DOANH TRẠI QUÂN ĐỘI & CỜ NGŨ SẮC TRIỀU LÝ
  // =========================================================================
  initMilitaryFortressAndBanners() {
    // Dãy cờ ngũ sắc "Đại Việt" cắm dọc chiến lũy - OPTIMIZED: InstancedMesh cho 6 cột cờ
    const flagMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.5,
      side: THREE.DoubleSide
    });

    const flagXPositions = [-35, -20, -5, 10, 25, 40];
    const poleGeo = new THREE.CylinderGeometry(0.05, 0.07, 6.0, 8);
    this.prepareGeometry(poleGeo);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x221812, roughness: 0.6 });
    const polesInstanced = new THREE.InstancedMesh(poleGeo, poleMat, flagXPositions.length);
    const dummyPole = new THREE.Object3D();

    flagXPositions.forEach((fx, idx) => {
      dummyPole.position.set(fx, 6.5, 3.5);
      dummyPole.rotation.set(0, 0, 0);
      dummyPole.updateMatrix();
      polesInstanced.setMatrixAt(idx, dummyPole.matrix);

      const bannerGeo = new THREE.PlaneGeometry(2.4, 1.5, 8, 4);
      this.prepareGeometry(bannerGeo);
      const banner = new THREE.Mesh(bannerGeo, flagMat);
      banner.position.set(fx + 1.2, 8.5, 3.5);
      this.group.add(banner);
      this.flags.push(banner);
    });
    polesInstanced.instanceMatrix.needsUpdate = true;
    polesInstanced.computeBoundingSphere();
    polesInstanced.frustumCulled = true;
    this.group.add(polesInstanced);

    // 4 Cột đuốc chiến lũy thắp sáng bờ sông - OPTIMIZED: InstancedMesh cho thân đuốc và ngọn lửa
    const torchXPositions = [-25, -8, 12, 30];
    const torchStemGeo = new THREE.CylinderGeometry(0.08, 0.12, 3.2, 8);
    this.prepareGeometry(torchStemGeo);
    const torchMat = new THREE.MeshStandardMaterial({ color: 0x3d2012, roughness: 0.7 });
    const torchStemsInstanced = new THREE.InstancedMesh(torchStemGeo, torchMat, torchXPositions.length);

    const flameGeo = new THREE.SphereGeometry(0.24, 10, 10);
    this.prepareGeometry(flameGeo);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff8822 });
    const flamesInstanced = new THREE.InstancedMesh(flameGeo, flameMat, torchXPositions.length);

    const dummyTorch = new THREE.Object3D();
    torchXPositions.forEach((tx, idx) => {
      dummyTorch.position.set(tx, 4.8, 1.2);
      dummyTorch.rotation.set(0, 0, 0);
      dummyTorch.updateMatrix();
      torchStemsInstanced.setMatrixAt(idx, dummyTorch.matrix);

      dummyTorch.position.set(tx, 6.5, 1.2);
      dummyTorch.updateMatrix();
      flamesInstanced.setMatrixAt(idx, dummyTorch.matrix);

      const torchLight = new THREE.PointLight(0xff7711, 2.8, 18.0, 1.8);
      torchLight.position.set(tx, 6.8, 1.2);
      torchLight.castShadow = false; // GPU SAVER: PointLight shadow = 6 render passes
      this.group.add(torchLight);
      this.worldLights.push(torchLight);
    });

    torchStemsInstanced.instanceMatrix.needsUpdate = true;
    torchStemsInstanced.computeBoundingSphere();
    torchStemsInstanced.frustumCulled = true;

    flamesInstanced.instanceMatrix.needsUpdate = true;
    flamesInstanced.computeBoundingSphere();
    flamesInstanced.frustumCulled = true;

    this.group.add(torchStemsInstanced, flamesInstanced);
  }

  // =========================================================================
  // 4. BẢN THẦN THI ĐẾ VƯƠNG KHỔNG LỒ PHÁT SÁNG GIỮA HƯ KHÔNG
  // =========================================================================
  initCelestialProclamationMonolith() {
    const celestialGroup = new THREE.Group();
    celestialGroup.name = "Celestial_Poem_Monolith_Group";

    // Khối Thiên Thư bằng ánh sáng hoàng kim treo lơ lửng giữa trời đêm
    // Rộng 12.0m x Cao 6.5m
    const scrollGeo = new THREE.PlaneGeometry(12.0, 6.8);
    this.prepareGeometry(scrollGeo);

    // Canvas tạo 4 câu thơ thiêng dát vàng lấp lánh
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Nền bán trong suốt huyền ảo
    ctx.fillStyle = 'rgba(12, 18, 28, 0.75)';
    ctx.fillRect(0, 0, 1024, 512);

    // Khung viền rồng mây hoàng gia
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 14;
    ctx.strokeRect(18, 18, 988, 476);
    ctx.strokeStyle = '#F1C40F';
    ctx.lineWidth = 3;
    ctx.strokeRect(32, 32, 960, 448);

    // Đại tự tiêu đề
    ctx.fillStyle = '#FFE57F';
    ctx.shadowColor = 'rgba(241, 196, 15, 0.9)';
    ctx.shadowBlur = 24;
    ctx.font = 'bold 42px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText('NAM QUỐC SƠN HÀ', 512, 85);
    ctx.font = 'italic 20px serif';
    ctx.fillStyle = '#E5C158';
    ctx.fillText('– BẢN TUYÊN NGÔN ĐỘC LẬP ĐẦU TIÊN (1077) –', 512, 125);

    // 4 Câu thơ thần chấn động quân thù
    const poems = [
      '南 國 山 河 南 帝 居  •  Nam quốc sơn hà Nam đế cư',
      '截 然 定 分 在 天 書  •  Tiệt nhiên định phận tại thiên thư',
      '如 何 逆 虜 來 侵 犯  •  Như hà nghịch lỗ lai xâm phạm',
      '汝 等 行 看 取 敗 虛  •  Nhữ đẳng hành khan thủ bại hư'
    ];

    ctx.font = 'bold 30px "Times New Roman", serif';
    ctx.fillStyle = '#FFF8D6';
    poems.forEach((line, idx) => {
      ctx.fillText(line, 512, 205 + idx * 64);
    });

    const scrollTex = new THREE.CanvasTexture(canvas);
    const scrollMat = new THREE.MeshBasicMaterial({
      map: scrollTex,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      side: THREE.DoubleSide
    });

    this.celestialStele = new THREE.Mesh(scrollGeo, scrollMat);
    this.celestialStele.position.set(0, 14.5, -16.0);
    celestialGroup.add(this.celestialStele);

    // Vành đai linh khí phù chú vàng xoay quanh bức thiên thư
    const ringGeo = new THREE.TorusGeometry(7.2, 0.08, 12, 48);
    this.prepareGeometry(ringGeo);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf1c40f,
      transparent: true,
      opacity: 0.7,
      depthWrite: false
    });
    this.runeRing = new THREE.Mesh(ringGeo, ringMat);
    this.runeRing.position.set(0, 14.5, -16.0);
    celestialGroup.add(this.runeRing);

    this.group.add(celestialGroup);
  }

  // =========================================================================
  // 5. CỔNG HỒI QUY QUAY VỀ BẢO TÀNG (RETURN PORTAL WAYPOINT)
  // =========================================================================
  initReturnPortalWaypoint() {
    const portalGroup = new THREE.Group();
    portalGroup.name = "Return_Portal_Waypoint";

    // Vành cổng ánh sáng xoay tròn
    const pRingGeo = new THREE.TorusGeometry(1.5, 0.12, 16, 32);
    this.prepareGeometry(pRingGeo);
    const pMat = new THREE.MeshBasicMaterial({
      color: 0x39e58c,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    const portalRing = new THREE.Mesh(pRingGeo, pMat);
    portalRing.position.set(0, 4.8, 16.5);
    portalGroup.add(portalRing);
    this.returnPortalRing = portalRing;

    // Lõi xoáy năng lượng
    const discGeo = new THREE.CircleGeometry(1.35, 24);
    this.prepareGeometry(discGeo);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0x145a32,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.set(0, 4.8, 16.5);
    portalGroup.add(disc);

    // Chữ chú thích cổng
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 256;
    labelCanvas.height = 64;
    const lctx = labelCanvas.getContext('2d');
    lctx.fillStyle = '#39e58c';
    lctx.font = 'bold 22px serif';
    lctx.textAlign = 'center';
    lctx.fillText('⟵ VỀ BẢO TÀNG', 128, 40);

    const labelTex = new THREE.CanvasTexture(labelCanvas);
    const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    const labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), labelMat);
    labelMesh.position.set(0, 6.7, 16.5);
    portalGroup.add(labelMesh);

    this.group.add(portalGroup);
  }

  // =========================================================================
  // 6. ÁNH SÁNG CẢNH CHIẾN TRẬN & TÀN LỬA BAY (BỪNG SÁNG RÕ NÉT 100%)
  // =========================================================================
  initNarrativeLighting() {
    // 1. HemisphereLight rực rỡ (Trời xanh trăng mát, đất phản xạ ấm áp)
    const hemiLight = new THREE.HemisphereLight(0x8ec5ff, 0x3d2817, 2.0);
    hemiLight.position.set(0, 50, 0);
    this.group.add(hemiLight);
    this.worldLights.push(hemiLight);

    // 2. AmbientLight dịu dàng giúp toàn bộ địa hình, thuyền, cọc sông hiện rõ
    const amb = new THREE.AmbientLight(0xdbe9f4, 1.35);
    this.group.add(amb);
    this.worldLights.push(amb);

    // 3. DirectionalLight (Ánh trăng bạc / Mặt trăng rọi toàn cảnh chiến trận)
    const moonLight = new THREE.DirectionalLight(0xf2f7ff, 3.0);
    moonLight.position.set(25, 55, 35);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 1024;
    moonLight.shadow.mapSize.height = 1024;
    moonLight.shadow.camera.near = 5;
    moonLight.shadow.camera.far = 90;
    moonLight.shadow.camera.left = -45;
    moonLight.shadow.camera.right = 45;
    moonLight.shadow.camera.top = 45;
    moonLight.shadow.camera.bottom = -45;
    this.group.add(moonLight);
    this.worldLights.push(moonLight);

    // 4. Ánh sáng vàng thần thánh rọi bức thiên thư
    const celestialLight = new THREE.PointLight(0xffe070, 5.5, 45.0, 1.2);
    celestialLight.position.set(0, 16.0, -12.0);
    celestialLight.castShadow = false; // GPU SAVER: PointLight shadow = 6 render passes
    this.group.add(celestialLight);
    this.worldLights.push(celestialLight);

    // 5. Cụm PointLight ấm áp tại các vị trí trọng yếu chiến lũy
    // Điểm 1: Bờ chiến lũy trung tâm
    const p1 = new THREE.PointLight(0xffaa44, 4.5, 35.0, 1.6);
    p1.position.set(0, 6.5, 12.0);
    p1.castShadow = false; // GPU SAVER: PointLight shadow = 6 render passes
    this.group.add(p1);
    this.worldLights.push(p1);

    // Điểm 2: Bến soái thuyền rồng
    const p2 = new THREE.PointLight(0xff9933, 4.0, 32.0, 1.6);
    p2.position.set(-28, 6.0, -10.0);
    p2.castShadow = false; // GPU SAVER: PointLight shadow = 6 render passes
    this.group.add(p2);
    this.worldLights.push(p2);

    // Điểm 3: Bãi cọc phòng tuyến sông Như Nguyệt
    const p3 = new THREE.PointLight(0x7fc5ff, 3.5, 35.0, 1.5);
    p3.position.set(12, 5.0, -20.0);
    p3.castShadow = false; // GPU SAVER: PointLight shadow = 6 render passes
    this.group.add(p3);
    this.worldLights.push(p3);

    // Điểm 4: Doanh trại cánh Đông
    const p4 = new THREE.PointLight(0xffaa44, 4.0, 32.0, 1.6);
    p4.position.set(28, 6.5, 12.0);
    p4.castShadow = false; // GPU SAVER: PointLight shadow = 6 render passes
    this.group.add(p4);
    this.worldLights.push(p4);
  }

  initFireEmbersVFX() {
    const geo = new THREE.BufferGeometry();
    const posArr = new Float32Array(this.emberCount * 3);

    for (let i = 0; i < this.emberCount; i++) {
      const x = (Math.random() - 0.5) * 50;
      const y = 3.5 + Math.random() * 8.0;
      const z = (Math.random() - 0.5) * 20;

      posArr[i * 3] = x;
      posArr[i * 3 + 1] = y;
      posArr[i * 3 + 2] = z;

      this.emberData.push({
        baseY: y,
        speedY: 0.3 + Math.random() * 0.5,
        speedX: 0.2 + Math.random() * 0.4
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    this.prepareGeometry(geo);

    const mat = new THREE.PointsMaterial({
      color: 0xffaa22,
      size: 0.12,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.fireEmbers = new THREE.Points(geo, mat);
    this.group.add(this.fireEmbers);
  }

  // =========================================================================
  // 7. GIAO DIỆN NARRATIVE HUD & NÚT THOÁT
  // =========================================================================
  initUIOverlay() {
    if (typeof document === 'undefined') return;

    let hud = document.getElementById('namquoc-realm-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'namquoc-realm-hud';
      hud.style.cssText = `
        position: fixed;
        bottom: 28px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        display: none;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        font-family: 'Times New Roman', serif;
      `;

      hud.innerHTML = `
        <div style="background: rgba(10, 16, 26, 0.88); border: 2px solid #D4AF37; padding: 10px 24px; border-radius: 8px; color: #FFE57F; font-size: 16px; letter-spacing: 1px; box-shadow: 0 4px 20px rgba(0,0,0,0.6); text-align: center;">
          <div style="font-weight: bold; font-size: 18px; margin-bottom: 2px;">CHIẾN TUYẾN SÔNG NHƯ NGUYỆT (1077)</div>
          <div style="font-style: italic; color: #D4AF37; font-size: 14px;">Bản Thần Thi Nam Quốc Sơn Hà • Lý Thường Kiệt</div>
        </div>
        <button id="btn-exit-namquoc-realm" style="
          background: #8B0000;
          color: #FFF8D6;
          border: 1.5px solid #F1C40F;
          padding: 8px 22px;
          border-radius: 6px;
          font-size: 15px;
          font-weight: bold;
          cursor: pointer;
          letter-spacing: 0.5px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.5);
          transition: all 0.2s;
        ">⟵ QUAY LẠI BẢO TÀNG</button>
      `;

      document.body.appendChild(hud);

      const exitBtn = document.getElementById('btn-exit-namquoc-realm');
      exitBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.exitStoryWorld();
      });

      exitBtn?.addEventListener('mouseenter', () => {
        exitBtn.style.background = '#A31818';
        exitBtn.style.transform = 'scale(1.05)';
      });
      exitBtn?.addEventListener('mouseleave', () => {
        exitBtn.style.background = '#8B0000';
        exitBtn.style.transform = 'scale(1.0)';
      });
    }

    this.hudElement = hud;
  }

  // =========================================================================
  // 8. CHUYỂN CẢNH WARP & BỪNG SÁNG KHÔNG GIAN TỰ SỰ
  // =========================================================================
  enterStoryWorldWithWarp(targetZoneId = 1) {
    if (this.isInsideWorld) return;
    this.isInsideWorld = true;

    // Lưu lại vị trí camera bảo tàng hiện thời
    if (this.camera) {
      this.savedCameraPos.copy(this.camera.position);
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      this.savedCameraTarget.copy(this.camera.position).add(dir.multiplyScalar(10));
    }

    // Lưu trạng thái sương mù, nền trời và exposure cũ
    if (this.scene) {
      this.savedFog = this.scene.fog;
      this.savedBackground = this.scene.background;
      // Nền trời đêm sâu thẳm có ánh trăng sáng rõ, không để màu đen
      this.scene.background = new THREE.Color(0x132238);
      // Giảm độ dày sương mù để nhìn rõ toàn cảnh
      this.scene.fog = new THREE.FogExp2(0x142337, 0.0035);
    }

    if (this.renderer) {
      this.savedExposure = this.renderer.toneMappingExposure ?? 1.0;
      this.renderer.toneMappingExposure = 1.30; // Nâng exposure bừng sáng
    }

    // Hiển thị thế giới Sông Như Nguyệt
    this.group.visible = true;

    if (this.renderer?.shadowMap) {
      this.renderer.shadowMap.needsUpdate = true;
    }

    // Tạm ẩn sảnh bảo tàng để giải phóng 100% GPU
    if (this.atriumGroup) {
      this.atriumGroup.visible = false;
    }

    // Khóa cao độ đi bộ trên mặt chiến lũy Y = 153.2m
    if (this.cameraController) {
      this.cameraController.setFloorHeightProvider?.((x, z) => 153.2);
      this.cameraController.velocity?.set?.(0, 0, 0);
    }

    // Đặt camera vào vị trí quan sát điện ảnh bờ sông Như Nguyệt
    if (this.cameraManager) {
      this.cameraManager.controls?.target?.copy(this.viewTargetPos);
      if (this.camera) {
        this.camera.position.copy(this.viewCameraPos);
        this.camera.lookAt(this.viewTargetPos);
      }
    }

    // Hiển thị HUD thế giới
    if (this.hudElement) {
      this.hudElement.style.display = 'flex';
    }

    console.log("%c✓ Đã bước vào Không gian Sông Như Nguyệt (Bừng sáng rõ nét 100%)!", "color: #f1c40f; font-weight: bold;");
  }

  exitStoryWorld() {
    if (!this.isInsideWorld) return;
    this.isInsideWorld = false;

    // Ẩn thế giới Sông Như Nguyệt
    this.group.visible = false;

    // Khôi phục lại sảnh bảo tàng
    if (this.atriumGroup) {
      this.atriumGroup.visible = true;
    }

    if (this.renderer?.shadowMap) {
      this.renderer.shadowMap.needsUpdate = true;
    }

    // Khôi phục background, fog và exposure
    if (this.scene) {
      this.scene.fog = this.savedFog || null;
      this.scene.background = this.savedBackground || new THREE.Color(0x101318);
    }

    if (this.renderer) {
      this.renderer.toneMappingExposure = this.savedExposure || 1.0;
    }

    // Bỏ floorHeightProvider thế giới truyện
    if (this.cameraController) {
      this.cameraController.setFloorHeightProvider?.(null);
      this.cameraController.floorHeightProvider = null;
      this.cameraController.velocity?.set?.(0, 0, 0);
    }

    // Ẩn HUD
    if (this.hudElement) {
      this.hudElement.style.display = 'none';
    }

    // Đưa camera về trước Bục Sách Phòng 02 (Sử dụng cached vectors, không tạo object mới)
    const room2Pos = this._room2Pos;
    const room2Look = this._room2Look;

    if (this.cameraManager?.fastTravelTo) {
      this.cameraManager.fastTravelTo(room2Pos, room2Look);
    } else if (this.camera) {
      this.camera.position.copy(room2Pos);
      this.cameraManager?.controls?.target?.copy(room2Look);
      this.camera.lookAt(room2Look);
    }

    console.log("%c✓ Đã an toàn quay trở về Sảnh Bảo Tàng!", "color: #39e58c; font-weight: bold;");
  }

  // =========================================================================
  // 9. ANIMATION LOOP
  // =========================================================================
  update(delta = 0.016, elapsedTime = 0) {
    if (!this.isInsideWorld) return;

    // 1. Dao động mặt nước sông Như Nguyệt
    if (this.waterMesh) {
      this.waterMesh.position.y = 0.45 + Math.sin(elapsedTime * 1.2) * 0.06;
      this.waterMesh.updateMatrix();
    }

    // 2. Vòng linh khí bức thiên thư xoay
    if (this.runeRing) {
      this.runeRing.rotation.z = elapsedTime * 0.4;
      this.runeRing.updateMatrix();
    }

    // 3. Cuộn mây / dao động nhẹ của bản thiên thư
    if (this.celestialStele) {
      this.celestialStele.position.y = 14.5 + Math.sin(elapsedTime * 0.8) * 0.15;
      this.celestialStele.updateMatrix();
    }

    // 4. Cổng hồi quy xoay
    if (this.returnPortalRing) {
      this.returnPortalRing.rotation.z = elapsedTime * 1.5;
      this.returnPortalRing.updateMatrix();
    }

    // 5. Cờ tung bay trong gió đêm
    this.flags.forEach((f, idx) => {
      f.rotation.y = Math.sin(elapsedTime * 2.5 + idx * 0.8) * 0.25;
      f.updateMatrix();
    });

    // 6. Tàn lửa bay lên từ các ngọn đuốc (Cắt giảm 50% CPU: cập nhật mỗi 2 frame)
    this.particleFrameCounter = (this.particleFrameCounter || 0) + 1;
    if (this.particleFrameCounter % 2 === 0 && this.fireEmbers?.geometry?.attributes?.position) {
      const posAttr = this.fireEmbers.geometry.attributes.position;
      const arr = posAttr.array;
      const twoFrameDelta = delta * 2.0;

      for (let i = 0; i < this.emberCount; i++) {
        const d = this.emberData[i];
        const idx = i * 3;

        let y = arr[idx + 1] + d.speedY * twoFrameDelta;
        let x = arr[idx] + d.speedX * twoFrameDelta;

        if (y > 14.0) {
          y = 3.5;
          x = (Math.random() - 0.5) * 50;
        }

        arr[idx] = x;
        arr[idx + 1] = y;
      }
      posAttr.needsUpdate = true;
    }
  }

  dispose() {
    try {
      this.group.traverse((c) => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          if (Array.isArray(c.material)) c.material.forEach(m => m?.dispose?.());
          else c.material?.dispose?.();
        }
      });
      this.hudElement?.remove?.();
      this.group.clear();
    } catch (e) {}
  }
}

export default NamQuocSonHaStoryWorld;
