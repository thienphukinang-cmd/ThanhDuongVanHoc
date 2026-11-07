import * as THREE from 'three';

/**
 * PROCEDURAL VFX MODULE (DISABLED FOR PURE RENDER)
 * Toàn bộ hạt mưa, bụi nắng, đốm sáng linh khí đã được vô hiệu hóa hoàn toàn
 * theo lệnh thanh lọc hiệu ứng nặng.
 */
export class ProceduralVFX {
  constructor(scene, bounds = { width: 44, height: 48, depth: 44 }) {
    this.scene = scene;
    this.bounds = bounds;
    this.group = new THREE.Group();
    this.group.name = "Procedural_VFX_System";
    this.group.visible = false;
    console.log("%c[PURE RENDER] Đã vô hiệu hóa hoàn toàn ProceduralVFX (hạt bụi & linh khí)!", "color: #39e58c; font-weight: bold;");
  }

  createParticleTexture() {
    return new THREE.Texture();
  }

  initSunbeamMotes() {}
  initSpiritualWisps() {}

  update() {}

  setVisible(visible = false) {
    this.group.visible = false;
  }

  getGroup() {
    return this.group;
  }

  dispose() {
    this.group.clear();
  }
}

export default ProceduralVFX;
