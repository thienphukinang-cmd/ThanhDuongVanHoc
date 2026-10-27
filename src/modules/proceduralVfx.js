import * as THREE from 'three';
import { DIMENSIONS } from '../config/dimensions.js';

/**
 * PROCEDURAL VFX MODULE (PATCHED & DEFENSIVE PROGRAMMING)
 * Skill: threejs-procedural-vfx
 * 
 * Hiệu ứng hạt bụi sáng / linh khí bay lơ lửng chậm rãi trong không gian sảnh:
 * 1. Hạt bụi vàng lấp lánh trong luồng nắng giếng trời (Golden Sunbeam Dust Motes)
 * 2. Đốm sáng linh khí văn học chuyển động êm dịu đa tầng (Sacred Spiritual Wisps)
 * 3. Hài hòa cùng UnrealBloomPass và Tone mapping, không gây lóa mắt
 */

export class ProceduralVFX {
  constructor(scene, bounds = { width: 44, height: 48, depth: 44 }) {
    this.scene = scene;
    // Lập trình phòng ngừa: Luôn đảm bảo bounds hợp lệ
    this.bounds = (bounds && typeof bounds === 'object') ? bounds : { width: 44, height: 48, depth: 44 };

    this.group = new THREE.Group();
    this.group.name = "Procedural_VFX_System";
    this.scene.add(this.group);

    this.initSunbeamMotes(this.bounds);
    this.initSpiritualWisps(this.bounds);
  }

  /**
   * Tạo texture hạt phát sáng mềm (Soft Glow Particle Texture)
   */
  createParticleTexture(colorCenter = 'rgba(255, 245, 210, 1.0)', colorMid = 'rgba(235, 185, 75, 0.65)', colorOuter = 'rgba(212, 175, 55, 0.0)') {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0.0, colorCenter);
    grad.addColorStop(0.35, colorMid);
    grad.addColorStop(0.75, 'rgba(150, 110, 30, 0.15)');
    grad.addColorStop(1.0, colorOuter);

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }

  /**
   * 1. HIỆU ỨNG BỤI NẮNG GIẾNG TRỜI (Golden Dust Motes VFX - 1.200 hạt kim quang)
   * - Vùng phân bố: Hình trụ bán kính 16m, độ cao từ Y = 0 đến Y = 36m.
   * - Kích thước hạt: Nhỏ li ti (size: 0.20), độ mờ opacity: 0.6, AdditiveBlending.
   * - Quỹ đạo Brown: Trôi nổi chậm rãi, xoay tròn quanh trục Y và nhấp nhô nhẹ.
   */
  initSunbeamMotes(bounds) {
    const count = 200;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const baseAngles = new Float32Array(count);
    const baseRadii = new Float32Array(count);
    const baseHeights = new Float32Array(count);
    const rotSpeeds = new Float32Array(count);
    const riseSpeeds = new Float32Array(count);
    const brownianPhases = new Float32Array(count);

    const maxRadius = 16.0; // Hình trụ bán kính 16m
    const maxHeight = 36.0; // Độ cao từ Y = 0 đến Y = 36m

    for (let i = 0; i < count; i++) {
      // Phân bổ đều trên diện tích tiết diện hình tròn bán kính 16m
      const r = Math.sqrt(Math.random()) * maxRadius;
      const angle = Math.random() * Math.PI * 2;
      const y = Math.random() * maxHeight;

      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(angle) * r;

      baseRadii[i] = r;
      baseAngles[i] = angle;
      baseHeights[i] = y;

      // Tốc độ xoay nhẹ quanh trục Y và nổi bồng bềnh
      rotSpeeds[i] = (Math.random() - 0.5) * 0.12;
      riseSpeeds[i] = 0.25 + Math.random() * 0.35;
      brownianPhases[i] = Math.random() * Math.PI * 2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();

    // Khử độc NaN cho position attribute
    const posArr = geo.attributes.position.array;
    for (let i = 0; i < posArr.length; i++) {
      if (!Number.isFinite(posArr[i])) posArr[i] = 0;
    }

    const mat = new THREE.PointsMaterial({
      size: 0.20, // Kích thước li ti chuẩn 0.15 - 0.25
      map: this.createParticleTexture('rgba(255, 248, 220, 1.0)', 'rgba(235, 195, 75, 0.7)', 'rgba(212, 175, 55, 0.0)'),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0xffdf88, // Vàng kim óng ả
      opacity: 0.6,    // Độ mờ 0.6 theo đúng đặc tả
    });

    this.sunbeamParticles = new THREE.Points(geo, mat);
    this.sunbeamData = { 
      baseAngles, 
      baseRadii, 
      baseHeights, 
      rotSpeeds, 
      riseSpeeds, 
      brownianPhases, 
      count, 
      maxRadius, 
      maxHeight 
    };
    this.group.add(this.sunbeamParticles);
  }

  /**
   * 2. Đốm sáng linh khí văn học (Sacred Spiritual Wisps / "Linh Khí")
   * Kỹ thuật Lập trình phòng ngừa (Defensive Programming):
   * Bổ sung logic kiểm tra tham số: Nếu bounds bị thiếu, gán giá trị mặc định { width: 44, height: 48, depth: 44 }
   */
  initSpiritualWisps(bounds) {
    // Defensive Programming: Kiểm tra và gán fallback dimensions
    const safeBounds = (bounds && typeof bounds === 'object') ? bounds : {};
    const totalW = Number(safeBounds.width) || (DIMENSIONS && DIMENSIONS.atrium ? DIMENSIONS.atrium.width : 44);
    const heightLimit = Number(safeBounds.height) || (DIMENSIONS && DIMENSIONS.ceiling ? DIMENSIONS.ceiling.height : 48);
    const totalD = Number(safeBounds.depth) || (DIMENSIONS && DIMENSIONS.atrium ? DIMENSIONS.atrium.depth : 44);

    const count = 50;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const basePositions = new Float32Array(count * 3);
    const wanderSpeeds = new Float32Array(count);
    const pulsePhases = new Float32Array(count);

    const colorGold = new THREE.Color(0xffde8a);
    const colorCyan = new THREE.Color(0x76d5f0);
    const colorWhiteAmber = new THREE.Color(0xfff7e6);

    for (let i = 0; i < count; i++) {
      // Phân bổ hạt bay khắp không gian sảnh và các tầng hành lang
      const x = (Math.random() - 0.5) * totalW * 0.85;
      const z = (Math.random() - 0.5) * totalD * 0.85;
      const y = Math.random() * heightLimit;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      basePositions[i * 3] = x;
      basePositions[i * 3 + 1] = y;
      basePositions[i * 3 + 2] = z;

      wanderSpeeds[i] = Math.random() * 0.25 + 0.08;
      pulsePhases[i] = Math.random() * Math.PI * 2;

      // Phối màu linh khí: 60% vàng hổ phách, 25% thiên thanh, 15% trắng ngọc
      const choice = Math.random();
      const c = choice < 0.6 ? colorGold : (choice < 0.85 ? colorCyan : colorWhiteAmber);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeBoundingBox();
    geo.computeBoundingSphere();

    const mat = new THREE.PointsMaterial({
      size: 1.25,
      map: this.createParticleTexture('rgba(255, 255, 255, 1.0)', 'rgba(230, 205, 120, 0.7)', 'rgba(0, 0, 0, 0)'),
      transparent: true,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
      depthWrite: false,
      opacity: 0.75,
    });

    this.spiritualParticles = new THREE.Points(geo, mat);
    this.spiritualData = {
      basePositions,
      wanderSpeeds,
      pulsePhases,
      count,
      heightLimit
    };
    this.group.add(this.spiritualParticles);
  }

  update(delta, elapsedTime) {
    // 1. Cập nhật hạt bụi giếng trời: Trôi nổi chậm rãi theo quỹ đạo Brown và xoay tròn quanh trục Y
    if (this.sunbeamParticles) {
      const pos = this.sunbeamParticles.geometry.attributes.position.array;
      const data = this.sunbeamData;

      for (let i = 0; i < data.count; i++) {
        // Tích phân góc xoay tròn quanh trục Y
        const currentAngle = data.baseAngles[i] + elapsedTime * data.rotSpeeds[i];

        // Biến thiên bán kính nhẹ (nhịp thở không gian)
        const currentRadius = data.baseRadii[i] + Math.sin(elapsedTime * 0.45 + data.brownianPhases[i]) * 0.4;

        // Trôi dạt lên cao dọc theo cột sáng giếng trời
        data.baseHeights[i] += data.riseSpeeds[i] * delta * 0.8;
        if (data.baseHeights[i] > data.maxHeight) {
          data.baseHeights[i] = 0.2;
        }

        // Dao động vi mô Brown (Brownian micro-fluctuations)
        const brownianX = Math.sin(elapsedTime * 1.2 + data.brownianPhases[i]) * 0.09;
        const brownianZ = Math.cos(elapsedTime * 1.2 + data.brownianPhases[i]) * 0.09;
        const brownianY = Math.sin(elapsedTime * 0.9 + data.brownianPhases[i] * 1.5) * 0.06;

        pos[i * 3] = currentRadius * Math.cos(currentAngle) + brownianX;
        pos[i * 3 + 1] = data.baseHeights[i] + brownianY;
        pos[i * 3 + 2] = currentRadius * Math.sin(currentAngle) + brownianZ;
      }
      this.sunbeamParticles.geometry.attributes.position.needsUpdate = true;
    }

    // 2. Cập nhật đốm sáng linh khí chuyển động uyển chuyển
    if (this.spiritualParticles) {
      const pos = this.spiritualParticles.geometry.attributes.position.array;
      const data = this.spiritualData;

      for (let i = 0; i < data.count; i++) {
        const bx = data.basePositions[i * 3];
        const by = data.basePositions[i * 3 + 1];
        const bz = data.basePositions[i * 3 + 2];
        const spd = data.wanderSpeeds[i];
        const phase = data.pulsePhases[i];

        // Chuyển động lượn êm đềm theo hàm sin ba chiều (Harmonic Floating)
        pos[i * 3] = bx + Math.sin(elapsedTime * spd + phase) * 2.2;
        pos[i * 3 + 1] = by + Math.cos(elapsedTime * (spd * 0.8) + phase) * 1.6;
        pos[i * 3 + 2] = bz + Math.sin(elapsedTime * (spd * 0.6) + phase * 1.4) * 2.2;
      }
      this.spiritualParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  setVisible(visible) {
    this.group.visible = visible;
  }
}
