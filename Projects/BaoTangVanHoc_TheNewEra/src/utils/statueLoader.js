import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export function normalizeModelToHeight(modelScene, targetHeight = 2.6) {
  const box = new THREE.Box3().setFromObject(modelScene);
  const size = new THREE.Vector3();
  box.getSize(size);

  if (size.y > 0) {
    const scaleFactor = targetHeight / size.y;
    modelScene.scale.multiplyScalar(scaleFactor);
  }

  box.setFromObject(modelScene);
  const center = new THREE.Vector3();
  box.getCenter(center);

  modelScene.position.x -= center.x;
  modelScene.position.z -= center.z;
  modelScene.position.y -= box.min.y; // Neo đáy bệ tượng chạm chuẩn sàn Y = 0
  return modelScene;
}

export function loadThuyKieuStatue(scene, position = new THREE.Vector3(0, 0, 0), targetHeight = 2.6) {
  const group = new THREE.Group();
  group.position.copy(position);
  scene.add(group);

  const loader = new GLTFLoader();
  loader.load(
    '/models/thuy_kieu_statue.glb',
    (gltf) => {
      const model = normalizeModelToHeight(gltf.scene, targetHeight);
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      group.add(model);
    },
    undefined,
    () => {
      // Procedural Fallback nếu file GLB chưa được build
      const fallbackGeo = new THREE.CylinderGeometry(0.45, 0.65, targetHeight, 24);
      const fallbackMat = new THREE.MeshStandardMaterial({
        color: 0xd4af37,
        metalness: 0.8,
        roughness: 0.25
      });
      const fallbackMesh = new THREE.Mesh(fallbackGeo, fallbackMat);
      fallbackMesh.position.y = targetHeight / 2;
      group.add(fallbackMesh);
    }
  );

  return group;
}