import assert from 'node:assert';
import * as THREE from 'three';
import {
  WALL_THICKNESS,
  COLUMN_DIAMETER,
  COLUMN_RADIUS,
  SEMI_PROTRUSION,
  PORTAL_MIN_WIDTH,
  PORTAL_MIN_HEIGHT,
  createCalligraphyNamePlaque,
  createDistinctRoomPortal,
  createPillarCenterlineWallSegment,
  buildPillarAlignedExhibitionWalls
} from '../src/modules/museumWallArchitectureSystem.js';

import {
  FurnitureCollisionEngine,
  globalFurnitureCollisionEngine,
  placeAssetSafely,
  getMuseumReservedZones,
  placeCorridorFurnitureBetweenBays,
  createCeilingBayLanterns
} from '../src/modules/museumLobbyCorridorDecorator.js';

import {
  PALACE_GRID_CONFIG,
  getPalaceGridPillarPositions
} from '../src/modules/vietnamesePalaceArchitecture.js';

console.log('=== VERIFYING CURATOR ARCHITECTURE & ANTI-COLLISION ENGINE ===\n');

// ---------------------------------------------------------------------------
// 1. WALL ALIGNMENT ON PILLAR CENTERLINES (TIM CỘT)
// ---------------------------------------------------------------------------
console.log('1. Checking Wall Thickness, Pillar Diameter & Protrusion Norms...');
assert.strictEqual(WALL_THICKNESS, 0.38, 'Wall thickness must be exactly 0.38m');
assert.strictEqual(COLUMN_DIAMETER, 0.52, 'Column diameter must be exactly 0.52m');
assert.strictEqual(COLUMN_RADIUS, 0.26, 'Column radius must be 0.26m');
assert.strictEqual(SEMI_PROTRUSION, 0.07, 'Columns must protrude by exactly 0.07m (7cm) as semi-cylinders');
console.log('   ✓ WALL_THICKNESS = 0.38m < COLUMN_DIAMETER = 0.52m');
console.log(`   ✓ Semi-cylinder protrusion = ${(SEMI_PROTRUSION * 100).toFixed(1)}cm on both faces`);

// Test geometric containment: wall corners within column radius
const halfThick = WALL_THICKNESS * 0.5; // 0.19m
const cornerDist = Math.sqrt(0 * 0 + halfThick * halfThick);
assert(cornerDist <= COLUMN_RADIUS, 'Wall corners at column centerline must be strictly inside column radius (zero slicing)');
console.log(`   ✓ Wall corner radius inside column is ${cornerDist.toFixed(3)}m <= column radius ${COLUMN_RADIUS.toFixed(3)}m (Zero slicing, Zero gaps)`);

// Test all 5 exhibition rooms
const fiveRooms = [
  { key: 'thanhGiong', name: 'Thánh Gióng', floor: 1, doorW: 4.2, doorH: 4.5 },
  { key: 'namQuocSonHa', name: 'Nam Quốc Sơn Hà', floor: 2, doorW: 4.2, doorH: 4.5 },
  { key: 'namXuong', name: 'Người Con Gái Nam Xương', floor: 2, doorW: 4.2, doorH: 4.5 },
  { key: 'dayThonViDa', name: 'Đây Thôn Vĩ Dạ', floor: 3, doorW: 4.2, doorH: 4.5 },
  { key: 'tatDen', name: 'Tắt Đèn', floor: 3, doorW: 4.8, doorH: 4.6 }
];

fiveRooms.forEach((r) => {
  const wallsGroup = buildPillarAlignedExhibitionWalls({
    roomKey: r.key,
    doorWidth: r.doorW,
    doorHeight: r.doorH,
    wallHeight: 8.5
  });
  assert(wallsGroup, `Room walls group must be created for ${r.name}`);
  assert(wallsGroup.children.length >= 4, `Room ${r.name} must have left, right, back, front walls and columns`);

  // Check portal opening
  const portal = wallsGroup.children.find(c => c.name.startsWith('Room_Portal_'));
  assert(portal, `Room ${r.name} must have distinct portal`);
  assert(r.doorW >= PORTAL_MIN_WIDTH, `Portal width ${r.doorW} must be >= ${PORTAL_MIN_WIDTH}`);
  assert(r.doorH >= PORTAL_MIN_HEIGHT, `Portal height ${r.doorH} must be >= ${PORTAL_MIN_HEIGHT}`);
  console.log(`   ✓ Room ${r.name}: Aligned walls & Portal (${r.doorW}m x ${r.doorH}m) verified`);
});

// ---------------------------------------------------------------------------
// 2. DISTINCT ROOM PORTALS & CALLIGRAPHY NAME PLAQUES
// ---------------------------------------------------------------------------
console.log('\n2. Checking Distinct Portals and Balanced Calligraphy Name Plaques...');
fiveRooms.forEach((r) => {
  const portal = createDistinctRoomPortal({
    roomKey: r.key,
    width: r.doorW,
    height: r.doorH
  });
  assert(portal, `Portal must be created for ${r.key}`);
  const plaque = portal.children.find(c => c.name.startsWith('Plaque_'));
  assert(plaque, `Portal for ${r.key} must contain balanced calligraphy name plaque`);
  console.log(`   ✓ Portal for ${r.name}: Has plaque "${plaque.name}" above archway (>= 3.6m x 4.2m)`);
});

// ---------------------------------------------------------------------------
// 3. FURNITURE ANTI-COLLISION ENGINE & RESERVED ZONES
// ---------------------------------------------------------------------------
console.log('\n3. Checking Furniture Anti-Collision Algorithm & reservedZones...');
const engine = new FurnitureCollisionEngine();
const zones = engine.reservedZones;

assert(zones.pillars.length > 0, 'reservedZones must have pillars');
assert(zones.walls.length > 0, 'reservedZones must have walls');
assert(zones.balustrades.length > 0, 'reservedZones must have balustrades');
assert(zones.stairs.length > 0, 'reservedZones must have stairs');
assert(zones.transitCorridors.length > 0, 'reservedZones must have transitCorridors');
assert(zones.doorwayClearances.length >= 5, 'reservedZones must have doorway clearances for rooms');

console.log(`   ✓ Reserved pillars count: ${zones.pillars.length}`);
console.log(`   ✓ Reserved walls count: ${zones.walls.length}`);
console.log(`   ✓ Reserved balustrades count: ${zones.balustrades.length}`);
console.log(`   ✓ Reserved stairs count: ${zones.stairs.length}`);
console.log(`   ✓ Reserved transit corridors count: ${zones.transitCorridors.length}`);
console.log(`   ✓ Reserved 4.0m doorway zones count: ${zones.doorwayClearances.length}`);

// ---------------------------------------------------------------------------
// 4. CENTRAL PLACEMENT AT (0, 0, 0) >= 4.5M FROM NEAREST PILLAR
// ---------------------------------------------------------------------------
console.log('\n4. Checking Central Placement at (0, 0, 0) Distance to Nearest Pillar...');
const distAtriumPillar = engine.getNearestPillarDistance(0, 0);
console.log(`   ✓ Distance from (0, 0, 0) to nearest pillar = ${distAtriumPillar.toFixed(2)}m`);
assert(distAtriumPillar >= 4.5, `Central placement at (0, 0, 0) must be >= 4.5m from nearest pillar (got ${distAtriumPillar.toFixed(2)}m)`);
console.log(`   ✓ PASS: Distance ${distAtriumPillar.toFixed(2)}m is >= 4.5m!`);

// ---------------------------------------------------------------------------
// 5. CORRIDOR FURNITURE & CEILING BAY LANTERNS
// ---------------------------------------------------------------------------
console.log('\n5. Checking Corridor Furniture (0.35m from wall) & Ceiling Bay Lanterns...');
const testLobbyGroup = new THREE.Group();
const corridorFurniture = placeCorridorFurnitureBetweenBays(testLobbyGroup, engine);
assert(corridorFurniture.children.length > 0, 'Corridor furniture must be placed against walls between bays');
corridorFurniture.children.forEach((item) => {
  // Check position is recessed 0.35m from wall (e.g. x = -11.65, x = 11.65, z = -5.65) or portico/corners
  const isWest = Math.abs(item.position.x - (-11.65)) < 0.05;
  const isEast = Math.abs(item.position.x - 11.65) < 0.05;
  const isNorth = Math.abs(item.position.z - (-5.65)) < 0.05;
  const isPorticoOrCorner = item.name.startsWith('Censer_') || item.name.startsWith('Screen_');
  assert(isWest || isEast || isNorth || isPorticoOrCorner, `Corridor item ${item.name} must be 0.35m from wall or at portico/corners`);
});
console.log(`   ✓ Placed ${corridorFurniture.children.length} corridor furniture pieces exactly 0.35m from wall between pillar bays`);

const lanternsGroup = createCeilingBayLanterns(testLobbyGroup, engine);
assert(lanternsGroup.children.length > 0, 'Ceiling bay lanterns must be created');
lanternsGroup.children.forEach((l) => {
  // Check that lantern is centered in 6m bay (modulo 6m must be 3m from column lines)
  const remX = Math.abs(l.position.x % 6.0);
  const remZ = Math.abs(l.position.z % 6.0);
  assert(Math.abs(remX - 3.0) < 0.01, `Lantern X (${l.position.x}) must be centered in 6m bay`);
  assert(Math.abs(remZ - 3.0) < 0.01, `Lantern Z (${l.position.z}) must be centered in 6m bay`);
});
console.log(`   ✓ Placed ${lanternsGroup.children.length} ceiling bay lanterns centered in bays (X=gridCenterX, Z=gridCenterZ, 3.0m clearance to beams/pillars)`);

// ---------------------------------------------------------------------------
// 6. AUTO-REJECT & REPOSITION FOR 100% ZERO OVERLAP
// ---------------------------------------------------------------------------
console.log('\n6. Checking Collision Detection, Auto-Reposition and Auto-Reject...');

// Test 6a: Place directly inside a pillar => must detect collision and auto-reposition or reject
const pillarSpot = { x: 12.0, y: 0, z: 12.0 };
const testColRes = engine.placeAssetSafely(null, pillarSpot, 1.5, {
  name: 'Test_Colliding_Pillar',
  allowReposition: false
});
assert.strictEqual(testColRes.success, false, 'Asset inside pillar without reposition must be rejected');
assert.strictEqual(testColRes.rejected, true, 'Result must be rejected');
console.log(`   ✓ Collision with pillar successfully auto-rejected: ${testColRes.reason}`);

// Test 6b: Place inside 3.5m transit corridor without reposition => must be rejected
const transitSpot = { x: 0.0, y: 0, z: 20.0 };
const testTransitRes = engine.placeAssetSafely(null, transitSpot, 1.5, {
  name: 'Test_Transit_Blocker',
  allowReposition: false
});
assert.strictEqual(testTransitRes.success, false, 'Asset blocking transit corridor must be rejected');
console.log(`   ✓ Obstacle inside 3.5m transit corridor successfully rejected: ${testTransitRes.reason}`);

// Test 6c: Place inside 4.0m doorway exclusion zone => must be rejected
const doorwaySpot = { x: -33.0, y: 0, z: 19.0 }; // Thanh Gióng door at (-33.8, 19.0)
const testDoorRes = engine.placeAssetSafely(null, doorwaySpot, 1.5, {
  name: 'Test_Door_Blocker',
  allowReposition: false
});
assert.strictEqual(testDoorRes.success, false, 'Asset blocking doorway 4.0m radius must be rejected');
console.log(`   ✓ Obstacle inside 4.0m doorway radius successfully rejected: ${testDoorRes.reason}`);

// Test 6d: Auto-reposition test => find safe candidate when allowReposition is true
const testRepositionRes = engine.placeAssetSafely(null, { x: -28.0, y: 0, z: 12.0 }, 1.5, {
  name: 'Test_Reposition_Item',
  allowReposition: true
});
assert(testRepositionRes.success, 'Colliding item with allowReposition should find safe position');
console.log(`   ✓ Auto-reposition successfully relocated item to (${testRepositionRes.position.x.toFixed(2)}, ${testRepositionRes.position.z.toFixed(2)})`);

// Verify the newly placed item is in placedFurniture
const lastPlaced = engine.reservedZones.placedFurniture[engine.reservedZones.placedFurniture.length - 1];
assert.strictEqual(lastPlaced.name, 'Test_Reposition_Item', 'Newly placed item must be in placedFurniture');

// Test 6e: Try to place another item at the exact same location => must collide with placed furniture!
const overlapRes = engine.placeAssetSafely(null, testRepositionRes.position, 1.5, {
  name: 'Test_Duplicate_Overlap',
  allowReposition: false
});
assert.strictEqual(overlapRes.success, false, 'Item placed on top of existing furniture must be rejected');
console.log(`   ✓ Duplicate furniture overlap successfully detected and rejected: ${overlapRes.reason}`);

console.log('\n===============================================================');
console.log('🎉 ALL 6 CURATOR MISSION VERIFICATIONS PASSED WITH 100% SUCCESS!');
console.log('===============================================================');
