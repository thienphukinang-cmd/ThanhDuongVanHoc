import * as THREE from 'three';

/**
 * ============================================================================
 * CAT PORTAL VFX & MINIATURE ISLAND LIGHTING SYSTEM
 * PHỤ TRÁCH BỞI MÈO MUN THẮP ĐÈN (MUNTHAPDEN)
 * 
 * 1. Vòng xoáy linh khí Xanh Ngọc Lục Bảo pha Vàng Kim (#00f5d4 & #ffbe55)
 * 2. Hạt ánh sáng dấu chân mèo (Cat Paw Prints) & Đom đóm lơ lửng quanh cổng
 * 3. Hệ thống đèn lồng vàng ấm cúng bao quanh bờ cõi Đảo Mèo thu nhỏ (~22m x 22m)
 * 4. 100% userData.ignoreRaycaster = true, zero dynamic heap allocations
 * ============================================================================
 */

function prepGeo(geo) {
  if (!geo) return geo;
  try {
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    const pos = geo.attributes.position;
    if (pos) {
      const arr = pos.array;
      for (let i = 0; i < arr.length; i++) {
        if (!isFinite(arr[i])) arr[i] = 0;
      }
    }
  } catch (_) {}
  return geo;
}

// ============================================================================
// CANVAS TEXTURE GENERATORS (CACHED)
// ============================================================================
let cachedVortexTex = null;
let cachedCatPawTex = null;
let cachedFireflyTex = null;

/**
 * Texture Vòng Xoáy Linh Khí: Hòa quyện Xanh Ngọc Lục Bảo (#00f5d4) và Vàng Kim (#ffbe55)
 */
export function getLinhKhiVortexTexture() {
  if (cachedVortexTex) return cachedVortexTex;
  if (typeof document === 'undefined') return new THREE.Texture();

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const cx = 256;
  const cy = 256;

  ctx.clearRect(0, 0, 512, 512);

  // Vòng xoáy xoắn ốc đa lớp
  const arms = 5;
  const maxR = 240;

  for (let r = 10; r < maxR; r += 2) {
    const alpha = (1.0 - r / maxR) * 0.85;
    for (let a = 0; a < arms; a++) {
      const angle = (a * (Math.PI * 2) / arms) + (r * 0.045);
      const px = cx + Math.cos(angle) * r;
      const py = cy + Math.sin(angle) * r;
      const dotR = 2.5 + (r / maxR) * 6.0;

      // Pha trộn gradient: lõi vàng kim (#ffbe55) tỏa ra xanh ngọc (#00f5d4)
      const grad = ctx.createRadialGradient(px, py, 0, px, py, dotR);
      if (a % 2 === 0) {
        grad.addColorStop(0, `rgba(0, 245, 212, ${alpha})`);
        grad.addColorStop(0.5, `rgba(0, 245, 212, ${alpha * 0.6})`);
        grad.addColorStop(1, 'rgba(0, 245, 212, 0)');
      } else {
        grad.addColorStop(0, `rgba(255, 190, 85, ${alpha})`);
        grad.addColorStop(0.5, `rgba(254, 240, 138, ${alpha * 0.6})`);
        grad.addColorStop(1, 'rgba(255, 190, 85, 0)');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, dotR, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Lõi phát quang vàng ngọc rực rỡ ở tâm
  const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 95);
  coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  coreGrad.addColorStop(0.3, 'rgba(0, 245, 212, 0.75)');
  coreGrad.addColorStop(0.65, 'rgba(255, 190, 85, 0.45)');
  coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = coreGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 95, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  cachedVortexTex = tex;
  return tex;
}

/**
 * Texture Dấu Chân Mèo Phát Sáng (Glowing Cat Paw Print)
 */
export function getCatPawGlowTexture() {
  if (cachedCatPawTex) return cachedCatPawTex;
  if (typeof document === 'undefined') return new THREE.Texture();

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const cx = 64;
  const cy = 64;

  ctx.clearRect(0, 0, 128, 128);

  // Đệm bàn chân chính (Main paw pad - hình trái tim/bầu dục ngược)
  ctx.fillStyle = '#00f5d4';
  ctx.shadowColor = '#00f5d4';
  ctx.shadowBlur = 14;

  ctx.beginPath();
  ctx.ellipse(cx, cy + 12, 22, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // 4 Đệm ngón chân nhỏ (4 Cute Toe Beans)
  const toeOffsets = [
    { x: -22, y: -12, r: 7.5 },
    { x: -8,  y: -24, r: 8.5 },
    { x: 8,   y: -24, r: 8.5 },
    { x: 22,  y: -12, r: 7.5 }
  ];

  ctx.fillStyle = '#ffbe55';
  ctx.shadowColor = '#ffbe55';
  ctx.shadowBlur = 12;

  toeOffsets.forEach(toe => {
    ctx.beginPath();
    ctx.arc(cx + toe.x, cy + toe.y, toe.r, 0, Math.PI * 2);
    ctx.fill();
  });

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  cachedCatPawTex = tex;
  return tex;
}

/**
 * Texture Đom Đóm Tròn Mịn (Radial Firefly Glow)
 */
export function getSoftFireflyTexture() {
  if (cachedFireflyTex) return cachedFireflyTex;
  if (typeof document === 'undefined') return new THREE.Texture();

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.3, '#00f5d4');
  grad.addColorStop(0.65, '#ffbe55');
  grad.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  cachedFireflyTex = tex;
  return tex;
}

// ============================================================================
// HẠNG MỤC 1: VÒNG XOÁY LINH KHÍ XANH NGỌC PHA VÀNG KIM (#00f5d4 & #ffbe55)
// ============================================================================
export function createLinhKhiVortexMesh({ radius = 1.6, isLobby = true } = {}) {
  const vortexGroup = new THREE.Group();
  vortexGroup.name = isLobby ? 'Lobby_Cat_Portal_Vortex_Group' : 'Village_Cat_Portal_Vortex_Group';
  vortexGroup.userData.ignoreRaycaster = true;

  const vortexTex = getLinhKhiVortexTexture();

  // 1. Tấm đĩa xoáy chính (Primary Swirling Disc - Thuận chiều kim đồng hồ)
  const discGeo = prepGeo(new THREE.CircleGeometry(radius, 48));
  const discMat = new THREE.MeshBasicMaterial({
    map: vortexTex,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  discMat.userData = { ignoreRaycaster: true };

  const primaryDisc = new THREE.Mesh(discGeo, discMat);
  primaryDisc.name = 'Portal_Vortex_Primary_Disc';
  primaryDisc.userData.ignoreRaycaster = true;
  vortexGroup.add(primaryDisc);

  // 2. Vành hào quang phụ xoay ngược chiều (Counter-Rotating Astral Aura Ring)
  const ringGeo = prepGeo(new THREE.RingGeometry(radius * 0.45, radius * 1.15, 48));
  const ringMat = new THREE.MeshBasicMaterial({
    map: vortexTex,
    transparent: true,
    opacity: 0.65,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  ringMat.userData = { ignoreRaycaster: true };

  const counterRing = new THREE.Mesh(ringGeo, ringMat);
  counterRing.name = 'Portal_Vortex_Counter_Ring';
  counterRing.position.z = isLobby ? 0.02 : -0.02;
  counterRing.userData.ignoreRaycaster = true;
  vortexGroup.add(counterRing);

  // 3. Đèn PointLight phát quang tâm cổng màu Xanh Ngọc Lục Bảo rực rỡ
  const portalLight = new THREE.PointLight(0x00f5d4, 1.45, 9.5, 1.6);
  portalLight.position.set(0, 0, isLobby ? 0.25 : -0.25);
  portalLight.castShadow = false;
  portalLight.userData.ignoreRaycaster = true;
  vortexGroup.add(portalLight);

  // 4. Vòng lặp cập nhật Animation (Zero dynamic allocations)
  const updateVortex = (timeSec) => {
    primaryDisc.rotation.z = timeSec * 1.6;
    counterRing.rotation.z = -timeSec * 1.1;

    // Nhịp thở quang năng lung linh của cổng
    const pulse = 0.85 + Math.sin(timeSec * 3.2) * 0.15;
    discMat.opacity = 0.88 * pulse;
    portalLight.intensity = 1.35 * pulse;
  };

  vortexGroup.userData.update = updateVortex;
  return { vortexGroup, updateVortex, primaryDisc, counterRing, portalLight };
}

// ============================================================================
// HẠNG MỤC 2: HẠT DẤU CHÂN MÈO PHÁT SÁNG & ĐOM ĐÓM LƠ LỬNG QUANH CỔNG
// ============================================================================
export function createCatPawAndFireflyAura({ radius = 2.2, count = 28 } = {}) {
  const auraGroup = new THREE.Group();
  auraGroup.name = 'Cat_Portal_Paw_Firefly_Aura';
  auraGroup.userData.ignoreRaycaster = true;

  const pawCount = Math.floor(count * 0.5);
  const fireflyCount = count - pawCount;

  // 1. Hạt Dấu Chân Mèo (Cat Paw Points - bay lơ lửng bốc lên từ lòng cổng)
  const pawTex = getCatPawGlowTexture();
  const pawGeo = new THREE.BufferGeometry();
  const pawPos = new Float32Array(pawCount * 3);
  const pawSpeeds = new Float32Array(pawCount);
  const pawAngles = new Float32Array(pawCount);
  const pawRadii = new Float32Array(pawCount);

  for (let i = 0; i < pawCount; i++) {
    const ang = Math.random() * Math.PI * 2;
    const r = 0.25 + Math.random() * (radius * 0.85);
    pawAngles[i] = ang;
    pawRadii[i] = r;
    pawSpeeds[i] = 0.4 + Math.random() * 0.6;

    pawPos[i * 3 + 0] = Math.cos(ang) * r;
    pawPos[i * 3 + 1] = (Math.random() - 0.5) * 2.8;
    pawPos[i * 3 + 2] = (Math.random() - 0.5) * 0.65;
  }

  pawGeo.setAttribute('position', new THREE.BufferAttribute(pawPos, 3));
  prepGeo(pawGeo);

  const pawMat = new THREE.PointsMaterial({
    map: pawTex,
    size: 0.38,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  pawMat.userData = { ignoreRaycaster: true };

  const pawPoints = new THREE.Points(pawGeo, pawMat);
  pawPoints.name = 'Cat_Portal_Paw_Particles';
  pawPoints.userData.ignoreRaycaster = true;
  pawPoints.raycast = () => {};
  auraGroup.add(pawPoints);

  // 2. Hạt Đom Đóm Lân Tinh (Firefly Points - chao lượn quanh trụ cổng)
  const fireflyTex = getSoftFireflyTexture();
  const ffGeo = new THREE.BufferGeometry();
  const ffPos = new Float32Array(fireflyCount * 3);
  const ffPhases = new Float32Array(fireflyCount);

  for (let j = 0; j < fireflyCount; j++) {
    ffPos[j * 3 + 0] = (Math.random() - 0.5) * (radius * 2.2);
    ffPos[j * 3 + 1] = -1.2 + Math.random() * 3.4;
    ffPos[j * 3 + 2] = (Math.random() - 0.5) * 1.8;
    ffPhases[j] = Math.random() * Math.PI * 2;
  }

  ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
  prepGeo(ffGeo);

  const ffMat = new THREE.PointsMaterial({
    map: fireflyTex,
    size: 0.16,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  ffMat.userData = { ignoreRaycaster: true };

  const ffPoints = new THREE.Points(ffGeo, ffMat);
  ffPoints.name = 'Cat_Portal_Firefly_Particles';
  ffPoints.userData.ignoreRaycaster = true;
  ffPoints.raycast = () => {};
  auraGroup.add(ffPoints);

  // Vòng lặp cập nhật Animation (Zero dynamic allocations)
  const pawPosAttr = pawGeo.attributes.position;
  const ffPosAttr = ffGeo.attributes.position;

  const updateAura = (timeSec) => {
    // Cập nhật dấu chân mèo bay lên
    for (let i = 0; i < pawCount; i++) {
      let py = pawPos[i * 3 + 1];
      py += pawSpeeds[i] * 0.022;
      if (py > 2.2) {
        py = -1.6;
        pawAngles[i] = Math.random() * Math.PI * 2;
        pawRadii[i] = 0.2 + Math.random() * (radius * 0.8);
      }
      pawPos[i * 3 + 1] = py;

      const curAng = pawAngles[i] + timeSec * 0.45;
      pawPos[i * 3 + 0] = Math.cos(curAng) * pawRadii[i];
      pawPos[i * 3 + 2] = Math.sin(timeSec * 1.2 + i) * 0.18;
    }
    pawPosAttr.needsUpdate = true;

    // Cập nhật đom đóm chao lượn quanh cột
    for (let j = 0; j < fireflyCount; j++) {
      const ph = ffPhases[j];
      ffPos[j * 3 + 0] += Math.sin(timeSec * 1.4 + ph) * 0.008;
      ffPos[j * 3 + 1] += Math.cos(timeSec * 1.8 + ph) * 0.006;
      ffPos[j * 3 + 2] += Math.sin(timeSec * 1.1 + ph * 2.0) * 0.007;
    }
    ffPosAttr.needsUpdate = true;
  };

  auraGroup.userData.update = updateAura;
  return { auraGroup, updateAura };
}

// ============================================================================
// HẠNG MỤC 3: GÓI VFX HOÀN CHỈNH CHO CỔNG LINH MIÊU (LOBBY & VILLAGE)
// ============================================================================
export function attachCatPortalLinhKhiCombo(portalGroup, { radius = 1.65, isLobby = true } = {}) {
  if (!portalGroup) return null;

  const comboGroup = new THREE.Group();
  comboGroup.name = isLobby ? 'Lobby_Cat_Portal_LinhKhi_Combo' : 'Village_Cat_Portal_LinhKhi_Combo';
  comboGroup.position.set(0, 2.55, 0);
  comboGroup.userData.ignoreRaycaster = true;

  const vortexRes = createLinhKhiVortexMesh({ radius, isLobby });
  comboGroup.add(vortexRes.vortexGroup);

  const auraRes = createCatPawAndFireflyAura({ radius: radius * 1.25, count: 32 });
  comboGroup.add(auraRes.auraGroup);

  const update = (timeSec) => {
    vortexRes.updateVortex(timeSec);
    auraRes.updateAura(timeSec);
  };

  comboGroup.userData.update = update;
  portalGroup.add(comboGroup);

  return { comboGroup, update };
}

// ============================================================================
// HẠNG MỤC 4: HỆ THỐNG ĐÈN LỒNG VÀNG ẤM CÚNG BAO QUANH ĐẢO MÈO MINI (~22M X 22M)
// ============================================================================
export function createMiniIslandLanternPerimeter({ islandRadius = 11.0 } = {}) {
  const islandLightingGroup = new THREE.Group();
  islandLightingGroup.name = 'Mini_Island_Lantern_Perimeter_Master';
  islandLightingGroup.userData.ignoreRaycaster = true;

  const lanternCount = 8;
  const lanterns = [];

  // Vật liệu trụ gỗ tre & chao lồng đèn vàng ấm
  const postMat = new THREE.MeshStandardMaterial({
    color: 0x451a03,
    roughness: 0.65,
    metalness: 0.1
  });
  const silkLanternMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xffaa33,
    emissiveIntensity: 0.85,
    roughness: 0.35,
    metalness: 0.1,
    transparent: true,
    opacity: 0.92
  });

  const postGeo = prepGeo(new THREE.CylinderGeometry(0.045, 0.055, 1.8, 8));
  const lanternGeo = prepGeo(new THREE.OctahedronGeometry(0.28, 0));

  for (let i = 0; i < lanternCount; i++) {
    const angle = (i * Math.PI * 2) / lanternCount;
    // Bố trí viền bờ cỏ đảo thu nhỏ R = 9.8m - 10.5m
    const r = islandRadius * 0.92;
    const lx = Math.cos(angle) * r;
    const lz = Math.sin(angle) * r;
    const ly = 0.0;

    const lanternPole = new THREE.Group();
    lanternPole.position.set(lx, ly, lz);
    lanternPole.userData.ignoreRaycaster = true;

    // Cột chống gỗ
    const postMesh = new THREE.Mesh(postGeo, postMat);
    postMesh.position.y = 0.9;
    postMesh.userData.ignoreRaycaster = true;
    lanternPole.add(postMesh);

    // Chao đèn bát giác vàng ấm
    const lanternMesh = new THREE.Mesh(lanternGeo, silkLanternMat);
    lanternMesh.position.y = 1.9;
    lanternMesh.userData.ignoreRaycaster = true;
    lanternPole.add(lanternMesh);

    // Đèn PointLight vàng ấm dịu (tắt castShadow giữ 60+ FPS)
    const pLight = new THREE.PointLight(0xffaa33, 0.75, 6.5, 1.8);
    pLight.position.y = 1.9;
    pLight.castShadow = false;
    pLight.userData.ignoreRaycaster = true;
    lanternPole.add(pLight);

    lanterns.push({ pole: lanternPole, lanternMesh, pLight, baseAngle: angle });
    islandLightingGroup.add(lanternPole);
  }

  // Bổ sung đom đóm bờ suối thu nhỏ theo kích thước R = 11m
  const fireflyCount = 48;
  const ffGeo = new THREE.BufferGeometry();
  const ffPos = new Float32Array(fireflyCount * 3);
  const ffPhases = new Float32Array(fireflyCount);

  for (let j = 0; j < fireflyCount; j++) {
    ffPos[j * 3 + 0] = (Math.random() - 0.5) * (islandRadius * 1.6);
    ffPos[j * 3 + 1] = 0.4 + Math.random() * 2.5;
    ffPos[j * 3 + 2] = (Math.random() - 0.5) * (islandRadius * 1.6);
    ffPhases[j] = Math.random() * Math.PI * 2;
  }

  ffGeo.setAttribute('position', new THREE.BufferAttribute(ffPos, 3));
  prepGeo(ffGeo);

  const ffTex = getSoftFireflyTexture();
  const ffMat = new THREE.PointsMaterial({
    map: ffTex,
    size: 0.15,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  ffMat.userData = { ignoreRaycaster: true };

  const ffPoints = new THREE.Points(ffGeo, ffMat);
  ffPoints.name = 'Mini_Island_Firefly_Points';
  ffPoints.userData.ignoreRaycaster = true;
  ffPoints.raycast = () => {};
  islandLightingGroup.add(ffPoints);

  const ffPosAttr = ffGeo.attributes.position;

  // Vòng lặp cập nhật (Zero dynamic allocations)
  const updateIslandLighting = (timeSec) => {
    // Nhịp thở của các đèn lồng
    for (let k = 0; k < lanterns.length; k++) {
      const item = lanterns[k];
      const pulse = 0.85 + Math.sin(timeSec * 2.4 + item.baseAngle) * 0.15;
      item.pLight.intensity = 0.75 * pulse;
      item.lanternMesh.rotation.y = timeSec * 0.4 + item.baseAngle;
    }

    // Đom đóm ven suối
    for (let j = 0; j < fireflyCount; j++) {
      const ph = ffPhases[j];
      ffPos[j * 3 + 0] += Math.sin(timeSec * 1.2 + ph) * 0.007;
      ffPos[j * 3 + 1] += Math.cos(timeSec * 1.6 + ph) * 0.005;
      ffPos[j * 3 + 2] += Math.sin(timeSec * 0.9 + ph * 1.5) * 0.006;
    }
    ffPosAttr.needsUpdate = true;
  };

  islandLightingGroup.userData.update = updateIslandLighting;
  return { islandLightingGroup, updateIslandLighting };
}

export default {
  getLinhKhiVortexTexture,
  getCatPawGlowTexture,
  getSoftFireflyTexture,
  createLinhKhiVortexMesh,
  createCatPawAndFireflyAura,
  attachCatPortalLinhKhiCombo,
  createMiniIslandLanternPerimeter
};
