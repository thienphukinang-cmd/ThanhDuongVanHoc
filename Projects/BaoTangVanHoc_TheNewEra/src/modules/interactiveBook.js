import * as THREE from 'three';
export { registerInteractiveBook } from './PortalInteraction.js';

/**
 * INTERACTIVE BOOK MODULE (PHÒNG MẪU 01 - TẦNG 2: TRUYỆN KIỀU NGUYỄN DU)
 * 
 * 1. Bệ Trưng Bày (Pedestal):
 *    - Vị trí: Tâm phòng 01 Tầng 2 (X: -48, Y: 10, Z: 19).
 *    - Cấu trúc: CylinderGeometry (đường kính 1.6m, cao 1.0m) đá cẩm thạch trắng viền vàng.
 *    - Nguồn sáng: PointLight màu vàng hổ phách dịu (distance: 8m, intensity: 1.5).
 * 
 * 2. Cuốn Sách Ma Thuật (Magic Book Placeholder):
 *    - Kích thước: BoxGeometry(0.8m, 0.18m, 1.1m) lơ lửng tại Y = 11.6m.
 *    - Góc nghiêng: Nghiêng nhẹ 30 độ (Math.PI / 6) như đang mở trên giá đọc.
 *    - Vật liệu: MeshStandardMaterial xanh ngọc bích đậm viền kim loại vàng, emissive vàng kim (mặc định 0.2).
 *    - Hoạt ảnh: Nhấp nhô sin (Math.sin(time) * 0.08) và tự xoay chậm quanh trục Y.
 */

export class InteractiveBook {
  constructor(scene = null, camera = null, renderer = null, materialLibrary = null, portalInteraction = null, options = {}) {
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.matLib = materialLibrary;
    this.portalInteraction = portalInteraction;

    this.options = {
      roomId: options?.roomId ?? 'room_201',
      roomName: options?.roomName ?? 'Phòng 01 (Tầng 2) • Không gian Truyện Kiều',
      position: options?.position ?? new THREE.Vector3(-48.0, 10.0, 19.0),
      bookBaseY: 11.6,
    };

    this.group = new THREE.Group();
    this.group.name = `Literature_Room01_Pedestal_Book`;

    try {
      this.initPedestal();
      this.initMagicBook();

      // Vô hiệu hóa Frustum Culling cho toàn bộ khối tĩnh thuộc bệ và sách
      this.group.traverse((child) => {
        if (child.isMesh) {
          child.frustumCulled = false;
        }
      });

      if (this.scene?.add) {
        this.scene.add(this.group);
      }

      // Đăng ký cuốn sách với module tương tác PortalInteraction
      if (this.portalInteraction && this.bookMesh) {
        this.portalInteraction.registerTarget(this.bookMesh, {
          id: 'truyen_kieu',
          title: 'TRUYỆN KIỀU – NGUYỄN DU',
          author: 'Đại thi hào Nguyễn Du (1765 - 1820)',
          genre: 'Truyện thơ Nôm (Văn học Trung đại)',
          quote: 'Đoạn trường tân thanh – Khúc ca bi tráng về tài mệnh tương đố và khát vọng tự do.'
        });
      }
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo InteractiveBook:", err);
    }
  }

  getMat(name) {
    return this.matLib?.get?.(name) ?? new THREE.MeshStandardMaterial({ color: 0x999999, side: THREE.DoubleSide });
  }

  /**
   * 1. BỆ TRƯNG BÀY TRUNG TÂM (PEDESTAL)
   * - Đường kính 1.6m (bán kính 0.8m), cao 1.0m bằng đá cẩm thạch trắng viền vàng
   * - PointLight vàng hổ phách dịu (distance: 8m, intensity: 1.5)
   */
  initPedestal() {
    const pos = this.options.position;
    const pedestalGroup = new THREE.Group();
    pedestalGroup.name = "Pedestal_Group";
    pedestalGroup.position.set(pos.x, pos.y, pos.z);

    const whiteMarbleMat = this.getMat('whiteMarble');
    const goldMat = this.getMat('royalGold');

    // Thân bệ đỡ: CylinderGeometry(0.8, 0.8, 1.0, 32)
    const pedestalGeo = new THREE.CylinderGeometry(0.8, 0.8, 1.0, 32);
    pedestalGeo.computeVertexNormals();
    pedestalGeo.computeBoundingBox();
    pedestalGeo.computeBoundingSphere();

    const pedestalMesh = new THREE.Mesh(pedestalGeo, whiteMarbleMat);
    pedestalMesh.frustumCulled = false;
    pedestalMesh.position.y = 0.5; // Đáy bệ tiếp xúc mặt sàn Y = 10m, đỉnh ở Y = 11.0m
    pedestalMesh.receiveShadow = true;
    pedestalMesh.castShadow = true;
    pedestalGroup.add(pedestalMesh);

    // Vành chỉ vàng chân bệ
    const plinthRingGeo = new THREE.CylinderGeometry(0.85, 0.85, 0.08, 32);
    plinthRingGeo.computeVertexNormals();
    plinthRingGeo.computeBoundingBox();
    plinthRingGeo.computeBoundingSphere();

    const plinthRing = new THREE.Mesh(plinthRingGeo, goldMat);
    plinthRing.frustumCulled = false;
    plinthRing.position.y = 0.04;
    pedestalGroup.add(plinthRing);

    // Gờ viền vàng bo đỉnh bệ đá
    const topRimGeo = new THREE.TorusGeometry(0.80, 0.035, 12, 36);
    topRimGeo.computeVertexNormals();
    topRimGeo.computeBoundingBox();
    topRimGeo.computeBoundingSphere();

    const topRim = new THREE.Mesh(topRimGeo, goldMat);
    topRim.frustumCulled = false;
    topRim.rotation.x = Math.PI / 2;
    topRim.position.y = 1.0;
    pedestalGroup.add(topRim);

    // Vòng ma trận phù điêu phát quang nhẹ trên mặt bệ đá
    const runeRingGeo = new THREE.RingGeometry(0.35, 0.72, 32);
    runeRingGeo.computeVertexNormals();
    runeRingGeo.computeBoundingBox();
    runeRingGeo.computeBoundingSphere();

    const runeMat = new THREE.MeshStandardMaterial({
      color: 0xffd269,
      emissive: 0xffaa22,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      side: THREE.DoubleSide
    });
    const runeRing = new THREE.Mesh(runeRingGeo, runeMat);
    runeRing.frustumCulled = false;
    runeRing.rotation.x = -Math.PI / 2;
    runeRing.position.y = 1.005;
    pedestalGroup.add(runeRing);
    this.runeRing = runeRing;

    // Nguồn sáng cục bộ: PointLight màu vàng hổ phách dịu (distance: 8m, intensity: 1.5)
    const pedestalLight = new THREE.PointLight(0xffb84d, 1.5, 8.0, 1.5);
    pedestalLight.position.set(0, 1.25, 0); // Cao độ Y = 11.25m
    pedestalLight.castShadow = true;
    pedestalLight.shadow.bias = -0.0005;
    pedestalGroup.add(pedestalLight);
    this.pedestalLight = pedestalLight;

    this.group.add(pedestalGroup);
  }

  /**
   * 2. MÔ HÌNH CUỐN SÁCH MA THUẬT (MAGIC BOOK PLACEHOLDER)
   * - BoxGeometry tỷ lệ 0.8m x 0.18m x 1.1m lơ lửng tại Y = 11.6m
   * - Nghiêng nhẹ 30 độ (Math.PI / 6) như đang mở trên giá đọc
   * - Màu xanh ngọc bích đậm viền kim loại vàng, emissive vàng kim (mặc định 0.2)
   */
  initMagicBook() {
    const pos = this.options.position;
    const baseY = this.options.bookBaseY; // 11.6m

    // Group chứa toàn bộ cuốn sách để thực hiện hoạt ảnh nhấp nhô & xoay
    this.bookHolderGroup = new THREE.Group();
    this.bookHolderGroup.name = "Magic_Book_Holder_Room01";
    this.bookHolderGroup.position.set(pos.x, baseY, pos.z);

    // Sub-group để giữ góc nghiêng 30 độ cố định trong khi quay trục Y
    this.bookTiltGroup = new THREE.Group();
    this.bookTiltGroup.name = "Magic_Book_Tilt_Group";
    this.bookTiltGroup.rotation.x = Math.PI / 6; // Nghiêng nhẹ 30 độ như đang mở trên giá đọc
    this.bookHolderGroup.add(this.bookTiltGroup);

    // Vật liệu sách: MeshStandardMaterial màu xanh ngọc bích đậm viền kim loại vàng
    this.bookMaterial = new THREE.MeshStandardMaterial({
      color: 0x0b3d2e,                     // Xanh ngọc bích đậm sang trọng
      roughness: 0.22,
      metalness: 0.18,
      emissive: new THREE.Color(0xffc436), // Màu vàng kim
      emissiveIntensity: 0.2,             // Cường độ mặc định 0.2
      side: THREE.DoubleSide,
    });

    // Vật liệu ruột giấy dó ngà vàng
    const pagesMaterial = new THREE.MeshStandardMaterial({
      color: 0xf6f0dc,
      roughness: 0.55,
      metalness: 0.04,
      emissive: new THREE.Color(0x664411),
      emissiveIntensity: 0.15,
      side: THREE.DoubleSide,
    });

    const goldTrimMat = this.getMat('royalGold');

    // Khối sách chính: BoxGeometry(0.8m, 0.18m, 1.1m)
    const bookCoverGeo = new THREE.BoxGeometry(0.80, 0.18, 1.10);
    bookCoverGeo.computeVertexNormals();
    bookCoverGeo.computeBoundingBox();
    bookCoverGeo.computeBoundingSphere();

    this.bookMesh = new THREE.Mesh(bookCoverGeo, this.bookMaterial);
    this.bookMesh.frustumCulled = false;
    this.bookMesh.castShadow = true;
    this.bookMesh.receiveShadow = true;
    this.bookMesh.name = "MagicBook_InteractableMesh_TruyenKieu";
    this.bookTiltGroup.add(this.bookMesh);

    // Khối ruột trang sách ngà vàng lộ ra ở mép
    const pagesGeo = new THREE.BoxGeometry(0.74, 0.13, 1.04);
    pagesGeo.computeVertexNormals();
    pagesGeo.computeBoundingBox();
    pagesGeo.computeBoundingSphere();

    const pagesMesh = new THREE.Mesh(pagesGeo, pagesMaterial);
    pagesMesh.frustumCulled = false;
    pagesMesh.position.set(0.015, 0, 0);
    this.bookTiltGroup.add(pagesMesh);

    // Hoa văn 4 góc kim loại mạ vàng nẹp góc sách
    const cornerGeo = new THREE.BoxGeometry(0.16, 0.20, 0.16);
    cornerGeo.computeVertexNormals();
    cornerGeo.computeBoundingBox();
    cornerGeo.computeBoundingSphere();

    const corners = [
      [-0.35, 0, -0.50],
      [0.35, 0, -0.50],
      [-0.35, 0, 0.50],
      [0.35, 0, 0.50],
    ];
    corners.forEach(([cx, cy, cz]) => {
      const corner = new THREE.Mesh(cornerGeo, goldTrimMat);
      corner.frustumCulled = false;
      corner.position.set(cx, cy, cz);
      this.bookTiltGroup.add(corner);
    });

    // Dấu ấn biểu tượng linh khí trên bìa sách (Golden Emblem)
    const crestGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.03, 24);
    crestGeo.computeVertexNormals();
    crestGeo.computeBoundingBox();
    crestGeo.computeBoundingSphere();

    const crestMesh = new THREE.Mesh(crestGeo, goldTrimMat);
    crestMesh.frustumCulled = false;
    crestMesh.rotation.x = Math.PI / 2;
    crestMesh.position.set(0, 0.10, 0);
    this.bookTiltGroup.add(crestMesh);

    // Bụi hạt linh khí xoay quanh cuốn sách
    this.initBookAuraParticles();

    this.group.add(this.bookHolderGroup);
    this.baseFloatingY = baseY;
  }

  /**
   * Bụi hạt linh khí vàng bay lơ lửng quanh cuốn sách
   */
  initBookAuraParticles() {
    const pCount = 50;
    const pGeo = new THREE.BufferGeometry();
    const posArr = new Float32Array(pCount * 3);

    for (let i = 0; i < pCount; i++) {
      const angle = (i / pCount) * Math.PI * 2;
      const r = 0.75 + Math.random() * 0.45;
      posArr[i * 3] = Math.cos(angle) * r;
      posArr[i * 3 + 1] = (Math.random() - 0.5) * 0.5;
      posArr[i * 3 + 2] = Math.sin(angle) * r;
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    pGeo.computeBoundingBox();
    pGeo.computeBoundingSphere();

    const pMat = new THREE.PointsMaterial({
      size: 0.10,
      color: 0xffdf77,
      transparent: true,
      blending: THREE.AdditiveBlending,
      opacity: 0.8
    });

    this.auraParticles = new THREE.Points(pGeo, pMat);
    this.bookHolderGroup.add(this.auraParticles);
  }

  /**
   * Hoạt ảnh trôi nổi (Floating Animation) trong vòng lặp render:
   * - Nhấp nhô sin: Math.sin(time) * 0.08
   * - Tự xoay quanh trục Y với tốc độ chậm
   */
  update(delta = 0.016, elapsedTime = 0) {
    try {
      if (this.bookHolderGroup) {
        // Trôi nổi nhấp nhô theo hàm sin
        const floatOffset = Math.sin(elapsedTime * 1.6) * 0.08;
        this.bookHolderGroup.position.y = this.baseFloatingY + floatOffset;

        // Tự xoay quanh trục Y với tốc độ chậm
        this.bookHolderGroup.rotation.y = elapsedTime * 0.35;
      }

      // Xoay vòng ma thuật trên mặt bệ đá
      if (this.runeRing) {
        this.runeRing.rotation.z = -elapsedTime * 0.2;
      }

      // Hạt linh khí xoay ngược chiều
      if (this.auraParticles) {
        this.auraParticles.rotation.y = -elapsedTime * 0.6;
      }
    } catch (err) {
      // Defensive loop
    }
  }

  destroy() {
    try {
      if (this.group?.parent) {
        this.group.parent.remove(this.group);
      }
    } catch (e) {}
  }
}
