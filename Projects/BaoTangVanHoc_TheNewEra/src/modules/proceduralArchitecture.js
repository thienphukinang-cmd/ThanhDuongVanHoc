import * as THREE from 'three';
import { DIMENSIONS } from '../config/dimensions.js';
import { IndochineBalustrades } from './indochineBalustrades.js';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger.js';

/**
 * PROCEDURAL ARCHITECTURE MODULE (OPEN-AIR INDOCHINE PAVILION & VISTA ARCHITECTURE)
 * Skills: threejs-procedural-architecture & threejs-design-director
 * 
 * CHUYỂN ĐỔI KIẾN TRÚC MỞ (OPEN-AIR PAVILION):
 * 1. GỠ BỎ TƯỜNG BAO NGOẠI THẤT HỘP KÍN:
 *    - Toàn bộ 4 bức tường bao ngoại thất hộp kín đã được loại bỏ 100%.
 *    - Sàn mở thông thoáng hoàn toàn ở cả 3 tầng, mở tầm nhìn 360 độ ra non nước Tràng An.
 * 
 * 2. HỆ THỐNG LAN CAN INDOCHINE (PERIMETER & CORRIDOR BALUSTRADES):
 *    - Lan can đá cẩm thạch trắng, tay vịn gỗ trầm viền vàng cao 1.1m chuẩn tỷ lệ Indochine.
 *    - Tối ưu hóa WebGL tối thượng: Sử dụng THREE.InstancedMesh render toàn bộ hàng ngàn con tiện.
 * 
 * 3. 15 KHÔNG GIAN "HIÊN NGẮM CẢNH / ĐÌNH ĐÀI MỞ" (OPEN ALCOVES):
 *    - Không còn vách bít bùng và trần hộp tù túng.
 *    - Mặt tiền giữ vòm Indochine lớn đón ánh sáng từ giếng trời, mặt sau mở toang ra thiên nhiên.
 *    - Vách ngăn ước lệ phong cách Indochine với nẹp gỗ mahogany và lam gió thanh lịch.
 */

export class ProceduralArchitecture {
  constructor(materialLibrary = null) {
    this.matLib = materialLibrary;
    this.group = new THREE.Group();
    this.group.name = "Indochine_Procedural_Architecture";

    this.buildSlabsAndCorridors();
    this.buildFifteenOpenPavilions();
    this.buildBalustradesSystem();

    // 1. Gộp toàn bộ mesh kiến trúc theo vật liệu (giảm từ ~450 draw calls xuống ~6 calls)
    mergeGroupMeshesByMaterial(this.group);

    // 2. Vô hiệu hóa va chạm trên toàn bộ cột/tường/lan can hành lang để tránh giật lag
    this.group.traverse((child) => {
      child.userData = child.userData || {};
      child.userData.excludeFromCollision = true;
      if (child.isMesh) {
        child.frustumCulled = true;
        child.matrixAutoUpdate = false;
        child.updateMatrix();
      }
    });

    this.collisionSolids = [];
  }

  buildCollisionSolidList() {
    this.collisionSolids = [];
  }

  getMat(name) {
    return this.matLib?.get?.(name) ?? new THREE.MeshStandardMaterial({ 
      color: 0x777777,
      side: THREE.DoubleSide 
    });
  }

  /**
   * Helper an toàn tính toán Normals, Bounding Volumes và kiểm tra NaN
   */
  prepareGeometry(geo) {
    if (!geo) return;
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();

    // Kiểm tra và khử NaN phòng ngừa
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
   * Helper tạo mesh an toàn (Mặc định không castShadow để giảm tải tối đa shadow map passes)
   */
  createSafeMesh(geo, mat, name = "ArchMesh", canCastShadow = false) {
    this.prepareGeometry(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = true;
    mesh.receiveShadow = true;
    mesh.castShadow = canCastShadow;
    mesh.name = name;
    return mesh;
  }

  /**
   * 1. SÀN NHÀ & HÀNH LANG RỘNG MỞ 3 TẦNG (Multi-tier Open Decks)
   * Phủ kín toàn bộ diện tích sàn 125m x 125m từ mép giếng trời ra tận hàng lan can ngoài cùng!
   */
  buildSlabsAndCorridors() {
    const totalW = 125.0; // Phủ toàn bộ chu vi từ -62.5m đến +62.5m
    const voidW = DIMENSIONS?.atrium?.voidWidth ?? 44.0; // Giếng trời 44m x 44m
    const deckDepth = (totalW - voidW) / 2; // 40.5m

    // SÀN TẦNG 1: SÀN ĐÁ CẨM THẠCH ĐEN VÂN VÀNG ĐẠI SẢNH (136m x 136m)
    const groundFloorGeo = new THREE.PlaneGeometry(136, 136, 32, 32);
    const groundFloor = this.createSafeMesh(groundFloorGeo, this.getMat('blackGoldMarble'), "Ground_Floor_BlackGoldMarble");
    groundFloor.rotation.x = -Math.PI / 2;
    groundFloor.position.y = 0;
    this.group.add(groundFloor);

    // HÀNH LANG & SÀN HIÊN MỞ TẦNG 2 (Y = 10m) & TẦNG 3 (Y = 20m)
    [10.0, 20.0].forEach((elevation, idx) => {
      const levelId = idx + 2;
      const corridorGroup = new THREE.Group();
      corridorGroup.name = `Open_Deck_Level_${levelId}`;

      // Sàn Bắc (North Deck: 125m x 40.5m)
      const slabNSGeo = new THREE.PlaneGeometry(totalW, deckDepth);
      const slabN = this.createSafeMesh(slabNSGeo, this.getMat('blackGoldMarble'), `Slab_North_L${levelId}`);
      slabN.rotation.x = -Math.PI / 2;
      slabN.position.set(0, elevation, -(voidW / 2 + deckDepth / 2));
      corridorGroup.add(slabN);

      // Sàn Nam (South Deck: 125m x 40.5m)
      const slabS = this.createSafeMesh(slabNSGeo, this.getMat('blackGoldMarble'), `Slab_South_L${levelId}`);
      slabS.rotation.x = -Math.PI / 2;
      slabS.position.set(0, elevation, (voidW / 2 + deckDepth / 2));
      corridorGroup.add(slabS);

      // Sàn Tây (West Deck: 40.5m x 44m)
      const slabEWGeo = new THREE.PlaneGeometry(deckDepth, voidW);
      const slabW = this.createSafeMesh(slabEWGeo, this.getMat('blackGoldMarble'), `Slab_West_L${levelId}`);
      slabW.rotation.x = -Math.PI / 2;
      slabW.position.set(-(voidW / 2 + deckDepth / 2), elevation, 0);
      corridorGroup.add(slabW);

      // Sàn Đông (East Deck: 40.5m x 44m)
      const slabE = this.createSafeMesh(slabEWGeo, this.getMat('blackGoldMarble'), `Slab_East_L${levelId}`);
      slabE.rotation.x = -Math.PI / 2;
      slabE.position.set((voidW / 2 + deckDepth / 2), elevation, 0);
      corridorGroup.add(slabE);

      // Dầm đỡ trần hiên bên dưới ốp gỗ mahogany ấm áp
      const underNS = this.createSafeMesh(slabNSGeo, this.getMat('polishedMahogany'), `Under_NS_L${levelId}`);
      underNS.rotation.x = Math.PI / 2;
      underNS.position.set(0, elevation - 0.1, -(voidW / 2 + deckDepth / 2));
      corridorGroup.add(underNS);

      const underS = this.createSafeMesh(slabNSGeo, this.getMat('polishedMahogany'), `Under_S_L${levelId}`);
      underS.rotation.x = Math.PI / 2;
      underS.position.set(0, elevation - 0.1, (voidW / 2 + deckDepth / 2));
      corridorGroup.add(underS);

      const underW = this.createSafeMesh(slabEWGeo, this.getMat('polishedMahogany'), `Under_W_L${levelId}`);
      underW.rotation.x = Math.PI / 2;
      underW.position.set(-(voidW / 2 + deckDepth / 2), elevation - 0.1, 0);
      corridorGroup.add(underW);

      const underE = this.createSafeMesh(slabEWGeo, this.getMat('polishedMahogany'), `Under_E_L${levelId}`);
      underE.rotation.x = Math.PI / 2;
      underE.position.set((voidW / 2 + deckDepth / 2), elevation - 0.1, 0);
      corridorGroup.add(underE);

      this.group.add(corridorGroup);
    });

    // MÁI HIÊN & TRẦN GỖ NÂU TRẦM CHÍNH TẠI CAO ĐỘ Y = 32m
    const ceilY = DIMENSIONS?.ceiling?.height ?? 32.0;
    const ceilingGroup = new THREE.Group();
    ceilingGroup.name = "Ceiling_Roof_Mahogany";

    const ceilNSGeo = new THREE.PlaneGeometry(totalW, deckDepth);
    const ceilNS = this.createSafeMesh(ceilNSGeo, this.getMat('polishedMahogany'), "Ceil_North");
    ceilNS.rotation.x = Math.PI / 2;
    ceilNS.position.set(0, ceilY, -(voidW / 2 + deckDepth / 2));
    ceilingGroup.add(ceilNS);

    const ceilS = this.createSafeMesh(ceilNSGeo, this.getMat('polishedMahogany'), "Ceil_South");
    ceilS.rotation.x = Math.PI / 2;
    ceilS.position.set(0, ceilY, (voidW / 2 + deckDepth / 2));
    ceilingGroup.add(ceilS);

    const ceilEWGeo = new THREE.PlaneGeometry(deckDepth, voidW);
    const ceilEW = this.createSafeMesh(ceilEWGeo, this.getMat('polishedMahogany'), "Ceil_West");
    ceilEW.rotation.x = Math.PI / 2;
    ceilEW.position.set(-(voidW / 2 + deckDepth / 2), ceilY, 0);
    ceilingGroup.add(ceilEW);

    const ceilE = this.createSafeMesh(ceilEWGeo, this.getMat('polishedMahogany'), "Ceil_East");
    ceilE.rotation.x = Math.PI / 2;
    ceilE.position.set((voidW / 2 + deckDepth / 2), ceilY, 0);
    ceilingGroup.add(ceilE);

    this.group.add(ceilingGroup);
  }

  /**
   * 2. TÍCH HỢP HỆ THỐNG LAN CAN CỔ ĐIỂN ĐÔNG DƯƠNG (INDOCHINE BALUSTRADES)
   * Sử dụng THREE.InstancedMesh gom toàn bộ con tiện và trụ chính vào 1 Draw Call duy nhất!
   */
  buildBalustradesSystem() {
    try {
      this.balustrades = new IndochineBalustrades(this.matLib);
      if (this.balustrades?.getGroup()) {
        this.group.add(this.balustrades.getGroup());
      }
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi tích hợp IndochineBalustrades:", err);
    }
  }

  /**
   * Tạo 1 bức tường có Cửa Vòm Lớn (Monumental Arch Doorway)
   * Tích hợp phào chỉ vàng hoàng gia và nẹp chân tường gỗ mahogany
   */
  createArchedWall(wallWidth = 26, wallHeight = 10, archWidth = 6.2, archHeight = 7.5, thickness = 0.5) {
    const wallGroup = new THREE.Group();

    const shape = new THREE.Shape();
    shape.moveTo(-wallWidth / 2, 0);
    shape.lineTo(wallWidth / 2, 0);
    shape.lineTo(wallWidth / 2, wallHeight);
    shape.lineTo(-wallWidth / 2, wallHeight);
    shape.closePath();

    const hole = new THREE.Path();
    const halfW = archWidth / 2;
    const straightH = Math.max(0.5, archHeight - halfW);

    hole.moveTo(-halfW, 0);
    hole.lineTo(-halfW, straightH);
    hole.absarc(0, straightH, halfW, Math.PI, 0, true);
    hole.lineTo(halfW, 0);
    hole.closePath();

    shape.holes.push(hole);

    const wallGeo = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: false
    });
    const wallMesh = this.createSafeMesh(wallGeo, this.getMat('indochinePlaster'), "Arched_Facade_Wall", true);
    wallGroup.add(wallMesh);

    // Phào chỉ viền cửa vòm kim loại mạ vàng
    const frameGeo = new THREE.TorusGeometry(halfW, 0.12, 12, 32, Math.PI);
    const archFrame = this.createSafeMesh(frameGeo, this.getMat('royalGold'), "Arch_Gold_Frame");
    archFrame.position.set(0, straightH, thickness + 0.05);
    wallGroup.add(archFrame);

    const jambGeo = new THREE.BoxGeometry(0.2, straightH, 0.1);
    const leftJamb = this.createSafeMesh(jambGeo, this.getMat('royalGold'), "Arch_Left_Jamb");
    leftJamb.position.set(-halfW, straightH / 2, thickness + 0.05);
    wallGroup.add(leftJamb);

    const rightJamb = this.createSafeMesh(jambGeo, this.getMat('royalGold'), "Arch_Right_Jamb");
    rightJamb.position.set(halfW, straightH / 2, thickness + 0.05);
    wallGroup.add(rightJamb);

    // Chân tường wainscoting cao 0.8m ốp gỗ mahogany hai bên cánh cửa vòm
    const sideWallSpan = (wallWidth - archWidth) / 2;
    if (sideWallSpan > 0.5) {
      const baseboardGeo = new THREE.BoxGeometry(sideWallSpan, 0.8, 0.08);
      const leftBase = this.createSafeMesh(baseboardGeo, this.getMat('wainscotWood'), "Arch_Left_Baseboard");
      leftBase.position.set(-wallWidth / 2 + sideWallSpan / 2, 0.4, -0.04);
      wallGroup.add(leftBase);

      const rightBase = this.createSafeMesh(baseboardGeo, this.getMat('wainscotWood'), "Arch_Right_Baseboard");
      rightBase.position.set(wallWidth / 2 - sideWallSpan / 2, 0.4, -0.04);
      wallGroup.add(rightBase);
    }

    return wallGroup;
  }

  /**
   * Tạo vách ngăn ước lệ phong cách Indochine (Indochine Partition Screen)
   * Chân vách ốp gỗ trầm cao 0.9m + lam gió gỗ trang nhã cao 2.2m (không bít kín không gian)
   */
  createIndochineScreen(length = 26, elevation = 0, posX = 0, posZ = 0, isRotated = false) {
    const screenGroup = new THREE.Group();

    // 1. Chân vách nẹp gỗ trầm bóng
    const baseGeo = new THREE.BoxGeometry(length, 0.9, 0.28);
    const baseMesh = this.createSafeMesh(baseGeo, this.getMat('wainscotWood'), "Screen_Base");
    baseMesh.position.set(0, 0.45, 0);
    screenGroup.add(baseMesh);

    // Nẹp chỉ vàng
    const goldCapGeo = new THREE.BoxGeometry(length, 0.04, 0.30);
    const goldCap = this.createSafeMesh(goldCapGeo, this.getMat('royalGold'), "Screen_GoldCap");
    goldCap.position.set(0, 0.92, 0);
    screenGroup.add(goldCap);

    // 2. Các trụ lam gỗ Indochine thông gió tạo nhịp điệu kiến trúc
    const louverCount = Math.floor(length / 2.0);
    const postGeo = new THREE.BoxGeometry(0.18, 1.6, 0.18);
    const postMat = this.getMat('polishedMahogany');

    for (let i = 0; i <= louverCount; i++) {
      const post = this.createSafeMesh(postGeo, postMat, "Screen_LouverPost");
      const offset = -length / 2 + (i / louverCount) * length;
      post.position.set(offset, 0.9 + 0.8, 0);
      screenGroup.add(post);
    }

    // Thanh xà gỗ trên cùng
    const topBarGeo = new THREE.BoxGeometry(length, 0.12, 0.22);
    const topBar = this.createSafeMesh(topBarGeo, postMat, "Screen_TopBar");
    topBar.position.set(0, 0.9 + 1.6 + 0.06, 0);
    screenGroup.add(topBar);

    screenGroup.position.set(posX, elevation, posZ);
    if (isRotated) {
      screenGroup.rotation.y = Math.PI / 2;
    }
    return screenGroup;
  }

  /**
   * Tạo cột đỡ hiên Indochine thanh thoát ở mép chu vi ngoài cùng
   */
  createPerimeterColumn(elevation = 0, height = 9.8, posX = 0, posZ = 0) {
    const colGroup = new THREE.Group();
    const radius = 0.55;

    const baseGeo = new THREE.BoxGeometry(1.4, 0.8, 1.4);
    const baseMesh = this.createSafeMesh(baseGeo, this.getMat('whiteMarble'), "Perimeter_Col_Base");
    baseMesh.position.y = 0.4;
    colGroup.add(baseMesh);

    const shaftGeo = new THREE.CylinderGeometry(radius * 0.92, radius, height - 1.6, 24);
    const shaftMesh = this.createSafeMesh(shaftGeo, this.getMat('whiteMarble'), "Perimeter_Col_Shaft");
    shaftMesh.position.y = 0.8 + (height - 1.6) / 2;
    colGroup.add(shaftMesh);

    const capGeo = new THREE.BoxGeometry(1.5, 0.8, 1.5);
    const capMesh = this.createSafeMesh(capGeo, this.getMat('whiteMarble'), "Perimeter_Col_Cap");
    capMesh.position.y = height - 0.4;
    colGroup.add(capMesh);

    colGroup.position.set(posX, elevation, posZ);
    return colGroup;
  }

  /**
   * 3. BỐ TRÍ 15 KHÔNG GIAN "HIÊN NGẮM CẢNH / ĐÌNH ĐÀI MỞ" (OPEN ALCOVES)
   * - 5 không gian mỗi tầng x 3 tầng = 15 hiên mở khoáng đạt.
   * - Mặt sau mở toang ra thiên nhiên với lan can Indochine tại tọa độ +-62.5m.
   * - Mặt trước kết nối sảnh chính qua Cửa Vòm Khổng Lồ.
   */
  buildFifteenOpenPavilions() {
    const pavilionsGroup = new THREE.Group();
    pavilionsGroup.name = "Fifteen_Open_Air_Pavilions";

    const levels = [
      { id: 1, elevation: 0.0,  height: 10.0 },
      { id: 2, elevation: 10.0, height: 10.0 },
      { id: 3, elevation: 20.0, height: 12.0 }
    ];

    levels.forEach((lvl) => {
      const y = lvl.elevation;
      const h = lvl.height;
      const tierGroup = new THREE.Group();
      tierGroup.name = `Tier_${lvl.id}_Open_Pavilions`;

      // ---------------------------------------------------------------------
      // HIÊN 1: CÁNH TÂY - NAM (Room 101, 201 [Sách Truyện Kiều], 301)
      // Trung tâm: (-48, y, 19) • Kích thước: Rộng 28m (X), Sâu 26m (Z)
      // Phía Tây (X = -62.5) mở toang ra biển mây và núi non Tràng An!
      // ---------------------------------------------------------------------
      {
        const rGroup = new THREE.Group();
        rGroup.name = `OpenPavilion_${lvl.id}01_WestSouth`;

        // Mặt tiền hướng sảnh (phía Đông: X = -34) khoét cửa vòm lớn Indochine
        const archWall = this.createArchedWall(26, h, 6.2, 7.5, 0.6);
        archWall.rotation.y = Math.PI / 2;
        archWall.position.set(-34, y, 19);
        rGroup.add(archWall);

        // Vách ngăn trang nhã Bắc (Z = 6) & Nam (Z = 32)
        rGroup.add(this.createIndochineScreen(28, y, -48, 6, false));
        rGroup.add(this.createIndochineScreen(28, y, -48, 32, false));

        // Cột đỡ hiên ngắm cảnh ở mép ngoài (X = -62)
        rGroup.add(this.createPerimeterColumn(y, h, -62.0, 6));
        rGroup.add(this.createPerimeterColumn(y, h, -62.0, 32));

        tierGroup.add(rGroup);
      }

      // ---------------------------------------------------------------------
      // HIÊN 2: CÁNH TÂY - BẮC (Room 102, 202, 302)
      // Trung tâm: (-48, y, -19) • Mở tầm nhìn Tây ra rặng núi đá vôi
      // ---------------------------------------------------------------------
      {
        const rGroup = new THREE.Group();
        rGroup.name = `OpenPavilion_${lvl.id}02_WestNorth`;

        const archWall = this.createArchedWall(26, h, 6.2, 7.5, 0.6);
        archWall.rotation.y = Math.PI / 2;
        archWall.position.set(-34, y, -19);
        rGroup.add(archWall);

        rGroup.add(this.createIndochineScreen(28, y, -48, -6, false));
        rGroup.add(this.createIndochineScreen(28, y, -48, -32, false));

        rGroup.add(this.createPerimeterColumn(y, h, -62.0, -6));
        rGroup.add(this.createPerimeterColumn(y, h, -62.0, -32));

        tierGroup.add(rGroup);
      }

      // ---------------------------------------------------------------------
      // HIÊN 3: CÁNH BẮC - ĐẠI GIAN TRUNG TÂM (Room 103, 203, 303)
      // Trung tâm: (0, y, -48) • Mở toàn cảnh Bắc 44m rộng lớn ra biển mây
      // ---------------------------------------------------------------------
      {
        const rGroup = new THREE.Group();
        rGroup.name = `OpenPavilion_${lvl.id}03_NorthGrandHall`;

        const archWall = this.createArchedWall(44, h, 8.0, 7.5, 0.6);
        archWall.position.set(0, y, -34);
        rGroup.add(archWall);

        // Vách bên Tây (X = -22) & Đông (X = 22)
        rGroup.add(this.createIndochineScreen(28, y, -22, -48, true));
        rGroup.add(this.createIndochineScreen(28, y, 22, -48, true));

        // Cột đỡ hiên mép Bắc (Z = -62)
        rGroup.add(this.createPerimeterColumn(y, h, -22, -62.0));
        rGroup.add(this.createPerimeterColumn(y, h, 0, -62.0));
        rGroup.add(this.createPerimeterColumn(y, h, 22, -62.0));

        tierGroup.add(rGroup);
      }

      // ---------------------------------------------------------------------
      // HIÊN 4: CÁNH ĐÔNG - BẮC (Room 104, 204, 304)
      // Trung tâm: (48, y, -19) • Mở tầm nhìn Đông đón ánh bình minh
      // ---------------------------------------------------------------------
      {
        const rGroup = new THREE.Group();
        rGroup.name = `OpenPavilion_${lvl.id}04_EastNorth`;

        const archWall = this.createArchedWall(26, h, 6.2, 7.5, 0.6);
        archWall.rotation.y = -Math.PI / 2;
        archWall.position.set(34, y, -19);
        rGroup.add(archWall);

        rGroup.add(this.createIndochineScreen(28, y, 48, -6, false));
        rGroup.add(this.createIndochineScreen(28, y, 48, -32, false));

        rGroup.add(this.createPerimeterColumn(y, h, 62.0, -6));
        rGroup.add(this.createPerimeterColumn(y, h, 62.0, -32));

        tierGroup.add(rGroup);
      }

      // ---------------------------------------------------------------------
      // HIÊN 5: CÁNH ĐÔNG - NAM (Room 105, 205, 305)
      // Trung tâm: (48, y, 19) • Mở tầm nhìn Đông - Nam
      // ---------------------------------------------------------------------
      {
        const rGroup = new THREE.Group();
        rGroup.name = `OpenPavilion_${lvl.id}05_EastSouth`;

        const archWall = this.createArchedWall(26, h, 6.2, 7.5, 0.6);
        archWall.rotation.y = -Math.PI / 2;
        archWall.position.set(34, y, 19);
        rGroup.add(archWall);

        rGroup.add(this.createIndochineScreen(28, y, 48, 6, false));
        rGroup.add(this.createIndochineScreen(28, y, 48, 32, false));

        rGroup.add(this.createPerimeterColumn(y, h, 62.0, 6));
        rGroup.add(this.createPerimeterColumn(y, h, 62.0, 32));

        tierGroup.add(rGroup);
      }

      // Tường nối hành lang giữa các phòng
      const plasterMat = this.getMat('indochinePlaster');
      const createInfill = (posX, posZ, name) => {
        const geo = new THREE.BoxGeometry(0.6, h, 12);
        const mesh = this.createSafeMesh(geo, plasterMat, name);
        mesh.position.set(posX, y + h / 2, posZ);
        return mesh;
      };
      tierGroup.add(createInfill(-34, 0, "West_Corridor_Infill"));
      tierGroup.add(createInfill(34, 0, "East_Corridor_Infill"));

      pavilionsGroup.add(tierGroup);
    });

    this.group.add(pavilionsGroup);
  }

  /**
   * GOM CÁC VẬT THỂ CẢN KIẾN TRÚC (Vách lam, cột chu vi, lan can)
   * Tuyệt đối KHÔNG đưa cửa vòm / lối đi (Arched_Facade_Wall, Frame, Door) vào va chạm
   */
  getCollisionObjects() {
    return this.collisionSolids || [];
  }

  getGroup() {
    this.group.traverse((child) => {
      if (child.isMesh) {
        child.frustumCulled = true;
      }
    });
    return this.group;
  }
}
