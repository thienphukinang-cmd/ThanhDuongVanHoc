import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const CDP_PORT = 9226;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Temp', 'edge_flow_' + Date.now());
const ARTIFACT_DIR = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\11accc92-eac9-4567-b1c0-17bb3c10632c';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
  console.log('[FLOW TEST] Spawning Edge...');
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
    await sleep(400);
  }

  if (!wsUrl) {
    console.error('Cannot connect to CDP');
    edgeProc.kill();
    process.exit(1);
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((r) => { ws.onopen = r; });

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

  ws.addEventListener('message', (evt) => {
    const data = JSON.parse(evt.data);
    if (data.method === 'Runtime.consoleAPICalled') {
      const text = data.params.args.map((a) => a.value || a.description || '').join(' ');
      console.log(`[BROWSER CONSOLE] ${text}`);
    }
    if (data.method === 'Runtime.exceptionThrown') {
      console.error('[BROWSER EXCEPTION]', data.params.exceptionDetails?.text, data.params.exceptionDetails?.exception?.description);
    }
  });

  await send('Runtime.enable');
  await send('Page.enable');

  console.log('[FLOW TEST] Waiting 5s for initial load...');
  await sleep(5000);

  // Step 1: Go into Truyen Kieu realm like user did
  console.log('[FLOW TEST] Step 1: Click enter Truyen Kieu');
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = document.getElementById('btn-enter-kieuworld');
      if (btn) btn.click();
      else if (window.enterRealm) window.enterRealm('truyen_kieu');
    })()`,
    returnByValue: true
  });

  await sleep(4000);

  // Step 2: Exit Truyen Kieu back to museum
  console.log('[FLOW TEST] Step 2: Exit Truyen Kieu back to museum');
  await send('Runtime.evaluate', {
    expression: `(() => {
      // Find exit button or press ESC
      const exitBtn = document.querySelector('.realm-exit-btn, #btn-exit-realm, #btn-exit-kieu, .kieu-exit-btn');
      if (exitBtn) exitBtn.click();
      else if (window.__kieuWorld?.returnToMuseumWithWarp) window.__kieuWorld.returnToMuseumWithWarp();
    })()`,
    returnByValue: true
  });

  await sleep(3000);

  // Step 3: Now call window.enterRealm('an_duong_vuong')
  console.log('[FLOW TEST] Step 3: Calling window.enterRealm("an_duong_vuong")');
  const enterAdv = await send('Runtime.evaluate', {
    expression: `window.enterRealm('an_duong_vuong')`,
    returnByValue: true
  });
  console.log('[FLOW TEST] enterRealm returned:', enterAdv?.result?.value);

  await sleep(3000);

  // Step 4: Capture screenshot and diagnose
  console.log('[FLOW TEST] Step 4: Capturing screenshot...');
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  const shotPath = path.join(ARTIFACT_DIR, 'flow_test_result.png');
  fs.writeFileSync(shotPath, Buffer.from(shot.data, 'base64'));
  console.log('[FLOW TEST] Saved screenshot to', shotPath);

  const state = await send('Runtime.evaluate', {
    expression: `(() => {
      const app = window.__app;
      const cam = window.__camera || app?.camera;
      const renderer = window.__renderer || app?.renderer;
      return {
        activeScene: app?.activeScene?.name,
        activeSceneVisible: app?.activeScene?.visible,
        camPos: cam ? [cam.position.x, cam.position.y, cam.position.z] : null,
        camNear: cam?.near,
        camFar: cam?.far,
        renderCalls: renderer?.info?.render?.calls,
        renderTris: renderer?.info?.render?.triangles
      };
    })()`,
    returnByValue: true
  });
  console.log('[FLOW TEST] Final state:', JSON.stringify(state?.result?.value, null, 2));

  ws.close();
  edgeProc.kill();
  try {
    fs.rmSync(TEMP_USER_DATA_DIR, { recursive: true, force: true });
  } catch (_) {}
}

run().catch(console.error);
