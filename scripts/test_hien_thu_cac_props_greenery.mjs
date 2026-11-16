import * as THREE from 'three';
import {
  createClassicDeskLamp,
  createLotusWoodenBookstand,
  createAntiqueBookStack,
  createWhitePorcelainTeaSet,
  createCalligraphyBrushPotAndInkStone,
  createAristocraticBambooPlanter,
  createGnarledPineBonsaiPlanter,
  createTeaSteamVfx,
  buildHienThuCacGreenery,
  decorateStudyTablesWithProps,
  decorateBalconyTablesWithProps,
  setupHienThuCacPropsAndGreenery
} from '../src/modules/hienThuCacPropsAndGreenery.js';

console.log('--- STARTING QA TEST: HIEN THU CAC PROPS & GREENERY (@vangtho) ---');

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

function verifyGeo(mesh, name) {
  const geo = mesh.geometry;
  if (!geo) return;
  const pos = geo.getAttribute('position');
  if (pos) {
    for (let i = 0; i < pos.count * pos.itemSize; i++) {
      if (!Number.isFinite(pos.array[i])) {
        throw new Error(`NaN/Inf in geometry position of ${name}`);
      }
    }
  }
  const norm = geo.getAttribute('normal');
  if (norm) {
    for (let i = 0; i < norm.count * norm.itemSize; i++) {
      if (!Number.isFinite(norm.array[i])) {
        throw new Error(`NaN/Inf in geometry normal of ${name}`);
      }
    }
  }
}

// 1. Test Classic Desk Lamp
const lamp = createClassicDeskLamp();
assert(lamp instanceof THREE.Group, 'Classic Desk Lamp is THREE.Group');
let hasPointLight = false;
lamp.traverse((child) => {
  if (child.isPointLight) hasPointLight = true;
  if (child.isMesh) verifyGeo(child, 'DeskLamp');
});
assert(hasPointLight, 'Desk Lamp contains local warm PointLight');

// 2. Test Lotus Wooden Bookstand
const bookstand = createLotusWoodenBookstand();
assert(bookstand instanceof THREE.Group, 'Lotus Bookstand is THREE.Group');
bookstand.traverse((c) => { if (c.isMesh) verifyGeo(c, 'Bookstand'); });

// 3. Test Antique Book Stack
const bookStack = createAntiqueBookStack();
assert(bookStack instanceof THREE.Group, 'Book Stack is THREE.Group');
bookStack.traverse((c) => { if (c.isMesh) verifyGeo(c, 'BookStack'); });

// 4. Test White Porcelain Tea Set
const teaSet = createWhitePorcelainTeaSet();
assert(teaSet instanceof THREE.Group, 'Tea Set is THREE.Group');
teaSet.traverse((c) => { if (c.isMesh) verifyGeo(c, 'TeaSet'); });

// 5. Test Writing Set (Brush pot & Ink stone)
const writingSet = createCalligraphyBrushPotAndInkStone();
assert(writingSet instanceof THREE.Group, 'Writing Set is THREE.Group');
writingSet.traverse((c) => { if (c.isMesh) verifyGeo(c, 'WritingSet'); });

// 6. Test Bamboo Planter
const bamboo = createAristocraticBambooPlanter();
assert(bamboo instanceof THREE.Group, 'Bamboo Planter is THREE.Group');
bamboo.traverse((c) => { if (c.isMesh) verifyGeo(c, 'BambooPlanter'); });

// 7. Test Pine Bonsai Planter
const pine = createGnarledPineBonsaiPlanter();
assert(pine instanceof THREE.Group, 'Pine Bonsai Planter is THREE.Group');
pine.traverse((c) => { if (c.isMesh) verifyGeo(c, 'PineBonsaiPlanter'); });

// 8. Test Steam VFX
const steamParent = new THREE.Group();
const emitterPos = [new THREE.Vector3(19.5, 10.8, 8.5), new THREE.Vector3(25.5, 10.8, 8.5)];
const steamVfx = createTeaSteamVfx(steamParent, emitterPos);
assert(steamVfx.instancedMesh instanceof THREE.InstancedMesh, 'Steam VFX is InstancedMesh');
steamVfx.updateSteam(1.234);
assert(true, 'Steam VFX update loop runs without error');

// 9. Test Greenery Sanctuary
const greeneryParent = new THREE.Group();
const greeneryRes = buildHienThuCacGreenery(greeneryParent);
assert(greeneryRes.plantItems.length >= 15, `Greenery sanctuary contains ${greeneryRes.plantItems.length} heritage plants`);
greeneryRes.updateGreenery(2.5);
assert(true, 'Greenery wind update loop runs without error');

// 10. Test Full Integration with Mock Lounge Group
const mockLounge = new THREE.Group();
const mockStudyTables = [];
for (let i = 0; i < 6; i++) {
  const t = new THREE.Group();
  t.position.set(19.5 + (i % 2) * 6.0, 10.0, 8.5 + Math.floor(i / 2) * 4.5);
  mockStudyTables.push(t);
  mockLounge.add(t);
}

const mockBalcony = new THREE.Group();
for (let i = 0; i < 4; i++) {
  const b = new THREE.Group();
  b.position.set(11.5 + i * 5.0, 10.0, 21.0);
  mockBalcony.add(b);
}
mockLounge.add(mockBalcony);

const setupRes = setupHienThuCacPropsAndGreenery(mockLounge, {
  studyTables: mockStudyTables,
  balconyTables: mockBalcony
});

assert(setupRes !== null, 'setupHienThuCacPropsAndGreenery completed successfully');
assert(typeof mockLounge.userData.updateProps === 'function', 'mockLounge has updateProps attached');

// Run animation loop for 10 frames
for (let f = 0; f < 10; f++) {
  mockLounge.userData.updateProps(f * 0.016);
}
assert(true, 'updateProps 10 frames executed cleanly');

console.log('🎉 ALL QA TESTS PASSED PERFECTLY FOR HIEN THU CAC PROPS & GREENERY!');
