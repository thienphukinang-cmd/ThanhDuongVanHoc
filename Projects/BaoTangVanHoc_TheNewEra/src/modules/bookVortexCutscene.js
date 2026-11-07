import * as THREE from 'three';

/**
 * =============================================================================
 * HỆ THỐNG CUTSCENE 2 CHIỀU:
 * 1. playBookSuckInCutscene: Hút xoáy Camera từ phòng bảo tàng vào giữa trang sách
 * 2. playBookReturnCutscene: Thu hồi từ thế giới và bay ngược từ trang sách ra bảo tàng
 * =============================================================================
 */

let _vortexOverlay = null;

function getOrCreateVortexOverlay() {
  if (typeof document === 'undefined') return null;
  if (_vortexOverlay) return _vortexOverlay;

  const overlay = document.createElement('div');
  overlay.id = 'book-suck-vortex-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; pointer-events: none; z-index: 999998;
    opacity: 0; transition: opacity 0.18s ease;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
  `;

  overlay.innerHTML = `
    <div id="book-vortex-tunnel" style="
      width: 145vmax; height: 145vmax; border-radius: 50%;
      background: repeating-radial-gradient(
        circle at center,
        rgba(255, 255, 255, 0.0) 0%,
        rgba(255, 224, 130, 0.20) 6%,
        rgba(56, 189, 248, 0.30) 12%,
        rgba(0, 0, 0, 0.0) 18%
      );
      transform: scale(2.6) rotate(0deg);
      will-change: transform;
    "></div>
    <div id="book-vortex-flash" style="
      position: absolute; inset: 0;
      background: radial-gradient(circle, #ffffff 0%, #fde047 45%, #050b14 100%);
      opacity: 0; transition: opacity 0.22s ease;
      will-change: opacity;
    "></div>
  `;

  document.body.appendChild(overlay);
  _vortexOverlay = overlay;
  return overlay;
}

/**
 * 1. CUTSCENE KHI VÀO THẾ GIỚI: Hút Camera xoáy thẳng vào giữa hai trang sách
 * Tương thích linh hoạt mọi tham số: bookMesh, bookObject, onTransition, onSwapScene, onComplete
 */
export function playBookSuckInCutscene({
  camera,
  cameraController = null,
  controls = null,
  bookObject = null,
  bookMesh = null,
  targetPosition = null,
  themeColor = 0x38bdf8,
  themeColorHex = null,
  onTransition = null,
  onSwapScene = null,
  onComplete = null
}) {
  const targetBook = bookObject || bookMesh;

  let hex = '#38bdf8';
  if (typeof themeColorHex === 'string') {
    hex = themeColorHex;
  } else if (typeof themeColor === 'string') {
    hex = themeColor;
  } else if (typeof themeColor === 'number') {
    hex = '#' + themeColor.toString(16).padStart(6, '0');
  }

  if (!camera || (!targetBook && !targetPosition)) {
    if (typeof onTransition === 'function') onTransition();
    if (typeof onSwapScene === 'function') onSwapScene();
    if (typeof onComplete === 'function') onComplete();
    return;
  }

  if (typeof document !== 'undefined' && document.pointerLockElement && document.exitPointerLock) {
    try { document.exitPointerLock(); } catch (e) {}
  }
  if (controls) controls.enabled = false;
  if (cameraController) cameraController.isEnabled = false;

  const startPos = camera.position.clone();
  const startQuat = camera.quaternion.clone();
  const originalFov = camera.fov || 60;

  const bookWorldPos = new THREE.Vector3();
  if (targetBook) {
    targetBook.updateMatrixWorld(true);
    if (targetBook.userData?.bookMeshGroup) {
      targetBook.userData.bookMeshGroup.getWorldPosition(bookWorldPos);
    } else {
      let found = null;
      targetBook.traverse((child) => {
        if (!found && child.isMesh && (child.name?.toLowerCase().includes('page') || child.name?.toLowerCase().includes('book'))) {
          found = child;
        }
      });
      if (found) {
        found.getWorldPosition(bookWorldPos);
      } else {
        targetBook.getWorldPosition(bookWorldPos);
      }
    }
  } else if (targetPosition) {
    bookWorldPos.copy(targetPosition);
  }

  const targetPos = bookWorldPos.clone().add(new THREE.Vector3(0, 0.25, 0));

  const dummyCam = camera.clone();
  dummyCam.position.copy(startPos);
  dummyCam.lookAt(targetPos);
  const targetLookQuat = dummyCam.quaternion.clone();

  const overlay = getOrCreateVortexOverlay();
  const tunnel = document.getElementById('book-vortex-tunnel');
  const flash = document.getElementById('book-vortex-flash');

  if (overlay && tunnel && flash) {
    tunnel.style.background = `repeating-radial-gradient(
      circle at center,
      rgba(255, 255, 255, 0.0) 0%,
      ${hex}44 7%,
      rgba(253, 224, 130, 0.35) 14%,
      rgba(0, 0, 0, 0.0) 20%
    )`;
    flash.style.background = `radial-gradient(circle, #ffffff 0%, ${hex} 50%, #050b14 100%)`;

    tunnel.style.transition = 'none';
    tunnel.style.transform = 'scale(2.6) rotate(0deg)';
    flash.style.opacity = '0';
    overlay.style.opacity = '1';

    requestAnimationFrame(() => {
      tunnel.style.transition = 'transform 0.92s cubic-bezier(0.55, 0.055, 0.675, 0.19)';
      tunnel.style.transform = 'scale(0.08) rotate(540deg)';
    });
  }

  const duration = 920;
  const startTime = performance.now();
  let transitioned = false;

  function step(now) {
    const elapsed = now - startTime;
    const t = Math.min(elapsed / duration, 1.0);

    if (!transitioned) {
      const pullFactor = t * t * t; // Ease-In Cubic
      camera.position.lerpVectors(startPos, targetPos, pullFactor);
      camera.quaternion.slerpQuaternions(startQuat, targetLookQuat, Math.min(t * 2.2, 1.0));
      camera.rotation.z += Math.sin(t * Math.PI) * 0.12 * t;

      if (t < 0.7) {
        camera.fov = originalFov + (t / 0.7) * 42;
      } else {
        camera.fov = (originalFov + 42) - ((t - 0.7) / 0.3) * 65;
      }
      camera.updateProjectionMatrix();
    }

    if (t >= 0.78 && flash && flash.style.opacity === '0') {
      flash.style.opacity = '1';
    }

    // Thời điểm chớp sáng cực đại: Kích hoạt callback hoán đổi không gian
    if (t >= 0.82 && !transitioned) {
      transitioned = true;
      if (typeof onTransition === 'function') {
        onTransition();
      } else if (typeof onSwapScene === 'function') {
        onSwapScene();
      }
    }

    if (t < 1.0) {
      requestAnimationFrame(step);
    } else {
      camera.fov = originalFov;
      camera.rotation.z = 0;
      camera.updateProjectionMatrix();

      if (controls) controls.enabled = true;
      if (cameraController) cameraController.isEnabled = true;

      if (typeof onComplete === 'function') onComplete();

      setTimeout(() => {
        if (flash) flash.style.opacity = '0';
        if (overlay) overlay.style.opacity = '0';
      }, 180);
    }
  }

  requestAnimationFrame(step);
}

export const playBookVortexCutscene = playBookSuckInCutscene;

/**
 * 2. CUTSCENE KHI QUAY VỀ BẢO TÀNG:
 *    Thu hồi không gian từ Thế Giới -> Chớp sáng dịch chuyển -> Bay ngược từ giữa trang sách ra ngoài sảnh
 */
export function playBookReturnCutscene({
  camera,
  bookObject = null,
  bookMesh = null,
  returnCamPos,
  lookTargetPos,
  themeColorHex = '#f472b6',
  themeColor,
  onSwapScene = null,
  onTransition = null,
  onComplete = null
}) {
  const targetBook = bookObject || bookMesh;

  let hex = '#f472b6';
  if (typeof themeColorHex === 'string') {
    hex = themeColorHex;
  } else if (typeof themeColor === 'string') {
    hex = themeColor;
  } else if (typeof themeColor === 'number') {
    hex = '#' + themeColor.toString(16).padStart(6, '0');
  }

  if (!camera || !targetBook || !returnCamPos || !lookTargetPos) {
    if (typeof onSwapScene === 'function') onSwapScene();
    else if (typeof onTransition === 'function') onTransition();
    if (typeof onComplete === 'function') onComplete();
    return;
  }

  if (typeof document !== 'undefined' && document.pointerLockElement && document.exitPointerLock) {
    try { document.exitPointerLock(); } catch (e) {}
  }

  const originalFov = camera.fov || 60;

  const overlay = getOrCreateVortexOverlay();
  const tunnel = document.getElementById('book-vortex-tunnel');
  const flash = document.getElementById('book-vortex-flash');

  if (overlay && tunnel && flash) {
    tunnel.style.background = `repeating-radial-gradient(
      circle at center,
      rgba(255, 255, 255, 0.0) 0%,
      ${hex}55 7%,
      rgba(253, 224, 130, 0.38) 14%,
      rgba(0, 0, 0, 0.0) 20%
    )`;
    flash.style.background = `radial-gradient(circle, #ffffff 0%, ${hex} 52%, #050b14 100%)`;

    // Giai đoạn 1: Bắt đầu từ tâm thu nhỏ rồi bung xoáy ngược ra ngoài
    tunnel.style.transition = 'none';
    tunnel.style.transform = 'scale(0.08) rotate(540deg)';
    flash.style.opacity = '0';
    overlay.style.opacity = '1';

    requestAnimationFrame(() => {
      tunnel.style.transition = 'transform 0.42s cubic-bezier(0.16, 1, 0.3, 1)';
      tunnel.style.transform = 'scale(2.6) rotate(0deg)';
    });
  }

  const phase1Duration = 420; // 0ms -> 420ms
  const phase2Duration = 630; // 420ms -> 1050ms
  const startTime = performance.now();

  let hasSwappedScene = false;
  const bookSurfacePos = new THREE.Vector3();

  function step(now) {
    const elapsed = now - startTime;

    // GIAI ĐOẠN 1 (0ms -> 420ms): Xoay nhẹ rotation.z, giãn fov +36 độ, bật chớp sáng flash
    if (elapsed < phase1Duration) {
      const t1 = elapsed / phase1Duration;
      camera.rotation.z = -Math.sin(t1 * Math.PI) * 0.14;
      camera.fov = originalFov + t1 * 36;
      camera.updateProjectionMatrix();

      if (t1 >= 0.50 && flash && flash.style.opacity !== '1') {
        flash.style.opacity = '1';
      }

      requestAnimationFrame(step);
      return;
    }

    // THỜI ĐIỂM CHUYỂN CẢNH (420ms): Gọi onSwapScene(), đặt Camera ngay mặt sách, hạ chớp sáng
    if (!hasSwappedScene) {
      hasSwappedScene = true;
      if (flash) flash.style.opacity = '1';

      if (typeof onSwapScene === 'function') onSwapScene();
      else if (typeof onTransition === 'function') onTransition();

      // Cập nhật ma trận và lấy tọa độ mặt sách (bookWorldPos + (0, 0.28, 0))
      targetBook.updateMatrixWorld(true);
      if (targetBook.userData?.bookMeshGroup) {
        targetBook.userData.bookMeshGroup.getWorldPosition(bookSurfacePos);
      } else {
        targetBook.getWorldPosition(bookSurfacePos);
      }
      bookSurfacePos.y += 0.28;

      camera.position.copy(bookSurfacePos);
      camera.lookAt(lookTargetPos);

      // Hạ dần màn chớp sáng về 0
      if (flash) flash.style.opacity = '0';
    }

    // GIAI ĐOẠN 2 (420ms -> 1050ms): Bay ngược từ mặt sách lùi ra returnCamPos theo easeOutCubic
    const elapsed2 = elapsed - phase1Duration;
    const t2 = Math.min(elapsed2 / phase2Duration, 1.0);
    const easeOut = 1 - Math.pow(1 - t2, 3); // easeOutCubic

    camera.position.lerpVectors(bookSurfacePos, returnCamPos, easeOut);
    camera.lookAt(lookTargetPos);

    camera.rotation.z = (1 - easeOut) * 0.12;
    camera.fov = (originalFov + 36) - easeOut * 36;
    camera.updateProjectionMatrix();

    if (t2 >= 0.75 && overlay && overlay.style.opacity !== '0') {
      overlay.style.opacity = '0';
    }

    if (t2 < 1.0) {
      requestAnimationFrame(step);
    } else {
      // KẾT THÚC (1050ms): Khôi phục chính xác góc nhìn & mở khóa điều khiển
      camera.position.copy(returnCamPos);
      camera.lookAt(lookTargetPos);
      camera.fov = originalFov;
      camera.rotation.z = 0;
      camera.updateProjectionMatrix();

      if (overlay) overlay.style.opacity = '0';
      if (flash) flash.style.opacity = '0';
      if (typeof onComplete === 'function') onComplete();
    }
  }

  requestAnimationFrame(step);
}
