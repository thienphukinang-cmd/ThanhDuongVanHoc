import * as THREE from 'three';

// Khởi tạo InstancedMesh cho 150 cánh hoa đào
export function createOptimizedFallingPetals(count = 150) {
  const geometry = new THREE.PlaneGeometry(0.15, 0.15);
  // Dùng MeshBasicMaterial để bỏ qua tính toán ánh sáng phức tạp trên các vật thể nhỏ
  const material = new THREE.MeshBasicMaterial({ 
    color: 0xffa6c9, 
    side: THREE.DoubleSide, 
    transparent: true,
    opacity: 0.8,
    depthWrite: false, // Tránh lỗi hiển thị alpha
    fog: true 
  });

  const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
  instancedMesh.castShadow = false; // Tắt bóng đổ để tối ưu
  instancedMesh.receiveShadow = false;

  const dummy = new THREE.Object3D();
  const petalData = []; // Lưu trữ trạng thái để animate

  for (let i = 0; i < count; i++) {
    // Phân bổ ngẫu nhiên trong không gian
    const x = (Math.random() - 0.5) * 40;
    const y = Math.random() * 20 + 5;
    const z = (Math.random() - 0.5) * 40;
    
    dummy.position.set(x, y, z);
    dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);

    petalData.push({
      x, y, z,
      speedY: Math.random() * 0.02 + 0.01,
      speedRot: Math.random() * 0.05 + 0.01
    });
  }
  
  instancedMesh.instanceMatrix.needsUpdate = true;
  
  // Trả về cả lưới và dữ liệu để đưa vào hàm requestAnimationFrame
  return { instancedMesh, petalData, dummy };
}

// Gọi hàm này trong loop render của bạn
export function animatePetals(instancedMesh, petalData, dummy) {
  for (let i = 0; i < petalData.length; i++) {
    const data = petalData[i];
    data.y -= data.speedY;
    
    // Rơi chạm đất thì quay lại trên cao
    if (data.y < -5) data.y = 25; 

    dummy.position.set(data.x, data.y, data.z);
    dummy.rotation.x += data.speedRot;
    dummy.rotation.y += data.speedRot;
    dummy.updateMatrix();
    instancedMesh.setMatrixAt(i, dummy.matrix);
  }
  instancedMesh.instanceMatrix.needsUpdate = true;
}
// Tạo hiệu ứng luồng sáng thần thánh (God Rays) chiếu từ trên xuống
export function createOptimizedGodRays(colorHex = '#fde047', height = 20, topRadius = 0.5, bottomRadius = 5) {
  // Tạo texture gradient bằng canvas thay vì load ảnh ngoài
  const canvas = document.createElement('canvas');
  canvas.width = 32; canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 128);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)'); // Sáng và đặc ở đỉnh
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)'); // Mờ dần ở đáy
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 32, 128);

  const texture = new THREE.CanvasTexture(canvas);
  
  const geometry = new THREE.CylinderGeometry(topRadius, bottomRadius, height, 16, 1, true);
  geometry.translate(0, -height / 2, 0); // Đặt tâm chóp quay lên trên

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    color: colorHex,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending, // Quan trọng: tạo hiệu ứng phát sáng cộng gộp
    depthWrite: false, // Không cản các vật thể phía sau
    side: THREE.DoubleSide
  });

  const godRayMesh = new THREE.Mesh(geometry, material);
  godRayMesh.frustumCulled = false; // Tránh chớp nháy khi quay camera
  return godRayMesh;
}

// Thiết lập sương mù môi trường (Fog)
// Đặt trong hàm khởi tạo thế giới Truyện Kiều hoặc Sơn Tinh
export function setupRealmAtmosphere(scene, fogColor = 0x1a0b2e, density = 0.0015) {
  scene.fog = new THREE.FogExp2(fogColor, density);
  scene.background = new THREE.Color(fogColor);
  
  // Ambient Light dịu nhẹ toàn cục
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);
}
export function disposeHierarchy(node) {
  if (!node) return;
  
  node.traverse((child) => {
    if (child.isMesh) {
      if (child.geometry) {
        child.geometry.dispose();
      }
      
      if (child.material) {
        // Nếu là mảng materials
        if (Array.isArray(child.material)) {
          child.material.forEach(mat => cleanMaterial(mat));
        } else {
          cleanMaterial(child.material);
        }
      }
    }
  });
  
  if (node.parent) {
    node.parent.remove(node);
  }
}

function cleanMaterial(material) {
  if (!material) return;
  material.dispose();
  
  // Hủy các texture đính kèm
  for (const key of ['map', 'lightMap', 'bumpMap', 'normalMap', 'specularMap', 'envMap', 'alphaMap', 'aoMap', 'displacementMap', 'emissiveMap', 'roughnessMap', 'metalnessMap']) {
    if (material[key]) {
      material[key].dispose();
    }
  }
}