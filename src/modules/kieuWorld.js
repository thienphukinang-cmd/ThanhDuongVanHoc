import * as THREE from 'three';
import { loadGlbCached } from '../utils/modelLoaderHelper.js';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger.js';
import { NarrativeTrigger } from './NarrativeTrigger.js';
import { SpatialAudio } from './SpatialAudio.js';

/**
 * KIEU WORLD MODULE: KHÔNG GIAN TỰ SỰ TRUYỆN KIỀU (TIẾT THANH MINH)
 * Skills: threejs-procedural-architecture, threejs-art-director, threejs-vfx
 * 
 * "Cỏ non xanh tận chân trời,
 *  Cành lê trắng điểm một vài bông hoa.
 *  Tà tà bóng ngả về tây,
 *  Giai nhân ngắm cảnh rảo bước về chiều.
 *  Nao nao dòng nước uốn quanh,
 *  Dịp cầu nho nhỏ cuối ghềnh bắc ngang."
 * 
 * CÁC PHÂN HỆ CHÍNH:
 * 1. Địa hình thảo nguyên đồi thoai thoải (Rolling Meadow Hills: 120m x 120m).
 * 2. Dòng suối uốn lượn ("Nao nao dòng nước uốn quanh") với hoạt ảnh UV nước trôi lững lờ.
 * 3. Điểm mốc Tự sự (Narrative Landmarks):
 *    - "Nhịp Cầu Thoang Thoảng" bắc ngang khúc hẹp của dòng nước.
 *    - "Nấm Mồ Đạm Tiên" bên rìa đồi cỏ (X: -15, Z: -5) với gò đất cỏ úa, bia đá cổ và dải khói hương lững lờ.
 * 4. Rặng liễu rủ (5 cây liễu cổ thụ) & cành hoa lê trắng (Instanced Leaves & Blossoms).
 * 5. Khí quyển hoàng hôn chiều xuân ("Tà tà bóng ngả về tây") với FogExp2 (#E8C5B0, 0.008) & DirectionalLight vàng mật ong.
 * 6. Hệ thống 300 hạt cánh hoa rơi lơ lửng (Blossom Particle System) bay dạt theo làn gió xuân.
 * 7. Bức Cuốn Thư cổ lơ lửng phát ánh sáng lam ngọc bích (Cổng dịch chuyển trở về bảo tàng).
 * 8. NarrativeTrigger: Proximity Poetry Triggers kích hoạt 3 khổ thơ Nguyễn Du qua Typography HUD mờ ảo (tối ưu distanceToSquared).
 * 9. SpatialAudio: Khung sườn âm thanh không gian tiếng suối róc rách & nhạc cụ truyền thống.
 */

function createRiverFlowTexture(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#2d6b63';
  ctx.fillRect(0, 0, size, size);

  // Vân sóng nước nhẹ lăn tăn
  ctx.strokeStyle = 'rgba(120, 215, 200, 0.35)';
  ctx.lineWidth = 3;
  for (let y = 0; y < size; y += 14) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 30) {
      const cy = y + Math.sin((x / size) * Math.PI * 8.0) * 5.0;
      ctx.lineTo(x, cy);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 2);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

function createPetalTexture(size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.translate(size / 2, size / 2);
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.42);
  ctx.bezierCurveTo(size * 0.35, -size * 0.25, size * 0.32, size * 0.25, 0, size * 0.42);
  ctx.bezierCurveTo(-size * 0.32, size * 0.25, -size * 0.35, -size * 0.25, 0, -size * 0.42);
  ctx.closePath();

  const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, size * 0.4);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.65, '#ffe0ea');
  grad.addColorStop(1, 'rgba(255, 180, 205, 0.0)');
  ctx.fillStyle = grad;
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

function createSmokePuffTexture(size = 64) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(235, 225, 210, 0.85)');
  grad.addColorStop(0.4, 'rgba(215, 205, 190, 0.45)');
  grad.addColorStop(1, 'rgba(180, 170, 160, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

function createSteleTexture(size = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size * 2;
  const ctx = canvas.getContext('2d');

  // Nền đá xám rêu phong cũ kỹ
  ctx.fillStyle = '#565d58';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Vết loang rêu phong
  ctx.fillStyle = '#424a40';
  for (let i = 0; i < 40; i++) {
    const rx = Math.random() * canvas.width;
    const ry = Math.random() * canvas.height;
    const rw = Math.random() * 40 + 10;
    ctx.beginPath();
    ctx.arc(rx, ry, rw, 0, Math.PI * 2);
    ctx.fill();
  }

  // Khung chỉ cổ
  ctx.strokeStyle = '#3d443e';
  ctx.lineWidth = 6;
  ctx.strokeRect(16, 24, canvas.width - 32, canvas.height - 48);

  // Chữ khắc mờ "ĐẠM TIÊN"
  ctx.fillStyle = '#2f3530';
  ctx.font = 'bold 26px serif';
  ctx.textAlign = 'center';
  ctx.fillText('ĐẠM TIÊN', canvas.width / 2, canvas.height * 0.42);
  ctx.font = 'italic 16px serif';
  ctx.fillText('CHI MỘ', canvas.width / 2, canvas.height * 0.52);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

export class KieuWorld {
  constructor(scene = null, materialLibrary = null, camera = null, options = {}) {
    this.scene = scene;
    this.matLib = materialLibrary;
    this.camera = camera;
    this.options = options || {};

    this.group = new THREE.Group();
    this.group.name = "KieuWorld_TietThanhMinh";
    this.group.visible = false; // Mặc định ẩn, bật khi dịch chuyển

    this._isBuilt = false;
    this.audioManager = null;
    this.interactiveWaypoint = null; // Bức cuốn thư cổ trở về
    this.smokePoints = null;

    if (this.scene?.add) {
      this.scene.add(this.group);
    }

    if (!this.options.lazy) {
      this.activate();
    }
  }

  activate() {
    if (this._isBuilt) return this.group;
    this._isBuilt = true;

    try {
      this.waterTexture = createRiverFlowTexture();
      this.petalTexture = createPetalTexture();
      this.smokeTexture = createSmokePuffTexture();
      this.steleTexture = createSteleTexture();

      this.initAtmosphereAndSky();
      this.initRollingHillsTerrain();
      this.initMeanderingStream();
      this.initRusticBridge();
      this.initDamTienGrave();
      this.initWeepingWillowsAndBlossoms();
      this.initBlossomParticles();
      this.initReturnScrollWaypoint();
      this.initObservationOverlook();
      this.initNarrativeAndAudioSystems();

      if (this.audioManager) {
        this.setAudioManager(this.audioManager);
      }
      if (this.scene?.add && this.group.parent !== this.scene) {
        this.scene.add(this.group);
      }
      console.log("%c✓ Đã kiến tạo Thế Giới Tự Sự Truyện Kiều (Tiết Thanh Minh) thành công!", "color: #ff99bb; font-weight: bold; font-size: 13px;");
    } catch (err) {
      this._isBuilt = false;
      console.error("[SELF-HEALING] Lỗi khởi tạo KieuWorld:", err);
    }
    return this.group;
  }

  prepareGeometry(geo) {
    if (!geo) return;
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();

    ['position', 'normal'].forEach(attrName => {
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
  }

  /**
   * Tính toán độ cao đồi cỏ tại vị trí (x, z)
   */
  getTerrainHeight(x, z) {
    // Độ dốc thoải (rolling hills)
    const hill1 = Math.sin(x * 0.045) * Math.cos(z * 0.045) * 1.8;
    const hill2 = Math.sin((x + 12) * 0.08) * 0.6 + Math.cos((z - 8) * 0.07) * 0.7;
    let h = hill1 + hill2;

    // Lòng suối uốn lượn tại z = 6 * sin(x * 0.05) - 2.0
    const streamZ = 6.0 * Math.sin(x * 0.05) - 2.0;
    const distToStream = Math.abs(z - streamZ);
    if (distToStream < 7.5) {
      const factor = distToStream / 7.5;
      const streamDepression = (1.0 - factor * factor) * 1.5;
      h -= streamDepression;
    }

    return h;
  }

  /**
   * 1. KHÍ QUYỂN & ÁNH SÁNG HOÀNG HÔN ("TÀ TÀ BÓNG NGẢ VỀ TÂY")
   */
  initAtmosphereAndSky() {
    this.lightingGroup = new THREE.Group();
    this.lightingGroup.name = "KieuWorld_Lighting_Atmosphere";

    // Vòm trời hoàng hôn chiều xuân (Sky Dome bán kính 300m)
    const skyGeo = new THREE.SphereGeometry(300, 32, 20);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uColorZenith: { value: new THREE.Color(0x352945) },   // Tím mộng mơ thiên đỉnh
        uColorMid: { value: new THREE.Color(0xbd8678) },      // Hồng tím bảng lảng
        uColorHorizon: { value: new THREE.Color(0xf5cb98) },  // Vàng cam ấm chân trời
        uColorSun: { value: new THREE.Color(0xfff0c4) }       // Ánh dương vàng mật ong
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColorZenith;
        uniform vec3 uColorMid;
        uniform vec3 uColorHorizon;
        uniform vec3 uColorSun;
        varying vec3 vWorldPos;

        void main() {
          vec3 nPos = normalize(vWorldPos);
          float h = nPos.y;

          vec3 sky = mix(uColorHorizon, uColorMid, smoothstep(-0.02, 0.32, h));
          sky = mix(sky, uColorZenith, smoothstep(0.32, 0.90, h));

          // Mặt trời lặn hướng Tây-Tây Nam
          vec3 sunDir = normalize(vec3(-0.8, 0.15, -0.4));
          float sunDot = max(0.0, dot(nPos, sunDir));
          sky += uColorSun * pow(sunDot, 16.0) * 0.75;
          sky += uColorSun * pow(sunDot, 3.0) * 0.25;

          gl_FragColor = vec4(sky, 1.0);
        }
      `
    });

    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.lightingGroup.add(skyDome);

    // Ánh sáng Ambient dịu mát
    const ambient = new THREE.AmbientLight(0xd4af96, 1.05);
    this.lightingGroup.add(ambient);

    // Bán cầu ánh sáng hoàng hôn
    const hemi = new THREE.HemisphereLight(0xf2cfb1, 0x546b46, 0.85);
    hemi.position.set(0, 30, 0);
    this.lightingGroup.add(hemi);

    // Ánh nắng hoàng hôn chiếu thấp xiên qua rặng liễu ("Tà tà bóng ngả về tây")
    const sunLight = new THREE.DirectionalLight(0xffdfa0, 2.75);
    sunLight.position.set(-45, 8, -20);
    sunLight.target.position.set(0, 1, 0);
    this.lightingGroup.add(sunLight);
    this.lightingGroup.add(sunLight.target);

    sunLight.castShadow = false;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 120;
    const sBox = 55;
    sunLight.shadow.camera.left = -sBox;
    sunLight.shadow.camera.right = sBox;
    sunLight.shadow.camera.top = sBox;
    sunLight.shadow.camera.bottom = -sBox;
    sunLight.shadow.bias = -0.0004;

    this.group.add(this.lightingGroup);
  }

  /**
   * 2. ĐỊA HÌNH THẢO NGUYÊN ĐỒI THOAI THOẢI ("CỎ NON XANH TẬN CHÂN TRỜI")
   */
  initRollingHillsTerrain() {
    const size = 120;
    const segs = 64;
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = [];
    const colorMeadow1 = new THREE.Color(0x7ba05b); // Xanh mạ non
    const colorMeadow2 = new THREE.Color(0x8fbc8f); // Xanh ngọc lục nhạt
    const colorBank = new THREE.Color(0x6b8252);    // Đất cỏ ven bờ suối

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.getTerrainHeight(x, z);
      pos.setY(i, y);

      const streamZ = 6.0 * Math.sin(x * 0.05) - 2.0;
      const dist = Math.abs(z - streamZ);

      let vertexCol = new THREE.Color();
      if (dist < 4.0) {
        vertexCol.lerpColors(colorBank, colorMeadow1, dist / 4.0);
      } else {
        const noise = (Math.sin(x * 0.1) + Math.cos(z * 0.1)) * 0.5 + 0.5;
        vertexCol.lerpColors(colorMeadow1, colorMeadow2, noise);
      }
      colors.push(vertexCol.r, vertexCol.g, vertexCol.b);
    }

    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.prepareGeometry(geo);

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.90,
      metalness: 0.02,
      flatShading: true,
      side: THREE.FrontSide
    });

    const terrainMesh = new THREE.Mesh(geo, mat);
    terrainMesh.name = "Rolling_Hills_Meadow";
    terrainMesh.castShadow = false;
    terrainMesh.receiveShadow = false;
    terrainMesh.frustumCulled = true;

    this.group.add(terrainMesh);
  }

  /**
   * 3. DÒNG NƯỚC UỐN LƯỢN ("NAO NAO DÒNG NƯỚC UỐN QUANH")
   */
  initMeanderingStream() {
    const riverSegments = 60;
    const riverWidth = 7.0;
    const halfW = riverWidth / 2;

    const riverGeo = new THREE.PlaneGeometry(120, riverWidth, riverSegments, 4);
    riverGeo.rotateX(-Math.PI / 2);

    const pos = riverGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const localZ = pos.getZ(i); // Trong khoảng [-halfW, halfW]

      // Suối uốn lượn theo hàm sin
      const streamCenterZ = 6.0 * Math.sin(x * 0.05) - 2.0;
      const worldZ = streamCenterZ + localZ;

      // Mặt nước phẳng tĩnh lặng ở cao độ y = -0.15m
      pos.setXYZ(i, x, -0.15, worldZ);
    }

    this.prepareGeometry(riverGeo);

    this.waterMaterial = new THREE.MeshStandardMaterial({
      map: this.waterTexture,
      color: 0x367a72,
      metalness: 0.12,
      roughness: 0.10,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide
    });

    const riverMesh = new THREE.Mesh(riverGeo, this.waterMaterial);
    riverMesh.name = "Meandering_Stream_Water";
    riverMesh.castShadow = false;
    riverMesh.receiveShadow = false;
    riverMesh.frustumCulled = true;

    this.group.add(riverMesh);
    this.streamMesh = riverMesh;
  }

  /**
   * ĐIỂM MỐC 1: NHỊP CẦU THOANG THOẢNG ("DỊP CẦU NHO NHỎ CUỐI GHỀNH BẮC NGANG")
   */
  initRusticBridge() {
    const bridgeGroup = new THREE.Group();
    bridgeGroup.name = "Nhip_Cau_Thoang_Thoang";

    const mossyStoneMat = new THREE.MeshStandardMaterial({
      color: 0x58605a,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.FrontSide
    });

    const agedWoodMat = this.matLib?.get?.('wainscotWood') ?? new THREE.MeshStandardMaterial({
      color: 0x483424,
      roughness: 0.78,
      side: THREE.FrontSide
    });

    // Vị trí cầu: Bắt ngang khúc hẹp của suối tại x = 2.0, z = -2.0
    const bridgeSpan = 9.8;
    const bridgeWidth = 2.8;

    // A. Mố cầu đá rêu phong hai bên bờ suối (Abutments)
    const abutmentGeo = new THREE.BoxGeometry(bridgeWidth + 0.4, 0.9, 1.4);
    this.prepareGeometry(abutmentGeo);

    const leftAbut = new THREE.Mesh(abutmentGeo, mossyStoneMat);
    leftAbut.position.set(2.0, 0.1, -2.0 - bridgeSpan / 2 + 0.5);
    bridgeGroup.add(leftAbut);

    const rightAbut = new THREE.Mesh(abutmentGeo, mossyStoneMat);
    rightAbut.position.set(2.0, 0.1, -2.0 + bridgeSpan / 2 - 0.5);
    bridgeGroup.add(rightAbut);

    // B. Vòm mặt cầu uốn cong hình cung thanh nhã
    const deckShape = new THREE.Shape();
    deckShape.moveTo(-bridgeSpan / 2, 0);
    deckShape.quadraticCurveTo(0, 1.25, bridgeSpan / 2, 0);
    deckShape.lineTo(bridgeSpan / 2, 0.22);
    deckShape.quadraticCurveTo(0, 1.47, -bridgeSpan / 2, 0.22);
    deckShape.closePath();

    const deckGeo = new THREE.ExtrudeGeometry(deckShape, {
      depth: bridgeWidth,
      bevelEnabled: false
    });
    this.prepareGeometry(deckGeo);

    const deckMesh = new THREE.Mesh(deckGeo, agedWoodMat);
    deckMesh.position.set(2.0, -0.05, -2.0 - bridgeWidth / 2);
    deckMesh.rotation.y = Math.PI / 2;
    deckMesh.castShadow = false;
    deckMesh.receiveShadow = false;
    bridgeGroup.add(deckMesh);

    // C. Lan can thấp uốn nhẹ hai bên mạn cầu
    const postGeo = new THREE.CylinderGeometry(0.07, 0.08, 0.85, 8);
    this.prepareGeometry(postGeo);

    const finialGeo = new THREE.SphereGeometry(0.1, 8, 8);
    this.prepareGeometry(finialGeo);

    const railCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-bridgeSpan / 2, 0.35, 0),
      new THREE.Vector3(-bridgeSpan * 0.25, 1.05, 0),
      new THREE.Vector3(0, 1.45, 0),
      new THREE.Vector3(bridgeSpan * 0.25, 1.05, 0),
      new THREE.Vector3(bridgeSpan / 2, 0.35, 0)
    ]);
    const railGeo = new THREE.TubeGeometry(railCurve, 20, 0.055, 8, false);
    this.prepareGeometry(railGeo);

    [-bridgeWidth / 2 + 0.1, bridgeWidth / 2 - 0.1].forEach(offsetZ => {
      const rail = new THREE.Mesh(railGeo, agedWoodMat);
      rail.position.set(2.0, 0.55, -2.0 + offsetZ);
      rail.rotation.y = Math.PI / 2;
      bridgeGroup.add(rail);

      for (let p = -4; p <= 4; p += 2) {
        const post = new THREE.Mesh(postGeo, mossyStoneMat);
        const curveT = (p + 4) / 8;
        const pt = railCurve.getPoint(curveT);
        post.position.set(2.0 + offsetZ, pt.y / 2 + 0.15, -2.0 + pt.x);
        bridgeGroup.add(post);

        const finial = new THREE.Mesh(finialGeo, mossyStoneMat);
        finial.position.set(2.0 + offsetZ, pt.y + 0.58, -2.0 + pt.x);
        bridgeGroup.add(finial);
      }
    });

    mergeGroupMeshesByMaterial(bridgeGroup);
    this.group.add(bridgeGroup);
  }

  /**
   * ĐIỂM MỐC 2: NẤM MỒ ĐẠM TIÊN ("SÈ SÈ NẤM ĐẤT BÊN ĐƯỜNG")
   * Tọa độ: X: -15, Z: -5 (Bên rìa đồi cỏ, cách điểm xuất phát 20m về bên trái)
   */
  initDamTienGrave() {
    const graveGroup = new THREE.Group();
    graveGroup.name = "Nam_Mo_Dam_Tien";

    const gx = -15.0;
    const gz = -5.0;
    const gy = this.getTerrainHeight(gx, gz);
    graveGroup.position.set(gx, gy, gz);

    // 1. Gò đất tròn dẹp nhô nhẹ phủ cỏ úa pha xanh (#9E9764)
    const moundGeo = new THREE.SphereGeometry(2.3, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5);
    moundGeo.scale(1.0, 0.32, 1.0);
    this.prepareGeometry(moundGeo);

    const moundMat = new THREE.MeshStandardMaterial({
      color: 0x9e9764, // Sắc cỏ úa pha xanh mộc mạc
      roughness: 0.94,
      metalness: 0.02,
      flatShading: true,
      side: THREE.DoubleSide
    });

    const moundMesh = new THREE.Mesh(moundGeo, moundMat);
    moundMesh.position.y = 0.02;
    moundMesh.receiveShadow = false;
    moundMesh.castShadow = false;
    graveGroup.add(moundMesh);

    // 2. Bia đá cổ nhỏ rêu phong khắc chữ mờ ("ĐẠM TIÊN CHI MỘ")
    const steleGroup = new THREE.Group();
    steleGroup.position.set(0, 0.35, 0.7);

    // Chân đế bia đá
    const baseGeo = new THREE.BoxGeometry(0.72, 0.22, 0.42);
    this.prepareGeometry(baseGeo);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x555d58,
      roughness: 0.88,
      side: THREE.DoubleSide
    });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.11;
    steleGroup.add(baseMesh);

    // Tấm bia đá cong vòm phía trên
    const slabGeo = new THREE.BoxGeometry(0.52, 0.92, 0.12);
    this.prepareGeometry(slabGeo);
    const slabMat = new THREE.MeshStandardMaterial({
      map: this.steleTexture,
      roughness: 0.85,
      side: THREE.DoubleSide
    });
    const slabMesh = new THREE.Mesh(slabGeo, slabMat);
    slabMesh.position.y = 0.22 + 0.46;
    slabMesh.castShadow = false;
    slabMesh.receiveShadow = false;
    steleGroup.add(slabMesh);

    // Bát hương gốm cổ nhỏ đặt trước bia mộ
    const censerGeo = new THREE.CylinderGeometry(0.12, 0.09, 0.16, 12);
    this.prepareGeometry(censerGeo);
    const censerMat = new THREE.MeshStandardMaterial({
      color: 0x4a4336,
      roughness: 0.6,
      metalness: 0.2
    });
    const censerMesh = new THREE.Mesh(censerGeo, censerMat);
    censerMesh.position.set(0, 0.08, 0.35);
    steleGroup.add(censerMesh);

    // 3 Nén hương cắm với đầu tàn đỏ hồng
    const stickGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.35, 6);
    this.prepareGeometry(stickGeo);
    const stickMat = new THREE.MeshStandardMaterial({ color: 0x8a3a2a });

    const emberGeo = new THREE.SphereGeometry(0.016, 6, 6);
    this.prepareGeometry(emberGeo);
    const emberMat = new THREE.MeshBasicMaterial({ color: 0xff4411 });

    [-0.04, 0, 0.04].forEach((ox, i) => {
      const stick = new THREE.Mesh(stickGeo, stickMat);
      stick.position.set(ox, 0.22, 0.35 + (i === 1 ? -0.01 : 0.01));
      stick.rotation.z = (i - 1) * 0.08;
      steleGroup.add(stick);

      const ember = new THREE.Mesh(emberGeo, emberMat);
      ember.position.set(ox + (i - 1) * 0.015, 0.39, 0.35);
      steleGroup.add(ember);
    });

    // Đốm sáng ấm nhỏ của tàn nhang
    const emberLight = new THREE.PointLight(0xff6622, 0.8, 2.5);
    emberLight.position.set(0, 0.42, 0.35);
    steleGroup.add(emberLight);

    graveGroup.add(steleGroup);

    // 3. HẠT KHÓI HƯƠNG (INCENSE SMOKE VFX: 40 HẠT BAY THẲNG ĐỨNG NHẸ NHÀNG)
    this.smokeCount = 42;
    const smokeGeo = new THREE.BufferGeometry();
    const smokePositions = new Float32Array(this.smokeCount * 3);
    this.smokeData = [];

    for (let i = 0; i < this.smokeCount; i++) {
      const initialHeight = (i / this.smokeCount) * 3.2;
      smokePositions[i * 3] = gx;
      smokePositions[i * 3 + 1] = gy + 0.6 + initialHeight;
      smokePositions[i * 3 + 2] = gz + 1.05;

      this.smokeData.push({
        height: initialHeight,
        riseSpeed: 0.32 + Math.random() * 0.15,
        swayFreqX: 1.2 + Math.random() * 0.5,
        swayPhaseX: Math.random() * Math.PI * 2,
        swayFreqZ: 0.9 + Math.random() * 0.4,
        swayPhaseZ: Math.random() * Math.PI * 2
      });
    }

    smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));
    this.prepareGeometry(smokeGeo);

    const smokeMat = new THREE.PointsMaterial({
      size: 0.38,
      map: this.smokeTexture,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    this.smokePoints = new THREE.Points(smokeGeo, smokeMat);
    this.smokePoints.name = "DamTien_Incense_Smoke";
    this.smokePoints.frustumCulled = true;
    this.group.add(this.smokePoints);

    this.graveOriginY = gy;
    this.graveOriginX = gx;
    this.graveOriginZ = gz + 1.05;

    this.group.add(graveGroup);
    this.damTienGrave = graveGroup;
  }

  /**
   * 4. RẶNG LIỄU RỦ & CÀNH HOA LÊ TRẮNG
   */
  initWeepingWillowsAndBlossoms() {
    const willowPositions = [
      { x: -16, z: -7, scale: 1.15, rot: 0.3 },
      { x: -8,  z: 6,  scale: 1.0,  rot: -0.4 },
      { x: 7,   z: -8, scale: 1.2,  rot: 0.8 },
      { x: 18,  z: 5,  scale: 0.95, rot: -0.2 },
      { x: 28,  z: -4, scale: 1.1,  rot: 0.5 }
    ];

    const barkMat = new THREE.MeshStandardMaterial({
      color: 0x3d2c20,
      roughness: 0.88,
      metalness: 0.05,
      side: THREE.FrontSide
    });

    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x769b50,
      roughness: 0.75,
      metalness: 0.0,
      side: THREE.DoubleSide
    });

    const blossomMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfff0f5,
      emissiveIntensity: 0.3,
      roughness: 0.5,
      side: THREE.FrontSide
    });

    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.4, 2.2, 0.2),
      new THREE.Vector3(1.1, 4.2, 0.6),
      new THREE.Vector3(1.6, 5.8, 0.4),
      new THREE.Vector3(2.0, 7.0, -0.2)
    ]);
    const trunkGeo = new THREE.TubeGeometry(curve, 16, 0.42, 8, false);
    this.prepareGeometry(trunkGeo);

    const frondGeo = new THREE.PlaneGeometry(0.35, 3.8, 1, 6);
    const fPos = frondGeo.attributes.position;
    for (let i = 0; i < fPos.count; i++) {
      const y = fPos.getY(i);
      const sag = Math.pow((1.9 - y) / 3.8, 2) * 0.45;
      fPos.setZ(i, sag);
    }
    this.prepareGeometry(frondGeo);

    const blossomFlowerGeo = new THREE.SphereGeometry(0.12, 6, 6);
    this.prepareGeometry(blossomFlowerGeo);

    const willowsGroup = new THREE.Group();
    willowsGroup.name = "Weeping_Willows_Cluster";

    const frondTransforms = [];
    const blossomTransforms = [];
    const dummy = new THREE.Object3D();

    willowPositions.forEach((wp) => {
      const wTree = new THREE.Group();
      wTree.position.set(wp.x, this.getTerrainHeight(wp.x, wp.z), wp.z);
      wTree.scale.set(wp.scale, wp.scale, wp.scale);
      wTree.rotation.y = wp.rot;

      const trunk = new THREE.Mesh(trunkGeo, barkMat);
      trunk.castShadow = false;
      trunk.receiveShadow = false;
      trunk.frustumCulled = true;
      wTree.add(trunk);

      const branchAngles = [0, 1.2, 2.4, 3.6, 4.8];
      branchAngles.forEach((ang) => {
        const bx = wp.x + Math.cos(ang + wp.rot) * 2.8 * wp.scale;
        const bz = wp.z + Math.sin(ang + wp.rot) * 2.8 * wp.scale;
        const by = this.getTerrainHeight(wp.x, wp.z) + 6.2 * wp.scale;

        for (let f = 0; f < 6; f++) {
          const fx = bx + (Math.random() - 0.5) * 1.5;
          const fz = bz + (Math.random() - 0.5) * 1.5;
          const fy = by - 1.2 + (Math.random() - 0.5) * 0.6;

          dummy.position.set(fx, fy, fz);
          dummy.rotation.set((Math.random() - 0.5) * 0.2, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.2);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          frondTransforms.push(dummy.matrix.clone());
        }

        for (let b = 0; b < 4; b++) {
          const flx = bx + (Math.random() - 0.5) * 1.8;
          const flz = bz + (Math.random() - 0.5) * 1.8;
          const fly = by + 0.4 + (Math.random() - 0.5) * 0.8;

          dummy.position.set(flx, fly, flz);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          blossomTransforms.push(dummy.matrix.clone());
        }
      });

      willowsGroup.add(wTree);
    });

    if (frondTransforms.length > 0) {
      const frondsInstanced = new THREE.InstancedMesh(frondGeo, leafMat, frondTransforms.length);
      frondsInstanced.name = "Instanced_Willow_Leaves";
      frondsInstanced.frustumCulled = true;
      frondsInstanced.castShadow = false;
      for (let i = 0; i < frondTransforms.length; i++) {
        frondsInstanced.setMatrixAt(i, frondTransforms[i]);
      }
      frondsInstanced.instanceMatrix.needsUpdate = true;
      frondsInstanced.computeBoundingBox();
      frondsInstanced.computeBoundingSphere();
      this.group.add(frondsInstanced);
    }

    if (blossomTransforms.length > 0) {
      const blossomsInstanced = new THREE.InstancedMesh(blossomFlowerGeo, blossomMat, blossomTransforms.length);
      blossomsInstanced.name = "Instanced_Pear_Blossoms";
      blossomsInstanced.frustumCulled = true;
      blossomsInstanced.castShadow = false;
      for (let i = 0; i < blossomTransforms.length; i++) {
        blossomsInstanced.setMatrixAt(i, blossomTransforms[i]);
      }
      blossomsInstanced.instanceMatrix.needsUpdate = true;
      blossomsInstanced.computeBoundingBox();
      blossomsInstanced.computeBoundingSphere();
      this.group.add(blossomsInstanced);
    }

    mergeGroupMeshesByMaterial(willowsGroup);
    this.group.add(willowsGroup);
  }

  /**
   * 5. HỆ THỐNG HẠT CÁNH HOA RƠI LƠ LỬNG (300 BLOSSOM PARTICLES)
   */
  initBlossomParticles() {
    this.particleCount = 300;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    this.particleData = [];

    const peachColor = new THREE.Color(0xffb6c1); // Đào phai hồng nhạt
    const pearColor = new THREE.Color(0xffffff);  // Hoa lê trắng muốt

    for (let i = 0; i < this.particleCount; i++) {
      const x = (Math.random() - 0.5) * 60.0;
      const z = (Math.random() - 0.5) * 60.0;
      const y = Math.random() * 12.0 + 0.5;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const c = Math.random() > 0.4 ? peachColor : pearColor;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      this.particleData.push({
        fallSpeed: 0.45 + Math.random() * 0.45,
        driftPhaseX: Math.random() * Math.PI * 2,
        driftPhaseZ: Math.random() * Math.PI * 2,
        driftFreqX: 0.8 + Math.random() * 0.6,
        driftFreqZ: 0.6 + Math.random() * 0.5,
        initY: 12.0 + Math.random() * 2.0
      });
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.prepareGeometry(geo);

    const pMat = new THREE.PointsMaterial({
      size: 0.42,
      map: this.petalTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.90,
      depthWrite: false,
      blending: THREE.NormalBlending
    });

    this.blossomPoints = new THREE.Points(geo, pMat);
    this.blossomPoints.name = "Spring_Blossom_Particles";
    this.blossomPoints.frustumCulled = true;
    this.group.add(this.blossomPoints);
  }

  /**
   * 6. BỨC CUỐN THƯ CỔ LƠ LỬNG PHÁT ÁNH SÁNG LAM NGỌC BÍCH (RETURN WAYPOINT)
   */
  initReturnScrollWaypoint() {
    const scrollGroup = new THREE.Group();
    scrollGroup.name = "Return_Waypoint_CuonThu";
    scrollGroup.position.set(0, 2.3, 11.2);

    const scrollSilkMat = new THREE.MeshStandardMaterial({
      color: 0xf5f3ea,
      roughness: 0.35,
      metalness: 0.1,
      emissive: 0x22eedd,
      emissiveIntensity: 0.35,
      side: THREE.DoubleSide
    });

    const jadeRodMat = new THREE.MeshStandardMaterial({
      color: 0x1f7a63,
      roughness: 0.2,
      metalness: 0.7,
      emissive: 0x39e58c,
      emissiveIntensity: 0.4,
      side: THREE.DoubleSide
    });

    const goldFinialMat = this.matLib?.get?.('royalGold') ?? new THREE.MeshStandardMaterial({
      color: 0xffd269,
      roughness: 0.2,
      metalness: 0.9,
      side: THREE.DoubleSide
    });

    const scrollGeo = new THREE.BoxGeometry(2.2, 1.3, 0.04);
    this.prepareGeometry(scrollGeo);
    const scrollMesh = new THREE.Mesh(scrollGeo, scrollSilkMat);
    scrollMesh.castShadow = false;
    scrollMesh.receiveShadow = false;
    scrollGroup.add(scrollMesh);

    const rodGeo = new THREE.CylinderGeometry(0.065, 0.065, 1.6, 16);
    this.prepareGeometry(rodGeo);

    const finialGeo = new THREE.SphereGeometry(0.11, 12, 12);
    this.prepareGeometry(finialGeo);

    [-1.15, 1.15].forEach(rx => {
      const rod = new THREE.Mesh(rodGeo, jadeRodMat);
      rod.position.set(rx, 0, 0);
      scrollGroup.add(rod);

      [0.85, -0.85].forEach(fy => {
        const finial = new THREE.Mesh(finialGeo, goldFinialMat);
        finial.position.set(rx, fy, 0);
        scrollGroup.add(finial);
      });
    });

    const jadeAuraLight = new THREE.PointLight(0x39e58c, 2.2, 8.0, 1.5);
    jadeAuraLight.position.set(0, 0, 0.3);
    scrollGroup.add(jadeAuraLight);

    const ringGeo = new THREE.TorusGeometry(1.4, 0.03, 12, 48);
    this.prepareGeometry(ringGeo);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x4ef0b5,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.set(0, 0, -0.05);
    scrollGroup.add(ringMesh);
    this.waypointRing = ringMesh;

    scrollMesh.userData.isReturnWaypoint = true;
    scrollGroup.userData.isReturnWaypoint = true;
    this.interactiveWaypoint = scrollMesh;

    this.group.add(scrollGroup);
    this.scrollGroup = scrollGroup;
  }

  /**
   * 7. KHỞI TẠO NARRATIVE TRIGGER & SPATIAL AUDIO
   */

  /**
   * 8. ĐÀI QUAN SÁT THẢO NGUYÊN HOÀNG HÔN VỚI 4 BẢNG HOLOGRAM KHỔNG LỒ (1536x900) & BỘ 3 TƯỢNG NHÂN VẬT
   */
  initObservationOverlook() {
    const overlookGroup = new THREE.Group();
    overlookGroup.name = "KieuWorld_Scenic_Overlook";
    overlookGroup.position.set(0, 0.2, 18.5);
    this.group.add(overlookGroup);

    // Nền sàn đĩa cẩm thạch trầm tĩnh của đài quan sát
    const stonePlatMat = new THREE.MeshBasicMaterial({ color: 0x142018 });
    const platDisc = new THREE.Mesh(new THREE.CylinderGeometry(8.5, 9.2, 0.4, 32), stonePlatMat);
    platDisc.position.y = -0.2;
    overlookGroup.add(platDisc);

    // Vành neon viền đài ngắm cảnh
    const platBorder = new THREE.Mesh(
      new THREE.TorusGeometry(8.5, 0.08, 8, 36),
      new THREE.MeshBasicMaterial({ color: 0x39e58c, transparent: true, opacity: 0.65 })
    );
    platBorder.rotation.x = Math.PI / 2;
    platBorder.position.y = 0.05;
    overlookGroup.add(platBorder);

    // Tinh thể Cổng trở về trên đài quan sát
    const returnPortalGroup = new THREE.Group();
    returnPortalGroup.name = 'Return_Crystal_Portal';
    returnPortalGroup.position.set(0, 0.2, 5.0);
    overlookGroup.add(returnPortalGroup);

    const crystalMesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.55, 0),
      new THREE.MeshBasicMaterial({ color: 0x39e58c, fog: false })
    );
    crystalMesh.position.y = 1.25;
    crystalMesh.userData = { isReturnPortal: true, action: 'RETURN_TO_MUSEUM' };
    returnPortalGroup.add(crystalMesh);
    this.returnPortalGroup = returnPortalGroup;

    if (typeof document !== 'undefined') {
      const cv = document.createElement('canvas');
      cv.width = 512;
      cv.height = 180;
      const ctx = cv.getContext('2d');
      ctx.fillStyle = 'rgba(15, 28, 22, 0.94)';
      ctx.fillRect(0, 0, 512, 180);
      ctx.strokeStyle = '#39e58c';
      ctx.lineWidth = 4;
      ctx.strokeRect(6, 6, 500, 168);
      ctx.fillStyle = '#39e58c';
      ctx.font = 'bold 20px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('❖ CỔNG TRỞ VỀ ❖', 256, 38);
      ctx.fillStyle = '#fde047';
      ctx.font = 'bold 24px "Segoe UI", sans-serif';
      ctx.fillText('↩ QUAY VỀ BẢO TÀNG', 256, 82);
      ctx.fillStyle = '#f1f5f9';
      ctx.font = '18px "Segoe UI", sans-serif';
      ctx.fillText('(Nhấn phím ESC)', 256, 126);

      const bannerTex = new THREE.CanvasTexture(cv);
      const banner = new THREE.Mesh(
        new THREE.PlaneGeometry(3.6, 1.3),
        new THREE.MeshBasicMaterial({ map: bannerTex, transparent: true, side: THREE.DoubleSide })
      );
      banner.position.set(0, 2.5, 0);
      returnPortalGroup.add(banner);
    }

    // 4 BẢNG THÔNG TIN HOLOGRAM KHỔNG LỒ (1536 x 900 pixels)
    const titles = [
      'ĐẠI THI HÀO NGUYỄN DU & THỜI ĐẠI SÁNG TÁC',
      'BI KỊCH TÀI MỆNH TƯƠNG ĐỐ & BÁN MÌNH CỨU CHA',
      'MƯỜI NĂM LƯU LẠC & KHÁT VỌNG TỰ DO CÙNG TỪ HẢI',
      'ĐOÀN VIÊN TÁI HỢP & GIÁ TRỊ NHÂN ĐẠO BẤT HỦ'
    ];

    const screenLines = [
      [
        'TÊN TÁC PHẨM: ĐOẠN TRƯỜNG TÂN THANH (TRUYỆN KIỀU)',
        'TÁC GIẢ: Đại thi hào Nguyễn Du (1765 – 1820) • Danh nhân Văn hóa Thế giới',
        'THỂ LOẠI: Truyện thơ Nôm Lục bát (Gồm 3.254 câu thơ lục bát mẫu mực)',
        'NGUỒN GỐC: Tiếp thu cốt truyện "Kim Vân Kiều truyện" của Thanh Tâm Tài Nhân',
        'SÁNG TẠO ĐỘT PHÁ: Việt hóa toàn diện, nâng tầm tư tưởng nhân đạo và triết lý tài mệnh',
        'ĐỈNH CAO NGÔN NGỮ: Mẫu mực tuyệt đỉnh của thi ca cổ điển và tiếng Việt trung đại'
      ],
      [
        'TÀI SẮC VẸN TOÀN: Thúy Kiều mang vẻ đẹp "Hoa ghen thua thắm, liễu hờn kém xanh"',
        'MỐI TÌNH KIM - KIỀU: Lời thề đính ước dưới trăng thanh "Vầng trăng vằng vặc giữa trời"',
        'GIA BIẾN KINH HOÀNG: Bị thằng bán tơ vu oan, cha và em trai bị bắt giam khảo đả',
        'HIẾU NGHĨA VẸN TOÀN: Dứt tình duyên trao lại cho em gái Thúy Vân để bán mình chuộc cha',
        'BƯỚC VÀO TRẦN AI: Bị lừa gạt bởi Mã Giám Sinh và Tú Bà, đày đọa chốn lầu xanh',
        'KHÚC CA BI TRÁNG: Tiếng đàn bạc mệnh ngân vang số phận người phụ nữ thời phong kiến'
      ],
      [
        'LẦU NGƯNG BÍCH: Nỗi buồn cô đơn khóa xuân, hoài niệm quê hương và cha mẹ già',
        'BẪY RẬP TRẦN GIAN: Trải qua bàn tay Hoạn Thư, Thúc Sinh, Sở Khanh, Bạc Bà',
        'TRI KỶ TỪ HẢI: "Râu hùm, hàm én, mày ngài / Vai năm tấc rộng, thân mười thước cao"',
        'ANH HÙNG XUẤT THẾ: Từ Hải chuộc Kiều, giúp nàng lập đàn ân oán phân minh',
        'MẮC LỪA HỒ TÔN HIẾN: Khuyên hàng bất thành, Từ Hải chết đứng giữa bãi chiến trường',
        'TRẦM MÌNH TIỀN ĐƯỜNG: Tuyệt vọng gieo mình xuống dòng sông định mệnh Tiền Đường'
      ],
      [
        'CỨU VỚT TÂM LINH: Sư Giác Duyên lập bè cứu sống Kiều sau mười lăm năm chìm nổi',
        'CHÂU VỀ HỢP PHỐ: Kim Trọng đỗ đạt, không nguôi thương nhớ tìm lại người xưa',
        'ĐOÀN TỤ GIA ĐÌNH: Đêm đoàn viên thấu hiểu, "Đổi duyên cầm sắt đổi ra duyên bạn bầy"',
        'GIÁ TRỊ HIỆN THỰC: Tố cáo xã hội phong kiến đồng tiền đen tối chà đạp con người',
        'GIÁ TRỊ NHÂN ĐẠO: Đề cao tự do luyến ái, phẩm giá con người và quyền mưu cầu hạnh phúc',
        'SỐNG MÃI MUÔN ĐỜI: "Truyện Kiều còn, tiếng ta còn; tiếng ta còn, nước ta còn"'
      ]
    ];

    const screenAngles = [-1.08, -0.58, 0.58, 1.08];
    const screenRadius = 18.5;

    for (let sIdx = 0; sIdx < 4; sIdx++) {
      const angle = screenAngles[sIdx];
      let cv = null;
      if (typeof document !== 'undefined') {
        cv = document.createElement('canvas');
        cv.width = 768;
        cv.height = 450;
        const ctx = cv.getContext('2d');
        const w = 1536, h = 900;
        if (ctx) {
          ctx.save();
          ctx.scale(0.5, 0.5);

          const bgG = ctx.createLinearGradient(0, 0, w, h);
          bgG.addColorStop(0.0, 'rgba(18, 32, 26, 0.95)');
          bgG.addColorStop(0.5, 'rgba(28, 48, 38, 0.92)');
          bgG.addColorStop(1.0, 'rgba(12, 22, 18, 0.97)');
          ctx.fillStyle = bgG;
          ctx.fillRect(0, 0, w, h);

          ctx.strokeStyle = '#39e58c';
          ctx.lineWidth = 7;
          ctx.strokeRect(16, 16, w - 32, h - 32);

          ctx.strokeStyle = '#fde047';
          ctx.lineWidth = 10;
          const corner = 60;
          ctx.beginPath(); ctx.moveTo(16, 16 + corner); ctx.lineTo(16, 16); ctx.lineTo(16 + corner, 16); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(w - 16 - corner, 16); ctx.lineTo(w - 16, 16); ctx.lineTo(w - 16, 16 + corner); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(16, h - 16 - corner); ctx.lineTo(16, h - 16); ctx.lineTo(16 + corner, h - 16); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(w - 16 - corner, h - 16); ctx.lineTo(w - 16, h - 16); ctx.lineTo(w - 16, h - 16 - corner); ctx.stroke();

          ctx.strokeStyle = 'rgba(57, 229, 140, 0.65)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(120, 115);
          ctx.lineTo(w - 120, 115);
          ctx.stroke();

          ctx.fillStyle = '#fde047';
          ctx.font = 'bold 44px "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(`❖ BẢNG 0${sIdx + 1}: ${titles[sIdx]} ❖`, w / 2, 45);

          ctx.textAlign = 'left';
          const lines = screenLines[sIdx];
          const startY = 175;
          const lineSpacing = 102;

          lines.forEach((line, i) => {
            const parts = line.split(':');
            const label = parts[0] + ':';
            const desc = parts.slice(1).join(':');

            ctx.fillStyle = '#39e58c';
            ctx.beginPath();
            ctx.arc(80, startY + i * lineSpacing + 16, 7, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#fde047';
            ctx.font = 'bold 30px "Segoe UI", sans-serif';
            ctx.fillText(label, 110, startY + i * lineSpacing);

            const labelW = ctx.measureText(label).width;
            ctx.fillStyle = '#f1f5f9';
            ctx.font = '28px "Segoe UI", sans-serif';
            ctx.fillText(desc, 110 + labelW + 14, startY + i * lineSpacing);
          });
          ctx.restore();
        }
      }

      const tex = cv ? new THREE.CanvasTexture(cv) : null;
      if (tex) {
        tex.generateMipmaps = false;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
      }
      const mat = new THREE.MeshBasicMaterial({
        map: tex,
        color: tex ? 0xffffff : 0x112218,
        transparent: true,
        opacity: 0.94,
        side: THREE.DoubleSide,
        depthWrite: false
      });

      const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(11.2, 6.5), mat);
      const frameGeo = new THREE.BoxGeometry(11.32, 6.62, 0.08);
      const frameMat = new THREE.MeshBasicMaterial({ color: 0x39e58c, wireframe: true });
      screenMesh.add(new THREE.Mesh(frameGeo, frameMat));

      screenMesh.position.set(Math.sin(angle) * screenRadius, 3.8, -Math.cos(angle) * screenRadius);
      screenMesh.lookAt(0, 3.5, 0);
      overlookGroup.add(screenMesh);
    }

    // BỘ 3 TƯỢNG NHÂN VẬT: KIM TRỌNG, THÚY KIỀU & THÚY VÂN
    const goldMat = new THREE.MeshPhongMaterial({ color: 0xfbbf24, emissive: 0x452804, shininess: 90 });
    const createStatueBase = (name, poem1, poem2, colorHex) => {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.4, 0.6, 16), goldMat);
      g.add(base);

      if (typeof document !== 'undefined') {
        const cv = document.createElement('canvas');
        cv.width = 512;
        cv.height = 170;
        const ctx = cv.getContext('2d');
        ctx.fillStyle = 'rgba(15, 28, 22, 0.94)';
        ctx.fillRect(0, 0, 512, 170);
        ctx.strokeStyle = colorHex;
        ctx.lineWidth = 4;
        ctx.strokeRect(6, 6, 500, 158);
        ctx.fillStyle = colorHex;
        ctx.font = 'bold 22px "Segoe UI", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(name, 256, 40);
        ctx.fillStyle = '#f1f5f9';
        ctx.font = 'italic 16px "Segoe UI", sans-serif';
        ctx.fillText(`"${poem1}"`, 256, 85);
        ctx.fillText(`"${poem2}"`, 256, 122);

        const plateTex = new THREE.CanvasTexture(cv);
        const plate = new THREE.Mesh(
          new THREE.PlaneGeometry(2.4, 0.8),
          new THREE.MeshBasicMaterial({ map: plateTex, transparent: true, side: THREE.DoubleSide })
        );
        plate.position.set(0, 0.95, 1.15);
        plate.rotation.x = -0.22;
        g.add(plate);
      }
      return g;
    };

    const kimPed = createStatueBase('CHÀNG KIM TRỌNG', 'Văn chương nết đất, thông minh tính trời', 'Phong tư tài mạo tót vời, vào trong phong nhã', '#38bdf8');
    kimPed.position.set(-5.5, 0.0, -1.5);
    overlookGroup.add(kimPed);

    const kieuPed = createStatueBase('NÀNG THÚY KIỀU', 'Làn thu thủy nét xuân sơn', 'Hoa ghen thua thắm liễu hờn kém xanh', '#f472b6');
    kieuPed.position.set(3.5, 0.0, -1.5);
    overlookGroup.add(kieuPed);

    const vanPed = createStatueBase('NÀNG THÚY VÂN', 'Vân xem trang trọng khác vời', 'Khuôn trăng đầy đặn nét ngài nở nang', '#fde047');
    vanPed.position.set(7.5, 0.0, -1.5);
    overlookGroup.add(vanPed);

    loadGlbCached(['/model/kimtrongthuykieu.glb'], {
      maxTextureSize: 1024,
      disableMipmaps: true,
      prepareOptions: {
        targetSpan: 2.85,
        fitAxis: 'y',
        groundY: true,
        centerXZ: true
      }
    })
      .then((wrapped) => {
        if (!wrapped) return;
        wrapped.position.y = 0.32;
        kimPed.add(wrapped);
      })
      .catch(() => {});

    loadGlbCached(['/model/thuykieu.glb'], {
      maxTextureSize: 1024,
      disableMipmaps: true,
      prepareOptions: {
        targetSpan: 2.85,
        fitAxis: 'y',
        groundY: true,
        centerXZ: true
      }
    })
      .then((wrapped) => {
        if (!wrapped) return;
        wrapped.position.y = 0.32;
        kieuPed.add(wrapped);
      })
      .catch(() => {});

    loadGlbCached(['/model/thuykieu.glb'], {
      maxTextureSize: 1024,
      disableMipmaps: true,
      prepareOptions: {
        targetSpan: 2.75,
        fitAxis: 'y',
        groundY: true,
        centerXZ: true,
        color: 0xffe680
      }
    })
      .then((wrapped) => {
        if (!wrapped) return;
        wrapped.position.y = 0.32;
        vanPed.add(wrapped);
      })
      .catch(() => {});
  }

  initNarrativeAndAudioSystems() {
    try {
      this.narrativeTrigger = new NarrativeTrigger(this.camera);
      this.spatialAudio = new SpatialAudio(this.camera);

      // Tự động gắn Positional Audio tiếng suối và nấm mồ Đạm Tiên
      if (this.streamMesh) {
        this.spatialAudio.attachStreamAudio(this.streamMesh);
      }
      if (this.damTienGrave) {
        this.spatialAudio.attachDamTienAudio(this.damTienGrave);
      }
    } catch (err) {
      console.warn("[SELF-HEALING] Lỗi Narrative/Audio Systems:", err);
    }
  }

  setAudioManager(audioManager) {
    if (!audioManager) return;
    this.audioManager = audioManager;
    if (this.spatialAudio) {
      this.spatialAudio.audioManager = audioManager;
    }
    if (this.streamMesh) {
      audioManager.attachStreamAudio(this.streamMesh);
    }
    if (this.damTienGrave) {
      audioManager.attachDamTienAudio(this.damTienGrave);
    }
  }

  setCamera(camera) {
    this.camera = camera;
    this.narrativeTrigger?.setCamera(camera);
  }

  /**
   * Cập nhật dải khói hương nấm mồ Đạm Tiên bay lên nhẹ nhàng
   */
  updateIncenseSmoke(delta, elapsedTime) {
    if (!this.smokePoints?.geometry) return;

    const posAttr = this.smokePoints.geometry.attributes.position;
    const arr = posAttr.array;

    for (let i = 0; i < this.smokeCount; i++) {
      const idx = i * 3;
      const s = this.smokeData[i];

      s.height += s.riseSpeed * delta;
      if (s.height > 3.4) {
        s.height = 0.0;
      }

      const h = s.height;
      const swayAmount = h * 0.09;
      arr[idx] = this.graveOriginX + Math.sin(elapsedTime * s.swayFreqX + s.swayPhaseX + h * 2.0) * swayAmount;
      arr[idx + 1] = this.graveOriginY + 0.6 + h;
      arr[idx + 2] = this.graveOriginZ + Math.cos(elapsedTime * s.swayFreqZ + s.swayPhaseZ + h * 1.5) * swayAmount;
    }

    posAttr.needsUpdate = true;
  }

  /**
   * Cập nhật animation trong vòng lặp render
   */
  update(delta = 0.016, elapsedTime = 0) {
    if (!this._isBuilt || !this.group.visible) return;

    // 1. Dòng nước uốn lượn trôi lững lờ ("nao nao dòng nước uốn quanh")
    if (this.waterTexture) {
      this.waterTexture.offset.x += delta * 0.05;
      this.waterTexture.offset.y = Math.sin(elapsedTime * 0.5) * 0.04;
    }

    // 2. Hoạt ảnh rơi và trôi dạt của 300 cánh hoa xuân
    if (this.blossomPoints?.geometry) {
      const posAttr = this.blossomPoints.geometry.attributes.position;
      const arr = posAttr.array;

      for (let i = 0; i < this.particleCount; i++) {
        const idx = i * 3;
        const pData = this.particleData[i];

        arr[idx + 1] -= pData.fallSpeed * delta;
        arr[idx] += Math.sin(elapsedTime * pData.driftFreqX + pData.driftPhaseX) * 0.45 * delta;
        arr[idx + 2] += Math.cos(elapsedTime * pData.driftFreqZ + pData.driftPhaseZ) * 0.45 * delta;

        const groundY = this.getTerrainHeight(arr[idx], arr[idx + 2]);
        if (arr[idx + 1] <= groundY + 0.15) {
          arr[idx + 1] = pData.initY;
          arr[idx] = (Math.random() - 0.5) * 60.0;
          arr[idx + 2] = (Math.random() - 0.5) * 60.0;
        }
      }
      posAttr.needsUpdate = true;
    }

    // 3. Hoạt ảnh lơ lửng nhấp nhô của Bức Cuốn Thư cổ
    if (this.scrollGroup) {
      this.scrollGroup.position.y = 2.3 + Math.sin(elapsedTime * 1.8) * 0.12;
      this.scrollGroup.rotation.y = Math.sin(elapsedTime * 0.7) * 0.12;
      if (this.waypointRing) {
        this.waypointRing.rotation.z = elapsedTime * 0.5;
      }
    }

    // 4. Khói hương nấm mồ Đạm Tiên lững lờ bay lên
    this.updateIncenseSmoke(delta, elapsedTime);

    // 5. Tinh thể trở về xoay nhẹ
    if (this.returnPortalGroup?.children?.[0]) {
      this.returnPortalGroup.children[0].rotation.y += delta * 1.5;
    }

    // 6. Kiểm tra Proximity Poetry Trigger (Chỉ dùng distanceToSquared, không căn bậc hai)
    this.narrativeTrigger?.update();
  }

  setVisible(visible = true) {
    if (visible && !this._isBuilt) {
      this.activate();
    }
    this.group.visible = visible;
    this.narrativeTrigger?.setEnabled(visible);

    if (visible) {
      this.spatialAudio?.play();
    } else {
      this.spatialAudio?.pause();
    }
  }

  getGroup() {
    return this.group;
  }
}
