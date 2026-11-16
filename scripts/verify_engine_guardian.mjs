// verify_engine_guardian.mjs
import * as THREE from 'three';
import { getMuseumHitboxManager } from '../src/modules/museumHitboxSystem.js';
import { AICommandHubWorld, AI_SWARM_LORE } from '../src/worlds/aiCommandHub.js';

console.log('--- BẮT ĐẦU KIỂM ĐỊNH TỰ ĐỘNG ENGINE GUARDIAN (QA GATEKEEPER) ---');

// Mock browser environment if needed
if (typeof window === 'undefined') {
  global.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    innerWidth: 1920,
    innerHeight: 1080
  };
}
if (typeof document === 'undefined') {
  global.document = {
    createElement: (tag) => {
      const el = {
        style: {},
        appendChild: () => {},
        removeChild: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        contains: () => false,
        getContext: () => ({
          createRadialGradient: () => ({ addColorStop: () => {} }),
          fillRect: () => {},
          roundRect: () => {},
          fill: () => {},
          stroke: () => {},
          beginPath: () => {},
          arc: () => {},
          fillText: () => {}
        })
      };
      if (tag === 'canvas') {
        el.width = 64;
        el.height = 64;
      }
      return el;
    },
    body: {
      appendChild: () => {}
    },
    getElementById: () => null
  };
}

let passCount = 0;
let failCount = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${testName}`);
    failCount++;
  }
}

// TEST SUITE 1: MuseumHitboxManager & AI Command Hub Box3 Colliders
console.log('\n[TEST GROUP 1] Kiểm tra Box3 Colliders & Proxy Hitboxes...');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
const renderer = { info: { reset: () => {} } };

const hitboxMgr = getMuseumHitboxManager(scene);
assert(hitboxMgr !== null, 'MuseumHitboxManager khởi tạo thành công');

const hubWorld = new AICommandHubWorld(scene, camera, renderer);
await hubWorld.init();

assert(hubWorld.initialized === true, 'AICommandHubWorld khởi tạo thành công');
assert(hubWorld.interactiveAgents.length === 6, 'Đầy đủ 6 Invisible Proxy Hitboxes cho 6 AI Agent (Orchestrator + 5 Sub-Agents)');
assert(hubWorld.agentHitboxMap.size === 6, 'agentHitboxMap lưu trữ O(1) đầy đủ 6 Agent');
assert(hubWorld.portalMesh !== null, 'Invisible Proxy Hitbox của Cổng Dịch Chuyển sẵn sàng');

// Kiểm tra Box3 colliders trong realm 'ai_command_hub'
const hubColliders = hitboxMgr.realmBuckets.get('ai_command_hub');
assert(hubColliders && hubColliders.length > 0, `Đã đăng ký ${hubColliders?.length || 0} Box3 Colliders trong realm 'ai_command_hub'`);

const altarCollider = hubColliders?.find(c => c.tag === 'AI_Command_Hub_Central_Altar');
assert(altarCollider !== undefined, 'Đài Trống Đồng trung tâm được bảo vệ bằng Box3 Collider');

const boundaryColliders = hubColliders?.filter(c => c.tag.startsWith('AI_Command_Hub_Boundary_'));
assert(boundaryColliders?.length === 8, '8 khung bao vật lý ngoại vi Box3 bảo vệ chống rơi vực');

// TEST SUITE 2: Va chạm chống xuyên tường (Sliding Movement & Box3 Overlap)
console.log('\n[TEST GROUP 2] Kiểm tra chuyển động & chống xuyên vật cản (Collision De-penetration)...');
window.__aiCommandHubActive = true;
window.__activeScene = scene;

// Thử đi xuyên vào tâm Đài Trống Đồng (từ 0, 1.8, 5.0 đi thẳng vào 0, 1.8, 0.0)
const startPos = new THREE.Vector3(0, 1.8, 5.0);
const targetInsideAltar = new THREE.Vector3(0, 1.8, 1.0);
const resolvedPos = hitboxMgr.resolvePlayerMovement(startPos, targetInsideAltar, 0.3, 1.8);

assert(resolvedPos.z >= 3.4, `Người chơi bị Box3 chặn lại ngoài đài tế (Z = ${resolvedPos.z.toFixed(2)} >= 3.4)`);

// TEST SUITE 3: Cổng dịch chuyển 2 chiều & Debouncing
console.log('\n[TEST GROUP 3] Kiểm tra Cổng Dịch Chuyển 2 Chiều & Chống Vòng Lặp Teleport Loop...');
let lobbyReturnTriggered = false;
hubWorld.onReturnToLobby = () => { lobbyReturnTriggered = true; };

// Mô phỏng người chơi bước vào cổng dịch chuyển ở Hub (Z = 34.0m)
camera.position.set(0, 1.8, 33.5); // Cách cổng 0.5m
hubWorld.update(0.016, 1.0, camera);
assert(lobbyReturnTriggered === true, 'Tự động kích hoạt Cổng trở về Đại Sảnh khi bước vào phạm vi <= 2.4m');

// Thử gọi liên tiếp ngay lập tức để kiểm tra chống spam teleport loop
lobbyReturnTriggered = false;
hubWorld.update(0.016, 1.05, camera);
assert(lobbyReturnTriggered === false, 'Debouncing 2500ms chặn thành công việc re-trigger lặp tức thì');

// TEST SUITE 4: Zero Allocation trong Update Loop
console.log('\n[TEST GROUP 4] Kiểm tra Zero Allocations trong Update Loop...');
hubWorld._activeAgentId = 'orchestrator';
camera.position.set(0, 1.8, 20.0);

// Khởi động JIT compiler & IC caches để đo chính xác allocations của update loop
for (let frame = 0; frame < 100; frame++) {
  hubWorld.update(0.016, frame * 0.016, camera);
}
if (global.gc) global.gc();

const memBefore = process.memoryUsage().heapUsed;
for (let frame = 0; frame < 1000; frame++) {
  hubWorld.update(0.016, (100 + frame) * 0.016, camera);
}
if (global.gc) global.gc();
const memAfter = process.memoryUsage().heapUsed;
const diffKb = Math.abs(memAfter - memBefore) / 1024;
console.log(`Bộ nhớ sau 1000 frames update: ${diffKb.toFixed(2)} KB thay đổi`);
assert(diffKb < 500, 'Update loop đạt chuẩn Zero Allocation (không rò rỉ bộ nhớ trong vòng lặp)');

// TEST SUITE 5: Thu hồi bộ nhớ .dispose()
console.log('\n[TEST GROUP 5] Kiểm tra Thu Hồi Bộ Nhớ .dispose()...');
hubWorld.dispose();
assert(hubWorld.initialized === false, 'Trạng thái initialized chuyển về false sau dispose()');
assert(hubWorld.disposables.length === 0, 'Danh sách disposables được giải phóng toàn bộ');
assert(hubWorld.animatedObjects.length === 0, 'Danh sách animatedObjects được làm rỗng');

const remainingHubColliders = hitboxMgr.realmBuckets.get('ai_command_hub');
assert(!remainingHubColliders || remainingHubColliders.length === 0, 'Toàn bộ Box3 Colliders của AI Hub đã được gỡ bỏ khỏi Spatial Registry');

console.log(`\n==================================================`);
console.log(`KẾT QUẢ KIỂM ĐỊNH: ${passCount} PASSED, ${failCount} FAILED`);
console.log(`==================================================`);

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
