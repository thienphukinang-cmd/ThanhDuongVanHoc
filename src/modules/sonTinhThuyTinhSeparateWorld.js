import * as THREE from 'three';
export {
  MYTHIC_WORLD_ORIGIN,
  SON_TINH_WORLD_POS,
  THUY_TINH_WORLD_POS,
  PLAYER_SPAWN_IN_MYTHIC_WORLD,
  purgeLegacySonTinhBackgroundGlb,
  createPixelFxStylizedOcean,
  setupSonTinhThuyTinhRoom,
  buildSonTinhThuyTinhExhibition
} from './sonTinhThuyTinhRoomDecorator.js';

import {
  MYTHIC_WORLD_ORIGIN,
  PLAYER_SPAWN_IN_MYTHIC_WORLD,
  purgeLegacySonTinhBackgroundGlb,
  buildSonTinhThuyTinhExhibition,
  setupSonTinhThuyTinhRoom
} from './sonTinhThuyTinhRoomDecorator.js';

export function createIsolatedSonTinhMythicWorld(scene, camera, options = {}) {
  const room = setupSonTinhThuyTinhRoom(scene, {
    camera,
    ...options
  });
  return {
    mythicWorldGroup: room.mythicWorldGroup,
    enterMythicWorld: room.enterMythicWorld,
    exitMythicWorld: room.exitMythicWorld,
    update: room.update,
    isInsideMythicWorld: room.isInsideMythicWorld
  };
}

export function buildSonTinhMuseumExhibitionRoom(roomContainer, options = {}) {
  const room = buildSonTinhThuyTinhExhibition(options);
  if (roomContainer) {
    roomContainer.add(room.getGroup());
  }
  return {
    exhibitionGroup: room.getGroup(),
    bookPortalGroup: room.teleportBook,
    bookClickProxy: null
  };
}
