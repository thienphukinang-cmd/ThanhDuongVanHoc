import * as THREE from 'three';

/**
 * POST-PROCESSING MANAGER (STRIPPED FOR PURE WEBGL RENDER)
 * Toàn bộ EffectComposer, UnrealBloomPass và các Render Target phụ đã được gỡ bỏ
 * để giải phóng 100% VRAM và triệt tiêu render target passes cho GPU.
 */
export class PostProcessingManager {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.composer = null;
    this.bloomPass = null;
    this.enabled = false;
    console.log("%c[PURE RENDER] Đã hủy bỏ hoàn toàn EffectComposer & BloomPass!", "color: #39e58c; font-weight: bold;");
  }

  setEnabled(enabled = false) {
    this.enabled = false;
  }

  setBloomStrength(val) {}
  setBloomThreshold(val) {}
  setExposure(val) {}

  render() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  dispose() {}
}

export default PostProcessingManager;
