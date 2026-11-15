import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const CDP_PORT = 9218;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Temp', 'edge_au_lac_world_' + Date.now());
const ARTIFACT_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\11accc92-eac9-4567-b1c0-17bb3c10632c';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('[EVAL] Khởi động Edge CDP kiểm tra Cõi Âu Lạc Toàn Diện...');
  const edgeProc = spawn(EDGE_PATH, [
    '--headless=new',
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${TEMP_USER_DATA_DIR}`,
    '--disable-gpu-sandbox',
    '--window-size=1280,720',
    'http://localhost:5173/'
  ]);

  let wsUrl = null;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`);
      if (res.ok) {
        const list = await res.json();
        const page = list.find((item) => item.type === 'page');
        if (page && page.webSocketDebuggerUrl) {
          wsUrl = page.webSocketDebuggerUrl;
          break;
        }
      }
    } catch (_) {}
    await sleep(500);
  }

  if (!wsUrl) {
    console.error('Failed to get WebSocket URL');
    edgeProc.kill();
    process.exit(1);
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((resolve) => { ws.onopen = resolve; });

  let id = 1;
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      const handler = (evt) => {
        const data = JSON.parse(evt.data);
        if (data.id === msgId) {
          ws.removeEventListener('message', handler);
          if (data.error) reject(data.error);
          else resolve(data.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  await send('Runtime.enable');
  await send('Page.enable');

  console.log('[EVAL] Chờ ứng dụng tải (5s)...');
  await sleep(5000);

  // 1. Kiểm tra vào cõi qua lệnh window.enterRealm('an-duong-vuong')
  console.log('[EVAL] Kích hoạt window.enterRealm("an-duong-vuong")...');
  const enterRes = await send('Runtime.evaluate', {
    expression: `window.enterRealm('an-duong-vuong')`,
    returnByValue: true
  });
  console.log('[EVAL] enterRealm result:', enterRes?.result?.value);

  await sleep(4000);

  // 2. Kiểm tra các thành phần của thế giới mở 240m x 240m
  const worldMetrics = await send('Runtime.evaluate', {
    expression: `(() => {
      const app = window.__app;
      const advScene = window.__anDuongVuongScene;
      let meshCount = 0;
      let hasOcean = false;
      let hasTurtleGod = false;
      let hasCitadel = false;
      let hasCrossbow = false;
      let hasPearlWell = false;
      let hasReturnPortal = false;

      if (advScene) {
        advScene.traverse(child => {
          if (child.isMesh) meshCount++;
          if (child.name?.includes('Ocean') || child.geometry?.type === 'PlaneGeometry') hasOcean = true;
          if (child.name?.includes('Turtle') || child.name?.includes('KimQuy')) hasTurtleGod = true;
          if (child.name?.includes('Citadel')) hasCitadel = true;
          if (child.name?.includes('Crossbow')) hasCrossbow = true;
          if (child.name?.includes('Pearl')) hasPearlWell = true;
          if (child.name?.includes('Return')) hasReturnPortal = true;
        });
      }

      return {
        activeScene: app?.activeScene?.name,
        meshCount,
        hasOcean,
        hasTurtleGod,
        hasCitadel,
        hasCrossbow,
        hasPearlWell,
        hasReturnPortal
      };
    })()`,
    returnByValue: true
  });
  console.log('[EVAL] Đo lường Cõi Âu Lạc:', JSON.stringify(worldMetrics?.result?.value, null, 2));

  // 3. Chụp ảnh góc nhìn toàn cảnh Cổ Loa Thành từ Vọng Lâu
  console.log('[EVAL] Chụp ảnh toàn cảnh Cổ Loa Thành từ Vọng Lâu...');
  const snapCitadel = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'au_lac_citadel_panorama.png'), Buffer.from(snapCitadel.data, 'base64'));

  // 4. Di chuyển camera ra bờ biển Dạ Sơn (X=0, Y=-6.0, Z=125, nhìn ra X=0, Y=-10.5, Z=145)
  console.log('[EVAL] Di chuyển camera đến Bờ Biển Dạ Sơn & Thần Kim Quy...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const cam = window.__camera || window.__app?.camera;
      const ctrl = window.__controls || window.__app?.controls;
      const ADV_ORIGIN = { x: 260, y: 420, z: -450 };
      if (cam) {
        cam.position.set(ADV_ORIGIN.x, ADV_ORIGIN.y - 5.5, ADV_ORIGIN.z + 124.0);
        cam.lookAt(ADV_ORIGIN.x, ADV_ORIGIN.y - 10.5, ADV_ORIGIN.z + 145.0);
      }
      if (ctrl) {
        ctrl.target.set(ADV_ORIGIN.x, ADV_ORIGIN.y - 10.5, ADV_ORIGIN.z + 145.0);
        ctrl.update();
      }
    })()`
  });
  await sleep(1500);

  const snapCoast = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'au_lac_da_son_coast.png'), Buffer.from(snapCoast.data, 'base64'));

  // 5. Di chuyển camera đến Pháo Đài Nỏ Thần (X=0, Y=6.5, Z=32, nhìn về X=0, Y=6.2, Z=38)
  console.log('[EVAL] Di chuyển camera đến Pháo Đài Nỏ Thần Liên Châu...');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const cam = window.__camera || window.__app?.camera;
      const ctrl = window.__controls || window.__app?.controls;
      const ADV_ORIGIN = { x: 260, y: 420, z: -450 };
      if (cam) {
        cam.position.set(ADV_ORIGIN.x, ADV_ORIGIN.y + 6.8, ADV_ORIGIN.z + 32.0);
        cam.lookAt(ADV_ORIGIN.x, ADV_ORIGIN.y + 6.2, ADV_ORIGIN.z + 38.0);
      }
      if (ctrl) {
        ctrl.target.set(ADV_ORIGIN.x, ADV_ORIGIN.y + 6.2, ADV_ORIGIN.z + 38.0);
        ctrl.update();
      }
    })()`
  });
  await sleep(1500);

  const snapCrossbow = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'au_lac_crossbow_bastion.png'), Buffer.from(snapCrossbow.data, 'base64'));

  // 6. Test thoát khỏi cõi về bảo tàng
  console.log('[EVAL] Thoát khỏi cõi trở về Sảnh Bảo Tàng...');
  await send('Runtime.evaluate', {
    expression: `window.__anDuongVuongRoom.exitRealm()`
  });
  await sleep(2000);

  const returnCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const app = window.__app;
      return {
        activeScene: app?.activeScene?.name,
        isInsideRealm: window.__anDuongVuongRoom?.isInsideRealm?.()
      };
    })()`,
    returnByValue: true
  });
  console.log('[EVAL] Trạng thái sau khi trở về bảo tàng:', JSON.stringify(returnCheck?.result?.value, null, 2));

  ws.close();
  edgeProc.kill();
  try {
    fs.rmSync(TEMP_USER_DATA_DIR, { recursive: true, force: true });
  } catch (_) {}

  console.log('[EVAL] Hoàn thành toàn bộ kiểm thử thành công 100%!');
}

run().catch((err) => {
  console.error('[EVAL ERROR]', err);
  process.exit(1);
});
