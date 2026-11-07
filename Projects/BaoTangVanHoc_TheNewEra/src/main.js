import * as THREE from 'three';
import { playBookSuckInCutscene } from './modules/bookVortexCutscene.js';import { MaterialLibrary, updateProceduralLighting } from './modules/proceduralMaterials.js';
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
import { buildTruyenKieuExhibition } from './modules/truyenKieuRoomDecorator.js';
import { buildThanhGiongExhibition } from './modules/thanhGiongRoomDecorator.js';
import { buildSonTinhThuyTinhExhibition, setupSonTinhThuyTinhRoom } from './modules/sonTinhThuyTinhRoomDecorator.js';
import { buildNamQuocSonHaExhibition } from './modules/namQuocSonHaRoomDecorator.js';
import { buildAnDuongVuongExhibition } from './modules/anDuongVuongRoomDecorator.js';
import { buildVoNhatExhibition } from './modules/voNhatRoomDecorator.js';
import { decorateMuseumGrandLobbyAndCorridors } from './modules/museumLobbyCorridorDecorator.js';
import { replaceAllMuseumCarpetsWithTimelinePattern } from './modules/museumCarpetReplacer.js';
import { createMuseumImmersionSystem } from './modules/museumImmersionSystem.js';
import { TruyenKieuStoryWorld } from './world/TruyenKieuWorld.js';
import { PerformanceOptimizer } from './modules/PerformanceOptimizer.js';
import { createMuseumCrowdSystem } from './modules/museumCrowdVFX.js';
import { getMuseumHitboxManager } from './modules/museumHitboxSystem.js';
import {
  createTraditionalArchwayEntrance,
  createCuratedArtifactStation,
  MuseumAutoTourDirector
} from './modules/museumCuratorAndTourSystem.js';
import { MuseumTotalOverhaulEngine } from './modules/museumTotalOverhaulEngine.js';
import { applyAll16SkillsToMuseum } from './modules/museumUltimate16SkillsUpgrade.js';

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
      this.renderer.setPixelRatio(0.85); // Khóa pixelRatio = 0.85 (tối ưu 28% fillrate cho GPU NVIDIA GTX 1050 2GB)

      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.0;
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;

      this.renderer.shadowMap.enabled = false; // TẮT SHADOWMAP TOÀN PHẦN: Giải phóng 100% băng thông shadow passes cho GTX 1050
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // TỐI ƯU HÓA KẾT XUẤT WEBGLLRENDERER (Performance Optimization)
      this.renderer.info.autoReset = false;

      this.container.appendChild(this.renderer.domElement);
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi tạo WebGLRenderer, thử tạo canvas cơ bản:", err);
    }
  }

  initScene() {
    // KIẾN TRÚC ĐA VŨ TRỤ (MULTI-SCENE ARCHITECTURE)
    // 1. Scene Sảnh Chính Bảo Tàng
    this.mainScene = new THREE.Scene();
    this.mainScene.name = "BaoTangVanHoc_MainScene";
    this.scene = this.mainScene; // Tương thích ngược với các module khác
    window.__scene = this.mainScene;
    window.__mainScene = this.mainScene;

    // 2. Scene Thế Giới Truyện Kiều Độc Lập Hoàn Toàn (Cõi Thơ Đoạn Trường Tân Thanh)
    this.truyenKieuScene = new THREE.Scene();
    this.truyenKieuScene.name = "TruyenKieu_Universe";
    this.truyenKieuScene.background = new THREE.Color(0x090414);
    this.truyenKieuScene.fog = new THREE.FogExp2(0x1a0b2e, 0.0012);
    window.__truyenKieuScene = this.truyenKieuScene;

    // 3. Scene Thế Giới Sơn Tinh - Thủy Tinh Độc Lập Hoàn Toàn (Cõi Đại Chiến Gojo vs Sukuna)
    this.sonTinhThuyTinhScene = new THREE.Scene();
    this.sonTinhThuyTinhScene.name = "SonTinhThuyTinh_Universe";
    this.sonTinhThuyTinhScene.background = new THREE.Color(0x050b14);
    this.sonTinhThuyTinhScene.fog = new THREE.FogExp2(0x0c1e33, 0.002);
    window.__sonTinhThuyTinhScene = this.sonTinhThuyTinhScene;

    // 4. Scene Thế Giới An Dương Vương Độc Lập Hoàn Toàn (Cõi Cổ Loa Thành & Biển Đông)
    this.anDuongVuongScene = new THREE.Scene();
    this.anDuongVuongScene.name = "AnDuongVuong_Universe";
    this.anDuongVuongScene.background = new THREE.Color(0x031210);
    this.anDuongVuongScene.fog = new THREE.FogExp2(0x072a24, 0.0012);
    window.__anDuongVuongScene = this.anDuongVuongScene;

    // 5. Scene Thế Giới Vợ Nhặt Độc Lập Hoàn Toàn (Cõi Văn Học & Xóm Ngụ Cư 1945)
    this.voNhatScene = new THREE.Scene();
    this.voNhatScene.name = "VoNhat_Universe";
    this.voNhatScene.background = new THREE.Color(0x181008);
    this.voNhatScene.fog = new THREE.FogExp2(0x2a1a0d, 0.0018);
    window.__voNhatScene = this.voNhatScene;

    // 5. Biến quản lý Scene đang Active (Mặc định: Sảnh Bảo Tàng)
    this.activeScene = this.mainScene;
    window.__activeScene = this.activeScene;
    window.__app = this;

    this.museumCrowd = createMuseumCrowdSystem(this.scene, { totalVisitors: 42 });
    window.__museumCrowd = this.museumCrowd;

    const truyenKieuRoom = buildTruyenKieuExhibition({
      roomCenter: new THREE.Vector3(-48.0, 10.0, 19.0), // Khớp chính xác với Tầng 2 (Y = 10.0m) Hiên Tây - Nam theo LITERATURE_REGISTRY
      poeticScene: this.truyenKieuScene
    });
    this.scene.add(truyenKieuRoom);
    this.truyenKieuRoom = truyenKieuRoom;
    this.roomDecorator = truyenKieuRoom;

    const thanhGiongRoom = buildThanhGiongExhibition({
      roomCenter: new THREE.Vector3(-48.0, 0.0, 19.0), // Khớp chính xác với Tầng 1 (Y = 0.0m) Hiên Tây - Nam theo LITERATURE_REGISTRY
      targetHeight: 4.2 // Chuẩn hóa Thánh Gióng 4.2m trên Bệ Đá Núi Sóc cao 1.6m theo thiết kế Đông Sơn rực lửa
    });
    this.scene.add(thanhGiongRoom);
    this.thanhGiongRoom = thanhGiongRoom;

    const sonTinhThuyTinhRoom = setupSonTinhThuyTinhRoom(this.scene, {
      roomCenter: new THREE.Vector3(-48.0, 0.0, -19.0), // Khớp chính xác với Tầng 1 (Y = 0.0m) Cánh Tây - Bắc theo LITERATURE_REGISTRY
      battleScene: this.sonTinhThuyTinhScene
    });
    if (sonTinhThuyTinhRoom.parent !== this.scene) {
      this.scene.add(sonTinhThuyTinhRoom);
    }
    this.sonTinhThuyTinhRoom = sonTinhThuyTinhRoom;

    const namQuocSonHaRoom = buildNamQuocSonHaExhibition({
      roomCenter: new THREE.Vector3(-48.0, 10.0, -19.0) // Khớp chính xác với Tầng 2 (Y = 10.0m) Cánh Tây - Bắc theo LITERATURE_REGISTRY
    });
    this.scene.add(namQuocSonHaRoom);
    this.namQuocSonHaRoom = namQuocSonHaRoom;

    const anDuongVuongRoom = buildAnDuongVuongExhibition({
      roomCenter: new THREE.Vector3(0.0, 0.0, -48.0), // Khớp chính xác với Tầng 1 (Y = 0.0m) Cánh Bắc - Đại Gian theo LITERATURE_REGISTRY
      realmScene: this.anDuongVuongScene
    });
    this.scene.add(anDuongVuongRoom);
    this.anDuongVuongRoom = anDuongVuongRoom;
    window.__anDuongVuongRoom = anDuongVuongRoom;

    const voNhatRoom = buildVoNhatExhibition({
      roomCenter: new THREE.Vector3(48.0, 20.0, -19.0), // Khớp chính xác với Tầng 3 (Y = 20.0m) Cánh Đông - Bắc theo LITERATURE_REGISTRY
      realmScene: this.voNhatScene
    });
    this.scene.add(voNhatRoom);
    this.voNhatRoom = voNhatRoom;
    window.__voNhatRoom = voNhatRoom;

    const aspect = window.innerWidth / (window.innerHeight || 1);
    // Căn chỉnh Z-Buffer: near = 1.0, far = 5000
    this.camera = new THREE.PerspectiveCamera(65, aspect, 1.0, 5000);
    this.camera.near = 1.0;
    this.camera.far = 5000;
    this.camera.updateProjectionMatrix();

    // Kích hoạt Layer 1
    this.camera.layers.enable(1);

    // 5. BẦU TRỜI & SƯƠNG MÙ HOÀNG HÔN ẤM ÁP CHO BẢO TÀNG (ĐỒNG BỘ 0xdca878 & FOG 0.00075)
    this.mainScene.background = new THREE.Color(0xdca878);
    this.scene.background = this.mainScene.background;
    this.mainScene.fog = new THREE.FogExp2(0xdca878, 0.00075);
    this.scene.fog = this.mainScene.fog;
  }

  /**
   * CƠ CHẾ HOÁN ĐỔI SCENE (SCENE SWAPPING):
   * Chuyển đổi giữa Sảnh Chính và Thế Giới Truyện Kiều trong vòng lặp render
   */
  setActiveScene(scene) {
    if (!scene || this.activeScene === scene) return;
    this.activeScene = scene;
    window.__activeScene = scene;
    if (scene === this.mainScene) {
      this.mainScene.background = new THREE.Color(0xdca878);
      this.mainScene.fog = new THREE.FogExp2(0xdca878, 0.00075);
      if (this.exteriorVista?.group) this.exteriorVista.group.visible = true;
      if (this.truyenKieuStoryWorld?.worldGroup) this.truyenKieuStoryWorld.worldGroup.visible = false;
      if (this.kieuWorld?.group) this.kieuWorld.group.visible = false;
      if (this.truyenKieuRoom) this.truyenKieuRoom.visible = true;
      if (this.thanhGiongRoom) this.thanhGiongRoom.visible = true;
      if (this.sonTinhThuyTinhRoom) this.sonTinhThuyTinhRoom.visible = true;
      if (this.namQuocSonHaRoom) this.namQuocSonHaRoom.visible = true;
      if (this.anDuongVuongRoom) this.anDuongVuongRoom.visible = true;
      if (this.voNhatRoom) this.voNhatRoom.visible = true;
      if (this.museumCrowd?.crowdGroup) this.museumCrowd.crowdGroup.visible = true;
    } else if (scene === this.truyenKieuScene) {
      if (this.kieuWorld) this.kieuWorld.setVisible?.(false);
      if (this.truyenKieuStoryWorld?.worldGroup) this.truyenKieuStoryWorld.worldGroup.visible = false;
      this.truyenKieuScene.background = new THREE.Color(0x090314);
      this.truyenKieuScene.fog = new THREE.FogExp2(0x160729, 0.0038);
      if (this.exteriorVista?.group) this.exteriorVista.group.visible = false;
      if (this.truyenKieuRoom) this.truyenKieuRoom.visible = false;
      if (this.thanhGiongRoom) this.thanhGiongRoom.visible = false;
      if (this.sonTinhThuyTinhRoom) this.sonTinhThuyTinhRoom.visible = false;
      if (this.namQuocSonHaRoom) this.namQuocSonHaRoom.visible = false;
      if (this.anDuongVuongRoom) this.anDuongVuongRoom.visible = false;
      if (this.voNhatRoom) this.voNhatRoom.visible = false;
      if (this.museumCrowd?.crowdGroup) this.museumCrowd.crowdGroup.visible = false;
    } else if (scene === this.sonTinhThuyTinhScene) {
      this.sonTinhThuyTinhScene.background = new THREE.Color(0x050b14);
      this.sonTinhThuyTinhScene.fog = new THREE.FogExp2(0x0c1e33, 0.002);
      this.sonTinhThuyTinhScene.position.set(0, 0, 0);
      if (this.sonTinhThuyTinhRoom?.battleRealm) this.sonTinhThuyTinhRoom.battleRealm.visible = true;
      if (this.sonTinhThuyTinhRoom?.userData?.battleRealm) this.sonTinhThuyTinhRoom.userData.battleRealm.visible = true;
      if (this.sonTinhThuyTinhRoom?.mythicWorldGroup) this.sonTinhThuyTinhRoom.mythicWorldGroup.visible = true;
      if (this.exteriorVista?.group) this.exteriorVista.group.visible = false;
      if (this.truyenKieuRoom) this.truyenKieuRoom.visible = false;
      if (this.thanhGiongRoom) this.thanhGiongRoom.visible = false;
      if (this.sonTinhThuyTinhRoom) this.sonTinhThuyTinhRoom.visible = false;
      if (this.namQuocSonHaRoom) this.namQuocSonHaRoom.visible = false;
      if (this.anDuongVuongRoom) this.anDuongVuongRoom.visible = false;
      if (this.museumCrowd?.crowdGroup) this.museumCrowd.crowdGroup.visible = false;
      if (this.voNhatRoom) this.voNhatRoom.visible = false;
    } else if (scene === this.anDuongVuongScene) {
      this.anDuongVuongScene.background = new THREE.Color(0x031210);
      this.anDuongVuongScene.fog = new THREE.FogExp2(0x072a24, 0.0012);
      if (this.exteriorVista?.group) this.exteriorVista.group.visible = false;
      if (this.truyenKieuRoom) this.truyenKieuRoom.visible = false;
      if (this.thanhGiongRoom) this.thanhGiongRoom.visible = false;
      if (this.sonTinhThuyTinhRoom) this.sonTinhThuyTinhRoom.visible = false;
      if (this.namQuocSonHaRoom) this.namQuocSonHaRoom.visible = false;
      if (this.anDuongVuongRoom) this.anDuongVuongRoom.visible = false;
      if (this.museumCrowd?.crowdGroup) this.museumCrowd.crowdGroup.visible = false;
      if (this.voNhatRoom) this.voNhatRoom.visible = false;
    } else if (scene === this.voNhatScene) {
      this.voNhatScene.background = new THREE.Color(0x181008);
      this.voNhatScene.fog = new THREE.FogExp2(0x2a1a0d, 0.0018);
      if (this.exteriorVista?.group) this.exteriorVista.group.visible = false;
      if (this.truyenKieuRoom) this.truyenKieuRoom.visible = false;
      if (this.thanhGiongRoom) this.thanhGiongRoom.visible = false;
      if (this.sonTinhThuyTinhRoom) this.sonTinhThuyTinhRoom.visible = false;
      if (this.namQuocSonHaRoom) this.namQuocSonHaRoom.visible = false;
      if (this.anDuongVuongRoom) this.anDuongVuongRoom.visible = false;
      if (this.voNhatRoom) this.voNhatRoom.visible = false;
      if (this.museumCrowd?.crowdGroup) this.museumCrowd.crowdGroup.visible = false;
    } else {
      if (this.exteriorVista?.group) this.exteriorVista.group.visible = false;
      if (this.truyenKieuRoom) this.truyenKieuRoom.visible = false;
      if (this.thanhGiongRoom) this.thanhGiongRoom.visible = false;
      if (this.sonTinhThuyTinhRoom) this.sonTinhThuyTinhRoom.visible = false;
      if (this.namQuocSonHaRoom) this.namQuocSonHaRoom.visible = false;
      if (this.anDuongVuongRoom) this.anDuongVuongRoom.visible = false;
      if (this.museumCrowd?.crowdGroup) this.museumCrowd.crowdGroup.visible = false;
    }
    console.log(`%c[MULTI-SCENE ARCHITECTURE] Active Scene Swapped ➔ ${scene.name}`, "color: #39e58c; font-weight: bold; font-size: 14px;");
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

    // 0.1. GIAI ĐOẠN 6: HỆ THỐNG TRẢI NGHIỆM ĐA GIÁC QUAN (ÂM THANH 3D, THẺ THƠ SƠN MÀI, WEBXR TELEPORT)
    try {
      this.immersionSystem = createMuseumImmersionSystem({
        renderer: this.renderer,
        scene: this.scene,
        camera: this.camera,
        cameraRig: this.camera,
        walkableFloors: [this.atriumGroup]
      });
      window.__museumImmersion = this.immersionSystem;
      window.__spatialAudio = this.immersionSystem.spatialAudio;
      window.__loreGuide = this.immersionSystem.loreGuide;
      console.log("%c✓ MuseumImmersionSystem initialized (Spatial Audio, Lacquer Lore Cards & WebXR)!", "color: #eab308; font-weight: bold;");
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo MuseumImmersionSystem:", err);
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
      this.roomDecorator = this.truyenKieuRoom;
      if (!this.roomDecorator) {
        this.roomDecorator = buildTruyenKieuExhibition({
          roomCenter: new THREE.Vector3(-48.0, 10.0, 19.0)
        });
        this.scene.add(this.roomDecorator);
        this.truyenKieuRoom = this.roomDecorator;
      }
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi cấu hình RoomDecorator Truyện Kiều:", err);
      this.roomDecorator = null;
    }

    // 6. CẤU HÌNH HỆ THỐNG ÁNH SÁNG 3 ĐIỂM SIÊU NHẸ (3-POINT LIGHTING - ZERO VRAM OVERHEAD)
    try {
      this.initThreePointLighting();
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi cấu hình hệ thống ánh sáng 3 điểm:", err);
    }

    // 6.1. KHUNG CẢNH NGOẠI CẢNH KỲ VĨ TRÀNG AN / NINH BÌNH (Exterior Vista)
    try {
      this.exteriorVista = new ExteriorVista(this.atriumGroup, this.matLib);
      // Mở khóa ngoại cảnh Tràng An: Quần thể núi đá vôi & mặt hồ nước xung quanh bảo tàng
      if (this.exteriorVista?.group) {
        this.exteriorVista.group.visible = true;
      }
      this.trangAnLandscape = this.exteriorVista?.group;
      window.__exteriorVista = this.exteriorVista;
      window.__trangAnLandscape = this.exteriorVista?.group;
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi tạo ExteriorVista:", err);
    }

    // 6.2. ĐẠI SẢNH & HÀNH LANG HOÀNG CUNG ĐÔNG SƠN (GRAND LOBBY & CORRIDOR DECORATOR)
    try {
      this.lobbyDecorator = decorateMuseumGrandLobbyAndCorridors(this.atriumGroup, {
        lobbySize: 44,
        corridorLength: 32,
        corridorWidth: 8.4,
        wallHeight: 10.0,
        skylightApex: 32.0
      });
      window.__lobbyDecorator = this.lobbyDecorator;
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo Grand Lobby Decorator:", err);
    }

    // 7. Hạt linh khí & bụi vàng không gian (Defensive Bounds)
    try {
      this.proceduralVfx = new ProceduralVFX(this.atriumGroup);
      this.proceduralVfx.setVisible(false);
    } catch (err) {
      console.warn("[SELF-HEALING] Lỗi tạo ProceduralVFX:", err);
      this.proceduralVfx = { update: () => {}, setVisible: () => {} };
    }

    // 7.1. GIAI ĐOẠN 3: THẾ GIỚI TỰ SỰ TRUYỆN KIỀU (TIẾT THANH MINH TRONG TRUYENKIEUSCENE)
    try {
      this.kieuWorld = new KieuWorld(this.truyenKieuScene, this.matLib, this.camera);
      window.__kieuWorld = this.kieuWorld;
      if (this.kieuWorld && this.audioManager) {
        this.kieuWorld.setAudioManager(this.audioManager);
      }
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi tạo KieuWorld:", err);
      this.kieuWorld = null;
    }

    // 8. Post-processing Cinematic Look Dev (SSAO, Bloom, Exposure protection)
    try {
      this.postProcessing = null; // ĐÃ HỦY BỎ HOÀN TOÀN EFFECTCOMPOSER THEO LỆNH THANH LỌC
      const rdGroup = typeof this.roomDecorator?.getGroup === 'function'
        ? this.roomDecorator.getGroup()
        : (this.roomDecorator?.isObject3D ? this.roomDecorator : this.roomDecorator?.group);
      if (rdGroup) {
        fixFloorAndLightingRoom01(
          rdGroup,
          this.scene,
          this.renderer,
          null
        );
        redesignTruyenKieuWithHeroModel(rdGroup);
      }
    } catch (err) {
      console.warn("[SELF-HEALING] Lỗi thiết lập phòng 01:", err);
    }

    // 9. Navigation & Director HUD
    try {
      this.cameraManager = new CameraManager(this.camera, this.renderer.domElement);
      if (this.cameraManager && this.audioManager) {
        this.cameraManager.setAudioManager(this.audioManager);
      }
      this.hitboxManager = getMuseumHitboxManager(this.scene);
      if (this.cameraManager && this.hitboxManager) {
        this.cameraManager.setHitboxManager(this.hitboxManager);
      }

      // Thay thế toàn bộ thảm trong bảo tàng sang thảm trục thời gian (giữ nguyên kiến trúc & sàn)
      replaceAllMuseumCarpetsWithTimelinePattern(this.scene);
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo CameraManager:", err);
    }

    // 9.0. THẾ GIỚI TRUYỆN KIỀU 4 PHÂN CẢNH (MULTI-SCENE ARCHITECTURE TRONG TRUYENKIEUSCENE)
    try {
      window.__app = this;
      window.__truyenKieuStoryWorld = this.truyenKieuStoryWorld = new TruyenKieuStoryWorld(
        this.truyenKieuScene,
        this.camera,
        this.cameraManager,
        this.atriumGroup,
        {
          app: this,
          mainScene: this.mainScene,
          truyenKieuScene: this.truyenKieuScene,
          renderer: this.renderer
        }
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
          app: this,
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
      if (this.directorPanel && this.sonTinhThuyTinhRoom) {
        this.directorPanel.setSonTinhThuyTinhRoom?.(this.sonTinhThuyTinhRoom);
      }
      if (this.directorPanel && this.anDuongVuongRoom) {
        this.directorPanel.setAnDuongVuongRoom?.(this.anDuongVuongRoom);
      }
      if (this.directorPanel && this.voNhatRoom) {
        this.directorPanel.setVoNhatRoom?.(this.voNhatRoom);
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
        if (worldId === 'son_tinh' || worldId === 'son_tinh_thuy_tinh' || meta?.targetRealm === 'SON_TINH_THUY_TINH_REALM') {
          if (this.sonTinhThuyTinhRoom?.enterRealm) {
            this.sonTinhThuyTinhRoom.enterRealm();
            return true;
          }
        }
        if (worldId === 'an_duong_vuong' || meta?.targetRealm === 'AN_DUONG_VUONG_REALM') {
          if (this.anDuongVuongRoom?.enterRealm) {
            this.anDuongVuongRoom.enterRealm();
            return true;
          }
        }
        if (worldId === 'vo_nhat' || meta?.targetRealm === 'VO_NHAT_REALM') {
          if (this.voNhatRoom?.enterRealm) {
            this.voNhatRoom.enterRealm();
            return true;
          }
        }
        if (worldId === 'vo_nhat' || meta?.targetRealm === 'VO_NHAT_REALM') {
          if (this.voNhatRoom?.enterRealm) {
            this.voNhatRoom.enterRealm();
            return true;
          }
        }
        if (worldId === 'truyen_kieu') {
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
        if (worldId === 'son_tinh' || worldId === 'son_tinh_thuy_tinh' || meta?.targetRealm === 'SON_TINH_THUY_TINH_REALM') {
          if (this.sonTinhThuyTinhRoom?.enterRealm) {
            this.sonTinhThuyTinhRoom.enterRealm();
            return true;
          }
        }
        if (worldId === 'an_duong_vuong' || meta?.targetRealm === 'AN_DUONG_VUONG_REALM') {
          if (this.anDuongVuongRoom?.enterRealm) {
            this.anDuongVuongRoom.enterRealm();
            return true;
          }
        }
        if (worldId === 'truyen_kieu') {
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

      // Đăng ký Sách Cổ Phòng Truyện Kiều vào PortalInteraction kích hoạt trực tiếp enterRealm()
      if (this.truyenKieuRoom) {
        const kieuBook = this.truyenKieuRoom.teleportBook || this.truyenKieuRoom;
        if (kieuBook) {
          this.portalInteraction.registerInteractiveBook(kieuBook, () => {
            this.truyenKieuRoom.enterRealm?.();
          }, {
            id: 'truyen_kieu',
            title: 'TRUYỆN KIỀU – NGUYỄN DU',
            author: 'Đại thi hào Nguyễn Du (1765 – 1820)',
            genre: 'Truyện thơ Nôm (Văn học Trung đại)',
            quote: 'Đoạn trường tân thanh – Khúc ca bi tráng về tài mệnh tương đố và khát vọng tự do.',
            targetZoneId: 1,
            themeColor: 0xf472b6,
            portalReady: true
          });
        }
      }

      // Đăng ký Sách Cổ Phòng Sơn Tinh - Thủy Tinh vào PortalInteraction
      if (this.sonTinhThuyTinhRoom) {
        const stttBook = this.sonTinhThuyTinhRoom.teleportBook || this.sonTinhThuyTinhRoom;
        if (stttBook) {
          this.portalInteraction.registerInteractiveBook(stttBook, new THREE.Vector3(5000, 37.7, 5088.0), {
            id: 'son_tinh_thuy_tinh',
            title: 'SƠN TINH - THỦY TINH: ĐẠI CHIẾN PHONG MA',
            author: 'Kho tàng Thần thoại Dân gian Việt Nam',
            genre: 'Thần thoại Sử thi • Thời đại Hùng Vương thứ XVIII',
            quote: '"Nước dâng cao bao nhiêu, núi lại cao lên bấy nhiêu..."',
            themeColor: 0x00d8ff,
            targetRealm: 'SON_TINH_THUY_TINH_REALM',
            portalReady: true,
            onActivate: () => {
              this.sonTinhThuyTinhRoom.enterRealm?.();
            }
          });
        }
      }

      // Đăng ký Sách Cổ Phòng An Dương Vương & Cổ Loa Thành vào PortalInteraction
      if (this.anDuongVuongRoom) {
        const advBook = this.anDuongVuongRoom.teleportBook || this.anDuongVuongRoom;
        if (advBook) {
          this.portalInteraction.registerInteractiveBook(advBook, new THREE.Vector3(260, 424.0, -418.0), {
            id: 'an_duong_vuong',
            title: 'AN DƯƠNG VƯƠNG & CỔ LOA THÀNH',
            author: 'Truyền thuyết Cổ Loa • Dân gian Lạc Việt',
            genre: 'Truyền thuyết Lịch sử & Dựng Nước',
            quote: 'Nỏ thần vô ý trao tay giặc – Bi kịch Cổ Loa vang vọng ngàn thu...',
            themeColor: 0x10b981,
            targetRealm: 'AN_DUONG_VUONG_REALM',
            portalReady: true,
            onActivate: () => {
              this.anDuongVuongRoom.enterRealm?.();
            }
          });
        }
      }

      // Đăng ký Sách Cổ Phòng Vợ Nhặt vào PortalInteraction
      if (this.voNhatRoom) {
        const vnBook = this.voNhatRoom.teleportBook || this.voNhatRoom;
        if (vnBook) {
          this.portalInteraction.registerInteractiveBook(vnBook, new THREE.Vector3(-260, 424.0, -418.0), {
            id: 'vo_nhat',
            title: 'VỢ NHẶT (KIM LÂN)',
            author: 'Kim Lân (1920 – 2007)',
            genre: 'Văn học Hiện thực Cách mạng • Năm 1945',
            quote: 'Trong hoàn cảnh khốn cùng, người ta vẫn khao khát sống và thương yêu nhau...',
            themeColor: 0xd35400,
            targetRealm: 'VO_NHAT_REALM',
            portalReady: true,
            onActivate: () => {
              this.voNhatRoom.enterRealm?.();
            }
          });
        }
      }

      // Kết nối Context toàn diện cho Phòng Truyện Kiều (Cõi Thơ Đoạn Trường Tân Thanh)
      if (this.truyenKieuRoom?.setupContext) {
        this.truyenKieuRoom.setupContext({
          scene: this.scene,
          poeticScene: this.truyenKieuScene,
          camera: this.camera,
          renderer: this.renderer,
          cameraManager: this.cameraManager,
          portalInteraction: this.portalInteraction,
          audioManager: this.audioManager,
          atriumGroup: this.atriumGroup
        });
      }

      // Kết nối Context toàn diện cho Phòng Sơn Tinh - Thủy Tinh (Cõi Đại Chiến Gojo vs Sukuna)
      if (this.sonTinhThuyTinhRoom?.setupContext) {
        this.sonTinhThuyTinhRoom.setupContext({
          scene: this.scene,
          battleScene: this.sonTinhThuyTinhScene,
          camera: this.camera,
          renderer: this.renderer,
          cameraManager: this.cameraManager,
          portalInteraction: this.portalInteraction,
          audioManager: this.audioManager,
          atriumGroup: this.atriumGroup
        });
      }

      // Kết nối Context toàn diện cho Phòng An Dương Vương (Cõi Cổ Loa Thành & Biển Đông)
      if (this.anDuongVuongRoom?.setupContext) {
        this.anDuongVuongRoom.setupContext({
          scene: this.scene,
          realmScene: this.anDuongVuongScene,
          camera: this.camera,
          renderer: this.renderer,
          cameraManager: this.cameraManager,
          portalInteraction: this.portalInteraction,
          audioManager: this.audioManager,
          atriumGroup: this.atriumGroup
        });
      }

      // Kết nối Context toàn diện cho Phòng Vợ Nhặt (Cõi Xóm Ngụ Cư 1945)
      if (this.voNhatRoom?.setupContext) {
        this.voNhatRoom.setupContext({
          scene: this.scene,
          realmScene: this.voNhatScene,
          camera: this.camera,
          renderer: this.renderer,
          cameraManager: this.cameraManager,
          portalInteraction: this.portalInteraction,
          audioManager: this.audioManager,
          atriumGroup: this.atriumGroup
        });
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
      const scenesToCull = [this.mainScene, this.truyenKieuScene, this.sonTinhThuyTinhScene, this.anDuongVuongScene, this.voNhatScene];
      scenesToCull.forEach((targetScene) => {
        if (!targetScene) return;
        targetScene.traverse((child) => {
          if (child.isLight) {
            child.castShadow = false; // TRIỆT TIÊU TOÀN BỘ ĐÈN CAST SHADOW
          }
          if (child.isMesh) {
            child.castShadow = false; // TRIỆT TIÊU BÓNG ĐỔ TRÊN TOÀN BỘ MESH
            child.receiveShadow = false;
            child.frustumCulled = true; // KÍCH HOẠT FRUSTUM CULLING TOÀN DIỆN
            child.renderOrder = 0;
            if (child.geometry) {
              if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
              if (!child.geometry.boundingSphere) child.geometry.computeBoundingSphere();
            }
            if (child.material) {
              const applyMatOpt = (mat) => {
                if (!mat) return;
                mat.side = THREE.DoubleSide; // Ép render 2 mặt
                // Chỉ ép depthWrite cho vật liệu đặc, giữ nguyên depthWrite = false cho vật liệu trong suốt (như tia sáng, bụi vàng)
                if (!mat.transparent) {
                  mat.depthWrite = true;
                }
                mat.depthTest = true;
                mat.needsUpdate = true;
              };
              if (Array.isArray(child.material)) {
                child.material.forEach(applyMatOpt);
              } else {
                applyMatOpt(child.material);
              }
            }
            overriddenCount++;
          }
        });
      });
      console.log(`%c[PERFORMANCE & RENDER] Đã bật Frustum Culling (frustumCulled=true) và tối ưu hóa ${overriddenCount} meshes trên toàn bộ các Scene!`, "color: #39e58c; font-weight: bold;");
    } catch (e) {
      console.warn("[SELF-HEALING] Lỗi traverse ép kiểu toàn cục:", e);
    }

    // 12. TIÊU DIỆT LIGHT HELPER & BÓNG ĐÈN ẢO TRONG TOÀN BỘ SCENE (Senior Lighting Director)
    this.cleanupLightHelpers();

    // 13. KHỞI TẠO ĐẠO DIỄN AUTO-TOUR BẢO TÀNG (Phím T)
    try {
      this.autoTour = new MuseumAutoTourDirector(this.camera, {
        audioDirector: this.immersionSystem?.spatialAudio,
        loreGuide: this.immersionSystem?.loreGuide,
        onTourStateChange: (isTouring) => {
          if (this.cameraManager) {
            if (this.cameraManager.controls) {
              this.cameraManager.controls.enabled = !isTouring;
            }
            if (this.cameraManager.activeController) {
              this.cameraManager.activeController.enabled = !isTouring;
            }
          }
        }
      });
      window.__autoTour = this.autoTour;
      console.log("%c✓ MuseumAutoTourDirector initialized! Press [T] to toggle auto-tour.", "color: #facc15; font-weight: bold;");
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo MuseumAutoTourDirector:", err);
      this.autoTour = null;
    }

    // 13.1. KHỞI CHẠY ĐỘNG CƠ TÁI THIẾT KẾ TOÀN DIỆN BẢO TÀNG (BLENDER + WEB GLB + 12 SKILLS)
    try {
      this.totalOverhaulEngine = new MuseumTotalOverhaulEngine(this);
      this.totalOverhaulEngine.initialize();
      window.__totalOverhaulEngine = this.totalOverhaulEngine;
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo MuseumTotalOverhaulEngine:", err);
    }

    // 13.2. KHỞI CHẠY ĐỒNG BỘ 16 KỸ NĂNG TỐI THƯỢNG (ULTIMATE 16-SKILLS ORCHESTRATOR)
    try {
      applyAll16SkillsToMuseum({
        scene: this.scene,
        camera: this.camera,
        renderer: this.renderer,
        lobbyGroup: this.atriumGroup,
        roomsMap: {
          truyenKieu: this.truyenKieuRoom,
          anDuongVuong: this.anDuongVuongRoom,
          voNhat: this.voNhatRoom
        },
        sonTinhMythicRealmGroup: this.sonTinhThuyTinhRoom?.mythicWorldGroup || this.sonTinhThuyTinhRoom?.battleRealm || this.sonTinhThuyTinhRoom?.userData?.battleRealm || null,
        hitboxManager: this.hitboxManager,
        cameraManager: this.cameraManager,
        loreGuide: this.immersionSystem?.loreGuide,
        audioDirector: this.immersionSystem?.spatialAudio,
        walkableFloors: [this.atriumGroup],
        onTourStateChange: (isTouring) => {
          if (this.cameraManager) {
            if (this.cameraManager.controls) this.cameraManager.controls.enabled = !isTouring;
            if (this.cameraManager.activeController) this.cameraManager.activeController.enabled = !isTouring;
          }
        }
      }).then((res) => {
        this.ultimate16Skills = res;
        window.__ultimate16Skills = res;
        replaceAllMuseumCarpetsWithTimelinePattern(this.scene);
      }).catch((err) => {
        console.error("[SELF-HEALING] Lỗi khởi tạo MuseumUltimate16SkillsUpgrade:", err);
      });
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi gọi applyAll16SkillsToMuseum:", err);
    }

    console.log("%c✓ Đã kích hoạt Phòng Mẫu 01 (Sách Ma Thuật & Cổng Dịch Chuyển Truyện Kiều) thành công!", "color: #39e58c; font-weight: bold;");

    // 14. TỰ ĐỘNG THEO DÕI FPS >= 60 KHI KHỞI ĐỘNG BẢO TÀNG (5 GIÂY LIÊN TỤC)
    setTimeout(() => {
      if (this.performanceOptimizer) {
        this.performanceOptimizer.startBenchmark('KHỞI ĐỘNG BẢO TÀNG');
      }
    }, 700);
  }


  /**
   * CẤU HÌNH HỆ THỐNG ÁNH SÁNG 3 ĐIỂM SIÊU NHẸ (ZERO VRAM OVERHEAD)
   * Đúng 3 nguồn sáng toàn cục không đổ bóng (castShadow = false)
   */
  initThreePointLighting() {
    // 1. Quét và loại bỏ sạch sẽ mọi PointLight/SpotLight nhỏ lẻ gây lag
    const lightsToRemove = [];
    this.atriumGroup.traverse((child) => {
      if (child.isPointLight || child.isSpotLight) {
        lightsToRemove.push(child);
      }
    });
    lightsToRemove.forEach((light) => {
      if (light.parent) light.parent.remove(light);
    });

    // 2. Nhóm ánh sáng 3 điểm toàn cục
    this.lightingGroup = new THREE.Group();
    this.lightingGroup.name = "Global_ThreePoint_Lighting_Group";

    // 1. HemisphereLight(0xfff6ea, 0x524235, 0.98):
    // Vòm trần sáng ấm, sàn và gầm cầu thang chữ Y đón ánh phản xạ gỗ mun/đất nung Indochine ấm áp, triệt tiêu góc tối đen
    this.hemiLight = new THREE.HemisphereLight(0xfff6ea, 0x524235, 0.98);
    this.hemiLight.name = "Global_HemisphereLight";
    this.hemiLight.position.set(0, 60, 0);
    this.lightingGroup.add(this.hemiLight);

    // 2. Key DirectionalLight(0xfff1e0, 0.78) đặt ở góc nghiêng (30, 60, 40):
    // Key Light rọi nắng ấm qua giếng trời, tạo độ tương phản thị giác sắc nét cho vòm cột và đại sảnh
    this.keyLight = new THREE.DirectionalLight(0xfff1e0, 0.78);
    this.keyLight.name = "Key_DirectionalLight";
    this.keyLight.position.set(30, 60, 40);
    this.keyLight.castShadow = false; // Tuyệt đối không đổ bóng
    this.lightingGroup.add(this.keyLight);

    // 3. Fill DirectionalLight(0xded2be, 0.48) chiếu ngược từ (-32, 28, -36):
    // Fill Light bù sáng tông ngà ấm, chiếu sáng dịu dàng các góc khuất cầu thang, hành lang và hốc vòm
    this.fillLight = new THREE.DirectionalLight(0xded2be, 0.48);
    this.fillLight.name = "Fill_DirectionalLight";
    this.fillLight.position.set(-32, 28, -36);
    this.fillLight.castShadow = false; // Tuyệt đối không đổ bóng
    this.lightingGroup.add(this.fillLight);

    this.atriumGroup.add(this.lightingGroup);

    // 4. THÊM CHIỀU SÂU KHÔNG KHÍ BẰNG FOG HOÀNG HÔN ẤM ÁP (TINH TẾ & KHÔNG CHE KHUẤT TRÀNG AN)
    this.mainScene.background = new THREE.Color(0xdca878);
    this.scene.background = this.mainScene.background;
    this.mainScene.fog = new THREE.FogExp2(0xdca878, 0.00075);
    this.scene.fog = this.mainScene.fog;

    // Giữ đối tượng artDirector tương thích với PerformanceOptimizer
    this.artDirector = {
      group: this.lightingGroup,
      sunLight: this.keyLight,
      update: () => {}
    };

    console.log("%c✓ [3-POINT LIGHTING & FOG] Cấu hình 3 nguồn sáng Indochine ấm áp & FogExp2(0xdca878, 0.00075) hoàn tất!", "color: #39e58c; font-weight: bold;");
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
   * KÍCH HOẠT FRUSTUM CULLING TOÀN DIỆN CHO MỌI MESH TRONG MỘT NHÓM/MÔ HÌNH
   */
  enforceFrustumCulling(root) {
    if (!root) return;
    root.traverse((child) => {
      if (child.isMesh) {
        child.frustumCulled = true;
        child.castShadow = false;
        child.receiveShadow = false;
        if (child.geometry) {
          if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
          if (!child.geometry.boundingSphere) child.geometry.computeBoundingSphere();
        }
      }
    });
  }

  /**
   * 1. HỆ THỐNG XỬ LÝ VA CHẠM THỰC THỂ (CLEANED PERIMETER WALLS ONLY)
   * Chỉ đưa vào mảng collisionObjects: Các bức tường cố định bao quanh không gian.
   * CẤM TUYỆT ĐỐI đưa cây đào, bình gốm, đèn lồng, bàn ghế, bục sách vào danh sách va chạm.
   */
  initCollisionSystem() {
    this.collisionObjects = [];
    this.stairObjects = [];

    // XÓA HẾT MỌI HITBOX CŨ VÀ TÁI THIẾT LẬP TOÀN BỘ THEO KỸ NĂNG hitbox-collision-architect
    if (this.hitboxManager) {
      this.hitboxManager.rebuildAllMuseumHitboxes();
      this.collisionObjects = this.hitboxManager.solidBoxes.map(s => s.box);
    }

    // Chuyển danh sách tường chuẩn xác cho CameraController
    this.cameraManager?.setCollisionObjects(this.collisionObjects, this.stairObjects);

    console.log(`%c[COLLISION SYSTEM] Đã làm mới 100% hitbox bảo tàng: ${this.collisionObjects.length} vật cản chuẩn hóa O(1).`, "color: #39e58c; font-weight: bold;");
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
    this._kieuRoomPos = this._kieuRoomPos || new THREE.Vector3(-48, 10, 19);
    const distToKieuRoom = this.camera.position.distanceTo(this._kieuRoomPos);
    const isSpecialRoomActive = distToKieuRoom < 24.0 || (this.truyenKieuStoryWorld?.isInsideWorld ?? false);

    if (this.postProcessing) {
      // TẮT MẶC ĐỊNH POST-PROCESSING CHO GTX 1050: Không kích hoạt EffectComposer ngốn VRAM
      this.postProcessing.setEnabled(false);
    }

    // 3. Phòng 01 (RoomDecorator) tự động ngắt vẽ theo Frustum Culling
    if (this.roomDecorator) {
      const room1Group = typeof this.roomDecorator.getGroup === 'function'
        ? this.roomDecorator.getGroup()
        : (this.roomDecorator.isObject3D ? this.roomDecorator : this.roomDecorator.group);
      if (room1Group) {
        room1Group.visible = true; // Frustum Culling tự động loại bỏ các mesh ngoài FOV
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
        this.renderer?.setPixelRatio(0.85); // Giữ cố định 0.85 khi resize cho GTX 1050
      } catch (e) {
        console.warn("[SELF-HEALING] Lỗi resize handler:", e);
      }
    });
  }

  animate = (time) => {
    requestAnimationFrame(this.animate);
    
    // CỐ ĐỊNH CƠ CHẾ RENDER LƯỜI / THẬN TRỌNG (ON-DEMAND / CAUTIOUS RAF):
    // 1. Tự động ngắt render khi tab trình duyệt đang ẩn (tiết kiệm 100% CPU/GPU, triệt tiêu rò rỉ bộ nhớ)
    if (typeof document !== 'undefined' && document.hidden) return;

    // 2. Khóa cứng thời gian tối thiểu 16ms/frame (Max 60 FPS trên PC, mở khóa 72+ FPS khi ở WebXR VR)
    const isVR = this.renderer?.xr?.isPresenting;
    if (!isVR) {
      const now = performance.now();
      if (this.lastFrameTime === undefined) this.lastFrameTime = now;
      const elapsedMs = now - this.lastFrameTime;
      if (elapsedMs < 16.0) return;
      if (elapsedMs > 250.0) {
        this.lastFrameTime = now; // Khôi phục mốc thời gian mượt mà, chống giật khựng/nhảy cóc delta sau khi chuyển tab
      } else {
        this.lastFrameTime = now - (elapsedMs % 16.0);
      }
    }
    
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

      // Cập nhật hệ thống trải nghiệm đa giác quan (WebXR teleport & Spatial Audio)
      this.immersionSystem?.update?.();

      // Cập nhật Đạo diễn Auto-Tour tự động tham quan bảo tàng
      this.autoTour?.update(performance.now());

      // Cập nhật Động cơ Tái thiết kế toàn diện (hiệu ứng hạt linh khí & bệ hoa sen)
      this.totalOverhaulEngine?.update(elapsedTime);

      if (this.renderer?.xr && !this._vrSessionBound) {
        this._vrSessionBound = true;
        this.renderer.xr.addEventListener('sessionstart', () => {
          this.renderer.setAnimationLoop(this.animate);
        });
        this.renderer.xr.addEventListener('sessionend', () => {
          this.renderer.setAnimationLoop(null);
          requestAnimationFrame(this.animate);
        });
      }

      // Cập nhật hệ thống đám đông bóng đen (Museum Crowd Simulation)
      this.museumCrowd?.update(delta, elapsedTime, this.camera);

      // MULTI-SCENE ARCHITECTURE: CHỈ CẬP NHẬT CÁC HỆ THỐNG CỦA SCENE ĐANG ACTIVE
      if (this.activeScene === this.mainScene) {
        // Đảm bảo mở khóa ngoại cảnh Tràng An luôn hiển thị và hoạt ảnh mây trôi được cập nhật
        if (this.exteriorVista?.group && !this.exteriorVista.group.visible) {
          this.exteriorVista.group.visible = true;
        }
        this.exteriorVista?.update(delta, elapsedTime);
        if (this.truyenKieuStoryWorld?.worldGroup && this.truyenKieuStoryWorld.worldGroup.visible) {
          this.truyenKieuStoryWorld.worldGroup.visible = false;
        }
        if (this.kieuWorld?.group && this.kieuWorld.group.visible) {
          this.kieuWorld.group.visible = false;
        }

        updateProceduralLighting(elapsedTime);
        this.portalInteraction?.update(delta, elapsedTime);
        this.updateRoomCullingAndLayers();
        this.roomGenerator?.update(delta, elapsedTime, this.camera);
        if (this.truyenKieuRoom?.update) {
          this.truyenKieuRoom.update(delta, elapsedTime, this.camera);
        } else if (this.roomDecorator?.update) {
          this.roomDecorator.update(delta, elapsedTime, this.camera);
        }
        this.thanhGiongRoom?.update?.(delta, elapsedTime, this.camera);
        this.sonTinhThuyTinhRoom?.update?.(delta, elapsedTime, this.camera);
        this.namQuocSonHaRoom?.update?.(delta, elapsedTime, this.camera);
        this.anDuongVuongRoom?.update?.(delta, elapsedTime, this.camera);
        this.voNhatRoom?.update?.(delta, elapsedTime, this.camera);
        this.lobbyDecorator?.updateLobby?.(elapsedTime, delta);
      } else if (this.activeScene === this.truyenKieuScene) {
        if (this.truyenKieuStoryWorld?.worldGroup && !this.truyenKieuStoryWorld.worldGroup.visible) {
          this.truyenKieuStoryWorld.worldGroup.visible = true;
        }
        this.truyenKieuRoom?.updateRealm?.(delta, elapsedTime, this.camera);
        this.truyenKieuStoryWorld?.update(delta, elapsedTime);
        this.kieuWorld?.update?.(delta, elapsedTime);
      } else if (this.activeScene === this.sonTinhThuyTinhScene) {
        this.sonTinhThuyTinhRoom?.updateRealm?.(delta, elapsedTime, this.camera);
      } else if (this.activeScene === this.anDuongVuongScene) {
        this.anDuongVuongRoom?.updateRealm?.(delta, elapsedTime, this.camera);
      } else if (this.activeScene === this.voNhatScene) {
        this.voNhatRoom?.updateRealm?.(delta, elapsedTime, this.camera);
      }

      this.performanceOptimizer?.update(delta);
      this.worldManager?.update(delta, elapsedTime);
      if (this.ultimate16Skills?.updateAll) {
        this.ultimate16Skills.updateAll(performance.now());
      }

      // CƠ CHẾ HOÁN ĐỔI SCENE (SCENE SWAPPING):
      // CHỈ render scene đang active (this.activeScene) để triệt tiêu Draw Calls & giải phóng VRAM
      if (this.renderer && this.activeScene && this.camera) {
        this.renderer.render(this.activeScene, this.camera);
      }
    } catch (err) {
      console.error("[SELF-HEALING LOOP] Lỗi render loop, phục hồi trực tiếp:", err);
      if (this.renderer && this.activeScene && this.camera) {
        this.renderer.render(this.activeScene, this.camera);
      }
    }
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new LiteratureCathedralApp();
});
