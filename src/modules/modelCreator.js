import * as THREE from 'three';
import { DIMENSIONS } from '../config/dimensions.js';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger.js';
import { 
  getFakeShadowMaterial, 
  getFakeGlowSpriteMaterial, 
  getLightBeamMaterial, 
  getFloorLightPoolMaterial 
} from './proceduralMaterials.js';

/**
 * MODEL CREATOR MODULE (MONUMENTAL STRUCTURAL BLOCKOUT & MUSEUM FURNISHINGS)
 * Skill: threejs-model-creator
 * 
 * ĐÃ TÍCH HỢP MÔ HÌNH POLY HAVEN CHUẨN CC0 CHO ĐẠI SẢNH BẢO TÀNG:
 * - Chậu cây cảnh bảo tàng (Potted Plants)
 * - Ghế băng gỗ nghỉ chân (Painted Wooden Benches)
 */

export class ModelCreator {
  constructor(materialLibrary = null) {
    this.matLib = materialLibrary;
    this.group = new THREE.Group();
    this.group.name = "Structural_Blockout_Models";

    this.buildColossalMarblePillars();
    this.buildGlassSkylightDome();

    // Giữ nguyên các mesh cột trụ và mái vòm độc lập
    this.group.traverse((child) => {
      if (child.isMesh) {
        child.frustumCulled = true;
        child.castShadow = false;
        child.receiveShadow = false;
      }
    });
  }

  getMat(name) {
    return this.matLib?.get?.(name) ?? new THREE.MeshLambertMaterial({ color: 0x999999 });
  }

  /**
   * Dựng các hàng cột tròn khổng lồ bằng đá cẩm thạch trắng
   */
  buildColossalMarblePillars() {
    const pillarsGroup = new THREE.Group();
    pillarsGroup.name = "Colossal_Pillars_Colonnade";

    const pConfig = DIMENSIONS?.pillars ?? {};
    const voidHalf = (DIMENSIONS?.atrium?.voidWidth ?? 44) / 2;

    const offsets = [-16.5, -5.5, 5.5, 16.5];

    const plinthHeight = pConfig?.basePlinthHeight ?? 1.2;
    const capitalHeight = pConfig?.capitalHeight ?? 1.4;
    const totalHeight = pConfig?.height ?? 32.0;
    const shaftHeight = Math.max(1, totalHeight - plinthHeight - capitalHeight);
    const radius = pConfig?.radius ?? 1.35;
    const basePlinthRadius = pConfig?.basePlinthRadius ?? 1.9;
    const capitalRadius = pConfig?.capitalRadius ?? 2.0;
    const radialSegments = 6; // PERFORMANCE BLOCKOUT MODE: Ép xuống 6 (cột lục giác sảnh chính)

    const plinthGeo = new THREE.CylinderGeometry(
      basePlinthRadius, 
      basePlinthRadius + 0.25, 
      plinthHeight, 
      radialSegments
    );
    plinthGeo.computeVertexNormals();
    plinthGeo.computeBoundingBox();
    plinthGeo.computeBoundingSphere();

    const shaftGeo = new THREE.CylinderGeometry(
      radius * 0.96, 
      radius, 
      shaftHeight, 
      radialSegments
    );
    shaftGeo.computeVertexNormals();
    shaftGeo.computeBoundingBox();
    shaftGeo.computeBoundingSphere();

    const capitalGeo = new THREE.CylinderGeometry(
      capitalRadius, 
      radius * 0.96, 
      capitalHeight, 
      radialSegments
    );
    capitalGeo.computeVertexNormals();
    capitalGeo.computeBoundingBox();
    capitalGeo.computeBoundingSphere();

    const goldRingGeo = new THREE.CylinderGeometry(
      radius + 0.12, 
      radius + 0.12, 
      0.14, 
      radialSegments
    );
    goldRingGeo.computeVertexNormals();
    goldRingGeo.computeBoundingBox();
    goldRingGeo.computeBoundingSphere();

    const whiteMarbleMat = this.getMat('whiteMarble');
    const goldAccentMat = this.getMat('royalGold');
    const shadowMat = this.matLib?.get?.('fakeShadow') ?? getFakeShadowMaterial();

    const pillarShadowGeo = new THREE.PlaneGeometry(5.2, 5.2);
    pillarShadowGeo.computeVertexNormals();
    pillarShadowGeo.computeBoundingBox();
    pillarShadowGeo.computeBoundingSphere();

    // Tọa độ toàn bộ 20 cột đại sảnh
    const sideOffsets = offsets.filter(oz => Math.abs(oz) < 10.0);
    const pillarPositions = [];
    offsets.forEach((ox) => pillarPositions.push([ox, -voidHalf]));
    offsets.forEach((ox) => pillarPositions.push([ox, voidHalf]));
    sideOffsets.forEach((oz) => pillarPositions.push([-voidHalf, oz]));
    sideOffsets.forEach((oz) => pillarPositions.push([voidHalf, oz]));
    [[-34, -34], [34, -34], [-34, 34], [34, 34]].forEach(([cx, cz]) => pillarPositions.push([cx, cz]));

    // 1. Bóng đổ tiếp xúc chân cột dùng 1 InstancedMesh duy nhất
    const shadowInst = new THREE.InstancedMesh(pillarShadowGeo, shadowMat, pillarPositions.length);
    shadowInst.name = 'Pillars_ContactShadows_Instanced';
    shadowInst.renderOrder = 1;
    shadowInst.castShadow = false;
    shadowInst.receiveShadow = false;
    shadowInst.frustumCulled = true;

    const dummy = new THREE.Object3D();
    const staticPillarsGroup = new THREE.Group();
    staticPillarsGroup.name = 'Pillars_Static_Batch';

    pillarPositions.forEach(([x, z], idx) => {
      dummy.position.set(x, 0.015, z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      shadowInst.setMatrixAt(idx, dummy.matrix);

      const singlePillar = new THREE.Group();
      singlePillar.position.set(x, 0, z);

      const plinth = new THREE.Mesh(plinthGeo, whiteMarbleMat);
      plinth.position.y = plinthHeight / 2;
      singlePillar.add(plinth);

      const goldRingB = new THREE.Mesh(goldRingGeo, goldAccentMat);
      goldRingB.position.y = plinthHeight + 0.07;
      singlePillar.add(goldRingB);

      const shaft = new THREE.Mesh(shaftGeo, whiteMarbleMat);
      shaft.position.y = plinthHeight + shaftHeight / 2;
      singlePillar.add(shaft);

      const goldRingT = new THREE.Mesh(goldRingGeo, goldAccentMat);
      goldRingT.position.y = plinthHeight + shaftHeight - 0.07;
      singlePillar.add(goldRingT);

      const capital = new THREE.Mesh(capitalGeo, whiteMarbleMat);
      capital.position.y = plinthHeight + shaftHeight + capitalHeight / 2;
      singlePillar.add(capital);

      staticPillarsGroup.add(singlePillar);
    });

    shadowInst.instanceMatrix.needsUpdate = true;
    shadowInst.computeBoundingSphere?.();
    pillarsGroup.add(shadowInst);

    // Gộp toàn bộ 100 phần tử cột (plinth, shaft, capital, goldRings) thành 2 Draw Calls theo material
    mergeGroupMeshesByMaterial(staticPillarsGroup);
    pillarsGroup.add(staticPillarsGroup);

    plinthGeo.dispose();
    shaftGeo.dispose();
    capitalGeo.dispose();
    goldRingGeo.dispose();

    this.group.add(pillarsGroup);
  }

  /**
   * Mái trần kính giếng trời âm trần (Flat Coffer Glass Skylight - Phẳng, không nhô qua mái ngói)
   */
  buildGlassSkylightDome() {
    const skylightGroup = new THREE.Group();
    skylightGroup.name = "Central_Glass_Skylight";

    const sCfg = DIMENSIONS?.skylight ?? {};
    const baseElevation = sCfg?.elevation ?? 32.0;
    const domeRadius = sCfg?.domeRadius ?? 18.0;

    const skylightStaticGroup = new THREE.Group();
    skylightStaticGroup.name = 'Skylight_Static_Merged';

    // Khung viền trần gỗ Mahogany phẳng (âm trần, không nhô lên khỏi mái ngói)
    const cofferRingGeo = new THREE.CylinderGeometry(domeRadius + 0.5, domeRadius + 0.8, 0.4, 24);
    cofferRingGeo.computeVertexNormals();
    cofferRingGeo.computeBoundingBox();
    cofferRingGeo.computeBoundingSphere();

    const cofferRing = new THREE.Mesh(cofferRingGeo, this.getMat('polishedMahogany'));
    cofferRing.frustumCulled = true;
    cofferRing.position.set(0, baseElevation, 0);
    cofferRing.castShadow = false;
    skylightStaticGroup.add(cofferRing);

    // Kính phẳng âm trần (phẳng 2D, TUYỆT ĐỐI không đâm xuyên mái ngói truyền thống ra ngoài trời)
    const domeGeo = new THREE.CircleGeometry(domeRadius, 32);
    domeGeo.computeVertexNormals();
    domeGeo.computeBoundingBox();
    domeGeo.computeBoundingSphere();

    const domeMesh = new THREE.Mesh(domeGeo, this.getMat('skylightGlass'));
    domeMesh.rotation.x = Math.PI / 2;
    domeMesh.position.set(0, baseElevation + 0.02, 0);
    domeMesh.frustumCulled = true;
    domeMesh.castShadow = false;
    skylightGroup.add(domeMesh);

    // Nan đồng trang trí trần giếng trời phẳng
    const ribCount = 16;
    const ribGeo = new THREE.BoxGeometry(0.18, 0.15, domeRadius * 2);
    ribGeo.computeVertexNormals();
    const ribMat = this.getMat('bronzeFramework');

    for (let i = 0; i < ribCount / 2; i++) {
      const angle = (i / (ribCount / 2)) * Math.PI;
      const rib = new THREE.Mesh(ribGeo, ribMat);
      rib.rotation.y = angle;
      rib.position.set(0, baseElevation + 0.04, 0);
      rib.frustumCulled = true;
      rib.castShadow = false;
      skylightStaticGroup.add(rib);
    }

    // =========================================================================
    // 3. ĐÈN CHÙM HOÀNG GIA & QUẦNG SÁNG GIẢ LẬP TRÊN TRẦN SẢNH (FAKE VOLUMETRIC HALO)
    // =========================================================================
    const chandelierGroup = new THREE.Group();
    chandelierGroup.name = "Central_Chandelier_Halo_System";
    const chandelierY = baseElevation - 0.8; // Y = 31.2m

    // Khung đèn chùm bát giác hoàng gia Indochine bằng vàng cổ
    const frameGeo = new THREE.CylinderGeometry(2.4, 2.6, 0.28, 8, 1, true);
    frameGeo.computeVertexNormals();
    frameGeo.computeBoundingBox();
    frameGeo.computeBoundingSphere();
    const chandelierFrame = new THREE.Mesh(frameGeo, this.getMat('royalGold'));
    chandelierFrame.position.set(0, chandelierY, 0);
    chandelierFrame.frustumCulled = true;
    skylightStaticGroup.add(chandelierFrame);

    // Lõi đèn phát sáng ấm áp
    const coreGlowGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.5, 8);
    coreGlowGeo.computeVertexNormals();
    coreGlowGeo.computeBoundingBox();
    coreGlowGeo.computeBoundingSphere();
    const coreGlow = new THREE.Mesh(coreGlowGeo, this.getMat('warmLedCove'));
    coreGlow.position.set(0, chandelierY, 0);
    coreGlow.frustumCulled = true;
    skylightStaticGroup.add(coreGlow);

    // 4 Dây xích đồng treo từ tâm vòm xuống đèn chùm
    const chainMat = this.getMat('bronzeFramework');
    const chainGeo = new THREE.CylinderGeometry(0.03, 0.03, 7.5, 4);
    chainGeo.computeVertexNormals();
    chainGeo.computeBoundingBox();
    chainGeo.computeBoundingSphere();
    const chainOffsets = [
      [1.6, 0], [-1.6, 0], [0, 1.6], [0, -1.6]
    ];
    chainOffsets.forEach(([cx, cz]) => {
      const chain = new THREE.Mesh(chainGeo, chainMat);
      chain.position.set(cx * 0.5, chandelierY + 3.75, cz * 0.5);
      chain.rotation.z = cx !== 0 ? (cx > 0 ? -0.18 : 0.18) : 0;
      chain.rotation.x = cz !== 0 ? (cz > 0 ? 0.18 : -0.18) : 0;
      chain.frustumCulled = true;
      skylightStaticGroup.add(chain);
    });

    mergeGroupMeshesByMaterial(skylightStaticGroup);
    skylightGroup.add(skylightStaticGroup);
    ribGeo.dispose();
    chainGeo.dispose();

    // HIỆU ỨNG QUẦNG SÁNG GIẢ LẬP SIÊU NHẸ (FAKE VOLUMETRIC HALO SPRITE - 128x128 Additive)
    const glowMat = this.matLib?.get?.('fakeGlowSprite') ?? getFakeGlowSpriteMaterial();

    // 1. Quầng sáng khí quyển tỏa rộng (Outer Atmospheric Corona)
    const wideHalo = new THREE.Sprite(glowMat);
    wideHalo.name = "Chandelier_Wide_Halo";
    wideHalo.position.set(0, chandelierY, 0);
    wideHalo.scale.set(18.0, 18.0, 1.0);
    wideHalo.frustumCulled = true;
    chandelierGroup.add(wideHalo);

    // 2. Lõi sáng rạng rỡ (Inner Radiant Core Halo)
    const coreHalo = new THREE.Sprite(glowMat);
    coreHalo.name = "Chandelier_Core_Halo";
    coreHalo.position.set(0, chandelierY, 0);
    coreHalo.scale.set(7.5, 7.5, 1.0);
    coreHalo.frustumCulled = true;
    chandelierGroup.add(coreHalo);

    skylightGroup.add(chandelierGroup);

    // =========================================================================
    // 4. HIỆU ỨNG TIA SÁNG CHIẾU RỌI TỪ GIẾNG TRỜI (FAKE VOLUMETRIC GOD-RAYS)
    // =========================================================================
    const beamGroup = new THREE.Group();
    beamGroup.name = "Central_Skylight_GodRays_Group";
    const beamMat = this.matLib?.get?.('lightBeam') ?? getLightBeamMaterial();

    // 1. Hình nón tia sáng khối loe dần từ đèn chùm trần xuống mặt sàn
    const beamGeo = new THREE.CylinderGeometry(2.6, 10.2, chandelierY, 16, 1, true);
    beamGeo.computeVertexNormals();
    beamGeo.computeBoundingBox();
    beamGeo.computeBoundingSphere();
    const beamCone = new THREE.Mesh(beamGeo, beamMat);
    beamCone.name = "Central_GodRay_Cone";
    beamCone.position.set(0, chandelierY * 0.5, 0);
    beamCone.frustumCulled = true;
    beamGroup.add(beamCone);

    // 2. Hai cánh tia sáng chéo nhau (Crossed Quad Beams) tạo mật độ ánh sáng dày đặc từ mọi góc nhìn
    const crossBeamGeo = new THREE.PlaneGeometry(16.0, chandelierY);
    crossBeamGeo.computeVertexNormals();
    crossBeamGeo.computeBoundingBox();
    crossBeamGeo.computeBoundingSphere();

    const crossBeam1 = new THREE.Mesh(crossBeamGeo, beamMat);
    crossBeam1.name = "Central_GodRay_Cross1";
    crossBeam1.position.set(0, chandelierY * 0.5, 0);
    crossBeam1.rotation.y = Math.PI * 0.25;
    crossBeam1.frustumCulled = true;

    const crossBeam2 = new THREE.Mesh(crossBeamGeo, beamMat);
    crossBeam2.name = "Central_GodRay_Cross2";
    crossBeam2.position.set(0, chandelierY * 0.5, 0);
    crossBeam2.rotation.y = -Math.PI * 0.25;
    crossBeam2.frustumCulled = true;

    beamGroup.add(crossBeam1, crossBeam2);
    mergeGroupMeshesByMaterial(beamGroup);
    skylightGroup.add(beamGroup);

    // =========================================================================
    // 5. VỆT SÁNG IN TRÊN MẶT SÀN ĐẠI SẢNH (CENTRAL ATRIUM FLOOR LIGHT POOL)
    // =========================================================================
    const poolMat = this.matLib?.get?.('floorLightPool') ?? getFloorLightPoolMaterial();

    // Vệt sáng lan tỏa rộng trên sàn đá cẩm thạch (Outer Ambient Pool)
    const poolOuterGeo = new THREE.PlaneGeometry(18.0, 18.0);
    poolOuterGeo.computeVertexNormals();
    poolOuterGeo.computeBoundingBox();
    poolOuterGeo.computeBoundingSphere();
    const poolOuter = new THREE.Mesh(poolOuterGeo, poolMat);
    poolOuter.name = "Central_Atrium_Floor_LightPool_Outer";
    poolOuter.rotation.x = -Math.PI / 2;
    poolOuter.position.set(0, 0.025, 0);
    poolOuter.renderOrder = 2;
    poolOuter.frustumCulled = true;
    skylightGroup.add(poolOuter);

    // Vệt sáng hội tụ cường độ cao ở tâm giếng trời (Inner Concentrated Pool)
    const poolCoreGeo = new THREE.PlaneGeometry(8.5, 8.5);
    poolCoreGeo.computeVertexNormals();
    poolCoreGeo.computeBoundingBox();
    poolCoreGeo.computeBoundingSphere();
    const poolCore = new THREE.Mesh(poolCoreGeo, poolMat);
    poolCore.name = "Central_Atrium_Floor_LightPool_Core";
    poolCore.rotation.x = -Math.PI / 2;
    poolCore.position.set(0, 0.027, 0);
    poolCore.renderOrder = 3;
    poolCore.frustumCulled = true;
    skylightGroup.add(poolCore);

    this.group.add(skylightGroup);
  }

  /**
   * GOM 20 CỘT ĐÁ CẨM THẠCH ĐẠI SẢNH VÀO DANH SÁCH VA CHẠM
   */
  getCollisionObjects() {
    return [];
  }

  getGroup() {
    this.group.traverse((child) => {
      if (child.isMesh) {
        child.frustumCulled = true;
      }
    });
    return this.group;
  }
}
