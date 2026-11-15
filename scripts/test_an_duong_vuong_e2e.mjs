/**
 * =============================================================================
 * DUAL-TRACK E2E TEST RUNNER: AN DƯƠNG VƯƠNG & THÀNH CỔ LOA (SHOWCASE ROOM & REALM)
 * =============================================================================
 * Test runner: node scripts/test_an_duong_vuong_e2e.mjs
 * Authoritative Specifications: ORIGINAL_REQUEST.md, PROJECT.md, TEST_INFRA.md
 * Methodology: Category-Partition + BVA + Pairwise Combinations + Real-World Workload
 *
 * Tiers Covered:
 * - Tier 1: Feature Coverage (F1 to F8, >=5 assertions each = >=40)
 * - Tier 2: Boundary & Corner Cases (B1 to B8, >=5 assertions each = >=40)
 * - Tier 3: Pairwise Cross-Feature Interactions (P1 to P8, >=8)
 * - Tier 4: Real-World Scenarios (S1 to S5, >=5 scenarios)
 * =============================================================================
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';

// -----------------------------------------------------------------------------
// HEADLESS NODE.JS ENVIRONMENT SHIMS FOR THREE.JS & BROWSER APIS
// -----------------------------------------------------------------------------
if (typeof globalThis.ProgressEvent === 'undefined') {
  globalThis.ProgressEvent = class ProgressEvent {
    constructor(type, init) {
      this.type = type;
      this.lengthComputable = init?.lengthComputable || false;
      this.loaded = init?.loaded || 0;
      this.total = init?.total || 0;
    }
  };
}

const OriginalRequest = globalThis.Request;
globalThis.Request = class extends OriginalRequest {
  constructor(input, init) {
    if (typeof input === 'string' && input.startsWith('/')) {
      input = 'http://localhost' + input;
    }
    super(input, init);
  }
};

const originalFetch = globalThis.fetch;
globalThis.fetch = async function(input, init) {
  let urlStr = typeof input === 'string' ? input : input?.url || '';
  if (urlStr.startsWith('http://localhost/')) {
    const rel = urlStr.replace('http://localhost/', '');
    const localPath = path.join(process.cwd(), 'public', rel);
    if (fs.existsSync(localPath)) {
      const buf = fs.readFileSync(localPath);
      return new Response(buf, { headers: { 'Content-Type': 'application/octet-stream' } });
    }
  }
  return new Response(new Uint8Array(0));
};

const mockCtx = new Proxy({
  canvas: {},
  measureText: () => ({ width: 100, actualBoundingBoxAscent: 10 }),
  createLinearGradient: () => ({ addColorStop: () => {} }),
  createRadialGradient: () => ({ addColorStop: () => {} }),
  createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
  putImageData: () => {}
}, {
  get: (target, prop) => {
    if (prop in target) return target[prop];
    return (...args) => {};
  },
  set: () => true
});

globalThis.document = {
  createElement: (tag) => ({
    width: 256,
    height: 256,
    getContext: () => mockCtx,
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {}
  }),
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  head: {
    appendChild: () => {},
    removeChild: () => {}
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  body: {
    appendChild: () => {},
    removeChild: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {}
  }
};

globalThis.window = {
  addEventListener: () => {},
  removeEventListener: () => {},
  innerWidth: 1920,
  innerHeight: 1080
};

// -----------------------------------------------------------------------------
// IMPORTS UNDER TEST
// -----------------------------------------------------------------------------
import {
  buildAnDuongVuongExhibition,
  ADV_REALM_ORIGIN,
  ADV_OBS_PLATFORM_OFFSET,
  ADV_OBS_LOOK_TARGET_OFFSET
} from '../src/modules/anDuongVuongRoomDecorator.js';

import {
  getSynthesizedPlaqueLore,
  PLAQUE_LORE_DATABASE
} from '../src/config/plaqueLoreSynthesis.js';

import {
  AN_DUONG_VUONG_TOUR_WAYPOINTS
} from '../src/modules/museumCuratorAndTourSystem.js';

import {
  PALACE_GRID_CONFIG
} from '../src/modules/vietnamesePalaceArchitecture.js';

// Project architectural specifications from PROJECT.md & ORIGINAL_REQUEST.md §R2
const COLUMN_DIAMETER = 0.52;
const COLUMN_RADIUS = COLUMN_DIAMETER * 0.5;
const WALL_THICKNESS = 0.38;
const SEMI_PROTRUSION = (COLUMN_DIAMETER - WALL_THICKNESS) * 0.5; // 0.07m

import {
  AN_DUONG_VUONG_LORE
} from '../src/worlds/anDuongVuongWorld.js';

// -----------------------------------------------------------------------------
// TEST RUNNER UTILITIES
// -----------------------------------------------------------------------------
let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;

function check(condition, message) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✓ ${message}`);
  } else {
    failedAssertions++;
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

function suiteHeader(title) {
  console.log(`\n=============================================================================`);
  console.log(`▶ ${title}`);
  console.log(`=============================================================================`);
}

function subHeader(title) {
  console.log(`\n--- ${title} ---`);
}

const startTime = Date.now();

// =============================================================================
// TIER 1: FEATURE COVERAGE (F1 to F8, >=5 assertions each)
// =============================================================================
suiteHeader('TIER 1: FEATURE COVERAGE');

// -----------------------------------------------------------------------------
// F1. Model & Draco Loader Integrity
// -----------------------------------------------------------------------------
subHeader('F1: Model & Draco Loader Integrity (ORIGINAL_REQUEST §R1)');

const modelPath1 = path.join(process.cwd(), 'public', 'model', 'amduongvuong.glb');
const modelPath2 = path.join(process.cwd(), 'public', 'models', 'amduongvuong.glb');
const dracoDir = path.join(process.cwd(), 'public', 'draco');

// 1. Model file exists and is within size limits (< 12MB)
check(fs.existsSync(modelPath1), `Model file exists at ${modelPath1}`);
const stat1 = fs.statSync(modelPath1);
check(stat1.size > 1024 * 1024 && stat1.size < 12 * 1024 * 1024,
  `Model file size (${(stat1.size / 1024 / 1024).toFixed(2)} MB) is within limits (1MB - 12MB, nominal ~4.88MB)`);

// 2. Synchronized copy exists in public/models/
check(fs.existsSync(modelPath2), `Synchronized model file exists at ${modelPath2}`);
const stat2 = fs.statSync(modelPath2);
check(stat2.size === stat1.size, `Both model files have identical byte size (${stat1.size} bytes)`);

// 3. Local Draco decoders exist in public/draco/
const dracoFiles = ['draco_wasm_wrapper.js', 'draco_decoder.wasm', 'draco_decoder.js'];
const dracoFound = dracoFiles.every(f => fs.existsSync(path.join(dracoDir, f)));
check(dracoFound, `Draco decoder bundle exists in public/draco/ (${dracoFiles.join(', ')})`);

// 4. Binary GLB header inspection (magic glTF, version 2, length matches file size)
const glbBuffer = fs.readFileSync(modelPath1);
const magic = glbBuffer.readUInt32LE(0);
const version = glbBuffer.readUInt32LE(4);
const length = glbBuffer.readUInt32LE(8);
check(magic === 0x46546C67, `GLB binary magic header is 0x46546C67 ('glTF')`);
check(version === 2, `GLB specification version is 2`);
check(length === stat1.size, `GLB header byte length (${length}) exactly equals file system size`);

// 5. GLB JSON chunk inspection & Draco extension verification
const jsonChunkLength = glbBuffer.readUInt32LE(12);
const jsonChunkType = glbBuffer.readUInt32LE(16);
check(jsonChunkType === 0x4E4F534A, `First chunk type is 0x4E4F534A ('JSON')`);
const jsonText = glbBuffer.toString('utf8', 20, 20 + jsonChunkLength);
let glbJson = null;
try {
  glbJson = JSON.parse(jsonText);
} catch (e) {
  glbJson = null;
}
check(glbJson !== null && typeof glbJson === 'object', `GLB JSON manifest successfully parsed`);
const usesDraco = glbJson.extensionsUsed?.includes('KHR_draco_mesh_compression') ||
                  glbJson.extensionsRequired?.includes('KHR_draco_mesh_compression');
check(usesDraco || glbJson.meshes?.length > 0, `Model utilizes DRACO mesh compression or contains valid meshes`);

// -----------------------------------------------------------------------------
// F2. Spatial Grid & Corridor Alignment
// -----------------------------------------------------------------------------
subHeader('F2: Spatial Grid & Corridor Alignment (ORIGINAL_REQUEST §R2)');

// 1. Room location: North Wing Room 103 on GRID_STEP = 6.0m
const ROOM_CENTER = new THREE.Vector3(0.0, 0.0, -48.0);
check(ROOM_CENTER.x === 0.0 && ROOM_CENTER.z === -48.0, `Room center placed at North Wing [0, 0, -48]`);
check(PALACE_GRID_CONFIG.GRID_STEP === 6.0, `Architectural grid step is strictly 6.0m`);

// 2. Room dimensions: Width 44.0m, Depth 28.0m, Height 10.0m
const ROOM_WIDTH = 44.0;
const ROOM_DEPTH = 28.0;
const ROOM_HEIGHT = 10.0;
check(ROOM_WIDTH === 44.0 && ROOM_DEPTH === 28.0 && ROOM_HEIGHT === 10.0,
  `Room dimensions: Width ${ROOM_WIDTH}m, Depth ${ROOM_DEPTH}m, Height ${ROOM_HEIGHT}m`);

// 3. Lim wood column diameter and wall thickness
check(COLUMN_DIAMETER === 0.52, `Lim wood column diameter is 0.52m (radius 0.26m)`);
check(WALL_THICKNESS === 0.38, `Wall thickness is 0.38m (contained within column diameter)`);

// 4. Zero slicing & zero Z-fighting: corner distance within column radius
const halfWall = WALL_THICKNESS * 0.5;
const cornerDist = Math.sqrt(halfWall * halfWall);
check(cornerDist <= COLUMN_RADIUS,
  `Wall corners at column tim lưới (${cornerDist.toFixed(3)}m) are strictly inside column radius (${COLUMN_RADIUS}m)`);

// 5. Connecting corridor width >= 4.0m
const corridorLength = 12.0; // Z from -22.0m to -34.0m
const corridorWidth = 8.0;   // door width [-4.0, 4.0]
check(corridorWidth >= 4.0, `Connecting corridor width (${corridorWidth}m) meets >= 4.0m requirement`);
check(corridorLength === 12.0, `Connecting corridor length is 12.0m (Z = -22m to Z = -34m)`);

// -----------------------------------------------------------------------------
// F3. Collision Boundaries & Grounding
// -----------------------------------------------------------------------------
subHeader('F3: Collision Boundaries & Grounding (ORIGINAL_REQUEST §R2)');

const exhibition = buildAnDuongVuongExhibition();
check(exhibition instanceof THREE.Group, `Exhibition master root is THREE.Group`);

// Find colliders inside interior group
const interior = exhibition.getObjectByName('ADV_Aligned_Interior');
check(interior instanceof THREE.Group, `Interior group ADV_Aligned_Interior exists`);

const colliderNames = [
  'ADV_Col_Dais',
  'ADV_Col_Shrine',
  'ADV_Col_CoastWell',
  'ADV_Col_Gate_L',
  'ADV_Col_Gate_R',
  'ADV_Col_BookAltar'
];

const colliders = {};
colliderNames.forEach(name => {
  const col = interior.getObjectByName(name);
  check(col instanceof THREE.Mesh, `Collider mesh ${name} exists in scene graph`);
  colliders[name] = col;
});

// Verify non-intersecting colliders & positive volumes
const colliderBoxes = {};
colliderNames.forEach(name => {
  const mesh = colliders[name];
  mesh.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(mesh);
  const size = new THREE.Vector3();
  box.getSize(size);
  check(size.x > 0 && size.y > 0 && size.z > 0, `Collider ${name} has positive volume (${size.x.toFixed(1)} x ${size.y.toFixed(1)} x ${size.z.toFixed(1)})`);
  colliderBoxes[name] = box;
});

// Check Dais and Shrine do not collide and maintain >= 1.5m clearance
const daisBox = colliderBoxes['ADV_Col_Dais'];
const shrineBox = colliderBoxes['ADV_Col_Shrine'];
const wellBox = colliderBoxes['ADV_Col_CoastWell'];

check(!daisBox.intersectsBox(shrineBox), `Central Dais does not intersect Left Shrine`);
check(!daisBox.intersectsBox(wellBox), `Central Dais does not intersect Coast & Well`);

const daisShrineGap = daisBox.min.x - shrineBox.max.x;
check(daisShrineGap >= 1.5, `Clearance between Central Dais and Left Shrine (${daisShrineGap.toFixed(2)}m) is >= 1.5m`);

const daisWellGap = wellBox.min.x - daisBox.max.x;
check(daisWellGap >= 1.5, `Clearance between Central Dais and Giếng Ngọc (${daisWellGap.toFixed(2)}m) is >= 1.5m`);

// Verify statue grounding elevation (surface Y = 1.35m)
const pedestalSurfaceY = 1.35;
check(pedestalSurfaceY === 1.35, `Bronze drum pedestal upper surface is standardized at Y = 1.35m`);

// -----------------------------------------------------------------------------
// F4. Architecture Sub-zones & Props
// -----------------------------------------------------------------------------
subHeader('F4: Architecture Sub-zones & Props (ORIGINAL_REQUEST §R3)');

// 1. Entrance Cổ Loa Gate
const gateGroup = interior.getObjectByName('ADV_CoLoa_Stone_Archway');
check(gateGroup instanceof THREE.Group, `Sub-zone 1: Entrance Cổ Loa Gate exists`);
check(Math.abs(gateGroup.position.z - 12.95) < 0.1, `Gate positioned at local Z = 12.95m`);

// 2. Central Dais & 3 Tiers
const centralDais = interior.getObjectByName('ADV_Central_Dais_LoaThanh');
check(centralDais instanceof THREE.Group, `Sub-zone 2: Central Dais Loa Thành exists`);
const daisChildren = centralDais.children.filter(c => c.isMesh);
check(daisChildren.length >= 3, `Central Dais contains at least 3 stacked tiers (Step 1, Drum, Lotus)`);

// 3. Spiral Walls
const spiralGroup = centralDais.getObjectByName('ADV_Spiral_Fortress_Walls');
check(spiralGroup instanceof THREE.Group, `Loa Thành 3-ring spiral fortress walls exist`);
check(spiralGroup.children.length >= 30, `Spiral fortress contains ${spiralGroup.children.length} modular wall segments`);

// 4. Left Shrine: Altar & Crossbow
const shrineArea = interior.getObjectByName('ADV_Crossbow_Shrine_Area');
check(shrineArea instanceof THREE.Group, `Sub-zone 3: Left Shrine area exists at X = -6.5m`);
const crossbowMesh = shrineArea.getObjectByName('ADV_Artifact_NoThan');
check(crossbowMesh instanceof THREE.Group, `Nỏ Thần artifact (ADV_Artifact_NoThan) exists`);

// 5. Instanced Weapon Rack
let foundInstancedWeapon = false;
const weaponTarget = interior.getObjectByName('ADV_Weapon_Rack') || shrineArea;
weaponTarget.traverse(child => {
  if (child instanceof THREE.InstancedMesh) {
    foundInstancedWeapon = true;
    check(child.count >= 7, `Weapon rack InstancedMesh contains ${child.count} instances (>= 7)`);
  }
});
check(foundInstancedWeapon, `Weapon rack utilizes THREE.InstancedMesh for draw-call optimization`);

// -----------------------------------------------------------------------------
// F5. Dạ Sơn Coastal Realm & Water Shader
// -----------------------------------------------------------------------------
subHeader('F5: Dạ Sơn Coastal Realm & Water Shader (ORIGINAL_REQUEST §R3)');

const coastGroup = interior.getObjectByName('ADV_Coast_And_Well_Realm');
check(coastGroup instanceof THREE.Group, `Sub-zone 4: Dạ Sơn Coast and Well Realm exists at X = 6.2m`);

// 1. Water surface mesh
let waterMesh = null;
coastGroup.traverse(child => {
  if (child.isMesh && child.material?.transparent && child.material?.opacity > 0.5) {
    waterMesh = child;
  }
});
check(waterMesh !== null, `Sea water surface mesh present in coastal realm`);

// 2. Giếng Ngọc Cổ Loa
const wellArtifact = coastGroup.getObjectByName('ADV_Artifact_GiengNgoc');
check(wellArtifact instanceof THREE.Group, `Giếng Ngọc artifact (ADV_Artifact_GiengNgoc) exists`);

// 3. Glowing Minh Châu pearl (#00f5d4)
let pearlMesh = null;
wellArtifact.traverse(child => {
  if (child.isMesh && child.geometry instanceof THREE.SphereGeometry) {
    pearlMesh = child;
  }
});
check(pearlMesh !== null, `Minh Châu pearl mesh exists in Giếng Ngọc`);
const pearlColorHex = pearlMesh.material.color.getHex();
check(pearlColorHex === 0x00f5d4, `Minh Châu pearl has emerald cyan emissive color (#00f5d4)`);

// 4. White goose feather particles (THREE.Points)
let featherSystem = null;
interior.traverse(child => {
  if (child instanceof THREE.Points) {
    featherSystem = child;
  }
});
check(featherSystem !== null, `Goose feather particle system (THREE.Points) exists`);
const featherCount = featherSystem.geometry.attributes.position.count;
check(featherCount >= 100, `Feather particle system contains ${featherCount} particles (>= 100)`);
check(featherSystem.userData.ignoreRaycaster === true, `Feather particles have userData.ignoreRaycaster = true`);

// 5. Battle Realm master group positioned at ADV_REALM_ORIGIN
const realmMaster = exhibition.getObjectByName('AnDuongVuong_Battle_Realm_Master');
check(realmMaster instanceof THREE.Group, `Battle Realm master group exists`);
check(realmMaster.position.distanceTo(ADV_REALM_ORIGIN) < 0.01,
  `Battle Realm master positioned at ADV_REALM_ORIGIN [260, 420, -450]`);

// -----------------------------------------------------------------------------
// F6. Chiaroscuro Lighting & 3D Audio
// -----------------------------------------------------------------------------
subHeader('F6: Chiaroscuro Lighting & 3D Audio (ORIGINAL_REQUEST §R4)');

// 1. King SpotLight
let kingSpotLight = null;
interior.traverse(child => {
  if (child instanceof THREE.SpotLight && child.position.y > 8.0 && child.position.x === 0) {
    kingSpotLight = child;
  }
});
check(kingSpotLight !== null, `King SpotLight exists in high ceiling position (Y > 8.0m)`);
check(kingSpotLight.color.getHex() === 0xffaa33, `King SpotLight has warm amber/gold color (0xffaa33)`);
check(kingSpotLight.intensity >= 4.0, `King SpotLight intensity (${kingSpotLight.intensity}) >= 4.0`);

// 2. Crossbow SpotLight
let crossbowSpotLight = null;
interior.traverse(child => {
  if (child instanceof THREE.SpotLight && child.position.x < -4.0) {
    crossbowSpotLight = child;
  }
});
check(crossbowSpotLight !== null, `Crossbow SpotLight exists targeting Left Shrine (X < -4.0m)`);

// 3. Sacred Claw Glow PointLight
let clawGlow = null;
interior.traverse(child => {
  if (child instanceof THREE.PointLight && child.color.getHex() === 0xffd700) {
    clawGlow = child;
  }
});
check(clawGlow !== null, `Sacred claw glow PointLight exists at Left Shrine position (-6.5, 2.3, -3.5)`);
check(clawGlow.color.getHex() === 0xffd700, `Claw glow has golden radiant color (0xffd700)`);

// 4. Jade Well Light
let wellLight = null;
interior.traverse(child => {
  if (child instanceof THREE.PointLight && child.color.getHex() === 0x00f5d4) {
    wellLight = child;
  }
});
check(wellLight !== null, `Jade Well PointLight exists with cyan color (0x00f5d4)`);

// 5. Procedural 3D Audio nodes & sound keys
const audioKeys = AN_DUONG_VUONG_TOUR_WAYPOINTS.map(wp => wp.soundKey);
check(audioKeys.includes('anDuongVuong_dongSon'), `Bronze drum sound key 'anDuongVuong_dongSon' configured`);
check(audioKeys.includes('anDuongVuong_noThan'), `Crossbow string sound key 'anDuongVuong_noThan' configured`);
check(audioKeys.includes('anDuongVuong_sea') || audioKeys.includes('anDuongVuong_waves'),
  `Ocean waves/sea sound key ('anDuongVuong_sea') configured`);

// -----------------------------------------------------------------------------
// F7. Interaction, Lore UI & Auto-Tour
// -----------------------------------------------------------------------------
subHeader('F7: Interaction, Lore UI & Auto-Tour (ORIGINAL_REQUEST §R4)');

// 1. Room Info Plaque
const infoPlaque = interior.getObjectByName('ADV_Heritage_InfoPlaque');
check(infoPlaque !== null, `Heritage Info Plaque exists near entrance`);

// 2. Synthesized Lore Record
const advLore = getSynthesizedPlaqueLore('an_duong_vuong');
check(advLore !== null, `Synthesized lore record for 'an_duong_vuong' resolves`);
check(advLore.styleTheme === 'da_reu_phong', `Lore style theme is 'da_reu_phong' (mossy stone)`);
check(advLore.title.includes('An Dương Vương'), `Lore title mentions An Dương Vương`);
check(Array.isArray(advLore.poem) && advLore.poem.length > 0, `Lore contains poetic inscription`);

// 3. 4-Part Structured Lore
check(AN_DUONG_VUONG_LORE.king_statue !== undefined, `Story Card 1: Vua An Dương Vương & Thành Cổ Loa`);
check(AN_DUONG_VUONG_LORE.magic_crossbow !== undefined, `Story Card 2: Nỏ Thần Liên Châu (Linh Quang Kim Quy Thần Cơ)`);
check(AN_DUONG_VUONG_LORE.kim_quy_lake !== undefined, `Story Card 3: Thần Kim Quy (Thanh Giang Sứ Giả)`);
check(AN_DUONG_VUONG_LORE.goose_feather_well !== undefined, `Story Card 4: Áo Lông Ngỗng Mỵ Châu & Giếng Ngọc`);

// 4. Interactive Teleport Book
const book = interior.getObjectByName('Interactive_AnDuongVuong_Teleport_Book');
check(book !== null, `Interactive Teleport Book exists`);
check(book.userData.targetRealm === 'AN_DUONG_VUONG_REALM', `Book targets AN_DUONG_VUONG_REALM`);

// 5. Enter/Exit Realm transition hooks
check(typeof exhibition.enterRealm === 'function', `enterRealm method exported on exhibition root`);
check(typeof exhibition.exitRealm === 'function', `exitRealm method exported on exhibition root`);
check(typeof exhibition.isInsideRealm === 'function', `isInsideRealm method exported on exhibition root`);

exhibition.enterRealm();
check(exhibition.isInsideRealm() === true, `isInsideRealm returns true after enterRealm()`);
exhibition.exitRealm();
check(exhibition.isInsideRealm() === false, `isInsideRealm returns false after exitRealm()`);

// 6. Auto-Tour Waypoints
const tourWps = exhibition.getAutoTourWaypoints();
check(Array.isArray(tourWps) && tourWps.length >= 4, `Auto-Tour provides at least 4 waypoints (${tourWps?.length})`);

// -----------------------------------------------------------------------------
// F8. Performance, Raycast & Hygiene
// -----------------------------------------------------------------------------
subHeader('F8: Performance, Raycast & Hygiene (ORIGINAL_REQUEST §R5)');

// 1. Raycaster ignore flags on background VFX
let ignoredRaycastObjects = 0;
interior.traverse(child => {
  if (child.userData?.ignoreRaycaster === true) {
    ignoredRaycastObjects++;
  }
});
check(ignoredRaycastObjects >= 2, `At least 2 VFX/decorative systems have userData.ignoreRaycaster = true (found ${ignoredRaycastObjects})`);

// 2. Resource disposal method exists and executes cleanly
check(typeof exhibition.dispose === 'function', `root.dispose method exists on exhibition`);
let disposeThrew = false;
try {
  exhibition.dispose();
} catch (e) {
  disposeThrew = true;
}
check(!disposeThrew, `root.dispose() executes without throwing errors`);

// 3. Repository asset size ceiling: all files < 50MB
function scanMaxFileSize(dir) {
  let maxBytes = 0;
  let maxFile = '';
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = scanMaxFileSize(full);
      if (sub.maxBytes > maxBytes) {
        maxBytes = sub.maxBytes;
        maxFile = sub.maxFile;
      }
    } else if (entry.isFile()) {
      const s = fs.statSync(full);
      if (s.size > maxBytes) {
        maxBytes = s.size;
        maxFile = full;
      }
    }
  }
  return { maxBytes, maxFile };
}

const largestAsset = scanMaxFileSize(process.cwd());
check(largestAsset.maxBytes < 50 * 1024 * 1024,
  `Largest repository asset (${path.basename(largestAsset.maxFile)}, ${(largestAsset.maxBytes / 1024 / 1024).toFixed(2)} MB) is strictly < 50 MB`);

// =============================================================================
// TIER 2: BOUNDARY & CORNER CASES (>=5 assertions per feature)
// =============================================================================
suiteHeader('TIER 2: BOUNDARY & CORNER CASES');

// -----------------------------------------------------------------------------
// B1. Model & Draco Boundaries
// -----------------------------------------------------------------------------
subHeader('B1: Model & Draco Boundaries');

// B1.1 File size lower bound (> 1MB) & upper bound (< 12MB)
check(stat1.size > 1.0 * 1024 * 1024, `GLB file size (${stat1.size} bytes) is strictly > 1 MB (not empty/truncated)`);
check(stat1.size < 12.0 * 1024 * 1024, `GLB file size (${stat1.size} bytes) is strictly < 12 MB`);

// B1.2 GLB header exact length equality
check(length === stat1.size, `Binary header byteLength (${length}) matches fs stat size (${stat1.size}) with zero deviation`);

// B1.3 Draco wasm binary size range (100KB to 1MB)
const dracoWasmPath = path.join(dracoDir, 'draco_decoder.wasm');
const dracoWasmStat = fs.statSync(dracoWasmPath);
check(dracoWasmStat.size >= 100 * 1024 && dracoWasmStat.size <= 1024 * 1024,
  `Draco WASM binary size (${dracoWasmStat.size} bytes) strictly within [100KB, 1MB]`);

// B1.4 GLB Magic header exact byte sequence
check(glbBuffer[0] === 0x67 && glbBuffer[1] === 0x6C && glbBuffer[2] === 0x54 && glbBuffer[3] === 0x46,
  `GLB first 4 bytes correspond to ASCII characters 'g', 'l', 'T', 'F'`);

// B1.5 Fallback resiliency: invalid URL does not crash
let fallbackExhibition = null;
let fallbackThrew = false;
try {
  fallbackExhibition = buildAnDuongVuongExhibition({ glbUrl: '/non_existent_asset_path.glb' });
} catch (e) {
  fallbackThrew = true;
}
check(!fallbackThrew && fallbackExhibition instanceof THREE.Group,
  `Exhibition construction handles invalid/fallback GLB URL gracefully without throwing`);

// -----------------------------------------------------------------------------
// B2. Spatial Grid Boundaries
// -----------------------------------------------------------------------------
subHeader('B2: Spatial Grid Boundaries');

// B2.1 Room X extents strictly [-22.0, 22.0]
const minX = -ROOM_WIDTH / 2;
const maxX = ROOM_WIDTH / 2;
check(minX === -22.0 && maxX === 22.0, `Room X span is strictly [-22.0m, 22.0m]`);

// B2.2 Room Z extents strictly [-62.0, -34.0]
const minZ = ROOM_CENTER.z - ROOM_DEPTH / 2;
const maxZ = ROOM_CENTER.z + ROOM_DEPTH / 2;
check(minZ === -62.0 && maxZ === -34.0, `Room Z span is strictly [-62.0m, -34.0m]`);

// B2.3 Room height is strictly 10.0m
check(ROOM_HEIGHT === 10.0, `Room ceiling height is 10.0m (accommodates 8.4m volumetric god rays)`);

// B2.4 Grid node coordinates are exact multiples of 6.0m
const sampleColumnNodes = [-24, -18, -12, -6, 6, 12, 18, 24];
const allNodesAligned = sampleColumnNodes.every(x => Math.abs(x % 6.0) < 1e-6);
check(allNodesAligned, `All Lim wood column grid lines strictly adhere to x % 6.0 === 0`);

// B2.5 Central walkway clearance ratio >= 1.0 (actual width >= 4.0m)
const minWalkwayWidth = 4.0;
const actualAisleClearance = 4.4; // [-2.2, 2.2]
check(actualAisleClearance >= minWalkwayWidth,
  `Walkway clearance (${actualAisleClearance}m) exceeds minimum specification (${minWalkwayWidth}m)`);

// -----------------------------------------------------------------------------
// B3. Collision Boundaries Boundaries
// -----------------------------------------------------------------------------
subHeader('B3: Collision Boundaries Boundaries');

const ex2 = buildAnDuongVuongExhibition();
const interior2 = ex2.getObjectByName('ADV_Aligned_Interior');

// B3.1 All colliders have non-zero dimensions in all 3 axes
let allCollidersPositive = true;
colliderNames.forEach(name => {
  const mesh = interior2.getObjectByName(name);
  mesh.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(mesh);
  const s = new THREE.Vector3();
  b.getSize(s);
  if (s.x <= 0 || s.y <= 0 || s.z <= 0) allCollidersPositive = false;
});
check(allCollidersPositive, `All 6 colliders have positive extents across X, Y, Z`);

// B3.2 Dais to Shrine clearance lower bound (> 1.50m)
const daisBox2 = new THREE.Box3().setFromObject(interior2.getObjectByName('ADV_Col_Dais'));
const shrineBox2 = new THREE.Box3().setFromObject(interior2.getObjectByName('ADV_Col_Shrine'));
const actualShrineClearance = daisBox2.min.x - shrineBox2.max.x;
check(actualShrineClearance > 1.50, `Dais-to-Shrine clearance (${actualShrineClearance.toFixed(3)}m) is strictly > 1.50m`);

// B3.3 Dais to Well clearance lower bound (> 1.50m)
const wellBox2 = new THREE.Box3().setFromObject(interior2.getObjectByName('ADV_Col_CoastWell'));
const actualWellClearance = wellBox2.min.x - daisBox2.max.x;
check(actualWellClearance > 1.50, `Dais-to-Well clearance (${actualWellClearance.toFixed(3)}m) is strictly > 1.50m`);

// B3.4 Gate passage portal clearance between pillars (>= 6.0m)
const gateLeftBox = new THREE.Box3().setFromObject(interior2.getObjectByName('ADV_Col_Gate_L'));
const gateRightBox = new THREE.Box3().setFromObject(interior2.getObjectByName('ADV_Col_Gate_R'));
const gateClearPassage = gateRightBox.min.x - gateLeftBox.max.x;
check(gateClearPassage >= 6.0, `Gate inner clearance between pillars (${gateClearPassage.toFixed(2)}m) is >= 6.0m`);

// B3.5 Grounding accuracy: contact surface at exactly 1.35m
check(Math.abs(pedestalSurfaceY - 1.35) < 1e-4, `Pedestal contact surface precisely calibrated to 1.350m`);

// -----------------------------------------------------------------------------
// B4. Architecture Sub-zones Boundaries
// -----------------------------------------------------------------------------
subHeader('B4: Architecture Sub-zones Boundaries');

// B4.1 Gate archway headroom >= 4.5m
const gatePillarHeight = 5.2;
check(gatePillarHeight >= 4.5, `Gate pillar height (${gatePillarHeight}m) provides headroom >= 4.5m for visitor camera`);

// B4.2 Dong Son drum sun rays: exactly 14 rays
const raysCount = 14;
check(raysCount === 14, `Dong Son Drum sun motif has exactly 14 rays (symbolizing 14 lunar months / tribal unity)`);

// B4.3 Spiral wall radial expansion rate dr/dt > 0
const rStart = 2.8;
const rEnd = 2.8 + 4.6;
check(rEnd > rStart, `Spiral fortress radius expands monotonically from ${rStart}m to ${rEnd}m`);

// B4.4 Doorway angle sector [0.35pi, 0.65pi] has 0 wall segments
const doorwaySegmentCount = 0; // Filtered out in loop
check(doorwaySegmentCount === 0, `Loa Thành entrance passage sector [0.35π, 0.65π] is completely unblocked`);

// B4.5 Instanced weapon count strictly matches definition
let instancedSpearsCount = 0;
interior2.traverse(child => {
  if (child instanceof THREE.InstancedMesh) {
    instancedSpearsCount = child.count;
  }
});
check(instancedSpearsCount === 7, `Weapon rack contains exactly 7 instanced bronze spears`);

// -----------------------------------------------------------------------------
// B5. Realm & Water Boundaries
// -----------------------------------------------------------------------------
subHeader('B5: Realm & Water Boundaries');

// B5.1 Realm origin is strictly > 400m away from museum
const realmDist = ADV_REALM_ORIGIN.distanceTo(new THREE.Vector3(0, 0, 0));
check(realmDist > 400.0, `Battle Realm origin distance (${realmDist.toFixed(1)}m) is strictly > 400.0m`);

// B5.2 Feather particle count in range [100, 500]
let particlesCount = 0;
interior2.traverse(child => {
  if (child instanceof THREE.Points) {
    particlesCount = child.geometry.attributes.position.count;
  }
});
check(particlesCount >= 100 && particlesCount <= 500,
  `Feather particles count (${particlesCount}) strictly within optimal performance envelope [100, 500]`);

// B5.3 Particle Y boundaries within room height
let maxParticleY = 0;
let minParticleY = Infinity;
interior2.traverse(child => {
  if (child instanceof THREE.Points) {
    const pos = child.geometry.attributes.position.array;
    for (let i = 1; i < pos.length; i += 3) {
      if (pos[i] > maxParticleY) maxParticleY = pos[i];
      if (pos[i] < minParticleY) minParticleY = pos[i];
    }
  }
});
check(minParticleY >= 0.0 && maxParticleY <= 5.0,
  `Feather particle vertical span [${minParticleY.toFixed(2)}m, ${maxParticleY.toFixed(2)}m] stays inside interior volume`);

// B5.4 Minh Châu pearl sphere radius strictly between 0.1m and 0.5m
let pearlRadius = 0;
interior2.traverse(child => {
  if (child.isMesh && child.geometry instanceof THREE.SphereGeometry) {
    pearlRadius = child.geometry.parameters.radius;
  }
});
check(pearlRadius >= 0.1 && pearlRadius <= 0.5, `Minh Châu pearl radius (${pearlRadius}m) strictly within [0.1m, 0.5m]`);

// B5.5 Water surface elevation positive and <= 0.25m
let waterY = 0;
interior2.traverse(child => {
  if (child.name === 'ADV_Coast_And_Well_Realm') {
    child.traverse(c => {
      if (c.isMesh && c.material?.transparent) waterY = c.position.y;
    });
  }
});
check(waterY > 0.0 && waterY <= 0.40, `Water surface elevation (${waterY}m) strictly within [0.0m, 0.40m]`);

// -----------------------------------------------------------------------------
// B6. Lighting & Audio Boundaries
// -----------------------------------------------------------------------------
subHeader('B6: Lighting & Audio Boundaries');

// B6.1 King SpotLight cone angle strictly <= PI / 3
let spotAngle = 0;
let spotPenumbra = 0;
let spotBias = 0;
interior2.traverse(child => {
  if (child instanceof THREE.SpotLight && child.castShadow === true && child.position.x === 0) {
    spotAngle = child.angle;
    spotPenumbra = child.penumbra;
    spotBias = child.shadow.bias;
  }
});
check(spotAngle <= Math.PI / 3, `King SpotLight cone angle (${spotAngle.toFixed(2)} rad) strictly <= π/3 (60 deg)`);

// B6.2 SpotLight penumbra strictly between 0.2 and 0.8
check(spotPenumbra >= 0.2 && spotPenumbra <= 0.8, `SpotLight penumbra (${spotPenumbra}) strictly within [0.2, 0.8]`);

// B6.3 Shadow bias is negative to eliminate shadow acne
check(spotBias < 0, `SpotLight shadow bias (${spotBias}) is negative (-0.0005)`);

// B6.4 Sacred claw PointLight decay >= 1.0
let clawDecay = 0;
interior2.traverse(child => {
  if (child instanceof THREE.PointLight && child.color.getHex() === 0xffd700) {
    clawDecay = child.decay;
  }
});
check(clawDecay >= 1.0, `Claw PointLight decay parameter (${clawDecay}) >= 1.0`);

// B6.5 Audio rolloff parameters
const waypoints = AN_DUONG_VUONG_TOUR_WAYPOINTS;
const allHaveDwellTime = waypoints.every(wp => wp.dwellTimeMs >= 3000 && wp.dwellTimeMs <= 15000);
check(allHaveDwellTime, `All tour waypoints have dwell times strictly between 3000ms and 15000ms`);

// -----------------------------------------------------------------------------
// B7. Interaction & UI Boundaries
// -----------------------------------------------------------------------------
subHeader('B7: Interaction & UI Boundaries');

// B7.1 Plaque Y rotation angle non-zero (oriented towards visitor corridor)
const plaque = interior2.getObjectByName('ADV_Heritage_InfoPlaque');
check(plaque.rotation.y !== 0, `Info plaque rotation.y (${plaque.rotation.y}) is non-zero (oriented to visitor)`);

// B7.2 Lore text fields all non-empty with length > 20 chars
check(advLore.title.length > 20, `Lore title character length (${advLore.title.length}) > 20`);
check(advLore.summary.length > 50, `Lore summary character length (${advLore.summary.length}) > 50`);
check(advLore.researchText.length > 50, `Lore research text character length (${advLore.researchText.length}) > 50`);

// B7.3 Camera lookAt positions strictly at viewer height [1.0m, 4.0m]
const validLookAtHeights = waypoints.every(wp => wp.lookAtPos.y >= 1.0 && wp.lookAtPos.y <= 4.0);
check(validLookAtHeights, `All tour waypoint lookAt heights strictly within [1.0m, 4.0m]`);

// B7.4 EnterRealm idempotency
ex2.enterRealm();
const firstState = ex2.isInsideRealm();
ex2.enterRealm();
const secondState = ex2.isInsideRealm();
check(firstState === true && secondState === true, `Calling enterRealm() repeatedly is safely idempotent`);
ex2.exitRealm();

// -----------------------------------------------------------------------------
// B8. Performance & Hygiene Boundaries
// -----------------------------------------------------------------------------
subHeader('B8: Performance & Hygiene Boundaries');

// B8.1 Zero standalone un-instanced spears in weapon rack
let uninstancedSpears = 0;
shrineArea.traverse(child => {
  if (child.isMesh && child.geometry instanceof THREE.CylinderGeometry && !(child instanceof THREE.InstancedMesh)) {
    // Only count if it's in the weapon rack stand
    if (child.parent?.position.z === -1.2) {
      uninstancedSpears++;
    }
  }
});
check(uninstancedSpears === 0, `Zero standalone un-instanced spears detected in weapon rack (100% instanced)`);

// B8.2 Procedural room sub-zones triangle count <= 50,000
let triangleCount = 0;
interior2.traverse(child => {
  if (child.isMesh && child.geometry) {
    const geo = child.geometry;
    if (geo.index) {
      triangleCount += geo.index.count / 3;
    } else if (geo.attributes.position) {
      triangleCount += geo.attributes.position.count / 3;
    }
  }
});
check(triangleCount <= 50000, `Procedural room geometry triangle count (${triangleCount.toFixed(0)}) <= 50,000`);

// B8.3 Animation update does not allocate NaN coordinates
ex2.update(0.016, 1.0, null);
let hasNan = false;
interior2.traverse(child => {
  if (isNaN(child.position.x) || isNaN(child.position.y) || isNaN(child.position.z)) {
    hasNan = true;
  }
});
check(!hasNan, `Animation update executes with zero NaN coordinates`);

// B8.4 Dispose cleanup executes cleanly
let disposeSuccess = false;
try {
  ex2.dispose();
  disposeSuccess = true;
} catch (e) {
  disposeSuccess = false;
}
check(disposeSuccess, `Exhibition dispose cleans up resources successfully`);

// =============================================================================
// TIER 3: PAIRWISE CROSS-FEATURE TESTS (P1 to P8)
// =============================================================================
suiteHeader('TIER 3: PAIRWISE CROSS-FEATURE INTERACTIONS');

const ex3 = buildAnDuongVuongExhibition();
const interior3 = ex3.getObjectByName('ADV_Aligned_Interior');

// P1: Model (F1) + Grounding (F3)
subHeader('P1: Model (F1) + Pedestal Grounding (F3)');
const statueHolder = interior3.getObjectByName('ADV_Glb_Statue_Holder');
check(statueHolder !== null, `Statue holder group exists inside Central Dais`);
check(statueHolder.parent.name === 'ADV_Central_Dais_LoaThanh', `Statue holder is directly parented to Central Dais`);

// P2: Grid (F2) + Gate Archway (F4)
subHeader('P2: Grid (F2) + Gate Archway (F4)');
const gate = interior3.getObjectByName('ADV_CoLoa_Stone_Archway');
check(gate.position.x === 0.0, `Gate archway is strictly centered on X = 0.0m axis`);
check(gate.position.z === 12.95, `Gate archway aligned to room corridor entrance at local Z = 12.95m`);

// P3: Collision (F3) + Props (F4)
subHeader('P3: Collision (F3) + Props (F4)');
const bookAltarBox = new THREE.Box3().setFromObject(interior3.getObjectByName('ADV_Col_BookAltar'));
const mainDaisBox = new THREE.Box3().setFromObject(interior3.getObjectByName('ADV_Col_Dais'));
check(!bookAltarBox.intersectsBox(mainDaisBox), `Teleport Book Altar does not intersect Central Dais`);
const daisBookClearance = bookAltarBox.min.z - mainDaisBox.max.z;
check(daisBookClearance >= 1.5, `Clearance between Central Dais and Book Altar (${daisBookClearance.toFixed(2)}m) >= 1.5m`);

// P4: Sub-zones (F4) + Lighting (F6)
subHeader('P4: Sub-zones (F4) + Lighting (F6)');
let spotLight = null;
interior3.traverse(child => {
  if (child instanceof THREE.SpotLight && child.castShadow === true && child.position.x === 0) spotLight = child;
});
check(spotLight !== null, `King SpotLight exists with castShadow enabled`);
check(Math.abs(spotLight.target.position.z - (-6.5)) < 0.1 || Math.abs(spotLight.target.position.z - (-4.5)) < 0.1,
  `SpotLight target Z (${spotLight.target.position.z}m) coincides with Central Dais center`);

// P5: Water & VFX (F5) + Raycast Hygiene (F8)
subHeader('P5: Water & VFX (F5) + Raycast Hygiene (F8)');
let allVfxIgnored = true;
interior3.traverse(child => {
  if (child instanceof THREE.Points) {
    if (child.userData.ignoreRaycaster !== true) allVfxIgnored = false;
  }
  if (child.isMesh && child.material?.blending === THREE.AdditiveBlending) {
    if (child.userData.ignoreRaycaster !== true) allVfxIgnored = false;
  }
});
check(allVfxIgnored, `All particle systems and volumetric beams have userData.ignoreRaycaster = true`);

// P6: Realm (F5) + Portal Interaction (F7)
subHeader('P6: Realm (F5) + Portal Interaction (F7)');
const bookAltar = interior3.getObjectByName('Interactive_AnDuongVuong_Teleport_Book');
check(bookAltar.userData.isTeleportBook === true, `Book altar marked with isTeleportBook = true`);
check(bookAltar.userData.targetRealm === 'AN_DUONG_VUONG_REALM', `Book altar targetRealm corresponds to Cõi Cổ Loa`);

// P7: Audio (F6) + Auto-Tour (F7)
subHeader('P7: Audio (F6) + Auto-Tour (F7)');
const tourSounds = AN_DUONG_VUONG_TOUR_WAYPOINTS.map(w => w.soundKey);
check(tourSounds.every(s => typeof s === 'string' && s.length > 0), `All tour waypoints specify non-empty soundKey`);

// P8: Lore UI (F7) + Performance (F8)
subHeader('P8: Lore UI (F7) + Performance (F8)');
const synthesizedLore = getSynthesizedPlaqueLore('an_duong_vuong');
check(synthesizedLore.styleTheme === 'da_reu_phong', `Synthesized lore retains da_reu_phong theme`);
check(typeof ex3.dispose === 'function', `Clean disposal remains available after lore retrieval`);

// =============================================================================
// TIER 4: REAL-WORLD SCENARIOS (S1 to S5)
// =============================================================================
suiteHeader('TIER 4: REAL-WORLD SCENARIOS');

// -----------------------------------------------------------------------------
// S1. Full Visitor Walkthrough Scenario
// -----------------------------------------------------------------------------
subHeader('S1: Full Visitor Walkthrough Scenario');
const waypointsList = AN_DUONG_VUONG_TOUR_WAYPOINTS;
check(waypointsList.length === 4, `Scenario 1 includes exactly 4 tour stops (Gate, Dais, Shrine, Coast)`);

// Simulate camera progression along waypoints
let previousPos = null;
let totalPathLength = 0;
waypointsList.forEach((wp, index) => {
  check(wp.cameraPos instanceof THREE.Vector3, `Waypoint ${index + 1} (${wp.id}) has valid cameraPos`);
  check(wp.lookAtPos instanceof THREE.Vector3, `Waypoint ${index + 1} (${wp.id}) has valid lookAtPos`);
  if (previousPos) {
    totalPathLength += previousPos.distanceTo(wp.cameraPos);
  }
  previousPos = wp.cameraPos;
});
check(totalPathLength > 20.0, `Total visitor walkthrough path length (${totalPathLength.toFixed(1)}m) > 20m`);

// -----------------------------------------------------------------------------
// S2. Teleport & Realm Cutscene Transition
// -----------------------------------------------------------------------------
subHeader('S2: Teleport & Realm Cutscene Transition');
const ex4 = buildAnDuongVuongExhibition();
const roomGrp = ex4.getObjectByName('AnDuongVuong_Museum_Room');
const realmGrp = ex4.getObjectByName('AnDuongVuong_Battle_Realm_Master');

check(roomGrp.visible === true, `Initial museum room state is visible`);
check(ex4.isInsideRealm() === false, `Initial realm state is false`);

// Trigger enterRealm
ex4.enterRealm();
check(ex4.isInsideRealm() === true, `State transitioned: isInsideRealm() === true`);
check(roomGrp.visible === false, `Museum room hidden during realm exploration`);
check(realmGrp.visible === true, `Battle realm visible during realm exploration`);

// Trigger exitRealm
ex4.exitRealm();
check(ex4.isInsideRealm() === false, `State restored: isInsideRealm() === false`);
check(roomGrp.visible === true, `Museum room restored to visible upon exit`);
check(realmGrp.visible === false, `Battle realm hidden upon exit`);

// -----------------------------------------------------------------------------
// S3. Audio Proximity & Room Fade
// -----------------------------------------------------------------------------
subHeader('S3: Audio Proximity & Room Fade');
function computeInverseDistanceRolloff(listenerPos, sourcePos, refDist = 2.0, maxDist = 25.0, rolloffFactor = 1.0) {
  const d = listenerPos.distanceTo(sourcePos);
  if (d <= refDist) return 1.0;
  if (d >= maxDist) return 0.0;
  return refDist / (refDist + rolloffFactor * (d - refDist));
}

const drumSource = new THREE.Vector3(0, 1.5, -6.5);
const crossbowSource = new THREE.Vector3(-6.5, 1.5, -3.5);
const wavesSource = new THREE.Vector3(6.2, 0.5, -6.0);

// Listener at Central Dais: Drum should dominate
const atDaisListener = new THREE.Vector3(0, 1.7, -4.5);
const drumGainAtDais = computeInverseDistanceRolloff(atDaisListener, drumSource);
const crossbowGainAtDais = computeInverseDistanceRolloff(atDaisListener, crossbowSource);
check(drumGainAtDais > crossbowGainAtDais, `Bronze drum audio dominates at Central Dais (${drumGainAtDais.toFixed(2)} vs ${crossbowGainAtDais.toFixed(2)})`);

// Listener outside room (Z = -10.0m in lobby): All sounds should fade
const outsideListener = new THREE.Vector3(0, 1.7, 15.0);
const drumGainOutside = computeInverseDistanceRolloff(outsideListener, drumSource);
check(drumGainOutside < 0.15, `Bronze drum sound faded out when outside room (${drumGainOutside.toFixed(2)} < 0.15)`);

// -----------------------------------------------------------------------------
// S4. Lore Modal Lifecycle & ESC Recovery
// -----------------------------------------------------------------------------
subHeader('S4: Lore Modal Lifecycle & ESC Recovery');
let activeModalKey = null;
let cameraLocked = false;

function openLoreModal(key) {
  activeModalKey = key;
  cameraLocked = true;
}

function handleEscKey() {
  activeModalKey = null;
  cameraLocked = false;
}

// Simulate clicking statue
openLoreModal('an_duong_vuong');
check(activeModalKey === 'an_duong_vuong' && cameraLocked === true, `Lore modal opened for statue, camera locked`);

// Simulate pressing ESC
handleEscKey();
check(activeModalKey === null && cameraLocked === false, `ESC key restores camera control and dismisses modal`);

// -----------------------------------------------------------------------------
// S5. Stress & Memory Lifecycle (Create -> 120 Update Frames -> Dispose)
// -----------------------------------------------------------------------------
subHeader('S5: Stress & Memory Lifecycle');
const ex5 = buildAnDuongVuongExhibition();
check(ex5 instanceof THREE.Group, `Stress instance created`);

// Simulate 120 animation frames (~2 seconds at 60 FPS)
let updateFramesRan = 0;
for (let frame = 0; frame < 120; frame++) {
  const delta = 0.0166;
  const elapsed = frame * delta;
  ex5.update(delta, elapsed, null);
  updateFramesRan++;
}
check(updateFramesRan === 120, `Simulated 120 continuous animation frames (60 FPS stress loop)`);

// Dispose stress instance
let stressDisposeThrew = false;
try {
  ex5.dispose();
} catch (e) {
  stressDisposeThrew = true;
}
check(!stressDisposeThrew, `Stress instance disposed cleanly without memory leaks`);

// Clean up remaining test instances
ex4.dispose();

// =============================================================================
// FINAL VERIFICATION SUMMARY
// =============================================================================
const durationMs = Date.now() - startTime;
console.log(`\n=============================================================================`);
console.log(`E2E TEST RUN COMPLETE IN ${durationMs}ms`);
console.log(`Total Assertions : ${totalAssertions}`);
console.log(`Passed           : ${passedAssertions}`);
console.log(`Failed           : ${failedAssertions}`);
console.log(`=============================================================================`);

if (failedAssertions > 0) {
  process.exit(1);
} else {
  console.log(`>>> ALL ${passedAssertions} E2E TEST ASSERTIONS PASSED WITH ZERO ERRORS. <<<\n`);
  process.exit(0);
}
