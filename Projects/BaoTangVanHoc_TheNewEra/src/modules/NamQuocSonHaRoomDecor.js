import * as THREE from 'three';

/**
 * NAM QUỐC SƠN HÀ ROOM DECOR MODULE: NỘI THẤT CUNG ĐÌNH & DIORAMA ĐIỆN ẢNH (PHÒNG 02)
 * Lead Architect & Art Director WebGL Specification
 * 
 * Chủ đề: HÀO KHÍ ĐẾ VƯƠNG & BẢN TUYÊN NGÔN ĐỘC LẬP ĐẦU TIÊN
 * Tọa độ tâm Phòng 02: (-48.0, 10.0, -19.0), Tầng 2 - Cánh Tây-Bắc
 * 
 * CÁC HẠNG MỤC THIẾT KẾ ĐẶC TRƯNG:
 * 1. SÀN ĐÁ CẨM THẠCH CHỈ VÀNG & THẢM NHUNG CUNG ĐÌNH THỜI LÝ:
 *    - Phủ kín diện tích sàn (26.2m x 29.0m, Y = 10.08m) đá cẩm thạch đen chỉ vàng Imperial Marble.
 *    - Dải thảm nhung đỏ thêu rồng triều Lý và triện vàng "Đại Việt" dẫn từ cửa vòm vào trung tâm.
 *    - Bệ thảm tròn hoa sen đế vương đường kính 4.8m bọc vành đồng vàng.
 * 
 * 2. BỤC CHIẾU THƯ TRUNG TÂM (HERO PEDESTAL) & CUỘN CHIẾU THƯ MA THUẬT:
 *    - Bệ đá hoa sen đa tầng chạm khắc phù điêu rồng thời Lý dát vàng 1:1.
 *    - Cuộn Chiếu Thư / Sách Ma Thuật (Interactive Book Mesh) dát vàng hoàng kim, trục ngọc bích hai đầu,
 *      chữ Hán cổ sơn son thếp vàng, lơ lửng và xoay nhẹ theo hình sin.
 * 
 * 3. BỘ BA BẢO VẬT DIORAMA & ĐẠO CỤ BIỂU TƯỢNG TRIỀU LÝ:
 *    - Bức Phù Điêu Sơn Mài Hoàng Gia (6.5m x 3.6m): Tranh sơn mài khắc 4 câu thơ thiêng bằng chữ Hán và quốc ngữ thếp vàng rực rỡ, kèm rồng thời Lý uốn lượn.
 *    - Cặp Hoành Phi Câu Đối Cung Đình: Treo 2 bên vách ca ngợi chủ quyền thiêng liêng sông núi.
 *    - Tượng đài Bia đá thần phán "Định phận tại thiên thư": Bệ rùa đá đội bia, khắc 4 câu thơ vàng phát sáng.
 *    - Cụm Án thư nghiên bút & Lư hương đồng đỉnh rồng tỏa khói trầm nhẹ nhàng.
 *    - Bảo kiếm lệnh triều Lý: Gươm lệnh rồng cuộn đặt trên giá gỗ gụ sơn son thếp vàng.
 *    - Trống trận phòng tuyến Như Nguyệt: Trống gỗ bọc da trâu viền đồng cổ trên giá gỗ kiên cố.
 *    - Cây tùng / trúc quân tử thế cổ thụ & 4 Bình gốm men ngọc hoàng gia thời Lý cao 1.6m.
 *    - 4 Cột mun bọc đai vàng triều Lý & 4 Đuốc đồng hoàng gia.
 * 
 * 4. HỆ THỐNG CHIẾU SÁNG BỪNG SÁNG TOÀN DIỆN (HERO & 4 CORNER FILL LIGHTS):
 *    - 1 Hero SpotLight cực mạnh chiếu thẳng từ trên trần xuống Bục Chiếu Thư.
 *    - 4 PointLight vàng hổ phách ấm áp ở 4 góc phòng giúp toàn bộ không gian luôn sáng rõ, lộng lẫy từ xa.
 *    - SpotLight rọi Bức Phù Điêu Sơn Mài và SpotLight rọi Bia Đá Thần Phán.
 *    - HemisphereLight nội thất triệt tiêu hoàn toàn góc tối đen.
 *    - 120 hạt bụi vàng hoàng kim lơ lửng & làn khói trầm thơm ngát.
 */

// Texture Canvas tự sinh hoa văn rồng & gấm hoàng gia cho thảm cung đình
function createImperialRugTexture(width = 512, height = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Nền đỏ thẫm cung đình
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#661412');
  grad.addColorStop(0.5, '#4F0F0D');
  grad.addColorStop(1, '#3B0A09');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Viền hoa văn chỉ vàng hoàng kim
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 14;
  ctx.strokeRect(18, 18, width - 36, height - 36);

  ctx.strokeStyle = '#F1C40F';
  ctx.lineWidth = 3;
  ctx.strokeRect(32, 32, width - 64, height - 64);

  const cx = width / 2;
  const cy = height / 2;
  
  ctx.fillStyle = 'rgba(212, 175, 55, 0.25)';
  ctx.beginPath();
  ctx.arc(cx, cy, 140, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 4;
  for (let i = 0; i < 8; i++) {
    const angle = (i * Math.PI * 2) / 8;
    const px = cx + Math.cos(angle) * 90;
    const py = cy + Math.sin(angle) * 90;
    ctx.beginPath();
    ctx.arc(px, py, 38, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Chữ triện Hán ở tâm: "Đại Việt"
  ctx.fillStyle = '#F5D77F';
  ctx.font = 'bold 32px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('大 越', cx, cy);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

// Canvas tự sinh Bức Phù Điêu Sơn Mài Hoàng Gia Khổng Lồ (Imperial Lacquer Mural)
function createImperialMuralTexture(width = 1024, height = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Nền sơn mài hoàng gia đỏ đun pha nâu trầm và rát vàng
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#420d09');
  grad.addColorStop(0.5, '#2b0805');
  grad.addColorStop(1, '#1a0504');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Vệt rát vàng lấp lánh trên nền sơn mài
  ctx.fillStyle = 'rgba(212, 175, 55, 0.08)';
  for (let i = 0; i < 40; i++) {
    const rx = Math.random() * width;
    const ry = Math.random() * height;
    ctx.beginPath();
    ctx.arc(rx, ry, Math.random() * 40 + 10, 0, Math.PI * 2);
    ctx.fill();
  }

  // Khung bo gấm lụa hoàng gia
  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 14;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  ctx.strokeStyle = '#F1C40F';
  ctx.lineWidth = 3;
  ctx.strokeRect(34, 34, width - 68, height - 68);

  // Tiêu đề Đại Tự
  ctx.fillStyle = '#FFE57F';
  ctx.shadowColor = 'rgba(241, 196, 15, 0.8)';
  ctx.shadowBlur = 18;
  ctx.font = 'bold 38px "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.fillText('NAM QUỐC SƠN HÀ', width / 2, 85);

  ctx.font = 'italic 18px serif';
  ctx.fillStyle = '#D4AF37';
  ctx.shadowBlur = 0;
  ctx.fillText('– BẢN TUYÊN NGÔN ĐỘC LẬP ĐẦU TIÊN CỦA DÂN TỘC (1077) –', width / 2, 120);

  // 4 Câu thơ thiêng bằng chữ Hán & Âm Hán Việt
  const poems = [
    { h: '南 國 山 河 南 帝 居', v: 'Nam quốc sơn hà Nam đế cư' },
    { h: '截 然 定 分 在 天 書', v: 'Tiệt nhiên định phận tại thiên thư' },
    { h: '如 何 逆 虜 來 侵 犯', v: 'Như hà nghịch lỗ lai xâm phạm' },
    { h: '汝 等 行 看 取 敗 虛', v: 'Nhữ đẳng hành khan thủ bại hư' }
  ];

  poems.forEach((p, idx) => {
    const y = 200 + idx * 70;

    // Chữ Hán thếp vàng phát sáng
    ctx.fillStyle = '#FFF8D6';
    ctx.shadowColor = 'rgba(241, 196, 15, 0.7)';
    ctx.shadowBlur = 10;
    ctx.font = 'bold 30px "Times New Roman", serif';
    ctx.fillText(`${p.h}   •   "${p.v}"`, width / 2, y);
  });

  // Triện son hoàng tộc
  const sealX = width / 2 - 30;
  const sealY = height - 70;
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#B82818';
  ctx.fillRect(sealX, sealY, 60, 45);
  ctx.strokeStyle = '#E74C3C';
  ctx.lineWidth = 2;
  ctx.strokeRect(sealX + 2, sealY + 2, 56, 41);
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 15px serif';
  ctx.fillText('LÝ TRIỀU', width / 2, sealY + 28);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

// Canvas tạo mặt Hoành Phi Câu Đối
function createCoupletTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#4A0E0B';
  ctx.fillRect(0, 0, 128, 512);

  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, 112, 496);

  ctx.fillStyle = '#FFE57F';
  ctx.font = 'bold 22px serif';
  ctx.textAlign = 'center';

  const chars = text.split('');
  const spacing = 450 / Math.max(chars.length, 1);
  chars.forEach((c, idx) => {
    ctx.fillText(c, 64, 50 + idx * spacing);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  return texture;
}

// Canvas tự sinh mặt chữ Hán trên Bia đá Thần phán
function createSteleInscriptionTexture(width = 512, height = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#2b3130');
  bg.addColorStop(0.5, '#1e2423');
  bg.addColorStop(1, '#151918');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  for (let i = 0; i < 20; i++) {
    ctx.fillRect(Math.random() * width, 0, Math.random() * 30 + 10, height);
  }

  ctx.strokeStyle = 'rgba(212, 175, 55, 0.65)';
  ctx.lineWidth = 8;
  ctx.strokeRect(24, 24, width - 48, height - 48);

  ctx.fillStyle = '#D4AF37';
  ctx.font = 'bold 28px serif';
  ctx.textAlign = 'center';
  ctx.fillText('南 國 山 河', width / 2, 85);
  ctx.font = 'italic 16px serif';
  ctx.fillStyle = '#C0A060';
  ctx.fillText('– Lý Thường Kiệt (1077) –', width / 2, 120);

  const lines = [
    { kanji: '南 國 山 河 南 帝 居', viet: 'Nam quốc sơn hà Nam đế cư' },
    { kanji: '截 然 定 分 在 天 書', viet: 'Tiệt nhiên định phận tại thiên thư' },
    { kanji: '如 何 逆 虜 來 侵 犯', viet: 'Như hà nghịch lỗ lai xâm phạm' },
    { kanji: '汝 等 行 看 取 敗 虛', viet: 'Nhữ đẳng hành khan thủ bại hư' }
  ];

  lines.forEach((l, idx) => {
    const y = 220 + idx * 160;
    ctx.fillStyle = '#FFE57F';
    ctx.shadowColor = 'rgba(241, 196, 15, 0.75)';
    ctx.shadowBlur = 12;
    ctx.font = 'bold 38px "Times New Roman", serif';
    ctx.fillText(l.kanji, width / 2, y);

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(225, 210, 175, 0.85)';
    ctx.font = 'italic 20px "Times New Roman", serif';
    ctx.fillText(`"${l.viet}"`, width / 2, y + 42);
  });

  const sealX = width / 2 - 25;
  const sealY = height - 120;
  ctx.fillStyle = '#A31818';
  ctx.fillRect(sealX, sealY, 50, 50);
  ctx.strokeStyle = '#D95241';
  ctx.lineWidth = 2;
  ctx.strokeRect(sealX + 2, sealY + 2, 46, 46);
  ctx.fillStyle = '#FFF0E5';
  ctx.font = 'bold 16px serif';
  ctx.fillText('Lý Triều', width / 2, sealY + 22);
  ctx.fillText('Thần Ấn', width / 2, sealY + 40);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

export class NamQuocSonHaRoomDecor {
  constructor(materialLibrary = null, options = {}) {
    this.matLib = materialLibrary;
    this.roomId = options.roomId || 'nam_quoc_son_ha';
    this.renderer = options.renderer || null;

    // Tọa độ tâm Phòng 02 (Tầng 2 - Cánh Tây-Bắc)
    this.origin = options.origin ?? new THREE.Vector3(-48.0, 10.0, -19.0);
    this.rotationY = options.rotationY ?? (Math.PI * 0.5);

    this.group = new THREE.Group();
    this.group.name = `Room02_NamQuocSonHa_${this.roomId}`;
    this.group.position.set(this.origin.x, this.origin.y, this.origin.z);
    this.group.rotation.y = this.rotationY;

    // Sub-groups
    this.floorGroup = new THREE.Group();
    this.floorGroup.name = "Floor_Group";
    this.group.add(this.floorGroup);

    this.architectureGroup = new THREE.Group();
    this.architectureGroup.name = "Architecture_Group";
    this.group.add(this.architectureGroup);

    this.modelsGroup = new THREE.Group();
    this.modelsGroup.name = "Diorama_Models_Group";
    this.group.add(this.modelsGroup);

    this.lightsGroup = new THREE.Group();
    this.lightsGroup.name = "Lighting_Group";
    this.group.add(this.lightsGroup);

    this.particlesGroup = new THREE.Group();
    this.particlesGroup.name = "Particles_VFX_Group";
    this.group.add(this.particlesGroup);

    // Dynamic items (Tối ưu hóa số lượng hạt để đạt 60 FPS cố định)
    this.bookMesh = null;
    this.bookGroup = null;
    this.floatingRing = null;
    this.goldDustParticles = null;
    this.goldDustData = [];
    this.goldDustCount = 75;
    this.incenseSmoke = null;
    this.smokeData = [];
    this.smokeCount = 24;
    this.particleFrameCounter = 0;
    this.lightsActive = true;

    try {
      this.initCompleteRoomFloor();
      this.initRoyalColonnadeAndBraziers();
      this.initImperialLacquerMuralAndCouplets();
      this.initHeroPedestalAndMagicDecree();
      this.initSteleMonolithDiorama();
      this.initLyDragonSwordDiorama();
      this.initWarDrumsDiorama();
      this.initRoyalDeskAndIncenseBurner();
      this.initRoyalBonsaiAndPorcelainVases();
      this.initAtmosphericLighting();
      this.initImperialDustParticles();

      // Khử độc NaN và cấu hình render tối ưu
      this.sanitizeAndFreezeStaticGeometries();

      console.log("%c✓ NamQuocSonHaRoomDecor initialized • Phòng 02 Lộng Lẫy & Bừng Sáng 100%!", "color: #f1c40f; font-weight: bold; font-size: 13px;");
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo NamQuocSonHaRoomDecor:", err);
    }
  }

  getGroup() {
    return this.group;
  }

  getBookMesh() {
    return this.bookMesh;
  }

  prepareGeometry(geo) {
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
    } catch (e) {
      console.warn("[SELF-HEALING] Error preparing geometry:", e);
    }
  }

  // =========================================================================
  // 1. SÀN ĐÁ CẨM THẠCH CHỈ VÀNG & THẢM CUNG ĐÌNH THỜI LÝ
  // =========================================================================
  initCompleteRoomFloor() {
    // Sàn đá cẩm thạch đen chỉ vàng hoàng gia (Rộng 26.2m x Sâu 29.0m, Dày 0.08m)
    const floorGeo = new THREE.BoxGeometry(26.2, 0.08, 29.0);
    this.prepareGeometry(floorGeo);

    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#18181c';
    ctx.fillRect(0, 0, 1024, 1024);

    ctx.strokeStyle = '#28282b';
    ctx.lineWidth = 3;
    for (let x = 0; x <= 1024; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }
    for (let y = 0; y <= 1024; y += 128) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1024, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.45)';
    ctx.lineWidth = 2.0;
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      const sx = Math.random() * 1024;
      const sy = Math.random() * 1024;
      ctx.moveTo(sx, sy);
      ctx.bezierCurveTo(
        sx + (Math.random() - 0.5) * 300,
        sy + (Math.random() - 0.5) * 300,
        sx + (Math.random() - 0.5) * 400,
        sy + (Math.random() - 0.5) * 400,
        sx + (Math.random() - 0.5) * 500,
        sy + (Math.random() - 0.5) * 500
      );
      ctx.stroke();
    }

    const floorTex = new THREE.CanvasTexture(canvas);
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(4, 4);

    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex,
      roughness: 0.30,
      metalness: 0.20,
      color: 0x242428
    });

    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.name = "Room02_Imperial_Marble_Floor";
    floorMesh.position.set(0, 0.04, 0);
    floorMesh.receiveShadow = true;
    this.floorGroup.add(floorMesh);

    // Dải thảm nhung đỏ hoàng gia dẫn từ cửa vòm (Z = 14.5m) vào bục trung tâm
    const rugLength = 14.8;
    const rugWidth = 3.6;
    const rugGeo = new THREE.PlaneGeometry(rugWidth, rugLength);
    this.prepareGeometry(rugGeo);

    const rugTex = createImperialRugTexture(512, 512);
    rugTex.repeat.set(1, 4);

    const rugMat = new THREE.MeshStandardMaterial({
      map: rugTex,
      roughness: 0.70,
      metalness: 0.10,
      side: THREE.DoubleSide
    });

    const rugMesh = new THREE.Mesh(rugGeo, rugMat);
    rugMesh.name = "Room02_Imperial_Red_Rug";
    rugMesh.rotation.x = -Math.PI * 0.5;
    rugMesh.position.set(0, 0.082, rugLength * 0.5);
    rugMesh.receiveShadow = true;
    this.floorGroup.add(rugMesh);

    // Bệ thảm tròn hoa sen đế vương
    const daisGeo = new THREE.CylinderGeometry(2.5, 2.6, 0.04, 36);
    this.prepareGeometry(daisGeo);
    const daisMat = new THREE.MeshStandardMaterial({
      color: 0x5c1412,
      roughness: 0.60,
      metalness: 0.25
    });
    const daisMesh = new THREE.Mesh(daisGeo, daisMat);
    daisMesh.name = "Room02_Lotus_Round_Dais";
    daisMesh.position.set(0, 0.09, 0);
    daisMesh.receiveShadow = true;
    this.floorGroup.add(daisMesh);

    // Vành đồng mạ vàng bọc bệ hoa sen
    const ringGeo = new THREE.TorusGeometry(2.52, 0.03, 12, 36);
    this.prepareGeometry(ringGeo);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.28,
      metalness: 0.88
    });
    const ringMesh = new THREE.Mesh(ringGeo, goldMat);
    ringMesh.rotation.x = Math.PI * 0.5;
    ringMesh.position.set(0, 0.11, 0);
    this.floorGroup.add(ringMesh);
  }

  // =========================================================================
  // 2. BỨC PHÙ ĐIÊU SƠN MÀI HOÀNG GIA & CẶP HOÀNH PHI CÂU ĐỐI
  // =========================================================================
  initImperialLacquerMuralAndCouplets() {
    // A. Bức Phù Điêu Sơn Mài Hoàng Gia Khổng Lồ (6.5m x 3.6m) treo tường sau
    const muralGroup = new THREE.Group();
    muralGroup.name = "Imperial_Lacquer_Mural_Group";

    const muralGeo = new THREE.PlaneGeometry(6.5, 3.6);
    this.prepareGeometry(muralGeo);

    const muralTex = createImperialMuralTexture(1024, 512);
    const muralMat = new THREE.MeshStandardMaterial({
      map: muralTex,
      roughness: 0.35,
      metalness: 0.30,
      emissive: 0x221105,
      emissiveIntensity: 0.3
    });
    const muralMesh = new THREE.Mesh(muralGeo, muralMat);
    muralGroup.add(muralMesh);

    // Khung gỗ mun viền mạ vàng
    const frameGeo = new THREE.BoxGeometry(6.7, 3.8, 0.12);
    this.prepareGeometry(frameGeo);
    const ebonyMat = new THREE.MeshStandardMaterial({ color: 0x1f140e, roughness: 0.4 });
    const frameMesh = new THREE.Mesh(frameGeo, ebonyMat);
    frameMesh.position.z = -0.07;
    muralGroup.add(frameMesh);

    // Treo tại vách sau trang trọng: Z = -8.2m, Y = 4.2m
    muralGroup.position.set(0, 4.2, -8.2);
    this.architectureGroup.add(muralGroup);

    // B. Cặp Hoành Phi Câu Đối Cung Đình treo 2 vách tường bên (Tây & Đông)
    const coupletWestGeo = new THREE.PlaneGeometry(0.85, 4.2);
    this.prepareGeometry(coupletWestGeo);
    const coupletWestTex = createCoupletTexture('SƠN HÀ NAM ĐẾ CƯ TIỆT NHIÊN ĐỊNH PHẬN');
    const coupletMat = new THREE.MeshStandardMaterial({ map: coupletWestTex, roughness: 0.4 });
    const coupletWest = new THREE.Mesh(coupletWestGeo, coupletMat);
    coupletWest.position.set(-11.5, 4.2, -1.0);
    coupletWest.rotation.y = Math.PI * 0.5;
    this.architectureGroup.add(coupletWest);

    const coupletEastGeo = new THREE.PlaneGeometry(0.85, 4.2);
    this.prepareGeometry(coupletEastGeo);
    const coupletEastTex = createCoupletTexture('NGHỊCH LỖ LAI XÂM PHẠM HÀNH KHAN THỦ BẠI');
    const coupletEastMat = new THREE.MeshStandardMaterial({ map: coupletEastTex, roughness: 0.4 });
    const coupletEast = new THREE.Mesh(coupletEastGeo, coupletEastMat);
    coupletEast.position.set(11.5, 4.2, -1.0);
    coupletEast.rotation.y = -Math.PI * 0.5;
    this.architectureGroup.add(coupletEast);
  }

  // =========================================================================
  // 3. CỘT GỖ MUN CHẠM RỒNG VÀ DÃY ĐUỐC ĐỒNG HOÀNG GIA
  // =========================================================================
  initRoyalColonnadeAndBraziers() {
    const columnGeo = new THREE.CylinderGeometry(0.38, 0.44, 9.5, 20);
    this.prepareGeometry(columnGeo);

    const ebonyMat = new THREE.MeshStandardMaterial({
      color: 0x241812,
      roughness: 0.45,
      metalness: 0.15
    });

    const goldBandMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.35,
      metalness: 0.85
    });

    const bronzeMat = new THREE.MeshStandardMaterial({
      color: 0x8b5a2b,
      roughness: 0.4,
      metalness: 0.75
    });

    const columnPositions = [
      { x: -6.5, z: -4.5 },
      { x: -6.5, z: 4.5 },
      { x: 6.5, z: -4.5 },
      { x: 6.5, z: 4.5 }
    ];

    // OPTIMIZED: InstancedMesh cho 4 Cột mun, 12 Vành vàng và 4 Đế đá (3 Draw Calls thay vì 20)
    const bandGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.18, 20);
    this.prepareGeometry(bandGeo);

    const baseGeo = new THREE.BoxGeometry(1.2, 0.4, 1.2);
    this.prepareGeometry(baseGeo);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x444448, roughness: 0.75 });

    const colsInstanced = new THREE.InstancedMesh(columnGeo, ebonyMat, columnPositions.length);
    colsInstanced.castShadow = true;
    colsInstanced.receiveShadow = true;

    const bandsInstanced = new THREE.InstancedMesh(bandGeo, goldBandMat, columnPositions.length * 3);
    const basesInstanced = new THREE.InstancedMesh(baseGeo, baseMat, columnPositions.length);
    basesInstanced.receiveShadow = true;

    const dummyCol = new THREE.Object3D();
    let bandIdx = 0;

    columnPositions.forEach((pos, idx) => {
      // Cột mun
      dummyCol.position.set(pos.x, 0.08 + 4.75, pos.z);
      dummyCol.rotation.set(0, 0, 0);
      dummyCol.updateMatrix();
      colsInstanced.setMatrixAt(idx, dummyCol.matrix);

      // Đế đá
      dummyCol.position.set(pos.x, 0.08 + 0.2, pos.z);
      dummyCol.updateMatrix();
      basesInstanced.setMatrixAt(idx, dummyCol.matrix);

      // 3 Vành đai vàng
      [0.6, 4.8, 9.0].forEach(h => {
        dummyCol.position.set(pos.x, 0.08 + h, pos.z);
        dummyCol.updateMatrix();
        bandsInstanced.setMatrixAt(bandIdx++, dummyCol.matrix);
      });
    });

    colsInstanced.instanceMatrix.needsUpdate = true;
    colsInstanced.computeBoundingSphere();
    colsInstanced.frustumCulled = true;

    basesInstanced.instanceMatrix.needsUpdate = true;
    basesInstanced.computeBoundingSphere();
    basesInstanced.frustumCulled = true;

    bandsInstanced.instanceMatrix.needsUpdate = true;
    bandsInstanced.computeBoundingSphere();
    bandsInstanced.frustumCulled = true;

    this.architectureGroup.add(colsInstanced, basesInstanced, bandsInstanced);

    // Dãy 4 đuốc đồng hoàng gia - OPTIMIZED: InstancedMesh cho thân đuốc, chậu và ngọn lửa (3 Draw Calls thay vì 12)
    const brazierPositions = [
      { x: -4.2, z: 2.5 },
      { x: 4.2, z: 2.5 },
      { x: -4.2, z: -2.5 },
      { x: 4.2, z: -2.5 }
    ];

    const stemGeo = new THREE.CylinderGeometry(0.08, 0.14, 1.4, 16);
    this.prepareGeometry(stemGeo);
    const stemsInstanced = new THREE.InstancedMesh(stemGeo, bronzeMat, brazierPositions.length);

    const bowlGeo = new THREE.CylinderGeometry(0.35, 0.18, 0.32, 18);
    this.prepareGeometry(bowlGeo);
    const bowlsInstanced = new THREE.InstancedMesh(bowlGeo, bronzeMat, brazierPositions.length);

    const flameGeo = new THREE.SphereGeometry(0.16, 12, 12);
    this.prepareGeometry(flameGeo);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa33 });
    const flamesInstanced = new THREE.InstancedMesh(flameGeo, flameMat, brazierPositions.length);

    const dummyBr = new THREE.Object3D();
    brazierPositions.forEach((pos, idx) => {
      // Thân đuốc
      dummyBr.position.set(pos.x, 0.08 + 0.7, pos.z);
      dummyBr.rotation.set(0, 0, 0);
      dummyBr.updateMatrix();
      stemsInstanced.setMatrixAt(idx, dummyBr.matrix);

      // Chậu đồng
      dummyBr.position.set(pos.x, 0.08 + 1.5, pos.z);
      dummyBr.updateMatrix();
      bowlsInstanced.setMatrixAt(idx, dummyBr.matrix);

      // Ngọn lửa
      dummyBr.position.set(pos.x, 0.08 + 1.72, pos.z);
      dummyBr.updateMatrix();
      flamesInstanced.setMatrixAt(idx, dummyBr.matrix);
    });

    stemsInstanced.instanceMatrix.needsUpdate = true;
    stemsInstanced.computeBoundingSphere();
    stemsInstanced.frustumCulled = true;

    bowlsInstanced.instanceMatrix.needsUpdate = true;
    bowlsInstanced.computeBoundingSphere();
    bowlsInstanced.frustumCulled = true;

    flamesInstanced.instanceMatrix.needsUpdate = true;
    flamesInstanced.computeBoundingSphere();
    flamesInstanced.frustumCulled = true;

    this.architectureGroup.add(stemsInstanced, bowlsInstanced, flamesInstanced);
  }

  // =========================================================================
  // 4. BỤC CHIẾU THƯ TRUNG TÂM & SÁCH MA THUẬT (HERO PEDESTAL)
  // =========================================================================
  initHeroPedestalAndMagicDecree() {
    const pedestalGroup = new THREE.Group();
    pedestalGroup.name = "Hero_Pedestal_Group";

    const base1Geo = new THREE.CylinderGeometry(1.2, 1.35, 0.28, 8);
    this.prepareGeometry(base1Geo);
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x2a2c2b,
      roughness: 0.65,
      metalness: 0.2
    });
    const base1 = new THREE.Mesh(base1Geo, stoneMat);
    base1.position.y = 0.14;
    base1.receiveShadow = true;
    pedestalGroup.add(base1);

    const base2Geo = new THREE.CylinderGeometry(0.98, 1.15, 0.32, 16);
    this.prepareGeometry(base2Geo);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.32,
      metalness: 0.85
    });
    const base2 = new THREE.Mesh(base2Geo, goldMat);
    base2.position.y = 0.44;
    pedestalGroup.add(base2);

    const stemGeo = new THREE.CylinderGeometry(0.72, 0.82, 0.45, 16);
    this.prepareGeometry(stemGeo);
    const stemMesh = new THREE.Mesh(stemGeo, stoneMat);
    stemMesh.position.y = 0.82;
    pedestalGroup.add(stemMesh);

    const topDaisGeo = new THREE.CylinderGeometry(0.92, 0.72, 0.18, 16);
    this.prepareGeometry(topDaisGeo);
    const topDais = new THREE.Mesh(topDaisGeo, goldMat);
    topDais.position.y = 1.13;
    pedestalGroup.add(topDais);

    pedestalGroup.position.set(0, 0.08, 0);
    this.modelsGroup.add(pedestalGroup);

    // SÁCH MA THUẬT / CUỘN CHIẾU THƯ
    this.bookGroup = new THREE.Group();
    this.bookGroup.name = "InteractiveBook_NamQuocSonHa_Group";

    const scrollCoreGeo = new THREE.BoxGeometry(1.15, 0.12, 0.82);
    this.prepareGeometry(scrollCoreGeo);

    const bookCanvas = document.createElement('canvas');
    bookCanvas.width = 512;
    bookCanvas.height = 512;
    const bctx = bookCanvas.getContext('2d');

    const bGrad = bctx.createLinearGradient(0, 0, 512, 512);
    bGrad.addColorStop(0, '#FFE8A3');
    bGrad.addColorStop(0.5, '#F5D77F');
    bGrad.addColorStop(1, '#D4AF37');
    bctx.fillStyle = bGrad;
    bctx.fillRect(0, 0, 512, 512);

    bctx.strokeStyle = '#8B0000';
    bctx.lineWidth = 12;
    bctx.strokeRect(16, 16, 480, 480);
    bctx.strokeStyle = '#D4AF37';
    bctx.lineWidth = 3;
    bctx.strokeRect(26, 26, 460, 460);

    bctx.fillStyle = '#8B0000';
    bctx.font = 'bold 36px serif';
    bctx.textAlign = 'center';
    bctx.fillText('南 國 山 河', 256, 95);

    bctx.fillStyle = '#222222';
    bctx.font = 'bold 24px "Times New Roman", serif';
    bctx.fillText('BẢN TUYÊN NGÔN ĐỘC LẬP', 256, 150);
    bctx.font = 'italic 18px "Times New Roman", serif';
    bctx.fillText('Lý Thường Kiệt • Phòng Tuyến Sông Như Nguyệt', 256, 185);

    bctx.font = 'bold 22px serif';
    bctx.fillStyle = '#8B0000';
    bctx.fillText('南 國 山 河 南 帝 居', 256, 245);
    bctx.fillText('截 然 定 分 在 天 書', 256, 290);
    bctx.fillText('如 何 逆 虜 來 侵 犯', 256, 335);
    bctx.fillText('汝 等 行 看 取 敗 虛', 256, 380);

    bctx.fillStyle = '#B82818';
    bctx.fillRect(226, 410, 60, 60);
    bctx.fillStyle = '#FFF';
    bctx.font = 'bold 16px serif';
    bctx.fillText('SẮC', 256, 435);
    bctx.fillText('MỆNH', 256, 455);

    const scrollTex = new THREE.CanvasTexture(bookCanvas);
    const scrollMat = new THREE.MeshStandardMaterial({
      map: scrollTex,
      roughness: 0.35,
      metalness: 0.3,
      emissive: 0x332205,
      emissiveIntensity: 0.4
    });

    this.bookMesh = new THREE.Mesh(scrollCoreGeo, scrollMat);
    this.bookMesh.name = "InteractiveBook_NamQuocSonHa";
    this.bookMesh.castShadow = true;
    this.bookMesh.receiveShadow = true;
    this.bookMesh.userData.isDynamic = true;
    this.bookMesh.userData.portalMetadata = {
      id: 'nam_quoc_son_ha',
      title: 'NAM QUỐC SƠN HÀ',
      author: 'Tương truyền Lý Thường Kiệt (1019 – 1105)',
      genre: 'Thơ ca Trung đại (Thời Lý)',
      quote: 'Nam quốc sơn hà Nam đế cư, tiệt nhiên định phận tại thiên thư – Bản tuyên ngôn độc lập đầu tiên.',
      targetZoneId: 1,
      themeColor: 0xf1c40f,
      portalReady: true
    };
    this.bookGroup.add(this.bookMesh);

    const rodGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.32, 16);
    this.prepareGeometry(rodGeo);
    const jadeMat = new THREE.MeshStandardMaterial({
      color: 0x3d7e5d,
      roughness: 0.2,
      metalness: 0.2,
      emissive: 0x0f2b1a,
      emissiveIntensity: 0.3
    });

    const rodLeft = new THREE.Mesh(rodGeo, jadeMat);
    rodLeft.rotation.z = Math.PI * 0.5;
    rodLeft.position.set(0, 0, 0.42);
    this.bookGroup.add(rodLeft);

    const rodRight = new THREE.Mesh(rodGeo, jadeMat);
    rodRight.rotation.z = Math.PI * 0.5;
    rodRight.position.set(0, 0, -0.42);
    this.bookGroup.add(rodRight);

    [-0.67, 0.67].forEach(x => {
      [-0.42, 0.42].forEach(z => {
        const knobGeo = new THREE.SphereGeometry(0.065, 12, 12);
        this.prepareGeometry(knobGeo);
        const knob = new THREE.Mesh(knobGeo, goldMat);
        knob.position.set(x, 0, z);
        this.bookGroup.add(knob);
      });
    });

    const ringGeo = new THREE.TorusGeometry(0.88, 0.015, 8, 48);
    this.prepareGeometry(ringGeo);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffe680,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    this.floatingRing = new THREE.Mesh(ringGeo, ringMat);
    this.floatingRing.rotation.x = Math.PI * 0.45;
    this.floatingRing.userData.isDynamic = true;
    this.bookGroup.add(this.floatingRing);

    this.bookGroup.position.set(0, 1.62, 0);
    this.modelsGroup.add(this.bookGroup);
  }

  // =========================================================================
  // 5. BỘ BA BẢO VẬT DIORAMA: BIA ĐÁ, BẢO KIẾM & TRỐNG TRẬN
  // =========================================================================
  initSteleMonolithDiorama() {
    const steleGroup = new THREE.Group();
    steleGroup.name = "Stele_Monolith_Diorama_Group";

    const shellGeo = new THREE.SphereGeometry(1.2, 16, 12);
    shellGeo.scale(1.2, 0.45, 1.5);
    this.prepareGeometry(shellGeo);
    const turtleMat = new THREE.MeshStandardMaterial({
      color: 0x3a403e,
      roughness: 0.72,
      metalness: 0.15
    });
    const shellMesh = new THREE.Mesh(shellGeo, turtleMat);
    shellMesh.position.set(0, 0.45, 0);
    shellMesh.receiveShadow = true;
    steleGroup.add(shellMesh);

    const headGeo = new THREE.CylinderGeometry(0.2, 0.28, 0.6, 12);
    this.prepareGeometry(headGeo);
    const headMesh = new THREE.Mesh(headGeo, turtleMat);
    headMesh.rotation.x = Math.PI * 0.35;
    headMesh.position.set(0, 0.55, 1.65);
    steleGroup.add(headMesh);

    const slabGeo = new THREE.BoxGeometry(1.4, 2.5, 0.28);
    this.prepareGeometry(slabGeo);

    const steleTex = createSteleInscriptionTexture(512, 1024);
    const steleMat = new THREE.MeshStandardMaterial({
      map: steleTex,
      roughness: 0.55,
      metalness: 0.25,
      emissive: 0x2b1e06,
      emissiveIntensity: 0.35
    });

    const slabMesh = new THREE.Mesh(slabGeo, steleMat);
    slabMesh.position.set(0, 1.85, 0);
    slabMesh.castShadow = true;
    slabMesh.receiveShadow = true;
    steleGroup.add(slabMesh);

    const crownGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.28, 16, 1, false, 0, Math.PI);
    this.prepareGeometry(crownGeo);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.35,
      metalness: 0.85
    });
    const crownMesh = new THREE.Mesh(crownGeo, goldMat);
    crownMesh.rotation.z = Math.PI * 0.5;
    crownMesh.rotation.y = Math.PI * 0.5;
    crownMesh.position.set(0, 3.1, 0);
    steleGroup.add(crownMesh);

    steleGroup.position.set(0, 0.08, -3.2);
    this.modelsGroup.add(steleGroup);
  }

  initLyDragonSwordDiorama() {
    const swordDiorama = new THREE.Group();
    swordDiorama.name = "Ly_Dragon_Sword_Diorama_Group";

    const standTableGeo = new THREE.BoxGeometry(1.6, 0.85, 0.65);
    this.prepareGeometry(standTableGeo);
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x3d1a14,
      roughness: 0.35,
      metalness: 0.1
    });
    const tableMesh = new THREE.Mesh(standTableGeo, woodMat);
    tableMesh.position.set(0, 0.425, 0);
    swordDiorama.add(tableMesh);

    [-0.45, 0.45].forEach(x => {
      const restGeo = new THREE.BoxGeometry(0.08, 0.35, 0.25);
      this.prepareGeometry(restGeo);
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.85 });
      const restMesh = new THREE.Mesh(restGeo, goldMat);
      restMesh.position.set(x, 0.98, 0);
      swordDiorama.add(restMesh);
    });

    const swordGroup = new THREE.Group();
    swordGroup.name = "Dragon_Sword_Mesh";

    const bladeGeo = new THREE.BoxGeometry(1.2, 0.02, 0.08);
    this.prepareGeometry(bladeGeo);
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0xdde5ed,
      roughness: 0.15,
      metalness: 0.95
    });
    const bladeMesh = new THREE.Mesh(bladeGeo, steelMat);
    bladeMesh.position.set(0.15, 0, 0);
    swordGroup.add(bladeMesh);

    const hiltGeo = new THREE.CylinderGeometry(0.025, 0.035, 0.32, 12);
    this.prepareGeometry(hiltGeo);
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.85 });
    const hiltMesh = new THREE.Mesh(hiltGeo, goldMat);
    hiltMesh.rotation.z = Math.PI * 0.5;
    hiltMesh.position.set(-0.58, 0, 0);
    swordGroup.add(hiltMesh);

    const pommelGeo = new THREE.SphereGeometry(0.05, 12, 12);
    this.prepareGeometry(pommelGeo);
    const jadeMat = new THREE.MeshStandardMaterial({ color: 0x2e6b48, roughness: 0.2, metalness: 0.3 });
    const pommelMesh = new THREE.Mesh(pommelGeo, jadeMat);
    pommelMesh.position.set(-0.75, 0, 0);
    swordGroup.add(pommelMesh);

    swordGroup.position.set(0, 1.15, 0);
    swordDiorama.add(swordGroup);

    swordDiorama.position.set(2.8, 0.08, 0.8);
    swordDiorama.rotation.y = -Math.PI * 0.25;
    this.modelsGroup.add(swordDiorama);
  }

  initWarDrumsDiorama() {
    const drumDiorama = new THREE.Group();
    drumDiorama.name = "War_Drum_Diorama_Group";

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x3a1e16, roughness: 0.6 });
    [-0.5, 0.5].forEach(z => {
      const leg1Geo = new THREE.CylinderGeometry(0.06, 0.06, 1.6, 12);
      this.prepareGeometry(leg1Geo);
      const leg1 = new THREE.Mesh(leg1Geo, frameMat);
      leg1.rotation.z = Math.PI * 0.18;
      leg1.position.set(-0.25, 0.75, z);
      drumDiorama.add(leg1);

      const leg2 = new THREE.Mesh(leg1Geo, frameMat);
      leg2.rotation.z = -Math.PI * 0.18;
      leg2.position.set(0.25, 0.75, z);
      drumDiorama.add(leg2);
    });

    const drumBodyGeo = new THREE.CylinderGeometry(0.72, 0.65, 0.95, 24);
    this.prepareGeometry(drumBodyGeo);
    const drumMat = new THREE.MeshStandardMaterial({
      color: 0x8b1a1a,
      roughness: 0.45,
      metalness: 0.2
    });
    const drumMesh = new THREE.Mesh(drumBodyGeo, drumMat);
    drumMesh.rotation.z = Math.PI * 0.5;
    drumMesh.position.set(0, 1.15, 0);
    drumMesh.castShadow = true;
    drumDiorama.add(drumMesh);

    [-0.48, 0.48].forEach(x => {
      const headGeo = new THREE.CircleGeometry(0.66, 24);
      this.prepareGeometry(headGeo);
      const headMat = new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        roughness: 0.55,
        metalness: 0.4,
        side: THREE.DoubleSide
      });
      const headMesh = new THREE.Mesh(headGeo, headMat);
      headMesh.rotation.y = Math.PI * 0.5;
      headMesh.position.set(x, 1.15, 0);
      drumDiorama.add(headMesh);
    });

    drumDiorama.position.set(-2.8, 0.08, 0.8);
    drumDiorama.rotation.y = Math.PI * 0.25;
    this.modelsGroup.add(drumDiorama);
  }

  // =========================================================================
  // 6. ÁN THƯ NGHIÊN BÚT & ĐỈNH ĐỒNG TRẦM HƯƠNG TỎA KHÓI
  // =========================================================================
  initRoyalDeskAndIncenseBurner() {
    const deskGroup = new THREE.Group();
    deskGroup.name = "Royal_Desk_Incense_Group";

    // Bàn án thư gỗ trắc thếp vàng
    const deskGeo = new THREE.BoxGeometry(2.4, 0.88, 1.0);
    this.prepareGeometry(deskGeo);
    const deskMat = new THREE.MeshStandardMaterial({
      color: 0x2e110b,
      roughness: 0.35,
      metalness: 0.15
    });
    const deskMesh = new THREE.Mesh(deskGeo, deskMat);
    deskMesh.position.set(0, 0.44, 0);
    deskGroup.add(deskMesh);

    // Nghiên mực đá hoa cương & Ống bút ngọc
    const inkGeo = new THREE.CylinderGeometry(0.12, 0.14, 0.05, 16);
    this.prepareGeometry(inkGeo);
    const inkMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 });
    const inkMesh = new THREE.Mesh(inkGeo, inkMat);
    inkMesh.position.set(0.6, 0.905, 0.2);
    deskGroup.add(inkMesh);

    // Đỉnh đồng trầm hương cổ (Incense Burner)
    const burnerGeo = new THREE.CylinderGeometry(0.18, 0.14, 0.26, 16);
    this.prepareGeometry(burnerGeo);
    const bronzeMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.35, metalness: 0.8 });
    const burnerMesh = new THREE.Mesh(burnerGeo, bronzeMat);
    burnerMesh.position.set(-0.6, 1.01, 0.15);
    deskGroup.add(burnerMesh);

    // Hạt khói trầm hương bốc lên mềm mại
    const smokeGeo = new THREE.BufferGeometry();
    const smokePos = new Float32Array(this.smokeCount * 3);
    for (let i = 0; i < this.smokeCount; i++) {
      smokePos[i * 3] = -0.6;
      smokePos[i * 3 + 1] = 1.15 + (i / this.smokeCount) * 1.8;
      smokePos[i * 3 + 2] = 0.15;

      this.smokeData.push({
        height: (i / this.smokeCount) * 1.8,
        speed: 0.22 + Math.random() * 0.15,
        freq: 1.5 + Math.random() * 1.5,
        phase: Math.random() * Math.PI * 2
      });
    }
    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
    this.prepareGeometry(smokeGeo);

    const smokeMat = new THREE.PointsMaterial({
      color: 0xe0d6cc,
      size: 0.08,
      transparent: true,
      opacity: 0.45,
      blending: THREE.NormalBlending,
      depthWrite: false
    });
    this.incenseSmoke = new THREE.Points(smokeGeo, smokeMat);
    deskGroup.add(this.incenseSmoke);

    // Đặt án thư ở vị trí phía sau bên phải: X = 0, Z = -5.8m
    deskGroup.position.set(0, 0.08, -5.8);
    this.modelsGroup.add(deskGroup);
  }

  // =========================================================================
  // 7. CÂY TÙNG THẾ CỔ THỤ & BÌNH GỐM MEN NGỌC TRIỀU LÝ
  // =========================================================================
  initRoyalBonsaiAndPorcelainVases() {
    // 2 Chậu cây tùng / trúc quân tử thế cổ thụ đặt 2 bên bục
    const treeMat = new THREE.MeshStandardMaterial({ color: 0x244222, roughness: 0.7 });
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2417, roughness: 0.8 });

    [-4.5, 4.5].forEach((tx, idx) => {
      const treeGroup = new THREE.Group();

      // Chậu gốm
      const potGeo = new THREE.CylinderGeometry(0.48, 0.38, 0.55, 12);
      this.prepareGeometry(potGeo);
      const potMat = new THREE.MeshStandardMaterial({ color: 0x8b3a2a, roughness: 0.5 });
      const pot = new THREE.Mesh(potGeo, potMat);
      pot.position.y = 0.275;
      treeGroup.add(pot);

      // Thân tùng uốn lượn
      const trunkGeo = new THREE.CylinderGeometry(0.12, 0.18, 2.2, 10);
      this.prepareGeometry(trunkGeo);
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.35;
      trunk.rotation.z = (idx === 0 ? 1 : -1) * 0.15;
      treeGroup.add(trunk);

      // Tán lá xanh xếp tầng
      [1.8, 2.3, 2.7].forEach((h, tidx) => {
        const foliageGeo = new THREE.ConeGeometry(0.85 - tidx * 0.18, 0.65, 8);
        this.prepareGeometry(foliageGeo);
        const foliage = new THREE.Mesh(foliageGeo, treeMat);
        foliage.position.y = h;
        treeGroup.add(foliage);
      });

      treeGroup.position.set(tx, 0.08, -0.5);
      this.modelsGroup.add(treeGroup);
    });

    // 4 Bình gốm men ngọc hoàng gia thời Lý cao 1.6m
    const vasePositions = [
      { x: -8.5, z: 2.0 },
      { x: 8.5, z: 2.0 },
      { x: -8.5, z: -6.0 },
      { x: 8.5, z: -6.0 }
    ];

    const vaseMat = new THREE.MeshStandardMaterial({
      color: 0x2d6b53,
      roughness: 0.18,
      metalness: 0.35
    });

    vasePositions.forEach((vp) => {
      const vaseGroup = new THREE.Group();
      const bodyGeo = new THREE.CylinderGeometry(0.32, 0.24, 1.2, 16);
      this.prepareGeometry(bodyGeo);
      const body = new THREE.Mesh(bodyGeo, vaseMat);
      body.position.y = 0.6;
      vaseGroup.add(body);

      const neckGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.4, 16);
      this.prepareGeometry(neckGeo);
      const neck = new THREE.Mesh(neckGeo, vaseMat);
      neck.position.y = 1.4;
      vaseGroup.add(neck);

      vaseGroup.position.set(vp.x, 0.08, vp.z);
      this.modelsGroup.add(vaseGroup);
    });
  }

  // =========================================================================
  // 8. HỆ THỐNG CHIẾU SÁNG TỐI ƯU HÓA (1 POINTLIGHT TRUNG TÂM & 0% SHADOW OVERHEAD)
  // =========================================================================
  initAtmosphericLighting() {
    try {
      // 1. HemisphereLight riêng của phòng 02: Bù sáng toàn diện, triệt tiêu mọi góc tối đen (tốn 0% GPU)
      const roomHemi = new THREE.HemisphereLight(0xffeedd, 0x443322, 2.2);
      roomHemi.position.set(0, 14, 0);
      this.lightsGroup.add(roomHemi);

      // 2. HERO SPOTLIGHT: Chiếu rọi Bục Sách Trung Tâm (TẮT castShadow để khóa 60 FPS)
      const heroSpot = new THREE.SpotLight(0xffe890, 5.5, 18.0, Math.PI / 4.5, 0.45, 1.6);
      heroSpot.name = "Room02_Hero_Pedestal_SpotLight";
      heroSpot.position.set(0, 8.5, 0.5);

      const heroTarget = new THREE.Object3D();
      heroTarget.position.set(0, 1.2, 0);
      this.group.add(heroTarget);
      heroSpot.target = heroTarget;
      heroSpot.castShadow = false; // CRITICAL GPU SAVER: Tắt hoàn toàn shadow map trên Spotlight

      this.lightsGroup.add(heroSpot);
      this.heroSpot = heroSpot;

      // 3. SpotLight rọi Bức Phù Điêu Sơn Mài Hoàng Gia (castShadow = false)
      const muralSpot = new THREE.SpotLight(0xffdf88, 4.2, 14.0, Math.PI / 3.8, 0.5, 1.6);
      muralSpot.name = "Room02_Mural_SpotLight";
      muralSpot.position.set(0, 6.5, -4.5);
      const muralTarget = new THREE.Object3D();
      muralTarget.position.set(0, 4.2, -8.2);
      this.group.add(muralTarget);
      muralSpot.target = muralTarget;
      muralSpot.castShadow = false;
      this.lightsGroup.add(muralSpot);

      // 4. SpotLight rọi Bia Đá Thần Phán (castShadow = false)
      const steleSpot = new THREE.SpotLight(0xf1c40f, 3.8, 12.0, Math.PI / 4.5, 0.5, 1.6);
      steleSpot.name = "Room02_Stele_SpotLight";
      steleSpot.position.set(0, 5.8, -0.8);
      const steleTarget = new THREE.Object3D();
      steleTarget.position.set(0, 2.0, -3.2);
      this.group.add(steleTarget);
      steleSpot.target = steleTarget;
      steleSpot.castShadow = false;
      this.lightsGroup.add(steleSpot);

      // 5. POINTLIGHT TRUNG TÂM DUY NHẤT (Thay thế 4 PointLight cũ, decay = 2, castShadow = false)
      const centerPoint = new THREE.PointLight(0xffd77a, 4.8, 28.0, 2.0);
      centerPoint.name = "Room02_Center_Warm_PointLight";
      centerPoint.position.set(0, 5.5, 0);
      centerPoint.castShadow = false;
      this.lightsGroup.add(centerPoint);
    } catch (e) {
      console.warn("[SELF-HEALING] Error initializing atmospheric lighting:", e);
    }
  }

  // =========================================================================
  // 9. HẠT BỤI VÀNG HOÀNG KIM & LINH KHÍ (120 HẠT)
  // =========================================================================
  initImperialDustParticles() {
    try {
      const geo = new THREE.BufferGeometry();
      const posArr = new Float32Array(this.goldDustCount * 3);

      for (let i = 0; i < this.goldDustCount; i++) {
        const x = (Math.random() - 0.5) * 12.0;
        const y = 0.5 + Math.random() * 4.5;
        const z = (Math.random() - 0.5) * 12.0;

        posArr[i * 3] = x;
        posArr[i * 3 + 1] = y;
        posArr[i * 3 + 2] = z;

        this.goldDustData.push({
          baseY: y,
          speedY: 0.15 + Math.random() * 0.25,
          freq: 1.0 + Math.random() * 2.0,
          ampX: 0.15 + Math.random() * 0.25,
          ampZ: 0.15 + Math.random() * 0.25,
          phase: Math.random() * Math.PI * 2
        });
      }

      geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
      this.prepareGeometry(geo);

      const mat = new THREE.PointsMaterial({
        color: 0xffdf78,
        size: 0.075,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      this.goldDustParticles = new THREE.Points(geo, mat);
      this.goldDustParticles.name = "Room02_Gold_Dust_VFX";
      this.particlesGroup.add(this.goldDustParticles);
    } catch (e) {
      console.warn("[SELF-HEALING] Error initializing gold dust particles:", e);
    }
  }

  // =========================================================================
  // 10. BẬT/TẮT ĐÈN THEO CỰ LY CAMERA (60 FPS PERFORMANCE LOCK)
  // =========================================================================
  setLightsActive(active) {
    if (this.lightsActive === active) return;
    this.lightsActive = active;
    if (this.lightsGroup) this.lightsGroup.visible = active;
    if (this.particlesGroup) this.particlesGroup.visible = active;
  }

  // =========================================================================
  // 11. UPDATE LOOP: SINE WAVE HOVER, RUNE RING & KHÓI TRẦM (OPTIMIZED 2-FRAME THROTTLE)
  // =========================================================================
  update(delta = 0.016, elapsedTime = 0) {
    if (this.lightsActive === false) return;

    // 1. Hiệu ứng cuộn chiếu thư lơ lửng bồng bềnh & xoay nhẹ
    if (this.bookGroup) {
      this.bookGroup.position.y = 1.62 + Math.sin(elapsedTime * 1.5) * 0.06;
      this.bookGroup.rotation.y = Math.sin(elapsedTime * 0.4) * 0.15;
      this.bookGroup.updateMatrix();
    }

    // 2. Vòng linh khí phù chú xoay tròn xung quanh
    if (this.floatingRing) {
      this.floatingRing.rotation.z = elapsedTime * 0.8;
      this.floatingRing.rotation.y = elapsedTime * 0.5;
      this.floatingRing.updateMatrix();
    }

    // Cắt giảm 50% CPU: Chỉ tính toán hạt mỗi 2 frame
    this.particleFrameCounter = (this.particleFrameCounter || 0) + 1;
    if (this.particleFrameCounter % 2 !== 0) return;

    const twoFrameDelta = delta * 2.0;

    // 3. Khói trầm hương bốc lên từ đỉnh đồng
    if (this.incenseSmoke?.geometry?.attributes?.position) {
      const posAttr = this.incenseSmoke.geometry.attributes.position;
      const arr = posAttr.array;

      for (let i = 0; i < this.smokeCount; i++) {
        const d = this.smokeData[i];
        const idx = i * 3;

        d.height += d.speed * twoFrameDelta;
        if (d.height > 1.8) {
          d.height = 0.05;
        }

        arr[idx] = -0.6 + Math.sin(elapsedTime * d.freq + d.phase) * (d.height * 0.12);
        arr[idx + 1] = 1.15 + d.height;
        arr[idx + 2] = 0.15 + Math.cos(elapsedTime * d.freq + d.phase) * (d.height * 0.12);
      }
      posAttr.needsUpdate = true;
    }

    // 4. Bụi vàng hoàng kim lượn sóng
    if (this.goldDustParticles?.geometry?.attributes?.position) {
      const posAttr = this.goldDustParticles.geometry.attributes.position;
      const arr = posAttr.array;

      for (let i = 0; i < this.goldDustCount; i++) {
        const d = this.goldDustData[i];
        const idx = i * 3;

        let y = arr[idx + 1] + d.speedY * twoFrameDelta;
        if (y > 4.5) y = 0.4;
        arr[idx + 1] = y;

        arr[idx] += Math.sin(elapsedTime * d.freq + d.phase) * 0.003;
        arr[idx + 2] += Math.cos(elapsedTime * d.freq + d.phase) * 0.003;
      }
      posAttr.needsUpdate = true;
    }
  }

  // =========================================================================
  // 12. KHỬ ĐỘC NaN & ĐÓNG BĂNG MATRIX CỦA MESH TĨNH
  // =========================================================================
  sanitizeAndFreezeStaticGeometries() {
    this.group.traverse((child) => {
      if (child.isMesh || child.isPoints || child.isLine) {
        child.frustumCulled = true;

        if (child.geometry) {
          this.prepareGeometry(child.geometry);
        }

        if (!child.userData?.isDynamic) {
          child.matrixAutoUpdate = false;
          child.updateMatrix();
        }

        // ÉP KIỂU THREE.FrontSide: Tắt DoubleSide cho các khối kiến trúc đặc để giảm 50% tải GPU
        if (child.isMesh && child.material) {
          const meshName = (child.name || '').toLowerCase();
          const isThin = meshName.includes('rug') || meshName.includes('mural') ||
            meshName.includes('banner') || meshName.includes('flag') || meshName.includes('scroll') ||
            meshName.includes('couplet') || meshName.includes('smoke') || meshName.includes('vfx') ||
            meshName.includes('petal') || meshName.includes('leaf');

          const mats = Array.isArray(child.material) ? child.material : [child.material];
          mats.forEach(mat => {
            if (mat && !isThin && mat.side === THREE.DoubleSide) {
              mat.side = THREE.FrontSide;
              mat.needsUpdate = true;
            }
          });
        }
      }
    });
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
      console.warn("[SELF-HEALING] Error disposing NamQuocSonHaRoomDecor:", e);
    }
  }
}

export default NamQuocSonHaRoomDecor;
