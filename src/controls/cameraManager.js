import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CinematicTour } from './cinematicTour.js';
import { CameraController, CAMERA_MODES } from './CameraController.js';

/**
 * CAMERA MANAGER & PRESET VIEWS (BLOCKOUT NAVIGATION & DUAL CAMERA SYSTEM)
 * Skill: threejs-camera-direction
 */

export const PRESET_VIEWS = {
  MAIN_ATRIUM: {
    name: 'Đại Sảnh Chính Bảo Tàng',
    position: new THREE.Vector3(0, 1.8, 32.0),
    target: new THREE.Vector3(0, 6.0, 5.0),
    description: 'Chiêm ngưỡng toàn cảnh Đại Sảnh Bảo Tàng Văn Học, Cầu Thang Chữ Y và Giếng Trời Hoàng Kim'
  },
  ROOM_101_THANH_GIONG: {
    name: 'Phòng Trưng Bày Thánh Gióng – Phù Đổng Thiên Vương (Tầng 1)',
    position: new THREE.Vector3(-37.2, 1.8, 19.0),
    target: new THREE.Vector3(-50.5, 2.2, 19.0),
    description: 'Chiêm ngưỡng Bệ Đá Trống Đồng Đông Sơn, Tượng Đài Phù Đổng Thiên Vương, Làng Gióng, Lò Rèn Vũ Khí & Cổng Sóc Sơn'
  },
  ROOM_201_BOOK: {
    name: 'Phòng Mẫu 01 (Sách Truyện Kiều)',
    position: new THREE.Vector3(-44.5, 11.8, 19.0),
    target: new THREE.Vector3(-48.0, 11.2, 19.0),
    description: 'Chiêm ngưỡng trọn vẹn Bục Sách Truyện Kiều 1:1, Án Thư và Đàn Tỳ Bà'
  },
  ROOM_202_BOOK: {
    name: 'Phòng 202 (Nam Quốc Sơn Hà – Lý Thường Kiệt)',
    position: new THREE.Vector3(-37.2, 11.8, -19.0),
    target: new THREE.Vector3(-50.5, 12.1, -19.0),
    description: 'Chiêm ngưỡng tượng Thái úy Lý Thường Kiệt trên bệ hoa sen, Chiếu thư Nam Quốc Sơn Hà, Sa bàn Như Nguyệt & Cổng Đền Trương Hống – Trương Hát'
  },
  ROOM_102_SON_TINH: {
    name: 'Phòng Trưng Bày Sơn Tinh - Thủy Tinh (Tầng 1)',
    position: new THREE.Vector3(-44.5, 1.8, -19.0),
    target: new THREE.Vector3(-48.0, 1.25, -19.0),
    description: 'Chiêm ngưỡng Bệ Đá Cổ, Cuốn Sách Thần Dịch Chuyển và Tam Sinh Lễ Vật mạ vàng'
  },
  REALM_SON_TINH_BATTLE: {
    name: 'Cõi Đại Chiến Sơn Tinh - Thủy Tinh (Gojo vs Sukuna)',
    position: new THREE.Vector3(0, 468.0, -392.0),
    target: new THREE.Vector3(0, 444.0, -466.0),
    description: 'Đài Quan Sát Hư Vô: Chiêm ngưỡng Đại Chiến Sơn Tinh vs Thủy Tinh phong cách Gojo vs Sukuna'
  },
  ROOM_103_AN_DUONG_VUONG: {
    name: 'Phòng Trưng Bày An Dương Vương & Cổ Loa Thành (Tầng 1)',
    position: new THREE.Vector3(0.0, 2.0, -42.0),
    target: new THREE.Vector3(0.0, 2.6, -52.0),
    description: 'Chiêm ngưỡng toàn cảnh Đại Gian Cổ Loa Thành, Nỏ Thần Cao Lỗ và Thần Kim Quy'
  },
  ROOM_302_TAT_DEN: {
    name: 'Phòng Trưng Bày Tắt Đèn - Ngô Tất Tố (Tầng 3)',
    position: new THREE.Vector3(-37.0, 21.8, -19.0),
    target: new THREE.Vector3(-52.8, 22.1, -19.0),
    description: 'Bước qua Cổng Đình Đông Xá vào không gian Tắt Đèn với Chị Dậu, Đèn Dầu, Tráp Sưu Thuế và Nồi Cháo Cám'
  },
  ROOM_304_VO_NHAT: {
    name: 'Phòng Trưng Bày Vợ Nhặt - Kim Lân (Tầng 3)',
    position: new THREE.Vector3(42.5, 21.8, -19.0),
    target: new THREE.Vector3(48.0, 21.3, -19.0),
    description: 'Chiêm ngưỡng Bục Sách Vợ Nhặt, Nồi chè khoán, Đèn dầu tân hôn, Xe bò thóc và Cờ đỏ'
  },
  REALM_VO_NHAT: {
    name: 'Cõi Văn Học Vợ Nhặt (Xóm Ngụ Cư 1945)',
    position: new THREE.Vector3(-260.0, 424.0, -418.0),
    target: new THREE.Vector3(-260.0, 429.5, -474.0),
    description: 'Đài Quan Sát: Chiêm ngưỡng Xóm Ngụ Cư, Mái Nhà Tranh Bà Cụ Tứ và Đoàn Người Phá Kho Thóc'
  },
  REALM_AN_DUONG_VUONG: {
    name: 'Cõi Cổ Loa Thành & Biển Đông (An Dương Vương)',
    position: new THREE.Vector3(260.0, 424.0, -418.0),
    target: new THREE.Vector3(260.0, 428.0, -446.0),
    description: 'Đài Quan Sát: Chiêm ngưỡng Thành Ốc Cổ Loa 3 tầng và Thần Kim Quy rẽ sóng Biển Đông'
  },
  STAIRCASE_FRONT: {
    name: 'Chân Cầu Thang Chữ Y (1.8m)',
    position: new THREE.Vector3(0, 1.8, 32),
    target: new THREE.Vector3(0, 7, 6),
    description: 'Chiêm ngưỡng cầu thang chữ Y uốn lượn và giếng trời'
  },
  STAIRCASE_LANDING: {
    name: 'Chiếu Nghỉ Cầu Thang (Y=5.5m)',
    position: new THREE.Vector3(0, 5.8, 12),
    target: new THREE.Vector3(0, 10, 0),
    description: 'Quan sát 2 nhánh uốn lượn sang Tầng 2 thông thủy 100%'
  },
  LEVEL_2_ROOMS: {
    name: 'Hành Lang Tầng 2 & Cửa Vòm',
    position: new THREE.Vector3(-22, 11.5, 0),
    target: new THREE.Vector3(-34, 13.5, 0),
    description: 'Quan sát dãy phòng riêng biệt và cửa vòm lớn'
  },
  LEVEL_3_GALLERY: {
    name: 'Thượng Tầng 3 (Cao độ 21.5m)',
    position: new THREE.Vector3(22, 21.5, 14),
    target: new THREE.Vector3(0, 12, 0),
    description: 'Góc nhìn toàn cảnh thông tầng 3 tầng và sàn phản chiếu'
  },
  BIRDS_EYE: {
    name: 'Toàn Cảnh Chim Bay (Bird\'s Eye View)',
    position: new THREE.Vector3(0, 56, 62),
    target: new THREE.Vector3(0, 16, 0),
    description: 'Kiến trúc đối xứng tổng thể 15 phòng và Mái vòm kính'
  },
  TRANG_AN_VISTA: {
    name: 'Hiên Ngắm Non Nước Tràng An',
    position: new THREE.Vector3(-46.0, 11.8, 19.0),
    target: new THREE.Vector3(-140.0, 32.0, 19.0),
    description: 'Từ bệ sách ma thuật phóng tầm mắt qua lan can Indochine ra biển mây và dãy núi đá vôi Tràng An'
  }
};

export class CameraManager {
  constructor(camera = null, domElement = null) {
    this.camera = camera;
    this.domElement = domElement ?? document.body;

    this.controls = new OrbitControls(this.camera, this.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.05;
    this.controls.minDistance = 1.0;
    this.controls.maxDistance = 160.0;

    this.isTransitioning = false;
    this.targetPos = new THREE.Vector3();
    this.targetLook = new THREE.Vector3();
    this.transitionAlpha = 0;

    // Tích hợp Cinematic Tour 30s
    this.cinematicTour = new CinematicTour(this.camera, this.controls);

    // Tích hợp Dual Camera Controller (PointerLockControls FPP & Freecam)
    this.cameraController = new CameraController(this.camera, this.domElement);

    // Xử lý xung đột giữa OrbitControls và PointerLockControls
    this.cameraController.controls?.addEventListener?.('lock', () => {
      this.controls.enabled = false;
    });

    this.cameraController.controls?.addEventListener?.('unlock', () => {
      this.controls.enabled = true;
    });

    this.setView(PRESET_VIEWS.MAIN_ATRIUM, false);
  }

  setAudioManager(audioManager) {
    this.audioManager = audioManager;
    if (this.cameraController) {
      this.cameraController.audioManager = audioManager;
    }
  }

  setHitboxManager(hitboxManager) {
    this.hitboxManager = hitboxManager;
    this.cameraController?.setHitboxManager(hitboxManager);
  }

  setCollisionObjects(collisionObjects, stairObjects) {
    this.cameraController?.setCollisionObjects(collisionObjects, stairObjects);
  }

  addCollisionObject(obj) {
    this.cameraController?.addCollisionObject(obj);
  }

  setView(preset, smooth = true) {
    if (this.cinematicTour?.isPlaying) {
      this.cinematicTour.stop();
    }
    if (this.cameraController) {
      this.cameraController.isFastTraveling = false;
      if (this.cameraController.controls?.isLocked) {
        try { this.cameraController.controls.unlock(); } catch (e) {}
      }
    }
    if (typeof document !== 'undefined' && document.pointerLockElement && document.exitPointerLock) {
      try { document.exitPointerLock(); } catch (e) {}
    }
    if (this.controls) {
      this.controls.enabled = true;
    }

    if (!smooth) {
      this.camera?.position?.copy(preset.position);
      this.controls?.target?.copy(preset.target);
      this.controls?.update();
      this.isTransitioning = false;
      return;
    }

    this.targetPos.copy(preset.position);
    this.targetLook.copy(preset.target);
    this.isTransitioning = true;
    this.transitionAlpha = 0;
  }

  setCustomView(position, target, updateControls = true) {
    if (this.cinematicTour?.isPlaying) {
      this.cinematicTour.stop();
    }
    this.isTransitioning = false;
    if (position) this.camera?.position?.copy(position);
    if (target && this.controls) {
      this.controls.target.copy(target);
      if (updateControls) this.controls.update();
    }
    if (target && this.camera?.lookAt) {
      this.camera.lookAt(target);
    }
  }

  startTour() {
    this.isTransitioning = false;
    this.cameraController?.controls?.unlock?.();
    this.cinematicTour?.start?.();
  }

  stopTour() {
    this.cinematicTour?.stop?.();
  }

  replayTour() {
    this.isTransitioning = false;
    this.cameraController?.controls?.unlock?.();
    this.cinematicTour?.replay?.();
  }

  /**
   * CƠ CHẾ FAST-TRAVEL 1.8S ĐẾN ĐIỂM QUAN SÁT PHÒNG
   */
  fastTravelTo(targetPos, lookAtTarget, onComplete = null) {
    if (this.cinematicTour?.isPlaying) {
      this.cinematicTour.stop();
    }
    this.isTransitioning = false;
    if (this.controls) {
      this.controls.enabled = false;
    }

    return this.cameraController?.fastTravelTo(targetPos, lookAtTarget, () => {
      if (this.controls) {
        this.controls.target.copy(lookAtTarget);
        this.controls.enabled = true;
        this.controls.update();
      }
      onComplete?.();
    });
  }

  update(delta = 0.016) {
    // 1. Nếu Tour đang chạy: Tour kiểm soát camera
    if (this.cinematicTour?.isPlaying) {
      this.cinematicTour.update(delta);
      return;
    }

    // 1.5. Nếu đang trong trạng thái Fast-Travel: CameraController kiểm soát 100%
    if (this.cameraController?.isFastTraveling) {
      if (this.controls) this.controls.enabled = false;
      this.cameraController.update(delta);
      return;
    }

    // 2. Nếu PointerLock đang khóa (Người chơi đang di chuyển WASD / Chuột)
    if (this.cameraController?.controls?.isLocked) {
      this.cameraController.update(delta);
      return;
    }

    // 3. Nếu đang thực hiện chuyển động lerp mượt mà giữa các góc nhìn
    if (this.isTransitioning) {
      this.transitionAlpha += delta * 2.2;
      const t = Math.min(1.0, this.transitionAlpha);
      const ease = t * t * (3 - 2 * t);

      this.camera?.position?.lerp(this.targetPos, ease * 0.16);
      this.controls?.target?.lerp(this.targetLook, ease * 0.16);

      if (this.camera?.position?.distanceTo(this.targetPos) < 0.1 &&
          this.controls?.target?.distanceTo(this.targetLook) < 0.1) {
        this.camera?.position?.copy(this.targetPos);
        this.controls?.target?.copy(this.targetLook);
        this.isTransitioning = false;
      }
    }

    // 4. OrbitControls tự do khi chuột chưa bị khóa và controls đang enabled
    if (this.controls?.enabled) {
      this.controls.update();
    }
  }
}
