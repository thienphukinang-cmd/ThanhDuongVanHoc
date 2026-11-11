import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * MODULE CHUẨN HÓA VÀ NẠP MÔ HÌNH 3D (.GLB/.GLTF) CHO BẢO TÀNG 3D
 * - Chia sẻ GLTFLoader + Promise Cache toàn cục (tránh fetch/parse trùng lặp)
 * - Tự động downscale texture > maxTextureSize (mặc định 1024px) một lần duy nhất
 * - Bật frustumCulled = true, tắt castShadow/receiveShadow, giữ FrontSide cho vật liệu đặc
 * - Triệt tiêu transmission pass đắt đỏ và lỗi NaN/Infinity trên BufferGeometry
 */

let _sharedGltfLoader = null;
const _gltfPromiseCache = new Map();
const _resolvedUrlCache = new Map();
const _sanitizedGeometries = new WeakSet();
const _processedTextures = new WeakMap();
const _convertedMaterialCache = new WeakMap();

export function getSharedGltfLoader() {
  if (!_sharedGltfLoader) {
    _sharedGltfLoader = new GLTFLoader();
  }
  return _sharedGltfLoader;
}

/**
 * Chuẩn hóa danh sách URL fallback (hỗ trợ cả /model/ và /models/)
 */
export function expandGlbFallbackUrls(urls) {
  const candidateUrls = Array.isArray(urls) ? urls : [urls];
  const expanded = [];
  for (const u of candidateUrls) {
    if (!u) continue;
    expanded.push(u);
    if (!u.startsWith('/') && !u.startsWith('http') && !u.startsWith('./')) {
      expanded.push(`/${u}`);
      expanded.push(`/model/${u}`);
      expanded.push(`/models/${u}`);
    } else if (u.startsWith('/model/')) {
      expanded.push(u.replace('/model/', '/models/'));
    } else if (u.startsWith('/models/')) {
      expanded.push(u.replace('/models/', '/model/'));
    }
  }
  return Array.from(new Set(expanded));
}

/**
 * Giảm kích thước texture vượt ngưỡng (mặc định <= 1024px) đúng 1 lần trên mỗi texture
 */
export function downscaleTexture(tex, maxSize = 1024, {
  disableMipmaps = true,
  colorSpace = null
} = {}) {
  if (!tex || !tex.isTexture) return tex;

  const prev = _processedTextures.get(tex);
  if (prev && prev.maxSize <= maxSize && (!colorSpace || tex.colorSpace === colorSpace)) {
    return tex;
  }

  let changed = false;

  if (colorSpace && 'colorSpace' in tex && tex.colorSpace !== colorSpace) {
    tex.colorSpace = colorSpace;
    changed = true;
  }

  const img = tex.image;
  if (img && typeof document !== 'undefined') {
    const w = img.width || img.videoWidth || 0;
    const h = img.height || img.videoHeight || 0;
    if (w > maxSize || h > maxSize) {
      try {
        const scale = maxSize / Math.max(w, h);
        const newW = Math.max(32, Math.round(w * scale));
        const newH = Math.max(32, Math.round(h * scale));
        const canvas = document.createElement('canvas');
        canvas.width = newW;
        canvas.height = newH;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, newW, newH);
          tex.image = canvas;
          changed = true;
        }
      } catch (_) {
        // Bỏ qua nếu image chưa sẵn sàng hoặc bị taint
      }
    }
  }

  if (disableMipmaps && tex.generateMipmaps !== false) {
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    changed = true;
  }

  if (changed) {
    tex.needsUpdate = true;
  }

  _processedTextures.set(tex, { maxSize });
  return tex;
}

/**
 * Quét và làm sạch buffer hình học để triệt tiêu NaN / Infinity (chỉ quét 1 lần / geometry)
 */
export function sanitizeGeometryBuffers(geometry) {
  if (!geometry || !geometry.attributes) return;

  if (_sanitizedGeometries.has(geometry)) {
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    if (!geometry.boundingSphere) geometry.computeBoundingSphere();
    return;
  }

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
  if (!geometry.boundingBox) geometry.computeBoundingBox();
  if (!geometry.boundingSphere) geometry.computeBoundingSphere();

  _sanitizedGeometries.add(geometry);
}

function resolveMaterialSide(mat, opacity, doubleSided) {
  if (typeof doubleSided === 'boolean') {
    return doubleSided ? THREE.DoubleSide : THREE.FrontSide;
  }
  const isTransparent = Boolean(mat?.transparent) || opacity < 1.0 || (mat?.alphaTest ?? 0) > 0;
  return isTransparent ? THREE.DoubleSide : THREE.FrontSide;
}

function getCachedConvertedMaterial(origMat, {
  materialMode,
  color,
  opacity,
  hasVertexColors,
  side,
  fog,
  maxTextureSize,
  disableMipmaps
}) {
  const tex = origMat?.map || origMat?.emissiveMap || null;
  if (tex) {
    downscaleTexture(tex, maxTextureSize, {
      disableMipmaps,
      colorSpace: THREE.SRGBColorSpace || null
    });
  }

  const colorKey = color !== null && color !== undefined
    ? new THREE.Color(color).getHexString()
    : (tex ? 'tex' : (origMat?.color ? origMat.color.getHexString() : 'd4af37'));

  const cacheKey = `${materialMode}|${colorKey}|${opacity.toFixed(3)}|${hasVertexColors ? 1 : 0}|${side}|${fog ? 1 : 0}|${maxTextureSize}`;

  if (origMat) {
    let matMap = _convertedMaterialCache.get(origMat);
    if (matMap && matMap.has(cacheKey)) {
      return matMap.get(cacheKey);
    }
  }

  let finalColor;
  if (color !== null && color !== undefined) {
    finalColor = new THREE.Color(color);
  } else if (tex) {
    finalColor = new THREE.Color(0xffffff);
  } else if (origMat?.color) {
    finalColor = origMat.color.clone();
  } else {
    finalColor = new THREE.Color(0xd4af37);
  }

  const isTransparent = Boolean(origMat?.transparent) || opacity < 1.0;
  const alphaTest = origMat?.alphaTest ?? 0;
  const finalOpacity = (origMat?.opacity ?? 1.0) * opacity;

  let converted;
  if (materialMode === 'lambert') {
    converted = new THREE.MeshLambertMaterial({
      map: tex,
      color: finalColor,
      vertexColors: hasVertexColors,
      transparent: isTransparent,
      opacity: finalOpacity,
      alphaTest,
      side,
      fog
    });
  } else {
    converted = new THREE.MeshBasicMaterial({
      map: tex,
      color: finalColor,
      vertexColors: hasVertexColors,
      transparent: isTransparent,
      opacity: finalOpacity,
      alphaTest,
      side,
      fog
    });
  }

  if (origMat) {
    let matMap = _convertedMaterialCache.get(origMat);
    if (!matMap) {
      matMap = new Map();
      _convertedMaterialCache.set(origMat, matMap);
    }
    matMap.set(cacheKey, converted);
  }

  return converted;
}

/**
 * Chuẩn hóa mô hình .GLB / .GLTF để khớp không gian bảo tàng và duy trì 60+ FPS
 */
export function prepareUnlitVividGlbModel(rootScene, {
  targetSpan = 2.0,
  fitAxis = 'y',
  materialMode = 'unlit',
  color = null,
  tintColor = null,
  opacity = 1.0,
  groundY = true,
  centerXZ = true,
  castShadow = false,
  receiveShadow = false,
  frustumCulled = true,
  doubleSided = undefined,
  fog = false,
  maxTextureSize = 1024,
  disableMipmaps = true,
  ignoreRaycaster = false,
  stripLights = true
} = {}) {
  if (!rootScene) return new THREE.Group();

  const effectiveColor = color !== null && color !== undefined ? color : tintColor;

  rootScene.traverse((child) => {
    if (stripLights && child.isLight) {
      child.visible = false;
      child.intensity = 0;
      child.castShadow = false;
      return;
    }

    if (!child.isMesh) return;

    child.castShadow = Boolean(castShadow);
    child.receiveShadow = Boolean(receiveShadow);
    child.frustumCulled = frustumCulled !== false;
    if (ignoreRaycaster) {
      child.userData.ignoreRaycaster = true;
    }

    if (child.geometry) {
      sanitizeGeometryBuffers(child.geometry);
    }

    const hasVertexColors = Boolean(child.geometry && child.geometry.attributes.color);
    const origMats = Array.isArray(child.material) ? child.material : [child.material];

    if (materialMode === 'unlit' || materialMode === 'lambert') {
      const vividMats = origMats.map((mat) => {
        const side = resolveMaterialSide(mat, opacity, doubleSided);
        return getCachedConvertedMaterial(mat, {
          materialMode,
          color: effectiveColor,
          opacity,
          hasVertexColors,
          side,
          fog,
          maxTextureSize,
          disableMipmaps
        });
      });

      child.material = vividMats.length === 1 ? vividMats[0] : vividMats;
    } else if (materialMode === 'pbr' || materialMode === 'preserve') {
      const processedMats = origMats.map((mat) => {
        if (!mat) return mat;

        // Loại bỏ transmission pass (extra full-scene render) trên vật liệu thủy tinh nhỏ
        if (mat.isMeshPhysicalMaterial && (mat.transmission ?? 0) > 0) {
          const fastGlass = new THREE.MeshStandardMaterial({
            color: mat.color ? mat.color.clone() : new THREE.Color(0xdbeafe),
            map: mat.map || null,
            emissive: mat.emissive ? mat.emissive.clone() : new THREE.Color(0x000000),
            emissiveIntensity: mat.emissiveIntensity ?? 1.0,
            roughness: mat.roughness ?? 0.2,
            metalness: mat.metalness ?? 0.05,
            transparent: true,
            opacity: Math.min(mat.opacity ?? 0.48, 0.55),
            side: THREE.DoubleSide
          });
          return fastGlass;
        }

        if (effectiveColor !== null && effectiveColor !== undefined) {
          mat.color = new THREE.Color(effectiveColor);
        }
        mat.side = resolveMaterialSide(mat, opacity, doubleSided);

        if (mat.map) {
          downscaleTexture(mat.map, maxTextureSize, {
            disableMipmaps,
            colorSpace: THREE.SRGBColorSpace || null
          });
        }
        if (mat.emissiveMap) {
          downscaleTexture(mat.emissiveMap, maxTextureSize, {
            disableMipmaps,
            colorSpace: THREE.SRGBColorSpace || null
          });
        }
        const linearTexMax = Math.min(maxTextureSize, 512);
        if (mat.normalMap) {
          downscaleTexture(mat.normalMap, linearTexMax, {
            disableMipmaps,
            colorSpace: THREE.NoColorSpace || THREE.LinearSRGBColorSpace || null
          });
        }
        if (mat.roughnessMap) {
          downscaleTexture(mat.roughnessMap, linearTexMax, {
            disableMipmaps,
            colorSpace: THREE.NoColorSpace || THREE.LinearSRGBColorSpace || null
          });
        }
        if (mat.metalnessMap) {
          downscaleTexture(mat.metalnessMap, linearTexMax, {
            disableMipmaps,
            colorSpace: THREE.NoColorSpace || THREE.LinearSRGBColorSpace || null
          });
        }

        if (materialMode === 'pbr' && mat.isMeshStandardMaterial) {
          mat.roughness = Math.min(Math.max(mat.roughness ?? 0.5, 0.2), 0.9);
          mat.metalness = Math.min(Math.max(mat.metalness ?? 0.1, 0.0), 0.8);
        }
        return mat;
      });
      child.material = processedMats.length === 1 ? processedMats[0] : processedMats;
    }
  });

  const wrapper = new THREE.Group();
  wrapper.name = `Standardized_${rootScene.name || 'Model'}`;

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
 * Chuẩn hóa mô hình 3D theo chiều cao mục tiêu (mặc định 3.0m), căn giữa X/Z,
 * đưa đáy về Y = 0, tối ưu texture & frustum culling.
 */
export function normalizeModelToHeight(model, targetHeight = 3.0, {
  maxTextureSize = 1024,
  disableMipmaps = true,
  doubleSided = undefined
} = {}) {
  if (!model) return null;

  model.traverse((child) => {
    if (child.isLight) {
      child.visible = false;
      child.intensity = 0;
      child.castShadow = false;
      return;
    }
    if (!child.isMesh) return;
    child.castShadow = false;
    child.receiveShadow = false;
    child.frustumCulled = true;

    if (child.geometry) {
      sanitizeGeometryBuffers(child.geometry);
    }

    const mats = Array.isArray(child.material) ? child.material : [child.material];
    const processedMats = mats.map((mat) => {
      if (!mat) return mat;

      if (mat.isMeshPhysicalMaterial && (mat.transmission ?? 0) > 0) {
        return new THREE.MeshStandardMaterial({
          color: mat.color ? mat.color.clone() : new THREE.Color(0xdbeafe),
          map: mat.map || null,
          emissive: mat.emissive ? mat.emissive.clone() : new THREE.Color(0x000000),
          emissiveIntensity: mat.emissiveIntensity ?? 1.0,
          roughness: mat.roughness ?? 0.25,
          metalness: mat.metalness ?? 0.05,
          transparent: true,
          opacity: Math.min(mat.opacity ?? 0.48, 0.55),
          side: THREE.DoubleSide
        });
      }

      mat.side = resolveMaterialSide(mat, mat.opacity ?? 1.0, doubleSided);

      if (mat.map) {
        downscaleTexture(mat.map, maxTextureSize, {
          disableMipmaps,
          colorSpace: THREE.SRGBColorSpace || null
        });
      }
      if (mat.emissiveMap) {
        downscaleTexture(mat.emissiveMap, maxTextureSize, {
          disableMipmaps,
          colorSpace: THREE.SRGBColorSpace || null
        });
      }
      const linearTexMax = Math.min(maxTextureSize, 512);
      if (mat.normalMap) {
        downscaleTexture(mat.normalMap, linearTexMax, {
          disableMipmaps,
          colorSpace: THREE.NoColorSpace || THREE.LinearSRGBColorSpace || null
        });
      }
      if (mat.roughnessMap) {
        downscaleTexture(mat.roughnessMap, linearTexMax, {
          disableMipmaps,
          colorSpace: THREE.NoColorSpace || THREE.LinearSRGBColorSpace || null
        });
      }
      if (mat.metalnessMap) {
        downscaleTexture(mat.metalnessMap, linearTexMax, {
          disableMipmaps,
          colorSpace: THREE.NoColorSpace || THREE.LinearSRGBColorSpace || null
        });
      }
      return mat;
    });
    child.material = processedMats.length === 1 ? processedMats[0] : processedMats;
  });

  model.updateMatrixWorld(true);
  const initialBox = new THREE.Box3().setFromObject(model);
  if (initialBox.isEmpty()) return null;

  const size = new THREE.Vector3();
  initialBox.getSize(size);
  const currentHeight = Math.max(size.y, 0.0001);
  const scaleFactor = targetHeight / currentHeight;

  model.scale.multiplyScalar(scaleFactor);
  model.updateMatrixWorld(true);

  const scaledBox = new THREE.Box3().setFromObject(model);
  const scaledCenter = new THREE.Vector3();
  scaledBox.getCenter(scaledCenter);

  model.position.x -= scaledCenter.x;
  model.position.z -= scaledCenter.z;
  model.position.y -= scaledBox.min.y;
  model.updateMatrixWorld(true);

  return {
    model,
    scaleFactor,
    bounds: new THREE.Box3().setFromObject(model)
  };
}

function preprocessGltfSceneOnce(rootScene, maxTextureSize = 1024, disableMipmaps = true) {
  if (!rootScene) return;
  rootScene.traverse((child) => {
    if (child.isLight) {
      child.visible = false;
      child.intensity = 0;
      child.castShadow = false;
      return;
    }
    if (!child.isMesh) return;
    child.castShadow = false;
    child.receiveShadow = false;
    child.frustumCulled = true;
    if (child.geometry) {
      sanitizeGeometryBuffers(child.geometry);
    }
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((mat) => {
      if (!mat) return;
      if (mat.map) downscaleTexture(mat.map, maxTextureSize, { disableMipmaps });
      if (mat.emissiveMap) downscaleTexture(mat.emissiveMap, maxTextureSize, { disableMipmaps });
      const linearMax = Math.min(maxTextureSize, 512);
      if (mat.normalMap) downscaleTexture(mat.normalMap, linearMax, { disableMipmaps });
      if (mat.roughnessMap) downscaleTexture(mat.roughnessMap, linearMax, { disableMipmaps });
      if (mat.metalnessMap) downscaleTexture(mat.metalnessMap, linearMax, { disableMipmaps });
    });
  });
}

function loadSingleUrlCached(url, loader = null, maxTextureSize = 1024, disableMipmaps = true) {
  if (_gltfPromiseCache.has(url)) {
    return _gltfPromiseCache.get(url);
  }

  const activeLoader = loader || getSharedGltfLoader();
  const promise = new Promise((resolve, reject) => {
    activeLoader.load(
      url,
      (gltf) => {
        const templateScene = gltf.scene || gltf.scenes?.[0];
        if (templateScene) {
          preprocessGltfSceneOnce(templateScene, maxTextureSize, disableMipmaps);
        }
        resolve({ gltf, url });
      },
      undefined,
      (err) => {
        _gltfPromiseCache.delete(url);
        reject(err || new Error(`Failed to load GLB: ${url}`));
      }
    );
  });

  _gltfPromiseCache.set(url, promise);
  return promise;
}

/**
 * Nạp mô hình GLB/GLTF với Shared Promise Cache & Fallback Chain.
 * Trả về Promise<THREE.Object3D> (clone an toàn chia sẻ chung geometry/texture, frustumCulled=true, no shadow).
 * Nếu truyền `returnGltf: true`, trả về `{ scene, gltf, url }`.
 */
export async function loadGlbCached(urls, {
  loader = null,
  maxTextureSize = 1024,
  disableMipmaps = true,
  clone = true,
  prepareOptions = null,
  targetHeight = null,
  returnGltf = false
} = {}) {
  const uniqueUrls = expandGlbFallbackUrls(urls);
  if (uniqueUrls.length === 0) {
    throw new Error('No GLB URLs provided');
  }

  const cacheKey = uniqueUrls.join('|');
  const cachedWorkingUrl = _resolvedUrlCache.get(cacheKey);
  const orderedUrls = cachedWorkingUrl
    ? [cachedWorkingUrl, ...uniqueUrls.filter((u) => u !== cachedWorkingUrl)]
    : uniqueUrls;

  let lastErr = null;
  for (const currentUrl of orderedUrls) {
    try {
      const { gltf, url } = await loadSingleUrlCached(currentUrl, loader, maxTextureSize, disableMipmaps);
      _resolvedUrlCache.set(cacheKey, url);

      const baseScene = gltf.scene || gltf.scenes?.[0];
      let result = (clone && baseScene) ? baseScene.clone(true) : baseScene;

      if (result && prepareOptions) {
        result = prepareUnlitVividGlbModel(result, {
          maxTextureSize,
          disableMipmaps,
          ...prepareOptions
        });
      } else if (result && typeof targetHeight === 'number') {
        normalizeModelToHeight(result, targetHeight, {
          maxTextureSize,
          disableMipmaps
        });
      }

      return returnGltf ? { scene: result, gltf, url } : result;
    } catch (err) {
      lastErr = err;
    }
  }

  throw lastErr || new Error(`Không thể nạp mô hình từ các URL: ${uniqueUrls.join(', ')}`);
}

/**
 * Nạp mô hình GLB/GLTF với chuỗi URL dự phòng (Fallback Chain) + Shared Promise Cache
 */
export function loadGlbWithFallback(loader, urls, onSuccess, onFail, prepareOptions = null) {
  const uniqueUrls = expandGlbFallbackUrls(urls);
  if (uniqueUrls.length === 0) {
    if (onFail) onFail(new Error('No GLB URLs provided'));
    return;
  }

  loadGlbCached(uniqueUrls, {
    loader: loader || getSharedGltfLoader(),
    prepareOptions,
    returnGltf: true
  })
    .then(({ scene, gltf }) => {
      if (onSuccess) onSuccess(scene, gltf);
    })
    .catch((err) => {
      console.warn(`[LOAD-GLB] Tất cả ${uniqueUrls.length} đường dẫn fallback đều thất bại:`, uniqueUrls, err?.message || err);
      if (onFail) onFail(err);
    });
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
