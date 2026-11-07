import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createRoomInfoPlaque } from './roomInfoPlaque.js';
import { playBookSuckInCutscene, playBookReturnCutscene } from './bookVortexCutscene.js';
const DOWNSAMPLED_TEX_CACHE = new WeakMap();
const NQSH_TEX_CACHE = {};

function getCachedTex(key, w, h, drawFn, repeatX = 1, repeatY = 1) {
  if (NQSH_TEX_CACHE[key]) return NQSH_TEX_CACHE[key];
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
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  NQSH_TEX_CACHE[key] = tex;
  return tex;
}

function compressTextureIfNeeded(tex) {
  if (!tex || !tex.image) return tex;
  if (DOWNSAMPLED_TEX_CACHE.has(tex)) return DOWNSAMPLED_TEX_CACHE.get(tex);

  const img = tex.image;
  const w = img.width || img.videoWidth || 0;
  const h = img.height || img.videoHeight || 0;

  if (w > 512 || h > 512) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(512, w);
    canvas.height = Math.min(512, h);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    tex.image = canvas;
  }

  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  DOWNSAMPLED_TEX_CACHE.set(tex, tex);
  return tex;
}

function optimizeGlbModel(root, emissiveHex = 0x141a24, specularHex = 0xffdd88) {
  root.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = false;
    child.receiveShadow = false;
    child.frustumCulled = true;

    const mats = Array.isArray(child.material) ? child.material : [child.material];
    const optimizedMats = mats.map((mat) => {
      if (!mat) return new THREE.MeshPhongMaterial({ color: 0xd4af37, shininess: 60 });
      if (mat.map) compressTextureIfNeeded(mat.map);
      return new THREE.MeshPhongMaterial({
        color: mat.color ? mat.color.clone() : new THREE.Color(0xffffff),
        map: mat.map || null,
        emissive: new THREE.Color(emissiveHex),
        specular: new THREE.Color(specularHex),
        shininess: 48,
        transparent: Boolean(mat.transparent),
        opacity: mat.opacity ?? 1.0,
        side: THREE.DoubleSide
      });
    });
    child.material = optimizedMats.length === 1 ? optimizedMats[0] : optimizedMats;
  });
}

/**
 * Chuẩn hóa kích thước mô hình .glb theo chiều cao nhân vật ('y') hoặc bề rộng địa hình ('horizontal')
 */
function normalizeModelTransform(model, targetSpan = 3.8, fitMode = 'y') {
  const wrapper = new THREE.Group();
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);

  const refDim = fitMode === 'horizontal'
    ? Math.max(size.x, size.z, 0.001)
    : Math.max(size.y, size.x * 0.5, 0.001);

  const scale = targetSpan / refDim;
  model.scale.setScalar(scale);

  const scaledBox = new THREE.Box3().setFromObject(model);
  const scaledCenter = new THREE.Vector3();
  scaledBox.getCenter(scaledCenter);

  model.position.x -= scaledCenter.x;
  model.position.z -= scaledCenter.z;
  model.position.y -= scaledBox.min.y;

  wrapper.add(model);
  return wrapper;
}

function createImperialPlaque(title, subtitle = '', width = 3.4, height = 0.72) {
  const tex = getCachedTex(`nqsh_plaque_${title}`, 512, 128, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, '#071829');
    g.addColorStop(0.5, '#122c4a');
    g.addColorStop(1, '#071422');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#ffd15c';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, w - 12, h - 12);

    ctx.fillStyle = '#ffe89e';
    ctx.font = 'bold 31px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title.toUpperCase(), w / 2, subtitle ? h * 0.38 : h * 0.5);

    if (subtitle) {
      ctx.fillStyle = '#80e5ff';
      ctx.font = 'italic 19px "Times New Roman", serif';
      ctx.fillText(subtitle, w / 2, h * 0.74);
    }
  });

  const mat = new THREE.MeshLambertMaterial({ map: tex, emissive: 0x0b1f33 });
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.08), mat);
}

/**
 * CỜ NGŨ SẮC LỆNH KỲ ĐẠI VIỆT THÊU CHỮ "VŨ" (武)
 * Khớp 100% hình ảnh Cờ Ngũ Sắc truyền thống Việt Nam:
 * - 5 tầng ngũ sắc đồng tâm: Tâm Đỏ -> Lục -> Vàng -> Lam -> Viền Đỏ
 * - Cạnh ngoài: Riềm ngọn lửa răng cưa rực cháy mềm mại
 * - Chính giữa: Đại tự chữ "Vũ" (武) dát vàng hoàng kim óng ánh
 * - Nếp gấp gấm lụa bóng bẩy và xuyên sáng nhẹ
 */
function getVietnameseMartialFlagTexture() {
  return getCachedTex('vietnamese_martial_flag_vu_tex', 512, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);

    // Kích thước thân cờ chính (vuông): x: 32 -> 434, y: 32 -> 480
    const flagLeft = 32;
    const flagTop = 32;
    const flagW = 400;
    const flagH = 448;
    const flagRight = flagLeft + flagW;
    const flagBottom = flagTop + flagH;

    // 1. VẼ RIỀM NGỌN LỬA RĂNG CƯA ĐỎ (FLAME FRINGE) Ở 3 CẠNH NGOÀI (TRÊN, PHẢI, DƯỚI)
    ctx.fillStyle = '#c62828';

    // Riềm cạnh phải (bay theo gió sang phải)
    const rightFlameCount = 8;
    const rightStep = flagH / rightFlameCount;
    for (let i = 0; i < rightFlameCount; i++) {
      const y0 = flagTop + i * rightStep;
      const y1 = y0 + rightStep;
      const yMid = y0 + rightStep * 0.42;
      const flameLen = 44 + Math.sin(i * 1.3) * 16;

      ctx.beginPath();
      ctx.moveTo(flagRight, y0);
      ctx.quadraticCurveTo(flagRight + flameLen * 0.65, y0 + 3, flagRight + flameLen, yMid);
      ctx.quadraticCurveTo(flagRight + flameLen * 0.35, y1 - 2, flagRight, y1);
      ctx.closePath();
      ctx.fill();
    }

    // Riềm cạnh trên
    const topFlameCount = 7;
    const topStep = flagW / topFlameCount;
    for (let i = 0; i < topFlameCount; i++) {
      const x0 = flagLeft + i * topStep;
      const x1 = x0 + topStep;
      const xMid = x0 + topStep * 0.5;
      const flameLen = 22 + Math.sin(i * 1.5) * 8;

      ctx.beginPath();
      ctx.moveTo(x0, flagTop);
      ctx.quadraticCurveTo(x0 + 4, flagTop - flameLen * 0.6, xMid, flagTop - flameLen);
      ctx.quadraticCurveTo(x1 - 4, flagTop - flameLen * 0.4, x1, flagTop);
      ctx.closePath();
      ctx.fill();
    }

    // Riềm cạnh dưới
    for (let i = 0; i < topFlameCount; i++) {
      const x0 = flagLeft + i * topStep;
      const x1 = x0 + topStep;
      const xMid = x0 + topStep * 0.5;
      const flameLen = 24 + Math.sin(i * 1.3) * 9;

      ctx.beginPath();
      ctx.moveTo(x0, flagBottom);
      ctx.quadraticCurveTo(x0 + 4, flagBottom + flameLen * 0.6, xMid, flagBottom + flameLen);
      ctx.quadraticCurveTo(x1 - 4, flagBottom + flameLen * 0.4, x1, flagBottom);
      ctx.closePath();
      ctx.fill();
    }

    // 2. NĂM TẦNG MÀU NGŨ SẮC ĐỒNG TÂM (TỪ NGOÀI VÀO TRONG)
    // Tầng 1: Viền Đỏ ngoài cùng
    ctx.fillStyle = '#c62828';
    ctx.fillRect(flagLeft, flagTop, flagW, flagH);

    // Tầng 2: Vành Xanh Lam Đậm (Royal Navy Blue)
    const band1 = 25;
    ctx.fillStyle = '#0d47a1';
    ctx.fillRect(flagLeft + band1, flagTop + band1, flagW - band1 * 2, flagH - band1 * 2);

    // Tầng 3: Vành Vàng Hoàng Kim (Imperial Gold)
    const band2 = 52;
    ctx.fillStyle = '#fbc02d';
    ctx.fillRect(flagLeft + band2, flagTop + band2, flagW - band2 * 2, flagH - band2 * 2);

    // Tầng 4: Vành Xanh Lục (Emerald Green)
    const band3 = 80;
    ctx.fillStyle = '#2e7d32';
    ctx.fillRect(flagLeft + band3, flagTop + band3, flagW - band3 * 2, flagH - band3 * 2);

    // Tầng 5: Tâm Cờ Đỏ Thắm (Crimson Silk Center)
    const band4 = 108;
    const centerW = flagW - band4 * 2;
    const centerH = flagH - band4 * 2;
    const centerX = flagLeft + band4;
    const centerY = flagTop + band4;
    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(centerX, centerY, centerW, centerH);

    // 3. HIỆU ỨNG GẤM LỤA BÓNG BẨY & NẾP GẤP TỰ NHIÊN (SILK SHEEN & FOLDS)
    const foldGrad = ctx.createLinearGradient(flagLeft, flagTop, flagRight, flagBottom);
    foldGrad.addColorStop(0.0, 'rgba(255, 255, 255, 0.16)');
    foldGrad.addColorStop(0.25, 'rgba(0, 0, 0, 0.12)');
    foldGrad.addColorStop(0.48, 'rgba(255, 255, 255, 0.22)');
    foldGrad.addColorStop(0.72, 'rgba(0, 0, 0, 0.14)');
    foldGrad.addColorStop(1.0, 'rgba(255, 255, 255, 0.15)');
    ctx.fillStyle = foldGrad;
    ctx.fillRect(flagLeft, flagTop, flagW, flagH);

    // Vệt bóng lụa uốn lượn chéo
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(flagLeft, flagTop + 80);
    ctx.bezierCurveTo(flagLeft + 120, flagTop + 160, flagLeft + 260, flagTop + 80, flagRight, flagTop + 240);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.moveTo(flagLeft, flagTop + 140);
    ctx.bezierCurveTo(flagLeft + 140, flagTop + 220, flagLeft + 280, flagTop + 140, flagRight, flagTop + 300);
    ctx.stroke();

    // 4. ĐẠI TỰ CHỮ "VŨ" (武) DÁT VÀNG HOÀNG KIM CHÍNH TÂM
    const textCenterX = centerX + centerW / 2;
    const textCenterY = centerY + centerH / 2;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 125px "SimSun", "STKaiti", "KaiTi", "Microsoft YaHei", serif';

    // Đổ bóng chiều sâu cho chỉ thêu vàng
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 4;

    // Viền chỉ vàng cam nổi bật
    ctx.strokeStyle = '#c67d00';
    ctx.lineWidth = 6;
    ctx.strokeText('武', textCenterX, textCenterY);

    // Lòng chữ vàng óng ánh
    const goldGrad = ctx.createLinearGradient(0, centerY, 0, centerY + centerH);
    goldGrad.addColorStop(0.0, '#fff59d');
    goldGrad.addColorStop(0.5, '#ffd600');
    goldGrad.addColorStop(1.0, '#ffab00');
    ctx.fillStyle = goldGrad;
    ctx.fillText('武', textCenterX, textCenterY);
    ctx.restore();

    // 5. NẸP CÁN CỜ BẰNG VẢI MÀU TRẮNG KEM DỌC CẠNH TRÁI
    ctx.fillStyle = '#eae5d8';
    ctx.fillRect(flagLeft - 10, flagTop, 12, flagH);
    ctx.strokeStyle = '#8d7b68';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(flagLeft - 10, flagTop, 12, flagH);

    // 4 Vòng dây buộc cán cờ
    ctx.fillStyle = '#b71c1c';
    [0.1, 0.38, 0.65, 0.92].forEach((ratio) => {
      ctx.fillRect(flagLeft - 14, flagTop + flagH * ratio, 8, 8);
    });
  });
}

export function buildNamQuocSonHaExhibition({
  roomCenter = new THREE.Vector3(-48.0, 10.0, -19.0) // Khớp chính xác Tầng 2 Cánh Tây-Bắc
} = {}) {
  const root = new THREE.Group();
  root.name = 'NamQuocSonHa_Sovereignty_Exhibition';
  root.position.copy(roomCenter);

  const loader = new GLTFLoader();

  // =========================================================================
  // 1. BẢNG VẬT LIỆU ĐẶC TRƯNG: ĐÊM SÔNG NHƯ NGUYỆT & VÀNG KIM THIÊN THƯ
  // =========================================================================
  const riverStoneTex = getCachedTex('nqsh_river_floor', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#071422'; // Đá trầm tích sông Như Nguyệt đêm trăng
    ctx.fillRect(0, 0, w, h);

    // Gợn sóng nước ánh trăng & kim quang
    ctx.strokeStyle = 'rgba(75, 195, 255, 0.22)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      const y = i * 32 + 12;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * 0.3, y - 10, w * 0.7, y + 10, w, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(255, 210, 95, 0.14)';
    ctx.strokeRect(2, 2, w - 4, h - 4);
  }, 6, 6);

  const riverFloorMat = new THREE.MeshPhongMaterial({
    map: riverStoneTex,
    emissive: 0x040c17,
    specular: 0x66ccff,
    shininess: 65
  });

  const imperialIndigoMat = new THREE.MeshPhongMaterial({
    color: 0x0f253d,
    emissive: 0x05101f,
    specular: 0x80d4ff,
    shininess: 60
  });

  const celestialGoldMat = new THREE.MeshPhongMaterial({
    color: 0xf0c048,
    emissive: 0x382605,
    specular: 0xfff2b3,
    shininess: 90
  });

  const crimsonBannerMat = new THREE.MeshLambertMaterial({
    color: 0x7a1212,
    emissive: 0x290404
  });

  // Ánh sáng Thiên Thư chiếu rọi (0 PointLight)
  const celestialBeamTex = getCachedTex('nqsh_celestial_beam', 128, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0.0, 'rgba(255, 225, 130, 0.0)');
    g.addColorStop(0.25, 'rgba(255, 225, 130, 0.22)');
    g.addColorStop(0.75, 'rgba(90, 210, 255, 0.10)');
    g.addColorStop(1.0, 'rgba(50, 180, 255, 0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  const celestialBeamMat = new THREE.MeshBasicMaterial({
    map: celestialBeamTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  // =========================================================================
  // 2. SÀN ĐÊM SÔNG NHƯ NGUYỆT & ẤN NGỌC THIÊN THƯ ĐƯỜNG KÍNH 15M
  // =========================================================================
  const customFloor = new THREE.Mesh(new THREE.BoxGeometry(26.4, 0.08, 25.0), riverFloorMat);
  customFloor.position.set(0, 0.04, 0);
  root.add(customFloor);

  // Tinh Đồ Thiên Thư & Ấn Ngọc Đại Việt phát sáng dưới mặt sông
  const sealMandalaTex = getCachedTex('nqsh_seal_mandala', 512, 512, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;
    ctx.clearRect(0, 0, w, h);

    const bg = ctx.createRadialGradient(cx, cy, 12, cx, cy, cx * 0.94);
    bg.addColorStop(0.0, 'rgba(255, 225, 120, 0.65)');
    bg.addColorStop(0.48, 'rgba(0, 195, 255, 0.35)');
    bg.addColorStop(0.85, 'rgba(15, 85, 160, 0.15)');
    bg.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Khung Ấn Ngọc Vuông "Nam Đế Cư" ở trung tâm
    ctx.strokeStyle = 'rgba(255, 220, 110, 0.9)';
    ctx.lineWidth = 6;
    ctx.strokeRect(cx - 110, cy - 110, 220, 220);

    // Vòng tròn Thiên Hà bao quanh Ấn
    [0.48, 0.68, 0.88].forEach((r, idx) => {
      ctx.lineWidth = idx === 1 ? 4 : 2;
      ctx.strokeStyle = idx === 1 ? 'rgba(110, 235, 255, 0.85)' : 'rgba(255, 215, 100, 0.75)';
      ctx.beginPath();
      ctx.arc(cx, cy, cx * r, 0, Math.PI * 2);
      ctx.stroke();
    });
  });

  const sealMandalaMat = new THREE.MeshBasicMaterial({
    map: sealMandalaTex,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const floorMandala = new THREE.Mesh(new THREE.PlaneGeometry(15.5, 15.5), sealMandalaMat);
  floorMandala.rotation.x = -Math.PI / 2;
  floorMandala.position.set(-0.5, 0.095, 0);
  root.add(floorMandala);

  // =========================================================================
  // 3. TRUNG TÂM: SA BÀN GIANG SƠN (namquocsonhanui.glb) & LÝ THƯỜNG KIỆT (lythuongkiet.glb)
  // =========================================================================
  // 3.1. Bệ Sa Bàn Núi Sông Nước Nam ở chính giữa phòng
  const mountainBasin = new THREE.Group();
  mountainBasin.position.set(1.2, 0.08, 0);
  root.add(mountainBasin);

  const basinRim = new THREE.Mesh(new THREE.CylinderGeometry(4.8, 5.2, 0.42, 12), imperialIndigoMat);
  basinRim.position.y = 0.21;
  mountainBasin.add(basinRim);

  const basinGoldBorder = new THREE.Mesh(new THREE.CylinderGeometry(4.9, 4.9, 0.08, 12), celestialGoldMat);
  basinGoldBorder.position.y = 0.43;
  mountainBasin.add(basinGoldBorder);

  const mountainSlot = new THREE.Group();
  mountainSlot.position.y = 0.45;
  mountainBasin.add(mountainSlot);

  // Load mô hình địa hình núi sông: namquocsonhanui.glb
  const loadGlbCandidates = (urls, onSuccess, onFail) => {
    let i = 0;
    const next = () => {
      if (i >= urls.length) {
        if (onFail) onFail();
        return;
      }
      loader.load(urls[i++], onSuccess, undefined, () => next());
    };
    next();
  };

  loadGlbCandidates(
    [
      '/model/namquocsonhanui.glb',
      '/model/NamQuocSonHaNui.glb'
    ],
    (gltf) => {
      const raw = gltf.scene;
      optimizeGlbModel(raw, 0x0b211d, 0x99ffe6);
      const fittedMountain = normalizeModelTransform(raw, 8.6, 'horizontal');
      mountainSlot.add(fittedMountain);
    },
    () => {
      // Fallback dãy núi ngọc nếu đang copy file
      const peak = new THREE.Mesh(new THREE.ConeGeometry(2.6, 3.2, 7), imperialIndigoMat);
      peak.position.y = 1.6;
      mountainSlot.add(peak);
    }
  );

  // 3.2. Đài Chỉ Huy Thái Úy Lý Thường Kiệt (lythuongkiet.glb) uy nghiêm phía sau sa bàn núi sông
  const generalCitadel = new THREE.Group();
  generalCitadel.position.set(-4.8, 0.08, 0);
  root.add(generalCitadel);

  const step1 = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.5, 4.6), imperialIndigoMat);
  step1.position.y = 0.25;
  generalCitadel.add(step1);

  const step2 = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.55, 3.4), imperialIndigoMat);
  step2.position.y = 0.775;
  generalCitadel.add(step2);

  const step3 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.55, 2.4), celestialGoldMat);
  step3.position.y = 1.325;
  generalCitadel.add(step3);

  const generalPlaque = createImperialPlaque(
    'THÁI ÚY LÝ THƯỜNG KIỆT',
    'Tổng Chỉ Huy Phòng Tuyến Sông Như Nguyệt (1077)',
    3.5,
    0.72
  );
  generalPlaque.position.set(2.45, 0.85, 0);
  generalPlaque.rotation.y = Math.PI / 2;
  generalPlaque.rotation.z = 0.16;
  generalCitadel.add(generalPlaque);

  // Chùm hào quang Thiên Thư chiếu thẳng xuống Thái úy Lý Thường Kiệt
  const heroBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 3.2, 9.0, 16, 1, true), celestialBeamMat);
  heroBeam.position.set(0, 5.2, 0);
  generalCitadel.add(heroBeam);

  const generalSlot = new THREE.Group();
  generalSlot.position.y = 1.6;
  generalSlot.rotation.y = Math.PI / 2; // Hướng mặt ra sa bàn núi sông và cửa chính
  generalCitadel.add(generalSlot);

  loadGlbCandidates(
    [
      '/model/lythuongkiet.glb',
      '/model/LyThuongKiet.glb'
    ],
    (gltf) => {
      const raw = gltf.scene;
      optimizeGlbModel(raw, 0x1f1606, 0xffe599);
      const fittedGeneral = normalizeModelTransform(raw, 3.9, 'y');
      generalSlot.add(fittedGeneral);

      fittedGeneral.updateMatrixWorld(true);
      if (typeof window !== 'undefined' && window.__museumHitboxManager) {
        window.__museumHitboxManager.createTightClickHitbox(fittedGeneral, {
          loreKey: 'nam_quoc_son_ha_ly_thuong_kiet',
          isBookPortal: false,
          padding: 0.12
        });
      }
    }
  );

  // =========================================================================
  // 4. HẬU CẢNH ĐẶC SẢN: CUỘN "THIÊN THƯ" (SÁCH TRỜI) KHỔNG LỒ MỞ GIỮA TRỜI
  // =========================================================================
  const thienThuBackdrop = new THREE.Group();
  thienThuBackdrop.position.set(-9.4, 0.08, 0);
  thienThuBackdrop.rotation.y = Math.PI / 2;

  const thienThuTex = getCachedTex('thien_thu_golden_scroll', 1024, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0.0, '#2b1906');
    g.addColorStop(0.2, '#f5d782');
    g.addColorStop(0.5, '#fff1bd');
    g.addColorStop(0.8, '#e8bf56');
    g.addColorStop(1.0, '#2b1906');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Khung viền Sách Trời
    ctx.strokeStyle = '#7a1212';
    ctx.lineWidth = 10;
    ctx.strokeRect(18, 18, w - 36, h - 36);

    // Ấn đỏ Thiên Tử ở góc trái
    ctx.fillStyle = 'rgba(179, 27, 27, 0.85)';
    ctx.fillRect(55, 55, 88, 88);
    ctx.fillStyle = '#fff1bd';
    ctx.font = 'bold 22px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText('THIÊN', 99, 92);
    ctx.fillText('THƯ', 99, 122);

    // 4 câu thơ thần Nam Quốc Sơn Hà
    ctx.fillStyle = '#1f0d04';
    ctx.font = 'bold 40px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText('NAM QUỐC SƠN HÀ NAM ĐẾ CƯ', w / 2, 130);
    ctx.fillText('TIỆT NHIÊN ĐỊNH PHẬN TẠI THIÊN THƯ', w / 2, 225);
    ctx.fillText('NHƯ HÀ NGHỊCH LỖ LAI XÂM PHẠM', w / 2, 320);
    ctx.fillText('NHỮ ĐẲNG HÀNH KHAN THỦ BẠI HƯ!', w / 2, 415);
  });

  const scrollMat = new THREE.MeshLambertMaterial({
    map: thienThuTex,
    emissive: 0x3b280a
  });

  const scrollCanvas = new THREE.Mesh(new THREE.BoxGeometry(9.6, 4.8, 0.12), scrollMat);
  scrollCanvas.position.set(0, 4.4, 0);
  thienThuBackdrop.add(scrollCanvas);

  // Hai trục cuộn Thiên Thư mạ vàng hai đầu
  [-4.9, 4.9].forEach((rx) => {
    const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 5.4, 12), celestialGoldMat);
    roller.position.set(rx, 4.4, 0.05);
    thienThuBackdrop.add(roller);
  });

  const topHeader = createImperialPlaque(
    'NAM QUỐC SƠN HÀ • TUYÊN NGÔN ĐỘC LẬP ĐẦU TIÊN',
    'Định Phận Tại Thiên Thư • Hào Khí Đại Việt Thời Lý',
    6.8,
    1.15
  );
  topHeader.position.set(0, 7.5, 0.2);
  thienThuBackdrop.add(topHeader);

  root.add(thienThuBackdrop);

  // =========================================================================
  // 5. TƯỜNG BÊN RỒNG THỜI LÝ & HÀNG ĐẠI KỲ PHÒNG TUYẾN NHƯ NGUYỆT
  // =========================================================================
  [-11.6, 11.6].forEach((wz) => {
    const wallPanel = new THREE.Mesh(new THREE.BoxGeometry(23.5, 8.6, 0.3), imperialIndigoMat);
    wallPanel.position.set(-0.5, 4.3, wz);
    root.add(wallPanel);

    const goldTrim = new THREE.Mesh(new THREE.BoxGeometry(23.8, 0.3, 0.42), celestialGoldMat);
    goldTrim.position.set(-0.5, 8.7, wz);
    root.add(goldTrim);
  });

  // Hàng Cờ Ngũ Sắc Lệnh Kỳ "Vũ" (武) & Cọc Phòng Tuyến Sông Như Nguyệt dọc 2 bên
  const coNguSacTex = getVietnameseMartialFlagTexture();
  const flagMat = new THREE.MeshPhongMaterial({
    map: coNguSacTex,
    emissive: 0x3d0808,
    specular: 0xffd700,
    shininess: 50,
    transparent: true,
    alphaTest: 0.15,
    side: THREE.DoubleSide
  });

  const animatedFlags = [];

  [-6.8, 6.8].forEach((sideZ, sideIdx) => {
    [-6.0, -0.5, 5.0].forEach((px, pIdx) => {
      const bannerGroup = new THREE.Group();
      bannerGroup.position.set(px, 0.08, sideZ);

      const stakeBase = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.52, 0.7, 8), imperialIndigoMat);
      stakeBase.position.y = 0.35;
      bannerGroup.add(stakeBase);

      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 5.6, 8), celestialGoldMat);
      pole.position.y = 2.8;
      bannerGroup.add(pole);

      const spearTip = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.55, 6), celestialGoldMat);
      spearTip.position.y = 5.75;
      bannerGroup.add(spearTip);

      // Lá cờ ngũ sắc gợn sóng tự nhiên (Wavy cloth geometry)
      const flagGeo = new THREE.PlaneGeometry(2.35, 2.35, 12, 1);
      const posAttr = flagGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const vx = posAttr.getX(i);
        const u = (vx + 1.175) / 2.35;
        const waveZ = Math.sin(u * Math.PI * 2.2) * 0.15 * u;
        posAttr.setZ(i, waveZ);
      }
      flagGeo.computeVertexNormals();

      const flag = new THREE.Mesh(flagGeo, flagMat);
      const outwardX = sideZ > 0 ? -1.18 : 1.18;
      flag.position.set(outwardX, 4.0, 0);

      const baseRotY = sideZ > 0 ? (Math.PI + 0.22) : -0.22;
      flag.rotation.y = baseRotY;
      flag.userData = {
        baseRotY,
        speed: 2.2 + pIdx * 0.35 + sideIdx * 0.5,
        phase: pIdx * 1.2 + sideIdx * 2.0
      };
      animatedFlags.push(flag);

      bannerGroup.add(flag);
      root.add(bannerGroup);
    });
  });

  // =========================================================================
  // 6. BẢNG THÔNG TIN HOLOGRAM LƠ LỬNG GIỮA KHÔNG TRUNG
  // =========================================================================
  const hologramInfo = createRoomInfoPlaque({
    title: 'NAM QUỐC SƠN HÀ',
    author: 'Thái úy Lý Thường Kiệt (1019–1105)',
    year: 'Năm 1077 (Phòng tuyến sông Như Nguyệt)',
    yearLabel: 'Năm ra đời',
    description: 'Được tôn vinh là Bản Tuyên ngôn Độc lập đầu tiên của dân tộc Việt Nam. Bài thơ thần vang vọng trong đêm bên bờ sông Như Nguyệt giữa cuộc kháng chiến chống quân Tống năm 1077, khẳng định đanh thép quyền độc lập, tự chủ và lãnh thổ thiêng liêng của nước Đại Việt đã được ghi rõ trong Sách Trời (Thiên Thư), khích lệ quân dân đại thắng quân xâm lược.'
  });
  hologramInfo.position.set(7.2, 2.35, -3.8);
  hologramInfo.rotation.y = -Math.PI * 0.35;
  root.add(hologramInfo);

  // =========================================================================
  // 7. HẠT KIM QUANG THIÊN THƯ & SƯƠNG ĐÊM NHƯ NGUYỆT (ĐÚNG 1 DRAW CALL)
  // =========================================================================
  const pCount = 140;
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    pPos[i * 3]     = (Math.random() - 0.5) * 21;
    pPos[i * 3 + 1] = 0.5 + Math.random() * 7.5;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * 19;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));

  const pMat = new THREE.PointsMaterial({
    color: 0xffe082,
    size: 0.3,
    transparent: true,
    opacity: 0.82,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const particles = new THREE.Points(pGeo, pMat);
  particles.name = 'NamQuocSonHa_Celestial_Particles';
  root.add(particles);

  // =========================================================================
  // 8. HOẠT ẢNH CỜ BAY PHẤP PHỚI & KIM QUANG THIÊN THƯ (ANIMATION LOOP)
  // =========================================================================
  root.update = (delta = 0.016, elapsedTime = 0) => {
    // Hoạt ảnh cờ ngũ sắc "Vũ" bay phấp phới tự nhiên trong gió đêm sông Như Nguyệt
    for (let i = 0; i < animatedFlags.length; i++) {
      const f = animatedFlags[i];
      const flutter = Math.sin(elapsedTime * f.userData.speed + f.userData.phase) * 0.07;
      f.rotation.y = f.userData.baseRotY + flutter;
    }

    // Chuyển động nhẹ của bụi sao kim quang
    const pArr = pGeo.attributes.position.array;
    for (let i = 0; i < pCount; i++) {
      pArr[i * 3 + 1] += Math.sin(elapsedTime * 1.5 + i) * 0.003;
    }
    pGeo.attributes.position.needsUpdate = true;
  };

  root.traverse((child) => {
    child.layers?.enable?.(1);
  });

  root.roomGroup = root;
  root.getGroup = function() {
    return root;
  };

  return root;
}