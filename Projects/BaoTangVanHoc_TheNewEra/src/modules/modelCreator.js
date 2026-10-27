import * as THREE from 'three';
import { DIMENSIONS } from '../config/dimensions.js';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger.js';

/**
 * MODEL CREATOR MODULE (MONUMENTAL STRUCTURAL BLOCKOUT)
 * Skill: threejs-model-creator
 * 
 * ĐÃ VÁ LỖI: Bổ sung computeBoundingBox() và computeBoundingSphere() cho toàn bộ
 * CylinderGeometry, SphereGeometry để triệt tiêu hiện tượng chớp tắt, mất hình
 * khi quay camera ở các góc biên do Frustum Culling.
 */

export class ModelCreator {
  constructor(materialLibrary = null) {
    this.matLib = materialLibrary;
    this.group = new THREE.Group();
    this.group.name = "Structural_Blockout_Models";

    this.buildColossalMarblePillars();
    this.buildGlassSkylightDome();

    // GỘP CỘT & MÁI VÒM THEO VẬT LIỆU (Giảm từ ~70 draw calls xuống ~3 calls!)
    mergeGroupMeshesByMaterial(this.group);

    // Khóa matrixAutoUpdate cho toàn bộ vật thể tĩnh
    this.group.traverse((child) => {
      if (child.isMesh) {
        child.frustumCulled = true;
        child.matrixAutoUpdate = false;
        child.updateMatrix();
      }
    });
  }

  getMat(name) {
    return this.matLib?.get?.(name) ?? new THREE.MeshStandardMaterial({ color: 0x999999 });
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
    const radialSegments = pConfig?.radialSegments ?? 36;

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

    const createPillar = (x, z, name) => {
      const singlePillar = new THREE.Group();
      singlePillar.name = name;

      const plinth = new THREE.Mesh(plinthGeo, whiteMarbleMat);
      plinth.frustumCulled = true; // Bật Frustum Culling
      plinth.position.y = plinthHeight / 2;
      plinth.castShadow = false;
      plinth.receiveShadow = true;
      singlePillar.add(plinth);

      const goldRingB = new THREE.Mesh(goldRingGeo, goldAccentMat);
      goldRingB.frustumCulled = true;
      goldRingB.position.y = plinthHeight + 0.07;
      goldRingB.castShadow = false;
      singlePillar.add(goldRingB);

      const shaft = new THREE.Mesh(shaftGeo, whiteMarbleMat);
      shaft.frustumCulled = true;
      shaft.position.y = plinthHeight + shaftHeight / 2;
      shaft.castShadow = true;
      shaft.receiveShadow = true;
      singlePillar.add(shaft);

      const goldRingT = new THREE.Mesh(goldRingGeo, goldAccentMat);
      goldRingT.frustumCulled = true;
      goldRingT.position.y = plinthHeight + shaftHeight - 0.07;
      goldRingT.castShadow = false;
      singlePillar.add(goldRingT);

      const capital = new THREE.Mesh(capitalGeo, whiteMarbleMat);
      capital.frustumCulled = true;
      capital.position.y = plinthHeight + shaftHeight + capitalHeight / 2;
      capital.castShadow = false;
      capital.receiveShadow = true;
      singlePillar.add(capital);

      singlePillar.position.set(x, 0, z);
      return singlePillar;
    };

    // 1. Hàng cột phía Bắc và Nam (Z = +-22m)
    offsets.forEach((ox, i) => pillarsGroup.add(createPillar(ox, -voidHalf, `Pillar_North_${i + 1}`)));
    offsets.forEach((ox, i) => pillarsGroup.add(createPillar(ox, voidHalf, `Pillar_South_${i + 1}`)));

    // 2. Hàng cột phía Tây (X = -22m) và Đông (X = 22m):
    // LOẠI BỎ TRIỆT ĐỂ CÁC CỘT CHẮN LỐI CẦU THANG & CHE KHUẤT CỬA VÒM:
    // - Vị trí oz = 16.5 (Pillar_West_4 & Pillar_East_4): Nằm ngay khúc giao cầu thang chữ Y Tầng 1 lên Tầng 2,
    //   chắn ngang lối đi và che khuất trực diện tầm nhìn vào Cửa Vòm Lớn (Monumental Arch) Phòng 01 (Truyện Kiều).
    // - Vị trí oz = -16.5 (Pillar_West_1 & Pillar_East_1): Nằm ngay khúc giao cầu thang Tầng 2 lên Tầng 3.
    // CHỈ GIỮ LẠI CÁC CỘT TRUNG TÂM [-5.5, 5.5] ĐỂ GIẢI PHÓNG TOÀN BỘ KHÔNG GIAN CẦU THANG & CỬA VÒM THÔNG THOÁNG 100%.
    const sideOffsets = offsets.filter(oz => Math.abs(oz) < 10.0);
    sideOffsets.forEach((oz, i) => pillarsGroup.add(createPillar(-voidHalf, oz, `Pillar_West_${i + 1}`)));
    sideOffsets.forEach((oz, i) => pillarsGroup.add(createPillar(voidHalf, oz, `Pillar_East_${i + 1}`)));

    const cornerPillars = [
      [-34, -34], [34, -34],
      [-34, 34], [34, 34]
    ];
    cornerPillars.forEach(([cx, cz], i) => {
      pillarsGroup.add(createPillar(cx, cz, `Pillar_GrandCorner_${i + 1}`));
    });

    this.group.add(pillarsGroup);
  }

  /**
   * Mái vòm kính lớn (Glass Skylight Dome)
   */
  buildGlassSkylightDome() {
    const skylightGroup = new THREE.Group();
    skylightGroup.name = "Central_Glass_Skylight";

    const sCfg = DIMENSIONS?.skylight ?? {};
    const baseElevation = sCfg?.elevation ?? 32.0;
    const domeRadius = sCfg?.domeRadius ?? 18.0;
    const domeHeight = sCfg?.domeHeight ?? 7.5;
    const oculusRadius = sCfg?.oculusRadius ?? 4.0;

    const cofferRingGeo = new THREE.CylinderGeometry(
      domeRadius + 2.0, 
      domeRadius + 2.6, 
      1.6, 
      48, 
      1, 
      true
    );
    cofferRingGeo.computeVertexNormals();
    cofferRingGeo.computeBoundingBox();
    cofferRingGeo.computeBoundingSphere();

    const cofferRing = new THREE.Mesh(cofferRingGeo, this.getMat('polishedMahogany'));
    cofferRing.frustumCulled = false;
    cofferRing.position.set(0, baseElevation + 0.8, 0);
    cofferRing.castShadow = false;
    skylightGroup.add(cofferRing);

    const domeGeo = new THREE.SphereGeometry(
      domeRadius, 
      48, 
      24, 
      0, 
      Math.PI * 2, 
      0, 
      Math.PI * 0.46
    );
    domeGeo.computeVertexNormals();
    domeGeo.computeBoundingBox();
    domeGeo.computeBoundingSphere();

    const domeMesh = new THREE.Mesh(domeGeo, this.getMat('skylightGlass'));
    domeMesh.frustumCulled = false;
    domeMesh.position.set(0, baseElevation, 0);
    domeMesh.castShadow = false;
    skylightGroup.add(domeMesh);

    const ribCount = 20;
    const ribGeo = new THREE.CylinderGeometry(0.18, 0.18, domeRadius, 16);
    ribGeo.computeVertexNormals();
    ribGeo.computeBoundingBox();
    ribGeo.computeBoundingSphere();

    const ribMat = this.getMat('bronzeFramework');

    for (let i = 0; i < ribCount; i++) {
      const angle = (i / ribCount) * Math.PI * 2;
      const rib = new THREE.Mesh(ribGeo, ribMat);
      rib.frustumCulled = false;
      rib.position.set(
        Math.cos(angle) * (domeRadius * 0.5),
        baseElevation + domeHeight * 0.55,
        Math.sin(angle) * (domeRadius * 0.5)
      );
      rib.rotation.y = -angle + Math.PI / 2;
      rib.rotation.z = 0.52;
      rib.castShadow = false;
      skylightGroup.add(rib);
    }

    const oculusGeo = new THREE.CylinderGeometry(
      oculusRadius, 
      oculusRadius + 0.25, 
      0.6, 
      36
    );
    oculusGeo.computeVertexNormals();
    oculusGeo.computeBoundingBox();
    oculusGeo.computeBoundingSphere();

    const oculusMesh = new THREE.Mesh(oculusGeo, this.getMat('royalGold'));
    oculusMesh.frustumCulled = true;
    oculusMesh.position.set(0, baseElevation + domeHeight + 0.2, 0);
    oculusMesh.castShadow = false;
    skylightGroup.add(oculusMesh);

    this.group.add(skylightGroup);
  }

  /**
   * GOM 20 CỘT ĐÁ CẨM THẠCH ĐẠI SẢNH VÀO DANH SÁCH VA CHẠM
   */
  getCollisionObjects() {
    const pillars = [];
    this.group.traverse((child) => {
      if (child.isMesh) {
        const name = child.name || '';
        const parentName = child.parent?.name || '';
        if (name.includes('Plinth') || name.includes('Shaft') || parentName.includes('Pillar')) {
          pillars.push(child);
        }
      }
    });
    return pillars;
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
