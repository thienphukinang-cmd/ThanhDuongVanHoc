import * as THREE from 'three';
import { DIMENSIONS } from '../config/dimensions.js';
import { IndochineBalustrades } from './indochineBalustrades.js';
import { LITERATURE_REGISTRY } from '../config/literatureRegistry.js';
import * as ProceduralMats from './proceduralMaterials.js';
import { mergeGroupMeshesByMaterial } from '../utils/geometryMerger.js';

// ============================================================================
// BỘ CACHE VẬT LIỆU & TEXTURE NỘI BỘ (ĐẢM BẢO < 2MB VRAM & 60+ FPS)
// ============================================================================
const ARCH_TEX_CACHE = {};
const ARCH_MAT_CACHE = {};

function getCachedCanvasTex(key, width, height, drawFn, repeatX = 1, repeatY = 1) {
  if (ARCH_TEX_CACHE[key]) return ARCH_TEX_CACHE[key];
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, width, height);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.generateMipmaps = false;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  ARCH_TEX_CACHE[key] = tex;
  return tex;
}

function getSafePlaqueMaterial(title = 'PHÒNG TRƯNG BÀY', id = 'default') {
  if (typeof ProceduralMats.getCalligraphyPlaqueMaterial === 'function') {
    try {
      return ProceduralMats.getCalligraphyPlaqueMaterial(title, id);
    } catch (e) { /* fallback bên dưới */ }
  }
  const cacheKey = `plaque_${id}`;
  if (ARCH_MAT_CACHE[cacheKey]) return ARCH_MAT_CACHE[cacheKey];

  const tex = getCachedCanvasTex(cacheKey, 512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#24120a';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = '#ffe07d';
    ctx.font = 'bold 32px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(title).toUpperCase(), w / 2, h / 2);
  });

  const mat = new THREE.MeshLambertMaterial({ map: tex, emissive: 0x261806, side: THREE.FrontSide });
  ARCH_MAT_CACHE[cacheKey] = mat;
  return mat;
}

export class ProceduralArchitecture {
  constructor(materialLibrary = null) {
    this.matLib = materialLibrary;
    this.group = new THREE.Group();
    this.group.name = "Indochine_Procedural_Architecture";
    this.group.visible = true;
    this.collisionSolids = [];

    // 1. Dựng kết cấu sàn, hành lang 3 tầng & bậc thềm đế đá
    this.buildSlabsAndCorridors();

    // 2. Dựng ngoại thất Cung điện Đông Dương (Hệ cột mặt tiền, Mái ngói lưu ly 2 tầng, Cổng Tiền Sảnh)
    this.buildPalaceExteriorAndRoof();

    // 3. Dựng 15 không gian trưng bày mở
    this.buildFifteenOpenPavilions();

    // 4. Dựng hệ thống lan can con tiện Indochine
    this.buildBalustradesSystem();

    // 5. Dựng Bầu trời Hoàng hôn, Hồ nước Ngọc Bích & Quần thể Núi đá vôi Tràng An
    this.buildSkyAndTrangAnLandscape();

    this.group.traverse((child) => {
      child.userData = child.userData || {};
      child.userData.excludeFromCollision = true;
      child.visible = true;
      if (child.isMesh) {
        child.frustumCulled = true;
      }
    });
  }

  buildCollisionSolidList() {
    this.collisionSolids = [];
  }

  getMat(name) {
    if (ARCH_MAT_CACHE[name]) return ARCH_MAT_CACHE[name];

    // Vật liệu riêng cho kiến trúc ngoại thất & cảnh quan
    if (name === 'imperial_roof_tile') {
      const roofTex = getCachedCanvasTex('imperial_roof_tex', 256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#2b1b14';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#1c100b';
        for (let i = 0; i < 16; i++) {
          ctx.fillRect(i * 16, 0, 6, h);
        }
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.22)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, h - 6);
        ctx.lineTo(w, h - 6);
        ctx.stroke();
      }, 12, 4);
      const mat = new THREE.MeshPhongMaterial({
        map: roofTex,
        color: 0x3b241b,
        specular: 0x997a45,
        shininess: 35,
        side: THREE.FrontSide
      });
      ARCH_MAT_CACHE[name] = mat;
      return mat;
    }

    if (name === 'stone_plinth') {
      const stoneTex = getCachedCanvasTex('stone_plinth_tex', 256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#5c5852';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#3d3a36';
        ctx.lineWidth = 3;
        for (let y = 0; y < h; y += 32) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(w, y);
          ctx.stroke();
        }
      }, 10, 2);
      const mat = new THREE.MeshLambertMaterial({ map: stoneTex, color: 0x736e65, side: THREE.FrontSide });
      ARCH_MAT_CACHE[name] = mat;
      return mat;
    }

    if (typeof ProceduralMats.getSharedMaterial === 'function') {
      const aliasMap = {
        floor_marble: 'floor_marble',
        wall_marble: 'wall_marble',
        whiteMarble: 'column_marble',
        indochinePlaster: 'wall_marble',
        dark_wood: 'dark_wood',
        wainscotWood: 'dark_wood',
        polishedMahogany: 'dark_wood',
        royalGold: 'antique_gold'
      };
      if (aliasMap[name]) {
        const shared = ProceduralMats.getSharedMaterial(aliasMap[name]);
        if (shared) {
          ARCH_MAT_CACHE[name] = shared;
          return shared;
        }
      }
    }

    const fromLib = this.matLib?.get?.(name);
    if (fromLib) {
      ARCH_MAT_CACHE[name] = fromLib;
      return fromLib;
    }

    let fallbackMat;
    switch (name) {
      case 'floor_marble': {
        const floorTex = getCachedCanvasTex('arch_floor_marble', 256, 256, (ctx, w, h) => {
          ctx.fillStyle = '#d8c39e';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = 'rgba(255,250,240,0.4)';
          ctx.lineWidth = 2;
          for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            ctx.moveTo(0, (i * 32) % h);
            ctx.bezierCurveTo(w * 0.3, (i * 45) % h, w * 0.7, (i * 15) % h, w, (i * 35) % h);
            ctx.stroke();
          }
        }, 8, 8);
        fallbackMat = new THREE.MeshPhongMaterial({
          map: floorTex,
          color: 0xffffff,
          specular: 0xffe6b0,
          shininess: 50,
          side: THREE.FrontSide
        });
        break;
      }
      case 'wall_marble':
      case 'whiteMarble':
      case 'indochinePlaster':
        fallbackMat = new THREE.MeshLambertMaterial({ color: 0xf4efe6, side: THREE.FrontSide });
        break;
      case 'dark_wood':
      case 'wainscotWood':
      case 'polishedMahogany':
        fallbackMat = new THREE.MeshLambertMaterial({ color: 0x2b1810, side: THREE.FrontSide });
        break;
      case 'royalGold':
        fallbackMat = new THREE.MeshPhongMaterial({
          color: 0xd4af37,
          emissive: 0x2a1d05,
          specular: 0xffeba8,
          shininess: 85,
          side: THREE.FrontSide
        });
        break;
      default:
        fallbackMat = new THREE.MeshLambertMaterial({ color: 0xdcd6cc, side: THREE.FrontSide });
    }

    ARCH_MAT_CACHE[name] = fallbackMat;
    return fallbackMat;
  }

  prepareGeometry(geo) {
    if (!geo) return;
    geo.computeVertexNormals();
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
  }

  createSafeMesh(geo, mat, name = "ArchMesh") {
    this.prepareGeometry(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = true;
    mesh.receiveShadow = false;
    mesh.castShadow = false;
    mesh.name = name;
    return mesh;
  }

  /**
   * 1. SÀN ĐẠI SẢNH, BẬC THỀM ĐẾ ĐÁ TAM CẤP & HÀNH LANG 3 TẦNG
   */
  buildSlabsAndCorridors() {
    const totalW = 125.0;
    const voidW = DIMENSIONS?.atrium?.voidWidth ?? 44.0;
    const deckDepth = (totalW - voidW) / 2; // 40.5m
    const slabThickness = 0.65;

    const floorMat = this.getMat('floor_marble');
    const woodMat = this.getMat('dark_wood');
    const goldMat = this.getMat('royalGold');
    const stoneMat = this.getMat('stone_plinth');

    // A. SÀN CHÍNH TẦNG 1 (126m x 126m) + VIỀN GỖ VÀNG BỌC NGOÀI
    const groundFloor = this.createSafeMesh(new THREE.BoxGeometry(126, slabThickness, 126), floorMat, "Ground_Floor_Marble");
    groundFloor.position.set(0, -slabThickness / 2, 0);
    this.group.add(groundFloor);

    // B. ĐẾ ĐÀI ĐÁ NINH BÌNH TAM CẤP (Giúp tòa nhà uy nghi trên mặt hồ, không bị mỏng như tờ giấy)
    const plinth1 = this.createSafeMesh(new THREE.BoxGeometry(132, 0.7, 132), stoneMat, "Plinth_Step_1");
    plinth1.position.set(0, -0.95, 0);
    this.group.add(plinth1);

    const plinth2 = this.createSafeMesh(new THREE.BoxGeometry(138, 0.7, 138), stoneMat, "Plinth_Step_2");
    plinth2.position.set(0, -1.65, 0);
    this.group.add(plinth2);

    const plinthGoldRim = this.createSafeMesh(new THREE.BoxGeometry(132.4, 0.16, 132.4), goldMat, "Plinth_Gold_Rim");
    plinthGoldRim.position.set(0, -0.62, 0);
    this.group.add(plinthGoldRim);

    // C. SÀN HÀNH LANG TẦNG 2 (Y = 10m) & TẦNG 3 (Y = 20m)
    [10.0, 20.0].forEach((elevation, idx) => {
      const levelId = idx + 2;
      const corridorGroup = new THREE.Group();
      corridorGroup.name = `Open_Deck_Level_${levelId}`;

      const nsBoxGeo = new THREE.BoxGeometry(totalW, slabThickness, deckDepth);
      const ewBoxGeo = new THREE.BoxGeometry(deckDepth, slabThickness, voidW);

      const slabN = this.createSafeMesh(nsBoxGeo, floorMat, `Slab_North_L${levelId}`);
      slabN.position.set(0, elevation - slabThickness / 2, -(voidW / 2 + deckDepth / 2));
      corridorGroup.add(slabN);

      const slabS = this.createSafeMesh(nsBoxGeo, floorMat, `Slab_South_L${levelId}`);
      slabS.position.set(0, elevation - slabThickness / 2, (voidW / 2 + deckDepth / 2));
      corridorGroup.add(slabS);

      const slabW = this.createSafeMesh(ewBoxGeo, floorMat, `Slab_West_L${levelId}`);
      slabW.position.set(-(voidW / 2 + deckDepth / 2), elevation - slabThickness / 2, 0);
      corridorGroup.add(slabW);

      const slabE = this.createSafeMesh(ewBoxGeo, floorMat, `Slab_East_L${levelId}`);
      slabE.position.set((voidW / 2 + deckDepth / 2), elevation - slabThickness / 2, 0);
      corridorGroup.add(slabE);

      // Diềm gỗ Mahogany & Phào chỉ vàng bọc quanh cả mép trong (giếng trời) lẫn mép ngoài (ngoại thất)
      const outerFasciaH = 0.9;
      const outerFasciaNS = new THREE.BoxGeometry(totalW + 1.2, outerFasciaH, 0.5);
      const outerFasciaEW = new THREE.BoxGeometry(0.5, outerFasciaH, totalW + 1.2);

      const extN = this.createSafeMesh(outerFasciaNS, woodMat, `Ext_Fascia_N_L${levelId}`);
      extN.position.set(0, elevation - outerFasciaH / 2, -totalW / 2);
      corridorGroup.add(extN);

      const extS = this.createSafeMesh(outerFasciaNS, woodMat, `Ext_Fascia_S_L${levelId}`);
      extS.position.set(0, elevation - outerFasciaH / 2, totalW / 2);
      corridorGroup.add(extS);

      const extW = this.createSafeMesh(outerFasciaEW, woodMat, `Ext_Fascia_W_L${levelId}`);
      extW.position.set(-totalW / 2, elevation - outerFasciaH / 2, 0);
      corridorGroup.add(extW);

      const extE = this.createSafeMesh(outerFasciaEW, woodMat, `Ext_Fascia_E_L${levelId}`);
      extE.position.set(totalW / 2, elevation - outerFasciaH / 2, 0);
      corridorGroup.add(extE);

      // Chỉ vàng chạy nổi quanh mặt tiền các tầng
      const goldBandNS = new THREE.BoxGeometry(totalW + 1.5, 0.16, 0.55);
      const goldBandEW = new THREE.BoxGeometry(0.55, 0.16, totalW + 1.5);

      const gN = this.createSafeMesh(goldBandNS, goldMat);
      gN.position.set(0, elevation - 0.15, -totalW / 2);
      corridorGroup.add(gN);

      const gS = this.createSafeMesh(goldBandNS, goldMat);
      gS.position.set(0, elevation - 0.15, totalW / 2);
      corridorGroup.add(gS);

      const gW = this.createSafeMesh(goldBandEW, goldMat);
      gW.position.set(-totalW / 2, elevation - 0.15, 0);
      corridorGroup.add(gW);

      const gE = this.createSafeMesh(goldBandEW, goldMat);
      gE.position.set(totalW / 2, elevation - 0.15, 0);
      corridorGroup.add(gE);

      mergeGroupMeshesByMaterial(corridorGroup, {
        namePrefix: `Merged_Corridor_L${levelId}`,
        forceNoShadow: true,
        excludeFromCollision: true,
        ignoreRaycaster: true
      });
      this.group.add(corridorGroup);
    });
  }

  /**
   * 2. NGOẠI THẤT CUNG ĐIỆN ĐÔNG DƯƠNG: HỆ CỘT MẶT TIỀN, MÁI NGÓI 2 TẦNG & CỔNG ĐẠI SẢNH
   */
  buildPalaceExteriorAndRoof() {
    const extGroup = new THREE.Group();
    extGroup.name = "Indochine_Palace_Exterior";

    const totalW = 125.0;
    const halfW = totalW / 2; // 62.5m
    const voidW = DIMENSIONS?.atrium?.voidWidth ?? 44.0;
    const deckDepth = (totalW - voidW) / 2;
    const ceilY = DIMENSIONS?.ceiling?.height ?? 32.0;

    const marbleMat = this.getMat('whiteMarble');
    const woodMat = this.getMat('dark_wood');
    const goldMat = this.getMat('royalGold');
    const roofMat = this.getMat('imperial_roof_tile');
    const stoneMat = this.getMat('stone_plinth');

    // A. HỆ CỘT ĐẠI SẢNH BAO QUANH 4 MẶT TIỀN Ở CẢ 3 TẦNG (Mở thoáng ở giữa để ngắm núi non)
    const colPositions = [-61.5, -46.0, -31.0, -15.5, 15.5, 31.0, 46.0, 61.5];
    const tiers = [
      { y: 0.0, h: 9.6 },
      { y: 10.0, h: 9.6 },
      { y: 20.0, h: 11.6 }
    ];

    tiers.forEach((t) => {
      colPositions.forEach((pos) => {
        // Mặt Nam & Mặt Bắc
        extGroup.add(this.createPerimeterColumn(t.y, t.h, pos, halfW - 0.8));
        extGroup.add(this.createPerimeterColumn(t.y, t.h, pos, -(halfW - 0.8)));
        // Mặt Tây & Mặt Đông (tránh trùng 4 góc)
        if (Math.abs(pos) < 60.0) {
          extGroup.add(this.createPerimeterColumn(t.y, t.h, -(halfW - 0.8), pos));
          extGroup.add(this.createPerimeterColumn(t.y, t.h, halfW - 0.8, pos));
        }
      });

      // Lan can đá & tay vịn gỗ chạy dọc hành lang ngoài cùng mỗi tầng
      const railY = t.y + 0.95;
      const railNS = this.createSafeMesh(new THREE.BoxGeometry(totalW, 0.18, 0.35), woodMat, "Outer_Handrail_NS");
      railNS.position.set(0, railY, halfW - 0.4);
      extGroup.add(railNS);

      const railN = railNS.clone();
      railN.position.set(0, railY, -(halfW - 0.4));
      extGroup.add(railN);

      const railEW = this.createSafeMesh(new THREE.BoxGeometry(0.35, 0.18, totalW), woodMat, "Outer_Handrail_EW");
      railEW.position.set(-(halfW - 0.4), railY, 0);
      extGroup.add(railEW);

      const railE = railEW.clone();
      railE.position.set(halfW - 0.4, railY, 0);
      extGroup.add(railE);
    });

    // B. TRẦN GỖ ĐẠI SẢNH & HỆ MÁI NGÓI HOÀNG GIA ĐÔNG DƯƠNG 2 TẦNG CHỒNG DIỀM (Y = 32m -> 37m)
    const ceilNSGeo = new THREE.BoxGeometry(totalW + 8, 0.8, deckDepth + 4);
    const ceilEWGeo = new THREE.BoxGeometry(deckDepth + 4, 0.8, voidW + 2);

    const ceilN = this.createSafeMesh(ceilNSGeo, woodMat, "Ceil_North");
    ceilN.position.set(0, ceilY, -(voidW / 2 + deckDepth / 2));
    extGroup.add(ceilN);

    const ceilS = this.createSafeMesh(ceilNSGeo, woodMat, "Ceil_South");
    ceilS.position.set(0, ceilY, (voidW / 2 + deckDepth / 2));
    extGroup.add(ceilS);

    const ceilW = this.createSafeMesh(ceilEWGeo, woodMat, "Ceil_West");
    ceilW.position.set(-(voidW / 2 + deckDepth / 2), ceilY, 0);
    extGroup.add(ceilW);

    const ceilE = this.createSafeMesh(ceilEWGeo, woodMat, "Ceil_East");
    ceilE.position.set((voidW / 2 + deckDepth / 2), ceilY, 0);
    extGroup.add(ceilE);

    // Diềm mái ngói dốc tầng 1 (Lower Eaves) đua rộng ra ngoài tạo dáng cung điện Á Đông
    const eaveOverhang = 134.0;
    const eaveGoldTrim = this.createSafeMesh(new THREE.BoxGeometry(eaveOverhang, 0.35, eaveOverhang), goldMat, "Roof_Lower_Gold_Eave");
    eaveGoldTrim.position.set(0, ceilY + 0.5, 0);
    // Khoét rỗng bằng 4 thanh diềm quanh chu vi
    extGroup.remove(eaveGoldTrim);

    const createSlopedRoofWing = (w, d, h, x, y, z, rotY = 0) => {
      const wingGroup = new THREE.Group();
      // Khối mái vát nghiêng bằng Cylinder 4 cạnh (hình chóp cụt chuẩn mái bốn mái Indochine)
      const roofGeo = new THREE.CylinderGeometry(w * 0.58, w * 0.72, h, 4, 1);
      roofGeo.rotateY(Math.PI / 4);
      const roofMesh = this.createSafeMesh(roofGeo, roofMat, "Sloped_Roof_Wing");
      roofMesh.scale.set(1.0, 1.0, d / w);
      roofMesh.position.y = h / 2;
      wingGroup.add(roofMesh);

      // Viền bờ nóc và diềm mái mạ vàng
      const rimMesh = this.createSafeMesh(new THREE.BoxGeometry(w * 1.02, 0.28, d * 1.02), goldMat, "Roof_Wing_GoldRim");
      rimMesh.position.y = 0.14;
      wingGroup.add(rimMesh);

      wingGroup.position.set(x, y, z);
      wingGroup.rotation.y = rotY;
      return wingGroup;
    };

    // 4 Dải mái cung điện bao quanh 4 cánh Bắc, Nam, Đông, Tây
    extGroup.add(createSlopedRoofWing(132, 42, 4.2, 0, ceilY + 0.4, -42.5));
    extGroup.add(createSlopedRoofWing(132, 42, 4.2, 0, ceilY + 0.4, 42.5));
    extGroup.add(createSlopedRoofWing(42, 52, 4.2, -42.5, ceilY + 0.4, 0));
    extGroup.add(createSlopedRoofWing(42, 52, 4.2, 42.5, ceilY + 0.4, 0));

    // 4 Lầu vọng cảnh ở 4 góc mái (Corner Roof Pavilions) tạo điểm nhấn kiến trúc cực kỳ bề thế từ xa
    const cornerCoords = [[-52, -52], [52, -52], [-52, 52], [52, 52]];
    cornerCoords.forEach(([cx, cz], idx) => {
      const tower = createSlopedRoofWing(24, 24, 5.5, cx, ceilY + 3.2, cz);
      tower.name = `Corner_Roof_Pavilion_${idx}`;
      // Đỉnh tháp vàng trên 4 lầu góc
      const spire = this.createSafeMesh(new THREE.ConeGeometry(0.8, 3.2, 6), goldMat, "Corner_Spire");
      spire.position.set(cx, ceilY + 9.8, cz);
      extGroup.add(tower);
      extGroup.add(spire);
    });

    // C. CỔNG ĐẠI SẢNH TIỀN ĐƯỜNG (SOUTH GRAND ENTRANCE PORTICO) & CẦU ĐÁ QUA HỒ
    const porticoZ = halfW + 4.5;
    const porticoRoof = createSlopedRoofWing(34, 14, 4.0, 0, 22.5, porticoZ);
    extGroup.add(porticoRoof);

    // 4 Cột trụ đại sảnh cao 22m đỡ Cổng Tiền Đường
    [-12, -5.5, 5.5, 12].forEach((px) => {
      extGroup.add(this.createPerimeterColumn(0, 22.5, px, porticoZ + 3.5));
    });

    // Bảng Đại Hoành Phi Mặt Tiền Chính: "BẢO TÀNG VĂN HỌC VIỆT NAM"
    const mainPlaqueMat = getSafePlaqueMaterial("BẢO TÀNG VĂN HỌC VIỆT NAM", "grand_museum_facade");
    const mainPlaque = this.createSafeMesh(new THREE.BoxGeometry(16.0, 2.6, 0.35), mainPlaqueMat, "Grand_Facade_Plaque");
    mainPlaque.position.set(0, 19.8, porticoZ + 4.2);
    extGroup.add(mainPlaque);

    const mainPlaqueFrame = this.createSafeMesh(new THREE.BoxGeometry(16.6, 3.0, 0.25), goldMat, "Grand_Facade_Plaque_Gold");
    mainPlaqueFrame.position.set(0, 19.8, porticoZ + 4.0);
    extGroup.add(mainPlaqueFrame);

    // Cầu đá & Bậc thềm Hoàng Gia dẫn từ mặt hồ vào sảnh chính (Z = 63m -> 105m)
    const bridgeDeck = this.createSafeMesh(new THREE.BoxGeometry(18, 1.2, 42), stoneMat, "Royal_Entrance_Bridge");
    bridgeDeck.position.set(0, -0.8, halfW + 24);
    extGroup.add(bridgeDeck);

    const bridgeCarpet = this.createSafeMesh(new THREE.BoxGeometry(12, 0.15, 42), this.getMat('floor_marble'), "Bridge_Marble_Walkway");
    bridgeCarpet.position.set(0, -0.15, halfW + 24);
    extGroup.add(bridgeCarpet);

    // Lan can đá và trụ đèn dọc hai bên cầu dẫn vào bảo tàng
    [-8.2, 8.2].forEach((bx) => {
      const bridgeRail = this.createSafeMesh(new THREE.BoxGeometry(0.6, 1.1, 40), marbleMat, "Bridge_Stone_Rail");
      bridgeRail.position.set(bx, 0.35, halfW + 24);
      extGroup.add(bridgeRail);

      const bridgeGoldCap = this.createSafeMesh(new THREE.BoxGeometry(0.75, 0.12, 40.2), goldMat, "Bridge_Rail_Gold");
      bridgeGoldCap.position.set(bx, 0.95, halfW + 24);
      extGroup.add(bridgeGoldCap);
    });

    // Gộp toàn bộ cột ngoại thất (352 meshes), mái, cầu đá, tay vịn theo vật liệu
    mergeGroupMeshesByMaterial(extGroup, {
      namePrefix: 'Merged_Palace_Exterior',
      forceNoShadow: true,
      excludeFromCollision: true,
      ignoreRaycaster: true
    });

    this.group.add(extGroup);
  }

  /**
   * 3. BẦU TRỜI HOÀNG HÔN ĐÔNG DƯƠNG, MẶT HỒ NGỌC BÍCH & QUẦN THỂ NÚI ĐÁ VÔI TRÀNG AN
   * Sử dụng fog: false cho bầu trời và núi xa để KHÔNG BAO GIỜ bị sương mù đen che khuất!
   */
  buildSkyAndTrangAnLandscape() {
    const envGroup = new THREE.Group();
    envGroup.name = "TrangAn_Sky_And_Mountains_Panorama";

    // A. VÒM BẦU TRỜI HOÀNG HÔN / BÌNH MINH (SKYDOME VỚI FOG: FALSE)
    const skyTex = getCachedCanvasTex('indochine_sunset_sky', 256, 512, (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0.0, '#1d3557');  // Đỉnh trời xanh lam sẫm
      grad.addColorStop(0.28, '#456990'); // Xanh hoàng hôn
      grad.addColorStop(0.46, '#9e7B9b'); // Tím hồng mây chiều
      grad.addColorStop(0.58, '#e09f67'); // Cam vàng rực chân trời
      grad.addColorStop(0.72, '#f4d58d'); // Ánh nắng vàng kim phản chiếu mặt hồ
      grad.addColorStop(1.0, '#2a4d45');  // Đáy dưới mặt nước
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Vẽ vầng mặt trời hoàng hôn & dải mây vàng nhẹ
      const sunGrad = ctx.createRadialGradient(w * 0.5, h * 0.54, 4, w * 0.5, h * 0.54, 55);
      sunGrad.addColorStop(0.0, 'rgba(255, 250, 220, 0.95)');
      sunGrad.addColorStop(0.35, 'rgba(255, 210, 120, 0.45)');
      sunGrad.addColorStop(1.0, 'rgba(255, 160, 80, 0.0)');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, w, h);
    }, 1, 1);

    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
      fog: false, // BẤT TỬ TRƯỚC SƯƠNG MÙ ĐEN CỦA MAIN.JS
      depthWrite: false
    });

    const skyDome = new THREE.Mesh(new THREE.SphereGeometry(780, 16, 10), skyMat);
    skyDome.name = "Indochine_Sunset_SkyDome";
    skyDome.renderOrder = -10;
    skyDome.frustumCulled = false;

    // Tự động đồng bộ lại màu nền & sương mù ấm áp cho toàn bộ Scene ngay khi vẽ khung hình đầu tiên
    let sceneSynced = false;
    skyDome.onBeforeRender = (renderer, scene) => {
      if (!sceneSynced && scene) {
        sceneSynced = true;
        scene.background = new THREE.Color(0xdca878);
        if (scene.fog) {
          scene.fog.color.setHex(0xdca878);
          if ('density' in scene.fog) {
            scene.fog.density = 0.00075; // Sương mù cực mỏng để nhìn rõ núi Tràng An
          }
        }
      }
    };
    envGroup.add(skyDome);

    // B. MẶT HỒ NƯỚC NGỌC BÍCH TRÀNG AN BAO QUANH BẢO TÀNG (Y = -2.0m)
    const waterTex = getCachedCanvasTex('trangan_emerald_water', 256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#1d4e46';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(244, 213, 141, 0.16)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 28; i++) {
        ctx.beginPath();
        const y = (i * 9) % h;
        ctx.moveTo(0, y);
        ctx.quadraticCurveTo(w * 0.5, y + 4, w, y);
        ctx.stroke();
      }
    }, 24, 24);

    const waterMat = new THREE.MeshPhongMaterial({
      map: waterTex,
      color: 0x265c52,
      emissive: 0x0b211d,
      specular: 0xffcc88,
      shininess: 75,
      fog: true,
      side: THREE.FrontSide
    });

    const waterMesh = this.createSafeMesh(new THREE.PlaneGeometry(1500, 1500, 1, 1), waterMat, "TrangAn_Emerald_Lake");
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.y = -2.0;
    waterMesh.matrixAutoUpdate = false;
    waterMesh.updateMatrix();
    envGroup.add(waterMesh);

    // C. QUẦN THỂ NÚI ĐÁ VÔI TRÀNG AN 2 LỚP (INSTANCED MESH - 2 DRAW CALLS THAY VÌ 120)
    const nearKarstMat = new THREE.MeshLambertMaterial({
      color: 0x3b4d47,
      emissive: 0x161d1b,
      flatShading: true,
      fog: false,
      side: THREE.FrontSide
    });

    const farKarstMat = new THREE.MeshLambertMaterial({
      color: 0x6c6874,
      emissive: 0x2c2529,
      flatShading: true,
      fog: false,
      side: THREE.FrontSide
    });

    const mistRingMat = new THREE.MeshBasicMaterial({
      color: 0xf2CFA0,
      transparent: true,
      opacity: 0.22,
      fog: false,
      depthWrite: false,
      side: THREE.FrontSide
    });

    const SharedPeakGeo = new THREE.ConeGeometry(1, 1, 6, 1);
    this.prepareGeometry(SharedPeakGeo);

    const nearTransforms = [];
    const farTransforms = [];
    const dummy = new THREE.Object3D();
    const pushCluster = (targetList, x, z, baseRadius, height, rotY) => {
      const cosR = Math.cos(rotY);
      const sinR = Math.sin(rotY);
      const addPeak = (lx, ly, lz, sx, sy, sz, localRotY) => {
        const wx = x + lx * cosR + lz * sinR;
        const wz = z - lx * sinR + lz * cosR;
        dummy.position.set(wx, -2.2 + ly, wz);
        dummy.rotation.set(0, rotY + localRotY, 0);
        dummy.scale.set(sx, sy, sz);
        dummy.updateMatrix();
        targetList.push(dummy.matrix.clone());
      };
      addPeak(0, height * 0.5, 0, baseRadius, height, baseRadius * 0.85, 0);
      addPeak(-baseRadius * 0.55, height * 0.34, baseRadius * 0.2, baseRadius * 0.7, height * 0.68, baseRadius * 0.65, 0.8);
      addPeak(baseRadius * 0.5, height * 0.26, -baseRadius * 0.15, baseRadius * 0.6, height * 0.52, baseRadius * 0.6, 1.9);
    };

    const ring1Count = 18;
    for (let i = 0; i < ring1Count; i++) {
      const angle = (i / ring1Count) * Math.PI * 2;
      if (Math.abs(angle - Math.PI / 2) < 0.22) continue;
      const dist = 155 + ((i * 37) % 55);
      const radius = 26 + ((i * 19) % 18);
      const height = 65 + ((i * 29) % 55);
      pushCluster(nearTransforms, Math.cos(angle) * dist, Math.sin(angle) * dist, radius, height, i * 1.1);
    }

    const ring2Count = 24;
    for (let i = 0; i < ring2Count; i++) {
      const angle = (i / ring2Count) * Math.PI * 2 + 0.13;
      const dist = 330 + ((i * 43) % 80);
      const radius = 48 + ((i * 23) % 30);
      const height = 110 + ((i * 41) % 85);
      pushCluster(farTransforms, Math.cos(angle) * dist, Math.sin(angle) * dist, radius, height, i * 0.7);
    }

    const buildKarstInstanced = (transforms, mat, name) => {
      const inst = new THREE.InstancedMesh(SharedPeakGeo, mat, transforms.length);
      inst.name = name;
      inst.castShadow = false;
      inst.receiveShadow = false;
      inst.frustumCulled = true;
      inst.matrixAutoUpdate = false;
      for (let i = 0; i < transforms.length; i++) {
        inst.setMatrixAt(i, transforms[i]);
      }
      inst.instanceMatrix.needsUpdate = true;
      inst.computeBoundingBox();
      inst.computeBoundingSphere();
      inst.updateMatrix();
      return inst;
    };

    if (nearTransforms.length > 0) {
      envGroup.add(buildKarstInstanced(nearTransforms, nearKarstMat, 'Instanced_Near_Karsts'));
    }
    if (farTransforms.length > 0) {
      envGroup.add(buildKarstInstanced(farTransforms, farKarstMat, 'Instanced_Far_Karsts'));
    }

    // Dải sương mù hoàng hôn là là trên mặt nước bao quanh chân núi
    const mistRing = new THREE.Mesh(new THREE.RingGeometry(115, 380, 20), mistRingMat);
    mistRing.rotation.x = -Math.PI / 2;
    mistRing.position.y = 0.5;
    mistRing.frustumCulled = true;
    mistRing.matrixAutoUpdate = false;
    mistRing.updateMatrix();
    envGroup.add(mistRing);

    this.group.add(envGroup);
  }

  buildBalustradesSystem() {
    try {
      this.balustrades = new IndochineBalustrades(this.matLib);
      if (this.balustrades?.getGroup()) {
        this.group.add(this.balustrades.getGroup());
      }
    } catch (err) {
      console.warn("[IndochineBalustrades] Bỏ qua lỗi khởi tạo phụ:", err);
    }
  }

  createArchedWall(wallWidth = 26, wallHeight = 10, archWidth = 6.2, archHeight = 7.5, thickness = 0.5, plaqueTitle = null, plaqueId = null) {
    const wallGroup = new THREE.Group();
    const plasterMat = this.getMat('indochinePlaster');
    const goldMat = this.getMat('royalGold');
    const woodMat = this.getMat('wainscotWood');

    const sideW = Math.max(0.5, (wallWidth - archWidth) / 2);
    const topH = Math.max(0.5, wallHeight - archHeight);

    const leftPillar = this.createSafeMesh(new THREE.BoxGeometry(sideW, wallHeight, thickness), plasterMat, "Arch_Wall_Left");
    leftPillar.position.set(-(archWidth / 2 + sideW / 2), wallHeight / 2, 0);
    wallGroup.add(leftPillar);

    const rightPillar = this.createSafeMesh(new THREE.BoxGeometry(sideW, wallHeight, thickness), plasterMat, "Arch_Wall_Right");
    rightPillar.position.set((archWidth / 2 + sideW / 2), wallHeight / 2, 0);
    wallGroup.add(rightPillar);

    const lintel = this.createSafeMesh(new THREE.BoxGeometry(archWidth, topH, thickness), plasterMat, "Arch_Wall_Top");
    lintel.position.set(0, wallHeight - topH / 2, 0);
    wallGroup.add(lintel);

    const halfW = archWidth / 2;
    const straightH = Math.max(0.5, archHeight - halfW);
    const frameGeo = new THREE.TorusGeometry(halfW, 0.12, 5, 10, Math.PI);
    const archFrame = this.createSafeMesh(frameGeo, goldMat, "Arch_Gold_Frame");
    archFrame.position.set(0, straightH, thickness / 2 + 0.05);
    wallGroup.add(archFrame);

    const jambGeo = new THREE.BoxGeometry(0.2, archHeight, 0.12);
    const leftJamb = this.createSafeMesh(jambGeo, goldMat, "Arch_Left_Jamb");
    leftJamb.position.set(-halfW, archHeight / 2, thickness / 2 + 0.05);
    wallGroup.add(leftJamb);

    const rightJamb = this.createSafeMesh(jambGeo, goldMat, "Arch_Right_Jamb");
    rightJamb.position.set(halfW, archHeight / 2, thickness / 2 + 0.05);
    wallGroup.add(rightJamb);

    if (plaqueTitle && plaqueId) {
      const plaqueMat = getSafePlaqueMaterial(plaqueTitle, plaqueId);
      const plaqueMesh = this.createSafeMesh(new THREE.BoxGeometry(3.6, 0.9, 0.08), plaqueMat, `Plaque_${plaqueId}`);
      plaqueMesh.position.set(0, 8.35, thickness / 2 + 0.08);
      wallGroup.add(plaqueMesh);

      const plaqueTrim = this.createSafeMesh(new THREE.BoxGeometry(3.72, 1.0, 0.05), goldMat, `PlaqueTrim_${plaqueId}`);
      plaqueTrim.position.set(0, 8.35, thickness / 2 + 0.04);
      wallGroup.add(plaqueTrim);
    }

    const baseboardGeo = new THREE.BoxGeometry(sideW, 0.85, thickness + 0.12);
    const leftBase = this.createSafeMesh(baseboardGeo, woodMat, "Arch_Left_Baseboard");
    leftBase.position.set(-(archWidth / 2 + sideW / 2), 0.425, 0);
    wallGroup.add(leftBase);

    const rightBase = this.createSafeMesh(baseboardGeo, woodMat, "Arch_Right_Baseboard");
    rightBase.position.set((archWidth / 2 + sideW / 2), 0.425, 0);
    wallGroup.add(rightBase);

    return wallGroup;
  }

  /**
   * BỨC TƯỜNG NGĂN CÁCH KIẾN TRÚC (ARCHITECTURAL PARTITION WALLS)
   * Cao kịch trần bảo tàng (8m - 12m), dày 0.6m, dài 28m nối liền từ tường cửa vòm ra sát lan can ngoài cùng.
   * Ngăn cách hoàn toàn 100% giữa các phòng triển lãm theo chuẩn phong cách Đông Dương.
   */
  createArchitecturalPartitionWall(length = 28, height = 10, elevation = 0, posX = 0, posZ = 0, isRotated = false) {
    const wallGroup = new THREE.Group();
    wallGroup.name = "Architectural_Partition_Wall";
    const plasterMat = this.getMat('indochinePlaster');
    const woodMat = this.getMat('wainscotWood');
    const goldMat = this.getMat('royalGold');
    const thickness = 0.6;

    // 1. Thân tường thạch cao Indochine kịch trần bảo tàng
    const wallGeo = new THREE.BoxGeometry(length, height, thickness);
    const wallMesh = this.createSafeMesh(wallGeo, plasterMat, "Partition_Wall_Core");
    wallMesh.position.set(0, height / 2, 0);
    wallGroup.add(wallMesh);

    // 2. Chân tường ốp gỗ sẫm màu Mahogany cao 1.2m
    const baseGeo = new THREE.BoxGeometry(length, 1.2, thickness + 0.08);
    const baseMesh = this.createSafeMesh(baseGeo, woodMat, "Partition_Wall_Baseboard");
    baseMesh.position.set(0, 0.6, 0);
    wallGroup.add(baseMesh);

    // 3. Nẹp phào chỉ vàng hoàng gia cao 1.24m
    const goldTrimGeo = new THREE.BoxGeometry(length, 0.08, thickness + 0.12);
    const goldTrimMesh = this.createSafeMesh(goldTrimGeo, goldMat, "Partition_Wall_GoldTrim");
    goldTrimMesh.position.set(0, 1.24, 0);
    wallGroup.add(goldTrimMesh);

    // 4. Phào cổ trần chạy sát mép đỉnh tường
    const crownGeo = new THREE.BoxGeometry(length, 0.28, thickness + 0.08);
    const crownMesh = this.createSafeMesh(crownGeo, woodMat, "Partition_Wall_Crown");
    crownMesh.position.set(0, height - 0.14, 0);
    wallGroup.add(crownMesh);

    wallGroup.position.set(posX, elevation, posZ);
    if (isRotated) wallGroup.rotation.y = Math.PI / 2;
    return wallGroup;
  }

  createIndochineScreen(length = 26, elevation = 0, posX = 0, posZ = 0, isRotated = false) {
    const screenGroup = new THREE.Group();
    const woodMat = this.getMat('wainscotWood');
    const goldMat = this.getMat('royalGold');

    const baseMesh = this.createSafeMesh(new THREE.BoxGeometry(length, 0.9, 0.28), woodMat, "Screen_Base");
    baseMesh.position.set(0, 0.45, 0);
    screenGroup.add(baseMesh);

    const goldCap = this.createSafeMesh(new THREE.BoxGeometry(length, 0.05, 0.32), goldMat, "Screen_GoldCap");
    goldCap.position.set(0, 0.92, 0);
    screenGroup.add(goldCap);

    const louverCount = 8;
    const postGeo = new THREE.BoxGeometry(0.18, 1.6, 0.18);
    for (let i = 0; i <= louverCount; i++) {
      const post = this.createSafeMesh(postGeo, woodMat, "Screen_LouverPost");
      post.position.set(-length / 2 + (i / louverCount) * length, 1.7, 0);
      screenGroup.add(post);
    }

    const topBar = this.createSafeMesh(new THREE.BoxGeometry(length, 0.14, 0.24), woodMat, "Screen_TopBar");
    topBar.position.set(0, 2.56, 0);
    screenGroup.add(topBar);

    screenGroup.position.set(posX, elevation, posZ);
    if (isRotated) screenGroup.rotation.y = Math.PI / 2;
    return screenGroup;
  }

  createPerimeterColumn(elevation = 0, height = 9.8, posX = 0, posZ = 0) {
    const colGroup = new THREE.Group();
    const marbleMat = this.getMat('whiteMarble');
    const goldMat = this.getMat('royalGold');

    const baseMesh = this.createSafeMesh(new THREE.BoxGeometry(1.5, 0.85, 1.5), marbleMat, "Perimeter_Col_Base");
    baseMesh.position.y = 0.425;
    colGroup.add(baseMesh);

    const shaftMesh = this.createSafeMesh(new THREE.CylinderGeometry(0.52, 0.58, height - 1.6, 8), marbleMat, "Perimeter_Col_Shaft");
    shaftMesh.position.y = 0.8 + (height - 1.6) / 2;
    colGroup.add(shaftMesh);

    const ringMesh = this.createSafeMesh(new THREE.BoxGeometry(1.35, 0.18, 1.35), goldMat, "Perimeter_Col_GoldRing");
    ringMesh.position.y = height - 0.85;
    colGroup.add(ringMesh);

    const capMesh = this.createSafeMesh(new THREE.BoxGeometry(1.6, 0.8, 1.6), marbleMat, "Perimeter_Col_Cap");
    capMesh.position.y = height - 0.4;
    colGroup.add(capMesh);

    colGroup.position.set(posX, elevation, posZ);
    return colGroup;
  }

  buildFifteenOpenPavilions() {
    const pavilionsGroup = new THREE.Group();
    pavilionsGroup.name = "Fifteen_Open_Air_Pavilions";

    const levels = [
      { id: 1, elevation: 0.0,  height: 10.0 },
      { id: 2, elevation: 10.0, height: 10.0 },
      { id: 3, elevation: 20.0, height: 12.0 }
    ];

    const registryList = Array.isArray(LITERATURE_REGISTRY) ? LITERATURE_REGISTRY : [];

    levels.forEach((lvl) => {
      const y = lvl.elevation;
      const h = lvl.height;
      const tierGroup = new THREE.Group();
      tierGroup.name = `Tier_${lvl.id}_Open_Pavilions`;

      const getRoom = (rIdx) => {
        return registryList.find(l => l.floor === lvl.id && l.roomIndex === rIdx) || {
          name: `Phòng Trưng Bày ${lvl.id}0${rIdx + 1}`,
          id: `room_${lvl.id}_${rIdx}`
        };
      };

      const configs = [
        { x: -34, z: 19, rot: Math.PI / 2, idx: 0, sx: -48, sz1: 6, sz2: 32, isRot: false },
        { x: -34, z: -19, rot: Math.PI / 2, idx: 1, sx: -48, sz1: -6, sz2: -32, isRot: false },
        { x: 0, z: -34, rot: 0, idx: 2, sx1: -22, sx2: 22, sz: -48, isRot: true },
        { x: 34, z: -19, rot: -Math.PI / 2, idx: 3, sx: 48, sz1: -6, sz2: -32, isRot: false },
        { x: 34, z: 19, rot: -Math.PI / 2, idx: 4, sx: 48, sz1: 6, sz2: 32, isRot: false }
      ];

      configs.forEach((cfg) => {
        const room = getRoom(cfg.idx);
        const w = cfg.z === -34 ? 44 : 26;
        const arch = this.createArchedWall(w, h, w === 44 ? 8.0 : 6.2, 7.5, 0.6, room.name, room.id);
        arch.rotation.y = cfg.rot;
        arch.position.set(cfg.x, y, cfg.z);
        tierGroup.add(arch);

        // Dựng Bức Tường Ngăn Cách Kiến Trúc cao kịch trần nối từ tường cửa vòm ra sát lan can ngoài cùng
        if (cfg.isRot) {
          tierGroup.add(this.createArchitecturalPartitionWall(28, h, y, cfg.sx1, cfg.sz, true));
          tierGroup.add(this.createArchitecturalPartitionWall(28, h, y, cfg.sx2, cfg.sz, true));
        } else {
          tierGroup.add(this.createArchitecturalPartitionWall(28, h, y, cfg.sx, cfg.sz1, false));
          tierGroup.add(this.createArchitecturalPartitionWall(28, h, y, cfg.sx, cfg.sz2, false));
        }
      });

      const plasterMat = this.getMat('indochinePlaster');
      const westInfill = this.createSafeMesh(new THREE.BoxGeometry(0.6, h, 12), plasterMat, "West_Corridor_Infill");
      westInfill.position.set(-34, y + h / 2, 0);
      tierGroup.add(westInfill);

      const eastInfill = this.createSafeMesh(new THREE.BoxGeometry(0.6, h, 12), plasterMat, "East_Corridor_Infill");
      eastInfill.position.set(34, y + h / 2, 0);
      tierGroup.add(eastInfill);

      // Gộp toàn bộ tường vòm + tường ngăn tầng theo vật liệu (chỉ giữ mỗi tầng vài draw calls + plaques)
      mergeGroupMeshesByMaterial(tierGroup, {
        namePrefix: `Merged_Tier${lvl.id}_Pavilions`,
        forceNoShadow: true,
        excludeFromCollision: true,
        ignoreRaycaster: true
      });

      pavilionsGroup.add(tierGroup);
    });

    this.group.add(pavilionsGroup);
  }

  getCollisionObjects() {
    return this.collisionSolids || [];
  }

  getGroup() {
    return this.group;
  }
}