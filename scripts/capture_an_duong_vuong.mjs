import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

const CDP_PORT = 9229;
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const TEMP_USER_DATA_DIR = path.resolve(process.env.TEMP || 'C:\\Temp', 'edge_adv_' + Date.now());

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

  ws.addEventListener('message', (evt) => {
    const data = JSON.parse(evt.data);
    if (data.method === 'Runtime.consoleAPICalled') {
      const text = data.params.args.map((a) => a.value || a.description || '').join(' ');
      console.log('[BROWSER CONSOLE]', text);
    }
    if (data.method === 'Runtime.exceptionThrown') {
      console.error('[BROWSER EXCEPTION]', JSON.stringify(data.params.exceptionDetails, null, 2));
    }
  });

  // Wait 6s for app initialization
  await sleep(6000);

  // Teleport to An Duong Vuong room
  const teleportResult = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const app = window.__app;
        if (app && app.cameraManager) {
          const res = app.cameraManager.focusRoomPreset('an_duong_vuong', false);
          return {
            teleportSuccess: res,
            camPos: [app.camera.position.x, app.camera.position.y, app.camera.position.z]
          };
        }
        return 'NO CAM MGR';
      })()
    `,
    returnByValue: true
  });
  console.log('TELEPORT ADV RESULT:', JSON.stringify(teleportResult?.result?.value, null, 2));

  // Wait 3.5s for models, materials, and textures to render
  await sleep(3500);

  // Capture screenshot
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot && shot.data) {
    const artifactDir = 'C:\\Users\\Admin\\.gemini\\antigravity\\brain\\11accc92-eac9-4567-b1c0-17bb3c10632c';
    const outPath = path.resolve(artifactDir, 'room_an_duong_vuong_view.png');
    fs.writeFileSync(outPath, Buffer.from(shot.data, 'base64'));
    console.log('SCREENSHOT SAVED TO ARTIFACT:', outPath);

    const publicOut = path.resolve('public', 'room_an_duong_vuong_view.png');
    fs.writeFileSync(publicOut, Buffer.from(shot.data, 'base64'));
    console.log('SCREENSHOT SAVED TO PUBLIC:', publicOut);
  }

  // Check scene objects in ADV room
  const sceneSummary = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const room = window.__anDuongVuongRoom;
        if (!room) return 'NO ADV ROOM';
        const objects = [];
        room.traverse(o => {
          if (o.name && o.name.startsWith('ADV_')) {
            objects.push({ name: o.name, type: o.type, visible: o.visible });
          }
        });
        return {
          roomVisible: room.visible,
          objectCount: objects.length,
          keyObjects: objects.slice(0, 15)
        };
      })()
    `,
    returnByValue: true
  });

  console.log('ADV ROOM STATUS:', JSON.stringify(sceneSummary?.result?.value, null, 2));

  ws.close();
  edgeProc.kill();
  try {
    fs.rmSync(TEMP_USER_DATA_DIR, { recursive: true, force: true });
  } catch (_) {}
}

run().catch((err) => {
  console.error('Error running capture:', err);
  process.exit(1);
});
