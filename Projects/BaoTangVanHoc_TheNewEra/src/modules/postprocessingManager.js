import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { CinematicColorGradingShader } from '../shaders/CinematicColorGradingShader.js';

/**
 * POST-PROCESSING CINEMATIC PIPELINE
 * Skills:
 * - threejs-screen-space-ambient-occlusion (SSAO)
 * - threejs-bloom (UnrealBloomPass)
 * - threejs-exposure-color-grading (Cinematic Color Grading Shader)
 * 
 * Áp dụng Lập trình phòng ngừa (Defensive Programming & Nullish Coalescing)
 */

export class PostProcessingManager {
  constructor(renderer, scene, camera) {
    if (!renderer || !scene || !camera) {
      throw new Error("PostProcessingManager requires valid renderer, scene, and camera.");
    }

    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    const width = window.innerWidth || 800;
    const height = window.innerHeight || 600;

    // 1. Khởi tạo EffectComposer
    const renderTarget = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      samples: 4,
    });

    this.composer = new EffectComposer(this.renderer, renderTarget);

    // 2. RenderPass cơ sở
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);

    // 3. SSAO PASS (Screen Space Ambient Occlusion - Tạm thời TẮT ĐI để cô lập lỗi mảng đen theo lệnh khẩn cấp)
    this.ssaoPass = new SSAOPass(this.scene, this.camera, width, height);
    this.ssaoPass.kernelRadius = 10;
    this.ssaoPass.minDistance = 0.005;
    this.ssaoPass.maxDistance = 0.25;
    this.ssaoPass.output = SSAOPass.OUTPUT.Default;
    this.ssaoPass.enabled = false; // TẠM THỜI TẮT NÓ ĐI
    // this.composer.addPass(this.ssaoPass); // Cô lập hoàn toàn không add vào chuỗi post-processing

    // 4. BLOOM PASS (UnrealBloomPass - Giới hạn an toàn: strength = 0.4, threshold = 0.85, radius = 0.35)
    const bloomRes = new THREE.Vector2(width, height);
    this.bloomPass = new UnrealBloomPass(bloomRes, 0.40, 0.35, 0.85);
    this.composer.addPass(this.bloomPass);

    // 5. CINEMATIC COLOR GRADING & EXPOSURE PASS
    this.gradingPass = new ShaderPass(CinematicColorGradingShader);
    this.composer.addPass(this.gradingPass);

    // 6. OUTPUT PASS
    this.outputPass = new OutputPass();
    this.composer.addPass(this.outputPass);

    this.enabled = true; // Cho phép bật/tắt toàn bộ pipeline EffectComposer
    this.initResize();
  }

  setEnabled(enabled = true) {
    this.enabled = !!enabled;
  }

  initResize() {
    window.addEventListener('resize', () => {
      try {
        const w = window.innerWidth || 800;
        const h = window.innerHeight || 600;
        this.composer?.setSize(w, h);
        this.bloomPass?.resolution?.set(w, h);
        this.ssaoPass?.setSize(w, h);
      } catch (err) {
        console.warn("[SELF-HEALING] Lỗi cập nhật kích thước postprocessing:", err);
      }
    });
  }

  update(delta, elapsedTime) {
    if (!this.enabled) return;
    if (this.gradingPass?.uniforms?.uTime) {
      this.gradingPass.uniforms.uTime.value = elapsedTime ?? 0;
    }
  }

  render() {
    if (this.enabled && this.composer) {
      this.composer.render();
    } else if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  setBloomStrength(val) {
    if (this.bloomPass) {
      this.bloomPass.strength = Math.min(0.6, Math.max(0.0, val ?? 0.40));
    }
  }

  setBloomThreshold(val) {
    if (this.bloomPass) {
      this.bloomPass.threshold = Math.max(0.0, val ?? 0.85);
    }
  }

  setExposure(val) {
    if (this.gradingPass?.uniforms?.uExposure) {
      this.gradingPass.uniforms.uExposure.value = val ?? 1.0;
    }
  }

  setWarmth(val) {
    if (this.gradingPass?.uniforms?.uWarmth) {
      this.gradingPass.uniforms.uWarmth.value = val ?? 0.12;
    }
  }

  setContrast(val) {
    if (this.gradingPass?.uniforms?.uContrast) {
      this.gradingPass.uniforms.uContrast.value = val ?? 1.15;
    }
  }

  setVignette(val) {
    if (this.gradingPass?.uniforms?.uVignetteDarkness) {
      this.gradingPass.uniforms.uVignetteDarkness.value = val ?? 0.42;
    }
  }

  toggleSSAO(enabled) {
    if (this.ssaoPass) {
      this.ssaoPass.enabled = !!enabled;
    }
  }
}
