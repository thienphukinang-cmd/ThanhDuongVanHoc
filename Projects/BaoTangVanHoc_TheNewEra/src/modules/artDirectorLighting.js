import * as THREE from 'three';
import { DIMENSIONS } from '../config/dimensions.js';

/**
 * ART DIRECTOR, LIGHTING & AERIAL ATMOSPHERE MODULE
 * Skills:
 * - threejs-art-director (Chỉ đạo nghệ thuật, đồng bộ ánh sáng và màu sắc)
 * - threejs-atmosphere-aerial-perspective (Khí quyển, sương mù nhẹ, độ sâu không gian)
 * 
 * Áp dụng Lập trình phòng ngừa (Defensive Programming & Nullish Coalescing)
 */

export class ArtDirectorLighting {
  constructor(scene = null) {
    this.scene = scene ?? new THREE.Scene();
    this.group = new THREE.Group();
    this.group.name = "ArtDirector_Lighting_Atmosphere";
    this.scene.add(this.group);

    this.godRayUniforms = null;

    this.setupAtmosphereAerialPerspective();
    this.setupLighting();
    this.setupVolumetricGodRays();
  }

  setupAtmosphereAerialPerspective() {
    // Chiều sâu không khí bằng FogExp2 hoàng hôn ấm áp, không che khuất Tràng An
    const fogColor = new THREE.Color(0xdca878);
    this.scene.fog = new THREE.FogExp2(0xdca878, 0.00075);

    // Vòm trời bao la đường kính 3000m (bán kính 1500m) ôm trọn dãy núi đá vôi Tràng An
    const skyGeo = new THREE.SphereGeometry(1500, 32, 20);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uColorTop: { value: new THREE.Color(0x283d4a) },
        uColorMid: { value: new THREE.Color(0x4a5d6a) },
        uColorBottom: { value: new THREE.Color(0x1a1815) },
        uColorWarmSun: { value: new THREE.Color(0xffeedd) },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 uColorTop;
        uniform vec3 uColorMid;
        uniform vec3 uColorBottom;
        uniform vec3 uColorWarmSun;
        varying vec3 vWorldPosition;

        void main() {
          vec3 nPos = normalize(vWorldPosition);
          float h = nPos.y;

          vec3 sky = mix(uColorBottom, uColorMid, smoothstep(-0.05, 0.35, h));
          sky = mix(sky, uColorTop, smoothstep(0.35, 0.95, h));

          vec3 sunDir = normalize(vec3(0.5, 0.45, 0.4));
          float sunDot = max(0.0, dot(nPos, sunDir));
          sky += uColorWarmSun * pow(sunDot, 12.0) * 0.45;
          sky += uColorWarmSun * pow(sunDot, 3.0) * 0.15;

          gl_FragColor = vec4(sky, 1.0);
        }
      `
    });

    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    skyDome.name = "Celestial_Morning_SkyDome";
    this.group.add(skyDome);
  }

  setupLighting() {
    // HỆ THỐNG ÁNH SÁNG 3 ĐIỂM SIÊU NHẸ (3-POINT LIGHTING - ZERO VRAM OVERHEAD)
    // 1. THREE.HemisphereLight(0xfff5e4, 0x3a2e25, 0.85): Tạo độ chuyển màu giữa trần sáng ấm và sàn tối hơn
    const hemiLight = new THREE.HemisphereLight(0xfff5e4, 0x3a2e25, 0.85);
    hemiLight.name = "Global_HemisphereLight";
    hemiLight.position.set(0, 60, 0);
    this.group.add(hemiLight);
    this.hemiLight = hemiLight;

    // 2. THREE.DirectionalLight(0xffeedd, 0.7) đặt ở góc nghiêng (30, 60, 40): Key Light tạo mảng sáng - tối rõ rệt
    const keyLight = new THREE.DirectionalLight(0xffeedd, 0.7);
    keyLight.name = "Key_DirectionalLight";
    keyLight.position.set(30, 60, 40);
    keyLight.castShadow = false; // Tuyệt đối không đổ bóng
    this.group.add(keyLight);
    this.sunLight = keyLight;

    // 3. THREE.DirectionalLight(0x99bbaa, 0.25) chiếu ngược từ (-30, 20, -40): Fill Light làm sáng các góc khuất
    const fillLight = new THREE.DirectionalLight(0x99bbaa, 0.25);
    fillLight.name = "Fill_DirectionalLight";
    fillLight.position.set(-30, 20, -40);
    fillLight.castShadow = false; // Tuyệt đối không đổ bóng
    this.group.add(fillLight);
    this.fillLight = fillLight;
  }

  setupVolumetricGodRays() {
    // ĐÃ GỠ BỎ HOÀN TOÀN SHADER GOD-RAYS THEO LỆNH THANH LỌC ĐỂ ĐẠT PURE RENDER
    this.godRayUniforms = null;
    this.godRayMesh = null;
  }

  update(delta, elapsedTime, camera = null) {
    if (this.godRayUniforms?.uTime) {
      this.godRayUniforms.uTime.value = elapsedTime ?? 0;
    }

    // Kiểm tra an toàn khi chiếu vị trí nguồn sáng lên camera (tránh tạo vector rác per-frame)
    if (camera && this.sunLight) {
      try {
        this._tempPos = this._tempPos || new THREE.Vector3();
        this._tempPos.copy(this.sunLight.position);
        const projected = this._tempPos.project(camera);
        // Khi nguồn sáng nằm sau lưng camera (projected.z > 1.0), hạ cường độ về 0 mượt mà
        if (projected.z > 1.0) {
          if (this.godRayMesh) this.godRayMesh.visible = false;
          if (this.coreBeamMesh) this.coreBeamMesh.visible = false;
        } else {
          if (this.godRayMesh) this.godRayMesh.visible = true;
          if (this.coreBeamMesh) this.coreBeamMesh.visible = true;
        }
      } catch (e) {}
    }
  }

  setGodRayIntensity(val) {
    if (this.godRayUniforms?.uIntensity) {
      this.godRayUniforms.uIntensity.value = val;
    }
  }

  setSunIntensity(val) {
    if (this.sunLight) {
      this.sunLight.intensity = val;
    }
  }
}
