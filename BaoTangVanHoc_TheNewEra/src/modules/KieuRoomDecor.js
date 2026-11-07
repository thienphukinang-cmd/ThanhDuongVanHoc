import * as THREE from 'three';
import { RoomDecorator } from './RoomDecorator.js';

/**
 * KIEU ROOM DECOR MODULE: ALIAS CHO ROOM DECORATOR 4 DRAW CALLS
 * Phòng 01 Truyện Kiều được hợp nhất và quản lý 100% qua mô hình tối ưu 4 Draw Calls.
 */

export class KieuRoomDecor extends RoomDecorator {
  constructor(materialLibrary = null, options = {}) {
    super(materialLibrary, options);
  }
}

export { RoomDecorator };
export default KieuRoomDecor;
