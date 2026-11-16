import * as THREE from 'three';
import assert from 'node:assert';
import {
  DEFAULT_MUSEUM_TOUR_WAYPOINTS,
  getUnlockedTourWaypoints,
  MuseumAutoTourDirector
} from '../src/modules/museumCuratorAndTourSystem.js';
import { isRoomLocked } from '../src/config/literatureRegistry.js';

console.log('=== TESTING AUTO-TOUR LOCKED ROOM FILTERING ===\n');

// 1. Check DEFAULT_MUSEUM_TOUR_WAYPOINTS
console.log('1. Checking DEFAULT_MUSEUM_TOUR_WAYPOINTS:');
const unlocked = getUnlockedTourWaypoints(DEFAULT_MUSEUM_TOUR_WAYPOINTS);
console.log(`  Total waypoints: ${DEFAULT_MUSEUM_TOUR_WAYPOINTS.length}, Unlocked waypoints: ${unlocked.length}`);
assert(unlocked.length > 0, 'Must have unlocked waypoints');

for (const wp of unlocked) {
  if (wp.roomId) {
    const locked = isRoomLocked(wp.roomId);
    assert.strictEqual(locked, false, `Waypoint ${wp.id} has locked room ${wp.roomId}`);
  }
}
console.log('  [PASS] All unlocked waypoints belong to active completed rooms.');

// 2. Test injecting a locked waypoint
console.log('\n2. Testing filter against locked room waypoints:');
const mixedWaypoints = [
  ...DEFAULT_MUSEUM_TOUR_WAYPOINTS,
  { id: 'wp_locked_1', roomId: 'su_tich_trau_cau', title: 'Phòng Trầu Cau' },
  { id: 'wp_locked_2', roomId: 'chi_pheo', title: 'Phòng Chí Phèo' },
  { id: 'wp_locked_3', roomId: 'de_dat_de_nuoc', title: 'Phòng Đẻ Đất' }
];

const filtered = getUnlockedTourWaypoints(mixedWaypoints);
assert.strictEqual(filtered.length, unlocked.length, 'Filtered length must exclude all locked waypoints');
const hasLocked = filtered.some(wp => isRoomLocked(wp.roomId));
assert.strictEqual(hasLocked, false, 'No locked room should survive filtering');
console.log('  [PASS] Locked room waypoints strictly filtered out.');

// 3. Test MuseumAutoTourDirector instance
console.log('\n3. Testing MuseumAutoTourDirector behavior:');
const mockCamera = new THREE.PerspectiveCamera();
const director = new MuseumAutoTourDirector(mockCamera, {
  waypoints: mixedWaypoints
});

const activeWps = director._getActiveWaypoints();
assert.strictEqual(activeWps.some(wp => isRoomLocked(wp.roomId)), false, 'Active waypoints cannot include locked rooms');
console.log(`  [PASS] director._getActiveWaypoints() has ${activeWps.length} valid waypoints, 0 locked.`);

// 4. Test startRoomTour on locked rooms
assert.strictEqual(director.startRoomTour('su_tich_trau_cau'), false, 'startRoomTour on locked room must return false');
assert.strictEqual(director.startRoomTour('chi_pheo'), false, 'startRoomTour on locked room must return false');
assert.strictEqual(director.startRoomTour('hich_tuong_si'), false, 'startRoomTour on locked room must return false');
assert.strictEqual(director.getRoomTourWaypoints('de_dat_de_nuoc').length, 0, 'getRoomTourWaypoints on locked room must be empty');
console.log('  [PASS] startRoomTour & getRoomTourWaypoints properly reject locked rooms.');

console.log('\nALL AUTO-TOUR LOCKED ROOM FILTER TESTS PASSED 100%!\n');
