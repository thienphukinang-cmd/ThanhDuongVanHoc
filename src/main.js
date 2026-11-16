import * as THREE from 'three';
import { playBookSuckInCutscene } from './modules/bookVortexCutscene.js';import { MaterialLibrary, updateProceduralLighting } from './modules/proceduralMaterials.js';
import { ProceduralArchitecture } from './modules/proceduralArchitecture.js';
import { ModelCreator } from './modules/modelCreator.js';
import { BifurcatedStaircase } from './modules/bifurcatedStaircase.js';
import { RoomGenerator } from './modules/RoomGenerator.js';
import { PortalInteraction } from './modules/PortalInteraction.js';
import { ExteriorVista } from './modules/exteriorVista.js';
import { ProceduralVFX } from './modules/proceduralVfx.js';
import { CameraManager } from './controls/cameraManager.js';
import { DirectorPanel } from './ui/directorPanel.js';
import { DirectoryHUD } from './ui/DirectoryHUD.js';
import { KieuWorld } from './modules/kieuWorld.js';
import { WorldManager, WORLD_STATES } from './modules/worldManager.js';
import { AudioManager, SURFACE_TYPES } from './modules/AudioManager.js';
import {
  LITERATURE_REGISTRY,
  CUSTOM_ROOM_IDS,
  getRoomWorldPose,
  isRoomLocked
} from './config/literatureRegistry.js';
import { buildTruyenKieuExhibition } from './modules/truyenKieuRoomDecorator.js';
import { buildThanhGiongExhibition } from './modules/thanhGiongRoomDecorator.js';
import { buildSonTinhThuyTinhExhibition, setupSonTinhThuyTinhRoom } from './modules/sonTinhThuyTinhRoomDecorator.js';
import { buildNamQuocSonHaExhibition } from './modules/namQuocSonHaRoomDecorator.js';
import { buildAnDuongVuongExhibition } from './modules/anDuongVuongRoomDecorator.js';
import { buildVoNhatExhibition } from './modules/voNhatRoomDecorator.js';
import { buildTatDenExhibition } from './modules/tatDenRoomDecorator.js';
import { buildNamXuongExhibition } from './modules/namXuongRoomDecorator.js';
import { buildDayThonViDaExhibition } from './modules/dayThonViDaRoomDecorator.js';
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
import { AICommandHubWorld } from './worlds/aiCommandHub.js';
import { CatAgentVillageWorld } from './worlds/catAgentVillage.js';
import { createCatPawAndFireflyAura } from './modules/catPortalVfxAndLighting.js';

/**
 * BẢO TÀNG VĂN HỌC - THE NEW ERA
 * GIAI ĐOẠN 2: CHẾ TẠO PHÒNG MẪU 01 & LẬP TRÌNH CỔNG DỊCH CHUYỂN
 * 
 * Áp dụng quy tắc: AUTO-VALIDATION, DEFENSIVE PROGRAMMING & SELF-HEALING
 */

function fixFloorAndLightingRoom01(_roomGroup, _scene, renderer, _postProcessing = null) {
  if (renderer) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
  }
}

function getRoomCenterVector(roomId) {
  const pose = getRoomWorldPose(roomId);
  return new THREE.Vector3(pose.x, pose.y, pose.z);
}

class LiteratureCathedralApp {
  constructor() {
    this.container = document.getElementById('app') ?? document.body;
    this.clock = new THREE.Clock();

    // Thiết lập Loading Manager nền giấy dó cổ cập nhật tiến độ thực tế 0% -> 100%
    const fillEl = document.getElementById('boot-progress-fill');
    const percentEl = document.getElementById('boot-progress-percent');
    const statusEl = document.getElementById('boot-progress-status');

    THREE.DefaultLoadingManager.onProgress = (itemUrl, itemsLoaded, itemsTotal) => {
      const pct = Math.min(100, Math.round((itemsLoaded / (itemsTotal || 1)) * 100));
      if (fillEl) fillEl.style.width = `${pct}%`;
      if (percentEl) percentEl.textContent = `${pct}%`;
      if (statusEl) {
        const shortName = (itemUrl || '').split('/').pop()?.split('?')[0] || 'di sản';
        statusEl.textContent = `Nạp ${shortName} (${itemsLoaded}/${itemsTotal})`;
      }
    };

    THREE.DefaultLoadingManager.onLoad = () => {
      if (fillEl) fillEl.style.width = '100%';
      if (percentEl) percentEl.textContent = '100%';
      if (statusEl) statusEl.textContent = 'Khởi tạo hoàn tất! Đang mở cửa Thánh Đường...';
    };

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

      this.renderer.shadowMap.enabled = true; // Bật ShadowMap có kiểm soát (chỉ SpotLight Phòng 204 đổ bóng khi đứng gần)
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
    this.anDuongVuongScene.background = new THREE.Color(0x0e3b33);
    this.anDuongVuongScene.fog = new THREE.FogExp2(0x0e3b33, 0.00045);
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

    // 9. Scene Thế Giới Đây Thôn Vĩ Dạ Độc Lập (Vườn Ban Mai & Sông Trăng Xứ Huế)
    this.dayThonViDaScene = new THREE.Scene();
    this.dayThonViDaScene.name = "DayThonViDa_Universe";
    this.dayThonViDaScene.background = new THREE.Color(0xbfe0d4);
    this.dayThonViDaScene.fog = new THREE.FogExp2(0xc8e4d8, 0.0022);
    window.__dayThonViDaScene = this.dayThonViDaScene;

    // 10. Scene Thế Giới Người Con Gái Nam Xương Độc Lập (Bến Sông Hoàng Giang & Thủy Cung)
    this.namXuongScene = new THREE.Scene();
    this.namXuongScene.name = "NamXuong_Universe";
    this.namXuongScene.background = new THREE.Color(0x0d1117);
    this.namXuongScene.fog = new THREE.FogExp2(0x0d1117, 0.0035);
    window.__namXuongScene = this.namXuongScene;

    // 11. Scene Khu Căn Cứ Đội Quân AI ("Khu Chỉ Huy Kiến Tạo Thánh Đường")
    this.aiCommandHubScene = new THREE.Scene();
    this.aiCommandHubScene.name = "AICommandHub_Universe";
    this.aiCommandHubScene.background = new THREE.Color(0x0b0f19);
    this.aiCommandHubScene.fog = new THREE.FogExp2(0x0b0f19, 0.0016);
    window.__aiCommandHubScene = this.aiCommandHubScene;

    try {
      this.aiCommandHubWorld = new AICommandHubWorld(
        this.aiCommandHubScene,
        this.camera,
        this.renderer,
        this.cameraManager,
        {
          onReturnToLobby: () => this.exitAICommandHub()
        }
      );
      this.aiCommandHubWorld.init().catch(err => console.warn('[AICommandHubWorld] init error:', err));
      window.__aiCommandHubWorld = this.aiCommandHubWorld;
    } catch (e) {
      console.warn('[AICommandHubWorld] instantiate error:', e);
    }

    // 12. Scene Đảo Mèo Thánh Đường 3D Isometric ("Cat Agent Village")
    this.catVillageScene = new THREE.Scene();
    this.catVillageScene.name = "CatVillage_Universe";
    this.catVillageScene.background = new THREE.Color(0x0d111a);
    this.catVillageScene.fog = new THREE.FogExp2(0x0d111a, 0.0018);
    window.__catVillageScene = this.catVillageScene;

    try {
      this.catVillageWorld = new CatAgentVillageWorld(
        this.catVillageScene,
        this.camera,
        this.renderer,
        this.cameraManager,
        {
          onReturnToLobby: () => this.exitCatVillage()
        }
      );
      this.catVillageWorld.init().catch(err => console.warn('[CatAgentVillageWorld] init error:', err));
      window.__catVillageWorld = this.catVillageWorld;
    } catch (e) {
      console.warn('[CatAgentVillageWorld] instantiate error:', e);
    }

    // 5. Biến quản lý Scene đang Active (Mặc định: Sảnh Bảo Tàng)
    this.activeScene = this.mainScene;
    window.__activeScene = this.activeScene;
    window.__app = this;

    this.museumCrowd = createMuseumCrowdSystem(this.scene, { totalVisitors: 42 });
    window.__museumCrowd = this.museumCrowd;

    const truyenKieuRoom = buildTruyenKieuExhibition({
      roomCenter: getRoomCenterVector('truyen_kieu'), // Khớp tuyệt đối với LITERATURE_REGISTRY + ALCOVE_CENTERS (Tầng 2, phòng 205)
      poeticScene: this.truyenKieuScene
    });
    this.scene.add(truyenKieuRoom);
    this.truyenKieuRoom = truyenKieuRoom;
    this.roomDecorator = truyenKieuRoom;

    const thanhGiongRoom = buildThanhGiongExhibition({
      roomCenter: getRoomCenterVector('thanh_giong'), // Khớp tuyệt đối với LITERATURE_REGISTRY + ALCOVE_CENTERS (Tầng 1, phòng 101)
      mainScene: this.scene,
      realmScene: this.thanhGiongScene
    });
    this.scene.add(thanhGiongRoom);
    this.thanhGiongRoom = thanhGiongRoom;
    window.__thanhGiongRoom = thanhGiongRoom;

    const sonTinhThuyTinhRoom = setupSonTinhThuyTinhRoom(this.scene, {
      roomCenter: getRoomCenterVector('son_tinh_thuy_tinh'), // Khớp tuyệt đối với LITERATURE_REGISTRY + ALCOVE_CENTERS (Tầng 1, phòng 102)
      battleScene: this.sonTinhThuyTinhScene
    });
    if (sonTinhThuyTinhRoom.parent !== this.scene) {
      this.scene.add(sonTinhThuyTinhRoom);
    }
    this.sonTinhThuyTinhRoom = sonTinhThuyTinhRoom;

    const namQuocSonHaRoom = buildNamQuocSonHaExhibition({
      roomCenter: getRoomCenterVector('nam_quoc_son_ha'), // Khớp tuyệt đối với LITERATURE_REGISTRY + ALCOVE_CENTERS (Tầng 2, phòng 201)
      mainScene: this.scene,
      realmScene: this.namQuocSonHaScene
    });
    this.scene.add(namQuocSonHaRoom);
    this.namQuocSonHaRoom = namQuocSonHaRoom;
    window.__namQuocSonHaRoom = namQuocSonHaRoom;

    const anDuongVuongRoom = buildAnDuongVuongExhibition({
      roomCenter: getRoomCenterVector('an_duong_vuong'), // Khớp tuyệt đối với LITERATURE_REGISTRY + ALCOVE_CENTERS (Tầng 1, phòng 103)
      realmScene: this.anDuongVuongScene
    });
    this.scene.add(anDuongVuongRoom);
    this.anDuongVuongRoom = anDuongVuongRoom;
    window.__anDuongVuongRoom = anDuongVuongRoom;

    const voNhatRoom = buildVoNhatExhibition({
      roomCenter: getRoomCenterVector('vo_nhat'), // Khớp tuyệt đối với LITERATURE_REGISTRY + ALCOVE_CENTERS (Tầng 3, phòng 305)
      realmScene: this.voNhatScene
    });
    if (isRoomLocked('vo_nhat')) {
      voNhatRoom.visible = false;
    }
    this.scene.add(voNhatRoom);
    this.voNhatRoom = voNhatRoom;
    window.__voNhatRoom = voNhatRoom;

    const tatDenRoom = buildTatDenExhibition({
      roomCenter: getRoomCenterVector('tat_den'), // Khớp tuyệt đối với LITERATURE_REGISTRY + ALCOVE_CENTERS (Tầng 3, phòng 303 - Đại Gian Bắc)
      mainScene: this.scene,
      realmScene: this.tatDenScene
    });
    this.scene.add(tatDenRoom);
    this.tatDenRoom = tatDenRoom;
    window.__tatDenRoom = tatDenRoom;

    const namXuongRoom = buildNamXuongExhibition({
      roomCenter: getRoomCenterVector('nguoi_con_gai_nam_xuong'), // Khớp tuyệt đối với LITERATURE_REGISTRY + ALCOVE_CENTERS (Tầng 2, phòng 204 - Cánh Đông-Bắc)
      mainScene: this.scene,
      realmScene: this.namXuongScene,
      renderer: this.renderer,
      cameraManager: this.cameraManager
    });
    this.scene.add(namXuongRoom);
    this.namXuongRoom = namXuongRoom;
    window.__namXuongRoom = namXuongRoom;

    const dayThonViDaRoom = buildDayThonViDaExhibition({
      roomCenter: getRoomCenterVector('day_thon_vi_da'), // Khớp tuyệt đối với LITERATURE_REGISTRY + ALCOVE_CENTERS (Tầng 3, phòng 302 - Cánh Tây-Bắc)
      mainScene: this.scene,
      realmScene: this.dayThonViDaScene,
      renderer: this.renderer,
      cameraManager: this.cameraManager
    });
    this.scene.add(dayThonViDaRoom);
    this.dayThonViDaRoom = dayThonViDaRoom;
    window.__dayThonViDaRoom = dayThonViDaRoom;

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
      if (this.camera && Math.abs((this.camera.fov || 65) - 65) > 0.1) {
        this.camera.fov = 65;
        this.camera.updateProjectionMatrix();
      }
      if (this.exteriorVista?.group) this.exteriorVista.group.visible = true;
      if (this.truyenKieuStoryWorld?.worldGroup) this.truyenKieuStoryWorld.worldGroup.visible = false;
      if (this.kieuWorld?.setVisible) this.kieuWorld.setVisible(false);
      else if (this.kieuWorld?.group) this.kieuWorld.group.visible = false;
      // Hiển thị đầy đủ các phòng triển lãm văn học trong không gian bảo tàng chính
      if (this.truyenKieuRoom) this.truyenKieuRoom.visible = true;
      if (this.thanhGiongRoom) this.thanhGiongRoom.visible = true;
      if (this.sonTinhThuyTinhRoom) this.sonTinhThuyTinhRoom.visible = true;
      if (this.namQuocSonHaRoom) this.namQuocSonHaRoom.visible = true;
      if (this.anDuongVuongRoom) this.anDuongVuongRoom.visible = true;
      if (this.voNhatRoom) this.voNhatRoom.visible = !isRoomLocked('vo_nhat');
      if (this.tatDenRoom) this.tatDenRoom.visible = true;
      if (this.namXuongRoom) this.namXuongRoom.visible = true;
      if (this.dayThonViDaRoom) this.dayThonViDaRoom.visible = true;
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
      if (this.namXuongRoom) this.namXuongRoom.visible = false;
      if (this.dayThonViDaRoom) this.dayThonViDaRoom.visible = false;
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
      if (this.namXuongRoom) this.namXuongRoom.visible = false;
      if (this.dayThonViDaRoom) this.dayThonViDaRoom.visible = false;
    } else if (scene === this.anDuongVuongScene) {
      const style = this._getCachedSceneStyle('anDuongVuong', 0x0e3b33, 0x0e3b33, 0.00045);
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
      if (this.namXuongRoom) this.namXuongRoom.visible = false;
      if (this.dayThonViDaRoom) this.dayThonViDaRoom.visible = false;
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
      if (this.namXuongRoom) this.namXuongRoom.visible = false;
      if (this.dayThonViDaRoom) this.dayThonViDaRoom.visible = false;
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
      if (this.namXuongRoom) this.namXuongRoom.visible = false;
      if (this.dayThonViDaRoom) this.dayThonViDaRoom.visible = false;
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
      if (this.namXuongRoom) this.namXuongRoom.visible = false;
      if (this.dayThonViDaRoom) this.dayThonViDaRoom.visible = false;
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
      if (this.namXuongRoom) this.namXuongRoom.visible = false;
      if (this.dayThonViDaRoom) this.dayThonViDaRoom.visible = false;
      if (this.museumCrowd?.crowdGroup) this.museumCrowd.crowdGroup.visible = false;
    } else if (scene === this.dayThonViDaScene) {
      const style = this._getCachedSceneStyle('dayThonViDa', 0xbfe0d4, 0xc8e4d8, 0.0022);
      this.dayThonViDaScene.background = style.background;
      this.dayThonViDaScene.fog = style.fog;
      if (this.exteriorVista?.group) this.exteriorVista.group.visible = false;
      if (this.truyenKieuRoom) this.truyenKieuRoom.visible = false;
      if (this.thanhGiongRoom) this.thanhGiongRoom.visible = false;
      if (this.sonTinhThuyTinhRoom) this.sonTinhThuyTinhRoom.visible = false;
      if (this.namQuocSonHaRoom) this.namQuocSonHaRoom.visible = false;
      if (this.anDuongVuongRoom) this.anDuongVuongRoom.visible = false;
      if (this.voNhatRoom) this.voNhatRoom.visible = false;
      if (this.tatDenRoom) this.tatDenRoom.visible = false;
      if (this.namXuongRoom) this.namXuongRoom.visible = false;
      if (this.dayThonViDaRoom) this.dayThonViDaRoom.visible = false;
      if (this.museumCrowd?.crowdGroup) this.museumCrowd.crowdGroup.visible = false;
    } else if (scene === this.namXuongScene) {
      const style = this._getCachedSceneStyle('namXuong', 0x0d1117, 0x0d1117, 0.0035);
      this.namXuongScene.background = style.background;
      this.namXuongScene.fog = style.fog;
      if (this.exteriorVista?.group) this.exteriorVista.group.visible = false;
      if (this.truyenKieuRoom) this.truyenKieuRoom.visible = false;
      if (this.thanhGiongRoom) this.thanhGiongRoom.visible = false;
      if (this.sonTinhThuyTinhRoom) this.sonTinhThuyTinhRoom.visible = false;
      if (this.namQuocSonHaRoom) this.namQuocSonHaRoom.visible = false;
      if (this.anDuongVuongRoom) this.anDuongVuongRoom.visible = false;
      if (this.voNhatRoom) this.voNhatRoom.visible = false;
      if (this.tatDenRoom) this.tatDenRoom.visible = false;
      if (this.namXuongRoom) this.namXuongRoom.visible = false;
      if (this.dayThonViDaRoom) this.dayThonViDaRoom.visible = false;
      if (this.museumCrowd?.crowdGroup) this.museumCrowd.crowdGroup.visible = false;
    } else if (scene === this.aiCommandHubScene) {
      const style = this._getCachedSceneStyle('aiCommandHub', 0x0b0f19, 0x0b0f19, 0.0016);
      this.aiCommandHubScene.background = style.background;
      this.aiCommandHubScene.fog = style.fog;
      if (this.exteriorVista?.group) this.exteriorVista.group.visible = false;
      if (this.truyenKieuRoom) this.truyenKieuRoom.visible = false;
      if (this.thanhGiongRoom) this.thanhGiongRoom.visible = false;
      if (this.sonTinhThuyTinhRoom) this.sonTinhThuyTinhRoom.visible = false;
      if (this.namQuocSonHaRoom) this.namQuocSonHaRoom.visible = false;
      if (this.anDuongVuongRoom) this.anDuongVuongRoom.visible = false;
      if (this.voNhatRoom) this.voNhatRoom.visible = false;
      if (this.tatDenRoom) this.tatDenRoom.visible = false;
      if (this.namXuongRoom) this.namXuongRoom.visible = false;
      if (this.dayThonViDaRoom) this.dayThonViDaRoom.visible = false;
      if (this.museumCrowd?.crowdGroup) this.museumCrowd.crowdGroup.visible = false;
    } else if (scene === this.catVillageScene) {
      const style = this._getCachedSceneStyle('catVillage', 0x0d111a, 0x0d111a, 0.0018);
      this.catVillageScene.background = style.background;
      this.catVillageScene.fog = style.fog;
      if (this.exteriorVista?.group) this.exteriorVista.group.visible = false;
      if (this.truyenKieuRoom) this.truyenKieuRoom.visible = false;
      if (this.thanhGiongRoom) this.thanhGiongRoom.visible = false;
      if (this.sonTinhThuyTinhRoom) this.sonTinhThuyTinhRoom.visible = false;
      if (this.namQuocSonHaRoom) this.namQuocSonHaRoom.visible = false;
      if (this.anDuongVuongRoom) this.anDuongVuongRoom.visible = false;
      if (this.voNhatRoom) this.voNhatRoom.visible = false;
      if (this.tatDenRoom) this.tatDenRoom.visible = false;
      if (this.namXuongRoom) this.namXuongRoom.visible = false;
      if (this.dayThonViDaRoom) this.dayThonViDaRoom.visible = false;
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
      if (this.namXuongRoom) this.namXuongRoom.visible = false;
      if (this.dayThonViDaRoom) this.dayThonViDaRoom.visible = false;
      if (this.museumCrowd?.crowdGroup) this.museumCrowd.crowdGroup.visible = false;
    }

    if (this.renderer) {
      if (this.renderer.shadowMap) {
        // Luôn giữ shadowMap.enabled = true để tránh lỗi WebGL texture format mismatch khi chuyển Scene
        this.renderer.shadowMap.autoUpdate = (scene === this.mainScene || scene === this.namXuongScene || scene === this.dayThonViDaScene);
      }
    }

    if (scene !== this.mainScene && scene !== this.aiCommandHubScene && scene !== this.catVillageScene && this.renderer && this.camera) {
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
      if (this.aiCommandHubWorld) {
        this.aiCommandHubWorld.setAudioManager(this.audioManager);
      }
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
        walkableFloors: [
          this.atriumGroup,
          this.namQuocSonHaRoom,
          this.thanhGiongRoom,
          ...(this.namXuongRoom?.userData?.walkableFloors?.length
            ? this.namXuongRoom.userData.walkableFloors
            : [this.namXuongRoom]),
          ...(this.dayThonViDaRoom?.userData?.walkableFloors?.length
            ? this.dayThonViDaRoom.userData.walkableFloors
            : [this.dayThonViDaRoom])
        ].filter(Boolean)
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
        this.roomGenerator.getGroup().visible = true;
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
          roomCenter: getRoomCenterVector('truyen_kieu')
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
        skylightApex: 32.0,
        hitboxManager: this.hitboxManager,
        audioManager: this.audioManager,
        spatialAudio: this.immersionSystem?.spatialAudio,
        loreGuide: this.immersionSystem?.loreGuide
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
      if (this.lobbyDecorator?.registerHitboxes) {
        this.lobbyDecorator.registerHitboxes(this.hitboxManager);
      }
      // Đồng bộ Camera & Renderer vào Thế Giới Đảo Mèo & Căn Cứ AI
      if (this.catVillageWorld) {
        this.catVillageWorld.camera = this.camera;
        this.catVillageWorld.renderer = this.renderer;
        this.catVillageWorld.cameraManager = this.cameraManager;
      }
      if (this.aiCommandHubWorld) {
        this.aiCommandHubWorld.camera = this.camera;
        this.aiCommandHubWorld.renderer = this.renderer;
        this.aiCommandHubWorld.cameraManager = this.cameraManager;
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
      if (this.directorPanel && this.dayThonViDaRoom) {
        this.directorPanel.setDayThonViDaRoom?.(this.dayThonViDaRoom);
      }
      if (this.directorPanel && this.namXuongRoom) {
        this.directorPanel.setNamXuongRoom?.(this.namXuongRoom);
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
        if (worldId === 'day_thon_vi_da' || worldId === 'daythonvida' || meta?.targetRealm === 'DAY_THON_VI_DA_REALM') {
          if (this.dayThonViDaRoom?.enterRealm) {
            this.dayThonViDaRoom.enterRealm('day_thon_vi_da');
            return true;
          }
        }
        if (worldId === 'nguoi_con_gai_nam_xuong' || worldId === 'nam_xuong' || worldId === 'namxuong' || meta?.targetRealm === 'NAM_XUONG_REALM') {
          if (this.namXuongRoom?.enterRealm) {
            this.namXuongRoom.enterRealm('nguoi_con_gai_nam_xuong');
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
            portalReady: false, // 🔒 Tạm phong ấn – realm đang tu bổ
            onActivate: () => {
              this.anDuongVuongRoom.enterRealm?.();
            }
          });
        }
      }

      // Đăng ký Sách Cổ Phòng Vợ Nhặt vào PortalInteraction (Chỉ khi phòng mở)
      if (this.voNhatRoom && !isRoomLocked('vo_nhat')) {
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
            portalReady: false, // 🔒 Tạm phong ấn Cõi Mở Xóm Ngụ Cư
            title: 'VỢ NHẶT (ĐANG PHONG ẤN TU BỔ)',
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

      // Đăng ký Cổng Dịch Chuyển Phòng Đây Thôn Vĩ Dạ vào PortalInteraction
      if (this.dayThonViDaRoom) {
        const viDaPortal = this.dayThonViDaRoom.teleportBook || this.dayThonViDaRoom.userData?.teleportBook;
        if (viDaPortal) {
          this.portalInteraction.registerInteractiveBook(viDaPortal, new THREE.Vector3(0, 2.0, 14.0), {
            id: 'day_thon_vi_da',
            title: 'ĐÂY THÔN VĨ DẠ • CÕI VƯỜN VĨ DẠ & SÔNG TRĂNG',
            author: 'Hàn Mặc Tử (1912 – 1940)',
            genre: 'Thơ Mới (1932 – 1945) • Tầng 3 Phòng 302',
            quote: '“Sao anh không về chơi thôn Vĩ? Nhìn nắng hàng cau nắng mới lên...”',
            themeColor: 0x10b981,
            targetRealm: 'DAY_THON_VI_DA_REALM',
            portalReady: true,
            floor: 3,
            roomIndex: 11,
            onActivate: () => {
              this.dayThonViDaRoom?.enterRealm?.('day_thon_vi_da');
            }
          });
        }
      }

      // Đăng ký Cổng Dịch Chuyển Phòng Người Con Gái Nam Xương vào PortalInteraction
      if (this.namXuongRoom) {
        const namXuongPortal = this.namXuongRoom.teleportBook || this.namXuongRoom.userData?.teleportBook;
        if (namXuongPortal) {
          this.portalInteraction.registerInteractiveBook(namXuongPortal, new THREE.Vector3(0, 1.8, 14.0), {
            id: 'nguoi_con_gai_nam_xuong',
            title: 'CHUYỆN NGƯỜI CON GÁI NAM XƯƠNG • NGUYỄN DỮ',
            author: 'Nguyễn Dữ (Thế kỷ XVI)',
            genre: 'Truyền Kỳ Mạn Lục • Tầng 2 Phòng 204',
            quote: '“Bến Hoàng Giang sóng lạnh khói mờ, chiếc bóng trên vách hóa oan khiên muôn thuở.”',
            themeColor: 0x88aaff,
            targetRealm: 'NAM_XUONG_REALM',
            portalReady: true,
            floor: 2,
            roomIndex: 8,
            onActivate: () => {
              this.namXuongRoom?.enterRealm?.('nguoi_con_gai_nam_xuong');
            }
          });
        }
      }

      // (Đã dọn dẹp Cổng AI cũ để nhường toàn bộ không gian cho Đội Quân Mèo AI & Đảo Mèo Thánh Đường)

      // Đăng ký CỔNG DỊCH CHUYỂN "ĐẢO MÈO THÁNH ĐƯỜNG 3D" tại Đại Sảnh (Grand Lobby)
      try {
        const catPortal = this.buildCatVillagePortalInLobby();
        if (catPortal) {
          this.portalInteraction.registerInteractiveBook(catPortal, null, {
            id: 'cat_village',
            title: 'ĐẢO MÈO THÁNH ĐƯỜNG 3D',
            author: 'Đội Quân 6 Mèo AI Agent • 15 Skills Di Sản',
            genre: 'Diorama Đảo Nổi Isometric • Làng Mèo Cổ Phong',
            quote: '“6 chú mèo chibi lon ton đi dạo qua cầu gỗ, cùng nhau kiến tạo Thánh Đường Văn Học.”',
            themeColor: 0xffaa33,
            targetRealm: 'CAT_VILLAGE_REALM',
            portalReady: true,
            floor: 1,
            roomIndex: 98,
            onActivate: () => {
              this.enterCatVillage();
            }
          });
        }
      } catch (errPortal) {
        console.warn('[CatVillage] Lỗi dựng Cổng tại Đại Sảnh:', errPortal);
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
          hitboxManager: this.hitboxManager,
          portalInteraction: this.portalInteraction,
          audioManager: this.audioManager,
          spatialAudio: this.immersionSystem?.spatialAudio || window.__spatialAudio,
          loreGuide: this.immersionSystem?.loreGuide || window.__loreGuide,
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
      // Kết nối Context sớm cho Phòng Đây Thôn Vĩ Dạ (Portal & Cõi Vườn Vĩ Dạ - Sông Trăng)
      if (this.dayThonViDaRoom?.setupContext) {
        this.dayThonViDaRoom.setupContext({
          scene: this.scene,
          mainScene: this.mainScene,
          realmScene: this.dayThonViDaScene,
          camera: this.camera,
          renderer: this.renderer,
          cameraManager: this.cameraManager,
          hitboxManager: this.hitboxManager,
          loreGuide: this.immersionSystem?.loreGuide || window.__loreGuide,
          spatialAudio: this.immersionSystem?.spatialAudio || window.__spatialAudio,
          audioManager: this.audioManager,
          xrTeleport: this.immersionSystem?.xrTeleport,
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
          if (realmName === 'daythonvida' || realmName === 'day_thon_vi_da' || realmName === 'vida') {
            this.dayThonViDaRoom?.enterRealm?.('day_thon_vi_da');
            return true;
          }
          if (realmName === 'namxuong' || realmName === 'nam_xuong' || realmName === 'nguoi_con_gai_nam_xuong') {
            this.namXuongRoom?.enterRealm?.('nguoi_con_gai_nam_xuong');
            return true;
          }
          if (realmName === 'an_duong_vuong' || realmName === 'anduongvuong' || realmName === 'co_loa' || realmName === 'an_duong_vuong_realm' || realmName === 'an-duong-vuong') {
            const adv = this.anDuongVuongRoom || (typeof window !== 'undefined' ? window.__anDuongVuongRoom : null);
            if (adv?.enterRealm) {
              adv.enterRealm('an_duong_vuong');
              return true;
            }
          }
          if (realmName === 'ai_command_hub' || realmName === 'ai_hub' || realmName === 'swarm_hub' || realmName === 'ai') {
            this.enterAICommandHub();
            return true;
          }
          if (realmName === 'cat_village' || realmName === 'dao_meo' || realmName === 'cat_agent_village' || realmName === 'lang_meo' || realmName === 'cats') {
            this.enterCatVillage();
            return true;
          }
          return false;
        };
        window.enterAICommandHub = () => this.enterAICommandHub();
        window.exitAICommandHub = () => this.exitAICommandHub();
        window.enterCatVillage = () => this.enterCatVillage();
        window.exitCatVillage = () => this.exitCatVillage();
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
      this.anDuongVuongRoom?.setupContext?.(interactiveRoomCtx);
      this.anDuongVuongRoom?.userData?.wireInteractiveSystems?.(interactiveRoomCtx);
      this.roomGenerator?.registerPlaqueHitboxes?.(
        this.hitboxManager,
        interactiveRoomCtx.loreGuide,
        this.cameraManager
      );
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
        this.thanhGiongScene,
        this.dayThonViDaScene
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

    // 13.0. Kết nối Context toàn diện cho Phòng 204 - Chuyện Người Con Gái Nam Xương
    try {
      const namXuongSetup = this.namXuongRoom?.setupContext || this.namXuongRoom?.userData?.setupContext || this.namXuongRoom?.userData?.wireInteractiveSystems;
      if (typeof namXuongSetup === 'function') {
        namXuongSetup({
          scene: this.scene,
          mainScene: this.mainScene,
          realmScene: this.namXuongScene,
          camera: this.camera,
          renderer: this.renderer,
          cameraManager: this.cameraManager,
          hitboxManager: this.hitboxManager,
          loreGuide: this.immersionSystem?.loreGuide || window.__loreGuide,
          spatialAudio: this.immersionSystem?.spatialAudio || window.__spatialAudio,
          audioManager: this.audioManager,
          xrTeleport: this.immersionSystem?.xrTeleport,
          autoTour: this.autoTour,
          portalInteraction: this.portalInteraction,
          immersionSystem: this.immersionSystem
        });
      }
      if (this.hitboxManager) {
        this.collisionObjects = this.hitboxManager.solidBoxes.map(s => s.box);
        this.cameraManager?.setCollisionObjects(this.collisionObjects, this.stairObjects);
      }
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi kết nối Context Phòng Nam Xương:", err);
    }

    // 13.0b. Kết nối Context toàn diện cho Phòng 302 - Đây Thôn Vĩ Dạ
    try {
      const dayThonViDaSetup = this.dayThonViDaRoom?.setupContext || this.dayThonViDaRoom?.userData?.setupContext || this.dayThonViDaRoom?.userData?.wireInteractiveSystems;
      if (typeof dayThonViDaSetup === 'function') {
        dayThonViDaSetup({
          scene: this.scene,
          mainScene: this.mainScene,
          realmScene: this.dayThonViDaScene,
          camera: this.camera,
          renderer: this.renderer,
          cameraManager: this.cameraManager,
          hitboxManager: this.hitboxManager,
          loreGuide: this.immersionSystem?.loreGuide || window.__loreGuide,
          spatialAudio: this.immersionSystem?.spatialAudio || window.__spatialAudio,
          audioManager: this.audioManager,
          xrTeleport: this.immersionSystem?.xrTeleport,
          autoTour: this.autoTour,
          portalInteraction: this.portalInteraction,
          immersionSystem: this.immersionSystem
        });
      }
      if (this.hitboxManager) {
        this.collisionObjects = this.hitboxManager.solidBoxes.map(s => s.box);
        this.cameraManager?.setCollisionObjects(this.collisionObjects, this.stairObjects);
      }
    } catch (err) {
      console.error("[SELF-HEALING] Lỗi kết nối Context Phòng Đây Thôn Vĩ Dạ:", err);
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
    // (Giữ lại SpotLight của Bảng Thông Tin 3D để collectSceneLightsAndCullTargets thu thập vào pool)
    const lightsToRemove = [];
    this.atriumGroup.traverse((child) => {
      if ((child.isPointLight || child.isSpotLight) && !child.userData?.isPlaqueSpotLight) {
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

    // 3. Pool cố định 3 PointLight + 1 SpotLight cho Bảng Thông Tin luôn visible = true (ZERO RUNTIME RECOMPILE)
    if (!this._roomLightPool) {
      this._roomLightPool = [];
      for (let i = 0; i < 3; i++) {
        const pLight = new THREE.PointLight(0xfff1e0, 0.0, 24.0, 1.5);
        pLight.name = `Pooled_Room_PointLight_${i}`;
        pLight.castShadow = false;
        pLight.visible = true;
        pLight.userData = { isPooledLight: true, ignoreRaycaster: true };
        this.mainScene.add(pLight);
        this._roomLightPool.push(pLight);
      }
    }
    if (!this._plaqueSpotLight) {
      const plaqueSpot = new THREE.SpotLight(0xffdf73, 0.0, 6.5, Math.PI / 4, 0.65, 1.5);
      plaqueSpot.name = 'Pooled_Plaque_SpotLight';
      plaqueSpot.castShadow = false;
      plaqueSpot.visible = true;
      plaqueSpot.userData = { isPlaqueSpotLight: true, isPooledLight: true, ignoreRaycaster: true };
      plaqueSpot.target.name = 'Pooled_Plaque_SpotLight_Target';
      plaqueSpot.target.userData = { isPlaqueSpotLight: true, isPooledLight: true, ignoreRaycaster: true };
      this.mainScene.add(plaqueSpot);
      this.mainScene.add(plaqueSpot.target);
      this._plaqueSpotLight = plaqueSpot;
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
   * Bảo toàn castShadow/receiveShadow cho Phòng 204 (Chiaroscuro vách nứa) và Phòng 302 (Nắng ban mai Vĩ Dạ).
   */
  optimizeSubtree(root) {
    if (!root) return 0;
    let count = 0;
    const shouldPreserveShadow = (node) => {
      let cur = node;
      while (cur) {
        if (
          cur === this.namXuongRoom ||
          cur === this.dayThonViDaRoom ||
          cur.userData?.preserveShadow ||
          cur.userData?.isNamXuongShadowLight ||
          cur.userData?.isViDaShadowLight
        ) {
          return true;
        }
        cur = cur.parent;
      }
      return false;
    };
    root.traverse((child) => {
      if (child.isLight) {
        if (
          !child.userData?.isNamXuongShadowLight &&
          !child.userData?.isViDaShadowLight &&
          !child.userData?.preserveShadow
        ) {
          child.castShadow = false;
        }
      }
      if (child.isMesh || child.isPoints || child.isSprite) {
        child.frustumCulled = true;
        if (!shouldPreserveShadow(child)) {
          child.castShadow = false;
          child.receiveShadow = false;
        }
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
      if (!this.hitboxManager.__plaquePreservedWrapped && typeof this.hitboxManager.rebuildAllMuseumHitboxes === 'function') {
        const origRebuild = this.hitboxManager.rebuildAllMuseumHitboxes.bind(this.hitboxManager);
        this.hitboxManager.rebuildAllMuseumHitboxes = (...args) => {
          // Bảo toàn các Proxy của Bảng Thông Tin 3D trước khi clearAllHitboxes dispose geometry/material dùng chung
          if (Array.isArray(this.hitboxManager.clickProxies)) {
            this.hitboxManager.clickProxies = this.hitboxManager.clickProxies.filter(
              (proxy) => !proxy?.userData?.isPlaqueProxy
            );
          }
          const res = origRebuild(...args);
          const guide = this.immersionSystem?.loreGuide || (typeof window !== 'undefined' ? window.__loreGuide : null);
          this.lobbyDecorator?.registerHitboxes?.(this.hitboxManager);
          this.roomGenerator?.registerSolidHitboxes?.(this.hitboxManager);
          this.roomGenerator?.registerPlaqueHitboxes?.(this.hitboxManager, guide, this.cameraManager);
          this.tatDenRoom?.userData?.registerHitboxes?.(this.hitboxManager);
          this.namQuocSonHaRoom?.userData?.registerHitboxes?.(this.hitboxManager);
          this.thanhGiongRoom?.userData?.registerHitboxes?.(this.hitboxManager);
          this.truyenKieuRoom?.userData?.registerHitboxes?.(this.hitboxManager);
          this.sonTinhThuyTinhRoom?.userData?.registerHitboxes?.(this.hitboxManager);
          this.anDuongVuongRoom?.userData?.registerHitboxes?.(this.hitboxManager);
          if (!isRoomLocked('vo_nhat')) this.voNhatRoom?.userData?.registerHitboxes?.(this.hitboxManager);
          (this.namXuongRoom?.registerHitboxes || this.namXuongRoom?.userData?.registerHitboxes)?.(this.hitboxManager);
          (this.dayThonViDaRoom?.registerHitboxes || this.dayThonViDaRoom?.userData?.registerHitboxes)?.(this.hitboxManager);
          return res;
        };
        this.hitboxManager.__plaquePreservedWrapped = true;
      }

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
    this._plaqueLightSpecs = [];
    this._namXuongLights = [];
    this._namXuongCenter = getRoomCenterVector('nguoi_con_gai_nam_xuong');
    this._dayThonViDaLights = [];
    this._dayThonViDaCenter = getRoomCenterVector('day_thon_vi_da');
    this._collectedLights = new WeakSet();
    this._prewarmedTextures = new WeakSet();
    this._tempLightPos = new THREE.Vector3();
    this._tempPlaqueTargetPos = new THREE.Vector3();
    this._lastPrewarmedMeshCount = -1;
    this._roomEntries = [
      {
        key: 'truyenKieu',
        roomId: 'truyen_kieu',
        room: this.truyenKieuRoom,
        center: getRoomCenterVector('truyen_kieu'),
        lightSpecs: [],
        cullableProps: [],
        shouldUpdate: true,
        propsVisible: true,
        updateFn: (d, et, c) => (this.truyenKieuRoom?.update || this.roomDecorator?.update)?.(d, et, c)
      },
      {
        key: 'thanhGiong',
        roomId: 'thanh_giong',
        room: this.thanhGiongRoom,
        center: getRoomCenterVector('thanh_giong'),
        lightSpecs: [],
        cullableProps: [],
        shouldUpdate: true,
        propsVisible: true,
        updateFn: (d, et, c) => (this.thanhGiongRoom?.update || this.thanhGiongRoom?.userData?.update)?.(d, et, c)
      },
      {
        key: 'sonTinh',
        roomId: 'son_tinh_thuy_tinh',
        room: this.sonTinhThuyTinhRoom,
        center: getRoomCenterVector('son_tinh_thuy_tinh'),
        lightSpecs: [],
        cullableProps: [],
        shouldUpdate: true,
        propsVisible: true,
        updateFn: (d, et, c) => this.sonTinhThuyTinhRoom?.update?.(d, et, c)
      },
      {
        key: 'namQuocSonHa',
        roomId: 'nam_quoc_son_ha',
        room: this.namQuocSonHaRoom,
        center: getRoomCenterVector('nam_quoc_son_ha'),
        lightSpecs: [],
        cullableProps: [],
        shouldUpdate: true,
        propsVisible: true,
        updateFn: (d, et, c) => this.namQuocSonHaRoom?.update?.(d, et, c)
      },
      {
        key: 'anDuongVuong',
        roomId: 'an_duong_vuong',
        room: this.anDuongVuongRoom,
        center: getRoomCenterVector('an_duong_vuong'),
        lightSpecs: [],
        cullableProps: [],
        shouldUpdate: true,
        propsVisible: true,
        updateFn: (d, et, c) => this.anDuongVuongRoom?.update?.(d, et, c)
      },
      {
        key: 'voNhat',
        roomId: 'vo_nhat',
        room: this.voNhatRoom,
        center: getRoomCenterVector('vo_nhat'),
        lightSpecs: [],
        cullableProps: [],
        shouldUpdate: true,
        propsVisible: true,
        updateFn: (d, et, c) => this.voNhatRoom?.update?.(d, et, c)
      },
      {
        key: 'tatDen',
        roomId: 'tat_den',
        room: this.tatDenRoom,
        center: getRoomCenterVector('tat_den'),
        lightSpecs: [],
        cullableProps: [],
        shouldUpdate: true,
        propsVisible: true,
        updateFn: (d, et, c) => this.tatDenRoom?.userData?.update?.(d, et, c)
      },
      {
        key: 'namXuong',
        roomId: 'nguoi_con_gai_nam_xuong',
        room: this.namXuongRoom,
        center: this._namXuongCenter,
        lightSpecs: [],
        cullableProps: [],
        shouldUpdate: true,
        propsVisible: true,
        updateFn: (d, et, c) => (this.namXuongRoom?.update || this.namXuongRoom?.userData?.update)?.(d, et, c)
      },
      {
        key: 'dayThonViDa',
        roomId: 'day_thon_vi_da',
        room: this.dayThonViDaRoom,
        center: this._dayThonViDaCenter,
        lightSpecs: [],
        cullableProps: [],
        shouldUpdate: true,
        propsVisible: true,
        updateFn: (d, et, c) => (this.dayThonViDaRoom?.update || this.dayThonViDaRoom?.userData?.update)?.(d, et, c)
      }
    ];

    // Đăng ký thêm 8 gian tiểu cảnh (non-custom) vào registry để Pooled_Room_PointLight thắp sáng đúng tọa độ
    LITERATURE_REGISTRY.forEach((item) => {
      if (CUSTOM_ROOM_IDS.has(item.id)) return;
      this._roomEntries.push({
        key: `alcove_${item.id}`,
        roomId: item.id,
        room: null,
        center: getRoomCenterVector(item.id),
        lightSpecs: [],
        cullableProps: [],
        shouldUpdate: false,
        propsVisible: true,
        updateFn: () => {}
      });
    });
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

    this.mainScene.updateMatrixWorld(true);

    const roomMap = new Map();
    const alcoveEntryMap = new Map();
    for (let i = 0; i < this._roomEntries.length; i++) {
      const entry = this._roomEntries[i];
      for (let p = 0; p < entry.cullableProps.length; p++) {
        const oldProp = entry.cullableProps[p];
        if (oldProp) oldProp.visible = true;
      }
      entry.cullableProps.length = 0;
      if (entry.room) roomMap.set(entry.room, entry);
      if (!entry.room && entry.roomId) alcoveEntryMap.set(entry.roomId, entry);
    }

    const poolSet = new Set(this._roomLightPool || []);
    const lightsToDetach = [];
    this._namXuongLights = this._namXuongLights || [];
    this._namXuongLights.length = 0;
    this._dayThonViDaLights = this._dayThonViDaLights || [];
    this._dayThonViDaLights.length = 0;

    // 1. Ghi nhận thông số đèn phòng/sảnh và tách khỏi scene (chỉ dùng Pool 3 PointLight + 1 Plaque SpotLight cố định)
    // Bảo toàn nguyên vẹn đèn Chiaroscuro/Ánh trăng Phòng 204 & Nắng ban mai/Ánh trăng Phòng 302 (điều khiển theo cự ly)
    this.mainScene.traverse((child) => {
      if (!child.isLight) return;
      if (child.userData?.isNamXuongShadowLight || child.userData?.isNamXuongMoonLight) {
        if (child.userData.baseIntensity === undefined) {
          child.userData.baseIntensity = child.intensity;
        }
        if (!this._namXuongLights.includes(child)) {
          this._namXuongLights.push(child);
        }
        return;
      }
      if (child.userData?.isViDaMorningLight || child.userData?.isViDaMoonLight || child.userData?.isViDaShadowLight) {
        if (child.userData.baseIntensity === undefined) {
          child.userData.baseIntensity = child.intensity;
        }
        if (!this._dayThonViDaLights.includes(child)) {
          this._dayThonViDaLights.push(child);
        }
        return;
      }
      child.castShadow = false;
      if (poolSet.has(child) || child === this._plaqueSpotLight) {
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
        if (child.userData?.isPlaqueSpotLight && child.isSpotLight) {
          child.updateWorldMatrix(true, false);
          child.getWorldPosition(this._tempLightPos);
          if (child.target) {
            child.target.updateWorldMatrix(true, false);
            child.target.getWorldPosition(this._tempPlaqueTargetPos);
          } else {
            this._tempPlaqueTargetPos.copy(this._tempLightPos).add(new THREE.Vector3(0, -1.2, -1.2));
          }
          this._plaqueLightSpecs = this._plaqueLightSpecs || [];
          this._plaqueLightSpecs.push({
            worldPos: this._tempLightPos.clone(),
            targetWorldPos: this._tempPlaqueTargetPos.clone(),
            color: child.color?.getHex?.() ?? 0xffdf73,
            intensity: Math.min(child.intensity ?? 3.2, 4.5),
            distance: child.distance > 0 ? child.distance : 6.0,
            angle: child.angle ?? (Math.PI / 4),
            penumbra: child.penumbra ?? 0.65,
            decay: child.decay ?? 1.5
          });
        } else if (child.isPointLight || child.isSpotLight) {
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
          let targetEntry = ownerEntry;
          if (!targetEntry && typeof child.name === 'string') {
            if (child.name.startsWith('Diorama_PointLight_')) {
              targetEntry = alcoveEntryMap.get(child.name.slice('Diorama_PointLight_'.length)) || null;
            } else if (child.name.startsWith('Diorama_SpotLight_')) {
              targetEntry = alcoveEntryMap.get(child.name.slice('Diorama_SpotLight_'.length)) || null;
            }
          }
          if (targetEntry) {
            targetEntry.lightSpecs.push(spec);
            targetEntry.lightSpecs.sort((a, b) => b.priority - a.priority);
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
        if (
          node.userData?.isNamXuongShadowLight ||
          node.userData?.isNamXuongMoonLight ||
          node.userData?.isViDaMorningLight ||
          node.userData?.isViDaMoonLight ||
          node.userData?.isViDaShadowLight ||
          node.userData?.isLightTarget
        ) return;
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
    const savedNamXuongLightStates = [];
    const savedViDaLightStates = [];
    try {
      if (targetScene === this.mainScene && this._namXuongLights) {
        for (let i = 0; i < this._namXuongLights.length; i++) {
          const nl = this._namXuongLights[i];
          if (!nl) continue;
          savedNamXuongLightStates.push({
            light: nl,
            visible: nl.visible,
            castShadow: nl.castShadow,
            intensity: nl.intensity
          });
          nl.visible = true;
          nl.castShadow = Boolean(nl.userData?.isNamXuongShadowLight);
          nl.intensity = nl.userData?.baseIntensity ?? (nl.userData?.isNamXuongShadowLight ? 32.0 : 1.35);
        }
      }
      if (targetScene === this.mainScene && this._dayThonViDaLights) {
        for (let i = 0; i < this._dayThonViDaLights.length; i++) {
          const vl = this._dayThonViDaLights[i];
          if (!vl) continue;
          savedViDaLightStates.push({
            light: vl,
            visible: vl.visible,
            castShadow: vl.castShadow,
            intensity: vl.intensity
          });
          vl.visible = true;
          vl.castShadow = Boolean(vl.userData?.isViDaShadowLight);
          vl.intensity = vl.userData?.baseIntensity ?? (vl.userData?.isViDaShadowLight ? 2.4 : 1.45);
        }
      }
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
      if (this._plaqueSpotLight) {
        this._plaqueSpotLight.visible = true;
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
      for (let i = 0; i < savedNamXuongLightStates.length; i++) {
        const s = savedNamXuongLightStates[i];
        s.light.visible = s.visible;
        s.light.castShadow = s.castShadow;
        s.light.intensity = s.intensity;
      }
      for (let i = 0; i < savedViDaLightStates.length; i++) {
        const s = savedViDaLightStates[i];
        s.light.visible = s.visible;
        s.light.castShadow = s.castShadow;
        s.light.intensity = s.intensity;
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
      if (entry.room && !entry.room.visible) {
        entry.room.visible = true;
      }

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

    // 3. Cập nhật Pool 1 SpotLight rọi Bảng Thông Tin 3D gần nhất trên cùng tầng
    if (this._plaqueSpotLight) {
      let nearestPlaqueSpec = null;
      let nearestPlaqueDistSq = 26.0 * 26.0;
      const specs = this._plaqueLightSpecs || [];
      for (let i = 0; i < specs.length; i++) {
        const spec = specs[i];
        const dy = Math.abs(camPos.y - spec.targetWorldPos.y);
        if (dy > 7.0) continue;
        const dx = camPos.x - spec.targetWorldPos.x;
        const dz = camPos.z - spec.targetWorldPos.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq < nearestPlaqueDistSq) {
          nearestPlaqueDistSq = distSq;
          nearestPlaqueSpec = spec;
        }
      }
      if (nearestPlaqueSpec) {
        this._plaqueSpotLight.position.copy(nearestPlaqueSpec.worldPos);
        this._plaqueSpotLight.target.position.copy(nearestPlaqueSpec.targetWorldPos);
        this._plaqueSpotLight.target.updateMatrixWorld();
        this._plaqueSpotLight.updateMatrixWorld();
        this._plaqueSpotLight.color.setHex(nearestPlaqueSpec.color);
        this._plaqueSpotLight.intensity = nearestPlaqueSpec.intensity;
        this._plaqueSpotLight.distance = nearestPlaqueSpec.distance;
        this._plaqueSpotLight.angle = nearestPlaqueSpec.angle;
        this._plaqueSpotLight.penumbra = nearestPlaqueSpec.penumbra;
        this._plaqueSpotLight.decay = nearestPlaqueSpec.decay;
      } else {
        this._plaqueSpotLight.intensity = 0;
      }
      this._plaqueSpotLight.visible = true;
    }

    // 4. Điều khiển Pool đèn Chiaroscuro & Ánh trăng Hoàng Giang (Phòng 204) và Nắng Ban Mai & Sông Trăng (Phòng 302) theo cự ly <= 28m, |dy| <= 6m
    let nearNamXuong = false;
    if (this._namXuongLights && this._namXuongLights.length > 0) {
      const center = this._namXuongCenter || this.namXuongRoom?.position;
      if (center) {
        const dx = camPos.x - center.x;
        const dy = Math.abs(camPos.y - center.y);
        const dz = camPos.z - center.z;
        nearNamXuong = dy <= 6.0 && (dx * dx + dy * dy + dz * dz) <= (28.0 * 28.0);
      }

      for (let i = 0; i < this._namXuongLights.length; i++) {
        const light = this._namXuongLights[i];
        if (!light) continue;
        if (nearNamXuong) {
          const wasHidden = !light.visible;
          light.visible = true;
          if (light.userData?.isNamXuongShadowLight) {
            light.castShadow = true;
          }
          if (wasHidden || light.intensity === 0) {
            light.intensity = light.userData?.baseIntensity ?? (light.userData?.isNamXuongShadowLight ? 32.0 : 1.35);
          }
        } else {
          light.intensity = 0;
          light.visible = false;
          if (light.userData?.isNamXuongShadowLight) {
            light.castShadow = false;
          }
        }
      }
    }

    let nearDayThonViDa = false;
    if (this._dayThonViDaLights && this._dayThonViDaLights.length > 0) {
      const center = this._dayThonViDaCenter || this.dayThonViDaRoom?.position;
      if (center) {
        const dx = camPos.x - center.x;
        const dy = Math.abs(camPos.y - center.y);
        const dz = camPos.z - center.z;
        nearDayThonViDa = dy <= 6.0 && (dx * dx + dy * dy + dz * dz) <= (28.0 * 28.0);
      }

      for (let i = 0; i < this._dayThonViDaLights.length; i++) {
        const light = this._dayThonViDaLights[i];
        if (!light) continue;
        if (nearDayThonViDa) {
          const wasHidden = !light.visible;
          light.visible = true;
          if (light.userData?.isViDaShadowLight) {
            light.castShadow = true;
          }
          if (wasHidden || light.intensity === 0) {
            light.intensity = light.userData?.baseIntensity ?? (light.userData?.isViDaShadowLight ? 2.4 : 1.45);
          }
        } else {
          light.intensity = 0;
          light.visible = false;
          if (light.userData?.isViDaShadowLight) {
            light.castShadow = false;
          }
        }
      }
    }

    if (this.renderer?.shadowMap) {
      this.renderer.shadowMap.autoUpdate = nearNamXuong || nearDayThonViDa;
    }
  }

  initEvents() {
    // Ưu tiên phím ESC đóng Lore Card trước mọi hành vi thoát/menu khác
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' && e.code !== 'Escape') return;
      const guide = this.immersionSystem?.loreGuide || (typeof window !== 'undefined' ? window.__loreGuide : null);
      if (guide?.isOpen) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        guide.hideLoreCard?.();
      }
    }, true);

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
            if (entry.shouldUpdate && typeof entry.updateFn === 'function') {
              entry.updateFn(delta, elapsedTime, this.camera);
              if (entry.key === 'namXuong' || entry.key === 'dayThonViDa') {
                entry._wasUpdating = true;
              }
            } else if (entry.key === 'namXuong' && entry._wasUpdating) {
              this.namXuongRoom?.updateAtmosphere?.(1.0, this.camera);
              entry._wasUpdating = false;
            } else if (entry.key === 'dayThonViDa' && entry._wasUpdating) {
              (this.dayThonViDaRoom?.updateAtmosphere || this.dayThonViDaRoom?.userData?.updateAtmosphere)?.(1.0, this.camera);
              entry._wasUpdating = false;
            }
          }
        }
        this.lobbyDecorator?.updateLobby?.(elapsedTime, delta);
        if (this.ultimate16Skills?.updateAll) {
          this.ultimate16Skills.updateAll(performance.now());
        }


        // Tự động kích hoạt Cổng Đảo Mèo Thánh Đường khi người chơi bước lại gần (cự ly <= 2.2m)
        if (this.catVillageLobbyPortal && this.camera && !this._isTeleportingToCatVillage) {
          const now = performance.now();
          if (!this._lastCatVillageTeleportTime || now - this._lastCatVillageTeleportTime > 4500) {
            this._vTmpCatPortal = this._vTmpCatPortal || new THREE.Vector3();
            this.catVillageLobbyPortal.getWorldPosition(this._vTmpCatPortal);
            if (this.camera.position.distanceTo(this._vTmpCatPortal) <= 2.2) {
              this.enterCatVillage();
            }
          }
          if (this.catVillageLobbyPortal.userData?.updatePortal) {
            this.catVillageLobbyPortal.userData.updatePortal(now * 0.001);
          }
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
      } else if (this.activeScene === this.dayThonViDaScene) {
        (this.dayThonViDaRoom?.updateRealm || this.dayThonViDaRoom?.userData?.updateRealm)?.(delta, elapsedTime, this.camera);
      } else if (this.activeScene === this.namXuongScene) {
        (this.namXuongRoom?.updateRealm || this.namXuongRoom?.userData?.updateRealm)?.(delta, elapsedTime, this.camera);
      } else if (this.activeScene === this.aiCommandHubScene) {
        this.aiCommandHubWorld?.update(delta, elapsedTime, this.camera);
      } else if (this.activeScene === this.catVillageScene) {
        this.catVillageWorld?.update(delta, elapsedTime, this.camera);
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

  /**
   * DỰNG CỔNG DỊCH CHUYỂN "KHU CHỈ HUY ĐỘI QUÂN AI" TẠI ĐẠI SẢNH (GRAND LOBBY)
   */
  buildAICommandHubPortalInLobby() {
    // Đã xóa bỏ hoàn toàn Cổng AI cũ để nhường toàn bộ không gian cho Đội Quân Mèo AI & Đảo Mèo Thánh Đường
    this.aiHubLobbyPortal = null;
    return null;
  }

  /**
   * DỊCH CHUYỂN VÀO KHU CĂN CỨ ĐỘI QUÂN AI
   */
  enterAICommandHub() {
    if (this._isTeleportingToAiHub) return;
    this._isTeleportingToAiHub = true;
    this._lastAiHubTeleportTime = performance.now();
    window.__aiCommandHubActive = true;
    console.log("%c[AI Command Hub] Teleporting into Command Hub...", "color: #00f5d4; font-weight: bold;");

    let overlay = document.getElementById('world-transition-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'world-transition-overlay';
      overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: #000000; opacity: 0; pointer-events: none; z-index: 99999;
        transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1);
      `;
      document.body.appendChild(overlay);
    }

    overlay.style.opacity = '1';

    setTimeout(() => {
      // 1. Lưu lại vị trí camera hiện tại trong sảnh
      if (this.camera) {
        this._savedLobbyCamPos = this.camera.position.clone();
      }

      // 2. Chuyển scene sang Căn Cứ AI
      this.setActiveScene(this.aiCommandHubScene);

      // 3. Đặt camera ở lối vào Căn Cứ AI, nhìn về đài Trống Đồng trung tâm
      if (typeof document !== 'undefined' && document.exitPointerLock) {
        try { document.exitPointerLock(); } catch (_) {}
      }

      const targetPos = new THREE.Vector3(0, 1.8, 28.0);
      const targetLookAt = new THREE.Vector3(0, 2.2, 0);

      if (typeof this.cameraManager?.setCustomView === 'function') {
        this.cameraManager.setCustomView(targetPos, targetLookAt);
      } else if (typeof this.cameraManager?.setPosition === 'function') {
        this.cameraManager.setPosition(targetPos);
        if (typeof this.cameraManager?.setTarget === 'function') {
          this.cameraManager.setTarget(targetLookAt);
        }
      } else if (this.camera) {
        this.camera.position.copy(targetPos);
        this.camera.lookAt(targetLookAt);
      }

      if (this.aiCommandHubWorld) {
        this.aiCommandHubWorld.group.visible = true;
        this.aiCommandHubWorld.isInsideHub = true;
        this.aiCommandHubWorld.onEnterHub?.();
      }

      setTimeout(() => {
        overlay.style.opacity = '0';
        this._isTeleportingToAiHub = false;
        this._lastAiHubTeleportTime = performance.now();
      }, 150);
    }, 850);
  }

  /**
   * DỊCH CHUYỂN TRỞ VỀ ĐẠI SẢNH THÁNH ĐƯỜNG
   */
  exitAICommandHub() {
    if (this._isTeleportingToAiHub) return;
    this._isTeleportingToAiHub = true;
    this._lastAiHubTeleportTime = performance.now();
    console.log("%c[AI Command Hub] Returning to Grand Lobby...", "color: #d4af37; font-weight: bold;");

    let overlay = document.getElementById('world-transition-overlay');
    if (overlay) overlay.style.opacity = '1';

    if (this.aiCommandHubWorld) {
      this.aiCommandHubWorld.closeDialogUI();
      this.aiCommandHubWorld.isInsideHub = false;
      this.aiCommandHubWorld.onExitHub?.();
    }

    setTimeout(() => {
      // Chuyển lại về Sảnh Chính
      window.__aiCommandHubActive = false;
      this.setActiveScene(this.mainScene);

      // Trả vị trí camera về phía trước cổng tại Đại Sảnh (cách tâm cổng >= 3.5m chống loop)
      let returnPos = new THREE.Vector3(12.5, 1.8, 6.0);
      if (this._savedLobbyCamPos) {
        const distToLobbyPortal = Math.hypot(this._savedLobbyCamPos.x - 16.5, this._savedLobbyCamPos.z - 8.0);
        if (distToLobbyPortal >= 3.5) {
          returnPos.copy(this._savedLobbyCamPos);
        }
      }
      const returnLookAt = new THREE.Vector3(0, 2.0, 0);

      if (typeof this.cameraManager?.setCustomView === 'function') {
        this.cameraManager.setCustomView(returnPos, returnLookAt);
      } else if (typeof this.cameraManager?.setPosition === 'function') {
        this.cameraManager.setPosition(returnPos);
        if (typeof this.cameraManager?.setTarget === 'function') {
          this.cameraManager.setTarget(returnLookAt);
        }
      } else if (this.camera) {
        this.camera.position.copy(returnPos);
        this.camera.lookAt(returnLookAt);
      }

      setTimeout(() => {
        if (overlay) overlay.style.opacity = '0';
        this._isTeleportingToAiHub = false;
        this._lastAiHubTeleportTime = performance.now();
      }, 150);
    }, 850);
  }

  /**
   * DỰNG CỔNG LINH MIÊU THIÊN THƯ TẠI ĐẠI SẢNH (GRAND LOBBY)
   * Lối vào Đảo Mèo AI – Xưởng Kiến Tạo Thánh Đường (Diorama Thu Nhỏ ~22m x 22m)
   * Đầy đủ: Khung gỗ lim sơn son thếp vàng, bậc đá xanh Thanh Hóa chạm mây cuộn & dấu chân mèo phát sáng,
   * mái đao cong hình đôi tai mèo, 2 đèn lồng cá chép/cá khô & chuông gió đồng đung đưa,
   * đôi tượng Mèo Đá chầu uy nghi ôm quả cầu ngọc phát sáng tại X = ±2.8m,
   * biển ngọc "ĐẢO MÈO AI – XƯỞNG KIẾN TẠO THÁNH ĐƯỜNG", vòng xoáy linh khí Xanh Ngọc Lục Bảo (#00f5d4) & Vàng Kim (#ffbe55).
   * Kích hoạt kép: Click hoặc bước vào lòng cổng (< 2.2m) chuyển cảnh tức thì, không collider chắn lòng cổng.
   */
  buildCatVillagePortalInLobby() {
    if (!this.atriumGroup) return null;

    const prepGeo = (geo) => {
      if (!geo) return geo;
      geo.computeVertexNormals();
      geo.computeBoundingBox();
      geo.computeBoundingSphere();
      const pos = geo.getAttribute('position');
      if (pos) {
        for (let i = 0; i < pos.count * pos.itemSize; i++) {
          if (Number.isNaN(pos.array[i]) || !Number.isFinite(pos.array[i])) pos.array[i] = 0;
        }
      }
      const norm = geo.getAttribute('normal');
      if (norm) {
        for (let i = 0; i < norm.count * norm.itemSize; i++) {
          if (Number.isNaN(norm.array[i]) || !Number.isFinite(norm.array[i])) norm.array[i] = 0;
        }
      }
      return geo;
    };

    const portalGroup = new THREE.Group();
    portalGroup.name = "CatVillage_Lobby_Portal";
    // Đặt ở vị trí đối xứng trang trọng bên hành lang Tây Nam Đại Sảnh (-16.5, 0, 8.0)
    portalGroup.position.set(-16.5, 0, 8.0);
    portalGroup.rotation.y = Math.PI * 0.65;
    portalGroup.userData.ignoreRaycaster = true;

    // Vật liệu PBR cao cấp chuẩn Di sản Cung đình
    const blueStoneMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.42,
      metalness: 0.15,
      side: THREE.FrontSide
    });
    blueStoneMat.userData = { ignoreRaycaster: true };

    const redLacquerMat = new THREE.MeshStandardMaterial({
      color: 0x7f1d1d,
      roughness: 0.32,
      metalness: 0.28,
      side: THREE.FrontSide
    });
    redLacquerMat.userData = { ignoreRaycaster: true };

    const darkWoodMat = new THREE.MeshStandardMaterial({
      color: 0x2b150c,
      roughness: 0.38,
      metalness: 0.18,
      side: THREE.FrontSide
    });
    darkWoodMat.userData = { ignoreRaycaster: true };

    const goldLeafMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.20,
      metalness: 0.88,
      emissive: 0x78350f,
      emissiveIntensity: 0.25,
      side: THREE.FrontSide
    });
    goldLeafMat.userData = { ignoreRaycaster: true };

    const terracottaRoofMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.52,
      metalness: 0.18,
      side: THREE.FrontSide
    });
    terracottaRoofMat.userData = { ignoreRaycaster: true };

    // 1. BẬC ĐÁ XANH THANH HÓA CHẠM MÂY CUỘN ĐÔNG SƠN & DẤU CHÂN MÈO PHÁT SÁNG
    // CanvasTexture mặt bậc đá chạm khắc hoa văn & chuỗi dấu chân mèo phát sáng
    let stepTex = null;
    if (typeof document !== 'undefined') {
      const stepCanvas = document.createElement('canvas');
      stepCanvas.width = 512;
      stepCanvas.height = 512;
      const sCtx = stepCanvas.getContext('2d');
      if (sCtx) {
        // Nền đá xanh Thanh Hóa vân mây
        const grad = sCtx.createLinearGradient(0, 0, 512, 512);
        grad.addColorStop(0.0, '#1e293b');
        grad.addColorStop(0.5, '#334155');
        grad.addColorStop(1.0, '#1e293b');
        sCtx.fillStyle = grad;
        sCtx.fillRect(0, 0, 512, 512);

        // Viền hoa văn mây cuộn Đông Sơn
        sCtx.strokeStyle = '#64748b';
        sCtx.lineWidth = 6;
        sCtx.strokeRect(12, 12, 488, 488);

        sCtx.strokeStyle = '#94a3b8';
        sCtx.lineWidth = 2;
        sCtx.strokeRect(20, 20, 472, 472);

        // Chuỗi dấu chân mèo nhỏ (Cat Paw Prints 🐾) phát sáng lân tinh Xanh Ngọc (#00f5d4) và Vàng Kim (#ffbe55)
        const drawPaw = (cx, cy, color, rot = 0, scale = 1.0) => {
          sCtx.save();
          sCtx.translate(cx, cy);
          sCtx.rotate(rot);
          sCtx.fillStyle = color;
          sCtx.shadowColor = color;
          sCtx.shadowBlur = 12;

          // Đệm bàn chân chính (main pad)
          sCtx.beginPath();
          sCtx.ellipse(0, 4 * scale, 14 * scale, 11 * scale, 0, 0, Math.PI * 2);
          sCtx.fill();

          // 4 ngón chân nhỏ (toes)
          const toeOffsets = [
            [-12, -9, 4.5],
            [-4, -14, 5.0],
            [4, -14, 5.0],
            [12, -9, 4.5]
          ];
          toeOffsets.forEach(([tx, ty, tr]) => {
            sCtx.beginPath();
            sCtx.arc(tx * scale, ty * scale, tr * scale, 0, Math.PI * 2);
            sCtx.fill();
          });
          sCtx.restore();
        };

        // Chuỗi dấu chân mèo lon ton dẫn thẳng vào lòng cổng
        const pawSteps = [
          [256 - 45, 420, '#00f5d4', -0.1, 0.9],
          [256 + 45, 340, '#ffbe55', 0.1, 0.95],
          [256 - 40, 260, '#00f5d4', -0.05, 1.0],
          [256 + 40, 180, '#ffbe55', 0.08, 1.05],
          [256 - 35, 100, '#00f5d4', -0.02, 1.1],
          [256 + 35, 35, '#ffbe55', 0.05, 1.15]
        ];
        pawSteps.forEach(([px, py, col, rot, sc]) => drawPaw(px, py, col, rot, sc));

        stepTex = new THREE.CanvasTexture(stepCanvas);
        stepTex.colorSpace = THREE.SRGBColorSpace;
        stepTex.generateMipmaps = false;
        stepTex.minFilter = THREE.LinearFilter;
      }
    }

    const stepMat = new THREE.MeshStandardMaterial({
      map: stepTex || null,
      color: 0x475569,
      roughness: 0.38,
      metalness: 0.18,
      side: THREE.FrontSide
    });
    stepMat.userData = { ignoreRaycaster: true };

    // Bậc tam cấp 3 tầng mở rộng
    const stepConfigs = [
      { w: 5.2, h: 0.12, d: 1.6, y: 0.06, z: 0.45 },
      { w: 4.8, h: 0.12, d: 1.3, y: 0.18, z: 0.30 },
      { w: 4.4, h: 0.12, d: 1.0, y: 0.30, z: 0.15 }
    ];
    stepConfigs.forEach((st) => {
      const stepMesh = new THREE.Mesh(
        prepGeo(new THREE.BoxGeometry(st.w, st.h, st.d)),
        [blueStoneMat, blueStoneMat, stepMat, blueStoneMat, blueStoneMat, blueStoneMat]
      );
      stepMesh.position.set(0, st.y, st.z);
      stepMesh.userData.ignoreRaycaster = true;
      stepMesh.userData.isFloor = true;
      portalGroup.add(stepMesh);
    });

    // 2. CHÂN ĐẾ BÁT GIÁC ĐÁ CẨM THẠCH CHẠM HOA SEN (2 TRỤ CỔNG)
    const baseGeo = prepGeo(new THREE.CylinderGeometry(0.52, 0.65, 0.45, 8));
    [-1.8, 1.8].forEach((bx) => {
      const baseMesh = new THREE.Mesh(baseGeo, blueStoneMat);
      baseMesh.position.set(bx, 0.585, 0);
      baseMesh.userData.ignoreRaycaster = true;
      portalGroup.add(baseMesh);

      // Vành hoa sen mạ vàng ở cổ chân cột
      const lotusRim = new THREE.Mesh(
        prepGeo(new THREE.TorusGeometry(0.53, 0.035, 8, 24)),
        goldLeafMat
      );
      lotusRim.rotation.x = Math.PI / 2;
      lotusRim.position.set(bx, 0.81, 0);
      lotusRim.userData.ignoreRaycaster = true;
      portalGroup.add(lotusRim);
    });

    // 3. CỘT TRÒN GỖ LIM SƠN SON THẾP VÀNG (2 CỘT CHÍNH)
    const colGeo = prepGeo(new THREE.CylinderGeometry(0.26, 0.30, 4.6, 24));
    [-1.8, 1.8].forEach((cx) => {
      const colMesh = new THREE.Mesh(colGeo, redLacquerMat);
      colMesh.position.set(cx, 3.11, 0);
      colMesh.userData.ignoreRaycaster = true;
      portalGroup.add(colMesh);

      // Vòng nẹp hoàng kim dát vàng chạm hoa văn
      [1.6, 4.2].forEach((bandY) => {
        const ring = new THREE.Mesh(
          prepGeo(new THREE.TorusGeometry(0.29, 0.035, 12, 24)),
          goldLeafMat
        );
        ring.rotation.x = Math.PI / 2;
        ring.position.set(cx, bandY, 0);
        ring.userData.ignoreRaycaster = true;
        portalGroup.add(ring);
      });
    });

    // 4. XÀ NGANG VÌ KÈO GỖ HOÀNG ĐÀN SƠN SON & ĐẤU CỦNG
    const archGeo = prepGeo(new THREE.BoxGeometry(4.8, 0.42, 0.60));
    const arch = new THREE.Mesh(archGeo, redLacquerMat);
    arch.position.set(0, 5.42, 0);
    arch.userData.ignoreRaycaster = true;
    portalGroup.add(arch);

    // Nẹp vàng xà ngang
    const archTrim = new THREE.Mesh(
      prepGeo(new THREE.BoxGeometry(4.85, 0.08, 0.64)),
      goldLeafMat
    );
    archTrim.position.set(0, 5.20, 0);
    archTrim.userData.ignoreRaycaster = true;
    portalGroup.add(archTrim);

    // Đấu củng gỗ sơn mài đỡ mái
    [-1.8, 0, 1.8].forEach((bx) => {
      const bracket = new THREE.Mesh(
        prepGeo(new THREE.BoxGeometry(0.48, 0.28, 0.72)),
        goldLeafMat
      );
      bracket.position.set(bx, 5.65, 0);
      bracket.userData.ignoreRaycaster = true;
      portalGroup.add(bracket);
    });

    // 5. MÁI NGÓI ĐAO CONG HÌNH ĐÔI TAI MÈO 2 TẦNG CHỒNG DIÊM
    // Mái hạ
    const lowerRoof = new THREE.Mesh(
      prepGeo(new THREE.ConeGeometry(3.8, 0.90, 4)),
      terracottaRoofMat
    );
    lowerRoof.rotation.y = Math.PI / 4;
    lowerRoof.scale.set(1.25, 1.0, 0.68);
    lowerRoof.position.set(0, 6.05, 0);
    lowerRoof.userData.ignoreRaycaster = true;
    portalGroup.add(lowerRoof);

    // Cổ diêm giữa 2 tầng mái
    const attic = new THREE.Mesh(
      prepGeo(new THREE.BoxGeometry(3.2, 0.38, 1.2)),
      redLacquerMat
    );
    attic.position.set(0, 6.55, 0);
    attic.userData.ignoreRaycaster = true;
    portalGroup.add(attic);

    // Mái thượng
    const upperRoof = new THREE.Mesh(
      prepGeo(new THREE.ConeGeometry(2.8, 0.85, 4)),
      terracottaRoofMat
    );
    upperRoof.rotation.y = Math.PI / 4;
    upperRoof.scale.set(1.22, 1.0, 0.68);
    upperRoof.position.set(0, 7.05, 0);
    upperRoof.userData.ignoreRaycaster = true;
    portalGroup.add(upperRoof);

    // BỜ ĐAO CONG VÚT TẠO HÌNH ĐÔI TAI MÈO HOÀNG KIM (Left Ear & Right Ear)
    const earGeo = prepGeo(new THREE.ConeGeometry(0.42, 0.90, 4));
    const leftEar = new THREE.Mesh(earGeo, goldLeafMat);
    leftEar.position.set(-1.10, 7.78, 0);
    leftEar.rotation.z = 0.25;
    leftEar.userData.ignoreRaycaster = true;
    portalGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, goldLeafMat);
    rightEar.position.set(1.10, 7.78, 0);
    rightEar.rotation.z = -0.25;
    rightEar.userData.ignoreRaycaster = true;
    portalGroup.add(rightEar);

    // Viên ngọc linh khí hồ phách phát sáng rực rỡ trên đỉnh mái
    const gemMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00f5d4,
      emissiveIntensity: 1.2,
      roughness: 0.1,
      metalness: 0.9
    });
    const gemMesh = new THREE.Mesh(
      prepGeo(new THREE.SphereGeometry(0.28, 24, 24)),
      gemMat
    );
    gemMesh.position.set(0, 7.65, 0);
    gemMesh.userData.ignoreRaycaster = true;
    portalGroup.add(gemMesh);

    // 6. DƯỚI HIÊN TREO 2 ĐÈN LỒNG HÌNH CÁ CHÉP/CÁ KHÔ & CHUÔNG GIÓ ĐỒNG
    const fishLanterns = [];
    const windChimes = [];

    [-2.4, 2.4].forEach((lx, idx) => {
      const fishGroup = new THREE.Group();
      fishGroup.position.set(lx, 4.2, 0.1);
      fishGroup.userData.ignoreRaycaster = true;

      // Thân cá gỗ mộc chạm lộng
      const fishBody = new THREE.Mesh(
        prepGeo(new THREE.ConeGeometry(0.22, 0.65, 8).rotateZ(Math.PI / 2)),
        new THREE.MeshStandardMaterial({
          color: idx === 0 ? 0xffbe55 : 0x00f5d4,
          emissive: idx === 0 ? 0xd97706 : 0x0d9488,
          emissiveIntensity: 0.85,
          roughness: 0.35
        })
      );
      fishBody.userData.ignoreRaycaster = true;
      fishGroup.add(fishBody);

      // Đuôi cá tam giác
      const fishTail = new THREE.Mesh(
        prepGeo(new THREE.ConeGeometry(0.18, 0.35, 3).rotateZ(-Math.PI / 2)),
        goldLeafMat
      );
      fishTail.position.set(0.40, 0, 0);
      fishTail.userData.ignoreRaycaster = true;
      fishGroup.add(fishTail);

      // Mắt cá ngọc
      [-0.06, 0.06].forEach((zEye) => {
        const eye = new THREE.Mesh(
          prepGeo(new THREE.SphereGeometry(0.04, 8, 8)),
          new THREE.MeshBasicMaterial({ color: 0x0f172a })
        );
        eye.position.set(-0.20, 0.05, zEye);
        eye.userData.ignoreRaycaster = true;
        fishGroup.add(eye);
      });

      // Dây treo rủ từ mái
      const cord = new THREE.Mesh(
        prepGeo(new THREE.CylinderGeometry(0.012, 0.012, 1.1, 4)),
        goldLeafMat
      );
      cord.position.set(0, 0.55, 0);
      cord.userData.ignoreRaycaster = true;
      fishGroup.add(cord);

      // Chuông gió đồng nhỏ treo dưới bụng cá
      const bell = new THREE.Mesh(
        prepGeo(new THREE.ConeGeometry(0.08, 0.14, 8)),
        goldLeafMat
      );
      bell.position.set(0, -0.25, 0);
      bell.userData.ignoreRaycaster = true;
      fishGroup.add(bell);

      // Lá chuông hình chân mèo đung đưa
      const pawPendant = new THREE.Mesh(
        prepGeo(new THREE.BoxGeometry(0.06, 0.08, 0.015)),
        goldLeafMat
      );
      pawPendant.position.set(0, -0.38, 0);
      pawPendant.userData.ignoreRaycaster = true;
      fishGroup.add(pawPendant);

      // Nguồn sáng ấm hắt từ đèn cá
      const pLight = new THREE.PointLight(idx === 0 ? 0xffbe55 : 0x00f5d4, 1.2, 7.0);
      pLight.position.set(0, 0, 0);
      pLight.userData.ignoreRaycaster = true;
      fishGroup.add(pLight);

      portalGroup.add(fishGroup);
      fishLanterns.push(fishGroup);
    });

    // 7. ĐÔI TƯỢNG MÈO ĐÁ CHẦU UY NGHI TRÊN BỆ SEN ĐÁ ÔM QUẢ CẦU NGỌC PHÁT SÁNG TẠI X = ±2.8m
    [-2.8, 2.8].forEach((statueX, sIdx) => {
      const statueGroup = new THREE.Group();
      statueGroup.position.set(statueX, 0.36, 0.35);
      statueGroup.rotation.y = statueX < 0 ? 0.35 : -0.35; // Chầu hướng nhẹ vào tâm đường dẫn
      statueGroup.userData.ignoreRaycaster = true;

      // Bệ sen đá bát giác 2 tầng
      const pedestalBase = new THREE.Mesh(
        prepGeo(new THREE.CylinderGeometry(0.48, 0.58, 0.32, 8)),
        blueStoneMat
      );
      pedestalBase.position.set(0, 0.16, 0);
      pedestalBase.userData.ignoreRaycaster = true;
      statueGroup.add(pedestalBase);

      const pedestalLotus = new THREE.Mesh(
        prepGeo(new THREE.CylinderGeometry(0.42, 0.48, 0.20, 8)),
        blueStoneMat
      );
      pedestalLotus.position.set(0, 0.42, 0);
      pedestalLotus.userData.ignoreRaycaster = true;
      statueGroup.add(pedestalLotus);

      // Nẹp viền vàng đài sen
      const lotusRim = new THREE.Mesh(
        prepGeo(new THREE.TorusGeometry(0.44, 0.025, 6, 16)),
        goldLeafMat
      );
      lotusRim.rotation.x = Math.PI / 2;
      lotusRim.position.set(0, 0.52, 0);
      lotusRim.userData.ignoreRaycaster = true;
      statueGroup.add(lotusRim);

      // Thân Linh Miêu Đá ngồi chầu oai nghiêm (Đá xanh Thanh Hóa bo góc mịn)
      const catBody = new THREE.Mesh(
        prepGeo(new THREE.CylinderGeometry(0.24, 0.32, 0.75, 18)),
        blueStoneMat
      );
      catBody.position.set(0, 0.90, 0);
      catBody.userData.ignoreRaycaster = true;
      statueGroup.add(catBody);

      // Đầu mèo đá uy nghi tròn trịa
      const catHead = new THREE.Mesh(
        prepGeo(new THREE.SphereGeometry(0.24, 20, 18)),
        blueStoneMat
      );
      catHead.position.set(0, 1.40, 0.04);
      catHead.userData.ignoreRaycaster = true;
      statueGroup.add(catHead);

      // Mắt ngọc phát sáng linh miêu (almond jade eyes)
      [-0.08, 0.08].forEach((mx) => {
        const catEye = new THREE.Mesh(
          prepGeo(new THREE.SphereGeometry(0.035, 10, 10)),
          new THREE.MeshStandardMaterial({
            color: sIdx === 0 ? 0x00f5d4 : 0xfde047,
            emissive: sIdx === 0 ? 0x00f5d4 : 0xfde047,
            emissiveIntensity: 1.2,
            roughness: 0.1
          })
        );
        catEye.position.set(mx, 1.44, 0.24);
        catEye.scale.set(1.4, 0.9, 0.8);
        catEye.userData.ignoreRaycaster = true;
        statueGroup.add(catEye);
      });

      // Mũi nhỏ thếp vàng
      const catNose = new THREE.Mesh(
        prepGeo(new THREE.ConeGeometry(0.025, 0.03, 3)),
        goldLeafMat
      );
      catNose.position.set(0, 1.38, 0.27);
      catNose.rotation.x = Math.PI;
      catNose.userData.ignoreRaycaster = true;
      statueGroup.add(catNose);

      // Đuôi mèo đá cuộn duyên dáng bên chân
      const catTail = new THREE.Mesh(
        prepGeo(new THREE.TorusGeometry(0.26, 0.045, 8, 20, Math.PI * 1.2)),
        blueStoneMat
      );
      catTail.position.set(statueX < 0 ? -0.16 : 0.16, 0.62, 0.05);
      catTail.rotation.x = Math.PI / 2;
      catTail.rotation.z = statueX < 0 ? 0.3 : -0.3;
      catTail.userData.ignoreRaycaster = true;
      statueGroup.add(catTail);

      // Đôi tai mèo đá vểnh
      [-0.14, 0.14].forEach((ex) => {
        const ear = new THREE.Mesh(
          prepGeo(new THREE.ConeGeometry(0.08, 0.20, 6)),
          blueStoneMat
        );
        ear.position.set(ex, 1.62, 0.04);
        ear.rotation.z = ex < 0 ? 0.25 : -0.25;
        ear.userData.ignoreRaycaster = true;
        statueGroup.add(ear);
      });

      // Vòng lục lạc vàng đeo cổ
      const collar = new THREE.Mesh(
        prepGeo(new THREE.TorusGeometry(0.22, 0.03, 8, 16)),
        goldLeafMat
      );
      collar.rotation.x = Math.PI / 2;
      collar.position.set(0, 1.25, 0.02);
      collar.userData.ignoreRaycaster = true;
      statueGroup.add(collar);

      const bellPendant = new THREE.Mesh(
        prepGeo(new THREE.SphereGeometry(0.05, 8, 8)),
        goldLeafMat
      );
      bellPendant.position.set(0, 1.18, 0.24);
      bellPendant.userData.ignoreRaycaster = true;
      statueGroup.add(bellPendant);

      // Quả Cầu Ngọc phát sáng linh khí ôm trước hai chân
      const orbColor = sIdx === 0 ? 0x00f5d4 : 0xffbe55;
      const orbMat = new THREE.MeshStandardMaterial({
        color: orbColor,
        emissive: orbColor,
        emissiveIntensity: 1.4,
        roughness: 0.1,
        metalness: 0.8
      });
      const orbMesh = new THREE.Mesh(
        prepGeo(new THREE.SphereGeometry(0.18, 16, 16)),
        orbMat
      );
      orbMesh.position.set(0, 0.82, 0.26);
      orbMesh.userData.ignoreRaycaster = true;
      statueGroup.add(orbMesh);

      const orbLight = new THREE.PointLight(orbColor, 1.1, 5.0);
      orbLight.position.set(0, 0.82, 0.26);
      orbLight.userData.ignoreRaycaster = true;
      statueGroup.add(orbLight);

      portalGroup.add(statueGroup);
    });

    // 8. BIỂN HOÀNH PHI SƠN MÀI THẾP VÀNG: "CỔNG LINH MIÊU • ĐẢO MÈO AI"
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Nền sơn mài đỏ then son cung đình quý phái
        const g = ctx.createLinearGradient(0, 0, 720, 200);
        g.addColorStop(0.0, '#1c0707');
        g.addColorStop(0.3, '#3b0a0a');
        g.addColorStop(0.7, '#240606');
        g.addColorStop(1.0, '#120303');
        ctx.fillStyle = g;
        ctx.roundRect(8, 8, 704, 184, 14);
        ctx.fill();

        // Khung gỗ mun thếp vàng chạm hoa văn Đông Sơn
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 6;
        ctx.roundRect(12, 12, 696, 176, 12);
        ctx.stroke();

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.roundRect(22, 22, 676, 156, 8);
        ctx.stroke();

        // Chữ Hoành Phi thếp vàng cung đình
        ctx.font = 'bold 22px "Times New Roman", serif';
        ctx.fillStyle = '#fde047';
        ctx.textAlign = 'center';
        ctx.fillText('❖ CỔNG LINH MIÊU THIÊN THƯ ❖', 360, 52);

        ctx.font = 'bold 28px "Times New Roman", serif';
        ctx.fillStyle = '#fef08a';
        ctx.shadowColor = '#d97706';
        ctx.shadowBlur = 10;
        ctx.fillText('🐾 ĐẢO MÈO AI – THÁNH ĐƯỜNG 🐾', 360, 102);

        ctx.shadowColor = 'transparent';
        ctx.font = 'italic 18px "Times New Roman", serif';
        ctx.fillStyle = '#6ee7b7';
        ctx.fillText('Xưởng Sáng Tạo Của 6 Chiến Binh Mèo AI Swarm', 360, 148);

        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;

        const signGeo = prepGeo(new THREE.PlaneGeometry(2.35, 0.68));
        const signMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(0, 4.45, 0.32);
        sign.userData.ignoreRaycaster = true;
        portalGroup.add(sign);
      }
    }

    // 9. VÒNG XOÁY LINH KHÍ XANH NGỌC LỤC BẢO PHA VÀNG KIM (#00f5d4 & #ffbe55)
    let vortexTex = null;
    if (typeof document !== 'undefined') {
      const vCanvas = document.createElement('canvas');
      vCanvas.width = 512;
      vCanvas.height = 512;
      const vCtx = vCanvas.getContext('2d');
      if (vCtx) {
        const cx = 256;
        const cy = 256;
        // Gradient tâm phát quang
        const radG = vCtx.createRadialGradient(cx, cy, 20, cx, cy, 250);
        radG.addColorStop(0.0, '#ffffff');
        radG.addColorStop(0.2, '#00f5d4');
        radG.addColorStop(0.5, '#0d9488');
        radG.addColorStop(0.8, '#ffbe55');
        radG.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
        vCtx.fillStyle = radG;
        vCtx.fillRect(0, 0, 512, 512);

        // 8 Dải xoắn ốc linh khí giao hòa
        const numArms = 8;
        for (let a = 0; a < numArms; a++) {
          const baseAng = (a / numArms) * Math.PI * 2;
          vCtx.beginPath();
          for (let r = 20; r < 240; r += 4) {
            const ang = baseAng + r * 0.025;
            const x = cx + Math.cos(ang) * r;
            const y = cy + Math.sin(ang) * r;
            if (r === 20) vCtx.moveTo(x, y);
            else vCtx.lineTo(x, y);
          }
          vCtx.strokeStyle = a % 2 === 0 ? 'rgba(0, 245, 212, 0.75)' : 'rgba(255, 190, 85, 0.75)';
          vCtx.lineWidth = 10;
          vCtx.stroke();
        }

        vortexTex = new THREE.CanvasTexture(vCanvas);
        vortexTex.colorSpace = THREE.SRGBColorSpace;
        vortexTex.minFilter = THREE.LinearFilter;
        vortexTex.generateMipmaps = false;
      }
    }

    const vortexGeo = prepGeo(new THREE.CircleGeometry(1.65, 32));
    const vortexMat = new THREE.MeshBasicMaterial({
      map: vortexTex || null,
      color: 0xffffff,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const vortexMesh = new THREE.Mesh(vortexGeo, vortexMat);
    vortexMesh.position.set(0, 2.75, 0);
    vortexMesh.userData.ignoreRaycaster = true;
    portalGroup.add(vortexMesh);

    // Hào quang linh khí rọi sáng tâm cổng
    const portalGlow = new THREE.PointLight(0x00f5d4, 2.5, 9.0);
    portalGlow.position.set(0, 2.75, 0.4);
    portalGlow.userData.ignoreRaycaster = true;
    portalGroup.add(portalGlow);

    // 9.2. HẠT DẤU CHÂN MÈO PHÁT SÁNG & ĐOM ĐÓM LƠ LỬNG QUANH CỔNG (MUNTHAPDEN)
    const pawAuraRes = createCatPawAndFireflyAura({ radius: 2.2, count: 32 });
    pawAuraRes.auraGroup.position.set(0, 2.75, 0);
    portalGroup.add(pawAuraRes.auraGroup);

    // 10. INVISIBLE PROXY HITBOX CHO CỔNG ĐẢO MÈO (KÍCH HOẠT KÉP: CLICK & BƯỚC VÀO)
    // Không cản trở người chơi bước qua (isSolid = false, không collider cản)
    const hitboxGeo = prepGeo(new THREE.BoxGeometry(3.6, 5.0, 2.4));
    const hitboxMat = new THREE.MeshBasicMaterial({
      color: 0x00f5d4,
      transparent: true,
      opacity: 0.0,
      depthWrite: false
    });
    const hitbox = new THREE.Mesh(hitboxGeo, hitboxMat);
    hitbox.position.set(0, 2.75, 0);
    hitbox.userData = {
      isInteractiveBook: true,
      id: 'cat_village',
      title: 'ĐẢO MÈO AI – XƯỞNG KIẾN TẠO THÁNH ĐƯỜNG',
      onActivate: () => this.enterCatVillage(),
      updatePortal: (timeSec) => {
        // Xoay nhẹ nhàng vòng xoáy linh khí
        vortexMesh.rotation.z = timeSec * 0.45;
        pawAuraRes.updateAura(timeSec);
        // Đèn cá & chuông gió đung đưa theo gió
        fishLanterns.forEach((fg, idx) => {
          fg.rotation.z = Math.sin(timeSec * 1.8 + idx * Math.PI) * 0.06;
          fg.rotation.x = Math.cos(timeSec * 1.4 + idx * Math.PI) * 0.04;
        });
      }
    };
    portalGroup.add(hitbox);

    this.atriumGroup.add(portalGroup);
    this.catVillageLobbyPortal = hitbox;
    return hitbox;
  }

  /**
   * DỊCH CHUYỂN VÀO ĐẢO MÈO THÁNH ĐƯỜNG 3D
   */
  enterCatVillage() {
    if (this._isTeleportingToCatVillage) return;
    this._isTeleportingToCatVillage = true;
    this._lastCatVillageTeleportTime = performance.now();
    window.__catVillageActive = true;
    console.log("%c[Cat Village] Teleporting into Cat Agent Village...", "color: #ffaa33; font-weight: bold;");

    let overlay = document.getElementById('world-transition-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'world-transition-overlay';
      overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: #000000; opacity: 0; pointer-events: none; z-index: 99999;
        transition: opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1);
      `;
      document.body.appendChild(overlay);
    }

    overlay.style.opacity = '1';

    setTimeout(() => {
      // 1. Lưu lại vị trí camera hiện tại trong sảnh
      if (this.camera) {
        this._savedLobbyCamPosCat = this.camera.position.clone();
      }

      // 2. Chuyển scene sang Đảo Mèo
      this.setActiveScene(this.catVillageScene);

      // 3. Đặt camera ở góc Isometric nhìn toàn cảnh đảo nổi
      if (typeof document !== 'undefined' && document.exitPointerLock) {
        try { document.exitPointerLock(); } catch (_) {}
      }

      const targetPos = new THREE.Vector3(26.0, 24.0, 26.0);
      const targetLookAt = new THREE.Vector3(0, 1.5, 0);

      if (typeof this.cameraManager?.setCustomView === 'function') {
        this.cameraManager.setCustomView(targetPos, targetLookAt);
      } else if (typeof this.cameraManager?.setPosition === 'function') {
        this.cameraManager.setPosition(targetPos);
        if (typeof this.cameraManager?.setTarget === 'function') {
          this.cameraManager.setTarget(targetLookAt);
        }
      } else if (this.camera) {
        this.camera.position.copy(targetPos);
        this.camera.lookAt(targetLookAt);
      }

      if (this.catVillageWorld) {
        this.catVillageWorld._isReturning = false;
        this.catVillageWorld._lastEnterTime = performance.now();
        this.catVillageWorld.group.visible = true;
        this.catVillageWorld.isInsideVillage = true;
        this.catVillageWorld.showUI?.();
      }

      setTimeout(() => {
        overlay.style.opacity = '0';
        this._isTeleportingToCatVillage = false;
        this._lastCatVillageTeleportTime = performance.now();
      }, 150);
    }, 850);
  }

  /**
   * DỊCH CHUYỂN TRỞ VỀ ĐẠI SẢNH THÁNH ĐƯỜNG TỪ ĐẢO MÈO
   */
  exitCatVillage() {
    if (this._isTeleportingToCatVillage) return;
    this._isTeleportingToCatVillage = true;
    this._lastCatVillageTeleportTime = performance.now();
    console.log("%c[Cat Village] Returning to Grand Lobby...", "color: #ffaa33; font-weight: bold;");

    let overlay = document.getElementById('world-transition-overlay');
    if (overlay) overlay.style.opacity = '1';

    if (this.catVillageWorld) {
      this.catVillageWorld.hideUI?.();
      this.catVillageWorld.isInsideVillage = false;
    }

    setTimeout(() => {
      // Chuyển lại về Sảnh Chính
      window.__catVillageActive = false;
      this.setActiveScene(this.mainScene);

      // Trả vị trí camera về sảnh chính ở vị trí an toàn tuyệt đối (X = -9.5, Y = 1.8, Z = 3.5), cách cổng (-16.5, 8.0) > 8.3m để chống loop 100%
      const returnPos = new THREE.Vector3(-9.5, 1.8, 3.5);
      const returnLookAt = new THREE.Vector3(0, 2.0, 0);

      if (typeof this.cameraManager?.setCustomView === 'function') {
        this.cameraManager.setCustomView(returnPos, returnLookAt);
      } else if (typeof this.cameraManager?.setPosition === 'function') {
        this.cameraManager.setPosition(returnPos);
        if (typeof this.cameraManager?.setTarget === 'function') {
          this.cameraManager.setTarget(returnLookAt);
        }
      } else if (this.camera) {
        this.camera.position.copy(returnPos);
        this.camera.lookAt(returnLookAt);
      }

      setTimeout(() => {
        if (overlay) overlay.style.opacity = '0';
        this._isTeleportingToCatVillage = false;
        this._lastCatVillageTeleportTime = performance.now();
      }, 150);
    }, 850);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new LiteratureCathedralApp();
});
