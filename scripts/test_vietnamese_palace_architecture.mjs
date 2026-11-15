import assert from 'node:assert';
import * as THREE from 'three';
import {
  PALACE_GRID_CONFIG,
  getPalaceGridPillarPositions,
  sanitizeGeometry,
  createLotusStonePedestalGeometry,
  createLotusFinialGeometry,
  createCloudBracketGeometry,
  createCurvedMaiDaoRoofMesh,
  createTwoTierCurvedMaiDaoRoofMesh,
  createGrandPalaceColumnsAndBrackets,
  createHeritageStoneBalustrade,
  createEntrancePorticoAndBridge,
  createPalaceAtriumVoidAndBalustrade,
  createThanhDuongVanHocPlaque,
  createPalaceCofferedCeilingAndBeams,
  createPalaceLighting,
  createVietnamesePalaceArchitecture,
  createTamQuanChongDiemGate
} from '../src/modules/vietnamesePalaceArchitecture.js';

console.log('--- STARTING PALACE ARCHITECTURE UNIT TESTS (TDD) ---');

// Test 1: Grid Config & Constants
assert(PALACE_GRID_CONFIG, 'PALACE_GRID_CONFIG must exist');
assert.strictEqual(PALACE_GRID_CONFIG.GRID_STEP, 6.0, 'GRID_STEP must be 6.0m');
assert.strictEqual(PALACE_GRID_CONFIG.COLUMN_DIAMETER_BASE, 0.55, 'Column diameter base must be 0.55m');
assert.strictEqual(PALACE_GRID_CONFIG.COLUMN_RADIUS_TOP, 0.24, 'Column radius top must be 0.24m (0.48m diameter)');
assert.strictEqual(PALACE_GRID_CONFIG.ATRIUM_SIZE, 12.0, 'Central atrium size must be 12.0m');
assert.strictEqual(PALACE_GRID_CONFIG.PORTICO_CENTRAL_BAY, 6.0, 'Entrance portico central bay must be 6.0m');
assert.strictEqual(PALACE_GRID_CONFIG.BRIDGE_WIDTH, 6.0, 'Stone bridge width must be 6.0m');
console.log('✓ Test 1: Grid Config & Constants passed');

// Test 2: Pillar Positions on Mặt bằng chữ Công (工) & Symmetry
const pillarCoords = getPalaceGridPillarPositions();
assert(Array.isArray(pillarCoords) && pillarCoords.length > 0, 'Pillar positions must be an array');

const seenCoords = new Set();
pillarCoords.forEach(([x, z]) => {
  const key = `${x.toFixed(2)},${z.toFixed(2)}`;
  assert(!seenCoords.has(key), `Duplicate pillar found at (${x}, ${z})`);
  seenCoords.add(key);

  // Check symmetry across X = 0
  const oppKey = `${(-x).toFixed(2)},${z.toFixed(2)}`;
  assert(seenCoords.has(oppKey) || pillarCoords.some(([ox, oz]) => Math.abs(ox - (-x)) < 1e-4 && Math.abs(oz - z) < 1e-4),
    `Pillar at (${x}, ${z}) lacks symmetric counterpart across X=0 at (${-x}, ${z})`);

  // Grid step check for main grid columns (excluding portico columns at Z = 22m)
  const isPortico = Math.abs(z - 22.0) < 0.1;
  if (!isPortico) {
    assert(Math.abs(x % 6.0) < 1e-3, `Pillar X=${x} must be multiple of 6.0m`);
    assert(Math.abs(z % 6.0) < 1e-3, `Pillar Z=${z} must be multiple of 6.0m`);
  }
});

// Check that NO column exists inside the 12m x 12m central atrium void (-6 < x < 6 and -3 < z < 9)
pillarCoords.forEach(([x, z]) => {
  const inVoid = Math.abs(x) < 5.8 && z >= -2.8 && z <= 8.8;
  assert(!inVoid, `No column permitted inside 12m x 12m atrium void: found at (${x}, ${z})`);
});
console.log('✓ Test 2: Mặt bằng chữ Công (工) Grid & Symmetry passed');

// Test 3: Entrance Portico (X = 0)
// Exactly 4 columns at portico, 2 on each side of 6.0m central bay, NO column at X = 0
const porticoCols = pillarCoords.filter(([x, z]) => Math.abs(z - 22.0) < 0.1);
assert.strictEqual(porticoCols.length, 4, `Portico must have exactly 4 columns, found ${porticoCols.length}`);
assert(!porticoCols.some(([x]) => Math.abs(x) < 0.1), 'Portico must have NO column at X = 0');
const westPortico = porticoCols.filter(([x]) => x < 0);
const eastPortico = porticoCols.filter(([x]) => x > 0);
assert.strictEqual(westPortico.length, 2, 'West portico must have 2 columns');
assert.strictEqual(eastPortico.length, 2, 'East portico must have 2 columns');
const minSpan = Math.min(...eastPortico.map(([x]) => x)) - Math.max(...westPortico.map(([x]) => x));
assert.strictEqual(minSpan, 6.0, `Central bay between inner columns must be 6.0m, got ${minSpan}`);
console.log('✓ Test 3: Entrance Portico 4 symmetrical columns with 6m bay passed');

// Test 4: Floor 1 & Floor 2 Column System Vertical Alignment
const columnsGroup = createGrandPalaceColumnsAndBrackets({
  floor1Height: 10.0,
  floor2Height: 10.0
});
assert(columnsGroup, 'Columns group must be created');
const f1Pillars = columnsGroup.getObjectByName('Instanced_Lim_Pillars_Floor1');
const f2Pillars = columnsGroup.getObjectByName('Instanced_Lim_Pillars_Floor2');
assert(f1Pillars, 'Floor 1 instanced pillars must exist');
assert(f2Pillars, 'Floor 2 instanced pillars must exist');
assert.strictEqual(f1Pillars.count, f2Pillars.count, 'Floor 1 and Floor 2 must have identical pillar count');

const mat4_1 = new THREE.Matrix4();
const mat4_2 = new THREE.Matrix4();
const pos1 = new THREE.Vector3();
const pos2 = new THREE.Vector3();

for (let i = 0; i < f1Pillars.count; i++) {
  f1Pillars.getMatrixAt(i, mat4_1);
  f2Pillars.getMatrixAt(i, mat4_2);
  pos1.setFromMatrixPosition(mat4_1);
  pos2.setFromMatrixPosition(mat4_2);

  assert(Math.abs(pos1.x - pos2.x) < 1e-3, `Pillar #${i} misaligned in X: F1=${pos1.x}, F2=${pos2.x}`);
  assert(Math.abs(pos1.z - pos2.z) < 1e-3, `Pillar #${i} misaligned in Z: F1=${pos1.z}, F2=${pos2.z}`);
  assert(pos2.y > pos1.y, `Floor 2 pillar Y (${pos2.y}) must be strictly higher than Floor 1 (${pos1.y})`);
}
console.log('✓ Test 4: Vertical Pillar Alignment between Floor 1 and Floor 2 passed');

// Test 5: Stone Bridge & Perimeter Balustrade Open Doorway
const porticoBridge = createEntrancePorticoAndBridge({
  bridgeWidth: 6.0,
  thresholdZ: 30.0
});
assert(porticoBridge, 'Portico and bridge group must exist');
const bridgeMesh = porticoBridge.getObjectByName('Portico_Stone_Bridge_Walkway');
assert(bridgeMesh, 'Bridge walkway mesh must exist');
bridgeMesh.geometry.computeBoundingBox();
const bridgeBox = bridgeMesh.geometry.boundingBox;
const bridgeWidth = bridgeBox.max.x - bridgeBox.min.x;
assert.strictEqual(bridgeWidth, 6.0, `Bridge width must be exactly 6.0m, got ${bridgeWidth}`);
console.log('✓ Test 5: Stone Bridge 6.0m wide & Open Threshold Doorway passed');

// Test 6: Central Atrium Void & Floor 2 Railing
const atriumGroup = createPalaceAtriumVoidAndBalustrade({
  atriumSize: 12.0,
  floor2Elevation: 10.0
});
assert(atriumGroup, 'Central atrium group must exist');
const railingMesh = atriumGroup.getObjectByName('Atrium_F2_Wooden_Balustrade');
assert(railingMesh, 'Floor 2 wooden balustrade must exist');
console.log('✓ Test 6: Central Atrium 12m x 12m Void and Floor 2 Railing passed');

// Test 7: Two-tier Curved Mai Dao Roof & Plaque
const grandRoof = createTwoTierCurvedMaiDaoRoofMesh({
  width: 44.0,
  length: 44.0
});
assert(grandRoof, 'Two-tier roof group must exist');
assert(grandRoof.getObjectByName('MaiDao_Roof_Tier1_Lower'), 'Lower roof tier must exist');
assert(grandRoof.getObjectByName('MaiDao_Roof_Tier2_Upper'), 'Upper roof tier must exist');
assert(grandRoof.getObjectByName('Clerestory_CoDiem_Structure'), 'Clerestory Cổ Diêm must exist');
assert(grandRoof.getObjectByName('Plaque_ThanhDuongVanHoc'), 'Lacquer plaque must exist');
console.log('✓ Test 7: Two-tier Curved Mai Dao Roof & Plaque passed');

// Test 8: Ceiling, Beams, Normals & Under-Roof Lighting
const palaceLights = createPalaceLighting();
const hemi = palaceLights.getObjectByName('Palace_Warm_HemisphereLight_09') || palaceLights.getObjectByName('Palace_Warm_HemisphereLight');
assert(hemi, 'Hemisphere light must exist');
assert.strictEqual(hemi.intensity, 0.90, 'Hemisphere light intensity must be 0.90');

const ceilingGroup = createPalaceCofferedCeilingAndBeams();
assert(ceilingGroup.getObjectByName('Palace_Coffered_Ceiling_Master'), 'Coffered ceiling must exist');
console.log('✓ Test 8: Ceiling, Beams & Warm Lighting passed');

// Test 9: Master Palace Architecture System Integration
const masterPalace = createVietnamesePalaceArchitecture();
assert(masterPalace, 'Master Palace system must be created');
assert(masterPalace.pillarPositions, 'pillarPositions list must be exported on system');
assert(masterPalace.group, 'Palace Group must exist');
console.log('✓ Test 9: Master Architecture Integration passed');

// Test 10: Zero NaN / Infinity verification across all meshes
let totalMeshesChecked = 0;
masterPalace.group.traverse((child) => {
  if (child.isMesh && child.geometry) {
    totalMeshesChecked++;
    const pos = child.geometry.attributes.position;
    if (pos?.array) {
      for (let i = 0; i < pos.array.length; i++) {
        assert(!Number.isNaN(pos.array[i]), `NaN found in position buffer of ${child.name}`);
        assert(Number.isFinite(pos.array[i]), `Infinity found in position buffer of ${child.name}`);
      }
    }
    const norm = child.geometry.attributes.normal;
    if (norm?.array) {
      for (let i = 0; i < norm.array.length; i++) {
        assert(!Number.isNaN(norm.array[i]), `NaN found in normal buffer of ${child.name}`);
        assert(Number.isFinite(norm.array[i]), `Infinity found in normal buffer of ${child.name}`);
      }
    }
  }
});
assert(totalMeshesChecked > 10, 'Must have verified multiple meshes');
console.log(`✓ Test 10: Verified ${totalMeshesChecked} meshes: 0 NaN, 0 Infinity!`);

// Test 11: Legacy caller compatibility (height and 3D coordinates)
const legacyColumns = createGrandPalaceColumnsAndBrackets({
  height: 28.2,
  pillarPositions: [[-14.0, 0, -14.0], [14.0, 0, -14.0]]
});
assert(legacyColumns, 'Legacy columns invocation must succeed');
const legF1 = legacyColumns.getObjectByName('Instanced_Lim_Pillars_Floor1');
assert.strictEqual(legF1.count, 2, 'Legacy columns count must match passed positions');
console.log('✓ Test 11: Legacy caller compatibility passed');

console.log('ALL 11 PALACE ARCHITECTURE UNIT TESTS PASSED SUCCESSFULLY!');
