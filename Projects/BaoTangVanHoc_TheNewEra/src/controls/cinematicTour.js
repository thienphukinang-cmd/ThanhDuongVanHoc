import * as THREE from 'three';

/**
 * CINEMATIC TOUR CONTROLLER (AUTO-CAMERA TOUR 30 GIÂY)
 * Skill: threejs-camera-direction
 * 
 * Áp dụng Lập trình phòng ngừa (Defensive Programming & Nullish Coalescing)
 */

export class CinematicTour {
  constructor(camera = null, controls = null) {
    this.camera = camera;
    this.controls = controls;

    this.isPlaying = false;
    this.currentTime = 0.0;
    this.duration = 30.0;

    this.savedPosition = new THREE.Vector3();
    this.savedTarget = new THREE.Vector3();

    this.onProgressUpdate = null;
    this.onTourComplete = null;

    this.createFadeOverlay();
    this.initSplines();
  }

  createFadeOverlay() {
    try {
      let overlay = document.getElementById('cinematic-fade-overlay');
      if (!overlay && typeof document !== 'undefined') {
        overlay = document.createElement('div');
        overlay.id = 'cinematic-fade-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = '#000000';
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '999';
        overlay.style.transition = 'opacity 0.05s linear';
        document.body.appendChild(overlay);
      }
      this.fadeOverlay = overlay;
    } catch (e) {
      console.warn("[SELF-HEALING] Không tạo được fade overlay:", e);
    }
  }

  setFadeOpacity(opacity = 0) {
    if (this.fadeOverlay) {
      const val = Math.max(0, Math.min(1, Number(opacity) || 0));
      this.fadeOverlay.style.opacity = val.toString();
    }
  }

  initSplines() {
    const phase2Points = [
      new THREE.Vector3(0, 1.8, 34.0),
      new THREE.Vector3(0, 1.4, 27.0),
      new THREE.Vector3(0, 1.5, 23.0),
      new THREE.Vector3(0, 2.6, 17.5),
      new THREE.Vector3(0, 3.8, 12.5),
      new THREE.Vector3(0, 5.2, 7.8)
    ];
    this.phase2Curve = new THREE.CatmullRomCurve3(phase2Points);
    this.phase2Curve.curveType = 'centripetal';

    const phase4Points = [
      new THREE.Vector3(0, 5.2, 7.5),
      new THREE.Vector3(0, 14.0, 5.0),
      new THREE.Vector3(0, 24.0, 2.5),
      new THREE.Vector3(0, 34.0, 0.8),
      new THREE.Vector3(0, 39.8, 0.1)
    ];
    this.phase4Curve = new THREE.CatmullRomCurve3(phase4Points);
    this.phase4Curve.curveType = 'centripetal';
  }

  start() {
    if (this.camera?.position) {
      this.savedPosition.copy(this.camera.position);
    }
    if (this.controls?.target) {
      this.savedTarget.copy(this.controls.target);
    }

    this.isPlaying = true;
    this.currentTime = 0.0;
    if (this.controls) {
      this.controls.enabled = false;
    }
    this.setFadeOpacity(0);
    this.updateCameraAtTime(0.0);
  }

  stop() {
    this.isPlaying = false;
    if (this.controls) {
      this.controls.enabled = true;
    }
    this.setFadeOpacity(0);
  }

  replay() {
    this.start();
  }

  update(delta = 0.016) {
    if (!this.isPlaying) return;

    this.currentTime += (delta ?? 0.016);

    if (this.currentTime >= this.duration) {
      this.currentTime = this.duration;
      this.updateCameraAtTime(this.currentTime);
      this.isPlaying = false;
      if (this.controls) {
        this.controls.enabled = true;
      }

      try {
        this.onTourComplete?.();
      } catch (err) {
        console.warn("[SELF-HEALING] Lỗi callback onTourComplete:", err);
      }
      return;
    }

    this.updateCameraAtTime(this.currentTime);

    try {
      this.onProgressUpdate?.(this.currentTime, this.duration);
    } catch (err) {
      console.warn("[SELF-HEALING] Lỗi callback onProgressUpdate:", err);
    }
  }

  updateCameraAtTime(t = 0) {
    if (!this.camera) return;

    const camPos = new THREE.Vector3();
    const targetPos = new THREE.Vector3();

    // 1. GIÂY 0-5
    if (t < 5.0) {
      const u = t / 5.0;
      const ease = u * u * (3.0 - 2.0 * u);

      camPos.set(0, 1.8, 38.0 - ease * 4.0);

      const lookY = 3.0 + ease * 33.0;
      const lookZ = 12.0 - ease * 12.0;
      targetPos.set(0, lookY, lookZ);

      this.setFadeOpacity(0);
    }
    // 2. GIÂY 5-15
    else if (t >= 5.0 && t < 15.0) {
      const u = (t - 5.0) / 10.0;
      const ease = u * u * (3.0 - 2.0 * u);

      if (this.phase2Curve) {
        this.phase2Curve.getPoint(ease, camPos);
        const tangent = this.phase2Curve.getTangent(ease);
        targetPos.copy(camPos).add(tangent.multiplyScalar(10.0));
      } else {
        camPos.set(0, 1.8 + ease * 3.4, 34.0 - ease * 26.2);
        targetPos.set(0, 5.0, 0);
      }
      targetPos.y = Math.max(targetPos.y, camPos.y + 1.2);

      this.setFadeOpacity(0);
    }
    // 3. GIÂY 15-22
    else if (t >= 15.0 && t < 22.0) {
      const u = (t - 15.0) / 7.0;
      const ease = 0.5 - 0.5 * Math.cos(u * Math.PI);

      camPos.set(
        Math.sin(u * Math.PI * 2) * 0.4,
        5.2 + Math.sin(u * Math.PI) * 0.3,
        7.6
      );

      const startAngle = -Math.PI * 0.75;
      const sweepRange = Math.PI * 1.5;
      const currentAngle = startAngle + ease * sweepRange;

      const panRadius = 38.0;
      targetPos.set(
        Math.cos(currentAngle) * panRadius,
        13.5,
        Math.sin(currentAngle) * panRadius
      );

      this.setFadeOpacity(0);
    }
    // 4. GIÂY 22-30
    else {
      const u = (t - 22.0) / 8.0;
      const ease = u * u * (3.0 - 2.0 * u);

      if (this.phase4Curve) {
        this.phase4Curve.getPoint(ease, camPos);
      } else {
        camPos.set(0, 5.2 + ease * 34.6, 7.5 - ease * 7.4);
      }

      const lookX = 0;
      const lookY = 12.0 * (1.0 - ease);
      const lookZ = -10.0 * (1.0 - ease) * (1.0 - ease);
      targetPos.set(lookX, lookY, lookZ);

      if (t >= 28.0) {
        const fadeProgress = (t - 28.0) / 2.0;
        this.setFadeOpacity(fadeProgress);
      } else {
        this.setFadeOpacity(0);
      }
    }

    try {
      this.camera.position.copy(camPos);
      this.camera.lookAt(targetPos);
      if (this.controls?.target) {
        this.controls.target.copy(targetPos);
      }
    } catch (err) {
      console.warn("[SELF-HEALING] Lỗi cập nhật camera trong tour:", err);
    }
  }

  getCurrentPhaseName() {
    const t = this.currentTime ?? 0;
    if (t < 5.0) return "Pha 1/4: Ngước nhìn Mái vòm kính & 16 Cột khổng lồ";
    if (t < 15.0) return "Pha 2/4: Lướt sàn đá đen & Leo thang chữ Y lên chiếu nghỉ";
    if (t < 22.0) return "Pha 3/4: Panning 180° phô diễn 5 cửa vòm phòng Tầng 2";
    return "Pha 4/4: Vút lên đỉnh Y=40m • Toàn cảnh Top-down & Fade out";
  }
}
