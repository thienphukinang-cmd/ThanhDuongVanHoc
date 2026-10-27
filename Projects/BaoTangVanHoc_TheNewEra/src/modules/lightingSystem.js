import * as THREE from 'three';
import { ArtDirectorLighting } from './artDirectorLighting.js';

/**
 * LIGHTING SYSTEM MODULE - SENIOR LIGHTING & VFX DIRECTOR
 * 
 * Hệ thống chiếu sáng vĩ mô & hiệu ứng luồng sáng quang học (Volumetric God-Rays & Skylight Shafts):
 * 1. Giếng trời kiến trúc & Nguồn sáng cường độ cao (High-Intensity Skylight Emitter)
 * 2. Cột sáng thiên đàng đa tầng (Multi-Layered Volumetric God-Rays Shaft)
 * 3. Tương thích hoàn hảo với EffectComposer / UnrealBloomPass và Three.js Layers
 */

/**
 * Tạo cột sáng thiên đàng đa tầng (Volumetric God-Rays Shaft)
 * @param {Object} options 
 * @returns {THREE.Group} Group chứa các mesh luồng sáng với chế độ hòa trộn AdditiveBlending
 */
export function createVolumetricGodRays(options = {}) {
  const {
    topRadius = 1.4,
    bottomRadius = 4.2,
    height = 14.87,
    radialSegments = 36,
    colorCore = 0xFFFDF0,
    colorOuter = 0xFFF5E1,
    opacityCore = 0.40,
    opacityOuter = 0.26,
    includeFins = true
  } = options;

  const godRayGroup = new THREE.Group();
  godRayGroup.name = "Volumetric_GodRay_Shaft_System";

  // 1. Lõi sáng trung tâm (Core Divine Shaft - hình trụ nón mở rộng)
  const coreGeo = new THREE.CylinderGeometry(
    topRadius,
    bottomRadius * 0.75,
    height,
    radialSegments,
    1,
    true
  );
  coreGeo.computeVertexNormals();

  const coreMat = new THREE.MeshBasicMaterial({
    color: colorCore,
    transparent: true,
    opacity: opacityCore,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  coreMesh.name = "GodRay_Core_Shaft";
  coreMesh.position.y = height / 2;
  coreMesh.frustumCulled = false;
  godRayGroup.add(coreMesh);

  // 2. Quầng sáng khí quyển tỏa rộng (Outer Atmospheric Corona Shaft)
  const outerGeo = new THREE.CylinderGeometry(
    topRadius * 1.45,
    bottomRadius,
    height,
    radialSegments,
    1,
    true
  );
  outerGeo.computeVertexNormals();

  const outerMat = new THREE.MeshBasicMaterial({
    color: colorOuter,
    transparent: true,
    opacity: opacityOuter,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const outerMesh = new THREE.Mesh(outerGeo, outerMat);
  outerMesh.name = "GodRay_Outer_Shaft";
  outerMesh.position.y = height / 2;
  outerMesh.frustumCulled = false;
  godRayGroup.add(outerMesh);

  // 3. Các nan tia sáng góc chéo tạo hiệu ứng thị sai (God-Ray Light Fins)
  if (includeFins) {
    const finGeo = new THREE.PlaneGeometry(bottomRadius * 1.8, height);
    const finMat = new THREE.MeshBasicMaterial({
      color: colorOuter,
      transparent: true,
      opacity: 0.18,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const angles = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4];
    angles.forEach((angle, idx) => {
      const finMesh = new THREE.Mesh(finGeo, finMat);
      finMesh.name = `GodRay_Fin_${idx}`;
      finMesh.position.y = height / 2;
      finMesh.rotation.y = angle;
      finMesh.frustumCulled = false;
      godRayGroup.add(finMesh);
    });
  }

  // Gắn metadata và hàm cập nhật hoạt ảnh nhấp nháy êm dịu
  godRayGroup.userData = {
    coreMat,
    outerMat,
    baseOpacityCore: opacityCore,
    baseOpacityOuter: opacityOuter,
    update: (delta = 0.016, elapsedTime = 0) => {
      godRayGroup.rotation.y += delta * 0.025;
      const pulse = Math.sin(elapsedTime * 1.2) * 0.05;
      coreMat.opacity = Math.max(0.25, Math.min(0.55, opacityCore + pulse));
      outerMat.opacity = Math.max(0.15, Math.min(0.40, opacityOuter + pulse * 0.7));
    }
  };

  return godRayGroup;
}

/**
 * Tạo nguồn sáng giếng trời cực mạnh (Skylight High-Intensity Emitter)
 * @param {Object} options 
 * @returns {Object} { spotLight, dirLight, target }
 */
export function createSkylightEmitter(options = {}) {
  const {
    color = 0xFFF5E1,
    intensity = 50.0,
    elevation = 15.0,
    targetY = 0.13,
    distance = 40.0,
    angle = Math.PI / 4.2,
    penumbra = 0.45,
    decay = 1.1,
    castShadow = true,
    shadowMapSize = 2048
  } = options;

  const target = new THREE.Object3D();
  target.name = "Skylight_Emitter_Target";
  target.position.set(0, targetY, 0);

  const spotLight = new THREE.SpotLight(color, intensity, distance, angle, penumbra, decay);
  spotLight.name = "Skylight_HighIntensity_SpotLight";
  spotLight.position.set(0, elevation, 0);
  spotLight.target = target;

  if (castShadow) {
    spotLight.castShadow = true;
    spotLight.shadow.bias = -0.0015;
    spotLight.shadow.normalBias = 0.025;
    spotLight.shadow.mapSize.width = shadowMapSize;
    spotLight.shadow.mapSize.height = shadowMapSize;
    spotLight.shadow.camera.near = 1.0;
    spotLight.shadow.camera.far = distance + 5.0;
  }

  // Bổ sung luồng chiếu trực diện nhẹ nhàng hỗ trợ
  const dirLight = new THREE.DirectionalLight(color, intensity * 0.25);
  dirLight.name = "Skylight_Support_DirectionalLight";
  dirLight.position.set(0, elevation, 0);
  dirLight.target = target;
  dirLight.castShadow = false;

  return { spotLight, dirLight, target };
}

/**
 * Lớp điều khiển hệ thống chiếu sáng tổng thể (LightingSystem)
 */
export class LightingSystem {
  constructor(scene) {
    this.scene = scene;
    this.artDirector = new ArtDirectorLighting(scene);
  }

  createVolumetricGodRays(options) {
    return createVolumetricGodRays(options);
  }

  createSkylightEmitter(options) {
    return createSkylightEmitter(options);
  }

  update(delta, elapsedTime, camera) {
    this.artDirector?.update(delta, elapsedTime, camera);
  }
}

export { ArtDirectorLighting };
export default LightingSystem;
