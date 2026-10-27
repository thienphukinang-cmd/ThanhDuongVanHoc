import * as THREE from 'three';
import { MaterialLibrary } from './modules/proceduralMaterials.js';
import { ProceduralArchitecture } from './modules/proceduralArchitecture.js';
import { ModelCreator } from './modules/modelCreator.js';
import { BifurcatedStaircase } from './modules/bifurcatedStaircase.js';
import { RoomGenerator } from './modules/RoomGenerator.js';
import { PortalInteraction } from './modules/PortalInteraction.js';
import { ArtDirectorLighting } from './modules/artDirectorLighting.js';
import { ExteriorVista } from './modules/exteriorVista.js';
import { ProceduralVFX } from './modules/proceduralVfx.js';
import { PostProcessingManager } from './modules/postprocessingManager.js';
import { CameraManager } from './controls/cameraManager.js';
import { DirectorPanel } from './ui/directorPanel.js';
import { DirectoryHUD } from './ui/DirectoryHUD.js';
import { KieuWorld } from './modules/kieuWorld.js';
import { WorldManager, WORLD_STATES } from './modules/worldManager.js';
import { AudioManager, SURFACE_TYPES } from './modules/AudioManager.js';
import { RoomDecorator, updateTruyenKieuVFX, updateTruyenKieuCinematic, fixFloorAndLightingRoom01, redesignTruyenKieuWithHeroModel } from './modules/RoomDecorator.js';
import { KieuRoomDecor } from './modules/KieuRoomDecor.js';
import { TruyenKieuStoryWorld } from './world/TruyenKieuWorld.js';
import { PerformanceOptimizer } from './modules/PerformanceOptimizer.js';

/**
 * BẢO TÀNG VĂN HỌC - THE NEW ERA
 * GIAI ĐOẠN 2: CHẾ TẠO PHÒNG MẪU 01 & LẬP TRÌNH CỔNG DỊCH CHUYỂN
 * 
 * Áp dụng quy tắc: AUTO-VALIDATION, DEFENSIVE PROGRAMMING & SELF-HEALING
 */

class LiteratureCathedralApp {
  constructor() {
    this.container = document.getElementById('app') ?? document.body;
    this.clock = new THREE.Clock();

    try {
      this.initRenderer();
      this.initScene();
      this.initSubsystems();
      this.initEvents();
      this.animate();
    } catch (error) {
      console.error("[SELF-HEALING CRITICAL] Lỗi khởi tạo ứng dụng:", error);
    }
  }

  initRenderer() {
    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        stencil: false,
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(1.0); // Khóa cố định pixelRatio = 1.0 (giảm 400% tải GPU fillrate trên màn hình độ phân giải cao)

      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.0;
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;

      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // TỐI ƯU HÓA KẾT XUẤT WEBGLLRENDERER (Performance Optimization)
      this.renderer.info.autoReset = false;

      this.container.appendChild(this.renderer.domElement);
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi tạo WebGLRenderer, thử tạo canvas cơ bản:", err);
    }
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.scene.name = "BaoTangVanHoc_BlockoutScene";
    window.__scene = this.scene;

    const aspect = window.innerWidth / (window.innerHeight || 1);
    // Căn chỉnh Z-Buffer theo lệnh khẩn cấp: near = 1.0 (TUYỆT ĐỐI không < 1.0 để chống vỡ Z-Buffer), far = 5000
    this.camera = new THREE.PerspectiveCamera(65, aspect, 1.0, 5000);
    this.camera.near = 1.0;
    this.camera.far = 5000;
    this.camera.updateProjectionMatrix();

    // Kích hoạt Layer 1: Cho phép Camera render đồng thời Sảnh Chính (Layer 0) và Phòng 01 Lầu Ngưng Bích (Layer 1 cô lập ánh sáng)
    this.camera.layers.enable(1);
  }

  initSubsystems() {
    console.log("%c[GIAI ĐOẠN 3] THIẾT LẬP THẾ GIỚI TỰ SỰ TRUYỆN KIỀU & QUẢN TRỊ BỘ NHỚ", "color: #ff99bb; font-weight: bold; font-size: 15px;");

    // Root Group của Sảnh Bảo Tàng để bật/tắt toàn bộ 100% khi chuyển cảnh
    this.atriumGroup = new THREE.Group();
    this.atriumGroup.name = "Museum_Atrium_Root";
    this.scene.add(this.atriumGroup);

    // 0. GIAI ĐOẠN 5: BỘ ĐIỀU KHIỂN ÂM THANH ĐA TẦNG (SPATIAL SOUNDSCAPE ENGINE)
    try {
      this.audioManager = new AudioManager(this.camera);
      window.audioManager = this.audioManager;
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo AudioManager:", err);
      this.audioManager = null;
    }

    // 1. SKILL 4: threejs-procedural-materials
    try {
      this.matLib = new MaterialLibrary();
    } catch (err) {
      console.warn("[SELF-HEALING] MaterialLibrary fallback:", err);
      this.matLib = { get: () => new THREE.MeshStandardMaterial({ color: 0x888888 }) };
    }

    // 2. SKILL 1 & 2: threejs-procedural-architecture & threejs-design-director
    try {
      this.architecture = new ProceduralArchitecture(this.matLib);
      if (this.architecture?.getGroup()) {
        this.atriumGroup.add(this.architecture.getGroup());
      }
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi tạo ProceduralArchitecture:", err);
    }

    // 3. SKILL 3: threejs-model-creator
    try {
      this.modelCreator = new ModelCreator(this.matLib);
      if (this.modelCreator?.getGroup()) {
        this.atriumGroup.add(this.modelCreator.getGroup());
      }
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi tạo ModelCreator:", err);
    }

    // 4. CẦU THANG CHỮ Y LỘNG LẪY (Bifurcated Staircase)
    try {
      this.staircase = new BifurcatedStaircase(this.matLib);
      if (this.staircase?.getGroup()) {
        this.atriumGroup.add(this.staircase.getGroup());
      }
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi tạo BifurcatedStaircase:", err);
    }

    // 5. TỰ ĐỘNG HÓA 15 PHÒNG VĂN HỌC (DATA-DRIVEN ROOM GENERATOR)
    try {
      this.roomGenerator = new RoomGenerator(this.matLib);
      if (this.roomGenerator?.getGroup()) {
        this.atriumGroup.add(this.roomGenerator.getGroup());
        this.roomGenerator.setAllRoomsVisible?.(true);
      }
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi tạo RoomGenerator:", err);
      this.roomGenerator = null;
    }

    // 5.1. BỘ NẠP CỤM TIỂU CẢNH VĂN HỌC (THEMATIC DIORAMA ENGINE) PHÒNG 01 TRUYỆN KIỀU
    try {
      this.roomDecorator = new RoomDecorator(this.matLib, {
        roomId: 'truyen_kieu',
        origin: new THREE.Vector3(-48.0, 10.0, 19.0),
        renderer: this.renderer
      });
      if (this.roomDecorator?.getGroup()) {
        this.atriumGroup.add(this.roomDecorator.getGroup());
        this.roomDecorator.getGroup().visible = true;
        this.roomDecorator.setLightsActive?.(true);
      }
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi tạo RoomDecorator:", err);
      this.roomDecorator = null;
    }

    // 6. SKILL 5: threejs-art-director
    try {
      this.artDirector = new ArtDirectorLighting(this.atriumGroup);
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi tạo ArtDirectorLighting:", err);
    }

    // 6.1. KHUNG CẢNH NGOẠI CẢNH KỲ VĨ TRÀNG AN / NINH BÌNH (Exterior Vista)
    try {
      this.exteriorVista = new ExteriorVista(this.atriumGroup, this.matLib);
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi tạo ExteriorVista:", err);
    }

    // 7. Hạt linh khí & bụi vàng không gian (Defensive Bounds)
    try {
      this.proceduralVfx = new ProceduralVFX(this.atriumGroup, { width: 44, height: 48, depth: 44 });
    } catch (err) {
      console.warn("[SELF-HEALING] Lỗi tạo ProceduralVFX:", err);
      this.proceduralVfx = { update: () => {}, setVisible: () => {} };
    }

    // 7.1. GIAI ĐOẠN 3: THẾ GIỚI TỰ SỰ TRUYỆN KIỀU (TIẾT THANH MINH)
    try {
      this.kieuWorld = new KieuWorld(this.scene, this.matLib, this.camera);
      if (this.kieuWorld && this.audioManager) {
        this.kieuWorld.setAudioManager(this.audioManager);
      }
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi tạo KieuWorld:", err);
      this.kieuWorld = null;
    }

    // 8. Post-processing Cinematic Look Dev (SSAO, Bloom, Exposure protection)
    try {
      this.postProcessing = new PostProcessingManager(this.renderer, this.scene, this.camera);
      // Lát sàn gỗ lim Đông Dương & chống cháy sáng phòng 01
      if (this.roomDecorator?.getGroup()) {
        fixFloorAndLightingRoom01(
          this.roomDecorator.getGroup(),
          this.scene,
          this.renderer,
          this.postProcessing?.bloomPass
        );
        redesignTruyenKieuWithHeroModel(this.roomDecorator.getGroup());
      }
    } catch (err) {
      console.warn("[SELF-HEALING] Lỗi PostProcessingManager, fallback trực tiếp renderer:", err);
      this.postProcessing = null;
    }

    // 9. Navigation & Director HUD
    try {
      this.cameraManager = new CameraManager(this.camera, this.renderer.domElement);
      if (this.cameraManager && this.audioManager) {
        this.cameraManager.setAudioManager(this.audioManager);
      }
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo CameraManager:", err);
    }

    // 9.0. THẾ GIỚI TRUYỆN KIỀU 4 PHÂN CẢNH (BLENDER 3D + PROCEDURAL ATMOSPHERE)
    try {
      this.truyenKieuStoryWorld = new TruyenKieuStoryWorld(
        this.scene,
        this.camera,
        this.cameraManager,
        this.atriumGroup
      );
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo TruyenKieuStoryWorld:", err);
      this.truyenKieuStoryWorld = null;
    }

    // 9.1. GIAI ĐOẠN 3: WORLD STATE MANAGER (QUẢN TRỊ BỘ NHỚ & CHUYỂN CẢNH)
    try {
      this.worldManager = new WorldManager(
        this.scene,
        this.camera,
        this.renderer,
        this.cameraManager,
        {
          atriumGroup: this.atriumGroup,
          kieuWorld: this.kieuWorld,
          audioManager: this.audioManager
        }
      );
      if (this.worldManager && this.truyenKieuStoryWorld) {
        this.worldManager.setTruyenKieuStoryWorld?.(this.truyenKieuStoryWorld);
      }
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi tạo WorldManager:", err);
      this.worldManager = null;
    }

    try {
      this.directorPanel = new DirectorPanel(
        this.cameraManager,
        this.artDirector,
        this.postProcessing,
        this.proceduralVfx,
        this.worldManager,
        this.audioManager
      );
      if (this.directorPanel && this.truyenKieuStoryWorld) {
        this.directorPanel.setTruyenKieuStoryWorld?.(this.truyenKieuStoryWorld);
      }
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo DirectorPanel:", err);
    }

    // 9.2. GIAI ĐOẠN 4: BẢNG THƯ MỤC ĐIỀU HƯỚNG TÁC PHẨM & FAST-TRAVEL (DIRECTORY HUD)
    try {
      this.directoryHUD = new DirectoryHUD(this.cameraManager);
      if (this.worldManager) {
        this.worldManager.directoryHUD = this.directoryHUD;
      }
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo DirectoryHUD:", err);
      this.directoryHUD = null;
    }

    // 9.3. BỘ QUẢN LÝ HIỆU NĂNG ĐỘNG & TỐI ƯU FPS (PERFORMANCE OPTIMIZER)
    try {
      this.performanceOptimizer = new PerformanceOptimizer(
        this,
        this.renderer,
        this.scene,
        this.camera,
        {
          postProcessing: this.postProcessing,
          artDirectorLighting: this.artDirector,
          proceduralVfx: this.proceduralVfx,
          roomDecorator: this.roomDecorator,
          truyenKieuStoryWorld: this.truyenKieuStoryWorld
        }
      );
      window.performanceOptimizer = this.performanceOptimizer;
      if (this.truyenKieuStoryWorld) {
        this.truyenKieuStoryWorld.performanceOptimizer = this.performanceOptimizer;
      }
      if (this.directorPanel) {
        this.directorPanel.setPerformanceOptimizer?.(this.performanceOptimizer);
      }
      console.log("%c✓ PerformanceOptimizer initialized (Adaptive Quality & FPS Monitor)!", "color: #39e58c; font-weight: bold;");
    } catch (err) {
      console.warn("[SELF-HEALING] Lỗi khởi tạo PerformanceOptimizer:", err);
    }

    // 10. GIAI ĐOẠN 2 & 3: HỆ THỐNG TƯƠNG TÁC CỔNG DỊCH CHUYỂN (PORTAL INTERACTION)
    try {
      this.portalInteraction = new PortalInteraction(
        this.scene,
        this.camera,
        this.renderer,
        this.cameraManager,
        { audioManager: this.audioManager }
      );
      if (this.portalInteraction && this.audioManager) {
        this.portalInteraction.setAudioManager(this.audioManager);
      }

      // Đăng ký toàn bộ 15 sách vào hệ thống tương tác Raycaster
      if (this.roomGenerator) {
        this.roomGenerator.registerWithPortal(this.portalInteraction);
      }

      // Kết nối hook loadNarrativeWorld với TruyenKieuWorld và WorldManager
      if (this.worldManager) {
        this.worldManager.portalInteraction = this.portalInteraction;
      }
      this.portalInteraction.loadNarrativeWorld = (worldId, coords, meta) => {
        if (worldId === 'truyen_kieu' || !worldId) {
          if (this.truyenKieuStoryWorld) {
            if (!this.truyenKieuStoryWorld.isInsideWorld) {
              this.truyenKieuStoryWorld.enterStoryWorldWithWarp(meta?.targetZoneId || 1);
            }
            return true;
          } else if (this.worldManager) {
            this.worldManager.transitionTo?.(WORLD_STATES.KIEU_WORLD);
            return true;
          }
        }
        return false;
      };
      window.loadNarrativeWorld = (worldId, coords, meta) => {
        if (this.truyenKieuStoryWorld) {
          if (!this.truyenKieuStoryWorld.isInsideWorld) {
            this.truyenKieuStoryWorld.enterStoryWorldWithWarp(meta?.targetZoneId || 1);
          }
          return true;
        } else if (this.worldManager) {
          this.worldManager.transitionTo?.(WORLD_STATES.KIEU_WORLD);
          return true;
        }
        return false;
      };

      // Đăng ký bổ sung model sách Phòng 01 nếu đã sẵn sàng
      if (this.roomDecorator) {
        const kieuBook = this.roomDecorator.getBookMesh?.();
        if (kieuBook) {
          this.portalInteraction.registerInteractiveBook(kieuBook, new THREE.Vector3(0, 150, 0), {
            id: 'truyen_kieu',
            title: 'TRUYỆN KIỀU – NGUYỄN DU',
            author: 'Đại thi hào Nguyễn Du (1765 – 1820)',
            genre: 'Truyện thơ Nôm (Văn học Trung đại)',
            quote: 'Đoạn trường tân thanh – Khúc ca bi tráng về tài mệnh tương đố và khát vọng tự do.',
            targetZoneId: 1,
            themeColor: 0x39e58c,
            portalReady: true
          });
        }
      }
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo PortalInteraction:", err);
    }

    // 10.1. HỆ THỐNG XỬ LÝ VA CHẠM 3D & CẦU THANG (COLLISION DETECTION & STAIR RAYCASTING)
    try {
      this.initCollisionSystem();
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo Collision System:", err);
    }

    // 11. VÒNG LẶP ÉP KIỂU TOÀN CỤC & TỐI ƯU HÓA FRUSTUM CULLING (PERFORMANCE & NaN SANITIZATION)
    try {
      this.sanitizeSceneGeometries();

      let overriddenCount = 0;
      this.scene.traverse((child) => {
        if (child.isMesh) {
          // BẬT FRUSTUM CULLING TOÀN CỤC: Đảm bảo mô hình ngoài góc nhìn camera không bị render
          child.frustumCulled = true;
          child.renderOrder = 0;
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat) => {
                if (mat) {
                  mat.side = THREE.DoubleSide; // Ép render 2 mặt
                  mat.depthWrite = true; // Ép ghi chiều sâu
                  mat.depthTest = true;
                  mat.needsUpdate = true;
                }
              });
            } else {
              child.material.side = THREE.DoubleSide; // Ép render 2 mặt
              child.material.depthWrite = true; // Ép ghi chiều sâu
              child.material.depthTest = true;
              child.material.needsUpdate = true;
            }
          }
          overriddenCount++;
        }
      });
      console.log(`%c[PERFORMANCE & RENDER] Đã bật Frustum Culling (frustumCulled=true) và tối ưu hóa ${overriddenCount} meshes!`, "color: #39e58c; font-weight: bold;");
    } catch (e) {
      console.warn("[SELF-HEALING] Lỗi traverse ép kiểu toàn cục:", e);
    }

    // 12. TIÊU DIỆT LIGHT HELPER & BÓNG ĐÈN ẢO TRONG TOÀN BỘ SCENE (Senior Lighting Director)
    this.cleanupLightHelpers();

    // 12.1. ĐÓNG BĂNG MATRIXAUTOUPDATE CHO TOÀN BỘ VẬT THỂ TĨNH (Tiết kiệm CPU tính toán ma trận)
    this.freezeStaticSceneMatrices();

    console.log("%c✓ Đã kích hoạt Phòng Mẫu 01 (Sách Ma Thuật & Cổng Dịch Chuyển Truyện Kiều) thành công!", "color: #39e58c; font-weight: bold;");

    // 13. TỰ ĐỘNG THEO DÕI FPS >= 60 KHI KHỞI ĐỘNG BẢO TÀNG (5 GIÂY LIÊN TỤC)
    setTimeout(() => {
      if (this.performanceOptimizer) {
        this.performanceOptimizer.startBenchmark('KHỞI ĐỘNG BẢO TÀNG');
      }
    }, 700);
  }

  freezeStaticSceneMatrices() {
    let frozenCount = 0;
    this.scene.traverse((child) => {
      if (child.isMesh && !child.userData?.isDynamic && !child.userData?.interactiveBookRoot) {
        child.updateMatrix();
        child.matrixAutoUpdate = false;
        frozenCount++;
      }
    });
    console.log(`%c[CPU MATRIX OPTIMIZATION] Đã đóng băng matrixAutoUpdate = false cho ${frozenCount} static meshes!`, "color: #39e58c; font-weight: bold;");
  }

  /**
   * TIÊU DIỆT LIGHT HELPER & BÓNG ĐÈN ẢO TRONG TOÀN BỘ SCENE (Senior Lighting Director)
   * Nguồn sáng là vô hình thuần túy, loại bỏ triệt để mọi khối hình học hoặc helper gây ra đốm tím dưới sàn.
   */
  cleanupLightHelpers() {
    try {
      const helpersToRemove = [];
      this.scene.traverse((child) => {
        // 1. Kiểm tra instance hoặc cờ helper
        if (
          child.isLightHelper ||
          child instanceof THREE.PointLightHelper ||
          child instanceof THREE.SpotLightHelper ||
          child instanceof THREE.DirectionalLightHelper ||
          child instanceof THREE.HemisphereLightHelper
        ) {
          helpersToRemove.push(child);
          return;
        }

        // 2. Kiểm tra tên bóng đèn ảo hoặc helper
        if (child.name && typeof child.name === 'string') {
          const lower = child.name.toLowerCase();
          if (
            lower.includes('lighthelper') ||
            lower.includes('pointlighthelper') ||
            lower.includes('spotlighthelper') ||
            lower.includes('virtualbulb') ||
            lower.includes('fakebulb') ||
            lower.includes('bulbmesh')
          ) {
            helpersToRemove.push(child);
            return;
          }
        }

        // 3. Kiểm tra Mesh bóng đèn ảo gắn trực tiếp vào nguồn sáng
        if (child.isMesh && child.parent instanceof THREE.Light) {
          helpersToRemove.push(child);
          return;
        }
      });

      helpersToRemove.forEach((helper) => {
        if (helper.parent) {
          helper.parent.remove(helper);
        }
        helper.geometry?.dispose?.();
        if (helper.material) {
          if (Array.isArray(helper.material)) helper.material.forEach(m => m?.dispose?.());
          else helper.material?.dispose?.();
        }
        helper.dispose?.();
      });

      if (helpersToRemove.length > 0) {
        console.log(`%c[LIGHT FIX] Senior Lighting Director: Đã xóa bỏ hoàn toàn ${helpersToRemove.length} LightHelper / bóng đèn ảo khỏi scene!`, "color: #39e58c; font-weight: bold;");
      }
    } catch (err) {
      console.warn("[SELF-HEALING] Lỗi dọn dẹp LightHelper:", err);
    }
  }

  /**
   * 1. KHỬ ĐỘC NaN TRONG TOÀN BỘ GEOMETRY (Sanitize BufferGeometry)
   * Duyệt qua toàn bộ scene, kiểm tra position và normal array:
   * Nếu !Number.isFinite(val), lập tức gán về 0 (normal Y gán về 1).
   */
  sanitizeSceneGeometries() {
    let sanitizedPositions = 0;
    let sanitizedNormals = 0;
    let checkedCount = 0;

    this.scene.traverse((child) => {
      if ((!child.isMesh && !child.isPoints) || !child.geometry) return;
      checkedCount++;

      const geo = child.geometry;
      const posAttr = geo.attributes.position;
      const normAttr = geo.attributes.normal;

      if (posAttr && posAttr.array) {
        const arr = posAttr.array;
        let posDirty = false;
        for (let i = 0; i < arr.length; i++) {
          if (!Number.isFinite(arr[i])) {
            arr[i] = 0;
            posDirty = true;
            sanitizedPositions++;
          }
        }
        if (posDirty) {
          posAttr.needsUpdate = true;
        }
      }

      if (normAttr && normAttr.array) {
        const arr = normAttr.array;
        let normDirty = false;
        for (let i = 0; i < arr.length; i += 3) {
          const nx = arr[i];
          const ny = arr[i + 1];
          const nz = arr[i + 2];

          const isInvalid = !Number.isFinite(nx) || !Number.isFinite(ny) || !Number.isFinite(nz) ||
                            (nx === 0 && ny === 0 && nz === 0);

          if (isInvalid) {
            arr[i] = 0;
            arr[i + 1] = 1; // Normal Y = 1 hướng lên
            arr[i + 2] = 0;
            normDirty = true;
            sanitizedNormals++;
          }
        }
        if (normDirty) {
          normAttr.needsUpdate = true;
        }
      }

      // Khử độc NaN cho instanceMatrix của THREE.InstancedMesh
      if (child.isInstancedMesh && child.instanceMatrix?.array) {
        const iarr = child.instanceMatrix.array;
        let matDirty = false;
        for (let i = 0; i < iarr.length; i++) {
          if (!Number.isFinite(iarr[i])) {
            iarr[i] = (i % 5 === 0) ? 1.0 : 0.0;
            matDirty = true;
          }
        }
        if (matDirty) {
          child.instanceMatrix.needsUpdate = true;
        }
      }

      // Đảm bảo Bounding Volumes được tính toán chuẩn xác cho Frustum Culling
      if (child.isMesh && geo) {
        if (!geo.boundingBox) geo.computeBoundingBox();
        if (!geo.boundingSphere) geo.computeBoundingSphere();
      }
    });

    console.log(`%c[SANITIZER & CULLING] Đã quét ${checkedCount} objects: Khử độc ${sanitizedPositions} đỉnh positions NaN, ${sanitizedNormals} vector normals NaN/0, tính toán Bounding Volumes đầy đủ!`, "color: #39e58c; font-weight: bold;");
  }

  /**
   * 1. HỆ THỐNG XỬ LÝ VA CHẠM THỰC THỂ (CLEANED PERIMETER WALLS ONLY)
   * Chỉ đưa vào mảng collisionObjects: Các bức tường cố định bao quanh không gian.
   * CẤM TUYỆT ĐỐI đưa cây đào, bình gốm, đèn lồng, bàn ghế, bục sách vào danh sách va chạm.
   */
  initCollisionSystem() {
    this.collisionObjects = [];
    this.stairObjects = [];

    // 1. Tường và lan can từ Architecture
    if (this.architecture?.getCollisionObjects) {
      this.collisionObjects.push(...this.architecture.getCollisionObjects());
    }

    // 2. Vách ngăn tường cố định từ RoomGenerator
    if (this.roomGenerator?.getCollisionObjects) {
      this.collisionObjects.push(...this.roomGenerator.getCollisionObjects());
    }

    // 3. Tường biên cố định từ RoomDecorator
    if (this.roomDecorator?.getCollisionObjects) {
      this.collisionObjects.push(...this.roomDecorator.getCollisionObjects());
    }

    // 4. Bậc thang và cao độ leo dốc được tính toán giải tích tuyến tính trong CameraController.getFloorHeightAt().
    // Tuyệt đối KHÔNG đưa mesh bậc thang vào mảng va chạm để tránh duyệt lặp vòng for mỗi frame.
    this.stairObjects = [];

    // Chuyển danh sách tường chuẩn xác cho CameraController (Spatial Grid O(1))
    this.cameraManager?.setCollisionObjects(this.collisionObjects, this.stairObjects);

    console.log(`%c[COLLISION SYSTEM] Đã thanh lọc hitbox: ${this.collisionObjects.length} bức tường biên cố định & Cầu thang giải tích O(1).`, "color: #39e58c; font-weight: bold;");
  }

  registerDynamicCollisionObject(model) {
    // Cấm tuyệt đối đưa các mô hình trang trí GLB (cây đào, bình gốm, đèn lồng, bàn ghế, bục sách) vào danh sách va chạm
  }

  /**
   * VÔ HIỆU HÓA PROXIMITY STREAMING (LUÔN LOAD VÀ BẬT SÁNG TOÀN BỘ BẢO TÀNG):
   * - Luôn bật Layer 1 hiển thị toàn cục cho camera.
   * - Luôn hiển thị và bật đầy đủ hệ thống chiếu sáng/VFX của Phòng 01 (RoomDecorator).
   * - Luôn bật toàn bộ ánh sáng của 14 phòng còn lại trong RoomGenerator.
   * Người chơi đứng ở bất cứ góc nào trong bảo tàng cũng thấy đầy đủ ánh sáng, vật phẩm và không bị mất cảnh quan từ xa.
   */
  /**
   * CẬP NHẬT CULLING, PROXIMITY VÀ TỐI ƯU HÓA HẬU KỲ THEO VỊ TRÍ CAMERA
   */
  updateRoomCullingAndLayers() {
    if (!this.camera) return;

    // 1. Luôn kích hoạt Layer 1 toàn cục cho camera
    this.camera.layers.enable(1);

    // 2. TỐI ƯU HẬU KỲ: CHỈ BẬT EFFECTCOMPOSER / BLOOM KHI Ở PHÒNG ĐẶC BIỆT (< 24M) HOẶC CÕI KIỀU.
    // TẮT HOÀN TOÀN KHI Ở SẢNH CHÍNH ĐỂ ĐẠT 60+ FPS ỔN ĐỊNH TUYỆT ĐỐI!
    const kieuRoomPos = new THREE.Vector3(-48, 10, 19);
    const distToKieuRoom = this.camera.position.distanceTo(kieuRoomPos);
    const isSpecialRoomActive = distToKieuRoom < 24.0 || (this.truyenKieuStoryWorld?.isInsideWorld ?? false);

    if (this.postProcessing) {
      this.postProcessing.setEnabled(isSpecialRoomActive);
    }

    // 3. Phòng 01 (RoomDecorator) chỉ bật đèn và cập nhật khi ở khoảng cách hợp lý
    if (this.roomDecorator) {
      const room1Group = this.roomDecorator.getGroup();
      if (room1Group) {
        room1Group.visible = distToKieuRoom < 65.0;
        this.roomDecorator.setLightsActive?.(distToKieuRoom < 48.0);
      }
    }
  }

  initEvents() {
    window.addEventListener('resize', () => {
      try {
        const w = window.innerWidth;
        const h = window.innerHeight || 1;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer?.setSize(w, h);
        this.renderer?.setPixelRatio(Math.min(window.devicePixelRatio ?? 1, 1.5));
      } catch (e) {
        console.warn("[SELF-HEALING] Lỗi resize handler:", e);
      }
    });
  }

  animate = (time) => {
    requestAnimationFrame(this.animate);

    // CƠ CHẾ GIỚI HẠN KHUNG HÌNH (FPS THROTTLE - MAX 60 FPS):
    // Khóa chặt thời gian tối thiểu 16ms/frame, triệt tiêu nguy cơ GPU chạy 1000 FPS gây nóng máy và treo tab
    const now = performance.now();
    if (this.lastFrameTime === undefined) this.lastFrameTime = now;
    const elapsedMs = now - this.lastFrameTime;
    if (elapsedMs < 16.0) return;
    this.lastFrameTime = now - (elapsedMs % 16.0);

    try {
      // Reset bộ đếm thống kê render khi autoReset = false
      this.renderer?.info?.reset?.();

      const delta = Math.min(this.clock?.getDelta() ?? 0.016, 0.05);
      const elapsedTime = this.clock?.getElapsedTime() ?? 0;

      // Quét dọn tự động định kỳ ở các frame đầu để loại trừ mọi helper/bulb khi các model GLTF nạp xong
      if (this.frameCounter === undefined) this.frameCounter = 0;
      this.frameCounter++;
      if (this.frameCounter === 30 || this.frameCounter === 90) {
        this.cleanupLightHelpers();
      }

      this.cameraManager?.update(delta);
      this.performanceOptimizer?.update(delta);
      this.portalInteraction?.update(delta, elapsedTime);
      this.worldManager?.update(delta, elapsedTime);
      this.truyenKieuStoryWorld?.update(delta, elapsedTime);

      if (this.worldManager?.currentState === WORLD_STATES.MUSEUM_ATRIUM && !this.truyenKieuStoryWorld?.isInsideWorld) {
        // Quản lý culling theo phòng và layer độc lập để tối ưu hóa 60 FPS
        this.updateRoomCullingAndLayers();

        this.artDirector?.update(delta, elapsedTime, this.camera);
        this.exteriorVista?.update(delta, elapsedTime);
        this.proceduralVfx?.update(delta, elapsedTime);
        this.roomGenerator?.update(delta, elapsedTime, this.camera);
        this.roomDecorator?.update(delta, elapsedTime, this.camera);
      }

      // RENDER TRỰC TIẾP QUA WEBGL (TẮT HOÀN TOÀN HẬU KỲ ĐỂ CỨU GPU KHỎI BỊ TREO/CRASH)
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    } catch (err) {
      console.error("[SELF-HEALING LOOP] Lỗi render loop, phục hồi trực tiếp:", err);
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    }
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new LiteratureCathedralApp();
});
