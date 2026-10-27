import * as THREE from 'three';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger.js';

/**
 * BIFURCATED GRAND STAIRCASE MODULE (CẦU THANG CHỮ Y LỘNG LẪY)
 * Skill: threejs-model-creator & threejs-design-director
 * 
 * ĐÃ VÁ LỖI: Bổ sung computeBoundingBox() và computeBoundingSphere() cho toàn bộ
 * ExtrudeGeometry, TubeGeometry, BoxGeometry và CylinderGeometry để triệt tiêu
 * hiện tượng chớp tắt, mất hình do Frustum Culling sai lệch.
 */

export class BifurcatedStaircase {
  constructor(materialLibrary = null) {
    this.matLib = materialLibrary;
    this.group = new THREE.Group();
    this.group.name = "Bifurcated_Grand_Staircase_System";

    this.buildTier1To2Staircase();
    this.buildTier2To3Staircase();

    // Gộp toàn bộ bậc thang, tay vịn, con tiện tĩnh thành các mesh tối ưu hóa draw calls
    mergeGroupMeshesByMaterial(this.group);

    // Vô hiệu hóa va chạm lưới trên toàn bộ cầu thang (cao độ đã xử lý toán học bằng getFloorHeightAt)
    this.group.traverse((child) => {
      child.userData = child.userData || {};
      child.userData.excludeFromCollision = true;
    });
  }

  getMat(name) {
    return this.matLib?.get?.(name) ?? new THREE.MeshStandardMaterial({ color: 0x888888 });
  }

  /**
   * Tạo 1 đoạn cầu thang uốn lượn bằng ExtrudeGeometry chạy theo CurvePath
   */
  createCurvedFlight(curvePoints = [], flightWidth = 4.0, stepCount = 20, yStart = 0, yEnd = 5, name = "Flight") {
    const flightGroup = new THREE.Group();
    flightGroup.name = name;

    if (!curvePoints || curvePoints.length < 2) {
      return flightGroup;
    }

    // 1. Tạo 3D CurvePath mềm mại (CatmullRomCurve3)
    const curve = new THREE.CatmullRomCurve3(curvePoints);
    curve.curveType = 'centripetal';

    // 2. ExtrudeGeometry cho Gầm cầu thang (Soffit / Waist) bằng Thạch cao trắng
    const soffitThickness = 0.35;
    const soffitShape = new THREE.Shape();
    soffitShape.moveTo(-flightWidth / 2, -soffitThickness);
    soffitShape.lineTo(flightWidth / 2, -soffitThickness);
    soffitShape.lineTo(flightWidth / 2, 0);
    soffitShape.lineTo(-flightWidth / 2, 0);
    soffitShape.closePath();

    const extrudeSettings = {
      steps: 50,
      bevelEnabled: false,
      extrudePath: curve
    };

    const soffitGeo = new THREE.ExtrudeGeometry(soffitShape, extrudeSettings);
    // BẮT BUỘC: Tính toán Normals & Bounding Box/Sphere
    soffitGeo.computeVertexNormals();
    soffitGeo.computeBoundingBox();
    soffitGeo.computeBoundingSphere();

    const soffitMesh = new THREE.Mesh(soffitGeo, this.getMat('whitePlaster'));
    soffitMesh.frustumCulled = true; // Bật Frustum Culling
    soffitMesh.castShadow = false; // Tối ưu: Vô hiệu hóa shadow pass gây nặng hành lang/cầu thang
    soffitMesh.receiveShadow = true;
    flightGroup.add(soffitMesh);

    // 3. Mặt bậc cầu thang ốp gỗ nâu trầm bóng (Polished Mahogany Treads)
    const treadDepth = 0.42;
    const treadThickness = 0.08;
    const treadGeo = new THREE.BoxGeometry(flightWidth * 0.96, treadThickness, treadDepth);
    treadGeo.computeVertexNormals();
    treadGeo.computeBoundingBox();
    treadGeo.computeBoundingSphere();

    const treadMat = this.getMat('polishedMahogany');
    const goldTrimMat = this.getMat('royalGold');

    const nosingGeo = new THREE.BoxGeometry(flightWidth * 0.96, treadThickness * 0.9, 0.04);
    nosingGeo.computeVertexNormals();
    nosingGeo.computeBoundingBox();
    nosingGeo.computeBoundingSphere();

    for (let i = 0; i <= stepCount; i++) {
      const t = i / stepCount;
      const pt = curve.getPoint(t);
      const tangent = curve.getTangent(t);

      const treadMesh = new THREE.Mesh(treadGeo, treadMat);
      treadMesh.name = `Stair_Tread_${name}_${i}`;
      treadMesh.frustumCulled = true;
      treadMesh.position.copy(pt);
      treadMesh.position.y += treadThickness / 2;

      const angleY = Math.atan2(tangent.x, tangent.z);
      treadMesh.rotation.y = angleY;
      treadMesh.castShadow = false; // Tối ưu hóa bóng đổ GPU/CPU
      treadMesh.receiveShadow = true;
      flightGroup.add(treadMesh);

      const nosing = new THREE.Mesh(nosingGeo, goldTrimMat);
      nosing.name = `Stair_Nosing_${name}_${i}`;
      nosing.frustumCulled = true;
      nosing.position.copy(pt);
      nosing.position.y += treadThickness / 2;
      nosing.rotation.y = angleY;
      nosing.translateZ(treadDepth / 2);
      nosing.castShadow = false; // Tối ưu hóa bóng đổ GPU
      flightGroup.add(nosing);
    }

    // 4. Lan can uốn lượn bằng Kim loại vàng hoàng gia (Royal Gold Balustrade)
    const buildHandrail = (offsetSide) => {
      const railPoints = [];
      const samples = 36;
      for (let s = 0; s <= samples; s++) {
        const u = s / samples;
        const p = curve.getPoint(u);
        const tan = curve.getTangent(u);
        const norm = new THREE.Vector3(-tan.z, 0, tan.x).normalize();

        const railPt = p.clone().add(norm.multiplyScalar(offsetSide * (flightWidth / 2 - 0.12)));
        railPt.y += 0.95;
        railPoints.push(railPt);
      }

      const railCurve = new THREE.CatmullRomCurve3(railPoints);
      const railGeo = new THREE.TubeGeometry(railCurve, 40, 0.065, 12, false);
      railGeo.computeVertexNormals();
      railGeo.computeBoundingBox();
      railGeo.computeBoundingSphere();

      const railMesh = new THREE.Mesh(railGeo, goldTrimMat);
      railMesh.name = `Stair_Rail_${name}_${offsetSide}`;
      railMesh.frustumCulled = true;
      railMesh.castShadow = false; // Tối ưu GPU
      flightGroup.add(railMesh);

      const balusterGeo = new THREE.CylinderGeometry(0.025, 0.03, 0.90, 8);
      balusterGeo.computeVertexNormals();
      balusterGeo.computeBoundingBox();
      balusterGeo.computeBoundingSphere();

      for (let b = 1; b < samples; b += 2) {
        const u = b / samples;
        const p = curve.getPoint(u);
        const tan = curve.getTangent(u);
        const norm = new THREE.Vector3(-tan.z, 0, tan.x).normalize();

        const basePt = p.clone().add(norm.multiplyScalar(offsetSide * (flightWidth / 2 - 0.12)));
        const baluster = new THREE.Mesh(balusterGeo, goldTrimMat);
        baluster.name = `Stair_Baluster_${name}`;
        baluster.frustumCulled = true;
        baluster.position.set(basePt.x, basePt.y + 0.45, basePt.z);
        baluster.castShadow = false; // Tối ưu hóa bóng đổ GPU
        flightGroup.add(baluster);
      }
    };

    buildHandrail(-1);
    buildHandrail(1);

    return flightGroup;
  }

  /**
   * Cầu thang chữ Y kết nối Tầng 1 (Y=0) lên Tầng 2 (Y=10)
   */
  buildTier1To2Staircase() {
    const groupT1T2 = new THREE.Group();
    groupT1T2.name = "Staircase_Level1_to_Level2";

    const midY = 5.0;
    const topY = 10.0;

    const centralPoints = [
      new THREE.Vector3(0, 0.0, 24.0),
      new THREE.Vector3(0, 1.6, 18.5),
      new THREE.Vector3(0, 3.4, 13.0),
      new THREE.Vector3(0, 5.0, 8.0)
    ];
    const centralFlight = this.createCurvedFlight(
      centralPoints, 
      5.8, 
      24, 
      0, 
      midY, 
      "Central_Flight_L1"
    );
    groupT1T2.add(centralFlight);

    const landingRadius = 5.0;
    const landingGeo = new THREE.CylinderGeometry(landingRadius, landingRadius, 0.4, 32);
    landingGeo.computeVertexNormals();
    landingGeo.computeBoundingBox();
    landingGeo.computeBoundingSphere();

    const landingMesh = new THREE.Mesh(landingGeo, this.getMat('polishedMahogany'));
    landingMesh.name = "Stair_Landing_L1_L2";
    landingMesh.frustumCulled = true;
    landingMesh.position.set(0, midY - 0.2, 7.5);
    landingMesh.receiveShadow = true;
    landingMesh.castShadow = false;
    groupT1T2.add(landingMesh);

    const landingSoffitGeo = new THREE.CylinderGeometry(landingRadius * 0.95, landingRadius * 0.85, 0.5, 32);
    landingSoffitGeo.computeVertexNormals();
    landingSoffitGeo.computeBoundingBox();
    landingSoffitGeo.computeBoundingSphere();

    const landingSoffit = new THREE.Mesh(landingSoffitGeo, this.getMat('whitePlaster'));
    landingSoffit.name = "Stair_LandingSoffit_L1_L2";
    landingSoffit.frustumCulled = true;
    landingSoffit.position.set(0, midY - 0.65, 7.5);
    groupT1T2.add(landingSoffit);

    const leftPoints = [
      new THREE.Vector3(-1.8, 5.0, 6.5),
      new THREE.Vector3(-7.5, 6.4, 7.8),
      new THREE.Vector3(-14.5, 8.2, 11.0),
      new THREE.Vector3(-22.0, 10.0, 15.5)
    ];
    const leftWing = this.createCurvedFlight(
      leftPoints, 
      4.0, 
      26, 
      midY, 
      topY, 
      "Bifurcated_Wing_West_L2"
    );
    groupT1T2.add(leftWing);

    const rightPoints = [
      new THREE.Vector3(1.8, 5.0, 6.5),
      new THREE.Vector3(7.5, 6.4, 7.8),
      new THREE.Vector3(14.5, 8.2, 11.0),
      new THREE.Vector3(22.0, 10.0, 15.5)
    ];
    const rightWing = this.createCurvedFlight(
      rightPoints, 
      4.0, 
      26, 
      midY, 
      topY, 
      "Bifurcated_Wing_East_L2"
    );
    groupT1T2.add(rightWing);

    this.group.add(groupT1T2);
  }

  /**
   * Cầu thang chữ Y kết nối Tầng 2 (Y=10) lên Tầng 3 (Y=20)
   */
  buildTier2To3Staircase() {
    const groupT2T3 = new THREE.Group();
    groupT2T3.name = "Staircase_Level2_to_Level3";

    const startY = 10.0;
    const midY = 15.0;
    const topY = 20.0;

    const centralPoints = [
      new THREE.Vector3(0, 10.0, -24.0),
      new THREE.Vector3(0, 11.6, -18.5),
      new THREE.Vector3(0, 13.4, -13.0),
      new THREE.Vector3(0, 15.0, -8.0)
    ];
    const centralFlight = this.createCurvedFlight(
      centralPoints, 
      5.4, 
      24, 
      startY, 
      midY, 
      "Central_Flight_L2_North"
    );
    groupT2T3.add(centralFlight);

    const landingRadius = 4.8;
    const landingGeo = new THREE.CylinderGeometry(landingRadius, landingRadius, 0.4, 32);
    landingGeo.computeVertexNormals();
    landingGeo.computeBoundingBox();
    landingGeo.computeBoundingSphere();

    const landingMesh = new THREE.Mesh(landingGeo, this.getMat('polishedMahogany'));
    landingMesh.name = "Stair_Landing_L2_L3";
    landingMesh.frustumCulled = true;
    landingMesh.position.set(0, midY - 0.2, -7.5);
    landingMesh.receiveShadow = true;
    groupT2T3.add(landingMesh);

    const leftPoints = [
      new THREE.Vector3(-1.8, 15.0, -6.5),
      new THREE.Vector3(-7.5, 16.4, -7.8),
      new THREE.Vector3(-14.5, 18.2, -11.0),
      new THREE.Vector3(-22.0, 20.0, -15.5)
    ];
    const leftWing = this.createCurvedFlight(
      leftPoints, 
      4.0, 
      26, 
      midY, 
      topY, 
      "Bifurcated_Wing_West_L3"
    );
    groupT2T3.add(leftWing);

    const rightPoints = [
      new THREE.Vector3(1.8, 15.0, -6.5),
      new THREE.Vector3(7.5, 16.4, -7.8),
      new THREE.Vector3(14.5, 18.2, -11.0),
      new THREE.Vector3(22.0, 20.0, -15.5)
    ];
    const rightWing = this.createCurvedFlight(
      rightPoints, 
      4.0, 
      26, 
      midY, 
      topY, 
      "Bifurcated_Wing_East_L3"
    );
    groupT2T3.add(rightWing);

    this.group.add(groupT2T3);
  }

  /**
   * LẤY CÁC MẶT BẬC THANG & CHIẾU NGHỈ
   * Cầu thang được xử lý leo dốc hoàn toàn bằng giải tích toán học trong getFloorHeightAt(),
   * trả về mảng rỗng để triệt tiêu tải CPU raycast/duyệt lặp collision mỗi frame.
   */
  getStairObjects() {
    return [];
  }

  /**
   * LẤY CÁC LAN CAN & CON TIỆN CẦU THANG ĐỂ CHẶN VA CHẠM NGANG
   * Trả về mảng rỗng để triệt tiêu tải tính toán va chạm (stair đã xử lý toán học tại getFloorHeightAt)
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
