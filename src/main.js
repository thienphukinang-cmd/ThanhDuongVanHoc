import * as THREE from 'three';
import { playBookSuckInCutscene } from './modules/bookVortexCutscene.js';import { MaterialLibrary, updateProceduralLighting } from './modules/proceduralMaterials.js';
import { ProceduralArchitecture } from './modules/proceduralArchitecture.js';
import { ModelCreator } from './modules/modelCreator.js';
import { BifurcatedStaircase } from './modules/bifurcatedStaircase.js';
import { RoomGenerator } from './modules/RoomGenerator.js';
import { PortalInteraction } from './modules/PortalInteraction.js';
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
import { buildTatDenExhibition } from './modules/tatDenRoomDecorator.js';
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
        antialias: false,
        powerPreference: 'high-performance',
        stencil: false,
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      const initialDpr = Math.min(window.devicePixelRatio || 1, 0.85);
      this.renderer.setPixelRatio(initialDpr);

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

    // 6. Scene Thế Giới Tắt Đèn Độc Lập Hoàn Toàn (Cõi Làng Đông Xá Đêm Sưu Thuế)
    this.tatDenScene = new THREE.Scene();
    this.tatDenScene.name = "TatDen_Universe";
    this.tatDenScene.background = new THREE.Color(0x040407);
    this.tatDenScene.fog = new THREE.FogExp2(0x040407, 0.0135);
    window.__tatDenScene = this.tatDenScene;

    // 7. Scene Thế Giới Nam Quốc Sơn Hà Độc Lập (Cõi Đêm Sông Như Nguyệt)
    this.namQuocSonHaScene = new THREE.Scene();
    this.namQuocSonHaScene.name = "NamQuocSonHa_Universe";
    this.namQuocSonHaScene.background = new THREE.Color(0x060d1c);
    this.namQuocSonHaScene.fog = new THREE.FogExp2(0x0b1528, 0.0115);
    window.__namQuocSonHaScene = this.namQuocSonHaScene;

    // 8. Scene Thế Giới Thánh Gióng Độc Lập (Chiến Trường Giặc Ân & Đỉnh Núi Sóc Sơn)
    this.thanhGiongScene = new THREE.Scene();
    this.thanhGiongScene.name = "ThanhGiong_Universe";
    this.thanhGiongScene.background = new THREE.Color(0x140b08);
    this.thanhGiongScene.fog = new THREE.FogExp2(0x28120a, 0.0085);
    window.__thanhGiongScene = this.thanhGiongScene;

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
      mainScene: this.scene,
      realmScene: this.thanhGiongScene
    });
    this.scene.add(thanhGiongRoom);
    this.thanhGiongRoom = thanhGiongRoom;
    window.__thanhGiongRoom = thanhGiongRoom;

    const sonTinhThuyTinhRoom = setupSonTinhThuyTinhRoom(this.scene, {
      roomCenter: new THREE.Vector3(-48.0, 0.0, -19.0), // Khớp chính xác với Tầng 1 (Y = 0.0m) Cánh Tây - Bắc theo LITERATURE_REGISTRY
      battleScene: this.sonTinhThuyTinhScene
    });
    if (sonTinhThuyTinhRoom.parent !== this.scene) {
      this.scene.add(sonTinhThuyTinhRoom);
    }
    this.sonTinhThuyTinhRoom = sonTinhThuyTinhRoom;

    const namQuocSonHaRoom = buildNamQuocSonHaExhibition({
      roomCenter: new THREE.Vector3(-48.0, 10.0, -19.0), // Khớp chính xác với Tầng 2 (Y = 10.0m) Cánh Tây - Bắc theo LITERATURE_REGISTRY
      mainScene: this.scene,
      realmScene: this.namQuocSonHaScene
    });
    this.scene.add(namQuocSonHaRoom);
    this.namQuocSonHaRoom = namQuocSonHaRoom;
    window.__namQuocSonHaRoom = namQuocSonHaRoom;

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

    const tatDenRoom = buildTatDenExhibition({
      roomCenter: new THREE.Vector3(-48.0, 20.0, -19.0),
      mainScene: this.scene,
      realmScene: this.tatDenScene
    });
    this.scene.add(tatDenRoom);
    this.tatDenRoom = tatDenRoom;
    window.__tatDenRoom = tatDenRoom;

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

  _getCachedSceneStyle(key, bgHex, fogHex, fogDensity) {
    this._sceneStyles = this._sceneStyles || new Map();
    let entry = this._sceneStyles.get(key);
    if (!entry) {
      entry = {
        background: new THREE.Color(bgHex),
        fog: new THREE.FogExp2(fogHex, fogDensity)
      };
      this._sceneStyles.set(key, entry);
    }
    return entry;
  }

  /**
   * CƠ CHẾ HOÁN ĐỔI SCENE (SCENE SWAPPING):
   * Chuyển đổi giữa Sảnh Chính và các Thế Giới Tác Phẩm trong vòng lặp render
   */
  setActiveScene(scene) {
    if (!scene) return;
    scene.visible = true; // Bảo đảm scene đích luôn visible (khắc phục lỗi mainScene.visible=false khi thoát cõi khác)
    if (this.activeScene === scene) return;
    this.activeScene = scene;
    window.__activeScene = scene;
    if (scene) scene.visible = true;

    if (scene === this.mainScene) {
      const style = this._getCachedSceneStyle('main', 0xdca878, 0xdca878, 0.00075);
      this.mainScene.background = style.background;
      this.mainScene.fog = style.fog;
      if (this.exteriorVista?.group) this.exteriorVista.group.visible = true;
      if (this.truyenKieuStoryWorld?.worldGroup) this.truyenKieuStoryWorld.worldGroup.visible = false;
      if (this.kieuWorld?.group) this.kieuWorld.group.visible = false;
      if (this.truyenKieuRoom) this.truyenKieuRoom.visible = true;
      if (this.thanhGiongRoom) this.thanhGiongRoom.visible = true;
      if (this.sonTinhThuyTinhRoom) this.sonTinhThuyTinhRoom.visible = true;
      if (this.namQuocSonHaRoom) this.namQuocSonHaRoom.visible = true;
      if (this.anDuongVuongRoom) this.anDuongVuongRoom.visible = true;
      if (this.voNhatRoom) this.voNhatRoom.visible = true;
      if (this.tatDenRoom) this.tatDenRoom.visible = true;
      if (this.museumCrowd?.crowdGroup) this.museumCrowd.crowdGroup.visible = true;
      this._lastCullCamPos?.set(Infinity, Infinity, Infinity);
    } else if (scene === this.truyenKieuScene) {
      if (this.kieuWorld) this.kieuWorld.setVisible?.(false);
      if (this.truyenKieuStoryWorld?.worldGroup) this.truyenKieuStoryWorld.worldGroup.visible = false;
      const style = this._getCachedSceneStyle('truyenKieu', 0x090314, 0x160729, 0.0038);
      this.truyenKieuScene.background = style.background;
      this.truyenKieuScene.fog = style.fog;
      if (this.exteriorVista?.group) this.exteriorVista.group.visible = false;
      if (this.truyenKieuRoom) this.truyenKieuRoom.visible = false;
      if (this.thanhGiongRoom) this.thanhGiongRoom.visible = false;
      if (this.sonTinhThuyTinhRoom) this.sonTinhThuyTinhRoom.visible = false;
      if (this.namQuocSonHaRoom) this.namQuocSonHaRoom.visible = false;
      if (this.anDuongVuongRoom) this.anDuongVuongRoom.visible = false;
      if (this.voNhatRoom) this.voNhatRoom.visible = false;
      if (this.tatDenRoom) this.tatDenRoom.visible = false;
      if (this.museumCrowd?.crowdGroup) this.museumCrowd.crowdGroup.visible = false;
    } else if (scene === this.sonTinhThuyTinhScene) {
      const style = this._getCachedSceneStyle('sonTinh', 0x050b14, 0x0c1e33, 0.002);
      this.sonTinhThuyTinhScene.background = style.background;
      this.sonTinhThuyTinhScene.fog = style.fog;
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
      if (this.tatDenRoom) this.tatDenRoom.visible = false;
    } else if (scene === this.anDuongVuongScene) {
      const style = this._getCachedSceneStyle('anDuongVuong', 0x031210, 0x072a24, 0.0012);
      this.anDuongVuongScene.background = style.background;
      this.anDuongVuongScene.fog = style.fog;
      if (this.exteriorVista?.group) this.exteriorVista.group.visible = false;
      if (this.truyenKieuRoom) this.truyenKieuRoom.visible = false;
      if (this.thanhGiongRoom) this.thanhGiongRoom.visible = false;
      if (this.sonTinhThuyTinhRoom) this.sonTinhThuyTinhRoom.visible = false;
      if (this.namQuocSonHaRoom) this.namQuocSonHaRoom.visible = false;
      if (this.anDuongVuongRoom) this.anDuongVuongRoom.visible = false;
      if (this.museumCrowd?.crowdGroup) this.museumCrowd.crowdGroup.visible = false;
      if (this.voNhatRoom) this.voNhatRoom.visible = false;
      if (this.tatDenRoom) this.tatDenRoom.visible = false;
    } else if (scene === this.voNhatScene) {
      const style = this._getCachedSceneStyle('voNhat', 0x181008, 0x2a1a0d, 0.0018);
      this.voNhatScene.background = style.background;
      this.voNhatScene.fog = style.fog;
      if (this.exteriorVista?.group) this.exteriorVista.group.visible = false;
      if (this.truyenKieuRoom) this.truyenKieuRoom.visible = false;
      if (this.thanhGiongRoom) this.thanhGiongRoom.visible = false;
      if (this.sonTinhThuyTinhRoom) this.sonTinhThuyTinhRoom.visible = false;
      if (this.namQuocSonHaRoom) this.namQuocSonHaRoom.visible = false;
      if (this.anDuongVuongRoom) this.anDuongVuongRoom.visible = false;
      if (this.voNhatRoom) this.voNhatRoom.visible = false;
      if (this.tatDenRoom) this.tatDenRoom.visible = false;
      if (this.museumCrowd?.crowdGroup) this.museumCrowd.crowdGroup.visible = false;
    } else if (scene === this.tatDenScene) {
      const style = this._getCachedSceneStyle('tatDen', 0x040407, 0x040407, 0.0135);
      this.tatDenScene.background = style.background;
      this.tatDenScene.fog = style.fog;
      if (this.exteriorVista?.group) this.exteriorVista.group.visible = false;
      if (this.truyenKieuRoom) this.truyenKieuRoom.visible = false;
      if (this.thanhGiongRoom) this.thanhGiongRoom.visible = false;
      if (this.sonTinhThuyTinhRoom) this.sonTinhThuyTinhRoom.visible = false;
      if (this.namQuocSonHaRoom) this.namQuocSonHaRoom.visible = false;
      if (this.anDuongVuongRoom) this.anDuongVuongRoom.visible = false;
      if (this.voNhatRoom) this.voNhatRoom.visible = false;
      if (this.tatDenRoom) this.tatDenRoom.visible = false;
      if (this.museumCrowd?.crowdGroup) this.museumCrowd.crowdGroup.visible = false;
    } else if (scene === this.namQuocSonHaScene) {
      const style = this._getCachedSceneStyle('namQuocSonHa', 0x060d1c, 0x0b1528, 0.0115);
      this.namQuocSonHaScene.background = style.background;
      this.namQuocSonHaScene.fog = style.fog;
      if (this.exteriorVista?.group) this.exteriorVista.group.visible = false;
      if (this.truyenKieuRoom) this.truyenKieuRoom.visible = false;
      if (this.thanhGiongRoom) this.thanhGiongRoom.visible = false;
      if (this.sonTinhThuyTinhRoom) this.sonTinhThuyTinhRoom.visible = false;
      if (this.namQuocSonHaRoom) this.namQuocSonHaRoom.visible = false;
      if (this.anDuongVuongRoom) this.anDuongVuongRoom.visible = false;
      if (this.voNhatRoom) this.voNhatRoom.visible = false;
      if (this.tatDenRoom) this.tatDenRoom.visible = false;
      if (this.museumCrowd?.crowdGroup) this.museumCrowd.crowdGroup.visible = false;
    } else if (scene === this.thanhGiongScene) {
      const style = this._getCachedSceneStyle('thanhGiong', 0x140b08, 0x28120a, 0.0085);
      this.thanhGiongScene.background = style.background;
      this.thanhGiongScene.fog = style.fog;
      if (this.exteriorVista?.group) this.exteriorVista.group.visible = false;
      if (this.truyenKieuRoom) this.truyenKieuRoom.visible = false;
      if (this.thanhGiongRoom) this.thanhGiongRoom.visible = false;
      if (this.sonTinhThuyTinhRoom) this.sonTinhThuyTinhRoom.visible = false;
      if (this.namQuocSonHaRoom) this.namQuocSonHaRoom.visible = false;
      if (this.anDuongVuongRoom) this.anDuongVuongRoom.visible = false;
      if (this.voNhatRoom) this.voNhatRoom.visible = false;
      if (this.tatDenRoom) this.tatDenRoom.visible = false;
      if (this.museumCrowd?.crowdGroup) this.museumCrowd.crowdGroup.visible = false;
    } else {
      if (this.exteriorVista?.group) this.exteriorVista.group.visible = false;
      if (this.truyenKieuRoom) this.truyenKieuRoom.visible = false;
      if (this.thanhGiongRoom) this.thanhGiongRoom.visible = false;
      if (this.sonTinhThuyTinhRoom) this.sonTinhThuyTinhRoom.visible = false;
      if (this.namQuocSonHaRoom) this.namQuocSonHaRoom.visible = false;
      if (this.anDuongVuongRoom) this.anDuongVuongRoom.visible = false;
      if (this.voNhatRoom) this.voNhatRoom.visible = false;
      if (this.tatDenRoom) this.tatDenRoom.visible = false;
      if (this.museumCrowd?.crowdGroup) this.museumCrowd.crowdGroup.visible = false;
    }

    if (scene !== this.mainScene && this.renderer && this.camera) {
      try {
        this.renderer.compile(scene, this.camera);
      } catch (e) {}
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
        walkableFloors: [this.atriumGroup, this.namQuocSonHaRoom, this.thanhGiongRoom].filter(Boolean)
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

    // 7.1. GIAI ĐOẠN 3: THẾ GIỚI TỰ SỰ TRUYỆN KIỀU (LAZY-INIT KIEUWORLD CHỈ KHI DÙNG FALLBACK WORLDMANAGER)
    this.kieuWorld = null;
    window.__kieuWorld = null;

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
          ensureKieuWorld: () => this.getOrCreateKieuWorld(),
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
      if (this.directorPanel && this.tatDenRoom) {
        this.directorPanel.setTatDenRoom?.(this.tatDenRoom);
      }
      if (this.directorPanel && this.namQuocSonHaRoom) {
        this.directorPanel.setNamQuocSonHaRoom?.(this.namQuocSonHaRoom);
      }
      if (this.directorPanel && this.thanhGiongRoom) {
        this.directorPanel.setThanhGiongRoom?.(this.thanhGiongRoom);
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
      const dispatchNarrativeWorld = (worldId, coords, meta) => {
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
        if (worldId === 'nam_quoc_son_ha' || worldId === 'namquocsonha' || meta?.targetRealm === 'NAM_QUOC_SON_HA_REALM') {
          if (this.namQuocSonHaRoom?.enterRealm) {
            this.namQuocSonHaRoom.enterRealm('namquocsonha');
            return true;
          }
        }
        if (worldId === 'thanh_giong' || worldId === 'thanhgiong' || meta?.targetRealm === 'THANH_GIONG_REALM') {
          if (this.thanhGiongRoom?.enterRealm) {
            this.thanhGiongRoom.enterRealm('thanhgiong');
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
      this.portalInteraction.loadNarrativeWorld = dispatchNarrativeWorld;
      window.loadNarrativeWorld = dispatchNarrativeWorld;

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

      // Đăng ký Cổng Dịch Chuyển Phòng Nam Quốc Sơn Hà vào PortalInteraction
      if (this.namQuocSonHaRoom) {
        const nqshPortal = this.namQuocSonHaRoom.teleportBook || this.namQuocSonHaRoom;
        if (nqshPortal) {
          this.portalInteraction.registerInteractiveBook(nqshPortal, new THREE.Vector3(0, 2.9, 25.5), {
            id: 'nam_quoc_son_ha',
            title: 'NAM QUỐC SƠN HÀ • CHIẾN TUYẾN NHƯ NGUYỆT',
            author: 'Thái úy Lý Thường Kiệt (1019 – 1105)',
            genre: 'Thơ ca Trung đại • Thời Lý (1077)',
            quote: '“Nam quốc sơn hà Nam đế cư, tiệt nhiên định phận tại thiên thư...”',
            themeColor: 0xd4af37,
            targetRealm: 'NAM_QUOC_SON_HA_REALM',
            portalReady: true,
            onActivate: () => {
              this.namQuocSonHaRoom.enterRealm?.('namquocsonha');
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

      // Kết nối Context toàn diện cho Phòng Tắt Đèn (Cõi Làng Đông Xá Đêm Sưu Thuế)
      if (this.tatDenRoom?.setupContext) {
        this.tatDenRoom.setupContext({
          scene: this.scene,
          realmScene: this.tatDenScene,
          camera: this.camera,
          renderer: this.renderer,
          cameraManager: this.cameraManager,
          hitboxManager: this.hitboxManager,
          loreGuide: this.immersionSystem?.loreGuide || window.__loreGuide,
          spatialAudio: this.immersionSystem?.spatialAudio || window.__spatialAudio,
          portalInteraction: this.portalInteraction,
          immersionSystem: this.immersionSystem
        });
      }

      // Kết nối Context toàn diện cho Phòng Nam Quốc Sơn Hà (Cõi Đêm Sông Như Nguyệt)
      if (this.namQuocSonHaRoom?.setupContext) {
        this.namQuocSonHaRoom.setupContext({
          scene: this.scene,
          realmScene: this.namQuocSonHaScene,
          camera: this.camera,
          renderer: this.renderer,
          cameraManager: this.cameraManager,
          hitboxManager: this.hitboxManager,
          loreGuide: this.immersionSystem?.loreGuide || window.__loreGuide,
          spatialAudio: this.immersionSystem?.spatialAudio || window.__spatialAudio,
          portalInteraction: this.portalInteraction,
          immersionSystem: this.immersionSystem
        });
      }

      // Kết nối Context toàn diện cho Phòng Thánh Gióng (Chiến Trường & Đỉnh Núi Sóc Sơn)
      if (this.thanhGiongRoom?.setupContext) {
        this.thanhGiongRoom.setupContext({
          scene: this.scene,
          realmScene: this.thanhGiongScene,
          camera: this.camera,
          renderer: this.renderer,
          cameraManager: this.cameraManager,
          hitboxManager: this.hitboxManager,
          loreGuide: this.immersionSystem?.loreGuide || window.__loreGuide,
          spatialAudio: this.immersionSystem?.spatialAudio || window.__spatialAudio,
          portalInteraction: this.portalInteraction,
          immersionSystem: this.immersionSystem
        });
      }
      if (typeof window !== 'undefined') {
        window.enterRealm = (realmName) => {
          if (realmName === 'namquocsonha' || realmName === 'nam_quoc_son_ha') {
            this.namQuocSonHaRoom?.enterRealm?.('namquocsonha');
            return true;
          }
          if (realmName === 'tatden' || realmName === 'tat_den') {
            this.tatDenRoom?.enterRealm?.();
            return true;
          }
          if (realmName === 'thanhgiong' || realmName === 'thanh_giong') {
            this.thanhGiongRoom?.enterRealm?.('thanhgiong');
            return true;
          }
          return false;
        };
      }
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo PortalInteraction:", err);
    }

    // 10.1. HỆ THỐNG XỬ LÝ VA CHẠM 3D & CẦU THANG (COLLISION DETECTION & STAIR RAYCASTING)
    try {
      this.initCollisionSystem();
      const interactiveRoomCtx = {
        camera: this.camera,
        renderer: this.renderer,
        hitboxManager: this.hitboxManager,
        loreGuide: this.immersionSystem?.loreGuide || window.__loreGuide,
        spatialAudio: this.immersionSystem?.spatialAudio || window.__spatialAudio,
        cameraManager: this.cameraManager,
        portalInteraction: this.portalInteraction,
        immersionSystem: this.immersionSystem
      };
      this.tatDenRoom?.userData?.wireInteractiveSystems?.(interactiveRoomCtx);
      this.namQuocSonHaRoom?.userData?.wireInteractiveSystems?.(interactiveRoomCtx);
      this.thanhGiongRoom?.userData?.wireInteractiveSystems?.(interactiveRoomCtx);
      this.thanhGiongRoom?.userData?.registerHitboxes?.(this.hitboxManager);
      if (this.hitboxManager) {
        this.collisionObjects = this.hitboxManager.solidBoxes.map(s => s.box);
        this.cameraManager?.setCollisionObjects(this.collisionObjects, this.stairObjects);
      }
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo Collision System:", err);
    }

    // 11. VÒNG LẶP TỐI ƯU HÓA FRUSTUM CULLING & NaN SANITIZATION (KHÔNG ÉP DOUBLESIDE TOÀN CỤC)
    try {
      this.sanitizeSceneGeometries();

      let overriddenCount = 0;
      const scenesToCull = [
        this.mainScene,
        this.truyenKieuScene,
        this.sonTinhThuyTinhScene,
        this.anDuongVuongScene,
        this.voNhatScene,
        this.tatDenScene,
        this.namQuocSonHaScene,
        this.thanhGiongScene
      ];
      scenesToCull.forEach((targetScene) => {
        if (!targetScene) return;
        overriddenCount += this.optimizeSubtree(targetScene);
      });
      console.log(`%c[PERFORMANCE & RENDER] Đã bật Frustum Culling (frustumCulled=true, FrontSide giữ nguyên) cho ${overriddenCount} meshes trên toàn bộ các Scene!`, "color: #39e58c; font-weight: bold;");
    } catch (e) {
      console.warn("[SELF-HEALING] Lỗi traverse tối ưu toàn cục:", e);
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
    let overhaulPromise = Promise.resolve();
    try {
      this.totalOverhaulEngine = new MuseumTotalOverhaulEngine(this);
      overhaulPromise = Promise.resolve(this.totalOverhaulEngine.initialize()).catch((err) => {
        console.warn("[SELF-HEALING] Overhaul initialize warning:", err);
      });
      window.__totalOverhaulEngine = this.totalOverhaulEngine;
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi khởi tạo MuseumTotalOverhaulEngine:", err);
    }

    // 13.2. KHỞI CHẠY ĐỒNG BỘ 16 KỸ NĂNG TỐI THƯỢNG (ULTIMATE 16-SKILLS ORCHESTRATOR)
    let skillsPromise = Promise.resolve();
    try {
      skillsPromise = applyAll16SkillsToMuseum({
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

    // 13.3. KHỞI TẠO HỆ THỐNG CULLING PHÒNG, ĐÈN POOL CỐ ĐỊNH VÀ PREWARM SHADER/TEXTURE
    this.initRoomCullingRegistry();
    this.collectSceneLightsAndCullTargets();
    this.freezeStaticMatrices();
    this.prewarmSceneShaders(this.mainScene);
    this.updateRoomCullingAndLayers(true);

    // Chờ Overhaul + 16-Skills + GLB đợt đầu nạp xong để pre-compile shader & texture trước khi xoay camera
    this._postLoadPrewarmPending = false;
    const runPostLoadPrewarm = () => {
      if (this._isPostLoadPrewarming) return;
      this._isPostLoadPrewarming = true;
      try {
        this.cleanupLightHelpers();
        this.optimizeSubtree(this.mainScene);
        this.collectSceneLightsAndCullTargets();
        this.freezeStaticMatrices();
        this.prewarmSceneShaders(this.mainScene);
        this.updateRoomCullingAndLayers(true);
      } finally {
        this._isPostLoadPrewarming = false;
        this.performanceOptimizer?.resetSampling?.(2000);
      }
    };

    const prevDefaultOnLoad = THREE.DefaultLoadingManager.onLoad;
    THREE.DefaultLoadingManager.onLoad = () => {
      if (typeof prevDefaultOnLoad === 'function') {
        try { prevDefaultOnLoad(); } catch (e) {}
      }
      runPostLoadPrewarm();
    };

    Promise.allSettled([overhaulPromise, skillsPromise]).then(() => {
      runPostLoadPrewarm();
    });
    setTimeout(runPostLoadPrewarm, 1800);

    if (typeof document !== 'undefined') {
      const loader = document.getElementById('museum-boot-loader');
      if (loader) {
        loader.classList.add('hidden');
        setTimeout(() => loader.remove(), 300);
      }
    }

    console.log("%c✓ Đã kích hoạt Phòng Mẫu 01 (Sách Ma Thuật & Cổng Dịch Chuyển Truyện Kiều) thành công!", "color: #39e58c; font-weight: bold;");

    // 14. TỰ ĐỘNG THEO DÕI FPS >= 60 KHI KHỞI ĐỘNG BẢO TÀNG (5 GIÂY LIÊN TỤC)
    setTimeout(() => {
      if (this.performanceOptimizer) {
        this.performanceOptimizer.startBenchmark('KHỞI ĐỘNG BẢO TÀNG');
      }
    }, 700);
  }

  getOrCreateKieuWorld() {
    if (this.kieuWorld) return this.kieuWorld;
    try {
      this.kieuWorld = new KieuWorld(this.truyenKieuScene, this.matLib, this.camera);
      window.__kieuWorld = this.kieuWorld;
      if (this.kieuWorld && this.audioManager) {
        this.kieuWorld.setAudioManager(this.audioManager);
      }
      this.optimizeSubtree(this.kieuWorld.group);
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi lazy-init KieuWorld:", err);
      this.kieuWorld = null;
    }
    return this.kieuWorld;
  }


  /**
   * CẤU HÌNH HỆ THỐNG ÁNH SÁNG 3 ĐIỂM + POOL 3 POINTLIGHT CỐ ĐỊNH (ZERO RUNTIME RECOMPILE)
   */
  initThreePointLighting() {
    // 1. Quét và loại bỏ sạch sẽ mọi PointLight/SpotLight nhỏ lẻ trong atriumGroup
    const lightsToRemove = [];
    this.atriumGroup.traverse((child) => {
      if (child.isPointLight || child.isSpotLight) {
        lightsToRemove.push(child);
      }
    });
    lightsToRemove.forEach((light) => {
      if (light.parent) light.parent.remove(light);
    });
    if (this.roomGenerator?.localizedLights) {
      this.roomGenerator.localizedLights.length = 0;
    }

    // 2. Nhóm ánh sáng 3 điểm toàn cục
    this.lightingGroup = new THREE.Group();
    this.lightingGroup.name = "Global_ThreePoint_Lighting_Group";

    this.hemiLight = new THREE.HemisphereLight(0xfff6ea, 0x524235, 0.98);
    this.hemiLight.name = "Global_HemisphereLight";
    this.hemiLight.position.set(0, 60, 0);
    this.lightingGroup.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfff1e0, 0.78);
    this.keyLight.name = "Key_DirectionalLight";
    this.keyLight.position.set(30, 60, 40);
    this.keyLight.castShadow = false;
    this.lightingGroup.add(this.keyLight);

    this.fillLight = new THREE.DirectionalLight(0xded2be, 0.48);
    this.fillLight.name = "Fill_DirectionalLight";
    this.fillLight.position.set(-32, 28, -36);
    this.fillLight.castShadow = false;
    this.lightingGroup.add(this.fillLight);

    this.atriumGroup.add(this.lightingGroup);

    // 3. Pool cố định 3 PointLight luôn visible = true (chỉ đổi intensity/position/color -> NUM_POINT_LIGHTS luôn = 3)
    if (!this._roomLightPool) {
      this._roomLightPool = [];
      for (let i = 0; i < 3; i++) {
        const pLight = new THREE.PointLight(0xfff1e0, 0.0, 24.0, 1.5);
        pLight.name = `Pooled_Room_PointLight_${i}`;
        pLight.castShadow = false;
        pLight.visible = true;
        this.mainScene.add(pLight);
        this._roomLightPool.push(pLight);
      }
    }

    // 4. THÊM CHIỀU SÂU KHÔNG KHÍ BẰNG FOG HOÀNG HÔN ẤM ÁP
    const mainStyle = this._getCachedSceneStyle('main', 0xdca878, 0xdca878, 0.00075);
    this.mainScene.background = mainStyle.background;
    this.scene.background = this.mainScene.background;
    this.mainScene.fog = mainStyle.fog;
    this.scene.fog = this.mainScene.fog;

    // Giữ đối tượng artDirector tương thích với PerformanceOptimizer
    this.artDirector = {
      group: this.lightingGroup,
      sunLight: this.keyLight,
      update: () => {}
    };

    console.log("%c✓ [3-POINT LIGHTING & POOL] Cấu hình 3 đèn toàn cục + Pool 3 PointLight cố định hoàn tất!", "color: #39e58c; font-weight: bold;");
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
   * KÍCH HOẠT FRUSTUM CULLING & TẮT SHADOW CHO MỌI MESH TRONG SUBTREE (GIỮ NGUYÊN FRONTSIDE)
   */
  optimizeSubtree(root) {
    if (!root) return 0;
    let count = 0;
    root.traverse((child) => {
      if (child.isLight) {
        child.castShadow = false;
      }
      if (child.isMesh || child.isPoints || child.isSprite) {
        child.frustumCulled = true;
        child.castShadow = false;
        child.receiveShadow = false;
        if (child.isMesh) {
          child.renderOrder = 0;
        }
        if (child.geometry) {
          if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
          if (!child.geometry.boundingSphere) child.geometry.computeBoundingSphere();
        }
        if (child.material) {
          const applyMatOpt = (mat) => {
            if (!mat) return;
            if (!mat.transparent) {
              mat.depthWrite = true;
            }
            mat.depthTest = true;
          };
          if (Array.isArray(child.material)) {
            child.material.forEach(applyMatOpt);
          } else {
            applyMatOpt(child.material);
          }
        }
        count++;
      }
    });
    return count;
  }

  enforceFrustumCulling(root) {
    return this.optimizeSubtree(root);
  }

  /**
   * 1. HỆ THỐNG XỬ LÝ VA CHẠM THỰC THỂ (CLEANED PERIMETER WALLS ONLY)
   */
  initCollisionSystem() {
    this.collisionObjects = [];
    this.stairObjects = [];

    if (this.hitboxManager) {
      this.hitboxManager.rebuildAllMuseumHitboxes();
      this.collisionObjects = this.hitboxManager.solidBoxes.map(s => s.box);
    }

    this.cameraManager?.setCollisionObjects(this.collisionObjects, this.stairObjects);
    console.log(`%c[COLLISION SYSTEM] Đã làm mới 100% hitbox bảo tàng: ${this.collisionObjects.length} vật cản chuẩn hóa O(1).`, "color: #39e58c; font-weight: bold;");
  }

  registerDynamicCollisionObject(model) {
    // Cấm tuyệt đối đưa các mô hình trang trí GLB vào danh sách va chạm
  }

  initRoomCullingRegistry() {
    this._lastCullCamPos = new THREE.Vector3(Infinity, Infinity, Infinity);
    this._lobbyCenter = new THREE.Vector3(0, 2.0, 0);
    this._lobbyLightSpecs = [];
    this._collectedLights = new WeakSet();
    this._prewarmedTextures = new WeakSet();
    this._tempLightPos = new THREE.Vector3();
    this._lastPrewarmedMeshCount = -1;
    this._roomEntries = [
      {
        key: 'truyenKieu',
        room: this.truyenKieuRoom,
        center: new THREE.Vector3(-48.0, 10.0, 19.0),
        lightSpecs: [],
        cullableProps: [],
        shouldUpdate: true,
        propsVisible: true,
        updateFn: (d, et, c) => (this.truyenKieuRoom?.update || this.roomDecorator?.update)?.(d, et, c)
      },
      {
        key: 'thanhGiong',
        room: this.thanhGiongRoom,
        center: new THREE.Vector3(-48.0, 0.0, 19.0),
        lightSpecs: [],
        cullableProps: [],
        shouldUpdate: true,
        propsVisible: true,
        updateFn: (d, et, c) => (this.thanhGiongRoom?.update || this.thanhGiongRoom?.userData?.update)?.(d, et, c)
      },
      {
        key: 'sonTinh',
        room: this.sonTinhThuyTinhRoom,
        center: new THREE.Vector3(-48.0, 0.0, -19.0),
        lightSpecs: [],
        cullableProps: [],
        shouldUpdate: true,
        propsVisible: true,
        updateFn: (d, et, c) => this.sonTinhThuyTinhRoom?.update?.(d, et, c)
      },
      {
        key: 'namQuocSonHa',
        room: this.namQuocSonHaRoom,
        center: new THREE.Vector3(-48.0, 10.0, -19.0),
        lightSpecs: [],
        cullableProps: [],
        shouldUpdate: true,
        propsVisible: true,
        updateFn: (d, et, c) => this.namQuocSonHaRoom?.update?.(d, et, c)
      },
      {
        key: 'anDuongVuong',
        room: this.anDuongVuongRoom,
        center: new THREE.Vector3(0.0, 0.0, -48.0),
        lightSpecs: [],
        cullableProps: [],
        shouldUpdate: true,
        propsVisible: true,
        updateFn: (d, et, c) => this.anDuongVuongRoom?.update?.(d, et, c)
      },
      {
        key: 'voNhat',
        room: this.voNhatRoom,
        center: new THREE.Vector3(48.0, 20.0, -19.0),
        lightSpecs: [],
        cullableProps: [],
        shouldUpdate: true,
        propsVisible: true,
        updateFn: (d, et, c) => this.voNhatRoom?.update?.(d, et, c)
      },
      {
        key: 'tatDen',
        room: this.tatDenRoom,
        center: new THREE.Vector3(-48.0, 20.0, -19.0),
        lightSpecs: [],
        cullableProps: [],
        shouldUpdate: true,
        propsVisible: true,
        updateFn: (d, et, c) => this.tatDenRoom?.userData?.update?.(d, et, c)
      }
    ];
  }

  _isStructuralShellNode(node) {
    if (!node || node.isLight || node.isPoints || node.isSprite) return false;
    const lowerName = (node.name || '').toLowerCase();
    if (!lowerName) return false;

    // Loại trừ rõ ràng các vật thể nội thất dù tên có chứa từ khóa kiến trúc (vd: floorCarpet, SideWallPanels, wallRelief)
    if (
      lowerName.includes('carpet') ||
      lowerName.includes('halo') ||
      lowerName.includes('warmring') ||
      lowerName.includes('floor_inlay') ||
      lowerName.includes('sidewallpanel') ||
      lowerName.includes('wallpanel') ||
      lowerName.includes('wallrelief') ||
      lowerName.includes('spear') ||
      lowerName.includes('plinth') ||
      lowerName.includes('pedestal') ||
      lowerName.includes('thatch') ||
      lowerName.includes('mural')
    ) {
      return false;
    }

    return (
      lowerName.includes('wall') ||
      lowerName.includes('enclosure') ||
      lowerName.includes('floor') ||
      lowerName.includes('ceiling') ||
      lowerName.includes('canopy') ||
      lowerName.includes('roof') ||
      lowerName.includes('arch') ||
      lowerName.includes('gate') ||
      lowerName.includes('lintel') ||
      lowerName.includes('pier') ||
      lowerName.includes('door')
    );
  }

  collectSceneLightsAndCullTargets() {
    if (!this.mainScene || !this._roomEntries) return;

    const roomMap = new Map();
    for (let i = 0; i < this._roomEntries.length; i++) {
      const entry = this._roomEntries[i];
      for (let p = 0; p < entry.cullableProps.length; p++) {
        const oldProp = entry.cullableProps[p];
        if (oldProp) oldProp.visible = true;
      }
      entry.cullableProps.length = 0;
      if (entry.room) roomMap.set(entry.room, entry);
    }

    const poolSet = new Set(this._roomLightPool || []);
    const lightsToDetach = [];

    // 1. Ghi nhận thông số đèn phòng/sảnh và tách khỏi scene (chỉ dùng Pool 3 PointLight cố định)
    this.mainScene.traverse((child) => {
      if (!child.isLight) return;
      child.castShadow = false;
      if (poolSet.has(child)) {
        child.visible = true;
        return;
      }

      let p = child.parent;
      let inGlobalLighting = false;
      let ownerEntry = null;
      while (p) {
        if (p === this.lightingGroup) {
          inGlobalLighting = true;
          break;
        }
        if (!ownerEntry && roomMap.has(p)) {
          ownerEntry = roomMap.get(p);
        }
        p = p.parent;
      }
      if (inGlobalLighting) {
        child.visible = true;
        return;
      }

      if (!this._collectedLights.has(child)) {
        this._collectedLights.add(child);
        if (child.isPointLight || child.isSpotLight) {
          child.updateWorldMatrix(true, false);
          child.getWorldPosition(this._tempLightPos);
          const intensity = child.intensity ?? 1.0;
          const spec = {
            worldPos: this._tempLightPos.clone(),
            color: child.color?.getHex?.() ?? 0xfff1e0,
            intensity: Math.min(intensity, 6.5),
            distance: child.distance > 0 ? child.distance : 24.0,
            decay: child.decay ?? 1.5,
            priority: (child.isSpotLight ? 2.0 : 1.0) * intensity
          };
          if (ownerEntry) {
            ownerEntry.lightSpecs.push(spec);
            ownerEntry.lightSpecs.sort((a, b) => b.priority - a.priority);
          } else {
            this._lobbyLightSpecs.push(spec);
            this._lobbyLightSpecs.sort((a, b) => b.priority - a.priority);
          }
        }
      }

      child.visible = false;
      lightsToDetach.push(child);
    });

    for (let i = 0; i < lightsToDetach.length; i++) {
      const l = lightsToDetach[i];
      if (l.parent) l.parent.remove(l);
    }

    // 2. Chừa 100% lớp vỏ kiến trúc phòng (tường/sàn/trần/cửa vòm/cổng) + cha của chúng, cull toàn bộ nội thất còn lại
    for (let i = 0; i < this._roomEntries.length; i++) {
      const entry = this._roomEntries[i];
      if (!entry.room) continue;

      entry.room.visible = true;
      const shellNodes = new Set();
      const structuralAncestors = new Set();

      const markStructural = (node) => {
        if (!node) return false;
        if (node !== entry.room && this._isStructuralShellNode(node)) {
          shellNodes.add(node);
          return true;
        }
        let hasShellChild = false;
        const children = node.children;
        if (children && children.length > 0) {
          for (let c = 0; c < children.length; c++) {
            if (markStructural(children[c])) {
              hasShellChild = true;
            }
          }
        }
        if (hasShellChild) {
          structuralAncestors.add(node);
        }
        return hasShellChild;
      };

      const collectCullNodes = (node) => {
        if (!node || shellNodes.has(node)) return;
        if (node !== entry.room && !structuralAncestors.has(node)) {
          entry.cullableProps.push(node);
          if (node.visible !== entry.propsVisible) {
            node.visible = Boolean(entry.propsVisible);
          }
          return;
        }
        const children = node.children;
        if (children && children.length > 0) {
          for (let c = 0; c < children.length; c++) {
            collectCullNodes(children[c]);
          }
        }
      };

      markStructural(entry.room);
      shellNodes.forEach((n) => { n.visible = true; });
      structuralAncestors.forEach((n) => { n.visible = true; });
      collectCullNodes(entry.room);
    }
  }

  freezeStaticMatrices() {
    if (!this.mainScene) return;
    const freezePureStatic = (root) => {
      if (!root) return;
      root.updateMatrixWorld(true);
      root.traverse((obj) => {
        if (obj.isLight || obj.isCamera || obj.isPoints || obj.userData?.isDynamic) return;
        const lower = (obj.name || '').toLowerCase();
        if (lower.includes('book') || lower.includes('flame') || lower.includes('lantern') || lower.includes('water') || lower.includes('cloud') || lower.includes('crowd') || lower.includes('portal')) {
          return;
        }
        obj.updateMatrix();
        obj.matrixAutoUpdate = false;
        if (obj.children.length === 0) {
          obj.matrixWorldAutoUpdate = false;
        }
      });
    };

    try {
      if (this.atriumGroup) {
        this.atriumGroup.updateMatrixWorld(true);
        this.atriumGroup.matrixAutoUpdate = false;
      }
      freezePureStatic(this.lightingGroup);
      freezePureStatic(this.architecture?.getGroup?.());
      freezePureStatic(this.staircase?.getGroup?.());
      freezePureStatic(this.modelCreator?.getGroup?.());

      // Đóng băng các tường vỏ phòng tĩnh (chỉ leaf structural meshes)
      if (this._roomEntries) {
        for (let i = 0; i < this._roomEntries.length; i++) {
          const room = this._roomEntries[i].room;
          if (!room) continue;
          room.updateMatrixWorld(true);
          room.traverse((obj) => {
            if (obj.userData?.isDynamic || obj.isLight || obj.isPoints || obj.isSprite) return;
            if (this._isStructuralShellNode(obj) && obj.children.length === 0) {
              obj.updateMatrix();
              obj.matrixAutoUpdate = false;
              obj.matrixWorldAutoUpdate = false;
            }
          });
        }
      }
    } catch (err) {
      console.warn('[FREEZE MATRIX] Warning:', err);
    }
  }

  prewarmSceneShaders(targetScene = this.mainScene) {
    if (!this.renderer || !targetScene || !this.camera) return;
    const savedHidden = [];
    const savedFrustumStates = [];
    try {
      if (targetScene === this.mainScene && this._roomEntries) {
        for (let i = 0; i < this._roomEntries.length; i++) {
          const props = this._roomEntries[i].cullableProps;
          for (let p = 0; p < props.length; p++) {
            const node = props[p];
            if (node && !node.visible) {
              savedHidden.push(node);
              node.visible = true;
            }
          }
        }
      }

      if (this._roomLightPool) {
        for (let i = 0; i < this._roomLightPool.length; i++) {
          this._roomLightPool[i].visible = true;
        }
      }

      this._prewarmedTextures = this._prewarmedTextures || new WeakSet();
      const texKeys = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap', 'bumpMap', 'envMap'];
      let meshCount = 0;

      targetScene.traverse((child) => {
        if (!child.isMesh && !child.isSprite && !child.isPoints) return;
        meshCount++;
        savedFrustumStates.push(child, child.frustumCulled);
        child.frustumCulled = false;

        const matOrArr = child.material;
        if (!matOrArr) return;
        const mats = Array.isArray(matOrArr) ? matOrArr : [matOrArr];
        for (let m = 0; m < mats.length; m++) {
          const mat = mats[m];
          if (!mat) continue;
          for (let k = 0; k < texKeys.length; k++) {
            const tex = mat[texKeys[k]];
            if (tex && tex.isTexture && !this._prewarmedTextures.has(tex)) {
              this._prewarmedTextures.add(tex);
              this.renderer.initTexture(tex);
            }
          }
        }
      });

      this.renderer.compile(targetScene, this.camera);

      // Thực thi 1 warm-up draw call toàn cảnh (frustumCulled=false) để GPU/D3D11 nạp sẵn toàn bộ VBO lúc boot
      if (targetScene !== this.mainScene || meshCount !== this._lastPrewarmedMeshCount) {
        this.renderer.render(targetScene, this.camera);
        this.renderer.clear();
        this.renderer.info?.reset?.();
        this.performanceOptimizer?.resetSampling?.(1800);
      }
      if (targetScene === this.mainScene) {
        this._lastPrewarmedMeshCount = meshCount;
      }
    } catch (err) {
      console.warn('[PREWARM] Lỗi pre-compile shaders/textures/VBOs:', err);
    } finally {
      for (let i = 0; i < savedFrustumStates.length; i += 2) {
        savedFrustumStates[i].frustumCulled = savedFrustumStates[i + 1];
      }
      for (let i = 0; i < savedHidden.length; i++) {
        savedHidden[i].visible = false;
      }
    }
  }

  /**
   * CẬP NHẬT CULLING PHÒNG, POOL 3 POINTLIGHT VÀ NHÓM NỘI THẤT THEO VỊ TRÍ CAMERA (O(7))
   */
  updateRoomCullingAndLayers(force = false) {
    if (!this.camera) return;

    this.camera.layers.enable(1);
    if (this.postProcessing) {
      this.postProcessing.setEnabled(false);
    }

    if (!this._roomEntries || !this._lastCullCamPos) return;
    const camPos = this.camera.position;

    if (!force && camPos.distanceToSquared(this._lastCullCamPos) < 0.04) {
      return;
    }
    this._lastCullCamPos.copy(camPos);

    // 1. Tìm 1 phòng gần nhất trong bán kính <= 32m trên cùng tầng
    let closestEntry = null;
    let closestDistSq = 32.0 * 32.0;

    for (let i = 0; i < this._roomEntries.length; i++) {
      const entry = this._roomEntries[i];
      const dx = camPos.x - entry.center.x;
      const dy = Math.abs(camPos.y - entry.center.y);
      const dz = camPos.z - entry.center.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      const sameFloor = dy <= 7.0;
      entry.shouldUpdate = sameFloor && distSq <= (42.0 * 42.0);

      const showProps = sameFloor && distSq <= (48.0 * 48.0);
      if (force || entry.propsVisible !== showProps) {
        entry.propsVisible = showProps;
        for (let p = 0; p < entry.cullableProps.length; p++) {
          const prop = entry.cullableProps[p];
          if (prop && prop.visible !== showProps) {
            prop.visible = showProps;
          }
        }
      }

      if (sameFloor && distSq <= closestDistSq) {
        closestDistSq = distSq;
        closestEntry = entry;
      }
    }

    // 2. Cập nhật Pool 3 PointLight cố định (KHÔNG BAO GIỜ đổi light.visible -> 0 shader recompile)
    if (this._roomLightPool && this._roomLightPool.length > 0) {
      const distLobbySq = camPos.distanceToSquared(this._lobbyCenter);
      const useLobbyLights = !closestEntry && camPos.y < 9.0 && distLobbySq <= (28.0 * 28.0);
      const activeSpecs = closestEntry
        ? closestEntry.lightSpecs
        : (useLobbyLights ? this._lobbyLightSpecs : null);

      for (let i = 0; i < this._roomLightPool.length; i++) {
        const poolLight = this._roomLightPool[i];
        const spec = activeSpecs && i < activeSpecs.length ? activeSpecs[i] : null;
        if (spec) {
          poolLight.position.copy(spec.worldPos);
          poolLight.color.setHex(spec.color);
          poolLight.intensity = spec.intensity;
          poolLight.distance = spec.distance;
          poolLight.decay = spec.decay;
        } else {
          poolLight.intensity = 0;
        }
        poolLight.visible = true;
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
        if (this.performanceOptimizer?.applyCurrentPixelRatio) {
          this.performanceOptimizer.applyCurrentPixelRatio();
        } else {
          this.renderer?.setPixelRatio(Math.min(window.devicePixelRatio || 1, 0.85));
        }
      } catch (e) {
        console.warn("[SELF-HEALING] Lỗi resize handler:", e);
      }
    });
  }

  animate = (time) => {
    requestAnimationFrame(this.animate);

    // Tự động ngắt render khi tab trình duyệt đang ẩn
    if (typeof document !== 'undefined' && document.hidden) {
      this._wasTabHidden = true;
      return;
    }

    try {
      const rawDelta = this.clock?.getDelta() ?? 0.016;
      const delta = this._wasTabHidden ? 0.016 : Math.min(rawDelta, 0.05);
      this._wasTabHidden = false;
      const elapsedTime = this.clock?.getElapsedTime() ?? 0;

      // Quét dọn định kỳ ở frame 60 & 180 để đồng bộ GLBs vừa tải và pre-compile nếu có mesh mới
      if (this.frameCounter === undefined) this.frameCounter = 0;
      this.frameCounter++;
      if (this.frameCounter === 60 || this.frameCounter === 180) {
        this.cleanupLightHelpers();
        const meshCount = this.optimizeSubtree(this.mainScene);
        this.collectSceneLightsAndCullTargets();
        this.freezeStaticMatrices();
        if (meshCount !== this._lastPrewarmedMeshCount) {
          this.prewarmSceneShaders(this.mainScene);
        }
        this.updateRoomCullingAndLayers(true);
      }

      this.cameraManager?.update(delta);
      this.immersionSystem?.update?.();
      this.autoTour?.update(performance.now());

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

      // MULTI-SCENE ARCHITECTURE: CHỈ CẬP NHẬT CÁC HỆ THỐNG CỦA SCENE ĐANG ACTIVE
      if (this.activeScene === this.mainScene) {
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

        this.museumCrowd?.update(delta, elapsedTime, this.camera);
        this.totalOverhaulEngine?.update(elapsedTime);
        updateProceduralLighting(elapsedTime);
        this.portalInteraction?.update(delta, elapsedTime);
        this.updateRoomCullingAndLayers();
        this.roomGenerator?.update(delta, elapsedTime, this.camera);

        if (this._roomEntries) {
          for (let i = 0; i < this._roomEntries.length; i++) {
            const entry = this._roomEntries[i];
            if (entry.shouldUpdate) {
              entry.updateFn(delta, elapsedTime, this.camera);
            }
          }
        }
        this.lobbyDecorator?.updateLobby?.(elapsedTime, delta);
        if (this.ultimate16Skills?.updateAll) {
          this.ultimate16Skills.updateAll(performance.now());
        }
      } else if (this.activeScene === this.truyenKieuScene) {
        // Chỉ hiển thị & cập nhật duy nhất 1 nhánh Truyện Kiều đang vào
        if (this.truyenKieuRoom?.isInsideRealm?.()) {
          if (this.truyenKieuStoryWorld?.worldGroup) this.truyenKieuStoryWorld.worldGroup.visible = false;
          if (this.kieuWorld?.group) this.kieuWorld.group.visible = false;
          this.truyenKieuRoom.updateRealm?.(delta, elapsedTime, this.camera);
        } else if (this.truyenKieuStoryWorld?.isInsideWorld) {
          if (this.truyenKieuStoryWorld.worldGroup && !this.truyenKieuStoryWorld.worldGroup.visible) {
            this.truyenKieuStoryWorld.worldGroup.visible = true;
          }
          if (this.kieuWorld?.group) this.kieuWorld.group.visible = false;
          this.truyenKieuStoryWorld.update(delta, elapsedTime);
        } else if (this.worldManager?.currentState === WORLD_STATES.KIEU_WORLD) {
          if (this.truyenKieuStoryWorld?.worldGroup) this.truyenKieuStoryWorld.worldGroup.visible = false;
          this.kieuWorld?.update?.(delta, elapsedTime);
        }
      } else if (this.activeScene === this.sonTinhThuyTinhScene) {
        this.sonTinhThuyTinhRoom?.updateRealm?.(delta, elapsedTime, this.camera);
      } else if (this.activeScene === this.anDuongVuongScene) {
        this.anDuongVuongRoom?.updateRealm?.(delta, elapsedTime, this.camera);
      } else if (this.activeScene === this.voNhatScene) {
        this.voNhatRoom?.updateRealm?.(delta, elapsedTime, this.camera);
      } else if (this.activeScene === this.tatDenScene) {
        this.tatDenRoom?.updateRealm?.(delta, elapsedTime, this.camera);
      } else if (this.activeScene === this.namQuocSonHaScene) {
        this.namQuocSonHaRoom?.updateRealm?.(delta, elapsedTime, this.camera);
      } else if (this.activeScene === this.thanhGiongScene) {
        (this.thanhGiongRoom?.updateRealm || this.thanhGiongRoom?.userData?.updateRealm)?.(delta, elapsedTime, this.camera);
      }

      this.worldManager?.update(delta, elapsedTime);

      // Reset stats trước render và đọc lại ngay sau render() để HUD đo chính xác DC & Tris
      this.renderer?.info?.reset?.();
      if (this.renderer && this.activeScene && this.camera) {
        this.renderer.render(this.activeScene, this.camera);
      }
      this.performanceOptimizer?.update(delta);
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
