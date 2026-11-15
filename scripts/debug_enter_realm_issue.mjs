import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const CDP_PORT = 9223;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Temp', 'edge_debug_' + Date.now());

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function run() {
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
    console.error('Failed to get WebSocket URL');
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
      console.log(`[BROWSER CONSOLE ${data.params.type}]`, text);
    }
    if (data.method === 'Runtime.exceptionThrown') {
      console.error('[BROWSER EXCEPTION]', data.params.exceptionDetails.text, data.params.exceptionDetails.exception?.description);
    }
  });

  await send('Runtime.enable');
  await send('Console.enable');

  console.log('[DEBUG] Waiting 4s for app to initialize...');
  await sleep(4000);

  console.log('[DEBUG] Step 1: Check initial museum state');
  const initCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      return {
        activeScene: window.__app?.activeScene?.name,
        cameraPos: window.__camera ? { x: window.__camera.position.x, y: window.__camera.position.y, z: window.__camera.position.z } : null,
        advRoomExists: Boolean(window.__anDuongVuongRoom),
        advSceneExists: Boolean(window.__anDuongVuongScene)
      };
    })()`,
    returnByValue: true
  });
  console.log('[DEBUG] Initial state:', initCheck?.result?.value);

  console.log('[DEBUG] Step 2: Call window.enterRealm("an_duong_vuong")');
  const enterRes = await send('Runtime.evaluate', {
    expression: `window.enterRealm('an_duong_vuong')`,
    returnByValue: true
  });
  console.log('[DEBUG] enterRealm returned:', enterRes?.result?.value);

  await sleep(4000);

  console.log('[DEBUG] Step 3: Check realm state after transition');
  const realmCheck = await send('Runtime.evaluate', {
    expression: `(() => {
      const app = window.__app;
      const cam = window.__camera || app?.camera;
      const advRoom = window.__anDuongVuongRoom;
      const advScene = window.__anDuongVuongScene;
      let meshCount = 0;
      if (advScene) advScene.traverse(c => { if (c.isMesh) meshCount++; });
      return {
        activeScene: app?.activeScene?.name,
        isInsideRealm: advRoom?.isInsideRealm?.(),
        cameraPos: cam ? { x: cam.position.x, y: cam.position.y, z: cam.position.z } : null,
        cameraNear: cam?.near,
        cameraFar: cam?.far,
        meshCount,
        sceneBg: advScene?.background,
        sceneFog: advScene?.fog
      };
    })()`,
    returnByValue: true
  });
  console.log('[DEBUG] Realm state:', realmCheck?.result?.value);

  ws.close();
  edgeProc.kill();
  try {
    fs.rmSync(TEMP_USER_DATA_DIR, { recursive: true, force: true });
  } catch (_) {}
}

run().catch(console.error);
