import * as THREE from 'three';

/**
 * PROCEDURAL MATERIALS LIBRARY
 * Skill: threejs-procedural-materials
 * 
 * - Đá cẩm thạch đen vân vàng siêu bóng phản chiếu (Black/Gold Marble - High Reflection)
 * - Đá cẩm thạch trắng tinh khiết (White Marble cho hàng cột tròn khổng lồ)
 * - Gỗ nâu trầm bóng (Polished Mahogany cho mặt bậc cầu thang)
 * - Thạch cao trắng kiến trúc (White Plaster cho gầm cầu thang)
 * - Kim loại vàng hoàng gia (Royal Gold cho lan can & phào chỉ)
 * - Kính mái vòm giếng trời (Optical Skylight Glass)
 * - Đá tường Đông Dương (Indochine Wall Stone cho vách 15 phòng)
 */

function createBlackGoldMarbleCanvas(size = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Nền đen mun sâu thẳm
  const bgGrad = ctx.createRadialGradient(
    size * 0.5, size * 0.5, size * 0.05,
    size * 0.5, size * 0.5, size * 0.8
  );
  bgGrad.addColorStop(0, '#0f1116');
  bgGrad.addColorStop(0.5, '#07090c');
  bgGrad.addColorStop(1, '#020305');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // Lớp sương khoáng hữu cơ
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y += 2) {
    for (let x = 0; x < size; x += 2) {
      const nx = x / size;
      const ny = y / size;
      const n1 = Math.sin(nx * 16 + Math.cos(ny * 12) * 3);
      const n2 = Math.cos(ny * 18 + Math.sin(nx * 14) * 2.5);
      const cloud = (n1 + n2) * 0.5;

      const boost = Math.floor(Math.max(0, cloud) * 16);
      const idx = (y * size + x) * 4;
      data[idx] += boost;
      data[idx + 1] += boost;
      data[idx + 2] += Math.floor(boost * 1.3);
    }
  }
  ctx.putImageData(imgData, 0, 0);

  // Mạch đá vàng hoàng kim
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const veinSeeds = [
    { startX: 0.05, startY: 0.0, angle: 1.15, length: 1.25, width: 11, branches: 5 },
    { startX: 0.38, startY: 0.0, angle: 1.32, length: 1.15, width: 16, branches: 6 },
    { startX: 0.72, startY: 0.05, angle: 1.48, length: 1.3, width: 10, branches: 4 },
    { startX: 0.0, startY: 0.55, angle: 0.38, length: 1.2, width: 13, branches: 5 },
    { startX: 0.2, startY: 0.95, angle: -0.22, length: 0.95, width: 9, branches: 3 }
  ];

  function drawFractalVein(x, y, angle, len, w, depth) {
    if (depth <= 0 || len < 6) return;

    ctx.beginPath();
    ctx.moveTo(x, y);

    let currX = x;
    let currY = y;
    const steps = Math.floor(len / 5);
    const stepDist = len / steps;

    for (let i = 0; i < steps; i++) {
      const wiggle = (Math.random() - 0.5) * 0.65;
      angle += wiggle * 0.28;
      currX += Math.cos(angle) * stepDist;
      currY += Math.sin(angle) * stepDist;
      ctx.lineTo(currX, currY);

      if (Math.random() < 0.25 && depth > 1) {
        const branchAngle = angle + (Math.random() > 0.5 ? 0.75 : -0.75) + (Math.random() - 0.5) * 0.35;
        drawFractalVein(currX, currY, branchAngle, len * 0.45, w * 0.45, depth - 1);
      }
    }

    ctx.strokeStyle = 'rgba(212, 175, 55, 0.42)';
    ctx.lineWidth = w * 1.8;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 225, 110, 0.9)';
    ctx.lineWidth = w * 0.75;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 250, 230, 0.98)';
    ctx.lineWidth = Math.max(1, w * 0.24);
    ctx.stroke();
  }

  for (const s of veinSeeds) {
    drawFractalVein(s.startX * size, s.startY * size, s.angle, s.length * size, s.width, s.branches);
  }

  for (let i = 0; i < 500; i++) {
    const gx = Math.random() * size;
    const gy = Math.random() * size;
    const r = Math.random() * 1.8 + 0.4;
    ctx.fillStyle = Math.random() > 0.3 ? 'rgba(245, 205, 85, 0.85)' : 'rgba(255, 240, 180, 0.95)';
    ctx.beginPath();
    ctx.arc(gx, gy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  return canvas;
}

function createBlackMarbleRoughnessCanvas(size = 512) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#262626'; // Giới hạn roughness tối thiểu >= 0.14 chống tràn số Specular
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = 'rgba(45, 45, 45, 0.25)';
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, Math.random() * 70 + 20, 0, Math.PI * 2);
    ctx.fill();
  }
  return canvas;
}

function createWhiteMarbleCanvas(size = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fafbfc';
  ctx.fillRect(0, 0, size, size);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 0; i < 7; i++) {
    let x = (i / 7) * size + Math.random() * 80 - 40;
    let y = 0;
    let angle = 1.38 + (Math.random() - 0.5) * 0.25;

    ctx.beginPath();
    ctx.moveTo(x, y);

    for (let s = 0; s < 28; s++) {
      angle += (Math.random() - 0.5) * 0.22;
      x += Math.cos(angle) * (size / 22);
      y += Math.sin(angle) * (size / 22);
      ctx.lineTo(x, y);
    }

    ctx.strokeStyle = 'rgba(215, 222, 228, 0.35)';
    ctx.lineWidth = 16 + Math.random() * 12;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(190, 196, 204, 0.45)';
    ctx.lineWidth = 3 + Math.random() * 3;
    ctx.stroke();
  }

  return canvas;
}

function createPolishedMahoganyCanvas(size = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, size, 0);
  grad.addColorStop(0.0, '#221109');
  grad.addColorStop(0.35, '#351c11');
  grad.addColorStop(0.68, '#1e0e06');
  grad.addColorStop(1.0, '#2c160c');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  for (let x = 0; x < size; x += 3) {
    const wave = Math.sin(x * 0.08) * 8 + Math.cos(x * 0.02) * 12;
    const tone = 0.08 + Math.sin(x * 0.35 + wave * 0.1) * 0.06;
    ctx.fillStyle = tone > 0.08 ? 'rgba(90, 48, 28, 0.35)' : 'rgba(12, 6, 2, 0.35)';
    ctx.fillRect(x, 0, 2, size);
  }

  return canvas;
}

export class MaterialLibrary {
  constructor() {
    this.textures = {};
    this.materials = {};
    this.init();
  }

  init() {
    // 1. Textures
    const blackGoldCanvas = createBlackGoldMarbleCanvas(1024);
    const blackRoughCanvas = createBlackMarbleRoughnessCanvas(512);
    const whiteMarbleCanvas = createWhiteMarbleCanvas(1024);
    const mahoganyCanvas = createPolishedMahoganyCanvas(1024);

    const blackGoldTexture = new THREE.CanvasTexture(blackGoldCanvas);
    blackGoldTexture.wrapS = THREE.RepeatWrapping;
    blackGoldTexture.wrapT = THREE.RepeatWrapping;
    blackGoldTexture.repeat.set(10, 10);
    blackGoldTexture.colorSpace = THREE.SRGBColorSpace;

    const blackRoughnessTexture = new THREE.CanvasTexture(blackRoughCanvas);
    blackRoughnessTexture.wrapS = THREE.RepeatWrapping;
    blackRoughnessTexture.wrapT = THREE.RepeatWrapping;
    blackRoughnessTexture.repeat.set(10, 10);

    const whiteMarbleTexture = new THREE.CanvasTexture(whiteMarbleCanvas);
    whiteMarbleTexture.wrapS = THREE.RepeatWrapping;
    whiteMarbleTexture.wrapT = THREE.RepeatWrapping;
    whiteMarbleTexture.repeat.set(2, 6);
    whiteMarbleTexture.colorSpace = THREE.SRGBColorSpace;

    const mahoganyTexture = new THREE.CanvasTexture(mahoganyCanvas);
    mahoganyTexture.wrapS = THREE.RepeatWrapping;
    mahoganyTexture.wrapT = THREE.RepeatWrapping;
    mahoganyTexture.repeat.set(4, 2);
    mahoganyTexture.colorSpace = THREE.SRGBColorSpace;

    this.textures = {
      blackGold: blackGoldTexture,
      blackRoughness: blackRoughnessTexture,
      whiteMarble: whiteMarbleTexture,
      mahogany: mahoganyTexture
    };

    // 2. SÀN NHÀ: ĐÁ CẨM THẠCH ĐEN VÂN VÀNG (High Reflection - Specular Clamped)
    this.materials.blackGoldMarble = new THREE.MeshPhysicalMaterial({
      map: blackGoldTexture,
      roughnessMap: blackRoughnessTexture,
      roughness: 0.14,             // Nâng roughness >= 0.12 chống lỗi GGX 0/0
      metalness: 0.16,
      clearcoat: 0.8,              // Giảm tối đa 0.8 chống tràn số
      clearcoatRoughness: 0.16,    // Nâng >= 0.15 chống chia cho 0 ở grazing angles
      reflectivity: 0.85,
      envMapIntensity: 1.4,
      side: THREE.DoubleSide,
    });

    this.materials.blackBorderMarble = new THREE.MeshStandardMaterial({
      color: 0x08090c,
      roughness: 0.15,
      metalness: 0.2,
      side: THREE.DoubleSide,
    });

    // 3. CỘT TRỤ: ĐÁ CẨM THẠCH TRẮNG TINH KHIẾT (White Marble)
    this.materials.whiteMarble = new THREE.MeshStandardMaterial({
      map: whiteMarbleTexture,
      color: 0xfafbfc,
      roughness: 0.20,
      metalness: 0.04,
      bumpMap: whiteMarbleTexture,
      bumpScale: 0.015,
      side: THREE.DoubleSide,
    });

    // 4. CẦU THANG: MẶT BẬC ỐP GỖ NÂU TRẦM BÓNG (Polished Mahogany)
    this.materials.polishedMahogany = new THREE.MeshStandardMaterial({
      map: mahoganyTexture,
      color: 0x3d1f14,
      roughness: 0.28,             // Đánh bóng vec-ni gương an toàn
      metalness: 0.08,
      bumpMap: mahoganyTexture,
      bumpScale: 0.02,
      side: THREE.DoubleSide,
    });

    // 5. CẦU THANG: GẦM CẦU THANG THẠCH CAO TRẮNG (White Plaster)
    this.materials.whitePlaster = new THREE.MeshStandardMaterial({
      color: 0xf5f6f8,
      roughness: 0.45,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });

    // 6. CẦU THANG & PHÀO CHỈ: KIM LOẠI VÀNG HOÀNG GIA (Royal Gold)
    this.materials.royalGold = new THREE.MeshStandardMaterial({
      color: 0xffd269,
      roughness: 0.16,             // >= 0.12 chống fireflies
      metalness: 0.92,
      side: THREE.DoubleSide,
    });

    // 7. KHUNG ĐỒNG KIẾN TRÚC (Architectural Bronze)
    this.materials.bronzeFramework = new THREE.MeshStandardMaterial({
      color: 0x5a3e1b,
      roughness: 0.32,
      metalness: 0.88,
      side: THREE.DoubleSide,
    });

    // 8. KÍNH MÁI VÒM GIẾNG TRỜI (Optical Skylight Glass)
    this.materials.skylightGlass = new THREE.MeshPhysicalMaterial({
      color: 0xe8f4f9,
      transmission: 0.88,
      opacity: 1.0,
      transparent: true,
      roughness: 0.12,             // >= 0.12 chống lỗi Specular chia 0
      ior: 1.52,
      thickness: 1.6,
      clearcoat: 0.8,              // Tối đa 0.8
      clearcoatRoughness: 0.16,    // >= 0.15
      side: THREE.DoubleSide,
    });

    // 9. TƯỜNG 15 PHÒNG: VỮA VÔI ĐÔNG DƯƠNG (Indochine Lime Plaster #F4EEDB)
    this.materials.indochinePlaster = new THREE.MeshStandardMaterial({
      color: 0xf4eedb,             // Màu vàng mù tạt nhạt / vữa vôi kem Đông Dương
      roughness: 0.85,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    this.materials.wallStone = this.materials.indochinePlaster; // Alias đồng bộ

    // 10. CHÂN TƯỜNG ỐP GỖ MAHOGANY (Wainscoting / Baseboard)
    this.materials.wainscotWood = new THREE.MeshStandardMaterial({
      map: mahoganyTexture,
      color: 0x30180d,
      roughness: 0.32,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });

    // 11. TƯỜNG BAO NGOẠI THẤT KÍN (Exterior Envelope Wall)
    this.materials.exteriorWall = new THREE.MeshStandardMaterial({
      color: 0xded6c5,
      roughness: 0.82,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });

    // 12. DẢI ĐÈN LED ẨN (Warm LED Cove)
    this.materials.warmLedCove = new THREE.MeshStandardMaterial({
      color: 0xffe6a3,
      emissive: 0xff9922,
      emissiveIntensity: 2.2,
      roughness: 0.25,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });

    // 13. LAN CAN ĐÁ CẨM THẠCH ĐÔNG DƯƠNG (Indochine Balustrade White Marble)
    this.materials.indochineBalusterMarble = new THREE.MeshStandardMaterial({
      color: 0xf5f3ee,
      roughness: 0.24,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    // 14. KHỐI NÚI ĐÁ VÔI TRÀNG AN (Tràng An Karst Limestone Rock)
    this.materials.karstRock = new THREE.MeshStandardMaterial({
      color: 0x5b6873,
      roughness: 0.88,
      metalness: 0.04,
      flatShading: true,
      side: THREE.DoubleSide,
    });

    // 15. THẢM THỰC VẬT ĐỈNH NÚI (Karst Mountain Tropical Foliage)
    this.materials.karstMoss = new THREE.MeshStandardMaterial({
      color: 0x3b533d,
      roughness: 0.92,
      metalness: 0.0,
      flatShading: true,
      side: THREE.DoubleSide,
    });

    // 16. BIỂN MÂY BỒNG BỀNH (Ethereal Morning Sea of Clouds)
    this.materials.cloudMist = new THREE.MeshStandardMaterial({
      color: 0xf0f5fa,
      transparent: true,
      opacity: 0.65,
      roughness: 0.95,
      metalness: 0.0,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    // 17. MẶT NƯỚC SÔNG NGÔ ĐỒNG / TRÀNG AN (Reflective Water)
    this.materials.waterSurface = new THREE.MeshStandardMaterial({
      color: 0x2d4857,
      roughness: 0.18,
      metalness: 0.35,
      side: THREE.DoubleSide,
    });

    // Duyệt qua TẤT CẢ các vật liệu kiến trúc để đảm bảo 100% bật DoubleSide & Specular Clamped
    Object.values(this.materials).forEach(mat => {
      if (mat) {
        mat.side = THREE.DoubleSide;
        if (mat.roughness !== undefined && mat.roughness < 0.12) {
          mat.roughness = 0.14;
        }
        if (mat.clearcoat !== undefined && mat.clearcoat > 0.8) {
          mat.clearcoat = 0.8;
        }
        if (mat.clearcoatRoughness !== undefined && mat.clearcoatRoughness < 0.15) {
          mat.clearcoatRoughness = 0.16;
        }
        mat.needsUpdate = true;
      }
    });

    console.log("Đã bật DoubleSide và tính toán lại Normals (Anti-Fireflies Clamped)");
  }

  get(name) {
    const mat = this.materials[name] || this.materials.whiteMarble;
    if (mat) {
      mat.side = THREE.DoubleSide;
    }
    return mat;
  }
}
