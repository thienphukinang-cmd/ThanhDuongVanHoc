import * as THREE from 'three';

/**
 * INDOCHINE BALUSTRADES SYSTEM (HỆ THỐNG LAN CAN CỔ ĐIỂN ĐÔNG DƯƠNG)
 * 
 * Chuẩn mực Kỹ thuật & Tối ưu:
 * 1. Chiều cao chuẩn 1.1m:
 *    - Gờ đáy (Base Plinth): 0.16m
 *    - Thân con tiện tiện tròn kiểu Pháp - Đông Dương: 0.78m
 *    - Tay vịn trên cùng (Handrail) bo vát cạnh: 0.16m
 *    - Tổng chiều cao: 1.10m
 * 
 * 2. Vị trí lắp đặt:
 *    - Toàn bộ chu vi mép ngoài cùng (Perimeter) ở cả 3 tầng (Tầng 1, 2, 3) tại tọa độ +-62.5m.
 *    - Mép hành lang trong (Corridor Void) ở Tầng 2 và 3 bao quanh giếng trời 44m x 44m.
 * 
 * 3. Tối ưu hóa WebGL tối thượng:
 *    - Sử dụng THREE.InstancedMesh gom toàn bộ hàng ngàn con tiện vào DUY NHẤT 1 Draw Call.
 *    - Sử dụng THREE.InstancedMesh gom toàn bộ các trụ chính (Master Posts).
 *    - Tính toán computeBoundingBox() và computeBoundingSphere() đầy đủ.
 *    - Frustum culling false & khử độc NaN phòng ngừa triệt để.
 */

export class IndochineBalustrades {
  constructor(materialLibrary = null) {
    this.matLib = materialLibrary;
    this.group = new THREE.Group();
    this.group.name = "Indochine_Balustrades_System";

    this.initSystem();
  }

  getMat(name) {
    return this.matLib?.get?.(name) ?? new THREE.MeshStandardMaterial({
      color: 0xf5f3ee,
      roughness: 0.25,
      metalness: 0.05,
      side: THREE.DoubleSide
    });
  }

  /**
   * Helper chuẩn hóa và khử độc NaN cho Geometry
   */
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
   * Tạo hình dáng con tiện cổ điển Indochine (LatheGeometry)
   * Chiều cao: 0.78m, phân bố đường cong bình hoa / hồ lô Đông Dương mềm mại
   */
  createBalusterGeometry() {
    const points = [
      new THREE.Vector2(0.065, 0.0),
      new THREE.Vector2(0.065, 0.08),
      new THREE.Vector2(0.055, 0.10),
      new THREE.Vector2(0.075, 0.14),
      new THREE.Vector2(0.070, 0.18),
      new THREE.Vector2(0.052, 0.22),
      new THREE.Vector2(0.088, 0.36),
      new THREE.Vector2(0.082, 0.46),
      new THREE.Vector2(0.046, 0.54),
      new THREE.Vector2(0.052, 0.58),
      new THREE.Vector2(0.046, 0.62),
      new THREE.Vector2(0.068, 0.70),
      new THREE.Vector2(0.072, 0.75),
      new THREE.Vector2(0.065, 0.78)
    ];

    const geo = new THREE.LatheGeometry(points, 10);
    this.prepareGeometry(geo);
    return geo;
  }

  /**
   * Tạo hình dáng trụ chính (Master Post) với gờ chỉ vuông
   */
  createMasterPostGeometry() {
    const geo = new THREE.BoxGeometry(0.36, 1.14, 0.36);
    this.prepareGeometry(geo);
    return geo;
  }

  initSystem() {
    try {
      const balusterGeo = this.createBalusterGeometry();
      const masterPostGeo = this.createMasterPostGeometry();

      const marbleMat = this.getMat('indochineBalusterMarble') || this.getMat('whiteMarble');
      const woodMat = this.getMat('polishedMahogany');
      const goldMat = this.getMat('royalGold');

      // Danh sách các đoạn lan can (Segments) trên cả 3 tầng
      const segments = [];

      // -----------------------------------------------------------------------
      // 1. TẦNG 1 (Elevation Y = 0.0): CHU VI NGOÀI CÙNG (+-62.5m)
      // -----------------------------------------------------------------------
      // Cánh Bắc: Z = -62.5 (chạy suốt từ -62.5 đến 62.5)
      segments.push({ p1: [-62.5, -62.5], p2: [62.5, -62.5], y: 0.0, name: "Perimeter_North_L1" });
      // Cánh Tây: X = -62.5 (chạy suốt từ -62.5 đến 62.5)
      segments.push({ p1: [-62.5, -62.5], p2: [-62.5, 62.5], y: 0.0, name: "Perimeter_West_L1" });
      // Cánh Đông: X = 62.5 (chạy suốt từ -62.5 đến 62.5)
      segments.push({ p1: [62.5, -62.5], p2: [62.5, 62.5], y: 0.0, name: "Perimeter_East_L1" });
      // Cánh Nam: Z = 62.5 có lối vào chính giữa [-6, 6]
      segments.push({ p1: [-62.5, 62.5], p2: [-6.0, 62.5], y: 0.0, name: "Perimeter_SouthLeft_L1" });
      segments.push({ p1: [6.0, 62.5], p2: [62.5, 62.5], y: 0.0, name: "Perimeter_SouthRight_L1" });

      // -----------------------------------------------------------------------
      // 2. TẦNG 2 (Elevation Y = 10.0): CHU VI NGOÀI & HÀNH LANG TRONG
      // -----------------------------------------------------------------------
      // Ngoại vi 4 cạnh chạy trọn vẹn
      segments.push({ p1: [-62.5, -62.5], p2: [62.5, -62.5], y: 10.0, name: "Perimeter_North_L2" });
      segments.push({ p1: [-62.5, 62.5], p2: [62.5, 62.5], y: 10.0, name: "Perimeter_South_L2" });
      segments.push({ p1: [-62.5, -62.5], p2: [-62.5, 62.5], y: 10.0, name: "Perimeter_West_L2" });
      segments.push({ p1: [62.5, -62.5], p2: [62.5, 62.5], y: 10.0, name: "Perimeter_East_L2" });

      // Hành lang trong hướng giếng trời 44m x 44m (tọa độ +-22m)
      segments.push({ p1: [-22.0, -22.0], p2: [22.0, -22.0], y: 10.0, name: "Corridor_North_L2" });
      segments.push({ p1: [-22.0, 22.0], p2: [22.0, 22.0], y: 10.0, name: "Corridor_South_L2" });

      // Cánh Tây & Đông mở khoảng thông thủy (Z = 13.0m đến 18.0m) để vế thang chữ Y kết nối trực tiếp vào sàn Tầng 2
      segments.push({ p1: [-22.0, -22.0], p2: [-22.0, 13.0], y: 10.0, name: "Corridor_West_North_L2" });
      segments.push({ p1: [-22.0, 18.0], p2: [-22.0, 22.0], y: 10.0, name: "Corridor_West_South_L2" });
      segments.push({ p1: [22.0, -22.0], p2: [22.0, 13.0], y: 10.0, name: "Corridor_East_North_L2" });
      segments.push({ p1: [22.0, 18.0], p2: [22.0, 22.0], y: 10.0, name: "Corridor_East_South_L2" });

      // -----------------------------------------------------------------------
      // 3. TẦNG 3 (Elevation Y = 20.0): CHU VI NGOÀI & HÀNH LANG TRONG
      // -----------------------------------------------------------------------
      // Ngoại vi 4 cạnh chạy trọn vẹn
      segments.push({ p1: [-62.5, -62.5], p2: [62.5, -62.5], y: 20.0, name: "Perimeter_North_L3" });
      segments.push({ p1: [-62.5, 62.5], p2: [62.5, 62.5], y: 20.0, name: "Perimeter_South_L3" });
      segments.push({ p1: [-62.5, -62.5], p2: [-62.5, 62.5], y: 20.0, name: "Perimeter_West_L3" });
      segments.push({ p1: [62.5, -62.5], p2: [62.5, 62.5], y: 20.0, name: "Perimeter_East_L3" });

      // Hành lang trong giếng trời 44m x 44m
      segments.push({ p1: [-22.0, -22.0], p2: [22.0, -22.0], y: 20.0, name: "Corridor_North_L3" });
      segments.push({ p1: [-22.0, 22.0], p2: [22.0, 22.0], y: 20.0, name: "Corridor_South_L3" });

      // Cánh Tây & Đông mở khoảng thông thủy (Z = -18.0m đến -13.0m) cho cầu thang Tầng 2 lên Tầng 3
      segments.push({ p1: [-22.0, -22.0], p2: [-22.0, -18.0], y: 20.0, name: "Corridor_West_North_L3" });
      segments.push({ p1: [-22.0, -13.0], p2: [-22.0, 22.0], y: 20.0, name: "Corridor_West_South_L3" });
      segments.push({ p1: [22.0, -22.0], p2: [22.0, -18.0], y: 20.0, name: "Corridor_East_North_L3" });
      segments.push({ p1: [22.0, -13.0], p2: [22.0, 22.0], y: 20.0, name: "Corridor_East_South_L3" });

      // -----------------------------------------------------------------------
      // TÍNH TOÁN MA TRẬN CHO INSTANCED MESH
      // -----------------------------------------------------------------------
      const balusterSpacing = 0.44; // Khoảng cách giữa các con tiện
      const postSpacing = 6.2;      // Khoảng cách giữa các trụ chính

      const balusterTransforms = [];
      const postTransforms = [];
      const dummy = new THREE.Object3D();

      // Nhóm chứa gờ đáy và tay vịn
      const railsGroup = new THREE.Group();
      railsGroup.name = "Continuous_Rails_And_Plinths";

      segments.forEach((seg) => {
        const x1 = seg.p1[0];
        const z1 = seg.p1[1];
        const x2 = seg.p2[0];
        const z2 = seg.p2[1];
        const y = seg.y;

        const dx = x2 - x1;
        const dz = z2 - z1;
        const len = Math.hypot(dx, dz);
        if (len < 0.5) return;

        const dirX = dx / len;
        const dirZ = dz / len;
        const angle = Math.atan2(dz, dx);

        // A. TẠO GỜ ĐÁY (Base Plinth: cao 0.16m, rộng 0.26m)
        const baseGeo = new THREE.BoxGeometry(len, 0.16, 0.26);
        this.prepareGeometry(baseGeo);
        const baseMesh = new THREE.Mesh(baseGeo, marbleMat);
        baseMesh.frustumCulled = false;
        baseMesh.position.set((x1 + x2) / 2, y + 0.08, (z1 + z2) / 2);
        baseMesh.rotation.y = -angle;
        baseMesh.receiveShadow = true;
        baseMesh.castShadow = false;
        railsGroup.add(baseMesh);

        // B. TẠO TAY VỊN TRÊN CÙNG (Handrail: cao 0.16m, rộng 0.26m) BẰNG GỖ TRẦM BÓNG VIỀN VÀNG
        const railGeo = new THREE.BoxGeometry(len, 0.14, 0.24);
        this.prepareGeometry(railGeo);
        const railMesh = new THREE.Mesh(railGeo, woodMat);
        railMesh.frustumCulled = false;
        railMesh.position.set((x1 + x2) / 2, y + 1.10 - 0.07, (z1 + z2) / 2);
        railMesh.rotation.y = -angle;
        railMesh.receiveShadow = true;
        railMesh.castShadow = false;
        railsGroup.add(railMesh);

        // Nẹp vàng hoàng gia trang trí chạy dưới tay vịn
        const goldTrimGeo = new THREE.BoxGeometry(len, 0.03, 0.25);
        this.prepareGeometry(goldTrimGeo);
        const goldTrimMesh = new THREE.Mesh(goldTrimGeo, goldMat);
        goldTrimMesh.frustumCulled = false;
        goldTrimMesh.position.set((x1 + x2) / 2, y + 1.10 - 0.15, (z1 + z2) / 2);
        goldTrimMesh.rotation.y = -angle;
        railsGroup.add(goldTrimMesh);

        // C. TÍNH TOÁN VỊ TRÍ TRỤ CHÍNH (Master Posts)
        const postCount = Math.max(1, Math.round(len / postSpacing));
        const postStep = len / postCount;
        for (let p = 0; p <= postCount; p++) {
          const dist = p * postStep;
          const px = x1 + dirX * dist;
          const pz = z1 + dirZ * dist;
          const py = y + 0.57; // Tâm trụ cao 1.14m

          dummy.position.set(px, py, pz);
          dummy.rotation.set(0, -angle, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();

          postTransforms.push(dummy.matrix.clone());
        }

        // D. TÍNH TOÁN VỊ TRÍ HÀNG CON TIỆN (Balusters)
        const balCount = Math.max(1, Math.floor(len / balusterSpacing));
        const balStep = len / balCount;
        for (let b = 0; b < balCount; b++) {
          const dist = (b + 0.5) * balStep;
          
          // Kiểm tra xem vị trí có bị trùng với trụ chính không (tránh chồng chéo)
          let overlapsPost = false;
          for (let p = 0; p <= postCount; p++) {
            if (Math.abs(dist - p * postStep) < 0.28) {
              overlapsPost = true;
              break;
            }
          }
          if (overlapsPost) continue;

          const bx = x1 + dirX * dist;
          const bz = z1 + dirZ * dist;
          const by = y + 0.16; // Đặt trên gờ đáy

          dummy.position.set(bx, by, bz);
          dummy.rotation.set(0, -angle, 0);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();

          balusterTransforms.push(dummy.matrix.clone());
        }
      });

      this.group.add(railsGroup);

      // -----------------------------------------------------------------------
      // KHỞI TẠO THREE.InstancedMesh CHO TOÀN BỘ CON TIỆN (1 SINGLE DRAW CALL)
      // -----------------------------------------------------------------------
      const totalBalusters = balusterTransforms.length;
      console.log(`%c[INDOCHINE BALUSTRADES] Tạo ${totalBalusters} con tiện qua THREE.InstancedMesh (1 Draw Call)!`, "color: #39e58c; font-weight: bold;");

      const balusterInstanced = new THREE.InstancedMesh(balusterGeo, marbleMat, totalBalusters);
      balusterInstanced.name = "Instanced_Indochine_Balusters";
      balusterInstanced.frustumCulled = false;
      balusterInstanced.castShadow = false; // Tắt hoàn toàn shadow pass cho hàng ngàn con tiện nhỏ
      balusterInstanced.receiveShadow = true;
      balusterInstanced.matrixAutoUpdate = false;

      for (let i = 0; i < totalBalusters; i++) {
        balusterInstanced.setMatrixAt(i, balusterTransforms[i]);
      }
      balusterInstanced.instanceMatrix.needsUpdate = true;
      balusterInstanced.computeBoundingBox();
      balusterInstanced.computeBoundingSphere();
      this.group.add(balusterInstanced);

      // -----------------------------------------------------------------------
      // KHỞI TẠO THREE.InstancedMesh CHO TOÀN BỘ TRỤ CHÍNH (MASTER POSTS)
      // -----------------------------------------------------------------------
      const totalPosts = postTransforms.length;
      const postInstanced = new THREE.InstancedMesh(masterPostGeo, marbleMat, totalPosts);
      postInstanced.name = "Instanced_Balustrade_MasterPosts";
      postInstanced.frustumCulled = false;
      postInstanced.castShadow = false;
      postInstanced.receiveShadow = true;
      postInstanced.matrixAutoUpdate = false;

      for (let i = 0; i < totalPosts; i++) {
        postInstanced.setMatrixAt(i, postTransforms[i]);
      }
      postInstanced.instanceMatrix.needsUpdate = true;
      postInstanced.computeBoundingBox();
      postInstanced.computeBoundingSphere();
      this.group.add(postInstanced);

      balusterInstanced.userData = { excludeFromCollision: true, preventMerge: true };
      postInstanced.userData = { excludeFromCollision: true, preventMerge: true };
      this.group.userData = { excludeFromCollision: true, preventMerge: true };

      this.group.traverse((c) => {
        c.userData = c.userData || {};
        c.userData.excludeFromCollision = true;
        c.userData.preventMerge = true;
      });
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo IndochineBalustrades:", err);
    }
  }

  getGroup() {
    return this.group;
  }
}
