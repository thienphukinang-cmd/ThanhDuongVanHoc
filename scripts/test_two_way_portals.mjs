import * as THREE from 'three';
import assert from 'node:assert';

console.log('=== TESTING TWO-WAY PORTAL ACTIVATION & AWAKENING SHADER ===');

// Test 1: Room Portal (Obsidian Mirror -> Emerald/Gold Vortex)
import { buildAnDuongVuongExhibition } from '../src/modules/anDuongVuongRoomDecorator.js';

const mockScene = new THREE.Scene();
const mockCamera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
mockCamera.position.set(0, 1.7, -40);

const colliders = [];
const exhibition = buildAnDuongVuongExhibition({
  roomCenter: new THREE.Vector3(0, 0, -48),
  scene: mockScene,
  camera: mockCamera,
  colliders: colliders
});
const roomGroup = exhibition.roomGroup || exhibition;

let portalProxy = null;
let portalMesh = null;
roomGroup.traverse((obj) => {
  if (obj.userData?.isBookPortal || obj.userData?.type === 'portal') portalProxy = obj;
  if (obj.name && obj.name.includes('Portal') && obj.material?.uniforms?.uAwaken) portalMesh = obj;
});

assert(portalProxy, 'Room portal click proxy must exist');
console.log('✓ Room portal click proxy found:', portalProxy.name, portalProxy.userData.action);

assert(portalMesh, 'Awakening portal shader mesh must exist');
assert(portalMesh.material.uniforms.uAwaken, 'uAwaken uniform must exist');
console.log('✓ Portal awakening uniform exists. Initial uAwaken:', portalMesh.material.uniforms.uAwaken.value);

// Test idle uAwaken when camera is far
if (typeof roomGroup.update === 'function') {
  mockCamera.position.set(0, 1.7, -35); // far
  roomGroup.update(0.016, 1.0, mockCamera);
  assert(portalMesh.material.uniforms.uAwaken.value < 0.2, 'uAwaken must stay near idle when far');
  console.log('✓ Idle state confirmed (uAwaken < 0.2):', portalMesh.material.uniforms.uAwaken.value);

  // Move camera close (< 6m)
  const portalWorldPos = new THREE.Vector3();
  portalMesh.getWorldPosition(portalWorldPos);
  mockCamera.position.set(portalWorldPos.x, portalWorldPos.y, portalWorldPos.z + 4.0); // 4m away
  for (let f = 0; f < 30; f++) {
    roomGroup.update(0.016, 1.0 + f * 0.016, mockCamera);
  }
  assert(portalMesh.material.uniforms.uAwaken.value > 0.5, 'uAwaken must lerp up toward 1.0 when camera < 6m');
  console.log('✓ Awakened state confirmed (uAwaken > 0.5):', portalMesh.material.uniforms.uAwaken.value);
}

// Test 2: Realm Return Portal
import { AnDuongVuongWorld, getTerrainHeight } from '../src/worlds/anDuongVuongWorld.js';

const realmScene = new THREE.Scene();
const realmCamera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
const world = new AnDuongVuongWorld(realmScene, realmCamera, null);
await world.init();

let returnProxy = null;
realmScene.traverse((obj) => {
  if (obj.userData?.action === 'exitRealm' || obj.name?.includes('Return_Portal')) returnProxy = obj;
});

assert(returnProxy, 'Return portal proxy must exist in realm');
console.log('✓ Return portal proxy found in realm:', returnProxy.name, returnProxy.userData?.action);

// Test proximity trigger in realm update
if (typeof world.update === 'function') {
  let exitTriggered = false;
  world._triggerExitRealm = () => { exitTriggered = true; };
  
  // Set camera close to return portal (< 2.2m) at proper terrain ground elevation
  const groundY = getTerrainHeight(0, -5.0);
  realmCamera.position.set(0, groundY + 1.2, -5.0); // player standing right in front of return portal
  world.update(0.016, 2.0);
  assert(exitTriggered, 'Proximity trigger must call exitRealm when camera < 2.2m from return portal');
  console.log('✓ Realm proximity trigger successfully invoked exitRealm!');
}

console.log('\nALL TWO-WAY PORTAL TESTS PASSED 100%!');
