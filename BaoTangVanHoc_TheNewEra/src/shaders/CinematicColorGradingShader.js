import * as THREE from 'three';

/**
 * CINEMATIC COLOR GRADING & EXPOSURE SHADER
 * Skills: threejs-exposure-color-grading & threejs-art-director
 * 
 * - Chỉnh màu Cinematic tông vàng ấm/hoài cổ (Nostalgic Indochine Golden Warmth)
 * - Điều chỉnh phơi sáng thông minh (Highlight Rolloff) chống cháy sáng tại giếng trời
 * - S-Curve Contrast cho chiều sâu đá cẩm thạch đen và ánh kim
 * - Hiệu ứng Vignette điện ảnh tập trung tầm nhìn vào tâm sảnh
 * - Micro-film grain tinh tế tạo cảm giác điện ảnh
 */

export const CinematicColorGradingShader = {
  name: 'CinematicColorGradingShader',

  uniforms: {
    tDiffuse: { value: null },
    uExposure: { value: 1.0 },
    uWarmth: { value: 0.12 },          // Tông vàng ấm hoài cổ Đông Dương
    uContrast: { value: 1.15 },        // S-curve contrast
    uSaturation: { value: 1.10 },      // Độ bão hòa màu sang trọng
    uVignetteDarkness: { value: 0.42 },// Độ tối viền góc
    uVignetteOffset: { value: 1.1 },   // Bán kính vùng trung tâm sáng
    uHighlightCompress: { value: 0.75 },// Nén dải sáng cao chống lóa mắt
    uGrainIntensity: { value: 0.02 },  // Hạt film grain tinh tế
    uTime: { value: 0.0 }
  },

  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uExposure;
    uniform float uWarmth;
    uniform float uContrast;
    uniform float uSaturation;
    uniform float uVignetteDarkness;
    uniform float uVignetteOffset;
    uniform float uHighlightCompress;
    uniform float uGrainIntensity;
    uniform float uTime;

    varying vec2 vUv;

    // Pseudo-random noise cho film grain
    float pseudoNoise(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }

    // Chuyển đổi RGB sang Luminance
    float getLuminance(vec3 color) {
      return dot(color, vec3(0.2126, 0.7152, 0.0722));
    }

    #if !defined(__VERSION__) || (__VERSION__ < 300)
    bool isnan(float val) { return (val != val); }
    bool isinf(float val) { return (val > 1e20 || val < -1e20); }
    #endif

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 color = texel.rgb;

      // 1. Điều chỉnh phơi sáng cơ bản
      color *= uExposure;

      // 2. Nén dải sáng cao (Soft Highlight Compression) chống cháy sáng ở giếng trời
      float lum = getLuminance(color);
      if (lum > 0.8) {
        float excess = lum - 0.8;
        float compressed = 0.8 + excess / (1.0 + excess * uHighlightCompress);
        color = color * (compressed / max(0.001, lum));
      }

      // 3. Chỉnh màu tông vàng ấm / hoài cổ (Indochine Warmth Grading)
      // Highlight & Midtone nhuộm sắc hoàng kim, Shadow giữ chiều sâu than đá
      vec3 warmFilter = vec3(1.0 + uWarmth * 0.9, 1.0 + uWarmth * 0.45, 1.0 - uWarmth * 0.6);
      color = mix(color, color * warmFilter, smoothstep(0.05, 0.85, lum));

      // 4. S-Curve Contrast (Đá đen sâu thẳm, kim loại và đá trắng sáng bóng)
      color = (color - 0.5) * uContrast + 0.5;

      // 5. Điều chỉnh độ bão hòa màu (Saturation)
      float gray = getLuminance(color);
      color = mix(vec3(gray), color, uSaturation);

      // 6. Hiệu ứng Vignette điện ảnh (Tối nhẹ 4 góc ngoại vi)
      vec2 dist = (vUv - 0.5) * 2.0;
      float vig = 1.0 - dot(dist, dist) * (uVignetteDarkness / uVignetteOffset);
      vig = clamp(vig, 0.0, 1.0);
      color *= smoothstep(0.0, 1.0, vig);

      // 7. Micro-grain điện ảnh (Cinematic subtle grain)
      if (uGrainIntensity > 0.0) {
        float grain = (pseudoNoise(vUv * 500.0 + fract(uTime * 17.0)) - 0.5) * uGrainIntensity;
        color += grain;
      }

      // Đảm bảo không bị âm màu
      color = max(vec3(0.0), color);

      gl_FragColor = vec4(color, texel.a);

      // KHỬ ĐỘC NaN / Infinity TRÁNH FULL-SCREEN NaN POISONING
      if (isnan(gl_FragColor.r) || isnan(gl_FragColor.g) || isnan(gl_FragColor.b) || isinf(gl_FragColor.r)) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      }
    }
  `
};
