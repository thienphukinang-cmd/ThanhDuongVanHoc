import * as THREE from 'three';

/**
 * ============================================================================
 * MUSEUM MASTER BEAUTIFIER - HỆ THỐNG TÔ MÀU, CHI TIẾT & TỐI ƯU FPS (60+ FPS)
 * Kết hợp 6 Kỹ năng:
 * 1. shader-coloring-artist: Bảng màu nghệ thuật, Emissive Glow, Rim-Tinting
 * 2. mesh-detailing-specialist: Đèn lồng lụa, Hoa sen phát sáng, Bụi linh khí
 * 3. environment-lighting-artist: Vòm trời SkyDome đa sắc, Sương mù, God-Rays
 * 4. fps-optimizer: Gộp InstancedMesh (1 Draw Call), Quản lý & Giải phóng VRAM
 * 5. threejs-auto-integrator: Chuẩn hóa tỷ lệ fitAxis: 'y', bảo toàn SRGB
 * 6. camera-director: Cách ly Raycaster (layers/stopPropagation) chống nhảy cam
 * ============================================================================
 */

const BEAUTIFIER_CACHE = {};

// 1. BẢNG MÀU NGHỆ THUẬT THEO TỪNG PHÒNG (SHADER & COLORING ARTIST)
export const ROOM_PALETTES = {
  truyenKieu: {
    id: 'truyenKieu',
    name: 'Đêm Thề Nguyền Kim - Kiều & Lầu Ngưng Bích',
    fogColor: 0x160726,
    fogDensity: 0.0035,
    skyTop: '#090314',
    skyMid: '#240a3d',
    skyBottom: '#4c144e',
    primaryAccent: 0xf472b6,   // Hồng đào
    secondaryAccent: 0xfde047, // Vàng trăng thề
    jadeAccent: 0x38bdf8,      // Lam ngọc Kim Trọng
    particleColor: 0xffa6c9,   // Cánh hoa đào rơi
    godRayColor: '#fef08a',
    floorPatternColor: '#f472b6',
    altarWood: 0x421d28,
    stonePedestal: 0x3a1e2f
  },
  sonTinhThuyTinh: {
    id: 'sonTinhThuyTinh',
    name: 'Đại Chiến Tản Viên Sơn & Biển Lũ Phong Châu',
    fogColor: 0x09192b,
    fogDensity: 0.0025,
    skyTop: '#040b16',
    skyMid: '#102a45',
    skyBottom: '#1e4b6e',
    primaryAccent: 0x38bdf8,   // Lam thủy triều Thủy Thần
    secondaryAccent: 0xfef08a, // Vàng hào quang Sơn Thần
    mountainHero: 0xfef08a,    // Sơn Tinh vàng kim
    oceanHero: 0x38bdf8,       // Thủy Tinh lam ngọc bão tố
    particleColor: 0xe0f2fe,   // Bọt sóng & linh khí
    godRayColor: '#fbbf24',
    floorPatternColor: '#38bdf8',
    altarWood: 0x54260f,
    stonePedestal: 0x473e35
  },
  anDuongVuong: {
    id: 'anDuongVuong',
    name: 'Thành Cổ Loa & Nỏ Thần Liên Châu',
    fogColor: 0x062026,
    fogDensity: 0.0032,
    skyTop: '#031014',
    skyMid: '#0b3842',
    skyBottom: '#14532d',
    primaryAccent: 0x10b981,   // Ngọc bích Cổ Loa
    secondaryAccent: 0xfbbf24, // Vàng Kim Quy Thần Nỏ
    particleColor: 0xf8fafc,   // Lông ngỗng & bụi ngọc
    godRayColor: '#2dd4bf',
    floorPatternColor: '#fbbf24',
    altarWood: 0x451a03,
    stonePedestal: 0x27272a
  },
  voNhat: {
    id: 'voNhat',
    name: 'Chiều Quê Xóm Ngụ Cư & Ánh Bình Minh',
    fogColor: 0x241710,
    fogDensity: 0.0035,
    skyTop: '#170d08',
    skyMid: '#452615',
    skyBottom: '#7c3f1c',
    primaryAccent: 0xfb923c,   // Cam ấm đèn dầu tân hôn
    secondaryAccent: 0xeab308, // Vàng rơm chiều quê
    bannerRed: 0xef4444,       // Đỏ cờ Việt Minh
    particleColor: 0xfde68a,   // Hạt bụi nắng chiều
    godRayColor: '#fed7aa',
    floorPatternColor: '#fb923c',
    altarWood: 0x3e2723,
    stonePedestal: 0x374151
  }
};

// Alias hỗ trợ cả UPPER_CASE
ROOM_PALETTES.TRUYEN_KIEU = ROOM_PALETTES.truyenKieu;
ROOM_PALETTES.SON_TINH_THUY_TINH = ROOM_PALETTES.sonTinhThuyTinh;
ROOM_PALETTES.AN_DUONG_VUONG = ROOM_PALETTES.anDuongVuong;
ROOM_PALETTES.VO_NHAT = ROOM_PALETTES.voNhat;

function getCachedCanvasTexture(key, w, h, drawFn) {
  if (BEAUTIFIER_CACHE[key]) return BEAUTIFIER_CACHE[key];
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, w, h);

  const tex = new THREE.CanvasTexture(canvas);
  if ('colorSpace' in tex && THREE.SRGBColorSpace) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  BEAUTIFIER_CACHE[key] = tex;
  return tex;
}

/**
 * KỸ NĂNG 1 & 5: CHUẨN HÓA MÔ HÌNH .GLB & TÔ MÀU SỐNG ĐỘNG
 * - Giữ nguyên độ nét của Texture gốc (SRGBColorSpace)
 * - Tự động hòa sắc bằng tintColor / color với độ chuẩn xác cao
 * - Căn chuẩn chiều cao theo trục Y (fitAxis: 'y'), căn tâm và ground đáy tại Y = 0
 */
export function styleAndNormalizeGlbModel(rootScene, {
  targetSpan = 3.4,
  fitAxis = 'y',
  color = null,
  tintColor = null,
  groundY = true,
  centerXZ = true,
  opacity = 1.0,
  castShadow = false,
  receiveShadow = false
} = {}) {
  if (!rootScene) return new THREE.Group();

  const effectiveTint = color || tintColor;

  rootScene.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = Boolean(castShadow);
    child.receiveShadow = Boolean(receiveShadow);
    child.frustumCulled = false;

    // Tách khỏi Raycaster mặc định để tránh click nhầm vào tượng/núi làm giật camera
    child.userData.ignoreRaycaster = true;

    // Quét làm sạch buffer hình học NaN/Infinity
    if (child.geometry) {
      const geo = child.geometry;
      const cleanAttr = (attr) => {
        if (!attr || !attr.array) return;
        const arr = attr.array;
        let dirty = false;
        for (let i = 0; i < arr.length; i++) {
          if (Number.isNaN(arr[i]) || !Number.isFinite(arr[i])) {
            arr[i] = 0;
            dirty = true;
          }
        }
        if (dirty) attr.needsUpdate = true;
      };
      if (geo.attributes.position) cleanAttr(geo.attributes.position);
      if (geo.attributes.normal) cleanAttr(geo.attributes.normal);
      if (geo.attributes.uv) cleanAttr(geo.attributes.uv);
      if (!geo.attributes.normal) geo.computeVertexNormals();
    }

    const hasVertexColors = Boolean(child.geometry && child.geometry.attributes.color);
    const origMats = Array.isArray(child.material) ? child.material : [child.material];

    const styledMats = origMats.map((mat) => {
      const tex = mat?.map || mat?.emissiveMap || null;
      if (tex) {
        if ('colorSpace' in tex && THREE.SRGBColorSpace) {
          tex.colorSpace = THREE.SRGBColorSpace;
        }
        tex.needsUpdate = true;
      }

      let baseColor;
      if (effectiveTint !== null && effectiveTint !== undefined) {
        baseColor = new THREE.Color(effectiveTint);
      } else if (tex) {
        baseColor = new THREE.Color(0xffffff);
      } else if (mat?.color) {
        baseColor = mat.color.clone();
      } else {
        baseColor = new THREE.Color(0xd4af37);
      }

      return new THREE.MeshBasicMaterial({
        map: tex,
        color: baseColor,
        vertexColors: hasVertexColors,
        transparent: Boolean(mat?.transparent) || opacity < 1.0,
        opacity: (mat?.opacity ?? 1.0) * opacity,
        side: THREE.DoubleSide,
        fog: false
      });
    });

    child.material = styledMats.length === 1 ? styledMats[0] : styledMats;
  });

  const wrapper = new THREE.Group();
  rootScene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(rootScene);
  const size = new THREE.Vector3();
  box.getSize(size);

  let refDim = Math.max(size.y, 0.001);
  if (fitAxis === 'maxHorizontal') {
    refDim = Math.max(size.x, size.z, 0.001);
  } else if (fitAxis === 'maxDim') {
    refDim = Math.max(size.x, size.y, size.z, 0.001);
  } else if (fitAxis === 'x') {
    refDim = Math.max(size.x, 0.001);
  } else if (fitAxis === 'z') {
    refDim = Math.max(size.z, 0.001);
  }

  const scale = targetSpan / refDim;
  rootScene.scale.multiplyScalar(scale);
  rootScene.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(rootScene);
  const scaledCenter = new THREE.Vector3();
  scaledBox.getCenter(scaledCenter);

  if (centerXZ) {
    rootScene.position.x -= scaledCenter.x;
    rootScene.position.z -= scaledCenter.z;
  }
  if (groundY) {
    rootScene.position.y -= scaledBox.min.y;
  }

  wrapper.add(rootScene);
  return wrapper;
}

/**
 * KỸ NĂNG 2 & 4: HỆ THỐNG HẠT CHI TIẾT BẰNG INSTANCED MESH (CHỈ 1 DRAW CALL)
 * Tạo 180 cánh hoa đào rơi / đom đóm / bọt sóng linh khí bay lượn mượt 60+ FPS
 */
export function createDetailedInstancedParticles(themeKey = 'truyenKieu', count = 180, spreadRadius = 24, maxHeight = 16) {
  const palette = ROOM_PALETTES[themeKey] || ROOM_PALETTES.truyenKieu;

  const petalTex = getCachedCanvasTexture(`particle_tex_${themeKey}`, 64, 64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    g.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    g.addColorStop(0.55, 'rgba(255, 240, 250, 0.85)');
    g.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w * 0.42, h * 0.28, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();
  });

  const geometry = new THREE.PlaneGeometry(0.24, 0.24);
  const material = new THREE.MeshBasicMaterial({
    map: petalTex,
    color: palette.particleColor,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true
  });

  const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
  instancedMesh.castShadow = false;
  instancedMesh.receiveShadow = false;
  instancedMesh.frustumCulled = false;

  const dummy = new THREE.Object3D();
  const particleState = [];

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * spreadRadius * 2;
    const y = Math.random() * maxHeight + 1.0;
    const z = (Math.random() - 0.5) * spreadRadius * 2;
    const scale = 0.65 + Math.random() * 0.85;

    dummy.position.set(x, y, z);
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);

    particleState.push({
      x, y, z, scale,
      baseX: x,
      baseZ: z,
      speedY: 0.015 + Math.random() * 0.025,
      swayAmp: 0.015 + Math.random() * 0.02,
      swayFreq: 0.9 + Math.random() * 1.6,
      rotSpeed: 0.018 + Math.random() * 0.03,
      phase: Math.random() * Math.PI * 2
    });
  }

  instancedMesh.instanceMatrix.needsUpdate = true;

  const update = (arg1, arg2) => {
    const timeSec = (typeof arg2 === 'number')
      ? arg2
      : (typeof arg1 === 'number' && arg1 > 1.0 ? arg1 : performance.now() * 0.001);

    for (let i = 0; i < count; i++) {
      const p = particleState[i];
      p.y -= p.speedY;
      p.x = p.baseX + Math.sin(timeSec * p.swayFreq + p.phase) * p.swayAmp * 15;
      p.z = p.baseZ + Math.cos(timeSec * (p.swayFreq * 0.8) + p.phase) * p.swayAmp * 12;

      if (p.y < 0.5) {
        p.y = maxHeight;
      }

      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.x += p.rotSpeed;
      dummy.rotation.y += p.rotSpeed * 0.8;
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;
  };

  const container = new THREE.Group();
  container.name = `InstancedParticles_${themeKey}`;
  container.add(instancedMesh);
  container.mesh = instancedMesh;
  container.update = update;
  return container;
}

/**
 * KỸ NĂNG 2: GIA CÔNG ĐÈN LỒNG LỤA PHÁT SÁNG BẰNG INSTANCED MESH
 * Trang trí trần phòng và lối đi với chi phí GPU cực thấp (1 Draw Call)
 */
export function createInstancedSilkLanterns(positions = [], lanternColor = 0xf472b6, coreColor = 0xfde047) {
  const count = positions.length;
  const group = new THREE.Group();
  if (count === 0) return group;

  const shellGeo = new THREE.CylinderGeometry(0.28, 0.24, 0.68, 12, 1);
  const shellMat = new THREE.MeshBasicMaterial({
    color: lanternColor,
    transparent: true,
    opacity: 0.90,
    fog: false
  });

  const coreGeo = new THREE.SphereGeometry(0.36, 10, 10);
  const coreMat = new THREE.MeshBasicMaterial({
    color: coreColor,
    transparent: true,
    opacity: 0.35,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    fog: false
  });

  const shellInstanced = new THREE.InstancedMesh(shellGeo, shellMat, count);
  const coreInstanced = new THREE.InstancedMesh(coreGeo, coreMat, count);

  const dummy = new THREE.Object3D();
  positions.forEach((pos, idx) => {
    dummy.position.set(pos[0] ?? pos.x, pos[1] ?? pos.y, pos[2] ?? pos.z);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1, 1, 1);
    dummy.updateMatrix();
    shellInstanced.setMatrixAt(idx, dummy.matrix);
    coreInstanced.setMatrixAt(idx, dummy.matrix);
  });

  shellInstanced.instanceMatrix.needsUpdate = true;
  coreInstanced.instanceMatrix.needsUpdate = true;

  group.add(shellInstanced, coreInstanced);
  group.update = (dt, timeSec) => {
    const t = (typeof timeSec === 'number') ? timeSec : performance.now() * 0.001;
    group.rotation.z = Math.sin(t * 1.5) * 0.02;
  };
  return group;
}

/**
 * KỸ NĂNG 2 & 1: THẢM MANDALA TRỐNG ĐỒNG & HOA SEN PHÁT SÁNG TRÊN SÀN
 */
export function createDetailedMandalaFloorDecal(themeKey = 'truyenKieu', radius = 4.5) {
  const palette = ROOM_PALETTES[themeKey] || ROOM_PALETTES.truyenKieu;

  const tex = getCachedCanvasTexture(`mandala_floor_${themeKey}`, 1024, 1024, (ctx, w, h) => {
    const cx = w / 2;
    const cy = h / 2;

    const bgGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, w * 0.48);
    bgGrad.addColorStop(0.0, 'rgba(253, 224, 71, 0.36)');
    bgGrad.addColorStop(0.55, 'rgba(244, 114, 182, 0.18)');
    bgGrad.addColorStop(1.0, 'rgba(0, 0, 0, 0.0)');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.48, 0, Math.PI * 2);
    ctx.fill();

    // Các vòng tròn đồng tâm kiểu Trống Đồng / Hoa Sen
    const rings = [0.15, 0.28, 0.39, 0.46];
    rings.forEach((rRatio, idx) => {
      ctx.strokeStyle = idx % 2 === 0 ? '#fde047' : palette.floorPatternColor;
      ctx.lineWidth = idx === 3 ? 6 : 3;
      ctx.beginPath();
      ctx.arc(cx, cy, w * rRatio, 0, Math.PI * 2);
      ctx.stroke();
    });

    // 16 cánh sen/tia mặt trời đối xứng
    const petals = 16;
    ctx.strokeStyle = '#fde047';
    ctx.lineWidth = 3;
    for (let i = 0; i < petals; i++) {
      const angle = (i / petals) * Math.PI * 2;
      const x1 = cx + Math.cos(angle) * (w * 0.15);
      const y1 = cy + Math.sin(angle) * (h * 0.15);
      const x2 = cx + Math.cos(angle) * (w * 0.45);
      const y2 = cy + Math.sin(angle) * (h * 0.45);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  });

  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(radius, 48),
    new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.03;
  return mesh;
}

/**
 * KỸ NĂNG 3: VÒM TRỜI SKYDOME ĐA SẮC & LUỒNG SÁNG GOD-RAYS THỂ TÍCH
 */
export function createArtisticSkyDomeAndGodRays(themeKey = 'truyenKieu', domeRadius = 260) {
  const palette = ROOM_PALETTES[themeKey] || ROOM_PALETTES.truyenKieu;
  const envGroup = new THREE.Group();

  const skyTex = getCachedCanvasTexture(`skydome_${themeKey}`, 512, 512, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0.0, palette.skyTop);
    g.addColorStop(0.55, palette.skyMid);
    g.addColorStop(1.0, palette.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Điểm xuyết 250 ngôi sao lấp lánh trên vòm trời
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 250; i++) {
      const sx = Math.random() * w;
      const sy = Math.random() * (h * 0.72);
      const sr = Math.random() * 1.6 + 0.4;
      ctx.globalAlpha = 0.35 + Math.random() * 0.65;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1.0;
  });

  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(domeRadius, 32, 24),
    new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false
    })
  );
  envGroup.add(skyDome);

  // Tạo chùm God-Rays trung tâm phát sáng thể tích
  const rayTex = getCachedCanvasTexture(`godray_tex_${themeKey}`, 64, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0.0, 'rgba(255, 255, 255, 0.85)');
    g.addColorStop(0.5, 'rgba(255, 255, 255, 0.35)');
    g.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

  const godRayMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 7.5, 28, 24, 1, true),
    new THREE.MeshBasicMaterial({
      map: rayTex,
      color: palette.godRayColor,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false
    })
  );
  godRayMesh.position.set(0, 14, 0);
  godRayMesh.frustumCulled = false;
  envGroup.add(godRayMesh);

  return envGroup;
}

/**
 * KỸ NĂNG 6: BỘ LỌC RAYCASTER AN TOÀN CHỐNG NHẢY CAMERA
 * Chỉ cho phép click vào đúng nhóm cổng/sách tương tác, bỏ qua địa hình & tượng
 */
export function intersectInteractiveTargetsOnly(raycaster, targetContainer) {
  if (!raycaster || !targetContainer) return [];

  let candidates = [];
  if (Array.isArray(targetContainer)) {
    candidates = targetContainer;
  } else if (targetContainer.isObject3D) {
    candidates = targetContainer.children || [targetContainer];
  }

  const hits = raycaster.intersectObjects(candidates, true);
  return hits.filter((hit) => {
    let curr = hit.object;
    while (curr) {
      if (curr.userData?.ignoreRaycaster) return false;
      if (
        curr.userData?.isReturnPortal ||
        curr.userData?.isTeleportBook ||
        curr.userData?.isInteractivePortal ||
        curr.userData?.isSonTinhTeleportBook ||
        curr.userData?.action
      ) {
        return true;
      }
      curr = curr.parent;
    }
    return false;
  });
}

/**
 * KỸ NĂNG 4: DỌN DẸP BỘ NHỚ VRAM TRIỆT ĐỂ KHI CHUYỂN PHÒNG
 */
export function disposeSceneBranch(rootNode) {
  if (!rootNode) return;
  rootNode.traverse((child) => {
    if (child.isMesh) {
      child.geometry?.dispose?.();
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m) => {
        if (!m) return;
        m.dispose?.();
        const texKeys = [
          'map', 'lightMap', 'bumpMap', 'normalMap',
          'specularMap', 'envMap', 'alphaMap', 'aoMap',
          'emissiveMap', 'roughnessMap', 'metalnessMap'
        ];
        texKeys.forEach((k) => {
          if (m[k] && typeof m[k].dispose === 'function') {
            m[k].dispose();
          }
        });
      });
    }
  });
  if (rootNode.parent) {
    rootNode.parent.remove(rootNode);
  }
}
