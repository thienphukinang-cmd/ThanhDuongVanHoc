import * as THREE from 'three';

/**
 * EXTERIOR VISTA & ENVIRONMENT MODULE (KHUNG CẢNH KỲ VĨ TRÀNG AN / NINH BÌNH)
 * 
 * 1. Dãy núi đá vôi Tràng An / Ninh Bình:
 *    - Các chóp núi đá vôi dựng đứng (Tower Karsts) đặc trưng non nước hữu tình Việt Nam.
 *    - Tối ưu hóa cực đại: Chế tác 3 nguyên mẫu chóp núi đá vôi (Archetypes) và phân bổ
 *      quanh 360 độ qua THREE.InstancedMesh với độ cao, kích thước và góc xoay ngẫu nhiên.
 *    - Phối màu chuyển tầng: Chân núi đá xám sương mờ -> Vách đá dựng đứng -> Đỉnh núi phủ thảm thực vật nhiệt đới xanh mướt.
 * 
 * 2. Biển mây bồng bềnh (Sea of Clouds):
 *    - Các tầng mây bồng bềnh lững lờ tại độ cao Y = -22m đến +4m bao bọc chân bảo tàng.
 *    - Tự động trôi lượn nhẹ nhàng trong vòng lặp render tạo cảm giác bảo tàng lơ lửng trên cõi bồng lai.
 * 
 * 3. Mặt nước Ngô Đồng / Đầm Tràng An:
 *    - Gương nước phẳng lặng ở đáy thung lũng (Y = -28m) phản chiếu mây trời và bóng núi.
 * 
 * Áp dụng triệt để: computeVertexNormals(), computeBoundingBox(), computeBoundingSphere(), khử độc NaN.
 */

export class ExteriorVista {
  constructor(scene = null, materialLibrary = null) {
    this.scene = scene;
    this.matLib = materialLibrary;
    this.group = new THREE.Group();
    this.group.name = "Exterior_Vista_TrangAn_Landscape";

    this.cloudRings = [];

    try {
      this.initKarstMountainRanges();
      this.initSeaOfClouds();
      this.initValleyWaterPlane();

      if (this.scene?.add) {
        this.scene.add(this.group);
      }
      console.log("%c✓ Đã kiến tạo Khung cảnh Ngoại cảnh Tràng An / Ninh Bình thành công!", "color: #39e58c; font-weight: bold;");
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo ExteriorVista:", err);
    }
  }

  getMat(name) {
    return this.matLib?.get?.(name) ?? new THREE.MeshStandardMaterial({
      color: 0x60707a,
      roughness: 0.85,
      metalness: 0.05,
      side: THREE.DoubleSide
    });
  }

  prepareGeometry(geo) {
    if (!geo) return;
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();

    ['position', 'normal'].forEach(attrName => {
      const attr = geo.attributes?.[attrName];
      if (attr?.array) {
        let dirty = false;
        for (let i = 0; i < attr.array.length; i++) {
          if (!Number.isFinite(attr.array[i])) {
            attr.array[i] = attrName === 'normal' && (i % 3 === 1) ? 1.0 : 0.0;
            dirty = true;
          }
        }
        if (dirty) attr.needsUpdate = true;
      }
    });
  }

  /**
   * Tạo 1 nguyên mẫu chóp núi đá vôi Tràng An với các sườn vách đá phân tầng
   */
  createKarstArchetypeGeometry(height = 140, baseR = 48, topR = 10, segments = 10, tiers = 8, noiseSeed = 1.0) {
    const geo = new THREE.CylinderGeometry(topR, baseR, height, segments, tiers);
    const pos = geo.attributes.position;
    const colors = [];

    // Màu sắc chuyển tầng
    const colorFoot = new THREE.Color(0x35434d);   // Chân núi sẫm màu
    const colorCliff = new THREE.Color(0x6b7a86);  // Vách đá vôi xám nhạt
    const colorCrown = new THREE.Color(0x38543b);  // Đỉnh núi phủ thảm cây xanh nhiệt đới

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      // Chuẩn hóa chiều cao t = 0 (đáy) -> 1 (đỉnh)
      const t = (y + height / 2) / height;

      // Góc phương vị
      const angle = Math.atan2(z, x);

      // Tạo nếp nhăn và rãnh karst tự nhiên của núi đá vôi Tràng An
      const fluting = Math.sin(angle * 5.0 + noiseSeed) * 0.16 + Math.cos(angle * 9.0) * 0.08;
      const terrace = Math.sin(t * Math.PI * 6.0) * 0.06;
      const factor = 1.0 + fluting + terrace;

      x *= factor;
      z *= factor;

      // Đỉnh núi chóp nón nhô gồ ghề
      if (t > 0.85) {
        y += Math.sin(angle * 4.0) * (height * 0.04);
      }

      pos.setXYZ(i, x, y, z);

      // Gán màu theo độ cao (Vertex Color)
      let vertexColor = new THREE.Color();
      if (t < 0.3) {
        vertexColor.lerpColors(colorFoot, colorCliff, t / 0.3);
      } else if (t < 0.75) {
        vertexColor.copy(colorCliff);
      } else {
        vertexColor.lerpColors(colorCliff, colorCrown, (t - 0.75) / 0.25);
      }
      colors.push(vertexColor.r, vertexColor.g, vertexColor.b);
    }

    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.prepareGeometry(geo);
    return geo;
  }

  /**
   * Khởi tạo dãy núi đá vôi 360 độ qua THREE.InstancedMesh
   */
  initKarstMountainRanges() {
    // 3 Nguyên mẫu chóp núi đa dạng
    const geoA = this.createKarstArchetypeGeometry(130, 46, 12, 10, 8, 1.2); // Tháp đá thanh thoát
    const geoB = this.createKarstArchetypeGeometry(175, 62, 16, 11, 9, 2.7); // Đỉnh núi hùng vĩ đồ sộ
    const geoC = this.createKarstArchetypeGeometry(110, 40, 8, 9, 7, 4.5);   // Chóp đá nhọn hiểm trở

    const karstMat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0.05,
      flatShading: true,
      side: THREE.DoubleSide
    });

    // Danh sách phân bổ vị trí núi
    const mountainConfigs = [];

    // VÒNG 1: DÃY NÚI TRUNG CẢNH (Bán kính 240m - 340m quanh bảo tàng)
    // Nhìn thấy rõ rệt ngay sau lan can các phòng mở
    const countRing1 = 16;
    for (let i = 0; i < countRing1; i++) {
      const angle = (i / countRing1) * Math.PI * 2 + (i % 2 === 0 ? 0.08 : -0.08);
      const dist = 250 + (i % 3) * 35;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const scaleY = 0.85 + ((i * 13) % 7) * 0.08;
      const scaleXZ = 0.9 + ((i * 7) % 5) * 0.08;
      const rotY = angle + Math.PI / 4;
      const archetype = i % 3; // 0, 1, 2
      const y = -10 + (scaleY * 130) / 2; // Đáy cắm xuống biển mây

      mountainConfigs.push({ x, y, z, rotY, scaleX: scaleXZ, scaleY, scaleZ: scaleXZ, archetype });
    }

    // VÒNG 2: DÃY NÚI HẬU CẢNH ĐỒ SỘ (Bán kính 400m - 550m)
    const countRing2 = 18;
    for (let i = 0; i < countRing2; i++) {
      const angle = (i / countRing2) * Math.PI * 2 + 0.15;
      const dist = 420 + (i % 4) * 45;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const scaleY = 1.15 + ((i * 11) % 6) * 0.12;
      const scaleXZ = 1.2 + ((i * 5) % 4) * 0.15;
      const rotY = (i * 1.7);
      const archetype = (i + 1) % 3;
      const y = -15 + (scaleY * 150) / 2;

      mountainConfigs.push({ x, y, z, rotY, scaleX: scaleXZ, scaleY, scaleZ: scaleXZ, archetype });
    }

    // VÒNG 3: DÃY NÚI CHÂN TRỜI HUYỀN ẢO (Bán kính 650m - 900m)
    const countRing3 = 14;
    for (let i = 0; i < countRing3; i++) {
      const angle = (i / countRing3) * Math.PI * 2 + 0.32;
      const dist = 680 + (i % 3) * 70;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const scaleY = 1.6 + ((i * 9) % 5) * 0.15;
      const scaleXZ = 1.7 + ((i * 7) % 4) * 0.15;
      const rotY = (i * 2.3);
      const archetype = (i + 2) % 3;
      const y = -20 + (scaleY * 160) / 2;

      mountainConfigs.push({ x, y, z, rotY, scaleX: scaleXZ, scaleY, scaleZ: scaleXZ, archetype });
    }

    // Gom thành 3 cụm InstancedMesh theo 3 archetype
    const geos = [geoA, geoB, geoC];
    [0, 1, 2].forEach(typeIdx => {
      const items = mountainConfigs.filter(m => m.archetype === typeIdx);
      if (items.length === 0) return;

      const instMesh = new THREE.InstancedMesh(geos[typeIdx], karstMat, items.length);
      instMesh.name = `Instanced_Karst_Mountains_Type_${typeIdx + 1}`;
      instMesh.frustumCulled = false;
      instMesh.castShadow = false; // Tắt hoàn toàn đổ bóng núi xa (300m - 1500m) để tiết kiệm shadow passes
      instMesh.receiveShadow = false;
      instMesh.matrixAutoUpdate = false;

      const dummy = new THREE.Object3D();
      items.forEach((m, idx) => {
        dummy.position.set(m.x, m.y, m.z);
        dummy.rotation.set(0, m.rotY, 0);
        dummy.scale.set(m.scaleX, m.scaleY, m.scaleZ);
        dummy.updateMatrix();
        instMesh.setMatrixAt(idx, dummy.matrix);
      });

      instMesh.instanceMatrix.needsUpdate = true;
      instMesh.computeBoundingBox();
      instMesh.computeBoundingSphere();
      this.group.add(instMesh);
    });
  }

  /**
   * Biển mây bồng bềnh (Sea of Clouds) lững lờ quanh chân bảo tàng
   */
  initSeaOfClouds() {
    const cloudMat = this.getMat('cloudMist');

    // 3 Tầng mây đồng tâm bán kính lớn ở cao độ Y = -16m, -4m, +2m
    const cloudLayers = [
      { radius: 750, y: -16.0, opacity: 0.72, rotSpeed: 0.0006 },
      { radius: 550, y: -6.0,  opacity: 0.58, rotSpeed: -0.0009 },
      { radius: 380, y: 0.0,   opacity: 0.42, rotSpeed: 0.0012 }
    ];

    cloudLayers.forEach((layer, idx) => {
      // Vành khăn đĩa mây (RingGeometry) bao quanh bảo tàng từ r=70m đến r=radius
      const ringGeo = new THREE.RingGeometry(72, layer.radius, 48, 8);
      ringGeo.rotateX(-Math.PI / 2);
      this.prepareGeometry(ringGeo);

      const layerMat = cloudMat.clone();
      layerMat.opacity = layer.opacity;

      const cloudMesh = new THREE.Mesh(ringGeo, layerMat);
      cloudMesh.name = `Cloud_Sea_Layer_${idx + 1}`;
      cloudMesh.position.y = layer.y;
      cloudMesh.frustumCulled = false;
      cloudMesh.receiveShadow = false;

      this.group.add(cloudMesh);
      this.cloudRings.push({ mesh: cloudMesh, speed: layer.rotSpeed });
    });
  }

  /**
   * Mặt nước phẳng lặng của thung lũng sông Ngô Đồng (Y = -26m)
   */
  initValleyWaterPlane() {
    const waterGeo = new THREE.PlaneGeometry(1800, 1800, 16, 16);
    waterGeo.rotateX(-Math.PI / 2);
    this.prepareGeometry(waterGeo);

    const waterMat = this.getMat('waterSurface');
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.name = "TrangAn_Valley_Water_Mirror";
    waterMesh.position.y = -26.0;
    waterMesh.frustumCulled = false;
    waterMesh.receiveShadow = true;
    waterMesh.matrixAutoUpdate = false;
    waterMesh.updateMatrix();

    this.group.add(waterMesh);
  }

  /**
   * Hoạt ảnh mây trôi nhẹ nhàng trong vòng lặp Render
   */
  update(delta = 0.016, elapsedTime = 0) {
    if (!this.cloudRings) return;
    this.cloudRings.forEach(item => {
      if (item.mesh) {
        item.mesh.rotation.y += item.speed * (delta * 60);
      }
    });
  }

  getGroup() {
    return this.group;
  }
}
