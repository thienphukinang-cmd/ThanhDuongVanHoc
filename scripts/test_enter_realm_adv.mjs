import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const CDP_PORT = 9216;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Temp', 'edge_realm_adv_' + Date.now());
const ARTIFACT_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\11accc92-eac9-4567-b1c0-17bb3c10632c';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('[TEST] Khởi động Edge CDP...');
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

  console.log('[TEST] Chờ ứng dụng khởi tạo (5s)...');
  await sleep(5000);

  // Ẩn bảng DirectorPanel bên trái để chụp toàn cảnh không bị che
  await send('Runtime.evaluate', {
    expression: `(() => {
      const dp = document.getElementById('director-panel');
      if (dp) dp.style.display = 'none';
      const tour = document.getElementById('tour-hud');
      if (tour) tour.style.display = 'none';
    })()`
  });

  console.log('[TEST] Kích hoạt window.enterRealm("an_duong_vuong")...');
  const enterResult = await send('Runtime.evaluate', {
    expression: `window.enterRealm('an_duong_vuong')`,
    returnByValue: true
  });
  console.log('[TEST] enterRealm result:', enterResult?.result?.value);

  // Chờ cutscene và nạp model GLB (4.5s)
  await sleep(4500);

  const inspectRealmState = await send('Runtime.evaluate', {
    expression: `(() => {
      const app = window.__app;
      const cam = window.__camera || app?.camera;
      const advRoom = window.__anDuongVuongRoom;
      const advScene = window.__anDuongVuongScene;
      const hud = document.getElementById('adv-realm-top-hud');

      let meshCount = 0;
      if (advScene) {
        advScene.traverse(child => { if (child.isMesh) meshCount++; });
      }

      return {
        activeSceneName: app?.activeScene?.name,
        isInsideRealm: advRoom?.isInsideRealm?.(),
        cameraPos: cam ? { x: cam.position.x, y: cam.position.y, z: cam.position.z } : null,
        meshCount,
        hudDisplay: hud ? hud.style.display : null,
        hudText: hud ? hud.innerText : null
      };
    })()`,
    returnByValue: true
  });
  console.log('[TEST] Trạng thái sau khi vào cõi:', JSON.stringify(inspectRealmState?.result?.value, null, 2));

  // Chụp ảnh màn hình Cõi An Dương Vương
  console.log('[TEST] Chụp ảnh màn hình Cõi An Dương Vương...');
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  const outPath = path.join(ARTIFACT_DIR, 'realm_an_duong_vuong_live.png');
  fs.writeFileSync(outPath, Buffer.from(screenshot.data, 'base64'));
  console.log(`[TEST] Đã lưu ảnh chụp tại: ${outPath}`);

  // Test thoát khỏi cõi
  console.log('[TEST] Thoát khỏi cõi trở về bảo tàng...');
  await send('Runtime.evaluate', {
    expression: `window.__anDuongVuongRoom.exitRealm()`,
    returnByValue: true
  });
  await sleep(2000);

  const returnState = await send('Runtime.evaluate', {
    expression: `(() => {
      const app = window.__app;
      const advRoom = window.__anDuongVuongRoom;
      return {
        activeSceneName: app?.activeScene?.name,
        isInsideRealm: advRoom?.isInsideRealm?.()
      };
    })()`,
    returnByValue: true
  });
  console.log('[TEST] Trạng thái sau khi thoát cõi:', JSON.stringify(returnState?.result?.value, null, 2));

  ws.close();
  edgeProc.kill();
  try {
    fs.rmSync(TEMP_USER_DATA_DIR, { recursive: true, force: true });
  } catch (_) {}

  console.log('[TEST] Hoàn thành kiểm tra thành công!');
}

run().catch((err) => {
  console.error('[TEST ERROR]', err);
  process.exit(1);
});
