import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  createCarvedHeritagePbrMaterial,
  createSculptedCloudScrollBracket3D,
  attachSculptedCollarRingsToPillar
} from './museumReliefSculptor.js';
import { upgradeRoomWallArchitecture } from './museumWallArchitectureSystem.js';
import {
  createTraditionalArchwayEntrance,
  createCuratedArtifactStation,
  MuseumAutoTourDirector
} from './museumCuratorAndTourSystem.js';
import { MuseumHitboxManager, getMuseumHitboxManager } from './museumHitboxSystem.js';
import {
  buildSonTinhThuyTinhMasterVfx,
  removeOldSonTinhBackgroundAndDarkCones,
  SON_TINH_REALM_OFFSET,
  SON_TINH_LOCAL_POS,
  THUY_TINH_LOCAL_POS
} from './sonTinhWaterMountainVfx.js';
import { setupMuseumWebXRTeleport } from './museumImmersionSystem.js';

/**
 * ============================================================================
 * MUSEUM ULTIMATE 16-SKILLS ORCHESTRATOR
 * TỔNG CHỈ HUY ĐỒNG BỘ 16 KỸ NĂNG NÂNG CẤP BẢO TÀNG VĂN HỌC 3D
 * ============================================================================
 */

const gltfLoader = new GLTFLoader();

/**
 * Dọn dẹp triệt để trần giả và vật thể bay lơ lửng trên đầu Đại Sảnh
 */
export function removeLobbyCeilingAndOverheadClutter(container) {
  if (!container) return;
  const toRemove = [];

  container.traverse((child) => {
    if (child === container) return;
    const name = child.name || '';

    // 1. Xóa bỏ trần hoa sen và đèn lồng thả trần thấp đè lên đầu sảnh chính
    if (
      name === 'Sculpted_Lotus_Coffered_Ceiling' ||
      name === 'Ceiling_Palace_Lanterns_Instanced' ||
      name.toLowerCase().includes('coffered_ceiling')
    ) {
      toRemove.push(child);
      return;
    }

    // 2. Kiểm tra bất kỳ tấm PlaneGeometry nào chắn ngang đầu sảnh ở độ cao Y từ 5.0m đến 16.0m
    if (child.isMesh && child.geometry?.type === 'PlaneGeometry') {
      const pos = child.position;
      const rot = child.rotation;
      if (Math.abs(rot.x - Math.PI / 2) < 0.15 && pos.y >= 5.0 && pos.y <= 16.0) {
        if (!child.userData?.isStructural && !child.userData?.isFloor) {
          toRemove.push(child);
        }
      }
    }

    // 3. Ẩn lớp đèn lồng cầu trôi lơ lửng không có dây treo của hàng cột
    if (name === 'Instanced_Corridor_Pillars_And_Lanterns' && child.children) {
      if (child.children[3] && child.children[3].isInstancedMesh) {
        child.children[3].visible = false;
      }
    }
  });

  toRemove.forEach((obj) => {
    obj.traverse((c) => {
      if (c.isMesh) {
        c.geometry?.dispose?.();
        if (Array.isArray(c.material)) c.material.forEach((m) => m?.dispose?.());
        else c.material?.dispose?.();
      }
    });
    if (obj.parent) {
      obj.parent.remove(obj);
    }
  });
}

/**
 * ============================================================================
 * HẠNG MỤC 1: ĐẶT CUỐN SÁCH DI SẢN KHỔNG LỒ TẠI TÂM ĐẠI SẢNH (0, 0, 0)
 * - ĐÃ BỎ HOÀN TOÀN BỤC VÒNG TRÒN / BÁT GIÁC Ở GIỮA
 * - GIỮ NGUYÊN CUỐN SÁCH TỰ THIẾT KẾ ĐẶT TRÊN SÀN
 * - TÍCH HỢP HIỆU ỨNG TỰ ĐỘNG LẬT TRANG (AUTOMATIC PAGE-FLIPPING EFFECT)
 * ============================================================================
 */
export async function setupGrandLobbyGiantBookCenterpiece(lobbyGroup, {
  hitboxManager = null,
  loreGuide = null,
  audioDirector = null,
  candidateGlbPaths = [
    '/model/heritage/giant_heritage_book.glb',
    '/model/giant_book.glb',
    '/model/web/giant_book.glb'
  ]
} = {}) {
  if (!lobbyGroup) return null;

  // 1. DỌN SẠCH CỤC XOAY XOAY TRÒN TRÒN (TRỐNG ĐỒNG XOAY & VÒNG HÀO QUANG) Ở TÂM SẢNH
  const namesToRemove = [
    'Grand_Lobby_Giant_Book_Centerpiece',
    'Grand_Lobby_Octagonal_Lotus_Podium'
  ];
  namesToRemove.forEach((name) => {
    const existing = lobbyGroup.getObjectByName(name);
    if (existing) {
      existing.traverse((c) => {
        if (c.isMesh) {
          c.geometry?.dispose?.();
          if (Array.isArray(c.material)) c.material.forEach((m) => m?.dispose?.());
          else c.material?.dispose?.();
        }
      });
      lobbyGroup.remove(existing);
    }
  });

  // Triệt tiêu 100% "cục xoay xoay tròn tròn" (Trống đồng xoay & vòng hào quang) trong đài tròn
  const centralMonument = lobbyGroup.getObjectByName('Lobby_Central_DongSon_Monument') ||
                          lobbyGroup.getObjectByName('Central_DongSon_Drum_Monument');
  if (centralMonument) {
    if (centralMonument.userData?.rotatingPart) {
      centralMonument.remove(centralMonument.userData.rotatingPart);
      centralMonument.userData.rotatingPart.traverse((c) => {
        if (c.isMesh) {
          c.geometry?.dispose?.();
          if (Array.isArray(c.material)) c.material.forEach((m) => m?.dispose?.());
          else c.material?.dispose?.();
        }
      });
      centralMonument.userData.rotatingPart = null;
    }
    const toRemoveDrumParts = [];
    centralMonument.traverse((child) => {
      if (
        child.name === 'Blender_Dong_Son_Drum_3D' ||
        child.geometry?.type === 'LatheGeometry' ||
        (child.isMesh && child.geometry?.type === 'TorusGeometry' && (child.geometry.parameters?.radius || 0) < 2.5) ||
        (child.isMesh && child.geometry?.type === 'CircleGeometry' && (child.geometry.parameters?.radius || 0) < 1.5)
      ) {
        toRemoveDrumParts.push(child);
      }
    });
    toRemoveDrumParts.forEach((ch) => {
      if (ch.parent) ch.parent.remove(ch);
    });
  }

  const centerpieceGroup = new THREE.Group();
  centerpieceGroup.name = 'Grand_Lobby_Giant_Book_Centerpiece';
  centerpieceGroup.position.set(0, 0, 0);

  // 2. TÌM NẠP FILE .GLB HOẶC DỰNG SÁCH MỞ ĐIÊU KHẮC 3D CÓ HIỆU ỨNG TỰ ĐỘNG LẬT
  let bookVisualRoot = null;
  let loadedGlbPath = null;

  for (const path of candidateGlbPaths) {
    try {
      const gltf = await new Promise((resolve, reject) => {
        gltfLoader.load(path, resolve, undefined, reject);
      });
      if (gltf && gltf.scene) {
        bookVisualRoot = gltf.scene;
        loadedGlbPath = path;
        break;
      }
    } catch {
      // Thử đường dẫn kế tiếp
    }
  }

  if (bookVisualRoot) {
    console.log(`%c[16-Skills Integrator] Đã nạp model Sách Khổng Lồ từ: ${loadedGlbPath}`, 'color: #38bdf8; font-weight: bold;');
    bookVisualRoot.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(bookVisualRoot);
    const size = new THREE.Vector3();
    box.getSize(size);

    const maxHorizontalSpan = Math.max(size.x, size.z, 0.001);
    const scaleFactor = 6.8 / maxHorizontalSpan;
    bookVisualRoot.scale.setScalar(scaleFactor);

    bookVisualRoot.updateMatrixWorld(true);
    const scaledBox = new THREE.Box3().setFromObject(bookVisualRoot);
    const scaledCenter = new THREE.Vector3();
    scaledBox.getCenter(scaledCenter);

    bookVisualRoot.position.x -= scaledCenter.x;
    bookVisualRoot.position.y += 0.05 - scaledBox.min.y; // Đặt trực tiếp sát mặt sàn
    bookVisualRoot.position.z -= scaledCenter.z;

    bookVisualRoot.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        child.frustumCulled = true;
        if (child.material?.map && 'colorSpace' in child.material.map) {
          child.material.map.colorSpace = THREE.SRGBColorSpace;
          child.material.map.needsUpdate = true;
        }
      }
    });
  } else {
    // Dựng mô hình Sách Mở Điêu Khắc 3D khổ lớn tích hợp Hiệu Ứng Tự Động Lật Trang
    bookVisualRoot = createProceduralMonumentalOpenBook();
    bookVisualRoot.position.set(0, 1.18, 0); // Đặt trang trọng trên bục tròn 3 tầng
  }

  centerpieceGroup.add(bookVisualRoot);

  // 3. ĐÈN SPOTLIGHT ẤM ÁP RỌI XUỐNG MẶT SÁCH (KHÔNG ĐỔ BÓNG NẶNG)
  const bookLight = new THREE.PointLight(0xfef08a, 4.0, 20, 1.2);
  bookLight.position.set(0, 5.8, 1.4);
  bookLight.castShadow = false;
  centerpieceGroup.add(bookLight);

  // 4. HITBOX VẬT CẢN & CLICK TƯƠNG TÁC ÔM SÁT CUỐN SÁCH
  if (hitboxManager) {
    hitboxManager.registerSolidObjectCollider(bookVisualRoot, {
      shrinkFactor: 0.88,
      tag: 'Grand_Lobby_Giant_Book'
    });

    const clickProxy = hitboxManager.createTightClickHitbox(bookVisualRoot, {
      loreKey: 'lobby_giantHeritageBook',
      isBookPortal: false,
      padding: 0.35,
      minSize: 3.5
    });

    if (clickProxy && loreGuide) {
      loreGuide.registerArtifact(clickProxy, 'lobby_giantHeritageBook');
    }
  }

  if (audioDirector) {
    audioDirector.attachPositionalSound('lobby', centerpieceGroup);
  }

  // Kết nối hàm update để chạy hiệu ứng lật trang trong animate loop
  centerpieceGroup.userData.update = (timeSec, delta) => {
    bookVisualRoot?.userData?.update?.(timeSec, delta);
  };

  lobbyGroup.add(centerpieceGroup);
  return centerpieceGroup;
}

/**
 * TẠO TEXTURE TRANG SÁCH BẢO TÀNG BẰNG CANVAS
 */
function createHeritagePageCanvasTexture(pageTitle, chapterName, verses = []) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Nền giấy điệp hoàng kim ấm áp
  ctx.fillStyle = '#f6edd9';
  ctx.fillRect(0, 0, 1024, 1024);

  // Khung viền hồi văn chữ S và kỷ hà kép
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = 14;
  ctx.strokeRect(36, 36, 952, 952);
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 4;
  ctx.strokeRect(56, 56, 912, 912);

  // Tiêu đề sách thư pháp
  ctx.fillStyle = '#451a03';
  ctx.font = 'bold 44px "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.fillText(pageTitle, 512, 135);

  // Tên chương / tác phẩm
  ctx.fillStyle = '#78350f';
  ctx.font = 'italic bold 28px "Times New Roman", serif';
  ctx.fillText(chapterName, 512, 195);

  // Các dòng thơ di sản
  ctx.fillStyle = '#57361a';
  ctx.font = '24px "Times New Roman", serif';
  const startY = 270;
  verses.forEach((verse, i) => {
    ctx.fillText(verse, 512, startY + i * 46);
  });

  // Vẽ các dòng kẻ trang sách cổ
  ctx.fillStyle = 'rgba(120, 53, 15, 0.35)';
  for (let r = verses.length; r < 12; r++) {
    const y = startY + r * 46;
    ctx.fillRect(160, y, 704, 3);
  }

  // Con dấu son đỏ bảo tàng
  ctx.strokeStyle = '#b91c1c';
  ctx.lineWidth = 6;
  ctx.strokeRect(760, 810, 115, 115);
  ctx.fillStyle = 'rgba(185, 28, 28, 0.88)';
  ctx.font = 'bold 26px "Times New Roman", serif';
  ctx.fillText('BẢO', 817, 856);
  ctx.fillText('TÀNG', 817, 896);

  const texture = new THREE.CanvasTexture(canvas);
  if ('colorSpace' in texture && THREE.SRGBColorSpace) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  return texture;
}

/**
 * DỰNG MÔ HÌNH SÁCH MỞ ĐIÊU KHẮC 3D KHỔ LỚN TÍCH HỢP HIỆU ỨNG TỰ ĐỘNG LẬT TRANG
 * - Rộng 6.8m, sâu 4.2m
 * - Gáy sơn mài đỏ thẫm
 * - Chân đế gỗ mun thanh thoát đặt trực tiếp trên sàn
 * - Trang giấy lật uốn cong mềm mại theo khí động học (Aerodynamic Curl Wave)
 */
export function createProceduralMonumentalOpenBook() {
  const bookGroup = new THREE.Group();
  bookGroup.name = 'Monumental_Open_Book_3D';

  // 1. Chân đế gỗ mun thanh thoát nâng đỡ gáy sách
  const cradleMesh = new THREE.Mesh(
    new THREE.BoxGeometry(6.4, 0.52, 3.8),
    new THREE.MeshStandardMaterial({
      color: 0x1c1917,
      roughness: 0.38,
      metalness: 0.28
    })
  );
  cradleMesh.rotation.x = 0.28;
  cradleMesh.position.y = -0.20;
  cradleMesh.userData.ignoreRaycaster = true;
  bookGroup.add(cradleMesh);

  // 2. Gáy sách sơn mài đỏ thẫm bóng bẩy thếp vàng
  const spineMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.50, 0.32, 4.15),
    new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.24,
      metalness: 0.45
    })
  );
  spineMesh.rotation.x = 0.28;
  spineMesh.position.y = 0.16;
  spineMesh.userData.ignoreRaycaster = true;
  bookGroup.add(spineMesh);

  // 3. Hai chồng trang giấy cố định ở hai bên (Trang Trái & Trang Phải)
  const leftPageTex = createHeritagePageCanvasTexture(
    'TỔNG TẬP DI SẢN VĂN HIẾN',
    'NAM QUỐC SƠN HÀ • LÝ THƯỜNG KIỆT',
    [
      'Nam quốc sơn hà Nam đế cư,',
      'Tiệt nhiên định phận tại thiên thư.',
      'Như hà nghịch lỗ lai xâm phạm,',
      'Nhữ đẳng hành khan thủ bại hư.',
      '— — — — — — — — — —',
      'Hào khí Đông A ngàn thu tỏa rạng,',
      'Sông núi nước Nam rực rỡ muôn đời.'
    ]
  );
  const leftPageMat = new THREE.MeshStandardMaterial({
    map: leftPageTex,
    roughness: 0.55,
    metalness: 0.08
  });

  const rightPageTex = createHeritagePageCanvasTexture(
    'TỔNG TẬP DI SẢN VĂN HIẾN',
    'BÌNH NGÔ ĐẠI CÁO • NGUYỄN TRÃI',
    [
      'Từng nghe: Việc nhân nghĩa cốt ở yên dân,',
      'Quân điếu phạt trước lo trừ bạo.',
      'Như nước Đại Việt ta từ trước,',
      'Vốn xưng nền văn hiến đã lâu.',
      'Núi sông bờ cõi đã chia,',
      'Phong tục Bắc Nam cũng khác.',
      'Từ Triệu, Đinh, Lý, Trần bao đời xây nền độc lập.'
    ]
  );
  const rightPageMat = new THREE.MeshStandardMaterial({
    map: rightPageTex,
    roughness: 0.55,
    metalness: 0.08
  });

  // Chồng trang bên Trái
  const leftPageGeo = new THREE.BoxGeometry(3.25, 0.18, 4.05, 16, 1, 8);
  const leftPos = leftPageGeo.attributes.position;
  for (let i = 0; i < leftPos.count; i++) {
    const x = leftPos.getX(i);
    const arch = Math.sin(((x * -1 + 1.625) / 3.25) * Math.PI) * 0.16;
    leftPos.setY(i, leftPos.getY(i) + arch);
  }
  leftPageGeo.computeVertexNormals();
  const leftMesh = new THREE.Mesh(leftPageGeo, leftPageMat);
  leftMesh.position.set(-1.78, 0.20, 0);
  leftMesh.rotation.x = 0.28;
  leftMesh.rotation.z = 0.08;
  leftMesh.userData.ignoreRaycaster = true;
  bookGroup.add(leftMesh);

  // Chồng trang bên Phải
  const rightPageGeo = new THREE.BoxGeometry(3.25, 0.18, 4.05, 16, 1, 8);
  const rightPos = rightPageGeo.attributes.position;
  for (let i = 0; i < rightPos.count; i++) {
    const x = rightPos.getX(i);
    const arch = Math.sin(((x + 1.625) / 3.25) * Math.PI) * 0.16;
    rightPos.setY(i, rightPos.getY(i) + arch);
  }
  rightPageGeo.computeVertexNormals();
  const rightMesh = new THREE.Mesh(rightPageGeo, rightPageMat);
  rightMesh.position.set(1.78, 0.20, 0);
  rightMesh.rotation.x = 0.28;
  rightMesh.rotation.z = -0.08;
  rightMesh.userData.ignoreRaycaster = true;
  bookGroup.add(rightMesh);

  // =========================================================================
  // 4. HỆ THỐNG TRANG LẬT TỰ ĐỘNG (DYNAMIC FLIPPING PAGE WITH AERO CURL)
  // =========================================================================
  const turnPivot = new THREE.Group();
  turnPivot.name = 'Monumental_Turning_Page_Pivot';
  turnPivot.position.set(0, 0.22, 0);
  turnPivot.rotation.x = 0.28;
  bookGroup.add(turnPivot);

  const flipPageW = 3.25;
  const flipPageD = 4.05;
  // Lưới 28x10 để trang giấy uốn cong mượt mà tự nhiên
  const flipGeo = new THREE.PlaneGeometry(flipPageW, flipPageD, 28, 10);
  flipGeo.rotateX(-Math.PI / 2); // Đưa về mặt phẳng XZ (normal hướng lên +Y)
  flipGeo.translate(flipPageW * 0.5, 0, 0); // Dời mép gáy về x = 0 (trục quay gáy sách)

  const origPositions = flipGeo.attributes.position.clone();

  // Mặt trước của trang lật (nhìn thấy khi ở bên phải và khi đang nhấc lên)
  const flipFrontTex = createHeritagePageCanvasTexture(
    'ĐOẠN TRƯỜNG TÂN THANH',
    'TRUYỆN KIỀU • NGUYỄN DU',
    [
      'Trăm năm trong cõi người ta,',
      'Chữ tài chữ mệnh khéo là ghét nhau.',
      'Trải qua một cuộc bể dâu,',
      'Những điều trông thấy mà đau đớn lòng.',
      'Lạ gì bỉ sắc tư phong,',
      'Trời xanh quen thói má hồng đánh ghen.'
    ]
  );
  const flipFrontMat = new THREE.MeshStandardMaterial({
    map: flipFrontTex,
    roughness: 0.55,
    metalness: 0.08,
    side: THREE.FrontSide,
    transparent: true,
    opacity: 1.0
  });
  const flipFrontMesh = new THREE.Mesh(flipGeo, flipFrontMat);
  flipFrontMesh.userData.ignoreRaycaster = true;
  turnPivot.add(flipFrontMesh);

  // Mặt sau của trang lật (nhìn thấy khi lật qua bên trái)
  const flipBackTex = createHeritagePageCanvasTexture(
    'HỊCH TƯỚNG SĨ',
    'TRẦN HƯNG ĐẠO • ĐẠI VIỆT',
    [
      'Ta thường tới bữa quên ăn,',
      'Nửa đêm vỗ gối, ruột đau như cắt,',
      'Nước mắt đầm đìa;',
      'Chỉ căm tức chưa xả thịt lột da,',
      'Nuốt gan uống máu quân thù.',
      'Dẫu cho trăm thân này phơi ngoài nội cỏ,',
      'Nghìn xác này gói trong da ngựa,',
      'Ta cũng cam lòng.'
    ]
  );
  const flipBackMat = new THREE.MeshStandardMaterial({
    map: flipBackTex,
    roughness: 0.55,
    metalness: 0.08,
    side: THREE.BackSide,
    transparent: true,
    opacity: 1.0
  });
  const flipBackMesh = new THREE.Mesh(flipGeo, flipBackMat);
  flipBackMesh.position.y = -0.003; // Tránh z-fighting
  flipBackMesh.userData.ignoreRaycaster = true;
  turnPivot.add(flipBackMesh);

  // VÒNG LẶP HOẠT HỌA TỰ ĐỘNG LẬT TRANG (PAGE-FLIP ANIMATOR)
  bookGroup.userData.update = (timeSec, delta = 0.016) => {
    // Chu kỳ lật trang: 6.0 giây
    const cyclePeriod = 6.0;
    const t = timeSec % cyclePeriod;

    // Pha 1: Nghỉ êm đềm ở bên phải cho khách đọc (0.0s -> 1.2s)
    if (t < 1.2) {
      turnPivot.rotation.z = -0.08;
      flipFrontMat.opacity = 1.0;
      flipBackMat.opacity = 1.0;

      // Phục hồi độ phẳng của trang giấy
      const pos = flipGeo.attributes.position;
      const orig = origPositions;
      for (let i = 0; i < pos.count; i++) {
        pos.setY(i, orig.getY(i));
      }
      pos.needsUpdate = true;
    }
    // Pha 2: Lật trang từ phải sang trái (1.2s -> 4.4s, kéo dài 3.2s uyển chuyển)
    else if (t >= 1.2 && t < 4.4) {
      const progress = (t - 1.2) / 3.2; // 0.0 đến 1.0

      // Đường cong chuyển động mượt mà (Smooth Cubic Easing)
      const ease = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      // Góc quay quanh gáy từ phải (-0.08 rad) sang trái (PI + 0.08 rad)
      const angleZ = -0.08 + ease * (Math.PI + 0.16);
      turnPivot.rotation.z = angleZ;

      // Hiệu ứng uốn cong khí động học của trang giấy (Aerodynamic Curl Wave)
      const pos = flipGeo.attributes.position;
      const orig = origPositions;
      const curlIntensity = Math.sin(progress * Math.PI) * 0.44;

      for (let i = 0; i < pos.count; i++) {
        const localX = orig.getX(i);
        const normX = localX / flipPageW; // 0 ở gáy sách, 1 ở mép ngoài cùng

        // Mép ngoài cuộn trễ theo lực cản không khí
        const curlDirection = progress < 0.5 ? -1.0 : 1.0;
        const curl = curlDirection * curlIntensity * Math.pow(normX, 1.45) * 0.85;

        // Gợn sóng rung nhẹ của giấy cổ khi chuyển động
        const flutter = Math.sin(timeSec * 7.5 + normX * 4.5) * 0.02 * Math.sin(progress * Math.PI);

        pos.setY(i, orig.getY(i) + curl + flutter);
      }
      pos.needsUpdate = true;
      flipGeo.computeVertexNormals();

      flipFrontMat.opacity = 1.0;
      flipBackMat.opacity = 1.0;
    }
    // Pha 3: Nằm yên êm ái trên chồng trang bên trái (4.4s -> 5.4s)
    else if (t >= 4.4 && t < 5.4) {
      turnPivot.rotation.z = Math.PI + 0.08;

      const pos = flipGeo.attributes.position;
      const orig = origPositions;
      for (let i = 0; i < pos.count; i++) {
        pos.setY(i, orig.getY(i));
      }
      pos.needsUpdate = true;

      flipFrontMat.opacity = 1.0;
      flipBackMat.opacity = 1.0;
    }
    // Pha 4: Chuyển tiếp mờ dần nhẹ nhàng để bắt đầu trang kế tiếp (5.4s -> 6.0s)
    else {
      const resetProgress = (t - 5.4) / 0.6; // 0.0 đến 1.0
      if (resetProgress < 0.5) {
        const fadeOut = 1.0 - resetProgress * 2.0;
        flipFrontMat.opacity = fadeOut;
        flipBackMat.opacity = fadeOut;
      } else {
        turnPivot.rotation.z = -0.08;
        const fadeIn = (resetProgress - 0.5) * 2.0;
        flipFrontMat.opacity = fadeIn;
        flipBackMat.opacity = fadeIn;
      }
    }
  };

  return bookGroup;
}

/**
 * ============================================================================
 * HẠNG MỤC 2: TRẦN GỖ HOA SEN & ĐÈN LỒNG CUNG ĐÌNH
 * (Không áp dụng cho Đại Sảnh để bảo tồn giếng trời thông tầng 32m)
 * ============================================================================
 */
export function buildSculptedLotusCofferCeiling(roomGroup, {
  roomWidth = 25.32,
  roomDepth = 27.30,
  ceilingHeight = 8.40,
  isLobby = false
} = {}) {
  // Tuyệt đối không gắn trần cho Đại Sảnh
  if (!roomGroup || isLobby || roomGroup.name === 'Museum_Atrium_Root') return null;

  const existingCeiling = roomGroup.getObjectByName('Sculpted_Lotus_Coffered_Ceiling');
  if (existingCeiling) return existingCeiling;

  const ceilingGroup = new THREE.Group();
  ceilingGroup.name = 'Sculpted_Lotus_Coffered_Ceiling';
  ceilingGroup.userData.ignoreRaycaster = true;

  const cofferMat = createCarvedHeritagePbrMaterial('lotusGold', 6, 6);
  const ceilingPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(roomWidth, roomDepth),
    cofferMat
  );
  ceilingPlane.rotation.x = Math.PI / 2;
  ceilingPlane.position.y = ceilingHeight;
  ceilingPlane.userData.ignoreRaycaster = true;
  ceilingGroup.add(ceilingPlane);

  const lanternGeo = new THREE.CylinderGeometry(0.32, 0.26, 0.68, 12);
  const lanternMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
  const lanternInstanced = new THREE.InstancedMesh(lanternGeo, lanternMat, 9);
  lanternInstanced.name = 'Ceiling_Palace_Lanterns_Instanced';
  lanternInstanced.userData.ignoreRaycaster = true;

  const dummy = new THREE.Object3D();
  let idx = 0;
  for (let gx = -1; gx <= 1; gx++) {
    for (let gz = -1; gz <= 1; gz++) {
      dummy.position.set(gx * (roomWidth * 0.28), ceilingHeight - 0.55, gz * (roomDepth * 0.28));
      dummy.updateMatrix();
      lanternInstanced.setMatrixAt(idx++, dummy.matrix);
    }
  }
  lanternInstanced.instanceMatrix.needsUpdate = true;
  ceilingGroup.add(lanternInstanced);

  roomGroup.add(ceilingGroup);
  return ceilingGroup;
}

/**
 * ============================================================================
 * HẠNG MỤC 3: BỘ ĐIỀU KHIỂN CHẾ ĐỘ HIỂN THỊ PIXELFX RETRO / CRT SCANLINE [P]
 * ============================================================================
 */
export function setupPixelFxRetroController(renderer) {
  let mode = 0;
  let scanlineOverlay = null;

  if (typeof document !== 'undefined') {
    scanlineOverlay = document.getElementById('pixelfx-crt-overlay');
    if (!scanlineOverlay) {
      scanlineOverlay = document.createElement('div');
      scanlineOverlay.id = 'pixelfx-crt-overlay';
      scanlineOverlay.style.cssText = `
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 9980;
        display: none;
        background: repeating-linear-gradient(
          0deg,
          rgba(0, 0, 0, 0.24) 0px,
          rgba(0, 0, 0, 0.24) 1px,
          transparent 1px,
          transparent 3px
        );
      `;
      document.body.appendChild(scanlineOverlay);
    }
  }

  const showPixelFxToast = (modeName, color) => {
    if (typeof document === 'undefined') return;
    let toast = document.getElementById('pixelfx-mode-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'pixelfx-mode-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 28px;
        left: 28px;
        padding: 10px 18px;
        background: rgba(15, 23, 42, 0.92);
        color: #f8fafc;
        border-radius: 8px;
        font-family: 'Segoe UI', system-ui, sans-serif;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 0.5px;
        z-index: 999999;
        pointer-events: none;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(8px);
        transition: opacity 0.3s ease;
      `;
      document.body.appendChild(toast);
    }
    toast.style.borderColor = color;
    toast.style.border = `1px solid ${color}`;
    toast.innerHTML = `<span style="color:${color}">⚡ Chế độ hiển thị [P]:</span> ${modeName}`;
    toast.style.opacity = '1';
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.style.opacity = '0';
    }, 2400);
  };

  const applyMode = (newMode) => {
    mode = newMode % 3;
    if (!renderer) return;

    if (mode === 0) {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.domElement.style.imageRendering = 'auto';
      if (scanlineOverlay) scanlineOverlay.style.display = 'none';
      showPixelFxToast('Crisp PBR HD (Nguyên Bản)', '#38bdf8');
    } else if (mode === 1) {
      renderer.setPixelRatio(0.45);
      renderer.domElement.style.imageRendering = 'pixelated';
      if (scanlineOverlay) scanlineOverlay.style.display = 'none';
      showPixelFxToast('PixelFX Stylized (Dither 16-bit)', '#facc15');
    } else {
      renderer.setPixelRatio(0.38);
      renderer.domElement.style.imageRendering = 'pixelated';
      if (scanlineOverlay) scanlineOverlay.style.display = 'block';
      showPixelFxToast('PixelFX Retro CRT (Scanlines Cổ Điển)', '#4ade80');
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      if (e.key === 'p' || e.key === 'P') {
        applyMode(mode + 1);
      }
    });
  }

  return { applyMode, getMode: () => mode };
}

/**
 * ============================================================================
 * HÀM TỔNG KHỞI TẠO & VẬN HÀNH 16 KỸ NĂNG CHO TOÀN BỘ BẢO TÀNG
 * ============================================================================
 */
export async function applyAll16SkillsToMuseum({
  scene = null,
  camera = null,
  renderer = null,
  lobbyGroup = null,
  roomsMap = {},
  sonTinhMythicRealmGroup = null,
  sonTinhModel = null,
  thuyTinhModel = null,
  hitboxManager = null,
  cameraManager = null,
  loreGuide = null,
  audioDirector = null,
  walkableFloors = [],
  onTourStateChange = null
} = {}) {
  const targetScene = scene || (typeof window !== 'undefined' ? (window.__scene || window.__mainScene || window.__app?.scene) : null);

  // 1. Khởi tạo / lấy Hitbox Manager tập trung
  const hbm = hitboxManager || getMuseumHitboxManager(targetScene);
  if (cameraManager && hbm) {
    cameraManager.setHitboxManager(hbm);
  }

  // 2. ĐẶT CUỐN SÁCH DI SẢN KHỔNG LỒ TẠI TÂM ĐẠI SẢNH (0, 0, 0)
  // Đã bỏ bục vòng tròn/bát giác, giữ lại cuốn sách với hiệu ứng tự động lật
  let giantBookCenterpiece = null;
  if (lobbyGroup) {
    removeLobbyCeilingAndOverheadClutter(lobbyGroup);
    if (targetScene && targetScene !== lobbyGroup) {
      removeLobbyCeilingAndOverheadClutter(targetScene);
    }

    giantBookCenterpiece = await setupGrandLobbyGiantBookCenterpiece(lobbyGroup, {
      hitboxManager: hbm,
      loreGuide,
      audioDirector
    });

    upgradeRoomWallArchitecture(lobbyGroup, {
      themeKey: 'lobby',
      isLobby: true,
      roomWidth: 32,
      roomDepth: 32,
      wallHeight: 8.4
    });
  }

  // 3. ĐIÊU KHẮC TƯỜNG CHO CÁC PHÒNG TRƯNG BÀY
  const roomUpgradeConfigs = [
    {
      key: 'truyenKieu',
      title: 'ĐOẠN TRƯỜNG TÂN THANH',
      leftCouplet: 'Trăm năm cõi thế nhân gian',
      rightCouplet: 'Tài hoa mệnh bạc cung đàn ngân vang'
    },
    {
      key: 'anDuongVuong',
      title: 'CỔ LOA THÀNH KÝ',
      leftCouplet: 'Chín vòng thành ốc uy linh',
      rightCouplet: 'Nỏ thần giữ nước hiển vinh muôn đời'
    },
    {
      key: 'voNhat',
      title: 'KHÁT VỌNG BÌNH MINH',
      leftCouplet: 'Giữa cơn tăm tối cơ hàn',
      rightCouplet: 'Tình người thắp sáng muôn ngàn niềm tin'
    }
  ];

  roomUpgradeConfigs.forEach((cfg) => {
    const rGroup = roomsMap[cfg.key];
    if (!rGroup) return;

    upgradeRoomWallArchitecture(rGroup, { themeKey: cfg.key });

    const arch = createTraditionalArchwayEntrance({
      roomTitle: cfg.title,
      leftCouplet: cfg.leftCouplet,
      rightCouplet: cfg.rightCouplet
    });
    arch.position.set(0, 0, 12.05);
    rGroup.add(arch);
  });

  // 4. ĐẠI CẢNH THẾ GIỚI SƠN TINH - THỦY TINH ĐỘC LẬP TẠI (5000, 0, 5000)
  let sonTinhRealmController = null;
  const targetSonTinhRealm = sonTinhMythicRealmGroup || (typeof window !== 'undefined' ? window.__sonTinhThuyTinhScene : null);

  if (targetSonTinhRealm) {
    if (targetSonTinhRealm.isScene) {
      targetSonTinhRealm.position.set(0, 0, 0);
    }

    const existingVfx = targetSonTinhRealm.getObjectByName('SonTinh_Mythic_World_Only_Vfx');
    if (!existingVfx) {
      removeOldSonTinhBackgroundAndDarkCones(targetSonTinhRealm);

      sonTinhRealmController = buildSonTinhThuyTinhMasterVfx(targetSonTinhRealm, {
        sonTinhModel,
        thuyTinhModel,
        hitboxManager: hbm,
        moveRealmToSeparateOffset: !targetSonTinhRealm.isScene
      });
    }
  }

  // 5. BỘ ĐIỀU KHIỂN PIXELFX RETRO MODE [P], AUTO-TOUR [T] & WEBXR TELEPORT
  const pixelFxController = setupPixelFxRetroController(renderer);

  let autoTourDirector = null;
  if (camera) {
    autoTourDirector = new MuseumAutoTourDirector(camera, {
      audioDirector,
      loreGuide,
      onTourStateChange
    });
  }

  let webXrController = null;
  if (renderer && renderer.xr && targetScene && camera) {
    try {
      webXrController = setupMuseumWebXRTeleport(renderer, targetScene, camera, walkableFloors);
    } catch (err) {
      console.warn('[WebXR] Bỏ qua WebXR trên trình duyệt không hỗ trợ:', err);
    }
  }

  // VÒNG LẶP CẬP NHẬT TỔNG UPDATEALL: CẬP NHẬT HIỆU ỨNG LẬT TRANG SÁCH & REALM
  const updateAll = (nowMs = performance.now()) => {
    const timeSec = nowMs * 0.001;

    try {
      if (giantBookCenterpiece?.userData?.update) {
        giantBookCenterpiece.userData.update(timeSec, 0.016);
      }
      if (sonTinhRealmController?.updateRealm) {
        sonTinhRealmController.updateRealm(timeSec);
      }
      if (autoTourDirector?.update) {
        autoTourDirector.update(nowMs);
      }
    } catch (err) {
      console.warn('[16-Skills Loop Self-Healing]:', err);
    }
  };

  console.log('%c✓ ĐÃ THIẾT LẬP HOÀN TẤT CUỐN SÁCH DI SẢN ĐẶT TRÊN SÀN (TỰ ĐỘNG LẬT TRANG - ĐÃ BỎ BỤC VÒNG TRÒN)!', 'color: #38bdf8; font-weight: bold; font-size: 14px;');

  return {
    hitboxManager: hbm,
    giantBookCenterpiece,
    autoTourDirector,
    pixelFxController,
    sonTinhRealmController,
    webXrController,
    updateAll
  };
}
