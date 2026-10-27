import * as THREE from 'three';
import { AudioManager, SURFACE_TYPES } from './AudioManager.js';

/**
 * SPATIAL AUDIO MODULE (COMPATIBILITY WRAPPER FOR AUDIOMANAGER)
 * Tương thích ngược toàn diện với Giai đoạn 3 & 4, ủy quyền toàn bộ cho AudioManager.
 */

export class SpatialAudio {
  constructor(camera = null, options = {}) {
    this.camera = camera;
    this.audioManager = options.audioManager || new AudioManager(camera, options);
    this.listener = this.audioManager.listener;
    this.streamPositionalAudio = this.audioManager.streamAudio;
    this.ambientSound = this.audioManager.kieuBgm;
  }

  initListener() {
    // Đã được khởi tạo bởi AudioManager
  }

  initAutoplayUnlock() {
    // Đã được quản lý bởi AudioManager
  }

  initAmbientSound() {
    // Đã được khởi tạo bởi AudioManager
  }

  attachStreamAudio(streamMesh) {
    this.audioManager?.attachStreamAudio?.(streamMesh);
  }

  attachDamTienAudio(graveGroup) {
    this.audioManager?.attachDamTienAudio?.(graveGroup);
  }

  play() {
    this.audioManager?.startKieuWorldAudio?.();
  }

  pause() {
    try {
      this.audioManager?.streamAudio?.pause?.();
      this.audioManager?.damTienAudio?.pause?.();
    } catch (e) {}
  }

  setVolume(vol = 0.5) {
    this.audioManager?.setMasterVolume?.(vol);
  }
}

export { AudioManager, SURFACE_TYPES };
