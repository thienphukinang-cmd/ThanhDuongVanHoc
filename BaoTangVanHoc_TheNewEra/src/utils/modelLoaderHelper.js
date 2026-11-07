import * as THREE from 'three';

/**
 * MODULE CHUẨN HÓA VÀ NẠP MÔ HÌNH 3D (.GLB/.GLTF) CHO BẢO TÀNG 3D
 * Lead Architect & WebGL Tech Lead
 * 
 * Đáp ứng toàn diện các tiêu chuẩn:
 * 1. Chuẩn hóa tỷ lệ mét (targetSpan, fitAxis: 'y'|'maxDim'|'maxHorizontal').
 * 2. Căn tâm bounding box và ground đáy tại Y = 0 (tránh chìm sàn / bay lơ lửng).
 * 3. Tối ưu 60+ FPS: Tắt castShadow/receiveShadow nếu không cần thiết, bật frustumCulled.
 * 4. Chế độ vật liệu rực rỡ (MeshBasicMaterial hoặc SRGBColorSpace StandardMaterial).
 * 5. Self-Healing & An toàn WebGL: Quét và triệt tiêu NaN/Infinity ở Position & Normal buffer.
 */

/**
 * Quét và làm sạch buffer hình học để triệt tiêu NaN / Infinity (tránh lỗi đen màn hình WebGL)
 */
export function sanitizeGeometryBuffers(geometry) {
  if (!geometry || !geometry.attributes) return;

  const checkAndCleanBuffer = (attr) => {
    if (!attr || !attr.array) return;
    const arr = attr.array;
    let corrupted = false;
    for (let i = 0; i < arr.length; i++) {
      if (Number.isNaN(arr[i]) || !Number.isFinite(arr[i])) {
        arr[i] = 0;
        corrupted = true;
      }
    }
    if (corrupted) {
      attr.needsUpdate = true;
    }
  };

  checkAndCleanBuffer(geometry.attributes.position);
  checkAndCleanBuffer(geometry.attributes.normal);
  checkAndCleanBuffer(geometry.attributes.uv);

  if (!geometry.attributes.normal) {
    geometry.computeVertexNormals();
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
}

/**
 * Chuẩn hóa mô hình .GLB / .GLTF để khớp không gian bảo tàng và duy trì 60+ FPS
 * 
 * @param {THREE.Object3D} rootScene - Scene gốc từ GLTFLoader
 * @param {Object} options - Cấu hình chuẩn hóa
 * @param {number} options.targetSpan - Kích thước mong muốn theo mét (VD: 0.8 cho đồ gốm, 1.8 cho người, 3.4 cho tượng)
 * @param {'y'|'maxDim'|'maxHorizontal'|'x'|'z'} options.fitAxis - Trục căn chỉnh tỉ lệ (mặc định 'y')
 * @param {'unlit'|'pbr'|'preserve'} options.materialMode - 'unlit' (rực rỡ 100%, nhẹ nhất), 'pbr' (phản xạ ánh sáng), 'preserve'
 * @param {boolean} options.groundY - Tự động đưa đáy mô hình về Y = 0
 * @param {boolean} options.centerXZ - Căn giữa trục X và Z
 * @param {boolean} options.castShadow - Đổ bóng (mặc định false để tối ưu FPS)
 * @param {boolean} options.receiveShadow - Nhận bóng (mặc định false)
 * @param {boolean} options.frustumCulled - Tối ưu GPU culling (mặc định true)
 * @returns {THREE.Group} - Wrapper group chứa mô hình đã chuẩn hóa hoàn hảo
 */
export function prepareUnlitVividGlbModel(rootScene, {
  targetSpan = 2.0,
  fitAxis = 'y',
  materialMode = 'unlit',
  color = null,
  opacity = 1.0,
  groundY = true,
  centerXZ = true,
  castShadow = false,
  receiveShadow = false,
  frustumCulled = true
} = {}) {
  if (!rootScene) return new THREE.Group();

  rootScene.traverse((child) => {
    if (!child.isMesh) return;

    // Tối ưu hóa GPU draw calls và culling
    child.castShadow = Boolean(castShadow);
    child.receiveShadow = Boolean(receiveShadow);
    child.frustumCulled = Boolean(frustumCulled);

    // Kiểm tra & sửa lỗi NaN buffer (Quy tắc số 3)
    if (child.geometry) {
      sanitizeGeometryBuffers(child.geometry);
    }

    const hasVertexColors = Boolean(child.geometry && child.geometry.attributes.color);
    const origMats = Array.isArray(child.material) ? child.material : [child.material];

    if (materialMode === 'unlit') {
      const vividMats = origMats.map((mat) => {
        const tex = mat?.map || mat?.emissiveMap || null;
        if (tex) {
          if ('colorSpace' in tex && THREE.SRGBColorSpace) {
            tex.colorSpace = THREE.SRGBColorSpace;
          }
          tex.needsUpdate = true;
        }

        let finalColor;
        if (color !== null && color !== undefined) {
          finalColor = new THREE.Color(color);
        } else if (tex) {
          finalColor = new THREE.Color(0xffffff);
        } else if (mat?.color) {
          finalColor = mat.color.clone();
        } else {
          finalColor = new THREE.Color(0xd4af37); // Vàng đồng cổ antique gold (thay vì vàng chanh 0xfde047)
        }

        return new THREE.MeshBasicMaterial({
          map: tex,
          color: finalColor,
          vertexColors: hasVertexColors,
          transparent: Boolean(mat?.transparent) || opacity < 1.0,
          opacity: (mat?.opacity ?? 1.0) * opacity,
          side: THREE.DoubleSide,
          fog: false
        });
      });

      child.material = vividMats.length === 1 ? vividMats[0] : vividMats;
    } else if (materialMode === 'pbr') {
      for (const mat of origMats) {
        if (!mat) continue;
        if (color !== null && color !== undefined) {
          mat.color = new THREE.Color(color);
        }
        if (mat.map && 'colorSpace' in mat.map && THREE.SRGBColorSpace) {
          mat.map.colorSpace = THREE.SRGBColorSpace;
          mat.map.needsUpdate = true;
        }
        if (mat.isMeshStandardMaterial) {
          mat.roughness = Math.min(Math.max(mat.roughness ?? 0.5, 0.2), 0.9);
          mat.metalness = Math.min(Math.max(mat.metalness ?? 0.1, 0.0), 0.8);
        }
      }
    }
  });

  const wrapper = new THREE.Group();
  wrapper.name = `Standardized_${rootScene.name || 'Model'}`;

  // Tính toán Bounding Box chính xác
  rootScene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(rootScene);
  const size = new THREE.Vector3();
  box.getSize(size);

  let refDim = Math.max(size.y, 0.001);
  if (fitAxis === 'maxDim') {
    refDim = Math.max(size.x, size.y, size.z, 0.001);
  } else if (fitAxis === 'maxHorizontal') {
    refDim = Math.max(size.x, size.z, 0.001);
  } else if (fitAxis === 'x') {
    refDim = Math.max(size.x, 0.001);
  } else if (fitAxis === 'z') {
    refDim = Math.max(size.z, 0.001);
  }

  const scale = targetSpan / refDim;
  rootScene.scale.multiplyScalar(scale);
  rootScene.updateMatrixWorld(true);

  // Căn tâm X/Z và Grounding đáy tại Y = 0
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
 * Nạp mô hình GLB/GLTF với chuỗi URL dự phòng (Fallback Chain)
 * 
 * @param {GLTFLoader} loader - Instance GLTFLoader của Three.js
 * @param {string|string[]} urls - Một hoặc mảng URL dự phòng (VD: ['/model/den_long.glb', '/models/den_long.glb'])
 * @param {Function} onSuccess - Callback khi nạp thành công (nhận vào rootScene hoặc wrapper)
 * @param {Function} onFail - Callback khi toàn bộ URL thất bại
 * @param {Object} prepareOptions - Nếu truyền, tự động gọi prepareUnlitVividGlbModel trước khi gọi onSuccess
 */
export function loadGlbWithFallback(loader, urls, onSuccess, onFail, prepareOptions = null) {
  if (!loader) {
    console.error('[LOAD-GLB] Thiếu GLTFLoader!');
    if (onFail) onFail(new Error('GLTFLoader undefined'));
    return;
  }

  const candidateUrls = Array.isArray(urls) ? urls : [urls];
  
  // Tự động mở rộng danh sách đường dẫn phổ biến nếu chỉ truyền tên file
  const expanded = [];
  for (const u of candidateUrls) {
    if (!u) continue;
    expanded.push(u);
    if (!u.startsWith('/') && !u.startsWith('http')) {
      expanded.push(`/${u}`);
      expanded.push(`/model/${u}`);
      expanded.push(`/models/${u}`);
    } else if (u.startsWith('/model/')) {
      expanded.push(u.replace('/model/', '/models/'));
    } else if (u.startsWith('/models/')) {
      expanded.push(u.replace('/models/', '/model/'));
    }
  }

  const uniqueUrls = Array.from(new Set(expanded));
  let idx = 0;

  const tryNext = () => {
    if (idx >= uniqueUrls.length) {
      console.warn(`[LOAD-GLB] Tất cả ${uniqueUrls.length} đường dẫn fallback đều thất bại:`, uniqueUrls);
      if (onFail) onFail(new Error(`Không thể nạp mô hình từ các URL: ${uniqueUrls.join(', ')}`));
      return;
    }

    const currentUrl = uniqueUrls[idx++];
    loader.load(
      currentUrl,
      (gltf) => {
        let result = gltf.scene || gltf.scenes?.[0];
        if (prepareOptions) {
          result = prepareUnlitVividGlbModel(result, prepareOptions);
        }
        if (onSuccess) onSuccess(result, gltf);
      },
      undefined,
      (err) => {
        console.warn(`[LOAD-GLB] Nạp thất bại tại "${currentUrl}", đang thử fallback tiếp theo...`, err.message || err);
        tryNext();
      }
    );
  };

  tryNext();
}

/**
 * Đặt một mô hình đã chuẩn hóa lên bục trưng bày bảo tàng với vị trí & góc xoay
 */
export function createExhibitDisplay(model, {
  position = { x: 0, y: 0, z: 0 },
  rotationY = 0,
  pedestalHeight = 1.05,
  name = 'ExhibitItem'
} = {}) {
  const displayGroup = new THREE.Group();
  displayGroup.name = name;
  displayGroup.position.set(position.x ?? 0, position.y ?? 0, position.z ?? 0);
  displayGroup.rotation.y = rotationY;

  if (model) {
    model.position.y = pedestalHeight;
    displayGroup.add(model);
  }

  return displayGroup;
}
