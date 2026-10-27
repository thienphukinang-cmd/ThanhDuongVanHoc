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
    // Bầu trời bao la & sương mù sương khói mờ ảo quanh rìa bảo tàng theo yêu cầu
    const fogColor = new THREE.Color(0xd6e5f0); // Trắng sữa pha lam nhạt nắng sớm
    this.scene.background = fogColor;
    this.scene.fog = new THREE.FogExp2(fogColor, 0.0015); // Mật độ nhẹ 0.0015 tạo độ sâu sương khói

    // Vòm trời bao la đường kính 3000m (bán kính 1500m) ôm trọn dãy núi đá vôi Tràng An
    const skyGeo = new THREE.SphereGeometry(1500, 32, 20);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uColorTop: { value: new THREE.Color(0x386d94) },        // Xanh lam thanh bình thiên đỉnh
        uColorMid: { value: new THREE.Color(0x9ec4df) },        // Sắc lam khí quyển sớm mai
        uColorBottom: { value: new THREE.Color(0xd6e5f0) },     // Trùng khớp hoàn hảo với màu sương mù chân trời
        uColorWarmSun: { value: new THREE.Color(0xfff3db) },    // Ánh vàng nắng sớm phương đông
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

          // Gradient chuyển tầng bầu trời mượt mà
          vec3 sky = mix(uColorBottom, uColorMid, smoothstep(-0.05, 0.35, h));
          sky = mix(sky, uColorTop, smoothstep(0.35, 0.95, h));

          // Vùng tỏa sáng vàng ươm hướng mặt trời mọc phương đông
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
    // Ánh sáng môi trường tự nhiên dịu mát từ bầu trời mở
    const ambientLight = new THREE.AmbientLight(0xcde1ed, 1.15);
    ambientLight.name = "Ambient_Sky_Light";
    this.group.add(ambientLight);
    this.ambientLight = ambientLight;

    // Ánh sáng phản xạ bán cầu (Trời lam nhẹ & Đất phản chiếu ấm)
    const hemiLight = new THREE.HemisphereLight(0xe4f2fc, 0x4a4336, 0.75);
    hemiLight.position.set(0, 60, 0);
    this.group.add(hemiLight);

    // Ánh nắng ban mai DirectionalLight rọi nghiêng qua mái kính và hiên mở
    const sunLight = new THREE.DirectionalLight(0xfff4df, 2.85);
    sunLight.name = "Sun_Skylight_DirectionalLight";
    sunLight.position.set(38, 68, 32);
    sunLight.target.position.set(0, 8, 0);
    this.group.add(sunLight);
    this.group.add(sunLight.target);
    this.sunLight = sunLight;

    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 160;

    // Mở rộng Shadow Box bao trọn 125m x 125m kiến trúc mở
    const shadowBox = 75;
    sunLight.shadow.camera.left = -shadowBox;
    sunLight.shadow.camera.right = shadowBox;
    sunLight.shadow.camera.top = shadowBox;
    sunLight.shadow.camera.bottom = -shadowBox;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.04;

    const cornerUplights = [
      [-16.5, -16.5], [16.5, -16.5],
      [-16.5, 16.5], [16.5, 16.5]
    ];
    cornerUplights.forEach(([x, z], i) => {
      const uplight = new THREE.PointLight(0xffdfa8, 0.75, 20, 1.8);
      uplight.position.set(x, 1.2, z);
      this.group.add(uplight);
    });
  }

  setupVolumetricGodRays() {
    const sCfg = DIMENSIONS?.skylight ?? {};
    const domeRadius = sCfg?.domeRadius ?? 18.0;
    const elevation = sCfg?.elevation ?? 32.0;

    const topRadius = domeRadius * 0.85;
    const bottomRadius = 24.0;
    const beamHeight = elevation + 2.0;

    const beamGeo = new THREE.CylinderGeometry(
      topRadius, 
      bottomRadius, 
      beamHeight, 
      48, 
      20, 
      true
    );
    beamGeo.computeVertexNormals();
    beamGeo.computeBoundingBox();
    beamGeo.computeBoundingSphere();

    this.godRayUniforms = {
      uTime: { value: 0 },
      uColorCore: { value: new THREE.Color(0xfff7e8) },
      uColorRim: { value: new THREE.Color(0x82c8eb) },
      uIntensity: { value: 1.15 }
    };

    const godRayMaterial = new THREE.ShaderMaterial({
      uniforms: this.godRayUniforms,
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPos;

        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColorCore;
        uniform vec3 uColorRim;
        uniform float uIntensity;

        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPos;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        #if !defined(__VERSION__) || (__VERSION__ < 300)
        bool isnan(float val) { return (val != val); }
        bool isinf(float val) { return (val > 1e20 || val < -1e20); }
        #endif

        void main() {
          float heightFactor = pow(clamp(vUv.y, 0.0, 1.0), 1.7);
          
          float px = abs(vWorldPos.x) < 0.0001 ? 0.0001 : vWorldPos.x;
          float angle = atan(vWorldPos.z, px);
          float rays = noise(vec2(angle * 6.0, uTime * 0.12)) * 0.5 +
                       noise(vec2(angle * 12.0 + uTime * 0.06, clamp(vUv.y, 0.0, 1.0) * 4.0)) * 0.5;

          vec3 viewVec = cameraPosition - vWorldPos;
          float viewLen = length(viewVec);
          vec3 viewDir = viewLen > 0.0001 ? viewVec / viewLen : vec3(0.0, 1.0, 0.0);
          float rim = clamp(1.0 - abs(dot(viewDir, vNormal)), 0.0, 1.0);
          rim = pow(rim, 1.7);

          vec3 finalColor = mix(uColorCore, uColorRim, rim * 0.55);
          float alpha = heightFactor * (0.30 + rays * 0.45) * (0.35 + rim * 0.55) * uIntensity;

          gl_FragColor = vec4(finalColor, clamp(alpha, 0.0, 1.0));

          // KHỬ ĐỘC NaN / Infinity TRÁNH FULL-SCREEN NaN POISONING
          if (isnan(gl_FragColor.r) || isnan(gl_FragColor.g) || isnan(gl_FragColor.b) || isinf(gl_FragColor.r)) { 
            gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0); 
          }
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const godRayMesh = new THREE.Mesh(beamGeo, godRayMaterial);
    godRayMesh.frustumCulled = false;
    godRayMesh.position.set(0, beamHeight / 2, 0);
    godRayMesh.visible = false; // Tắt hoàn toàn hình nón God-Rays theo lệnh khẩn cấp để cứu GPU
    this.group.add(godRayMesh);
    this.godRayMesh = godRayMesh;

    const oculusRadius = sCfg?.oculusRadius ?? 4.0;
    const coreBeamGeo = new THREE.CylinderGeometry(
      oculusRadius * 0.9, 
      8.0, 
      beamHeight, 
      32, 
      1, 
      true
    );
    coreBeamGeo.computeVertexNormals();
    coreBeamGeo.computeBoundingBox();
    coreBeamGeo.computeBoundingSphere();
    const coreBeamMesh = new THREE.Mesh(coreBeamGeo, godRayMaterial);
    coreBeamMesh.frustumCulled = false;
    coreBeamMesh.position.set(0, beamHeight / 2, 0);
    this.group.add(coreBeamMesh);
  }

  update(delta, elapsedTime, camera = null) {
    if (this.godRayUniforms?.uTime) {
      this.godRayUniforms.uTime.value = elapsedTime ?? 0;
    }

    // Kiểm tra an toàn khi chiếu vị trí nguồn sáng lên camera
    if (camera && this.sunLight) {
      try {
        const lightPos = this.sunLight.position.clone();
        const projected = lightPos.project(camera);
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
