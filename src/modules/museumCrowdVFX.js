import * as THREE from 'three';

/**
 * HỆ THỐNG KHÁCH THAM QUAN BÓNG ĐEN NGHỆ THUẬT (SILHOUETTE CROWD SIMULATION)
 * Tấp nập khắp Đại Sảnh, Hành Lang và các Phòng Triển Lãm Văn Học.
 * 
 * Tối ưu hóa tuyệt đối 60+ FPS cho NVIDIA GeForce GTX 1050 2GB VRAM:
 * - Dùng chung Geometry cho toàn bộ các cá thể bóng đen (Zero duplicate memory overhead).
 * - Vật liệu THREE.MeshBasicMaterial đơn sắc trầm (#0d121c, opacity: 0.76), không tính ánh sáng phức tạp.
 * - Tự động ẩn toàn bộ khi người chơi bước vào Cõi Sách (Y > 100 hoặc __stttRealmActive).
 */

export function createMuseumCrowdSystem(scene, options = {}) {
  const optionsObj = typeof options === 'number' ? { totalVisitors: options } : (options || {});
  const { totalVisitors = 42 } = optionsObj;

  const crowdGroup = new THREE.Group();
  crowdGroup.name = 'Museum_Silhouette_Crowd_System';

  if (scene && typeof scene.add === 'function') {
    scene.add(crowdGroup);
  }

  // =========================================================================
  // 1. VẬT LIỆU BÓNG ĐEN TRẦM VÀ ĐĨA BÓNG ĐỔ SÀN (SHARED MATERIALS)
  // =========================================================================
  const silhouetteMat = new THREE.MeshBasicMaterial({
    color: 0x0d121c, // Đen trầm huyền bí theo chuẩn Art Director
    transparent: true,
    opacity: 0.76,   // Độ mờ nghệ thuật 0.76
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false
  });

  const floorShadowMat = new THREE.MeshBasicMaterial({
    color: 0x05070c,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false
  });

  // =========================================================================
  // 2. HÌNH KHỐI NHẸ DÙNG CHUNG (SHARED GEOMETRIES CHO TOÀN BỘ ĐÁM ĐÔNG)
  // Ghép: Thân áo dáng dài thuôn sàn + Thân ngực + Vai bo tròn + Cổ + Đầu cầu + Vòng bóng đổ
  // =========================================================================
  const skirtGeo = new THREE.CylinderGeometry(0.20, 0.34, 0.92, 10);
  const torsoGeo = new THREE.CylinderGeometry(0.25, 0.20, 0.52, 10);
  const shoulderGeo = new THREE.SphereGeometry(0.24, 10, 8);
  const neckGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.14, 8);
  const headGeo = new THREE.SphereGeometry(0.165, 12, 10);
  const shadowGeo = new THREE.CircleGeometry(0.38, 14);
  shadowGeo.rotateX(-Math.PI / 2);

  function createSilhouetteFigure() {
    const figureRoot = new THREE.Group();
    figureRoot.name = 'Silhouette_Visitor';

    // bodyPivot chứa toàn bộ hình nhân để thực hiện nhịp bước nhấp nhô & lắc lư
    const bodyPivot = new THREE.Group();
    bodyPivot.name = 'Body_Pivot';
    figureRoot.add(bodyPivot);

    // 1. Thân áo dáng dài thuôn xuống sàn
    const skirtMesh = new THREE.Mesh(skirtGeo, silhouetteMat);
    skirtMesh.position.y = 0.46;
    bodyPivot.add(skirtMesh);

    // 2. Thân ngực trên
    const torsoMesh = new THREE.Mesh(torsoGeo, silhouetteMat);
    torsoMesh.position.y = 1.14;
    bodyPivot.add(torsoMesh);

    // 3. Vai bo tròn tự nhiên
    const shoulderMesh = new THREE.Mesh(shoulderGeo, silhouetteMat);
    shoulderMesh.scale.set(1.22, 0.55, 0.75);
    shoulderMesh.position.y = 1.38;
    bodyPivot.add(shoulderMesh);

    // 4. Cổ
    const neckMesh = new THREE.Mesh(neckGeo, silhouetteMat);
    neckMesh.position.y = 1.48;
    bodyPivot.add(neckMesh);

    // 5. Đầu cầu
    const headMesh = new THREE.Mesh(headGeo, silhouetteMat);
    headMesh.position.y = 1.65;
    bodyPivot.add(headMesh);

    // 6. Vòng bóng đổ mờ áp sát mặt sàn
    const floorShadow = new THREE.Mesh(shadowGeo, floorShadowMat);
    floorShadow.position.y = 0.02;
    figureRoot.add(floorShadow);

    figureRoot.userData.bodyPivot = bodyPivot;
    figureRoot.userData.floorShadow = floorShadow;
    return figureRoot;
  }

  // =========================================================================
  // 3. MẠNG LƯỚI ĐIỂM MỐC (WAYPOINTS) PHỦ KHẮP BẢO TÀNG
  // Bao gồm: Sảnh chính (Atrium), Hành lang trái/phải, Chân cầu thang,
  // Phòng Thánh Gióng, Phòng Sơn Tinh - Thủy Tinh (Tầng 1),
  // Phòng Truyện Kiều, Phòng Nam Quốc Sơn Hà, Hành lang lầu 2 (Tầng 2)
  // =========================================================================

  // Mạng lưới Tầng 1 (Y = 0.0m)
  const waypointsFloor1 = [
    // Sảnh chính (Grand Atrium) & Tiền sảnh
    { pos: new THREE.Vector3(0, 0, 26), name: 'Tiền sảnh đón tiếp', zone: 'atrium' },
    { pos: new THREE.Vector3(0, 0, 16), name: 'Sảnh chính phía Nam', zone: 'atrium' },
    { pos: new THREE.Vector3(0, 0, 4), name: 'Khu vực giếng trời trung tâm', zone: 'atrium' },
    { pos: new THREE.Vector3(0, 0, -8), name: 'Sảnh chính phía Bắc', zone: 'atrium' },
    { pos: new THREE.Vector3(-10, 0, 6), name: 'Sảnh chính cánh Tây', zone: 'atrium' },
    { pos: new THREE.Vector3(10, 0, 6), name: 'Sảnh chính cánh Đông', zone: 'atrium' },

    // Chân cầu thang chữ Y (Grand Bifurcated Staircase)
    { pos: new THREE.Vector3(0, 0, 22), name: 'Chân cầu thang trung tâm', zone: 'stairs', lookAt: new THREE.Vector3(0, 5, 8) },
    { pos: new THREE.Vector3(-6, 0, 23), name: 'Chân cầu thang nhánh Tây', zone: 'stairs', lookAt: new THREE.Vector3(-10, 6, 12) },
    { pos: new THREE.Vector3(6, 0, 23), name: 'Chân cầu thang nhánh Đông', zone: 'stairs', lookAt: new THREE.Vector3(10, 6, 12) },

    // Hành lang cánh Trái (Tây - Tầng 1)
    { pos: new THREE.Vector3(-20, 0, 19), name: 'Hành lang Tây Nam Tầng 1', zone: 'corridor' },
    { pos: new THREE.Vector3(-20, 0, 0), name: 'Hành lang Tây Trung tâm Tầng 1', zone: 'corridor' },
    { pos: new THREE.Vector3(-20, 0, -19), name: 'Hành lang Tây Bắc Tầng 1', zone: 'corridor' },
    { pos: new THREE.Vector3(-28, 0, 12), name: 'Ngã rẽ khu trưng bày Tây Nam', zone: 'corridor' },
    { pos: new THREE.Vector3(-28, 0, -12), name: 'Ngã rẽ khu trưng bày Tây Bắc', zone: 'corridor' },

    // Hành lang cánh Phải (Đông - Tầng 1)
    { pos: new THREE.Vector3(20, 0, 19), name: 'Hành lang Đông Nam Tầng 1', zone: 'corridor' },
    { pos: new THREE.Vector3(20, 0, 0), name: 'Hành lang Đông Trung tâm Tầng 1', zone: 'corridor' },
    { pos: new THREE.Vector3(20, 0, -19), name: 'Hành lang Đông Bắc Tầng 1', zone: 'corridor' },
    { pos: new THREE.Vector3(28, 0, 8), name: 'Lối dạo cánh Đông', zone: 'corridor' },

    // PHÒNG THÁNH GIÓNG (Tầng 1 Cánh Tây - Nam: roomCenter [-48, 0, 19])
    { pos: new THREE.Vector3(-34, 0, 19), name: 'Cửa vòm Phòng Thánh Gióng', zone: 'giong', isExhibit: true, lookAt: new THREE.Vector3(-48, 2, 19) },
    { pos: new THREE.Vector3(-42, 0, 19), name: 'Lối chính Phòng Thánh Gióng', zone: 'giong', isExhibit: true, lookAt: new THREE.Vector3(-48, 2.5, 19) },
    { pos: new THREE.Vector3(-46, 0, 15), name: 'Khu vực Bụi tre đằng ngà', zone: 'giong', isExhibit: true, lookAt: new THREE.Vector3(-48, 1.5, 14) },
    { pos: new THREE.Vector3(-48, 0, 23), name: 'Khu vực Ngựa sắt thần phù & Bệ đá', zone: 'giong', isExhibit: true, lookAt: new THREE.Vector3(-48, 3.0, 19) },

    // PHÒNG SƠN TINH - THỦY TINH (Tầng 1 Cánh Tây - Bắc: roomCenter [-48, 0, -19])
    { pos: new THREE.Vector3(-34, 0, -19), name: 'Cửa vòm Phòng Sơn Tinh - Thủy Tinh', zone: 'sttt', isExhibit: true, lookAt: new THREE.Vector3(-48, 2, -19) },
    { pos: new THREE.Vector3(-42, 0, -19), name: 'Lối chính Phòng Sơn Tinh - Thủy Tinh', zone: 'sttt', isExhibit: true, lookAt: new THREE.Vector3(-48, 2, -19) },
    { pos: new THREE.Vector3(-46, 0, -15), name: 'Khu vực Núi Tản Viên & Voi chín ngà', zone: 'sttt', isExhibit: true, lookAt: new THREE.Vector3(-48, 2.2, -16) },
    { pos: new THREE.Vector3(-48, 0, -23), name: 'Khu vực Cột sóng cuộn Thủy Tinh', zone: 'sttt', isExhibit: true, lookAt: new THREE.Vector3(-48, 2.0, -21) }
  ];

  // Mạng lưới Tầng 2 (Y = 10.0m)
  const waypointsFloor2 = [
    // Hành lang mở Tầng 2 nhìn xuống Sảnh chính
    { pos: new THREE.Vector3(-22, 10.0, 15), name: 'Hành lang Tây Nam Tầng 2', zone: 'balcony', lookAt: new THREE.Vector3(0, 0, 0) },
    { pos: new THREE.Vector3(-22, 10.0, 0), name: 'Hành lang Tây Trung tâm Tầng 2', zone: 'balcony', lookAt: new THREE.Vector3(0, 0, 0) },
    { pos: new THREE.Vector3(-22, 10.0, -15), name: 'Hành lang Tây Bắc Tầng 2', zone: 'balcony', lookAt: new THREE.Vector3(0, 0, 0) },
    { pos: new THREE.Vector3(22, 10.0, 12), name: 'Hành lang Đông Nam Tầng 2', zone: 'balcony', lookAt: new THREE.Vector3(0, 0, 0) },
    { pos: new THREE.Vector3(22, 10.0, -12), name: 'Hành lang Đông Bắc Tầng 2', zone: 'balcony', lookAt: new THREE.Vector3(0, 0, 0) },

    // PHÒNG TRUYỆN KIỀU (Tầng 2 Cánh Tây - Nam: roomCenter [-48, 10.0, 19])
    { pos: new THREE.Vector3(-34, 10.0, 19), name: 'Cửa vòm Phòng Truyện Kiều', zone: 'kieu', isExhibit: true, lookAt: new THREE.Vector3(-48, 11.5, 19) },
    { pos: new THREE.Vector3(-42, 10.0, 19), name: 'Lối chính Phòng Truyện Kiều', zone: 'kieu', isExhibit: true, lookAt: new THREE.Vector3(-48, 11.5, 19) },
    { pos: new THREE.Vector3(-46, 10.0, 15), name: 'Khu vực Án thư & Kim Vân Kiều Truyện', zone: 'kieu', isExhibit: true, lookAt: new THREE.Vector3(-48, 11.0, 15) },
    { pos: new THREE.Vector3(-48, 10.0, 23), name: 'Khu vực Lầu Ngưng Bích & Thúy Kiều', zone: 'kieu', isExhibit: true, lookAt: new THREE.Vector3(-48, 12.0, 20) },

    // PHÒNG NAM QUỐC SƠN HÀ (Tầng 2 Cánh Tây - Bắc: roomCenter [-48, 10.0, -19])
    { pos: new THREE.Vector3(-34, 10.0, -19), name: 'Cửa vòm Phòng Nam Quốc Sơn Hà', zone: 'nqsh', isExhibit: true, lookAt: new THREE.Vector3(-48, 11.5, -19) },
    { pos: new THREE.Vector3(-42, 10.0, -19), name: 'Lối chính Phòng Nam Quốc Sơn Hà', zone: 'nqsh', isExhibit: true, lookAt: new THREE.Vector3(-48, 11.5, -19) },
    { pos: new THREE.Vector3(-46, 10.0, -15), name: 'Khu vực Hào khí Sông Như Nguyệt', zone: 'nqsh', isExhibit: true, lookAt: new THREE.Vector3(-48, 11.5, -16) },
    { pos: new THREE.Vector3(-48, 10.0, -23), name: 'Khu vực Tuyên ngôn độc lập & Chiến thuyền', zone: 'nqsh', isExhibit: true, lookAt: new THREE.Vector3(-48, 11.2, -21) }
  ];

  // Danh sách toàn bộ waypoints để tra cứu hoặc ngoại kiểm
  const allWaypoints = [
    ...waypointsFloor1.map(w => w.pos),
    ...waypointsFloor2.map(w => w.pos)
  ];

  // =========================================================================
  // 4. PHÂN BỔ NHÓM KHÁCH (1, 3, 5 NGƯỜI) VÀ KHỞI TẠO ĐÁM ĐÔNG
  // Tỉ lệ: 40% Đi 1 mình, 35% Đi nhóm 3 người, 25% Đi nhóm 5 người
  // Chiều cao: scale.y từ 0.75 (~1.35m) đến 1.18 (~1.92m) kèm tỉ lệ vai tự nhiên
  // =========================================================================
  const visitorGroups = [];
  let spawnedCount = 0;

  while (spawnedCount < totalVisitors) {
    const roll = Math.random();
    // 40% đi 1 mình, 35% đi nhóm 3, 25% đi nhóm 5
    const patternSize = roll < 0.40 ? 1 : (roll < 0.75 ? 3 : 5);
    const actualSize = Math.min(patternSize, totalVisitors - spawnedCount);

    // Phân bổ ~70% khách tham quan ở Tầng 1, ~30% ở Tầng 2
    const isFloor2 = Math.random() < 0.30;
    const currentFloorWaypoints = isFloor2 ? waypointsFloor2 : waypointsFloor1;

    const startWpIdx = Math.floor(Math.random() * currentFloorWaypoints.length);
    let nextWpIdx = (startWpIdx + 1 + Math.floor(Math.random() * (currentFloorWaypoints.length - 1))) % currentFloorWaypoints.length;

    const startWp = currentFloorWaypoints[startWpIdx];
    const groupCenter = startWp.pos.clone();
    groupCenter.x += (Math.random() - 0.5) * 2.5;
    groupCenter.z += (Math.random() - 0.5) * 2.5;

    const groupSpeed = 1.15 + Math.random() * 0.55; // Tốc độ bước bộ khoan thai (1.15 - 1.7 m/s)
    const members = [];

    for (let i = 0; i < actualSize; i++) {
      const figure = createSilhouetteFigure();

      // Đa dạng chiều cao rõ rệt: từ 0.75 (~1.35m) đến 1.18 (~1.92m)
      const heightScale = 0.75 + Math.random() * (1.18 - 0.75);
      // Tỉ lệ ngang vai khác nhau tạo phom người gầy, vừa, hoặc vạm vỡ
      const shoulderScale = 0.86 + Math.random() * 0.30;
      const depthScale = (shoulderScale + 1.0) * 0.5;

      figure.scale.set(shoulderScale, heightScale, depthScale);

      // Đồng bộ kích thước đĩa bóng đổ dưới sàn theo phom người
      if (figure.userData.floorShadow) {
        figure.userData.floorShadow.scale.set(shoulderScale, 1.0, shoulderScale);
      }

      // Đội hình nhóm tự nhiên quanh nhóm trưởng (khoảng cách vai kề vai 0.8m - 1.6m, không chồng chéo)
      const localOffset = new THREE.Vector3(0, 0, 0);
      if (i === 1) {
        localOffset.set(-0.85 - Math.random() * 0.25, 0, -0.40 - Math.random() * 0.25);
      } else if (i === 2) {
        localOffset.set(0.85 + Math.random() * 0.25, 0, -0.40 - Math.random() * 0.25);
      } else if (i === 3) {
        localOffset.set(-1.55 - Math.random() * 0.30, 0, -0.85 - Math.random() * 0.30);
      } else if (i === 4) {
        localOffset.set(1.55 + Math.random() * 0.30, 0, -0.85 - Math.random() * 0.30);
      }

      figure.position.copy(groupCenter).add(localOffset);
      crowdGroup.add(figure);
      spawnedCount++;

      members.push({
        mesh: figure,
        bodyPivot: figure.userData.bodyPivot,
        localOffset,
        walkPhase: Math.random() * Math.PI * 2,
        walkFreq: 5.2 + Math.random() * 1.8,
        heightScale
      });
    }

    const initialHeading = new THREE.Vector3(
      currentFloorWaypoints[nextWpIdx].pos.x - groupCenter.x,
      0,
      currentFloorWaypoints[nextWpIdx].pos.z - groupCenter.z
    ).normalize();

    if (initialHeading.lengthSq() < 0.001) {
      initialHeading.set(0, 0, 1);
    }

    const initialAngle = Math.atan2(initialHeading.x, initialHeading.z);

    visitorGroups.push({
      center: groupCenter,
      heading: initialHeading,
      currentAngle: initialAngle,
      targetAngle: initialAngle,
      waypointsList: currentFloorWaypoints,
      targetWpIdx: nextWpIdx,
      speed: groupSpeed,
      pauseTimer: Math.random() < 0.3 ? (1.5 + Math.random() * 2.0) : 0,
      members
    });
  }

  // =========================================================================
  // 5. VÒNG LẶP CẬP NHẬT DI CHUYỂN & HÀNH VI THAM QUAN (60+ FPS OPTIMIZED)
  // =========================================================================
  let lastTime = performance.now();
  let internalClock = 0;
  const tempTarget = new THREE.Vector3();
  const tempDir = new THREE.Vector3();
  const rotatedOffset = new THREE.Vector3();
  const upAxis = new THREE.Vector3(0, 1, 0);

  const updateCrowd = (deltaOrTimestamp = 0.016, elapsedTime = null, camera = null) => {
    // 1. TỰ ĐỘNG ẨN KHI VÀO CÕI SÁCH (CAMERA.Y > 100 HOẶC WINDOW.__stttRealmActive)
    const activeCam = camera || (typeof window !== 'undefined' ? (window.__camera || window.camera) : null);
    const isHighRealm = Boolean(activeCam?.position && activeCam.position.y > 100);
    const isStttActive = typeof window !== 'undefined' && Boolean(window.__stttRealmActive);

    if (isHighRealm || isStttActive) {
      if (crowdGroup.visible) crowdGroup.visible = false;
      return;
    }
    if (!crowdGroup.visible) {
      crowdGroup.visible = true;
    }

    // 2. CHUẨN HÓA THỜI GIAN DELTA VÀ ELAPSED TIME
    let dt = 0.016;
    let nowSec = 0;

    if (deltaOrTimestamp > 100) {
      // Nhận timestamp dạng performance.now()
      dt = Math.min((deltaOrTimestamp - lastTime) * 0.001, 0.1);
      lastTime = deltaOrTimestamp;
      nowSec = deltaOrTimestamp * 0.001;
    } else {
      // Nhận delta chuẩn theo giây từ main loop
      dt = Math.min(Math.max(deltaOrTimestamp || 0.016, 0.001), 0.1);
      if (elapsedTime !== null && elapsedTime !== undefined) {
        nowSec = elapsedTime;
      } else {
        internalClock += dt;
        nowSec = internalClock;
      }
    }

    // 3. CẬP NHẬT TỪNG NHÓM KHÁCH
    for (let g = 0; g < visitorGroups.length; g++) {
      const group = visitorGroups[g];
      const waypoints = group.waypointsList;

      // HÀNH VI 1: DỪNG LẠI 2 - 4 GIÂY ĐỨNG NGẮM HIỆN VẬT / DIORAMA
      if (group.pauseTimer > 0) {
        group.pauseTimer -= dt;

        // Xoay mặt mượt mà về hướng hiện vật hoặc tác phẩm nghệ thuật
        let diff = group.targetAngle - group.currentAngle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        group.currentAngle += diff * Math.min(1.0, dt * 3.5);

        for (let m = 0; m < group.members.length; m++) {
          const mem = group.members[m];
          mem.mesh.rotation.y = group.currentAngle;

          // Hiệu ứng nhịp thở / đung đưa nhẹ khi đứng chiêm ngưỡng hiện vật
          mem.bodyPivot.position.y = Math.sin(nowSec * 2.0 + mem.walkPhase) * 0.018;
          mem.bodyPivot.rotation.z = Math.sin(nowSec * 1.5 + mem.walkPhase) * 0.015;
          mem.bodyPivot.rotation.x = 0;
        }
        continue;
      }

      // HÀNH VI 2: DI CHUYỂN THEO LỘ TRÌNH ĐẾN WAYPOINT TIẾP THEO
      const targetWp = waypoints[group.targetWpIdx];
      tempDir.subVectors(targetWp.pos, group.center);
      tempDir.y = 0; // Khóa di chuyển thăng bằng trên mặt sàn của tầng đó
      const dist = tempDir.length();

      // Khi đến gần điểm mốc (< 1.8m), chọn điểm kế tiếp và quyết định dừng ngắm hiện vật
      if (dist < 1.8) {
        let nextIdx = Math.floor(Math.random() * waypoints.length);
        if (nextIdx === group.targetWpIdx) {
          nextIdx = (nextIdx + 1) % waypoints.length;
        }
        group.targetWpIdx = nextIdx;

        // Thỉnh thoảng dừng lại 2 - 4 giây xoay mặt ngắm hiện vật (tỉ lệ cao hơn tại các phòng trưng bày)
        const currentWp = targetWp;
        const pauseChance = currentWp.isExhibit ? 0.70 : 0.40;

        if (Math.random() < pauseChance) {
          group.pauseTimer = 2.0 + Math.random() * 2.0; // Dừng lại 2 - 4 giây chuẩn xác theo yêu cầu

          // Xoay mặt ngắm hiện vật nếu có tọa độ ngắm (lookAt), hoặc xoay nhẹ theo hướng ngẫu nhiên
          if (currentWp.lookAt) {
            const lookDx = currentWp.lookAt.x - group.center.x;
            const lookDz = currentWp.lookAt.z - group.center.z;
            group.targetAngle = Math.atan2(lookDx, lookDz);
          } else {
            group.targetAngle = group.currentAngle + (Math.random() - 0.5) * 1.2;
          }
        }
        continue;
      }

      // Cập nhật hướng di chuyển (Heading lerp mượt mà)
      tempDir.normalize();
      group.heading.lerp(tempDir, Math.min(1.0, dt * 4.0)).normalize();
      group.center.addScaledVector(group.heading, group.speed * dt);

      // Cập nhật góc quay theo hướng bước đi (tránh giật tại biên [-PI, PI])
      const desiredAngle = Math.atan2(group.heading.x, group.heading.z);
      let headingDiff = desiredAngle - group.currentAngle;
      while (headingDiff < -Math.PI) headingDiff += Math.PI * 2;
      while (headingDiff > Math.PI) headingDiff -= Math.PI * 2;
      group.currentAngle += headingDiff * Math.min(1.0, dt * 5.0);

      // Cập nhật từng thành viên trong nhóm theo đội hình vai kề vai
      for (let m = 0; m < group.members.length; m++) {
        const mem = group.members[m];

        rotatedOffset.copy(mem.localOffset).applyAxisAngle(upAxis, group.currentAngle);
        tempTarget.copy(group.center).add(rotatedOffset);

        mem.mesh.position.lerp(tempTarget, Math.min(1.0, dt * 6.5));
        mem.mesh.rotation.y = group.currentAngle;

        // Hiệu ứng nhấp nhô nhịp bước đi: Math.sin(nowSec * walkFreq + phase)
        const stepWave = Math.sin(nowSec * mem.walkFreq + mem.walkPhase);
        mem.bodyPivot.position.y = Math.abs(stepWave) * 0.055;
        mem.bodyPivot.rotation.z = stepWave * 0.035;
        mem.bodyPivot.rotation.x = 0.035; // Nghiêng nhẹ người về phía trước khi tiến bước
      }
    }
  };

  // Quản lý dọn dẹp tài nguyên khi cần hủy module
  const dispose = () => {
    if (scene && crowdGroup) {
      scene.remove(crowdGroup);
    }
    skirtGeo.dispose();
    torsoGeo.dispose();
    shoulderGeo.dispose();
    neckGeo.dispose();
    headGeo.dispose();
    shadowGeo.dispose();
    silhouetteMat.dispose();
    floorShadowMat.dispose();
  };

  return {
    crowdGroup,
    waypoints: allWaypoints,
    updateCrowd,
    update: updateCrowd,
    dispose
  };
}
