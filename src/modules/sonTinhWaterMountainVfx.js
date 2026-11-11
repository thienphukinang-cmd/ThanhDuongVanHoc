import * as THREE from 'three';
import {
  createCarvedHeritagePbrMaterial,
  createSculptedCloudScrollBracket3D
} from './museumReliefSculptor.js';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger.js';

/**
 * ============================================================================
 * ĐẠI CẢNH SƠN TINH - THỦY TINH ĐỘC LẬP (COLOSSAL MYTHIC WORLD EDITION)
 * Tích hợp trọn bộ 8 Skills:
 * - water-mountain-vfx-sculptor: Đại ngàn Tản Viên 9 đỉnh cao tới 85m, Thành lũy đá tự dâng
 * - pixel-retro-vfx: GLSL Bayer 4x4 Ordered Dithering cho Biển 340x280m & Đa Tầng Đại Sóng Thần 18-38m
 * - ornamental-relief-sculptor: Pháp trận Trống Đồng 14.5m, Cột đá lục giác chạm hoa văn
 * - shader-coloring-artist & environment-lighting-artist: Bầu trời Lưỡng Cực 420m, God-Rays & Sấm sét
 * - mesh-detailing-specialist & fps-optimizer: 600 hạt Mưa bão vs Linh khí (1 Draw Call, 60+ FPS)
 * - hitbox-collision-architect: Đài quan sát hoa sen & Vòng 12 Hitbox lan can vững chãi
 * ============================================================================
 */

export const SON_TINH_REALM_OFFSET = new THREE.Vector3(5000, 0, 5000);

// Giữ chuẩn vị trí đối đầu trực diện 76m giữa 2 vị thần
export const SON_TINH_LOCAL_POS = new THREE.Vector3(-38, 42.0, -16);
export const THUY_TINH_LOCAL_POS = new THREE.Vector3(38, 18.5, -16);
export const PLAYER_VIEWPOINT_LOCAL_POS = new THREE.Vector3(0, 37.7, 88.0);

/**
 * 1. DỌN SẠCH MỌI DẤU VẾT CỦA `nensontinhthuytinhglb.glb` & CÁC CHÓP ĐEN CŨ
 */
export function removeOldSonTinhBackgroundAndDarkCones(realmGroup) {
  if (!realmGroup) return;
  const toRemove = [];

  realmGroup.traverse((child) => {
    if (child === realmGroup) return;

    // Kiểm tra toàn bộ chuỗi cha: Nếu thuộc SonTinh_Mythic_World_Only_Vfx hoặc Hero Holder thì TUYỆT ĐỐI BẢO VỆ 100%
    let ancestor = child;
    let isProtected = false;
    while (ancestor) {
      if (
        ancestor.name === 'SonTinh_Mythic_World_Only_Vfx' ||
        ancestor.name === 'SonTinh_Mythic_Hero_Holder' ||
        ancestor.name === 'ThuyTinh_Mythic_Hero_Holder' ||
        ancestor.name === 'SonTinh_Model_Rotator' ||
        ancestor.name === 'ThuyTinh_Model_Rotator' ||
        ancestor.userData?.preserve
      ) {
        isProtected = true;
        break;
      }
      ancestor = ancestor.parent;
    }
    if (isProtected) return;

    const name = (child.name || '').toLowerCase();
    const src = (child.userData?.modelUrl || child.userData?.sourceFile || '').toLowerCase();

    // TUYỆT ĐỐI KHÔNG XÓA SƠN TINH / THỦY TINH
    if (name.includes('hero') || name.includes('sontinh') || name.includes('thuytinh')) {
      return;
    }
    if (
      name.includes('nensontinhthuytinh') ||
      src.includes('nensontinhthuytinh')
    ) {
      toRemove.push(child);
      return;
    }
    if (child.isMesh && child.geometry?.type === 'ConeGeometry') {
      const col = child.material?.color;
      if (col && col.r < 0.2 && col.g < 0.25 && child.position.x > -15) {
        toRemove.push(child);
      }
    }
  });

  toRemove.forEach((obj) => {
    obj.traverse((c) => {
      if (c.isMesh) {
        c.geometry?.dispose?.();
        if (Array.isArray(c.material)) c.material.forEach((m) => m?.dispose?.());
        else c.material?.dispose?.();
      }
    });
    obj.parent?.remove(obj);
  });
}

/**
 * HÀM PHỤ TRỢ: Tách vị trí 2 thần đối diện nhau 76m
 */
export function separateGodsAndCleanScene(realmGroup, sonTinhHolder = null, thuyTinhHolder = null) {
  if (sonTinhHolder) {
    sonTinhHolder.position.copy(SON_TINH_LOCAL_POS);
  }
  if (thuyTinhHolder) {
    thuyTinhHolder.position.copy(THUY_TINH_LOCAL_POS);
  }
}

/**
 * 2. BẦU TRỜI LƯỠNG CỰC PHÂN TRANH (SPLIT-SKY CELESTIAL DOME SHADER)
 * Bán kính 420m: Nửa Tây (X < 0) Hoàng Kim ấm áp | Nửa Đông (X > 0) Bão Đêm Lam Thẫm
 * Chính giữa: Vết nứt năng lượng thiên địa sấm chớp phát sáng
 */
function createColossalSplitSkyDome() {
  const geo = new THREE.SphereGeometry(420, 32, 20);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();
  const uniforms = {
    uTime: { value: 0 }
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      void main() {
        vWorldPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vWorldPos;

      void main() {
        vec3 dir = normalize(vWorldPos);
        float heightFactor = clamp(dir.y * 0.5 + 0.5, 0.0, 1.0);

        // Chuyển tiếp Đông - Tây quanh trục giao tranh
        float clashWave = sin(dir.z * 7.5 + uTime * 2.2) * 0.045;
        float eastWestMix = smoothstep(-0.25 + clashWave, 0.25 + clashWave, dir.x);

        // Nửa Tây (X < 0) - Hoàng Kim Sơn Thánh
        vec3 westHorizon = vec3(0.98, 0.62, 0.16);
        vec3 westMid     = vec3(0.72, 0.32, 0.08);
        vec3 westZenith  = vec3(0.24, 0.08, 0.03);
        vec3 westSky = mix(westHorizon, westMid, smoothstep(0.0, 0.5, heightFactor));
        westSky = mix(westSky, westZenith, smoothstep(0.5, 1.0, heightFactor));

        // Nửa Đông (X > 0) - Mây Bão Điện Quang Thủy Thần
        vec3 eastHorizon = vec3(0.04, 0.42, 0.75);
        vec3 eastMid     = vec3(0.02, 0.18, 0.42);
        vec3 eastZenith  = vec3(0.01, 0.04, 0.11);
        vec3 eastSky = mix(eastHorizon, eastMid, smoothstep(0.0, 0.5, heightFactor));
        eastSky = mix(eastSky, eastZenith, smoothstep(0.5, 1.0, heightFactor));

        vec3 baseSky = mix(westSky, eastSky, eastWestMix);

        // Vết nứt năng lượng thiên địa phát sáng ở chính giữa ranh giới 2 bầu trời
        float riftDist = abs(dir.x - (-0.02 + clashWave));
        float riftGlow = exp(-riftDist * 32.0) * smoothstep(0.08, 0.92, heightFactor);
        float riftPulse = 0.5 + 0.5 * sin(uTime * 9.0 + dir.y * 14.0);
        vec3 riftColor = mix(vec3(1.0, 0.92, 0.45), vec3(0.35, 0.90, 1.0), riftPulse);

        // Tia chớp điện quang chạy dọc theo vết nứt
        float lightningSpike = pow(max(0.0, sin(uTime * 14.0 + dir.y * 28.0)), 12.0) * 1.5;
        vec3 finalColor = baseSky + (riftColor * (riftGlow * 1.1 + lightningSpike * riftGlow));

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `
  });

  const skyMesh = new THREE.Mesh(geo, mat);
  skyMesh.userData.ignoreRaycaster = true;
  return {
    skyMesh,
    updateSky: (timeSec) => {
      uniforms.uTime.value = timeSec;
    }
  };
}

/**
 * 3. ĐẠI DƯƠNG PIXELFX BAYER DITHER (340x280m) & ĐA TẦNG ĐẠI SÓNG THẦN NHIỀU ĐỘ CAO TRƯỚC VÀ SAU (18-38M)
 */
function createColossalPixelFxOceanAndTsunamis() {
  const waterGroup = new THREE.Group();
  waterGroup.userData.ignoreRaycaster = true;

  const geo = new THREE.PlaneGeometry(340, 280, 48, 48);
  geo.rotateX(-Math.PI / 2);
  geo.computeBoundingBox();
  geo.computeBoundingSphere();

  const uniforms = {
    uTime: { value: 0 },
    uColorSteps: { value: 7.0 },
    uDeepBlue: { value: new THREE.Color(0x021024) },
    uMidCyan: { value: new THREE.Color(0x0284c7) },
    uCrestCyan: { value: new THREE.Color(0x38bdf8) },
    uFoamWhite: { value: new THREE.Color(0xf0f9ff) }
  };

  const oceanMat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    side: THREE.FrontSide,
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying float vHeight;
      varying float vClashIntensity;

      void main() {
        vec3 pos = position;

        // Thủy triều dâng cao dữ dội về phía Thủy Tinh (X > 0)
        float eastSurge = smoothstep(-28.0, 55.0, pos.x) * 4.8;
        float w1 = sin(pos.x * 0.13 + uTime * 3.6) * 1.65;
        float w2 = cos(pos.z * 0.11 + uTime * 2.7) * 1.10;
        float w3 = sin((pos.x - pos.z) * 0.22 + uTime * 4.8) * 0.65;

        // Cột sóng nổ tung khi va vào Thành Lũy Đá Thần tại X = -15.5
        float impactZone = exp(-pow((pos.x + 15.5) * 0.16, 2.0));
        float clashSpike = impactZone * (3.8 + sin(uTime * 6.5 + pos.z * 0.25) * 1.8);

        pos.y += w1 + w2 + w3 + eastSurge + clashSpike;
        vHeight = pos.y;
        vClashIntensity = impactZone;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uColorSteps;
      uniform vec3 uDeepBlue;
      uniform vec3 uMidCyan;
      uniform vec3 uCrestCyan;
      uniform vec3 uFoamWhite;
      varying float vHeight;
      varying float vClashIntensity;

      float bayer4x4(vec2 p) {
        int x = int(mod(p.x, 4.0));
        int y = int(mod(p.y, 4.0));
        int idx = x + y * 4;
        float m[16];
        m[0]=0.0;  m[1]=8.0;  m[2]=2.0;  m[3]=10.0;
        m[4]=12.0; m[5]=4.0;  m[6]=14.0; m[7]=6.0;
        m[8]=3.0;  m[9]=11.0; m[10]=1.0; m[11]=9.0;
        m[12]=15.0;m[13]=7.0; m[14]=13.0;m[15]=5.0;
        for (int i = 0; i < 16; i++) {
          if (i == idx) return (m[i] + 0.5) / 16.0;
        }
        return 0.5;
      }

      void main() {
        float hNorm = clamp((vHeight + 2.5) / 10.5, 0.0, 1.0);
        float dither = (bayer4x4(gl_FragCoord.xy * 0.5) - 0.5) / uColorSteps;
        float q = floor((hNorm + dither) * uColorSteps) / uColorSteps;

        vec3 waterCol = mix(uDeepBlue, uMidCyan, clamp(q * 1.4, 0.0, 1.0));
        waterCol = mix(waterCol, uCrestCyan, smoothstep(0.45, 0.85, q));

        float foamMask = step(0.64, hNorm + vClashIntensity * 0.35 + dither * 1.3);
        vec3 finalCol = mix(waterCol, uFoamWhite, foamMask * 0.95);

        gl_FragColor = vec4(finalCol, 0.96);
      }
    `
  });

  const oceanMesh = new THREE.Mesh(geo, oceanMat);
  oceanMesh.position.set(0, 14.0, -16);
  oceanMesh.userData.ignoreRaycaster = true;
  waterGroup.add(oceanMesh);

  // ĐẠI SÓNG THẦN ĐA TẦNG VỚI NHIỀU ĐỘ CAO KHÁC NHAU (18M - 38M) BỐ TRÍ TRƯỚC, GIỮA VÀ SAU THỦY TINH
  const tsunamiConfigs = [
    // --- LỚP SÓNG TIỀN TIÊU (Trước mặt Thủy Tinh, dồn dập lao về phía núi Tản Viên) ---
    {
      x: 14, y: 18.0, z: -16, radius: 12, len: 82, rotZ: Math.PI * 0.63,
      deep: 0x024a7a, mid: 0x0284c7, crest: 0x38bdf8, opacity: 0.82, speed: 2.8, amp: 1.4, phase: 0.0
    },
    {
      x: 26, y: 22.5, z: -18, radius: 15, len: 98, rotZ: Math.PI * 0.65,
      deep: 0x0284c7, mid: 0x38bdf8, crest: 0x7dd3fc, opacity: 0.78, speed: 2.5, amp: 1.6, phase: 1.2
    },

    // --- LỚP SÓNG TRUNG TÂM (Cuộn trào quanh đài ngự Thủy Tinh tại X = 38) ---
    {
      x: 38, y: 27.0, z: -16, radius: 18, len: 115, rotZ: Math.PI * 0.66,
      deep: 0x013860, mid: 0x0284c7, crest: 0x38bdf8, opacity: 0.74, speed: 2.2, amp: 1.8, phase: 2.4
    },
    {
      x: 36, y: 24.5, z: -48, radius: 14, len: 86, rotZ: Math.PI * 0.65,
      deep: 0x024a7a, mid: 0x0284c7, crest: 0x38bdf8, opacity: 0.68, speed: 2.3, amp: 1.5, phase: 3.1
    },
    {
      x: 36, y: 21.0, z: 16,  radius: 13, len: 82, rotZ: Math.PI * 0.67,
      deep: 0x024a7a, mid: 0x0284c7, crest: 0x38bdf8, opacity: 0.68, speed: 2.1, amp: 1.3, phase: 4.0
    },

    // --- LỚP ĐẠI SÓNG THẦN HẬU PHƯƠNG (3 tầng cao ngất trời phía sau Thủy Tinh, cao tới 38m) ---
    {
      x: 50, y: 31.0, z: -16, radius: 21, len: 130, rotZ: Math.PI * 0.66,
      deep: 0x012040, mid: 0x0284c7, crest: 0x38bdf8, opacity: 0.65, speed: 1.9, amp: 2.0, phase: 0.8
    },
    {
      // ĐẠI SÓNG THẦN CAO NHẤT: 38.0M CHỌC TRỜI
      x: 66, y: 38.0, z: -16, radius: 27, len: 160, rotZ: Math.PI * 0.67,
      deep: 0x00162e, mid: 0x0369a1, crest: 0x38bdf8, opacity: 0.58, speed: 1.5, amp: 2.5, phase: 1.9
    },
    {
      x: 84, y: 34.0, z: -20, radius: 31, len: 180, rotZ: Math.PI * 0.68,
      deep: 0x000e1f, mid: 0x024a7a, crest: 0x0284c7, opacity: 0.52, speed: 1.2, amp: 2.2, phase: 2.7
    }
  ];

  const tsunamiWaveMeshes = [];

  tsunamiConfigs.forEach((cfg) => {
    const tGeo = new THREE.CylinderGeometry(cfg.radius, cfg.radius, cfg.len, 20, 1, true, 0, Math.PI * 0.88);
    tGeo.rotateX(Math.PI / 2);
    tGeo.computeBoundingBox();
    tGeo.computeBoundingSphere();

    const waveUniforms = {
      uTime: { value: 0 },
      uSpeed: { value: cfg.speed },
      uColorSteps: { value: 6.0 },
      uDeep: { value: new THREE.Color(cfg.deep) },
      uMid: { value: new THREE.Color(cfg.mid) },
      uCrest: { value: new THREE.Color(cfg.crest) },
      uFoam: { value: new THREE.Color(0xf0fdf4) },
      uOpacity: { value: cfg.opacity }
    };

    const waveMat = new THREE.ShaderMaterial({
      uniforms: waveUniforms,
      transparent: true,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        uniform float uTime;
        uniform float uSpeed;

        void main() {
          vUv = uv;
          vec3 pos = position;
          // Hiệu ứng sóng cuộn mép nước nhấp nhô
          float curl = sin(pos.y * 0.12 + uTime * (uSpeed * 0.8)) * 0.85;
          pos.z += curl;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float uTime;
        uniform float uColorSteps;
        uniform vec3 uDeep;
        uniform vec3 uMid;
        uniform vec3 uCrest;
        uniform vec3 uFoam;
        uniform float uOpacity;
        varying vec2 vUv;

        float bayer4x4(vec2 p) {
          int x = int(mod(p.x, 4.0));
          int y = int(mod(p.y, 4.0));
          int idx = x + y * 4;
          float m[16];
          m[0]=0.0;  m[1]=8.0;  m[2]=2.0;  m[3]=10.0;
          m[4]=12.0; m[5]=4.0;  m[6]=14.0; m[7]=6.0;
          m[8]=3.0;  m[9]=11.0; m[10]=1.0; m[11]=9.0;
          m[12]=15.0;m[13]=7.0; m[14]=13.0;m[15]=5.0;
          for (int i = 0; i < 16; i++) {
            if (i == idx) return (m[i] + 0.5) / 16.0;
          }
          return 0.5;
        }

        void main() {
          float dither = (bayer4x4(gl_FragCoord.xy * 0.5) - 0.5) / uColorSteps;
          float q = floor((vUv.y + dither * 0.35) * uColorSteps) / uColorSteps;

          vec3 col = mix(uDeep, uMid, smoothstep(0.0, 0.45, q));
          col = mix(col, uCrest, smoothstep(0.45, 0.85, q));

          // Bọt sóng trắng xóa cuộn trào trên đỉnh sóng
          float foamLine = step(0.76, vUv.y + sin(vUv.x * 32.0 + uTime * 4.2) * 0.08 + dither * 0.35);
          col = mix(col, uFoam, foamLine * 0.95);

          gl_FragColor = vec4(col, uOpacity);
        }
      `
    });

    const tMesh = new THREE.Mesh(tGeo, waveMat);
    tMesh.position.set(cfg.x, cfg.y, cfg.z);
    tMesh.rotation.z = cfg.rotZ;
    tMesh.userData = {
      ignoreRaycaster: true,
      baseY: cfg.y,
      baseRotZ: cfg.rotZ,
      speed: cfg.speed,
      amp: cfg.amp,
      phase: cfg.phase,
      uniforms: waveUniforms
    };
    waterGroup.add(tMesh);
    tsunamiWaveMeshes.push(tMesh);
  });

  const updateOcean = (timeSec) => {
    uniforms.uTime.value = timeSec;
    tsunamiWaveMeshes.forEach((m) => {
      m.userData.uniforms.uTime.value = timeSec;
      const waveOffset = Math.sin(timeSec * m.userData.speed + m.userData.phase);
      m.position.y = m.userData.baseY + waveOffset * m.userData.amp;
      m.rotation.z = m.userData.baseRotZ + Math.cos(timeSec * (m.userData.speed * 0.7) + m.userData.phase) * 0.04;
    });
  };

  return { waterGroup, updateOcean };
}

/**
 * 4. ĐẠI NGÀN TẢN VIÊN 9 ĐỈNH (CAO 85M), THÁC NƯỚC ĐỔ, THÀNH LŨY 24 CỘT ĐÁ & ĐÀI QUAN SÁT
 */
function createColossalMountainsBarricadeAndDeck(hitboxManager = null, worldOffset = new THREE.Vector3()) {
  const terrainGroup = new THREE.Group();
  terrainGroup.userData.ignoreRaycaster = true;

  // Vật liệu đá núi chạm khắc Sobel Normal Map 3D phong cách Đông Sơn
  const cliffMat = createCarvedHeritagePbrMaterial('dongSon', 8, 5);
  cliffMat.color = new THREE.Color(0x855e3c);
  cliffMat.emissive = new THREE.Color(0x361e0d);
  cliffMat.emissiveIntensity = 0.58;
  cliffMat.roughness = 0.52;

  // Quần thể 9 đỉnh núi đồ sộ bao bọc quanh Sơn Tinh (-38, 42, -16) và vươn cao 85m ở hậu cảnh
  const colossalPeaks = [
    { rt: 5.2, rb: 25, h: 42.0, pos: [-38, 21.0, -16] },  // Đỉnh chính nơi Sơn Tinh ngự trị (Y = 42m)
    { rt: 3.0, rb: 19, h: 35.0, pos: [-24, 17.5, -22] },  // Sườn núi tiền tiêu chắn sóng
    { rt: 4.2, rb: 23, h: 40.0, pos: [-52, 20.0, -20] },  // Đỉnh Tản Viên Tây
    { rt: 2.8, rb: 17, h: 30.0, pos: [-29, 15.0, -4] },   // Vách đá Nam
    { rt: 7.5, rb: 42, h: 68.0, pos: [-56, 34.0, -48] },  // Đại đỉnh Ba Vì tầng 2 (Y = 68m)
    { rt: 9.0, rb: 52, h: 85.0, pos: [-78, 42.5, -36] },  // Đỉnh Tổ Sơn khổng lồ hậu cảnh (Y = 85m)
    { rt: 6.0, rb: 36, h: 60.0, pos: [-42, 30.0, -68] },  // Dãy núi Bắc
    { rt: 5.5, rb: 32, h: 54.0, pos: [-68, 27.0, 8] },    // Dãy núi Tây Nam
    { rt: 4.0, rb: 24, h: 44.0, pos: [-22, 22.0, -48] }   // Vách đá kẹp sườn
  ];

  const peaksGroup = new THREE.Group();
  peaksGroup.name = 'Colossal_TanVien_Peaks_Merged';
  colossalPeaks.forEach((p) => {
    const geo = new THREE.CylinderGeometry(p.rt, p.rb, p.h, 10, 4);
    const mesh = new THREE.Mesh(geo, cliffMat);
    mesh.position.set(...p.pos);
    mesh.userData.ignoreRaycaster = true;
    peaksGroup.add(mesh);
  });
  mergeGroupMeshesByMaterial(peaksGroup);
  terrainGroup.add(peaksGroup);

  // THÁC NƯỚC THẦN ĐỔ TỪ ĐỈNH TẢN VIÊN XUỐNG ĐẠI DƯƠNG (ANIMATED WATERFALL)
  const waterfallUniforms = { uTime: { value: 0 } };
  const waterfallMat = new THREE.ShaderMaterial({
    uniforms: waterfallUniforms,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float flow = fract(vUv.y * 5.0 + uTime * 2.8);
        float streak = smoothstep(0.15, 0.85, sin(vUv.x * 24.0) * 0.5 + 0.5);
        float alpha = (0.35 + 0.65 * flow) * streak * smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
        vec3 col = mix(vec3(0.22, 0.75, 0.98), vec3(0.98, 0.92, 0.55), vUv.y);
        gl_FragColor = vec4(col, alpha * 0.78);
      }
    `
  });

  const waterfallMesh = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 28.0, 8, 16), waterfallMat);
  waterfallMesh.position.set(-28.5, 27.5, -14.0);
  waterfallMesh.rotation.y = Math.PI * 0.38;
  waterfallMesh.rotation.x = -0.22;
  waterfallMesh.userData.ignoreRaycaster = true;
  terrainGroup.add(waterfallMesh);

  // THÀNH LŨY 24 CỘT ĐÁ LỤC GIÁC TỰ DÂNG CAO CHẮN SÓNG ("Nước dâng bao nhiêu, núi cao bấy nhiêu")
  const pillarCount = 24;
  const pillarGeo = new THREE.CylinderGeometry(1.15, 1.35, 22.0, 6);
  pillarGeo.computeBoundingSphere();
  const pillarMat = createCarvedHeritagePbrMaterial('lotusGold', 2, 4);
  const risingBarricade = new THREE.InstancedMesh(pillarGeo, pillarMat, pillarCount);
  risingBarricade.userData.ignoreRaycaster = true;
  risingBarricade.frustumCulled = true;
  risingBarricade.boundingSphere = new THREE.Sphere(new THREE.Vector3(-15.5, 15, -13), 50);
  terrainGroup.add(risingBarricade);

  // 36 TẢNG ĐÁ THẦN LỰC HOÀNG KIM BAY XOAY VÒNG QUANH ĐỈNH NÚI SƠN TINH
  const rockCount = 36;
  const rockGeo = new THREE.DodecahedronGeometry(1.55, 0);
  rockGeo.computeBoundingSphere();
  const floatingRocks = new THREE.InstancedMesh(
    rockGeo,
    new THREE.MeshBasicMaterial({ color: 0xfbbf24 }),
    rockCount
  );
  floatingRocks.userData.ignoreRaycaster = true;
  floatingRocks.frustumCulled = true;
  floatingRocks.boundingSphere = new THREE.Sphere(SON_TINH_LOCAL_POS.clone(), 45);
  terrainGroup.add(floatingRocks);

  const dummy = new THREE.Object3D();

  // ĐÀI QUAN SÁT ĐÁ CỔ CHẠM HOA SEN (Tọa độ: 0, 22.5, 28)
  const lotusMat = createCarvedHeritagePbrMaterial('lotusGold', 4, 2);
  const deckGroup = new THREE.Group();
  deckGroup.position.set(0, 36.0, 88.0);

  const deckFloor = new THREE.Mesh(
    new THREE.CylinderGeometry(8.0, 9.5, 2.5, 16),
    lotusMat
  );
  deckFloor.position.y = -1.25;
  deckGroup.add(deckFloor);

  // 12 Đầu dư vân mây chạm lộng 3D quanh lan can đài -> gộp mesh
  const bracketsGroup = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    const bracket = createSculptedCloudScrollBracket3D({ scale: 0.65 });
    bracket.position.set(Math.cos(ang) * 7.5, 0.45, Math.sin(ang) * 7.5);
    bracket.rotation.y = -ang;
    bracketsGroup.add(bracket);
  }
  mergeGroupMeshesByMaterial(bracketsGroup);
  deckGroup.add(bracketsGroup);
  terrainGroup.add(deckGroup);

  // ĐĂNG KÝ VÒNG 12 HITBOX LAN CAN BAO QUANH ĐÀI QUAN SÁT (Bán kính 7.8m, cao 3m)
  // Tuyệt đối không đặt khối hộp đặc chắn mặt sàn để tránh kẹt chân người chơi
  if (hitboxManager) {
    const deckWorldCenter = new THREE.Vector3(0, 36.0, 88.0).add(worldOffset);
    const numRailingSegments = 12;
    const railingRadius = 7.8;
    for (let i = 0; i < numRailingSegments; i++) {
      const angle = (i / numRailingSegments) * Math.PI * 2;
      const segPos = new THREE.Vector3(
        deckWorldCenter.x + Math.cos(angle) * railingRadius,
        deckWorldCenter.y + 1.2,
        deckWorldCenter.z + Math.sin(angle) * railingRadius
      );
      const segBox = new THREE.Box3().setFromCenterAndSize(
        segPos,
        new THREE.Vector3(2.8, 2.4, 2.8)
      );
      hitboxManager.registerSolidObjectCollider(null, {
        customBox: segBox,
        tag: `SonTinh_Deck_Railing_${i}`
      });
    }
  }

  const updateTerrainVfx = (timeSec) => {
    waterfallUniforms.uTime.value = timeSec;

    // Cập nhật 24 cột đá thành lũy tự dâng cao theo nhịp sóng thần tại X = -15.5
    for (let i = 0; i < pillarCount; i++) {
      const zPos = -52 + i * 3.4;
      const surgeHeight = 14.5 + Math.sin(timeSec * 3.2 + i * 0.45) * 3.8;
      dummy.position.set(-15.5 + Math.sin(i * 0.8) * 1.8, surgeHeight, zPos);
      dummy.rotation.set(0, i * 0.5, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      risingBarricade.setMatrixAt(i, dummy.matrix);
    }
    risingBarricade.instanceMatrix.needsUpdate = true;

    // Cập nhật 36 tảng đá thần xoay quanh Sơn Tinh
    for (let i = 0; i < rockCount; i++) {
      const ring = i % 3;
      const radius = 9.0 + ring * 6.5;
      const speed = 0.45 - ring * 0.08;
      const angle = (i / rockCount) * Math.PI * 2 + timeSec * speed;
      const yPos = 26.0 + ring * 6.5 + Math.sin(timeSec * 2.4 + i) * 1.8;

      dummy.position.set(
        SON_TINH_LOCAL_POS.x + Math.cos(angle) * radius,
        yPos,
        SON_TINH_LOCAL_POS.z + Math.sin(angle) * radius
      );
      dummy.rotation.set(timeSec * 0.9, timeSec * 0.7, i);
      const s = 0.75 + (i % 4) * 0.25;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      floatingRocks.setMatrixAt(i, dummy.matrix);
    }
    floatingRocks.instanceMatrix.needsUpdate = true;
  };

  return { terrainGroup, updateTerrainVfx, deckGroup };
}

/**
 * 5. PHÁP TRẬN TRỐNG ĐỒNG 14.5M, PHÁP TRẬN HẢI TRIỀU 14.5M, GOD-RAYS & 600 HẠT BÃO TỐ ĐỐI ĐẦU
 */
function createColossalSealsLightningAndStormParticles() {
  const fxGroup = new THREE.Group();
  fxGroup.userData.ignoreRaycaster = true;

  // --- A. PHÁP TRẬN TRỐNG ĐỒNG MẶT TRỜI ĐÔNG SƠN KHỔNG LỒ (BÁN KÍNH 14.5M) SAU LƯNG SƠN TINH ---
  const sonTinhMandalaGroup = new THREE.Group();
  sonTinhMandalaGroup.position.copy(SON_TINH_LOCAL_POS).add(new THREE.Vector3(-4.5, 6.0, 0));
  sonTinhMandalaGroup.rotation.y = Math.PI / 2;

  // Vành nhật quang ngoài cùng (Bán kính 14.5m)
  const outerDongSonRim = new THREE.Mesh(
    new THREE.RingGeometry(13.2, 14.5, 64),
    new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    })
  );

  // Vành trung tâm: 14 Tia sáng Mặt Trời Đông Sơn rực rỡ (merged 14 -> 1 DC)
  const sunRayRing = new THREE.Group();
  const rayCount = 14;
  const sharedRayGeo = new THREE.ConeGeometry(0.75, 4.2, 3);
  const rayMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
  for (let r = 0; r < rayCount; r++) {
    const angle = (r / rayCount) * Math.PI * 2;
    const rayMesh = new THREE.Mesh(sharedRayGeo, rayMat);
    rayMesh.position.set(Math.cos(angle) * 9.5, Math.sin(angle) * 9.5, 0);
    rayMesh.rotation.z = angle - Math.PI / 2;
    sunRayRing.add(rayMesh);
  }
  mergeGroupMeshesByMaterial(sunRayRing);
  sharedRayGeo.dispose();

  // Vành tâm trống đồng (Bán kính 6.8m)
  const innerDongSonCore = new THREE.Mesh(
    new THREE.RingGeometry(5.2, 6.8, 48),
    new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.82,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    })
  );

  // Tâm phát quang Thái Dương
  const sunCenterGlow = new THREE.Mesh(
    new THREE.CircleGeometry(3.6, 32),
    new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    })
  );

  sonTinhMandalaGroup.add(outerDongSonRim, sunRayRing, innerDongSonCore, sunCenterGlow);
  fxGroup.add(sonTinhMandalaGroup);

  // --- B. PHÁP TRẬN HẢI TRIỀU SÓNG THẦN KHỔNG LỒ (BÁN KÍNH 14.5M) SAU LƯNG THỦY TINH ---
  const thuyTinhMandalaGroup = new THREE.Group();
  thuyTinhMandalaGroup.position.copy(THUY_TINH_LOCAL_POS).add(new THREE.Vector3(4.5, 6.0, 0));
  thuyTinhMandalaGroup.rotation.y = -Math.PI / 2;

  // Vành thủy triều ngoài cùng (Bán kính 14.5m)
  const outerTidalRim = new THREE.Mesh(
    new THREE.RingGeometry(13.0, 14.5, 64),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    })
  );

  // 8 Dải xoáy Sóng Thủy Ba cuộn tròn (merged 8 -> 1 DC)
  const waveSpirals = new THREE.Group();
  const spiralCount = 8;
  const sMat = new THREE.MeshBasicMaterial({
    color: 0x0284c7,
    transparent: true,
    opacity: 0.78,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide
  });
  for (let s = 0; s < spiralCount; s++) {
    const angle = (s / spiralCount) * Math.PI * 2;
    const sGeo = new THREE.RingGeometry(7.2, 9.8, 16, 1, angle, Math.PI * 0.32);
    const sMesh = new THREE.Mesh(sGeo, sMat);
    waveSpirals.add(sMesh);
  }
  mergeGroupMeshesByMaterial(waveSpirals);

  // Tâm cuộn xoáy hải triều
  const innerVortex = new THREE.Mesh(
    new THREE.RingGeometry(4.2, 5.8, 40),
    new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    })
  );

  thuyTinhMandalaGroup.add(outerTidalRim, waveSpirals, innerVortex);
  fxGroup.add(thuyTinhMandalaGroup);

  // --- C. CỘT SÁNG THIÊN ĐỊA (GOD-RAYS) CHIẾU XUỐNG SƠN TINH ---
  const sonTinhBeam = new THREE.Mesh(
    new THREE.CylinderGeometry(3.5, 12.0, 85, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  sonTinhBeam.position.set(SON_TINH_LOCAL_POS.x, SON_TINH_LOCAL_POS.y + 26, SON_TINH_LOCAL_POS.z);
  fxGroup.add(sonTinhBeam);

  // Đèn chiếu điểm cường độ cao cho 2 vị thần
  const sonTinhLight = new THREE.PointLight(0xfde047, 6.0, 70);
  sonTinhLight.position.copy(SON_TINH_LOCAL_POS).add(new THREE.Vector3(4, 7, 5));
  fxGroup.add(sonTinhLight);

  const thuyTinhLight = new THREE.PointLight(0x38bdf8, 6.5, 70);
  thuyTinhLight.position.copy(THUY_TINH_LOCAL_POS).add(new THREE.Vector3(-4, 7, 5));
  fxGroup.add(thuyTinhLight);

  // --- D. CHÙM 3 TIA SẤM SÉT ĐẠI DƯƠNG GIÁNG XUỐNG BẦU TRỜI THỦY TINH ---
  const lightningBolts = [];
  for (let b = 0; b < 3; b++) {
    const pts = [];
    let cy = 98;
    let cx = THUY_TINH_LOCAL_POS.x + (b - 1) * 14;
    let cz = THUY_TINH_LOCAL_POS.z - 8 + b * 6;
    for (let i = 0; i < 15; i++) {
      pts.push(new THREE.Vector3(cx, cy, cz));
      cy -= 5.4;
      cx += (Math.random() - 0.5) * 6.5;
      cz += (Math.random() - 0.5) * 4.5;
    }
    const bolt = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: 0xe0f2fe, linewidth: 2 })
    );
    fxGroup.add(bolt);
    lightningBolts.push(bolt);
  }

  // --- E. HỆ THỐNG 600 HẠT MƯA BÃO XIÊN GIÓ & TINH THỂ LINH KHÍ ĐỐI ĐẦU (1 DRAW CALL) ---
  const particleCount = 600;
  const pGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);

  const goldCol = new THREE.Color(0xfde047);
  const cyanCol = new THREE.Color(0x7dd3fc);

  for (let i = 0; i < particleCount; i++) {
    const isWestSide = i < particleCount * 0.45;
    positions[i * 3]     = isWestSide ? -65 + Math.random() * 52 : -12 + Math.random() * 85;
    positions[i * 3 + 1] = 15 + Math.random() * 70;
    positions[i * 3 + 2] = -60 + Math.random() * 90;

    const c = isWestSide ? goldCol : cyanCol;
    colors[i * 3]     = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  pGeo.boundingBox = new THREE.Box3(
    new THREE.Vector3(-75, 10, -70),
    new THREE.Vector3(95, 90, 40)
  );
  pGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(10, 50, -15), 115);

  const pMat = new THREE.PointsMaterial({
    size: 0.92,
    vertexColors: true,
    transparent: true,
    opacity: 0.88,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const stormParticles = new THREE.Points(pGeo, pMat);
  stormParticles.frustumCulled = true;
  stormParticles.userData.ignoreRaycaster = true;
  fxGroup.add(stormParticles);

  const updateFx = (timeSec) => {
    // Pháp trận xoay vòng ngược chiều nhau
    sonTinhMandalaGroup.rotation.z = timeSec * 0.55;
    thuyTinhMandalaGroup.rotation.z = -timeSec * 0.75;

    // Sấm sét giáng xuống theo chu kỳ chớp lóe
    lightningBolts.forEach((bolt, idx) => {
      bolt.visible = Math.sin(timeSec * (18.0 + idx * 5.0) + idx * 2.2) > 0.55;
    });

    // Chuyển động đối kháng: Linh khí vàng bay lên ở cánh Tây, mưa bão lao xiên từ Đông sang Tây
    const pos = pGeo.attributes.position;
    const half = Math.floor(particleCount * 0.45);
    for (let i = 0; i < particleCount; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      if (i < half) {
        // Hạt thần lực Sơn Tinh bay vút lên trời
        y += 0.18;
        if (y > 82) y = 16;
      } else {
        // Mưa bão Thủy Tinh quất xiên mạnh về phía vách núi Tản Viên
        x -= 0.58;
        y -= 0.36;
        if (x < -16 || y < 14) {
          x = 65 + Math.random() * 25;
          y = 60 + Math.random() * 25;
        }
      }
      pos.setX(i, x);
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  };

  return { fxGroup, updateFx };
}

/**
 * 6. HÀM KHỞI TẠO TỔNG THỂ THẾ GIỚI SƠN TINH - THỦY TINH ĐỘC LẬP (COLOSSAL EDITION)
 */
export function buildSonTinhThuyTinhMasterVfx(targetRealmGroup, {
  sonTinhModel = null,
  thuyTinhModel = null,
  hitboxManager = null,
  moveRealmToSeparateOffset = true
} = {}) {
  if (!targetRealmGroup) return { roomGroup: null, updateRealm: () => {}, deckGroup: null };

  // 1. Dọn sạch tàn dư nền cũ nensontinhthuytinh & chóp đen lỗi (nếu có)
  removeOldSonTinhBackgroundAndDarkCones(targetRealmGroup);

  // Nếu đã tồn tại instance vfx cũ thì dọn sạch instance đó trước khi dựng mới
  const existingVfx = targetRealmGroup.getObjectByName('SonTinh_Mythic_World_Only_Vfx');
  if (existingVfx) {
    targetRealmGroup.remove(existingVfx);
  }

  // 2. Đặt Thế Giới Sơn Tinh - Thủy Tinh ở tọa độ riêng biệt (5000, 0, 5000) - KHÔNG DỜI NẾU LÀ SCENE
  if (moveRealmToSeparateOffset && !targetRealmGroup.isScene) {
    targetRealmGroup.position.copy(SON_TINH_REALM_OFFSET);
  }

  // 3. Đặt chuẩn vị trí Sơn Tinh (-38, 42, -16) & Thủy Tinh (+38, 18.5, -16) cách xa 76m
  if (sonTinhModel) {
    sonTinhModel.position.copy(SON_TINH_LOCAL_POS);
    sonTinhModel.rotation.set(0, Math.PI / 2, 0);
  }
  if (thuyTinhModel) {
    thuyTinhModel.position.copy(THUY_TINH_LOCAL_POS);
    thuyTinhModel.rotation.set(0, -Math.PI / 2, 0);
  }

  const masterGroup = new THREE.Group();
  masterGroup.name = 'SonTinh_Mythic_World_Only_Vfx';
  masterGroup.userData.ignoreRaycaster = true;

  // 4. Lắp ghép 4 tầng hiệu ứng đại cảnh đồ sộ
  const { skyMesh, updateSky } = createColossalSplitSkyDome();
  const { terrainGroup, updateTerrainVfx, deckGroup } = createColossalMountainsBarricadeAndDeck(
    hitboxManager,
    targetRealmGroup.position
  );
  const { waterGroup, updateOcean } = createColossalPixelFxOceanAndTsunamis();
  const { fxGroup, updateFx } = createColossalSealsLightningAndStormParticles();

  masterGroup.add(skyMesh);
  masterGroup.add(terrainGroup);
  masterGroup.add(waterGroup);
  masterGroup.add(fxGroup);

  targetRealmGroup.add(masterGroup);

  const updateRealm = (timeSec = performance.now() * 0.001) => {
    if (!targetRealmGroup.visible) return;
    updateSky(timeSec);
    updateTerrainVfx(timeSec);
    updateOcean(timeSec);
    updateFx(timeSec);
  };

  return {
    roomGroup: masterGroup,
    updateRealm,
    deckGroup,
    getPlayerSpawnWorldPosition: () =>
      PLAYER_VIEWPOINT_LOCAL_POS.clone().add(targetRealmGroup.position)
  };
}
