import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CinematicTour } from './cinematicTour.js';
import { CameraController, CAMERA_MODES } from './CameraController.js';
import { getRoomWorldPose, localRoomToWorld } from '../config/literatureRegistry.js';

/**
 * CAMERA MANAGER & PRESET VIEWS (BLOCKOUT NAVIGATION & DUAL CAMERA SYSTEM)
 * Skill: threejs-camera-direction
 */

function createRoomPresetView(roomId, { name, localPos, localTarget, description }) {
  const pose = getRoomWorldPose(roomId);
  const pos = localRoomToWorld(pose, localPos[0], localPos[1], localPos[2]);
  const tgt = localRoomToWorld(pose, localTarget[0], localTarget[1], localTarget[2]);
  return {
    roomId,
    roomCode: pose.roomCode,
    name: name.replace('{code}', pose.roomCode),
    position: new THREE.Vector3(pos.x, pos.y, pos.z),
    target: new THREE.Vector3(tgt.x, tgt.y, tgt.z),
    description
  };
}

const PRESET_TRUYEN_KIEU = createRoomPresetView('truyen_kieu', {
  name: 'Phòng {code} (Sách Truyện Kiều)',
  localPos: [0, 1.8, 3.5],
  localTarget: [0, 1.2, 0],
  description: 'Chiêm ngưỡng trọn vẹn Bục Sách Truyện Kiều 1:1, Án Thư và Đàn Tỳ Bà'
});

const PRESET_NAM_QUOC_SON_HA = createRoomPresetView('nam_quoc_son_ha', {
  name: 'Phòng {code} (Nam Quốc Sơn Hà – Lý Thường Kiệt)',
  localPos: [0, 1.8, 10.8],
  localTarget: [0, 2.1, -2.5],
  description: 'Chiêm ngưỡng tượng Thái úy Lý Thường Kiệt trên bệ hoa sen, Chiếu thư Nam Quốc Sơn Hà, Sa bàn Như Nguyệt & Cổng Đền Trương Hống – Trương Hát'
});

const PRESET_TAT_DEN = createRoomPresetView('tat_den', {
  name: 'Phòng Trưng Bày Tắt Đèn - Ngô Tất Tố (Phòng {code})',
  localPos: [0, 1.8, 11.0],
  localTarget: [0, 2.1, -4.8],
  description: 'Bước qua Cổng Đình Đông Xá vào không gian Tắt Đèn với Chị Dậu, Đèn Dầu, Tráp Sưu Thuế và Nồi Cháo Cám'
});

const PRESET_VO_NHAT = createRoomPresetView('vo_nhat', {
  name: 'Phòng Trưng Bày Vợ Nhặt - Kim Lân (Phòng {code})',
  localPos: [0, 1.8, 5.5],
  localTarget: [0, 1.3, 0],
  description: 'Chiêm ngưỡng Bục Sách Vợ Nhặt, Nồi chè khoán, Đèn dầu tân hôn, Xe bò thóc và Cờ đỏ'
});

const PRESET_NAM_XUONG = createRoomPresetView('nguoi_con_gai_nam_xuong', {
  name: 'Phòng Trưng Bày Chuyện Người Con Gái Nam Xương – Nguyễn Dữ (Phòng {code})',
  localPos: [0, 1.85, 11.2],
  localTarget: [0, 1.75, -2.5],
  description: 'Bước qua Cổng Trăng Khuyết chiêm ngưỡng Chiếc Bóng Vũ Nương trên vách nứa và Bến Hoàng Giang – Đàn Giải Oan'
});

const PRESET_NAM_XUONG_SHADOW = createRoomPresetView('nguoi_con_gai_nam_xuong', {
  name: 'Phòng {code} • Vách Nứa Chiếc Bóng & Đèn Dầu',
  localPos: [2.8, 1.85, 6.2],
  localTarget: [-1.2, 1.55, 1.9],
  description: 'Cận cảnh nghệ thuật Chiaroscuro: bóng Vũ Nương hắt lên vách nứa từ ngọn đèn dầu cổ'
});

const PRESET_NAM_XUONG_RIVER = createRoomPresetView('nguoi_con_gai_nam_xuong', {
  name: 'Phòng {code} • Bến Hoàng Giang, Đàn Giải Oan & Trâm Vàng',
  localPos: [2.4, 2.25, -1.3],
  localTarget: [0.0, 1.3, -6.8],
  description: 'Chiêm ngưỡng Đàn Giải Oan, Chiếc Trâm Vàng phát sáng và làn lân tinh trên dòng Hoàng Giang'
});

const PRESET_DAY_THON_VI_DA = createRoomPresetView('day_thon_vi_da', {
  name: 'Phòng Trưng Bày Đây Thôn Vĩ Dạ – Hàn Mặc Tử (Phòng {code})',
  localPos: [0, 1.9, 13.0],
  localTarget: [-0.8, 1.55, 6.2],
  description: 'Bước qua Cổng Trúc Xứ Huế vào vườn Vĩ Dạ nắng hàng cau, bến sông trăng và cõi sương khói áo trắng'
});

const PRESET_DAY_THON_VI_DA_SONG_TRANG = createRoomPresetView('day_thon_vi_da', {
  name: 'Phòng {code} • Bến Sông Trăng & Thuyền Nan Xứ Huế',
  localPos: [2.2, 2.15, 0.4],
  localTarget: [-2.0, 1.05, -2.9],
  description: 'Chiêm ngưỡng dòng sông trăng lấp lánh, thuyền nan chở ánh trăng vàng và khóm hoa bắp lay trong gió'
});

const PRESET_DAY_THON_VI_DA_SUONG_KHOI = createRoomPresetView('day_thon_vi_da', {
  name: 'Phòng {code} • Cõi Mộng Sương Khói & Bóng Áo Trắng',
  localPos: [0.4, 1.85, -7.2],
  localTarget: [0.0, 1.65, -11.2],
  description: 'Chiêm ngưỡng vầng trăng huyền ảo, làn sương khói mờ nhân ảnh và bóng áo dài trắng ẩn hiện'
});

export const PRESET_VIEWS = {
  MAIN_ATRIUM: {
    name: 'Đại Sảnh Chính Bảo Tàng',
    position: new THREE.Vector3(0, 1.8, 32.0),
    target: new THREE.Vector3(0, 6.0, 5.0),
    description: 'Chiêm ngưỡng toàn cảnh Đại Sảnh Bảo Tàng Văn Học, Cầu Thang Chữ Y và Giếng Trời Hoàng Kim'
  },
  ROOM_101_THANH_GIONG: createRoomPresetView('thanh_giong', {
    name: 'Phòng Trưng Bày Thánh Gióng – Phù Đổng Thiên Vương (Phòng {code})',
    localPos: [0, 1.8, 10.8],
    localTarget: [0, 2.2, -2.5],
    description: 'Chiêm ngưỡng Bệ Đá Trống Đồng Đông Sơn, Tượng Đài Phù Đổng Thiên Vương, Làng Gióng, Lò Rèn Vũ Khí & Cổng Sóc Sơn'
  }),
  ROOM_201_BOOK: PRESET_TRUYEN_KIEU,
  ROOM_205_TRUYEN_KIEU: PRESET_TRUYEN_KIEU,
  ROOM_202_BOOK: PRESET_NAM_QUOC_SON_HA,
  ROOM_201_NAM_QUOC_SON_HA: PRESET_NAM_QUOC_SON_HA,
  ROOM_204_NAM_XUONG: PRESET_NAM_XUONG,
  ROOM_204_CHUYEN_NGUOI_CON_GAI_NAM_XUONG: PRESET_NAM_XUONG,
  NGUOI_CON_GAI_NAM_XUONG: PRESET_NAM_XUONG,
  ROOM_204_SHADOW_WALL: PRESET_NAM_XUONG_SHADOW,
  ROOM_204_HOANG_GIANG: PRESET_NAM_XUONG_RIVER,
  ROOM_102_SON_TINH: createRoomPresetView('son_tinh_thuy_tinh', {
    name: 'Phòng Trưng Bày Sơn Tinh - Thủy Tinh (Phòng {code})',
    localPos: [0, 1.8, 3.5],
    localTarget: [0, 1.25, 0],
    description: 'Chiêm ngưỡng Bệ Đá Cổ, Cuốn Sách Thần Dịch Chuyển và Tam Sinh Lễ Vật mạ vàng'
  }),
  REALM_SON_TINH_BATTLE: {
    name: 'Cõi Đại Chiến Sơn Tinh - Thủy Tinh (Gojo vs Sukuna)',
    position: new THREE.Vector3(0, 468.0, -392.0),
    target: new THREE.Vector3(0, 444.0, -466.0),
    description: 'Đài Quan Sát Hư Vô: Chiêm ngưỡng Đại Chiến Sơn Tinh vs Thủy Tinh phong cách Gojo vs Sukuna'
  },
  ROOM_103_AN_DUONG_VUONG: createRoomPresetView('an_duong_vuong', {
    name: 'Phòng Trưng Bày An Dương Vương & Cổ Loa Thành (Phòng {code})',
    localPos: [0, 2.0, 6.0],
    localTarget: [0, 2.6, -4.0],
    description: 'Chiêm ngưỡng toàn cảnh Đại Gian Cổ Loa Thành, Nỏ Thần Cao Lỗ và Thần Kim Quy'
  }),
  ROOM_302_DAY_THON_VI_DA: PRESET_DAY_THON_VI_DA,
  DAY_THON_VI_DA: PRESET_DAY_THON_VI_DA,
  ROOM_302_SONG_TRANG: PRESET_DAY_THON_VI_DA_SONG_TRANG,
  ROOM_302_SUONG_KHOI: PRESET_DAY_THON_VI_DA_SUONG_KHOI,
  ROOM_302_TAT_DEN: PRESET_TAT_DEN,
  ROOM_303_TAT_DEN: PRESET_TAT_DEN,
  ROOM_304_VO_NHAT: PRESET_VO_NHAT,
  ROOM_305_VO_NHAT: PRESET_VO_NHAT,
  REALM_VO_NHAT: {
    name: 'Cõi Văn Học Vợ Nhặt (Xóm Ngụ Cư 1945)',
    position: new THREE.Vector3(-260.0, 424.0, -418.0),
    target: new THREE.Vector3(-260.0, 429.5, -474.0),
    description: 'Đài Quan Sát: Chiêm ngưỡng Xóm Ngụ Cư, Mái Nhà Tranh Bà Cụ Tứ và Đoàn Người Phá Kho Thóc'
  },
  REALM_AN_DUONG_VUONG: {
    name: 'Cõi Cổ Loa Thành & Biển Đông (An Dương Vương)',
    position: new THREE.Vector3(260.0, 430.5, -418.0),
    target: new THREE.Vector3(260.0, 422.5, -450.0),
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
  TRANG_AN_VISTA: createRoomPresetView('nam_quoc_son_ha', {
    name: 'Hiên Ngắm Non Nước Tràng An',
    localPos: [0, 1.8, -2.0],
    localTarget: [0, 22.0, -92.0],
    description: 'Từ bệ sách ma thuật phóng tầm mắt qua lan can Indochine ra biển mây và dãy núi đá vôi Tràng An'
  })
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

    // Trạng thái Focus Zoom cho Bảng Thông Tin 3D / Hiện vật
    this._savedFocusState = null;
    this._isPlaqueFocusActive = false;
    this._isRestoringFocus = false;
    this._userMovedDuringFocus = false;
    this._internalControlsUpdate = false;

    // Tích hợp Cinematic Tour 30s
    this.cinematicTour = new CinematicTour(this.camera, this.controls);

    // Tích hợp Dual Camera Controller (PointerLockControls FPP & Freecam)
    this.cameraController = new CameraController(this.camera, this.domElement);

    // Xử lý xung đột giữa OrbitControls và PointerLockControls
    this.cameraController.controls?.addEventListener?.('lock', () => {
      this.isTransitioning = false;
      this.cameraController?.cancelFocusZoom?.(false);
      this._savedFocusState = null;
      this._isPlaqueFocusActive = false;
      this._isRestoringFocus = false;
      this._userMovedDuringFocus = true;
      this.controls.enabled = false;
    });

    this.cameraController.controls?.addEventListener?.('unlock', () => {
      if (!this.cameraController?.isFocusZooming && !this.cameraController?.isFastTraveling) {
        this.controls.enabled = true;
      }
    });

    // Nếu người dùng tự xoay/kéo OrbitControls -> hủy mọi glide tự động và không snap ngược lại
    this.controls?.addEventListener?.('start', () => {
      if (this._internalControlsUpdate) return;
      this.isTransitioning = false;
      if (this.cameraController?.isFocusZooming) {
        this.cameraController.cancelFocusZoom(false);
      }
      if (this._isPlaqueFocusActive || this._isRestoringFocus) {
        this._userMovedDuringFocus = true;
        this._savedFocusState = null;
        this._isRestoringFocus = false;
      }
    });

    if (typeof window !== 'undefined') {
      window.__museumCameraManager = this;
    }

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
    this.cancelFocusZoom();
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

  getPresetViewForRoom(roomId) {
    if (!roomId) return null;
    const views = Object.values(PRESET_VIEWS);
    for (let i = 0; i < views.length; i++) {
      if (views[i]?.roomId === roomId) return views[i];
    }
    return null;
  }

  focusRoomPreset(roomId, smooth = true) {
    const preset = this.getPresetViewForRoom(roomId);
    if (!preset) return false;
    this.setView(preset, smooth);
    return true;
  }

  /**
   * CƠ CHẾ FAST-TRAVEL 1.8S ĐẾN ĐIỂM QUAN SÁT PHÒNG
   */
  fastTravelTo(targetPos, lookAtTarget, onComplete = null) {
    if (this.cinematicTour?.isPlaying) {
      this.cinematicTour.stop();
    }
    this.cancelFocusZoom();
    this.isTransitioning = false;
    if (this.controls) {
      this.controls.enabled = false;
    }

    return this.cameraController?.fastTravelTo(targetPos, lookAtTarget, () => {
      if (this.controls) {
        this._internalControlsUpdate = true;
        this.controls.target.copy(lookAtTarget);
        this.controls.enabled = true;
        this.controls.update();
        this._internalControlsUpdate = false;
      }
      onComplete?.();
    });
  }

  /**
   * Tính toán tọa độ camera tối ưu để căn khung mặt trước của Bảng Thông Tin 3D / Hiện vật
   */
  computeObjectFocusPose(targetObject, options = {}) {
    if (!targetObject) return null;
    const visualTarget = targetObject.userData?.linkedVisualObject || targetObject;
    visualTarget.updateMatrixWorld?.(true);

    // Ưu tiên tọa độ & pháp tuyến mặt bảng đồng bộ trực tiếp từ RoomInfoPlaque (focusPoint & focusNormal)
    const objUd = targetObject.userData || {};
    const visUd = visualTarget.userData || {};
    const rawCamPos = objUd.focusCameraPos || visUd.focusCameraPos;
    const rawLookAt = objUd.focusLookAt || visUd.focusLookAt;
    if (rawCamPos && rawLookAt) {
      return {
        position: new THREE.Vector3(rawCamPos.x, rawCamPos.y, rawCamPos.z),
        target: new THREE.Vector3(rawLookAt.x, rawLookAt.y, rawLookAt.z)
      };
    }

    const rawFocusPoint = objUd.focusPoint || visUd.focusPoint;
    const rawFocusNormal = objUd.focusNormal || visUd.focusNormal;
    if (rawFocusPoint && rawFocusNormal) {
      const fp = rawFocusPoint.clone();
      const fn = rawFocusNormal.clone().normalize();
      if (fn.lengthSq() > 1e-6) {
        const dist = Number(
          options.distance ??
          objUd.focusDistance ??
          visUd.focusDistance ??
          2.15
        );
        const endPos = fp.clone().addScaledVector(fn, dist);
        // Giữ camera ở tầm nhìn thoải mái, hơi hướng nhẹ về mặt bảng nghiêng
        endPos.y = Math.max(fp.y - 0.04, endPos.y);
        return {
          position: endPos,
          target: fp
        };
      }
    }

    const box = new THREE.Box3();
    let hasBox = false;
    try {
      box.setFromObject(visualTarget);
      hasBox = !box.isEmpty();
    } catch (_) {}

    const center = new THREE.Vector3();
    const size = new THREE.Vector3(1.6, 1.2, 0.2);
    if (hasBox) {
      box.getCenter(center);
      box.getSize(size);
    } else {
      visualTarget.getWorldPosition?.(center);
    }

    const loreKeyStr = String(objUd.loreKey || visUd.loreKey || '');
    const shouldApproachFromCamera = Boolean(
      options.approachFromCamera ||
      objUd.approachFromCamera ||
      visUd.approachFromCamera ||
      objUd.isArtifact3D ||
      visUd.isArtifact3D ||
      loreKeyStr.startsWith('nam_xuong_') ||
      loreKeyStr.startsWith('vida_')
    );

    const frontNormal = new THREE.Vector3(0, 0, 1);
    if (options.facingNormal) {
      frontNormal.copy(options.facingNormal).normalize();
    } else if (visualTarget.userData?.frontNormal) {
      frontNormal.copy(visualTarget.userData.frontNormal).normalize();
    } else if (shouldApproachFromCamera && this.camera) {
      frontNormal.subVectors(this.camera.position, center);
      frontNormal.y = 0;
      if (frontNormal.lengthSq() < 1e-6) {
        frontNormal.set(0, 0, 1);
      } else {
        frontNormal.normalize();
      }
    } else {
      const quat = new THREE.Quaternion();
      visualTarget.getWorldQuaternion?.(quat);
      frontNormal.applyQuaternion(quat).normalize();
      if (frontNormal.lengthSq() < 1e-6) {
        frontNormal.set(0, 0, 1);
      }
    }

    // Nếu bảng hai mặt và camera đang đứng phía sau, giữ hướng tiếp cận tự nhiên thay vì bay xuyên qua bảng
    if (visualTarget.userData?.doubleSided && this.camera) {
      const toCam = new THREE.Vector3().subVectors(this.camera.position, center);
      if (toCam.dot(frontNormal) < -0.15) {
        frontNormal.negate();
      }
    }

    const span = Math.max(size.x, size.y, 1.3);
    const distance = Number(
      options.distance ??
      targetObject.userData?.focusDistance ??
      visualTarget.userData?.focusDistance ??
      Math.max(1.9, Math.min(3.1, span * 1.18))
    );

    const endPos = center.clone().addScaledVector(frontNormal, distance);
    // Giữ độ cao nhìn cân đối theo tầm mắt người xem
    endPos.y = Math.max(center.y - 0.05, endPos.y);

    return {
      position: endPos,
      target: center
    };
  }

  /**
   * Lướt camera mượt mà (Smooth Camera Zoom) để căn khung hình Bảng Thông Tin 3D / Hiện vật
   * Hỗ trợ truyền (targetObject, options) hoặc (targetPos, lookAtTarget, options) hoặc ({ position, target }, options)
   */
  smoothZoomToFocus(targetOrPos, lookAtOrOptions = null, maybeOptions = {}) {
    if (!this.camera || !targetOrPos) return false;

    let endPos = null;
    let endLook = null;
    let opts = {};

    if (targetOrPos.isObject3D) {
      opts = (lookAtOrOptions && typeof lookAtOrOptions === 'object') ? lookAtOrOptions : {};
      const pose = this.computeObjectFocusPose(targetOrPos, opts);
      if (!pose) return false;
      endPos = pose.position;
      endLook = pose.target;
    } else if (targetOrPos.position && targetOrPos.target) {
      endPos = new THREE.Vector3(targetOrPos.position.x, targetOrPos.position.y, targetOrPos.position.z);
      endLook = new THREE.Vector3(targetOrPos.target.x, targetOrPos.target.y, targetOrPos.target.z);
      opts = (lookAtOrOptions && typeof lookAtOrOptions === 'object') ? lookAtOrOptions : {};
    } else if (lookAtOrOptions && typeof lookAtOrOptions.x === 'number') {
      endPos = new THREE.Vector3(targetOrPos.x, targetOrPos.y, targetOrPos.z);
      endLook = new THREE.Vector3(lookAtOrOptions.x, lookAtOrOptions.y, lookAtOrOptions.z);
      opts = (maybeOptions && typeof maybeOptions === 'object') ? maybeOptions : {};
    } else {
      return false;
    }

    if (this.cinematicTour?.isPlaying) {
      this.cinematicTour.stop();
    }
    this.isTransitioning = false;
    this._isRestoringFocus = false;
    if (this.cameraController) {
      this.cameraController.isFastTraveling = false;
    }

    // Lưu vị trí trước khi zoom để khôi phục mượt mà khi đóng thẻ thông tin
    if (!this._isPlaqueFocusActive && !this._savedFocusState && opts.savePrevious !== false) {
      const prevLook = new THREE.Vector3();
      if (this.controls?.target && this.controls.enabled) {
        prevLook.copy(this.controls.target);
      } else {
        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        prevLook.copy(this.camera.position).addScaledVector(dir, 4.0);
      }
      this._savedFocusState = {
        position: this.camera.position.clone(),
        target: prevLook
      };
    }

    this._isPlaqueFocusActive = true;
    this._userMovedDuringFocus = false;

    if (this.controls) {
      this.controls.enabled = false;
    }

    return this.cameraController?.smoothZoomToFocus(endPos, endLook, {
      duration: opts.duration ?? 0.72,
      onComplete: () => {
        if (this.controls && !this.cameraController?.controls?.isLocked) {
          this._internalControlsUpdate = true;
          this.controls.target.copy(endLook);
          this.controls.enabled = true;
          this.controls.update();
          this._internalControlsUpdate = false;
        }
        opts.onComplete?.();
      },
      onCancel: () => {
        this._isPlaqueFocusActive = false;
        this._savedFocusState = null;
        this._userMovedDuringFocus = true;
        if (this.controls && !this.cameraController?.controls?.isLocked) {
          this.controls.enabled = true;
        }
        opts.onCancel?.();
      }
    }) ?? false;
  }

  /**
   * Khôi phục hoặc nhả quyền điều khiển camera mượt mà khi đóng Popup Lore Card
   */
  restoreFromFocus({ smooth = true, duration = 0.52 } = {}) {
    const wasZooming = Boolean(this.cameraController?.isFocusZooming);
    if (wasZooming) {
      this.cameraController.cancelFocusZoom(false);
    }

    const saved = this._savedFocusState;
    const shouldRestore = Boolean(
      this._isPlaqueFocusActive &&
      saved &&
      smooth &&
      !this._userMovedDuringFocus &&
      !this.cameraController?.controls?.isLocked
    );

    this._savedFocusState = null;
    this._isPlaqueFocusActive = false;

    if (!shouldRestore) {
      this._isRestoringFocus = false;
      if (this.controls && !this.cameraController?.controls?.isLocked) {
        this.controls.enabled = true;
      }
      return false;
    }

    this._isRestoringFocus = true;
    if (this.controls) {
      this.controls.enabled = false;
    }

    return this.cameraController?.smoothZoomToFocus(saved.position, saved.target, {
      duration,
      onComplete: () => {
        this._isRestoringFocus = false;
        if (this.controls && !this.cameraController?.controls?.isLocked) {
          this._internalControlsUpdate = true;
          this.controls.target.copy(saved.target);
          this.controls.enabled = true;
          this.controls.update();
          this._internalControlsUpdate = false;
        }
      },
      onCancel: () => {
        this._isRestoringFocus = false;
        if (this.controls && !this.cameraController?.controls?.isLocked) {
          this.controls.enabled = true;
        }
      }
    }) ?? false;
  }

  cancelFocusZoom() {
    this.cameraController?.cancelFocusZoom?.(false);
    this._savedFocusState = null;
    this._isPlaqueFocusActive = false;
    this._isRestoringFocus = false;
    if (this.controls && !this.cameraController?.controls?.isLocked) {
      this.controls.enabled = true;
    }
  }

  update(delta = 0.016) {
    // 1. Nếu Tour đang chạy: Tour kiểm soát camera
    if (this.cinematicTour?.isPlaying) {
      this.cinematicTour.update(delta);
      return;
    }

    // 1.5. Nếu đang Fast-Travel hoặc Focus Zoom: CameraController kiểm soát 100%, không để OrbitControls xung đột
    if (this.cameraController?.isFastTraveling || this.cameraController?.isFocusZooming) {
      if (this.controls) this.controls.enabled = false;
      this.cameraController.update(delta);
      return;
    }

    // 2. Nếu PointerLock đang khóa (Người chơi đang di chuyển WASD / Chuột)
    if (this.cameraController?.controls?.isLocked) {
      if (this._isPlaqueFocusActive || this._isRestoringFocus) {
        this._userMovedDuringFocus = true;
        this._savedFocusState = null;
        this._isPlaqueFocusActive = false;
        this._isRestoringFocus = false;
      }
      this.cameraController.update(delta);
      return;
    }

    // Kiểm tra nếu người dùng nhấn phím di chuyển trong lúc đang mở focus
    const keys = this.cameraController?.keys;
    if (this._isPlaqueFocusActive && keys && (keys.forward || keys.backward || keys.left || keys.right || keys.up || keys.down)) {
      this._userMovedDuringFocus = true;
      this._savedFocusState = null;
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
      this._internalControlsUpdate = true;
      this.controls.update();
      this._internalControlsUpdate = false;
    }
  }
}
